/**
 * Pipeline de generación de la partida: board → plot → documents.
 *
 * Ejecuta las tres etapas emitiendo eventos `GenerateStreamEvent` (incluidos
 * `done` / `error`), guarda la partida con el store y devuelve el control al
 * route handler, que cierra el SSE.
 */
import type { GameSession, GenerateStreamEvent, Plot } from '../../../shared/types';
import { DEMO_MODE } from '../config';
import { getStore } from '../db/store';
import { getAnthropicClient, resolveModel } from '../agent/anthropic';
import { generateBoardLayout } from '../board/generator';
import { renderDocumentIndex } from '../docs/renderer';
import { generateDemoPlot } from './demoPlot';
import { PLOT_SCHEMA } from './schema';
import { buildStyleBlock } from './style';

type Emitir = (evento: GenerateStreamEvent) => void;

const SYSTEM_TRAMA =
  'Eres un novelista de misterio experto en CLUEDO y en juegos de deducción en vivo. ' +
  'Diseñas tramas de asesinato ambientadas en los años 20: elegantes, coherentes y jugables, ' +
  'adaptadas a las personas reales y al espacio físico real que se te describe. ' +
  'Escribes siempre en español, con tono evocador pero preciso. ' +
  'Devuelves exclusivamente el JSON pedido, respetando los ids proporcionados.';

/** Ejecuta la generación completa sobre la partida dada. */
export async function runGeneration(game: GameSession, emit: Emitir): Promise<void> {
  const store = getStore();
  try {
    // ---------- Etapa 1: tablero ----------
    emit({ type: 'stage', stage: 'board', label: 'Trazando el plano de la mansión…' });
    if (game.boardMode === 'generated') {
      // Determinista: regenerar siempre refleja los últimos cambios de salas.
      game.board = generateBoardLayout(game.rooms);
    }
    // En modo 'aerial' no se genera rejilla: manda la foto aérea con chinchetas.

    // ---------- Etapa 2: trama ----------
    emit({ type: 'stage', stage: 'plot', label: 'Tejiendo la trama del crimen…' });
    const plot = DEMO_MODE ? await generarTramaDemo(game, emit) : await generarTramaConApi(game, emit);
    corregirSolucion(plot, game);
    game.plot = plot;

    // ---------- Etapa 3: documentos ----------
    emit({ type: 'stage', stage: 'documents', label: 'Imprimiendo los dosieres confidenciales…' });
    // Solo el índice: el HTML se genera al pedir cada dosier (ver renderer.ts).
    game.documents = renderDocumentIndex(game);

    game.status = 'ready';
    const guardada = await store.saveGame(game);
    emit({ type: 'done', game: guardada });
  } catch (error) {
    console.error('[pipeline] fallo en la generación:', error);
    // La partida vuelve a borrador para poder reintentar.
    try {
      game.status = 'draft';
      await store.saveGame(game);
    } catch {
      // Si tampoco se puede guardar, el error original ya es suficiente.
    }
    emit({
      type: 'error',
      message:
        error instanceof Error && error.message
          ? error.message
          : 'Error desconocido durante la generación de la trama',
    });
  }
}

// ---------------------------------------------------------------------------
// Trama vía API (streaming + salida estructurada)
// ---------------------------------------------------------------------------

async function generarTramaConApi(game: GameSession, emit: Emitir): Promise<Plot> {
  const client = getAnthropicClient();
  if (!client) {
    // Salvaguarda: sin cliente (sin clave) caemos al generador local.
    return generarTramaDemo(game, emit);
  }

  const model = await resolveModel(game);

  // Ruta NO beta y sin fallbacks; sin temperature/top_p/top_k ni `thinking`.
  const stream = client.messages.stream({
    model,
    max_tokens: 64000,
    system: [{ type: 'text', text: SYSTEM_TRAMA, cache_control: { type: 'ephemeral' } }],
    output_config: { format: { type: 'json_schema', schema: PLOT_SCHEMA } },
    messages: [{ role: 'user', content: construirPrompt(game) }],
  });

  // Los deltas de texto sirven como indicador de progreso en el overlay.
  stream.on('text', (delta) => {
    emit({ type: 'text', delta });
  });

  const mensaje = await stream.finalMessage();

  if (mensaje.stop_reason === 'refusal') {
    throw new Error(
      'El modelo declinó generar esta trama. Revisa las descripciones introducidas e inténtalo de nuevo.',
    );
  }
  if (mensaje.stop_reason === 'max_tokens') {
    throw new Error(
      'La trama superó el límite de tokens y quedó incompleta. Reduce la cantidad de datos e inténtalo de nuevo.',
    );
  }

  let texto = '';
  for (const bloque of mensaje.content) {
    if (bloque.type === 'text') texto += bloque.text;
  }

  try {
    return JSON.parse(texto) as Plot;
  } catch {
    throw new Error('La respuesta del modelo no es un JSON válido. Vuelve a intentar la generación.');
  }
}

