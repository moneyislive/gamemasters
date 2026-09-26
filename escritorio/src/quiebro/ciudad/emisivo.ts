/**
 * EL MATERIAL DE LO QUE DA LUZ: el vidrio de las farolas, el auricular ámbar de las cabinas, las balizas de las
 * vallas, las ventanas del tren, las lentes de los coches y la franja del Elevado. Color HDR por vértice;
 * `aEmisor` dice qué es:
 *
 *   · tipo 0, fijo;
 *   · tipo 1, farola (se apaga con el Apagón);
 *   · tipo 2, baliza (parpadea con su fase, `aEmisor.y`);
 *   · tipo 3, VENTANA DEL TREN: un interior falso por la UV de la ventana (de 0 a 1): el marco oscuro, los tubos
 *     de luz del techo y los respaldos abajo, y desde N2 los viajeros, de cero a dos cabezas por ventana según el
 *     hash de su número (`aEmisor.y`). Con `aEmisor.y` negativo es la cabina del conductor: oscura, con el
 *     reflejo del cielo en el parabrisas y el brillo bajo de los mandos;
 *   · tipo 4, LENTE DE UN FARO APAGADO (los coches aparcados): no alumbra; es un cristal oscuro sobre un
 *     reflector, con sus anillos, el punto de la bombilla y el brillo a ras que da cualquier cristal visto de lado.
 *     Antes era una caja gris que brillaba de frente: se leía como una pegatina.
 *
 * El nivel entra en el texto (`EMISIVO_Q`, y en el nombre del retoque: `emisivo-nN`): los viajeros, desde N2.
 * Vive aparte del mobiliario (`materiales.ts`) para que quien le dé tipos nuevos lo haga aquí.
 */
import * as THREE from 'three';
import type { Retoque } from '../atmosfera/parcheo';
import { parchear } from '../atmosfera/parcheo';
import { nieblaEn } from '../atmosfera/niebla';
import { UNIFORMES_DE_LA_CIUDAD } from './retoques';
import type { NivelDeLaCiudad } from './tipos';
import type { OpcionesDeLoCercano } from './lo-cercano';
import { retoqueDeLoCercano } from './lo-cercano';

/** Los atributos del molde de lo emisivo: [tipo, fase]. Ver la cabecera. */
export const ATRIBUTOS_DE_LO_EMISIVO = { aEmisor: 2 } as const;

/** Los tipos de `aEmisor.x`. */
export const TIPO_DE_EMISOR = { fijo: 0, farola: 1, baliza: 2, ventanaDelTren: 3, lente: 4 } as const;

/** El interior de una ventana del tren y la lente de un faro apagado (ver la cabecera). */
const GLSL_DE_LOS_TIPOS = /* glsl */ `
uint mezclaEmQ(uint x) {
  x ^= x >> 16u;
  x *= 0x7feb352du;
  x ^= x >> 15u;
  x *= 0x846ca68bu;
  x ^= x >> 16u;
  return x;
}
/* El interior falso de una ventana del tren: luz fría arriba, respaldos abajo, el marco oscuro alrededor. */
vec3 ventanaDelTrenQ(vec3 luz, vec2 uv, float numero) {
  vec2 d = min(uv, 1.0 - uv);
  float marco = 1.0 - smoothstep(0.03, 0.05, min(d.x * 0.7, d.y));
  if (numero < 0.0) {
    /* La cabina: oscura, con el cielo reflejado arriba y los mandos abajo. */
    vec3 c = luz * (0.08 + 0.3 * smoothstep(0.55, 1.0, uv.y)) + vec3(0.25, 0.9, 0.7) * 0.18 * smoothstep(0.22, 0.08, uv.y) * step(0.3, fract(uv.x * 7.0));
    return mix(c, vec3(0.008), marco);
  }
  float techo = smoothstep(0.58, 0.96, uv.y);
  vec3 c = luz * (0.5 + 0.55 * techo);
  c += luz * 0.9 * (1.0 - smoothstep(0.0, 0.035, abs(uv.y - 0.9)));
  /* Los respaldos: una franja oscura con los cabezales. */
  float cabezal = step(0.5, fract(uv.x * 3.0 + 0.25)) * (1.0 - smoothstep(0.34, 0.37, uv.y));
  c *= 1.0 - 0.6 * max(1.0 - smoothstep(0.26, 0.29, uv.y), cabezal * 0.7);
  #if EMISIVO_Q >= 2
  /* Los viajeros: de cero a dos, por el hash del número de la ventana. */
  uint h = mezclaEmQ(uint(numero) * 747796405u + 2891336453u);
  float sombra = 0.0;
  for (int i = 0; i < 2; i++) {
    uint hi = mezclaEmQ(h + uint(i) * 1013904223u);
    if ((hi & 3u) == 0u) continue;
    float px = 0.18 + 0.64 * float((hi >> 2u) & 255u) / 255.0;
    float alto = 0.5 + 0.12 * float((hi >> 10u) & 255u) / 255.0;
    vec2 q = (uv - vec2(px, alto)) / vec2(0.055, 0.1);
    float cabeza = 1.0 - smoothstep(0.85, 1.0, length(q));
    vec2 r = (uv - vec2(px, alto - 0.27)) / vec2(0.13, 0.2);
    float hombros = (1.0 - smoothstep(0.9, 1.0, length(r))) * step(uv.y, alto - 0.14);
    sombra = max(sombra, max(cabeza, hombros));
  }
  c *= 1.0 - 0.82 * sombra;
  #endif
  return mix(c, vec3(0.012), marco);
}
/* La lente de un faro apagado: cristal oscuro sobre un reflector con anillos, la bombilla y el brillo a ras. */
vec3 lenteQ(vec3 base, vec2 uv, vec3 p, vec3 n) {
  vec3 v = normalize(cameraPosition - p);
  float f = 1.0 - abs(dot(v, normalize(n)));
  vec2 q = (uv - 0.5) * 2.0;
  float r = length(q * vec2(1.0, 1.7));
  float anillos = 0.4 + 0.6 * (1.0 - smoothstep(0.08, 0.2, abs(fract(r * 2.5) - 0.5)));
  float reflector = (1.0 - smoothstep(0.7, 0.95, r)) * anillos;
  float bombilla = 1.0 - smoothstep(0.08, 0.26, r);
  vec3 c = base * (1.0 + 2.2 * reflector + 4.0 * bombilla) + vec3(0.5, 0.52, 0.56) * (f * f * f) * 0.45;
  float bisel = smoothstep(0.86, 1.0, max(abs(q.x), abs(q.y)));
  return mix(c, base * 0.35, bisel);
}
`;

