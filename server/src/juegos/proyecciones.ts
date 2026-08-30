/**
 * Cómo un juego le enseña LO SUYO a quien juega.
 *
 * EL HUECO QUE TAPA. `LiveSession.estado` existía desde la cata para que un
 * juego guardase lo que el motor no interpreta —las marcas de una maldición,
 * los amuletos, los fragmentos de un papiro—. Pero la vista que viaja al móvil
 * solo tenía huecos con forma de misterio: salas, pistas, tablón, acusación. Un
 * juego podía recordar lo suyo y no tenía por dónde contarlo.
 *
 * Aquí se cierra el círculo, y se cierra igual que se abrió el otro: con un
 * registro por juego, hermano de `registrarAcciones`. Un juego da de alta una
 * función, la proyección la llama, y lo que devuelva viaja en
 * `VistaJugador.estadoDelJuego`.
 *
 * QUIÉN DECIDE QUÉ SE VE. La función, no el motor. Y esa es la parte importante:
 * el motor no puede saber qué es secreto en un juego que no conoce. En la Momia,
 * el orden verdadero de los ritos y qué fragmentos son falsos están en el mismo
 * `estado` que las marcas y los amuletos; si el motor lo proyectase entero,
 * bastaría con mirar el JSON para ganar. La función recibe la persona concreta y
 * devuelve solo lo que esa persona puede ver.
 *
 * Es la misma responsabilidad que ya tenía `proyeccion.ts` con la solución de
 * CLUEDO, movida a donde vive el juego que sabe qué esconder.
 *
 * CLUEDO NO REGISTRA NINGUNA, y por eso su vista no cambia ni un byte. Lo
 * comprueba el maestro de oro.
 */
import { manifiestoDe } from '../../../shared/juegos';
import type { JuegoId } from '../../../shared/juegos';
import type { GameSession } from '../../../shared/types';
import type { LiveSession } from '../../../shared/live';

/**
 * Compone lo que ESTA persona puede ver del estado del juego.
 *
 * Devolver `undefined` es lo correcto cuando no hay nada que enseñar: así el
 * campo no aparece en el JSON y la vista de un juego que no lo usa queda
 * idéntica a como estaba.
 */
export type Proyeccion = (
  game: GameSession,
  sesion: LiveSession,
  participanteId: string,
) => unknown | undefined;

/**
 * Anclado al ámbito global por la misma razón que los reductores: este fichero
 * se puede cargar dos veces —una prueba lo importa por una ruta y el servidor
 * por otra, y el cargador las trata como módulos distintos— y con una constante
 * de módulo las altas se perderían en silencio. Ya ocurrió una vez.
 */
const LLAVE = Symbol.for('gamemasters.juegos.proyecciones');
const global_ = globalThis as unknown as Record<symbol, Record<string, Proyeccion>>;
const PROYECCIONES: Record<JuegoId, Proyeccion> = global_[LLAVE] ?? (global_[LLAVE] = {});

/** Da de alta cómo se proyecta el estado de un juego. */
export function registrarProyeccion(juego: JuegoId, proyeccion: Proyeccion): void {
  PROYECCIONES[juego] = proyeccion;
}

/**
 * Lo que ve esta persona del estado de su juego, si el juego lo declara.
 *
 * Se traga los errores a propósito. Una proyección que revienta no puede tumbar
 * la vista entera: quien juega se quedaría con la pantalla en blanco en mitad de
 * una partida por un fallo en una parte accesoria. Se registra y se sigue.
 */
export function proyectarEstado(
  game: GameSession,
  sesion: LiveSession,
  participanteId: string,
): unknown | undefined {
  // Por el manifiesto y no por el campo crudo, igual que `estadoParaGm` aquí
  // abajo: las partidas de CLUEDO de siempre no declaran `settings.juego`.
  const fn = PROYECCIONES[manifiestoDe(sesion.juego).id];
  if (!fn) return undefined;
  try {
    return fn(game, sesion, participanteId);
  } catch (error) {
    console.error(
      `[proyeccion] el juego «${sesion.juego}» no pudo componer su estado para ${participanteId}:`,
      error,
    );
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Lo que puede ver QUIEN DIRIGE del estado del juego
// ---------------------------------------------------------------------------

/**
 * Qué parte del estado del juego puede ver quien dirige.
 *
 * POR QUÉ HACE FALTA UNA SEGUNDA. La vista del Game Master manda la `sesion`
 * entera, y dentro va `estado`, que es donde cada juego guarda lo suyo. En El
 * Misterio de la Momia ahí está el ORDEN VERDADERO de los cinco ritos y qué
 * fragmentos son falsos. El panel no lo pinta —cumple su promesa— pero el dato
 * viaja al navegador, y con el Game Master jugando eso es la partida entera en
 * las herramientas de desarrollo. Además las cabeceras de `routes/live.ts` y de
 * `live/proyeccion.ts` AFIRMAN que la solución nunca se incluye, así que o era
 * verdad o había que hacerla verdad.
 *
 * SOLO SE FILTRA A CIEGAS. Dirigiendo de la forma normal, quien dirige conoce
 * la solución —la lleva en su dosier— y esconderle su propio estado sería
 * quitarle la mitad del puesto de mando por nada.
 *
 * CLUEDO no registra ninguna y su vista no cambia ni un byte.
 */
export type ProyeccionParaGm = (game: GameSession, sesion: LiveSession) => unknown;

const LLAVE_GM = Symbol.for('gamemasters.juegos.proyeccionesGm');
const globalGm = globalThis as unknown as Record<symbol, Record<string, ProyeccionParaGm>>;
const PARA_GM: Record<JuegoId, ProyeccionParaGm> = globalGm[LLAVE_GM] ?? (globalGm[LLAVE_GM] = {});

/** Da de alta qué ve quien dirige a ciegas del estado de un juego. */
export function registrarProyeccionParaGm(juego: JuegoId, fn: ProyeccionParaGm): void {
  PARA_GM[juego] = fn;
}

/**
 * El estado del juego tal y como puede verlo quien dirige a ciegas.
 *
 * Un juego que no registre nada recibe `undefined`, o sea que a ciegas su
 * estado NO viaja. Falla cerrado a propósito: es mejor un panel con menos que
 * una solución en el navegador de quien está jugando.
 */
export function estadoParaGm(game: GameSession, sesion: LiveSession): unknown {
  const fn = PARA_GM[manifiestoDe(sesion.juego).id];
  if (!fn) return undefined;
  try {
    return fn(game, sesion);
  } catch (error) {
    console.error(`[proyeccionGm] el juego «${sesion.juego}» no pudo proyectar para quien dirige:`, error);
    return undefined;
  }
}

/** Los juegos con proyección para quien dirige. Lo usa la comprobación. */
export function juegosConProyeccionGm(): string[] {
  return Object.keys(PARA_GM);
}
