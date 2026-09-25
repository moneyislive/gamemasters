/**
 * LO CERCANO (§3.7 del plan del detalle): el coche que se ve a 2-5 m sube de detalle por DISTANCIA, no por
 * celda, en su propia capa (`capas/coches-cercanos.ts`), y se funde con su versión horneada con la trama de
 * Bayer 4 × 4 del canto de la ventana (`lejos.ts`): ningún píxel se pinta dos veces ni se queda sin pintar.
 *
 * ═══ EL RETOQUE, NEUTRO EN LA OLA 1 ═══
 *
 * Los materiales de la ventana que llevan coches (mobiliario, cristal y emisivo) lo piden desde ya en su
 * fábrica, `retoqueDeLoCercano(false)`; la capa pide los suyos con `{ deLaCapa: true }`, que les pone
 * `retoqueDeLoCercano(true)`. Hoy no escribe nada (el texto de los sombreadores no cambia ni un byte: sólo su
 * nombre entra en la llave de caché). O3-LO-CERCANO lo rellena: las cajas de los coches de la capa
 * (`uCercanosQ[8]`, x0, z0, x1, z1), su fundido (`uFundidoCercanoQ[2]`) y el `discard` complementario en la
 * ventana y en la capa. N0 no lleva capa ni `discard`: por eso el retoque recibe el nivel.
 */
import type { Retoque } from '../atmosfera/parcheo';
import type { NivelDeLaCiudad } from './tipos';

/** Cuántos coches aparcados, los más cercanos a la cámara, van en la capa de lo cercano (N0 no la lleva). */
export const COCHES_CERCANOS_POR_NIVEL: Readonly<Record<NivelDeLaCiudad, number>> = { 0: 0, 1: 4, 2: 6, 3: 8 };

/** El grado de los coches de la capa de lo cercano (0: sin capa). El 4 sólo existe aquí: interior, llanta y matrícula. */
export const GRADO_DE_LO_CERCANO_POR_NIVEL: Readonly<Record<NivelDeLaCiudad, number>> = { 0: 0, 1: 2, 2: 3, 3: 4 };

/** Lo que aceptan las fábricas de los materiales de la ventana que llevan coches. */
export interface OpcionesDeLoCercano {
  /** Los materiales de la capa de lo cercano (tiran lo complementario de los de la ventana). */
  readonly deLaCapa?: boolean;
}

/**
 * EL RETOQUE DE LO CERCANO de un material de la ventana (`esLaCapa` falso) o de la capa (verdadero). Neutro en la
 * ola 1: un nombre y ningún texto. El orden, 6: justo después del fundido del canto (5), que también tira píxeles.
 */
export function retoqueDeLoCercano(esLaCapa: boolean, nivel?: NivelDeLaCiudad): Retoque {
  void nivel;
  return { nombre: esLaCapa ? 'cercano-capa' : 'cercano-ventana', orden: 6 };
}
