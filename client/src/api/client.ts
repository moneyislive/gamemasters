import type {
  AppConfig,
  ChatStreamEvent,
  DocumentCapabilities,
  DocumentFormat,
  DocumentVariant,
  GameSession,
  GameSummary,
  GenerateStreamEvent,
  ModelId,
  Room,
  Suspect,
  Weapon,
} from '../../../shared/types';

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: init?.body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    // El servidor responde {error: "…"} en español: ese mensaje es el útil para
    // el usuario, así que se propaga tal cual en vez del código HTTP crudo.
    const text = await res.text().catch(() => '');
    let mensaje = text || res.statusText;
    try {
      const cuerpo = JSON.parse(text) as { error?: unknown };
      if (typeof cuerpo.error === 'string' && cuerpo.error.trim()) mensaje = cuerpo.error;
    } catch {
      // La respuesta no era JSON: se usa el texto crudo.
    }
    throw new Error(mensaje);
  }
  return res.json() as Promise<T>;
}

// ---------- Acceso ----------

export interface AuthStatus {
  /** ¿La instancia está protegida con contraseña? */
  required: boolean;
  authenticated: boolean;
}

export const getAuthStatus = () => request<AuthStatus>('/auth/status');
/**
 * El `nombre` es opcional y no es una credencial: sirve para que las partidas
 * que crees lleven tu firma en vez de salir huérfanas. Quien tiene la contraseña
 * puede escribir cualquiera, y el servidor lo dice así.
 */
export const login = (password: string, nombre?: string) =>
  request<{ authenticated: boolean; cuenta?: { id: string; displayName: string } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(nombre ? { password, nombre } : { password }),
  });
export const logout = () =>
  request<{ authenticated: boolean }>('/auth/logout', { method: 'POST' });

// ---------- Config ----------

export const getConfig = () => request<AppConfig>('/config');
export const setConfigModel = (model: ModelId) =>
  request<AppConfig>('/config', { method: 'PUT', body: JSON.stringify({ model }) });

// ---------- Partidas ----------

export const listGames = () => request<GameSummary[]>('/games');
/**
 * Abre una partida nueva DE UN JUEGO CONCRETO.
 *
 * El `juego` no estaba y su ausencia era un agujero silencioso: sin él, el
 * servidor guardaba la partida sin declarar a qué se juega, `manifiestoDe`
 * caía en CLUEDO —que es lo correcto para las partidas antiguas— y una
 * expedición de la Momia se habría preparado y jugado como un CLUEDO sin que
 * saltara un solo error. Se habría descubierto la noche de la velada.
 *
 * Se manda solo si viene: omitiéndolo, el servidor crea la partida como
 * siempre, que es lo que necesitan las llamadas que no saben de juegos.
 */
export const createGame = (name?: string, juego?: string) =>
  request<GameSession>('/games', {
    method: 'POST',
    body: JSON.stringify(juego ? { name, juego } : { name }),
  });
