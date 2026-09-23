/**
 * EL CANAL DE BOOTS ON BOARD, DEL LADO DEL APARATO: quien pasea cuenta dónde está, y ve a los demás.
 *
 * ═══ LO QUE ESTO COSE ═══
 *
 * El paseo común ya estaba cortado por donde lo iba a coser la red (`paseante.ts`, «la costura con
 * la red»): `alDarUnTic` sale una vez por tic con lo pedido y el sitio donde se acabó, y `corregir`
 * pone a quien pasea donde diga quien sabe más. Al otro lado no había nadie. Esto es ese nadie: un
 * WebSocket por asiento contra el servidor de la mesa, con el contrato de
 * `shared/mecanicas/canal-de-botas.ts` y sin tocar una coma de él. Ni `three` ni React: se prueba en
 * Node con un WebSocket y un reloj de mentira (`verify:canal-del-paseo`), y el gancho que lo monta en
 * una escena es aparte (`usar-el-canal.ts`).
 *
 * ═══ EL ORDEN DE UNA CONEXIÓN ═══
 *
 *  1. Se abre la dirección que da el cliente —`ws(s)://<servidor>` + `rutaDelCanal(codigo)`—, SIN
 *     la llave: la llave es una credencial y las direcciones acaban en los registros del borde.
 *  2. Lo primero que se dice es `hola`, con la llave. Nada más sale hasta que el servidor conteste
 *     `dentro`: antes de eso el servidor no sabe de quién son los tics, y los cierra por atropello.
 *  3. Con `dentro`, el paseante se pone donde dice el servidor (`corregir`). No es cortesía: el
 *     servidor VALIDA cada tramo desde su último sitio bueno, así que un aparato que se quedara
 *     donde creía estar mandaría su primer tic desde otro sitio y se lo devolverían con un `corrige`.
 *  4. A partir de ahí, un `aqui` por tic que dé el paseo, con los números de la costura tal cual.
 *
 * ═══ QUIETO, DOS AVISOS POR SEGUNDO Y NO VEINTE ═══
 *
 * Quien no se mueve no tiene nada nuevo que contar, pero tiene que seguir presente: dice dónde está
 * `AVISOS_QUIETO_POR_SEGUNDO` veces por segundo, contadas en tics —uno de cada diez— para que el
 * ritmo no dependa de un reloj que en una pestaña oculta va a otro paso. El primer tic quieto
 * después de moverse sale siempre: es el que les dice a los demás que se ha parado. Medido en el
 * comprobador: andando son 20 mensajes por segundo; parado, 2.
 *
 * ═══ UNA CORRECCIÓN VIEJA NO SE VUELVE A APLICAR ═══
 *
 * Cuando un tic no cuadra, el servidor rechaza también los que el aparato mandó detrás antes de
 * enterarse, y puede contestar a cada uno. Si cada `corrige` moviera al paseante, el tercero le
 * llegaría cuando ya ha echado a andar desde el sitio bueno y lo devolvería atrás; ese tirón es más
 * largo de lo que se anda en un tic, el servidor lo rechaza, y se entra en un ping-pong. Así que al
 * aplicar una corrección se apunta el último tic que se había mandado, y un `corrige` de un tic
 * anterior o igual ya está contestado.
 *
 * ═══ A LOS DEMÁS SE LES PINTA EN EL PASADO, Y NUNCA POR DELANTE ═══
 *
 * Llegan fotos —diez por segundo— y entre foto y foto no se sabe nada. Se pinta a cada uno
 * `RETRASO_DE_LOS_DEMAS_MS` atrás en el tiempo, que casi siempre cae entre dos fotos que ya han
 * llegado, y se interpola entre ellas. Si la última no ha llegado todavía se le deja en la última
 * que hay, quieto: extrapolar lo pintaría atravesando la pared contra la que se paró. Quien deja de
 * salir en las fotos se quita en el acto —el servidor ya le dio su gracia (`GRACIA_AL_IRSE_MS`)
 * antes de dejar de ponerlo—.
 *
 * ═══ QUÉ SE HACE CUANDO SE CORTA ═══
 *
 *  · `llaveMala`, `mesaQueNo`, `reemplazado`: NO se reconecta. Volver a llamar con la misma llave a
 *    la misma mesa daría lo mismo, y con `reemplazado` sería peor: dos aparatos con el mismo asiento
 *    echándose el uno al otro para siempre. Se deja el motivo escrito para la pantalla.
 *  · `quieto`: el servidor desaloja a quien lleva un minuto sin moverse. Reconectar en el acto sería
 *    burlar su regla con una conexión nueva cada minuto; se reconecta cuando se vuelve a MOVER, que
 *    es justo lo que la regla pide.
 *  · Todo lo demás —la red, un reinicio, un balanceador—: se reconecta con una espera que se dobla
 *    en cada intento seguido y no pasa de `TOPE_DE_ESPERA_MS`. Los intentos sólo vuelven a cero
 *    cuando una conexión ha aguantado `SE_DA_POR_ESTABLE_MS`: una que entra y se cae al instante
 *    no puede tener derecho a reconectar cada medio segundo.
 *
 * ═══ Y NADA DE AQUÍ DECIDE NADA ═══
 *
 * El aparato anda con su mundo y manda su sitio; el servidor valida contra la estructura y corrige
 * (BOOTS-ON-BOARD §7.3 A). Lo que se interpola de los demás es presentación. Por eso las cuentas de
 * esta mitad pueden ir en coma flotante: lo único entero es lo que viaja, y viaja tal cual sale de
 * `pasoDelTic`.
 */
