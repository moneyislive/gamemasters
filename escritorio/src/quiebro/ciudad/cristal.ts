/**
 * EL MATERIAL DEL VIDRIO TRANSPARENTE: el quiosco de la plaza, las lunas de los coches y el AGUA QUE CAE de la
 * fuente. Su opacidad sube con el Fresnel: de frente se ve el interior; a ras, el reflejo. Lleva los retoques de la
 * ciudad (cielo falso reflejado, luz de la calle, sólo brillo de las luces reales).
 *
 * ═══ LO QUE DICE LA UV ═══
 *
 * El molde del cristal no lleva atributos propios (`celdas.ts`): lo que distingue un paño de un chorro va en la UV,
 * que en el resto del cristal son metros y nunca pasan de unos cientos:
 *
 *   · u ≥ `U_DEL_AGUA` (2.000, `mobiliario.ts`): AGUA QUE CAE. u − 2.000 son los metros alrededor (o a lo ancho) y v
 *     los metros caídos desde donde rebosa. Se pinta como una lámina que corre hacia abajo con `uTiempo` (el Remanso
 *     la frena con él): hilos más densos y más claros que bajan, y más opaca cuanto más cae. El brillo es el de la
 *     luz (el cielo falso y las farolas en su Fresnel); los hilos le suben un poco la opacidad y el reflejo. La
 *     lámina es CLARA (opacidad de 0,05 a 0,4, y a ras no más de 0,6): detrás de ella está la columna abalaustrada,
 *     que es la silueta de la fuente; con la opacidad de un vidrio a ras (0,95) la lámina era una campana oscura.
 *   · `U_DE_LOS_PANOS` (1.000) ≤ u < 1.016: un PAÑO del quiosco de la plaza, con su número en la parte entera
 *     (u − 1.000, de 0 a 7) y la fracción a lo ancho. `uPanosRotosQ` (el rompible futuro, `PANOS_ROTOS`) dice qué
 *     paños faltan: x la máscara (bit i = el paño i, de 0 a 255), (y, z) el centro del quiosco y w el radio donde
 *     vale. Con x = 0 (lo de siempre) no hace nada.
 *
 * Nada de esto tiene gemelo en JS ni decide nada: la fuente no estorba de otra forma por su agua.
 */
import * as THREE from 'three';
import type { Retoque } from '../atmosfera/parcheo';
import { parchear } from '../atmosfera/parcheo';
import { nieblaEn } from '../atmosfera/niebla';
import { RETOQUE_ENTORNO, RETOQUE_MUNDO, RETOQUE_SOLO_BRILLO } from './retoques';
import type { NivelDeLaCiudad } from './tipos';
import type { OpcionesDeLoCercano } from './lo-cercano';
import { retoqueDeLoCercano } from './lo-cercano';

/**
 * LOS PAÑOS ROTOS DEL QUIOSCO DE LA PLAZA (el gancho de un rompible futuro): OBJETO COMPARTIDO, como
 * `UNIFORMES_DE_LA_CIUDAD`. x: la máscara de los ocho paños (bit i, el paño i); (y, z): el centro del quiosco; w: el
 * radio en que vale. Hoy nadie lo toca y vale 0: ningún paño roto.
 */
export const PANOS_ROTOS = { uPanosRotosQ: { value: new THREE.Vector4(0, 0, 0, 0) } };

const RETOQUE_DEL_CRISTAL: Retoque = {
  nombre: 'cristal',
  orden: 60,
  uniformes: PANOS_ROTOS,
  vertice: [
    { buscar: '#include <common>', como: 'despues', texto: 'varying vec2 vUvCrQ;' },
    { buscar: '#include <uv_vertex>', como: 'despues', texto: 'vUvCrQ = uv;' },
  ],
  fragmento: [
    { buscar: '#include <common>', como: 'despues', texto: 'varying vec2 vUvCrQ;\nuniform vec4 uPanosRotosQ;' },
    {
      buscar: '#include <clipping_planes_fragment>',
      como: 'despues',
      texto: /* glsl */ `
if (uPanosRotosQ.x > 0.5 && vUvCrQ.x >= 1000.0 && vUvCrQ.x < 1016.0 && distance(vPosMundoQ.xz, uPanosRotosQ.yz) < uPanosRotosQ.w) {
  int panoQ = int(vUvCrQ.x - 1000.0);
  if (((int(uPanosRotosQ.x + 0.5) >> panoQ) & 1) == 1) discard;
}`,
    },
    {
      buscar: '#include <opaque_fragment>',
      como: 'despues',
      texto: /* glsl */ `
{
  vec3 vC = normalize(cameraPosition - vPosMundoQ);
  vec3 nC = normalize(normal * mat3(viewMatrix));
  float f = pow(1.0 - clamp(abs(dot(vC, nC)), 0.0, 1.0), 4.0);
  gl_FragColor.a = mix(diffuseColor.a, 0.95, f);
  if (vUvCrQ.x >= 2000.0) {
    /* El agua que cae: hilos que corren hacia abajo, más juntos y más opacos cuanto más caen. */
    float alrededor = vUvCrQ.x - 2000.0;
    float caida = vUvCrQ.y;
    float hilo = 0.5 + 0.5 * sin(alrededor * 37.0 + sin(alrededor * 11.0) * 2.0);
    float corre = 0.5 + 0.5 * sin(caida * 14.0 - uTiempo * 9.0 + hilo * 3.0);
    float agua = mix(0.35, 1.0, hilo * corre);
    gl_FragColor.a = clamp(mix(0.03, 0.34, agua * agua) * (0.7 + 0.5 * smoothstep(0.0, 0.8, caida)) + f * 0.12, 0.0, 0.6);
    gl_FragColor.rgb *= 0.9 + 0.9 * agua;
  }
}`,
    },
  ],
};

/**
 * El material del cristal de un nivel. Con `deLaCapa`, el de la capa de lo cercano (ver `lo-cercano.ts`). El
 * nivel no cambia nada todavía.
 */
export function materialDelCristal(nivel: NivelDeLaCiudad, opciones: OpcionesDeLoCercano = {}): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.02, 0.03, 0.035),
    roughness: 0.04,
    metalness: 0,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  m.name = 'quiebro-cristal';
  parchear(m, RETOQUE_MUNDO, RETOQUE_ENTORNO, RETOQUE_SOLO_BRILLO, RETOQUE_DEL_CRISTAL, retoqueDeLoCercano(opciones.deLaCapa === true, nivel));
  nieblaEn(m);
  return m;
}
