/**
 * LAS PIEZAS DEL EMBARCADERO: qué modelo del pack entra en `embarcadero.glb` y con
 * qué nombre lo busca la escena del lobby.
 *
 * ═══ POR QUÉ EL LOBBY TIENE SU PROPIO `.glb` Y NO LEE `tablero.glb` ═══
 *
 * `tablero.glb` es del tablero: lo compila la otra línea de trabajo, lleva la
 * textura del pack DENTRO y se pinta moviendo las UV por el atlas para sacar los
 * biomas y los colores de jugador. Nada de eso vale en el móvil hoy: Hermes no
 * decodifica un PNG empotrado, así que ese fichero en Android saldría gris. El
 * lobby compila lo suyo con el color HORNEADO en cada vértice (`COLOR_0`), como
 * los aventureros, y por eso cabe en los dos clientes desde el primer día.
 *
 * Y es un fichero aparte porque son dos productos con dos ritmos: el tablero
 * cambia cada vez que cambia el juego; el embarcadero, cuando cambie el lobby.
 * Compartir fichero sería compartir despliegue.
 *
 * ═══ LOS NOMBRES SON LOS DEL TABLERO CUANDO LA PIEZA ES LA MISMA ═══
 *
 * `tesela`, `orilla-a`, `arbol-a`, `taberna`, `bote`… se llaman igual que en
 * `escenas/nombres.ts`, y salen del MISMO fichero del pack, para que quien lea
 * las dos escenas no tenga que traducir. Lo que aquí es nuevo lleva nombre nuevo.
 *
 * ═══ EL COLOR DE JUGADOR SE TIÑE, NO SE COMPILA CUATRO VECES ═══
 *
 * El pack trae el muelle, el barco, la bandera y el estandarte en cuatro colores,
 * y las cuatro variantes son la misma geometría con otras UV. Aquí entra SÓLO la
 * azul, más una máscara por vértice (`_TINTE`, 0 o 1) que dice qué vértices son
 * «del color» (en el barco y el estandarte, todos: ver `PIEZAS_TENIDAS_ENTERAS`).
 * La máscara la deriva el compilador comparando el color horneado
 * de la variante azul con el de la roja: donde difieren, es tinte. Al cargar, la
 * escena pinta esos vértices del color del asiento — cualquier color, no sólo los
 * cuatro del pack, que es lo que hace falta para que el quinto y el sexto asiento
 * de Riberas tengan el suyo (ver `tema.ts`).
 *
 * ═══ ESTE FICHERO NO IMPORTA `three`, A PROPÓSITO ═══
 *
 * Es DATO: lo lee el compilador (Node, sin contexto de dibujo), lo lee el
 * comprobador y lo lee la escena. Ver la cabecera de `escenas/nombres.ts`, que
 * explica también por qué ningún nombre lleva puntos ni dos puntos.
 */
import { NOMBRE_QUE_SOBREVIVE } from '../nombres';

/** Una pieza que entra en el `.glb`: nuestro nombre, y de dónde sale. */
export interface PiezaDelEmbarcadero {
  readonly nombre: string;
  /** Ruta dentro de `Assets/gltf/` del pack hexagonal EXTRA. */
  readonly fichero: string;
  /**
   * La variante ROJA de la misma pieza, sólo en las que se tiñen: el compilador
   * la hornea también y deriva `_TINTE` de la diferencia con la azul.
   */
  readonly tinte?: string;
}

const suelo = (f: string): string => `tiles/base/${f}.gltf`;
const orilla = (f: string): string => `tiles/coast/${f}.gltf`;
const natura = (f: string): string => `decoration/nature/${f}.gltf`;
const trasto = (f: string): string => `decoration/props/${f}.gltf`;
const neutro = (f: string): string => `buildings/neutral/${f}.gltf`;
const dePueblo = (color: string, f: string): string => `buildings/${color}/building_${f}_${color}.gltf`;
const unidad = (color: string, f: string): string => `units/${color}/${f}_${color}_full.gltf`;

/**
 * LOS NOMBRES QUE EL CÓDIGO USA, en un solo sitio.
 *
 * Constantes y no cadenas sueltas por lo de siempre: una cadena mal escrita no la
 * ve el compilador, y el síntoma es una pieza que no aparece, sin error.
 */
