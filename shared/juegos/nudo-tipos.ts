/**
 * El Nudo de Valdehierro, en lo que los tres paquetes tienen que saber a la vez.
 *
 * ═══ QUÉ SE JUEGA AQUÍ, EN UNA FRASE ═══
 *
 * Seis convoyes tienen que cruzar el nudo esta noche, uno por franja horaria, y
 * el cuadro de marchas que decía en qué orden se quemó con la oficina del
 * telégrafo. La mesa lo reconstruye juntando los telegramas que cada cual
 * conserva, y lo va comprobando cursando órdenes: el enclavamiento acepta la
 * que toca y rechaza cualquier otra. Cada rechazo cuesta retraso. Si el retraso
 * llega al tope, el puerto se cierra con el Correo dentro.
 *
 * ═══ POR QUÉ ESTE FICHERO Y NO EL DEL SERVIDOR ═══
 *
 * La frontera es la misma que ya trazaron los otros dos juegos: aquí va lo que
 * el taller, el servidor y el móvil tienen que entender IGUAL —la forma del
 * estado, la forma de la trama, y qué significa que un cuadro cumpla un
 * telegrama—, y en `server/src/juegos/nudo-*.ts` va lo que solo hace el
 * servidor: generar el rompecabezas, comprobar sus garantías, redactar los
 * telegramas y arbitrar la noche.
 *
 * El SOLUCIONADOR sí vive aquí, y no por comodidad: lo necesitan el generador
 * (para garantizar que hay una sola solución), la comprobación independiente
 * (para volver a contarlas sin compartir estado con el generador) y el
 * imprimible que se lo enseña a quien dirige. Que las tres cuenten con la misma
 * función es justo lo que hace que estén de acuerdo.
 *
 * ═══ NINGÚN NOMBRE DE AQUÍ CHOCA CON LOS DE LOS OTROS DOS JUEGOS ═══
 *
 * `shared/juegos/index.ts` es un índice PLANO, así que el nombre es el espacio
 * de nombres. `cumple`, `permutaciones` y `solucionesDe` son de El Misterio de
 * la Momia; `cumpleCondicion`, `variaciones` y `sendasDe`, de El Paso de las
 * Sombras. Un tercero que reutilizara cualquiera de los seis no daría un error
 * evidente: resolvería su rompecabezas con las reglas del ajeno. Por eso los de
 * aquí son `cumpleTelegrama`, `ordenaciones` y `cuadrosDe`.
 */

/** Id de un convoy: una entidad de la categoría `convoyes`. */
export type ConvoyId = string;

/** Id de un puesto: una entidad de la categoría `puestos`. Es una habitación. */
export type PuestoId = string;

/** Id de un cargamento: una entidad de la categoría `mercancias`. */
export type MercanciaId = string;

/**
 * Cuántos convoyes cruzan y cuántas franjas tiene la noche.
 *
 * SON EL MISMO NÚMERO Y TIENEN QUE SERLO: el cuadro de marchas es una
 * biyección entre convoyes y franjas, así que sobra o falta uno en cuanto
 * dejan de coincidir. Y son SEIS por una razón que no es estética:
 *
 *   · Los ejes del manifiesto son datos ESTÁTICOS —uno por franja— así que el
 *     número de franjas no puede depender de cuánta gente se siente a la mesa.
 *   · Con seis, el espacio de cuadros posibles es 6! = 720. Es lo bastante
 *     grande para que adivinar salga caro (hasta quince órdenes rechazadas) y
 *     lo bastante pequeño para enumerarlo entero en microsegundos, que es lo
 *     que permite GARANTIZAR una sola solución en vez de confiar en que la haya.
 *   · Seis franjas son seis rondas, que es lo que dura una velada de casa.
 */
export const CONVOYES_DE_LA_NOCHE = 6;
export const FRANJAS_DE_LA_NOCHE = 6;

/**
 * La hora de cada franja, para escribirla en los telegramas y en el cuadro.
 *
 * Índice 0 = franja 1. Se numeran desde 1 de cara a la gente porque «la franja
 * cero» no la dice nadie en una estación.
 */
export const HORAS_DE_FRANJA = ['00:00', '00:40', '01:20', '02:00', '02:40', '03:20'] as const;

/** La hora de una franja (1..6), o cadena vacía si el número no es de esta noche. */
export function horaDeFranja(franja: number): string {
  return HORAS_DE_FRANJA[franja - 1] ?? '';
}

// ---------------------------------------------------------------------------
// El cuadro de marchas y los telegramas que lo describen
// ---------------------------------------------------------------------------

