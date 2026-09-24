/**
 * LOS RÓTULOS DE NEÓN con los textos inventados del barrio: los de encima de las tiendas, planos
 * sobre la fachada, y las banderolas verticales de las plantas de arriba.
 *
 * ═══ EL TEXTO SE ESCRIBE UNA VEZ, EN UN ATLAS ═══
 *
 * Cada rótulo tiene su hueco en una sola textura (un lienzo 2D del navegador, 96 píxeles por metro)
 * donde se escribe su texto en blanco con el resplandor del tubo ya hecho (una pasada con sombra
 * difusa y otra con el contorno fino). El sombreador colorea: el color del rótulo donde hay luz y
 * blanco donde la luz satura, que es como se ve un tubo de neón a través de la lluvia. Todos los
 * rótulos son UNA malla y UNA llamada, aditiva, con su parpadeo propio los que parpadean.
 *
 * La caja del rótulo (la chapa oscura de detrás, la banderola que sale del muro) es geometría del
 * mobiliario: se ve apagada de día y hace de fondo de noche.
 *
 * En Node (el comprobador) no hay lienzo: se construye la geometría igual y la textura se queda
 * en un téxel negro. Lo que se mide —triángulos y llamadas— es lo mismo.
 */
import * as THREE from 'three';
import { nieblaEn } from '../atmosfera/niebla';
import type { Molde } from './geometria';
import { ACABADO, lineal } from './materiales';
import { normalDe } from './fachadas';
import { UNIFORMES_DE_LA_CIUDAD } from './retoques';
import type { RotuloDelPlano } from './tipos';

const PIXELES_POR_METRO = 96;
const ANCHO_DEL_ATLAS = 1024;

/** Una fuente de luz de un rótulo, para hornear, reflejar y hacer halo. */
export interface FuenteDeRotulo {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly tamano: number;
  readonly color: [number, number, number];
  readonly normal: readonly [number, number];
  readonly parpadeo: number;
}

