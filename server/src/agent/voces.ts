/**
 * Quién le pone voz al asistente del taller de cada juego.
 *
 * ═══ LO QUE HABÍA ═══
 *
 * `buildSystemPrompt` empezaba con dos comparaciones por id de juego:
 *
 *     if (game.settings?.juego === MOMIA.id) return buildSystemPromptMomia(game);
 *     if (game.settings?.juego === SOMBRAS.id) return buildSystemPromptSombras(game);
 *
 * y todo lo que venía después era el de CLUEDO. Es el mismo patrón que ya se
 * retiró de la generación de trama y falla igual: un juego nuevo que se olvide de
 * poner su línea NO da un error. Recibe a Edmund, el mayordomo, explicando
 * refutaciones y pasadizos secretos en una expedición egipcia. Y el fichero
 * común tiene que importar por nombre a todos los juegos que existen para poder
 * compararse con ellos.
 *
 * ═══ POR QUÉ UN REGISTRO Y NO UN CAMPO DEL MANIFIESTO ═══
 *
 * El manifiesto ya declara la VOZ del asistente —cómo habla, cómo saluda, cómo
 * se niega— y eso es dato. Esto no: un prompt de sistema se compone mirando la
 * partida —cuántas entidades hay de cada cosa, si ya hay trama, si ya hay
 * documentos— y decidiendo qué pedirle a continuación. Es «y entonces…», no una
 * tabla, así que va donde va el código: en un registro por juego, como las
 * acciones, las proyecciones, los trofeos y los generadores.
 *
 * ═══ FALLA CERRADO ═══
 *
 * Sin alta, `vozDelTaller` devuelve `undefined` y quien pregunta decide. Hoy
 * `buildSystemPrompt` cae en el de CLUEDO por compatibilidad —es lo que hacía— y
 * lo dice en su comentario, en vez de que la caída esté escondida en el orden de
 * dos `if`.
 */
import { manifiestoDe } from '../../../shared/juegos';
import type { JuegoId } from '../../../shared/juegos';
import type { GameSession } from '../../../shared/types';

/** Compone el prompt de sistema del asistente del taller de este juego. */
export type VozDelTaller = (game: GameSession) => string;

/** Anclado al ámbito global, como los demás registros y por lo mismo. */
const LLAVE = Symbol.for('gamemasters.juegos.voces');
const global_ = globalThis as unknown as Record<symbol, Record<string, VozDelTaller>>;
const VOCES: Record<JuegoId, VozDelTaller> = global_[LLAVE] ?? (global_[LLAVE] = {});

/** Da de alta el prompt del asistente del taller de un juego. */
export function registrarVoz(juego: JuegoId, voz: VozDelTaller): void {
  VOCES[juego] = voz;
}

/**
 * La voz del taller de esta partida, si la tiene dada de alta.
 *
 * El id se resuelve con el manifiesto y no con el campo crudo, por lo mismo que
 * en los demás registros: una partida de CLUEDO de las de siempre no lleva
 * `settings.juego` escrito.
 */
export function vozDelTaller(juego: JuegoId | undefined): VozDelTaller | undefined {
  return VOCES[manifiestoDe(juego).id];
}

/** Los juegos que tienen voz dada de alta. Lo usa la comprobación. */
export function juegosConVoz(): JuegoId[] {
  return Object.keys(VOCES);
}