/**
 * Un cuadro de marchas: qué convoy sale en cada franja.
 *
 * Es una LISTA POR FRANJA y no un mapa de convoy a franja, y esa decisión se
 * paga y se cobra: el índice 0 es la franja 1, así que leer «quién sale el
 * tercero» es `cuadro[2]`, mientras que «cuándo sale el Correo» obliga a
 * buscarlo. Se elige así porque la mesa razona por franjas —la noche avanza
 * hora a hora— y porque es la forma en que se despacha: el enclavamiento
 * pregunta «¿quién va ahora?», nunca «¿cuándo va este?».
 */
export type Cuadro = ConvoyId[];

/**
 * La franja (1..N) en la que sale cada convoy. Lo contrario de un `Cuadro`.
 *
 * Se calcula una vez y se consulta muchas: todas las condiciones hablan de «la
 * franja del convoy X», y buscarlo dentro de un `indexOf` por cada comprobación
 * multiplica por seis el trabajo del generador, que enumera 720 cuadros por
 * cada telegrama candidato.
 */
export type FranjaDe = Record<ConvoyId, number>;

/** La tabla inversa de un cuadro. */
export function franjasDe(cuadro: Cuadro): FranjaDe {
  const salida: FranjaDe = {};
  cuadro.forEach((convoy, i) => {
    salida[convoy] = i + 1;
  });
  return salida;
}

/**
 * Un telegrama: una verdad sobre el cuadro, escrita en una tira de papel.
 *
 * ═══ POR QUÉ OCHO TIPOS Y NO TRES ═══
 *
 * El rompecabezas tiene que dar un conjunto de telegramas que (a) determine un
 * solo cuadro y (b) sea lo bastante GRANDE para repartirlo entre la mesa, que
 * puede ser de doce personas. Y esas dos cosas tiran en direcciones contrarias:
 * cuanta más información lleva cada telegrama, menos telegramas hacen falta.
 *
 * Con solo condiciones fuertes —«el X sale justo antes que el Y»— el conjunto
 * mínimo baja a cinco o seis y media mesa se queda sin papel. Con solo débiles
 * —«el X no sale en la franja de las 02:00»— sube a quince, pero el juego se
 * convierte en tachar casillas y se pierde la conversación.
 *
 * Los ocho tipos están ordenados de más débil a más fuerte y el generador elige
 * la mezcla según cuánta gente juegue: mesas grandes, telegramas más flojos y
 * más numerosos; mesas pequeñas, más variedad. Es lo que hace que el mismo
 * juego se lea distinto con cinco personas y con once.
 */
export type Telegrama =
  /** «El X no puede ocupar la franja de las HH:MM.» */
  | { tipo: 'no-franja'; convoy: ConvoyId; franja: number }
  /**
   * «El X solo puede cruzar con el paso a nivel abierto / cerrado.»
   *
   * El paso a nivel de la carretera se abre en las franjas impares y se cierra
   * en las pares. Es la condición que más se parece a una regla de estación y
   * la que mejor funciona en la mesa: parte los seis en dos grupos de tres.
   */
  | { tipo: 'paridad'; convoy: ConvoyId; impar: boolean }
  /** «El X y el Y no pueden salir en franjas seguidas.» (Se cruzarían.) */
  | { tipo: 'no-seguidos'; a: ConvoyId; b: ConvoyId }
  /** «El X y el Y salen los dos antes del relevo, o los dos después.» */
  | { tipo: 'bloque'; a: ConvoyId; b: ConvoyId }
  /** «El X ha de haber salido antes que el Y.» */
  | { tipo: 'antes'; antes: ConvoyId; despues: ConvoyId }
  /** «Entre el X y el Y han de mediar al menos N franjas.» */
  | { tipo: 'separados'; a: ConvoyId; b: ConvoyId; franjas: number }
  /** «El Y sale entre el X y el Z, en el sentido que sea.» */
  | { tipo: 'entre'; a: ConvoyId; medio: ConvoyId; c: ConvoyId }
  /** «El X y el Y salen en franjas seguidas, en el orden que sea.» */
  | { tipo: 'seguidos'; a: ConvoyId; b: ConvoyId };

/** El tipo de un telegrama, para pesarlo y para contarlos. */
export type TipoDeTelegrama = Telegrama['tipo'];

/**
 * ¿Cumple este cuadro lo que dice el telegrama?
 *
 * ES LA ÚNICA DEFINICIÓN DE LO QUE SIGNIFICA CADA TIPO, y por eso vive en
 * `shared/`: la usan el generador (para elegir telegramas ciertos), el
 * comprobador (para contar soluciones), el arbitraje de la noche y el
 * imprimible que enseña las garantías. Dos definiciones distintas de «seguidos»
 * en dos ficheros darían un rompecabezas que se genera bien y se resuelve mal.
 *
 * El «relevo» de la condición `bloque` es el corte entre la primera y la
 * segunda mitad de la noche: con seis franjas, entre la 3 y la 4.
 */
