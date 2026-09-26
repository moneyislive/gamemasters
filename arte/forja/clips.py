"""EL VOCABULARIO DEL CUERPO: un clip por cada `Gesto` de `escritorio/src/quiebro/cuerpos.ts`.

Se registran en `animacion.CLIPS` con su nombre definitivo (el que el cliente busca en el GLB) y se
hornean con la misma maquinaria del prototipo (FK/IK, pasada de suelo sobre la malla, raíz, faldón).
Las poses se escriben en el espacio del esqueleto de Blender: X a la IZQUIERDA del personaje, Y
hacia ATRÁS (mira a −Y), Z arriba, en metros de la plantilla de 1,80 m (la mujer se escala sola).
Giros: +X de rotación inclina hacia delante, +Y hacia la izquierda del personaje, +Z adelanta el
hombro derecho (la guardia, con la izquierda delante, gira la cadera −26°).

═══ LO QUE EL CLIENTE NECESITA SABER DE CADA CLIP (va a reparto.json) ═══

  · `impacto`: el fotograma en que el golpe llega. El cliente estira o encoge la preparación para
    que ese fotograma caiga en el `impactoMs` del juego (anticipación elástica), así que la pose de
    impacto tiene que ser inequívoca: puño o pie en el blanco, cadera girada, peso delante. Se fija
    cerca del anuncio de las reglas (Seguida 250 ms, Cierre 350, Empellón 500, Réplica 150, Entrada y
    acometida 400, respuesta del Celador 300, golpe de Prestado 700) para que el estiramiento sea poco.
  · `alcance`: los golpes llegan a un blanco a 1,1 m (`GOLPES.alcanceMetros`): su superficie queda a
    unos 0,9 m de la raíz. Los puños se escriben como EXTENSIÓN del brazo (`golpe_s` en el
    solucionador), así que llegan rectos justo en el impacto y con el pico de velocidad en él.
  · `raiz`: el desplazamiento viaja en la pista `raiz.position`. El juego YA mueve el sitio (el
    quiebro, la Entrada, el vuelo) en línea recta y a velocidad fija: la raíz de esos clips es
    exactamente ese movimiento (`raiz_lineal`) y el cuerpo se escribe en el mundo sobre ella, así que
    un pie clavado en el clip sigue clavado en la calle cuando el cliente quita la pista y mueve el sitio.
  · Las locomociones van en el sitio con su zancada (m por ciclo) y su velocidad nativa: el cliente
    pone `timeScale = velocidad / velocidadClip`.

═══ POR QUÉ LOS QUIEBROS NO SON EL ESPEJO UNO DEL OTRO ═══

La guardia tiene la izquierda delante. Un espejo del quiebro a la izquierda empezaría y acabaría en
una guardia zurda, y el fundido con el golpe siguiente cambiaría de pie. Cada dirección se escribe
con la misma plantilla y con sus extremos en la guardia de verdad.
"""
import math

import animacion as A
from animacion import (clip, claves, muestrear, manos, muneca, pose_base, _ciclo, desplazar,
                       CLIPS, FPS, PUNO_GUARDIA_L, PUNO_GUARDIA_R, PUNO_ABAJO)

G = A.G
BASE = A.BASE


def base_g():
    return dict(pose_base(), **G)


def en(p, dx=0.0, dy=0.0):
    """La pose p desplazada en el suelo (cadera, pies y manos con IK)."""
    return desplazar(dict(p), (dx, dy))


def G_en(dx=0.0, dy=0.0):
    return en(G, dx, dy)


def golpe(d, ext=0.99, w=1.0):
    """El brazo que golpea: dirección desde el hombro, extensión (1 = recto) y peso sobre la IK."""
    return (d[0], d[1], d[2], ext, w)


SIN_GOLPE = (0.0, -1.0, 0.0, 0.99, 0.0)


def k_viaje():
    """Metros de la plantilla por metro del juego (1 en el hombre, 1/0,94 en la mujer): ver A.VIAJE."""
    return A.VIAJE


# ═══ LOCOMOCIÓN ═══
# andar 2 m/s (la marcha del juego bajo el 60 % de la palanca), trotar 5 y correr 7 (§4.2). Pasear
# (1,3 m/s) es el paso de los durmientes (1,1-1,5 m/s en quiebro-durmientes). Las zancadas caben en
# la pierna: con la cadencia alta el pie de apoyo no se va más allá de lo que la IK alcanza.
_ciclo('andar', dict(T=22, v=2.0, beta=0.56, bob=0.03, sway=0.02, yaw=9, roll=3.5, lean=6,
                     atras=0.04, h1=0.12, h2=0.08, alcance=0.07,
                     pitch_apoyo=[(0.0, 16.0), (0.13, 0.0), (0.6, 0.0), (1.0, -36.0)],
                     pitch_vuelo=[(0.0, -36.0), (0.35, -14.0), (0.8, 6.0), (1.0, 16.0)],
                     brazo=24, codo=20, codo_amp=12, yaw_pecho=8, ancho=0.092, bajar=0.035, abre=-10,
                     retraso_brazo=0.35), 'andar decidido a 2 m/s')

_ciclo('pasear', dict(T=30, v=1.3, beta=0.62, bob=0.028, sway=0.022, yaw=6, roll=3.5, lean=3,
                      atras=0.03, h1=0.1, h2=0.07, alcance=0.06,
                      pitch_apoyo=[(0.0, 16.0), (0.13, 0.0), (0.62, 0.0), (1.0, -34.0)],
                      pitch_vuelo=[(0.0, -34.0), (0.35, -12.0), (0.8, 6.0), (1.0, 16.0)],
                      brazo=17, codo=14, codo_amp=10, yaw_pecho=7, ancho=0.095, bajar=0.02, abre=-9,
                      retraso_brazo=0.35), 'paso de calle de los durmientes (1,3 m/s)')

_ciclo('trotar', dict(T=20, v=5.0, beta=0.34, bob=0.045, sway=0.012, yaw=9, roll=3, lean=17, carrera=True,
                      atras=0.16, h1=0.30, h2=0.24, alcance=0.1, adelante=0.4,
                      pitch_apoyo=[(0.0, 4.0), (0.3, 0.0), (0.5, -8.0), (1.0, -42.0)],
                      pitch_vuelo=[(0.0, -42.0), (0.3, -65.0), (0.75, -12.0), (1.0, 4.0)],
                      brazo=36, codo=88, codo_amp=12, yaw_pecho=12, ancho=0.075, bajar=0.06, abre=-10,
                      brazo_base=-6, retraso_brazo=0.2, ease_vuelo=lambda t: 1 - (1 - t) ** 1.6, mano='tensa'),
       'trote a 5 m/s')

_ciclo('correr', dict(T=18, v=7.0, beta=0.28, bob=0.05, sway=0.008, yaw=11, roll=2.5, lean=26, carrera=True,
                      atras=0.2, h1=0.42, h2=0.38, alcance=0.14, adelante=0.36,
                      pitch_apoyo=[(0.0, -6.0), (0.4, -4.0), (0.55, -10.0), (1.0, -48.0)],
                      pitch_vuelo=[(0.0, -48.0), (0.3, -70.0), (0.75, -18.0), (1.0, -6.0)],
                      brazo=55, codo=92, codo_amp=18, yaw_pecho=10, ancho=0.07, bajar=0.075, abre=-11,
                      brazo_base=-10, retraso_brazo=0.2, ease_vuelo=lambda t: 1 - (1 - t) ** 1.8, mano='abierta'),
       'carrera a 7 m/s')

# ═══ LA MARCHA GIRADA ═══ Andar hacia atrás y de lado con el cuerpo de cara al blanco (el Celador
# que rodea, el desvelado que se aparta sin dar la espalda). No son gestos del juego: el cliente los
# elige por el ángulo entre el rumbo y la velocidad (reparto.json → `marcha`).
for viejo, nuevo in (('retroceder', 'retroceder'), ('lateral_izq', 'lateral-izquierda'), ('lateral_der', 'lateral-derecha')):
    CLIPS[nuevo] = dict(CLIPS[viejo])
MARCHA = {'atras': 'retroceder', 'izquierda': 'lateral-izquierda', 'derecha': 'lateral-derecha'}

_PASEO = CLIPS['pasear']


def _con_paraguas(fr):
    """Pasear con el paraguas en la derecha: puno delante del pecho, pulgar arriba (el +Y de
    agarre_R es el eje del paraguas), la izquierda bracea."""
    p = _PASEO['fn'](fr)
    t = (fr % _PASEO['frames']) / _PASEO['frames']
    bote = 0.012 * math.cos(4 * math.pi * t)
    p['ikb_R'] = 1.0
    p['mano_R'] = (-0.16, -0.24, 1.18 + bote)
    p['codo_R'] = (-0.9, 0.35, -0.8)
    p['orm_R'] = ((1.0, 0.0, 0.0), (0.0, -1.0, 0.0))
    p['hom_R'] = (0, 0, 0)
    p['ded_R'] = A.MANOS['agarre'][:2]
    p['pul_R'] = A.MANOS['agarre'][2]
    return p


CLIPS['andar-paraguas'] = dict(fn=_con_paraguas, frames=_PASEO['frames'], bucle=True,
                               info='pasear con el paraguas (pieza aparte en agarre_R, puno con el pulgar arriba)',
                               zancada=_PASEO['zancada'], velocidad=_PASEO['velocidad'], viento=_PASEO['viento'])

# ═══ LOS TOPES DEL FALDÓN, POR MARCHA ═══ (respecto a la cadera; ver animacion.Faldon)
for _n, _t in (('pasear', 22), ('andar', 26), ('andar-paraguas', 22), ('trotar', 35), ('correr', 50), ('retroceder', 26),
               ('lateral-izquierda', 26), ('lateral-derecha', 26)):
    CLIPS[_n]['tope_faldon'] = _t


# ═══ LA GUARDIA ═══
@clip('guardia', 30, True, 'guardia de combate en bucle: puños a la barbilla, la izquierda delante (los golpes empiezan '
      'y acaban en su fotograma 0)', tope_faldon=22)
def _guardia(fr):
    p = base_g()
    p.update(A.guardia(fr / 30.0))
    return p


PALMA_L = ((0.1, -1.0, 0.05), (0.05, 0.05, 1.0))      # palma adelante, dedos arriba
PALMA_R = ((-0.1, -1.0, 0.05), (-0.05, 0.05, 1.0))


def guardia_celador(fase=0.0):
    """La guardia del Celador: la que para las Entradas de frente (±60°). Erguido, casi de frente, las
    dos manos ABIERTAS delante de la cara con las palmas hacia fuera: un muro, no los puños del
    desvelado. Se distingue a 20 m de la guardia de quien le pega."""
    s = math.sin(2 * math.pi * fase)
    c = math.cos(2 * math.pi * fase)
    p = dict(G)
    p.update({'cad': (0.004 * s, 0.03, -0.05 + 0.005 * c), 'cad_r': (0, 1.0 * s, -14 + 1.5 * s),
              'col': (2, 0, 2), 'col1': (2, 0, 2), 'pec': (0, 0, 2), 'cue': (2, 0, 4), 'cab': (-2, -0.8 * s, 4),
              'pie_L': (0.12, -0.12, 0.0), 'pier_L': (-6.0, 0.0), 'pie_R': (-0.15, 0.16, 0.0), 'pier_R': (-30.0, 0.0),
              'mano_L': (0.15, -0.44 - 0.008 * c, 1.33 + 0.008 * s), 'orm_L': ((0.25, -1.0, 0.1), (-0.1, -0.2, 1.0)),
              'codo_L': (0.9, 0.3, -0.6),
              'mano_R': (-0.13, -0.30 - 0.006 * s, 1.28 + 0.006 * c), 'orm_R': ((-0.25, -1.0, 0.1), (0.1, -0.2, 1.0)),
              'codo_R': (-0.9, 0.3, -0.6)})
    p.update(manos('tensa'))
    return p


GC = guardia_celador()


@clip('guardia-celador', 30, True, 'guardia del Celador: erguido y casi de frente, las dos manos abiertas delante de la '
      'cara (para las Entradas de frente)', tope_faldon=22)
def _guardia_celador(fr):
    p = base_g()
    p.update(guardia_celador(fr / 30.0))
    return p


# ═══ LOS GOLPES (segunda pasada) ═══
# La revisión midió, desde la guardia: jab 13 cm de recorrido y la velocidad un 99 % más baja en el
# impacto que en el fotograma anterior; cruzado con el pico dos fotogramas antes; Empellón de 16 cm con
# las palmas junto a la propia cara; Réplica que saltaba 80 cm en un fotograma y se quedaba congelada
# 12; y la respuesta, el mismo golpe al centímetro que el cruzado. Ahora cada golpe llega recto a su
# impacto (extensión del brazo, `golpe`), con recorrido de verdad (jab ≥ 35 cm, directo ≥ 45,
# Empellón ≥ 45 con los codos estirados a 1,2-1,3 m), el pico de velocidad en el fotograma que entra
# al impacto y la cabeza apartándose de la línea del puño (12 cm): desde la cámara de hombro el golpe
# no queda detrás de la propia cabeza.

@clip('seguida-1', 20, False, 'jab de izquierda (primer toque de la Tanda): carga 0-2, paso y puño recto al impacto 7, '
      'la cabeza se aparta a la derecha, vuelta a la guardia 20', impacto=(7, 9), efector='mano_L')
def _seguida_1(fr):
    d = (-0.10, -1.0, 0.16)
    # ═══ EL PASO, EN METROS ═══ La plantilla es la del hombre y la mujer la hace al 0,94: su jab llegaba a
    # 0,80 m de la raíz con el blanco a 0,9. El avance de la cadera y del pie se escala con `k_viaje()` (como
    # la raíz de los quiebros) y crece 2-4 cm para los dos.
    k = k_viaje()
    ks = claves([
        (0, G, 'suave'),
        (2, {'cad': (0.0, 0.035, -0.085), 'cad_r': (0, 0, -23), 'pec': (3, 0, 6), 'hom_L': (0, 0, 4),
             'mano_L': muneca((0.12, -0.36, 1.45), PUNO_GUARDIA_L[1]), 'golpe_L': golpe(d, 0.99, 0.0)}, 'suave'),
        (7, {'cad': (-0.03, -0.19 * k, -0.10), 'cad_r': (0, -3, -36), 'col': (7, -3, -2), 'col1': (5, -3, -2), 'pec': (4, -2, -4),
             'cue': (4, -4, 4), 'cab': (-4, -8, 10),
             'pie_L': (0.10, -0.42 * k, 0.0), 'pier_L': (-12.0, 0.0), 'pier_R': (-40.0, -18.0),
             'golpe_L': golpe(d, 0.995, 1.0), 'orm_L': PUNO_ABAJO, 'codo_L': (1.0, 0.0, -0.3), 'hom_L': (0, 0, -12),
             'mano_R': muneca((-0.13, -0.44 * k, 1.42), PUNO_GUARDIA_R[1]), 'codo_R': (-1.0, 0.3, -0.8)}, 'golpe'),
        (9, {'golpe_L': golpe(d, 0.999, 1.0)}, 'lineal'),
        (14, {'cad': (0.0, -0.02, -0.08), 'cad_r': (0, 0, -27), 'col': (6, 0, 4), 'col1': (4, 0, 4), 'pec': (3, 0, 4),
              'cue': (4, 0, 6), 'cab': (-6, 0, 8), 'pie_L': (0.10, -0.20, 0.0), 'pier_R': (-40.0, 0.0),
              'golpe_L': golpe(d, 0.99, 0.0), 'mano_L': muneca((0.11, -0.42, 1.46), PUNO_GUARDIA_L[1]),
              'orm_L': PUNO_GUARDIA_L, 'codo_L': G['codo_L'], 'hom_L': (0, 0, -2), 'mano_R': G['mano_R']}, 'sale'),
        (20, G, 'suave'),
    ], base=base_g())
    return muestrear(ks, fr)


