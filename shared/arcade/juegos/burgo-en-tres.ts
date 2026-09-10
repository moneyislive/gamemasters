/**
 * EL BURGO, TRADUCIDO PARA LA ESCENA EN TRES DIMENSIONES: de la vista que manda la
 * mesa a lo que el anillo 3D pinta, y de lo que se toca en el anillo al movimiento
 * que hay que mandar.
 *
 * ═══ QUÉ ES ESTO Y QUÉ NO ═══
 *
 * La escena de la ciudad (`escenas/burgo/Burgo.tsx`) no sabe que existe el Burgo: pinta
 * un `TableroDelBurgoEn3D` —cuarenta casillas, seis figuras, unos dados— y anima una
 * lista de sucesos. Todo eso lo tiene que decir alguien que SÍ sepa del Burgo, y ese
 * alguien no puede ser la pantalla de cada cliente: habría dos traducciones —la de la
 * app y la del escritorio— que un día dirían cosas distintas. Aquí vive la
 * traducción, UNA vez, sin `three` y sin React, para que un comprobador de Node
 * (`verify:burgo-en-tres`) la pueda ejercitar con partidas de verdad.
 *
 * NO HAY NINGUNA REGLA AQUÍ. Qué se puede hacer en una casilla lo dice
 * `opcionesDelBurgo`, la misma lista que el reductor exige antes de aceptar nada;
 * qué hay construido, quién tiene qué y cuánto cobra lo dice la vista, que ya trae
 * derivado lo que un cliente no debería recontar (`rentaAhora`, `barrioEntero`,
 * `patrimonio`). Este fichero sólo cambia de forma lo que ya está decidido en otro
 * sitio, y donde la vista calla, calla.
 *
 * ═══ NUNCA SE MONTA UN MOVIMIENTO: SE DEVUELVE LA OPCIÓN ENTERA ═══
 *
 * Cada función que da algo que se puede pulsar da LA OPCIÓN que `opcionesDelBurgo`
 * compuso —su `tipo` y su `carga` tal cual— y el cliente manda
 * `{ tipo: o.tipo, carga: o.carga }`. Escribir aquí la forma de una carga sería un
 * segundo sitio que nadie comprueba. Las DOS excepciones son las dos puertas del
 * juego —la puja libre y el trato, que llegan con `declaracion: true` y no son un
 * movimiento— y para ellas hay un `montar()` que compone la carga con EXACTAMENTE
 * los campos que la puerta declara (`cabeEnLaPuerta` en `burgo.ts` los cuenta), y
 * devuelve `null` cuando lo pedido no cabe en lo declarado.
 *
 * ═══ CADA MOVIMIENTO SE ENSEÑA EXACTAMENTE UNA VEZ, Y ÉSTA ES LA PARTICIÓN ═══
 *
 * SEIS sitios pueden enseñar una opción, y cada una va a UNO:
 *
 *   · LOS DADOS (`dadosEnTres`): TIRAR. El asa del lienzo.
 *   · LAS CASILLAS TOCABLES (`tableroEnTres` → `tocable`, y `obraPosibleEnCasilla` al
 *     tocar): las obras de esa casilla —comprar, sacar a subasta, alzar, vender,
 *     hipotecar, deshipotecar—. La marca del acento se enciende donde hay algo que hacer.
 *   · EL CARRIL (`carrilDelBurgo`): LOS BOTONES DEL MOMENTO —empezar la partida, pagar la
 *     fianza, usar el Salvoconducto, elegir cómo se paga el Impuesto, pasar el turno,
 *     declararse en quiebra, y en MI APURO vender e hipotecar—, en cuadrados de 44 puntos
 *     colgados de la cinta, a la vista y SIN abrir nada. Es la sección «Ahora» puesta
 *     delante; el porqué está entero en la cabecera de `carrilDelBurgo`.
 *   · LA HOJA (`hojaEnTres`): las pujas fijas y el pasar de la subasta, contestar y
 *     retirar tratos, y —SÓLO CUANDO NO SE PINTA EL CARRIL— los botones del momento. En «Lo
 *     mío» cada título lleva su FICHA con sus obras: son LOS MISMOS objetos que la
 *     casilla tocable abre al tocarla (una sola → se manda; varias → «¿qué haces
 *     aquí?»), así que la obra tiene UN botón, el de la ficha, y un atajo, la casilla.
 *     EN MI APURO esas obras suben a la sección «Ahora» y SALEN de las fichas: siguen
 *     siendo un botón y su atajo, sólo que el botón se muda a donde corre el reloj —y de
 *     ahí al carril, si el carril se pinta, que es la misma mudanza un piso más afuera.
 *   · LA CAJA DE LOS TRATOS (`pregonDelBurgo`): las propuestas vivas que me tocan, con su
 *     aceptar, su rechazar y su retirar, a la vista y sin abrir nada. Cuando se pinta, la
 *     sección «El trato» de la hoja se queda con sus renglones y sin botones: la hoja la
 *     recibe YA COMPUESTA (`hojaEnTres(v, yo, o, pregon, carril)`) y por eso las dos mitades
 *     miran el mismo dato en vez de dos banderas que se pueden separar.
 *   · LOS BOTONES SUELTOS (`opcionesFueraDelTablero`): lo que no cupo en ninguno de
 *     los cinco porque ese objeto no se pintó. Recibe LOS OBJETOS que se pintan —no
 *     interruptores— y se aplica DESPUÉS de componerlos: al revés `porTirar` sería
 *     siempre falso y nadie podría tirar en toda la tarde sin un error en ninguna parte.
 *
 * Y EL ORDEN DE COMPOSICIÓN NO ES LIBRE, porque tres muebles se ceden opciones entre sí:
 *
 *     const pregon = pregonDelBurgo(vista, yo, opciones);        // 1. la caja
 *     const carril = carrilDelBurgo(vista, yo, opciones);        // 2. el carril
 *     const hoja   = hojaEnTres(vista, yo, opciones, pregon, carril);   // 3. la hoja
 *     const sueltas = opcionesFueraDelTablero(opciones, tablero, dados, hoja, pregon, carril);
 *
 * Los dos primeros no dependen de nadie; la hoja suelta «El trato» y «Ahora» según lo que
 * reciba, y la criba va la última porque mira lo que se pintó de verdad. Un cliente que no
 * pinte alguno de los muebles pasa `null` en su hueco, y entonces sus opciones vuelven a la
 * hoja o al pie: un interruptor en lugar del objeto sería un `true` con el mueble sin
 * pintar, o sea un movimiento que no se puede hacer en ninguna parte de la pantalla.
 *
 * Las puertas no se pintan nunca como botón: pulsadas mandan una declaración y lo mejor
 * que puede pasar es que el reductor conteste con un motivo.
 *
 * ═══ Y HAY UN SEXTO SITIO QUE NO ES UN BOTÓN MÁS: EL GEMELO DE SÓLO APOYO ═══
 *
 * Dos movimientos viven en un GESTO sobre el lienzo y no en un botón: tirar (el asa de los
 * dados) y comprar o sacar a subasta (la casilla encendida, que no tiene ficha porque el
 * título todavía no es mío). Un gesto no es alcanzable con teclado ni con lector, así que
 * al lado del lienzo va un gemelo fuera de la vista (`clip-path`, NUNCA `display: none`)
 * que manda por la misma puerta. NO es un segundo botón: es el mismo dicho para quien no
 * puede hacer el gesto, y por eso no entra en la cuenta de la partición.
 * `obrasSoloEnElAnillo` dice a cuáles hay que pintárselo, mirando qué obras enciende el
 * anillo sin que ningún botón las recoja.
 *
 * ═══ POR QUÉ SÓLO SE IMPORTAN TIPOS DE `escenas/`, Y UNA FUNCIÓN ═══
 *
 * `shared/` lo compilan cuatro paquetes y dos de ellos no tienen `three`. Un
 * `import type` se borra al compilar, así que las formas de salida son las de la
 * escena de verdad (`TableroDelBurgoEn3D`, `FiguraEn3D`, `DadosDelBurgoEn3D`) sin
 * arrastrar su código. La única importación de VALOR es `figuraQueSePinta` de
 * `escenas/embarcadero/figuras.ts`, que es dato sin `three` (una tabla de seis
 * aventureros y una suma de caracteres): la figura que se pinta para un asiento se
 * decide en UN sitio, y ese sitio es el que ya usa el Muelle.
 *
 * ═══ LO QUE ACABA DE PASAR VIAJA COMO `jugada` + `sucesos` ═══
 *
 * La vista trae la lista de sucesos del ÚLTIMO cambio con `jugada` como sello. La
 * escena anima lo que hay entre la `jugada` que vio y la que llega (`sucesosEnTres`):
 * si saltó exactamente una, la lista tal cual; si saltó más de una —un sondeo que se
 * perdió una revisión— no se puede reconstruir lo que pasó, y se deriva una lista
 * GRUESA comparando la vista anterior con ésta: un viaje por cada figura que no está
 * donde estaba, un cobro o un pago por cada bolsa que cambió, un cambio de mano por
 * cada título, una quiebra por cada quebrado nuevo. Nunca vacía si cambió algo que se
 * ve, para que la escena no se quede con el mundo viejo.
 *
 * ═══ EL VOCABULARIO ═══
 *
 * Los textos usan SÓLO las palabras del reglamento §0: euros («€»), el Ayuntamiento,
 * solar, barrio, estación, servicio, casa, hotel, hipoteca, subasta, la Comisaría, la
 * Salida, Sucesos, el Fondo Vecinal, «barrio entero», el Salvoconducto, quiebra, apuro.
 * Ninguna marca ajena, ni para decir que no se nombra.
 *
 * ═══ EN QUÉ SE APARTA ESTO DEL §4 DEL DISEÑO, Y POR QUÉ ═══
 *
 * El contrato es `docs/burgo/DISENO.md` §4. Lo que aquí no coincide letra por letra,
 * con su motivo, para que nadie lo tome por descuido:
 *
 *   · `tableroEnTres(v, yo, opciones, asientos = [])` lleva un CUARTO parámetro
 *     opcional: las sillas de la mesa con su figura. El §4 lo da sólo a
 *     `figurasEnTres`; sin él el tablero pintaría siempre la figura de serie y la
 *     escena montaría dos aventureros distintos para el mismo asiento. Sin sillas
 *     vale lo mismo que decía el §4.
 *   · `sucesosEnTres(jugadaVista, v, anterior?)` lleva un TERCER parámetro opcional:
 *     la vista que la escena tenía. La lista gruesa del §4 («un viaje por figura cuya
 *     casilla no cuadra») no se puede derivar sin saber dónde estaba cada figura, y
 *     la vista nueva no lo dice. Sin `anterior` se da la lista del último cambio
 *     cerrada con el relevo, que nunca es vacía en una partida en marcha.
 *   · `dadosEnTres` devuelve `DadosEnTres`, que es `DadosDelBurgoEn3D` más
 *     `movimiento` (la opción de tirar entera, o `null`): es lo que el comentario del
 *     §4 pide, escrito como tipo.
 *   · TIRAR no va en la sección «Ahora» de la hoja aunque §6.3 lo nombre allí: va a
 *     los dados, y cuando no hay dados (mirón, retablo, `.glb` que no llegó) sale por
 *     `opcionesFueraDelTablero`, que es lo que el cliente pinta como botón del
 *     momento. Así «Tirar» tiene UN sitio y el filtro no depende del orden en que se
 *     compongan la hoja y los dados. TAMPOCO VA AL CARRIL, y por lo mismo: el carril no
 *     mira a nadie —esa es toda su gracia, que se puede componer el primero—, y para saber
 *     si hay asa habría que pasarle los dados. Un cliente sin lienzo que quiera darle forma
 *     de cuadrado a ese «Tirar» tiene `glifosDelCarrilDelBurgo`, que pone forma a la lista
 *     que se le dé; lo que no puede es meterlo en el carril del momento, porque entonces el
 *     asa y el cuadrado saldrían a la vez.
 *   · Las obras de MIS títulos salen dos veces a la vista, a sabiendas: como botón en
 *     la ficha de «Lo mío» y como casilla tocable en el anillo (§4 y §6.3 piden las
 *     dos cosas). Son EL MISMO objeto —la ficha y `obraPosibleEnCasilla` devuelven la
 *     opción del juego por identidad— y la partición los cuenta como un botón y su
 *     atajo, no como dos botones. Comprar y sacar a subasta, que no son de un título
 *     mío, sólo tienen la casilla.
 *   · `pujaEnTres` y `tratoEnTres` traen más campos de los que el §4 enumera (nombres,
 *     líneas redactadas, `meToca`, `soyElDestinatario`…): son texto derivado para que
 *     los dos clientes no redacten nada; los campos del §4 están todos y con su nombre.
 */
import type { CasillaEn3D, DadosDelBurgoEn3D, FiguraEn3D, TableroDelBurgoEn3D } from '../../../escenas/burgo/tipos';
import type { ParDeDados } from '../../../escenas/dados';
import { figuraQueSePinta } from '../../../escenas/embarcadero/figuras';
import { casillaTras, distanciaAdelante, recorrido } from '../../mecanicas/anillo';
import { canonico } from '../../mecanicas/canonico';
import type { MovimientoDeclarado } from '../../mecanicas/tablero-declarado';
import type { AsientoId, QuienMira } from '../tipos';
import {
  A_ALMONEDA,
  ACEPTAR,
  ALZAR,
  COLORES_DEL_BURGO,
  COMPRAR,
  DESEMPENAR,
  EMPENAR,
  EMPEZAR,
  maravedies,
  PAGAR_FIANZA,
  PAGAR_IMPUESTO,
  PASAR,
  PASAR_PUJA,
  PROPONER,
  PUJAR,
  RECHAZAR,
  RENDIRSE,
  RETIRAR,
  TIRAR,
  USAR_INDULTO,
  VENDER,
} from './burgo';
import type { PasoDelTurno, SucesoDelBurgo } from './burgo';
import {
  BARRIOS,
  barrioDe,
  carta,
  CASILLAS,
  costeDeDesempeno,
  CUANTAS_CASILLAS,
  INTENTOS_EN_LA_MAZMORRA,
  MULTIPLO_DE_OFICIO,
  PASO_DE_PUJA,
  POSADA,
  RENTA_DE_PUERTA,
  valorDeEmpeno,
} from './burgo-tablero';
import type { BarrioDelBurgo, CasillaDelBurgo, ClaseDeCasilla, MazoId } from './burgo-tablero';

export { maravedies };

// ---------------------------------------------------------------------------
// LO QUE SE LEE DE LA VISTA, declarado por estructura y leído con guarda
// ---------------------------------------------------------------------------

/**
 * La parte de la vista del Burgo que esta traducción EXIGE. Se declara aquí y no se
 * importa `VistaDelBurgo` entera: lo que llega por el cable puede venir de un servidor
 * con otra versión, y lo único garantizado es lo que `esVistaQueSePinta` comprueba.
 * Todo lo demás se lee con guarda y `?? []` / `?? 0` / `?? null` en `leer`: un campo
 * que falte deja un hueco, no un tablero entero sin pintar.
 */
export interface VistaQueSePinta {
  readonly desde: 'burgo';
  readonly momento: string;
  readonly jugadores: readonly unknown[];
  readonly titulos: readonly unknown[];
  readonly jugada: number;
}

/** ¿Es esto una vista del Burgo con lo que hace falta para pintarla? */
export function esVistaQueSePinta(vista: unknown): vista is VistaQueSePinta {
  if (typeof vista !== 'object' || vista === null) return false;
  const v = vista as Record<string, unknown>;
  return (
    v['desde'] === 'burgo' &&
    typeof v['momento'] === 'string' &&
    Array.isArray(v['jugadores']) &&
    Array.isArray(v['titulos']) &&
    typeof v['jugada'] === 'number'
  );
}

/**
 * ¿SE PUEDE ENSEÑAR ESTA MESA EN TRES DIMENSIONES? Es del Burgo y caben sus
 * jugadores en los seis peones. NO mira colores: las piezas se tiñen al cargar a
 * cualquier `#rrggbb`, así que el color del jugador nunca es lo que falta.
 */
export function seVeEnTres(vista: unknown): boolean {
  return esVistaQueSePinta(vista) && vista.jugadores.length <= COLORES_DEL_BURGO.length;
}

/** Un jugador tal como lo lee esta traducción: lo que la vista trae, con huecos rellenos. */
interface JugadorQueSePinta {
  readonly asiento: AsientoId;
  readonly nombre: string;
  readonly color: string;
  readonly casilla: number;
  readonly mrs: number;
  readonly presa: number;
  readonly indultos: number;
  readonly quebrado: boolean;
  readonly vueltas: number;
  readonly titulos: readonly number[];
  readonly patrimonio: number;
}

interface TituloQueSePinta {
  readonly casilla: number;
  readonly dueno: AsientoId | null;
  readonly casas: number;
  readonly empenado: boolean;
  readonly barrioEntero: boolean;
  readonly rentaAhora: number;
}

interface AlmonedaQueSePinta {
  readonly casilla: number;
  readonly puja: number;
  readonly quienPuja: AsientoId | null;
  readonly pujaDe: AsientoId | null;
  readonly enPie: readonly AsientoId[];
  readonly abiertaPor: AsientoId | null;
  readonly enCola: number;
}

interface DeudaQueSePinta {
  readonly a: AsientoId | null;
  readonly cuanto: number;
  readonly porque: string;
}

interface ApuroQueSePinta {
  readonly quien: AsientoId | null;
  readonly deudas: readonly DeudaQueSePinta[];
  readonly debe: number;
  readonly enCola: number;
}

/** Un lado de un trato. Todo público. */
export interface LadoQueSePinta {
  readonly mrs: number;
  readonly titulos: readonly number[];
  readonly indultos: number;
}

interface TratoQueSePinta {
  readonly id: number;
  readonly de: AsientoId;
  readonly a: AsientoId;
  readonly doy: LadoQueSePinta;
  readonly pido: LadoQueSePinta;
  readonly enElTurno: number;
}

interface CartaQueSePinta {
  readonly mazo: MazoId;
  readonly carta: number;
  readonly quien: AsientoId | null;
  readonly enElTurno: number;
}

/** La vista entera, leída una vez y con todos los huecos rellenos. */
interface Lectura {
  readonly momento: 'reuniendo' | 'jugando' | 'terminada';
  readonly paso: PasoDelTurno;
  readonly turnoDe: AsientoId | null;
  readonly duenoDelTurno: AsientoId | null;
  readonly yo: AsientoId | null;
  readonly jugadores: readonly JugadorQueSePinta[];
  readonly titulos: readonly TituloQueSePinta[];
  readonly concejo: { readonly casas: number; readonly posadas: number };
  readonly quedan: { readonly pregon: number; readonly arca: number };
  /** El par, o `null` si no se ha tirado. */
  readonly tirada: ParDeDados | null;
  /** La vista traía algo en `tirada` que NO es un par de enteros: los dados no se pintan. */
  readonly tiradaMalFormada: boolean;
  readonly tiradasDelTurno: number;
  readonly turnosAbiertos: number;
  readonly dobles: number;
  readonly ultimaCarta: CartaQueSePinta | null;
  readonly almoneda: AlmonedaQueSePinta | null;
  readonly apuro: ApuroQueSePinta | null;
  readonly tratos: readonly TratoQueSePinta[];
  readonly topeDeVueltas: number;
  readonly jugada: number;
  readonly sucesos: readonly SucesoDelBurgo[];
  readonly ganadores: readonly AsientoId[];
  readonly pregon: string;
  readonly aviso: string;
}

function objeto(x: unknown): Record<string, unknown> | null {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return null;
  return x as Record<string, unknown>;
}

function entero(x: unknown, porDefecto: number): number {
  return typeof x === 'number' && Number.isFinite(x) ? Math.trunc(x) : porDefecto;
}

function cadena(x: unknown): string {
  return typeof x === 'string' ? x : '';
}

function asiento(x: unknown): AsientoId | null {
  return typeof x === 'string' && x.length > 0 ? x : null;
}

function listaDeCadenas(x: unknown): string[] {
  const salida: string[] = [];
  if (!Array.isArray(x)) return salida;
  for (const v of x) if (typeof v === 'string') salida.push(v);
  return salida;
}

