/**
 * EL VOCABULARIO DE MODELOS: cómo se llama cada pieza dentro del `.glb`.
 *
 * ═══ POR QUÉ ESTO ESTÁ SOLO Y NO DENTRO DE `modelos.ts` ═══
 *
 * Porque es DATO, y el dato se puede comprobar. `modelos.ts` importa `three` para
 * poder buscar en una escena ya cargada; un comprobador de Node que quisiera
 * verificar que todos estos nombres existen de verdad dentro del `.glb` tendría que
 * arrastrar el motor de dibujo entero para leer una tabla de cadenas. Es la misma
 * frontera que separa `paleta.ts` de `delta.tsx`: se parte por lo que se puede
 * comprobar, no por lo que va junto en la pantalla.
 *
 * ═══ LOS NOMBRES SON NUESTROS, NO DEL PACK ═══
 *
 * `compilar-modelos.ts` traduce `building_home_A_blue` a `poblado-blue` al meterlo
 * en el `.glb`. Esa traducción vive en un solo sitio a propósito: si la escena
 * buscara por el nombre del pack, cambiar de pack sería tocar la escena entera.
 *
 * ═══ Y POR QUÉ NINGUNO LLEVA DOS PUNTOS ═══
 *
 * Los llevaban, porque agrupaban bien: `arbol:a`, `poblado:blue`. El `.glb` salía
 * con los nombres correctos, todo compilaba, y en pantalla no aparecía NI UNA de
 * esas piezas — ni un árbol, ni una montaña, ni una sola construcción de jugador.
 * Sin error y sin hueco: un mundo pelado.
 *
 * `GLTFLoader` pasa cada nombre de nodo por `PropertyBinding.sanitizeNodeName`, que
 * BORRA los caracteres reservados de las rutas de animación —`.`, `:`, `/`, `[`,
 * `]`— y cambia los espacios por `_`. Así que `arbol:a` llega al navegador
 * llamándose `arbola` y `catalogo.get('arbol:a')` devuelve `undefined` para
 * siempre. Y no falla en Node, donde el `.glb` se lee con otra herramienta que no
 * toca los nombres: falla SÓLO al pintar, que es donde peor se busca.
 *
 * De ahí `NOMBRE_QUE_SOBREVIVE`, que usan el compilador —para negarse a escribir un
 * nombre que el cargador vaya a cambiar— y `verify:escena` —para comprobar que lo
 * que hay dentro del `.glb` es exactamente lo que esta tabla dice—.
 */
import type { ColorDeJugador } from './tipos';

/**
 * LO QUE UN NOMBRE PUEDE LLEVAR para llegar entero al navegador.
 *
 * Minúsculas, cifras, y guiones o subrayados entre medias. Ni dos puntos, ni
 * puntos, ni barras, ni espacios, ni mayúsculas —éstas sí sobreviven, pero mezclar
 * mayúsculas y minúsculas en una tabla de cadenas es pedir una errata que el
 * compilador no ve—.
 */
export const NOMBRE_QUE_SOBREVIVE = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

/**
 * LOS NOMBRES QUE EL CÓDIGO USA, en un solo sitio.
 *
 * Están aquí como constantes y no como cadenas sueltas por lo de siempre: una
 * cadena suelta mal escrita no la ve el compilador, y el síntoma es una pieza que
 * no aparece — sin error, sin hueco, sin nada.
 */