const HECHOS = new Map<NivelDeLaCiudad, Retoque>();

/** El retoque de lo emisivo de un nivel (el nivel entra en el texto: los viajeros de las ventanas del tren). */
function retoqueEmisivo(nivel: NivelDeLaCiudad): Retoque {
  const hecho = HECHOS.get(nivel);
  if (hecho !== undefined) return hecho;
  const r: Retoque = {
    nombre: `emisivo-n${String(nivel)}`,
    orden: 10,
    uniformes: { uFarolas: UNIFORMES_DE_LA_CIUDAD.uFarolas, uTiempo: UNIFORMES_DE_LA_CIUDAD.uTiempo },
    defines: { EMISIVO_Q: String(nivel) },
    vertice: [
      { buscar: '#include <common>', como: 'despues', texto: 'attribute vec2 aEmisor;\nvarying vec2 vEmisorQ;\nvarying vec2 vUvEmQ;\nvarying vec3 vPosEmQ;\nvarying vec3 vNorEmQ;' },
      {
        buscar: '#include <uv_vertex>',
        como: 'despues',
        texto: 'vEmisorQ = aEmisor;\nvUvEmQ = uv;\nvPosEmQ = (modelMatrix * vec4(position, 1.0)).xyz;\nvNorEmQ = normalize(mat3(modelMatrix) * normal);',
      },
    ],
    fragmento: [
      {
        buscar: '#include <common>',
        como: 'despues',
        texto: `varying vec2 vEmisorQ;\nvarying vec2 vUvEmQ;\nvarying vec3 vPosEmQ;\nvarying vec3 vNorEmQ;\nuniform float uFarolas;\nuniform float uTiempo;\n${GLSL_DE_LOS_TIPOS}`,
      },
      {
        buscar: '#include <color_fragment>',
        como: 'despues',
        texto: /* glsl */ `
if (vEmisorQ.x > 0.5 && vEmisorQ.x < 1.5) diffuseColor.rgb *= uFarolas;
if (vEmisorQ.x > 1.5 && vEmisorQ.x < 2.5) diffuseColor.rgb *= 0.08 + 0.92 * step(0.5, fract(uTiempo * 0.9 + vEmisorQ.y));
if (vEmisorQ.x > 2.5 && vEmisorQ.x < 3.5) diffuseColor.rgb = ventanaDelTrenQ(diffuseColor.rgb, vUvEmQ, vEmisorQ.y);
if (vEmisorQ.x > 3.5) diffuseColor.rgb = lenteQ(diffuseColor.rgb, vUvEmQ, vPosEmQ, vNorEmQ);`,
      },
    ],
  };
  HECHOS.set(nivel, r);
  return r;
}

/** El material de lo emisivo de un nivel. Con `deLaCapa`, el de la capa de lo cercano (ver `lo-cercano.ts`). */
export function materialEmisivo(nivel: NivelDeLaCiudad, opciones: OpcionesDeLoCercano = {}): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({ vertexColors: true });
  m.name = 'quiebro-emisivo';
  parchear(m, retoqueEmisivo(nivel), retoqueDeLoCercano(opciones.deLaCapa === true, nivel));
  nieblaEn(m);
  return m;
}
