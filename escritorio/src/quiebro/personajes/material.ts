/**
 * EL MATERIAL DE LOS PERSONAJES: la paleta por zona, el contorno que se lee a 60 m, lo tenue y el corte
 * de la impresión, en UN `MeshStandardMaterial` parcheado (y su gemelo instanciado para los rebaños).
 *
 * ═══ POR QUÉ UN MATERIAL DE three Y NO UN `ShaderMaterial` PROPIO ═══
 *
 * Porque así los cuerpos reciben las farolas, las sombras de N2+ y el tono de la noche exactamente como
 * la ciudad, y la niebla de altura de `atmosfera/` entra sola (`nieblaEn`). Los cambios van como
 * retoques del parcheador de la casa (`atmosfera/parcheo.ts`): nadie asigna `onBeforeCompile`, que el
 * segundo que lo asigna borra al primero.
 *
 * ═══ EL CONTORNO: UN REBORDE EN EL SOMBREADOR, NO UN CASCO ═══
 *
 * El diseño pide siluetas con contorno legibles a 60 m e IGUALES en todos los niveles (§8), con el
 * color del asiento para los desvelados y uno de amenaza para los enemigos. El casco invertido (la
 * malla otra vez, engordada y por detrás) es el clásico, y es una llamada más por cuerpo: con un
 * cuerpo = una llamada, doblaría las llamadas de los personajes justo en N0. Aquí va dentro del mismo
 * sombreador, en tres capas que no cuestan nada:
 *
 *   · un FILO de unos dos píxeles donde la superficie se pone de canto (la normal casi perpendicular a
 *     la mirada), medido con `fwidth` para que tenga el mismo grosor en pantalla de cerca y de lejos;
 *   · un RESPLANDOR de Fresnel suave, que da cuerpo al filo;
 *   · un RELLENO que crece con la distancia (`lleno`, lo pone la CPU): a 60 m una figura mide unos veinte
 *     píxeles, el filo ya es casi toda ella, y el relleno termina de teñirla. De lejos se ve una figura
 *     del color de su asiento; de cerca, una persona con un filo de color.
 *
 * Y va DESPUÉS de la niebla (el retoque busca `premultiplied_alpha_fragment`, que sigue a `fog_fragment`):
 * a 60 m la niebla de aguacero se come el 70 % del color, y un contorno con niebla no se leería. Como en
 * ese punto el color ya está en el espacio de salida, el del contorno se convierte en el sombreador según
 * se pinte al lienzo (sRGB, N0 y N1) o a un blanco lineal (N2+, donde el ACES viene después: se le da un
 * poco más para que no se lave) — lo decide `onBeforeRender` con el blanco activo.
 *
 * La AMENAZA no es otro color de la paleta de asientos (el rojo del asiento 1 y el naranja del 5 se
 * confundirían con los de un Celador): es el verde-cian del código (§1), con rayas horizontales que
 * corren hacia arriba, como una pantalla vieja. Un asiento es un filo liso; un enemigo, un filo rayado.
 *
 * ═══ LO TENUE Y EL CORTE ═══
 *
 * Lo tenue (el compañero lejano, el fantasma del Eco, uno mismo en Vigía) se pinta con agujeros en un
 * patrón ordenado de 4×4: transparencia sin ordenar nada y sin mezclar, que en un teléfono modesto es
 * lo único gratis. El corte de la impresión y de la salida es una altura: por debajo (imprimirse) o por
 * encima (salir) se descarta, y en la raya brilla una banda del color del código o del ámbar.
 */
import * as THREE from 'three';
import { nieblaEn } from '../atmosfera/niebla';
import { parchear } from '../atmosfera/parcheo';
import type { Retoque } from '../atmosfera/parcheo';
import type { MallaFundida } from './malla';
import { ZONAS_COMO_MUCHO } from './reparto';

/** El verde-cian del código: el contorno de amenaza (§1). En sRGB. */
export const COLOR_DE_AMENAZA = '#3ff2c2';
/** El ámbar de lo del jugador: la banda de la salida por la cabina. */
export const COLOR_DE_SALIDA = '#ffb347';

/** Cómo se pinta el contorno de un cuerpo. */
export type ModoDelContorno = 'asiento' | 'amenaza';

