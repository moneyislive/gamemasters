/**
 * LOS TRES MATERIALES DEL MOBILIARIO: todo lo que no es fachada ni suelo se pinta con uno de ellos.
 *
 * ═══ POR QUÉ TRES Y NO UNO POR PIEZA ═══
 *
 * Una farola, un banco, un coche aparcado, la fuente y la viga del tren son estáticos: fundidos en
 * una geometría por material, son TRES llamadas para todo el mobiliario del barrio, se vea lo que se
 * vea. Lo que distingue el hierro de la madera o la chapa del caucho viaja por vértice: el color en
 * `color` y la rugosidad, el metal y la FAMILIA en `aAcabado`. El agua (la de la fuente) es un acabado
 * más, con rugosidad casi cero, y lleva las ondas de las gotas.
 *
 *   · `mobiliario` (aquí): `MeshStandardMaterial` con color por vértice y acabado por vértice. Con los
 *     retoques de la ciudad: cielo falso reflejado, luz de la calle horneada, sólo brillo de las
 *     luces reales, y más mojado en lo que mira al cielo. Y desde N1, la MATERIA (`materia/`).
 *   · `emisivo` (`emisivo.ts`): lo que da luz (el vidrio de las farolas, el auricular ámbar de las
 *     cabinas, las balizas de las vallas, las ventanas del tren). Color HDR por vértice; `aEmisor` dice
 *     si es una farola (se apaga con el Apagón) o una baliza (parpadea).
 *   · `cristal` (`cristal.ts`): el vidrio transparente (el quiosco de la plaza, las lunas de los coches) y
 *     el agua que cae de la fuente. Su opacidad sube con el Fresnel: de frente se ve el interior; a ras, el
 *     reflejo.
 *
 * Cada fábrica recibe el nivel y las opciones de lo cercano (`lo-cercano.ts`), que le ponen su retoque. Los de
 * lo emisivo y el cristal se reexportan desde aquí, donde siempre estuvieron.
 *
 * ═══ LA MATERIA DEL MOBILIARIO (plan del detalle, §2.2 y O2-MOBILIARIO) ═══
 *
 * `aAcabado` lleva, sin un byte nuevo, la familia en la parte entera de la rugosidad y las marcas (chaflán,
 * barniz) en la del metal (`acabado()` de `materia/familias.ts`). La tabla `ACABADO` de aquí es la familia 0
 * (lo liso): con ella, el acabado es la rugosidad y el metal de siempre, y así lo que no se ha pasado a una
 * familia (el tráfico del barrio, los toldos, el tren) no cambia. `OFICIO` es la misma idea con familia.
 *
 *   · N0: NI STRUCT NI REPARTO. La parte entera se quita EN EL VÉRTICE (`fract`, una vez por vértice y no por
 *     píxel): el fragmento es el de siempre, byte a byte en lo que hace, y su coste de fxc el de hoy (§7.4:
 *     «≤ hoy»). En N0 el metal que se ve es el del acabado: el del hierro desnudo en el hierro, como hoy.
 *   · N1-N3: `vAcabadoQ` va `flat` (interpolado, un 9,0 puede llegar como 8,999 y ser otra familia), se
 *     decodifica ANTES del agua (la rugosidad del agua es la fracción, no «familia + fracción»), y lo que no
 *     es agua pasa por `superficieQ` (el reparto a `materia/familias/<nombre>.ts`), por la RECETA común del
 *     mobiliario (`recetaMoQ`, `familias/liso.ts`: cada familia del mobiliario es una fila de números en una tabla
 *     constante, y el trabajo se hace una vez por píxel en vez de una vez por rama; ahí está el porqué, medido con
 *     fxc) y por su `recordarSuperficieQ` (el barniz y la emisión que la materia pone después de la luz). La
 *     familia recibe la normal de MUNDO, la posición, la UV del molde (metros: `MATERIA_UV_Q = vUvMoQ`) y la
 *     humedad de la noche en `humedadMoQ`.
 *   · Después, lo de siempre para todos: lo que mira al cielo está mojado y es más liso.
 *
 * La humedad llega como `uHumedadMoQ` (el MISMO objeto que `uHumedad`, con otro nombre): `uHumedad` lo
 * declara `GLSL_CHARCOS`, y el día que un retoque común la trajera al mobiliario se declararía dos veces.
 *
 * ═══ EL TOPE DEL SOMBREADOR (§5.2.9 y §7.4) ═══
 *
 * `TOPE_DEL_SOMBREADOR_POR_NIVEL`: instrucciones de fxc (`verify:quiebro-gl`) y lecturas de textura en el peor
 * camino (`verify:quiebro-materia`, b) del MATERIAL ENTERO, con las familias de todos los paquetes (la fundición
 * de SUELO, el follaje de FAROLAS-Y-PIEZAS, la carrocería, la llanta, el aluminio y el viaducto de VEHÍCULOS
 * también se reparten aquí). N0 es «≤ hoy» (461 del plan más los 42 del tono propio de N0, que el juego pinta y
 * `verify:quiebro-gl` confirma); N1-N3 dejan 100 de margen bajo §7.4 para la ola 3 (40 del horizonte local y 60
 * de lo cercano).
 */
