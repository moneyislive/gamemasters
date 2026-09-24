"""Piezas que no salen bien del SDF: ojos, cejas, gafas y faldon.

El auricular del prototipo sigue aqui pero NO se usa: el diseño (§1) quita el auricular a los
Celadores. El faldon lleva el forro por dentro (otro material: el del asiento en los desvelados)
y aberturas laterales que separan el panel delantero del trasero."""
import math
import numpy as np
import bpy
import bmesh
from mathutils import Vector, Matrix

import malla
import anatomia
from sdf import _v

ATTR = 'color'          # atributo de color por vertice que se exporta como COLOR_0


def _obj(nombre, bm, materiales, colores=None):
    me = bpy.data.meshes.new(nombre)
    bm.to_mesh(me)
    bm.free()
    for m in materiales:
        me.materials.append(m)
    ob = bpy.data.objects.new(nombre, me)
    bpy.context.scene.collection.objects.link(ob)
    malla.color_vertices(ob, colores)
    return ob


def _mat(fig, nombre):
    c, r, m = malla.MATERIALES[fig].get(nombre, ((0.02, 0.02, 0.02), 0.5, 0.0))
    return malla.material(nombre, c, r, m)


def _tubo(bm, pts, radios, lados=6, cerrar=True, mat=0, arriba=(0, 0, 1), bucle=False):
    """Tubo por una polilinea (secciones perpendiculares); bucle=True cierra un anillo."""
    pts = [Vector(p) for p in pts]
    anillos = []
    up = Vector(arriba)
    for i, p in enumerate(pts):
        if bucle:
            t = pts[(i + 1) % len(pts)] - pts[i - 1]
        elif i == 0:
            t = pts[1] - pts[0]
        elif i == len(pts) - 1:
            t = pts[-1] - pts[-2]
        else:
            t = pts[i + 1] - pts[i - 1]
        t.normalize()
        a = up - t * up.dot(t)
        if a.length < 1e-6:
            a = Vector((1, 0, 0)) - t * t.x
        a.normalize()
        b = t.cross(a)
        r = radios[i] if hasattr(radios, '__len__') else radios
        ring = []
        for k in range(lados):
            ang = 2 * math.pi * (k + 0.5) / lados
            ring.append(bm.verts.new(p + (a * math.cos(ang) + b * math.sin(ang)) * r))
        anillos.append(ring)
    n_an = len(anillos) if bucle else len(anillos) - 1
    for i in range(n_an):
        A, B = anillos[i], anillos[(i + 1) % len(anillos)]
        for k in range(lados):
            f = bm.faces.new((A[k], A[(k + 1) % lados], B[(k + 1) % lados], B[k]))
            f.material_index = mat
            f.smooth = True
    if cerrar and not bucle:
        for ring, rev in ((anillos[0], True), (anillos[-1], False)):
            f = bm.faces.new(list(reversed(ring)) if rev else ring)
            f.material_index = mat
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return anillos


# ------------------------------------------------------------------ ojos
# anillos (grados desde el eje de la mirada) y su color: pupila, iris, limbo, esclerotica
# (seis bandas: con el presupuesto de 8.000 triángulos del propio, 450 se iban en los dos globos)
_ANILLOS = (0.0, 8.0, 18.0, 26.0, 40.0, 70.0, 110.0, 180.0)
IRIS = {'desvelado-hombre': (0.030, 0.016, 0.008), 'desvelado-mujer': (0.018, 0.022, 0.016),
        'celador-hombre': (0.020, 0.024, 0.030), 'celador-mujer': (0.022, 0.018, 0.012),
        'durmiente-hombre': (0.045, 0.024, 0.010), 'durmiente-mujer': (0.012, 0.008, 0.005)}


def _iris(fig):
    import reparto
    return IRIS.get(reparto.FIGURAS[fig]['familia'], (0.03, 0.02, 0.01)) if fig in reparto.FIGURAS else (0.03, 0.02, 0.01)


