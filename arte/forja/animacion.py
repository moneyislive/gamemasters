"""Animaciones por codigo: FK propia + IK analitica de dos huesos, horneadas a 30 fps.

Cada clip es una funcion del fotograma que devuelve una 'pose' (diccionario de parametros en
espacio del esqueleto: X = izquierda, Y = atras, Z = arriba; posiciones en metros de la
plantilla de 1,80 m, que se escalan solas para la mujer). El horneado hace, por fotograma:

  1. resolver la pose (FK/IK, dedos, giro del antebrazo, orientacion de la mano);
  2. SUELO con la MALLA: deforma las mallas reales de las figuras (skinning lineal, como three.js)
     y si algo baja del suelo sube la cadera (o el pie); en los tramos 'contacto' (tumbado,
     rodando) la baja hasta tocarlo;
  3. rodadura sin deslizar (voltereta): el cuerpo avanza lo que ruedan los puntos de apoyo;
  4. desplazamiento de raiz (root motion) en los clips que se mueven: 'raiz' sigue a la cadera;
  5. faldon: simulacion de 8 cadenas de 3 huesos (muelle, inercia, viento en la carrera,
     colision con muslos, piernas, pies, manos, antebrazos, pelvis y suelo).
"""
import math
import numpy as np
import bpy
from mathutils import Matrix, Quaternion, Vector, Euler

import anatomia

FPS = 30

# ------------------------------------------------------------------ utilidades


def E(e):
    """Euler en grados (ejes del esqueleto) -> matriz 3x3."""
    if e is None:
        return Matrix.Identity(3)
    return Euler([math.radians(a) for a in e], 'XYZ').to_matrix()


def rot_eje(eje, grados):
    return Matrix.Rotation(math.radians(grados), 3, Vector(eje))


def Rx(g):
    return Matrix.Rotation(math.radians(g), 3, 'X')


def Ry(g):
    return Matrix.Rotation(math.radians(g), 3, 'Y')


def Rz(g):
    return Matrix.Rotation(math.radians(g), 3, 'Z')


def lerp(a, b, t):
    if isinstance(a, (tuple, list)):
        return tuple(lerp(x, y, t) for x, y in zip(a, b))
    return a + (b - a) * t


def suave(t):
    return t * t * (3 - 2 * t)


EASE = {
    'suave': suave,
    'lineal': lambda t: t,
    'entra': lambda t: t * t * t,                   # acelera (golpe)
    'sale': lambda t: 1 - (1 - t) ** 3,             # frena (recuperacion)
    'sale2': lambda t: 1 - (1 - t) ** 2,
    'entra2': lambda t: t * t,
    # el golpe: arranca antes que el cúbico y acelera hasta el impacto (el pico de velocidad cae en el
    # fotograma que entra al impacto, no dos antes)
    'golpe': lambda t: t ** 1.7,
}

# Factor de los clips que VIAJAN: las distancias del juego (3,5 m el quiebro, 5,5 la Entrada) son
# absolutas, y la mujer se hornea en la plantilla de 1,80 escalada por 0,94: sus clips recorrían 3,29 y
# 5,17 m (la revisión). `hornear` lo pone a 1/ESC del esqueleto antes de pedir las poses; las claves que
# viajan multiplican por él.
VIAJE = 1.0


def v3(a):
    return Vector((float(a[0]), float(a[1]), float(a[2])))


# ------------------------------------------------------------------ reposo del esqueleto
class Esqueleto:
    def __init__(self, arm):
        self.arm = arm
        sexo = arm.get('sexo', 'm')
        anatomia.configurar(sexo)
        self.sexo = sexo
        self.esc = anatomia.ESC
        self.R, self.head, self.tail, self.parent, self.orden = {}, {}, {}, {}, []
        for b in arm.data.bones:
            self.R[b.name] = b.matrix_local.to_3x3()
            self.head[b.name] = b.head_local.copy()
            self.tail[b.name] = b.tail_local.copy()
            self.parent[b.name] = b.parent.name if b.parent else None
        pend = [b.name for b in arm.data.bones if b.parent is None]
        while pend:
            n = pend.pop(0)
            self.orden.append(n)
            pend += [c.name for c in arm.data.bones[n].children]
        bl = arm.data.bones
        self.l_muslo = (bl['pierna_L'].head_local - bl['muslo_L'].head_local).length
        self.l_pierna = (bl['pie_L'].head_local - bl['pierna_L'].head_local).length
        self.l_brazo = (bl['antebrazo_L'].head_local - bl['brazo_L'].head_local).length
        self.l_antebrazo = (bl['mano_L'].head_local - bl['antebrazo_L'].head_local).length
        self.tobillo = {s: bl['pie_' + s].head_local.copy() for s in 'LR'}
        e = self.esc
        self.talon = {s: Vector((self.tobillo[s].x, self.tobillo[s].y + 0.047 * e, 0.0)) for s in 'LR'}
        self.bola = {s: Vector((self.tobillo[s].x, bl['punta_' + s].head_local.y - 0.004 * e, 0.0)) for s in 'LR'}
        self.falda = anatomia.huesos_faldon()


# ------------------------------------------------------------------ pose neutra
BAJAR = 75.0 - math.degrees(anatomia.APOSE)   # los brazos cuelgan a 15 grados de la vertical

# dedos: (curl nudillo, curl falange, (pulgar a traves de la palma, pulgar flexion))
MANOS = {
    'relajada': (16.0, 24.0, (8.0, 6.0)),
    'abierta': (4.0, 6.0, (0.0, 0.0)),
    'puno': (92.0, 104.0, (46.0, 30.0)),
    'agarre': (74.0, 82.0, (40.0, 22.0)),
    'teclear': (26.0, 30.0, (8.0, 4.0)),
    'tensa': (45.0, 55.0, (20.0, 12.0)),
    'apoyo': (6.0, 4.0, (4.0, 0.0)),
}


def manos(nombre_L, nombre_R=None):
    a = MANOS[nombre_L]
    b = MANOS[nombre_R or nombre_L]
    return {'ded_L': a[:2], 'pul_L': a[2], 'ded_R': b[:2], 'pul_R': b[2]}


def pose_base():
    p = {
        'cad': (0.0, 0.0, -0.012), 'cad_r': (0, 0, 0),
        'col': (1.5, 0, 0), 'col1': (1.0, 0, 0), 'pec': (-1.5, 0, 0), 'cue': (1, 0, 0), 'cab': (-1, 0, 0),
        'hom_L': (0, 0, 0), 'hom_R': (0, 0, 0),
        'bra_L': (0, 0, 0), 'bra_R': (0, 0, 0), 'cod_L': 14.0, 'cod_R': 14.0,
        'mun_L': (0, 0, 0), 'mun_R': (0, 0, 0),
        'ikb_L': 0.0, 'ikb_R': 0.0, 'mano_L': (0.25, -0.2, 1.0), 'mano_R': (-0.25, -0.2, 1.0),
        # el golpe: (dirección x, y, z, extensión del brazo 0-1, peso 0-1); ver `resolver`
        'golpe_L': (0.0, -1.0, 0.0, 0.9, 0.0), 'golpe_R': (0.0, -1.0, 0.0, 0.9, 0.0),
        'codo_L': (0.4, 0.6, -0.6), 'codo_R': (-0.4, 0.6, -0.6),
        'orm_L': None, 'orm_R': None,
        'ikp_L': 1.0, 'ikp_R': 1.0,
        'pie_L': (0.1, 0.075, 0.0), 'pie_R': (-0.1, 0.075, 0.0),
        'pier_L': (6.0, 0.0), 'pier_R': (-6.0, 0.0),        # (yaw, pitch) del pie
        'dedo_L': None, 'dedo_R': None,
        'rod_L': (0.08, -1.0, 0.0), 'rod_R': (-0.08, -1.0, 0.0),
        'mus_L': (0, 0, 0), 'mus_R': (0, 0, 0), 'rodfk_L': 0.0, 'rodfk_R': 0.0, 'tobfk_L': 0.0, 'tobfk_R': 0.0,
        'desp': (0.0, 0.0, 0.0),
    }
    p.update(manos('relajada'))
    return p


def desplazar(p, d):
    """Mueve la pose entera (cadera y objetivos de IK) d metros en el plano."""
    q = dict(p)
    for k in ('cad', 'pie_L', 'pie_R', 'mano_L', 'mano_R'):
        if k in q and q[k] is not None:
            q[k] = tuple(a + b for a, b in zip(q[k], (d[0], d[1], 0.0)))
    return q


# ------------------------------------------------------------------ solucionador
def _ik2(H, T, l1, l2, polo, signo):
    """Devuelve (dir1, dir2, eje_bisagra) para una cadena de dos huesos."""
    d = T - H
    dist = d.length
    dist = min(max(dist, abs(l1 - l2) + 1e-4), (l1 + l2) * 0.9995)
    u = d.normalized()
    v = Vector(polo) - u * Vector(polo).dot(u)
    if v.length < 1e-6:
        v = Vector((0, -1, 0)) - u * (-u.y)
    v.normalize()
    ca = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist)
    ca = max(-1.0, min(1.0, ca))
    sa = math.sqrt(1 - ca * ca)
    K = H + (u * ca + v * sa) * l1
    Tq = H + u * dist
    y1 = (K - H).normalized()
    y2 = (Tq - K).normalized()
    n = u.cross(v) * signo
    return y1, y2, n.normalized()


def _marco(X, Y):
    X = (X - Y * X.dot(Y)).normalized()
    Z = X.cross(Y)
    return Matrix((X, Y, Z)).transposed()


def _pie(sk, s, ref, yaw, pitch, dedo=None):
    """Tobillo objetivo y orientaciones de pie y punta a partir de la huella."""
    D = Rz(yaw) @ Rx(-pitch)
    A0, H0, G0 = sk.tobillo[s], sk.talon[s], sk.bola[s]
    if pitch >= 0:
        tob = ref + D @ (A0 - H0)
    else:
        bola = ref + Rz(yaw) @ (G0 - H0)
        tob = bola + D @ (A0 - G0)
    if dedo is None:
        dp = pitch if pitch >= 0 else pitch * min(1.0, max(0.0, ref.z / 0.06))
    else:
        dp = dedo
    return tob, D, Rz(yaw) @ Rx(-dp)


def pie_por_bola(sk, s, bola, yaw):
    """Huella (talon) que deja la bola del pie en 'bola' con esa guinada (pivotar sobre la bola)."""
    e = 1.0 / sk.esc
    G0, H0 = sk.bola[s], sk.talon[s]
    ref = Vector(bola) * sk.esc - Rz(yaw) @ (G0 - H0)
    return tuple(ref * e)


def _marco_mano(palma, dedos, s):
    n = v3(palma).normalized()
    Y = v3(dedos)
    Y = (Y - n * Y.dot(n)).normalized()
    X = -n if s == 'L' else n
    return _marco(X, Y)


def _giro_y(q):
    """Angulo (grados) de la componente de giro alrededor del eje Y local."""
    return math.degrees(2.0 * math.atan2(q.y, q.w))


ADELANTE = Vector((0.0, -1.0, 0.0))
# ═══ LOS TOPES DE LAS BISAGRAS (captura, segunda pasada) ═══ La revisión midió codos que se doblaban 47-84°
# fuera de su eje y tibias giradas 44° sobre una rodilla recta en todo lo que salía de la captura: la IK
# de la primera pasada giraba cada hueso «lo justo» y dejaba el giro propio que traía la captura, y en UAL
# ese giro del húmero y del muslo NO es el de su bisagra (medido en sus datos: el eje en que dobla el codo
# se aparta 20-44° del que dice su reposo en el percentil 90, fotograma a fotograma). Ahora el codo y la
# rodilla doblan SOBRE SU EJE: el plano lo ponen las articulaciones (hombro, codo, muñeca), y el húmero y
# el muslo toman el giro que ese plano pide. Lo que la mano gira de más respecto al antebrazo (la
# pronación) va al hueso `giro_` y a la muñeca, con topes.
CODO_MAX = 145.0            # flexión del codo (grados)
RODILLA_MAX = 155.0
TIBIA_RECTA = 14.0          # lo que la tibia puede girar sobre la rodilla casi recta respecto al pie...
TIBIA_DOBLADA = 32.0        # ...y doblada (hasta 45°; más recogida, el pie no dice hacia dónde va la rodilla)
MUNECA_MAX = 72.0           # lo que la mano se dobla respecto al antebrazo
PRONACION_MAX = 110.0       # lo que la mano gira sobre el antebrazo
_BISAGRAS = {}


def _marco_yx(y, x):
    """Marco (columnas X, Y, Z) con Y = y y X = x hecho perpendicular a y."""
    y = y.normalized()
    x = x - y * x.dot(y)
    if x.length < 1e-9:
        x = y.orthogonal()
    x.normalize()
    return Matrix((x, y, x.cross(y))).transposed()


def bisagra_de_reposo(sk, raiz_b, medio_b, fin_b, doblez):
    """Direcciones de reposo de los dos huesos y el eje de la bisagra en reposo (Y1 × hacia donde dobla: el
    antebrazo, hacia delante; la tibia, hacia atrás). El mismo convenio que la batería del movimiento."""
    clave = (id(sk), raiz_b)
    if clave not in _BISAGRAS:
        Y1 = (sk.head[medio_b] - sk.head[raiz_b]).normalized()
        Y2 = (sk.head[fin_b] - sk.head[medio_b]).normalized()
        n0 = Y1.cross(doblez).normalized()
        _BISAGRAS[clave] = (Y1, Y2, n0, _marco_yx(Y1, n0), _marco_yx(Y2, n0))
    return _BISAGRAS[clave]


def _girar_sobre(v, eje, ang):
    return Matrix.Rotation(ang, 3, eje) @ v


def _angulo_sobre(a, b, eje):
    """El ángulo (rad, con signo) de a a b alrededor de `eje` (los dos perpendiculares a él)."""
    return math.atan2(eje.dot(a.cross(b)), a.dot(b))


def _ik_bisagra(sk, D, head, raiz_b, medio_b, fin_b, T, doblez, l1, l2, eje_por_defecto, w=1.0, polo=None,
                flex_max=150.0, eje_del_pie=None, eje_fijo=False):
    """IK DE DOS HUESOS CON BISAGRA sobre una pose FK (la captura). El codo (la rodilla) dobla sólo sobre su eje:
    el de reposo (`bisagra_de_reposo`) llevado al plano en que la articulación dobla. Ese plano lo da donde está
    el codo en la FK (o `polo`, hacia donde apunta); con el brazo casi recto, `eje_por_defecto` (el eje que la FK
    ya llevaba, o el que pide el pie en la rodilla), y entre medias se gira de uno a otro alrededor de la recta
    hombro-muñeca. La rodilla, además, no se aparta del pie más de TIBIA_RECTA / TIBIA_DOBLADA (la tibia girada
    sobre la rodilla se ve como una pierna arqueada con el pie abierto). La flexión, como mucho `flex_max`.
    Mezcla con la FK por w. Escribe D y head del primer hueso, del segundo y de la cabeza del tercero."""
    Y1, Y2, n0, F1, F2 = bisagra_de_reposo(sk, raiz_b, medio_b, fin_b, doblez)
    H = head[raiz_b]
    K0 = head[medio_b]
    d = T - H
    dist = d.length
    if dist < 1e-6:
        return
    u = d / dist
    # la flexión, con su tope: el fin no se acerca a la raíz más de lo que deja doblar flex_max
    dmin = math.sqrt(max(1e-9, l1 * l1 + l2 * l2 + 2.0 * l1 * l2 * math.cos(math.radians(flex_max))))
    if dist < dmin:
        T = H + u * dmin
        dist = dmin
    dmax = (l1 + l2) * 0.9995
    ca = max(-1.0, min(1.0, (l1 * l1 + l2 * l2 - min(dist, dmax) ** 2) / (2.0 * l1 * l2)))
    flex = 180.0 - math.degrees(math.acos(ca))
    # el eje de la bisagra
    n_def = eje_por_defecto - u * eje_por_defecto.dot(u)
    if n_def.length < 1e-6:
        n_def = u.orthogonal()
    n_def.normalize()
    if polo is not None:
        v_fk = polo - u * polo.dot(u)
        dobla = 1.0
    else:
        v_fk = (K0 - H) - u * (K0 - H).dot(u)
        # cuánto dobla la FK (el seno del ángulo del primer hueso con la recta): recta, manda el eje por defecto
        dobla = suave(min(1.0, max(0.0, (v_fk.length / l1 - 0.05) / 0.2)))
    n = n_def
    # con un eje de fiar (`eje_fijo`: el seguido en el tiempo, que donde el brazo dobla de verdad YA es el de la FK), ése;
    # si no, del eje por defecto al de la FK según cuánto dobla
    if v_fk.length > 1e-6 and dobla > 0.0 and not eje_fijo:
        n_fk = v_fk.normalized().cross(u)          # el eje que dobla hacia v_fk (ver _ik2: -(u × v))
        n = _girar_sobre(n_def, u, _angulo_sobre(n_def, n_fk, u) * dobla)
    # (el pie sólo dice hacia dónde va la rodilla con la pierna casi recta: recogida, con la rodilla arriba y el pie
    # delante, «la rodilla hacia la punta del pie» le daba la vuelta: los saltos de 150° en el quiebro hacia atrás)
    if eje_del_pie is not None and flex < 45.0:
        n_p = eje_del_pie - u * eje_del_pie.dot(u)
        if n_p.length > 1e-6:
            n_p.normalize()
            tope = math.radians(TIBIA_RECTA + (TIBIA_DOBLADA - TIBIA_RECTA) * suave(min(1.0, flex / 45.0)))
            a = _angulo_sobre(n_p, n, u)
            if abs(a) > tope:
                n = _girar_sobre(n_p, u, math.copysign(tope, a))
    n.normalize()
    y1, y2, _ = _ik2(H, T, l1, l2, u.cross(n), 1)
    D1 = _marco_yx(y1, n) @ F1.transposed()
    D2 = _marco_yx(y2, n) @ F2.transposed()
    if w < 1.0:
        D1 = D[raiz_b].to_quaternion().slerp(D1.to_quaternion(), w).to_matrix()
        D2 = D[medio_b].to_quaternion().slerp(D2.to_quaternion(), w).to_matrix()
    D[raiz_b] = D1
    D[medio_b] = D2
    head[medio_b] = H + D1 @ (sk.head[medio_b] - sk.head[raiz_b])
    head[fin_b] = head[medio_b] + D2 @ (sk.head[fin_b] - sk.head[medio_b])


