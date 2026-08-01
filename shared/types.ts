/**
 * Tipos compartidos entre cliente y servidor.
 * ESTE FICHERO ES EL CONTRATO CENTRAL — no cambiar formas sin actualizar ARCHITECTURE.md.
 */

export type ModelId =
  | 'claude-fable-5'
  | 'claude-opus-5'
  | 'claude-sonnet-5'
  | 'claude-haiku-4-5';

export interface ModelOption {
  id: ModelId;
  label: string;
  description: string;
}

export interface AppConfig {
  model: ModelId;
  models: ModelOption[];
  hasApiKey: boolean;
  storage: 'mongo' | 'file';
}

// ---------- Entidades del juego ----------

export interface Suspect {
  id: string;
  name: string;
  email?: string;
  description?: string;
  photoUrl?: string;
}

export interface RoomPin {
  /** Posición relativa (0..1) sobre la imagen aérea */
  x: number;
  y: number;
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  photoUrl?: string;
  /** Solo en modo 'aerial': posición de la chincheta sobre la foto aérea */
  pin?: RoomPin;
}

export interface Weapon {
  id: string;
  name: string;
  description?: string;
  photoUrl?: string;
}

// ---------- Tablero ----------

export interface BoardRoomPlacement {
  roomId: string;
  /** Coordenadas en la rejilla del tablero (rejilla de 24x24 celdas) */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SecretPassage {
  fromRoomId: string;
  toRoomId: string;
}

export interface BoardLayout {
  grid: { cols: number; rows: number };
  rooms: BoardRoomPlacement[];
  passages: SecretPassage[];
  /** Etiqueta decorativa del centro del tablero (p.ej. "ESCALERAS") */
  centerLabel: string;
}

// ---------- Trama ----------

export interface PlotCharacter {
  suspectId: string;
  /** Nombre del personaje dentro de la ficción (puede fusionar el nombre real) */
  characterName: string;
  role: string;
  publicPersona: string;
  secret: string;
  motive: string;
  alibi: string;
  /** Pistas o conocimientos que este personaje posee sobre otros */
  knowledge: string[];
  /** Cómo se ha adaptado el personaje a la psicología de la persona real */
  personalHook: string;
}

export interface PlotClue {
  id: string;
  roomId?: string;
  description: string;
  pointsTo: string;
  /**
   * Ronda en la que el Game Master pone esta pista sobre la mesa (1 = primera).
   * Evita que las pruebas decisivas estén disponibles desde el minuto uno:
   * las rondas bajas traen motivos y señuelos, las altas cierran el caso.
   */
  round: number;
}

export interface TimelineEvent {
  time: string;
  description: string;
  /** Ids de sospechosos implicados */
  suspectIds: string[];
  /**
   * ¿Lo presenciaron todos los invitados?
   *
   * Solo los eventos públicos aparecen en los dosieres de los jugadores. Todo
   * lo demás —lo que alguien hizo cuando nadie miraba— pertenece a los secretos
   * y a las pistas, y su lugar es el dosier del Game Master. Sin esta marca, la
   * cronología destripaba las confesiones, las coartadas falsas y el crimen.
   */
  isPublic: boolean;
}

export interface PlotSolution {
  murdererId: string;
  weaponId: string;
  roomId: string;
  motive: string;
  howItHappened: string;
}

export interface Plot {
  title: string;
  tagline: string;
  synopsis: string;
  victim: { name: string; description: string };
  setting: string;
  solution: PlotSolution;
  characters: PlotCharacter[];
  timeline: TimelineEvent[];
  clues: PlotClue[];
  /** Guion del Game Master: actos y momentos clave para conducir la partida */
  gmScript: string[];
}

// ---------- Documentos por jugador ----------

export interface PlayerDocument {
  suspectId: string;
  title: string;
  /**
   * HTML completo autocontenido y tematizado (estilos y fotos embebidos).
   *
   * En la partida GUARDADA este campo va vacío a propósito: el dosier de cada
   * jugador incrusta las fotos de todos los demás en base64, así que almacenar
   * el HTML hacía crecer la partida al cuadrado y reventaba el límite de 16 MB
   * por documento de MongoDB. El HTML se genera bajo demanda al pedir el dosier
   * por su ruta (`GET /api/games/:id/documents/:suspectId`).
   */
  html?: string;
}

// ---------- Partida ----------

export type GameStatus = 'draft' | 'generating' | 'ready';
export type BoardMode = 'generated' | 'aerial';

/** Bloques que componen el dosier de un jugador, en el orden en que se imprimen. */
export type DocumentSectionId =
  | 'cover'
  | 'character'
  | 'secret'
  | 'knowledge'
  | 'case'
  | 'rules'
  | 'suspects'
  | 'weapons'
  | 'board'
  | 'timeline';

export interface DocumentSectionInfo {
  id: DocumentSectionId;
  label: string;
  description: string;
  /** Sin estos bloques el dosier no tendría sentido: no se pueden quitar. */
  required?: boolean;
}

/** Catálogo de secciones: lo usan el renderizador y la maqueta de la interfaz. */
export const DOCUMENT_SECTIONS: DocumentSectionInfo[] = [
  {
    id: 'cover',
    label: 'Portada',
    description: 'Título del misterio, lema y a quién pertenece el dosier.',
    required: true,
  },
  {
    id: 'character',
    label: 'Tu personaje',
    description: 'Papel, cara pública, motivo y coartada. El corazón del dosier.',
    required: true,
  },
  {
    id: 'secret',
    label: 'Tu secreto',
    description: 'Lo que esconde tu personaje, en su caja sellada. Al asesino se le revela aquí.',
  },
  {
    id: 'knowledge',
    label: 'Lo que sabes de los demás',
    description: 'Dos o tres datos sobre otros personajes con los que empezar a tirar del hilo.',
  },
  {
    id: 'case',
    label: 'El caso',
    description: 'La víctima y la sinopsis pública de lo ocurrido.',
  },
  {
    id: 'rules',
    label: 'Cómo se juega',
    description: 'Las reglas del Cluedo en vivo. Quítalas si tus invitados ya son veteranos.',
  },
  {
    id: 'suspects',
    label: 'Los sospechosos',
    description: 'Galería con el resto de invitados y sus fotos.',
  },
  {
    id: 'weapons',
    label: 'Los objetos',
    description: 'Las posibles armas del crimen, con sus fotos.',
  },
  {
    id: 'board',
    label: 'El escenario',
    description: 'El plano del tablero o la foto aérea con las salas marcadas.',
  },
  {
    id: 'timeline',
    label: 'Cronología pública',
    description: 'Los momentos de la velada que presenciaron todos los invitados.',
  },
];

export interface GameSettings {
  model?: ModelId;
  language: 'es';
  /**
   * Secciones incluidas en los dosieres de los jugadores. Si se omite, van
   * todas. Las marcadas como `required` se incluyen siempre.
   */
  documentSections?: DocumentSectionId[];
  /**
   * ¿El Game Master juega también como personaje?
   *
   * Con esto activo, su dosier se parte en dos: una «guía de la velada» SIN la
   * solución (rondas, sobres de pistas y qué leer en voz alta) y un sobre
   * sellado aparte que nadie abre hasta el final. Así puede investigar en
   * igualdad de condiciones.
   */
  gmPlays?: boolean;
  /**
   * Meta-prompt de estilo del juego: una indicación libre del Game Master que
   * condiciona SOLO el tono, la ambientación y el vocabulario de la trama y de
   * los dosieres («más formal», «disparatado», «ambientado en una estación
   * espacial»…). Nunca altera la estructura ni la profundidad del misterio.
   */
  stylePrompt?: string;
}

/** Longitud máxima del meta-prompt de estilo (suficiente para un par de frases). */
export const STYLE_PROMPT_MAX = 600;

export interface GameSession {
  id: string;
  name: string;
  status: GameStatus;
  createdAt: string;
  updatedAt: string;
  suspects: Suspect[];
  rooms: Room[];
  weapons: Weapon[];
  boardMode: BoardMode;
  /** Foto aérea del espacio físico (modo 'aerial') */
  boardImageUrl?: string;
  board?: BoardLayout;
  plot?: Plot;
  documents?: PlayerDocument[];
  settings: GameSettings;
}

export interface GameSummary {
  id: string;
  name: string;
  status: GameStatus;
  createdAt: string;
  updatedAt: string;
  suspectCount: number;
  roomCount: number;
  weaponCount: number;
}

// ---------- Chat con el agente ----------

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

// ---------- Comandos de UI que el agente puede invocar ----------

export type HighlightTarget =
  | 'suspects'
  | 'rooms'
  | 'weapons'
  | 'style'
  | 'board'
  | 'documents'
  | 'generate';

export interface UiPopupCommand {
  kind: 'popup';
  title: string;
  body: string;
  tone: 'info' | 'success' | 'mystery';
}

export interface UiHighlightCommand {
  kind: 'highlight';
  target: HighlightTarget;
}

export interface UiNavigateCommand {
  kind: 'navigate';
  target: HighlightTarget;
}

export interface UiStartGenerationCommand {
  kind: 'start_generation';
}

export type UiCommand =
  | UiPopupCommand
  | UiHighlightCommand
  | UiNavigateCommand
  | UiStartGenerationCommand;

// ---------- Eventos SSE ----------

/** Eventos del stream de chat: POST /api/games/:id/chat */
export type ChatStreamEvent =
  | { type: 'text'; delta: string }
  | { type: 'ui'; command: UiCommand }
  | { type: 'entities'; game: GameSession }
  | { type: 'done'; messageId: string }
  | { type: 'error'; message: string };

/** Eventos del stream de generación: POST /api/games/:id/generate */
export type GenerateStreamEvent =
  | { type: 'stage'; stage: 'board' | 'plot' | 'documents'; label: string }
  | { type: 'text'; delta: string }
  | { type: 'done'; game: GameSession }
  | { type: 'error'; message: string };
