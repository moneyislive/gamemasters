/**
 * LO QUE LA ESCENA DEL MUELLE NECESITA SABER DE LA MESA, Y NADA MÁS.
 *
 * ═══ LA FRONTERA ═══
 *
 * La escena no habla con el servidor, no sabe qué es un sondeo y no sabe a qué
 * se juega. Recibe una lista de asientos, quién soy yo, si la partida ya
 * empezó, y una función para traer bytes. Todo lo que cambia le llega por sus
 * props, y todo lo que ella quiere decir sale por sus avisos. Así el mismo
 * componente lo montan la app sobre `expo-gl` y el escritorio sobre WebGL, con
 * un `Canvas` cada uno, y ninguno de los dos sabe del otro.
 *
 * ═══ SIN `three` NI REACT AQUÍ ═══
 *
 * Es el contrato, y el contrato lo leen los comprobadores de Node sin abrir un
 * contexto de dibujo. Lo que sí importa `three` es `Embarcadero.tsx`, al lado.
 */
import type { TemaDelMuelle } from './tema';

/** Un asiento tal como la escena lo necesita: lo que manda el servidor, sin la llave. */
export interface AsientoEnElMuelle {
  readonly id: string;
  readonly nombre: string;
  /** Se le ha visto hace poco. Cosmético: quien no está sigue sentado. */
  readonly presente: boolean;
  /** La figura que eligió, si eligió. Puede venir una que este binario no conozca. */
  readonly figura?: string;
}

/** La mesa vista desde el muelle. */
export interface MesaEnElMuelle {
  /** `null` mientras no hay mesa: se está en la orilla, eligiendo figura y nombre. */
  readonly codigo: string | null;
  readonly asientos: readonly AsientoEnElMuelle[];
  /** Mi asiento, o `null` si miro sin sentarme. */
  readonly yo: string | null;
  /** La partida ya empezó: hay que zarpar. */
  readonly empezada: boolean;
  /** Cuántos caben y cuántos hacen falta. Del manifiesto. */
  readonly aforo: { readonly minimo: number; readonly maximo: number };
  readonly tema: TemaDelMuelle;
}

/**
 * CÓMO SE PIDEN LOS BYTES DE UN MODELO. La inyecta el cliente.
 *
 * En el navegador es un `fetch` a la ruta relativa; en la app es un `fetch` a
 * `servidorActual()` más la ruta. La escena sólo sabe que le devuelven un
 * `ArrayBuffer` con un `.glb` dentro, y lo abre con `GLTFLoader.parse`, que no
 * toca la red ni el DOM. Las rutas salen de `figuras.ts`.
 */
export type Traer = (ruta: string) => Promise<ArrayBuffer>;

/**
 * LO QUE EL HUD TAPA Y CÓMO ES LA VENTANA, para que la cámara encuadre.
 *
 * `franjaInferior` es la fracción del alto que ocupa la hoja del HUD desde
 * abajo (0,36 en el móvil con la hoja abierta; 0 en el PC, donde el HUD va al
 * lado). La cámara sube el objetivo para que el aventurero local quede entero
 * ENCIMA de la hoja y nunca debajo.
 */
export interface Ventana {
  readonly ancho: number;
  readonly alto: number;
  readonly franjaInferior: number;
}

/** Dos calidades, medidas y no adivinadas: la sobria es para un móvil justo. */
export type Calidad = 'plena' | 'sobria';

export interface PropsDelEmbarcadero {
  readonly mesa: MesaEnElMuelle;
  readonly ventana: Ventana;
  readonly traer: Traer;
  readonly calidad: Calidad;
  /**
   * La figura que estoy PROBANDO en la orilla, antes de sentarme, o la que acabo
   * de elegir y aún no ha vuelto por el sondeo. Manda sobre la del asiento
   * mientras esté puesta.
   */
  readonly figuraQuePruebo?: string;
  /** Empieza la coreografía de zarpar. La escena avisa cuando termina. */
  readonly zarpando?: boolean;
  /**
   * El primer fotograma con el mundo se ha pintado: ya se puede quitar el telón.
   *
   * SE LLAMA SIEMPRE, exactamente una vez, aunque alguna pieza no haya llegado:
   * si falta un aventurero, o falta el embarcadero entero, la escena pinta lo que
   * tenga (cielo, agua, luz) y avisa igual, y `alFallar` cuenta lo que faltó. El
   * telón de los dos clientes sólo se levanta con esto; si un fallo impidiera
   * llamarlo, el mundo quedaría tapado para siempre sin un solo error.
   */
  readonly alEstarListo?: () => void;
  /**
   * La coreografía de zarpar ha terminado: ya se puede cambiar de pantalla.
   * Exactamente una vez por coreografía, y también si `zarpando` llega con el
   * mundo a medio cargar (entonces, en cuanto se pueda, y sin esperar a nada).
   */
  readonly alZarpar?: () => void;
  /**
   * Algo no se pudo cargar. Puede llegar ANTES o DESPUÉS de `alEstarListo`, y
   * más de una vez (una por fichero). La escena sigue en pie con lo que tenga; el
   * HUD decide qué decir. El motivo es una frase para una persona, en castellano.
   */
  readonly alFallar?: (motivo: string) => void;
  /**
   * Lo que pasa por el hilo de dibujo, UNA VEZ POR SEGUNDO, para el banco y para
   * elegir la calidad: triángulos y llamadas del último fotograma, la media de
   * milisegundos por fotograma del último segundo, y cuántos fotogramas cubre esa
   * media. `fotogramas` existe para que quien decide la calidad cuente fotogramas
   * de verdad en vez de estimarlos desde `ms`.
   */
  readonly alMedir?: (medida: {
    triangulos: number;
    llamadas: number;
    ms: number;
    fotogramas: number;
  }) => void;
}
