/**
 * EL CONTRATO DEL CLIENTE DE EL QUIEBRO CON SUS ANFITRIONES: el puerto de mesa y el puente.
 *
 * ═══ POR QUÉ UN PUERTO Y NO `LaMesa` ═══
 *
 * El juego se pinta con el motor del navegador en tres sitios: el escritorio (`/sala`), la app (un
 * WebView apaisado que carga el documento suelto `quiebro.html`) y `/jugar` en el iPhone (un `iframe`
 * al mismo documento). En el escritorio hay una `LaMesa` de `escritorio/src/mesa.ts` que sondea y
 * mueve; en la app y en `/jugar` la mesa la lleva el ANFITRIÓN —la pantalla nativa o la web que abre
 * el documento—, y al documento sólo le llega lo que el anfitrión le pasa por el puente. `Quiebro.tsx`
 * no puede saber de cuál de los tres le viene la mesa: recibe un `PuertoDeMesa` y ya. Tres adaptadores
 * pequeños (el pintor del escritorio, `documento.tsx` y, en pruebas, un puerto que abre su propia mesa)
 * y un solo juego.
 *
 * ═══ EL PUENTE: TEXTO, VERSIÓN Y NADA EN LA URL ═══
 *
 * Entre el anfitrión y el documento van mensajes `postMessage` con `t` (qué es) y `v`
 * (`VERSION_DEL_PUENTE`). Siempre TEXTO JSON, también en el `iframe` que admitiría objetos: el WebView
 * de React Native sólo pasa cadenas (`window.ReactNativeWebView.postMessage`), y una sola forma de
 * mensaje es un solo lector que probar. Y se leen con lectores estrictos, como el cable de la Liza: un
 * documento que acepta «lo que se parezca» a un mensaje es un documento que cualquier página que lo
 * enmarque puede mover.
 *
 * LA LLAVE DEL ASIENTO NUNCA VA EN LA URL del documento: las URL acaban en historiales, registros y
 * cabeceras `Referer`, y con la llave se mueve en nombre de alguien. Viaja dentro del mensaje `mesa`, y
 * el documento sólo lo cree si llega de SU anfitrión.
 *
 * ═══ DE DÓNDE SE ACEPTA UN MENSAJE: NUNCA DE LO QUE DICE EL PROPIO MENSAJE ═══
 *
 * La tentación es comparar `event.origin` con el `servidor` que trae el mensaje `mesa`. Es un círculo:
 * cualquier página que enmarque el documento manda un `mesa` con SU origen como `servidor`, la
 * comparación da verdadero y el documento se pone a jugar —y a mandar la llave— contra quien ella
 * diga. La referencia tiene que venir de algo que el mensaje no controla:
 *   · En el `iframe` (`/jugar`), el ORIGEN DEL PROPIO DOCUMENTO: en producción, `/jugar`, `/sala` y
 *     la API son el mismo servicio y el mismo origen, así que el anfitrión legítimo es del mismo origen
 *     que el documento y nadie más lo es (`vieneDelAnfitrion`). Un documento sin origen propio —el
 *     `'null'` de un `iframe` aislado o de un fichero local— no acepta nada. En desarrollo, si la app web
 *     vive en otro puerto, ese origen se FIJA AL COMPILAR el documento y se pasa aparte; nunca se lee
 *     de un mensaje, de la URL ni del almacén.
 *   · En el WebView de la app, los mensajes no llegan por `message` de otra ventana: los mete la app con
 *     `injectJavaScript`, llamando a la función que el documento deja para ello, y el documento no
 *     enmarca nada ajeno. Ahí no hay origen que comparar, y no hace falta.
 * El `servidor` del mensaje es sólo DÓNDE está la API (el anfitrión ya es de fiar cuando se lee).
 *
 * ═══ SIN REACT NI DOM ═══
 *
 * Este fichero son tipos, constantes y funciones puras: lo importan el documento, el pintor del
 * escritorio y `verify:liza-protocolo`, que lo prueba en Node.
 */
