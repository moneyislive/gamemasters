"""EMPAQUETAR: de lo que sale de Blender (arte/forja/obra/) a lo que baja el teléfono
(escritorio/src/quiebro/recursos/), y el manifiesto `reparto.json` que el cliente lee.

    python empaquetar.py          (el Python de Blender, que trae numpy; rehacer.sh lo llama solo)

═══ QUÉ HACE, EN ORDEN ═══

1. JUNTA LAS VARIANTES de cada familia (reparto.FAMILIAS) en un GLB por nivel de detalle: un
   esqueleto y una malla por variante, con el nombre de la variante (`gabardina`, `alto`,
   `lluvia`…). Comprueba que todas traen el MISMO esqueleto (nombres, orden y matrices de enlace):
   si no, falla, porque los clips enlazan por nombre de hueso y un esqueleto distinto deformaría
   mal sin dar ningún error.
2. ADELGAZA los clips: rotaciones en short normalizado; fuera las pistas de escala y las que se
   quedan en la pose de enlace todo el clip (el mezclador de three devuelve solo a su estado original
   la propiedad que ningún clip activo mueve: AnimationMixer._deactivateAction → restoreOriginalState),
   y cada pista en la rejilla de claves más gruesa (cada 1, 2, 3, 4 o 6 fotogramas) que la
   interpolación reproduce a 0,3 grados y 0,5 mm. Las rejillas se comparten por clip: el JSON de un
   GLB de animación es la mitad del fichero si cada pista trae sus tiempos.
3. Deja esos GLB (glTF de núcleo: huesos y pesos en bytes, lo demás en float) en obra/empaquetado/ y
   llama a `comprimir.mjs`, que cuantiza posiciones, normales y color y los comprime con
   EXT_meshopt_compression en recursos/ (ver allí el porqué y lo que exige al cliente).
4. ESCRIBE `reparto.json` con lo medido en los ficheros de recursos/ (bytes, triángulos,
   materiales) y lo declarado en reparto.py y en el horneado (clips, gestos, impactos).

Sale con 1 si algo no cuadra (esqueleto distinto, presupuesto roto, clip que falta).
"""
import json
import math
import os
import shutil
import subprocess
import sys

import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import glb  # noqa: E402
import reparto  # noqa: E402

OBRA = os.path.join(AQUI, 'obra')
RAIZ_REPO = os.path.abspath(os.path.join(AQUI, '..', '..'))
# REPARTO_SALIDA=<carpeta> empaqueta en otra parte (pruebas sin tocar lo que sirve el juego)
REC = os.environ.get('REPARTO_SALIDA') or os.path.join(RAIZ_REPO, 'escritorio', 'src', 'quiebro', 'recursos')
EMP = os.path.join(OBRA, 'empaquetado')
TOPE = 8 * 1024 * 1024
SUFIJOS = ('', '-lod1', '-lod2', '-lod3')


def sufijos_de(familia):
    """Los niveles de una familia: tres, y el maniquí (LOD3) en los durmientes."""
    return SUFIJOS[:reparto.LODS_DE_LA_CLASE[reparto.FAMILIAS[familia]['clase']]]
SEXO = {'m': 'hombre', 'f': 'mujer'}
ARRAY, ELEMENTOS = 34962, 34963
FALLOS = []


def fallo(msg):
    print('FALLO:', msg)
    FALLOS.append(msg)


def leer(ruta):
    return glb.leer(ruta)


def acc(g, b, i):
    return glb.accesor(g, b, i, np)


def deq(g, i, arr):
    """Valores reales de un accesor (deshace la normalización)."""
    a = g['accessors'][i]
    if a.get('normalized'):
        esc = {5120: 127.0, 5121: 255.0, 5122: 32767.0, 5123: 65535.0}[a['componentType']]
        return np.maximum(arr.astype(np.float64) / esc, -1.0)
    return arr.astype(np.float64)


# ------------------------------------------------------------------ mallas
def pesos_u8(w):
    """Pesos en bytes normalizados que suman exactamente 255 (el resto al mayor)."""
    w = np.clip(w, 0, None)
    w = w / np.maximum(w.sum(1, keepdims=True), 1e-9)
    q = np.floor(w * 255.0 + 0.5).astype(np.int32)
    falta = 255 - q.sum(1)
    mayor = np.argmax(w, 1)
    q[np.arange(len(q)), mayor] += falta
    return np.clip(q, 0, 255).astype(np.uint8)


