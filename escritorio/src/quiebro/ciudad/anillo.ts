/**
 * EL ANILLO DE FUERA Y EL HORIZONTE: la ciudad que no se juega, para que no se vea el final del
 * mundo.
 *
 * ═══ TRES DISTANCIAS, TRES COSTES ═══
 *
 *   · El PRIMER ANILLO son las 16 manzanas que rodean el barrio, en la misma rejilla (solares de 36 m
 *     y calles de 12 que siguen las del barrio). Su primera fila de fachadas cae JUSTO en la línea del
 *     cerco (±78): es la «fachada exterior» con la que se choca en el borde, así que tiene que estar
 *     pintada con el mismo cuidado que el barrio. Mismo material que las fachadas de dentro, sin
 *     balcones ni tarjetas.
 *   · El SEGUNDO ANILLO, pasada la avenida de fuera (la del tráfico en marcha), son torres: de 40 a
 *     130 m, en cajas con retranqueos y el mismo sombreador. Son las que asoman por encima de los
 *     tejados del barrio y dan el perfil de ciudad grande.
 *   · El HORIZONTE, a 520 m, es un cilindro con la silueta de torres sacada del sombreador (alturas
 *     por hash del ángulo) y puntos de ventana, dentro de la niebla: una llamada y 128 triángulos
 *     para todo lo que hay más allá.
 *
 * Todo sale de la semilla del plano y es igual en todos los niveles salvo el relieve (el nivel sólo
 * decide si el primer anillo lleva cornisas y pretiles).
 */
import * as THREE from 'three';
import { nieblaEn } from '../atmosfera/niebla';
import type { CajaXZ, CalleDelPlano, EdificioDelPlano, EstiloDeFachada, FachadaDelPlano, Orientacion, PlanoDeLaCiudad, Volumen } from './tipos';
import { dadoDe, enteroCon, unoDe } from './azar';
import type { Dado } from './azar';

const SOLAR = 36;
const CALLE = 12;
const PASO = SOLAR + CALLE;

export interface AnilloDeFuera {
  /** Los solares edificados fuera del barrio (para las islas de acera). */
  readonly solares: readonly CajaXZ[];
  readonly edificios: readonly EdificioDelPlano[];
  /** Las calles de fuera: las del barrio que siguen y las avenidas. */
  readonly calles: readonly CalleDelPlano[];
  /** Hasta dónde llega el suelo. */
  readonly extension: CajaXZ;
  /** Las avenidas por donde pasa el tráfico en marcha: [eje, coordenada, desde, hasta]. */
  readonly avenidas: readonly { readonly corre: 'x' | 'z'; readonly en: number; readonly desde: number; readonly hasta: number }[];
}

/** Las coordenadas de arranque de los solares en un eje, del barrio y de fuera. */
function arranques(limite: number): { dentro: number[]; primero: number[]; segundo: number[] } {
  /* El barrio: -66, -18, 30 (con límite 78). Fuera: 78 y -114; y pasada la avenida, 126 y -162. */
  const dentro = [-limite + CALLE, -limite + CALLE + PASO, -limite + CALLE + 2 * PASO];
  const primero = [-limite - SOLAR, limite];
  const segundo = [-limite - SOLAR - CALLE - SOLAR, limite + SOLAR + CALLE];
  return { dentro, primero, segundo };
}

function parcelas(dado: Dado, s: CajaXZ): CajaXZ[] {
  const cuantos = enteroCon(dado, 1, 3);
  if (cuantos === 1) return [s];
  const porX = dado() < 0.5;
  const corte = 12 + Math.floor(dado() * 13);
  const a: CajaXZ = porX ? { ...s, x1: s.x0 + corte } : { ...s, z1: s.z0 + corte };
  const b: CajaXZ = porX ? { ...s, x0: s.x0 + corte } : { ...s, z0: s.z0 + corte };
  if (cuantos === 2) return [a, b];
  /* La tercera: la segunda mitad partida por el otro eje, también a 12-24 m. */
  const corte2 = 12 + Math.floor(dado() * 13);
  const partida = porX ? [{ ...b, z1: b.z0 + corte2 }, { ...b, z0: b.z0 + corte2 }] : [{ ...b, x1: b.x0 + corte2 }, { ...b, x0: b.x0 + corte2 }];
  return [a, ...partida];
}

