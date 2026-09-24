"""Esqueleto comun y pesos."""
import math
import numpy as np
import bpy
from mathutils import Vector
from mathutils.kdtree import KDTree

import anatomia
import malla


def crear_esqueleto(nombre='esqueleto', sexo='m', plantilla=False):
    """Crea el esqueleto. plantilla=True: a escala de plantilla (la figura se escala al final)."""
    anatomia.configurar(sexo)
    lista = anatomia.huesos()
    if plantilla and anatomia.ESC != 1.0:
        k = 1.0 / anatomia.ESC
        lista = [(n, tuple(np.array(h) * k), tuple(np.array(t) * k), p, x, d) for n, h, t, p, x, d in lista]
    arm = bpy.data.armatures.new(nombre)
    ob = bpy.data.objects.new(nombre, arm)
    bpy.context.scene.collection.objects.link(ob)
    malla.activar(ob)
    bpy.ops.object.mode_set(mode='EDIT')
    for n, head, tail, parent, X, deforma in lista:
        eb = arm.edit_bones.new(n)
        eb.head = Vector(head)
        eb.tail = Vector(tail)
        Y = (eb.tail - eb.head).normalized()
        Xv = Vector(X)
        Xv = (Xv - Y * Xv.dot(Y)).normalized()
        eb.align_roll(Xv.cross(Y))
        if parent:
            eb.parent = arm.edit_bones[parent]
            eb.use_connect = (eb.parent.tail - eb.head).length < 1e-5
    bpy.ops.object.mode_set(mode='OBJECT')
    for n, head, tail, parent, X, deforma in lista:
        arm.bones[n].use_deform = deforma
    arm.display_type = 'STICK'
    ob['sexo'] = sexo
    return ob


def escalar_figura(arm, objetos, k):
    """Escala uniforme de esqueleto y mallas (la mujer se modela a escala de plantilla)."""
    if abs(k - 1.0) < 1e-9:
        return
    malla.activar(arm)
    bpy.ops.object.mode_set(mode='EDIT')
    # primero se leen todos (los huesos conectados comparten cabeza y cola: escalarlos uno a uno
    # escalaria dos veces la junta), luego se desconectan, se escriben y se vuelven a conectar
    datos = {eb.name: (eb.head.copy(), eb.tail.copy(), eb.roll, eb.use_connect) for eb in arm.data.edit_bones}
    for eb in arm.data.edit_bones:
        eb.use_connect = False
    for eb in arm.data.edit_bones:
        h, t, roll, _ = datos[eb.name]
        eb.head = h * k
        eb.tail = t * k
        eb.roll = roll
    for eb in arm.data.edit_bones:
        eb.use_connect = datos[eb.name][3]
    bpy.ops.object.mode_set(mode='OBJECT')
    for ob in objetos:
        V = malla._co(ob) * k
        ob.data.vertices.foreach_set('co', V.astype(np.float32).ravel())
        ob.data.update()


def deformadores(ob_arm):
    return [b.name for b in ob_arm.data.bones if b.use_deform]


def emparentar_auto(ob, ob_arm, excluir=()):
    """Pesos automaticos (calor) sin los huesos de 'excluir' (faldon, giro)."""
    antes = {}
    for n in excluir:
        b = ob_arm.data.bones[n]
        antes[n] = b.use_deform
        b.use_deform = False
    malla.activar(ob)
    ob_arm.select_set(True)
    bpy.context.view_layer.objects.active = ob_arm
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    for n, v in antes.items():
        ob_arm.data.bones[n].use_deform = v


def emparentar_vacio(ob, ob_arm):
    ob.parent = ob_arm
    if not any(m.type == 'ARMATURE' for m in ob.modifiers):
        m = ob.modifiers.new('esqueleto', 'ARMATURE')
        m.object = ob_arm
    for n in deformadores(ob_arm):
        if n not in ob.vertex_groups:
            ob.vertex_groups.new(name=n)


