/**
 * Detección de obsolescencia de una partida.
 *
 * Cuando el Game Master genera el misterio y después toca los datos (añade un
 * jugador, borra una sala, cambia un arma), la trama y los dosieres dejan de
 * corresponderse con la partida. Este módulo compara lo generado con el estado
 * actual y dice EXACTAMENTE qué está desincronizado y si arreglarlo requiere
 * al agente de IA o basta con trabajo local.
 *
 * Es una función pura y compartida: el servidor la usa para decidir qué
 * regenerar y el cliente para avisar en la interfaz. Una sola fuente de verdad.
 */
import type { GameSession } from './types';

export interface StalenessReport {
  /** ¿Hay algo desincronizado? Falso también si aún no se ha generado nada. */
  isStale: boolean;
  /** ¿La partida tiene ya una trama generada? */
  hasPlot: boolean;

  /** Sospechosos sin personaje en la trama (jugadores añadidos después). */
  suspectsWithoutCharacter: string[];
  /** Personajes de la trama cuyo sospechoso ya no existe (jugadores borrados). */
  orphanCharacters: string[];
  /** Sospechosos que no tienen dosier. */
  suspectsWithoutDocument: string[];
  /** Dosieres de personas que ya no juegan. */
  orphanDocuments: string[];

  /** La solución del crimen apunta a entidades que ya no existen. */
  brokenSolution: { murderer: boolean; weapon: boolean; room: boolean };
  /** Pistas que apuntan a salas inexistentes. */
  brokenClues: number;
  /** Eventos de la cronología que citan a sospechosos inexistentes. */
  brokenTimelineEvents: number;
  /** El tablero no refleja las salas actuales. */
  boardOutdated: boolean;

  /**
   * ¿Hace falta el agente de IA para arreglarlo? Cierto cuando faltan
   * personajes o la solución del crimen ha quedado rota. El resto (podar
   * sobras, rehacer el tablero, reimprimir dosieres) es trabajo local y
   * gratuito.
   */
  needsAgent: boolean;
  /** Frases en español listas para pintar en la interfaz. */
  summary: string[];
}

/** Enumera nombres en español, resumiendo si son muchos. */
function listarNombres(nombres: string[], maximo = 3): string {
  if (nombres.length === 0) return '';
  if (nombres.length <= maximo) {
    if (nombres.length === 1) return nombres[0]!;
    return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
  }
  const visibles = nombres.slice(0, maximo).join(', ');
  const resto = nombres.length - maximo;
  return `${visibles} y ${resto} más`;
}

