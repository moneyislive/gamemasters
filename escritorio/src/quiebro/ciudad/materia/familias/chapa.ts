/**
 * LA CHAPA PINTADA Y LA ONDULADA: la familia 7 (chapa pintada) y 8 (chapa ondulada o galvanizada) de
 * `FAMILIA` (`../familias.ts`). Lo que la lleva: el quiosco de prensa, la valla de obra, los contenedores
 * de carga.
 *
 * STUB DE LA OLA 1: devuelve su entrada tal cual (`superficieNeutraQ`: el albedo, la rugosidad, el metal y
 * la normal que le llegan; barniz y emisión 0). La rellena O2-MOBILIARIO en la ola 2: la suciedad al pie y
 * las pegatinas por hash (N3); en la ondulada, la onda por normal.
 *
 * La firma es fija: `SuperficieQ superficieChapaQ(EntradaQ e)` y `SuperficieQ
 * superficieChapaOnduladaQ(EntradaQ e)`. `superficieQ` la llama sólo con `MATERIA_Q >= 1` (en N0 no se
 * reparten familias). Reglas de la materia (`../glsl.ts`): nada de `dFdx`, `dFdy`, `fwidth` ni `texture()`
 * aquí (las derivadas ya están en `dPdxQ`, `dUvdxQ` y `pxMundoQ`, y la normal sale de
 * `normalPorDerivadasQ`); toda lectura con `textureLod` y un lod de `lodQ`; nada que decida (eso es
 * `hashQ`); y lo que sube de nivel, dentro de su `#if MATERIA_Q >= n`.
 */

/** La familia 7, chapa pintada. */
export const GLSL_FAMILIA_CHAPA = /* glsl */ `
SuperficieQ superficieChapaQ(EntradaQ e) {
  return superficieNeutraQ(e);
}
`;

/** La familia 8, chapa ondulada o galvanizada. */
export const GLSL_FAMILIA_CHAPA_ONDULADA = /* glsl */ `
SuperficieQ superficieChapaOnduladaQ(EntradaQ e) {
  return superficieNeutraQ(e);
}
`;