function listaDeEnteros(x: unknown): number[] {
  const salida: number[] = [];
  if (!Array.isArray(x)) return salida;
  for (const v of x) if (typeof v === 'number' && Number.isInteger(v)) salida.push(v);
  return salida;
}

function esParDeDados(x: unknown): x is ParDeDados {
  return (
    Array.isArray(x) &&
    x.length === 2 &&
    typeof x[0] === 'number' &&
    typeof x[1] === 'number' &&
    Number.isInteger(x[0]) &&
    Number.isInteger(x[1]) &&
    x[0] >= 1 &&
    x[0] <= 6 &&
    x[1] >= 1 &&
    x[1] <= 6
  );
}

function ladoDe(x: unknown): LadoQueSePinta {
  const o = objeto(x);
  return {
    mrs: o === null ? 0 : entero(o['mrs'], 0),
    titulos: o === null ? [] : listaDeEnteros(o['titulos']),
    indultos: o === null ? 0 : entero(o['indultos'], 0),
  };
}

function jugadorDe(x: unknown): JugadorQueSePinta | null {
  const o = objeto(x);
  if (o === null) return null;
  const quien = asiento(o['asiento']);
  if (quien === null) return null;
  return {
    asiento: quien,
    nombre: cadena(o['nombre']),
    color: cadena(o['color']),
    casilla: entero(o['casilla'], 0),
    mrs: entero(o['mrs'], 0),
    presa: entero(o['presa'], -1),
    indultos: entero(o['indultos'], 0),
    quebrado: o['quebrado'] === true,
    vueltas: entero(o['vueltas'], 0),
    titulos: listaDeEnteros(o['titulos']),
    patrimonio: entero(o['patrimonio'], 0),
  };
}

function tituloDe(x: unknown): TituloQueSePinta | null {
  const o = objeto(x);
  if (o === null) return null;
  const casilla = entero(o['casilla'], -1);
  if (casilla < 0 || casilla >= CUANTAS_CASILLAS) return null;
  return {
    casilla,
    dueno: asiento(o['dueno']),
    casas: entero(o['casas'], 0),
    empenado: o['empenado'] === true,
    barrioEntero: o['barrioEntero'] === true,
    rentaAhora: entero(o['rentaAhora'], 0),
  };
}

function esSuceso(x: unknown): x is SucesoDelBurgo {
  const o = objeto(x);
  return o !== null && typeof o['que'] === 'string';
}

/** La vista leída entera, o `null` si no es del Burgo. Se llama UNA vez por función. */
function leer(vista: unknown): Lectura | null {
  if (!esVistaQueSePinta(vista)) return null;
  const v = vista as unknown as Record<string, unknown>;
  const jugadores: JugadorQueSePinta[] = [];
  for (const x of vista.jugadores) {
    const j = jugadorDe(x);
    if (j !== null) jugadores.push(j);
  }
  const titulos: TituloQueSePinta[] = [];
  for (const x of vista.titulos) {
    const t = tituloDe(x);
    if (t !== null) titulos.push(t);
  }
  const momento = vista.momento === 'jugando' || vista.momento === 'terminada' ? vista.momento : 'reuniendo';
  const crudoPaso = v['paso'];
  const paso: PasoDelTurno =
    crudoPaso === 'comprar' || crudoPaso === 'almoneda' || crudoPaso === 'apuro' || crudoPaso === 'por-pasar' ? crudoPaso : 'por-tirar';
  const concejo = objeto(v['concejo']);
  const quedan = objeto(v['quedan']);
  const crudaTirada = v['tirada'];
  const tirada = esParDeDados(crudaTirada) ? ([crudaTirada[0], crudaTirada[1]] as const) : null;
  const tiradaMalFormada = crudaTirada !== null && crudaTirada !== undefined && tirada === null;
  const ultima = objeto(v['ultimaCarta']);
  const ultimaCarta: CartaQueSePinta | null =
    ultima === null || (ultima['mazo'] !== 'pregon' && ultima['mazo'] !== 'arca')
      ? null
      : {
          mazo: ultima['mazo'] as MazoId,
          carta: entero(ultima['carta'], 0),
          quien: asiento(ultima['quien']),
          enElTurno: entero(ultima['enElTurno'], -1),
        };
  const a = objeto(v['almoneda']);
  const almoneda: AlmonedaQueSePinta | null =
    a === null
      ? null
      : {
          casilla: entero(a['casilla'], 0),
          puja: entero(a['puja'], 0),
          quienPuja: asiento(a['quienPuja']),
          pujaDe: asiento(a['pujaDe']),
          enPie: listaDeCadenas(a['enPie']),
          abiertaPor: asiento(a['abiertaPor']),
          enCola: entero(a['enCola'], 0),
        };
  const ap = objeto(v['apuro']);
  const deudas: DeudaQueSePinta[] = [];
  if (ap !== null && Array.isArray(ap['deudas'])) {
    for (const d of ap['deudas']) {
      const o = objeto(d);
      if (o !== null) deudas.push({ a: asiento(o['a']), cuanto: entero(o['cuanto'], 0), porque: cadena(o['porque']) });
    }
  }
  const apuro: ApuroQueSePinta | null =
    ap === null ? null : { quien: asiento(ap['quien']), deudas, debe: entero(ap['debe'], 0), enCola: entero(ap['enCola'], 0) };
  const tratos: TratoQueSePinta[] = [];
  if (Array.isArray(v['tratos'])) {
    for (const x of v['tratos']) {
      const o = objeto(x);
      if (o === null) continue;
      const de = asiento(o['de']);
      const para = asiento(o['a']);
      if (de === null || para === null) continue;
      tratos.push({
        id: entero(o['id'], 0),
        de,
        a: para,
        doy: ladoDe(o['doy']),
        pido: ladoDe(o['pido']),
        enElTurno: entero(o['enElTurno'], 0),
      });
    }
  }
  /*
   * La lista de sucesos se devuelve POR IDENTIDAD cuando viene bien formada: la
   * escena compara `sucesosEnTres(...) === vista.sucesos` para saber si hay algo
   * nuevo sin recorrerla, y una copia igual sería «otra lista» en cada sondeo.
   * Sólo se filtra si algún elemento no es un suceso.
   */
  const crudos = v['sucesos'];
  let sucesos: readonly SucesoDelBurgo[] = [];
  if (Array.isArray(crudos)) {
    let sanos = true;
    for (const s of crudos) if (!esSuceso(s)) sanos = false;
    if (sanos) sucesos = crudos as readonly SucesoDelBurgo[];
    else {
      const filtrados: SucesoDelBurgo[] = [];
      for (const s of crudos) if (esSuceso(s)) filtrados.push(s);
      sucesos = filtrados;
    }
  }
  return {
    momento,
    paso,
    turnoDe: asiento(v['turnoDe']),
    duenoDelTurno: asiento(v['duenoDelTurno']),
    yo: asiento(v['yo']),
    jugadores,
    titulos,
    concejo: { casas: concejo === null ? 0 : entero(concejo['casas'], 0), posadas: concejo === null ? 0 : entero(concejo['posadas'], 0) },
    quedan: { pregon: quedan === null ? 0 : entero(quedan['pregon'], 0), arca: quedan === null ? 0 : entero(quedan['arca'], 0) },
    tirada,
    tiradaMalFormada,
    tiradasDelTurno: entero(v['tiradasDelTurno'], 0),
    turnosAbiertos: entero(v['turnosAbiertos'], 0),
    dobles: entero(v['dobles'], 0),
    ultimaCarta,
    almoneda,
    apuro,
    tratos,
    topeDeVueltas: entero(v['topeDeVueltas'], 0),
    jugada: vista.jugada,
    sucesos,
    ganadores: listaDeCadenas(v['ganadores']),
    pregon: cadena(v['pregon']),
    aviso: cadena(v['aviso']),
  };
}

function jugadorEn(l: Lectura, quien: AsientoId | null): JugadorQueSePinta | null {
  if (quien === null) return null;
  for (const j of l.jugadores) if (j.asiento === quien) return j;
  return null;
}

function tituloEn(l: Lectura, casilla: number): TituloQueSePinta | null {
  for (const t of l.titulos) if (t.casilla === casilla) return t;
  return null;
}

function filaDe(casilla: number): CasillaDelBurgo | null {
  const fila = CASILLAS[casilla];
  return fila === undefined ? null : fila;
}

/** Cómo se llama un asiento SEGÚN LA VISTA: su nombre, o el id si no consta; «el Ayuntamiento» para `null`. */
function nombreDe(l: Lectura, quien: AsientoId | null): string {
  if (quien === null) return 'el Ayuntamiento';
  const j = jugadorEn(l, quien);
  return j === null || j.nombre.length === 0 ? quien : j.nombre;
}

function nombreDeCasilla(casilla: number): string {
  const fila = filaDe(casilla);
  return fila === null ? `la casilla ${casilla}` : fila.nombre;
}

// ---------------------------------------------------------------------------
// LAS OPCIONES, tal como llegan por el cable
// ---------------------------------------------------------------------------

/** La forma mínima de una opción tal como llega por el cable. Ver `Opcion` en `shared/arcade/opciones.ts`. */
export interface OpcionQueLlega {
  readonly id: string;
  readonly tipo: string;
  readonly carga: unknown;
  readonly rotulo: string;
  readonly ayuda: string;
  /** LA MARCA DEL NÚCLEO: esto NO es un movimiento montado, es una DECLARACIÓN. Nunca se manda. */
  readonly declaracion?: true;
}

/** Las obras de una casilla: lo que se toca EN el anillo. Ninguna otra opción lleva casilla que se toque. */
const OBRAS: readonly string[] = [COMPRAR, A_ALMONEDA, ALZAR, VENDER, EMPENAR, DESEMPENAR];

function esObra(tipo: string): boolean {
  return OBRAS.indexOf(tipo) >= 0;
}

/** `carga.casilla`, si es una casilla del anillo. */
function casillaDeLaCarga(carga: unknown): number | null {
  const o = objeto(carga);
  if (o === null) return null;
  const c = o['casilla'];
  return typeof c === 'number' && Number.isInteger(c) && c >= 0 && c < CUANTAS_CASILLAS ? c : null;
}

function esPuerta(o: OpcionQueLlega): boolean {
  return o.declaracion === true;
}

/** La firma canónica de lo que se mandaría: es lo que compara el portillo. */
function firmaDeLaOpcion(o: OpcionQueLlega): string {
  try {
    return canonico({ tipo: o.tipo, carga: o.carga ?? null });
  } catch {
    return `${o.tipo}:${o.id}`;
  }
}

/** Las obras que `quien` puede hacer en ESA casilla, enteras. `[]` para un mirón. */
export function obraPosibleEnCasilla<O extends OpcionQueLlega>(
  vista: unknown,
  yo: QuienMira,
  opciones: readonly O[],
  casilla: number,
): readonly O[] {
  if (!esVistaQueSePinta(vista) || yo === null) return [];
  return opciones.filter((o) => !esPuerta(o) && esObra(o.tipo) && casillaDeLaCarga(o.carga) === casilla);
}

/**
 * LA OPCIÓN DE TIRAR, entera, o `null` si el juego no la ofrece ahora. Por TIPO, nunca
 * por id: el id `tirar` es el mismo para «tirar», «volver a tirar» y «probar con los
 * dados», y lo que la máquina de los dados manda es el movimiento.
 */
export function tirarEnTres<O extends OpcionQueLlega>(opciones: readonly O[]): O | null {
  for (const o of opciones) if (o.tipo === TIRAR && !esPuerta(o)) return o;
  return null;
}

// ---------------------------------------------------------------------------
// EL TABLERO: cuarenta casillas, las figuras, y su firma
// ---------------------------------------------------------------------------

/** El color de la acera de un solar, o `null`. */
function colorDelBarrioDe(fila: CasillaDelBurgo): string | null {
  const barrio = barrioDe(fila.indice);
  return fila.clase === 'solar' && barrio !== null ? barrio.color : null;
}

function claseEn3D(clase: ClaseDeCasilla): CasillaEn3D['clase'] {
  return clase;
}

/** ¿La última carta es de ESTE turno? Sólo entonces se enseña. */
function cartaVigente(l: Lectura): CartaQueSePinta | null {
  const c = l.ultimaCarta;
  if (c === null || l.momento !== 'jugando') return null;
  if (c.enElTurno !== l.turnosAbiertos) return null;
  return carta(c.mazo, c.carta) === null ? null : c;
}

/**
 * DE QUÉ CASILLA SALIÓ LA CARTA: la de Sucesos o la del Fondo Vecinal que pisa quien la sacó, o
 * la última de ese mazo que dejó atrás si la carta le movió. La vista no guarda dónde
 * se robó; esto es lo más cerca que se puede estar sin inventar.
 */
function casillaDeLaCarta(l: Lectura, c: CartaQueSePinta): number {
  const j = jugadorEn(l, c.quien);
  const desde = j === null ? 0 : j.casilla;
  for (let k = 0; k < CUANTAS_CASILLAS; k++) {
    const i = casillaTras(desde, -k, CUANTAS_CASILLAS);
    const fila = filaDe(i);
    if (fila !== null && fila.clase === c.mazo) return i;
  }
  return desde;
}

function figurasDe(l: Lectura, asientos: readonly { readonly id: string; readonly figura?: string }[]): FiguraEn3D[] {
  const figuras: FiguraEn3D[] = [];
  for (const j of l.jugadores) {
    let elegida: string | undefined;
    for (const a of asientos) if (a.id === j.asiento) elegida = a.figura;
    figuras.push({
      asiento: j.asiento,
      color: j.color,
      figura: figuraQueSePinta(j.asiento, elegida),
      casilla: j.casilla,
      presa: j.presa >= 0,
      quebrada: j.quebrado,
      esLocal: l.yo !== null && j.asiento === l.yo,
      leToca: l.turnoDe !== null && j.asiento === l.turnoDe,
    });
  }
  return figuras;
}

/**
 * LAS FIGURAS DE LA MESA, en orden de asiento: el aventurero de cada uno es
 * `figuraQueSePinta(id, figura)`, con la figura que el asiento eligió en el Muelle si
 * llega por `asientos` (viene con la mesa, no con la vista) y la de serie si no.
 */
export function figurasEnTres(
  vista: unknown,
  asientos: readonly { readonly id: string; readonly figura?: string }[],
): readonly FiguraEn3D[] {
  const l = leer(vista);
  return l === null ? [] : figurasDe(l, asientos);
}

/**
 * EL TABLERO tal como lo pinta la escena, o `null` si esta vista no se ve en tres.
 *
 * `tocable` sale de las opciones —hay una obra en esa casilla— y de nada más;
 * `dueno` es el COLOR del dueño (la escena tiñe banderas, no sabe de asientos);
 * `destacada` es la casilla de quien tiene el turno de verdad. `asientos` es
 * opcional y trae la figura elegida de cada silla (§4 no lo listaba: sin él, las
 * figuras son las de serie, y `figurasEnTres` da las mismas).
 */
export function tableroEnTres<O extends OpcionQueLlega>(
  vista: unknown,
  yo: QuienMira,
  opciones: readonly O[],
  asientos: readonly { readonly id: string; readonly figura?: string }[] = [],
): TableroDelBurgoEn3D | null {
  const l = leer(vista);
  if (l === null || !seVeEnTres(vista)) return null;
  const casillas: CasillaEn3D[] = [];
  for (let i = 0; i < CUANTAS_CASILLAS; i++) {
    const fila = filaDe(i);
    if (fila === null) continue;
    const t = tituloEn(l, i);
    const dueno = t === null ? null : jugadorEn(l, t.dueno);
    casillas.push({
      indice: i,
      clase: claseEn3D(fila.clase),
      colorDelBarrio: colorDelBarrioDe(fila),
      dueno: dueno === null ? null : dueno.color,
      casas: t === null ? 0 : t.casas,
      empenada: t !== null && t.empenado,
      enAlmoneda: l.almoneda !== null && l.almoneda.casilla === i,
      tocable: obraPosibleEnCasilla(vista, yo, opciones, i).length > 0,
    });
  }
  const delTurno = jugadorEn(l, l.duenoDelTurno);
  const vigente = cartaVigente(l);
  const primerTrato = l.tratos.length > 0 ? l.tratos[0] : undefined;
  return {
    casillas,
    figuras: figurasDe(l, asientos),
    destacada: delTurno === null ? null : delTurno.casilla,
    almoneda: l.almoneda === null ? null : l.almoneda.casilla,
    /*
     * `jugada` de la carta: la vista no dice en qué jugada salió, y una jugada que
     * cambiara entre sondeos haría un tirón por revisión. Lo estable que la vista SÍ
     * publica es el turno en que salió (`enElTurno`), que es único por carta enseñada.
     */
    carta: vigente === null ? null : { mazo: vigente.mazo, enCasilla: casillaDeLaCarta(l, vigente), jugada: vigente.enElTurno },
    trato: primerTrato === undefined ? null : { de: primerTrato.de, a: primerTrato.a },
    ganador: l.momento === 'terminada' && l.ganadores.length > 0 ? (l.ganadores[0] as AsientoId) : null,
  };
}

/**
 * LA FIRMA DEL TABLERO: cambia si y sólo si cambia algo que la escena pinta. Cada
 * respuesta del sondeo es una vista NUEVA; sin esto, derivar por identidad
 * reconstruiría el mundo cada pocos segundos (trampa del tirón, medida en Riberas).
 * El cliente devuelve LA MISMA lista si la firma no cambió.
 */
export function firmaDelTablero(t: TableroDelBurgoEn3D): string {
  const trozos: string[] = [];
  for (const c of t.casillas) {
    trozos.push(`${c.indice}:${c.dueno ?? '-'}:${c.casas}:${c.empenada ? 'e' : ''}:${c.enAlmoneda ? 'a' : ''}:${c.tocable ? 't' : ''}`);
  }
  for (const f of t.figuras) {
    trozos.push(
      `${f.asiento}:${f.color}:${f.figura}:${f.casilla}:${f.presa ? 'p' : ''}:${f.quebrada ? 'q' : ''}:${f.esLocal ? 'l' : ''}:${f.leToca ? 'x' : ''}`,
    );
  }
  trozos.push(`d${t.destacada ?? '-'}`);
  trozos.push(`a${t.almoneda ?? '-'}`);
  trozos.push(t.carta === null ? 'c-' : `c${t.carta.mazo}:${t.carta.enCasilla}:${t.carta.jugada}`);
  trozos.push(t.trato === null ? 't-' : `t${t.trato.de}>${t.trato.a}`);
  trozos.push(`g${t.ganador ?? '-'}`);
  return trozos.join('|');
}

// ---------------------------------------------------------------------------
// LOS SUCESOS: lo que la escena anima entre la jugada que vio y la que llega
// ---------------------------------------------------------------------------

/**
 * LO QUE HAY QUE ANIMAR. `[]` si no hay nada nuevo; la lista de la vista si saltó
 * exactamente una jugada; y si saltó más de una, una lista GRUESA derivada de
 * comparar la vista `anterior` (la que la escena tenía) con ésta. Sin `anterior`
 * no hay con qué comparar: se da la lista del último cambio y, detrás, el relevo,
 * para que nunca salga vacía en una partida en marcha.
 */
export function sucesosEnTres(jugadaVista: number, vista: unknown, anterior?: unknown): readonly SucesoDelBurgo[] {
  const l = leer(vista);
  if (l === null) return [];
  if (l.jugada <= jugadaVista) return [];
  if (l.jugada === jugadaVista + 1) return l.sucesos;
  const antes = leer(anterior);
  if (antes === null) return conElRelevo(l, l.sucesos);
  return conElRelevo(l, sucesosGruesos(antes, l));
}

/** Añade el `turno` (y el `fin`) al final si la lista no los trae, para que nunca vaya vacía. */
function conElRelevo(l: Lectura, base: readonly SucesoDelBurgo[]): SucesoDelBurgo[] {
  const salida = [...base];
  if (l.momento === 'terminada' && !salida.some((s) => s.que === 'fin')) {
    salida.push({ que: 'fin', ganadores: l.ganadores, porque: 'ultimo-en-pie' });
  } else if (l.momento === 'jugando' && l.turnoDe !== null && !salida.some((s) => s.que === 'turno')) {
    salida.push({ que: 'turno', de: l.turnoDe });
  }
  return salida;
}