import type { Opcion } from '../../../shared/arcade';
import type { MovimientoDeclarado } from '../../../shared/mecanicas/tablero-declarado';

/* ─── EL PUERTO ──────────────────────────────────────────────────────────── */

/**
 * Cómo acabó un movimiento: los mismos tres que `ResultadoDelMovimiento` de `escritorio/src/mesa.ts`
 * (el pintor del escritorio adapta `LaMesa`, y no puede decir más de lo que ella sabe). `'rechazado'`:
 * el servidor dijo que no —un 409 por revisión vieja incluido— o la mesa quedó igual.
 */
export type ResultadoDelMovimiento = 'hecho' | 'rechazado' | 'sin-red';

/**
 * LO QUE DEVUELVE `mover`: cómo acabó y, si el juego lo dio, por qué no entró (vacío si no hay motivo).
 *
 * La arquitectura lo escribía `Promise<void>`. Devuelve el resultado porque el juego lo necesita en la
 * pausa, donde cada asiento tiene UN movimiento y el diseño pide reintentarlo sólo si no entró por una
 * revisión vieja (un 409). Como `'rechazado'` junta el 409 con el «no» del juego, quien decide es LA
 * VISTA: tras un `'rechazado'` o un `'sin-red'`, el juego espera a la vista siguiente y reintenta sólo si
 * su asiento sigue sin `haElegido` en la MISMA pausa (con un tope de intentos); si ya consta, lo da por
 * hecho. Así un «ya elegiste» no se reintenta en bucle y un 409 no se pierde.
 */
export interface SalidaDelMovimiento {
  readonly resultado: ResultadoDelMovimiento;
  readonly motivo: string;
}

/**
 * LO QUE EL JUEGO NECESITA DE LA MESA, venga de donde venga.
 *
 * Los campos son la foto de AHORA: se leen cuando hacen falta y, tras cada aviso de `suscribir`, se
 * vuelven a leer. Quien lo implementa los expone con `get` o con un objeto que cambia; quien lo usa no
 * se guarda copias.
 */
export interface PuertoDeMesa {
  /** El código de la mesa. */
  readonly codigo: string;
  /** Mi asiento (`AsientoId`), o `null` si miro sin asiento. */
  readonly yo: string | null;
  /** La llave de mi asiento, para el `hola` del canal de la Liza; `null` sin asiento. */
  readonly llave: string | null;
  /** El origen de la API (`https://…`, sin ruta), o `''` si es el mismo origen que el documento. */
  readonly servidor: string;
  /** La última vista pública de la mesa. Se lee con `leerVistaDelQuiebro`. */
  readonly vista: unknown;
  /** Lo que la mesa me ofrece ahora (`opciones()` del juego). */
  readonly opciones: readonly Opcion[];
  /** La revisión de la mesa de esa vista. */
  readonly rev: number;
  /** Mueve en nombre de mi asiento. Los movimientos sin carga van con `carga: null`. */
  mover(movimiento: MovimientoDeclarado): Promise<SalidaDelMovimiento>;
  /** Avísame cuando cambien la vista o las opciones. Devuelve cómo dejar de avisarme. */
  suscribir(avisar: () => void): () => void;
}

/* ─── EL PUENTE ──────────────────────────────────────────────────────────── */

/** La versión del puente. Se sube si cambia la forma de un mensaje. */
export const VERSION_DEL_PUENTE = 1;

/** El tope de un mensaje del puente, en letras: una vista con su tablero cabe de sobra. */
export const TOPE_DEL_PUENTE = 1048576;

/** ANFITRIÓN → DOCUMENTO: la mesa, entera, en cada cambio. */
export interface MesaParaElDocumento {
  readonly t: 'mesa';
  readonly v: number;
  readonly codigo: string;
  readonly yo: string | null;
  readonly llave: string | null;
  readonly servidor: string;
  readonly vista: unknown;
  readonly opciones: readonly Opcion[];
  readonly rev: number;
}

