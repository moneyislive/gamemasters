/**
 * EL BARRIO DE LA NOCHE: la ciudad de «El Quiebro», sacada entera de (código, noche).
 *
 * ═══ UNA FUNCIÓN PURA, Y LO QUE ESO COMPRA ═══
 *
 * `barrioDeLaNoche(código, noche)` devuelve TODO lo que el barrio es para el juego: las cajas con
 * las que se choca, las zonas donde nace y se imprime la gente, los límites de cada fase, las
 * cabinas, el grafo por el que navegan los NPC, la red de aceras por la que andan los durmientes y
 * el adorno que tiene que verse igual en todos los aparatos —el tiempo, la hora, el nombre, los
 * rótulos, el horario del tren—. No recibe la calidad del aparato, ni la vista de la mesa, ni
 * cuántos juegan: la plaza de 48 o de 60 es un LÍMITE que el barrio declara y que la sala elige,
 * no otro barrio.
 *
 * Nada de esto viaja por el cable. Como cuenta `mundo.ts`, lo que viaja es lo que ya viajaba —el
 * código de la mesa y el número de noche, que están en la vista— y el barrio se deriva con esta
 * misma función en el servidor, en el escritorio, en el WebView de la app y en el iPhone. Que
 * salga lo mismo en todos es lo que vigila `verify:quiebro-barrio`, en Node y en Hermes.
 *
 * ═══ LA TRAZA: TRES POR TRES MANZANAS Y CUATRO CALLES POR EJE ═══
 *
 * Origen en el centro de la glorieta, `x` al este y `z` al sur (el norte es −z, como en
 * `mundo.ts`). Por cada eje, de fuera a dentro:
 *
 *     −80 −78     −66         −30 −18          18  30          66     78  80
 *      │cerco│calle│  manzana  │calle│ glorieta │calle│  manzana  │calle│cerco│
 *            ├─12──┼──── 36 ───┼─12──┼─── 36 ───┼─12──┼──── 36 ───┼─12──┤
 *
 * 3 × 36 + 4 × 12 = 156 m. Cada calle tiene acera de 3, calzada de 6 y acera de 3, con la calzada
 * centrada en ±24 o ±72, y se cruzan en 16 cruces. Fuera de ±78 empieza la ciudad que no se
 * juega: fachadas y, donde sigue una calle, una valla —las calles cortadas, tras las que pasa el
 * tráfico que pinta el cliente—. Ese cerco SÍ es estructura: contra él se estampa igual que
 * contra un quiosco, y cierra el barrio sin que la sala tenga que inventarse una pared.
 *
 * ═══ LA ACERA POR BANDAS: POR QUÉ NADA ESTORBA, POR CONSTRUCCIÓN Y NO POR SUERTE ═══
 *
 * Todo lo que se pone en la calle se pone a una DISTANCIA `d` de la línea de solar (la fachada),
 * medida hacia la calzada, y cada cosa tiene su banda:
 *
 *     d ≤ 0 .............. el solar: los edificios y los pilares de sus soportales
 *     0 < d < 2,25 ....... la acera libre: por d = 1 andan los durmientes (±0,375 en cuadrilla)
 *     2,25 ≤ d ≤ 2,75 .... farolas y postes de cabina
 *     2,25 ≤ d ≤ 3,75 .... quioscos de prensa, montados sobre el bordillo
 *     3,25 ≤ d ≤ 5 ....... coches aparcados, y en un solo lado de cada tramo
 *
 * Y a lo largo de cada tramo, contando desde donde empieza el solar, cada cosa tiene sus sitios:
 * farolas a 6, 18 y 30 (alternando de acera), cabinas a 12 o 24, quioscos a 15 o 21, coches de
 * 6 a 28,5; la calzada de los cruces y los 9 m que salen de ellos quedan libres. Ningún par se
 * puede pisar, así que no hace falta sortear y descartar —que es cuadrático, y deja la duda de
 * cuántos descartes caben en 3 ms—, y los durmientes andan por d = 1 sin mirar nada. La glorieta
 * sigue la misma idea con su propia plantilla (ver `levantarLaGlorieta`). `verify:quiebro-barrio`
 * no se fía de nada de esto y lo mide en 200 barrios.
 *
 * ═══ LO QUE PUEDE SALIR, DICHO UNA VEZ ═══
 *
 * Como cada cosa de la calle y de la plaza tiene sus pocos sitios fijos, dónde puede ir cada una lo
 * dice UNA función (`sitioDeCoche`, `sitioDePilar`…), y la usan dos: la noche, para poner la que le
 * toca, y el grafo de navegación, para esquivarlas todas a la vez (ver `GRAFO_DEL_BARRIO`). Así el
 * grafo sabe lo que puede estorbar en cualquier noche sin que nadie lo copie a mano.
 *
 * ═══ CUARTOS DE METRO ═══
 *
 * Toda medida del barrio es un múltiplo de 0,25 m. Es más de lo que pide el contrato (0,05), y a
 * propósito: un cuarto es exacto en binario y en Q16.16 (16.384), así que `arenaDe` pasa cada caja
 * a coma fija sin redondear, y sumar, restar o partir por dos una medida no deja un último bit que
 * un aparato redondee hacia un lado y otro hacia el otro.
 *
 * ═══ EL AZAR, POR ASPECTOS ═══
 *
 * Cada aspecto —el tiempo, los edificios, los rótulos, las calles, la glorieta, las cabinas, los
 * semáforos, el tren— tira de su propio chorro, sembrado con `CÓDIGO#noche#aspecto`. Con un solo
 * chorro, añadir un rótulo movería todos los edificios que se sortearan después; así, tocar un
 * aspecto no revuelve los demás, y cualquier barrio se reproduce con sus dos datos.
 *
 * ═══ LA PLAZA DESPEJADA: LA MESA QUITA, EL BARRIO DICE QUÉ ═══
 *
 * La contramedida «Plaza despejada» de la Memoria del Sistema saca la glorieta con menos cajas. El
 * barrio sigue siendo función de (código, noche) —quién pide despejar es la mesa, no la noche—, así
 * que cada caja dice si es `despejable` y `despejarLaPlaza` la quita y renumera todo lo que apunta a
 * una caja por su índice. La sala (por el productor) y el cliente llaman a la misma función cuando
 * la vista trae la contramedida, y ven la misma plaza.
 *
 * ═══ LO QUE NO ESTÁ ═══
 *
 *   · LOS DURMIENTES: viven en `quiebro-durmientes.ts` y andan por la red de aceras de aquí.
 *   · Las ventanas encendidas, las grietas, el tráfico en marcha y la gente de fondo, que son
 *     adorno de cada aparato. Lo que tienen que compartir —la `semilla` de cada fachada para las
 *     ventanas, el horario del tren— sí está.
 *   · Las cajas `baja` (las que se saltan) y el Bis estructural: son de la fase 2, y entran el día
 *     que alguien las produzca y alguien las lea, no antes.
 */
import { sembrar, siguiente } from '../../mecanicas/azar';
import type { Azar } from '../../mecanicas/azar';
import { deNumero, UNO } from '../../mecanicas/fijo';
import type { CajaDeLaLiza, CLASE_DE_CAJA, GrafoDelMundo, LimiteDelMundo, MundoDeLaLiza, SitioDeNacer, ZonaDelMundo } from '../../mecanicas/liza/declaracion';
import type { Casilla, Cuerpo, MundoDeclarado } from '../../mecanicas/mundo';
import { semillaDelCodigo } from '../../mecanicas/semilla';

/* ─── Las medidas de la traza ─────────────────────────────────────────────── */

/** El lado del solar de una manzana, en metros. */
export const LADO_DE_MANZANA = 36;
/** El ancho de una calle entera: acera, calzada y acera. */
export const ANCHO_DE_CALLE = 12;
export const ANCHO_DE_ACERA = 3;
export const ANCHO_DE_CALZADA = 6;
/** De borde a borde del barrio jugable: 3 × 36 + 4 × 12. */
export const LADO_DEL_BARRIO = 156;
/** La mitad: el barrio va de −78 a 78 en los dos ejes. */
export const MEDIO_BARRIO = 78;
/** Lo que mide de grueso el cerco de fachadas y vallas que cierra el barrio. */
export const GROSOR_DEL_CERCO = 2;

/** Los ejes de las cuatro calles de cada sentido: el centro de su calzada. */
export const EJES_DE_CALLE: readonly number[] = [-72, -24, 24, 72];
/** Dónde empieza el solar de cada una de las tres filas (o columnas) de manzanas. */
export const SOLARES: readonly number[] = [-66, -18, 30];
/**
 * Los carriles de los durmientes: a un metro de cada línea de solar, por la acera. Dos por calle
 * (uno a cada lado), así que un durmiente que sigue un carril y llega a una calle la cruza por un
 * paso de cebra que está justo ahí.
 */
export const CARRILES: readonly number[] = [-77, -67, -29, -19, 19, 29, 67, 77];

/** La manzana del centro, la de la plaza. Índice de fila por tres más columna. */
export const LA_GLORIETA = 4;

/** El lado de una casilla del mundo declarado, en metros (lo fija la arquitectura). */
export const LADO_DE_CASILLA = 2;
/**
 * Cuántas casillas hay del centro al borde de lo pisable. Con casillas de 2 m centradas en los
 * pares, la 39 va de 77 a 79: la última que toca el barrio. Lo que queda entre 78 y 79 está bajo
 * el cerco, así que nadie llega a pisarlo.
 */
export const CASILLAS_DEL_CENTRO_AL_BORDE = 39;

/*
 * Las bandas de la acera (ver la cabecera), en metros desde la línea de solar hacia la calzada.
 */
const D_MOBILIARIO = 2.25;
const D_FAROLA_HASTA = 2.75;
const D_QUIOSCO_HASTA = 3.75;
const D_COCHE = 3.25;
const D_COCHE_HASTA = 5;
/** Dónde se planta quien descuelga, y la franja de su zona: a un metro del poste de la cabina. */
const D_SITIO_DE_CABINA = 1.5;
const D_ZONA_DE_CABINA: readonly [number, number] = [1.25, 1.75];
/** El centro del poste de una cabina y de una farola. */
const D_POSTE = 2.5;

const LARGO_DE_COCHE = 4.5;
/** Dónde puede empezar un coche aparcado, contado desde el principio del solar. */
const SITIOS_DE_COCHE: readonly number[] = [6, 12, 18, 24];
/** Dónde van las farolas de la acera menor y de la mayor: alternan, cada 12 m. */
const FAROLAS_DE_LA_ACERA_MENOR: readonly number[] = [6, 30];
const FAROLAS_DE_LA_ACERA_MAYOR: readonly number[] = [18];
const SITIOS_DE_CABINA: readonly number[] = [12, 24];
const SITIOS_DE_QUIOSCO: readonly number[] = [15, 21];

/** Las plantas de los edificios: la baja es alta, como en cualquier ensanche. */
const ALTO_DE_LA_PLANTA_BAJA = 4.5;
const ALTO_DE_UNA_PLANTA = 3;
/** Lo que se mete el soportal bajo la fachada, y cada cuánto lleva un pilar. */
export const FONDO_DEL_SOPORTAL = 3;
const PILARES_DEL_SOPORTAL_CADA = 4;
/** Lo que se retranquean las plantas de arriba, en el primer escalón y en el segundo. */
const RETRANQUEOS: readonly number[] = [2, 4];

/** La distancia mínima y máxima, por calles, de una cabina de la Llamada al centro. */
export const CABINA_MAS_CERCA = 60;
export const CABINA_MAS_LEJOS = 110;

/** El semáforo de cada cruce: 30 s para los que cruzan en un sentido y 30 para el otro. */
export const TICS_DEL_SEMAFORO = 1200;
export const TICS_EN_VERDE = 600;

/** El radio con que se anda el grafo de navegación: el de una persona del juego. */
export const RADIO_DEL_GRAFO = 0.35;
/** Cuántos nudos del grafo son cruces (los primeros) y cuántas aristas son tramos de calle (las primeras). */
export const CRUCES_DEL_GRAFO = 16;
export const TRAMOS_DEL_GRAFO = 24;

/* ─── Los tipos ───────────────────────────────────────────────────────────── */

/** Un punto del barrio, en metros. */
export interface Punto {
  readonly x: number;
  readonly z: number;
}

/** Un rectángulo alineado con los ejes, en metros. `x0 < x1` y `z0 < z1`. */
export interface Rectangulo {
  readonly x0: number;
  readonly z0: number;
  readonly x1: number;
  readonly z1: number;
}

/** Hacia dónde mira una fachada. El rumbo de cada una es el de `RUMBO_DE_LA_CARA`. */
export type Cara = 'norte' | 'este' | 'sur' | 'oeste';

/** Por dónde corre algo: a lo largo de `x` (este-oeste) o de `z` (norte-sur). */
export type Eje = 'x' | 'z';

/** El rumbo de la tabla de 256 (0 al norte, creciendo hacia el este) al que mira cada cara. */
export const RUMBO_DE_LA_CARA: Readonly<Record<Cara, number>> = { norte: 0, este: 64, sur: 128, oeste: 192 };

/** Qué es cada caja, para pintarla y para contar contra qué se estampó alguien. */
export type TipoDeCaja =
  | 'edificio'
  | 'pilar-de-soportal'
  | 'fachada-exterior'
  | 'valla'
  | 'fuente'
  | 'quiosco'
  | 'banco'
  | 'pilar-del-tren'
  | 'farola'
  | 'coche'
  | 'quiosco-de-prensa'
  | 'cabina';

/**
 * La clase de una caja. En la v1 todo es `alta`: no se salta, para la vista y para al que empujan.
 * `baja` (vallas y capós que se saltan) es de la fase 2 y no se escribe hasta que alguien la lea.
 */
export type ClaseDeCaja = 'alta';

/**
 * UNA CAJA DE LA ESTRUCTURA: lo que para a quien anda, a quien empujan y a la vista.
 *
 * `alto` es para quien pinta y para la cámara (que no atraviesa lo que tapa); `mira` es el rumbo
 * (0-255) al que da su frente —el de un coche, el de un banco, el del cristal de un quiosco, el
 * brazo de una farola sobre la calzada—, y 0 en lo que no tiene frente (edificios, pilares, la
 * fuente). `edificio` es el índice del edificio al que pertenece, para que la grieta de un
 * estampado sepa en qué fachada va; `null` en lo que no es de ninguno. `despejable` es lo que quita
 * la contramedida «Plaza despejada» (`despejarLaPlaza`): los coches aparcados junto a la plaza y
 * los bancos de su borde, que es contra lo que más se estampa y lo que menos hace de plaza.
 */
export interface CajaDelBarrio extends Rectangulo {
  readonly tipo: TipoDeCaja;
  readonly clase: ClaseDeCaja;
  readonly alto: number;
  readonly mira: number;
  readonly edificio: number | null;
  readonly despejable: boolean;
}

/** Una manzana: su solar y lo que hay en él. `edificios` son índices de `Barrio.edificios`. */
export interface ManzanaDelBarrio {
  readonly indice: number;
  readonly columna: number;
  readonly fila: number;
  readonly solar: Rectangulo;
  readonly tipo: 'glorieta' | 'edificada';
  readonly edificios: readonly number[];
}

export type EstiloDeFachada = 'ladrillo' | 'revoco' | 'piedra' | 'azulejo' | 'hormigon' | 'vidrio';
const ESTILOS: readonly EstiloDeFachada[] = ['ladrillo', 'revoco', 'piedra', 'azulejo', 'hormigon', 'vidrio'];

/** Qué hay en la planta baja de una fachada. */
export type PlantaBaja = 'tiendas' | 'portales' | 'soportal';

/**
 * UNA FACHADA: un lado del edificio que da a la calle. Los que dan a otro edificio de la manzana
 * son medianeras y no se listan. `linea` es la coordenada de la fachada (`z` en las caras norte y
 * sur, `x` en las este y oeste) y `desde`/`hasta` lo que ocupa a lo largo del otro eje: el de las
 * plantas de arriba, que vuelan sobre el soportal. La planta baja de una fachada vecina a un
 * soportal es 3 m más corta; lo que mide de verdad lo dice la caja del edificio.
 */
