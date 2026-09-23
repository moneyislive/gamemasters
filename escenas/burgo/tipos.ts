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
 * ═══ LAS TRES CÁMARAS SON LAS DE LAS LINDES, Y A PIE SE ANDA CON EL PASEO COMÚN ═══
 *
 * `ModoDeCamara` era la aérea y una `tercera-persona` RESERVADA que la escena ignoraba. Ahora
 * son las tres de Las Lindes con sus mismos nombres: `mesa` —la de siempre, que pone el
 * cliente—, y `hombro` y `ojos`, que bajan a andar por la ciudad con el paseo común
 * (`escenas/paseo/`) sobre el mundo que declara `mundoDelBurgo`. Los dos modos de a pie llevan
 * el ASIENTO de quien anda: de él salen su sitio de nacer y su figura. La palanca de la app
 * llega por `mandos`, igual que en Las Lindes. Lo que es sólo de esta ciudad está en `a-pie.ts`.
 *
 * ═══ Y EN UNA MESA DE BOTAS SE ANDA CON LOS DEMÁS, POR LA MISMA PROP QUE EN LAS LINDES ═══
 *
 * `canal`, junto a `mandos`: con ella la escena abre el canal de la mesa, le cuenta cada tic de
 * quien anda y pinta a los demás asientos andando por las calles. Es LA MISMA prop que la de Las
 * Lindes y no una copia: las dos escenas extienden `PropsDeEscenaDeTablero` (`comun/tablero.ts`),
 * que declara una vez el código, `traer`, la calidad, la cámara, la palanca, el canal y los tres
 * avisos. Aquí queda lo que es del Burgo. Aquél es un `.ts` sin JSX, así que el `tsc` del servidor,
 * que lee este fichero a través de la traducción, lo compila igual que antes.
 */
import type { PropsDeEscenaDeTablero } from '../comun/tablero';
import type { FiguraId } from '../embarcadero/figuras';
import type { Ventana } from '../embarcadero/tipos';
import type { ParDeDados } from '../dados';
import type { SucesoDelBurgo } from '../../shared/arcade/juegos/burgo';
import type { SitioDeLaBandeja } from './bandeja-de-los-dados';

/**
 * LO QUE LA MESA LE DICE AL RELOJ DE ARENA DE LA CAJA DEL BURGO: la forma de `RelojDeLaMesa` de
 * `escenas/reloj.tsx`, campo a campo, escrita aquí porque aquel fichero es un `.tsx` y éste lo leen el
 * servidor y la traducción, que no compilan JSX —importada de allí, el `tsc` del servidor no arranca—.
 * `verify:burgo-escena` compara las dos.
 */
export interface RelojDelBurgo {
  /** Cuándo empezó el turno, en milisegundos de reloj de pared. */
  readonly desde: number;
  /** Cuándo vence, o `null` si la mesa no tiene plazo: entonces el reloj se pinta lleno y quieto. */
  readonly venceEn: number | null;
  /** Si se puede pasar el turno tocándolo. */
  readonly disponible: boolean;
  /** `turnosAbiertos` de la vista: sube al cambiar de turno, y eso lo voltea. */
  readonly vuelta: number;
}

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
  /** El efectivo, en euros: lo que enseñan los billetes de la caja del Burgo. */
  readonly dinero: number;
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
  /**
   * LO QUE LE QUEDA AL CONCEJO: las casas y los hoteles sin construir y las cartas de cada mazo. Lo
   * enseña la caja del Burgo, que se va vaciando.
   */
  readonly banca: { readonly casas: number; readonly posadas: number; readonly cartas: { readonly pregon: number; readonly arca: number } };
}

/**
 * DESDE DÓNDE SE MIRA: las tres cámaras de Las Lindes, con sus nombres.
 *
 *  · `mesa`: la de siempre. La pone el cliente (`CamaraAerea` en el escritorio, el ojo del
 *    mirador táctil en la app) y la escena sólo la empuja para seguir al que mueve.
 *  · `hombro` y `ojos`: A PIE por la ciudad, detrás de la figura de `asiento` o desde su cara.
 *    Ahí la cámara es del paseo común, la escriba quien la escriba (ver `Burgo.tsx`).
 *  · `aerea` es el nombre VIEJO de `mesa` y la escena lo trata igual. Queda porque
 *    `escritorio/src/banco-burgo.tsx`, que no es de esta tanda, todavía lo pasa; el día que
 *    pase `mesa`, esta línea se borra.
 */
export type ModoDeCamara =
  | { readonly modo: 'mesa' }
  | { readonly modo: 'hombro'; readonly asiento: string }
  | { readonly modo: 'ojos'; readonly asiento: string }
  | { readonly modo: 'aerea' };

/**
 * LO QUE RECIBE EL BURGO: lo de cualquier escena de tablero (`comun/tablero.ts`: el código, `traer`,
 * la calidad, la cámara —aquí `ModoDeCamara`, con `aerea`—, la palanca, el canal de Boots on Board y
 * los tres avisos) y lo suyo, que es esto.
 */
export interface PropsDelBurgo extends PropsDeEscenaDeTablero<ModoDeCamara> {
  readonly tablero: TableroDelBurgoEn3D;
  readonly dados: DadosDelBurgoEn3D | null;
  /** Lo que acaba de pasar: `jugada` sube con cada vista nueva; la escena reproduce lo que no ha visto (sucesosEnTres). */
  readonly sucesos: { readonly jugada: number; readonly lista: readonly SucesoDelBurgo[] };
  /** `franjaInferior` 0: la hoja no tapa el lienzo. */
  readonly ventana: Ventana;
  /**
   * EN QUÉ ESQUINA DEL LIENZO VA LA BANDEJA DE LOS DADOS, y a cuántos puntos de sus bordes. La
   * escena no sabe qué tiene el cliente encima del lienzo, así que lo dice él: el escritorio abajo a
   * la derecha, la app arriba a la derecha. Sin él, abajo a la derecha a 12 puntos.
   */
  readonly bandejaDeLosDados?: SitioDeLaBandeja;
  /**
   * EL RELOJ DE ARENA DEL TURNO, como en Riberas (`escenas/reloj.tsx`): cuándo empezó el turno, cuándo
   * vence, si se puede pasar y la vuelta que lo voltea. Sin él, el reloj se pinta lleno y quieto y no
   * pasa nada al tocarlo.
   */
  readonly reloj?: RelojDelBurgo | null;
  /**
   * TOCAR EL RELOJ DE ARENA: pasar el turno. Sólo se llama con `reloj.disponible` y sin `quieto`, y dice
   * cómo acabó, como `alTocarLosDados`: si no es `'hecho'` y el turno sigue, la arena vuelve a caer.
   */
  readonly alPasarElTurno?: () => Promise<'hecho' | 'rechazado' | 'sin-red'>;
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
