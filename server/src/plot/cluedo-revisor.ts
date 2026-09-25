/**
 * El revisor adversario de CLUEDO: conoce la solución, lee la trama entera con
 * ojos de quien quiere romperla y la reescribe donde haga falta.
 *
 * ═══ QUÉ LE LLEGA ═══
 *
 * Todo lo que hay escrito —trama, material y solución—, y dos informes que no
 * ha escrito él y que no puede discutir en los números:
 *
 *   · la AUDITORÍA hecha con código (`cluedo-auditoria.ts`): cuántas veces se
 *     nombra a cada cual en cada capa de la noche, qué objeto no sale nunca, qué
 *     sala no tiene pistas;
 *   · las LECTURAS del detective que no conoce la solución
 *     (`cluedo-detective.ts`): a quién señala la mesa en cada momento y por qué.
 *
 * Con eso delante, lo que tiene que hacer es criterio, no contar.
 *
 * ═══ LO QUE LE PIDIÓ MIGUEL, Y POR QUÉ ESTÁ ESCRITO ASÍ ═══
 *
 * Tres veladas de verdad enseñaron lo que falla, y las instrucciones de abajo
 * salen de ellas:
 *
 *   · un resumen que nombraba tres veces a la asesina;
 *   · armas que no se nombraban, frente a otra noche en la que cada arma era de
 *     alguien —y por eso entraba sola en la historia—;
 *   · personajes demasiado secundarios, y una pista de la última ronda que
 *     acusaba demasiado directamente.
 *
 * Y una advertencia explícita: no arreglar lo primero escondiendo al culpable.
 * «Se le debe dar el mismo trato que al resto de personajes.» Por eso las
 * instrucciones hablan de EQUILIBRAR, no de bajar la sospecha sobre nadie.
 */
import type Anthropic from '@anthropic-ai/sdk';
import type { GameSession, GenerateStreamEvent, HallazgoDeRevision, ModelId, Plot } from '../../../shared/types';
import { pistasDeLaTrama } from '../../../shared/mecanicas/pistas';
import { numeroDeRondas } from '../docs/datos';
import { culpableDe, lugarDe, objetoDe, objetosDe, salasDe, sospechososDe, victimaDe } from '../juegos/cluedo';
import { esfuerzoPara, getAnthropicClient, streamDeGeneracion, textoDe } from '../agent/anthropic';
import { apuntarUso } from '../gasto/contador';
import { emisorDeProgreso } from '../live/proyeccion';
import { PERSONAJE_SCHEMA, PISTA_SCHEMA, PLOT_SCHEMA } from './cluedo-esquema';
import { MATERIAL_SCHEMA } from './cluedo-material';
import { buildStyleBlock } from './style';
import type { CambiosDelRevisor } from './cluedo-parches';

const SISTEMA_REVISOR =
  'Eres el revisor adversario de una plataforma que vende veladas de misterio en vivo. ' +
  'Recibes una trama de CLUEDO ya escrita, con su solución, y tu trabajo es que la mesa que ha pagado por ella ' +
  'viva una noche redonda: que el caso se resuelva deduciendo y no leyendo, que nada lo delate antes de tiempo, ' +
  'que cada persona tenga una historia que jugar y que cada objeto y cada sala importen. ' +
  'Lees como alguien que quiere romper la trama y la arreglas como el autor que habría querido escribirla así. ' +
  'Nunca empobreces: cada cambio deja el texto igual de rico o más, con la misma voz y el mismo estilo. ' +
  'Escribes en español y devuelves exclusivamente el JSON pedido, con los ids exactos que se te dan.';

// ---------------------------------------------------------------------------
// Esquema
// ---------------------------------------------------------------------------

const propiedades = (esquema: Record<string, unknown>) => esquema.properties as Record<string, Record<string, unknown>>;
const itemsDe = (esquema: Record<string, unknown>, campo: string) => propiedades(esquema)[campo]!.items;

const lista = (items: unknown, description: string) => ({ type: 'array', description, items });
const cadena = (description: string) => ({ type: 'string', description });