def pesos_array(ob, ob_arm):
    """Matriz (n_vert, n_huesos) de pesos y lista de huesos deformadores."""
    nombres = deformadores(ob_arm)
    idx = {n: i for i, n in enumerate(nombres)}
    gi = {g.index: g.name for g in ob.vertex_groups}
    W = np.zeros((len(ob.data.vertices), len(nombres)))
    for v in ob.data.vertices:
        for g in v.groups:
            n = gi.get(g.group)
            if n in idx:
                W[v.index, idx[n]] = g.weight
    return W, nombres


def escribir_pesos(ob, W, nombres, max_inf=4, umbral=0.01):
    for g in list(ob.vertex_groups):
        ob.vertex_groups.remove(g)
    grupos = {n: ob.vertex_groups.new(name=n) for n in nombres}
    W = W.copy()
    if W.shape[1] > max_inf:
        orden = np.argsort(-W, axis=1)
        mask = np.zeros_like(W, bool)
        np.put_along_axis(mask, orden[:, :max_inf], True, axis=1)
        W[~mask] = 0
    W[W < umbral] = 0
    s = W.sum(1, keepdims=True)
    s[s == 0] = 1
    W /= s
    for j, n in enumerate(nombres):
        col = W[:, j]
        for val in np.unique(np.round(col[col > 0], 3)):
            ids = np.nonzero(np.abs(np.round(col, 3) - val) < 1e-9)[0].tolist()
            grupos[n].add(ids, float(val), 'REPLACE')


def huesos_cercanos(P, ob_arm, nombres):
    """Indice del hueso (segmento) mas cercano; respaldo para vertices sin peso."""
    segs = []
    for n in nombres:
        b = ob_arm.data.bones[n]
        segs.append((np.array(b.head_local), np.array(b.tail_local)))
    D = np.zeros((len(P), len(nombres)))
    for j, (a, b) in enumerate(segs):
        ab = b - a
        t = np.clip(((P - a) @ ab) / max(ab @ ab, 1e-9), 0, 1)
        D[:, j] = np.linalg.norm(P - (a + t[:, None] * ab), axis=1)
    return np.argmin(D, 1)


def _smooth(t):
    t = np.clip(t, 0, 1)
    return t * t * (3 - 2 * t)


