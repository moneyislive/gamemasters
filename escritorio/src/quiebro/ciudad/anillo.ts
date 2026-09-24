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
 *     Detrás de esa primera fila (las parcelas que no dan al barrio) crecen torres de 20 a 30 plantas:
 *     la calle de las referencias es un cañón de rascacielos, y con todo el primer anillo de 4 a 11
 *     plantas el barrio parecía un pueblo con torres al fondo.
 *   · El SEGUNDO ANILLO, pasada la avenida de fuera (la del tráfico en marcha), son torres: de 60 a
 *     180 m, en cajas con retranqueos y el mismo sombreador. Son las que asoman por encima de los
 *     tejados del barrio y dan el perfil de ciudad grande.
 *   · LA CIUDAD LEJANA, de 190 a 540 m: cajas bajas instanciadas (una llamada), con ventanas y dentro
 *     de la niebla. Sin ellas, entre el segundo anillo y el horizonte había una franja vacía del color
 *     de la bruma, justo en la primera imagen de la noche (la vista desde lo alto de la Bajada).
 *   · El HORIZONTE, a 780 m, es un cilindro con la silueta de torres sacada del sombreador (alturas
 *     por hash del ángulo) y puntos de ventana, dentro de la niebla: una llamada y 128 triángulos
 *     para todo lo que hay más allá.
 *
 * Todo sale de la semilla del plano y es igual en todos los niveles salvo el relieve (el nivel sólo
 * decide si el primer anillo lleva cornisas y pretiles).
 */
import * as THREE from 'three';
import { nieblaEn } from '../atmosfera/niebla';
import { UNIFORMES_DE_LA_LUZ } from '../atmosfera/paleta';
import type { CajaXZ, CalleDelPlano, EdificioDelPlano, EstiloDeFachada, FachadaDelPlano, Orientacion, PlanoDeLaCiudad, Volumen } from './tipos';
import { azarEn, dadoDe, enteroCon, mezclar, unoDe } from './azar';
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

/** Cuántas plantas: [mínimo, máximo] de un edificio bajo y de una torre. */
interface Plantas {
  readonly bajo: readonly [number, number];
  readonly torre: readonly [number, number];
}

