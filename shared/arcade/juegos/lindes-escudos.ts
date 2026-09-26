/**
 * LOS ESCUDOS DE LAS LINDES A PIE: lo que se recoge andando por el valle en una mesa `botas`, y la
 * leva que se paga con ellos. Ver `docs/AVATARES-JUGABLES.md` §5.
 *
 * Cada escudo se gasta de una de dos maneras, y esa elección es el juego:
 *
 *  · LEVA: `ESCUDOS_POR_LEVA` escudos alistan un labriego más (`LEVA`, +1 `sinPlantar`), como mucho
 *    `LEVAS_POR_JUGADOR` veces por partida.
 *  · GUARDARLOS: cada escudo sin gastar vale `PUNTOS_POR_ESCUDO` en el recuento final.
 *
 * Tabla pura, fuera de `lindes.ts`, porque la leen el reductor y los dos clientes. Los campos del
 * estado y de la vista (`escudos`, `levas`) son OPCIONALES y aparecen con su primer uso: una
 * partida en la que nadie baja al valle es, byte a byte, la de antes (`oro:arcade`).
 */

/** El movimiento de la leva: `{ tipo: LEVA, carga: {} }`, de quien la paga. */
export const LEVA = 'lindes:leva';

/** Cuántos escudos cuesta una leva. */
export const ESCUDOS_POR_LEVA = 3;

/** Cuántas levas puede pagar cada uno en una partida. */
export const LEVAS_POR_JUGADOR = 2;

/** Lo que vale en el recuento final cada escudo que no se gastó. */
export const PUNTOS_POR_ESCUDO = 1;

/** Cuántos escudos se lleva el botín de la refriega, además de sus puntos. */
export const ESCUDOS_DEL_BOTIN = 1;

/** Un contador de un asiento en un mapa opcional de la vista (`escudos` o `levas`). Cero si no hay. */
function contadorDeLaVista(vista: unknown, campo: 'escudos' | 'levas', asiento: string): number {
  if (typeof vista !== 'object' || vista === null) return 0;
  const todos = (vista as Record<string, unknown>)[campo];
  if (typeof todos !== 'object' || todos === null || Array.isArray(todos)) return 0;
  if (!Object.prototype.hasOwnProperty.call(todos, asiento)) return 0;
  const n = (todos as Record<string, unknown>)[asiento];
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 ? n : 0;
}

/** Los escudos sin gastar de un asiento, leídos de la vista pública. */
export function escudosDeLaVista(vista: unknown, asiento: string): number {
  return contadorDeLaVista(vista, 'escudos', asiento);
}

/** Las levas que ya ha pagado un asiento, leídas de la vista pública. */
export function levasDeLaVista(vista: unknown, asiento: string): number {
  return contadorDeLaVista(vista, 'levas', asiento);
}

/** ¿Puede pagar una leva quien tiene estos escudos y ya pagó estas levas? */
export function puedePagarLaLeva(escudos: number, levas: number): boolean {
  return escudos >= ESCUDOS_POR_LEVA && levas < LEVAS_POR_JUGADOR;
}
