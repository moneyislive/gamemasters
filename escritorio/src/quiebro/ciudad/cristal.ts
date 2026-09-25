/**
 * EL MATERIAL DEL VIDRIO TRANSPARENTE: el quiosco de la plaza y las lunas de los coches. Su opacidad sube con el
 * Fresnel: de frente se ve el interior; a ras, el reflejo. Lleva los retoques de la ciudad (cielo falso
 * reflejado, luz de la calle, sólo brillo de las luces reales).
 */
import * as THREE from 'three';
import type { Retoque } from '../atmosfera/parcheo';
import { parchear } from '../atmosfera/parcheo';
import { nieblaEn } from '../atmosfera/niebla';
import { RETOQUE_ENTORNO, RETOQUE_MUNDO, RETOQUE_SOLO_BRILLO } from './retoques';
import type { NivelDeLaCiudad } from './tipos';
import type { OpcionesDeLoCercano } from './lo-cercano';
import { retoqueDeLoCercano } from './lo-cercano';

const RETOQUE_DEL_CRISTAL: Retoque = {
  nombre: 'cristal',
  orden: 60,
  fragmento: [
    {
      buscar: '#include <opaque_fragment>',
      como: 'despues',
      texto: /* glsl */ `
{
  vec3 vC = normalize(cameraPosition - vPosMundoQ);
  vec3 nC = normalize(normal * mat3(viewMatrix));
  float f = pow(1.0 - clamp(abs(dot(vC, nC)), 0.0, 1.0), 4.0);
  gl_FragColor.a = mix(diffuseColor.a, 0.95, f);
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
