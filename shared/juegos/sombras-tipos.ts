/**
 * Los tipos propios de El Paso de las Sombras.
 *
 * POR QUÉ VIVEN EN `shared/`. Por lo mismo que los de la Momia: los tienen que
 * entender los tres paquetes a la vez. El servidor los genera y los guarda, el
 * taller los enseña a quien dirige y la app los pinta. Lo que solo necesita el
 * servidor —el esquema con el que se le pide la trama al modelo, el generador
 * del rompecabezas— vive en `server/src/`.
 *
 * POR QUÉ EN UN FICHERO APARTE Y NO EN `tipos.ts`. Porque `tipos.ts` describe
 * qué es UN JUEGO CUALQUIERA y esto describe UNO concreto. La prueba de que la
 * frontera está bien puesta es que `tipos.ts` no importa nada de aquí.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUÉ NADA DE AQUÍ SE LLAMA COMO SU GEMELO DE LA MOMIA
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `shared/juegos/index.ts` reexporta UNO A UNO —no con estrella— y desde el
 * mismo espacio de nombres: `cumple`, `permutaciones` y `solucionesDe` ya son
 * de la Momia. Un juego nuevo que reutilizara esos nombres no daría un conflicto
 * evidente sino algo peor: el reexportado se resolvería a favor de uno de los
 * dos y el otro juego resolvería su rompecabezas con las reglas del ajeno.
 *
 * Así que aquí se llaman `cumpleCondicion`, `variaciones` y `sendasDe`. Es más
 * largo de escribir y es lo correcto: mientras el índice sea plano, el nombre
 * es el espacio de nombres.
 */

/** Un paso del camino, identificado por la entidad que lo representa. */
export type PasoId = string;

/**
 * Una condición sobre la senda.
 *
 * Siete formas, dos más que las cinco de la Momia, y las dos nuevas —`pasa-por`
 * y `no-pasa-por`— son las que hacen el rompecabezas BIDIMENSIONAL: allí se
 * ordenaban cinco ritos que estaban todos dentro; aquí hay que averiguar a la
 * vez CUÁLES de los pasos forman la senda y EN QUÉ ORDEN. Sin ellas, saber que
 * un paso queda fuera no se podría decir de ninguna manera y la mitad del
 * problema no tendría pistas.
 *
 * SEMÁNTICA EXACTA, porque de ella depende que la deducción sea sana:
 *
 *   · `antes`, `seguido`, `posicion`, `extremo` y `pasa-por` AFIRMAN
 *     pertenencia: son falsas si el paso no está en la senda.
 *   · `no-posicion` y `no-pasa-por` son ciertas cuando el paso queda fuera.
 *
 * Dicho de otro modo: una afirmación positiva sobre un paso implica que ese
 * paso se pisa. Es lo que una persona entendería al leer «el Vado va antes que
 * el Collado», y hacer que el código lo entienda igual es lo que evita
 * discusiones a las dos de la mañana.
 */
export type Condicion =
  /** A se cruza en algún momento antes que B. Los dos están en la senda. */
  | { tipo: 'antes'; a: PasoId; b: PasoId }
  /** De A se sale directo a B, sin nada en medio. */
  | { tipo: 'seguido'; a: PasoId; b: PasoId }
  /** A es exactamente el tramo número N (1..4). */
  | { tipo: 'posicion'; a: PasoId; posicion: number }
  /** A no es el tramo número N. Cierta también si A no está en la senda. */
  | { tipo: 'no-posicion'; a: PasoId; posicion: number }
  /** A abre o cierra la senda, nunca va en medio. */
  | { tipo: 'extremo'; a: PasoId }
  /** La senda pasa por A. */
  | { tipo: 'pasa-por'; a: PasoId }
  /** La senda NO pasa por A. */
  | { tipo: 'no-pasa-por'; a: PasoId };

/**
 * Los papeles: los siete disfraces del shinobi (七方出, shichihōde).
 *
 * Están recogidos en el Bansenshūkai (万川集海, 1676) y son seis más uno: los
 * seis que se reparten y el que no se reparte. Que cada persona pueda hacer algo
 * que las demás no es lo que convierte la mesa en una conversación; si todo el
 * mundo tuviera el mismo repertorio, hablar sería opcional.
 */
