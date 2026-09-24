"""Del SDF a una malla de Blender con materiales por zona, limpia y lista para el juego.

procesar() hace, en orden: diezmado cuadrico, limpieza (dobles, degenerados, agujeros),
reparacion de pliegues (triangulos con la normal al reves tras el diezmado), corte exacto
de los bordes de material por la linea donde dos grupos SDF empatan, triangulado y normales.
"""
import math
import time
import numpy as np
import bpy
import bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

import sdf
import anatomia

ATTR = 'color'

# Las paletas viven en reparto.py (una por figura): zona -> (color lineal, rugosidad, metal).
import reparto  # noqa: E402
MATERIALES = {k: v['paleta'] for k, v in reparto.FIGURAS.items()}

# materiales del LOD1 (multitud): dos, con el color de cada zona en COLOR_0
LOD_MATES = ('mat_lod_mate', 0.72)
LOD_BRILLO = ('mat_lod_brillo', 0.36)


def material(nombre, color, rough, metal):
    m = bpy.data.materials.get(nombre)
    if m is None:
        m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*color, 1.0)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    # doble cara solo en piezas finas y abiertas; el resto, cara simple (glTF doubleSided=false)
    m.use_backface_culling = nombre not in ('mat_gafas', 'mat_montura', 'mat_cable')
    m.diffuse_color = (*color, 1.0)
    m.roughness = rough
    m.metallic = metal
    return m


def usar_color_en_render(materiales):
    """Para las capturas: base = color del material x COLOR_0 (lo mismo que hace three.js
    con vertexColors). En la exportacion el enlace no existe: el GLB lleva baseColorFactor
    y COLOR_0 por separado."""
    for m in materiales:
        if m is None or not m.use_nodes or m.get('_con_color'):
            continue
        nt = m.node_tree
        b = nt.nodes.get('Principled BSDF')
        base = tuple(b.inputs['Base Color'].default_value)
        at = nt.nodes.new('ShaderNodeVertexColor')
        at.layer_name = ATTR
        mix = nt.nodes.new('ShaderNodeMix')
        mix.data_type = 'RGBA'
        mix.blend_type = 'MULTIPLY'
        mix.inputs[0].default_value = 1.0
        mix.inputs[6].default_value = base
        nt.links.new(at.outputs['Color'], mix.inputs[7])
        nt.links.new(mix.outputs[2], b.inputs['Base Color'])
        m['_con_color'] = True


def color_vertices(ob, colores=None):
    """Crea el atributo de color por vertice (blanco si no se da)."""
    me = ob.data
    if ATTR in me.color_attributes:
        me.color_attributes.remove(me.color_attributes[ATTR])
    ca = me.color_attributes.new(ATTR, 'FLOAT_COLOR', 'POINT')
    n = len(me.vertices)
    c = np.ones((n, 4))
    if colores is not None:
        c[:, :3] = np.asarray(colores)[:n, :3]
    ca.data.foreach_set('color', c.astype(np.float32).ravel())
    me.color_attributes.active_color = ca
    try:
        me.color_attributes.render_color_index = me.color_attributes.active_color_index
    except Exception:
        pass
    return ca