def _muneca_con_topes(Da, Dm, eje, giro=None):
    """La mano (giro en el mundo Dm) respecto al antebrazo (Da), con topes: se dobla como mucho MUNECA_MAX y gira
    sobre el antebrazo (`eje`, su dirección de reposo) como mucho PRONACION_MAX. `giro` (grados): el giro sobre el
    antebrazo ya decidido (captura.bisagras_seguidas lo sigue en el tiempo: cerca de media vuelta, el signo saltaba
    de +110 a -110 de un fotograma a otro)."""
    q = (Da.transposed() @ Dm).to_quaternion()
    v = Vector((q.x, q.y, q.z))
    p = eje * v.dot(eje)
    tw = Quaternion((q.w, p.x, p.y, p.z))
    if tw.magnitude < 1e-9:
        tw = Quaternion()
    tw.normalize()
    sw = q @ tw.inverted()
    a_tw = 2.0 * math.atan2(Vector((tw.x, tw.y, tw.z)).dot(eje), tw.w)
    a_tw = (a_tw + math.pi) % (2.0 * math.pi) - math.pi
    lim = math.radians(PRONACION_MAX)
    cambia = False
    if giro is not None:
        g = max(-lim, min(lim, math.radians(giro)))
        if abs(g - a_tw) > 1e-4:
            tw = Quaternion(eje, g)
            cambia = True
    elif abs(a_tw) > lim:
        tw = Quaternion(eje, math.copysign(lim, a_tw))
        cambia = True
    eje_sw, a_sw = sw.to_axis_angle()
    if a_sw > math.pi:
        a_sw -= 2.0 * math.pi
    lim = math.radians(MUNECA_MAX)
    if abs(a_sw) > lim:
        sw = Quaternion(eje_sw, math.copysign(lim, a_sw))
        cambia = True
    if not cambia:
        return Dm
    return Da @ (sw @ tw).to_matrix()


def _resolver_fk(sk, p, falda=None):
    """La pose de la CAPTURA (captura.py): `_fk` trae, por hueso, su giro local en ejes del mundo en
    reposo (D[padre]⁻¹·D[hueso]); `cad`, la cabeza de caderas como en `resolver`. Encima, la IK de las
    piernas a los tobillos `pie_s` (con peso `ikp_s`; el pie conserva su giro de la captura en el mundo)
    y la de los brazos a las muñecas `mano_s` (`ikb_s`; la mano conserva su giro). Mismas salidas que
    `resolver`, para que el horneado (suelo, raíz, faldón) no distinga de dónde sale la pose."""
    e = sk.esc
    I3 = Matrix.Identity(3)
    desp = v3(p.get('desp', (0, 0, 0))) * e
    raiz = v3(p.get('raiz', (0, 0, 0))) * e
    Q = p['_fk']
    D, head = {}, {}
    D['raiz'] = I3
    head['raiz'] = sk.head['raiz'] + raiz
    D['caderas'] = Q.get('caderas', I3)
    head['caderas'] = sk.head['caderas'] + v3(p['cad']) * e + desp

    def fk(b, q):
        par = sk.parent[b]
        D[b] = D[par] @ q
        head[b] = head[par] + D[par] @ (sk.head[b] - sk.head[par])

    for b in ('columna', 'columna1', 'pecho', 'cuello', 'cabeza'):
        fk(b, Q.get(b, I3))
    for s, sg in (('L', 1), ('R', -1)):
        for b in ('hombro_', 'brazo_', 'antebrazo_', 'mano_'):
            fk(b + s, Q.get(b + s, I3))
        # ═══ EL CODO, BISAGRA ═══ (ver `_ik_bisagra`) siempre: a la muñeca de la FK, o a `mano_s` con peso
        # `ikb_s`; hacia donde está el codo de la FK (o hacia `codo_s`, si lo dan). La mano conserva su giro.
        Dm = D['mano_' + s]
        w = p.get('ikb_' + s, 0.0)
        T = head['mano_' + s]
        if w > 1e-4:
            T = T.lerp(v3(p['mano_' + s]) * e + desp, min(1.0, w))
        polo = p.get('codo_' + s)
        _, _, n0, _, _ = bisagra_de_reposo(sk, 'brazo_' + s, 'antebrazo_' + s, 'mano_' + s, ADELANTE)
        # con el brazo casi recto, el eje de la bisagra: el que la captura deja seguido en el tiempo (`eje_codo_s`,
        # captura.bisagras_seguidas), o el que ya llevaba el húmero
        fijo = p.get('eje_codo_' + s) is not None
        eje = v3(p['eje_codo_' + s]) if fijo else D['brazo_' + s] @ n0
        _ik_bisagra(sk, D, head, 'brazo_' + s, 'antebrazo_' + s, 'mano_' + s, T, ADELANTE, sk.l_brazo, sk.l_antebrazo,
                    eje, polo=v3(polo) if polo is not None and w > 1e-4 else None, flex_max=CODO_MAX, eje_fijo=fijo)
        D['mano_' + s] = Dm
        orm = p.get('orm_' + s)
        if orm is not None:
            R_m = sk.R['mano_' + s]
            Dm = _marco_mano(orm[0], orm[1], s) @ R_m.transposed()
            q0 = D['mano_' + s].to_quaternion()
            D['mano_' + s] = q0.slerp(Dm.to_quaternion(), orm[2] if len(orm) > 2 else 1.0).to_matrix()
        D['mano_' + s] = _muneca_con_topes(D['antebrazo_' + s], D['mano_' + s],
                                           (sk.head['mano_' + s] - sk.head['antebrazo_' + s]).normalized(),
                                           giro=p.get('pronacion_' + s) if orm is None else None)
        R_m = sk.R['mano_' + s]
        Da = D['antebrazo_' + s]
        L = R_m.transposed() @ (Da.transposed() @ D['mano_' + s]) @ R_m
        tau = _giro_y(L.to_quaternion())
        tau = (tau + 180.0) % 360.0 - 180.0
        R_g = sk.R['giro_' + s]
        fk('giro_' + s, R_g @ Ry(0.5 * tau) @ R_g.transposed())
        if p.get('_dedos_' + s):
            # los dedos de la forja (un agarre: el paraguas, el auricular) sobre la mano de la captura
            c1, c2 = p.get('ded_' + s, (16.0, 24.0))
            fk('dedos_' + s, rot_eje(sk.R['dedos_' + s].col[0], c1))
            fk('dedos2_' + s, rot_eje(sk.R['dedos2_' + s].col[0], c2))
            a1, a2 = p.get('pul_' + s, (8.0, 6.0))
            Rp = sk.R['pulgar_' + s]
            fk('pulgar_' + s, rot_eje(Rp.col[0], a1 * sg) @ rot_eje(Rp.col[2], a2))
        else:
            for b in ('dedos_', 'dedos2_', 'pulgar_'):
                fk(b + s, Q.get(b + s, I3))
        fk('agarre_' + s, I3)
        for b in ('muslo_', 'pierna_', 'pie_', 'punta_'):
            fk(b + s, Q.get(b + s, I3))
        # ═══ LA RODILLA, BISAGRA ═══ al tobillo `pie_s` (peso `ikp_s`) o al de la FK; hacia donde está la
        # rodilla de la FK y, con la pierna casi recta, hacia donde apunta el pie. El pie conserva su giro.
        w = p.get('ikp_' + s, 0.0)
        Dp, Dq = D['pie_' + s], D['punta_' + s]
        T = head['pie_' + s]
        if w > 1e-4:
            T = T.lerp(v3(p['pie_' + s]) * e + desp, min(1.0, w))
        pie_adelante = Dp @ (sk.bola[s] - sk.talon[s])
        pierna_dir = T - head['muslo_' + s]
        eje_pie = pie_adelante.cross(pierna_dir)      # la rodilla hacia la punta del pie
        # (con el pie de puntillas en la línea de la pierna, la patada, el pie no dice hacia dónde va la rodilla)
        if eje_pie.length < 0.4 * pie_adelante.length * max(pierna_dir.length, 1e-6):
            eje_pie = None
        _, _, n0, _, _ = bisagra_de_reposo(sk, 'muslo_' + s, 'pierna_' + s, 'pie_' + s, -ADELANTE)
        fijo = p.get('eje_rodilla_' + s) is not None
        if fijo:
            eje = v3(p['eje_rodilla_' + s])
        else:
            eje = eje_pie if eje_pie is not None else D['muslo_' + s] @ n0
        _ik_bisagra(sk, D, head, 'muslo_' + s, 'pierna_' + s, 'pie_' + s, T, -ADELANTE, sk.l_muslo, sk.l_pierna,
                    eje, flex_max=RODILLA_MAX, eje_del_pie=eje_pie, eje_fijo=fijo)
        D['pie_' + s] = Dp
        D['punta_' + s] = Dq
        head['punta_' + s] = head['pie_' + s] + Dp @ (sk.head['punta_' + s] - sk.head['pie_' + s])
    for b in sk.falda:
        if falda is not None and b in falda:
            par = sk.parent[b]
            D[b] = falda[b]
            head[b] = head[par] + D[par] @ (sk.head[b] - sk.head[par])
        else:
            fk(b, I3)
    out = {}
    for b in sk.orden:
        par = sk.parent[b]
        q = D[b] if par is None else D[par].inverted() @ D[b]
        L = sk.R[b].inverted() @ q @ sk.R[b]
        out[b] = L.to_quaternion()
    loc = sk.R['caderas'].inverted() @ (head['caderas'] - sk.head['caderas'] - raiz)
    loc_r = sk.R['raiz'].inverted() @ raiz
    return out, loc, loc_r, D, head


def resolver(sk, p, falda=None):
    """pose -> (rotaciones locales {hueso: Quaternion}, loc local de caderas, loc de raiz,
    matrices de mundo D (delta de rotacion) y cabezas)."""
    if '_fk' in p:
        return _resolver_fk(sk, p, falda)
    e = sk.esc
    desp = v3(p.get('desp', (0, 0, 0))) * e
    raiz = v3(p.get('raiz', (0, 0, 0))) * e
    D, head = {}, {}
    D['raiz'] = Matrix.Identity(3)
    head['raiz'] = sk.head['raiz'] + raiz
    D['caderas'] = E(p['cad_r'])
    head['caderas'] = sk.head['caderas'] + v3(p['cad']) * e + desp

    def fk(b, q):
        par = sk.parent[b]
        D[b] = D[par] @ q
        head[b] = head[par] + D[par] @ (sk.head[b] - sk.head[par])

    for b, k in (('columna', 'col'), ('columna1', 'col1'), ('pecho', 'pec'), ('cuello', 'cue'), ('cabeza', 'cab')):
        fk(b, E(p[k]))
    for s, sg in (('L', 1), ('R', -1)):
        fk('hombro_' + s, E(p['hom_' + s]))
        qb = E(p['bra_' + s]) @ Ry(BAJAR * sg)
        fk('brazo_' + s, qb)
        Xa = sk.R['antebrazo_' + s].col[0]
        fk('antebrazo_' + s, rot_eje(Xa, -p['cod_' + s]))
        w = p['ikb_' + s]
        if w > 1e-4:
            S = head['brazo_' + s]
            T = v3(p['mano_' + s]) * e + desp
            # ═══ EL GOLPE SE ESCRIBE COMO EXTENSIÓN, NO COMO SITIO (segunda pasada) ═══ Con el puño
            # escrito como un punto, un blanco más lejos que el brazo hacía que la IK lo estirase del
            # todo un fotograma ANTES del impacto y se parase: la revisión midió el jab con la velocidad
            # un 99 % más baja en su impacto que en el fotograma anterior. `golpe_s` = (dirección,
            # extensión, peso): la muñeca va a hombro + dirección × extensión × largo del brazo, así que
            # el brazo llega recto justo en la clave del impacto, ni antes ni después.
            g = p.get('golpe_' + s)
            if g is not None and g[4] > 1e-4:
                dg = Vector((g[0], g[1], g[2]))
                if dg.length > 1e-6:
                    Tg = S + dg.normalized() * (min(g[3], 0.9995) * (sk.l_brazo + sk.l_antebrazo))
                    T = T.lerp(Tg, min(1.0, g[4]))
            polo = v3(p['codo_' + s])
            if w < 0.9999:
                # ═══ DE LA FK A LA IK, EN POSICIONES (segunda pasada de la captura) ═══ Mezclar los GIROS de la
                # solución FK y de la IK (slerp de cada hueso) hacía pasar el brazo por poses que no son ninguna de
                # las dos: el húmero daba media vuelta en un fotograma al soltar la guardia (la revisión: 150-180° en
                # los quiebros, el avance y la Entrada). Ahora se mezclan la MUÑECA y hacia dónde apunta el codo, y la
                # IK resuelve esa pose intermedia: w=0 es la FK (el codo de la FK ya dobla sobre su bisagra) y w=1, la IK.
                K0 = head['antebrazo_' + s]
                W0 = K0 + D['antebrazo_' + s] @ (sk.head['mano_' + s] - sk.head['antebrazo_' + s])
                T = W0.lerp(T, w)
                u = (T - S).normalized()
                v_fk = (K0 - S) - u * (K0 - S).dot(u)
                v_ik = polo - u * polo.dot(u)
                if v_fk.length > 1e-6 and v_ik.length > 1e-6:
                    # el codo gira alrededor de la recta hombro-muñeca de donde lo tiene la FK a donde lo pide la IK
                    # (mezclar las dos direcciones pasaba por cero cuando eran opuestas, y el codo saltaba de lado)
                    polo = _girar_sobre(v_fk.normalized(), u, _angulo_sobre(v_fk.normalized(), v_ik.normalized(), u) * w)
            y1, y2, n = _ik2(S, T, sk.l_brazo, sk.l_antebrazo, polo, 1)
            Db = _marco(n, y1) @ sk.R['brazo_' + s].inverted()
            Da = _marco(n, y2) @ sk.R['antebrazo_' + s].inverted()
            D['brazo_' + s] = Db
            D['antebrazo_' + s] = Da
            head['antebrazo_' + s] = S + Db @ (sk.head['antebrazo_' + s] - sk.head['brazo_' + s])
        R_m = sk.R['mano_' + s]
        orm = p.get('orm_' + s)
        if orm is not None:
            fk('mano_' + s, Matrix.Identity(3))
            Dm = _marco_mano(orm[0], orm[1], s) @ R_m.transposed()
            if len(orm) > 2 and orm[2] < 1.0:
                q0 = D['antebrazo_' + s].to_quaternion()
                Dm = q0.slerp(Dm.to_quaternion(), orm[2]).to_matrix()
            D['mano_' + s] = Dm
        else:
            m = p['mun_' + s]
            fk('mano_' + s, rot_eje(R_m.col[0], m[0]) @ rot_eje(R_m.col[1], m[1]) @ rot_eje(R_m.col[2], m[2]))
        # giro del antebrazo: la mitad del giro de la mano alrededor del eje del antebrazo
        Da = D['antebrazo_' + s]
        L = R_m.transposed() @ (Da.transposed() @ D['mano_' + s]) @ R_m
        tau = _giro_y(L.to_quaternion())
        tau = (tau + 180.0) % 360.0 - 180.0
        R_g = sk.R['giro_' + s]
        fk('giro_' + s, R_g @ Ry(0.5 * tau) @ R_g.transposed())
        # dedos y pulgar. El pulgar derecho es espejo del izquierdo: su eje X (el dorso) es el espejo
        # del izquierdo y su Z sale del producto vectorial, que al reflejarse cambia de sentido; por eso
        # el giro que cambia de signo es el de X (a traves de la palma), no el de Z (flexion).
        c1, c2 = p.get('ded_' + s, (16.0, 24.0))
        fk('dedos_' + s, rot_eje(sk.R['dedos_' + s].col[0], c1))
        fk('dedos2_' + s, rot_eje(sk.R['dedos2_' + s].col[0], c2))
        a1, a2 = p.get('pul_' + s, (8.0, 6.0))
        Rp = sk.R['pulgar_' + s]
        fk('pulgar_' + s, rot_eje(Rp.col[0], a1 * sg) @ rot_eje(Rp.col[2], a2))
        fk('agarre_' + s, Matrix.Identity(3))
        # --- pierna
        fk('muslo_' + s, E(p['mus_' + s]))
        Xp = sk.R['pierna_' + s].col[0]
        fk('pierna_' + s, rot_eje(Xp, p['rodfk_' + s]))
        fk('pie_' + s, rot_eje(sk.R['pie_' + s].col[0], p['tobfk_' + s]))
        fk('punta_' + s, Matrix.Identity(3))
        w = p['ikp_' + s]
        if w > 1e-4:
            yaw, pitch = p['pier_' + s]
            ref = v3(p['pie_' + s]) * e + desp
            # ═══ PIVOTAR SOBRE LA BOLA (segunda pasada) ═══ `pie_s` es la huella del TALÓN con la guiñada
            # `pivote_s`: si la guiñada cambia (el pie de apoyo de la patada circular gira 100°), el pie gira
            # sobre la bola, que se queda clavada. Sin esto giraba sobre el talón y la bola barría el suelo a
            # 3 m/s (la batería nueva lo vio).
            piv = p.get('pivote_' + s)
            if piv is not None:
                d0 = sk.bola[s] - sk.talon[s]
                ref = ref + Rz(piv) @ d0 - Rz(yaw) @ d0
            tob, Dpie, Dpun = _pie(sk, s, ref, yaw, pitch, p['dedo_' + s])
            H = head['muslo_' + s]
            polo = v3(p['rod_' + s])
            y1, y2, n = _ik2(H, tob, sk.l_muslo, sk.l_pierna, polo, -1)
            Dm = _marco(n, y1) @ sk.R['muslo_' + s].inverted()
            Dp = _marco(n, y2) @ sk.R['pierna_' + s].inverted()
            for pre, Dik in (('muslo_', Dm), ('pierna_', Dp), ('pie_', Dpie), ('punta_', Dpun)):
                b = pre + s
                D[b] = D[b].to_quaternion().slerp(Dik.to_quaternion(), w).to_matrix()
            for pre in ('pierna_', 'pie_', 'punta_'):
                b = pre + s
                par = sk.parent[b]
                head[b] = head[par] + D[par] @ (sk.head[b] - sk.head[par])
    # faldon: rigido con la cadera salvo que la simulacion diga otra cosa
    for b in sk.falda:
        if falda is not None and b in falda:
            par = sk.parent[b]
            D[b] = falda[b]
            head[b] = head[par] + D[par] @ (sk.head[b] - sk.head[par])
        else:
            fk(b, Matrix.Identity(3))
    out = {}
    for b in sk.orden:
        par = sk.parent[b]
        q = D[b] if par is None else D[par].inverted() @ D[b]
        L = sk.R[b].inverted() @ q @ sk.R[b]
        out[b] = L.to_quaternion()
    loc = sk.R['caderas'].inverted() @ (head['caderas'] - sk.head['caderas'] - raiz)
    loc_r = sk.R['raiz'].inverted() @ raiz
    return out, loc, loc_r, D, head


