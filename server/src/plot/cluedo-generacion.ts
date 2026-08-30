/**
 * Como escribe CLUEDO su trama: con el modelo o sin el.
 *
 * Es el hermano de `momia-generacion.ts` y `sombras-generacion.ts`, y hasta hoy
 * no existia: todo esto vivia dentro de `pipeline.ts`, o sea en el camino por el
 * que pasa la generacion de CUALQUIER juego. Doscientas lineas de prompt, de
 * esquema y de trama de demostracion de un juego concreto, en un fichero comun.
 *
 * No cambia una linea de lo que hace. Solo estaba en el sitio equivocado, y ese
 * sitio le contaba a quien viniera detras una cosa que no es verdad: que la
 * tuberia es de CLUEDO y los demas juegos son excepciones.
 */
import { objetosDe, salasDe, sospechososDe } from '../juegos/cluedo';
import type { GameSession, Plot } from '../../../shared/types';
import { DEMO_MODE } from '../config';
import { getAnthropicClient, resolveModel } from '../agent/anthropic';
import { generateDemoPlot } from './cluedo-demo';
import { PLOT_SCHEMA } from './cluedo-esquema';
import { buildStyleBlock } from './style';
import { registrarGenerador } from '../juegos/generadores';
import { respuestasCluedo } from '../juegos/cluedo';
import { emisorDeProgreso } from '../live/proyeccion';
import { apuntarUso } from '../gasto/contador';
import type { Emitir } from './pipeline';

const SYSTEM_TRAMA =
  'Eres un novelista de misterio experto en CLUEDO y en juegos de deducción en vivo. ' +
  'Diseñas tramas de asesinato ambientadas en los años 20: elegantes, coherentes y jugables, ' +
  'adaptadas a las personas reales y al espacio físico real que se te describe. ' +
  'Escribes siempre en español, con tono evocador pero preciso. ' +
  'Devuelves exclusivamente el JSON pedido, respetando los ids proporcionados.';


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
    sospechososDe(game)
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
    salasDe(game)
      .map((r) => `- id: "${r.id}" · nombre: "${r.name}"${r.description?.trim() ? ` · descripción: ${r.description.trim()}` : ''}`)
      .join('\n') || '- (sin salas registradas)';

  const armas =
    objetosDe(game)
      .map((w) => `- id: "${w.id}" · nombre: "${w.name}"${w.description?.trim() ? ` · descripción: ${w.description.trim()}` : ''}`)
      .join('\n') || '- (sin armas registradas)';

  // El tablero ya está trazado cuando se pide la trama: si el modelo no conoce
  // los pasadizos REALES, se los inventa y contradice al plano de los dosieres.
  const pasadizos =
    game.boardMode === 'generated' && game.board?.pasadizos.length
      ? game.board.pasadizos
          .map((pasadizo) => {
            const desde = salasDe(game).find((s) => s.id === pasadizo.desdeLugarId)?.name ?? '';
            const hasta = salasDe(game).find((s) => s.id === pasadizo.hastaLugarId)?.name ?? '';
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
4. La solución (solution.murdererId, solution.weaponId, solution.lugarId) DEBE usar ids EXISTENTES de las listas anteriores. Igual para characters[].participanteId (exactamente uno por sospechoso), clues[].lugarId y timeline[].participanteIds.
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

/**
 * Lo que el generador de CLUEDO devuelve, traducido a lo que la plataforma
 * espera: la terna a ejes y las pistas a su mecanica.
 *
 * ═══ ESTO ESTABA EN `pipeline.ts`, Y ERA LO ULTIMO DE `migracion.ts` ═══
 *
 * El esquema con el que se le pide la trama al modelo sigue hablando de
 * asesino, arma y sala —`murdererId`, `weaponId`, `roomId`— y se deja asi a
 * proposito: esta afinado y probado, y cambiarlo cambiaria las tramas que
 * salen. Pero la solucion que viaja por la plataforma es un valor por eje,
 * porque un juego con dos ejes o con cinco no cabe en una terna.
 *
 * La conversion se hacia en la tuberia comun, llamando a `tramaAlDia` —una
 * funcion de la migracion de datos guardados— sobre una trama recien nacida.
 * Mezclaba dos cosas distintas: poner al dia lo viejo y traducir la frontera de
 * un generador. Ahora es lo segundo y vive donde vive ese generador, asi que la
 * tuberia no sabe lo que es un asesino.
 */
function comoLoEsperaLaPlataforma(plot: Plot): Plot {
  /*
   * ═══ Y LAS PISTAS, QUE EL MODELO DEVUELVE EN LA RAIZ ═══
   *
   * El esquema le pide `clues` al nivel de la trama, igual que le pide asesino
   * y arma: esta afinado y cambiarlo cambiaria las tramas que salen. Pero las
   * pistas son de la MECANICA de las pistas, no del contrato de la trama —la
   * Momia y las Sombras no tienen ninguna y escribian `clues: []` para
   * cumplir—, asi que viven en `plot.mecanicas.pistas`.
   *
   * Se traduce aqui, en la frontera, que es donde se traducen las cosas de un
   * generador concreto.
   */
  const conRaiz = plot as unknown as { clues?: unknown[] };
  if (Array.isArray(conRaiz.clues)) {
    if (!plot.mecanicas) plot.mecanicas = {};
    if (plot.mecanicas.pistas === undefined) plot.mecanicas.pistas = conRaiz.clues;
    delete conRaiz.clues;
  }

  const s = plot.solution as unknown as {
    murdererId?: string;
    weaponId?: string;
    roomId?: string;
    respuestas?: Record<string, string>;
  };
  if (s.respuestas) return plot;
  plot.solution.respuestas = respuestasCluedo({
    murdererId: s.murdererId ?? '',
    weaponId: s.weaponId ?? '',
    lugarId: s.roomId ?? '',
  });
  delete s.murdererId;
  delete s.weaponId;
  delete s.roomId;
  return plot;
}

registrarGenerador('cluedo', {
  rotulo: 'Tejiendo la trama del crimen…',
  generar: async (game: GameSession, emit: Emitir) =>
    comoLoEsperaLaPlataforma(
      await (DEMO_MODE ? generarTramaDemo(game, emit) : generarTramaConApi(game, emit)),
    ),
});
