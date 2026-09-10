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
 * Cuatro sitios pueden enseñar una opción, y cada una va a UNO:
 *
 *   · LOS DADOS (`dadosEnTres`): TIRAR. El asa del lienzo.
 *   · LAS CASILLAS TOCABLES (`tableroEnTres` → `tocable`, y `obraPosibleEnCasilla` al
 *     tocar): las obras de esa casilla —comprar, sacar a subasta, alzar, vender,
 *     hipotecar, deshipotecar—. La marca del acento se enciende donde hay algo que hacer.
 *   · LA HOJA (`hojaEnTres`): las pujas fijas y el pasar de la subasta, contestar y
 *     retirar tratos, y los botones del momento —tirar cuando no hay dados, pagar la
 *     fianza, usar el Salvoconducto, pasar el turno, declararse en quiebra, empezar—. En «Lo
 *     mío» cada título lleva su FICHA con sus obras: son LOS MISMOS objetos que la
 *     casilla tocable abre al tocarla (una sola → se manda; varias → «¿qué haces
 *     aquí?»), así que la obra tiene UN botón, el de la ficha, y un atajo, la casilla.
 *   · LOS BOTONES SUELTOS (`opcionesFueraDelTablero`): lo que no cupo en ninguno de
 *     los tres porque ese objeto no se pintó. Recibe LOS OBJETOS que se pintan —no
 *     interruptores— y se aplica DESPUÉS de componerlos: al revés `porTirar` sería
 *     siempre falso y nadie podría tirar en toda la tarde sin un error en ninguna parte.
 *
 * Las puertas no se pintan nunca como botón: pulsadas mandan una declaración y lo mejor
 * que puede pasar es que el reductor conteste con un motivo.
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
 *     compongan la hoja y los dados.
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
  maravedies,
  PASAR_PUJA,
  PROPONER,
  PUJAR,
  RECHAZAR,
  RETIRAR,
  TIRAR,
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
import type { CasillaDelBurgo, ClaseDeCasilla, MazoId } from './burgo-tablero';

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
  /** Las líneas de la tarjeta, redactadas. */
  readonly lineas: readonly string[];
  /** TODAS sus opciones, enteras: las mismas que la casilla tocable abre. */
  readonly opciones: readonly O[];
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
 */
