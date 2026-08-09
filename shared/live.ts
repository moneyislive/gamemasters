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
import type { BoardLayout, BoardMode } from './types';
import type { EjeId, JuegoId } from './juegos/tipos';

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
  /**
   * Se cierra la sesión de hoy, pero la partida NO ha terminado.
   *
   * Es lo que separa una velada de una campaña. Un CLUEDO no pasa nunca por
   * aquí: empieza y acaba la misma noche. Una campaña de rol de varios días
   * vive aquí entre encuentro y encuentro, conservándolo todo.
   */
  | 'intermedio'
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
  /**
   * Ha pulsado «estoy listo» en la sala de espera.
   *
   * No abre la partida —eso lo decide quien dirige— pero le dice cuánta gente
   * está esperando ya, que es la pregunta que se hace doce veces mientras la
   * mesa se llena.
   */
  pideEmpezar?: boolean;
}

export interface Acusacion {
  /** Quién acusa. */
  suspectId: string;
  /** Un valor por eje del juego. En CLUEDO: culpable, objeto y lugar. */
  respuestas: Record<EjeId, string>;
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
  /**
   * A qué se juega. CATA.
   *
   * Está aquí, y no solo en los ajustes de la partida, por una razón que salió
   * al intentarlo: las funciones que gobiernan las fases —`abrirRonda`,
   * `cerrarRonda`, `abrirAcusaciones`— reciben la sesión y nada más. Sin esta
   * copia habría que pasarles la partida entera a todas, o buscarla en el
   * almacén dentro de una función que hoy es síncrona y pura.
   */
  juego?: JuegoId;
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
  /**
   * Lo que cada juego necesita guardar y el motor no interpreta.
   *
   * Las posiciones de una oca, los puntos de vida de una campaña de rol, las
   * cartas repartidas. El motor lo transporta, lo persiste y lo proyecta según
   * las reglas del juego, pero no mira dentro: si mirase, volvería a saber de
   * qué se juega.
   */
  estado?: Record<string, unknown>;
  /**
   * A quién le toca, en los juegos por turnos.
   *
   * Vacío en los simultáneos, donde los doce actúan a la vez.
   */
  turnoDe?: string;
  /**
   * Registro de lo que se ha hecho. Sirve para contar repeticiones por ronda y
   * para que quien dirige vea el pulso de la mesa.
   */
  acciones?: Array<{ suspectId: string; accion: string; round: number; at: string }>;
  /**
   * En qué encuentro va la partida. 1 es el primero.
   *
   * Una velada de una noche se queda en 1 para siempre y nadie lo nota. Una
   * campaña lo va subiendo cada vez que se retoma.
   */
  encuentro?: number;
  /**
   * Lo que pasó en cada encuentro ya cerrado.
   *
   * No es decoración: en una campaña que se retoma al cabo de una semana, esto
   * es lo que permite a doce personas recordar dónde lo dejaron. Se le enseña
   * a quien juega.
   */
  cronica?: Array<{
    encuentro: number;
    titulo: string;
    resumen: string;
    desdeRonda: number;
    hastaRonda: number;
    cerradoEl: string;
  }>;
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
  /**
   * Dónde está clavada su chincheta sobre la foto aérea, en fracción del ancho
   * y del alto (0–1). Solo tiene valor si la partida se juega sobre el plano
   * del espacio real.
   */
  pin?: { x: number; y: number };
}

/**
 * El plano de la casa.
 *
 * Este es el único bloque de la vista que se envía ENTERO, sin recortar, y
 * conviene dejar dicho por qué: el tablero lo produce `generateBoardLayout()` a
 * partir de la lista de salas y de nada más. No mira la trama, ni quién es el
 * culpable, ni en qué sala está cada pista. Es la planta del edificio, y la
 * planta la ve cualquiera que cruce la puerta.
 *
 * Lo que sí es información de juego —dónde estoy, dónde hay gente, en qué salas
 * ya se encontró algo— no viaja aquí: se pinta encima con lo que el jugador ya
 * tenía en su vista.
 */
