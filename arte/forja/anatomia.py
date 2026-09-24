"""Esqueleto, cuerpo (piel), complexiones y el vestuario de todo el reparto (ver reparto.py).

Espacio Blender: X = izquierda del personaje, Y = atras (mira a -Y), Z = arriba.
Al exportar a glTF (Y arriba) el personaje mira a +Z.

Todo se modela en coordenadas de PLANTILLA (hombre de 1,80 m). La mujer tiene sus
propias articulaciones (hombros mas estrechos, caderas mas anchas, brazos y pies mas
cortos) y al final se escala entera por ESC = 0,94: su esqueleto es propio, no un
hombre escalado. configurar(sexo) fija las articulaciones antes de construir nada.
"""
import math
import numpy as np
from sdf import (Sphere, Ellipsoid, RoundCone, RoundBox, Plane, Shell, Source, Group, Escalado,
                 Compuesto, Interseccion, CascaronEsfera, ell_axis, rot_euler, mirror_x, _v, _norm)

APOSE = np.radians(55.0)


def d_brazo(s=1):
    return _v((s * np.cos(APOSE), 0.0, -np.sin(APOSE)))


def u_brazo(s=1):
    return _v((s * np.sin(APOSE), 0.0, np.cos(APOSE)))


# ------------------------------------------------------------------ proporciones
SEXO = 'm'
ESC = 1.0            # escala final de la figura (la plantilla mide 1,80 m)
HOMBRO = CODO = MUNECA = NUDILLOS = CADERA = RODILLA = TOBILLO = BOLA = PUNTA = None
L_BRAZO = L_ANTEBRAZO = None
L_MANO, L_DEDO1, L_DEDO2 = 0.095, 0.045, 0.05
KMANO = 1.0          # escala de la mano
KPIE = 1.0           # escala del pie (en largo)
E_CABEZA = 0.94      # escala de la cabeza respecto al diseno original
CABEZA_C = _v((0, 0.016, 1.676))


def configurar(sexo):
    """Fija las articulaciones de la plantilla para 'm' o 'f'."""
    global SEXO, ESC, HOMBRO, CODO, MUNECA, NUDILLOS, CADERA, RODILLA, TOBILLO, BOLA, PUNTA
    global L_BRAZO, L_ANTEBRAZO, KMANO, KPIE, E_CABEZA
    SEXO = sexo
    f = sexo == 'f'
    ESC = 0.94 if f else 1.0
    HOMBRO = _v((0.150, 0.022, 1.443)) if f else _v((0.161, 0.022, 1.443))
    L_BRAZO, L_ANTEBRAZO = (0.288, 0.243) if f else (0.295, 0.255)
    KMANO = 0.92 if f else 1.0
    KPIE = 0.93 if f else 1.0
    E_CABEZA = 0.955 if f else 0.925
    CODO = HOMBRO + L_BRAZO * d_brazo()
    MUNECA = CODO + L_ANTEBRAZO * d_brazo()
    NUDILLOS = MUNECA + L_MANO * KMANO * d_brazo()
    CADERA = _v((0.095, 0.005, 0.935)) if f else _v((0.092, 0.005, 0.935))
    RODILLA = _v((CADERA[0], -0.012, 0.505))
    TOBILLO = _v((CADERA[0], 0.028, 0.092))
    BOLA = _v((CADERA[0], 0.028 - 0.13 * KPIE, 0.036))
    PUNTA = _v((CADERA[0], 0.028 - 0.196 * KPIE, 0.03))


configurar('m')


# ------------------------------------------------------------------ faldon (gabardina)
# Cadenas de huesos del faldon: 4 por lado (0 = delantera ... 3 = trasera), 3 huesos cada una.
# Angulo medido desde el frente (-Y) hacia la izquierda (+X).
#
# ═══ HASTA LA RODILLA, Y SIN MIRIÑAQUE ═══
# El diseño pide la gabardina hasta la rodilla (el prototipo llegaba a media pantorrilla: más tela
# que cruzar con las espinillas). Las cadenas acaban a 0,49 m. El perfil ya no abulta en la cadera:
# la holgura que dejaba sitio a los muslos (4,5 cm por lado en los 10 cm bajo el talle, que de frente
# se leía como un miriñaque) la sustituye el faldón que SIGUE al muslo en el horneado
# (`animacion.Faldon`, «arrastre del muslo») y las aberturas laterales, que separan el panel
# delantero del trasero: el muslo empuja su panel y no estira la tela de alrededor.
#
# ═══ BAJO RECTO (segunda pasada) ═══ La revisión midió el bajo en reposo a 0,63 × 0,50 m contra
# 0,37 de cadera, y 17 cm de polisón detrás de las nalgas en la guardia: la malla ya salía con 16 cm
# de holgura de fondo (el semieje trasero crecía a 0,175) y un vuelo de 4,4 cm hacia el bajo, y encima
# la simulación la abría en campana. Una gabardina cae RECTA desde la cadera: el fondo trasero se
# queda a 2,5 cm de los glúteos (0,15) y el vuelo del bajo, a un centímetro y medio. Lo que antes
# ganaba la campana, lo gana la abertura: el muslo que sube separa su panel, no ensancha la prenda.
ANG_FALDON = (24.0, 70.0, 116.0, 160.0)
Z_FALDON = (1.0, 0.84, 0.67, 0.49)      # alturas de las juntas de cada cadena (plantilla)


def perfil_faldon(sexo, th, z):
    """Radio (m, plantilla) del faldon a la altura z y angulo th (rad, desde el frente hacia +X).
    Elipse centrada en y=0.015 que se abre poco hacia el bajo (corte en A, no campana). Se comprueba
    al construir que nunca toca el cuerpo en reposo."""
    f = sexo == 'f'
    th = np.asarray(th, float)
    zh = 0.49 if f else 0.47
    # superelipse (n=2,5) que arriba coincide con el tronco de la gabardina (algo por dentro)
    # y baja recta sobre caderas y gluteos; por detras (cos<0) otro semieje
    c = np.clip((1.0 - z) / 0.12, 0.0, 1.0)
    c = c * c * (3 - 2 * c)
    # arriba: 3-6 mm por fuera del tronco de la gabardina (costura de talle); el borde
    # inferior del tronco queda escondido debajo
    if f:
        ax = 0.178 + 0.036 * c
        ayf = 0.122 + 0.030 * c
        ayb = 0.127 + 0.028 * c
        vf, vl, vb = 0.012, 0.016, 0.02
    else:
        ax = 0.172 + 0.034 * c
        ayf = 0.128 + 0.026 * c
        ayb = 0.127 + 0.023 * c
        vf, vl, vb = 0.012, 0.016, 0.02
    arriba = np.clip(z - 1.0, 0.0, None)
    ax = ax - 0.40 * arriba
    ayf = ayf - 0.30 * arriba
    ayb = ayb - 0.43 * arriba
    ay = np.where(np.cos(th) >= 0, ayf, ayb)
    n = 2.5
    r = (np.abs(np.sin(th) / ax) ** n + np.abs(np.cos(th) / ay) ** n) ** (-1.0 / n)
    t = np.clip((0.86 - z) / (0.86 - zh), 0.0, 1.2)
    lado = np.abs(np.sin(th))
    detras = np.clip(-np.cos(th), 0, 1)
    frente = np.clip(np.cos(th), 0, 1)
    vuelo = (vf * frente + vl * lado + vb * detras) / np.maximum(frente + lado + detras, 1e-6)
    # pliegues: ondulacion de 11 lobulos por vuelta que crece hacia el bajo (hasta +-0,9 cm)
    pliegue = 0.006 * np.clip(t, 0.0, 1.0) ** 1.5 * np.sin(11.0 * th + 0.6)
    return r + vuelo * t ** 1.3 + pliegue


def punto_faldon(sexo, th, z, yc=0.015):
    r = perfil_faldon(sexo, th, z)
    return _v((r * np.sin(th), yc - r * np.cos(th), z))


