import type { PrintableDocInfo } from '../../../../shared/documents';
import { lugaresDe, personasDe } from '../../../../shared/juegos';
import type { GameSession } from '../../../../shared/types';

/**
 * Cuántas copias hay que imprimir de un documento, en texto.
 *
 * El catálogo guarda la regla y no el número, porque el número depende de
 * cuánta gente juegue y de cuántas salas haya, y eso cambia mientras se monta
 * la partida.
 */
export function copiasDe(doc: PrintableDocInfo, game: GameSession): string {
  const caras = doc.sides === 'una' ? 'a una cara' : 'a doble cara';
  switch (doc.copies) {
    case 'una-por-jugador': {
      const n = personasDe(game).length;
      return `${n} ${n === 1 ? 'copia' : 'copias'} · una por jugador · ${caras}`;
    }
    case 'una-por-sala': {
      const n = lugaresDe(game).length;
      return `${n} ${n === 1 ? 'página' : 'páginas'} · una por sala · ${caras}`;
    }
    default:
      return `1 copia · ${caras}`;
  }
}