def pesos_cuerpo(ob, ob_arm, log=print):
    """Pesos automaticos del cuerpo + tres correcciones:
    - vertices sin peso -> hueso mas cercano;
    - giro del antebrazo: la mitad distal del peso del antebrazo pasa a giro_*;
    - entrepierna: ningun vertice mezcla los dos muslos (hacia membrana al abrir las piernas)."""
    excl = anatomia.huesos_faldon() + ['giro_L', 'giro_R']
    emparentar_auto(ob, ob_arm, excluir=excl)
    W, nombres = pesos_array(ob, ob_arm)
    i = {n: k for k, n in enumerate(nombres)}
    P = malla._co(ob)
    vac = W.sum(1) < 1e-6
    if vac.any():
        cand = [n for n in nombres if n not in excl]
        j = huesos_cercanos(P[vac], ob_arm, cand)
        for v, jj in zip(np.nonzero(vac)[0], j):
            W[v, i[cand[jj]]] = 1.0
    # giro
    for s in 'LR':
        b = ob_arm.data.bones['antebrazo_' + s]
        a, c = np.array(b.head_local), np.array(b.tail_local)
        ab = c - a
        t = ((P - a) @ ab) / (ab @ ab)
        f = _smooth((t - 0.3) / 0.65) * 0.9
        w = W[:, i['antebrazo_' + s]]
        W[:, i['giro_' + s]] += w * f
        W[:, i['antebrazo_' + s]] = w * (1 - f)
    # entrepierna
    mL, mR, cad = i['muslo_L'], i['muslo_R'], i['caderas']
    ambos = (W[:, mL] > 0.02) & (W[:, mR] > 0.02)
    x = P[:, 0]
    banda = np.clip(np.abs(x) / 0.012, 0, 1)
    for v in np.nonzero(ambos)[0]:
        propio, ajeno = (mL, mR) if x[v] > 0 else (mR, mL)
        W[v, cad] += W[v, ajeno]
        W[v, ajeno] = 0.0
        # en la linea media, el propio muslo tambien cede a la cadera
        W[v, cad] += W[v, propio] * (1 - banda[v]) * 0.5
        W[v, propio] *= 1 - (1 - banda[v]) * 0.5
    # mano: los bloques de dedos y el pulgar giran casi rigidos, con transiciones cortas en los
    # nudillos (el calor reparte demasiado y el puno salia arrugado)
    n_mano = 0
    for s_ in 'LR':
        cols = [i['mano_' + s_], i['dedos_' + s_], i['dedos2_' + s_], i['pulgar_' + s_]]
        suma = W[:, cols].sum(1)
        sel = suma > 0.5
        if not sel.any():
            continue
        bm_ = ob_arm.data.bones
        Wr = np.array(bm_['mano_' + s_].head_local)
        k1 = np.array(bm_['dedos_' + s_].head_local)
        k2 = np.array(bm_['dedos2_' + s_].head_local)
        tip = np.array(bm_['dedos2_' + s_].tail_local)
        d_ = (tip - Wr) / np.linalg.norm(tip - Wr)
        pa, pb = np.array(bm_['pulgar_' + s_].head_local), np.array(bm_['pulgar_' + s_].tail_local)
        Q = P[sel]
        t = (Q - Wr) @ d_
        t1, t2 = (k1 - Wr) @ d_, (k2 - Wr) @ d_
        ab = pb - pa
        tp = np.clip(((Q - pa) @ ab) / (ab @ ab), 0, 1)
        dpul = np.linalg.norm(Q - (pa + tp[:, None] * ab), axis=1)
        eje = Wr + np.outer(t, d_)
        deje = np.linalg.norm(Q - eje, axis=1)
        nuevo = np.zeros((len(Q), 4))
        b1 = np.clip((t - (t1 - 0.012)) / 0.02, 0, 1)
        b2 = np.clip((t - (t2 - 0.008)) / 0.016, 0, 1)
        nuevo[:, 0] = 1 - b1
        nuevo[:, 1] = b1 * (1 - b2)
        nuevo[:, 2] = b1 * b2
        pul = (dpul < 0.019) & (dpul < deje) & (tp > 0.15)
        fp = np.clip((tp - 0.15) / 0.25, 0, 1)
        nuevo[pul] = nuevo[pul] * (1 - fp[pul, None])
        nuevo[pul, 3] = fp[pul]
        # lo que queda cerca de la muneca conserva el reparto con el antebrazo
        resto = 1.0 - suma[sel]
        nuevo *= suma[sel, None]
        idx = np.nonzero(sel)[0]
        for k, c in enumerate(cols):
            W[idx, c] = nuevo[:, k]
        n_mano += len(idx)
    lados = limpiar_lados(W, P, nombres)
    log('  pesos: %d vertices sin peso reparados, %d de entrepierna separados, %d de manos por regiones, %d con peso '
        'de la otra pierna' % (int(vac.sum()), int(ambos.sum()), n_mano, lados))
    escribir_pesos(ob, W, nombres)
    # si el calor no encontro solucion para media figura, el respaldo del hueso mas cercano deja una
    # figura de juguete articulado: quien llama lo intenta en otra resolucion
    return vac.mean() < 0.02


# Los huesos de cada lado que no pueden prestar peso al otro: una pierna no mueve la otra.
LADO = ('muslo_', 'pierna_', 'pie_', 'punta_')


def limpiar_lados(W, P, nombres, margen=0.004):
    """Ningún vértice de la pierna izquierda (x > margen) con peso de la derecha, ni al revés: lo que
    tuviera pasa a `caderas`. Devuelve cuántos vértices se tocaron."""
    i = {n: k for k, n in enumerate(nombres)}
    cad = i['caderas']
    tocados = 0
    for lado, ajeno in (('L', 'R'), ('R', 'L')):
        sel = (P[:, 0] > margen) if lado == 'L' else (P[:, 0] < -margen)
        cols = [i[pre + ajeno] for pre in LADO if pre + ajeno in i]
        malos = sel & (W[:, cols].sum(1) > 1e-6)
        if malos.any():
            W[malos, cad] += W[np.ix_(malos, cols)].sum(1)
            W[np.ix_(malos, cols)] = 0.0
            tocados += int(malos.sum())
    return tocados