export const getGame = (id: string) => request<GameSession>(`/games/${id}`);
export const updateGame = (id: string, patch: Partial<GameSession>) =>
  request<GameSession>(`/games/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
export const deleteGame = (id: string) =>
  request<{ ok: true }>(`/games/${id}`, { method: 'DELETE' });

// ---------- Entidades (upsert: si lleva id existente actualiza, si no crea) ----------

/**
 * Alta o edición de una entidad, sea de la categoría que sea.
 *
 * El servidor ya registra sus seis rutas de entidades recorriendo una tabla;
 * estas dos funciones son su reflejo aquí. Las tres parejas con nombre que
 * siguen debajo se conservan porque las usan pantallas todavía sin
 * generalizar.
 */
export const upsertEntidad = (gameId: string, ruta: string, datos: Record<string, unknown>) =>
  request<GameSession>(`/games/${gameId}/${ruta}`, {
    method: 'POST',
    body: JSON.stringify(datos),
  });

export const removeEntidad = (gameId: string, ruta: string, id: string) =>
  request<GameSession>(`/games/${gameId}/${ruta}/${id}`, { method: 'DELETE' });

export const upsertSuspect = (gameId: string, suspect: Partial<Suspect>) =>
  request<GameSession>(`/games/${gameId}/suspects`, {
    method: 'POST',
    body: JSON.stringify(suspect),
  });
export const removeSuspect = (gameId: string, participanteId: string) =>
  request<GameSession>(`/games/${gameId}/suspects/${participanteId}`, { method: 'DELETE' });

export const upsertRoom = (gameId: string, room: Partial<Room>) =>
  request<GameSession>(`/games/${gameId}/rooms`, { method: 'POST', body: JSON.stringify(room) });
export const removeRoom = (gameId: string, lugarId: string) =>
  request<GameSession>(`/games/${gameId}/rooms/${lugarId}`, { method: 'DELETE' });

export const upsertWeapon = (gameId: string, weapon: Partial<Weapon>) =>
  request<GameSession>(`/games/${gameId}/weapons`, {
    method: 'POST',
    body: JSON.stringify(weapon),
  });
export const removeWeapon = (gameId: string, weaponId: string) =>
  request<GameSession>(`/games/${gameId}/weapons/${weaponId}`, { method: 'DELETE' });

// ---------- Tablero ----------

export const generateBoard = (gameId: string) =>
  request<GameSession>(`/games/${gameId}/board`, { method: 'POST' });

// ---------- Subida de ficheros ----------

export async function uploadFile(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append('file', file);
  return request<{ url: string }>('/uploads', { method: 'POST', body: form });
}

// ---------- SSE (POST + ReadableStream) ----------

async function postSSE<E>(
  path: string,
  body: unknown,
  onEvent: (event: E) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      const line = part
        .split('\n')
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trim())
        .join('');
      if (!line) continue;
      try {
        onEvent(JSON.parse(line) as E);
      } catch {
        // ignorar líneas malformadas
      }
    }
  }
}

/** Chat con el agente de CLUEDO (streaming). */
export const chatWithAgent = (
  gameId: string,
  message: string,
  onEvent: (event: ChatStreamEvent) => void,
  signal?: AbortSignal,
) => postSSE<ChatStreamEvent>(`/games/${gameId}/chat`, { message }, onEvent, signal);

/** Genera trama + tablero + documentos (streaming con progreso). */
export const generateGame = (
  gameId: string,
  onEvent: (event: GenerateStreamEvent) => void,
  signal?: AbortSignal,
) => postSSE<GenerateStreamEvent>(`/games/${gameId}/generate`, {}, onEvent, signal);

/**
 * Pone al día una partida ya generada tras cambiar jugadores, salas u objetos:
 * rehace solo lo necesario (tablero y dosieres son gratis; la trama solo se
 * toca si faltan personajes o la solución quedó rota). Mismo protocolo que
 * `generateGame`.
 */
export const refreshGame = (
  gameId: string,
  onEvent: (event: GenerateStreamEvent) => void,
  signal?: AbortSignal,
) => postSSE<GenerateStreamEvent>(`/games/${gameId}/refresh`, {}, onEvent, signal);

/**
 * Escribe el material de la velada —narraciones, giros, revelaciones de
 * cronología, ayudas y desenlace— sobre una trama ya existente, sin tocarla.
 * Mismo protocolo que `generateGame`.
 */
export const generateMaterial = (
  gameId: string,
  onEvent: (event: GenerateStreamEvent) => void,
  signal?: AbortSignal,
) => postSSE<GenerateStreamEvent>(`/games/${gameId}/material`, {}, onEvent, signal);

// ---------- Documentos ----------

export interface DocumentUrlOptions {
  variant?: DocumentVariant;
  format?: DocumentFormat;
  download?: boolean;
  /** Abre el documento con la barra de imprimir; `'auto'` lanza el diálogo. */
  print?: boolean | 'auto';
}

export const documentUrl = (
  gameId: string,
  participanteId: string,
  opciones: DocumentUrlOptions | boolean = {},
): string => {
  // Durante un tiempo la firma fue (gameId, participanteId, download): se mantiene
  // para no romper llamadas antiguas.
  const op: DocumentUrlOptions = typeof opciones === 'boolean' ? { download: opciones } : opciones;
  const params = new URLSearchParams();
  if (op.variant === 'blanco') params.set('variant', 'blanco');
  if (op.format === 'pdf') params.set('format', 'pdf');
  if (op.download) params.set('download', '1');
  if (op.print) params.set('print', op.print === 'auto' ? 'auto' : '1');
  const cola = params.toString();
  return `${BASE}/games/${gameId}/documents/${participanteId}${cola ? `?${cola}` : ''}`;
};

/** Paquete completo de la partida en un ZIP, con carpetas por destinatario. */
export const packageUrl = (
  gameId: string,
  opciones: { variant?: DocumentVariant; format?: DocumentFormat } = {},
): string => {
  const params = new URLSearchParams();
  if (opciones.variant === 'blanco') params.set('variant', 'blanco');
  if (opciones.format === 'pdf') params.set('format', 'pdf');
  const cola = params.toString();
  return `${BASE}/games/${gameId}/documents.zip${cola ? `?${cola}` : ''}`;
};

/** ¿Puede el servidor convertir a PDF, o hay que imprimir desde el navegador? */
export const fetchDocumentCapabilities = () =>
  request<DocumentCapabilities>('/documents/capabilities');
