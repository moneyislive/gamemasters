"""Bateria sobre la MALLA DEFORMADA de lo que baja el juego (los GLB empaquetados, en
obra/empaquetado/ justo antes de comprimirlos), clip a clip, como la vera three.js.

  blender -b --factory-startup --python comprobar.py -- fig=desvelado-hombre-gabardina [clips=andar+cierre]

Mide por fotograma: punto mas bajo de la malla (suelo), flotar en los tramos tumbados, solapes entre
partes del cuerpo (BVH de triangulos, restando los del reposo), el faldon contra las piernas,
deslizamiento en mundo de lo que toca el suelo (con la raiz aplicada), la palma en el empellon y en
el remate, y la correlacion brazo-pierna en la locomocion. Escribe obra/comprobacion_<fig>.json y
devuelve 1 si algo no pasa.

═══ LO QUE AÑADIÓ LA SEGUNDA PASADA (cada una vista en rojo contra la primera entrega) ═══

  · MIRIÑAQUE: en reposo y en guardia, el bajo del faldón no pasa de 1,15 veces el de la malla sin
    posar (ancho y fondo) ni del ancho de hombros. La primera entrega medía 0,63 × 0,50 contra 0,49 ×
    0,40 sin posar, y 0,72 de fondo en la guardia.
  · TALLE: ninguna junta del faldón por encima de la cabeza del hueso `caderas` (en su vertical), con
    la cadera a menos de ~37° de la vertical (correr va a 26°, los quiebros a 30°; sentado echado
    atrás, de rodillas volcado o a gatas la tela cae al suelo y «por encima» no es volar). La primera
    volaba como una capa hasta 29-53 cm por encima al correr, en la acometida y en los quiebros.
  · DIENTES DE SIERRA: picos de pesos mal copiados. No sirve contar aristas estiradas (una figura sana
    estira las de la entrepierna en la patada: 60-80 aristas de hasta 15 cm, igual que una rota): se
    mide cuánto se aparta cada vértice de la media de sus vecinos (el laplaciano) respecto al reposo. Un
    estirón sano mueve a los vecinos juntos; un pico, no. Sanas: hasta 11 cm y 30 vértices de más de 3
    cm; las cuatro pesadas desde el LOD1 en la primera entrega, 17-27 cm y 60-97 vértices.
  · PIE QUE PATINA: un pie a menos de 2 cm del suelo en dos fotogramas seguidos que se mueve a más de
    1 m/s (en la marcha, descontada la velocidad del clip). Los quiebros empezaban patinando a 20-29 m/s.
  · GOLPES: recorrido mínimo del puño o el pie desde la guardia, alcance hasta el blanco (a 1,1 m: su
    superficie a ~0,9) y el pico de velocidad en el fotograma que entra al impacto.
  · LEVITA: un fotograma fuera de los vuelos declarados sin nada del cuerpo a menos de 4,5 cm del suelo.

Es `critica/analisis.py` del director de arte del prototipo convertido en prueba, llevado al reparto
entero y a los ficheros que de verdad se sirven.
"""
import sys
import os
import json
import math
import numpy as np
import bpy
import bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import reparto  # noqa: E402

# los GLB empaquetados antes de la compresión meshopt (el importador de Blender no la lee): la misma
# geometría, los mismos pesos y los mismos clips que baja el juego
REC = os.environ.get('REPARTO_EMPAQUETADO') or os.path.join(AQUI, 'obra', 'empaquetado')
SAL = os.environ.get('REPARTO_INFORMES') or os.path.join(AQUI, 'obra')
CLIPS_JSON = os.environ.get('REPARTO_CLIPS_JSON') or os.path.join(AQUI, 'obra')
args = dict(a.split('=', 1) for a in sys.argv[sys.argv.index('--') + 1:]) if '--' in sys.argv else {}
FIG = args.get('fig', 'desvelado-hombre-gabardina')
SOLO = args.get('clips')
FICHA = reparto.FIGURAS[FIG]
VAR = FICHA['variante']
ANIM = 'clips-%s.glb' % ('mujer' if FICHA['sexo'] == 'f' else 'hombre')
# el LOD0 de la figura: el de su estilo (desvelados) o el de su familia; si no está (una entrega vieja),
# el de la familia
LOD0 = reparto.archivo_lod0(FIG) if os.path.exists(os.path.join(REC, reparto.archivo_lod0(FIG))) else FICHA['familia'] + '.glb'

