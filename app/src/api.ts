/**
 * Cliente de la API.
 *
 * La dirección del servidor es configurable porque el mismo binario tiene que
 * servir para probar contra un portátil en la red local y para jugar contra el
 * servidor público. Se guarda en el dispositivo junto con la credencial.
 */
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { decidirServidor } from './servidor-elegido';
import type { VistaJugador } from '../../shared/live';
import type { Account } from '../../shared/live';

const CLAVE_TOKEN = 'gm_token';
/**
 * En qué partida está este móvil.
 *
 * Va aparte del testigo aunque el testigo la lleve dentro, porque leerla de ahí
 * obligaría a descodificar un sobre firmado para sacar un dato que ya nos
 * devuelve el servidor al entrar. Se guarda al fijar el testigo y se borra con
 * él: son la misma sesión.
 *
 * Existe para poder decir QUÉ partida da problemas. Sin esto, el aviso de una
 * partida caída no se puede colgar de su fila en el panel y hay que enseñarlo
 * como una franja arriba de todo, que es justo lo que se quería evitar.
 */
const CLAVE_PARTIDA = 'gm_partida';
/**
 * El aviso de la partida, guardado en disco mientras dura.
 *
 * NO ES CACHÉ, ES DÓNDE VIVE. Estaba solo en memoria de React y se perdía en
 * cuanto el árbol se remontaba —basta con abrir el panel de partidas desde una
 * app recién arrancada—, así que el aviso desaparecía justo al llegar a la
 * pantalla donde había que enseñarlo. Y con la app cerrada y vuelta a abrir,
 * igual: el problema seguía ahí y el aviso no.
 *
 * Se borra en cuanto deja de ser verdad: cualquier respuesta buena del
 * servidor, o volver a entrar en la partida.
 */
const CLAVE_AVISO = 'gm_aviso';
const CLAVE_SERVIDOR = 'gm_servidor';
/**
 * El testigo de la elección de servidor: qué dirección traía la app compilada
 * en el momento de guardarla. Sin él, una elección guardada no se distingue de
 * otra hecha hace un año contra un portátil que ya no existe. El porqué entero
 * está en `servidor-elegido.ts`.
 */
const CLAVE_SERVIDOR_COMPILADO = 'gm_servidor_compilado';
/**
 * El pasaporte de cuenta. Es OTRO testigo, con otra vida y otra puerta.
 *
 * Que sean dos y no uno es lo que impide el peor fallo posible aquí: que
 * caducar la sesión de tu cuenta te eche de la partida a mitad de cena. Son
 * cosas distintas —una dura noventa días y va contigo, la otra dura lo que la
 * velada y va atada a la apertura de esa partida— y se tratan por separado de
 * arriba abajo: distinta clave guardada, distinta cabecera, distinta salida.
 */
const CLAVE_CUENTA = 'gm_cuenta';

/**
 * A qué servidor habla la app por defecto.
 *
 * EN EL NAVEGADOR SE DEDUCE, y esa es la diferencia importante. La versión web
 * se sirve DESDE el propio servidor de juego, en `/jugar`, así que su origen ya
 * es la respuesta: preguntarle a la página dónde está acierta siempre y no hay
 * nada que configurar al compilar. Si se grabara una dirección fija, el mismo
 * empaquetado dejaría de servir en cualquier otro sitio —una prueba local, un
 * dominio nuevo— y fallaría con «no se puede hablar con el servidor», que suena
 * a problema de red y no a una dirección mal puesta.
 *
 * En el móvil no hay página de la que deducir nada, así que ahí sí se graba al
 * compilar con `EXPO_PUBLIC_API_URL`. Ver `app/COMPILAR.md`.
 */
