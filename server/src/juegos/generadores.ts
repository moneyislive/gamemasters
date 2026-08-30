/**
 * Quién sabe escribir la TRAMA de cada juego, y qué se lee mientras la escribe.
 *
 * ═══ LO QUE HABÍA ═══
 *
 * `plot/pipeline.ts` elegía el generador con un ternario encadenado por id de
 * juego:
 *
 *     const esMomia = game.settings?.juego === MOMIA.id;
 *     const esSombras = game.settings?.juego === SOMBRAS.id;
 *     const plot = esMomia ? … : esSombras ? … : (…la de CLUEDO…);
 *
 * y lo mismo, otra vez, para el rótulo que se lee durante los sesenta segundos
 * que tarda. Eso significa tres cosas malas a la vez.
 *
 * Una: la rama por defecto es CLUEDO, EN SILENCIO. Un juego nuevo que se olvide
 * de entrar en el ternario no da un error: le generan un asesinato. Con culpable,
 * arma y sala, sobre sus entidades, y con el modelo respondiendo a un esquema que
 * empieza por «Eres un novelista de misterio experto en CLUEDO».
 *
 * Dos: el sitio donde hay que acordarse de entrar no tiene nada que ver con el
 * juego que se está escribiendo. Está en la tubería común, entre el tablero y el
 * guardado.
 *
 * Y tres: `pipeline.ts` tiene que IMPORTAR los tres juegos para poder
 * compararse con ellos, así que el fichero más común del sistema conoce por
 * nombre a todos los juegos que existen.
 *
 * ═══ FALLA CERRADO ═══
 *
 * Igual que `registrarMaterial`: un juego que no da de alta su generador no
 * recibe el de otro. Recibe un error que dice exactamente lo que pasa, y quien lo
 * lea sabrá qué le falta. Es la diferencia entre «no se puede generar todavía» y
 * una velada entera preparada sobre la trama equivocada.
 */
import { manifiestoDe } from '../../../shared/juegos';
import type { JuegoId } from '../../../shared/juegos';
import type { GenerateStreamEvent, GameSession, Plot } from '../../../shared/types';

/** Escribe la trama de este juego. */
export type GeneradorDeTrama = (
  game: GameSession,
  emit: (evento: GenerateStreamEvent) => void,
) => Promise<Plot>;

export interface AltaDeGenerador {
  /**
   * Lo que se lee mientras escribe, a pantalla completa.
   *
   * Estaba en el mismo ternario que el generador y por eso se podía separar de
   * él: quien añadiera un juego podía acordarse de una cosa y no de la otra, y
   * entonces la Momia recomponía su papiro mientras la pantalla decía «Tejiendo
   * la trama del crimen…». Van juntos porque son la misma decisión.
   */
  rotulo: string;
  generar: GeneradorDeTrama;
}

/** Anclado al ámbito global, como los demás registros y por lo mismo. */
const LLAVE = Symbol.for('gamemasters.juegos.generadores');
const global_ = globalThis as unknown as Record<symbol, Record<string, AltaDeGenerador>>;
const GENERADORES: Record<JuegoId, AltaDeGenerador> = global_[LLAVE] ?? (global_[LLAVE] = {});

/** Da de alta quién escribe la trama de un juego. */
export function registrarGenerador(juego: JuegoId, alta: AltaDeGenerador): void {
  GENERADORES[juego] = alta;
}

/**
 * Quién escribe la trama de esta partida.
 *
 * EL ID SE RESUELVE CON EL MANIFIESTO, NO CON EL CAMPO CRUDO. Una partida de
 * CLUEDO de las de siempre no tiene `settings.juego` escrito —el campo nació con
 * el segundo juego— y `manifiestoDe(undefined)` cae en CLUEDO a propósito, para
 * que las partidas de antes sigan funcionando. Buscar por `juego ?? ''` sería no
 * encontrar nada para esas partidas: el mismo fallo que ya se pagó una vez en
 * `generadorDeMaterial`, con la suite entera en verde.
 */
export function generadorDeTrama(juego: JuegoId | undefined): AltaDeGenerador | undefined {
  return GENERADORES[manifiestoDe(juego).id];
}

/** Los juegos que tienen generador dado de alta. Lo usa la comprobación. */
export function juegosConGenerador(): JuegoId[] {
  return Object.keys(GENERADORES);
}