# ------------------------------------------------------------------ claves
def claves(lista, base=None):
    """lista de (fotograma, cambios, curva). Las poses son acumulativas."""
    pose = dict(base or pose_base())
    ks = []
    for f, cambios, curva in lista:
        pose = dict(pose)
        pose.update(cambios)
        ks.append((f, pose, curva))
    return ks


def _paso(a, b, t):
    """Pie de a a b (huellas en el suelo) con un paso: se levanta antes de moverse y apoya
    despues (sin arrastrar); altura segun la distancia."""
    dist = math.hypot(b[0] - a[0], b[1] - a[1])
    th = suave(min(1.0, max(0.0, (t - 0.12) / 0.76)))
    x = a[0] + (b[0] - a[0]) * th
    y = a[1] + (b[1] - a[1]) * th
    h = min(0.12, max(0.045, 0.35 * dist))
    z = a[2] + (b[2] - a[2]) * t + h * math.sin(math.pi * t) ** 0.8
    return (x, y, z)


def muestrear(ks, f):
    if f <= ks[0][0]:
        return dict(ks[0][1])
    for i in range(len(ks) - 1):
        f0, p0, _ = ks[i]
        f1, p1, curva = ks[i + 1]
        if f0 <= f <= f1:
            t = (f - f0) / max(f1 - f0, 1e-6)
            t = EASE[curva](t)
            out = {}
            for k in p1:
                a, b = p0.get(k), p1[k]
                if a is None or b is None:
                    out[k] = b if t > 0.5 else a
                elif k in ('pie_L', 'pie_R') and abs(a[2]) < 1e-3 and abs(b[2]) < 1e-3 and \
                        math.hypot(b[0] - a[0], b[1] - a[1]) > 0.03 and p1.get('ikp_' + k[-1], 1.0) > 0.5:
                    out[k] = _paso(a, b, t)
                elif k in ('mano_L', 'mano_R') and a[2] < 0.06 and b[2] < 0.06 and \
                        math.hypot(b[0] - a[0], b[1] - a[1]) > 0.03 and p1.get('ikb_' + k[-1], 0.0) > 0.5 and \
                        p0.get('ikb_' + k[-1], 0.0) > 0.5:
                    out[k] = _paso(a, b, t)
                else:
                    out[k] = lerp(a, b, t)
            return out
    return dict(ks[-1][1])


# ------------------------------------------------------------------ locomocion
def _bezier(p0, p1, p2, p3, t):
    u = 1 - t
    return tuple(u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d
                 for a, b, c, d in zip(p0, p1, p2, p3))


def _curva(puntos, t):
    for i in range(len(puntos) - 1):
        t0, v0 = puntos[i]
        t1, v1 = puntos[i + 1]
        if t0 <= t <= t1:
            return lerp(v0, v1, suave((t - t0) / max(t1 - t0, 1e-9)))
    return puntos[-1][1]


def locomocion(prm):
    """Devuelve funcion(fotograma) -> pose para un ciclo en el sitio."""
    T = prm['T']
    beta = prm['beta']
    v = prm['v']
    L = v * beta * T / FPS                 # recorrido del pie apoyado (m)
    dirv = Vector(prm.get('dir', (0, -1, 0))).normalized()
    atras = dirv.y > 0.5
    lateral = abs(dirv.x) > 0.5
    ancho = prm.get('ancho', 0.1)

    # en la carrera el pie apoya menos por delante de la cadera que por detras ('adelante' es la
    # fraccion del recorrido de apoyo que queda delante): asi la pierna alcanza sin estirarse de mas
    ad = prm.get('adelante', 0.5)

    def pie_fase(phi, s):
        sg = 1 if s == 'L' else -1
        base = Vector((ancho * sg, 0.075, 0.0))
        if phi < beta:
            u = phi / beta
            pos = base + dirv * (L * ad - L * u)
            pos.z = 0.0
            return pos, _curva(prm['pitch_apoyo'], u)
        u = (phi - beta) / (1 - beta)
        a = (-L * (1 - ad), 0.0)
        b = (-L * (1 - ad) - prm['atras'], prm['h1'])
        c = (L * ad + prm['alcance'], prm['h2'])
        d = (L * ad, 0.0)
        ue = prm.get('ease_vuelo', suave)(u)
        x, z = _bezier(a, b, c, d, ue)
        pos = base + dirv * x
        pos.z = z
        return pos, _curva(prm['pitch_vuelo'], u)

    def f(fr):
        phi = (fr % T) / T
        p = pose_base()
        p.update(prm.get('extra', {}))
        for s in 'LR':
            ph = (phi + (0.0 if s == 'L' else -0.5)) % 1.0
            pos, pitch = pie_fase(ph, s)
            sg = 1 if s == 'L' else -1
            p['pie_' + s] = tuple(pos)
            p['pier_' + s] = (prm.get('yaw_pie', 5.0) * sg, pitch)
            p['rod_' + s] = (0.1 * sg, -1.0, 0.0)
        bob = prm['bob']
        if prm.get('carrera'):
            z = -bob * (0.5 + 0.5 * math.cos(4 * math.pi * (phi - beta * 0.5)))
        else:
            z = -bob * (0.5 + 0.5 * math.cos(4 * math.pi * (phi - 0.03)))
        c = math.cos(2 * math.pi * phi)
        sway = prm.get('sway', 0.02)
        p['cad'] = (sway * math.sin(2 * math.pi * (phi - 0.02)), prm.get('cad_y', 0.0), -prm.get('bajar', 0.012) + z)
        yaw = prm.get('yaw', 5.0)
        roll = prm.get('roll', 3.0)
        lean = prm.get('lean', 0.0)
        if lateral:
            yaw *= 0.3
        # al andar hacia atras la pierna que va delante es la otra: se invierte el giro de cadera
        sgn = -1.0 if atras else 1.0
        p['cad_r'] = (lean * 0.45, -roll * math.sin(2 * math.pi * phi), -yaw * c * sgn)
        yc = prm.get('yaw_pecho', 6.0)
        twist = (yc + yaw) * c * sgn / 3.0
        rc = roll * math.sin(2 * math.pi * phi) / 3.0
        p['col'] = (lean * 0.25 + 1, rc, twist)
        p['col1'] = (lean * 0.2 + 1, rc, twist)
        p['pec'] = (lean * 0.15 - 1 + prm.get('respira', 0.0) * math.sin(4 * math.pi * phi), rc * 0.5, twist)
        p['cue'] = (2 - lean * 0.25, 0, -yc * c * sgn * 0.5)
        p['cab'] = (-2 - lean * 0.25, -roll * math.sin(2 * math.pi * phi) * 0.3, -yc * c * sgn * 0.5)
        amp = prm['brazo']
        codo = prm['codo']
        # braceo contrario a la pierna del mismo lado; hacia atras, desfasado medio ciclo
        fase_b = 0.5 if atras else 0.0
        for s, sg, fase in (('L', 1, 0.0), ('R', -1, 0.5)):
            cc = math.cos(2 * math.pi * (phi + fase + fase_b) - prm.get('retraso_brazo', 0.25))
            sw = amp * cc
            p['bra_' + s] = (sw + prm.get('brazo_base', 0.0), prm.get('abre', 0.0) * sg, 0.0)
            p['cod_' + s] = codo + prm.get('codo_amp', 0.0) * max(0.0, -cc)
            p['hom_' + s] = (0.0, 0.0, -sw * 0.08 * sg)
            p['mun_' + s] = (0.0, 0.0, (6.0 + codo * 0.25) * sg)
        p.update(manos(prm.get('mano', 'relajada')))
        return p

    return f


CLIPS = {}


def clip(nombre, frames, bucle, info='', **extra):
    def deco(fn):
        CLIPS[nombre] = dict(fn=fn, frames=frames, bucle=bucle, info=info, **extra)
        return fn
    return deco


def _ciclo(nombre, prm, info):
    f = locomocion(prm)
    dirv = Vector(prm.get('dir', (0, -1, 0))).normalized()
    CLIPS[nombre] = dict(fn=f, frames=prm['T'], bucle=True, info=info,
                         zancada=prm['v'] * prm['T'] / FPS, velocidad=prm['v'],
                         viento=tuple(-dirv * prm['v']))


_ciclo('andar', dict(T=30, v=1.3, beta=0.62, bob=0.028, sway=0.022, yaw=6, roll=3.5, lean=3,
                     atras=0.03, h1=0.1, h2=0.07, alcance=0.06,
                     pitch_apoyo=[(0.0, 16.0), (0.13, 0.0), (0.62, 0.0), (1.0, -34.0)],
                     pitch_vuelo=[(0.0, -34.0), (0.35, -12.0), (0.8, 6.0), (1.0, 16.0)],
                     brazo=17, codo=14, codo_amp=10, yaw_pecho=7, ancho=0.095, bajar=0.02, abre=-4,
                     retraso_brazo=0.35), 'paso de calle')

_ciclo('correr', dict(T=20, v=4.2, beta=0.36, bob=0.045, sway=0.012, yaw=9, roll=3, lean=19, carrera=True,
                      atras=0.16, h1=0.32, h2=0.26, alcance=0.1,
                      pitch_apoyo=[(0.0, 4.0), (0.3, 0.0), (0.5, -8.0), (1.0, -42.0)],
                      pitch_vuelo=[(0.0, -42.0), (0.3, -65.0), (0.75, -12.0), (1.0, 4.0)],
                      brazo=38, codo=88, codo_amp=12, yaw_pecho=12, ancho=0.075, bajar=0.06, abre=-10,
                      brazo_base=-6, retraso_brazo=0.2, ease_vuelo=lambda t: 1 - (1 - t) ** 1.6, mano='tensa'),
       'carrera')

_ciclo('esprintar', dict(T=18, v=6.5, beta=0.3, bob=0.05, sway=0.008, yaw=11, roll=2.5, lean=27, carrera=True,
                         atras=0.2, h1=0.44, h2=0.4, alcance=0.14,
                         pitch_apoyo=[(0.0, -6.0), (0.4, -4.0), (0.55, -10.0), (1.0, -48.0)],
                         pitch_vuelo=[(0.0, -48.0), (0.3, -70.0), (0.75, -18.0), (1.0, -6.0)],
                         brazo=55, codo=92, codo_amp=18, yaw_pecho=10, ancho=0.07, bajar=0.075, abre=-11,
                         brazo_base=-10, retraso_brazo=0.2, ease_vuelo=lambda t: 1 - (1 - t) ** 1.8, mano='abierta'),
       'esprint')

_ciclo('retroceder', dict(T=32, v=1.05, beta=0.62, bob=0.022, sway=0.02, yaw=3, roll=3, lean=4,
                          dir=(0, 1, 0), atras=0.03, h1=0.08, h2=0.07, alcance=0.04,
                          pitch_apoyo=[(0.0, -18.0), (0.15, 0.0), (0.7, 0.0), (1.0, 10.0)],
                          pitch_vuelo=[(0.0, 10.0), (0.4, 4.0), (0.8, -14.0), (1.0, -18.0)],
                          brazo=10, codo=22, codo_amp=6, yaw_pecho=3, ancho=0.1, bajar=0.03, abre=-4, retraso_brazo=0.3),
       'andar hacia atras (braceo contrario a la pierna, como andar)')

# paso lateral de combate: erguido, pies separados que nunca se cruzan (paso y junta)
_lat = dict(T=16, v=1.2, beta=0.45, bob=0.016, sway=0.0, yaw=0, roll=3, lean=3,
            atras=0.0, h1=0.075, h2=0.06, alcance=0.0,
            pitch_apoyo=[(0.0, 0.0), (1.0, 0.0)], pitch_vuelo=[(0.0, -8.0), (0.5, -4.0), (1.0, 0.0)],
            brazo=4, codo=30, codo_amp=4, yaw_pecho=0, ancho=0.215, bajar=0.028, abre=-4, retraso_brazo=0.3)
_ciclo('lateral_izq', dict(_lat, dir=(1, 0, 0)), 'paso lateral hacia la izquierda del personaje (+X Blender)')
_ciclo('lateral_der', dict(_lat, dir=(-1, 0, 0)), 'paso lateral hacia la derecha del personaje')


# ------------------------------------------------------------------ reposo
@clip('reposo', 60, True, 'respiracion y peso')
def _reposo(fr):
    t = fr / 60.0
    s1 = math.sin(2 * math.pi * t)
    c1 = math.cos(2 * math.pi * t)
    p = pose_base()
    p['cad'] = (0.012 * s1 + 0.01, 0.0, -0.016 + 0.003 * c1)
    p['cad_r'] = (0.0, -1.8 * s1 - 1.5, 2.0 + 0.8 * s1)
    p['col'] = (2.0, 0.6 * s1 + 0.8, -1.0)
    p['col1'] = (1.0 - 1.0 * c1, 0.4 * s1 + 0.5, -0.5)
    p['pec'] = (-2.5 - 1.2 * c1, 0.3 * s1, -0.5)
    p['cue'] = (1.0, 0.0, 0.5)
    p['cab'] = (-1.0 + 1.0 * c1, 1.5 * s1, 3.0 * math.sin(2 * math.pi * t + 1.0))
    p['hom_L'] = (0.0, -1.2 - 0.8 * c1, 0.0)
    p['hom_R'] = (0.0, 1.2 + 0.8 * c1, 0.0)
    # brazos algo separados del cuerpo: el antebrazo no entra en la chaqueta del civil
    p['bra_L'] = (-2.0 + 1.5 * s1, -4.0, 0.0)
    p['bra_R'] = (-1.0 - 1.5 * s1, 5.0, 0.0)
    p['cod_L'] = 16.0 + 3 * c1
    p['cod_R'] = 12.0 - 3 * c1
    p['mun_L'] = (0, 0, 12.0)
    p['mun_R'] = (0, 0, -9.0)
    p['pie_L'] = (0.12, 0.06, 0.0)
    p['pie_R'] = (-0.11, 0.1, 0.0)
    p['pier_L'] = (9.0, 0.0)
    p['pier_R'] = (-14.0, 0.0)
    p['rod_L'] = (0.2, -1.0, 0.0)
    p['rod_R'] = (-0.25, -1.0, 0.0)
    return p


# ------------------------------------------------------------------ guardia de combate
def muneca(puno, direccion, largo=0.068):
    """Muneca (objetivo de la IK) para que el centro del puno quede en 'puno'."""
    d = v3(direccion).normalized()
    return tuple(v3(puno) - d * largo)


# orientaciones de puno: (normal de la palma, direccion de los nudillos)
PUNO_GUARDIA_L = ((-0.9, 0.1, -0.35), (0.05, -0.72, 0.69))
PUNO_GUARDIA_R = ((0.9, 0.1, -0.35), (-0.05, -0.72, 0.69))
PUNO_ABAJO = ((0.0, 0.0, -1.0), (0.0, -1.0, 0.0))


def guardia(fase=0.0, balanceo=1.0):
    """Pierna izquierda delante, torso girado 26 grados, codos abajo.

    ═══ LOS PUÑOS A LA BARBILLA (segunda pasada) ═══ La primera guardia llevaba los puños a 1,26-1,31 m,
    a la altura del esternón y juntos, como quien sujeta una bandeja (la revisión). Ahora el de atrás
    guarda la barbilla (a su altura, 12 cm delante) y el de delante va a la altura de la boca, 30 cm
    más adelante: desde la cámara de hombro se leen dos puños levantados junto a la cara."""
    s = math.sin(2 * math.pi * fase) * balanceo
    c = math.cos(2 * math.pi * fase) * balanceo
    pL = (0.11 + 0.006 * s, -0.40 - 0.010 * c, 1.46 + 0.010 * s)
    pR = (-0.10 - 0.004 * c, -0.27 - 0.006 * s, 1.44 + 0.008 * c)
    p = {
        'cad': (0.0 + 0.008 * s, 0.02, -0.075 + 0.008 * c), 'cad_r': (0, 1.5 * s, -26 + 2 * s),
        'col': (6, 0, 4), 'col1': (4, 0, 4), 'pec': (3, 0, 4), 'cue': (4, 0, 6), 'cab': (-6, -1.0 * s, 8 - 1.5 * s),
        'pie_L': (0.10, -0.17, 0.0), 'pier_L': (-12.0, 0.0), 'rod_L': (0.3, -1.0, 0.0),
        'pie_R': (-0.16, 0.20, 0.0), 'pier_R': (-40.0, 0.0), 'rod_R': (-0.5, -1.0, 0.0),
        'ikb_L': 1.0, 'ikb_R': 1.0,
        'mano_L': muneca(pL, PUNO_GUARDIA_L[1]), 'codo_L': (0.5, 0.25, -1.0), 'orm_L': PUNO_GUARDIA_L,
        'mano_R': muneca(pR, PUNO_GUARDIA_R[1]), 'codo_R': (-0.6, 0.3, -1.0), 'orm_R': PUNO_GUARDIA_R,
        'hom_L': (0, 0, 0), 'hom_R': (0, 0, 0),
    }
    p.update(manos('puno'))
    return p


G = guardia()


def base_g():
    return dict(pose_base(), **G)


@clip('guardia', 30, True, 'guardia de combate en bucle (los golpes empiezan y acaban en su fotograma 0)')
def _guardia(fr):
    p = base_g()
    p.update(guardia(fr / 30.0))
    return p


@clip('puno_1', 20, False, 'jab de izquierda: carga 0-2, impacto 5-7 a la altura de la barbilla (1,53 m), vuelta 20',
      impacto=(5, 7))
def _jab(fr):
    pL = (0.03, -0.66, 1.53)
    ks = claves([
        (0, G, 'suave'),
        (2, {'cad': (0.0, 0.03, -0.085), 'cad_r': (0, 0, -23), 'mano_L': muneca((0.14, -0.41, 1.32), PUNO_GUARDIA_L[1]),
             'pec': (3, 0, 6), 'hom_L': (0, 0, 4)}, 'suave'),
        (5, {'cad': (0.0, -0.025, -0.08), 'cad_r': (0, 0, -31), 'pec': (3, 0, -1), 'col1': (5, 0, 1),
             'mano_L': muneca(pL, PUNO_ABAJO[1]), 'orm_L': PUNO_ABAJO, 'codo_L': (1.0, 0.0, -0.3), 'hom_L': (0, 0, -12),
             'mano_R': muneca((-0.19, -0.24, 1.30), PUNO_GUARDIA_R[1]), 'cab': (-4, 0, 12)}, 'entra'),
        (7, {'mano_L': muneca((0.03, -0.665, 1.53), PUNO_ABAJO[1])}, 'lineal'),
        (12, {'cad': (0.0, 0.012, -0.075), 'cad_r': (0, 0, -25), 'pec': (3, 0, 3), 'col1': (4, 0, 4),
              'mano_L': muneca((0.15, -0.49, 1.32), PUNO_GUARDIA_L[1]), 'orm_L': PUNO_GUARDIA_L,
              'codo_L': (0.5, 0.25, -1.0), 'hom_L': (0, 0, -2), 'mano_R': G['mano_R'], 'cab': (-6, 0, 9)}, 'sale'),
        (20, G, 'suave'),
    ], base=base_g())
    return muestrear(ks, fr)


