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
 * lectores digan lo mismo ante lo mismo se comprobó al escribirlo, dándoles las mismas muestras buenas y
 * envenenadas, y no hay todavía un comprobador de la batería que lo repita: el sitio natural es
 * `verify:liza-protocolo`, que ya prueba el del contrato. El día que el contrato viva en `shared/` —o
 * Metro vigile `escritorio/src/quiebro/`—, esto se reduce a importar el suyo y la duda desaparece.
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
  MensajeDelDocumento,
  MesaParaElDocumento,
  Movido,
} from '../../../escritorio/src/quiebro/contrato';
import type { LaMesa, OpcionDeMesa } from './mesa';

/** La versión y el tope del puente, ATADOS al contrato: ver la cabecera. */
type VersionDelContrato = typeof import('../../../escritorio/src/quiebro/contrato').VERSION_DEL_PUENTE;
type TopeDelContrato = typeof import('../../../escritorio/src/quiebro/contrato').TOPE_DEL_PUENTE;
export const VERSION_DEL_PUENTE: VersionDelContrato = 1;
export const TOPE_DEL_PUENTE: TopeDelContrato = 1048576;

/**
 * Cuánto se espera a que el documento diga `listo`. Lo dice al arrancar su código, antes de bajar la
 * ciudad y los personajes, así que no es la carga entera; pero en la primera noche de un teléfono con
 * mala cobertura el propio código ya son unos megas.
 */
export const ESPERA_DEL_DOCUMENTO_MS = 25_000;

/**
 * EL NOMBRE DE LA FUNCIÓN QUE EL DOCUMENTO DEJA PARA SU ANFITRIÓN NATIVO. En el WebView los mensajes de
 * la app no llegan por `message` de otra ventana: la app los mete con `injectJavaScript` llamando a esta
 * función, que el documento (`escritorio/src/quiebro/documento.tsx`) deja en `window`. Si allí cambia,
 * cambia aquí; hasta entonces el documento se quedaría esperando la mesa, y la espera de la pantalla lo
 * mandaría al plano del barrio con su nota.
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