export interface TableroVista {
  /**
   * Con cuál de los dos empezó quien preparó la partida. No excluye al otro:
   * si vienen los dos, este solo decide cuál se enseña primero.
   */
  modo: BoardMode;
  /** Foto cenital del sitio de verdad, relativa al servidor. Si la hay. */
  imagenUrl?: string;
  /** El plano de rejilla con salas y pasadizos. Si está trazado. */
  plano?: BoardLayout;
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
    /** Cuántos han pulsado «estoy listo» y cuántos son en total. */
    listos: number;
    total: number;
    /** En qué encuentro va la partida. 1 en una velada de una sola noche. */
    encuentro: number;
  };
  /**
   * El caso, tal como lo conoce todo el mundo.
   *
   * Es lo que en el dosier impreso ocupa la sección «El caso»: sin esto, quien
   * juega desde el móvil sabe quién es su personaje pero no de qué va la
   * velada, ni quién ha muerto, ni dónde está.
   */
  caso: {
    sinopsis: string;
    victima: { nombre: string; descripcion: string };
    ambientacion: string;
    /** Las reglas que se leen en voz alta al empezar. */
    reglas: string[];
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
    /** ¿Ya ha avisado de que está listo para empezar? */
    pediEmpezar: boolean;
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
  /** El plano de la casa. Ausente si la partida todavía no tiene tablero. */
  tablero?: TableroVista;
  objetos: Array<{ id: string; name: string; description?: string; photoUrl?: string }>;
  /**
   * Qué hay que responder para acusar, y con qué opciones.
   *
   * Lo compone el servidor a partir del manifiesto del juego. Antes la app
   * pintaba tres selectores escritos a mano —culpable, objeto y sala— y por
   * tanto solo servía para CLUEDO. Ahora recorre esta lista: si un juego tiene
   * dos ejes o cinco, la pantalla de acusación sale bien sin tocarla.
   *
   * No abre ninguna brecha: las opciones son las mismas entidades que ya
   * viajan en `jugadores`, `salas` y `objetos`.
   */
  ejes: Array<{
    ejeId: EjeId;
    /** «¿Quién lo hizo?» */
    pregunta: string;
    /** «Quién» */
    rotulo: string;
    opciones: Array<{ id: string; nombre: string }>;
  }>;
  /**
   * Qué puedes hacer ahora mismo, con sus opciones ya resueltas.
   *
   * Lo compone el servidor desde el repertorio del juego, filtrando por la
   * fase, por si te toca y por las veces que ya lo has hecho. La app lo pinta
   * sin saber a qué se juega: una acción nueva no obliga a escribir una
   * pantalla nueva.
   *
   * No abre ninguna brecha: las opciones son entidades que ya viajan en la
   * vista.
   */
  acciones: Array<{
    id: string;
    rotulo: string;
    campos: Array<{
      campo: string;
      rotulo: string;
      opciones: Array<{ id: string; nombre: string }>;
    }>;
  }>;
  /** La sala que has elegido esta ronda, si ya lo has hecho. */
  miSala?: string;
  /** Pistas de TU sala en esta ronda. Vacío hasta que eliges. */
  misPistas: PistaVista[];
  /** Todo lo que ha pasado al tablón común en rondas ya cerradas. */
  tablon: PistaVista[];
  /**
   * Lo que pasó en los encuentros anteriores.
   *
   * Vacío en una velada de una noche. En una campaña es lo primero que se mira
   * al retomarla.
   */
  cronica: Array<{ encuentro: number; titulo: string; resumen: string; cerradoEl: string }>;
  /** Hechos públicos de la cronología. */
  cronologia: MomentoVista[];
  /** Narración de la ronda en curso, si el Game Master la ha lanzado. */
  narracion?: { title: string; text: string };
  /** Tu acusación, si ya la has hecho. */
  miAcusacion?: { respuestas: Record<EjeId, string>; at: string };
  /** Solo cuando la partida ha terminado. */
  desenlace?: {
    /**
     * La respuesta, ya resuelta a nombres para poder leerla sin más consultas.
     * Un renglón por eje, en el orden que declara el juego.
     */
    respuestas: Array<{ ejeId: EjeId; rotulo: string; entidadId: string; nombre: string }>;
    /**
     * Quién resultó ser. Se conserva aparte de `respuestas` porque la app lo
     * necesita para saber si el culpable eres tú, y eso no es un eje más: es
     * la única respuesta que además identifica a una persona de la mesa.
     */
    culpableId?: string;
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
  /** Quiénes han avisado de que están listos para empezar. */
  listos: Array<{ suspectId: string; displayName: string }>;
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
