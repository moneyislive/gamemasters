/**
 * Registro del material imprimible.
 *
 * Estos documentos NO se guardan en el índice de la partida: se componen al
 * vuelo desde el catálogo de `shared/documents.ts`, de modo que aparecen también
 * en partidas generadas antes de que existieran, sin obligar a nadie a
 * regenerar nada ni a gastar tokens.
 */
import { printableDocInfo } from '../../../../shared/documents';
import { cartelesSala } from './cartelesSala';
import { etiquetasSobres } from './etiquetasSobres';
import { hojasInvestigacion } from './hojasInvestigacion';
import { indicePaquete } from './indicePaquete';
import { informeValidacion } from './informeValidacion';
import { lineaTemporal } from './lineaTemporal';
import type { PrintableDocId } from '../../../../shared/documents';
import type {
  DocumentRenderOptions,
  GameSession,
  PlayerDocument,
  Plot,
} from '../../../../shared/types';

type Plantilla = (game: GameSession, plot: Plot, opciones: DocumentRenderOptions) => string;

const PLANTILLAS: Record<PrintableDocId, Plantilla> = {
  'indice-paquete': indicePaquete,
  'hojas-investigacion': (_game, plot, opciones) => hojasInvestigacion(plot, opciones),
  'carteles-sala': cartelesSala,
  'linea-temporal': (_game, plot, opciones) => lineaTemporal(plot, opciones),
  'etiquetas-sobres': etiquetasSobres,
  'informe-validacion': informeValidacion,
};

/** Documentos que necesitan al menos una sala para tener sentido. */
const NECESITAN_SALAS = new Set<PrintableDocId>(['carteles-sala']);

/**
 * Compone uno de los documentos imprimibles. Devuelve null si la partida no
 * tiene trama todavía o el identificador no está en el catálogo.
 */
export function renderPrintableDocument(
  game: GameSession,
  id: PrintableDocId,
  opciones: DocumentRenderOptions = {},
): PlayerDocument | null {
  const plot = game.plot;
  if (!plot) return null;
  const info = printableDocInfo(id);
  if (!info) return null;
  if (NECESITAN_SALAS.has(id) && game.rooms.length === 0) return null;

  const plantilla = PLANTILLAS[id];
  if (!plantilla) return null;

  return { suspectId: id, title: info.name, html: plantilla(game, plot, opciones) };
}