@clip('seguida-2', 24, False, 'directo de derecha (segundo toque): carga 0-3, la cadera gira 50° y el talón de atrás pivota, '
      'puño recto al impacto 8, la cabeza se aparta a la izquierda, vuelta 24', impacto=(8, 10), efector='mano_R')
def _seguida_2(fr):
    d = (0.10, -1.0, 0.14)
    k = k_viaje()                                # ver seguida-1: el directo de la mujer se quedaba a 0,77
    piv = {'pivote_R': G['pier_R'][0]}
    ks = claves([
        (0, dict(G, **piv), 'suave'),
        (3, {'cad': (0.0, 0.05, -0.095), 'cad_r': (0, 2, -32), 'pec': (4, 0, 7), 'col1': (5, 0, 6), 'hom_R': (0, 0, 5),
             'mano_R': muneca((-0.10, -0.19, 1.43), PUNO_GUARDIA_R[1]), 'golpe_R': golpe(d, 0.99, 0.0)}, 'suave'),
        (8, {'cad': (0.02, -0.21 * k, -0.10), 'cad_r': (0, 3, 18), 'col': (8, 2, 8), 'col1': (6, 2, 10), 'pec': (4, 2, 10),
             'cue': (4, 5, -10), 'cab': (-4, 9, -16),
             'pie_L': (0.11, -0.31 * k, 0.0), 'pier_R': (-10.0, -34.0), 'rod_R': (0.25, -1.0, 0.0),
             'golpe_R': golpe(d, 0.995, 1.0), 'orm_R': PUNO_ABAJO, 'codo_R': (-1.0, 0.0, -0.3), 'hom_R': (0, 0, -14),
             'mano_L': muneca((0.28, -0.40, 1.43), PUNO_GUARDIA_L[1]), 'codo_L': (1.0, 0.2, -0.6)}, 'golpe'),
        (10, {'golpe_R': golpe(d, 0.999, 1.0)}, 'lineal'),
        (17, {'cad': (0.0, 0.01, -0.08), 'cad_r': (0, 0, -22), 'pec': (3, 0, 5), 'col1': (4, 0, 5), 'col': (6, 0, 4),
              'cue': (4, 0, 6), 'cab': (-6, 0, 6), 'golpe_R': golpe(d, 0.99, 0.0),
              'mano_R': muneca((-0.09, -0.24, 1.45), PUNO_GUARDIA_R[1]), 'orm_R': PUNO_GUARDIA_R,
              'codo_R': G['codo_R'], 'hom_R': (0, 0, 0), 'pier_R': (-36.0, 0.0), 'rod_R': G['rod_R'],
              'mano_L': G['mano_L'], 'codo_L': G['codo_L']}, 'sale'),
        (24, dict(G, **piv), 'suave'),
    ], base=dict(base_g(), **piv))
    return muestrear(ks, fr)


@clip('respuesta', 24, False, 'respuesta de la guardia del Celador: barre con el antebrazo izquierdo hacia fuera 0-4, baja '
      'el puño derecho a la cadera y sube un gancho al mentón (impacto 9) mientras se levanta de las rodillas',
      impacto=(9, 11), efector='mano_R')
def _respuesta(fr):
    d = (0.10, -1.0, 0.20)
    ks = claves([
        (0, GC, 'suave'),
        (4, {'cad': (0.0, 0.04, -0.13), 'cad_r': (0, -4, -36), 'col': (8, 0, -4), 'col1': (6, 0, -4), 'cab': (-6, 0, 10),
             'mano_L': (0.34, -0.36, 1.40), 'orm_L': ((0.9, -0.3, 0.2), (0.1, -0.3, 1.0)), 'codo_L': (1.0, 0.2, -0.3),
             'mano_R': (-0.23, -0.20, 1.12), 'orm_R': ((0.0, 1.0, 0.3), (0.0, -0.4, 1.0)), 'codo_R': (-0.9, 0.5, -0.4),
             'golpe_R': golpe(d, 0.9, 0.0), **manos('tensa', 'puno')}, 'sale'),
        (9, {'cad': (0.02, -0.36, -0.06), 'cad_r': (-4, 6, 20), 'pie_L': (0.12, -0.50, 0.0), 'col': (2, 4, 8), 'col1': (0, 4, 8), 'pec': (-2, 3, 8),
             'cue': (0, 6, -8), 'cab': (-8, 10, -12), 'pier_R': (-14.0, -28.0), 'rod_R': (0.2, -1.0, 0.0),
             'golpe_R': golpe(d, 0.93, 1.0), 'orm_R': ((0.0, 1.0, 0.2), (0.0, -0.2, 1.0)), 'codo_R': (-0.6, 0.4, -1.0),
             'mano_L': (0.24, -0.42, 1.38)}, 'golpe'),
        (11, {'golpe_R': golpe(d, 0.95, 1.0)}, 'lineal'),
        (17, {'cad': (0.0, 0.02, -0.06), 'cad_r': (0, 0, -16), 'col': GC['col'], 'col1': GC['col1'], 'pec': GC['pec'],
              'cue': GC['cue'], 'cab': GC['cab'], 'golpe_R': golpe(d, 0.9, 0.0), 'pie_L': GC['pie_L'], 'mano_R': GC['mano_R'], 'orm_R': GC['orm_R'],
              'codo_R': GC['codo_R'], 'pier_R': GC['pier_R'], 'rod_R': G['rod_R'], 'mano_L': GC['mano_L'], 'orm_L': GC['orm_L'],
              'codo_L': GC['codo_L'], **manos('tensa')}, 'sale'),
        (24, GC, 'suave'),
    ], base=dict(base_g(), **GC))
    return muestrear(ks, fr)


@clip('cierre', 30, False, 'patada circular de derecha que empuja: carga 0-3, rodilla arriba y al lado 3-6, la cadera '
      'gira ~125° sobre la bola del pie de apoyo y la pierna barre a 1,3 m, impacto 10, recoge y vuelve 30',
      impacto=(10, 12), efector='pie_R')
def _cierre(fr):
    # el pie de apoyo gira sobre su BOLA (`pivote_L`: la guiñada de la guardia): con la huella del talón
    # fija, la bola barría el suelo a 3 m/s mientras la cadera giraba
    brazos_fk = {'ikb_L': 0.0, 'ikb_R': 0.0, 'orm_L': None, 'orm_R': None}
    apoyo = {'pie_L': G['pie_L'], 'pivote_L': G['pier_L'][0]}
    ks = claves([
        (0, dict(G, **apoyo), 'suave'),
        (3, {'cad': (0.04, -0.05, -0.1), 'cad_r': (0, -4, -30), 'col': (8, -4, 4),
             'mano_R': muneca((-0.12, -0.26, 1.42), PUNO_GUARDIA_R[1]), 'pier_R': (-40.0, -22.0)}, 'suave'),
        # el pie de la patada se despega ya con la IK (sin pasar por el suelo) antes de soltarlo a la FK
        (4, {'pie_R': (-0.15, 0.14, 0.12), 'pier_R': (-30.0, -30.0), 'pier_L': (-2.0, -8.0)}, 'suave'),
        (6, {'cad': (0.07, -0.05, -0.07), 'cad_r': (0, 18, 35), 'col': (2, -6, -8), 'col1': (0, -4, -8), 'pec': (0, -2, -6),
             'cue': (4, 2, -10), 'cab': (-4, 2, -12),
             'pier_L': (40.0, -10.0), 'rod_L': (0.8, -1.0, 0.0),
             'ikp_R': 0.0, 'mus_R': (-62, 58, 0), 'rodfk_R': 125.0, 'tobfk_R': 35.0,
             'bra_L': (-65, 12, 0), 'cod_L': 115.0, 'bra_R': (-25, 25, 0), 'cod_R': 95.0, **brazos_fk}, 'sale'),
        (10, {'cad': (0.08, -0.03, -0.06), 'cad_r': (0, 38, 100), 'col': (-6, -10, -14), 'col1': (-4, -8, -14), 'pec': (-2, -6, -10),
              'cue': (4, 6, -26), 'cab': (-2, 8, -30),
              'pier_L': (92.0, -14.0), 'rod_L': (0.9, -0.5, 0.0),
              'mus_R': (10, 79, 0), 'rodfk_R': 10.0, 'tobfk_R': 45.0,
              'bra_L': (-80, -30, 0), 'cod_L': 105.0,
              'bra_R': (35, 40, 0), 'cod_R': 25.0}, 'entra'),
        (12, {'cad_r': (0, 38, 116), 'mus_R': (12, 80, 0), 'rodfk_R': 8.0}, 'lineal'),
        (16, {'cad': (0.06, -0.03, -0.06), 'cad_r': (0, 20, 60), 'col': (2, -6, -8), 'col1': (0, -4, -8), 'pec': (0, -2, -6),
              'cue': (4, 2, -14), 'cab': (-4, 2, -16),
              'pier_L': (55.0, -10.0),
              'mus_R': (-60, 58, 0), 'rodfk_R': 115.0, 'tobfk_R': 30.0,
              'bra_L': (-65, 12, 0), 'cod_L': 110.0, 'bra_R': (-20, 25, 0), 'cod_R': 90.0}, 'sale'),
        # el pie vuelve a la IK en el aire y se posa (sin arrastrarse ni hundirse)
        (20, {'cad': (0.03, 0.0, -0.07), 'cad_r': (0, 6, 10), 'pier_L': (10.0, -6.0),
              'ikp_R': 1.0, 'pie_R': (-0.15, 0.16, 0.12), 'pier_R': (-30.0, -20.0), 'rod_R': (-0.5, -1.0, 0.0)}, 'suave'),
        (23, {'cad': (0.0, 0.02, -0.08), 'cad_r': (0, 0, -22), 'col': (6, 0, 4), 'col1': (4, 0, 4), 'pec': (3, 0, 4),
              'cue': (4, 0, 6), 'cab': (-6, 0, 8), 'pier_L': G['pier_L'], 'rod_L': (0.3, -1.0, 0.0),
              'pie_R': G['pie_R'], 'pier_R': (-40.0, 0.0),
              'ikb_L': 1.0, 'ikb_R': 1.0, 'orm_L': PUNO_GUARDIA_L, 'orm_R': PUNO_GUARDIA_R,
              'mano_L': G['mano_L'], 'mano_R': G['mano_R']}, 'suave'),
        (30, dict(G, **apoyo), 'suave'),
    ], base=dict(base_g(), **apoyo))
    return muestrear(ks, fr)


@clip('empellon', 30, False, 'Empellón: empujón con las dos palmas que rompe la guardia; recoge las manos al pecho 0-6, '
      'paso largo 6-15 y los codos se estiran a la altura del pecho del blanco (impacto 15), empuja y vuelve a la guardia '
      'en su sitio (el juego no mueve al que empuja: sin raíz)', impacto=(15, 17), efector='mano_R')
def _empellon(fr):
    fin = G
    dl, dr = (0.02, -1.0, -0.07), (-0.02, -1.0, -0.07)
    ks = claves([
        (0, G, 'suave'),
        (6, {'cad': (0.0, 0.07, -0.14), 'cad_r': (-2, 0, -10), 'col': (-2, 0, 2), 'col1': (-2, 0, 2), 'pec': (-4, 0, 2),
             'cab': (-4, 0, 6), 'pie_L': (0.12, -0.12, 0.0),
             'mano_L': (0.15, -0.26, 1.25), 'mano_R': (-0.15, -0.26, 1.25), 'orm_L': PALMA_L, 'orm_R': PALMA_R,
             'codo_L': (0.9, 0.5, -0.6), 'codo_R': (-0.9, 0.5, -0.6), 'hom_L': (0, 0, 8), 'hom_R': (0, 0, -8),
             'golpe_L': golpe(dl, 0.98, 0.0), 'golpe_R': golpe(dr, 0.98, 0.0), **manos('abierta')}, 'suave'),
        (11, {'cad': (0.0, -0.30, -0.14), 'cad_r': (8, 0, -4), 'col': (6, 0, 0), 'col1': (5, 0, 0), 'pec': (2, 0, 0),
              'cab': (-8, 0, 2), 'pie_L': (0.12, -0.66, 0.0), 'pier_L': (-8.0, 0.0),
              'mano_L': (0.15, -0.52, 1.27), 'mano_R': (-0.15, -0.52, 1.27)}, 'entra2'),
        (15, {'cad': (0.0, -0.52, -0.13), 'cad_r': (14, 0, 0), 'col': (8, 0, 0), 'col1': (6, 0, 0), 'pec': (2, 0, 0),
              'cab': (-12, 0, 0), 'pie_R': (-0.15, 0.06, 0.0), 'pier_R': (-40.0, -34.0),
              'golpe_L': golpe(dl, 0.98, 1.0), 'golpe_R': golpe(dr, 0.98, 1.0), 'hom_L': (0, 0, -10), 'hom_R': (0, 0, 10),
              'codo_L': (0.9, 0.1, -0.5), 'codo_R': (-0.9, 0.1, -0.5)}, 'golpe'),
        (18, {'cad': (0.0, -0.56, -0.13), 'golpe_L': golpe(dl, 0.999, 1.0), 'golpe_R': golpe(dr, 0.999, 1.0)}, 'sale'),
        (24, {'cad': (0.0, -0.10, -0.09), 'cad_r': (4, 0, -20), 'mano_L': G_en(0.0, -0.14)['mano_L'],
              'mano_R': G_en(0.0, -0.14)['mano_R'], 'col': (6, 0, 4), 'col1': (4, 0, 4), 'pec': (3, 0, 4),
              'cab': (-6, 0, 8), 'pie_L': G['pie_L'], 'pier_R': (-40.0, 0.0),
              'golpe_L': golpe(dl, 0.98, 0.0), 'golpe_R': golpe(dr, 0.98, 0.0),
              'orm_L': PUNO_GUARDIA_L, 'orm_R': PUNO_GUARDIA_R,
              'codo_L': G['codo_L'], 'codo_R': G['codo_R'], 'hom_L': (0, 0, 0), 'hom_R': (0, 0, 0), **manos('puno')}, 'sale'),
        (30, fin, 'suave'),
    ], base=base_g())
    return muestrear(ks, fr)


