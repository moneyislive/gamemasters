/**
 * Cliente de la API.
 *
 * La dirección del servidor es configurable porque el mismo binario tiene que
 * servir para probar contra un portátil en la red local y para jugar contra el
 * servidor público. Se guarda en el dispositivo junto con la credencial.
 */
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { VistaJugador } from '../../shared/live';
import type { Account } from '../../shared/live';

const CLAVE_TOKEN = 'gm_token';
const CLAVE_SERVIDOR = 'gm_servidor';

/** Valor por defecto, sobreescribible con EXPO_PUBLIC_API_URL al compilar. */
const SERVIDOR_POR_DEFECTO =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5174';

// SecureStore no existe en web: allí se cae a localStorage, que es lo que hay.
const almacen = {
  async get(clave: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return globalThis.localStorage?.getItem(clave) ?? null;
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(clave);
  },
  async set(clave: string, valor: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        globalThis.localStorage?.setItem(clave, valor);
      } catch {
        /* modo privado: se pierde al cerrar, y no pasa nada */
      }
      return;
    }
    await SecureStore.setItemAsync(clave, valor);
  },
  async del(clave: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        globalThis.localStorage?.removeItem(clave);
      } catch {
        /* ídem */
      }
      return;
    }
    await SecureStore.deleteItemAsync(clave);
  },
};

let token: string | null = null;
let servidor: string = SERVIDOR_POR_DEFECTO;

export async function cargarSesionGuardada(): Promise<{ token: string | null; servidor: string }> {
  token = await almacen.get(CLAVE_TOKEN);
  servidor = (await almacen.get(CLAVE_SERVIDOR)) ?? SERVIDOR_POR_DEFECTO;
  return { token, servidor };
}

export function servidorActual(): string {
  return servidor;
}

export async function fijarServidor(url: string): Promise<void> {
  servidor = normalizarUrl(url);
  await almacen.set(CLAVE_SERVIDOR, servidor);
}

export async function fijarToken(nuevo: string | null): Promise<void> {
  token = nuevo;
  if (nuevo) await almacen.set(CLAVE_TOKEN, nuevo);
  else await almacen.del(CLAVE_TOKEN);
}

export function haySesion(): boolean {
  return Boolean(token);
}

function normalizarUrl(url: string): string {
  let limpia = url.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(limpia)) limpia = `http://${limpia}`;
  return limpia;
}

export class ErrorApi extends Error {
  readonly estado: number;
  constructor(mensaje: string, estado: number) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estado = estado;
  }
}

async function peticion<T>(
  ruta: string,
  opciones: RequestInit = {},
  señal?: AbortSignal,
): Promise<T> {
  const res = await fetch(`${servidor}/api${ruta}`, {
    ...opciones,
    signal: señal,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opciones.headers ?? {}),
    },
  });
  if (res.status === 204) return undefined as T;
  const texto = await res.text();
  let cuerpo: unknown;
  try {
    cuerpo = texto ? JSON.parse(texto) : {};
  } catch {
    cuerpo = { error: texto };
  }
  if (!res.ok) {
    const mensaje =
      typeof cuerpo === 'object' && cuerpo && 'error' in cuerpo
        ? String((cuerpo as { error: unknown }).error)
        : `Error ${res.status}`;
    throw new ErrorApi(mensaje, res.status);
  }
  return cuerpo as T;
}

// ---------------------------------------------------------------------------
// Rutas
// ---------------------------------------------------------------------------

export interface RespuestaEntrar {
  token: string;
  gameId: string;
  suspectId: string;
  displayName: string;
}

export async function entrar(code: string, joinCode: string): Promise<RespuestaEntrar> {
  const r = await peticion<RespuestaEntrar>('/jugar/entrar', {
    method: 'POST',
    body: JSON.stringify({ code, joinCode }),
  });
  await fijarToken(r.token);
  return r;
}

export interface RespuestaVista {
  vista: VistaJugador;
  avisos: Array<{ clave: string; texto: string }>;
}

/** Pide la vista. Con `desde` espera a que algo cambie (long-polling). */
export function pedirVista(desde?: number, señal?: AbortSignal): Promise<RespuestaVista | undefined> {
  const cola = desde === undefined ? '' : `?desde=${desde}`;
  return peticion<RespuestaVista | undefined>(`/jugar/vista${cola}`, {}, señal);
}

export function elegirSala(roomId: string): Promise<{ vista: VistaJugador }> {
  return peticion('/jugar/sala', { method: 'POST', body: JSON.stringify({ roomId }) });
}

export function avisarListo(listo: boolean): Promise<{ vista: VistaJugador }> {
  return peticion('/jugar/listo', { method: 'POST', body: JSON.stringify({ listo }) });
}

export function guardarNotas(notas: string): Promise<{ ok: true }> {
  return peticion('/jugar/notas', { method: 'POST', body: JSON.stringify({ notas }) });
}

/**
 * Entrega la acusación: un valor por cada eje que pida el juego.
 *
 * Recibe un diccionario y no tres cadenas sueltas, y no es un detalle de
 * estilo. Antes la firma era `acusar(murdererId, weaponId, roomId)`: tres
 * parámetros posicionales del mismo tipo, de modo que intercambiar dos
 * compilaba igual de bien y la partida puntuaba mal las acusaciones sin avisar
 * ni una sola vez. Con claves, esa clase de error deja de existir.
 */
export function acusar(
  respuestas: Record<string, string>,
): Promise<{ registrada: true; at: string }> {
  return peticion('/jugar/acusar', {
    method: 'POST',
    body: JSON.stringify({ respuestas }),
  });
}

/**
 * Hacer algo: la acción genérica.
 *
 * Un solo camino para todo el repertorio del juego. Añadir una acción nueva no
 * añade una función aquí ni un endpoint allí.
 */
export function hacerAccion(
  accion: string,
  datos: Record<string, string>,
): Promise<{ resultado: unknown; vista: VistaJugador }> {
  return peticion('/jugar/accion', {
    method: 'POST',
    body: JSON.stringify({ accion, datos }),
  });
}

export function preguntarAlConsejero(pregunta: string): Promise<{ respuesta: string }> {
  return peticion('/jugar/preguntar', {
    method: 'POST',
    body: JSON.stringify({ pregunta }),
  });
}

export function pedirPerfil(): Promise<{ cuenta: Account | null }> {
  return peticion('/jugar/perfil');
}

export async function salir(): Promise<void> {
  await fijarToken(null);
}
