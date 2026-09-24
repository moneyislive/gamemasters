/**
 * LOS TROZOS DE GLSL QUE COMPARTEN TODOS LOS MATERIALES DE LA CIUDAD.
 *
 * ═══ POR QUÉ UN SOLO SITIO ═══
 *
 * El asfalto decide dónde hay un charco con `charcoQ`, y las tarjetas de reflejo, que son otro
 * material, tienen que saber EXACTAMENTE lo mismo: si no, el brillo de la farola cae en seco y el
 * charco de al lado se queda mate. Lo mismo el cielo falso que reflejan el cristal, la pintura y el
 * agua: si cada uno lo inventa, el coche refleja un cielo y el escaparate de detrás otro. Todo lo que
 * dos materiales tienen que ver igual vive aquí, una vez.
 *
 * ═══ PRECISIÓN ═══
 *
 * Aquí no hay `mediump`: este cliente corre sólo en el motor del navegador (ARQUITECTURA §0.2) y las
 * posiciones de mundo van en `highp`, que es lo que three pide por defecto. El hash es entero
 * (`uint`, WebGL2), así que da lo mismo a 5 m del origen que a 400.
 *
 * Todo lleva el sufijo `Q` para no chocar con nada de three ni de otro frente.
 */

/** Hash entero (PCG) y ruido de valor. */
export const GLSL_RUIDO = /* glsl */ `
uint pcgQ(uint v) {
  uint s = v * 747796405u + 2891336453u;
  uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}
float hashQ(vec2 p, float semilla) {
  uvec2 q = uvec2(ivec2(floor(p)) + 65536);
  uint s = uint(max(semilla, 0.0)) * 9973u;
  return float(pcgQ(q.x + pcgQ(q.y + pcgQ(s)))) * (1.0 / 4294967296.0);
}
float hash3Q(vec3 p) {
  uvec3 q = uvec3(ivec3(floor(p)) + 65536);
  return float(pcgQ(q.x + pcgQ(q.y + pcgQ(q.z)))) * (1.0 / 4294967296.0);
}
float ruidoQ(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hashQ(i, 0.0);
  float b = hashQ(i + vec2(1.0, 0.0), 0.0);
  float c = hashQ(i + vec2(0.0, 1.0), 0.0);
  float d = hashQ(i + vec2(1.0, 1.0), 0.0);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbmQ(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * ruidoQ(p);
    p = p * 2.03 + vec2(17.1, 9.7);
    a *= 0.5;
  }
  return s;
}
`;

/**
 * EL CIELO FALSO QUE SE REFLEJA. Cielo cubierto casi negro en el cénit, el resplandor de la ciudad
 * en el horizonte y, por debajo de unos 25°, «el cañón de la calle»: fachadas oscuras con ventanas
 * encendidas. Es lo que hace que un charco mirado a ras de suelo se llene de puntos de luz y que el
 * cristal de un escaparate no sea un negro plano. No coincide con los edificios de verdad —para eso
 * están las tarjetas de reflejo y, en N3, el reflejo en pantalla del frente de imagen—, pero se mueve
 * como se mueve un reflejo lejano, que es lo que el ojo mira.
 *
 * Radiancia lineal. La rugosidad difumina hacia la media.
 */
export const GLSL_CIELO_REFLEJADO = /* glsl */ `
vec3 cieloReflejadoQ(vec3 r, float rugosidad) {
  float h = r.y;
  vec3 cenit = vec3(0.004, 0.0065, 0.007);
  vec3 horizonte = vec3(0.050, 0.072, 0.066);
  vec3 cielo = mix(horizonte, cenit, pow(clamp(h, 0.0, 1.0), 0.5));
  float fachada = 1.0 - smoothstep(0.16, 0.44, h);
  if (fachada > 0.0) {
    /* El muro de enfrente oscurece el horizonte en cualquier superficie; sus ventanas, en cambio,
       sólo se ven en un espejo (charco, luna, azulejo): en lo rugoso serían puntos sueltos que
       saltan de un píxel a otro, como nieve. Se van del todo a partir de rugosidad 0,2. */
    vec3 muro = vec3(0.010, 0.012, 0.012);
    float nitido = 1.0 - smoothstep(0.03, 0.2, rugosidad);
    if (nitido > 0.0) {
      float az = atan(r.z, r.x);
      vec2 celda = vec2(az * 36.0, h * 64.0);
      vec2 id = floor(celda);
      vec2 f = fract(celda);
      float encendida = step(0.8, hashQ(id, 7.0));
      vec2 borde = smoothstep(vec2(0.18, 0.24), vec2(0.3, 0.36), f) * (1.0 - smoothstep(vec2(0.7, 0.64), vec2(0.82, 0.76), f));
      vec3 luz = mix(vec3(1.0, 0.58, 0.28), vec3(0.62, 0.8, 1.0), step(0.72, hashQ(id, 3.0)));
      muro += encendida * borde.x * borde.y * luz * (0.25 + 0.4 * hashQ(id, 5.0)) * nitido;
    }
    cielo = mix(cielo, muro, fachada * (1.0 - smoothstep(0.3, 0.9, rugosidad)));
  }
  cielo = mix(cielo, vec3(0.006, 0.007, 0.007), smoothstep(0.0, -0.25, h));
  vec3 media = vec3(0.018, 0.024, 0.023);
  return mix(cielo, media, smoothstep(0.25, 0.95, rugosidad));
}
`;