@clip('replica', 30, False, 'Réplica: palmada imparable con pisotón; se enrosca 0-1 (la palma a la cadera, la otra mano '
      'apunta), estalla 2-6 con el pie de delante clavándose (impacto 6), empuja 6-10, aguanta un instante y vuelve a la '
      'guardia en su sitio: el remate del Remanso', impacto=(6, 8), efector='mano_R')
def _replica(fr):
    piv = {'pivote_R': G['pier_R'][0]}         # el talón se levanta y gira sobre la punta: no barre el suelo
    fin = dict(G, **piv)
    d = (0.06, -1.0, 0.02)
    tiembla = 0.0025 * math.sin(fr * 2.9) if 10 <= fr <= 14 else 0.0
    ks = claves([
        (0, dict(G, **piv), 'suave'),
        (2, {'cad': (0.0, 0.06, -0.15), 'cad_r': (4, 0, -44), 'col': (6, 0, -6), 'col1': (5, 0, -6), 'pec': (3, 0, -4),
             'cab': (-8, 0, 26), 'mano_R': (-0.30, 0.10, 1.06), 'orm_R': ((-0.2, 0.0, -1.0), (0.0, -1.0, 0.0)),
             'codo_R': (-0.8, 1.0, 0.0), 'golpe_R': golpe(d, 0.995, 0.0),
             'mano_L': (0.16, -0.52, 1.36), 'orm_L': PALMA_L, **manos('tensa', 'abierta')}, 'suave'),
        (4, {'mano_L': (0.38, -0.30, 1.22), 'codo_L': (1.0, 0.6, -0.2)}, 'suave'),
        (6, {'cad': (0.0, -0.28, -0.22), 'cad_r': (14, 0, 24), 'col': (10, 0, 8), 'col1': (8, 0, 8), 'pec': (6, 0, 8),
             'cue': (4, 0, -12), 'cab': (-10, 6, -16),
             'pie_L': (0.14, -0.64, 0.0), 'pier_L': (-8.0, 0.0), 'rod_L': (0.4, -1.0, 0.0),
             'pie_R': G['pie_R'], 'pier_R': (-18.0, -30.0), 'rod_R': (0.1, -1.0, 0.0),
             'golpe_R': golpe(d, 0.995, 1.0), 'orm_R': PALMA_R, 'codo_R': (-0.9, 0.2, -0.5), 'hom_R': (0, 0, -18),
             'mano_L': (0.30, 0.02, 1.08), 'orm_L': ((0.2, 0.0, -1.0), (0.0, -1.0, 0.0)), 'codo_L': (0.8, 1.0, 0.0),
             **manos('puno', 'abierta')}, 'golpe'),
        (10, {'cad': (0.0, -0.42, -0.24), 'cad_r': (18, 0, 26), 'col': (12, 0, 8), 'golpe_R': golpe(d, 0.9995, 1.0)}, 'sale'),
        (14, {'cad': (0.0, -0.43, -0.23)}, 'suave'),
        (21, {'cad': (0.0, -0.20, -0.10), 'cad_r': (4, 0, -20), 'col': (6, 0, 4), 'col1': (4, 0, 4), 'pec': (3, 0, 4),
              'cue': (4, 0, 6), 'cab': (-6, 0, 8), 'pier_R': (-40.0, 0.0), 'pie_L': G['pie_L'], 'pier_L': G['pier_L'],
              'rod_R': (-0.5, -1.0, 0.0), 'rod_L': G['rod_L'],
              'golpe_R': golpe(d, 0.995, 0.0), 'mano_R': G_en(0.0, -0.24)['mano_R'], 'orm_R': PUNO_GUARDIA_R,
              'codo_R': G['codo_R'], 'hom_R': (0, 0, 0), 'mano_L': G_en(0.0, -0.24)['mano_L'], 'orm_L': PUNO_GUARDIA_L,
              'codo_L': G['codo_L'], **manos('puno')}, 'sale'),
        (30, fin, 'suave'),
    ], base=dict(base_g(), **piv))
    p = muestrear(ks, fr)
    if tiembla:
        g = p['golpe_R']
        p['golpe_R'] = (g[0] + tiembla, g[1], g[2] + tiembla, g[3], g[4])
    return p


# ═══ LO QUE VIAJA SOBRE LA RAÍZ DEL JUEGO ═══
@clip('entrada', 24, False, 'Entrada: acometida volada de 5,5 m en 400 ms (la raíz del juego, en línea recta) que acaba en '
      'un directo de derecha: impulso con el pie de atrás clavado 0-2, vuelo bajo 2-10, apoya el pie de delante 11 y el '
      'puño llega al blanco en 12; guardia en el sitio nuevo 24', impacto=(12, 14), raiz=True,
      raiz_lineal=(12, (0.0, -5.5)), efector='mano_R', tope_faldon=55, vuelo=[(2, 10)])
def _entrada(fr):
    k = k_viaje()
    L = 5.5 * k
    fin = G_en(0.0, -L)
    d = (0.10, -1.0, 0.24)
    y = lambda f: -L * min(1.0, f / 12.0)          # la raíz del juego en el fotograma f
    ks = claves([
        (0, G, 'suave'),
        (1, {'cad': (0.0, -0.18, -0.16), 'cad_r': (22, 0, -24), 'col': (10, 0, 2), 'col1': (8, 0, 0), 'cab': (-18, 0, 8),
             'pie_L': (0.10, -0.40, 0.10), 'pier_L': (-6.0, -10.0),
             'mano_R': muneca((-0.13, -0.76, 1.30), PUNO_GUARDIA_R[1]), 'mano_L': muneca((0.12, -0.90, 1.32), PUNO_GUARDIA_L[1]),
             'golpe_R': golpe(d, 0.99, 0.0), 'hom_R': (0, 0, 6)}, 'suave'),
        (2, {'cad': (0.0, -0.46, -0.20), 'cad_r': (32, 0, -16), 'col': (12, 0, 0), 'col1': (8, 0, 0), 'cab': (-26, 0, 6),
             'pie_L': (0.10, -0.95, 0.18), 'pier_L': (-6.0, -20.0), 'pier_R': (-40.0, -40.0),
             'mano_R': muneca((-0.20, -1.10, 1.14), PUNO_GUARDIA_R[1]), 'mano_L': muneca((0.14, -1.24, 1.24), PUNO_GUARDIA_L[1])},
         'lineal'),
        (4, {'cad': (0.0, y(4) + 0.05, -0.12), 'cad_r': (30, 0, -20), 'col': (10, 0, 2), 'col1': (6, 0, 0),
             'pie_L': (0.10, y(4) - 0.45, 0.22), 'pie_R': (-0.16, y(4) + 0.55, 0.34), 'pier_R': (-10.0, 30.0),
             'rod_L': (0.3, -1.0, 0.0), 'rod_R': (-0.3, -1.0, 0.0),
             'mano_L': muneca((0.15, y(4) - 0.95, 1.24), PUNO_GUARDIA_L[1]),
             'mano_R': muneca((-0.15, y(4) - 0.78, 1.20), PUNO_GUARDIA_R[1])}, 'lineal'),
        (7, {'cad': (0.0, y(7) + 0.02, -0.10), 'cad_r': (26, 0, -22),
             'pie_L': (0.11, y(7) - 0.52, 0.20), 'pie_R': (-0.16, y(7) + 0.40, 0.30),
             'mano_L': muneca((0.15, y(7) - 0.95, 1.26), PUNO_GUARDIA_L[1]),
             'mano_R': muneca((-0.15, y(7) - 0.78, 1.22), PUNO_GUARDIA_R[1])}, 'lineal'),
        (10, {'cad': (0.0, y(10) - 0.02, -0.14), 'cad_r': (18, 0, -28), 'pie_L': (0.12, -L - 0.30, 0.12), 'pier_L': (-10.0, 10.0),
              'pie_R': (-0.16, y(10) + 0.42, 0.18), 'pier_R': (-30.0, -20.0),
              'mano_L': muneca((0.15, y(10) - 0.85, 1.34), PUNO_GUARDIA_L[1]),
              'mano_R': muneca((-0.14, y(10) - 0.66, 1.32), PUNO_GUARDIA_R[1]), 'golpe_R': golpe(d, 0.99, 0.3)}, 'sale2'),
        # (las manos van con el cuerpo: sin su sitio en el 11, la derecha se quedaba donde estaba en el 10 mientras el
        # cuerpo avanzaba 0,9 m y el brazo apuntaba atrás un fotograma; el húmero daba media vuelta en dos. Ahora el
        # puño se recoge a la cadera en el 11 y sale de ahí al blanco en el 12: el pico de velocidad sigue en el impacto)
        (11, {'cad': (0.0, -L + 0.02, -0.15), 'pie_L': (0.12, -L - 0.30, 0.0), 'pier_L': (-10.0, 0.0),
              'mano_L': muneca((0.15, -L + 0.02 - 0.85, 1.36), PUNO_GUARDIA_L[1]),
              'mano_R': muneca((-0.33, -L + 0.02 + 0.10, 1.04), (-0.2, -1.0, 0.1)), 'codo_R': (-0.5, 0.8, -0.4)}, 'lineal'),
        # impacto: el pie de delante clavado desde el 10, la cadera por delante de la raíz (el cuerpo aún
        # lleva el impulso), directo de derecha a la barbilla del blanco
        (12, {'cad': (0.02, -L - 0.12, -0.12), 'cad_r': (10, 3, 8), 'col': (10, 2, 4), 'col1': (8, 2, 6), 'pec': (6, 2, 8),
              'cue': (4, 4, -8), 'cab': (-6, 7, -12),
              'pier_L': (-8.0, 0.0), 'pie_R': (-0.18, -L + 0.52, 0.0), 'pier_R': (-14.0, -34.0), 'rod_R': (0.2, -1.0, 0.0),
              'golpe_R': golpe(d, 0.995, 1.0), 'orm_R': PUNO_ABAJO, 'codo_R': (-1.0, 0.0, -0.3), 'hom_R': (0, 0, -16),
              'mano_L': muneca((0.30, -L - 0.56, 1.42), PUNO_GUARDIA_L[1]), 'codo_L': (1.0, 0.2, -0.6)}, 'golpe'),
        (14, {'golpe_R': golpe(d, 0.999, 1.0)}, 'lineal'),
        (16, {'mano_L': muneca((0.30, -L - 0.56, 1.44), PUNO_GUARDIA_L[1])}, 'suave'),
        (19, {'cad': (0.0, -L - 0.02, -0.085), 'cad_r': (2, 0, -20), 'col': (6, 0, 4), 'col1': (4, 0, 4), 'pec': (3, 0, 5),
              'cue': (4, 0, 6), 'cab': (-6, 0, 8), 'pie_R': (-0.16, -L + 0.20, 0.0), 'pier_R': (-40.0, 0.0),
              'rod_R': (-0.5, -1.0, 0.0), 'golpe_R': golpe(d, 0.99, 0.0),
              'mano_R': fin['mano_R'], 'orm_R': PUNO_GUARDIA_R, 'codo_R': G['codo_R'], 'hom_R': (0, 0, 0),
              'mano_L': fin['mano_L'], 'codo_L': G['codo_L']}, 'sale'),
        (24, fin, 'suave'),
    ], base=base_g())
    return muestrear(ks, fr)


@clip('avance', 18, False, 'avance: la acometida contra la bala, vuelo de 10 m en 400 ms (la raíz del juego) que aterriza '
      'en la palmada de la Réplica (impacto 12)', raiz=True, raiz_lineal=(12, (0.0, -10.0)), impacto=(12, 13),
      efector='mano_R', tope_faldon=60, vuelo=[(2, 11)])
def _avance(fr):
    k = k_viaje()
    L = 10.0 * k
    y = lambda f: -L * min(1.0, f / 12.0)
    d = (0.06, -1.0, 0.02)
    ks = claves([
        (0, G, 'suave'),
        # (las manos van con el cuerpo, que se lanza 30 cm: se quedaban en la guardia de antes y el brazo apuntaba atrás)
        (1, {'cad': (0.0, -0.30, -0.22), 'cad_r': (30, 0, -16), 'col': (12, 0, 0), 'col1': (8, 0, 0), 'cab': (-22, 0, 8),
             'pie_L': (0.10, -0.55, 0.12), 'mano_L': G_en(0.0, -0.36)['mano_L'], 'mano_R': G_en(0.0, -0.36)['mano_R']}, 'suave'),
        (3, {'cad': (0.0, y(3) + 0.2, 0.0), 'cad_r': (48, 0, -6), 'col': (10, 0, 0), 'col1': (6, 0, 0), 'cab': (-34, 0, 4),
             'ikp_L': 0.0, 'ikp_R': 0.0, 'mus_L': (-40, 0, 6), 'rodfk_L': 70.0, 'tobfk_L': 20.0,
             'mus_R': (30, 0, -4), 'rodfk_R': 40.0, 'tobfk_R': 40.0,
             'ikb_L': 0.0, 'ikb_R': 0.0, 'orm_L': None, 'orm_R': None,
             'bra_L': (-120, -10, 0), 'cod_L': 30.0, 'bra_R': (55, 34, 0), 'cod_R': 25.0, **manos('abierta', 'puno')}, 'sale'),
        (7, {'cad': (0.0, y(7), 0.14), 'cad_r': (58, 0, 0), 'col': (4, 0, 0), 'col1': (2, 0, 0), 'cab': (-40, 0, 0),
             'mus_L': (-20, 0, 6), 'rodfk_L': 50.0, 'mus_R': (40, 0, -4), 'rodfk_R': 60.0,
             'bra_L': (-150, -8, 0), 'cod_L': 10.0, 'bra_R': (-150, 8, 0), 'cod_R': 25.0}, 'lineal'),
        (10, {'cad': (0.0, y(10) + 0.05, -0.02), 'cad_r': (30, 0, 10), 'col': (8, 0, 4), 'cab': (-24, 0, -6),
              'mus_L': (-70, 0, 6), 'rodfk_L': 60.0, 'tobfk_L': 0.0, 'mus_R': (10, 0, -4), 'rodfk_R': 90.0,
              'bra_L': (-60, -30, 0), 'cod_L': 60.0, 'ikb_R': 1.0, 'mano_R': (-0.30, y(10) - 0.30, 1.25),
              'codo_R': (-0.9, 0.3, -0.4), 'orm_R': PALMA_R, 'golpe_R': golpe(d, 0.99, 0.0)}, 'lineal'),
        (11, {'cad': (0.0, -L - 0.10, -0.12), 'ikp_L': 1.0, 'ikp_R': 1.0,
              'pie_L': (0.14, -L - 0.62, 0.14), 'pier_L': (-8.0, 12.0), 'pie_R': (-0.18, -L + 0.10, 0.20), 'pier_R': (-18.0, -30.0),
              'rod_L': (0.4, -1.0, 0.0), 'rod_R': (0.1, -1.0, 0.0)}, 'lineal'),
        (12, {'cad': (0.0, -L - 0.30, -0.24), 'cad_r': (14, 0, 22), 'col': (10, 0, 8), 'col1': (8, 0, 8), 'pec': (6, 0, 8),
              'cab': (-10, 6, -14), 'ikp_L': 1.0, 'ikp_R': 1.0,
              'pie_L': (0.14, -L - 0.62, 0.0), 'pier_L': (-8.0, 0.0), 'rod_L': (0.4, -1.0, 0.0),
              'pie_R': (-0.18, -L + 0.18, 0.0), 'pier_R': (-18.0, -30.0), 'rod_R': (0.1, -1.0, 0.0),
              'ikb_L': 1.0, 'ikb_R': 1.0, 'golpe_R': golpe(d, 0.995, 1.0), 'orm_R': PALMA_R, 'codo_R': (-0.9, 0.2, -0.5),
              'mano_L': (0.28, -L + 0.02, 1.08), 'orm_L': ((0.2, 0.0, -1.0), (0.0, -1.0, 0.0)), 'codo_L': (0.8, 1.0, 0.0),
              **manos('puno', 'abierta')}, 'golpe'),
        (18, {'cad': (0.0, -L - 0.32, -0.22), 'golpe_R': golpe(d, 0.999, 1.0)}, 'suave'),
    ], base=base_g())
    return muestrear(ks, fr)


