"""LA CAPTURA: los clips de captura de movimiento de Quaternius (Universal Animation Library 1 y 2,
CC0, en `arte/ual/`) reorientados al esqueleto del reparto, con los MISMOS nombres de clip que ya lee el
cliente (un clip por `Gesto` de `escritorio/src/quiebro/cuerpos.ts`).

    blender -b --factory-startup --python-exit-code 1 --python captura.py -- extraer
        lee los GLB de arte/ual/ y deja las muestras en obra/captura/ual.npz (+ ual.json)

Lo demás no se llama a mano: `clips.py` importa este módulo y `registrar()` sustituye en
`animacion.CLIPS` los clips que tienen receta (ver `RECETAS`); el horneado de siempre (pasada de
suelo sobre las mallas, raíz, faldón simulado, exportación) hace el resto. Con `CAPTURA=0` en el
entorno no se registra nada y sale la forja pura (para comparar).

═══ CÓMO SE REORIENTA UN HUESO (la compensación de la pose de reposo) ═══

La fuente está en pose T (brazos horizontales) y la forja en pose A (brazos a 55° bajo la horizontal),
con otras proporciones. Por hueso, lo que se copia es la ROTACIÓN EN EL MUNDO respecto al reposo:

    Δ_fuente(t) = W_fuente(t) · W_fuente_reposo⁻¹          (cuánto ha girado el hueso de la fuente)
    D_destino(t) = Δ_fuente(t) · C,   C = F_fuente · F_destinoᵀ

donde F es un marco anatómico del hueso en reposo (primario: hacia la articulación siguiente;
secundario: hacia delante, o la palma). En el tronco, las piernas y la clavícula los dos reposos son
«de pie y neutro» y C = I: se copia el giro. En brazos, manos y dedos C es la rotación que lleva la
pose A a la pose T, así que un brazo que en la fuente baja 80° desde la T queda caído en el destino
y no 80° por debajo de la A.

═══ PIES QUE NO PATINAN Y CADERA A ESCALA ═══

Las posiciones (la cadera, los tobillos) se escalan por el cociente de largo de pierna
(`k = pierna_destino / pierna_fuente`, 1,018 el hombre y 0,956 la mujer) alrededor de su reposo:
`P = k·(P_fuente − P_fuente_reposo) + P_destino_reposo`. Las piernas van con IK de dos huesos a ese
tobillo (el plano de la rodilla, el de la fuente), y el pie conserva su giro de la fuente. Donde un pie
está apoyado (talón o bola a menos de 2,5 cm del suelo y quieto) se CLAVA: su punto de apoyo se fija
en el sitio medio del tramo y la IK hace el resto. La pasada de suelo del horneado sube lo que se
hunda, sobre las mallas de verdad.

═══ QUÉ SALE DE LA CAPTURA Y QUÉ DE LA FORJA ═══

`RECETAS` dice, por clip, de dónde sale: un clip de UAL (con su tramo y su mapa de tiempos: el impacto
de cada golpe en su milisegundo), una MEZCLA (capas por hueso: p. ej. el paseo de UAL con el brazo del
paraguas de la forja; o golpes recibidos de UAL sumados a la guardia) o nada (se queda la forja: la
patada del Cierre, los quiebros...). El manifiesto lleva la fuente de cada clip (`fuente`).

═══ EL SEGUNDO DESTINO: METAHUMAN ═══

`DESTINOS` tiene dos tablas de correspondencias: `forja` (el esqueleto de 57 huesos de hoy) y
`metahuman` (el cuerpo de MetaHuman, estilo Unreal 5: pelvis, spine_01..05, neck_01..02, head, con
huesos de giro). La de MetaHuman se hornea sobre CUALQUIER armadura con esos nombres sin la
maquinaria de la forja (sin faldón): `hornear_en_armadura()`, con `destino=metahuman` en
`captura.py -- hornear destino=metahuman armadura=<fbx|glb> salida=<glb>` (ver el README).
"""
import json
import math
import os
import sys

import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
if AQUI not in sys.path:
    sys.path.insert(0, AQUI)
OBRA = os.path.join(AQUI, 'obra')
CACHE = os.path.join(OBRA, 'captura')
UAL = os.environ.get('UAL') or os.path.abspath(os.path.join(AQUI, '..', 'ual'))
FUENTES = {
    'ual1': os.path.join('ual1', 'Animation Library[Standard]', 'Godot', 'AnimationLibrary_Godot_Standard.glb'),
    'ual2': os.path.join('ual2', 'Universal Animation Library 2 [Standard]', 'Unreal-Godot', 'UAL2_Standard.glb'),
}
MUESTRAS_S = 60          # muestras por segundo de la fuente (se interpola entre ellas)
FPS = 30

# ═══ LOS NOMBRES DE LA FUENTE ═══ UAL1 (el GLB de Godot) trae los huesos DEF-* de Rigify; UAL2, los del
# maniquí de Unreal. Los dos tienen el MISMO esqueleto (mismas cabezas en reposo, medido): todo se
# nombra como Unreal.
UAL1_A_UE = {'root': 'root', 'DEF-hips': 'pelvis', 'DEF-spine.001': 'spine_01', 'DEF-spine.002': 'spine_02',
             'DEF-spine.003': 'spine_03', 'DEF-neck': 'neck_01', 'DEF-head': 'Head'}
for _s, _u in (('L', 'l'), ('R', 'r')):
    UAL1_A_UE.update({'DEF-shoulder.' + _s: 'clavicle_' + _u, 'DEF-upper_arm.' + _s: 'upperarm_' + _u,
                      'DEF-forearm.' + _s: 'lowerarm_' + _u, 'DEF-hand.' + _s: 'hand_' + _u,
                      'DEF-thigh.' + _s: 'thigh_' + _u, 'DEF-shin.' + _s: 'calf_' + _u, 'DEF-foot.' + _s: 'foot_' + _u,
                      'DEF-toe.' + _s: 'ball_' + _u})
    for _d in ('index', 'middle', 'ring', 'pinky'):
        for _k in (1, 2, 3):
            UAL1_A_UE['DEF-f_%s.0%d.%s' % (_d, _k, _s)] = '%s_0%d_%s' % (_d, _k, _u)
    for _k in (1, 2, 3):
        UAL1_A_UE['DEF-thumb.0%d.%s' % (_k, _s)] = 'thumb_0%d_%s' % (_k, _u)


def nombre_ue(n):
    return UAL1_A_UE.get(n, n)


