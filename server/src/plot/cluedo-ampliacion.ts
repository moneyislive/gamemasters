/**
 * Como pone CLUEDO al dia una trama que se quedo vieja.
 *
 * Repara la solucion si apunta a entidades borradas y escribe los personajes que
 * faltan, con el modelo o —sin clave de API— con el generador local.
 *
 * Vivia dentro de `refresh.ts`, o sea en el camino por el que pasa cualquier
 * juego que se quede viejo: cuatrocientas lineas de prompt y de normalizadores
 * de un juego concreto en un fichero comun. Se da de alta con
 * `registrarAmpliacion`, igual que los otros dos juegos, y no cambia una linea
 * de lo que hace.
 */
import type { GameSession, Plot, PlotCharacter, PlotClue } from '../../../shared/types';
import type { StalenessReport } from '../../../shared/staleness';
import { DEMO_MODE } from '../config';
import { getAnthropicClient, resolveModel } from '../agent/anthropic';
import { registrarAmpliacion } from '../juegos/ampliaciones';
import { generateDemoCharacters } from './cluedo-demo';
import { PLOT_EXTENSION_SCHEMA } from './cluedo-esquema';
import { buildStyleBlock } from './style';
import { culpableDe, lugarDe, objetoDe, victimaDe } from '../juegos/cluedo';
import { juegoDe, repararRespuestas } from '../juegos/solucion';
import { emisorDeProgreso } from '../live/proyeccion';
import { apuntarUso } from '../gasto/contador';
import type { Emitir } from './pipeline';

type ClienteAnthropic = NonNullable<ReturnType<typeof getAnthropicClient>>;

interface ReparacionSolucion {
  motive: string;
  howItHappened: string;
}

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

/** Reescritura local del motivo y del relato del crimen (modo demo y red de seguridad). */
function reparacionLocal(game: GameSession, plot: Plot): ReparacionSolucion {
  const asesino = game.suspects.find((s) => s.id === culpableDe(plot.solution));
  const personaje = plot.characters.find((c) => c.suspectId === culpableDe(plot.solution));
  const arma = game.weapons.find((w) => w.id === objetoDe(plot.solution));
  const sala = game.rooms.find((r) => r.id === lugarDe(plot.solution));

  const nombre = personaje?.characterName ?? asesino?.name ?? 'el culpable';
  const motive = personaje?.motive?.trim() || plot.solution.motive || '';
  const dondeOcurrio = sala ? sala.name : 'la sala más apartada de la casa';
  const conQue = arma ? arma.name.toLowerCase() : 'lo primero que encontró a mano';

  return {
    motive,
    howItHappened:
      `Aprovechando el apagón de las 21:40, ${nombre} se deslizó hasta ${dondeOcurrio}, ` +
      `donde ${victimaDe(plot).name} esperaba a solas una conversación "privada". ` +
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
- Víctima: ${victimaDe(plot).name} — ${victimaDe(plot).description}
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
