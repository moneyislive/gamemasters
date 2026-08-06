/**
 * Contrato de la PARTIDA EN VIVO: lo que ocurre la noche del juego, con la gente
 * sentada a la mesa y el móvil en la mano.
 *
 * Va aparte de `types.ts` a propósito. Aquello describe cómo se PREPARA una
 * partida —jugadores, salas, trama, documentos—; esto describe cómo se JUEGA.
 * Son dos ciclos de vida distintos: el primero dura semanas y lo toca una sola
 * persona, el segundo dura una noche y lo tocan doce a la vez.
 *
 * REGLA QUE GOBIERNA TODO ESTE FICHERO: nada de lo que se define aquí como
 * «vista» puede contener la solución. El móvil de un jugador es un entorno
 * hostil —basta con abrir las herramientas del navegador— así que el servidor
 * envía lo que esa persona puede saber en esa ronda, y nada más.
 */

// ---------------------------------------------------------------------------
// Estado de la partida
// ---------------------------------------------------------------------------

export type LivePhase =
  /** Aún no ha empezado: la gente va llegando y emparejando el móvil. */
  | 'lobby'
  /** Ronda en curso: se elige sala y se leen pistas. */
  | 'ronda-abierta'
  /** Ronda cerrada: puesta en común, lo encontrado pasa al tablón. */
  | 'ronda-cerrada'
  /** Ventana de acusación: todos escriben a la vez. */
  | 'acusaciones'
  /** Desenlace revelado. */
  | 'desenlace';

export const FASES_EN_JUEGO: LivePhase[] = ['ronda-abierta', 'ronda-cerrada', 'acusaciones'];

/** Elección de sala de un jugador en una ronda concreta. */
export interface EleccionDeSala {
  round: number;
  roomId: string;
  /** Hora del SERVIDOR. Nunca la del móvil. */
  at: string;
}

export interface LivePlayer {
  /** Id del sospechoso de la partida: es la identidad dentro del juego. */
  suspectId: string;
  /** Nombre real, para la lista de conectados del Game Master. */
  displayName: string;
  email?: string;
  /** Cuenta a la que se ha vinculado, si la persona ya tenía uNa. */
  accountId?: string;
  /**
   * Código de invitación de seis caracteres que reparte el Game Master.
   * Es el único factor de acceso: sin servidor de correo ni contraseñas que
   * nadie va a recordar con doce invitados esperando.
   */
  joinCode: string;
  /** ¿Ha emparejado ya un móvil? */
  joined: boolean;
  /** Última vez que su móvil dio señales de vida. */
  lastSeenAt?: string;
  elecciones: EleccionDeSala[];
  /** Cuaderno personal. Texto libre, se guarda según se escribe. */
  notas: string;
  /** Ids de los giros personales que ya se le han entregado. */
  girosRecibidos: string[];
}

export interface Acusacion {
  /** Quién acusa. */
  suspectId: string;
  murdererId: string;
  weaponId: string;
  roomId: string;
  /**
   * Hora del SERVIDOR en el instante de recibirla. El ganador se decide por
   * este campo, así que jamás puede venir del cliente: un móvil con la hora
   * cambiada ganaría siempre.
   */
  at: string;
  /** Calculado en el servidor al recibirla. */
  correcta: boolean;
}