@clip('puno_2', 26, False, 'cruzado de derecha: carga 0-4, impacto 8-10 a 1,53 m con giro de cadera y talon, vuelta 26',
      impacto=(8, 10))
def _cross(fr):
    pR = (0.0, -0.66, 1.53)
    ks = claves([
        (0, G, 'suave'),
        (4, {'cad': (0.0, 0.045, -0.095), 'cad_r': (0, 0, -32), 'pec': (4, 0, 7), 'col1': (5, 0, 6),
             'mano_R': muneca((-0.19, -0.20, 1.28), PUNO_GUARDIA_R[1]), 'hom_R': (0, 0, 5)}, 'suave'),
        (8, {'cad': (0.0, -0.06, -0.085), 'cad_r': (0, 0, 14), 'pec': (4, 0, 14), 'col1': (6, 0, 10), 'col': (8, 0, 6),
             'mano_R': muneca(pR, PUNO_ABAJO[1]), 'orm_R': PUNO_ABAJO, 'codo_R': (-1.0, 0.0, -0.3), 'hom_R': (0, 0, -14),
             'pier_R': (-12.0, -32.0), 'rod_R': (0.2, -1.0, 0.0),
             'mano_L': muneca((0.23, -0.17, 1.41), PUNO_GUARDIA_L[1]), 'codo_L': (0.8, 0.3, -0.8),
             'cue': (4, 0, -14), 'cab': (-4, 0, -22)}, 'entra'),
        (10, {'mano_R': muneca((0.0, -0.665, 1.53), PUNO_ABAJO[1])}, 'lineal'),
        (17, {'cad': (0.0, 0.015, -0.075), 'cad_r': (0, 0, -20), 'pec': (3, 0, 5), 'col1': (4, 0, 5), 'col': (6, 0, 4),
              'mano_R': muneca((-0.17, -0.27, 1.28), PUNO_GUARDIA_R[1]), 'orm_R': PUNO_GUARDIA_R,
              'codo_R': (-0.45, 0.35, -1.0), 'hom_R': (0, 0, 0),
              'pier_R': (-36.0, 0.0), 'rod_R': (-0.5, -1.0, 0.0),
              'mano_L': G['mano_L'], 'codo_L': G['codo_L'], 'cab': (-6, 0, 5)}, 'sale'),
        (26, G, 'suave'),
    ], base=base_g())
    return muestrear(ks, fr)


@clip('patada', 30, False, 'patada circular de derecha: carga 0-3, recogida de rodilla al lado 3-7, barrido horizontal '
      'con la cadera girando ~125 grados y la rodilla que se estira 7-10, impacto 10-12 a 1,3-1,4 m, vuelta 30',
      impacto=(10, 12))
def _patada(fr):
    brazos_fk = {'ikb_L': 0.0, 'ikb_R': 0.0, 'orm_L': None, 'orm_R': None}
    ks = claves([
        (0, G, 'suave'),
        # carga: peso al pie de delante, talon de atras arriba
        (3, {'cad': (0.04, -0.05, -0.1), 'cad_r': (0, -4, -30), 'col': (8, -4, 4),
             'mano_R': muneca((-0.19, -0.27, 1.28), PUNO_GUARDIA_R[1]), 'pier_R': (-40.0, -22.0)}, 'suave'),
        # recogida: rodilla arriba y al lado, pie plegado; la cadera empieza a girar
        (6, {'cad': (0.07, -0.05, -0.07), 'cad_r': (0, 18, 35), 'col': (2, -6, -8), 'col1': (0, -4, -8), 'pec': (0, -2, -6),
             'cue': (4, 2, -10), 'cab': (-4, 2, -12),
             'pie_L': (0.13, -0.10, 0.0), 'pier_L': (40.0, -10.0), 'rod_L': (0.8, -1.0, 0.0),
             'ikp_R': 0.0, 'mus_R': (-62, 58, 0), 'rodfk_R': 125.0, 'tobfk_R': 35.0,
             'bra_L': (-65, 12, 0), 'cod_L': 115.0, 'bra_R': (-25, 25, 0), 'cod_R': 95.0, **brazos_fk}, 'suave'),
        # barrido: la cadera gira y la rodilla se estira; el pie pasa por delante a 1,3-1,4 m
        (10, {'cad': (0.08, -0.03, -0.06), 'cad_r': (0, 38, 100), 'col': (-6, -10, -14), 'col1': (-4, -8, -14), 'pec': (-2, -6, -10),
              'cue': (4, 6, -26), 'cab': (-2, 8, -30),
              'pie_L': (0.15, -0.08, 0.0), 'pier_L': (92.0, -14.0), 'rod_L': (0.9, -0.5, 0.0),
              'mus_R': (10, 79, 0), 'rodfk_R': 10.0, 'tobfk_R': 45.0,
              'bra_L': (-80, -30, 0), 'cod_L': 105.0,
              'bra_R': (35, 40, 0), 'cod_R': 25.0}, 'entra2'),
        (12, {'cad_r': (0, 38, 116), 'mus_R': (12, 80, 0), 'rodfk_R': 8.0}, 'lineal'),
        # recoge la pierna
        (16, {'cad': (0.06, -0.03, -0.06), 'cad_r': (0, 20, 60), 'col': (2, -6, -8), 'col1': (0, -4, -8), 'pec': (0, -2, -6),
              'cue': (4, 2, -14), 'cab': (-4, 2, -16),
              'pie_L': (0.13, -0.10, 0.0), 'pier_L': (55.0, -10.0),
              'mus_R': (-60, 58, 0), 'rodfk_R': 115.0, 'tobfk_R': 30.0,
              'bra_L': (-65, 12, 0), 'cod_L': 110.0, 'bra_R': (-20, 25, 0), 'cod_R': 90.0}, 'sale'),
        # baja el pie detras y vuelve a la guardia
        (23, {'cad': (0.0, 0.02, -0.08), 'cad_r': (0, 0, -22), 'col': (6, 0, 4), 'col1': (4, 0, 4), 'pec': (3, 0, 4),
              'cue': (4, 0, 6), 'cab': (-6, 0, 8), 'pie_L': (0.10, -0.17, 0.0), 'pier_L': (-12.0, 0.0), 'rod_L': (0.3, -1.0, 0.0),
              'ikp_R': 1.0, 'pie_R': (-0.16, 0.20, 0.0), 'pier_R': (-40.0, 0.0), 'rod_R': (-0.5, -1.0, 0.0),
              'ikb_L': 1.0, 'ikb_R': 1.0, 'orm_L': PUNO_GUARDIA_L, 'orm_R': PUNO_GUARDIA_R,
              'mano_L': G['mano_L'], 'mano_R': G['mano_R']}, 'suave'),
        (30, G, 'suave'),
    ], base=base_g())
    return muestrear(ks, fr)


BASE = pose_base()

_ABAJO_ATRAS = {'cad': (0.0, -0.06, -0.15), 'cad_r': (-34, 0, 0), 'col': (-30, 0, 0), 'col1': (-28, 0, 0),
                'pec': (-20, 0, 0), 'cue': (-18, 0, 0), 'cab': (-16, 0, 0),
                'pie_L': (0.14, 0.08, 0.0), 'pie_R': (-0.14, 0.10, 0.0), 'pier_L': (12.0, -16.0), 'pier_R': (-12.0, -16.0),
                'rod_L': (0.3, -1.0, 0.3), 'rod_R': (-0.3, -1.0, 0.3),
                'bra_L': (55, -58, 10), 'bra_R': (65, 55, -10), 'cod_L': 25.0, 'cod_R': 30.0,
                'hom_L': (0, -10, 0), 'hom_R': (0, 10, 0), 'mun_L': (0, 0, -15), 'mun_R': (0, 0, 15)}


def _esquiva_atras_claves(mantener=12):
    h = 14 + mantener
    return [
        (0, {'pie_L': (0.14, 0.08, 0.0), 'pie_R': (-0.14, 0.1, 0.0)}, 'suave'),
        (4, {'cad': (0.0, -0.02, -0.06), 'col': (6, 0, 0), 'bra_L': (-10, -4, 0), 'bra_R': (-10, 4, 0)}, 'suave'),
        (14, dict(_ABAJO_ATRAS, **manos('abierta')), 'sale'),
        (14 + mantener // 2, {'bra_L': (30, -72, 20), 'bra_R': (80, 38, -10), 'cod_L': 45.0, 'cab': (-22, 0, 0),
                              'cad': (0.0, -0.07, -0.17)}, 'suave'),
        (h, {'bra_L': (55, -58, 10), 'bra_R': (65, 55, -10), 'cod_L': 25.0, 'cab': (-16, 0, 0), 'cad': (0.0, -0.06, -0.15)}, 'suave'),
        (h + 12, {'cad': (0.0, -0.03, -0.05), 'cad_r': (0, 0, 0), 'col': (8, 0, 0), 'col1': (4, 0, 0), 'pec': (0, 0, 0),
                  'cue': (4, 0, 0), 'cab': (-2, 0, 0), 'pier_L': (8.0, 0.0), 'pier_R': (-8.0, 0.0),
                  'bra_L': (-6, -4, 0), 'bra_R': (-6, 4, 0), 'cod_L': 20.0, 'cod_R': 20.0, 'hom_L': (0, 0, 0), 'hom_R': (0, 0, 0),
                  'mun_L': (0, 0, 10), 'mun_R': (0, 0, -10)}, 'suave'),
        (h + 20, {'cad': BASE['cad'], 'col': BASE['col'], 'col1': BASE['col1'], 'pec': BASE['pec'], 'cue': BASE['cue'],
                  'cab': BASE['cab'], 'bra_L': (0, 0, 0), 'bra_R': (0, 0, 0), 'cod_L': 14.0, 'cod_R': 14.0,
                  'pie_L': (0.1, 0.075, 0.0), 'pie_R': (-0.1, 0.075, 0.0), 'pier_L': (6.0, 0.0), 'pier_R': (-6.0, 0.0),
                  'rod_L': BASE['rod_L'], 'rod_R': BASE['rod_R'], **manos('relajada')}, 'suave'),
    ]


@clip('esquiva_atras', 46, False, 'arco hacia atras completo: baja 0-14, mantiene 14-26, vuelve hasta 46')
def _esquiva_atras(fr):
    return muestrear(claves(_esquiva_atras_claves(12)), fr)


@clip('esquiva_atras_entrar', 14, False, 'entrada del arco hacia atras (acaba en el fotograma 0 de _mantener)')
def _esquiva_atras_entrar(fr):
    return muestrear(claves(_esquiva_atras_claves(12)), fr)


@clip('esquiva_atras_mantener', 24, True, 'arco hacia atras sostenido en bucle (brazos ondulando)')
def _esquiva_atras_mantener(fr):
    ks = claves(_esquiva_atras_claves(12))
    p = muestrear(ks, 14)
    t = fr / 24.0
    s = math.sin(2 * math.pi * t)
    c = math.cos(2 * math.pi * t)
    p['bra_L'] = (55 - 18 * s, -58 - 10 * s, 10 + 8 * s)
    p['bra_R'] = (65 + 14 * s, 55 - 12 * s, -10)
    p['cod_L'] = 25.0 + 14 * max(0, s)
    p['cod_R'] = 30.0 + 10 * max(0, -s)
    p['cab'] = (-16 - 4 * s, 0, 2 * c)
    p['cad'] = (0.0, -0.06 - 0.008 * s, -0.15 - 0.01 * s)
    return p


@clip('esquiva_atras_salir', 20, False, 'salida del arco hacia atras (desde el fotograma 0 de _mantener) al reposo')
def _esquiva_atras_salir(fr):
    return muestrear(claves(_esquiva_atras_claves(12)), 26 + fr)


@clip('esquiva_lado', 24, False, 'paso lateral rapido a la izquierda agachandose (0-8), mantiene, vuelve con otro paso (hasta 24)')
def _esquiva_lado(fr):
    ks = claves([
        (0, {}, 'suave'),
        (8, {'cad': (0.2, 0.02, -0.2), 'cad_r': (0, 14, 6), 'col': (12, 12, 0), 'col1': (10, 10, 0), 'pec': (6, 6, 0),
             'cab': (-8, -12, 0), 'pie_L': (0.42, 0.06, 0.0), 'pier_L': (18.0, 0.0), 'rod_L': (0.6, -1.0, 0.0),
             'pie_R': (-0.06, 0.09, 0.0), 'pier_R': (-8.0, 0.0),
             'bra_L': (-30, -20, 0), 'bra_R': (-40, 15, 0), 'cod_L': 70.0, 'cod_R': 85.0, **manos('tensa')}, 'sale'),
        (12, {'cad': (0.21, 0.02, -0.21)}, 'lineal'),
        (24, {'cad': BASE['cad'], 'cad_r': (0, 0, 0), 'col': BASE['col'], 'col1': BASE['col1'], 'pec': BASE['pec'],
              'cab': BASE['cab'], 'pie_L': (0.1, 0.075, 0.0), 'pier_L': (6.0, 0.0), 'rod_L': BASE['rod_L'],
              'pie_R': (-0.1, 0.075, 0.0), 'pier_R': (-6.0, 0.0), 'bra_L': (0, 0, 0), 'bra_R': (0, 0, 0),
              'cod_L': 14.0, 'cod_R': 14.0, **manos('relajada')}, 'suave'),
    ])
    return muestrear(ks, fr)


def _plegado():
    """Cuerpo hecho una bola (para rodar): muslos pegados al pecho pero por fuera del vientre."""
    return {'col': (22, 0, 0), 'col1': (20, 0, 0), 'pec': (16, 0, 0), 'cue': (22, 0, 0), 'cab': (22, 0, 0),
            'ikp_L': 0.0, 'ikp_R': 0.0, 'mus_L': (-88, 0, 18), 'mus_R': (-88, 0, -18),
            'rodfk_L': 120.0, 'rodfk_R': 120.0, 'tobfk_L': 25.0, 'tobfk_R': 25.0,
            'bra_L': (-75, -55, 0), 'bra_R': (-75, 55, 0), 'cod_L': 70.0, 'cod_R': 70.0,
            **manos('tensa')}


@clip('rodar', 32, False, 'voltereta hacia delante: se agacha 0-5, manos al suelo 5-8, rueda sobre la espalda 8-21 '
      '(sin deslizar: la raiz avanza lo que rueda), apoya los pies 22 y se levanta 32', raiz=True, rodadura=True,
      contacto=[(8, 21)])
def _rodar(fr):
    pl = _plegado()
    ks = claves([
        (0, {}, 'suave'),
        (5, {'cad': (0.0, -0.08, -0.40), 'cad_r': (28, 0, 0), 'col': (22, 0, 0), 'col1': (18, 0, 0), 'pec': (10, 0, 0),
             'cab': (16, 0, 0), 'pier_L': (6.0, -20.0),
             'pier_R': (-6.0, -20.0), 'ikb_L': 1.0, 'ikb_R': 1.0,
             'mano_L': (0.25, -0.50, 0.03), 'mano_R': (-0.25, -0.50, 0.03), 'codo_L': (0.9, 0.4, 0.0), 'codo_R': (-0.9, 0.4, 0.0),
             'orm_L': ((0, 0, -1), (0.2, -1, 0)), 'orm_R': ((0, 0, -1), (-0.2, -1, 0)), **manos('apoyo')}, 'suave'),
        (8, {'cad': (0.0, -0.20, -0.40), 'cad_r': (62, 0, 0), 'col': (18, 0, 0), 'col1': (16, 0, 0), 'pec': (14, 0, 0),
             'cue': (22, 0, 0), 'cab': (22, 0, 0), 'pier_L': (6.0, -45.0), 'pier_R': (-6.0, -45.0)}, 'suave'),
        (10, dict(pl, cad=(0.0, -0.10, -0.58), cad_r=(120, 0, 0), ikb_L=0.0, ikb_R=0.0), 'lineal'),
        (15, dict(pl, cad=(0.0, 0.0, -0.64), cad_r=(210, 0, 0)), 'lineal'),
        (20, dict(pl, cad=(0.0, 0.05, -0.62), cad_r=(300, 0, 0)), 'lineal'),
        (23, {'cad': (0.0, 0.02, -0.46), 'cad_r': (340, 0, 0), 'ikp_L': 1.0, 'ikp_R': 1.0,
              'pie_L': (0.11, 0.0, 0.0), 'pie_R': (-0.11, 0.02, 0.0), 'pier_L': (6.0, 0.0), 'pier_R': (-6.0, 0.0),
              'rod_L': (0.2, -1.0, 0.0), 'rod_R': (-0.2, -1.0, 0.0),
              'col': (26, 0, 0), 'col1': (20, 0, 0), 'pec': (12, 0, 0), 'cue': (10, 0, 0), 'cab': (0, 0, 0),
              'bra_L': (-45, -10, 0), 'bra_R': (-45, 10, 0), 'cod_L': 45.0, 'cod_R': 45.0}, 'sale'),
        (32, {'cad': BASE['cad'], 'cad_r': (360, 0, 0), 'col': BASE['col'], 'col1': BASE['col1'], 'pec': BASE['pec'],
              'cue': BASE['cue'], 'cab': BASE['cab'], 'pie_L': (0.1, 0.075, 0.0), 'pie_R': (-0.1, 0.075, 0.0),
              'bra_L': (0, 0, 0), 'bra_R': (0, 0, 0), 'cod_L': 14.0, 'cod_R': 14.0, **manos('relajada')}, 'suave'),
    ])
    return muestrear(ks, fr)


@clip('golpeado', 22, False, 'golpe en la cara: latigazo 0-3, paso atras con el pie derecho 3-10, recupera hasta 22',
      raiz=True)
def _golpeado(fr):
    ks = claves([
        (0, {}, 'suave'),
        (3, {'cad': (0.0, 0.05, -0.03), 'cad_r': (-4, 0, 8), 'col': (-8, 0, 4), 'col1': (-8, 0, 4), 'pec': (-8, 0, 4),
             'cue': (-14, 0, 6), 'cab': (-22, 8, 16), 'bra_L': (20, -25, 0), 'bra_R': (15, 25, 0), 'cod_L': 30.0,
             'cod_R': 30.0, **manos('abierta')}, 'sale'),
        (10, {'cad': (0.0, 0.14, -0.06), 'cad_r': (-2, 0, 6), 'pie_R': (-0.11, 0.36, 0.0), 'pier_R': (-10.0, 0.0),
              'col': (-2, 0, 2), 'col1': (-4, 0, 2), 'pec': (-2, 0, 2), 'cue': (-6, 0, 4), 'cab': (-8, 4, 8),
              'bra_L': (5, -12, 0), 'bra_R': (0, 12, 0)}, 'sale'),
        (22, {'cad': (0.0, 0.14, -0.012), 'cad_r': (0, 0, 0), 'col': BASE['col'], 'col1': BASE['col1'], 'pec': BASE['pec'],
              'cue': BASE['cue'], 'cab': BASE['cab'], 'pie_L': (0.1, 0.215, 0.0), 'pie_R': (-0.1, 0.215, 0.0),
              'pier_R': (-6.0, 0.0), 'bra_L': (0, 0, 0), 'bra_R': (0, 0, 0), 'cod_L': 14.0, 'cod_R': 14.0,
              **manos('relajada')}, 'suave'),
    ])
    return muestrear(ks, fr)