def crear_malla(nombre, V, F, mat_idx=None):
    me = bpy.data.meshes.new(nombre)
    me.vertices.add(len(V))
    me.vertices.foreach_set('co', np.asarray(V, np.float32).ravel())
    nq = F.shape[1]
    me.loops.add(len(F) * nq)
    me.loops.foreach_set('vertex_index', np.asarray(F, np.int32).ravel())
    me.polygons.add(len(F))
    me.polygons.foreach_set('loop_start', np.arange(0, len(F) * nq, nq, dtype=np.int32))
    if mat_idx is not None:
        me.polygons.foreach_set('material_index', np.asarray(mat_idx, np.int32))
    me.update(calc_edges=True)
    me.validate()
    ob = bpy.data.objects.new(nombre, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def malla_sdf(nombre_fig, h=0.003, log=print, caja=None):
    t0 = time.time()
    grupos, extra = anatomia.figura(nombre_fig)
    # arriba cabe el sombrero del Celador mayor (la copa llega a 1,87 m): una rejilla que corta la
    # figura deja una tapa plana en el borde y el diezmado la pliega entera
    lo, hi = caja or ((-0.76, -0.25, -0.012), (0.76, 0.22, 1.92))
    grid = sdf.Grid(lo, hi, h)
    F, M = sdf.build_field(grid, grupos)
    t1 = time.time()
    V, Q, Mt = sdf.surface_nets(F, M, grid)
    t2 = time.time()
    log('campo %s: rejilla %s en %.1fs, malla %d v / %d q en %.1fs' % (
        nombre_fig, tuple(grid.n), t1 - t0, len(V), len(Q), t2 - t1))
    ob = crear_malla(nombre_fig + '_alto', V, Q, Mt)
    mats = MATERIALES[nombre_fig]
    for g in grupos:
        c, r, m = mats[g.name]
        ob.data.materials.append(material(g.name, c, r, m))
    return ob, grid, F, grupos, extra


def activar(ob):
    for o in bpy.context.selected_objects:
        o.select_set(False)
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)


def aplicar_mods(ob):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev, preserve_all_data_layers=True, depsgraph=dg)
    old = ob.data
    ob.modifiers.clear()
    ob.data = me
    bpy.data.meshes.remove(old)


def suavizar(ob):
    ob.data.polygons.foreach_set('use_smooth', np.ones(len(ob.data.polygons), bool))


def contar_tris(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)


def copiar(ob, nombre):
    c = ob.copy()
    c.data = ob.data.copy()
    c.name = nombre
    c.data.name = nombre
    bpy.context.scene.collection.objects.link(c)
    c.modifiers.clear()
    return c


# ------------------------------------------------------------------ campo continuo
class Campo:
    """Distancia con signo del conjunto (minimo duro entre grupos) y su gradiente."""

    def __init__(self, grupos):
        self.grupos = grupos

    def por_grupo(self, P):
        return np.stack([g.eval_points(P) for g in self.grupos], 1)

    def d(self, P):
        return self.por_grupo(P).min(1)

    def grad(self, P, h=4e-4):
        g = np.zeros_like(P)
        for k in range(3):
            e = np.zeros(3)
            e[k] = h
            g[:, k] = (self.d(P + e) - self.d(P - e)) / (2 * h)
        return g

    def proyectar(self, P, iters=3):
        P = P.copy()
        for _ in range(iters):
            d = self.d(P)
            g = self.grad(P)
            gn2 = np.maximum((g * g).sum(1), 1e-10)
            paso = (d / gn2)[:, None] * g
            ln = np.linalg.norm(paso, axis=1)
            lim = np.minimum(1.0, 0.004 / np.maximum(ln, 1e-12))
            P -= paso * lim[:, None]
        return P


# ------------------------------------------------------------------ diezmado y limpieza
def grupo_detalle(ob, zonas):
    """Grupo de vertices 'detalle' (peso 1 = conservar) para el diezmado."""
    vg = ob.vertex_groups.new(name='detalle')
    V = _co(ob)
    w = np.zeros(len(V))
    for fn, peso in zonas:
        w = np.maximum(w, np.where(fn(V), peso, 0.0))
    for val in sorted(set(np.round(w, 3))):
        if val <= 0:
            continue
        ids = np.nonzero(np.round(w, 3) == val)[0].tolist()
        vg.add(ids, float(val), 'REPLACE')
    return vg


def _diezmar_una(ob, tris_objetivo, grupo=None):
    ntri = contar_tris(ob)
    m = ob.modifiers.new('diezmar', 'DECIMATE')
    m.decimate_type = 'COLLAPSE'
    m.ratio = min(1.0, tris_objetivo / max(ntri, 1))
    m.use_collapse_triangulate = True
    m.use_symmetry = True
    m.symmetry_axis = 'X'
    if grupo:
        # peso 1 invertido = 0: esos vertices no se colapsan
        m.vertex_group = grupo
        m.vertex_group_factor = 1.0
        m.invert_vertex_group = True
    aplicar_mods(ob)


