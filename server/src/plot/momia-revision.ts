/**
 * La revisión adversaria de la Momia: sus piezas, sobre el motor común.
 *
 *   1. La AUDITORÍA mide el orden y sus fragmentos, busca en lo que se lee el
 *      orden —entero o a trozos—, la cámara de mañana y a quien rompió el
 *      sello, y cuenta lo que lo distingue de los demás. No cuesta nada.
 *   2. La EXPEDICIÓN CIEGA, que no sabe quién fue, lee la noche vigilia a vigilia
 *      y dice de quién sospecharía. Si le señala por lo leído, la prosa lo ha
 *      delatado; si lo exculpa siempre, también juega a su favor.
 *   3. El REVISOR, con todo delante, reescribe: primero lo que se lee en la mesa,
 *      luego los dosieres.
 *   4. Se vuelve a auditar y a leer SOBRE LO CORREGIDO; si queda algo bloqueante
 *      que él pueda arreglar, una segunda pasada. No hay tercera.
 *
 * Lo que el revisor no puede arreglar es la lógica del orden: qué dice cada
 * fragmento, dónde está, qué mentiras hay preparadas. Decide el veredicto pero
 * no pide otra pasada.
 */
import type { GameSession, GenerateStreamEvent, HallazgoDeRevision, InformeDeRevision, Plot } from '../../../shared/types';
import { registrarRevisor, type AlcanceDeRevision } from '../juegos/revisores';
import { VIGILIAS_POR_DEFECTO } from '../juegos/momia-trama';
import { tramaDe } from './momia-generacion';
import { AVISOS_DEL_ORDEN, auditarTramaMomia, auditoriaMomiaEnTexto } from './momia-auditoria';
import { juzgarLaExpedicion, leerLaTumbaACiegas, lecturasDeLaExpedicionEnTexto } from './momia-lector';
import { aplicarParchesMomia, type CambiosDeLaMomia } from './momia-parches';
import { pedirRevisionMomia } from './momia-revisor';
import { ejecutarRevision, type AdaptadorDeRevision } from './revision-comun';

export const ADAPTADOR_MOMIA: AdaptadorDeRevision<CambiosDeLaMomia> = {
  rondas: (plot) => tramaDe(plot)?.profanadas.length ?? VIGILIAS_POR_DEFECTO,
  etiquetas: {
    contar: 'Se comprueban el orden, los fragmentos y lo que se lee en voz alta…',
    leer: 'Una expedición que no sabe quién rompió el sello lee la noche vigilia a vigilia…',
    revisar: 'Un revisor con el orden y el nombre delante lee la noche entera…',
    segunda: 'Segunda pasada sobre lo que sigue pendiente…',
    comprobar: 'Se vuelve a leer la noche corregida…',
  },
  auditar: (game, plot) => {
    const auditoria = auditarTramaMomia(game, plot);
    return { hallazgos: auditoria.hallazgos, texto: auditoriaMomiaEnTexto(plot, auditoria) };
  },
  lector: {
    leer: (game, plot, model, emit, momentos) => leerLaTumbaACiegas(game, plot, model, emit, momentos),
    juzgar: juzgarLaExpedicion,
    enTexto: lecturasDeLaExpedicionEnTexto,
  },
  revisar: pedirRevisionMomia,
  parchear: aplicarParchesMomia,
  corregible: (h: HallazgoDeRevision) => !AVISOS_DEL_ORDEN.has(h.codigo),
};

export async function revisarTramaMomia(
  game: GameSession,
  plot: Plot,
  emit: (evento: GenerateStreamEvent) => void,
  alcance: AlcanceDeRevision,
): Promise<{ plot: Plot; informe: InformeDeRevision }> {
  return ejecutarRevision(ADAPTADOR_MOMIA, game, plot, emit, alcance);
}

registrarRevisor('momia', revisarTramaMomia);