export const MODELO = {
  /* El suelo. */
  tesela: 'tesela',
  agua: 'tesela-agua',
  fondo: 'tesela-fondo',
  transicion: 'tesela-transicion',
  rampaBaja: 'rampa-baja',
  rampaAlta: 'rampa-alta',

  /* La orilla: media tesela de tierra y media de agua. */
  orillaA: 'orilla-a',
  orillaB: 'orilla-b',
  orillaC: 'orilla-c',
  orillaD: 'orilla-d',
  orillaE: 'orilla-e',

  /* Las sendas del paisaje. No son los caminos que construyen los jugadores. */
  sendaA: 'senda-a',
  sendaB: 'senda-b',
  sendaC: 'senda-c',
  sendaD: 'senda-d',
  sendaE: 'senda-e',
  sendaF: 'senda-f',
  sendaG: 'senda-g',
  sendaH: 'senda-h',
  sendaI: 'senda-i',
  sendaJ: 'senda-j',
  sendaK: 'senda-k',
  sendaL: 'senda-l',
  sendaM: 'senda-m',

  /* Los cauces. Mismas letras que las sendas: ver `sendas.ts`. */
  rioA: 'rio-a',
  rioB: 'rio-b',
  rioC: 'rio-c',
  rioD: 'rio-d',
  rioE: 'rio-e',
  rioF: 'rio-f',
  rioG: 'rio-g',
  rioH: 'rio-h',
  rioI: 'rio-i',
  rioJ: 'rio-j',
  rioK: 'rio-k',
  rioL: 'rio-l',
  rioCurvo: 'rio-curvo',
  rioPuenteA: 'rio-puente-a',
  rioPuenteB: 'rio-puente-b',

  /* Árboles sueltos y arboledas de tesela entera. Hacen falta los dos: ver `poblar.ts`. */
  arbolA: 'arbol-a',
  arbolB: 'arbol-b',
  tocon: 'tocon',
  arboledaGrande: 'arboleda-grande',
  arboledaMedia: 'arboleda-media',
  arboledaPequena: 'arboleda-pequena',
  arboledaB: 'arboleda-b',

  /* Relieve. Las `colina-*` son montículos sueltos; las `colinas-*` llenan la tesela. */
  colinaA: 'colina-a',
  colinaB: 'colina-b',
  colinaC: 'colina-c',
  colinasA: 'colinas-a',
  colinasB: 'colinas-b',
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

  /* Campo. */
  trigal: 'trigal',
  barbecho: 'barbecho',
  ruina: 'ruina',
  valla: 'valla',
  vallaPuerta: 'valla-puerta',
  muro: 'muro',
  muroPuerta: 'muro-puerta',
  muroEsquina: 'muro-esquina',
  muroEsquinaDentro: 'muro-esquina-dentro',
  muroEsquinaPuerta: 'muro-esquina-puerta',
  puente: 'puente',

  /* Trastos. */
  tienda: 'tienda',
  saco: 'saco',
  carro: 'carro',
  barril: 'barril',
  caja: 'caja',
  lena: 'lena',
  piedra: 'piedra',
  almiar: 'almiar',
  abrevadero: 'abrevadero',
  bote: 'bote',
  ancla: 'ancla',
  varadero: 'varadero',

  /*
   * LO QUE CRECE DENTRO DEL AGUA.
   *
   * Son de nadie y no tienen color. Van donde el agua está QUIETA y es poco honda
   * —la orilla de un cuerpo de agua—, que es donde crecen de verdad: un nenúfar en
   * mitad de una corriente es un nenúfar que se fue río abajo.
   */
  nenufarA: 'nenufar-a',
  nenufarB: 'nenufar-b',
  juncoA: 'junco-a',
  juncoB: 'junco-b',
  juncoC: 'junco-c',
  carreta: 'carreta',
  nubeGrande: 'nube-grande',
  nubePequena: 'nube-pequena',

  /* Los edificios del paisaje. No son de nadie: ver `compilar-modelos.ts`. */
  casa: 'casa',
  iglesia: 'iglesia',
  taberna: 'taberna',
  mercado: 'mercado',
  molino: 'molino',
  acena: 'acena',
  aserradero: 'aserradero',
  herreria: 'herreria',
  mina: 'mina',
  pozo: 'pozo',
  atalaya: 'atalaya',
  concejo: 'concejo',
  taller: 'taller',
  cuadras: 'cuadras',
  ermita: 'ermita',
  vigia: 'vigia',

  /* El barco de nadie, para el mar. */
  barco: 'barco',

  /* Los cinco bienes, para la mano y los paneles. */
  bienMadera: 'bien-madera',
  bienLadrillo: 'bien-ladrillo',
  bienMineral: 'bien-mineral',
  bienLana: 'bien-lana',
  bienGrano: 'bien-grano',
} as const;

