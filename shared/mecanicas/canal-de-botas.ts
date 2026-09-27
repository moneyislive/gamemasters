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

import { TALLA_A_PIE } from './talla';

/** La versión del protocolo. Se sube si cambia la forma de un mensaje. */
export const VERSION_DEL_CANAL = 1;

/** La ruta del canal de una mesa. Bajo `/api` para que los Vite de desarrollo lo pasen al servidor. */
export function rutaDelCanal(codigo: string): string {
  return `/api/arcade/mesas/${encodeURIComponent(codigo)}/botas`;
}

/**
 * Cuánto tiene el aparato para decir `hola` tras abrir, en milisegundos.
 *
 * Bajó de 5000 a 3000 con las cuotas de conexión (`server/src/botas/cuotas.ts`): cuando la subida
 * ya está hecha, el `hola` es UN solo marco que el aparato manda en su `onopen`, así que 3 s siguen
 * sobrando de largo. A cambio, un canal que abre y no saluda —lo que hace una inundación— ocupa su
 * hueco la mitad de tiempo, y así el tope de «canales sin saludar» se libera antes para las
 * reconexiones de verdad. El aparato lo lee para su propio plazo de entrada
 * (`PLAZO_PARA_ENTRAR_MS = PLAZO_DEL_HOLA_MS * 2`, en `escenas/paseo/canal-de-botas.ts`).
 */
export const PLAZO_DEL_HOLA_MS = 3000;

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

/**
 * Cuánto sigue abierta la sala de una mesa cuando se va el ÚLTIMO que tenía canal: por si vuelve
 * (una red que parpadea). El asiento de quien se va no se borra nunca de una sala abierta: se queda
 * de pie donde estaba, en la foto, y se le puede golpear —nadie es inmune por irse—.
 */
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
  /**
   * Dijo `hola` en otra versión del canal. Volver a llamar con el mismo aparato da lo mismo: lo que
   * hay que hacer es actualizarlo. Hasta que tuvo código propio salía como `sinHola`, y un aparato
   * viejo no distinguía «no me oyeron» —que se arregla reintentando— de «ya no me entienden».
   */
  versionVieja: 4007,
  /**
   * Su conexión no daba abasto: había que mandarle algo que NO SE PUEDE PERDER —`dentro`, `vidas`,
   * `da`, `cae`, `renace`— y ya esperaban a salir más bytes de los que caben. Saltárselo le dejaría
   * contando mal las vidas de todos, así que se cierra: al volver a entrar, `dentro` y `vidas` le
   * ponen al día. Reintentar SÍ lo arregla. Lo que se puede perder —una foto, un `corrige`, un
   * `lanza`— se salta y no cierra nada.
   */
  atascado: 4008,
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
 * Dónde estoy, en el tic `n` de mi cuenta (crece siempre, aunque no de uno en uno: quieto se
 * avisa cada varios tics, y tras reconectar se sigue contando). `x` y `z` en Q16.16, `m` la marcha
 * (0 quieto, 1 andando, 2 corriendo).
 *
 * `r` es HACIA DÓNDE MIRA, de 0 a 255 —no hacia dónde da el paso—. Andando hacia atrás el paso
 * lleva media vuelta de más que la mirada, y con el paso los demás verían a quien retrocede darse
 * la vuelta y andar de frente. El servidor no lo usa para validar (valida sitios); lo reparte en
 * la foto para pintar. El golpe no lo toma de aquí: lleva su propio `r` (ver `Golpe`).
 */
export interface Aqui {
  readonly t: 'aqui';
  readonly n: number;
  readonly x: number;
  readonly z: number;
  readonly r: number;
  readonly m: 0 | 1 | 2;
}

export type MensajeDelAparato = Hola | Aqui | Golpe;

/* ─── LO QUE DICE EL SERVIDOR ────────────────────────────────────────────── */