export function cumpleTelegrama(donde: FranjaDe, t: Telegrama): boolean {
  const mitad = FRANJAS_DE_LA_NOCHE / 2;
  switch (t.tipo) {
    case 'no-franja':
      return donde[t.convoy] !== t.franja;
    case 'paridad':
      return ((donde[t.convoy] ?? 0) % 2 === 1) === t.impar;
    case 'no-seguidos':
      return Math.abs((donde[t.a] ?? 0) - (donde[t.b] ?? 0)) !== 1;
    case 'bloque':
      return ((donde[t.a] ?? 0) <= mitad) === ((donde[t.b] ?? 0) <= mitad);
    case 'antes':
      return (donde[t.antes] ?? 0) < (donde[t.despues] ?? 0);
    case 'separados':
      return Math.abs((donde[t.a] ?? 0) - (donde[t.b] ?? 0)) >= t.franjas;
    case 'entre': {
      const a = donde[t.a] ?? 0;
      const m = donde[t.medio] ?? 0;
      const c = donde[t.c] ?? 0;
      return (a < m && m < c) || (c < m && m < a);
    }
    case 'seguidos':
      return Math.abs((donde[t.a] ?? 0) - (donde[t.b] ?? 0)) === 1;
  }
}

/**
 * La clave de un telegrama, para no repetir el mismo dos veces.
 *
 * Los simétricos se normalizan —`no-seguidos` de A y B es el mismo telegrama
 * que el de B y A— porque si no, el generador podría elegir los dos, la
 * minimización quitaría uno y el otro se quedaría en el reparto como un
 * telegrama que no aporta nada. Un telegrama que no aporta nada es una persona
 * de la mesa que no pinta nada.
 */
export function claveDeTelegrama(t: Telegrama): string {
  const par = (a: string, b: string): string => (a < b ? `${a}~${b}` : `${b}~${a}`);
  switch (t.tipo) {
    case 'no-franja':
      return `no-franja:${t.convoy}:${t.franja}`;
    case 'paridad':
      return `paridad:${t.convoy}:${t.impar ? 'impar' : 'par'}`;
    case 'no-seguidos':
      return `no-seguidos:${par(t.a, t.b)}`;
    case 'bloque':
      return `bloque:${par(t.a, t.b)}`;
    case 'antes':
      return `antes:${t.antes}>${t.despues}`;
    case 'separados':
      return `separados:${par(t.a, t.b)}:${t.franjas}`;
    /* El del medio NO se normaliza: es el que da sentido a la condición. */
    case 'entre':
      return `entre:${par(t.a, t.c)}:${t.medio}`;
    case 'seguidos':
      return `seguidos:${par(t.a, t.b)}`;
  }
}

/**
 * Todas las ordenaciones de una lista.
 *
 * Se llama así y no `permutaciones` porque ese nombre ya es de El Misterio de
 * la Momia y el índice de juegos es plano. Ver la cabecera de este fichero.
 *
 * Con seis convoyes son 720 listas. El generador las pide una vez y las
 * reutiliza; llamarlo con más de ocho elementos es un error de uso y lo dice
 * `cuadrosDe`, no esta función, que es puro cálculo.
 */
export function ordenaciones<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items.slice()];
  const salida: T[][] = [];
  for (let i = 0; i < items.length; i++) {
    const resto = items.slice(0, i).concat(items.slice(i + 1));
    for (const cola of ordenaciones(resto)) salida.push([items[i]!, ...cola]);
  }
  return salida;
}

/** El tope de convoyes que este solucionador acepta enumerar de golpe. */
export const CONVOYES_MAXIMOS = 8;

/**
 * Los cuadros que cumplen TODOS los telegramas.
 *
 * Por enumeración completa y a propósito. Con 6 convoyes son 720 cuadros; con
 * los ocho que admite el tope, 40 320. Un solucionador con poda sería más
 * rápido y sería la clase de código donde un fallo sutil te devuelve «una sola
 * solución» cuando hay dos — y esa mentira no la ve nadie hasta que doce
 * personas están en la mesa discutiendo dos cuadros igual de válidos.
 *
 * Enumerar entero no puede equivocarse en eso.
 */
