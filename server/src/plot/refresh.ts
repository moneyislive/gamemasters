/**
 * Puesta al día de una partida ya generada — COHERENCIA DE LA PARTIDA.
 *
 * Después de generar el misterio, el Game Master sigue tocando jugadores,
 * salas y objetos, y la trama deja de corresponderse con la partida. Aquí NO se
 * regenera nada que siga siendo válido: se rehace exactamente lo que
 * `computeStaleness` señala como roto, y por orden de coste.
 *
 *   1. Tablero  — determinista y gratis, solo si cambiaron las salas.
 *   2. Poda     — se eliminan personajes, pistas y referencias de cronología
 *                 que apuntan a entidades borradas. Gratis, sin IA.
 *   3. Trama    — SOLO si `needsAgent`: una única llamada a la API que escribe
 *                 los personajes que faltan y, si la solución quedó rota,
 *                 reescribe motivo y relato del crimen.
 *   4. Dosieres — se reimprimen siempre (gratis): así aparecen los que faltan
 *                 y desaparecen los sobrantes.
 *
 * Emite los mismos `GenerateStreamEvent` que el pipeline de generación, de modo
 * que el cliente reutiliza el overlay de progreso sin cambios.
 */
import type {
  GameSession,
  GenerateStreamEvent,
  Plot,
  PlotCharacter,
  PlotClue,
  TimelineEvent,
} from '../../../shared/types';
import { manifiestoDe } from '../../../shared/juegos';
import type { StalenessReport } from '../../../shared/staleness';
import { computeStaleness } from '../../../shared/staleness';
import { DEMO_MODE } from '../config';
import { getStore } from '../db/store';
import { getAnthropicClient, resolveModel } from '../agent/anthropic';
import { generateBoardLayout } from '../board/generator';
import { renderDocumentIndex } from '../docs/renderer';
import { ampliacionDe, registrarAmpliacion } from '../juegos/ampliaciones';
import { generateDemoCharacters } from './demoPlot';
import { PLOT_EXTENSION_SCHEMA } from './schema';
import { buildStyleBlock } from './style';
import { culpableDe, lugarDe, objetoDe } from '../juegos/cluedo';
import { juegoDe, repararRespuestas } from '../juegos/solucion';
import { emisorDeProgreso, partidaParaElTaller } from '../live/proyeccion';
import { apuntarUso, volcarGasto } from '../gasto/contador';

type Emitir = (evento: GenerateStreamEvent) => void;

/** Cliente de Anthropic ya construido (el mismo que usa el resto del servidor). */
type ClienteAnthropic = NonNullable<ReturnType<typeof getAnthropicClient>>;

/** Reparación de la solución devuelta por el modelo (o por el generador demo). */
interface ReparacionSolucion {
  motive: string;
  howItHappened: string;
}

/** Forma de la respuesta estructurada de ampliación (`PLOT_EXTENSION_SCHEMA`). */
interface AmpliacionTrama {
  characters?: unknown;
  solutionRepair?: { motive?: unknown; howItHappened?: unknown };
  extraClues?: unknown;
}

const SYSTEM_AMPLIACION =
  'Eres un novelista de misterio experto en CLUEDO y en juegos de deducción en vivo. ' +
  'Tu especialidad es AMPLIAR tramas ya escritas sin romperlas: añades personajes a una ' +
  'historia en marcha de modo que parezca que estuvieron ahí desde la primera línea. ' +
  'Respetas escrupulosamente lo ya escrito (título, víctima, secretos, coartadas y la ' +
  'solución del crimen) y jamás lo contradices. ' +
  'Escribes siempre en español, con tono evocador pero preciso, ambientación de los años 20. ' +
  'Devuelves exclusivamente el JSON pedido, respetando los ids proporcionados.';

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
      game.board = generateBoardLayout(game.rooms, manifiestoDe(game.settings?.juego).rotuloCentralDelPlano);
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
  const idsSospechosos = new Set(game.suspects.map((sospechoso) => sospechoso.id));
  const idsSalas = new Set(game.rooms.map((sala) => sala.id));

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

  // Material impreso: un giro dirigido a alguien que ya no juega no se puede
  // entregar, y uno dirigido al culpable lo delataría si la solución se ha
  // reasignado al reparar la trama.
  if (plot.material) {
    plot.material.twists = plot.material.twists.filter(
      (giro) =>
        idsSospechosos.has(giro.suspectId) && giro.suspectId !== culpableDe(plot.solution),
    );
  }
}

