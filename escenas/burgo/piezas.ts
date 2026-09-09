/**
 * LAS PIEZAS DEL BURGO: qué modelo de qué pack entra en `burgo.glb`, con qué nombre
 * lo busca la escena, y a qué escala queda cada uno.
 *
 * ═══ QUÉ ES EL BURGO, EN DOS LÍNEAS ═══
 *
 * Un arcade de la Sala: se compran solares de un burgo medieval, se cobra renta a
 * quien cae en ellos y se alzan casas —y luego una posada— para subirla. Su tablero
 * es un burgo en tres dimensiones: una tira de casillas con un edificio en cada
 * solar, casas-ficha del color de cada asiento, monedas, y en una esquina la
 * mazmorra. Ésta es la PRIMERA tabla de piezas, provisional: la lista definitiva la
 * decide quien escriba el juego, y por eso está hecha para ampliarse —una línea por
 * pieza, un pack por columna— y no para durar.
 *
 * ═══ SIETE PACKS, Y POR QUÉ ESTA TABLA LLEVA `pack` Y `escala` ═══
 *
 * El embarcadero sale de UN pack (`escenas/embarcadero/piezas.ts`), y por eso su
 * tabla es nombre y fichero. El Burgo mezcla siete de KayKit (todos CC0, ver
 * `arte/README.md`): el hexagonal EXTRA para el caserío y el suelo, Board Game Bits
 * para las fichas, Dungeon para la mazmorra, Resource Bits para el oro, y
 * Furniture, Restaurant y Halloween Bits para el atrezo de la plaza. Cada uno
 * lleva SU textura y SU unidad, y las unidades no casan: medido con el fichero
 * delante, la casa del hexagonal mide 0,930, la casa-ficha 1,000, la pared de la
 * mazmorra 4,000 y una silla 1,258. Puestas tal cual, la silla sería más alta que
 * la casa. De ahí las dos columnas: `pack` dice de qué carpeta y con qué textura
 * se hornea, y la escala —por pack, y por pieza si hace falta— dice cuánto hay que
 * subir cada una para que TODO quede a la escala del mundo del Muelle, que es la
 * de `escenas/escala.ts`: una persona mide 2,543.
 *
 * ═══ LA ESCALA SE APLICA AL COMPILAR, AL REVÉS QUE EN EL EMBARCADERO ═══
 *
 * `embarcadero.glb` va a la unidad del pack y la escena lo sube con
 * `ESCALA_DEL_PACK` al instanciar, porque comparte pack con el tablero y dos
 * ficheros del mismo pack a dos escalas se notarían el día que compartan `Canvas`.
 * Aquí eso no vale: con siete unidades distintas, la escena tendría que llevar una
 * tabla de factores por pack y acordarse de aplicarla en cada instancia, y el día
 * que se olvidara en una, saldría una mesa del tamaño de una iglesia sin que nada
 * protestara. Así que el compilador HORNEA la escala en las posiciones —y en las
 * traslaciones de los hijos—, `burgo.glb` sale ya a escala del mundo, y la escena
 * lo instancia a 1. La consecuencia, dicha para quien monte el lobby: una pieza de
 * este fichero NO se multiplica por `ESCALA_DEL_PACK`, aunque venga del hexagonal.
 * `verify:burgo-modelos` mide que sea así: la casa-ficha mide una persona, la casa
 * grande dos, la tesela lo que la del tablero ya escalada, y la pared de la
 * mazmorra lo que la muralla del pack hexagonal.
 *
 * ═══ CÓMO SE ELIGIÓ CADA FACTOR, MEDIDO Y NO SUPUESTO ═══
 *
 *   · Hexagonal: `ESCALA_DEL_PACK` (5,469), la misma cadena de `escala.ts`.
 *   · Board Game Bits: son fichas de mesa —casa, peón, figura, disco, monedas— y
 *     su unidad no tiene referente en el mundo. Se ancla como `escala.ts` ancló la
 *     casa: una casa-ficha mide UNA persona (la casa de verdad mide dos), o sea
 *     2,543 por 1,000 medido. Con eso cuatro casas en 2 × 2 (5,1) caben en una
 *     casilla de 6 con margen, y el peón queda a 2,33: casi una persona.
 *   · Dungeon: está construido sobre una rejilla de 4 (pared 4 × 4 × 1, losa 4 × 4,
 *     pilar de 4 de alto, medido). La casilla del Burgo mide 6, y la losa ES el
 *     suelo de una casilla: 6 / 4 = 1,5. Y sale redondo por otro lado que no se
 *     buscó: la pared queda a 6,0 y la muralla del hexagonal mide 1,1 × 5,469 =
 *     6,02. Las dos murallas del Burgo miden lo mismo.
 *   · Furniture, Restaurant, Halloween y Resource Bits: ya están en la unidad del
 *     personaje. Medido contra la persona de 2,543: el respaldo de una silla es
 *     media persona (1,26), una mesa 0,39 (1,00), una lámpara de pie una persona
 *     (2,52), el asiento de un banco 0,2 (0,50). Factor 1.
 *
 * ═══ EL COLOR DE JUGADOR SE TIÑE, COMO EN EL EMBARCADERO ═══
 *
 * Las piezas de asiento entran en su variante AZUL con la máscara `_TINTE` que el
 * compilador deriva comparando con la ROJA (`compilar-embarcadero.ts` cuenta el
 * método). La máscara y el atributo son los mismos que en el embarcadero, así que
 * `escenas/embarcadero/tinte.ts` tiñe también estas piezas. Lo que cambia es el
 * azul de referencia de cada pack (`AZUL_DE_LAS_FICHAS`), que se mide al compilar.
 *
 * ═══ ESTE FICHERO NO IMPORTA `three`, A PROPÓSITO ═══
 *
 * Es DATO: lo lee el compilador (Node, sin contexto de dibujo), lo lee el
 * comprobador y lo leerá la escena. Ver la cabecera de `escenas/nombres.ts`, que
 * explica también por qué ningún nombre lleva puntos ni dos puntos.
 */