/** ANFITRIÓN → DOCUMENTO: cómo acabó el `mover` de número `id`. */
export interface Movido {
  readonly t: 'movido';
  readonly v: number;
  readonly id: number;
  readonly resultado: ResultadoDelMovimiento;
  readonly motivo: string;
}

export type MensajeDelAnfitrion = MesaParaElDocumento | Movido;

/** DOCUMENTO → ANFITRIÓN: ya he cargado; mándame la mesa. */
export interface Listo {
  readonly t: 'listo';
  readonly v: number;
}

/**
 * DOCUMENTO → ANFITRIÓN: mueve esto en mi nombre. `id` (entero ≥ 1, creciente) es el que vuelve en el
 * `movido`. Nunca un tipo `arcade:`: ésos son de la plataforma y el lector los tira.
 */
export interface Mover {
  readonly t: 'mover';
  readonly v: number;
  readonly id: number;
  readonly movimiento: MovimientoDeclarado;
}

/** DOCUMENTO → ANFITRIÓN: la persona quiere salir del juego (cerrar el WebView o el `iframe`). */
export interface Salir {
  readonly t: 'salir';
  readonly v: number;
}

/**
 * DOCUMENTO → ANFITRIÓN: lo que midió el gobernador de calidad. `nivel` 0-3 (N0-N3); `calidad` lo que
 * se informa hacia fuera: `sobria` en N0, `plena` en N1-N3. El anfitrión lo guarda como veredicto del
 * aparato, igual que el escritorio guarda el suyo.
 */
export interface Medida {
  readonly t: 'medida';
  readonly v: number;
  readonly calidad: 'sobria' | 'plena';
  readonly nivel: number;
}

export type MensajeDelDocumento = Listo | Mover | Salir | Medida;

/* ─── LOS LECTORES ESTRICTOS ─────────────────────────────────────────────── */

function conClaves(v: unknown, claves: readonly string[]): v is Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const suyas = Object.keys(v);
  if (suyas.length !== claves.length) return false;
  for (const c of claves) if (!Object.prototype.hasOwnProperty.call(v, c)) return false;
  return true;
}

