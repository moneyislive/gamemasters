/**
 * EL MATERIAL DE LO QUE DA LUZ: el vidrio de las farolas, el auricular ámbar de las cabinas, las balizas de las
 * vallas, las ventanas del tren y la franja del Elevado. Color HDR por vértice; `aEmisor` dice qué es: tipo 0
 * fijo, 1 farola (se apaga con el Apagón), 2 baliza (parpadea con su fase).
 *
 * Vive aparte del mobiliario (`materiales.ts`) para que quien le dé tipos nuevos (las lentes de los coches, el
 * interior del tren, los semáforos) lo haga en su fichero sin tocar el del hierro y la madera.
 */
import * as THREE from 'three';
import type { Retoque } from '../atmosfera/parcheo';
import { parchear } from '../atmosfera/parcheo';
import { nieblaEn } from '../atmosfera/niebla';
import { UNIFORMES_DE_LA_CIUDAD } from './retoques';
import type { NivelDeLaCiudad } from './tipos';
import type { OpcionesDeLoCercano } from './lo-cercano';
import { retoqueDeLoCercano } from './lo-cercano';

/** Los atributos del molde de lo emisivo: [tipo, fase]. Tipo 0 fijo, 1 farola, 2 baliza. */
export const ATRIBUTOS_DE_LO_EMISIVO = { aEmisor: 2 } as const;

const RETOQUE_EMISIVO: Retoque = {
  nombre: 'emisivo',
  orden: 10,
  uniformes: { uFarolas: UNIFORMES_DE_LA_CIUDAD.uFarolas, uTiempo: UNIFORMES_DE_LA_CIUDAD.uTiempo },
  vertice: [
    { buscar: '#include <common>', como: 'despues', texto: 'attribute vec2 aEmisor;\nvarying vec2 vEmisorQ;' },
    { buscar: '#include <uv_vertex>', como: 'despues', texto: 'vEmisorQ = aEmisor;' },
  ],
  fragmento: [
    { buscar: '#include <common>', como: 'despues', texto: 'varying vec2 vEmisorQ;\nuniform float uFarolas;\nuniform float uTiempo;' },
    {
      buscar: '#include <color_fragment>',
      como: 'despues',
      texto: /* glsl */ `
if (vEmisorQ.x > 0.5 && vEmisorQ.x < 1.5) diffuseColor.rgb *= uFarolas;
if (vEmisorQ.x > 1.5) diffuseColor.rgb *= 0.08 + 0.92 * step(0.5, fract(uTiempo * 0.9 + vEmisorQ.y));`,
    },
  ],
};

/**
 * El material de lo emisivo de un nivel. Con `deLaCapa`, el de la capa de lo cercano (ver `lo-cercano.ts`). El
 * nivel no cambia nada todavía: lo usarán los tipos nuevos.
 */
export function materialEmisivo(nivel: NivelDeLaCiudad, opciones: OpcionesDeLoCercano = {}): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({ vertexColors: true });
  m.name = 'quiebro-emisivo';
  parchear(m, RETOQUE_EMISIVO, retoqueDeLoCercano(opciones.deLaCapa === true, nivel));
  nieblaEn(m);
  return m;
}