/**
 * LA LISTA GRUESA: lo que cambió a la vista entre dos lecturas, sin saber cómo. Un
 * `mueve` por figura que no está donde estaba (`viaja`: la escena la lleva sin
 * pisar casillas), un `cobra` o `paga` con el Ayuntamiento por bolsa que cambió, un
 * `cambia-de-mano` por título con otro dueño, `alza`/`vende` por casas, `empena`/
 * `desempena`, `a-la-mazmorra`/`sale-de-la-mazmorra` por presa, `quiebra` por
 * quebrado nuevo, y los tratos que aparecieron o se fueron.
 */
function sucesosGruesos(antes: Lectura, ahora: Lectura): SucesoDelBurgo[] {
  const salida: SucesoDelBurgo[] = [];
  for (const j of ahora.jugadores) {
    const viejo = jugadorEn(antes, j.asiento);
    if (viejo === null) continue;
    if (!viejo.quebrado && j.quebrado) {
      salida.push({ que: 'quiebra', quien: j.asiento, acreedor: null });
      continue;
    }
    if (viejo.presa < 0 && j.presa >= 0) {
      salida.push({ que: 'a-la-mazmorra', quien: j.asiento, desde: viejo.casilla, porque: 'casilla' });
    } else if (viejo.presa >= 0 && j.presa < 0) {
      salida.push({ que: 'sale-de-la-mazmorra', quien: j.asiento, como: 'dobles' });
    }
    if (viejo.casilla !== j.casilla && j.presa < 0) {
      const pasos = distanciaAdelante(viejo.casilla, j.casilla, CUANTAS_CASILLAS);
      salida.push({
        que: 'mueve',
        quien: j.asiento,
        desde: viejo.casilla,
        hasta: j.casilla,
        recorrido: recorrido(viejo.casilla, pasos, CUANTAS_CASILLAS),
        porLaPuertaMayor: j.vueltas > viejo.vueltas,
        como: 'viaja',
      });
    }
    if (j.mrs > viejo.mrs) {
      salida.push({ que: 'cobra', quien: j.asiento, de: null, cuanto: j.mrs - viejo.mrs, porque: 'carta', casilla: j.casilla });
    } else if (j.mrs < viejo.mrs) {
      salida.push({ que: 'paga', quien: j.asiento, a: null, cuanto: viejo.mrs - j.mrs, porque: 'carta', casilla: j.casilla });
    }
  }
  for (const t of ahora.titulos) {
    const viejo = tituloEn(antes, t.casilla);
    if (viejo === null) continue;
    if (viejo.dueno !== t.dueno) salida.push({ que: 'cambia-de-mano', casilla: t.casilla, de: viejo.dueno, a: t.dueno });
    if (t.dueno !== null && t.casas > viejo.casas) salida.push({ que: 'alza', quien: t.dueno, casilla: t.casilla, casas: t.casas });
    if (viejo.dueno !== null && t.casas < viejo.casas) salida.push({ que: 'vende', quien: viejo.dueno, casilla: t.casilla, casas: t.casas });
    if (t.dueno !== null && !viejo.empenado && t.empenado) salida.push({ que: 'empena', quien: t.dueno, casilla: t.casilla });
    if (t.dueno !== null && viejo.empenado && !t.empenado) salida.push({ que: 'desempena', quien: t.dueno, casilla: t.casilla });
  }
  if (antes.almoneda === null && ahora.almoneda !== null) salida.push({ que: 'almoneda-abierta', casilla: ahora.almoneda.casilla });
  if (antes.almoneda !== null && ahora.almoneda === null) {
    salida.push({ que: 'almoneda-cerrada', casilla: antes.almoneda.casilla, ganador: null, cuanto: 0 });
  }
  for (const t of ahora.tratos) {
    if (!antes.tratos.some((x) => x.id === t.id)) salida.push({ que: 'trato', id: t.id, de: t.de, a: t.a, fin: 'propuesto' });
  }
  for (const t of antes.tratos) {
    if (!ahora.tratos.some((x) => x.id === t.id)) salida.push({ que: 'trato', id: t.id, de: t.de, a: t.a, fin: 'caducado' });
  }
  const vigente = cartaVigente(ahora);
  const vigenteAntes = cartaVigente(antes);
  if (vigente !== null && vigente.quien !== null && (vigenteAntes === null || vigenteAntes.carta !== vigente.carta || vigenteAntes.mazo !== vigente.mazo)) {
    salida.push({ que: 'carta', quien: vigente.quien, mazo: vigente.mazo, carta: vigente.carta });
  }
  if (ahora.apuro !== null && ahora.apuro.quien !== null && (antes.apuro === null || antes.apuro.quien !== ahora.apuro.quien)) {
    salida.push({ que: 'apuro', quien: ahora.apuro.quien, debe: ahora.apuro.debe });
  }
  return salida;
}

/**
 * LAS PISADAS de un `mueve`, en orden y con la última: las que el suceso trae, o —si
 * llegó sin ellas— las del anillo entre `desde` y `hasta`, hacia atrás si retrocede.
 */
export function recorridoEnTres(s: SucesoDelBurgo & { readonly que: 'mueve' }): readonly number[] {
  if (Array.isArray(s.recorrido) && s.recorrido.length > 0) return s.recorrido;
  if (s.como === 'retrocede') {
    const pasos = distanciaAdelante(s.hasta, s.desde, CUANTAS_CASILLAS);
    return recorrido(s.desde, -pasos, CUANTAS_CASILLAS);
  }
  return recorrido(s.desde, distanciaAdelante(s.desde, s.hasta, CUANTAS_CASILLAS), CUANTAS_CASILLAS);
}

/** A QUIÉN SIGUE LA CÁMARA: quien mueve en los sucesos de esta jugada; si nadie, a quien se espera. */
export function camaraSigueA(vista: unknown): AsientoId | null {
  const l = leer(vista);
  if (l === null) return null;
  let quien: AsientoId | null = null;
  for (const s of l.sucesos) {
    if (s.que === 'mueve' || s.que === 'a-la-mazmorra' || s.que === 'sale-de-la-mazmorra') quien = s.quien;
  }
  return quien ?? l.turnoDe;
}

// ---------------------------------------------------------------------------
// LOS DADOS: el PAR, nunca inventado
// ---------------------------------------------------------------------------

/** Los dados de la mesa, más la opción de tirar entera para que el asa la mande tal cual. */
export interface DadosEnTres<O extends OpcionQueLlega = OpcionQueLlega> extends DadosDelBurgoEn3D {
  readonly movimiento: O | null;
}

/** Cuántos turnos caben en el sello antes de que dos tiradas de turnos distintos coincidan. Nunca hay cien tiradas en un turno. */
const TIRADAS_POR_TURNO_EN_EL_SELLO = 100;

/**
 * LOS DADOS tal como los pinta la escena, o `null` donde no hay dados: un mirón, una
 * vista que no es del Burgo, una mesa que se reúne o ya acabó, o una `tirada` que no
 * es un par de enteros (la máquina no inventa el par: los dobles son regla).
 *
 * `tirado` es «ya se tiró en este paso» (`paso !== 'por-tirar'`), `sello` cambia con
 * cada tirada y con cada relevo, `porTirar` sale de la lista de opciones —no de rehacer
 * la regla— y `delanteDe` es el peón delante del que ruedan en el sorteo de salida.
 * Recibe las opciones ENTERAS, antes de ningún filtro: al revés `porTirar` sería
 * siempre falso.
 */
export function dadosEnTres<O extends OpcionQueLlega>(vista: unknown, yo: QuienMira, opciones: readonly O[]): DadosEnTres<O> | null {
  const l = leer(vista);
  if (l === null || yo === null || !seVeEnTres(vista)) return null;
  if (l.momento !== 'jugando' || l.tiradaMalFormada) return null;
  const movimiento = l.yo === yo ? tirarEnTres(opciones) : null;
  let delanteDe: AsientoId | null = null;
  let haySorteo = false;
  let hayTirada = false;
  for (const s of l.sucesos) {
    if (s.que === 'sale') haySorteo = true;
    if (s.que === 'tira') hayTirada = true;
    if (s.que === 'empieza') delanteDe = s.quien;
  }
  return {
    par: l.tirada,
    tirado: l.paso !== 'por-tirar',
    sello: l.tiradasDelTurno + TIRADAS_POR_TURNO_EN_EL_SELLO * l.turnosAbiertos,
    porTirar: movimiento !== null,
    delanteDe: haySorteo && !hayTirada ? delanteDe : null,
    movimiento,
  };
}

// ---------------------------------------------------------------------------
// LA FICHA DE UNA CASILLA
// ---------------------------------------------------------------------------

/** Una fila de la tabla de rentas de la ficha. `actual` es la que se cobra hoy. */
export interface RenglonDeRenta {
  readonly rotulo: string;
  readonly cuanto: number;
  readonly actual: boolean;
}

export interface DuenoVisto {
  readonly asiento: AsientoId;
  readonly nombre: string;
  readonly color: string;
}

/** Un solar del barrio de una casilla, con quién lo tiene: lo que se mira antes de comprar. */
export interface SolarDelBarrio {
  readonly casilla: number;
  readonly nombre: string;
  /** El rótulo de seis letras que lleva pintada la cara. */
  readonly rotulo: string;
  readonly dueno: DuenoVisto | null;
  readonly casas: number;
  readonly empenado: boolean;
  /** Es la casilla de la que se está leyendo la ficha. */
  readonly esEsta: boolean;
}

/** ¿Esta clase de casilla tiene título —se compra, se hipoteca y cobra renta—? */
function esTitulo(clase: ClaseDeCasilla): boolean {
  return clase === 'solar' || clase === 'puerta' || clase === 'oficio';
}

/** La ficha de una casilla: lo que se lee al tocarla en el lienzo o en «Lo mío». */
export interface FichaDeCasilla<O extends OpcionQueLlega = OpcionQueLlega> {
  readonly casilla: number;
  readonly nombre: string;
  readonly rotulo: string;
  readonly clase: ClaseDeCasilla;
  readonly barrio: { readonly id: string; readonly nombre: string; readonly color: string } | null;
  readonly precio: number;
  /** El precio de la casa del barrio; 0 fuera de los solares. */
  readonly casa: number;
  readonly rentas: readonly RenglonDeRenta[];
  readonly dueno: DuenoVisto | null;
  /** «Del Ayuntamiento», «Hipotecado», «En subasta», «Barrio entero», «Hotel», «Tuyo»… */
  readonly estado: string;
  readonly casas: number;
  readonly esPosada: boolean;
  readonly empenado: boolean;
  readonly enAlmoneda: boolean;
  readonly barrioEntero: boolean;
  readonly rentaAhora: number;
  /** Lo que da hipotecarlo y lo que cuesta deshipotecarlo, por tabla. 0 si no se compra. */
  readonly empeno: number;
  readonly desempeno: number;
  readonly esMio: boolean;
  /** Se compra: tiene título, hipoteca y renta. Fuera de esto, `precio` es lo que la casilla cobra. */
  readonly seCompra: boolean;
  /**
   * LA FRASE DEL CARTEL AL PIE, la MISMA que `cartelDeCasilla` da al posarse encima. Va
   * aquí para que la tarjeta y el cartel no puedan discrepar: son dos muebles que dicen lo
   * mismo de la misma casilla, y redactarlo dos veces es cómo empiezan a decir cosas
   * distintas el día que alguien retoque uno.
   */
  readonly cartel: string;
  /**
   * LOS SOLARES DEL BARRIO, con quién tiene cada uno; `[]` fuera de los solares. Sin esto,
   * la tarjeta de una casilla AJENA no dice lo único que se mira antes de comprarla —cuánto
   * le falta a alguien para el barrio entero—, y el cliente tendría que recontar los títulos
   * de la vista, que es exactamente la segunda cuenta que este fichero existe para evitar.
   */
  readonly solaresDelBarrio: readonly SolarDelBarrio[];
  /** Las líneas de la tarjeta, redactadas. La tabla de rentas NO va aquí: va en `rentas`, fila a fila. */
  readonly lineas: readonly string[];
  /** TODAS sus opciones, enteras: las mismas que la casilla tocable abre. */
  readonly opciones: readonly O[];
}

/**
 * ═══ EL CARTEL AL PIE: LO QUE DICE UNA CASILLA SIN QUE SE ABRA NADA ═══
 *
 * ═══ EL FALLO ═══
 *
 * Para saber de quién es una casilla y cuánto cobra HOY había que TOCARLA, y tocarla abre
 * un modal con su tarjeta entera: una decisión de compra, un cálculo de a cuánto sale caer
 * en la acera de enfrente y una mirada al barrio ajeno son veinte aperturas por turno, cada
 * una con su trampa de foco, su velo y su cierre. Lo que se quiere leer son dos renglones.
 *
 * ═══ POR QUÉ ESTO NO RECIBE LAS OPCIONES, Y NO ES UN OLVIDO ═══
 *
 * Un cartel aparece al posar el cursor y se va solo. Un botón dentro de algo que se va solo
 * es un botón que no se puede pulsar —el cursor tiene que salir del cuadrado para llegar a
 * él, y al salir el cartel desaparece— y con el dedo no existe siquiera. Así que aquí no
 * entra ni una opción: para obrar está la casilla del anillo, y su tarjeta entera está en
 * `fichaDeCasilla`. Además, no recibir opciones es lo que deja esta función FUERA de la
 * partición: no pinta ningún movimiento, así que no puede repetir ninguno.
 *
 * ═══ Y NO RECIBE `yo`: «MÍO» ES LO QUE DICE LA VISTA ═══
 *
 * La vista se proyecta PARA alguien y ella misma dice quién es (`yo`). Un segundo `yo` por
 * parámetro sería un sitio donde el cartel podría decir «Tuyo» de un título ajeno; con uno
 * solo eso no se puede escribir.
 */
export interface CartelDeCasilla {
  readonly casilla: number;
  readonly nombre: string;
  /** El rótulo de seis letras de la cara del retablo. */
  readonly rotulo: string;
  readonly clase: ClaseDeCasilla;
  /** El color de la acera del barrio, o `null` fuera de los solares. */
  readonly color: string | null;
  /** El color de quien la tiene, para el filo del cartel; `null` si no la tiene nadie. */
  readonly colorDelDueno: string | null;
  readonly esMio: boolean;
  readonly seCompra: boolean;
  /** Una o dos frases, ya redactadas: la cabecera y el estado con la renta de hoy. */
  readonly frases: readonly string[];
  /** Las mismas en un renglón: es el nombre accesible del cuadrado y lo que se oye. */
  readonly frase: string;
}

function solaresDelBarrioDe(l: Lectura | null, fila: CasillaDelBurgo): SolarDelBarrio[] {
  const barrio = fila.clase === 'solar' ? barrioDe(fila.indice) : null;
  if (barrio === null) return [];
  const salida: SolarDelBarrio[] = [];
  for (const c of barrio.solares) {
    const otra = filaDe(c);
    if (otra === null) continue;
    const t = l === null ? null : tituloEn(l, c);
    salida.push({
      casilla: c,
      nombre: otra.nombre,
      rotulo: otra.rotulo,
      dueno: l === null || t === null ? null : duenoVisto(l, t.dueno),
      casas: t === null ? 0 : t.casas,
      empenado: t !== null && t.empenado,
      esEsta: c === fila.indice,
    });
  }
  return salida;
}

/** «Los Paseos: 3 solares · Ana 2 · el Ayuntamiento 1», con los nombres de la vista. */
function lineaDelBarrio(l: Lectura, barrio: BarrioDelBurgo): string {
  const cuentas: { asiento: AsientoId | null; nombre: string; cuantos: number }[] = [];
  for (const c of barrio.solares) {
    const t = tituloEn(l, c);
    const dueno = t === null ? null : t.dueno;
    let fila = cuentas.find((x) => x.asiento === dueno);
    if (fila === undefined) {
      fila = { asiento: dueno, nombre: nombreDe(l, dueno), cuantos: 0 };
      cuentas.push(fila);
    }
    fila.cuantos++;
  }
  const cuantos = barrio.solares.length;
  const partes = cuentas.map((x) => `${x.nombre} ${x.cuantos}`);
  return `${barrio.nombre}: ${cuantos} ${cuantos === 1 ? 'solar' : 'solares'} · ${partes.join(' · ')}`;
}

/** El cartel, ya con la vista leída: lo llaman `cartelDeCasilla` y `fichaDeCasilla`, para que digan lo mismo. */
function cartelDe(l: Lectura | null, fila: CasillaDelBurgo): CartelDeCasilla {
  const casilla = fila.indice;
  const barrio = fila.clase === 'solar' ? barrioDe(casilla) : null;
  const t = l === null ? null : tituloEn(l, casilla);
  const seCompra = esTitulo(fila.clase);
  const estado = l === null ? (seCompra ? 'Del Ayuntamiento' : '') : estadoDeLaCasilla(l, fila, t);
  const dueno = l === null || t === null ? null : jugadorEn(l, t.dueno);
  const cabecera: string[] = [fila.nombre];
  if (barrio !== null) cabecera.push(barrio.nombre);
  if (seCompra) cabecera.push(maravedies(fila.precio));
  const frases: string[] = [cabecera.join(' · ')];
  const segunda: string[] = [];
  if (l !== null && l.almoneda !== null && l.almoneda.casilla === casilla) {
    /*
     * En subasta el estado a secas («En subasta») no dice lo único que se mira mientras
     * corre: por cuánto va y de quién. La cifra está en la vista y no se recalcula aquí.
     */
    segunda.push('En subasta');
    segunda.push(l.almoneda.quienPuja === null ? 'sin pujas' : `${maravedies(l.almoneda.puja)} de ${nombreDe(l, l.almoneda.quienPuja)}`);
  } else if (estado.length > 0 && estado !== fila.nombre) {
    segunda.push(estado);
  }
  if (t !== null && t.dueno !== null && !t.empenado && t.rentaAhora > 0) segunda.push(`renta hoy ${maravedies(t.rentaAhora)}`);
  if (segunda.length > 0) frases.push(segunda.join(' · '));
  return {
    casilla,
    nombre: fila.nombre,
    rotulo: fila.rotulo,
    clase: fila.clase,
    color: colorDelBarrioDe(fila),
    colorDelDueno: dueno === null ? null : dueno.color,
    esMio: l !== null && l.yo !== null && t !== null && t.dueno === l.yo,
    seCompra,
    frases,
    frase: frases.join(' — '),
  };
}

/**
 * EL CARTEL DE UNA CASILLA: una o dos frases con el nombre, el barrio, el precio, el estado
 * y la renta de HOY, ya redactadas. Para una vista que no es del Burgo, la casilla de la
 * tabla sin dueño ni estado: el cartel nunca se queda vacío bajo el cursor.
 */
export function cartelDeCasilla(vista: unknown, casilla: number): CartelDeCasilla {
  return cartelDe(leer(vista), filaDe(casilla) ?? (CASILLAS[0] as CasillaDelBurgo));
}

function rentasDe(fila: CasillaDelBurgo, t: TituloQueSePinta | null, tirada: ParDeDados | null): RenglonDeRenta[] {
  const cobra = t !== null && t.dueno !== null && !t.empenado;
  const rentaAhora = t === null ? 0 : t.rentaAhora;
  const marca = (cuanto: number, condicion: boolean): boolean => cobra && condicion && cuanto === rentaAhora;
  const filas: RenglonDeRenta[] = [];
  if (fila.clase === 'solar') {
    const r = fila.rentas;
    filas.push({ rotulo: 'Solar', cuanto: r[0], actual: marca(r[0], t !== null && t.casas === 0 && !t.barrioEntero) });
    filas.push({ rotulo: 'Barrio entero', cuanto: r[0] * 2, actual: marca(r[0] * 2, t !== null && t.casas === 0 && t.barrioEntero) });
    for (let k = 1; k <= 4; k++) {
      const cuanto = r[k] ?? 0;
      filas.push({ rotulo: k === 1 ? '1 casa' : `${k} casas`, cuanto, actual: marca(cuanto, t !== null && t.casas === k) });
    }
    filas.push({ rotulo: 'Hotel', cuanto: r[5], actual: marca(r[5], t !== null && t.casas === POSADA) });
  } else if (fila.clase === 'puerta') {
    for (let n = 1; n < RENTA_DE_PUERTA.length; n++) {
      const cuanto = RENTA_DE_PUERTA[n] ?? 0;
      filas.push({ rotulo: n === 1 ? '1 estación' : `${n} estaciones`, cuanto, actual: marca(cuanto, true) });
    }
  } else if (fila.clase === 'oficio') {
    const suma = tirada === null ? 0 : tirada[0] + tirada[1];
    for (let n = 1; n < MULTIPLO_DE_OFICIO.length; n++) {
      const veces = MULTIPLO_DE_OFICIO[n] ?? 0;
      filas.push({ rotulo: `${n === 1 ? '1 servicio' : `${n} servicios`}: ${veces} × la tirada`, cuanto: veces * suma, actual: marca(veces * suma, suma > 0) });
    }
  }
  return filas;
}