/**
 * Los 720 cuadros de la ÚLTIMA lista de convoyes con la que se preguntó, con su
 * tabla inversa ya calculada.
 *
 * ═══ POR QUÉ HAY UNA CACHÉ Y POR QUÉ ES DE UNA SOLA ENTRADA ═══
 *
 * `verificarCuadro` llama a esta función unas treinta veces seguidas con la
 * MISMA lista —una por telegrama para ver si sobra, una por persona para ver si
 * puede resolverlo sola— y cada llamada volvía a construir las 720 ordenaciones
 * por recursión. Eso es el 90 % del coste de la comprobación, y se paga por
 * cada partida que se genera y por cada uno de los doscientos cuadros que traza
 * el comprobador.
 *
 * De UNA entrada, y no un mapa que crezca: en un proceso se generan partidas de
 * una en una, así que una entrada acierta siempre y no hay nada que vaciar.
 *
 * SE DEVUELVEN COPIAS. Los cuadros guardados aquí no salen nunca de este
 * módulo: quien recibe la lista puede ordenarla, recortarla o escribir dentro, y
 * si le diéramos las de la caché corromperría las respuestas de después. Copiar
 * seis cadenas es gratis al lado de reconstruir setecientas veinte listas.
 */
let cacheDeCuadros: { clave: string; cuadros: Cuadro[]; donde: FranjaDe[] } | undefined;

function tablaDeCuadros(convoyes: ConvoyId[]): { cuadros: Cuadro[]; donde: FranjaDe[] } {
  const clave = convoyes.join(' ');
  if (cacheDeCuadros?.clave === clave) return cacheDeCuadros;
  const cuadros = ordenaciones(convoyes);
  const tabla = { clave, cuadros, donde: cuadros.map(franjasDe) };
  cacheDeCuadros = tabla;
  return tabla;
}

export function cuadrosDe(convoyes: ConvoyId[], telegramas: Telegrama[]): Cuadro[] {
  if (convoyes.length > CONVOYES_MAXIMOS) {
    throw new Error(
      `Son demasiados convoyes (${convoyes.length}). El máximo es ${CONVOYES_MAXIMOS}: por ` +
        'encima, enumerar todos los cuadros deja de terminar en un tiempo razonable.',
    );
  }
  const { cuadros, donde } = tablaDeCuadros(convoyes);
  const salida: Cuadro[] = [];
  for (let i = 0; i < cuadros.length; i++) {
    if (telegramas.every((t) => cumpleTelegrama(donde[i]!, t))) salida.push([...cuadros[i]!]);
  }
  return salida;
}

// ---------------------------------------------------------------------------
// Los oficios y los instrumentos de la estación
// ---------------------------------------------------------------------------

/**
 * Los cuatro oficios del turno de noche.
 *
 * Cada puesto de la estación —o sea, cada habitación de la casa— ejerce uno, y
 * cada persona tiene el suyo. Dos cosas distintas: el puesto dice QUÉ
 * instrumento hay ahí, y el oficio de la persona dice DÓNDE rinde más.
 *
 * Son CUATRO y no seis porque cada uno trae un instrumento entero —su
 * generador, su comprobador y su pantalla— y cuatro es lo que se puede escribir
 * bien. Una casa con seis habitaciones tendrá dos garitas de agujas, que es lo
 * que pasa en una estación de verdad.
 */
export const OFICIOS = ['agujas', 'telegrafo', 'enclavamiento', 'muelle'] as const;
export type OficioId = (typeof OFICIOS)[number];

/** Cómo se llama cada oficio, y qué se hace en él. */
export const NOMBRE_DE_OFICIO: Record<OficioId, string> = {
  agujas: 'Garita de agujas',
  telegrafo: 'Cuarto del telégrafo',
  enclavamiento: 'Cuadro de enclavamiento',
  muelle: 'Muelle de carga',
};

export const OFICIO_DE_PERSONA: Record<OficioId, string> = {
  agujas: 'guardagujas',
  telegrafo: 'telegrafista',
  enclavamiento: 'factor de circulación',
  muelle: 'jefe de carga',
};

/**
 * Lo que puedes hacer tú y nadie más, UNA VEZ EN TODA LA NOCHE.
 *
 * Va atada al oficio y no repartida aparte, y eso es una decisión de diseño:
 * quien lleva la garita SABE qué puede hacer con la garita, así que su maña se
 * explica sola y no hay que releer el dosier a las dos de la mañana.
 *
 * Son una por oficio, cada una toca una parte distinta de la economía de la
 * noche (el retraso, el archivo, las conformidades y el margen) y ninguna
 * resuelve el rompecabezas: dan aire, no respuestas.
 */