export interface FachadaDelEdificio {
  readonly cara: Cara;
  readonly linea: number;
  readonly desde: number;
  readonly hasta: number;
  readonly bajo: PlantaBaja;
}

/**
 * Un tramo de alturas. El primero es la planta baja; el segundo, el cuerpo del edificio; los que
 * siguen, si los hay, se meten `entrante` metros desde cada fachada: son los retranqueos.
 */
export interface TramoDeAltura {
  readonly plantas: number;
  readonly desde: number;
  readonly hasta: number;
  readonly entrante: number;
}

/**
 * UN EDIFICIO. `huella` es su solar (las plantas de arriba vuelan sobre el soportal); su caja de
 * choque es la de la planta baja, que se mete `FONDO_DEL_SOPORTAL` en la cara que lo tenga.
 * `semilla` es para que todos los aparatos enciendan las mismas ventanas; `vano` es cada cuánto
 * hay una.
 */
export interface EdificioDelBarrio {
  readonly indice: number;
  readonly manzana: number;
  readonly huella: Rectangulo;
  readonly tramos: readonly TramoDeAltura[];
  readonly alto: number;
  readonly estilo: EstiloDeFachada;
  readonly tono: number;
  readonly vano: number;
  readonly balcones: boolean;
  readonly semilla: number;
  readonly fachadas: readonly FachadaDelEdificio[];
  readonly soportal: Cara | null;
  /** Su caja en `Barrio.cajas`, y las de los pilares de su soportal. */
  readonly caja: number;
  readonly pilares: readonly number[];
}

/**
 * Un lado de un tramo de calle. `linea` es la línea de solar de ese lado y `hacia` el sentido en
 * que queda la calzada vista desde ella (+1 o −1 sobre el eje perpendicular a la calle).
 */
export interface LadoDeCalle {
  readonly linea: number;
  readonly hacia: 1 | -1;
  readonly frente: 'manzana' | 'glorieta' | 'borde';
  readonly manzana: number | null;
}

/**
 * UN TRAMO DE CALLE: lo que hay entre dos cruces. `eje` es por dónde corre la calle, `centro` la
 * coordenada de su calzada en el otro eje, y `desde`/`hasta` lo que ocupan a lo largo los solares
 * de sus dos lados (la calzada sigue 6 m más por cada punta, hasta los cruces). `lados[0]` es el
 * de la coordenada menor. `aparca` dice en qué lado hay coches aparcados, si hay.
 */
export interface TramoDeCalle {
  readonly indice: number;
  readonly eje: Eje;
  readonly centro: number;
  readonly desde: number;
  readonly hasta: number;
  readonly cruces: readonly [number, number];
  readonly lados: readonly [LadoDeCalle, LadoDeCalle];
  readonly aparca: 0 | 1 | null;
}

/**
 * UNA CABINA: el poste con su marquesina, el sitio donde se planta quien descuelga (a un metro del
 * poste, en la acera) y su zona. Las dos distancias son POR CALLES desde el centro de la glorieta
 * —metros de `x` más metros de `z`, que es como se mide andando por una cuadrícula— hasta el sitio:
 *
 *   · `distancia`: rodeando las manzanas enteras, por aceras y calzadas. Es la ruta de siempre, y
 *     lo más que se anda contando a quien anda como un punto: con los 0,35 m de radio de una
 *     persona, doblar por fuera la esquina de una manzana cuesta 0,7 m más, ida y vuelta.
 *   · `atajando`: lo menos que se puede andar, si cada fachada del camino tuviera soportal y se
 *     atajara por debajo. La noche no pone tantos, así que se anda algo entre las dos.
 *
 * Una candidata vale para la Llamada si `atajando` ≥ 60 y `distancia` ≤ 110: así la carrera cae en
 * los 60-110 m del diseño hagan lo que hagan los soportales (ver `distanciaPorCalles`).
 */
export interface CabinaDelBarrio {
  readonly id: string;
  readonly poste: Punto;
  readonly mira: number;
  readonly caja: number;
  readonly sitio: Punto;
  readonly zona: string;
  readonly distancia: number;
  readonly atajando: number;
}

/**
 * Las clases de zona. `aparicion`: por donde entra el Sistema durante las oleadas —los cuatro cruces
 * que rodean la plaza y las ocho bocas de calle que salen de ellos—; de ahí se reimprime un Celador
 * y cerca de ahí se elige al durmiente que se vuelve Prestado. `aparicion-lejana`: los doce cruces
 * de fuera, a 50 m o más, que sólo tienen sentido cuando se juega en el barrio entero (la Llamada):
 * un Prestado que saliera de ahí en una oleada tardaría quince segundos en llegar. `impresion`:
 * dentro de la plaza, donde cae la columna de glifos de un Celador. `cabina` y `refugio`: donde se
 * descuelga y donde se reaparece.
 */
export type ClaseDeZona = 'aparicion' | 'aparicion-lejana' | 'impresion' | 'cabina' | 'refugio';

/**
 * UNA ZONA. Contrato: CUALQUIER punto de su caja es un sitio donde cabe una persona (radio
 * 0,35 m) sin tocar ninguna caja. La sala puede sortear dentro sin preguntar nada más.
 */
export interface ZonaDelBarrio {
  readonly id: string;
  readonly clase: ClaseDeZona;
  readonly caja: Rectangulo;
}

/** Los límites de fase, que son una regla de la sala y no una pared. */
export type IdDeLimite = 'glorieta48' | 'glorieta60' | 'barrio';
export interface LimiteDelBarrio {
  readonly id: IdDeLimite;
  readonly caja: Rectangulo;
}

/** Un sitio para nacer, en metros, y el rumbo (0-255) al que se mira. */
export interface SitioDelBarrio {
  readonly x: number;
  readonly z: number;
  readonly rumbo: number;
}

/** Dónde nace cada papel: los desvelados al empezar, y quien reaparece en la cabina de refugio. */
export interface NacePorPapel {
  readonly desvelado: readonly SitioDelBarrio[];
  readonly refugio: readonly SitioDelBarrio[];
}

/**
 * Una arista del grafo: une dos nudos en línea recta y a lo largo de un eje, así que `largo` es
 * exacto. Las `TRAMOS_DEL_GRAFO` primeras son las calles de cruce a cruce y `tramo` dice cuál
 * (`Barrio.calles[tramo]`); las demás son de la rejilla de navegación y llevan `null`.
 */
export interface AristaDelGrafo {
  readonly a: number;
  readonly b: number;
  readonly largo: number;
  readonly tramo: number | null;
}

/**
 * EL GRAFO POR EL QUE NAVEGAN LOS NPC (ver `GRAFO_DEL_BARRIO`). Los `CRUCES_DEL_GRAFO` primeros
 * nudos son los cruces (`fila × 4 + columna`), y detrás va la rejilla de navegación: por las
 * aceras, las calzadas y la plaza. Toda arista se anda en recta con el radio de una persona en
 * CUALQUIER noche, también con la plaza despejada.
 */
export interface GrafoDelBarrio {
  readonly nudos: readonly Punto[];
  readonly aristas: readonly AristaDelGrafo[];
}

/**
 * Un tramo de la red de aceras: entre dos nudos vecinos de la rejilla de carriles. Si es un
 * `paso`, cruza una calzada por un paso de cebra y `cruce` es el cruce cuyo semáforo lo manda.
 */
export interface TramoDeAcera {
  readonly a: number;
  readonly b: number;
  readonly eje: Eje;
  readonly tipo: 'acera' | 'paso';
  readonly cruce: number | null;
  readonly largo: number;
}

/**
 * LA RED DE ACERAS: la rejilla de 8 × 8 carriles (`CARRILES` en los dos ejes; nudo `j × 8 + i`),
 * sus 112 tramos (64 de ellos, pasos de cebra: cuatro por cruce) y el desfase de cada uno de los
 * 16 semáforos. Por aquí andan los durmientes y aquí pinta el cliente las cebras.
 */
export interface RedDeAceras {
  readonly carriles: readonly number[];
  readonly nudos: readonly Punto[];
  readonly tramos: readonly TramoDeAcera[];
  readonly semaforos: readonly number[];
}

/**
 * EL TREN ELEVADO. Cruza la glorieta por un viaducto de `desde` a `hasta` (de fachada a fachada:
 * sale de un edificio y se mete en el de enfrente, como en una maqueta) a `alto` metros, a lo
 * largo de `eje` y por la `linea` del otro eje. Pasa cada `cadaTics`, con su `desfaseTics`, en su
 * `sentido`. Los pilares son estructura y están en `pilares` (índices de caja).
 */
export interface TrenDelBarrio {
  readonly eje: Eje;
  readonly linea: number;
  readonly desde: number;
  readonly hasta: number;
  readonly alto: number;
  readonly largo: number;
  readonly pilares: readonly number[];
  readonly cadaTics: number;
  readonly desfaseTics: number;
  readonly sentido: 1 | -1;
}

export type Tiempo = 'llovizna' | 'aguacero' | 'niebla';

/**
 * UN RÓTULO. `tienda` es el de encima de un escaparate, plano sobre la pared de la planta baja
 * (la de dentro del soportal, si lo hay); `neon` es una banderola vertical en las plantas de
 * arriba. `x`, `z` es su centro sobre ese plano, `y` su altura y `ancho` lo que ocupa a lo largo;
 * `color` es 0xRRGGBB. Un rótulo de tienda cabe ENTERO en la pared de su planta baja: no cuelga
 * sobre el hueco del soportal de la cara de al lado.
 */
export interface RotuloDelBarrio {
  readonly texto: string;
  readonly clase: 'tienda' | 'neon';
  readonly color: number;
  readonly edificio: number;
  readonly cara: Cara;
  readonly x: number;
  readonly z: number;
  readonly y: number;
  readonly ancho: number;
  readonly alto: number;
  readonly parpadea: boolean;
}

/** Lo que se ve y no decide nada, pero tiene que salir igual en todos los aparatos. */
export interface AdornoDelBarrio {
  readonly tiempo: Tiempo;
  readonly hora: { readonly h: number; readonly m: number };
  /** «Glorieta del Relojero». */
  readonly nombre: string;
  /** «Glorieta del Relojero, 3:12»: lo que sale en la Bajada. */
  readonly rotulo: string;
  readonly rotulos: readonly RotuloDelBarrio[];
}

/** EL BARRIO ENTERO. Ver la cabecera del fichero. */
export interface Barrio {
  /** El código en mayúsculas y la noche ya normalizada: con esto se vuelve a sacar todo. */
  readonly codigo: string;
  readonly noche: number;
  readonly semilla: number;
  /** Si ya se le quitaron las cajas despejables (`despejarLaPlaza`). `barrioDeLaNoche` da `false`. */
  readonly plazaDespejada: boolean;
  readonly manzanas: readonly ManzanaDelBarrio[];
  readonly edificios: readonly EdificioDelBarrio[];
  readonly calles: readonly TramoDeCalle[];
  readonly cajas: readonly CajaDelBarrio[];
  /** Las cuatro candidatas de la Llamada, una por cuadrante: NE, SE, SO, NO. */
  readonly cabinas: readonly CabinaDelBarrio[];
  readonly refugio: CabinaDelBarrio;
  readonly zonas: readonly ZonaDelBarrio[];
  readonly limites: readonly LimiteDelBarrio[];
  readonly nace: NacePorPapel;
  readonly grafo: GrafoDelBarrio;
  readonly aceras: RedDeAceras;
  readonly tren: TrenDelBarrio;
  readonly adorno: AdornoDelBarrio;
}

/* ─── El vocabulario de la madrugada ──────────────────────────────────────── */

/*
 * Todo inventado y en castellano: el registro local es lo que aleja al barrio de cualquier ciudad
 * de película. Nada de marcas, ni de las vetadas ni de las que no lo están. Vive aquí y no en
 * `quiebro-nombres.ts` porque no son nombres del juego sino de la ciudad, y los sortea la semilla
 * de cada noche (lo dice también la cabecera de aquél). Y ninguno repite un nombre del juego: ni
 * el bar del lobby de la fase 2, ni un nivel de noche.
 */

/** Lo que sigue a «Glorieta» en el nombre del barrio. */
export const NOMBRES_DE_GLORIETA: readonly string[] = [
  'del Relojero', 'de los Faroleros', 'del Sereno', 'de la Estrella', 'del Tranvía',
  'de las Tres Cruces', 'del Organillero', 'de los Afiladores', 'de la Lechera', 'del Carbonero',
  'de las Hilanderas', 'del Cartero', 'de la Veleta', 'de las Palomas', 'del Barquillero',
  'de la Tahona', 'del Linotipista', 'de la Aguadora', 'del Botijero', 'de los Traperos',
  'del Campanero', 'de la Luna', 'del Pregonero', 'de las Cigarreras', 'del Vidriero',
  'de los Tintoreros', 'del Guardagujas', 'de la Costurera',
];

/** Los rótulos de escaparate. Salen barajados y sin repetirse dentro de un barrio. */
export const ROTULOS_DE_TIENDA: readonly string[] = [
  'Churros 24 h', 'Lavandería La Estrella', 'Farmacia de guardia', 'Bar Casa Tino',
  'Mercería Rosi', 'Ultramarinos Pepe', 'Relojería Antúnez', 'Estanco', 'Loterías La Suerte',
  'Frutería Vega', 'Peluquería Maribel', 'Droguería El Sol', 'Bar La Esquina', 'Horno San Blas',
  'Copistería', 'Zapatería Luján', 'Locutorio', 'Taberna El Farol', 'Asador La Brasa',
  'Tintorería Ideal', 'Ferretería Olmo', 'Papelería Gómez', 'Cerrajero 24 h', 'Mesón El Candil',
  'Autoservicio Marisa', 'Bodega Los Arcos', 'Pollos asados', 'Cafetería Nocturna',
  'Óptica Cristal', 'Floristería Azahar', 'Herboristería', 'Bar La Parada',
];

/** Las banderolas de neón de las plantas de arriba. */
export const ROTULOS_DE_NEON: readonly string[] = [
  'Pensión Oriente', 'Hostal Lucero', 'Hotel Continental', 'Sala Marte', 'Bingo Imperial',
  'Discoteca Nébula', 'Hostal La Paloma', 'Pensión Los Faroles', 'Recreativos Júpiter',
  'Hotel Ribera', 'Cine Avenida', 'Club Medianoche', 'Hostal Madrugada', 'Pensión El Sereno',
  'Radio Taxi', 'Academia de Baile',
];

/**
 * Los colores de los rótulos, con el magenta repetido para que mande (el diseño lo reserva para
 * ellos). Ni ámbar, que es de lo del jugador, ni verde-cian, que es del código.
 */
const COLORES_DE_ROTULO: readonly number[] = [0xff2bd6, 0xff2bd6, 0xff2bd6, 0xff5fa2, 0xff5fa2, 0xb05cff, 0xff3b3b, 0x4f7dff];

/* ─── El azar ─────────────────────────────────────────────────────────────── */

/**
 * UN CHORRO DE AZAR: el `mulberry32` de `azar.ts`, sembrado con una cadena y servido como objeto.
 *
 * Que tenga estado no rompe la pureza de nadie, por lo mismo que `azarDelBurgo`: se crea dentro de
 * quien lo usa (`barrioDeLaNoche`, el guion de `quiebro-durmientes.ts`), muere con él, y la misma
 * cadena da siempre la misma sucesión.
 *
 * ═══ Y POR QUÉ SACA VARIOS NÚMEROS DE CADA TIRADA ═══
 *
 * Un barrio pide unos 800 enteros pequeños —¿tiendas o portales?, ¿hay coche en este sitio?—, y
 * cada `enteroEntre` de `azar.ts` son tres objetos nuevos y sus números en caja: medido, un barrio
 * dejaba 700 kB de basura, y el barrido de la memoria joven que eso provoca caía dentro de la
 * primera derivación de cada proceso. Así que cada tirada de `siguiente` da 32 bits, y de ellos se
 * sacan enteros por restos sucesivos (el resto entre `n` es el entero; el cociente, lo que queda)
 * mientras quepan al menos 16 bits más de los que pide el siguiente: el sesgo de cada entero es
 * menor que 1/65.536. Con eso la segunda derivación, que es lo que corre siempre en Hermes (no
 * tiene compilador en marcha), pasó de 0,84 a 0,44 ms. Las cuentas son restos y cocientes de
 * enteros menores que 2^32, exactos en cualquier motor.
 */
