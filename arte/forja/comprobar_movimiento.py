"""LA BATERÍA DEL MOVIMIENTO: lo que la revisión de animación del 24-sep midió a mano en los clips y
ninguna comprobación miraba. Sobre el esqueleto (sin mallas: es el mismo en todas las figuras de un
sexo), clip a clip, fotograma a fotograma, con los GLB que baja el juego antes de comprimir
(obra/empaquetado/clips-{hombre,mujer}.glb) y lo que el horneado sabe de cada clip (obra/clips-{m,f}.json).

    blender -b --factory-startup --python-exit-code 1 --python comprobar_movimiento.py -- [sexo=m|f]
            [glb=<clips.glb>] [json=<clips.json>] [clips=a+b] [salida=<carpeta>]

Escribe obra/movimiento_<sexo>.json y sale con 1 si algo no pasa.

═══ LO QUE MIDE (cada regla se vio en rojo contra la primera entrega de la captura) ═══

  · BISAGRAS. El codo y la rodilla son bisagras: el antebrazo (la tibia) no puede salirse del plano en que
    lo dobla el hueso de arriba (el eje de reposo llevado por el brazo o el muslo). Desvío ≤ 10°. Codo
    doblado ≤ 150° y nunca al revés (≥ -5°); la tibia girada sobre la rodilla ≤ 15° con la pierna casi
    recta (≤ 35° doblada); la muñeca doblada ≤ 85° (la primera entrega: codos a 47-84°, la tibia del
    reposo a 44°).
  · LA MANO EN LA CARA. El puño no entra en la cabeza ni en el cuello (esferas y cápsula en los huesos)
    más de 3 cm, salvo donde se busca (el auricular en la mejilla).
  · LA MARCHA, POR CLIP. Pasos por minuto, bote de la cadera, vuelo por paso, el apoyo de cada pie (y
    que los dos apoyen lo mismo: cojear), el resbalón del pie apoyado en el percentil 90 (con el despegue
    y la llegada dentro: la mediana lo escondía) y el vaivén de las manos al andar. Los márgenes, los de
    una persona a esa velocidad (`MARCHA`).
  · LOS FUNDIDOS QUE EL JUEGO REPRODUCE. De la pose en que acaba (o en que está, si es un bucle) un gesto
    a la primera del siguiente, lo que se mueve la articulación que más se mueve, dividido por el fundido
    del cliente (`fundidoEntre` de `personajes/gestos.ts`, leído de allí): más de 6 m/s es un salto que se
    ve. Los fundidos que el cliente de hoy hace sin respetar `entraCon` (de la guardia al desconectado) se
    miden aparte y no cuentan: son del cliente.
  · LOS GOLPES. La altura del puño en el impacto (el jab y el directo, a la cara: ≥ 1,35 m en el hombre;
    el golpe del Prestado, al pecho: 1,15-1,45), el alcance en los dos sexos (≥ 0,90: la superficie del
    blanco), que no se pase de rosca (≤ 15 cm más allá tras el impacto) y que el brazo vuelva con
    chasquido (≥ 12 cm en los 5 fotogramas de después).
"""
import json
import math
import os
import re
import sys

import bpy
import numpy as np
from mathutils import Quaternion, Vector

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(AQUI, '..', '..'))
EMP = os.environ.get('REPARTO_EMPAQUETADO') or os.path.join(AQUI, 'obra', 'empaquetado')
OBRA = os.path.join(AQUI, 'obra')
GESTOS_TS = os.path.join(REPO, 'escritorio', 'src', 'quiebro', 'personajes', 'gestos.ts')
MANIFIESTO = os.path.join(REPO, 'escritorio', 'src', 'quiebro', 'recursos', 'reparto.json')
args = dict(a.split('=', 1) for a in sys.argv[sys.argv.index('--') + 1:]) if '--' in sys.argv else {}
SAL = args.get('salida') or os.environ.get('REPARTO_INFORMES') or OBRA
SOLO = args['clips'].split('+') if args.get('clips') else None
FPS = 30.0