def primitiva(C, g, b, p, material, zona_familia=None):
    """Una primitiva en glTF de núcleo: posición y normal en float (comprimir.mjs cuantiza la normal y
    el color; la posición se queda en float: el cliente la lleva al espacio de enlace con bindMatrix y
    mide con ella), color RGBA en float (en los LOD de lejos el alfa es la oclusión), huesos y pesos en
    bytes (los pesos suman 255) y la zona en byte, ya en el orden de la familia."""
    at = p['attributes']
    out = {}
    pos = acc(g, b, at['POSITION']).astype(np.float32)
    out['POSITION'] = C.accesor(pos, 'VEC3', 5126, objetivo=ARRAY, minmax=True)
    if 'NORMAL' in at:
        n = deq(g, at['NORMAL'], acc(g, b, at['NORMAL']))
        n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-9)
        out['NORMAL'] = C.accesor(n.astype(np.float32), 'VEC3', 5126, objetivo=ARRAY)
    if 'COLOR_0' in at:
        c = deq(g, at['COLOR_0'], acc(g, b, at['COLOR_0']))
        if c.shape[1] == 3:
            c = np.concatenate([c, np.ones((len(c), 1))], 1)
        out['COLOR_0'] = C.accesor(np.clip(c, 0, 1).astype(np.float32), 'VEC4', 5126, objetivo=ARRAY)
    if 'JOINTS_0' in at:
        j = acc(g, b, at['JOINTS_0'])
        if j.max() > 255:
            fallo('mas de 256 huesos')
        out['JOINTS_0'] = C.accesor(j.astype(np.uint8), 'VEC4', 5121, objetivo=ARRAY)
        w = deq(g, at['WEIGHTS_0'], acc(g, b, at['WEIGHTS_0']))
        out['WEIGHTS_0'] = C.accesor(pesos_u8(w), 'VEC4', 5121, normalizado=True, objetivo=ARRAY)
    if '_ZONA' in at:
        z = np.round(acc(g, b, at['_ZONA']).ravel()).astype(np.int64)
        if zona_familia is not None:
            z = zona_familia[z]
            if (z < 0).any():
                fallo('una zona del LOD de lejos no esta entre los materiales del LOD0 de la familia')
        out['_ZONA'] = C.accesor(z.astype(np.uint8), 'SCALAR', 5121, objetivo=ARRAY)
    idx = acc(g, b, p['indices']).ravel()
    tipo = 5123 if idx.max() < 65536 else 5125
    ind = C.accesor(idx.astype(np.uint16 if tipo == 5123 else np.uint32), 'SCALAR', tipo, objetivo=ELEMENTOS)
    return {'attributes': out, 'indices': ind, 'material': material, 'mode': 4}


def zonas_de_familia(familia):
    """Las zonas de una familia: los materiales del LOD0 de todas sus variantes, en orden alfabético.
    Es el orden en que el cliente numera `_zona` (personajes/reparto.ts, zonasDeLaFigura)."""
    z = set()
    for v in reparto.FAMILIAS[familia]['variantes']:
        z |= set(json.load(open(os.path.join(OBRA, 'figuras', '%s-%s.json' % (familia, v))))['zonas'])
    return sorted(z)


def _clave_material(m):
    pbr = m.get('pbrMetallicRoughness', {})
    return (m['name'], tuple(round(x, 4) for x in pbr.get('baseColorFactor', [1, 1, 1, 1])),
            round(pbr.get('metallicFactor', 1.0), 3), round(pbr.get('roughnessFactor', 1.0), 3), m.get('doubleSided', False))


def juntar_familia(familia, sufijo, variantes=None, archivo=None):
    """Un GLB con el esqueleto de la familia y una malla por variante (o sólo las `variantes` dadas, en
    `archivo`: el LOD0 de cada estilo de desvelado va aparte). Devuelve la ficha medida."""
    fam = reparto.FAMILIAS[familia]
    zonas = zonas_de_familia(familia)
    zona_familia = np.array([zonas.index(z) if z in zonas else -1 for z in reparto.ZONAS], np.int64)
    variantes = tuple(variantes or fam['variantes'])
    rutas = [os.path.join(OBRA, 'figuras', '%s-%s%s.glb' % (familia, v, sufijo)) for v in variantes]
    for r in rutas:
        if not os.path.exists(r):
            fallo('falta %s' % r)
            return None
    g0, b0 = leer(rutas[0])
    C = glb.Constructor()
    # --- el esqueleto de la primera variante (todos los nodos que no son malla)
    viejos = [i for i, n in enumerate(g0['nodes']) if 'mesh' not in n]
    mapa = {v: k for k, v in enumerate(viejos)}
    nodos = []
    for i in viejos:
        n = dict(g0['nodes'][i])
        if 'children' in n:
            n['children'] = [mapa[c] for c in n['children'] if c in mapa]
            if not n['children']:
                del n['children']
        for k in ('scale',):
            if k in n and np.allclose(n[k], 1.0, atol=1e-5):
                del n[k]
        nodos.append(n)
    raiz_escena = [mapa[i] for i in g0['scenes'][g0.get('scene', 0)]['nodes'] if i in mapa]
    esqueleto = raiz_escena[0]
    sk0 = g0['skins'][0]
    nombres0 = [g0['nodes'][j]['name'] for j in sk0['joints']]
    ibm0 = acc(g0, b0, sk0['inverseBindMatrices'])
    skin = {'name': 'esqueleto', 'joints': [mapa[j] for j in sk0['joints']],
            'inverseBindMatrices': C.accesor(ibm0.astype(np.float32), 'MAT4', 5126)}
    out = {'asset': {'version': '2.0', 'generator': 'arte/forja (El Quiebro)'}, 'scene': 0,
           'scenes': [{'name': familia, 'nodes': [esqueleto]}], 'nodes': nodos, 'skins': [skin], 'meshes': [],
           'materials': []}
    mats = {}
    ficha = {'archivo': archivo or (familia + sufijo + '.glb'), 'mallas': {}, 'zonas': zonas}
    for var, ruta in zip(variantes, rutas):
        g, b = leer(ruta)
        sk = g['skins'][0]
        nombres = [g['nodes'][j]['name'] for j in sk['joints']]
        if nombres != nombres0:
            fallo('%s: el esqueleto no es el de la familia (nombres u orden)' % ruta)
            continue
        ibm = acc(g, b, sk['inverseBindMatrices'])
        if not np.allclose(ibm, ibm0, atol=2e-5):
            fallo('%s: las matrices de enlace no son las de la familia (%.2g)' % (ruta, float(np.abs(ibm - ibm0).max())))
        nm = next(n for n in g['nodes'] if 'mesh' in n)
        malla_ = g['meshes'][nm['mesh']]
        prims = []
        tris = 0
        usados = []
        for p in malla_['primitives']:
            m = g['materials'][p['material']]
            # el mismo nombre puede traer otro color en otra variante (el abrigo de la gabardina no es
            # el de la chaqueta corta): son materiales distintos con el mismo nombre de zona
            clave = _clave_material(m)
            if clave not in mats:
                mm = {k: v for k, v in m.items() if k in ('name', 'pbrMetallicRoughness', 'doubleSided')}
                mats[clave] = len(out['materials'])
                out['materials'].append(mm)
            prims.append(primitiva(C, g, b, p, mats[clave], zona_familia))
            tris += g['accessors'][p['indices']]['count'] // 3
            usados.append(m['name'])
        out['meshes'].append({'name': var, 'primitives': prims})
        out['nodes'].append({'name': var, 'mesh': len(out['meshes']) - 1, 'skin': 0})
        nodos[esqueleto].setdefault('children', []).append(len(out['nodes']) - 1)
        ficha['mallas'][var] = {'triangulos': tris, 'materiales': usados}
    out['accessors'] = C.accesores
    out['bufferViews'] = C.vistas
    out['buffers'] = [{'byteLength': len(C.binario)}]
    ficha['materiales'] = sorted({m['name'] for m in out['materials']})
    glb.escribir(os.path.join(EMP, ficha['archivo']), out, bytes(C.binario))
    return ficha