/**
 * Ya estás dentro: quién eres en esta mesa, dónde apareces y hacia dónde miras (`r`, 0-255), y
 * `hz`, los tics por segundo con los que cuenta el servidor (`TICS_POR_SEGUNDO`).
 */
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
 * entrada es `[asiento, x, z, mira, marcha]`, con `x` y `z` en Q16.16 y `mira` hacia dónde mira
 * (ver `Aqui.r`); un asiento sale una vez como mucho. Se serializa UNA vez por mesa y tic y se
 * manda la misma cadena a todos: por eso no lleva nada de nadie en particular.
 *
 * Salen TODOS los sentados a la mesa, hayan bajado o no: quien no tiene canal —porque nunca lo
 * abrió, o porque lo cerró— sale quieto (marcha 0) donde nació o donde se quedó, y se le puede
 * golpear como a cualquiera. En una mesa `botas` nadie es inmune por no bajar al tablero.
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

export type MensajeDelServidor = Dentro | Foto | Corrige | Fuera | Lanza | Da | Cae | Renace | Vidas | Brotes | Recoge;

/* ─── LA REFRIEGA ────────────────────────────────────────────────────────── */

/*
 * ═══ EL COMBATE, EN UNA PANTALLA ═══
 *
 * Una arena LENTA, como decidió Miguel el 20-sep (se acepta una ventaja del que asoma de
 * 150-250 ms): cada uno tiene `VIDA_ENTERA` golpes; se golpea LANZANDO algo a corta distancia
 * —el clip `lanzar` de los aventureros; el paquete gratuito no trae otro ataque—, hacia donde se
 * mira, con `RECARGA_DEL_GOLPE_MS` entre golpe y golpe; quien se queda sin vida CAE
 * `CAIDO_MS`, y renace en un sitio de nacer —el suyo si queda lejos de quien lo tumbó; la regla
 * entera está en el servidor— con la vida entera e intocable `INTOCABLE_MS`.
 *
 * EL APARATO SÓLO DICE «GOLPEO» (`golpe`), con su tic y hacia dónde mira. Si alcanza a alguien
 * lo decide el servidor, sobre los sitios que ACEPTÓ, rebobinando al otro como mucho
 * `REBOBINADO_MAXIMO_MS` para verlo donde lo veía quien golpeó. Y quien cae le da BOTÍN a quien
 * lo tumbó: eso tampoco viaja por aquí, lo mete el servidor en la mesa como `arcade:botin`, y lo
 * que se roba no sale de la mesa (decisión de Miguel del 20-sep; ver docs/COMBATE-Y-BOTIN.md §0).
 * Una misma pareja cobra una vez cada `BOTIN_CADA_PAREJA_MS`, y la mesa tiene además un tope por
 * minuto: los dos son del servidor, y al aparato no le hace falta saberlos.
 *
 * Lo que el aparato sí tiene que saber para pintar: `caído` dura `CAIDO_MS` y acaba con un
 * `renace`; `intocable` dura `INTOCABLE_MS` desde ese `renace` y acaba SIN mensaje —se cuenta con
 * el reloj—. El servidor no hace ninguna otra transición de estado, y por eso ésta basta.
 */

/** Cuántos golpes aguanta cada uno. */
export const VIDA_ENTERA = 3;

/**
 * Hasta dónde llega un golpe, en unidades del mundo: poco más que un brazo y lo que se lanza.
 *
 * Eran 2,5 con un cuerpo de 2,543; desde que quien anda mide la mitad (`TALLA_A_PIE`, `talla.ts`)
 * es la mitad, 1,25: con 2,5 un puñetazo alcanzaba a dos cuerpos de distancia. Lo arbitra el
 * servidor, así que un aparato viejo que pinta cuerpos grandes pega con el alcance nuevo igual.
 */
export const ALCANCE_DEL_GOLPE = 2.5 * TALLA_A_PIE;