def _color_ojo(ang, iris):
    esc = (0.60, 0.56, 0.52)
    if ang < 3.5:
        return (0.004, 0.004, 0.004)
    if ang < 11:
        return (0.006, 0.005, 0.004)
    if ang < 20:
        return iris
    if ang < 27:
        return tuple(0.55 * c for c in iris)
    return esc


def ojos(fig, cu, segmentos=12, anillos=_ANILLOS):
    """Globo ocular con pupila, iris y esclerotica pintados por vertice (sin textura)."""
    bm = bmesh.new()
    r = cu.r_ojo
    cols = []
    iris = _iris(fig)
    for s in (1, -1):
        c = Vector(cu.ojo * _v((s, 1, 1)))
        # mirada al frente, 4 grados hacia fuera
        eje = Vector((0.07 * s, -1.0, 0.0)).normalized()
        a = eje.orthogonal().normalized()
        b = eje.cross(a).normalized()
        polo = bm.verts.new(c + eje * r)
        cols.append(_color_ojo(0.0, iris))
        filas = []
        for ang in anillos[1:-1]:
            t = math.radians(ang)
            fila = []
            for k in range(segmentos):
                ph = 2 * math.pi * k / segmentos
                d = eje * math.cos(t) + (a * math.cos(ph) + b * math.sin(ph)) * math.sin(t)
                fila.append(bm.verts.new(c + d * r))
                cols.append(_color_ojo(ang, iris))
            filas.append(fila)
        atras = bm.verts.new(c - eje * r)
        cols.append(_color_ojo(180.0, iris))
        n = segmentos
        for k in range(n):
            bm.faces.new((polo, filas[0][k], filas[0][(k + 1) % n]))
        for i in range(len(filas) - 1):
            A, B = filas[i], filas[i + 1]
            for k in range(n):
                bm.faces.new((A[k], B[k], B[(k + 1) % n], A[(k + 1) % n]))
        for k in range(n):
            bm.faces.new((filas[-1][(k + 1) % n], filas[-1][k], atras))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _obj('ojos', bm, [_mat(fig, 'mat_ojos')], colores=np.array(cols))


def ojos_lod(fig, cu):
    return ojos(fig, cu, segmentos=6, anillos=(0.0, 20.0, 35.0, 90.0, 180.0))


# ------------------------------------------------------------------ cejas
def cejas(fig, cu):
    e = cu.escala_cabeza
    src = cu.fuente_cabeza_simple()
    bm = bmesh.new()
    n = 5
    f = cu.sexo == 'f'
    HC = anatomia.CABEZA_C
    for s in (1, -1):
        secciones = []
        for i in range(n):
            t = i / (n - 1)
            x = (0.012 + 0.036 * t) * e
            z = HC[2] + ((1.7115 + (0.0065 if f else 0.004) * math.sin(t * 2.4)) - 1.68) * e
            y = cu.superficie_y(x, z, src)
            y2 = cu.superficie_y(x + 0.004, z, src)
            nx = -(y2 - y) / 0.004
            nrm = Vector((nx, -1.0, 0.0)).normalized()
            alto = ((0.0072 if not f else 0.0048) * (1.0 - 0.45 * t) + 0.002) * e
            grosor = (0.0028 if not f else 0.0022) * e
            c = Vector((x, y, z))
            up = Vector((0, 0, 1))
            q = [c + up * alto * 0.5 + nrm * grosor, c - up * alto * 0.5 + nrm * grosor,
                 c - up * alto * 0.5 - nrm * 0.0015, c + up * alto * 0.5 - nrm * 0.0015]
            if s < 0:
                q = [Vector((-v.x, v.y, v.z)) for v in q]
            secciones.append([bm.verts.new(v) for v in q])
        for i in range(n - 1):
            A, B = secciones[i], secciones[i + 1]
            for k in range(4):
                vs = (A[k], A[(k + 1) % 4], B[(k + 1) % 4], B[k])
                bm.faces.new(vs if s > 0 else tuple(reversed(vs)))
        for ring, rev in ((secciones[0], s > 0), (secciones[-1], s < 0)):
            bm.faces.new(list(reversed(ring)) if rev else ring)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f_ in bm.faces:
        f_.smooth = False
    return _obj('cejas', bm, [_mat(fig, 'mat_pelo')])


