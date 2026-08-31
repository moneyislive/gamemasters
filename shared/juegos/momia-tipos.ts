/**
 * Los tipos propios de El Misterio de la Momia.
 *
 * POR QUÉ VIVEN EN `shared/`. Todo lo de aquí lo tienen que entender los tres
 * paquetes a la vez: el servidor lo genera y lo guarda, el taller lo enseña a
 * quien dirige, y la app lo pinta. Un tipo que solo necesitase el servidor —el
 * esquema con el que se le pide la trama al modelo, pongamos— no pintaría nada
 * aquí y viviría en `server/src/juegos/`.
 *
 * POR QUÉ EN UN FICHERO APARTE Y NO EN `tipos.ts`. Porque `tipos.ts` describe
 * qué es UN JUEGO CUALQUIERA y esto describe UN juego concreto. Mezclarlos sería
 * exactamente el error que la plataforma intenta no cometer: que el contrato
 * general acabe sabiendo de qué se juega. La prueba de que la frontera está bien
 * puesta es que `tipos.ts` no importa nada de este fichero.
 */

/** Un rito del sellado, identificado por la entidad que lo representa. */
export type RitoId = string;

/**
 * Una restricción sobre el orden de los ritos.
 *
 * Son cinco formas y no una sola porque un puzle con una única forma de pista se
 * resuelve con una tabla y se acaba la gracia. Mezclando «va antes», «va justo
 * antes» y «ocupa el lugar tercero», la deducción deja de ser mecánica: hay que
 * combinar tipos distintos de información, que es lo que hace que ponerlo en
 * común valga la pena.
 */
export type Restriccion =
  /** A va en algún momento antes que B. */
  | { tipo: 'antes'; a: RitoId; b: RitoId }
  /** A va justo antes que B, sin nada en medio. */
  | { tipo: 'inmediatamente-antes'; a: RitoId; b: RitoId }
  /** A ocupa exactamente el lugar N (1..5). */
  | { tipo: 'posicion'; a: RitoId; posicion: number }
  /** A no ocupa el lugar N (1..5). */
  | { tipo: 'no-posicion'; a: RitoId; posicion: number }
  /** A es el primero o el último, nunca en medio. */
  | { tipo: 'extremos'; a: RitoId };

/**
 * Los dones: el poder propio de cada rol, una vez por vigilia.
 *
 * Que cada persona pueda hacer algo que las demás no es lo que convierte la
 * mesa en una conversación. En CLUEDO todo el mundo tiene el mismo repertorio,
 * así que hablar es opcional; aquí, si quien lee jeroglíficos no cuenta lo que
 * ha leído, la mesa no sella la tumba.
 */
export type DonId =
  /** Epigrafista: recibe un fragmento más, en privado. */
  | 'descifrar'
  /** Médico: quita una marca a alguien sin gastar amuleto. */
  | 'sanar'
  /** Guardián: a quien elija no le marcan esta vigilia. */
  | 'proteger'
  /** Mecenas: ve qué cámara se profanará la vigilia siguiente. */
  | 'sobornar'
  /** Fotógrafo: hace público uno de sus fragmentos. */
  | 'documentar'
  /** Capataz: entra en una segunda cámara, a cambio de una marca. */
  | 'excavar'
  /**
   * SOLO EL SAQUEADOR: publica un fragmento falso.
   *
   * Es el don que rompe el supuesto del que vive CLUEDO —que toda pista es
   * verdad— y por eso no se anuncia: en el dosier del saqueador aparece un rol
   * normal con un don normal, y `falsificar` se le añade en secreto.
   */
  | 'falsificar';

/** Un fragmento de papiro: una restricción, ya redactada para leerse. */
export interface Fragmento {
  id: string;
  restriccion: Restriccion;
  /** La frase que se lee en la mesa. La escribe el modelo. */
  texto: string;
  /**
   * ¿Contradice el orden verdadero?
   *
   * NUNCA se proyecta al jugador. Si viajase al móvil, bastaría con mirar el
   * JSON para saber de qué fiarse, y el juego entero se cae.
   */
  falso: boolean;
  /** ¿Está sobre la mesa, a la vista de todos? */
  publico: boolean;
  publicadoPor?: string;
}

/** Lo que le pasa a una persona a lo largo de la noche. */
export interface EstadoDePersona {
  /** A las tres, queda tocada. */
  marcas: number;
  /** Empiezan dos. Solo se gastan en otros. */
  amuletos: number;
  /** Tocada: su propuesta ya no cuenta en la votación. Sigue jugando. */
  tocado: boolean;
  /** Los fragmentos que tiene en la mano. */
  fragmentos: string[];
  don: DonId;
  /** En qué vigilia usó el don por última vez. */
  donUsadoEnRonda?: number;
}

