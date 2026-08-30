/**
 * Pipeline de generación de la partida: board → plot → documents.
 *
 * Ejecuta las tres etapas emitiendo eventos `GenerateStreamEvent` (incluidos
 * `done` / `error`), guarda la partida con el store y devuelve el control al
 * route handler, que cierra el SSE.
 */
import type { GameSession, GenerateStreamEvent, Plot } from '../../../shared/types';
import { manifiestoDe } from '../../../shared/juegos';
import { DEMO_MODE } from '../config';
import { getStore } from '../db/store';
import { getAnthropicClient, resolveModel } from '../agent/anthropic';
import { generateBoardLayout } from '../board/generator';
import { renderDocumentIndex } from '../docs/renderer';
import { generateDemoPlot } from './demoPlot';
import { PLOT_SCHEMA } from './schema';
import { buildStyleBlock } from './style';
import { repararRespuestas } from '../juegos/solucion';
import { tramaAlDia } from '../juegos/migracion';
import { generadorDeTrama, registrarGenerador } from '../juegos/generadores';
import { emisorDeProgreso, partidaParaElTaller } from '../live/proyeccion';
import { apuntarUso, volcarGasto } from '../gasto/contador';

type Emitir = (evento: GenerateStreamEvent) => void;

const SYSTEM_TRAMA =
  'Eres un novelista de misterio experto en CLUEDO y en juegos de deducción en vivo. ' +
  'Diseñas tramas de asesinato ambientadas en los años 20: elegantes, coherentes y jugables, ' +
  'adaptadas a las personas reales y al espacio físico real que se te describe. ' +
  'Escribes siempre en español, con tono evocador pero preciso. ' +
  'Devuelves exclusivamente el JSON pedido, respetando los ids proporcionados.';

/** Ejecuta la generación completa sobre la partida dada. */
/**
 * Cuanto se espera antes de dar por muerta una generacion que dejo la partida en
 * `generating`. La mas larga medida —CLUEDO, dos llamadas— tarda siete minutos,
 * y la Momia puede pedir una segunda tirada; veinte deja margen de sobra sin que
 * una partida colgada por un proceso muerto quede bloqueada para siempre.
 */
const PLAZO_DE_GENERACION = 20 * 60 * 1000;

/**
 * ¿Esta partida se esta generando AHORA MISMO?
 *
 * Las tres rutas que gastan dinero de verdad —generar, actualizar y el material—
 * no miraban nada, y la unica defensa era un booleano en memoria del navegador:
 * se pierde al recargar y no existe en una segunda pestaña. Dos clics arrancaban
 * dos tuberias completas, pagaban dos veces al modelo y guardaban las dos.
 *
 * El sello es `updatedAt`, que `saveGame` escribe en cada guardado: al pasar a
 * `generating` queda con la hora de arranque. Sin plazo, un proceso que muera a
 * mitad dejaria la partida bloqueada para siempre, porque quien la libera es el
 * `catch` del propio proceso.
 */
export function generacionEnCurso(game: GameSession): boolean {
  if (game.status !== 'generating') return false;
  const desde = Date.parse(game.updatedAt);
  if (Number.isNaN(desde)) return false;
  return Date.now() - desde < PLAZO_DE_GENERACION;
}

