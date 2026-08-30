/**
 * Compone un documento imprimible. SIN SABER A QUÉ SE JUEGA.
 *
 * Estos documentos NO se guardan en el índice de la partida: se componen al
 * vuelo desde el catálogo del juego, de modo que aparecen también en partidas
 * generadas antes de que existieran, sin obligar a nadie a regenerar nada ni a
 * gastar tokens.
 *
 * ═══ ESTE FICHERO ERA LA TABLA ═══
 *
 * Tenía dentro un `Record<PrintableDocId, Plantilla>` exhaustivo con las
 * veintinueve plantillas de los tres juegos, y por tanto veintiocho imports:
 * `momia/hojaSellado`, `sombras/tablaRastro`, `cartelesCamara`… Un fichero del
 * núcleo, que se compila para todos, sabiendo de memoria el material de cada
 * juego.
 *
 * Ahora no importa ninguno. Cada juego registra las suyas con
 * `registrarImprimibles` y aquí solo queda el procedimiento: mirar la ficha del
 * documento en el catálogo del juego, comprobar que aplica, pedir la plantilla
 * al registro y componer. El día que se instale un juego con cuarenta
 * documentos, este fichero no cambia.
 */
import { plantillaDe } from './registro';
import { printableDocInfo, resolveGmMode } from '../../../../shared/documents';
import { lugaresDe, manifiestoDe } from '../../../../shared/juegos';
import { vistaGm } from '../contexto';
import type { PrintableDocId, PrintableDocInfo } from '../../../../shared/documents';
import type { DocumentRenderOptions, GameSession, PlayerDocument } from '../../../../shared/types';

/**
 * La ficha de un documento, buscada en el catálogo DEL JUEGO que se juega.
 *
 * Sin el catálogo, `printableDocInfo` mira `PRINTABLE_DOCS`, que son los trece
 * de CLUEDO: los ocho de la Momia no existían y `renderPrintableDocument`
 * devolvía null para todos ellos, con lo que el paquete salía sin un solo
 * documento del juego.
 */
function fichaDelDocumento(game: GameSession, id: PrintableDocId): PrintableDocInfo | undefined {
  return printableDocInfo(id, manifiestoDe(game.settings?.juego).documentos);
}

/**
 * Compone uno de los documentos imprimibles. Devuelve null si la partida no
 * tiene trama, el identificador no está en el catálogo del juego, el documento
 * no aplica al modo de dirección de esta partida —la guía del preparador no
 * existe cuando el Game Master lo prepara todo él— o el juego no tiene lugares
 * y el documento los necesita.
 */
export function renderPrintableDocument(
  game: GameSession,
  id: PrintableDocId,
  opciones: DocumentRenderOptions = {},
): PlayerDocument | null {
  const plot = game.plot;
  if (!plot) return null;
  const info = fichaDelDocumento(game, id);
  if (!info) return null;
  if (!info.modes.includes(resolveGmMode(game.settings))) return null;
  /*
   * Antes esto era un `Set` con tres ids escritos aquí —uno por juego—, o sea
   * el núcleo sabiendo que los carteles de cámara son de la Momia. Ahora lo
   * declara cada documento en su ficha.
   */
  if (info.necesitaLugares && lugaresDe(game).length === 0) return null;

  const plantilla = plantillaDe(manifiestoDe(game.settings?.juego).id, id);
  if (!plantilla) return null;

  return {
    id,
    title: info.name,
    html: plantilla(game, plot, vistaGm(game), opciones),
  };
}