/**
 * El estado de una partida de la Momia.
 *
 * Vive dentro de `LiveSession.estado` bajo la clave `momia`. El motor lo
 * transporta y lo persiste sin mirar dentro: si mirase, volvería a saber de qué
 * se juega, que es justo lo que la plataforma intenta no saber.
 */
export interface EstadoMomia {
  /**
   * El orden correcto de los ritos.
   *
   * LA REGLA DE ORO: esto no sale nunca en la proyección al jugador, ni
   * siquiera en la de quien va ganando, hasta el desenlace. Hay una
   * comprobación que busca esta lista dentro del JSON que recibe el móvil.
   */
  ordenVerdadero: RitoId[];
  /** Qué cámara se profana en cada vigilia. Índice = ronda - 1. */
  profanadas: string[];
  gente: Record<string, EstadoDePersona>;
  fragmentos: Record<string, Fragmento>;
  /** Lo que cada cual propone que se ejecute. */
  propuestas: Record<string, { orden: RitoId[]; at: string }>;
  sellado?: {
    ordenEjecutado: RitoId[];
    correcto: boolean;
    votos: Array<{ orden: RitoId[]; apoyos: string[] }>;
    at: string;
  };
}

/** Cuántos ritos tiene el sellado. Ver el porqué en docs/momia/DISENO.md §3.1. */
export const RITOS_DEL_SELLADO = 5;

/** Con cuántas marcas se queda tocada una persona. */
export const MARCAS_PARA_TOCADO = 3;

/** Con cuántos amuletos empieza cada cual. */
export const AMULETOS_INICIALES = 2;

// ---------------------------------------------------------------------------
// El resolutor
// ---------------------------------------------------------------------------

/** ¿Cumple este orden la restricción? */
export function cumple(orden: RitoId[], r: Restriccion): boolean {
  const en = (id: RitoId) => orden.indexOf(id);
  switch (r.tipo) {
    case 'antes':
      return en(r.a) >= 0 && en(r.b) >= 0 && en(r.a) < en(r.b);
    case 'inmediatamente-antes':
      return en(r.a) >= 0 && en(r.b) >= 0 && en(r.b) - en(r.a) === 1;
    case 'posicion':
      return en(r.a) === r.posicion - 1;
    case 'no-posicion':
      return en(r.a) >= 0 && en(r.a) !== r.posicion - 1;
    case 'extremos':
      return en(r.a) === 0 || en(r.a) === orden.length - 1;
    default:
      return false;
  }
}

/**
 * Todas las permutaciones de una lista.
 *
 * Con cinco ritos son 120: la fuerza bruta es la respuesta correcta aquí y no
 * una concesión. Un resolutor con poda sería más rápido, más largo y podría
 * tener un fallo sutil que dejase pasar un puzle irresoluble —y ese fallo se
 * descubriría de noche, con doce personas esperando.
 */
export function permutaciones<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  const salida: T[][] = [];
  for (let i = 0; i < items.length; i++) {
    const resto = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const p of permutaciones(resto)) salida.push([items[i]!, ...p]);
  }
  return salida;
}

/** Los órdenes que cumplen TODAS las restricciones. */
export function solucionesDe(ritos: RitoId[], restricciones: Restriccion[]): RitoId[][] {
  return permutaciones(ritos).filter((orden) => restricciones.every((r) => cumple(orden, r)));
}

// ---------------------------------------------------------------------------
// La trama
// ---------------------------------------------------------------------------

/** Una restricción ya redactada, tal y como se lee en un fragmento. */
export interface RestriccionEscrita {
  id: string;
  restriccion: Restriccion;
  /** La frase de papiro. La escribe el modelo; la lógica no depende de ella. */
  texto: string;
}

/**
 * Lo que se decide al GENERAR una partida de la Momia y ya no cambia.
 *
 * Viaja en `Plot.delJuego`. La frontera con `EstadoMomia` es la del tiempo: aquí
 * está lo que la casa decidió antes de que llegara nadie —el orden verdadero,
 * quién tiene qué don, qué cámara se profana cada noche— y allí lo que va
 * pasando durante la velada.
 *
 * SE GENERA CON CÓDIGO, NO CON EL MODELO. El modelo escribe el sabor: los
 * nombres, las descripciones, la frase de cada fragmento. La LÓGICA —que el
 * puzle tenga una sola solución y que nadie pueda resolverlo en solitario— la
 * garantiza el código, porque un modelo que se equivoque en una restricción deja
 * la partida irresoluble y nadie se entera hasta la noche.
 */