# ------------------------------------------------------------------ clips
def _slerp(a, b, t):
    d = float(np.dot(a, b))
    if d < 0:
        b = -b
        d = -d
    if d > 0.9995:
        r = a + (b - a) * t
    else:
        th = math.acos(min(1.0, d))
        r = (math.sin((1 - t) * th) * a + math.sin(t * th) * b) / math.sin(th)
    return r / np.linalg.norm(r)


def _error(x, y, quat):
    if quat:
        return 2.0 * math.acos(min(1.0, abs(float(np.dot(x, y)))))
    return float(np.linalg.norm(x - y))


PASOS = (8, 6, 4, 3, 2, 1)
# ═══ POR QUÉ HAY HUESOS FINOS ═══ El error de una clave quitada se suma por la cadena: 0,3 grados en
# la cadera, el muslo, la pierna y el pie ponían la punta del zapato 1,5 cm bajo el suelo en la
# victoria de las 18 figuras (horneada a -0,1 cm). Los huesos de la cadena que llega al suelo y a las
# manos apoyadas van a 0,08 grados; el resto (dedos, faldón, cabeza) sigue a 0,3.
TOLERANCIA_FINA = 0.08
HUESOS_FINOS = {'raiz', 'caderas', 'columna', 'columna1', 'pecho', 'muslo_L', 'muslo_R', 'pierna_L', 'pierna_R',
                'pie_L', 'pie_R', 'punta_L', 'punta_R', 'hombro_L', 'hombro_R', 'brazo_L', 'brazo_R',
                'antebrazo_L', 'antebrazo_R', 'mano_L', 'mano_R'}


# ═══ EL FALDÓN, MÁS GRUESO ═══ La revisión midió el faldón horneado en el 51 % de los datos de los clips:
# 24 huesos que se mueven en todos los fotogramas. Un grado de error en un hueso de tela de 16 cm son 3 mm
# en su punta, que nadie ve; los dedos, a 0,6.
TOLERANCIA_FALDON = 1.0
TOLERANCIA_DEDOS = 0.6


def tolerancia_de(hueso):
    if hueso in HUESOS_FINOS:
        return TOLERANCIA_FINA
    if hueso.startswith('faldon'):
        return TOLERANCIA_FALDON
    if hueso.startswith(('dedos', 'pulgar')):
        return TOLERANCIA_DEDOS
    return 0.3


def _rejilla(n, paso):
    r = list(range(0, n, paso))
    if r[-1] != n - 1:
        r.append(n - 1)
    return r


def _cabe(t, v, keep, tol, quat):
    """¿La interpolación entre las claves `keep` reproduce todos los fotogramas a `tol`?"""
    for a, b in zip(keep[:-1], keep[1:]):
        for k in range(a + 1, b):
            f = (t[k] - t[a]) / (t[b] - t[a])
            x = _slerp(v[a], v[b], f) if quat else v[a] + (v[b] - v[a]) * f
            if _error(x, v[k], quat) > tol:
                return False
    return True


