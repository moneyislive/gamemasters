/**
 * EL CAUCHO: la familia 5 (caucho) de `FAMILIA` (`../familias.ts`). Lo que la lleva: neumáticos, topes,
 * juntas, las patas de goma de lo que se posa.
 *
 * Es una FILA de la receta común del mobiliario (`liso.ts`, donde está el porqué y lo que significa cada número);
 * su rama no hace nada más.
 *
 *   · N1: cada pieza de su tono, el POLVO (el gris, más en lo que mira arriba) y el mojado, que casi no oscurece
 *     y lo pone a brillar (poro 0,3).
 *   · N2: el grano fino en la normal, que rompe el brillo del mojado.
 *
 * La firma es fija: `SuperficieQ superficieCauchoQ(EntradaQ e)`. `superficieQ` la llama sólo con `MATERIA_Q
 * >= 1` (en N0 no se reparten familias). Reglas de la materia (`../glsl.ts`): nada de `dFdx`, `dFdy`,
 * `fwidth` ni `texture()` aquí (las derivadas ya están en `dPdxQ`, `dUvdxQ` y `pxMundoQ`, y la normal sale
 * de `normalPorDerivadasQ`); toda lectura con `textureLod` y un lod de `lodQ`; nada que decida (eso es
 * `hashQ`); y lo que sube de nivel, dentro de su `#if MATERIA_Q >= n`.
 */
import type { RecetaDeLaFamilia } from './liso';

/** La receta del caucho (ver `liso.ts`). */
export const RECETA_DEL_CAUCHO: RecetaDeLaFamilia = [
  [0.3, 0.25, 0.3, 0],
  [400, 400, 0.0001, 0],
  [0, 0, 0, 0],
  [0, 0, 0, -1],
];

/** La familia 5, caucho. */
export const GLSL_FAMILIA_CAUCHO = /* glsl */ `
SuperficieQ superficieCauchoQ(EntradaQ e) {
  return superficieNeutraQ(e);
}
`;
