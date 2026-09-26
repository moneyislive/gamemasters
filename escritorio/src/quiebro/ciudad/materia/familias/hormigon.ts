/**
 * EL HORMIGÓN: la familia 4 (hormigón) de `FAMILIA` (`../familias.ts`). Lo que la lleva: los vados, los
 * bordillos sueltos, los bloques, las barreras de la valla de obra.
 *
 * Es una FILA de la receta común del mobiliario (`liso.ts`, donde está el porqué y lo que significa cada número);
 * su rama no hace nada más.
 *
 *   · N1: las MANCHAS grandes (la variación, fuerte) y el mojado con poro 1: el hormigón es lo que más oscurece
 *     al mojarse.
 *   · N2: el ÁRIDO (pintas claras y poros oscuros del grano a 250 téxeles por metro, en el color y en la
 *     normal), la mugre al pie y los REGUEROS del agua que escurre.
 *   · La capa 2 del horno (hormigón).
 *
 * La firma es fija: `SuperficieQ superficieHormigonQ(EntradaQ e)`. `superficieQ` la llama sólo con
 * `MATERIA_Q >= 1` (en N0 no se reparten familias). Reglas de la materia (`../glsl.ts`): nada de `dFdx`,
 * `dFdy`, `fwidth` ni `texture()` aquí (las derivadas ya están en `dPdxQ`, `dUvdxQ` y `pxMundoQ`, y la
 * normal sale de `normalPorDerivadasQ`); toda lectura con `textureLod` y un lod de `lodQ`; nada que decida
 * (eso es `hashQ`); y lo que sube de nivel, dentro de su `#if MATERIA_Q >= n`.
 */
import type { RecetaDeLaFamilia } from './liso';

/** La receta del hormigón (ver `liso.ts`). */
export const RECETA_DEL_HORMIGON: RecetaDeLaFamilia = [
  [0.6, 0.1, 1, 0],
  [250, 250, 0.0003, 0.4],
  [0.35, 0, 0, 0.35],
  [0, 0, 0, 2],
];

/** La familia 4, hormigón. */
export const GLSL_FAMILIA_HORMIGON = /* glsl */ `
SuperficieQ superficieHormigonQ(EntradaQ e) {
  return superficieNeutraQ(e);
}
`;