/** ¿La descripción menciona a alguno de los personajes eliminados? */
function citaANombreBorrado(descripcion: string, nombresBorrados: string[]): boolean {
  if (nombresBorrados.length === 0) return false;
  const texto = descripcion.toLowerCase();
  return nombresBorrados.some((nombre) => texto.includes(nombre));
}

// ---------------------------------------------------------------------------
// Ampliación de la trama
// ---------------------------------------------------------------------------

/**
 * Repara la solución si apunta a entidades borradas y escribe los personajes
 * que faltan (con la API o, en modo demo, con el generador local).
 */
async function ampliarTrama(
  game: GameSession,
  plot: Plot,
  informe: StalenessReport,
  emit: Emitir,
): Promise<void> {
  const solucionRota = informe.brokenSolution.length > 0;

  // (a) Los ids ya vienen reparados de `runRefresh`, que lo hace para todos los
  // juegos; aquí solo queda reescribir el texto sabiendo a quién señala.

  // (b) Personas incorporadas después que aún no tienen personaje.
  const faltantes = informe.suspectsWithoutCharacter.filter((id) =>
    game.suspects.some((sospechoso) => sospechoso.id === id),
  );

  let nuevos: PlotCharacter[] = [];
  let reparacion: ReparacionSolucion | null = null;
  let pistasExtra: PlotClue[] = [];

  const client = DEMO_MODE ? null : getAnthropicClient();

  if (client) {
    // (c) Una sola llamada, con salida estructurada y streaming de progreso.
    const ampliacion = await pedirAmpliacion(client, game, plot, faltantes, solucionRota, emit);
    nuevos = normalizarPersonajes(ampliacion.characters);
    pistasExtra = normalizarPistas(ampliacion.extraClues);
    const motive = textoDe(ampliacion.solutionRepair?.motive);
    const howItHappened = textoDe(ampliacion.solutionRepair?.howItHappened);
    if (solucionRota && motive && howItHappened) {
      reparacion = { motive, howItHappened };
    }
  } else {
    // (e) Modo demo: mismas plantillas del generador local, sin gastar API.
    for (const paso of [
      'Repasando la trama ya escrita para no contradecir nada…',
      'Buscando un hueco creíble para cada recién llegado…',
      'Cruzando sus coartadas con las de los invitados de siempre…',
    ]) {
      emit({ type: 'text', delta: `${paso}\n` });
      await pausa(180);
    }
    nuevos = generateDemoCharacters(game, faltantes, plot);
  }

  // Personajes nuevos válidos (el modelo puede colarse con ids inventados).
  const idsSospechosos = new Set(game.suspects.map((sospechoso) => sospechoso.id));
  const yaEscritos = new Set(plot.characters.map((personaje) => personaje.suspectId));
  for (const personaje of nuevos) {
    if (!idsSospechosos.has(personaje.suspectId)) continue; // id inventado: se descarta
    if (yaEscritos.has(personaje.suspectId)) continue; // personaje de más: se descarta
    yaEscritos.add(personaje.suspectId);
    plot.characters.push(personaje);
  }

  // (f) Red de seguridad: si el modelo dejó a alguien sin personaje, lo cubre el demo.
  const sinPersonaje = game.suspects
    .filter((sospechoso) => !yaEscritos.has(sospechoso.id))
    .map((sospechoso) => sospechoso.id);
  if (sinPersonaje.length > 0) {
    emit({
      type: 'text',
      delta: `Completando ${sinPersonaje.length} personaje(s) con el archivo de la casa…\n`,
    });
    plot.characters.push(...generateDemoCharacters(game, sinPersonaje, plot));
  }

  // Orden estable: los personajes siguen el orden de la lista de jugadores.
  const orden = new Map(game.suspects.map((sospechoso, indice) => [sospechoso.id, indice]));
  plot.characters.sort(
    (a, b) => (orden.get(a.suspectId) ?? 0) - (orden.get(b.suspectId) ?? 0),
  );

  // Texto de la solución: reescrito por el modelo o, si no, por el generador local.
  if (solucionRota) {
    const texto = reparacion ?? reparacionLocal(game, plot);
    plot.solution.motive = texto.motive;
    plot.solution.howItHappened = texto.howItHappened;
  }

  // Pistas extra para salas que se hubieran quedado a oscuras.
  if (pistasExtra.length > 0) {
    const idsSalas = new Set(game.rooms.map((sala) => sala.id));
    const idsPistas = new Set(plot.clues.map((pista) => pista.id));
    pistasExtra.forEach((pista, indice) => {
      if (!pista.roomId || !idsSalas.has(pista.roomId)) return;
      const id = idsPistas.has(pista.id) ? `${pista.id}-nueva-${indice + 1}` : pista.id;
      idsPistas.add(id);
      plot.clues.push({ ...pista, id });
    });
  }
}