function estadoDeLaCasilla(l: Lectura, fila: CasillaDelBurgo, t: TituloQueSePinta | null): string {
  if (fila.clase !== 'solar' && fila.clase !== 'puerta' && fila.clase !== 'oficio') {
    switch (fila.clase) {
      case 'salida':
        return 'La Salida';
      case 'mazmorra':
        return 'La Comisaría';
      case 'feria':
        return 'El Descanso';
      case 'a-la-mazmorra':
        return '¡A comisaría!';
      case 'diezmo':
        return `El Impuesto: ${maravedies(fila.precio)}`;
      case 'alcabala':
        return `La Tasa: ${maravedies(fila.precio)}`;
      case 'pregon':
        return 'Sucesos';
      case 'arca':
        return 'El Fondo Vecinal';
      default:
        return '';
    }
  }
  if (l.almoneda !== null && l.almoneda.casilla === fila.indice) return 'En subasta';
  if (t === null || t.dueno === null) return 'Del Ayuntamiento';
  const partes: string[] = [];
  partes.push(l.yo !== null && t.dueno === l.yo ? 'Tuyo' : `De ${nombreDe(l, t.dueno)}`);
  if (t.empenado) partes.push('hipotecado');
  else if (t.casas === POSADA) partes.push('hotel');
  else if (t.casas > 0) partes.push(t.casas === 1 ? '1 casa' : `${t.casas} casas`);
  else if (t.barrioEntero) partes.push('barrio entero');
  return partes.join(' · ');
}

/**
 * LA FICHA DE UNA CASILLA para `yo`: nombre, barrio, precio, la tabla de rentas con
 * la fila de hoy, dueño, estado, y TODAS sus opciones enteras. Para una vista que no
 * es del Burgo, la ficha de la tabla sin dueño ni opciones.
 *
 * ═══ SIRVE PARA CUALQUIER CASILLA, NO SÓLO PARA LAS MÍAS ═══
 *
 * Nació para «Lo mío» y se leía como si fuera de allí, pero no tiene ni una línea que
 * dependa de que el título sea mío: `dueno`, `estado`, `rentaAhora` y la tabla de rentas
 * salen de la vista, que publica los títulos de TODOS. Lo que le faltaba para ser la
 * tarjeta de una casilla ajena eran dos cosas, y aquí están: `solaresDelBarrio` —cuánto le
 * falta a alguien para el barrio entero, que es lo que se mira antes de comprar— y
 * `cartel`, la misma frase que sale al posar el cursor.
 *
 * La tabla de rentas NO se colapsa en un renglón de `lineas`: va en `rentas`, fila a fila,
 * con `actual` en la de hoy. `lineas` lleva lo que no es tabla —barrio, precio, la casa, el
 * estado, la renta de hoy, la hipoteca—, y los dos clientes pintan las dos cosas.
 */
export function fichaDeCasilla<O extends OpcionQueLlega>(vista: unknown, casilla: number, yo: QuienMira, opciones: readonly O[]): FichaDeCasilla<O> {
  const l = leer(vista);
  const fila = filaDe(casilla) ?? (CASILLAS[0] as CasillaDelBurgo);
  const t = l === null ? null : tituloEn(l, casilla);
  const barrio = fila.clase === 'solar' ? barrioDe(casilla) : null;
  const dueno = l === null || t === null ? null : jugadorEn(l, t.dueno);
  const seCompra = esTitulo(fila.clase);
  const estado = l === null ? (seCompra ? 'Del Ayuntamiento' : '') : estadoDeLaCasilla(l, fila, t);
  const lineas: string[] = [];
  if (barrio !== null) lineas.push(`Barrio: ${barrio.nombre}`);
  if (barrio !== null && l !== null) lineas.push(lineaDelBarrio(l, barrio));
  if (seCompra) lineas.push(`Precio: ${maravedies(fila.precio)}`);
  if (fila.casa > 0) lineas.push(`Cada casa: ${maravedies(fila.casa)}`);
  if (estado.length > 0) lineas.push(estado);
  if (t !== null && t.dueno !== null && !t.empenado) lineas.push(`Renta hoy: ${maravedies(t.rentaAhora)}`);
  if (seCompra) lineas.push(`Hipoteca: ${maravedies(valorDeEmpeno(fila.precio))} · deshipotecar: ${maravedies(costeDeDesempeno(fila.precio))}`);
  return {
    casilla: fila.indice,
    nombre: fila.nombre,
    rotulo: fila.rotulo,
    clase: fila.clase,
    barrio: barrio === null ? null : { id: barrio.id, nombre: barrio.nombre, color: barrio.color },
    precio: fila.precio,
    casa: fila.casa,
    rentas: rentasDe(fila, t, l === null ? null : l.tirada),
    dueno: dueno === null || l === null ? null : { asiento: dueno.asiento, nombre: nombreDe(l, dueno.asiento), color: dueno.color },
    estado,
    casas: t === null ? 0 : t.casas,
    esPosada: t !== null && t.casas === POSADA,
    empenado: t !== null && t.empenado,
    enAlmoneda: l !== null && l.almoneda !== null && l.almoneda.casilla === casilla,
    barrioEntero: t !== null && t.barrioEntero,
    rentaAhora: t === null ? 0 : t.rentaAhora,
    empeno: seCompra ? valorDeEmpeno(fila.precio) : 0,
    desempeno: seCompra ? costeDeDesempeno(fila.precio) : 0,
    esMio: l !== null && l.yo !== null && t !== null && t.dueno === l.yo,
    seCompra,
    cartel: cartelDe(l, fila).frase,
    solaresDelBarrio: solaresDelBarrioDe(l, fila),
    lineas,
    opciones: obraPosibleEnCasilla(vista, yo, opciones, casilla),
  };
}

// ---------------------------------------------------------------------------
// EL MARCADOR
// ---------------------------------------------------------------------------

export interface JugadorDelMarcador {
  readonly asiento: AsientoId;
  readonly nombre: string;
  readonly color: string;
  readonly mrs: number;
  readonly patrimonio: number;
  /** Cuántos títulos tiene. */
  readonly titulos: number;
  readonly presa: boolean;
  /** Intentos hechos en la Comisaría (0 si libre). */
  readonly intentos: number;
  readonly indultos: number;
  readonly quebrado: boolean;
  readonly casilla: number;
  readonly nombreDeLaCasilla: string;
  /** Es el dueño del turno: el marco del acento. */
  readonly esSuTurno: boolean;
  /** Se le espera a él (puja, apuro): el punto. */
  readonly seLeEspera: boolean;
  readonly soyYo: boolean;
  /** «Ana · 1.500 € · 3 títulos · en la Comisaría · 1 Salvoconducto». */
  readonly linea: string;
}

export interface MarcadorDelBurgo {
  readonly jugadores: readonly JugadorDelMarcador[];
  readonly concejo: { readonly casas: number; readonly posadas: number };
  readonly quedan: { readonly pregon: number; readonly arca: number };
  readonly turnoDe: AsientoId | null;
  readonly duenoDelTurno: AsientoId | null;
  readonly topeDeVueltas: number;
}

function lineaDelMarcador(j: JugadorQueSePinta, nombre: string): string {
  let linea = `${nombre} · ${maravedies(j.mrs)} · ${j.titulos.length} ${j.titulos.length === 1 ? 'título' : 'títulos'}`;
  if (j.quebrado) linea += ' · quebró';
  else if (j.presa >= 0) linea += ' · en la Comisaría';
  if (j.indultos > 0) linea += ` · ${j.indultos} ${j.indultos === 1 ? 'Salvoconducto' : 'Salvoconductos'}`;
  return linea;
}

/** EL MARCADOR que se enseña siempre: por jugador y el Ayuntamiento. Vacío para una vista que no es del Burgo. */
export function marcadorEnTres(vista: unknown, yo: QuienMira): MarcadorDelBurgo {
  const l = leer(vista);
  if (l === null) {
    return { jugadores: [], concejo: { casas: 0, posadas: 0 }, quedan: { pregon: 0, arca: 0 }, turnoDe: null, duenoDelTurno: null, topeDeVueltas: 0 };
  }
  const jugadores: JugadorDelMarcador[] = [];
  for (const j of l.jugadores) {
    const nombre = nombreDe(l, j.asiento);
    jugadores.push({
      asiento: j.asiento,
      nombre,
      color: j.color,
      mrs: j.mrs,
      patrimonio: j.patrimonio,
      titulos: j.titulos.length,
      presa: j.presa >= 0,
      intentos: j.presa >= 0 ? j.presa : 0,
      indultos: j.indultos,
      quebrado: j.quebrado,
      casilla: j.casilla,
      nombreDeLaCasilla: nombreDeCasilla(j.casilla),
      esSuTurno: l.duenoDelTurno !== null && j.asiento === l.duenoDelTurno,
      seLeEspera: l.turnoDe !== null && j.asiento === l.turnoDe,
      soyYo: yo !== null && j.asiento === yo,
      linea: lineaDelMarcador(j, nombre),
    });
  }
  return { jugadores, concejo: l.concejo, quedan: l.quedan, turnoDe: l.turnoDe, duenoDelTurno: l.duenoDelTurno, topeDeVueltas: l.topeDeVueltas };
}

// ---------------------------------------------------------------------------
// LA PUJA: las fijas, pasar, y la libre por la puerta
// ---------------------------------------------------------------------------

/** Lo que la puerta de la puja declara: `{ casilla, minimo, maximo, escalon }`. */
export interface PuertaDeLaPuja {
  readonly casilla: number;
  readonly minimo: number;
  readonly maximo: number;
  readonly escalon: number;
}

export interface PujaComponible<O extends OpcionQueLlega = OpcionQueLlega> {
  readonly casilla: number;
  readonly nombre: string;
  /** La mejor puja hasta ahora (0 sin pujas) y de quién es. */
  readonly puja: number;
  readonly quienPuja: DuenoVisto | null;
  /** A quién se espera, y si soy yo. */
  readonly pujaDe: AsientoId | null;
  readonly meToca: boolean;
  readonly enPie: readonly DuenoVisto[];
  readonly enCola: number;
  /** Los límites de la puja libre: de la puerta si el juego la abrió para mí; si no, lo que dicen las fijas. */
  readonly minimo: number;
  readonly maximo: number;
  readonly escalon: number;
  /** Las pujas fijas (mínimo, +50, +100), enteras, en el orden del juego. Vacías si no me toca. */
  readonly fijas: readonly O[];
  /** Pasar en la subasta, entera; `null` si no me toca. */
  readonly pasar: O | null;
  /** La puerta, o `null` si el juego no me la abrió (no me toca, o no me alcanza para el mínimo). */
  readonly puerta: PuertaDeLaPuja | null;
  readonly lineas: readonly string[];
  /** La puja libre: `{ tipo, carga: { casilla, cuanto } }` con EXACTAMENTE esos dos campos, o `null` si no cabe. */
  readonly montar: (cuanto: number) => MovimientoDeclarado | null;
}

function puertaDeLaPuja(opciones: readonly OpcionQueLlega[]): PuertaDeLaPuja | null {
  for (const o of opciones) {
    if (o.tipo !== PUJAR || !esPuerta(o)) continue;
    const c = objeto(o.carga);
    if (c === null) return null;
    const casilla = c['casilla'];
    const minimo = c['minimo'];
    const maximo = c['maximo'];
    const escalon = c['escalon'];
    if (typeof casilla !== 'number' || typeof minimo !== 'number' || typeof maximo !== 'number' || typeof escalon !== 'number') return null;
    return { casilla, minimo, maximo, escalon };
  }
  return null;
}

function duenoVisto(l: Lectura, quien: AsientoId | null): DuenoVisto | null {
  const j = jugadorEn(l, quien);
  return j === null ? null : { asiento: j.asiento, nombre: nombreDe(l, j.asiento), color: j.color };
}

/**
 * LA SUBASTA para `yo`, o `null` si no hay ninguna abierta. Para todos trae la
 * cifra, quién gana y quiénes siguen en pie; para quien puja, además las fijas, el
 * pasar y la puerta. `montar` compone la puja libre con los campos EXACTOS de la
 * puerta y devuelve `null` fuera de sus límites: lo que sale de aquí entra por el
 * portillo de verdad (`verify:burgo-en-tres` lo manda).
 */
export function pujaEnTres<O extends OpcionQueLlega>(vista: unknown, yo: QuienMira, opciones: readonly O[]): PujaComponible<O> | null {
  const l = leer(vista);
  if (l === null || l.almoneda === null || l.momento !== 'jugando') return null;
  const a = l.almoneda;
  const meToca = yo !== null && a.pujaDe === yo && l.yo === yo;
  const fijas = meToca ? opciones.filter((o) => o.tipo === PUJAR && !esPuerta(o)) : [];
  let pasar: O | null = null;
  if (meToca) for (const o of opciones) if (o.tipo === PASAR_PUJA && !esPuerta(o)) pasar = o;
  const puerta = meToca ? puertaDeLaPuja(opciones) : null;
  let minimoDeLasFijas = 0;
  for (const f of fijas) {
    const c = objeto(f.carga);
    const cuanto = c === null ? 0 : entero(c['cuanto'], 0);
    if (minimoDeLasFijas === 0 || cuanto < minimoDeLasFijas) minimoDeLasFijas = cuanto;
  }
  const minimo = puerta === null ? minimoDeLasFijas : puerta.minimo;
  const maximo = puerta === null ? minimoDeLasFijas : puerta.maximo;
  const escalon = puerta === null ? PASO_DE_PUJA : puerta.escalon;
  const enPie: DuenoVisto[] = [];
  for (const x of a.enPie) {
    const d = duenoVisto(l, x);
    if (d !== null) enPie.push(d);
  }
  const nombre = nombreDeCasilla(a.casilla);
  const lineas: string[] = [];
  lineas.push(a.quienPuja === null ? `${nombre}: sin pujas.` : `${nombre}: ${maravedies(a.puja)} de ${nombreDe(l, a.quienPuja)}.`);
  lineas.push(`${meToca ? 'Te toca pujar' : `Puja ${nombreDe(l, a.pujaDe)}`}. En pie: ${enPie.map((d) => d.nombre).join(', ')}.`);
  if (a.enCola > 0) lineas.push(`${a.enCola} ${a.enCola === 1 ? 'título más en cola' : 'títulos más en cola'}.`);
  if (meToca && puerta !== null) lineas.push(`Puja libre entre ${maravedies(puerta.minimo)} y ${maravedies(puerta.maximo)}, de ${puerta.escalon} en ${puerta.escalon}.`);
  return {
    casilla: a.casilla,
    nombre,
    puja: a.puja,
    quienPuja: duenoVisto(l, a.quienPuja),
    pujaDe: a.pujaDe,
    meToca,
    enPie,
    enCola: a.enCola,
    minimo,
    maximo,
    escalon,
    fijas,
    pasar,
    puerta,
    lineas,
    montar: (cuanto: number): MovimientoDeclarado | null => {
      if (puerta === null) return null;
      if (typeof cuanto !== 'number' || !Number.isInteger(cuanto)) return null;
      if (cuanto < puerta.minimo || cuanto > puerta.maximo) return null;
      if (!(puerta.escalon > 0) || cuanto % puerta.escalon !== 0) return null;
      return { tipo: PUJAR, carga: { casilla: puerta.casilla, cuanto } };
    },
  };
}

// ---------------------------------------------------------------------------
// LOS TRATOS: los abiertos, y el componedor por la puerta
// ---------------------------------------------------------------------------

export interface TratoAbierto<O extends OpcionQueLlega = OpcionQueLlega> {
  readonly id: number;
  readonly de: DuenoVisto;
  readonly a: DuenoVisto;
  readonly doy: LadoQueSePinta;
  readonly pido: LadoQueSePinta;
  /** «Ana da 200 €, Callejón de las Latas y pide un Salvoconducto.» */
  readonly resumen: string;
  readonly da: string;
  readonly pide: string;
  readonly soyElDestinatario: boolean;
  readonly soyElProponente: boolean;
  readonly aceptar: O | null;
  readonly rechazar: O | null;
  readonly retirar: O | null;
}

/**
 * Un destinatario posible, con lo que la vista dice que tiene: sus títulos que pueden
 * ir en un trato —sin casas y con el barrio sin edificios, la misma regla con la que
 * `opciones()` declara los míos—. Lo demás lo revalida el reductor.
 */
export interface DestinoDelTrato extends DuenoVisto {
  readonly titulos: readonly number[];
  readonly indultos: number;
}

/** ¿Algún solar del barrio de `casilla` tiene casas? Es la regla del reductor para los títulos de un trato. */
function barrioConEdificios(l: Lectura, casilla: number): boolean {
  const barrio = barrioDe(casilla);
  if (barrio === null) return false;
  for (const c of barrio.solares) {
    const t = tituloEn(l, c);
    if (t !== null && t.casas > 0) return true;
  }
  return false;
}

/** Lo que la puerta del trato declara: `{ a: [...], mrsMaximo, titulos: [...], indultos }`, con nombres al lado. */
export interface PuertaDelTrato {
  readonly a: readonly DestinoDelTrato[];
  readonly mrsMaximo: number;
  /** Mis títulos que puedo dar, por casilla. */
  readonly titulos: readonly number[];
  readonly indultos: number;
  readonly rotulo: string;
  readonly ayuda: string;
}

export interface TratoComponible<O extends OpcionQueLlega = OpcionQueLlega> {
  readonly abiertos: readonly TratoAbierto<O>[];
  readonly puerta: PuertaDelTrato | null;
  /** `{ tipo, carga: { a, doy, pido } }` con EXACTAMENTE esos campos y los tres de cada lado, o `null` si no cabe en la puerta. */
  readonly montar: (a: AsientoId, doy: LadoQueSePinta, pido: LadoQueSePinta) => MovimientoDeclarado | null;
}

function resumenDeLado(lado: LadoQueSePinta): string {
  const partes: string[] = [];
  if (lado.mrs > 0) partes.push(maravedies(lado.mrs));
  for (const c of lado.titulos) partes.push(nombreDeCasilla(c));
  if (lado.indultos > 0) partes.push(lado.indultos === 1 ? 'un Salvoconducto' : `${lado.indultos} Salvoconductos`);
  return partes.length === 0 ? 'nada' : partes.join(', ');
}

function puertaDelTrato(l: Lectura, opciones: readonly OpcionQueLlega[]): PuertaDelTrato | null {
  for (const o of opciones) {
    if (o.tipo !== PROPONER || !esPuerta(o)) continue;
    const c = objeto(o.carga);
    if (c === null) return null;
    const destinos = listaDeCadenas(c['a']);
    const mrsMaximo = c['mrsMaximo'];
    const indultos = c['indultos'];
    if (typeof mrsMaximo !== 'number' || typeof indultos !== 'number') return null;
    const a: DestinoDelTrato[] = [];
    for (const x of destinos) {
      const j = jugadorEn(l, x);
      if (j === null) continue;
      const sinCasas: number[] = [];
      for (const casilla of j.titulos) {
        const t = tituloEn(l, casilla);
        if (t !== null && t.casas === 0 && !barrioConEdificios(l, casilla)) sinCasas.push(casilla);
      }
      a.push({ asiento: j.asiento, nombre: nombreDe(l, j.asiento), color: j.color, titulos: sinCasas, indultos: j.indultos });
    }
    return { a, mrsMaximo, titulos: listaDeEnteros(c['titulos']), indultos, rotulo: o.rotulo, ayuda: o.ayuda };
  }
  return null;
}

