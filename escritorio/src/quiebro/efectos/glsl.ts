/**
 * LOS TROZOS DE GLSL QUE COMPARTEN LAS FAMILIAS DE EFECTOS, y la muestra de la Grafía que pueden
 * usar otros frentes (la ciudad, para las fachadas que se transparentan en su rejilla de glifos en
 * el pico del Remanso; el posproceso, para el fogonazo).
 *
 * ═══ POR QUÉ GLSL 3 (WebGL 2) SIN MIEDO ═══
 *
 * Este juego se pinta con el motor del navegador en todas partes, no con expo-gl
 * (`docs/quiebro/ARQUITECTURA.md` §0.2), y three r185 sólo habla WebGL 2: los sombreadores se
 * compilan como GLSL ES 3.00 aunque se escriban con `texture2D` y `gl_FragColor` (three pone los
 * `#define`). Así que aquí hay enteros sin signo para el azar, `textureGrad` y derivadas.
 *
 * ═══ EL AZAR DEL SOMBREADOR ═══
 *
 * Con enteros, no con `fract(sin(x)·43758)`: el seno de la GPU de un móvil no es el de un PC, y
 * con números grandes da bandas. Las constantes son las de «lowbias32» de Chris Wellons
 * (hash-prospector, dominio público), las mismas que `mezclar` de `cuentas.ts`. Las entradas tienen
 * que ser enteros NO NEGATIVOS guardados en `float`: `uint()` de un negativo no está definido.
 *
 * ═══ LA MUESTRA DE LA GRAFÍA ═══
 *
 * `celdaDeGrafia(g, q)` recibe el glifo y la coordenada CONTINUA en celdas (la parte entera dice
 * qué celda de la rejilla del efecto, la fraccionaria dónde dentro de ella), y lee con
 * `textureGrad` y las derivadas de `q`. `tintaDelCampo` convierte el campo en tinta con un borde de
 * un píxel de pantalla, sea cual sea el tamaño del glifo.
 */
import {
  ALCANCE_DEL_CAMPO,
  ALTO_DE_LA_CELDA,
  ANCHO_DE_LA_CELDA,
  COLUMNAS_DEL_ATLAS,
  FILAS_DEL_ATLAS,
  GLIFOS_EN_LA_GRAFIA,
} from './grafia';

/** Un número de TS como literal `float` de GLSL (siempre con punto). */
export function flotante(n: number): string {
  const s = String(n);
  return /[.eE]/.test(s) ? s : `${s}.0`;
}

export const GLSL_AZAR = /* glsl */ `
uint mezclarU(uint x) {
  x ^= x >> 16u;
  x *= 0x7feb352du;
  x ^= x >> 15u;
  x *= 0x846ca68bu;
  x ^= x >> 16u;
  return x;
}
// Un número en [0, 1) a partir de dos enteros guardados en float. El abs() es la red: uint() de un
// negativo no está definido, y una celda con coordenada negativa daría un glifo distinto en cada GPU.
float azar2(float a, float b) {
  uint h = mezclarU(mezclarU(uint(abs(a))) ^ (uint(abs(b)) * 0x9e3779b9u));
  return float(h >> 8u) * (1.0 / 16777216.0);
}
`;

export const GLSL_GRAFIA = /* glsl */ `
uniform sampler2D uGrafia;
const vec2 REJILLA_DEL_ATLAS = vec2(${flotante(COLUMNAS_DEL_ATLAS)}, ${flotante(FILAS_DEL_ATLAS)});
const vec2 TEXELES_DE_LA_CELDA = vec2(${flotante(ANCHO_DE_LA_CELDA)}, ${flotante(ALTO_DE_LA_CELDA)});
// Cuánto cambia el campo (de 0 a 1) por cada téxel del atlas: 1 / (2 · alcance).
const float PASO_DEL_CAMPO = ${flotante(1 / (2 * ALCANCE_DEL_CAMPO))};

// El glifo g (0..47) en la coordenada continua q (en celdas). R trazos, G puntos, B cobertura.
vec4 celdaDeGrafia(float g, vec2 q) {
  float gi = mod(floor(g), ${flotante(GLIFOS_EN_LA_GRAFIA)});
  vec2 celda = vec2(mod(gi, REJILLA_DEL_ATLAS.x), REJILLA_DEL_ATLAS.y - 1.0 - floor(gi / REJILLA_DEL_ATLAS.x));
  vec2 p = clamp(fract(q), 0.0, 1.0);
  return textureGrad(uGrafia, (celda + p) / REJILLA_DEL_ATLAS, dFdx(q) / REJILLA_DEL_ATLAS, dFdy(q) / REJILLA_DEL_ATLAS);
}

// De un campo a tinta, con un borde de un píxel de pantalla. umbral 0.5 = el borde exacto.
float tintaDelCampo(float d, vec2 q, float umbral) {
  vec2 fw = fwidth(q) * TEXELES_DE_LA_CELDA;
  float w = max(0.7 * max(fw.x, fw.y) * PASO_DEL_CAMPO, 0.015);
  return smoothstep(umbral - w, umbral + w, d);
}

// Las mismas dos con las derivadas dadas: para coordenadas que dan la vuelta (el ángulo de un
// anillo salta de 1 a 0 en una costura, y dFdx de ese salto elegiría el mipmap más pequeño).
vec4 celdaDeGrafiaD(float g, vec2 q, vec2 dqx, vec2 dqy) {
  float gi = mod(floor(g), ${flotante(GLIFOS_EN_LA_GRAFIA)});
  vec2 celda = vec2(mod(gi, REJILLA_DEL_ATLAS.x), REJILLA_DEL_ATLAS.y - 1.0 - floor(gi / REJILLA_DEL_ATLAS.x));
  vec2 p = clamp(fract(q), 0.0, 1.0);
  return textureGrad(uGrafia, (celda + p) / REJILLA_DEL_ATLAS, dqx / REJILLA_DEL_ATLAS, dqy / REJILLA_DEL_ATLAS);
}
float tintaDelCampoD(float d, vec2 dqx, vec2 dqy, float umbral) {
  vec2 fw = (abs(dqx) + abs(dqy)) * TEXELES_DE_LA_CELDA;
  float w = max(0.7 * max(fw.x, fw.y) * PASO_DEL_CAMPO, 0.015);
  return smoothstep(umbral - w, umbral + w, d);
}
`;

