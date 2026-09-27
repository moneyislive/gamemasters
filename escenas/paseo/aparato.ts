/**
 * ¿SE JUEGA CON EL DEDO O CON RATÓN Y TECLADO? La ÚNICA fuente de verdad de los clientes web —la Sala
 * (`escritorio/`) y `/jugar` (la app en el navegador)— para decidir si a pie salen la palanca,
 * «Correr» y «Golpear», qué dice el cartel de cómo se anda y si la pantalla completa se pide sola.
 *
 * ═══ EL FALLO QUE ESTO ARREGLA (27-sep-2026) ═══
 *
 * Miguel abrió El Burgo en la Sala EN SU ORDENADOR, bajó «Al hombro»… y le salieron la palanca y
 * «Correr» del teléfono encima de la calle. `usarAparatoTactil` encendía los mandos con
 * `(pointer: coarse)` O `navigator.maxTouchPoints > 0`, y un Windows con ratón da `maxTouchPoints` 10
 * en cuanto el equipo declara un digitalizador —muchos portátiles, y también éste: el navegador de
 * pruebas y Edge sin ventana dan 10 Y, además, `(pointer: coarse)` y `(hover: none)`, con un ratón
 * enchufado—. O sea: ni los puntos de toque ni la consulta del puntero bastan por sí solos para saber
 * que alguien tiene un dedo y no un ratón.
 *
 * ═══ CÓMO SE DECIDE: LO QUE SE VE AL ABRIR, Y LUEGO LO QUE SE USA ═══
 *
 *   1. AL ABRIR, una suposición: dedo SÓLO si el puntero PRINCIPAL es un dedo sin ratón
 *      (`(hover: none) and (pointer: coarse)`) Y el sistema no es de ordenador. «De ordenador» es un
 *      agente de usuario de Windows, de Linux que no es Android, de ChromeOS o de un Mac SIN pantalla
 *      táctil —un iPad se presenta como Mac, pero con puntos de toque: ahí `maxTouchPoints` sirve para
 *      separar dos Mac, nunca para decidir solo—. Un teléfono o una tableta Android y un iPhone salen
 *      con dedo; cualquier ordenador, con ratón, se toque o no su pantalla.
 *   2. LUEGO MANDA EL USO, en vivo: un toque de verdad (`pointerdown` con `pointerType === 'touch'`)
 *      pasa a dedo —un portátil con pantalla táctil, una tableta Windows—; mover el ratón
 *      (`pointermove` con `pointerType === 'mouse'`) o pulsar una tecla de andar (W A S D, flechas,
 *      Mayúsculas, G) pasa a ratón y teclado —una tableta a la que se le engancha un teclado—.
 *   3. SIN PARPADEOS: tras un toque, durante `CALMA_TRAS_UN_TOQUE` no cuenta el ratón. Hay pantallas
 *      táctiles de Windows que, detrás del dedo, mandan un movimiento de ratón sintético al mismo
 *      sitio; sin esa calma, cada toque encendería y apagaría la palanca en el mismo fotograma. Y un
 *      cambio sólo avisa si de verdad cambia el modo: moverse con el ratón por un ordenador no
 *      repinta nada.
 *   4. SI CAMBIA LA CONSULTA (se engancha o se suelta un ratón), se vuelve a suponer como al abrir.
 *
 * ═══ UN ALMACÉN, SIN REACT, Y UNA MARCA EN LA RAÍZ PARA LA HOJA ═══
 *
 * Es un almacén de los de `useSyncExternalStore` (`suscribirAlMando`, `mandoActual`) y cada cliente se
 * hace su gancho con él. Los oyentes del documento se ponen UNA vez, con el primer suscriptor o con
 * `vigilarElMando()` al arrancar, y escriben `data-mando="dedo"|"raton"` en `<html>`: las reglas de la
 * hoja que antes preguntaban `@media (pointer: coarse)` —botones de 44, atajos de teclado que se
 * esconden— preguntan ahora `:root[data-mando='dedo']`, y así la hoja y los mandos no pueden
 * discrepar. Sin `window` (Node, `verify:*`, la app nativa) es siempre `raton` y no escucha nada: la
 * app nativa no pregunta, es de dedo por construcción (`app/src/arcade/aparato-tactil.ts`).
 */
import { esTeclaDeOtro, teclaDelPaseo } from './mandos';

/** Con qué se juega: `dedo` saca los mandos táctiles; `raton` es ratón y teclado. */
export type ModoDeMando = 'dedo' | 'raton';

/** Lo que hace falta saber del aparato al abrir, sin `window`, para poder probarlo en Node. */
export interface ElAparato {
  /** Si `(hover: none) and (pointer: coarse)` casa: el puntero PRINCIPAL es un dedo sin ratón. */
  readonly dedoPrincipal: boolean;
  /** `navigator.userAgent`, o `''` si no lo hay. */
  readonly agente: string;
  /** `navigator.maxTouchPoints`, o `undefined`. Sólo separa un iPad de un Mac: nunca decide solo. */
  readonly puntosDeToque: number | undefined;
}

/** La consulta del dedo como puntero principal. `(pointer: coarse)` sola casa en ordenadores con ratón. */
export const CONSULTA_DEL_DEDO = '(hover: none) and (pointer: coarse)';

/** Lo que tarda en volver a contar el ratón tras un toque: el ratón sintético de algunos Windows. */
export const CALMA_TRAS_UN_TOQUE = 800;

/** La marca de `<html>` que lee la hoja: `data-mando`. */
export const MARCA_DEL_MANDO = 'mando';

