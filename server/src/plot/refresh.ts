/**
 * Poner al dia una partida cuya trama se quedo vieja. GENERICO.
 *
 * Cuando quien prepara toca los datos despues de generar —añade a alguien,
 * borra un lugar, cambia un objeto— la trama y los dosieres dejan de
 * corresponderse con la partida. Esto lo detecta (`computeStaleness`), poda lo
 * que se pueda podar gratis, y le pide al JUEGO que ponga al dia lo que solo el
 * sabe escribir.
 *
 * ═══ ESTE FICHERO TENIA DENTRO LA MITAD DE CLUEDO ═══
 *
 * Cuatrocientas lineas: `ampliarTrama`, el prompt de ampliacion, la reparacion
 * local de la solucion y los normalizadores de la respuesta del modelo. Todo de
 * CLUEDO, en el camino por el que pasa CUALQUIER juego que se quede viejo.
 *
 * Se ha ido a `cluedo-ampliacion.ts`. Aqui queda el procedimiento: mirar que
 * esta desincronizado, rehacer el plano, podar, preguntarle al juego, guardar.
 */
import type {
  GameSession,
  GenerateStreamEvent,
  Plot,
  PlotCharacter,
  PlotClue,
  TimelineEvent,
} from '../../../shared/types';
import { esElSenalado, lugaresDe, manifiestoDe, manifiestoSiExiste, personasDe } from '../../../shared/juegos';
import type { StalenessReport } from '../../../shared/staleness';
import { computeStaleness } from '../../../shared/staleness';
import { ampliacionDe } from '../juegos/ampliaciones';
import { juegoDe, repararRespuestas } from '../juegos/solucion';
import { partidaParaElTaller } from '../live/proyeccion';
import { volcarGasto } from '../gasto/contador';
import { DEMO_MODE } from '../config';
import { getStore } from '../db/store';
import { generateBoardLayout } from '../board/generator';
import { renderDocumentIndex } from '../docs/renderer';

/*
 * El mismo `Emitir` que usa la tuberia de generacion. Estaba declarado dos
 * veces, una en cada fichero, con el mismo cuerpo: dos definiciones de un
 * contrato que comparten los tres generadores y los tres ampliadores.
 */
import type { Emitir } from './pipeline';

// ---------------------------------------------------------------------------
// Entrada principal
// ---------------------------------------------------------------------------