def diezmar(ob, tris_objetivo, previo=1.8):
    """Dos pasadas: todo hasta previo x objetivo; luego, con cabeza y manos bloqueadas, el
    resto hasta el objetivo. Asi la cara y los dedos conservan ~1,6 veces su densidad."""
    _diezmar_una(ob, tris_objetivo * previo)
    grupo_detalle(ob, zonas_detalle())
    _diezmar_una(ob, tris_objetivo, 'detalle')
    ob.vertex_groups.remove(ob.vertex_groups['detalle'])
    return contar_tris(ob)


def zonas_detalle():
    zc = anatomia.CABEZA_C[2]
    return [
        (lambda V: (V[:, 2] > zc - 0.13) & (np.abs(V[:, 0]) < 0.14), 1.0),   # cabeza
        (lambda V: np.abs(V[:, 0]) > 0.43, 1.0),                             # manos
    ]


def _co(ob):
    V = np.empty(len(ob.data.vertices) * 3)
    ob.data.vertices.foreach_get('co', V)
    return V.reshape(-1, 3)


def _tris(ob):
    me = ob.data
    me.calc_loop_triangles()
    T = np.empty(len(me.loop_triangles) * 3, np.int64)
    me.loop_triangles.foreach_get('vertices', T)
    return T.reshape(-1, 3)


def normales_opuestas(V, T):
    """Triangulos cuya normal geometrica se opone a la media de las normales de sus
    vertices (lo mismo que mide el lector de GLB): pliegues o caras al reves."""
    a, b, c = V[T[:, 0]], V[T[:, 1]], V[T[:, 2]]
    fn = np.cross(b - a, c - a)
    ar = np.linalg.norm(fn, axis=1)
    fnu = fn / np.maximum(ar, 1e-15)[:, None]
    vn = np.zeros_like(V)
    for k in range(3):
        np.add.at(vn, T[:, k], fn)
    vn /= np.maximum(np.linalg.norm(vn, axis=1), 1e-15)[:, None]
    m = (vn[T[:, 0]] + vn[T[:, 1]] + vn[T[:, 2]]) / 3.0
    dot = np.einsum('ij,ij->i', m, fnu)
    return dot, ar


def limpiar(ob, log=print):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=1e-7)
    # aristas con mas de dos caras (surface nets en celdas ambiguas): se quitan las caras
    malas = [e for e in bm.edges if len(e.link_faces) > 2]
    if malas:
        caras = set()
        for e in malas:
            caras.update(e.link_faces)
        bmesh.ops.delete(bm, geom=list(caras), context='FACES')
    sueltos = [v for v in bm.verts if not v.link_faces]
    if sueltos:
        bmesh.ops.delete(bm, geom=sueltos, context='VERTS')
    n_ag = 0
    for vuelta in range(5):
        bordes = [e for e in bm.edges if e.is_boundary]
        if not bordes:
            break
        if vuelta >= 1:
            # bordes pellizcados: soldar vertices de borde muy proximos y volver a intentar
            vb = list({v for e in bordes for v in e.verts})
            bmesh.ops.remove_doubles(bm, verts=vb, dist=0.0015 * vuelta)
            malas = [e for e in bm.edges if len(e.link_faces) > 2]
            if malas:
                bmesh.ops.delete(bm, geom=list({f for e in malas for f in e.link_faces}), context='FACES')
            bordes = [e for e in bm.edges if e.is_boundary]
            if not bordes:
                break
        r = bmesh.ops.holes_fill(bm, edges=bordes, sides=64)
        n_ag += len(r['faces'])
        if r['faces']:
            bmesh.ops.triangulate(bm, faces=r['faces'])
        elif vuelta >= 2:
            # agrandar el agujero un anillo (borde limpio) y volver a rellenar
            vb = {v for e in bm.edges if e.is_boundary for v in e.verts}
            caras = {f for v in vb for f in v.link_faces}
            bmesh.ops.delete(bm, geom=list(caras), context='FACES')
            sueltos = [v for v in bm.verts if not v.link_faces]
            if sueltos:
                bmesh.ops.delete(bm, geom=sueltos, context='VERTS')
            r = bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary], sides=64)
            n_ag += len(r['faces'])
            if r['faces']:
                bmesh.ops.triangulate(bm, faces=r['faces'])
    sueltos = [v for v in bm.verts if not v.link_faces]
    if sueltos:
        bmesh.ops.delete(bm, geom=sueltos, context='VERTS')
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 3])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    abiertas = sum(1 for e in bm.edges if e.is_boundary)
    bm.to_mesh(ob.data)
    bm.free()
    ob.data.update()
    log('  limpieza: %d aristas no-manifold, %d caras de relleno, %d aristas abiertas' % (len(malas), n_ag, abiertas))


