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
type CampoHeredado = 'suspects' | 'rooms' | 'weapons';

/**
 * Anclado al ambito global, y esta vez con motivo demostrado.
 *
 * Este fichero se carga DOS VECES: una prueba lo importa como
 * `../../shared/juegos` y otro modulo como `./entidades`, y el cargador las
 * trata como modulos distintos. Con una constante de modulo hay dos tablas, y
 * `declararAlmacen` escribe solo en una.
 *
 * Es el mismo fallo del que avisan `INSTALADOS`, `REDUCTORES`, `PROYECCIONES` y
 * `REPARTOS` —los cuatro anclados con `Symbol.for` por esta razon— y esta tabla
 * se quedo sin anclar al escribirla.
 *
 * Y ES DE LOS QUE NO SE VEN: las tres categorias de CLUEDO estan en el literal
 * inicial, asi que no dependen de `declararAlmacen` y CLUEDO funciona igual con
 * esto roto. Los verificadores de CLUEDO seguian TODOS en verde mientras el
 * juego nuevo tenia rechazadas todas sus acciones, porque `motor.ts` importa
 * `entidadesDe` por el camino que veia la tabla sin declarar y no encontraba
 * ninguna de sus entidades.
 */
const LLAVE_ALMACENES = Symbol.for('gamemasters.juegos.almacenes');
const globalAlmacenes = globalThis as unknown as Record<
  symbol,
  Record<CategoriaId, CampoHeredado>
>;

const CAMPO_HEREDADO: Record<CategoriaId, CampoHeredado> =
  globalAlmacenes[LLAVE_ALMACENES] ??
  (globalAlmacenes[LLAVE_ALMACENES] = {
    sospechosos: 'suspects',
    salas: 'rooms',
    objetos: 'weapons',
  });

/**
 * Da de alta dónde vive una categoría.
 *
 * Lo llama `registrarJuego` por cada categoría que declare `almacen`. Antes
 * esta tabla estaba escrita a mano aquí arriba y solo conocía las tres de
 * CLUEDO: cualquier otro juego caía fuera y sus entidades no se encontraban.
 *
 * NO SE PUEDE RESOLVER LEYENDO EL MANIFIESTO EN EL MOMENTO porque estas
 * funciones no lo reciben —las llaman treinta sitios que solo tienen la partida
 * delante— y hacer que lo recibieran habría cambiado treinta firmas para ganar
 * lo mismo. Se rellena al registrar el juego, que ocurre al importar el módulo,
 * mucho antes de que nadie pregunte.
 */
export function declararAlmacen(categoria: CategoriaId, campo: CampoHeredado): void {
  CAMPO_HEREDADO[categoria] = campo;
}

/** Las entidades de una categoría, vengan de donde vengan. */
export function entidadesDe(game: GameSession, categoria: CategoriaId): Entidad[] {
  const propias = game.entidades?.[categoria];
  if (propias) return propias;
  const campo = CAMPO_HEREDADO[categoria];
  return campo ? ((game[campo] ?? []) as Entidad[]) : [];
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
  const campo = CAMPO_HEREDADO[categoria];
  if (campo) {
    if (!game[campo]) (game as unknown as Record<string, unknown>)[campo] = [];
    return game[campo] as unknown as Entidad[];
  }
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