/** Un lado bien formado: enteros no negativos, títulos sin repetir y que sean títulos. `null` si no. */
function ladoSano(lado: LadoQueSePinta): LadoQueSePinta | null {
  if (typeof lado !== 'object' || lado === null) return null;
  const { mrs, indultos, titulos } = lado;
  if (typeof mrs !== 'number' || !Number.isInteger(mrs) || mrs < 0) return null;
  if (typeof indultos !== 'number' || !Number.isInteger(indultos) || indultos < 0) return null;
  if (!Array.isArray(titulos)) return null;
  const vistos: number[] = [];
  for (const c of titulos) {
    if (typeof c !== 'number' || !Number.isInteger(c) || vistos.indexOf(c) >= 0) return null;
    const fila = filaDe(c);
    if (fila === null || (fila.clase !== 'solar' && fila.clase !== 'puerta' && fila.clase !== 'oficio')) return null;
    vistos.push(c);
  }
  return { mrs, titulos: vistos, indultos };
}

function ladoVacio(lado: LadoQueSePinta): boolean {
  return lado.mrs === 0 && lado.titulos.length === 0 && lado.indultos === 0;
}

/**
 * LOS TRATOS para `yo`: los abiertos (todos son públicos) con lo que puedo hacer
 * en cada uno, y la puerta del componedor si el juego me la abrió. `null` para un
 * mirón, fuera de `jugando` o si la vista no es del Burgo. `montar` compone con los
 * campos EXACTOS de la puerta: `a` entre los destinos, `doy` dentro de lo mío,
 * `pido` dentro de lo que la vista dice que tiene el destino, ningún título en los
 * dos lados, y al menos un lado con algo.
 */
export function tratoEnTres<O extends OpcionQueLlega>(vista: unknown, yo: QuienMira, opciones: readonly O[]): TratoComponible<O> | null {
  const l = leer(vista);
  if (l === null || yo === null || l.momento !== 'jugando') return null;
  const abiertos: TratoAbierto<O>[] = [];
  for (const t of l.tratos) {
    const de = duenoVisto(l, t.de) ?? { asiento: t.de, nombre: t.de, color: '' };
    const a = duenoVisto(l, t.a) ?? { asiento: t.a, nombre: t.a, color: '' };
    let aceptar: O | null = null;
    let rechazar: O | null = null;
    let retirar: O | null = null;
    for (const o of opciones) {
      if (esPuerta(o)) continue;
      const c = objeto(o.carga);
      if (c === null || c['trato'] !== t.id) continue;
      if (o.tipo === ACEPTAR) aceptar = o;
      if (o.tipo === RECHAZAR) rechazar = o;
      if (o.tipo === RETIRAR) retirar = o;
    }
    abiertos.push({
      id: t.id,
      de,
      a,
      doy: t.doy,
      pido: t.pido,
      resumen: `${de.nombre} da ${resumenDeLado(t.doy)} y pide ${resumenDeLado(t.pido)}.`,
      da: resumenDeLado(t.doy),
      pide: resumenDeLado(t.pido),
      soyElDestinatario: t.a === yo,
      soyElProponente: t.de === yo,
      aceptar,
      rechazar,
      retirar,
    });
  }
  const puerta = l.yo === yo ? puertaDelTrato(l, opciones) : null;
  return {
    abiertos,
    puerta,
    montar: (a: AsientoId, doy: LadoQueSePinta, pido: LadoQueSePinta): MovimientoDeclarado | null => {
      if (puerta === null) return null;
      if (typeof a !== 'string') return null;
      let destino: DestinoDelTrato | null = null;
      for (const d of puerta.a) if (d.asiento === a) destino = d;
      if (destino === null) return null;
      const miLado = ladoSano(doy);
      const suLado = ladoSano(pido);
      if (miLado === null || suLado === null) return null;
      if (miLado.mrs > puerta.mrsMaximo || miLado.indultos > puerta.indultos) return null;
      for (const c of miLado.titulos) if (puerta.titulos.indexOf(c) < 0) return null;
      /* Lo que pido tiene que ser suyo y sin casas según la vista; lo demás lo revalida el reductor. */
      for (const c of suLado.titulos) if (destino.titulos.indexOf(c) < 0) return null;
      if (suLado.indultos > destino.indultos) return null;
      for (const c of miLado.titulos) if (suLado.titulos.indexOf(c) >= 0) return null;
      if (ladoVacio(miLado) && ladoVacio(suLado)) return null;
      return {
        tipo: PROPONER,
        carga: {
          a,
          doy: { mrs: miLado.mrs, titulos: [...miLado.titulos], indultos: miLado.indultos },
          pido: { mrs: suLado.mrs, titulos: [...suLado.titulos], indultos: suLado.indultos },
        },
      };
    },
  };
}

// ---------------------------------------------------------------------------
// LA FICHA DE UN JUGADOR: quién es, qué tiene, y qué le puedo proponer
// ---------------------------------------------------------------------------

/** Un título de un jugador, tal como se lee en su ficha. */
export interface TituloDeUnJugador {
  readonly casilla: number;
  readonly nombre: string;
  /** El rótulo de seis letras de la cara del retablo. */
  readonly rotulo: string;
  readonly casas: number;
  readonly esPosada: boolean;
  readonly empenado: boolean;
  readonly barrioEntero: boolean;
  readonly rentaAhora: number;
  /** «2 casas», «hotel», «hipotecado», «barrio entero», «solar». */
  readonly estado: string;
  /**
   * CABE EN UN TRATO: sin casas y con el barrio sin edificios, la misma regla con la que
   * `opciones()` declara los míos. Es una PISTA de la vista, no un permiso: quien decide
   * es la puerta (`trato`), y el reductor detrás.
   */
  readonly enUnTrato: boolean;
}

/** Los títulos de un jugador agrupados por barrio, con el color de la acera. */
export interface BarrioDeUnJugador {
  readonly id: string;
  readonly nombre: string;
  readonly color: string;
  readonly titulos: readonly TituloDeUnJugador[];
  /** Tiene TODOS los solares del barrio: cobra doble y puede alzar. */
  readonly entero: boolean;
}

/**
 * LO QUE HACE FALTA PARA PROPONERLE UN TRATO A ÉSTE, y nada más.
 *
 * NO ES UN BOTÓN Y NO PUEDE SERLO: proponer es una PUERTA (`declaracion: true`), y una
 * puerta pulsada manda una declaración que el reductor descarta con un motivo. Lo que hay
 * aquí es lo que el componedor necesita —qué puedo poner yo, qué tiene él— y un `montar`
 * ya atado a este destinatario, que devuelve `null` cuando lo pedido no cabe.
 */
export interface TratoConEsteJugador {
  /** Él: sus títulos tratables y sus Salvoconductos, tal como los declara la puerta. */
  readonly a: DestinoDelTrato;
  /** Lo mío que cabe en la puerta: el tope de dinero, mis títulos y mis Salvoconductos. */
  readonly mrsMaximo: number;
  readonly titulos: readonly number[];
  readonly indultos: number;
  readonly rotulo: string;
  readonly ayuda: string;
  /** `{ tipo, carga: { a, doy, pido } }` con `a` ya puesto, o `null` si no cabe. */
  readonly montar: (doy: LadoQueSePinta, pido: LadoQueSePinta) => MovimientoDeclarado | null;
}

export interface FichaDeJugador {
  readonly asiento: AsientoId;
  readonly nombre: string;
  readonly color: string;
  readonly soyYo: boolean;
  readonly mrs: number;
  readonly patrimonio: number;
  readonly casilla: number;
  readonly nombreDeLaCasilla: string;
  readonly presa: boolean;
  /** Intentos hechos en la Comisaría (0 si está libre). */
  readonly intentos: number;
  readonly indultos: number;
  readonly quebrado: boolean;
  readonly esSuTurno: boolean;
  readonly seLeEspera: boolean;
  /** Cuántos títulos tiene. */
  readonly cuantosTitulos: number;
  /** La misma línea del marcador: «Ana · 1.500 € · 3 títulos». */
  readonly linea: string;
  /** La ficha entera, redactada: patrimonio, dónde está, sus barrios, sus Salvoconductos. */
  readonly lineas: readonly string[];
  /** Sus títulos por barrio, en el orden de la tabla. */
  readonly barrios: readonly BarrioDeUnJugador[];
  /** Las estaciones y los servicios, que no tienen barrio. */
  readonly sueltos: readonly TituloDeUnJugador[];
  /** Sus títulos que caben en un trato, por casilla. */
  readonly tratables: readonly number[];
  /** El componedor atado a él, o `null`: no me toca, no me lo ofrece la puerta, o soy yo. */
  readonly trato: TratoConEsteJugador | null;
}

/** «2 casas», «hotel», «hipotecado», «barrio entero», «solar»: lo que se dice de un título en una lista. */
function estadoDelTitulo(t: TituloQueSePinta, fila: CasillaDelBurgo): string {
  if (t.empenado) return 'hipotecado';
  if (t.casas === POSADA) return 'hotel';
  if (t.casas > 0) return t.casas === 1 ? '1 casa' : `${t.casas} casas`;
  if (t.barrioEntero) return 'barrio entero';
  return fila.clase === 'solar' ? 'solar' : fila.clase === 'puerta' ? 'estación' : 'servicio';
}

function tituloDeUnJugador(l: Lectura, casilla: number): TituloDeUnJugador | null {
  const fila = filaDe(casilla);
  const t = tituloEn(l, casilla);
  if (fila === null || t === null) return null;
  return {
    casilla,
    nombre: fila.nombre,
    rotulo: fila.rotulo,
    casas: t.casas,
    esPosada: t.casas === POSADA,
    empenado: t.empenado,
    barrioEntero: t.barrioEntero,
    rentaAhora: t.rentaAhora,
    estado: estadoDelTitulo(t, fila),
    enUnTrato: t.casas === 0 && !barrioConEdificios(l, casilla),
  };
}

/**
 * ═══ LA FICHA DE UN JUGADOR: LO QUE HOY SE PIERDE AL TOCAR UN PEÓN ═══
 *
 * Tocar un peón daba UNA línea —«Ana · 1.500 € · 3 títulos»—, que es el renglón del
 * marcador otra vez. Lo que se quiere saber mirando a otro es lo que esa línea no dice: si
 * le falta un solar para el barrio entero, si está en la Comisaría, cuánto vale todo lo
 * suyo, y —lo único que se puede HACER con esa información— si le puedo proponer un trato y
 * con qué. Los tres datos ya viajaban: `patrimonio` y `nombreDeLaCasilla` los publica
 * `marcadorEnTres`, y los títulos tratables por destino los declara la puerta del trato en
 * `tratoEnTres().puerta.a[]`. Estaban sueltos en tres sitios y ningún cliente los juntaba.
 *
 * ═══ NO PINTA NI UN BOTÓN, Y ESO LA DEJA FUERA DE LA PARTICIÓN ═══
 *
 * La ficha no devuelve ninguna opción: ni aceptar, ni rechazar, ni retirar —esos tratos ya
 * tienen su sitio, la caja de los tratos o la sección de la hoja—, y proponer es una puerta,
 * que no se pinta nunca. Así que abrir la ficha de un jugador no puede repetir ningún
 * movimiento ni robárselo a nadie: es un mueble de LECTURA, con un componedor colgando.
 *
 * `null` si `quien` no está sentado a esta mesa o la vista no es del Burgo.
 */
export function fichaDeJugador<O extends OpcionQueLlega>(
  vista: unknown,
  quien: AsientoId,
  yo: QuienMira,
  opciones: readonly O[],
): FichaDeJugador | null {
  const l = leer(vista);
  if (l === null) return null;
  const j = jugadorEn(l, quien);
  if (j === null) return null;
  const nombre = nombreDe(l, j.asiento);
  const soyYo = yo !== null && j.asiento === yo;

  const porBarrio: Record<string, TituloDeUnJugador[]> = {};
  const sueltos: TituloDeUnJugador[] = [];
  const tratables: number[] = [];
  for (const casilla of j.titulos) {
    const t = tituloDeUnJugador(l, casilla);
    if (t === null) continue;
    if (t.enUnTrato) tratables.push(casilla);
    const barrio = barrioDe(casilla);
    if (barrio === null) sueltos.push(t);
    else (porBarrio[barrio.id] = porBarrio[barrio.id] ?? []).push(t);
  }
  const barrios: BarrioDeUnJugador[] = [];
  for (const b of BARRIOS) {
    const titulos = porBarrio[b.id];
    if (titulos === undefined || titulos.length === 0) continue;
    barrios.push({ id: b.id, nombre: b.nombre, color: b.color, titulos, entero: titulos.length === b.solares.length });
  }

  const lineas: string[] = [];
  lineas.push(`${maravedies(j.mrs)} en mano · ${maravedies(j.patrimonio)} de patrimonio.`);
  if (j.quebrado) lineas.push('Quebró: mira la partida desde fuera.');
  else if (j.presa >= 0) lineas.push(`En la Comisaría: intento ${j.presa + 1} de ${INTENTOS_EN_LA_MAZMORRA}.`);
  else lineas.push(`En ${nombreDeCasilla(j.casilla)}.`);
  for (const b of barrios) {
    lineas.push(`${b.nombre}: ${b.titulos.map((t) => t.rotulo).join(', ')}${b.entero ? ' · barrio entero' : ''}`);
  }
  if (sueltos.length > 0) lineas.push(`${SIN_BARRIO.nombre}: ${sueltos.map((t) => t.rotulo).join(', ')}`);
  if (j.titulos.length === 0) lineas.push('Todavía no tiene ningún título.');
  if (j.indultos > 0) lineas.push(`${j.indultos === 1 ? 'Un Salvoconducto' : `${j.indultos} Salvoconductos`} en la mano.`);

  /*
   * EL COMPONEDOR SÓLO SI EL JUEGO ABRE LA PUERTA PARA ÉL. `tratoEnTres` da la puerta que
   * `opcionesDelBurgo` declaró para mí, y sus destinos son los que el juego admite ahora
   * (con el turno, cualquiera; sin él, sólo el dueño del turno). Buscar a `quien` entre
   * ellos es la única manera de no ofrecer un trato que el reductor va a rechazar.
   */
  const componedor = tratoEnTres(vista, yo, opciones);
  let trato: TratoConEsteJugador | null = null;
  if (!soyYo && componedor !== null && componedor.puerta !== null) {
    const puerta = componedor.puerta;
    const destino = puerta.a.find((d) => d.asiento === quien);
    if (destino !== undefined) {
      trato = {
        a: destino,
        mrsMaximo: puerta.mrsMaximo,
        titulos: puerta.titulos,
        indultos: puerta.indultos,
        rotulo: puerta.rotulo,
        ayuda: puerta.ayuda,
        montar: (doy: LadoQueSePinta, pido: LadoQueSePinta): MovimientoDeclarado | null => componedor.montar(quien, doy, pido),
      };
    }
  }

  return {
    asiento: j.asiento,
    nombre,
    color: j.color,
    soyYo,
    mrs: j.mrs,
    patrimonio: j.patrimonio,
    casilla: j.casilla,
    nombreDeLaCasilla: nombreDeCasilla(j.casilla),
    presa: j.presa >= 0,
    intentos: j.presa >= 0 ? j.presa : 0,
    indultos: j.indultos,
    quebrado: j.quebrado,
    esSuTurno: l.duenoDelTurno !== null && j.asiento === l.duenoDelTurno,
    seLeEspera: l.turnoDe !== null && j.asiento === l.turnoDe,
    cuantosTitulos: j.titulos.length,
    linea: lineaDelMarcador(j, nombre),
    lineas,
    barrios,
    sueltos,
    tratables,
    trato,
  };
}

// ---------------------------------------------------------------------------
// LA CARTA, LA CRÓNICA, A QUIÉN SE ESPERA
// ---------------------------------------------------------------------------

export interface CartelDelBurgo {
  readonly mazo: MazoId;
  readonly numero: number;
  readonly titulo: string;
  readonly texto: string;
  readonly quien: AsientoId | null;
  readonly nombre: string;
  /** «de Sucesos» / «del Fondo Vecinal». */
  readonly deDonde: string;
}

/** LA ÚLTIMA CARTA, mientras dure este turno: título y texto DE LA TABLA por su número. `null` si no hay. */
export function cartelEnTres(vista: unknown): CartelDelBurgo | null {
  const l = leer(vista);
  if (l === null) return null;
  const c = cartaVigente(l);
  if (c === null) return null;
  const ficha = carta(c.mazo, c.carta);
  if (ficha === null) return null;
  return {
    mazo: c.mazo,
    numero: c.carta,
    titulo: ficha.titulo,
    texto: ficha.texto,
    quien: c.quien,
    nombre: c.quien === null ? '' : nombreDe(l, c.quien),
    deDonde: c.mazo === 'pregon' ? 'de Sucesos' : 'del Fondo Vecinal',
  };
}

/** LA FRASE DE LA MESA y lo que me concierne, tal como la vista las trae. Vacías si no es del Burgo. */
export function elPregonEnTres(vista: unknown): { readonly texto: string; readonly aviso: string } {
  const l = leer(vista);
  return l === null ? { texto: '', aviso: '' } : { texto: l.pregon, aviso: l.aviso };
}

/** ¿Me toca a mí? `false` para un mirón, mientras se reúne la mesa y cuando se espera a otro. */
export function meToca(vista: unknown, yo: QuienMira): boolean {
  const l = leer(vista);
  return l !== null && yo !== null && l.momento === 'jugando' && l.turnoDe === yo;
}

/** «Esperando a Bea…», «Carla decide si compra…», «Bea puja…», «Diego busca dinero…». */
export function esperaA(vista: unknown): string {
  const l = leer(vista);
  if (l === null) return '';
  if (l.momento === 'reuniendo') return 'La mesa se está reuniendo.';
  if (l.momento === 'terminada') {
    return l.ganadores.length === 1
      ? `Se acabó: ${nombreDe(l, l.ganadores[0] as AsientoId)} se queda con el Burgo.`
      : l.ganadores.length === 0
        ? 'Se acabó.'
        : `Se acabó: empate entre ${l.ganadores.map((g) => nombreDe(l, g)).join(', ')}.`;
  }
  if (l.turnoDe === null) return '';
  const quien = nombreDe(l, l.turnoDe);
  switch (l.paso) {
    case 'por-tirar': {
      const j = jugadorEn(l, l.turnoDe);
      return j !== null && j.presa >= 0 ? `${quien} decide cómo salir de la Comisaría…` : `${quien} tira…`;
    }
    case 'comprar':
      return `${quien} decide si compra…`;
    case 'almoneda':
      return `${quien} puja…`;
    case 'apuro':
      return `${quien} busca dinero…`;
    case 'por-pasar':
      return l.dobles > 0 ? `${quien} vuelve a tirar…` : `${quien} obra o pasa…`;
    default:
      return `Esperando a ${quien}…`;
  }
}

// ---------------------------------------------------------------------------
// LA CAJA DE LOS TRATOS: lo que hay que contestar, a la vista y sin abrir nada
// ---------------------------------------------------------------------------

/*
 * ═══ AVISO SOBRE LA PALABRA «PREGÓN», QUE AQUÍ SIGNIFICA TRES COSAS ═══
 *
 * 1. `pregon` a secas, en la vista: LA FRASE DE LA MESA («Bea cayó en Calle Mayor y pagó
 *    350 € a Ana»). La da `elPregonEnTres` y la acumula `laCronicaConLaVista`.
 * 2. `pregon` como mazo (`MazoId`): el de SUCESOS. Es uno de los identificadores viejos que
 *    no se tocan, y en pantalla se dice siempre «Sucesos».
 * 3. `pregonDelBurgo`, esto: LA CAJA de las propuestas de trato, que es como se llama el
 *    mueble equivalente en Riberas y por eso se llama igual aquí. En PANTALLA no se llama
 *    así —se llama «Los tratos de la mesa»—, porque «pregón» no está en el vocabulario del
 *    §0 y las tres acepciones a la vez, en la misma pantalla, serían una de más.
 */

/** Cómo se titula la caja en pantalla, y sus dos bloques. Bajan aquí porque los pintan los DOS clientes. */
export const LOS_TRATOS_DE_LA_MESA = 'Los tratos de la mesa';
export const PARA_CONTESTAR = 'Para contestar';
export const LOS_MIOS = 'Tuyos';