export async function runGeneration(game: GameSession, emit: Emitir): Promise<void> {
  const store = getStore();
  try {
    // ---------- Etapa 1: tablero ----------
    emit({ type: 'stage', stage: 'board', label: 'Trazando el plano de la mansión…' });
    if (game.boardMode === 'generated') {
      // Determinista: regenerar siempre refleja los últimos cambios de salas.
      game.board = generateBoardLayout(game.rooms, manifiestoDe(game.settings?.juego).rotuloCentralDelPlano);
    }
    // En modo 'aerial' no se genera rejilla: manda la foto aérea con chinchetas.

    // ---------- Etapa 2: trama ----------
    /*
     * LA RAMA POR JUEGO. Se bifurca aquí y en ninguna otra parte: cada juego
     * trae su propio esquema, su propio prompt y su propia validación, y lo que
     * comparten es el resto de la tubería —tablero, reparación de la solución,
     * documentos, guardado y eventos—. La rama de CLUEDO queda EXACTAMENTE como
     * estaba; añadir un juego no puede cambiar lo que sale del otro.
     *
     * El segundo juego que anunciaba el comentario de abajo ya está aquí, y ha
     * traído consigo la frontera que se predijo: la Momia no reutiliza
     * `PLOT_SCHEMA` porque no tiene asesino, arma ni sala, y sobre todo porque
     * su puzle lo genera código y al modelo solo se le pide el sabor.
     */
    /*
     * SE LE PREGUNTA AL REGISTRO, no a un ternario encadenado por id de juego.
     *
     * Aquí había dos ternarios en fila —uno para el rótulo que se lee mientras
     * escribe y otro para el generador— con CLUEDO como rama por defecto EN
     * SILENCIO. Un juego nuevo que se olvidara de entrar en ellos no daba ningún
     * error: le generaban un asesinato, con culpable, arma y sala sobre sus
     * entidades, y con el modelo respondiendo a un esquema que empieza por «Eres
     * un novelista de misterio experto en CLUEDO». Y el sitio donde había que
     * acordarse de entrar no tiene nada que ver con el juego que se escribe:
     * está en la tubería común, entre el tablero y el guardado.
     *
     * De paso, este fichero deja de importar los tres juegos por su nombre.
     */
    const alta = generadorDeTrama(game.settings?.juego);
    emit({
      type: 'stage',
      stage: 'plot',
      label: alta?.rotulo ?? 'Tejiendo la trama del crimen…',
    });
    /*
     * FALLA CERRADO. Un juego sin generador dado de alta recibe un error que dice
     * exactamente lo que le falta, en vez de recibir el de CLUEDO. La diferencia
     * es entre enterarse ahora y enterarse la noche de la partida, con una velada
     * entera preparada sobre la trama equivocada.
     */
    if (!alta) {
      throw new Error(
        `El juego «${manifiestoDe(game.settings?.juego).id}» no tiene generador de trama dado de alta. ` +
          'Se declara con `registrarGenerador` y se carga desde `juegos/instalados.ts`.',
      );
    }
    const plot = await alta.generar(game, emit);
    // El esquema con el que se le pide la trama al modelo sigue hablando de
    // asesino, arma y sala, y se deja así a propósito: está afinado y
    // probado, y cambiarlo cambiaría las tramas que salen. La conversión a
    // ejes se hace aquí, en la frontera. (En la Momia no hace nada: su solución
    // ya nace con `respuestas`, y `tramaAlDia` no toca lo que ya está al día.)
    tramaAlDia(plot);
    corregirSolucion(plot, game);
    game.plot = plot;

    // ---------- Etapa 3: documentos ----------
    emit({ type: 'stage', stage: 'documents', label: 'Imprimiendo los dosieres confidenciales…' });
    // Solo el índice: el HTML se genera al pedir cada dosier (ver renderer.ts).
    game.documents = renderDocumentIndex(game);

    game.status = 'ready';
    const guardada = await store.saveGame(game);
    // Con el Game Master jugando, este `done` bajaba la trama entera.
    emit({ type: 'done', game: partidaParaElTaller(guardada) });
    // Y se vuelca lo apuntado, ya con todo guardado: si se hiciera antes, el
    // guardado de aqui arriba se lo llevaria por delante.
    await volcarGasto(game.id);
  } catch (error) {
    console.error('[pipeline] fallo en la generación:', error);
    /*
     * SE RELEE ANTES DE TOCAR NADA, y no es un detalle.
     *
     * Esto hacia `game.status = 'draft'; saveGame(game)` con el objeto leido al
     * principio, o sea que guardaba su instantanea VIEJA encima de lo que
     * hubiera. Si entretanto otra peticion habia terminado de generar bien, un
     * fallo tardio de esta borraba la trama buena y devolvia la partida a
     * borrador. Ahora solo se corrige el estado, y solo si sigue en
     * `generating`: si ya la libero alguien, no hay nada que hacer.
     */
    try {
      const almacenada = await store.getGame(game.id);
      if (almacenada && almacenada.status === 'generating') {
        almacenada.status = almacenada.plot ? 'ready' : 'draft';
        await store.saveGame(almacenada);
      }
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

  // Los deltas de texto sirven como indicador de progreso en el overlay. A
  // ciegas van como puntos: el crudo del modelo lleva la solucion dentro.
  stream.on('text', emisorDeProgreso(game, emit));

  const mensaje = await stream.finalMessage();
  // Lo que ha costado esta llamada. No puede tumbar la generacion.
  apuntarUso({ concepto: 'trama', model, usage: mensaje.usage, gameId: game.id });

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
        // El correo NO va al modelo. Estos son invitados de verdad, y su
        // dirección no aporta absolutamente nada a escribir un personaje: era
        // un dato personal saliendo hacia un tercero a cambio de nada. El
        // esquema de la trama tampoco emite correos, así que no se echa en
        // falta en ninguna parte.
        const lineas = [`- id: "${s.id}" · nombre: "${s.name}"`];
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

  // El tablero ya está trazado cuando se pide la trama: si el modelo no conoce
  // los pasadizos REALES, se los inventa y contradice al plano de los dosieres.
  const pasadizos =
    game.boardMode === 'generated' && game.board?.passages.length
      ? game.board.passages
          .map((pasadizo) => {
            const desde = game.rooms.find((s) => s.id === pasadizo.fromRoomId)?.name ?? '';
            const hasta = game.rooms.find((s) => s.id === pasadizo.toRoomId)?.name ?? '';
            return `- "${desde}" ⇄ "${hasta}"`;
          })
          .join('\n')
      : '- (esta partida no tiene pasadizos secretos: no menciones ninguno)';

  return `Diseña la trama completa de una partida de CLUEDO EN VIVO llamada "${game.name}".

SOSPECHOSOS (personas reales que jugarán; usa sus ids EXACTOS):
${sospechosos}

SALAS (espacios físicos reales donde se jugará; usa sus ids EXACTOS):
${salas}

ARMAS (objetos reales aportados; usa sus ids EXACTOS):
${armas}

PASADIZOS SECRETOS YA TRAZADOS EN EL PLANO (son estos y solo estos):
${pasadizos}

REQUISITOS:
1. Trama elaborada ambientada en los años 20, adaptada al espacio REAL descrito por las salas: el escenario debe sentirse como esa casa concreta convertida en mansión.
2. Un personaje por sospechoso, hecho A MEDIDA de la persona real: usa su nombre y su descripción psicológica; el campo personalHook debe explicar cómo el personaje aprovecha su forma de ser.
3. Coherencia total: coartadas cruzadas entre personajes, secretos que se entrelazan con el motivo del crimen, sin contradicciones con la cronología.
4. La solución (solution.murdererId, solution.weaponId, solution.roomId) DEBE usar ids EXISTENTES de las listas anteriores. Igual para characters[].suspectId (exactamente uno por sospechoso), clues[].roomId y timeline[].suspectIds.
5. La sinopsis es pública: NO debe revelar asesino, arma ni sala del crimen.
6. PASADIZOS: si mencionas alguno en secretos, coartadas o pistas, debe ser EXACTAMENTE uno de los listados arriba. No inventes conexiones entre salas que el plano no tiene.
7. timeline: de 8 a 12 eventos con hora ("19:30"), mezclando públicos y secretos.
   - isPublic true SOLO para los momentos que presenciaron TODOS a la vez (llegada, cena, anuncio, apagón, hallazgo del cuerpo). Serán los únicos que vean los jugadores.
   - isPublic false para todo lo demás: quién se movió durante el apagón, quién manipuló qué, quién provocó el apagón, conversaciones privadas, alteraciones de la escena y el crimen.
   - Un evento que implique a UNA sola persona nunca puede ser público.
8. COHERENCIA HORARIA (crítico, se revisa): las horas de la cronología, las coartadas de los personajes y las pistas deben encajar sin contradecirse.
   - Si dos personajes se dan coartada mutua, ambos dosieres deben indicar el MISMO intervalo.
   - Nadie puede estar en dos sitios a la vez ni presenciar algo fuera de su intervalo.
   - Si una pista fija una hora, ningún personaje puede contradecirla sin que eso sea una mentira deliberada y marcada como tal en su secreto.
9. clues: aproximadamente 2 pistas por sala, mezcla de verdaderas y señuelos; pointsTo indica qué o a quién señala cada una.
   - REPARTO POR RONDAS con el campo "round": 1 motivos, conflictos y señuelos; 2 objetos desplazados y coartadas incompletas; 3 horarios, trayectos y contradicciones; 4 evidencias decisivas.
   - Ninguna pista que por sí sola identifique al culpable puede llevar round 1 o 2. Reparte de forma pareja entre las cuatro rondas.
10. gmScript: al menos 6 pasos concretos para conducir la velada. Debe incluir abrir un sobre de pistas por ronda y una puesta en común al final de cada ronda.
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

/**
 * Garantiza que la solución apunta a ids existentes; si no, sustituye por el
 * primero válido de la categoría de ese eje.
 *
 * Antes eran tres comprobaciones escritas a mano, una por eje. Ahora recorre
 * los ejes que declare el juego, sean los que sean.
 */
function corregirSolucion(plot: Plot, game: GameSession): void {
  repararRespuestas(plot, game);
}

/*
 * EL ALTA DE CLUEDO, y va aquí porque aquí viven sus dos generadores: el de
 * demostración —sin clave de API— y el que habla con el modelo. Cuál de los dos
 * se usa es una decisión de la tubería, no del juego, y por eso la envuelve el
 * alta en vez de estar suelta en el camino de todos.
 *
 * Con esto, CLUEDO deja de ser «lo que pasa si no eres ninguno de los otros» y
 * pasa a ser un juego más que se da de alta. Es el mismo movimiento que con sus
 * trofeos: mientras fue la rama por defecto, un juego nuevo que se olvidara de
 * entrar en el ternario recibia un asesinato sin que nada diera error.
 */
registrarGenerador('cluedo', {
  rotulo: 'Tejiendo la trama del crimen…',
  generar: (game: GameSession, emit: Emitir) =>
    DEMO_MODE ? generarTramaDemo(game, emit) : generarTramaConApi(game, emit),
});
