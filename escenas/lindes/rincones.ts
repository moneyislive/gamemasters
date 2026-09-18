/**
 * LOS DOS RINCONES DEL LIENZO, EN ARITMÉTICA Y SIN THREE.
 *
 * Dos cosas van pegadas a la cámara en Las Lindes, cada una en un rincón de abajo: LA
 * LOSA DE LA MANO, que es la pieza que toca poner, y EL RELOJ DE ARENA, que dice cuánta
 * bolsa queda. Las dos se colocan con la misma cuenta y por eso viven juntas.
 *
 * ═══ POR QUÉ ESTO NO VIVE DENTRO DEL `useFrame` QUE LO USA ═══
 *
 * Porque vivía ahí y salía cortada por el canto, y desde dentro de un `useFrame` no hay
 * manera de saberlo: en Node no hay WebGL, así que ningún comprobador de esta casa puede
 * mirar un lienzo. Lo único que se puede comprobar es la CUENTA, y para eso la cuenta
 * tiene que estar en un sitio al que se pueda llamar.
 *
 * Es la misma decisión que `escenas/acercar.ts` para la cámara del delta, y por lo mismo:
 * de la escena se compra que la aritmética esté aquí y que aquí esté medida, no que el
 * píxel salga bonito. Lo segundo lo mira Miguel; lo primero no lo miraría nadie.
 *
 * ═══ Y POR QUÉ SE ANCLA AL CANTO Y NO A UN SITIO ═══
 *
 * La primera versión decía dónde va el CENTRO de la losa, en fracciones del medio alto
 * visible: «−0,72 y −0,6». Con eso, que se vea entera depende de tres números que no se
 * miran entre ellos —la fracción, el tamaño y la proporción del lienzo— y basta tocar uno
 * para que se salga. Se salió.
 *
 * Aquí se dice lo único que de verdad importa —«su borde, a tanto del canto»— y el centro
 * se despeja de ahí, con el tamaño DENTRO de la cuenta del sitio. Es la lección de la caja
 * del Burgo saliéndose del móvil: se medía desde la esquina en vez de desde donde se ve.
 */
import { LADO_DE_LOSA } from './medidas';

/** A qué distancia de la cámara cuelga. Cualquiera vale: todo lo demás se mide contra ella. */
export const DISTANCIA_DE_LA_MANO = 60;

/**
 * Y LO MISMO, PERO ANDANDO POR EL TABLERO.
 *
 * ═══ POR QUÉ NO VALE LA MISMA ═══
 *
 * Los dos rincones no cuelgan de la cámara: se recolocan cada fotograma delante de ella,
 * y son objetos del MUNDO —así se iluminan y se enniebla con lo que tienen alrededor, que
 * es el porqué entero de hacerlo así (ver `LaLosaEnLaMano`)—. Y un objeto del mundo puede
 * quedar debajo del suelo.
 *
 * A sesenta unidades, el canto de abajo de la pantalla cae DIECIOCHO por debajo del ojo.
 * Mirando la mesa da igual: la cámara está a cientos de unidades de alto y ahí abajo sólo
 * hay aire. Andando, el ojo está a dos y medio — así que la losa de la mano y el reloj se
 * quedaban **catorce unidades enterrados bajo el tablero**, y al pulsar «hombro» u «ojos»
 * desaparecían los dos. No falla nada: el jugador, sencillamente, deja de ver qué losa
 * tiene y cuánto queda en la bolsa.
 *
 * Se arregla ACERCÁNDOLOS, no subiéndolos: todo lo que devuelven estas dos cuentas es
 * proporcional a la distancia, así que a cuatro unidades se ven EXACTAMENTE del mismo
 * tamaño en la pantalla y ya no llegan al suelo. Cuatro y no seis porque el margen tiene
 * que valer también para la cámara de ojos, que va más baja que la de hombro.
 */
export const DISTANCIA_DE_LA_MANO_A_PIE = 4;

/**
 * ═══ CUÁNTO OCUPA, Y POR QUÉ SON DOS TOPES Y NO UNO ═══
 *
 * El primero es del alto y es el que manda en una pantalla apaisada. El segundo es del
 * ANCHO y manda en un móvil de pie: allí el medio ancho visible es menos de la mitad del
 * medio alto, así que una losa medida sólo contra el alto ocuparía más de media pantalla
 * de lado y se saldría por los dos cantos. Se coge el MENOR de los dos y la misma cuenta
 * vale para las dos formas de pantalla sin una bandera por medio.
 *
 * Y el número es 0,24 y no 0,3 porque con 0,3 se comía un tercio del lienzo: se veía
 * estupendamente y tapaba el tablero, que es justo lo que Miguel pidió que no pasara —«que
 * no quede muy recargado»—. A 0,24 se distinguen las casas de los árboles y el tablero
 * sigue siendo lo que se mira.
 */
export const PARTE_DEL_ALTO_QUE_OCUPA = 0.24;
export const PARTE_DEL_ANCHO_QUE_OCUPA = 0.24;

