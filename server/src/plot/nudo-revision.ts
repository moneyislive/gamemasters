/**
 * La revisión adversaria del Nudo: sus piezas, sobre el motor común.
 *
 *   1. La AUDITORÍA mide el cuadro —sigue saliendo uno, nadie lo resuelve solo,
 *      nadie sobra— y busca en la prosa órdenes, crímenes, el suero fuera del
 *      Correo, oficios cruzados y texto de plantilla. No cuesta nada.
 *   2. El REVISOR, con el cuadro delante, lee toda la prosa y la reescribe.
 *   3. Se vuelve a auditar lo corregido; si queda algo bloqueante que él pueda
 *      arreglar, una segunda pasada. No hay tercera.
 *
 * Sin lector ciego: aquí no hay a quién esconder. Lo que la mesa averigua es un
 * orden que decide el código, y la prosa la escribe un modelo que no lo conoce.
 * Lo que puede delatarlo es una frase concreta, y las frases se buscan con
 * código y las juzga el revisor (ver `nudo-revisor.ts`).
 *
 * ═══ LO QUE EL REVISOR NO PUEDE ARREGLAR ═══
 *
 * El cuadro, las tiras y su reparto. Si la auditoría dice que están rotos —un
 * convoy renombrado después de generar—, lo dice el informe y decide el
 * veredicto, pero no pide otra pasada: sus parches solo tocan prosa.
 */
import type { GameSession, GenerateStreamEvent, HallazgoDeRevision, InformeDeRevision, Plot } from '../../../shared/types';
import { registrarRevisor, type AlcanceDeRevision } from '../juegos/revisores';
import { tramaDe } from '../juegos/nudo-trama';
import { auditarTramaNudo, auditoriaNudoEnTexto } from './nudo-auditoria';
import { aplicarParchesNudo, type CambiosDelNudo } from './nudo-parches';
import { pedirRevisionNudo } from './nudo-revisor';
import { ejecutarRevision, type AdaptadorDeRevision } from './revision-comun';

/** Los avisos del cuadro: los decide el código y ningún parche de prosa los toca. */
export const AVISOS_DEL_CUADRO = new Set([
  'sin-cuadro',
  'cuadro-roto',
  'tira-desalineada',
  'tira-sin-mano',
  'tira-sobrante',
  'ferroviario-sin-tiras',
  'mano-que-lo-resuelve',
  'ferroviario-sin-peso',
  'cuadro-sin-lapiz',
]);

export const ADAPTADOR_NUDO: AdaptadorDeRevision<CambiosDelNudo> = {
  rondas: (plot) => tramaDe(plot)?.franjas ?? 6,
  etiquetas: {
    contar: 'Se comprueban el cuadro, las tiras y la prosa de la noche…',
    revisar: 'Un revisor con el cuadro delante lee la noche entera…',
    segunda: 'Segunda pasada sobre lo que sigue pendiente…',
    comprobar: 'Se vuelve a medir la noche corregida…',
  },
  auditar: (game, plot) => {
    const auditoria = auditarTramaNudo(game, plot);
    return { hallazgos: auditoria.hallazgos, texto: auditoriaNudoEnTexto(auditoria) };
  },
  revisar: pedirRevisionNudo,
  parchear: aplicarParchesNudo,
  corregible: (h: HallazgoDeRevision) => !AVISOS_DEL_CUADRO.has(h.codigo),
};

export async function revisarTramaNudo(
  game: GameSession,
  plot: Plot,
  emit: (evento: GenerateStreamEvent) => void,
  alcance: AlcanceDeRevision,
): Promise<{ plot: Plot; informe: InformeDeRevision }> {
  return ejecutarRevision(ADAPTADOR_NUDO, game, plot, emit, alcance);
}

registrarRevisor('nudo', revisarTramaNudo);
