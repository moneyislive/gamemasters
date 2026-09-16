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
 * ═══ LO ÚNICO QUE AQUÍ NO ES UN TIPO: `senaladoTrasElGesto` ═══
 *
 * Al final del fichero hay UNA función, y está aquí por el mismo motivo que el resto:
 * decide cuándo sale el aviso `alSenalarCasilla` —o sea, parte del contrato— y sin `three`
 * la puede correr `verify:burgo-escena` en Node con un recorrido de puntero de verdad. Dentro
 * de `Burgo.tsx` sería un trozo de decisión que ningún comprobador puede ejecutar, y un
 * filtro de repetición roto no da error: sigue avisando, sólo que de más.
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
import type { SitioDeLaBandeja } from './bandeja-de-los-dados';

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
  /**
   * EN QUÉ ESQUINA DEL LIENZO VA LA BANDEJA DE LOS DADOS, y a cuántos puntos de sus bordes. La
   * escena no sabe qué tiene el cliente encima del lienzo, así que lo dice él: el escritorio abajo a
   * la derecha, la app arriba a la derecha. Sin él, abajo a la derecha a 12 puntos.
   */
  readonly bandejaDeLosDados?: SitioDeLaBandeja;
  readonly seguirAlQueMueve: boolean;
  /** Un movimiento en vuelo: las asas no mandan. */
  readonly quieto: boolean;
  readonly alTocarCasilla?: (indice: number) => void;
  /**
   * QUÉ CASILLA ESTÁ SEÑALANDO EL PUNTERO, o `null` cuando ya no señala ninguna.
   *
   * OPCIONAL a propósito: los dos clientes de hoy no lo pasan, y sin él la escena se
   * comporta exactamente igual que antes. Se llama SÓLO cuando el índice CAMBIA
   * (`senaladoTrasElGesto`, abajo, dice cuándo), así que quien lo reciba puede repintar su
   * cartel en cada aviso sin medir nada ni comparar con lo que ya tenía.
   *
   * No lo apaga `quieto` y no salta la cola de animaciones: leer una casilla no es tocarla.
   */
  readonly alSenalarCasilla?: (indice: number | null) => void;
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

/* ─────────────────── EL SEÑALADO: QUÉ CASILLA ESTÁ MIRANDO EL PUNTERO ─────────────────── */

/**
 * EL GESTO QUE LE LLEGA A UNA CASILLA, TAL COMO LO CUENTA EL PUNTERO.
 *
 *  · `posa`: el puntero se mueve SOBRE una casilla (`onPointerMove` del asa).
 *  · `sale`: el puntero abandona una casilla (`onPointerOut` del asa). `sobre` es la que se
 *    abandona, que NO tiene por qué ser la que estaba señalada — ver el filtro 2.
 *  · `levanta`: el dedo se va de la pantalla (`onPointerUp` con un puntero que no es ratón).
 *
 * `sobre` es el `instanceId` crudo que da r3f: puede venir `undefined` —un aviso de la malla
 * sin instancia debajo— o fuera del anillo. Eso se apaga aquí y no en la escena, para que se
 * pueda medir en Node.
 */
export type GestoDeSenalado =
  | { readonly que: 'posa'; readonly sobre: number | undefined }
  | { readonly que: 'sale'; readonly sobre: number | undefined }
  | { readonly que: 'levanta' };

/**
 * QUÉ GESTO ES DE VERDAD UNA SALIDA, MIRANDO LO QUE QUEDA BAJO EL PUNTERO.
 *
 * ═══ EL FALLO, CON EL NÚMERO ═══
 *
 * Salir de una casilla NO es dejar de señalar: casi siempre es entrar en la de al lado. Y en
 * r3f la salida llega ANTES de la entrada, no después —`cancelPointer(hits)` corre delante de
 * `onIntersect` en el mismo reparto del suceso—, así que un adiós a secas apagaría el cartel
 * en cada frontera: recorrer el anillo entero son 39 apagados y 39 encendidos, y un cartel que
 * parpadea treinta y nueve veces mientras se lee es peor que no tenerlo.
 *
 * ═══ EL REMEDIO: LA SALIDA YA TRAE LO QUE HAY DEBAJO ═══
 *
 * r3f rehace las intersecciones antes de avisar de la salida y se las pasa al aviso
 * (`{ ...hoveredObj, intersections }`), así que la salida SABE si el puntero sigue sobre otra
 * instancia de la misma malla. Si sigue, esto no es una salida: es una entrada en la nueva, y
 * se devuelve como tal — un aviso por casilla y ninguno de apagado. Si no queda ninguna
 * —el puntero se fue al cielo o salió del lienzo, donde las intersecciones vienen vacías—,
 * entonces sí es un adiós.
 *
 * Y no vale con fiarlo al orden ni a que React junte los dos repintados: el orden es de la
 * versión de r3f que haya instalada, y el `sale` de aquí abajo sigue teniendo su filtro por si
 * un día llega por detrás.
 *
 * @param sobre         La instancia que se abandona (`instanceId` del aviso).
 * @param intersecciones Las intersecciones FRESCAS que el aviso trae.
 * @param laMalla       El objeto que atiende (`eventObject`); sólo cuentan las suyas.
 */