/**
 * ¿ES UN SISTEMA DE ORDENADOR? Windows, Linux que no es Android, ChromeOS, o un Mac SIN puntos de toque
 * (un iPad con Safari de escritorio dice «Macintosh», y es lo único que lo delata).
 */
export function esSistemaDeOrdenador(agente: string, puntosDeToque: number | undefined): boolean {
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(agente)) return false;
  if (/Macintosh/i.test(agente)) return !(typeof puntosDeToque === 'number' && puntosDeToque > 1);
  return /Windows|X11|Linux|CrOS/i.test(agente);
}

/** LA SUPOSICIÓN AL ABRIR. Ver la cabecera: dedo principal Y un sistema que no es de ordenador. */
export function mandoAlAbrir(aparato: ElAparato): ModoDeMando {
  return aparato.dedoPrincipal && !esSistemaDeOrdenador(aparato.agente, aparato.puntosDeToque) ? 'dedo' : 'raton';
}

/** Lo que hace cambiar de modo, tal como llega: sin DOM, para probarlo. */
export type UsoDelAparato =
  | { readonly que: 'toque'; readonly cuando: number }
  | { readonly que: 'raton'; readonly cuando: number }
  | { readonly que: 'tecla'; readonly tecla: string; readonly cuando: number };

/** Las teclas que dicen «juego con teclado»: las de andar y la de golpear. Una letra suelta no. */
export function esTeclaDeAndar(tecla: string): boolean {
  return teclaDelPaseo(tecla) !== null;
}

/**
 * EL MODO TRAS UN USO. `ultimoToque` es cuándo fue el último toque (−∞ si nunca): el ratón que llega
 * dentro de la calma no cuenta. Pura, para `verify:paseo` y `verify:escritorio`.
 */
export function mandoTrasElUso(antes: ModoDeMando, uso: UsoDelAparato, ultimoToque: number): ModoDeMando {
  if (uso.que === 'toque') return 'dedo';
  if (uso.que === 'raton') return uso.cuando - ultimoToque < CALMA_TRAS_UN_TOQUE ? antes : 'raton';
  return esTeclaDeAndar(uso.tecla) ? 'raton' : antes;
}

// ---------------------------------------------------------------------------
// El almacén de la ventana
// ---------------------------------------------------------------------------

let modo: ModoDeMando = 'raton';
let vigilando = false;
let ultimoToque = Number.NEGATIVE_INFINITY;
const oyentes = new Set<() => void>();

function hayVentana(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined' && typeof window.addEventListener === 'function';
}

function elAparatoDeAqui(): ElAparato {
  const dedo = typeof window.matchMedia === 'function' ? window.matchMedia(CONSULTA_DEL_DEDO).matches : false;
  const n = typeof navigator === 'undefined' ? undefined : navigator;
  return { dedoPrincipal: dedo, agente: n?.userAgent ?? '', puntosDeToque: n?.maxTouchPoints };
}

function poner(nuevo: ModoDeMando): void {
  if (hayVentana()) document.documentElement.dataset[MARCA_DEL_MANDO] = nuevo;
  if (nuevo === modo) return;
  modo = nuevo;
  for (const o of oyentes) o();
}

/**
 * PONE LOS OYENTES DEL DOCUMENTO, una vez. Lo llama el primer suscriptor, y la entrada de la Sala al
 * arrancar para que la marca de `<html>` esté puesta antes del primer pintado.
 */
export function vigilarElMando(): void {
  if (vigilando || !hayVentana()) return;
  vigilando = true;
  modo = mandoAlAbrir(elAparatoDeAqui());
  document.documentElement.dataset[MARCA_DEL_MANDO] = modo;
  const usar = (uso: UsoDelAparato): void => {
    if (uso.que === 'toque') ultimoToque = uso.cuando;
    poner(mandoTrasElUso(modo, uso, ultimoToque));
  };
  const opciones = { capture: true, passive: true } as const;
  window.addEventListener(
    'pointerdown',
    (e: PointerEvent) => {
      if (e.pointerType === 'touch') usar({ que: 'toque', cuando: performance.now() });
    },
    opciones,
  );
  window.addEventListener(
    'pointermove',
    (e: PointerEvent) => {
      /* Con el ratón ya puesto no hay nada que decidir: se ahorra la cuenta en cada movimiento. */
      if (e.pointerType === 'mouse' && modo !== 'raton') usar({ que: 'raton', cuando: performance.now() });
    },
    opciones,
  );
  window.addEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      if (modo === 'raton') return;
      /*
       * Lo que se ESCRIBE no es andar: el teclado de pantalla de un teléfono escribiendo «dos» en el
       * campo de una puja no puede quitarle la palanca a nadie (`esTeclaDeOtro`, `mandos.ts`).
       */
      const t = e.target as { readonly tagName?: string; readonly isContentEditable?: boolean } | null;
      if (esTeclaDeOtro(t, e.ctrlKey || e.altKey || e.metaKey)) return;
      usar({ que: 'tecla', tecla: e.key, cuando: performance.now() });
    },
    opciones,
  );
  if (typeof window.matchMedia === 'function') {
    window.matchMedia(CONSULTA_DEL_DEDO).addEventListener('change', () => poner(mandoAlAbrir(elAparatoDeAqui())));
  }
}

/** Para `useSyncExternalStore`: suscribe y pone los oyentes si hacía falta. */
export function suscribirAlMando(oyente: () => void): () => void {
  vigilarElMando();
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

/** Para `useSyncExternalStore`: el modo de ahora. Sin ventana, `raton`. */
export function mandoActual(): ModoDeMando {
  if (!vigilando) vigilarElMando();
  return modo;
}

/** Lo que se pinta en Node: ratón y teclado. */
export function mandoSinVentana(): ModoDeMando {
  return 'raton';
}