/** Compara lo generado con el estado actual de la partida. */
export function computeStaleness(game: GameSession): StalenessReport {
  const plot = game.plot;
  const documents = game.documents ?? [];

  const vacio: StalenessReport = {
    isStale: false,
    hasPlot: Boolean(plot),
    suspectsWithoutCharacter: [],
    orphanCharacters: [],
    suspectsWithoutDocument: [],
    orphanDocuments: [],
    brokenSolution: { murderer: false, weapon: false, room: false },
    brokenClues: 0,
    brokenTimelineEvents: 0,
    boardOutdated: false,
    needsAgent: false,
    summary: [],
  };

  // Sin trama no hay nada que pueda estar obsoleto: es un borrador.
  if (!plot) return vacio;

  const idsSospechosos = new Set(game.suspects.map((s) => s.id));
  const idsSalas = new Set(game.rooms.map((r) => r.id));
  const idsArmas = new Set(game.weapons.map((w) => w.id));
  const nombrePorId = new Map(game.suspects.map((s) => [s.id, s.name]));

  const conPersonaje = new Set(plot.characters.map((c) => c.suspectId));
  const suspectsWithoutCharacter = game.suspects
    .filter((s) => !conPersonaje.has(s.id))
    .map((s) => s.id);
  const orphanCharacters = plot.characters
    .filter((c) => !idsSospechosos.has(c.suspectId))
    .map((c) => c.suspectId);

  // Los dosieres del Game Master ('gm') y del sobre sellado ('solution') no
  // corresponden a ningún sospechoso.
  const NO_JUGADORES = new Set(['gm', 'solution']);
  const conDosier = new Set(documents.map((d) => d.suspectId));
  const suspectsWithoutDocument =
    documents.length === 0
      ? []
      : game.suspects.filter((s) => !conDosier.has(s.id)).map((s) => s.id);
  const orphanDocuments = documents
    .filter((d) => !NO_JUGADORES.has(d.suspectId) && !idsSospechosos.has(d.suspectId))
    .map((d) => d.suspectId);

  const brokenSolution = {
    murderer: !idsSospechosos.has(plot.solution.murdererId),
    weapon: !idsArmas.has(plot.solution.weaponId),
    room: !idsSalas.has(plot.solution.roomId),
  };

  const brokenClues = plot.clues.filter(
    (pista) => pista.roomId !== undefined && !idsSalas.has(pista.roomId),
  ).length;

  const brokenTimelineEvents = plot.timeline.filter((evento) =>
    evento.suspectIds.some((id) => !idsSospechosos.has(id)),
  ).length;

  // El tablero solo puede quedar obsoleto en el modo de rejilla generada.
  let boardOutdated = false;
  if (game.boardMode === 'generated') {
    const enTablero = new Set((game.board?.rooms ?? []).map((r) => r.roomId));
    boardOutdated =
      !game.board ||
      enTablero.size !== idsSalas.size ||
      [...idsSalas].some((id) => !enTablero.has(id));
  }

  const solucionRota = brokenSolution.murderer || brokenSolution.weapon || brokenSolution.room;
  const needsAgent = suspectsWithoutCharacter.length > 0 || solucionRota;

  const summary: string[] = [];
  if (suspectsWithoutCharacter.length > 0) {
    const nombres = suspectsWithoutCharacter.map((id) => nombrePorId.get(id) ?? id);
    summary.push(
      suspectsWithoutCharacter.length === 1
        ? `${nombres[0]} se ha incorporado después y todavía no tiene personaje ni dosier.`
        : `${listarNombres(nombres)} se han incorporado después y todavía no tienen personaje ni dosier.`,
    );
  }
  if (orphanCharacters.length > 0) {
    summary.push(
      orphanCharacters.length === 1
        ? 'Hay un personaje en la trama cuyo jugador ya no participa.'
        : `Hay ${orphanCharacters.length} personajes en la trama cuyos jugadores ya no participan.`,
    );
  }
  if (brokenSolution.murderer) {
    summary.push('El asesino de la trama ya no está entre los sospechosos: el caso no tiene solución.');
  }
  if (brokenSolution.weapon) {
    summary.push('El arma del crimen ya no figura entre los objetos.');
  }
  if (brokenSolution.room) {
    summary.push('La sala donde ocurrió el crimen ya no existe.');
  }
  if (brokenClues > 0) {
    summary.push(
      brokenClues === 1
        ? 'Una pista está escondida en una sala que ya no existe.'
        : `${brokenClues} pistas están escondidas en salas que ya no existen.`,
    );
  }
  if (brokenTimelineEvents > 0) {
    summary.push(
      brokenTimelineEvents === 1
        ? 'Un momento de la cronología cita a alguien que ya no juega.'
        : `${brokenTimelineEvents} momentos de la cronología citan a personas que ya no juegan.`,
    );
  }
  if (boardOutdated) {
    summary.push('El plano del tablero no refleja las salas actuales.');
  }
  if (
    suspectsWithoutDocument.length > 0 &&
    suspectsWithoutCharacter.length === 0 // ya avisado arriba
  ) {
    summary.push(
      suspectsWithoutDocument.length === 1
        ? 'Falta imprimir un dosier.'
        : `Faltan ${suspectsWithoutDocument.length} dosieres por imprimir.`,
    );
  }
  if (orphanDocuments.length > 0) {
    summary.push(
      orphanDocuments.length === 1
        ? 'Sobra el dosier de alguien que ya no juega.'
        : `Sobran ${orphanDocuments.length} dosieres de personas que ya no juegan.`,
    );
  }

  const isStale = summary.length > 0;

  return {
    isStale,
    hasPlot: true,
    suspectsWithoutCharacter,
    orphanCharacters,
    suspectsWithoutDocument,
    orphanDocuments,
    brokenSolution,
    brokenClues,
    brokenTimelineEvents,
    boardOutdated,
    needsAgent,
    summary,
  };
}
