/**
 * LOS HALLAZGOS DE BOOTS ON BOARD: dónde pueden brotar, cuántos hay a la vez, a qué distancia se
 * recogen y sus topes. La mecánica es de la plataforma; qué se encuentra en cada juego es de su
 * tabla (`shared/arcade/juegos/hallazgos-de-los-juegos.ts`). Ver `docs/AVATARES-JUGABLES.md` §2.
 *
 * ═══ QUIÉN HACE QUÉ ═══
 *
 *  · Los SITIOS posibles salen de la arena del mundo de la mesa (`sitiosDeHallazgo`): una rejilla
 *    de puntos donde se puede estar. Puro y entero, igual en los dos lados; en la práctica sólo lo
 *    usa el servidor, y el aparato pinta lo que le dicen.
 *  · Los BROTES —qué hay ahora y dónde— son de la sala del servidor, con su propio azar: no entran
 *    en el diario de la mesa. Se recogen sin mensaje del aparato: el servidor mira cada sitio que
 *    ACEPTA, y si quien anda está de pie a `RADIO_DE_RECOGER` o menos, es suyo.
 *  · Lo que VALE es del reductor del juego, que lo recibe como `arcade:hallazgo` (`hallazgo.ts`).
 */
import { RADIO_DEL_PASEANTE } from './andar';
import { UNO } from './fijo';
import { sePuedeEstar } from './mundo';
import type { Arena } from './mundo';

/** A qué distancia se recoge, en unidades del mundo: un paso largo. */
export const RADIO_DE_RECOGER = 1.5;

/** El mismo radio en Q16.16, al cuadrado: el servidor compara distancias sin raíces. */
export const RADIO_DE_RECOGER_AL_CUADRADO_FIJO = (RADIO_DE_RECOGER * UNO) ** 2;

/** Cuánto tarda en volver a brotar uno recogido, en milisegundos. */
export const REBROTE_MS = 20_000;

/** Cuántos brotes hay a la vez en una mesa de `sentados` personas: tres, y uno más por cabeza. */
export function brotesDeLaMesa(sentados: number): number {
  return 3 + Math.max(0, Math.min(8, sentados));
}

/** Cuántos hallazgos puede recoger una persona por minuto. Uno recogido de más se queda en el suelo. */
export const HALLAZGOS_POR_ASIENTO_Y_MINUTO = 4;

/** Y la mesa entera por minuto: el diario no crece sin freno en una mesa de ocho corriendo. */
export const HALLAZGOS_POR_MESA_Y_MINUTO = 20;

/** Cada cuántas unidades del mundo se mira si se puede estar, al buscar sitios. */
export const PASO_DE_LA_REJILLA = 6;

/** Lo más lejos de un borde o de un cuerpo que tiene que quedar un brote: que se pueda llegar a él. */
const HOLGURA = RADIO_DEL_PASEANTE * 2;

/** Un sitio donde puede brotar algo, en Q16.16. */
export interface SitioDeHallazgo {
  readonly x: number;
  readonly z: number;
}

/**
 * LOS SITIOS DONDE PUEDE BROTAR ALGO en una arena: una rejilla cada `PASO_DE_LA_REJILLA`
 * unidades sobre el rectángulo de casillas, quedándose con los puntos donde cabe alguien con
 * holgura. En el orden de la rejilla (filas de norte a sur, cada una de oeste a este): la misma
 * arena da la misma lista, y el azar que elige entre ellos es de quien la usa.
 */
export function sitiosDeHallazgo(arena: Arena): SitioDeHallazgo[] {
  const paso = PASO_DE_LA_REJILLA * UNO;
  const x0 = (arena.desdeX - 0.5) * arena.lado;
  /*
   * Las filas de la arena se cuentan por `-z` (`sueloEn` mira `casillaDe(-z)`): el norte es la `z`
   * negativa. Tomadas por `z` a secas, en un tablero que no es simétrico —Riberas, Las Lindes— la
   * rejilla recorría el rectángulo reflejado y dejaba media mesa sin sitios.
   */
  const z1 = -(arena.desdeY - 0.5) * arena.lado;
  const x1 = x0 + arena.anchura * arena.lado;
  const z0 = z1 - arena.fondo * arena.lado;
  const sitios: SitioDeHallazgo[] = [];
  for (let z = Math.ceil(z0 / paso) * paso; z <= z1; z += paso) {
    for (let x = Math.ceil(x0 / paso) * paso; x <= x1; x += paso) {
      if (sePuedeEstar(arena, x, z, HOLGURA)) sitios.push({ x, z });
    }
  }
  return sitios;
}

/** Un brote vivo: su número (único en la sala, sólo crece), su clase y dónde está, en Q16.16. */
export interface Brote {
  readonly id: number;
  readonly clase: string;
  readonly x: number;
  readonly z: number;
}

/** Una clase de hallazgo de un juego, con su peso al sortear qué brota. */
export interface ClaseDeHallazgo {
  readonly clase: string;
  readonly peso: number;
}