UMBRAL = {
    'suelo_m': -0.01,               # nada de la malla por debajo de -1 cm
    # la animación es común a las figuras de un sexo, y tumbado de espaldas la Mole (plumífero) o el
    # chubasquero (la capucha recogida) apoyan 4 cm antes que la Celadora: la de traje flota eso
    'flota_m': 0.045,               # en los tramos de contacto, a menos de 4,5 cm
    'solape_cuerpo': 6,             # pares de triangulos nuevos (sobre el reposo) entre partes del cuerpo
    'solape_muslo_torso': 40,       # muslo contra vientre: agachado se tocan de verdad (y más en el ancho y la Mole)
    'faldon_pct': 12.0,             # % de fotogramas con el faldon atravesado por una pierna
    'faldon_pares': 40,             # pares de triangulos faldon-pierna tolerados en un fotograma
    'desliza_ms': 0.35,             # mediana de la velocidad de lo apoyado (m/s), fuera de la locomocion
    'miriñaque': 1.15,              # bajo en reposo y guardia / bajo sin posar
    'talle_m': 0.0,                 # altura maxima de una junta del faldon sobre la cabeza de caderas
    # sanas: hasta 16 cm y 66 vertices (el Celador ancho de rodillas y sentado); las cuatro rotas de la
    # primera entrega, 17-27 cm y 60-132 vertices en la patada, la carrera y el trote
    'pico_m': 0.17,                 # un vertice que se aparta de sus vecinos mas que esto (sobre el reposo): diente de sierra
    'pico_vertices': 80,            # o mas de estos vertices apartados mas de 3 cm en un fotograma
    'patina_z': 0.02,               # un pie a menos de esto del suelo...
    'patina_ms': 1.0,               # ...que se mueve a mas de esto
    'levita_m': 0.045,              # fuera de los vuelos, algo del cuerpo a menos de esto del suelo (ver flota_m)
    'alcance_m': 0.80,              # el golpe llega a menos de 0,1 m de la superficie del blanco (0,9)
}
# el hueso que golpea, si el horneado no lo dice (la primera entrega no lo decía)
EFECTOR = {'entrada': 'mano_R', 'seguida-1': 'mano_L', 'seguida-2': 'mano_R', 'cierre': 'pie_R', 'empellon': 'mano_R',
           'replica': 'mano_R', 'respuesta': 'mano_R', 'golpe-de-prestado': 'mano_R', 'avance': 'mano_R'}
# recorrido minimo del efector desde la guardia hasta el impacto (la revisión: jab 35 cm, directo 45,
# empellón 45)
RECORRIDO = {'seguida-1': 0.35, 'seguida-2': 0.45, 'empellon': 0.45, 'entrada': 0.45, 'replica': 0.45,
             'respuesta': 0.35, 'cierre': 0.8, 'golpe-de-prestado': 0.35, 'avance': 0.35}
# el avance es un vuelo de 10 m que acaba en la palmada: su pico de velocidad es el del vuelo, no el del golpe
SIN_PICO = ('avance',)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.fps = 30
sc.render.fps_base = 1.0

bpy.ops.import_scene.gltf(filepath=os.path.join(REC, LOD0))
arm = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
mallas = [o for o in bpy.data.objects if o.type == 'MESH']
ob = next(o for o in mallas if o.name.split('.')[0] == VAR)
for o in mallas:
    if o is not ob:
        bpy.data.objects.remove(o, do_unlink=True)
arm.name = 'fig_arm'
me = ob.data
nv = len(me.vertices)

vg = {g.index: g.name for g in ob.vertex_groups}
ALIAS = {'dedos_L': 'mano_L', 'dedos2_L': 'mano_L', 'pulgar_L': 'mano_L', 'dedos_R': 'mano_R', 'dedos2_R': 'mano_R',
         'pulgar_R': 'mano_R', 'giro_L': 'antebrazo_L', 'giro_R': 'antebrazo_R'}
dom = np.empty(nv, dtype=object)
dom_real = np.empty(nv, dtype=object)
for v in me.vertices:
    best, bw = None, -1
    for g in v.groups:
        if g.weight > bw:
            best, bw = vg[g.group], g.weight
    dom_real[v.index] = best
    dom[v.index] = ALIAS.get(best, best)
es_faldon = np.array([str(d).startswith('faldon') for d in dom_real])
me.calc_loop_triangles()
tris = np.array([t.vertices[:] for t in me.loop_triangles], dtype=np.int64)
# en una familia la misma zona puede tener un material por variante con el mismo nombre: el importador
# de Blender los llama mat_piel, mat_piel.001...; la zona es el nombre sin el sufijo
tri_mat = np.array([me.materials[t.material_index].name.split('.')[0] for t in me.loop_triangles], dtype=object)