export const MANA_DE_OFICIO: Record<OficioId, { nombre: string; texto: string }> = {
  agujas: {
    nombre: 'Cambio de aguja',
    texto:
      'Una vez en toda la noche: la siguiente orden que te rechacen a TI no cuenta retraso. ' +
      'Dilo en voz alta antes de cursarla.',
  },
  telegrafo: {
    nombre: 'Línea directa',
    texto: 'Una vez en toda la noche: tu siguiente consulta al archivo sale gratis.',
  },
  enclavamiento: {
    nombre: 'Llave maestra',
    texto:
      'Una vez en toda la noche: cursas una orden sin gastar conformidad. Sirve cuando la ' +
      'estación se ha quedado sin ninguna.',
  },
  muelle: {
    nombre: 'Doble turno',
    texto: 'Una vez en toda la noche: ganas tres de margen de golpe.',
  },
};

/** Los cuatro instrumentos. Un instrumento por oficio, y por eso el mismo id. */
export type InstrumentoId = OficioId;

/**
 * Un instrumento planteado: lo que hay que resolver en un puesto y una franja.
 *
 * ═══ LO PLANTEA EL SERVIDOR, SIEMPRE ═══
 *
 * Podría plantearlo el móvil y ahorrarse un viaje. No se hace, y no por
 * desconfianza: es que el instrumento tiene que ser EL MISMO para todo el que
 * se acerque a ese puesto en esa franja. Eso es lo que convierte un puesto en
 * un sitio al que se va —dos personas delante del mismo cuadro de palancas
 * discutiendo qué palanca baja— en vez de en un solitario que cada cual juega
 * en su pantalla.
 *
 * Y de paso el servidor conoce la solución, así que puede comprobar la
 * respuesta en vez de creerse una puntuación que manda el móvil.
 *
 * `planteamiento` es `unknown` a propósito: cada instrumento tiene la suya y el
 * transporte no necesita entenderla. Las cuatro formas concretas están abajo.
 */
export interface Instrumento {
  puesto: PuestoId;
  franja: number;
  cual: InstrumentoId;
  /** Lo que se le enseña a quien lo va a resolver. NUNCA lleva la solución. */
  planteamiento: unknown;
  /** Quién lo ha resuelto ya, en esta franja. El primero da la conformidad. */
  resueltoPor: string[];
}

/**
 * LA MANIOBRA. Ordenar una rama de vagones con dos vías muertas.
 *
 * El tren entra por la vía de entrada, se van apartando vagones a una de las
 * dos vías muertas y se van sacando por la vía de salida. Solo se puede tocar
 * el vagón de cabeza de la entrada y el último que se apartó en cada vía
 * muerta: una vía muerta es una pila, y eso no es una simplificación sino la
 * geometría del sitio.
 *
 * SE GENERA CON SOLUCIÓN GARANTIZADA. El generador busca una de verdad antes de
 * entregar el planteamiento; si no la encuentra, tira ese y prueba otro. La
 * alternativa —confiar en que dos pilas ordenan cualquier permutación— es
 * falsa, y el fallo saldría con alguien delante del móvil a las dos de la
 * mañana sin poder terminar.
 */
export interface ManiobraPlanteada {
  /** Los vagones tal como entran, el primero es el de cabeza. */
  entrada: string[];
  /** El orden en que tienen que quedar al salir. */
  objetivo: string[];
  /** En cuántos movimientos se puede hacer. Lo sabe el servidor. */
  optimo: number;
}

/** Un movimiento de la maniobra. */
export type MovimientoDeManiobra =
  /** Apartar el vagón de cabeza de la entrada a la vía muerta 1 o 2. */
  | { hacer: 'apartar'; via: 1 | 2 }
  /** Sacar el último vagón apartado de esa vía muerta hacia la salida. */
  | { hacer: 'sacar'; via: 1 | 2 }
  /** Pasar el vagón de cabeza de la entrada directamente a la salida. */
  | { hacer: 'pasar' };

/**
 * EL PARTE. Un mensaje en Morse que hay que transcribir.
 *
 * La palabra sale del vocabulario de ESTA partida —el nombre de un convoy, de
 * un puesto o de un cargamento— así que el telégrafo habla de lo que hay encima
 * de la mesa. Es lo que separa un minijuego pegado con cola de uno que
 * pertenece a la velada.
 */
export interface PartePlanteado {
  /** El Morse que se emite, letra a letra. Sin la palabra en claro. */
  morse: string[];
  /** Cuántas letras tiene, para dibujar los huecos. */
  letras: number;
  /** De dónde sale la palabra, para que la pista tenga sentido. */
  pista: string;
}