/**
 * El ancho del golpe: medio cono de 45 grados a cada lado de la mirada. Se da como el CUADRADO
 * de su coseno —0,5— porque así el servidor lo compara sin raíces: `(d·m)² ≥ 0,5·|d|²·|m|²` con
 * `d·m ≥ 0`.
 */
export const COSENO_CUADRADO_DEL_CONO = 0.5;

/** Entre golpe y golpe de la misma persona, como poco. */
export const RECARGA_DEL_GOLPE_MS = 800;

/** Lo que se está en el suelo tras caer: ni se anda ni se golpea. */
export const CAIDO_MS = 5000;

/** Lo que se es intocable al renacer: nadie te recibe con un golpe en el sitio de nacer. */
export const INTOCABLE_MS = 2000;

/** Lo más que el servidor rebobina a los demás para ver lo que veía quien golpeó. */
export const REBOBINADO_MAXIMO_MS = 250;

/** Una misma pareja no da botín más de una vez en este tiempo: tumbar al mismo en bucle no renta. */
export const BOTIN_CADA_PAREJA_MS = 60_000;

/** Cómo está alguien. */
export const DE_PIE = 0;
export const CAIDO = 1;
export const INTOCABLE = 2;
export type EstadoEnLaRefriega = typeof DE_PIE | typeof CAIDO | typeof INTOCABLE;

/** «Golpeo», en mi tic `n`, hacia `r` (hacia dónde miro, 0-255). Nada más: si da, lo dice el servidor. */
export interface Golpe {
  readonly t: 'golpe';
  readonly n: number;
  readonly r: number;
}

/** `de` lanzó un golpe (le haya dado a alguien o no): para que todos vean el gesto. */
export interface Lanza {
  readonly t: 'lanza';
  readonly de: string;
}

/** El golpe de `de` le dio a `a`, que se queda con `vida`. Con 0, detrás llega su `cae`. */
export interface Da {
  readonly t: 'da';
  readonly de: string;
  readonly a: string;
  readonly vida: number;
}

/** `a` cae, tumbado por `por`. Se queda en el suelo `CAIDO_MS`. */
export interface Cae {
  readonly t: 'cae';
  readonly a: string;
  readonly por: string;
}

/** `a` renace en `(x, z)` mirando a `r`, con la vida entera e intocable `INTOCABLE_MS`. */
export interface Renace {
  readonly t: 'renace';
  readonly a: string;
  readonly x: number;
  readonly z: number;
  readonly r: number;
}

/**
 * Cómo está cada uno al entrar: `[asiento, vida, estado]`, de TODOS los sentados, bajen o no.
 * Llega una vez, justo después de `dentro`; a partir de ahí se sigue por `da`, `cae` y `renace`,
 * que por un WebSocket llegan todos y en orden —y si al servidor no le caben en el canal, lo
 * cierra con `atascado` en vez de saltárselos—. Quien reconecta recibe otro.
 */
export interface Vidas {
  readonly t: 'vidas';
  readonly v: readonly (readonly [string, number, number])[];
}

/* ─── LOS HALLAZGOS (docs/AVATARES-JUGABLES.md §2) ──────────────────────── */

/*
 * Lo que brota por el tablero y se recoge a pie. NO hay mensaje del aparato: el servidor recoge
 * por él cuando acepta un sitio a `RADIO_DE_RECOGER` de un brote (`shared/mecanicas/hallazgos.ts`).
 * Los dos mensajes son nuevos y la versión del canal NO sube: un aparato anterior los lee como
 * `null` y los tira, que es justo lo que debe hacer quien no sabe pintarlos.
 */

/**
 * Lo que hay brotado ahora en la mesa, ENTERO: `[id, clase, x, z]` con `x` y `z` en Q16.16. Llega
 * al entrar y cada vez que cambia; el aparato sustituye su lista por ésta.
 */
export interface Brotes {
  readonly t: 'brotes';
  readonly b: readonly (readonly [number, string, number, number])[];
}