/*
 * ═══ DOS ESQUEMAS Y NO UNO, Y NO ES GUSTO ═══
 *
 * El primero que se escribió lo pedía todo en una sola respuesta —trama,
 * material y hallazgos— y la API lo rechazó al validarlo: «The compiled grammar
 * is too large». Es exactamente lo que le pasó a `MOMIA_TRAMA_SCHEMA` en
 * producción con la suite en verde, y aquí se vio antes porque se validó contra
 * la API con `max_tokens: 1`, que no genera nada y no cuesta nada.
 *
 * Así que se pide en dos turnos de la misma conversación: primero los
 * hallazgos y los cambios de la TRAMA; después, con eso ya escrito, los del
 * MATERIAL. Las dos mitades caben de sobra (medido el 25-sep-2026: la de la
 * trama con hallazgos y la del material, con y sin ellos). El segundo turno
 * relee el primero de la caché, así que partirlo apenas cuesta.
 */

const HALLAZGOS_DEL_REVISOR = lista(
  {
    type: 'object',
    additionalProperties: false,
    required: ['codigo', 'gravedad', 'sobre', 'problema', 'arreglo'],
    properties: {
      codigo: cadena(
        'En minúsculas y con guiones: filtracion, contradiccion, cabo-suelto, irresoluble, pista-que-dicta, ' +
          'personaje-secundario, objeto-sin-historia, sala-sin-uso, desequilibrio, o el código del informe que respondes.',
      ),
      gravedad: { type: 'string', enum: ['bloqueante', 'grave', 'menor'] },
      sobre: cadena('Id de la persona, objeto, sala o pista afectada; cadena vacía si es general.'),
      problema: cadena('Qué falla, en una o dos frases.'),
      arreglo: cadena('Qué has cambiado para arreglarlo; cadena vacía si no era un problema de verdad.'),
    },
  },
  'Todo lo que has encontrado, incluidos los avisos de los informes que confirmes o descartes.',
);

const RESUMEN_DE_CAMBIOS = lista(
  { type: 'string' },
  'Una línea por cambio, para el Game Master: qué se cambió y por qué. Vacía si no cambias nada.',
);

const CAMBIOS_DE_LA_TRAMA: Record<string, unknown> = {
  titulo: cadena('Título nuevo, o cadena vacía para no cambiarlo.'),
  lema: cadena('Lema nuevo, o cadena vacía.'),
  sinopsis: cadena('Sinopsis nueva ENTERA, o cadena vacía.'),
  ambientacion: cadena('Ambientación nueva ENTERA, o cadena vacía.'),
  victima: {
    ...propiedades(PLOT_SCHEMA).victim,
    description: 'La víctima con sus dos campos, o los dos como cadena vacía para no cambiarla.',
  },
  motivo: cadena('Motivo real del crimen reescrito, o cadena vacía. NO cambia quién lo hizo.'),
  relato: cadena('Relato completo de cómo ocurrió, reescrito, o cadena vacía. Mismo culpable, arma y sala.'),
  personajes: lista(PERSONAJE_SCHEMA, 'Los personajes que cambian, COMPLETOS. Los que no cambian no se ponen.'),
  pistas: lista(PISTA_SCHEMA, 'Las pistas que cambian (mismo id) y las nuevas (id nuevo), completas.'),
  pistasRetiradas: lista({ type: 'string' }, 'Ids de pistas que sobran.'),
  cronologia: lista(
    itemsDe(PLOT_SCHEMA, 'timeline'),
    'Si cambias cualquier momento, la cronología ENTERA en orden. Lista vacía para no tocarla.',
  ),
  guion: lista({ type: 'string' }, 'El guion del Game Master entero si lo cambias; lista vacía si no.'),
};