import {
  AVISOS_QUIETO_POR_SEGUNDO,
  CIERRE,
  PLAZO_DEL_HOLA_MS,
  RETRASO_DE_LOS_DEMAS_MS,
  VERSION_DEL_CANAL,
  leerMensajeDelServidor,
} from '../../shared/mecanicas/canal-de-botas';
import type { Aqui, Corrige, Dentro, Foto, Hola } from '../../shared/mecanicas/canal-de-botas';
import { QUIETO, TICS_POR_SEGUNDO, VELOCIDAD_CORRIENDO, radianesDelRumbo } from '../../shared/mecanicas/andar';
import { aNumero } from '../../shared/mecanicas/fijo';
import type { Andante } from '../../shared/mecanicas/mundo';
import type { EntradaDelTic } from './mandos';

/* ─── Los números ────────────────────────────────────────────────────────── */

/** Cuántos tics hay entre dos avisos de quien está quieto: 20 / 2 = 10. */
export const TICS_ENTRE_AVISOS_QUIETO = TICS_POR_SEGUNDO / AVISOS_QUIETO_POR_SEGUNDO;
if (!Number.isInteger(TICS_ENTRE_AVISOS_QUIETO) || TICS_ENTRE_AVISOS_QUIETO < 1) {
  /* Si un día los avisos de quieto no dividen a los tics, el ritmo dejaría de ser el pedido sin avisar. */
  throw new Error(
    `Los avisos de quieto (${String(AVISOS_QUIETO_POR_SEGUNDO)} por segundo) no dividen a los tics (${String(TICS_POR_SEGUNDO)}).`,
  );
}

/** La primera espera antes de reconectar, en milisegundos. Se dobla en cada intento seguido. */
export const PRIMERA_ESPERA_MS = 500;

/** La espera más larga entre dos intentos: con la red caída, uno cada quince segundos basta. */
export const TOPE_DE_ESPERA_MS = 15_000;

/**
 * Cuánto se espera a que el servidor diga `dentro` desde que se pide la conexión. El servidor
 * echa a quien no dice `hola` en `PLAZO_DEL_HOLA_MS`; esto es lo mismo del otro lado, con margen:
 * una conexión que se queda colgada a medio abrir —un proxy que no pasa la subida de protocolo—
 * no puede dejar la pantalla en «Conectando…» para siempre.
 */
export const PLAZO_PARA_ENTRAR_MS = PLAZO_DEL_HOLA_MS * 2;

/** Cuánto tiene que aguantar una conexión para que los intentos vuelvan a contar desde cero. */
export const SE_DA_POR_ESTABLE_MS = 10_000;

/** Lo que se guarda de las fotos de cada uno: un segundo, que es seis veces el retraso. */
export const HISTORIA_DE_LAS_FOTOS_MS = 1000;

/**
 * UN SALTO ENTRE DOS FOTOS QUE NO SE ANDA: más de dos veces lo que da de sí correr en ese tiempo.
 * Es que el servidor ha corregido a esa persona; interpolarlo la pintaría cruzando la pared de la
 * que la sacaron, a la carrera. Se la deja en su sitio hasta la foto nueva y ahí se la pone.
 */
