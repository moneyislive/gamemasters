/**
 * LA LLUVIA: rayas instanciadas en un volumen atado a la cámara, y salpicaduras en el suelo cerca.
 *
 * ═══ QUIETA EN EL MUNDO, ATADA A LA CÁMARA ═══
 *
 * Las gotas no pueden moverse CON la cámara (al andar de lado la lluvia iría contigo, que es lo que
 * delata un efecto barato), ni se pueden repartir por toda la ciudad (serían millones). Cada gota
 * tiene una posición de mundo fija en una rejilla de celdas de 2R de lado que se repite: el
 * sombreador la dobla con `mod` alrededor de la cámara, así que siempre hay gotas a menos de R y
 * cada una está quieta en el mundo mientras cae. Todo en el sombreador de vértices: la CPU no toca
 * nada por fotograma salvo dos uniformes.
 *
 * ═══ LA LLUVIA SE VE DONDE HAY LUZ ═══
 *
 * Una raya de lluvia de noche es invisible salvo contraluz: bajo una farola brilla, en mitad de la
 * calle apenas. Cada raya lee el mapa horneado de la luz de la calle en su sitio (la misma muestra
 * que el suelo) y brilla con eso; más un poco del color de la niebla para que el fondo no quede
 * vacío. El tiempo es el del ADORNO: en el Remanso se frena y la lluvia se queda en el aire.
 *
 * El número de rayas es del NIVEL (1.000 / 3.000 / 6.000 / 10.000) y las salpicaduras sólo desde N2.
 */
import * as THREE from 'three';
import { nieblaEn } from './niebla';
import { UNIFORMES_DE_LA_CIUDAD } from '../ciudad/retoques';
import { GLSL_CHARCOS, GLSL_RUIDO } from '../ciudad/glsl';
import { GLSL_ALTURA } from '../ciudad/reflejos';
import { UNIFORMES_DE_LA_LUZ } from './paleta';

export const UNIFORMES_DE_LA_LLUVIA = {
  /** Tiempo del adorno. */
  uTiempo: UNIFORMES_DE_LA_CIUDAD.uTiempo,
  /** Metros por segundo de caída. */
  uVelocidad: { value: 9.5 },
  /** Viento (m/s en x y z). */
  uViento: { value: new THREE.Vector2(1.2, 0.5) },
  /** Radio del volumen alrededor de la cámara. */
  uRadio: { value: 22 },
  /** Cuánto brillan (el aguacero más, la niebla baja menos). */
  uFuerza: { value: 1 },
};

const GLSL_LUZ = /* glsl */ `
uniform sampler2D uLuzCalle;
uniform vec4 uLuzCalleCaja;
uniform vec3 uColorDeSodio;
uniform float uFarolas;
vec3 luzEnQ(vec2 xz) {
  vec2 uvL = (xz - uLuzCalleCaja.xy) * uLuzCalleCaja.zw;
  if (uvL.x < 0.0 || uvL.y < 0.0 || uvL.x > 1.0 || uvL.y > 1.0) return vec3(0.0);
  vec4 m = textureLod(uLuzCalle, uvL, 0.0);
  return m.rgb + uColorDeSodio * m.a * uFarolas;
}
`;