const CAMBIOS_DEL_MATERIAL: Record<string, unknown> = {
  narraciones: lista(itemsDe(MATERIAL_SCHEMA, 'narrations'), 'Las narraciones que cambian, por ronda.'),
  giros: lista(itemsDe(MATERIAL_SCHEMA, 'twists'), 'Los giros que cambian (mismo id) o nuevos (id nuevo).'),
  girosRetirados: lista({ type: 'string' }, 'Ids de giros que sobran.'),
  revelaciones: lista(itemsDe(MATERIAL_SCHEMA, 'timelineReveals'), 'Los hechos establecidos que cambian, por ronda.'),
  ayudas: lista(itemsDe(MATERIAL_SCHEMA, 'hints'), 'Las ayudas que cambian, por nivel.'),
  desenlace: {
    ...propiedades(MATERIAL_SCHEMA).finale,
    description: 'El desenlace con sus tres campos; cada campo en cadena vacía si no cambia.',
  },
};

function objeto(campos: Record<string, unknown>, description?: string): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: false,
    required: Object.keys(campos),
    properties: campos,
    ...(description ? { description } : {}),
  };
}

/** Primer turno: lo que encontró y cómo queda la trama. */
export const REVISION_TRAMA_SCHEMA = objeto({
  diagnostico: cadena('Tres o cuatro frases: cómo está la trama y qué era lo más urgente.'),
  hallazgos: HALLAZGOS_DEL_REVISOR,
  cambios: objeto(CAMBIOS_DE_LA_TRAMA),
  resumenDeCambios: RESUMEN_DE_CAMBIOS,
});

/** Segundo turno: el material, ya con los cambios de la trama escritos. */
export const REVISION_MATERIAL_SCHEMA = objeto({
  cambios: objeto(CAMBIOS_DEL_MATERIAL),
  resumenDeCambios: RESUMEN_DE_CAMBIOS,
});

/** Cuando solo se revisa el material: sus hallazgos y sus cambios en un turno. */
export const REVISION_SOLO_MATERIAL_SCHEMA = objeto({
  diagnostico: cadena('Tres o cuatro frases: cómo está el material y qué era lo más urgente.'),
  hallazgos: HALLAZGOS_DEL_REVISOR,
  cambios: objeto(CAMBIOS_DEL_MATERIAL),
  resumenDeCambios: RESUMEN_DE_CAMBIOS,
});

export interface RespuestaDelRevisor {
  diagnostico: string;
  hallazgos: Array<{ codigo: string; gravedad: 'bloqueante' | 'grave' | 'menor'; sobre: string; problema: string; arreglo: string }>;
  cambios: CambiosDelRevisor;
  resumenDeCambios: string[];
}

// ---------------------------------------------------------------------------
// La trama, en texto
// ---------------------------------------------------------------------------

/** La trama entera, con sus ids, para que el revisor pueda citar y sustituir piezas exactas. */
export function tramaEnTexto(game: GameSession, plot: Plot): string {
  const nombreDe = (id: string) => sospechososDe(game).find((s) => s.id === id)?.name ?? id;
  const salaDe = (id?: string) => salasDe(game).find((r) => r.id === id)?.name ?? 'sin sala';
  const personajes = plot.characters
    .map(
      (c) =>
        `### ${c.characterName} — id "${c.participanteId}" (lo juega ${nombreDe(c.participanteId)})\n` +
        `- role: ${c.role}\n- publicPersona: ${c.publicPersona}\n- secret: ${c.secret ?? ''}\n` +
        `- motive: ${c.motive ?? ''}\n- alibi: ${c.alibi ?? ''}\n` +
        `- knowledge:\n${(c.knowledge ?? []).map((k) => `  · ${k}`).join('\n') || '  (nada)'}\n` +
        `- personalHook: ${c.personalHook ?? ''}\n` +
        `- nightStory: ${c.nightStory ?? '(no tiene)'}`,
    )
    .join('\n\n');
  const cronologia = plot.timeline
    .map((e) => `- ${e.time} ${e.isPublic ? '[PÚBLICO]' : '[secreto]'} (${e.participanteIds.map(nombreDe).join(', ') || 'nadie en concreto'}) ${e.description}`)
    .join('\n');
  const pistas = [...pistasDeLaTrama(plot)]
    .sort((a, b) => a.round - b.round)
    .map((p) => `- [${p.id}] ronda ${p.round} · ${salaDe(p.lugarId)} (${p.lugarId}): ${p.description}\n  apunta a: ${p.pointsTo}`)
    .join('\n');

  const partes = [
    `## CABECERA
- título: ${plot.title}
- lema: ${plot.tagline}
- sinopsis: ${plot.synopsis}
- ambientación: ${plot.setting}
- víctima: ${victimaDe(plot).name} — ${victimaDe(plot).description}`,
    `## PERSONAJES\n${personajes}`,
    `## CRONOLOGÍA\n${cronologia}`,
    `## PISTAS\n${pistas}`,
    `## GUION DEL GAME MASTER\n${plot.gmScript.map((p, i) => `${i + 1}. ${p}`).join('\n')}`,
  ];

  const m = plot.material;
  if (m) {
    partes.push(
      `## MATERIAL IMPRESO
### Narraciones (se leen en voz alta)
${m.narrations.map((n) => `- ronda ${n.round} «${n.title}»: ${n.text}${n.stageDirection ? ` [escena: ${n.stageDirection}]` : ''}`).join('\n')}
### Giros (sobre privado al cerrar la ronda)
${m.twists.map((g) => `- [${g.id}] ronda ${g.round} para ${nombreDe(g.participanteId)} (${g.participanteId}): ${g.instruction}`).join('\n') || '(ninguno)'}
### Hechos establecidos al cerrar cada ronda
${m.timelineReveals.map((r) => `- ronda ${r.round}, ${r.time}: ${r.fact}`).join('\n')}
### Ayudas (solo si la mesa se atasca)
${m.hints.map((h) => `- nivel ${h.level}: ${h.text}`).join('\n')}
### Desenlace
- reconstrucción: ${m.finale.reconstruction}
- confesión: ${m.finale.confession}
- epílogo: ${m.finale.epilogue}`,
    );
  } else {
    partes.push('## MATERIAL IMPRESO\n(Esta trama todavía no tiene material: revisa solo la trama.)');
  }
  return partes.join('\n\n');
}