import { ALTURA_DE_UNA_PERSONA, ESCALA_DEL_PACK } from '../escala';
import { NOMBRE_QUE_SOBREVIVE } from '../nombres';

/* La misma máscara que el embarcadero: un solo `tinte.ts` para los dos ficheros. */
export { ATRIBUTO_DE_TINTE, ATRIBUTO_DE_TINTE_CARGADO } from '../embarcadero/piezas';

// ---------------------------------------------------------------------------
// La escala
// ---------------------------------------------------------------------------

/**
 * LO QUE MIDE DE LADO UNA CASILLA DEL TABLERO, en unidades del mundo. Provisional.
 *
 * Seis: algo más que la casa grande del hexagonal ya escalada (4,3 × 4,7), y lo
 * justo para que cuatro casas-ficha en 2 × 2 (5,1) quepan con margen. De aquí
 * cuelga la escala de la mazmorra, y contra esto mide `verify:burgo-modelos`. Si
 * quien escriba el juego la cambia, hay que recompilar: la losa se hornea a este
 * tamaño.
 */
export const LADO_DE_CASILLA = 6;

/** La casa-ficha de Board Game Bits mide esto de alto en su pack (0,985 × 1,000 × 1,000). */
export const ALTURA_DE_LA_CASA_FICHA_EN_EL_PACK = 1;

/** Una casa-ficha mide UNA persona: la mitad de la casa de verdad. Sale 2,543. */
export const ESCALA_DE_LAS_FICHAS = ALTURA_DE_UNA_PERSONA / ALTURA_DE_LA_CASA_FICHA_EN_EL_PACK;

