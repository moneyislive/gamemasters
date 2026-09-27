/**
 * La columna ciega: alguien que NO sabe quién cobra de Akechi lee la noche hora
 * a hora, con lo que la mesa ha oído hasta ese momento, y dice de quién sospecha.
 *
 * ═══ AQUÍ NO SE BUSCA QUE LO ENCUENTRE ═══
 *
 * En CLUEDO el detective tiene que llegar al culpable al final: si no llega, el
 * caso no tiene solución. Aquí es al revés en todos los momentos. Al kanchō se
 * le caza JUGANDO —un mojón que dice haberse leído donde había más gente, un
 * voto que no cuadra, una prenda que no se da—, no leyendo. Si la columna lo
 * señala por lo que ha LEÍDO, la prosa lo ha delatado y el juego adversarial se
 * acaba antes de empezar. Por eso el juicio es `no-delatar`: ningún momento,
 * tampoco el último, puede dejarlo en cabeza con ventaja.
 *
 * Y el extremo contrario también se mira, aunque no desde aquí: un kanchō del
 * que la prosa no habla nunca es tan visible como uno al que acusa. Eso lo
 * cuenta la auditoría (`kancho-intocable`), y el revisor tiene la orden de
 * darle el mismo trato que a cualquiera, no menos.
 *
 * ═══ QUÉ LEE ═══
 *
 * Lo que oye la mesa: la sinopsis, la apertura, las presentaciones de todos,
 * los carteles de las puertas, la cronología pública, las coartadas declaradas
 * y lo que cada cual cuenta de los demás; y, hora a hora, cada narración. NO lee
 * los secretos, ni los motivos, ni el guion, ni las ayudas —que solo salen si la
 * mesa se atasca—, ni los mojones: esos son la senda, y no dicen nada de nadie.
 */
import type { GameSession, GenerateStreamEvent, HallazgoDeRevision, ModelId, Plot } from '../../../shared/types';
import { cronologiaPublica } from '../docs/datos';
import { conocimientoDesbloqueado } from '../live/proyeccion';
import { HORAS_DE_LA_NOCHE, fichaDePapel, nombreDeLaHora, tramaDe } from '../juegos/sombras-trama';
import { entidadesDeLasSombras, saborDe } from './sombras-generacion';
import {
  cadena,
  esquemaDeReparto,
  juzgarSospecha,
  leerMomentos,
  lecturasEnTextoComun,
  normalizarReparto,
  objeto,
  type LecturaDeMomento,
} from './revision-comun';

const SISTEMA_COLUMNA =
  'Eres una columna de jugadores veteranos de juegos de traidor oculto, de los que lo huelen antes que nadie. ' +
  'NO sabéis quién de la columna cobra de Akechi: solo lo que se ha leído y oído hasta ahora en la velada. ' +
  'Tu trabajo es decir, con honestidad, de quién sospecharía la columna EN ESTE MOMENTO y por qué, solo por lo ' +
  'leído. Aprovechas cualquier descuido del autor: quién recibe demasiada atención o demasiado poca, de quién ' +
  'no habla nadie, una presentación que suena distinta, un adjetivo que delata, un motivo que asoma. Pero no ' +
  'inventas: si lo leído no distingue a nadie, repartes la sospecha por igual. Escribes en español y devuelves ' +
  'exclusivamente el JSON pedido, con los ids exactos que se te dan.';

export const LECTOR_SOMBRAS_SCHEMA = objeto({
  personas: esquemaDeReparto('Una entrada por CADA persona de la columna, con los puntos de sospecha que le das (suman 100).'),
  razon: cadena('En dos o tres frases: de quién sospechas más y qué te lo hace pensar, citando lo leído.'),
  fraseDecisiva: cadena(
    'Si UNA SOLA frase de lo leído te basta para señalar a alguien sin combinarla con nada más, cópiala entre comillas. ' +
      'Cadena vacía si tu sospecha sale de combinar varias cosas o si no sospechas de nadie en concreto.',
  ),
});

export type LecturaDeLaColumna = LecturaDeMomento;

/**
 * Lo que sabe la columna al cerrar la hora `hasta` (0 = antes de salir).
 *
 * Lo que cada cual cuenta de los demás entra entero EN PAPEL —está en el dosier
 * desde el primer minuto— y por rondas CON LA APP, con la misma regla que el
 * móvil. Sin modo, como papel, que es el peor caso.
 */
