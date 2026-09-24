/**
 * EL VAPOR DE LAS ALCANTARILLAS: bocanadas que suben, se abren y se deshacen, iluminadas por la
 * farola de al lado.
 *
 * Cada boca elegida echa seis bocanadas desfasadas, en planos de cara a la cámara (girados sólo en
 * vertical, para que no se tumben al mirar desde arriba). Todo en el sombreador: la edad sale del
 * tiempo del ADORNO (el Remanso lo congela en el aire) y la forma de un ruido que se desplaza. El
 * color lo pone la luz horneada del sitio más la de la niebla: bajo el sodio, naranja; en la calle
 * oscura, un gris verdoso que apenas se ve. Mezcla normal, no aditiva: el vapor TAPA, no brilla.
 *
 * Cuántas bocas echan vapor es del nivel (2 / 4 / 6 / 8), elegidas por hash: las mismas en todos
 * los aparatos del mismo nivel.
 */
import * as THREE from 'three';
import { nieblaEn } from '../atmosfera/niebla';
import { GLSL_RUIDO } from './glsl';
import { UNIFORMES_DE_LA_CIUDAD } from './retoques';
import { UNIFORMES_DE_LA_LLUVIA } from '../atmosfera/lluvia';
import { mezclar } from './azar';

const BOCANADAS = 6;

const VERTICE = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
attribute vec4 aVapor;
uniform float uTiempo;
uniform vec2 uViento;
uniform sampler2D uLuzCalle;
uniform vec4 uLuzCalleCaja;
uniform vec3 uColorDeSodio;
uniform float uFarolas;
varying vec2 vQ;
varying float vAlfa;
varying vec3 vColor;
varying float vSemilla;
void main() {
  float edad = fract(uTiempo * 0.16 + aVapor.z);
  float alto = 0.05 + edad * 3.4;
  float tam = 0.45 + edad * 2.3;
  vec2 xz = aVapor.xy + uViento * edad * 1.6;
  vec3 centro = vec3(xz.x, alto, xz.y);
  vec3 aCam = cameraPosition - centro;
  vec3 lado = normalize(vec3(aCam.z, 0.0, -aCam.x));
  vec3 p = centro + lado * position.x * tam + vec3(0.0, 1.0, 0.0) * position.y * tam;
  vec4 mvPosition = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  vQ = position.xy * 2.0;
  vAlfa = sin(edad * 3.14159) * (1.0 - edad * 0.4) * 0.55;
  vec2 uvL = (xz - uLuzCalleCaja.xy) * uLuzCalleCaja.zw;
  vec4 m = textureLod(uLuzCalle, clamp(uvL, 0.0, 1.0), 0.0);
  vColor = (m.rgb + uColorDeSodio * m.a * uFarolas) * 0.45 + vec3(0.05, 0.065, 0.062);
  vSemilla = aVapor.w;
  #include <fog_vertex>
}
`;

const FRAGMENTO = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform float uTiempo;
${GLSL_RUIDO}
varying vec2 vQ;
varying float vAlfa;
varying vec3 vColor;
varying float vSemilla;
void main() {
  float r = length(vQ);
  if (r > 1.0) discard;
  float n = fbmQ(vQ * 1.8 + vec2(vSemilla * 17.0, -uTiempo * 0.35));
  float a = smoothstep(1.0, 0.2, r) * smoothstep(0.25, 0.75, n) * vAlfa;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vColor, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export class Vapor {
  readonly malla: THREE.InstancedMesh;

  constructor(bocas: readonly { readonly x: number; readonly z: number }[], cuantas: number, semilla: number) {
    const elegidas = [...bocas]
      .map((b, i) => ({ b, h: mezclar(semilla, i, 77) }))
      .sort((a, b) => a.h - b.h)
      .slice(0, Math.max(0, cuantas))
      .map((e) => e.b);
    const n = elegidas.length * BOCANADAS;
    const plano = new THREE.PlaneGeometry(1, 1);
    const datos = new Float32Array(Math.max(1, n) * 4);
    elegidas.forEach((b, i) => {
      for (let k = 0; k < BOCANADAS; k++) {
        datos.set([b.x, b.z, k / BOCANADAS + (i % 3) * 0.07, (i * BOCANADAS + k) * 0.618], (i * BOCANADAS + k) * 4);
      }
    });
    plano.setAttribute('aVapor', new THREE.InstancedBufferAttribute(datos, 4));
    const material = new THREE.ShaderMaterial({
      name: 'quiebro-vapor',
      uniforms: {
        ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
        uTiempo: UNIFORMES_DE_LA_CIUDAD.uTiempo,
        uViento: UNIFORMES_DE_LA_LLUVIA.uViento,
        uLuzCalle: UNIFORMES_DE_LA_CIUDAD.uLuzCalle,
        uLuzCalleCaja: UNIFORMES_DE_LA_CIUDAD.uLuzCalleCaja,
        uColorDeSodio: UNIFORMES_DE_LA_CIUDAD.uColorDeSodio,
        uFarolas: UNIFORMES_DE_LA_CIUDAD.uFarolas,
      },
      vertexShader: VERTICE,
      fragmentShader: FRAGMENTO,
      transparent: true,
      depthWrite: false,
      fog: true,
    });
    nieblaEn(material);
    this.malla = new THREE.InstancedMesh(plano, material, n);
    this.malla.name = 'quiebro-vapor';
    this.malla.frustumCulled = false;
    this.malla.renderOrder = 6;
  }

  liberar(): void {
    this.malla.geometry.dispose();
    (this.malla.material as THREE.Material).dispose();
  }
}