/** Una propuesta de trato tal como se pinta en la caja: una tira. */
export interface TiraDelTrato<O extends OpcionQueLlega = OpcionQueLlega> {
  /** El id del trato: su identidad y su llave de lista. */
  readonly id: number;
  readonly de: DuenoVisto;
  readonly a: DuenoVisto;
  /** El color de quien la propone: el raíl de la tira, el mismo de su peón. */
  readonly color: string;
  readonly doy: LadoQueSePinta;
  readonly pido: LadoQueSePinta;
  readonly da: string;
  readonly pide: string;
  /**
   * LA FRASE ENTERA, ESCRITA DESDE DONDE MIRA QUIEN LA LEE: «Ana te ofrece Calle Mayor por
   * 350 €» a quien tiene que contestarla, «Le ofreces a Ana…» a quien la propuso. Es el
   * nombre accesible de la tira, así que dice quién, qué y en qué dirección — que es justo
   * lo que un «trato 3: …» de una lista no decía.
   */
  readonly frase: string;
  /** El renglón de estado con nombre («esperando a Ana») y sin él («esperando»): lo elige el ancho, y el ancho lo sabe el cliente. */
  readonly comoAnda: string;
  readonly comoAndaSinNombre: string;
  readonly soyElDestinatario: boolean;
  readonly soyElProponente: boolean;
  /** Las tres opciones del juego, enteras, o `null` donde no las ofrece. */
  readonly aceptar: O | null;
  readonly rechazar: O | null;
  readonly retirar: O | null;
}

/** Los dos bloques de la caja. Ver `pregonDelBurgo`. */
export interface PregonDelBurgo<O extends OpcionQueLlega = OpcionQueLlega> {
  /** Las que van dirigidas a MÍ y puedo contestar. */
  readonly paraContestar: readonly TiraDelTrato<O>[];
  /** Las que YO he propuesto y siguen en pie. */
  readonly mios: readonly TiraDelTrato<O>[];
  /** «Caducan cuando Ana pase el turno.»: es la regla, y sin ella nadie sabe que corre el reloj. */
  readonly caduca: string;
}

/** La tira de un trato, redactada desde donde mira `yo`. */
function tiraDelTrato<O extends OpcionQueLlega>(l: Lectura, t: TratoQueSePinta, yo: AsientoId, opciones: readonly O[]): TiraDelTrato<O> {
  const de = duenoVisto(l, t.de) ?? { asiento: t.de, nombre: nombreDe(l, t.de), color: '' };
  const a = duenoVisto(l, t.a) ?? { asiento: t.a, nombre: nombreDe(l, t.a), color: '' };
  let aceptar: O | null = null;
  let rechazar: O | null = null;
  let retirar: O | null = null;
  for (const o of opciones) {
    if (esPuerta(o)) continue;
    const c = objeto(o.carga);
    if (c === null || c['trato'] !== t.id) continue;
    if (o.tipo === ACEPTAR) aceptar = o;
    if (o.tipo === RECHAZAR) rechazar = o;
    if (o.tipo === RETIRAR) retirar = o;
  }
  const da = resumenDeLado(t.doy);
  const pide = resumenDeLado(t.pido);
  const soyElDestinatario = t.a === yo;
  const soyElProponente = t.de === yo;
  /*
   * TRES REDACCIONES Y NO UNA CON UN «SI» DENTRO: la misma propuesta se lee distinta según
   * de qué lado de la mesa esté quien la mira, y ésa es justo la información que una lista
   * de resúmenes en tercera persona no daba. «Ana te ofrece» dice que hay que contestar;
   * «Le ofreces a Ana» dice que estás esperando.
   */
  const frase = soyElDestinatario
    ? `${de.nombre} te ofrece ${da} por ${pide}`
    : soyElProponente
      ? `Le ofreces a ${a.nombre} ${da} por ${pide}`
      : `${de.nombre} le ofrece a ${a.nombre} ${da} por ${pide}`;
  /*
   * SIN ACEPTAR, EL RENGLÓN DICE POR QUÉ. Hoy el juego ofrece siempre las dos al
   * destinatario, así que este caso no se da jugando; se escribe igual porque una tira con
   * un solo botón y sin una palabra que lo explique se lee como una tira rota, y porque el
   * día que el reglamento condicione el aceptar, la tira ya lo dirá.
   */
  const comoAnda = soyElDestinatario ? (aceptar === null ? 'todavía no puedes contestar' : 'te toca contestar') : `esperando a ${a.nombre}`;
  const comoAndaSinNombre = soyElDestinatario ? (aceptar === null ? 'no puedes' : 'contesta') : 'esperando';
  return {
    id: t.id,
    de,
    a,
    color: de.color,
    doy: t.doy,
    pido: t.pido,
    da,
    pide,
    frase,
    comoAnda,
    comoAndaSinNombre,
    soyElDestinatario,
    soyElProponente,
    aceptar,
    rechazar,
    retirar,
  };
}

/**
 * ═══ LA CAJA DE LOS TRATOS, O `null` CUANDO NO HAY NADA VIVO QUE ME TOQUE ═══
 *
 * ═══ EL FALLO, Y POR QUÉ NO SE ARREGLA CON UNA SECCIÓN MÁS ═══
 *
 * Un trato del Burgo CADUCA al cambiar el turno (`caducarLosAbiertos`), así que una oferta
 * que sólo se ve abriendo un cajón es una oferta que casi nadie contesta: llega mientras
 * juega otro, no interrumpe nada, y muere sin respuesta. La sección «El trato» de la hoja
 * la enseñaba, pero la hoja vive dentro de un cajón que nace cerrado y que se abre encima
 * del tablero: para contestar hay que abrir, rodar hasta la sección y volver a cerrar.
 *
 * Esto es la caja NO MODAL colgada del pie de la cinta: se ve sin abrir nada, no roba el
 * foco, y no tapa el tablero más que una tira por propuesta. Es el mismo mueble que en
 * Riberas, y por el mismo motivo.
 *
 * ═══ Y CUANDO LA CAJA EXISTE, LA SECCIÓN DE LA HOJA SUELTA SUS BOTONES ═══
 *
 * Los dos muebles pintarían LOS MISMOS objetos, y eso es un movimiento enseñado dos veces:
 * dos «Aceptar el trato de Ana» en la misma pantalla, uno de los cuales sobra sin que nada
 * falle. La regla, y es la de la casa: la cosa desaparece de un sitio exactamente cuando
 * aparece en el otro, y las dos mitades miran EL MISMO dato —`hojaEnTres(v, yo, o, pregon, …)`
 * recibe la caja ya compuesta, no un interruptor—. Con la caja puesta, «El trato» se queda
 * con sus renglones y sin botones; sin caja, los recupera enteros.
 *
 * ═══ POR QUÉ HAY DOS BLOQUES Y NO UNO, AUNQUE EN RIBERAS COINCIDIERAN ═══
 *
 * En Riberas sólo propone quien tiene el turno, así que «para contestar» y «tuyas» no se
 * daban a la vez nunca. Aquí SÍ: `opcionesDelBurgo` deja proponer sin turno AL DUEÑO DEL
 * TURNO, o sea que tres jugadores pueden tener a la vez una propuesta viva hacia el mismo
 * y él tener las tres para contestar mientras las suyas esperan. Los dos bloques son de
 * verdad simultáneos, y por eso van separados y con estados distintos.
 *
 * Los tratos entre OTROS DOS son públicos y no salen aquí: no hay nada que yo pueda hacer
 * con ellos y una tira sin botones en la caja del pie es ruido sobre el tablero. Siguen
 * enteros en los renglones de la sección «El trato», que es donde se leen las cosas que
 * sólo se miran.
 */
export function pregonDelBurgo<O extends OpcionQueLlega>(vista: unknown, yo: QuienMira, opciones: readonly O[]): PregonDelBurgo<O> | null {
  const l = leer(vista);
  if (l === null || yo === null || l.momento !== 'jugando') return null;
  const paraContestar: TiraDelTrato<O>[] = [];
  const mios: TiraDelTrato<O>[] = [];
  for (const t of l.tratos) {
    if (t.a !== yo && t.de !== yo) continue;
    const tira = tiraDelTrato(l, t, yo, opciones);
    if (tira.soyElDestinatario) paraContestar.push(tira);
    else mios.push(tira);
  }
  if (paraContestar.length === 0 && mios.length === 0) return null;
  const dueno = l.duenoDelTurno === null ? null : nombreDe(l, l.duenoDelTurno);
  return {
    paraContestar,
    mios,
    caduca: dueno === null ? 'Caducan al cambiar el turno.' : `Caducan cuando ${dueno} pase el turno.`,
  };
}

/** Las firmas de todo lo que la caja de los tratos pinta. */
function loQuePintaElPregon(pregon: PregonDelBurgo<OpcionQueLlega>): string[] {
  const firmas: string[] = [];
  for (const tira of [...pregon.paraContestar, ...pregon.mios]) {
    if (tira.aceptar !== null) firmas.push(firmaDeLaOpcion(tira.aceptar));
    if (tira.rechazar !== null) firmas.push(firmaDeLaOpcion(tira.rechazar));
    if (tira.retirar !== null) firmas.push(firmaDeLaOpcion(tira.retirar));
  }
  return firmas;
}

// ---------------------------------------------------------------------------
// LA HOJA: las ocho secciones, en orden, con textos y opciones ENTERAS
// ---------------------------------------------------------------------------

export type IdDeSeccion = 'cinta' | 'marcador' | 'ahora' | 'carta' | 'almoneda' | 'trato' | 'mios' | 'mesa';

/** El orden FIJO de las secciones de la hoja (§6.3): los dos clientes lo pintan tal cual. */
export const ORDEN_DE_LA_HOJA: readonly IdDeSeccion[] = ['cinta', 'marcador', 'ahora', 'carta', 'almoneda', 'trato', 'mios', 'mesa'];

export interface SeccionDeLaHoja<O extends OpcionQueLlega = OpcionQueLlega> {
  readonly id: IdDeSeccion;
  readonly titulo: string;
  readonly lineas: readonly string[];
  /** Los botones de la sección, enteros. En «Lo mío» van en las fichas y aquí `[]`. */
  readonly opciones: readonly O[];
  /** Hay algo que enseñar: una sección vacía se pliega. */
  readonly hayAlgo: boolean;
}

export interface CintaDelBurgo {
  /** «Turno de Ana», «Turno de Ana · puja Bea», «La mesa se reúne», «Se acabó». */
  readonly turno: string;
  readonly aviso: string;
  readonly espera: string;
  /** Mi dinero con mi color; vacíos para un mirón. */
  readonly miDinero: string;
  readonly miColor: string;
  readonly meToca: boolean;
}

/** Un barrio de «Lo mío»: sus fichas, con el color de la acera. */
export interface BarrioDeLoMio<O extends OpcionQueLlega = OpcionQueLlega> {
  readonly id: string;
  readonly nombre: string;
  readonly color: string;
  readonly fichas: readonly FichaDeCasilla<O>[];
}

export interface HojaDelBurgo<O extends OpcionQueLlega = OpcionQueLlega> {
  /** Las ocho, en `ORDEN_DE_LA_HOJA`. */
  readonly secciones: readonly SeccionDeLaHoja<O>[];
  readonly cinta: CintaDelBurgo;
  readonly marcador: MarcadorDelBurgo;
  readonly cartel: CartelDelBurgo | null;
  readonly puja: PujaComponible<O> | null;
  readonly trato: TratoComponible<O> | null;
  /** Mis títulos por barrio, cada uno con su ficha y sus obras enteras. */
  readonly mios: readonly BarrioDeLoMio<O>[];
  /** La sección que conviene abrir: la subasta si pujo, «Ahora» en mi apuro, el trato si me proponen y no hay caja, «Ahora» si me toca. */
  readonly abre: IdDeSeccion | null;
}

/** Las opciones que no van a los dados, a las casillas, a la subasta ni a los tratos: los botones del momento. */
function esDelMomento(o: OpcionQueLlega): boolean {
  if (esPuerta(o)) return false;
  if (o.tipo === TIRAR) return false;
  if (esObra(o.tipo)) return false;
  if (o.tipo === PUJAR || o.tipo === PASAR_PUJA) return false;
  if (o.tipo === ACEPTAR || o.tipo === RECHAZAR || o.tipo === RETIRAR) return false;
  return true;
}

/** Lo que se pinta «ahora»: los botones del momento y, en mi apuro, las obras que dan dinero. */
interface LoDelMomento<O extends OpcionQueLlega> {
  /** Empezar, la fianza, el Salvoconducto, el Impuesto, pasar el turno, la quiebra. */
  readonly botones: readonly O[];
  /** Vender e hipotecar, que SUBEN aquí en mi apuro y por eso salen de las fichas de «Lo mío». Vacío el resto del tiempo. */
  readonly obrasDelApuro: readonly O[];
  /** Las dos juntas y en orden: es EXACTAMENTE la lista que se pinta, en la sección o en el carril. */
  readonly todo: readonly O[];
}

/**
 * LO QUE SE PUEDE HACER AHORA MISMO, COMPUESTO UNA SOLA VEZ.
 *
 * Esta lista la pintan DOS muebles —la sección «Ahora» del cajón y el carril de la cinta— y
 * nunca los dos a la vez. Que la compusiera cada uno por su cuenta es exactamente la forma
 * de que un día se separen: bastaría con que alguien añadiera un tipo a `esDelMomento` y no
 * al otro sitio para que el mismo movimiento saliera dos veces, o ninguna, sin un error en
 * ninguna parte. Se compone aquí y los dos reciben LA MISMA lista, por identidad.
 */
function loDelMomento<O extends OpcionQueLlega>(l: Lectura, yo: QuienMira, opciones: readonly O[]): LoDelMomento<O> {
  const botones = opciones.filter(esDelMomento);
  const enMiApuro = yo !== null && l.apuro !== null && l.apuro.quien === yo;
  const obrasDelApuro = enMiApuro ? opciones.filter((o) => !esPuerta(o) && esObra(o.tipo)) : [];
  return { botones, obrasDelApuro, todo: obrasDelApuro.length === 0 ? botones : [...botones, ...obrasDelApuro] };
}

/** Las estaciones y los servicios no tienen barrio: van juntos al final de «Lo mío», con el gris de las estaciones del retablo. */
const SIN_BARRIO = { id: 'sueltos', nombre: 'Estaciones y servicios', color: '#6e6a63' } as const;

function losMios<O extends OpcionQueLlega>(vista: unknown, l: Lectura, yo: QuienMira, opciones: readonly O[]): BarrioDeLoMio<O>[] {
  const j = jugadorEn(l, yo);
  if (j === null) return [];
  const salida: BarrioDeLoMio<O>[] = [];
  const porBarrio: Record<string, FichaDeCasilla<O>[]> = {};
  const sueltas: FichaDeCasilla<O>[] = [];
  for (const casilla of j.titulos) {
    const ficha = fichaDeCasilla(vista, casilla, yo, opciones);
    if (ficha.barrio === null) sueltas.push(ficha);
    else (porBarrio[ficha.barrio.id] = porBarrio[ficha.barrio.id] ?? []).push(ficha);
  }
  for (const b of BARRIOS) {
    const fichas = porBarrio[b.id];
    if (fichas !== undefined && fichas.length > 0) salida.push({ id: b.id, nombre: b.nombre, color: b.color, fichas });
  }
  if (sueltas.length > 0) salida.push({ id: SIN_BARRIO.id, nombre: SIN_BARRIO.nombre, color: SIN_BARRIO.color, fichas: sueltas });
  return salida;
}

function tituloDeLaCinta(l: Lectura): string {
  if (l.momento === 'reuniendo') return 'La mesa se reúne';
  if (l.momento === 'terminada') return 'Se acabó';
  if (l.duenoDelTurno === null) return '';
  const dueno = nombreDe(l, l.duenoDelTurno);
  if (l.turnoDe === null || l.turnoDe === l.duenoDelTurno) return `Turno de ${dueno}`;
  const otro = nombreDe(l, l.turnoDe);
  return l.paso === 'almoneda' ? `Turno de ${dueno} · puja ${otro}` : l.paso === 'apuro' ? `Turno de ${dueno} · ${otro} en apuro` : `Turno de ${dueno} · ${otro}`;
}

function lineasDeAhora(vista: unknown, l: Lectura, yo: QuienMira): string[] {
  const lineas: string[] = [];
  const j = jugadorEn(l, yo);
  if (l.momento === 'reuniendo') {
    lineas.push('Cuando estéis todos, cualquiera puede empezar.');
    return lineas;
  }
  if (l.momento === 'terminada' || j === null) {
    lineas.push(esperaA(vista));
    return lineas;
  }
  if (j.quebrado) {
    lineas.push('Has quebrado: miras la partida desde fuera.');
    return lineas;
  }
  if (l.apuro !== null && l.apuro.quien === yo) {
    lineas.push(`Debes ${maravedies(l.apuro.debe)}.`);
    const faltan = l.apuro.debe - j.mrs;
    /*
     * AQUÍ MISMO, Y NO «EN LO MÍO». El apuro es una cuenta atrás —al tercer tic del reloj
     * el árbitro juega por el ausente y lo quiebra— y mandar a rodar un cajón hasta «Lo
     * mío» y abrir título por título es como se pierde una partida por no llegar a tiempo.
     * Las obras de vender e hipotecar SUBEN a las opciones de esta sección (ver
     * `hojaEnTres`), así que el texto tiene que apuntar a donde están de verdad.
     */
    if (faltan > 0) lineas.push(`Te faltan ${maravedies(faltan)}: vende o hipoteca aquí mismo, o declárate en quiebra.`);
    for (const d of l.apuro.deudas) lineas.push(`${maravedies(d.cuanto)} a ${nombreDe(l, d.a)}.`);
    return lineas;
  }
  if (l.turnoDe === yo) {
    if (l.paso === 'por-tirar') {
      lineas.push(j.presa >= 0 ? `Estás en la Comisaría: intento ${j.presa + 1} de ${INTENTOS_EN_LA_MAZMORRA}.` : 'Te toca tirar.');
    } else if (l.paso === 'comprar') {
      /*
       * EL PASO `comprar` YA NO ES SÓLO COMPRAR. Desde que el Impuesto se paga a elegir
       * (regla 4), la casilla del Impuesto para el turno en este mismo paso y sin ningún
       * título que comprar: la frase de siempre —«compra o sácala a subasta»— era una
       * mentira delante de dos botones que dicen otra cosa. Se decide por la CLASE de la
       * casilla, que es lo que la tabla dice, y no por qué opciones haya llegado, que es
       * lo que un día no coincidiría.
       */
      const fila = filaDe(j.casilla);
      lineas.push(
        fila === null
          ? `Has caído en ${nombreDeCasilla(j.casilla)}.`
          : fila.clase === 'diezmo'
            ? `Has caído en ${fila.nombre}: elige cómo pagarlo.`
            : esTitulo(fila.clase)
              ? `Has caído en ${fila.nombre}: compra o sácala a subasta.`
              : `Has caído en ${fila.nombre}: hay algo que decidir.`,
      );
    } else if (l.paso === 'por-pasar') {
      lineas.push(l.dobles > 0 ? 'Dobles: vuelve a tirar.' : 'Puedes obrar, tratar o pasar el turno.');
    } else if (l.paso === 'almoneda') {
      lineas.push('Te toca pujar: mira la subasta.');
    }
  } else {
    lineas.push(esperaA(vista));
  }
  if (l.tirada !== null && l.paso !== 'por-tirar') {
    lineas.push(`Última tirada: ${l.tirada[0]} y ${l.tirada[1]}${l.tirada[0] === l.tirada[1] ? ' (dobles)' : ''}.`);
  }
  return lineas;
}