const VERTICE = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
attribute vec4 aGota;
uniform float uTiempo;
uniform float uVelocidad;
uniform vec2 uViento;
uniform float uRadio;
uniform float uFuerza;
uniform vec3 uAmbienteDeLaLluvia;
${GLSL_LUZ}
varying vec2 vQ;
varying vec3 vColor;
void main() {
  float alto = uRadio * 1.2;
  vec3 cam = cameraPosition;
  /* La celda de 2R que se repite: posición de mundo fija, doblada alrededor de la cámara. */
  vec2 base = (aGota.xy - 0.5) * 2.0 * uRadio;
  vec2 deriva = uViento * uTiempo * (0.9 + 0.2 * aGota.w);
  vec2 xz = mod(base + deriva - cam.xz + uRadio, 2.0 * uRadio) - uRadio + cam.xz;
  float caida = uTiempo * uVelocidad * (0.85 + 0.3 * aGota.w);
  float y = mod(aGota.z * alto - caida - cam.y + alto * 0.35, alto) + cam.y - alto * 0.35;
  vec3 centro = vec3(xz.x, y, xz.y);
  vec3 eje = normalize(vec3(uViento.x, -uVelocidad, uViento.y));
  vec3 aCam = cam - centro;
  float d = length(aCam);
  vec3 lado = normalize(cross(eje, aCam / max(d, 1e-3)));
  float largo = uVelocidad * 0.045 * (0.8 + 0.4 * aGota.w);
  float ancho = 0.004 + d * 0.0006;
  vec3 p = centro + eje * position.y * largo + lado * position.x * ancho * 2.0;
  vec4 mvPosition = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  vQ = position.xy * 2.0;
  /* Cerca de la cámara se apaga (una gota a 20 cm sería una viga); lejos también. */
  float fade = smoothstep(0.6, 2.0, d) * (1.0 - smoothstep(uRadio * 0.7, uRadio, d));
  /* La luz de la calle ilumina la gota según su altura: la farola está a 6 m, el suelo más abajo. */
  vec3 luz = luzEnQ(xz) * smoothstep(-1.0, 5.0, y) * 0.5 + uAmbienteDeLaLluvia;
  vColor = luz * fade * uFuerza * 0.2;
  #include <fog_vertex>
}
`;

const FRAGMENTO = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
varying vec2 vQ;
varying vec3 vColor;
void main() {
  float a = exp(-vQ.x * vQ.x * 3.0) * (1.0 - vQ.y * vQ.y);
  gl_FragColor = vec4(vColor * a, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

/** Una malla de `cuantas` rayas. */
export function crearLaLluvia(cuantas: number, semilla: number): THREE.InstancedMesh {
  const plano = new THREE.PlaneGeometry(1, 1);
  const gotas = new Float32Array(Math.max(1, cuantas) * 4);
  let a = semilla >>> 0 || 1;
  const azar = (): number => {
    a ^= a << 13;
    a >>>= 0;
    a ^= a >>> 17;
    a ^= a << 5;
    a >>>= 0;
    return a / 4294967296;
  };
  for (let i = 0; i < gotas.length; i++) gotas[i] = azar();
  plano.setAttribute('aGota', new THREE.InstancedBufferAttribute(gotas, 4));
  const material = new THREE.ShaderMaterial({
    name: 'quiebro-lluvia',
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      ...UNIFORMES_DE_LA_LLUVIA,
      uLuzCalle: UNIFORMES_DE_LA_CIUDAD.uLuzCalle,
      uLuzCalleCaja: UNIFORMES_DE_LA_CIUDAD.uLuzCalleCaja,
      uColorDeSodio: UNIFORMES_DE_LA_CIUDAD.uColorDeSodio,
      uFarolas: UNIFORMES_DE_LA_CIUDAD.uFarolas,
      uAmbienteDeLaLluvia: UNIFORMES_DE_LA_LUZ.uAmbienteDeLaLluvia,
    },
    vertexShader: VERTICE,
    fragmentShader: FRAGMENTO,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true,
  });
  nieblaEn(material);
  const malla = new THREE.InstancedMesh(plano, material, cuantas);
  malla.name = 'quiebro-lluvia';
  malla.frustumCulled = false;
  malla.renderOrder = 5;
  return malla;
}

/* ─────────────────────────────── Salpicaduras ─────────────────────────────── */

/*
 * LAS SALPICADURAS SON ANILLOS EN EL AGUA, no en la acera: un anillo sólo se abre donde hay agua quieta
 * (el mismo `charcoQ` que el suelo), mide como mucho 15 cm y se apaga entre 8 y 12 m. Repartidos por
 * igual en la acera seca eran círculos idénticos, como pegatinas.
 */
const VERTICE_DE_SALPICADURA = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
attribute vec4 aGota;
uniform float uTiempo;
uniform vec3 uAmbienteDeLaLluvia;
${GLSL_ALTURA}
${GLSL_LUZ}
${GLSL_RUIDO}
${GLSL_CHARCOS}
varying vec2 vQ;
varying float vEdad;
varying vec3 vColor;
float h1(float n) { return fract(sin(n * 127.1) * 43758.5453); }
void main() {
  float ritmo = 2.2 + aGota.w;
  float ciclo = floor(uTiempo * ritmo + aGota.z * 10.0);
  float edad = fract(uTiempo * ritmo + aGota.z * 10.0);
  /* Quieta en el mundo durante su vida, doblada alrededor de la cámara como las gotas. */
  vec2 off = vec2(h1(ciclo + aGota.x * 91.0), h1(ciclo * 1.7 + aGota.y * 57.0)) * 18.0;
  vec2 xz = mod(off - cameraPosition.xz + 9.0, 18.0) - 9.0 + cameraPosition.xz;
  float y = alturaDelSueloQ(xz) + 0.012;
  float r = 0.02 + edad * 0.055;
  vec3 p = vec3(xz.x + position.x * 2.0 * r, y, xz.y - position.y * 2.0 * r);
  vec4 mvPosition = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  vQ = position.xy * 2.0;
  vEdad = edad;
  float agua = y > 0.07 ? charcoDeLaAceraQ(xz) : charcoQ(xz);
  float lejos = 1.0 - smoothstep(8.0, 12.0, length(xz - cameraPosition.xz));
  vColor = (luzEnQ(xz) * 0.25 + uAmbienteDeLaLluvia * 0.8) * smoothstep(0.2, 0.6, agua) * lejos;
  #include <fog_vertex>
}
`;