# nombre: (cabeza, cola, padre, eje X deseado en reposo, deforma)
def huesos(sexo=None):
    if sexo is not None and sexo != SEXO:
        configurar(sexo)
    X = (1, 0, 0)
    B = [
        ('raiz', (0, 0, 0), (0, 0, 0.18), None, X, False),
        ('caderas', (0, 0.005, 0.975), (0, 0.012, 1.08), 'raiz', X, True),
        ('columna', (0, 0.012, 1.08), (0, 0.018, 1.19), 'caderas', X, True),
        ('columna1', (0, 0.018, 1.19), (0, 0.02, 1.30), 'columna', X, True),
        ('pecho', (0, 0.02, 1.30), (0, 0.025, 1.475), 'columna1', X, True),
        ('cuello', (0, 0.025, 1.475), (0, 0.018, 1.59), 'pecho', X, True),
        ('cabeza', (0, 0.018, 1.59), (0, 0.018, 1.79), 'cuello', X, True),
    ]
    hk = KMANO
    for s, suf in ((1, 'L'), (-1, 'R')):
        m = (lambda p: _v(p) * _v((s, 1, 1)))
        d, u, Y = d_brazo(), u_brazo(), _v((0, 1, 0))
        uX = (np.sin(APOSE), 0.0, s * np.cos(APOSE))
        W = MUNECA
        base_pulgar = W + (0.024 * d - 0.024 * Y - 0.010 * u) * hk
        punta_pulgar = W + (0.086 * d - 0.043 * Y - 0.021 * u) * hk
        palma = W + (0.074 * d - 0.028 * u) * hk          # hueco del puno cerrado
        B += [
            ('hombro_' + suf, m((0.022, 0.005, 1.45)), m(HOMBRO), 'pecho', (0, 0, s), True),
            ('brazo_' + suf, m(HOMBRO), m(CODO), 'hombro_' + suf, uX, True),
            ('antebrazo_' + suf, m(CODO), m(MUNECA), 'brazo_' + suf, uX, True),
            ('giro_' + suf, m(CODO + 0.5 * (MUNECA - CODO)), m(MUNECA), 'antebrazo_' + suf, uX, True),
            ('mano_' + suf, m(MUNECA), m(NUDILLOS), 'antebrazo_' + suf, uX, True),
            ('dedos_' + suf, m(NUDILLOS), m(NUDILLOS + L_DEDO1 * hk * d), 'mano_' + suf, (0, s, 0), True),
            ('dedos2_' + suf, m(NUDILLOS + L_DEDO1 * hk * d), m(NUDILLOS + (L_DEDO1 + L_DEDO2) * hk * d),
             'dedos_' + suf, (0, s, 0), True),
            ('pulgar_' + suf, m(base_pulgar), m(punta_pulgar), 'mano_' + suf, tuple(m(u)), True),
            ('agarre_' + suf, m(palma), m(palma - 0.06 * Y), 'mano_' + suf, tuple(m(d)), False),
            ('muslo_' + suf, m(CADERA), m(RODILLA), 'caderas', X, True),
            ('pierna_' + suf, m(RODILLA), m(TOBILLO), 'muslo_' + suf, X, True),
            ('pie_' + suf, m(TOBILLO), m(BOLA), 'pierna_' + suf, X, True),
            ('punta_' + suf, m(BOLA), m(PUNTA), 'pie_' + suf, X, True),
        ]
        for k, ang in enumerate(ANG_FALDON):
            th = math.radians(ang) * s
            padre = 'caderas'
            for j in range(3):
                a = punto_faldon(SEXO, th, Z_FALDON[j])
                b = punto_faldon(SEXO, th, Z_FALDON[j + 1])
                nombre = 'faldon%d%d_%s' % (k, j + 1, suf)
                # eje X tangente al contorno (horizontal): la bisagra de "abrirse hacia fuera"
                tang = (math.cos(th), math.sin(th), 0.0)
                B.append((nombre, tuple(a), tuple(b), padre, tang, True))
                padre = nombre
    if ESC != 1.0:
        B = [(n, tuple(_v(h) * ESC), tuple(_v(t) * ESC), p, x, dfm) for n, h, t, p, x, dfm in B]
    return B


def huesos_faldon():
    return ['faldon%d%d_%s' % (k, j, s) for s in 'LR' for k in range(4) for j in (1, 2, 3)]


# ------------------------------------------------------------------ utilidades
def sym(prims):
    """Anade el espejo (lado R) de cada primitiva con centro en x > 0."""
    out = []
    for p in prims:
        out.append(p)
        lo, hi = p.bbox()
        if (lo[0] + hi[0]) * 0.5 > 1e-4:
            q = p.mirrored()
            q.region = p.region.replace('_L', '_R')
            out.append(q)
    return out


def tag(p, r):
    return p.tag(r)


def inflar(prims, regiones, delta, excluir=()):
    out = []
    for p in prims:
        base = p.region.replace('_L', '').replace('_R', '')
        if (base in regiones or p.region in regiones) and p.region not in excluir:
            out.append(p.inflate(delta))
    return out


def solo_lado(prims, s):
    suf = '_L' if s > 0 else '_R'
    return [p for p in prims if p.region.endswith(suf)]


def zmayor(z):
    return Plane((0, 0, -1), (0, 0, z))


def zmenor(z):
    return Plane((0, 0, 1), (0, 0, z))


def corte_manga(s, atras=0.012):
    d = d_brazo(s)
    w = MUNECA * _v((s, 1, 1))
    return Plane(d, w - atras * d)