def empaquetar_clips(sexo):
    src = os.path.join(OBRA, 'clips-%s.glb' % sexo)
    if not os.path.exists(src):
        fallo('falta %s' % src)
        return None
    g, b = leer(src)
    C = glb.Constructor()
    nodos = [dict(n) for n in g['nodes']]
    for n in nodos:
        if 'scale' in n and np.allclose(n['scale'], 1.0, atol=1e-5):
            del n['scale']
    anims = []
    claves_antes = claves_despues = pistas_fuera = 0
    for a in g['animations']:
        canales, muestras, tiempos = [], [], {}
        for ch in a['channels']:
            nodo_i = ch['target']['node']
            nodo = g['nodes'][nodo_i]
            camino = ch['target']['path']
            s = a['samplers'][ch['sampler']]
            t = acc(g, b, s['input']).ravel().astype(np.float64)
            v = deq(g, s['output'], acc(g, b, s['output']))
            if camino == 'scale':
                continue
            quat = camino == 'rotation'
            tol = math.radians(tolerancia_de(nodo['name'])) if quat else 0.0005
            if quat:
                for k in range(1, len(v)):
                    if np.dot(v[k], v[k - 1]) < 0:
                        v[k] = -v[k]
                reposo = np.array(nodo.get('rotation', [0, 0, 0, 1]), np.float64)
            else:
                reposo = np.array(nodo.get('translation', [0, 0, 0]), np.float64)
            claves_antes += len(t)
            # en la pose de enlace todo el clip: fuera (three la restaura sola)
            if max(_error(x, reposo, quat) for x in v) <= tol:
                pistas_fuera += 1
                continue
            keep = None
            for paso in PASOS:
                cand = _rejilla(len(t), paso)
                if _cabe(t, v, cand, tol, quat):
                    keep = cand
                    break
            if len(keep) > 2 and max(_error(x, v[0], quat) for x in v) <= tol:
                keep = [0, len(t) - 1]              # quieta pero no en la pose de enlace: dos claves
            claves_despues += len(keep)
            clave_t = tuple(keep)
            if clave_t not in tiempos:
                tiempos[clave_t] = C.accesor(t[keep].astype(np.float32), 'SCALAR', 5126, minmax=True)
            if quat:
                vk = v[keep] / np.linalg.norm(v[keep], axis=1, keepdims=True)
                ov = C.accesor(np.clip(np.round(vk * 32767), -32767, 32767).astype(np.int16), 'VEC4', 5122, normalizado=True)
            else:
                ov = C.accesor(v[keep].astype(np.float32), 'VEC3', 5126)
            muestras.append({'input': tiempos[clave_t], 'output': ov})
            canales.append({'sampler': len(muestras) - 1, 'target': {'node': nodo_i, 'path': camino}})
        if not canales:
            fallo('%s: el clip %s se queda sin pistas' % (src, a['name']))
        anims.append({'name': a['name'], 'channels': canales, 'samplers': muestras})
    # la piel se queda aunque no haya malla: three no la necesita, pero sin ella el importador de
    # Blender (la bateria) toma los huesos por objetos sueltos y cada clip por cincuenta acciones
    pieles = []
    for sk in g.get('skins', []):
        pieles.append({'name': sk.get('name', 'esqueleto'), 'joints': sk['joints'],
                       'inverseBindMatrices': C.accesor(acc(g, b, sk['inverseBindMatrices']).astype(np.float32), 'MAT4', 5126)})
    out = {'asset': {'version': '2.0', 'generator': 'arte/forja (El Quiebro)'}, 'scene': 0,
           'scenes': g['scenes'], 'nodes': nodos, 'animations': anims, 'skins': pieles,
           'accessors': C.accesores, 'bufferViews': C.vistas, 'buffers': [{'byteLength': len(C.binario)}]}
    nombre = 'clips-%s.glb' % SEXO[sexo]
    glb.escribir(os.path.join(EMP, nombre), out, bytes(C.binario))
    print('  %s: %d clips, claves %d -> %d, %d pistas en la pose de enlace fuera' % (
        nombre, len(anims), claves_antes, claves_despues, pistas_fuera))
    return {'archivo': nombre, 'clips': [a['name'] for a in anims], 'gltf': g}


# ------------------------------------------------------------------ manifiesto
def esqueleto_de(g, sexo):
    """Huesos y cadenas del faldón con el largo de reposo de sus tres huesos (el último no tiene nodo
    hijo en el GLB: los largos salen de la definición del esqueleto, anatomia.huesos)."""
    import anatomia
    nombres = [n['name'] for n in g['nodes']]
    huesos = [n for n in nombres if n != 'esqueleto']
    definicion = {n: (np.array(h), np.array(t)) for n, h, t, _, _, _ in anatomia.huesos(sexo)}
    cadenas = []
    for s in 'LR':
        for k in range(4):
            cad = ['faldon%d%d_%s' % (k, j, s) for j in (1, 2, 3)]
            largos = [round(float(np.linalg.norm(definicion[h][1] - definicion[h][0])), 4) for h in cad]
            cadenas.append({'huesos': cad, 'largosM': largos})
    return {'huesos': huesos, 'faldon': cadenas}


