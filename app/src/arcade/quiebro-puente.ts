/**
 * EL PUENTE DE EL QUIEBRO, DEL LADO DE LA APP: lo que la app le escribe al documento de la noche y cómo
 * lee lo que el documento le contesta. Puro: sin React ni React Native, para que se pruebe en Node.
 *
 * ═══ EL CONTRATO ES OTRO FICHERO, Y ÉSTE LO SIGUE AL PIE DE LA LETRA ═══
 *
 * El puente lo define `escritorio/src/quiebro/contrato.ts`: mensajes `postMessage` de TEXTO JSON con
 * `t` y `v`, claves exactas, lectores estrictos y la llave del asiento nunca en la URL. Lo natural sería
 * importar de allí `textoDelAnfitrion` y `leerMensajeDelDocumento`. No se puede: Metro sólo resuelve lo
 * que está dentro de la app y de sus carpetas vigiladas (`shared/` y `escenas/`, en `metro.config.js`), y
 * `escritorio/` no lo está. Un `import` de VALOR desde allí pasaría `tsc` y tumbaría el paquete entero
 * de la app al empaquetar: la portada incluida, no sólo esta pantalla.
 *
 * Lo que sí se importa de allí son los TIPOS, que se borran al compilar y Metro no ve. Con ellos:
 *
 *   · `tsc` comprueba que lo que se escribe aquí tiene exactamente la forma de `MesaParaElDocumento` y
 *     `Movido`, y que lo que se lee es un `MensajeDelDocumento`;
 *   · la versión y el tope se atan con `typeof`: si el contrato sube la versión, esto deja de compilar en
 *     vez de seguir hablando la vieja con un documento que ya no la entiende.
 *
 * El lector de abajo es el del contrato renglón a renglón. Las FORMAS las vigila `tsc`; que los dos
 * lectores digan lo mismo ante lo mismo lo repite `verify:liza-protocolo` (desde el 27-sep), que les da a
 * los dos las mismas muestras buenas y envenenadas —las de `carga`, `jugable` y `fallo` incluidas—. El día
 * que el contrato viva en `shared/` —o Metro vigile `escritorio/src/quiebro/`—, esto se reduce a importar
 * el suyo.
 *
 * Aquí vive también, pura, la CARGA DE LA NOCHE tal como la ve la app (`cargaTras`, `razonProbable`): la
 * barra de la pantalla y el aviso de los tres minutos, sin plazo que tire al plano (ver
 * `AVISO_DE_TARDANZA_MS`).
 *
 * ═══ LO QUE LA APP MANDA, Y LO QUE NO SE DEJA MANDAR ═══
 *
 *   · `servidor` va VACÍO: el documento lo sirve el mismo servidor que la API (`/sala` y `/api` son el
 *     mismo servicio), así que su propio origen ya es la respuesta, y ninguna dirección que la app tenga
 *     guardada puede mandar al documento a jugar contra otro sitio.
 *   · Sin asiento no hay llave, y con asiento sí: si falta una de las dos se mandan las dos vacías. El
 *     lector del documento tira un mensaje con una sola, y con razón: una llave sin asiento es de otro.
 *   · Las opciones van con SUS claves del contrato y ninguna más: el lector del documento es estricto con
 *     las claves, y una opción que el servidor mandara con una de más dejaría la mesa entera sin leer.
 */
import type {
  EtapaDeLaCarga,
  MensajeDelDocumento,
  MesaParaElDocumento,
  Movido,
} from '../../../escritorio/src/quiebro/contrato';
import type { LaMesa, OpcionDeMesa } from './mesa';

