/**
 * LA PANTALLA COMPLETA DE LA SALA: un botón discreto que monta cada pantalla de juego, y la petición
 * al primer toque de un aparato táctil al entrar en una partida.
 *
 * ═══ POR QUÉ HACE FALTA ═══
 *
 * Desde el 27-sep la Sala se pinta con el ancho de verdad del teléfono (`index.html`,
 * `width=device-width`), y en un móvil tumbado de 390 puntos de alto la barra de direcciones y la de
 * gestos se comen un cuarto de la ventana: justo lo que le falta al tablero. Miguel lo pidió así
 * (`docs/PANTALLAS.md` §5): un botón en las pantallas de juego, y que al primer toque dentro de una
 * partida el teléfono se ponga a pantalla completa solo.
 *
 * ═══ LA API, CON Y SIN PREFIJO, Y DÓNDE NO EXISTE ═══
 *
 * `requestFullscreen` es la de todos los navegadores de hoy; Safari de iPad y los Safari de escritorio
 * anteriores a la 16.4 sólo traen la de prefijo `webkit`. En el iPhone NO hay ninguna para páginas
 * (sólo `webkitEnterFullscreen` en un `<video>`), y allí el botón no se pinta: prometer un toque que no
 * hace nada es peor que no ofrecerlo. En el iPhone la pantalla completa la da el manifiesto
 * (`public/manifest.webmanifest`, `display: fullscreen`) y las metas de aplicación web de
 * `index.html` al añadir la Sala a la pantalla de inicio. Y abierta así —`display-mode: fullscreen` o
 * `standalone`— tampoco se pinta: ya está.
 *
 * ═══ EL PRIMER TOQUE, Y POR QUÉ ES AL LEVANTAR EL DEDO ═══
 *
 * El navegador sólo concede la pantalla completa dentro de un gesto del usuario (activación
 * transitoria). De los eventos de un dedo, los que la dan son `pointerup` y `touchend`, no el
 * `pointerdown` —ése sólo la da con ratón—. Se escucha en captura sobre `document` para verlo antes
 * que nadie, sin `preventDefault`: el toque sigue siendo del juego, que lo usa para lo suyo.
 *
 * Una vez por partida montada, y no a cada toque: quien sale de la pantalla completa con el gesto de
 * atrás ha decidido salir, y perseguirle con otra petición en el siguiente toque sería quitarle la
 * decisión. El botón sigue ahí para volver.
 *
 * ═══ SÓLO EN LAS PARTIDAS ═══
 *
 * Esto se monta en las pantallas de juego (`burgo-en-tres.tsx`, `riberas-en-tres.tsx`,
 * `lindes-en-tres.tsx`, `quiebro-en-tres.tsx`), y no en el catálogo ni en el vestíbulo: allí se
 * escribe un nombre y un código, y el teclado del teléfono con la pantalla completa se pelea por el
 * alto. `verify:escritorio` compra que las cuatro lo monten.
 */
import { useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import { usarAparatoTactil } from './mandos-tactiles';

/** Lo que dice el botón, según el estado. También es su nombre accesible. */
export const ENTRAR_EN_PANTALLA_COMPLETA = 'Pantalla completa';
export const SALIR_DE_PANTALLA_COMPLETA = 'Salir de la pantalla completa';

/** El documento con las dos grafías de la API: la de siempre y la de prefijo de Safari. */
interface DocumentoConPrefijo {
  readonly fullscreenEnabled?: boolean;
  readonly webkitFullscreenEnabled?: boolean;
  readonly fullscreenElement?: Element | null;
  readonly webkitFullscreenElement?: Element | null;
  readonly exitFullscreen?: () => Promise<void>;
  readonly webkitExitFullscreen?: () => void;
  readonly documentElement: {
    readonly requestFullscreen?: (opciones?: { navigationUI?: 'hide' | 'show' | 'auto' }) => Promise<void>;
    readonly webkitRequestFullscreen?: () => void;
  };
}

/**
 * ¿SE PUEDE PONER ESTE DOCUMENTO A PANTALLA COMPLETA? Pura, con el documento de parámetro, para que
 * `verify:escritorio` la pruebe con los tres navegadores de mentira: el de hoy, el de prefijo y el del
 * iPhone, que no trae ninguno.
 */
export function hayPantallaCompleta(doc: DocumentoConPrefijo | undefined): boolean {
  if (doc === undefined) return false;
  const pedir = doc.documentElement.requestFullscreen ?? doc.documentElement.webkitRequestFullscreen;
  if (typeof pedir !== 'function') return false;
  /* `fullscreenEnabled` es `false` dentro de un `iframe` sin `allowfullscreen`: ahí tampoco. */
  const permitida = doc.fullscreenEnabled ?? doc.webkitFullscreenEnabled;
  return permitida !== false;
}

/** ¿Está ya a pantalla completa? Con o sin prefijo. */
export function estaAPantallaCompleta(doc: DocumentoConPrefijo | undefined): boolean {
  if (doc === undefined) return false;
  return (doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null) !== null;
}

/** Pide la pantalla completa para la página entera. Si el navegador dice que no, no pasa nada. */
export function pedirPantallaCompleta(doc: DocumentoConPrefijo | undefined): void {
  if (doc === undefined || !hayPantallaCompleta(doc) || estaAPantallaCompleta(doc)) return;
  const raiz = doc.documentElement;
  try {
    if (typeof raiz.requestFullscreen === 'function') {
      /* `navigationUI: 'hide'`: en Android, sin la barra de navegación del sistema encima. */
      raiz.requestFullscreen.call(raiz, { navigationUI: 'hide' }).catch(() => undefined);
    } else if (typeof raiz.webkitRequestFullscreen === 'function') {
      raiz.webkitRequestFullscreen.call(raiz);
    }
  } catch {
    /* Sin gesto, o denegada: se sigue jugando con las barras, que es como estaba. */
  }
}

/** Sale de la pantalla completa, con o sin prefijo. */
export function salirDePantallaCompleta(doc: DocumentoConPrefijo | undefined): void {
  if (doc === undefined || !estaAPantallaCompleta(doc)) return;
  try {
    if (typeof doc.exitFullscreen === 'function') doc.exitFullscreen.call(doc).catch(() => undefined);
    else if (typeof doc.webkitExitFullscreen === 'function') doc.webkitExitFullscreen.call(doc);
  } catch {
    /* Ya había salido por otro lado. */
  }
}

/** El documento de esta ventana, o ninguno fuera de un navegador. */
function elDocumento(): DocumentoConPrefijo | undefined {
  return typeof document === 'undefined' ? undefined : (document as unknown as DocumentoConPrefijo);
}

/** ¿Se abrió la Sala como aplicación desde la pantalla de inicio? Entonces ya no hay barras que quitar. */
function abiertaComoAplicacion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(display-mode: fullscreen)').matches || window.matchMedia('(display-mode: standalone)').matches;
}

