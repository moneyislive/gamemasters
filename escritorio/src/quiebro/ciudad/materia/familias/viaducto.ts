/**
 * EL HORMIGÓN DEL VIADUCTO: la familia 14 (hormigón del viaducto) de `FAMILIA` (`../familias.ts`). Lo que
 * la lleva: pilares y vigas del Elevado.
 *
 * STUB DE LA OLA 1: devuelve su entrada tal cual (`superficieNeutraQ`: el albedo, la rugosidad, el metal y
 * la normal que le llegan; barniz y emisión 0). La rellena O2-VEHICULOS en la ola 2: los chorretones bajo
 * las juntas y los apoyos.
 *
 * La firma es fija: `SuperficieQ superficieViaductoQ(EntradaQ e)`. `superficieQ` la llama sólo con
 * `MATERIA_Q >= 1` (en N0 no se reparten familias). Reglas de la materia (`../glsl.ts`): nada de `dFdx`,
 * `dFdy`, `fwidth` ni `texture()` aquí (las derivadas ya están en `dPdxQ`, `dUvdxQ` y `pxMundoQ`, y la
 * normal sale de `normalPorDerivadasQ`); toda lectura con `textureLod` y un lod de `lodQ`; nada que decida
 * (eso es `hashQ`); y lo que sube de nivel, dentro de su `#if MATERIA_Q >= n`.
 */

/** La familia 14, hormigón del viaducto. */
export const GLSL_FAMILIA_VIADUCTO = /* glsl */ `
SuperficieQ superficieViaductoQ(EntradaQ e) {
  return superficieNeutraQ(e);
}
`;
