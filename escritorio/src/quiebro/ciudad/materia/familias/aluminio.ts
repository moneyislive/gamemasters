/**
 * EL ALUMINIO ESTRIADO: la familia 12 (aluminio estriado) de `FAMILIA` (`../familias.ts`). Lo que la lleva: la caja
 * del tren del Elevado (`tren.ts`), con metal 0,35 y rugosidad 0,35 (su acabado): con difusa, coge la luz de la
 * calle como una fachada, y de madrugada el tren ya no se ve negro.
 *
 *   · N1: nada más que su acabado (el reparto la pliega: todo lo de esta familia lo paga el mobiliario entero).
 *   · N2+: las ESTRÍAS del costado, una onda de 2 mm cada 4,5 cm por normal, en las dos bandas de chapa acanalada
 *     (debajo de las ventanas y encima de ellas); pasado 2 cm de píxel se apagan y dejan su rugosidad (el brillo no
 *     centellea de lejos).
 *
 * La roña de abajo va en el color de los vértices (`tren.ts`), que no le cuesta nada al sombreador. La UV del tren
 * es (x del coche, altura del coche): la altura no se mueve con
 * el temblor, y las estrías no bailan. Como el tren va siempre derecho, la pendiente de la onda es vertical en el
 * mundo, y la normal se inclina con `normalPorGradienteQ` (sin derivadas).
 *
 * Reglas de la materia (`../glsl.ts`): nada de derivadas ni de `texture()` aquí, nada que decida, y lo que sube de
 * nivel dentro de su `#if MATERIA_Q >= n`. La firma es fija: `SuperficieQ superficieAluminioQ(EntradaQ e)`.
 */

/** Las bandas estriadas del costado del coche (alturas del coche, en metros) y la onda. */
export const ESTRIAS_DEL_TREN = { bandas: [[0.95, 1.45], [2.5, 2.72]] as const, paso: 0.045, hondo: 0.002 };

const n = (x: number): string => x.toFixed(3);
const [b0, b1] = ESTRIAS_DEL_TREN.bandas;

/** La familia 12, aluminio estriado. */
export const GLSL_FAMILIA_ALUMINIO = /* glsl */ `
SuperficieQ superficieAluminioQ(EntradaQ e) {
  SuperficieQ s = superficieNeutraQ(e);
  #if MATERIA_Q >= 2
  float v = e.uv.y;
  float banda = (step(${n(b0[0])}, v) - step(${n(b0[1])}, v) + step(${n(b1[0])}, v) - step(${n(b1[1])}, v)) * step(abs(e.n.y), 0.6);
  float nitido = step(pxMundoQ, 0.02);
  /* La onda h = hondo · sen(2π v / paso): su pendiente, en vertical. */
  float pendiente = ${n((ESTRIAS_DEL_TREN.hondo * 2 * Math.PI) / ESTRIAS_DEL_TREN.paso)} * cos(v * ${n((2 * Math.PI) / ESTRIAS_DEL_TREN.paso)}) * banda * nitido;
  s.n = normalPorGradienteQ(e.n, vec3(0.0, pendiente, 0.0), 1.0);
  s.rug += 0.12 * banda * (1.0 - nitido);
  #endif
  return s;
}
`;