def coords_eval():
    dg = bpy.context.evaluated_depsgraph_get()
    oe = ob.evaluated_get(dg)
    m = oe.to_mesh()
    co = np.empty(len(m.vertices) * 3)
    m.vertices.foreach_get('co', co)
    oe.to_mesh_clear()
    co = co.reshape(-1, 3)
    M = np.array(ob.matrix_world)
    return co @ M[:3, :3].T + M[:3, 3]


arm.data.pose_position = 'REST'
bpy.context.view_layer.update()
R = coords_eval()
arm.data.pose_position = 'POSE'

# islas (soldando por posicion): el cuerpo es la mayor; el faldon, la de sus huesos
key = np.round(R / 1e-5).astype(np.int64)
_, soldado = np.unique(key, axis=0, return_inverse=True)
soldado = soldado.ravel()
par = np.arange(soldado.max() + 1)


def find(x):
    while par[x] != x:
        par[x] = par[par[x]]
        x = par[x]
    return x


for a, b, c in soldado[tris]:
    for u, w in ((a, b), (b, c)):
        ru, rw = find(u), find(w)
        if ru != rw:
            par[ru] = rw
isla = np.array([find(i) for i in range(len(par))])[soldado]
u_, cnt = np.unique(isla, return_counts=True)
cuerpo_isla = u_[np.argmax(cnt)]
cu = isla == cuerpo_isla

res = {'fig': FIG, 'animaciones': ANIM, 'lod0': LOD0}

# ---------------------------------------------------------------- medidas de reposo
H = float(R[:, 2].max())
bones = {b.name: b for b in arm.data.bones}
Mw = arm.matrix_world


def head(b):
    return np.array(Mw @ bones[b].head_local)


mat_v = np.empty(nv, dtype=object)
for (a, b, c), m in zip(tris, tri_mat):
    mat_v[a] = mat_v[b] = mat_v[c] = m
zb = head('brazo_L')[2]
sel = cu & (R[:, 2] > zb - 0.07) & (R[:, 2] < zb + 0.10) & ~np.isin(dom, ['mano_L', 'mano_R'])
hombros = float(R[sel, 0].max() - R[sel, 0].min())
selc = cu & (dom == 'cabeza') & (mat_v == 'mat_piel') & (R[:, 1] < head('cabeza')[1] - 0.03)
barbilla = float(R[selc, 2].min())
cab_alto = H - barbilla
selp = cu & np.isin(dom, ['pie_L', 'punta_L'])
res['reposo'] = dict(altura=round(H, 3), hombros_ancho=round(hombros, 3), cabeza_alto=round(cab_alto, 3),
                     cabezas=round(H / cab_alto, 2), calzado_largo=round(float(R[selp, 1].max() - R[selp, 1].min()), 3),
                     calzado_ancho=round(float(R[selp, 0].max() - R[selp, 0].min()), 3))
selm = cu & (dom == 'mano_L')
res['reposo']['mano_ancho_max'] = round(float(np.ptp(R[selm][:, 1])), 3)
# el tronco / la altura (la revisión: el alto no era enjuto ni el ancho ancho): ancho máximo del tronco sin
# brazos entre la cadera y los hombros
brazo_dom = np.isin(dom, ['mano_L', 'mano_R', 'antebrazo_L', 'antebrazo_R', 'brazo_L', 'brazo_R'])
zc0 = head('caderas')[2]
seltr = ~brazo_dom & ~es_faldon & (R[:, 2] > zc0) & (R[:, 2] < zb)
if seltr.any():
    res['reposo']['tronco_ancho'] = round(float(np.ptp(R[seltr, 0])), 3)
    res['reposo']['tronco_por_altura'] = round(float(np.ptp(R[seltr, 0])) / H, 3)


def bajo_del_faldon(P):
    """Ancho y fondo del bajo del faldón: sus vértices a menos de 12 cm de su punto más bajo."""
    F = P[es_faldon]
    zmin_f = F[:, 2].min()
    h = F[F[:, 2] < zmin_f + 0.12]
    return float(np.ptp(h[:, 0])), float(np.ptp(h[:, 1]))


# el miriñaque sólo se mide en las prendas con faldón (gabardina y Mole): la chaqueta del Celador y el
# chubasquero siguen en parte al primer hueso del faldón y su bajo no es un faldón
CON_FALDON = FICHA.get('estilo') in ('gabardina', 'mole')
if es_faldon.any() and CON_FALDON:
    a0, f0 = bajo_del_faldon(R)
    res['reposo']['bajo_sin_posar'] = [round(a0, 3), round(f0, 3)]

# aristas abiertas y normales opuestas por material (sin las piezas finas de doble cara)
bm = bmesh.new()
bm.from_mesh(me)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
finas = {'mat_gafas', 'mat_montura'}
abiertas = [e for e in bm.edges if e.is_boundary and not any(me.materials[f.material_index].name.split('.')[0] in finas
                                                                for f in e.link_faces)]