function lineasDeLaMesa(l: Lectura): string[] {
  const lineas: string[] = [];
  for (const j of l.jugadores) {
    lineas.push(`${nombreDe(l, j.asiento)}: ${maravedies(j.mrs)} en mano, ${maravedies(j.patrimonio)} de patrimonio${j.quebrado ? ' · quebró' : ''}.`);
  }
  lineas.push(`El Ayuntamiento guarda ${l.concejo.casas} casas y ${l.concejo.posadas} hoteles.`);
  lineas.push(`Quedan ${l.quedan.pregon} cartas en Sucesos y ${l.quedan.arca} en el Fondo Vecinal.`);
  if (l.topeDeVueltas > 0) lineas.push(`Se juega a ${l.topeDeVueltas} ${l.topeDeVueltas === 1 ? 'vuelta' : 'vueltas'}.`);
  return lineas;
}

/**
 * LA HOJA para `yo`: las ocho secciones de §6.3 en orden fijo, cada una con sus
 * textos y sus opciones ENTERAS. Sin `three`, sin React: los dos clientes la pintan
 * con sus widgets y sin lógica propia. La crónica (los pregones de cada vista) no
 * cabe en una sola vista: la acumula el cliente con `laCronicaConLaVista`.
 *
 * ═══ EL CUARTO PARÁMETRO ES LA CAJA DE LOS TRATOS YA COMPUESTA, NO UN INTERRUPTOR ═══
 *
 * Si el cliente pinta la caja (`pregonDelBurgo`), la sección «El trato» se queda con sus
 * renglones y SIN botones: los mismos objetos pintados dos veces son un movimiento
 * enseñado dos veces. Se recibe la caja entera y no un `boolean` por lo mismo que la criba
 * recibe los objetos que se pintan: un interruptor puede quedarse en `true` con la caja sin
 * pintar, y entonces contestar un trato no se puede hacer en ninguna parte de la pantalla,
 * sin un solo error. Sin cuarto parámetro, la hoja es exactamente la de antes.
 *
 * ═══ Y EN MI APURO, VENDER E HIPOTECAR SUBEN A «AHORA» ═══
 *
 * Están en las opciones de la sección, y SALEN de las fichas de «Lo mío» al subir: dejarlas
 * en los dos sitios las contaría dos veces —dos botones «Hipotecar Calle Mayor», uno de
 * ellos de más— y eso es lo que la criba mide. La casilla del anillo las sigue encendiendo:
 * eso no es un segundo botón, es el atajo del que está en «Ahora», igual que la ficha tiene
 * el suyo fuera del apuro.
 *
 * ═══ EL QUINTO PARÁMETRO ES EL CARRIL, Y CON ÉL «AHORA» SUELTA SUS BOTONES ═══
 *
 * Es la misma regla que la caja de los tratos, con el mismo motivo y sobre otra sección: el
 * carril (`carrilDelBurgo`) pinta EXACTAMENTE las opciones de «Ahora», así que con el carril
 * puesto la sección se queda con sus RENGLONES —cuánto debes, a quién, qué toca, la cuenta
 * atrás del apuro, que es información y no un movimiento— y sin un solo botón, y añade un
 * renglón que dice dónde se pulsan. Sin eso habría dos botones para el mismo movimiento y la
 * criba se pondría roja con razón. Y se recibe EL CARRIL, no un `boolean`: un interruptor en
 * `true` con el carril sin pintar deja «Empezar la partida» sin sitio en toda la pantalla.
 * Sin quinto parámetro, la sección es exactamente la de antes.
 */
export function hojaEnTres<O extends OpcionQueLlega>(
  vista: unknown,
  yo: QuienMira,
  opciones: readonly O[],
  pregon: PregonDelBurgo<O> | null = null,
  carril: readonly GlifoDelCarrilDelBurgo<O>[] | null = null,
): HojaDelBurgo<O> {
  const l = leer(vista);
  const marcador = marcadorEnTres(vista, yo);
  if (l === null) {
    const vacia: CintaDelBurgo = { turno: '', aviso: '', espera: '', miDinero: '', miColor: '', meToca: false };
    const secciones: SeccionDeLaHoja<O>[] = ORDEN_DE_LA_HOJA.map((id) => ({ id, titulo: tituloDeSeccion(id), lineas: [], opciones: [], hayAlgo: false }));
    return { secciones, cinta: vacia, marcador, cartel: null, puja: null, trato: null, mios: [], abre: null };
  }
  const j = jugadorEn(l, yo);
  const cartel = cartelEnTres(vista);
  const puja = pujaEnTres(vista, yo, opciones);
  const trato = tratoEnTres(vista, yo, opciones);
  /*
   * En MI apuro las obras que el juego ofrece —vender e hipotecar— suben a «Ahora» y por eso
   * se le quitan a las fichas: `fichaDeCasilla` devuelve las obras de la LISTA QUE RECIBE, y
   * la lista que reciben las fichas es la de siempre menos las que ya tienen botón arriba.
   */
  const enMiApuro = yo !== null && l.apuro !== null && l.apuro.quien === yo;
  const momento = loDelMomento(l, yo, opciones);
  const obrasDelApuro = momento.obrasDelApuro;
  const mios = losMios(vista, l, yo, obrasDelApuro.length === 0 ? opciones : opciones.filter((o) => obrasDelApuro.indexOf(o) < 0));
  const cinta: CintaDelBurgo = {
    turno: tituloDeLaCinta(l),
    aviso: l.aviso,
    espera: esperaA(vista),
    miDinero: j === null ? '' : maravedies(j.mrs),
    miColor: j === null ? '' : j.color,
    meToca: meToca(vista, yo),
  };
  const delTrato: O[] = [];
  if (trato !== null) {
    for (const t of trato.abiertos) {
      if (t.aceptar !== null) delTrato.push(t.aceptar);
      if (t.rechazar !== null) delTrato.push(t.rechazar);
      if (t.retirar !== null) delTrato.push(t.retirar);
    }
  }
  const lineasDelTrato: string[] = [];
  if (trato !== null) {
    for (const t of trato.abiertos) lineasDelTrato.push(`${t.soyElProponente ? 'Tuyo' : `De ${t.de.nombre}`} a ${t.soyElDestinatario ? 'ti' : t.a.nombre}: ${t.resumen}`);
    if (trato.puerta !== null) lineasDelTrato.push(trato.puerta.ayuda);
  }
  /* Con la caja puesta, la sección dice DÓNDE se contesta: los renglones sin botones se leen como una sección rota. */
  if (pregon !== null && lineasDelTrato.length > 0) lineasDelTrato.push(`Se contestan en «${LOS_TRATOS_DE_LA_MESA}». ${pregon.caduca}`);
  const lineasDeLoMio: string[] = [];
  for (const b of mios) for (const f of b.fichas) lineasDeLoMio.push(`${f.nombre} (${b.nombre}): ${f.estado}${f.rentaAhora > 0 ? ` · renta ${maravedies(f.rentaAhora)}` : ''}`);
  if (j !== null && lineasDeLoMio.length === 0) lineasDeLoMio.push('Todavía no tienes ningún título.');
  /*
   * Con el carril puesto, la sección dice DÓNDE se pulsa, igual que «El trato» con la caja:
   * unos renglones que cuentan que debes 500 € y no traen con qué pagarlos se leen como una
   * sección rota, y quien no encuentre el botón buscará en «Lo mío» mientras corre el reloj.
   */
  const lineasDeAhoraMismo = lineasDeAhora(vista, l, yo);
  if (carril !== null && momento.todo.length > 0) lineasDeAhoraMismo.push(`Se pulsan en «${EL_CARRIL_DE_LA_MESA}», sin abrir nada.`);
  const secciones: SeccionDeLaHoja<O>[] = [
    { id: 'cinta', titulo: tituloDeSeccion('cinta'), lineas: [cinta.turno, cinta.aviso].filter((x) => x.length > 0), opciones: [], hayAlgo: true },
    { id: 'marcador', titulo: tituloDeSeccion('marcador'), lineas: marcador.jugadores.map((x) => x.linea), opciones: [], hayAlgo: marcador.jugadores.length > 0 },
    { id: 'ahora', titulo: tituloDeSeccion('ahora'), lineas: lineasDeAhoraMismo, opciones: carril === null ? momento.todo : [], hayAlgo: true },
    {
      id: 'carta',
      titulo: tituloDeSeccion('carta'),
      lineas: cartel === null ? ['Ninguna en este turno.'] : [cartel.titulo, cartel.texto, `La sacó ${cartel.nombre} ${cartel.deDonde}.`],
      opciones: [],
      hayAlgo: cartel !== null,
    },
    {
      id: 'almoneda',
      titulo: tituloDeSeccion('almoneda'),
      lineas: puja === null ? ['Ninguna abierta.'] : puja.lineas,
      opciones: puja === null ? [] : puja.pasar === null ? puja.fijas : [...puja.fijas, puja.pasar],
      hayAlgo: puja !== null,
    },
    {
      id: 'trato',
      titulo: tituloDeSeccion('trato'),
      lineas: lineasDelTrato.length === 0 ? ['Ningún trato abierto.'] : lineasDelTrato,
      opciones: pregon === null ? delTrato : [],
      hayAlgo: trato !== null && (trato.abiertos.length > 0 || trato.puerta !== null),
    },
    { id: 'mios', titulo: tituloDeSeccion('mios'), lineas: lineasDeLoMio, opciones: [], hayAlgo: mios.length > 0 },
    { id: 'mesa', titulo: tituloDeSeccion('mesa'), lineas: lineasDeLaMesa(l), opciones: [], hayAlgo: l.jugadores.length > 0 },
  ];
  /*
   * QUÉ CONVIENE ABRIR. Con la caja de los tratos puesta, «El trato» YA NO se abre sola: lo
   * que había que contestar está a la vista y sin cajón, y abrir un cajón encima del tablero
   * para enseñar lo que ya se ve es el fallo que la caja vino a arreglar. Y en mi apuro se
   * abre «Ahora», que es donde están las obras desde que suben: mandar a «Lo mío» a quien
   * tiene la cuenta atrás encima sería mandarlo al sitio del que se acaban de ir.
   *
   * ═══ EL APURO VA ANTES QUE EL TRATO, Y ANTES ERA AL REVÉS ═══
   *
   * Se podían dar los dos a la vez y nadie lo había mirado: contestar y retirar tratos se
   * ofrecen SIN TURNO y sin mirar el apuro (`opcionesDelBurgo`, el primer bucle), así que
   * quien tiene la cuenta atrás encima puede tener además una propuesta por contestar. Con
   * la rama del trato delante, el cajón le abría «El trato», y las dos cosas que necesita
   * —cuánto debe y a quién— viven en los renglones de «Ahora», que se quedaban plegados.
   *
   * Manda el apuro por dos motivos, y el segundo es el que decide:
   *   · El apuro es el único reloj con final forzoso EN MI CONTRA: al tercer tic el árbitro
   *     juega por el ausente y lo quiebra. Un trato que caduca sólo caduca.
   *   · Y el trato TIENE OTRO MUEBLE a la vista (la caja del pie), mientras que la cuenta de
   *     lo que debo no está en ninguna otra parte de la pantalla. Abrir «El trato» mandaba a
   *     leer dentro del cajón lo que ya se veía fuera, y escondía lo único que sólo está
   *     dentro. Cuando el cliente NO pinta la caja el trato se sigue abriendo solo, pero
   *     detrás del apuro, que es el que tiene una hora marcada.
   */
  let abre: IdDeSeccion | null = null;
  if (puja !== null && puja.meToca) abre = 'almoneda';
  else if (enMiApuro) abre = 'ahora';
  else if (pregon === null && trato !== null && trato.abiertos.some((t) => t.soyElDestinatario && t.aceptar !== null)) abre = 'trato';
  else if (cinta.meToca) abre = 'ahora';
  return { secciones, cinta, marcador, cartel, puja, trato, mios, abre };
}

