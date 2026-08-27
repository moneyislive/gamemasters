/**
 * La paleta de El Misterio de la Momia.
 *
 * CLUEDO es una casa señorial a medianoche: fieltro verde, caoba, burdeos y oro
 * viejo. Esto es otra cosa —una tumba abierta a la luz de una lámpara de
 * queroseno— y tiene que notarse antes de leer una palabra. Los tres colores que
 * mandan son los que de verdad había en aquella tumba: la piedra caliza tostada
 * de las paredes, el lapislázuli de las incrustaciones y el oro de las máscaras.
 *
 * POR QUÉ LAS CLAVES SE LLAMAN COMO LAS DE CLUEDO Y NO «lapis» O «caliza».
 *
 * Porque son las MISMAS CLAVES a propósito: `tema.ts` es la forma, y esto una
 * de sus encarnaciones. Cuarenta pantallas escriben hoy `color.caoba900` y
 * `color.burdeos700`; renombrarlas obligaría a tocarlas todas —incluidas las de
 * CLUEDO, que es exactamente lo que la regla que manda prohíbe—. Así que los
 * nombres han dejado de ser colores y son RANURAS:
 *
 *   · `feltoscuro`/`felt*`  el fondo de la pantalla, lo más oscuro que hay.
 *   · `caoba*`              la masa opaca: tarjetas, el disco del asistente y,
 *                           sobre todo, la TINTA que va encima del oro.
 *   · `oro*`/`laton`        el filo, el texto que destaca, el metal.
 *   · `burdeos*`            el acento cálido de alarma y de rótulo impreso.
 *   · `pergamino*`          el texto sobre fondo oscuro y el papel.
 *
 * Leído así, la traducción es directa: donde CLUEDO pone caoba, la Momia pone
 * lapislázuli —azul profundo sobre oro es LA pareja egipcia, y además cumple de
 * sobra el contraste que exige el texto sobre el botón dorado—; y donde CLUEDO
 * pone burdeos, la Momia pone ocre rojo, que es el rojo que se sacaba de la
 * tierra y el que sale en las paredes pintadas.
 *
 * Que la ranura se llame `caoba900` y valga azul es feo de leer, y se asume: la
 * alternativa era peor. El informe propone renombrarlas a ranuras de verdad
 * (`fondo`, `masa`, `metal`, `acento`, `papel`) el día que haya un tercer juego,
 * que es cuando el coste de tocar las cuarenta pantallas se paga una sola vez y
 * sirve para siempre.
 */
import { color } from './tema';

/**
 * La forma de una paleta: exactamente las ranuras que ya usa la app.
 *
 * Se mapea sobre `typeof color` en vez de usarlo tal cual porque `tema.ts` lo
 * declara `as const`, y eso hace que el tipo de `feltoscuro` no sea `string`
 * sino el literal `'#0b1710'`: cualquier otra paleta sería un error de tipo por
 * el mero hecho de tener otro color, que es su razón de existir. Lo que sí se
 * conserva —y es lo que interesa— es el JUEGO DE CLAVES: sobra una o falta una
 * y esto no compila, así que una paleta nueva no puede olvidarse media app.
 */
export type Paleta = { readonly [K in keyof typeof color]: string };

export const COLOR_MOMIA: Paleta = {
  /*
   * El fondo. No negro: negro puro deja el oro flotando en el vacío y se ve
   * plano. Es la piedra de la tumba con la lámpara lejos, que conserva algo de
   * calor y hace que el dorado parezca alumbrado y no pegado encima.
   */
  feltoscuro: '#0b0805',
  felt900: '#150e07',
  felt800: '#1d150b',
  felt700: '#2a1d0f',

  /*
   * Lapislázuli. Es la masa de las tarjetas y —lo que de verdad importa— la
   * tinta que va sobre los botones dorados: `#0f1a35` sobre `#e8bd4c` da 9,4:1,
   * muy por encima del 4,5:1 exigido, y se lee de un vistazo a media luz.
   */
  caoba900: '#0f1a35',
  caoba800: '#17264a',
  /*
   * OJO: esta ranura no es azul. Es la tinta que se escribe SOBRE el papiro
   * (`CuerpoPapel`, los rótulos de los marcos de papel), y ahí el azul se ve
   * como un enlace de página web. Es el marrón de la tinta ferrogálica.
   */
  caoba700: '#3d2b14',

  /*
   * El oro. Un punto más cálido y más saturado que el de CLUEDO, que tira a
   * latón de salón; este es oro de máscara funeraria.
   */
  oro500: '#cfa02a',
  oro400: '#e8bd4c',
  oro300: '#f4dc95',
  laton: '#b98f36',

  /*
   * Ocre rojo, el de las paredes pintadas. Hace de acento de alarma: es la
   * ranura donde CLUEDO pone burdeos, y aquí marca las marcas de la maldición y
   * la cámara profanada.
   */
  burdeos700: '#7a3018',
  burdeos600: '#a8452a',

  /* Papiro de verdad: más amarillo y menos rosado que el pergamino de CLUEDO. */
  pergamino: '#f3e3bd',
  pergaminoTenue: '#d6c193',
  tinta: '#241708',
  peligro: '#c2492b',
} as const;

/**
 * Los tokens que solo existen en la Momia.
 *
 * No van en `Paleta` porque `Paleta` tiene que ser exactamente la forma de
 * `tema.ts`: si creciera, CLUEDO tendría que inventarse un valor para «la
 * cámara profanada», que no significa nada en una casa señorial. Los importan
 * directamente las pantallas de la Momia, que son las únicas que los usan.
 */
export const MOMIA = {
  /** El azul de las incrustaciones, para lo que es tuyo y privado. */
  lapis: '#1b2f63',
  lapisTenue: 'rgba(27,47,99,0.42)',
  /** El verde de la fayenza: lo público, lo que está sobre la mesa. */
  fayenza: '#2f7a70',
  fayenzaTenue: 'rgba(47,122,112,0.32)',
  /** La marca de la maldición: verde cardenillo enfermo, no rojo de herida. */
  maldicion: '#7d9130',
  /** La cámara profanada de esta vigilia. */
  profanada: '#a8452a',
  /** El amuleto: turquesa, que es de lo que se hacían. */
  amuleto: '#3fa8a0',
} as const;