UMBRAL = {
    'bisagra_grados': 10.0,
    'codo_max': 150.0,
    'al_reves': -5.0,
    'tibia_recta': 15.0, 'tibia_doblada': 35.0,
    'muneca': 85.0,
    'cara_m': 0.03,
    'fundido_ms': 6.0,
    'resbalon_p90': 0.5,
    'pasada_m': 0.15,
    'chasquido_m': 0.12,
    'alcance_m': 0.90,
    'giro_por_fotograma': 120.0,
}
# los huesos cuyo giro en un fotograma se mira (sin dedos, faldón ni los de apoyo)
CUERPO = ('caderas', 'columna', 'columna1', 'pecho', 'cuello', 'cabeza') + tuple(
    b + S for S in 'LR' for b in ('hombro_', 'brazo_', 'antebrazo_', 'giro_', 'mano_', 'muslo_', 'pierna_', 'pie_'))
# la marcha de una persona a la velocidad de cada clip: pasos por minuto, bote (m), vuelo por paso (s), vaivén
# de la mano (m, delante-atrás respecto a la cadera), diferencia de apoyo entre pies
MARCHA = {
    'pasear': dict(pasos=(95, 125), bote=0.06, vuelo=0.0, mano=0.20),
    'andar-paraguas': dict(pasos=(95, 125), bote=0.06, vuelo=0.0),
    'andar': dict(pasos=(112, 142), bote=0.06, vuelo=0.0, mano=0.30),
    'trotar': dict(pasos=(160, 192), bote=0.08, vuelo=0.12),
    'correr': dict(pasos=(170, 210), bote=0.10, vuelo=0.21, paso=2.5),
}
COJEA = 0.08
GIRADAS = ('retroceder', 'lateral-izquierda', 'lateral-derecha')
# los golpes: (altura mínima del puño en el impacto en el hombre, máxima), a escala en la mujer
ALTURA_GOLPE = {'seguida-1': (1.35, 1.62), 'seguida-2': (1.35, 1.62), 'golpe-de-prestado': (1.15, 1.45)}
ALCANCE = ('seguida-1', 'seguida-2', 'entrada')
CHASQUIDO = ('seguida-1', 'seguida-2')
PASADA = ('seguida-1', 'seguida-2', 'golpe-de-prestado')
# el puño que se busca en la cara a propósito
CARA_BUSCADA = {'descolgar': 'R', 'salir': 'R'}


# ---------------------------------------------------------------- los fundidos del cliente
def fundidos_del_cliente():
    """{gesto: (tipo, entraMs)} de INFO_DE_GESTOS (gestos.ts), y la regla de `fundidoEntre`."""
    t = open(GESTOS_TS, encoding='utf-8').read()
    info = {}
    for m in re.finditer(r"^\s*'?([a-z0-9-]+)'?\s*:\s*\{\s*tipo:\s*'([a-z-]+)',\s*duracionMs:\s*[^,]+,\s*entraMs:\s*(\d+)", t, re.M):
        info[m.group(1)] = (m.group(2), int(m.group(3)))
    m = re.search(r'FUNDIDO_DE_LEVANTARSE_MS\s*=\s*(\d+)', t)
    levantarse = int(m.group(1)) if m else 160

    def fundido(de, a):
        ta, ea = info[a]
        td = info[de][0]
        if td == 'golpe' and ta == 'golpe':
            return 60
        if de == 'derribado' and a == 'levantarse':
            return levantarse
        if ta == 'marcha' and td != 'marcha':
            return 200
        return ea
    return info, fundido