# ------------------------------------------------------------------ cuerpo
class Cuerpo:
    """Primitivas de piel etiquetadas por region + datos de la cara."""

    def __init__(self, sexo='m', complexion='normal'):
        f = sexo == 'f'
        self.sexo = sexo
        self.complexion = complexion
        # anchura de las prendas del tronco respecto a la plantilla (torso_prenda la usa)
        self.k_ancho = {'ancho': 1.27, 'enjuto': 0.84}.get(complexion, 1.0)
        d, u, Y = d_brazo(), u_brazo(), _v((0, 1, 0))
        S, E, W = HOMBRO, CODO, MUNECA
        sx = HOMBRO[0]
        tr = []
        # --- tronco
        if not f:
            tr += [
                tag(Ellipsoid((0, 0.015, 0.955), (0.150, 0.102, 0.115)), 'pelvis'),
                tag(Ellipsoid((0, 0.008, 1.04), (0.134, 0.09, 0.10)), 'abdomen'),
                tag(Ellipsoid((0, 0.012, 1.135), (0.134, 0.088, 0.09)), 'abdomen'),
                tag(Ellipsoid((0, 0.016, 1.29), (0.140, 0.1, 0.165)), 'torax'),
                tag(Ellipsoid((0.062, -0.04, 1.325), (0.076, 0.041, 0.058), rot_euler(0, 0, -12)), 'pecho_L'),
                tag(Ellipsoid((0.100, 0.03, 1.27), (0.066, 0.068, 0.125)), 'espalda_L'),
                tag(Ellipsoid((0.068, 0.064, 1.345), (0.076, 0.044, 0.088)), 'espalda_L'),
                tag(RoundCone((0, 0.045, 1.512), (sx - 0.02, 0.035, 1.462), 0.040, 0.032), 'trapecio_L'),
                tag(Ellipsoid((0.066, 0.066, 0.905), (0.084, 0.068, 0.095)), 'gluteo_L'),
                # el cuello, más fino arriba y algo atrás: la garganta queda detrás de la mandíbula (la
                # revisión lo vio tan ancho como ella, y la cabeza se leía como un pulgar)
                tag(RoundCone((0, 0.026, 1.44), (0, 0.03, 1.605), 0.056, 0.045), 'cuello'),
                tag(ell_axis(S + 0.018 * d + 0.008 * u, d, 0.074, 0.046, 0.042), 'deltoides_L'),
            ]
        else:
            tr += [
                tag(Ellipsoid((0, 0.018, 0.95), (0.163, 0.105, 0.12)), 'pelvis'),
                tag(Ellipsoid((0, 0.01, 1.05), (0.118, 0.080, 0.1)), 'abdomen'),
                tag(Ellipsoid((0, 0.014, 1.135), (0.108, 0.076, 0.085)), 'abdomen'),
                tag(Ellipsoid((0, 0.016, 1.29), (0.124, 0.088, 0.16)), 'torax'),
                tag(Ellipsoid((0.052, -0.05, 1.285), (0.056, 0.049, 0.054), rot_euler(10, 0, -10)), 'pecho_L'),
                tag(Ellipsoid((0.080, 0.035, 1.25), (0.056, 0.058, 0.12)), 'espalda_L'),
                tag(Ellipsoid((0.062, 0.058, 1.345), (0.066, 0.040, 0.085)), 'espalda_L'),
                tag(RoundCone((0, 0.04, 1.51), (sx - 0.018, 0.03, 1.46), 0.032, 0.026), 'trapecio_L'),
                tag(Ellipsoid((0.07, 0.07, 0.9), (0.09, 0.075, 0.1)), 'gluteo_L'),
                tag(RoundCone((0, 0.026, 1.45), (0, 0.02, 1.61), 0.048, 0.041), 'cuello'),
                tag(ell_axis(S + 0.016 * d + 0.005 * u, d, 0.066, 0.041, 0.037), 'deltoides_L'),
            ]
        # --- brazo
        k = 0.88 if f else 1.0
        br = [
            tag(RoundCone(S, E, 0.045 * k, 0.037 * k), 'brazo_L'),
            tag(ell_axis(S + 0.16 * d - 0.016 * Y, d, 0.1, 0.039 * k, 0.039 * k), 'brazo_L'),
            tag(ell_axis(S + 0.12 * d + 0.018 * Y, d, 0.12, 0.041 * k, 0.039 * k), 'brazo_L'),
            tag(Sphere(E, 0.034 * k), 'antebrazo_L'),
            tag(RoundCone(E, W, 0.036 * k, 0.024 * k), 'antebrazo_L'),
            tag(ell_axis(E + 0.075 * d - 0.004 * Y + 0.003 * u, d, 0.10, 0.041 * k, 0.034 * k), 'antebrazo_L'),
            tag(ell_axis(W, d, 0.02, 0.027 * k, 0.018 * k), 'antebrazo_L'),
        ]
        # --- mano: palma + nudillos + dos bloques de dedos + pulgar con su eminencia tenar.
        # ejes: ancho = Y (pulgar delante, en -Y), grosor = u (dorso hacia +u), largo = d
        hk = KMANO
        Rm = np.stack([Y, u, d], 1)
        L1, L2 = L_DEDO1, L_DEDO2
        pulg_a = W + (0.024 * d - 0.024 * Y - 0.010 * u) * hk
        pulg_b = W + (0.086 * d - 0.043 * Y - 0.021 * u) * hk
        mano = [
            tag(RoundBox(W + (0.050 * d + 0.001 * u) * hk, _v((0.039, 0.0142, 0.047)) * hk, Rm, 0.0125 * hk), 'mano_L'),
            tag(RoundCone(W + (0.091 * d - 0.029 * Y + 0.003 * u) * hk, W + (0.091 * d + 0.031 * Y + 0.003 * u) * hk,
                          0.0118 * hk, 0.0105 * hk), 'mano_L'),
            tag(RoundBox(W + ((L_MANO + 0.5 * L1 - 0.002) * d - 0.001 * u) * hk, _v((0.037, 0.0112, 0.5 * L1 + 0.006)) * hk,
                         Rm, 0.0098 * hk), 'dedos_L'),
            tag(RoundBox(W + ((L_MANO + L1 + 0.5 * L2 - 0.004) * d - 0.003 * u) * hk, _v((0.0345, 0.0094, 0.5 * L2 + 0.002)) * hk,
                         Rm, 0.0088 * hk), 'dedos_L'),
            tag(RoundCone(pulg_a, pulg_b, 0.0128 * hk, 0.0095 * hk), 'mano_L'),
            tag(ell_axis(W + (0.045 * d - 0.021 * Y - 0.011 * u) * hk, pulg_b - pulg_a, 0.028 * hk, 0.015 * hk, 0.012 * hk), 'mano_L'),
        ]
        # ═══ NUDILLOS Y DEDOS (segunda pasada) ═══ La revisión vio los puños como cajas redondeadas y las
        # manos abiertas como paletas. Cuatro nudillos en el dorso (en el puño cerrado son lo que se ve
        # del golpe) y tres cortes entre los dedos, de la punta a media falange: el hueso sigue siendo
        # uno por falange para los cuatro, pero ya se leen cuatro dedos.
        for yk in (-0.0265, -0.0088, 0.0088, 0.0265):
            mano.append(tag(Sphere(W + ((L_MANO - 0.001) * d + 0.0085 * u + yk * Y) * hk, 0.0088 * hk), 'mano_L'))
        surcos = []
        for yg in (-0.0177, 0.0, 0.0177):
            c = W + ((L_MANO + L1 + L2 + 0.004) * d + (yg + 0.001) * Y) * hk
            # ell_axis: r1 va por Y (el ancho de la mano), r2 por u (el grueso): corte fino y pasante
            surcos.append(tag(ell_axis(c, d, (0.62 * L1 + L2) * hk, 0.0021 * hk, 0.03 * hk), 'mano_L'))
        self.surcos_mano = sym(surcos)
        # --- pierna
        H, K, A = CADERA, RODILLA, TOBILLO
        cx = CADERA[0]
        if not f:
            pi = [
                tag(RoundCone((cx - 0.002, 0.008, 0.9), K + _v((0, 0, 0.03)), 0.082, 0.054), 'muslo_L'),
                tag(Ellipsoid((cx + 0.021, -0.012, 0.72), (0.048, 0.052, 0.16)), 'muslo_L'),
                tag(Ellipsoid((cx - 0.003, -0.045, 0.73), (0.05, 0.04, 0.15)), 'muslo_L'),
                tag(Ellipsoid((cx - 0.035, 0.0, 0.8), (0.045, 0.055, 0.11)), 'muslo_L'),
                tag(Ellipsoid((cx, 0.04, 0.74), (0.055, 0.045, 0.15)), 'muslo_L'),
                tag(Ellipsoid(K + _v((0, -0.012, 0)), (0.046, 0.045, 0.055)), 'rodilla_L'),
                tag(Sphere(K + _v((0, -0.04, 0.005)), 0.024), 'rotula_L'),
                tag(RoundCone(K, A + _v((0, 0, 0.03)), 0.046, 0.031), 'pierna_L'),
                tag(Ellipsoid((cx + 0.003, 0.03, 0.37), (0.046, 0.05, 0.1)), 'pierna_L'),
                tag(Ellipsoid((cx - 0.008, 0.028, 0.35), (0.04, 0.045, 0.09)), 'pierna_L'),
            ]
        else:
            pi = [
                tag(RoundCone((cx, 0.01, 0.9), K + _v((0, 0, 0.03)), 0.085, 0.05), 'muslo_L'),
                tag(Ellipsoid((cx + 0.03, 0.0, 0.8), (0.05, 0.06, 0.13)), 'muslo_L'),
                tag(Ellipsoid((cx - 0.007, -0.035, 0.73), (0.048, 0.04, 0.14)), 'muslo_L'),
                tag(Ellipsoid((cx - 0.035, 0.0, 0.79), (0.045, 0.052, 0.11)), 'muslo_L'),
                tag(Ellipsoid(K + _v((0, -0.01, 0)), (0.043, 0.043, 0.052)), 'rodilla_L'),
                tag(Sphere(K + _v((0, -0.036, 0.005)), 0.022), 'rotula_L'),
                tag(RoundCone(K, A + _v((0, 0, 0.03)), 0.043, 0.028), 'pierna_L'),
                tag(Ellipsoid((cx + 0.003, 0.028, 0.37), (0.043, 0.046, 0.095)), 'pierna_L'),
            ]
        # --- pie: 25,8 cm (hombre) del talon a la punta; zapato ~28,5
        fk = KPIE
        yA = TOBILLO[1]
        pie = [
            tag(Ellipsoid(A, _v((0.033, 0.038, 0.03)) * fk), 'pie_L'),
            tag(Sphere((cx, yA + 0.020 * fk, 0.05), 0.031 * fk), 'pie_L'),
            tag(RoundBox((cx + 0.002, yA - 0.063 * fk, 0.046), _v((0.038 * fk, 0.096 * fk, 0.026)), rot_euler(6, 0, 0), 0.023), 'pie_L'),
            tag(RoundBox((cx + 0.003, yA - 0.176 * fk, 0.036), _v((0.039 * fk, 0.030 * fk, 0.015)), None, 0.014), 'pie_L'),
        ]
        # ═══ COMPLEXIÓN ═══ Las cuatro siluetas del Celador (§1) comparten esqueleto: el ancho y el
        # enjuto cambian el volumen alrededor de las mismas articulaciones (el alto, además, se escala
        # entero en el cliente: `escala` del manifiesto).
        #
        # La revisión midió el tronco / la altura: alto 0,195 (lo mismo que un hombre normal, 0,191:
        # la escala uniforme lo agranda entero, también a lo ancho) y ancho 0,218 (un 6 % más que el
        # alto, y con los hombros MÁS ESTRECHOS). El alto se desinfla de verdad (tronco, brazos y
        # piernas) para que a 1,06 siga siendo enjuto, y el ancho gana donde se lee un hombre ancho:
        # trapecios, hombros, pecho y cuello, no la barriga.
        if complexion == 'ancho':
            infla = {'torax': 0.03, 'espalda_L': 0.03, 'pecho_L': 0.02, 'abdomen': 0.022, 'pelvis': 0.016,
                     'trapecio_L': 0.03, 'deltoides_L': 0.026, 'cuello': 0.007, 'gluteo_L': 0.012}
            tr = [p.inflate(infla.get(p.region, 0.016)) for p in tr]
            tr.append(tag(Ellipsoid((0, -0.02, 1.10), (0.160, 0.118, 0.15)), 'abdomen'))
            br = [p.inflate(0.014) for p in br]
            pi = [p.inflate(0.013) for p in pi]
        elif complexion == 'enjuto':
            desinfla = {'torax': -0.022, 'abdomen': -0.024, 'pelvis': -0.016, 'gluteo_L': -0.018, 'espalda_L': -0.014,
                        'pecho_L': -0.01, 'trapecio_L': -0.01, 'deltoides_L': -0.012, 'cuello': -0.006}
            tr = [p.inflate(desinfla.get(p.region, -0.008)) for p in tr]
            br = [p.inflate(-0.007) for p in br]
            pi = [p.inflate(-0.012) for p in pi]
        elif complexion == 'barriga':
            tr.append(tag(Ellipsoid((0, -0.03, 1.07), (0.13, 0.10, 0.12)), 'abdomen'))
        self.tronco = sym(tr)
        self.brazos = sym(br)
        self.manos = sym(mano)
        self.piernas = sym(pi)
        self.pies = sym(pie)
        self._cabeza(f)

    def _cabeza(self, f):
        e = E_CABEZA
        HC = CABEZA_C

        def P(x, y, z):
            # posiciones del diseno de cabeza (centro 0, 0.012, 1.68) -> plantilla
            return _v((x * e, HC[1] + (y - 0.012) * e, HC[2] + (z - 1.68) * e))

        def R(*r):
            return _v(r) * e
        fm = 1.0 if f else 0.0
        # ═══ UN CRÁNEO POR SEXO (segunda pasada) ═══ Hombres y mujeres salían del mismo cráneo. El del
        # hombre gana mandíbula cuadrada y más ancha que el cuello, arco ciliar y mentón; el de la mujer,
        # frente redonda, pómulo alto y mandíbula estrecha, sin arco ciliar.
        mh = 1.0 - fm
        c = [
            Ellipsoid(P(0, 0.02, 1.705), R(0.075, 0.097, 0.097)),                                   # craneo
            Ellipsoid(P(0, -0.03 - 0.003 * fm, 1.733 + 0.003 * fm), R(0.066, 0.064 + 0.004 * fm, 0.05 + 0.006 * fm)),  # frente
            Ellipsoid(P(0, -0.034, 1.690), R(0.064, 0.051, 0.040)).conk(0.02),                      # bajo las cejas
            Ellipsoid(P(0, -0.029, 1.656), R(0.064 - 0.002 * fm, 0.054, 0.042)).conk(0.02),         # pomulos
            Ellipsoid(P(0, -0.034, 1.626), R(0.058 - 0.005 * fm, 0.0545, 0.040)).conk(0.02),        # maxilar
            Ellipsoid(P(0, -0.036, 1.600), R(0.052 - 0.008 * fm, 0.052, 0.036)).conk(0.02),         # boca
            Ellipsoid(P(0, -0.040, 1.577 + 0.003 * fm), R(0.042 - 0.011 * fm, 0.047 - 0.003 * fm, 0.026)).conk(0.018),  # barbilla
            Ellipsoid(P(0, -0.074, 1.566 + 0.004 * fm), R(0.020 - 0.007 * fm + 0.004 * mh, 0.016 - 0.002 * fm + 0.001 * mh, 0.014 + 0.001 * mh)).conk(0.012),  # menton
            RoundCone(P(0.058 - 0.004 * fm + 0.003 * mh, 0.010, 1.652), P(0.052 - 0.007 * fm + 0.005 * mh, -0.003, 1.594), (0.011 + 0.001 * mh) * e, (0.012 - 0.003 * fm + 0.0015 * mh) * e).conk(0.02),  # rama
            RoundCone(P(0.052 - 0.007 * fm + 0.005 * mh, -0.003, 1.594), P(0.024 - 0.006 * fm + 0.004 * mh, -0.065, 1.569), (0.012 - 0.003 * fm + 0.0015 * mh) * e, (0.011 - 0.002 * fm + 0.0012 * mh) * e).conk(0.02),  # mandibula
            Ellipsoid(P(0.050, -0.044 - 0.002 * fm, 1.668 + 0.004 * fm), R(0.017, 0.016, 0.010 + 0.002 * fm)).conk(0.014),  # pomulo
            RoundCone(P(0.0, -0.089, 1.706), P(0.046, -0.078, 1.709), (0.0098 - 0.0048 * fm + 0.0012 * mh) * e, (0.0085 - 0.003 * fm) * e).conk(0.008),  # arco ciliar
            Ellipsoid(P(0.071, 0.017, 1.657), R(0.0095, 0.0185, 0.0305), rot_euler(-16, 0, -10)).conk(0.005),  # oreja
        ]
        nz = 1.0 if not f else 0.86
        nariz = [RoundCone(P(0, -0.090, 1.694), P(0, -0.1105 + 0.003 * fm, 1.652), 0.0074 * e * nz, 0.0102 * e * nz).conk(0.006),
                 Ellipsoid(P(0, -0.099, 1.645), R(0.0162, 0.0092, 0.0082) * nz).conk(0.005),                  # aletas
                 Ellipsoid(P(0, -0.0873, 1.6150), R(0.0172 - 0.001 * fm, 0.0061 + 0.0012 * fm, 0.0050 + 0.0016 * fm)).conk(0.006),     # labio sup
                 Ellipsoid(P(0, -0.0855, 1.6005), R(0.0160 - 0.001 * fm, 0.0065 + 0.0014 * fm, 0.0056 + 0.0022 * fm)).conk(0.006)]    # labio inf
        # ═══ LOS OJOS, DENTRO DE LA CARA ═══ La revisión los vio como canicas que sobresalían del perfil
        # y sin párpados. El globo va 1,3 mm más adentro y algo menor; los párpados, casi del doble de
        # grueso (con 1,2 mm no llegaban a la rejilla de 3 mm y el diezmado se los comía), tapan un cuarto
        # arriba: la mirada queda serena, no de asombro. (Con 3,5 mm y un tercio, los ojos desaparecían
        # detrás de la piel: se vio en la primera captura.)
        self.ojo = P(0.032, -0.0692, 1.682)
        self.r_ojo = 0.0115 * e
        self.oreja = P(0.074, 0.016, 1.657)
        self.escala_cabeza = e
        self.boveda = [c[0], c[1]]          # cráneo y frente: lo que cubre el pelo (`pelo`)
        self.cabeza = sym([tag(p, 'cabeza') for p in c])
        self.cara = [tag(p, 'cara') for p in nariz]
        self.cuencas = sym([Sphere(P(0.032, -0.091, 1.685), 0.0145 * e)])
        self.ojos = sym([Sphere(self.ojo, self.r_ojo)])
        # parpados: piel fina sobre el globo ocular, arriba (tapa un tercio) y abajo (un poco)
        o, r = self.ojo, self.r_ojo
        sup = Interseccion([CascaronEsfera(o, r + 0.0019 * e, 0.0021 * e),
                            Plane((0, 0.25, -1), o + _v((0, 0, 0.0044 * e))),
                            Plane((0, 1, 0), o + _v((0, 0.002, 0)))])
        inf = Interseccion([CascaronEsfera(o, r + 0.0015 * e, 0.0015 * e),
                            Plane((0, 0.3, 1), o - _v((0, 0, 0.0080 * e))),
                            Plane((0, 1, 0), o + _v((0, 0.001, 0)))])
        self.parpados = sym([tag(sup, 'cabeza'), tag(inf, 'cabeza')])
        # hueco de la concha de la oreja
        self.conchas = sym([Ellipsoid(P(0.0795, 0.015, 1.654), R(0.0042, 0.0105, 0.018), rot_euler(-16, 0, -10))])
        # ═══ LA BOCA ═══ La comisura de 1 mm no llegaba a la rejilla: la cara salía sin boca. Una ranura
        # de 4 mm de alto y 1,5 cm de hondo entre los labios, que la oclusión horneada oscurece sola.
        self.conchas.append(Ellipsoid(P(0, -0.0925, 1.6076), R(0.0185 - 0.0015 * fm, 0.0075, 0.0019)))

    def fuente_cabeza(self):
        base = Source(self.cabeza + self.cara, k=0.014, subs=self.cuencas, sub_k=0.009)
        return Source([Compuesto(base)] + self.parpados, k=0.0025, subs=self.conchas, sub_k=0.0025)

    def fuente_cabeza_simple(self):
        """Sin parpados ni conchas: para buscar la superficie (cejas, gafas)."""
        return Source(self.cabeza + self.cara, k=0.014, subs=self.cuencas, sub_k=0.009)

    def superficie_y(self, x, z, src=None, desde=-0.2):
        """y de la superficie frontal (primer cruce mirando hacia +Y)."""
        src = src or self.fuente_cabeza_simple()
        yy = np.linspace(desde, 0.05, 1500)
        dd = src.eval_points(np.full_like(yy, x), yy, np.full_like(yy, z))
        i = int(np.argmax(dd < 0))
        return yy[i]

    def todas(self):
        return self.tronco + self.brazos + self.manos + self.piernas + self.pies + self.cabeza + self.cara

    def grupo_piel(self):
        return Group('mat_piel', [
            Source(self.tronco, k=0.03),
            Source(self.brazos, k=0.02),
            Source(self.manos, k=0.0075, subs=self.surcos_mano, sub_k=0.0015),
            Source(self.piernas, k=0.024),
            Source(self.pies, k=0.02),
            self.fuente_cabeza(),
        ], k=0.015)