# ═══ EL QUIEBRO (segunda pasada) ═══
# 450 ms en el juego (9 tics): el cuerpo viaja 3,5 m en los 6 primeros tics (300 ms, 9 fotogramas), en
# línea recta y a velocidad fija, y es intocable los 250 primeros. La revisión: los dos pies seguían en
# el suelo en f1-f2 mientras el cuerpo avanzaba 0,7 m (patinando a 20-29 m/s), el pie de llegada
# resbalaba 35 cm en un fotograma, el «salto rasante» era una sentadilla con 40° y un brazo en la
# cara, y el de atrás, un sonámbulo con los brazos al frente. Ahora, sobre la raíz del juego:
#   · 0-2: IMPULSO con el pie de atrás CLAVADO en la calle; la cabeza arranca antes que la cadera;
#   · 2-8: vuelo rasante TENDIDO hacia donde se quiebra (60-65° de lado, 60° hacia delante), las
#     piernas recogidas y un brazo abriendo camino: la silueta del intocable es otra, se lee a 20 m;
#   · 9: aterriza cuando la raíz ya ha frenado (el juego para en el tic 6), primero el pie de ese lado;
#   · 9-14: amortigua y vuelve a la guardia en el sitio nuevo.
# Hacia atrás la inclinación se queda en 40° con un giro de hombros: un arco hacia atrás más hondo es
# el gesto emblema de la franquicia que el diseño aparta (§1).
def _quiebro(ux, uy, torpe=False):
    """Claves del quiebro hacia (ux, uy) (unitario, en el suelo) sobre la raíz del juego (3,5 m)."""
    k = k_viaje()
    D = 3.5 * k
    fin = G_en(D * ux, D * uy)
    lado = 1 if ux > 0.3 else (-1 if ux < -0.3 else 0)
    atras = uy > 0.7

    def r(f):                                    # la raíz del juego
        a = min(1.0, f / 9.0)
        return (D * ux * a, D * uy * a)

    def P(f, dx=0.0, dy=0.0, z=0.0):
        x, y = r(f)
        return (x + dx, y + dy, z)
    guardia_brazos = {k_: G[k_] for k_ in ('ikb_L', 'ikb_R', 'orm_L', 'orm_R', 'codo_L', 'codo_R')}
    fuerza = 0.35 if torpe else 1.0
    ks = [(0, G, 'suave')]
    if lado:
        s = 'L' if lado > 0 else 'R'             # el pie y el brazo del lado hacia el que se va
        o = 'R' if lado > 0 else 'L'
        pie0 = {q: G['pie_' + q] for q in 'LR'}
        incl = [0.0, 22.0, 45.0, 62.0, 64.0, 58.0, 44.0, 30.0, 18.0]    # grados de lado, por fotograma
        incl = [x * fuerza + (8.0 if torpe and i > 2 else 0.0) for i, x in enumerate(incl)]

        def tronco(g):
            a = g * lado
            return {'cad_r': (6, a * 0.46, -26 + 12 * lado * min(1, g / 45.0)), 'col': (4, a * 0.2, 0), 'col1': (3, a * 0.18, 0),
                    'pec': (2, a * 0.12, 0), 'cue': (2, -a * 0.1, 0), 'cab': (-4, -a * 0.12, 6)}
        # impulso: el pie de fuera (el de atrás respecto al quiebro) clavado; la cadera baja y se echa
        ks.append((1, dict(tronco(incl[1]), **{'cad': (0.20 * lado, 0.02, -0.14), 'pie_' + o: pie0[o],
                                                 'pie_' + s: (pie0[s][0] + 0.18 * lado, pie0[s][1], 0.10),
                                                 'codo_' + s: (1.0 * lado, 0.25, -0.5)}), 'sale2'))
        ks.append((2, dict(tronco(incl[2]), **{'cad': (0.46 * lado, 0.03, -0.26), 'pie_' + o: pie0[o],
                                                 'pier_' + o: (G['pier_' + o][0], -42.0),
                                                 'pie_' + s: (pie0[s][0] + 0.55 * lado, pie0[s][1] - 0.05, 0.22),
                                                 'ikb_L': 0.0, 'ikb_R': 0.0, 'orm_L': None, 'orm_R': None,
                                                 'bra_' + s: (-70, -60 * lado, 0), 'cod_' + s: 35.0,
                                                 'bra_' + o: (-88, 40 * lado, 0), 'cod_' + o: 95.0,
                                                 **manos('abierta' if torpe else 'tensa')}), 'lineal'))
        for f, dz in ((4, -0.26), (6, -0.28)):
            hx = r(f)[0] - 0.08 * lado
            ks.append((f, dict(tronco(incl[f]), **{
                'cad': (hx, 0.03, dz), 'pie_' + s: (hx + 0.44 * lado, -0.18, 0.20), 'pie_' + o: (hx - 0.52 * lado, 0.22, 0.30),
                'pier_' + s: (10.0 * lado, 10.0), 'pier_' + o: (-10.0 * lado, -30.0),
                'rod_' + s: (0.6 * lado, -1.0, 0.4), 'rod_' + o: (-0.3 * lado, -1.0, -0.2),
                'bra_' + s: (-60 - (30 if torpe else 0), -75 * lado, 0), 'cod_' + s: 25.0,
                'bra_' + o: (-90 + (50 if torpe else 0), 42 * lado, 0), 'cod_' + o: 95.0 - (50 if torpe else 0)}), 'lineal'))
        hx = r(8)[0] - 0.12 * lado
        ks.append((8, dict(tronco(incl[7]), **{'cad': (hx, 0.02, -0.22), 'pie_' + s: (fin['pie_' + s][0], fin['pie_' + s][1], 0.06),
                                                 'pie_' + o: (hx - 0.45 * lado, 0.24, 0.20), 'pier_' + s: fin['pier_' + s]}), 'sale2'))
        # aterriza: la raíz ya está quieta (el juego paró en el tic 6)
        at = dict(tronco(incl[8]), **{'cad': (fin['cad'][0] - 0.02 * lado, fin['cad'][1], -0.20),
                                      'pie_' + s: fin['pie_' + s],
                                      'pie_' + o: (fin['pie_' + o][0] - 0.10 * lado, fin['pie_' + o][1] + 0.04, 0.08)})
        at.update(guardia_brazos)
        at['codo_' + s] = (1.0 * lado, 0.25, -0.6)
        at['mano_L'] = (fin['mano_L'][0] + 0.03, fin['mano_L'][1] - 0.06, fin['mano_L'][2] - 0.05)
        at['mano_R'] = (fin['mano_R'][0] - 0.03, fin['mano_R'][1] - 0.06, fin['mano_R'][2] - 0.05)
        at.update(manos('puno'))
        ks.append((10, at, 'sale'))
        asienta = dict(fin)
        asienta['cad'] = (fin['cad'][0] + 0.02 * lado, fin['cad'][1], -0.13)
        if torpe:
            # el torpe no llega limpio: da un paso de más para no caerse
            asienta['pie_' + o] = (fin['pie_' + o][0] + 0.12 * lado, fin['pie_' + o][1] + 0.08, 0.0)
            asienta['cab'] = (-14, 10 * lado, 12)
        ks.append((12 if not torpe else 13, asienta, 'sale'))
        ks.append((14 if not torpe else 16, fin, 'suave'))
        return claves(ks, base=base_g())
    # hacia delante o hacia atrás
    sgn = -1 if not atras else 1                 # -1: delante (-Y)
    if not atras:
        s, o = 'L', 'R'                          # llega primero el de delante; empuja el de atrás
        incl = [0.0, 26.0, 48.0, 62.0, 64.0, 58.0, 44.0, 28.0, 16.0]
        giro = [0.0] * 9
    else:
        s, o = 'R', 'L'                          # hacia atrás: llega primero el de atrás; empuja el de delante
        incl = [0.0, -14.0, -26.0, -36.0, -40.0, -38.0, -30.0, -18.0, -8.0]
        giro = [0.0, 14.0, 30.0, 44.0, 50.0, 46.0, 34.0, 20.0, 8.0]
    incl = [x * fuerza for x in incl]
    pie0 = {q: G['pie_' + q] for q in 'LR'}

    def tronco(i):
        g = incl[i]
        return {'cad_r': (g * 0.5, 0, -26 + giro[i]), 'col': (g * 0.2 + 2, 0, 2), 'col1': (g * 0.16 + 2, 0, 2),
                'pec': (g * 0.1, 0, 2), 'cue': (-g * 0.1, 0, 2), 'cab': (-g * 0.2 - 4, 0, 4)}

    def brazos_cubren(hy, i):
        # los antebrazos delante de la cara, que va con la cadera (y no con la raíz, que la adelanta): al
        # zambullirse, la cara está medio metro por delante de la cadera y bajando; hacia atrás, encima
        g = incl[i] / 70.0 if not atras else 0.0
        dy = -0.30 - 0.40 * g if not atras else -0.34
        z = 1.40 - 0.42 * g if not atras else 1.30
        return {'mano_L': muneca((0.15, hy + dy - 0.08, z), PUNO_GUARDIA_L[1]),
                'mano_R': muneca((-0.13, hy + dy, z - 0.04), PUNO_GUARDIA_R[1])}
    ks.append((1, dict(tronco(1), **{'cad': (0.0, 0.14 if atras else -0.18, -0.14), 'pie_' + o: pie0[o],
                                      'pie_' + s: (pie0[s][0], pie0[s][1] + (0.22 if atras else -0.22), 0.10)},
                     **brazos_cubren(0.14 if atras else -0.18, 1)), 'sale2'))
    ks.append((2, dict(tronco(2), **{'cad': (0.0, 0.34 if atras else -0.36, -0.24), 'pie_' + o: pie0[o],
                                      'pier_' + o: (G['pier_' + o][0], -42.0),
                                      'pie_' + s: (pie0[s][0], pie0[s][1] + (0.60 if atras else -0.62), 0.22)},
                     **brazos_cubren(0.34 if atras else -0.36, 2)), 'lineal'))
    for f, dz in ((4, -0.28 if atras else -0.34), (6, -0.30 if atras else -0.36)):
        hy = r(f)[1] - 0.05 * sgn
        ks.append((f, dict(tronco(f), **{
            'cad': (0.0, hy, dz), 'pie_' + s: (pie0[s][0], hy + (0.40 if atras else -0.42), 0.30),
            'pie_' + o: (pie0[o][0], hy + (-0.45 if atras else 0.55), 0.32),
            'rod_L': (0.3, -1.0, 0.0), 'rod_R': (-0.3, -1.0, 0.0)}, **brazos_cubren(hy, f)), 'lineal'))
    hy = r(8)[1] - 0.10 * sgn
    ks.append((8, dict(tronco(7), **{'cad': (0.0, hy, -0.24), 'pie_' + s: (fin['pie_' + s][0], fin['pie_' + s][1], 0.06),
                                      'pier_' + s: fin['pier_' + s], 'pie_' + o: (fin['pie_' + o][0], hy + (-0.40 if atras else 0.45), 0.20)},
                     **brazos_cubren(hy, 7)), 'sale2'))
    at = dict(tronco(8), **{'cad': (0.0, fin['cad'][1] + 0.02 * sgn, -0.20),
                            'pie_' + s: fin['pie_' + s],
                            'pie_' + o: (fin['pie_' + o][0], fin['pie_' + o][1] + 0.18 * sgn, 0.10)})
    at.update(guardia_brazos)
    at['mano_L'] = (fin['mano_L'][0], fin['mano_L'][1] - 0.05, fin['mano_L'][2] - 0.06)
    at['mano_R'] = (fin['mano_R'][0], fin['mano_R'][1] - 0.05, fin['mano_R'][2] - 0.06)
    ks.append((10, at, 'sale'))
    asienta = dict(fin)
    asienta['cad'] = (fin['cad'][0], fin['cad'][1] - 0.02 * sgn, -0.13)
    if torpe:
        asienta['pie_' + o] = (fin['pie_' + o][0], fin['pie_' + o][1] + 0.12 * -sgn, 0.0)
        asienta['cab'] = (-16, 8, 10)
    ks.append((12 if not torpe else 13, asienta, 'sale'))
    ks.append((14 if not torpe else 16, fin, 'suave'))
    return claves(ks, base=base_g())


_CACHE_QUIEBRO = {}


def _clip_quiebro(nombre, ux, uy, info, torpe=False):
    def fn(fr, ux=ux, uy=uy, torpe=torpe):
        clave = (ux, uy, torpe, A.VIAJE)
        if clave not in _CACHE_QUIEBRO:
            _CACHE_QUIEBRO[clave] = _quiebro(ux, uy, torpe)
        return muestrear(_CACHE_QUIEBRO[clave], fr)
    CLIPS[nombre] = dict(fn=fn, frames=16 if torpe else 14, bucle=False, raiz=True, info=info,
                         raiz_lineal=(9, (3.5 * ux, 3.5 * uy)), tope_faldon=50, vuelo=[(3, 9 if torpe else 8)])
    if not torpe:
        CLIPS[nombre]['intocable_ms'] = (0, 250)