/** Las caras de una parcela que caen en el borde del solar: sus fachadas. */
function fachadasDe(p: CajaXZ, s: CajaXZ, dado: Dado): FachadaDelPlano[] {
  const caras: Orientacion[] = [];
  if (p.z0 === s.z0) caras.push('n');
  if (p.z1 === s.z1) caras.push('s');
  if (p.x1 === s.x1) caras.push('e');
  if (p.x0 === s.x0) caras.push('o');
  return caras.map((mira) => ({ mira, bajo: dado() < 0.6 ? 'tiendas' : 'portales' }));
}

function edificio(dado: Dado, p: CajaXZ, s: CajaXZ, torre: boolean, semilla: number): EdificioDelPlano {
  const estilos: readonly EstiloDeFachada[] = torre
    ? ['vidrio', 'vidrio', 'hormigon', 'piedra']
    : ['revoco', 'ladrillo', 'piedra', 'azulejo', 'hormigon', 'revoco', 'vidrio'];
  const estilo = unoDe(dado, estilos);
  const hp = 3;
  const pb = 4.5;
  const plantas = torre ? enteroCon(dado, 12, 40) : enteroCon(dado, 4, 11);
  const alto = pb + plantas * hp;
  const fachadas = fachadasDe(p, s, dado);
  const volumenes: Volumen[] = [
    { ...p, y0: 0, y1: pb },
    { ...p, y0: pb, y1: torre ? pb + Math.min(plantas, enteroCon(dado, 3, 6)) * hp : alto },
  ];
  if (torre) {
    /* La torre sube retranqueada sobre un zócalo de pocas plantas, y a veces remata más estrecha. */
    const r = 2 + Math.floor(dado() * 3);
    const base = volumenes[1] as Volumen;
    const fuste: Volumen = { x0: p.x0 + r, z0: p.z0 + r, x1: p.x1 - r, z1: p.z1 - r, y0: base.y1, y1: alto };
    if (fuste.x1 - fuste.x0 > 6 && fuste.z1 - fuste.z0 > 6) {
      volumenes.push(fuste);
      if (dado() < 0.5) {
        const r2 = 2;
        const remate = alto + enteroCon(dado, 2, 5) * hp;
        volumenes.push({ x0: fuste.x0 + r2, z0: fuste.z0 + r2, x1: fuste.x1 - r2, z1: fuste.z1 - r2, y0: alto, y1: remate });
      }
    }
  }
  return {
    huella: p,
    caja: p,
    volumenes,
    estilo,
    tono: dado(),
    vano: unoDe(dado, [2.5, 3, 3.5] as const),
    balcones: false,
    plantaBaja: pb,
    alturaDePlanta: hp,
    fachadas,
    soportal: null,
    pilares: [],
    semilla,
  };
}

export function anilloDe(plano: PlanoDeLaCiudad): AnilloDeFuera {
  const dado = dadoDe((plano.semilla ^ 0x7a11_0f3e) >>> 0);
  const L = plano.limite.x1;
  const { dentro, primero, segundo } = arranques(L);
  const solares: CajaXZ[] = [];
  const edificios: EdificioDelPlano[] = [];
  const primeraFila = [...primero.slice(0, 1), ...dentro, ...primero.slice(1)];
  /* El primer anillo: la rejilla de 5 × 5 menos las 3 × 3 del barrio. */
  for (const z0 of primeraFila) {
    for (const x0 of primeraFila) {
      if (dentro.includes(x0) && dentro.includes(z0)) continue;
      const s: CajaXZ = { x0, z0, x1: x0 + SOLAR, z1: z0 + SOLAR };
      solares.push(s);
      for (const p of parcelas(dado, s)) {
        edificios.push(edificio(dado, p, s, dado() < 0.3, enteroCon(dado, 0, 2 ** 31)));
      }
    }
  }
  /* El segundo anillo: pasada la avenida, torres en todo el perímetro. */
  const segundaFila = [segundo[0] as number, ...primeraFila, segundo[1] as number];
  for (const z0 of segundaFila) {
    for (const x0 of segundaFila) {
      if (primeraFila.includes(x0) && primeraFila.includes(z0)) continue;
      const s: CajaXZ = { x0, z0, x1: x0 + SOLAR, z1: z0 + SOLAR };
      solares.push(s);
      for (const p of parcelas(dado, s)) {
        edificios.push(edificio(dado, p, s, dado() < 0.7, enteroCon(dado, 0, 2 ** 31)));
      }
    }
  }
  const lejos = L + SOLAR + CALLE + SOLAR + CALLE / 2;
  const calles: CalleDelPlano[] = [];
  const ejes = [...primeraFila.map((x) => x - CALLE / 2), (primeraFila[primeraFila.length - 1] as number) + SOLAR + CALLE / 2];
  for (const en of ejes) {
    for (const corre of ['x', 'z'] as const) calles.push({ corre, en, desde: -lejos, hasta: lejos, acera: 3, calzada: 6 });
  }
  const avenidaEn = L + SOLAR + CALLE / 2;
  const avenidas = [
    { corre: 'x' as const, en: -avenidaEn, desde: -avenidaEn, hasta: avenidaEn },
    { corre: 'x' as const, en: avenidaEn, desde: -avenidaEn, hasta: avenidaEn },
    { corre: 'z' as const, en: -avenidaEn, desde: -avenidaEn, hasta: avenidaEn },
    { corre: 'z' as const, en: avenidaEn, desde: -avenidaEn, hasta: avenidaEn },
  ];
  return {
    solares,
    edificios,
    calles,
    extension: { x0: -lejos, z0: -lejos, x1: lejos, z1: lejos },
    avenidas,
  };
}

