/**
 * EL CANAL DE BOOTS ON BOARD: lo que se dicen el aparato y el servidor mientras se anda por el
 * tablero de una mesa en modalidad `botas`.
 *
 * ═══ POR QUÉ UN CANAL APARTE, Y NO LA ESPERA LARGA DE LA MESA ═══
 *
 * La mesa —quién puso qué, quién ganó— viaja como siempre: una revisión por jugada, por espera
 * larga, persistida. Esto es OTRO plano: dónde está andando cada uno, veinte veces por segundo,
 * que no se persiste nunca y que si se cae sólo deja de verse a los demás. Meterlo en la espera
 * larga sería una petición por tic y por jugador; por eso va por un WebSocket, que el navegador y
 * React Native traen de serie (el servidor usa `ws`). Ver `docs/BOOTS-ON-BOARD.md` §7.3 B.
 *
 * ═══ EL APARATO ANDA, EL SERVIDOR VALIDA ═══
 *
 * Cada tic el aparato manda DÓNDE ESTÁ —en coma fija, con el rumbo y la marcha— después de andar
 * con su mundo entero (estructura y adorno). El servidor lo coteja con la ESTRUCTURA del mundo
 * de la mesa: que el tramo desde el último sitio bueno se pueda andar en línea recta
 * (`seAndaEnRecta` de `mundo.ts`) y que no se haya ido más lejos de lo que da de sí correr en el
 * tiempo de pared que ha pasado. Si no cuadra, le devuelve el último sitio bueno (`corrige`). El
 * combate y el botín los decide siempre el servidor, sobre los sitios que aceptó.
 *
 * ═══ LA LLAVE VA EN EL PRIMER MENSAJE, NUNCA EN LA URL ═══
 *
 * Un navegador no deja poner cabeceras a un WebSocket, y la tentación es `?llave=` en la
 * dirección. No: las direcciones acaban en los registros del borde y del balanceador, y la llave
 * de asiento es una credencial —con ella se mueve en nombre de alguien—. Así que se abre sin nada
 * y lo primero que se dice es `hola` con la llave; quien no lo diga en `PLAZO_DEL_HOLA_MS`, fuera.
 *
 * ═══ LO QUE HAY AQUÍ ═══
 *
 * Los mensajes, los topes, los códigos de cierre y dos lectores ESTRICTOS —uno para cada lado—
 * que devuelven `null` ante cualquier cosa que no sea exactamente un mensaje bien formado. Nada
 * de red ni de reloj: esto es contrato y lo usan los dos.
 */

/** La versión del protocolo. Se sube si cambia la forma de un mensaje. */
export const VERSION_DEL_CANAL = 1;

/** La ruta del canal de una mesa. Bajo `/api` para que los Vite de desarrollo lo pasen al servidor. */
export function rutaDelCanal(codigo: string): string {
  return `/api/arcade/mesas/${encodeURIComponent(codigo)}/botas`;
}

/** Cuánto tiene el aparato para decir `hola` tras abrir, en milisegundos. */
export const PLAZO_DEL_HOLA_MS = 5000;

/** Cuántas fotos manda el servidor por segundo. La mitad de los tics: se interpola entre ellas. */
export const FOTOS_POR_SEGUNDO = 10;

/** Cuántas veces por segundo dice dónde está quien no se mueve: lo justo para seguir presente. */
export const AVISOS_QUIETO_POR_SEGUNDO = 2;

/**
 * Cuánto se retrasa lo que se pinta de los DEMÁS, en milisegundos. Se pinta el pasado para tener
 * siempre dos fotos entre las que interpolar: con 10 fotos por segundo, 150 ms deja margen para
 * que se pierda una. Es la mitad de la «ventaja del que asoma» que Miguel aceptó (150-250 ms).
 */
export const RETRASO_DE_LOS_DEMAS_MS = 150;

