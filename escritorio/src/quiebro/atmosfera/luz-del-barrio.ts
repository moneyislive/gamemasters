/**
 * LA LUZ DEL BARRIO: con qué luz amanece (o no) el barrio de la noche. Sin `three`, sin React.
 *
 * ═══ LAS DOS LUCES ═══
 *
 *   · `madrugada`: la noche de sodio. Cielo casi negro con la panza de las nubes teñida por la ciudad,
 *     la calle la pintan las farolas, los neones y los escaparates; las ventanas, muchas encendidas.
 *   · `alba`: el alba gris. Cielo cubierto verde-gris sin sol, luz difusa que llega a todo por igual,
 *     niebla en capas que se come los bajos y deja las torres lejanas en silueta; las farolas siguen
 *     encendidas y quedan pocas ventanas con luz. Es la luz de las referencias de Miguel (la calle de
 *     rascacielos con el cielo verdoso y la vista aérea).
 *
 * ═══ DE DÓNDE SALE, Y POR QUÉ NO ES UN CAMPO DEL BARRIO ═══
 *
 * La luz es ADORNO, pero tiene que salir igual en todos los aparatos de la mesa: dos jugadores de la
 * misma noche no pueden ver uno la madrugada y otro el alba. El barrio (`shared/arcade/juegos/
 * quiebro-barrio.ts`, de otro frente) ya publica la HORA de la noche, sembrada con el código y el
 * número de noche (entre la 1:00 y las 4:59), y la hora ya sale en el rótulo del barrio: aquí la luz
 * se DERIVA de ella, sin tocar el barrio. De la 1:00 a las 2:59 es madrugada; de las 3:00 a las 4:59,
 * alba gris (la mitad de las noches cada una, porque el barrio reparte la hora por igual). Y dentro
 * del alba, cuanto más tarde, más clara (`claridad`): no es lo mismo las 3:05 que las 4:50.
 *
 * Si un día el barrio quiere decidir la luz él mismo (un campo `luz` en su adorno), se cambia
 * `luzDeLaHora` por la lectura de ese campo y el resto de la ciudad no se entera.
 *
 * ═══ FORZARLA ═══
 *
 * Para mirarla (los bancos, la lupa del frente de imagen, una captura de antes y después) se puede
 * FORZAR con `forzarLaLuz` o, en desarrollo, con `?luz=madrugada|alba` en la dirección. No decide nada
 * de la partida, pero sí cuánto se ve a lo lejos: por eso la dirección sólo la oye el servidor de
 * desarrollo, nunca el juego empaquetado.
 */

export type LuzDelBarrio = 'madrugada' | 'alba';
export const LUCES_DEL_BARRIO: readonly LuzDelBarrio[] = ['madrugada', 'alba'];

/** La luz de una noche y cuánto ha aclarado ya (0 madrugada cerrada … 1 alba avanzada). */
export interface LuzDeLaNoche {
  readonly luz: LuzDelBarrio;
  readonly claridad: number;
}

/** El minuto a partir del cual la noche ya es alba: las 3:00. */
export const MINUTO_DEL_ALBA = 3 * 60;
/** El último minuto que el barrio puede sacar: las 4:59. */
const ULTIMO_MINUTO = 4 * 60 + 59;

/** Lee «h:mm» (como la escribe `plano.ts`); lo que no se entiende es la 1:00 (madrugada). */
export function minutoDeLaHora(hora: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hora.trim());
  if (m === null) return 60;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return 60;
  return h * 60 + min;
}

/** La luz de la hora del barrio. Pura y determinista: la misma hora da la misma luz en todas partes. */
export function luzDeLaHora(hora: string): LuzDeLaNoche {
  const minuto = minutoDeLaHora(hora);
  if (minuto < MINUTO_DEL_ALBA) return { luz: 'madrugada', claridad: 0 };
  const t = Math.min(1, Math.max(0, (minuto - MINUTO_DEL_ALBA) / (ULTIMO_MINUTO - MINUTO_DEL_ALBA)));
  /* Del 0,7 al 1: el alba recién empezada ya es alba, no una madrugada un poco más clara. */
  return { luz: 'alba', claridad: 0.7 + 0.3 * t };
}

/* ─────────────────────────────── Forzarla desde fuera ─────────────────────────────── */

/**
 * `?luz=` sólo en desarrollo: la luz cambia la bruma a ras de calle (el alba es más clara), así que en
 * una partida de verdad forzarla sería ver más lejos que los demás. En el empaquetado no existe.
 */
function deLaDireccion(): LuzDelBarrio | null {
  const env = import.meta.env as { readonly DEV?: boolean } | undefined;
  if (env?.DEV !== true || typeof location === 'undefined') return null;
  const pedida = new URLSearchParams(location.search).get('luz');
  return pedida === 'madrugada' || pedida === 'alba' ? pedida : null;
}

let forzada: LuzDelBarrio | null = deLaDireccion();
const oyentes = new Set<() => void>();

/** Fuerza una luz (o la suelta con `null`). La ciudad y la atmósfera se rehacen con ella. */
export function forzarLaLuz(luz: LuzDelBarrio | null): void {
  forzada = luz;
  for (const avisar of oyentes) avisar();
}

export function luzForzada(): LuzDelBarrio | null {
  return forzada;
}

/** Para `useSyncExternalStore`. */
export function suscribirALaLuz(avisar: () => void): () => void {
  oyentes.add(avisar);
  return () => {
    oyentes.delete(avisar);
  };
}

/** La luz que manda: la forzada si la hay (con el alba a media claridad), si no la de la hora. */
export function luzQueManda(hora: string, forzadaAhora: LuzDelBarrio | null): LuzDeLaNoche {
  if (forzadaAhora === null) return luzDeLaHora(hora);
  const deLaHora = luzDeLaHora(hora);
  if (deLaHora.luz === forzadaAhora) return deLaHora;
  return forzadaAhora === 'alba' ? { luz: 'alba', claridad: 0.85 } : { luz: 'madrugada', claridad: 0 };
}
