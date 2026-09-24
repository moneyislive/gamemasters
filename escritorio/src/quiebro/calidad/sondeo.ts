/**
 * EL SONDEO DEL APARATO: lo que la gráfica PUEDE, probado pintando, no preguntado.
 *
 * ═══ POR QUÉ SE PINTA EN VEZ DE PREGUNTAR ═══
 *
 * `getExtension` dice lo que el navegador ANUNCIA, y hay dos casos apuntados en la casa en que el
 * anuncio no basta: un blanco HalfFloat sin `EXT_color_buffer_half_float` ni `_float` sale negro sin
 * un solo error (el compositor pintaría la noche en negro y el gobernador no se enteraría, porque un
 * negro rápido tiene muy buen tiempo de fotograma), y expo-gl anuncia `OES_texture_float_linear`,
 * ASTC y ETC que luego no tiene. Aquí nada se da por bueno sin crearlo y leerlo de vuelta:
 *
 *   · MEDIA COMA FLOTANTE: se crea un blanco `HalfFloatType`, se exige `FRAMEBUFFER_COMPLETE`, se
 *     pinta un 2,0 (mayor que 1: un blanco de 8 bits lo recortaría a 1) y se lee a través de un
 *     segundo pase que escribe `r × 0,25` en un blanco de 8 bits: sólo si sale 128 (±3) el blanco
 *     guarda de verdad valores por encima de 1. Es lo que el compositor pleno necesita.
 *   · FLOTANTE EN EL SOMBREADOR DE VÉRTICES: three r185 guarda los huesos de cada esqueleto en una
 *     textura `FloatType` y la lee con `texelFetch` DESDE LOS VÉRTICES. Se sube una textura de un
 *     texel con 1234,5 —que la media coma flotante no puede guardar: sólo tiene 11 bits de mantisa—,
 *     se lee en un sombreador de vértices y se pinta la parte decimal: 0,5 → 128. Si falla, los
 *     personajes con esqueleto no funcionarían en ningún nivel, y el frente de personajes tiene que
 *     saberlo (lo lee de aquí).
 *
 * Lo demás (nombre de la gráfica, núcleos, memoria, pantalla, táctil) son pistas y se leen tal cual.
 *
 * ═══ UNA VEZ POR RENDERIZADOR ═══
 *
 * Se guarda en un `WeakMap` por renderizador: llamarlo en cada pintado de React, o dos veces por el
 * modo estricto, no vuelve a pintar nada. Cuesta dos programas diminutos y dos lecturas de un píxel
 * (unos milisegundos, una vez). Deja el renderizador como estaba (el blanco activo), y si algo
 * revienta, devuelve las pistas que se pudieron leer con `fallo` explicado, en vez de tumbar la escena.
 */
import * as THREE from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import type { CapacidadesDelAparato } from './capacidades';
import { CAPACIDADES_MINIMAS } from './capacidades';

const SONDEOS = new WeakMap<THREE.WebGLRenderer, CapacidadesDelAparato>();

/** Tolerancia al leer 128 de vuelta: el redondeo de 8 bits y algún conductor que redondea raro. */
const TOLERANCIA = 3;

export function sondearElAparato(renderer: THREE.WebGLRenderer): CapacidadesDelAparato {
  const ya = SONDEOS.get(renderer);
  if (ya !== undefined) return ya;
  let capacidades: CapacidadesDelAparato;
  try {
    capacidades = sondear(renderer);
  } catch (e) {
    capacidades = { ...CAPACIDADES_MINIMAS, ...pistasDelNavegador(), fallo: e instanceof Error ? e.message : String(e) };
  }
  SONDEOS.set(renderer, capacidades);
  return capacidades;
}

function sondear(renderer: THREE.WebGLRenderer): CapacidadesDelAparato {
  const gl = renderer.getContext();
  const webgl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
  const previo = renderer.getRenderTarget();
  try {
    return {
      webgl2,
      mediaFlotante: webgl2 && guardaMasDeUno(renderer, gl as WebGL2RenderingContext),
      flotanteEnVertices: webgl2 && renderer.capabilities.maxVertexTextures > 0 && leeFlotanteEnVertices(renderer),
      multiDibujo: gl.getExtension('WEBGL_multi_draw') !== null,
      texturaMaxima: renderer.capabilities.maxTextureSize,
      muestrasMaximas: renderer.capabilities.maxSamples,
      cronometroDeGpu: gl.getExtension('EXT_disjoint_timer_query_webgl2') !== null,
      grafica: nombreDeLaGrafica(gl),
      ...pistasDelNavegador(),
      fallo: null,
    };
  } finally {
    renderer.setRenderTarget(previo);
  }
}

/** El vértice de los dos pases de prueba: el triángulo que cubre la pantalla de `FullScreenQuad`. */
const VERTICE_PLANO = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