res['aristas_abiertas'] = len(abiertas)
bm.free()
nrm = np.empty(nv * 3)
me.vertices.foreach_get('normal', nrm)
nrm = nrm.reshape(-1, 3)
a_, b_, c_ = R[tris[:, 0]], R[tris[:, 1]], R[tris[:, 2]]
fn = np.cross(b_ - a_, c_ - a_)
ln = np.linalg.norm(fn, axis=1)
ok = ln > 1e-12
dd = np.einsum('ij,ij->i', (nrm[tris[:, 0]] + nrm[tris[:, 1]] + nrm[tris[:, 2]]) / 3, fn / np.maximum(ln, 1e-15)[:, None])
res['normales_opuestas'] = int(((dd < 0) & ok).sum())

# pesos de entrepierna
entre = 0
for v in me.vertices:
    ws = {vg[g.group]: g.weight for g in v.groups}
    if ws.get('muslo_L', 0) > 0.2 and ws.get('muslo_R', 0) > 0.2:
        entre += 1
res['verts_dos_muslos'] = entre

# los dientes de sierra: el laplaciano de cada vértice (su distancia a la media de sus vecinos) en el
# cuerpo sin faldón
E = np.array([e.vertices[:] for e in me.edges], dtype=np.int64)
E = E[~(es_faldon[E[:, 0]] | es_faldon[E[:, 1]])]
grado = np.zeros(nv)
np.add.at(grado, E[:, 0], 1)
np.add.at(grado, E[:, 1], 1)


def laplaciano(P):
    s = np.zeros_like(P)
    np.add.at(s, E[:, 0], P[E[:, 1]])
    np.add.at(s, E[:, 1], P[E[:, 0]])
    return np.linalg.norm(P - s / np.maximum(grado, 1)[:, None], axis=1)


lap0 = laplaciano(R)

# ---------------------------------------------------------------- grupos de triangulos
GR = {
    'mano_L': ['mano_L'], 'mano_R': ['mano_R'], 'antebrazo_L': ['antebrazo_L'], 'antebrazo_R': ['antebrazo_R'],
    'torso': ['columna', 'columna1', 'pecho'], 'cabeza': ['cabeza'],
    'muslo_L': ['muslo_L'], 'muslo_R': ['muslo_R'],
    'pierna_L': ['pierna_L', 'pie_L', 'punta_L'], 'pierna_R': ['pierna_R', 'pie_R', 'punta_R'],
}
tri_dom = dom[tris]
grupo_tri = {}
for g, hs in GR.items():
    m = np.isin(tri_dom, hs).sum(1) >= 2
    m &= cu[tris[:, 0]]
    grupo_tri[g] = tris[m]
grupo_tri['faldon'] = tris[es_faldon[tris].all(1)]
PARES = [('mano_L', 'cabeza'), ('mano_R', 'cabeza'), ('antebrazo_L', 'cabeza'), ('antebrazo_R', 'cabeza'),
         ('mano_L', 'torso'), ('mano_R', 'torso'), ('antebrazo_L', 'torso'), ('antebrazo_R', 'torso'),
         ('antebrazo_L', 'antebrazo_R'), ('mano_L', 'mano_R'), ('mano_L', 'antebrazo_R'), ('mano_R', 'antebrazo_L'),
         ('mano_L', 'muslo_L'), ('mano_R', 'muslo_R'),
         ('pierna_L', 'pierna_R'), ('muslo_L', 'pierna_R'), ('muslo_R', 'pierna_L'),
         ('muslo_L', 'torso'), ('muslo_R', 'torso')]
PARES_F = []
if len(grupo_tri['faldon']):
    PARES_F = [('faldon', g) for g in ('pierna_L', 'pierna_R', 'muslo_L', 'muslo_R', 'mano_L', 'mano_R', 'antebrazo_L', 'antebrazo_R')]


def solapes(P):
    bv = {}
    for g, t in grupo_tri.items():
        if len(t):
            bv[g] = BVHTree.FromPolygons([tuple(p) for p in P], [tuple(x) for x in t], all_triangles=True)
    out = {}
    for a, b in PARES + PARES_F:
        if a in bv and b in bv:
            out[a + '|' + b] = len(bv[a].overlap(bv[b]))
    return out


base = solapes(R)


def palma_idx(s):
    idx = np.where(cu & (dom_real == 'mano_' + s))[0]
    P = R[idx]
    c = P.mean(0)
    u, sv, vt = np.linalg.svd(P - c)
    n = vt[2]
    if (n[0] > 0) == (s == 'L'):
        n = -n
    t = (P - c) @ n
    return idx[t > 0.3 * t.max()], idx[t < 0.3 * t.min()]


