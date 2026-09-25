/**
 * LO COMÚN DEL SOMBREADOR DE LA FACHADA: las reglas que DECIDEN (qué ventana está encendida, de qué color es
 * su luz, qué tienda hay en cada bajo y qué hueco tiene cada estilo) y la línea de junta que usa todo lo demás.
 *
 * ═══ ESTO VIVE DOS VECES ═══
 *
 * `encendidaQ`, `queTiendaQ` y `colorDeLuzQ` tienen su gemela en `hash.ts` (`encendida`, `queTienda`,
 * `colorDeLaVentana`), la tienda de 6 m en `LARGO_DE_UNA_TIENDA`, y `huecoQ` en `HUECO_DEL_ESTILO`
 * (`tipos-de-cara.ts`): las tarjetas de reflejo y la luz horneada se colocan desde JavaScript bajo lo que
 * este texto enciende. Si se toca una, se toca la otra.
 *
 * Usa `hashQ` (de `GLSL_RUIDO`, `glsl.ts`, que pone el retoque del mundo) y `uVentanasEncendidas`
 * (`declaraciones.ts`). No usa ninguna variable del cuerpo: son funciones.
 */
/** Las reglas que deciden y la línea de junta: el segundo tramo, detrás de `DECLARACIONES_DEL_FRAGMENTO`. */
export const GLSL_COMUN_DE_LA_FACHADA = /* glsl */ `
vec3 colorDeLuzQ(float h) {
  if (h < 0.45) return vec3(1.0, 0.56, 0.24);
  if (h < 0.70) return vec3(1.0, 0.74, 0.46);
  if (h < 0.90) return vec3(0.70, 0.86, 1.0);
  return vec3(0.35, 0.5, 1.0);
}

float encendidaQ(float celda, float planta, float semilla, int estilo) {
  float hv = hashQ(vec2(celda, planta), semilla);
  float hp = hashQ(vec2(planta, 91.0), semilla);
  float prob = estilo == 3 ? (hp < 0.16 ? 0.8 : 0.04) : 0.12 + 0.2 * hp;
  /* La luz del barrio apaga una parte (al alba quedan pocas): un segundo sorteo, así que las que siguen
     encendidas son un subconjunto de las de la regla de hash.ts, que es la que coloca los reflejos. */
  float sigue = hashQ(vec2(celda, planta), semilla + 53.0) < uVentanasEncendidas ? 1.0 : 0.0;
  return hv < prob ? sigue : 0.0;
}

/* Igual que queTienda() de hash.ts: 0 persiana, 1 escaparate encendido, 2 portal, 3 apagado o reja. */
int queTiendaQ(float tienda, float semilla, bool portales) {
  float ht = hashQ(vec2(tienda, 3.0), semilla);
  if (portales) return ht < 0.35 ? 2 : ht < 0.7 ? 3 : 0;
  return ht < 0.34 ? 0 : ht < 0.66 ? 1 : ht < 0.8 ? 2 : 3;
}

vec4 huecoQ(int estilo) {
  if (estilo == 0 || estilo == 4) return vec4(0.30, 0.70, 0.10, 0.84);
  if (estilo == 1) return vec4(0.28, 0.72, 0.22, 0.80);
  if (estilo == 2) return vec4(0.08, 0.92, 0.28, 0.78);
  if (estilo == 3) return vec4(0.04, 0.96, 0.04, 0.80);
  return vec4(0.30, 0.70, 0.14, 0.82);
}

/* 1 en la junta, 0 fuera; con el borde del tamaño del píxel, y apagada si el periodo cabe en 3 píxeles. */
float lineaQ(float x, float periodo, float grosor, float px) {
  float f = abs(fract(x / periodo + 0.5) - 0.5) * periodo;
  float l = 1.0 - smoothstep(grosor * 0.5, grosor * 0.5 + px, f);
  return l * (1.0 - smoothstep(periodo / 6.0, periodo / 3.0, px));
}
`;
