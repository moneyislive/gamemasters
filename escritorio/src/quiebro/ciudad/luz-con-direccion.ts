/**
 * LA LUZ DE LA CALLE CON DIRECCIÓN: lo único que hace leer el relieve de una fachada de noche.
 *
 * ═══ POR QUÉ HACE FALTA ═══
 *
 * De noche la fachada la ilumina el mapa horneado de la luz de la calle (`luzDeLaCalleQ`, `glsl.ts`), que el retoque
 * `entorno` mete en la IRRADIANCIA de three: una luz sin dirección, igual para una normal que para otra. Las luces
 * puntuales de verdad (N2+) sólo ponen brillo (`solo-brillo`, `retoques.ts`). Así que el relieve de la fábrica
 * (juntas, chaflanes, piezas torcidas: `fachada/glsl-muro.ts`) sólo se veía en la oclusión y en el reflejo: bajo la
 * farola, un muro de sillares era un muro pintado.
 *
 * ═══ CÓMO ═══
 *
 * Dos lecturas más del mapa, a ±1,5 m a lo largo de la fachada, dicen de qué lado viene más luz; la altura dice si
 * viene de arriba (la farola cuelga a unos 6 m) o de abajo (por encima de ella). Con eso sale una SEUDOLUZ: una
 * dirección, y la media de las dos lecturas como su intensidad. La difusa horneada se MODULA con ella: se le suma
 * `media · (n·L / ng·L − 1)`, lo que la cara del relieve gana o pierde frente a la pared lisa (en la pared lisa, 0;
 * nada cambia donde no hay relieve). En N3, además, el brillo especular de esa seudoluz sobre el CHAFLÁN de las
 * juntas (sólo lo que añade al de la pared lisa, que ya lo ponen las luces de verdad; sin el grano ni los recercos,
 * y ancho: ver la función).
 *
 *   N1  a menos de 30 m (se va entre 24 y 30);
 *   N2  siempre;
 *   N3  siempre, y con su brillo.
 *   N0  nada (ni el texto: `#if NIVEL_Q >= 1`).
 *
 * Sólo la fachada: el retoque lo pone `materialDeFachada`, y el cuerpo de la fachada (`fachada/glsl-cuerpo.ts`)
 * llama a `luzConDireccionQ` con su normal ya torcida. Se apaga con la Grafía (el último argumento).
 *
 * ═══ DÓNDE VA EL TEXTO ═══
 *
 *   - La función y sus dos globales, antes de `#include <clipping_planes_pars_fragment>`: es lo último antes de
 *     `main`, detrás de `luzDeLaCalleQ` (que `entorno` pone tras `#include <lights_pars_begin>`).
 *   - Lo que suma a la luz, antes de `#include <lights_fragment_end>`: detrás de la irradiancia de three y de la de
 *     `entorno` (el orden entre las dos sumas da igual), y antes de que three la convierta en difusa.
 *
 * Lee `uLuzCalle` dos veces más (N1+): son las «+2 lecturas» del presupuesto de la ficha de PAREDES.
 */
import type { Retoque } from '../atmosfera/parcheo';

