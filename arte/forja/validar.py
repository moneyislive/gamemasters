"""LO QUE BAJA EL TELÉFONO, LEÍDO A MANO (sin Blender): los GLB de escritorio/src/quiebro/recursos/
y su reparto.json, contra el reparto del diseño y contra el vocabulario de cuerpos.ts.

La geometría y los clips se leen de obra/empaquetado/ (los mismos ficheros antes de la compresión
meshopt, que este lector no descomprime); de recursos/ se miran los bytes, que cada uno declare la
compresión y el manifiesto. La descompresión de verdad la prueba en_three.mjs con el descodificador
del cliente.

    "C:/Program Files/Blender Foundation/Blender 4.2/4.2/python/bin/python.exe" validar.py

═══ POR QUÉ SE LEE cuerpos.ts ═══

El contrato entre el juego y los personajes es el tipo `Gesto`. Si alguien añade un gesto allí y
nadie hornea su clip, el cliente pintaría un cuerpo quieto sin que nada fallara. Aquí se sacan los
literales de la unión del fichero y se exige un clip para cada uno, en los dos esqueletos.

Comprueba además: nombres sin punto ni dos puntos; el esqueleto de cada familia idéntico nodo a
nodo al de sus clips; cada pista encuentra su nodo; ninguna pista de escala;
al menos una pista por clip; pesos en bytes que suman 255 y como mucho 4 influencias; atributos (sin UV: no hay
texturas); triángulos con la normal opuesta y aristas abiertas en piezas de cara simple;
presupuestos de triángulos por LOD y de llamadas; el reparto del diseño (forro tenible en los
desvelados y sin gafas; traje tenible y gafas oscuras en los celadores; nadie con auricular); los
bytes del manifiesto frente a los del disco y el tope de 8 MB. Escribe obra/validacion.json y sale
con 1 si hay errores.
"""
import json
import os
import re
import sys
import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import glb  # noqa: E402
import reparto  # noqa: E402

REPO = os.path.abspath(os.path.join(AQUI, '..', '..'))
# REPARTO_SALIDA, REPARTO_EMPAQUETADO, REPARTO_CUERPOS y REPARTO_INFORMES apuntan a copias: asi se
# ve cada comprobacion en ROJO con un fichero roto a proposito sin tocar lo de verdad
REC = os.environ.get('REPARTO_SALIDA') or os.path.join(REPO, 'escritorio', 'src', 'quiebro', 'recursos')
CUERPOS = os.environ.get('REPARTO_CUERPOS') or os.path.join(REPO, 'escritorio', 'src', 'quiebro', 'cuerpos.ts')
OBRA = os.path.join(AQUI, 'obra')
EMP = os.environ.get('REPARTO_EMPAQUETADO') or os.path.join(OBRA, 'empaquetado')
INFORMES = os.environ.get('REPARTO_INFORMES') or OBRA
# triángulos por variante (malla visible) y llamadas de dibujo por variante, por LOD
# ═══ SEGUNDA PASADA: LO QUE PIDE EL DISEÑO (§8) ═══ ~8.000 el propio, ~4.000 compañeros y NPC, ~1.000 la
# multitud, y el maniquí de 400 de los durmientes en N0 (LOD3). La primera entrega iba a 12-16k.
PRESUP = {'': (6000, 8600), '-lod1': (3200, 4400), '-lod2': (800, 1250), '-lod3': (300, 450)}
LLAMADAS = {'': 13, '-lod1': 2, '-lod2': 2, '-lod3': 2}
# ═══ LA TOLERANCIA DE LOS LOD DE LEJOS ═══ El LOD0 no admite ni un triángulo plegado ni una arista
# abierta. En el LOD1 (a 8-20 m) y el LOD2 (la multitud) el diezmado deja a veces uno o dos pliegues
# de un par de centímetros que la reparación no deshace sin comerse la malla (ver malla.lod_desde); se
# toleran esos pocos, y ni uno más: un LOD mal diezmado da decenas.
TOLERA = {'': (0, 0), '-lod1': (2, 4), '-lod2': (3, 4), '-lod3': (4, 6)}