def main():
    os.makedirs(REC, exist_ok=True)
    if os.path.isdir(EMP):
        shutil.rmtree(EMP)
    os.makedirs(EMP)
    print('== figuras por familia')
    familias = {}
    for fam in reparto.FAMILIAS:
        lods = []
        clase = reparto.FAMILIAS[fam]['clase']
        for suf in sufijos_de(fam):
            if suf == '' and clase in reparto.LOD0_POR_VARIANTE:
                # un LOD0 por estilo: ficha con una entrada por variante
                fichas = {v: juntar_familia(fam, suf, (v,), '%s-%s.glb' % (fam, v)) for v in reparto.FAMILIAS[fam]['variantes']}
                for f_ in fichas.values():
                    if f_:
                        print('  %-26s %s' % (f_['archivo'], ' '.join('%s=%d' % (k, v['triangulos']) for k, v in f_['mallas'].items())))
                lods.append({'por_variante': fichas})
                continue
            ficha = juntar_familia(fam, suf)
            if ficha:
                lods.append(ficha)
                print('  %-26s %s' % (ficha['archivo'], ' '.join('%s=%d' % (k, v['triangulos']) for k, v in ficha['mallas'].items())))
        familias[fam] = lods
    print('== clips')
    clips = {s: empaquetar_clips(s) for s in 'mf'}
    print('== piezas')
    piezas = json.load(open(os.path.join(OBRA, 'piezas', 'piezas.json')))
    for info in piezas.values():
        shutil.copyfile(os.path.join(OBRA, 'piezas', info['archivo']), os.path.join(EMP, info['archivo']))
    print('== comprimir (node comprimir.mjs)')
    sys.stdout.flush()
    r = subprocess.run(['node', os.path.join(AQUI, 'comprimir.mjs')], env=dict(os.environ, REPARTO_SALIDA=REC))
    if r.returncode != 0:
        fallo('comprimir.mjs salio con %d' % r.returncode)
        return 1
    # lo que ya no se fabrica se borra de recursos (lo que queda en disco es lo que baja el juego)
    hechos = set(os.listdir(EMP))
    for f in os.listdir(REC):
        if f.endswith('.glb') and f not in hechos:
            print('  fuera de recursos (ya no se fabrica): %s' % f)
            os.remove(os.path.join(REC, f))
    for lods in familias.values():
        for l in lods:
            for l_ in (l['por_variante'].values() if 'por_variante' in l else (l,)):
                l_['bytes'] = os.path.getsize(os.path.join(REC, l_['archivo']))
    escribir_manifiesto(familias, clips, piezas)
    if FALLOS:
        print('%d FALLOS' % len(FALLOS))
        return 1
    return 0


def _clip_json(sexo):
    return json.load(open(os.path.join(OBRA, 'clips-%s.json' % sexo), encoding='utf-8'))