import * as THREE from 'three';
import type { Retoque } from '../atmosfera/parcheo';
import { parchear } from '../atmosfera/parcheo';
import { nieblaEn } from '../atmosfera/niebla';
import { GLSL_ONDAS, RETOQUE_ENTORNO, RETOQUE_MUNDO, RETOQUE_SOLO_BRILLO, UNIFORMES_DE_LA_CIUDAD } from './retoques';
import type { NivelDeLaCiudad } from './tipos';
import type { OpcionesDeLoCercano } from './lo-cercano';
import { retoqueDeLoCercano } from './lo-cercano';
import { retoqueDeLaMateria } from './materia/retoque';
import { FAMILIA, acabado } from './materia/familias';

export { ATRIBUTOS_DE_LO_EMISIVO, materialEmisivo } from './emisivo';
export { materialDelCristal } from './cristal';

/** Los atributos del molde del mobiliario. */
export const ATRIBUTOS_DEL_MOBILIARIO = { aAcabado: 2 } as const;

/**
 * Acabados de uso común, familia 0 (lo liso): [rugosidad, metal]. Rugosidad < 0,03 es agua. El cromo lleva
 * 0,999 y no 1: el metal viaja en la fracción (ver la cabecera), y la de 1,0 es 0.
 */
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
  cromo: [0.15, 0.999],
  agua: [0.02, 0.0],
} as const satisfies Record<string, readonly [number, number]>;

/**
 * LOS ACABADOS DE OFICIO: los de `ACABADO`, con su familia de la materia (`materia/familias.ts`). La
 * rugosidad y el metal son los de siempre (así N0, que no reparte familias, pinta como hoy); la familia
 * decide desde N1 qué hace con ellos. En el hierro fundido pintado, el metal es el del hierro DESNUDO: la
 * pintura es dieléctrica y el metal sólo asoma donde se gasta (en los chaflanes, con la marca). `…Canto` son
 * los mismos con la marca de chaflán, para `Molde.cajaBiselada({ alChaflan })`. La persiana es la chapa
 * ondulada con la marca de chaflán, que en esa familia pone la onda en horizontal (lamas).
 */