# ═══ LA DIRECCIÓN DE ARTE, COMO REGLAS (segunda pasada) ═══ Lo que la revisión pidió y se puede medir en el
# fichero: el abrigo de la gabardina y de la Mole por encima de L* 35 (la Mole casi negra, L* 25, era el
# cuero largo de la franquicia); nada del ámbar que el diseño reserva a lo del jugador (la chaqueta de
# obra lo era); y cuatro Celadores con cuatro cristales tintados distintos (no negros opacos).
def lab(c):
    """Color lineal (glTF) -> CIELAB (D65)."""
    r, g, b = [max(0.0, float(x)) for x in c[:3]]
    X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
    Y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
    f = lambda v: v ** (1 / 3) if v > 0.008856 else 7.787 * v + 16 / 116
    return 116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))


def es_ambar(c):
    L, a, b = lab(c)
    import math
    h = math.degrees(math.atan2(b, a)) % 360
    return 40 <= h <= 80 and math.hypot(a, b) > 32 and L > 30


def acc(g, b, i):
    a = g['accessors'][i]
    x = glb.accesor(g, b, i, np)
    if a.get('normalized'):
        esc = {5120: 127.0, 5121: 255.0, 5122: 32767.0, 5123: 65535.0}[a['componentType']]
        return np.maximum(x.astype(np.float64) / esc, -1.0)
    return x.astype(np.float64)


def gestos_de_cuerpos():
    t = open(CUERPOS, encoding='utf-8').read()
    m = re.search(r'export type Gesto\s*=([^;]+);', t)
    return re.findall(r"'([a-z0-9-]+)'", m.group(1)) if m else []