export function gestoAlSalir(
  sobre: number | undefined,
  intersecciones: readonly { readonly eventObject: object; readonly instanceId?: number }[],
  laMalla: object,
): GestoDeSenalado {
  for (const cruce of intersecciones) {
    if (cruce.eventObject !== laMalla || cruce.instanceId === undefined) continue;
    return { que: 'posa', sobre: cruce.instanceId };
  }
  return { que: 'sale', sobre };
}

/**
 * ¿ESTE GESTO ES NOTICIA PARA EL CLIENTE? LOS TRES FILTROS, JUNTOS Y SIN `three`.
 *
 * Vive aquí y no en `Burgo.tsx` por lo mismo que el resto de la aritmética del Burgo: en un
 * `.tsx` con `three` dentro no lo puede correr ningún comprobador de Node, y un filtro de
 * repetición que no se prueba se rompe en silencio — sigue avisando, sólo que de más.
 *
 * ═══ FILTRO 1: UN AVISO DE PUNTERO NO ES UN AVISO DE SEÑALADO ═══
 *
 * `onPointerMove` sobre una malla instanciada se dispara con CADA movimiento del ratón, y
 * casi todos caen en la MISMA casilla: cruzar despacio una de 72 × 108 son decenas de avisos
 * seguidos con idéntico índice. Si cada uno saliera por `alSenalarCasilla`, el cliente
 * repintaría su cartel del pie sesenta veces por segundo para decir lo mismo — y el cartel
 * del escritorio se remonta con una llave nueva en cada cambio, así que eso no es un
 * repintado de más: es un cartel que reaparece sesenta veces por segundo. En el recorrido que
 * mide `verify:burgo-escena` —sesenta gestos sobre la 7, tres sobre la 8 y la salida— salen
 * TRES avisos de sesenta y cuatro gestos.
 *
 * ═══ FILTRO 2: LA SALIDA QUE LLEGA TARDE APAGA EL CARTEL QUE ACABA DE ENCENDERSE ═══
 *
 * Al pasar de una casilla a la vecina llegan dos gestos —la entrada en la nueva y la salida
 * de la vieja— y r3f no promete cuál primero. Con la salida por detrás, un aviso de `null` a
 * secas apagaría el cartel de la casilla a la que el cursor ACABA de llegar, y el cartel
 * parpadearía al recorrer el anillo, que es justo el gesto con el que se lee. Así que una
 * salida de una casilla que ya NO es la señalada se tira: el mismo remedio que la mano de
 * cartas del Delta (`delta.tsx`, «quién está señalado»), donde eso costó una tanda.
 *
 * Éste es el filtro del orden CONTRARIO al que r3f usa hoy —hoy la salida llega delante, y de
 * ésa se ocupa `gestoAlSalir` aquí arriba—, y está escrito porque el orden no es del contrato:
 * es de la versión instalada. Los dos juntos tapan el parpadeo llegue como llegue.
 *
 * ═══ FILTRO 3: UN ÍNDICE QUE NO ES UNA CASILLA ES NINGUNA CASILLA ═══
 *
 * `undefined`, negativo, con decimales o de 40 para arriba: no se manda ese número al
 * cliente, se manda `null`. El cliente busca la casilla en su lista y `lista[40]` no existe.
 *
 * @param ultimo   El índice que el cliente ya sabe (`null` = ninguno).
 * @param casillas Cuántas tiene el anillo (40); se pasa para no traer `anillo-en-3d` aquí.
 * @returns `avisa` dice si hay que llamar a `alSenalarCasilla`, y `ahora` es lo que se le
 *          pasa Y lo que queda apuntado como último. Si `avisa` es falso, `ahora` es `ultimo`.
 */
export function senaladoTrasElGesto(
  ultimo: number | null,
  gesto: GestoDeSenalado,
  casillas: number,
): { readonly avisa: boolean; readonly ahora: number | null } {
  const sinNoticia = { avisa: false, ahora: ultimo } as const;
  const esCasilla = (i: number | undefined): i is number => i !== undefined && Number.isInteger(i) && i >= 0 && i < casillas;
  /* Filtro 2: una salida de otra casilla es una salida que llega tarde. */
  if (gesto.que === 'sale' && esCasilla(gesto.sobre) && gesto.sobre !== ultimo) return sinNoticia;
  /* Filtro 3: sólo `posa` sobre una casilla de verdad enciende algo; todo lo demás apaga. */
  const ahora = gesto.que === 'posa' && esCasilla(gesto.sobre) ? gesto.sobre : null;
  /* Filtro 1: sólo se avisa del cambio. */
  return ahora === ultimo ? sinNoticia : { avisa: true, ahora };
}