/** Los uniformes que cambian por cuerpo. Uno por cuerpo; los programas se comparten. */
export interface UniformesDelCuerpo {
  readonly uColorZonaQ: { value: THREE.Color[] };
  readonly uRMZonaQ: { value: THREE.Vector2[] };
  /** rgb (lineal) y fuerza del contorno (0 sin contorno). */
  readonly uContornoQ: { value: THREE.Vector4 };
  /** 0 asiento (filo liso), 1 amenaza (filo rayado). */
  readonly uModoQ: { value: number };
  /** El relleno por distancia (0 a 1). */
  readonly uLlenoQ: { value: number };
  /** Lo tenue: la parte de píxeles que se descarta (0 nada). */
  readonly uTenueQ: { value: number };
  /** Corte: x altura (m), y modo (0 sin corte, 1 imprimirse: se ve por debajo, 2 salir: se ve por encima). */
  readonly uCorteQ: { value: THREE.Vector2 };
  /** Color de la banda del corte (lineal). */
  readonly uBandaQ: { value: THREE.Color };
  /** 1 si se pinta al lienzo (sRGB), 0 a un blanco lineal. */
  readonly uSalidaQ: { value: number };
  /** Reloj para las rayas de la amenaza, en segundos. */
  readonly uRelojQ: { value: number };
}

export function uniformesNuevos(): UniformesDelCuerpo {
  return {
    uColorZonaQ: { value: Array.from({ length: ZONAS_COMO_MUCHO }, () => new THREE.Color(0.5, 0.5, 0.5)) },
    uRMZonaQ: { value: Array.from({ length: ZONAS_COMO_MUCHO }, () => new THREE.Vector2(0.7, 0)) },
    uContornoQ: { value: new THREE.Vector4(1, 1, 1, 0) },
    uModoQ: { value: 0 },
    uLlenoQ: { value: 0 },
    uTenueQ: { value: 0 },
    uCorteQ: { value: new THREE.Vector2(0, 0) },
    uBandaQ: { value: new THREE.Color(COLOR_DE_AMENAZA) },
    uSalidaQ: { value: 1 },
    uRelojQ: { value: 0 },
  };
}

/* ─────────────────────────────── El GLSL ─────────────────────────────── */

const DECLARACIONES_DEL_FRAGMENTO = /* glsl */ `
varying float vZonaQ;
varying float vAlturaQ;
uniform vec4 uContornoQ;
uniform float uModoQ;
uniform float uLlenoQ;
uniform float uTenueQ;
uniform vec2 uCorteQ;
uniform vec3 uBandaQ;
uniform float uSalidaQ;
uniform float uRelojQ;
float bayerQ(vec2 p) {
  ivec2 q = ivec2(mod(p, 4.0));
  int i = q.x + q.y * 4;
  float m[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
  return (m[i] + 0.5) / 16.0;
}
`;

/**
 * Lo tenue y el corte del REBAÑO: lo mismo, pero por cabeza (el atributo `aCorteQ`: tenue, altura y modo
 * del corte). La primera versión le ponía al rebaño los descartes de los cuerpos con esqueleto, que leen
 * uniformes que el rebaño nunca rellenaba: un compañero lejano no salía tenue y un Celador que se
 * imprimía a 18 m en N0 aparecía entero de golpe (2.921 píxeles opaco, 2.917 imprimiéndose: lo midió la
 * revisión con `readPixels`).
 */
const DESCARTES_DEL_REBANO = /* glsl */ `
if (vCorteQ.x > 0.0 && bayerQ(gl_FragCoord.xy) < vCorteQ.x) discard;
float bandaQ = 0.0;
if (vCorteQ.z > 0.5) {
  float dQ = vCorteQ.z < 1.5 ? vCorteQ.y - vAlturaQ : vAlturaQ - vCorteQ.y;
  if (dQ < 0.0) discard;
  bandaQ = 1.0 - smoothstep(0.0, 0.07, dQ);
}
`;

/** Lo tenue y el corte: se descarta antes de iluminar nada. */
const DESCARTES = /* glsl */ `
if (uTenueQ > 0.0 && bayerQ(gl_FragCoord.xy) < uTenueQ) discard;
float bandaQ = 0.0;
if (uCorteQ.y > 0.5) {
  float dQ = uCorteQ.y < 1.5 ? uCorteQ.x - vAlturaQ : vAlturaQ - uCorteQ.x;
  if (dQ < 0.0) discard;
  bandaQ = 1.0 - smoothstep(0.0, 0.07, dQ);
}
`;

