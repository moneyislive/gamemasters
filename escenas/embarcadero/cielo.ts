/**
 * EL CIELO DEL MUELLE: una cúpula con el degradado de la hora azul.
 *
 * ═══ POR QUÉ UNA CÚPULA Y NO UN COLOR DE FONDO ═══
 *
 * Un `<color attach="background">` es un color plano: no tiene horizonte, no
 * tiene cénit y no puede tener la franja de brasa de seis grados que es lo que
 * dice «acaba de ponerse el sol». La cúpula es una esfera vista por dentro que
 * pinta por DIRECCIÓN: del cénit `#0B1020` al medio `#1B2340`, y sobre el
 * horizonte, hacia donde se fue el sol, la brasa `#E2603A → #F0A35A`. Bajo el
 * horizonte se cierra al color de la niebla, que es el mismo con el que se
 * funde el mar: así el horizonte no es una línea sino una bruma.
 *
 * ═══ LA MEZCLA HACIA EL TABLERO ═══
 *
 * Al zarpar, el cielo interpola hacia el `#9EC9E2` del mediodía del tablero. Va
 * por un `uniform` (`amanecer`, 0 a 1) para que la transición no reconstruya el
 * material: se cambia un número por fotograma y ya.
 *
 * ═══ GLSL CONSERVADOR, COMO EL AGUA ═══
 *
 * Mismo texto para WebGL2 y `expo-gl`: `mediump`, sin texturas, sin extensiones.
 * Sin niebla —es el propio fondo— y sin escribir profundidad, para que nada
 * quede detrás de ella.
 */
import * as THREE from 'three';

export const COLOR_DEL_CENIT = '#0b1020';
export const COLOR_DEL_MEDIO = '#1b2340';
export const COLOR_DE_LA_BRASA = '#e2603a';
export const COLOR_DE_LA_BRASA_ALTA = '#f0a35a';
/** El color del horizonte, que es el de la niebla y donde se funde el mar. */
export const COLOR_DEL_HORIZONTE = '#232a4c';
/** El mediodía del tablero (`banco3d.tsx`). Adonde se amanece al zarpar. */
export const COLOR_DEL_TABLERO = '#9ec9e2';

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
uniform vec3 medio;
uniform vec3 horizonte;
uniform vec3 brasa;
uniform vec3 brasaAlta;
uniform vec3 tablero;
uniform vec2 sol;
uniform float amanecer;
varying vec3 vDireccion;

void main() {
  vec3 d = normalize(vDireccion);
  float altura = d.y;
  /* Del horizonte al medio en los primeros 18°, del medio al cénit hasta arriba. */
  float bajo = smoothstep(0.0, 0.31, altura);
  float alto = smoothstep(0.2, 1.0, altura);
  vec3 color = mix(mix(horizonte, medio, bajo), cenit, alto);

  /* La brasa: unos seis grados sobre el horizonte (sin 6° ≈ 0,105), más ancha hacia el sol. */
  float haciaElSol = max(dot(normalize(d.xz + vec2(1e-5, 0.0)), sol), 0.0);
  float abanico = pow(haciaElSol, 3.0);
  float franja = smoothstep(-0.03, 0.02, altura) * (1.0 - smoothstep(0.03, 0.105 + 0.06 * abanico, altura));
  vec3 colorDeBrasa = mix(brasa, brasaAlta, smoothstep(0.0, 0.08, altura));
  color = mix(color, colorDeBrasa, franja * (0.25 + 0.75 * abanico));

  /* Bajo el horizonte: niebla. */
  color = mix(horizonte, color, smoothstep(-0.08, 0.0, altura));

  /* El amanecer del tablero: un cielo de mediodía más claro en el horizonte. */
  vec3 mediodia = mix(tablero * 1.08, tablero * 0.82, smoothstep(0.0, 0.9, altura));
  color = mix(color, mediodia, amanecer);

  gl_FragColor = vec4(color, 1.0);
  /*
   * Los dos pasos que three añade solo a SUS sombreadores: el mapeo tonal (ACES a
   * 0,95 en los dos clientes) y el paso al espacio de color de salida. Sin ellos
   * el cielo se escribiría lineal en un lienzo sRGB y saldría más oscuro que el
   * resto de la escena, con la costura justo en el horizonte.
   */
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/**
 * Los `uniforms` con nombre Y con la firma de índice que `ShaderMaterial` exige:
 * sin extender `Record` el tipo no es asignable y el error habla de índices, no
 * de cielos.
 */
export interface UniformsDelCielo extends Record<string, THREE.IUniform> {
  cenit: { value: THREE.Color };
  medio: { value: THREE.Color };
  horizonte: { value: THREE.Color };
  brasa: { value: THREE.Color };
  brasaAlta: { value: THREE.Color };
  tablero: { value: THREE.Color };
  sol: { value: THREE.Vector2 };
  amanecer: { value: number };
}

export function materialDelCielo(sol: { readonly x: number; readonly z: number }): THREE.ShaderMaterial & { uniforms: UniformsDelCielo } {
  const uniforms: UniformsDelCielo = {
    cenit: { value: new THREE.Color(COLOR_DEL_CENIT) },
    medio: { value: new THREE.Color(COLOR_DEL_MEDIO) },
    horizonte: { value: new THREE.Color(COLOR_DEL_HORIZONTE) },
    brasa: { value: new THREE.Color(COLOR_DE_LA_BRASA) },
    brasaAlta: { value: new THREE.Color(COLOR_DE_LA_BRASA_ALTA) },
    tablero: { value: new THREE.Color(COLOR_DEL_TABLERO) },
    sol: { value: new THREE.Vector2(sol.x, sol.z).normalize() },
    amanecer: { value: 0 },
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
  return material as THREE.ShaderMaterial & { uniforms: UniformsDelCielo };
}

/** El color de la niebla para un grado de amanecer: del horizonte de la hora azul al cielo del tablero. */
export function colorDeLaNiebla(amanecer: number, destino = new THREE.Color()): THREE.Color {
  const a = new THREE.Color(COLOR_DEL_HORIZONTE);
  const b = new THREE.Color(COLOR_DEL_TABLERO);
  return destino.copy(a).lerp(b, Math.min(1, Math.max(0, amanecer)));
}
