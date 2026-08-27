/**
 * Los trofeos que reparte cada juego.
 *
 * EL PROBLEMA. `live/cuentas.ts` concede seis trofeos con sus ids escritos a
 * mano: `ganador`, `sabueso`, `culpable-impune`… Son los de CLUEDO, y se
 * conceden en código de plataforma que corre para cualquier partida. Un juego
 * con otros trofeos los declara en su manifiesto —`manifiesto.trofeos` existe
 * desde la cata— y no se le concede ninguno, porque nadie lee ese campo.
 *
 * Los de la Momia son un buen ejemplo de por qué no basta con renombrar: «La
 * Sombra» se gana **perdiendo** la partida como saqueador, y «Mano Abierta» por
 * haber regalado los dos amuletos. Ninguna de las dos condiciones es expresable
 * como una variante de las de CLUEDO: dependen del estado propio del juego.
 *
 * QUÉ NO SE HA HECHO Y POR QUÉ. No se han movido los seis de CLUEDO aquí. Se
 * quedan donde estaban, concediéndose igual que siempre, y este registro añade
 * ENCIMA lo que cada juego quiera. Mover los de CLUEDO habría sido más limpio y
 * habría cambiado el comportamiento del único juego que hay en producción a
 * cambio de nada esta noche. El informe de arquitectura propone cuándo hacerlo.
 */
import type { JuegoId } from '../../../shared/juegos';
import type { LivePlayer, LiveSession, TrofeoId } from '../../../shared/live';
import type { GameSession, Plot } from '../../../shared/types';

/** Lo que se sabe de una persona al cerrar la partida. */
export interface CierreDeJugador {
  game: GameSession;
  sesion: LiveSession;
  plot: Plot;
  jugador: LivePlayer;
  /** ¿Es la respuesta del eje que señala a alguien de la mesa? */
  eraSenalado: boolean;
  /** ¿Ganó, según lo que la plataforma sabe (`winnerId`)? */
  gano: boolean;
  /** ¿Acertó su acusación? */
  acerto: boolean;
}

/** Devuelve los trofeos que esta persona se ha ganado en este juego. */
export type RepartoDeTrofeos = (cierre: CierreDeJugador) => TrofeoId[];

/**
 * Anclado al ámbito global por la misma razón que los reductores y las
 * proyecciones: este fichero se puede cargar dos veces por rutas distintas y
 * con una constante de módulo las altas se perderían en silencio.
 */
const LLAVE = Symbol.for('gamemasters.juegos.trofeos');
const global_ = globalThis as unknown as Record<symbol, Record<string, RepartoDeTrofeos>>;
const REPARTOS: Record<JuegoId, RepartoDeTrofeos> = global_[LLAVE] ?? (global_[LLAVE] = {});

/** Da de alta cómo reparte trofeos un juego. */
export function registrarTrofeos(juego: JuegoId, reparto: RepartoDeTrofeos): void {
  REPARTOS[juego] = reparto;
}

/**
 * Los trofeos propios del juego, si los declara.
 *
 * Se traga los errores a propósito, igual que la proyección. Un fallo repartiendo
 * medallas no puede impedir que se guarde la partida en la cuenta de alguien:
 * lo primero es que quede constancia de que jugó.
 */
export function trofeosDelJuego(juego: JuegoId | undefined, cierre: CierreDeJugador): TrofeoId[] {
  const reparto = REPARTOS[juego ?? ''];
  if (!reparto) return [];
  try {
    return reparto(cierre);
  } catch (error) {
    console.error(`[trofeos] el juego «${juego}» no pudo repartir los suyos:`, error);
    return [];
  }
}