/** La versión y el tope del puente, ATADOS al contrato: ver la cabecera. */
type VersionDelContrato = typeof import('../../../escritorio/src/quiebro/contrato').VERSION_DEL_PUENTE;
type TopeDelContrato = typeof import('../../../escritorio/src/quiebro/contrato').TOPE_DEL_PUENTE;
type TopeDeLoQueCarga = typeof import('../../../escritorio/src/quiebro/contrato').TOPE_DE_LO_QUE_CARGA;
type TopeDelFallo = typeof import('../../../escritorio/src/quiebro/contrato').TOPE_DEL_FALLO;
export const VERSION_DEL_PUENTE: VersionDelContrato = 1;
export const TOPE_DEL_PUENTE: TopeDelContrato = 1048576;
export const TOPE_DE_LO_QUE_CARGA: TopeDeLoQueCarga = 80;
export const TOPE_DEL_FALLO: TopeDelFallo = 300;

/** Las etapas de la carga, copiadas del contrato; `tsc` exige que sean exactamente las suyas (ver abajo). */
export const ETAPAS_DE_LA_CARGA = ['pagina', 'codigo', 'mesa', 'ciudad', 'personajes', 'graficos'] as const;
type EtapaDeAqui = (typeof ETAPAS_DE_LA_CARGA)[number];
/* Si el contrato añade o quita una etapa, una de estas dos líneas deja de compilar. */
const _todasLasDelContrato: readonly EtapaDeAqui[] = [] as EtapaDeLaCarga[];
const _todasLasDeAqui: readonly EtapaDeLaCarga[] = [] as EtapaDeAqui[];
void _todasLasDelContrato;
void _todasLasDeAqui;

/**
 * ═══ SIN PLAZO: A LOS TRES MINUTOS SE DICE, Y NADA MÁS ═══
 *
 * Hasta el 27-sep la app esperaba el `listo` 25 s y, si no llegaba, caía al plano del barrio. El documento
 * lo decía con su paquete entero (≈2,5 MB) ya bajado y arrancado, y en el teléfono de Miguel, con datos
 * móviles, el menú salía justo cuando la app cortaba: «aparece el menú del Quiebro pero se cierra». Ahora
 * el documento dice `listo` desde su guion de arranque, cuenta su carga (`carga`) y avisa al poder jugar
 * (`jugable`); y la app NO CORTA POR TIEMPO. Quien juega ve la barra avanzar y espera lo que haga falta. A
 * los `AVISO_DE_TARDANZA_MS` sin poder jugar la pantalla lo dice, con la razón probable, y ofrece seguir
 * esperando, reintentar o jugar sobre el plano. Caer sin preguntar queda para los fallos de verdad: la
 * página que no carga, el servidor que contesta un error, el motor del navegador que se cierra o un puente
 * de otra versión.
 */
export const AVISO_DE_TARDANZA_MS = 180_000;

/**
 * EL NOMBRE DE LA FUNCIÓN QUE EL DOCUMENTO DEJA PARA SU ANFITRIÓN NATIVO. En el WebView los mensajes de
 * la app no llegan por `message` de otra ventana: la app los mete con `injectJavaScript` llamando a esta
 * función, que el documento deja en `window` desde el guion de arranque de `escritorio/quiebro.html` (una
 * cola, hasta que el paquete monta; luego la suya, en `documento.tsx`). Si allí cambia, cambia aquí; hasta
 * entonces el documento se quedaría esperando la mesa, y la barra se pararía en «la mesa» con el aviso de
 * los tres minutos.
 */
export const DONDE_ESCUCHA = 'quiebroDelAnfitrion';

/**
 * El JavaScript que entrega un texto al documento. El texto va escrito con `JSON.stringify`, que es lo
 * que hace de una cadena cualquiera un literal de JavaScript sin nada que se pueda escapar de él; y
 * `true;` al final porque iOS lo pide.
 */
export function guionQueEntrega(texto: string): string {
  return `(function(){var f=window[${JSON.stringify(DONDE_ESCUCHA)}];if(typeof f==='function')f(${JSON.stringify(texto)});})();true;`;
}