interface Hueco {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Empaquetado por estanterías: cada rótulo, un rectángulo de su tamaño en píxeles. */
function empaquetar(medidas: readonly (readonly [number, number])[]): { huecos: Hueco[]; alto: number } {
  const huecos: Hueco[] = [];
  let x = 0;
  let y = 0;
  let fila = 0;
  for (const [w, h] of medidas) {
    if (x + w > ANCHO_DEL_ATLAS) {
      x = 0;
      y += fila + 2;
      fila = 0;
    }
    huecos.push({ x, y, w, h });
    x += w + 2;
    fila = Math.max(fila, h);
  }
  let alto = 1;
  while (alto < y + fila) alto *= 2;
  return { huecos, alto: Math.min(alto, 4096) };
}

/** Escribe el texto de un rótulo en su hueco, en blanco, con el resplandor del tubo. */
function escribir(ctx: CanvasRenderingContext2D, r: RotuloDelPlano, h: Hueco): void {
  const vertical = r.forma === 'bandera';
  ctx.save();
  ctx.beginPath();
  ctx.rect(h.x, h.y, h.w, h.h);
  ctx.clip();
  const texto = r.texto.toUpperCase();
  const pasadas = (dibujar: (glow: boolean) => void): void => {
    ctx.shadowColor = 'rgba(255,255,255,0.9)';
    ctx.shadowBlur = 14;
    ctx.globalAlpha = 0.55;
    dibujar(true);
    ctx.shadowBlur = 4;
    ctx.globalAlpha = 1;
    dibujar(false);
  };
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (!vertical) {
    let talla = h.h * 0.62;
    ctx.font = `bold ${String(Math.round(talla))}px "Trebuchet MS", "Arial Narrow", Arial, sans-serif`;
    const ancho = ctx.measureText(texto).width;
    if (ancho > h.w * 0.88) {
      talla *= (h.w * 0.88) / ancho;
      ctx.font = `bold ${String(Math.round(talla))}px "Trebuchet MS", "Arial Narrow", Arial, sans-serif`;
    }
    ctx.lineWidth = Math.max(1.5, talla * 0.07);
    pasadas((glow) => {
      if (glow) ctx.fillText(texto, h.x + h.w / 2, h.y + h.h / 2);
      else ctx.strokeText(texto, h.x + h.w / 2, h.y + h.h / 2);
    });
  } else {
    const letras = [...texto.replace(/\s+/g, ' ')];
    const paso = h.h / (letras.length + 1);
    const talla = Math.min(h.w * 0.66, paso * 0.95);
    ctx.font = `bold ${String(Math.round(talla))}px "Trebuchet MS", "Arial Narrow", Arial, sans-serif`;
    ctx.lineWidth = Math.max(1.5, talla * 0.08);
    pasadas((glow) => {
      letras.forEach((l, i) => {
        const y = h.y + paso * (i + 1);
        if (glow) ctx.fillText(l, h.x + h.w / 2, y);
        else ctx.strokeText(l, h.x + h.w / 2, y);
      });
    });
  }
  ctx.restore();
}

const VERTICE = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
attribute vec4 aNeon;
varying vec2 vUvN;
varying vec3 vColorN;
varying float vParpadeoN;
void main() {
  vUvN = uv;
  vColorN = aNeon.rgb;
  vParpadeoN = aNeon.a;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAGMENTO = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform sampler2D uAtlas;
uniform float uTiempo;
varying vec2 vUvN;
varying vec3 vColorN;
varying float vParpadeoN;
float parpadeoN(float s, float t) {
  if (s <= 0.0) return 1.0;
  float k = floor(t * 7.0 + s * 13.0);
  float h = fract(sin(k * 12.9898 + s * 78.233) * 43758.5453);
  float racha = step(0.82, fract(sin(floor(t * 0.4 + s) * 91.7) * 4375.85));
  return mix(1.0, step(0.45, h), racha);
}
void main() {
  float l = texture2D(uAtlas, vUvN).r;
  if (l < 0.01) discard;
  float encendido = parpadeoN(vParpadeoN, uTiempo);
  vec3 color = vColorN * l * 2.4 + vec3(1.0, 0.95, 0.95) * smoothstep(0.75, 1.0, l) * 1.4;
  gl_FragColor = vec4(color * encendido, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export interface RotulosConstruidos {
  readonly malla: THREE.Mesh;
  readonly fuentes: readonly FuenteDeRotulo[];
  liberar(): void;
}

export function construirLosRotulos(rotulos: readonly RotuloDelPlano[], mobiliario: Molde): RotulosConstruidos {
  const medidas = rotulos.map((r): [number, number] =>
    r.forma === 'bandera'
      ? [Math.max(8, Math.round(r.ancho * PIXELES_POR_METRO)), Math.max(8, Math.round(r.alto * PIXELES_POR_METRO))]
      : [Math.max(8, Math.round(r.ancho * PIXELES_POR_METRO)), Math.max(8, Math.round(r.alto * PIXELES_POR_METRO))],
  );
  const { huecos, alto } = empaquetar(medidas);

  /* ─── La textura: sólo donde hay un lienzo (el navegador) ─── */
  let textura: THREE.Texture;
  if (typeof document !== 'undefined') {
    const lienzo = document.createElement('canvas');
    lienzo.width = ANCHO_DEL_ATLAS;
    lienzo.height = alto;
    const ctx = lienzo.getContext('2d');
    if (ctx !== null) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, lienzo.width, lienzo.height);
      rotulos.forEach((r, i) => escribir(ctx, r, huecos[i] as Hueco));
    }
    const t = new THREE.CanvasTexture(lienzo);
    t.colorSpace = THREE.NoColorSpace;
    t.anisotropy = 4;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    textura = t;
  } else {
    const t = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    t.needsUpdate = true;
    textura = t;
  }

  /* ─── La geometría: la cara del texto (aditiva) y, en el mobiliario, su caja ─── */
  const pos: number[] = [];
  const uvs: number[] = [];
  const neon: number[] = [];
  const idx: number[] = [];
  const fuentes: FuenteDeRotulo[] = [];
  const cara = (p: readonly (readonly [number, number, number])[], h: Hueco, c: readonly [number, number, number], s: number): void => {
    const base = pos.length / 3;
    const u0 = h.x / ANCHO_DEL_ATLAS;
    const u1 = (h.x + h.w) / ANCHO_DEL_ATLAS;
    /* El lienzo tiene la y hacia abajo y la textura con flipY la da la vuelta: arriba del hueco = v alto. */
    const v1 = 1 - h.y / alto;
    const v0 = 1 - (h.y + h.h) / alto;
    const uv: readonly (readonly [number, number])[] = [
      [u0, v0],
      [u1, v0],
      [u1, v1],
      [u0, v1],
    ];
    for (let i = 0; i < 4; i++) {
      const q = p[i] as readonly [number, number, number];
      const t = uv[i] as readonly [number, number];
      pos.push(q[0], q[1], q[2]);
      uvs.push(t[0], t[1]);
      neon.push(c[0], c[1], c[2], s);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  rotulos.forEach((r, i) => {
    const h = huecos[i] as Hueco;
    const [nx, nz] = normalDe(r.mira);
    /* T: a la derecha de quien mira la fachada. */
    const tx = nz;
    const tz = -nx;
    const color = lineal(r.color);
    const semilla = r.parpadea ? 1 + (i % 11) : 0;
    const y0 = r.y - r.alto / 2;
    const y1 = r.y + r.alto / 2;
    mobiliario.color(0.012, 0.013, 0.014);
    mobiliario.poner('aAcabado', ACABADO.chapa[0], ACABADO.chapa[1]);
    if (r.forma === 'fachada') {
      const f = 0.1;
      const a = r.ancho / 2;
      const p = (s: number, y: number, fuera: number): [number, number, number] => [r.x + tx * s + nx * fuera, y, r.z + tz * s + nz * fuera];
      /* La chapa de detrás: una caja fina de 8 cm pegada al muro. */
      const esquinas = [p(-a - 0.1, y0 - 0.08, 0), p(a + 0.1, y1 + 0.08, 0.08)];
      const [e0, e1] = esquinas as [[number, number, number], [number, number, number]];
      mobiliario.caja(Math.min(e0[0], e1[0]), e0[1], Math.min(e0[2], e1[2]), Math.max(e0[0], e1[0]), e1[1], Math.max(e0[2], e1[2]), 'nseoab');
      cara([p(-a, y0, f), p(a, y0, f), p(a, y1, f), p(-a, y1, f)], h, color, semilla);
      fuentes.push({ x: r.x + nx * 0.2, y: r.y, z: r.z + nz * 0.2, tamano: r.ancho, color, normal: [nx, nz], parpadeo: semilla });
    } else {
      /* La banderola: una caja de 22 cm de grueso que sale del muro de 0,15 a 0,15 + ancho. */
      const g = 0.11;
      const d0 = 0.15;
      const d1 = d0 + r.ancho;
      const p = (lado: number, fuera: number, y: number): [number, number, number] => [r.x + tx * lado + nx * fuera, y, r.z + tz * lado + nz * fuera];
      const a0 = p(-g, d0, y0);
      const a1 = p(g, d1, y1);
      mobiliario.caja(Math.min(a0[0], a1[0]), y0, Math.min(a0[2], a1[2]), Math.max(a0[0], a1[0]), y1, Math.max(a0[2], a1[2]), 'nseoab');
      /* El texto por las dos caras, leído de arriba abajo y sin espejo en ninguna. */
      /* Por la cara +T, la derecha de quien mira es hacia el muro; por la −T, hacia fuera. */
      cara([p(g + 0.01, d1 - 0.05, y0), p(g + 0.01, d0 + 0.05, y0), p(g + 0.01, d0 + 0.05, y1), p(g + 0.01, d1 - 0.05, y1)], h, color, semilla);
      cara([p(-g - 0.01, d0 + 0.05, y0), p(-g - 0.01, d1 - 0.05, y0), p(-g - 0.01, d1 - 0.05, y1), p(-g - 0.01, d0 + 0.05, y1)], h, color, semilla);
      fuentes.push({ x: r.x + nx * (d0 + r.ancho / 2), y: r.y, z: r.z + nz * (d0 + r.ancho / 2), tamano: r.alto * 0.7, color, normal: [nx, nz], parpadeo: semilla });
    }
  });

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setAttribute('aNeon', new THREE.Float32BufferAttribute(neon, 4));
  g.setIndex(idx);
  g.computeBoundingSphere();
  const material = materialDeLosNeones(textura);
  const malla = new THREE.Mesh(g, material);
  malla.name = 'quiebro-neones';
  malla.renderOrder = 2;
  return {
    malla,
    fuentes,
    liberar(): void {
      g.dispose();
      material.dispose();
      textura.dispose();
    },
  };
}

/** El material de los neones: aditivo, a dos caras, coloreando lo que el atlas trae en blanco. */
export function materialDeLosNeones(textura: THREE.Texture): THREE.ShaderMaterial {
  const material = new THREE.ShaderMaterial({
    name: 'quiebro-neones',
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uAtlas: { value: textura },
      uTiempo: UNIFORMES_DE_LA_CIUDAD.uTiempo,
    },
    vertexShader: VERTICE,
    fragmentShader: FRAGMENTO,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: true,
  });
  nieblaEn(material);
  return material;
}

/* ═══════════════════════════════ LA CIUDAD ABIERTA: RÓTULOS DE GLIFOS ═══════════════════════════════ */

/*
 * En la ciudad abierta los rótulos se pintan por la VENTANA DE CELDAS (`celdas.ts`): la malla de los
 * neones tiene lo de las celdas cercanas y cambia al andar, sin cambiar de llamada. Un atlas con un hueco
 * por rótulo no sirve ahí: la ciudad tiene cientos de rótulos (un atlas de 4.096 de alto no los cabe) y
 * rehacerlo al cambiar la ventana sería subir un megabyte de golpe. Así que el atlas es de LETRAS: cada
 * letra que sale en algún rótulo de la ciudad, una vez, con su resplandor de tubo; y cada rótulo son sus
 * letras, un cuadrilátero por letra. Una celda con diez rótulos son unos 200 triángulos, y el atlas de una
 * ciudad entera cabe en 512 × 512 de un canal.
 */

/** El lado de la celda de un glifo en el atlas, y la talla de la letra dentro, en píxeles. */
const CELDA_DEL_GLIFO = 64;
const TALLA_DEL_GLIFO = 36;
const FUENTE_DEL_GLIFO = '"Trebuchet MS", "Arial Narrow", Arial, sans-serif';
/** Lo que se deja a cada lado del avance de una letra para que quepa su resplandor, en píxeles. */
const RESPLANDOR_DEL_GLIFO = 8;

export interface AtlasDeGlifos {
  readonly textura: THREE.Texture;
  readonly columnas: number;
  readonly filas: number;
  /** El avance de cada letra, en píxeles de la talla. */
  readonly avance: ReadonlyMap<string, number>;
  /** Dónde está cada letra en el atlas (su puesto, fila a fila). */
  readonly puesto: ReadonlyMap<string, number>;
  liberar(): void;
}

/**
 * EL ATLAS DE LETRAS de unos textos. En el navegador, cada letra en blanco con el resplandor del tubo (una
 * pasada difusa y el contorno fino, como los rótulos del barrio); en Node, sin lienzo, un téxel negro y un
 * avance fijo: la geometría sale igual de grande, que es lo que mide el comprobador.
 */
export function atlasDeGlifos(textos: readonly string[]): AtlasDeGlifos {
  const letras = new Set<string>();
  for (const t of textos) for (const l of t.toUpperCase()) if (l.trim() !== '') letras.add(l);
  const lista = [...letras].sort((a, b) => a.localeCompare(b));
  const columnas = 8;
  const filas = Math.max(1, Math.ceil(lista.length / columnas));
  const puesto = new Map<string, number>(lista.map((l, i) => [l, i]));
  const avance = new Map<string, number>();
  for (const l of lista) avance.set(l, TALLA_DEL_GLIFO * 0.62);
  avance.set(' ', TALLA_DEL_GLIFO * 0.3);
  let textura: THREE.Texture;
  if (typeof document !== 'undefined') {
    const lienzo = document.createElement('canvas');
    lienzo.width = columnas * CELDA_DEL_GLIFO;
    lienzo.height = filas * CELDA_DEL_GLIFO;
    const ctx = lienzo.getContext('2d');
    if (ctx !== null) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, lienzo.width, lienzo.height);
      ctx.font = `bold ${String(TALLA_DEL_GLIFO)}px ${FUENTE_DEL_GLIFO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.5, TALLA_DEL_GLIFO * 0.07);
      avance.set(' ', ctx.measureText(' ').width);
      lista.forEach((l, i) => {
        avance.set(l, ctx.measureText(l).width);
        const cx = (i % columnas) * CELDA_DEL_GLIFO + CELDA_DEL_GLIFO / 2;
        const cy = Math.floor(i / columnas) * CELDA_DEL_GLIFO + CELDA_DEL_GLIFO / 2;
        ctx.save();
        ctx.beginPath();
        ctx.rect(cx - CELDA_DEL_GLIFO / 2, cy - CELDA_DEL_GLIFO / 2, CELDA_DEL_GLIFO, CELDA_DEL_GLIFO);
        ctx.clip();
        ctx.shadowColor = 'rgba(255,255,255,0.9)';
        ctx.shadowBlur = 10;
        ctx.globalAlpha = 0.55;
        ctx.fillText(l, cx, cy);
        ctx.shadowBlur = 3;
        ctx.globalAlpha = 1;
        ctx.strokeText(l, cx, cy);
        ctx.restore();
      });
    }
    const t = new THREE.CanvasTexture(lienzo);
    t.colorSpace = THREE.NoColorSpace;
    t.anisotropy = 4;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    textura = t;
  } else {
    const t = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    t.needsUpdate = true;
    textura = t;
  }
  return { textura, columnas, filas, avance, puesto, liberar: () => textura.dispose() };
}

/** Los atributos del molde de los neones de la ciudad: color y semilla de parpadeo. */
export const ATRIBUTOS_DE_LOS_NEONES = { aNeon: 4 } as const;

/**
 * ESCRIBE UNOS RÓTULOS CON LETRAS DEL ATLAS: la chapa (en el mobiliario, como en el barrio) y una letra
 * por cuadrilátero en `neon` (un molde con `ATRIBUTOS_DE_LOS_NEONES`). Las fuentes de luz salen en el
 * mismo sitio que las de `construirLosRotulos`: la luz horneada no sabe si el texto es de letras o de un
 * hueco. `parpadeo` da la semilla de parpadeo de cada rótulo (0 los que no parpadean).
 */
export function escribirRotulosDeGlifos(
  rotulos: readonly RotuloDelPlano[],
  mobiliario: Molde,
  neon: Molde,
  atlas: AtlasDeGlifos,
  parpadeo: (r: RotuloDelPlano) => number,
): FuenteDeRotulo[] {
  const fuentes: FuenteDeRotulo[] = [];
  const W = atlas.columnas * CELDA_DEL_GLIFO;
  const Hh = atlas.filas * CELDA_DEL_GLIFO;
  /*
   * Las UV de una letra: de alto, su celda entera; de ancho, su avance y el resplandor a cada lado. Con la
   * celda entera, las letras de una palabra se pisaban tres veces y el resplandor, que se SUMA, salía blanco
   * entre letra y letra.
   */
  const uvDe = (l: string, anchoPx: number): readonly [number, number, number, number] | null => {
    const k = atlas.puesto.get(l);
    if (k === undefined) return null;
    const cx = (k % atlas.columnas) * CELDA_DEL_GLIFO + CELDA_DEL_GLIFO / 2;
    const cy = Math.floor(k / atlas.columnas);
    const medio = Math.min(CELDA_DEL_GLIFO / 2, anchoPx / 2);
    return [(cx - medio) / W, 1 - ((cy + 1) * CELDA_DEL_GLIFO) / Hh, (cx + medio) / W, 1 - (cy * CELDA_DEL_GLIFO) / Hh];
  };
  for (const r of rotulos) {
    const [nx, nz] = normalDe(r.mira);
    const tx = nz;
    const tz = -nx;
    const color = lineal(r.color);
    const semilla = parpadeo(r);
    const y0 = r.y - r.alto / 2;
    const y1 = r.y + r.alto / 2;
    const texto = r.texto.toUpperCase();
    mobiliario.color(0.012, 0.013, 0.014);
    mobiliario.poner('aAcabado', ACABADO.chapa[0], ACABADO.chapa[1]);
    neon.poner('aNeon', color[0], color[1], color[2], semilla);
    if (r.forma === 'fachada') {
      const f = 0.1;
      const a = r.ancho / 2;
      const p = (s: number, y: number, fuera: number): [number, number, number] => [r.x + tx * s + nx * fuera, y, r.z + tz * s + nz * fuera];
      const e0 = p(-a - 0.1, y0 - 0.08, 0);
      const e1 = p(a + 0.1, y1 + 0.08, 0.08);
      mobiliario.caja(Math.min(e0[0], e1[0]), e0[1], Math.min(e0[2], e1[2]), Math.max(e0[0], e1[0]), e1[1], Math.max(e0[2], e1[2]), 'nseoab');
      /* La línea de letras: la talla del barrio (62 % del alto), y más pequeña si no cabe en el 88 % del ancho. */
      let total = 0;
      for (const l of texto) total += atlas.avance.get(l) ?? TALLA_DEL_GLIFO * 0.62;
      let escala = (r.alto * 0.62) / TALLA_DEL_GLIFO;
      if (total * escala > r.ancho * 0.88) escala = (r.ancho * 0.88) / Math.max(total, 1e-6);
      const alto = (CELDA_DEL_GLIFO / 2) * escala;
      let u = (-total * escala) / 2;
      for (const l of texto) {
        const avPx = atlas.avance.get(l) ?? TALLA_DEL_GLIFO * 0.62;
        const anchoPx = avPx + 2 * RESPLANDOR_DEL_GLIFO;
        const uv = uvDe(l, anchoPx);
        if (uv !== null) {
          const c = u + (avPx * escala) / 2;
          const ancho = (Math.min(CELDA_DEL_GLIFO, anchoPx) / 2) * escala;
          neon.quad(p(c - ancho, r.y - alto, f), p(c + ancho, r.y - alto, f), p(c + ancho, r.y + alto, f), p(c - ancho, r.y + alto, f), [nx, 0, nz], [uv[0], uv[1], uv[2], uv[1], uv[2], uv[3], uv[0], uv[3]]);
        }
        u += avPx * escala;
      }
      fuentes.push({ x: r.x + nx * 0.2, y: r.y, z: r.z + nz * 0.2, tamano: r.ancho, color, normal: [nx, nz], parpadeo: semilla });
    } else {
      const g = 0.11;
      const d0 = 0.15;
      const d1 = d0 + r.ancho;
      const p = (lado: number, fuera: number, y: number): [number, number, number] => [r.x + tx * lado + nx * fuera, y, r.z + tz * lado + nz * fuera];
      const a0 = p(-g, d0, y0);
      const a1 = p(g, d1, y1);
      mobiliario.caja(Math.min(a0[0], a1[0]), y0, Math.min(a0[2], a1[2]), Math.max(a0[0], a1[0]), y1, Math.max(a0[2], a1[2]), 'nseoab');
      /* Las letras de arriba abajo, por las dos caras y sin espejo en ninguna (como las de la banderola del barrio). */
      const letras = [...texto.replace(/\s+/g, ' ')];
      const paso = r.alto / (letras.length + 1);
      const talla = Math.min(r.ancho * 0.66, paso * 0.95);
      const escala = talla / TALLA_DEL_GLIFO;
      const medio = (CELDA_DEL_GLIFO / 2) * escala;
      const dc = (d0 + d1) / 2;
      letras.forEach((l, i) => {
        const uv = uvDe(l, CELDA_DEL_GLIFO);
        if (uv === null) return;
        const y = y1 - paso * (i + 1);
        const q: readonly [number, number, number, number, number, number, number, number] = [uv[0], uv[1], uv[2], uv[1], uv[2], uv[3], uv[0], uv[3]];
        neon.quad(p(g + 0.01, dc + medio, y - medio), p(g + 0.01, dc - medio, y - medio), p(g + 0.01, dc - medio, y + medio), p(g + 0.01, dc + medio, y + medio), [tx, 0, tz], q);
        neon.quad(p(-g - 0.01, dc - medio, y - medio), p(-g - 0.01, dc + medio, y - medio), p(-g - 0.01, dc + medio, y + medio), p(-g - 0.01, dc - medio, y + medio), [-tx, 0, -tz], q);
      });
      fuentes.push({ x: r.x + nx * (d0 + r.ancho / 2), y: r.y, z: r.z + nz * (d0 + r.ancho / 2), tamano: r.alto * 0.7, color, normal: [nx, nz], parpadeo: semilla });
    }
  }
  return fuentes;
}