/**
 * Cuánto tiempo quieto aguanta el canal abierto. Desalojo por CONTENIDO, no por tráfico: una
 * pestaña en segundo plano sigue mandando mensajes —el navegador baja la animación a 1 Hz pero no
 * la para— y parece un jugador vivo. Lo que no hace es moverse.
 */
export const QUIETO_HASTA_CERRAR_MS = 60_000;

/** Cuánto se guarda el sitio de quien se desconecta, por si vuelve (una red que parpadea). */
export const GRACIA_AL_IRSE_MS = 5000;

/** El tope de un mensaje del aparato, en bytes: el más largo (`hola`) cabe de sobra. */
export const TOPE_DE_MENSAJE_BYTES = 256;

/** Cuántos mensajes por segundo puede mandar un aparato de media, y de golpe. */
export const MENSAJES_POR_SEGUNDO = 25;
export const MENSAJES_DE_GOLPE = 40;

/** Por qué se cierra un canal. Los números van del 4000 al 4999, que son los de la aplicación. */
export const CIERRE = {
  /** No dijo `hola` a tiempo, o lo primero que dijo no era un `hola`. */
  sinHola: 4000,
  /** La llave no es de ningún asiento de esta mesa. */
  llaveMala: 4001,
  /** La mesa no existe, o no es de la modalidad `botas`, o su juego no se recorre. */
  mesaQueNo: 4002,
  /** Se abrió otro canal con el mismo asiento: el nuevo manda. */
  reemplazado: 4003,
  /** Sesenta segundos sin moverse. */
  quieto: 4004,
  /** Demasiados mensajes, o uno demasiado grande, o mal formado. */
  atropello: 4005,
  /** La mesa se cerró o se olvidó. */
  mesaCerrada: 4006,
} as const;
export type CodigoDeCierre = (typeof CIERRE)[keyof typeof CIERRE];

/* ─── LO QUE DICE EL APARATO ─────────────────────────────────────────────── */

/** Lo primero: quién soy. */
export interface Hola {
  readonly t: 'hola';
  readonly v: number;
  readonly llave: string;
}

/**
 * Dónde estoy, en el tic `n` de mi cuenta (empieza en 1 y crece de uno en uno). `x` y `z` en
 * Q16.16, `r` el rumbo de 0 a 255, `m` la marcha (0 quieto, 1 andando, 2 corriendo).
 */
export interface Aqui {
  readonly t: 'aqui';
  readonly n: number;
  readonly x: number;
  readonly z: number;
  readonly r: number;
  readonly m: 0 | 1 | 2;
}

export type MensajeDelAparato = Hola | Aqui;

/* ─── LO QUE DICE EL SERVIDOR ────────────────────────────────────────────── */

/** Ya estás dentro: quién eres en esta mesa y dónde apareces. */
export interface Dentro {
  readonly t: 'dentro';
  readonly yo: string;
  readonly x: number;
  readonly z: number;
  readonly r: number;
  readonly hz: number;
}

/**
 * La foto de la mesa: dónde está cada uno según el servidor, en el tic `k` de SU cuenta. Cada
 * entrada es `[asiento, x, z, rumbo, marcha]`, con `x` y `z` en Q16.16. Se serializa UNA vez por
 * mesa y tic y se manda la misma cadena a todos: por eso no lleva nada de nadie en particular.
 */
export interface Foto {
  readonly t: 'foto';
  readonly k: number;
  readonly p: readonly (readonly [string, number, number, number, number])[];
}

/** Lo que dijiste en el tic `n` no vale: vuelves a `(x, z)`, que es el último sitio bueno. */
export interface Corrige {
  readonly t: 'corrige';
  readonly n: number;
  readonly x: number;
  readonly z: number;
}

/** Antes de cerrar, por qué: se lee en pantalla. */
export interface Fuera {
  readonly t: 'fuera';
  readonly motivo: string;
}

export type MensajeDelServidor = Dentro | Foto | Corrige | Fuera;

/* ─── LOS LECTORES ESTRICTOS ─────────────────────────────────────────────── */

