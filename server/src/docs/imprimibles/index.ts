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
import { cartelesCamara } from './momia/cartelesCamara';
import { dosierExpedicionario } from './momia/dosierExpedicionario';
import { fragmentosPapiro } from './momia/fragmentosPapiro';
import { guiaExpedicion } from './momia/guiaExpedicion';
import { hojaSellado } from './momia/hojaSellado';
import { informePapiro } from './momia/informePapiro';
import { papiroSellado } from './momia/papiroSellado';
import { tablaMarcas } from './momia/tablaMarcas';
import { tarjetasEnsobrar } from './tarjetasEnsobrar';
import { manifiestoDe } from '../../../../shared/juegos';
import type { PrintableDocId, PrintableDocInfo } from '../../../../shared/documents';
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

  /*
   * EL MISTERIO DE LA MOMIA. Otra imprenta —papiro, tinta sepia y almagre— y
   * otra carpeta: ver `momia/estilo.ts` para por qué está al lado de la de
   * CLUEDO en vez de generalizada.
   */
  'guia-expedicion': (game, plot, _vista, opciones) => guiaExpedicion(game, plot, opciones),
  'dosier-expedicionario': (game, plot, _vista, opciones) => dosierExpedicionario(game, plot, opciones),
  'fragmentos-papiro': (game, plot, _vista, opciones) => fragmentosPapiro(game, plot, opciones),
  'carteles-camara': (game, plot, _vista, opciones) => cartelesCamara(game, plot, opciones),
  'hoja-sellado': (game, plot, _vista, opciones) => hojaSellado(game, plot, opciones),
  'tabla-marcas': (game, plot, _vista, opciones) => tablaMarcas(game, plot, opciones),
  'papiro-sellado': (game, plot, _vista, opciones) => papiroSellado(game, plot, opciones),
  'informe-papiro': (game, plot, _vista, opciones) => informePapiro(game, plot, opciones),
};

/** Documentos que necesitan al menos una sala para tener sentido. */
const NECESITAN_SALAS = new Set<PrintableDocId>(['carteles-sala', 'carteles-camara']);

/**
 * La ficha de un documento, buscada en el catálogo DEL JUEGO que se juega.
 *
 * `printableDocInfo` mira `PRINTABLE_DOCS`, que son los trece de CLUEDO: con
 * ella, los diez de la Momia no existían y `renderPrintableDocument` devolvía
 * null para todos ellos —el paquete salía sin un solo documento del juego—.
 * El manifiesto de CLUEDO declara `documentos: PRINTABLE_DOCS`, así que para
 * CLUEDO esto devuelve exactamente lo mismo que antes, byte por byte.
 */
function fichaDelDocumento(game: GameSession, id: PrintableDocId): PrintableDocInfo | undefined {
  return (
    manifiestoDe(game.settings?.juego).documentos.find((d) => d.id === id) ?? printableDocInfo(id)
  );
}

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
  const info = fichaDelDocumento(game, id);
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