/** La rejilla del pack Dungeon: pared 4 × 4 × 1, losa 4 × 4, pilar de 4 (medido). */
export const LADO_DE_LA_LOSA_EN_EL_PACK = 4;

/** La losa es el suelo de una casilla. Sale 1,5. */
export const ESCALA_DE_LA_MAZMORRA = LADO_DE_CASILLA / LADO_DE_LA_LOSA_EN_EL_PACK;

/** Los packs de atrezo ya están en la unidad del personaje: ver la cabecera. */
export const ESCALA_DEL_ATREZO = 1;

/**
 * EL TECHO DEL FICHERO: tres megas, lo que se aceptó que viaje a un móvil por abrir
 * un arcade. Lo lee el compilador para negarse a escribir más, y el comprobador
 * para exigir que lo escrito no se haya pasado. La primera tabla completa pesaba
 * 3.820 kB y se recortó (ver `PIEZAS_EN_ESPERA`).
 */
export const TOPE_DE_BYTES_DEL_BURGO = 3 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Los packs
// ---------------------------------------------------------------------------

/** Dónde se descomprimen los packs, respecto a la raíz del repositorio. */
export const CARPETA_DE_PACKS = 'arte/kaykit';

export type PackDelBurgo =
  | 'hexagon-extra'
  | 'board-game-bits'
  | 'dungeon'
  | 'resource-bits'
  | 'furniture-bits'
  | 'restaurant-bits'
  | 'halloween-bits';

/**
 * CADA PACK: su carpeta de `.gltf` (la estructura del zip tal cual, como espera
 * `arte/README.md`) y a cuánto hay que subirlo para que quede a escala del mundo.
 */
export const PACKS: Readonly<Record<PackDelBurgo, { readonly carpeta: string; readonly escala: number }>> = {
  'hexagon-extra': { carpeta: 'hexagon-extra/KayKit_Medieval_Hexagon_Pack_1.0_EXTRA/Assets/gltf', escala: ESCALA_DEL_PACK },
  'board-game-bits': { carpeta: 'board-game-bits/KayKit_BoardGameBits_1.0_FREE/Assets/gltf', escala: ESCALA_DE_LAS_FICHAS },
  dungeon: { carpeta: 'dungeon/KayKit_Dungeon_Pack_1.1_FREE/Assets/gltf', escala: ESCALA_DE_LA_MAZMORRA },
  'resource-bits': { carpeta: 'resource-bits/KayKit_ResourceBits_1.0_FREE/Assets/gltf', escala: ESCALA_DEL_ATREZO },
  'furniture-bits': { carpeta: 'furniture-bits/KayKit_Furniture_Bits_1.0_FREE/Assets/gltf', escala: ESCALA_DEL_ATREZO },
  'restaurant-bits': { carpeta: 'restaurant-bits/KayKit_Restaurant_Bits_1.0_FREE/Assets/gltf', escala: ESCALA_DEL_ATREZO },
  'halloween-bits': { carpeta: 'halloween-bits/KayKit_HalloweenBits_1.0_FREE/Assets/gltf', escala: ESCALA_DEL_ATREZO },
};

// ---------------------------------------------------------------------------
// Las piezas
// ---------------------------------------------------------------------------

/** Una pieza que entra en el `.glb`: nuestro nombre, de dónde sale, y a qué escala. */
export interface PiezaDelBurgo {
  readonly nombre: string;
  readonly pack: PackDelBurgo;
  /** Ruta dentro de la carpeta de `.gltf` del pack. */
  readonly fichero: string;
  /**
   * La variante ROJA de la misma pieza, sólo en las que se tiñen: el compilador la
   * hornea también y deriva `_TINTE` de la diferencia con la azul.
   */
  readonly tinte?: string;
  /**
   * Un factor POR ENCIMA del de su pack, para la pieza que quiera ir a otra talla
   * que sus hermanas. Se multiplica: 1 si no se dice. En esta primera tabla nadie
   * lo usa; está para que ampliar no obligue a inventar otro pack.
   */
  readonly escala?: number;
}