def escribir_manifiesto(familias, clips, piezas):
    """reparto.json. La forma es la que ya lee el cliente (`escritorio/src/quiebro/personajes/reparto.ts`,
    escrito contra la primera entrega): los campos que había siguen con su tipo y lo nuevo se AÑADE."""
    meta = {s_: _clip_json(s_) for s_ in 'mf'}
    gestos = meta['m'].pop('_gestos', {})
    por_direccion = meta['m'].pop('_por_direccion', {})
    por_clase = meta['m'].pop('_por_clase', {})
    entra_con = meta['m'].pop('_entra_con', {})
    marcha = meta['m'].pop('_marcha', {})
    for k in ('_gestos', '_por_direccion', '_por_clase', '_entra_con', '_marcha'):
        meta['f'].pop(k, None)
    fps = 30
    lista_clips = {}
    for nombre, d in meta['m'].items():
        df = meta['f'].get(nombre, {})
        c = {'duracionMs': round(d['fotogramas'] * 1000 / fps), 'fotogramas': d['fotogramas'], 'fps': fps,
             'bucle': d['bucle'], 'raiz': bool(d.get('raiz_animada')), 'descripcion': d.get('descripcion', '')}
        if 'metros_por_ciclo' in d:
            c['zancadaM'] = d['metros_por_ciclo']
            c['velocidadMs'] = d['velocidad_m_s']
            c['mujer'] = {'zancadaM': df.get('metros_por_ciclo'), 'velocidadMs': df.get('velocidad_m_s')}
        if 'impacto_fotogramas' in d:
            c['impactoMs'] = round(d['impacto_fotogramas'][0] * 1000 / fps)
        if 'alcance_m' in d:
            # dónde llega el golpe: horizontal y hacia delante desde la raíz en el impacto (el blanco, a 1,1 m,
            # tiene su superficie a ~0,9); lo que viaja el puño desde la guardia; y a qué altura
            c['alcanceM'] = d['alcance_m']
            c['recorridoM'] = d['recorrido_m']
            c['alturaImpactoM'] = d['altura_impacto_m']
            c['efector'] = d['efector']
        if 'disparos_ms' in d:
            c['disparosMs'] = d['disparos_ms']
        if 'intocable_ms' in d:
            c['intocableMs'] = list(d['intocable_ms'])
        elif 'intocable_fotogramas' in d:
            c['intocableMs'] = [round(x * 1000 / fps) for x in d['intocable_fotogramas']]
        if 'cae_en' in d:
            c['caeEnMs'] = round(d['cae_en'] * 1000 / fps)
        if 'levanta_desde' in d:
            c['levantaDesdeMs'] = round(d['levanta_desde'] * 1000 / fps)
        if d.get('raiz_animada'):
            c['desplazamientoM'] = d.get('raiz_final_gltf')
            c.setdefault('mujer', {})['desplazamientoM'] = df.get('raiz_final_gltf')
        if 'contacto_suelo_fotogramas' in d:
            c['tumbado'] = True
        lista_clips[nombre] = c
    for g, clip in gestos.items():
        if clip not in lista_clips:
            fallo('el gesto %s apunta a un clip que no existe: %s' % (g, clip))
    esqueletos = {}
    for s_, nombre in SEXO.items():
        c = clips[s_]
        if not c:
            continue
        c['bytes'] = os.path.getsize(os.path.join(REC, c['archivo']))
        e = esqueleto_de(c['gltf'], s_)
        esqueletos[nombre] = {
            'clips': c['archivo'], 'huesos': e['huesos'], 'raiz': 'raiz', 'caderas': 'caderas', 'cabeza': 'cabeza',
            'agarre': {'derecha': 'agarre_R', 'izquierda': 'agarre_L',
                       'ejes': '+X hacia los nudillos (el canon), +Y por el pulgar (el eje del paraguas), origen en el hueco del puno'},
            'faldon': {'cadenas': e['faldon'], 'horneado': True,
                       'nota': 'El faldon va horneado en los clips (muelle, inercia, viento, choque con las piernas y arrastre '
                               'del muslo). Para muelles en el cliente encima de lo horneado (giros bruscos, mezclas): cada '
                               'cadena cuelga de caderas con tres huesos de arriba abajo; los parametros del horneado van en muelle.',
                       'muelle': {'rigidez': [160, 70, 38], 'amortiguamiento': 5.0, 'arrastreDelAire': 0.8, 'holguraM': 0.008,
                                  'estiramientoEntreCadenas': 1.07, 'topeGradosPorDefecto': 70,
                                  'topeGrados': {'pasear': 22, 'andar': 26, 'trotar': 35, 'correr': 50, 'quiebro': 50},
                                  'nota': 'el tope es el angulo maximo de cada junta respecto a su forma de reposo llevada por '
                                          'caderas; ninguna junta pasa por encima de la cabeza de caderas'}},
        }
    figuras = {}

    def lod_json(l, solo=None):
        mallas = {k: v['triangulos'] for k, v in l['mallas'].items() if solo is None or k in solo}
        return {'archivo': l['archivo'], 'bytes': l['bytes'], 'triangulos': sum(mallas.values()), 'mallas': mallas,
                'materiales': l['materiales']}
    for fam, lods in familias.items():
        if not lods:
            continue
        f = reparto.FAMILIAS[fam]
        if 'por_variante' in lods[0]:
            # ═══ UNA FIGURA POR ESTILO ═══ su LOD0 propio, y los LOD de la familia (con sus tres mallas: el
            # cliente enseña la suya por nombre; `triangulos` y `mallas` cuentan sólo la suya)
            for v in f['variantes']:
                l0 = lods[0]['por_variante'][v]
                niveles = [l0] + list(lods[1:])
                figuras['%s-%s' % (fam, v)] = {
                    'clase': f['clase'], 'esqueleto': SEXO[f['sexo']], 'zonas': l0['zonas'], 'familia': fam,
                    'lods': [lod_json(l, (v,)) for l in niveles],
                    'variantes': {v: {'escala': reparto.FIGURAS['%s-%s' % (fam, v)]['escala'],
                                      'triangulos': [l['mallas'][v]['triangulos'] for l in niveles],
                                      'zonas': sorted(set(l0['mallas'][v]['materiales']))}},
                }
            continue
        figuras[fam] = {
            'clase': f['clase'], 'esqueleto': SEXO[f['sexo']], 'zonas': lods[0]['zonas'],
            'lods': [lod_json(l) for l in lods],
            'variantes': {v: {'escala': reparto.FIGURAS['%s-%s' % (fam, v)]['escala'],
                              'triangulos': [l['mallas'][v]['triangulos'] for l in lods],
                              'zonas': sorted(set(lods[0]['mallas'][v]['materiales']))} for v in f['variantes']},
        }
    paleta_traje = {k: '#%02x%02x%02x' % tuple(round(255 * _a_srgb(c)) for c in rgb)
                    for k, rgb in reparto.TENIBLES['mat_traje']['paleta'].items()}
    paleta_corbata = {k: '#%02x%02x%02x' % tuple(round(255 * _a_srgb(c)) for c in rgb)
                      for k, rgb in reparto.TENIBLES['mat_corbata']['paleta'].items()}
    esc = {v: reparto.FIGURAS['celador-%s-%s' % ('mujer' if v == 'mujer' else 'hombre', v)]['escala']
           for v in ('alto', 'ancho', 'mujer', 'mayor')}
    clases = {
        'desvelado': {
            'variante': 'indice del estilo: 0 gabardina, 1 ligera, 2 mole (IDS_DE_ESTILO); el sexo lo elige el cliente por asiento',
            'variantes': [{'estilo': e, 'hombre': {'figura': 'desvelado-hombre-' + e, 'mallas': [e]},
                           'mujer': {'figura': 'desvelado-mujer-' + e, 'mallas': [e]}} for e in ('gabardina', 'ligera', 'mole')],
            'tenibles': {'mat_forro': 'asiento'}},
        'celador': {
            'variante': 'numero % 4 (la silueta); el color del traje, otro indice (sugerencia: (id >> 2) % 4)',
            'variantes': [{'silueta': 'alto', 'figura': 'celador-hombre', 'mallas': ['alto'], 'escala': esc['alto']},
                          {'silueta': 'ancho', 'figura': 'celador-hombre', 'mallas': ['ancho'], 'escala': esc['ancho']},
                          {'silueta': 'mujer', 'figura': 'celador-mujer', 'mallas': ['mujer'], 'escala': esc['mujer']},
                          {'silueta': 'mayor', 'figura': 'celador-hombre', 'mallas': ['mayor'], 'escala': esc['mayor']}],
            'tenibles': {'mat_traje': 'paleta', 'mat_corbata': 'paleta'}, 'paletaDelTraje': paleta_traje,
            'paletaDeLaCorbata': paleta_corbata,
            'nota': 'cada silueta es su propia malla (el sombrero del mayor ya viene en ella) con su montura de gafas, su pelo y '
                    'su camisa; `escala` es la de la figura entera. La corbata se tiñe con el MISMO indice de color que el '
                    'traje (paletaDeLaCorbata tiene las mismas claves y el mismo orden que paletaDelTraje)'},
        'tirador': {'como': 'celador', 'pieza': 'pistola', 'nota': 'el mismo Celador con la pistola colgada de agarre_R'},
        'prestado': {'como': 'durmiente', 'nota': 'indice del durmiente (0-47): su aspecto {cuerpo, ropa, paraguas} sale de '
                                                  'quiebro-durmientes; el Prestado conserva su ropa'},
    }
    ropas = list(reparto.FAMILIAS['durmiente-hombre']['variantes'])
    durmientes = {'cuerpos': [{'sexo': 'hombre', 'figura': 'durmiente-hombre', 'ropas': [{'nombre': r, 'mallas': [r]} for r in ropas]},
                              {'sexo': 'mujer', 'figura': 'durmiente-mujer', 'ropas': [{'nombre': r, 'mallas': [r]} for r in ropas]}],
                  'paraguas': 'paraguas',
                  'nota': 'AspectoDelDurmiente.cuerpo 0|1 -> cuerpos[cuerpo]; .ropa 0-3 -> ropas[ropa]; .paraguas -> pieza '
                          'paraguas en agarre_R y clip andar-paraguas'}
    pz = {}
    for nombre, info in piezas.items():
        pz[nombre] = {'archivo': info['archivo'], 'bytes': os.path.getsize(os.path.join(REC, info['archivo'])),
                      'triangulos': info['triangulos'], 'materiales': info['materiales'], 'hueso': 'agarre_R',
                      'como': "figura.getObjectByName('agarre_R').add(pieza) sin transformacion: ya viene en el marco del agarre"}
    todos = sorted(f for f in os.listdir(REC) if f.endswith('.glb'))

    def b(f):
        return os.path.getsize(os.path.join(REC, f)) if os.path.exists(os.path.join(REC, f)) else 0
    total = sum(b(f) for f in todos)
    if total > TOPE:
        fallo('los GLB suman %d bytes: mas que el tope de %d' % (total, TOPE))
    # ═══ LA PRIMERA NOCHE EN N0 (§8) ═══ El propio a LOD0 (los dos sexos: el asiento decide cuál), los
    # compañeros a LOD1, Celadores y Prestados cercanos a LOD1 y la multitud en el maniquí (LOD3).
    n0 = ['desvelado-hombre-gabardina.glb', 'desvelado-mujer-gabardina.glb', 'desvelado-hombre-lod1.glb', 'desvelado-mujer-lod1.glb',
          'celador-hombre-lod1.glb', 'celador-mujer-lod1.glb', 'durmiente-hombre-lod1.glb', 'durmiente-mujer-lod1.glb',
          'durmiente-hombre-lod3.glb', 'durmiente-mujer-lod3.glb',
          'clips-hombre.glb', 'clips-mujer.glb'] + [p_['archivo'] for p_ in pz.values()]
    man = {
        'version': 2,
        'estado': 'definitivo',
        'nota': 'Lee siempre este manifiesto: no escribas nombres de fichero, malla ni clip a mano. Lo fabrica '
                'arte/forja/empaquetar.py (orden unica: bash arte/forja/rehacer.sh).',
        'ejes': {'unidad': 'm', 'arriba': '+Y', 'frente': '+Z', 'izquierdaDelPersonaje': '+X', 'suelo': 'y = 0'},
        'carga': {
            'compresion': 'EXT_meshopt_compression (y KHR_mesh_quantization en normales y color)',
            'obligatorio': "import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'; "
                           'cargador.setMeshoptDecoder(MeshoptDecoder) ANTES de cargar: sin el, la carga falla entera',
            'posiciones': 'en float y en el espacio de la malla (la forja deja las mallas en el origen del esqueleto)',
            'clonar': 'SkeletonUtils.clone(gltf.scene) por cuerpo (three/examples/jsm/utils/SkeletonUtils.js)',
        },
        'materiales': {
            'lod0': 'un material por zona (mat_piel, mat_abrigo, mat_forro...) con su color; COLOR_0 = oclusion (el iris en mat_ojos)',
            'lejos': 'LOD1 y LOD2: mat_lod_mate y mat_lod_brillo; COLOR_0 rgb = color de la zona x oclusion, a = oclusion; '
                     '_zona = indice en figuras[f].zonas (los materiales del LOD0 de la familia en orden alfabetico)',
            'tenibles': {k: {kk: vv for kk, vv in v.items() if kk != 'paleta'} for k, v in reparto.TENIBLES.items()},
            'mismoNombre': 'en un fichero con varias variantes, una zona puede tener un material por variante con el mismo '
                           'nombre y otro color (el abrigo de la gabardina no es el de la chaqueta corta)',
        },
        'bytes': {'total': total, 'tope': TOPE, 'porArchivo': {f: b(f) for f in todos},
                  'primeraNocheN0': {'archivos': n0, 'total': sum(b(f) for f in n0),
                                     'nota': 'el propio a LOD0 (su estilo, en los dos sexos: cuenta la gabardina, las tres pesan '
                                             'casi igual); companeros, Celadores y Prestados cercanos a LOD1; la multitud en el '
                                             'maniqui LOD3 de los durmientes'}},
        'esqueletos': esqueletos,
        'figuras': figuras,
        'clases': clases,
        'durmientes': durmientes,
        'piezas': pz,
        'marcha': marcha,
        'clips': lista_clips,
        'gestos': {g: dict({'clip': c}, **({'porDireccion': por_direccion[g]} if g in por_direccion else {}),
                           **({'porClase': por_clase[g]} if g in por_clase else {}),
                           **({'entraCon': entra_con[g]} if g in entra_con else {}))
                   for g, c in gestos.items()},
        'usoDeLosClips': {
            'locomocion': 'en el sitio; timeScale = velocidad / velocidadMs (mujer.velocidadMs para la mujer); pasear (1,3 m/s) '
                          'por debajo de 1,5 m/s',
            'marcha': 'andar de cara al blanco: atras, izquierda o derecha segun el angulo entre rumbo y velocidad',
            'raiz': 'si raiz es true, la pista raiz.position lleva el desplazamiento que el juego YA aplica al sitio: '
                    'quitala (clip.tracks.filter(t => t.name !== "raiz.position")) y deja que el juego mueva el cuerpo',
            'impacto': 'anticipacion elastica: estira o encoge [0, impactoMs] para que el impacto caiga en CuerpoPintado.impactoMs',
            'unaVez': 'los que no son bucle: LoopOnce y clampWhenFinished',
            'quiebro': 'porDireccion segun direccionDelGesto respecto a rumbo: izquierda es +X del personaje',
            'porDireccion': 'la direccion es la del DESPLAZAMIENTO respecto a la cara: en el quiebro, hacia donde se va; en '
                            'tocado y derribado, hacia donde empuja el golpe (me pegan de frente: atras -> tocado; por la '
                            'espalda: delante -> tocado-espalda)',
            'porClase': 'el clip de ese gesto para una clase de cuerpo (la guardia del Celador y del tirador es otra)',
            'entraCon': 'el clip que se pinta ANTES de un gesto sostenido que empieza en el suelo (caer antes de desconectado)',
            'derribado': 'el derribado entero dura 1,5 s (los 30 tics del derribo) y acaba de pie en guardia: la espalda da en '
                         'el suelo en caeEnMs y se levanta desde levantaDesdeMs; si el derribo dura menos (el Cierre del '
                         'Celador, 20 tics), estira el clip a la duracion del estado. levantarse es la levantada sola, desde '
                         'el tumbado de desconectado (el rescate)',
            'escala': 'una variante con escala distinta de 1 (el Celador alto, 1,06) da zancadas mas largas: multiplica '
                      'zancadaM y velocidadMs por la escala o los pies patinan',
            'alcance': 'alcanceM: lo que llega el golpe desde la raiz en el impacto; el blanco a 1,1 m tiene la superficie a ~0,9',
            'pistas': 'un hueso que un clip no nombra esta en su pose de enlace (three lo devuelve solo a ella)',
        },
    }
    ruta = os.path.join(REC, 'reparto.json')
    with open(ruta, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(man, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print('== reparto.json: %d GLB, %d bytes (tope %d); primera noche N0 %d bytes' % (
        len(todos), total, TOPE, man['bytes']['primeraNocheN0']['total']))


def _a_srgb(c):
    return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055


if __name__ == '__main__':
    sys.exit(main())