# ------------------------------------------------------------------ figuras
TRONCO = ('pelvis', 'abdomen', 'torax', 'pecho', 'espalda', 'trapecio', 'deltoides')
ABRIGO = TRONCO


def manga(cu, s, delta, k=0.03, atras=0.012, extra=(), holgura=1.0):
    """Manga: tubo de tela del hombro a la muneca + brazo inflado debajo."""
    m = _v((s, 1, 1))
    f = cu.sexo == 'f'
    r_h, r_c, r_m = (0.041, 0.037, 0.030) if f else (0.046, 0.042, 0.034)
    tubo = [RoundCone(HOMBRO * m + _v((0, 0, 0.004)), CODO * m, (r_h + delta) * holgura, (r_c + delta) * holgura),
            RoundCone(CODO * m, MUNECA * m, (r_c + delta) * holgura, (r_m + delta) * holgura)]
    prims = solo_lado(inflar(cu.brazos + cu.tronco, ('brazo', 'antebrazo', 'deltoides'), delta * 0.3), s)
    return Source(tubo + list(prims) + list(extra), k=k, clip=[corte_manga(s, atras)], clip_k=0.003)


def torso_prenda(cu, delta, z_bajo=0.9):
    """Volumen de tela del tronco: pocas formas grandes (nada de musculos)."""
    f = cu.sexo == 'f'
    sx = HOMBRO[0]
    k = getattr(cu, 'k_ancho', 1.0)
    if not f:
        P = [Ellipsoid((0, 0.012, 1.3), (0.150 * k + delta, 0.106 * k + delta, 0.175 + delta)),
             Ellipsoid((0, 0.012 - 0.02 * (k - 1), 1.11), (0.138 * k + delta, 0.095 * k * k + delta, 0.15)),
             Ellipsoid((0, 0.016, 0.96), (0.153 * k + delta, 0.106 * k + delta, 0.13))]
        for sg in (1, -1):
            P.append(RoundCone((0.05 * sg, 0.035, 1.472), ((sx - 0.01) * sg, 0.024, 1.447), 0.043 + delta, 0.045 + delta))
    else:
        P = [Ellipsoid((0, 0.014, 1.3), (0.130 * k + delta, 0.093 * k + delta, 0.165 + delta)),
             Ellipsoid((0, 0.014, 1.11), (0.117 * k + delta, 0.084 * k + delta, 0.14)),
             Ellipsoid((0, 0.018, 0.955), (0.166 * k + delta, 0.108 * k + delta, 0.13))]
        for sg in (1, -1):
            P.append(RoundCone((0.045 * sg, 0.032, 1.465), ((sx - 0.01) * sg, 0.022, 1.442), 0.038 + delta, 0.041 + delta))
            P.append(Ellipsoid((0.053 * sg, -0.05, 1.29), (0.058 + delta, 0.05 + delta, 0.056 + delta), rot_euler(10, 0, -10 * sg)))
    return P


