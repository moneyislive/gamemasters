/**
 * LO QUE RECIBE CUALQUIER ESCENA DE TABLERO: los campos que el Burgo y Las Lindes declaraban cada una
 * por su lado, escritos una vez. Sin `three` y sin JSX.
 *
 * ═══ POR QUÉ UN CONTRATO COMÚN, Y POR QUÉ SÓLO ESTOS NUEVE ═══
 *
 * `PropsDelBurgo` y `PropsDeLasLindes` repetían nueve campos con el mismo sentido y casi los mismos
 * comentarios: el código de la mesa, cómo se traen los bytes, la calidad, la cámara, la palanca de la
 * app, el canal de Boots on Board y los tres avisos del contrato. Nueve campos repetidos son nueve
 * sitios donde un tercer juego de tablero puede declarar algo distinto sin que nadie lo vea —un
 * `alMedir` con otra forma, un `canal` de otro tipo—, y lo de Boots on Board ya se cosió dos veces por
 * la misma prop. Aquí están una vez: una escena de tablero nueva extiende esto y declara sólo lo suyo
 * (su tablero, sus toques, sus asas). Desde los hallazgos son diez: el aviso `alRecoger` va con
 * `canal`, y por la misma razón que él.
 *
 * Lo que NO entra, a propósito: `quieto` —el Burgo lo exige y Las Lindes no—, `ventana` —Las Lindes la
 * quitó porque mide el lienzo—, y todo lo que es de un juego. Y la cámara es un PARÁMETRO: la de serie
 * son las tres de Las Lindes, y el Burgo pasa la suya, que es la misma con `aerea`, su nombre viejo de
 * `mesa`, mientras un banco lo siga pasando.
 *
 * ═══ SIN `three` Y SIN JSX, PORQUE LO COMPILA EL SERVIDOR ═══
 *
 * `burgo/tipos.ts` y `lindes/tipos.ts` los lee la traducción de `shared/` y, con ella, el `tsc` del
 * servidor, que no sabe de JSX ni tiene `three`. Así que esto importa sólo tipos de ficheros `.ts` que
 * aquéllos ya importaban, y nada de un `.tsx`: un `import type` de un `.tsx` deja al servidor en rojo
 * con los clientes en verde.
 */
import type { Calidad, Traer } from '../embarcadero/tipos';
import type { MandosDeFuera } from '../paseo/mandos';
import type { CanalDeBotas } from '../paseo/mesa-de-botas';

/**
 * LO QUE CUESTA PINTAR UN SEGUNDO: la forma de `alMedir` en esta casa. Triángulos y llamadas del
 * último fotograma, la media de milisegundos de ESE segundo y cuántos fotogramas cubre, que es lo que
 * lee el juez de la calidad (`juzgarCalidad`, `calidadDelValle`) para no estimarlos desde `ms`.
 */
export interface MedidaDelHilo {
  readonly triangulos: number;
  readonly llamadas: number;
  readonly ms: number;
  readonly fotogramas: number;
}

/**
 * DESDE DÓNDE SE MIRA UN TABLERO: la mesa, o a pie con el paseo común (`escenas/paseo/`), detrás del
 * hombro o desde los ojos del asiento que anda. Las tres de Las Lindes, con sus nombres.
 */
export type ModoDeCamaraDeTablero =
  | { readonly modo: 'mesa' }
  | { readonly modo: 'hombro'; readonly asiento: string }
  | { readonly modo: 'ojos'; readonly asiento: string };

export interface PropsDeEscenaDeTablero<Camara extends { readonly modo: string } = ModoDeCamaraDeTablero> {
  /**
   * El código de la mesa: de él sale la semilla del DECORADO —el paisaje, la ciudad— y de ningún otro
   * sitio. Nunca la del azar del juego, que va dentro del estado y la escena no ve.
   */
  readonly codigo: string;
  /** Cómo se piden los bytes de un modelo (`embarcadero/tipos.ts`). Estable por contrato. */
  readonly traer: Traer;
  /**
   * `plena` o `sobria`, medida y no adivinada: la decide quien monta la escena con lo que ésta cuenta
   * por `alMedir`. Qué se recorta en `sobria` lo dice el presupuesto de cada escena; lo que cuenta una
   * regla se pinta igual en las dos.
   */
  readonly calidad: Calidad;
  readonly camara: Camara;
  /**
   * LA PALANCA Y EL BOTÓN DE CORRER, cuando el aparato no tiene teclado.
   *
   * La escena lee el teclado ella sola —donde hay `document`, lo hace el paseo común—, pero en iOS y en
   * Android no lo hay, y sin esto en la app NO SE PODÍA ANDAR. La app monta los mandos táctiles
   * (`app/src/arcade/mandos-del-paseo.tsx`) y los escribe en esta referencia; la escena los lee en su
   * bucle, sin pasar por React. Opcional porque el escritorio anda con el teclado.
   */
  readonly mandos?: { readonly current: MandosDeFuera };
  /**
   * EL CANAL DE BOOTS ON BOARD, sólo en una mesa de la modalidad `botas`.
   *
   * Con él la escena abre el canal de la mesa (`paseo/usar-el-canal.ts`), le cuenta cada tic de quien
   * anda, deja que el servidor lo corrija y pinta a los demás asientos andando (`paseo/los-demas.tsx`)
   * con la misma altura del suelo que quien anda. Sin él —la mesa de siempre— no se abre nada y no se
   * paga nada: ni un socket ni una llamada por tic. Quién lo pasa y cuándo lo deciden los clientes con
   * `esMesaDeBotas`, y en ningún otro sitio.
   */
  readonly canal?: CanalDeBotas;
  /**
   * ALGUIEN HA RECOGIDO UN HALLAZGO (docs/AVATARES-JUGABLES.md §2), sólo con `canal`: una vez por
   * cada `recoge` del servidor, sea de quien sea. `por` es el asiento que lo cogió, `clase` lo que era
   * —`propina`, `hierro`, `escudo`…— y `mio`, si ha sido este aparato. Para el aviso en pantalla: lo
   * que vale lo decide el juego y llega por la mesa, no por aquí. Los brotes los pinta la escena sola.
   */
  readonly alRecoger?: (r: { readonly por: string; readonly clase: string; readonly mio: boolean }) => void;
  /**
   * SIEMPRE una vez, con o sin modelos: cuando lo que la escena espera ha llegado o ha fallado, y con
   * el mundo ya pintado; o a los quince segundos si `traer` no contesta. El contrato del Muelle.
   */
  readonly alEstarListo?: () => void;
  /** Algo no llegó: una vez por fichero, antes o después de `alEstarListo`. La escena sigue en pie. */
  readonly alFallar?: (motivo: string) => void;
  /** LO QUE CUESTA PINTAR, una vez por segundo y con la media de ESE segundo: ver `MedidaDelHilo`. */
  readonly alMedir?: (medida: MedidaDelHilo) => void;
}