# ------------------------------------------------------------------ extracción (Blender)
def extraer(log=print):
    """Importa los GLB de UAL y guarda, por clip y a 60 muestras por segundo, la rotación (cuaternio w,x,y,z)
    y la cabeza de cada hueso en el espacio de la armadura, más el reposo. Todo con nombres de Unreal."""
    import bpy
    os.makedirs(CACHE, exist_ok=True)
    datos = {}
    meta = {'muestras_s': MUESTRAS_S, 'fuentes': {}}
    for fuente, rel in FUENTES.items():
        ruta = os.path.join(UAL, rel)
        if not os.path.exists(ruta):
            raise SystemExit('captura: falta %s (UAL no se versiona: ver arte/forja/README.md, «La captura»)' % ruta)
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=ruta)
        sc = bpy.context.scene
        fps = sc.render.fps / sc.render.fps_base
        arm = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
        huesos = [b.name for b in arm.data.bones]
        nombres = [nombre_ue(n) for n in huesos]
        Rr = np.array([_quat(b.matrix_local.to_3x3()) for b in arm.data.bones])
        Pr = np.array([list(b.head_local) for b in arm.data.bones])
        Tr = np.array([list(b.tail_local) for b in arm.data.bones])
        datos['%s|reposo|q' % fuente] = Rr
        datos['%s|reposo|p' % fuente] = Pr
        datos['%s|reposo|cola' % fuente] = Tr
        if arm.animation_data is None:
            arm.animation_data_create()
        clips = {}
        for act in sorted(bpy.data.actions, key=lambda a: a.name):
            nombre = act.name.rsplit('_', 1)[0]
            f0, f1 = act.frame_range
            dur = (f1 - f0) / fps
            n = int(round(dur * MUESTRAS_S)) + 1
            arm.animation_data.action = act
            Q = np.zeros((n, len(huesos), 4))
            P = np.zeros((n, len(huesos), 3))
            for i in range(n):
                f = f0 + min(dur, i / MUESTRAS_S) * fps
                sc.frame_set(int(math.floor(f)), subframe=f - math.floor(f))
                for j, h in enumerate(huesos):
                    M = arm.pose.bones[h].matrix
                    Q[i, j] = _quat(M.to_3x3())
                    P[i, j] = list(M.translation)
            # continuidad de signo de los cuaternios (para interpolar)
            for i in range(1, n):
                s = np.sign(np.sum(Q[i] * Q[i - 1], axis=1))
                s[s == 0] = 1
                Q[i] *= s[:, None]
            datos['%s|%s|q' % (fuente, nombre)] = Q.astype(np.float32)
            datos['%s|%s|p' % (fuente, nombre)] = P.astype(np.float32)
            clips[nombre] = {'duracion_s': round(dur, 4), 'muestras': n}
        meta['fuentes'][fuente] = {'glb': rel.replace('\\', '/'), 'huesos': nombres, 'clips': clips}
        log('captura: %s, %d clips, %d huesos' % (fuente, len(clips), len(huesos)))
    np.savez_compressed(os.path.join(CACHE, 'ual.npz'), **datos)
    with open(os.path.join(CACHE, 'ual.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(meta, f, indent=1, ensure_ascii=False)
        f.write('\n')
    log('captura: %s' % os.path.join(CACHE, 'ual.npz'))


def _quat(m3):
    q = m3.to_quaternion()
    q.normalize()
    return [q.w, q.x, q.y, q.z]


# ------------------------------------------------------------------ cuaternios en numpy (w, x, y, z)
def _qmul(a, b):
    aw, ax, ay, az = np.moveaxis(a, -1, 0)
    bw, bx, by, bz = np.moveaxis(b, -1, 0)
    return np.stack([aw * bw - ax * bx - ay * by - az * bz,
                     aw * bx + ax * bw + ay * bz - az * by,
                     aw * by - ax * bz + ay * bw + az * bx,
                     aw * bz + ax * by - ay * bx + az * bw], -1)


def _qconj(a):
    return a * np.array([1.0, -1.0, -1.0, -1.0])


# ------------------------------------------------------------------ la fuente, leída
_DATOS = {}


def _cargar():
    if not _DATOS:
        ruta = os.path.join(CACHE, 'ual.npz')
        if not os.path.exists(ruta):
            raise RuntimeError('captura: no hay %s; se saca de arte/ual/ con `bash arte/forja/rehacer.sh captura`' % ruta)
        _DATOS['npz'] = np.load(ruta)
        _DATOS['meta'] = json.load(open(os.path.join(CACHE, 'ual.json'), encoding='utf-8'))
    return _DATOS['npz'], _DATOS['meta']


LADO_UE = {'l': 'r', 'r': 'l'}


def _espejo_nombre(n):
    if n.endswith('_l') or n.endswith('_r'):
        return n[:-1] + LADO_UE[n[-1]]
    return n


class ClipFuente:
    """Un clip de UAL: por hueso, su giro en el mundo respecto al reposo (Δ = W·W_reposo⁻¹) y su cabeza,
    en cualquier instante (interpolado entre las muestras de 1/60 s)."""
    _hechos = {}

    @classmethod
    def de(cls, clave):
        if clave not in cls._hechos:
            cls._hechos[clave] = cls(clave)
        return cls._hechos[clave]

    def __init__(self, clave):
        fuente, nombre = clave.split(':')
        d, meta = _cargar()
        m = meta['fuentes'][fuente]
        if nombre not in m['clips']:
            raise KeyError('captura: %s no trae el clip %s' % (fuente, nombre))
        self.clave = clave
        self.nombres = m['huesos']
        self.dur = m['clips'][nombre]['duracion_s']
        Q = d['%s|%s|q' % (fuente, nombre)].astype(np.float64)
        Qr = d['%s|reposo|q' % fuente].astype(np.float64)
        self.P = d['%s|%s|p' % (fuente, nombre)].astype(np.float64)
        self.Pr = d['%s|reposo|p' % fuente].astype(np.float64)
        D = _qmul(Q, _qconj(Qr)[None])
        for i in range(1, len(D)):
            s = np.sign(np.sum(D[i] * D[i - 1], axis=1))
            s[s == 0] = 1
            D[i] *= s[:, None]
        self.D = D
        self.n = len(D)

    def muestra(self, t, bucle=False, espejo=False):
        """(Δ por hueso: Quaternion, cabeza por hueso: Vector) en t segundos."""
        from mathutils import Quaternion, Vector
        if bucle:
            t = t % self.dur
        t = min(max(t, 0.0), self.dur)
        x = t * MUESTRAS_S
        i0 = min(int(math.floor(x)), self.n - 1)
        i1 = min(i0 + 1, self.n - 1)
        a = x - i0
        q = self.D[i0] * (1 - a) + self.D[i1] * a
        q /= np.linalg.norm(q, axis=1, keepdims=True)
        p = self.P[i0] * (1 - a) + self.P[i1] * a
        dq, pos = {}, {}
        for j, n in enumerate(self.nombres):
            w, x_, y_, z_ = q[j]
            if espejo:
                n = _espejo_nombre(n)
                dq[n] = Quaternion((w, x_, -y_, -z_))
                pos[n] = Vector((-p[j, 0], p[j, 1], p[j, 2]))
            else:
                dq[n] = Quaternion((w, x_, y_, z_))
                pos[n] = Vector(p[j])
        return dq, pos


def reposo_fuente(fuente='ual1'):
    from mathutils import Vector
    d, meta = _cargar()
    return {n: Vector(p) for n, p in zip(meta['fuentes'][fuente]['huesos'], d['%s|reposo|p' % fuente])}


# ------------------------------------------------------------------ las tablas de correspondencias
# Por hueso del destino: (hueso o huesos de la fuente, modo, primario en la fuente, primario en el destino).
#   · 'igual': los dos reposos son el mismo gesto (de pie, neutro): C = I, se copia el giro.
#   · 'dir': el hueso apunta a otra parte en cada reposo (brazo en T o en A): C alinea el marco (primario:
#     hacia la articulación siguiente; secundario: hacia delante, -Y) de la fuente con el del destino.
#   · varios huesos de fuente: se promedia su giro (los cuatro dedos de la fuente en el único de la forja).
# Los primarios: (desde, hasta) con nombres de hueso (su cabeza) o `hueso>` para su cola.
_DEDOS1 = ['index_01_%s', 'middle_01_%s', 'ring_01_%s', 'pinky_01_%s']
_DEDOS2 = ['index_02_%s', 'middle_02_%s', 'ring_02_%s', 'pinky_02_%s', 'index_03_%s', 'middle_03_%s', 'ring_03_%s',
           'pinky_03_%s']


def _tabla_forja():
    t = {'caderas': ('pelvis', 'igual'), 'columna': ('spine_01', 'igual'), 'columna1': ('spine_02', 'igual'),
         'pecho': ('spine_03', 'igual'), 'cuello': ('neck_01', 'igual'), 'cabeza': ('Head', 'igual')}
    for S, s in (('L', 'l'), ('R', 'r')):
        mano = (('hand_' + s, 'middle_01_' + s), ('mano_' + S, 'mano_' + S + '>'))
        t.update({
            'hombro_' + S: ('clavicle_' + s, 'igual'),
            'brazo_' + S: ('upperarm_' + s, 'dir', ('upperarm_' + s, 'lowerarm_' + s), ('brazo_' + S, 'antebrazo_' + S)),
            'antebrazo_' + S: ('lowerarm_' + s, 'dir', ('lowerarm_' + s, 'hand_' + s), ('antebrazo_' + S, 'mano_' + S)),
            'mano_' + S: ('hand_' + s, 'dir') + mano,
            'dedos_' + S: ([x % s for x in _DEDOS1], 'dir') + mano,
            'dedos2_' + S: ([x % s for x in _DEDOS2], 'dir') + mano,
            'pulgar_' + S: (['thumb_02_' + s, 'thumb_03_' + s], 'dir') + mano,
            'muslo_' + S: ('thigh_' + s, 'igual'), 'pierna_' + S: ('calf_' + s, 'igual'),
            'pie_' + S: ('foot_' + s, 'igual'), 'punta_' + S: ('ball_' + s, 'igual'),
        })
    return t


def _tabla_metahuman():
    """El cuerpo de MetaHuman (Unreal 5): pelvis, spine_01..05, neck_01..02, head, clavícula, brazo,
    antebrazo, mano, dedos con metacarpo, muslo, pierna, pie, bola y los huesos de GIRO (*_twist_0N_*),
    que no tienen par en la fuente: `GIROS_METAHUMAN` los reparte (una fracción del giro del hueso
    siguiente alrededor de su eje). Las columnas de más se reparten entre las de la fuente."""
    t = {'pelvis': ('pelvis', 'igual'),
         'spine_01': ('spine_01', 'igual'), 'spine_02': (['spine_01', 'spine_02'], 'igual'), 'spine_03': ('spine_02', 'igual'),
         'spine_04': (['spine_02', 'spine_03'], 'igual'), 'spine_05': ('spine_03', 'igual'),
         'neck_01': ('neck_01', 'igual'), 'neck_02': (['neck_01', 'Head'], 'igual'), 'head': ('Head', 'igual')}
    for s in 'lr':
        mano = (('hand_' + s, 'middle_01_' + s), ('hand_' + s, 'middle_metacarpal_' + s + '>'))
        t.update({
            'clavicle_' + s: ('clavicle_' + s, 'igual'),
            'upperarm_' + s: ('upperarm_' + s, 'dir', ('upperarm_' + s, 'lowerarm_' + s), ('upperarm_' + s, 'lowerarm_' + s)),
            'lowerarm_' + s: ('lowerarm_' + s, 'dir', ('lowerarm_' + s, 'hand_' + s), ('lowerarm_' + s, 'hand_' + s)),
            'hand_' + s: ('hand_' + s, 'dir') + mano,
            'thigh_' + s: ('thigh_' + s, 'igual'), 'calf_' + s: ('calf_' + s, 'igual'),
            'foot_' + s: ('foot_' + s, 'igual'), 'ball_' + s: ('ball_' + s, 'igual'),
        })
        for dedo in ('index', 'middle', 'ring', 'pinky', 'thumb'):
            for k in (1, 2, 3):
                t['%s_0%d_%s' % (dedo, k, s)] = ('%s_0%d_%s' % (dedo, k, s), 'dir') + mano
            if dedo != 'thumb':
                t['%s_metacarpal_%s' % (dedo, s)] = ('hand_' + s, 'dir') + mano
    return t


# Los huesos de giro de MetaHuman: (hueso de giro, hueso cuyo giro reparte, fracción). En Unreal los mueve
# la pose de control; en un GLB van horneados.
GIROS_METAHUMAN = []
for _s in 'lr':
    GIROS_METAHUMAN += [('upperarm_twist_01_' + _s, 'upperarm_' + _s, -0.66), ('upperarm_twist_02_' + _s, 'upperarm_' + _s, -0.33),
                        ('lowerarm_twist_01_' + _s, 'hand_' + _s, 0.33), ('lowerarm_twist_02_' + _s, 'hand_' + _s, 0.66),
                        ('thigh_twist_01_' + _s, 'thigh_' + _s, -0.66), ('thigh_twist_02_' + _s, 'thigh_' + _s, -0.33),
                        ('calf_twist_01_' + _s, 'foot_' + _s, 0.33), ('calf_twist_02_' + _s, 'foot_' + _s, 0.66)]

DESTINOS = {
    # cadera, muslos y tobillos del destino (para las posiciones), y muñecas
    'forja': dict(tabla=_tabla_forja(), cadera='caderas', muslos=('muslo_L', 'muslo_R'), tobillos=('pie_L', 'pie_R'),
                  munecas=('mano_L', 'mano_R'), lados=('L', 'R'), cabeza='cabeza', pecho='pecho',
                  # las cadenas de cada lado: el brazo (clavícula, brazo, antebrazo, mano, nudillos) y la pierna
                  brazos={S: ('hombro_' + S, 'brazo_' + S, 'antebrazo_' + S, 'mano_' + S, 'dedos_' + S) for S in 'LR'},
                  piernas={S: ('muslo_' + S, 'pierna_' + S, 'pie_' + S, 'punta_' + S) for S in 'LR'}),
    'metahuman': dict(tabla=_tabla_metahuman(), cadera='pelvis', muslos=('thigh_l', 'thigh_r'), tobillos=('foot_l', 'foot_r'),
                      munecas=('hand_l', 'hand_r'), lados=('l', 'r'), giros=GIROS_METAHUMAN, cabeza='head', pecho='spine_05',
                      brazos={s: ('clavicle_' + s, 'upperarm_' + s, 'lowerarm_' + s, 'hand_' + s, 'middle_01_' + s) for s in 'lr'},
                      piernas={s: ('thigh_' + s, 'calf_' + s, 'foot_' + s, 'ball_' + s) for s in 'lr'}),
}
TRONCO = ('columna', 'columna1', 'pecho', 'cuello', 'cabeza')
BRAZO = {S: tuple(b + S for b in ('hombro_', 'brazo_', 'antebrazo_', 'mano_', 'dedos_', 'dedos2_', 'pulgar_')) for S in 'LR'}
PIERNA = {S: tuple(b + S for b in ('muslo_', 'pierna_', 'pie_', 'punta_')) for S in 'LR'}
PARTE_ALTA = TRONCO + BRAZO['L'] + BRAZO['R']
PARTE_BAJA = ('caderas',) + PIERNA['L'] + PIERNA['R']


def _marco(prim, sec):
    from mathutils import Matrix
    X = prim.normalized()
    Y = (sec - X * sec.dot(X)).normalized()
    Z = X.cross(Y)
    return Matrix((X, Y, Z)).transposed()


class Destino:
    """El reposo de un destino frente al de la fuente: la C de cada hueso, el factor de escala de las
    posiciones (largo de pierna) y las articulaciones que se corresponden. `sk` es un `animacion.Esqueleto`
    (o cualquier objeto con head, tail, parent y orden)."""

    def __init__(self, sk, destino='forja', fuente='ual1'):
        from mathutils import Matrix, Vector
        self.sk = sk
        self.cfg = DESTINOS[destino]
        self.tabla = {b: v for b, v in self.cfg['tabla'].items() if b in sk.head}
        Pr = reposo_fuente(fuente)
        self.Pr = Pr

        def punto_t(n):
            return sk.tail[n[:-1]] if n.endswith('>') else sk.head[n]

        def punto_s(n):
            return Pr[n[:-1]] if n.endswith('>') else Pr[n]
        adelante = Vector((0.0, -1.0, 0.0))
        self.C = {}
        for b, ent in self.tabla.items():
            if ent[1] == 'igual':
                self.C[b] = Matrix.Identity(3)
                continue
            (s0, s1), (t0, t1) = ent[2], ent[3]
            Fs = _marco(punto_s(s1) - punto_s(s0), adelante)
            Ft = _marco(punto_t(t1) - punto_t(t0), adelante)
            self.C[b] = Fs @ Ft.transposed()
        cfg = self.cfg
        mL, mR = cfg['muslos']
        tL, tR = cfg['tobillos']
        self.ms = (Pr['thigh_l'] + Pr['thigh_r']) * 0.5
        self.mt = (sk.head[mL] + sk.head[mR]) * 0.5
        a_s = (Pr['foot_l'] + Pr['foot_r']) * 0.5
        a_t = (sk.head[tL] + sk.head[tR]) * 0.5
        self.k = (self.mt.z - a_t.z) / (self.ms.z - a_s.z)
        self.orden = [b for b in sk.orden if b in self.tabla]
        # los puntos del pie en reposo (tobillo, talón y bola en el suelo) y los largos de las cadenas
        self.pie = {}
        self.largos = {}
        for S in cfg['lados']:
            muslo, pierna, pie, punta = cfg['piernas'][S]
            if hasattr(sk, 'talon'):
                self.pie[S] = (sk.tobillo[S], sk.talon[S], sk.bola[S])
            else:
                t_ = sk.head[pie]
                b_ = sk.head[punta] if punta in sk.head else t_ + (sk.tail[pie] - t_)
                h0 = min(t_.z, b_.z) - 0.02 * (t_ - sk.head[muslo]).length
                self.pie[S] = (t_, Vector((t_.x, t_.y - (b_.y - t_.y) * 0.3, h0)), Vector((b_.x, b_.y, h0)))
            self.largos[S] = ((sk.head[pierna] - sk.head[muslo]).length, (sk.head[pie] - sk.head[pierna]).length)

    def pose(self, dq, pos):
        """De una muestra de la fuente a una pose del destino (`Pose`)."""
        sk = self.sk
        Dw = {}
        for b, ent in self.tabla.items():
            src = ent[0]
            if isinstance(src, list):
                q = _media([dq[x] for x in src if x in dq])
            else:
                q = dq.get(src)
            if q is None:
                continue
            Dw[b] = q.to_matrix() @ self.C[b]
        q = {}
        for b in self.orden:
            if b not in Dw:
                continue
            par = sk.parent[b]
            while par is not None and par not in Dw:
                par = sk.parent[par]
            L = Dw[b] if par is None else Dw[par].transposed() @ Dw[b]
            q[b] = L.to_quaternion()
        cfg = self.cfg
        k = self.k
        m = (pos['thigh_l'] + pos['thigh_r']) * 0.5
        M = (m - self.ms) * k + self.mt
        c = cfg['cadera']
        cad = M - Dw[c] @ (self.mt - sk.head[c])
        tob, mun = {}, {}
        for S, s, tn, mn in zip(cfg['lados'], 'lr', cfg['tobillos'], cfg['munecas']):
            tob[S] = (pos['foot_' + s] - self.Pr['foot_' + s]) * k + sk.head[tn]
            mun[S] = (pos['hand_' + s] - self.Pr['hand_' + s]) * k + sk.head[mn]
        return Pose(q, cad, tob, mun)


def _media(qs):
    """Media de cuaternios cercanos (normalizada, con el signo del primero)."""
    from mathutils import Quaternion
    if len(qs) == 1:
        return qs[0].copy()
    a = qs[0]
    s = [0.0, 0.0, 0.0, 0.0]
    for q in qs:
        k = 1.0 if a.dot(q) >= 0 else -1.0
        for i in range(4):
            s[i] += k * q[i]
    r = Quaternion(s)
    r.normalize()
    return r


# ------------------------------------------------------------------ la pose del destino y sus mezclas
class Pose:
    """Una pose del destino: el giro LOCAL de cada hueso (en ejes del mundo en reposo:
    D[padre]⁻¹·D[hueso]), la cabeza de la cadera, los tobillos y las muñecas en el mundo, y lo que la
    forja pone aparte (`extra`: los dedos del agarre, la IK de un brazo)."""

    def __init__(self, q, cad, tob, mun, extra=None):
        self.q = q
        self.cad = cad
        self.tob = tob
        self.mun = mun
        self.extra = dict(extra or {})

    def copia(self):
        return Pose({b: v.copy() for b, v in self.q.items()}, self.cad.copy(), {k: v.copy() for k, v in self.tob.items()},
                    {k: v.copy() for k, v in self.mun.items()}, self.extra)

    def desplazada(self, d):
        """La misma pose movida d (Vector) en el suelo."""
        p = self.copia()
        p.cad += d
        for k in p.tob:
            p.tob[k] += d
        for k in p.mun:
            p.mun[k] += d
        return p


def _en(huesos, b):
    return huesos is None or b in huesos


def mezclar(a, b, w, huesos=None):
    """a → b con peso w (0..1), sólo en `huesos` (None: todos). La cadera va con `caderas`, cada
    tobillo con su muslo y cada muñeca con su brazo."""
    if w <= 0.0:
        return a
    if w >= 1.0 and huesos is None:
        return b
    r = a.copia()
    for n, qb in b.q.items():
        if not _en(huesos, n):
            continue
        qa = a.q.get(n)
        r.q[n] = qb.copy() if qa is None else qa.slerp(qb, w)
    if _en(huesos, 'caderas'):
        r.cad = a.cad.lerp(b.cad, w)
    for S in r.tob:
        if _en(huesos, 'muslo_' + S):
            r.tob[S] = a.tob[S].lerp(b.tob[S], w)
        if _en(huesos, 'brazo_' + S):
            r.mun[S] = a.mun[S].lerp(b.mun[S], w)
    if w >= 0.5:
        for k, v in b.extra.items():
            if huesos is None or any(k.endswith(S) and ('mano_' + S) in huesos for S in 'LR'):
                r.extra[k] = v
    return r


def sumar(base, capa, ref, huesos=None, escala=1.0, cadera=True, pies=False):
    """La capa ADITIVA: a la base se le suma lo que `capa` se aparta de `ref` (su propia pose de
    partida), hueso a hueso en local, y el desplazamiento de su cadera. Los pies siguen donde los tiene
    la base (clavados) salvo `pies`."""
    from mathutils import Quaternion
    r = base.copia()
    I = Quaternion()
    for n, qc in capa.q.items():
        if not _en(huesos, n) or n not in ref.q or n not in r.q:
            continue
        d = ref.q[n].inverted() @ qc
        if escala != 1.0:
            d = I.slerp(d, escala) if 0.0 <= escala <= 1.0 else _potencia(d, escala)
        r.q[n] = r.q[n] @ d
    if cadera:
        r.cad = base.cad + (capa.cad - ref.cad) * escala
    if pies:
        for S in r.tob:
            r.tob[S] = base.tob[S] + (capa.tob[S] - ref.tob[S]) * escala
    return r


def _potencia(q, k):
    from mathutils import Quaternion
    eje, ang = q.to_axis_angle()
    return Quaternion(eje, ang * k)


def suave(t):
    t = min(1.0, max(0.0, t))
    return t * t * (3 - 2 * t)


def tramo(claves, f):
    """Interpolación a trozos: claves [(x, y) o (x, y, 'suave'|potencia)], lineal por defecto."""
    if f <= claves[0][0]:
        return claves[0][1]
    for a, b in zip(claves[:-1], claves[1:]):
        if a[0] <= f <= b[0]:
            u = (f - a[0]) / max(1e-9, b[0] - a[0])
            modo = b[2] if len(b) > 2 else None
            if modo == 'suave':
                u = suave(u)
            elif isinstance(modo, (int, float)):
                u = u ** modo
            return a[1] + (b[1] - a[1]) * u
    return claves[-1][1]


# ------------------------------------------------------------------ las pistas (de dónde sale cada fotograma)
class Ctx:
    """Lo que necesita una pista para dar una pose: el esqueleto del horneado, el destino, y los clips de
    la forja tal como eran antes de registrar la captura (una capa puede ser un clip de la forja)."""

    def __init__(self, sk, forja, clips, destino='forja'):
        self.sk = sk
        self.destino = Destino(sk, destino)
        self.destino_nombre = destino
        self.forja = forja
        self.clips = clips
        self._cache = {}

    def forja_pose(self, nombre, fr):
        """Un clip de la forja resuelto (con los clips originales en su sitio: `salir` lee `descolgar`)."""
        import animacion
        clave = (nombre, round(fr, 4))
        if clave in self._cache:
            return self._cache[clave]
        c = self.forja[nombre]
        fr_ = fr % c['frames'] if c['bucle'] else min(max(fr, 0.0), c['frames'])
        with forja_original(self.clips, self.forja):
            p = c['fn'](fr_)
        res = animacion.resolver(self.sk, p)
        pose = pose_de_resolucion(self.sk, self.destino, res)
        # las piernas que la forja lleva en FK (de rodillas, tumbado) siguen así: la pasada de suelo del horneado sube
        # entonces la cadera y no el pie (sube el pie, y el de la espinilla en el suelo patinaba: absorber, 3 -> 18)
        for S in 'LR':
            if p.get('ikp_' + S, 1.0) < 0.999:
                pose.extra['ikp_' + S] = p['ikp_' + S]
        self._cache[clave] = pose
        return pose


class forja_original:
    """Dentro, `animacion.CLIPS` vuelve a tener los clips de la forja (un clip de la forja que lee otro, como
    `salir` a `descolgar`, lee el suyo)."""

    def __init__(self, clips, forja):
        self.clips, self.forja = clips, forja

    def __enter__(self):
        self.antes = {k: self.clips[k] for k in self.forja if self.clips.get(k) is not self.forja[k]}
        self.clips.update({k: self.forja[k] for k in self.antes})

    def __exit__(self, *a):
        self.clips.update(self.antes)
        return False


def pose_de_resolucion(sk, destino, res):
    """Una pose de la forja (lo que devuelve `animacion.resolver`) como `Pose`."""
    D, head = res[3], res[4]
    q = {}
    for b in destino.orden:
        par = sk.parent[b]
        L = D[b] if par is None else D[par].transposed() @ D[b]
        q[b] = L.to_quaternion()
    tob = {S: head['pie_' + S].copy() for S in 'LR'}
    mun = {S: head['mano_' + S].copy() for S in 'LR'}
    return Pose(q, head['caderas'].copy(), tob, mun)


class Pista:
    def pose(self, f, ctx):
        raise NotImplementedError


class Ual(Pista):
    """Un clip de UAL. `t`: None (a su ritmo), una lista de claves [(fotograma, segundo de la fuente)]
    o una función. `ciclo`: fotogramas de un ciclo en los bucles (el clip entero cabe en ellos).
    `espejo`: izquierda por derecha. `zancada`: alarga la marcha (los tobillos, lejos de la cadera)."""

    def __init__(self, clave, t=None, ciclo=None, espejo=False, zancada=1.0):
        self.clave = clave
        self.t = t
        self.ciclo = ciclo
        self.espejo = espejo
        self.zancada = zancada

    def segundo(self, f):
        c = ClipFuente.de(self.clave)
        if self.ciclo:
            return (f % self.ciclo) / self.ciclo * c.dur
        if self.t is None:
            return f / FPS
        if callable(self.t):
            return self.t(f)
        return tramo(self.t, f)

    def pose(self, f, ctx):
        from mathutils import Vector
        c = ClipFuente.de(self.clave)
        dq, pos = c.muestra(self.segundo(f), bucle=bool(self.ciclo), espejo=self.espejo)
        p = ctx.destino.pose(dq, pos)
        if self.zancada != 1.0:
            for S in p.tob:
                d = p.tob[S] - p.cad
                p.tob[S] = p.cad + Vector((d.x, d.y * self.zancada, d.z))
        return p


class Forja(Pista):
    """Un clip de la forja como capa (su fotograma: `fr(f)`, claves, o el mismo)."""

    def __init__(self, nombre, fr=None, extra=None):
        self.nombre = nombre
        self.fr = fr
        self.extra = extra or {}

    def pose(self, f, ctx):
        fr = f if self.fr is None else (self.fr(f) if callable(self.fr) else tramo(self.fr, f))
        p = ctx.forja_pose(self.nombre, fr)
        if self.extra:
            p = p.copia()
            p.extra.update(self.extra)
        return p


class Quieta(Pista):
    def __init__(self, pista, f0=0.0):
        self.pista = pista
        self.f0 = f0

    def pose(self, f, ctx):
        return self.pista.pose(self.f0, ctx)


def _peso(peso, f):
    return peso(f) if callable(peso) else (tramo(peso, f) if isinstance(peso, list) else peso)


class Mezcla(Pista):
    """Una base y capas encima: (pista, peso o claves de peso o función, huesos)."""

    def __init__(self, base, *capas):
        self.base = base
        self.capas = capas

    def pose(self, f, ctx):
        p = self.base.pose(f, ctx)
        for pista, peso, huesos in self.capas:
            w = _peso(peso, f)
            if w > 0:
                p = mezclar(p, pista.pose(f, ctx), w, huesos)
        return p


class Suma(Pista):
    """Base + capa aditiva (lo que la capa se aparta de su fotograma `ref`)."""

    def __init__(self, base, capa, ref=0.0, huesos=None, escala=1.0, cadera=True, pies=False):
        self.base, self.capa, self.ref = base, capa, ref
        self.huesos, self.escala, self.cadera, self.pies = huesos, escala, cadera, pies

    def pose(self, f, ctx):
        return sumar(self.base.pose(f, ctx), self.capa.pose(f, ctx), self.capa.pose(self.ref, ctx), self.huesos,
                     _peso(self.escala, f), self.cadera, self.pies)


class Tramos(Pista):
    """Una pista tras otra: [(desde el fotograma, pista, fundido en fotogramas)]."""

    def __init__(self, *tramos):
        self.tramos = tramos

    def pose(self, f, ctx):
        i = 0
        for k, (f0, _, _) in enumerate(self.tramos):
            if f >= f0:
                i = k
        f0, pista, fundido = self.tramos[i]
        p = pista.pose(f, ctx)
        if i > 0 and fundido and f - f0 < fundido:
            antes = self.tramos[i - 1][1].pose(f, ctx)
            p = mezclar(antes, p, suave((f - f0) / float(fundido)))
        return p


class Desplazada(Pista):
    """La pista movida en el suelo para que su cadera quede, en el fotograma `f_ref`, sobre (x, y) = `a`
    (un tumbado «sobre el origen») o sobre la de otra pista en un fotograma (`de=(pista, f)`)."""

    def __init__(self, pista, f_ref=0.0, a=(0.0, 0.0), de=None):
        self.pista, self.f_ref, self.a, self.de = pista, f_ref, a, de
        self._d = {}

    def pose(self, f, ctx):
        from mathutils import Vector
        if id(ctx) not in self._d:
            p0 = self.pista.pose(self.f_ref, ctx)
            if self.de is not None:
                q = self.de[0].pose(self.de[1], ctx)
                a = (q.cad.x, q.cad.y)
            else:
                a = self.a
            self._d[id(ctx)] = Vector((a[0] - p0.cad.x, a[1] - p0.cad.y, 0.0))
        return self.pista.pose(f, ctx).desplazada(self._d[id(ctx)])


class PieComo(Pista):
    """La pista movida en el suelo (entera, una vez) para que su pie `S` en el fotograma `f` quede donde lo tiene `ref`
    en su fotograma `f_ref`, y girado sobre el suelo como lo tiene `ref` (su rumbo). Para cambiar de postura con UN paso:
    el conjuro del rayo, en espejo, adelanta el pie derecho y el reposo lo tiene atrás; fundidos tal cual, los dos pies se
    cruzaban a la vez (un saltito de 8 cm). Con el izquierdo donde lo tiene el reposo, sólo da el paso el derecho. Y con
    su mismo rumbo: si no, el pie quieto giraba 15° al entrar (la punta barría 10 cm) y los pies clavados de la carga y
    del lanzar no casaban entre sí (`comprobar_movimiento`, el fundido de uno a otro)."""

    def __init__(self, pista, S, ref, f=0.0, f_ref=0.0):
        self.pista, self.S, self.ref, self.f, self.f_ref = pista, S, ref, f, f_ref
        self._d = {}

    @staticmethod
    def _rumbo_del_pie(p, ctx, S):
        """El rumbo del pie `S` de la pose `p` en el suelo, y los giros que lo sostienen (para girarlo)."""
        from mathutils import Vector
        cfg = ctx.destino.cfg
        muslo, pierna, pie, _ = cfg['piernas'][S]
        Dsup = p.q[cfg['cadera']].to_matrix() @ p.q[muslo].to_matrix() @ p.q[pierna].to_matrix()
        Dp = Dsup @ p.q[pie].to_matrix()
        _t, tal0, bol0 = ctx.destino.pie[S]
        d = Dp @ (bol0 - tal0)
        return math.atan2(d.x, -d.y), Dsup, Dp, pie

    def pose(self, f, ctx):
        from mathutils import Matrix, Vector
        if id(ctx) not in self._d:
            pa = self.pista.pose(self.f, ctx)
            pb = self.ref.pose(self.f_ref, ctx)
            a, b = pa.tob[self.S], pb.tob[self.S]
            giro = _angulo(PieComo._rumbo_del_pie(pb, ctx, self.S)[0] - PieComo._rumbo_del_pie(pa, ctx, self.S)[0])
            self._d[id(ctx)] = (Vector((b.x - a.x, b.y - a.y, 0.0)), giro)
        desp, giro = self._d[id(ctx)]
        p = self.pista.pose(f, ctx).desplazada(desp)
        if abs(giro) > 1e-6:
            _r, Dsup, Dp, pie = PieComo._rumbo_del_pie(p, ctx, self.S)
            p.q[pie] = (Dsup.transposed() @ Matrix.Rotation(giro, 3, 'Z') @ Dp).to_quaternion()
        return p


class Erguida(Pista):
    """La pista con la cadera `dz` más alta (las piernas, con IK a los mismos tobillos, más estiradas): el
    reposo de UAL dobla las rodillas y los muslos, inclinados, abrían el bajo de la gabardina."""

    def __init__(self, base, dz):
        self.base, self.dz = base, dz

    def pose(self, f, ctx):
        from mathutils import Vector
        p = self.base.pose(f, ctx).copia()
        p.cad = p.cad + Vector((0.0, 0.0, self.dz * ctx.sk.esc))
        return p


class PiesJuntos(Pista):
    """La pista con los pies más juntos (su separación respecto a su punto medio, por `k`): el reposo de UAL
    abre los pies 40 cm de delante a atrás, y con él el bajo de la gabardina se abría en campana."""

    def __init__(self, base, kx, ky):
        self.base, self.kx, self.ky = base, kx, ky

    def pose(self, f, ctx):
        p = self.base.pose(f, ctx).copia()
        lados = list(p.tob)          # 'L'/'R' en la forja, 'l'/'r' en MetaHuman
        m = (p.tob[lados[0]] + p.tob[lados[1]]) * 0.5
        for S in lados:
            d = p.tob[S] - m
            d.x *= self.kx
            d.y *= self.ky
            d.z = p.tob[S].z - m.z
            p.tob[S] = m + d
        return p


class PiesRectos(Pista):
    """LOS PIES MENOS ABIERTOS. El reposo de UAL abre el pie derecho 44° y la guardia el de atrás más de 45°; con la
    rodilla sobre su bisagra (que va hacia la punta del pie), el muslo giraba 63° hacia fuera y su malla (el glúteo, el
    muslo por dentro) atravesaba el faldón de la gabardina en toda la guardia. Cada pie gira sobre el tobillo, en el
    suelo, hasta como mucho `grados` de la dirección de la cadera (la forja: 14° en el reposo, 40° el de atrás en la
    guardia)."""

    def __init__(self, base, grados):
        self.base, self.grados = base, grados

    def pose(self, f, ctx):
        from mathutils import Matrix, Vector
        p = self.base.pose(f, ctx).copia()
        cfg = ctx.destino.cfg
        cad = cfg['cadera']
        Dc = p.q[cad].to_matrix()
        fwd = Dc @ Vector((0.0, -1.0, 0.0))
        rumbo_c = math.atan2(fwd.x, -fwd.y)
        for S in cfg['lados']:
            muslo, pierna, pie, _ = cfg['piernas'][S]
            tob0, tal0, bol0 = ctx.destino.pie[S]
            Dsup = Dc @ p.q[muslo].to_matrix() @ p.q[pierna].to_matrix()
            Dp = Dsup @ p.q[pie].to_matrix()
            d = Dp @ (bol0 - tal0)
            a = _angulo(math.atan2(d.x, -d.y) - rumbo_c)
            lim = math.radians(self.grados)
            if abs(a) > lim:
                Rz = Matrix.Rotation(-(a - math.copysign(lim, a)), 3, 'Z')
                p.q[pie] = (Dsup.transposed() @ Rz @ Dp).to_quaternion()
        return p


class RodillasAdelante(Pista):
    """LAS RODILLAS HACIA DELANTE. La guardia de UAL abre la rodilla de atrás 65° hacia fuera (piernas arqueadas de
    boxeo): el muslo, girado así, metía el glúteo y la cara interna en el faldón de la gabardina todos los fotogramas
    (la batería: 92 pares de triángulos, del 0 al 100 %). Cada pierna gira alrededor de la recta cadera-tobillo (el
    tobillo y el giro del pie en el mundo no se mueven) hasta que la rodilla quede, como mucho, a `grados` de la
    dirección de la cadera."""

    def __init__(self, base, grados):
        self.base, self.grados = base, grados

    def pose(self, f, ctx):
        from mathutils import Matrix, Vector
        p = self.base.pose(f, ctx).copia()
        sk = ctx.sk
        cfg = ctx.destino.cfg
        cad = cfg['cadera']
        for S in cfg['lados']:
            muslo, pierna, pie, _ = cfg['piernas'][S]
            D, h = fk(sk, p, (pie,), cad)
            H, K, A = h[muslo], h[pierna], h[pie]
            u = A - H
            if u.length < 1e-6:
                continue
            u.normalize()
            v = (K - H) - u * (K - H).dot(u)
            fwd = D[cad] @ Vector((0.0, -1.0, 0.0))
            fwd = fwd - u * fwd.dot(u)
            if v.length < 0.02 or fwd.length < 1e-6:
                continue
            a = math.atan2(u.dot(fwd.normalized().cross(v.normalized())), fwd.normalized().dot(v.normalized()))
            lim = math.radians(self.grados)
            if abs(a) <= lim:
                continue
            R = Matrix.Rotation(-(a - math.copysign(lim, a)), 3, u)
            par = sk.parent[muslo]
            Dpie = D[pie]
            p.q[muslo] = (D[par].transposed() @ R @ D[muslo]).to_quaternion()
            Dsup = R @ D[pierna]
            p.q[pie] = (Dsup.transposed() @ Dpie).to_quaternion()
        return p


class Respira(Pista):
    """La base con una respiración: el pecho y la columna se abren y cierran (grados, periodo en
    fotogramas). Para los bucles tumbados, donde la respiración de pie de la fuente no sirve."""

    def __init__(self, base, periodo, grados=1.6):
        self.base, self.periodo, self.grados = base, periodo, grados

    def pose(self, f, ctx):
        from mathutils import Quaternion
        p = self.base.pose(f, ctx).copia()
        s = math.sin(2 * math.pi * f / self.periodo)
        for b, k in (('columna1', 0.5), ('pecho', 1.0), ('cuello', -0.6)):
            if b in p.q:
                p.q[b] = p.q[b] @ Quaternion((1.0, 0.0, 0.0), math.radians(-self.grados * k * s))
        return p


def _mitad_de_los_pies(p):
    return (p.tob['L'] + p.tob['R']) * 0.5


class ConGuardia(Pista):
    """UN CLIP DE LA FORJA CON LA GUARDIA DE LA CAPTURA EN SUS EXTREMOS. Los golpes, quiebros y encajes de la
    forja empiezan y acaban en su guardia; los de la captura, en la de UAL. Para que la Tanda empalme
    (Entrada, Seguida, Seguida, Cierre: se funden en 60 ms) todos acaban en la MISMA: a la pose de la forja
    se le suma, hueso a hueso, lo que va de su primer fotograma a la guardia de la captura, entero en el
    0 y desvaneciéndose en `entra` fotogramas; y lo mismo al final (con la guardia llevada adonde acaba el
    clip). En medio, la forja pura: el golpe, su impacto y su alcance no se tocan."""

    def __init__(self, nombre, n, ini=True, fin=True, entra=4, sale=6, desde=None):
        self.nombre, self.n, self.ini, self.fin, self.entra, self.sale = nombre, n, ini, fin, entra, sale
        self.desde = desde            # otra pose de partida en vez de la guardia (salir: el final de descolgar)
        self._pies = {}

    def _guardias(self, ctx):
        A0 = ctx.forja_pose(self.nombre, 0.0)
        AN = ctx.forja_pose(self.nombre, float(self.n))
        G = GUARDIA.pose(0.0, ctx)
        G0 = G if self.desde is None else self.desde.pose(0.0, ctx)
        # la guardia del final, desplazada lo que la forja se desplaza de su principio a su final (la raíz del
        # juego en los quiebros y la Entrada; nada en los golpes en el sitio)
        d = _mitad_de_los_pies(AN) - _mitad_de_los_pies(A0)
        d.z = 0.0
        return A0, G0, AN, G.desplazada(d)

    def _correccion_de_los_pies(self, ctx):
        """LOS PIES NO SE ARRASTRAN NI GIRAN HASTA LA GUARDIA NUEVA. Un pie apoyado en la forja se queda donde y
        como lo pone la guardia de la captura mientras siga apoyado: al pie de la forja se le aplica, entero, el
        giro y el desplazamiento que lo llevan de su guardia a la de la captura (el primer apoyo, con los del
        principio; el último, con los del final; los de en medio, sin corregir), así que si en la forja el pie
        pivota sobre la bola al despegar, pivota igual en su sitio nuevo. Por el aire, la corrección
        se desvanece en unos fotogramas (en medio del vuelo, el pie de la forja). Desvanecerla en el suelo hacía patinar el pie a 1-2 m/s en el primer fotograma de
        cada quiebro. Devuelve por pie y fotograma (giro en el mundo, tobillo corregido)."""
        from mathutils import Matrix, Quaternion, Vector
        clave = id(ctx)
        if clave in self._pies:
            return self._pies[clave]
        sk = ctx.sk
        A0, G, AN, GN = self._guardias(ctx)
        n = self.n
        A = [ctx.forja_pose(self.nombre, float(f)) for f in range(n + 1)]
        RA = [_resolver(sk, a) for a in A]
        RG = _resolver(sk, G)
        RGN = _resolver(sk, GN)
        out = {}
        for S in 'LR':
            pts = []
            for r in RA:
                H, B = _puntos_del_pie(sk, r, S)
                pts.append(H if H.z < B.z else B)
            apoyo = []
            for f in range(n + 1):
                a, b = pts[max(0, f - 1)], pts[min(n, f + 1)]
                v = math.hypot(b.x - a.x, b.y - a.y) * FPS / max(1, min(n, f + 1) - max(0, f - 1))
                apoyo.append(pts[f].z < 0.025 and v < 0.3)
            # el primer apoyo y el último, enteros mientras el pie siga en el suelo (aunque la forja lo deslice
            # al asentarse en su guardia: eso lo quita luego `clavar_pies`); los de en medio, quietos
            bajo = [pts[f].z < 0.025 for f in range(n + 1)]
            a = 0
            while a < n and bajo[a + 1] and bajo[0]:
                a += 1
            b = n
            while b > 0 and bajo[b - 1] and bajo[n]:
                b -= 1
            tramos = []
            if bajo[0]:
                tramos.append((0, a, 'ini'))
            # los de en medio, desde que el pie toca el suelo (aunque aún llegue deprisa: en el fotograma en que
            # se posa la corrección ya tiene que estar hecha) mientras siga en él
            tramos += [(i0, i1, 'medio') for i0, i1 in _tramos_de(bajo) if i0 > a and i1 < b and any(apoyo[i0:i1 + 1])]
            if bajo[n] and b > a:
                tramos.append((b, n, 'fin'))
            O = [r[3]['pie_' + S] for r in RA]
            I3 = Matrix.Identity(3)
            dO_ini = RG[3]['pie_' + S] @ O[0].transposed() if self.ini else I3
            dO_fin = RGN[3]['pie_' + S] @ O[n].transposed() if self.fin else I3
            giro, desv = {}, {}
            for i0, i1, cual in tramos:
                for f in range(i0, i1 + 1):
                    if cual == 'ini':
                        g = dO_ini
                        t_ = (G.tob[S] if self.ini else A[0].tob[S]) + g @ (A[f].tob[S] - A[0].tob[S])
                    elif cual == 'fin':
                        g = dO_fin
                        t_ = (GN.tob[S] if self.fin else A[n].tob[S]) + g @ (A[f].tob[S] - A[n].tob[S])
                    else:
                        g = I3
                        t_ = A[f].tob[S]
                    giro[f] = g.to_quaternion()
                    desv[f] = t_ - A[f].tob[S]
            if 0 not in giro:
                giro[0], desv[0] = dO_ini.to_quaternion(), ((G.tob[S] - A0.tob[S]) if self.ini else Vector((0, 0, 0)))
            if n not in giro:
                giro[n], desv[n] = dO_fin.to_quaternion(), ((GN.tob[S] - AN.tob[S]) if self.fin else Vector((0, 0, 0)))
            claves = sorted(giro)
            serie = []
            for f in range(n + 1):
                if f in giro:
                    q, d = giro[f], desv[f]
                else:
                    # por el aire, la corrección de cada apoyo se desvanece en `self.entra` fotogramas: en medio del
                    # vuelo el pie es el de la forja (la patada del Cierre llegaba 10 cm menos con la corrección de la
                    # guardia arrastrada todo el vuelo)
                    ka = max(k for k in claves if k < f)
                    kb = min(k for k in claves if k > f)
                    wa = 1.0 - suave((f - ka) / float(self.entra))
                    wb = 1.0 - suave((kb - f) / float(self.entra))
                    s_ = wa + wb
                    if s_ > 1.0:
                        wa, wb = wa / s_, wb / s_
                    I = Quaternion()
                    q = I.slerp(giro[ka], wa) @ I.slerp(giro[kb], wb)
                    d = desv[ka] * wa + desv[kb] * wb
                serie.append((q.to_matrix() @ O[f], A[f].tob[S] + d))
            out[S] = serie
        self._pies[clave] = out
        return out

    def pose(self, f, ctx):
        from mathutils import Matrix, Quaternion
        A = ctx.forja_pose(self.nombre, f)
        r = A.copia()
        I = Quaternion()
        A0, G, AN, GN = self._guardias(ctx)
        extremos = []
        if self.ini:
            extremos.append((1.0 - suave(f / float(self.entra)), A0, G))
        if self.fin:
            extremos.append((suave((f - (self.n - self.sale)) / float(self.sale)), AN, GN))
        pies_y_puntas = ('pie_L', 'pie_R', 'punta_L', 'punta_R')
        for w, Ax, Gx in extremos:
            if w <= 0:
                continue
            for b in r.q:
                if b in Ax.q and b in Gx.q and b not in pies_y_puntas:
                    r.q[b] = r.q[b] @ I.slerp(Ax.q[b].inverted() @ Gx.q[b], w)
            r.cad = r.cad + (Gx.cad - Ax.cad) * w
            for S in r.mun:
                r.mun[S] = r.mun[S] + (Gx.mun[S] - Ax.mun[S]) * w
        # los pies: su giro en el mundo y su tobillo, los de `_correccion_de_los_pies` (la IK de la pierna
        # conserva el giro del pie en el mundo: se escribe en local sobre la pierna en FK de esta pose)
        pies = self._correccion_de_los_pies(ctx)
        k = min(int(round(f)), self.n)
        I3 = Matrix.Identity(3)
        D = r.q['caderas'].to_matrix() if 'caderas' in r.q else I3
        for S in 'LR':
            Dp = D @ r.q['muslo_' + S].to_matrix() @ r.q['pierna_' + S].to_matrix()
            O, t_ = pies[S][k]
            r.q['pie_' + S] = (Dp.transposed() @ O).to_quaternion()
            r.tob[S] = t_.copy()
        return r


# ------------------------------------------------------------------ de las poses al horneado
def a_forja(sk, pose):
    """La `Pose` como el diccionario que hornea animacion (el camino `_fk` del solucionador): las piernas con
    IK a los tobillos (la pasada de suelo sube el que se hunda), los brazos en FK salvo lo que diga `extra`."""
    e = sk.esc
    p = {'_fk': {b: q.to_matrix() for b, q in pose.q.items()},
         'cad': tuple((pose.cad - sk.head['caderas']) / e), 'desp': (0.0, 0.0, 0.0),
         'ikp_L': 1.0, 'ikp_R': 1.0, 'pie_L': tuple(pose.tob['L'] / e), 'pie_R': tuple(pose.tob['R'] / e),
         'ikb_L': 0.0, 'ikb_R': 0.0, 'mano_L': tuple(pose.mun['L'] / e), 'mano_R': tuple(pose.mun['R'] / e)}
    # ═══ LA MANO APOYADA VA CON IK ═══ Tumbado, sentado o a gatas, la mano en el suelo va con IK al sitio donde
    # la apoya la fuente (a escala): así la pasada de suelo sube la mano que se hunde y no el cuerpo entero (con
    # la mano en FK, una muñeca 2 cm bajo el suelo levantaba la espalda y el cuerpo tumbado flotaba).
    muneca = None
    for S in 'LR':
        if 'ikb_' + S in pose.extra:
            continue
        if muneca is None:
            muneca = _munecas_fk(sk, pose)
        z = muneca[S].z
        if z < 0.25:
            p['ikb_' + S] = 1.0 if z < 0.15 else (0.25 - z) / 0.1
            p['mano_' + S] = tuple(muneca[S] / e)
    p.update(pose.extra)
    return p


def _munecas_fk(sk, pose):
    """Las muñecas de la pose en FK (sin resolver lo demás): el sitio al que va la IK de la mano apoyada, que
    así no mueve el brazo; sólo deja que la pasada de suelo la levante si se hunde."""
    from mathutils import Matrix
    I3 = Matrix.Identity(3)
    D = {'caderas': pose.q['caderas'].to_matrix() if 'caderas' in pose.q else I3}
    head = {'caderas': pose.cad}
    out = {}
    for S in 'LR':
        for b in ('columna', 'columna1', 'pecho', 'hombro_' + S, 'brazo_' + S, 'antebrazo_' + S, 'mano_' + S):
            if b in D:
                continue
            par = sk.parent[b]
            D[b] = D[par] @ (pose.q[b].to_matrix() if b in pose.q else I3)
            head[b] = head[par] + D[par] @ (sk.head[b] - sk.head[par])
        out[S] = head['mano_' + S]
    return out


def _resolver(sk, pose):
    import animacion
    return animacion.resolver(sk, a_forja(sk, pose))


def _puntos_del_pie(sk, res, S):
    D, head = res[3], res[4]
    A = head['pie_' + S]
    Dp = D['pie_' + S]
    return A + Dp @ (sk.talon[S] - sk.tobillo[S]), A + Dp @ (sk.bola[S] - sk.tobillo[S])


def _rumbo(v):
    return math.atan2(v.x, -v.y)


def _angulo(a):
    return (a + math.pi) % (2 * math.pi) - math.pi


def clavar_pies(sk, poses, alto=0.03, rapido=0.4, borde=2, solo_extremos=False):
    """EL PIE QUE APOYA NO SE MUEVE. Por pie, los tramos en que el talón o la bola están a menos de `alto` del
    suelo y quietos (menos de `rapido` m/s). En cada tramo el pie deja de GIRAR sobre el suelo (su rumbo se
    fija: una guardia que se funde con otra giraba el pie clavado y la punta barría el suelo a 2-3 m/s) y el
    punto que apoya (talón, bola o los dos) deja de MOVERSE; las dos cosas alrededor de ese punto. El rumbo
    y el sitio fijos son los del primer fotograma si el tramo empieza el clip, los del último si lo acaba (el
    clip sigue empezando y acabando en la pose de la guardia) y la media si no. En los `borde` fotogramas de
    alrededor la corrección se desvanece. Y lo que se arrastra, se levanta (abajo)."""
    from mathutils import Matrix, Vector
    n = len(poses)
    if n < 3:
        return poses
    res = [_resolver(sk, p) for p in poses]
    for S in 'LR':
        H, B = zip(*[_puntos_del_pie(sk, r, S) for r in res])
        Dp = [r[3]['pie_' + S] for r in res]
        rumbo = [_rumbo(D @ (sk.bola[S] - sk.talon[S])) for D in Dp]

        def vel(P, i):
            a, b = P[max(0, i - 1)], P[min(n - 1, i + 1)]
            return math.hypot(b.x - a.x, b.y - a.y) * FPS / max(1, min(n - 1, i + 1) - max(0, i - 1))
        # quieto es que el MEDIO del pie no se traslade (un pie que gira sobre el suelo mueve la punta deprisa y
        # sigue apoyado: ése es el que hay que clavar, no el que hay que dejar)
        M = [(H[i] + B[i]) * 0.5 for i in range(n)]
        quieto = [vel(M, i) < rapido for i in range(n)]
        aH = [H[i].z < alto and quieto[i] for i in range(n)]
        aB = [B[i].z < alto and quieto[i] for i in range(n)]
        tramos = [t for t in _tramos_de([x or y for x, y in zip(aH, aB)]) if t[1] > t[0]]
        if solo_extremos:
            # la forja con la guardia de la captura: lo de en medio es de la forja, que ya apoya (y pivota) los pies
            # a su manera; se clavan sólo los fotogramas en que se funde con la guardia (los 5 primeros, los 7
            # últimos). Clavado entero, el pie de apoyo del Cierre dejaba de pivotar y la patada llegaba 10 cm menos.
            tramos = [(t[0], min(t[1], 5)) if t[0] == 0 else (max(t[0], n - 8), t[1]) for t in tramos
                      if t[0] == 0 or t[1] == n - 1]
            tramos = [t for t in tramos if t[1] > t[0]]
        giro = [0.0] * n                      # cuánto se gira el pie (rad) alrededor de su punto de apoyo
        corr = [Vector((0.0, 0.0, 0.0)) for _ in range(n)]
        pivote = [None] * n
        peso = [0.0] * n
        for i0, i1 in tramos:
            L = i1 - i0 + 1
            nh, nb = sum(aH[i0:i1 + 1]), sum(aB[i0:i1 + 1])
            if nh >= 0.6 * L and nb >= 0.6 * L:
                P = [(H[i] + B[i]) * 0.5 for i in range(n)]
            elif nb >= nh:
                P = B
            else:
                P = H
            if i0 == 0:
                ref = [0]
            elif i1 == n - 1:
                ref = [n - 1]
            else:
                ref = list(range(i0, i1 + 1))
            r0 = rumbo[ref[0]]
            r_ref = r0 + sum(_angulo(rumbo[i] - r0) for i in ref) / len(ref)
            fx = sum(P[i].x for i in ref) / len(ref)
            fy = sum(P[i].y for i in ref) / len(ref)
            for i in range(i0, i1 + 1):
                giro[i] = _angulo(r_ref - rumbo[i])
                corr[i] = Vector((fx - P[i].x, fy - P[i].y, 0.0))
                pivote[i] = P[i]
                peso[i] = 1.0
            for k in range(1, borde + 1):
                w = 1.0 - k / (borde + 1.0)
                for i, e in ((i0 - k, i0), (i1 + k, i1)):
                    if 0 <= i < n and peso[i] < w:
                        giro[i] = giro[e] * w
                        corr[i] = corr[e] * w
                        pivote[i] = P[i]
                        peso[i] = w
        # el pie ya corregido (tobillo y giro): donde queda de verdad, para ver lo que se arrastra
        tob = []
        Dn = []
        for i in range(n):
            p = poses[i]
            t_ = p.tob[S].copy()
            D_ = Dp[i]
            if peso[i] > 0 and pivote[i] is not None:
                if abs(giro[i]) > 1e-5:
                    Rz = Matrix.Rotation(giro[i], 3, 'Z')
                    t_ = pivote[i] + Rz @ (t_ - pivote[i])
                    D_ = Rz @ D_
                t_ = t_ + corr[i]
            tob.append(t_)
            Dn.append(D_)
        Hn = [tob[i] + Dn[i] @ (sk.talon[S] - sk.tobillo[S]) for i in range(n)]
        Bn = [tob[i] + Dn[i] @ (sk.bola[S] - sk.tobillo[S]) for i in range(n)]
        # ═══ EL PIE QUE SE ARRASTRA SE LEVANTA (segunda pasada) ═══ La captura arrastra a veces el pie por el
        # suelo (al recoger las piernas para levantarse, al volver del gancho) y comprimida en el tiempo va a 1-3
        # m/s: pegado al suelo eso es patinar. Y en los bordes de un tramo clavado, lo que la corrección devuelve
        # adonde la captura lo tiene también se desliza. Donde un pie YA CORREGIDO roza el suelo (a menos de 5 cm) y
        # se mueve a más de 0,35 m/s (la primera pasada: 0,7, y entre 0,4 y 0,7 el pie ni se clavaba ni se levantaba:
        # la revisión midió el gancho del Prestado patinando a 1,18 m/s), se levanta hasta 5 cm del suelo en
        # proporción a la velocidad, con rampas suaves: un paso corto en vez de un arrastre.
        alza = [0.0] * n
        roza = 0.05              # la suela de las figuras baja 1-2 cm del talón y la bola: a 5 cm ya roza
        bajo = [min(Hn[i].z, Bn[i].z) < roza for i in range(n)]
        for i in range(n - 1):
            # arrastrarse es seguir en el suelo en este fotograma y en el siguiente moviéndose (posarse deprisa
            # también: se posa un fotograma más tarde, ya frenado); despegar, no: el siguiente ya está en el aire
            if not (bajo[i] and bajo[i + 1]) or (peso[i] >= 1.0 and peso[i + 1] >= 1.0):
                continue
            # la velocidad del punto que roza más despacio: un pie que pivota sobre la bola (el talón sube
            # deprisa) no se arrastra; uno que se arrastra mueve todo lo que toca
            vs = [math.hypot(P[i + 1].x - P[i].x, P[i + 1].y - P[i].y) * FPS for P in (Hn, Bn)
                  if P[i].z < roza and P[i + 1].z < roza]
            v = min(vs) if vs else 0.0
            if v >= 0.35:
                a_ = min(1.0, (v - 0.35) / 0.4) * roza
                for j in (i, i + 1):
                    if peso[j] < 1.0:
                        alza[j] = max(alza[j], a_)
        suav = alza
        for _ in range(2):
            suav = [0.25 * suav[max(0, i - 1)] + 0.5 * suav[i] + 0.25 * suav[min(n - 1, i + 1)] for i in range(n)]
        alza = [max(a, b) for a, b in zip(alza, suav)]
        alza[0] = alza[n - 1] = 0.0           # el primer y el último fotograma, los de la guardia: ni un milímetro
        for i in range(n):
            p = poses[i]
            if peso[i] > 0 and pivote[i] is not None and abs(giro[i]) > 1e-5:
                qm = p.q['pie_' + S].to_matrix()
                Dpierna = Dp[i] @ qm.transposed()
                p.q['pie_' + S] = (Dpierna.transposed() @ Dn[i]).to_quaternion()
            p.tob[S] = tob[i]
            if alza[i] > 1e-4:
                # a `alza` del SUELO lo más bajo del pie (la captura a escala a veces lo hunde un par de cm)
                sube = max(0.0, alza[i] - min(Hn[i].z, Bn[i].z))
                p.tob[S] = p.tob[S] + Vector((0.0, 0.0, sube))
    return poses


def abrir_brazos(sk, poses, grados=7.0):
    """LOS BRAZOS QUE CUELGAN, UN POCO MÁS ABIERTOS. El maniquí de UAL es delgado y la forja viste abrigos: con
    los brazos de la captura, colgando, el antebrazo se metía en el costado de la Mole y del Celador ancho
    (y tumbado, en el torso). Se abre el brazo hacia fuera `grados` alrededor del eje de delante del pecho,
    en proporción a lo que cuelga (nada con el brazo delante o arriba: los golpes y la guardia no cambian)."""
    from mathutils import Quaternion, Vector
    for p in poses:
        res = _resolver(sk, p)
        D, head = res[3], res[4]
        abajo = -(D['pecho'] @ Vector((0.0, 0.0, 1.0)))
        eje = D['pecho'] @ Vector((0.0, 1.0, 0.0))
        for S, sg in (('L', -1.0), ('R', 1.0)):
            d = (head['antebrazo_' + S] - head['brazo_' + S]).normalized()
            s = suave((d.dot(abajo) - 0.35) / 0.45)
            if s <= 0.0:
                continue
            Rw = Quaternion(eje, math.radians(grados * s * sg)).to_matrix()
            Dh = D['hombro_' + S]
            # sobre el brazo de la FK (el de la pose), no sobre el resuelto: la bisagra del codo le cambia el giro
            # al húmero, y escribir ése con el antebrazo de la FK colgando de él lo desencajaba 20 cm
            p.q['brazo_' + S] = (Dh.transposed() @ Rw @ Dh @ p.q['brazo_' + S].to_matrix()).to_quaternion()
    return poses


def mano_con_la_cabeza(sk, poses, S, desde_cabeza, orm, dedos):
    """La mano S, con IK, a un sitio fijo respecto a la cabeza y con la muñeca en un marco del mundo (el
    paraguas: vertical y sobre la cabeza, ande como ande el cuerpo de la captura)."""
    from mathutils import Vector
    e = sk.esc
    for p in poses:
        res = _resolver(sk, p)
        T = res[4]['cabeza'] + Vector(desde_cabeza) * e
        p.extra.update({'ikb_' + S: 1.0, 'mano_' + S: tuple(T / e), 'orm_' + S: orm, '_dedos_' + S: True,
                        'ded_' + S: dedos[:2], 'pul_' + S: dedos[2]})
    return poses


# ------------------------------------------------------------------ FK de la pose y la muñeca movida en los giros locales
def fk(sk, pose, huesos, cadera='caderas'):
    """FK de la pose (sin IK): (D, head) de `huesos` y de sus antepasados. La cadera es la de la pose."""
    from mathutils import Matrix
    I3 = Matrix.Identity(3)
    D, head = {}, {}

    def uno(b):
        if b in D:
            return
        if b == cadera:
            D[b] = pose.q[b].to_matrix() if b in pose.q else I3
            head[b] = pose.cad.copy()
            return
        par = sk.parent[b]
        if par is None:
            D[b] = I3
            head[b] = sk.head[b].copy()
            return
        uno(par)
        D[b] = D[par] @ (pose.q[b].to_matrix() if b in pose.q else I3)
        head[b] = head[par] + D[par] @ (sk.head[b] - sk.head[par])
    for b in huesos:
        uno(b)
    return D, head


def mover_muneca(sk, cfg, pose, S, T):
    """Lleva la muñeca del lado S a T con la IK de bisagra (animacion._ik_bisagra: el codo dobla sobre su eje) desde
    la FK de la pose, y lo ESCRIBE en sus giros locales: el brazo y el antebrazo nuevos y la mano con el mismo giro
    en el mundo. Así lo que venga después (mezclas, capas aditivas, fundidos) trabaja sobre la pose ya movida."""
    import animacion
    hom, bra, ant, man, _ = cfg['brazos'][S]
    D, head = fk(sk, pose, (man,), cfg['cadera'])
    Dm = D[man]
    l1 = (sk.head[ant] - sk.head[bra]).length
    l2 = (sk.head[man] - sk.head[ant]).length
    _, _, n0, _, _ = animacion.bisagra_de_reposo(sk, bra, ant, man, animacion.ADELANTE)
    animacion._ik_bisagra(sk, D, head, bra, ant, man, T, animacion.ADELANTE, l1, l2, D[bra] @ n0, flex_max=animacion.CODO_MAX)
    pose.q[bra] = (D[hom].transposed() @ D[bra]).to_quaternion()
    pose.q[ant] = (D[bra].transposed() @ D[ant]).to_quaternion()
    pose.q[man] = (D[ant].transposed() @ Dm).to_quaternion()


def _lado(cfg, S):
    """'L'/'R' (el lado de la forja) en los nombres del destino ('l'/'r' en MetaHuman)."""
    return cfg['lados'][0] if S in ('L', 'l') else cfg['lados'][1]


_CTXS = {}


def ctx_de(sk, destino='forja', forja=None, clips=None):
    """Un Ctx por esqueleto y destino, vivo mientras viva el módulo: las pistas guardan cosas por contexto, y un
    contexto que se tira deja su id libre para otro (de otro sexo)."""
    k = (id(sk), destino)
    if k not in _CTXS:
        _CTXS[k] = Ctx(sk, FORJA if forja is None else forja, clips if clips is not None else _CLIPS_REGISTRADOS, destino)
    return _CTXS[k]


def _clave(ctx):
    return (id(ctx.sk), ctx.destino_nombre)


class PunoAdelante(Pista):
    """LA GUARDIA CON EL PUÑO DE DELANTE A LA ALTURA DEL PÓMULO. La de UAL lleva el puño de delante bajo la barbilla,
    tocando la mandíbula (la revisión); la de la forja lo tenía a la altura del pómulo y 30 cm por delante de la
    cara. `d` (m, en el mundo: -Y es hacia el rival) con peso `peso` (número, claves o función del fotograma)."""

    def __init__(self, pista, S, d, peso=1.0):
        self.pista, self.S, self.d, self.peso = pista, S, d, peso

    def pose(self, f, ctx):
        from mathutils import Vector
        p = self.pista.pose(f, ctx).copia()
        w = _peso(self.peso, f)
        cfg = ctx.destino.cfg
        S = _lado(cfg, self.S)
        man = cfg['brazos'][S][3]
        if w <= 1e-4 or man not in ctx.sk.head:
            return p
        _, head = fk(ctx.sk, p, (man,), cfg['cadera'])
        mover_muneca(ctx.sk, cfg, p, S, head[man] + Vector(self.d) * getattr(ctx.sk, 'esc', 1.0) * w)
        return p


class Abierta(Pista):
    """La pista con los brazos que cuelgan abiertos `grados` (`abrir_brazos`), en la pista y no después: para lo que
    se funde con una pose que ya los lleva abiertos (el final de la caída)."""

    def __init__(self, pista, grados):
        self.pista, self.grados = pista, grados

    def pose(self, f, ctx):
        p = self.pista.pose(f, ctx).copia()
        return abrir_brazos(ctx.sk, [p], self.grados)[0]


class FinalDe(Pista):
    """La ÚLTIMA pose ya procesada (pies clavados, brazos abiertos...) de otra receta, llevada con la cadera a `a`
    (None: donde esté). Así el desconectado y el levantarse empiezan exactamente donde acaba la caída, y salir
    donde acaba descolgar (la revisión midió 14 cm de salto en la cabeza y 40 cm en la mano)."""

    def __init__(self, nombre, a=(0.0, 0.0)):
        self.nombre, self.a = nombre, a

    def pose(self, f, ctx):
        from mathutils import Vector
        p = procesadas(self.nombre, ctx.sk)[-1].copia()
        p.extra = {k: v for k, v in p.extra.items() if not k.startswith(SEGUIDOS)}
        if self.a is not None:
            p = p.desplazada(Vector((self.a[0] - p.cad.x, self.a[1] - p.cad.y, 0.0)))
        return p


def procesadas(nombre, sk):
    """Las poses ya procesadas de la receta `nombre` para el esqueleto `sk` (se hacen si hace falta)."""
    import animacion
    fn = animacion.CLIPS[nombre]['fn']
    if not isinstance(fn, _Capturado):
        raise RuntimeError('captura: %s no es una receta de captura' % nombre)
    return fn.procesar(sk)


def _ciclico_mas_largo(marcas):
    """(inicio, largo) del tramo True más largo de una lista CÍCLICA."""
    n = len(marcas)
    if all(marcas):
        return 0, n
    if not any(marcas):
        return 0, 0
    k = marcas.index(False)
    mejor = (0, 0)
    i = 0
    while i < n:
        j = (k + i) % n
        if marcas[j]:
            largo = 0
            while largo < n and marcas[(j + largo) % n]:
                largo += 1
            if largo > mejor[1]:
                mejor = (j, largo)
            i += largo
        else:
            i += 1
    return mejor


def _suavizar_ciclico(x, sigma):
    n = len(x)
    r = max(1, int(3 * sigma))
    k = [math.exp(-0.5 * (i / sigma) ** 2) for i in range(-r, r + 1)]
    s = sum(k)
    return [sum(k[i + r] * x[(f + i) % n] for i in range(-r, r + 1)) / s for f in range(n)]


class Marcha(Pista):
    """LA MARCHA DE LA CAPTURA A LA CADENCIA DE UNA PERSONA (segunda pasada). La primera estiraba el tiempo del ciclo
    para cuadrar la velocidad: el trote salía a 106 pasos por minuto con pasos de 2,8 m y la cadera botando 24 cm
    (saltos en la Luna), y el andar era el paso ceremonioso de Walk_Formal a 1,7x con los brazos muertos y cojeando.
    Ahora el ciclo es el de una persona a esa velocidad (`ciclo`, en fotogramas) y lo que se ajusta es la ZANCADA,
    con la IK de los tobillos (lo que hace la deformación de zancada de un motor):

      · SIMÉTRICA: el medio ciclo de un pie es el espejo del otro (la captura cojeaba: el andar formal apoyaba el
        izquierdo el 71 % del ciclo y el derecho el 62).
      · EL APOYO (carrera y trote, `apoyo`): el trote de UAL apoya cada pie el 14 % del ciclo y vuela el 71 %; aquí
        cada pie se retiempla por su cuenta (su tramo de apoyo estirado hasta `apoyo` del ciclo y el vuelo encogido,
        con la forma de la pierna de la captura) y el tobillo apoyado va hacia atrás en línea recta a la velocidad
        del juego (la bola cae a `adelante` del recorrido por delante de la cadera). En la marcha a pie la
        velocidad se pone escalando lo que el tobillo se aparta de la cadera (`zancada`, medida).
      · LA CADERA: baja lo justo para que la pierna llegue al pie apoyado y el bote se queda en `bote` (m).
      · LOS BRAZOS: su vaivén alrededor del medio, por `brazos` (el andar de UAL, 37 cm; una persona a 2 m/s, 50-60).
      · EL PIE QUE SE VA NO ARRASTRA LA PUNTA: fuera del apoyo la suela sube a 2 cm enseguida (la revisión: la punta
        del pie derecho de pasear retrocedía a 0,1-0,5 m/s cinco fotogramas por ciclo)."""

    def __init__(self, clave, ciclo, v, apoyo=None, bote=None, brazos=1.0, adelante=0.4, simetrica=True):
        self.clave, self.ciclo, self.v, self.apoyo, self.bote = clave, ciclo, v, apoyo, bote
        self.brazos, self.adelante, self.simetrica = brazos, adelante, simetrica
        self._hecho = {}

    def pose(self, f, ctx):
        k = _clave(ctx)
        if k not in self._hecho:
            self._hecho[k] = self._hacer(ctx)
        return self._hecho[k][int(round(f)) % self.ciclo].copia()

    def _fuente(self, ctx, fase):
        c = ClipFuente.de(self.clave)
        dq, pos = c.muestra((fase % 1.0) * c.dur, bucle=True)
        p = ctx.destino.pose(dq, pos)
        if self.simetrica:
            dq, pos = c.muestra(((fase + 0.5) % 1.0) * c.dur, bucle=True, espejo=True)
            p = mezclar(p, ctx.destino.pose(dq, pos), 0.5)
        return p

    def _hacer(self, ctx):
        from mathutils import Vector
        sk, des = ctx.sk, ctx.destino
        cfg = des.cfg
        N = self.ciclo
        esc = getattr(sk, 'esc', 1.0)
        v = self.v * esc
        cad_b = cfg['cadera']
        lados = cfg['lados']
        base = [self._fuente(ctx, f / float(N)) for f in range(N)]

        def d_pie(p, S):
            muslo, pierna, pie, _ = cfg['piernas'][S]
            return (p.q[cad_b].to_matrix() @ p.q[muslo].to_matrix() @ p.q[pierna].to_matrix() @ p.q[pie].to_matrix())

        def suela(p, S):
            tob0, tal0, bol0 = des.pie[S]
            Dp = d_pie(p, S)
            return p.tob[S] + Dp @ (tal0 - tob0), p.tob[S] + Dp @ (bol0 - tob0)

        def z_suela(p, S):
            H, B = suela(p, S)
            return min(H.z, B.z)
        suelo = min(z_suela(p, S) for p in base for S in lados)
        apoyo_src = {}
        for S in lados:
            ap = [z_suela(p, S) < suelo + 0.02 for p in base]
            apoyo_src[S] = _ciclico_mas_largo(ap)
        # ═══ LAS PIERNAS, RETEMPLADAS POR PIE (carrera) ═══
        fase_pierna = {S: [None] * N for S in lados}         # (fotograma de la fuente, x dentro del ciclo nuevo)
        Dn = {}
        for S in lados:
            on, Ls = apoyo_src[S]
            if self.apoyo and Ls > 0:
                Dn[S] = self.apoyo * N
                c = on - 0.5 + Ls / 2.0
                ini = c - Dn[S] / 2.0
                for f in range(N):
                    x = (f - ini) % N
                    if x <= Dn[S]:
                        fs = (on - 0.5) + x * Ls / Dn[S]
                    else:
                        fs = (on - 0.5 + Ls) + (x - Dn[S]) * (N - Ls) / (N - Dn[S])
                    fase_pierna[S][f] = (fs, x)
            else:
                Dn[S] = None
                for f in range(N):
                    fase_pierna[S][f] = (float(f), None)
        poses = []
        for f in range(N):
            p = base[f].copia()
            for S in lados:
                fs, _ = fase_pierna[S][f]
                lp = base[f] if abs(fs - f) < 1e-6 else self._fuente(ctx, fs / N)
                muslo, pierna, pie, punta = cfg['piernas'][S]
                for b in (muslo, pierna, punta):
                    if b in lp.q:
                        p.q[b] = lp.q[b].copy()
                # el pie, con el giro EN EL MUNDO de la pierna retemplada (sobre la cadera de este fotograma)
                Dsup = p.q[cad_b].to_matrix() @ p.q[muslo].to_matrix() @ p.q[pierna].to_matrix()
                p.q[pie] = (Dsup.transposed() @ d_pie(lp, S)).to_quaternion()
                p.tob[S] = p.cad + (lp.tob[S] - lp.cad)
            poses.append(p)
        # ═══ EL TOBILLO APOYADO, EN LÍNEA RECTA (carrera) O LA ZANCADA ESCALADA (a pie) ═══
        corre = [S for S in lados if Dn[S] is not None]
        if corre:
            orig = {S: [(p.tob[S].y - p.cad.y, p.tob[S].z) for p in poses] for S in corre}
            escala = 1.0
            for vuelta in range(3):
                for S in corre:
                    on, Ls = apoyo_src[S]
                    Lt = v * Dn[S] / FPS * escala
                    p0 = self._fuente(ctx, (on - 0.5) / N)
                    p1 = self._fuente(ctx, (on - 0.5 + Ls) / N)
                    y_td_src = p0.tob[S].y - p0.cad.y
                    y_to_src = p1.tob[S].y - p1.cad.y
                    y_td = -self.adelante * Lt
                    y_to = (1.0 - self.adelante) * Lt
                    for f in range(N):
                        _, x = fase_pierna[S][f]
                        p = poses[f]
                        y0, z0 = orig[S][f]
                        if x <= Dn[S]:
                            y = y_td + (x / Dn[S]) * Lt
                        else:
                            s_ = suave((x - Dn[S]) / (N - Dn[S]))
                            y = y0 + (1.0 - s_) * (y_to - y_to_src) + s_ * (y_td - y_td_src)
                        p.tob[S] = Vector((p.tob[S].x, p.cad.y + y, z0))
                    # el pie apoyado, EN el suelo: el de la captura apoya un instante con la bola y, retemplado,
                    # quedaba a 3-9 cm casi todo el tramo; lo más bajo del pie baja al suelo todo el apoyo (con el giro
                    # de la captura: la bola, y el talón que sube al despegar). Fuera del apoyo, nada: acercar al suelo
                    # los fotogramas de alrededor los dejaba rozándolo y yendo a la velocidad del vuelo (resbalones)
                    for f in range(N):
                        if fase_pierna[S][f][1] <= Dn[S]:
                            t_ = poses[f].tob[S]
                            poses[f].tob[S] = Vector((t_.x, t_.y, t_.z + suelo - z_suela(poses[f], S)))
                # la velocidad la da el punto que apoya (la bola), no el tobillo: se escala el recorrido hasta que sea v
                vm = _velocidad_del_apoyo(poses, suela, corre, suelo)
                if vm <= 1e-3 or abs(vm - v) < 0.02 * v:
                    break
                escala *= v / vm
        a_pie = [S for S in lados if Dn[S] is None]
        if a_pie:
            # ═══ LA ZANCADA A PIE, MÁS POR DETRÁS QUE POR DELANTE ═══ escalarla igual por delante y por detrás llevaba el
            # talón que llega un 30 % más lejos de la cadera, adonde la pierna no alcanza, y la cadera se hundía 14 cm: el
            # andar agachado. Una persona que alarga el paso lo alarga sobre todo por detrás (el talón despega y la
            # pelvis gira): por delante, como mucho un 8 % más
            orig = {S: [p.tob[S].y - p.cad.y for p in poses] for S in a_pie}
            kd, kt = 1.0, 1.0
            for _ in range(7):
                for f, p in enumerate(poses):
                    for S in a_pie:
                        y = orig[S][f]
                        y = y * (kd if y < 0 else kt)
                        p.tob[S] = Vector((p.tob[S].x, p.cad.y + y, p.tob[S].z))
                vm = _velocidad_del_apoyo(poses, suela, lados, suelo)
                if vm <= 1e-3 or abs(vm - v) < 0.01 * v:
                    break
                k = v / vm
                kd = min(kd * k, 1.08) if k > 1 else kd * k
                kt = kt * k if k > 1 else kt * k
        # ═══ LOS BRAZOS ═══
        if abs(self.brazos - 1.0) > 1e-3:
            for S in lados:
                hom, bra, ant, man, _ = cfg['brazos'][S]
                for b, g in ((bra, self.brazos), (ant, 1.0 + (self.brazos - 1.0) * 0.5)):
                    if b not in poses[0].q:
                        continue
                    m = _media([p.q[b] for p in poses])
                    for p in poses:
                        p.q[b] = m @ _potencia(m.inverted() @ p.q[b], g)
        # ═══ EL APOYO DE CADA FOTOGRAMA (el nuevo) ═══
        apoya = {}
        for S in lados:
            if Dn[S] is not None:
                apoya[S] = [fase_pierna[S][f][1] <= Dn[S] for f in range(N)]
            else:
                # a pie: bajo y yendo hacia atrás con el suelo (la punta que se arrastra hacia delante no apoya)
                zs = [z_suela(p, S) for p in poses]
                ys = []
                for p in poses:
                    H, B = suela(p, S)
                    ys.append((H if H.z < B.z else B).y - p.cad.y)
                apoya[S] = [zs[f] < suelo + 0.012 and (ys[(f + 1) % N] - ys[f]) * FPS > 0.5 * v for f in range(N)]
        # ═══ EL BOTE, ALREDEDOR DE SU MEDIA ═══ (luego la cadera baja donde la pierna no llegue, y si con eso vuelve
        # a botar de más, se bajan los picos: bajar la cadera nunca aleja el pie)
        if self.bote:
            zs = [p.cad.z for p in poses]
            m_ = sum(zs) / N
            tope = self.bote * esc
            if max(zs) - min(zs) > tope:
                k = tope / (max(zs) - min(zs))
                for p in poses:
                    p.cad = Vector((p.cad.x, p.cad.y, m_ + (p.cad.z - m_) * k))
        # ═══ LA CADERA BAJA LO QUE HAGA FALTA PARA LLEGAR AL PIE APOYADO ═══
        for vuelta in range(2):
            falta = []
            for f, p in enumerate(poses):
                m = 0.0
                Dc = p.q[cad_b].to_matrix()
                for S in lados:
                    if not apoya[S][f]:
                        continue
                    muslo = cfg['piernas'][S][0]
                    l1, l2 = des.largos[S]
                    Lmax = 0.975 * (l1 + l2)
                    J = p.cad + Dc @ (sk.head[muslo] - sk.head[cad_b])
                    d = p.tob[S] - J
                    h = math.hypot(d.x, d.y)
                    vz = J.z - p.tob[S].z
                    if h * h + vz * vz > Lmax * Lmax:
                        m = max(m, vz - math.sqrt(max(0.0, Lmax * Lmax - h * h)) if h < Lmax else vz)
                falta.append(m)
            if max(falta) <= 1e-4:
                break
            if vuelta == 0:
                ordenadas = sorted(falta)
                C = ordenadas[int(0.6 * (N - 1))]
                for p in poses:
                    p.cad = p.cad - Vector((0.0, 0.0, C))
                continue
            ancho = [max(falta[(f + i) % N] for i in (-1, 0, 1)) for f in range(N)]
            ancho = _suavizar_ciclico(ancho, 1.2)
            for f, p in enumerate(poses):
                p.cad = p.cad - Vector((0.0, 0.0, max(ancho[f], falta[f])))
        # ═══ EL BOTE, OTRA VEZ ═══ (se bajan los picos)
        if self.bote:
            zs = [p.cad.z for p in poses]
            lo, hi = min(zs), max(zs)
            tope = self.bote * esc
            if hi - lo > tope:
                k = tope / (hi - lo)
                for p in poses:
                    p.cad = Vector((p.cad.x, p.cad.y, lo + (p.cad.z - lo) * k))
        # ═══ EL PIE QUE SE VA, POR ENCIMA DEL SUELO ═══
        for S in lados:
            fuera = [not a for a in apoya[S]]
            on, L = _ciclico_mas_largo(fuera)
            if L == 0:
                continue
            for i in range(L):
                f = (on + i) % N
                u = (i + 0.5) / L
                holgura = 0.02 * esc * suave(min(1.0, u / 0.15)) * suave(min(1.0, (1.0 - u) / 0.15))
                if Dn[S] is not None:
                    holgura = max(holgura, 0.015 * esc)      # corriendo, el pie que se va sale del suelo ya
                z = z_suela(poses[f], S)
                if z < suelo + holgura:
                    t_ = poses[f].tob[S]
                    poses[f].tob[S] = Vector((t_.x, t_.y, t_.z + (suelo + holgura - z)))
        return poses


def _velocidad_del_apoyo(poses, suela, lados, suelo):
    """La velocidad (m/s) con que va hacia atrás, respecto a la cadera, el punto más bajo del pie apoyado (mediana)."""
    n = len(poses)
    vs = []
    for S in lados:
        for f in range(n):
            g = (f + 1) % n
            H0, B0 = suela(poses[f], S)
            H1, B1 = suela(poses[g], S)
            if min(H0.z, B0.z) < suelo + 0.015 and min(H1.z, B1.z) < suelo + 0.015:
                a, b = (H0, H1) if H0.z < B0.z else (B0, B1)
                vs.append(((b.y - poses[g].cad.y) - (a.y - poses[f].cad.y)) * FPS)
    return float(np.median(vs)) if vs else 0.0


# ------------------------------------------------------------------ los golpes, las manos y la cadera
def _campana(f, a, b, c, d):
    """0 antes de a, sube (suave) de a a b, 1 hasta c, baja de c a d, 0 después."""
    if f <= a or f >= d:
        return 0.0
    if f < b:
        return suave((f - a) / float(max(1e-6, b - a)))
    if f <= c:
        return 1.0
    return 1.0 - suave((f - c) / float(max(1e-6, d - c)))


def ajustar_golpe(sk, cfg, poses, g, raiz=None):
    """EL GOLPE LLEGA AL BLANCO, A SU ALTURA, CON CARGA Y CON CHASQUIDO (segunda pasada). La captura golpea a su
    distancia y a su altura (el jab y el directo de UAL, al pecho: 1,20 m; la forja pegaba a la cara, 1,43) y la
    primera pasada ponía lo que faltaba inclinando el tronco 12°. Ahora:

      · `carga` (m): antes del directo la cadera se va atrás y vuelve (la revisión: 0,00 m de carga).
      · `paso` (m): en el jab el pie de delante da un paso corto adelante y vuelve (con el pie en el aire, no
        arrastrado), y la cadera va con él: el alcance sale del paso, no de doblarse.
      · `alcance` (m, desde la raíz, IGUAL en los dos sexos: el blanco no encoge con la mujer) y `altura` (m del
        hombre; en la mujer, a escala): los nudillos van ahí en el impacto con la IK del brazo (la muñeca entra
        acelerando: el pico de velocidad cae al entrar en él). Si el brazo no llega desde el hombro, la cadera
        entra (hasta `cadera_max`, con los pies clavados).
      · `pasada` (m): tras el impacto el puño no pasa más de eso por delante de donde golpeó (el gancho del
        Prestado se pasaba 37 cm y se caía de cara a través del blanco)."""
    from mathutils import Quaternion, Vector
    S = _lado(cfg, g['efector'][-1])
    hom, bra, ant, man, nud = cfg['brazos'][S]
    esc = sk.esc
    fi = g['impacto']
    n = len(poses)
    antes, despues = g.get('antes', 4), g.get('despues', 5)
    raiz = raiz or (lambda f: Vector((0.0, 0.0, 0.0)))

    def w(f):
        if f <= fi - antes or f >= fi + despues:
            return 0.0
        if f <= fi:
            return ((f - (fi - antes)) / float(antes)) ** 2
        return 1.0 - suave((f - fi) / float(despues))
    if g.get('carga'):
        for f in range(n):
            k = _campana(f, fi - 8, fi - 4, fi - 4, fi)
            if k > 0:
                poses[f].cad = poses[f].cad + Vector((0.0, g['carga'] * esc * k, 0.0))
    if g.get('paso'):
        P = _lado(cfg, g.get('pie', g['efector'][-1]))
        for f in range(n):
            s_ = _campana(f, fi - 5, fi - 1, fi + 3, fi + 9)
            if s_ > 0:
                # (el paso en METROS, no a escala: la mujer, más baja, llega al mismo blanco dando el mismo paso o más)
                dy = -g['paso'] / esc * s_
                h = 0.035 * esc * 4.0 * s_ * (1.0 - s_)
                poses[f].tob[P] = poses[f].tob[P] + Vector((0.0, dy, h))
                poses[f].cad = poses[f].cad + Vector((0.0, dy * 0.55, 0.0))
    alcance = g.get('alcance')
    altura = g.get('altura')
    des = g.get('_destino')
    if des is not None:
        alcanzar_pies(sk, cfg, des, poses)
    if alcance or altura:
        for vuelta in range(3):
            D, head = fk(sk, poses[fi], (nud, bra), cfg['cadera'])
            K, W, Sh = head[nud], head[man], head[bra]
            r0 = raiz(fi)
            objetivo = Vector((K.x, (r0.y - alcance) if alcance else K.y, altura * esc if altura else K.z))
            Wt = W + (objetivo - K)
            largo = ((sk.head[ant] - sk.head[bra]).length + (sk.head[man] - sk.head[ant]).length) * 0.985
            falta = (Wt - Sh).length - largo
            if os.environ.get('CAPTURA_DEPURA'):
                print('golpe %s vuelta %d: nudillos %s objetivo %s hombro %s falta %.3f' % (
                    g['efector'], vuelta, tuple(round(x, 3) for x in K), tuple(round(x, 3) for x in objetivo),
                    tuple(round(x, 3) for x in Sh), falta))
            if vuelta == 2 or falta <= 0.005:
                break
            if vuelta == 0:
                h = min(falta / 0.9, g.get('cadera_max', 0.12) / esc)
                for f in range(n):
                    if w(f) > 0:
                        poses[f].cad = poses[f].cad + Vector((0.0, -h * w(f), 0.0))
                if des is not None:
                    alcanzar_pies(sk, cfg, des, poses)
            else:
                # lo que aún falta, con el hombro: la clavícula se adelanta (hasta 16°, unos 4 cm) y el tronco se echa
                # un poco sobre el golpe (hasta 6°); no 12° de tronco como en la primera pasada
                from mathutils import Matrix
                pecho = cfg['pecho']
                ang = min(16.0, math.degrees(math.asin(min(1.0, falta / max(1e-6, (sk.head[bra] - sk.head[hom]).length)))))
                sg = 1.0 if S == cfg['lados'][1] else -1.0
                inc = min(8.0, max(0.0, (falta - 0.04) / 0.45 / math.radians(1.0)))
                for f in range(n):
                    k = w(f)
                    if k <= 0:
                        continue
                    Dp, _ = fk(sk, poses[f], (hom,), cfg['cadera'])
                    Rz = Matrix.Rotation(math.radians(ang * k * sg), 3, 'Z')
                    poses[f].q[hom] = (Dp[pecho].transposed() @ Rz @ Dp[pecho] @ poses[f].q[hom].to_matrix()).to_quaternion()
                    for b_ in ('columna', pecho):
                        if b_ in poses[f].q:
                            poses[f].q[b_] = poses[f].q[b_] @ Quaternion((1.0, 0.0, 0.0), math.radians(0.5 * inc * k))
        delta = objetivo - K
        for f in range(n):
            if w(f) > 0:
                _, head = fk(sk, poses[f], (man,), cfg['cadera'])
                mover_muneca(sk, cfg, poses[f], S, head[man] + delta * w(f))
    if g.get('pasada') is not None:
        _, head = fk(sk, poses[fi], (nud,), cfg['cadera'])
        tope = -(head[nud].y - raiz(fi).y) + g['pasada']
        for f in range(fi + 1, n):
            _, head = fk(sk, poses[f], (nud, man), cfg['cadera'])
            r = -(head[nud].y - raiz(f).y)
            if r > tope:
                # lo que se pasa lo recoge sobre todo el CUERPO (la cadera atrás, los pies donde están): recogerlo todo
                # con el brazo, estirado, lo doblaba de golpe y el codo daba media vuelta
                poses[f].cad = poses[f].cad + Vector((0.0, (r - tope) * 0.8, 0.0))
                _, head = fk(sk, poses[f], (nud, man), cfg['cadera'])
                r = -(head[nud].y - raiz(f).y)
                if r > tope:
                    mover_muneca(sk, cfg, poses[f], S, head[man] + Vector((0.0, r - tope, 0.0)))
        if des is not None:
            alcanzar_pies(sk, cfg, des, poses)
    return poses


def contener_cadera(sk, cfg, des, poses, baja=1.0, inclina_max=None, tronco_max=None):
    """LA CADERA NO SE HUNDE NI SE VUELCA. `baja`: lo que la cadera baja respecto al primer fotograma, a esa
    fracción (el gancho de UAL se agacha 36 cm, una sentadilla de sumo). `inclina_max` (grados): la pelvis no se
    vuelca más que eso (el tronco va con ella); `tronco_max`: ni el pecho (la revisión: tras el gancho se seguía
    doblando hasta dejar la cabeza a 0,9 m). Las piernas llegan a los mismos pies (`alcanzar_pies`)."""
    from mathutils import Matrix, Vector
    cad = cfg['cadera']
    z0 = poses[0].cad.z
    up0 = (sk.head['columna'] - sk.head[cad]) if 'columna' in sk.head else Vector((0.0, 0.0, 1.0))
    for p in poses:
        if baja < 1.0 and p.cad.z < z0:
            p.cad = Vector((p.cad.x, p.cad.y, z0 + (p.cad.z - z0) * baja))
        if inclina_max is not None:
            Dc = p.q[cad].to_matrix()
            up = (Dc @ up0).normalized()
            a = math.degrees(math.acos(max(-1.0, min(1.0, up.z))))
            if a > inclina_max:
                eje = up.cross(Vector((0.0, 0.0, 1.0)))
                if eje.length > 1e-6:
                    R = Matrix.Rotation(math.radians(a - inclina_max), 3, eje.normalized())
                    p.q[cad] = (R @ Dc).to_quaternion()
                    # lo que cuelga de la cadera (las piernas) conserva su giro en el mundo: el pie y la IK
                    for S in cfg['lados']:
                        muslo = cfg['piernas'][S][0]
                        if muslo in p.q:
                            p.q[muslo] = ((R @ Dc).transposed() @ Dc @ p.q[muslo].to_matrix()).to_quaternion()
        if tronco_max is not None and 'columna' in p.q and cfg['pecho'] in sk.head:
            D, _ = fk(sk, p, (cfg['pecho'],), cad)
            pecho = cfg['pecho']
            up = (D[pecho] @ (sk.tail[pecho] - sk.head[pecho])).normalized()
            a = math.degrees(math.acos(max(-1.0, min(1.0, up.z))))
            if a > tronco_max:
                eje = up.cross(Vector((0.0, 0.0, 1.0)))
                if eje.length > 1e-6:
                    R = Matrix.Rotation(math.radians(a - tronco_max), 3, eje.normalized())
                    Dcol = D['columna']
                    p.q['columna'] = (D[sk.parent['columna']].transposed() @ R @ Dcol).to_quaternion()
    return alcanzar_pies(sk, cfg, des, poses)


def alcanzar_pies(sk, cfg, des, poses, margen=0.975):
    """La cadera baja lo justo para que cada pierna llegue a su tobillo (una IK que no llega deja el pie flotando)."""
    from mathutils import Vector
    cad = cfg['cadera']
    for p in poses:
        Dc = p.q[cad].to_matrix()
        m = 0.0
        for S in cfg['lados']:
            muslo = cfg['piernas'][S][0]
            l1, l2 = des.largos[S]
            Lmax = margen * (l1 + l2)
            J = p.cad + Dc @ (sk.head[muslo] - sk.head[cad])
            d = p.tob[S] - J
            h = math.hypot(d.x, d.y)
            vz = J.z - p.tob[S].z
            if h * h + vz * vz > Lmax * Lmax and h < Lmax:
                m = max(m, vz - math.sqrt(Lmax * Lmax - h * h))
        if m > 0:
            p.cad = p.cad - Vector((0.0, 0.0, m))
    return poses


def manos_fuera(sk, cfg, poses, excluir=()):
    """EL PUÑO NO ENTRA EN LA CARA NI EN EL TRONCO. La revisión vio el puño hundido en el cuello y la mandíbula al
    encajar (tocado) y la izquierda 17 cm dentro del tronco en el gancho del Prestado. Por fotograma, lo que el
    puño (entre la muñeca y los nudillos) se mete en la cabeza (esfera), el cuello o el tronco (cápsulas en los
    huesos, del ancho de la figura más delgada) se saca con la IK del brazo, hacia fuera."""
    from mathutils import Vector
    esc = getattr(sk, 'esc', 1.0)
    cab = cfg['cabeza']
    pecho = cfg['pecho']
    cad = cfg['cadera']
    cuello = sk.parent[cab]
    for p in poses:
        for S in cfg['lados']:
            if S in excluir:
                continue
            hom, bra, ant, man, nud = cfg['brazos'][S]
            for _ in range(2):
                D, head = fk(sk, p, (nud, cab) + tuple(cfg['piernas'][T][1] for T in cfg['lados']), cad)
                rp = 0.045 * esc
                empuje = Vector((0.0, 0.0, 0.0))
                # (la muñeca y el puño: con sólo el puño, el canto de la mano entraba en el muslo al sentarse, caer f21)
                puntos = (head[man] + (head[nud] - head[man]) * 0.7, head[man] + (head[nud] - head[man]) * 0.2,
                          head[nud] + (head[nud] - head[man]) * 0.8)
                puno = puntos[0]
                # la cabeza
                c = head[cab] + D[cab] @ Vector((0.0, -0.02, 0.075)) * esc
                d = puno - c
                e = 0.10 * esc + rp - d.length
                if e > 0 and d.length > 1e-6:
                    empuje = d.normalized() * e
                # el cuello, el tronco y los muslos (la mano de la mujer entraba 9-10 cm en el muslo en el suelo)
                capsulas = [(head[cuello], head[cab], 0.055 * esc),
                            (head[cad] + D[cad] @ Vector((0.0, 0.0, 0.06)) * esc, head[pecho], 0.125 * esc)]
                for T in cfg['lados']:
                    capsulas.append((head[cfg['piernas'][T][0]], head[cfg['piernas'][T][1]], 0.095 * esc))
                for a, b, r in capsulas:
                    ab = b - a
                    for pt in puntos:
                        t = max(0.0, min(1.0, (pt - a).dot(ab) / max(ab.dot(ab), 1e-12)))
                        d = pt - (a + ab * t)
                        e = r + rp - d.length
                        if e > empuje.length and d.length > 1e-6:
                            empuje = d.normalized() * e
                if empuje.length < 0.004 * esc:
                    break
                mover_muneca(sk, cfg, p, S, head[man] + empuje * 1.05)
    return poses


def a_la_oreja(sk, cfg, ctx, poses, S, f_agarra, f_llega, desde_forja=('descolgar', 30), dedos=(74.0, 82.0, (40.0, 22.0))):
    """EL AURICULAR EN LA OREJA, AGARRADO. La primera pasada llevaba la mano abierta y plana a la sien, como un
    saludo, y el auricular a 25 cm de la oreja (la revisión). Desde que lo coge (`f_agarra`) la mano va cerrada en
    el agarre, y de ahí a `f_llega` la muñeca y su giro van, con la IK, al sitio que tienen en la forja RESPECTO A
    LA CABEZA (el puño en la mejilla, el lado del pulgar hacia la oreja: el auricular del micro a la boca al
    altavoz en la oreja), y siguen a la cabeza de la captura hasta el final."""
    from mathutils import Vector
    Sx = _lado(cfg, S)
    hom, bra, ant, man, nud = cfg['brazos'][Sx]
    cab = cfg['cabeza']
    ref = ctx.forja_pose(*desde_forja)
    Dr, hr = fk(sk, ref, (man, cab), cfg['cadera'])
    off = Dr[cab].transposed() @ (hr[man] - hr[cab])
    Rrel = Dr[cab].transposed() @ Dr[man]
    Rm = sk.R[man]
    sg = 1.0 if Sx == cfg['lados'][1] else -1.0
    for f, p in enumerate(poses):
        if f < f_agarra - 2:
            continue
        p.extra.update({'_dedos_' + Sx: True, 'ded_' + Sx: dedos[:2], 'pul_' + Sx: dedos[2]})
        u = suave((f - f_agarra) / float(max(1, f_llega - f_agarra)))
        if u <= 0:
            continue
        D, head = fk(sk, p, (man, cab), cfg['cadera'])
        T = head[man].lerp(head[cab] + D[cab] @ off, u)
        Dm = D[man].to_quaternion().slerp((D[cab] @ Rrel).to_quaternion(), u).to_matrix()
        # en los giros LOCALES de la pose (no como IK aparte): lo que parta de este final (salir) lo hereda
        mover_muneca(sk, cfg, p, Sx, T)
        D, _ = fk(sk, p, (man,), cfg['cadera'])
        p.q[man] = (D[ant].transposed() @ Dm).to_quaternion()
    return poses


SEGUIDOS = ('eje_codo_', 'eje_rodilla_', 'pronacion_')


def bisagras_seguidas(sk, cfg, poses, bucle=False):
    """EL EJE DEL CODO Y DE LA RODILLA, SEGUIDO EN EL TIEMPO. Con el brazo (la pierna) casi recto, el plano en que dobla
    no lo dicen las articulaciones, y el húmero giraba media vuelta de un fotograma a otro al pasar por recto (la
    revisión: saltos de 135-170° en el antebrazo y el brazo). Donde dobla de verdad (más de 20°) manda su plano; donde
    va casi recto, el de los fotogramas de alrededor que sí doblan (repartido entre el de antes y el de después).
    Queda en `eje_codo_s` y `eje_rodilla_s`, que lee `animacion._ik_bisagra` como eje por defecto."""
    import animacion
    n = len(poses)
    # lo seguido antes (una pose que viene del final de otra receta, `FinalDe`, trae el suyo) no cuenta: el plano en
    # que dobla cada fotograma es el de su FK
    for p in poses:
        for k in [k for k in p.extra if k.startswith(SEGUIDOS)]:
            del p.extra[k]
    res = [_resolver(sk, p) for p in poses]
    fks = [fk(sk, p, tuple(cfg['brazos'][S][3] for S in cfg['lados']) + tuple(cfg['piernas'][S][2] for S in cfg['lados']),
              cfg['cadera'])[0] for p in poses]
    for S in cfg['lados']:
        hom, bra, ant, man, _ = cfg['brazos'][S]
        muslo, pierna, pie, _ = cfg['piernas'][S]
        for nombre, (a, b, c) in (('eje_codo_', (bra, ant, man)), ('eje_rodilla_', (muslo, pierna, pie))):
            ejes = []
            for r in res:
                h = r[4]
                y1, y2 = h[b] - h[a], h[c] - h[b]
                nb = y1.cross(y2)
                s_ = nb.length / max(1e-9, y1.length * y2.length)
                # doblado de verdad (más de 20°): hacia donde lo dobla la captura (su codo está donde está; el giro de su
                # húmero, no: por eso no sirve para decir si dobla «al revés»)
                bueno = s_ > 0.34
                ejes.append(nb.normalized() if bueno else None)
            buenos = [f for f in range(n) if ejes[f] is not None]
            if not buenos:
                continue
            for f in range(n):
                if ejes[f] is not None:
                    poses[f].extra[nombre + S] = tuple(ejes[f])
                    continue
                if bucle:
                    antes = min(buenos, key=lambda g: (f - g) % n)
                    despues = min(buenos, key=lambda g: (g - f) % n)
                    da, dd = (f - antes) % n, (despues - f) % n
                else:
                    ant_ = [g for g in buenos if g < f]
                    des_ = [g for g in buenos if g > f]
                    antes = ant_[-1] if ant_ else des_[0]
                    despues = des_[0] if des_ else ant_[-1]
                    da, dd = abs(f - antes), abs(despues - f)
                ea, ed = ejes[antes], ejes[despues]
                if ea.dot(ed) < 0.0:
                    # los dos tramos que doblan lo hacen hacia lados opuestos: el del más cercano
                    e = ea if da <= dd else ed
                else:
                    w = da / float(max(1, da + dd))
                    e = (ea * (1.0 - w) + ed * w).normalized()
                poses[f].extra[nombre + S] = tuple(e)
        # ═══ LA PRONACIÓN, SEGUIDA ═══ el giro de la mano de la captura sobre el antebrazo (ya en su bisagra), sin
        # saltos de vuelta entera de un fotograma a otro y con su tope (animacion.PRONACION_MAX)
        eje = (sk.head[man] - sk.head[ant]).normalized()
        previo = None
        for f, (r, Df) in enumerate(zip(res, fks)):
            if poses[f].extra.get('orm_' + S) is not None:
                previo = None
                continue
            q = (r[3][ant].transposed() @ Df[man]).to_quaternion()
            ang = math.degrees(_giro_sobre(q, eje))
            ang = (ang + 180.0) % 360.0 - 180.0
            if previo is not None:
                ang += 360.0 * round((previo - ang) / 360.0)
            previo = ang
            poses[f].extra['pronacion_' + S] = max(-animacion.PRONACION_MAX, min(animacion.PRONACION_MAX, ang))
    return poses


def _por_debajo(sk, res):
    """Lo más bajo del cuerpo, con las articulaciones engordadas (sin las mallas: para declarar vuelos y
    tramos tumbados, que la pasada de suelo y la batería miden luego sobre las mallas de verdad)."""
    D, head = res[3], res[4]
    z = []
    for S in 'LR':
        H, B = _puntos_del_pie(sk, res, S)
        z += [H.z, B.z, head['pierna_' + S].z - 0.06, head['mano_' + S].z - 0.04, head['antebrazo_' + S].z - 0.05]
    z += [head['caderas'].z - 0.12, head['columna1'].z - 0.12, head['pecho'].z - 0.12, head['cabeza'].z - 0.02]
    return min(z)


def _tramos_de(marcas):
    out = []
    i = 0
    while i < len(marcas):
        if marcas[i]:
            j = i
            while j + 1 < len(marcas) and marcas[j + 1]:
                j += 1
            out.append((i, j))
            i = j + 1
        else:
            i += 1
    return out


def uniformar_marcha(sk, poses):
    """EL PIE DE APOYO VA HACIA ATRÁS A VELOCIDAD CONSTANTE. En una marcha en el sitio de la captura el cuerpo
    no avanza a velocidad fija (frena al posar el pie y acelera al empujar), así que el pie apoyado va hacia
    atrás a velocidad variable; el cliente mueve el cuerpo a velocidad fija y el pie resbalaba (0,58 m/s de
    mediana en la carrera de la mujer, el comprobador del cliente). Se mueve la pose entera adelante y atrás
    dentro del ciclo (un vaivén que suma cero en la vuelta) para que el tobillo y la bola, cuando apoyan (a
    menos de 2 cm de lo más bajo de su recorrido; el cliente los mide a 8 mm, pero a 60 Hz y entre fotogramas), vayan hacia atrás a `v` (la de
    `medir_marcha`); el vaivén se cierra en los fotogramas sin apoyo. Devuelve `v`."""
    from mathutils import Vector
    n = len(poses)
    res = [_resolver(sk, p) for p in poses]
    series = [[r[4][b].copy() for r in res] for S in 'LR' for b in ('pie_' + S, 'punta_' + S)]
    zmins = [min(x.z for x in s) for s in series]
    # con vuelo (trote, carrera: hay fotogramas sin nada a menos de 2 cm) el apoyo dura 2-3 fotogramas y se mira
    # a 2 cm; andando, a 8 mm (a 2 cm entra el talón que ya despega y el ajuste empeora)
    vuela = any(all(s[f].z > z + 0.02 for s, z in zip(series, zmins)) for f in range(n))
    ventana = 0.02 if vuela else 0.008
    puntos = [(s, [x.z < z + ventana for x in s]) for s, z in zip(series, zmins)]
    dys = []
    for f in range(n):
        g = (f + 1) % n
        d = [serie[g].y - serie[f].y for serie, apoyo in puntos if apoyo[f] and apoyo[g]]
        dys.append(sum(d) / len(d) if d else None)
    v = medir_marcha(sk, poses)
    if all(d is None for d in dys):
        return v
    corr = [None if d is None else v / FPS - d for d in dys]
    libres = [f for f in range(n) if corr[f] is None] or list(range(n))
    resto = -sum(c for c in corr if c is not None) / len(libres)
    corr = [(0.0 if c is None else c) + (resto if f in libres else 0.0) for f, c in enumerate(corr)]
    delta = [0.0]
    for f in range(n - 1):
        delta.append(delta[-1] + corr[f])
    m = sum(delta) / n
    for f, p in enumerate(poses):
        d = Vector((0.0, delta[f] - m, 0.0))
        p.cad = p.cad + d
        for S in p.tob:
            p.tob[S] = p.tob[S] + d
            p.mun[S] = p.mun[S] + d
    return v


def medir_marcha(sk, poses):
    """Velocidad (m/s) con que el pie apoyado va hacia atrás en una marcha en el sitio (la del clip): la
    del punto más bajo del pie (talón o bola) en los fotogramas en que está a menos de 1,5 cm de su mínimo.
    Con el tobillo no vale: en la carrera se apoya la bola y el tobillo baja en el vuelo."""
    vs = []
    n = len(poses)
    res = [_resolver(sk, p) for p in poses]
    for S in 'LR':
        pts = []
        for r in res:
            H, B = _puntos_del_pie(sk, r, S)
            pts.append((H, B))
        zmin = min(min(h.z, b.z) for h, b in pts)
        for i in range(n):
            (Ha, Ba), (Hb, Bb) = pts[i], pts[(i + 1) % n]
            for a, b in ((Ha, Hb), (Ba, Bb)):
                if a.z < zmin + 0.02 and b.z < zmin + 0.02:
                    vs.append((b.y - a.y) * FPS)
    # la mediana: el talón que se posa (y aún frena) o la bola que ya despega no son la velocidad del apoyo
    return float(np.median(vs)) if vs else 0.0


# ------------------------------------------------------------------ las recetas
def _golpe(clave, claves, espejo=False):
    """Un golpe de UAL con su mapa de tiempos [(fotograma, segundo de la fuente[, curva])]: la preparación hasta el
    impacto, el impacto en su milisegundo, la vuelta RÁPIDA (el chasquido: el puño vuelve en 5 fotogramas; la
    primera pasada dejaba el directo estirado 300 ms y lo recogía a 1,4 m/s) y el asentarse en la guardia.
    Devuelve (pista, fotogramas)."""
    return Ual(clave, t=claves, espejo=espejo), claves[-1][0]


def _postura(pista):
    """LA POSTURA DE LA GUARDIA, MÁS RECOGIDA: la de los golpes de UAL abre los pies de lado y dobla las rodillas hacia
    fuera, y con la gabardina el bajo se abría y los muslos la atravesaban en toda la guardia (la batería: del 0 al
    100 % de los fotogramas). Los pies se acercan a su punto medio (70 % de lado, 85 % de delante a atrás) y la cadera
    sube 1,5 cm. Todo lo que empieza o acaba en la guardia de la captura (los golpes, el encajar) la lleva igual."""
    return RodillasAdelante(PiesRectos(Erguida(PiesJuntos(pista, 0.7, 0.85), 0.015), 16.0), 25.0)


_GUARDIA_UAL = _postura(Quieta(Ual('ual1:Punch_Jab'), 0.0))
# ═══ LA GUARDIA ═══ la de los golpes de UAL (la izquierda delante), con el puño de delante 9 cm más adelante y 3 más
# arriba: a la altura del pómulo y no bajo la barbilla (la revisión: tocaba la mandíbula; la forja lo tenía ahí)
PUNO_GUARDIA = (0.0, -0.09, 0.03)
GUARDIA = PunoAdelante(_GUARDIA_UAL, 'L', PUNO_GUARDIA)
TUMBADO_UAL = Quieta(Ual('ual2:LayToIdle'), 0.0)  # boca arriba, la cabeza hacia atrás: donde acaba el derribo
RECETAS = {}


def receta(nombre, frames, pista, info, fuente, **kw):
    RECETAS[nombre] = dict(frames=frames, pista=pista, info=info, fuente=fuente, **kw)


# ═══ EL REPOSO Y LA GUARDIA ═══
_REPOSO = RodillasAdelante(PiesRectos(Erguida(PiesJuntos(Ual('ual1:Idle_Loop', ciclo=75), 0.8, 0.3), 0.025), 15.0), 20.0)
receta('reposo', 75, _REPOSO,
       'reposo de pie: respiración y peso que pasa de un pie a otro (captura, con los pies casi a la par: la de UAL los '
       'separa 40 cm de delante a atrás)',
       'UAL1 Idle_Loop', bucle=True, clavar=False, tope_faldon=35)
receta('guardia', 75, Suma(GUARDIA, Ual('ual1:Idle_Loop', ciclo=75), ref=0, huesos=TRONCO + ('hombro_L', 'hombro_R'), escala=1.3),
       'guardia de combate en bucle: la de los golpes de la captura (la izquierda delante, el puño de delante a la altura del '
       'pómulo) con la respiración y el peso del reposo encima; los golpes empiezan y acaban en su fotograma 0',
       'mezcla: UAL1 Punch_Jab (fotograma 0, el puño de delante adelantado) + UAL1 Idle_Loop aditivo en el tronco', bucle=True,
       clavar=False, tope_faldon=35)

# ═══ LA MARCHA (segunda pasada) ═══ A la cadencia de una persona y con la zancada por IK (ver `Marcha`): pasear
# 103 pasos por minuto a 1,3 m/s, andar 129 a 2, trotar y correr 180 a 5 y a 7 (pasos de 1,67 y 2,33 m). El
# cliente pone el ritmo con la zancada medida (`velocidad / zancada` ciclos por segundo).
_PASEO = Marcha('ual1:Walk_Loop', 35, 1.3, bote=0.05)
receta('pasear', 35, _PASEO, 'paso de calle de los durmientes a 1,3 m/s (captura: 103 pasos por minuto, simétrico)',
       'UAL1 Walk_Loop', bucle=True, marcha=True, clavar=False, tope_faldon=22)
receta('andar', 28, Marcha('ual1:Walk_Loop', 28, 2.0, brazos=1.45, bote=0.05),
       'andar decidido a 2 m/s (captura: el paso de calle a 129 pasos por minuto, la zancada por IK y el braceo más amplio)',
       'UAL1 Walk_Loop', bucle=True, marcha=True, clavar=False, tope_faldon=26, abrir=10.0)
receta('trotar', 20, Marcha('ual1:Jog_Fwd_Loop', 20, 5.0, apoyo=0.33, bote=0.07, adelante=0.4),
       'trote a 5 m/s (captura: 180 pasos por minuto, cada pie apoyado un tercio del ciclo, la cadera bota 7 cm)',
       'UAL1 Jog_Fwd_Loop', bucle=True, marcha=True, clavar=False, tope_faldon=35)
receta('correr', 20, Marcha('ual1:Sprint_Loop', 20, 7.0, apoyo=0.27, bote=0.09, adelante=0.36),
       'carrera a 7 m/s (captura: 180 pasos por minuto de 2,33 m, cada pie apoyado un cuarto del ciclo)',
       'UAL1 Sprint_Loop', bucle=True, marcha=True, clavar=False, tope_faldon=50)
receta('andar-paraguas', 35, Mezcla(Marcha('ual1:Walk_Loop', 35, 1.3, bote=0.05), (Forja('andar-paraguas', fr=lambda f: f * 30.0 / 35.0), 1.0,
                                                                         BRAZO['R'])),
       'pasear con el paraguas: el paso de la captura con el brazo derecho de la forja (puño delante del pecho, pulgar '
       'arriba; la pieza en agarre_R)', 'mezcla: UAL1 Walk_Loop + brazo derecho de la forja', bucle=True, marcha=True,
       clavar=False, tope_faldon=22,
       # la mano del paraguas va con la cabeza (el paraguas sobre ella y vertical, ande como ande la captura)
       mano_con_la_cabeza=('R', (-0.14, -0.22, -0.41), ((1.0, 0.0, 0.0), (0.0, -1.0, 0.0)), (74.0, 82.0, (40.0, 22.0))),
       manos_excluir=('R',))

# ═══ LOS GOLPES (segunda pasada) ═══ A la cara (1,42 m en el hombre) y no al pecho; el alcance del jab sale de un
# paso del pie de delante y el del directo de la cadera que gira y entra, con carga previa; el puño vuelve con
# chasquido. El impacto en su milisegundo y el pico de velocidad al entrar en él.
_jab, _n_jab = _golpe('ual1:Punch_Jab', [(0, 0.0), (4, 0.10), (7, 0.197, 2.5), (12, 0.55), (20, 0.867)])
receta('seguida-1', _n_jab, PunoAdelante(_postura(_jab), 'L', PUNO_GUARDIA, peso=[(0, 1.0), (3, 0.0, 'suave'), (14, 0.0), (20, 1.0, 'suave')]),
       'jab de izquierda (captura): de la guardia al impacto en 7 (233 ms) con un paso corto del pie de delante, el puño a '
       'la cara, y vuelta con chasquido (12 cm en 5 fotogramas) a la guardia en 20', 'UAL1 Punch_Jab',
       golpe=dict(efector='mano_L', impacto=7, alcance=0.98, altura=1.42, paso=0.10, cadera_max=0.16, pasada=0.06),
       tope_faldon=30)
_cross, _n_cross = _golpe('ual1:Punch_Cross', [(0, 0.0), (5, 0.16), (8, 0.25, 2.5), (13, 0.72), (24, 1.0)])
receta('seguida-2', _n_cross, PunoAdelante(_postura(_cross), 'L', PUNO_GUARDIA),
       'directo de derecha (captura): carga (la cadera atrás 4 cm), la cadera gira y entra y el talón de atrás pivota, el '
       'puño a la cara en el impacto 8 (267 ms), vuelta con chasquido y guardia en 24', 'UAL1 Punch_Cross',
       golpe=dict(efector='mano_R', impacto=8, alcance=0.98, altura=1.42, carga=0.04, cadera_max=0.22, pasada=0.06),
       tope_faldon=30)
_GANCHO = Tramos((0, Ual('ual2:Melee_Hook', t=[(0, 0.0), (19, 0.2), (21, 0.25), (28, 0.467)]), 0),
                 (28, Ual('ual2:Melee_Hook_Rec', t=[(28, 0.0), (45, 0.6)]), 2))
receta('golpe-de-prestado', 45, Tramos((0, Quieta(_PASEO, 0.0), 0), (0, _GANCHO, 6)),
       'golpe de Prestado (captura): sale del paso de calle, el brazo derecho se va atrás, lento y telegrafiado (0-19), barre '
       'en un gancho abierto que cruza por delante a la altura del pecho en el impacto 21 (700 ms), se pasa un palmo y se '
       'recoge; la cadera no se hunde ni se vuelca (hasta 25°)',
       'UAL2 Melee_Hook + Melee_Hook_Rec', golpe=dict(efector='mano_R', impacto=21, alcance=0.94, altura=1.30, pasada=0.12,
                                                         cadera_max=0.10, antes=5, despues=6),
       cadera=dict(baja=0.45, inclina_max=25.0, tronco_max=38.0), tope_faldon=35)

# ═══ ENCAJAR, CAER Y LEVANTARSE ═══
receta('tocado', 18, Suma(GUARDIA, Ual('ual2:Idle_Shield_Break', t=[(0, 0.0), (18, 0.85)]), ref=0,
                          huesos=('caderas',) + PARTE_ALTA, escala=1.0),
       'golpe recibido de frente (captura, sumada a la guardia): el tronco y la cabeza se van atrás, los brazos se abren y '
       'vuelve a la guardia en su sitio (600 ms); sin raíz', 'mezcla: UAL1 Punch_Jab (guardia) + UAL2 Idle_Shield_Break aditivo',
       tope_faldon=30)

_CAIDA = Ual('ual1:Death01', t=[(0, 0.1), (39, 1.4)])
receta('caer', 45, Tramos((0, GUARDIA, 0), (0, _CAIDA, 7), (37, Desplazada(TUMBADO_UAL, de=(_CAIDA, 39)), 8)),
       'cae de espaldas y se queda tumbado (captura): sale de la guardia (7 fotogramas), se le doblan las rodillas, se sienta '
       'y cae; su último fotograma es el primero de desconectado y de levantarse (la cadera sobre la raíz)',
       'mezcla: UAL1 Punch_Jab (guardia) + UAL1 Death01 + UAL2 LayToIdle (fotograma 0)', raiz=True, cae_en='auto', abrir=14.0)
receta('desconectado', 60, Respira(FinalDe('caer'), 60),
       'desconectado: tumbado boca arriba respirando; es EXACTAMENTE el último fotograma de caer (la cadera sobre el origen) y el '
       'primero de levantarse', 'UAL1 Death01 + UAL2 LayToIdle (el final de caer) con respiración', bucle=True, faldon_de='caer',
       contacto=[(0, 60)], abrir=0.0, clavar=False, manos=False)
_KB = Ual('ual2:Hit_Knockback', t=[(0, 0.05), (16, 0.6)])
_LEV = Tramos((15, Ual('ual2:LayToIdle', t=[(15, 0.0), (45, 1.53)]), 0), (38, GUARDIA, 7))
receta('derribado', 45, Tramos((0, GUARDIA, 0), (0, _KB, 3), (15, Desplazada(_LEV, f_ref=15, de=(_KB, 15)), 6)),
       'derribado de frente, entero en 1,5 s (captura): el golpe lo levanta del suelo y cae de espaldas (la espalda en el '
       'suelo en 9), rebota y se levanta desde el 16 hasta la guardia en 45', 'mezcla: UAL2 Hit_Knockback + UAL2 LayToIdle',
       raiz=True, cae_en=9, levanta_desde=16, abrir=12.0)
_LEVANTA = Desplazada(Tramos((0, Ual('ual2:LayToIdle', t=[(0, 0.0), (34, 1.53)]), 0), (28, GUARDIA, 6)), a=(0.0, 0.0))
receta('levantarse', 34, Tramos((0, FinalDe('caer'), 0), (0, Abierta(_LEVANTA, 14.0), 5)),
       'levantarse desde tumbado (captura): desde el último fotograma de caer se sienta apoyando las manos, recoge los pies y '
       'se levanta a la guardia (1,13 s); la raíz sigue a la cadera', 'UAL2 LayToIdle (desde el final de caer)', raiz=True,
       abrir=0.0)

# ═══ LA CABINA ═══
_ALCANZA = Mezcla(Ual('ual1:Interact', espejo=True, t=[(0, 0.1), (14, 0.8)]),
                  (Forja('descolgar'), 1.0, ('dedos_R', 'dedos2_R', 'pulgar_R')))
# las piernas y la cadera, las del teléfono todo el clip: el Interact en espejo cambia el pie de delante, y
# fundirlo con el teléfono arrastraba los dos pies 40 cm
_TEL = Ual('ual2:Idle_TalkingPhone_Loop', t=[(0, 0.0), (45, 1.5)])
receta('descolgar', 45, Mezcla(Tramos((0, _ALCANZA, 0), (14, _TEL, 10)), (_TEL, 1.0, PARTE_BAJA)),
       'descolgar el auricular (captura): alarga la derecha hacia la cabina, lo coge (13) y se lo lleva a la oreja (25), '
       'agarrado, con el puño en la mejilla y el lado del pulgar en la oreja como en la forja (1,5 s, CABINA.descolgarTics); '
       'el auricular va en agarre_R', 'mezcla: UAL1 Interact (en espejo) + UAL2 Idle_TalkingPhone_Loop + la mano de la forja',
       oreja=('R', 13, 25), manos_excluir=('R',))

# ═══ EL RAYO (docs/quiebro/EL-RAYO.md §6) ═══ El conjuro de UAL1 (Spell_Simple_Enter, _Idle_Loop, _Shoot y _Exit) EN
# ESPEJO: la captura lanza con la izquierda, y la boca del rayo es la mano derecha (`rayo/contrato.ts`, `BocaDe`). El
# brazo que lanza va recto al frente a la altura del hombro, la palma abierta hacia el blanco y los dedos arriba; el otro,
# atrás y abajo; el cuerpo perfilado sobre la pierna de delante. Los pies, recogidos como en el reposo (de ahí sale casi
# siempre: el propio está en reposo o andando cuando pulsa).
#
# CARGAR es una ENTRADA y un BUCLE en el mismo clip: se sube el brazo (0-9, 300 ms: lo que dura el chispazo, el nivel 1
# de la carga, EL-RAYO §1.2; con 400 ms un toque rápido soltaba el destello con la palma aún en la cadera; `entrada`, en
# el manifiesto `entradaMs`: un lanzar antes espera a que acabe, ver `esperaLaEntrada` en `personajes/gestos.ts`),
# se asienta (9-33: la tela del abrigo deja de balancearse) y desde el 33 el bucle de la carga de UAL (63
# fotogramas, 2,1 s) se repite: `bucle_desde` (el manifiesto: `bucleDesdeMs`) dice al cliente desde dónde. El último
# fotograma (el 96) es la misma pose que el 33 (el bucle de UAL es periódico, y la tela se cierra ahí igual que en un
# bucle: `animacion.hornear`).
#
# LANZAR sale de la pose del fotograma 33 de la carga SIN PROCESAR (`Quieta(_RAYO_CARGAR, 33)`: el procesado de lanzar la
# deja igual que el de cargar; con la ya procesada los brazos se abrían dos veces y la izquierda saltaba 6 cm al soltar
# —lo vio `comprobar_movimiento`—), empuja la palma en el
# impacto (fotograma 1, 33 ms: `impactoMs`, el instante del destello) y retrocede: el retroceso de Spell_Simple_Shoot
# (la palma 6 cm atrás, la muñeca arriba, el hombro que cede) AUMENTADO ×1,9, porque el de UAL es de un conjuro menor y
# éste es el ataque especial; se asienta y sale (Spell_Simple_Exit) al reposo. Desde el 15 (`salida`, en el manifiesto
# `salidaMs`) es la SALIDA: la pose es otra vez la de la carga y de ahí baja el brazo y recoge el pie. El cliente la pinta
# entera si el cuerpo se queda quieto (el juego vuelve al reposo a los 260 ms del destello: sin ella, el pie adelantado
# resbalaba 30 cm en el fundido), y también al dejar la carga sin lanzar (`salidaDelRayo` en `personajes/gestos.ts`).
RAYO_ENTRA = 9             # fotogramas en subir el brazo
RAYO_SALIDA = 15           # desde aquí, lanzar es la salida (la pose de la carga que baja el brazo)
RAYO_DESDE = 33            # desde aquí, el bucle de la carga
RAYO_CICLO = 63            # el bucle de UAL: 2,1 s
RAYO_KY = 0.45             # los pies, de delante a atrás, respecto a la captura (el reposo: 0,3)
RAYO_PIES = 35.0           # cuánto pueden girar los pies respecto a la cadera perfilada


def _conjuro(pista):
    """La postura del conjuro, recogida como el reposo (pies menos separados, cadera erguida, rodillas adelante), y con
    el pie izquierdo (el de atrás) donde lo tiene el reposo: al entrar y al salir sólo da un paso el derecho."""
    return PieComo(RodillasAdelante(PiesRectos(Erguida(PiesJuntos(pista, 0.8, RAYO_KY), 0.025), RAYO_PIES), 20.0), 'L', _REPOSO)


_RAYO_ENTRA = Ual('ual1:Spell_Simple_Enter', espejo=True, t=[(0, 0.0), (RAYO_ENTRA, 0.5333)])
_RAYO_CARGA = Ual('ual1:Spell_Simple_Idle_Loop', espejo=True, t=lambda f: ((f - RAYO_ENTRA) % RAYO_CICLO) / float(RAYO_CICLO) * 2.1)
_RAYO_CARGAR = Tramos((0, Quieta(_REPOSO, 0.0), 0), (0, _conjuro(Tramos((0, _RAYO_ENTRA, 0), (RAYO_ENTRA, _RAYO_CARGA, 2))), 7))
receta('cargar-rayo', RAYO_DESDE + RAYO_CICLO, _RAYO_CARGAR,
       'cargar el rayo (captura, en espejo): desde el reposo da un paso con la derecha y la sube al frente, la palma abierta '
       'hacia el blanco a la altura del hombro (0-9), se asienta (9-33) y sostiene la carga en bucle desde el 33 (2,1 s)',
       'UAL1 Spell_Simple_Enter + Spell_Simple_Idle_Loop (en espejo: la derecha)', bucle_desde=RAYO_DESDE, entrada=RAYO_ENTRA,
       tope_faldon=35)
_RAYO_TIRO = Ual('ual1:Spell_Simple_Shoot', espejo=True, t=lambda f: 0.0 if f < 0 else 0.13)   # f -1: antes; si no, el retroceso
_RAYO_SALE = Ual('ual1:Spell_Simple_Exit', espejo=True, t=[(15, 0.0), (27, 0.4333)])
receta('lanzar-rayo', 33,
       Tramos((0, Suma(Quieta(_RAYO_CARGAR, float(RAYO_DESDE)), _RAYO_TIRO, ref=-1.0, huesos=PARTE_ALTA, cadera=False,
                       escala=[(0, 0.0), (1, -1.2), (5, 1.9, 'suave'), (10, 1.15, 'suave'), (RAYO_SALIDA, 0.0, 'suave')]), 0),
              (RAYO_SALIDA, _conjuro(_RAYO_SALE), 3), (25, Quieta(_REPOSO, 0.0), 8)),
       'lanzar el rayo (captura, en espejo): la palma empuja en el impacto (fotograma 1: sale el destello), retrocede con el '
       'hombro (1-5), se asienta (5-15), baja el brazo (15-27) y recoge el pie derecho al reposo (25-33)',
       'UAL1 Spell_Simple_Shoot (el retroceso x1,9) + Spell_Simple_Exit (en espejo), desde la carga', impacto=(1, 3), salida=RAYO_SALIDA,
       tope_faldon=35)


# ═══ LA FORJA CON LA GUARDIA DE LA CAPTURA ═══ Lo que UAL no tiene (la patada circular del Cierre, los
# quiebros, el Empellón, la Réplica, la Entrada volada, encajar por la espalda) sigue siendo de la forja,
# pero sus extremos van a la guardia de la captura (`ConGuardia`): la Tanda empalma con los golpes de
# UAL. Todo lo demás del clip (impacto, raíz del juego, vuelos, intocable) se hereda de la forja.
for _n, _ini, _fin in (('quiebro-izquierda', 1, 1), ('quiebro-derecha', 1, 1), ('quiebro-atras', 1, 1), ('quiebro-delante', 1, 1),
                       ('quiebro-torpe', 1, 1), ('quiebro-torpe-derecha', 1, 1), ('quiebro-torpe-atras', 1, 1),
                       ('quiebro-torpe-delante', 1, 1), ('tocado-espalda', 1, 1), ('derribado-espalda', 1, 1),
                       ('entrada', 1, 1), ('cierre', 1, 1), ('empellon', 1, 1), ('replica', 1, 1), ('descolocado', 1, 0),
                       ('avance', 1, 0)):
    RECETAS[_n] = dict(forja_con_guardia=(bool(_ini), bool(_fin)), heredar=True, clavar=True,
                       fuente='mezcla: forja (%s) con la guardia de UAL1 Punch_Jab en %s' % (
                           _n, 'los dos extremos' if _ini and _fin else 'el principio'))
# la Entrada llega al blanco también en la mujer (la revisión: 0,83 m; la superficie del blanco está a 0,9)
RECETAS['entrada']['golpe'] = dict(efector='mano_R', impacto=12, alcance=0.94, cadera_max=0.08, antes=4, despues=4)
# ═══ SALIR, DESDE EL FINAL DE DESCOLGAR ═══ `salir` es de la forja y partía del descolgar de la forja: tras el de la
# captura la mano saltaba 40 cm y los pies 26-31 en 150 ms (la revisión). Ahora empieza en el último fotograma del
# descolgar de la captura (los pies donde están, la mano en la oreja) y en 10 fotogramas es la forja.
RECETAS['salir'] = dict(forja_con_guardia=(True, False), desde=FinalDe('descolgar', a=None), entra=10, heredar=True, clavar=True,
                        fuente='mezcla: forja (salir) desde el último fotograma de descolgar (captura)')
# ═══ LA FORJA PURA, POR LA MISMA MAQUINARIA ═══ Lo que sigue siendo de la forja entero pasa también por aquí (la pose de
# la forja tal cual, resuelta con las bisagras, la muñeca con topes y el giro de la mano seguido en el tiempo): la
# muñeca de la Réplica doblada 168° o el hueso de giro de la victoria dando media vuelta en un fotograma eran de la
# forja (la revisión, P3). La fuente sigue siendo la forja.
for _n in ('guardia-celador', 'retroceder', 'lateral-izquierda', 'lateral-derecha', 'respuesta', 'apuntar', 'disparar',
           'desalojable', 'rematar', 'absorber', 'rescatar', 'imprimirse', 'victoria'):
    RECETAS[_n] = dict(forja_pura=True, heredar=True, clavar=False, abrir=0.0, manos=False, fuente='forja')
# (al agacharse a coger la mano del compañero, la derecha pasaba por el muslo un fotograma)
RECETAS['rescatar']['manos'] = True


# ------------------------------------------------------------------ el registro en animacion.CLIPS
FORJA = {}
_CLIPS_REGISTRADOS = {}


class _Capturado:
    """Un clip con receta: la primera vez que el horneado le pide un fotograma hace sus poses con el esqueleto que
    se está horneando (`animacion.SK`), las PROCESA (pies clavados, brazos, golpe, marcha...) y deja en su entrada de
    CLIPS lo medido. `procesar(sk)` da esas poses (`FinalDe` las lee: el desconectado parte del final de caer)."""

    def __init__(self, nombre, r, entrada, clips):
        self.nombre, self.r, self.entrada, self.clips = nombre, r, entrada, clips
        self.hechas = {}
        self.dicts = {}

    def __call__(self, fr):
        import animacion
        sk = animacion.SK
        if sk is None:
            raise RuntimeError('captura: %s se pide fuera del horneado (animacion.SK sin poner)' % self.nombre)
        clave = (id(sk), sk.sexo)
        if clave not in self.dicts:
            self.dicts[clave] = [a_forja(sk, p) for p in self.procesar(sk)]
        ps = self.dicts[clave]
        return dict(ps[int(round(fr)) % len(ps)] if self.r.get('bucle') else ps[min(int(round(fr)), len(ps) - 1)])

    def _raiz(self):
        """La raíz del juego en el fotograma f (en el mundo), para medir el alcance desde ella."""
        from mathutils import Vector
        rl = self.entrada.get('raiz_lineal')
        if not rl:
            return None
        hasta, d = rl
        return lambda f: Vector((d[0] * min(1.0, f / float(hasta)), d[1] * min(1.0, f / float(hasta)), 0.0))

    def procesar(self, sk):
        clave = (id(sk), getattr(sk, 'sexo', ''))
        if clave in self.hechas:
            return self.hechas[clave]
        r = self.r
        n = r['frames']
        ctx = ctx_de(sk)
        cfg = ctx.destino.cfg
        bucle = r.get('bucle', False)
        poses = [r['pista'].pose(float(f), ctx).copia() for f in range(n if bucle else n + 1)]
        if r.get('clavar', True) and not bucle:
            poses = clavar_pies(sk, poses, solo_extremos=bool(r.get('forja_con_guardia')))
        abrir = r.get('abrir', 0.0 if r.get('forja_con_guardia') else 7.0)
        if abrir > 0:
            poses = abrir_brazos(sk, poses, abrir)
        if r.get('mano_con_la_cabeza'):
            poses = mano_con_la_cabeza(sk, poses, *r['mano_con_la_cabeza'])
        if r.get('oreja'):
            S, fa, fl = r['oreja']
            poses = a_la_oreja(sk, cfg, ctx, poses, S, fa, fl)
        if r.get('cadera'):
            poses = contener_cadera(sk, cfg, ctx.destino, poses, **r['cadera'])
        g = r.get('golpe')
        if g:
            poses = ajustar_golpe(sk, cfg, poses, dict(g, _destino=ctx.destino), raiz=self._raiz())
        if r.get('manos', not r.get('forja_con_guardia')):
            poses = manos_fuera(sk, cfg, poses, excluir=r.get('manos_excluir', ()))
        poses = bisagras_seguidas(sk, cfg, poses, bucle)
        e = self.entrada
        if r.get('marcha'):
            v = uniformar_marcha(sk, poses)
            e['velocidad'] = v / sk.esc
            e['zancada'] = v * n / FPS / sk.esc
            e['viento'] = (0.0, v / sk.esc, 0.0)
        if not bucle:
            res = [_resolver(sk, p) for p in poses]
            bajo = [_por_debajo(sk, x) for x in res]
            if 'vuelo' in r['_auto']:
                # (a 4,5 cm, la misma altura con que la batería juzga que algo levita)
                v = [list(t) for t in _tramos_de([z > 0.03 for z in bajo])]
                if v:
                    e['vuelo'] = v
            if 'contacto' in r['_auto']:
                c = [list(t) for t in _tramos_de([x[4]['caderas'].z < 0.18 for x in res]) if t[1] - t[0] >= 1]
                if c:
                    e['contacto'] = c
            if e.get('cae_en') == 'auto':
                c = e.get('contacto') or [[n, n]]
                e['cae_en'] = c[0][0]
        self.hechas[clave] = poses
        return poses


def registrar(clips):
    """Sustituye en `clips` (animacion.CLIPS) los clips que tienen receta. Lo de la forja que no se toca,
    se queda (y sigue en `FORJA`, para las capas que lo usan). Con CAPTURA=0 no hace nada."""
    global _CLIPS_REGISTRADOS
    if os.environ.get('CAPTURA', '1') == '0':
        return []
    if FORJA:
        raise RuntimeError('captura: registrar() dos veces (los clips de la forja ya no son los originales)')
    FORJA.update(clips)
    _CLIPS_REGISTRADOS = clips
    hechos = []
    for nombre, r in RECETAS.items():
        base = clips.get(nombre, {})
        if r.get('forja_pura'):
            r = dict(r, frames=base['frames'], pista=Forja(nombre), info=base['info'], bucle=base['bucle'])
            RECETAS[nombre] = r
        if r.get('forja_con_guardia'):
            # la forja con la guardia de la captura: su pista, sus fotogramas, su descripción y todo lo suyo
            ini, fin = r['forja_con_guardia']
            desde = r.get('desde')
            r = dict(r, frames=base['frames'], pista=ConGuardia(nombre, base['frames'], ini, fin, entra=r.get('entra', 4), desde=desde),
                     info=base['info'] + ('; empieza en el último fotograma de descolgar (captura)' if desde is not None else
                                          ('; empieza' + (' y acaba' if fin else '') + ' en la guardia de la captura')))
            RECETAS[nombre] = r
        e = {k: v for k, v in base.items() if k != 'fn'} if r.get('heredar') else {}
        e.update(frames=r['frames'], bucle=r.get('bucle', False), info=r['info'], fuente=r['fuente'])
        if 'tope_faldon' in r or 'tope_faldon' in base:
            e['tope_faldon'] = r.get('tope_faldon', base.get('tope_faldon'))
        # (`impacto` sin `golpe`: el instante de un gesto que no golpea con el cuerpo, como el destello del rayo; y
        # `bucle_desde`: un clip de una vez cuya cola, desde ese fotograma, se repite: la carga del rayo; `entrada`: hasta
        # dónde entra un clip, y `salida`: desde dónde sale al reposo, las dos del rayo)
        for k in ('raiz', 'contacto', 'vuelo', 'cae_en', 'levanta_desde', 'faldon_de', 'raiz_lineal', 'impacto', 'bucle_desde',
                  'entrada', 'salida'):
            if k in r:
                e[k] = r[k]
        g = r.get('golpe')
        if g:
            e['impacto'] = (g['impacto'], g['impacto'] + 2)
            e['efector'] = g['efector']
        # lo que no se hereda ni se declara, se mide en el horneado (vuelos y tramos tumbados)
        r['_auto'] = [k for k in ('vuelo', 'contacto') if k not in e]
        e['fn'] = _Capturado(nombre, r, e, clips)
        clips[nombre] = e
        hechos.append(nombre)
    return hechos


# ------------------------------------------------------------------ el segundo destino: cualquier armadura
class EsqueletoDeArmadura:
    """El reposo de una armadura cualquiera (MetaHuman exportado de Unreal, o la de prueba) en el espacio
    CANÓNICO de la captura: metros de la armadura, Z arriba y mirando a -Y. Un FBX de Unreal llega con
    otros ejes (Y adelante o X adelante, a veces en centímetros): se mide hacia dónde mira (de los talones a
    las bolas) y hacia dónde es arriba (de la pelvis a la cabeza) y se lleva todo a ese espacio; al hornear
    se deshace el cambio. La escala no importa: las posiciones se escalan por el largo de pierna."""

    def __init__(self, arm, cfg):
        from mathutils import Matrix, Vector
        self.arm = arm
        self.esc = 1.0
        self.sexo = 'x'
        bones = arm.data.bones
        cad = cfg['cadera']
        tL, tR = cfg['tobillos']
        bL = tL.replace('foot', 'ball')
        bR = tR.replace('foot', 'ball')
        arriba = (bones['head'].head_local if 'head' in bones else bones[cad].tail_local) - bones[cad].head_local
        adelante = ((bones[bL].head_local + bones[bR].head_local) - (bones[tL].head_local + bones[tR].head_local)) * 0.5
        adelante = adelante - arriba.normalized() * adelante.dot(arriba.normalized())
        Z = arriba.normalized()
        Yc = -adelante.normalized()
        X = Yc.cross(Z)
        self.M = Matrix((X, Yc, Z))           # filas: local -> canónico
        M = self.M
        self.R, self.head, self.tail, self.parent, self.orden = {}, {}, {}, {}, []
        for b in bones:
            self.R[b.name] = M @ b.matrix_local.to_3x3()
            self.head[b.name] = M @ b.head_local
            self.tail[b.name] = M @ b.tail_local
            self.parent[b.name] = b.parent.name if b.parent else None
        pend = [b.name for b in bones if b.parent is None]
        while pend:
            n = pend.pop(0)
            self.orden.append(n)
            pend += [c.name for c in bones[n].children]
        # la escala del destino: la cadera en el suelo del mismo sitio que la fuente (sus pies en z = 0)
        suelo = min(self.head[tL].z, self.head[tR].z) - 0.0
        self.suelo = suelo


def _usa_forja(p):
    if isinstance(p, (Forja, ConGuardia, FinalDe, Abierta)):
        return True
    for v in vars(p).values():
        if isinstance(v, Pista) and _usa_forja(v):
            return True
        if isinstance(v, (tuple, list)):
            for x in v:
                if isinstance(x, Pista) and _usa_forja(x):
                    return True
                if isinstance(x, (tuple, list)) and any(isinstance(y, Pista) and _usa_forja(y) for y in x):
                    return True
    return False


def _giro_sobre(q, eje):
    """El ángulo del giro de q alrededor de `eje` (descomposición en giro y balanceo)."""
    p = q.x * eje.x + q.y * eje.y + q.z * eje.z
    return 2.0 * math.atan2(p, q.w)


def poses_en_armadura(sk, cfg, poses):
    """Las poses (giros locales en canónico, cadera, tobillos) como giros de pose de Blender de CADA hueso de
    la armadura, con las piernas en IK a los tobillos y los huesos de giro repartidos. Devuelve por
    fotograma ({hueso: Quaternion de pose}, posición de pose de la cadera)."""
    import animacion
    from mathutils import Matrix, Quaternion
    I3 = Matrix.Identity(3)
    cad = cfg['cadera']
    giros = {tw: (dr, fr) for tw, dr, fr in cfg.get('giros', ())}
    salida = []
    for p in poses:
        D, head = {}, {}
        for b in sk.orden:
            par = sk.parent[b]
            if b == cad:
                D[b] = p.q.get(b, Quaternion()).to_matrix()
                head[b] = p.cad.copy()
                continue
            q = p.q[b].to_matrix() if (b in p.q and b not in giros) else I3
            if par is None:
                D[b] = q
                head[b] = sk.head[b].copy()
            else:
                D[b] = D[par] @ q
                head[b] = head[par] + D[par] @ (sk.head[b] - sk.head[par])
        # ═══ CODOS Y RODILLAS, BISAGRAS ═══ (animacion._ik_bisagra, lo mismo que en la forja): el brazo a la muñeca
        # de la FK, la pierna al tobillo de la pose; el pie y la mano conservan su giro en el mundo
        cadenas = []
        for S, t, m in zip(cfg['lados'], cfg['tobillos'], cfg['munecas']):
            cadenas.append((t.replace('foot', 'thigh'), t.replace('foot', 'calf'), t, -animacion.ADELANTE, p.tob[S],
                            animacion.RODILLA_MAX, t.replace('foot', 'ball')))
            cadenas.append((m.replace('hand', 'upperarm'), m.replace('hand', 'lowerarm'), m, animacion.ADELANTE, None,
                            animacion.CODO_MAX, None))
        for raiz_b, medio_b, fin_b, doblez, T, tope, bola in cadenas:
            if raiz_b not in head or medio_b not in head or fin_b not in head:
                continue
            l1 = (sk.head[medio_b] - sk.head[raiz_b]).length
            l2 = (sk.head[fin_b] - sk.head[medio_b]).length
            antes = {b: D[b].copy() for b in D}
            T = head[fin_b] if T is None else T
            _, _, n0, _, _ = animacion.bisagra_de_reposo(sk, raiz_b, medio_b, fin_b, doblez)
            eje = D[raiz_b] @ n0
            eje_pie = None
            if bola is not None and bola in sk.head:
                eje_pie = (D[fin_b] @ (sk.head[bola] - sk.head[fin_b])).cross(T - head[raiz_b])
                eje = eje_pie
            animacion._ik_bisagra(sk, D, head, raiz_b, medio_b, fin_b, T, doblez, l1, l2, eje, flex_max=tope,
                                  eje_del_pie=eje_pie)
            D[fin_b] = antes[fin_b]
            # lo que cuelga (los huesos de giro, la bola, los dedos) sigue con su giro local; el pie y la mano
            # conservan su giro en el mundo
            for b in sk.orden:
                if b in (raiz_b, medio_b, fin_b) or not _desciende(sk, b, raiz_b):
                    continue
                par = sk.parent[b]
                D[b] = D[par] @ (antes[par].transposed() @ antes[b])
                head[b] = head[par] + D[par] @ (sk.head[b] - sk.head[par])
        # los huesos de giro: una fracción del giro de su hueso (respecto a su padre) sobre su eje, con la pose ya
        # resuelta (el giro del húmero y del muslo lo pone la bisagra)
        for b in sk.orden:
            if b not in giros:
                continue
            dr, fr = giros[b]
            par = sk.parent[b]
            pdr = sk.parent[dr]
            if dr not in D or par not in D or pdr not in D:
                continue
            q_dr = (D[pdr].transposed() @ D[dr]).to_quaternion()
            eje = (sk.R[dr].col[1]).normalized()
            ang = _giro_sobre(q_dr, eje) * fr
            D[b] = D[par] @ Quaternion(sk.R[b].col[1].normalized(), ang).to_matrix()
            head[b] = head[par] + D[par] @ (sk.head[b] - sk.head[par])
        rot = {}
        for b in sk.orden:
            par = sk.parent[b]
            q = D[b] if par is None else D[par].transposed() @ D[b]
            L = sk.R[b].transposed() @ q @ sk.R[b]
            rot[b] = L.to_quaternion()
        loc = sk.R[cad].transposed() @ (head[cad] - sk.head[cad])
        salida.append((rot, loc))
    return salida


def _desciende(sk, b, de):
    par = sk.parent[b]
    while par is not None:
        if par == de:
            return True
        par = sk.parent[par]
    return False


def hornear_en_armadura(arm, destino='metahuman', clips=None, log=print):
    """Hornea las recetas que no usan capas de la forja (las de captura pura) sobre una armadura con los
    nombres de `DESTINOS[destino]`: una acción por clip con el MISMO nombre que en el juego. Sin faldón ni
    pasada de suelo sobre mallas (no hay mallas de la forja): los pies van con IK a los de la fuente."""
    import bpy
    cfg = DESTINOS[destino]
    sk = EsqueletoDeArmadura(arm, cfg)
    faltan = [b for b in cfg['tabla'] if b not in sk.head]
    if faltan:
        log('captura: la armadura no trae %d huesos de la tabla %s (se quedan en su reposo): %s' % (len(faltan), destino, faltan[:12]))
    ctx = Ctx(sk, {}, {}, destino)
    if arm.animation_data is None:
        arm.animation_data_create()
    for pb in arm.pose.bones:
        pb.rotation_mode = 'QUATERNION'
    hechos = {}
    for nombre, r in RECETAS.items():
        if clips and nombre not in clips:
            continue
        if 'pista' not in r or _usa_forja(r['pista']):
            continue
        n = r['frames']
        bucle = r.get('bucle', False)
        poses = [r['pista'].pose(float(f), ctx).copia() for f in range(n if bucle else n + 1)]
        if bucle:
            poses.append(poses[0])
        res = poses_en_armadura(sk, cfg, poses)
        act = bpy.data.actions.new(nombre)
        act.use_fake_user = True
        for b in sk.orden:
            ruta = 'pose.bones["%s"].rotation_quaternion' % b
            prev = None
            serie = []
            for rot, _ in res:
                q = rot[b]
                if prev is not None and q.dot(prev) < 0:
                    q = -q
                prev = q
                serie.append(q)
            for i in range(4):
                fc = act.fcurves.new(ruta, index=i, action_group=b)
                fc.keyframe_points.add(len(serie))
                fc.keyframe_points.foreach_set('co', [x for f, q in enumerate(serie) for x in (f, q[i])])
                fc.update()
        cad = cfg['cadera']
        for i in range(3):
            fc = act.fcurves.new('pose.bones["%s"].location' % cad, index=i, action_group=cad)
            fc.keyframe_points.add(len(res))
            fc.keyframe_points.foreach_set('co', [x for f, (_, loc) in enumerate(res) for x in (f, loc[i])])
            fc.update()
        act.frame_range = (0, len(res) - 1)
        tr = arm.animation_data.nla_tracks.new()
        tr.name = nombre
        tr.strips.new(nombre, 0, act)
        tr.mute = True
        hechos[nombre] = dict(fotogramas=len(res) - 1, fuente=r['fuente'], bucle=bucle)
        log('  %-20s %3d fotogramas  %s' % (nombre, len(res) - 1, r['fuente']))
    return hechos


# ═══ LA ARMADURA DE PRUEBA DEL SEGUNDO DESTINO ═══ Hasta que lleguen los MetaHuman, el modo se prueba sobre
# una armadura con los nombres y la jerarquía del cuerpo de MetaHuman (cinco vértebras, dos cuellos,
# metacarpos, huesos de giro) en pose A de 45° y mirando a +X en su espacio local: si la tabla, el cambio de
# ejes o el reparto de los giros fallan, la tira lo enseña.
def armadura_de_prueba_metahuman():
    import bpy
    from mathutils import Vector, Matrix
    Pr = reposo_fuente('ual1')
    a = math.radians(45.0)
    J = {}
    J['root'] = Vector((0, 0, 0))
    J['pelvis'] = Vector((0, 0.01, 0.95))
    for i, z in enumerate((1.02, 1.10, 1.18, 1.27, 1.36)):
        J['spine_0%d' % (i + 1)] = Vector((0, 0.01, z))
    J['neck_01'] = Vector((0, 0.0, 1.47))
    J['neck_02'] = Vector((0, -0.005, 1.52))
    J['head'] = Vector((0, -0.01, 1.58))
    huesos = [('root', None, J['root'], Vector((0, 0, 0.2))), ('pelvis', 'root', J['pelvis'], J['spine_01'])]
    cadena = ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'spine_04', 'spine_05', 'neck_01', 'neck_02', 'head']
    for b0, b1 in zip(cadena[1:], cadena[2:]):
        huesos.append((b0, cadena[cadena.index(b0) - 1], J[b0], J[b1]))
    huesos.append(('head', 'neck_02', J['head'], J['head'] + Vector((0, 0, 0.2))))
    for s, sg in (('l', 1), ('r', -1)):
        d = Vector((sg * math.cos(a), 0, -math.sin(a)))
        cl = Vector((sg * 0.02, 0.0, 1.43))
        hom = Vector((sg * 0.17, 0.02, 1.43))
        codo = hom + d * 0.28
        mun = codo + d * 0.26
        huesos += [('clavicle_' + s, 'spine_05', cl, hom), ('upperarm_' + s, 'clavicle_' + s, hom, codo),
                   ('upperarm_twist_01_' + s, 'upperarm_' + s, hom + d * 0.07, hom + d * 0.14),
                   ('upperarm_twist_02_' + s, 'upperarm_' + s, hom + d * 0.14, hom + d * 0.21),
                   ('lowerarm_' + s, 'upperarm_' + s, codo, mun),
                   ('lowerarm_twist_01_' + s, 'lowerarm_' + s, codo + d * 0.13, codo + d * 0.19),
                   ('lowerarm_twist_02_' + s, 'lowerarm_' + s, codo + d * 0.19, codo + d * 0.25),
                   ('hand_' + s, 'lowerarm_' + s, mun, mun + d * 0.08)]
        adelante = Vector((0, -1, 0))
        for k, dedo in enumerate(('index', 'middle', 'ring', 'pinky')):
            off = adelante * (0.025 - 0.017 * k)
            m0 = mun + off + d * 0.01
            m1 = mun + off + d * 0.085
            huesos += [('%s_metacarpal_%s' % (dedo, s), 'hand_' + s, m0, m1),
                       ('%s_01_%s' % (dedo, s), '%s_metacarpal_%s' % (dedo, s), m1, m1 + d * 0.04),
                       ('%s_02_%s' % (dedo, s), '%s_01_%s' % (dedo, s), m1 + d * 0.04, m1 + d * 0.07),
                       ('%s_03_%s' % (dedo, s), '%s_02_%s' % (dedo, s), m1 + d * 0.07, m1 + d * 0.095)]
        t0 = mun + adelante * 0.03 + d * 0.02
        huesos += [('thumb_01_' + s, 'hand_' + s, t0, t0 + (d + adelante) * 0.025),
                   ('thumb_02_' + s, 'thumb_01_' + s, t0 + (d + adelante) * 0.025, t0 + (d + adelante) * 0.045),
                   ('thumb_03_' + s, 'thumb_02_' + s, t0 + (d + adelante) * 0.045, t0 + (d + adelante) * 0.06)]
        cad = Vector((sg * 0.095, 0.01, 0.92))
        rod = Vector((sg * 0.095, 0.0, 0.50))
        tob = Vector((sg * 0.095, 0.03, 0.09))
        bola = Vector((sg * 0.095, -0.11, 0.02))
        huesos += [('thigh_' + s, 'pelvis', cad, rod), ('thigh_twist_01_' + s, 'thigh_' + s, cad + (rod - cad) * 0.3, cad + (rod - cad) * 0.6),
                   ('calf_' + s, 'thigh_' + s, rod, tob), ('calf_twist_01_' + s, 'calf_' + s, rod + (tob - rod) * 0.4, rod + (tob - rod) * 0.6),
                   ('calf_twist_02_' + s, 'calf_' + s, rod + (tob - rod) * 0.6, rod + (tob - rod) * 0.8),
                   ('foot_' + s, 'calf_' + s, tob, bola), ('ball_' + s, 'foot_' + s, bola, bola + Vector((0, -0.07, 0)))]
    # la armadura mira a +X en su espacio local: se giran todos los puntos -90° (de -Y a +X)
    G = Matrix.Rotation(math.radians(90.0), 3, 'Z')
    ad = bpy.data.armatures.new('metahuman_prueba')
    ob = bpy.data.objects.new('metahuman_prueba', ad)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode='EDIT')
    for n, par, h, t in huesos:
        eb = ad.edit_bones.new(n)
        eb.head = G @ h
        eb.tail = G @ t
        if par:
            eb.parent = ad.edit_bones[par]
    bpy.ops.object.mode_set(mode='OBJECT')
    return ob