export interface ChorroDeAzar {
  entero(minimo: number, maximo: number): number;
  /** ¿Sale? Con `porCiento` probabilidades de cien. */
  sale(porCiento: number): boolean;
  uno<T>(lista: readonly T[]): T;
  barajados<T>(lista: readonly T[]): T[];
}

/** 2^32: lo que da de sí una tirada. */
const CABIDA_DE_UNA_TIRADA = 4294967296;
/** Lo que tiene que sobrar además de lo que se pide para no volver a tirar: 16 bits. */
const HOLGURA_DEL_CHORRO = 65536;

export function chorroDeAzar(clave: string): ChorroDeAzar {
  let azar: Azar = sembrar(semillaDelCodigo(clave));
  let resto = 0;
  let cabida = 1;
  const entero = (minimo: number, maximo: number): number => {
    const n = maximo - minimo + 1;
    if (n <= 1) return minimo;
    if (cabida < n * HOLGURA_DEL_CHORRO) {
      const tirada = siguiente(azar);
      azar = tirada.azar;
      resto = tirada.valor * CABIDA_DE_UNA_TIRADA;
      cabida = CABIDA_DE_UNA_TIRADA;
    }
    const r = resto % n;
    resto = (resto - r) / n;
    cabida = Math.floor(cabida / n);
    return minimo + r;
  };
  return {
    entero,
    sale: (porCiento: number): boolean => entero(0, 99) < porCiento,
    uno: <T>(lista: readonly T[]): T => lista[entero(0, lista.length - 1)] as T,
    barajados: <T>(lista: readonly T[]): T[] => {
      /* Fisher-Yates, como `barajar` de `azar.ts`, pero tirando de este chorro. */
      const copia = lista.slice();
      for (let i = copia.length - 1; i > 0; i--) {
        const j = entero(0, i);
        const alto = copia[i] as T;
        copia[i] = copia[j] as T;
        copia[j] = alto;
      }
      return copia;
    },
  };
}

/**
 * LA CLAVE DE UNA NOCHE: `CÓDIGO#noche`. El código va en mayúsculas (`qwxyz` y `QWXYZ` son la
 * misma mesa, como en `semilla.ts`) y la noche entera: lo que no sea un número finito es la 0, y
 * los decimales se truncan. `|| 0` quita el −0, que no se escribe igual que el 0 en todas partes.
 */
export function claveDeLaNoche(codigo: string, noche: number): string {
  return `${codigo.toUpperCase()}#${String(normalizarLaNoche(noche))}`;
}

/** La noche entera: lo que no es un número finito es la 0, los decimales se truncan, y sin −0. */
export function normalizarLaNoche(noche: number): number {
  return Number.isFinite(noche) ? Math.trunc(noche) || 0 : 0;
}

/**
 * EL TIC QUE SE PREGUNTA, ya entero. Un tic que no es un número finito LANZA: `NaN` pasaba por
 * todas las cuentas de módulo sin decir nada y dejaba a los 48 durmientes en el origen —dentro de
 * la fuente— y los semáforos cerrados en los dos sentidos. Un tic con decimales se redondea hacia
 * abajo, que es en el tic en que se está.
 */
export function ticDelBarrio(tic: number): number {
  if (!Number.isFinite(tic)) throw new RangeError(`El tic tiene que ser un número finito, y llegó ${String(tic)}.`);
  return Math.floor(tic);
}

/** El resto que no se vuelve negativo: el de las fases de los relojes. */
function modulo(a: number, n: number): number {
  return ((a % n) + n) % n;
}

/**
 * CONGELA UN DATO ENTERO, con todo lo que cuelga de él.
 *
 * Lo que no depende de la noche —la traza de las calles, el cerco, las farolas de las aceras, lo
 * fijo de la glorieta, el catálogo, el grafo, la red de aceras, las zonas de siempre— se monta UNA
 * vez al cargar el módulo y todos los barrios lo comparten. Compartir sólo es seguro si nadie puede
 * tocarlo: un `readonly` lo dice el compilador, y esto lo dice el motor. Tocar un barrio compartido
 * lanza en vez de estropear en silencio todos los barrios que vengan detrás.
 */
function congelado<T>(valor: T): T {
  if (typeof valor !== 'object' || valor === null || Object.isFrozen(valor)) return valor;
  Object.freeze(valor);
  for (const clave of Object.keys(valor)) congelado((valor as Record<string, unknown>)[clave]);
  return valor;
}

/* ─── La geometría de las calles ──────────────────────────────────────────── */

/**
 * Un rectángulo puesto en una calle: `a0..a1` a lo largo de ella y `d0..d1` metros desde la línea
 * de solar de un lado hacia la calzada.
 */
function rectanguloEnLaCalle(eje: Eje, lado: LadoDeCalle, a0: number, a1: number, d0: number, d1: number): Rectangulo {
  const p = lado.linea + lado.hacia * d0;
  const q = lado.linea + lado.hacia * d1;
  const p0 = Math.min(p, q);
  const p1 = Math.max(p, q);
  return eje === 'x' ? { x0: a0, z0: p0, x1: a1, z1: p1 } : { x0: p0, z0: a0, x1: p1, z1: a1 };
}

function puntoEnLaCalle(eje: Eje, lado: LadoDeCalle, a: number, d: number): Punto {
  const p = lado.linea + lado.hacia * d;
  return eje === 'x' ? { x: a, z: p } : { x: p, z: a };
}

/** El rumbo de ir por el eje PERPENDICULAR a una calle en sentido `s` (+1 o −1). */
function rumboDeTravesDe(eje: Eje, s: number): number {
  if (eje === 'x') return s > 0 ? 128 : 0;
  return s > 0 ? 64 : 192;
}

/** El rumbo de ir A LO LARGO de una calle en sentido `s`. */
function rumboALoLargoDe(eje: Eje, s: number): number {
  if (eje === 'x') return s > 0 ? 64 : 192;
  return s > 0 ? 128 : 0;
}

function caja(r: Rectangulo, tipo: TipoDeCaja, alto: number, mira: number, edificio: number | null, despejable = false): CajaDelBarrio {
  return { x0: r.x0, z0: r.z0, x1: r.x1, z1: r.z1, tipo, clase: 'alta', alto, mira, edificio, despejable };
}