/** La función de la seudoluz y lo que deja para después de la luz. */
export const GLSL_DE_LA_LUZ_CON_DIRECCION = /* glsl */ `
#if NIVEL_Q >= 1
/* Lo que la seudoluz pone o quita a la difusa horneada, y (N3) el brillo que el relieve añade. */
vec3 luzExtraQ = vec3(0.0);
vec3 brilloExtraQ = vec3(0.0);
/*
 * p, ng, t: el punto, la normal y la tangente de la pared lisa; n: la normal con el relieve; nJ: la normal con SÓLO
 * el chaflán de las juntas (para el brillo, N3); v: hacia la cámara; rug: la rugosidad; dist: a la cámara; peso: 1,
 * o 0 bajo la Grafía.
 */
void luzConDireccionQ(vec3 p, vec3 ng, vec3 t, vec3 n, vec3 nJ, vec3 v, float rug, float dist, float peso) {
  #if NIVEL_Q == 1
  peso *= 1.0 - smoothstep(24.0, 30.0, dist);
  if (peso <= 0.0) return;
  #endif
  vec3 a = luzDeLaCalleQ(p - t * 1.5, ng);
  vec3 b = luzDeLaCalleQ(p + t * 1.5, ng);
  vec3 media = 0.5 * (a + b);
  float la = dot(a, vec3(0.3, 0.59, 0.11));
  float lb = dot(b, vec3(0.3, 0.59, 0.11));
  /* De qué lado viene (−1 … 1) y si de arriba o de abajo (la farola, a unos 6 m). */
  float lado = (lb - la) / max(la + lb, 1e-4);
  float arriba = clamp((5.8 - p.y) * 0.35, -0.8, 1.2);
  /*
   * RASANTE: la farola ilumina la pared de refilón (la de pared está a un palmo; la de la acera, a metro y medio y
   * seis de alto), así que la seudoluz va más a lo largo del muro que hacia fuera. Con la normal de la pared de peso
   * 0,9 caía casi de frente y el chaflán de las juntas no ganaba ni perdía nada: bajo la farola de la C, un muro pintado.
   */
  vec3 L = normalize(ng * 0.45 + t * (lado * 1.4) + vec3(0.0, arriba, 0.0));
  float liso = max(dot(ng, L), 0.2);
  /*
   * Lo que gana o pierde la cara torcida frente a la lisa: de un tercio a casi el doble, y a un 75 %. El chaflán que
   * mira a la farola se enciende y el que le da la espalda se apaga: el relieve se lee de noche. (Con la mitad y vez y
   * media al 70 %, y la luz de frente, no se leía.)
   */
  luzExtraQ = media * (clamp(max(dot(n, L), 0.0) / liso, 0.35, 1.9) - 1.0) * 0.75 * peso;
  #if NIVEL_Q >= 3
  /*
   * El brillo de la seudoluz: Blinn-Phong normalizado, y sólo lo que el CHAFLÁN de las juntas añade (nJ), con una
   * rugosidad de al menos 0,6 (la seudoluz es la calle entera, una fuente ancha). Con la normal de todo el relieve
   * (el grano, el poro, los recercos) y la rugosidad del muro, el grano encendía manchas sueltas cortadas por las
   * juntas y los recercos, un punteado: brillos rotos (la revisión 1, C de N3 de madrugada).
   */
  vec3 h = normalize(L + v);
  float rB = max(rug, 0.6);
  float a2 = rB * rB;
  float s = 2.0 / (a2 * a2) - 2.0;
  float fresnel = 0.04 + 0.96 * pow(1.0 - max(dot(v, h), 0.0), 5.0);
  float conRelieve = pow(max(dot(nJ, h), 0.0), s) * max(dot(nJ, L), 0.0);
  float sinRelieve = pow(max(dot(ng, h), 0.0), s) * max(dot(ng, L), 0.0);
  brilloExtraQ = media * max(conRelieve - sinRelieve, 0.0) * (s + 2.0) * 0.125 * fresnel * peso;
  #endif
}
#endif
`;

/** Lo que se suma a la luz de three, antes de que la convierta en difusa. */
export const GLSL_DE_LA_LUZ_CON_DIRECCION_EN_LA_LUZ = /* glsl */ `
#if NIVEL_Q >= 1
irradiance += luzExtraQ;
reflectedLight.directSpecular += brilloExtraQ;
#endif
`;

/**
 * EL RETOQUE de la luz con dirección, para la fachada (ver la cabecera). Su texto no depende del nivel (lo decide
 * `NIVEL_Q`, que pone el retoque de la fachada), así que su nombre tampoco.
 */
export const RETOQUE_DE_LA_LUZ_CON_DIRECCION: Retoque = {
  nombre: 'luz-con-direccion',
  orden: 12,
  fragmento: [
    { buscar: '#include <clipping_planes_pars_fragment>', como: 'antes', texto: GLSL_DE_LA_LUZ_CON_DIRECCION },
    { buscar: '#include <lights_fragment_end>', como: 'antes', texto: GLSL_DE_LA_LUZ_CON_DIRECCION_EN_LA_LUZ },
  ],
};