/** A cuánto se hornea una pieza: el factor de su pack por el suyo propio. */
export function escalaDe(pieza: PiezaDelBurgo): number {
  return PACKS[pieza.pack].escala * (pieza.escala ?? 1);
}

/* Los caminos dentro del pack hexagonal, los mismos que usa el embarcadero. */
const suelo = (f: string): string => `tiles/base/${f}.gltf`;
const natura = (f: string): string => `decoration/nature/${f}.gltf`;
const trasto = (f: string): string => `decoration/props/${f}.gltf`;
const neutro = (f: string): string => `buildings/neutral/${f}.gltf`;
const dePueblo = (color: string, f: string): string => `buildings/${color}/building_${f}_${color}.gltf`;
const unidad = (color: string, f: string): string => `units/${color}/${f}_${color}_full.gltf`;
/* Los packs pequeños tienen todos los `.gltf` en la raíz de su carpeta. */
const plano = (f: string): string => `${f}.gltf`;

/**
 * LOS NOMBRES QUE EL CÓDIGO USA, en un solo sitio.
 *
 * Constantes y no cadenas sueltas por lo de siempre: una cadena mal escrita no la
 * ve el compilador, y el síntoma es una pieza que no aparece, sin error.
 */
export const PIEZA = {
  /* Las piezas de asiento. Se TIÑEN: entran en azul con su máscara. */
  casa: 'casa',
  casaGrande: 'casa-grande',
  posada: 'posada',
  peon: 'peon',
  figura: 'figura',
  ficha: 'ficha',
  bandera: 'bandera',
  estandarte: 'estandarte',

  /* Los edificios de solar: neutros, cada barrio con un color fijo del pack. */
  herreria: 'herreria',
  mercado: 'mercado',
  iglesia: 'iglesia',
  ayuntamiento: 'ayuntamiento',
  aserradero: 'aserradero',
  mina: 'mina',
  establos: 'establos',
  ermita: 'ermita',
  muelle: 'muelle',
  torreA: 'torre-a',
  torreB: 'torre-b',
  vigia: 'vigia',
  caseron: 'caseron',
  molino: 'molino',
  pozo: 'pozo',
  muralla: 'muralla',
  puertaMuralla: 'puerta-muralla',
  esquinaMuralla: 'esquina-muralla',
  esquinaPuerta: 'esquina-puerta',
  torreon: 'torreon',
  tablado: 'tablado',
  tienda: 'tienda',
  almiar: 'almiar',
  diana: 'diana',

  /* La mazmorra. */
  muro: 'muro',
  muroReja: 'muro-reja',
  muroEsquina: 'muro-esquina',
  muroPuerta: 'muro-puerta',
  antorchaPared: 'antorcha-pared',
  antorcha: 'antorcha',
  cofre: 'cofre',
  arca: 'arca',
  tonel: 'tonel',
  pilar: 'pilar',
  losa: 'losa',
  llavero: 'llavero',
  montonPequeno: 'monton-pequeno',
  montonMediano: 'monton-mediano',
  montonGrande: 'monton-grande',
  pendon: 'pendon',

  /* El dinero. */
  moneda: 'moneda',
  moneda5: 'moneda-5',
  moneda10: 'moneda-10',
  lingotes: 'lingotes',

  /* El suelo y la naturaleza: las mismas piezas que el tablero, ya escaladas. */
  tesela: 'tesela',
  fondo: 'tesela-fondo',
  arbolA: 'arbol-a',
  arbolB: 'arbol-b',
  arboledaPequena: 'arboleda-pequena',
  rocaA: 'roca-a',
  rocaB: 'roca-b',
  nubeGrande: 'nube-grande',
  nubePequena: 'nube-pequena',
  colinasA: 'colinas-a',

  /* El atrezo de la plaza, para el tablero y para el lobby. */
  mesaRedonda: 'mesa-redonda',
  mesaPequena: 'mesa-pequena',
  silla: 'silla',
  taburete: 'taburete',
  mesaDeMadera: 'mesa-de-madera',
  cajaDeZanahorias: 'caja-de-zanahorias',
  farol: 'farol',
  farola: 'farola',
  banco: 'banco',
  verja: 'verja',
  verjaPuerta: 'verja-puerta',
} as const;