# (gesto, clip, de dónde sale: 'fin' o 'bucle') -> (gesto, clip): lo que el juego encadena
SECUENCIAS = [
    ('guardia', 'guardia', 'bucle', g, c) for g, c in (
        ('seguida-1', 'seguida-1'), ('seguida-2', 'seguida-2'), ('entrada', 'entrada'), ('cierre', 'cierre'),
        ('empellon', 'empellon'), ('replica', 'replica'), ('quiebro', 'quiebro-izquierda'), ('quiebro', 'quiebro-derecha'),
        ('quiebro', 'quiebro-atras'), ('quiebro', 'quiebro-delante'), ('tocado', 'tocado'), ('tocado', 'tocado-espalda'),
        ('derribado', 'derribado'), ('derribado', 'derribado-espalda'), ('descolocado', 'descolocado'), ('avance', 'avance'))
] + [
    ('entrada', 'entrada', 'fin', 'seguida-1', 'seguida-1'), ('seguida-1', 'seguida-1', 'fin', 'seguida-2', 'seguida-2'),
    ('seguida-2', 'seguida-2', 'fin', 'cierre', 'cierre'),
] + [(g, c, 'fin', 'guardia', 'guardia') for g, c in (
    ('seguida-1', 'seguida-1'), ('seguida-2', 'seguida-2'), ('cierre', 'cierre'), ('entrada', 'entrada'), ('empellon', 'empellon'),
    ('replica', 'replica'), ('quiebro', 'quiebro-izquierda'), ('quiebro', 'quiebro-derecha'), ('tocado', 'tocado'),
    ('tocado', 'tocado-espalda'), ('derribado', 'derribado'), ('derribado', 'derribado-espalda'), ('levantarse', 'levantarse'))] + [
    ('guardia', 'guardia', 'bucle', 'desconectado', 'caer'), ('desconectado', 'caer', 'fin', 'desconectado', 'desconectado'),
    ('desconectado', 'desconectado', 'bucle', 'levantarse', 'levantarse'),
    ('reposo', 'reposo', 'bucle', 'guardia', 'guardia'), ('guardia', 'guardia', 'bucle', 'reposo', 'reposo'),
    ('reposo', 'reposo', 'bucle', 'descolgar', 'descolgar'), ('descolgar', 'descolgar', 'fin', 'salir', 'salir'),
    ('andar', 'pasear', 'bucle0', 'golpe-de-prestado', 'golpe-de-prestado'),
    ('golpe-de-prestado', 'golpe-de-prestado', 'fin', 'andar', 'pasear'),
    ('guardia', 'guardia-celador', 'bucle', 'tocado', 'tocado'), ('guardia', 'guardia-celador', 'bucle', 'respuesta', 'respuesta'),
    ('respuesta', 'respuesta', 'fin', 'guardia', 'guardia-celador'), ('tocado', 'tocado', 'fin', 'guardia', 'guardia-celador'),
    ('guardia', 'guardia-celador', 'bucle', 'derribado', 'derribado'),
    ('guardia', 'guardia', 'bucle', 'andar', 'andar'), ('andar', 'andar', 'bucle0', 'guardia', 'guardia'),
    ('correr', 'correr', 'bucle0', 'guardia', 'guardia'), ('apuntar', 'apuntar', 'bucle', 'tocado', 'tocado'),
    ('rescatar', 'rescatar', 'fin', 'guardia', 'guardia'), ('guardia', 'guardia', 'bucle', 'victoria', 'victoria'),
    ('reposo', 'reposo', 'bucle', 'rescatar', 'rescatar'),
]
# lo que el cliente de hoy hace (no respeta `entraCon` ni pinta levantarse al volver): se mide, no cuenta
DEL_CLIENTE = [('guardia', 'guardia', 'bucle', 'desconectado', 'desconectado'),
               ('desconectado', 'desconectado', 'bucle', 'reposo', 'reposo')]
CLAVE = ['cabeza', 'pecho', 'caderas'] + [b + S for S in 'LR' for b in ('mano_', 'antebrazo_', 'pie_', 'pierna_', 'punta_')]