function edificio(dado: Dado, p: CajaXZ, s: CajaXZ, torre: boolean, semilla: number, alturas: Plantas): EdificioDelPlano {
  const estilos: readonly EstiloDeFachada[] = torre
    ? ['vidrio', 'vidrio', 'hormigon', 'piedra']
    : ['revoco', 'ladrillo', 'piedra', 'azulejo', 'hormigon', 'revoco', 'vidrio'];
  const estilo = unoDe(dado, estilos);
  const hp = 3;
  const pb = 4.5;
  const plantas = torre ? enteroCon(dado, alturas.torre[0], alturas.torre[1]) : enteroCon(dado, alturas.bajo[0], alturas.bajo[1]);
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
  /*
   * El primer anillo: la rejilla de 5 × 5 menos las 3 × 3 del barrio. La fila que da al barrio es de
   * casas (la fachada del cerco); lo de detrás, a menudo, torres de 20 a 30 plantas. «Da al barrio» es
   * tocar el lado del solar que mira al barrio (en las esquinas no hay tal lado: son de detrás).
   */
  const PRIMERA: Plantas = { bajo: [4, 11], torre: [12, 40] };
  const DETRAS: Plantas = { bajo: [5, 12], torre: [20, 30] };
  for (const z0 of primeraFila) {
    for (const x0 of primeraFila) {
      if (dentro.includes(x0) && dentro.includes(z0)) continue;
      const s: CajaXZ = { x0, z0, x1: x0 + SOLAR, z1: z0 + SOLAR };
      solares.push(s);
      for (const p of parcelas(dado, s)) {
        const alBarrio =
          (dentro.includes(z0) && ((x0 === L && p.x0 === s.x0) || (x0 < 0 && p.x1 === s.x1))) ||
          (dentro.includes(x0) && ((z0 === L && p.z0 === s.z0) || (z0 < 0 && p.z1 === s.z1)));
        const tirada = dado();
        const torre = alBarrio ? tirada < 0.15 : tirada < 0.55;
        edificios.push(edificio(dado, p, s, torre, enteroCon(dado, 0, 2 ** 31), alBarrio ? PRIMERA : DETRAS));
      }
    }
  }
  /* El segundo anillo: pasada la avenida, torres de 60 a 180 m en todo el perímetro. */
  const SEGUNDA: Plantas = { bajo: [6, 14], torre: [19, 58] };
  const segundaFila = [segundo[0] as number, ...primeraFila, segundo[1] as number];
  for (const z0 of segundaFila) {
    for (const x0 of segundaFila) {
      if (primeraFila.includes(x0) && primeraFila.includes(z0)) continue;
      const s: CajaXZ = { x0, z0, x1: x0 + SOLAR, z1: z0 + SOLAR };
      solares.push(s);
      for (const p of parcelas(dado, s)) {
        edificios.push(edificio(dado, p, s, dado() < 0.75, enteroCon(dado, 0, 2 ** 31), SEGUNDA));
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
uniform float uLucesDelHorizonte;
uniform float uClaridad;
varying vec2 vQ;
float hashH(float n) { return fract(sin(n * 91.3458) * 47453.5453); }
void main() {
  /*
   * Torres de 1,3° a 5° de ancho, con alturas por hash del ángulo, en tres filas: la de delante baja y
   * menuda, la de en medio y la de atrás, más alta y con alguna aguja. Con dos filas de alturas muy
   * parecidas el horizonte era un muro de canto recto; con tres, y las más altas escasas, es un perfil.
   */
  float a = vQ.x * 57.2958 + 180.0;
  float y = vQ.y;
  /*
   * Torres ESTRECHAS y con HUECOS: cada fila deja vacía una parte de sus sitios y cada torre ocupa sólo
   * una parte del suyo, así que entre torre y torre se ve el cielo. Con torres anchas y seguidas,
   * desde lo alto el horizonte era un muro plano con una muesca.
   */
  float torre1 = floor(a / 1.3);
  float f1 = fract(a / 1.3);
  float h1 = hashH(torre1);
  float alto1 = (0.07 + 0.3 * pow(h1, 1.8)) * uAltoMaximo * step(0.28, hashH(torre1 + 5.0)) * step(abs(f1 - 0.5), 0.36 + 0.1 * h1);
  float torre2 = floor((a + 0.9) / 2.1);
  float f2 = fract((a + 0.9) / 2.1);
  float h2 = hashH(torre2 + 37.0);
  float alto2 = (0.18 + 0.62 * pow(h2, 2.2)) * uAltoMaximo * step(0.35, hashH(torre2 + 11.0)) * step(abs(f2 - 0.5), 0.3 + 0.12 * h2);
  float torre3 = floor((a + 0.7) / 3.4);
  float h3 = hashH(torre3 + 71.0);
  float enTorre3 = fract((a + 0.7) / 3.4);
  float alto3 = (0.3 + 1.0 * pow(h3, 3.0)) * uAltoMaximo * 1.2 * step(0.45, hashH(torre3 + 19.0)) * step(abs(enTorre3 - 0.5), 0.26 + 0.1 * h3);
  /* Las más altas rematan retranqueadas, y alguna en aguja. */
  if (y > alto3 * 0.82 && abs(enTorre3 - 0.5) > 0.17) alto3 *= 0.82;
  if (h3 > 0.8 && abs(enTorre3 - 0.5) < 0.05) alto3 *= 1.12;
  float dentro1 = step(y, alto1);
  float dentro2 = step(y, alto2) * (1.0 - dentro1);
  float dentro3 = step(y, alto3) * (1.0 - dentro1) * (1.0 - dentro2);
  if (dentro1 + dentro2 + dentro3 < 0.5) discard;
  /* Ventanas: una rejilla fina con pocas encendidas; en las torres de delante más. */
  vec2 c = vec2(a * 5.0, y / 3.2);
  vec2 id = floor(c);
  float luz = step(0.86, hashH(id.x * 17.0 + id.y * 131.0)) * step(0.3, fract(c.x)) * step(fract(c.y), 0.6);
  vec3 muro = dentro1 > 0.5 ? vec3(0.010, 0.012, 0.013) : dentro2 > 0.5 ? vec3(0.008, 0.01, 0.011) : vec3(0.006, 0.008, 0.009);
  /* Al alba la ciudad lejana es aire: gris verdoso, un punto más oscuro que la bruma, no negro. */
  #ifdef USE_FOG
  muro = mix(muro, fogColor * (dentro1 > 0.5 ? 0.62 : dentro2 > 0.5 ? 0.7 : 0.78), uClaridad * 0.85);
  #endif
  vec3 color = muro + luz * vec3(1.0, 0.7, 0.4) * (dentro1 > 0.5 ? 0.9 : dentro2 > 0.5 ? 0.6 : 0.4) * uLucesDelHorizonte;
  /* Las luces rojas de balizamiento en lo alto de las más altas. */
  float baliza = step(0.9 * uAltoMaximo, alto3) * dentro3 * step(abs(y - alto3 + 1.5), 1.2) * step(abs(enTorre3 - 0.5), 0.03);
  color += baliza * vec3(1.0, 0.05, 0.02) * 3.0;
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

/**
 * El radio del horizonte. A 520 m y con torres de hasta 210 m, desde la vista aérea el horizonte era
 * un muro gris de un tercio de pantalla; a 780 m y con torres algo más bajas se lee como lo que es,
 * una ciudad lejana en la bruma, y sigue dentro del plano lejano de la cámara (900 m).
 */
export const RADIO_DEL_HORIZONTE = 780;

export function crearElHorizonte(): THREE.Mesh {
  const g = new THREE.CylinderGeometry(RADIO_DEL_HORIZONTE, RADIO_DEL_HORIZONTE, 240, 64, 1, true);
  g.translate(0, 120, 0);
  const material = new THREE.ShaderMaterial({
    name: 'quiebro-horizonte',
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uAltoMaximo: { value: 140 }, uLucesDelHorizonte: UNIFORMES_DE_LA_LUZ.uLucesDelHorizonte, uClaridad: UNIFORMES_DE_LA_LUZ.uClaridad },
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

/* ═══════════════════════════════ LA CIUDAD LEJANA ═══════════════════════════════ */

const VERTICE_DE_LO_LEJANO = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
attribute float aVariante;
varying vec3 vPosL;
varying vec3 vNorL;
varying float vVarL;
void main() {
  vec4 mundo = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vPosL = mundo.xyz;
  vNorL = normalize(mat3(modelMatrix) * normal);
  vVarL = aVariante;
  vec4 mvPosition = viewMatrix * mundo;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAGMENTO_DE_LO_LEJANO = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform float uLucesDelHorizonte;
uniform float uClaridad;
uniform vec3 uLuzDelCielo;
varying vec3 vPosL;
varying vec3 vNorL;
varying float vVarL;
float hashL(vec2 p) {
  uvec2 q = uvec2(ivec2(floor(p)) + 65536);
  uint v = q.x * 1664525u + q.y * 1013904223u;
  v ^= v >> 16u; v *= 2246822519u; v ^= v >> 13u; v *= 3266489917u; v ^= v >> 16u;
  return float(v) * (1.0 / 4294967296.0);
}
void main() {
  vec3 n = normalize(vNorL);
  bool techo = n.y > 0.5;
  /* Ventanas: una rejilla de 3,2 m por planta y por vano, con pocas encendidas. */
  vec2 c = vec2((abs(n.x) > 0.5 ? vPosL.z : vPosL.x) / 3.2, vPosL.y / 3.2);
  vec2 id = floor(c);
  vec2 f = fract(c);
  float hueco = techo ? 0.0 : step(0.22, f.x) * step(f.x, 0.78) * step(0.3, f.y) * step(f.y, 0.82);
  float luz = hueco * step(0.9, hashL(id + vVarL * 977.0)) * step(4.5, vPosL.y);
  /* De madrugada, casi negras; al alba, piedra y hormigón lavados por el cielo, más claros arriba. */
  vec3 dia = mix(vec3(0.07, 0.08, 0.078), vec3(0.13, 0.13, 0.12), vVarL);
  vec2 haciaLaLuz = normalize(uLuzDelCielo.xz + vec2(1e-4));
  float cara = techo ? 1.25 : 0.55 + 0.45 * max(dot(n.xz, haciaLaLuz), 0.0);
  dia *= cara * (1.0 - 0.45 * hueco);
  vec3 noche = mix(vec3(0.008, 0.01, 0.011), vec3(0.014, 0.016, 0.017), vVarL);
  vec3 color = mix(noche, dia, clamp(uClaridad, 0.0, 1.0));
  color += luz * vec3(1.0, 0.72, 0.42) * 0.9 * uLucesDelHorizonte;
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

/** Cuántas cajas lejanas por nivel: el adorno, no la silueta (la silueta la pone el horizonte). */
export const CAJAS_LEJANAS: readonly [number, number, number, number] = [600, 1200, 2000, 3000];
/** Dónde empieza y dónde acaba la ciudad lejana, en metros desde el centro del barrio. */
const LEJANA_DESDE = 190;
const LEJANA_HASTA = 540;

/**
 * LA CIUDAD LEJANA: cajas en una rejilla de 11 m entre `LEJANA_DESDE` (en cuadrado, pasado el segundo
 * anillo) y `LEJANA_HASTA` (en círculo), elegidas por hash y ordenadas: el nivel sólo decide cuántas de
 * la MISMA lista se ponen, así que N3 es N0 con más cajas, nunca otra ciudad. Casi todas de 4 a 15
 * plantas; alguna torre de 25 a 40. Diez triángulos por caja (sin la cara de abajo), una llamada.
 */
export function crearLaCiudadLejana(semilla: number, cuantas: number): THREE.InstancedMesh {
  const sitios: { x: number; z: number; orden: number }[] = [];
  const PASO_L = 11;
  const celdas = Math.ceil(LEJANA_HASTA / PASO_L);
  for (let i = -celdas; i <= celdas; i++) {
    for (let k = -celdas; k <= celdas; k++) {
      const x = (i + 0.5) * PASO_L;
      const z = (k + 0.5) * PASO_L;
      if (Math.max(Math.abs(x), Math.abs(z)) < LEJANA_DESDE || Math.hypot(x, z) > LEJANA_HASTA) continue;
      /* Las calles: una fila y una columna de cada cuatro quedan libres. */
      if (((i % 4) + 4) % 4 === 0 || ((k % 4) + 4) % 4 === 0) continue;
      sitios.push({ x, z, orden: mezclar(semilla, i, k, 0x1e7a) });
    }
  }
  sitios.sort((a, b) => a.orden - b.orden);
  const n = Math.min(cuantas, sitios.length);
  const caja = new THREE.BoxGeometry(1, 1, 1);
  caja.translate(0, 0.5, 0);
  /* Sin la cara de abajo (la cuarta de `BoxGeometry`, -y), que no se ve nunca. */
  const indices = caja.getIndex();
  if (indices !== null) {
    const todos = Array.from(indices.array as ArrayLike<number>);
    caja.setIndex(todos.slice(0, 18).concat(todos.slice(24)));
    caja.clearGroups();
  }
  const variantes = new Float32Array(Math.max(1, n));
  const material = new THREE.ShaderMaterial({
    name: 'quiebro-ciudad-lejana',
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uLucesDelHorizonte: UNIFORMES_DE_LA_LUZ.uLucesDelHorizonte,
      uClaridad: UNIFORMES_DE_LA_LUZ.uClaridad,
      uLuzDelCielo: UNIFORMES_DE_LA_LUZ.uLuzDelCielo,
    },
    vertexShader: VERTICE_DE_LO_LEJANO,
    fragmentShader: FRAGMENTO_DE_LO_LEJANO,
    fog: true,
  });
  nieblaEn(material);
  const malla = new THREE.InstancedMesh(caja, material, Math.max(1, n));
  malla.name = 'quiebro-ciudad-lejana';
  const m = new THREE.Matrix4();
  for (let j = 0; j < n; j++) {
    const sitio = sitios[j] as { x: number; z: number; orden: number };
    const h = azarEn(sitio.orden, 1);
    const plantas = h > 0.96 ? 25 + Math.floor(azarEn(sitio.orden, 2) * 16) : 4 + Math.floor(Math.pow(azarEn(sitio.orden, 3), 1.6) * 12);
    const ancho = 7.5 + azarEn(sitio.orden, 4) * 3.5;
    const fondo = 7.5 + azarEn(sitio.orden, 5) * 3.5;
    m.makeScale(ancho, 4.5 + plantas * 3.2, fondo);
    m.setPosition(sitio.x, 0, sitio.z);
    malla.setMatrixAt(j, m);
    variantes[j] = azarEn(sitio.orden, 6);
  }
  malla.count = n;
  caja.setAttribute('aVariante', new THREE.InstancedBufferAttribute(variantes, 1));
  malla.frustumCulled = false;
  malla.renderOrder = -4;
  return malla;
}