/* ═══════════════════════════════ EL HORIZONTE ═══════════════════════════════ */

const VERTICE_DEL_HORIZONTE = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
varying vec2 vQ;
void main() {
  vQ = vec2(atan(position.z, position.x), position.y);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAGMENTO_DEL_HORIZONTE = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform float uAltoMaximo;
varying vec2 vQ;
float hashH(float n) { return fract(sin(n * 91.3458) * 47453.5453); }
void main() {
  /* Torres de 2° a 5° de ancho, con alturas por hash del ángulo; dos filas, la de atrás más alta. */
  float a = vQ.x * 57.2958 + 180.0;
  float y = vQ.y;
  float torre1 = floor(a / 3.1);
  float alto1 = (0.25 + 0.75 * pow(hashH(torre1), 2.0)) * uAltoMaximo;
  float torre2 = floor((a + 1.3) / 4.7);
  float alto2 = (0.4 + 0.6 * pow(hashH(torre2 + 37.0), 1.5)) * uAltoMaximo * 1.25;
  float dentro1 = step(y, alto1);
  float dentro2 = step(y, alto2);
  if (dentro1 + dentro2 < 0.5) discard;
  /* Ventanas: una rejilla fina con pocas encendidas; en las torres de delante más. */
  vec2 c = vec2(a * 5.0, y / 3.2);
  vec2 id = floor(c);
  float luz = step(0.86, hashH(id.x * 17.0 + id.y * 131.0)) * step(0.3, fract(c.x)) * step(fract(c.y), 0.6);
  vec3 muro = dentro1 > 0.5 ? vec3(0.010, 0.012, 0.013) : vec3(0.007, 0.009, 0.010);
  vec3 color = muro + luz * vec3(1.0, 0.7, 0.4) * (dentro1 > 0.5 ? 0.9 : 0.5);
  /* Las luces rojas de balizamiento en lo alto de las más altas. */
  float baliza = step(0.8 * uAltoMaximo, alto1) * step(abs(y - alto1 + 1.5), 1.2) * step(abs(fract(a / 3.1) - 0.5), 0.05);
  color += baliza * vec3(1.0, 0.05, 0.02) * 3.0;
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

/** El radio del horizonte y la altura de sus torres más altas. */
export const RADIO_DEL_HORIZONTE = 520;

export function crearElHorizonte(): THREE.Mesh {
  const g = new THREE.CylinderGeometry(RADIO_DEL_HORIZONTE, RADIO_DEL_HORIZONTE, 240, 64, 1, true);
  g.translate(0, 120, 0);
  const material = new THREE.ShaderMaterial({
    name: 'quiebro-horizonte',
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uAltoMaximo: { value: 170 } },
    vertexShader: VERTICE_DEL_HORIZONTE,
    fragmentShader: FRAGMENTO_DEL_HORIZONTE,
    side: THREE.BackSide,
    fog: true,
  });
  nieblaEn(material);
  const malla = new THREE.Mesh(g, material);
  malla.name = 'quiebro-horizonte';
  malla.renderOrder = -5;
  return malla;
}
