/**
 * Registro del material imprimible.
 *
 * Estos documentos NO se guardan en el índice de la partida: se componen al
 * vuelo desde el catálogo de `shared/documents.ts`, de modo que aparecen también
 * en partidas generadas antes de que existieran, sin obligar a nadie a
 * regenerar nada ni a gastar tokens.
 */
import { printableDocInfo, resolveGmMode } from '../../../../shared/documents';
import { vistaGm } from '../contexto';
import { cartaImprevistos } from './cartaImprevistos';
import { cartelesSala } from './cartelesSala';
import { desenlace } from './desenlace';
import { hojaSolucion } from './hojaSolucion';
import { matrizConocimiento } from './matrizConocimiento';
import { etiquetasSobres } from './etiquetasSobres';
import { guiaPreparador } from './guiaPreparador';
import { hojasInvestigacion } from './hojasInvestigacion';
import { indicePaquete } from './indicePaquete';
import { informeValidacion } from './informeValidacion';
import { lineaTemporal } from './lineaTemporal';
import { manualGm } from './manualGm';
import { tarjetasEnsobrar } from './tarjetasEnsobrar';
import type { PrintableDocId } from '../../../../shared/documents';
import type { VistaGm } from '../contexto';
import type {
  DocumentRenderOptions,
  GameSession,
  PlayerDocument,
  Plot,
} from '../../../../shared/types';

type Plantilla = (
  game: GameSession,
  plot: Plot,
  vista: VistaGm,
  opciones: DocumentRenderOptions,
) => string;

const PLANTILLAS: Record<PrintableDocId, Plantilla> = {
  'indice-paquete': (game, plot, _vista, opciones) => indicePaquete(game, plot, opciones),
  'manual-gm': manualGm,
  'hojas-investigacion': (_game, plot, _vista, opciones) => hojasInvestigacion(plot, opciones),
  'carteles-sala': (game, plot, _vista, opciones) => cartelesSala(game, plot, opciones),
  'linea-temporal': (_game, plot, _vista, opciones) => lineaTemporal(plot, opciones),
  'etiquetas-sobres': (game, plot, _vista, opciones) => etiquetasSobres(game, plot, opciones),
  'carta-imprevistos': cartaImprevistos,
  'tarjetas-ensobrar': tarjetasEnsobrar,
  'guia-preparador': (game, plot, _vista, opciones) => guiaPreparador(game, plot, opciones),
  'hoja-solucion': (game, plot, _vista, opciones) => hojaSolucion(game, plot, opciones),
  'matriz-conocimiento': (game, plot, _vista, opciones) => matrizConocimiento(game, plot, opciones),
  desenlace: (game, plot, _vista, opciones) => desenlace(game, plot, opciones),
  'informe-validacion': (game, plot, _vista, opciones) => informeValidacion(game, plot, opciones),
};

/** Documentos que necesitan al menos una sala para tener sentido. */
const NECESITAN_SALAS = new Set<PrintableDocId>(['carteles-sala']);

/**
 * Compone uno de los documentos imprimibles. Devuelve null si la partida no
 * tiene trama, el identificador no está en el catálogo, o el documento no
 * aplica al modo de dirección de esta partida —la guía del preparador no existe
 * cuando el Game Master lo prepara todo él—.
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
  if (!info.modes.includes(resolveGmMode(game.settings))) return null;
  if (NECESITAN_SALAS.has(id) && game.rooms.length === 0) return null;

  const plantilla = PLANTILLAS[id];
  if (!plantilla) return null;

  return {
    suspectId: id,
    title: info.name,
    html: plantilla(game, plot, vistaGm(game), opciones),
  };
}