def pantalon(cu, delta, k=0.05, perneras=(0.075, 0.056, 0.05, 0.047), bajo=0.1):
    """Perneras rectas de tela + cuerpo inflado debajo."""
    P = []
    r_m, r_r, r_t, r_b = perneras
    cx = CADERA[0]
    for sg in (1, -1):
        m = _v((sg, 1, 1))
        P += [RoundCone(_v((cx - 0.004, 0.012, 0.9)) * m, RODILLA * m + _v((0, 0.004, 0.0)), r_m + delta, r_r + delta),
              RoundCone(RODILLA * m + _v((0, 0.004, 0.0)), _v((cx + 0.001, 0.022, bajo)) * m, r_r + delta, r_b + delta)]
    P += [Ellipsoid((0, 0.018, 0.965), (0.150 + delta, 0.104 + delta, 0.105))]
    return P + inflar(cu.todas(), ('pelvis', 'gluteo', 'muslo', 'rodilla', 'pierna'), delta * 0.5)


def suela(grosor=0.025, ancho=0.047, material='mat_suela'):
    ps = []
    yA = TOBILLO[1]
    largo = 0.142 * KPIE
    for s in (1, -1):
        c = _v((CADERA[0] * s + 0.003 * s, yA - 0.080 * KPIE, grosor * 0.5))
        ps.append(RoundBox(c, (ancho * KPIE, largo, grosor * 0.5), None, min(0.009, grosor * 0.45)))
    return Group(material, [Source(ps, k=0.0)])


def puntera(s, dy=0.0, alto=0.024, ancho=0.042, largo=0.055, rad=0.021, z=0.047):
    """Caja de la puntera del calzado (mas corta que antes: zapato de ~28,5 cm)."""
    yA = TOBILLO[1]
    return RoundBox(((CADERA[0] + 0.003) * s, yA - (0.168 + dy) * KPIE, z), (ancho * KPIE, largo * KPIE, alto), None, rad)


def cuello_alto(z0, z_delante, z_detras, r0, r1, t, sy=0.95, cy=0.022, abertura=0.024):
    """Cuello de abrigo: cascaron conico recortado por un plano inclinado
    (mas bajo delante que detras) y abierto por delante."""
    zt = max(z_delante, z_detras) + 0.01
    pend = (z_detras - z_delante) / 0.16
    corte = Plane((0, -pend, 1), (0, -0.06, z_delante))
    abre = RoundBox((0, -0.11, z0 + 0.1), (abertura, 0.06, 0.14), None, 0.008)
    return Source([Shell(0, cy, z0, zt, r0, r1, t, sy)], k=0, clip=[corte], clip_k=0.003,
                  subs=[abre], sub_k=0.004)


def nacimiento_pelo(z_frente, y_frente=-0.09, pendiente=0.66):
    # pelo por encima de un plano inclinado (frente alta, nuca baja)
    n = _v((0, -pendiente, -1.0))
    p0 = _v((0, y_frente, z_frente))
    return Plane(n, p0)


def escote_inclinado(z_delante, z_detras):
    pend = (z_detras - z_delante) / 0.16
    return Plane((0, -pend, 1), (0, -0.06, z_delante))


def hueco_cuello(r=0.066):
    return RoundCone((0, 0.022, 1.46), (0, 0.012, 1.72), r, r)


def hombreras(extra=0.0):
    return [tag(ell_axis(HOMBRO * _v((s, 1, 1)) + 0.01 * d_brazo(s) + (0.022 + extra) * u_brazo(s),
                         d_brazo(s), 0.072, 0.054, 0.045), 'x') for s in (1, -1)]


def solapas(cu, src, z_top, x_top, z_bot, x_bot, r0, r1, fuera=0.006, n=7):
    ps = []
    for s in (1, -1):
        pts, rs = [], []
        for i in range(n):
            t = i / (n - 1)
            z = z_top + (z_bot - z_top) * t
            x = x_top + (x_bot - x_top) * t + fuera
            y = cu.superficie_y(x, z, src, desde=-0.25)
            r = r0 + (r1 - r0) * t
            pts.append(_v((x * s, y + r * 0.45, z)))
            rs.append(r)
        for i in range(n - 1):
            ps.append(RoundCone(pts[i], pts[i + 1], rs[i], rs[i + 1]))
    return ps


def huecos_orejas(cu, r=(0.026, 0.024, 0.034)):
    """El pelo corto no tapa las orejas: se recorta alrededor de cada una."""
    o = cu.oreja
    e = cu.escala_cabeza
    return [Ellipsoid(o * _v((s, 1, 1)) + _v((0.0, 0.004, 0.004)) * e, _v(r) * e, rot_euler(-16, 0, 0)) for s in (1, -1)]


def pelo(cu, prims, z_frente, pendiente, k=0.012, clip_k=0.004, orejas=True, extra_subs=(), grosor=0.003):
    """Casco de pelo: formas + plano de nacimiento + recorte de orejas (patilla delante)."""
    e = cu.escala_cabeza
    HC = CABEZA_C

    def P(x, y, z):
        return _v((x * e, HC[1] + (y - 0.012) * e, HC[2] + (z - 1.68) * e))
    ps = []
    for kind, c, r in prims:
        if kind == 'e':
            ps.append(Ellipsoid(P(*c), (_v(r) + grosor) * e))
        else:
            ps.append(Sphere(P(*c), (r + grosor) * e))
    # ═══ EL PELO SIGUE AL CRÁNEO (segunda pasada) ═══ Los cascos eran elipsoides propios, un par de
    # milímetros por fuera del cráneo de la primera entrega. Con la frente nueva (más alta y redonda en la
    # mujer) la piel les ganaba por delante y el pelo empezaba en la coronilla: el Celador «rapado» y la
    # Celadora del moño salían calvos por delante (se vio en las capturas de cara). Ahora la bóveda del
    # propio cráneo, hinchada el grosor del pelo, entra en el casco: cubre hasta el nacimiento siempre.
    ps += [q.inflate(grosor * e) for q in getattr(cu, 'boveda', [])]
    subs = list(extra_subs)
    if orejas:
        subs += huecos_orejas(cu)
    zf = HC[2] + (z_frente - 1.68) * e
    return Source(ps, k=k * e, clip=[nacimiento_pelo(zf, y_frente=HC[1] + (-0.09 - 0.012) * e, pendiente=pendiente)],
                  clip_k=clip_k, subs=subs, sub_k=0.004)




# ------------------------------------------------------------------ piezas sueltas de vestuario
def banda(prims, z0, z1, extra=0.004, k=0.05, subs=()):
    """Tira que abraza una prenda entre dos alturas, `extra` metros por fuera: gana el minimo duro
    entre grupos, asi que en esa franja manda su material (cinturon, pretina, franja reflectante)."""
    return Source([p.inflate(extra) for p in prims], k=k, clip=[zmayor(z0), zmenor(z1)], clip_k=0.002,
                  subs=list(subs), sub_k=0.003)


def banda_manga(cu, s, delta, ancho=0.03, atras=0.012, extra=0.0024, holgura=1.0):
    """Ribete de bocamanga: el tubo de la manga (el mismo de `manga`) un pelo por fuera, en una
    franja junto a la muneca."""
    m = _v((s, 1, 1))
    f = cu.sexo == 'f'
    r_c, r_m = (0.037, 0.030) if f else (0.042, 0.034)
    d = d_brazo(s)
    w = MUNECA * m
    tubo = RoundCone(CODO * m, w, (r_c + delta) * holgura + extra, (r_m + delta) * holgura + extra)
    return Source([tubo], k=0.0, clip=[corte_manga(s, atras), Plane(-d, w - (atras + ancho) * d)], clip_k=0.002)


def banda_brazo(cu, s, delta, t0, t1, extra=0.0024, holgura=1.0):
    """Franja alrededor de la manga entre las fracciones t0 y t1 del brazo (hombro 0, codo 1)."""
    m = _v((s, 1, 1))
    f = cu.sexo == 'f'
    r_h, r_c = (0.041, 0.037) if f else (0.046, 0.042)
    d = d_brazo(s)
    a, b = HOMBRO * m, CODO * m
    tubo = RoundCone(a, b, (r_h + delta) * holgura + extra, (r_c + delta) * holgura + extra)
    return Source([tubo], k=0.0, clip=[Plane(-d, a + (b - a) * t0), Plane(d, a + (b - a) * t1)], clip_k=0.002)


def superficie_frontal(src, x, zs, desde=-0.3):
    """y de la superficie delantera de `src` en la vertical x para cada z."""
    ys = []
    for z in zs:
        yy = np.linspace(desde, 0.05, 700)
        dd = src.eval_points(np.full_like(yy, x), yy, np.full_like(yy, z))
        i = int(np.argmax(dd < 0))
        ys.append(yy[i])
    return ys


def franja_frontal(src, z0, z1, ancho=0.011, fuera=0.0025, grosor=0.004, n=12):
    """Tira vertical en el centro del pecho (cremallera, tapeta): sigue la superficie de `src`."""
    zs = np.linspace(z1, z0, n)
    ys = superficie_frontal(src, 0.0, zs)
    # (los trozos se solapan: con 0,62 del paso quedaba una línea de puntos, no una cremallera)
    ps = [RoundBox((0, y - fuera + grosor * 0.5, z), (ancho, grosor, (z1 - z0) / (n - 1) * 0.58 + 0.004), None, 0.002)
          for z, y in zip(zs, ys)]
    return Source(ps, k=0.004)


