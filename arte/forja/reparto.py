"""EL REPARTO DE EL QUIEBRO: quién sale, con qué ropa, de qué color y con cuántos triángulos.

Es la única lista. La leen la construcción (`anatomia.figura`, `construir`), el empaquetado
(`empaquetar.py`, que junta las variantes de cada familia en un GLB y escribe `reparto.json`) y la
batería. Si una figura cambia de nombre, cambia aquí y en ningún otro sitio.

═══ POR QUÉ FAMILIAS Y VARIANTES, Y NO UN FICHERO POR FIGURA ═══

Cada familia (desvelado-hombre, celador-mujer, durmiente-hombre…) es UN GLB por nivel de detalle
con UN esqueleto y una malla por variante (`gabardina`, `ligera`, `mole`…). El cliente clona la
escena y deja visible la malla de la variante que le toca. Así los nombres de fichero de la primera
entrega (`desvelado-hombre.glb`…) siguen valiendo cuando llegan las variantes, el esqueleto se
descarga una vez por familia y el manifiesto dice qué mallas enseñar sin que el cliente sepa de
ropa.

═══ LO QUE EL DISEÑO PROHÍBE Y AQUÍ NO ENTRA (docs/EL-QUIEBRO.md §1) ═══

Los desvelados no llevan gafas oscuras ni cuero negro largo: colores apagados y el forro del color
del asiento. Los celadores llevan gafas oscuras pero NO auricular, y son cuatro siluetas distintas
con el traje en cuatro colores apagados. Los durmientes son gente de madrugada con su ropa de
calle; el Prestado conserva la suya (nunca muta en traje).
"""


