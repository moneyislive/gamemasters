/**
 * LA CARROCERÍA: la familia 11 (carrocería) de `FAMILIA` (`../familias.ts`). Lo que la lleva: los coches
 * aparcados y los de lo cercano.
 *
 * STUB DE LA OLA 1: devuelve su entrada tal cual (`superficieNeutraQ`: el albedo, la rugosidad, el metal y
 * la normal que le llegan; barniz y emisión 0). La rellena O2-VEHICULOS en la ola 2: el `barniz` (el lóbulo
 * lo pone la materia después de la luz), las juntas de las puertas (N1+), la suciedad baja (N1+), las gotas
 * en lo horizontal (N2+) y los regueros (N3).
 *
 * La firma es fija: `SuperficieQ superficieCarroceriaQ(EntradaQ e)`. `superficieQ` la llama sólo con
 * `MATERIA_Q >= 1` (en N0 no se reparten familias). Reglas de la materia (`../glsl.ts`): nada de `dFdx`,
 * `dFdy`, `fwidth` ni `texture()` aquí (las derivadas ya están en `dPdxQ`, `dUvdxQ` y `pxMundoQ`, y la
 * normal sale de `normalPorDerivadasQ`); toda lectura con `textureLod` y un lod de `lodQ`; nada que decida
 * (eso es `hashQ`); y lo que sube de nivel, dentro de su `#if MATERIA_Q >= n`.
 */

/** La familia 11, carrocería. */
export const GLSL_FAMILIA_CARROCERIA = /* glsl */ `
SuperficieQ superficieCarroceriaQ(EntradaQ e) {
  return superficieNeutraQ(e);
}
`;
