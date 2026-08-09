/**
 * Los juegos instalados.
 *
 * CATA. Un registro por nombre, que es lo mínimo que hace falta para que
 * «¿de qué juego es esta partida?» tenga respuesta.
 */
import { CLUEDO } from './cluedo';
import type { JuegoId, ManifiestoDeJuego } from './tipos';

export * from './tipos';
export { CLUEDO };

/** Con qué se juega si una partida no dice de qué juego es. */
export const JUEGO_POR_DEFECTO: JuegoId = 'cluedo';

const INSTALADOS: Record<JuegoId, ManifiestoDeJuego> = {
  [CLUEDO.id]: CLUEDO,
};

/** Todos los juegos instalados, para el catálogo del taller. */
export function juegosInstalados(): ManifiestoDeJuego[] {
  return Object.values(INSTALADOS);
}

/**
 * El manifiesto de un juego.
 *
 * Nunca devuelve undefined: una partida sin juego declarado —todas las que ya
 * existen— es CLUEDO. Sin esto, añadir el campo obligaría a migrar la base de
 * datos, y el objetivo era justamente no tener que hacerlo.
 */
export function manifiestoDe(id: JuegoId | undefined): ManifiestoDeJuego {
  return INSTALADOS[id ?? JUEGO_POR_DEFECTO] ?? CLUEDO;
}
