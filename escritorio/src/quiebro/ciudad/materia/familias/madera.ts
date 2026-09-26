/**
 * LA MADERA: la familia 2 (madera) de `FAMILIA` (`../familias.ts`). Lo que la lleva: los listones del
 * banco, el mostrador del quiosco, la carretilla.
 *
 * Es una FILA de la receta común del mobiliario (`liso.ts`, donde está el porqué y lo que significa cada número);
 * su rama no hace nada más.
 *
 * ═══ LA VETA VA A LO LARGO DE `u` ═══
 *
 * El molde escribe la UV en metros, y en un listón `u` es su largo: en `caja` y `losa` por el convenio de la
 * cabecera de `geometria.ts` (una pieza local a lo largo de x), y en `perfil` porque `u` corre a lo largo de
 * la extrusión. La veta es el grano estirado: 25 téxeles por metro a lo largo y 420 a través. El grano de la
 * textura tiene celdas de 16, 8 y 4 téxeles (`ruido.ts`): a través, bandas de unos 4 cm y líneas de 1 cm, que
 * en un listón de 7,5 cm se leen como veta; a lo largo, las líneas se tuercen y se cortan cada 16-64 cm. Con 60
 * a través (la primera versión) la celda fina era de 7 cm y el listón entero caía en una sola, liso como
 * plástico; con 3 a lo largo, las líneas eran rectas y se confundían con el sombreado del listón redondeado. La
 * mota (2) es alta porque el grano se queda cerca de su media (del percentil 5 al 95, 0,23-0,74): la veta
 * oscurece y aclara un ±50 %. De noche lo que más se ve del listón es el reflejo del cielo falso, y la veta se
 * lee sobre todo en él: el relieve (1,5 mm) quiebra el brillo en hilos, y lo oscuro del grano es más liso (la
 * receta lo pasa a la rugosidad). A partir de 3 m la mip la funde en su media, sin centelleo.
 *
 *   · N1: cada listón de su tono, el GRIS DE INTEMPERIE (la madera vieja se agrisa, más arriba, donde le da la
 *     lluvia) y, si llueve, más oscura (el mojado con poro 1; lo liso del mojado lo pone el cuerpo del
 *     mobiliario en lo que mira arriba).
 *   · N2: la VETA en el color, en la normal y en la rugosidad, y el canto PULIDO (la marca de chaflán, el acabado
 *     `OFICIO.maderaCanto`): más claro y más liso, donde se sienta la gente.
 *   · La capa 5 del horno (madera).
 *
 * La firma es fija: `SuperficieQ superficieMaderaQ(EntradaQ e)`. `superficieQ` la llama sólo con `MATERIA_Q
 * >= 1` (en N0 no se reparten familias). Reglas de la materia (`../glsl.ts`): nada de `dFdx`, `dFdy`,
 * `fwidth` ni `texture()` aquí (las derivadas ya están en `dPdxQ`, `dUvdxQ` y `pxMundoQ`, y la normal sale
 * de `normalPorDerivadasQ`); toda lectura con `textureLod` y un lod de `lodQ`; nada que decida (eso es
 * `hashQ`); y lo que sube de nivel, dentro de su `#if MATERIA_Q >= n`.
 */
import type { RecetaDeLaFamilia } from './liso';

/** La receta de la madera (ver `liso.ts`). */
export const RECETA_DE_LA_MADERA: RecetaDeLaFamilia = [
  [0.56, 0.25, 1, 0],
  [25, 420, 0.0015, 2],
  [0.15, -1, 0, 0],
  [0, 0, 0, 5],
];

/** La familia 2, madera. */
export const GLSL_FAMILIA_MADERA = /* glsl */ `
SuperficieQ superficieMaderaQ(EntradaQ e) {
  return superficieNeutraQ(e);
}
`;