export const VECES_LO_QUE_SE_CORRE = 2;

/** La espera que toca tras `intentos` intentos seguidos sin entrar (el primero es el 1). */
export function esperaTras(intentos: number): number {
  const n = Math.max(1, Math.floor(intentos));
  /* `2 ** 30` ya pasa del tope: no hace falta calcular más y no se desborda nada. */
  return Math.min(TOPE_DE_ESPERA_MS, PRIMERA_ESPERA_MS * 2 ** Math.min(n - 1, 30));
}

/* ─── Lo que se inyecta ──────────────────────────────────────────────────── */

/**
 * LO JUSTO DE UN WEBSOCKET QUE USA EL CANAL. El del navegador y el de React Native lo cumplen: los
 * dos llaman a `onopen`, `onmessage`, `onclose` y `onerror`, y los dos tienen `readyState`, `send` y
 * `close(código, motivo)`. Se inyecta para poder probarlo sin red.
 */
export interface SocketDelCanal {
  readonly readyState: number;
  send(datos: string): void;
  close(codigo?: number, motivo?: string): void;
  onopen: ((suceso: unknown) => void) | null;
  onmessage: ((suceso: { readonly data: unknown }) => void) | null;
  onclose: ((suceso: { readonly code: number; readonly reason: string }) => void) | null;
  onerror: ((suceso: unknown) => void) | null;
}

/** El constructor de sockets: por defecto, el `WebSocket` que trae el entorno. */
export type FabricaDeSockets = new (url: string) => SocketDelCanal;

/** `readyState` de un socket abierto: el mismo número en el navegador y en React Native. */
const ABIERTO = 1;

/**
 * EL WEBSOCKET DEL ENTORNO, o `null` si no hay.
 *
 * El tipo del global no es el de `SocketDelCanal` —su `onmessage` pide un `MessageEvent` entero—,
 * así que se convierte aquí, una vez: lo que el canal usa de él es lo de la interfaz y nada más.
 */
function webSocketDelEntorno(): FabricaDeSockets | null {
  const global = globalThis as { WebSocket?: unknown };
  return typeof global.WebSocket === 'function' ? (global.WebSocket as FabricaDeSockets) : null;
}

/** El reloj del canal, inyectable. Milisegundos de un reloj que no retrocede. */
export interface RelojDelCanal {
  ahora(): number;
  /** Llama a `fn` dentro de `ms` milisegundos; lo que devuelve lo cancela. */
  tras(ms: number, fn: () => void): () => void;
}

/** El reloj de verdad: `performance.now()` si lo hay —no salta si alguien cambia la hora—, y los temporizadores. */
export const RELOJ_DE_VERDAD: RelojDelCanal = {
  ahora: () =>
    typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now(),
  tras: (ms, fn) => {
    const t = setTimeout(fn, ms);
    return () => clearTimeout(t);
  },
};

/* ─── Lo que se enseña ───────────────────────────────────────────────────── */

/**
 * En qué punto está el canal.
 *
 *  · `conectando`: abriendo, o esperando el `dentro`.
 *  · `dentro`: se manda y se recibe.
 *  · `reintentando`: se cortó y se vuelve a intentar solo.
 *  · `dormido`: se cortó por estar quieto; se vuelve al echar a andar.
 *  · `parado`: se cortó y no se vuelve (llave mala, mesa que no, otro aparato con el asiento).
 *  · `cerrado`: lo ha cerrado quien lo abrió.
 */
export type FaseDelCanal = 'conectando' | 'dentro' | 'reintentando' | 'dormido' | 'parado' | 'cerrado';

export interface EstadoDelCanal {
  readonly fase: FaseDelCanal;
  /** Lo que se enseña, en una línea: «Conectando…», «Dentro», «Sin conexión: …». */
  readonly texto: string;
  /** Quién soy en la mesa, según el servidor. `null` hasta el primer `dentro`. */
  readonly yo: string | null;
  /** Por qué se cortó la última vez, dicho para leerse. `null` si no se ha cortado. */
  readonly motivo: string | null;
  /** Cuántos intentos seguidos van sin una conexión que aguante. */
  readonly intentos: number;
}

/** El tope de lo que se enseña de un motivo que manda el servidor: una línea, no un párrafo. */
const TOPE_DEL_MOTIVO = 140;

