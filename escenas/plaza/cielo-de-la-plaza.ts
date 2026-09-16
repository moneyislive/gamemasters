/**
 * EL CIELO DE LA PLAZA: una cúpula con el degradado de la tarde que se va al
 * mediodía del tablero mientras se zarpa.
 *
 * ═══ POR QUÉ UNA CÚPULA CON SOMBREADOR Y NO UN COLOR DE FONDO ═══
 *
 * Por lo mismo que en el Muelle (`embarcadero/cielo.ts`): un color plano no tiene
 * horizonte ni cénit, y aquí hace falta además un SOL —un halo cálido bajo, detrás
 * de la cámara— que es lo que cuenta la hora. Y hace falta que todo eso se pueda
 * mover con UN número: al zarpar, el cielo, el halo y la niebla interpolan hacia el
 * mediodía del tablero (`tarde.ts`), y eso es un `uniform` por fotograma, no una
 * reconstrucción del material.
 *
 * ═══ EL DEGRADADO NO ES LINEAL EN LA ALTURA, A PROPÓSITO ═══
 *
 * Con una mezcla lineal el horizonte cálido se come medio cielo. Con la raíz
 * (`pow(altura, 0.55)`) el cambio se concentra donde de verdad está —los primeros
 * veinte grados sobre el horizonte— y arriba queda el azul limpio de una tarde
 * despejada.
 *
 * ═══ GLSL CONSERVADOR, COMO EL AGUA Y EL CIELO DEL MUELLE ═══
 *
 * Mismo texto para WebGL2 y `expo-gl`: `mediump`, sin texturas, sin extensiones, sin
 * bucles. Sin niebla —es el propio fondo— y sin escribir profundidad. Los dos
 * `#include` del final son los que `three` añade sólo a SUS materiales: sin ellos el
 * cielo se escribiría lineal en un lienzo sRGB y saldría un paso más oscuro que el
 * resto, con la costura en el horizonte.
 */
import * as THREE from 'three';
import { MEDIODIA_DEL_TABLERO, TARDE, mezclaDeNumeros } from './tarde';

const VERTICE = /* glsl */ `
precision mediump float;
varying vec3 vDireccion;
void main() {
  vDireccion = normalize(position);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  /* Pegado al plano lejano: la cúpula nunca tapa nada. */
  gl_Position.z = gl_Position.w * 0.99999;
}
`;

const FRAGMENTO = /* glsl */ `
precision mediump float;
uniform vec3 cenit;
uniform vec3 horizonte;
uniform vec3 resplandor;
uniform vec3 cenitFin;
uniform vec3 horizonteFin;
uniform vec3 resplandorFin;
uniform vec3 sol;
uniform vec3 solFin;
uniform float mediodia;
varying vec3 vDireccion;

void main() {
  vec3 d = normalize(vDireccion);
  vec3 arriba = mix(cenit, cenitFin, mediodia);
  vec3 abajo = mix(horizonte, horizonteFin, mediodia);
  vec3 halo = mix(resplandor, resplandorFin, mediodia);
  vec3 haciaElSol = normalize(mix(sol, solFin, mediodia));

  float altura = clamp(d.y, 0.0, 1.0);
  vec3 color = mix(abajo, arriba, pow(altura, 0.55));

  /* El halo del sol: ancho y bajo a la tarde, y se apaga al llegar el mediodía. */
  float cerca = max(dot(d, haciaElSol), 0.0);
  float fuerza = (0.55 + 0.45 * pow(cerca, 24.0)) * pow(cerca, 5.0) * (1.0 - 0.85 * mediodia);
  color = mix(color, halo, clamp(fuerza, 0.0, 1.0));

  /* Bajo el horizonte no hay cielo: se cierra al mismo color, que es el de la niebla. */
  color = mix(abajo, color, smoothstep(-0.10, 0.0, d.y));

  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/** Con la firma de índice que `ShaderMaterial` exige; ver `UniformsDelCielo` del Muelle. */
export interface UniformsDelCieloDeLaPlaza extends Record<string, THREE.IUniform> {
  cenit: { value: THREE.Color };
  horizonte: { value: THREE.Color };
  resplandor: { value: THREE.Color };
  cenitFin: { value: THREE.Color };
  horizonteFin: { value: THREE.Color };
  resplandorFin: { value: THREE.Color };
  sol: { value: THREE.Vector3 };
  solFin: { value: THREE.Vector3 };
  /** 0 la tarde, 1 el mediodía del tablero. Lo mueve el zarpe. */
  mediodia: { value: number };
}

function vector(r: readonly [number, number, number]): THREE.Vector3 {
  return new THREE.Vector3(r[0], r[1], r[2]).normalize();
}

export function materialDelCieloDeLaPlaza(): THREE.ShaderMaterial & { uniforms: UniformsDelCieloDeLaPlaza } {
  const uniforms: UniformsDelCieloDeLaPlaza = {
    cenit: { value: new THREE.Color(TARDE.cenit) },
    horizonte: { value: new THREE.Color(TARDE.horizonte) },
    resplandor: { value: new THREE.Color(TARDE.resplandor) },
    cenitFin: { value: new THREE.Color(MEDIODIA_DEL_TABLERO.cenit) },
    horizonteFin: { value: new THREE.Color(MEDIODIA_DEL_TABLERO.horizonte) },
    resplandorFin: { value: new THREE.Color(MEDIODIA_DEL_TABLERO.resplandor) },
    sol: { value: vector(TARDE.rumboDelSol) },
    solFin: { value: vector(MEDIODIA_DEL_TABLERO.rumboDelSol) },
    mediodia: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTICE,
    fragmentShader: FRAGMENTO,
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: true,
    fog: false,
  });
  return material as THREE.ShaderMaterial & { uniforms: UniformsDelCieloDeLaPlaza };
}

/** El color de la niebla para un grado de mediodía: del de la tarde al del tablero. */
export function colorDeLaNieblaDeLaPlaza(mediodia: number, destino = new THREE.Color()): THREE.Color {
  return destino.set(TARDE.niebla).lerp(new THREE.Color(MEDIODIA_DEL_TABLERO.niebla), Math.min(1, Math.max(0, mediodia)));
}

/** Dónde empieza y dónde se cierra la niebla para un grado de mediodía. */
export function distanciasDeLaNiebla(mediodia: number): { readonly cerca: number; readonly lejos: number } {
  return {
    cerca: mezclaDeNumeros(TARDE.nieblaCerca, MEDIODIA_DEL_TABLERO.nieblaCerca, mediodia),
    lejos: mezclaDeNumeros(TARDE.nieblaLejos, MEDIODIA_DEL_TABLERO.nieblaLejos, mediodia),
  };
}

/** La dirección del sol para un grado de mediodía, ya normalizada. La usan la luz y el cielo. */
export function rumboDelSol(mediodia: number, destino = new THREE.Vector3()): THREE.Vector3 {
  return destino.copy(vector(TARDE.rumboDelSol)).lerp(vector(MEDIODIA_DEL_TABLERO.rumboDelSol), Math.min(1, Math.max(0, mediodia))).normalize();
}
