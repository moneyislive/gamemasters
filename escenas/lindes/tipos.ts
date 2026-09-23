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
import type { Calidad, Traer } from '../embarcadero/tipos';
import type { MandosDeFuera } from '../paseo/mandos';
import type { CanalDeBotas } from '../paseo/mesa-de-botas';

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
  /*
   * ═══ AQUÍ HABÍA UNA `ventana`, Y NADIE LA LEÍA ═══
   *
   * El contrato la pedía obligatoria, los dos clientes la rellenaban con
   * `{ ancho: 0, alto: 0, franjaInferior: 0 }` —ceros, o sea nada— y `Lindes.tsx` no la
   * mencionaba ni una vez. Un campo obligatorio que todo el mundo rellena con ceros es
   * peor que no tenerlo: el siguiente que lo vea le pondrá números de verdad, no pasará
   * nada, y se quedará un rato buscando por qué.
   *
   * Y no hace falta, por dos motivos que van juntos:
   *
   *   · LO QUE LA ESCENA MIDE ES EL LIENZO, no la ventana, y eso lo da `size` de
   *     `useThree` —un `ResizeObserver` sobre el propio `<canvas>`—, que es la medida
   *     de verdad y no una que haya que acordarse de pasar.
   *   · Y LA FRANJA INFERIOR AQUÍ ES CERO de verdad: en la app, el raíl del turno y la
   *     hoja de abajo son HERMANAS del lienzo y no están encima, así que no tapan nada.
   *     Otras escenas de esta casa sí la necesitan —las que llevan un cajón por encima—
   *     y por eso el tipo `Ventana` sigue existiendo; ésta no.
   *
   * Si algún día el lienzo de Las Lindes se hace de pantalla completa con algo encima,
   * esto vuelve, y vuelve porque hará falta y no por simetría.
   */
  readonly traer: Traer;
  readonly calidad: Calidad;
  readonly camara: ModoDeCamaraDeLasLindes;
  /** Con qué giro se enseña la losa de la mano mientras se elige dónde ponerla. */
  readonly giroEnMano: Giro;
  /**
   * LA FIGURA DE QUIEN PASEA, si eligió una.
   *
   * Opcional a propósito y no obligatoria: `figuraQueSePinta` saca una del asiento cuando
   * no hay elección, igual que en el muelle. Así la escena nunca se queda sin nadie a quien
   * seguir por no haber pasado un dato — y la cámara de hombro iría detrás de nadie, que es
   * exactamente lo que pasaba antes de que esto existiera.
   */
  readonly figura?: string;
  /**
   * LA PALANCA Y EL BOTÓN DE CORRER, cuando el aparato no tiene teclado.
   *
   * La escena lee el teclado ella sola —donde hay `document`—, pero en iOS y en Android no lo
   * hay, y sin esto en la app NO SE PODÍA ANDAR. La app monta los mandos táctiles
   * (`app/src/arcade/mandos-del-paseo.tsx`) y los escribe en esta referencia; la escena los lee
   * en su bucle, sin pasar por React. Opcional porque el escritorio anda con el teclado.
   */
  readonly mandos?: { readonly current: MandosDeFuera };
  /**
   * EL CANAL DE BOOTS ON BOARD, sólo en una mesa de la modalidad `botas`.
   *
   * Con él la escena abre el canal de la mesa (`paseo/usar-el-canal.ts`), le cuenta cada tic de
   * quien pasea, deja que el servidor lo corrija y pinta a los demás asientos andando
   * (`paseo/los-demas.tsx`). Sin él —la mesa de siempre— no se abre nada y no se paga nada: ni un
   * socket ni una llamada por tic. Quién lo pasa y cuándo lo deciden los clientes con
   * `esMesaDeBotas`, y en ningún otro sitio.
   */
  readonly canal?: CanalDeBotas;
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
  /**
   * Qué casilla clara está señalada, o `null` cuando deja de haber ninguna —porque se ha
   * puesto la losa ahí, o porque el turno ha pasado a otro—. Antes sólo sabía decir «esta
   * de aquí», así que la pista del rail se quedaba nombrando una casilla ya ocupada.
   */
  readonly alSenalarHueco?: (x: number | null, y: number | null) => void;
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
export type { Calidad, Traer };
export type { Paseante } from './paseo';
export type { AsientoQueAnda, CanalDeBotas } from '../paseo/mesa-de-botas';
export type { EstadoDelCanal } from '../paseo/canal-de-botas';
