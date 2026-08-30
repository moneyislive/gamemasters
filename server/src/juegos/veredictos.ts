/**
 * Quién ganó, según el juego que se ha jugado.
 *
 * ═══ LO QUE PASABA ═══
 *
 * `live/sesion.ts` decide el ganador dentro de `responder()`: la primera acusación
 * correcta que no sea del propio culpable escribe `sesion.primeroEnAcertar`, y ahí se
 * acabó. Es la regla de CLUEDO —«gana quien acierta antes»— metida en código de
 * plataforma, y El Misterio de la Momia y El Paso de las Sombras entran por ahí
 * porque sus acciones de señalar llaman a esa misma función.
 *
 * Pero en los dos gana un BANDO, y eso se decide en otro sitio: `resolverSellado`
 * devuelve `ganadores: string[]` y el consejo del alba otro tanto. Los dos
 * ficheros lo dicen con todas las letras —«Es lo que `winnerId` no sabe decir»—.
 * Así que la sesión guardaba un ganador que solo significa «quien primero
 * desenmascaró al traidor», y el final de verdad viajaba por un carril paralelo
 * que la plataforma no miraba.
 *
 * La consecuencia visible es pequeña y permanente: en el historial de la cuenta
 * de cada persona queda escrito si ganó esa noche. Si la expedición sellaba la
 * tumba y nadie llegó a señalar al saqueador, `winnerId` quedaba vacío y la
 * plataforma anotaba que no ganó NADIE, mientras el juego tenía diez ganadores.
 * Eso no se puede arreglar después: la velada ya pasó.
 *
 * ═══ QUÉ ARREGLA ESTO Y QUÉ NO ═══
 *
 * ARREGLA quién consta como ganador cuando la partida se cierra. NO cambia
 * `winnerId`, que se sigue escribiendo igual y sigue significando lo mismo —«el
 * primero que acertó»—, porque hay partidas guardadas que lo llevan y porque en
 * CLUEDO es exactamente la respuesta correcta.
 *
 * Un juego sin veredicto dado de alta se comporta como siempre: gana quien tenga
 * `winnerId`. Es lo que hace que CLUEDO no cambie, y no por cuidado sino porque
 * no registra ninguno.
 */
import { manifiestoDe } from '../../../shared/juegos';
import type { JuegoId } from '../../../shared/juegos';
import type { LiveSession } from '../../../shared/live';
import type { GameSession } from '../../../shared/types';

/**
 * Quiénes ganaron la partida, según las reglas de este juego.
 *
 * Devuelve `undefined` si todavía no se puede decir —la noche no ha terminado, o
 * la mesa no ejecutó el ritual— y en ese caso manda lo que sepa la plataforma.
 */
export type Veredicto = (game: GameSession, sesion: LiveSession) => string[] | undefined;

/** Anclado al ámbito global, como los demás registros y por lo mismo. */
const LLAVE = Symbol.for('gamemasters.juegos.veredictos');
const global_ = globalThis as unknown as Record<symbol, Record<string, Veredicto>>;
const VEREDICTOS: Record<JuegoId, Veredicto> = global_[LLAVE] ?? (global_[LLAVE] = {});

/** Da de alta quién decide la victoria en un juego. */
export function registrarVeredicto(juego: JuegoId, veredicto: Veredicto): void {
  VEREDICTOS[juego] = veredicto;
}

/**
 * Quiénes ganaron, preguntándole al juego.
 *
 * Se traga los errores a propósito, igual que el reparto de trofeos y la
 * proyección: un fallo calculando quién ganó no puede impedir que se guarde la
 * partida en la cuenta de alguien. Lo primero es que quede constancia de que
 * jugó. Al fallar devuelve `undefined`, o sea «que decida la plataforma», que es
 * lo que hacía antes de que esto existiera.
 */
export function ganadoresDe(game: GameSession, sesion: LiveSession): string[] | undefined {
  const veredicto = VEREDICTOS[manifiestoDe(sesion.juego ?? game.settings?.juego).id];
  if (!veredicto) return undefined;
  try {
    return veredicto(game, sesion);
  } catch (error) {
    console.error('[veredicto] no se pudo decidir quién ganó:', error);
    return undefined;
  }
}

/** Los juegos que tienen veredicto dado de alta. Lo usa la comprobación. */
export function juegosConVeredicto(): JuegoId[] {
  return Object.keys(VEREDICTOS);
}
