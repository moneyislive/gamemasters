/**
 * Qué tiene que estar montado antes de que empiece la velada.
 *
 * EL PROBLEMA. `LiveSession.estado` es la bolsa donde cada juego guarda lo
 * suyo, y nacía perezosamente: la creaba el primer reductor que la necesitara.
 * Para quien juega eso da igual —la primera acción la crea— pero para QUIEN
 * DIRIGE no, porque su panel no ejecuta acciones: solo lee.
 *
 * LO QUE PASABA EN LA MESA. Al abrir la sala y al abrir la vigilia 1, el panel
 * del Game Master no encontraba estado y en vez de la cámara profanada —que es
 * literalmente lo primero que hay que anunciar en voz alta— pintaba un texto
 * que aconsejaba «ciérrala y vuelve a abrirla». Ese consejo BORRA la sesión en
 * vivo y echa a las ocho personas de la mesa. Mientras tanto los móviles sí la
 * veían, porque a ellos se la crea su primera acción: la mesa se enteraba antes
 * que quien dirige, y quien dirige tenía delante un botón que parecía la
 * solución y era el desastre.
 *
 * POR QUÉ UN REGISTRO. El comentario de `momia-acciones.ts` decía que
 * `abrirSesion` es código de plataforma y no puede saber que un juego tiene
 * algo que inicializar. Tenía razón sobre el problema y no sobre la solución:
 * no tiene que saberlo, tiene que PREGUNTARLO. Un juego que no registra nada
 * abre exactamente igual que antes — y CLUEDO no registra nada.
 */
import type { JuegoId } from '../../../shared/juegos';
import type { LiveSession } from '../../../shared/live';
import type { GameSession } from '../../../shared/types';

/**
 * Deja la sesión lista para jugar. Recibe la sesión recién creada y la modifica
 * en el sitio, antes de que se guarde por primera vez.
 */
export type Inicio = (game: GameSession, sesion: LiveSession) => void;

/** Anclado al ámbito global, como los demás registros y por lo mismo. */
const LLAVE = Symbol.for('gamemasters.juegos.inicios');
const global_ = globalThis as unknown as Record<symbol, Record<string, Inicio>>;
const INICIOS: Record<JuegoId, Inicio> = global_[LLAVE] ?? (global_[LLAVE] = {});

/** Da de alta qué hay que montar antes de empezar. */
export function registrarInicio(juego: JuegoId, inicio: Inicio): void {
  INICIOS[juego] = inicio;
}

/**
 * Monta lo que el juego necesite. Si no registra nada, no pasa nada.
 *
 * SE TRAGA LOS ERRORES, y esta vez sí: una partida a la que no se le pudo
 * montar el estado sigue abriéndose, y el primer reductor lo creará como
 * siempre. Tumbar la apertura de una mesa con doce personas esperando por un
 * fallo en algo que se puede reconstruir sería peor que el fallo.
 */
export function iniciarJuego(game: GameSession, sesion: LiveSession): void {
  const inicio = INICIOS[sesion.juego ?? ''];
  if (!inicio) return;
  try {
    inicio(game, sesion);
  } catch (error) {
    console.error(`[inicios] «${sesion.juego}» no pudo montar su estado al abrir:`, error);
  }
}