/**
 * EL ENCLAVAMIENTO. Un cuadro de palancas con bloqueos mecánicos.
 *
 * Se pide un itinerario, que exige tener BAJADAS ciertas palancas. Y hay
 * bloqueos: pares de palancas que no pueden estar bajadas a la vez, y palancas
 * que arrastran a otra (si bajas la 3, la 7 tiene que estar bajada). Hay que
 * encontrar la configuración legal con el MENOR número de palancas bajadas.
 *
 * SE GENERA CON SOLUCIÓN ÚNICA. El servidor enumera las 2^N configuraciones
 * —con N ≤ 10 son 1024— y solo entrega el planteamiento si el mínimo legal es
 * único. Sin eso, dos personas darían dos respuestas igual de buenas y una
 * saldría rechazada.
 */
export interface EnclavamientoPlanteado {
  /** Cuántas palancas tiene el cuadro. */
  palancas: number;
  /** Las que el itinerario exige bajadas. */
  exigidas: number[];
  /** Pares que no pueden estar bajados a la vez. */
  incompatibles: Array<[number, number]>;
  /** «Si bajas la a, la b tiene que estar bajada.» */
  arrastres: Array<[number, number]>;
  /** Cómo se llama el itinerario que se pide. Ambientación. */
  itinerario: string;
}

/**
 * EL CARGUE. Repartir bultos entre vagones sin pasarse de peso.
 *
 * Con una vuelta de tuerca que lo hace un rompecabezas y no una suma: hay
 * parejas de bultos que no pueden viajar en el mismo vagón.
 *
 * SE GENERA POR CONSTRUCCIÓN: primero se reparte al azar, luego se calculan los
 * topes a partir de ese reparto. Así hay al menos una solución por definición.
 * No se exige que sea única —repartir bultos admite simetrías tontas, como
 * intercambiar dos vagones vacíos— y por eso se comprueba la VALIDEZ de lo que
 * llega, no su igualdad con nada.
 */
export interface CarguePlanteado {
  bultos: Array<{ id: string; nombre: string; peso: number }>;
  vagones: Array<{ id: string; nombre: string; tope: number }>;
  /** Parejas de bultos que no pueden compartir vagón. */
  incompatibles: Array<[string, string]>;
}

// ---------------------------------------------------------------------------
// La trama: lo que se decide al generar y no cambia
// ---------------------------------------------------------------------------

/** Un telegrama con su texto ya redactado, tal como se imprime en la tira. */
export interface TelegramaEscrito {
  id: string;
  telegrama: Telegrama;
  /** El texto de la tira, en mayúsculas y con STOP, como un telegrama de 1927. */
  texto: string;
}

/**
 * Lo que se decide al escribir la partida y no cambia en toda la noche.
 *
 * Vive en `plot.delJuego`, que para el contrato general es `unknown`: quien lo
 * escribe y quien lo lee es el mismo juego, así que el motor lo transporta sin
 * mirar dentro. La comprobación de que nada de esto apunta a una entidad
 * borrada la hace `referenciasDeLaTrama` en el manifiesto.
 */
export interface TramaNudo {
  /** El cuadro verdadero: qué convoy sale en cada franja. */
  cuadro: Cuadro;
  /** Los telegramas que lo determinan. Juntos, un solo cuadro los cumple. */
  telegramas: TelegramaEscrito[];
  /** Qué telegramas lleva cada ferroviario. Ids de `telegramas`. */
  reparto: Record<string, string[]>;
  /** Cuál de los convoyes es el Correo de Medianoche. */
  correo: ConvoyId;
  /** Qué oficio ejerce cada puesto de la casa. */
  oficioDePuesto: Record<PuestoId, OficioId>;
  /** Qué oficio tiene cada persona. */
  oficioDePersona: Record<string, OficioId>;
  /** Qué lleva cada convoy. Ambientación y hoja de porte. */
  cargaDeConvoy: Record<ConvoyId, MercanciaId>;
  /**
   * El parte de novedades que se lee en voz alta al abrir cada franja.
   *
   * ═══ POR QUÉ VIVE AQUÍ Y NO EN LA MECÁNICA DE PISTAS ═══
   *
   * Una pista es «entras en un sitio y encuentras algo», y en esta noche no se
   * entra a ningún sitio a encontrar nada: se va a un puesto a TRABAJAR. Meter
   * los partes en `plot.mecanicas.pistas` sería declarar que este juego usa una
   * mecánica que no usa, y de rebote le daría a la plataforma la impresión de
   * que hay hallazgos que proyectar.
   *
   * Son texto de ambiente y son de este juego, así que van en su trama. Índice
   * 0 = franja 1.
   */
  partes: string[];
  /** Cuántas franjas se juegan. Igual a `cuadro.length`; se guarda por claridad. */
  franjas: number;
  /** El tope de retraso de esta partida. Pasado él, el puerto se cierra. */
  retrasoMaximo: number;
}

// ---------------------------------------------------------------------------
// El estado: lo que va cambiando durante la noche
// ---------------------------------------------------------------------------