function tituloDeSeccion(id: IdDeSeccion): string {
  switch (id) {
    case 'cinta':
      return 'La mesa';
    case 'marcador':
      return 'Marcador';
    case 'ahora':
      return 'Ahora';
    case 'carta':
      return 'La carta';
    case 'almoneda':
      return 'La subasta';
    case 'trato':
      return 'El trato';
    case 'mios':
      return 'Lo mío';
    case 'mesa':
      return 'La mesa entera';
    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// LO QUE QUEDA COMO BOTÓN SUELTO
// ---------------------------------------------------------------------------

/** Las firmas de todo lo que la hoja pinta: sus secciones y las fichas de «Lo mío». */
function loQuePintaLaHoja(hoja: HojaDelBurgo<OpcionQueLlega>): string[] {
  const firmas: string[] = [];
  for (const s of hoja.secciones) for (const o of s.opciones) firmas.push(firmaDeLaOpcion(o));
  for (const b of hoja.mios) for (const f of b.fichas) for (const o of f.opciones) firmas.push(firmaDeLaOpcion(o));
  return firmas;
}

/**
 * LAS OPCIONES QUE SE PINTAN COMO BOTONES SUELTOS: lo que ni los dados, ni las
 * casillas tocables, ni la hoja, ni la caja de los tratos, ni el carril recogen. Recibe LOS
 * OBJETOS que se pintan —los mismos que se le dan a la escena, a la hoja, a la caja y a la
 * cinta— y no interruptores, y se aplica DESPUÉS de componerlos: el botón desaparece
 * exactamente cuando el asa, la marca, la sección, la tira o el cuadrado existen. Con `null`
 * en los cinco devuelve todo menos las puertas, que no se pintan nunca: pulsadas no juegan.
 *
 * VA LA ÚLTIMA, SIEMPRE. Es la única de las seis que mira a las otras, y por eso es la única
 * cuyo orden importa: compuesta antes que la hoja o que el carril, quitaría por un mueble que
 * todavía no existe.
 */
export function opcionesFueraDelTablero<O extends OpcionQueLlega>(
  opciones: readonly O[],
  tablero: TableroDelBurgoEn3D | null,
  dados: DadosDelBurgoEn3D | null,
  hoja: HojaDelBurgo<O> | null,
  pregon: PregonDelBurgo<O> | null = null,
  carril: readonly GlifoDelCarrilDelBurgo<O>[] | null = null,
): O[] {
  const firmasDeLaHoja = hoja === null ? [] : loQuePintaLaHoja(hoja as HojaDelBurgo<OpcionQueLlega>);
  const firmasDelPregon = pregon === null ? [] : loQuePintaElPregon(pregon as PregonDelBurgo<OpcionQueLlega>);
  const firmasDelCarril = carril === null ? [] : carril.map((g) => firmaDeLaOpcion(g.opcion));
  return opciones.filter((o) => {
    if (esPuerta(o)) return false;
    /* El asa de los dados existe exactamente cuando `porTirar`: sin asa, tirar vuelve como botón. */
    if (dados !== null && dados.porTirar && o.tipo === TIRAR) return false;
    if (tablero !== null && esObra(o.tipo)) {
      const casilla = casillaDeLaCarga(o.carga);
      if (casilla !== null && tablero.casillas.some((c) => c.indice === casilla && c.tocable)) return false;
    }
    if (hoja !== null && firmasDeLaHoja.indexOf(firmaDeLaOpcion(o)) >= 0) return false;
    if (pregon !== null && firmasDelPregon.indexOf(firmaDeLaOpcion(o)) >= 0) return false;
    if (carril !== null && firmasDelCarril.indexOf(firmaDeLaOpcion(o)) >= 0) return false;
    return true;
  });
}

/**
 * ═══ LAS OBRAS QUE SÓLO TIENE EL ANILLO: LO QUE HAY QUE PINTAR PARA EL TECLADO ═══
 *
 * ═══ EL FALLO, Y DÓNDE ESTABA ESCONDIDO ═══
 *
 * Con el mundo montado, `opcionesFueraDelTablero` quita toda obra cuya casilla esté
 * encendida —porque la marca del acento ya la ofrece— y la hoja recoge las de MIS títulos
 * en sus fichas. Pero COMPRAR y SACAR A SUBASTA no son de un título mío todavía, así que no
 * tienen ficha: se les quitaba el botón suelto y no se les daba ninguno. O sea que comprar
 * —el movimiento principal del juego, el que decide la partida entera— sólo se podía hacer
 * con el ratón sobre el anillo. Con teclado, con lector de pantalla o con el `.glb` a medio
 * cargar, no había forma. Y no fallaba nada: la partición seguía siendo una partición, y el
 * movimiento seguía teniendo su sitio; su sitio era un gesto que no todo el mundo puede hacer.
 *
 * ═══ POR QUÉ UN GEMELO DE SÓLO APOYO Y NO UN BOTÓN EN «AHORA» ═══
 *
 * Se probaron los dos. Subirlas a la sección «Ahora» pone el movimiento en DOS muebles que
 * se pintan a la vez —el botón de la sección y la casilla encendida—, y eso, para las cribas
 * que cuentan por firma, es una opción repetida: `verify:escritorio` la caza y se pone rojo,
 * y tiene razón en cazarla, porque en la pantalla se ven dos sitios donde comprar la misma
 * casilla. Las obras de MIS títulos no caen ahí porque la ficha y la casilla devuelven EL
 * MISMO objeto y la partición las cuenta como un botón y su atajo; comprar no tiene ficha
 * donde ser ese botón.
 *
 * El gemelo de sólo apoyo es la solución que esta casa ya usa para el otro movimiento que
 * vive en un gesto: TIRAR. Los dados son un asa del lienzo, y al lado del lienzo hay un
 * botón fuera de la vista (`clip-path`, NUNCA `display: none`) que manda por la misma
 * puerta. No es un segundo botón: es el mismo, dicho para quien no puede hacer el gesto.
 * Esto devuelve exactamente las obras que están en ese caso, para que el cliente les pinte
 * uno a cada una con su `rotulo`, y ni una más: con `tablero` en `null` no hay anillo que
 * tocar y todas vuelven como botones sueltos, así que aquí no hay ninguna.
 *
 * Recibe la hoja YA COMPUESTA por lo mismo que la criba: lo que decide es si esa obra tiene
 * botón EN ALGÚN SITIO, no de qué tipo es. El día que una obra más se quede sin ficha —o que
 * una ficha desaparezca— esto lo dirá solo, sin que nadie venga a añadir un tipo a una lista.
 *
 * Y EL CARRIL CUENTA COMO SITIO, que es lo que obliga a pasárselo: en mi apuro vender e
 * hipotecar se van de las fichas a «Ahora», y de «Ahora» al carril cuando el carril se pinta.
 * Mirando sólo la hoja, esas obras parecerían no tener botón en ninguna parte y este filtro
 * pediría un gemelo de sólo apoyo para cada una: media docena de botones invisibles de más,
 * cada uno mandando un movimiento que ya tiene su cuadrado a la vista.
 */
export function obrasSoloEnElAnillo<O extends OpcionQueLlega>(
  opciones: readonly O[],
  tablero: TableroDelBurgoEn3D | null,
  hoja: HojaDelBurgo<O> | null,
  carril: readonly GlifoDelCarrilDelBurgo<O>[] | null = null,
): O[] {
  if (tablero === null) return [];
  const conBoton = hoja === null ? [] : loQuePintaLaHoja(hoja as HojaDelBurgo<OpcionQueLlega>);
  if (carril !== null) for (const g of carril) conBoton.push(firmaDeLaOpcion(g.opcion));
  return opciones.filter((o) => {
    if (esPuerta(o) || !esObra(o.tipo)) return false;
    const casilla = casillaDeLaCarga(o.carga);
    if (casilla === null || !tablero.casillas.some((c) => c.indice === casilla && c.tocable)) return false;
    return conBoton.indexOf(firmaDeLaOpcion(o)) < 0;
  });
}

// ---------------------------------------------------------------------------
// EL CARRIL: qué va dentro y qué dice cada cuadrado de 44 puntos
// ---------------------------------------------------------------------------

/**
 * Cómo se llama el carril en pantalla. Baja aquí, con el título de la caja de los tratos y
 * por lo mismo: lo pintan los DOS clientes y lo NOMBRA además la hoja, que manda allí a quien
 * abre «Ahora». Tres redacciones del mismo nombre son tres nombres el día que uno cambie.
 */
export const EL_CARRIL_DE_LA_MESA = 'El carril de la mesa';

/** Lo que se pinta dentro de un cuadrado del carril, y con qué filo. */
export interface GlifoDelCarrilDelBurgo<O extends OpcionQueLlega = OpcionQueLlega> {
  /**
   * LO QUE VA DENTRO DEL CUADRADO: una o dos letras. En 44 puntos no cabe más.
   */
  readonly glifo: string;
  /**
   * EL RÓTULO CORTO, para el renglón de debajo o para el cuadrado ancho: el nombre de seis
   * letras que lleva PINTADA LA CARA de la casilla («Mayor»), la cifra de una puja, o el
   * nombre de la otra persona en un trato. Es el dato que distingue dos cuadrados con el
   * mismo glifo, y sale de donde ya está escrito, no de una tabla nueva.
   */
  readonly rotulo: string;
  /** El rótulo ENTERO del juego («Comprar Calle Mayor por 350 €»): lo que se oye y lo que sale al posar el ratón. */
  readonly ayuda: string;
  /** La casilla de la obra o de la puja, o `null`. */
  readonly casilla: number | null;
  /**
   * EL FILO DEL CUADRADO: el color de la acera del barrio en una obra, y el de la otra
   * persona en un trato. `null` cuando no hay ninguno de los dos. Es un `#rrggbb` porque
   * sale de la misma tabla con la que se pinta esa acera y ese peón, no de un código nuevo.
   */
  readonly color: string | null;
  /** La opción ENTERA, tal como vino: el cliente manda `{ tipo, carga }` y no monta nada. */
  readonly opcion: O;
}

/**
 * ═══ QUÉ HACE CADA CUADRADO DEL CARRIL, DICHO EN UNA O DOS LETRAS ═══
 *
 * ═══ EL FALLO, QUE NO ES EL DE RIBERAS AUNQUE EL MUEBLE SEA EL MISMO ═══
 *
 * En Riberas los botones sueltos se pintaban EN FLUJO por debajo del lienzo, y «debajo» dejó
 * de ser un sitio el día que la partida ocupó la ventana entera: la lista crece hacia abajo,
 * el tablero sube, y lo que hay que pulsar se va fuera de la pantalla. Aquí el fallo es OTRO
 * por el mismo motivo, y está contado entero en la cabecera de `carrilDelBurgo`: los sueltos
 * del Burgo no se quedan debajo —no hay ninguno—, se van a la sección «Ahora», que vive
 * dentro de un cajón que NACE CERRADO. El mueble es el mismo y el remedio también: una tira
 * de cuadrados colgada de la cinta, a la vista, sin abrir nada. Y un cuadrado de 44 puntos no
 * admite «Deshipotecar Avenida de las Acacias (220 €)» dentro.
 *
 * ═══ POR QUÉ EL GLIFO ES EL VERBO Y NO EL DESTINO, AL REVÉS QUE EN RIBERAS ═══
 *
 * En Riberas el carril salía con VEINTE opciones del mismo verbo —mover el estiaje— que sólo
 * se distinguían por a qué isla, y por eso allí el glifo es el número de la isla. Aquí es al
 * contrario: los cuadrados del Burgo son uno a ocho con VERBOS DISTINTOS —empezar, pagar la
 * fianza, el Salvoconducto, las dos formas del Impuesto, pasar el turno, la quiebra, y en el
 * apuro vender e hipotecar título a título—, y lo que hay que saber de un vistazo es cuál es
 * cuál. Así que el glifo es el verbo en dos letras, y lo que separa dos cuadrados del MISMO
 * verbo va donde en Riberas iba la víctima: en el rótulo corto (el nombre de seis letras de
 * la casilla, que está pintado en la cara) y en el filo (el color de la acera de ese barrio,
 * que es el mismo del tablero). Ocho «Ve» seguidos sin decir qué solar se vende no serían un
 * carril: serían ocho maneras de equivocarse mientras corre la cuenta atrás.
 *
 * ═══ LAS DOS LETRAS, Y LAS COLISIONES QUE NO PUEDEN DARSE ═══
 *
 * Las dieciocho son distintas dos a dos, así que en un carril nunca hay dos cuadrados con
 * el mismo glifo y distinto significado. Dos parejas quedan cerca a la vista y se dejan a
 * sabiendas, porque no pueden salir a la vez: «Ps» (pasar en la subasta) sólo existe en el
 * paso `almoneda` y «Pa» (pasar el turno) sólo en `por-pasar`; «Ac» (aceptar) y «Al» (alzar)
 * sí coinciden, y por eso la segunda letra de alzar es la ele y no la a.
 *
 * ═══ UN MOVIMIENTO QUE ESTE CLIENTE NO CONOZCA NO SE QUEDA SIN CUADRADO ═══
 *
 * Cae a las dos primeras letras de su propio rótulo. Un servidor con un movimiento nuevo
 * pinta un cuadrado con algo escrito dentro, no un hueco; y su rótulo entero sigue en
 * `ayuda`, que es lo que se oye.
 *
 * ═══ UNA ENTRADA POR OPCIÓN RECIBIDA, EN ORDEN Y POR IDENTIDAD ═══
 *
 * Esto NO decide qué va al carril: eso lo decide la criba (`opcionesDelCarrilDelBurgo`), y
 * aquí sólo se le pone forma a lo que llega: misma longitud, mismo orden, y `opcion` es EL
 * MISMO objeto por identidad. Un formador que añadiera o quitara sería un sitio más donde un
 * movimiento aparece o se pierde, y nadie lo estaría contando. Lo único que se cae son las
 * puertas, que no se pintan nunca. Por eso esto se puede llamar con CUALQUIER lista —el
 * comprobador le da una fabricada con un movimiento de cada tipo para ver que los dieciocho
 * glifos son distintos dos a dos—, y el mueble de verdad se compone con `carrilDelBurgo`.
 */
const GLIFOS_DEL_CARRIL: Readonly<Record<string, string>> = {
  [EMPEZAR]: 'Em',
  [TIRAR]: 'Ti',
  [PAGAR_FIANZA]: 'Fi',
  [USAR_INDULTO]: 'Sv',
  [COMPRAR]: 'Co',
  [A_ALMONEDA]: 'Su',
  [PUJAR]: 'Pu',
  [PASAR_PUJA]: 'Ps',
  [ALZAR]: 'Al',
  [VENDER]: 'Ve',
  [EMPENAR]: 'Hi',
  [DESEMPENAR]: 'De',
  [ACEPTAR]: 'Ac',
  [RECHAZAR]: 'Re',
  [RETIRAR]: 'Rt',
  [PASAR]: 'Pa',
  [RENDIRSE]: 'Qb',
  /*
   * EL IMPUESTO LLEGA DOS VECES CON EL MISMO TIPO —la cantidad fija y el 10 %—, y lo que
   * las separa está en la carga (`como`), no en el tipo. Sin entrada propia caerían las dos
   * al rótulo entero del juego, que en un cuadrado de 44 puntos es «Pagar el 10 % de tu
   * patrimonio (1.234 €)»: por eso llevan glifo y por eso el rótulo corto sale de `como`.
   */
  [PAGAR_IMPUESTO]: 'Im',
};

/**
 * EL VERBO CORTO de un cuadrado que no obra sobre un título: es el rótulo de debajo.
 *
 * ═══ Y GANA AL NOMBRE DE LA CASILLA, QUE ANTES ERA AL REVÉS Y DEJABA UNA ENTRADA MUERTA ═══
 *
 * `PASAR_PUJA` es el único de esta tabla que llega con casilla en la carga —la de lo que se
 * subasta—, y la rama del nombre de la casilla iba delante: el cuadrado salía «Ps / Acacia»,
 * o sea el verbo dentro y el solar debajo, que se lee como si pasar hiciera algo CON Acacia.
 * La entrada `[PASAR_PUJA]: 'Pasar'` no se alcanzaba nunca, que es la manera silenciosa de
 * tener una tabla que miente. Ahora el verbo declarado manda: lo que hay en esta tabla son
 * movimientos que SON el verbo entero y no una obra sobre un título, y el solar de la subasta
 * sigue dicho donde no estorba —en el filo del cuadrado, que lleva el color de su acera, y en
 * `casilla`, que es lo que el cliente usa para señalarla—. Al lado, las pujas fijas dicen su
 * CIFRA y no el solar, por lo mismo: en una subasta todos los cuadrados son de la misma
 * casilla, y repetirla ocho veces no distingue nada.
 */
const VERBOS_DEL_CARRIL: Readonly<Record<string, string>> = {
  [EMPEZAR]: 'Empezar',
  [TIRAR]: 'Tirar',
  [PAGAR_FIANZA]: 'Fianza',
  [USAR_INDULTO]: 'Salvoconducto',
  [PASAR_PUJA]: 'Pasar',
  [PASAR]: 'Pasar',
  [RENDIRSE]: 'Quiebra',
};

function glifoDe(o: OpcionQueLlega): string {
  const suyo = GLIFOS_DEL_CARRIL[o.tipo];
  if (suyo !== undefined) return suyo;
  const rotulo = o.rotulo.trim();
  return rotulo.length === 0 ? '?' : rotulo.slice(0, 2);
}

/** El otro lado de un trato: de quién es la propuesta que contesto, o a quién se la hice. */
function elOtroDelTrato(l: Lectura, o: OpcionQueLlega, yo: AsientoId | null): DuenoVisto | null {
  if (o.tipo !== ACEPTAR && o.tipo !== RECHAZAR && o.tipo !== RETIRAR) return null;
  const c = objeto(o.carga);
  if (c === null) return null;
  const id = c['trato'];
  for (const t of l.tratos) {
    if (t.id !== id) continue;
    return duenoVisto(l, t.de === yo ? t.a : t.de);
  }
  return null;
}

/** LOS CUADRADOS DEL CARRIL, uno por opción recibida que no sea puerta, en orden y con la opción entera. */
export function glifosDelCarrilDelBurgo<O extends OpcionQueLlega>(
  vista: unknown,
  yo: QuienMira,
  opciones: readonly O[],
): readonly GlifoDelCarrilDelBurgo<O>[] {
  const l = leer(vista);
  const salida: GlifoDelCarrilDelBurgo<O>[] = [];
  for (const o of opciones) {
    if (esPuerta(o)) continue;
    const casilla = casillaDeLaCarga(o.carga);
    const fila = casilla === null ? null : filaDe(casilla);
    const otro = l === null ? null : elOtroDelTrato(l, o, yo);
    const carga = objeto(o.carga);
    const cuanto = carga === null ? null : carga['cuanto'];
    const como = carga === null ? null : carga['como'];
    /*
     * EL ORDEN DE ESTAS RAMAS ES LA DECISIÓN, y por eso el verbo declarado va DELANTE del
     * nombre de la casilla: ver la cabecera de `VERBOS_DEL_CARRIL`. Detrás quedan, por este
     * orden, la otra persona de un trato, la cifra de una puja, la forma del Impuesto, el
     * nombre de seis letras de la casilla, y el rótulo entero del juego como último recurso.
     */
    const verbo = VERBOS_DEL_CARRIL[o.tipo] ?? '';
    let rotulo: string;
    if (verbo.length > 0) rotulo = verbo;
    else if (otro !== null) rotulo = otro.nombre;
    else if (o.tipo === PUJAR && typeof cuanto === 'number') rotulo = maravedies(cuanto);
    else if (o.tipo === PAGAR_IMPUESTO) rotulo = como === 'decima' ? '10 %' : 'Fijo';
    else if (fila !== null) rotulo = fila.rotulo;
    else rotulo = o.rotulo;
    salida.push({
      glifo: glifoDe(o),
      rotulo,
      ayuda: o.rotulo,
      casilla,
      color: otro !== null ? otro.color : fila === null ? null : colorDelBarrioDe(fila),
      opcion: o,
    });
  }
  return salida;
}

/**
 * ═══ QUÉ VA AL CARRIL: LA CRIBA, QUE ES LA QUE DECIDE ═══
 *
 * Va LO DEL MOMENTO, que es exactamente lo que pinta la sección «Ahora» de la hoja: los
 * botones que no obran sobre un título —empezar, la fianza, el Salvoconducto, las dos formas
 * del Impuesto, pasar el turno, la quiebra— y, en MI APURO, vender e hipotecar, que suben
 * ahí desde las fichas porque el apuro es una cuenta atrás. Es `loDelMomento`, la misma
 * lista y por identidad, para que los dos muebles no puedan discrepar.
 *
 * Devuelve `[]` cuando la vista no es del Burgo o no se puede leer: un carril vacío no se
 * pinta, y eso es distinto de un carril que no se compuso.
 */
export function opcionesDelCarrilDelBurgo<O extends OpcionQueLlega>(vista: unknown, yo: QuienMira, opciones: readonly O[]): readonly O[] {
  const l = leer(vista);
  return l === null ? [] : loDelMomento(l, yo, opciones).todo;
}

/**
 * ═══ EL CARRIL DEL BURGO: LO QUE PUEDO HACER AHORA MISMO, SIN ABRIR NADA ═══
 *
 * ═══ EL FALLO, Y POR QUÉ NO ES EL DE RIBERAS AUNQUE EL MUEBLE SEA EL MISMO ═══
 *
 * En Riberas el fallo era que los botones sueltos se pintaban EN FLUJO por debajo del lienzo,
 * y «debajo» dejó de ser un sitio cuando la partida ocupó la ventana entera. En El Burgo el
 * fallo es OTRO por el mismo motivo: aquí los sueltos no se quedan debajo —no hay ninguno—,
 * se van a la sección «Ahora», y «Ahora» vive dentro del cajón modal, que NACE CERRADO y no
 * tiene por qué abrirse. O sea que lo que hay que pulsar está detrás de un «≡». Con una mesa
 * recién abierta eso llega a ser una partida que no arranca: «Empezar la partida» es una
 * opción del momento, y está plegada.
 *
 * El carril es la sección «Ahora» PUESTA A LA VISTA: lo que puedo hacer ahora mismo, sin
 * abrir nada.
 *
 * ═══ Y ESTO ES LO QUE ESTABA MAL MEDIDO, CON SU NÚMERO ═══
 *
 * El carril se escribió antes que esta decisión y se le daba de comer `opcionesFueraDelTablero`.
 * Un contador sobre las 16.660 vistas de las tres partidas del comprobador dio esto:
 *
 *     opcionesFueraDelTablero(...).length  →  {"0": 16660}
 *
 * CERO, SIEMPRE, y no por las semillas: los dados se llevan tirar, el anillo las obras, «La
 * subasta» las pujas, la caja de los tratos los tres del trato, y lo del momento se iba a
 * «Ahora». El carril recibía `[]` en todas y cada una de las vistas de tres partidas
 * enteras, y su cabecera describía un fallo que no podía darse. Tres de sus cuatro vacunas
 * empezaban por `carril.length === 0 ||`, o sea que se daban por buenas sin mirar nada: verde
 * por filtro vacío, que se lee igual que verde por vigilancia. Ahora el comprobador cuenta
 * CUÁNTAS VISTAS TUVIERON AL MENOS UN CUADRADO y exige un mínimo: si el carril vuelve a
 * quedarse sin nada que pintar, se ve rojo.
 *
 * ═══ EL ORDEN, Y POR QUÉ NO ES UN INTERRUPTOR ═══
 *
 *     const carril = carrilDelBurgo(vista, yo, opciones);
 *     const hoja   = hojaEnTres(vista, yo, opciones, pregon, carril);
 *
 * Primero el carril, y la hoja lo recibe ENTERO. Con el carril puesto, «Ahora» se queda con
 * sus renglones —el estado, la cuenta atrás, lo que pasa ahora, que es información y no un
 * movimiento— y suelta sus botones, y dice dónde están; exactamente como «El trato» cuando se
 * pinta la caja. Sin eso habría dos botones para el mismo movimiento, y la criba se pondría
 * roja con razón. Un `boolean` en lugar del objeto es el fallo de siempre: se queda en `true`
 * con el carril sin pintar, y entonces empezar la partida no se puede hacer en ninguna parte
 * de la pantalla sin un solo error en ninguna consola.
 *
 * El cliente que NO pinte el carril —el retablo del móvil, una pantalla sin sitio— pasa
 * `null` y todo vuelve a la sección, que es donde estaba.
 */
export function carrilDelBurgo<O extends OpcionQueLlega>(
  vista: unknown,
  yo: QuienMira,
  opciones: readonly O[],
): readonly GlifoDelCarrilDelBurgo<O>[] {
  return glifosDelCarrilDelBurgo(vista, yo, opcionesDelCarrilDelBurgo(vista, yo, opciones));
}

// ---------------------------------------------------------------------------
// LA CRÓNICA: el pregón de cada vista, acumulado sin repetir
// ---------------------------------------------------------------------------

/** Un renglón de la crónica: la frase de la mesa de una jugada. */
export interface RenglonDeLaCronica {
  /** La jugada de la que salió: su identidad y su llave de lista. */
  readonly jugada: number;
  readonly texto: string;
}

/** Cuántos renglones se guardan. Cuarenta es lo que cabía en la crónica de la app antes de que esto existiera. */
export const TOPE_DE_LA_CRONICA = 40;

/**
 * ═══ LA CRÓNICA, QUE ES LO ÚNICO QUE NO CABE EN UNA VISTA ═══
 *
 * El pregón es el relato de la partida —«Bea cayó en Calle Mayor y pagó 350 € a Ana»— y la
 * vista trae SÓLO EL ÚLTIMO: el estado del juego no puede llevar histórico (hay un tope de
 * 512 KiB por estado y un presupuesto por movimiento), así que quien quiera el relato tiene
 * que acumularlo. Eso es cosa del cliente, y por eso lo hacían los clientes: la app se lo
 * escribió a mano y el escritorio no lo tiene. Dos acumuladores distintos sobre el mismo
 * dato son dos relatos que un día contarán la partida de dos maneras.
 *
 * ═══ SE APUNTA POR JUGADA, NO POR TEXTO DISTINTO ═══
 *
 * La app comparaba el pregón con el anterior y sólo apuntaba si CAMBIABA. Con eso, dos
 * sucesos iguales seguidos —dos «Ana tira», dos cobros idénticos— eran uno solo en el
 * relato: el segundo desaparecía sin que nadie lo notara. La `jugada` sube con cada cambio
 * de estado y es única por vista, así que un renglón por jugada es exacto: un sondeo que
 * trae la misma vista no añade nada, y dos jugadas con la misma frase son dos renglones,
 * que es lo que pasó de verdad.
 *
 * Lo que no se puede recuperar es lo que el sondeo se saltó: si entre dos lecturas pasaron
 * tres jugadas, la crónica tiene la última y no las otras dos. Está dicho aquí para que
 * nadie lea un hueco como un fallo; lo que sí se anima —los sucesos— tiene su propio camino
 * en `sucesosEnTres`, que sabe derivar la lista gruesa.
 *
 * ═══ DEVUELVE LA MISMA LISTA POR IDENTIDAD CUANDO NO HAY NADA NUEVO ═══
 *
 * Como `sucesosEnTres` con la lista de la vista, y por lo mismo: cada respuesta del sondeo
 * es una vista nueva, y una copia igual en cada sondeo repintaría la crónica entera cada
 * pocos segundos. Si la `jugada` va HACIA ATRÁS, esto no es la misma partida —otra mesa,
 * una mesa recién abierta— y la crónica empieza de cero en vez de mezclar dos relatos.
 */
export function laCronicaConLaVista(
  cronica: readonly RenglonDeLaCronica[],
  vista: unknown,
  tope: number = TOPE_DE_LA_CRONICA,
): readonly RenglonDeLaCronica[] {
  const l = leer(vista);
  if (l === null) return cronica;
  const cabeza = cronica.length > 0 ? cronica[0] : undefined;
  const cuantos = Number.isInteger(tope) && tope > 0 ? tope : TOPE_DE_LA_CRONICA;
  if (cabeza !== undefined && cabeza.jugada > l.jugada) {
    return l.pregon.length === 0 ? [] : [{ jugada: l.jugada, texto: l.pregon }];
  }
  if (l.pregon.length === 0) return cronica;
  if (cabeza !== undefined && cabeza.jugada === l.jugada) return cronica;
  return [{ jugada: l.jugada, texto: l.pregon }, ...cronica].slice(0, cuantos);
}

// ---------------------------------------------------------------------------
// Textos
// ---------------------------------------------------------------------------

const CARDINALES: readonly string[] = ['cero', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce'];

/** «dos», «seis»; en cifra a partir de trece. */
export function cardinal(n: number): string {
  const entero = Math.trunc(n);
  const palabra = CARDINALES[entero];
  return palabra === undefined || entero < 0 ? String(entero) : palabra;
}