export interface TramaMomia {
  /** La permutación correcta de los cinco ritos. */
  ordenVerdadero: RitoId[];
  /** Las restricciones ciertas. Su conjunto determina `ordenVerdadero`. */
  restricciones: RestriccionEscrita[];
  /**
   * Restricciones falsas, listas para que el saqueador las publique.
   *
   * No se reparten a nadie: se le ofrecen cuando invoca `falsificar`. Están
   * escritas de antemano porque fabricarlas en caliente daría frases de otro
   * tono, y una pista que suena distinta a las demás se delata sola.
   */
  falsasCandidatas: RestriccionEscrita[];
  /** Qué cámara se profana en cada vigilia. Índice = ronda - 1. */
  profanadas: string[];
  /** Dónde y cuándo aparece cada fragmento cierto. */
  hallazgos: Array<{ fragmentoId: string; camaraId: string; ronda: number }>;
  /** El don de cada expedicionario, por su `participanteId`. */
  dones: Record<string, DonId>;
  /** La reliquia que el saqueador tiene vendida de antemano. */
  reliquiaCodiciada: string;
}

/**
 * El estado tal y como le llega AL PANEL DEL TALLER.
 *
 * ═══ POR QUE NO VALE `EstadoMomia` A SECAS ═══
 *
 * El panel puede recibir dos cosas distintas: dirigiendo de la forma normal, el
 * estado GUARDADO tal cual; dirigiendo A CIEGAS, lo que devuelve
 * `registrarProyeccionParaGm`, con lo que decidiria la partida tapado. Ahi las
 * propuestas llegan con el orden VACIO y un `reservada: true`, y sus claves
 * siguen estando a proposito —sin ellas el boton de ejecutar el ritual se
 * desactiva y no hay forma de terminar la noche.
 *
 * Y `ordenVerdadero` NO ESTA, que es lo importante: la proyeccion a ciegas no lo
 * manda, y este tipo tampoco lo nombra. Con `EstadoMomia` el panel tenia
 * disponible el campo que jamas debe pintar.
 *
 * ═══ COMO SE LEIA ANTES ═══
 *
 * Con dos `as`: el panel hacia `estado as EstadoMomia` —un tipo que no es el que
 * llega— y luego `(p as { reservada?: boolean }).reservada` para leer un campo
 * que aquel tipo no tiene. Dos rodeos que dejaban la forma real sin declarar en
 * ningun sitio, con `ProyeccionParaGm` devolviendo `unknown` al otro lado.
 */
export interface EstadoMomiaParaElPanel {
  /*
   * ═══ OBLIGATORIO LO QUE LLEGA SIEMPRE, OPCIONAL LO QUE NO ═══
   *
   * Se escribio primero con TODO opcional, por fidelidad al `unknown` del que
   * viene. Y era peor: obligaba a un `?? []` en cada lectura del panel para
   * defenderse de un caso que no ocurre —las dos rutas, la guardada y la
   * proyectada, mandan siempre estos cuatro— y ese ruido esconde las lecturas
   * que SI necesitan defensa.
   *
   * Lo que se gana no es la opcionalidad: es que los NOMBRES esten comprobados.
   * Eso funciona igual con campos obligatorios.
   */
  profanadas: string[];
  gente: Record<
    string,
    {
      marcas: number;
      amuletos: number;
      tocado: boolean;
      fragmentos: string[];
      /** Ausente si todavia no lo ha usado. */
      donUsadoEnRonda?: number;
    }
  >;
  /** El texto solo viene en los que ya estan sobre la mesa. */
  fragmentos: Record<string, { id: string; texto?: string; publico: boolean }>;
  /** El orden llega VACIO y con `reservada` cuando quien dirige tambien juega. */
  propuestas: Record<string, { orden: string[]; at?: string; reservada?: boolean }>;
  /** Cuantas hay, para poder contar sin ensenarlas. Solo a ciegas. */
  propuestasEntregadas?: number;
  /** Solo cuando el sellado ya se ha ejecutado. */
  sellado?: {
    ordenEjecutado: string[];
    correcto: boolean;
    votos: Array<{ orden: string[]; apoyos: string[] }>;
    at: string;
  };
}