function guardaMasDeUno(renderer: THREE.WebGLRenderer, gl: WebGL2RenderingContext): boolean {
  const blanco = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false });
  const lectura = new THREE.WebGLRenderTarget(1, 1, { type: THREE.UnsignedByteType, depthBuffer: false });
  const escribir = new THREE.ShaderMaterial({
    vertexShader: VERTICE_PLANO,
    fragmentShader: /* glsl */ `void main() { gl_FragColor = vec4(2.0, 0.5, 0.0, 1.0); }`,
    depthTest: false,
    depthWrite: false,
  });
  const leer = new THREE.ShaderMaterial({
    uniforms: { tFuente: { value: blanco.texture } },
    vertexShader: VERTICE_PLANO,
    fragmentShader: /* glsl */ `
uniform sampler2D tFuente;
varying vec2 vUv;
void main() { gl_FragColor = vec4(texture2D(tFuente, vec2(0.5)).r * 0.25, 0.0, 0.0, 1.0); }`,
    depthTest: false,
    depthWrite: false,
  });
  const cuadro = new FullScreenQuad(escribir);
  try {
    renderer.setRenderTarget(blanco);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) return false;
    cuadro.render(renderer);
    cuadro.material = leer;
    renderer.setRenderTarget(lectura);
    cuadro.render(renderer);
    const pixel = new Uint8Array(4);
    renderer.readRenderTargetPixels(lectura, 0, 0, 1, 1, pixel);
    return Math.abs((pixel[0] ?? 0) - 128) <= TOLERANCIA;
  } finally {
    blanco.dispose();
    lectura.dispose();
    escribir.dispose();
    leer.dispose();
  }
}

function leeFlotanteEnVertices(renderer: THREE.WebGLRenderer): boolean {
  const datos = new THREE.DataTexture(new Float32Array([0, 1234.5, 0, 1]), 1, 1, THREE.RGBAFormat, THREE.FloatType);
  datos.needsUpdate = true;
  const lectura = new THREE.WebGLRenderTarget(1, 1, { type: THREE.UnsignedByteType, depthBuffer: false });
  const material = new THREE.ShaderMaterial({
    uniforms: { tDatos: { value: datos } },
    vertexShader: /* glsl */ `
uniform sampler2D tDatos;
varying float vValor;
void main() {
  vValor = texelFetch(tDatos, ivec2(0, 0), 0).g - 1234.0;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`,
    fragmentShader: /* glsl */ `
varying float vValor;
void main() { gl_FragColor = vec4(vValor, 0.0, 0.0, 1.0); }`,
    depthTest: false,
    depthWrite: false,
  });
  const cuadro = new FullScreenQuad(material);
  try {
    renderer.setRenderTarget(lectura);
    cuadro.render(renderer);
    const pixel = new Uint8Array(4);
    renderer.readRenderTargetPixels(lectura, 0, 0, 1, 1, pixel);
    return Math.abs((pixel[0] ?? 0) - 128) <= TOLERANCIA;
  } finally {
    datos.dispose();
    lectura.dispose();
    material.dispose();
  }
}

/**
 * El nombre de la gráfica. Firefox ya da el nombre (saneado) en `RENDERER` y avisa de que retirará
 * `WEBGL_debug_renderer_info`; Chromium y Safari dan «WebKit WebGL» en `RENDERER` y el nombre de
 * verdad sólo por la extensión. Se mira primero lo llano y sólo si no dice nada, la extensión.
 */
function nombreDeLaGrafica(gl: WebGLRenderingContext | WebGL2RenderingContext): string {
  const llano: unknown = gl.getParameter(gl.RENDERER);
  if (typeof llano === 'string' && llano !== '' && !/^(webkit webgl|mozilla)$/i.test(llano.trim())) return llano;
  const extension = gl.getExtension('WEBGL_debug_renderer_info');
  if (extension !== null) {
    const desenmascarado: unknown = gl.getParameter(extension.UNMASKED_RENDERER_WEBGL);
    if (typeof desenmascarado === 'string') return desenmascarado;
  }
  return '';
}

/** Lo que dice el navegador sin preguntar a la gráfica. Cada cosa, protegida: en Node no hay nada. */
function pistasDelNavegador(): Pick<CapacidadesDelAparato, 'nucleos' | 'memoriaGb' | 'pantalla' | 'tactil'> {
  const nav: (Navigator & { readonly deviceMemory?: unknown }) | null = typeof navigator === 'undefined' ? null : navigator;
  const nucleos = nav !== null && typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency > 0 ? nav.hardwareConcurrency : null;
  const memoriaGb = nav !== null && typeof nav.deviceMemory === 'number' && nav.deviceMemory > 0 ? nav.deviceMemory : null;
  const pantalla =
    typeof window === 'undefined'
      ? { ancho: 0, alto: 0, dpr: 1 }
      : { ancho: window.screen.width, alto: window.screen.height, dpr: window.devicePixelRatio > 0 ? window.devicePixelRatio : 1 };
  const tactil = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  return { nucleos, memoriaGb, pantalla, tactil };
}
