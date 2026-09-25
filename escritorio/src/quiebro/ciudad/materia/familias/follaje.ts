/**
 * EL FOLLAJE: la familia 13 (follaje) de `FAMILIA` (`../familias.ts`). Lo que la lleva: la copa de los
 * árboles del Bulevar.
 *
 * STUB DE LA OLA 1: devuelve su entrada tal cual (`superficieNeutraQ`: el albedo, la rugosidad, el metal y
 * la normal que le llegan; barniz y emisión 0). La rellena O2-FAROLAS-Y-PIEZAS en la ola 2: el ruido de
 * hoja y los huecos oscuros sin transparencia (N2+).
 *
 * La firma es fija: `SuperficieQ superficieFollajeQ(EntradaQ e)`. `superficieQ` la llama sólo con
 * `MATERIA_Q >= 1` (en N0 no se reparten familias). Reglas de la materia (`../glsl.ts`): nada de `dFdx`,
 * `dFdy`, `fwidth` ni `texture()` aquí (las derivadas ya están en `dPdxQ`, `dUvdxQ` y `pxMundoQ`, y la
 * normal sale de `normalPorDerivadasQ`); toda lectura con `textureLod` y un lod de `lodQ`; nada que decida
 * (eso es `hashQ`); y lo que sube de nivel, dentro de su `#if MATERIA_Q >= n`.
 */

/** La familia 13, follaje. */
export const GLSL_FAMILIA_FOLLAJE = /* glsl */ `
SuperficieQ superficieFollajeQ(EntradaQ e) {
  return superficieNeutraQ(e);
}
`;