export type NombreDePieza = (typeof PIEZA)[keyof typeof PIEZA];

/** Las que llevan máscara de tinte. La escena las tiñe del color del asiento. */
export const PIEZAS_QUE_SE_TINEN: readonly NombreDePieza[] = [
  PIEZA.casa,
  PIEZA.casaGrande,
  PIEZA.posada,
  PIEZA.peon,
  PIEZA.figura,
  PIEZA.ficha,
  PIEZA.bandera,
  PIEZA.estandarte,
];

/**
 * LAS QUE SE TIÑEN ENTERAS, medido al compilar y no supuesto.
 *
 * Las fichas de Board Game Bits —casa, peón, figura, disco— son piezas de un solo
 * color: pintadas enteras en la celda de su color del atlas, y la roja es la misma
 * celda una columna más allá, así que difieren en TODOS sus vértices. El
 * estandarte es la unidad `_full` del hexagonal, ficha también. La casa grande, la
 * posada y la bandera tienen madera, piedra y mástil que no cambian de color, y su
 * máscara sale a medias. `verify:burgo-modelos` exige que sean exactamente éstas.
 *
 * La consecuencia la paga quien tiñe (`embarcadero/tinte.ts`): en las enteras hay
 * que conservar la luminancia relativa de cada vértice, no sustituir el color en
 * plano, o la ficha sale sin volumen.
 */
export const PIEZAS_TENIDAS_ENTERAS: readonly NombreDePieza[] = [
  PIEZA.casa,
  PIEZA.peon,
  PIEZA.figura,
  PIEZA.ficha,
  PIEZA.estandarte,
];

/**
 * EL AZUL MEDIO DE LAS FICHAS de Board Game Bits en sRGB, medido al compilar sobre
 * los vértices de tinte de la casa-ficha: la referencia contra la que se mide la
 * luminancia de un vértice teñible para conservar su sombreado al cambiarle el
 * color. Para las piezas del hexagonal vale `AZUL_DEL_PACK` del embarcadero.
 */
export const AZUL_DE_LAS_FICHAS: readonly [number, number, number] = [36, 126, 187];

/**
 * LAS QUE SE QUEDARON FUERA POR PESO, con su coste medido para que quien amplíe la
 * tabla sepa lo que mete. La primera tabla completa (79 piezas, 86.152 triángulos)
 * pesaba 3.820 kB con el tope en 3.072; se quitaron los cinco edificios más caros y
 * la caja de panes, que gastaba 2.772 triángulos en bollos. Vuelven con una línea en
 * `PIEZAS_DEL_BURGO` y otra en `PIEZA`, a cambio de quitar otras o subir el tope.
 *
 *     castillo        buildings/blue/building_castle_blue.gltf          274,8 kB  5.659 triángulos  (10,8 × 21,8 × 12,3: dos casillas de ancho)
 *     cuartel         buildings/red/building_barracks_red.gltf          197,8 kB  4.007 triángulos
 *     campo-de-tiro   buildings/yellow/building_archeryrange_yellow.gltf 175,2 kB  3.819 triángulos
 *     astillero       buildings/blue/building_shipyard_blue.gltf        162,7 kB  3.390 triángulos
 *     taller          buildings/yellow/building_workshop_yellow.gltf    158,0 kB  3.672 triángulos
 *     caja-de-panes   restaurant-bits crate_buns.gltf                    89,9 kB  2.772 triángulos
 */
