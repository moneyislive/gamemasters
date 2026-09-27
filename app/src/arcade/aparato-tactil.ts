/**
 * ¿SE JUEGA CON EL DEDO? En la app NATIVA, siempre: un teléfono o una tableta no tienen otra cosa. El
 * navegador (`/jugar`) usa `aparato-tactil.web.ts`, que pregunta al almacén único de
 * `escenas/paseo/aparato.ts` —el mismo que la Sala—, porque `/jugar` también se abre en un ordenador
 * y allí la palanca y «Correr» sobran: se anda con W A S D y Mayúsculas (27-sep-2026, Miguel).
 *
 * Metro elige un fichero u otro; las pantallas de juego no preguntan la plataforma (`verify:sala`).
 */
export function usarAparatoTactil(): boolean {
  return true;
}