/**
 * EL EVENTO CON QUE LA APP AVISA AL DOCUMENTO DE QUE SE VA AL FONDO (o vuelve). Lo escucha el juego
 * (`escritorio/src/quiebro/mandos/fondo.ts`, `EVENTO_DEL_FONDO`): al fondo suelta los mandos y deja de
 * mandar sus pasos, y la sala lo da por ausente a los 2 s —intocable, sin nadie que le persiga—. Hace
 * falta porque el WebView de Android no se entera solo: `react-native-webview` no hace nada en
 * `onHostPause`, sus temporizadores siguen corriendo con la app en segundo plano, y un dedo que estaba en
 * la palanca al cambiar de app seguiría empujando. Va por aquí y no por el puente de `contrato.ts`: es
 * una señal sin datos, del sistema y no de la mesa. Copiado por lo de Metro (ver la cabecera);
 * `verify:quiebro-juego` exige que los dos nombres sean el mismo.
 */
export const EVENTO_DEL_FONDO = 'quiebro:fondo';

/** El JavaScript que avisa al documento de que la app se va al fondo (`true`) o vuelve (`false`). */
export function guionDelFondo(alFondo: boolean): string {
  return `(function(){try{window.dispatchEvent(new CustomEvent(${JSON.stringify(EVENTO_DEL_FONDO)},{detail:${alFondo ? 'true' : 'false'}}));}catch(e){}})();true;`;
}

/**
 * El origen de una dirección (`https://anfitrion[:puerto]`, en minúsculas), o `null` si no es http(s).
 * A mano y no con `URL`: el `URL` de React Native no implementa `origin` en todos los motores.
 */