def reparar_pliegues(ob, campo, log=print, iters=40, umbral=0.15, disolver=True):
    """Relaja (Laplaciano tangente + reproyeccion al campo) los vertices de los triangulos
    plegados y de su anillo; si alguno resiste, colapsa su arista mas corta (salvo con
    disolver=False: en el LOD2 disolver se comia la malla entera de pliegue en pliegue)."""
    for vuelta in range(6 if disolver else 1):
        for it in range(iters):
            V = _co(ob)
            T = _tris(ob)
            dot, ar = normales_opuestas(V, T)
            malos = np.nonzero((dot < umbral) | (ar < 1e-12))[0]
            if it == 0 and vuelta == 0:
                log('  pliegues al empezar: %d' % int((dot < 0).sum()))
            if len(malos) == 0:
                break
            vs = np.unique(T[malos].ravel())
            # vecinos
            E = np.concatenate([T[:, [0, 1]], T[:, [1, 2]], T[:, [2, 0]]])
            E = np.concatenate([E, E[:, ::-1]])
            sel = np.isin(E[:, 0], vs)
            anillo = np.unique(np.concatenate([vs, E[sel, 1]]))
            sel = np.isin(E[:, 0], anillo)
            suma = np.zeros_like(V)
            cnt = np.zeros(len(V))
            np.add.at(suma, E[sel, 0], V[E[sel, 1]])
            np.add.at(cnt, E[sel, 0], 1)
            nuevo = V.copy()
            idx = anillo[cnt[anillo] > 0]
            nuevo[idx] = 0.5 * V[idx] + 0.5 * suma[idx] / cnt[idx, None]
            if campo is not None:
                nuevo[idx] = campo.proyectar(nuevo[idx], iters=2)
            ob.data.vertices.foreach_set('co', nuevo.astype(np.float32).ravel())
            ob.data.update()
        V = _co(ob)
        T = _tris(ob)
        dot, ar = normales_opuestas(V, T)
        malos = np.nonzero(dot < 0.0)[0]
        if len(malos) == 0 or not disolver:
            break
        # disolver el vertice de angulo mas agudo de cada triangulo que resiste
        bm = bmesh.new()
        bm.from_mesh(ob.data)
        bm.verts.ensure_lookup_table()
        quitar = set()
        for t in malos:
            a_, b_, c_ = T[t]
            pts = V[[a_, b_, c_]]
            ang = []
            for k in range(3):
                u = pts[(k + 1) % 3] - pts[k]
                w = pts[(k + 2) % 3] - pts[k]
                ang.append(np.arccos(np.clip(u @ w / max(np.linalg.norm(u) * np.linalg.norm(w), 1e-15), -1, 1)))
            quitar.add(int(T[t][int(np.argmin(ang))]))
        vs = [bm.verts[x] for x in quitar if not bm.verts[x].is_boundary]
        if vs:
            bmesh.ops.dissolve_verts(bm, verts=vs)
        bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 3])
        bm.to_mesh(ob.data)
        bm.free()
        ob.data.update()
    V = _co(ob)
    T = _tris(ob)
    dot, _ = normales_opuestas(V, T)
    log('  pliegues al terminar: %d' % int((dot < 0).sum()))
    return int((dot < 0).sum())


