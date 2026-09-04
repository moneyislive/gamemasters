/**
 * LAS PARTÍCULAS: motas, humo, brumas y reflejos con un sprite calculado en JS.
 *
 * ═══ POR QUÉ EL SPRITE ES UNA `DataTexture` DE 16×16 Y NO UN PNG ═══
 *
 * Por lo mismo que las piezas llevan el color por vértice: en el móvil Hermes no
 * decodifica imágenes, y un PNG de una mota redonda saldría como un cuadrado o
 * como nada (`app/src/tres/texturas-nativas.ts`). Un disco suave son 256 píxeles
 * que se calculan en un bucle; se sube tal cual a la GPU y vale en los dos
 * clientes.
 *
 * ═══ PARPADEO POR VÉRTICE, NO POR MALLA ═══
 *
 * Cuatrocientas motas con la misma fase serían una nube que respira a la vez, o
 * sea un foco. Cada vértice lleva su `fase` y el sombreador la usa para el
 * vaivén y el brillo: una llamada de dibujo y cuatrocientos ritmos.
 *
 * ═══ LA TALLA ES EN UNIDADES DE MUNDO, Y LA PANTALLA SE MIDE ═══
 *
 * `gl_PointSize` va en píxeles del aparato y una mota tiene que medir lo mismo
 * en un móvil de tres píxeles por punto que en un monitor: por eso `talla` es el
 * diámetro en unidades de mundo y `escalaDePantalla` es cuántos píxeles ocupa
 * una unidad a un metro de la cámara (`escalaDePantallaDe`), que la escena
 * recalcula cuando cambian el alto del lienzo, la densidad o el campo de visión.
 * La primera versión usaba «talla 26 y medio alto de pantalla», que a ocho
 * unidades daba puntos de mil píxeles recortados por el driver.
 */
import * as THREE from 'three';

let sprite: THREE.DataTexture | null = null;

/** Un disco suave, alfa de 1 en el centro a 0 en el borde. Uno para toda la escena. */
export function spriteRedondo(): THREE.DataTexture {
  if (sprite !== null) return sprite;
  const lado = 16;
  const datos = new Uint8Array(lado * lado * 4);
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      const dx = (x + 0.5) / lado - 0.5;
      const dy = (y + 0.5) / lado - 0.5;
      const d = Math.min(1, Math.hypot(dx, dy) * 2);
      const a = Math.round(255 * Math.pow(1 - d, 2.2));
      const i = (y * lado + x) * 4;
      datos[i] = 255;
      datos[i + 1] = 255;
      datos[i + 2] = 255;
      datos[i + 3] = a;
    }
  }
  sprite = new THREE.DataTexture(datos, lado, lado, THREE.RGBAFormat);
  sprite.minFilter = THREE.LinearFilter;
  sprite.magFilter = THREE.LinearFilter;
  sprite.needsUpdate = true;
  return sprite;
}

/**
 * Suelta la copia de la GPU del sprite al desmontar la escena. La próxima que lo
 * pida recibe el mismo objeto y three lo vuelve a subir sola: `dispose` borra la
 * textura del contexto, no los píxeles de aquí.
 */
export function soltarSprite(): void {
  sprite?.dispose();
}

/** Píxeles por unidad de mundo a un metro de la cámara, para un alto de lienzo y un campo vertical. */
export function escalaDePantallaDe(altoEnPixeles: number, fovVertical: number): number {
  return altoEnPixeles / (2 * Math.tan((fovVertical * Math.PI) / 360));
}

const VERTICE = /* glsl */ `
precision mediump float;
attribute float fase;
uniform float tiempo;
uniform float talla;
uniform float escalaDePantalla;
uniform float vaiven;
varying float vBrillo;
void main() {
  vec3 p = position;
  p.y += sin(tiempo * 0.4 + fase * 6.2831) * vaiven;
  p.x += sin(tiempo * 0.23 + fase * 4.0) * vaiven * 0.8;
  p.z += cos(tiempo * 0.31 + fase * 5.0) * vaiven * 0.6;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(talla * escalaDePantalla / max(1.0, -mv.z), 1.0, 96.0);
  vBrillo = 0.3 + 0.7 * (0.5 + 0.5 * sin(tiempo * (1.2 + fase * 2.4) + fase * 20.0));
}
`;

const FRAGMENTO = /* glsl */ `
precision mediump float;
uniform sampler2D mapa;
uniform vec3 color;
uniform float opacidad;
varying float vBrillo;
void main() {
  float a = texture2D(mapa, gl_PointCoord).a * vBrillo * opacidad;
  gl_FragColor = vec4(color * a, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/** Con la firma de índice que `ShaderMaterial` exige; ver `UniformsDelCielo`. */
export interface UniformsDeMotas extends Record<string, THREE.IUniform> {
  tiempo: { value: number };
  /** Diámetro en unidades de mundo. */
  talla: { value: number };
  escalaDePantalla: { value: number };
  vaiven: { value: number };
  mapa: { value: THREE.Texture };
  color: { value: THREE.Color };
  opacidad: { value: number };
}

/** El material aditivo de unos `Points` con parpadeo por vértice. `talla` en unidades de mundo. */
export function materialDeMotas(color: string, talla: number, vaiven = 0.3): THREE.ShaderMaterial & { uniforms: UniformsDeMotas } {
  const uniforms: UniformsDeMotas = {
    tiempo: { value: 0 },
    talla: { value: talla },
    escalaDePantalla: { value: 800 },
    vaiven: { value: vaiven },
    mapa: { value: spriteRedondo() },
    color: { value: new THREE.Color(color) },
    opacidad: { value: 1 },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTICE,
    fragmentShader: FRAGMENTO,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return material as THREE.ShaderMaterial & { uniforms: UniformsDeMotas };
}

/** `n` motas repartidas en una caja, con su fase, con un sorteo dado. */
export function geometriaDeMotas(
  n: number,
  caja: { readonly x: [number, number]; readonly y: [number, number]; readonly z: [number, number] },
  azar: () => number,
): THREE.BufferGeometry {
  const posiciones = new Float32Array(n * 3);
  const fases = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    posiciones[i * 3] = caja.x[0] + (caja.x[1] - caja.x[0]) * azar();
    posiciones[i * 3 + 1] = caja.y[0] + (caja.y[1] - caja.y[0]) * azar();
    posiciones[i * 3 + 2] = caja.z[0] + (caja.z[1] - caja.z[0]) * azar();
    fases[i] = azar();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
  g.setAttribute('fase', new THREE.BufferAttribute(fases, 1));
  g.computeBoundingSphere();
  return g;
}

/** El material de los planos aditivos (brumas, humo, reflejos): un sprite suave con color por instancia. */
export function materialDePlanoSuave(opacidad = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map: spriteRedondo(),
    transparent: true,
    opacity: opacidad,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
  });
}
