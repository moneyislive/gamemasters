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
  suspectId: string,
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
  suspectId: string,
): unknown | undefined {
  const fn = PROYECCIONES[sesion.juego ?? ''];
  if (!fn) return undefined;
  try {
    return fn(game, sesion, suspectId);
  } catch (error) {
    console.error(
      `[proyeccion] el juego «${sesion.juego}» no pudo componer su estado para ${suspectId}:`,
      error,
    );
    return undefined;
  }
}
