/**
 * Qué tiene que traer un juego para que se le pueda poner un maestro de oro.
 *
 * ═══ POR QUÉ ESTO EXISTE ═══
 *
 * El maestro de oro nació cableado a CLUEDO: sabía que se elige sala, que se
 * acusa con tres ejes y que la partida dura cuatro rondas. Eso estaba bien
 * mientras hubo un juego, y dejó de estarlo en cuanto hubo tres — porque el
 * verde de CLUEDO no dice absolutamente nada de los otros dos, y son
 * exactamente los que más se van a mover al generalizar el núcleo.
 *
 * Así que el maestro de oro se parte en dos. Lo COMÚN —congelar los
 * imprimibles, los dosieres, el plano, y la vista de cada persona tras cada
 * paso— vive en `oro.ts` y no sabe a qué se juega. Lo PROPIO —cómo es una
 * partida de referencia y qué pasa en ella— lo trae cada juego aquí.
 *
 * Es la misma inversión que persigue la arquitectura entera, aplicada a la red
 * de seguridad: el motor no pregunta «¿es CLUEDO?», pregunta «¿cuál es tu
 * guion?».
 */
import type { GameSession } from '../../../shared/types';
import type { JuegoId } from '../../../shared/juegos';
import type { LiveSession } from '../../../shared/live';

/**
 * Lo que el guion recibe para jugar la velada.
 *
 * `game` y `sesion` se mutan en vivo, que es como funcionan las funciones de
 * la plataforma. El guion las toca y llama a `retratar` cuando quiere que
 * quede constancia.
 */
export interface Mesa {
  game: GameSession;
  sesion: LiveSession;
  /**
   * Congela la vista COMPLETA de todos los jugadores y la de quien dirige.
   *
   * Sin resumir y sin recortar, a propósito: ahí es donde vive la defensa
   * antitrampas, así que si un día se filtra un campo que no debía salir,
   * aparece en el diff en vez de pasar desapercibido.
   */
  retratar(paso: string): void;
  /**
   * Ejecuta una acción POR EL MOTOR GENÉRICO y anota qué contestó.
   *
   * Por el motor y no llamando al reductor a mano, que es lo que hacen los
   * comprobadores de cada juego: así se congela también la VALIDACIÓN —que la
   * acción existe, que la fase la admite, que no se ha gastado, que el id
   * elegido es de verdad—. Esos mensajes los lee gente con el móvil en la mano
   * y son tan parte del producto como el resto.
   *
   * Si el motor la rechaza NO se rompe el guion: se anota el rechazo y se
   * sigue. Un guion que revienta al primer «no» solo puede congelar el camino
   * feliz, y el camino feliz no es donde están los fallos.
   */
  accion(quien: string, accion: string, datos?: Record<string, string | string[]>): void;
  /** Igual, para las transiciones de fase, que no pasan por el motor. */
  intentar(que: string, hacer: () => void): void;
}

export interface GuionDeOro {
  juego: JuegoId;
  /** Para el encabezado del informe. */
  titulo: string;
  /**
   * La partida de referencia, construida desde cero.
   *
   * El motor la congela en disco la primera vez y a partir de ahí la lee
   * siempre igual. Si se regenerase en cada ejecución, el maestro de oro
   * compararía dos partidas distintas y no serviría para nada — así que aquí
   * NO puede haber ni `Math.random` ni `Date.now`: toda semilla va explícita.
   */
  partidaDeReferencia(): GameSession;
  /** La sesión recién abierta, antes de que llegue nadie. */
  sesionInicial(game: GameSession): LiveSession;
  /** La velada entera, paso a paso. */
  velada(mesa: Mesa): void;
}