# ------------------------------------------------------------------ gafas
# ═══ LAS MONTURAS DE LOS CELADORES (segunda pasada) ═══
# La revisión: los cuatro llevaban la misma gafa rectangular opaca, del mismo tamaño. Cada silueta lleva
# la suya y ninguna es redonda (las redondas son de la lista de lo que no sale, §1):
#   gato        la Celadora: ojo de gato, la esquina de fuera levantada;
#   envolvente  el alto: deportiva, baja y ancha, que abraza la sien;
#   barra       el ancho: de barra arriba, recta por encima y gruesa, como una ceja de pasta;
#   pinza       el mayor: montura fina de metal con el suplemento oscuro de pinza bajado.
# Los cristales, tintados (el color va en la paleta de cada figura: verde, humo azulado, pardo, ciruela),
# no negros opacos.
FORMAS = {
    # forma: (desplazamiento del centro hacia fuera, alto del centro, abrazo a la sien, grosor de montura)
    'gato': (0.0015, 0.0015, 0.007, 0.0017),
    'envolvente': (0.0035, 0.0010, 0.016, 0.0015),
    'barra': (0.0040, 0.0020, 0.006, 0.0014),
    'pinza': (0.0030, 0.0015, 0.005, 0.0010),
    'rect': (0.0040, 0.0020, 0.006, 0.0018),
}


def _contorno(forma, a, b, n=18):
    pts = []
    for k in range(n):
        t = 2 * math.pi * k / n
        c, s = math.cos(t), math.sin(t)
        if forma in ('rect', 'barra', 'pinza', 'envolvente'):
            p = {'rect': 4.0, 'barra': 5.0, 'pinza': 3.4, 'envolvente': 5.0}[forma]
            x = a * math.copysign(abs(c) ** (2 / p), c)
            y = b * math.copysign(abs(s) ** (2 / p), s)
            if s < 0:
                x *= 1.0 - (0.12 if forma != 'envolvente' else 0.2) * abs(s)      # algo mas estrecho abajo
            if forma == 'barra' and s > 0:
                y = b * min(1.0, 1.35 * abs(s) ** (2 / p))                     # canto de arriba recto
            if forma == 'envolvente' and c > 0:
                y *= 1.0 + 0.25 * c                                            # mas alto hacia la sien
        elif forma == 'gato':
            x, y = a * c, b * s
            if s > 0 and c > 0:
                y += b * 0.6 * (c * s) * 2                                     # esquina exterior levantada
                x += a * 0.12 * (c * s)
        else:
            raise ValueError('montura sin forma: %s (y nunca redonda)' % forma)
        pts.append((x, y))
    return pts


