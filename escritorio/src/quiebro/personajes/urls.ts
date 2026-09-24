/// <reference types="vite/client" />
/**
 * DÓNDE ESTÁ CADA FICHERO DEL REPARTO una vez empaquetado: los `.glb` de `recursos/` entran por `?url`
 * de Vite (se copian al paquete con su huella y se piden al usarlos, no van dentro del JavaScript), y el
 * manifiesto entra como JSON.
 *
 * ═══ POR QUÉ UN `glob` Y NO UN `import` POR FICHERO ═══
 *
 * El manifiesto manda: «lee siempre este manifiesto y no escribas nombres de fichero a mano». Con un
 * `import x from '../recursos/desvelado-hombre.glb?url'` por figura, el día que el reparto añada la
 * figura de la Celadora habría que acordarse de añadir su línea aquí. Con el `glob`, Vite empaqueta lo
 * que haya en la carpeta y aquí se busca por el nombre que diga el manifiesto; si nombra un fichero que
 * no está, se dice con su nombre.
 *
 * Sólo para el navegador: `import.meta.glob` no existe en Node. El comprobador pasa su propio lector.
 */
import crudo from '../recursos/reparto.json';

const URLS: Readonly<Record<string, string>> = import.meta.glob<string>('../recursos/*.glb', { query: '?url', import: 'default', eager: true });

/** La URL empaquetada de un fichero del reparto, por el nombre que usa el manifiesto. */
export function urlDelRecurso(archivo: string): string {
  const url = URLS[`../recursos/${archivo}`];
  if (url === undefined) throw new Error(`El reparto nombra «${archivo}» y no está en recursos/`);
  return url;
}

/** El manifiesto tal cual (sin leer: `leerElReparto` lo valida). */
export const REPARTO_CRUDO: unknown = crudo;