/**
 * Sustituye los ids rotos de la solución por otros existentes. Para el asesino
 * se prefiere un sospechoso que YA tenga personaje escrito: así el crimen sigue
 * apoyándose en una historia que existe.
 */
function repararIdsSolucion(plot: Plot, game: GameSession): void {
  const manifiesto = juegoDe(game);
  repararRespuestas(plot, game, (categoria, candidatas) => {
    // Para el eje que señala a alguien de la mesa se prefiere quien YA tenga
    // personaje escrito: así el crimen sigue apoyándose en una historia que
    // existe, en vez de en el primero de la lista.
    const cat = manifiesto.categorias.find((c) => c.id === categoria);
    if (!cat?.sonJugadores) return undefined;
    return candidatas.find((e) => plot.characters.some((p) => p.suspectId === e.id));
  });
}

/** Reescritura local del motivo y del relato del crimen (modo demo y red de seguridad). */
function reparacionLocal(game: GameSession, plot: Plot): ReparacionSolucion {
  const asesino = game.suspects.find((s) => s.id === culpableDe(plot.solution));
  const personaje = plot.characters.find((c) => c.suspectId === culpableDe(plot.solution));
  const arma = game.weapons.find((w) => w.id === objetoDe(plot.solution));
  const sala = game.rooms.find((r) => r.id === lugarDe(plot.solution));

  const nombre = personaje?.characterName ?? asesino?.name ?? 'el culpable';
  const motive = personaje?.motive?.trim() || plot.solution.motive;
  const dondeOcurrio = sala ? sala.name : 'la sala más apartada de la casa';
  const conQue = arma ? arma.name.toLowerCase() : 'lo primero que encontró a mano';

  return {
    motive,
    howItHappened:
      `Aprovechando el apagón de las 21:40, ${nombre} se deslizó hasta ${dondeOcurrio}, ` +
      `donde ${plot.victim.name} esperaba a solas una conversación "privada". ` +
      `Bastaron dos minutos y ${conQue} para zanjar el asunto. ` +
      `Después ${nombre} volvió con el resto fingiendo buscar velas, con el pulso casi firme.`,
  };
}