def gafas(fig, cu, spec):
    e = cu.escala_cabeza
    forma, a, b = spec['forma'], spec['ancho'] * e, spec['alto'] * e
    fuera, alto_c, abrazo, grosor_m = FORMAS[forma]
    ojo = Vector(cu.ojo)
    src = cu.fuente_cabeza_simple()
    y_puente = cu.superficie_y(0.0, ojo.z + 0.004 * e, src) - 0.0025
    simple = spec.get('simple', False)
    # en el LOD1 la cara diezmada rellena las cuencas: la lente va algo mas adelante
    y_lente = y_puente - (0.008 if simple else 0.0045) * e
    bm = bmesh.new()
    lentes, montura = 0, 1
    oreja = Vector(cu.oreja)
    bordes = {}
    for s in (1, -1):
        cx = (0.0325 * e + fuera * e) * s
        cz = ojo.z + alto_c * e
        cont = _contorno(forma, a, b, n=spec.get('lados', 18))
        borde = []
        for (x, y) in cont:
            xx = cx + x * s
            u = max(0.0, (abs(xx) - abs(cx) + a) / (2 * a))
            desp = abrazo * e * u ** 2 + 0.002 * e * u
            borde.append(Vector((xx, y_lente + desp, cz + y)))
        bordes[s] = borde
        fr = [bm.verts.new(v) for v in borde]
        bk = [bm.verts.new(v + Vector((0, 0.0018, 0))) for v in borde]
        f1 = bm.faces.new(fr if s > 0 else list(reversed(fr)))
        f2 = bm.faces.new(list(reversed(bk)) if s > 0 else bk)
        f1.material_index = lentes
        f2.material_index = lentes
        f1.smooth = False
        f2.smooth = False
        # canto de la lente (cerrada: sin aristas abiertas)
        nb = len(borde)
        for k in range(nb):
            q = (fr[k], fr[(k + 1) % nb], bk[(k + 1) % nb], bk[k])
            fc = bm.faces.new(q if s < 0 else tuple(reversed(q)))
            fc.material_index = lentes
            fc.smooth = False
        if simple:
            continue
        grosor = grosor_m * e
        _tubo(bm, borde, grosor, lados=4, mat=montura, arriba=(0, -1, 0), bucle=True)
        if forma == 'barra':
            # la barra de pasta: el medio contorno de arriba, el triple de grueso
            arriba = [v for v in borde if v.z > cz + 0.35 * b]
            arriba.sort(key=lambda v: v.x * s)
            _tubo(bm, [v + Vector((0, -0.0006, 0.0008)) for v in arriba], 0.0032 * e, lados=5, mat=montura)
        # patilla: del borde exterior a la parte alta de la oreja
        ext = max(borde, key=lambda v: v.x * s)
        tope = Vector((oreja.x * s * 1.03, oreja.y - 0.006 * e, ojo.z + 0.003 * e))
        med = Vector((oreja.x * s * 1.05, (ext.y + tope.y) * 0.5, ojo.z + 0.005 * e))
        ancho_patilla = 0.0014 * e if forma != 'envolvente' else 0.0024 * e
        _tubo(bm, [ext, med, tope, tope + Vector((0.002 * s, 0.016 * e, -0.02 * e))], ancho_patilla, lados=4, mat=montura)
    if simple:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        return _obj('gafas_lod', bm, [_mat(fig, 'mat_gafas'), _mat(fig, 'mat_montura')])
    iz = max([v for v in bm.verts if v.co.x > 0], key=lambda v: -v.co.x).co
    p0 = Vector((iz.x, iz.y, iz.z + 0.004 * e))
    _tubo(bm, [p0, Vector((0, y_puente - 0.001, p0.z + 0.003 * e)), Vector((-p0.x, p0.y, p0.z))], 0.0013 * e, lados=4, mat=montura)
    if forma == 'pinza':
        # la pinza del suplemento, sobre el puente
        c = Vector((0.0, y_puente - 0.004 * e, ojo.z + 0.013 * e))
        _tubo(bm, [c + Vector((-0.006 * e, 0, 0)), c + Vector((0.006 * e, 0, 0))], 0.0022 * e, lados=4, mat=montura)
    return _obj('gafas', bm, [_mat(fig, 'mat_gafas'), _mat(fig, 'mat_montura')])


