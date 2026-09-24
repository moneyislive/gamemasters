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
 * EL CIELO FALSO QUE SE REFLEJA. El cielo cubierto (casi negro en el cénit de madrugada, gris verdoso
 * al alba), el resplandor del horizonte y, por debajo de unos 25°, «el cañón de la calle»: fachadas
 * con ventanas encendidas. Los colores son de la luz del barrio (`atmosfera/paleta.ts`, uniformes
 * `uReflejo*`), los mismos que usa la cúpula, para que el charco y el cielo digan lo mismo. Es lo que hace que un charco mirado a ras de suelo se llene de puntos de luz y que el
 * cristal de un escaparate no sea un negro plano. No coincide con los edificios de verdad —para eso
 * están las tarjetas de reflejo y, en N3, el reflejo en pantalla del frente de imagen—, pero se mueve
 * como se mueve un reflejo lejano, que es lo que el ojo mira.
 *
 * Radiancia lineal. La rugosidad difumina hacia la media.
 */
export const GLSL_CIELO_REFLEJADO = /* glsl */ `
uniform vec3 uReflejoCenit;
uniform vec3 uReflejoHorizonte;
uniform vec3 uReflejoMuro;
uniform float uReflejoVentanas;
uniform vec3 uReflejoMedia;
vec3 cieloReflejadoQ(vec3 r, float rugosidad) {
  float h = r.y;
  vec3 cielo = mix(uReflejoHorizonte, uReflejoCenit, pow(clamp(h, 0.0, 1.0), 0.5));
  float fachada = 1.0 - smoothstep(0.16, 0.44, h);
  /* Las calles van a lo largo de los ejes: un rayo que corre por la calle sale por el fondo, al cielo,
     y no choca con el muro. Es la franja clara que deja el final de la calle en el asfalto mojado. */
  float ejeR = max(abs(r.x), abs(r.z)) / max(length(r.xz), 1e-4);
  fachada *= 1.0 - smoothstep(0.975, 0.998, ejeR) * 0.85;
  if (fachada > 0.0) {
    /* El muro de enfrente oscurece el horizonte en cualquier superficie; sus ventanas, en cambio,
       sólo se ven en un espejo (charco, luna, azulejo): en lo rugoso serían puntos sueltos que
       saltan de un píxel a otro, como nieve. Se van del todo a partir de rugosidad 0,2. */
    vec3 muro = uReflejoMuro;
    float nitido = (1.0 - smoothstep(0.03, 0.2, rugosidad)) * uReflejoVentanas;
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
  cielo = mix(cielo, uReflejoMuro * 0.5, smoothstep(0.0, -0.25, h));
  return mix(cielo, uReflejoMedia, smoothstep(0.25, 0.95, rugosidad));
}
`;

/**
 * LOS CHARCOS: dónde hay agua quieta, de 0 (asfalto sólo mojado) a 1 (espejo). Ruido de mundo a dos
 * escalas: dónde se hunde el firme (pocas zonas, de 10-15 m) y, dentro, charcos de uno a tres metros
 * con el borde recortado y NÍTIDO (el agua quieta tiene orilla; una mancha que se desvanece en dos
 * metros es un camuflaje, y así se veía desde lo alto). `uHumedad` mueve el umbral (el aguacero
 * encharca más que la llovizna). La usan el asfalto, la acera, las tarjetas de reflejo, las
 * salpicaduras y el reflejo en pantalla de N3. Lo que va pegado a la geometría (la cuneta junto al
 * bordillo, las juntas de las losas) lo pone cada suelo encima.
 */
export const GLSL_CHARCOS = /* glsl */ `
uniform float uHumedad;
float charcoQ(vec2 xz) {
  float hundido = fbmQ(xz * 0.07);
  float forma = fbmQ(xz * 0.42 + 31.0);
  float n = hundido * 0.55 + forma * 0.45;
  float umbral = mix(0.57, 0.49, uHumedad);
  return smoothstep(umbral, umbral + 0.018, n);
}
/*
 * Los charcos de la ACERA y de la PLAZA: la losa drena mejor que el asfalto, así que son menos y más
 * pequeños (el mismo ruido, más fino y con el umbral más alto), y nunca un espejo entero (0,8). Vista
 * desde arriba (la Bajada, la Vigía), la plaza con los charcos del asfalto era un camuflaje de manchas.
 * El agua de las juntas la pone la acera encima.
 */
float charcoDeLaAceraQ(vec2 xz) {
  vec2 p = xz * 2.1 + 40.0;
  float n = fbmQ(p * 0.07) * 0.5 + fbmQ(p * 0.42 + 31.0) * 0.5;
  float umbral = mix(0.61, 0.54, uHumedad);
  return smoothstep(umbral, umbral + 0.018, n) * 0.8;
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
  float alto = max(p.y - 0.25, 0.0);
  if (n.y > 0.6) return (m.rgb + uColorDeSodio * m.a * uFarolas) * (p.y > 2.4 ? 0.0 : 1.0) * uLuzDeLaCalle;
  /*
   * En un muro, cada fuente se apaga a su manera. La farola (canal a) cuelga a unos 6 m y separada
   * del muro: ilumina sobre todo a su altura y se va por encima. Lo demás (escaparates, rótulos,
   * portales) está pegado al muro a 2-4 m: sube poco, porque la luz le llega al muro de canto. Con una
   * sola caída para todo, un escaparate blanco pintaba de gris la fachada entera hasta el tejado y la
   * calle se veía plana, como a pleno día.
   */
  float cFarola = (0.45 + 0.55 * smoothstep(0.0, 4.0, alto)) * exp(-max(alto - 5.5, 0.0) * 0.4);
  float cBajo = exp(-alto * 0.35);
  return (m.rgb * cBajo + uColorDeSodio * m.a * uFarolas * cFarola) * uLuzDeLaCalle;
}
`;