# ---------------------------------------------------------------- lectura
def cargar(sexo):
    nombre = 'clips-%s.glb' % ('mujer' if sexo == 'f' else 'hombre')
    ruta = args.get('glb') or os.path.join(EMP, nombre)
    info = json.load(open(args.get('json') or os.path.join(OBRA, 'clips-%s.json' % sexo), encoding='utf-8'))
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = 30
    sc.render.fps_base = 1.0
    bpy.ops.import_scene.gltf(filepath=ruta)
    arm = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
    if arm.animation_data is None:
        arm.animation_data_create()
    for tr in list(arm.animation_data.nla_tracks):
        arm.animation_data.nla_tracks.remove(tr)
    acciones = {}
    for a in bpy.data.actions:
        n = a.name
        for suf in ('_esqueleto', '_raiz'):
            if suf in n:
                n = n.split(suf)[0]
        acciones[n] = a
    return arm, acciones, info


def vec(v):
    return np.array([v[0], v[1], v[2]], dtype=float)


def muestrear(arm, act):
    """Por fotograma: cabeza y cola de cada hueso en el mundo y su giro (3x3) respecto al reposo."""
    for pb in arm.pose.bones:
        pb.location = (0.0, 0.0, 0.0)
        pb.rotation_mode = 'QUATERNION'
        pb.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
        pb.scale = (1.0, 1.0, 1.0)
    arm.animation_data.action = act
    f0, f1 = act.frame_range
    sc = bpy.context.scene
    M = arm.matrix_world
    M3 = M.to_3x3()
    out = []
    for fr in range(int(round(f0)), int(round(f1)) + 1):
        sc.frame_set(fr)
        d = {}
        for pb in arm.pose.bones:
            R = (M3 @ pb.matrix.to_3x3() @ arm.data.bones[pb.name].matrix_local.to_3x3().inverted() @ M3.inverted())
            d[pb.name] = (vec(M @ pb.head), vec(M @ pb.tail), R)
        out.append(d)
    return out


# ---------------------------------------------------------------- medidas
FWD = Vector((0.0, -1.0, 0.0))


def bisagras_de_reposo(arm):
    M = arm.matrix_world
    h = {b.name: M @ b.head_local for b in arm.data.bones}
    t = {b.name: M @ b.tail_local for b in arm.data.bones}
    out = {}
    for S in 'LR':
        u = (h['antebrazo_' + S] - h['brazo_' + S]).normalized()
        out['codo_' + S] = ('brazo_' + S, 'antebrazo_' + S, 'mano_' + S, u.cross(FWD).normalized())
        u = (h['pierna_' + S] - h['muslo_' + S]).normalized()
        out['rodilla_' + S] = ('muslo_' + S, 'pierna_' + S, 'pie_' + S, u.cross(-FWD).normalized())
    return out, h, t


def swing_twist(q, eje):
    v = Vector((q.x, q.y, q.z))
    p = eje * v.dot(eje)
    tw = Quaternion((q.w, p.x, p.y, p.z))
    if tw.magnitude < 1e-9:
        return 0.0
    tw.normalize()
    a = 2 * math.atan2(Vector((tw.x, tw.y, tw.z)).dot(eje), tw.w)
    return (a + math.pi) % (2 * math.pi) - math.pi


def articulaciones(fs, bis, hr):
    """Por fotograma y articulación: (flexión, desvío del plano, giro del hueso de abajo sobre su eje)."""
    out = []
    for d in fs:
        r = {}
        for k, (a, b, c, h0) in bis.items():
            pa, pb_, pc = d[a][0], d[b][0], d[c][0]
            d1 = pb_ - pa
            d2 = pc - pb_
            d1 /= np.linalg.norm(d1)
            d2 /= np.linalg.norm(d2)
            h = vec(d[a][2] @ h0)
            flex = math.degrees(math.atan2(float(np.cross(d1, d2) @ h), float(d1 @ d2)))
            fuera = math.degrees(math.asin(max(-1.0, min(1.0, float(d2 @ h)))))
            # el giro del hueso de abajo respecto al de arriba, sobre su propio eje (sin el de reposo)
            q = (d[a][2].inverted() @ d[b][2]).to_quaternion()
            eje = (hr[c] - hr[b]).normalized()
            tw = math.degrees(swing_twist(q, eje))
            r[k] = (flex, fuera, tw)
        for S in 'LR':
            # la mano va de la muñeca a los nudillos (la cabeza de `dedos`): la cola que deja el importador de
            # glTF no es la del esqueleto de la forja
            a = d['antebrazo_' + S][0]
            b = d['mano_' + S][0]
            c = d['dedos_' + S][0]
            u, v = b - a, c - b
            r['muneca_' + S] = math.degrees(math.acos(max(-1.0, min(1.0, float(u @ v / (np.linalg.norm(u) * np.linalg.norm(v)))))))
        out.append(r)
    return out