export type PapelId =
  /** Yamabushi 山伏, el asceta de los montes: recibe un hito más, en privado. */
  | 'rastrear'
  /** Komusō 虚無僧, el monje de la cesta: a quien elija no le sube el rastro. */
  | 'amparar'
  /** Akindo 商人, la gente de Chaya: baja el rastro en uno. */
  | 'comprar'
  /** Hōkashi 放下師, el juglar que va delante: ve el paso batido de mañana. */
  | 'adelantarse'
  /** Tsune no kata 常の形, la persona corriente: hace público uno de sus hitos. */
  | 'referir'
  /** Sarugaku 猿楽, el comediante de casa en casa: intercambia un hito. */
  | 'trocar'
  /**
   * SOLO EL KANCHŌ (陰忍, in-nin): publica un hito falso.
   *
   * Es el papel que rompe el supuesto del que vive CLUEDO —que toda pista es
   * verdad— y por eso no se anuncia: en el dosier del kanchō aparece uno de los
   * seis normales, y este se le añade en secreto. NO SE GUARDA EN NINGÚN CAMPO:
   * se deduce de ser la respuesta del eje, y un dato que no se guarda no se
   * puede filtrar por descuido.
   */
  | 'falsear';

/**
 * El porte de un enser: lo que pesa en las reglas por llevarlo.
 *
 * Tres, y los tres PÚBLICOS: quién lleva qué se ve en la mesa y en la app, y de
 * ahí sale la negociación. `farol` es el más peligroso del juego a propósito —
 * da información que nadie puede comprobar hasta que se cierra la hora—.
 */
export type PorteId =
  /** El farol de papel (提灯): sabes qué paso está batido esta hora. */
  | 'farol'
  /** La plata de Chaya (茶屋の銀): el rastro sube uno menos cada hora. */
  | 'plata'
  /** La lanza de Hanzō (半蔵の槍): no sumas rastro en el paso batido. */
  | 'lanza';

/** Un hito del camino: una condición, ya redactada para leerse en la mesa. */
export interface Hito {
  id: string;
  condicion: Condicion;
  /** La frase que se lee. La escribe el modelo; la lógica no depende de ella. */
  texto: string;
  /**
   * ¿Contradice la senda verdadera?
   *
   * NUNCA se proyecta al jugador antes del desenlace. Si viajase, bastaría con
   * mirar el JSON para saber de qué fiarse y el juego entero se cae.
   */
  falso: boolean;
  /** ¿Está sobre la mesa, a la vista de todos? */
  publico: boolean;
  publicadoPor?: string;
  /**
   * Dónde y cuándo dice haberse encontrado.
   *
   * ES LO QUE HACE COMPROBABLE UNA MENTIRA, y es la diferencia con la Momia:
   * allí un fragmento falso nacía de la nada y no había forma de contrastarlo.
   * Aquí la app publica quién estuvo en cada paso y en cada hora, así que un
   * hito falso atribuido a un sitio donde había alguien más se desmiente con
   * una frase. El kanchō tiene que ir solo, y eso se ve.
   */
  halladoEn?: { pasoId: PasoId; ronda: number };
}

/** Lo que le pasa a una persona a lo largo de la noche. */
export interface EstadoDeEscolta {
  /** Las prendas que te quedan por dar. Empiezan dos. */
  prendas: number;
  /** Las que te han dado. Tope duro: `PRENDAS_RECIBIDAS_MAXIMO`. */
  prendasRecibidas: number;
  /** Los hitos que tienes en la mano. */
  hitos: string[];
  /**
   * Dónde y cuándo dices haber conseguido cada uno de tus hitos.
   *
   * EXISTE PARA QUE LA MENTIRA NO SE DELATE SOLA, y es de las cosas que se ven
   * al escribir la proyección y no al diseñar. El hito falso del kanchō lleva
   * pegado un sitio y una hora —es lo que lo hace comprobable, y es la mejor
   * mecánica del juego—. Si SOLO los falsos llevaran esa marca, su presencia
   * sería el delator perfecto: bastaría con mirar cuál de los públicos dice
   * dónde apareció para saber cuál es mentira, y todo el juego adversarial se
   * caería en la primera hora.
   *
   * Así que todo hito que se coge apunta de dónde salió, y al publicarlo se
   * publica esa procedencia. Un hito recibido en un trueque conserva la de quien
   * lo dio, que es la respuesta honesta a «¿y tú de dónde lo has sacado?»; si
   * viene sin ella, no se dice nada, y esa ausencia es ambigua a propósito.
   */
  donde: Record<string, { pasoId: PasoId; ronda: number }>;
  papel: PapelId;
  /** En qué hora usaste el papel por última vez. */
  papelUsadoEnRonda?: number;
  /** Los enseres que carga ahora mismo. Público. */
  enseres: string[];
  /** Cuántas veces ha pisado el paso batido. Para el trofeo «Sin rastro». */
  pisadas: number;
}

/**
 * El estado de una partida de El Paso de las Sombras.
 *
 * Vive dentro de `LiveSession.estado` bajo la clave `sombras`. El motor lo
 * transporta y lo persiste sin mirar dentro: si mirase, volvería a saber de qué
 * se juega.
 */
