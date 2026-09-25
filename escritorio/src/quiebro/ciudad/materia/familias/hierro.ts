/**
 * EL HIERRO FUNDIDO PINTADO: la familia 1 (hierro fundido pintado) de `FAMILIA` (`../familias.ts`). Lo que
 * la lleva: farolas, bancos, rejas, la cabina.
 *
 * STUB DE LA OLA 1: devuelve su entrada tal cual (`superficieNeutraQ`: el albedo, la rugosidad, el metal y
 * la normal que le llegan; barniz y emisión 0). La rellena O2-MOBILIARIO en la ola 2: el desconchón en los
 * chaflanes (bit `chaflan` del acabado) y el óxido que chorrea (N2-N3).
 *
 * La firma es fija: `SuperficieQ superficieHierroQ(EntradaQ e)`. `superficieQ` la llama sólo con `MATERIA_Q
 * >= 1` (en N0 no se reparten familias). Reglas de la materia (`../glsl.ts`): nada de `dFdx`, `dFdy`,
 * `fwidth` ni `texture()` aquí (las derivadas ya están en `dPdxQ`, `dUvdxQ` y `pxMundoQ`, y la normal sale
 * de `normalPorDerivadasQ`); toda lectura con `textureLod` y un lod de `lodQ`; nada que decida (eso es
 * `hashQ`); y lo que sube de nivel, dentro de su `#if MATERIA_Q >= n`.
 */

/** La familia 1, hierro fundido pintado. */
export const GLSL_FAMILIA_HIERRO = /* glsl */ `
SuperficieQ superficieHierroQ(EntradaQ e) {
  return superficieNeutraQ(e);
}
`;