/**
 * EL AIRE HASTA EL CANTO, en fracciones del medio alto visible.
 *
 * Empezó en 0,07 y con eso la losa quedaba TAN pegada al rincón que parecía cortada —y se
 * perdió un buen rato buscando un fallo de la cuenta que no existía—. Se comprobó
 * moviéndolo a 0,45: la losa se desplazó exactamente lo que la cuenta decía, o sea que la
 * cuenta estaba bien y lo que estaba mal era el número. Un décimo la despega del canto sin
 * meterla en el tablero.
 */
export const AIRE_HASTA_EL_CANTO = 0.1;

/**
 * CUÁNTO SE INCLINA.
 *
 * La losa está tumbada en su plano —su cara mira hacia ARRIBA, como en la mesa—, así que
 * pegada a la cámara sin más se ve DE CANTO: una raya. El cuarto de vuelta es lo que pone
 * su cara mirando a quien juega, y los 0,35 que se le restan son lo único de aquí que es
 * gusto: dejan una pizca de perspectiva para que las casas se lean como casas.
 */
export const VUELTA_DE_LA_MANO = 0.35;
export const INCLINACION_DE_LA_MANO = Math.PI / 2 - VUELTA_DE_LA_MANO;

/**
 * LO QUE SOBRESALE DE LA CARA, en lados de losa.
 *
 * Una losa no es plana: lleva casas, torres y árboles de pie, y al inclinarla eso crece
 * hacia ARRIBA en la pantalla. Medirla como un cartón dejaría el tejado más alto fuera del
 * lienzo — y sería otra vez el fallo de medir la caja por donde es cómodo y no por donde
 * asoma. Un cuarto de lado cubre a la torre del que manda, que es la pieza más alta que
 * pone `montarLaLosa`.
 */
export const LO_QUE_SOBRESALE = 0.25;

/** Dónde acaba colgada la losa de la mano, respecto de la cámara. */
export interface SitioDeLaMano {
  /** Cuánto se avanza por el eje de la cámara. */
  readonly adelante: number;
  /** Cuánto se corre a la derecha. Negativo: a la izquierda. */
  readonly derecha: number;
  /** Cuánto se sube. Negativo: abajo. */
  readonly arriba: number;
  /** Lo que hay que escalar una losa de `LADO_DE_LOSA` para que mida lo que toca. */
  readonly escala: number;
  /** La mitad del lado ya escalado, en unidades de mundo. */
  readonly media: number;
  /** La mitad de lo que ocupa EN LA PANTALLA de lado y de alto, ya proyectada. */
  readonly mediaEnAncho: number;
  readonly mediaEnAlto: number;
  /** El medio ancho y el medio alto que se ven a esa distancia, para quien quiera medir. */
  readonly medioAncho: number;
  readonly medioAlto: number;
}

/**
 * LA CUENTA ENTERA: a partir del ángulo de la cámara y de la proporción del lienzo.
 *
 * `fov` en grados, como lo guarda `THREE.PerspectiveCamera`. `aspecto` es ancho partido
 * alto. A `d` de una cámara de `fov` grados, el medio alto visible es `d · tan(fov/2)`:
 * de ahí sale todo lo demás y por eso no hay ni un número probado a ojo.
 */
export function sitioDeLaMano(fov: number, aspecto: number, distancia: number): SitioDeLaMano {
  const medioAlto = distancia * Math.tan((fov * Math.PI) / 360);
  const medioAncho = medioAlto * Math.max(1e-6, aspecto);

  const media = Math.min(
    medioAlto * PARTE_DEL_ALTO_QUE_OCUPA,
    medioAncho * PARTE_DEL_ANCHO_QUE_OCUPA,
  );
  const aire = medioAlto * AIRE_HASTA_EL_CANTO;

  /*
   * Lo que se ve de ancho es el lado entero: el giro es sobre el eje horizontal y no toca
   * la anchura. Lo de alto es el lado ACOSTADO —por eso el coseno— más lo que las piezas
   * levantan, que con la losa inclinada se proyecta por el seno.
   */
  const mediaEnAncho = media;
  const mediaEnAlto =
    media * Math.cos(VUELTA_DE_LA_MANO) + media * 2 * LO_QUE_SOBRESALE * Math.sin(VUELTA_DE_LA_MANO);

  return {
    adelante: distancia,
    derecha: -medioAncho + aire + mediaEnAncho,
    arriba: -medioAlto + aire + mediaEnAlto,
    escala: (media * 2) / LADO_DE_LOSA,
    media,
    mediaEnAncho,
    mediaEnAlto,
    medioAncho,
    medioAlto,
  };
}

/* ─────────────────────── El reloj de arena de la bolsa ─────────────────────── */