export function origenDe(direccion: string): string | null {
  const m = /^(https?:\/\/[^/?#]+)/i.exec(direccion.trim());
  return m === null ? null : (m[1] as string).toLowerCase();
}

/**
 * Dónde está el documento: en el ORIGEN del servidor de la app, bajo la Sala. `null` si el servidor no
 * es una dirección web, y entonces no hay documento que cargar.
 */
export function direccionDelDocumento(servidor: string): string | null {
  const origen = origenDe(servidor);
  return origen === null ? null : `${origen}/sala/quiebro.html`;
}

/** Una opción con las claves del contrato y ninguna más (ver la cabecera). */
function soloLoDelContrato(o: OpcionDeMesa): MesaParaElDocumento['opciones'][number] {
  const base = { id: o.id, tipo: o.tipo, carga: o.carga, rotulo: o.rotulo, ayuda: o.ayuda };
  return o.declaracion === true ? { ...base, declaracion: true } : base;
}

/** LA MESA PARA EL DOCUMENTO, o `null` si todavía no hay mesa. */
export function mesaParaElDocumento(mesa: Pick<LaMesa, 'mesa' | 'llave'>): MesaParaElDocumento | null {
  const puesta = mesa.mesa;
  if (puesta === null) return null;
  const llave = typeof mesa.llave === 'string' && mesa.llave.length > 0 ? mesa.llave : null;
  const conAsiento = puesta.yo !== null && llave !== null;
  return {
    t: 'mesa',
    v: VERSION_DEL_PUENTE,
    codigo: puesta.codigo,
    yo: conAsiento ? puesta.yo : null,
    llave: conAsiento ? llave : null,
    servidor: '',
    vista: puesta.vista ?? null,
    opciones: (puesta.opciones ?? []).map(soloLoDelContrato),
    rev: puesta.rev,
  };
}

/** Un mensaje de la app, como texto y con exactamente sus claves (`textoDelAnfitrion` del contrato). */
export function textoParaElDocumento(m: MesaParaElDocumento | Movido): string {
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

/**
 * LO QUE DICE EL DOCUMENTO, leído con desconfianza: `leerMensajeDelDocumento` del contrato, renglón a
 * renglón. `null` ante cualquier cosa que no sea exactamente uno de sus mensajes en esta versión.
 */
export function leerLoQueDiceElDocumento(dato: unknown): MensajeDelDocumento | null {
  if (typeof dato !== 'string' || dato.length > TOPE_DEL_PUENTE) return null;
  let v: unknown;
  try {
    v = JSON.parse(dato) as unknown;
  } catch {
    return null;
  }
  if (conClaves(v, ['t', 'v'])) {
    if (v.v !== VERSION_DEL_PUENTE) return null;
    if (v.t === 'listo') return { t: 'listo', v: v.v };
    if (v.t === 'salir') return { t: 'salir', v: v.v };
    if (v.t === 'jugable') return { t: 'jugable', v: v.v };
    return null;
  }
  if (conClaves(v, ['t', 'v', 'fraccion', 'etapa', 'que'])) {
    if (v.t !== 'carga' || v.v !== VERSION_DEL_PUENTE) return null;
    if (typeof v.fraccion !== 'number' || !Number.isFinite(v.fraccion) || v.fraccion < 0 || v.fraccion > 1) return null;
    if (typeof v.etapa !== 'string' || !(ETAPAS_DE_LA_CARGA as readonly string[]).includes(v.etapa)) return null;
    if (typeof v.que !== 'string' || v.que.length < 1 || v.que.length > TOPE_DE_LO_QUE_CARGA) return null;
    return { t: 'carga', v: v.v, fraccion: v.fraccion, etapa: v.etapa as EtapaDeLaCarga, que: v.que };
  }
  if (conClaves(v, ['t', 'v', 'motivo'])) {
    if (v.t !== 'fallo' || v.v !== VERSION_DEL_PUENTE) return null;
    if (typeof v.motivo !== 'string' || v.motivo.length < 1 || v.motivo.length > TOPE_DEL_FALLO) return null;
    return { t: 'fallo', v: v.v, motivo: v.motivo };
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

/** Los tipos que el documento manda: un mensaje con uno de ellos y OTRA versión es un puente que no casa. */
const TIPOS_DEL_DOCUMENTO: readonly string[] = ['listo', 'salir', 'jugable', 'carga', 'fallo', 'mover', 'medida'];

/**
 * ¿HABLA EL DOCUMENTO OTRA VERSIÓN DEL PUENTE? Su versión si un mensaje suyo —uno de sus tipos, con `v`
 * entero— trae una que no es la de la app; `null` en cualquier otro caso. Es un fallo de verdad: no se
 * entenderían, y esperar no lo arregla. La pantalla cae al plano con esta razón.
 */
export function versionAjenaDelDocumento(dato: unknown): number | null {
  if (typeof dato !== 'string' || dato.length > TOPE_DEL_PUENTE) return null;
  let v: unknown;
  try {
    v = JSON.parse(dato) as unknown;
  } catch {
    return null;
  }
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null;
  const r = v as Record<string, unknown>;
  if (typeof r.t !== 'string' || !TIPOS_DEL_DOCUMENTO.includes(r.t)) return null;
  if (typeof r.v !== 'number' || !Number.isInteger(r.v) || r.v === VERSION_DEL_PUENTE) return null;
  return r.v;
}

/* ═══════════════════════════════ LA CARGA DE LA NOCHE, COMO LA VE LA APP ═══════════════════════════════ */

/**
 * Lo que la barra de la app sabe de la carga del documento. Lo cambia `cargaTras` con cada suceso; la
 * pantalla lo pinta. Sin reloj dentro: el aviso de los tres minutos es un suceso (`tardanza`) que la
 * pantalla manda con su temporizador, y aquí no hay NINGÚN camino que lleve al plano del barrio.
 */
export interface CargaDeLaNoche {
  /** De 0 a 1, nunca hacia atrás. */
  readonly fraccion: number;
  readonly etapa: EtapaDeLaCarga;
  /** La línea de qué se está cargando, como la dice el documento. */
  readonly que: string;
  /**
   * El documento cuenta su carga (manda `carga`). Uno que dice `listo` sin haber contado nada es de antes
   * del 27-sep: lo dice con su código ya arrancado, y la barra se quita con ese `listo`.
   */
  readonly cuenta: boolean;
  readonly listo: boolean;
  /** Ya se puede jugar: la barra se quita. */
  readonly jugable: boolean;
  /** El último fallo de arranque que dijo el documento. */
  readonly fallo: string | null;
  /** El aviso a la vista: por los tres minutos o por un fallo; `null` mientras se espera tranquilo. */
  readonly aviso: 'tardanza' | 'fallo' | null;
  /** Cuántas veces se eligió seguir esperando: con cada una se vuelven a contar tres minutos. */
  readonly esperas: number;
}

export type SucesoDeLaCarga =
  /** Lo que el WebView dice de la página (`onLoadProgress`), de 0 a 1. */
  | { readonly t: 'pagina'; readonly fraccion: number }
  /** Un mensaje del documento, ya leído con `leerLoQueDiceElDocumento`. */
  | { readonly t: 'documento'; readonly m: MensajeDelDocumento }
  /** Pasaron `AVISO_DE_TARDANZA_MS` sin poder jugar. */
  | { readonly t: 'tardanza' }
  /** Quien juega eligió seguir esperando. */
  | { readonly t: 'seguir' };

/** La parte de la barra que es la página en sí, mientras el documento no cuenta la suya. */
export const PARTE_DE_LA_PAGINA = 0.04;

export const CARGA_INICIAL: CargaDeLaNoche = {
  fraccion: 0,
  etapa: 'pagina',
  que: 'la página',
  cuenta: false,
  listo: false,
  jugable: false,
  fallo: null,
  aviso: null,
  esperas: 0,
};

/** LA CARGA TRAS UN SUCESO. Pura: la comprueba `verify:liza-protocolo`. */
export function cargaTras(c: CargaDeLaNoche, s: SucesoDeLaCarga): CargaDeLaNoche {
  if (c.jugable) return c;
  switch (s.t) {
    case 'pagina': {
      if (c.cuenta || !Number.isFinite(s.fraccion)) return c;
      const f = Math.max(c.fraccion, PARTE_DE_LA_PAGINA * Math.min(1, Math.max(0, s.fraccion)));
      return f === c.fraccion ? c : { ...c, fraccion: f };
    }
    case 'tardanza':
      return c.aviso !== null ? c : { ...c, aviso: 'tardanza' };
    case 'seguir':
      return { ...c, aviso: null, esperas: c.esperas + 1 };
    case 'documento': {
      const m = s.m;
      switch (m.t) {
        case 'carga':
          return { ...c, cuenta: true, fraccion: Math.max(c.fraccion, m.fraccion), etapa: m.etapa, que: m.que };
        case 'listo':
          /* Un documento que no cuenta su carga lo dice al final: ése ya se puede jugar. */
          return c.cuenta ? { ...c, listo: true } : { ...c, listo: true, jugable: true, fraccion: 1, aviso: null };
        case 'jugable':
          return { ...c, listo: true, jugable: true, fraccion: 1, aviso: null };
        case 'fallo':
          return { ...c, fallo: m.motivo, aviso: 'fallo' };
        default:
          return c;
      }
    }
  }
}

/** LA RAZÓN PROBABLE de que tarde, para el aviso: por dónde va la carga, o el fallo que dijo el documento. */
export function razonProbable(c: CargaDeLaNoche): string {
  if (c.aviso === 'fallo' && c.fallo !== null) return `El juego ha fallado al arrancar: ${c.fallo}`;
  if (!c.cuenta) {
    return c.fraccion >= PARTE_DE_LA_PAGINA
      ? 'La página ha llegado pero el juego no contesta: o su código baja muy despacio, o el visor del teléfono no lo ejecuta.'
      : 'La página del juego no termina de llegar: la conexión parece muy lenta o cortada.';
  }
  switch (c.etapa) {
    case 'pagina':
      return 'La página del juego no termina de llegar: la conexión parece muy lenta o cortada.';
    case 'codigo':
      return 'El código del juego (unos 2,5 MB) baja muy despacio: la conexión es lenta.';
    case 'mesa':
      return 'El juego está listo pero la mesa no le llega: puede que se haya cortado la conexión con el servidor.';
    case 'ciudad':
      return 'El juego se está montando y el teléfono va muy justo.';
    case 'personajes':
      return 'Los personajes bajan muy despacio: la conexión es lenta.';
    case 'graficos':
      return 'El teléfono está preparando los gráficos y va muy justo.';
  }
}