/** Pone al día la partida dada, regenerando solo lo estrictamente necesario. */
export async function runRefresh(game: GameSession, emit: Emitir): Promise<void> {
  const store = getStore();
  try {
    // ---------- Diagnóstico: la fuente de verdad es shared/staleness.ts ----------
    const informe = computeStaleness(game);

    if (!informe.isStale) {
      // Todo cuadra: ni una llamada a la API ni una regeneración de más.
      // Solo se deshace el estado 'generating' que marcó la ruta al empezar.
      game.status = informe.hasPlot ? 'ready' : 'draft';
      const intacta = await store.saveGame(game);
      emit({ type: 'done', game: partidaParaElTaller(intacta) });
      return;
    }

    // ---------- Etapa 1: tablero ----------
    emit({ type: 'stage', stage: 'board', label: 'Redibujando el plano de la mansión…' });

    // Resumen en español de lo que se va a arreglar (sirve de progreso en el overlay).
    for (const linea of informe.summary) {
      emit({ type: 'text', delta: `· ${linea}\n` });
    }

    if (informe.boardOutdated) {
      // Determinista: se reconstruye con las salas actuales.
      // En modo 'aerial' no hay rejilla que rehacer (manda la foto con chinchetas),
      // y por eso `boardOutdated` nunca es cierto en ese modo.
      game.board = generateBoardLayout(lugaresDe(game), manifiestoDe(game.settings?.juego).rotuloCentralDelPlano);
    }

    // ---------- Etapa 2: poda local (gratis, sin IA) ----------
    if (game.plot) {
      podarTrama(game.plot, game);
    }

    /*
     * ---------- Etapa 3: poner al día la trama ----------
     *
     * QUIÉN LA PONE AL DÍA DEPENDE DEL JUEGO, y no dependía de nada: esto
     * llamaba a `ampliarTrama`, que es de CLUEDO, para cualquier partida. Sobre
     * una de El Misterio de la Momia le pasaba al modelo la solución del caso
     * —el motivo NOMBRA a quien rompió el sello— para que escribiera coartadas
     * que acaban impresas en la hoja de todo el mundo.
     *
     * Un juego sin ampliación registrada se salta esta etapa entera. Es lo
     * correcto: mejor que le falte color a que le sobre el de otro juego.
     */
    /*
     * ---------- Etapa 3a: la solución rota, para CUALQUIER juego ----------
     *
     * Estaba dentro de la ampliación de CLUEDO, así que solo CLUEDO se
     * reparaba. Una partida de la Momia a la que se le quita de la lista a
     * quien rompió el sello se quedaba con un `saqueador` que ya no existe:
     * `runRefresh` emitía `done`, la marcaba `ready` y dejaba
     * `brokenSolution: ['saqueador']` intacto. Nadie puede ganar una partida
     * cuya respuesta no está en la mesa, y no había ni un aviso.
     *
     * `repararRespuestas` ya era genérica —recorre los ejes del manifiesto—,
     * así que solo le faltaba que alguien la llamara. Va ANTES del reparto por
     * juego para que cada ampliación escriba su texto sabiendo ya a quién
     * señala la solución.
     *
     * Lo que esto NO arregla, y conviene saberlo: en un juego cuya ampliación
     * no reescriba el motivo, el texto seguirá describiendo a la persona
     * anterior. Es una partida jugable con una frase desalineada, que es
     * bastante mejor que una partida sin solución.
     */
    if (informe.brokenSolution.length > 0 && game.plot) {
      repararIdsSolucion(game.plot, game);
    }

    const ampliar = ampliacionDe(game.settings?.juego);
    if (informe.needsAgent && game.plot && ampliar) {
      emit({ type: 'stage', stage: 'plot', label: 'Escribiendo los personajes que faltan…' });
      await ampliar(game, game.plot, informe, emit);
    }

    // ---------- Etapa 4: dosieres ----------
    emit({ type: 'stage', stage: 'documents', label: 'Reimprimiendo los dosieres…' });
    // Siempre: es gratis y de paso arregla los dosieres sobrantes y los que faltan.
    // Solo el índice: el HTML se genera al pedir cada dosier (ver renderer.ts).
    game.documents = renderDocumentIndex(game);

    game.status = 'ready';
    const guardada = await store.saveGame(game);
    emit({ type: 'done', game: partidaParaElTaller(guardada) });
    // Y se vuelca lo apuntado, ya con todo guardado: si se hiciera antes, el
    // guardado de aqui arriba se lo llevaria por delante.
    await volcarGasto(game.id);
  } catch (error) {
    console.error('[refresh] fallo al poner al día la partida:', error);
    await restaurarEstado(game.id);
    emit({
      type: 'error',
      message:
        error instanceof Error && error.message
          ? error.message
          : 'Error desconocido al poner al día la partida.',
    });
  }
}

/**
 * Deja la partida fuera de 'generating' sin arrastrar los cambios a medio
 * aplicar: se relee la versión guardada y solo se corrige su estado.
 */
async function restaurarEstado(gameId: string): Promise<void> {
  try {
    const store = getStore();
    const almacenada = await store.getGame(gameId);
    if (!almacenada || almacenada.status !== 'generating') return;
    // Con trama, la partida sigue siendo jugable (aunque desincronizada).
    almacenada.status = almacenada.plot ? 'ready' : 'draft';
    await store.saveGame(almacenada);
  } catch {
    // Si tampoco se puede guardar, el error original ya es suficiente aviso.
  }
}

// ---------------------------------------------------------------------------
// Poda local — elimina lo que apunta a entidades borradas
// ---------------------------------------------------------------------------

/**
 * Fragmentos por los que una descripción puede citar a un personaje: su nombre
 * completo de ficción y el nombre real que lo encabeza (en las tramas demo el
 * nombre de personaje es «Nombre Real + apellido de color»).
 */
/**
 * Sustituye los ids rotos de la solución por otros que existan.
 *
 * SE QUEDA EN EL LADO COMÚN, aunque venía dentro del bloque de CLUEDO. Va por
 * el manifiesto (`juegoDe`) y por `repararRespuestas`, que recorre los ejes que
 * declare el juego: no nombra ni un campo de CLUEDO. Lo único que hace de más
 * es preferir, para el eje que señala a alguien de la mesa, a quien YA tenga
 * personaje escrito —así lo que se decide sigue apoyándose en una historia que
 * existe, en vez de en el primero de la lista— y eso vale igual en una
 * expedición y en un cruce de montaña.
 */