/** Los cuatro colores de jugador que trae el pack, en el orden en que se reparten. */
export const COLORES_DE_JUGADOR: readonly ColorDeJugador[] = ['blue', 'red', 'green', 'yellow'];

/**
 * LAS PIEZAS DE JUGADOR QUE VIENEN EN CUATRO COLORES.
 *
 * El `.glb` trae UNA de cada, la azul, con este nombre pelado. Las otras tres se
 * fabrican al cargar moviendo las UV de la celda del color — ver `esDelColorDelJugador`
 * en `paleta.ts`, donde está medido por qué se puede.
 *
 * Esta lista es la frontera entre las dos preguntas que antes eran una sola: qué hay
 * DENTRO del fichero, y qué puede PEDIR el código. `verify:escena` comprueba lo primero
 * contra el `.glb` y lo segundo contra el catálogo ya cargado, y si se mezclan, el
 * comprobador exige al fichero piezas que nunca van a estar en él.
 */
export const PIEZAS_DE_COLOR = [
  'poblado',
  'ciudad',
  'torre',
  'torreon',
  'bandera',
  'muelle',
  'barco-jugador',
] as const;

/** El modelo de una construcción de jugador, por clase y color. */
export function modeloDePieza(clase: 'poblado' | 'ciudad', color: ColorDeJugador): string {
  return `${clase}-${color}`;
}

/** La bandera del color de un jugador. */
export function modeloDeBandera(color: ColorDeJugador): string {
  return `bandera-${color}`;
}

/** La torre del color de un jugador. */
export function modeloDeTorre(color: ColorDeJugador): string {
  return `torre-${color}`;
}

/** El torreón: el zócalo sobre el que se apoya una torre. */
export function modeloDeTorreon(color: ColorDeJugador): string {
  return `torreon-${color}`;
}

/** El muelle del color de un jugador: el puerto, que es pieza de borde. */
export function modeloDeMuelle(color: ColorDeJugador): string {
  return `muelle-${color}`;
}

/**
 * EL BARCO DEL COLOR DE UN JUGADOR.
 *
 * Se llama `barco-jugador-<color>` y no `barco-<color>` porque el barco de nadie ya se
 * llama `barco`, y con el nombre corto la pieza base de los de color habría sido
 * `barco` también: dos modelos distintos con el mismo nombre, y gana el último que se
 * escriba. Están medidos y NO son el mismo: 2.031 vértices el neutral, 2.028 el de
 * color. El de nadie navega el mar y el de color es del jugador.
 */
export function modeloDeBarco(color: ColorDeJugador): string {
  return `barco-jugador-${color}`;
}

/**
 * TODOS los nombres que esta versión espera encontrar dentro del `.glb`.
 *
 * Los de la tabla más los que se componen por color. `verify:escena` los contrasta
 * uno a uno contra los nodos del fichero compilado, así que una pieza que falte o
 * que se llame de otra manera se cae en la batería y no en la pantalla de alguien.
 */
export function nombresEnElGlb(): string[] {
  return [...(Object.values(MODELO) as string[]), ...PIEZAS_DE_COLOR];
}

/**
 * TODOS los nombres que el código puede pedirle al catálogo ya cargado.
 *
 * Los del fichero más las tres variantes de color que se fabrican encima de cada pieza
 * base. La azul se pide por su nombre de color como las demás —`ciudad-blue`— aunque
 * sea la que viene en el fichero: quien pinta no tiene por qué saber cuál de los cuatro
 * colores resultó ser el original.
 */
export function todosLosNombres(): string[] {
  const salida = nombresEnElGlb();
  for (const pieza of PIEZAS_DE_COLOR) {
    for (const c of COLORES_DE_JUGADOR) salida.push(`${pieza}-${c}`);
  }
  return salida;
}
