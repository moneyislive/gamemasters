/**
 * EL AGUA DEL MUELLE: un sombreador propio, y por qué no vale el del pack.
 *
 * ═══ QUÉ HACE ═══
 *
 * Un disco de mar hasta la niebla con dos senos de desplazamiento en el vértice
 * (dos direcciones, dos frecuencias, para que nunca se lea el patrón), fresnel
 * entre el azul hondo `#0D1A33` de frente y el reflejo del cielo `#2A2F55` de
 * refilón, y una franja de brillo de la brasa a lo largo del eje del sol, rota
 * por las olas. Es lo que se ve a la hora azul desde un muelle: agua casi negra
 * a los pies y un camino de cobre hacia donde se puso el sol.
 *
 * ═══ POR QUÉ ES GLSL CORTO Y CONSERVADOR ═══
 *
 * Tiene que compilar en WebGL2 y en `expo-gl` con el mismo texto: nada de
 * extensiones, precisión `mediump` declarada, sin texturas y sin derivadas. La
 * normal se saca ANALÍTICAMENTE de los mismos senos que desplazan, así que no
 * hace falta `dFdx`. Y se usan los trozos de niebla de three (`fog_*`) para que
 * el mar se funda con el cielo en el horizonte exactamente donde lo hace todo lo
 * demás: con dos nieblas distintas el horizonte se lee como una costura.
 *
 * ═══ LA MALLA ES RADIAL ═══
 *
 * Un plano regular gasta sus vértices donde no se miran. Aquí los anillos crecen
 * geométricamente: dos metros entre vértices a los pies del muelle y cien en el
 * horizonte, con menos de tres mil vértices en total.
 */
import * as THREE from 'three';
import { RADIO_EXTERIOR_DEL_MAR, RADIO_INTERIOR_DEL_MAR, RAZON_DEL_MAR, SECTORES_DEL_MAR } from './presupuesto';

export const COLOR_HONDO = '#0d1a33';
export const COLOR_DEL_REFLEJO = '#2a2f55';
export const COLOR_DE_LA_BRASA_EN_EL_AGUA = '#e2603a';

const VERTICE = /* glsl */ `
precision mediump float;
#include <fog_pars_vertex>
uniform float tiempo;
uniform float amplitud;
varying vec3 vNormalMundo;
varying vec3 vPosicionMundo;

void main() {
  vec4 mundo = modelMatrix * vec4(position, 1.0);
  /* Dos senos con direcciones y frecuencias distintas: el patrón no se repite. */
  float f1 = dot(mundo.xz, vec2(0.093, 0.061)) + tiempo * 0.9;
  float f2 = dot(mundo.xz, vec2(-0.047, 0.118)) + tiempo * 0.63;
  float alza = amplitud * (sin(f1) + 0.6 * sin(f2));
  mundo.y += alza;
  /* La normal, derivando los mismos senos: sin extensiones ni derivadas de pantalla. */
  float dx = amplitud * (cos(f1) * 0.093 + 0.6 * cos(f2) * -0.047);
  float dz = amplitud * (cos(f1) * 0.061 + 0.6 * cos(f2) * 0.118);
  vNormalMundo = normalize(vec3(-dx, 1.0, -dz));
  vPosicionMundo = mundo.xyz;
  vec4 mvPosition = viewMatrix * mundo;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAGMENTO = /* glsl */ `
precision mediump float;
#include <fog_pars_fragment>
uniform vec3 hondo;
uniform vec3 reflejo;
uniform vec3 brasa;
uniform vec2 sol;
uniform float tiempo;
uniform float brillo;
varying vec3 vNormalMundo;
varying vec3 vPosicionMundo;

