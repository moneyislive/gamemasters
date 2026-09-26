/**
 * EL FOLLAJE: la familia 13 (follaje) de `FAMILIA` (`../familias.ts`). Lo que la lleva: el árbol del Bulevar
 * (`piezas.ts`), la copa y la madera, que son dos cosas y una sola familia.
 *
 *   · LA HOJA (el color de entrada es VERDE: el verde pasa al rojo y al azul). Los grumos de la copa son
 *     icosaedros con normales esféricas: de cerca, una bola lisa. Aquí se rompen en RACIMOS de hoja (a unos 40 cm por
 *     racimo: aclara y amarillea el verde por fuera, lo oscurece por dentro y le cambia la rugosidad). Desde N2, la
 *     HOJA SUELTA (un `granoT` de unos 6 cm que aclara y oscurece cada hoja) y los HUECOS OSCUROS SIN TRANSPARENCIA
 *     (donde el racimo es más oscuro, el albedo cae al 40 %: se ve «lo de dentro» de la copa sin `discard` ni
 *     mezcla, y sin otra lectura); en N3, además, cada hoja torcida (el mismo `granoT` en la normal): la farola la
 *     pinta a trozos, como pinta una copa de verdad.
 *   · LA CORTEZA DEL PLÁTANO (lo demás: el tronco y las ramas). Las placas que se desprenden del plátano de sombra:
 *     manchas crema verdoso sobre el gris oliva, del mismo ruido leído en la UV del torno (u alrededor, v a lo alto,
 *     en metros); y en N3, el relieve de las placas en la normal.
 *
 * Un solo ruido y un solo `granoT` para las dos: se elige DÓNDE se leen (y a qué escala) antes de leer, y lo que
 * cambia entre hoja y corteza es la cuenta de después. Lecturas en el peor camino: N1 1 (un `ruidoT`), N2 4 (un
 * `fbmT` de 3 octavas y el `granoT`), N3 6 (4 octavas, y el `granoT` lee dos veces); ningún PCG. Nada decide: el
 * sitio de cada grumo y su verde vienen del JS (`piezas.ts`, por hash). Lo que cuesta, medido con fxc (`ps_5_0 /O3`)
 * sobre el HLSL de ANGLE del mobiliario de prueba que ya reparte familias (`materia/prueba.ts`), contra el mismo con
 * esta familia en stub: +88 / +131 / +188 instrucciones en N1 / N2 / N3 (con lo que la primera familia de verdad
 * despierta del reparto, que las demás ya no pagan).
 *
 * La UV de los grumos es una proyección de la posición de mundo, (x + 0,7·y, z − 0,5·y), lineal: se interpola sin
 * error, no se estira más que la proyección, y el ruido queda quieto en el mundo (no nada con la cámara).
 *
 * La firma es fija: `SuperficieQ superficieFollajeQ(EntradaQ e)`. `superficieQ` la llama sólo con
 * `MATERIA_Q >= 1` (en N0 no se reparten familias: la hoja y la corteza de N0 son el color por vértice, con la
 * oclusión horneada en él). Reglas de la materia (`../glsl.ts`): nada de `dFdx`, `dFdy`, `fwidth` ni `texture()`
 * aquí (las derivadas ya están en `dPdxQ`, `dUvdxQ` y `pxMundoQ`, y la normal sale de `normalPorDerivadasQ`); toda
 * lectura con `textureLod` y un lod de `lodQ`; nada que decida (eso es `hashQ`); y lo que sube de nivel, dentro de
 * su `#if MATERIA_Q >= n`.
 */

/** La familia 13, follaje. */
export const GLSL_FAMILIA_FOLLAJE = /* glsl */ `
SuperficieQ superficieFollajeQ(EntradaQ e) {
  SuperficieQ s = superficieNeutraQ(e);
  #if MATERIA_Q >= 1
  float hoja = step(max(e.albedo.r, e.albedo.b) * 1.04, e.albedo.g);
  /* Racimos de unos 40 cm en la hoja; placas de un palmo en la corteza (la u da la vuelta al tronco en metros). */
  vec2 escala = mix(vec2(6.5, 5.0), vec2(2.4, 2.4), hoja);
  vec2 q = e.uv * escala + vec2(13.7, 5.1) * hoja;
  #if MATERIA_Q >= 2
  float n = fbmT(q, lodQ(max(escala.x, escala.y)));
  #else
  float n = ruidoT(q, lodQ(max(escala.x, escala.y)));
  #endif
  /* La corteza: gris oliva con placas crema verdoso donde el ruido sube. La hoja: el verde de cada racimo, más claro
     y amarillo por fuera, más oscuro por dentro. Un solo tinte para las dos. */
  float placa = smoothstep(0.53, 0.6, n);
  s.albedo = e.albedo * mix(mix(vec3(0.85, 0.9, 0.8), vec3(1.75, 1.9, 1.75), placa), mix(vec3(0.62, 0.66, 0.7), vec3(1.3, 1.24, 1.0), n), hoja);
  s.rug = mix(mix(0.92, 0.7, placa), mix(0.82, 0.55, n), hoja);
  #if MATERIA_Q >= 2
  /* El grano: la hoja suelta (unos 6 cm: aclara y oscurece cada hoja y la tuerce) o el canto de cada placa. */
  float frecuencia = mix(7.0, 16.0, hoja);
  float lodG = lodQ(frecuencia);
  vec3 g = granoT(e.uv * frecuencia, lodG);
  /* Los huecos de la copa: donde el racimo es más oscuro, lo oscuro de dentro (sólo en la hoja, sin otra lectura). */
  float hueco = hoja * (1.0 - smoothstep(0.3, 0.37, n));
  s.albedo *= mix(1.0, (0.55 + 0.8 * g.x) * (1.0 - 0.6 * hueco), hoja);
  #if MATERIA_Q >= 3
  /* El alto del grano, en metros: con su gradiente, una pendiente de unos 0,3 en la hoja y de 0,07 en la corteza. */
  s.n = normalPorDerivadasQ(e.n, g.yz * frecuencia, mix(0.03, 0.05, hoja) * (1.0 - hueco));
  s.rug = rugosidadFiltradaQ(s.rug, varianzaPerdidaQ(lodG) * 0.5);
  #endif
  #endif
  #endif
  return s;
}
`;
