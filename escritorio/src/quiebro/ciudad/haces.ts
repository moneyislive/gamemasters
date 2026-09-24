/**
 * LOS HACES DE LUZ EN LA NIEBLA (N2+): el cono que baja de cada farola y se ve en el aire mojado.
 *
 * Un cono abierto por farola, aditivo y de doble cara, cuyo brillo sube con el grosor de aire que
 * atraviesa la mirada: donde la vista cruza el cono de frente (el centro) hay más niebla iluminada
 * que en el borde, así que el brillo va con |N·V|, y se apaga hacia el suelo. Es el truco barato de
 * los rayos de luz sin marcha de rayos, y sólo desde N2: en un teléfono es relleno a pantalla casi
 * completa por cada farola cercana, y ahí la niebla ya cuenta lo mismo. Al alba pesan menos
 * (`uHaces`, de la paleta de la luz): de día un cono de sodio en la bruma apenas se ve.
 */
import * as THREE from 'three';
import { nieblaEn } from '../atmosfera/niebla';
import { UNIFORMES_DE_LA_CIUDAD } from './retoques';
import { UNIFORMES_DE_LA_LUZ } from '../atmosfera/paleta';

const ALTO = 6.2;

const VERTICE = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
attribute vec3 aCabeza;
varying float vAltura;
varying vec3 vNormalH;
varying vec3 vPosH;
varying float vCercaH;
void main() {
  vec3 p = position + aCabeza;
  vAltura = -position.y / ${ALTO.toFixed(1)};
  vNormalH = normal;
  vPosH = p;
  /* Con la cámara dentro del cono (o casi) no se ve un haz: se ve niebla por todas partes. Se apaga. */
  vCercaH = smoothstep(2.5, 7.0, length(cameraPosition.xz - aCabeza.xz));
  vec4 mvPosition = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAGMENTO = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform float uFarolas;
uniform float uHaces;
varying float vAltura;
varying vec3 vNormalH;
varying vec3 vPosH;
varying float vCercaH;
void main() {
  vec3 v = normalize(cameraPosition - vPosH);
  float grosor = pow(abs(dot(normalize(vNormalH), v)), 1.6);
  float caida = (1.0 - vAltura) * (1.0 - vAltura);
  vec3 c = vec3(1.0, 0.55, 0.18) * grosor * caida * 0.05 * uFarolas * uHaces * vCercaH;
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export function crearLosHaces(cabezas: readonly { readonly x: number; readonly y: number; readonly z: number }[]): THREE.InstancedMesh {
  const cono = new THREE.CylinderGeometry(0.18, 2.6, ALTO, 16, 1, true);
  cono.translate(0, -ALTO / 2, 0);
  const datos = new Float32Array(Math.max(1, cabezas.length) * 3);
  cabezas.forEach((c, i) => datos.set([c.x, c.y, c.z], i * 3));
  cono.setAttribute('aCabeza', new THREE.InstancedBufferAttribute(datos, 3));
  const material = new THREE.ShaderMaterial({
    name: 'quiebro-haces',
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uFarolas: UNIFORMES_DE_LA_CIUDAD.uFarolas, uHaces: UNIFORMES_DE_LA_LUZ.uHaces },
    vertexShader: VERTICE,
    fragmentShader: FRAGMENTO,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: true,
  });
  nieblaEn(material);
  const malla = new THREE.InstancedMesh(cono, material, cabezas.length);
  malla.name = 'quiebro-haces';
  malla.frustumCulled = false;
  malla.renderOrder = 4;
  return malla;
}