/** POR QUÉ SE CORTÓ, DICHO PARA LEERSE: de un código de cierre a una frase. */
export function motivoDelCierre(codigo: number, razon: string): string {
  switch (codigo) {
    case CIERRE.sinHola:
      return 'el servidor no oyó el saludo a tiempo';
    case CIERRE.llaveMala:
      return 'la llave de este asiento no vale en esta mesa';
    case CIERRE.mesaQueNo:
      return 'esta mesa no se recorre a pie';
    case CIERRE.reemplazado:
      return 'este asiento se ha abierto en otro aparato';
    case CIERRE.quieto:
      return 'un minuto sin moverte';
    case CIERRE.atropello:
      return 'el servidor ha cortado por demasiados mensajes';
    case CIERRE.mesaCerrada:
      return 'la mesa se ha cerrado';
    default: {
      const dicho = razon.trim();
      return dicho.length > 0 ? `se ha perdido la conexión (${dicho.slice(0, TOPE_DEL_MOTIVO)})` : 'se ha perdido la conexión';
    }
  }
}

/** Los cierres después de los cuales no se vuelve a llamar. Ver la cabecera. */
export function cierreSinVuelta(codigo: number): boolean {
  return codigo === CIERRE.llaveMala || codigo === CIERRE.mesaQueNo || codigo === CIERRE.reemplazado;
}

/* ─── Los demás, como se pintan ──────────────────────────────────────────── */

/** Otro asiento, como se pinta ahora: entre dos fotos, `RETRASO_DE_LOS_DEMAS_MS` atrás. */
export interface OtroQueAnda {
  readonly asiento: string;
  /** Hacia el este, en unidades del mundo. */
  readonly x: number;
  /** Hacia el sur, en unidades del mundo. */
  readonly z: number;
  /** Hacia dónde va, en radianes, con el convenio de la casa: 0 al norte, creciendo hacia el este. */
  readonly rumbo: number;
  /** Lo que se ha movido entre las dos fotos, en unidades por segundo; negativo si fue hacia atrás. */
  readonly velocidad: number;
}

/** Una foto de un asiento, ya en unidades del mundo y con la hora del reloj del canal en que llegó. */
export interface Muestra {
  readonly t: number;
  readonly x: number;
  readonly z: number;
  readonly rumbo: number;
}