def pajarita(cu, src, z=1.458):
    y = superficie_frontal(src, 0.0, [z])[0]
    return Source([Ellipsoid((0.021, y - 0.008, z), (0.021, 0.008, 0.013), rot_euler(0, 8, 0)),
                   Ellipsoid((-0.021, y - 0.008, z), (0.021, 0.008, 0.013), rot_euler(0, -8, 0)),
                   Sphere((0, y - 0.010, z), 0.0085)], k=0.004)


# ------------------------------------------------------------------ cabello, bigote y sombrero
def _P(cu):
    e = cu.escala_cabeza
    HC = CABEZA_C

    def P(x, y, z):
        return _v((x * e, HC[1] + (y - 0.012) * e, HC[2] + (z - 1.68) * e))
    return P


def cabello(cu, estilo):
    """Los peinados del reparto (casco de pelo SDF con nacimiento y orejas libres)."""
    e = cu.escala_cabeza
    P = _P(cu)
    if estilo == 'corto':            # desvelado: corto con algo de volumen arriba
        return pelo(cu, [('e', (0, 0.019, 1.707), (0.0795, 0.1015, 0.103)),
                         ('e', (0.008, -0.028, 1.742), (0.068, 0.066, 0.052))], 1.752, 0.66, k=0.013)
    if estilo == 'engominado':       # celador alto: hacia atras
        return pelo(cu, [('e', (0, 0.02, 1.711), (0.0815, 0.103, 0.105)),
                         ('e', (0, 0.0, 1.772), (0.07, 0.088, 0.046))], 1.752, 0.62, k=0.02, clip_k=0.008)
    if estilo == 'rapado':           # celador ancho: al cero
        return pelo(cu, [('e', (0, 0.02, 1.705), (0.0762, 0.0985, 0.0985))], 1.758, 0.62, k=0.01, grosor=0.0014)
    if estilo == 'raya':             # celador ancho: corto de lado, con raya y algo de tupé
        return pelo(cu, [('e', (0, 0.019, 1.707), (0.0800, 0.1015, 0.1025)),
                         ('e', (-0.018, -0.022, 1.750), (0.064, 0.072, 0.046)),
                         ('e', (0.03, -0.05, 1.745), (0.03, 0.03, 0.03))], 1.748, 0.64, k=0.014)
    if estilo == 'canoso':           # celador mayor: corto, bajo el sombrero
        return pelo(cu, [('e', (0, 0.021, 1.706), (0.0790, 0.1005, 0.1015))], 1.748, 0.64, k=0.012, grosor=0.0026)
    if estilo == 'alborotado':       # durmiente
        return pelo(cu, [('e', (0, 0.018, 1.709), (0.0845, 0.105, 0.107)),
                         ('e', (0.01, -0.02, 1.765), (0.07, 0.086, 0.046)),
                         ('e', (0.0, -0.07, 1.75), (0.06, 0.035, 0.028)),
                         ('e', (-0.03, -0.045, 1.762), (0.035, 0.035, 0.026)),
                         ('e', (0.035, 0.05, 1.768), (0.04, 0.04, 0.028))], 1.745, 0.7, k=0.02, clip_k=0.008)
    if estilo == 'recogido':         # desvelada: recogido bajo en la nuca
        return pelo(cu, [('e', (0, 0.016, 1.71), (0.0795, 0.0995, 0.1005)),
                         ('s', (0, 0.108, 1.662), 0.034),
                         ('e', (0.012, -0.035, 1.756), (0.064, 0.074, 0.044))], 1.745, 0.8, k=0.018, clip_k=0.01, grosor=0.005)
    if estilo == 'mono':             # celadora: mono alto y tirante
        return pelo(cu, [('e', (0, 0.016, 1.709), (0.0785, 0.0985, 0.0995)),
                         ('s', (0, 0.104, 1.735), 0.030)], 1.748, 0.72, k=0.012, clip_k=0.008, grosor=0.003)
    if estilo == 'coleta':           # durmiente mujer: coleta que cae a la nuca
        base = pelo(cu, [('e', (0, 0.016, 1.71), (0.0805, 0.1005, 0.1015)),
                         ('s', (0, 0.106, 1.70), 0.026)], 1.745, 0.78, k=0.016, clip_k=0.01, grosor=0.004)
        cola = Source([RoundCone(P(0, 0.118, 1.70), P(0, 0.132, 1.60), 0.021 * e, 0.014 * e),
                       RoundCone(P(0, 0.132, 1.60), P(0, 0.122, 1.52), 0.014 * e, 0.008 * e)], k=0.01)
        return [base, cola]
    raise ValueError(estilo)


def bigote(cu):
    P = _P(cu)
    e = cu.escala_cabeza
    return Source([Ellipsoid(P(0.0115 * s, -0.0925, 1.6285), _v((0.0135, 0.0046, 0.0052)) * e, rot_euler(0, 14 * s, 0))
                   for s in (1, -1)], k=0.004)


def sombrero(cu):
    """Sombrero de ala corta del Celador mayor: copa con hendidura y ala plana."""
    P = _P(cu)
    e = cu.escala_cabeza
    copa = Source([Ellipsoid(P(0, 0.018, 1.782), _v((0.088, 0.106, 0.084)) * e)], k=0.0,
                  clip=[zmayor(P(0, 0, 1.742)[2])], clip_k=0.003,
                  subs=[Ellipsoid(P(0, 0.018, 1.875), _v((0.028, 0.074, 0.030)) * e)], sub_k=0.01)
    ala = Source([Ellipsoid(P(0, 0.020, 1.747), _v((0.156, 0.174, 0.0085)) * e)], k=0.0)
    cinta = Source([Ellipsoid(P(0, 0.018, 1.758), _v((0.0905, 0.1085, 0.012)) * e)], k=0.0)
    return [copa, ala, cinta]


# ------------------------------------------------------------------ pantalones y calzado
def piernas_y_pies(G, cu, todas, tipo, tela='mat_tela'):
    """Pantalon y calzado. `tipo`: botas, zapatos, deportivas, botas_altas, planos."""
    if tipo == 'botas':
        pant = Source(pantalon(cu, 0.010, perneras=(0.072, 0.054, 0.049, 0.047), bajo=0.2), k=0.035,
                      clip=[zmayor(0.2), zmenor(1.04)])
        calz = Source(inflar(todas, ('pie', 'pierna'), 0.012) + [puntera(s) for s in (1, -1)],
                      k=0.028, clip=[zmenor(0.265), zmayor(0.02)])
        sue = suela(0.026, 0.048)
    elif tipo == 'zapatos':
        pant = Source(pantalon(cu, 0.012, perneras=(0.074, 0.055, 0.051, 0.053), bajo=0.07), k=0.035,
                      clip=[zmayor(0.052), zmenor(1.04)])
        calz = Source(inflar(todas, ('pie',), 0.007) + [puntera(s, dy=-0.004, alto=0.019, ancho=0.04, rad=0.018, z=0.04) for s in (1, -1)],
                      k=0.02, clip=[zmenor(0.105), zmayor(0.012)])
        sue = suela(0.016, 0.045)
    elif tipo == 'deportivas':
        pant = Source(pantalon(cu, 0.013, perneras=(0.074, 0.056, 0.050, 0.044), bajo=0.1), k=0.03,
                      clip=[zmayor(0.095), zmenor(1.02)])
        calz = Source(inflar(todas, ('pie',), 0.014) + [puntera(s, dy=0.004, alto=0.03, ancho=0.045, rad=0.027, z=0.05) for s in (1, -1)],
                      k=0.02, clip=[zmenor(0.13), zmayor(0.02)])
        sue = suela(0.032, 0.05)
    elif tipo == 'botas_altas':      # mujer: pantalon ajustado y bota hasta la rodilla
        pant = Source(inflar(todas, ('pelvis', 'gluteo', 'muslo', 'rodilla', 'pierna'), 0.005), k=0.03,
                      clip=[zmayor(0.38), zmenor(1.06)])
        calz = Source(inflar(todas, ('pie', 'pierna', 'rodilla'), 0.009) + [puntera(s, alto=0.025, ancho=0.04, rad=0.022) for s in (1, -1)],
                      k=0.024, clip=[zmenor(0.47), zmayor(0.02)])
        sue = suela(0.03, 0.044)
    elif tipo == 'planos':           # mujer: pantalon recto y zapato plano
        pant = Source(pantalon(cu, 0.011, perneras=(0.07, 0.052, 0.048, 0.050), bajo=0.07), k=0.035,
                      clip=[zmayor(0.055), zmenor(1.05)])
        calz = Source(inflar(todas, ('pie',), 0.006) + [puntera(s, dy=-0.004, alto=0.018, ancho=0.037, rad=0.017, z=0.038) for s in (1, -1)],
                      k=0.02, clip=[zmenor(0.1), zmayor(0.012)])
        sue = suela(0.014, 0.041)
    else:
        raise ValueError(tipo)
    G.append(Group(tela, [pant]))
    G.append(Group('mat_calzado', [calz]))
    G.append(sue)


# ------------------------------------------------------------------ prendas de arriba
def camiseta(cu, todas, delta=0.006, z_bajo=0.93, escote=(1.47, 1.52)):
    return Source(torso_prenda(cu, delta) + inflar(todas, ABRIGO + ('cuello',), delta * 0.8), k=0.04,
                  clip=[escote_inclinado(*escote), zmayor(z_bajo)])


def cuello_vuelto(cu, todas, z_bajo=0.95):
    """Jersey de cuello alto (bajo la gabardina y el abrigo grueso)."""
    return Source(torso_prenda(cu, 0.004) + inflar(todas, ABRIGO + ('cuello',), 0.005), k=0.04,
                  clip=[escote_inclinado(1.50, 1.54), zmayor(z_bajo)])