export const PIEZAS_EN_ESPERA: readonly string[] = ['castillo', 'cuartel', 'campo-de-tiro', 'astillero', 'taller', 'caja-de-panes'];

/** La tabla entera: lo que compila `compilar-burgo.ts`, en este orden. */
export const PIEZAS_DEL_BURGO: readonly PiezaDelBurgo[] = [
  /* De asiento: la azul, más la roja para derivar la máscara. */
  { nombre: PIEZA.casa, pack: 'board-game-bits', fichero: plano('building_blue'), tinte: plano('building_red') },
  { nombre: PIEZA.casaGrande, pack: 'hexagon-extra', fichero: dePueblo('blue', 'home_A'), tinte: dePueblo('red', 'home_A') },
  { nombre: PIEZA.posada, pack: 'hexagon-extra', fichero: dePueblo('blue', 'tavern'), tinte: dePueblo('red', 'tavern') },
  { nombre: PIEZA.peon, pack: 'board-game-bits', fichero: plano('pawn_A_blue'), tinte: plano('pawn_A_red') },
  { nombre: PIEZA.figura, pack: 'board-game-bits', fichero: plano('meeple_blue'), tinte: plano('meeple_red') },
  { nombre: PIEZA.ficha, pack: 'board-game-bits', fichero: plano('token_blue'), tinte: plano('token_red') },
  { nombre: PIEZA.bandera, pack: 'hexagon-extra', fichero: trasto('flag_blue'), tinte: trasto('flag_red') },
  { nombre: PIEZA.estandarte, pack: 'hexagon-extra', fichero: unidad('blue', 'banner'), tinte: unidad('red', 'banner') },

  /*
   * Los edificios de solar. El color es el del barrio y se elige aquí, fijo; los
   * repartos son provisionales: rojo para el barrio del hierro, verde para el del
   * campo, amarillo para el de los oficios, azul para el del poder y el agua.
   */
  { nombre: PIEZA.herreria, pack: 'hexagon-extra', fichero: dePueblo('red', 'blacksmith') },
  { nombre: PIEZA.mercado, pack: 'hexagon-extra', fichero: dePueblo('green', 'market') },
  { nombre: PIEZA.iglesia, pack: 'hexagon-extra', fichero: dePueblo('yellow', 'church') },
  { nombre: PIEZA.ayuntamiento, pack: 'hexagon-extra', fichero: dePueblo('blue', 'townhall') },
  { nombre: PIEZA.aserradero, pack: 'hexagon-extra', fichero: dePueblo('green', 'lumbermill') },
  { nombre: PIEZA.mina, pack: 'hexagon-extra', fichero: dePueblo('red', 'mine') },
  { nombre: PIEZA.establos, pack: 'hexagon-extra', fichero: dePueblo('green', 'stables') },
  { nombre: PIEZA.ermita, pack: 'hexagon-extra', fichero: dePueblo('green', 'shrine') },
  { nombre: PIEZA.muelle, pack: 'hexagon-extra', fichero: dePueblo('blue', 'docks') },
  { nombre: PIEZA.torreA, pack: 'hexagon-extra', fichero: dePueblo('red', 'tower_A') },
  { nombre: PIEZA.torreB, pack: 'hexagon-extra', fichero: dePueblo('blue', 'tower_B') },
  { nombre: PIEZA.vigia, pack: 'hexagon-extra', fichero: dePueblo('yellow', 'watchtower') },
  { nombre: PIEZA.caseron, pack: 'hexagon-extra', fichero: dePueblo('green', 'home_B') },
  { nombre: PIEZA.molino, pack: 'hexagon-extra', fichero: dePueblo('red', 'windmill') },
  { nombre: PIEZA.pozo, pack: 'hexagon-extra', fichero: dePueblo('green', 'well') },
  { nombre: PIEZA.muralla, pack: 'hexagon-extra', fichero: neutro('wall_straight') },
  { nombre: PIEZA.puertaMuralla, pack: 'hexagon-extra', fichero: neutro('wall_straight_gate') },
  { nombre: PIEZA.esquinaMuralla, pack: 'hexagon-extra', fichero: neutro('wall_corner_A_outside') },
  { nombre: PIEZA.esquinaPuerta, pack: 'hexagon-extra', fichero: neutro('wall_corner_A_gate') },
  { nombre: PIEZA.torreon, pack: 'hexagon-extra', fichero: dePueblo('blue', 'tower_base') },
  { nombre: PIEZA.tablado, pack: 'hexagon-extra', fichero: neutro('building_stage_A') },
  { nombre: PIEZA.tienda, pack: 'hexagon-extra', fichero: dePueblo('yellow', 'tent') },
  { nombre: PIEZA.almiar, pack: 'hexagon-extra', fichero: trasto('haybale') },
  { nombre: PIEZA.diana, pack: 'hexagon-extra', fichero: trasto('target') },

  /* La mazmorra, a 1,5: la losa es una casilla y el muro mide lo que la muralla. */
  { nombre: PIEZA.muro, pack: 'dungeon', fichero: plano('wall') },
  { nombre: PIEZA.muroReja, pack: 'dungeon', fichero: plano('wall_gated') },
  { nombre: PIEZA.muroEsquina, pack: 'dungeon', fichero: plano('wall_corner') },
  { nombre: PIEZA.muroPuerta, pack: 'dungeon', fichero: plano('wall_doorway') },
  { nombre: PIEZA.antorchaPared, pack: 'dungeon', fichero: plano('torch_mounted') },
  { nombre: PIEZA.antorcha, pack: 'dungeon', fichero: plano('torch_lit') },
  { nombre: PIEZA.cofre, pack: 'dungeon', fichero: plano('chest') },
  { nombre: PIEZA.arca, pack: 'dungeon', fichero: plano('chest_gold') },
  { nombre: PIEZA.tonel, pack: 'dungeon', fichero: plano('barrel_large') },
  { nombre: PIEZA.pilar, pack: 'dungeon', fichero: plano('pillar') },
  { nombre: PIEZA.losa, pack: 'dungeon', fichero: plano('floor_tile_large') },
  { nombre: PIEZA.llavero, pack: 'dungeon', fichero: plano('keyring_hanging') },
  { nombre: PIEZA.montonPequeno, pack: 'dungeon', fichero: plano('coin_stack_small') },
  { nombre: PIEZA.montonMediano, pack: 'dungeon', fichero: plano('coin_stack_medium') },
  { nombre: PIEZA.montonGrande, pack: 'dungeon', fichero: plano('coin_stack_large') },
  { nombre: PIEZA.pendon, pack: 'dungeon', fichero: plano('banner_red') },

  /* El dinero: las monedas son fichas de mesa y van a su escala; el oro, atrezo. */
  { nombre: PIEZA.moneda, pack: 'board-game-bits', fichero: plano('coin_gold') },
  { nombre: PIEZA.moneda5, pack: 'board-game-bits', fichero: plano('coin_5_gold') },
  { nombre: PIEZA.moneda10, pack: 'board-game-bits', fichero: plano('coin_10_gold') },
  { nombre: PIEZA.lingotes, pack: 'resource-bits', fichero: plano('Gold_Bars_Stack_Small') },

  /* El suelo y la naturaleza: los mismos ficheros que el tablero y el embarcadero. */
  { nombre: PIEZA.tesela, pack: 'hexagon-extra', fichero: suelo('hex_grass') },
  { nombre: PIEZA.fondo, pack: 'hexagon-extra', fichero: suelo('hex_grass_bottom') },
  { nombre: PIEZA.arbolA, pack: 'hexagon-extra', fichero: natura('tree_single_A') },
  { nombre: PIEZA.arbolB, pack: 'hexagon-extra', fichero: natura('tree_single_B') },
  { nombre: PIEZA.arboledaPequena, pack: 'hexagon-extra', fichero: natura('trees_A_small') },
  { nombre: PIEZA.rocaA, pack: 'hexagon-extra', fichero: natura('rock_single_A') },
  { nombre: PIEZA.rocaB, pack: 'hexagon-extra', fichero: natura('rock_single_B') },
  { nombre: PIEZA.nubeGrande, pack: 'hexagon-extra', fichero: natura('cloud_big') },
  { nombre: PIEZA.nubePequena, pack: 'hexagon-extra', fichero: natura('cloud_small') },
  { nombre: PIEZA.colinasA, pack: 'hexagon-extra', fichero: natura('hills_A') },

  /* El atrezo de la plaza. */
  { nombre: PIEZA.mesaRedonda, pack: 'restaurant-bits', fichero: plano('table_round_A') },
  { nombre: PIEZA.mesaPequena, pack: 'restaurant-bits', fichero: plano('table_round_A_small') },
  { nombre: PIEZA.silla, pack: 'restaurant-bits', fichero: plano('chair_A') },
  { nombre: PIEZA.taburete, pack: 'furniture-bits', fichero: plano('chair_stool_wood') },
  { nombre: PIEZA.mesaDeMadera, pack: 'furniture-bits', fichero: plano('table_small') },
  { nombre: PIEZA.cajaDeZanahorias, pack: 'restaurant-bits', fichero: plano('crate_carrots') },
  { nombre: PIEZA.farol, pack: 'halloween-bits', fichero: plano('lantern_standing') },
  { nombre: PIEZA.farola, pack: 'halloween-bits', fichero: plano('post_lantern') },
  { nombre: PIEZA.banco, pack: 'halloween-bits', fichero: plano('bench') },
  { nombre: PIEZA.verja, pack: 'halloween-bits', fichero: plano('fence') },
  { nombre: PIEZA.verjaPuerta, pack: 'halloween-bits', fichero: plano('fence_gate') },
];

