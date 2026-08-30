/**
 * Quién compone los dosieres de cada juego.
 *
 * EL TALLER LOS REPARTE DE UNO EN UNO. En el paquete impreso los dosieres de un
 * juego propio van en un solo fichero —se imprime de una vez y se recorta— pero
 * en el taller cada persona tiene su sobre: se abre el de Ana, se le manda por
 * correo, se descarga en PDF. Esa puerta pasa por `renderPlayerDocument`.
 *
 * LO QUE PASABA. `renderPlayerDocument` tenía tres caminos y ninguno miraba el
 * juego, así que por ahí salía el dosier de CLUEDO —la víctima, los
 * sospechosos, «los objetos del crimen», los pasadizos secretos— sobre datos de
 * una expedición, y sin el don, que la Momia declara como sección obligatoria.
 * Quitar los genéricos del ZIP tapó la mitad del agujero; este registro fue la
 * otra mitad.
 *
 * ═══ Y POR QUÉ AHORA ES MÁS QUE «EL DOSIER DE UNA PERSONA» ═══
 *
 * Porque quedaban dos cosas cableadas en `renderer.ts`, y las dos eran de
 * CLUEDO:
 *
 *   · EL TÍTULO. `tituloJugador(plot, sospechoso)` decidía cómo se llama el
 *     dosier de alguien en el índice de la partida. Vale para los tres juegos
 *     de hoy por casualidad —los tres dicen «Dosier de Fulano»— y no tiene por
 *     qué valer para el cuarto.
 *
 *   · LOS DOSIERES QUE NO SON DE NADIE. El de quien dirige y el sobre sellado
 *     de la solución. Son de CLUEDO: hablan de la víctima y del arma. Se
 *     emitían con un `if (!manifiesto.dosieresPropios)`, o sea con el núcleo
 *     preguntando «¿eres de los que traen los suyos?» — que es la forma
 *     educada de decir «¿eres CLUEDO o eres una excepción?».
 *
 * Ahora CLUEDO los registra como los demás. El núcleo no tiene un caso por
 * defecto: si un juego no registra nada, no hay dosieres, y eso se ve.
 *
 * POR QUÉ UN REGISTRO Y NO UN IMPORT. Porque `renderer.ts` importando los
 * imprimibles cerraría un ciclo —`imprimibles/cluedo/informeValidacion.ts` ya
 * importa del renderizador— y en este código las sorpresas de carga de módulos
 * han costado caras dos veces. El registro no importa a nadie y nadie lo
 * importa más que para dar de alta o para preguntar.
 */
import type { GameSession, DocumentRenderOptions, Plot } from '../../../shared/types';
import { manifiestoSiExiste } from '../../../shared/juegos';
import type { JuegoId } from '../../../shared/juegos';

/** Compone el dosier de una persona. Devuelve el HTML, o null si no puede. */
export type DosierDeUno = (
  game: GameSession,
  plot: Plot,
  participanteId: string,
  opciones: DocumentRenderOptions,
) => string | null;

/**
 * Un dosier que no es de nadie de la mesa.
 *
 * El de quien dirige, el sobre sellado con la solución, la guía de la velada.
 * Llevan un id fijo que no es el de ninguna persona —`gm`, `solution`— y por
 * ahí los pide el taller.
 *
 * El HTML es perezoso: el índice de la partida guarda solo los títulos, porque
 * cada dosier incrusta las fotos en base64 y con una decena de personas la
 * partida pasaba del límite de 16 MB por documento de MongoDB.
 */
export interface DosierDeLaMesa {
  id: string;
  titulo: string;
  html: (opciones: DocumentRenderOptions) => string;
}

export interface DosieresDeJuego {
  /** Cómo se llama en el índice el dosier de una persona. */
  tituloDeUno: (game: GameSession, plot: Plot, participanteId: string) => string;
  /** El dosier de una persona. */
  deUno: DosierDeUno;
  /** Los que no son de nadie. Vacío o ausente si el juego no tiene. */
  deLaMesa?: (game: GameSession, plot: Plot) => DosierDeLaMesa[];
}

/** Anclado al ámbito global, como los demás registros y por lo mismo. */
const LLAVE = Symbol.for('gamemasters.docs.dosieres');
const global_ = globalThis as unknown as Record<symbol, Record<string, DosieresDeJuego>>;
const DOSIERES: Record<JuegoId, DosieresDeJuego> = global_[LLAVE] ?? (global_[LLAVE] = {});

/** Da de alta quién compone los dosieres de este juego. */
export function registrarDosieres(juego: JuegoId, dosieres: DosieresDeJuego): void {
  DOSIERES[juego] = dosieres;
}

/**
 * Los dosieres de este juego, si los tiene.
 *
 * Se resuelve con el manifiesto y no con el campo crudo: las partidas de CLUEDO
 * de siempre no llevan `settings.juego` escrito, y buscar por el campo sería no
 * encontrar nada para ellas. Blando a propósito —`manifiestoSiExiste`— porque
 * quien compone documentos puede quedarse sin componer ninguno; quien no puede
 * seguir sin saberlo es la ruta que intente jugar la partida, y esa sí falla.
 */
export function dosieresDe(juego: JuegoId | undefined): DosieresDeJuego | undefined {
  const manifiesto = manifiestoSiExiste(juego);
  return manifiesto ? DOSIERES[manifiesto.id] : undefined;
}

/** Los juegos con dosieres dados de alta. Lo usa la comprobación. */
export function juegosConDosieres(): string[] {
  return Object.keys(DOSIERES);
}