palma = {s: palma_idx(s) for s in 'LR'}
grp = {g: np.where(cu & np.isin(dom, hs))[0] for g, hs in GR.items()}
pie_idx = {s: np.where(cu & np.isin(dom_real, ['pie_' + s, 'punta_' + s]))[0] for s in 'LR'}
cuerpo_idx = np.where(cu & ~es_faldon)[0]
huesos_faldon = [b for b in bones if b.startswith('faldon')]

# ---------------------------------------------------------------- animaciones
antes = set(bpy.data.actions.keys())
bpy.ops.import_scene.gltf(filepath=os.path.join(REC, ANIM))
nuevas = [a for a in bpy.data.actions if a.name not in antes]
for o in list(bpy.data.objects):
    if o.type == 'ARMATURE' and o != arm:
        bpy.data.objects.remove(o, do_unlink=True)
for a in nuevas:
    a.use_fake_user = True
if arm.animation_data is None:
    arm.animation_data_create()
info_clips = json.load(open(os.path.join(CLIPS_JSON, 'clips-%s.json' % FICHA['sexo']), encoding='utf-8'))


def nombre_clip(a):
    n = a.name
    for suf in ('_esqueleto', '_fig_arm', '_raiz'):
        if suf in n:
            n = n.split(suf)[0]
    return n


def pose_world(b):
    return np.array(arm.matrix_world @ arm.pose.bones[b].matrix)


def cola(b):
    return np.array(arm.matrix_world @ arm.pose.bones[b].tail)


# contactos que el clip busca a proposito: al ajustarse los punos, cada mano pellizca la bocamanga de
# la otra (se mide, pero no es un fallo; que los antebrazos se atraviesen si lo es)
CONTACTOS_BUSCADOS = {'imprimirse': ('mano_R|antebrazo_L', 'mano_L|antebrazo_R'),
                      # el puño con el auricular apoyado en la mejilla
                      'descolgar': ('mano_R|cabeza',), 'salir': ('mano_R|cabeza',)}