function entidadesEnTexto(game: GameSession): string {
  const linea = (e: { id: string; name: string; description?: string }) =>
    `- id "${e.id}" · ${e.name}${e.description?.trim() ? ` · ${e.description.trim()}` : ''}`;
  return `PERSONAS REALES (con su descripción psicológica):
${sospechososDe(game).map(linea).join('\n')}

SALAS REALES:
${salasDe(game).map(linea).join('\n')}

OBJETOS REALES:
${objetosDe(game).map(linea).join('\n')}`;
}

function hallazgosEnTexto(hallazgos: HallazgoDeRevision[]): string {
  if (hallazgos.length === 0) return '(ninguno)';
  return hallazgos
    .map((h) => `- [${h.gravedad}] ${h.codigo}${h.sobre ? ` (${h.sobre})` : ''}: ${h.texto}`)
    .join('\n');
}

// ---------------------------------------------------------------------------
// La instrucción
// ---------------------------------------------------------------------------

export function construirPromptDelRevisor(
  game: GameSession,
  plot: Plot,
  informes: { auditoria: string; lecturas: string; hallazgos: HallazgoDeRevision[] },
  opciones: { soloMaterial: boolean; pasada: number },
): string {
  const nombre = (id: string) => plot.characters.find((c) => c.participanteId === id)?.characterName ?? id;
  const arma = objetosDe(game).find((o) => o.id === objetoDe(plot.solution))?.name ?? '';
  const sala = salasDe(game).find((r) => r.id === lugarDe(plot.solution))?.name ?? '';
  const rondas = numeroDeRondas(plot);
  const inocentes = Math.max(0, sospechososDe(game).length - 1);

  const alcance = opciones.soloMaterial
    ? `\nALCANCE: esta trama ya pasó su revisión y se acaba de reescribir SOLO su material. Corrige únicamente el material (narraciones, giros, hechos establecidos, ayudas y desenlace); los demás campos de «cambios» déjalos vacíos.\n`
    : '';
  const segunda =
    opciones.pasada > 0
      ? `\nESTA ES LA PASADA ${opciones.pasada + 1}: la trama ya se corrigió una vez y los informes de arriba son los de DESPUÉS de esa corrección. Céntrate en lo que sigue pendiente, sin deshacer lo que ya funciona.\n`
      : '';

  return `Revisa esta trama de CLUEDO EN VIVO antes de entregarla a una mesa que ha pagado por ella.
${alcance}${segunda}
${entidadesEnTexto(game)}

LA SOLUCIÓN (no se cambia: ni quién, ni con qué, ni dónde):
- Culpable: ${nombre(culpableDe(plot.solution))} (id "${culpableDe(plot.solution)}")
- Arma: ${arma} (id "${objetoDe(plot.solution)}")
- Sala: ${sala} (id "${lugarDe(plot.solution)}")
- Motivo real: ${plot.solution.motive ?? ''}
- Cómo ocurrió: ${plot.solution.howItHappened ?? ''}

LA TRAMA COMPLETA (${rondas} rondas):
${tramaEnTexto(game, plot)}

LO QUE HA CONTADO LA AUDITORÍA (hecha con código: los números son fiables, la interpretación es tuya):
${informes.auditoria}

LO QUE HA LEÍDO UN DETECTIVE QUE NO CONOCE LA SOLUCIÓN (a quién señalaría la mesa en cada momento):
${informes.lecturas || '(no hay lecturas del detective)'}

AVISOS DE LOS DOS INFORMES:
${hallazgosEnTexto(informes.hallazgos)}

TU TAREA:
1. Lee la trama entera buscando todo lo que estropearía la noche. Además de los avisos de arriba, busca por tu cuenta:
   - Contradicciones: horas, coartadas cruzadas que no coinciden, alguien en dos sitios, pasadizos que el plano no tiene, pistas que contradicen la cronología sin ser una mentira marcada en el secreto de alguien.
   - Cabos sueltos: secretos que no llevan a ninguna parte, pistas que no apuntan a nada, motivos que no se sostienen, giros sin consecuencia.
   - Filtraciones: cualquier texto que la mesa lea —título, lema, sinopsis, ambientación, cronología pública, caras públicas, narraciones, hechos establecidos, giros, ayudas y el «apunta a» de las pistas— que señale a la persona culpable más que a las demás. Y ningún hecho establecido ni ayuda da la respuesta hecha: ni el arma, ni la sala del crimen si el cuerpo apareció en otro sitio.
   - Resolubilidad: culpable, arma y sala tienen que poder deducirse COMBINANDO al menos tres pistas de al menos dos rondas distintas. Ninguna pista, ni siquiera de la última ronda, puede bastar por sí sola. Cada inocente tiene que poder descartarse, o al menos quedar por debajo al final.
   - Protagonismo: cada persona con una historia propia que jugar: un secreto que merezca esconderse, un motivo creíble contra la víctima, un movimiento sospechoso en la cronología y al menos dos pistas que hablen de ella a lo largo de la noche. Nadie de relleno.
   - Objetos: cada objeto nombrado por su nombre en pistas o dosieres, ligado a algún personaje (suyo, heredado, regalado, de su oficio, con una historia) y con una razón para poder ser el arma. Los que no lo son, descartables con alguna prueba.
   - Salas: cada sala con alguna pista y con alguien que pasó por ella.
   - Faltas que no son el crimen: al menos la mitad de los inocentes esconde una falta propia de esa noche (un robo, una falsificación, un chantaje, algo en una copa, tocar la escena) con su pista física y su explicación. Es lo que hace que el caso se resuelva separando mentiras de asesinatos; si falta, dáselo a quien no tenga una historia que jugar. Y que el culpable no sea el único sin nada que confesar: si lo es, dale una falta menor propia, con su pista, que le sirva de tapadera.
   - El camino hasta el culpable: el crimen se prueba reconstruyendo el trayecto del objeto (de dónde salió, cómo y cuándo se movió, qué pasó a la hora del crimen, cómo volvió quien lo hizo) y con un rasgo del culpable que otras personas comparten en parte. Si falta, constrúyelo con pistas de las rondas 3 y 4 que sean piezas, no veredictos.
   - Lo que se sabe al empezar no resuelve: la sinopsis, la ambientación, la cronología pública, la narración de apertura y lo que los dosieres dejan contar desde el principio —coartadas y lo que cada cual sabe de los demás— no fijan la hora de la muerte, ni el trayecto del objeto, ni el rasgo del culpable. Esas piezas llegan con las pistas, los hechos de cada ronda y los giros de las rondas 3 y 4. Si varios testimonios de los dosieres, sumados, reconstruyen el camino del culpable, mueve esas horas a las pistas o a los giros tardíos y deja en los dosieres observaciones ambiguas. Y los agravios públicos de la víctima se reparten entre varias personas en lugar de acumularse en una.
   - Tu noche: cada personaje tiene su nightStory, coherente al minuto con su coartada, la cronología y las pistas, y todas de una extensión parecida: la del culpable nunca la más larga ni la de un inocente un trámite. El largo del dosier impreso no puede delatar a nadie.
   - El guion: investigación individual —cada cual elige sala y habla con quien coincide—, sin equipos, portavoces ni informes de grupo.
2. EL MISMO TRATO PARA LA PERSONA CULPABLE. No se trata de que se la señale poco: se trata de que se la señale COMO A LAS DEMÁS. Si destaca por arriba, equilibra: da a los inocentes sospechas razonables (motivos, movimientos, objetos, mentiras menores) y reescribe lo que la subraya a ella. Si destaca por abajo —nadie la mira—, dale los mismos hilos sospechosos que a cualquiera. La verdad solo se impone al COMBINAR las pruebas de las últimas rondas.
3. Corrige con cambios mínimos pero completos: cuando cambies un personaje, una pista o un momento, escríbelo ENTERO. Si cambias un dato que aparece en otro sitio (una hora, un objeto, una coartada, un nombre), cambia también ese otro sitio para que todo siga cuadrando.
4. No cambies la solución. Puedes reescribir el motivo real y el relato del crimen si hace falta para que encaje con lo que corriges.
5. No empobrezcas: no acortes secretos, coartadas, noches, pistas ni narraciones. Si reescribes, que quede igual de rico o más, con la misma voz.
6. El «apunta a» de cada pista lo lee quien la encuentra al cerrar la ronda: tiene que decir qué sugiere (una hora que no cuadra, un objeto fuera de sitio, una mentira), no dictar un veredicto.
7. Giros: ninguno para la persona culpable, y al menos un inocente se queda sin giro (hay ${inocentes} inocentes): si no, el único sin sobre sería quien lo hizo. Cada giro confiesa la falta de un inocente —y saca del caso la pista que dejó— o revela un dato preciso que alguien tenía sin saberlo; ninguno nombra al culpable.
8. Si un aviso de los informes no es un problema de verdad, dilo en tus hallazgos con el arreglo vacío y no toques nada por él.

FORMATO DE LOS CAMBIOS: cadena vacía o lista vacía significa «sin cambios» en ese campo. Los personajes y las pistas que cambian van completos; la cronología y el guion, si los tocas, enteros; narraciones y hechos por ronda, ayudas por nivel, giros por id. En resumenDeCambios, una línea por cambio para el Game Master.${
    opciones.soloMaterial
      ? ''
      : plot.material
        ? '\n\nEN ESTA RESPUESTA van tus hallazgos y los cambios de la TRAMA. El material te lo pediré justo después, aparte.'
        : ''
  }${buildStyleBlock(game)}`;
}