/** Todos los nombres, para que el comprobador exija que el `.glb` tenga exactamente éstos. */
export function nombresDelBurgo(): string[] {
  return PIEZAS_DEL_BURGO.map((p) => p.nombre);
}

/**
 * Se comprueba al cargar el módulo: un nombre que `GLTFLoader` fuera a cambiar es
 * una pieza que no aparece nunca, sin error; una escala que no sea un número
 * positivo es una pieza invisible o del revés. Mejor reventar aquí, en Node.
 */
for (const p of PIEZAS_DEL_BURGO) {
  if (!NOMBRE_QUE_SOBREVIVE.test(p.nombre)) {
    throw new Error(`La pieza «${p.nombre}» lleva un carácter que GLTFLoader borra al cargar.`);
  }
  const k = escalaDe(p);
  if (!Number.isFinite(k) || k <= 0) {
    throw new Error(`La pieza «${p.nombre}» sale a escala ${String(k)}, que no es un factor.`);
  }
}
const repetidos = nombresDelBurgo().filter((n, i, todos) => todos.indexOf(n) !== i);
if (repetidos.length > 0) {
  throw new Error(`Piezas del Burgo repetidas: ${repetidos.join(', ')}`);
}
const enterasSinTinte = PIEZAS_TENIDAS_ENTERAS.filter((n) => !PIEZAS_QUE_SE_TINEN.includes(n));
if (enterasSinTinte.length > 0) {
  throw new Error(`Declaradas teñidas enteras sin ser teñibles: ${enterasSinTinte.join(', ')}`);
}
const enEsperaYDentro = PIEZAS_EN_ESPERA.filter((n) => (nombresDelBurgo() as string[]).includes(n));
if (enEsperaYDentro.length > 0) {
  throw new Error(`Piezas que están en la tabla y también en espera: ${enEsperaYDentro.join(', ')}. Bórralas de PIEZAS_EN_ESPERA.`);
}