def transferir_pesos(src, dst, ob_arm, k=4):
    """Pesos de `dst` desde `src` por los k vértices más cercanos (inverso de la distancia).

    ═══ CADA LADO DESDE SU LADO (segunda pasada) ═══ Cuando el calor de Blender no convergía en el LOD0
    (el Celador mayor, la Celadora y los dos camareros) se pesaba el LOD1 y se copiaba al LOD0 así, por
    vecinos: en la entrepierna el vecino más cercano de un vértice de la pierna izquierda era a veces de
    la derecha, y en la guardia, el trote, el Cierre o la Entrada salían picos de hasta 30 cm (dientes
    de sierra que se veían a distancia de juego; la revisión). Ahora un vértice fuera de la línea media
    sólo busca vecinos de su lado, y al final ninguno conserva peso de la pierna del otro."""
    emparentar_vacio(dst, ob_arm)
    Ws, nombres = pesos_array(src, ob_arm)
    Ps = malla._co(src)
    Pd = malla._co(dst)
    arboles = {}
    for lado, sel in (('L', Ps[:, 0] >= -0.001), ('R', Ps[:, 0] <= 0.001), ('*', np.ones(len(Ps), bool))):
        ids = np.nonzero(sel)[0]
        kd = KDTree(len(ids))
        for n in ids:
            kd.insert(Ps[n], int(n))
        kd.balance()
        arboles[lado] = kd
    Wd = np.zeros((len(Pd), len(nombres)))
    for v, p in enumerate(Pd):
        lado = 'L' if p[0] > 0.004 else ('R' if p[0] < -0.004 else '*')
        res = arboles[lado].find_n(p, k)
        ws = np.array([1.0 / max(d, 1e-5) for _, _, d in res])
        ids = [ix for _, ix, _ in res]
        Wd[v] = (ws[:, None] * Ws[ids]).sum(0) / ws.sum()
    limpiar_lados(Wd, Pd, nombres)
    escribir_pesos(dst, Wd, nombres)


def pesos_faldon(ob, ob_arm, sexo, yc=0.015, z_raja=0.66, z_lat=0.0):
    """Faldon: cada vertice sigue a las dos cadenas mas proximas en angulo y a los dos huesos
    mas proximos en altura (cuatro influencias). Arriba, a caderas. No se mezclan las cadenas
    de los dos lados a traves de la abertura delantera ni, bajo la raja, a traves de la trasera,
    ni, bajo `z_lat`, las del costado delantero y el trasero (abertura lateral a 90 grados)."""
    emparentar_vacio(ob, ob_arm)
    W, nombres = pesos_array(ob, ob_arm)
    W[:] = 0
    i = {n: k for k, n in enumerate(nombres)}
    P = malla._co(ob)
    th = np.degrees(np.arctan2(P[:, 0], -(P[:, 1] - yc)))       # 0 delante, + hacia la izquierda
    lado = np.where(th >= 0, 'L', 'R')
    a = np.abs(th)
    ang = np.array(anatomia.ANG_FALDON)
    Z = np.array(anatomia.Z_FALDON)
    # posicion a lo largo de la cadena: 0 en la raiz, 1, 2, 3 en las juntas
    s = np.interp(-P[:, 2], -Z, np.arange(4.0))
    # en la abertura lateral las dos copias de un vertice tienen el mismo angulo: se decide el
    # panel por el angulo medio de sus caras
    a_cara = a.copy()
    if z_lat > 0:
        suma = np.zeros(len(P))
        cuenta = np.zeros(len(P))
        for pol in ob.data.polygons:
            c = pol.center
            ac = abs(math.degrees(math.atan2(c.x, -(c.y - yc))))
            for vi in pol.vertices:
                suma[vi] += ac
                cuenta[vi] += 1
        a_cara = np.where(cuenta > 0, suma / np.maximum(cuenta, 1), a)
    for v in range(len(P)):
        # cadenas y su peso angular
        if a[v] <= ang[0]:
            cad = [((0, lado[v]), 1.0)]
        elif a[v] >= ang[-1]:
            if P[v, 2] < z_raja:
                cad = [((3, lado[v]), 1.0)]
            else:
                # a traves de la espalda: 160 -> 180 -> -160
                f = (a[v] - ang[-1]) / (180.0 - ang[-1]) * 0.5
                otro = 'R' if lado[v] == 'L' else 'L'
                cad = [((3, lado[v]), 1.0 - f), ((3, otro), f)]
        else:
            k = int(np.searchsorted(ang, a[v])) - 1
            f = (a[v] - ang[k]) / (ang[k + 1] - ang[k])
            if k == 1 and P[v, 2] < z_lat:
                # abertura lateral: cada panel sigue solo a su cadena
                cad = [((1 if a_cara[v] < 90.0 else 2, lado[v]), 1.0)]
            else:
                cad = [((k, lado[v]), 1.0 - f), ((k + 1, lado[v]), f)]
        # huesos y su peso en altura (centros de hueso en s = 0.5, 1.5, 2.5); junto a la raiz,
        # parte del peso a caderas para coser con el tronco de la gabardina
        sv = s[v]
        arriba = 0.0
        if sv <= 0.5:
            hs = [(1, 1.0)]
            arriba = 1.0 - _smooth(sv / 0.35)
        elif sv >= 2.5:
            hs = [(3, 1.0)]
        else:
            j = int(np.floor(sv - 0.5))
            f = (sv - 0.5) - j
            hs = [(j + 1, 1.0 - f), (j + 2, f)]
        for (kc, ld), wc in cad:
            for jb, wb in hs:
                W[v, i['faldon%d%d_%s' % (kc, jb, ld)]] += wc * wb * (1.0 - arriba)
        W[v, i['caderas']] += arriba
    escribir_pesos(ob, W, nombres)