/** El contorno, en el espacio de salida: ver la cabecera. */
function contornoFinal(contorno: string, lleno: string, amenaza: string): string {
  return /* glsl */ `
{
  vec4 cQ = ${contorno};
  if (cQ.a > 0.0) {
    vec3 nQ = normalize(normal);
    vec3 vQ = normalize(vViewPosition);
    float ndvQ = abs(dot(nQ, vQ));
    float anchoQ = max(fwidth(ndvQ), 1e-4) * 2.2;
    float filoQ = 1.0 - smoothstep(0.0, anchoQ, ndvQ - 0.015);
    float resplandorQ = pow(1.0 - ndvQ, 4.0) * 0.4;
    float mezclaQ = clamp(max(filoQ, resplandorQ) + ${lleno}, 0.0, 1.0);
    if (${amenaza}) {
      float rayaQ = step(0.45, fract(gl_FragCoord.y * 0.25 - uRelojQ * 3.0));
      mezclaQ *= mix(0.5, 1.0, rayaQ);
    }
    vec3 colorQ = uSalidaQ > 0.5 ? sRGBTransferOETF(vec4(cQ.rgb, 1.0)).rgb : cQ.rgb * 1.6;
    gl_FragColor.rgb = mix(gl_FragColor.rgb, colorQ, mezclaQ * cQ.a);
  }
}
`;
}

/** La paleta por zona y la oclusión: el color base de cada fragmento. */
const PALETA = /* glsl */ `
int izQ = int(vZonaQ + 0.5);
diffuseColor.rgb = uColorZonaQ[izQ] * vColor.rgb * vColor.a;
diffuseColor.a = 1.0;
`;

/* ─────────────────────────────── El cuerpo con esqueleto ─────────────────────────────── */

function retoqueDelCuerpo(u: UniformesDelCuerpo): Retoque {
  return {
    nombre: 'personaje-quiebro',
    orden: 20,
    uniformes: u as unknown as Record<string, THREE.IUniform>,
    vertice: [
      { buscar: '#include <common>', como: 'despues', texto: 'attribute float zona;\nvarying float vZonaQ;\nvarying float vAlturaQ;' },
      {
        buscar: '#include <skinning_vertex>',
        como: 'despues',
        texto: 'vZonaQ = zona;\nvAlturaQ = (modelMatrix * vec4(transformed, 1.0)).y;',
      },
    ],
    fragmento: [
      {
        buscar: '#include <common>',
        como: 'despues',
        texto: `${DECLARACIONES_DEL_FRAGMENTO}\nuniform vec3 uColorZonaQ[${String(ZONAS_COMO_MUCHO)}];\nuniform vec2 uRMZonaQ[${String(ZONAS_COMO_MUCHO)}];`,
      },
      { buscar: '#include <clipping_planes_fragment>', como: 'despues', texto: DESCARTES },
      { buscar: '#include <color_fragment>', como: 'despues', texto: PALETA },
      { buscar: '#include <roughnessmap_fragment>', como: 'despues', texto: 'roughnessFactor = uRMZonaQ[izQ].x;' },
      { buscar: '#include <metalnessmap_fragment>', como: 'despues', texto: 'metalnessFactor = uRMZonaQ[izQ].y;' },
      { buscar: '#include <emissivemap_fragment>', como: 'despues', texto: 'totalEmissiveRadiance += uBandaQ * bandaQ * 3.0;' },
    ],
  };
}

/** El contorno va DESPUÉS de la niebla (orden 110 > 100): ver la cabecera. */
function retoqueDelContorno(): Retoque {
  return {
    nombre: 'contorno-quiebro',
    orden: 110,
    fragmento: [{ buscar: '#include <premultiplied_alpha_fragment>', como: 'antes', texto: contornoFinal('uContornoQ', 'uLlenoQ', 'uModoQ > 0.5') }],
  };
}

/** Un material de cuerpo con su paleta base (la de la figura) y sus uniformes propios. */
export interface MaterialDeCuerpo {
  readonly material: THREE.MeshStandardMaterial;
  readonly u: UniformesDelCuerpo;
}

/**
 * EL MATERIAL DE UN CUERPO. Uno por cuerpo (sus colores son suyos); todos comparten programa, porque la
 * llave de caché del parcheo es la misma. `onBeforeRender` de la malla debe llamar a `alPintar`.
 */