export interface EstadoSombras {
  /**
   * La senda correcta: cuatro pasos, en orden.
   *
   * LA REGLA DE ORO: esto no sale nunca en la proyección al jugador hasta el
   * desenlace. Hay una comprobación que la busca dentro del JSON que recibe el
   * móvil y falla si aparece.
   */
  sendaVerdadera: PasoId[];
  /**
   * Qué paso baten los cazadores en cada hora. Índice = ronda - 1.
   *
   * SECRETO, al revés que la cámara profanada de la Momia, que se anuncia en
   * voz alta. Aquí se revela AL CERRAR la hora, y esa demora es la que convierte
   * cada afirmación de la noche en una promesa comprobable.
   */
  batidos: PasoId[];
  /** El rastro de la columna. Público. Si llega al tope, no se embarca. */
  rastro: number;
  rastroMaximo: number;
  gente: Record<string, EstadoDeEscolta>;
  hitos: Record<string, Hito>;
  /** El estandarte de cada cual. Público: se imprime en todos los dosieres. */
  estandartes: Record<string, string>;
  /** Qué porte tiene cada enser. Público. */
  portes: Record<string, PorteId>;
  /** Lo que cada cual propone que se ande. */
  propuestas: Record<string, { senda: PasoId[]; at: string }>;
  consejo?: {
    sendaAndada: PasoId[];
    correcta: boolean;
    /** El rastro llegó al tope: por bien que se ande, no se embarca. */
    interceptada: boolean;
    votos: Array<{ senda: PasoId[]; apoyos: string[]; peso: number }>;
    at: string;
  };
}

// ---------------------------------------------------------------------------
// Las constantes del juego
// ---------------------------------------------------------------------------

/**
 * Cuántos tramos tiene la senda. CUATRO, ni tres ni cinco.
 *
 * Con tres y seis pasos hay 120 variaciones, que es justo lo que resuelve la
 * Momia y no habría paso adelante. Con cinco y seis pasos son 720 y la mesa se
 * atasca. Con cuatro sobre seis son 360, y sobre ocho, 1 680: bastante para que
 * haga falta poner en común, poco para que se pueda razonar en voz alta.
 *
 * Y hay una segunda razón, que es de mesa y no de matemáticas: la senda se ANDA
 * al final, habitación por habitación, con todo el mundo detrás. Cuatro paradas
 * es una procesión; seis, una mudanza.
 */
export const TRAMOS_DE_LA_SENDA = 4;

/** Con cuántas prendas empieza cada cual. */
export const PRENDAS_INICIALES = 2;

/**
 * Cuántas prendas puede tener recibidas una persona como mucho.
 *
 * TOPE DURO, y existe por un fallo de diseño que se ve venir: sin él, en una
 * mesa de ocho hay dieciséis prendas flotando y a la persona más elocuente le
 * pueden llegar seis. Su voto valdría siete contra los unos de los demás, y el
 * consejo dejaría de ser un consejo. Con dos, la voz máxima es tres: se nota, y
 * no manda.
 */
export const PRENDAS_RECIBIDAS_MAXIMO = 2;

/**
 * Cuánto rastro aguanta la columna antes de que la intercepten.
 *
 * Escala con la gente porque el peligro también: en una mesa de diez, cada hora
 * hay más pies pisando donde no deben. Con seis personas son ocho; con cuatro,
 * el suelo de seis, que es lo que hace falta para que la primera noche no se
 * pierda por dos despistes.
 */
export function rastroMaximoPara(escoltas: number): number {
  return Math.max(6, escoltas + 2);
}

// ---------------------------------------------------------------------------
// El resolutor
// ---------------------------------------------------------------------------

/** ¿Cumple esta senda la condición? */
export function cumpleCondicion(senda: PasoId[], c: Condicion): boolean {
  const en = (id: PasoId) => senda.indexOf(id);
  switch (c.tipo) {
    case 'antes': {
      const i = en(c.a);
      const j = en(c.b);
      return i >= 0 && j >= 0 && i < j;
    }
    case 'seguido': {
      const i = en(c.a);
      const j = en(c.b);
      return i >= 0 && j >= 0 && j - i === 1;
    }
    case 'posicion':
      return en(c.a) === c.posicion - 1;
    case 'no-posicion':
      return en(c.a) !== c.posicion - 1;
    case 'extremo': {
      const i = en(c.a);
      return i === 0 || (i >= 0 && i === senda.length - 1);
    }
    case 'pasa-por':
      return en(c.a) >= 0;
    case 'no-pasa-por':
      return en(c.a) < 0;
    default:
      return false;
  }
}

/**
 * Todas las variaciones de `k` elementos tomados de `items`, sin repetir.
 *
 * Es la generalización de las permutaciones de la Momia, y la generalización es
 * el juego: allí el conjunto era el resultado y solo faltaba ordenarlo; aquí
 * elegir QUIÉN entra es la mitad del problema.
 *
 * FUERZA BRUTA A PROPÓSITO. Con seis pasos son 360 y con diez, 5 040: se
 * recorren en un suspiro. Un resolutor con poda sería más rápido, más largo y
 * podría tener un fallo sutil que dejase pasar un camino irresoluble — y ese
 * fallo se descubriría de noche, con doce personas de pie en un pasillo.
 */