export interface LiveSession {
  /** Coincide con el id de la partida. */
  id: string;
  /** Código corto para entrar, del estilo «TEJADO». Se enseña en la mesa. */
  code: string;
  phase: LivePhase;
  /** 0 mientras no ha empezado. */
  round: number;
  totalRounds: number;
  startedAt?: string;
  roundStartedAt?: string;
  /** Fin previsto de la ronda; el reloj del móvil se sincroniza con esto. */
  roundEndsAt?: string;
  players: LivePlayer[];
  acusaciones: Acusacion[];
  /** Sospechoso que ganó, decidido por la primera acusación correcta. */
  winnerId?: string;
  /** Salas visitadas por alguien en cada ronda; lo que pasa al tablón común. */
  tablon: Array<{ round: number; roomId: string }>;
  /**
   * Se incrementa en CADA cambio. Es lo que permite que el móvil pregunte
   * «¿ha pasado algo desde la revisión N?» y el servidor le deje esperando
   * hasta que pase, en vez de sondear cada segundo.
   */
  rev: number;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Cuentas
// ---------------------------------------------------------------------------

export type TrofeoId =
  | 'primera-partida'
  | 'ganador'
  | 'sabueso'
  | 'culpable-impune'
  | 'superviviente'
  | 'escribano';

export interface TrofeoInfo {
  id: TrofeoId;
  nombre: string;
  descripcion: string;
  glifo: string;
}

export const TROFEOS: TrofeoInfo[] = [
  {
    id: 'primera-partida',
    nombre: 'Primera velada',
    descripcion: 'Jugaste tu primera partida entera.',
    glifo: '🕯',
  },
  {
    id: 'ganador',
    nombre: 'Quien lo resolvió',
    descripcion: 'Fuiste el primero en dar con la combinación correcta.',
    glifo: '🏆',
  },
  {
    id: 'sabueso',
    nombre: 'Sabueso',
    descripcion: 'Acertaste la combinación completa a la primera.',
    glifo: '🔎',
  },
  {
    id: 'culpable-impune',
    nombre: 'Crimen perfecto',
    descripcion: 'Fuiste el culpable y nadie te descubrió.',
    glifo: '🗝',
  },
  {
    id: 'superviviente',
    nombre: 'Hasta el final',
    descripcion: 'Terminaste la velada sin desconectarte ni una vez.',
    glifo: '⏳',
  },
  {
    id: 'escribano',
    nombre: 'Escribano',
    descripcion: 'Llenaste el cuaderno: más de mil caracteres de notas.',
    glifo: '✒',
  },
];

export interface PartidaJugada {
  gameId: string;
  titulo: string;
  personaje: string;
  jugadaEl: string;
  /** ¿Acertó su acusación? */
  acerto: boolean;
  /** ¿Fue el primero en acertar? */
  gano: boolean;
  /** ¿Le tocó ser el culpable? */
  eraCulpable: boolean;
}

export interface Account {
  id: string;
  /** Identidad de la cuenta. En minúsculas y sin espacios. */
  email: string;
  displayName: string;
  createdAt: string;
  partidas: PartidaJugada[];
  trofeos: TrofeoId[];
}

// ---------------------------------------------------------------------------
// La vista del jugador: lo ÚNICO que sale del servidor hacia un móvil
// ---------------------------------------------------------------------------

/** Una sala, tal como la ve un jugador. Sin nada de la trama. */
export interface SalaVista {
  id: string;
  name: string;
  description?: string;
  photoUrl?: string;
  /** ¿Alguien ya está ahí esta ronda? Se enseña para animar a repartirse. */
  ocupantes: number;
}

/** Una pista, tal como se le entrega a quien ha entrado en esa sala. */
export interface PistaVista {
  id: string;
  roomId: string;
  roomName: string;
  round: number;
  description: string;
  /**
   * A qué señala. Solo se envía cuando la ronda ya ha cerrado y la pista pasó
   * al tablón común: durante la ronda, interpretarla es trabajo del jugador.
   */
  pointsTo?: string;
}

export interface MomentoVista {
  time: string;
  description: string;
}

export interface VistaJugador {
  /** Revisión con la que se compuso: el móvil la devuelve al esperar cambios. */
  rev: number;
  sesion: {
    code: string;
    phase: LivePhase;
    round: number;
    totalRounds: number;
    roundEndsAt?: string;
    /** Hora del servidor al componer la vista: el móvil ajusta su reloj. */
    ahora: string;
    tituloPartida: string;
    lema: string;
  };
  yo: {
    suspectId: string;
    displayName: string;
    characterName: string;
    role: string;
    publicPersona: string;
    /** Tu secreto. Tuyo: nadie más lo recibe. */
    secret: string;
    motive: string;
    alibi: string;
    personalHook: string;
    photoUrl?: string;
    /** Se va desbloqueando ronda a ronda. */
    conocimiento: string[];
    /** Cuántas piezas de conocimiento quedan por desbloquear. */
    conocimientoPendiente: number;
    /** Giros personales ya entregados, en orden. */
    giros: Array<{ id: string; round: number; instruction: string }>;
    notas: string;
    /** Solo lo sabe quien lo es. Sirve para cambiarle el tono a la app. */
    soyCulpable: boolean;
  };
  /** Los demás, con lo que cualquiera sabría de ellos. */
  jugadores: Array<{
    suspectId: string;
    displayName: string;
    characterName: string;
    role: string;
    photoUrl?: string;
    conectado: boolean;
    /** Sala en la que está esta ronda, si la ha elegido. */
    salaActual?: string;
    yaAcuso: boolean;
  }>;
  salas: SalaVista[];
  objetos: Array<{ id: string; name: string; description?: string; photoUrl?: string }>;
  /** La sala que has elegido esta ronda, si ya lo has hecho. */
  miSala?: string;
  /** Pistas de TU sala en esta ronda. Vacío hasta que eliges. */
  misPistas: PistaVista[];
  /** Todo lo que ha pasado al tablón común en rondas ya cerradas. */
  tablon: PistaVista[];
  /** Hechos públicos de la cronología. */
  cronologia: MomentoVista[];
  /** Narración de la ronda en curso, si el Game Master la ha lanzado. */
  narracion?: { title: string; text: string };
  /** Tu acusación, si ya la has hecho. */
  miAcusacion?: { murdererId: string; weaponId: string; roomId: string; at: string };
  /** Solo cuando la partida ha terminado. */
  desenlace?: {
    murdererId: string;
    murdererName: string;
    weaponName: string;
    roomName: string;
    motive: string;
    reconstruccion: string;
    confesion?: string;
    epilogo?: string;
    ganador?: { suspectId: string; displayName: string; at: string };
    clasificacion: Array<{
      suspectId: string;
      displayName: string;
      acerto: boolean;
      at?: string;
      aciertos: number;
    }>;
  };
}

/** Vista del Game Master mientras dirige. Nunca incluye la solución. */
export interface VistaGameMaster {
  sesion: LiveSession;
  /** Cuántos han emparejado y cuántos están vivos ahora mismo. */
  conectados: number;
  /** Reparto de gente por sala en la ronda en curso. */
  ocupacion: Array<{ roomId: string; roomName: string; suspectIds: string[] }>;
  /** Giros pendientes de entregar en la ronda en curso. */
  girosPendientes: Array<{ id: string; suspectId: string; displayName: string; round: number }>;
  /** Cuántas acusaciones se han recibido. */
  acusacionesRecibidas: number;
  /** El Game Master a ciegas no ve si son correctas. */
  revelaSolucion: boolean;
}

// ---------------------------------------------------------------------------
// Eventos que viajan por el stream
// ---------------------------------------------------------------------------

export type LiveEvent =
  /** Estado completo. Se manda al conectar y tras cada cambio relevante. */
  | { type: 'vista'; vista: VistaJugador }
  /** Aviso efímero para animar la pantalla: la app decide cómo celebrarlo. */
  | { type: 'aviso'; clave: AvisoClave; texto: string }
  /** Latido para que los proxies no cierren la conexión. */
  | { type: 'latido'; ahora: string };

export type AvisoClave =
  | 'ronda-abierta'
  | 'ronda-cerrada'
  | 'giro'
  | 'ayuda'
  | 'acusaciones'
  | 'desenlace'
  | 'ganador';

export type LiveGmEvent =
  | { type: 'vista'; vista: VistaGameMaster }
  | { type: 'latido'; ahora: string };

// ---------------------------------------------------------------------------
// Utilidades compartidas
// ---------------------------------------------------------------------------

/**
 * Alfabeto sin caracteres que se confunden al dictarlos en voz alta a doce
 * personas: fuera la O y el 0, la I y el 1, la L, la S y el 5.
 */
export const ALFABETO_CODIGO = 'ABCDEFGHJKMNPQRTUVWXYZ2346789';

export function esCodigoValido(codigo: string): boolean {
  return /^[A-Z0-9]{4,8}$/.test(codigo.trim().toUpperCase());
}

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}
