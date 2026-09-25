/**
 * La revisión adversaria de las Sombras: sus piezas, sobre el motor común.
 *
 *   1. La AUDITORÍA mide la senda y sus mojones, busca en lo que se lee la senda,
 *      a los cazadores y al infiltrado, y cuenta lo que distingue a quien cobra
 *      de Akechi —que nadie hable de él, una presentación que no se parece—. No
 *      cuesta nada.
 *   2. La COLUMNA CIEGA, que no sabe quién cobra, lee la noche hora a hora y dice
 *      de quién sospecharía. Si le señala por lo leído, la prosa lo ha delatado.
 *   3. El REVISOR, con todo delante, reescribe: primero lo que se lee en la mesa,
 *      luego los dosieres.
 *   4. Se vuelve a auditar y a leer SOBRE LO CORREGIDO; si queda algo bloqueante
 *      que él pueda arreglar, una segunda pasada. No hay tercera.
 *
 * ═══ LO QUE EL REVISOR NO PUEDE ARREGLAR ═══
 *
 * La senda y su lógica: qué dice cada mojón, dónde está, qué mentiras hay
 * preparadas. Si la auditoría dice que están rotos, decide el veredicto pero no
 * pide otra pasada.
 */
import type { GameSession, GenerateStreamEvent, HallazgoDeRevision, InformeDeRevision, Plot } from '../../../shared/types';
import { registrarRevisor, type AlcanceDeRevision } from '../juegos/revisores';
import { HORAS_POR_DEFECTO, tramaDe } from '../juegos/sombras-trama';
import { AVISOS_DE_LA_SENDA, auditarTramaSombras, auditoriaSombrasEnTexto } from './sombras-auditoria';
import { juzgarLaColumna, leerLaNocheACiegas, lecturasDeLaColumnaEnTexto, type LecturaDeLaColumna } from './sombras-lector';
import { aplicarParchesSombras, type CambiosDeLasSombras } from './sombras-parches';
import { pedirRevisionSombras } from './sombras-revisor';
import { ejecutarRevision, type AdaptadorDeRevision } from './revision-comun';

export const ADAPTADOR_SOMBRAS: AdaptadorDeRevision<CambiosDeLasSombras, LecturaDeLaColumna> = {
  rondas: (plot) => tramaDe(plot)?.batidos.length ?? HORAS_POR_DEFECTO,
  etiquetas: {
    contar: 'Se comprueban la senda, los mojones y lo que se lee en voz alta…',
    leer: 'Una columna que no sabe quién cobra de Akechi lee la noche hora a hora…',
    revisar: 'Un revisor con la senda y el nombre delante lee la noche entera…',
    segunda: 'Segunda pasada sobre lo que sigue pendiente…',
    comprobar: 'Se vuelve a leer la noche corregida…',
  },
  auditar: (game, plot) => {
    const auditoria = auditarTramaSombras(game, plot);
    return { hallazgos: auditoria.hallazgos, texto: auditoriaSombrasEnTexto(game, plot, auditoria) };
  },
  lector: {
    leer: (game, plot, model, emit, momentos) => leerLaNocheACiegas(game, plot, model, emit, momentos),
    juzgar: juzgarLaColumna,
    enTexto: lecturasDeLaColumnaEnTexto,
  },
  revisar: pedirRevisionSombras,
  parchear: aplicarParchesSombras,
  corregible: (h: HallazgoDeRevision) => !AVISOS_DE_LA_SENDA.has(h.codigo),
};

export async function revisarTramaSombras(
  game: GameSession,
  plot: Plot,
  emit: (evento: GenerateStreamEvent) => void,
  alcance: AlcanceDeRevision,
): Promise<{ plot: Plot; informe: InformeDeRevision }> {
  return ejecutarRevision(ADAPTADOR_SOMBRAS, game, plot, emit, alcance);
}

registrarRevisor('sombras', revisarTramaSombras);