/** Lo que la estación lleva encima esta noche. */
export interface EstadoDeFerroviario {
  /** Margen personal: se gana resolviendo instrumentos y se gasta en el archivo. */
  margen: number;
  /** ¿Ha usado ya su maña? Una por noche. */
  manaUsada: boolean;
  /**
   * Efectos de la maña pendientes de consumir.
   *
   * Van aquí y no en un campo aparte porque son EL MISMO acto visto en dos
   * momentos: se declara al usarla y se gasta en la acción siguiente.
   */
  indulto: boolean;
  consultaGratis: boolean;
  sinConformidad: boolean;
  /** Cuántas consultas al archivo ha hecho. Para el trofeo y para el parte. */
  consultas: number;
  /** Instrumentos resueltos en toda la noche. Para los trofeos. */
  instrumentosResueltos: number;
}

/** Una orden cursada, aceptada o rechazada. Es la crónica de la noche. */
export interface OrdenCursada {
  franja: number;
  convoy: ConvoyId;
  quien: string;
  aceptada: boolean;
  /** Qué costó de retraso. Cero si se aceptó o si hubo indulto. */
  retraso: number;
  at: string;
}

/**
 * El estado de la noche.
 *
 * ═══ QUÉ NO ESTÁ AQUÍ, Y ES LO IMPORTANTE ═══
 *
 * No está el cuadro verdadero. Está en la TRAMA, que es lo que no viaja al
 * móvil: la proyección de este juego compone lo que cada cual puede ver y esto
 * entero es público salvo los telegramas ajenos y el margen de los demás. Si el
 * cuadro estuviera aquí, bastaría con mirar el JSON de la vista para ganar.
 */
export interface EstadoNudo {
  /**
   * Cuántos convoyes se han despachado ya.
   *
   * ES EL ÍNDICE DEL SIGUIENTE, y de ahí sale la regla que hace justo el juego:
   * el enclavamiento acepta el convoy que el cuadro pone en esta posición y
   * ningún otro. Una franja perdida no rompe la noche —el cuadro se corre
   * entero, como se corre un horario de verdad— así que la mesa siempre puede
   * recuperarse. Lo que no se recupera es el tiempo.
   */
  despachados: number;
  /** Los convoyes ya salidos, en el orden en que salieron. */
  salidos: ConvoyId[];
  /** El retraso acumulado, en minutos de estación. */
  retraso: number;
  /** Conformidades disponibles: lo que se gasta al cursar una orden. */
  conformidades: number;
  /** Puestos que ya han dado su conformidad en la franja en curso. */
  puestosRendidos: PuestoId[];
  /** Los instrumentos planteados de la franja en curso, por puesto. */
  instrumentos: Record<PuestoId, Instrumento>;
  /** El estado de cada persona. */
  gente: Record<string, EstadoDeFerroviario>;
  /** Todas las órdenes cursadas. */
  ordenes: OrdenCursada[];
  /** Franjas que se cerraron sin despachar nada. */
  franjasPerdidas: number[];
  /**
   * El parte del amanecer, cuando quien dirige lo da.
   *
   * Se ESCRIBE, no se recalcula. El resultado depende del estado en ese
   * instante y el estado sigue vivo: sin escribirlo, una orden que llegara
   * tarde cambiaría un final que ya se ha dicho en voz alta.
   */
  amanecer?: {
    /** Convoyes que cruzaron. */
    cruzaron: number;
    /** ¿Cruzó el Correo de Medianoche? */
    correoPaso: boolean;
    /** Retraso final, ya con la penalización de los que no salieron. */
    retrasoFinal: number;
    /** ¿Se cerró el puerto? */
    puertoCerrado: boolean;
    /** Quiénes ganaron. Vacío si se perdió la noche. */
    ganadores: string[];
    /** Lo que se lee en voz alta. */
    anuncio: string;
  };
}

// ---------------------------------------------------------------------------
// La economía de la noche
// ---------------------------------------------------------------------------

/**
 * Lo que cuesta que el enclavamiento te rechace una orden.
 *
 * ═══ SON DOS Y NO UNO, Y LO DECIDIÓ UNA CUENTA ═══
 *
 * Empezó valiendo uno, que suena mejor. Con uno, adivinar a ciegas cuesta de
 * media 7,5 minutos —hay que probar 2,5 convoyes por franja de media hasta dar
 * con el bueno— y el tope de la noche anda por 10 o 13. O sea que **una mesa
 * que no dedujera absolutamente nada ganaría la noche**, y toda la mitad de
 * juego que hay en las tiras de telegrama pasaría a ser decorativa.
 *
 * Con dos, adivinar cuesta 15 de media y el tope sigue estando donde estaba:
 * adivinar pierde, deducir gana, y equivocarse tres o cuatro veces —que es lo
 * que le pasa a una mesa que razona pero se atasca— sigue cabiendo de sobra.
 * Lo comprueba `verify:cuadro-nudo`, que compara el tope con el coste esperado
 * de adivinar en vez de darlo por bueno.
 */
