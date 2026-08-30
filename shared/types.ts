/**
 * Tipos compartidos entre cliente y servidor.
 * ESTE FICHERO ES EL CONTRATO CENTRAL — no cambiar formas sin actualizar ARCHITECTURE.md.
 */
import type { PrintableDocId } from './documents';
import type { EjeId, JuegoId } from './juegos/tipos';

export type { PrintableDocId };

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

export interface Chincheta {
  /** Posición relativa (0..1) sobre la imagen aérea */
  x: number;
  y: number;
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  photoUrl?: string;
  /**
   * Código corto para rotular los sobres de esta sala («COCINA», «SALON-A»…).
   * Si se omite se deduce del nombre. Se guarda para que un cambio posterior en
   * la lista de salas no renombre códigos ya impresos en etiquetas.
   */
  shortCode?: string;
  /** Solo en modo 'aerial': posición de la chincheta sobre la foto aérea */
  pin?: Chincheta;
}

export interface Weapon {
  id: string;
  name: string;
  description?: string;
  photoUrl?: string;
}


// ---------- Tablero ----------

export interface ColocacionDeLugar {
  lugarId: string;
  /** Coordenadas en la rejilla del tablero (rejilla de 24x24 celdas) */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Pasadizo {
  desdeLugarId: string;
  hastaLugarId: string;
}

export interface BoardLayout {
  grid: { cols: number; rows: number };
  /**
   * DÓNDE VA CADA LUGAR EN EL PLANO.
   *
   * Se llamaba `rooms` y sus elementos `roomId`, porque el primer juego dibujaba
   * las salas de una casa. La Momia dibuja cámaras, las Sombras pasos, y una
   * campaña de rol dibujaría cuevas: el plano es de la plataforma, lo que era de
   * CLUEDO era la palabra.
   */
  lugares: ColocacionDeLugar[];
  pasadizos: Pasadizo[];
  /** Etiqueta decorativa del centro del tablero (p.ej. "ESCALERAS") */
  centerLabel: string;
}

// ---------- Trama ----------

export interface PlotCharacter {
  participanteId: string;
  /** Nombre del personaje dentro de la ficción (puede fusionar el nombre real) */
  characterName: string;
  role: string;
  publicPersona: string;
  /**
   * Los cuatro campos del misterio. OPCIONALES.
   *
   * Un secreto, un motivo y una coartada son de un juego donde alguien miente.
   * Eran obligatorios POR PERSONA, asi que una subasta —donde nadie interpreta
   * a nadie— tenia que escribir cuatro cadenas vacias por postor solo para que
   * el contrato la dejara entrar.
   *
   * Quien los pinta ya preguntaba: la proyeccion hace `personaje?.secret ?? ''`
   * y el movil solo enseña el bloque si el juego lo declara en `dosier`. Lo
   * unico que faltaba era dejar de exigirlos.
   */
  secret?: string;
  motive?: string;
  alibi?: string;
  /** Cómo se ha adaptado el personaje a la psicología de la persona real */
  personalHook?: string;
  /** Pistas o conocimientos que este personaje posee sobre otros */
  knowledge: string[];
}

export interface PlotClue {
  id: string;
  lugarId?: string;
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
  participanteIds: string[];
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

/**
 * La respuesta del misterio.
 *
 * Un valor por cada eje que declare el juego en su manifiesto, en vez de tres
 * campos con nombre propio. En CLUEDO son `culpable`, `objeto` y `lugar`; un
 * misterio sin arma tiene dos entradas y uno con cómplice, cuatro.
 *
 * Las claves son ids de eje y los valores, ids de entidad de la categoría que
 * ese eje declara. Nada aquí obliga a que sean tres.
 */
export interface PlotSolution {
  respuestas: Record<EjeId, string>;
  /**
   * POR QUE Y COMO LO HIZO. Los dos son de un juego donde alguien mata.
   *
   * `respuestas` ya es generico —un id por eje, sean los ejes que sean— pero
   * estos dos se quedaron con el nombre y el sentido del crimen. Una subasta
   * escribia dos cadenas vacias; una campaña de rol no tiene ni motivo ni
   * relato de como ocurrio, tiene una historia entera.
   */
  motive?: string;
  howItHappened?: string;
}

// ---------- Material impreso (segunda llamada, opcional) ----------

/**
 * Texto que el Game Master lee en voz alta para abrir un tramo de la velada.
 * `round` 0 es la apertura; 1..N, el arranque de cada ronda.
 */
export interface PlotNarration {
  round: number;
  title: string;
  /** Se lee literalmente: está escrito para sonar bien dicho en alto. */
  text: string;
  /** Indicación escénica breve: apagar una luz, mostrar un objeto, callar. */
  stageDirection?: string;
}

/**
 * Giro personal: una instrucción privada que recibe UN jugador a mitad de
 * partida y que cambia lo que puede contar. Es lo que evita que la velada se
 * estanque cuando ya se han dicho todas las coartadas.
 */
export interface PlotTwist {
  id: string;
  participanteId: string;
  /** Se entrega al cerrar esta ronda. */
  round: number;
  /** Escrita en segunda persona, para que el jugador la lea y actúe. */
  instruction: string;
}

/** Lo que el grupo puede dar por establecido al cerrar una ronda. */
export interface TimelineReveal {
  round: number;
  time: string;
  fact: string;
}

/** Ayuda graduada para cuando el grupo se atasca. */
export interface PlotHint {
  /** 1 empuja, 2 orienta, 3 casi lo dice. */
  level: number;
  text: string;
}

/** El cierre: lo que se lee al abrir el sobre del crimen. */
export interface PlotFinale {
  reconstruction: string;
  /** En primera persona: la confesión del culpable. */
  confession: string;
  epilogue: string;
}

/**
 * Material narrativo para el papel, escrito en una SEGUNDA llamada.
 *
 * Va aparte de `Plot` a propósito. Pedirlo en la misma generación dispararía el
 * consumo de tokens de una llamada que ya roza su límite, y —más importante—
 * impediría añadírselo a una partida ya escrita sin regenerar el misterio
 * entero. Así, una trama que ya te gusta puede recibir su material sin tocarla.
 */
export interface PrintMaterial {
  narrations: PlotNarration[];
  twists: PlotTwist[];
  timelineReveals: TimelineReveal[];
  hints: PlotHint[];
  finale: PlotFinale;
  /** Cuándo se escribió, para saber si acompaña a la trama actual. */
  generatedAt: string;
}

export interface Plot {
  title: string;
  tagline: string;
  synopsis: string;
  /**
   * Quien ha muerto. OPCIONAL, y esto es el peaje mas visible que tenia la
   * plataforma.
   *
   * Era obligatorio, asi que un juego sin crimen tenia que inventarse una
   * victima. No es una hipotesis: `verificar-juego-ajeno.ts` monta una subasta
   * y pone `victim: { name: '—', description: '' }` porque no le queda otra, y
   * la app pintaba «La victima · —» en el dosier de todo el mundo. El Misterio
   * de la Momia se inventa «el faraon sin nombre» y El Paso de las Sombras «el
   * señor», los dos para rellenar un hueco que su juego no tiene.
   *
   * Ausente significa AUSENTE: quien la pinta se la salta. No hay cadena vacia
   * que interpretar ni guion que disimular.
   */
  victim?: { name: string; description: string };
  setting: string;
  solution: PlotSolution;
  characters: PlotCharacter[];
  timeline: TimelineEvent[];
  clues: PlotClue[];
  /** Guion del Game Master: actos y momentos clave para conducir la partida */
  gmScript: string[];
  /**
   * Material narrativo para imprimir. Se escribe aparte y puede faltar: los
   * documentos que lo usan se degradan a su versión en blanco cuando no está.
   */
  material?: PrintMaterial;
  /**
   * Lo que este juego necesita de su trama y los demás no.
   *
   * Es el hermano de `LiveSession.estado`, y existe por la misma razón. Aquella
   * guarda lo que pasa DURANTE la partida —las marcas, los amuletos—; esta
   * guarda lo que se decidió AL GENERARLA y no cambia: en El Misterio de la
   * Momia, el orden verdadero de los cinco ritos, las restricciones que lo
   * describen y el don que le tocó a cada cual.
   *
   * La alternativa era añadir aquí un campo `momia?: TramaMomia`, y con ella el
   * contrato general habría empezado a saber de qué se juega. Cada juego que
   * entrase añadiría el suyo, y en cinco juegos esto sería una lista de campos
   * opcionales que casi nunca están.
   *
   * Quien lo escribe y quien lo lee es el mismo juego, así que el motor no
   * necesita entenderlo: lo transporta y lo persiste, nada más.
   */
  delJuego?: unknown;
}

// ---------- Documentos por jugador ----------

export interface PlayerDocument {
  /**
   * QUE ES ESTE DOCUMENTO. No siempre es una persona.
   *
   * Se llamaba `participanteId` y guardaba tres cosas distintas: el id de alguien de
   * la mesa (su dosier), las cadenas `gm` y `solution` (los dosieres que no son
   * de nadie) y el id de un imprimible entero. Llamar `participanteId` a
   * «informe-validacion» era una mentira que costaba un rato entender.
   */
  id: string;
  title: string;
  /**
   * HTML completo autocontenido y tematizado (estilos y fotos embebidos).
   *
   * En la partida GUARDADA este campo va vacío a propósito: el dosier de cada
   * jugador incrusta las fotos de todos los demás en base64, así que almacenar
   * el HTML hacía crecer la partida al cuadrado y reventaba el límite de 16 MB
   * por documento de MongoDB. El HTML se genera bajo demanda al pedir el dosier
   * por su ruta (`GET /api/games/:id/documents/:participanteId`).
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
  | 'timeline'
  /* Las que trae El Misterio de la Momia. Ver shared/juegos/momia.ts. */
  | 'don'
  | 'expedicion'
  | 'reliquias'
  | 'ritos'
  /* Las que trae El Paso de las Sombras. Ver shared/juegos/sombras.ts. */
  | 'papel'
  | 'estandarte'
  | 'columna'
  | 'enseres'
  | 'senda';

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
   * A qué se juega. CATA: si falta, es CLUEDO.
   *
   * Opcional a propósito. Las partidas que ya existen no lo llevan, y el
   * almacén de Mongo es de esquema laxo, así que añadirlo no obliga a migrar
   * nada: lo resuelve `manifiestoDe(undefined)`.
   */
  juego?: JuegoId;
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
   * Material imprimible que se genera además de los dosieres (carteles de sala,
   * hojas de investigación…). Si se omite valen los marcados por defecto en
   * `PRINTABLE_DOCS`; una lista vacía significa «ninguno».
   */
  printableDocs?: PrintableDocId[];
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

// ---------- Formatos de descarga de los documentos ----------

/**
 * Tema visual del documento.
 *
 * - `color`: la estética art-decó completa, papel crema y cajas entintadas.
 * - `blanco`: fondo blanco y sin superficies macizas. Conserva tipografías y
 *   líneas de color, pero gasta alrededor de un 78 % menos de tinta, que es la
 *   diferencia entre imprimir doscientas páginas en casa o no poder.
 */
export type DocumentVariant = 'color' | 'blanco';

/** Cómo se entrega el documento: la página en sí, o ya convertida a PDF. */
export type DocumentFormat = 'html' | 'pdf';

export interface DocumentRenderOptions {
  variant?: DocumentVariant;
  /**
   * Añade la barra superior con el botón de imprimir y, si es `'auto'`, abre el
   * diálogo de impresión al cargar. La barra nunca sale en el papel.
   */
  printBar?: boolean | 'auto';
  /**
   * Compón solo el bloque de esta persona.
   *
   * Un documento `porPersona` lleva dentro el de toda la mesa: así se imprime de
   * una vez y se recorta. Cuando el taller sirve el de alguien —para abrirlo,
   * mandarlo por correo o descargarlo— tiene que llevar SOLO el suyo: mandarle
   * a una persona el fichero entero es repartir la partida.
   */
  soloPara?: string;
}

export interface DocumentFormatInfo {
  variant: DocumentVariant;
  format: DocumentFormat;
  /** Etiqueta corta para la interfaz. */
  label: string;
  /** Una frase explicando cuándo conviene. */
  hint: string;
}

export const DOCUMENT_FORMATS: DocumentFormatInfo[] = [
  {
    variant: 'color',
    format: 'html',
    label: 'HTML con estilo',
    hint: 'La página tal cual, para leerla en pantalla o enviarla por correo.',
  },
  {
    variant: 'blanco',
    format: 'html',
    label: 'HTML fondo blanco',
    hint: 'Lo mismo, sin superficies entintadas.',
  },
  {
    variant: 'color',
    format: 'pdf',
    label: 'PDF con estilo',
    hint: 'A4, listo para llevar a una imprenta.',
  },
  {
    variant: 'blanco',
    format: 'pdf',
    label: 'PDF ahorro de tinta',
    hint: 'A4 en fondo blanco. El más barato de imprimir en casa.',
  },
];

/** Respuesta de `GET /api/documents/capabilities`. */
export interface DocumentCapabilities {
  /** ¿Hay un navegador en esta máquina capaz de convertir a PDF? */
  pdf: boolean;
  /** Nombre del motor encontrado, para poder explicarlo en la interfaz. */
  engine?: string;
}

/**
 * Lo que ha costado esta partida, en tokens.
 *
 * NO HABIA NINGUNA CONTABILIDAD: los siete puntos que llaman al modelo recogian
 * el mensaje final y tiraban `usage` a la basura, asi que no habia forma de
 * saber que gasta una velada — ni para poner precio, ni para detectar un abuso,
 * ni para responderle a quien reclame. Medido a mano, una trama de CLUEDO son
 * unos 0,82 $ y una de la Momia 0,49 $, pero eso es una medicion de laboratorio
 * y no la factura de nadie.
 *
 * Se guarda en la partida y no en un registro aparte porque es donde se puede
 * mirar sin montar nada, y porque la unidad que se va a cobrar es justamente la
 * velada. Los totales son acumulados: regenerar suma, no reemplaza.
 */
export interface GastoDeLaPartida {
  /** Cuantas veces se ha llamado al modelo por esta partida. */
  llamadas: number;
  entrada: number;
  salida: number;
  /** Tokens escritos en la cache (se pagan mas caros) y leidos de ella (mas baratos). */
  cacheEscrita: number;
  cacheLeida: number;
  /** Por concepto: `trama`, `material`, `refresco`, `asistente`, `consejero`. */
  porConcepto: Record<string, { llamadas: number; entrada: number; salida: number }>;
  /** Que modelos han intervenido, para poder poner precio despues. */
  modelos: string[];
  actualizadoEl: string;
}

export interface GameSession {
  id: string;
  name: string;
  status: GameStatus;
  createdAt: string;
  updatedAt: string;
  /** Lo que ha costado, en tokens. Ausente en las partidas anteriores a esto. */
  gasto?: GastoDeLaPartida;
  /**
   * DONDE ESTAN LAS COSAS de una partida: una lista por categoría del juego.
   *
   * ═══ AQUI HABIA TRES CAMPOS MAS ═══
   *
   *     suspects: Suspect[];
   *     rooms: Room[];
   *     weapons: Weapon[];
   *
   * Ahí vivían las entidades desde antes de que existieran las categorías, y
   * por eso todo juego tenía que declarar `almacenHeredado` para que las suyas
   * acabaran en uno de los tres. Los ritos de la Momia no cabían en ninguno.
   *
   * Se quedaron después de generalizar el código porque había partidas
   * guardadas que los llevaban dentro, y borrar el campo del tipo no lo borra
   * de la base de datos. Eso se resolvió como se resuelve: moviendo lo que
   * había, una vez, con `server/scripts/mudanza-al-modelo-nuevo.ts`. Mientras
   * existieron, había DOS sitios donde podían estar las entidades de un juego,
   * y solo uno de los dos servía para el cuarto.
   *
   * NO SE LEE DIRECTAMENTE. Se consulta con `entidadesDe(game, categoria)`,
   * `personasDe(game)` o `lugaresDe(game)`, que saben qué categoría hace de
   * qué en cada juego.
   */
  entidades?: Record<string, Array<{
    id: string;
    name: string;
    description?: string;
    photoUrl?: string;
    email?: string;
    pin?: Chincheta;
  }>>;
  boardMode: BoardMode;
  /**
   * Quién puede dirigirla. Vacío o ausente = HUÉRFANA: se creó cuando el taller
   * era una sola casa con una sola contraseña, y no hay a quién atribuirla.
   */
  duenos?: DuenoDePartida[];
  /** Traza de la adopción, para poder revisarla o deshacerla. */
  adoptada?: { cuentaId: string; el: string; prueba: 'codigo-en-vivo' | 'nombre' };
  /** Foto aérea del espacio físico (modo 'aerial') */
  boardImageUrl?: string;
  board?: BoardLayout;
  plot?: Plot;
  documents?: PlayerDocument[];
  settings: GameSettings;
}

/**
 * Quien puede dirigir una partida.
 *
 * Es un ARRAY y no un `ownerId` suelto porque una velada la puede preparar más
 * de una persona, y porque si el único dueño borra su cuenta la partida no
 * puede quedarse sin nadie que la abra.
 */
export interface DuenoDePartida {
  cuentaId: string;
  /** 'creo' la creó · 'adopto' la reclamó de las antiguas · 'invito' co-organiza. */
  via: 'creo' | 'adopto' | 'invito';
  desdeEl: string;
  /** Quién le dio acceso, para poder deshacer una adopción equivocada. */
  porCuentaId?: string;
}

export interface GameSummary {
  id: string;
  name: string;
  /**
   * De qué juego es.
   *
   * LA COSTURA MÁS VISIBLE QUE DESTAPÓ EL SEGUNDO JUEGO: sin este campo, el
   * recibidor de una expedición listaba también los casos de CLUEDO, con los
   * rótulos de la expedición encima. No daba error; enseñaba mal.
   *
   * Ausente significa CLUEDO, igual que en `GameSettings.juego`, para que las
   * partidas de antes del manifiesto no desaparezcan del listado.
   */
  juego?: JuegoId;
  status: GameStatus;
  createdAt: string;
  updatedAt: string;
  /**
   * CUANTAS ENTIDADES HAY DE CADA CATEGORIA.
   *
   * Eran `suspectCount`, `roomCount` y `weaponCount`: tres campos con nombre
   * para las tres categorias de CLUEDO. La ficha del recibidor pintaba tres
   * contadores y ni uno mas, asi que un juego con una cuarta categoria la tenia
   * invisible — y uno con dos pintaba un cero.
   *
   * Las etiquetas ya no las pone el taller: salen del `plural` que declara cada
   * categoria en el manifiesto.
   */
  entidades: Record<string, number>;
  /** Nombres de quienes la dirigen. Es lo que se pinta, no los identificadores. */
  duenosNombres?: string[];
  /**
   * Nadie la reclama todavía: se creó antes de que existieran las cuentas.
   *
   * Se MARCA, no se esconde. Ocultar lo que no tiene dueño es exactamente el
   * fallo que ya está descrito en `db/store.ts` a propósito de MongoDB: quien
   * dirige no ve sus partidas, las da por perdidas, las vuelve a crear, y
   * acaban existiendo dos verdades sin forma de reconciliarlas.
   */
  huerfana?: boolean;
}

// ---------- Chat con el agente ----------

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

// ---------- Comandos de UI que el agente puede invocar ----------

/**
 * A que panel del taller manda mirar el asistente.
 *
 * ═══ ERA UNA LISTA CERRADA CON LAS PESTANAS DE CLUEDO ═══
 *
 *     'suspects' | 'rooms' | 'weapons' | 'style' | 'board' | ...
 *
 * Las tres primeras son las categorias del primer juego, metidas en un contrato
 * que comparten todos. Y como no podia crecer con las categorias de cada juego
 * nuevo, el taller tenia que TRADUCIR: cuando el asistente decia «mira los
 * sospechosos», buscaba que categoria de la Momia vivia en ese mismo almacen
 * heredado y abria `expedicionarios`.
 *
 * Traducir funcionaba, y aun asi era el sintoma: el asistente de una expedicion
 * arqueologica solo sabia pedir paneles con nombres de un asesinato, y si la
 * traduccion se caia no saltaba ningun error —no pasaba NADA, que es peor: la
 * pantalla se quedaba igual y parecia que el asistente no funcionaba.
 *
 * Ahora es el id de la pestaña, que para las categorias ES el id de la
 * categoria del juego. Quien lo valida es el servidor, que arma el `enum` de la
 * herramienta desde el manifiesto de ESTA partida: el modelo no puede pedir una
 * pestaña que no exista porque no la tiene en la lista.
 *
 * Los paneles fijos —`style`, `board`, `documents`, `live`, `generate`— son de
 * la plataforma y estan en `PANELES_DEL_TALLER`.
 */
export type HighlightTarget = string;

/**
 * Los paneles que tiene el taller ademas de uno por categoria.
 *
 * Estan aqui y no en el manifiesto porque no son de ningun juego: todo juego
 * tiene estilo, tablero, documentos, partida en vivo y generacion.
 */
export const PANELES_DEL_TALLER = ['style', 'board', 'documents', 'live', 'generate'] as const;

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
  | { type: 'stage'; stage: 'board' | 'plot' | 'documents' | 'material'; label: string }
  | { type: 'text'; delta: string }
  | { type: 'done'; game: GameSession }
  | { type: 'error'; message: string };
