/**
 * EL MURO SIN HUECOS (`muroQ`): la fábrica de cada estilo —sillería, ladrillo, hormigón, vidrio, azulejo y
 * revoco— con sus juntas y su color, y la rugosidad por el último argumento. Lo llaman el cuerpo (el muro de
 * todas las caras que no son azotea ni barandilla, en `glsl-piezas.ts`) y el fondo del hueco (`glsl-hueco.ts`).
 *
 * Usa `lineaQ` (`glsl-comun.ts`), `hashQ`, `ruidoQ` y `fbmQ` (`GLSL_RUIDO`, `glsl.ts`) y el define `NIVEL_Q`
 * (el retoque de `fachadas.ts`). No usa ninguna variable del cuerpo: es una función.
 */
/** `muroQ`: el tercer tramo, detrás de `GLSL_COMUN_DE_LA_FACHADA`. */
export const GLSL_DEL_MURO = /* glsl */ `
/* El muro sin huecos: devuelve el albedo, y la rugosidad sale por el último argumento. */
vec3 muroQ(int estilo, vec2 q, float tinte, float semilla, float vano, float pb, float hp, vec2 px, out float rugosidad) {
  rugosidad = 0.88;
  if (estilo == 0) {
    /* Sillería de caliza: hiladas de 0,5 m, piezas de 1,1 a matajuntas, llagas finas. */
    float fila = floor(q.y / 0.5);
    float x = q.x + mod(fila, 2.0) * 0.55;
    float j = max(lineaQ(q.y, 0.5, 0.012, px.y), lineaQ(x, 1.1, 0.012, px.x));
    float pieza = hashQ(vec2(floor(x / 1.1), fila), semilla + 3.0);
    vec3 base = tinte < 0.4 ? vec3(0.48, 0.45, 0.38) : tinte < 0.7 ? vec3(0.44, 0.43, 0.40) : vec3(0.5, 0.44, 0.35);
    /* La llaga, apenas: con un 30 % más oscura la sillería era una cuadrícula dibujada. */
    return base * (0.92 + 0.14 * pieza) * (1.0 - 0.1 * j);
  }
  if (estilo == 1) {
    vec2 b = vec2(0.25, 0.075);
    float fila = floor(q.y / b.y);
    float x = q.x + mod(fila, 2.0) * b.x * 0.5;
    float j = max(lineaQ(q.y, b.y, 0.012, px.y), lineaQ(x, b.x, 0.012, px.x));
    float pieza = hashQ(vec2(floor(x / b.x), fila), semilla + 5.0);
    /* Ladrillo viejo y sucio, no rojo de catálogo: saturado, bajo la luz cálida, salía naranja. */
    vec3 ladrillo = tinte < 0.6
      ? mix(vec3(0.2, 0.085, 0.055), vec3(0.27, 0.13, 0.085), pieza)
      : mix(vec3(0.34, 0.26, 0.16), vec3(0.41, 0.32, 0.21), pieza);
    vec3 mortero = vec3(0.21, 0.2, 0.18);
    float lejos = smoothstep(b.y / 6.0, b.y / 3.0, px.y);
    ladrillo = mix(ladrillo, mix(ladrillo, mortero, 0.15), lejos);
    return mix(ladrillo, mortero, j * 0.45);
  }
  if (estilo == 2) {
    float j = max(lineaQ(q.x, vano, 0.025, px.x), lineaQ(q.y - pb, hp, 0.025, px.y));
    vec3 base = vec3(0.27, 0.27, 0.26) * (0.8 + 0.35 * tinte);
    base *= 0.82 + 0.3 * fbmQ(q * vec2(0.5, 0.09) + semilla * 0.01);
    return base * (1.0 - 0.18 * j);
  }
  if (estilo == 3) {
    rugosidad = 0.1;
    return vec3(0.012, 0.016, 0.02) + vec3(0.0, 0.004, 0.006) * tinte;
  }
  if (estilo == 5) {
    /*
     * Placa cerámica vidriada de 60 × 30 cm a matajuntas: brilla, y cada pieza tiene su tono. Era un
     * azulejo de 15 cm con la junta clara: de lejos, un cuarto de baño.
     */
    vec2 b = vec2(0.6, 0.3);
    float fila = floor(q.y / b.y);
    float x = q.x + mod(fila, 2.0) * b.x * 0.5;
    float j = max(lineaQ(q.y, b.y, 0.006, px.y), lineaQ(x, b.x, 0.006, px.x));
    vec2 celda = vec2(floor(x / b.x), fila);
    vec3 a = tinte < 0.3 ? vec3(0.13, 0.17, 0.22) : tinte < 0.55 ? vec3(0.12, 0.19, 0.17) : tinte < 0.8 ? vec3(0.34, 0.29, 0.2) : vec3(0.42, 0.42, 0.4);
    float lejos = smoothstep(0.02, 0.05, px.y);
    vec3 teja = a * (0.9 + 0.16 * hashQ(celda, semilla + 7.0) * (1.0 - lejos));
    rugosidad = 0.2;
    return mix(teja, teja * 1.15 + 0.01, j * 0.35 * (1.0 - lejos));
  }
  /* Revoco pintado: ocre, crema, almagre o gris azulado, con manchas grandes. */
  /* Apagados a propósito: saturados, bajo el sodio y el ACES, salían de dibujo animado. */
  vec3 base = tinte < 0.3 ? vec3(0.47, 0.39, 0.28) : tinte < 0.55 ? vec3(0.55, 0.51, 0.43)
    : tinte < 0.8 ? vec3(0.41, 0.28, 0.22) : vec3(0.36, 0.38, 0.38);
  #if NIVEL_Q >= 1
  float mancha = fbmQ(q * vec2(0.35, 0.18) + semilla * 0.01);
  #else
  float mancha = ruidoQ(q * vec2(0.35, 0.18) + semilla * 0.01);
  #endif
  return base * (0.78 + 0.4 * mancha);
}
`;