def _cuerpo_de_palos(arm):
    """Una cápsula por hueso, colgada del hueso (para mirar la armadura de prueba en una tira)."""
    import bpy
    for b in arm.data.bones:
        L = b.length
        if L < 0.02 or 'twist' in b.name or b.name == 'root':
            continue
        r = 0.05 if b.name.startswith(('pelvis', 'spine', 'head', 'thigh', 'calf')) else 0.03
        if b.name.startswith(('index', 'middle', 'ring', 'pinky', 'thumb')):
            r = 0.008
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=L, location=(0, 0, 0))
        c = bpy.context.active_object
        c.name = 'palo_' + b.name
        c.parent = arm
        c.parent_type = 'BONE'
        c.parent_bone = b.name
        c.location = (0, -L / 2.0, 0)
        c.rotation_euler = (math.radians(90.0), 0, 0)


def _principal():
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if not args:
        return
    orden = args[0]
    kv = dict(a.split('=', 1) for a in args[1:])
    if orden == 'extraer':
        extraer()
    elif orden == 'hornear':
        # blender -b --factory-startup --python captura.py -- hornear destino=metahuman
        #     (armadura=<fbx|glb> | prueba=1) salida=<glb> [clips=a+b] [tira=<png>]
        import bpy
        bpy.ops.wm.read_factory_settings(use_empty=True)
        sc = bpy.context.scene
        sc.render.fps = FPS
        destino = kv.get('destino', 'metahuman')
        if kv.get('prueba'):
            arm = armadura_de_prueba_metahuman()
        else:
            ruta = kv['armadura']
            if ruta.lower().endswith('.fbx'):
                bpy.ops.import_scene.fbx(filepath=ruta, automatic_bone_orientation=False)
            else:
                bpy.ops.import_scene.gltf(filepath=ruta)
            arm = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
        hechos = hornear_en_armadura(arm, destino, kv['clips'].split('+') if kv.get('clips') else None)
        if kv.get('salida'):
            import construir
            construir.exportar_glb(kv['salida'], [arm], animaciones=True)
            json.dump(hechos, open(kv['salida'][:-4] + '.json', 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
            print('captura: %s (%d clips)' % (kv['salida'], len(hechos)))
        if kv.get('tira'):
            _tira_de_prueba(arm, list(hechos), kv['tira'])


def _tira_de_prueba(arm, nombres, salida):
    import bpy
    from mathutils import Vector
    import imagen
    _cuerpo_de_palos(arm)
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.render.resolution_x, sc.render.resolution_y = 260, 340
    bpy.ops.mesh.primitive_plane_add(size=20)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    sc.collection.objects.link(cam)
    sc.camera = cam
    cam.data.lens = 35
    filas = []
    for nombre in nombres:
        act = bpy.data.actions[nombre]
        arm.animation_data.action = act
        f0, f1 = act.frame_range
        fila = []
        for i in range(8):
            f = int(round(f0 + (f1 - f0) * i / 7.0))
            sc.frame_set(f)
            h = arm.matrix_world @ arm.pose.bones['pelvis'].head
            c = Vector((h.x, h.y, 0.9))
            # de perfil: la armadura de prueba mira a +X, así que la cámara va a su izquierda (+Y)
            cam.location = c + Vector((0.0, 3.4, 0.4))
            cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler()
            p = os.path.join(os.path.dirname(salida), '_t.png')
            sc.render.filepath = p
            bpy.ops.render.render(write_still=True)
            fila.append(imagen.leer(p))
        filas.append(fila)
    imagen.guardar(imagen.mosaico(filas), salida)
    print('captura: tira %s' % salida)


if __name__ == '__main__':
    _principal()