export const OFICIO = {
  hierro: acabado(FAMILIA.hierro, 0.45, 0.7),
  hierroCanto: acabado(FAMILIA.hierro, 0.45, 0.7, { chaflan: true }),
  hierroViejo: acabado(FAMILIA.hierro, 0.7, 0.5),
  madera: acabado(FAMILIA.madera, 0.7, 0),
  maderaCanto: acabado(FAMILIA.madera, 0.7, 0, { chaflan: true }),
  piedra: acabado(FAMILIA.piedra, 0.75, 0),
  piedraCanto: acabado(FAMILIA.piedra, 0.75, 0, { chaflan: true }),
  hormigon: acabado(FAMILIA.hormigon, 0.85, 0),
  caucho: acabado(FAMILIA.caucho, 0.9, 0),
  plastico: acabado(FAMILIA.plastico, 0.45, 0),
  chapa: acabado(FAMILIA.chapa, 0.35, 0.3),
  chapaCanto: acabado(FAMILIA.chapa, 0.35, 0.3, { chaflan: true }),
  /* La chapa de un tejadillo: más áspera, que mojada y a ras no sea un espejo del cielo falso a manchas. */
  chapaMate: acabado(FAMILIA.chapa, 0.62, 0.3),
  ondulada: acabado(FAMILIA.chapaOndulada, 0.4, 0.55),
  persiana: acabado(FAMILIA.chapaOndulada, 0.4, 0.55, { chaflan: true }),
  cromo: acabado(FAMILIA.liso, 0.15, 0.999),
  agua: acabado(FAMILIA.liso, 0.02, 0),
} as const satisfies Record<string, readonly [number, number]>;

/** Instrucciones de fxc y lecturas de textura del peor camino, por nivel (ver la cabecera). */
export interface TopeDelSombreador {
  readonly instrucciones: number;
  readonly lecturas: number;
}

/**
 * EL TOPE DEL SOMBREADOR DEL MOBILIARIO (ver la cabecera). Las lecturas son TODAS las del peor camino (la luz
 * de la calle lee su mapa: 3; las familias, el ruido de la materia); en N0, las de hoy.
 */
export const TOPE_DEL_SOMBREADOR_POR_NIVEL: Readonly<Record<NivelDeLaCiudad, TopeDelSombreador>> = {
  0: { instrucciones: 503, lecturas: 3 },
  1: { instrucciones: 900, lecturas: 12 },
  2: { instrucciones: 1400, lecturas: 18 },
  3: { instrucciones: 1900, lecturas: 24 },
};

/** Las declaraciones del vértice: el acabado (plano desde N1; sin familia en N0) y la UV del molde. */
const VERTICE_DECLARACIONES = /* glsl */ `#ifdef MATERIA_Q
#define MOBILIARIO_MATERIA_Q MATERIA_Q
#else
#define MOBILIARIO_MATERIA_Q 0
#endif
attribute vec2 aAcabado;
#if MOBILIARIO_MATERIA_Q >= 1
flat varying vec2 vAcabadoQ;
varying vec2 vUvMoQ;
#else
varying vec2 vAcabadoQ;
#endif`;

/** El vértice: en N0 la familia y las marcas se quitan aquí, una vez por vértice. */
const VERTICE_CUERPO = /* glsl */ `#if MOBILIARIO_MATERIA_Q >= 1
vAcabadoQ = aAcabado;
vUvMoQ = uv;
#else
vAcabadoQ = fract(aAcabado);
#endif`;

/** Las declaraciones del fragmento (antes de las luces; las de la materia ya están, tras `common`). */
const FRAGMENTO_DECLARACIONES = /* glsl */ `#ifdef MATERIA_Q
#define MOBILIARIO_MATERIA_Q MATERIA_Q
#else
#define MOBILIARIO_MATERIA_Q 0
#endif
#if MOBILIARIO_MATERIA_Q >= 1
flat varying vec2 vAcabadoQ;
varying vec2 vUvMoQ;
uniform float uHumedadMoQ;
#else
varying vec2 vAcabadoQ;
#endif
${GLSL_ONDAS}`;