const FRAGMENTO_DE_SALPICADURA = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
varying vec2 vQ;
varying float vEdad;
varying vec3 vColor;
void main() {
  float r = length(vQ);
  float anillo = exp(-pow((r - 0.8) * 7.0, 2.0)) * (1.0 - vEdad) * (1.0 - vEdad);
  if (anillo < 0.003 || max(vColor.r, max(vColor.g, vColor.b)) < 1e-4) discard;
  gl_FragColor = vec4(vColor * anillo * 0.35, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export function crearLasSalpicaduras(cuantas: number, semilla: number): THREE.InstancedMesh {
  const plano = new THREE.PlaneGeometry(1, 1);
  const gotas = new Float32Array(Math.max(1, cuantas) * 4);
  for (let i = 0; i < gotas.length; i++) gotas[i] = ((Math.imul(i + 1, 2654435761) ^ semilla) >>> 0) / 4294967296;
  plano.setAttribute('aGota', new THREE.InstancedBufferAttribute(gotas, 4));
  const material = new THREE.ShaderMaterial({
    name: 'quiebro-salpicaduras',
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uTiempo: UNIFORMES_DE_LA_CIUDAD.uTiempo,
      uHumedad: UNIFORMES_DE_LA_CIUDAD.uHumedad,
      uAlturas: UNIFORMES_DE_LA_CIUDAD.uAlturas,
      uAlturasCaja: UNIFORMES_DE_LA_CIUDAD.uAlturasCaja,
      uLuzCalle: UNIFORMES_DE_LA_CIUDAD.uLuzCalle,
      uLuzCalleCaja: UNIFORMES_DE_LA_CIUDAD.uLuzCalleCaja,
      uColorDeSodio: UNIFORMES_DE_LA_CIUDAD.uColorDeSodio,
      uFarolas: UNIFORMES_DE_LA_CIUDAD.uFarolas,
      uAmbienteDeLaLluvia: UNIFORMES_DE_LA_LUZ.uAmbienteDeLaLluvia,
    },
    vertexShader: VERTICE_DE_SALPICADURA,
    fragmentShader: FRAGMENTO_DE_SALPICADURA,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -4,
  });
  nieblaEn(material);
  const malla = new THREE.InstancedMesh(plano, material, cuantas);
  malla.name = 'quiebro-salpicaduras';
  malla.frustumCulled = false;
  malla.renderOrder = 4;
  return malla;
}