export const RETRASO_POR_ORDEN_RECHAZADA = 2;

/** Lo que cuesta cerrar una franja sin haber despachado nada. */
export const RETRASO_POR_FRANJA_PERDIDA = 2;

/** Lo que cuesta al amanecer cada convoy que no llegó a salir. */
export const RETRASO_POR_CONVOY_VARADO = 3;

/** Conformidades que la estación regala al abrir cada franja. */
export const CONFORMIDADES_DE_OFICIO = 1;

/** Margen que da resolver un instrumento, y el extra si es el de tu oficio. */
export const MARGEN_POR_INSTRUMENTO = 1;
export const MARGEN_EXTRA_EN_TU_OFICIO = 1;

/** Lo que cuesta preguntarle al archivo si un convoy cabe en una franja. */
export const MARGEN_POR_CONSULTA = 2;

/** Lo que cuesta recuperar un minuto de retraso, y cuánto recupera. */
export const MARGEN_POR_RECUPERAR = 3;
export const RETRASO_QUE_RECUPERA = 1;

/**
 * El tope de retraso: pasado él, el puerto se cierra con el Correo dentro.
 *
 * ═══ DE DÓNDE SALE EL NÚMERO ═══
 *
 * Una mesa que adivine a ciegas gasta, de media, la mitad de los convoyes que
 * le quedan en cada franja: 5+4+3+2+1 partido por dos, unas siete u ocho
 * órdenes rechazadas, más alguna franja perdida. O sea que adivinar del todo
 * ronda el tope y lo pasa en cuanto hay mala suerte.
 *
 * Una mesa que deduzca bien lo cierra en cero o en uno. Entre las dos hay
 * espacio para equivocarse dos o tres veces, que es donde vive la partida.
 *
 * ESCALA CON LA MESA, y poco: una mesa grande resuelve más instrumentos y tiene
 * más margen que gastar, pero también tarda más en ponerse de acuerdo. Un punto
 * por cada dos personas por encima de seis es suficiente para que once personas
 * no lo tengan más difícil que cinco por el hecho de ser once.
 *
 * ═══ Y EL TECHO ES 13 POR UNA RAZÓN EXACTA ═══
 *
 * Adivinar a ciegas cuesta de media 7,5 órdenes rechazadas —2,5 por franja— y
 * cada una vale `RETRASO_POR_ORDEN_RECHAZADA`, o sea 15 minutos. El tope tiene
 * que quedar POR DEBAJO de eso o adivinar sería una estrategia ganadora y las
 * tiras de telegrama, un adorno. Con 13 se pierde adivinando y se gana
 * deduciendo aunque te equivoques tres veces.
 *
 * Estaba en 16 y `verify:cuadro-nudo` lo cazó: con dieciséis personas el tope
 * llegaba a igualar el peor caso de adivinar, y a partir de ahí la mesa más
 * grande era la que menos tenía que pensar.
 */
export function retrasoMaximoPara(ferroviarios: number): number {
  return Math.min(13, 10 + Math.floor(Math.max(0, ferroviarios - 6) / 2));
}

/**
 * Normaliza lo que alguien teclea antes de compararlo.
 *
 * Se usa en el parte del telégrafo: se transcribe a mano, de oído, con ruido y
 * con prisa. Sin esto, una tilde de más o una mayúscula darían por fallado un
 * parte que estaba bien tomado, y eso no es dificultad: es una trampa.
 */
export function normalizarParte(valor: string): string {
  return valor
    .normalize('NFD')
    /* Los diacríticos combinantes, escritos con su código: escribirlos tal cual
       deja el fichero con caracteres invisibles que nadie puede revisar. */
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
}

/**
 * El alfabeto Morse que usa el telégrafo de Valdehierro.
 *
 * Sin Ñ ni acentos a propósito: `normalizarParte` los quita antes de emitir, así
 * que una palabra con eñe se emite como si fuera con ene y se acepta escrita de
 * las dos formas. Un telegrafista de 1927 hacía exactamente eso.
 */
export const MORSE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
  I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
  Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
};

/** Una palabra en Morse, letra a letra. Cadena vacía para lo que no se puede emitir. */
export function aMorse(palabra: string): string[] {
  return normalizarParte(palabra)
    .split('')
    .map((letra) => MORSE[letra] ?? '');
}
