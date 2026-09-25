/**
 * LOS HALOS: el resplandor de cada farola, neón y auricular en el aire mojado, en UNA llamada.
 *
 * ═══ POR QUÉ, SI EL FRENTE DE IMAGEN YA PONE BRILLO ═══
 *
 * En N0 no hay posproceso: sin esto, una farola es un disco naranja recortado sobre negro y la
 * noche parece un decorado. Con lluvia y niebla la luz se esparce alrededor de la bombilla, y eso es
 * lo que el ojo reconoce como «de noche, lloviendo». Un plano de cara a la cámara, aditivo, con una
 * caída doble (el núcleo y el velo ancho), adelantado hacia la cámara lo que mide para que el muro
 * de detrás no lo corte en seco (el truco barato de las partículas blandas, sin mapa de
 * profundidad). Con posproceso (N1+) el brillo del compositor se suma encima y los halos se bajan
 * con `uHalos` para no contar la luz dos veces.
 */
import * as THREE from 'three';
import { nieblaEn } from '../atmosfera/niebla';
import { UNIFORMES_DE_LA_CIUDAD } from './retoques';
import { GLSL_PARPADEO } from './glsl';

export interface FuenteDeHalo {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Radio del velo, en metros. */
  readonly radio: number;
  /** Color lineal por intensidad. */
  readonly color: readonly [number, number, number];
  readonly farola: boolean;
  /** 0 fijo; >0: parpadea con esa semilla (neones viejos). */
  readonly parpadeo: number;
}

/** Cuánto pesan los halos (el frente de imagen lo baja cuando su brillo está encendido). */
export const UNIFORMES_DE_LOS_HALOS = { uHalos: { value: 1 } };

const VERTICE = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
attribute vec4 aFuente;
attribute vec4 aColor;
attribute float aParpadeo;
uniform float uFarolas;
uniform float uTiempo;
uniform float uHalos;
varying vec2 vQ;
varying vec3 vColor;
${GLSL_PARPADEO}
void main() {
  vec3 centro = aFuente.xyz;
  vec3 aCam = cameraPosition - centro;
  float d = length(aCam);
  centro += aCam / max(d, 1e-3) * min(aFuente.w * 0.9, d * 0.5);
  vec3 derecha = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 arriba = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 p = centro + (derecha * position.x + arriba * position.y) * 2.0 * aFuente.w;
  vec4 mvPosition = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  vQ = position.xy * 2.0;
  vColor = aColor.rgb * mix(1.0, uFarolas, aColor.w) * parpadeoQ(aParpadeo, uTiempo) * uHalos;
  #include <fog_vertex>
}
`;

const FRAGMENTO = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
varying vec2 vQ;
varying vec3 vColor;
void main() {
  float r2 = dot(vQ, vQ);
  if (r2 > 1.0) discard;
  float nucleo = exp(-r2 * 38.0);
  float velo = exp(-r2 * 5.0) * 0.22;
  float g = (nucleo + velo) * (1.0 - r2);
  gl_FragColor = vec4(vColor * g, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export function materialDeLosHalos(): THREE.ShaderMaterial {
  const m = new THREE.ShaderMaterial({
    name: 'quiebro-halos',
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uFarolas: UNIFORMES_DE_LA_CIUDAD.uFarolas,
      uTiempo: UNIFORMES_DE_LA_CIUDAD.uTiempo,
      uHalos: UNIFORMES_DE_LOS_HALOS.uHalos,
    },
    vertexShader: VERTICE,
    fragmentShader: FRAGMENTO,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true,
  });
  nieblaEn(m);
  return m;
}

/** Las listas instanciadas de unos halos, con sitio para `n`. */
export function datosDeLosHalos(fuentes: readonly FuenteDeHalo[], n = fuentes.length): { aFuente: Float32Array; aColor: Float32Array; aParpadeo: Float32Array } {
  const aFuente = new Float32Array(Math.max(1, n) * 4);
  const aColor = new Float32Array(Math.max(1, n) * 4);
  const aParpadeo = new Float32Array(Math.max(1, n));
  fuentes.forEach((f, i) => {
    aFuente.set([f.x, f.y, f.z, f.radio], i * 4);
    aColor.set([f.color[0], f.color[1], f.color[2], f.farola ? 1 : 0], i * 4);
    aParpadeo[i] = f.parpadeo;
  });
  return { aFuente, aColor, aParpadeo };
}

/** Los halos de unas fuentes, con sitio para `capacidad` (la ciudad abierta los cambia con la ventana). */
export function mallaDeHalos(fuentes: readonly FuenteDeHalo[], material: THREE.Material, capacidad = fuentes.length): THREE.InstancedMesh {
  const plano = new THREE.PlaneGeometry(1, 1);
  const d = datosDeLosHalos(fuentes, Math.max(capacidad, fuentes.length));
  plano.setAttribute('aFuente', new THREE.InstancedBufferAttribute(d.aFuente, 4));
  plano.setAttribute('aColor', new THREE.InstancedBufferAttribute(d.aColor, 4));
  plano.setAttribute('aParpadeo', new THREE.InstancedBufferAttribute(d.aParpadeo, 1));
  const malla = new THREE.InstancedMesh(plano, material, fuentes.length);
  malla.name = 'quiebro-halos';
  malla.frustumCulled = false;
  malla.renderOrder = 3;
  return malla;
}