export function loQueSabeLaColumna(game: GameSession, plot: Plot, hasta: number): string {
  const trama = tramaDe(plot);
  const sabor = saborDe(plot);
  const { escoltas, pasos, enseres } = entidadesDeLasSombras(game);
  const horas = trama?.batidos.length ?? HORAS_DE_LA_NOCHE.length;
  const conApp = game.settings?.modo === 'app';
  const sabeYa = (conocimiento: string[]): string[] =>
    conApp ? conocimiento.slice(0, hasta === 0 ? 0 : conocimientoDesbloqueado(conocimiento.length, hasta, horas)) : conocimiento;
  const nombreDe = (id: string) => escoltas.find((e) => e.id === id)?.name ?? id;

  const columna = plot.characters
    .map((c) => {
      const disfraz = trama ? fichaDePapel(trama.papeles[c.participanteId] ?? 'rastrear') : undefined;
      return (
        `- id "${c.participanteId}" · ${c.characterName} (lo juega ${nombreDe(c.participanteId)}) · ${c.role}` +
        (disfraz ? ` · va de ${disfraz.rol}` : '') +
        `\n  Lo que sabe de ella toda la columna: ${c.publicPersona}` +
        `\n  Lo que declaró al salir de Sakai: ${c.alibi ?? ''}` +
        `\n  Lo que cuenta de los demás: ${sabeYa(c.knowledge ?? []).join(' | ') || '(nada, todavía)'}`
      );
    })
    .join('\n');

  const partes = [
    `LA NOCHE: ${plot.title}
LEMA: ${plot.tagline}
SINOPSIS: ${plot.synopsis}
AMBIENTACIÓN: ${plot.setting}
EL SEÑOR: ${sabor?.senor.nombre ?? ''} — ${sabor?.senor.descripcion ?? ''}

LA COLUMNA (una de estas personas cobra de Akechi):
${columna}

LOS CARTELES DE LAS PUERTAS:
${pasos.map((p) => `- ${p.name}: ${sabor?.inscripciones[p.id] ?? ''}`).join('\n')}

LA CARGA:
${enseres.map((e) => `- ${e.name}${trama?.cargaInicial[e.id] ? ` (la lleva ${nombreDe(trama.cargaInicial[e.id]!)})` : ''}`).join('\n')}

CRONOLOGÍA PÚBLICA:
${cronologiaPublica(plot).map((e) => `- ${e.time} ${e.description}`).join('\n') || '(ninguna)'}`,
  ];

  const apertura = plot.material?.narrations.find((n) => n.round === 0);
  if (apertura) partes.push(`APERTURA, LEÍDA EN VOZ ALTA:\n${apertura.text}`);
  for (let h = 1; h <= hasta; h++) {
    const narracion = plot.material?.narrations.find((n) => n.round === h);
    partes.push(`=== ${nombreDeLaHora(h).toUpperCase()} (hora ${h} de ${horas}) ===\n${narracion ? `Narración: ${narracion.text}` : '(sin narración)'}`);
  }
  return partes.join('\n\n');
}

function preguntaDelMomento(hasta: number, horas: number): string {
  if (hasta === 0) return 'MOMENTO: la columna todavía no ha salido de Sakai. Nadie ha dado un paso.';
  if (hasta < horas) return `MOMENTO: acaba de cerrarse la hora ${hasta} de ${horas}. Quedan horas por andar.`;
  return `MOMENTO: se han andado las ${horas} horas y clarea. Es el consejo del alba.`;
}

/** Lee la noche en los momentos pedidos (por defecto, todos). Sin clave, nada. */
export async function leerLaNocheACiegas(
  game: GameSession,
  plot: Plot,
  model: ModelId,
  emit: (evento: GenerateStreamEvent) => void,
  momentos?: number[],
): Promise<{ lecturas: LecturaDeLaColumna[]; hallazgos: HallazgoDeRevision[] }> {
  const horas = tramaDe(plot)?.batidos.length ?? HORAS_DE_LA_NOCHE.length;
  const ids = plot.characters.map((c) => c.participanteId);
  const { lecturas } = await leerMomentos<LecturaDeLaColumna>({
    game,
    model,
    emit,
    momentos: momentos ?? Array.from({ length: horas + 1 }, (_, i) => i),
    rondas: horas,
    sistema: SISTEMA_COLUMNA,
    esquema: LECTOR_SOMBRAS_SCHEMA,
    pregunta: (m) =>
      `${loQueSabeLaColumna(game, plot, m)}\n\n${preguntaDelMomento(m, horas)}\n\n` +
      'Reparte 100 puntos de sospecha entre las personas de la columna. Incluye a todas, aunque sea con 0.',
    interpretar: (m, datos) => ({
      momento: m,
      reparto: normalizarReparto(datos.personas as Array<{ id: string; puntos: number }>, ids),
      razon: String(datos.razon ?? ''),
      pistaDecisiva: String(datos.fraseDecisiva ?? ''),
      cadena: [],
    }),
    progreso: (hechas, total) => `La columna ciega ha leído ${hechas} de ${total} momentos de la noche`,
  });
  // El juicio va ya con la primera lectura: es lo que el motor pone en la mesa del revisor.
  return { lecturas, hallazgos: juzgarLaColumna(game, plot, lecturas, horas) };
}

/** ¿Señala la columna a quien cobra de Akechi por lo que ha leído? */
export function juzgarLaColumna(_game: GameSession, plot: Plot, lecturas: LecturaDeLaColumna[], horas: number): HallazgoDeRevision[] {
  const kancho = String(plot.solution?.respuestas?.kancho ?? '');
  return juzgarSospecha({
    lecturas,
    objetivo: kancho,
    candidatos: plot.characters.length,
    rondas: horas,
    nombre: (id) => plot.characters.find((c) => c.participanteId === id)?.characterName ?? id,
    quien: 'quien cobra de Akechi',
    codigoInvisible: 'kancho-invisible',
    origen: 'detective',
    modo: 'no-delatar',
  });
}

export function lecturasDeLaColumnaEnTexto(_game: GameSession, plot: Plot, lecturas: LecturaDeLaColumna[]): string {
  const kancho = String(plot.solution?.respuestas?.kancho ?? '');
  const nombre = (id: string) => plot.characters.find((c) => c.participanteId === id)?.characterName ?? id;
  return lecturasEnTextoComun(lecturas, kancho, nombre, 'COBRA DE AKECHI');
}