export function variaciones<T>(items: T[], k: number): T[][] {
  if (k <= 0 || k > items.length) return [];
  const salida: T[][] = [];
  const actual: T[] = [];
  const usados = new Array<boolean>(items.length).fill(false);
  const bajar = (): void => {
    if (actual.length === k) {
      salida.push([...actual]);
      return;
    }
    for (let i = 0; i < items.length; i++) {
      if (usados[i]) continue;
      usados[i] = true;
      actual.push(items[i]!);
      bajar();
      actual.pop();
      usados[i] = false;
    }
  };
  bajar();
  return salida;
}

/** Las sendas de `tramos` pasos que cumplen TODAS las condiciones. */
export function sendasDe(
  pasos: PasoId[],
  condiciones: Condicion[],
  tramos: number = TRAMOS_DE_LA_SENDA,
): PasoId[][] {
  return variaciones(pasos, tramos).filter((senda) =>
    condiciones.every((c) => cumpleCondicion(senda, c)),
  );
}

// ---------------------------------------------------------------------------
// La trama
// ---------------------------------------------------------------------------

/** Una condición ya redactada, tal y como se lee en un hito. */
export interface CondicionEscrita {
  id: string;
  condicion: Condicion;
  /** La frase del mojón. La escribe el modelo; la lógica no depende de ella. */
  texto: string;
}

/**
 * Lo que se decide al GENERAR una partida y ya no cambia.
 *
 * Viaja en `Plot.delJuego`. La frontera con `EstadoSombras` es la del tiempo:
 * aquí está lo que se decidió antes de que llegara nadie —la senda, los papeles,
 * qué paso se bate cada hora— y allí lo que va pasando durante la noche.
 *
 * SE GENERA CON CÓDIGO, NO CON EL MODELO. El modelo escribe el sabor: los
 * nombres, las descripciones, la frase de cada hito. La LÓGICA —que el
 * rompecabezas tenga una sola solución y que nadie pueda resolverlo en
 * solitario— la garantiza el código, porque un modelo que se equivoque en una
 * condición deja la partida irresoluble y nadie se entera hasta la noche.
 */
export interface TramaSombras {
  /** La senda correcta: `TRAMOS_DE_LA_SENDA` pasos, en orden. */
  sendaVerdadera: PasoId[];
  /** Las condiciones ciertas. Su conjunto determina la senda. */
  condiciones: CondicionEscrita[];
  /**
   * Condiciones falsas, listas para que el kanchō las publique.
   *
   * No se reparten a nadie: se le ofrecen cuando invoca `falsear`. Están
   * escritas de antemano porque fabricarlas en caliente daría frases de otro
   * tono, y una pista que suena distinta a las demás se delata sola.
   */
  falsasCandidatas: CondicionEscrita[];
  /** Qué paso baten los cazadores en cada hora. Índice = ronda - 1. */
  batidos: PasoId[];
  /** Dónde y cuándo aparece cada hito cierto. */
  hallazgos: Array<{ hitoId: string; pasoId: PasoId; ronda: number }>;
  /** La contraseña escrita en la puerta de cada paso, por id de paso. */
  contrasenas: Record<string, string>;
  /** El papel de cada escolta, por su `suspectId`. */
  papeles: Record<string, PapelId>;
  /** El estandarte de cada escolta, por su `suspectId`. */
  estandartes: Record<string, string>;
  /** Qué porte lleva cada enser. Solo tres enseres lo tienen. */
  portes: Record<string, PorteId>;
  /** Quién carga cada enser al empezar la noche. */
  cargaInicial: Record<string, string>;
  /** El enser que Akechi le prometió al kanchō. Sabor y desenlace. */
  enserComprometido: string;
}

// ---------------------------------------------------------------------------
// Utilidades de lectura, compartidas por los tres paquetes
// ---------------------------------------------------------------------------

/**
 * La contraseña, normalizada para compararla.
 *
 * Se teclea a oscuras, de pie, en un pasillo y a veces con una mano. Comparar
 * la cadena tal cual sería un castigo por escribir «Yama » con un espacio o por
 * no acertar con las mayúsculas de un móvil que autocapitaliza. Se quitan
 * acentos, espacios y todo lo que no sea una letra o un número.
 *
 * VIVE AQUÍ Y NO EN EL SERVIDOR porque la app también la usa: para avisar de
 * que el campo está vacío antes de gastar una petición, y para no marcar como
 * error algo que el servidor va a aceptar.
 */
export function normalizarContrasena(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}
