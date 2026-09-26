/**
 * LA PIEDRA Y EL GRANITO: la familia 3 (piedra y granito) de `FAMILIA` (`../familias.ts`). Lo que la lleva:
 * el pilón y la taza de la fuente, el zócalo del quiosco, la estatua, las basas.
 *
 * Es una FILA de la receta común del mobiliario (`liso.ts`, donde está el porqué y lo que significa cada número);
 * su rama no hace nada más.
 *
 *   · N1: cada pieza de su tono y el mojado (poro 0,8).
 *   · N2: el MOTEADO del granito (el grano a 500 téxeles por metro: pintas de unos milímetros, que la mip funde
 *     en su media a lo lejos, sin centelleo), en el color y en la normal (la piedra abujardada), y la mugre al pie.
 *   · La capa 0 del horno (piedra).
 *
 * La firma es fija: `SuperficieQ superficiePiedraQ(EntradaQ e)`. `superficieQ` la llama sólo con `MATERIA_Q
 * >= 1` (en N0 no se reparten familias). Reglas de la materia (`../glsl.ts`): nada de `dFdx`, `dFdy`,
 * `fwidth` ni `texture()` aquí (las derivadas ya están en `dPdxQ`, `dUvdxQ` y `pxMundoQ`, y la normal sale
 * de `normalPorDerivadasQ`); toda lectura con `textureLod` y un lod de `lodQ`; nada que decida (eso es
 * `hashQ`); y lo que sube de nivel, dentro de su `#if MATERIA_Q >= n`.
 */
import type { RecetaDeLaFamilia } from './liso';

/** La receta de la piedra (ver `liso.ts`). */
export const RECETA_DE_LA_PIEDRA: RecetaDeLaFamilia = [
  [0.3, 0.1, 0.8, 0],
  [500, 500, 0.00012, 0.6],
  [0.3, 0, 0, 0],
  [0, 0, 0, 0],
];

/** La familia 3, piedra y granito. */
export const GLSL_FAMILIA_PIEDRA = /* glsl */ `
SuperficieQ superficiePiedraQ(EntradaQ e) {
  return superficieNeutraQ(e);
}
`;