def cortar_materiales(ob, grupos, log=print):
    """Corta la malla exactamente por la linea donde dos grupos empatan y asigna a cada
    cara el grupo ganador: los bordes de prenda y el nacimiento del pelo quedan como
    curvas limpias en vez de dientes de sierra del tamano del triangulo."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.verts.ensure_lookup_table()
    P = np.array([v.co[:] for v in bm.verts])
    D = np.stack([g.eval_points(P) for g in grupos], 1)
    lab = D.argmin(1)

    E = [(e, e.verts[0], e.verts[1]) for e in bm.edges if lab[e.verts[0].index] != lab[e.verts[1].index]]
    ia = np.array([a.index for _, a, _ in E], np.int64)
    ib = np.array([b.index for _, _, b in E], np.int64)
    gi, gj = lab[ia], lab[ib]
    k = np.arange(len(E))
    fa = D[ia, gi] - D[ia, gj]
    fb = D[ib, gi] - D[ib, gj]
    ok = (fa < 0) & (fb > 0)
    pa, pb = P[ia], P[ib]
    lo = np.zeros(len(E))
    hi = np.ones(len(E))
    for _ in range(10):
        mid = 0.5 * (lo + hi)
        q = pa + (pb - pa) * mid[:, None]
        Dq = np.stack([g.eval_points(q) for g in grupos], 1)
        f = Dq[k, gi] - Dq[k, gj]
        neg = f < 0
        lo = np.where(neg, mid, lo)
        hi = np.where(neg, hi, mid)
    t = 0.5 * (lo + hi)
    ok &= (t > 0.06) & (t < 0.94)
    cortes = [(E[n][0], E[n][1], float(t[n])) for n in np.nonzero(ok)[0]]
    nuevos = {}
    for e, a, t in cortes:
        ne, nv = bmesh.utils.edge_split(e, a, t)
        nuevos[nv] = True
    # unir los vertices nuevos dentro de cada cara
    unir = []
    for f in bm.faces:
        vs = [v for v in f.verts if v in nuevos]
        if len(vs) == 2:
            unir.append((f, vs))
    for f, vs in unir:
        try:
            bmesh.ops.connect_verts(bm, verts=vs)
        except Exception:
            pass
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 3])
    bm.to_mesh(ob.data)
    bm.free()
    ob.data.update()
    reasignar_materiales(ob, grupos)
    log('  corte de materiales: %d aristas partidas' % len(cortes))


def reasignar_materiales(ob, grupos):
    """Material de cada cara = grupo con menor distancia en su centro."""
    me = ob.data
    n = len(me.polygons)
    C = np.empty(n * 3)
    me.polygons.foreach_get('center', C)
    C = C.reshape(-1, 3)
    D = np.stack([g.eval_points(C) for g in grupos], 1)
    idx = np.argmin(D, 1).astype(np.int32)
    me.polygons.foreach_set('material_index', idx)


def remallar(ob, voxel=0.003, log=print):
    """Remallado por voxeles (OpenVDB) de la salida de surface nets: cierra la malla y quita las
    aristas no-manifold de las celdas ambiguas antes de diezmar."""
    t0 = time.time()
    activar(ob)
    ob.data.remesh_voxel_size = voxel
    ob.data.remesh_voxel_adaptivity = 0.0
    bpy.ops.object.voxel_remesh()
    log('  remallado por voxeles de %.1f mm: %d caras en %.1fs' % (voxel * 1000, len(ob.data.polygons), time.time() - t0))


def procesar_forma(ob, grupos, tris_objetivo, log=print, previo=1.8):
    """Fase A: forma limpia y cerrada al presupuesto (antes de los pesos)."""
    t0 = time.time()
    campo = Campo(grupos)
    n = diezmar(ob, tris_objetivo, previo)
    log('  diezmado a %d tris' % n)
    limpiar(ob, log)
    reparar_pliegues(ob, campo, log)
    reasignar_materiales(ob, grupos)
    suavizar(ob)
    log('  forma en %.1fs, %d tris' % (time.time() - t0, contar_tris(ob)))


def procesar_bordes(ob, grupos, log=print):
    """Fase B (con los pesos ya puestos): corte exacto de los bordes de material. BMesh
    interpola los pesos de los vertices nuevos a lo largo de cada arista partida."""
    cortar_materiales(ob, grupos, log)
    limpiar(ob, log)
    reparar_pliegues(ob, None, log, iters=15)
    rematar(ob, log)
    suavizar(ob)


def _opuestas_como_el_glb(ob):
    """Como `normales_opuestas`, pero contra las normales de vértice que exporta Blender (ponderadas por
    ángulo), que son las que lee `validar.py`: un triángulo astilla en el canto de la suela pasaba con
    las ponderadas por área y suspendía con las exportadas."""
    V = _co(ob)
    T = _tris(ob)
    N = np.empty(len(ob.data.vertices) * 3)
    ob.data.vertices.foreach_get('normal', N)
    N = N.reshape(-1, 3)
    a, b, c = V[T[:, 0]], V[T[:, 1]], V[T[:, 2]]
    fn = np.cross(b - a, c - a)
    ar = np.linalg.norm(fn, axis=1)
    m = (N[T[:, 0]] + N[T[:, 1]] + N[T[:, 2]]) / 3.0
    dot = np.einsum('ij,ij->i', m, fn / np.maximum(ar, 1e-15)[:, None])
    return V, T, dot


def rematar(ob, log=print, vueltas=4):
    """EL ÚLTIMO REPASO (segunda pasada). Tras cortar los bordes de material quedaban, según cómo cayera el
    diezmado, un triángulo plegado que resiste a la relajación (en la suela o el ala del sombrero) o un
    agujero de tres aristas que `limpiar` no sabe cerrar (un borde pellizcado en el corte): lo bastante
    para que `validar.py` suspenda la figura, que exige cero en el LOD0. Cambiar el pelo cambió el diezmado
    de toda la figura y los sacó en tres que antes pasaban. Aquí: cada triángulo plegado colapsa su arista
    más corta, y cada agujero se rellena; si no se deja rellenar, se quitan las caras de su borde y se
    rellena el agujero más grande, que sí es limpio."""
    for vuelta in range(vueltas):
        V, T, dot = _opuestas_como_el_glb(ob)
        dot2, _ = normales_opuestas(V, T)
        malos = np.nonzero((dot < 0.0) | (dot2 < 0.0))[0]
        bm = bmesh.new()
        bm.from_mesh(ob.data)
        bm.verts.ensure_lookup_table()
        abiertas = [e for e in bm.edges if e.is_boundary]
        if not len(malos) and not abiertas:
            bm.free()
            break
        tocados = set()
        for t_ in malos:
            a_, b_, c_ = (int(x) for x in T[t_])
            u, v = min(((a_, b_), (b_, c_), (c_, a_)), key=lambda q: float(np.linalg.norm(V[q[0]] - V[q[1]])))
            if u in tocados or v in tocados:
                continue
            vu, vv = bm.verts[u], bm.verts[v]
            if vu.is_boundary or vv.is_boundary:
                continue
            bmesh.ops.pointmerge(bm, verts=[vu, vv], merge_co=(vu.co + vv.co) * 0.5)
            tocados.update((u, v))
            bm.verts.ensure_lookup_table()
        bordes = [e for e in bm.edges if e.is_boundary]
        if bordes:
            r = bmesh.ops.holes_fill(bm, edges=bordes, sides=0)
            if r['faces']:
                bmesh.ops.triangulate(bm, faces=r['faces'])
            else:
                vb = {v for e in bordes for v in e.verts}
                caras = {f for v in vb for f in v.link_faces}
                bmesh.ops.delete(bm, geom=list(caras), context='FACES')
                sueltos = [v for v in bm.verts if not v.link_faces]
                if sueltos:
                    bmesh.ops.delete(bm, geom=sueltos, context='VERTS')
                r = bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary], sides=0)
                if r['faces']:
                    bmesh.ops.triangulate(bm, faces=r['faces'])
        bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=1e-7)
        bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 3])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(ob.data)
        bm.free()
        ob.data.update()
    V, T, dot = _opuestas_como_el_glb(ob)
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    n_ab = sum(1 for e in bm.edges if e.is_boundary)
    bm.free()
    log('  remate: %d plegados y %d aristas abiertas al final' % (int((dot < 0).sum()), n_ab))


# ------------------------------------------------------------------ UV y oclusion
def desplegar_uv(ob, log=print):
    activar(ob)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.004, area_weight=0.0,
                             correct_aspect=True, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    uv = ob.data.uv_layers.active
    log('  UV: %s' % (uv.name if uv else 'ninguna'))


def _direcciones(n=48, semilla=7):
    """Direcciones del hemisferio (+Z) con densidad coseno, deterministas."""
    rng = np.random.default_rng(semilla)
    u = (np.arange(n) + rng.random(n)) / n
    v = rng.permutation(np.arange(n)) / n + rng.random(n) / n
    r = np.sqrt(u)
    ph = 2 * np.pi * v
    return np.stack([r * np.cos(ph), r * np.sin(ph), np.sqrt(np.maximum(0, 1 - u))], 1)


def oclusion(ob, otros=(), dist=0.3, n=48, minimo=0.22, log=print):
    """AO por vertice con rayos contra la propia malla (en reposo). Se multiplica en el
    atributo de color (COLOR_0): three.js lo aplica solo con vertexColors."""
    t0 = time.time()
    me = ob.data
    V = _co(ob)
    T = _tris(ob)
    finos = [k for k, m in enumerate(me.materials) if m and m.name in ('mat_gafas', 'mat_montura', 'mat_cable')]
    if finos:
        me.calc_loop_triangles()
        mt = np.empty(len(me.loop_triangles), np.int32)
        me.loop_triangles.foreach_get('material_index', mt)
        T = T[~np.isin(mt, finos)]
    Vall, Tall = [V], [T]
    off = len(V)
    for o in otros:
        v2, t2 = _co(o), _tris(o)
        Vall.append(v2)
        Tall.append(t2 + off)
        off += len(v2)
    Vall = np.concatenate(Vall)
    Tall = np.concatenate(Tall)
    bvh = BVHTree.FromPolygons([tuple(p) for p in Vall], [tuple(t) for t in Tall], all_triangles=True)
    me.update()
    N = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get('normal', N)
    N = N.reshape(-1, 3)
    D = _direcciones(n)
    ao = np.ones(len(V))
    for i in range(len(V)):
        nrm = Vector(N[i])
        t = nrm.orthogonal().normalized()
        b = nrm.cross(t)
        o = Vector(V[i]) + nrm * 0.0015
        occ = 0.0
        for dx, dy, dz in D:
            d = t * dx + b * dy + nrm * dz
            hit = bvh.ray_cast(o, d, dist)
            if hit[0] is not None:
                occ += 1.0 - (hit[3] / dist) ** 0.5 * 0.6
        ao[i] = 1.0 - occ / n
    ao = minimo + (1 - minimo) * np.clip(ao, 0, 1) ** 1.2
    ca = me.color_attributes.get(ATTR) or color_vertices(ob)
    c = np.empty(len(me.vertices) * 4, np.float32)
    ca.data.foreach_get('color', c)
    c = c.reshape(-1, 4)
    c[:, :3] *= ao[:, None]
    ca.data.foreach_set('color', c.ravel())
    log('  AO por vertice: %d vertices en %.1fs (media %.2f, min %.2f)' % (len(V), time.time() - t0, ao.mean(), ao.min()))
    return ao


# ------------------------------------------------------------------ materiales de los LOD de lejos
def fundir_materiales(ob, fig, ao, log=print):
    """LOD1 y LOD2: dos materiales (mate y brillo, por la rugosidad de cada zona) con el color de la
    zona en COLOR_0 por esquina de cara (los bordes de zona salen limpios): rgb = color de la zona x
    lo que ya llevaba el vertice (la oclusion, y el iris en los ojos), alfa = la oclusion sola, que el
    cliente usa para volver a teñir una zona (nuevo color x alfa). `_ZONA` lleva el indice GLOBAL de la
    zona (reparto.ZONAS); el empaquetado lo cambia por el de la familia, que es el orden alfabetico de
    los materiales del LOD0 (lo que ya lee el frente de personajes). Devuelve las zonas usadas."""
    me = ob.data
    nombres = [m.name for m in me.materials]
    pal = MATERIALES[fig]
    n_p = len(me.polygons)
    mi = np.empty(n_p, np.int32)
    me.polygons.foreach_get('material_index', mi)
    ca = me.color_attributes[ATTR]
    c = np.empty(len(me.vertices) * 4, np.float32)
    ca.data.foreach_get('color', c)
    c = c.reshape(-1, 4)
    nl = len(me.loops)
    lv = np.empty(nl, np.int32)
    me.loops.foreach_get('vertex_index', lv)
    ls = np.empty(n_p, np.int32)
    lt = np.empty(n_p, np.int32)
    me.polygons.foreach_get('loop_start', ls)
    me.polygons.foreach_get('loop_total', lt)
    lp = np.repeat(np.arange(n_p, dtype=np.int32), lt)
    colores = np.array([pal[n][0] for n in nombres], np.float64)
    zonas = np.array([reparto.ZONAS.index(n) for n in nombres], np.float32)
    cl = np.ones((nl, 4), np.float32)
    cl[:, :3] = colores[mi[lp]] * c[lv, :3]
    cl[:, 3] = np.asarray(ao, np.float32)[lv]
    me.color_attributes.remove(ca)
    nueva = me.color_attributes.new(ATTR, 'FLOAT_COLOR', 'CORNER')
    nueva.data.foreach_set('color', cl.ravel())
    me.color_attributes.active_color = nueva
    at = me.attributes.new('_ZONA', 'FLOAT', 'CORNER')
    at.data.foreach_set('value', zonas[mi[lp]])
    brillo = [k for k, n in enumerate(nombres) if pal[n][1] < 0.45 or pal[n][2] > 0.5]
    nuevo = np.where(np.isin(mi, brillo), 1, 0).astype(np.int32)
    me.materials.clear()
    me.materials.append(material(LOD_MATES[0], (1.0, 1.0, 1.0), LOD_MATES[1], 0.0))
    me.materials.append(material(LOD_BRILLO[0], (1.0, 1.0, 1.0), LOD_BRILLO[1], 0.0))
    me.polygons.foreach_set('material_index', nuevo)
    me.update()
    usadas = sorted({nombres[k] for k in np.unique(mi)})
    log('  %s: 2 materiales, zonas %s' % (ob.name, usadas))
    return usadas


def lod_desde(ob, nombre, tris_objetivo, log=print):
    """LOD2: se diezma una copia del LOD1 ya pesado y con sus bordes (el modificador interpola los
    pesos y conserva el material de cada cara). Diezmar desde el remallado alto hasta 1.000
    triangulos dejaba cientos de pliegues y la reparacion se comia la malla (una figura quedo en 56)."""
    c = ob.copy()
    c.data = ob.data.copy()
    c.name = nombre
    c.data.name = nombre
    bpy.context.scene.collection.objects.link(c)
    arm_mods = [m for m in c.modifiers if m.type == 'ARMATURE']
    for m in arm_mods:
        c.modifiers.remove(m)
    _diezmar_una(c, tris_objetivo)
    limpiar(c, log)
    reparar_pliegues(c, None, log, iters=25)
    suavizar(c)
    log('  %s: %d tris' % (nombre, contar_tris(c)))
    return c
