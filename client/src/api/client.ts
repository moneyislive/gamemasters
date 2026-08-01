import type {
  AppConfig,
  ChatStreamEvent,
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
export const login = (password: string) =>
  request<{ authenticated: boolean }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
export const logout = () =>
  request<{ authenticated: boolean }>('/auth/logout', { method: 'POST' });

// ---------- Config ----------

export const getConfig = () => request<AppConfig>('/config');
export const setConfigModel = (model: ModelId) =>
  request<AppConfig>('/config', { method: 'PUT', body: JSON.stringify({ model }) });

// ---------- Partidas ----------

export const listGames = () => request<GameSummary[]>('/games');
export const createGame = (name?: string) =>
  request<GameSession>('/games', { method: 'POST', body: JSON.stringify({ name }) });
export const getGame = (id: string) => request<GameSession>(`/games/${id}`);
export const updateGame = (id: string, patch: Partial<GameSession>) =>
  request<GameSession>(`/games/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
export const deleteGame = (id: string) =>
  request<{ ok: true }>(`/games/${id}`, { method: 'DELETE' });

// ---------- Entidades (upsert: si lleva id existente actualiza, si no crea) ----------

export const upsertSuspect = (gameId: string, suspect: Partial<Suspect>) =>
  request<GameSession>(`/games/${gameId}/suspects`, {
    method: 'POST',
    body: JSON.stringify(suspect),
  });
export const removeSuspect = (gameId: string, suspectId: string) =>
  request<GameSession>(`/games/${gameId}/suspects/${suspectId}`, { method: 'DELETE' });

export const upsertRoom = (gameId: string, room: Partial<Room>) =>
  request<GameSession>(`/games/${gameId}/rooms`, { method: 'POST', body: JSON.stringify(room) });
export const removeRoom = (gameId: string, roomId: string) =>
  request<GameSession>(`/games/${gameId}/rooms/${roomId}`, { method: 'DELETE' });

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

// ---------- Documentos ----------

export const documentUrl = (gameId: string, suspectId: string, download = false) =>
  `${BASE}/games/${gameId}/documents/${suspectId}${download ? '?download=1' : ''}`;