_clip_quiebro('quiebro-izquierda', 1.0, 0.0, 'quiebro a su izquierda: impulso con el pie derecho clavado 0-2, vuelo rasante '
              'tendido 60° de lado 2-8, aterriza con la izquierda cuando la raíz ha frenado (9-10); 3,5 m en 300 ms, intocable 250')
_clip_quiebro('quiebro-derecha', -1.0, 0.0, 'quiebro a su derecha: el mismo, hacia el otro lado (no es el espejo: acaba en la '
              'guardia de la izquierda delante)')
_clip_quiebro('quiebro-atras', 0.0, 1.0, 'quiebro hacia atrás: impulso con el pie de delante, salto bajo girando los hombros '
              '(40° hacia atrás, no más: el arco hondo es de la franquicia), los antebrazos cubren la cara')
_clip_quiebro('quiebro-delante', 0.0, -1.0, 'quiebro hacia delante: zambullida por debajo del golpe, 60° hacia delante con '
              'la cabeza por delante y los antebrazos cubriéndola')
_clip_quiebro('quiebro-torpe', 1.0, 0.0, 'quiebro torpe (el tercero seguido) a su izquierda: se inclina poco, bracea y da un '
              'paso de más al llegar; sin la postura del intocable', torpe=True)
_clip_quiebro('quiebro-torpe-derecha', -1.0, 0.0, 'quiebro torpe a su derecha', torpe=True)
_clip_quiebro('quiebro-torpe-atras', 0.0, 1.0, 'quiebro torpe hacia atrás', torpe=True)
_clip_quiebro('quiebro-torpe-delante', 0.0, -1.0, 'quiebro torpe hacia delante', torpe=True)


# ═══ ENCAJAR: TOCADO Y DERRIBADO, DE FRENTE Y DE ESPALDAS (segunda pasada) ═══
# Sólo existían de frente: un golpe por la espalda (el juego de la Ligera) echaba al cuerpo hacia su
# atacante. Van por `porDireccion` con la dirección del EMPUJE respecto a la cara: «atras» (me pegan
# de frente) → la versión de frente; «delante» (me pegan por la espalda) → la de espaldas.
@clip('tocado', 18, False, 'golpe recibido de frente: latigazo de la cabeza 0-2, paso atrás con el pie derecho 2-8, '
      'recupera la guardia en su sitio hasta 18 (600 ms); sin raíz (el empujón, si lo hay, lo pone el juego)')
def _tocado(fr):
    fin = G
    ks = claves([
        (0, G, 'suave'),
        (2, {'cad': (0.0, 0.07, -0.05), 'cad_r': (-6, 0, -18), 'col': (-8, 0, 4), 'col1': (-8, 0, 4), 'pec': (-8, 0, 4),
             'cue': (-14, 0, 6), 'cab': (-24, 8, 16), 'mano_L': muneca((0.20, -0.30, 1.42), PUNO_GUARDIA_L[1]),
             'mano_R': muneca((-0.18, -0.16, 1.40), PUNO_GUARDIA_R[1]), **manos('tensa')}, 'sale'),
        (8, {'cad': (0.0, 0.18, -0.09), 'cad_r': (-2, 0, -20), 'pie_R': (-0.16, 0.48, 0.0), 'pier_R': (-40.0, 0.0),
             'col': (-2, 0, 2), 'col1': (-4, 0, 2), 'pec': (-2, 0, 2), 'cue': (-6, 0, 4), 'cab': (-10, 4, 8),
             'mano_L': muneca((0.14, -0.26, 1.42), PUNO_GUARDIA_L[1]), 'mano_R': muneca((-0.12, -0.08, 1.42), PUNO_GUARDIA_R[1])},
         'sale'),
        (18, dict(fin, **manos('puno')), 'suave'),
    ], base=base_g())
    return muestrear(ks, fr)


@clip('tocado-espalda', 20, False, 'golpe recibido por la espalda: la cadera sale hacia delante y la cabeza atrás 0-2, '
      'traspiés hacia delante con el pie derecho 2-9, se gira a medias buscando al que pega y vuelve a la guardia en su '
      'sitio (20); sin raíz')
def _tocado_espalda(fr):
    fin = G
    ks = claves([
        (0, G, 'suave'),
        (2, {'cad': (0.0, -0.10, -0.06), 'cad_r': (-8, 0, -22), 'col': (-10, 0, 2), 'col1': (-8, 0, 2), 'pec': (-6, 0, 2),
             'cue': (-10, 0, 0), 'cab': (-18, 0, -6), 'ikb_L': 0.0, 'ikb_R': 0.0, 'orm_L': None, 'orm_R': None,
             'bra_L': (30, -40, 0), 'cod_L': 40.0, 'bra_R': (30, 40, 0), 'cod_R': 40.0, **manos('abierta')}, 'sale'),
        (9, {'cad': (0.0, -0.30, -0.12), 'cad_r': (14, 0, -30), 'col': (10, 0, -4), 'col1': (8, 0, -4), 'pec': (4, 0, 0),
             'cue': (6, 0, 10), 'cab': (-8, 0, 20), 'pie_R': (-0.14, -0.50, 0.0), 'pier_R': (-10.0, 0.0),
             'bra_L': (-30, -45, 0), 'cod_L': 50.0, 'bra_R': (-20, 45, 0), 'cod_R': 50.0}, 'sale'),
        (14, {'cad': (0.0, -0.18, -0.09), 'cad_r': (4, 0, -24), 'col': (4, 0, 2), 'col1': (4, 0, 2), 'pec': (2, 0, 2),
              'cue': (4, 0, 6), 'cab': (-6, 0, 10),
              'ikb_L': 1.0, 'ikb_R': 1.0, 'orm_L': PUNO_GUARDIA_L, 'orm_R': PUNO_GUARDIA_R,
              'mano_L': G_en(0.0, -0.22)['mano_L'], 'mano_R': G_en(0.0, -0.22)['mano_R'], **manos('puno')}, 'sale'),
        (20, fin, 'suave'),
    ], base=base_g())
    return muestrear(ks, fr)


def _tumbado():
    return A._tumbado()


def _caer_claves(tb):
    """La caída de espaldas hasta quedar tumbado en `tb` (la cadera 0,6 m detrás): latigazo 0-2, se va
    atrás 2-7, la espalda da en el suelo en 11 y rebota un poco (13)."""
    return [
        (0, G, 'suave'),
        (2, {'cad': (0.0, 0.08, -0.06), 'cad_r': (-8, 0, -12), 'col': (-10, 0, 4), 'col1': (-10, 0, 2), 'pec': (-8, 0, 0),
             'cue': (-14, 0, 0), 'cab': (-24, 6, 10), 'ikb_L': 0.0, 'ikb_R': 0.0, 'orm_L': None, 'orm_R': None,
             'bra_L': (30, -30, 0), 'bra_R': (25, 30, 0), 'cod_L': 30.0, 'cod_R': 30.0, **manos('abierta')}, 'sale'),
        (7, {'cad': (0.0, 0.30, -0.42), 'cad_r': (-38, 0, 4),
             'pie_L': (0.13, 0.02, 0.0), 'pie_R': (-0.13, -0.10, 0.16), 'pier_L': (8.0, 22.0), 'pier_R': (-8.0, 30.0),
             'rod_L': (0.25, -1.0, 0.3), 'rod_R': (-0.25, -1.0, 0.5),
             'col': (4, 0, 2), 'col1': (6, 0, 0), 'pec': (4, 0, 0), 'cue': (10, 0, 0), 'cab': (6, 0, 6),
             'bra_L': (-40, -45, 0), 'bra_R': (-30, 45, 0), 'cod_L': 40.0, 'cod_R': 35.0}, 'entra2'),
        (11, dict(tb, cad=(0.0, 0.58, -0.84), cad_r=(-86, 0, 4), cue=(20, 0, 0), cab=(12, 0, 8),
                  pie_L=(0.15, -0.10, 0.12), pie_R=(-0.13, -0.02, 0.14), ikb_L=0.0, ikb_R=0.0, orm_L=None, orm_R=None,
                  bra_L=(10, -55, 0), bra_R=(10, 55, 0), cod_L=20.0, cod_R=20.0), 'entra2'),
        (13, {'cad': (0.0, 0.60, -0.845), 'cue': (12, 0, 0), 'cab': (2, 0, 10), 'pie_L': (0.15, -0.14, 0.03),
              'pie_R': (-0.13, -0.06, 0.04)}, 'sale'),
    ]


@clip('caer', 20, False, 'cae de espaldas y se queda tumbado (sin levantarse): latigazo 0-2, la espalda en el suelo en 11; '
      'su último fotograma es el primero de desconectado y de levantarse', raiz=True, contacto=[(12, 20)], cae_en=11,
      vuelo=[(3, 10)])
def _caer(fr):
    tb = desplazar(_tumbado(), (0.0, 0.60))
    return muestrear(claves(_caer_claves(tb) + [(20, dict(tb, ikb_L=1.0, ikb_R=1.0, **manos('apoyo')), 'suave')]), fr)


def _levantarse_claves(t0, tb, fin):
    """Del tumbado `tb` a la guardia `fin` en 24 fotogramas desde t0: se sienta con la mano derecha
    apoyada detrás (0-6), recoge los pies y empuja (6-10), se echa sobre los pies en cuclillas (13) y se
    alza a la guardia (24). Siempre toca algo el suelo: las nalgas, la mano o los pies (la revisión vio
    levitar a la primera versión 4 fotogramas con la cadera subiendo)."""
    y0 = tb['cad'][1]
    return [
        (t0, tb, 'suave'),
        (t0 + 6, {'cad': (0.0, y0 - 0.02, -0.855), 'cad_r': (-44, 0, 6), 'col': (12, 0, 0), 'col1': (8, 0, 0), 'pec': (6, 0, 0),
                  'cue': (8, 0, 0), 'cab': (0, 0, 0),
                  'pie_L': (0.21, y0 - 0.48, 0.0), 'pier_L': (22.0, 0.0), 'rod_L': (0.8, -0.8, 0.8),
                  'pie_R': (-0.21, y0 - 0.44, 0.0), 'pier_R': (-22.0, 0.0), 'rod_R': (-0.8, -0.8, 0.8),
                  'ikb_R': 1.0, 'mano_R': (-0.32, y0 + 0.16, 0.0), 'orm_R': ((0, 0, -1), (-0.4, 1.0, 0)), 'codo_R': (-1.0, 0.8, 0.0),
                  'ikb_L': 0.0, 'orm_L': None, 'bra_L': (-35, -45, 0), 'cod_L': 40.0, **manos('relajada', 'apoyo')}, 'suave'),
        (t0 + 10, {'cad': (0.0, y0 - 0.14, -0.74), 'cad_r': (-14, 0, -4), 'col': (22, 0, 0), 'col1': (16, 0, 0), 'pec': (8, 0, 0),
                   'cab': (-4, 0, 0),
                   'rod_L': (0.8, -1.0, 0.3), 'rod_R': (-0.8, -1.0, 0.3), 'mano_R': (-0.32, y0 + 0.14, 0.0),
                   'bra_L': (-60, -40, 0), 'cod_L': 45.0}, 'suave'),
        (t0 + 13, {'cad': (0.0, y0 - 0.30, -0.50), 'cad_r': (12, 0, -10), 'col': (8, 0, 0), 'col1': (6, 0, 0), 'pec': (4, 0, 0),
                   'cue': (0, 0, 0), 'cab': (-12, 0, 0),
                   'pier_L': (22.0, 0.0), 'pier_R': (-22.0, 0.0), 'rod_L': (0.8, -1.0, 0.0), 'rod_R': (-0.8, -1.0, 0.0),
                   'ikb_R': 0.0, 'orm_R': None, 'bra_R': (-62, 34, 0), 'cod_R': 45.0, 'bra_L': (-62, -34, 0), 'cod_L': 45.0,
                   **manos('relajada')}, 'suave'),
        (t0 + 18, {'cad': (0.0, y0 - 0.34, -0.22), 'cad_r': (10, 0, -20), 'col': (8, 0, 2), 'col1': (6, 0, 2), 'pec': (4, 0, 2),
                   'cab': (-6, 0, 4), 'pie_L': (fin['pie_L'][0], fin['pie_L'][1], 0.0), 'pier_L': fin['pier_L'],
                   'pier_R': (-30.0, 0.0),
                   'ikb_L': 1.0, 'ikb_R': 1.0, 'orm_L': PUNO_GUARDIA_L, 'orm_R': PUNO_GUARDIA_R,
                   'mano_L': (0.16, y0 - 0.80, 1.18), 'mano_R': (-0.13, y0 - 0.68, 1.16), 'codo_L': G['codo_L'],
                   'codo_R': G['codo_R'], **manos('puno')}, 'suave'),
        (t0 + 24, fin, 'suave'),
    ]


@clip('levantarse', 24, False, 'levantarse desde tumbado (la cadera sobre la raíz): se sienta con la mano derecha apoyada 0-6, '
      'recoge los pies y empuja 6-10, en cuclillas sobre los pies 13, guardia 24 (800 ms); la raíz sigue a la cadera',
      raiz=True, contacto=[(0, 9)])
def _levantarse(fr):
    tb = _tumbado()
    fin = G_en(0.0, tb['cad'][1] - 0.34 + 0.02)
    return muestrear(claves(_levantarse_claves(0, tb, fin)), fr)


@clip('derribado', 45, False, 'derribado de frente, entero en 1,5 s (el derribo del Cierre y de la Réplica, 30 tics): cae de '
      'espaldas (la espalda en el suelo en 11), se queda un instante y se levanta desde el 21 hasta la guardia en 45',
      raiz=True, contacto=[(12, 27)], cae_en=11, levanta_desde=21, vuelo=[(3, 10)])
def _derribado(fr):
    tb = desplazar(_tumbado(), (0.0, 0.60))
    fin = G_en(0.0, 0.60 - 0.34 + 0.02)
    ks = _caer_claves(tb) + [(21, dict(tb, ikb_L=1.0, ikb_R=1.0, **manos('apoyo')), 'suave')] + _levantarse_claves(21, tb, fin)[1:]
    return muestrear(claves(ks), fr)