/** El giro más corto de `a` hacia `b`, en radianes. El mismo que `giroCorto` de la marioneta, sin `three`. */
function giroMasCorto(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * DÓNDE SE PINTA A ALGUIEN A LA HORA `t`, con sus fotos en orden de llegada.
 *
 * Entre dos fotos, interpolado. Antes de la primera, en la primera. Después de la última, en la
 * última y quieto: nunca por delante. Suelta para que el comprobador la mida sin montar un canal.
 */
export function poseEntreFotos(asiento: string, fotos: readonly Muestra[], t: number): OtroQueAnda | null {
  const primera = fotos[0];
  const ultima = fotos[fotos.length - 1];
  if (primera === undefined || ultima === undefined) return null;
  if (t <= primera.t) return { asiento, x: primera.x, z: primera.z, rumbo: primera.rumbo, velocidad: 0 };
  if (t >= ultima.t) return { asiento, x: ultima.x, z: ultima.z, rumbo: ultima.rumbo, velocidad: 0 };
  let i = 0;
  while (i + 1 < fotos.length && (fotos[i + 1] as Muestra).t <= t) i++;
  const a = fotos[i] as Muestra;
  const b = fotos[i + 1];
  if (b === undefined || b.t <= a.t) return { asiento, x: a.x, z: a.z, rumbo: a.rumbo, velocidad: 0 };
  const segundos = (b.t - a.t) / 1000;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const largo = Math.hypot(dx, dz);
  /* Un salto que no se anda en ese tiempo es una corrección del servidor: no se pinta el camino. */
  if (largo > aNumero(VELOCIDAD_CORRIENDO) * segundos * VECES_LO_QUE_SE_CORRE) {
    return { asiento, x: a.x, z: a.z, rumbo: a.rumbo, velocidad: 0 };
  }
  const alfa = (t - a.t) / (b.t - a.t);
  const rumbo = a.rumbo + giroMasCorto(a.rumbo, b.rumbo) * alfa;
  /* Hacia atrás es contra donde mira: `(sen r, −cos r)` es su delante, como en `poseDelPaseo`. */
  const haciaAtras = dx * Math.sin(rumbo) - dz * Math.cos(rumbo) < 0;
  const rapidez = largo / segundos;
  return {
    asiento,
    x: a.x + dx * alfa,
    z: a.z + dz * alfa,
    rumbo,
    velocidad: haciaAtras ? -rapidez : rapidez,
  };
}

/* ─── El canal ───────────────────────────────────────────────────────────── */

export interface OpcionesDelCanal {
  /** La dirección entera: `ws(s)://<servidor>` + `rutaDelCanal(codigo)`. La pone el cliente. */
  readonly url: string;
  /** La llave del asiento. Viaja en el `hola` y en ningún otro sitio. */
  readonly llave: string;
  /** La costura (b) del paseo: poner a quien pasea en un sitio, en Q16.16. */
  readonly corregir: (sitio: Andante) => void;
  /** Mi asiento, si ya se sabe: a uno mismo no se le pinta aunque salga en la foto. */
  readonly yo?: string | null;
  /** Cada vez que cambia lo que hay que enseñar. */
  readonly alCambiar?: (estado: EstadoDelCanal) => void;
  /** Cada vez que cambia QUIÉN sale en las fotos —no dónde—: para montar y desmontar figuras. */
  readonly alCambiarLosPresentes?: (asientos: readonly string[]) => void;
  /** El constructor de sockets. Por defecto, el global. */
  readonly WebSocket?: FabricaDeSockets;
  /** El reloj. Por defecto, el de verdad. */
  readonly reloj?: RelojDelCanal;
}

export interface ClienteDelCanal {
  /** La costura (a) del paseo: se le da cada tic, con lo pedido y el sitio donde se acabó. */
  alDarUnTic(entrada: EntradaDelTic, sitio: Andante): void;
  /** Dónde se pinta ahora a un asiento, o `null` si no sale en las fotos. */
  poseDe(asiento: string, ahora?: number): OtroQueAnda | null;
  /** Dónde se pinta ahora a todos los que salen en las fotos. */
  losDemas(ahora?: number): readonly OtroQueAnda[];
  /** Quién sale en las fotos, en orden. */
  presentes(): readonly string[];
  estado(): EstadoDelCanal;
  /** Cuántos mensajes del servidor se han tirado por no ser un mensaje bien formado. */
  ignorados(): number;
  /** Se acabó: se cierra el socket y no se vuelve a llamar. */
  cerrar(): void;
}

/**
 * ABRIR EL CANAL DE UNA MESA. Empieza a conectar en el acto.
 */
export function abrirElCanal(o: OpcionesDelCanal): ClienteDelCanal {
  const reloj = o.reloj ?? RELOJ_DE_VERDAD;
  const Fabrica = o.WebSocket ?? webSocketDelEntorno();

  let socket: SocketDelCanal | null = null;
  let fase: FaseDelCanal = 'conectando';
  let yo: string | null = null;
  let motivo: string | null = null;
  /* Lo que dijo el servidor en su `fuera`, para enseñarlo en vez de la frase del código. */
  let motivoDelFuera: string | null = null;
  let intentos = 0;
  let entradoEn = 0;
  let esperaProgramada = 0;
  let cancelarEspera: (() => void) | null = null;
  let cancelarPlazo: (() => void) | null = null;
  let cerrado = false;

  /* Lo mandado: para el ritmo de quieto y para saber qué `corrige` ya está contestado. */
  let ultimoTicMandado = Number.NEGATIVE_INFINITY;
  let ultimaMarchaMandada: number | null = null;
  let ultimoTicDado = 0;
  let corregidoHasta = 0;

  /* Los demás. */
  const fotos = new Map<string, Muestra[]>();
  let presentes: readonly string[] = [];
  let ultimaFoto: number | null = null;
  let empezarDeNuevo = false;
  let tirados = 0;

  const estado = (): EstadoDelCanal => ({ fase, texto: textoDe(), yo, motivo, intentos });

  function textoDe(): string {
    switch (fase) {
      case 'conectando':
        return 'Conectando…';
      case 'dentro':
        return presentes.length === 0 ? 'Dentro' : `Dentro · ${String(presentes.length)} más andando`;
      case 'reintentando':
        return `Sin conexión: ${motivo ?? 'se ha perdido la conexión'}. Se vuelve a intentar en ${String(Math.ceil(esperaProgramada / 1000))} s.`;
      case 'dormido':
        return `Sin conexión: ${motivo ?? 'un minuto sin moverte'}. Echa a andar para volver.`;
      case 'parado':
        return `Sin conexión: ${motivo ?? 'se ha perdido la conexión'}.`;
      case 'cerrado':
        return '';
    }
  }

  function avisar(): void {
    if (cerrado) return;
    o.alCambiar?.(estado());
  }

  function ponerPresentes(nuevos: readonly string[]): void {
    if (nuevos.length === presentes.length && nuevos.every((a, i) => a === presentes[i])) return;
    presentes = nuevos;
    o.alCambiarLosPresentes?.(presentes);
    /* El texto de `dentro` cuenta a los que andan. */
    if (fase === 'dentro') avisar();
  }

  function olvidarALosDemas(): void {
    fotos.clear();
    ultimaFoto = null;
    ponerPresentes([]);
  }

  function mandar(mensaje: Hola | Aqui): void {
    const s = socket;
    if (s === null || s.readyState !== ABIERTO) return;
    try {
      s.send(JSON.stringify(mensaje));
    } catch {
      /* Un envío que falla es un socket que se está cerrando: su `onclose` dirá el resto. */
    }
  }

  function cancelarTemporizadores(): void {
    cancelarEspera?.();
    cancelarEspera = null;
    cancelarPlazo?.();
    cancelarPlazo = null;
  }

  function conectar(): void {
    if (cerrado) return;
    cancelarTemporizadores();
    motivoDelFuera = null;
    fase = 'conectando';
    avisar();
    if (Fabrica === null) {
      fase = 'parado';
      motivo = 'este aparato no sabe abrir un WebSocket';
      avisar();
      return;
    }
    let s: SocketDelCanal;
    try {
      s = new Fabrica(o.url);
    } catch (e) {
      alCortarse(-1, e instanceof Error ? e.message : String(e));
      return;
    }
    socket = s;
    s.onopen = () => {
      if (socket !== s) return;
      mandar({ t: 'hola', v: VERSION_DEL_CANAL, llave: o.llave });
    };
    s.onmessage = (suceso) => {
      if (socket !== s) return;
      recibir(suceso.data);
    };
    s.onclose = (suceso) => {
      if (socket !== s) return;
      socket = null;
      alCortarse(suceso.code, suceso.reason);
    };
    /* El error siempre llega con su cierre detrás, y es el cierre el que dice qué hacer. */
    s.onerror = () => undefined;
    cancelarPlazo = reloj.tras(PLAZO_PARA_ENTRAR_MS, () => {
      cancelarPlazo = null;
      if (socket !== s || fase === 'dentro') return;
      socket = null;
      soltar(s);
      alCortarse(-1, 'el servidor no contesta');
    });
  }

  /** Cierra un socket que ya no es el nuestro, sin que su `onclose` cuente. */
  function soltar(s: SocketDelCanal): void {
    try {
      s.close(1000, 'adiós');
    } catch {
      /* Uno que no se deja cerrar es uno que ya estaba cerrado. */
    }
  }

  function recibir(datos: unknown): void {
    const m = typeof datos === 'string' ? leerMensajeDelServidor(datos) : null;
    if (m === null) {
      tirados++;
      return;
    }
    switch (m.t) {
      case 'dentro':
        entrar(m);
        return;
      case 'foto':
        if (fase === 'dentro') foto(m);
        return;
      case 'corrige':
        if (fase === 'dentro') corrige(m);
        return;
      case 'fuera':
        motivoDelFuera = m.motivo.trim().slice(0, TOPE_DEL_MOTIVO);
        return;
    }
  }

  function entrar(m: Dentro): void {
    cancelarPlazo?.();
    cancelarPlazo = null;
    yo = m.yo;
    fase = 'dentro';
    motivo = null;
    entradoEn = reloj.ahora();
    /* Lo que se mandó antes era de otra conexión: el ritmo de quieto empieza de nuevo. */
    ultimoTicMandado = Number.NEGATIVE_INFINITY;
    ultimaMarchaMandada = null;
    /* Lo que se corrigiera de antes de entrar ya lo contesta este `dentro`. */
    corregidoHasta = ultimoTicDado;
    /* Las fotos de la conexión anterior se sustituyen por las de ésta en cuanto llegue la primera. */
    ultimaFoto = null;
    empezarDeNuevo = true;
    o.corregir({ x: m.x, z: m.z });
    avisar();
  }

  function foto(m: Foto): void {
    /* Una foto que no es posterior a la última es un eco: no dice nada nuevo. */
    if (ultimaFoto !== null && m.k <= ultimaFoto) return;
    ultimaFoto = m.k;
    const t = reloj.ahora();
    const vistos: string[] = [];
    for (const entrada of m.p) {
      const asiento = entrada[0];
      if (asiento === yo || asiento === o.yo) continue;
      if (vistos.indexOf(asiento) < 0) vistos.push(asiento);
      let suyas = fotos.get(asiento);
      if (suyas === undefined || empezarDeNuevo) {
        suyas = [];
        fotos.set(asiento, suyas);
      }
      suyas.push({ t, x: aNumero(entrada[1]), z: aNumero(entrada[2]), rumbo: radianesDelRumbo(entrada[3]) });
      /* Se queda siempre la última anterior al corte: es la que sujeta la interpolación por detrás. */
      while (suyas.length > 2 && (suyas[1] as Muestra).t <= t - HISTORIA_DE_LAS_FOTOS_MS) suyas.shift();
    }
    empezarDeNuevo = false;
    for (const asiento of [...fotos.keys()]) {
      if (vistos.indexOf(asiento) < 0) fotos.delete(asiento);
    }
    ponerPresentes([...fotos.keys()].sort());
  }

  function corrige(m: Corrige): void {
    if (m.n <= corregidoHasta) return;
    corregidoHasta = Math.max(ultimoTicMandado, m.n);
    o.corregir({ x: m.x, z: m.z });
  }

  function alCortarse(codigo: number, razon: string): void {
    cancelarTemporizadores();
    if (cerrado) return;
    const estuvoDentro = fase === 'dentro';
    motivo = motivoDelFuera ?? motivoDelCierre(codigo, razon);
    motivoDelFuera = null;
    if (cierreSinVuelta(codigo)) {
      fase = 'parado';
      olvidarALosDemas();
      avisar();
      return;
    }
    if (codigo === CIERRE.quieto) {
      fase = 'dormido';
      avisar();
      return;
    }
    /* Una conexión que aguantó le devuelve la primera espera; una que se cae al entrar, no. */
    if (estuvoDentro && reloj.ahora() - entradoEn >= SE_DA_POR_ESTABLE_MS) intentos = 0;
    intentos++;
    esperaProgramada = esperaTras(intentos);
    fase = 'reintentando';
    cancelarEspera = reloj.tras(esperaProgramada, () => {
      cancelarEspera = null;
      conectar();
    });
    avisar();
  }

  const cliente: ClienteDelCanal = {
    alDarUnTic(entrada, sitio) {
      ultimoTicDado = entrada.tic;
      if (fase === 'dormido') {
        /* Se desalojó por estar quieto: se vuelve al echar a andar, y no antes. */
        if (entrada.marcha !== QUIETO) conectar();
        return;
      }
      if (fase !== 'dentro') return;
      const quieto = entrada.marcha === QUIETO;
      if (quieto && ultimaMarchaMandada === QUIETO && entrada.tic - ultimoTicMandado < TICS_ENTRE_AVISOS_QUIETO) return;
      /* `r` es hacia dónde MIRA, no hacia dónde se da el paso: ver `EntradaDelTic.mira`. */
      mandar({ t: 'aqui', n: entrada.tic, x: sitio.x, z: sitio.z, r: entrada.mira, m: entrada.marcha });
      ultimoTicMandado = entrada.tic;
      ultimaMarchaMandada = entrada.marcha;
    },
    poseDe(asiento, ahora = reloj.ahora()) {
      const suyas = fotos.get(asiento);
      if (suyas === undefined) return null;
      return poseEntreFotos(asiento, suyas, ahora - RETRASO_DE_LOS_DEMAS_MS);
    },
    losDemas(ahora = reloj.ahora()) {
      const salida: OtroQueAnda[] = [];
      for (const asiento of presentes) {
        const p = cliente.poseDe(asiento, ahora);
        if (p !== null) salida.push(p);
      }
      return salida;
    },
    presentes: () => presentes,
    estado,
    ignorados: () => tirados,
    cerrar() {
      if (cerrado) return;
      cancelarTemporizadores();
      const s = socket;
      socket = null;
      fase = 'cerrado';
      olvidarALosDemas();
      cerrado = true;
      if (s !== null) soltar(s);
    },
  };

  conectar();
  return cliente;
}