function pausa(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

// ---------------------------------------------------------------------------
// Llamada a la API (streaming + salida estructurada)
// ---------------------------------------------------------------------------

async function pedirAmpliacion(
  client: ClienteAnthropic,
  game: GameSession,
  plot: Plot,
  faltantes: string[],
  solucionRota: boolean,
  emit: Emitir,
): Promise<AmpliacionTrama> {
  const model = await resolveModel(game);

  // Ruta NO beta y sin fallbacks; sin temperature/top_p/top_k ni `thinking`.
  const stream = client.messages.stream({
    model,
    max_tokens: 32000,
    system: [{ type: 'text', text: SYSTEM_AMPLIACION, cache_control: { type: 'ephemeral' } }],
    output_config: { format: { type: 'json_schema', schema: PLOT_EXTENSION_SCHEMA } },
    messages: [
      { role: 'user', content: construirPromptAmpliacion(game, plot, faltantes, solucionRota) },
    ],
  });

  // Los deltas sirven de indicador de progreso en el overlay del cliente. A
  // ciegas van como puntos: el crudo del modelo lleva la solucion dentro.
  stream.on('text', emisorDeProgreso(game, emit));

  const mensaje = await stream.finalMessage();
  // Lo que ha costado esta llamada. No puede tumbar la generacion.
  apuntarUso({ concepto: 'refresco', model, usage: mensaje.usage, gameId: game.id });

  if (mensaje.stop_reason === 'refusal') {
    throw new Error(
      'El modelo declinó ampliar esta trama. Revisa las descripciones de los jugadores nuevos e inténtalo de nuevo.',
    );
  }
  if (mensaje.stop_reason === 'max_tokens') {
    throw new Error(
      'La ampliación de la trama superó el límite de tokens y quedó incompleta. Reduce la cantidad de datos e inténtalo de nuevo.',
    );
  }

  let texto = '';
  for (const bloque of mensaje.content) {
    if (bloque.type === 'text') texto += bloque.text;
  }

  try {
    return JSON.parse(texto) as AmpliacionTrama;
  } catch {
    throw new Error(
      'La respuesta del modelo no es un JSON válido. Vuelve a intentar la puesta al día.',
    );
  }
}

/** Prompt de ampliación: TODO el contexto de la trama existente, y nada más que pedir. */
function construirPromptAmpliacion(
  game: GameSession,
  plot: Plot,
  faltantes: string[],
  solucionRota: boolean,
): string {
  const nombreSospechoso = (id: string): string =>
    game.suspects.find((sospechoso) => sospechoso.id === id)?.name ?? '(jugador desconocido)';

  const asesino = game.suspects.find((s) => s.id === culpableDe(plot.solution));
  const personajeAsesino = plot.characters.find(
    (c) => c.suspectId === culpableDe(plot.solution),
  );
  const arma = game.weapons.find((w) => w.id === objetoDe(plot.solution));
  const sala = game.rooms.find((r) => r.id === lugarDe(plot.solution));

  const personajesExistentes =
    plot.characters
      .map((personaje) =>
        [
          `- ${personaje.characterName} (jugador real: ${nombreSospechoso(personaje.suspectId)}, id "${personaje.suspectId}")`,
          `  papel: ${personaje.role}`,
          `  secreto: ${personaje.secret}`,
          `  coartada: ${personaje.alibi}`,
        ].join('\n'),
      )
      .join('\n') || '- (la trama se ha quedado sin ningún personaje escrito)';

  const salas =
    game.rooms
      .map(
        (sala2) =>
          `- id: "${sala2.id}" · nombre: "${sala2.name}"${sala2.description?.trim() ? ` · descripción: ${sala2.description.trim()}` : ''}`,
      )
      .join('\n') || '- (sin salas registradas)';

  const armas =
    game.weapons
      .map(
        (arma2) =>
          `- id: "${arma2.id}" · nombre: "${arma2.name}"${arma2.description?.trim() ? ` · descripción: ${arma2.description.trim()}` : ''}`,
      )
      .join('\n') || '- (sin armas registradas)';

  const nuevos =
    faltantes
      .map((id) => {
        const sospechoso = game.suspects.find((s) => s.id === id);
        if (!sospechoso) return '';
        const lineas = [`- id: "${sospechoso.id}" · nombre: "${sospechoso.name}"`];
        if (sospechoso.description?.trim()) {
          lineas.push(`  descripción psicológica: ${sospechoso.description.trim()}`);
        }
        return lineas.join('\n');
      })
      .filter(Boolean)
      .join('\n') || '- (ninguna persona nueva)';

  const salasSinPista = game.rooms
    .filter((sala2) => !plot.clues.some((pista) => pista.roomId === sala2.id))
    .map((sala2) => `"${sala2.name}" (id "${sala2.id}")`)
    .join(', ');

  const bloqueSolucion = solucionRota
    ? `LA SOLUCIÓN HA QUEDADO ROTA Y SE HA REASIGNADO. Ahora es, de forma definitiva:
- Asesino: ${asesino?.name ?? '(sin asignar)'}${personajeAsesino ? ` — personaje "${personajeAsesino.characterName}"` : ' — todavía sin personaje escrito'} (id "${culpableDe(plot.solution)}")
- Arma: ${arma?.name ?? '(sin asignar)'} (id "${objetoDe(plot.solution)}")
- Sala del crimen: ${sala?.name ?? '(sin asignar)'} (id "${lugarDe(plot.solution)}")
El motivo y el relato antiguos ya no valen porque hablaban de otras personas u objetos:
- motivo antiguo: ${plot.solution.motive}
- relato antiguo: ${plot.solution.howItHappened}
DEBES devolver "solutionRepair" con un motivo y un relato NUEVOS, coherentes con ese asesino,
esa arma y esa sala, y con los secretos y coartadas de los personajes de la lista anterior.`
    : `LA SOLUCIÓN REAL SIGUE SIENDO VÁLIDA (es secreta, no la contradigas ni la reveles en los textos públicos):
- Asesino: ${asesino?.name ?? '(desconocido)'}${personajeAsesino ? ` — personaje "${personajeAsesino.characterName}"` : ''} (id "${culpableDe(plot.solution)}")
- Arma: ${arma?.name ?? '(desconocida)'} · Sala del crimen: ${sala?.name ?? '(desconocida)'}
- Motivo: ${plot.solution.motive}
- Cómo ocurrió: ${plot.solution.howItHappened}
NO hay que reparar nada: devuelve "solutionRepair" con motive y howItHappened como cadenas vacías ("").`;

  return `La partida de CLUEDO EN VIVO "${game.name}" YA TIENE una trama escrita y en marcha.
NO la reescribas ni la resumas: solo hay que AMPLIARLA porque se han incorporado personas nuevas.

TRAMA EXISTENTE (intocable)
- Título: ${plot.title}
- Lema: ${plot.tagline}
- Sinopsis pública: ${plot.synopsis}
- Víctima: ${plot.victim.name} — ${plot.victim.description}
- Escenario: ${plot.setting}

${bloqueSolucion}

PERSONAJES YA ESCRITOS (no los modifiques; los nuevos deben encajar con ellos):
${personajesExistentes}

SALAS ACTUALES (usa sus ids EXACTOS):
${salas}

OBJETOS ACTUALES (posibles armas; usa sus ids EXACTOS):
${armas}

PERSONAS NUEVAS SIN PERSONAJE (usa sus ids EXACTOS, uno y solo un personaje por cada una):
${nuevos}

QUÉ NECESITO:
1. "characters": EXACTAMENTE un personaje por cada persona nueva de la lista anterior, ni uno más.
   Cada uno con suspectId EXACTO. Nada de personajes para ids que no aparezcan ahí.
2. Los personajes nuevos deben encajar en la historia SIN CONTRADECIR nada de lo ya escrito:
   ni la víctima, ni el escenario, ni los secretos y coartadas existentes, ni la solución.
   Explica de forma natural por qué estaban en la casa esa noche.
3. "secret": secretos que se ENTRELACEN con los de los personajes ya escritos (que uno de los
   antiguos sepa algo del nuevo, o al revés), para que el recién llegado no quede aislado.
4. "alibi": coartadas que se APOYEN en personajes existentes citándolos por su nombre de ficción,
   con alguna costura suelta que los detectives puedan tirar.
5. "knowledge": 2 o 3 conocimientos concretos sobre OTROS personajes (existentes o nuevos).
6. "personalHook": adaptado a la descripción psicológica de esa persona real; dile en segunda
   persona cómo aprovechar su forma de ser esta noche. Si no hay descripción, conviértelo en ventaja.
7. "characterName": nombre de ficción que incorpore su nombre real, al estilo de los ya existentes,
   sin repetir ningún apellido o sobrenombre ya usado.
8. "extraClues": ${
    salasSinPista
      ? `1 o 2 pistas para las salas que se han quedado sin ninguna: ${salasSinPista}. Usa ids de pista nuevos (p. ej. "pista-nueva-1").`
      : 'array vacío, todas las salas tienen ya sus pistas.'
  }
9. TODO en español, con la elegancia de novela negra de los años 20 y el mismo tono de la trama existente.${buildStyleBlock(game)}`;
}

// ---------------------------------------------------------------------------
// Normalización de la respuesta del modelo
// ---------------------------------------------------------------------------

function textoDe(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

function listaDeTextos(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  return valor.map((elemento) => textoDe(elemento)).filter((texto) => texto.length > 0);
}

/** Convierte lo recibido en `PlotCharacter[]` fiables, descartando lo que no lo sea. */
function normalizarPersonajes(valor: unknown): PlotCharacter[] {
  if (!Array.isArray(valor)) return [];
  const personajes: PlotCharacter[] = [];
  for (const bruto of valor) {
    if (!bruto || typeof bruto !== 'object') continue;
    const dato = bruto as Record<string, unknown>;
    const suspectId = textoDe(dato.suspectId);
    const characterName = textoDe(dato.characterName);
    if (!suspectId || !characterName) continue;
    personajes.push({
      suspectId,
      characterName,
      role: textoDe(dato.role),
      publicPersona: textoDe(dato.publicPersona),
      secret: textoDe(dato.secret),
      motive: textoDe(dato.motive),
      alibi: textoDe(dato.alibi),
      knowledge: listaDeTextos(dato.knowledge),
      personalHook: textoDe(dato.personalHook),
    });
  }
  return personajes;
}

/** Convierte lo recibido en `PlotClue[]` fiables, descartando lo que no lo sea. */
function normalizarPistas(valor: unknown): PlotClue[] {
  if (!Array.isArray(valor)) return [];
  const pistas: PlotClue[] = [];
  valor.forEach((bruto, indice) => {
    if (!bruto || typeof bruto !== 'object') return;
    const dato = bruto as Record<string, unknown>;
    const description = textoDe(dato.description);
    if (!description) return;
    const roomId = textoDe(dato.roomId);
    // Las pistas que llegan de una ampliación completan salas nuevas: se
    // reparten en rondas intermedias para no adelantar el desenlace.
    const ronda = Number(dato.round);
    pistas.push({
      id: textoDe(dato.id) || `pista-nueva-${indice + 1}`,
      ...(roomId ? { roomId } : {}),
      description,
      pointsTo: textoDe(dato.pointsTo),
      round: Number.isInteger(ronda) && ronda >= 1 && ronda <= 4 ? ronda : 2,
    });
  });
  return pistas;
}

/*
 * El alta de la ampliación de CLUEDO.
 *
 * Va al final de su propio fichero y no en `instalados.ts` porque lo que se da
 * de alta es la función de aquí arriba: así no hay forma de moverla o
 * renombrarla sin ver el registro. Y como `runRefresh` vive en este mismo
 * módulo, cuando alguien pone al día una partida esta línea ya ha corrido.
 */
registrarAmpliacion('cluedo', ampliarTrama);