def _boca_abajo():
    """Tumbado boca abajo (la caída hacia delante): pecho y muslos en el suelo, las manos junto a los
    hombros como para empujar, la cara de lado. Las piernas algo abiertas (el giro del muslo hacia fuera: con
    el giro hacia dentro, al pasar de rodillas a tumbado una espinilla barría la otra)."""
    return {'cad': (0.0, -0.60, -0.87), 'cad_r': (86, 0, -4), 'col': (-4, 0, 0), 'col1': (-4, 0, 0), 'pec': (-6, 0, 0),
            'cue': (-12, 0, 0), 'cab': (-16, 0, 28), 'ikp_L': 0.0, 'ikp_R': 0.0,
            'mus_L': (2, 0, -6), 'mus_R': (2, 0, 6), 'rodfk_L': 60.0, 'rodfk_R': 45.0, 'tobfk_L': 30.0, 'tobfk_R': 30.0,
            'ikb_L': 1.0, 'ikb_R': 1.0, 'mano_L': (0.26, -1.00, 0.03), 'mano_R': (-0.26, -0.96, 0.03),
            'codo_L': (0.9, 0.3, 0.6), 'codo_R': (-0.9, 0.3, 0.6),
            'orm_L': ((0, 0, -1), (0.1, -1, 0)), 'orm_R': ((0, 0, -1), (-0.1, -1, 0)), **manos('apoyo')}


@clip('derribado-espalda', 45, False, 'derribado por la espalda, entero en 1,5 s: la cadera sale hacia delante 0-2, traspiés '
      '2-6, cae de rodillas (11) parando con las manos y queda boca abajo (13-20); empuja hasta a gatas, planta un pie y '
      'se levanta a la guardia (45)', raiz=True, contacto=[(11, 30)], cae_en=11, levanta_desde=20, vuelo=[(12, 13)])
def _derribado_espalda(fr):
    # los pies no se arrastran: se quedan clavados (de puntillas) mientras caen las rodillas, y sólo sueltan la
    # IK cuando el cuerpo ya está en el suelo y las piernas se estiran hacia atrás, en el aire
    bo = _boca_abajo()
    fin = G_en(0.0, -0.95)
    # el traspiés: un paso corto del pie derecho (con 0,56 m la rodilla derecha no llegaba al suelo, el
    # muslo se metía en la tripa 4-13 fotogramas y al tumbarse la rodilla saltaba 40 cm hacia atrás)
    pL, pR = G['pie_L'], (-0.14, -0.10, 0.0)
    ks = [
        (0, G, 'suave'),
        (2, {'cad': (0.0, -0.10, -0.06), 'cad_r': (-8, 0, -22), 'col': (-10, 0, 2), 'col1': (-8, 0, 2), 'pec': (-6, 0, 2),
             'cue': (-10, 0, 0), 'cab': (-18, 0, -6), 'ikb_L': 0.0, 'ikb_R': 0.0, 'orm_L': None, 'orm_R': None,
             'bra_L': (30, -40, 0), 'cod_L': 40.0, 'bra_R': (30, 40, 0), 'cod_R': 40.0, **manos('abierta')}, 'sale'),
        (6, {'cad': (0.0, -0.40, -0.22), 'cad_r': (34, 0, -16), 'col': (12, 0, 0), 'col1': (8, 0, 0), 'cab': (-20, 0, 0),
             'pie_R': pR, 'pier_R': (-10.0, 0.0), 'bra_L': (-70, -20, 0), 'cod_L': 20.0,
             'bra_R': (-70, 20, 0), 'cod_R': 20.0}, 'entra2'),
        # las rodillas caen con los pies clavados de puntillas; las manos buscan el suelo
        (9, {'cad': (0.0, -0.60, -0.46), 'cad_r': (40, 0, -8), 'col': (12, 0, 0), 'col1': (8, 0, 0), 'cab': (-18, 0, 0),
             'pie_L': pL, 'pier_L': (-12.0, -55.0), 'pie_R': pR, 'pier_R': (-10.0, -55.0),
             'rod_L': (0.2, -1.0, -0.3), 'rod_R': (-0.2, -1.0, -0.3),
             'ikb_L': 1.0, 'ikb_R': 1.0, 'mano_L': (0.30, -1.22, 0.25), 'mano_R': (-0.30, -1.18, 0.25),
             'codo_L': (0.9, 0.3, 0.6), 'codo_R': (-0.9, 0.3, 0.6), 'orm_L': bo['orm_L'], 'orm_R': bo['orm_R']}, 'entra2'),
        (11, {'cad': (0.0, -0.62, -0.62), 'cad_r': (66, 0, -6), 'col': (4, 0, 0), 'col1': (0, 0, 0), 'pec': (-4, 0, 0),
              'cue': (-10, 0, 0), 'cab': (-14, 0, 14), 'pier_L': (-12.0, -70.0), 'pier_R': (-10.0, -70.0),
              'ikp_L': 1.0, 'ikp_R': 1.0,
              'mano_L': (0.28, -1.40, 0.03), 'mano_R': (-0.28, -1.36, 0.03), **manos('apoyo')}, 'entra2'),
        (13, bo, 'sale'),
        (20, dict(bo, cab=(-16, 0, 24)), 'suave'),
        # a gatas: rodillas y manos
        (27, {'cad': (0.0, -0.58, -0.52), 'cad_r': (70, 0, 0), 'col': (4, 0, 0), 'col1': (4, 0, 0), 'pec': (2, 0, 0),
              'cue': (-20, 0, 0), 'cab': (-20, 0, 0), 'mus_L': (-70, 0, 4), 'mus_R': (-70, 0, -4), 'rodfk_L': 95.0,
              'rodfk_R': 95.0, 'tobfk_L': -40.0, 'tobfk_R': -40.0, 'mano_L': (0.20, -1.52, 0.03), 'mano_R': (-0.20, -1.50, 0.03),
              'codo_L': (0.5, 0.6, 0.2), 'codo_R': (-0.5, 0.6, 0.2)}, 'suave'),
        # la rodilla izquierda se recoge hacia el pecho (el pie deja el suelo)...
        (28, {'rodfk_L': 130.0, 'tobfk_L': 10.0, 'ikp_L': 0.0}, 'suave'),      # el pie despega antes de que la rodilla venga
        (29, {'cad': (0.0, -0.60, -0.48), 'mus_L': (-105, 0, 6), 'rodfk_L': 135.0, 'tobfk_L': 10.0, 'ikp_L': 0.0}, 'suave'),
        # ...y el pie sube por el aire y se planta delante, de rodilla derecha; las manos dejan el suelo
        (31, {'cad': (0.0, -0.64, -0.46), 'cad_r': (44, 0, -6), 'col': (8, 0, 0), 'col1': (6, 0, 0), 'cab': (-14, 0, 0),
              'mus_R': (-40, 0, -4), 'rodfk_R': 90.0, 'tobfk_R': -30.0, 'ikp_R': 0.0,
              'ikp_L': 1.0, 'pie_L': (0.13, -0.92, 0.16), 'pier_L': (8.0, 20.0), 'rod_L': (0.3, -1.0, 0.0),
              'mano_L': (0.22, -1.50, 0.05), 'mano_R': (-0.20, -1.46, 0.05)}, 'suave'),
        (34, {'cad': (0.0, -0.72, -0.46), 'cad_r': (26, 0, -10), 'col': (12, 0, 0), 'col1': (8, 0, 0), 'cue': (0, 0, 0),
              'cab': (-10, 0, 0), 'pie_L': (0.13, -1.08, 0.0), 'pier_L': (8.0, 0.0),
              'mus_R': (-9, 0, -4), 'rodfk_R': 75.0, 'tobfk_R': -20.0, 'ikp_R': 0.0,
              'ikb_L': 0.0, 'ikb_R': 0.0, 'orm_L': None, 'orm_R': None, 'bra_L': (-40, -30, 0), 'cod_L': 50.0,
              'bra_R': (-40, 30, 0), 'cod_R': 50.0, **manos('relajada')}, 'suave'),
        # el pie derecho despega hacia arriba (sin barrer el suelo) y sube por el aire hasta su sitio de guardia
        (35, {'rodfk_R': 125.0, 'tobfk_R': 10.0, 'ikp_R': 0.0}, 'suave'),     # el pie se recoge detrás, sin rozar
        (36, {'cad': (0.0, -0.76, -0.36), 'ikp_R': 1.0, 'pie_R': (-0.15, -0.40, 0.26), 'pier_R': (-20.0, 20.0)}, 'suave'),
        (38, {'cad': (0.0, -0.84, -0.22), 'cad_r': (12, 0, -18), 'col': (8, 0, 2), 'col1': (5, 0, 2),
              'ikp_R': 1.0, 'pie_R': (-0.16, -0.80, 0.12), 'pier_R': (-40.0, -10.0), 'rod_R': G['rod_R']}, 'suave'),
        (40, {'cad': (0.0, -0.90, -0.16), 'cad_r': (8, 0, -20), 'col': (6, 0, 2), 'col1': (4, 0, 2), 'pec': (3, 0, 2),
              'cab': (-6, 0, 6), 'pie_R': fin['pie_R'], 'pier_R': (-40.0, 0.0), 'rod_L': G['rod_L'],
              'ikb_L': 1.0, 'ikb_R': 1.0, 'orm_L': PUNO_GUARDIA_L, 'orm_R': PUNO_GUARDIA_R,
              'mano_L': (0.16, -1.32, 1.30), 'mano_R': (-0.12, -1.18, 1.28), 'codo_L': G['codo_L'], 'codo_R': G['codo_R'],
              **manos('puno')}, 'suave'),
        (45, fin, 'suave'),
    ]
    # ═══ TUMBADO DONDE CAYÓ ═══ La pose boca abajo y todo lo que viene después estaban escritos con la
    # cadera a 0,60 m del origen y las rodillas a 0,15; pero de rodillas (fotograma 11) las rodillas ya
    # estaban a 0,73 y 0,96: al tumbarse se iban 60-80 cm hacia atrás en un fotograma (la batería lo veía
    # como piernas que se cruzan). Tumbado (13-20), 0,55 m más adelante: las rodillas se quedan donde
    # cayeron y el cuerpo se tiende hacia delante; a gatas y lo que sigue, 0,10: para ponerse a gatas la
    # cadera se echa atrás sobre las rodillas, que no se mueven, y las manos siguen donde apoyaron (antes
    # las rodillas resbalaban 40 cm hacia delante). El juego no mueve al derribado; el cliente quita la
    # raíz, que sigue a la cadera, así que el cuerpo cae en su sitio igual.
    ks = [(f, en(k, 0.0, -0.55 if f <= 20 else -0.10) if f >= 13 else k, e) for f, k, e in ks]
    return muestrear(claves(ks, base=base_g()), fr)


# ═══ ESTADOS DE CASTIGO ═══
@clip('descolocado', 30, False, 'descolocado: el golpe que no encuentra nada tira del cuerpo; tropieza hacia delante y '
      'boquea con los brazos (clavado 1 s tras un quiebro limpio; el cliente corta a los 400 ms si es un fallo); sin raíz')
def _descolocado(fr):
    ks = claves([
        (0, G, 'suave'),
        (2, {'mano_R': (-0.30, -0.46, 1.32), 'codo_R': (-1.0, 0.2, -0.5)}, 'suave'),
        (4, {'cad': (0.0, -0.16, -0.10), 'cad_r': (16, 0, -32), 'col': (14, 0, -4), 'col1': (10, 0, -4), 'cab': (-10, 0, 10),
             'ikb_R': 0.0, 'orm_R': None, 'bra_R': (-82, 18, 0), 'cod_R': 8.0, **manos('puno', 'abierta')}, 'entra2'),
        (6, {'ikb_L': 1.0, 'mano_L': (0.42, -0.52, 1.24), 'codo_L': (1.0, 0.2, -0.5)}, 'suave'),
        (10, {'cad': (0.0, -0.40, -0.14), 'cad_r': (24, 6, -14), 'col': (18, 4, 0), 'col1': (12, 2, 0), 'cab': (-18, 6, 6),
              'pie_R': (-0.12, -0.52, 0.0), 'pier_R': (-10.0, 0.0), 'rod_R': (-0.3, -1.0, 0.0),
              'ikb_L': 0.0, 'orm_L': None, 'bra_L': (-20, -76, 0), 'cod_L': 25.0, 'bra_R': (-10, 60, 0), 'cod_R': 25.0,
              **manos('abierta')}, 'sale'),
        (18, {'cad': (0.03, -0.36, -0.12), 'cad_r': (18, -6, -10), 'col': (12, -6, 0), 'cab': (-12, -8, 4),
              'bra_L': (-35, -55, 0), 'bra_R': (0, 45, 0)}, 'suave'),
        (24, {'cad': (-0.02, -0.38, -0.12), 'cad_r': (20, 5, -12), 'col': (14, 5, 0), 'cab': (-14, 6, 8),
              'bra_L': (-15, -62, 0), 'bra_R': (-20, 55, 0)}, 'suave'),
        (30, {'cad': (0.0, -0.37, -0.12), 'cad_r': (19, 0, -12), 'col': (13, 0, 0), 'cab': (-13, 0, 6)}, 'suave'),
    ], base=base_g())
    return muestrear(ks, fr)


def _tumbado_respira(fr, n=60):
    t = fr / n
    p = dict(pose_base(), **A._tumbado())
    s = math.sin(2 * math.pi * t)
    p['pec'] = (0.8 * s, 0, 0)
    p['col1'] = (-2 + 0.6 * s, 0, 0)
    p['cab'] = (-4, 0, 14 + 3 * math.sin(2 * math.pi * t + 0.8))
    return p


@clip('desconectado', 60, True, 'desconectado: tumbado boca arriba respirando (la cadera sobre el origen, como el último '
      'fotograma de caer y el primero de levantarse)', contacto=[(0, 60)], faldon_de='caer')
def _desconectado(fr):
    return _tumbado_respira(fr)


# ═══ LO DEL SISTEMA: TIRADOR Y PRESTADO ═══
@clip('golpe-de-prestado', 36, False, 'golpe de Prestado: vuelta de brazo torpe y telegrafiada (el puño atrás, junto a la '
      'oreja, 0-14), paso y gancho abierto al impacto 21, se pasa de rosca y tropieza; sin raíz', impacto=(21, 22),
      efector='mano_R')