function construirPrompt(game: GameSession): string {
  const sospechosos =
    game.suspects
      .map((s) => {
        const lineas = [`- id: "${s.id}" · nombre: "${s.name}"${s.email ? ` · email: ${s.email}` : ''}`];
        if (s.description?.trim()) {
          lineas.push(`  descripción psicológica: ${s.description.trim()}`);
        }
        return lineas.join('\n');
      })
      .join('\n') || '- (sin sospechosos registrados)';

  const salas =
    game.rooms
      .map((r) => `- id: "${r.id}" · nombre: "${r.name}"${r.description?.trim() ? ` · descripción: ${r.description.trim()}` : ''}`)
      .join('\n') || '- (sin salas registradas)';

  const armas =
    game.weapons
      .map((w) => `- id: "${w.id}" · nombre: "${w.name}"${w.description?.trim() ? ` · descripción: ${w.description.trim()}` : ''}`)
      .join('\n') || '- (sin armas registradas)';

  return `Diseña la trama completa de una partida de CLUEDO EN VIVO llamada "${game.name}".

SOSPECHOSOS (personas reales que jugarán; usa sus ids EXACTOS):
${sospechosos}

SALAS (espacios físicos reales donde se jugará; usa sus ids EXACTOS):
${salas}

ARMAS (objetos reales aportados; usa sus ids EXACTOS):
${armas}

REQUISITOS:
1. Trama elaborada ambientada en los años 20, adaptada al espacio REAL descrito por las salas: el escenario debe sentirse como esa casa concreta convertida en mansión.
2. Un personaje por sospechoso, hecho A MEDIDA de la persona real: usa su nombre y su descripción psicológica; el campo personalHook debe explicar cómo el personaje aprovecha su forma de ser.
3. Coherencia total: coartadas cruzadas entre personajes, secretos que se entrelazan con el motivo del crimen, sin contradicciones con la cronología.
4. La solución (solution.murdererId, solution.weaponId, solution.roomId) DEBE usar ids EXISTENTES de las listas anteriores. Igual para characters[].suspectId (exactamente uno por sospechoso), clues[].roomId y timeline[].suspectIds.
5. La sinopsis es pública: NO debe revelar asesino, arma ni sala del crimen.
6. timeline: de 6 a 8 eventos con hora ("19:30"); incluye 1 o 2 eventos que impliquen SOLO al asesino (se ocultarán a los jugadores).
7. clues: aproximadamente 2 pistas por sala, mezcla de pistas verdaderas y señuelos; pointsTo indica qué o a quién señala cada una.
8. gmScript: al menos 6 pasos concretos para que el Game Master conduzca la velada de principio a fin.
9. TODO en español, con elegancia de novela negra de los años 20.${buildStyleBlock(game)}`;
}

// ---------------------------------------------------------------------------
// Trama en modo demo
// ---------------------------------------------------------------------------

async function generarTramaDemo(game: GameSession, emit: Emitir): Promise<Plot> {
  const pasos = [
    'Consultando el archivo de crímenes de la casa…',
    'Eligiendo víctima, arma y escenario del crimen…',
    'Repartiendo secretos y coartadas entre los invitados…',
    'Escondiendo pistas en cada sala…',
  ];
  for (const paso of pasos) {
    emit({ type: 'text', delta: `${paso}\n` });
    await pausa(180);
  }
  return generateDemoPlot(game);
}

function pausa(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

// ---------------------------------------------------------------------------
// Validación de la solución
// ---------------------------------------------------------------------------

/** Garantiza que la solución apunta a ids existentes; si no, sustituye por el primero válido. */
function corregirSolucion(plot: Plot, game: GameSession): void {
  const { solution } = plot;
  if (!game.suspects.some((s) => s.id === solution.murdererId)) {
    const primero = game.suspects[0];
    if (primero) solution.murdererId = primero.id;
  }
  if (!game.weapons.some((w) => w.id === solution.weaponId)) {
    const primera = game.weapons[0];
    if (primera) solution.weaponId = primera.id;
  }
  if (!game.rooms.some((r) => r.id === solution.roomId)) {
    const primera = game.rooms[0];
    if (primera) solution.roomId = primera.id;
  }
}
