/**
 * Segunda llamada: el material narrativo para el papel.
 *
 * Va aparte de la generación de la trama por tres razones, y las tres importan:
 *
 * 1. La llamada principal ya roza su límite de tokens —hay un error dedicado a
 *    `max_tokens` en `pipeline.ts`— y esto le sumaría varios miles de palabras.
 * 2. Una partida ya escrita, revisada y corregida puede recibir su material sin
 *    regenerar el misterio y perderlo. Es la ruta de migración.
 * 3. Si esta llamada falla, se pierde el material, no la trama.
 */
import type {
  GameSession,
  GenerateStreamEvent,
  Plot,
  PlotNarration,
  PlotTwist,
  PrintMaterial,
  TimelineReveal,
} from '../../../shared/types';
import { DEMO_MODE } from '../config';
import { esfuerzoPara, getAnthropicClient, resolveModel, streamDeGeneracion, textoDe } from '../agent/anthropic';
import { numeroDeRondas } from '../docs/datos';
import { buildStyleBlock } from './style';
import { culpableDe, lugarDe, objetoDe, objetosDe, salasDe, sospechososDe, victimaDe } from '../juegos/cluedo';
import { registrarMaterial } from '../juegos/materiales';
import { emisorDeProgreso } from '../live/proyeccion';
import { apuntarUso, volcarGasto } from '../gasto/contador';
import { pistasDeLaTrama } from '../../../shared/mecanicas/pistas';

type Emitir = (evento: GenerateStreamEvent) => void;

const SYSTEM_MATERIAL =
  'Eres un director de juego experto en veladas de misterio en vivo. ' +
  'Escribes el material que se lee en voz alta y el que se entrega en sobres cerrados: ' +
  'narraciones que abren cada ronda, giros personales que reactivan la partida, ' +
  'y el desenlace. Escribes siempre en español, para ser leído en alto ante una mesa, ' +
  'con frases cortas y sin adornos que se traben. ' +
  'Devuelves exclusivamente el JSON pedido, respetando los ids proporcionados.';

// ---------------------------------------------------------------------------
// Esquema
// ---------------------------------------------------------------------------

