/**
 * LA LLANTA Y LA MATRÍCULA: la familia 10 (llanta) de `FAMILIA` (`../familias.ts`). Lo que la lleva: la cara de las
 * ruedas y las matrículas de los coches (`coches.ts`). Las dos se distinguen por la UV. En N1 no hace nada (se
 * pliega en el reparto): todo lo de esta familia lo paga el mobiliario entero, porque `superficieQ` compila todas las
 * familias en el mismo texto, y en N1 no cabía (medido con fxc sobre el mobiliario con la materia cableada); en N1 la
 * rueda y la placa son lo que dicen sus vértices.
 *
 *   · LA RUEDA (N2+): la UV es el disco, (cos, sin) · r, con r = 1 en el canto del neumático. Fuera de r = 0,66, el
 *     flanco del neumático (goma, mate); en el borde de la llanta, el labio; dentro, cinco radios de metal (0,6 de
 *     metal y 0,35 de rugosidad: el acabado de la pieza) con el DISCO OSCURO del freno entre ellos, y el cubo en el
 *     centro. Los radios salen de sen(5θ) en polinomio, sin `atan`, y el primero mira arriba, como los de g4. Desde
 *     g2 el flanco y la llanta tienen su geometría (en g4 también los radios), y esto la pinta igual. g1 (el neumático
 *     en cono y la cara, un tapacubos) sólo va en N0 y N1, donde esto no pinta. Pasado 2 cm de píxel, la llanta en su
 *     gris medio: sin radios que parpadeen.
 *   · LA MATRÍCULA (`v` ≥ 10; N2+ el borde, N3 los caracteres: la ficha los pedía desde N2, y en N2 no cabían en el
 *     tope de fxc del mobiliario): `u` es la semilla del coche más la coordenada de 0 a
 *     1 de izquierda a derecha, y `v − 10` la de abajo arriba. Placa clara con su borde oscuro y SIETE CARACTERES de
 *     un formato INVENTADO (dos letras, cuatro cifras y una letra: no es el de ningún país) en una letra de bloques de
 *     3 × 5, elegidos por el hash entero de la semilla (sin PCG: es adorno) y apagados cuando el píxel pasa de 8 mm.
 *
 * Reglas de la materia (`../glsl.ts`): nada de derivadas ni de `texture()` aquí, nada que decida, y lo que sube de
 * nivel dentro de su `#if MATERIA_Q >= n`. La firma es fija: `SuperficieQ superficieLlantaQ(EntradaQ e)`.
 */

/** Las cifras de la letra de bloques, 3 × 5, fila a fila desde arriba (el bit 14 es la esquina de arriba a la izquierda). */
export const CIFRAS_DE_LA_MATRICULA: readonly number[] = [0x7b6f, 0x2c97, 0x73e7, 0x73cf, 0x5bc9, 0x79cf, 0x79ef, 0x7249, 0x7bef, 0x7bcf];
/** Las letras: B C D F G H J K L N P R S T X Z (las que se leen bien en 3 × 5). */
export const LETRAS_DE_LA_MATRICULA: readonly number[] = [0x6bae, 0x7927, 0x6b6e, 0x79a4, 0x796f, 0x5bed, 0x126f, 0x5bad, 0x4927, 0x6b6d, 0x6ba4, 0x6bad, 0x388e, 0x7492, 0x5aad, 0x72a7];

/** El formato de la matrícula: nueve casillas, L L _ N N N N _ L (L letra, N cifra, _ hueco). */
export const FORMATO_DE_LA_MATRICULA = 'LL NNNN L';

const u32 = (x: number): string => `${String(x)}u`;

/** La familia 10, llanta (y matrícula). */
export const GLSL_FAMILIA_LLANTA = /* glsl */ `
#if MATERIA_Q >= 3
const uint GLIFOS_Q[26] = uint[26](${[...CIFRAS_DE_LA_MATRICULA, ...LETRAS_DE_LA_MATRICULA].map(u32).join(', ')});
/* 1 donde va tinta de un carácter en q (de 0 a 1 en la placa) de la semilla dada; 0 fuera. */
float tintaDeLaMatriculaQ(vec2 q, float semilla) {
  float x = (q.x - 0.1) * 11.25;
  int i = int(floor(x));
  vec2 f = vec2(fract(x) * 1.3 - 0.15, (q.y - 0.2) * 1.6667);
  if (i < 0 || i > 8 || i == 2 || i == 7 || f.x < 0.0 || f.x >= 1.0 || f.y < 0.0 || f.y >= 1.0) return 0.0;
  uint h = uint(semilla) * 2654435761u + uint(i) * 40503u;
  h = (h ^ (h >> 13u)) * 0x5bd1e995u;
  h ^= h >> 15u;
  uint glifo = (i >= 3 && i <= 6) ? GLIFOS_Q[h % 10u] : GLIFOS_Q[10u + h % 16u];
  int bit = 14 - ((4 - int(f.y * 5.0)) * 3 + int(f.x * 3.0));
  return float((glifo >> uint(bit)) & 1u);
}
#endif
SuperficieQ superficieLlantaQ(EntradaQ e) {
  SuperficieQ s = superficieNeutraQ(e);
  #if MATERIA_Q >= 2
  if (e.uv.y > 5.0) {
    /* LA MATRÍCULA: el borde, y en N3 los caracteres. */
    vec2 q = vec2(fract(e.uv.x), e.uv.y - 10.0);
    vec2 b = min(q, 1.0 - q) * vec2(4.7, 1.0);
    float tinta = step(min(b.x, b.y), 0.045);
    #if MATERIA_Q >= 3
    tinta = max(tinta, tintaDeLaMatriculaQ(q, floor(e.uv.x)) * step(pxMundoQ, 0.008));
    #endif
    s.albedo = e.albedo * (1.0 - 0.97 * tinta);
    return s;
  }
  /* LA RUEDA: r = 1 en el canto del neumático; los radios, de sen(5θ) = 16s⁵ − 20s³ + 5s con s = sen θ. */
  float r = length(e.uv);
  float goma = step(0.655, r);
  float sn = e.uv.y / max(r, 1e-4);
  float sn2 = sn * sn;
  float radios = step(0.55, sn * (5.0 + sn2 * (16.0 * sn2 - 20.0))) * step(0.14, r);
  float metal = max(max(step(r, 0.15), step(0.58, r)), radios);
  metal = mix(metal, 0.45, step(0.02, pxMundoQ)) * (1.0 - goma);
  s.albedo = mix(mix(vec3(0.045, 0.043, 0.04), vec3(0.55, 0.56, 0.57), metal), vec3(0.018), goma);
  s.metal = mix(0.3, e.acabado.metal, metal) * (1.0 - goma);
  s.rug = mix(mix(0.6, e.acabado.rug, metal), 0.86, goma);
  #endif
  return s;
}
`;