def _golpe_prestado(fr):
    # con la IK de principio a fin: el brazo que pasaba de la FK a la IK en la carga daba el pico de
    # velocidad dos fotogramas antes del impacto (la batería nueva)
    d = (0.34, -1.0, 0.04)
    ks = claves([
        (0, {**manos('tensa')}, 'suave'),
        (8, {'cad': (0.02, 0.05, -0.05), 'cad_r': (-4, 4, -34), 'col': (-2, 2, -10), 'col1': (-2, 2, -8), 'cab': (-4, 0, 26),
             'ikb_R': 1.0, 'mano_R': (-0.36, 0.14, 1.46), 'codo_R': (-1.0, 0.4, -0.2), 'orm_R': ((0.3, 0.3, -1.0), (0.2, -0.6, 0.8)),
             'golpe_R': golpe(d, 0.95, 0.0), 'bra_L': (-40, -10, 0), 'cod_L': 60.0,
             'pie_L': (0.12, -0.10, 0.0), 'pier_L': (4.0, 0.0), **manos('puno')}, 'suave'),
        (14, {'cad': (0.02, 0.06, -0.06), 'cad_r': (-5, 5, -38), 'mano_R': (-0.38, 0.17, 1.50), 'cab': (-4, 0, 22)}, 'suave'),
        (21, {'cad': (-0.02, -0.40, -0.08), 'cad_r': (12, -4, 26), 'col': (8, -4, 10), 'col1': (6, -2, 8), 'pec': (4, 0, 8),
              'cab': (-6, 0, -10), 'pie_R': (-0.13, -0.46, 0.0), 'pier_R': (-4.0, 0.0), 'rod_R': (-0.2, -1.0, 0.0),
              'golpe_R': golpe(d, 0.95, 1.0), 'orm_R': ((0.2, 0.0, -1.0), (0.6, -0.8, 0.0)), 'bra_L': (-20, -20, 0),
              'cod_L': 40.0}, 'golpe'),
        (27, {'cad': (0.02, -0.36, -0.10), 'cad_r': (16, -6, 40), 'col': (12, -6, 12), 'cab': (-10, 4, -6),
              'golpe_R': golpe(d, 0.95, 0.0), 'mano_R': (0.36, -0.86, 1.14), 'codo_R': (-0.2, 0.3, -0.9),
              'pie_L': (0.16, -0.44, 0.0), 'pier_L': (20.0, 0.0)}, 'sale'),
        (32, {'cad': (0.0, -0.22, -0.04), 'cad_r': (4, -2, 10), 'col': (4, 0, 2), 'cab': (-4, 0, 2),
              'pie_R': (-0.11, -0.10, 0.0), 'pier_R': (-6.0, 0.0)}, 'suave'),
        (36, {'cad': (0.0, -0.15, -0.02), 'cad_r': (2, 0, 6), 'col': (2, 0, 0), 'col1': (1, 0, 0), 'pec': (-1, 0, 0), 'cab': (-2, 0, 2),
              'ikb_R': 0.0, 'orm_R': None, 'bra_R': (-6, 14, 0), 'cod_R': 30.0, 'bra_L': (-8, -10, 0), 'cod_L': 25.0,
              'pie_L': (0.11, -0.20, 0.0), 'pier_L': (6.0, 0.0)}, 'suave'),
    ])
    return muestrear(ks, fr)


# el puno con la pistola: palma hacia dentro, nudillos (el +X de agarre_R, el canon) al frente
PISTOLA_R = ((1.0, 0.0, 0.0), (0.0, -1.0, 0.0))


def _apuntando(t, retroceso=0.0):
    """Pistola a una mano, estilo Celador: perfilado (hombro derecho delante), brazo recto a la
    altura del hombro, la izquierda a la espalda. `retroceso` de 0 a 1 levanta el canon."""
    s = math.sin(2 * math.pi * t)
    p = pose_base()
    p.update({'cad': (0.0, 0.0, -0.03 + 0.002 * s), 'cad_r': (0, 0, 40), 'col': (2, 0, 2), 'col1': (1, 0, 2),
              'pec': (0, 0, 2), 'cue': (0, 0, -16), 'cab': (-2, 0, -26),
              'pie_L': (0.16, 0.10, 0.0), 'pier_L': (40.0, 0.0), 'rod_L': (0.6, -0.6, 0.0),
              'pie_R': (-0.08, -0.16, 0.0), 'pier_R': (4.0, 0.0), 'rod_R': (-0.1, -1.0, 0.0),
              'ikb_R': 1.0, 'mano_R': (-0.055, -0.62 + 0.03 * retroceso, 1.42 + 0.004 * s + 0.035 * retroceso),
              'codo_R': (-1.0, 0.2, -0.4),
              'orm_R': ((1.0, 0.0, 0.0), (0.0, -1.0, 0.18 + 0.9 * retroceso)), 'hom_R': (0, 0, -8),
              'ikb_L': 1.0, 'mano_L': (0.14, 0.31, 1.05), 'codo_L': (0.9, 0.9, 0.0),
              'orm_L': ((0.0, 1.0, 0.0), (-1.0, 0.0, -0.1)), 'hom_L': (0, 0, 0)})
    p.update(manos('relajada', 'agarre'))
    return p


@clip('apuntar', 30, True, 'apuntar: pistola a una mano con el brazo recto, perfilado, la izquierda a la espalda (la '
      'pistola, pieza aparte en agarre_R)')
def _apuntar(fr):
    return _apuntando(fr / 30.0)


DISPAROS_MS = (0, 150, 300)


@clip('disparar', 24, False, 'disparar: rafaga de tres balas (0, 150 y 300 ms) con el retroceso del canon', impacto=(0, 1),
      disparos=DISPAROS_MS)
def _disparar(fr):
    t = fr / FPS
    r = 0.0
    for d in DISPAROS_MS:
        tau = t - d / 1000.0
        if tau >= 0:
            r = max(r, math.exp(-tau / 0.045) * min(1.0, tau / 0.012 + 0.6))
    return _apuntando(fr / 30.0, r)


def _de_rodillas(t, cabeza=24.0):
    """De rodillas, erguido y vencido: las espinillas en el suelo (FK; la pasada de suelo las apoya). Las
    manos sobre los muslos, por FUERA de ellos: en el Celador ancho las de la primera versión se metían
    en el vientre los 61 fotogramas del bucle."""
    s = math.sin(2 * math.pi * t)
    p = pose_base()
    p.update({'cad': (0.0, 0.02, -0.47), 'cad_r': (8 + 1.5 * s, 0, 0), 'col': (8, 0, 0), 'col1': (8 + s, 0, 0),
              'pec': (6, 0, 0), 'cue': (12, 0, 0), 'cab': (cabeza + 2 * s, 0, 3 * math.sin(2 * math.pi * t + 1)),
              'ikp_L': 0.0, 'ikp_R': 0.0, 'mus_L': (-8, 0, 4), 'mus_R': (-8, 0, -4),
              'rodfk_L': 96.0, 'rodfk_R': 96.0, 'tobfk_L': -52.0, 'tobfk_R': -52.0,
              'ikb_L': 1.0, 'ikb_R': 1.0, 'mano_L': (0.23, -0.27, 0.40), 'mano_R': (-0.23, -0.27, 0.40),
              'codo_L': (0.9, 0.3, -0.2), 'codo_R': (-0.9, 0.3, -0.2),
              'orm_L': ((0.3, 0.0, -1.0), (0.0, -1.0, -0.2)), 'orm_R': ((-0.3, 0.0, -1.0), (0.0, -1.0, -0.2)),
              'hom_L': (0, 0, 6), 'hom_R': (0, 0, -6)})
    p.update(manos('relajada'))
    return p


@clip('desalojable', 60, True, 'desalojable: de rodillas, vencido, respirando (3 s a merced del remate)', contacto=[(0, 60)])
def _desalojable(fr):
    return _de_rodillas(fr / 60.0)


@clip('rematar', 36, False, 'rematar: la palma sobre la cabeza del Celador arrodillado (a 1,15 m y 0,55 m delante) y la '
      'mantiene 1,2 s')
def _rematar(fr):
    tiembla = 0.003 * math.sin(fr * 3.1) if fr > 14 else 0.0
    ks = claves([
        (0, {}, 'suave'),
        (8, {'cad': (0.0, -0.10, -0.04), 'cad_r': (6, 0, 6), 'col': (6, 0, 2), 'col1': (4, 0, 2), 'cab': (8, 0, 0),
             'pie_L': (0.12, -0.26, 0.0), 'pier_L': (8.0, 0.0), 'ikb_R': 1.0, 'mano_R': (-0.06, -0.50, 1.26),
             'codo_R': (-0.9, 0.2, -0.3), 'orm_R': ((0.0, 0.1, -1.0), (0.0, -1.0, -0.1)),
             'bra_L': (-6, -8, 0), 'cod_L': 30.0, **manos('puno', 'abierta')}, 'suave'),
        (14, {'cad': (0.0, -0.12, -0.06), 'cab': (18, 0, 0), 'cue': (8, 0, 0), 'mano_R': (-0.04, -0.56, 1.19)}, 'sale'),
        (36, {'cad': (0.0, -0.12, -0.07), 'cab': (20, 0, 0), 'mano_R': (-0.04, -0.56, 1.18)}, 'suave'),
    ])
    p = muestrear(ks, fr)
    if tiembla:
        x = p['mano_R']
        p['mano_R'] = (x[0] + tiembla, x[1], x[2] - abs(tiembla))
    return p


@clip('absorber', 42, False, 'absorber: el Celador caido recibe los hilos del Prestado de rodillas, brazos abiertos '
      '(0-18), y se levanta (18-42)', contacto=[(0, 20)])
def _absorber(fr):
    r = _de_rodillas(0.0, cabeza=-10.0)
    abre = dict(r, cad=(0.0, 0.02, -0.465), cad_r=(-6, 0, 0), col=(-8, 0, 0), col1=(-8, 0, 0), pec=(-8, 0, 0), cue=(-6, 0, 0),
                # (la pelvis se echa 14° atrás: los muslos, en FK sobre ella, se compensan para no barrer el suelo)
                mus_L=(6, 0, -4), mus_R=(6, 0, 4),      # los tobillos algo abiertos: en el ancho se tocaban
                cab=(-18, 0, 0), ikb_L=0.0, ikb_R=0.0, orm_L=None, orm_R=None, bra_L=(-20, -62, 0), bra_R=(-20, 62, 0),
                cod_L=20.0, cod_R=20.0, **manos('abierta'))
    rodilla = dict(abre, cad=(0.0, 0.04, -0.42), cad_r=(10, 0, 0), col=(10, 0, 0), col1=(6, 0, 0), pec=(2, 0, 0),
                   cab=(-4, 0, 0), mus_R=(-10, 0, 4), ikp_L=1.0, pie_L=(0.12, -0.34, 0.0), pier_L=(6.0, 0.0), rod_L=(0.2, -1.0, 0.0),
                   bra_L=(-20, -20, 0), bra_R=(-10, 20, 0), cod_L=60.0, cod_R=40.0, **manos('relajada'))
    de_pie = dict(pose_base(), cad=(0.0, -0.08, -0.02), pie_L=(0.11, -0.18, 0.0), pie_R=(-0.11, -0.02, 0.0))
    ks = claves([
        (0, r, 'suave'),
        (8, abre, 'sale'),
        (18, dict(abre, bra_L=(-35, -70, 0), bra_R=(-35, 70, 0), cab=(-22, 0, 0)), 'suave'),
        (20, dict(abre, cad=(0.0, 0.03, -0.44), cad_r=(0, 0, 0), mus_L=(-14, 0, 4), mus_R=(0, 0, 4), rodfk_L=125.0, tobfk_L=0.0,
                  bra_L=(-26, -64, 0), bra_R=(-24, 64, 0), cab=(-18, 0, 0)), 'suave'),
        # la rodilla izquierda sube (recogida, el pie en el aire) hasta el muslo horizontal con la espinilla
        # vertical, la misma pose que la IK del 26 planta en el suelo: pasar de FK a IK con poses distintas
        # arrastraba el pie 37 cm en un fotograma
        (22, dict(abre, cad=(0.0, 0.03, -0.44), cad_r=(4, 0, 0), mus_L=(-70, 0, 4), mus_R=(-4, 0, 4), rodfk_L=125.0, tobfk_L=10.0,
                  bra_L=(-30, -60, 0), bra_R=(-28, 60, 0), cab=(-16, 0, 0)), 'suave'),
        (24, dict(abre, cad=(0.0, 0.03, -0.43), cad_r=(4, 0, 0), mus_L=(-94, 0, 4), mus_R=(-4, 0, 4), rodfk_L=90.0, tobfk_L=0.0,
                  ikp_L=0.0, bra_L=(-28, -52, 0), bra_R=(-24, 52, 0), cab=(-12, 0, 0)), 'suave'),
        (26, dict(abre, cad=(0.0, 0.03, -0.42), cad_r=(4, 0, 0), ikp_L=1.0, mus_L=(-94, 0, 4), rodfk_L=90.0, tobfk_L=0.0,
                  mus_R=(-4, 0, 4), pie_L=(0.12, -0.36, 0.08), pier_L=(6.0, 10.0),
                  rod_L=(0.2, -1.0, 0.0), bra_L=(-25, -45, 0), bra_R=(-20, 45, 0), cab=(-10, 0, 0)), 'suave'),
        (28, rodilla, 'suave'),
        (30, {'rodfk_R': 130.0, 'tobfk_R': -20.0, 'ikp_R': 0.0}, 'suave'),
        # la espinilla derecha se arrastraba 40 cm por el suelo hasta su sitio (2,5 m/s): ahora el peso pasa
        # al pie de delante, la rodilla despega y el pie se trae por el aire
        (32, {'cad': (0.0, -0.02, -0.28), 'cad_r': (14, 0, 0), 'col': (8, 0, 0), 'col1': (4, 0, 0), 'pec': (2, 0, 0),
              'ikp_R': 1.0, 'pie_R': (-0.11, 0.18, 0.12), 'pier_R': (-4.0, 30.0), 'rod_R': (-0.2, -1.0, 0.0)}, 'suave'),
        (36, {'cad': (0.0, -0.06, -0.10), 'cad_r': (6, 0, 0), 'pie_R': (-0.11, -0.02, 0.04), 'pier_R': (0.0, 0.0)}, 'suave'),
        (42, de_pie, 'suave'),
    ], base=pose_base())
    return muestrear(ks, fr)


@clip('rescatar', 45, False, 'rescatar: se agacha junto al companero tumbado, le agarra la mano (0-18) y tira hacia arriba '
      'hasta ponerlo de pie (18-45)', tope_faldon=40)