export function fichaDeCasilla<O extends OpcionQueLlega>(vista: unknown, casilla: number, yo: QuienMira, opciones: readonly O[]): FichaDeCasilla<O> {
  const l = leer(vista);
  const fila = filaDe(casilla) ?? (CASILLAS[0] as CasillaDelBurgo);
  const t = l === null ? null : tituloEn(l, casilla);
  const barrio = fila.clase === 'solar' ? barrioDe(casilla) : null;
  const dueno = l === null || t === null ? null : jugadorEn(l, t.dueno);
  const seCompra = fila.clase === 'solar' || fila.clase === 'puerta' || fila.clase === 'oficio';
  const estado = l === null ? (seCompra ? 'Del Ayuntamiento' : '') : estadoDeLaCasilla(l, fila, t);
  const lineas: string[] = [];
  if (barrio !== null) lineas.push(`Barrio: ${barrio.nombre}`);
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
  /** La sección que conviene abrir ahora: la subasta si pujo, el trato si me proponen, «Lo mío» en mi apuro, «Ahora» si me toca. */
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
    if (faltan > 0) lineas.push(`Te faltan ${maravedies(faltan)}: vende o hipoteca en «Lo mío», o declárate en quiebra.`);
    for (const d of l.apuro.deudas) lineas.push(`${maravedies(d.cuanto)} a ${nombreDe(l, d.a)}.`);
    return lineas;
  }
  if (l.turnoDe === yo) {
    if (l.paso === 'por-tirar') {
      lineas.push(j.presa >= 0 ? `Estás en la Comisaría: intento ${j.presa + 1} de ${INTENTOS_EN_LA_MAZMORRA}.` : 'Te toca tirar.');
    } else if (l.paso === 'comprar') {
      lineas.push(`Has caído en ${nombreDeCasilla(j.casilla)}: compra o sácala a subasta.`);
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
 * cabe en una sola vista: la acumula el cliente con `elPregonEnTres`.
 */
export function hojaEnTres<O extends OpcionQueLlega>(vista: unknown, yo: QuienMira, opciones: readonly O[]): HojaDelBurgo<O> {
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
  const mios = losMios(vista, l, yo, opciones);
  const cinta: CintaDelBurgo = {
    turno: tituloDeLaCinta(l),
    aviso: l.aviso,
    espera: esperaA(vista),
    miDinero: j === null ? '' : maravedies(j.mrs),
    miColor: j === null ? '' : j.color,
    meToca: meToca(vista, yo),
  };
  const ahora = opciones.filter(esDelMomento);
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
  const lineasDeLoMio: string[] = [];
  for (const b of mios) for (const f of b.fichas) lineasDeLoMio.push(`${f.nombre} (${b.nombre}): ${f.estado}${f.rentaAhora > 0 ? ` · renta ${maravedies(f.rentaAhora)}` : ''}`);
  if (j !== null && lineasDeLoMio.length === 0) lineasDeLoMio.push('Todavía no tienes ningún título.');
  const secciones: SeccionDeLaHoja<O>[] = [
    { id: 'cinta', titulo: tituloDeSeccion('cinta'), lineas: [cinta.turno, cinta.aviso].filter((x) => x.length > 0), opciones: [], hayAlgo: true },
    { id: 'marcador', titulo: tituloDeSeccion('marcador'), lineas: marcador.jugadores.map((x) => x.linea), opciones: [], hayAlgo: marcador.jugadores.length > 0 },
    { id: 'ahora', titulo: tituloDeSeccion('ahora'), lineas: lineasDeAhora(vista, l, yo), opciones: ahora, hayAlgo: true },
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
      opciones: delTrato,
      hayAlgo: trato !== null && (trato.abiertos.length > 0 || trato.puerta !== null),
    },
    { id: 'mios', titulo: tituloDeSeccion('mios'), lineas: lineasDeLoMio, opciones: [], hayAlgo: mios.length > 0 },
    { id: 'mesa', titulo: tituloDeSeccion('mesa'), lineas: lineasDeLaMesa(l), opciones: [], hayAlgo: l.jugadores.length > 0 },
  ];
  let abre: IdDeSeccion | null = null;
  if (puja !== null && puja.meToca) abre = 'almoneda';
  else if (trato !== null && trato.abiertos.some((t) => t.soyElDestinatario && t.aceptar !== null)) abre = 'trato';
  else if (l.apuro !== null && l.apuro.quien === yo && yo !== null) abre = 'mios';
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
 * casillas tocables, ni la hoja recogen. Recibe LOS OBJETOS que se pintan —los
 * mismos que se le dan a la escena y a la hoja— y no interruptores, y se aplica
 * DESPUÉS de componerlos: el botón desaparece exactamente cuando el asa, la marca o
 * la sección existen. Con `null` en los tres devuelve todo menos las puertas, que no
 * se pintan nunca: pulsadas no juegan.
 */
export function opcionesFueraDelTablero<O extends OpcionQueLlega>(
  opciones: readonly O[],
  tablero: TableroDelBurgoEn3D | null,
  dados: DadosDelBurgoEn3D | null,
  hoja: HojaDelBurgo<O> | null,
): O[] {
  const firmasDeLaHoja = hoja === null ? [] : loQuePintaLaHoja(hoja as HojaDelBurgo<OpcionQueLlega>);
  return opciones.filter((o) => {
    if (esPuerta(o)) return false;
    /* El asa de los dados existe exactamente cuando `porTirar`: sin asa, tirar vuelve como botón. */
    if (dados !== null && dados.porTirar && o.tipo === TIRAR) return false;
    if (tablero !== null && esObra(o.tipo)) {
      const casilla = casillaDeLaCarga(o.carga);
      if (casilla !== null && tablero.casillas.some((c) => c.indice === casilla && c.tocable)) return false;
    }
    if (hoja !== null && firmasDeLaHoja.indexOf(firmaDeLaOpcion(o)) >= 0) return false;
    return true;
  });
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