def srgb(r, g, b):
    """Color sRGB de 0-255 a lineal (lo que guarda glTF)."""
    def f(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (round(f(r), 4), round(f(g), 4), round(f(b), 4))


# ═══ LAS ZONAS TENIBLES ═══
# Su color no va en el color por vértice: el vértice lleva sólo la oclusión y el color lo pone el
# material, que el cliente clona y tiñe. `mat_forro` va del color del asiento; `mat_traje`, de una
# de las cuatro telas apagadas del Celador, y `mat_corbata` con ella (la corbata de cada traje: con el
# traje marengo y la corbata casi negra de la primera entrega, los cuatro eran el mismo hombre).
_PALETA_TRAJE = {'marengo': srgb(62, 64, 68), 'pardo': srgb(84, 68, 52), 'verde-botella': srgb(34, 60, 46),
                 'azul-noche': srgb(32, 40, 64)}
TENIBLES = {
    'mat_forro': {'por': 'asiento', 'nota': 'forro de la prenda y ribetes (bocamangas, cinturon, cremallera, bajo interior '
                                            'del faldon): el color saturado del asiento, que se lee a 60 m'},
    'mat_traje': {'por': 'paleta', 'paleta': _PALETA_TRAJE,
                  'nota': 'traje de chaqueta del Celador (chaqueta y pantalon): cuatro colores apagados; el cliente elige uno '
                          'por entidad'},
    'mat_corbata': {'por': 'paleta', 'deLa': 'mat_traje', 'paleta': {
        'marengo': srgb(104, 36, 44), 'pardo': srgb(36, 70, 56), 'verde-botella': srgb(90, 48, 78), 'azul-noche': srgb(100, 112, 128)},
        'nota': 'la corbata va con el traje: con el mismo indice de color que mat_traje'},
}

# ═══ PALETAS ═══
# zona: (color lineal, rugosidad, metal). Los desvelados, apagados y con el abrigo por ENCIMA de L* 35
# (la Mole casi negra, L* 25, era el cuero largo de la franquicia con otro corte); el forro, en las
# capturas, del color de un asiento (el juego pone el de cada uno).
PIEL = {'clara': srgb(214, 168, 142), 'media': srgb(192, 140, 110), 'morena': srgb(150, 102, 76), 'oscura': srgb(110, 74, 56)}
FORRO_DEL_ASIENTO = srgb(70, 200, 255)       # '#46c8ff', el segundo color de asiento de partida.ts


def _base(piel, pelo, tela, calzado, suela=srgb(40, 38, 36), camisa=srgb(58, 60, 64)):
    return {
        'mat_piel': (piel, 0.52, 0.0), 'mat_ojos': ((1.0, 1.0, 1.0), 0.3, 0.0), 'mat_pelo': (pelo, 0.78, 0.0),
        'mat_tela': (tela, 0.84, 0.0), 'mat_calzado': (calzado, 0.4, 0.0), 'mat_suela': (suela, 0.9, 0.0),
        'mat_camisa': (camisa, 0.8, 0.0),
    }


def _p(base, **zonas):
    d = dict(base)
    d.update(zonas)
    return d


_DH = _base(PIEL['media'], srgb(38, 30, 26), srgb(44, 46, 52), srgb(52, 40, 32), camisa=srgb(64, 66, 62))
_DM = _base(PIEL['clara'], srgb(62, 40, 30), srgb(40, 42, 50), srgb(40, 32, 30), camisa=srgb(70, 64, 68))
_DUH = _base(PIEL['morena'], srgb(30, 24, 20), srgb(46, 52, 66), srgb(70, 56, 44))
_DUM = _base(PIEL['oscura'], srgb(20, 16, 14), srgb(50, 48, 56), srgb(46, 40, 38))
FORRO = {'mat_forro': (FORRO_DEL_ASIENTO, 0.6, 0.0)}


def _celador(piel, pelo, camisa, cristal, montura, rug_montura, metal_montura):
    """Traje marengo (se tiñe), zapatos negros, su camisa (crema o celeste, nunca blanca), su corbata
    (se tiñe con el traje), y sus gafas: el cristal tintado y la montura de cada silueta."""
    d = _base(PIEL[piel], pelo, _PALETA_TRAJE['marengo'], srgb(18, 18, 20), suela=srgb(16, 16, 16), camisa=camisa)
    d.update({'mat_traje': (_PALETA_TRAJE['marengo'], 0.7, 0.0), 'mat_corbata': (TENIBLES['mat_corbata']['paleta']['marengo'], 0.5, 0.0),
              'mat_gafas': (cristal, 0.06, 0.0), 'mat_montura': (montura, rug_montura, metal_montura)})
    return d


# ═══ LAS FIGURAS ═══
# id: familia, variante, clase, sexo, rasgos (los lee anatomia.figura), presupuesto de triángulos por
# LOD (el del cuerpo SDF; ojos, cejas, gafas, corbata y faldón van aparte y se miden) y paleta.
FIGURAS = {
    # --- desvelados: el mismo hombre y la misma mujer con los tres estilos de §3
    'desvelado-hombre-gabardina': dict(familia='desvelado-hombre', variante='gabardina', estilo='gabardina',
                                       paleta=_p(_DH, mat_abrigo=(srgb(112, 104, 82), 0.78, 0.0), **FORRO)),
    'desvelado-hombre-ligera': dict(familia='desvelado-hombre', variante='ligera', estilo='ligera',
                                    paleta=_p(_DH, mat_abrigo=(srgb(74, 82, 94), 0.8, 0.0), mat_camisa=(srgb(96, 90, 80), 0.86, 0.0), **FORRO)),
    'desvelado-hombre-mole': dict(familia='desvelado-hombre', variante='mole', estilo='mole',
                                  paleta=_p(_DH, mat_abrigo=(srgb(96, 88, 80), 0.82, 0.0), mat_camisa=(srgb(70, 66, 58), 0.9, 0.0), **FORRO)),
    'desvelado-mujer-gabardina': dict(familia='desvelado-mujer', variante='gabardina', estilo='gabardina',
                                      paleta=_p(_DM, mat_abrigo=(srgb(120, 100, 80), 0.76, 0.0), **FORRO)),
    'desvelado-mujer-ligera': dict(familia='desvelado-mujer', variante='ligera', estilo='ligera',
                                   paleta=_p(_DM, mat_abrigo=(srgb(98, 62, 58), 0.72, 0.0), mat_camisa=(srgb(62, 66, 70), 0.86, 0.0), **FORRO)),
    'desvelado-mujer-mole': dict(familia='desvelado-mujer', variante='mole', estilo='mole',
                                 paleta=_p(_DM, mat_abrigo=(srgb(88, 96, 108), 0.82, 0.0), mat_camisa=(srgb(84, 78, 70), 0.9, 0.0), **FORRO)),
    # --- celadores: cuatro siluetas distintas de verdad; el traje y la corbata se tiñen
    'celador-hombre-alto': dict(familia='celador-hombre', variante='alto', silueta='alto', escala=1.06,
                                celador=dict(pelo='rapado', bajo_chaqueta=0.895,
                                             gafas=dict(forma='envolvente', ancho=0.031, alto=0.0105)),
                                paleta=_celador('oscura', srgb(20, 16, 14), srgb(176, 196, 216), srgb(28, 38, 52), srgb(60, 62, 66), 0.3, 0.7)),
    'celador-hombre-ancho': dict(familia='celador-hombre', variante='ancho', silueta='ancho', escala=1.02,
                                 celador=dict(pelo='raya', hombreras=0.022,
                                              gafas=dict(forma='barra', ancho=0.027, alto=0.0135)),
                                 paleta=_celador('clara', srgb(84, 50, 34), srgb(218, 206, 178), srgb(30, 44, 32), srgb(18, 16, 16), 0.3, 0.0)),
    'celador-hombre-mayor': dict(familia='celador-hombre', variante='mayor', silueta='mayor', escala=0.98,
                                 celador=dict(pelo='canoso', bajo_chaqueta=0.85,
                                              gafas=dict(forma='pinza', ancho=0.024, alto=0.0125)),
                                 paleta=_p(_celador('media', srgb(150, 146, 140), srgb(206, 196, 172), srgb(52, 36, 24),
                                                    srgb(150, 120, 60), 0.25, 0.9),
                                           mat_sombrero=(srgb(30, 30, 32), 0.7, 0.0))),
    'celador-mujer-mujer': dict(familia='celador-mujer', variante='mujer', silueta='mujer', escala=1.0,
                                celador=dict(pelo='mono', gafas=dict(forma='gato', ancho=0.025, alto=0.0125)),
                                paleta=_celador('morena', srgb(26, 20, 18), srgb(192, 196, 214), srgb(48, 28, 44), srgb(58, 34, 26), 0.35, 0.0)),
    # --- durmientes: dos cuerpos por cuatro ropas de calle de madrugada (quiebro-durmientes: cuerpo 0|1, ropa 0-3).
    # La chaqueta de obra era ámbar (138, 88, 42): el color que el diseño reserva para lo del jugador
    # (cabinas, esquirlas, avisos). Ahora es azul de faena con franjas grises.
    'durmiente-hombre-lluvia': dict(familia='durmiente-hombre', variante='lluvia', ropa=0,
                                    paleta=_p(_DUH, mat_abrigo=(srgb(44, 74, 92), 0.32, 0.0), mat_camisa=(srgb(60, 64, 72), 0.84, 0.0),
                                              mat_interior=(srgb(28, 28, 30), 0.5, 0.0))),
    'durmiente-hombre-obra': dict(familia='durmiente-hombre', variante='obra', ropa=1,
                                  paleta=_p(_DUH, mat_abrigo=(srgb(52, 64, 86), 0.84, 0.0), mat_franja=(srgb(150, 152, 150), 0.5, 0.0),
                                            mat_tela=(srgb(58, 60, 56), 0.84, 0.0), mat_calzado=(srgb(96, 72, 48), 0.7, 0.0),
                                            mat_camisa=(srgb(70, 70, 72), 0.9, 0.0))),
    'durmiente-hombre-sudadera': dict(familia='durmiente-hombre', variante='sudadera', ropa=2,
                                      paleta=_p(_DUH, mat_abrigo=(srgb(48, 66, 56), 0.9, 0.0), mat_tela=(srgb(64, 64, 68), 0.88, 0.0),
                                                mat_calzado=(srgb(150, 150, 146), 0.6, 0.0), mat_suela=(srgb(200, 198, 190), 0.8, 0.0))),
    'durmiente-hombre-camarero': dict(familia='durmiente-hombre', variante='camarero', ropa=3,
                                      paleta=_p(_DUH, mat_camisa=(srgb(212, 210, 202), 0.7, 0.0), mat_abrigo=(srgb(26, 26, 28), 0.66, 0.0),
                                                mat_corbata=(srgb(84, 22, 26), 0.5, 0.0), mat_tela=(srgb(24, 24, 26), 0.8, 0.0),
                                                mat_calzado=(srgb(16, 16, 16), 0.3, 0.0))),
    'durmiente-mujer-lluvia': dict(familia='durmiente-mujer', variante='lluvia', ropa=0,
                                   paleta=_p(_DUM, mat_abrigo=(srgb(112, 42, 50), 0.32, 0.0), mat_camisa=(srgb(90, 80, 70), 0.84, 0.0),
                                             mat_interior=(srgb(28, 28, 30), 0.5, 0.0))),
    'durmiente-mujer-obra': dict(familia='durmiente-mujer', variante='obra', ropa=1,
                                 paleta=_p(_DUM, mat_abrigo=(srgb(70, 78, 62), 0.84, 0.0), mat_franja=(srgb(150, 152, 150), 0.5, 0.0),
                                           mat_tela=(srgb(52, 60, 80), 0.84, 0.0), mat_calzado=(srgb(90, 70, 50), 0.7, 0.0),
                                           mat_camisa=(srgb(76, 72, 74), 0.9, 0.0))),
    'durmiente-mujer-sudadera': dict(familia='durmiente-mujer', variante='sudadera', ropa=2,
                                     paleta=_p(_DUM, mat_abrigo=(srgb(92, 50, 56), 0.9, 0.0), mat_tela=(srgb(46, 48, 54), 0.88, 0.0),
                                               mat_calzado=(srgb(140, 140, 136), 0.6, 0.0), mat_suela=(srgb(200, 198, 190), 0.8, 0.0))),
    'durmiente-mujer-camarero': dict(familia='durmiente-mujer', variante='camarero', ropa=3,
                                     paleta=_p(_DUM, mat_camisa=(srgb(212, 210, 202), 0.7, 0.0), mat_abrigo=(srgb(26, 26, 28), 0.66, 0.0),
                                               mat_corbata=(srgb(84, 22, 26), 0.5, 0.0), mat_tela=(srgb(24, 24, 26), 0.8, 0.0),
                                               mat_calzado=(srgb(16, 16, 16), 0.3, 0.0))),
}

FAMILIAS = {
    'desvelado-hombre': dict(clase='desvelado', sexo='m', variantes=('gabardina', 'ligera', 'mole')),
    'desvelado-mujer': dict(clase='desvelado', sexo='f', variantes=('gabardina', 'ligera', 'mole')),
    'celador-hombre': dict(clase='celador', sexo='m', variantes=('alto', 'ancho', 'mayor')),
    'celador-mujer': dict(clase='celador', sexo='f', variantes=('mujer',)),
    'durmiente-hombre': dict(clase='durmiente', sexo='m', variantes=('lluvia', 'obra', 'sudadera', 'camarero')),
    'durmiente-mujer': dict(clase='durmiente', sexo='f', variantes=('lluvia', 'obra', 'sudadera', 'camarero')),
}

# ═══ LOS TRIÁNGULOS (segunda pasada) ═══
# La primera entrega llevaba el LOD0 a 12-16k. Con seis jugadores en N0: 6 × 15,8k + 14 NPC × 4,3k +
# 48 durmientes × 1k ≈ 203k, contra un tope de 150k (§8), y eso antes de pintar la ciudad. Ahora, lo
# que dice el diseño: unos 8.000 el propio (LOD0), unos 4.000 los compañeros y los NPC (LOD1), la
# multitud a unos 1.000 (LOD2, el VAT de N1 es de 1.500) y el MANIQUÍ de 400 de los durmientes en N0
# (LOD3, sólo durmientes). Con eso: 8k + 5 × 4k + 14 × 4k + 48 × 0,4k ≈ 103k.
# Aquí va el del cuerpo SDF; ojos, cejas, gafas, corbata y faldón se suman aparte y validar.py mide el total.
PRESUPUESTO = {
    'desvelado': (5600, 2950, 880),
    'celador': (6100, 3100, 940),
    'durmiente': (6300, 3200, 980, 380),
}
# LOD3: el maniquí de la multitud en N0, sólo en los durmientes
LODS_DE_LA_CLASE = {'desvelado': 3, 'celador': 3, 'durmiente': 4}

for _id, _f in FIGURAS.items():
    _fam = FAMILIAS[_f['familia']]
    _f.setdefault('clase', _fam['clase'])
    _f.setdefault('sexo', _fam['sexo'])
    _f.setdefault('escala', 1.0)
    _f['presupuesto'] = PRESUPUESTO[_fam['clase']]


def sexo_de(fig):
    return FIGURAS[fig]['sexo']


def figuras_de_sexo(sexo):
    return [k for k, f in FIGURAS.items() if f['sexo'] == sexo]


# Las mallas que la pasada de suelo del horneado deforma para cada sexo: una de cada silueta que
# cambie el volumen (la más gruesa manda cuando algo baja del suelo).
NUBES_DEL_HORNEADO = {
    'm': ('desvelado-hombre-gabardina', 'desvelado-hombre-mole', 'celador-hombre-ancho', 'durmiente-hombre-lluvia',
          'durmiente-hombre-sudadera'),
    'f': ('desvelado-mujer-gabardina', 'desvelado-mujer-mole', 'celador-mujer-mujer', 'durmiente-mujer-lluvia',
          'durmiente-mujer-sudadera'),
}

# Índice global de cada zona (el atributo `_ZONA` de LOD1 y LOD2): el mismo en todas las figuras.
ZONAS = sorted({z for f in FIGURAS.values() for z in f['paleta']})


# ═══ EL LOD0 DE LOS DESVELADOS, UNO POR ESTILO (segunda pasada) ═══
# El propio baja su LOD0 (~8k) y los compañeros van a LOD1: juntar los tres estilos en un fichero hacía
# bajar 2/3 de más jugando solo (la revisión: ~1 MB de la primera noche). Así que los desvelados son una
# figura por estilo en el manifiesto (`desvelado-hombre-gabardina`…), cuyo LOD0 es su propio fichero y
# cuyos LOD1 y LOD2 son los de la familia (con las tres mallas: el cliente enseña la suya por nombre).
LOD0_POR_VARIANTE = ('desvelado',)


def figura_del_manifiesto(fig):
    """El nombre de la figura en reparto.json: la familia, o la figura entera si su LOD0 va aparte."""
    f = FIGURAS[fig]
    return fig if f['clase'] in LOD0_POR_VARIANTE else f['familia']


def archivo_lod0(fig):
    return figura_del_manifiesto(fig) + '.glb'