def _tumbado():
    """Tumbado boca arriba con la cadera sobre el origen (levantarse empieza aqui); manos apoyadas
    en el suelo con IK, rodilla izquierda algo doblada."""
    return {'cad': (0.0, 0.0, -0.865), 'cad_r': (-88, 0, 4), 'col': (-2, 0, 0), 'col1': (-2, 0, 0), 'pec': (0, 0, 0),
            'cue': (8, 0, 0), 'cab': (-4, 0, 14), 'ikp_L': 1.0, 'ikp_R': 1.0,
            'pie_L': (0.15, -0.72, 0.0), 'pier_L': (14.0, 72.0), 'rod_L': (0.3, 0.0, 1.0),
            'pie_R': (-0.13, -0.66, 0.0), 'pier_R': (-10.0, 60.0), 'rod_R': (-0.3, -0.2, 1.0),
            'ikb_L': 1.0, 'ikb_R': 1.0,
            'mano_L': (0.37, 0.06, 0.035), 'mano_R': (-0.37, 0.10, 0.035),
            'codo_L': (0.6, 0.3, 0.3), 'codo_R': (-0.6, 0.3, 0.3),
            'orm_L': ((0, 0, -1), (0.35, -1, 0)), 'orm_R': ((0, 0, -1), (-0.35, -1, 0)),
            **manos('apoyo')}


@clip('derribado', 38, False, 'cae de espaldas (0-19) y queda tumbado; la raiz sigue a la cadera 0,62 m hacia atras: '
      'su ultimo fotograma es el primero de levantarse', raiz=True, contacto=[(24, 38)])
def _derribado(fr):
    tb = desplazar(_tumbado(), (0.0, 0.62))
    ks = claves([
        (0, {}, 'suave'),
        (4, {'cad': (0.0, 0.08, -0.06), 'cad_r': (-8, 0, 6), 'col': (-10, 0, 4), 'col1': (-10, 0, 2), 'pec': (-8, 0, 0),
             'cue': (-14, 0, 0), 'cab': (-22, 6, 10), 'bra_L': (30, -30, 0), 'bra_R': (25, 30, 0), 'cod_L': 30.0,
             'cod_R': 30.0, **manos('abierta')}, 'sale'),
        (12, {'cad': (0.0, 0.26, -0.4), 'cad_r': (-34, 0, 6),
              'pie_L': (0.13, 0.05, 0.0), 'pie_R': (-0.13, -0.05, 0.14), 'pier_L': (8.0, 22.0), 'pier_R': (-8.0, 30.0),
              'rod_L': (0.25, -1.0, 0.3), 'rod_R': (-0.25, -1.0, 0.5),
              'col': (4, 0, 2), 'col1': (6, 0, 0), 'pec': (4, 0, 0), 'cue': (8, 0, 0), 'cab': (4, 0, 6),
              'bra_L': (-40, -45, 0), 'bra_R': (-30, 45, 0), 'cod_L': 40.0, 'cod_R': 35.0}, 'entra2'),
        (19, dict(tb, cad=(0.0, 0.60, -0.83), cad_r=(-84, 0, 4), cue=(18, 0, 0), cab=(10, 0, 8),
                  pie_L=(0.15, -0.08, 0.1), pie_R=(-0.13, 0.0, 0.12), ikb_L=0.0, ikb_R=0.0,
                  bra_L=(10, -55, 0), bra_R=(10, 55, 0), cod_L=20.0, cod_R=20.0), 'entra2'),
        (25, {'cad': (0.0, 0.62, -0.83), 'cue': (14, 0, 0), 'cab': (4, 0, 10), 'pie_L': (0.15, -0.12, 0.02),
              'pie_R': (-0.13, -0.05, 0.03), 'ikb_L': 1.0, 'ikb_R': 1.0}, 'sale'),
        (38, tb, 'suave'),
    ])
    return muestrear(ks, fr)


@clip('levantarse', 40, False, 'desde tumbado (cadera sobre la raiz): se incorpora con las manos quietas en el suelo 0-12, '
      'recoge las piernas y apoya la mano derecha delante 12-20, en cuclillas 28, de pie 40; la raiz sigue a la cadera',
      raiz=True, contacto=[(0, 4)])
def _levantarse(fr):
    tb = _tumbado()
    mL, mR = tb['mano_L'], tb['mano_R']
    ks = claves([
        (0, tb, 'suave'),
        # se sienta: las manos no se mueven del suelo, los codos hacia atras y fuera
        (12, {'cad': (0.0, 0.0, -0.84), 'cad_r': (-38, 0, 0), 'col': (22, 0, 0), 'col1': (18, 0, 0), 'pec': (10, 0, 0),
              'cue': (8, 0, 0), 'cab': (2, 0, 0),
              'pie_L': (0.14, -0.40, 0.0), 'pier_L': (10.0, 0.0), 'rod_L': (0.4, -0.6, 1.0),
              'pie_R': (-0.14, -0.62, 0.0), 'pier_R': (-10.0, 40.0), 'rod_R': (-0.4, -0.3, 1.0),
              'mano_L': mL, 'mano_R': mR, 'codo_L': (0.7, 1.0, 0.0), 'codo_R': (-0.7, 1.0, 0.0)}, 'suave'),
        # recoge la pierna derecha y apoya la mano derecha a su lado, delante
        (20, {'cad': (0.0, -0.12, -0.68), 'cad_r': (-8, 0, -10), 'col': (24, 0, -6), 'col1': (18, 0, -4), 'pec': (10, 0, 0),
              'cue': (6, 0, 0), 'cab': (-4, 0, 0),
              'pie_L': (0.14, -0.42, 0.0), 'pie_R': (-0.13, -0.36, 0.0), 'pier_L': (8.0, 0.0), 'pier_R': (-8.0, -10.0),
              'rod_L': (0.3, -1.0, 0.0), 'rod_R': (-0.3, -1.0, 0.0),
              'ikb_L': 0.0, 'orm_L': None, 'bra_L': (-50, -28, 0), 'cod_L': 40.0,
              'mano_R': (-0.30, -0.02, 0.035), 'codo_R': (-0.9, 0.6, 0.0), 'orm_R': ((0, 0, -1), (-0.3, -1, 0))}, 'suave'),
        # en cuclillas sobre los pies; la mano derecha deja el suelo
        (28, {'cad': (0.0, -0.34, -0.44), 'cad_r': (20, 0, 0), 'col': (16, 0, 0), 'col1': (12, 0, 0), 'pec': (6, 0, 0),
              'cue': (0, 0, 0), 'cab': (-10, 0, 0), 'pie_L': (0.13, -0.42, 0.0), 'pie_R': (-0.13, -0.36, 0.0),
              'pier_R': (-8.0, 0.0), 'ikb_R': 0.0, 'orm_R': None, 'bra_L': (-30, -12, 0), 'bra_R': (-30, 12, 0),
              'cod_L': 50.0, 'cod_R': 50.0, **manos('relajada')}, 'suave'),
        (40, {'cad': (0.0, -0.42, -0.012), 'cad_r': (0, 0, 0), 'col': BASE['col'], 'col1': BASE['col1'], 'pec': BASE['pec'],
              'cue': BASE['cue'], 'cab': BASE['cab'], 'pie_L': (0.1, -0.345, 0.0), 'pie_R': (-0.1, -0.345, 0.0),
              'pier_L': (6.0, 0.0), 'pier_R': (-6.0, 0.0), 'bra_L': (0, 0, 0), 'bra_R': (0, 0, 0),
              'cod_L': 14.0, 'cod_R': 14.0}, 'suave'),
    ])
    return muestrear(ks, fr)


@clip('piratear', 48, True, 'teclear de pie en una terminal (munecas a 1,09 m y 0,40 m delante; palmas abajo)')
def _piratear(fr):
    t = fr / 48.0
    p = pose_base()
    p['cad'] = (0.0, 0.03, -0.02)
    p['col'] = (6, 0, 0)
    p['col1'] = (6, 0, 0)
    p['pec'] = (4, 0, 0)
    p['cue'] = (10, 0, 0)
    p['cab'] = (12 + 2 * math.sin(2 * math.pi * t), 0, 5 * math.sin(2 * math.pi * t + 0.6))
    p['ikb_L'] = 1.0
    p['ikb_R'] = 1.0

    def tecla(ph, n):
        return 0.010 * max(0.0, math.sin(2 * math.pi * (n * t + ph))) ** 3
    xl = 0.13 + 0.02 * math.sin(2 * math.pi * 2 * t)
    xr = -0.11 + 0.025 * math.sin(2 * math.pi * 3 * t + 1.0)
    p['mano_L'] = (xl, -0.36, 1.10 + tecla(0.0, 6))
    p['mano_R'] = (xr, -0.37, 1.10 + tecla(0.5, 5))
    p['codo_L'] = (0.8, 0.5, -0.5)
    p['codo_R'] = (-0.8, 0.5, -0.5)
    # palmas hacia abajo, dedos hacia delante y algo hacia dentro
    p['orm_L'] = ((0.15, 0.1, -1.0), (-0.25, -1.0, -0.15))
    p['orm_R'] = ((-0.15, 0.1, -1.0), (0.25, -1.0, -0.15))
    k1 = max(0.0, math.sin(2 * math.pi * 6 * t)) ** 2
    k2 = max(0.0, math.sin(2 * math.pi * 5 * t + 1.5)) ** 2
    p['ded_L'] = (24.0 + 16 * k1, 28.0 + 10 * k1)
    p['ded_R'] = (24.0 + 16 * k2, 28.0 + 10 * k2)
    p['pul_L'] = (10.0, 6.0)
    p['pul_R'] = (10.0, 6.0)
    p['hom_L'] = (0, 0, -4)
    p['hom_R'] = (0, 0, 4)
    p['pie_L'] = (0.12, 0.08, 0.0)
    p['pie_R'] = (-0.12, 0.09, 0.0)
    p['pier_L'] = (8.0, 0.0)
    p['pier_R'] = (-8.0, 0.0)
    return p


@clip('telefono', 48, False, 'descolgar un telefono de pared (auricular a 1,44 m, 0,42 m delante a la derecha) y llevarlo '
      'a la oreja: el auricular va en agarre_R, palma hacia la mejilla y codo abajo')
def _telefono(fr):
    # auricular en la oreja derecha: la mano cerrada junto a la mejilla, por fuera de la cara
    # puno delante y debajo de la oreja, junto a la mejilla: palma hacia la cara, antebrazo casi
    # vertical y codo abajo; el lado del pulgar (+Y de agarre_R) apunta atras y arriba, a la oreja,
    # y el auricular cruza en diagonal hasta la boca
    oreja = (-0.176, -0.012, 1.533)
    orient = ((1.0, 0.05, 0.0), (0.0, -0.45, 0.9))
    ks = claves([
        (0, {}, 'suave'),
        (9, {'ikb_R': 1.0, 'mano_R': (-0.22, -0.36, 1.40), 'codo_R': (-0.9, 0.3, -0.5), 'bra_L': (-2, -7, 0),
             'orm_R': ((1.0, 0.0, 0.0), (0.0, -0.5, 1.0)), **manos('relajada', 'abierta'),
             'cad': (-0.02, -0.03, -0.015), 'cad_r': (0, 0, 8), 'col1': (4, 0, 6), 'pec': (2, 0, 6), 'cue': (4, 0, 6),
             'cab': (-4, 0, 10), 'pie_R': (-0.12, -0.05, 0.0), 'pier_R': (-10.0, 0.0)}, 'suave'),
        (12, {'mano_R': (-0.22, -0.35, 1.39), **manos('relajada', 'agarre')}, 'lineal'),
        (24, {'mano_R': oreja, 'codo_R': (-0.3, -0.5, -1.0), 'orm_R': orient,
              'cad': (0.0, 0.0, -0.014), 'cad_r': (0, -1, 4), 'col1': (2, -1, 2), 'pec': (0, -1, 2), 'cue': (4, -2, 0),
              'cab': (-2, -3, -3), 'pie_R': (-0.11, 0.06, 0.0)}, 'suave'),
        (34, {'cab': (2, -4, -6), 'cue': (6, -2, 0), 'bra_L': (-4, -6, 0), 'cod_L': 22.0,
              'mano_R': (-0.175, -0.014, 1.530)}, 'suave'),
        (48, {'cab': (0, -3, -4), 'mano_R': (-0.176, -0.012, 1.533)}, 'suave'),
    ])
    return muestrear(ks, fr)


@clip('victoria', 44, False, 'puno cerrado arriba: carga 0-8, puno al cielo 14, mantiene; la izquierda en puno a la cintura')
def _victoria(fr):
    arriba = ((0.2, 0.9, 0.3), (0.0, -0.15, 1.0))
    ks = claves([
        (0, {}, 'suave'),
        (8, {'cad': (0.0, 0.0, -0.08), 'col': (12, 0, 0), 'col1': (8, 0, 0), 'cab': (10, 0, 0),
             'bra_R': (-30, 20, 0), 'cod_R': 110.0, 'bra_L': (-20, -12, 0), 'cod_L': 70.0, **manos('puno')}, 'suave'),
        (14, {'cad': (0.0, 0.0, 0.0), 'col': (-6, 0, 0), 'col1': (-6, 0, 0), 'pec': (-6, 0, 0), 'cue': (-8, 0, 0),
              'cab': (-14, 0, 0), 'ikb_R': 1.0, 'mano_R': (-0.23, -0.06, 1.97), 'codo_R': (-1.0, 0.3, 0.0),
              'orm_R': arriba, 'bra_L': (-30, -22, 0), 'cod_L': 95.0, 'mun_L': (0, 0, -10), 'hom_R': (0, -12, 0)}, 'sale'),
        (20, {'mano_R': (-0.23, -0.06, 1.93), 'cad': (0.0, 0.0, -0.02)}, 'suave'),
        (28, {'mano_R': (-0.24, -0.07, 1.98), 'cab': (-16, 0, 6)}, 'suave'),
        (44, {'mano_R': (-0.23, -0.06, 1.96), 'cab': (-12, 0, 2)}, 'suave'),
    ])
    return muestrear(ks, fr)


ORDEN = ['reposo', 'guardia', 'andar', 'correr', 'esprintar', 'retroceder', 'lateral_izq', 'lateral_der',
         'puno_1', 'puno_2', 'patada', 'esquiva_atras', 'esquiva_atras_entrar', 'esquiva_atras_mantener',
         'esquiva_atras_salir', 'esquiva_lado', 'rodar', 'golpeado', 'derribado', 'levantarse',
         'piratear', 'telefono', 'victoria']


# ------------------------------------------------------------------ mallas para el suelo (skinning lineal)
class Nubes:
    """Mallas LOD0 en reposo de las figuras de un sexo, con sus pesos: se deforman igual que en
    three.js para medir el punto mas bajo de verdad (no un punto del esqueleto)."""

    def __init__(self, rutas, sk):
        self.ok = bool(rutas)
        if not self.ok:
            return
        P, I, W, F, reg, L2 = [], [], [], [], [], []
        orden = {n: k for k, n in enumerate(sk.orden)}
        falda_i = np.array([n.startswith('faldon') for n in sk.orden])
        for r in rutas:
            d = np.load(r, allow_pickle=False)
            nombres = [str(x) for x in d['nombres']]
            mapa = np.array([orden[n] for n in nombres])
            # el LOD0 y, si la nube lo trae, el LOD2 (sólo cuenta para el suelo: se aparta hasta 3 cm)
            capas = [('P', 'idx', 'w', 'falda')] + ([('P2', 'idx2', 'w2', 'falda2')] if 'P2' in d.files else [])
            for kp, ki, kw, kf in capas:
                L2.append(np.full(len(d[kp]), kp == 'P2'))
                P.append(d[kp].astype(np.float64))
                I.append(mapa[d[ki]])
                W.append(d[kw].astype(np.float64))
                # ═══ LO QUE SIGUE AL FALDÓN NO ES CUERPO PARA EL SUELO ═══ Con el umbral de un 30 % por hueso,
                # el bajo de la chaqueta del Celador (hasta un 55 % repartido en dos cadenas) contaba como
                # cuerpo: de rodillas tocaba el suelo con la tela y todas las demás figuras flotaban 9 cm.
                peso_falda = (d[kw] * falda_i[mapa[d[ki]]]).sum(1)
                F.append(np.asarray(d[kf], bool) | (peso_falda > 0.05))
                reg.append(mapa[d[ki][:, 0]])
        self.P = np.concatenate(P)
        self.lod2 = np.concatenate(L2)
        self.I = np.concatenate(I)
        self.W = np.concatenate(W)
        falda = np.concatenate(F)
        dom = np.concatenate(reg)
        nombres = sk.orden
        es = lambda pre: np.isin(dom, [orden[n] for n in nombres if n.startswith(pre)])
        self.pie = {s: (es('pie_' + s) | es('punta_' + s)) & ~falda for s in 'LR'}
        # la mano apoyada (tumbado, al levantarse): mano, dedos, pulgar y el giro de la muñeca
        self.mano = {s: (es('mano_' + s) | es('dedos_' + s) | es('dedos2_' + s) | es('pulgar_' + s) | es('giro_' + s)) & ~falda
                     for s in 'LR'}
        self.cuerpo = ~falda
        self.otro = self.cuerpo & ~self.pie['L'] & ~self.pie['R']
        # submuestreo del cuerpo para ir rapido (los pies enteros)
        paso = max(1, int(self.cuerpo.sum() / 24000))
        sel = np.zeros(len(self.P), bool)
        sel[np.nonzero(self.otro)[0][::paso]] = True
        sel |= self.pie['L'] | self.pie['R']
        self.sel = sel
        self.h0 = np.array([list(sk.head[n]) for n in sk.orden])
        self.nombres = sk.orden
        self.P_sel = self.P[sel]
        self.I_sel = self.I[sel]
        self.W_sel = self.W[sel]
        sel |= self.mano['L'] | self.mano['R']
        self.sel = sel
        self.P_sel = self.P[sel]
        self.I_sel = self.I[sel]
        self.W_sel = self.W[sel]
        self.pie_sel = {s: self.pie[s][sel] for s in 'LR'}
        self.mano_sel = {s: self.mano[s][sel] for s in 'LR'}
        self.otro_sel = self.otro[sel]
        self.lod2_sel = self.lod2[sel]
        # vertices del faldon y su cadena/hueso dominante
        self.falda_ok = bool(falda.any())
        if self.falda_ok:
            idx = np.nonzero(falda)[0]
            self.P_f, self.I_f, self.W_f = self.P[idx], self.I[idx], self.W[idx]
            dn = [nombres[k] for k in self.I_f[:, 0]]
            cad, hue = [], []
            for n in dn:
                if n.startswith('faldon'):
                    k, j, lado = int(n[6]), int(n[7]), n[-1]
                    cad.append(k + (0 if lado == 'L' else 4))
                    hue.append(j)
                else:
                    cad.append(-1)
                    hue.append(0)
            self.cad_f = np.array(cad)
            self.hue_f = np.array(hue)

    def deformar_falda(self, D, head):
        Dm = np.array([[list(r) for r in D[n]] for n in self.nombres])
        h = np.array([list(head[n]) for n in self.nombres])
        t = h - np.einsum('bij,bj->bi', Dm, self.h0)
        out = np.zeros_like(self.P_f)
        for k in range(4):
            b = self.I_f[:, k]
            out += self.W_f[:, k:k + 1] * (np.einsum('nij,nj->ni', Dm[b], self.P_f) + t[b])
        return out

    def deformar(self, D, head, todo=False):
        Dm = np.array([[list(r) for r in D[n]] for n in self.nombres])        # (B,3,3)
        h = np.array([list(head[n]) for n in self.nombres])
        t = h - np.einsum('bij,bj->bi', Dm, self.h0)
        if todo:
            P, I, W = self.P, self.I, self.W
        else:
            P, I, W = self.P_sel, self.I_sel, self.W_sel
        out = np.zeros_like(P)
        for k in range(4):
            b = I[:, k]
            out += W[:, k:k + 1] * (np.einsum('nij,nj->ni', Dm[b], P) + t[b])
        return out