export const PIEZA = {
  /* El suelo: las mismas teselas que el tablero, a la misma escala. */
  tesela: 'tesela',
  fondo: 'tesela-fondo',
  agua: 'tesela-agua',
  rampaBaja: 'rampa-baja',
  rampaAlta: 'rampa-alta',
  orillaA: 'orilla-a',
  orillaB: 'orilla-b',
  orillaC: 'orilla-c',
  orillaD: 'orilla-d',
  orillaE: 'orilla-e',

  /* El agua y lo que se amarra en ella. Los cuatro primeros se TIÑEN. */
  muelle: 'muelle',
  barco: 'barco',
  bandera: 'bandera',
  estandarte: 'estandarte',
  barcoDeNadie: 'barco-de-nadie',
  bote: 'bote',
  varadero: 'varadero',
  ancla: 'ancla',
  nenufarA: 'nenufar-a',
  nenufarB: 'nenufar-b',
  juncoA: 'junco-a',
  juncoB: 'junco-b',
  juncoC: 'junco-c',

  /* Los trastos de un muelle. */
  barril: 'barril',
  caja: 'caja',
  cajaGrande: 'caja-grande',
  cajon: 'cajon',
  saco: 'saco',
  lena: 'lena',
  piedra: 'piedra',
  almiar: 'almiar',
  carro: 'carro',
  abrevadero: 'abrevadero',
  cubo: 'cubo',
  escalera: 'escalera',
  pale: 'pale',
  tienda: 'tienda',

  /* El caserío del embarque. */
  taberna: 'taberna',
  casa: 'casa',
  casaB: 'casa-b',
  pozo: 'pozo',
  atalaya: 'atalaya',
  vigia: 'vigia',
  molino: 'molino',
  astillero: 'astillero',
  mercado: 'mercado',
  valla: 'valla',
  vallaPuerta: 'valla-puerta',
  puente: 'puente',

  /* La naturaleza, del primer plano al horizonte. */
  arbolA: 'arbol-a',
  arbolB: 'arbol-b',
  tocon: 'tocon',
  arboledaGrande: 'arboleda-grande',
  arboledaMedia: 'arboleda-media',
  arboledaPequena: 'arboleda-pequena',
  arboledaB: 'arboleda-b',
  colinaA: 'colina-a',
  colinaB: 'colina-b',
  colinaC: 'colina-c',
  colinasA: 'colinas-a',
  colinasArboladas: 'colinas-arboladas',
  montanaA: 'montana-a',
  montanaB: 'montana-b',
  montanaC: 'montana-c',
  montanaVerde: 'montana-verde',
  montanaArbolada: 'montana-arbolada',
  rocaA: 'roca-a',
  rocaB: 'roca-b',
  rocaC: 'roca-c',
  rocaD: 'roca-d',
  rocaE: 'roca-e',
  nubeGrande: 'nube-grande',
  nubePequena: 'nube-pequena',
} as const;

export type NombreDePieza = (typeof PIEZA)[keyof typeof PIEZA];

/** Las que llevan máscara de tinte. La escena las tiñe del color del asiento. */
export const PIEZAS_QUE_SE_TINEN: readonly NombreDePieza[] = [
  PIEZA.muelle,
  PIEZA.barco,
  PIEZA.bandera,
  PIEZA.estandarte,
];

/**
 * LAS QUE SE TIÑEN ENTERAS, medido al compilar y no supuesto.
 *
 * El muelle y la bandera son piezas con un poco de color: 44 vértices de 1.709 y
 * 44 de 68. El barco y el estandarte son las «unidades» `_full` del pack: fichas
 * pintadas ENTERAS dentro de una sola celda del atlas, con un degradado de unos
 * ochenta tonos del propio azul que es lo que les da volumen. Comparadas con la
 * variante roja difieren en TODOS sus vértices, así que su máscara sale toda a 255
 * y eso es lo correcto, no un fallo del compilador.
 *
 * La consecuencia la paga quien tiñe (`tinte.ts`): en estas dos piezas no se puede
 * sustituir el color por el del asiento en plano, porque se llevaría por delante el
 * sombreado horneado y el barco saldría sin volumen. Hay que conservar la
 * luminancia relativa de cada vértice respecto del azul medio del pack y aplicarla
 * al color nuevo. `verify:embarcadero-modelos` exige que estas dos no tengan ningún
 * 0 en la máscara y que las otras dos tengan de los dos valores.
 */
