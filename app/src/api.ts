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

/**
 * Completa lo que se teclea en «Cambiar de servidor».
 *
 * Sin esquema se asume `https://`, no `http://`. Quien escribe un dominio a
 * secas —`misterios.example.com`— está pensando en el servidor público, y ahí
 * el texto en claro lo bloquean tanto iOS (App Transport Security) como Android
 * (tráfico sin cifrar desde targetSdk 28): la app se quedaba sin poder hablar
 * con nadie y sin decir por qué. Quien de verdad quiera la wifi de casa escribe
 * `http://192.168.1.40:5174`, que se respeta tal cual.
 */
function normalizarUrl(url: string): string {
  let limpia = url.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(limpia)) limpia = `https://${limpia}`;
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

/**
 * Plazos. Sin ellos, una petición puede quedarse esperando PARA SIEMPRE.
 *
 * No es teórico: el cliente HTTP de Android no trae plazo por defecto, así que
 * una wifi asociada pero muerta —el portal cautivo del hotel, el repetidor que
 * dejó de encaminar— deja el `await` colgado sin error y sin fin. La pantalla
 * se queda con datos rancios y el reloj de la ronda bajando como si nada,
 * mientras en la mesa ya se ha cerrado.
 */
const PLAZO_MS = 15000;
/** La espera larga: el servidor retiene la petición hasta 25 s a propósito. */
const PLAZO_ESPERA_LARGA_MS = 40000;
/** El Mayordomo habla con un modelo de lenguaje y puede tardar. */
const PLAZO_MAYORDOMO_MS = 60000;

/** Reenvía al controlador propio la cancelación de quien llama. */
function enlazarSenales(externa: AbortSignal | undefined, propio: AbortController): () => void {
  if (!externa) return () => undefined;
  if (externa.aborted) {
    propio.abort();
    return () => undefined;
  }
  const alAbortar = (): void => propio.abort();
  externa.addEventListener('abort', alAbortar);
  return () => externa.removeEventListener('abort', alAbortar);
}

async function peticion<T>(
  ruta: string,
  opciones: RequestInit = {},
  señal?: AbortSignal,
  plazo: number = PLAZO_MS,
): Promise<T> {
  // Se combinan a mano y no con `AbortSignal.any`, que no está garantizado en
  // React Native.
  const propio = new AbortController();
  const temporizador = setTimeout(() => propio.abort(), plazo);
  const desenlazar = enlazarSenales(señal, propio);

  let res: Response;
  let texto: string;
  try {
    res = await fetch(`${servidor}/api${ruta}`, {
      ...opciones,
      signal: propio.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opciones.headers ?? {}),
      },
    });
    if (res.status === 204) return undefined as T;
    // El plazo sigue corriendo mientras se lee el cuerpo: unas cabeceras que
    // llegan y un cuerpo que no, cuelgan igual que no llegar nada.
    texto = await res.text();
  } catch (e) {
    // Si canceló quien llama —la app se fue a segundo plano, la pantalla se
    // desmontó— se deja pasar tal cual: no es un fallo que contar a nadie.
    if (señal?.aborted) throw e;
    if (propio.signal.aborted) {
      throw new ErrorApi('El servidor tarda demasiado en contestar.', 0);
    }
    // En React Native esto llega como «Network request failed», en inglés y
    // sin contexto. La app está entera en castellano; que no se rompa aquí.
    throw new ErrorApi('No se pudo conectar con la partida. Revisa la conexión.', 0);
  } finally {
    clearTimeout(temporizador);
    desenlazar();
  }

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
  return peticion<RespuestaVista | undefined>(
    `/jugar/vista${cola}`,
    {},
    señal,
    // Con `desde`, el servidor retiene la petición a propósito hasta 25 s. El
    // plazo tiene que ir por encima o cortaríamos justo lo que buscamos.
    desde === undefined ? PLAZO_MS : PLAZO_ESPERA_LARGA_MS,
  );
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
  return peticion(
    '/jugar/preguntar',
    { method: 'POST', body: JSON.stringify({ pregunta }) },
    undefined,
    PLAZO_MAYORDOMO_MS,
  );
}

export function pedirPerfil(): Promise<{ cuenta: Account | null }> {
  return peticion('/jugar/perfil');
}

/**
 * Borra la cuenta y desengancha el correo de todas las partidas.
 *
 * No es solo la exigencia de las tiendas: es que hasta ahora no había ninguna
 * manera de deshacer una cuenta que, además, la abrió otra persona —quien
 * organiza, al escribir tu correo—.
 */
export function borrarCuenta(): Promise<{ borrada: boolean; partidasLimpiadas: number }> {
  return peticion('/jugar/cuenta', { method: 'DELETE' });
}

export async function salir(): Promise<void> {
  await fijarToken(null);
}