# ------------------------------------------------------------------ faldon: simulacion
class Faldon:
    """8 cadenas de 4 particulas (raiz fija a la cadera). Muelle hacia la forma de reposo
    (relativa a la cadera), inercia, gravedad que crece al inclinarse la cadera (tumbado, rodando),
    viento en la carrera y colisiones con capsulas de piernas, pies, antebrazos, manos, pelvis y suelo."""

    K = (160.0, 70.0, 38.0)        # rigidez del muelle por nivel (1/s2)
    AMORT = 5.0                    # amortiguamiento (1/s)
    # ═══ SEGUNDA PASADA: SIN CAPA NI CAMPANA ═══ La revisión midió, al correr, el 62 % de los vértices
    # del faldón por encima de la cadera, y en quiebros y Entrada el 98 %, hasta 30 cm por encima del
    # pecho; y en reposo y guardia el bajo a 1,3 veces el de la malla sin posar. Cuatro causas: el aire
    # (1,7 por m/s de velocidad relativa), el margen de 2 cm contra las cápsulas, las cadenas vecinas que
    # podían separarse un 45 % (la tela se estiraba en campana) y ningún tope de ángulo. Ahora: aire a
    # 0,8, margen de 8 mm con cápsulas al percentil 70, vecinas al 7 % y un tope por clip respecto a la
    # cadera (`tope_faldon`: 35° al trotar, 50° al correr); ninguna junta pasa del talle.
    ARRASTRE = 0.8                 # viento: fuerza por m/s de velocidad relativa
    SUBPASOS = 4
    ITER = 6
    MARGEN = 0.008                 # holgura con la ropa (el grosor del faldón va aparte)
    ESTIRA = 1.07                  # lo más que se separan dos cadenas vecinas (antes 1,45: campana)
    TOPE = 70.0                    # tope de ángulo por defecto respecto a la forma de reposo en la cadera
    SUELO = 0.016
    # pares de cadenas vecinas que solo se atan en el primer nivel: la raja trasera y las aberturas
    # laterales (entre el costado delantero y el trasero de cada lado)
    SOLO_ARRIBA = ((3, 7), (1, 2), (5, 6))

    def __init__(self, sk, radios):
        self.sk = sk
        e = sk.esc
        self.cadenas = []
        for s in 'LR':
            for k in range(4):
                self.cadenas.append(['faldon%d%d_%s' % (k, j, s) for j in (1, 2, 3)])
        # forma de reposo en el espacio de la cadera (raiz y 3 juntas por cadena)
        Rc = sk.R['caderas']
        hc = sk.head['caderas']
        self.local = []
        for cad in self.cadenas:
            pts = [sk.head[cad[0]]] + [sk.tail[b] for b in cad]
            self.local.append([Vector(p) - hc for p in pts])
        self.largos = [[(self.local[c][j + 1] - self.local[c][j]).length for j in range(3)] for c in range(8)]
        self.vecinos = []
        for lado in (0, 4):
            for k in range(3):
                self.vecinos.append((lado + k, lado + k + 1))
        self.vecinos.append((3, 7))       # atras, por encima de la raja: solo el primer nivel
        self.radios = radios
        self.e = e
        # anchura del panel mas alla de la cadena delantera (hasta la abertura) y de la trasera
        # (hasta la raja), por hueso: arco = radio x angulo
        zs = [(anatomia.Z_FALDON[j] + anatomia.Z_FALDON[j + 1]) * 0.5 for j in range(3)]
        a0, a3 = math.radians(anatomia.ANG_FALDON[0]), math.radians(anatomia.ANG_FALDON[3])
        self.ala_del = [float(anatomia.perfil_faldon(sk.sexo, a0, z)) * e * math.radians(anatomia.ANG_FALDON[0] - 10.0) for z in zs]
        self.ala_tras = [float(anatomia.perfil_faldon(sk.sexo, a3, z)) * e * (math.pi - a3) for z in zs]
        # ═══ LO QUE YA TOCABA EN REPOSO NO EMPUJA (segunda pasada) ═══ En reposo el bajo medía 0,57 m de ancho
        # contra 0,42 sin posar: el percentil 70 de la malla hace cápsulas más gordas que el cuerpo justo
        # donde la tela va cerca (la pelvis transversal, el muslo junto a la cadera), así que chocaban YA en
        # la pose de reposo, y un empujón de 1-2 cm arriba abre el bajo 10-15 cm por palanca. La malla del
        # faldón se construye con holgura positiva sobre el cuerpo (`accesorios.faldon` la registra: 11-27
        # mm): lo que una cápsula «atraviesa» sin posar es error de la cápsula, no tela que empujar.
        # Primero se probó a encoger las cápsulas hasta no tocar el faldón sin posar: el reposo quedó bien
        # (0,47 de bajo), pero el muslo encogido un 21 % arriba dejaba pasar la pierna por delante al
        # apuntar o en la guardia (del 0-3 % al 29-100 % de fotogramas atravesados). Ahora cada punto que
        # choca `_colisiones` guarda lo que se metía en cada cápsula sin posar y sólo se le empuja lo que
        # pase de eso: las cápsulas enteras para lo que no tocaba, y el reposo, quieto.
        self.tolera = self._tolerancias()

    def _capsulas(self, D, head):
        sk, r = self.sk, self.radios
        caps = []
        for s in 'LR':
            for b, key in (('muslo_', 'muslo'), ('pierna_', 'pierna'), ('pie_', 'pie'), ('antebrazo_', 'antebrazo'),
                           ('mano_', 'mano')):
                n = b + s
                a = head[n]
                t = a + D[n] @ (sk.tail[n] - sk.head[n])
                if key == 'muslo':
                    a = a + (t - a) * 0.12      # junto a la cadera el faldon ya va cosido
                if key == 'pie':
                    t = a + D['punta_' + s] @ (sk.tail['punta_' + s] - sk.head['punta_' + s]) + \
                        D[n] @ (sk.tail[n] - sk.head[n])
                if key == 'mano':
                    t = a + D[n] @ (sk.tail[n] - sk.head[n]) * 1.9
                ra, rb = r[key]
                if key == 'muslo':
                    ra = min(ra, 0.105 * self.e)      # la franja alta incluye gluteo e ingle
                caps.append((a, t, ra, rb))
        # pelvis y gluteos: capsula transversal
        Dc = D['caderas']
        hc = head['caderas']
        e = self.e
        caps.append((hc + Dc @ Vector((0.085 * e, 0.035 * e, -0.07 * e)), hc + Dc @ Vector((-0.085 * e, 0.035 * e, -0.07 * e)),
                     r['pelvis'], r['pelvis']))
        caps.append((hc + Dc @ Vector((0.0, 0.0, 0.05 * e)), head['pecho'], r['torso'], r['torso']))
        return caps

    def _muestras(self, pos):
        """Los puntos que choca `_colisiones`, con su clave: a lo largo de cada hueso ('h'), las alas del
        panel más allá de las cadenas de delante y de atrás ('a') y las cuerdas entre vecinas ('v')."""
        pts = []
        for c in range(8):
            for j in range(3):
                for t_ in (0.34, 0.67, 1.0):
                    pts.append((('h', c, j, t_), pos[c][j].lerp(pos[c][j + 1], t_)))
        for c, otra, extra in ((0, 1, self.ala_del), (4, 5, self.ala_del), (3, 2, self.ala_tras), (7, 6, self.ala_tras)):
            for j in range(3):
                for t_ in (0.5, 1.0):
                    m0 = pos[c][j].lerp(pos[c][j + 1], t_)
                    ax = pos[c][j + 1] - pos[c][j]
                    lado = m0 - pos[otra][j].lerp(pos[otra][j + 1], t_)
                    lado = lado - ax * (lado.dot(ax) / max(ax.dot(ax), 1e-12))
                    if lado.length > 1e-6:
                        pts.append((('a', c, j, t_), m0 + lado.normalized() * extra[j]))
        for ca, cb in self.vecinos:
            for j in ((0,) if (ca, cb) in self.SOLO_ARRIBA else (0, 1, 2)):
                for t_ in (0.5, 1.0):
                    pts.append((('v', ca, cb, j, t_),
                                (pos[ca][j].lerp(pos[ca][j + 1], t_) + pos[cb][j].lerp(pos[cb][j + 1], t_)) * 0.5))
        return pts

    def _tolerancias(self):
        """(clave del punto, índice de cápsula) -> lo que ese punto se mete en esa cápsula (más el margen)
        en la forma sin posar; `_colisiones` sólo empuja lo que pase de ahí."""
        sk = self.sk
        Dr = {b: Matrix.Identity(3) for b in sk.head}
        hr = {b: sk.head[b].copy() for b in sk.head}
        hc = sk.head['caderas']
        M = self.MARGEN
        caps = self._capsulas(Dr, hr)
        out = {}
        for k, p in self._muestras([[hc + q for q in cad] for cad in self.local]):
            for i, (a, b, ra, rb) in enumerate(caps):
                ab = b - a
                L2 = ab.dot(ab)
                t_ = 0.0 if L2 < 1e-12 else max(0.0, min(1.0, (p - a).dot(ab) / L2))
                d = (p - (a + ab * t_)).length
                dentro = ra + (rb - ra) * t_ + M - d
                if dentro > 0.0:
                    out[(k, i)] = dentro + 0.002
        return out

    @staticmethod
    def _empujar(p, a, b, ra, rb, margen):
        ab = b - a
        L2 = ab.dot(ab)
        t = 0.0 if L2 < 1e-12 else max(0.0, min(1.0, (p - a).dot(ab) / L2))
        c = a + ab * t
        d = p - c
        dl = d.length
        rr = ra + (rb - ra) * t + margen
        if dl < rr:
            if dl < 1e-9:
                d = Vector((0, -1, 0))
                dl = 1.0
            return d * ((rr - dl) / dl)
        return None

    def _rigido(self, est):
        """Largos exactos de hueso desde la raiz (como los reconstruira el esqueleto) y ninguna
        junta por debajo del suelo: si una baja, se gira el hueso sobre su cabeza hasta el suelo."""
        for c in range(8):
            for j in range(3):
                a, b = est[c][j], est[c][j + 1]
                L = self.largos[c][j]
                d = b - a
                if d.length < 1e-9:
                    d = Vector((0, 0, -1))
                d.normalize()
                q = a + d * L
                if q.z < self.SUELO:
                    dz = self.SUELO - a.z
                    if abs(dz) < L:
                        h = Vector((d.x, d.y, 0.0))
                        if h.length < 1e-9:
                            h = Vector((1, 0, 0))
                        h.normalize()
                        q = a + h * math.sqrt(L * L - dz * dz) + Vector((0, 0, dz))
                est[c][j + 1] = q
        return est

    def _mover(self, pos, c, j, t, emp):
        """Mueve el punto a fraccion t del hueso j de la cadena c exactamente 'emp'."""
        if j == 0:
            pos[c][1] += emp * min(1.0 / max(t, 1e-3), 3.0)
        else:
            w = (1 - t) ** 2 + t * t
            pos[c][j] += emp * ((1 - t) / w)
            pos[c][j + 1] += emp * (t / w)

    def _colisiones(self, pos, caps):
        """Muestras a lo largo de cada hueso (1/3, 2/3, junta) y en las cuerdas entre cadenas
        vecinas: la tela entre cadenas tampoco puede atravesar una pierna ni el suelo."""
        M = self.MARGEN
        tol = self.tolera
        for c in range(8):
            for j in range(3):
                for t in (0.34, 0.67, 1.0):
                    m = pos[c][j].lerp(pos[c][j + 1], t)
                    for i_, (ca_, cb_, ra, rb) in enumerate(caps):
                        emp = self._empujar(m, ca_, cb_, ra, rb, M - tol.get((('h', c, j, t), i_), 0.0))
                        if emp is not None:
                            self._mover(pos, c, j, t, emp)
                            m = pos[c][j].lerp(pos[c][j + 1], t)
                    if m.z < self.SUELO:
                        self._mover(pos, c, j, t, Vector((0, 0, self.SUELO - m.z)))
        for c, otra, extra in ((0, 1, self.ala_del), (4, 5, self.ala_del), (3, 2, self.ala_tras), (7, 6, self.ala_tras)):
            for j in range(3):
                for t in (0.5, 1.0):
                    m0 = pos[c][j].lerp(pos[c][j + 1], t)
                    ax = pos[c][j + 1] - pos[c][j]
                    lado = m0 - pos[otra][j].lerp(pos[otra][j + 1], t)
                    lado = lado - ax * (lado.dot(ax) / max(ax.dot(ax), 1e-12))
                    if lado.length < 1e-6:
                        continue
                    ala = m0 + lado.normalized() * extra[j]
                    for i_, (ca_, cb_, ra, rb) in enumerate(caps):
                        emp = self._empujar(ala, ca_, cb_, ra, rb, M - tol.get((('a', c, j, t), i_), 0.0))
                        if emp is not None:
                            self._mover(pos, c, j, t, emp)
                            ala = ala + emp
                    if ala.z < self.SUELO:
                        self._mover(pos, c, j, t, Vector((0, 0, self.SUELO - ala.z)))
        for ca, cb in self.vecinos:
            huesos = (0,) if (ca, cb) in self.SOLO_ARRIBA else (0, 1, 2)
            for j in huesos:
                for t in (0.5, 1.0):
                    pa = pos[ca][j].lerp(pos[ca][j + 1], t)
                    pb = pos[cb][j].lerp(pos[cb][j + 1], t)
                    m = (pa + pb) * 0.5
                    for i_, (ca_, cb_, ra, rb) in enumerate(caps):
                        emp = self._empujar(m, ca_, cb_, ra, rb, M - tol.get((('v', ca, cb, j, t), i_), 0.0))
                        if emp is not None:
                            self._mover(pos, ca, j, t, emp)
                            self._mover(pos, cb, j, t, emp)
                            pa = pos[ca][j].lerp(pos[ca][j + 1], t)
                            pb = pos[cb][j].lerp(pos[cb][j + 1], t)
                            m = (pa + pb) * 0.5
                    if m.z < self.SUELO:
                        d = Vector((0, 0, self.SUELO - m.z))
                        self._mover(pos, ca, j, t, d)
                        self._mover(pos, cb, j, t, d)

    def _topes(self, pos, obj, D, tope):
        """Tope de ángulo de cada junta respecto a la forma de reposo llevada por la cadera (entera: el
        tope es «respecto a la cadera»): la tela puede ondear, no volar como una capa."""
        ct = math.cos(math.radians(tope))
        for c in range(8):
            r = pos[c][0]
            for j in range(1, 4):
                v = pos[c][j] - r
                ref = obj[c][j] - obj[c][0]
                L = v.length
                if L < 1e-9 or ref.length < 1e-9:
                    continue
                vd = v / L
                rd = ref.normalized()
                if vd.dot(rd) >= ct:
                    continue
                perp = vd - rd * vd.dot(rd)
                if perp.length < 1e-9:
                    continue
                perp.normalize()
                pos[c][j] = r + (rd * ct + perp * math.sqrt(max(0.0, 1.0 - ct * ct))) * L

    def _talle(self, pos, D, head):
        """Ninguna junta por encima de la cabeza del hueso `caderas` en la vertical de la cadera (el
        talle): el panel que sube con el muslo se queda tendido sobre él, no por encima del cinturón.
        Gira cada hueso sobre su cabeza (conserva el largo: proyectar sin más lo acortaba, y el `_rigido`
        del final lo volvía a subir). Sólo con el cuerpo de pie o inclinado hasta ~37° (correr va a 26°, los
        quiebros a 30°): sentado en el suelo echado atrás (44° al levantarse), de rodillas volcado o a gatas,
        la tela cae al suelo y en el marco de la cadera queda «por encima»; es lo que hace una gabardina de
        verdad, y forzarla bajo el talle la metía en el suelo."""
        # la vertical de la cadera es la de la batería (`comprobar.py`): de la cabeza de `caderas` a la de
        # `columna`. Con el eje z del hueso (que en reposo no es esa recta) la simulación y la medida no se
        # ponían de acuerdo cerca de los 45°: la batería medía el talle en poses que aquí se soltaban
        hc = head['caderas']
        arriba = head['columna'] - hc
        if arriba.length < 1e-9:
            return
        arriba = arriba.normalized()
        if arriba.z < 0.8:
            return
        for c in range(8):
            for j in range(1, 4):
                base_ = pos[c][j - 1]
                v = pos[c][j] - base_
                L = v.length
                if L < 1e-9:
                    continue
                m = -0.03 * self.e * j - (base_ - hc).dot(arriba)      # lo más que puede subir este hueso
                vu = v.dot(arriba)
                if vu <= m:
                    continue
                vu2 = max(m, -L)
                hz = v - arriba * vu
                lh = hz.length
                hz = hz / lh if lh > 1e-9 else Vector((0.0, 0.0, 0.0))
                nuevo = arriba * vu2 + hz * math.sqrt(max(0.0, L * L - vu2 * vu2))
                delta = (base_ + nuevo) - pos[c][j]
                if (base_ + nuevo).z < self.SUELO:
                    continue        # bajo el talle, sí; bajo el suelo, no (sentado se metía 1,5 cm)
                for jj in range(j, 4):
                    pos[c][jj] = pos[c][jj] + delta

    # ═══ SEGUNDA PASADA DE LA CAPTURA: TUMBADO, TOPES DE VELOCIDAD Y EL MUSLO ═══ La revisión vio el faldón doblado
    # en una caja bajo la cadera o dado la vuelta (169° de la vertical) todo el KO, y en el jab el panel de delante
    # tieso a la altura de la rodilla 400 ms. Tres causas: la tela quería colgar hacia el suelo aunque el cuerpo
    # estuviese tumbado (el objetivo sólo seguía la guiñada de la cadera), nada limitaba lo que un panel gira de un
    # fotograma a otro, y los golpes no tenían tope. Ahora, tumbado, la forma a la que tiende es la de reposo llevada
    # por la pelvis entera (extendida sobre las piernas y el suelo) con un tope de 25°; y al acabar, ningún hueso del
    # faldón gira más de VEL_MAX por fotograma respecto a la cadera ni, de pie, un panel de delante se aparta más de
    # MUSLO_MAX del muslo hacia delante (se vuelven a chocar las cápsulas).
    VEL_MAX = 25.0
    MUSLO_MAX = 60.0
    BAJO_MAX = 50.0
    TOPE_TUMBADO = 25.0

    @staticmethod
    def tumbado(D, head):
        """0 de pie (la cadera a menos de ~53° de la vertical), 1 tumbado (a más de ~80°)."""
        arriba = head['columna'] - head['caderas']
        if arriba.length < 1e-9:
            return 0.0
        return suave(min(1.0, max(0.0, (0.6 - arriba.normalized().z) / 0.4)))

    def simular(self, cuadros, viento=(0, 0, 0), bucle=False, tope=None):
        """cuadros: lista de (D, head) por fotograma. Devuelve lista de dict hueso -> D (mundo)."""
        tope = self.TOPE if tope is None else tope
        n = len(cuadros)
        dt = 1.0 / FPS / self.SUBPASOS
        g = Vector((0, 0, -9.8))
        vto = Vector(viento)

        def objetivo(D, head):
            Dc, hc = D['caderas'], head['caderas']
            return [[hc + Dc @ q for q in cad] for cad in self.local]

        def rumbo(D):
            # guinada de la cadera medida con su eje lateral (estable tumbado o rodando)
            X = D['caderas'] @ Vector((1, 0, 0))
            return math.atan2(X.y, X.x) if (X.x * X.x + X.y * X.y) > 1e-6 else 0.0

        # direcciones de reposo de cada hueso: la tela quiere colgar asi respecto a la gravedad
        # y al rumbo del cuerpo (no a la inclinacion de la pelvis): tumbada cae al suelo, en el
        # arco hacia atras cuelga por delante de las rodillas
        dirs0 = [[(self.local[c][j + 1] - self.local[c][j]).normalized() for j in range(3)] for c in range(8)]
        sk_ = self.sk
        abajo_muslo = {s: (sk_.tail['muslo_' + s] - sk_.head['muslo_' + s]).normalized() for s in 'LR'}
        abajo_pierna = {s: (sk_.tail['pierna_' + s] - sk_.head['pierna_' + s]).normalized() for s in 'LR'}

        def arrastre(D, yaw):
            """ARRASTRE DEL MUSLO: la rodilla que sube empuja su panel delantero, la pierna que va
            atras empuja el trasero y la que se abre, el del costado. Es lo que quita los cruces del
            faldon en la carrera, la patada y al levantarse sin inflar la cadera (el miriñaque).
            Devuelve por cadena la rotacion (en el marco del rumbo) que se aplica a su forma colgante,
            y cuanto deja de ir cosido al talle el primer hueso."""
            Ry_ = Matrix.Rotation(-yaw, 3, 'Z')
            out = []
            for c in range(8):
                s = 'L' if c < 4 else 'R'
                k = c % 4
                t = Ry_ @ (D['muslo_' + s] @ abajo_muslo[s])
                # tumbado boca arriba con las rodillas arriba el muslo apunta al cielo (135 grados) y el
                # panel se ponia de pie como una bandera: se tope a 85 (tendido sobre los muslos)
                fl = max(-70.0, min(85.0, math.degrees(math.atan2(-t.y, -t.z))))
                # la espinilla: en la carrera el talón sube por detrás hasta la corva y atraviesa el panel
                # trasero aunque el muslo vaya delante; cuenta lo que apunte hacia atrás
                ts = Ry_ @ (D['pierna_' + s] @ abajo_pierna[s])
                fs = max(-80.0, min(0.0, math.degrees(math.atan2(-ts.y, -ts.z)) * 0.7))
                if k >= 2:
                    fl = min(fl, fs)
                ab = max(0.0, min(80.0, math.degrees(math.atan2(t.x if s == 'L' else -t.x, -t.z))))
                wf = (0.92, 0.55, 0.0, 0.0)[k]
                wb = (0.0, 0.0, 0.5, 0.8)[k]
                wa = (0.1, 0.25, 0.2, 0.05)[k]      # poco: con 0,6 la guardia (piernas abiertas) hacia campana
                # ZONA MUERTA: al andar o en la guardia el muslo se mueve 20-30 grados y la tela lo aguanta
                # sola; si el arrastre la sigue desde el primer grado, el faldon hace campana (miriñaque).
                # Solo empuja lo que pasa de 12 grados (con 18, andando, la pierna cruzaba la tela).
                fl = math.copysign(max(abs(fl) - 12.0, 0.0), fl)
                # la apertura sólo cuenta pasada la de la guardia (piernas abiertas ~15°): en la guardia el
                # faldón no se abre, cae (la revisión: `wa` seguía activo en la guardia)
                ab = max(ab - 22.0, 0.0)
                giro = -wf * max(fl, 0.0) + wb * max(-fl, 0.0)
                abre = wa * max(ab, 0.0)
                R = Matrix.Rotation(math.radians(abre if s == 'R' else -abre), 3, 'Y') @ Matrix.Rotation(math.radians(giro), 3, 'X')
                suelta = min(1.0, (abs(giro) + abre) / 50.0)
                out.append((R, suelta))
            return out

        # entrada: se parte de la figura de pie en reposo y se llega a la pose del fotograma 0 en
        # 30 fotogramas (y se asienta 20): asi la tela queda del lado correcto de las piernas aunque
        # el clip empiece agachado, tumbado o arqueado
        sk = self.sk
        D0, h0 = cuadros[0]
        entrada = []
        for i in range(30):
            a = suave((i + 1) / 30.0)
            Di = {b: Matrix.Identity(3).to_quaternion().slerp(D0[b].to_quaternion(), a).to_matrix() for b in D0}
            hi = {b: sk.head[b].lerp(h0[b], a) for b in h0}
            entrada.append((Di, hi))
        entrada += [cuadros[0]] * 20
        Dr = {b: Matrix.Identity(3) for b in D0}
        hr = {b: sk.head[b].copy() for b in h0}
        pos = objetivo(Dr, hr)
        pos = [[Vector(q) for q in c] for c in pos]
        prev = [[Vector(q) for q in c] for c in pos]
        vueltas = 3 if bucle else 1
        salida = []
        orden = list(range(n - 1 if bucle else n))
        todos = list(cuadros) + entrada
        base_e = len(cuadros)
        seq = list(range(base_e, base_e + len(entrada))) + (orden * vueltas + [0] if bucle else orden)
        registro_desde = len(seq) - len(orden) - (1 if bucle else 0)
        cuadros = todos
        for idx, f in enumerate(seq):
            # el paso va del fotograma anterior a este: el estado que se guarda es el de 'f'
            fa = seq[idx - 1] if idx > 0 else f
            D, head = cuadros[fa]
            D2, head2 = cuadros[f]
            caps0 = self._capsulas(D, head)
            obj0 = objetivo(D, head)
            obj1 = objetivo(D2, head2)
            caps1 = self._capsulas(D2, head2)
            y0, y1 = rumbo(D), rumbo(D2)
            dy = (y1 - y0 + math.pi) % (2 * math.pi) - math.pi
            arr0, arr1 = arrastre(D, y0), arrastre(D2, y1)
            tb0, tb1 = self.tumbado(D, head), self.tumbado(D2, head2)
            qc0, qc1 = D['caderas'].to_quaternion(), D2['caderas'].to_quaternion()
            for sub in range(self.SUBPASOS):
                a = (sub + 1) / self.SUBPASOS
                Rz_ = Matrix.Rotation(y0 + dy * a, 3, 'Z')
                tb = tb0 + (tb1 - tb0) * a
                Dc_ = qc0.slerp(qc1, a).to_matrix() if tb > 0.0 else None
                caps = [(p0.lerp(p1, a), q0.lerp(q1, a), ra, rb) for (p0, q0, ra, rb), (p1, q1, _, _) in zip(caps0, caps1)]
                arr = arr0 if a < 0.5 else arr1
                for c in range(8):
                    raiz = obj0[c][0].lerp(obj1[c][0], a)
                    pos[c][0] = raiz.copy()
                    prev[c][0] = raiz.copy()
                    Rc, suelta = arr[c]
                    for j in range(1, 4):
                        x, xp = pos[c][j], prev[c][j]
                        vel = (x - xp) / dt
                        dr = Rz_ @ (Rc @ dirs0[c][j - 1])
                        if tb > 0.0:
                            # tumbado: la tela se extiende con la pelvis (sobre las piernas y el suelo), no cuelga
                            dr = (dr * (1.0 - tb) + (Dc_ @ dirs0[c][j - 1]) * tb).normalized()
                        tgt = pos[c][j - 1] + dr * self.largos[c][j - 1]
                        if j == 1:
                            # el primer hueso va cosido al talle (mitad con la pelvis, mitad colgando)
                            # salvo cuando el muslo lo empuja: entonces manda el arrastre
                            w = 0.5 * (1.0 - suelta)
                            tgt = tgt * (1.0 - w) + obj0[c][1].lerp(obj1[c][1], a) * w
                        acc = (tgt - x) * self.K[j - 1] - vel * self.AMORT + (vto - vel) * self.ARRASTRE
                        nuevo = x + (x - xp) + acc * dt * dt
                        prev[c][j] = x
                        pos[c][j] = nuevo
                for it in range(self.ITER):
                    for c in range(8):
                        for j in range(3):
                            a_, b_ = pos[c][j], pos[c][j + 1]
                            dv = b_ - a_
                            L = dv.length
                            if L > 1e-9:
                                corr = dv * ((L - self.largos[c][j]) / L)
                                if j == 0:
                                    pos[c][j + 1] = b_ - corr
                                else:
                                    pos[c][j] = a_ + corr * 0.5
                                    pos[c][j + 1] = b_ - corr * 0.5
                    # vecinos: la tela no se abre mas de un 7 % ni se cruza
                    for ca, cb in self.vecinos:
                        niveles = (1,) if (ca, cb) in self.SOLO_ARRIBA else (1, 2, 3)
                        for j in niveles:
                            pa, pb = pos[ca][j], pos[cb][j]
                            r0 = (self.local[ca][j] - self.local[cb][j]).length
                            dv = pb - pa
                            L = dv.length
                            if L > r0 * self.ESTIRA:
                                corr = dv * ((L - r0 * self.ESTIRA) / L) * 0.5
                                pos[ca][j] = pa + corr
                                pos[cb][j] = pb - corr
                            elif L < r0 * 0.45 and L > 1e-9:
                                corr = dv * ((L - r0 * 0.45) / L) * 0.5
                                pos[ca][j] = pa + corr
                                pos[cb][j] = pb - corr
                    self._topes(pos, objetivo(D2, head2), D2, tope + (self.TOPE_TUMBADO - tope) * tb1 if tb1 > 0 else tope)
                    self._colisiones(pos, caps)
                self._talle(pos, D2, head2)
            if idx >= registro_desde:
                fijo = self._rigido([[q.copy() for q in c] for c in pos])
                self._talle(fijo, D2, head2)
                salida.append(fijo)
        if bucle:
            # cierre exacto: el estado tras la vuelta (salida[-1]) vuelve a ser el del principio;
            # la pequena diferencia se reparte a lo largo de la vuelta
            m = len(salida) - 1
            err = [[salida[-1][c][j] - salida[0][c][j] for j in range(4)] for c in range(8)]
            for f in range(1, m + 1):
                a = f / m
                for c in range(8):
                    for j in range(1, 4):
                        salida[f][c][j] = salida[f][c][j] - err[c][j] * a
        return self._limitar(cuadros[:len(salida)], salida, tope)

    def _limitar(self, cuadros, estados, tope=None):
        """Los topes de después de simular: velocidad (VEL_MAX por fotograma, en el marco de la cadera) y, de pie, el
        panel de delante contra su muslo (MUSLO_MAX) y el bajo de cada panel contra la vertical (`BAJO_MAX`; al correr
        y en los quiebros, con su viento, más). Luego las cápsulas y los largos otra vez."""
        sk = self.sk
        cv = math.cos(math.radians(self.VEL_MAX))
        cm = math.cos(math.radians(self.MUSLO_MAX))
        # ═══ EL BAJO NO VUELA ═══ en el jab de la captura los tramos de abajo de todos los paneles se abrían 65-83° de la
        # vertical cinco fotogramas (la cadera gira y vuelve, y la tela sigue): una gabardina pesa, no es una falda de vuelo
        bajo_max = self.BAJO_MAX if (tope is None or tope < 45) else self.BAJO_MAX + 25.0
        cb = math.cos(math.radians(bajo_max))
        abajo = Vector((0.0, 0.0, -1.0))
        abajo_muslo = {s: (sk.tail['muslo_' + s] - sk.head['muslo_' + s]).normalized() for s in 'LR'}

        def acercar(d, hacia, cmin):
            """d girado hacia `hacia` hasta que su coseno con él sea cmin (si no lo es ya)."""
            c = d.dot(hacia)
            if c >= cmin:
                return d
            perp = d - hacia * c
            if perp.length < 1e-9:
                return hacia.copy()
            perp.normalize()
            return hacia * cmin + perp * math.sqrt(max(0.0, 1.0 - cmin * cmin))
        prev_local = None
        for f, ((D, head), est) in enumerate(zip(cuadros, estados)):
            Dc = D['caderas']
            DcT = Dc.transposed()
            de_pie = self.tumbado(D, head) < 0.5
            adelante = Dc @ Vector((0.0, -1.0, 0.0))
            locales = []
            cambio = False
            for c in range(8):
                s = 'L' if c < 4 else 'R'
                muslo = (D['muslo_' + s] @ abajo_muslo[s]).normalized()
                fila = []
                for j in range(3):
                    L = self.largos[c][j]
                    d = est[c][j + 1] - est[c][j]
                    d = d.normalized() if d.length > 1e-9 else Dc @ Vector((0.0, 0.0, -1.0))
                    nuevo = d
                    if de_pie and c % 4 in (0, 1) and d.dot(adelante) > muslo.dot(adelante):
                        nuevo = acercar(nuevo, muslo, cm)
                    if de_pie and j >= 1:
                        nuevo = acercar(nuevo, abajo, cb)
                    dl = DcT @ nuevo
                    if prev_local is not None:
                        # sólo lo que se ALEJA de la forma de reposo va con tope de velocidad: volver a colgar, no
                        reposo = (self.local[c][j + 1] - self.local[c][j]).normalized()
                        if dl.dot(reposo) < prev_local[c][j].dot(reposo):
                            dl = acercar(dl, prev_local[c][j], cv)
                            nuevo = Dc @ dl
                    fila.append(dl)
                    if (nuevo - d).length > 1e-6:
                        cambio = True
                    est[c][j + 1] = est[c][j] + nuevo * L
                locales.append(fila)
            if cambio:
                self._colisiones(est, self._capsulas(D, head))
                self._rigido(est)
                # y el talle otra vez (lo último que hacía la simulación: sin él, las juntas que el tope o las cápsulas
                # movían quedaban por encima de la cadera en 388 fotogramas de la batería)
                self._talle(est, D, head)
                locales = []
                for c in range(8):
                    fila = []
                    for j in range(3):
                        d = est[c][j + 1] - est[c][j]
                        fila.append((DcT @ d).normalized() if d.length > 1e-9 else Vector((0.0, 0.0, -1.0)))
                    locales.append(fila)
            prev_local = locales
        return estados

    def _vecinas(self, c):
        """Cadenas a cada lado de la cadena c (misma mitad; la trasera cruza a la otra mitad)."""
        lado, k = divmod(c, 4)
        prev = c - 1 if k > 0 else None
        nxt = c + 1 if k < 3 else (3 if lado == 1 else 7)
        return prev, nxt

    def _tangente(self, pts, c, j):
        prev, nxt = self._vecinas(c)
        mid = lambda cc: (pts[cc][j] + pts[cc][j + 1]) * 0.5
        a = mid(prev) if prev is not None else mid(c)
        return mid(nxt) - a

    def rotaciones(self, cuadros, estados):
        """Posiciones de particulas -> deltas de rotacion de mundo por hueso del faldon.
        Cada hueso toma su direccion de su cadena y su giro (el eje ancho de la tela) de las
        cadenas vecinas: asi el panel entre cadenas sigue a la tela y no se retuerce hacia el
        suelo cuando el faldon cae tumbado."""
        sk = self.sk
        hc0 = sk.head['caderas']
        rest = [[hc0 + q for q in cad] for cad in self.local]
        marcos0 = {}
        for c, cad in enumerate(self.cadenas):
            for j, b in enumerate(cad):
                Y = (rest[c][j + 1] - rest[c][j]).normalized()
                X = self._tangente(rest, c, j)
                marcos0[b] = _marco(X, Y)
        out = []
        for (D, head), est in zip(cuadros, estados):
            Df = {}
            for c, cad in enumerate(self.cadenas):
                for j, b in enumerate(cad):
                    Y = est[c][j + 1] - est[c][j]
                    if Y.length < 1e-9:
                        Y = D['caderas'] @ (rest[c][j + 1] - rest[c][j])
                    Y.normalize()
                    X = self._tangente(est, c, j)
                    if (X - Y * X.dot(Y)).length < 1e-6:
                        X = D['caderas'] @ marcos0[b].col[0]
                    Df[b] = _marco(X, Y) @ marcos0[b].transposed()
            out.append(Df)
        return out