/** Si la página está a pantalla completa, y cambia cuando cambia (también por el gesto de atrás). */
function usarEstaAPantallaCompleta(): boolean {
  const [esta, ponerEsta] = useState(() => estaAPantallaCompleta(elDocumento()));
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const mirar = (): void => ponerEsta(estaAPantallaCompleta(elDocumento()));
    document.addEventListener('fullscreenchange', mirar);
    document.addEventListener('webkitfullscreenchange', mirar);
    mirar();
    return () => {
      document.removeEventListener('fullscreenchange', mirar);
      document.removeEventListener('webkitfullscreenchange', mirar);
    };
  }, []);
  return esta;
}

/**
 * EL PRIMER TOQUE DE LA PARTIDA PIDE LA PANTALLA COMPLETA, una vez por montaje y sólo en un aparato
 * táctil. Ver la cabecera: `pointerup` de un dedo, en captura y sin robarle el toque a nadie.
 */
function usarLaPeticionAlPrimerToque(activa: boolean): void {
  const pedida = useRef(false);
  useEffect(() => {
    if (!activa || pedida.current || typeof document === 'undefined') return undefined;
    const alLevantar = (e: PointerEvent): void => {
      if (e.pointerType === 'mouse' || pedida.current) return;
      pedida.current = true;
      document.removeEventListener('pointerup', alLevantar, true);
      pedirPantallaCompleta(elDocumento());
    };
    document.addEventListener('pointerup', alLevantar, true);
    return () => document.removeEventListener('pointerup', alLevantar, true);
  }, [activa]);
}

/**
 * EL BOTÓN. Cuatro esquinas hacia fuera para entrar y hacia dentro para salir, sin texto a la vista y
 * con el nombre entero para el lector y en el `title`.
 *
 * DÓNDE VA, medido con el fotógrafo en cada pantalla y no elegido a ojo:
 *   · sin `flotante`, en el flujo de la cinta que lo monte (El Burgo: su cinta es a todo lo ancho y
 *     la frase se recorta con puntos suspensivos, así que cede ella);
 *   · `flotante="izquierda"`, suelto en la esquina de arriba a la izquierda del recuadro, que es la
 *     esquina libre en Riberas —su cinta es el tercio central, con el ancho repartido al punto en
 *     `escenas/cinta.ts`, y la derecha es la columna de volver, recoger y la cámara— y en Las Lindes,
 *     con las cámaras a la derecha;
 *   · `flotante="derecha"`, la otra esquina, para quien la tenga libre.
 * Las dos flotantes respetan las zonas seguras.
 *
 * Sin API —el iPhone— o abierta ya como aplicación, no se pinta nada; pero la petición al primer
 * toque también se engancha sólo si hay API, así que montarlo es siempre seguro.
 */
export function PantallaCompleta({ flotante }: { readonly flotante?: 'izquierda' | 'derecha' }): JSX.Element | null {
  const [hay] = useState(() => hayPantallaCompleta(elDocumento()) && !abiertaComoAplicacion());
  const tactil = usarAparatoTactil();
  const esta = usarEstaAPantallaCompleta();
  usarLaPeticionAlPrimerToque(hay && tactil);
  if (!hay) return null;
  const rotulo = esta ? SALIR_DE_PANTALLA_COMPLETA : ENTRAR_EN_PANTALLA_COMPLETA;
  return (
    <button
      type="button"
      className={
        flotante === undefined
          ? 'pantalla-completa'
          : `pantalla-completa pantalla-completa-flotante pantalla-completa-${flotante}`
      }
      aria-label={rotulo}
      aria-pressed={esta}
      title={rotulo}
      onClick={() => {
        if (esta) salirDePantallaCompleta(elDocumento());
        else pedirPantallaCompleta(elDocumento());
      }}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <path
          d={
            esta
              ? 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5'
              : 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'
          }
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