# ------------------------------------------------------------------ corbata
def corbata(fig, cu, material='mat_corbata', simple=False):
    """La corbata del Celador: una tira fina que baja por la línea media de la camisa (3 mm fuera), con
    su nudo y la pala que se ensancha hasta una punta en V escondida bajo el botón de la chaqueta. Sus
    pesos se copian del cuerpo (`rig.transferir_pesos`), así que sigue a la camisa."""
    f = cu.sexo == 'f'
    src = anatomia.camisa_de_la_corbata(cu)
    z0 = 1.463 if not f else 1.452
    zn = z0 - 0.03                     # bajo del nudo
    zt = 1.118 if not f else 1.14      # la punta: bajo el botón (a 1,105 en el hombre)
    n = 7 if simple else 13
    zs = list(np.linspace(z0, zn, 3)) + list(np.linspace(zn - 0.012, zt + 0.022, n - 3))
    ys = anatomia.superficie_frontal(src, 0.0, zs)
    bm = bmesh.new()
    filas = []
    for i, (z, y) in enumerate(zip(zs, ys)):
        if z >= zn:
            w = 0.019 - 0.006 * (z0 - z) / (z0 - zn)      # nudo: trapecio
            t = 0.011
        else:
            u = (zn - z) / (zn - zt)
            w = 0.011 + 0.022 * u ** 0.8
            t = 0.0034
        yf = y - 0.003
        filas.append([bm.verts.new((-w, yf - t, z)), bm.verts.new((w, yf - t, z)),
                      bm.verts.new((w, yf, z)), bm.verts.new((-w, yf, z))])
    # la punta en V
    yp = anatomia.superficie_frontal(src, 0.0, [zt])[0] - 0.003
    punta = [bm.verts.new((0, yp - 0.0034, zt)), bm.verts.new((0, yp, zt))]
    for A, B in zip(filas[:-1], filas[1:]):
        for k in range(4):
            bm.faces.new((A[k], A[(k + 1) % 4], B[(k + 1) % 4], B[k]))
    bm.faces.new(list(reversed(filas[0])))
    U = filas[-1]
    bm.faces.new((U[0], U[1], punta[0]))
    bm.faces.new((U[2], U[3], punta[1]))
    bm.faces.new((U[1], U[2], punta[1], punta[0]))
    bm.faces.new((U[3], U[0], punta[0], punta[1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f_ in bm.faces:
        f_.smooth = False
    return _obj('corbata', bm, [_mat(fig, material)])


# ------------------------------------------------------------------ auricular
def auricular(fig, cu):
    bm = bmesh.new()
    e = cu.escala_cabeza
    o = Vector(cu.oreja)
    oreja = Vector((-(o.x + 0.004 * e), o.y - 0.002 * e, o.z + 0.002 * e))
    bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=5, radius=0.0055 * e, matrix=Matrix.Translation(oreja))
    ctrl = [oreja + Vector((0.0, 0.004, -0.004)), Vector((oreja.x - 0.002, oreja.y + 0.012, oreja.z - 0.028)),
            Vector((-0.074, 0.03, 1.6)), Vector((-0.066, 0.044, 1.56)), Vector((-0.06, 0.058, 1.52)), Vector((-0.056, 0.068, 1.48))]
    pts = []
    N = 44
    for i in range(N + 1):
        t = i / N * (len(ctrl) - 1)
        k = min(int(t), len(ctrl) - 2)
        f = t - k
        p = ctrl[k].lerp(ctrl[k + 1], f)
        if 0.12 < i / N < 0.9:
            ang = i * 1.3
            p = p + Vector((math.cos(ang) * 0.0028, math.sin(ang) * 0.0028, 0))
        pts.append(p)
    _tubo(bm, pts, 0.0011, lados=4, mat=0)
    return _obj('auricular', bm, [_mat(fig, 'mat_cable')])


# ------------------------------------------------------------------ faldon
def faldon(fig, grupos, spec, sexo, n_anillos=16, n_seg=40, yc=0.015, log=print):
    """Faldon con el perfil analitico de anatomia.perfil_faldon (el mismo que coloca las cadenas de
    huesos), mas `holgura` (abrigo grueso). Abierto por delante, raja trasera bajo `z_raja` y
    aberturas laterales bajo `z_lat` (a 90 grados, entre la cadena del costado delantero y la del
    trasero). Grosor con Solidify hacia dentro: la cara nueva (el interior) y el canto llevan el
    material `forro`."""
    z_top, z_hem = spec['z_top'], spec['z_hem']
    zs = z_top - (z_top - z_hem) * (np.linspace(0, 1, n_anillos) ** 1.1)
    z_raja = spec.get('z_raja', 0.66)
    z_lat = spec.get('z_lat', 0.0)
    holgura = spec.get('holgura', 0.0)
    # la Mole: holgura SOLO arriba, para casar con su tronco acolchado; el bajo cae como el de la gabardina
    holgura_arriba = spec.get('holgura_arriba', 0.0)
    a_top = math.radians(spec['abertura_top'])
    # columnas partidas: la de atras (raja) y las dos de los costados (aberturas laterales)
    mid = n_seg // 2
    lat = [int(round((math.pi / 2 - a_top) / (2 * math.pi - 2 * a_top) * n_seg)),
           int(round((3 * math.pi / 2 - a_top) / (2 * math.pi - 2 * a_top) * n_seg))]
    bm = bmesh.new()
    filas = []
    for i, z in enumerate(zs):
        t = (z_top - z) / (z_top - z_hem)
        a = math.radians(spec['abertura_top'] + (spec['abertura_hem'] - spec['abertura_top']) * t ** 1.4)
        fila = []
        for j in range(n_seg + 1):
            ang = a + (2 * math.pi - 2 * a) * j / n_seg
            w_arriba = min(1.0, max(0.0, (z - 0.82) / 0.13))
            r = float(anatomia.perfil_faldon(sexo, ang, z)) + holgura * min(1.0, max(0.0, (1.02 - z) / 0.08))
            r += holgura_arriba * w_arriba * w_arriba * (3 - 2 * w_arriba)
            p = Vector((r * math.sin(ang), yc - r * math.cos(ang), z))
            v = bm.verts.new(p)
            partida = (j == mid and z < z_raja) or (j in lat and z < z_lat)
            fila.append((v, bm.verts.new(p)) if partida else (v, v))
        filas.append(fila)
    for i in range(len(filas) - 1):
        A, B = filas[i], filas[i + 1]
        for j in range(n_seg):
            # la cara a la derecha de una columna partida usa su copia: asi se separan los paneles
            a0 = A[j][1] if j in (mid, *lat) else A[j][0]
            b0 = B[j][1] if j in (mid, *lat) else B[j][0]
            a1, b1 = A[j + 1][0], B[j + 1][0]
            bm.faces.new((a0, b0, b1, a1))
    bmesh.ops.remove_doubles(bm, verts=[v for v in bm.verts if not v.link_faces], dist=0.0)
    sueltos = [v for v in bm.verts if not v.link_faces]
    if sueltos:
        bmesh.ops.delete(bm, geom=sueltos, context='VERTS')
    mats = [_mat(fig, spec['material'])]
    forro = spec.get('forro')
    if forro:
        mats.append(_mat(fig, forro))
        # la cara que se modela es la de DENTRO en posición, pero el SOLIDIFY con desplazamiento +1 la
        # empuja a ella hacia fuera y deja la copia en su sitio (medido en un cilindro: la original
        # acaba 1 grosor por fuera). Así que la modelada lleva la tela del abrigo y la copia, el forro;
        # con el forro en la modelada, el abrigo entero salía por fuera del color del asiento.
    ob = _obj('faldon', bm, mats)
    m = ob.modifiers.new('grosor', 'SOLIDIFY')
    m.thickness = spec['grosor']
    # ═══ EL GROSOR, HACIA FUERA (segunda pasada) ═══ Hacia dentro, la cara interior quedaba 7 mm (la
    # gabardina) o 18 (la Mole) por dentro de las cadenas que choca la simulación, y las piernas la
    # atravesaban aunque las cadenas no. Hacia fuera, la cadena ES la cara de dentro (con el forro), la
    # cara nueva es la de fuera (el abrigo) y el canto, ribete del color del asiento.
    m.offset = 1.0
    m.use_even_offset = True
    m.use_rim = True
    if forro:
        m.material_offset = 1          # la copia (dentro): el forro
        m.material_offset_rim = 1      # el canto: ribete del color del asiento
    malla.aplicar_mods(ob)
    # holgura con el cuerpo en reposo (debe ser positiva: la tela no toca la pierna)
    cuerpo = [g for g in grupos if g.name != spec['material']]
    V = np.array([v.co[:] for v in ob.data.vertices])
    baja = V[:, 2] < 0.93
    if baja.any():
        D = np.min(np.stack([g.eval_points(V[baja]) for g in cuerpo], 1), 1)
        log('faldon %s: holgura minima con el cuerpo en reposo %.1f mm' % (fig, 1000 * D.min()))
    malla.color_vertices(ob, None)
    return ob
