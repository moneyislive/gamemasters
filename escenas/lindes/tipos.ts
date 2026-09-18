/**
 * LO QUE LA ESCENA DE LAS LINDES RECIBE, y lo que devuelve.
 *
 * ═══ LA ESCENA NO SABE QUE EXISTE LAS LINDES ═══
 *
 * Y conviene decirlo con todas las letras, porque el nombre del fichero dice lo
 * contrario. Lo que hay aquí es un TABLERO DE LOSAS CUADRADAS: cuáles hay
 * puestas, con qué giro, quién tiene un labriego dónde, y en qué casillas cabe la
 * siguiente. Ni una regla, ni un turno, ni una puntuación.
 *
 * Quien traduce la partida a esto es `shared/arcade/juegos/lindes-en-tres.ts`, que
 * vive en `shared/` a propósito: si la traducción viviera en cada cliente habría
 * dos —la de la app y la del escritorio— y un día dirían cosas distintas. Es la
 * misma frontera que `riberas-en-tres.ts` y por el mismo motivo.
 *
 * ═══ Y LO QUE DEVUELVE SON TOQUES, NO MOVIMIENTOS ═══
 *
 * `alTocarHueco` dice «han tocado la casilla tal con el giro cual». Qué movimiento
 * es eso lo decide quien la monta, con la lista de opciones en la mano. Una escena
 * que montara movimientos sería una escena que sabe de reglas, y entonces habría
 * dos sitios donde se decide qué es legal.
 */
import type { Giro } from '../../shared/arcade/juegos/lindes-losas';
import type { Calidad, Traer, Ventana } from '../embarcadero/tipos';

/** Una losa puesta en el tablero. */
export interface LosaEnElTablero {
  /** La llave de su casilla, tal y como la escribe el juego: `'x,y'`. */
  readonly casilla: string;
  /** Hacia el este. */
  readonly x: number;
  /** Hacia el norte. */
  readonly y: number;
  /** La clase de losa, del catálogo. */
  readonly losa: string;
  readonly giro: Giro;
  /** Su número de serie, que es lo que la distingue de otra igual en otro sitio. */
  readonly ficha: string;
  /** La última puesta, que se enseña levantada un momento. */
  readonly ultima: boolean;
}

/** Un labriego plantado, ya traducido a un punto dentro de su losa. */
export interface LabriegoEnElTablero {
  readonly casilla: string;
  /** Dónde va, en fracciones de losa desde su centro: lo calcula `puntoDeLaCosa`. */
  readonly enX: number;
  readonly enZ: number;
  /** `#rrggbb`. */
  readonly color: string;
  /** De quién es, para poder tocarlo. */
  readonly asiento: string;
  /** Qué ocupa, para el rótulo. */
  readonly clase: string;
}

/** Una casilla donde cabe la losa de la mano, con el giro con que cabe. */
export interface HuecoDelTablero {
  readonly x: number;
  readonly y: number;
  readonly giro: Giro;
}

/** El tablero entero, como lo ve la escena. */
export interface TableroDeLasLindesEn3D {
  readonly losas: readonly LosaEnElTablero[];
  readonly labriegos: readonly LabriegoEnElTablero[];
  /** Dónde cabe la de la mano. Vacío si no le toca a nadie poner. */
  readonly huecos: readonly HuecoDelTablero[];
  /** La clase de la losa que hay en la mano, o cadena vacía. */
  readonly enMano: string;
  /** Las casillas de las cosas que se acaban de cobrar, para enseñarlas. */
  readonly cobradas: readonly string[];
  /**
   * ═══ CUÁNTAS LOSAS QUEDAN EN LA BOLSA, Y CUÁNTAS CABÍAN ═══
   *
   * Las dos, y no sólo la primera: de la fracción sale la arena del reloj, y una fracción
   * necesita denominador. Si el denominador se diera por sabido en la escena, el día que
   * alguien añada losas al reparto el reloj empezaría la partida medio caído sin que nada
   * fallara.
   *
   * El CONTENIDO de la bolsa es secreto; la cuenta no —en la mesa se ve el montón—, y por
   * eso las dos salen de la vista sin romper nada del §5.8.
   */
  readonly quedan: number;
  readonly deLaBolsa: number;
}

/** Desde dónde se mira. */
export type ModoDeCamaraDeLasLindes =
  /** Desde arriba, como quien mira la mesa. */
  | { readonly modo: 'mesa' }
  /** Detrás del hombro de un aventurero que anda por encima de las losas. */
  | { readonly modo: 'hombro'; readonly asiento: string }
  /** Desde su cara. */
  | { readonly modo: 'ojos'; readonly asiento: string };

/** Lo que la escena recibe. */
export interface PropsDeLasLindes {
  readonly tablero: TableroDeLasLindesEn3D;
  /** El código de la mesa. De aquí sale la semilla del paisaje, y de ningún otro sitio. */
  readonly codigo: string;
  readonly ventana: Ventana;
  readonly traer: Traer;
  readonly calidad: Calidad;
  readonly camara: ModoDeCamaraDeLasLindes;
  /** Con qué giro se enseña la losa de la mano mientras se elige dónde ponerla. */
  readonly giroEnMano: Giro;
  /**
   * SI SE PUEDE PASAR EL TURNO AHORA, y qué hacer si se toca el reloj.
   *
   * El reloj de arena es también el botón de pasar, como en Riberas y por lo mismo: es el
   * gesto más corriente de la partida y no tiene que costar abrir un cajón. Apagado
   * cuando el juego no lo ofrece —o sea casi siempre que aún hay que poner la losa—, y
   * entonces no coge el toque.
   */
  readonly sePuedePasar?: boolean;
  readonly alPasar?: () => void;
  /** Para que no se mueva nada mientras un comprobador mide. */
  readonly quieto?: boolean;
  readonly alTocarHueco?: (x: number, y: number, giro: Giro) => void;
  readonly alSenalarHueco?: (x: number, y: number) => void;
  readonly alTocarLosa?: (casilla: string) => void;
  readonly alEstarListo?: () => void;
  readonly alFallar?: (motivo: string) => void;
  readonly alMedir?: (m: {
    triangulos: number;
    llamadas: number;
    ms: number;
    fotogramas: number;
  }) => void;
}

/** Lo que se reexporta para que quien monte la escena no importe de dos sitios. */
export type { Calidad, Traer, Ventana };