export const PIEZAS_TENIDAS_ENTERAS: readonly NombreDePieza[] = [PIEZA.barco, PIEZA.estandarte];

/**
 * EL AZUL MEDIO DEL PACK en sRGB: la referencia contra la que se mide la
 * luminancia de un vértice teñible para conservar su sombreado al cambiarle el
 * color. Medido sobre la celda del azul del atlas, y usado sólo por `tinte.ts`.
 */
export const AZUL_DEL_PACK: readonly [number, number, number] = [37, 125, 188];

/** La tabla entera: lo que compila `compilar-embarcadero.ts`, en este orden. */
export const PIEZAS_DEL_EMBARCADERO: readonly PiezaDelEmbarcadero[] = [
  { nombre: PIEZA.tesela, fichero: suelo('hex_grass') },
  { nombre: PIEZA.fondo, fichero: suelo('hex_grass_bottom') },
  { nombre: PIEZA.agua, fichero: suelo('hex_water') },
  { nombre: PIEZA.rampaBaja, fichero: suelo('hex_grass_sloped_low') },
  { nombre: PIEZA.rampaAlta, fichero: suelo('hex_grass_sloped_high') },
  { nombre: PIEZA.orillaA, fichero: orilla('hex_coast_A') },
  { nombre: PIEZA.orillaB, fichero: orilla('hex_coast_B') },
  { nombre: PIEZA.orillaC, fichero: orilla('hex_coast_C') },
  { nombre: PIEZA.orillaD, fichero: orilla('hex_coast_D') },
  { nombre: PIEZA.orillaE, fichero: orilla('hex_coast_E') },

  { nombre: PIEZA.muelle, fichero: dePueblo('blue', 'docks'), tinte: dePueblo('red', 'docks') },
  { nombre: PIEZA.barco, fichero: unidad('blue', 'ship'), tinte: unidad('red', 'ship') },
  { nombre: PIEZA.bandera, fichero: trasto('flag_blue'), tinte: trasto('flag_red') },
  { nombre: PIEZA.estandarte, fichero: unidad('blue', 'banner'), tinte: unidad('red', 'banner') },
  /*
   * El barco de nadie es la variante «accent» del pack: la misma nave con la
   * vela cruda y sólo un ribete de color. Fondeado a lo lejos, no es de ningún
   * asiento y no debe parecerlo.
   */
  { nombre: PIEZA.barcoDeNadie, fichero: 'units/blue/ship_blue_accent.gltf' },
  { nombre: PIEZA.bote, fichero: trasto('boat') },
  { nombre: PIEZA.varadero, fichero: trasto('boatrack') },
  { nombre: PIEZA.ancla, fichero: trasto('anchor') },
  { nombre: PIEZA.nenufarA, fichero: natura('waterlily_A') },
  { nombre: PIEZA.nenufarB, fichero: natura('waterlily_B') },
  { nombre: PIEZA.juncoA, fichero: natura('waterplant_A') },
  { nombre: PIEZA.juncoB, fichero: natura('waterplant_B') },
  { nombre: PIEZA.juncoC, fichero: natura('waterplant_C') },

  { nombre: PIEZA.barril, fichero: trasto('barrel') },
  { nombre: PIEZA.caja, fichero: trasto('crate_A_small') },
  { nombre: PIEZA.cajaGrande, fichero: trasto('crate_A_big') },
  { nombre: PIEZA.cajon, fichero: trasto('crate_long_A') },
  { nombre: PIEZA.saco, fichero: trasto('sack') },
  { nombre: PIEZA.lena, fichero: trasto('resource_lumber') },
  { nombre: PIEZA.piedra, fichero: trasto('resource_stone') },
  { nombre: PIEZA.almiar, fichero: trasto('haybale') },
  { nombre: PIEZA.carro, fichero: trasto('wheelbarrow') },
  { nombre: PIEZA.abrevadero, fichero: trasto('trough') },
  { nombre: PIEZA.cubo, fichero: trasto('bucket_water') },
  { nombre: PIEZA.escalera, fichero: trasto('ladder') },
  { nombre: PIEZA.pale, fichero: trasto('pallet') },
  { nombre: PIEZA.tienda, fichero: trasto('tent') },

  /* Los mismos ficheros que eligió el tablero para su caserío, por coherencia. */
  { nombre: PIEZA.taberna, fichero: dePueblo('yellow', 'tavern') },
  { nombre: PIEZA.casa, fichero: dePueblo('red', 'home_B') },
  { nombre: PIEZA.casaB, fichero: dePueblo('blue', 'home_A') },
  { nombre: PIEZA.pozo, fichero: dePueblo('green', 'well') },
  { nombre: PIEZA.atalaya, fichero: dePueblo('red', 'tower_B') },
  { nombre: PIEZA.vigia, fichero: dePueblo('blue', 'watchtower') },
  { nombre: PIEZA.molino, fichero: dePueblo('red', 'windmill') },
  { nombre: PIEZA.astillero, fichero: dePueblo('blue', 'shipyard') },
  { nombre: PIEZA.mercado, fichero: dePueblo('green', 'market') },
  { nombre: PIEZA.valla, fichero: neutro('fence_wood_straight') },
  { nombre: PIEZA.vallaPuerta, fichero: neutro('fence_wood_straight_gate') },
  { nombre: PIEZA.puente, fichero: neutro('building_bridge_A') },

  { nombre: PIEZA.arbolA, fichero: natura('tree_single_A') },
  { nombre: PIEZA.arbolB, fichero: natura('tree_single_B') },
  { nombre: PIEZA.tocon, fichero: natura('tree_single_A_cut') },
  { nombre: PIEZA.arboledaGrande, fichero: natura('trees_A_large') },
  { nombre: PIEZA.arboledaMedia, fichero: natura('trees_A_medium') },
  { nombre: PIEZA.arboledaPequena, fichero: natura('trees_A_small') },
  { nombre: PIEZA.arboledaB, fichero: natura('trees_B_medium') },
  { nombre: PIEZA.colinaA, fichero: natura('hill_single_A') },
  { nombre: PIEZA.colinaB, fichero: natura('hill_single_B') },
  { nombre: PIEZA.colinaC, fichero: natura('hill_single_C') },
  { nombre: PIEZA.colinasA, fichero: natura('hills_A') },
  { nombre: PIEZA.colinasArboladas, fichero: natura('hills_A_trees') },
  { nombre: PIEZA.montanaA, fichero: natura('mountain_A') },
  { nombre: PIEZA.montanaB, fichero: natura('mountain_B') },
  { nombre: PIEZA.montanaC, fichero: natura('mountain_C') },
  { nombre: PIEZA.montanaVerde, fichero: natura('mountain_A_grass') },
  { nombre: PIEZA.montanaArbolada, fichero: natura('mountain_B_grass_trees') },
  { nombre: PIEZA.rocaA, fichero: natura('rock_single_A') },
  { nombre: PIEZA.rocaB, fichero: natura('rock_single_B') },
  { nombre: PIEZA.rocaC, fichero: natura('rock_single_C') },
  { nombre: PIEZA.rocaD, fichero: natura('rock_single_D') },
  { nombre: PIEZA.rocaE, fichero: natura('rock_single_E') },
  { nombre: PIEZA.nubeGrande, fichero: natura('cloud_big') },
  { nombre: PIEZA.nubePequena, fichero: natura('cloud_small') },
];

