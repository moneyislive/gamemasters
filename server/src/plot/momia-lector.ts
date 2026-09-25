/**
 * La expedición ciega: alguien que NO sabe quién rompió el sello lee la noche
 * vigilia a vigilia, con lo que la mesa ha oído hasta ese momento, y dice de
 * quién sospecha.
 *
 * Como en las Sombras, aquí no se busca que lo encuentre: al saqueador se le
 * caza JUGANDO —un fragmento que no cuadra con los demás, una votación rara, un
 * amuleto que no se da—, no leyendo. Si la expedición lo señala por lo que ha
 * LEÍDO, la prosa lo ha delatado. Por eso el juicio es `no-delatar`, y mira
 * también el extremo contrario: una prosa que lo exculpa en todos los momentos
 * juega a su favor.
 *
 * Lee lo que oye la mesa: la sinopsis, la apertura, las presentaciones de todos,
 * los carteles de las cámaras, la cronología pública, las coartadas y lo que
 * cada cual cuenta de los demás; y, vigilia a vigilia, cada narración. NO lee
 * los secretos, ni los motivos, ni el guion, ni las ayudas, ni los fragmentos:
 * esos son el orden, y no dicen nada de nadie.
 */
import type { GameSession, GenerateStreamEvent, HallazgoDeRevision, ModelId, Plot } from '../../../shared/types';
import { cronologiaPublica } from '../docs/datos';
import { conocimientoDesbloqueado } from '../live/proyeccion';
import { VIGILIAS_POR_DEFECTO } from '../juegos/momia-trama';
import { entidadesDeLaMomia, saborDe, tramaDe } from './momia-generacion';
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

const SISTEMA_EXPEDICION =
  'Eres una expedición de jugadores veteranos de juegos de traidor oculto, de los que lo huelen antes que nadie. ' +
  'NO sabéis quién de la expedición rompió el sello: solo lo que se ha leído y oído hasta ahora en la velada. ' +
  'Tu trabajo es decir, con honestidad, de quién sospecharía la mesa EN ESTE MOMENTO y por qué, solo por lo ' +
  'leído. Aprovechas cualquier descuido del autor: quién recibe demasiada atención o demasiado poca, de quién ' +
  'no habla nadie, una presentación que suena distinta, un adjetivo que delata, un motivo que asoma. Pero no ' +
  'inventas: si lo leído no distingue a nadie, repartes la sospecha por igual. Escribes en español y devuelves ' +
  'exclusivamente el JSON pedido, con los ids exactos que se te dan.';

export const LECTOR_MOMIA_SCHEMA = objeto({
  personas: esquemaDeReparto('Una entrada por CADA persona de la expedición, con los puntos de sospecha que le das (suman 100).'),
  razon: cadena('En dos o tres frases: de quién sospechas más y qué te lo hace pensar, citando lo leído.'),
  fraseDecisiva: cadena(
    'Si UNA SOLA frase de lo leído te basta para señalar a alguien sin combinarla con nada más, cópiala entre comillas. ' +
      'Cadena vacía si tu sospecha sale de combinar varias cosas o si no sospechas de nadie en concreto.',
  ),
});

/** Lo que sabe la expedición al cerrar la vigilia `hasta` (0 = antes de abrir la primera). */
export function loQueSabeLaExpedicion(game: GameSession, plot: Plot, hasta: number): string {
  const trama = tramaDe(plot);
  const sabor = saborDe(plot);
  const { expedicionarios, camaras, reliquias, ritos } = entidadesDeLaMomia(game);
  const vigilias = trama?.profanadas.length ?? VIGILIAS_POR_DEFECTO;
  const conApp = game.settings?.modo === 'app';
  const sabeYa = (conocimiento: string[]): string[] =>
    conApp ? conocimiento.slice(0, hasta === 0 ? 0 : conocimientoDesbloqueado(conocimiento.length, hasta, vigilias)) : conocimiento;
  const nombreDe = (id: string) => expedicionarios.find((e) => e.id === id)?.name ?? id;
  const nombreCamara = (id?: string) => camaras.find((c) => c.id === id)?.name ?? '';

  const expedicion = plot.characters
    .map(
      (c) =>
        `- id "${c.participanteId}" · ${c.characterName} (lo juega ${nombreDe(c.participanteId)}) · ${c.role}` +
        `\n  Lo que sabe de ella toda la expedición: ${c.publicPersona}` +
        `\n  Lo que declaró de aquella noche: ${c.alibi ?? ''}` +
        `\n  Lo que cuenta de los demás: ${sabeYa(c.knowledge ?? []).join(' | ') || '(nada, todavía)'}`,
    )
    .join('\n');

  const partes = [
    `LA NOCHE: ${plot.title}
LEMA: ${plot.tagline}
SINOPSIS: ${plot.synopsis}
AMBIENTACIÓN: ${plot.setting}
EL DIFUNTO: ${sabor?.faraon.nombre ?? ''} — ${sabor?.faraon.descripcion ?? ''}

LA EXPEDICIÓN (una de estas personas rompió el sello):
${expedicion}

LOS CINCO RITOS DEL SELLADO: ${ritos.map((r) => r.name).join(' · ')}

LAS RELIQUIAS: ${reliquias.map((r) => r.name).join(' · ') || '(ninguna)'}

LOS CARTELES DE LAS CÁMARAS:
${camaras.map((c) => `- ${c.name}: ${sabor?.inscripciones[c.id] ?? ''}`).join('\n')}

CRONOLOGÍA PÚBLICA:
${cronologiaPublica(plot).map((e) => `- ${e.time} ${e.description}`).join('\n') || '(ninguna)'}`,
  ];

  const apertura = plot.material?.narrations.find((n) => n.round === 0);
  if (apertura) partes.push(`APERTURA, LEÍDA EN VOZ ALTA:\n${apertura.text}`);
  for (let v = 1; v <= hasta; v++) {
    const narracion = plot.material?.narrations.find((n) => n.round === v);
    partes.push(
      `=== VIGILIA ${v} de ${vigilias} · se profana ${nombreCamara(trama?.profanadas[v - 1]) || '¿?'} ===\n` +
        (narracion ? `Narración: ${narracion.text}` : '(sin narración)'),
    );
  }
  return partes.join('\n\n');
}