function cuadrado(x: number, z: number, medio: number): Rectangulo {
  return { x0: x - medio, z0: z - medio, x1: x + medio, z1: z + medio };
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  LO QUE NO DEPENDE DE LA NOCHE: se monta al cargar el módulo, congelado
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Las nueve manzanas sin sus edificios: índice, fila, columna y solar. */
const SOLARES_DE_MANZANA: readonly { readonly indice: number; readonly columna: number; readonly fila: number; readonly solar: Rectangulo }[] = congelado(
  ((): { indice: number; columna: number; fila: number; solar: Rectangulo }[] => {
    const salida: { indice: number; columna: number; fila: number; solar: Rectangulo }[] = [];
    for (let fila = 0; fila < 3; fila++) {
      for (let columna = 0; columna < 3; columna++) {
        const x0 = SOLARES[columna] as number;
        const z0 = SOLARES[fila] as number;
        salida.push({ indice: fila * 3 + columna, columna, fila, solar: { x0, z0, x1: x0 + LADO_DE_MANZANA, z1: z0 + LADO_DE_MANZANA } });
      }
    }
    return salida;
  })(),
);

/**
 * EL CERCO: los cuatro lados del barrio, de 78 a 80, partidos en fachadas (frente a cada fila de
 * manzanas) y vallas (donde sigue una calle). Los lados norte y sur llegan a ±80 y se quedan las
 * esquinas; el este y el oeste paran en ±78, para que ninguna caja pise otra.
 */
const CAJAS_DEL_CERCO: readonly CajaDelBarrio[] = congelado(
  ((): CajaDelBarrio[] => {
    const salida: CajaDelBarrio[] = [];
    const tramos: { desde: number; hasta: number; valla: boolean }[] = [];
    for (let k = 0; k < 4; k++) {
      const eje = EJES_DE_CALLE[k] as number;
      tramos.push({ desde: eje - 6, hasta: eje + 6, valla: true });
      if (k < 3) tramos.push({ desde: SOLARES[k] as number, hasta: (SOLARES[k] as number) + LADO_DE_MANZANA, valla: false });
    }
    const dentro = MEDIO_BARRIO;
    const fuera = MEDIO_BARRIO + GROSOR_DEL_CERCO;
    for (const t of tramos) {
      const tipo: TipoDeCaja = t.valla ? 'valla' : 'fachada-exterior';
      const alto = t.valla ? 1.5 : 18;
      const d0 = t.desde === -dentro ? -fuera : t.desde;
      const d1 = t.hasta === dentro ? fuera : t.hasta;
      salida.push(caja({ x0: d0, z0: -fuera, x1: d1, z1: -dentro }, tipo, alto, RUMBO_DE_LA_CARA.sur, null));
      salida.push(caja({ x0: d0, z0: dentro, x1: d1, z1: fuera }, tipo, alto, RUMBO_DE_LA_CARA.norte, null));
      salida.push(caja({ x0: dentro, z0: t.desde, x1: fuera, z1: t.hasta }, tipo, alto, RUMBO_DE_LA_CARA.oeste, null));
      salida.push(caja({ x0: -fuera, z0: t.desde, x1: -dentro, z1: t.hasta }, tipo, alto, RUMBO_DE_LA_CARA.este, null));
    }
    return salida;
  })(),
);

/** Qué hay al otro lado de una línea de solar: la manzana de esa fila y columna, o el cerco. */
function ladoDeCalle(linea: number, hacia: 1 | -1, fila: number, columna: number): LadoDeCalle {
  if (fila < 0 || fila > 2 || columna < 0 || columna > 2) return { linea, hacia, frente: 'borde', manzana: null };
  const m = fila * 3 + columna;
  return { linea, hacia, frente: m === LA_GLORIETA ? 'glorieta' : 'manzana', manzana: m };
}

type TramoTrazado = Omit<TramoDeCalle, 'aparca'>;

/**
 * LOS 24 TRAMOS, TRAZADOS: primero los 12 de las calles que corren a lo largo de `x` (calle a calle
 * de norte a sur, tramo a tramo de oeste a este), luego los 12 que corren a lo largo de `z`. Los
 * cruces van numerados `fila × 4 + columna`. Lo único que la noche les añade es dónde se aparca.
 */
const CALLES_TRAZADAS: readonly TramoTrazado[] = congelado(
  ((): TramoTrazado[] => {
    const salida: TramoTrazado[] = [];
    for (const eje of ['x', 'z'] as const) {
      for (let k = 0; k < 4; k++) {
        const centro = EJES_DE_CALLE[k] as number;
        for (let s = 0; s < 3; s++) {
          const desde = SOLARES[s] as number;
          const menor = eje === 'x' ? ladoDeCalle(centro - 6, 1, k - 1, s) : ladoDeCalle(centro - 6, 1, s, k - 1);
          const mayor = eje === 'x' ? ladoDeCalle(centro + 6, -1, k, s) : ladoDeCalle(centro + 6, -1, s, k);
          const cruces: [number, number] = eje === 'x' ? [k * 4 + s, k * 4 + s + 1] : [s * 4 + k, (s + 1) * 4 + k];
          salida.push({ indice: salida.length, eje, centro, desde, hasta: desde + LADO_DE_MANZANA, cruces, lados: [menor, mayor] });
        }
      }
    }
    return salida;
  })(),
);

/** ¿Da este tramo a la glorieta? Por qué lado, o `null`. */
function ladoDeLaPlaza(t: TramoTrazado): 0 | 1 | null {
  if (t.lados[0].frente === 'glorieta') return 0;
  if (t.lados[1].frente === 'glorieta') return 1;
  return null;
}

/**
 * CADA TRAMO TAL COMO SALE: aparcando en el lado 0, en el 1 o en ninguno (el 2). Son tres por tramo
 * y no cambian con la noche, así que se hacen una vez y la noche elige; los que dan a la plaza
 * aparcan siempre del lado de la plaza.
 */
const CALLES_COMO_SALEN: readonly (readonly [TramoDeCalle, TramoDeCalle, TramoDeCalle])[] = congelado(
  CALLES_TRAZADAS.map((t): [TramoDeCalle, TramoDeCalle, TramoDeCalle] => {
    const como = (aparca: 0 | 1 | null): TramoDeCalle => ({ indice: t.indice, eje: t.eje, centro: t.centro, desde: t.desde, hasta: t.hasta, cruces: t.cruces, lados: t.lados, aparca });
    const plaza = ladoDeLaPlaza(t);
    if (plaza !== null) {
      const unico = como(plaza);
      return [unico, unico, unico];
    }
    return [como(0), como(1), como(null)];
  }),
);

/**
 * LAS FAROLAS DE LAS ACERAS: cada 12 m alternando de acera (a 6 y 30 m del principio del solar en
 * la acera menor, a 18 en la mayor), en todas menos en la de la plaza, que tiene las suyas.
 */
const FAROLAS_DE_LAS_CALLES: readonly CajaDelBarrio[] = congelado(
  ((): CajaDelBarrio[] => {
    const salida: CajaDelBarrio[] = [];
    for (const t of CALLES_TRAZADAS) {
      const plaza = ladoDeLaPlaza(t);
      for (let l = 0; l < 2; l++) {
        if (l === plaza) continue;
        const lado = t.lados[l] as LadoDeCalle;
        for (const a of l === 0 ? FAROLAS_DE_LA_ACERA_MENOR : FAROLAS_DE_LA_ACERA_MAYOR) {
          const r = rectanguloEnLaCalle(t.eje, lado, t.desde + a - 0.25, t.desde + a + 0.25, D_MOBILIARIO, D_FAROLA_HASTA);
          salida.push(caja(r, 'farola', 4.5, rumboDeTravesDe(t.eje, lado.hacia), null));
        }
      }
    }
    return salida;
  })(),
);

/** La mitad del lado de la plaza: el solar de la glorieta va de −18 a 18. */
const MEDIA_PLAZA = LADO_DE_MANZANA / 2;

/**
 * LO FIJO DE LA GLORIETA: la fuente de 5 × 5 en el centro, el anillo de cuatro bancos a 6 m
 * mirándola y las ocho farolas de las esquinas y los centros de los lados, a 16,5.
 */
const CAJAS_FIJAS_DE_LA_GLORIETA: readonly CajaDelBarrio[] = congelado([
  caja(cuadrado(0, 0, 2.5), 'fuente', 1, 0, null),
  caja({ x0: 6, z0: -1, x1: 6.5, z1: 1 }, 'banco', 0.5, RUMBO_DE_LA_CARA.oeste, null),
  caja({ x0: -6.5, z0: -1, x1: -6, z1: 1 }, 'banco', 0.5, RUMBO_DE_LA_CARA.este, null),
  caja({ x0: -1, z0: -6.5, x1: 1, z1: -6 }, 'banco', 0.5, RUMBO_DE_LA_CARA.sur, null),
  caja({ x0: -1, z0: 6, x1: 1, z1: 6.5 }, 'banco', 0.5, RUMBO_DE_LA_CARA.norte, null),
  caja(cuadrado(-16.5, -16.5, 0.25), 'farola', 4.5, 0, null),
  caja(cuadrado(16.5, -16.5, 0.25), 'farola', 4.5, 0, null),
  caja(cuadrado(-16.5, 16.5, 0.25), 'farola', 4.5, 0, null),
  caja(cuadrado(16.5, 16.5, 0.25), 'farola', 4.5, 0, null),
  caja(cuadrado(0, -16.5, 0.25), 'farola', 4.5, 0, null),
  caja(cuadrado(16.5, 0, 0.25), 'farola', 4.5, 0, null),
  caja(cuadrado(0, 16.5, 0.25), 'farola', 4.5, 0, null),
  caja(cuadrado(-16.5, 0, 0.25), 'farola', 4.5, 0, null),
]);

/* ─── Lo que PUEDE salir, dicho una vez ────────────────────────────────────────
 *
 * Dónde puede ir cada cosa que sortea la noche. Lo usan dos: la noche, para poner la que le toca,
 * y el grafo de navegación, para esquivarlas TODAS (ver `GRAFO_DEL_BARRIO`). Que sea la misma
 * función en los dos sitios es lo que impide que el grafo esquive un coche donde la noche nunca lo
 * pone y se lo encuentre donde sí.
 */

/** Un coche aparcado en `a` (desde donde empieza) de un lado de un tramo. */
function sitioDeCoche(t: TramoTrazado, lado: LadoDeCalle, a: number): Rectangulo {
  return rectanguloEnLaCalle(t.eje, lado, a, a + LARGO_DE_COCHE, D_COCHE, D_COCHE_HASTA);
}

/** Un quiosco de prensa centrado en `a` de un lado de un tramo, montado sobre el bordillo. */
function sitioDeQuiosco(t: TramoTrazado, lado: LadoDeCalle, a: number): Rectangulo {
  return rectanguloEnLaCalle(t.eje, lado, a - 1.25, a + 1.25, D_MOBILIARIO, D_QUIOSCO_HASTA);
}

/** El quiosco de la plaza, de 4 × 4 y centrado a (±11, ±11): cuadrantes NO, NE, SE, SO. */
function sitioDelQuiosco(cuadrante: number): { r: Rectangulo; mira: number } {
  const sx = cuadrante === 1 || cuadrante === 2 ? 1 : -1;
  const sz = cuadrante >= 2 ? 1 : -1;
  return { r: cuadrado(11 * sx, 11 * sz, 2), mira: rumboAlCentroDesde(sx, sz) };
}

/** El rumbo que mira hacia el centro desde un punto de un cuadrante (signos de x y de z). */
function rumboAlCentroDesde(sx: number, sz: number): number {
  if (sx < 0 && sz < 0) return 96;
  if (sx > 0 && sz < 0) return 160;
  if (sx > 0 && sz > 0) return 224;
  return 32;
}

/** Dónde van los pilares del tren a lo largo del viaducto, y dónde puede ir el viaducto: a 8-12 m del centro. */
const PILARES_DEL_TREN: readonly number[] = [-15, -5, 5, 15];
const LINEAS_DEL_VIADUCTO: readonly number[] = [-12, -11, -10, -9, -8, 8, 9, 10, 11, 12];

/** Un pilar del viaducto que va por `eje`, en la `linea` del otro eje, a `a` a lo largo. */
function sitioDePilar(eje: Eje, linea: number, a: number): Rectangulo {
  return eje === 'x' ? cuadrado(a, linea, 0.5) : cuadrado(linea, a, 0.5);
}

/** Los cuatro lados de la plaza, por si le toca a uno la cabina de refugio. */
const LADOS_DE_LA_PLAZA: readonly Cara[] = ['norte', 'este', 'sur', 'oeste'];
/** Lo que se mira desde cada lado de la plaza hacia dentro. */
const HACIA_DENTRO_DE_LA_PLAZA: Readonly<Record<Cara, number>> = { norte: 128, este: 192, sur: 0, oeste: 64 };

/** Una cabina de refugio: su poste, a dónde mira, el sitio, sus tres sitios de reaparecer y su zona. */
interface RefugioEnLaPlaza {
  readonly poste: Punto;
  readonly mira: number;
  readonly sitio: Punto;
  readonly nace: SitioDelBarrio[];
  readonly zona: Rectangulo;
}

/**
 * LA CABINA DE REFUGIO en el lado `cara` de la plaza, a `o` metros del centro del lado, con el poste
 * a 1 m del borde y mirando adentro. Quien reaparece lo hace a 1,25 m del poste, en fila de tres.
 */
function refugioEn(cara: Cara, o: number): RefugioEnLaPlaza {
  const aLoLargoDeX = cara === 'norte' || cara === 'sur';
  const haciaElCentro = cara === 'norte' || cara === 'oeste' ? 1 : -1;
  const borde = -haciaElCentro * (MEDIA_PLAZA - 1);
  const enPlaza = (a: number, p: number): Punto => (aLoLargoDeX ? { x: a, z: p } : { x: p, z: a });
  const mira = HACIA_DENTRO_DE_LA_PLAZA[cara];
  const fila = borde + haciaElCentro * 1.25;
  const nace: SitioDelBarrio[] = [];
  for (const d of [-1.5, 0, 1.5]) {
    const p = enPlaza(o + d, fila);
    nace.push({ x: p.x, z: p.z, rumbo: mira });
  }
  const p0 = borde + haciaElCentro * 1;
  const p1 = borde + haciaElCentro * 1.5;
  const a = enPlaza(o - 2, Math.min(p0, p1));
  const b = enPlaza(o + 2, Math.max(p0, p1));
  return { poste: enPlaza(o, borde), mira, sitio: enPlaza(o, fila), nace, zona: { x0: a.x, z0: a.z, x1: b.x, z1: b.z } };
}

/** El poste de una cabina, sea de refugio o de la Llamada: medio metro de lado. */
function sitioDePoste(poste: Punto): Rectangulo {
  return cuadrado(poste.x, poste.z, 0.25);
}

/** Los bancos de más, en el borde de la plaza: (x, z, ¿a lo largo de x?). */
const BANCOS_DEL_BORDE: readonly (readonly [number, number, boolean])[] = [
  [-9, -16.25, true], [9, -16.25, true], [-9, 16.25, true], [9, 16.25, true],
  [-16.25, -9, false], [-16.25, 9, false], [16.25, -9, false], [16.25, 9, false],
];

function sitioDeBanco(b: readonly [number, number, boolean]): Rectangulo {
  const [x, z, aLoLargo] = b;
  return aLoLargo ? { x0: x - 1, z0: z - 0.25, x1: x + 1, z1: z + 0.25 } : { x0: x - 0.25, z0: z - 1, x1: x + 0.25, z1: z + 1 };
}

/** Los dieciséis sitios de coche de la plaza: la acera de la plaza de las cuatro calles que la rodean. */
const COCHES_DE_LA_PLAZA: readonly { readonly tramo: TramoTrazado; readonly lado: LadoDeCalle; readonly a: number }[] = congelado(
  ((): { tramo: TramoTrazado; lado: LadoDeCalle; a: number }[] => {
    const salida: { tramo: TramoTrazado; lado: LadoDeCalle; a: number }[] = [];
    for (const t of CALLES_TRAZADAS) {
      const plaza = ladoDeLaPlaza(t);
      if (plaza === null) continue;
      for (const a of SITIOS_DE_COCHE) salida.push({ tramo: t, lado: t.lados[plaza], a: t.desde + a });
    }
    return salida;
  })(),
);

/* ─── La red de aceras, las zonas, los límites y el nacer ──────────────────── */

/** La red de aceras sin sus semáforos: ver `RedDeAceras`. */
const NUDOS_DE_ACERA: readonly Punto[] = congelado(
  ((): Punto[] => {
    const salida: Punto[] = [];
    for (const z of CARRILES) for (const x of CARRILES) salida.push({ x, z });
    return salida;
  })(),
);

/**
 * LOS TRAMOS DE ACERA. En cada fila y columna de carriles los tramos alternan: entre los dos
 * carriles de una misma calle (pares 0-1, 2-3, 4-5, 6-7) se cruza la calzada por un paso de cebra;
 * entre los de dos calles seguidas se va por la acera, a lo largo de una manzana o del cerco.
 */
const TRAMOS_DE_ACERA: readonly TramoDeAcera[] = congelado(
  ((): TramoDeAcera[] => {
    const n = CARRILES.length;
    const salida: TramoDeAcera[] = [];
    for (let j = 0; j < n; j++) {
      for (let i = 0; i + 1 < n; i++) {
        const paso = i % 2 === 0;
        salida.push({
          a: j * n + i,
          b: j * n + i + 1,
          eje: 'x',
          tipo: paso ? 'paso' : 'acera',
          cruce: paso ? Math.floor(j / 2) * 4 + i / 2 : null,
          largo: (CARRILES[i + 1] as number) - (CARRILES[i] as number),
        });
      }
    }
    for (let i = 0; i < n; i++) {
      for (let j = 0; j + 1 < n; j++) {
        const paso = j % 2 === 0;
        salida.push({
          a: j * n + i,
          b: (j + 1) * n + i,
          eje: 'z',
          tipo: paso ? 'paso' : 'acera',
          cruce: paso ? (j / 2) * 4 + Math.floor(i / 2) : null,
          largo: (CARRILES[j + 1] as number) - (CARRILES[j] as number),
        });
      }
    }
    return salida;
  })(),
);

/**
 * LAS ZONAS DE SIEMPRE. De aparición, las 16 plazoletas de cruce (5 × 5 en medio de la calzada:
 * las cuatro que rodean la plaza son `aparicion` y las doce de fuera `aparicion-lejana`) y las ocho
 * bocas de calle que salen de la glorieta hacia fuera (6 m de calzada nada más pasar el cruce, que
 * es donde no aparca nadie). De impresión, ocho huecos de la plaza que ninguna combinación de la
 * plantilla ocupa (ver `levantarLaGlorieta`). Las de cabina y refugio van con la noche.
 */
const ZONAS_FIJAS: readonly ZonaDelBarrio[] = congelado(
  ((): ZonaDelBarrio[] => {
    const salida: ZonaDelBarrio[] = [];
    for (let fila = 0; fila < 4; fila++) {
      for (let columna = 0; columna < 4; columna++) {
        const junto = (fila === 1 || fila === 2) && (columna === 1 || columna === 2);
        salida.push({
          id: `cruce-${String(fila * 4 + columna)}`,
          clase: junto ? 'aparicion' : 'aparicion-lejana',
          caja: cuadrado(EJES_DE_CALLE[columna] as number, EJES_DE_CALLE[fila] as number, 2.5),
        });
      }
    }
    for (const fila of [1, 2]) {
      for (const columna of [1, 2]) {
        const x = EJES_DE_CALLE[columna] as number;
        const z = EJES_DE_CALLE[fila] as number;
        const n = fila * 4 + columna;
        const sx = columna === 1 ? -1 : 1;
        const sz = fila === 1 ? -1 : 1;
        const bx0 = x + sx * 3.5;
        const bx1 = x + sx * 9.5;
        const bz0 = z + sz * 3.5;
        const bz1 = z + sz * 9.5;
        salida.push({ id: `boca-${String(n)}-${sx < 0 ? 'oeste' : 'este'}`, clase: 'aparicion', caja: { x0: Math.min(bx0, bx1), z0: z - 2.5, x1: Math.max(bx0, bx1), z1: z + 2.5 } });
        salida.push({ id: `boca-${String(n)}-${sz < 0 ? 'norte' : 'sur'}`, clase: 'aparicion', caja: { x0: x - 2.5, z0: Math.min(bz0, bz1), x1: x + 2.5, z1: Math.max(bz0, bz1) } });
      }
    }
    const huecos: readonly (readonly [string, number, number, number])[] = [
      ['plaza-este', 11, 0, 1.25], ['plaza-sur', 0, 11, 1.25], ['plaza-oeste', -11, 0, 1.25], ['plaza-norte', 0, -11, 1.25],
      ['plaza-noreste', 14.5, -14.5, 0.75], ['plaza-sureste', 14.5, 14.5, 0.75], ['plaza-suroeste', -14.5, 14.5, 0.75], ['plaza-noroeste', -14.5, -14.5, 0.75],
    ];
    for (const [id, x, z, medio] of huecos) salida.push({ id, clase: 'impresion', caja: cuadrado(x, z, medio) });
    return salida;
  })(),
);

const LIMITES: readonly LimiteDelBarrio[] = congelado([
  { id: 'glorieta48', caja: cuadrado(0, 0, 24) },
  { id: 'glorieta60', caja: cuadrado(0, 0, 30) },
  { id: 'barrio', caja: cuadrado(0, 0, MEDIO_BARRIO) },
]);

/**
 * Dónde nacen los desvelados: seis sitios a 4 m de la fuente, entre ella y el anillo de bancos,
 * mirando hacia fuera, que es por donde viene el Sistema.
 */
const NACE_DESVELADO: readonly SitioDelBarrio[] = congelado([
  { x: 0, z: -4, rumbo: 0 },
  { x: 4, z: 0, rumbo: 64 },
  { x: 0, z: 4, rumbo: 128 },
  { x: -4, z: 0, rumbo: 192 },
  { x: 4, z: -4, rumbo: 32 },
  { x: -4, z: 4, rumbo: 160 },
]);

/* ─── Las cabinas candidatas ───────────────────────────────────────────────── */

/**
 * LA DISTANCIA POR CALLES del centro de la glorieta a un punto de la acera de un tramo, en metros de
 * `x` más metros de `z`, tratando cada manzana como un macizo metido `metido` metros desde cada
 * fachada: con 0 es la ruta de siempre (`CabinaDelBarrio.distancia`); con el fondo de un soportal,
 * la más corta que dejarían los soportales si los hubiera en todas partes (`atajando`).
 *
 * ═══ POR QUÉ NO BASTA CON SUMAR LAS DOS COORDENADAS ═══
 *
 * Porque entre la plaza y una cabina puede haber una manzana entera. La cabina de la acera de fuera
 * de la manzana del este, a (67,5, −6), suma 73,5; andando hay que rodear la manzana por una de las
 * calles que la bordean, y son 97,5. La primera versión de este fichero declaraba 73,5, y la
 * búsqueda en anchura de `verify:quiebro-barrio` anduvo 90: lo que el diseño llama «a 60-110 m por
 * calles reales» tiene que ser andando, no a vuelo de cuervo cuadriculado.
 *
 * ═══ POR QUÉ ES EXACTA CON MACIZOS, Y POR QUÉ LOS SOPORTALES LA ACORTAN ═══
 *
 * Con las manzanas macizas lo libre es una rejilla de calles, y la cuenta tiene forma cerrada:
 *
 *   · A cualquier punto de un CRUCE (el cuadrado donde se juntan dos calles) se llega en escalera
 *     desde el centro —plaza, calle interior, calle de fuera— sin retroceder nunca: su distancia
 *     es la suma de sus dos coordenadas.
 *   · Un TRAMO entre dos cruces es un pasillo con manzanas (o el cerco) a los lados. Sólo se entra
 *     por sus dos bocas —o desde la plaza, si da a ella—, y dentro se va en línea.
 *
 * Así que la distancia es la menor de entrar por cada boca justo enfrente del punto, o de ir directo
 * desde la plaza. Pero una manzana de verdad no es maciza: bajo un soportal se anda por dentro del
 * solar hasta 3 m, y en una esquina eso agranda el cruce y acorta el pasillo; rodear una manzana por
 * dos esquinas con soportal ahorra hasta 6 m (lo midió la revisión adversaria: 97,5 declarados y 92,5
 * andados, y el comentario de la versión anterior decía «exacta»). Con los solares metidos 3 m por
 * cada lado —soportales en todas las fachadas— los cruces miden 18, los pasillos 30, y la misma cuenta
 * da la cota de abajo, porque con menos soportales hay menos sitio por donde andar y nunca se anda
 * menos. Lo andado de verdad queda entre las dos, y `verify:quiebro-barrio` lo mide andando en cada
 * noche que mira.
 */
function distanciaPorCalles(p: Punto, tramo: TramoTrazado, metido: number): number {
  const aLoLargo = tramo.eje === 'x' ? p.x : p.z;
  const deTraves = Math.abs(tramo.eje === 'x' ? p.z : p.x);
  const primera = tramo.desde + metido;
  const segunda = tramo.hasta - metido;
  const porLaPrimeraBoca = deTraves + Math.abs(primera) + Math.abs(aLoLargo - primera);
  const porLaSegundaBoca = deTraves + Math.abs(segunda) + Math.abs(aLoLargo - segunda);
  const porLasBocas = Math.min(porLaPrimeraBoca, porLaSegundaBoca);
  return ladoDeLaPlaza(tramo) === null ? porLasBocas : Math.min(porLasBocas, Math.abs(p.x) + Math.abs(p.z));
}

/** Una cabina candidata de la Llamada: dónde va, y a qué distancia queda por calles. */
interface CandidataDeCabina {
  readonly tramo: TramoTrazado;
  readonly lado: LadoDeCalle;
  readonly a: number;
  readonly poste: Punto;
  readonly sitio: Punto;
  readonly distancia: number;
  readonly atajando: number;
}

/**
 * LOS SITIOS DE CABINA QUE VALEN PARA LA LLAMADA, por cuadrante (NE, SE, SO, NO): los de las aceras
 * de manzana, a 12 y 24 m del principio del solar, cuya carrera cae en 60-110 m con soportales o sin
 * ellos (ver `CabinaDelBarrio`): lo menos que se puede andar, 60 o más; lo más, 110 o menos.
 */
const CANDIDATAS_DE_CABINA: readonly (readonly CandidataDeCabina[])[] = congelado(
  ((): CandidataDeCabina[][] => {
    const porCuadrante: CandidataDeCabina[][] = [[], [], [], []];
    for (const tramo of CALLES_TRAZADAS) {
      for (const lado of tramo.lados) {
        if (lado.frente !== 'manzana') continue;
        for (const s of SITIOS_DE_CABINA) {
          const a = tramo.desde + s;
          const sitio = puntoEnLaCalle(tramo.eje, lado, a, D_SITIO_DE_CABINA);
          const distancia = distanciaPorCalles(sitio, tramo, 0);
          const atajando = distanciaPorCalles(sitio, tramo, FONDO_DEL_SOPORTAL);
          if (atajando < CABINA_MAS_CERCA || distancia > CABINA_MAS_LEJOS) continue;
          const cuadrante = sitio.z < 0 ? (sitio.x > 0 ? 0 : 3) : sitio.x > 0 ? 1 : 2;
          (porCuadrante[cuadrante] as CandidataDeCabina[]).push({ tramo, lado, a, poste: puntoEnLaCalle(tramo.eje, lado, a, D_POSTE), sitio, distancia, atajando });
        }
      }
    }
    return porCuadrante;
  })(),
);

/* ─── El grafo de navegación ──────────────────────────────────────────────── */

/**
 * Las líneas de la rejilla del grafo que sólo existen cerca de la plaza (hasta la glorieta de 60):
 * los anillos a 4, 7 y 13,75 del centro, y las que pasan por los huecos entre los sitios de coche de
 * la acera de la plaza —que son los mismos en las cuatro calles que la rodean, porque las cuatro
 * empiezan su solar en −18—. Ver `GRAFO_DEL_BARRIO`.
 */
const LINEAS_DE_LA_PLAZA: readonly number[] = congelado(
  [-13.75, -7, -4, 4, 7, 13.75, ...SITIOS_DE_COCHE.slice(1).map((s, k) => -MEDIA_PLAZA + ((SITIOS_DE_COCHE[k] as number) + LARGO_DE_COCHE + s) / 2)].sort((a, b) => a - b),
);
const HASTA_DONDE_LLEGA_LA_PLAZA = 30;
/**
 * Todas las líneas de la rejilla, las mismas en `x` y en `z`, de menor a mayor: por cada calle, el
 * centro de su calzada y el de sus dos aceras (±4,5); el medio de cada tramo (±48 y 0); y las de la
 * plaza.
 */
const LINEAS_DEL_GRAFO: readonly number[] = congelado(
  ((): number[] => {
    const salida: number[] = [-48, 0, 48, ...LINEAS_DE_LA_PLAZA];
    for (const e of EJES_DE_CALLE) salida.push(e - 4.5, e, e + 4.5);
    return salida.sort((a, b) => a - b);
  })(),
);

/**
 * TODO LO QUE PUEDE ESTORBAR EN CUALQUIER NOCHE, en Q16.16 y ya ensanchado `r` por cada lado, plano
 * (`x0, z0, x1, z1` por caja): el cerco, las ocho manzanas edificadas enteras (con o sin soportal),
 * las farolas de las aceras, lo fijo de la glorieta y cada cosa en cada sitio donde la noche puede
 * ponerla —los coches y quioscos de todas las calles, el quiosco en sus cuatro cuadrantes, los
 * ochenta pilares de los veinte viaductos posibles, las ocho cabinas de refugio, los bancos del
 * borde, los coches de la plaza y todas las cabinas candidatas—.
 */
function todoLoQuePuedeEstorbar(r: number): number[] {
  const salida: number[] = [];
  const meter = (c: Rectangulo): void => {
    salida.push(c.x0 * UNO - r, c.z0 * UNO - r, c.x1 * UNO + r, c.z1 * UNO + r);
  };
  for (const c of CAJAS_DEL_CERCO) meter(c);
  for (const c of FAROLAS_DE_LAS_CALLES) meter(c);
  for (const c of CAJAS_FIJAS_DE_LA_GLORIETA) meter(c);
  for (const m of SOLARES_DE_MANZANA) if (m.indice !== LA_GLORIETA) meter(m.solar);
  for (const t of CALLES_TRAZADAS) {
    if (ladoDeLaPlaza(t) !== null) continue;
    for (const lado of t.lados) {
      for (const a of SITIOS_DE_COCHE) meter(sitioDeCoche(t, lado, t.desde + a));
      for (const a of SITIOS_DE_QUIOSCO) meter(sitioDeQuiosco(t, lado, t.desde + a));
    }
  }
  for (let q = 0; q < 4; q++) meter(sitioDelQuiosco(q).r);
  for (const eje of ['x', 'z'] as const) for (const linea of LINEAS_DEL_VIADUCTO) for (const a of PILARES_DEL_TREN) meter(sitioDePilar(eje, linea, a));
  for (const cara of LADOS_DE_LA_PLAZA) for (const o of [3, -3]) meter(sitioDePoste(refugioEn(cara, o).poste));
  for (const b of BANCOS_DEL_BORDE) meter(sitioDeBanco(b));
  for (const c of COCHES_DE_LA_PLAZA) meter(sitioDeCoche(c.tramo, c.lado, c.a));
  for (const cuadrante of CANDIDATAS_DE_CABINA) for (const c of cuadrante) meter(sitioDeCabina(c));
  return salida;
}

/** La caja del poste de una cabina candidata, en la banda de las farolas. */
function sitioDeCabina(c: CandidataDeCabina): Rectangulo {
  return rectanguloEnLaCalle(c.tramo.eje, c.lado, c.a - 0.25, c.a + 0.25, D_MOBILIARIO, D_FAROLA_HASTA);
}

/**
 * EL GRAFO DEL BARRIO: por dónde navega un NPC cuando no tiene línea recta hasta su blanco.
 *
 * ═══ POR QUÉ NO BASTAN LOS 16 CRUCES ═══
 *
 * La primera versión era el grafo de calles y nada más: 16 cruces en ±24 y ±72. Ninguno cae dentro
 * de la plaza, que es donde se pelea, y la revisión adversaria midió lo que eso hace: entre el 5,5 y
 * el 7,9 % del suelo libre de la plaza no veía ningún nudo, y un NPC al otro lado de la fuente daba la
 * vuelta por las calles —124 m por el grafo para ir de (0, −10) a (0, 10)—. Los 16 cruces siguen
 * siendo los 16 primeros nudos y sus 24 tramos las 24 primeras aristas, para quien quiera el grafo
 * de calles; detrás va una REJILLA de navegación.
 *
 * ═══ UNA REJILLA QUE VALE EN TODAS LAS NOCHES ═══
 *
 * Los nudos son los cruces de las `LINEAS_DEL_GRAFO` donde cabe una persona, y las aristas unen
 * nudos seguidos de la misma línea si se anda de uno a otro en recta con `RADIO_DEL_GRAFO`. Y todo
 * eso se decide contra `todoLoQuePuedeEstorbar`, no contra lo que ha salido esta noche: una arista
 * que esquiva los cuatro sitios posibles del quiosco, los ochenta pilares de tren posibles y los
 * dieciséis coches de la plaza está libre en cualquier noche, y también con la plaza despejada
 * (quitar cajas no tapa nada). Así el grafo es UNO, se monta al cargar y no le cuesta nada a la
 * noche, y lo que se pierde —alguna arista por un cuadrante donde esta noche no hay quiosco— lo paga
 * el NPC con un rodeo de pocos metros.
 *
 * Las líneas no son de adorno. Las de las calles van por el centro de calzadas y aceras, donde por
 * la acera por bandas no puede haber nada (los coches acaban a 5 m de la fachada; las farolas y
 * quioscos empiezan a 2,25). Las de la plaza pasan por los huecos de la plantilla: el anillo de 4
 * entre la fuente (2,5) y los bancos (6); el de 7 entre los bancos (6,5) y el pilar de tren más
 * cercano posible (7,5); el de 13,75 entre el quiosco (13) y los pilares de las puntas (14,5). Y las
 * tres de los huecos entre coches (−6,75, −0,75 y 5,25): los dieciséis sitios de coche de la plaza
 * cubren casi toda su acera, y sin ellas de la calle a la plaza sólo se entraba por donde no puede
 * aparcar nadie; un NPC pegado a un coche daba la vuelta por la esquina y andaba el doble (lo vio la
 * comprobación de rodeos de `verify:quiebro-barrio`). Ninguna sale de la glorieta de 60: por las
 * calles no hacen falta, y cada línea de más son veinte nudos.
 *
 * ═══ ENTERO, COMO LA SALA ═══
 *
 * La cuenta se hace en Q16.16 y con desigualdades estrictas, que es la pregunta de `chocaConCuerpo`
 * de `mundo.ts` y de la prueba de losa de la Liza para un cuerpo cuadrado: una arista que la sala
 * diera por tapada no puede salir aquí libre por medio bit. Cada nudo y cada arista se congela al
 * hacerse, sin recorrerlos después: son mil objetos de números sueltos, y recorrerlos con
 * `congelado` costaba más que todo lo demás que se monta al cargar.
 */
const GRAFO_DEL_BARRIO: GrafoDelBarrio = ((): GrafoDelBarrio => {
  const r = deNumero(RADIO_DEL_GRAFO);
  const n = LINEAS_DEL_GRAFO.length;
  const lineas = LINEAS_DEL_GRAFO.map((v) => v * UNO);
  const deLaPlaza = LINEAS_DEL_GRAFO.map((v) => LINEAS_DE_LA_PLAZA.indexOf(v) >= 0);
  const cerca = LINEAS_DEL_GRAFO.map((v) => Math.abs(v) <= HASTA_DONDE_LLEGA_LA_PLAZA);
  /** La primera línea que queda estrictamente por encima de `v` (las líneas van de menor a mayor). */
  const porEncimaDe = (v: number): number => {
    let a = 0;
    let b = n;
    while (a < b) {
      const m = Math.floor((a + b) / 2);
      if ((lineas[m] as number) > v) b = m;
      else a = m + 1;
    }
    return a;
  };
  /*
   * Lo que tapa cada estorbo, marcado en la rejilla: `punto[j × n + i]` si (i, j) cae DENTRO de él,
   * `tramoDeFila[j × n + i]` si pisa el tramo de (i, j) a (i + 1, j), y `tramoDeColumna[i × n + j]`
   * si pisa el de (i, j) a (i, j + 1). Dentro es estricto (rozar no tapa) y el estorbo ya viene
   * ensanchado el radio. Cada estorbo mira sólo las líneas que cruza: con una búsqueda por mitades
   * y no recorriendo la rejilla entera por cada uno, que es lo que hacía esto costar 2,4 ms.
   */
  const punto = new Uint8Array(n * n);
  const tramoDeFila = new Uint8Array(n * n);
  const tramoDeColumna = new Uint8Array(n * n);
  const estorbos = todoLoQuePuedeEstorbar(r);
  for (let e = 0; e < estorbos.length; e += 4) {
    const x0 = estorbos[e] as number;
    const z0 = estorbos[e + 1] as number;
    const x1 = estorbos[e + 2] as number;
    const z1 = estorbos[e + 3] as number;
    const primeraX = porEncimaDe(x0);
    const primeraZ = porEncimaDe(z0);
    /* Las filas que cruza (z0 < z < z1): sus puntos dentro y sus tramos pisados. */
    for (let j = primeraZ; j < n && (lineas[j] as number) < z1; j++) {
      for (let i = primeraX; i < n && (lineas[i] as number) < x1; i++) punto[j * n + i] = 1;
      for (let i = Math.max(0, primeraX - 1); i + 1 < n && (lineas[i] as number) < x1; i++) tramoDeFila[j * n + i] = 1;
    }
    /* Las columnas que cruza (x0 < x < x1): sus tramos pisados. */
    for (let i = primeraX; i < n && (lineas[i] as number) < x1; i++) {
      for (let j = Math.max(0, primeraZ - 1); j + 1 < n && (lineas[j] as number) < z1; j++) tramoDeColumna[i * n + j] = 1;
    }
  }
  /** ¿Es un nudo posible? Las líneas de la plaza sólo existen cerca de ella, y en él cabe una persona. */
  const libre = (i: number, j: number): boolean => (!deLaPlaza[i] || (cerca[j] as boolean)) && (!deLaPlaza[j] || (cerca[i] as boolean)) && punto[j * n + i] === 0;

  /* Las aristas de la rejilla, por índices de la rejilla (j × n + i): filas y luego columnas. */
  const porRejilla: number[] = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i + 1 < n; i++) if (libre(i, j) && libre(i + 1, j) && tramoDeFila[j * n + i] === 0) porRejilla.push(j * n + i, j * n + i + 1);
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j + 1 < n; j++) if (libre(i, j) && libre(i, j + 1) && tramoDeColumna[i * n + j] === 0) porRejilla.push(j * n + i, (j + 1) * n + i);
  }

  /* Los nudos: primero los 16 cruces, luego los de la rejilla que tengan alguna arista, fila a fila. */
  const numero = new Int32Array(n * n).fill(-1);
  const nudos: Punto[] = [];
  for (let fila = 0; fila < 4; fila++) {
    for (let columna = 0; columna < 4; columna++) {
      const i = LINEAS_DEL_GRAFO.indexOf(EJES_DE_CALLE[columna] as number);
      const j = LINEAS_DEL_GRAFO.indexOf(EJES_DE_CALLE[fila] as number);
      numero[j * n + i] = nudos.length;
      nudos.push(Object.freeze({ x: LINEAS_DEL_GRAFO[i] as number, z: LINEAS_DEL_GRAFO[j] as number }));
    }
  }
  const conArista = new Uint8Array(n * n);
  for (const k of porRejilla) conArista[k] = 1;
  for (let k = 0; k < n * n; k++) {
    if (conArista[k] === 0 || numero[k] !== -1) continue;
    numero[k] = nudos.length;
    nudos.push(Object.freeze({ x: LINEAS_DEL_GRAFO[k % n] as number, z: LINEAS_DEL_GRAFO[Math.floor(k / n)] as number }));
  }

  const aristas: AristaDelGrafo[] = [];
  for (const t of CALLES_TRAZADAS) aristas.push(Object.freeze({ a: t.cruces[0], b: t.cruces[1], largo: LADO_DE_MANZANA + ANCHO_DE_CALLE, tramo: t.indice }));
  for (let e = 0; e < porRejilla.length; e += 2) {
    const a = numero[porRejilla[e] as number] as number;
    const b = numero[porRejilla[e + 1] as number] as number;
    const p = nudos[a] as Punto;
    const q = nudos[b] as Punto;
    aristas.push(Object.freeze({ a, b, largo: Math.abs(q.x - p.x) + Math.abs(q.z - p.z), tramo: null }));
  }
  return Object.freeze({ nudos: Object.freeze(nudos), aristas: Object.freeze(aristas) });
})();