function repararIdsSolucion(plot: Plot, game: GameSession): void {
  const manifiesto = juegoDe(game);
  repararRespuestas(plot, game, (categoria, candidatas) => {
    const cat = manifiesto.categorias.find((c) => c.id === categoria);
    if (!cat?.sonJugadores) return undefined;
    return candidatas.find((e) => plot.characters.some((p) => p.suspectId === e.id));
  });
}

function nombresCitables(characterName: string): string[] {
  const limpio = characterName.trim();
  if (limpio.length === 0) return [];
  const partes = limpio.split(/\s+/);
  const candidatos = [limpio];
  if (partes.length > 1) candidatos.push(partes.slice(0, -1).join(' '));
  return candidatos.filter((nombre) => nombre.length >= 3);
}

/** Poda gratuita: fuera personajes huérfanos, pistas sin sala y citas imposibles. */
function podarTrama(plot: Plot, game: GameSession): void {
  const idsSospechosos = new Set(personasDe(game).map((persona) => persona.id));
  const idsSalas = new Set(lugaresDe(game).map((lugar) => lugar.id));

  // Se calculan ANTES de podar: después ya no sabríamos a quién citaba la cronología.
  const nombresBorrados = plot.characters
    .filter((personaje) => !idsSospechosos.has(personaje.suspectId))
    .flatMap((personaje) => nombresCitables(personaje.characterName))
    .map((nombre) => nombre.toLowerCase());

  // Personajes de jugadores que ya no participan.
  plot.characters = plot.characters.filter((personaje) =>
    idsSospechosos.has(personaje.suspectId),
  );

  // Pistas escondidas en salas que ya no existen (las que no citan sala se conservan).
  plot.clues = plot.clues.filter(
    (pista) => pista.roomId === undefined || idsSalas.has(pista.roomId),
  );

  // Cronología: se quitan los ids inexistentes; el evento solo se elimina si se
  // queda sin nadie Y además su descripción hablaba de alguien que ya no juega.
  const cronologia: TimelineEvent[] = [];
  for (const evento of plot.timeline) {
    const vivos = evento.suspectIds.filter((id) => idsSospechosos.has(id));
    if (vivos.length === 0 && citaANombreBorrado(evento.description, nombresBorrados)) {
      continue;
    }
    cronologia.push({ ...evento, suspectIds: vivos });
  }
  plot.timeline = cronologia;

  /*
   * Material impreso: un giro dirigido a alguien que ya no juega no se puede
   * entregar, y uno dirigido a quien resulta ser la respuesta lo delataría si la
   * solución se ha reasignado al reparar la trama.
   *
   * POR EL EJE DEL JUEGO, NO POR `culpableDe`. Esta función poda la trama de
   * CUALQUIER juego —`refresh.ts:110` la llama bajo un simple `if (game.plot)`,
   * sin mirar a qué se juega— y `culpableDe` lee `respuestas['culpable']`, que
   * es el eje de CLUEDO. En El Misterio de la Momia la respuesta vive en
   * `respuestas['saqueador']`, así que devolvía cadena vacía y la comparación no
   * excluía a nadie.
   *
   * Hoy eso no rompía nada visible —no hay `suspectId` vacío, así que el filtro
   * simplemente no filtraba— y por eso llevaba aquí sin que saltara ninguna
   * alarma. Pero la protección que esta línea existe para dar, la de que un giro
   * no delate a quien resulta ser, NO ESTABA OCURRIENDO en dos de los tres
   * juegos. `esElSenalado` deduce el eje de que su categoría sea la de los
   * jugadores, así que funciona en los tres y en el que venga.
   */
  if (plot.material) {
    const manifiesto = manifiestoSiExiste(game.settings?.juego);
    plot.material.twists = plot.material.twists.filter(
      (giro) =>
        idsSospechosos.has(giro.suspectId) &&
        !(manifiesto && esElSenalado(manifiesto, plot.solution.respuestas, giro.suspectId)),
    );
  }
}

/** ¿La descripción menciona a alguno de los personajes eliminados? */
function citaANombreBorrado(descripcion: string, nombresBorrados: string[]): boolean {
  if (nombresBorrados.length === 0) return false;
  const texto = descripcion.toLowerCase();
  return nombresBorrados.some((nombre) => texto.includes(nombre));
}