def main():
    errores = []
    informe = {'figuras': {}, 'clips': {}}
    man = json.load(open(os.path.join(REC, 'reparto.json'), encoding='utf-8'))
    # ---------------------------------------------------------------- clips
    clips = {}
    for sexo, e in man['esqueletos'].items():
        g, b = glb.leer(os.path.join(EMP, e['clips']))
        nombres = [n['name'] for n in g['nodes']]
        huesos = [n for n in nombres if n != 'esqueleto']
        por_clip = {}
        for a in g.get('animations', []):
            if '.' in a['name'] or ':' in a['name']:
                errores.append('%s: clip con punto: %s' % (e['clips'], a['name']))
            rot = {nombres[c['target']['node']] for c in a['channels'] if c['target']['path'] == 'rotation'}
            esc = [c for c in a['channels'] if c['target']['path'] == 'scale']
            if esc:
                errores.append('%s/%s: %d pistas de escala' % (e['clips'], a['name'], len(esc)))
            if not a['channels']:
                errores.append('%s/%s: sin pistas' % (e['clips'], a['name']))
            dur = max(float(acc(g, b, s['input']).max()) for s in a['samplers'])
            por_clip[a['name']] = round(dur, 3)
        clips[sexo] = dict(g=g, clips=por_clip, huesos=huesos)
        informe['clips'][e['clips']] = por_clip
    # el vocabulario de cuerpos.ts, entero, en los dos esqueletos
    gestos = gestos_de_cuerpos()
    if not gestos:
        errores.append('no se encuentra el tipo Gesto en %s' % CUERPOS)
    for gs in gestos:
        entrada = man['gestos'].get(gs)
        if entrada is None:
            errores.append('el gesto %s de cuerpos.ts no esta en reparto.json' % gs)
            continue
        nombres_clip = [entrada['clip']] + list(entrada.get('porDireccion', {}).values()) + \
            list(entrada.get('porClase', {}).values()) + ([entrada['entraCon']] if entrada.get('entraCon') else [])
        for sexo, c in clips.items():
            for nc in nombres_clip:
                if nc not in c['clips']:
                    errores.append('el gesto %s pide el clip %s, que no esta en los clips de %s' % (gs, nc, sexo))
    for nc, d in man['clips'].items():
        for sexo, c in clips.items():
            if nc not in c['clips']:
                errores.append('reparto.json anuncia el clip %s y no esta en los de %s' % (nc, sexo))
            elif abs(c['clips'][nc] * 1000 - d['duracionMs']) > 40:
                errores.append('%s/%s: dura %d ms y el manifiesto dice %d' % (sexo, nc, c['clips'][nc] * 1000, d['duracionMs']))
    # ---------------------------------------------------------------- figuras
    vistos = set()
    cristales = {}
    for fam, ficha in man['figuras'].items():
        sexo = ficha['esqueleto']
        clase = ficha['clase']
        for lod in ficha['lods']:
            f = lod['archivo']
            # los LOD1 y LOD2 de los desvelados son de la familia y los nombran tres figuras (una por estilo)
            if f in vistos:
                continue
            vistos.add(f)
            ruta = os.path.join(REC, f)
            if not os.path.exists(ruta):
                errores.append('%s: no existe' % f)
                continue
            if os.path.getsize(ruta) != lod['bytes']:
                errores.append('%s: %d bytes en disco y %d en el manifiesto' % (f, os.path.getsize(ruta), lod['bytes']))
            if 'EXT_meshopt_compression' not in (glb.leer(ruta)[0].get('extensionsRequired') or []):
                errores.append('%s: no esta comprimido (EXT_meshopt_compression)' % f)
            suf = next((s_ for s_ in ('-lod3', '-lod2', '-lod1') if f.endswith(s_ + '.glb')), '')
            g, b = glb.leer(os.path.join(EMP, f))
            zonas_fam = ficha['zonas']
            nodos = [n.get('name', '') for n in g['nodes']]
            for n in nodos + [m['name'] for m in g.get('materials', [])] + [m['name'] for m in g['meshes']]:
                if '.' in n or ':' in n:
                    errores.append('%s: nombre con punto o dos puntos: %s' % (f, n))
            if len(set(nodos)) != len(nodos):
                errores.append('%s: nombres de nodo repetidos' % f)
            # esqueleto nodo a nodo frente a sus clips
            gc = clips[sexo]['g']
            reposo = {n['name']: n for n in gc['nodes']}
            for n in g['nodes']:
                if 'mesh' in n or n['name'] not in reposo:
                    continue
                for k, d in (('translation', [0, 0, 0]), ('rotation', [0, 0, 0, 1]), ('scale', [1, 1, 1])):
                    if max(abs(x - y) for x, y in zip(n.get(k, d), reposo[n['name']].get(k, d))) > 1e-4:
                        errores.append('%s: el hueso %s (%s) no es el de %s' % (f, n['name'], k, man['esqueletos'][sexo]['clips']))
                        break
            faltan = sorted(set(clips[sexo]['huesos']) - set(nodos))
            if faltan:
                errores.append('%s: nodos animados que no existen: %s' % (f, faltan[:5]))
            por_var = {}
            for nodo in g['nodes']:
                if 'mesh' not in nodo:
                    continue
                var = nodo['name']
                m = g['meshes'][nodo['mesh']]
                tris = 0
                opuestas = 0
                attrs = set()
                P_all, T_all, off = [], [], 0
                mats = []
                zonas_v = set()
                pesos_mal = 0
                for pr in m['primitives']:
                    at = pr['attributes']
                    attrs |= set(at)
                    mat = g['materials'][pr['material']]
                    mats.append(mat['name'])
                    idx = acc(g, b, pr['indices']).astype(np.int64).reshape(-1, 3)
                    pos = acc(g, b, at['POSITION'])
                    nrm = acc(g, b, at['NORMAL'])
                    tris += len(idx)
                    a_, b_, c_ = pos[idx[:, 0]], pos[idx[:, 1]], pos[idx[:, 2]]
                    fn = np.cross(b_ - a_, c_ - a_)
                    ln = np.linalg.norm(fn, axis=1)
                    ok = ln > 1e-12
                    vn = (nrm[idx[:, 0]] + nrm[idx[:, 1]] + nrm[idx[:, 2]]) / 3
                    dd = np.einsum('ij,ij->i', vn[ok], fn[ok] / ln[ok, None])
                    if not mat.get('doubleSided', False):
                        opuestas += int((dd < 0).sum())
                        P_all.append(pos)
                        T_all.append(idx + off)
                        off += len(pos)
                    if '_ZONA' in at:
                        for zi in np.unique(glb.accesor(g, b, at['_ZONA'], np).ravel()):
                            if zi >= len(zonas_fam):
                                errores.append('%s/%s: _zona %d fuera de las zonas de la familia' % (f, var, zi))
                            else:
                                zonas_v.add(zonas_fam[int(zi)])
                    else:
                        zonas_v.add(mat['name'])
                    w = glb.accesor(g, b, at['WEIGHTS_0'], np).astype(np.int64)
                    if g['accessors'][at['WEIGHTS_0']]['componentType'] != 5121:
                        errores.append('%s/%s: pesos sin cuantizar' % (f, var))
                    pesos_mal += int((w.sum(1) != 255).sum())
                abiertas = 0
                if P_all:
                    P = np.concatenate(P_all)
                    T = np.concatenate(T_all)
                    key = np.round(P / 1e-6).astype(np.int64)
                    _, sold = np.unique(key, axis=0, return_inverse=True)
                    Ts = sold.ravel()[T]
                    E = np.sort(np.concatenate([Ts[:, [0, 1]], Ts[:, [1, 2]], Ts[:, [2, 0]]]), axis=1)
                    E = E[E[:, 0] != E[:, 1]]
                    _, cnt = np.unique(E, axis=0, return_counts=True)
                    abiertas = int((cnt == 1).sum())
                lo, hi = PRESUP[suf]
                if not lo <= tris <= hi:
                    errores.append('%s/%s: %d triangulos (presupuesto %d-%d)' % (f, var, tris, lo, hi))
                if len(m['primitives']) > LLAMADAS[suf]:
                    errores.append('%s/%s: %d llamadas de dibujo (tope %d)' % (f, var, len(m['primitives']), LLAMADAS[suf]))
                necesarios = {'NORMAL', 'JOINTS_0', 'WEIGHTS_0', 'COLOR_0'} | ({'_ZONA'} if suf else set())
                if necesarios - attrs:
                    errores.append('%s/%s: faltan atributos %s' % (f, var, sorted(necesarios - attrs)))
                if 'TEXCOORD_0' in attrs:
                    errores.append('%s/%s: lleva UV y no hay texturas' % (f, var))
                if opuestas > TOLERA[suf][0]:
                    errores.append('%s/%s: %d triangulos con la normal opuesta (cara simple)' % (f, var, opuestas))
                if abiertas > TOLERA[suf][1]:
                    errores.append('%s/%s: %d aristas abiertas en piezas de cara simple' % (f, var, abiertas))
                if pesos_mal:
                    errores.append('%s/%s: %d vertices cuyos pesos no suman 255' % (f, var, pesos_mal))
                # el reparto del diseño, zona a zona (en los LOD de lejos, por su _zona)
                if clase == 'desvelado':
                    if 'mat_forro' not in zonas_v:
                        errores.append('%s/%s: el desvelado no tiene la zona tenible mat_forro' % (f, var))
                    if 'mat_gafas' in zonas_v:
                        errores.append('%s/%s: el desvelado lleva gafas (el diseño se las quita)' % (f, var))
                if suf == '':
                    for pr in m['primitives']:
                        mat = g['materials'][pr['material']]
                        col = mat.get('pbrMetallicRoughness', {}).get('baseColorFactor', [1, 1, 1, 1])
                        if mat['name'] == 'mat_abrigo' and clase == 'desvelado' and var in ('gabardina', 'mole') and lab(col)[0] < 35:
                            errores.append('%s/%s: el abrigo tiene L* %.0f (el diseño: por encima de 35)' % (f, var, lab(col)[0]))
                        if mat['name'] not in ('mat_forro',) and es_ambar(col):
                            errores.append('%s/%s: %s es ámbar, el color reservado a lo del jugador' % (f, var, mat['name']))
                        if clase == 'celador' and mat['name'] == 'mat_gafas':
                            cristales[var] = lab(col)
                if clase == 'celador':
                    if 'mat_traje' not in zonas_v:
                        errores.append('%s/%s: el celador no tiene el traje tenible mat_traje' % (f, var))
                    if 'mat_gafas' not in zonas_v:
                        errores.append('%s/%s: el celador no lleva gafas oscuras' % (f, var))
                if 'mat_cable' in zonas_v:
                    errores.append('%s/%s: lleva auricular (el diseño lo prohíbe)' % (f, var))
                por_var[var] = dict(triangulos=tris, llamadas=len(m['primitives']), zonas=sorted(zonas_v), opuestas=opuestas,
                                    abiertas=abiertas)
                if ficha['lods'][0] is lod and var not in ficha['variantes']:
                    errores.append('%s: la malla %s no esta en el manifiesto' % (f, var))
            for var in ficha['variantes']:
                if var not in por_var:
                    errores.append('%s: falta la malla de la variante %s' % (f, var))
            informe['figuras'][f] = dict(bytes=os.path.getsize(ruta), variantes=por_var)
    # los cuatro Celadores, cuatro cristales tintados distintos (ni negros ni iguales)
    import math
    for v, c in cristales.items():
        if c[0] < 6 or math.hypot(c[1], c[2]) < 3:
            errores.append('celador %s: el cristal es negro opaco (L* %.0f, croma %.0f): tintado' % (v, c[0], math.hypot(c[1], c[2])))
    nombres = sorted(cristales)
    for i, a in enumerate(nombres):
        for b in nombres[i + 1:]:
            if math.dist(cristales[a], cristales[b]) < 4:
                errores.append('celadores %s y %s: el mismo cristal' % (a, b))
    if len(cristales) < 4:
        errores.append('solo %d celadores con cristal (se esperan las cuatro siluetas)' % len(cristales))
    informe['cristales'] = {k: [round(x, 1) for x in v] for k, v in cristales.items()}
    # ---------------------------------------------------------------- piezas y bytes
    for nombre, p in man['piezas'].items():
        if not os.path.exists(os.path.join(REC, p['archivo'])):
            errores.append('pieza %s: no existe %s' % (nombre, p['archivo']))
    todos = [f for f in os.listdir(REC) if f.endswith('.glb')]
    total = sum(os.path.getsize(os.path.join(REC, f)) for f in todos)
    if total != man['bytes']['total']:
        errores.append('los GLB suman %d bytes y el manifiesto dice %d' % (total, man['bytes']['total']))
    if total > 8 * 1024 * 1024:
        errores.append('los GLB suman %d bytes: mas de 8 MB' % total)
    sobran = sorted(set(todos) - set(man['bytes']['porArchivo']))
    if sobran:
        errores.append('GLB en recursos que el manifiesto no nombra: %s' % sobran)
    informe['bytes'] = total
    informe['gestos'] = gestos
    informe['errores'] = errores
    json.dump(informe, open(os.path.join(INFORMES, 'validacion.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    for f, v in informe['figuras'].items():
        print('%-28s %8d B  %s' % (f, v['bytes'], '  '.join('%s %d/%d' % (k, x['triangulos'], x['llamadas'])
                                                              for k, x in v['variantes'].items())))
    print('clips: %s' % {k: len(v) for k, v in informe['clips'].items()})
    print('gestos de cuerpos.ts: %d; bytes en recursos: %d (tope %d)' % (len(gestos), total, 8 * 1024 * 1024))
    print('ERRORES %d' % len(errores))
    for e in errores:
        print('  -', e)
    return 1 if errores else 0


if __name__ == '__main__':
    sys.exit(main())