/** El segundo turno: el material, coherente con lo que se acaba de cambiar en la trama. */
const PEDIDO_DEL_MATERIAL =
  'Ahora el MATERIAL IMPRESO: narraciones, giros, hechos establecidos, ayudas y desenlace. Aplícale la misma ' +
  'revisión —el mismo trato para todos, nada que delate antes de tiempo, nada que dicte la solución— y déjalo ' +
  'coherente con los cambios que acabas de hacer en la trama: si cambiaste una hora, un objeto, una pista o un ' +
  'personaje, que el material lo refleje. Mismo formato: vacío es «sin cambios».';

// ---------------------------------------------------------------------------
// La llamada
// ---------------------------------------------------------------------------

export async function pedirRevision(
  game: GameSession,
  plot: Plot,
  model: ModelId,
  informes: { auditoria: string; lecturas: string; hallazgos: HallazgoDeRevision[] },
  opciones: { soloMaterial: boolean; pasada: number },
  emit: (evento: GenerateStreamEvent) => void,
): Promise<RespuestaDelRevisor> {
  const client = getAnthropicClient();
  if (!client) throw new Error('No hay clave de API: el revisor no puede leer la trama.');

  /*
   * El primer mensaje lleva su propia marca de caché: el segundo turno lo
   * reenvía entero, y releerlo de la caché cuesta una fracción de escribirlo.
   */
  const primero: Anthropic.MessageParam = {
    role: 'user',
    content: [
      {
        type: 'text',
        text: construirPromptDelRevisor(game, plot, informes, opciones),
        cache_control: { type: 'ephemeral' },
      },
    ],
  };

  /*
   * El juicio —qué falla y cómo se arregla la trama— piensa lo del revisor. El
   * material es poner al día prosa ya escrita con lo decidido: piensa lo del
   * material. En la primera velada completa, los cuatro turnos del revisor a
   * `high` fueron 84.000 tokens de salida y 2,47 $ de 4,09 $.
   */
  const turno = async (messages: Anthropic.MessageParam[], schema: Record<string, unknown>, paso: 'revisor' | 'material' = 'revisor') => {
    const stream = streamDeGeneracion(client, {
      model,
      esfuerzo: esfuerzoPara(game, paso),
      maxTokens: 128000,
      system: SISTEMA_REVISOR,
      schema,
      messages,
    });
    // A ciegas, puntos: el revisor escribe con la solución delante.
    stream.on('text', emisorDeProgreso(game, emit));
    const mensaje = await stream.finalMessage();
    apuntarUso({ concepto: 'revisor', model: mensaje.model ?? model, usage: mensaje.usage, gameId: game.id });
    if (mensaje.stop_reason === 'refusal') throw new Error('El modelo declinó revisar la trama.');
    if (mensaje.stop_reason === 'max_tokens') throw new Error('La revisión superó el límite de tokens y quedó incompleta.');
    try {
      return { mensaje, datos: JSON.parse(textoDe(mensaje)) as Partial<RespuestaDelRevisor> };
    } catch {
      throw new Error('La respuesta del revisor no es un JSON válido.');
    }
  };

  if (opciones.soloMaterial) {
    const { datos } = await turno([primero], REVISION_SOLO_MATERIAL_SCHEMA);
    return completar(datos);
  }

  const { mensaje, datos } = await turno([primero], REVISION_TRAMA_SCHEMA);
  const respuesta = completar(datos);
  if (!plot.material) return respuesta;

  /*
   * El segundo turno, sobre la misma conversación. La respuesta del primero se
   * devuelve TAL CUAL —con sus bloques de pensamiento—: en Opus 5.5 el
   * pensamiento está ligado a la conversación, y reescribirlo lo invalidaría.
   * Si este turno falla, se queda lo de la trama, que ya es lo importante.
   */
  try {
    const { datos: material } = await turno(
      [primero, { role: 'assistant', content: mensaje.content as Anthropic.MessageParam['content'] }, { role: 'user', content: PEDIDO_DEL_MATERIAL }],
      REVISION_MATERIAL_SCHEMA,
      'material',
    );
    return {
      ...respuesta,
      cambios: { ...respuesta.cambios, ...(material.cambios ?? {}) },
      resumenDeCambios: [...respuesta.resumenDeCambios, ...(material.resumenDeCambios ?? [])],
    };
  } catch (error) {
    console.warn('[revision] el turno del material falló; se queda lo de la trama:', error);
    return respuesta;
  }
}

/** Rellena lo que falte para que quien lo lee no tenga que preguntar campo a campo. */
function completar(datos: Partial<RespuestaDelRevisor>): RespuestaDelRevisor {
  return {
    diagnostico: String(datos.diagnostico ?? ''),
    hallazgos: Array.isArray(datos.hallazgos) ? datos.hallazgos : [],
    cambios: (datos.cambios ?? {}) as CambiosDelRevisor,
    resumenDeCambios: Array.isArray(datos.resumenDeCambios) ? datos.resumenDeCambios.map(String) : [],
  };
}
