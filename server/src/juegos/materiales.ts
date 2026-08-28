/**
 * Quién sabe escribir el «material de la velada» de cada juego.
 *
 * QUÉ ES EL MATERIAL. Las narraciones de cada ronda, los giros, las
 * revelaciones de la cronología, las ayudas y el desenlace: texto que se escribe
 * ENCIMA de una trama ya generada, sin tocarla, y que el taller ofrece
 * reescribir con un botón.
 *
 * LO QUE PASABA. La ruta no miraba el juego. Pulsar «Reescribir» en una partida
 * de El Misterio de la Momia corría el pipeline de CLUEDO, que pide culpable,
 * arma y sala a una trama que no tiene ninguna de las tres: devuelven cadena
 * vacía y el modelo escribe sobre un asesinato que no ha ocurrido. El resultado
 * sustituía las narraciones de vigilia ya depuradas. Sin aviso y sin deshacer.
 *
 * FALLA CERRADO. Un juego que no registra generador recibe un 409 y su botón no
 * se pinta, en vez de recibir el de otro juego. Que el manifiesto lo declare y
 * que aquí haya un generador son dos cosas distintas —una la ve el taller, la
 * otra la ejecuta el servidor— y por eso `verify:puertas` comprueba que no se
 * separen: declarar sin generador deja un botón que da 409, y generador sin
 * declarar deja código al que no llega nadie.
 */
import { manifiestoDe } from '../../../shared/juegos';
import type { JuegoId } from '../../../shared/juegos';
import type { GenerateStreamEvent, GameSession, Plot, PrintMaterial } from '../../../shared/types';

/** Escribe el material de la velada de este juego sobre una trama existente. */
export type GeneradorDeMaterial = (
  game: GameSession,
  plot: Plot,
  emit: (evento: GenerateStreamEvent) => void,
) => Promise<PrintMaterial>;

/** Anclado al ámbito global, como los demás registros y por lo mismo. */
const LLAVE = Symbol.for('gamemasters.juegos.materiales');
const global_ = globalThis as unknown as Record<symbol, Record<string, GeneradorDeMaterial>>;
const GENERADORES: Record<JuegoId, GeneradorDeMaterial> =
  global_[LLAVE] ?? (global_[LLAVE] = {});

/** Da de alta quién escribe el material de la velada de un juego. */
export function registrarMaterial(juego: JuegoId, generador: GeneradorDeMaterial): void {
  GENERADORES[juego] = generador;
}

/** ¿Sabe alguien escribir el material de este juego? */
/*
 * EL ID SE RESUELVE CON EL MANIFIESTO, NO CON EL CAMPO CRUDO.
 *
 * Una partida de CLUEDO de las de siempre NO tiene `settings.juego` escrito: el
 * campo nacio con el segundo juego y `manifiestoDe(undefined)` cae en CLUEDO a
 * proposito, para que las partidas de antes sigan funcionando. Buscar aqui por
 * `juego ?? ''` significaba no encontrar NADA para esas partidas, o sea saltarse
 * en silencio lo que CLUEDO si tiene dado de alta. Estuvo roto exactamente asi,
 * con la suite entera en verde, porque ninguna comprobacion entraba por esa
 * puerta con una partida sin el campo.
 */
export function generadorDeMaterial(juego: JuegoId | undefined): GeneradorDeMaterial | undefined {
  return GENERADORES[manifiestoDe(juego).id];
}

/** Los juegos que tienen generador dado de alta. Lo usa la comprobación. */
export function juegosConMaterial(): string[] {
  return Object.keys(GENERADORES);
}