/* ═══════════════════════════════════════════════════════════════════════════
 *  LO QUE SORTEA LA NOCHE
 * ═══════════════════════════════════════════════════════════════════════════ */

/* ─── Los edificios ───────────────────────────────────────────────────────── */

function partir(r: Rectangulo, porX: boolean, corte: number): [Rectangulo, Rectangulo] {
  if (porX) {
    const x = r.x0 + corte;
    return [{ x0: r.x0, z0: r.z0, x1: x, z1: r.z1 }, { x0: x, z0: r.z0, x1: r.x1, z1: r.z1 }];
  }
  const z = r.z0 + corte;
  return [{ x0: r.x0, z0: r.z0, x1: r.x1, z1: z }, { x0: r.x0, z0: z, x1: r.x1, z1: r.z1 }];
}

/**
 * EL SOLAR, REPARTIDO EN 2 A 4 EDIFICIOS que lo cubren entero. Un corte a 12-24 m y, si hacen
 * falta más, cortes perpendiculares en una o en las dos mitades, también a 12-24 m: ningún
 * edificio baja de 12 × 12, y cada uno toca al menos un borde del solar, o sea que tiene fachada.
 *
 * Que cubran el solar entero no es estética: no deja patios ni callejones que no lleven a ningún
 * sitio, donde se colaría un Prestado o quedaría una bolsa de suelo a la que no se llega.
 */