const SERVIDOR_POR_DEFECTO =
  Platform.OS === 'web' && typeof globalThis.location !== 'undefined'
    ? globalThis.location.origin
    : (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5174');

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
let partida: string | null = null;
let avisoGuardado: { gameId: string | null; texto: string } | null = null;
let pasaporte: string | null = null;
let servidor: string = SERVIDOR_POR_DEFECTO;

/**
 * La lectura del disco, una sola vez y compartida por todo el que la pida.
 *
 * NO ES UNA OPTIMIZACIÓN, ES LA CORRECCIÓN DE UNA CARRERA. Antes cada pantalla
 * que quería saber si hay cuenta lo preguntaba a pelo con `hayCuenta()`, y en el
 * arranque —o abriendo la app directamente en una pantalla por un enlace— esa
 * pregunta llegaba ANTES de que el disco hubiera contestado. La respuesta era
 * «no hay cuenta», que es falso, y la pantalla se quedaba diciendo que no te han
 * sentado en ninguna mesa teniendo mesa. Al ser en el arranque, no se reintenta:
 * hay que salir y volver a entrar para verlo bien.
 *
 * Ahora se espera a esto y ya está. Guardar la promesa —y no un booleano— es lo
 * que hace que quien llegue a mitad de la lectura espere en vez de lanzar otra.
 */
let lectura: Promise<{ token: string | null; servidor: string }> | null = null;

export function cargarSesionGuardada(): Promise<{ token: string | null; servidor: string }> {
  return (lectura ??= leerSesionDelDisco());
}

async function leerSesionDelDisco(): Promise<{ token: string | null; servidor: string }> {
  token = await almacen.get(CLAVE_TOKEN);
  partida = await almacen.get(CLAVE_PARTIDA);
  avisoGuardado = leerAviso(await almacen.get(CLAVE_AVISO));
  pasaporte = await almacen.get(CLAVE_CUENTA);

  const veredicto = decidirServidor(
    {
      elegido: await almacen.get(CLAVE_SERVIDOR),
      compiladoDeEntonces: await almacen.get(CLAVE_SERVIDOR_COMPILADO),
    },
    SERVIDOR_POR_DEFECTO,
  );
  servidor = veredicto.servidor;
  /*
   * La elección caducada se BORRA, no se deja ahí ignorada. Si se dejara,
   * seguiría examinándose en cada arranque para nada y —esto es lo que de
   * verdad muerde— resucitaría entera el día que una versión futura volviera a
   * compilar por casualidad la dirección de entonces: un móvil que llevaba un
   * año funcionando bien se desviaría solo al portátil de una velada vieja.
   */
  if (veredicto.olvidar) {
    await almacen.del(CLAVE_SERVIDOR);
    await almacen.del(CLAVE_SERVIDOR_COMPILADO);
  }
  return { token, servidor };
}

export function hayCuenta(): boolean {
  return Boolean(pasaporte);
}

export async function fijarPasaporte(nuevo: string | null): Promise<void> {
  pasaporte = nuevo;
  if (nuevo) await almacen.set(CLAVE_CUENTA, nuevo);
  else await almacen.del(CLAVE_CUENTA);
}

export function servidorActual(): string {
  return servidor;
}

export async function fijarServidor(url: string): Promise<void> {
  servidor = normalizarUrl(url);
  await almacen.set(CLAVE_SERVIDOR, servidor);
  /*
   * El testigo se escribe SIEMPRE, y en el mismo acto que la elección. Una
   * elección guardada sin su testigo es indistinguible de las fósiles y el
   * siguiente arranque la tira: quien acaba de escribir la dirección del
   * portátil vería cómo la app vuelve sola a harkania.com al reabrirla.
   */
  await almacen.set(CLAVE_SERVIDOR_COMPILADO, SERVIDOR_POR_DEFECTO);
}

export async function fijarToken(nuevo: string | null, gameId?: string): Promise<void> {
  token = nuevo;
  if (nuevo) await almacen.set(CLAVE_TOKEN, nuevo);
  else await almacen.del(CLAVE_TOKEN);

  /*
    * La partida SOLO se olvida al fijar un testigo nuevo sin decir cuál, no al
    * quitarlo. Un 401 quita el testigo, y ahí es justo cuando hace falta saber
    * de qué partida hablamos para colgar el aviso de su fila.
    */
  if (nuevo) {
    partida = gameId ?? null;
    if (partida) await almacen.set(CLAVE_PARTIDA, partida);
    else await almacen.del(CLAVE_PARTIDA);
    // Entrar de nuevo es la cura del aviso, así que el aviso se va con ella.
    await fijarAvisoDePartida(null);
  }
}

/**
 * Lee el aviso guardado sin fiarse de lo que haya en el disco.
 *
 * Lo escribimos nosotros, pero de una versión anterior puede quedar cualquier
 * cosa, y un JSON roto aquí dejaría la app sin arrancar por un aviso.
 */
function leerAviso(crudo: string | null): { gameId: string | null; texto: string } | null {
  if (!crudo) return null;
  try {
    const v = JSON.parse(crudo) as { gameId?: unknown; texto?: unknown };
    if (typeof v?.texto !== 'string' || !v.texto) return null;
    return { gameId: typeof v.gameId === 'string' ? v.gameId : null, texto: v.texto };
  } catch {
    return null;
  }
}

/** El aviso de la partida que siga en pie, si hay alguno. */
export function avisoDePartidaGuardado(): { gameId: string | null; texto: string } | null {
  return avisoGuardado;
}

export async function fijarAvisoDePartida(
  nuevo: { gameId: string | null; texto: string } | null,
): Promise<void> {
  avisoGuardado = nuevo;
  if (nuevo) await almacen.set(CLAVE_AVISO, JSON.stringify(nuevo));
  else await almacen.del(CLAVE_AVISO);
}

/** En qué partida está este móvil, si está en alguna. */
export function partidaActiva(): string | null {
  return partida;
}

/**
 * Dirección pública de la política de privacidad.
 *
 * Cuelga del mismo servidor con el que se está jugando, así que sigue al que
 * tenga configurado el móvil: en la wifi de casa apunta al portátil, y en el
 * servidor público, al de verdad.
 */
/**
 * El taller, para quien llega sin invitación.
 *
 * Es el mismo servidor con el que se juega: en la wifi de casa apunta al
 * portátil de quien organiza, y en producción, al público. Se abre en el
 * navegador porque el taller es una herramienta de escritorio —montar una
 * velada es escribir, subir fotos y colocar chinchetas en un plano— y hacerlo
 * en un móvil sería un castigo.
 */
export function urlDelTaller(): string {
  return urlDelServidor();
}

/**
 * La dirección del servidor con el que habla esta app.
 *
 * La necesita el inicio de sesión con Google, que ya no habla con Google
 * directamente: abre una página DE ESTE SERVIDOR y deja que él haga el viaje.
 */
export function urlDelServidor(): string {
  return servidor;
}

/**
 * Cambia el código de un solo uso que trajo el enlace de vuelta por la sesión.
 *
 * Ver el porqué del código intermedio en `entrar-con.ts`: el enlace atraviesa el
 * sistema operativo y no puede llevar un pasaporte de noventa días dentro.
 */
export async function canjearEntrada(
  codigo: string,
): Promise<{ id: string; displayName: string; email: string; taller: boolean }> {
  const r = await peticion<{
    pasaporte: string;
    cuenta: { id: string; displayName: string; email: string; taller: boolean };
  }>('/cuenta/entrar/canjear', {
    method: 'POST',
    body: JSON.stringify({ codigo }),
  });
  await fijarPasaporte(r.pasaporte);
  return r.cuenta;
}

export function urlDePrivacidad(): string {
  return `${servidor}/privacidad`;
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
        // Las dos cabeceras cuando se tienen las dos. `Authorization` es SOLO
        // del jugador; la cuenta va por la suya. Mezclarlas haría que un 401 de
        // una echase de la otra.
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(pasaporte ? { 'X-GM-Cuenta': pasaporte } : {}),
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
  participanteId: string;
  displayName: string;
}

export async function entrar(code: string, joinCode: string): Promise<RespuestaEntrar> {
  const r = await peticion<RespuestaEntrar>('/jugar/entrar', {
    method: 'POST',
    body: JSON.stringify({ code, joinCode }),
  });
  await fijarToken(r.token, r.gameId);
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

export function elegirSala(lugarId: string): Promise<{ vista: VistaJugador }> {
  return peticion('/jugar/sala', { method: 'POST', body: JSON.stringify({ lugarId }) });
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
 * estilo. Antes la firma era `responder(murdererId, weaponId, lugarId)`: tres
 * parámetros posicionales del mismo tipo, de modo que intercambiar dos
 * compilaba igual de bien y la partida puntuaba mal las acusaciones sin avisar
 * ni una sola vez. Con claves, esa clase de error deja de existir.
 */
export function responder(
  respuestas: Record<string, string>,
): Promise<{ registrada: true; at: string }> {
  return peticion('/jugar/responder', {
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
  /*
   * UNA LISTA TAMBIEN ES UN VALOR. Era `Record<string, string>` porque toda
   * accion elegia UNA entidad; el sellado de la Momia elige cinco ritos EN
   * ORDEN, y el motor lo declara con `eligeVarias`, que exige un array de
   * verdad. Aplanarlo a «a,b,c» aqui habria dejado el sellado sin entregar la
   * noche de la partida, con el reductor escrito y funcionando. La ruta del
   * servidor conserva los arrays justo para esto.
   */
  /*
   * Y UN NUMERO TAMBIEN. Una accion puede pedir una cantidad --una puja, un
   * dano, cuantos dados tiras-- y mandarla como cadena la dejaria fuera: el
   * motor comprueba que sea un numero de verdad y que quepa entre sus limites, y
   * lo hace sobre lo que llega. Se manda tal cual y se valida alli.
   */
  datos: Record<string, string | string[] | number>,
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

/**
 * Denuncia una respuesta del Mayordomo.
 *
 * Lo exige la política de contenido generado con IA de Google Play: hay que
 * poder denunciar sin salir de la app. Va a la partida, donde lo ve quien la
 * dirige.
 */
export function denunciarRespuesta(pregunta: string, respuesta: string): Promise<{ ok: true }> {
  return peticion('/jugar/denunciar', {
    method: 'POST',
    body: JSON.stringify({ pregunta, respuesta }),
  });
}

export interface RespuestaPerfil {
  cuenta: Account | null;
  /** El correo que escribió quien organiza, si puso alguno. */
  invitacion: string | null;
  /** ¿Se están guardando las partidas en un perfil? */
  guardando: boolean;
}

export function pedirPerfil(): Promise<RespuestaPerfil> {
  return peticion('/jugar/perfil');
}

/**
 * Acepta —o retira— que las partidas se guarden en un perfil.
 *
 * Hasta ahora este «sí» lo daba quien organiza sin saberlo, con solo teclear un
 * correo al montar la partida. Ahora lo da quien juega, desde su móvil.
 */
export function guardarEnPerfil(guardar: boolean): Promise<{ guardando: boolean }> {
  return peticion('/jugar/perfil/guardar', {
    method: 'POST',
    body: JSON.stringify({ guardar }),
  });
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

/**
 * Salir de la PARTIDA. No toca la cuenta.
 *
 * Antes había una sola `salir()` y la llamaban los dos caminos: el 401 del
 * bucle de la partida y el botón del perfil. En cuanto existen dos sesiones eso
 * se vuelve peligroso —un 401 de la cuenta te echaría de la mesa— así que están
 * partidas desde el principio.
 */
export async function salirDeLaPartida(): Promise<void> {
  await fijarToken(null);
}

/**
 * Salir a propósito, que no es lo mismo que quedarse sin credencial.
 *
 * Un 401 tira el testigo pero deja en pie de qué partida hablábamos, porque
 * hace falta para colgar el aviso de su fila. Cuando alguien pulsa «salir de la
 * partida» no queda nada de que avisar: se olvida todo.
 */
export async function olvidarPartida(): Promise<void> {
  await salirDeLaPartida();
  partida = null;
  await almacen.del(CLAVE_PARTIDA);
  await fijarAvisoDePartida(null);
}

/** Cerrar la sesión de la cuenta. No toca la partida en curso. */
export async function cerrarSesionDeCuenta(): Promise<void> {
  await fijarPasaporte(null);
}

/** @deprecated Di cuál de las dos. */
export async function salir(): Promise<void> {
  await salirDeLaPartida();
}

// ---------------------------------------------------------------------------
// La cuenta
// ---------------------------------------------------------------------------

export interface InvitacionVista {
  gameId: string;
  titulo: string;
  personaje: string;
  participanteId: string;
  fase: string;
  paraEl: string;
  directa: boolean;
  yaDentro: boolean;
}

export interface Portada {
  cuenta: {
    id: string;
    displayName: string;
    email: string;
    trofeos: string[];
    partidas: Account['partidas'];
  };
  invitaciones: InvitacionVista[];
}

export function pedirPortada(): Promise<Portada> {
  return peticion('/cuenta/portada');
}

/**
 * EL CATÁLOGO DE ARCADES DE ESTE SERVIDOR, para la Sala de la portada.
 *
 * ═══ VA SIN CREDENCIAL, Y NO ES UN DESCUIDO ═══
 *
 * `peticion` añade las cabeceras que haya, pero esta ruta no las mira: el router
 * de arcade se monta ANTES del guardián en `server/src/index.ts`, porque un
 * arcade no tiene Game Master ni cuenta. Y hace falta que sea así: la portada se
 * pinta también para quien todavía no ha entrado, y la Sala tiene que salirle
 * entera. Si esto exigiera sesión, el escaparate sólo existiría para quien ya
 * está dentro, que es justo al revés de para lo que sirve un escaparate.
 *
 * Devuelve el cuerpo CRUDO, sin tipar. Quien lo valida es `loQueLlega` en
 * `arcade/del-servidor.ts`, y va allí y no aquí por dos razones: porque lo que
 * llega son manifiestos escritos en OTRO repositorio —los de `ARCADES_EXTERNOS`—
 * y decidir cuáles valen es una regla de la Sala y no del transporte; y porque
 * allí un comprobador de Node puede ejercitarla sin levantar nada.
 */
export function pedirCatalogoDeArcade(señal?: AbortSignal): Promise<unknown> {
  return peticion('/arcade', {}, señal);
}

// ---------------------------------------------------------------------------
// El estudio de generación: avatares 3D y fondos
// ---------------------------------------------------------------------------

export interface EstadoDeGeneracion {
  estado: 'en-cola' | 'esculpiendo' | 'listo' | 'fallo';
  progreso: number;
  modeloUrl?: string;
  vistaPrevia?: string;
  detalle?: string;
}

/** Qué formas de entrar ofrece el servidor con el que se habla. */
export function proveedoresDisponibles(): Promise<{
  google: boolean;
  apple: boolean;
  /**
   * Los que tienen puerta de entrada POR NAVEGADOR.
   *
   * Importa aquí y no solo en el taller: el inicio de sesión con Google de la
   * app también pasa por el navegador —abre una página del servidor porque
   * Google no admite esquemas propios— así que necesita esa ruta. Apple en
   * iPhone no: usa el diálogo nativo del sistema y le basta con estar
   * configurado.
   */
  navegador?: string[];
}> {
  return peticion('/cuenta/proveedores');
}

/**
 * Entra con un proveedor y guarda el pasaporte.
 *
 * El testigo del proveedor se verifica en el SERVIDOR: aquí solo se recoge y se
 * entrega. Cualquier comprobación hecha en el móvil se la salta quien quiera.
 */
export async function entrarConProveedor(
  proveedor: 'google' | 'apple',
  idToken: string,
  nonce: string,
): Promise<{ id: string; displayName: string; email: string; taller: boolean }> {
  const r = await peticion<{
    pasaporte: string;
    cuenta: { id: string; displayName: string; email: string; taller: boolean };
  }>('/cuenta/entrar', {
    method: 'POST',
    body: JSON.stringify({ proveedor, idToken, nonce }),
  });
  await fijarPasaporte(r.pasaporte);
  return r.cuenta;
}

/** Vincula un segundo proveedor a la cuenta con la que ya se está dentro. */
export async function vincularProveedor(
  proveedor: 'google' | 'apple',
  idToken: string,
  nonce: string,
): Promise<string[]> {
  const r = await peticion<{ pasaporte: string; identidades: string[] }>('/cuenta/vincular', {
    method: 'POST',
    body: JSON.stringify({ proveedor, idToken, nonce }),
  });
  // Vincular corta las sesiones anteriores: sin guardar el nuevo pasaporte,
  // quien acaba de vincular se quedaría fuera al instante.
  await fijarPasaporte(r.pasaporte);
  return r.identidades;
}

/**
 * Canjea una invitación por una credencial de partida.
 *
 * Puede responder `requiereCodigo`: no es un error, es el camino normal cuando
 * el correo no está verificado por un proveedor, la partida ya empezó, o la
 * silla está ocupada. La app manda entonces a teclear el código de siempre.
 */
/** Una partida tal y como la enseña el panel. Ver `server/src/live/panel.ts`. */
export interface PartidaDelPanel {
  gameId: string;
  titulo: string;
  personaje: string;
  participanteId: string;
  estado: 'espera' | 'en-curso' | 'pausada' | 'terminada' | 'retirada';
  cuando?: string;
  puedeEntrar: boolean;
  motivo?: string;
  resultado?: { ganador?: string; gane: boolean; acerte: boolean };
}

/**
 * Todo lo que esta cuenta ha jugado o tiene por jugar.
 *
 * SEPARADO DE LA PORTADA a propósito: la portada solo trae los sobres de las
 * mesas a las que puedes sentarte ahora, y cargarle además el historial entero
 * en cada arranque sería pagarlo siempre para enseñarlo casi nunca.
 */
export async function pedirPartidas(): Promise<PartidaDelPanel[]> {
  const r = await peticion<{ partidas: PartidaDelPanel[] }>('/cuenta/partidas');
  return r.partidas;
}

/** Entra en una mesa desde el panel. Es la misma puerta que la invitación. */
export const entrarEnPartida = entrarDesdeInvitacion;

export function entrarDesdeInvitacion(
  gameId: string,
  participanteId: string,
): Promise<
  | { requiereCodigo: true; motivo: string }
  | { requiereCodigo: false; token: string; gameId: string; participanteId: string; displayName: string }
> {
  return peticion('/cuenta/entrar-en-partida', {
    method: 'POST',
    body: JSON.stringify({ gameId, participanteId }),
  });
}

/** Borra la cuenta desde fuera de una partida. */
export function borrarCuentaDeLaPlataforma(): Promise<{
  borrada: boolean;
  partidasLimpiadas: number;
}> {
  return peticion('/cuenta', { method: 'DELETE' });
}

export function generacionDisponible(): Promise<{ avatares: boolean; fondos: boolean }> {
  return peticion('/generacion/disponible');
}

/** Manda la imagen (base64) y devuelve el identificador de la tarea. */
export function generarAvatar3D(imagenB64: string, tipo: string): Promise<{ tarea: string }> {
  return peticion(
    '/generacion/avatar',
    { method: 'POST', body: JSON.stringify({ imagen: imagenB64, tipo }) },
    undefined,
    // Subir una foto grande por wifi doméstica tarda: plazo holgado.
    60000,
  );
}

export function estadoAvatar3D(tarea: string): Promise<EstadoDeGeneracion> {
  return peticion(`/generacion/avatar/${encodeURIComponent(tarea)}`, {}, undefined, 30000);
}

/**
 * Los fondos generados de cada sala, y el ÚNICO sitio de este fichero donde la
 * forma de lo que llega se comprueba en vez de creerse.
 *
 * ═══ POR QUÉ ESTA FUNCIÓN NO SE PARECE A SUS HERMANAS ═══
 *
 * `peticion<T>` es un molde: lee el JSON y lo devuelve como `T` sin mirarlo. Eso
 * vale mientras servidor y móvil vayan a la par, y es lo que hacen todas las
 * demás de este fichero. Aquí no vale, y no por gusto: la portada INDEXA lo que
 * devuelve —`fondos[sala]`, en `src/fondos-sala.tsx`— sobre un estado declarado
 * `Record<string, string>`, o sea NO anulable. Un `undefined` ahí no degrada:
 * deja la pantalla entera en negro.
 *
 * Y llegaba. Levantando la app SOLA, sin la API —que es como se desarrolla la
 * Sala de Arcade—, `/api/generacion/fondos` lo contesta el servidor de
 * desarrollo de Expo con un 200 y otro cuerpo. Entonces:
 *
 *   · NO hay excepción, así que el `.catch(() => undefined)` de quien llama no
 *     se entera. Esa es la parte que engaña: parece protegido y no lo está,
 *     porque lo que falló no fue la petición sino la FORMA de la respuesta.
 *   · `r.fondos` es `undefined` y se escribe tal cual en un estado cuyo tipo
 *     promete que eso no puede pasar.
 *   · La portada muere con «Cannot read properties of undefined (reading
 *     'cluedo')», que no menciona ni los fondos ni la red.
 *
 * ═══ POR QUÉ SE ARREGLA AQUÍ Y NO EN LA PANTALLA ═══
 *
 * Porque la mentira es de esta firma: prometía `Record<string, string>` y
 * entregaba lo que hubiera. Taparlo en la portada dejaría la promesa rota para
 * el siguiente que la llame, y taparlo dentro de `FondoDeSalas` —tolerando un
 * `undefined` al pintar— escondería el fallo en vez de arreglarlo: la pantalla
 * saldría sin fondos y nadie sabría por qué. Aquí la firma vuelve a ser verdad.
 *
 * Es el mismo criterio que `app/app/(juego)/puesto.tsx` aplica al planteamiento
 * de los instrumentos, que llega como `unknown` y se lee con una función que
 * devuelve `undefined` si no encaja. Su cabecera lo razona: un móvil puede
 * llevar una versión más vieja que el servidor.
 *
 * ═══ EL MISMO PATRÓN ESTÁ EN OTROS SITIOS Y ALLÍ NO MUERDE ═══
 *
 * `app/app/(juego)/perfil.tsx` hace `setCuenta(r.cuenta)`, `setInvitacion(...)`
 * y `setGuardando(...)` sin comprobar nada, igual que hacía esto. No se tocan, y
 * conviene saber por qué para no «arreglarlos» a ciegas: sus estados son
 * `Account | null`, `string | null` y un booleano, y se leen como condiciones.
 * Un `undefined` ahí es falsy, y la pantalla sale como si no hubiera datos —que
 * es exactamente lo que hay—.
 *
 * O sea que lo que mata NO es alimentar un estado sin comprobar la forma: es
 * hacerlo sobre un estado NO ANULABLE que luego se INDEXA. Ésa es la
 * combinación que hay que buscar el día que aparezca otro fallo así.
 */
export function pedirFondos(): Promise<{ disponible: boolean; fondos: Record<string, string> }> {
  return peticion<unknown>('/generacion/fondos').then(leerFondos);
}

/**
 * Lo que llega, convertido en lo que se prometió.
 *
 * NO LANZA, a propósito: un servidor que todavía no sabe generar fondos y algo
 * que no es nuestro servidor tienen que dar lo mismo —ningún fondo— porque la
 * portada hace lo mismo en los dos casos, que es enseñar los telones pintados a
 * mano. Lanzar obligaría a cada llamante a distinguir dos casos que no se
 * distinguen.
 *
 * Se filtra ENTRADA A ENTRADA y no de golpe: un mapa con nueve direcciones
 * buenas y una nula tiene nueve fondos, no cero. Descartarlo entero por una mala
 * sería castigar a las salas que sí tienen ilustración.
 */
function leerFondos(v: unknown): { disponible: boolean; fondos: Record<string, string> } {
  const raiz = typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};
  const crudo =
    typeof raiz.fondos === 'object' && raiz.fondos !== null
      ? (raiz.fondos as Record<string, unknown>)
      : {};
  const fondos: Record<string, string> = {};
  for (const sala of Object.keys(crudo)) {
    const url = crudo[sala];
    if (typeof url === 'string' && url !== '') fondos[sala] = url;
  }
  return { disponible: raiz.disponible === true, fondos };
}

export function generarFondo(sala: string): Promise<{ sala: string; url: string }> {
  return peticion(
    '/generacion/fondo',
    { method: 'POST', body: JSON.stringify({ sala }) },
    undefined,
    // Pintar un fondo en 4K lleva su tiempo.
    120000,
  );
}

/** Convierte una ruta firmada del servidor en URL absoluta para <Image> o GLB. */
export function urlAbsoluta(ruta: string): string {
  return ruta.startsWith('http') ? ruta : `${servidor}${ruta}`;
}
