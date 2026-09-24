/**
 * EL BORDE DE GLIFOS (§2.5 de `docs/quiebro/CIUDAD-ABIERTA.md`): lo que se ve donde la ciudad se acaba sin
 * enseñar una calle que no se puede andar.
 *
 * Todo el cerco es una fila de fachadas (`anillo-de-la-ciudad.ts`) salvo en las TRES SALIDAS de las
 * avenidas: el Elevado por sus dos cantos y el Bulevar por el sur. Ahí la avenida sigue 20 m más allá del
 * borde y se deshace:
 *
 *   · LA CORTINA: sobre la caja del cerco que cruza la avenida (de ±270 a ±272, la que sigue parando a
 *     quien anda), una lluvia de la Grafía tenue, que se aviva al acercarse. Es la caja pintada: quien se
 *     estampa contra el borde ve contra qué, y no hay pared invisible.
 *   · EL ALAMBRE: el suelo de esos 20 m se cubre de una rejilla de glifos que se come el asfalto hacia el
 *     final, y la viga del Elevado sigue en alambre, cada vez más rala.
 *   · EL MURO: al final, una pared de glifos que tiembla como el borde del Bis. Es la ciudad que el Sistema
 *     no ha escrito.
 *
 * Una malla y una llamada para las tres salidas (unos 60 triángulos), aditiva, con la Grafía de los
 * efectos (`efectos/atlas.ts`) y la niebla de altura que apaga hacia negro lo que suma. Sin estado: todo
 * sale del tiempo del adorno, así que el Remanso la frena como frena la lluvia.
 *
 * ═══ LA CORTINA, DE CERCA ═══
 *
 * Jugada de verdad (revisión del 24-sep), la cortina tapaba la pantalla en las tres salidas: con la espalda
 * contra el borde y la cámara girada hacia la ciudad, el ojo acaba a un palmo de la cara de la caja (o un
 * poco detrás, dentro de ella), y a esa distancia un glifo de medio metro, aditivo y «avivado» ocupa media
 * pantalla: un 25 % de la imagen casi blanca y el HUD sin leerse. La cortina se aviva al acercarse, pero se
 * APAGA en los dos últimos metros (`LEY_DE_LA_CORTINA`): quien se estampa contra ella la ve encendida desde
 * la cámara al hombro (a unos 3,5 m), y la cámara que se mete en ella no ve nada. Y lo más que suma es la
 * mitad de lo que sumaba: de cerca llenaba la imagen de verde por encima del blanco del brillo. La ley está
 * aquí en números, el sombreador sale de ellos y el comprobador la mira.
 */
import * as THREE from 'three';
import { nieblaEn } from '../atmosfera/niebla';
import { GLSL_AZAR, GLSL_GRAFIA } from '../efectos/glsl';
import { atlasDeLaGrafia } from '../efectos/atlas';
import { UNIFORMES_DE_LA_CIUDAD } from './retoques';
import { Molde, triangulosDe } from './geometria';
import type { SalidaDeAvenida } from './sintetica';
import { ALTO_DEL_VIADUCTO, ANCHO_DE_AVENIDA, BORDE_DE_LA_CIUDAD, CERCO_DE_LA_CIUDAD, SALIDA_DE_GLIFOS } from '../../../../shared/arcade/juegos/quiebro-ciudad';

/** Lo que es cada cara del borde, en `aBorde.x`. */
const PIEZA = { cortina: 0, suelo: 1, viga: 2, muro: 3 } as const;

/** El alto de la cortina y del muro. */
const ALTO_DE_LA_CORTINA = 9;
const ALTO_DEL_MURO = 18;

/**
 * LO QUE BRILLA LA CORTINA según lo lejos que está del ojo (ver la cabecera), en metros: tenue lejos, se aviva
 * de `avivaDesde` a `avivaHasta`, y se apaga del todo por debajo de `apagaHasta` (entera desde `apagaDesde`).
 * `fondo` y `cerca` son lo que suma lejos y de cerca, y `color`, cuánto se multiplica el cian.
 */