def camisa_de_vestir(cu, todas, z_bajo=0.95):
    """Camisa con cuello y punos (celadores y camareros): el cuello es un cascaron alto."""
    f = cu.sexo == 'f'
    camisa = Source(torso_prenda(cu, 0.006) + inflar(todas, ABRIGO, 0.005), k=0.035, clip=[zmayor(z_bajo)],
                    subs=[hueco_cuello(0.056 if f else 0.06)], sub_k=0.006)
    if f:
        cuello = cuello_alto(1.445, 1.505, 1.54, 0.056, 0.055, 0.0038, cy=0.02, abertura=0.012)
    else:
        cuello = cuello_alto(1.44, 1.515, 1.55, 0.064, 0.063, 0.0042, cy=0.02, abertura=0.006)
    puno = [Source(solo_lado(inflar(cu.brazos, ('antebrazo',), 0.01), s), k=0.02,
                   clip=[corte_manga(s, 0.0), Plane(-d_brazo(s), MUNECA * _v((s, 1, 1)) - 0.06 * d_brazo(s))])
            for s in (1, -1)]
    return [camisa, cuello] + puno


def mangas(cu, delta, **kw):
    return [manga(cu, 1, delta, **kw), manga(cu, -1, delta, **kw)]


def bocamangas(cu, delta, **kw):
    return [banda_manga(cu, 1, delta, **kw), banda_manga(cu, -1, delta, **kw)]


def v_escote(z, pend=0.30):
    return Interseccion([Plane((0, 1, 0), (0, -0.03, 0)), Plane((1, 0, -pend), (0.0, 0, z)), Plane((-1, 0, -pend), (0.0, 0, z))])


def chaqueta_de_traje(G, cu, todas, material='mat_traje', zc=None, hombro=0.0):
    """Traje de chaqueta del Celador: solapas, boton y faldones abiertos por delante. La chaqueta sigue
    en parte al primer hueso del faldon (rig.pesos_chaqueta). `zc` es el bajo (la del alto, corta: las
    piernas se leen más largas); `hombro`, cuánto hombro de sastre gana (el ancho)."""
    f = cu.sexo == 'f'
    base = torso_prenda(cu, 0.014 if f else 0.016) + inflar(todas, ABRIGO + ('gluteo',), 0.008 if f else 0.009) + \
        hombreras(-0.02 + hombro)
    zv, zc0 = (1.15, 0.87) if f else (1.13, 0.862)
    zc = zc or zc0
    faldones = Interseccion([Plane((0, 1, 0), (0, -0.03, 0)), Plane((1, 0, 0.3), (0.0, 0, zv - 0.04)),
                             Plane((-1, 0, 0.3), (0.0, 0, zv - 0.04))])
    chaq = Source(base, k=0.05, clip=[zmayor(zc)],
                  subs=[v_escote(zv, 0.26), hueco_cuello(0.064 if f else 0.068), faldones], sub_k=0.004)
    ref = Source(base, k=0.055)
    sol = Source(solapas(cu, ref, 1.47 if f else 1.49, 0.082 if f else 0.0905, zv + 0.01, 0.003, 0.011, 0.005, fuera=0.009), k=0.004)
    zb = zv - 0.025
    boton = Source([Sphere((0, cu.superficie_y(0.0, zb, ref, -0.25) + 0.002, zb), 0.0065)], k=0)
    G.append(Group(material, [chaq] + mangas(cu, 0.015, atras=0.03) + [sol, boton], k=0.02))