function repartirElSolar(ch: ChorroDeAzar, solar: Rectangulo): Rectangulo[] {
  const cuantos = ch.entero(2, 4);
  const porX = ch.entero(0, 1) === 0;
  const [a, b] = partir(solar, porX, ch.entero(12, 24));
  if (cuantos === 2) return [a, b];
  if (cuantos === 3) {
    if (ch.entero(0, 1) === 0) return [...partir(a, !porX, ch.entero(12, 24)), b];
    return [a, ...partir(b, !porX, ch.entero(12, 24))];
  }
  return [...partir(a, !porX, ch.entero(12, 24)), ...partir(b, !porX, ch.entero(12, 24))];
}

/** Hacia dónde queda el interior del edificio desde una fachada: +1 o −1 sobre su eje. */
function haciaDentro(cara: Cara): 1 | -1 {
  return cara === 'norte' || cara === 'oeste' ? 1 : -1;
}

/** Un rectángulo pegado a una fachada: `a0..a1` a lo largo, `p0..p1` metros hacia dentro. */
function pegadoALaFachada(f: FachadaDelEdificio, a0: number, a1: number, p0: number, p1: number): Rectangulo {
  const s = haciaDentro(f.cara);
  const u = f.linea + s * p0;
  const v = f.linea + s * p1;
  const lo = Math.min(u, v);
  const hi = Math.max(u, v);
  return f.cara === 'norte' || f.cara === 'sur' ? { x0: a0, z0: lo, x1: a1, z1: hi } : { x0: lo, z0: a0, x1: hi, z1: a1 };
}

/** Un punto sobre el plano de una fachada, `a` a lo largo y `p` metros hacia dentro. */
function puntoDeLaFachada(f: FachadaDelEdificio, a: number, p: number): Punto {
  const q = f.linea + haciaDentro(f.cara) * p;
  return f.cara === 'norte' || f.cara === 'sur' ? { x: a, z: q } : { x: q, z: a };
}

/** Las alturas: planta baja, cuerpo y, si es alto, uno o dos retranqueos. */
function lasAlturas(ch: ChorroDeAzar): TramoDeAltura[] {
  const plantas = ch.entero(3, 8) + (ch.sale(12) ? 3 : 0);
  let arriba = ALTO_DE_LA_PLANTA_BAJA + plantas * ALTO_DE_UNA_PLANTA;
  const tramos: TramoDeAltura[] = [
    { plantas: 1, desde: 0, hasta: ALTO_DE_LA_PLANTA_BAJA, entrante: 0 },
    { plantas, desde: ALTO_DE_LA_PLANTA_BAJA, hasta: arriba, entrante: 0 },
  ];
  if (plantas >= 4 && ch.sale(45)) {
    const primero = ch.entero(1, 2);
    tramos.push({ plantas: primero, desde: arriba, hasta: arriba + primero * ALTO_DE_UNA_PLANTA, entrante: RETRANQUEOS[0] as number });
    arriba += primero * ALTO_DE_UNA_PLANTA;
    if (plantas >= 6 && ch.sale(35)) {
      tramos.push({ plantas: 1, desde: arriba, hasta: arriba + ALTO_DE_UNA_PLANTA, entrante: RETRANQUEOS[1] as number });
    }
  }
  return tramos;
}

/**
 * LOS PILARES DE UN SOPORTAL: uno en cada punta de la fachada y cada 4 m entre medias, pegados a la
 * línea de solar por dentro (la acera queda libre). Si el último de la serie cae a menos de 1,5 m
 * del de la punta, sobra.
 */
function pilaresDelSoportal(f: FachadaDelEdificio): Rectangulo[] {
  const salida: Rectangulo[] = [];
  const primero = f.desde + 0.25;
  const ultimo = f.hasta - 0.25;
  for (let a = primero; a <= ultimo - 1.5; a += PILARES_DEL_SOPORTAL_CADA) salida.push(pegadoALaFachada(f, a - 0.25, a + 0.25, 0, 0.5));
  salida.push(pegadoALaFachada(f, ultimo - 0.25, ultimo + 0.25, 0, 0.5));
  return salida;
}

/** La caja de la planta baja: la huella, menos el fondo del soportal en su cara. */
function plantaBajaDe(h: Rectangulo, soportal: Cara | null): Rectangulo {
  if (soportal === 'norte') return { x0: h.x0, z0: h.z0 + FONDO_DEL_SOPORTAL, x1: h.x1, z1: h.z1 };
  if (soportal === 'sur') return { x0: h.x0, z0: h.z0, x1: h.x1, z1: h.z1 - FONDO_DEL_SOPORTAL };
  if (soportal === 'este') return { x0: h.x0, z0: h.z0, x1: h.x1 - FONDO_DEL_SOPORTAL, z1: h.z1 };
  if (soportal === 'oeste') return { x0: h.x0 + FONDO_DEL_SOPORTAL, z0: h.z0, x1: h.x1, z1: h.z1 };
  return h;
}

/** Una fachada y su planta baja. Un soportal por edificio como mucho, y sólo en fachadas de 12 m o más. */
function unaFachada(ch: ChorroDeAzar, cara: Cara, linea: number, desde: number, hasta: number, yaHaySoportal: boolean): FachadaDelEdificio {
  let bajo: PlantaBaja = ch.sale(65) ? 'tiendas' : 'portales';
  if (!yaHaySoportal && hasta - desde >= 12 && ch.sale(18)) bajo = 'soportal';
  return { cara, linea, desde, hasta, bajo };
}

/** Las fachadas de un edificio: los lados que caen en el borde de su solar. */
function lasFachadas(ch: ChorroDeAzar, h: Rectangulo, solar: Rectangulo): FachadaDelEdificio[] {
  const salida: FachadaDelEdificio[] = [];
  let soportal = false;
  if (h.z0 === solar.z0) {
    const f = unaFachada(ch, 'norte', h.z0, h.x0, h.x1, soportal);
    soportal = soportal || f.bajo === 'soportal';
    salida.push(f);
  }
  if (h.x1 === solar.x1) {
    const f = unaFachada(ch, 'este', h.x1, h.z0, h.z1, soportal);
    soportal = soportal || f.bajo === 'soportal';
    salida.push(f);
  }
  if (h.z1 === solar.z1) {
    const f = unaFachada(ch, 'sur', h.z1, h.x0, h.x1, soportal);
    soportal = soportal || f.bajo === 'soportal';
    salida.push(f);
  }
  if (h.x0 === solar.x0) salida.push(unaFachada(ch, 'oeste', h.x0, h.z0, h.z1, soportal));
  return salida;
}

const VANOS: readonly number[] = [2.5, 3, 3.5];

/** Los edificios de las ocho manzanas y, por manzana, sus índices. */
function levantarLosEdificios(clave: string, poner: (c: CajaDelBarrio) => number): { edificios: EdificioDelBarrio[]; porManzana: number[][] } {
  const ch = chorroDeAzar(`${clave}#edificios`);
  const edificios: EdificioDelBarrio[] = [];
  const porManzana: number[][] = [];
  for (const m of SOLARES_DE_MANZANA) {
    const suyos: number[] = [];
    porManzana.push(suyos);
    if (m.indice === LA_GLORIETA) continue;
    for (const huella of repartirElSolar(ch, m.solar)) {
      const indice = edificios.length;
      suyos.push(indice);
      const tramos = lasAlturas(ch);
      const alto = (tramos[tramos.length - 1] as TramoDeAltura).hasta;
      const fachadas = lasFachadas(ch, huella, m.solar);
      let soportal: Cara | null = null;
      for (const f of fachadas) if (f.bajo === 'soportal') soportal = f.cara;
      const suCaja = poner(caja(plantaBajaDe(huella, soportal), 'edificio', alto, 0, indice));
      const pilares: number[] = [];
      for (const f of fachadas) {
        if (f.bajo !== 'soportal') continue;
        for (const r of pilaresDelSoportal(f)) pilares.push(poner(caja(r, 'pilar-de-soportal', ALTO_DE_LA_PLANTA_BAJA, 0, indice)));
      }
      edificios.push({
        indice,
        manzana: m.indice,
        huella,
        tramos,
        alto,
        estilo: ch.uno(ESTILOS),
        tono: ch.entero(0, 3),
        vano: ch.uno(VANOS),
        balcones: ch.sale(50),
        semilla: ch.entero(0, 4294967295),
        fachadas,
        soportal,
        caja: suCaja,
        pilares,
      });
    }
  }
  return { edificios, porManzana };
}

/* ─── Los rótulos ─────────────────────────────────────────────────────────── */

const ALTOS_DE_NEON: readonly number[] = [2.5, 5.5];

/**
 * LOS RÓTULOS: los de escaparate en las fachadas con tiendas (dos por fachada como mucho, uno por
 * cada 6 m de escaparate) y una banderola de neón en tres de cada cuatro manzanas. Los textos
 * salen barajados y no se repiten: cuando se acaban, se acaban los rótulos.
 *
 * Los escaparates se reparten por la pared de la PLANTA BAJA, que es la caja del edificio y no la
 * fachada entera: al lado de un soportal la planta baja es 3 m más corta que las plantas de arriba,
 * y la primera versión repartía por la fachada entera y dejaba 306 de cada 6.400 rótulos colgando
 * en parte sobre el hueco del soportal de la cara vecina, en el aire (lo encontró la revisión).
 */
function losRotulos(clave: string, edificios: readonly EdificioDelBarrio[], cajas: readonly CajaDelBarrio[]): RotuloDelBarrio[] {
  const ch = chorroDeAzar(`${clave}#rotulos`);
  const tiendas = ch.barajados(ROTULOS_DE_TIENDA);
  const neones = ch.barajados(ROTULOS_DE_NEON);
  let siguienteTienda = 0;
  let siguienteNeon = 0;
  const salida: RotuloDelBarrio[] = [];
  for (const e of edificios) {
    const bajo = cajas[e.caja] as CajaDelBarrio;
    for (const f of e.fachadas) {
      if (f.bajo === 'portales') continue;
      const porX = f.cara === 'norte' || f.cara === 'sur';
      const pared0 = Math.max(f.desde, porX ? bajo.x0 : bajo.z0);
      const pared1 = Math.min(f.hasta, porX ? bajo.x1 : bajo.z1);
      const escaparates = Math.max(1, Math.floor((pared1 - pared0) / 6));
      const fondo = f.bajo === 'soportal' ? FONDO_DEL_SOPORTAL : 0;
      let puestos = 0;
      for (let k = 0; k < escaparates && puestos < 2 && siguienteTienda < tiendas.length; k++) {
        if (!ch.sale(45)) continue;
        const desde = pared0 + 6 * k;
        const hasta = k === escaparates - 1 ? pared1 : desde + 6;
        const p = puntoDeLaFachada(f, (desde + hasta) / 2, fondo);
        salida.push({
          texto: tiendas[siguienteTienda] as string,
          clase: 'tienda',
          color: ch.uno(COLORES_DE_ROTULO),
          edificio: e.indice,
          cara: f.cara,
          x: p.x,
          z: p.z,
          y: 3.5,
          ancho: Math.min(4.5, hasta - desde - 1.5),
          alto: 0.75,
          parpadea: ch.sale(8),
        });
        siguienteTienda++;
        puestos++;
      }
    }
  }
  /* Las banderolas: una manzana de cada cuatro se queda sin, para que no parezca una feria. */
  for (const m of SOLARES_DE_MANZANA) {
    if (m.indice === LA_GLORIETA || siguienteNeon >= neones.length || !ch.sale(75)) continue;
    const suyos = edificios.filter((e) => e.manzana === m.indice);
    const e = ch.uno(suyos);
    const f = ch.uno(e.fachadas);
    const alto = ch.uno(ALTOS_DE_NEON);
    const p = puntoDeLaFachada(f, ch.sale(50) ? f.desde + 1 : f.hasta - 1, 0);
    salida.push({
      texto: neones[siguienteNeon] as string,
      clase: 'neon',
      color: ch.uno(COLORES_DE_ROTULO),
      edificio: e.indice,
      cara: f.cara,
      x: p.x,
      z: p.z,
      y: ALTO_DE_LA_PLANTA_BAJA + ALTO_DE_UNA_PLANTA + alto / 2,
      ancho: 1,
      alto,
      parpadea: ch.sale(25),
    });
    siguienteNeon++;
  }
  return salida;
}

/* ─── Las calles ──────────────────────────────────────────────────────────── */

/**
 * LO QUE LA NOCHE PONE EN LAS CALLES: en qué lado se aparca y qué coches hay, y a veces un quiosco
 * de prensa en el otro lado, en los sitios de `sitioDeCoche` y `sitioDeQuiosco`. Los tramos que
 * rodean la glorieta no llevan quiosco ni coches propios: aparcan del lado de la plaza, y sus coches
 * son los de la plaza (ver `levantarLaGlorieta`).
 */
function amueblarLasCalles(clave: string, poner: (c: CajaDelBarrio) => number): TramoDeCalle[] {
  const ch = chorroDeAzar(`${clave}#calles`);
  const salida: TramoDeCalle[] = [];
  for (const t of CALLES_TRAZADAS) {
    const comoSale = CALLES_COMO_SALEN[t.indice] as readonly [TramoDeCalle, TramoDeCalle, TramoDeCalle];
    if (ladoDeLaPlaza(t) !== null) {
      salida.push(comoSale[0]);
      continue;
    }
    const tirada = ch.entero(0, 9);
    const aparca: 0 | 1 | null = tirada < 4 ? 0 : tirada < 8 ? 1 : null;
    if (aparca !== null) {
      const lado = t.lados[aparca];
      for (const a of SITIOS_DE_COCHE) {
        if (!ch.sale(55)) continue;
        poner(caja(sitioDeCoche(t, lado, t.desde + a), 'coche', 1.5, rumboALoLargoDe(t.eje, ch.sale(50) ? 1 : -1), null));
      }
    }
    if (ch.sale(35)) {
      const lado = t.lados[aparca === null ? ch.entero(0, 1) : 1 - aparca] as LadoDeCalle;
      poner(caja(sitioDeQuiosco(t, lado, t.desde + ch.uno(SITIOS_DE_QUIOSCO)), 'quiosco-de-prensa', 2.5, rumboDeTravesDe(t.eje, -lado.hacia), null));
    }
    salida.push(comoSale[aparca === null ? 2 : aparca]);
  }
  return salida;
}

/* ─── La glorieta ─────────────────────────────────────────────────────────── */

interface LaGlorieta {
  readonly tren: { readonly eje: Eje; readonly linea: number; readonly pilares: readonly number[] };
  readonly refugio: CabinaDelBarrio;
  readonly naceRefugio: readonly SitioDelBarrio[];
  readonly zonaRefugio: ZonaDelBarrio;
}

/**
 * LO QUE LA NOCHE PONE EN LA GLORIETA, además de lo fijo (`CAJAS_FIJAS_DE_LA_GLORIETA`). Todo tiene
 * un puñado de sitios (ver «Lo que PUEDE salir») entre los que la semilla elige, y ningún sitio pisa
 * otro (lo mide `verify:quiebro-barrio`):
 *
 *   · el quiosco, de 4 × 4, centrado a (±11, ±11): en uno de los cuatro cuadrantes;
 *   · el viaducto del tren, por `x` o por `z`, a 8-12 m del centro, con cuatro pilares a ±5 y ±15;
 *   · la cabina de refugio en el borde de un lado, a 3 m de su centro, mirando adentro;
 *   · de dos a cuatro bancos más en el borde (despejables);
 *   · y dos o tres coches aparcados en la acera de la plaza de las calles que la rodean (también).
 *
 * Las zonas de impresión (`ZONAS_FIJAS`), los sitios de nacer (`NACE_DESVELADO`) y los nudos del
 * grafo caen en huecos que ninguna de estas combinaciones ocupa.
 */