LOCO = ('pasear', 'andar', 'trotar', 'correr', 'andar-paraguas', 'retroceder', 'lateral-izquierda', 'lateral-derecha')
# la velocidad (m/s, Blender) con que va hacia atras el pie apoyado de una marcha en el sitio, por unidad de velocidad
PIE_EN_LA_MARCHA = {'retroceder': (0.0, -1.0), 'lateral-izquierda': (-1.0, 0.0), 'lateral-derecha': (1.0, 0.0)}
clips = {}
fallos = []
for act in sorted(nuevas, key=lambda a: nombre_clip(a)):
    nombre = nombre_clip(act)
    if SOLO and nombre not in SOLO.split('+'):
        continue
    ic = info_clips.get(nombre, {})
    # ═══ COMO THREE: CADA CLIP EMPIEZA DESDE LA POSE DE ENLACE ═══ El empaquetado quita las pistas que
    # se quedan en la pose de enlace (three devuelve solo esos huesos a ella: restoreOriginalState). Blender
    # no: un hueso sin pista se queda como lo dejo el clip anterior, y la punta del pie del trote metia la
    # victoria 2 cm bajo el suelo en esta bateria (horneada a -0,1 cm). Se vuelve a la pose de enlace.
    for pb in arm.pose.bones:
        pb.location = (0.0, 0.0, 0.0)
        pb.rotation_mode = 'QUATERNION'
        pb.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
        pb.scale = (1.0, 1.0, 1.0)
    arm.animation_data.action = act
    for tr in list(arm.animation_data.nla_tracks):
        arm.animation_data.nla_tracks.remove(tr)
    f0, f1 = act.frame_range
    frames = list(range(int(round(f0)), int(round(f1)) + 1))
    C = []
    zmin, zparte, sol, palmas, hb = [], [], [], [], []
    estiron, talle, bajos, efector, raices = [], [], [], [], []
    ef_hueso = ic.get('efector') or EFECTOR.get(nombre)
    for fr in frames:
        sc.frame_set(fr)
        P = coords_eval()
        C.append(P)
        z = P[:, 2]
        i = int(z.argmin())
        zmin.append(float(z.min()))
        zparte.append(str(dom_real[i]))
        sol.append(solapes(P))
        pl = {}
        for s in 'LR':
            a_, b_ = palma[s]
            d = P[a_].mean(0) - P[b_].mean(0)
            pl[s] = (d / np.linalg.norm(d)).round(2).tolist()
        palmas.append(pl)
        h = {}
        for b in ('caderas', 'pie_L', 'pie_R', 'mano_L', 'mano_R', 'cabeza'):
            h[b] = pose_world(b)[:3, 3].round(3).tolist()
        hb.append(h)
        # dientes de sierra
        dl = laplaciano(P) - lap0
        dl[es_faldon] = 0.0
        estiron.append((int((dl > 0.03).sum()), float(dl.max()), str(dom_real[int(dl.argmax())])))
        # el talle: ninguna junta del faldón por encima de la cabeza de caderas
        if huesos_faldon:
            # la vertical de la cadera: de su cabeza a la de columna (el eje del hueso importado puede
            # no ser ese: el importador de glTF reorienta los huesos). Sólo de pie (la cadera a menos de
            # ~37° de la vertical, la misma regla y el mismo eje que la simulación, `Faldon._talle`):
            # sentado echado atrás, de rodillas volcado o a gatas, la tela cae hacia el suelo y en el
            # marco de la cadera queda «por encima»
            hc = pose_world('caderas')[:3, 3]
            arriba = pose_world('columna')[:3, 3] - hc
            arriba = arriba / np.linalg.norm(arriba)
            if arriba[2] >= 0.8:
                talle.append((max(float((cola(b) - hc) @ arriba) for b in huesos_faldon), fr))
        if es_faldon.any():
            bajos.append(bajo_del_faldon(P))
        raices.append(np.array(arm.matrix_world @ arm.pose.bones['raiz'].head))
        if ef_hueso:
            efector.append(cola(ef_hueso))
    C = np.array(C)
    info = dict(fotogramas=len(frames), zmin=round(min(zmin), 4), zmin_parte=zparte[int(np.argmin(zmin))])
    if nombre == 'reposo':
        # anchura de hombros con los brazos caidos (la del reposo en pose A la dominan los brazos)
        selh = cu & np.isin(dom, ['hombro_L', 'hombro_R', 'brazo_L', 'brazo_R', 'pecho'])
        P0 = C[0][selh]
        zj = max(float(np.array(arm.matrix_world @ arm.pose.bones['brazo_L'].head)[2]), 0)
        banda = (P0[:, 2] > zj - 0.12) & (P0[:, 2] < zj + 0.05)
        res['reposo']['hombros_brazos_caidos'] = round(float(np.ptp(P0[banda][:, 0])), 3)
    # suelo
    if min(zmin) < UMBRAL['suelo_m']:
        fallos.append('%s: la malla baja a %.1f cm (%s, f%d)' % (nombre, 100 * min(zmin), info['zmin_parte'], int(np.argmin(zmin))))
    cont = ic.get('contacto_suelo_fotogramas', [])
    flotan = [fr for a, b in cont for fr in range(a, b + 1) if fr < len(zmin) and zmin[fr] > UMBRAL['flota_m']]
    if flotan:
        fallos.append('%s: flota en los fotogramas de contacto %s' % (nombre, flotan[:6]))
    info['flota_en_contacto'] = flotan
    # levita: fuera de los vuelos declarados y de la marcha, algo del cuerpo tiene que tocar el suelo
    vuelo = {fr for a, b in ic.get('vuelo_fotogramas', []) for fr in range(a, b + 1)}
    if nombre not in LOCO:
        zc_ = C[:, cuerpo_idx, 2].min(1)
        levita = [i for i, zz in enumerate(zc_) if zz > UMBRAL['levita_m'] and i not in vuelo]
        info['levita'] = levita
        if levita:
            fallos.append('%s: levita (nada a menos de %d cm del suelo) en %s' % (nombre, round(100 * UMBRAL['levita_m']), levita[:8]))
    # solapes del cuerpo (sobre el reposo)
    peor = {}
    for k in sol[0]:
        serie = [s_[k] - base.get(k, 0) for s_ in sol]
        m = max(serie)
        if m > 0:
            peor[k] = dict(max=m, fotograma=int(np.argmax(serie)), fotogramas=int(sum(1 for x in serie if x > 0)))
    info['solapes'] = peor
    for k, v in peor.items():
        if k.startswith('faldon') or k in CONTACTOS_BUSCADOS.get(nombre, ()):
            continue
        tope = UMBRAL['solape_muslo_torso'] if k.startswith('muslo') and k.endswith('torso') else UMBRAL['solape_cuerpo']
        if v['max'] > tope:
            fallos.append('%s: %s se atraviesan (%d pares, f%d, %d fotogramas)' % (nombre, k, v['max'], v['fotograma'], v['fotogramas']))
    # faldon contra piernas
    if PARES_F:
        fk = [k for k in peor if k.startswith('faldon|') and ('pierna' in k or 'muslo' in k)]
        malos = set()
        for i_, s_ in enumerate(sol):
            for k in fk:
                if s_[k] - base.get(k, 0) > UMBRAL['faldon_pares']:
                    malos.add(i_)
        pct = 100.0 * len(malos) / len(sol)
        info['faldon_fotogramas_atravesado_pct'] = round(pct, 1)
        if pct > UMBRAL['faldon_pct']:
            fallos.append('%s: el faldon lo atraviesan las piernas en el %.0f %% de los fotogramas' % (nombre, pct))
    # el talle
    if talle:
        th, tf = max(talle)
        info['talle_max_m'] = round(th, 3)
        if th > UMBRAL['talle_m']:
            fallos.append('%s: una junta del faldon %.0f cm por encima de caderas (f%d)' % (nombre, 100 * th, tf))
    # el miriñaque: en reposo y guardia, el bajo no se abre
    if bajos and nombre in ('reposo', 'guardia') and 'bajo_sin_posar' in res['reposo'] and CON_FALDON:
        a0, f0_ = res['reposo']['bajo_sin_posar']
        am = max(b[0] for b in bajos)
        fm = max(b[1] for b in bajos)
        info['bajo_max'] = [round(am, 3), round(fm, 3)]
        tope = UMBRAL['miriñaque']
        if am > tope * a0 or fm > tope * f0_:
            fallos.append('%s: miriñaque, el bajo mide %.2f x %.2f m contra %.2f x %.2f sin posar (tope x%.2f)' % (
                nombre, am, fm, a0, f0_, tope))
        if am > res['reposo']['hombros_ancho']:
            fallos.append('%s: el bajo (%.2f m) es más ancho que los hombros (%.2f)' % (nombre, am, res['reposo']['hombros_ancho']))
    # dientes de sierra
    n_est = max(e[0] for e in estiron)
    fp = int(np.argmax([e[1] for e in estiron]))
    info['picos'] = dict(vertices_3cm=n_est, max_cm=round(100 * estiron[fp][1], 1), fotograma=fp, hueso=estiron[fp][2])
    if estiron[fp][1] > UMBRAL['pico_m'] or n_est > UMBRAL['pico_vertices']:
        fallos.append('%s: dientes de sierra (un vertice se aparta %.0f cm de sus vecinos en f%d, %s; %d vertices a mas de 3 cm)' % (
            nombre, 100 * estiron[fp][1], fp, estiron[fp][2], n_est))
    # deslizamiento en mundo de lo que toca el suelo
    desl = {}
    for g, idx in grp.items():
        vel = []
        for i_ in range(len(frames) - 1):
            a_ = C[i_, idx]
            b_ = C[i_ + 1, idx]
            m = (a_[:, 2] < 0.005) & (b_[:, 2] < 0.005)
            if m.sum() >= 3:
                vel.append(float(np.linalg.norm((b_[m, :2] - a_[m, :2]).mean(0)) * 30.0))
        if vel:
            desl[g] = dict(n=len(vel), mediana=round(float(np.median(vel)), 3), max=round(float(max(vel)), 3))
    info['contacto_suelo'] = desl
    if nombre not in LOCO:
        for g, d in desl.items():
            if d['mediana'] > UMBRAL['desliza_ms'] and d['n'] >= 3:
                fallos.append('%s: %s resbala por el suelo (mediana %.2f m/s, pico %.2f)' % (nombre, g, d['mediana'], d['max']))
    else:
        v = ic.get('velocidad_m_s')
        info['velocidad_documentada'] = v
    # el pie que patina: a menos de 2 cm en dos fotogramas seguidos, a más de 1 m/s. En la marcha, en el
    # sitio, el pie apoyado va hacia atrás a la velocidad del clip (se descuenta) y la altura es la del
    # apoyo (5 mm): a 2 cm entraba el pie que ya se va, que roza el suelo al despegar y al posarse
    esperado = np.zeros(2)
    alto_patina = UMBRAL['patina_z']
    if nombre in LOCO and ic.get('velocidad_m_s'):
        d_ = PIE_EN_LA_MARCHA.get(nombre, (0.0, 1.0))
        esperado = np.array(d_) * ic['velocidad_m_s']
        alto_patina = 0.005
    patina = []
    for s in 'LR':
        idx = pie_idx[s]
        for i_ in range(len(frames) - 1):
            a_, b_ = C[i_, idx], C[i_ + 1, idx]
            m = (a_[:, 2] < alto_patina) & (b_[:, 2] < alto_patina)
            if m.sum() >= 3 and (b_[m, 2] - a_[m, 2]).mean() < 0.002:
                v = (b_[m, :2] - a_[m, :2]).mean(0) * 30.0 - esperado
                patina.append((float(np.linalg.norm(v)), s, i_))
    if patina:
        pv, ps, pf = max(patina)
        info['pie_patina_max'] = dict(ms=round(pv, 2), pie=ps, fotograma=pf)
        if pv > UMBRAL['patina_ms']:
            fallos.append('%s: el pie %s patina a %.1f m/s pegado al suelo (f%d)' % (nombre, ps, pv, pf))
    # los golpes: recorrido, alcance y el pico de velocidad al entrar al impacto
    if ef_hueso and ic.get('impacto_fotogramas') and nombre in RECORRIDO:
        fi = ic['impacto_fotogramas'][0]
        rel = [np.array([e[0] - r[0], e[1] - r[1], e[2]]) for e, r in zip(efector, raices)]
        vel = [float(np.linalg.norm(rel[i + 1] - rel[i]) * 30.0) for i in range(len(rel) - 1)]
        rec = float(np.linalg.norm(rel[fi] - rel[0]))
        alc = float(-rel[fi][1])
        ventana = vel[max(0, fi - 5):fi]
        pico = max(range(len(ventana)), key=lambda k: ventana[k]) + max(0, fi - 5) if ventana else fi - 1
        info['golpe'] = dict(recorrido_m=round(rec, 3), alcance_m=round(alc, 3), altura_m=round(float(rel[fi][2]), 3),
                             v_impacto_ms=round(vel[fi - 1], 2) if fi > 0 else None, pico_en=pico)
        if rec < RECORRIDO[nombre]:
            fallos.append('%s: el golpe recorre %.0f cm (minimo %.0f)' % (nombre, 100 * rec, 100 * RECORRIDO[nombre]))
        if alc < UMBRAL['alcance_m']:
            fallos.append('%s: el golpe llega a %.2f m de la raiz (el blanco esta a ~0,9)' % (nombre, alc))
        if fi > 0 and pico != fi - 1 and nombre not in SIN_PICO:
            fallos.append('%s: el pico de velocidad llega en f%d, no al entrar al impacto (f%d)' % (nombre, pico + 1, fi))
    info['palma_media'] = {s: np.mean([p[s] for p in palmas], 0).round(2).tolist() for s in 'LR'}
    # la palma del remate, sobre la cabeza (mira abajo); las del empellon, al frente (-Y) en el impacto
    if nombre == 'rematar':
        z = np.mean([p['R'][2] for p in palmas[14:]])
        info['palma_remate_z'] = round(float(z), 2)
        if z > -0.5:
            fallos.append('rematar: la palma derecha no mira abajo (z=%.2f)' % z)
    if nombre == 'empellon':
        fi = ic.get('impacto_fotogramas', [14])[0]
        for s in 'LR':
            y = palmas[min(fi, len(palmas) - 1)][s][1]
            if y > -0.5:
                fallos.append('empellon: la palma %s no empuja al frente en el impacto (y=%.2f)' % (s, y))
    if nombre in ('andar', 'pasear', 'trotar', 'correr'):
        pl = -np.array([h['pie_L'][1] for h in hb])
        ml = -np.array([h['mano_L'][1] for h in hb])
        cc = float(np.corrcoef(pl, ml)[0, 1])
        info['corr_pie_mano_L'] = round(cc, 2)
        if cc > 0:
            fallos.append('%s: el brazo izquierdo va con la pierna izquierda (corr %+.2f)' % (nombre, cc))
    info['huesos'] = hb
    clips[nombre] = info
    print('%s %-24s zmin %+.3f faldon %5s%% talle %s picos %.0fcm/%d solapes %s' % (
        FIG, nombre, min(zmin), info.get('faldon_fotogramas_atravesado_pct', '-'), info.get('talle_max_m', '-'),
        100 * estiron[fp][1], n_est,
        {k: v['max'] for k, v in peor.items() if not k.startswith('faldon')}), flush=True)
res['clips'] = clips
if res['aristas_abiertas']:
    fallos.append('%d aristas abiertas en piezas cerradas' % res['aristas_abiertas'])
if res['normales_opuestas']:
    fallos.append('%d triangulos con la normal opuesta' % res['normales_opuestas'])
res['fallos'] = fallos
json.dump(res, open(os.path.join(SAL, 'comprobacion_%s.json' % FIG), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
print('REPOSO', res['reposo'], 'abiertas', res['aristas_abiertas'], 'opuestas', res['normales_opuestas'], 'dos_muslos', entre)
print('FALLOS %d' % len(fallos))
for f in fallos:
    print('  -', f)
sys.stdout.flush()
os._exit(1 if fallos else 0)