/**
 * EL FINAL DE TODOS LOS FRAGMENTOS: el mapeo de tonos y el espacio de color del renderizador, como
 * los materiales de three. Sin esto, con `ACESFilmic` en la escena, los efectos saldrían con otro
 * contraste que el resto.
 */
export const GLSL_SALIDA = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

/**
 * LA NIEBLA, pero para lo que SUMA luz. `fog_fragment` de three mezcla hacia el color de la niebla,
 * y en un material aditivo eso AÑADE niebla: un glifo lejano brillaría con el color del aire. Aquí
 * se calcula el mismo factor (niebla lineal o exponencial de la escena) y se APAGA la aportación.
 */
export const GLSL_NIEBLA_PARS_VERTICE = /* glsl */ `
  #include <fog_pars_vertex>
`;
export const GLSL_NIEBLA_VERTICE = /* glsl */ `
  #ifdef USE_FOG
    vFogDepth = - (viewMatrix * vec4(mundo, 1.0)).z;
  #endif
`;
export const GLSL_NIEBLA_PARS_FRAGMENTO = /* glsl */ `
  #include <fog_pars_fragment>
  float nieblaQueApaga() {
    #ifdef USE_FOG
      #ifdef FOG_EXP2
        return 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
      #else
        return smoothstep( fogNear, fogFar, vFogDepth );
      #endif
    #else
      return 0.0;
    #endif
  }
`;

/**
 * LA SILUETA DE UNA PERSONA en 2D, en metros, con los pies en y = 0: cabeza, torso, brazos,
 * piernas y la prenda (sombrero, falda o faldón de gabardina). Negativa dentro. Hecha con círculos,
 * cápsulas y cajas escritas aquí; no es una distancia exacta en las uniones (es una cota), y para
 * recortar una máscara con un borde de dos centímetros no hace falta más.
 *
 * `s` = (alto, medio ancho de hombros, medio ancho de cadera, prenda) — ver `SILUETAS` de `cuentas.ts`.
 */
export const GLSL_SILUETA = /* glsl */ `
float capsula(vec2 p, vec2 a, vec2 b, float r) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h) - r;
}
float caja(vec2 p, vec2 centro, vec2 medio) {
  vec2 d = abs(p - centro) - medio;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}
float silueta(vec2 p, vec4 s) {
  float alto = s.x;
  float hombros = s.y;
  float cadera = s.z;
  float prenda = s.w;
  float yCabeza = alto - 0.115;
  float yHombro = alto * 0.815;
  float yCadera = alto * 0.53;
  float d = length(p - vec2(0.0, yCabeza)) - 0.108;
  d = min(d, caja(p, vec2(0.0, alto * 0.86), vec2(0.045, 0.05)));
  // El torso: ancho que va de la cadera a los hombros.
  float k = clamp((p.y - yCadera) / (yHombro - yCadera), 0.0, 1.0);
  float medio = mix(cadera, hombros, k);
  float torso = max(abs(p.x) - medio, max(yCadera - 0.04 - p.y, p.y - yHombro - 0.03));
  d = min(d, torso);
  // Los brazos, pegados al cuerpo: del hombro a la mano.
  vec2 mano = vec2(cadera + 0.07, yCadera - 0.1);
  d = min(d, capsula(p, vec2(hombros - 0.02, yHombro - 0.02), mano, 0.052));
  d = min(d, capsula(p, vec2(-(hombros - 0.02), yHombro - 0.02), vec2(-mano.x, mano.y), 0.052));
  // Las piernas.
  float xp = cadera * 0.52;
  d = min(d, capsula(p, vec2(xp, yCadera - 0.02), vec2(xp * 1.1, 0.06), 0.072));
  d = min(d, capsula(p, vec2(-xp, yCadera - 0.02), vec2(-xp * 1.1, 0.06), 0.072));
  if (prenda > 0.5 && prenda < 1.5) {
    // Sombrero: ala y copa.
    d = min(d, caja(p, vec2(0.0, alto - 0.03), vec2(0.19, 0.018)));
    d = min(d, caja(p, vec2(0.0, alto + 0.05), vec2(0.105, 0.07)));
  } else if (prenda > 1.5 && prenda < 2.5) {
    // Falda: de la cintura a la rodilla, abriéndose.
    float kf = clamp((yCadera + 0.05 - p.y) / 0.42, 0.0, 1.0);
    float falda = max(abs(p.x) - mix(cadera, cadera + 0.08, kf), max(p.y - yCadera - 0.05, yCadera - 0.4 - p.y));
    d = min(d, falda);
  } else if (prenda > 2.5) {
    // Faldón de la gabardina: de la cintura a media pierna, algo abierto.
    float kg = clamp((yCadera + 0.02 - p.y) / 0.55, 0.0, 1.0);
    float faldon = max(abs(p.x) - mix(cadera + 0.03, cadera + 0.11, kg), max(p.y - yCadera - 0.02, yCadera - 0.56 - p.y));
    d = min(d, faldon);
  }
  return d;
}
`;