def _rescatar(fr):
    agachado = {'cad': (0.0, -0.04, -0.42), 'cad_r': (16, 0, 0), 'col': (18, 0, 0), 'col1': (14, 0, 0), 'pec': (8, 0, 0),
                'cab': (6, 0, 0), 'pie_L': (0.13, -0.22, 0.0), 'pier_L': (6.0, 0.0), 'pie_R': (-0.13, 0.10, 0.0),
                'pier_R': (-6.0, -30.0), 'rod_L': (0.3, -1.0, 0.0), 'rod_R': (-0.3, -1.0, 0.2),
                'ikb_R': 1.0, 'mano_R': (-0.06, -0.72, 0.32), 'codo_R': (-0.9, 0.2, -0.4),
                'orm_R': ((0.3, 0.0, -1.0), (0.0, -1.0, -0.3)), 'bra_L': (-62, -32, 0), 'cod_L': 45.0,
                **manos('relajada', 'abierta')}
    ks = claves([
        (0, {}, 'suave'),
        (12, agachado, 'suave'),
        (18, {'mano_R': (-0.06, -0.74, 0.28), **manos('relajada', 'agarre')}, 'suave'),
        (32, {'cad': (0.0, 0.05, -0.18), 'cad_r': (-6, 0, 0), 'col': (-4, 0, 0), 'col1': (-4, 0, 0), 'pec': (-2, 0, 0),
              'cab': (-4, 0, 0), 'pie_R': (-0.13, 0.12, 0.0), 'pier_R': (-6.0, 0.0),
              'mano_R': (-0.08, -0.50, 0.92), 'codo_R': (-0.8, 0.6, -0.4), 'bra_L': (-20, -20, 0), 'cod_L': 40.0}, 'suave'),
        (45, {'cad': (0.0, 0.02, -0.03), 'cad_r': (-2, 0, 0), 'col': (1, 0, 0), 'col1': (0, 0, 0), 'pec': (-1, 0, 0),
              'cab': (-2, 0, 0), 'mano_R': (-0.10, -0.42, 1.12), 'codo_R': (-0.9, 0.4, -0.6), 'bra_L': (-6, -8, 0),
              'cod_L': 20.0}, 'suave'),
    ])
    return muestrear(ks, fr)


@clip('imprimirse', 36, False, 'imprimirse: el Celador recien compactado se yergue (0-8) y se ajusta los punos, primero el '
      'izquierdo (10-20) y luego el derecho (22-32)')
def _imprimirse(fr):
    # ═══ LOS PUÑOS, SIN METERSE EN EL PECHO ═══ La primera versión juntaba los antebrazos contra el
    # vientre en 90 fotogramas de las 18 figuras. Las manos van 8 cm más adelante y los codos, abiertos.
    rigido = {'cad': (0.0, 0.0, -0.02), 'col': (0, 0, 0), 'col1': (0, 0, 0), 'pec': (0, 0, 0), 'cue': (4, 0, 0),
              'cab': (14, 0, 0), 'bra_L': (0, -10, 0), 'bra_R': (0, 10, 0), 'cod_L': 4.0, 'cod_R': 4.0,
              'pie_L': (0.1, 0.07, 0.0), 'pie_R': (-0.1, 0.07, 0.0), 'pier_L': (4.0, 0.0), 'pier_R': (-4.0, 0.0),
              **manos('abierta')}
    # la izquierda delante del cuerpo, palma abajo; la derecha pellizca su bocamanga
    puno_izq = {'ikb_L': 1.0, 'ikb_R': 1.0, 'mano_L': (0.12, -0.54, 0.93), 'codo_L': (0.9, 0.3, -0.5),
                'orm_L': ((0.0, 0.2, -1.0), (-0.9, -0.4, 0.0)), 'mano_R': (0.15, -0.46, 1.20), 'codo_R': (-0.6, 0.6, 0.8),
                'orm_R': ((0.3, 0.0, -1.0), (0.6, -0.8, 0.0)), 'cab': (18, 0, 8), **manos('relajada', 'tensa')}
    puno_der = {'mano_R': (-0.12, -0.54, 0.93), 'codo_R': (-0.9, 0.3, -0.5), 'orm_R': ((0.0, 0.2, -1.0), (0.9, -0.4, 0.0)),
                'mano_L': (-0.15, -0.46, 1.20), 'codo_L': (0.6, 0.6, 0.8), 'orm_L': ((-0.3, 0.0, -1.0), (-0.6, -0.8, 0.0)),
                'cab': (18, 0, -8), **manos('tensa', 'relajada')}
    ks = claves([
        (0, rigido, 'suave'),
        (8, {'cab': (-2, 0, 0), 'cue': (0, 0, 0), 'pec': (-2, 0, 0), 'hom_L': (0, -4, 0), 'hom_R': (0, 4, 0)}, 'sale'),
        (12, puno_izq, 'suave'),
        (16, {'mano_R': (0.16, -0.45, 1.19), 'mano_L': (0.13, -0.54, 0.925)}, 'suave'),
        (19, {'mano_R': (0.15, -0.46, 1.20)}, 'suave'),
        (22, {'mano_R': (-0.26, -0.22, 1.04), 'codo_R': (-0.9, 0.3, -0.5), 'mano_L': (0.26, -0.22, 1.04),
              'codo_L': (0.9, 0.3, -0.5), 'cab': (16, 0, 0)}, 'suave'),
        (25, puno_der, 'suave'),
        (28, {'mano_L': (-0.16, -0.45, 1.19), 'mano_R': (-0.13, -0.54, 0.925)}, 'suave'),
        (31, {'mano_L': (-0.15, -0.46, 1.20)}, 'suave'),
        (33, {'mano_L': (0.26, -0.20, 1.04), 'codo_L': (0.9, 0.3, -0.5), 'mano_R': (-0.26, -0.20, 1.04),
              'codo_R': (-0.9, 0.3, -0.5)}, 'suave'),
        (36, {'ikb_L': 0.0, 'ikb_R': 0.0, 'orm_L': None, 'orm_R': None, 'bra_L': (0, 0, 0), 'bra_R': (0, 0, 0),
              'cod_L': 12.0, 'cod_R': 12.0, 'cab': (-1, 0, 0), 'hom_L': (0, 0, 0), 'hom_R': (0, 0, 0),
              **manos('relajada')}, 'suave'),
    ], base=pose_base())
    return muestrear(ks, fr)


# ═══ LA CABINA ═══
# Descolgar dura 1,5 s en las reglas (CABINA.descolgarTics = 30): el clip, 45 fotogramas. La revisión
# vio el auricular DETRÁS de la oreja: el puño iba a la oreja. Ahora el puño va a la mejilla, delante y
# debajo de ella, con el lado del pulgar (+Y de agarre_R, el eje del auricular) hacia la oreja: un
# auricular de 20 cm agarrado por el medio tiene el altavoz en la oreja y el micro en la boca.
OREJA_R = (-0.160, -0.075, 1.56)


@clip('descolgar', 45, False, 'descolgar el auricular de la cabina (1,44 m, delante a la derecha) y llevárselo a la oreja '
      '(1,5 s, CABINA.descolgarTics): el auricular va en agarre_R, del micro en la boca al altavoz en la oreja')
def _descolgar(fr):
    oido = ((1.0, 0.25, 0.0), (0.05, 0.55, 0.83))      # palma hacia la mejilla, pulgar hacia la oreja (arriba y atrás)
    ks = claves([
        (0, {}, 'suave'),
        (9, {'ikb_R': 1.0, 'mano_R': (-0.22, -0.36, 1.40), 'codo_R': (-0.9, 0.3, -0.5), 'bra_L': (-2, -7, 0),
             'orm_R': ((1.0, 0.0, 0.0), (0.0, -0.5, 1.0)), **manos('relajada', 'abierta'),
             'cad': (-0.02, -0.03, -0.015), 'cad_r': (0, 0, 8), 'col1': (4, 0, 6), 'pec': (2, 0, 6), 'cue': (4, 0, 6),
             'cab': (-4, 0, 10), 'pie_R': (-0.12, -0.05, 0.0), 'pier_R': (-10.0, 0.0)}, 'suave'),
        (13, {'mano_R': (-0.22, -0.35, 1.39), **manos('relajada', 'agarre')}, 'lineal'),
        (25, {'mano_R': OREJA_R, 'codo_R': (-0.4, -0.6, -1.0), 'orm_R': oido,
              'cad': (0.0, 0.0, -0.014), 'cad_r': (0, -1, 4), 'col1': (2, -1, 2), 'pec': (0, -1, 2), 'cue': (4, -2, 0),
              'cab': (-2, -6, -3), 'pie_R': (-0.11, 0.06, 0.0)}, 'suave'),
        (36, {'cab': (2, -7, -6), 'cue': (6, -2, 0), 'bra_L': (-4, -6, 0), 'cod_L': 22.0,
              'mano_R': (OREJA_R[0] + 0.002, OREJA_R[1] - 0.002, OREJA_R[2] - 0.002)}, 'suave'),
        (45, {'cab': (0, -6, -4), 'mano_R': OREJA_R}, 'suave'),
    ])
    return muestrear(ks, fr)


@clip('salir', 30, False, 'salir por la cabina: con el auricular en la oreja se pone rigido, mira arriba y se alza de '
      'puntillas mientras se deshace en glifos')
def _salir(fr):
    tel = CLIPS['descolgar']['fn'](CLIPS['descolgar']['frames'])
    ks = claves([
        (0, tel, 'suave'),
        (10, {'cad': (0.0, 0.0, 0.0), 'cad_r': (-2, 0, 0), 'col': (-3, 0, 0), 'col1': (-3, 0, 0), 'pec': (-4, 0, 0),
              'cue': (-6, 0, 0), 'cab': (-16, -3, -4), 'bra_L': (-4, -26, 0), 'cod_L': 10.0,
              'pie_L': (0.1, 0.075, 0.0), 'pie_R': (-0.1, 0.075, 0.0), 'pier_L': (6.0, 0.0), 'pier_R': (-6.0, 0.0),
              **manos('abierta', 'agarre')}, 'sale'),
        (20, {'cad': (0.0, 0.0, 0.05), 'cab': (-22, -3, -4), 'pier_L': (6.0, -34.0), 'pier_R': (-6.0, -34.0),
              'bra_L': (-6, -34, 0)}, 'suave'),
        (30, {'cad': (0.0, 0.0, 0.055), 'cab': (-24, -3, -4)}, 'suave'),
    ], base=pose_base())
    return muestrear(ks, fr)


# ═══ EL ORDEN DE HORNEADO (y el de reparto.json) ═══
# `caer` va antes que `desconectado` (este hereda su tela) y `descolgar` antes que `salir`.
ORDEN = ['reposo', 'guardia', 'guardia-celador', 'pasear', 'andar', 'trotar', 'correr', 'andar-paraguas',
         'retroceder', 'lateral-izquierda', 'lateral-derecha',
         'quiebro-izquierda', 'quiebro-derecha', 'quiebro-atras', 'quiebro-delante',
         'quiebro-torpe', 'quiebro-torpe-derecha', 'quiebro-torpe-atras', 'quiebro-torpe-delante',
         'tocado', 'tocado-espalda', 'descolocado', 'caer', 'derribado', 'derribado-espalda', 'levantarse', 'desconectado',
         'entrada', 'seguida-1', 'seguida-2', 'cierre', 'empellon', 'replica', 'avance',
         'respuesta', 'golpe-de-prestado', 'apuntar', 'disparar', 'desalojable', 'rematar', 'absorber',
         'rescatar', 'descolgar', 'imprimirse', 'salir', 'victoria']

# qué clip pinta cada Gesto de cuerpos.ts
GESTOS = {
    'reposo': 'reposo', 'andar': 'andar', 'trotar': 'trotar', 'correr': 'correr', 'quiebro': 'quiebro-izquierda',
    'quiebro-torpe': 'quiebro-torpe', 'tocado': 'tocado', 'descolocado': 'descolocado', 'derribado': 'derribado',
    'levantarse': 'levantarse', 'entrada': 'entrada', 'seguida-1': 'seguida-1', 'seguida-2': 'seguida-2',
    'cierre': 'cierre', 'empellon': 'empellon', 'replica': 'replica', 'avance': 'avance', 'guardia': 'guardia',
    'respuesta': 'respuesta', 'golpe-de-prestado': 'golpe-de-prestado', 'apuntar': 'apuntar', 'disparar': 'disparar',
    'desalojable': 'desalojable', 'rematar': 'rematar', 'absorber': 'absorber', 'rescatar': 'rescatar',
    'descolgar': 'descolgar', 'imprimirse': 'imprimirse', 'salir': 'salir', 'desconectado': 'desconectado',
    'victoria': 'victoria',
    # EL RAYO (escritorio/src/quiebro/rayo/contrato.ts): los clips de la captura (Spell_Simple_Enter/Idle_Loop/Shoot/
    # Exit de UAL, en espejo: captura.py, «EL RAYO»). Con CAPTURA=0 no existen y pintan los de apuntar y disparar (abajo).
    'cargar-rayo': 'cargar-rayo', 'lanzar-rayo': 'lanzar-rayo',
}
# por dirección, relativa a la cara (`direccionDelGesto` - `rumbo`): la del DESPLAZAMIENTO. En el quiebro,
# hacia donde se va; en el tocado y el derribado, hacia donde empuja el golpe (me pegan de frente: atrás).
POR_DIRECCION = {
    'quiebro': {'izquierda': 'quiebro-izquierda', 'derecha': 'quiebro-derecha', 'atras': 'quiebro-atras',
                'delante': 'quiebro-delante'},
    'quiebro-torpe': {'izquierda': 'quiebro-torpe', 'derecha': 'quiebro-torpe-derecha', 'atras': 'quiebro-torpe-atras',
                      'delante': 'quiebro-torpe-delante'},
    'tocado': {'atras': 'tocado', 'izquierda': 'tocado', 'derecha': 'tocado', 'delante': 'tocado-espalda'},
    'derribado': {'atras': 'derribado', 'izquierda': 'derribado', 'derecha': 'derribado', 'delante': 'derribado-espalda'},
}
# por clase de cuerpo: la guardia del Celador (y del tirador) es otra
POR_CLASE = {'guardia': {'celador': 'guardia-celador', 'tirador': 'guardia-celador'}}
# lo que se pinta ANTES de un gesto sostenido que empieza en el suelo (desconectado: la caída)
ENTRA_CON = {'desconectado': 'caer'}
QUIEBRO_POR_DIRECCION = POR_DIRECCION['quiebro']

# ═══ LA CAPTURA ═══ Los clips que tienen receta en captura.py (la captura de movimiento de UAL, CC0,
# reorientada a este esqueleto, sola o mezclada con capas de aquí) sustituyen a los de arriba con el MISMO
# nombre; los demás se quedan como están. CAPTURA=0 en el entorno hornea la forja pura.
import captura  # noqa: E402

CAPTURADOS = captura.registrar(CLIPS)

# ═══ LOS CLIPS QUE SÓLO TIENE LA CAPTURA ═══ Los del rayo no tienen clip de la forja: se hornean detrás de `disparar` si
# la captura los registró; con CAPTURA=0 (la forja pura, para comparar) sus gestos pintan los del tirador, como en la
# fase 0 del contrato.
_TRAS = 'disparar'
for _nombre, _en_la_forja in (('cargar-rayo', 'apuntar'), ('lanzar-rayo', 'disparar')):
    if _nombre in CLIPS:
        if _nombre not in ORDEN:
            ORDEN.insert(ORDEN.index(_TRAS) + 1, _nombre)
        _TRAS = _nombre
    else:
        GESTOS[_nombre] = _en_la_forja