/** `por` recogió el brote `h`, que era de la clase `clase`. Detrás llega el `brotes` nuevo. */
export interface Recoge {
  readonly t: 'recoge';
  readonly h: number;
  readonly por: string;
  readonly clase: string;
}

/** Lo más larga que puede ser una clase de hallazgo: las de las tablas son palabras cortas. */
const TOPE_DE_CLASE = 24;

function esClase(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= TOPE_DE_CLASE;
}

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
  if (conClaves(v, ['t', 'n', 'r'])) {
    if (v.t !== 'golpe' || !esEntero(v.n) || v.n < 1 || !esRumbo(v.r)) return null;
    return { t: 'golpe', n: v.n, r: v.r };
  }
  return null;
}

function esVida(v: unknown): v is number {
  return esEntero(v) && v >= 0 && v <= VIDA_ENTERA;
}

function esEstado(v: unknown): v is EstadoEnLaRefriega {
  return v === DE_PIE || v === CAIDO || v === INTOCABLE;
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
    const vistos: string[] = [];
    for (const e of m.p as unknown[]) {
      if (!Array.isArray(e) || e.length !== 5) return null;
      const [a, x, z, r, mm] = e as unknown[];
      if (typeof a !== 'string' || !esCoordenada(x) || !esCoordenada(z) || !esRumbo(r) || !esMarcha(mm)) return null;
      /* Un asiento dos veces en la misma foto es una foto que no dice dónde está. */
      if (vistos.indexOf(a) >= 0) return null;
      vistos.push(a);
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
  if (m.t === 'lanza') {
    if (typeof m.de !== 'string') return null;
    return { t: 'lanza', de: m.de };
  }
  if (m.t === 'da') {
    if (typeof m.de !== 'string' || typeof m.a !== 'string' || !esVida(m.vida)) return null;
    return { t: 'da', de: m.de, a: m.a, vida: m.vida };
  }
  if (m.t === 'cae') {
    if (typeof m.a !== 'string' || typeof m.por !== 'string') return null;
    return { t: 'cae', a: m.a, por: m.por };
  }
  if (m.t === 'renace') {
    if (typeof m.a !== 'string' || !esCoordenada(m.x) || !esCoordenada(m.z) || !esRumbo(m.r)) return null;
    return { t: 'renace', a: m.a, x: m.x, z: m.z, r: m.r };
  }
  if (m.t === 'vidas') {
    if (!Array.isArray(m.v)) return null;
    const lista: [string, number, EstadoEnLaRefriega][] = [];
    const vistos: string[] = [];
    for (const e of m.v as unknown[]) {
      if (!Array.isArray(e) || e.length !== 3) return null;
      const [a, vida, estado] = e as unknown[];
      if (typeof a !== 'string' || !esVida(vida) || !esEstado(estado)) return null;
      /* Como en la foto: un asiento dos veces no dice cómo está. */
      if (vistos.indexOf(a) >= 0) return null;
      vistos.push(a);
      lista.push([a, vida, estado]);
    }
    return { t: 'vidas', v: lista };
  }
  if (m.t === 'brotes') {
    if (!Array.isArray(m.b)) return null;
    const b: [number, string, number, number][] = [];
    const vistos: number[] = [];
    for (const e of m.b as unknown[]) {
      if (!Array.isArray(e) || e.length !== 4) return null;
      const [id, clase, x, z] = e as unknown[];
      if (!esEntero(id) || id < 0 || !esClase(clase) || !esCoordenada(x) || !esCoordenada(z)) return null;
      if (vistos.indexOf(id) >= 0) return null;
      vistos.push(id);
      b.push([id, clase, x, z]);
    }
    return { t: 'brotes', b };
  }
  if (m.t === 'recoge') {
    if (!esEntero(m.h) || m.h < 0 || typeof m.por !== 'string' || !esClase(m.clase)) return null;
    return { t: 'recoge', h: m.h, por: m.por, clase: m.clase };
  }
  return null;
}