function levantarLaGlorieta(clave: string, poner: (c: CajaDelBarrio) => number): LaGlorieta {
  const ch = chorroDeAzar(`${clave}#glorieta`);
  for (const c of CAJAS_FIJAS_DE_LA_GLORIETA) poner(c);

  const quiosco = sitioDelQuiosco(ch.entero(0, 3));
  poner(caja(quiosco.r, 'quiosco', 3, quiosco.mira, null));

  const eje: Eje = ch.sale(50) ? 'x' : 'z';
  const linea = (ch.sale(50) ? 1 : -1) * ch.entero(8, 12);
  const pilares: number[] = [];
  for (const a of PILARES_DEL_TREN) pilares.push(poner(caja(sitioDePilar(eje, linea, a), 'pilar-del-tren', 7.5, 0, null)));

  const r = refugioEn(ch.uno(LADOS_DE_LA_PLAZA), ch.sale(50) ? 3 : -3);
  /* En la plaza no hay nada que rodear ni soportal por el que atajar: por calles es la suma de las dos coordenadas. */
  const porCalles = Math.abs(r.sitio.x) + Math.abs(r.sitio.z);
  const refugio: CabinaDelBarrio = {
    id: 'refugio',
    poste: r.poste,
    mira: r.mira,
    caja: poner(caja(sitioDePoste(r.poste), 'cabina', 2.5, r.mira, null)),
    sitio: r.sitio,
    zona: 'refugio',
    distancia: porCalles,
    atajando: porCalles,
  };

  const bancos = ch.barajados(BANCOS_DEL_BORDE);
  const cuantosBancos = ch.entero(2, 4);
  for (let k = 0; k < cuantosBancos; k++) {
    const b = bancos[k] as readonly [number, number, boolean];
    const [x, z, aLoLargo] = b;
    const mirando = aLoLargo ? (z < 0 ? RUMBO_DE_LA_CARA.sur : RUMBO_DE_LA_CARA.norte) : x < 0 ? RUMBO_DE_LA_CARA.este : RUMBO_DE_LA_CARA.oeste;
    poner(caja(sitioDeBanco(b), 'banco', 0.5, mirando, null, true));
  }

  const coches = ch.barajados(COCHES_DE_LA_PLAZA);
  const cuantosCoches = ch.entero(2, 3);
  for (let k = 0; k < cuantosCoches; k++) {
    const c = coches[k] as (typeof COCHES_DE_LA_PLAZA)[number];
    poner(caja(sitioDeCoche(c.tramo, c.lado, c.a), 'coche', 1.5, rumboALoLargoDe(c.tramo.eje, ch.sale(50) ? 1 : -1), null, true));
  }

  return { tren: { eje, linea, pilares }, refugio, naceRefugio: r.nace, zonaRefugio: { id: 'refugio', clase: 'refugio', caja: r.zona } };
}

/* ─── Las cabinas de la Llamada ───────────────────────────────────────────── */

/**
 * LAS CUATRO CABINAS: una por cuadrante (NE, SE, SO, NO, en ese orden), sorteada entre las
 * candidatas (`CANDIDATAS_DE_CABINA`). Una por cuadrante para que la Llamada no tire siempre hacia
 * el mismo lado, y para que «suena otra» mande a correr en otra dirección.
 */
function lasCabinas(clave: string, poner: (c: CajaDelBarrio) => number): { cabinas: CabinaDelBarrio[]; zonas: ZonaDelBarrio[] } {
  const ch = chorroDeAzar(`${clave}#cabinas`);
  const cabinas: CabinaDelBarrio[] = [];
  const zonas: ZonaDelBarrio[] = [];
  for (let q = 0; q < 4; q++) {
    const c = ch.uno(CANDIDATAS_DE_CABINA[q] as readonly CandidataDeCabina[]);
    const mira = rumboDeTravesDe(c.tramo.eje, -c.lado.hacia);
    const id = `cabina-${String(q + 1)}`;
    cabinas.push({ id, poste: c.poste, mira, caja: poner(caja(sitioDeCabina(c), 'cabina', 2.5, mira, null)), sitio: c.sitio, zona: id, distancia: c.distancia, atajando: c.atajando });
    /*
     * La zona de descolgar: 1,5 m a lo largo y medio metro de fondo, entre el poste y la fachada.
     * Todo punto suyo está a 1,5 m o menos del centro del poste, que es lo que pide descolgar.
     */
    zonas.push({ id, clase: 'cabina', caja: rectanguloEnLaCalle(c.tramo.eje, c.lado, c.a - 0.75, c.a + 0.75, D_ZONA_DE_CABINA[0], D_ZONA_DE_CABINA[1]) });
  }
  return { cabinas, zonas };
}

/* ─── El adorno y el tren ─────────────────────────────────────────────────── */

function elAdorno(clave: string, rotulos: RotuloDelBarrio[]): AdornoDelBarrio {
  const ch = chorroDeAzar(`${clave}#tiempo`);
  const t = ch.entero(0, 9);
  const tiempo: Tiempo = t < 5 ? 'llovizna' : t < 8 ? 'aguacero' : 'niebla';
  const h = ch.entero(1, 4);
  const m = ch.entero(0, 59);
  const nombre = `Glorieta ${ch.uno(NOMBRES_DE_GLORIETA)}`;
  return { tiempo, hora: { h, m }, nombre, rotulo: `${nombre}, ${String(h)}:${m < 10 ? '0' : ''}${String(m)}`, rotulos };
}

function elTren(clave: string, glorieta: LaGlorieta): TrenDelBarrio {
  const ch = chorroDeAzar(`${clave}#tren`);
  const cadaTics = ch.entero(700, 900);
  return {
    eje: glorieta.tren.eje,
    linea: glorieta.tren.linea,
    desde: -30,
    hasta: 30,
    alto: 7.5,
    largo: 36,
    pilares: glorieta.tren.pilares,
    cadaTics,
    desfaseTics: ch.entero(0, cadaTics - 1),
    sentido: ch.sale(50) ? 1 : -1,
  };
}

function losSemaforos(clave: string): number[] {
  const ch = chorroDeAzar(`${clave}#semaforos`);
  const salida: number[] = [];
  for (let k = 0; k < 16; k++) salida.push(ch.entero(0, TICS_DEL_SEMAFORO - 1));
  return salida;
}

/* ─── El barrio ───────────────────────────────────────────────────────────── */

/**
 * EL BARRIO DE UNA NOCHE. Función pura de (código, noche): ver la cabecera.
 *
 * Las cajas salen en este orden, y el orden es parte del contrato (un estampado se cuenta por el
 * índice de la caja): el cerco, los edificios con los pilares de su soportal, las farolas de las
 * aceras, los coches y quioscos de las calles, lo de la glorieta y, al final, las cuatro cabinas.
 * `despejarLaPlaza` quita algunas y renumera, pero sin cambiar el orden de las que quedan.
 *
 * Lo que no depende de la noche se comparte entre barrios y está congelado: ver `congelado`.
 */
export function barrioDeLaNoche(codigo: string, noche: number): Barrio {
  const clave = claveDeLaNoche(codigo, noche);
  const cajas: CajaDelBarrio[] = CAJAS_DEL_CERCO.slice();
  const poner = (c: CajaDelBarrio): number => {
    cajas.push(c);
    return cajas.length - 1;
  };

  const { edificios, porManzana } = levantarLosEdificios(clave, poner);
  for (const f of FAROLAS_DE_LAS_CALLES) cajas.push(f);
  const calles = amueblarLasCalles(clave, poner);
  const glorieta = levantarLaGlorieta(clave, poner);
  const { cabinas, zonas: zonasDeLasCabinas } = lasCabinas(clave, poner);

  const manzanas: ManzanaDelBarrio[] = [];
  for (const m of SOLARES_DE_MANZANA) {
    manzanas.push({
      indice: m.indice,
      columna: m.columna,
      fila: m.fila,
      solar: m.solar,
      tipo: m.indice === LA_GLORIETA ? 'glorieta' : 'edificada',
      edificios: porManzana[m.indice] as number[],
    });
  }

  return {
    codigo: codigo.toUpperCase(),
    noche: normalizarLaNoche(noche),
    semilla: semillaDelCodigo(clave),
    plazaDespejada: false,
    manzanas,
    edificios,
    calles,
    cajas,
    cabinas,
    refugio: glorieta.refugio,
    zonas: [...ZONAS_FIJAS, ...zonasDeLasCabinas, glorieta.zonaRefugio],
    limites: LIMITES,
    nace: { desvelado: NACE_DESVELADO, refugio: glorieta.naceRefugio },
    grafo: GRAFO_DEL_BARRIO,
    aceras: { carriles: CARRILES, nudos: NUDOS_DE_ACERA, tramos: TRAMOS_DE_ACERA, semaforos: losSemaforos(clave) },
    tren: elTren(clave, glorieta),
    adorno: elAdorno(clave, losRotulos(clave, edificios, cajas)),
  };
}

/**
 * LA PLAZA DESPEJADA: el mismo barrio sin sus cajas `despejables` (los coches aparcados junto a la
 * glorieta y los bancos de su borde), con todo lo que apunta a una caja por su índice renumerado.
 *
 * Es la contramedida «Plaza despejada» de la Memoria del Sistema (`docs/EL-QUIEBRO.md` §6.5): quien
 * la aplica es quien lee la vista de la mesa —el productor de la Liza y el cliente—, cada uno con
 * esta misma función, así que la sala choca con lo mismo que el aparato pinta. El barrio sigue
 * siendo de (código, noche): lo que añade la mesa es este paso, y el paso es puro. Despejar dos
 * veces es despejar una. El grafo no cambia: está hecho contra todo lo que puede estorbar, y quitar
 * cajas no tapa ninguna arista.
 */