def cara(fs, esc):
    """Lo que el puño se mete en la cabeza o el cuello (m), por fotograma y mano."""
    out = []
    for d in fs:
        h0 = d['cabeza'][0]
        centro = h0 + vec(d['cabeza'][2] @ Vector((0.0, -0.02, 0.075))) * esc
        rc = 0.10 * esc
        c0, c1 = d['cuello'][0], d['cabeza'][0]
        r = {}
        for S in 'LR':
            m0, m1 = d['mano_' + S][0], d['dedos_' + S][0]
            puno = m0 + (m1 - m0) * 0.7
            rp = 0.045 * esc
            e1 = rc + rp - np.linalg.norm(puno - centro)
            ab = c1 - c0
            t = max(0.0, min(1.0, float((puno - c0) @ ab / max(ab @ ab, 1e-12))))
            e2 = 0.055 * esc + rp - np.linalg.norm(puno - (c0 + ab * t))
            r[S] = max(e1, e2)
        out.append(r)
    return out


def suela(d, hr, S):
    """Lo más bajo del pie sobre el suelo (el tobillo y la bola respecto a su altura de reposo)."""
    return min(d['pie_' + S][0][2] - hr['pie_' + S].z, d['punta_' + S][0][2] - hr['punta_' + S].z)


def punto_de_apoyo(d, hr, S):
    a = d['pie_' + S][0][2] - hr['pie_' + S].z
    b = d['punta_' + S][0][2] - hr['punta_' + S].z
    return d['pie_' + S][0] if a < b else d['punta_' + S][0]


def medir_marcha(fs, hr, v, esc):
    n = len(fs) - 1                        # el último es el primero
    dur = n / FPS
    zs = {S: np.array([suela(fs[i], hr, S) for i in range(n)]) for S in 'LR'}
    z0 = min(zs['L'].min(), zs['R'].min())
    apoyo = {S: zs[S] < z0 + 0.015 for S in 'LR'}
    vuela = ~(apoyo['L'] | apoyo['R'])
    cad = np.array([fs[i]['caderas'][0] for i in range(n)])
    res = dict(ciclo_s=round(dur, 3), pasos_min=round(120.0 / dur, 1), bote_m=round(float(np.ptp(cad[:, 2])), 3),
               vuelo_por_paso_s=round(float(vuela.mean()) * dur / 2.0, 3),
               apoyo=[round(float(apoyo['L'].mean()), 3), round(float(apoyo['R'].mean()), 3)],
               paso_m=round(v * dur / 2.0, 3))
    # el resbalón: la velocidad en el suelo (el cuerpo va a v hacia -Y) de lo que apoya, en dos fotogramas seguidos
    res_v = []
    for S in 'LR':
        for i in range(n):
            j = (i + 1) % n
            if zs[S][i] < z0 + 0.012 and zs[S][j] < z0 + 0.012:
                # el MISMO punto en los dos fotogramas, el que está abajo en los DOS (el talón que despega mientras la
                # bola se posa no es resbalar: el apoyo pasa de uno a otro)
                alto = {b_: max(fs[k][b_ + S][0][2] - hr[b_ + S].z for k in (i, j)) for b_ in ('pie_', 'punta_')}
                b = min(alto, key=alto.get)
                if alto[b] > z0 + 0.012:
                    continue
                pa, pb = fs[i][b + S][0], fs[j][b + S][0]
                vy = (pb[1] - pa[1]) * FPS - v            # en el sitio el pie apoyado va hacia +Y a v
                vx = (pb[0] - pa[0]) * FPS
                res_v.append(math.hypot(vx, vy))
    if res_v:
        res['resbalon_p50'] = round(float(np.percentile(res_v, 50)), 3)
        res['resbalon_p90'] = round(float(np.percentile(res_v, 90)), 3)
    manos = [np.ptp([fs[i]['mano_' + S][0][1] - fs[i]['caderas'][0][1] for i in range(n)]) for S in 'LR']
    res['mano_m'] = round(float(min(manos)), 3)
    return res


