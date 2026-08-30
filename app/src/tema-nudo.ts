/**
 * La paleta de El Nudo de Valdehierro.
 *
 * CLUEDO es una casa señorial a medianoche: fieltro verde, caoba y oro viejo. El
 * Misterio de la Momia es una tumba abierta con una lámpara dentro. El Paso de
 * las Sombras es un monte sin luna. Esto es otra cosa distinta de las tres, y
 * tiene que notarse antes de leer una palabra: **una estación de ferrocarril de
 * noche, nevando, con una bombilla amarilla y una estufa que no calienta**.
 *
 * Los cuatro colores que mandan salen de ahí y del material de verdad:
 *
 *   · El AZUL DE HULLA casi negro del cielo sobre la nieve, que no es negro
 *     puro: la nieve devuelve luz y el cielo se queda en un azul sucio.
 *   · El HIERRO de las agujas y de los raíles, que es la masa de todo.
 *   · El ÁMBAR DE BOMBILLA de la marquesina, que es la única luz caliente que
 *     hay en toda la estación y por tanto el acento.
 *   · El ROJO DE SEÑAL, que en un ferrocarril significa exactamente una cosa
 *     —parada, peligro, no pasa— y aquí también: alarma y retraso.
 *
 * POR QUÉ EL ACENTO ES ÁMBAR Y NO DORADO, que es la decisión que más se ve.
 * CLUEDO y la Momia son dorados y con razón: un salón y una tumba llena de oro.
 * Las Sombras eligieron acero para no parecer el mismo producto. Aquí el oro
 * habría sido lo cómodo y habría sido falso: en una estación no hay oro, hay
 * latón sucio y una bombilla de sesenta vatios. El ámbar tiene la calidez que
 * hace falta para que la pantalla no sea deprimente y no se confunde con el oro
 * de los otros dos.
 *
 * POR QUÉ LAS CLAVES SE LLAMAN COMO LAS DE CLUEDO Y NO `hierro` O `ambar`.
 *
 * Porque son las MISMAS CLAVES a propósito: `tema.ts` es la forma y esto una de
 * sus encarnaciones. Cuarenta pantallas escriben hoy `color.caoba900` y
 * `color.oro400`; renombrarlas obligaría a tocarlas todas —incluidas las de los
 * tres juegos que ya funcionan—, que es justo lo que la regla de esta entrega
 * prohíbe. Así que los nombres han dejado de ser colores y son RANURAS:
 *
 *   · `feltoscuro`/`felt*`  el fondo de la pantalla, lo más oscuro que hay.
 *   · `caoba*`              la masa opaca: tarjetas, el disco del asistente y,
 *                           sobre todo, la TINTA que va encima del acento.
 *   · `oro*`/`laton`        el filo, el texto que destaca, el metal.
 *   · `burdeos*`            el acento de alarma y de rótulo impreso.
 *   · `pergamino*`          el texto sobre fondo oscuro y el papel.
 *
 * Está anotado en `docs/nudo/DISENO.md` §11, igual que lo anotaron las Sombras:
 * renombrarlas a `fondo`/`masa`/`metal`/`acento`/`papel` es lo correcto y hay
 * que hacerlo el día que alguien pueda recapturar el maestro de oro con calma.
 */
import { color } from './tema';

/** La forma de una paleta: exactamente las ranuras que ya usa la app. */
export type Paleta = { readonly [K in keyof typeof color]: string };

export const COLOR_NUDO: Paleta = {
  /*
   * El fondo: el cielo de una nevada de noche. Azul de hulla, no negro: el negro
   * plano deja el ámbar flotando en el vacío, y además una estación tiene
   * siempre algo de luz devuelta por la nieve.
   */
  feltoscuro: '#080b11',
  felt900: '#0d1219',
  felt800: '#131a24',
  felt700: '#1c2532',

  /*
   * Hierro: la masa de las tarjetas y —lo que de verdad importa— el texto que va
   * SOBRE los botones de acento. `#12161c` sobre `#e0b463` da 11:1, muy por
   * encima del 4,5:1 exigido, y se lee de un vistazo a media luz.
   */
  caoba900: '#12161c',
  caoba800: '#1b212a',
  /*
   * OJO: esta ranura no es negra. Es la tinta que se escribe SOBRE el papel
   * —`CuerpoPapel`, los rótulos de los marcos claros— y ahí un negro puro se ve
   * duro y barato. Es el gris pardo de la tinta de un impreso de 1927.
   */
  caoba700: '#3a3128',

  /*
   * Ámbar de bombilla. `oro500` es el filo de los marcos, `oro400` el texto que
   * destaca y `oro300` el que va sobre fondo oscuro en tamaño pequeño: los tres
   * pasan de 4,5:1 sobre `felt900`, que es donde se pintan de verdad.
   */
  oro500: '#c08a2e',
  oro400: '#d9a648',
  oro300: '#eccb8b',
  /* El latón sucio de una manivela: el metal que no brilla. */
  laton: '#9d7c3a',

  /*
   * Rojo de señal. En un ferrocarril significa parada, y aquí significa retraso
   * y alarma: es el color del contador que sube y del enclavamiento que no da
   * paso. No se usa para nada más, y por eso cuando aparece se ve.
   */
  burdeos700: '#7a1f1c',
  burdeos600: '#9a2f22',

  /*
   * El papel de estraza del impreso, que es el mismo de los imprimibles. Que la
   * pantalla y el papel tengan el mismo color no es coquetería: durante la
   * partida se está mirando las dos cosas a la vez, con el móvil encima del
   * cuadro de marchas de papel.
   */
  pergamino: '#ded2bb',
  pergaminoTenue: '#bdae90',
  tinta: '#1b1710',

  /* El rojo de aviso de la app. El mismo de señal, un punto más claro. */
  peligro: '#c04434',
};

/**
 * El degradado de fondo: el cielo de la nevada, oscureciendo hacia abajo.
 *
 * VA DEBAJO DE LA PALETA Y DELANTE DE LA TABLA que lo nombra, en
 * `tema-juego.ts`. Un `const` de módulo se evalúa al importar y en orden: una
 * tabla escrita arriba que nombre esto revienta con «Cannot access before
 * initialization» al cargar el fichero, y ese fichero lo carga la app entera. No
 * es teórico: pasó ya una vez con los fondos de la Momia.
 */
export const FONDO_NUDO = ['#0d1219', '#080b11', '#05070b'] as const;

/** El nombre corto, para las pantallas que quieran rotularse. */
export const NUDO = {
  /* Un aspa de paso a nivel. Plano básico: en el móvil se ve. */
  marca: '✕',
  estacion: 'VALDEHIERRO',
} as const;
