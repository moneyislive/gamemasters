/**
 * EL JUEGO AL FONDO: cuándo la persona ya no está mirando la noche, venga de donde venga el aviso.
 *
 * ═══ POR QUÉ HACE FALTA ═══
 *
 * La sala da por AUSENTE a quien lleva 2 s sin un `aqui` vivo (diez seguidos): queda intocable, ningún
 * NPC le persigue, y no anda ni pega (`quiebro-liza.ts`, el estado ausente). Pero la sala cuenta como
 * vivo a quien, aunque se salte tics, se MUEVE o pulsa algo: una pestaña oculta con la palanca atascada
 * —un dedo que no llegó a levantarse, una tecla cuyo `keyup` se comió el cambio de ventana— seguiría
 * «jugando» sin nadie delante y los Celadores la molerían a golpes. Y hay aparatos que no frenan nada al
 * irse: una pestaña que suena no se ralentiza en Chrome, y el WebView de Android sigue corriendo sus
 * temporizadores con la app en segundo plano (`react-native-webview` no hace nada en `onHostPause`).
 *
 * Así que el aparato se CALLA al irse al fondo —suelta todos los mandos y deja de mandar `aqui`— y la
 * sala hace lo suyo: a los 2 s, ausente. Al volver, vuelve a mandar, y la sala lo recibe con su vuelta
 * corta (diez tics de intocable que corta la primera acción).
 *
 * ═══ DE DÓNDE LLEGA EL AVISO ═══
 *
 *   · `visibilitychange` del propio documento: la pestaña de un navegador, el `iframe` de `/jugar` en
 *     una página que se oculta, y el WebView cuando su motor lo cuenta.
 *   · `pagehide` / `pageshow`: el documento que se va (o vuelve de la caché de páginas).
 *   · `EVENTO_DEL_FONDO` en `window`, con `detail` a `true` (al fondo) o `false` (de vuelta): lo mete la
 *     app con `injectJavaScript` cuando `AppState` pasa a segundo plano o vuelve (`quiebro-documento.tsx`
 *     de la app), porque en Android el WebView no siempre se entera. La app no puede importar de aquí
 *     (Metro no ve `escritorio/`): el nombre va copiado en `app/src/arcade/quiebro-puente.ts` y
 *     `verify:quiebro-juego` exige que sean el mismo.
 *
 * Perder el FOCO (`blur`) no es irse al fondo: la noche sigue a la vista en la otra pantalla. Sólo suelta
 * los mandos, y eso lo hacen `teclado.ts` y `Tactil.tsx`.
 */

/** El evento con que la app avisa de que se va al fondo (`detail: true`) o vuelve (`detail: false`). */
export const EVENTO_DEL_FONDO = 'quiebro:fondo';

/**
 * LO ÚLTIMO QUE DIJO LA APP, recordado fuera de cada escucha. La app avisa UNA vez al irse y otra al
 * volver; si la partida se rehace entre medias (el canal nuevo de una recarga del servidor de desarrollo,
 * otra llave), la escucha nueva nacía creyendo que la app estaba delante, y el aparato volvía a mandar sus
 * `aqui` sin nadie mirando. Así que el aviso lo apunta un oyente que se pone UNA vez por ventana y no se
 * quita nunca, y cada escucha empieza por lo que él sabe.
 */
const vigiladas = new WeakSet<object>();
let laAppAlFondo = false;
function vigilarLaApp(): void {
  if (vigiladas.has(window)) return;
  vigiladas.add(window);
  window.addEventListener(EVENTO_DEL_FONDO, (e: Event) => {
    laAppAlFondo = (e as CustomEvent<unknown>).detail !== false;
  });
}
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') vigilarLaApp();

/**
 * Escucha las idas y vueltas del fondo, y avisa SÓLO cuando cambia. Devuelve cómo dejar de escuchar.
 * Si ya empieza al fondo (la pestaña oculta, o la app en segundo plano según su último aviso), avisa en
 * el acto.
 */
export function escucharElFondo(alCambiar: (alFondo: boolean) => void): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => undefined;
  vigilarLaApp();
  let pestanaOculta = document.visibilityState === 'hidden';
  let paginaIda = false;
  let appAlFondo = laAppAlFondo;
  let antes = false;
  const mirar = (): void => {
    const ahora = pestanaOculta || paginaIda || appAlFondo;
    if (ahora === antes) return;
    antes = ahora;
    alCambiar(ahora);
  };
  const alCambiarLaVisibilidad = (): void => {
    pestanaOculta = document.visibilityState === 'hidden';
    mirar();
  };
  const alIrse = (): void => {
    paginaIda = true;
    mirar();
  };
  const alVolver = (): void => {
    paginaIda = false;
    pestanaOculta = document.visibilityState === 'hidden';
    mirar();
  };
  const deLaApp = (e: Event): void => {
    appAlFondo = (e as CustomEvent<unknown>).detail !== false;
    mirar();
  };
  document.addEventListener('visibilitychange', alCambiarLaVisibilidad);
  window.addEventListener('pagehide', alIrse);
  window.addEventListener('pageshow', alVolver);
  window.addEventListener(EVENTO_DEL_FONDO, deLaApp);
  mirar();
  return () => {
    document.removeEventListener('visibilitychange', alCambiarLaVisibilidad);
    window.removeEventListener('pagehide', alIrse);
    window.removeEventListener('pageshow', alVolver);
    window.removeEventListener(EVENTO_DEL_FONDO, deLaApp);
  };
}
