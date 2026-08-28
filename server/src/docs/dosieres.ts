/**
 * Quién compone el dosier de UNA persona en cada juego.
 *
 * EL TALLER LOS REPARTE DE UNO EN UNO. En el paquete impreso los dosieres de un
 * juego propio van en un solo fichero —se imprime de una vez y se recorta— pero
 * en el taller cada persona tiene su sobre: se abre el de Ana, se le manda por
 * correo, se descarga en PDF. Esa puerta pasa por `renderPlayerDocument`.
 *
 * LO QUE PASABA. `renderPlayerDocument` tiene tres caminos y ninguno miraba el
 * juego, así que por ahí salía el dosier de CLUEDO —la víctima, los
 * sospechosos, «los objetos del crimen», los pasadizos secretos— sobre datos de
 * una expedición, y sin el don, que la Momia declara como sección obligatoria.
 * Quitar los genéricos del ZIP tapó la mitad del agujero; esta es la otra.
 *
 * POR QUÉ UN REGISTRO Y NO UN IMPORT. Porque `renderer.ts` importando los
 * imprimibles cerraría un ciclo —`imprimibles/informeValidacion.ts` ya importa
 * del renderizador— y en este código las sorpresas de carga de módulos han
 * costado caras dos veces. El registro no importa a nadie y nadie lo importa
 * más que para dar de alta o para preguntar.
 */
import type { GameSession, DocumentRenderOptions, Plot } from '../../../shared/types';
import { manifiestoDe } from '../../../shared/juegos';
import type { JuegoId } from '../../../shared/juegos';

/** Compone el dosier de una persona. Devuelve el HTML, o null si no puede. */
export type DosierDeUno = (
  game: GameSession,
  plot: Plot,
  suspectId: string,
  opciones: DocumentRenderOptions,
) => string | null;

/** Anclado al ámbito global, como los demás registros y por lo mismo. */
const LLAVE = Symbol.for('gamemasters.docs.dosieres');
const global_ = globalThis as unknown as Record<symbol, Record<string, DosierDeUno>>;
const DOSIERES: Record<JuegoId, DosierDeUno> = global_[LLAVE] ?? (global_[LLAVE] = {});

/** Da de alta quién compone el dosier de una persona en este juego. */
export function registrarDosierDeUno(juego: JuegoId, fn: DosierDeUno): void {
  DOSIERES[juego] = fn;
}

/**
 * El dosier propio de este juego, si lo tiene.
 *
 * Se resuelve con el manifiesto y no con el campo crudo: las partidas de CLUEDO
 * de siempre no llevan `settings.juego` escrito, y buscar por el campo sería no
 * encontrar nada para ellas.
 */
export function dosierPropioDe(juego: JuegoId | undefined): DosierDeUno | undefined {
  return DOSIERES[manifiestoDe(juego).id];
}

/** Los juegos con dosier propio dado de alta. Lo usa la comprobación. */
export function juegosConDosierPropio(): string[] {
  return Object.keys(DOSIERES);
}