export function materialDeCuerpo(malla: MallaFundida): MaterialDeCuerpo {
  const u = uniformesNuevos();
  malla.base.forEach((b, i) => {
    (u.uColorZonaQ.value[i] as THREE.Color).copy(b.color);
    (u.uRMZonaQ.value[i] as THREE.Vector2).set(b.rugosidad, b.metal);
  });
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 1, vertexColors: true });
  material.name = 'personaje-quiebro';
  parchear(material, retoqueDelCuerpo(u), retoqueDelContorno());
  nieblaEn(material);
  return { material, u };
}

/**
 * Lo que hay que hacer justo antes de pintar: saber si se pinta al lienzo o a un blanco (ver la
 * cabecera). Se engancha al `onBeforeRender` de la malla.
 */
export function alPintar(u: { uSalidaQ: { value: number } }, renderer: THREE.WebGLRenderer): void {
  u.uSalidaQ.value = renderer.getRenderTarget() === null ? 1 : 0;
}

/** Pone el tinte de un cuerpo (colores sRGB por nombre de zona) sobre la paleta base. */
export function tenir(u: UniformesDelCuerpo, malla: MallaFundida, colores: Readonly<Record<string, string>>, rugosidad: Readonly<Record<string, number>>): void {
  malla.base.forEach((b, i) => {
    const nombre = malla.zonas[i] ?? '';
    const c = colores[nombre];
    const color = u.uColorZonaQ.value[i] as THREE.Color;
    if (c !== undefined) color.set(c);
    else color.copy(b.color);
    const r = rugosidad[nombre];
    (u.uRMZonaQ.value[i] as THREE.Vector2).set(r ?? b.rugosidad, b.metal);
  });
}

/* ─────────────────────────────── El rebaño instanciado ─────────────────────────────── */

/** Cuántas ropas caben en la tabla de un rebaño (por fila: abrigo, tela, camisa). */
export const ROPAS_COMO_MUCHO = 8;

/** Uniformes de un rebaño (uno por rebaño: lo que cambia por cabeza va en atributos). */
export interface UniformesDelRebano {
  readonly uColorZonaQ: { value: THREE.Color[] };
  readonly uRMZonaQ: { value: THREE.Vector2[] };
  readonly uTablaQ: { value: THREE.Color[] };
  readonly uPelosQ: { value: THREE.Color[] };
  readonly uPielesQ: { value: THREE.Color[] };
  /** Índices de zona teñidos: abrigo, tela, camisa, pelo; −1 si la figura no la tiene. */
  readonly uZonasQ: { value: THREE.Vector4 };
  /** Índice de zona de la piel, y si la camisa sale del color del contorno (el forro del desvelado). */
  readonly uZonas2Q: { value: THREE.Vector2 };
  /**
   * La primera zona que es de una pieza (el paraguas fundido en la malla de la multitud): esos vértices
   * se pliegan a un punto en las cabezas que no lo llevan. 99 si no hay piezas.
   */
  readonly uPrimeraPiezaQ: { value: number };
  /** La zona de la tela del paraguas (se tiñe con `uParaguasQ`), o −1. */
  readonly uTelaDelParaguasQ: { value: number };
  readonly uParaguasQ: { value: THREE.Color[] };
  readonly uHuesosQ: { value: THREE.DataTexture | null };
  readonly uSalidaQ: { value: number };
  readonly uRelojQ: { value: number };
  readonly uModoQ: { value: number };
  /** La banda del corte de imprimirse (código) y de salir (ámbar), en lineal. */
  readonly uBandaImpresionQ: { value: THREE.Color };
  readonly uBandaSalidaQ: { value: THREE.Color };
}

/**
 * EL MATERIAL DE UN REBAÑO: el mismo cuerpo (paleta, contorno, niebla), pero la piel sale de una
 * textura de huesos horneada (`huesos-en-textura.ts`) y todo lo de cada cabeza va en atributos de
 * instancia: `aAnimQ` (fila A, fila B, mezcla, relleno), `aVestidoQ` (ropa, pelo, piel, modo del
 * contorno) y `aContornoQ` (rgb lineal, fuerza).
 */
