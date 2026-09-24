/**
 * EL HASH DE LOS SOMBREADORES, EN JAVASCRIPT: la misma cuenta, bit a bit.
 *
 * ═══ POR QUÉ HACE FALTA UNA COPIA ═══
 *
 * Qué ventana está encendida lo decide el sombreador de la fachada con `hashQ` (glsl.ts), por
 * píxel y sin guardar nada. Pero las TARJETAS DE REFLEJO —el brillo de esa ventana estirado en el
 * charco de abajo— se colocan desde JavaScript al construir la ciudad, y tienen que caer bajo las
 * ventanas que el sombreador enciende, no bajo otras. Así que la regla de «encendida» existe dos
 * veces, aquí y en `fachadas.ts`, y tienen que dar lo mismo. Por eso las dos usan sólo enteros de
 * 32 bits (PCG) y la semilla es un entero exacto en coma flotante (< 2^24): nada de productos de
 * coma flotante que en la GPU redondeen distinto.
 *
 * Si se cambia `encendidaQ` en el GLSL, se cambia `encendida` aquí. El banco lo delata: una tarjeta
 * que brilla bajo una ventana apagada se ve.
 */

/** PCG de 32 bits, idéntico a `pcgQ`. */
export function pcg(v: number): number {
  const s = (Math.imul(v >>> 0, 747796405) + 2891336453) >>> 0;
  const w = Math.imul((((s >>> ((s >>> 28) + 4)) ^ s) >>> 0) | 0, 277803737) >>> 0;
  return ((w >>> 22) ^ w) >>> 0;
}

/** Idéntico a `hashQ(vec2(x, y), semilla)` con semilla entera. En [0, 1). */
export function hashQ(x: number, y: number, semilla: number): number {
  const qx = (Math.floor(x) + 65536) >>> 0;
  const qy = (Math.floor(y) + 65536) >>> 0;
  const s = Math.imul(Math.trunc(Math.max(semilla, 0)) >>> 0, 9973) >>> 0;
  return pcg((qx + pcg((qy + pcg(s)) >>> 0)) >>> 0) / 4294967296;
}

/** El estilo de fachada como número, como lo lleva el atributo `aCara.y`. */
export const NUMERO_DEL_ESTILO = { piedra: 0, ladrillo: 1, hormigon: 2, vidrio: 3, revoco: 4, azulejo: 5 } as const;

/** Las tiendas de una planta baja: una cada 6 m, y la última se queda con el resto (como los rótulos del barrio). */
export const LARGO_DE_UNA_TIENDA = 6;

/** Idéntico a la elección de tienda del sombreador: 0 persiana, 1 escaparate encendido, 2 portal, 3 apagado. */
export function queTienda(tienda: number, semilla: number, portales: boolean): 0 | 1 | 2 | 3 {
  const ht = hashQ(tienda, 3, semilla);
  if (portales) return ht < 0.35 ? 2 : ht < 0.7 ? 3 : 0;
  return ht < 0.34 ? 0 : ht < 0.66 ? 1 : ht < 0.8 ? 2 : 3;
}

/** Idéntico a `encendidaQ` del sombreador de la fachada. */
export function encendida(celda: number, planta: number, semilla: number, estilo: number): boolean {
  const hv = hashQ(celda, planta, semilla);
  const hp = hashQ(planta, 91, semilla);
  const prob = estilo === 3 ? (hp < 0.16 ? 0.8 : 0.04) : 0.12 + 0.2 * hp;
  return hv < prob;
}

/** Idéntico a `colorDeLuzQ(hashQ(vec2(celda, planta), semilla + 17))`: el color de la luz de dentro. */
export function colorDeLaVentana(celda: number, planta: number, semilla: number): readonly [number, number, number] {
  const h = hashQ(celda, planta, semilla + 17);
  if (h < 0.45) return [1.0, 0.56, 0.24];
  if (h < 0.7) return [1.0, 0.74, 0.46];
  if (h < 0.9) return [0.7, 0.86, 1.0];
  return [0.35, 0.5, 1.0];
}
