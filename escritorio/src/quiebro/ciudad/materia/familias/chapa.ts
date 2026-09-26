/**
 * LA CHAPA PINTADA Y LA ONDULADA: la familia 7 (chapa pintada) y 8 (chapa ondulada o galvanizada) de
 * `FAMILIA` (`../familias.ts`). Lo que la lleva: el quiosco de prensa, la cabina, la valla de obra, los
 * contenedores de carga, las persianas.
 *
 * Las dos son FILAS de la receta común del mobiliario (`liso.ts`, donde está el porqué y lo que significa cada
 * número); sus ramas no hacen nada más.
 *
 * ═══ LA CHAPA PINTADA (7) ═══
 *
 * Como el hierro: pintada (la superficie dieléctrica; el metal del acabado es el de la chapa desnuda,
 * galvanizada y clara, que asoma en los cantos gastados). N0 la pinta como siempre.
 *
 *   · N1: cada pieza de su tono y el mojado (sólo alisa).
 *   · N2: la MUGRE, al pie (la salpicadura de la acera) y en REGUEROS que bajan de lo alto; el canto gastado
 *     (la marca de chaflán, el acabado `OFICIO.chapaCanto`).
 *   · N3: las PEGATINAS: en las caras verticales, una rejilla de 0,6 × 0,45 m en la UV del molde; en una de cada
 *     cuatro casillas, por hash (`hash2Q`: adorno, no decide nada que otro tenga que saber), una pegatina de
 *     tamaño, sitio y color suyos. Su borde se suaviza con la huella del píxel y se funde en su media cuando el
 *     píxel pasa de 3 cm: de lejos no centellean.
 *
 * ═══ LA ONDULADA (8) ═══
 *
 *   · La ONDA, sin geometría: a lo largo de `u` (la chapa de un contenedor: la onda en vertical, de 20 cm) o, con
 *     la marca de chaflán (el acabado `OFICIO.persiana`), a lo largo de `v` (las LAMAS de una persiana,
 *     horizontales, de 12 cm: el dibujo de las persianas de las fachadas). En N1 sólo en el color (el hondo
 *     oscuro); desde N2, también en la normal. Se aplana cuando el píxel pasa de un cuarto de onda: sin moaré.
 *   · N1: el tono y el mojado; N2: la mugre al pie y en regueros.
 *
 * La capa 4 del horno (metal pintado), en las dos.
 *
 * La firma es fija: `SuperficieQ superficieChapaQ(EntradaQ e)` y `SuperficieQ
 * superficieChapaOnduladaQ(EntradaQ e)`. `superficieQ` la llama sólo con `MATERIA_Q >= 1` (en N0 no se
 * reparten familias). Reglas de la materia (`../glsl.ts`): nada de `dFdx`, `dFdy`, `fwidth` ni `texture()`
 * aquí (las derivadas ya están en `dPdxQ`, `dUvdxQ` y `pxMundoQ`, y la normal sale de
 * `normalPorDerivadasQ`); toda lectura con `textureLod` y un lod de `lodQ`; nada que decida (eso es
 * `hashQ`); y lo que sube de nivel, dentro de su `#if MATERIA_Q >= n`.
 */
import type { RecetaDeLaFamilia } from './liso';

/** La receta de la chapa pintada (ver `liso.ts`). */
export const RECETA_DE_LA_CHAPA: RecetaDeLaFamilia = [
  [0.36, 0, 0.1, 1],
  [0, 0, 0, 0],
  [0.5, 0.3, 0, 0.6],
  [0, 0.25, 0.2, 4],
];

/** La receta de la chapa ondulada (ver `liso.ts`). */
export const RECETA_DE_LA_ONDULADA: RecetaDeLaFamilia = [
  [0.36, 0, 0.1, 0],
  [0, 0, 0, 0],
  [0.5, 0, 31.4, 0.3],
  [0, 0, 0, 4],
];

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