export const MATERIAL_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['narrations', 'twists', 'timelineReveals', 'hints', 'finale'],
  properties: {
    narrations: {
      type: 'array',
      description:
        'Una narración de apertura (round 0) y una por cada ronda. Se leen literalmente en voz alta.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['round', 'title', 'text', 'stageDirection'],
        properties: {
          round: { type: 'integer', description: '0 para la apertura; 1..N para cada ronda' },
          title: { type: 'string', description: 'Título corto del momento' },
          text: {
            type: 'string',
            description:
              'De 80 a 160 palabras escritas para decirse en alto: frases cortas, sin subordinadas largas. No revela la solución.',
          },
          stageDirection: {
            type: 'string',
            description:
              'Indicación escénica breve para el Game Master (apagar una luz, mostrar un objeto, callar unos segundos). Cadena vacía si no hace falta.',
          },
        },
      },
    },
    twists: {
      type: 'array',
      description:
        'Giros personales: instrucciones privadas que reactivan la partida a mitad de velada. Entre dos y seis, cada uno para un sospechoso DISTINTO, repartidos entre las rondas intermedias y la última.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'participanteId', 'round', 'instruction'],
        properties: {
          id: { type: 'string', description: 'Identificador único, p. ej. "giro-1"' },
          participanteId: { type: 'string', description: 'Id EXACTO del sospechoso que lo recibe' },
          round: { type: 'integer', description: 'Ronda al cerrar la cual se entrega' },
          instruction: {
            type: 'string',
            description:
              'De 40 a 90 palabras en SEGUNDA persona, dirigidas a ese jugador: o confiesa su propia falta y con ella explica una pista ya vista (cuál, y por qué no era el crimen), o revela un dato preciso que tenía sin saber que importaba (una hora, un registro, lo que vio). Dice qué hacer con ello. No nombra al culpable.',
          },
        },
      },
    },
    timelineReveals: {
      type: 'array',
      description:
        'Lo que el grupo puede dar por establecido al cerrar cada ronda: una entrada por ronda que rellena poco a poco el tramo sin testigos.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['round', 'time', 'fact'],
        properties: {
          round: { type: 'integer', description: 'Ronda tras la cual se destapa' },
          time: { type: 'string', description: 'Hora del hecho, p. ej. "21:43"' },
          fact: {
            type: 'string',
            description:
              'De 25 a 50 palabras: un hecho comprobado que ya nadie discute. No nombra al culpable como tal.',
          },
        },
      },
    },
    hints: {
      type: 'array',
      description:
        'Tres ayudas graduadas para cuando el grupo se atasca, de la más suave a la más explícita.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['level', 'text'],
        properties: {
          level: {
            type: 'integer',
            enum: [1, 2, 3],
            description: '1 separa las preguntas que hay que hacerse, 2 dice qué pruebas mirar juntas, 3 da la secuencia decisiva',
          },
          text: {
            type: 'string',
            description: 'La ayuda, leída en voz alta a toda la mesa. Ordena el razonamiento; nunca nombra a la persona, el objeto ni la sala.',
          },
        },
      },
    },
    finale: {
      type: 'object',
      additionalProperties: false,
      required: ['reconstruction', 'confession', 'epilogue'],
      description: 'El cierre, que se lee al abrir el sobre del crimen tras recoger las acusaciones.',
      properties: {
        reconstruction: {
          type: 'string',
          description:
            'Reconstrucción minuto a minuto de lo que ocurrió realmente, leída en voz alta. Encaja con la cronología y con las pistas.',
        },
        confession: {
          type: 'string',
          description:
            'La confesión del culpable en PRIMERA persona, para que la lea quien lo interpretó. De 60 a 120 palabras.',
        },
        epilogue: {
          type: 'string',
          description:
            'Qué fue de cada cual después: cierra el hilo de cada personaje y de cada falta que salió a la luz. Termina la velada con una nota de humor o de amargura.',
        },
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Generación
// ---------------------------------------------------------------------------

/** Escribe el material impreso de una trama ya validada. */
/**
 * ESTE MATERIAL ES DE CLUEDO, y por eso se da de alta a nombre de CLUEDO al
 * final del fichero. Se lee en el propio pipeline: pide culpable, arma y sala.
 * Un juego que no tenga esas tres cosas no puede pasar por aquí.
 */
export async function generarMaterialImpreso(
  game: GameSession,
  plot: Plot,
  emit: Emitir,
): Promise<PrintMaterial> {
  const material = DEMO_MODE
    ? await materialDemo(game, plot, emit)
    : await materialConApi(game, plot, emit);
  return sanear(material, game, plot);
}

async function materialConApi(game: GameSession, plot: Plot, emit: Emitir): Promise<PrintMaterial> {
  const client = getAnthropicClient();
  if (!client) return materialDemo(game, plot, emit);

  const model = await resolveModel(game);
  const stream = streamDeGeneracion(client, {
    model,
    esfuerzo: esfuerzoPara(game, 'material'),
    maxTokens: 64000,
    system: SYSTEM_MATERIAL,
    schema: MATERIAL_SCHEMA,
    messages: [{ role: 'user', content: construirPrompt(game, plot) }],
  });

  stream.on('text', emisorDeProgreso(game, emit));
  const mensaje = await stream.finalMessage();
  // Lo que ha costado esta llamada. No puede tumbar la generacion.
  apuntarUso({ concepto: 'material', model: mensaje.model ?? model, usage: mensaje.usage, gameId: game.id });

  if (mensaje.stop_reason === 'refusal') {
    throw new Error('El modelo declinó escribir el material. Revisa los textos de la partida.');
  }
  if (mensaje.stop_reason === 'max_tokens') {
    throw new Error(
      'El material superó el límite de tokens y quedó incompleto. Vuelve a intentarlo; la trama no se ha tocado.',
    );
  }

  const texto = textoDe(mensaje);
  try {
    return JSON.parse(texto) as PrintMaterial;
  } catch {
    throw new Error('La respuesta del modelo no es un JSON válido. Vuelve a intentarlo.');
  }
}

function construirPrompt(game: GameSession, plot: Plot): string {
  const rondas = numeroDeRondas(plot);
  const nombre = (id: string): string =>
    sospechososDe(game).find((s) => s.id === id)?.name ?? id;

  // El secreto y la noche de cada cual: un giro que confiesa una falta tiene que saber cuál es.
  const personajes = plot.characters
    .map((p) =>
      [
        `- id: "${p.participanteId}" · ${p.characterName} (${nombre(p.participanteId)}) · ${p.role}`,
        p.secret ? `  secreto: ${p.secret}` : '',
        p.nightStory ? `  su noche: ${p.nightStory}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n');

  const cronologia = plot.timeline
    .map((e) => `- ${e.time} ${e.isPublic ? '[público]' : '[secreto]'} ${e.description}`)
    .join('\n');

  const pistas = pistasDeLaTrama(plot)
    .map((c) => {
      const sala = salasDe(game).find((r) => r.id === c.lugarId)?.name ?? 'sin sala';
      return `- ronda ${c.round} · ${sala}: ${c.description}`;
    })
    .join('\n');

  const asesino = plot.characters.find((c) => c.participanteId === culpableDe(plot.solution));
  const arma = objetosDe(game).find((w) => w.id === objetoDe(plot.solution))?.name ?? '';
  const sala = salasDe(game).find((r) => r.id === lugarDe(plot.solution))?.name ?? '';

  return `Escribe el material impreso de esta partida de misterio en vivo, que YA tiene trama cerrada.

TÍTULO: ${plot.title}
LEMA: ${plot.tagline}
VÍCTIMA: ${victimaDe(plot).name} — ${victimaDe(plot).description}
AMBIENTACIÓN: ${plot.setting}

PERSONAJES (usa sus ids EXACTOS en twists[].participanteId):
${personajes}

CRONOLOGÍA COMPLETA:
${cronologia}

PISTAS POR RONDA:
${pistas}

LA SOLUCIÓN (solo para que el material encaje; NO la reveles fuera de "finale"):
${asesino?.characterName ?? ''} mató a ${victimaDe(plot).name} con ${arma} en ${sala}.
Motivo: ${plot.solution.motive}
Cómo ocurrió: ${plot.solution.howItHappened}

LA PARTIDA TIENE ${rondas} RONDAS.

REQUISITOS:
1. narrations: exactamente ${rondas + 1} entradas, con round 0 (apertura) y round 1..${rondas}. Ninguna revela la solución: son el telón que se levanta al empezar cada tramo, y cada una le dice a la mesa qué pregunta toca ahora. La apertura pone a la víctima a agraviar en público a varios invitados, no solo a uno. Las del medio separan el desorden de la noche del momento de la muerte y avisan de que no todo lo escondido es el crimen («no confundáis una mentira con un asesinato»). La última pide reconstruir el camino entero: de dónde salió el objeto, cómo llegó, qué pasó a la hora del crimen y cómo volvió quien lo hizo.
2. twists: entre ${Math.min(2, maximoDeGiros(sospechososDe(game).length))} y ${maximoDeGiros(sospechososDe(game).length)} giros, cada uno para un sospechoso DISTINTO y NINGUNO para el culpable —si el culpable recibiera un giro se delataría solo—. Y al menos un inocente se queda sin giro: si todos los inocentes recibieran sobre, el único sin él sería el culpable. Reparte entre las rondas 1 y ${rondas}, con más hacia el final. Cada giro es de una de dos clases: la CONFESIÓN de un inocente de su propia falta, que explica una pista ya vista y la saca del caso; o un DATO preciso que un personaje tenía sin saber que importaba —una hora, un registro, lo que vio—. Los datos que fijan horas del tramo del crimen van en giros de las dos últimas rondas, nunca antes. Los dos acotan sin nombrar a nadie: un giro que diga quién fue estropea la noche.
3. timelineReveals: una entrada por ronda (1..${rondas}), en orden cronológico, que vaya estrechando la hora de la muerte. Una de las primeras separa el tramo confuso del crimen (por ejemplo, que la víctima seguía viva después). La última da las marcas horarias decisivas. Fijan horas y estados —quién seguía vivo y cuándo—, nunca la respuesta: ningún hecho nombra al culpable ni el arma, ni tampoco la sala del crimen si el cuerpo apareció en otro sitio. Eso lo deducen las pistas.
4. hints: tres ayudas graduadas que ordenan el razonamiento sin dar respuestas: la 1 separa las preguntas que hay que hacerse (quién pudo mover el objeto, quién pudo hacer ese camino, qué rasgo encaja); la 2 dice qué pruebas mirar juntas; la 3 da la secuencia decisiva de horas o de hechos. Ninguna nombra a la persona, el objeto ni la sala.
5. finale: la reconstrucción, la confesión en primera persona para que la lea quien interpretó al culpable, y el epílogo, que cierra el hilo de cada personaje y de cada falta que salió a la luz.
6. EL MISMO TRATO: ninguna narración, hecho establecido ni ayuda destaca al culpable sobre los demás. La apertura presenta a todos por igual o no nombra a nadie; si una narración nombra a alguien, nombra también a otros.
7. Todo en español, escrito para leerse en voz alta ante una mesa: frases cortas, sin subordinadas largas.${buildStyleBlock(game)}`;
}

// ---------------------------------------------------------------------------
// Saneado
// ---------------------------------------------------------------------------

/**
 * Cuántos giros caben en una mesa de `personas` sin que el reparto delate a
 * nadie: el culpable no recibe ninguno, así que al menos un inocente tiene que
 * quedarse sin el suyo. Seis como mucho, que es lo que una noche digiere.
 */
export function maximoDeGiros(personas: number): number {
  return Math.max(0, Math.min(6, personas - 2));
}

/**
 * Recorta lo que no encaja con la partida real.
 *
 * El modelo puede inventarse un id, dar un giro al culpable —que se delataría
 * solo— o repetir persona. Aquí se descarta lo imposible antes de guardarlo.
 */
function sanear(material: PrintMaterial, game: GameSession, plot: Plot): PrintMaterial {
  const idsValidos = new Set(sospechososDe(game).map((s) => s.id));
  const rondas = numeroDeRondas(plot);
  const vistos = new Set<string>();

  const twists: PlotTwist[] = (material.twists ?? [])
    .filter((giro) => {
      if (!giro || typeof giro.participanteId !== 'string') return false;
      if (!idsValidos.has(giro.participanteId)) return false;
      if (giro.participanteId === culpableDe(plot.solution)) return false;
      if (vistos.has(giro.participanteId)) return false;
      vistos.add(giro.participanteId);
      return true;
    })
    /*
     * Y NUNCA A TODOS LOS INOCENTES. Con siete a la mesa esto dejaba pedir seis
     * giros: uno por inocente, y el único sin sobre era quien lo hizo. El
     * culpable ya no recibe giro por lo de arriba; lo que faltaba era que eso
     * no se notara.
     */
    .slice(0, maximoDeGiros(idsValidos.size))
    .map((giro, indice) => ({
      ...giro,
      id: giro.id || `giro-${indice + 1}`,
      round: Math.min(Math.max(Math.round(giro.round) || 2, 1), rondas),
    }));

  const narrations: PlotNarration[] = (material.narrations ?? [])
    .filter((n) => n && typeof n.text === 'string' && n.text.trim())
    .map((n) => ({ ...n, round: Math.min(Math.max(Math.round(n.round) || 0, 0), rondas) }))
    .sort((a, b) => a.round - b.round);

  const timelineReveals: TimelineReveal[] = (material.timelineReveals ?? [])
    .filter((r) => r && typeof r.fact === 'string' && r.fact.trim())
    .map((r) => ({ ...r, round: Math.min(Math.max(Math.round(r.round) || 1, 1), rondas) }))
    .sort((a, b) => a.round - b.round);

  return {
    narrations,
    twists,
    timelineReveals,
    hints: (material.hints ?? []).filter((h) => h && typeof h.text === 'string' && h.text.trim()),
    finale: material.finale ?? { reconstruction: '', confession: '', epilogue: '' },
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Modo demo
// ---------------------------------------------------------------------------

/**
 * Material de relleno para poder probar el paquete sin clave de API.
 *
 * No pretende ser bueno: pretende tener la forma exacta del de verdad, para que
 * las plantillas se puedan verificar sin gastar un céntimo.
 */
async function materialDemo(game: GameSession, plot: Plot, emit: Emitir): Promise<PrintMaterial> {
  for (const paso of [
    'Escribiendo la apertura de la velada…',
    'Repartiendo giros entre los invitados…',
    'Cerrando el desenlace…',
  ]) {
    emit({ type: 'text', delta: `${paso}\n` });
    await new Promise((r) => setTimeout(r, 160));
  }

  const rondas = numeroDeRondas(plot);
  const inocentes = sospechososDe(game).filter((s) => s.id !== culpableDe(plot.solution));
  const arma = objetosDe(game).find((w) => w.id === objetoDe(plot.solution))?.name ?? 'el arma';
  const sala = salasDe(game).find((r) => r.id === lugarDe(plot.solution))?.name ?? 'la sala';
  const asesino = plot.characters.find((c) => c.participanteId === culpableDe(plot.solution));
  const publicos = plot.timeline.filter((e) => e.isPublic);

  const narrations: PlotNarration[] = [
    {
      round: 0,
      title: 'La velada empieza',
      text: `Bienvenidos a ${plot.setting.slice(0, 80)}. Esta noche ${victimaDe(plot).name} ha reunido a todos por una razón que nadie termina de entender. Miraos bien: dentro de un rato, uno de vosotros habrá mentido.`,
      stageDirection: 'Baja la música antes de empezar.',
    },
    ...Array.from({ length: rondas }, (_, i) => ({
      round: i + 1,
      title: `Ronda ${i + 1}`,
      text: `Se abre la ronda ${i + 1}. Hay evidencia nueva en las salas que voy a nombrar. Tenéis unos minutos: hablad, mirad, y no os fieis de quien conteste demasiado rápido.`,
      stageDirection: i === 0 ? 'Reparte las hojas de investigación.' : '',
    })),
  ];

  const twists: PlotTwist[] = inocentes.slice(0, Math.min(4, inocentes.length)).map((s, i) => ({
    id: `giro-${i + 1}`,
    participanteId: s.id,
    round: Math.min(2 + (i % Math.max(1, rondas - 1)), rondas),
    instruction: `Acabas de recordar algo que callaste al principio: aquella noche viste moverse a alguien cerca de ${sala}. No sabes quién era. Cuéntalo cuando te pregunten, pero admite que llevas toda la velada ocultándolo.`,
  }));

  const timelineReveals: TimelineReveal[] = Array.from({ length: rondas }, (_, i) => ({
    round: i + 1,
    time: publicos[Math.min(i, Math.max(0, publicos.length - 1))]?.time ?? `2${i}:00`,
    fact: `Queda establecido que, a esa hora, no todos estaban donde dijeron estar. Al menos una de las coartadas de esta mesa no se sostiene.`,
  }));

  return {
    narrations,
    twists,
    timelineReveals,
    hints: [
      { level: 1, text: 'Volved a la cronología: hay un tramo del que nadie ha dicho nada.' },
      { level: 2, text: `Preguntaos qué objeto ha cambiado de sitio esta noche.` },
      { level: 3, text: `El crimen ocurrió en ${sala}, y ${arma} no estaba donde debía.` },
    ],
    finale: {
      reconstruction: `Durante el tramo sin testigos, ${asesino?.characterName ?? 'el culpable'} entró en ${sala}. Lo demás fue rápido: ${arma} estaba a mano y ${victimaDe(plot).name} no esperaba visita.`,
      confession: `Está bien. Fui yo. No lo planeé, o eso me repito desde entonces. Cogí ${arma} porque estaba ahí, y porque llevaba años tragándome lo que ${victimaDe(plot).name} me hizo. Me habría bastado con una disculpa. No hubo ninguna.`,
      epilogue: 'La casa se vendió al año siguiente. Nadie de los presentes volvió a aceptar una invitación a cenar sin preguntar antes quién más iba.',
    },
    generatedAt: new Date().toISOString(),
  };
}

/*
 * El alta. Va al final del fichero y no en `instalados.ts` porque lo que se da
 * de alta es esta función, y así no hay forma de moverla sin ver el registro.
 */
registrarMaterial('cluedo', generarMaterialImpreso);
