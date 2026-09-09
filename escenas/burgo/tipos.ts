/**
 * EL CONTRATO DE PROPS DEL BURGO EN TRES DIMENSIONES: lo que la escena recibe y lo que
 * avisa, sin `three`.
 *
 * ═══ POR QUÉ ESTO ES UN FICHERO APARTE Y SIN `three` ═══
 *
 * Es el mismo trato que `escenas/embarcadero/tipos.ts`: la escena no habla con el
 * servidor, no sabe qué es un sondeo y no sabe a qué se juega. Recibe un tablero llano
 * (cuarenta casillas, las figuras, los dados), la lista de sucesos que acaban de pasar y
 * una función para traer bytes; y todo lo que quiere decir sale por sus avisos. Así el
 * mismo componente lo montan la app sobre `expo-gl` y el escritorio sobre WebGL, con un
 * `Canvas` cada uno. Y como aquí no hay `three`, lo leen `shared/arcade/juegos/burgo-en-tres.ts`
 * (que traduce la vista a esto) y los comprobadores de Node sin abrir un contexto de dibujo.
 *
 * ═══ UN SOLO VOCABULARIO DE SUCESOS ═══
 *
 * `SucesoDelBurgo` se importa CON `import type` de las reglas: se borra al compilar, así
 * que `escenas/` no arrastra `shared/arcade` en ejecución, y a la vez hay una única lista
 * de lo que puede pasar en la mesa. La escena anima esa lista (`coreografia.ts`) y el
 * retablo SVG la ignora; ninguna animación decide nada.
 *
 * ═══ EL SEGUNDO MODO DE CÁMARA ESTÁ RESERVADO ═══
 *
 * `ModoDeCamara` admite `tercera-persona`, pero HOY la escena lo ignora y lo dice en su
 * cabecera: `peon.ts` ya da posición y rumbo por fotograma, así que el día que se quiera
 * el hueco está hecho sin cambiar el contrato.
 */
import type { FiguraId } from '../embarcadero/figuras';
import type { Traer, Ventana, Calidad } from '../embarcadero/tipos';
import type { ParDeDados } from '../dados';
import type { SucesoDelBurgo } from '../../shared/arcade/juegos/burgo';

export type ClaseDeCasillaEn3D =
  | 'salida'
  | 'solar'
  | 'arca'
  | 'diezmo'
  | 'puerta'
  | 'pregon'
  | 'mazmorra'
  | 'oficio'
  | 'feria'
  | 'a-la-mazmorra'
  | 'alcabala';

export interface CasillaEn3D {
  /** 0..39 */
  readonly indice: number;
  readonly clase: ClaseDeCasillaEn3D;
  /** `#rrggbb` de la acera, o `null`. */
  readonly colorDelBarrio: string | null;
  /** `#rrggbb` del dueño, o `null` (el Concejo). */
  readonly dueno: string | null;
  /** 0..4; 5 = posada. */
  readonly casas: number;
  readonly empenada: boolean;
  readonly enAlmoneda: boolean;
  /** Hay una opción al tocarla: la marca se enciende. */
  readonly tocable: boolean;
}

export interface FiguraEn3D {
  readonly asiento: string;
  /** `#rrggbb` del peón y del disco. */
  readonly color: string;
  /** Ya resuelta con `figuraQueSePinta`; la escena decide cuántas monta (hoy: una). */
  readonly figura: FiguraId;
  readonly casilla: number;
  readonly presa: boolean;
  readonly quebrada: boolean;
  readonly esLocal: boolean;
  readonly leToca: boolean;
}

export interface DadosDelBurgoEn3D {
  readonly par: ParDeDados | null;
  readonly tirado: boolean;
  readonly sello: number;
  /** El asa se monta. */
  readonly porTirar: boolean;
  /** Sorteo: asiento cuya marca se enciende; `null` = la plaza. */
  readonly delanteDe: string | null;
}

export interface TableroDelBurgoEn3D {
  /** 40; LA MISMA lista por identidad si la firma no cambió. */
  readonly casillas: readonly CasillaEn3D[];
  /** En orden de asiento. */
  readonly figuras: readonly FiguraEn3D[];
  /** Casilla de quien tiene el turno. */
  readonly destacada: number | null;
  readonly almoneda: number | null;
  readonly carta: { readonly mazo: 'pregon' | 'arca'; readonly enCasilla: number; readonly jugada: number } | null;
  readonly trato: { readonly de: string; readonly a: string } | null;
  readonly ganador: string | null;
}

/** El segundo modo está RESERVADO: hoy la escena ignora el valor y lo dice en cabecera. `peon.ts` ya da {x, z, rumbo} por fotograma. */
export type ModoDeCamara = { readonly modo: 'aerea' } | { readonly modo: 'tercera-persona'; readonly asiento: string };

export interface PropsDelBurgo {
  readonly tablero: TableroDelBurgoEn3D;
  readonly dados: DadosDelBurgoEn3D | null;
  /** Lo que acaba de pasar: `jugada` sube con cada vista nueva; la escena reproduce lo que no ha visto (sucesosEnTres). */
  readonly sucesos: { readonly jugada: number; readonly lista: readonly SucesoDelBurgo[] };
  /** Semilla del DECORADO (semillaDelCodigo); nunca la del azar. */
  readonly codigo: string;
  /** `franjaInferior` 0: la hoja no tapa el lienzo. */
  readonly ventana: Ventana;
  readonly traer: Traer;
  readonly calidad: Calidad;
  readonly camara: ModoDeCamara;
  readonly seguirAlQueMueve: boolean;
  /** Un movimiento en vuelo: las asas no mandan. */
  readonly quieto: boolean;
  readonly alTocarCasilla?: (indice: number) => void;
  readonly alTocarLosDados?: () => Promise<'hecho' | 'rechazado' | 'sin-red'>;
  /** Abre la ficha del jugador (tratos). */
  readonly alTocarFigura?: (asiento: string) => void;
  /** SIEMPRE una vez, con o sin modelos, tope 15 s (contrato del Muelle). */
  readonly alEstarListo?: () => void;
  readonly alFallar?: (motivo: string) => void;
  /** Una vez por segundo. */
  readonly alMedir?: (m: { triangulos: number; llamadas: number; ms: number; fotogramas: number }) => void;
  /** La escena ya está en el estado final de la vista. */
  readonly alTerminarLaCola?: () => void;
}
