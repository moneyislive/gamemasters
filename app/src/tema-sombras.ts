/**
 * La paleta de El Paso de las Sombras.
 *
 * CLUEDO es una casa señorial a medianoche: fieltro verde, caoba, burdeos y oro
 * viejo. El Misterio de la Momia es una tumba abierta con una lámpara dentro:
 * caliza, lapislázuli y oro de máscara. Esto es otra cosa distinta de las dos, y
 * tiene que notarse antes de leer una palabra: **un monte de noche, sin luna, y
 * una columna de gente andando en fila**.
 *
 * Los tres colores que mandan salen de ahí y de la paleta japonesa de la época:
 * el AÑIL (藍) casi negro de la noche, el ACERO de la luna sobre un filo —que es
 * lo único que brilla— y el BERMELLÓN (朱) del sello de tinta, que es lo único
 * caliente que hay en toda la pantalla.
 *
 * POR QUÉ EL ACENTO NO ES DORADO, que es la decisión que más se ve. Los otros
 * dos juegos son dorados, y con razón: uno es un salón y el otro una tumba llena
 * de oro. Aquí no hay oro en ninguna parte —hay hierro, papel y frío— y un
 * acento dorado habría hecho que este juego pareciera el mismo producto con
 * otras palabras. El acero es más frío, se lee igual de bien sobre el añil y
 * hace que el bermellón del sello sea de verdad lo único cálido.
 *
 * POR QUÉ LAS CLAVES SE LLAMAN COMO LAS DE CLUEDO Y NO «anil» O «acero».
 *
 * Porque son las MISMAS CLAVES a propósito: `tema.ts` es la forma, y esto una de
 * sus encarnaciones. Cuarenta pantallas escriben hoy `color.caoba900` y
 * `color.oro400`; renombrarlas obligaría a tocarlas todas —incluidas las de
 * CLUEDO, que es exactamente lo que la regla que manda prohíbe—. Así que los
 * nombres han dejado de ser colores y son RANURAS:
 *
 *   · `feltoscuro`/`felt*`  el fondo de la pantalla, lo más oscuro que hay.
 *   · `caoba*`              la masa opaca: tarjetas, el disco del asistente y,
 *                           sobre todo, la TINTA que va encima del acento.
 *   · `oro*`/`laton`        el filo, el texto que destaca, el metal.
 *   · `burdeos*`            el acento cálido de alarma y de rótulo impreso.
 *   · `pergamino*`          el texto sobre fondo oscuro y el papel.
 *
 * El informe de arquitectura propone renombrarlas a ranuras de verdad —`fondo`,
 * `masa`, `metal`, `acento`, `papel`— y decía que el momento sería «el día que
 * haya un tercer juego». Ese día es hoy, y sigue sin hacerse por lo mismo que la
 * imprenta: renombrar toca las cuarenta pantallas de los otros dos, y la regla
 * de esta entrega es no moverlos. Queda anotado en `docs/sombras/DISENO.md` §11.
 */
import { color } from './tema';

/** La forma de una paleta: exactamente las ranuras que ya usa la app. */
export type Paleta = { readonly [K in keyof typeof color]: string };

export const COLOR_SOMBRAS: Paleta = {
  /*
   * El fondo: la noche del monte. No negro puro —el negro plano deja el acero
   * flotando en el vacío— sino un añil muy oscuro, que es de lo que está hecho
   * el cielo cuando no hay luna y todavía queda algo de luz en el aire.
   */
  feltoscuro: '#080a11',
  felt900: '#0c111b',
  felt800: '#121826',
  felt700: '#1b2337',

  /*
   * Sumi: la tinta. Es la masa de las tarjetas y —lo que de verdad importa— el
   * texto que va SOBRE los botones de acento: `#11141a` sobre `#bccbdd` da 12:1,
   * muy por encima del 4,5:1 exigido, y se lee de un vistazo a media luz.
   */
  caoba900: '#11141a',
  caoba800: '#1a1f28',
  /*
   * OJO: esta ranura no es negra. Es la tinta que se escribe SOBRE el papel
   * (`CuerpoPapel`, los rótulos de los marcos claros), y ahí un negro puro se ve
   * duro y barato. Es el gris cálido de la tinta sumi diluida.
   */
  caoba700: '#3b3a35',

  /*
   * El acero de la luna sobre un filo. Frío a propósito: es lo que separa este
   * juego de los otros dos de un vistazo, y lo que hace que el sello bermellón
   * sea lo único cálido de la pantalla.
   */
  oro500: '#93a7c0',
  oro400: '#bccbdd',
  oro300: '#e3ebf5',
  laton: '#75879e',

  /*
   * Bermellón (朱, shu): el color del sello y del cinabrio. En un documento
   * japonés es lo que hay que obedecer o lo que da fe; aquí es la ranura donde
   * CLUEDO pone burdeos, y marca el rastro y el paso batido.
   */
  burdeos700: '#7a2a20',
  burdeos600: '#b8402f',

  /* Washi: más blanco y más frío que el pergamino de la mansión. */
  pergamino: '#eef1ec',
  pergaminoTenue: '#b4bcc4',
  tinta: '#11141a',
  peligro: '#c8503b',
} as const;

/**
 * Los tokens que solo existen en este juego.
 *
 * No van en `Paleta` porque `Paleta` tiene que ser exactamente la forma de
 * `tema.ts`: si creciera, CLUEDO tendría que inventarse un valor para «el paso
 * batido», que no significa nada en una casa señorial. Los importan
 * directamente las pantallas de este juego, que son las únicas que los usan.
 */
export const SOMBRAS = {
  /** Añil (藍): lo tuyo y privado. Lo que está en tu mano y nadie ha visto. */
  anil: '#2c4a80',
  anilTenue: 'rgba(44,74,128,0.42)',
  /** Bermellón: lo que está sobre la mesa, sellado y a la vista de todos. */
  bermellon: '#b8402f',
  bermellonTenue: 'rgba(184,64,47,0.30)',
  /** El rastro de la columna: óxido, no sangre. Sube y no baja solo. */
  rastro: '#c0563d',
  /** El paso batido, una vez revelado. */
  batido: '#8f2c22',
  /** La prenda de confianza: lo único cálido que se da a otra persona. */
  prenda: '#c8a86a',
  /** El verde del bambú: lo comprobado, lo que ya se sabe cierto. */
  bambu: '#4f7a5f',
} as const;
