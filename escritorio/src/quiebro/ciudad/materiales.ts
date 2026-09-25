/**
 * LOS TRES MATERIALES DEL MOBILIARIO: todo lo que no es fachada ni suelo se pinta con uno de ellos.
 *
 * ═══ POR QUÉ TRES Y NO UNO POR PIEZA ═══
 *
 * Una farola, un banco, un coche aparcado, la fuente y la viga del tren son estáticos: fundidos en
 * una geometría por material, son TRES llamadas para todo el mobiliario del barrio, se vea lo que se
 * vea. Lo que distingue el hierro de la madera o la chapa del caucho viaja por vértice: el color en
 * `color` y la rugosidad y el metal en `aAcabado`. El agua (la de la fuente) es un acabado más, con
 * rugosidad casi cero, y lleva las ondas de las gotas.
 *
 *   · `mobiliario` (aquí): `MeshStandardMaterial` con color por vértice y acabado por vértice. Con los
 *     retoques de la ciudad: cielo falso reflejado, luz de la calle horneada, sólo brillo de las
 *     luces reales, y más mojado en lo que mira al cielo.
 *   · `emisivo` (`emisivo.ts`): lo que da luz (el vidrio de las farolas, el auricular ámbar de las
 *     cabinas, las balizas de las vallas, las ventanas del tren). Color HDR por vértice; `aEmisor` dice
 *     si es una farola (se apaga con el Apagón) o una baliza (parpadea).
 *   · `cristal` (`cristal.ts`): el vidrio transparente (el quiosco de la plaza, las lunas de los coches).
 *     Su opacidad sube con el Fresnel: de frente se ve el interior; a ras, el reflejo.
 *
 * Cada fábrica recibe el nivel (hoy no cambia nada: lo usará la materia, §2.2 del plan del detalle) y las
 * opciones de lo cercano (`lo-cercano.ts`), que le ponen su retoque. Los de lo emisivo y el cristal se
 * reexportan desde aquí, donde siempre estuvieron.
 */
import * as THREE from 'three';
import type { Retoque } from '../atmosfera/parcheo';
import { parchear } from '../atmosfera/parcheo';
import { nieblaEn } from '../atmosfera/niebla';
import { GLSL_ONDAS, RETOQUE_ENTORNO, RETOQUE_MUNDO, RETOQUE_SOLO_BRILLO } from './retoques';
import type { NivelDeLaCiudad } from './tipos';
import type { OpcionesDeLoCercano } from './lo-cercano';
import { retoqueDeLoCercano } from './lo-cercano';

export { ATRIBUTOS_DE_LO_EMISIVO, materialEmisivo } from './emisivo';
export { materialDelCristal } from './cristal';

/** Los atributos del molde del mobiliario. */
export const ATRIBUTOS_DEL_MOBILIARIO = { aAcabado: 2 } as const;

/** Acabados de uso común: [rugosidad, metal]. Rugosidad < 0,03 es agua. */
export const ACABADO = {
  hierro: [0.45, 0.7],
  hierroViejo: [0.7, 0.5],
  /* La pintura de un coche es un barniz transparente sobre el color: brilla en blanco, no en su color. */
  chapa: [0.2, 0.12],
  pintura: [0.35, 0.0],
  madera: [0.7, 0.0],
  piedra: [0.75, 0.0],
  hormigon: [0.85, 0.0],
  caucho: [0.9, 0.0],
  plastico: [0.45, 0.0],
  cromo: [0.15, 1.0],
  agua: [0.02, 0.0],
} as const satisfies Record<string, readonly [number, number]>;

const RETOQUE_DEL_MOBILIARIO: Retoque = {
  nombre: 'mobiliario',
  orden: 10,
  vertice: [
    { buscar: '#include <common>', como: 'despues', texto: 'attribute vec2 aAcabado;\nvarying vec2 vAcabadoQ;' },
    { buscar: '#include <uv_vertex>', como: 'despues', texto: 'vAcabadoQ = aAcabado;' },
  ],
  fragmento: [
    { buscar: '#include <lights_pars_begin>', como: 'antes', texto: `varying vec2 vAcabadoQ;\n${GLSL_ONDAS}` },
    {
      buscar: '#include <normal_fragment_maps>',
      como: 'despues',
      texto: /* glsl */ `
{
  vec3 nM = normalize(normal * mat3(viewMatrix));
  float rug = vAcabadoQ.x;
  if (rug < 0.03) {
    /* Agua: un espejo con las ondas de las gotas. */
    vec2 g = ondasQ(vPosMundoQ.xz, uTiempo);
    nM = normalize(vec3(-g.x, 1.0, -g.y));
    normal = normalize((viewMatrix * vec4(nM, 0.0)).xyz);
  } else {
    /* Lo que mira al cielo está mojado: más liso. */
    rug = mix(rug, rug * 0.55, smoothstep(0.4, 0.9, nM.y));
  }
  roughnessFactor = rug;
  metalnessFactor = vAcabadoQ.y;
}`,
    },
  ],
};

/**
 * El material del mobiliario de un nivel. Con `deLaCapa`, el de la capa de lo cercano (ver `lo-cercano.ts`). El
 * nivel no cambia nada todavía.
 */
export function materialDelMobiliario(nivel: NivelDeLaCiudad, opciones: OpcionesDeLoCercano = {}): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0 });
  m.name = 'quiebro-mobiliario';
  parchear(m, RETOQUE_MUNDO, RETOQUE_ENTORNO, RETOQUE_SOLO_BRILLO, RETOQUE_DEL_MOBILIARIO, retoqueDeLoCercano(opciones.deLaCapa === true, nivel));
  nieblaEn(m);
  return m;
}

/** Un color sRGB en hexadecimal a lineal, como lo quiere el color por vértice. */
export function lineal(hex: number): [number, number, number] {
  const c = new THREE.Color().setHex(hex, THREE.SRGBColorSpace);
  return [c.r, c.g, c.b];
}
