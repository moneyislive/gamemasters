/**
 * La revisión adversaria de CLUEDO: sus piezas, sobre el motor común.
 *
 *   1. La AUDITORÍA cuenta, con código, quién aparece dónde. No cuesta nada.
 *   2. El DETECTIVE, que no conoce la solución, lee la noche momento a momento.
 *   3. El REVISOR, que sí la conoce, lee todo lo anterior y reescribe.
 *   4. Se vuelve a auditar y a preguntar al detective SOBRE LO CORREGIDO.
 *   5. Si queda algo bloqueante, una segunda pasada. No hay tercera.
 *
 * El bucle vive en `revision-comun.ts` desde que la Momia, las Sombras y el Nudo
 * tuvieron el suyo: aquí solo quedan las piezas de CLUEDO.
 *
 * ═══ SIN CLAVE DE API ═══
 *
 * Solo la auditoría, que no necesita modelo. El informe sale con lo que haya
 * contado y el veredicto que eso dé: es lo que ven las comprobaciones y quien
 * prueba el taller sin clave.
 */
import type { GameSession, GenerateStreamEvent, InformeDeRevision, Plot } from '../../../shared/types';
import { registrarRevisor, type AlcanceDeRevision } from '../juegos/revisores';
import { numeroDeRondas } from '../docs/datos';
import { auditarTramaCluedo, auditoriaEnTexto } from './cluedo-auditoria';
import { interrogarAlDetective, juzgarLecturas, lecturasEnTexto, type LecturaCompleta } from './cluedo-detective';
import { aplicarParches, type CambiosDelRevisor } from './cluedo-parches';
import { pedirRevision } from './cluedo-revisor';
import { ejecutarRevision, type AdaptadorDeRevision } from './revision-comun';

const CLUEDO: AdaptadorDeRevision<CambiosDelRevisor, LecturaCompleta> = {
  rondas: numeroDeRondas,
  etiquetas: {
    contar: 'Se cuenta quién aparece en cada rincón de la noche…',
    leer: 'Un detective que no conoce la solución intenta resolver el caso antes de tiempo…',
    revisar: 'El revisor lee la trama con ojos de quien quiere romperla…',
    segunda: 'Segunda pasada sobre lo que sigue pendiente…',
    comprobar: 'Se comprueba que el caso sigue teniendo solución…',
  },
  auditar: (game, plot) => {
    const auditoria = auditarTramaCluedo(game, plot);
    return { hallazgos: auditoria.hallazgos, texto: auditoriaEnTexto(auditoria) };
  },
  lector: {
    leer: (game, plot, model, emit, momentos) => interrogarAlDetective(game, plot, model, emit, momentos),
    juzgar: juzgarLecturas,
    enTexto: lecturasEnTexto,
  },
  revisar: pedirRevision,
  parchear: aplicarParches,
};

export async function revisarTramaCluedo(
  game: GameSession,
  plot: Plot,
  emit: (evento: GenerateStreamEvent) => void,
  alcance: AlcanceDeRevision,
): Promise<{ plot: Plot; informe: InformeDeRevision }> {
  return ejecutarRevision(CLUEDO, game, plot, emit, alcance);
}

registrarRevisor('cluedo', revisarTramaCluedo);
