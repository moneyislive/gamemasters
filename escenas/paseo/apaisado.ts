/**
 * A PIE, EL TELÉFONO DE LADO: lo que los dos clientes web —la Sala y `/jugar`— hacen al bajar a andar
 * con un teléfono de pie. La app nativa lo hace con `expo-screen-orientation`
 * (`app/src/arcade/a-pie-apaisado.ts`); esto es su mitad del navegador.
 *
 * ═══ POR QUÉ (27-sep-2026) ═══
 *
 * Miguel, en la app: «aparecen los controles pero no se pone en horizontal la pantalla, por tanto no
 * se puede jugar bien». Con el teléfono de pie, la palanca y el correr se comen el tercio de abajo y la
 * calle se ve por una rendija. El Quiebro ya se juega tumbado; El Burgo, Riberas y Las Lindes, a pie,
 * también.
 *
 * ═══ LO QUE DEJA EL NAVEGADOR, Y LO QUE NO ═══
 *
 * `screen.orientation.lock('landscape')` sólo funciona A PANTALLA COMPLETA y con un gesto reciente
 * (Chrome de Android sí; Safari del iPhone no tiene ni pantalla completa para páginas). Así que:
 *
 *   1. Al bajar a andar —el botón «Al hombro» es el gesto—, si es un teléfono con el dedo y está de
 *      pie, se pide la pantalla completa (si no lo estaba) y luego el bloqueo en horizontal.
 *   2. Si el navegador dice que no, se ENSEÑA UN AVISO «Gira el teléfono», como el de El Quiebro, pero
 *      que NO atrapa: tiene «Seguir de pie» y se va solo en cuanto se gira. Tapar la pantalla sin
 *      remedio a quien no puede girarla (bloqueo de giro del sistema) sería peor que no avisar.
 *   3. Al volver a la mesa se suelta el bloqueo, y se sale de la pantalla completa SÓLO si la puso
 *      esto: la que ya estaba —el botón, o la del primer toque— es de quien juega.
 *
 * Todo con `try` y `catch`: pedir lo que no se puede tener no puede costar la partida.
 */

/** ¿Es un TELÉFONO? El lado corto de la ventana por debajo de esto. Una tableta de pie tiene sitio. */
export const LADO_CORTO_DE_UN_TELEFONO = 600;

/** ¿Hace falta girarlo? Con el dedo, de pie, y en un teléfono: el mismo criterio que el aviso de El Quiebro. */
export function hayQueGirar(ancho: number, alto: number, conElDedo: boolean): boolean {
  return conElDedo && alto > ancho && Math.min(ancho, alto) < LADO_CORTO_DE_UN_TELEFONO;
}

/** Lo que dice el aviso. En los dos clientes, con las mismas palabras. */
export const GIRA_EL_TELEFONO = 'Gira el teléfono';
export const POR_QUE_GIRARLO = 'A pie se juega en horizontal: la palanca a un pulgar y el resto al otro, y la calle entera en medio.';
export const SEGUIR_DE_PIE = 'Seguir de pie';

interface DocumentoConPantallaCompleta {
  readonly fullscreenElement?: Element | null;
  readonly webkitFullscreenElement?: Element | null;
  readonly exitFullscreen?: () => Promise<void>;
  readonly documentElement: { readonly requestFullscreen?: (o?: { navigationUI?: 'hide' | 'show' | 'auto' }) => Promise<void> };
}

interface OrientacionQueSeBloquea {
  lock?: (o: 'landscape') => Promise<void>;
  unlock?: () => void;
}

function elDocumento(): DocumentoConPantallaCompleta | null {
  return typeof document === 'undefined' ? null : (document as unknown as DocumentoConPantallaCompleta);
}

function laOrientacion(): OrientacionQueSeBloquea | null {
  if (typeof screen === 'undefined') return null;
  return (screen as unknown as { orientation?: OrientacionQueSeBloquea }).orientation ?? null;
}

function aPantallaCompleta(d: DocumentoConPantallaCompleta): boolean {
  return (d.fullscreenElement ?? d.webkitFullscreenElement ?? null) !== null;
}

/**
 * PIDE EL TELÉFONO DE LADO. Devuelve si lo consiguió y si la pantalla completa la puso esto (para
 * devolverla al soltar). Nunca lanza.
 */
export async function pedirDeLado(): Promise<{ readonly deLado: boolean; readonly pusoLaPantallaCompleta: boolean }> {
  const d = elDocumento();
  const o = laOrientacion();
  if (d === null || o === null || typeof o.lock !== 'function') return { deLado: false, pusoLaPantallaCompleta: false };
  let puso = false;
  try {
    if (!aPantallaCompleta(d) && typeof d.documentElement.requestFullscreen === 'function') {
      await d.documentElement.requestFullscreen({ navigationUI: 'hide' });
      puso = aPantallaCompleta(d);
    }
  } catch {
    /* Sin gesto o sin permiso: se intenta el bloqueo igual, que en algún navegador no la pide. */
  }
  try {
    await o.lock('landscape');
    return { deLado: true, pusoLaPantallaCompleta: puso };
  } catch {
    return { deLado: false, pusoLaPantallaCompleta: puso };
  }
}

/** Suelta el bloqueo y, si la pantalla completa la puso `pedirDeLado`, la devuelve. Nunca lanza. */
export function soltarElLado(pusoLaPantallaCompleta: boolean): void {
  try {
    laOrientacion()?.unlock?.();
  } catch {
    /* No estaba bloqueada. */
  }
  const d = elDocumento();
  if (!pusoLaPantallaCompleta || d === null || !aPantallaCompleta(d)) return;
  try {
    void d.exitFullscreen?.call(d).catch(() => undefined);
  } catch {
    /* Ya había salido. */
  }
}
