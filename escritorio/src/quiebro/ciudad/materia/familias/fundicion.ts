/**
 * LA FUNDICIÓN DE LAS TAPAS: la familia 9 (fundición de tapa) de `FAMILIA` (`../familias.ts`). Lo que la
 * lleva: tapas de alcantarilla, imbornales, rejillas de alcorque.
 *
 * STUB DE LA OLA 1: devuelve su entrada tal cual (`superficieNeutraQ`: el albedo, la rugosidad, el metal y
 * la normal que le llegan; barniz y emisión 0). La rellena O2-SUELO en la ola 2: el dibujo de fundición en
 * relieve por normal y lo alto gastado y brillante.
 *
 * La firma es fija: `SuperficieQ superficieFundicionQ(EntradaQ e)`. `superficieQ` la llama sólo con
 * `MATERIA_Q >= 1` (en N0 no se reparten familias). Reglas de la materia (`../glsl.ts`): nada de `dFdx`,
 * `dFdy`, `fwidth` ni `texture()` aquí (las derivadas ya están en `dPdxQ`, `dUvdxQ` y `pxMundoQ`, y la
 * normal sale de `normalPorDerivadasQ`); toda lectura con `textureLod` y un lod de `lodQ`; nada que decida
 * (eso es `hashQ`); y lo que sube de nivel, dentro de su `#if MATERIA_Q >= n`.
 */

/** La familia 9, fundición de tapa. */
export const GLSL_FAMILIA_FUNDICION = /* glsl */ `
SuperficieQ superficieFundicionQ(EntradaQ e) {
  return superficieNeutraQ(e);
}
`;