/**
 * LOS CHARCOS: dónde hay agua quieta, de 0 (asfalto sólo mojado) a 1 (espejo). Ruido de mundo a dos
 * escalas: manchas de 5-8 m y bordes irregulares. `uHumedad` mueve el umbral (el aguacero encharca
 * más que la llovizna). La usan el asfalto, la acera y las tarjetas de reflejo.
 */
export const GLSL_CHARCOS = /* glsl */ `
uniform float uHumedad;
float charcoQ(vec2 xz) {
  float n = fbmQ(xz * 0.13) * 0.7 + fbmQ(xz * 0.71 + 31.0) * 0.3;
  float umbral = mix(0.6, 0.5, uHumedad);
  return smoothstep(umbral, umbral + 0.05, n);
}
`;

/**
 * LAS ONDAS DE LAS GOTAS en un charco: la pendiente (d/dx, d/dz) de la superficie del agua. Dos
 * rejillas de celdas; en cada celda nace un anillo que crece y se apaga. El `t` es el tiempo del
 * ADORNO (el que el Remanso frena), no el de la partida.
 */
export const GLSL_ONDAS = /* glsl */ `
vec2 ondasQ(vec2 xz, float t) {
  vec2 g = vec2(0.0);
  for (int k = 0; k < 2; k++) {
    float escala = 2.1 + float(k) * 1.37;
    vec2 p = xz * escala + float(k) * 7.31;
    vec2 id = floor(p);
    vec2 f = fract(p) - 0.5;
    float h = hashQ(id, float(k) + 1.0);
    vec2 centro = (vec2(hashQ(id, 11.0), hashQ(id, 12.0)) - 0.5) * 0.4;
    float fase = fract(t * (0.8 + 0.4 * h) + h);
    vec2 d = f - centro;
    float dist = length(d);
    float x = (dist - fase * 0.32) * 30.0;
    float amp = (1.0 - fase) * (1.0 - fase) * exp(-x * x * 0.25) * step(0.3, h);
    g += (d / max(dist, 1e-3)) * cos(x) * amp * escala * 0.035;
  }
  return g;
}
`;

/**
 * LA LUZ DE LA CALLE que viene del mapa horneado (`luz-de-la-calle.ts`): irradiancia a ras de suelo
 * de las farolas (canal `a`, en color de sodio) y del resto (neones, escaparates, ventanas bajas; en
 * `rgb`). En una pared se lee el suelo de delante y se apaga con la altura; en un tejado, nada.
 */
export const GLSL_LUZ_DE_LA_CALLE = /* glsl */ `
uniform sampler2D uLuzCalle;
uniform vec4 uLuzCalleCaja;
uniform vec3 uColorDeSodio;
uniform float uFarolas;
uniform float uLuzDeLaCalle;
vec3 luzDeLaCalleQ(vec3 p, vec3 n) {
  vec2 xz = p.xz + n.xz * 1.0;
  vec2 uvL = (xz - uLuzCalleCaja.xy) * uLuzCalleCaja.zw;
  if (uvL.x < 0.0 || uvL.y < 0.0 || uvL.x > 1.0 || uvL.y > 1.0) return vec3(0.0);
  vec4 m = texture(uLuzCalle, uvL);
  vec3 e = m.rgb + uColorDeSodio * m.a * uFarolas;
  float alto = max(p.y - 0.25, 0.0);
  float caida = n.y > 0.6 ? (p.y > 2.4 ? 0.0 : 1.0) : exp(-alto * 0.14) * (0.55 + 0.45 * smoothstep(0.0, 3.0, alto));
  return e * caida * uLuzDeLaCalle;
}
`;