/** El mayor valor absoluto de una coordenada en Q16.16: 32.767 unidades del mundo. */
const TOPE_DE_COORDENADA = 2147483647;

function esEntero(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v);
}

function esCoordenada(v: unknown): v is number {
  return esEntero(v) && v <= TOPE_DE_COORDENADA && v >= -TOPE_DE_COORDENADA;
}

function esRumbo(v: unknown): v is number {
  return esEntero(v) && v >= 0 && v <= 255;
}

function esMarcha(v: unknown): v is 0 | 1 | 2 {
  return v === 0 || v === 1 || v === 2;
}

/** Un objeto llano con EXACTAMENTE estas claves: ni una de más, ni una de menos. */
function conClaves(v: unknown, claves: readonly string[]): v is Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const suyas = Object.keys(v);
  if (suyas.length !== claves.length) return false;
  for (const c of claves) if (!Object.prototype.hasOwnProperty.call(v, c)) return false;
  return true;
}

function analizar(texto: string): unknown {
  try {
    return JSON.parse(texto) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * Lo que manda un aparato, leído por el servidor. `null` ante CUALQUIER cosa rara: una clave de
 * más, un número con decimales, un rumbo fuera de rango, un texto más largo que el tope. Un
 * aparato es un entorno hostil —basta con abrir las herramientas del navegador— y aquí no se
 * adivina lo que quiso decir.
 */
export function leerMensajeDelAparato(texto: string): MensajeDelAparato | null {
  if (texto.length > TOPE_DE_MENSAJE_BYTES) return null;
  const v = analizar(texto);
  if (conClaves(v, ['t', 'v', 'llave'])) {
    if (v.t !== 'hola' || !esEntero(v.v) || typeof v.llave !== 'string') return null;
    if (v.llave.length === 0 || v.llave.length > 64) return null;
    return { t: 'hola', v: v.v, llave: v.llave };
  }
  if (conClaves(v, ['t', 'n', 'x', 'z', 'r', 'm'])) {
    if (v.t !== 'aqui' || !esEntero(v.n) || v.n < 1) return null;
    if (!esCoordenada(v.x) || !esCoordenada(v.z) || !esRumbo(v.r) || !esMarcha(v.m)) return null;
    return { t: 'aqui', n: v.n, x: v.x, z: v.z, r: v.r, m: v.m };
  }
  return null;
}

/** Lo que manda el servidor, leído por el aparato. `null` si no es un mensaje conocido. */
export function leerMensajeDelServidor(texto: string): MensajeDelServidor | null {
  const v = analizar(texto);
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null;
  const m = v as Record<string, unknown>;
  if (m.t === 'dentro') {
    if (typeof m.yo !== 'string' || !esCoordenada(m.x) || !esCoordenada(m.z) || !esRumbo(m.r) || !esEntero(m.hz)) return null;
    return { t: 'dentro', yo: m.yo, x: m.x, z: m.z, r: m.r, hz: m.hz };
  }
  if (m.t === 'foto') {
    if (!esEntero(m.k) || !Array.isArray(m.p)) return null;
    const p: [string, number, number, number, number][] = [];
    for (const e of m.p as unknown[]) {
      if (!Array.isArray(e) || e.length !== 5) return null;
      const [a, x, z, r, mm] = e as unknown[];
      if (typeof a !== 'string' || !esCoordenada(x) || !esCoordenada(z) || !esRumbo(r) || !esMarcha(mm)) return null;
      p.push([a, x, z, r, mm]);
    }
    return { t: 'foto', k: m.k, p };
  }
  if (m.t === 'corrige') {
    if (!esEntero(m.n) || !esCoordenada(m.x) || !esCoordenada(m.z)) return null;
    return { t: 'corrige', n: m.n, x: m.x, z: m.z };
  }
  if (m.t === 'fuera') {
    if (typeof m.motivo !== 'string') return null;
    return { t: 'fuera', motivo: m.motivo };
  }
  return null;
}