def radios_colision(nubes, sk):
    """Radios de las capsulas (m) medidos en las mallas: percentil 70 de la distancia al hueso en
    la franja alta (10-30 %) y baja (70-90 %) de cada hueso. Con el 90 (y 2 cm de margen) el pliegue del
    pantalón contaba como pierna y el faldón se apartaba en campana ya en reposo; con el 85 volvía la
    campana en la guardia (0,63 × 0,69 contra 0,46 × 0,35 sin posar: se probó). El grosor del faldón va
    hacia FUERA (`accesorios.faldon`), así que la cadena es la cara de dentro y el margen de 8 mm es
    holgura de verdad."""
    e = sk.esc
    base = {'muslo': (0.085 * e, 0.062 * e), 'pierna': (0.058 * e, 0.048 * e), 'pie': (0.05 * e, 0.045 * e),
            'antebrazo': (0.05 * e, 0.042 * e), 'mano': (0.035 * e, 0.035 * e), 'pelvis': 0.11 * e, 'torso': 0.14 * e}
    if not nubes.ok:
        return base
    orden = {n: k for k, n in enumerate(sk.orden)}
    dom = nubes.I[:, 0]
    out = dict(base)
    for key in ('muslo', 'pierna', 'pie', 'antebrazo', 'mano'):
        rs = []
        for s in 'LR':
            n = key + '_' + s
            sel = (dom == orden[n]) & nubes.cuerpo
            if sel.sum() < 20:
                continue
            a = np.array(sk.head[n])
            b = np.array(sk.tail[n])
            ab = b - a
            P = nubes.P[sel]
            t = np.clip((P - a) @ ab / (ab @ ab), 0, 1)
            d = np.linalg.norm(P - (a + t[:, None] * ab), axis=1)
            ra, rb = [], []
            for lo, hi, dest in ((0.1, 0.3, ra), (0.7, 0.9, rb)):
                m = (t > lo) & (t < hi)
                dest.append(np.percentile(d[m], 70) if m.sum() > 5 else np.percentile(d, 70))
            rs.append((ra[0], rb[0]))
        if rs:
            out[key] = (float(np.mean([r[0] for r in rs])), float(np.mean([r[1] for r in rs])))
    return out


