/**
 * LA CALIDAD SE MIDE, NO SE ADIVINA: el juez que decide `plena` o `sobria`.
 *
 * ═══ QUÉ DECIDE ═══
 *
 * `alMedir` (ver `tipos.ts`) llega una vez por segundo con el tiempo medio de
 * fotograma de ese segundo y cuántos fotogramas cubre. No se mira el modelo del
 * aparato ni la versión de Android: se mira cuánto tarda ESTE aparato en pintar
 * ESTA escena, que es lo único que dice si va justo. El umbral es 22 ms —45
 * fotogramas por segundo— y la ventana son los primeros 120 fotogramas, que es lo
 * que el §10 de `docs/EL-MUELLE.md` fija como riesgo medido.
 *
 * Cada muestra cubre `1000 / ms` fotogramas aproximadamente, así que se suman
 * hasta pasar de 120 y se pondera cada muestra por los fotogramas que cubre. Una
 * muestra a cero —el andamio de la escena manda `ms: 0` mientras no mide— no
 * dice nada y se salta. Devuelve `null` mientras no hay fotogramas suficientes:
 * quien llama sigue en `plena` hasta que haya veredicto, y no vuelve a preguntar
 * después.
 *
 * ═══ POR QUÉ VIVE EN `escenas/` Y NO EN LA APP ═══
 *
 * Nació en `app/src/arcade/muelle-escena.tsx`, que es quien la usa. El Burgo
 * quiere la misma cuenta para su tablero —en la app Y en el escritorio— y el
 * escritorio no puede importar de `app/` (`verify:fronteras`): la frontera que se
 * vigila es la del móvil, y saltarla por una función de doce líneas abriría la
 * puerta a todo lo demás. Aquí no hay React, ni `three`, ni Expo: sólo números,
 * y por eso la puede llamar cualquiera de los dos clientes y la puede medir un
 * comprobador en Node.
 */
import type { Calidad } from './tipos';

/** Por encima de esto por fotograma, la escena va justa y se baja a `sobria`. */
export const UMBRAL_MS = 22;

/** Cuántos fotogramas hay que haber visto antes de decidir. */
export const FOTOGRAMAS_QUE_SE_MIRAN = 120;

/** Una muestra de `alMedir`: la media de ms del último segundo y cuántos fotogramas cubre. */
export interface MuestraDelHilo {
  readonly ms: number;
  readonly fotogramas: number;
}

export function juzgarCalidad(muestras: readonly MuestraDelHilo[]): Calidad | null {
  let fotogramas = 0;
  let tiempo = 0;
  for (const m of muestras) {
    if (!(m.ms > 0)) continue;
    /*
     * La escena dice cuántos fotogramas cubre cada media; si no lo dice —un
     * andamio, una versión vieja— se estima desde los ms, que es lo que se hacía
     * antes de que el contrato lo trajera.
     */
    const cubre = m.fotogramas > 0 ? m.fotogramas : 1000 / m.ms;
    fotogramas += cubre;
    tiempo += m.ms * cubre;
  }
  if (fotogramas < FOTOGRAMAS_QUE_SE_MIRAN) return null;
  return tiempo / fotogramas > UMBRAL_MS ? 'sobria' : 'plena';
}
