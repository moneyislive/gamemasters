/**
 * EL CIELO CUBIERTO DE MADRUGADA: degradado analítico, nubes bajas iluminadas desde abajo por la
 * ciudad y, muy tenues detrás de la bruma, columnas que suben.
 *
 * ═══ POR QUÉ ASÍ ═══
 *
 * Un cielo nocturno de ciudad no es negro ni tiene estrellas: es la panza de las nubes teñida por el
 * sodio de abajo, más clara hacia el horizonte y casi negra en el cénit. Las nubes se sacan de un fbm
 * proyectado sobre un techo plano a 600 m (así se achican hacia el horizonte como las de verdad) y
 * se mueven despacio con el tiempo del ADORNO. No hay textura ni cubo: una esfera de 32×16 que sigue
 * a la cámara, con la niebla de altura encima (la del parcheo), que es la que funde el horizonte con
 * la bruma de la calle sin costura.
 *
 * Las columnas que suben (diseño §8, «tras la niebla, columnas tenues de la Grafía») aquí son sólo
 * trazos verdes que ascienden, sin glifos: la Grafía de verdad la dibuja el frente de efectos, y el
 * cielo sólo tiene que insinuar que la ciudad es código. `uColumnas` las apaga.
 */
import * as THREE from 'three';
import { nieblaEn } from './niebla';

export const UNIFORMES_DEL_CIELO = {
  /** Tiempo del adorno, en segundos. */
  uTiempo: { value: 0 },
  /** Cuánto se ven las columnas que suben (0-1). */
  uColumnas: { value: 1 },
  /** 0 noche … 1 amanecer (el Amanecer del recuento aclara el cielo por el este). */
  uAmanecer: { value: 0 },
};

const VERTICE = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_Position.z = gl_Position.w * 0.99999;
  #include <fog_vertex>
}
`;

const FRAGMENTO = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform float uTiempo;
uniform float uColumnas;
uniform float uAmanecer;
varying vec3 vDir;
float hashC(vec2 p) {
  uvec2 q = uvec2(ivec2(floor(p)) + 65536);
  uint v = q.x * 1664525u + q.y * 1013904223u;
  v ^= v >> 16u; v *= 2246822519u; v ^= v >> 13u; v *= 3266489917u; v ^= v >> 16u;
  return float(v) * (1.0 / 4294967296.0);
}
float ruidoC(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hashC(i), hashC(i + vec2(1.0, 0.0)), u.x), mix(hashC(i + vec2(0.0, 1.0)), hashC(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbmC(vec2 p) {
  float s = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * ruidoC(p); p = p * 2.07 + vec2(13.3, 7.1); a *= 0.5; }
  return s;
}
void main() {
  vec3 d = normalize(vDir);
  float h = max(d.y, 0.0);
  vec3 cenit = vec3(0.004, 0.006, 0.007);
  vec3 horizonte = vec3(0.045, 0.058, 0.052);
  vec3 cielo = mix(horizonte, cenit, pow(h, 0.55));
  /* Nubes: un techo a 600 m; su panza la tiñe el sodio de la ciudad. */
  if (d.y > 0.02) {
    vec2 p = d.xz / d.y * 0.6 + vec2(uTiempo * 0.004, uTiempo * 0.0015);
    float n = fbmC(p * 2.2);
    float nube = smoothstep(0.38, 0.75, n);
    vec3 panza = mix(vec3(0.028, 0.03, 0.026), vec3(0.075, 0.058, 0.04), smoothstep(0.35, 0.0, d.y));
    cielo = mix(cielo, panza * (0.6 + 0.8 * n), nube * (1.0 - smoothstep(0.7, 1.0, d.y) * 0.4));
  }
  /* Las columnas: trazos verdes que suben, muy tenues. */
  if (uColumnas > 0.0 && d.y > 0.03 && d.y < 0.6) {
    float az = atan(d.z, d.x);
    float col = floor(az * 70.0);
    float hc = hashC(vec2(col, 3.0));
    if (hc > 0.86) {
      float fx = fract(az * 70.0);
      float y = d.y * 90.0 - uTiempo * (0.6 + hc * 1.2);
      float trazo = step(0.35, fract(y)) * step(fract(y), 0.8) * step(0.5, hashC(vec2(col, floor(y))));
      float ancho = smoothstep(0.5, 0.2, abs(fx - 0.5));
      float caida = smoothstep(0.03, 0.12, d.y) * smoothstep(0.6, 0.25, d.y);
      cielo += vec3(0.02, 0.09, 0.06) * trazo * ancho * caida * uColumnas * (0.5 + hc);
    }
  }
  /* El amanecer: el este palidece. */
  cielo = mix(cielo, vec3(0.25, 0.27, 0.3) * (0.6 + 0.4 * max(d.x, 0.0)), uAmanecer * (1.0 - h * 0.5));
  gl_FragColor = vec4(cielo, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

/** El radio de la cúpula: dentro del plano lejano de cualquier cámara del juego. */
export const RADIO_DEL_CIELO = 900;

export function crearElCielo(): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    name: 'quiebro-cielo',
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...UNIFORMES_DEL_CIELO },
    vertexShader: VERTICE,
    fragmentShader: FRAGMENTO,
    side: THREE.BackSide,
    depthWrite: false,
    fog: true,
  });
  nieblaEn(material);
  const cupula = new THREE.Mesh(new THREE.SphereGeometry(RADIO_DEL_CIELO, 32, 16), material);
  cupula.name = 'quiebro-cielo';
  cupula.frustumCulled = false;
  cupula.renderOrder = -10;
  /* La cúpula sigue a la cámara: siempre está a la misma distancia, se mire desde donde se mire. */
  cupula.onBeforeRender = (_renderer, _escena, camara): void => {
    cupula.position.setFromMatrixPosition(camara.matrixWorld);
    cupula.updateMatrixWorld();
  };
  return cupula;
}