export const LEY_DE_LA_CORTINA = {
  avivaDesde: 18,
  avivaHasta: 4,
  apagaDesde: 2.6,
  apagaHasta: 0.9,
  fondo: 0.12,
  cerca: 0.62,
  color: 1.1,
} as const;

function suave(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Lo que multiplica a la tinta de la cortina a `distancia` del ojo (lo mismo que el sombreador). */
export function brilloDeLaCortina(distancia: number): number {
  const l = LEY_DE_LA_CORTINA;
  const aviva = 1 - suave(l.avivaHasta, l.avivaDesde, distancia);
  return (l.fondo + (l.cerca - l.fondo) * aviva) * suave(l.apagaHasta, l.apagaDesde, distancia) * l.color;
}

const n = (x: number): string => x.toFixed(3);
/** La misma ley en GLSL, escrita desde los números de arriba. */
export const GLSL_DE_LA_CORTINA = `float brilloDeLaCortina(float d) {
  float aviva = 1.0 - smoothstep(${n(LEY_DE_LA_CORTINA.avivaHasta)}, ${n(LEY_DE_LA_CORTINA.avivaDesde)}, d);
  return (${n(LEY_DE_LA_CORTINA.fondo)} + ${n(LEY_DE_LA_CORTINA.cerca - LEY_DE_LA_CORTINA.fondo)} * aviva) * smoothstep(${n(LEY_DE_LA_CORTINA.apagaHasta)}, ${n(LEY_DE_LA_CORTINA.apagaDesde)}, d) * ${n(LEY_DE_LA_CORTINA.color)};
}`;

const VERTICE = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
attribute vec4 aBorde;
varying vec2 vUvB;
varying vec4 vBordeB;
varying vec3 vPosB;
void main() {
  vUvB = uv;
  vBordeB = aBorde;
  vec4 mundo = modelMatrix * vec4(position, 1.0);
  vPosB = mundo.xyz;
  vec4 mvPosition = viewMatrix * mundo;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAGMENTO = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform float uTiempo;
${GLSL_AZAR}
${GLSL_GRAFIA}
varying vec2 vUvB;
varying vec4 vBordeB;
varying vec3 vPosB;
${GLSL_DE_LA_CORTINA}
/* La tinta de un glifo en la celda continua q, eligiendo el glifo con la celda y un paso. */
float glifoEn(vec2 q, float paso) {
  vec2 c = floor(q);
  float g = floor(azar2(c.x + 4096.0, c.y + 4096.0 + paso * 131.0) * 48.0);
  return tintaDelCampo(celdaDeGrafia(g, q).r, q, 0.5);
}
void main() {
  float pieza = vBordeB.x;
  float avance = clamp(vBordeB.y, 0.0, 1.0);
  float lejos = distance(cameraPosition, vPosB);
  float cerca = 1.0 - smoothstep(4.0, 18.0, lejos);
  vec3 cian = vec3(0.35, 1.0, 0.8);
  float luz = 0.0;
  if (pieza < 0.5) {
    /* LA CORTINA: columnas que caen a su paso, tenues, que se avivan al acercarse. */
    vec2 q = vUvB / vec2(0.55, 0.75);
    float columna = floor(q.x);
    float velocidad = 1.5 + 2.5 * azar2(columna + 4096.0, 17.0);
    q.y += uTiempo * velocidad;
    float tinta = glifoEn(q, floor(uTiempo * 3.0 + azar2(columna + 4096.0, 5.0) * 7.0));
    float estela = fract(-q.y * 0.07 + azar2(columna + 4096.0, 9.0));
    /* Tenue lejos, avivada al acercarse y apagada en los dos últimos metros: ver LEY_DE_LA_CORTINA. */
    luz = tinta * brilloDeLaCortina(lejos) * (0.35 + 0.65 * estela) * (1.0 - smoothstep(0.7, 1.0, vUvB.y / ${ALTO_DE_LA_CORTINA.toFixed(1)})) / 1.6;
  } else if (pieza < 1.5) {
    /* EL SUELO: la rejilla de alambre (cada 3 m) y glifos que se comen el asfalto hacia el final. */
    vec2 q = vUvB / 0.6;
    vec2 f = abs(fract(vUvB / 3.0 + 0.5) - 0.5) * 3.0;
    float linea = 1.0 - smoothstep(0.03, 0.09, min(f.x, f.y));
    float tinta = glifoEn(q, floor(uTiempo * 2.0));
    float relleno = step(azar2(floor(q.x) + 4096.0, floor(q.y) + 4096.0 + floor(uTiempo * 2.0)), avance * 0.8);
    luz = (linea * 0.9 + tinta * relleno * 0.7) * (0.25 + 0.75 * avance);
  } else if (pieza < 2.5) {
    /* LA VIGA EN ALAMBRE: sus aristas en glifos, cada vez más ralas. */
    vec2 f = min(vUvB, vec2(1.0) - vUvB);
    float arista = 1.0 - smoothstep(0.03, 0.1, min(f.x * 6.0, f.y));
    float tinta = glifoEn(vUvB * vec2(8.0, 2.0), floor(uTiempo * 4.0));
    luz = (arista + tinta * 0.4) * (1.0 - avance) * step(azar2(floor(vUvB.x * 12.0) + 4096.0, floor(uTiempo * 6.0)), 1.0 - avance * 0.7);
  } else {
    /* EL MURO QUE TIEMBLA: la Grafía apretada, que repite y se desplaza a tirones, como el borde del Bis. */
    float tiron = floor(uTiempo * 9.0);
    vec2 q = vUvB / vec2(0.45, 0.62) + vec2(azar2(tiron, 3.0) - 0.5, azar2(tiron, 7.0) - 0.5) * 0.35;
    float tinta = glifoEn(q, floor(uTiempo * 1.0));
    float velo = 0.35 + 0.65 * azar2(floor(q.x) + 4096.0, floor(q.y * 0.25) + 4096.0 + floor(uTiempo * 2.0));
    luz = tinta * velo * (1.0 - smoothstep(0.75, 1.0, vUvB.y / ${ALTO_DEL_MURO.toFixed(1)})) * (0.55 + 0.45 * cerca);
  }
  if (luz < 0.004) discard;
  gl_FragColor = vec4(cian * luz * 1.6, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export interface BordeConstruido {
  readonly malla: THREE.Mesh;
  readonly triangulos: number;
  liberar(): void;
}

/**
 * EL BORDE de una ciudad: sus salidas y, para cada una, si lleva el viaducto (el Elevado). Una malla, de
 * mundo: no depende de dónde esté la cámara ni del nivel.
 */
export function construirElBorde(salidas: readonly SalidaDeAvenida[], conViaducto: (s: SalidaDeAvenida) => boolean): BordeConstruido {
  const g = geometriaDelBorde(salidas, conViaducto);
  const malla = mallaDelBorde(g);
  return {
    malla,
    triangulos: triangulosDe(g),
    liberar(): void {
      g.dispose();
      (malla.material as THREE.Material).dispose();
    },
  };
}

/**
 * La malla del borde sobre una geometría que no es suya: cada ciudad (cada nivel de la misma noche) lleva su
 * malla y su material, y la geometría es de la base (ver `abierta.ts`). Liberar el material es de quien la pide.
 */
export function mallaDelBorde(g: THREE.BufferGeometry): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    name: 'quiebro-borde',
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uTiempo: UNIFORMES_DE_LA_CIUDAD.uTiempo,
      uGrafia: { value: atlasDeLaGrafia() },
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
  const malla = new THREE.Mesh(g, material);
  malla.name = 'quiebro-borde';
  malla.frustumCulled = false;
  malla.renderOrder = 3;
  return malla;
}

/** La GEOMETRÍA del borde: de la ciudad, no del nivel. */
export function geometriaDelBorde(salidas: readonly SalidaDeAvenida[], conViaducto: (s: SalidaDeAvenida) => boolean): THREE.BufferGeometry {
  const m = new Molde({ aBorde: 4 });
  const medio = ANCHO_DE_AVENIDA / 2;
  for (const s of salidas) {
    const d0 = s.sentido * BORDE_DE_LA_CIUDAD;
    const d1 = s.sentido * CERCO_DE_LA_CIUDAD;
    const dFin = s.sentido * (BORDE_DE_LA_CIUDAD + SALIDA_DE_GLIFOS);
    /* Un punto de la salida: `d` a lo largo del eje de la avenida, `t` de través (desde su eje), `y` alto. */
    const p = (d: number, t: number, y: number): [number, number, number] => (s.eje === 'x' ? [d, y, s.linea + t] : [s.linea + t, y, d]);
    /* Hacia la ciudad, en planta: la normal de la cara que da a ella. */
    const haciaDentro: [number, number, number] = s.eje === 'x' ? [-s.sentido, 0, 0] : [0, 0, -s.sentido];
    const haciaFuera: [number, number, number] = [-haciaDentro[0], 0, -haciaDentro[2]];
    const ancho = 2 * medio;
    /* Las cuatro esquinas de una cara vertical de través, en el orden que la ve de frente quien mira desde `n`. */
    const cara = (d: number, y0: number, y1: number, t0: number, t1: number, n: [number, number, number], pieza: number, avance: number): void => {
      m.poner('aBorde', pieza, avance, 0, 0);
      const izquierda = n[0] + n[2] > 0 === (s.eje === 'x') ? t1 : t0;
      const derecha = izquierda === t1 ? t0 : t1;
      const a = p(d, izquierda, y0);
      const b = p(d, derecha, y0);
      const c = p(d, derecha, y1);
      const e = p(d, izquierda, y1);
      m.quad(a, b, c, e, n, [0, y0, ancho, y0, ancho, y1, 0, y1]);
    };
    /* La cortina, por las dos caras de la caja del cerco. */
    cara(d0, 0, ALTO_DE_LA_CORTINA, -medio, medio, haciaDentro, PIEZA.cortina, 0);
    cara(d1, 0, ALTO_DE_LA_CORTINA, -medio, medio, haciaFuera, PIEZA.cortina, 0);
    /* El suelo de alambre, de la caja al muro. */
    m.poner('aBorde', PIEZA.suelo, 0, 0, 0);
    const largo = SALIDA_DE_GLIFOS;
    const sa = p(d0, -medio, 0.03);
    const sb = p(d0, medio, 0.03);
    const sc = p(dFin, medio, 0.03);
    const sd = p(dFin, -medio, 0.03);
    const va = m.vertice(sa[0], sa[1], sa[2], 0, 1, 0, 0, 0);
    const vb = m.vertice(sb[0], sb[1], sb[2], 0, 1, 0, ancho, 0);
    m.poner('aBorde', PIEZA.suelo, 1, 0, 0);
    const vc = m.vertice(sc[0], sc[1], sc[2], 0, 1, 0, ancho, largo);
    const vd = m.vertice(sd[0], sd[1], sd[2], 0, 1, 0, 0, largo);
    m.tri(va, vb, vc);
    m.tri(va, vc, vd);
    m.tri(va, vc, vb);
    m.tri(va, vd, vc);
    /* La viga en alambre, por sus dos costados, del borde hasta el muro. */
    if (conViaducto(s)) {
      for (const lado of [-1, 1]) {
        const t = lado * 1.9;
        const y0 = ALTO_DEL_VIADUCTO;
        const y1 = ALTO_DEL_VIADUCTO + 1.45;
        m.poner('aBorde', PIEZA.viga, 0, 0, 0);
        const a = m.vertice(...p(d0, t, y0), 0, 0, lado, 0, 0);
        const d = m.vertice(...p(d0, t, y1), 0, 0, lado, 0, 1);
        m.poner('aBorde', PIEZA.viga, 1, 0, 0);
        const b = m.vertice(...p(dFin, t, y0), 0, 0, lado, 1, 0);
        const c = m.vertice(...p(dFin, t, y1), 0, 0, lado, 1, 1);
        m.tri(a, b, c);
        m.tri(a, c, d);
        m.tri(a, c, b);
        m.tri(a, d, c);
      }
    }
    /* El muro que tiembla, al final, un poco más ancho que el pasillo. */
    cara(dFin, 0, ALTO_DEL_MURO, -medio - 1, medio + 1, haciaDentro, PIEZA.muro, 1);
  }
  return m.geometria();
}