function preguntaDelMomento(hasta: number, vigilias: number): string {
  if (hasta === 0) return 'MOMENTO: la expedición todavía no ha abierto la primera vigilia.';
  if (hasta < vigilias) return `MOMENTO: acaba de cerrarse la vigilia ${hasta} de ${vigilias}. Quedan vigilias por delante.`;
  return `MOMENTO: se han cerrado las ${vigilias} vigilias. Es la hora del sellado.`;
}

/** Lee la noche en los momentos pedidos (por defecto, todos). Sin clave, nada. */
export async function leerLaTumbaACiegas(
  game: GameSession,
  plot: Plot,
  model: ModelId,
  emit: (evento: GenerateStreamEvent) => void,
  momentos?: number[],
): Promise<{ lecturas: LecturaDeMomento[]; hallazgos: HallazgoDeRevision[] }> {
  const vigilias = tramaDe(plot)?.profanadas.length ?? VIGILIAS_POR_DEFECTO;
  const ids = plot.characters.map((c) => c.participanteId);
  const { lecturas } = await leerMomentos<LecturaDeMomento>({
    game,
    model,
    emit,
    momentos: momentos ?? Array.from({ length: vigilias + 1 }, (_, i) => i),
    rondas: vigilias,
    sistema: SISTEMA_EXPEDICION,
    esquema: LECTOR_MOMIA_SCHEMA,
    pregunta: (m) =>
      `${loQueSabeLaExpedicion(game, plot, m)}\n\n${preguntaDelMomento(m, vigilias)}\n\n` +
      'Reparte 100 puntos de sospecha entre las personas de la expedición. Incluye a todas, aunque sea con 0.',
    interpretar: (m, datos) => ({
      momento: m,
      reparto: normalizarReparto(datos.personas as Array<{ id: string; puntos: number }>, ids),
      razon: String(datos.razon ?? ''),
      pistaDecisiva: String(datos.fraseDecisiva ?? ''),
      cadena: [],
    }),
    progreso: (hechas, total) => `La expedición ciega ha leído ${hechas} de ${total} momentos de la noche`,
  });
  // El juicio va ya con la primera lectura: es lo que el motor pone en la mesa del revisor.
  return { lecturas, hallazgos: juzgarLaExpedicion(game, plot, lecturas, vigilias) };
}

/** ¿Señala la expedición a quien rompió el sello por lo que ha leído? ¿O lo exculpa? */
export function juzgarLaExpedicion(_game: GameSession, plot: Plot, lecturas: LecturaDeMomento[], vigilias: number): HallazgoDeRevision[] {
  return juzgarSospecha({
    lecturas,
    objetivo: String(plot.solution?.respuestas?.saqueador ?? ''),
    candidatos: plot.characters.length,
    rondas: vigilias,
    nombre: (id) => plot.characters.find((c) => c.participanteId === id)?.characterName ?? id,
    quien: 'quien rompió el sello',
    codigoInvisible: 'saqueador-invisible',
    origen: 'detective',
    modo: 'no-delatar',
  });
}

export function lecturasDeLaExpedicionEnTexto(_game: GameSession, plot: Plot, lecturas: LecturaDeMomento[]): string {
  const saqueador = String(plot.solution?.respuestas?.saqueador ?? '');
  const nombre = (id: string) => plot.characters.find((c) => c.participanteId === id)?.characterName ?? id;
  return lecturasEnTextoComun(lecturas, saqueador, nombre, 'ROMPIÓ EL SELLO');
}