export function despejarLaPlaza(barrio: Barrio): Barrio {
  if (barrio.plazaDespejada) return barrio;
  const cajas: CajaDelBarrio[] = [];
  const nuevoIndice: number[] = [];
  for (const c of barrio.cajas) {
    nuevoIndice.push(c.despejable ? -1 : cajas.length);
    if (!c.despejable) cajas.push(c);
  }
  const indice = (i: number): number => {
    const j = nuevoIndice[i];
    if (j === undefined || j < 0) throw new RangeError(`La caja ${String(i)} no está o es despejable, y algo del barrio apunta a ella.`);
    return j;
  };
  return {
    ...barrio,
    plazaDespejada: true,
    cajas,
    edificios: barrio.edificios.map((e) => ({ ...e, caja: indice(e.caja), pilares: e.pilares.map(indice) })),
    cabinas: barrio.cabinas.map((c) => ({ ...c, caja: indice(c.caja) })),
    refugio: { ...barrio.refugio, caja: indice(barrio.refugio.caja) },
    tren: { ...barrio.tren, pilares: barrio.tren.pilares.map(indice) },
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  EL GENERADOR DE MANZANAS DE LA CIUDAD ABIERTA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La ciudad de 540 m (`quiebro-ciudad.ts`, `docs/quiebro/CIUDAD-ABIERTA.md` §2.4 y §5.1) viste sus
 * manzanas con esto. Se parte en dos a propósito, porque las dos mitades duran distinto:
 *
 *   · LA FORMA de una manzana —su huella, su caja de choque (UNA por manzana maciza, dos si la parte un
 *     callejón, retranqueada `FONDO_DEL_SOPORTAL` en cada cara con soportal) y sus pilares, uno cada
 *     `PILARES_DE_SOPORTAL_EN_LA_CIUDAD`— es de la TRAZA, la hace la ciudad y es la misma para todas las
 *     mesas de esa traza;
 *   · EL VESTIDO —alturas, estilo, qué planta baja lleva cada fachada, ventanas y rótulos— es del CÓDIGO de
 *     la mesa, con un chorro por manzana (`CÓDIGO#m<hueco>`): lo hace `vestirLaManzana`.
 *
 * Lo que se conserva del barrio: la acera por bandas (la ciudad pone farolas, postes, quioscos y coches en
 * las mismas bandas), los cuartos de metro, el soportal de 3 m, los retranqueos, los rótulos inventados
 * enteros sobre la pared de su planta baja y un chorro por aspecto. Lo que cambia: la manzana ya no se
 * reparte en dos a cuatro edificios (la caja era una por edificio y la ciudad tiene 121 huecos: serían más
 * de 400 cajas sólo de edificios, contra un tope de 2.400 para todo), y las plantas salen del distrito.
 */

/** Cada cuánto lleva pilar un soportal de la ciudad: 6 m (el del barrio, 4). */
export const PILARES_DE_SOPORTAL_EN_LA_CIUDAD = 6;

/** Los cinco distritos, con los nombres de `quiebro-ciudad.ts` (el tipo se repite aquí para no importarlo). */
export type DistritoDeLaManzana = 'casco' | 'ensanche' | 'lonja' | 'naves' | 'torres';

/** Una fachada de la forma: una cara de la huella que da a una calle o a un callejón, y si lleva soportal. */
export interface FachadaDeLaForma {
  readonly cara: Cara;
  readonly linea: number;
  readonly desde: number;
  readonly hasta: number;
  readonly soportal: boolean;
}

/** UNA PARTE DE MANZANA, como la da la traza: su huella, su caja de choque y sus fachadas. */
export interface ParteDeLaManzana {
  readonly huella: Rectangulo;
  readonly caja: Rectangulo;
  readonly fachadas: readonly FachadaDeLaForma[];
}

/** Lo que el código le pone a una parte: sus alturas y sus fachadas. Lo demás de `EdificioDeLaCiudad`, la ciudad. */
export interface EdificioVestido {
  readonly tramos: readonly TramoDeAltura[];
  readonly alto: number;
  readonly estilo: EstiloDeFachada;
  readonly tono: number;
  readonly vano: number;
  readonly balcones: boolean;
  readonly semilla: number;
  readonly fachadas: readonly FachadaDelEdificio[];
}

/** La manzana vestida: un edificio por parte, y sus rótulos (`edificio` es el índice de la PARTE). */
export interface ManzanaVestida {
  readonly edificios: readonly EdificioVestido[];
  readonly rotulos: readonly RotuloDelBarrio[];
}

/** El carácter de cada distrito (§2.2): plantas contando la baja, estilos, tiendas, balcones y neones, en %. */
interface CaracterDelDistrito {
  readonly plantas: readonly [number, number];
  readonly estilos: readonly EstiloDeFachada[];
  readonly tiendas: number;
  readonly balcones: number;
  readonly neon: number;
}

const CARACTER: Readonly<Record<DistritoDeLaManzana, CaracterDelDistrito>> = {
  casco: { plantas: [3, 6], estilos: ['piedra', 'revoco', 'azulejo', 'ladrillo'], tiendas: 65, balcones: 50, neon: 60 },
  ensanche: { plantas: [5, 9], estilos: ['ladrillo', 'revoco', 'azulejo'], tiendas: 75, balcones: 70, neon: 75 },
  lonja: { plantas: [3, 5], estilos: ['ladrillo', 'hormigon', 'revoco'], tiendas: 70, balcones: 30, neon: 50 },
  naves: { plantas: [1, 2], estilos: ['hormigon', 'ladrillo'], tiendas: 10, balcones: 0, neon: 20 },
  torres: { plantas: [12, 30], estilos: ['vidrio', 'hormigon'], tiendas: 40, balcones: 10, neon: 40 },
};

/**
 * Las alturas de una parte. La planta baja siempre es la primera (4,5 m) y el cuerpo la segunda; los
 * edificios de cuatro plantas o más pueden retranquearse como en el barrio. Las naves son de una o dos
 * plantas de 7 a 9 m en total (§2.2): la baja y un cuerpo que llega hasta ahí, sin retranqueos.
 */
function alturasDelDistrito(ch: ChorroDeAzar, distrito: DistritoDeLaManzana): TramoDeAltura[] {
  if (distrito === 'naves') {
    const plantas = ch.entero(1, 2);
    const alto = 7 + 0.5 * ch.entero(0, 4);
    return [
      { plantas: 1, desde: 0, hasta: ALTO_DE_LA_PLANTA_BAJA, entrante: 0 },
      { plantas, desde: ALTO_DE_LA_PLANTA_BAJA, hasta: alto, entrante: 0 },
    ];
  }
  const [minimo, maximo] = CARACTER[distrito].plantas;
  const plantas = ch.entero(minimo, maximo) - 1;
  let arriba = ALTO_DE_LA_PLANTA_BAJA + plantas * ALTO_DE_UNA_PLANTA;
  const tramos: TramoDeAltura[] = [
    { plantas: 1, desde: 0, hasta: ALTO_DE_LA_PLANTA_BAJA, entrante: 0 },
    { plantas, desde: ALTO_DE_LA_PLANTA_BAJA, hasta: arriba, entrante: 0 },
  ];
  if (plantas >= 4 && ch.sale(45)) {
    const primero = ch.entero(1, 2);
    tramos.push({ plantas: primero, desde: arriba, hasta: arriba + primero * ALTO_DE_UNA_PLANTA, entrante: RETRANQUEOS[0] as number });
    arriba += primero * ALTO_DE_UNA_PLANTA;
    if (plantas >= 6 && ch.sale(35)) tramos.push({ plantas: 1, desde: arriba, hasta: arriba + ALTO_DE_UNA_PLANTA, entrante: RETRANQUEOS[1] as number });
  }
  return tramos;
}

/**
 * VISTE UNA MANZANA con el chorro `clave` (la ciudad le pasa `CÓDIGO#m<hueco>`): para cada parte, sus
 * alturas, su estilo, qué hay en la planta baja de cada fachada —el soportal si la forma lo trae; si no,
 * tiendas o portales según el distrito— y la semilla de sus ventanas; y los rótulos, con las mismas reglas
 * que el barrio: los de escaparate ENTEROS en la pared de su planta baja (la caja de choque, metida el
 * fondo del soportal si lo hay), dos por fachada como mucho, y una banderola de neón por manzana según el
 * distrito. Los textos salen barajados por manzana y no se repiten dentro de ella; entre manzanas sí, como
 * en cualquier ciudad con dos bares que se llaman igual.
 */
export function vestirLaManzana(clave: string, distrito: DistritoDeLaManzana, partes: readonly ParteDeLaManzana[]): ManzanaVestida {
  const ch = chorroDeAzar(clave);
  const caracter = CARACTER[distrito];
  const edificios: EdificioVestido[] = [];
  for (const parte of partes) {
    const tramos = alturasDelDistrito(ch, distrito);
    const fachadas: FachadaDelEdificio[] = [];
    for (const f of parte.fachadas) {
      const bajo: PlantaBaja = f.soportal ? 'soportal' : ch.sale(caracter.tiendas) ? 'tiendas' : 'portales';
      fachadas.push({ cara: f.cara, linea: f.linea, desde: f.desde, hasta: f.hasta, bajo });
    }
    edificios.push({
      tramos,
      alto: (tramos[tramos.length - 1] as TramoDeAltura).hasta,
      estilo: ch.uno(caracter.estilos),
      tono: ch.entero(0, 3),
      vano: ch.uno(VANOS),
      balcones: ch.sale(caracter.balcones),
      semilla: ch.entero(0, 4294967295),
      fachadas,
    });
  }
  const tiendas = ch.barajados(ROTULOS_DE_TIENDA);
  const rotulos: RotuloDelBarrio[] = [];
  let siguienteTienda = 0;
  for (let e = 0; e < edificios.length; e++) {
    const bajo = (partes[e] as ParteDeLaManzana).caja;
    for (const f of (edificios[e] as EdificioVestido).fachadas) {
      if (f.bajo === 'portales') continue;
      const porX = f.cara === 'norte' || f.cara === 'sur';
      const pared0 = Math.max(f.desde, porX ? bajo.x0 : bajo.z0);
      const pared1 = Math.min(f.hasta, porX ? bajo.x1 : bajo.z1);
      if (pared1 - pared0 < 3) continue;
      const escaparates = Math.max(1, Math.floor((pared1 - pared0) / 6));
      const fondo = f.bajo === 'soportal' ? FONDO_DEL_SOPORTAL : 0;
      let puestos = 0;
      for (let k = 0; k < escaparates && puestos < 2 && siguienteTienda < tiendas.length; k++) {
        if (!ch.sale(45)) continue;
        const desde = pared0 + 6 * k;
        const hasta = k === escaparates - 1 ? pared1 : desde + 6;
        const p = puntoDeLaFachada(f, (desde + hasta) / 2, fondo);
        rotulos.push({
          texto: tiendas[siguienteTienda] as string,
          clase: 'tienda',
          color: ch.uno(COLORES_DE_ROTULO),
          edificio: e,
          cara: f.cara,
          x: p.x,
          z: p.z,
          y: 3.5,
          ancho: Math.min(4.5, hasta - desde - 1.5),
          alto: 0.75,
          parpadea: ch.sale(8),
        });
        siguienteTienda++;
        puestos++;
      }
    }
  }
  if (edificios.length > 0 && ch.sale(caracter.neon)) {
    const e = ch.entero(0, edificios.length - 1);
    const suyo = edificios[e] as EdificioVestido;
    if (suyo.fachadas.length > 0) {
      const f = ch.uno(suyo.fachadas);
      const alto = ch.uno(ALTOS_DE_NEON);
      const p = puntoDeLaFachada(f, ch.sale(50) ? f.desde + 1 : f.hasta - 1, 0);
      rotulos.push({
        texto: ch.uno(ROTULOS_DE_NEON),
        clase: 'neon',
        color: ch.uno(COLORES_DE_ROTULO),
        edificio: e,
        cara: f.cara,
        x: p.x,
        z: p.z,
        y: ALTO_DE_LA_PLANTA_BAJA + ALTO_DE_UNA_PLANTA + alto / 2,
        ancho: 1,
        alto,
        parpadea: ch.sale(25),
      });
    }
  }
  return { edificios, rotulos };
}

/* ─── El mundo declarado ──────────────────────────────────────────────────── */

/**
 * Lo pisable: el cuadrado de casillas de 2 m que cubre el barrio, igual en todas las noches. Son
 * 6.241 casillas; se montan una vez y todos los mundos las comparten.
 *
 * Se congela la lista y no cada casilla: congelar 6.241 objetos de dos números cuesta 2 ms al
 * cargar, más que todo lo demás junto, para proteger algo que nadie tiene por qué tocar (`arenaDe`
 * sólo las lee, y el tipo es de sólo lectura). La lista, que es lo que alguien podría vaciar o
 * alargar, sí lanza.
 */
const PISABLES_DEL_BARRIO: readonly Casilla[] = Object.freeze(
  ((): Casilla[] => {
    const salida: Casilla[] = [];
    for (let j = -CASILLAS_DEL_CENTRO_AL_BORDE; j <= CASILLAS_DEL_CENTRO_AL_BORDE; j++) {
      for (let i = -CASILLAS_DEL_CENTRO_AL_BORDE; i <= CASILLAS_DEL_CENTRO_AL_BORDE; i++) salida.push({ x: i, y: j });
    }
    return salida;
  })(),
);

/**
 * EL MUNDO DEL BARRIO, con el contrato de `mundo.ts`: casillas de 2 m, todo el barrio pisable y los
 * cuerpos son las cajas, en el mismo orden. Con esto la sala y el aparato usan `arenaDe`,
 * `sePuedeEstar`, `unPaso` y `seAndaEnRecta` tal cual.
 *
 * `nace` va VACÍO, y no por olvido: los sitios de nacer del barrio tienen papel (`Barrio.nace`) y la
 * Liza exige que el suelo no lleve otros (`problemasDeLaDeclaracion`: «mundo.suelo.nace va vacío»),
 * porque dos listas serían dos respuestas a «¿dónde aparezco?». La primera versión los ponía aquí y
 * cualquier productor que usara este mundo como suelo sacaba una declaración inválida. Los sitios
 * van en `mundoDeLaLizaDelBarrio`, con su papel.
 */
export function mundoDelBarrio(barrio: Barrio): MundoDeclarado {
  const cuerpos: Cuerpo[] = [];
  for (const c of barrio.cajas) cuerpos.push({ x0: c.x0, z0: c.z0, x1: c.x1, z1: c.z1 });
  return { lado: LADO_DE_CASILLA, pisables: PISABLES_DEL_BARRIO, vados: [], cuerpos, nace: [] };
}

/* ─── El mundo de la Liza ─────────────────────────────────────────────────── */

/**
 * LAS ETIQUETAS NUMÉRICAS DEL BARRIO EN LA LIZA. La Liza nombra zonas, clases de zona y límites con
 * enteros de 1 a 255 (`IdDeclarado`), porque es lo que viaja en el cable. Se fijan AQUÍ, con el
 * barrio, para que el productor de la sala y el cliente numeren igual sin que ninguno se invente la
 * tabla: el productor dice «los Prestados salen de la clase `CLASE_DE_ZONA_EN_LA_LIZA.aparicion`» y
 * el aparato sabe qué es la zona 17 porque es `idDeZonaEnLaLiza('boca-5-oeste')`.
 */
export const CLASE_DE_ZONA_EN_LA_LIZA: Readonly<Record<ClaseDeZona, number>> = congelado({
  aparicion: 1,
  'aparicion-lejana': 2,
  impresion: 3,
  cabina: 4,
  refugio: 5,
});

export const ID_DE_LIMITE_EN_LA_LIZA: Readonly<Record<IdDeLimite, number>> = congelado({ glorieta48: 1, glorieta60: 2, barrio: 3 });

/**
 * La clase de caja en la Liza. Se escribe aquí y no se importa para que el barrio no cargue la
 * declaración entera de la Liza (lo que cuesta cargar el módulo cuenta: ver `verify:quiebro-barrio`);
 * el tipo sí sale de `CLASE_DE_CAJA`, así que si aquélla cambia el número esto no compila.
 */
const CLASE_DE_CAJA_EN_LA_LIZA: { readonly [K in ClaseDeCaja]: (typeof CLASE_DE_CAJA)[K] } = { alta: 1 };

/**
 * Las zonas en el orden de `Barrio.zonas`, que es el mismo todas las noches (las fijas, las cuatro
 * cabinas y el refugio): su id en la Liza es su puesto más uno.
 */
const ZONAS_EN_LA_LIZA: readonly string[] = congelado([...ZONAS_FIJAS.map((z) => z.id), 'cabina-1', 'cabina-2', 'cabina-3', 'cabina-4', 'refugio']);

/** El id (1-255) de una zona del barrio en la Liza. Lanza con un id que el barrio no tiene. */
export function idDeZonaEnLaLiza(id: string): number {
  const k = ZONAS_EN_LA_LIZA.indexOf(id);
  if (k < 0) throw new RangeError(`El barrio no tiene ninguna zona «${id}».`);
  return k + 1;
}

/** Un rectángulo del barrio en Q16.16: exacto, porque toda medida es un múltiplo de 0,25 m. */
function enFijo(r: Rectangulo): CajaDeLaLiza {
  return { x0: r.x0 * UNO, z0: r.z0 * UNO, x1: r.x1 * UNO, z1: r.z1 * UNO };
}

/**
 * El grafo en la forma de la Liza —nudos en Q16.16, aristas como pares de índices—, guardado por
 * grafo: todos los barrios comparten el mismo, así que se pasa una vez por proceso.
 */
const GRAFOS_EN_LA_LIZA = new WeakMap<GrafoDelBarrio, GrafoDelMundo>();

function grafoEnLaLiza(g: GrafoDelBarrio): GrafoDelMundo {
  const hecho = GRAFOS_EN_LA_LIZA.get(g);
  if (hecho !== undefined) return hecho;
  /* Congelado al hacerse, pieza a pieza: recorrerlo después con `congelado` costaba medio milisegundo. */
  const nuevo: GrafoDelMundo = Object.freeze({
    nudos: Object.freeze(g.nudos.map((n) => Object.freeze({ x: n.x * UNO, z: n.z * UNO }))),
    aristas: Object.freeze(g.aristas.map((a): readonly [number, number] => Object.freeze([a.a, a.b] as const))),
  });
  GRAFOS_EN_LA_LIZA.set(g, nuevo);
  return nuevo;
}

/**
 * EL MUNDO DEL BARRIO PARA LA LIZA (declaración B): el `MundoDeLaLiza` que el productor pone en su
 * `LizaDeclarada`, ya con todo en la forma de la Liza —el suelo de `mundoDelBarrio` (con `nace`
 * vacío), una clase por caja, las zonas y los límites con sus ids numéricos, el grafo en pares y los
 * sitios de nacer con su papel (`asiento` los de los desvelados, `reaparicion` los del refugio)—,
 * todo en Q16.16 exacto. Con la plaza despejada, se le pasa el barrio ya despejado.
 */
export function mundoDeLaLizaDelBarrio(barrio: Barrio): MundoDeLaLiza {
  const clasesDeCaja: number[] = [];
  for (const c of barrio.cajas) clasesDeCaja.push(CLASE_DE_CAJA_EN_LA_LIZA[c.clase]);
  const zonas: ZonaDelMundo[] = [];
  for (const z of barrio.zonas) zonas.push({ id: idDeZonaEnLaLiza(z.id), clase: CLASE_DE_ZONA_EN_LA_LIZA[z.clase], caja: enFijo(z.caja) });
  const limites: LimiteDelMundo[] = [];
  for (const l of barrio.limites) limites.push({ id: ID_DE_LIMITE_EN_LA_LIZA[l.id], caja: enFijo(l.caja) });
  const nace: SitioDeNacer[] = [];
  for (const s of barrio.nace.desvelado) nace.push({ papel: 'asiento', x: s.x * UNO, z: s.z * UNO, rumbo: s.rumbo });
  for (const s of barrio.nace.refugio) nace.push({ papel: 'reaparicion', x: s.x * UNO, z: s.z * UNO, rumbo: s.rumbo });
  return { metrosPorUnidad: UNO, suelo: mundoDelBarrio(barrio), clasesDeCaja, zonas, limites, grafo: grafoEnLaLiza(barrio.grafo), nace };
}

/* ─── Los relojes del barrio ──────────────────────────────────────────────── */

/**
 * ¿PUEDEN CRUZAR AHORA por los pasos del cruce `cruce` los que andan a lo largo de `eje`?
 *
 * El semáforo de cada cruce da 30 s a los que cruzan andando por `x` (con los coches de la calle
 * que corre por `z` en rojo) y 30 s a los que cruzan por `z`, desfasado lo que diga su entrada de
 * `aceras.semaforos`. Lo usan los durmientes para esperar en el bordillo y el cliente para pintar
 * el muñeco.
 */
export function pasoAbierto(barrio: Barrio, cruce: number, eje: Eje, tic: number): boolean {
  const fase = faseDelSemaforo(barrio, cruce, tic);
  return eje === 'x' ? fase < TICS_EN_VERDE : fase >= TICS_EN_VERDE;
}

/** En qué tic de su ciclo de 1.200 va el semáforo de un cruce. Lanza con un cruce que no existe. */
export function faseDelSemaforo(barrio: Barrio, cruce: number, tic: number): number {
  const desfase = barrio.aceras.semaforos[cruce];
  if (!Number.isInteger(cruce) || desfase === undefined) throw new RangeError(`No hay cruce ${String(cruce)}: son 16, del 0 al 15.`);
  return modulo(ticDelBarrio(tic) + desfase, TICS_DEL_SEMAFORO);
}

/** Lo que anda el tren en un tic: 12 m/s. */
const METROS_DEL_TREN_POR_TIC = 0.6;

/**
 * DÓNDE VA EL TREN en un tic, o `null` si no está cruzando: la `cabeza` y la `cola` a lo largo del
 * viaducto, en metros, recortadas a lo que se ve entre las dos fachadas. Todos los aparatos ven
 * pasar el mismo tren a la vez.
 */
export function trenEn(barrio: Barrio, tic: number): { readonly cabeza: number; readonly cola: number } | null {
  const t = barrio.tren;
  const fase = modulo(ticDelBarrio(tic) + t.desfaseTics, t.cadaTics);
  const recorrido = t.hasta - t.desde + t.largo;
  const andado = fase * METROS_DEL_TREN_POR_TIC;
  if (andado >= recorrido) return null;
  const cabeza = t.sentido > 0 ? t.desde + andado : t.hasta - andado;
  const cola = cabeza - t.sentido * t.largo;
  const recortar = (v: number): number => Math.max(t.desde, Math.min(t.hasta, v));
  return { cabeza: recortar(cabeza), cola: recortar(cola) };
}
