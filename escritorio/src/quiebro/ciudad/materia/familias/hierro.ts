/**
 * EL HIERRO FUNDIDO PINTADO: la familia 1 (hierro fundido pintado) de `FAMILIA` (`../familias.ts`). Lo que
 * la lleva: farolas, bancos, rejas, la cabina.
 *
 * Es una FILA de la receta común del mobiliario (`liso.ts`, donde está el porqué y lo que significa cada número);
 * su rama no hace nada más.
 *
 *   · PINTADO (pintura 1): la superficie es dieléctrica, con la rugosidad del acabado; el METAL del acabado es el
 *     del hierro DESNUDO, que sólo asoma donde la pintura salta. N0, que no reparte familias, lo pinta como
 *     siempre (metálico y oscuro).
 *   · N1: cada pieza de su tono (la pintura vieja más o menos brillante) y el mojado, que apenas oscurece.
 *   · N2: la piel de la fundición (el grano a 300 téxeles por metro, en la normal, con la rugosidad filtrada por
 *     la mip), la mugre al pie y el DESCONCHÓN: en las caras con la marca de chaflán
 *     (`Molde.cajaBiselada({ alChaflan })`, el acabado `OFICIO.hierroCanto`) la pintura salta a trozos de 3 a
 *     6 cm, pocos y de borde roto, y deja el hierro desnudo: gris de 0,3 (no el 0,045 de la primera versión, que
 *     sobre una pintura casi negra no se distinguía de ella). La pintura de las piezas del mobiliario ya no es
 *     casi negra (`mobiliario.ts`: `VERDE_DE_FUNDICION` y compañía).
 *   · N3: el ÓXIDO que chorrea, en regueros finos y más al pie (0,45: con 0,7 eran manchas naranjas que de lejos
 *     parecían un resplandor), y lo desnudo, algo oxidado.
 *   · La capa 4 del horno (metal pintado).
 *
 * La firma es fija: `SuperficieQ superficieHierroQ(EntradaQ e)`. `superficieQ` la llama sólo con `MATERIA_Q
 * >= 1` (en N0 no se reparten familias). Reglas de la materia (`../glsl.ts`): nada de `dFdx`, `dFdy`,
 * `fwidth` ni `texture()` aquí (las derivadas ya están en `dPdxQ`, `dUvdxQ` y `pxMundoQ`, y la normal sale
 * de `normalPorDerivadasQ`); toda lectura con `textureLod` y un lod de `lodQ`; nada que decida (eso es
 * `hashQ`); y lo que sube de nivel, dentro de su `#if MATERIA_Q >= n`.
 */
import type { RecetaDeLaFamilia } from './liso';

/** La receta del hierro (ver `liso.ts`). */
export const RECETA_DEL_HIERRO: RecetaDeLaFamilia = [
  [0.45, 0, 0.15, 1],
  [300, 300, 0.00025, 0.1],
  [0.4, 1, 0, 0],
  [0.45, 0, 0.3, 4],
];

/** La familia 1, hierro fundido pintado. */
export const GLSL_FAMILIA_HIERRO = /* glsl */ `
SuperficieQ superficieHierroQ(EntradaQ e) {
  return superficieNeutraQ(e);
}
`;
