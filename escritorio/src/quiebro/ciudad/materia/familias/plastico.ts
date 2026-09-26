/**
 * EL PLÁSTICO: la familia 6 (plástico) de `FAMILIA` (`../familias.ts`). Lo que la lleva: los carteles del
 * quiosco de prensa, el mostrador de la cabina, las tapas de las papeleras.
 *
 * Es una FILA de la receta común del mobiliario (`liso.ts`, donde está el porqué y lo que significa cada número);
 * su rama no hace nada más.
 *
 *   · N1: cada pieza de su tono, el VELO de polvo y sol (el gris, más arriba) y el mojado, que sólo alisa
 *     (poro 0,1).
 *   · N2: la mugre al pie.
 *
 * La firma es fija: `SuperficieQ superficiePlasticoQ(EntradaQ e)`. `superficieQ` la llama sólo con
 * `MATERIA_Q >= 1` (en N0 no se reparten familias). Reglas de la materia (`../glsl.ts`): nada de `dFdx`,
 * `dFdy`, `fwidth` ni `texture()` aquí (las derivadas ya están en `dPdxQ`, `dUvdxQ` y `pxMundoQ`, y la
 * normal sale de `normalPorDerivadasQ`); toda lectura con `textureLod` y un lod de `lodQ`; nada que decida
 * (eso es `hashQ`); y lo que sube de nivel, dentro de su `#if MATERIA_Q >= n`.
 */
import type { RecetaDeLaFamilia } from './liso';

/** La receta del plástico (ver `liso.ts`). */
export const RECETA_DEL_PLASTICO: RecetaDeLaFamilia = [
  [0.25, 0.2, 0.1, 0],
  [0, 0, 0, 0],
  [0.3, 0, 0, 0],
  [0, 0, 0, -1],
];

/** La familia 6, plástico. */
export const GLSL_FAMILIA_PLASTICO = /* glsl */ `
SuperficieQ superficiePlasticoQ(EntradaQ e) {
  return superficieNeutraQ(e);
}
`;