function entero(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

function cadenaONulo(v: unknown, tope: number): v is string | null {
  return v === null || (typeof v === 'string' && v.length >= 1 && v.length <= tope);
}

/** Lo que cruza el puente: texto JSON y no más largo que el tope. `undefined` si no. */
function analizar(dato: unknown): unknown {
  if (typeof dato !== 'string' || dato.length > TOPE_DEL_PUENTE) return undefined;
  try {
    return JSON.parse(dato) as unknown;
  } catch {
    return undefined;
  }
}

/** Un origen `http(s)://anfitrión[:puerto]`, sin ruta ni barra final. `'null'` no lo es. */
function esOrigen(v: unknown): v is string {
  return typeof v === 'string' && /^https?:\/\/[A-Za-z0-9.-]+(:\d{1,5})?$/.test(v);
}

/** `''` (la API está en el mismo origen que el documento) o un origen. */
function esServidor(v: unknown): v is string {
  return v === '' || esOrigen(v);
}

function esResultado(v: unknown): v is ResultadoDelMovimiento {
  return v === 'hecho' || v === 'rechazado' || v === 'sin-red';
}

/** Una opción de la mesa, con exactamente las claves de `Opcion` (y `declaracion: true` si la trae). */
function leerOpcion(v: unknown): Opcion | null {
  const conMarca = typeof v === 'object' && v !== null && Object.prototype.hasOwnProperty.call(v, 'declaracion');
  const claves = conMarca ? ['id', 'tipo', 'carga', 'rotulo', 'ayuda', 'declaracion'] : ['id', 'tipo', 'carga', 'rotulo', 'ayuda'];
  if (!conClaves(v, claves)) return null;
  if (typeof v.id !== 'string' || typeof v.tipo !== 'string' || typeof v.rotulo !== 'string' || typeof v.ayuda !== 'string') return null;
  if (conMarca) {
    if (v.declaracion !== true) return null;
    return { id: v.id, tipo: v.tipo, carga: v.carga, rotulo: v.rotulo, ayuda: v.ayuda, declaracion: true };
  }
  return { id: v.id, tipo: v.tipo, carga: v.carga, rotulo: v.rotulo, ayuda: v.ayuda };
}

/**
 * LO QUE MANDA EL ANFITRIÓN, leído por el documento. `null` ante cualquier cosa que no sea exactamente
 * uno de sus mensajes en esta versión. Comprobar DE DÓNDE llega (`vieneDelAnfitrion`) es aparte, va
 * ANTES y no usa nada de lo que el mensaje diga: esto sólo dice si la forma es la del contrato.
 */
export function leerMensajeDelAnfitrion(dato: unknown): MensajeDelAnfitrion | null {
  const v = analizar(dato);
  if (conClaves(v, ['t', 'v', 'codigo', 'yo', 'llave', 'servidor', 'vista', 'opciones', 'rev'])) {
    if (v.t !== 'mesa' || v.v !== VERSION_DEL_PUENTE) return null;
    if (typeof v.codigo !== 'string' || v.codigo.length < 1 || v.codigo.length > 32) return null;
    if (!cadenaONulo(v.yo, 64) || !cadenaONulo(v.llave, 64) || !esServidor(v.servidor)) return null;
    /* Sin asiento no hay llave, y con asiento sí: una llave sin asiento es de otro. */
    if ((v.yo === null) !== (v.llave === null)) return null;
    if (!entero(v.rev, 0, Number.MAX_SAFE_INTEGER) || !Array.isArray(v.opciones)) return null;
    if (!Object.prototype.hasOwnProperty.call(v, 'vista') || v.vista === undefined) return null;
    const opciones: Opcion[] = [];
    for (const o of v.opciones as unknown[]) {
      const leida = leerOpcion(o);
      if (leida === null) return null;
      opciones.push(leida);
    }
    return {
      t: 'mesa',
      v: v.v,
      codigo: v.codigo,
      yo: v.yo,
      llave: v.llave,
      servidor: v.servidor,
      vista: v.vista,
      opciones,
      rev: v.rev,
    };
  }
  if (conClaves(v, ['t', 'v', 'id', 'resultado', 'motivo'])) {
    if (v.t !== 'movido' || v.v !== VERSION_DEL_PUENTE || !entero(v.id, 1, Number.MAX_SAFE_INTEGER)) return null;
    if (!esResultado(v.resultado) || typeof v.motivo !== 'string' || v.motivo.length > 500) return null;
    return { t: 'movido', v: v.v, id: v.id, resultado: v.resultado, motivo: v.motivo };
  }
  return null;
}

/** LO QUE MANDA EL DOCUMENTO, leído por el anfitrión. `null` ante cualquier otra cosa. */
export function leerMensajeDelDocumento(dato: unknown): MensajeDelDocumento | null {
  const v = analizar(dato);
  if (conClaves(v, ['t', 'v'])) {
    if (v.v !== VERSION_DEL_PUENTE) return null;
    if (v.t === 'listo') return { t: 'listo', v: v.v };
    if (v.t === 'salir') return { t: 'salir', v: v.v };
    return null;
  }
  if (conClaves(v, ['t', 'v', 'id', 'movimiento'])) {
    if (v.t !== 'mover' || v.v !== VERSION_DEL_PUENTE || !entero(v.id, 1, Number.MAX_SAFE_INTEGER)) return null;
    const m = v.movimiento;
    if (!conClaves(m, ['tipo', 'carga'])) return null;
    if (typeof m.tipo !== 'string' || m.tipo.length < 1 || m.tipo.length > 64 || m.tipo.startsWith('arcade:')) return null;
    if (m.carga === undefined) return null;
    return { t: 'mover', v: v.v, id: v.id, movimiento: { tipo: m.tipo, carga: m.carga } };
  }
  if (conClaves(v, ['t', 'v', 'calidad', 'nivel'])) {
    if (v.t !== 'medida' || v.v !== VERSION_DEL_PUENTE) return null;
    if ((v.calidad !== 'sobria' && v.calidad !== 'plena') || !entero(v.nivel, 0, 3)) return null;
    /* Hacia fuera, N0 es sobria y N1-N3 plena: un mensaje que dice otra cosa se contradice. */
    if ((v.nivel === 0) !== (v.calidad === 'sobria')) return null;
    return { t: 'medida', v: v.v, calidad: v.calidad, nivel: v.nivel };
  }
  return null;
}

/* ─── LOS ESCRITORES ─────────────────────────────────────────────────────── */

/** Un mensaje del anfitrión, como texto para `postMessage`. Con exactamente sus claves. */
export function textoDelAnfitrion(m: MensajeDelAnfitrion): string {
  if (m.t === 'mesa') {
    return JSON.stringify({
      t: m.t,
      v: m.v,
      codigo: m.codigo,
      yo: m.yo,
      llave: m.llave,
      servidor: m.servidor,
      vista: m.vista,
      opciones: m.opciones,
      rev: m.rev,
    });
  }
  return JSON.stringify({ t: m.t, v: m.v, id: m.id, resultado: m.resultado, motivo: m.motivo });
}

/** Un mensaje del documento, como texto para `postMessage`. Con exactamente sus claves. */
export function textoDelDocumento(m: MensajeDelDocumento): string {
  switch (m.t) {
    case 'listo':
    case 'salir':
      return JSON.stringify({ t: m.t, v: m.v });
    case 'mover':
      return JSON.stringify({ t: m.t, v: m.v, id: m.id, movimiento: { tipo: m.movimiento.tipo, carga: m.movimiento.carga } });
    case 'medida':
      return JSON.stringify({ t: m.t, v: m.v, calidad: m.calidad, nivel: m.nivel });
  }
}

/* ─── DE DÓNDE TIENE QUE LLEGAR ──────────────────────────────────────────── */

/**
 * EL ORIGEN DEL QUE EL DOCUMENTO, DENTRO DE UN `iframe`, ACEPTA MENSAJES: el suyo propio. `null` si el
 * documento no tiene un origen de verdad (`'null'`, un fichero): entonces no se acepta nada, que es
 * mejor que aceptarlo todo. Ver en la cabecera por qué no sirve el `servidor` del mensaje.
 *
 * `origenPropio` es el `location.origin` del documento; se pasa en vez de leerlo para que esto siga
 * siendo puro y se pruebe en Node.
 */
export function origenDelAnfitrion(origenPropio: string): string | null {
  return esOrigen(origenPropio) ? origenPropio : null;
}

/**
 * ¿VIENE ESTE MENSAJE DE MI ANFITRIÓN? Del mismo origen que el documento, o de uno de `fijadosAlCompilar`
 * —los que el documento trae escritos en su paquete (la app web de desarrollo en otro puerto), nunca
 * sacados de un mensaje, de la URL ni del almacén—. Compara orígenes enteros, nunca prefijos, y un
 * documento sin origen propio no acepta a nadie.
 */
export function vieneDelAnfitrion(origenDelEvento: string, origenPropio: string, fijadosAlCompilar: readonly string[]): boolean {
  const propio = origenDelAnfitrion(origenPropio);
  if (propio === null || !esOrigen(origenDelEvento)) return false;
  if (origenDelEvento === propio) return true;
  for (const o of fijadosAlCompilar) if (esOrigen(o) && o === origenDelEvento) return true;
  return false;
}