def pesos_chaqueta(ob, ob_arm, mat_nombre='mat_abrigo', z0=1.0, z1=0.87, maximo=0.55, yc=0.015, hueco=None):
    """Celador: los faldones de la chaqueta (bajo la cintura) siguen en parte al primer hueso del
    faldon en vez de ir pegados a la cadera y al muslo. `hueco` es el indice del material (el del
    grupo SDF) de la chaqueta: el pantalon del traje se llama igual y no debe entrar."""
    W, nombres = pesos_array(ob, ob_arm)
    i = {n: k for k, n in enumerate(nombres)}
    me = ob.data
    idx_mat = [hueco] if hueco is not None else [k for k, m in enumerate(me.materials) if m.name == mat_nombre]
    usa = np.zeros(len(me.vertices), bool)
    for p in me.polygons:
        if p.material_index in idx_mat:
            usa[list(p.vertices)] = True
    P = malla._co(ob)
    sel = usa & (P[:, 2] < z0) & (np.abs(P[:, 0]) < 0.3)
    th = np.degrees(np.arctan2(P[:, 0], -(P[:, 1] - yc)))
    ang = np.array(anatomia.ANG_FALDON)
    for v in np.nonzero(sel)[0]:
        f = maximo * _smooth((z0 - P[v, 2]) / (z0 - z1))
        ld = 'L' if th[v] >= 0 else 'R'
        a = abs(th[v])
        if a <= ang[0]:
            cad = [(0, 1.0)]
        elif a >= ang[-1]:
            cad = [(3, 1.0)]
        else:
            k = int(np.searchsorted(ang, a)) - 1
            g = (a - ang[k]) / (ang[k + 1] - ang[k])
            cad = [(k, 1 - g), (k + 1, g)]
        W[v] *= (1 - f)
        for kc, wc in cad:
            W[v, i['faldon%d1_%s' % (kc, ld)]] += f * wc
    escribir_pesos(ob, W, nombres)
    return int(sel.sum())


def pesos_rigidos(ob, ob_arm, fn):
    """fn(P) -> dict hueso: array de pesos."""
    emparentar_vacio(ob, ob_arm)
    W, nombres = pesos_array(ob, ob_arm)
    P = malla._co(ob)
    for n, w in fn(P).items():
        W[:, nombres.index(n)] = w
    escribir_pesos(ob, W, nombres)