void main() {
  vec3 haciaLaCamara = normalize(cameraPosition - vPosicionMundo);
  float coseno = max(dot(normalize(vNormalMundo), haciaLaCamara), 0.0);
  float fresnel = pow(1.0 - coseno, 3.0);
  vec3 color = mix(hondo, reflejo, fresnel);

  /* La franja de la brasa: a lo largo del eje del sol, estrecha cerca y ancha lejos, rota por las olas. */
  float a = dot(vPosicionMundo.xz, sol);
  float lateral = dot(vPosicionMundo.xz, vec2(-sol.y, sol.x));
  float ancho = 10.0 + a * 0.16;
  float franja = smoothstep(18.0, 160.0, a) * exp(-(lateral * lateral) / (ancho * ancho));
  float rizo = 0.55 + 0.45 * sin(vPosicionMundo.x * 0.9 + tiempo * 1.7) * sin(vPosicionMundo.z * 0.7 - tiempo * 1.1);
  color += brasa * franja * rizo * brillo * (0.35 + 0.65 * fresnel);

  gl_FragColor = vec4(color, 1.0);
  /* En el mismo orden que los sombreadores de three: tono, espacio de color y, al final, la niebla. */
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export interface UniformsDelAgua extends Record<string, THREE.IUniform> {
  tiempo: { value: number };
  amplitud: { value: number };
  hondo: { value: THREE.Color };
  reflejo: { value: THREE.Color };
  brasa: { value: THREE.Color };
  sol: { value: THREE.Vector2 };
  brillo: { value: number };
}

export function materialDelAgua(sol: { readonly x: number; readonly z: number }): THREE.ShaderMaterial & { uniforms: UniformsDelAgua } {
  const uniforms: UniformsDelAgua = {
    tiempo: { value: 0 },
    amplitud: { value: 0.07 },
    hondo: { value: new THREE.Color(COLOR_HONDO) },
    reflejo: { value: new THREE.Color(COLOR_DEL_REFLEJO) },
    brasa: { value: new THREE.Color(COLOR_DE_LA_BRASA_EN_EL_AGUA) },
    sol: { value: new THREE.Vector2(sol.x, sol.z) },
    brillo: { value: 1 },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTICE,
    fragmentShader: FRAGMENTO,
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...uniforms },
    fog: true,
    side: THREE.FrontSide,
  });
  return material as THREE.ShaderMaterial & { uniforms: UniformsDelAgua };
}

/**
 * El disco de mar: anillos que crecen geométricamente desde `radioInterior` hasta
 * `radioExterior`. Los valores de serie viven en `presupuesto.ts` para que el
 * comprobador cuente los mismos triángulos que aquí se dibujan.
 */
export function geometriaDelMar(
  radioInterior = RADIO_INTERIOR_DEL_MAR,
  radioExterior = RADIO_EXTERIOR_DEL_MAR,
  sectores = SECTORES_DEL_MAR,
  razon = RAZON_DEL_MAR,
): THREE.BufferGeometry {
  const radios: number[] = [0];
  for (let r = radioInterior; r < radioExterior; r *= razon) radios.push(r);
  radios.push(radioExterior);
  const anillos = radios.length;
  const posiciones: number[] = [];
  for (let i = 0; i < anillos; i++) {
    const r = radios[i] ?? 0;
    for (let s = 0; s < sectores; s++) {
      const a = (s / sectores) * Math.PI * 2;
      posiciones.push(Math.cos(a) * r, 0, Math.sin(a) * r);
    }
  }
  const indices: number[] = [];
  for (let i = 0; i + 1 < anillos; i++) {
    for (let s = 0; s < sectores; s++) {
      const s1 = (s + 1) % sectores;
      const a = i * sectores + s;
      const b = i * sectores + s1;
      const c = (i + 1) * sectores + s;
      const d = (i + 1) * sectores + s1;
      if (i === 0) {
        /* El anillo cero es el centro repetido: sólo un triángulo por sector. */
        indices.push(a, d, c);
      } else {
        indices.push(a, d, c, a, b, d);
      }
    }
  }
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
  geometria.setIndex(indices);
  geometria.computeBoundingSphere();
  return geometria;
}