def pose_rel(d):
    r = d['raiz'][0]
    return {k: d[k][0] - np.array([r[0], r[1], 0.0]) for k in CLAVE}


# ---------------------------------------------------------------- la batería
def comprobar(sexo):
    arm, acc, info = cargar(sexo)
    bis, hr, tr = bisagras_de_reposo(arm)
    esc = (hr['cabeza'].z) / 1.62 if sexo == 'f' else 1.0
    esc = 0.94 if sexo == 'f' else 1.0
    fallos, datos = [], {}
    series = {}
    nombres = sorted(n for n in acc if n in info)
    for nombre in nombres:
        necesario = SOLO is None or nombre in SOLO or any(nombre in (s[1], s[4]) for s in SECUENCIAS)
        if not necesario:
            continue
        series[nombre] = muestrear(arm, acc[nombre])
    for nombre in nombres:
        if SOLO is not None and nombre not in SOLO:
            continue
        fs = series[nombre]
        ic = info[nombre]
        d = {}
        art = articulaciones(fs, bis, hr)
        peor = {}
        for k in bis:
            flex = [a[k][0] for a in art]
            fuera = [abs(a[k][1]) for a in art]
            tw = [abs(a[k][2]) for a in art]
            i = int(np.argmax(fuera))
            peor[k] = dict(fuera=round(max(fuera), 1), f_fuera=i, flex_max=round(max(flex), 1), flex_min=round(min(flex), 1),
                           giro=round(max(tw), 1))
            if max(fuera) > UMBRAL['bisagra_grados']:
                fallos.append('%s: %s fuera de su bisagra %.0f° (f%d; tope %.0f°)' % (nombre, k, max(fuera), i, UMBRAL['bisagra_grados']))
            if min(flex) < UMBRAL['al_reves']:
                fallos.append('%s: %s doblado al revés %.0f° (f%d)' % (nombre, k, min(flex), int(np.argmin(flex))))
            if k.startswith('codo') and max(flex) > UMBRAL['codo_max']:
                fallos.append('%s: %s plegado %.0f° (tope %.0f°, f%d)' % (nombre, k, max(flex), UMBRAL['codo_max'], int(np.argmax(flex))))
            if k.startswith('rodilla'):
                malos = [(t_, i_) for i_, (t_, f_) in enumerate(zip(tw, flex))
                         if t_ > (UMBRAL['tibia_recta'] if f_ < 25.0 else UMBRAL['tibia_doblada'])]
                if malos:
                    t_, i_ = max(malos)
                    fallos.append('%s: la tibia %s girada %.0f° sobre la rodilla (f%d, rodilla a %.0f°)' % (nombre, k[-1], t_, i_, flex[i_]))
        for S in 'LR':
            mu = [a['muneca_' + S] for a in art]
            if max(mu) > UMBRAL['muneca']:
                fallos.append('%s: la muñeca %s doblada %.0f° (f%d)' % (nombre, S, max(mu), int(np.argmax(mu))))
        d['articulaciones'] = peor
        # ═══ GIROS DE UN FOTOGRAMA A OTRO ═══ un hueso que da media vuelta en 33 ms es un salto (un giro que
        # cambia de signo, una bisagra que se da la vuelta), no un golpe rápido
        saltos = []
        for i in range(1, len(fs)):
            for b in CUERPO:
                q = (fs[i - 1][b][2].inverted() @ fs[i][b][2]).to_quaternion()
                a = math.degrees(2.0 * math.acos(min(1.0, abs(q.w))))
                if a > UMBRAL['giro_por_fotograma']:
                    saltos.append((a, i, b))
        if saltos:
            a, i, b = max(saltos)
            fallos.append('%s: %s gira %.0f° de un fotograma a otro (f%d; %d saltos de más de %.0f°)' % (
                nombre, b, a, i, len(saltos), UMBRAL['giro_por_fotograma']))
        d['saltos'] = [[round(a, 1), i, b] for a, i, b in sorted(saltos, reverse=True)[:6]]
        # la mano en la cara
        cr = cara(fs, esc)
        for S in 'LR':
            e = [c[S] for c in cr]
            if CARA_BUSCADA.get(nombre) == S:
                continue
            if max(e) > UMBRAL['cara_m']:
                fallos.append('%s: el puño %s se mete %.0f cm en la cara o el cuello (f%d)' % (nombre, S, 100 * max(e), int(np.argmax(e))))
            d['cara_' + S] = round(max(e), 3)
        # la marcha
        if ic.get('velocidad_m_s') and nombre not in GIRADAS:
            v = float(ic['velocidad_m_s'])
            m = medir_marcha(fs, hr, v, esc)
            d['marcha'] = m
            reglas = MARCHA.get(nombre)
            if reglas:
                a, b = reglas['pasos']
                if not a <= m['pasos_min'] <= b:
                    fallos.append('%s: %.0f pasos por minuto (una persona a %.1f m/s da %d-%d)' % (nombre, m['pasos_min'], v, a, b))
                if m['bote_m'] > reglas['bote'] * esc + 1e-3:
                    fallos.append('%s: la cadera bota %.0f cm (tope %.0f)' % (nombre, 100 * m['bote_m'], 100 * reglas['bote'] * esc))
                if m['vuelo_por_paso_s'] > reglas['vuelo'] + 1e-3:
                    fallos.append('%s: %.0f ms en el aire por paso (tope %.0f)' % (nombre, 1000 * m['vuelo_por_paso_s'], 1000 * reglas['vuelo']))
                if 'paso' in reglas and m['paso_m'] > reglas['paso'] * esc:
                    fallos.append('%s: pasos de %.2f m (tope %.2f)' % (nombre, m['paso_m'], reglas['paso'] * esc))
                if 'mano' in reglas and m['mano_m'] < reglas['mano'] * esc:
                    fallos.append('%s: la mano va y viene %.0f cm (una persona andando, ≥ %.0f)' % (nombre, 100 * m['mano_m'], 100 * reglas['mano'] * esc))
                if abs(m['apoyo'][0] - m['apoyo'][1]) > COJEA:
                    fallos.append('%s: cojea (apoya el izquierdo el %.0f %% del ciclo y el derecho el %.0f %%)' % (
                        nombre, 100 * m['apoyo'][0], 100 * m['apoyo'][1]))
            if m.get('resbalon_p90', 0.0) > UMBRAL['resbalon_p90']:
                fallos.append('%s: el pie apoyado resbala %.2f m/s en el percentil 90 (tope %.2f)' % (nombre, m['resbalon_p90'], UMBRAL['resbalon_p90']))
        # los golpes
        ef = ic.get('efector')
        if ef and ic.get('impacto_fotogramas'):
            fi = ic['impacto_fotogramas'][0]
            # la punta del golpe: los nudillos (la cabeza de `dedos`) o la punta del pie (la cola de `punta`)
            ef_p = np.array([x['dedos_' + ef[-1]][0] if ef.startswith('mano') else x['punta_' + ef[-1]][0] for x in fs])
            raiz = np.array([x['raiz'][0] for x in fs])
            adel = -(ef_p[:, 1] - raiz[:, 1])
            g = dict(impacto=fi, alcance=round(float(adel[fi]), 3), altura=round(float(ef_p[fi, 2]), 3),
                     pasada=round(float(adel[fi:].max() - adel[fi]), 3))
            if fi + 5 < len(adel):
                g['vuelve_5f'] = round(float(adel[fi] - adel[fi + 5]), 3)
            d['golpe'] = g
            if nombre in ALTURA_GOLPE:
                a, b = ALTURA_GOLPE[nombre]
                if not a * esc <= g['altura'] <= b * esc:
                    fallos.append('%s: el golpe llega a %.2f m de altura (entre %.2f y %.2f)' % (nombre, g['altura'], a * esc, b * esc))
            if nombre in ALCANCE and g['alcance'] < UMBRAL['alcance_m']:
                fallos.append('%s: el golpe llega a %.2f m de la raíz (la superficie del blanco está a %.2f)' % (nombre, g['alcance'], UMBRAL['alcance_m']))
            if nombre in PASADA and g['pasada'] > UMBRAL['pasada_m']:
                fallos.append('%s: el puño se pasa %.0f cm del impacto (tope %.0f)' % (nombre, 100 * g['pasada'], 100 * UMBRAL['pasada_m']))
            if nombre in CHASQUIDO and g.get('vuelve_5f', 1.0) < UMBRAL['chasquido_m']:
                fallos.append('%s: el brazo sólo vuelve %.0f cm en 5 fotogramas (sin chasquido)' % (nombre, 100 * g.get('vuelve_5f', 0)))
        datos[nombre] = d
    # los fundidos
    gestos, fundido = fundidos_del_cliente()
    trans, trans_cliente = [], []
    for lista, destino in ((SECUENCIAS, trans), (DEL_CLIENTE, trans_cliente)):
        for gd, cd, modo, ga, ca in lista:
            if cd not in series or ca not in series or gd not in gestos or ga not in gestos:
                continue
            if SOLO is not None and cd not in SOLO and ca not in SOLO:
                continue
            ms = fundido(gd, ga)
            b = pose_rel(series[ca][0])
            if modo == 'fin':
                desde = [series[cd][-1]]
            elif modo == 'bucle0':
                desde = [series[cd][0]]
            else:
                desde = series[cd]
            peor = (0.0, '')
            for x in desde:
                a = pose_rel(x)
                for k in CLAVE:
                    dd = float(np.linalg.norm(a[k] - b[k]))
                    if dd > peor[0]:
                        peor = (dd, k)
            vel = peor[0] / max(ms, 1) * 1000.0
            fila = dict(de='%s(%s)' % (cd, modo), a=ca, ms=ms, m=round(peor[0], 3), hueso=peor[1], ms_=round(vel, 2))
            destino.append(fila)
            if destino is trans and vel > UMBRAL['fundido_ms']:
                fallos.append('fundido %s -> %s en %d ms: %s salta %.0f cm (%.1f m/s)' % (fila['de'], ca, ms, peor[1], 100 * peor[0], vel))
    res = dict(sexo=sexo, fallos=fallos, clips=datos, fundidos=trans, fundidos_del_cliente=trans_cliente, umbrales=UMBRAL)
    os.makedirs(SAL, exist_ok=True)
    with open(os.path.join(SAL, 'movimiento_%s.json' % sexo), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(res, f, indent=1, ensure_ascii=False)
        f.write('\n')
    print('== movimiento (%s): %d clips, %d fallos' % (sexo, len(datos), len(fallos)))
    for x in fallos:
        print('  -', x)
    for x in trans_cliente:
        print('  (cliente) %s -> %s en %d ms: %s %.0f cm = %.1f m/s' % (x['de'], x['a'], x['ms'], x['hueso'], 100 * x['m'], x['ms_']))
    return fallos


total = []
for s in (args['sexo'],) if args.get('sexo') else ('m', 'f'):
    total += comprobar(s)
sys.exit(1 if total else 0)
