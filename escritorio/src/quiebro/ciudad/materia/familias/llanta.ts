/**
 * LA LLANTA: la familia 10 (llanta) de `FAMILIA` (`../familias.ts`). Lo que la lleva: las ruedas de los
 * coches.
 *
 * STUB DE LA OLA 1: devuelve su entrada tal cual (`superficieNeutraQ`: el albedo, la rugosidad, el metal y
 * la normal que le llegan; barniz y emisión 0). La rellena O2-VEHICULOS en la ola 2: el disco oscuro y la
 * matrícula de formato INVENTADO con caracteres de bloques (N2+).
 *
 * La firma es fija: `SuperficieQ superficieLlantaQ(EntradaQ e)`. `superficieQ` la llama sólo con `MATERIA_Q
 * >= 1` (en N0 no se reparten familias). Reglas de la materia (`../glsl.ts`): nada de `dFdx`, `dFdy`,
 * `fwidth` ni `texture()` aquí (las derivadas ya están en `dPdxQ`, `dUvdxQ` y `pxMundoQ`, y la normal sale
 * de `normalPorDerivadasQ`); toda lectura con `textureLod` y un lod de `lodQ`; nada que decida (eso es
 * `hashQ`); y lo que sube de nivel, dentro de su `#if MATERIA_Q >= n`.
 */

/** La familia 10, llanta. */
export const GLSL_FAMILIA_LLANTA = /* glsl */ `
SuperficieQ superficieLlantaQ(EntradaQ e) {
  return superficieNeutraQ(e);
}
`;