/**
 * ═══ POR QUÉ HAY UN RELOJ DE ARENA EN UN JUEGO SIN PLAZOS ═══
 *
 * Las Lindes declara `tickHz: 0`: no hay reloj de turno, no hay plazo que se acabe y no
 * hay nada que el servidor vaya a hacer por ti si tardas. Un reloj que contara el turno
 * sería una mentira pintada muy bonita.
 *
 * Lo que sí se acaba, y es lo que de verdad hay que ver de un vistazo, es LA BOLSA. En
 * este juego la partida termina cuando se saca la última losa: cuánto queda decide si
 * vale la pena mandar un labriego al prado —que no vuelve— o guardárselo. Esa cifra está
 * en el raíl como «Quedan 38», que es un número que hay que leer y comparar con otro que
 * no está. La arena lo enseña sin leer nada.
 *
 * Es el MISMO reloj de Riberas: el mismo `reloj.glb`, el mismo componente y el mismo
 * montaje —`montarElReloj`, que salió de dentro de `delta.tsx` justo para esto—. Lo
 * único distinto es qué mide la arena, y eso lo decide quien lo monta, no el reloj.
 */

/** Cuánto ocupa de alto, en fracciones del medio alto visible. */
export const PARTE_DEL_ALTO_DEL_RELOJ = 0.17;
/** Y su tope por el ancho, para el móvil de pie. */
export const PARTE_DEL_ANCHO_DEL_RELOJ = 0.17;
/**
 * LO ANCHO QUE ES SU ASA, en fracciones de su alto.
 *
 * El mismo `ANCHO_DEL_RELOJ` que `barra.ts` le da en Riberas. No se importa de allí
 * porque allí es una medida de LA BARRA —cuánto se le reserva en una fila de huecos— y
 * aquí no hay barra ninguna: es la misma cifra por el mismo motivo (un reloj de arena es
 * alto y estrecho), no la misma decisión.
 */
export const ANCHO_DEL_RELOJ_EN_ALTOS = 0.62;

/** Dónde acaba colgado el reloj, respecto de la cámara. */
export interface SitioDelReloj {
  readonly adelante: number;
  readonly derecha: number;
  readonly arriba: number;
  /** El `lado` que pide `RelojDeArena`: el alto de su hueco. */
  readonly lado: number;
  /** Y el `ancho` de su asa. */
  readonly ancho: number;
  /** La mitad de lo que ocupa en el lienzo, para quien quiera medir que cabe. */
  readonly mediaEnAncho: number;
  readonly mediaEnAlto: number;
  readonly medioAncho: number;
  readonly medioAlto: number;
}

/**
 * EL RINCÓN DE ABAJO A LA DERECHA, simétrico del de la losa de la mano.
 *
 * Y simétrico a propósito: son las dos cosas que se miran sin dejar de mirar el tablero,
 * una en cada esquina baja, con el mismo aire hasta el canto. Poner las dos juntas dejaría
 * media pantalla vacía y la otra media abarrotada.
 *
 * El alto del reloj NO es su `lado`, y encima depende de CUÁL de los dos relojes se esté
 * pintando: el de conos del respaldo llega a sus tapas y el del `.glb` llega a un lado
 * entero. Por eso el alto entra por parámetro desde `reloj.tsx`, que es quien sabe los
 * dos números y devuelve el mayor. Con el pequeño, el reloj se salía por abajo justo
 * cuando el fichero de arte llegaba — o sea, sólo cuando todo iba bien.
 */
export function sitioDelRelojDeLaBolsa(
  fov: number,
  aspecto: number,
  /** `ALTO_DEL_RELOJ_EN_LADOS` de `reloj.tsx`: lo alto que es el MÁS alto de los dos relojes. */
  altoEnLados: number,
  distancia: number,
): SitioDelReloj {
  const medioAlto = distancia * Math.tan((fov * Math.PI) / 360);
  const medioAncho = medioAlto * Math.max(1e-6, aspecto);

  /* Lo que va a ocupar de alto en el mundo, y de ahí se despeja su `lado`. */
  const alto = Math.min(
    medioAlto * PARTE_DEL_ALTO_DEL_RELOJ * 2,
    medioAncho * PARTE_DEL_ANCHO_DEL_RELOJ * 2,
  );
  const lado = alto / Math.max(1e-6, altoEnLados);
  const aire = medioAlto * AIRE_HASTA_EL_CANTO;

  const mediaEnAlto = alto / 2;
  const mediaEnAncho = (lado * ANCHO_DEL_RELOJ_EN_ALTOS) / 2;

  return {
    adelante: distancia,
    derecha: medioAncho - aire - mediaEnAncho,
    arriba: -medioAlto + aire + mediaEnAlto,
    lado,
    ancho: lado * ANCHO_DEL_RELOJ_EN_ALTOS,
    mediaEnAncho,
    mediaEnAlto,
    medioAncho,
    medioAlto,
  };
}

/**
 * QUÉ PARTE DE LA ARENA HA CAÍDO YA, de cero a uno.
 *
 * Cero es la bolsa llena —toda la arena arriba, la partida por empezar— y uno es la bolsa
 * vacía. `deLaBolsa` es lo que cabía; se pasa en vez de darlo por sabido para que el día
 * que alguien añada losas al reparto no haya que acordarse de tocar esto.
 */
export function loQueHaCaido(quedan: number, deLaBolsa: number): number {
  if (deLaBolsa <= 0) return 1;
  const parte = 1 - quedan / deLaBolsa;
  return parte < 0 ? 0 : parte > 1 ? 1 : parte;
}