# ------------------------------------------------------------------ figuras
def figura(nombre):
    """Grupos SDF de una figura del reparto (ver reparto.FIGURAS) y datos extra para construir."""
    import reparto
    fg = reparto.FIGURAS[nombre]
    sexo = fg['sexo']
    configurar(sexo)
    f = sexo == 'f'
    silueta = fg.get('silueta')
    complexion = {'alto': 'enjuto', 'ancho': 'ancho', 'mayor': 'barriga'}.get(silueta, 'normal')
    cu = Cuerpo(sexo, complexion)
    G = [cu.grupo_piel()]
    extra = dict(sexo=sexo, cuerpo=cu, escala=ESC)
    todas = cu.todas()
    clase = fg['clase']
    var = fg['variante']

    def pelo_(estilo):
        p = cabello(cu, estilo)
        G.append(Group('mat_pelo', p if isinstance(p, list) else [p]))

    if clase == 'desvelado':
        pelo_('recogido' if f else 'corto')
        piernas_y_pies(G, cu, todas, 'botas_altas' if f else 'botas')
        if var == 'gabardina':
            # ═══ UNA GABARDINA, NO UNA SOTANA (segunda pasada) ═══ La primera llevaba cuello alto de tipo
            # mao, talle ceñido y vuelo abajo: la silueta de las secuelas de la franquicia (§1, «lo que no
            # sale»). Una gabardina de calle: solapas y cuello vuelto sobre un jersey de cuello redondo,
            # corte recto (se rellena el talle) y el bajo recto (`perfil_faldon`). El cinturón y las
            # bocamangas, del color del asiento; el forro, por dentro del faldón.
            G.append(Group('mat_camisa', [camiseta(cu, todas, 0.006, 0.93, escote=(1.47, 1.52))]))
            dt = 0.012 if f else 0.017
            base = torso_prenda(cu, dt) + inflar(todas, ABRIGO, 0.007 if f else 0.008)
            recto = Ellipsoid((0, 0.014, 1.11), ((0.126 if f else 0.148) + dt, (0.090 if f else 0.102) + dt, 0.16))
            base = base + [recto]
            ze = 1.215 if f else 1.235
            torso = Source(base, k=0.05, clip=[zmayor(0.955)], subs=[v_escote(ze), hueco_cuello(0.058 if f else 0.064)], sub_k=0.004)
            ref = Source(base, k=0.05)
            if f:
                sol = Source(solapas(cu, ref, 1.465, 0.0785, ze + 0.015, 0.0045, 0.012, 0.005), k=0.004)
                cuello = cuello_alto(1.44, 1.47, 1.535, 0.070, 0.090, 0.006, abertura=0.058)
            else:
                sol = Source(solapas(cu, ref, 1.475, 0.0885, ze + 0.015, 0.0045, 0.013, 0.006), k=0.004)
                cuello = cuello_alto(1.435, 1.475, 1.545, 0.078, 0.098, 0.0068, abertura=0.064)
            G.append(Group('mat_abrigo', [torso, sol, cuello] + mangas(cu, dt - 0.002), k=0.02))
            zc = (1.07, 1.11) if f else (1.0, 1.04)
            G.append(Group('mat_forro', [banda(base, zc[0], zc[1], 0.006)] + bocamangas(cu, dt - 0.002)))
            extra['faldon'] = dict(z_top=1.03, z_hem=0.50 if not f else 0.52, abertura_top=2.0 if not f else 7.0,
                                   abertura_hem=15.0, z_raja=0.70, z_lat=0.76, grosor=0.007,
                                   material='mat_abrigo', forro='mat_forro')
        elif var == 'ligera':
            # chaqueta corta abierta: cuello, pretina y punos de punto del color del asiento
            G.append(Group('mat_camisa', [camiseta(cu, todas, 0.012, 0.93)]))
            z_bajo = 1.02 if f else 0.985
            base = torso_prenda(cu, 0.018 if f else 0.02) + inflar(todas, ABRIGO, 0.011)
            abierta = RoundBox((0, -0.13, 1.22), (0.028, 0.06, 0.34), None, 0.004)
            torso = Source(base, k=0.05, clip=[zmayor(z_bajo)], subs=[abierta, hueco_cuello(0.07)], sub_k=0.004)
            G.append(Group('mat_abrigo', [torso] + mangas(cu, 0.018), k=0.022))
            cuello = cuello_alto(1.44, 1.49, 1.54, 0.078 if not f else 0.07, 0.077 if not f else 0.069, 0.0075, abertura=0.036)
            pretina = banda(base, z_bajo - 0.004, z_bajo + 0.045, 0.005, subs=[abierta])
            G.append(Group('mat_forro', [cuello, pretina] + bocamangas(cu, 0.018, ancho=0.04)))
        elif var == 'mole':
            # ═══ EL ABRIGO GRUESO, GRUESO ARRIBA (segunda pasada) ═══ Su tronco era 1,2 cm más ancho que el
            # de la gabardina y la holgura se la llevaba el faldón (campana). El volumen va a hombros,
            # pecho y mangas —la silueta de un plumífero largo—, con un cuello embudo alto; el faldón cae
            # recto como el de la gabardina: sólo se ensancha arriba para casar con el tronco
            # (`holgura_arriba`). La cremallera y los puños, del color del asiento.
            G.append(Group('mat_camisa', [cuello_vuelto(cu, todas)]))
            base = torso_prenda(cu, 0.044) + inflar(todas, ABRIGO, 0.03) + hombreras(0.034)
            torso = Source(base, k=0.07, clip=[zmayor(0.95)], subs=[hueco_cuello(0.082)], sub_k=0.004)
            cuello = cuello_alto(1.42, 1.575, 1.625, 0.102 if not f else 0.092, 0.108 if not f else 0.098, 0.016, abertura=0.028)
            G.append(Group('mat_abrigo', [torso, cuello] + mangas(cu, 0.036, holgura=1.18), k=0.03))
            crem = franja_frontal(Source(base, k=0.07), 0.96, 1.5, ancho=0.011)
            G.append(Group('mat_forro', [crem] + bocamangas(cu, 0.036, holgura=1.18, ancho=0.045)))
            extra['faldon'] = dict(z_top=1.03, z_hem=0.62 if not f else 0.58, abertura_top=2.0, abertura_hem=8.0,
                                   z_raja=0.40, z_lat=0.74, grosor=0.018, holgura_arriba=0.026,
                                   material='mat_abrigo', forro='mat_forro')
        else:
            raise ValueError(nombre)
    elif clase == 'celador':
        # ═══ CUATRO CELADORES QUE NO SON EL MISMO (segunda pasada) ═══ Los cuatro llevaban lo mismo:
        # traje marengo, camisa blanca, corbata casi negra y las mismas gafas rectangulares opacas, y el
        # alto era pálido y engominado (el antagonista del original). Cada silueta trae de reparto.py su
        # pelo, su montura (ojo de gato, envolvente, de barra, de pinza: nunca redondas) y el largo de
        # la chaqueta; la camisa es crema o celeste y la corbata se tiñe con el traje (TENIBLES). La
        # corbata ya no es SDF: la de rebanadas salía en acordeón y acababa en un bloque negro a la altura
        # del ombligo que parecía una radio (lo que se veta con el auricular): es una tira fina con su
        # punta, que se esconde bajo el botón (`accesorios.corbata`).
        cel = fg['celador']
        pelo_(cel['pelo'])
        G.append(Group('mat_camisa', camisa_de_vestir(cu, todas), k=0.01))
        piernas_y_pies(G, cu, todas, 'planos' if f else 'zapatos', tela='mat_traje')
        chaqueta_de_traje(G, cu, todas, zc=cel.get('bajo_chaqueta'), hombro=cel.get('hombreras', 0.0))
        # la chaqueta y el pantalon comparten zona (mat_traje, se tiñen juntos): lo que sigue al faldon
        # se elige por el GRUPO de la chaqueta, no por el nombre del material, o el pantalon entero
        # arrastra como una falda
        extra['chaqueta_grupo'] = len(G) - 1
        if silueta == 'mayor':
            G.append(Group('mat_sombrero', sombrero(cu)))
            next(g for g in G if g.name == 'mat_pelo').sources.append(bigote(cu))
        extra['gafas'] = dict(cel['gafas'], material='mat_gafas')
        extra['chaqueta'] = 'mat_traje'
        extra['corbata'] = dict(material='mat_corbata')
    elif clase == 'durmiente':
        pelo_('coleta' if f else 'alborotado')
        if var == 'lluvia':
            # ═══ EL CHUBASQUERO (segunda pasada) ═══ El impermeable era la gabardina del desvelado con otro
            # color (coincidencia de silueta 0,95 de frente): a 12 m un Prestado con él se leía como un
            # compañero. Ahora es un chubasquero corto, hasta la cadera, brillante, con la capucha
            # recogida a la espalda, cremallera y bolsillos: sin cinturón, sin faldón y sin aberturas.
            G.append(Group('mat_camisa', [camiseta(cu, todas, 0.005, 0.95, escote=(1.49, 1.53))]))
            piernas_y_pies(G, cu, todas, 'planos' if f else 'zapatos')
            base = torso_prenda(cu, 0.024 if not f else 0.02) + inflar(todas, ABRIGO + ('gluteo',), 0.013)
            base.append(Ellipsoid((0, 0.016, 0.9), ((0.176 if not f else 0.186), 0.128, 0.12)))
            torso = Source(base, k=0.055, clip=[zmayor(0.80)], subs=[hueco_cuello(0.07)], sub_k=0.004)
            cuello = cuello_alto(1.44, 1.51, 1.55, 0.082 if not f else 0.074, 0.082 if not f else 0.074, 0.008, abertura=0.014)
            zc = 1.49 if not f else 1.485
            r = 0.104 if not f else 0.094
            pts = [(r * math.sin(a), 0.03 + r * 0.9 * math.cos(a) + 0.012, zc + 0.03 * math.cos(a) - 0.01)
                   for a in np.radians(np.linspace(-110, 110, 9))]
            cap = [RoundCone(a_, b_, 0.042, 0.042) for a_, b_ in zip(pts[:-1], pts[1:])]
            cap.append(Ellipsoid((0, 0.125 if not f else 0.115, zc - 0.035), (0.075, 0.035, 0.05)))
            capucha = Source(cap, k=0.025, subs=[hueco_cuello(0.072)], sub_k=0.004)
            ref = Source(base, k=0.055)
            bolsillos = [RoundBox((0.105 * s, superficie_frontal(ref, 0.105 * s, [0.9])[0] + 0.003, 0.9),
                                  (0.055, 0.008, 0.03), rot_euler(0, 0, 18 * s), 0.006) for s in (1, -1)]
            G.append(Group('mat_abrigo', [torso, cuello, capucha, Source(bolsillos, k=0.004)] + mangas(cu, 0.02), k=0.02))
            crem = franja_frontal(ref, 0.81, 1.47, ancho=0.009)
            G.append(Group('mat_interior', [crem]))
            extra['chaqueta'] = 'mat_abrigo'
            extra['chaqueta_grupo'] = len(G) - 2
            extra['chaqueta_z'] = (0.98, 0.80)
        elif var == 'obra':
            # chaqueta de trabajo acolchada con franjas reflectantes
            G.append(Group('mat_camisa', [camiseta(cu, todas, 0.005, 0.95)]))
            piernas_y_pies(G, cu, todas, 'botas' if not f else 'botas_altas')
            base = torso_prenda(cu, 0.024) + inflar(todas, ABRIGO + ('gluteo',), 0.013) + hombreras(0.0)
            torso = Source(base, k=0.055, clip=[zmayor(0.88)], subs=[hueco_cuello(0.074)], sub_k=0.004)
            cuello = cuello_alto(1.44, 1.50, 1.55, 0.084 if not f else 0.076, 0.084 if not f else 0.076, 0.009, abertura=0.02)
            G.append(Group('mat_abrigo', [torso, cuello] + mangas(cu, 0.022), k=0.024))
            franjas = [banda(base, 1.13, 1.165, 0.004), banda(base, 1.235, 1.27, 0.004)]
            franjas += [banda_brazo(cu, s, 0.022, 0.35, 0.5) for s in (1, -1)]
            franjas.append(franja_frontal(Source(base, k=0.055), 0.89, 1.46, ancho=0.008))
            G.append(Group('mat_franja', franjas))
        elif var == 'sudadera':
            # sudadera con capucha bajada, bolsillo canguro y cordones; pantalon de chandal
            piernas_y_pies(G, cu, todas, 'deportivas')
            base = torso_prenda(cu, 0.018) + inflar(todas, ABRIGO + ('cuello',), 0.012)
            torso = Source(base, k=0.05, clip=[zmayor(0.9), escote_inclinado(1.47, 1.52)])
            yb = superficie_frontal(Source(base, k=0.05), 0.0, [1.02])[0]
            bolsillo = Source([RoundBox((0, yb - 0.004, 1.02), (0.095, 0.009, 0.06), None, 0.008)], k=0.0)
            cap = []
            zc = 1.49 if not f else 1.485
            r = 0.092 if not f else 0.084
            pts = [(r * math.sin(a), 0.022 + r * 0.95 * math.cos(a) + 0.01, zc + 0.02 * math.cos(a))
                   for a in np.radians(np.linspace(-120, 120, 9))]
            for a_, b_ in zip(pts[:-1], pts[1:]):
                cap.append(RoundCone(a_, b_, 0.034, 0.034))
            capucha = Source(cap, k=0.02, subs=[hueco_cuello(0.07)], sub_k=0.004)
            G.append(Group('mat_abrigo', [torso, bolsillo, capucha] + mangas(cu, 0.018), k=0.02))
            yc = superficie_frontal(Source(base, k=0.05), 0.03, [1.44])[0]
            cordones = Source([RoundCone((0.03 * s, yc - 0.004, 1.45), (0.034 * s, yc - 0.008, 1.33), 0.0035, 0.004)
                               for s in (1, -1)], k=0.0)
            G.append(Group('mat_camisa', [cordones]))
        elif var == 'camarero':
            # camisa blanca, chaleco negro y pajarita
            # sin chaqueta encima, la camisa necesita sus mangas (la del traje solo trae punos)
            G.append(Group('mat_camisa', camisa_de_vestir(cu, todas, z_bajo=0.95) + mangas(cu, 0.006, atras=0.03), k=0.01))
            piernas_y_pies(G, cu, todas, 'planos' if f else 'zapatos')
            base = torso_prenda(cu, 0.011) + inflar(todas, TRONCO, 0.008)
            sisas = [RoundCone(HOMBRO * _v((s, 1, 1)) + _v((0.015 * s, 0, -0.01)), HOMBRO * _v((s, 1, 1)) + _v((0.02 * s, 0, -0.16)),
                             0.06, 0.07) for s in (1, -1)]
            chaleco = Source(base, k=0.045, clip=[zmayor(0.93)],
                             subs=[v_escote(1.24 if not f else 1.25, 0.34), hueco_cuello(0.07)] + sisas, sub_k=0.005)
            G.append(Group('mat_abrigo', [chaleco], k=0.01))
            ref = Source(torso_prenda(cu, 0.006) + inflar(todas, ABRIGO, 0.005), k=0.035)
            G.append(Group('mat_corbata', [pajarita(cu, ref, 1.458 if not f else 1.45)]))
        else:
            raise ValueError(nombre)
    else:
        raise ValueError(nombre)
    return G, extra


def camisa_de_la_corbata(cu):
    """La superficie de la camisa por la que baja la corbata (`accesorios.corbata`)."""
    return Source(torso_prenda(cu, 0.006) + inflar(cu.todas(), ABRIGO, 0.005), k=0.035)