/** El nombre del atributo con la máscara de tinte dentro del `.glb`. */
export const ATRIBUTO_DE_TINTE = '_TINTE';
/** Cómo lo deja `GLTFLoader` en la geometría: los atributos propios bajan a minúsculas. */
export const ATRIBUTO_DE_TINTE_CARGADO = '_tinte';

/** Todos los nombres, para que el comprobador exija que el `.glb` tenga exactamente éstos. */
export function nombresDelEmbarcadero(): string[] {
  return PIEZAS_DEL_EMBARCADERO.map((p) => p.nombre);
}

/**
 * Se comprueba al cargar el módulo: un nombre que `GLTFLoader` fuera a cambiar
 * es una pieza que no aparece nunca, sin error. Mejor reventar aquí, en Node.
 */
for (const p of PIEZAS_DEL_EMBARCADERO) {
  if (!NOMBRE_QUE_SOBREVIVE.test(p.nombre)) {
    throw new Error(`La pieza «${p.nombre}» lleva un carácter que GLTFLoader borra al cargar.`);
  }
}
const repetidos = nombresDelEmbarcadero().filter((n, i, todos) => todos.indexOf(n) !== i);
if (repetidos.length > 0) {
  throw new Error(`Piezas del embarcadero repetidas: ${repetidos.join(', ')}`);
}
