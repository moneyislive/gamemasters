/**
 * Cómo se dirige esta partida, calculado una sola vez.
 *
 * `settings.gmPlays` aparecía repetido por medio renderizador como `ciego`,
 * `aCiegas` y comparaciones sueltas. Cada una era la misma expresión escrita de
 * nuevo, y bastaba con olvidar una para que un documento filtrara lo que los
 * demás ocultan. Aquí se decide una vez y se pasa.
 */
import { resolveGmMode } from '../../../shared/documents';
import type { GmMode } from '../../../shared/documents';
import type { GameSession } from '../../../shared/types';

export interface VistaGm {
  modo: GmMode;
  /** ¿Puede este documento nombrar al culpable, el arma y la sala? */
  revelaSolucion: boolean;
  /** ¿Puede contar los secretos y coartadas de los demás jugadores? */
  revelaSecretos: boolean;
  /** ¿Puede decir a qué o a quién señala cada pista? */
  revelaPistas: boolean;
  /** ¿Hace falta una segunda persona que prepare el material? */
  hayPreparador: boolean;
  /** ¿El Game Master juega además como uno de los sospechosos? */
  gmJuega: boolean;
}

export function vistaGm(game: GameSession): VistaGm {
  const modo = resolveGmMode(game.settings);
  const aCiegas = modo === 'blind';
  return {
    modo,
    revelaSolucion: !aCiegas,
    revelaSecretos: !aCiegas,
    revelaPistas: !aCiegas,
    hayPreparador: aCiegas,
    gmJuega: aCiegas,
  };
}
