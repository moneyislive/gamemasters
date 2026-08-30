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
import { CLUEDO, ejes as ejesDe, entidadesDe, lugaresDe, manifiestoSiExiste, personasDe } from './juegos';
import type { EjeId } from './juegos';

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

  /**
   * Ejes cuya respuesta apunta a algo que ya no existe.
   *
   * Antes eran tres booleanos con nombre —asesino, arma y sala—, que es la
   * misma afirmación de siempre: que todo misterio tiene esos tres ejes.
   * Vacío significa que la solución es coherente.
   */
  brokenSolution: EjeId[];
  /** Pistas que apuntan a salas inexistentes. */
  brokenClues: number;
  /** Eventos de la cronología que citan a sospechosos inexistentes. */
  brokenTimelineEvents: number;
  /** El tablero no refleja las salas actuales. */
  boardOutdated: boolean;

  /**
   * Lo que la trama PROPIA del juego cita y ya no existe.
   *
   * Faltaba entero. Esta comprobación solo miraba la parte genérica de la trama
   * —personajes, pistas, cronología, tablero— y todo lo que es de cada juego
   * vive en `plot.delJuego`, que para el contrato general es `unknown`. Así que
   * en El Misterio de la Momia se podía borrar una cámara después de generar y
   * la plataforma decía que todo estaba en orden mientras las vigilias
   * apuntaban al vacío. Y los cinco ritos, que son el juego entero, no los
   * miraba nadie porque no tienen equivalente genérico.
   *
   * Vacío en CLUEDO siempre: no tiene trama propia que declarar.
   */
  brokenGameRefs: Array<{ categoria: string; id: string; donde: string }>;

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
    brokenSolution: [],
    brokenClues: 0,
    brokenTimelineEvents: 0,
    boardOutdated: false,
    brokenGameRefs: [],
    needsAgent: false,
    summary: [],
  };

  // Sin trama no hay nada que pueda estar obsoleto: es un borrador.
  if (!plot) return vacio;

  const idsSospechosos = new Set(personasDe(game).map((s) => s.id));
  const idsSalas = new Set(lugaresDe(game).map((r) => r.id));
  /*
   * Aqui habia un `idsArmas` que se calculaba y NO LO USABA NADIE. Codigo
   * muerto desde que la solucion se comprueba por ejes: `brokenSolution`
   * pregunta a `entidadesDe` por la categoria de cada eje, asi que las armas ya
   * no tenian que mirarse aparte.
   */
  const nombrePorId = new Map(personasDe(game).map((s) => [s.id, s.name]));

  const conPersonaje = new Set(plot.characters.map((c) => c.participanteId));
  const suspectsWithoutCharacter = personasDe(game)
    .filter((s) => !conPersonaje.has(s.id))
    .map((s) => s.id);
  const orphanCharacters = plot.characters
    .filter((c) => !idsSospechosos.has(c.participanteId))
    .map((c) => c.participanteId);

  // Los dosieres del Game Master ('gm') y del sobre sellado ('solution') no
  // corresponden a ningún sospechoso.
  const NO_JUGADORES = new Set(['gm', 'solution']);
  const conDosier = new Set(documents.map((d) => d.id));
  const suspectsWithoutDocument =
    documents.length === 0
      ? []
      : personasDe(game).filter((s) => !conDosier.has(s.id)).map((s) => s.id);
  const orphanDocuments = documents
    .filter((d) => !NO_JUGADORES.has(d.id) && !idsSospechosos.has(d.id))
    .map((d) => d.id);

  // Un eje está roto si su respuesta no señala a ninguna entidad viva de la
  // categoría que ese eje declara.
  // Las entidades vivas se piden POR CATEGORÍA, no por los tres campos de
  // CLUEDO. Tenerlos escritos a mano aquí hacía que cualquier otro juego
  // saliese con la solución rota; lo encontró la prueba del segundo juego.
  /*
   * BLANDO, porque esto lo pinta el taller en cada partida de la lista.
   *
   * Sin manifiesto no se puede decir si la solución está rota —los ejes salen
   * de él— y lo honesto es no decir nada, no inventarse que está bien ni
   * reventar la lista entera por una partida de un juego que aquí no está
   * instalado. Quien decide qué hacer con esa partida es la ruta que intente
   * abrirla, y esa sí falla.
   */
  const manifiesto = manifiestoSiExiste(game.settings?.juego);
  const brokenSolution = ejesDe(manifiesto ?? CLUEDO)
    .filter((eje) => {
      if (!manifiesto) return false;
      const id = plot.solution.respuestas[eje.id];
      if (!id) return true;
      return !entidadesDe(game, eje.categoria).some((e) => e.id === id);
    })
    .map((eje) => eje.id);

  const brokenClues = plot.clues.filter(
    (pista) => pista.lugarId !== undefined && !idsSalas.has(pista.lugarId),
  ).length;

  const brokenTimelineEvents = plot.timeline.filter((evento) =>
    evento.participanteIds.some((id) => !idsSospechosos.has(id)),
  ).length;

  // El tablero solo puede quedar obsoleto en el modo de rejilla generada.
  let boardOutdated = false;
  if (game.boardMode === 'generated') {
    const enTablero = new Set((game.board?.lugares ?? []).map((r) => r.lugarId));
    boardOutdated =
      !game.board ||
      enTablero.size !== idsSalas.size ||
      [...idsSalas].some((id) => !enTablero.has(id));
  }

  /*
   * Y lo que cita la trama propia del juego, si la hay.
   *
   * El juego DECLARA qué entidades cita —ver `referenciasDeLaTrama` en el
   * manifiesto— y aquí se mira si siguen existiendo. Al revés, con esta función
   * sabiendo de ritos y de cámaras, cada juego nuevo tendría que venir a
   * modificarla: es la forma segura de que al tercero se le olvide.
   *
   * Se quitan los repetidos porque una misma cámara borrada aparece en varias
   * vigilias y en varios hallazgos, y no hacen falta nueve avisos de lo mismo.
   */
  const vistas = new Set<string>();
  const brokenGameRefs = (manifiesto?.referenciasDeLaTrama?.(plot.delJuego) ?? [])
    .filter((cita) => !entidadesDe(game, cita.categoria).some((e) => e.id === cita.id))
    .filter((cita) => {
      const clave = `${cita.categoria}|${cita.id}`;
      if (vistas.has(clave)) return false;
      vistas.add(clave);
      return true;
    });

  const solucionRota = brokenSolution.length > 0;
  /*
   * Una referencia rota de la trama propia PIDE AL AGENTE. No se puede arreglar
   * en local: si falta la cámara de la tercera vigilia, hay que decidir cuál se
   * profana en su lugar, y eso es rehacer una parte de la trama.
   */
  const needsAgent =
    suspectsWithoutCharacter.length > 0 || solucionRota || brokenGameRefs.length > 0;

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
  // Un aviso por eje roto, con la pregunta que ese eje hace. Antes eran tres
  // frases escritas a mano; ahora las escribe el juego en su manifiesto.
  for (const ejeId of brokenSolution) {
    const eje = ejesDe(manifiesto ?? CLUEDO).find((e) => e.id === ejeId);
    summary.push(
      eje
        ? `La respuesta a «${eje.pregunta}» ya no señala a nada que exista: el caso no tiene solución.`
        : 'La solución del caso apunta a algo que ya no existe.',
    );
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
  // Con el «dónde» de cada una: «falta una entidad» no le dice nada a nadie,
  // «la cámara profanada en la vigilia 3 ya no existe» se entiende y se arregla.
  for (const cita of brokenGameRefs) {
    summary.push(`${cita.donde.charAt(0).toUpperCase()}${cita.donde.slice(1)} ya no existe.`);
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
    brokenGameRefs,
    needsAgent,
    summary,
  };
}