/** El cuerpo: el acabado, el agua, las familias y el mojado de lo que mira al cielo. Ver la cabecera. */
const FRAGMENTO_CUERPO = /* glsl */ `
{
  vec3 nM = normalize(normal * mat3(viewMatrix));
  #if MOBILIARIO_MATERIA_Q >= 1
  AcabadoQ acab = decodificarAcabadoQ(vAcabadoQ);
  float rug = acab.rug;
  float met = acab.metal;
  #else
  float rug = vAcabadoQ.x;
  float met = vAcabadoQ.y;
  #endif
  if (rug < 0.03) {
    /* Agua: un espejo con las ondas de las gotas. */
    vec2 g = ondasQ(vPosMundoQ.xz, uTiempo);
    nM = normalize(vec3(-g.x, 1.0, -g.y));
    #if MOBILIARIO_MATERIA_Q < 1
    normal = normalize((viewMatrix * vec4(nM, 0.0)).xyz);
    #endif
  } else {
    #if MOBILIARIO_MATERIA_Q >= 1
    humedadMoQ = uHumedadMoQ;
    EntradaQ eM = EntradaQ(acab, diffuseColor.rgb, nM, vPosMundoQ, vUvMoQ);
    SuperficieQ s = superficieQ(acab.familia, eM);
    recetaMoQ(s, eM);
    recordarSuperficieQ(s);
    diffuseColor.rgb = s.albedo;
    rug = s.rug;
    met = s.metal;
    nM = s.n;
    #endif
    /* Lo que mira al cielo está mojado: más liso. */
    rug = mix(rug, rug * 0.55, smoothstep(0.4, 0.9, nM.y));
  }
  #if MOBILIARIO_MATERIA_Q >= 1
  normal = normalize((viewMatrix * vec4(nM, 0.0)).xyz);
  #endif
  roughnessFactor = rug;
  metalnessFactor = met;
}`;

const RETOQUES_DEL_MOBILIARIO = new Map<NivelDeLaCiudad, Retoque>();

/**
 * El retoque del mobiliario de un nivel. Sus `#if` miran `MOBILIARIO_MATERIA_Q`, que es `MATERIA_Q` si el material
 * lleva la materia y 0 si no: el mismo texto vale sin ella (en GLSL ES, un `#if` con una macro sin definir es un
 * error, no un 0), y entonces se pinta como N0. Su texto depende del nivel (el `MATERIA_UV_Q`): va en el nombre.
 */
function retoqueDelMobiliario(nivel: NivelDeLaCiudad): Retoque {
  const hecho = RETOQUES_DEL_MOBILIARIO.get(nivel);
  if (hecho !== undefined) return hecho;
  const r: Retoque = {
    nombre: `mobiliario-n${String(nivel)}`,
    orden: 10,
    uniformes: { uHumedadMoQ: UNIFORMES_DE_LA_CIUDAD.uHumedad },
    /* La UV de la materia, sólo desde N1 (en N0 no hay `vUvMoQ`, y el preámbulo deja sus derivadas en 0). */
    ...(nivel >= 1 ? { defines: { MATERIA_UV_Q: 'vUvMoQ' } } : {}),
    vertice: [
      { buscar: '#include <common>', como: 'despues', texto: VERTICE_DECLARACIONES },
      { buscar: '#include <uv_vertex>', como: 'despues', texto: VERTICE_CUERPO },
    ],
    fragmento: [
      { buscar: '#include <lights_pars_begin>', como: 'antes', texto: FRAGMENTO_DECLARACIONES },
      { buscar: '#include <normal_fragment_maps>', como: 'despues', texto: FRAGMENTO_CUERPO },
    ],
  };
  RETOQUES_DEL_MOBILIARIO.set(nivel, r);
  return r;
}

/**
 * El material del mobiliario de un nivel: la materia del nivel (`retoqueDeLaMateria`) y el cuerpo de arriba. Con
 * `deLaCapa`, el de la capa de lo cercano (ver `lo-cercano.ts`). Cada llamada, un material nuevo.
 */
export function materialDelMobiliario(nivel: NivelDeLaCiudad, opciones: OpcionesDeLoCercano = {}): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0 });
  m.name = 'quiebro-mobiliario';
  parchear(
    m,
    RETOQUE_MUNDO,
    retoqueDeLaMateria(nivel),
    RETOQUE_ENTORNO,
    RETOQUE_SOLO_BRILLO,
    retoqueDelMobiliario(nivel),
    retoqueDeLoCercano(opciones.deLaCapa === true, nivel),
  );
  nieblaEn(m);
  return m;
}

/** Un color sRGB en hexadecimal a lineal, como lo quiere el color por vértice. */
export function lineal(hex: number): [number, number, number] {
  const c = new THREE.Color().setHex(hex, THREE.SRGBColorSpace);
  return [c.r, c.g, c.b];
}