# ------------------------------------------------------------------ horneado
def _cont(q, prev):
    if prev is not None and q.dot(prev) < 0:
        return Quaternion((-q.w, -q.x, -q.y, -q.z))
    return q


def _en_contacto(c, fr):
    return any(a <= fr <= b for a, b in c.get('contacto', []))


def _suelo(sk, nubes, p, c, fr, log=None):
    """Ajusta la pose para que ninguna parte de la malla atraviese el suelo (y, en los tramos de
    contacto, para que toque). Devuelve (pose, resultado de resolver, zmin)."""
    res = resolver(sk, p)
    if not nubes.ok:
        return p, res, 0.0
    e = sk.esc
    zmin = 0.0
    for it in range(8):
        D, head = res[3], res[4]
        V = nubes.deformar(D, head)
        # ═══ EL LOD2 CUENTA, PERO MENOS (segunda pasada) ═══ El LOD2 se aparta hasta 3 cm del LOD0: con su
        # misma regla el LOD0 flotaba 3 cm en los tramos tumbados. Para no hundirse, el LOD2 cuenta 3 cm más
        # alto (lo que tolera la batería de three); para tocar el suelo en los tramos de contacto, sólo el
        # LOD0.
        l2 = nubes.lod2_sel
        z0 = np.where(l2, np.inf, V[:, 2])
        z = np.where(l2, V[:, 2] + 0.03, V[:, 2])
        cambio = False
        for s in 'LR':
            m = nubes.pie_sel[s]
            if m.any() and p['ikp_' + s] > 0.95:
                zp = z[m].min()
                if zp < -0.0015:
                    x = p['pie_' + s]
                    p['pie_' + s] = (x[0], x[1], x[2] - zp / e + 0.0005)
                    cambio = True
        # las manos con IK se levantan ellas (como los pies); subir la cadera no las sacaria del suelo
        otro = nubes.otro_sel.copy()
        for s in 'LR':
            m = nubes.mano_sel[s]
            if m.any() and p['ikb_' + s] > 0.95:
                otro &= ~m
                zm = z[m].min()
                if zm < -0.0015:
                    x = p['mano_' + s]
                    p['mano_' + s] = (x[0], x[1], x[2] - zm / e + 0.0005)
                    cambio = True
        zo = z[otro].min()
        zpies = min([z[nubes.pie_sel[s]].min() for s in 'LR'])
        zall = min(zo, zpies)
        zc0 = min(z0[otro].min(), min(z0[nubes.pie_sel[s]].min() for s in 'LR'))
        piesfk = p['ikp_L'] < 0.95 or p['ikp_R'] < 0.95
        if zo < -0.0015 or (piesfk and zall < -0.0015):
            dz = -(zo if not piesfk else zall)
            x = p['cad']
            p['cad'] = (x[0], x[1], x[2] + dz / e + 0.0005)
            cambio = True
        elif _en_contacto(c, fr) and zc0 > 0.003 and zall > 0.003:
            x = p['cad']
            p['cad'] = (x[0], x[1], x[2] - (min(zc0, zall) - 0.0005) / e)
            cambio = True
        elif '_fk' in p and not piesfk and _en_contacto(c, fr) and z0[otro].min() > 0.003:
            # la captura (captura.py): los pies van con IK a su sitio y bajar la cadera no los mete en el
            # suelo; si en un tramo tumbado flota el cuerpo con los pies apoyados, baja el cuerpo (con las piernas
            # en FK, las de la forja de rodillas, no: los pies bajarían con él)
            x = p['cad']
            p['cad'] = (x[0], x[1], x[2] - (float(z0[otro].min()) - 0.0005) / e)
            cambio = True
        zmin = zc0
        if not cambio:
            break
        res = resolver(sk, p)
    return p, res, zmin


def _suavizar_serie(X, sigma=2.0):
    n = len(X)
    if n < 3:
        return X.copy()
    r = int(3 * sigma)
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    k /= k.sum()
    pad = np.concatenate([np.repeat(X[:1], r, 0), X, np.repeat(X[-1:], r, 0)])
    out = np.stack([np.convolve(pad[:, j], k, mode='valid') for j in range(X.shape[1])], 1)
    return out


FALDON_FINAL = {}


SK = None      # el esqueleto que se está horneando (lo lee captura.py: sus recetas dependen de él)


def hornear(arm, sk, nombre, nubes, faldon, log=print):
    global VIAJE, SK
    c = CLIPS[nombre]
    n = c['frames']
    e = sk.esc
    VIAJE = 1.0 / e
    SK = sk
    poses = []
    resultados = []
    zmins = []
    desp = Vector((0, 0, 0))
    V_prev, cont_prev = None, None
    for fr in range(n + 1):
        p = dict(c['fn'](fr if not c['bucle'] else fr % n))
        if c.get('rodadura') and nubes.ok:
            p['desp'] = tuple(desp / e)
        p, res, zmin = _suelo(sk, nubes, p, c, fr)
        if c.get('rodadura') and nubes.ok:
            # rodar sin deslizar: lo que se mueve en horizontal lo que ya tocaba el suelo, lo avanza el cuerpo
            V = nubes.deformar(res[3], res[4])
            cont = V[:, 2] < 0.012
            if V_prev is not None:
                comun = cont & cont_prev & nubes.otro_sel
                if comun.sum() >= 3:
                    d = (V[comun] - V_prev[comun]).mean(0)
                    desp = desp - Vector((d[0], d[1], 0.0))
                    p['desp'] = tuple(desp / e)
                    p, res, zmin = _suelo(sk, nubes, p, c, fr)
                    V = nubes.deformar(res[3], res[4])
                    cont = V[:, 2] < 0.012
            V_prev, cont_prev = V, cont
        poses.append(p)
        resultados.append(res)
        zmins.append(zmin)
    # raiz: sigue a la proyeccion de la cadera en el suelo (suavizada, empieza en 0)
    raiz = np.zeros((n + 1, 3))
    if c.get('raiz_lineal'):
        # ═══ LA RAÍZ DEL JUEGO (segunda pasada) ═══ El quiebro, la Entrada y la acometida los mueve el
        # juego en línea recta y a velocidad fija (`prediccion.desplazar`: la distancia repartida por
        # igual entre sus tics). Si la raíz del clip siguiera a la cadera, el cliente (que la quita y
        # mueve el cuerpo a su ritmo) haría patinar cada pie apoyado. La raíz es la del juego, y el
        # cuerpo se escribe en el mundo sobre ella: un pie clavado en el clip, clavado en la calle.
        hasta, d = c['raiz_lineal']
        for fr in range(n + 1):
            a = min(1.0, fr / float(hasta))
            raiz[fr, 0] = d[0] * VIAJE * a
            raiz[fr, 1] = d[1] * VIAJE * a
        for fr in range(n + 1):
            poses[fr]['raiz'] = tuple(raiz[fr])
            resultados[fr] = resolver(sk, poses[fr])
    elif c.get('raiz'):
        H = np.array([[r[4]['caderas'].x, r[4]['caderas'].y] for r in resultados])
        Hs = _suavizar_serie(H, 2.0)
        Hs[-1] = H[-1]
        Hs[0] = H[0]
        raiz[:, :2] = (Hs - Hs[0]) / e
        for fr in range(n + 1):
            poses[fr]['raiz'] = tuple(raiz[fr])
            resultados[fr] = resolver(sk, poses[fr])
    # faldon
    cuadros = [(r[3], r[4]) for r in resultados]
    if c.get('faldon_de') and c['faldon_de'] in FALDON_FINAL:
        # ═══ EL FALDÓN HEREDADO ═══ Un bucle tumbado (desconectado) no puede simular su tela desde de
        # pie: la entrada la cruzaba con las piernas y quedaba así todo el bucle. Hereda la tela del
        # último fotograma del clip que lo trae (derribado), que es la misma pose.
        estados = [[[q.copy() for q in cad] for cad in FALDON_FINAL[c['faldon_de']]] for _ in cuadros]
    else:
        estados = faldon.simular(cuadros, viento=c.get('viento', (0, 0, 0)), bucle=c['bucle'], tope=c.get('tope_faldon'))
    if c.get('bucle_desde') and not c['bucle']:
        # ═══ LA COLA EN BUCLE ═══ (la carga del rayo: entra una vez y desde `bucle_desde` se repite) El cuerpo del
        # último fotograma es el de `bucle_desde`, pero la tela se simuló de corrido: se cierra como un bucle, con la
        # diferencia repartida a lo largo de la cola, para que al volver del último a `bucle_desde` no salte.
        L0 = int(c['bucle_desde'])
        m = n - L0
        if 0 <= L0 < n:
            err = [[estados[n][k][j] - estados[L0][k][j] for j in range(len(estados[n][k]))] for k in range(len(estados[n]))]
            for fr in range(L0 + 1, n + 1):
                a = (fr - L0) / float(m)
                for k in range(len(err)):
                    for j in range(1, len(err[k])):
                        estados[fr][k][j] = estados[fr][k][j] - err[k][j] * a
    Dfal = faldon.rotaciones(cuadros, estados)
    if nubes.ok and nubes.falda_ok:
        corregidos = 0
        for fr in range(n + 1):
            est = estados[fr]
            for it in range(9):
                res = resolver(sk, poses[fr], falda=Dfal[fr])
                Vf = nubes.deformar_falda(res[3], res[4])
                bajo = Vf[:, 2] < 0.006
                if not bajo.any():
                    break
                subir = {}
                for v in np.nonzero(bajo)[0]:
                    c_, j_ = int(nubes.cad_f[v]), int(nubes.hue_f[v])
                    if c_ < 0:
                        continue
                    need = 0.011 - Vf[v, 2]
                    subir[(c_, j_)] = max(subir.get((c_, j_), 0.0), need)
                for (c_, j_), dz in subir.items():
                    for jj in range(j_, 4):
                        est[c_][jj] = est[c_][jj] + Vector((0, 0, dz * (1.0 if jj == j_ else 0.6)))
                faldon._rigido(est)
                Dfal[fr] = faldon.rotaciones([cuadros[fr]], [est])[0]
                corregidos += 1
        if corregidos:
            log('    %s: %d correcciones de suelo del faldon' % (nombre, corregidos))
    for fr in range(n + 1):
        resultados[fr] = resolver(sk, poses[fr], falda=Dfal[fr])
    FALDON_FINAL[nombre] = [[q.copy() for q in cad] for cad in estados[-1]]
    # a curvas
    act = bpy.data.actions.new(nombre)
    act.use_fake_user = True
    datos = {b: [] for b in sk.orden}
    locs, locs_r = [], []
    prev = {}
    for fr in range(n + 1):
        rot, loc, loc_r = resultados[fr][:3]
        for b, q in rot.items():
            q = _cont(q, prev.get(b))
            prev[b] = q
            datos[b].append(q)
        locs.append(loc)
        locs_r.append(loc_r)
    for b in sk.orden:
        path = 'pose.bones["%s"].rotation_quaternion' % b
        for i in range(4):
            fc = act.fcurves.new(path, index=i, action_group=b)
            fc.keyframe_points.add(n + 1)
            co = []
            for fr, q in enumerate(datos[b]):
                co += [fr, q[i]]
            fc.keyframe_points.foreach_set('co', co)
            for kp in fc.keyframe_points:
                kp.interpolation = 'LINEAR'
            fc.update()
    for hueso, serie in (('caderas', locs), ('raiz', locs_r)):
        for i in range(3):
            fc = act.fcurves.new('pose.bones["%s"].location' % hueso, index=i, action_group=hueso)
            fc.keyframe_points.add(n + 1)
            co = []
            for fr, l in enumerate(serie):
                co += [fr, l[i]]
            fc.keyframe_points.foreach_set('co', co)
            for kp in fc.keyframe_points:
                kp.interpolation = 'LINEAR'
            fc.update()
    act.frame_range = (0, n)
    info = dict(zmin_malla=round(float(min(zmins)), 4) if zmins else None)
    if c.get('efector') and c.get('impacto'):
        # ═══ EL ALCANCE ═══ Dónde llega el golpe: la distancia horizontal, hacia delante, de la raíz a
        # los nudillos (o a la punta del pie) en el fotograma de impacto, y lo que ha viajado el puño
        # desde la guardia. El cliente lo necesita para colocar el blanco y el parón (reparto.json →
        # `alcanceM`); la batería exige un recorrido mínimo por golpe.
        b = c['efector']
        fi = c['impacto'][0]

        def punta(fr):
            D_, h_ = resultados[fr][3], resultados[fr][4]
            return h_[b] + D_[b] @ (sk.tail[b] - sk.head[b])
        pi_, p0 = punta(fi), punta(0)
        r_ = Vector((raiz[fi][0] * e, raiz[fi][1] * e, 0.0))
        info['alcance_m'] = round(float(-(pi_.y - r_.y)), 3)
        info['altura_impacto_m'] = round(float(pi_.z), 3)
        rel0 = p0 - Vector((raiz[0][0] * e, raiz[0][1] * e, 0.0))
        reli = pi_ - r_
        info['recorrido_m'] = round(float((reli - rel0).length), 3)
    if c.get('raiz'):
        fin = raiz[-1] * e
        info['raiz_final_blender'] = [round(float(fin[0]), 3), round(float(fin[1]), 3)]
        info['raiz_final_gltf'] = [round(float(fin[0]), 3), 0.0, round(float(-fin[1]), 3)]
    return act, info


def hornear_todo(arm, nubes=(), log=print, clips=None):
    sc = bpy.context.scene
    sc.render.fps = FPS
    sc.render.fps_base = 1.0
    sk = Esqueleto(arm)
    nb = Nubes(list(nubes), sk)
    # las capsulas del faldon se miden en la PRIMERA figura (la de la gabardina): medidas en todas, el
    # Celador ancho y el abrigo Mole engordaban el muslo a 13 cm y en la guardia el faldon hacia campana
    radios = radios_colision(Nubes(list(nubes)[:1], sk), sk) if nubes else radios_colision(nb, sk)
    log('nubes: %d vertices, radios de colision %s' % (len(nb.P) if nb.ok else 0,
                                                       {k: (tuple(round(x, 3) for x in v) if isinstance(v, tuple) else round(v, 3)) for k, v in radios.items()}))
    fal = Faldon(sk, radios)
    log('faldon: %d puntos que ya tocaban una capsula sin posar (hasta %.1f cm): no empujan eso' % (
        len(fal.tolera), 100 * max(fal.tolera.values() or [0.0])))
    if arm.animation_data is None:
        arm.animation_data_create()
    info = {}
    lista = clips.split('+') if clips else ORDEN
    for nombre in lista:
        act, extra = hornear(arm, sk, nombre, nb, fal, log)
        tr = arm.animation_data.nla_tracks.new()
        tr.name = nombre
        tr.strips.new(nombre, 0, act)
        tr.mute = True
        c = CLIPS[nombre]
        d = dict(fotogramas=c['frames'], segundos=round(c['frames'] / FPS, 3), bucle=c['bucle'], descripcion=c['info'])
        if 'zancada' in c:
            d['metros_por_ciclo'] = round(c['zancada'] * sk.esc, 3)
            d['velocidad_m_s'] = round(c['velocidad'] * sk.esc, 3)
        if 'impacto' in c:
            d['impacto_fotogramas'] = list(c['impacto'])
        if 'disparos' in c:
            d['disparos_ms'] = list(c['disparos'])
        if 'intocable' in c:
            d['intocable_fotogramas'] = list(c['intocable'])
        if 'intocable_ms' in c:
            d['intocable_ms'] = list(c['intocable_ms'])
        for k in ('efector', 'levanta_desde', 'cae_en', 'tope_faldon', 'bucle_desde', 'entrada', 'salida'):
            if k in c:
                d[k] = c[k]
        d['fuente'] = c.get('fuente', 'forja')
        if c.get('contacto'):
            d['contacto_suelo_fotogramas'] = [list(x) for x in c['contacto']]
        if c.get('vuelo'):
            d['vuelo_fotogramas'] = [list(x) for x in c['vuelo']]
        d.update(extra)
        d['raiz_animada'] = bool(c.get('raiz'))
        info[nombre] = d
        log('  %-24s %3d fotogramas  zmin malla %+.4f %s' % (nombre, c['frames'], extra.get('zmin_malla') or 0.0,
                                                              extra.get('raiz_final_gltf', '')))
    arm.animation_data.action = None
    log('horneadas %d animaciones' % len(info))
    return info


def cargar_acciones(arm, blend):
    with bpy.data.libraries.load(blend, link=False) as (src, dst):
        dst.actions = list(src.actions)
    for a in bpy.data.actions:
        a.use_fake_user = True
    if arm.animation_data is None:
        arm.animation_data_create()


def poner_accion(arm, nombre, fr):
    act = bpy.data.actions[nombre]
    arm.animation_data.action = act
    bpy.context.scene.frame_set(int(fr))


# El vocabulario definitivo (un clip por Gesto de cuerpos.ts) vive en clips.py, que usa todo lo de
# arriba y sustituye ORDEN.
import clips as _clips  # noqa: E402

ORDEN = _clips.ORDEN
