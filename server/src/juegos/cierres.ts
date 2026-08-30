/**
 * Cómo cierra su noche cada juego.
 *
 * EL PROBLEMA. Hay juegos cuyo final no es «alguien acertó primero» sino un
 * acto que quien dirige ejecuta una vez y no se deshace. En El Misterio de la
 * Momia es el ritual: se ejecuta el orden más votado y la tumba se sella o no.
 * Ese acto tiene que quedar ESCRITO, porque el resultado depende del estado en
 * ese instante y el estado sigue cambiando: quien entregue otra propuesta
 * después no puede volcar un final que ya se ha dicho en voz alta.
 *
 * LO QUE PASABA. El taller pintaba el botón «Ejecutar el ritual» y llamaba a una
 * ruta que no existía. Contestaba 404 y el aviso se borraba solo en poco más de
 * un segundo, así que en la mesa el botón parecía no hacer nada. La función que
 * lo escribía —`ejecutarSellado`— existía y su único llamador en todo el
 * repositorio era el guion de comprobaciones. Es el mismo hueco de siempre:
 * motor probado por dentro, puerta sin abrir.
 *
 * POR QUÉ UN REGISTRO Y NO UN `if`. Porque un `if` por juego en una ruta de
 * plataforma es exactamente lo que este código lleva un informe entero
 * señalando como deuda. Con registro, un juego que no declara cierre recibe un
 * 409 honesto —«este juego no se cierra así»— y CLUEDO no gana ninguna puerta
 * nueva por el hecho de que la Momia la necesite.
 */
import { manifiestoDe, manifiestoSiExiste } from '../../../shared/juegos';
import type { JuegoId } from '../../../shared/juegos';
import type { LiveSession } from '../../../shared/live';
import type { GameSession } from '../../../shared/types';

/**
 * Ejecuta el cierre propio del juego y lo deja escrito en la sesión.
 *
 * Recibe la sesión VIVA y la modifica en el sitio: quien llama está dentro de
 * `mutar`, que es lo que garantiza que nadie más la toca a la vez y que se
 * guarda al salir. Lo que devuelve es lo que se anuncia en la mesa.
 */
export type Cierre = (game: GameSession, sesion: LiveSession) => { anuncio: string };

/**
 * Anclado al ámbito global por la misma razón que los reductores, las
 * proyecciones y los trofeos: este fichero se puede cargar dos veces por rutas
 * distintas, y con una constante de módulo las altas se perderían en silencio.
 */
const LLAVE = Symbol.for('gamemasters.juegos.cierres');
const global_ = globalThis as unknown as Record<symbol, Record<string, Cierre>>;
const CIERRES: Record<JuegoId, Cierre> = global_[LLAVE] ?? (global_[LLAVE] = {});

/** Da de alta cómo cierra su noche un juego. */
export function registrarCierre(juego: JuegoId, cierre: Cierre): void {
  CIERRES[juego] = cierre;
}

/** ¿Este juego se cierra con un acto de quien dirige? */
export function tieneCierre(juego: JuegoId | undefined): boolean {
  const manifiesto = manifiestoSiExiste(juego);
  return manifiesto !== undefined && Boolean(CIERRES[manifiesto.id]);
}

/**
 * Ejecuta el cierre. Lanza si el juego no declara ninguno.
 *
 * NO SE TRAGA LOS ERRORES, al revés que la proyección y los trofeos, y la
 * diferencia importa: aquellos adornan una pantalla y este decide cómo termina
 * la noche. Si falla, quien dirige tiene que enterarse en el acto y no ejecutar
 * un ritual que no se ha escrito.
 */
export function ejecutarCierre(game: GameSession, sesion: LiveSession): { anuncio: string } {
  const cierre = CIERRES[manifiestoDe(sesion.juego).id];
  if (!cierre) {
    throw new Error('Este juego no se cierra así.');
  }
  return cierre(game, sesion);
}
