/**
 * Las entidades de una partida, por categoría.
 *
 * ═══ AQUI HABIA UN PUENTE, Y YA NO HACE FALTA ═══
 *
 * Una partida guardaba sus cosas en tres campos con nombre propio —`suspects`,
 * `rooms` y `weapons`— que funcionaban para CLUEDO y para nada mas. Este
 * fichero era el puente: todo el codigo agnostico pedia POR CATEGORIA y aqui
 * dentro se traducia a uno de los tres, con una tabla que era «la unica del
 * sistema que conoce a la vez un id de categoria y un nombre de campo».
 *
 * El puente cumplio: permitio generalizar treinta ficheros sin migrar ni una
 * partida. Y tenia fecha de caducidad, porque mientras existiera habia DOS
 * sitios donde podian estar las entidades de un juego, y solo uno de los dos
 * servia para el cuarto.
 *
 * Ahora estan en `entidades` y solo ahi. Lo que habia guardado se movio de una
 * vez con `scripts/mudanza-al-modelo-nuevo.ts`, que es de un solo uso y lo
 * dice en su cabecera.
 *
 * VIVE EN shared/ Y NO EN server/ POR UNA RAZON CONCRETA: lo descubrio la
 * prueba del segundo juego. `computeStaleness` tambien resuelve entidades por
 * categoria y esta aqui porque lo usa el taller. Con esto del lado del
 * servidor, aquella funcion se quedaba con las tres categorias de CLUEDO
 * escritas a mano y daba por rota la solucion de cualquier otro juego.
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
 * Las entidades de una categoría. Para LEER.
 *
 * Devolvía lo que encontrase en `entidades` y, si no había nada, se iba a
 * mirar al campo heredado. Ese respaldo era lo que dejaba pasar una partida sin
 * convertir; ya no hay partidas sin convertir, así que preguntar por una
 * categoría que este juego no tiene devuelve la lista vacía, que es la verdad.
 */
export function entidadesDe(game: GameSession, categoria: CategoriaId): Entidad[] {
  return game.entidades?.[categoria] ?? [];
}

/**
 * La lista REAL de una categoría, la que se puede modificar.
 *
 * `entidadesDe` sirve para leer y devuelve lo que encuentre; esta devuelve el
 * array que de verdad está dentro de la partida, creándolo si hace falta, para
 * que quien da de alta o borra escriba donde toca.
 *
 * Son dos funciones y no una a propósito: leer lo hace todo el mundo y escribir
 * casi nadie. Si `entidadesDe` creara la lista al vuelo, una simple lectura
 * dejaría `entidades: {}` escrito en partidas de CLUEDO que no lo tenían, y el
 * maestro de oro —que compara la partida byte a byte— empezaría a fallar sin
 * que nadie hubiera cambiado nada.
 */
export function listaDeCategoria(game: GameSession, categoria: CategoriaId): Entidad[] {
  /*
   * ═══ SIEMPRE EN `entidades`, PARA TODOS LOS JUEGOS ═══
   *
   * Aquí había un `if (campo)` que mandaba las tres categorías de CLUEDO a
   * `game.suspects`, `game.rooms` y `game.weapons`. O sea que dar de alta un
   * sospechoso escribía en un sitio y dar de alta un rito en otro, según de qué
   * juego fuera la categoría.
   *
   * Ahora todo se guarda igual. Los campos heredados solo los sigue leyendo
   * `entidadesDe` para las partidas que aún no han pasado por la migración, y
   * `alDia` las convierte en cuanto salen del almacén.
   */
  if (!game.entidades) game.entidades = {};
  if (!game.entidades[categoria]) game.entidades[categoria] = [];
  return game.entidades[categoria]!;
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