export function materialDeRebano(malla: MallaFundida): { material: THREE.MeshStandardMaterial; u: UniformesDelRebano } {
  const u: UniformesDelRebano = {
    uColorZonaQ: { value: Array.from({ length: ZONAS_COMO_MUCHO }, (_, i) => malla.base[i]?.color.clone() ?? new THREE.Color(0.5, 0.5, 0.5)) },
    uRMZonaQ: { value: Array.from({ length: ZONAS_COMO_MUCHO }, (_, i) => new THREE.Vector2(malla.base[i]?.rugosidad ?? 0.7, malla.base[i]?.metal ?? 0)) },
    uTablaQ: { value: Array.from({ length: ROPAS_COMO_MUCHO * 3 }, () => new THREE.Color(0.3, 0.3, 0.3)) },
    uPelosQ: { value: Array.from({ length: 4 }, () => new THREE.Color(0.02, 0.015, 0.01)) },
    uPielesQ: { value: Array.from({ length: 4 }, () => new THREE.Color(0.5, 0.33, 0.25)) },
    uZonasQ: { value: new THREE.Vector4(-1, -1, -1, -1) },
    uZonas2Q: { value: new THREE.Vector2(-1, 0) },
    uPrimeraPiezaQ: { value: 99 },
    uTelaDelParaguasQ: { value: -1 },
    uParaguasQ: { value: Array.from({ length: 8 }, () => new THREE.Color(0.02, 0.02, 0.025)) },
    uHuesosQ: { value: null },
    uSalidaQ: { value: 1 },
    uRelojQ: { value: 0 },
    uModoQ: { value: 0 },
    uBandaImpresionQ: { value: new THREE.Color(COLOR_DE_AMENAZA) },
    uBandaSalidaQ: { value: new THREE.Color(COLOR_DE_SALIDA) },
  };
  const zonas = (nombre: string): number => malla.zonas.indexOf(nombre);
  /* La prenda de fuera: el abrigo, o el traje del Celador (que no tiene abrigo). */
  const fuera = zonas('mat_abrigo') >= 0 ? zonas('mat_abrigo') : zonas('mat_traje');
  u.uZonasQ.value.set(fuera, zonas('mat_tela'), zonas('mat_camisa'), zonas('mat_pelo'));
  u.uZonas2Q.value.set(zonas('mat_piel'), 0);
  const piezas = malla.zonas.map((z, i) => (z.startsWith('pieza_') || z === 'mat_paraguas' || z === 'mat_varilla' || z === 'mat_mango' ? i : 99));
  /* Las zonas de las piezas son las que siguen a las de la figura (el paraguas de la multitud, la pistola del tirador lejano). */
  u.uPrimeraPiezaQ.value = malla.zonas.length > malla.zonasDelCuerpo ? malla.zonasDelCuerpo : Math.min(99, ...piezas);
  u.uTelaDelParaguasQ.value = zonas('mat_paraguas') >= 0 ? zonas('mat_paraguas') : zonas('pieza_tela');
  const retoque: Retoque = {
    nombre: `rebano-quiebro-${String(malla.huesos.length)}`,
    orden: 20,
    uniformes: u as unknown as Record<string, THREE.IUniform>,
    vertice: [
      {
        buscar: '#include <common>',
        como: 'despues',
        texto: /* glsl */ `
attribute float zona;
attribute vec4 skinIndex;
attribute vec4 skinWeight;
attribute vec4 aAnimQ;
attribute vec4 aVestidoQ;
attribute vec4 aContornoQ;
attribute vec4 aCorteQ;
uniform highp sampler2D uHuesosQ;
uniform float uPrimeraPiezaQ;
varying float vZonaQ;
varying float vAlturaQ;
varying vec4 vVestidoQ;
varying vec4 vContornoQ;
varying vec4 vCorteQ;
varying float vLlenoQ;
mat4 huesoQ(float fila, float i) {
  int x = int(i) * 3;
  int y = int(fila);
  vec4 a = texelFetch(uHuesosQ, ivec2(x, y), 0);
  vec4 b = texelFetch(uHuesosQ, ivec2(x + 1, y), 0);
  vec4 c = texelFetch(uHuesosQ, ivec2(x + 2, y), 0);
  return mat4(vec4(a.x, b.x, c.x, 0.0), vec4(a.y, b.y, c.y, 0.0), vec4(a.z, b.z, c.z, 0.0), vec4(a.w, b.w, c.w, 1.0));
}
mat4 pielEnFilaQ(float fila) {
  return huesoQ(fila, skinIndex.x) * skinWeight.x + huesoQ(fila, skinIndex.y) * skinWeight.y
       + huesoQ(fila, skinIndex.z) * skinWeight.z + huesoQ(fila, skinIndex.w) * skinWeight.w;
}`,
      },
      {
        buscar: '#include <skinbase_vertex>',
        como: 'despues',
        texto: /* glsl */ `
mat4 pielQ = pielEnFilaQ(aAnimQ.x);
if (aAnimQ.z > 0.001) pielQ = pielQ * (1.0 - aAnimQ.z) + pielEnFilaQ(aAnimQ.y) * aAnimQ.z;
objectNormal = normalize(mat3(pielQ) * objectNormal);`,
      },
      {
        buscar: '#include <skinning_vertex>',
        como: 'despues',
        texto: /* glsl */ `
transformed = (pielQ * vec4(transformed, 1.0)).xyz;
/* El paraguas fundido: en quien no lo lleva (ropa < 8), sus vértices se pliegan a un punto y no se ven. */
if (zona >= uPrimeraPiezaQ - 0.5 && aVestidoQ.x < 7.5) transformed = vec3(0.0, -10.0, 0.0);
vZonaQ = zona;
vVestidoQ = aVestidoQ;
vContornoQ = aContornoQ;
vCorteQ = aCorteQ;
vLlenoQ = aAnimQ.w;
vAlturaQ = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).y;`,
      },
    ],
    fragmento: [
      {
        buscar: '#include <common>',
        como: 'despues',
        texto: `${DECLARACIONES_DEL_FRAGMENTO}
varying vec4 vVestidoQ;
varying vec4 vContornoQ;
varying vec4 vCorteQ;
varying float vLlenoQ;
uniform vec3 uBandaImpresionQ;
uniform vec3 uBandaSalidaQ;
uniform vec3 uColorZonaQ[${String(ZONAS_COMO_MUCHO)}];
uniform vec2 uRMZonaQ[${String(ZONAS_COMO_MUCHO)}];
uniform vec3 uTablaQ[${String(ROPAS_COMO_MUCHO * 3)}];
uniform vec3 uPelosQ[4];
uniform vec3 uPielesQ[4];
uniform vec4 uZonasQ;
uniform vec2 uZonas2Q;
uniform float uTelaDelParaguasQ;
uniform vec3 uParaguasQ[8];`,
      },
      { buscar: '#include <clipping_planes_fragment>', como: 'despues', texto: DESCARTES_DEL_REBANO },
      { buscar: '#include <emissivemap_fragment>', como: 'despues', texto: 'totalEmissiveRadiance += (vCorteQ.z < 1.5 ? uBandaImpresionQ : uBandaSalidaQ) * bandaQ * 3.0;' },
      {
        buscar: '#include <color_fragment>',
        como: 'despues',
        texto: /* glsl */ `
int izQ = int(vZonaQ + 0.5);
vec3 baseQ = uColorZonaQ[izQ];
/* Lo que va empaquetado por cabeza: ropa + 8·paraguas, pelo + 4·tela del paraguas, piel. */
int ropaQ = int(mod(vVestidoQ.x + 0.5, 8.0)) * 3;
int peloQ = int(mod(vVestidoQ.y + 0.5, 4.0));
int telaQ = int(floor((vVestidoQ.y + 0.5) / 4.0));
float zQ = float(izQ);
if (zQ == uZonasQ.x) baseQ = uTablaQ[ropaQ];
else if (zQ == uZonasQ.y) baseQ = uTablaQ[ropaQ + 1];
else if (zQ == uZonasQ.z) baseQ = uZonas2Q.y > 0.5 ? vContornoQ.rgb : uTablaQ[ropaQ + 2];
else if (zQ == uZonasQ.w) baseQ = uPelosQ[peloQ];
else if (zQ == uZonas2Q.x) baseQ = uPielesQ[int(vVestidoQ.z + 0.5)];
else if (zQ == uTelaDelParaguasQ) baseQ = uParaguasQ[telaQ];
diffuseColor.rgb = baseQ * vColor.rgb * vColor.a;
diffuseColor.a = 1.0;`,
      },
      { buscar: '#include <roughnessmap_fragment>', como: 'despues', texto: 'roughnessFactor = uRMZonaQ[izQ].x;' },
      { buscar: '#include <metalnessmap_fragment>', como: 'despues', texto: 'metalnessFactor = uRMZonaQ[izQ].y;' },
    ],
  };
  const contorno: Retoque = {
    nombre: 'contorno-rebano-quiebro',
    orden: 110,
    fragmento: [
      {
        buscar: '#include <premultiplied_alpha_fragment>',
        como: 'antes',
        texto: contornoFinal('vContornoQ', 'vLlenoQ', 'vVestidoQ.w > 0.5'),
      },
    ],
  };
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 1, vertexColors: true });
  material.name = 'rebano-quiebro';
  parchear(material, retoque, contorno);
  nieblaEn(material);
  return { material, u };
}
