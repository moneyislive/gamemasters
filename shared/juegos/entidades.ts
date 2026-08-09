/**
 * El puente entre «categoría del juego» y «dónde están guardadas esas cosas».
 *
 * Hoy una partida guarda sus entidades en tres campos con nombre propio:
 * `suspects`, `rooms` y `weapons`. Eso funciona para CLUEDO y no para nada más.
 * El destino es `entidades: Record<CategoriaId, Entidad[]>`, pero cambiar el
 * almacenamiento de golpe obligaría a migrar las partidas que ya existen y a
 * tocar de una sentada las trece plantillas de imprimibles.
 *
 * Así que la generalización entra por aquí: todo el código que quiera ser
 * agnóstico pide entidades POR CATEGORÍA y no toca los tres campos. El día que
 * el almacenamiento cambie, cambia esta función y nada más.
 *
 * Mientras tanto, un juego nuevo ya puede declarar sus propias categorías y
 * guardarlas en `entidades`, que se consulta primero.
 *
 * VIVE EN shared/ Y NO EN server/ POR UNA RAZÓN CONCRETA: lo descubrió la
 * prueba del segundo juego. `computeStaleness` también tiene que resolver
 * entidades por categoría, y está aquí porque lo usa el taller. Con el puente
 * del lado del servidor, aquella función se quedaba con las tres categorías
 * de CLUEDO escritas a mano y daba por rota la solución de cualquier otro
 * juego.
 */
import { ejes as ejesDe } from './tipos';
import type { CategoriaId, ManifiestoDeJuego } from './tipos';
import type { GameSession } from '../types';

/** Lo mínimo que tiene cualquier cosa que el Game Master da de alta. */
export interface Entidad {
  id: string;
  name: string;
  description?: string;
  photoUrl?: string;
  email?: string;
  pin?: { x: number; y: number };
}

/**
 * Los campos heredados de CLUEDO, por categoría.
 *
 * Es la única tabla del sistema que conoce a la vez un id de categoría y un
 * nombre de campo del almacén. Cuando desaparezca, la generalización estará
 * completa.
 */
const CAMPO_HEREDADO: Record<CategoriaId, 'suspects' | 'rooms' | 'weapons'> = {
  sospechosos: 'suspects',
  salas: 'rooms',
  objetos: 'weapons',
};

/** Las entidades de una categoría, vengan de donde vengan. */
export function entidadesDe(game: GameSession, categoria: CategoriaId): Entidad[] {
  const propias = game.entidades?.[categoria];
  if (propias) return propias;
  const campo = CAMPO_HEREDADO[categoria];
  return campo ? ((game[campo] ?? []) as Entidad[]) : [];
}

/** Una entidad por su id, dentro de su categoría. */
export function entidadDe(
  game: GameSession,
  categoria: CategoriaId,
  id: string,
): Entidad | undefined {
  return entidadesDe(game, categoria).find((e) => e.id === id);
}

/** El nombre de una entidad, o cadena vacía. Para pintar sin comprobar. */
export function nombreDeEntidad(game: GameSession, categoria: CategoriaId, id: string): string {
  return entidadDe(game, categoria, id)?.name ?? '';
}

/** Las entidades de la categoría que responde a un eje. */
export function entidadesDelEje(
  game: GameSession,
  manifiesto: ManifiestoDeJuego,
  ejeId: string,
): Entidad[] {
  const e = ejesDe(manifiesto).find((x) => x.id === ejeId);
  return e ? entidadesDe(game, e.categoria) : [];
}
