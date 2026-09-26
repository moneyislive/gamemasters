/**
 * LAS FACHADAS: los edificios del barrio en UNA geometría y UN material, con las ventanas, los
 * interiores, las tiendas y la suciedad sacadas del sombreador.
 *
 * ═══ POR QUÉ LA VENTANA NO ES GEOMETRÍA ═══
 *
 * Un barrio de 3×3 manzanas tiene del orden de diez mil huecos. Modelarlos (marco, cristal, alféizar)
 * son cientos de miles de triángulos y, peor, cientos de miles de aristas que tiemblan a 80 m. Aquí
 * cada cara de un edificio es UN cuadrilátero, y el sombreador saca de sus UV en metros (ver
 * `geometria.ts`) la rejilla: las plantas del barrio (la baja de 4,5 m y las demás de lo que diga el
 * edificio), vanos que reparten el ancho de la cara en un número entero (así ninguna ventana queda
 * cortada en una esquina), la moldura con su normal analítica, el derrame en sombra y el cristal.
 * Lo que sí es geometría es lo que da SILUETA: los retranqueos, las cornisas, los pretiles, los
 * balcones de hierro, los pilares del soportal y la maquinaria de las azoteas (N1+).
 *
 * ═══ LOS INTERIORES FALSOS ═══
 *
 * Cada hueco es una habitación: el rayo de la cámara entra por el cristal y choca con la caja del
 * cuarto (fondo, paredes, suelo y techo) en forma cerrada, con colores y un mueble sacados del hash
 * de la ventana y una lámpara en el techo si hay luz. Sin atlas de fotos. Se hace sólo desde N1 y a
 * menos de 60 m (se funde entre 45 y 60 con la ventana plana), que es donde se nota el paralaje; más
 * lejos, y en N0 siempre, la ventana es un plano emisivo con degradado, visillos y persiana.
 *
 * ═══ QUÉ SE VE Y QUÉ NO: LAS MEDIANERAS ═══
 *
 * Dos edificios pegados comparten pared. La parte tapada por el vecino no se pinta (no se ve y cuesta
 * relleno); la parte que asoma por encima de un vecino más bajo es una MEDIANERA: pared ciega, sin
 * ventanas, como en cualquier manzana de Madrid. Se calcula por segmentos con las cajas de los
 * volúmenes, así que vale para cualquier barrio (ver `fachada/caras.ts`).
 *
 * ═══ DE QUIÉN ES CADA NÚMERO ═══
 *
 * La regla de «ventana encendida» y la de «qué tienda» viven dos veces, en GLSL (`fachada/glsl-comun.ts`) y
 * en `hash.ts`, porque las tarjetas de reflejo y la luz horneada se colocan desde JavaScript bajo lo que
 * el sombreador enciende. Si se toca una, se toca la otra.
 *
 * ═══ DÓNDE ESTÁ CADA COSA ═══
 *
 * Este fichero es el director: monta el texto del sombreador con sus tramos, hace el material y recorre los
 * edificios llamando a cada escritor. Lo demás vive en `fachada/`, un fichero por cosa, para que varios
 * frentes trabajen a la vez sin pisarse (el plan de obra del detalle de la ciudad):
 *
 *   - el sombreador, en tramos CONTIGUOS que pegados dan el texto de siempre (`declaraciones.ts` explica
 *     cómo): `declaraciones.ts`, `glsl-comun.ts`, `glsl-muro.ts`, `glsl-hueco.ts`, `glsl-cuerpo.ts`,
 *     `glsl-piezas.ts`, `glsl-bajo.ts` y `glsl-envejecer.ts`;
 *   - las caras, los huecos, el muro y sus atributos, en `caras.ts`; los tipos y las tablas, en
 *     `tipos-de-cara.ts`;
 *   - los escritores: `bajo.ts` (el muro de la planta baja y los escaparates), `balcones.ts`, `remate.ts` (la
 *     azotea, la cornisa, el pretil, la imposta y lo de la azotea), `soportal.ts`, y los que todavía no
 *     escriben nada: `ritmo.ts`, `torres.ts` y `remates-de-hueco.ts`.
 *
 * Todo escritor CEDE (es un generador): entre dos pasos, como mucho el trozo de la ventana de celdas.
 *
 * ═══ LA MATERIA, EL NIVEL Y LO LEJANO (ola 2 del plan del detalle, O2-PAREDES) ═══
 *
 * El material lleva la materia de la ciudad (`materia/`: la textura de ruido en vez del hash, el relieve de las
 * juntas, el grano) y `NIVEL_Q` es el NIVEL (antes, 0 o 1 según los interiores): N2 y N3 tienen de verdad más
 * detalle que N1, cada capa nueva en su `#if NIVEL_Q`. Lo lejano (la LOD1) usa el MISMO sombreador con
 * `{ lejos: true }`: `NIVEL_Q` como mucho 1 y la materia de lo lejano (`materia-lejos`, `MATERIA_Q 0`), para que a
 * 45-60 m diga lo mismo que la ventana de N1 y no salte de color al entrar. La luz de la calle con dirección
 * (`luz-con-direccion.ts`) va en su propio retoque.
 *
 * `TOPE_DEL_SOMBREADOR_POR_NIVEL` (abajo) es el techo del sombreador de la fachada: instrucciones de fxc (§7.4 del
 * plan menos el margen de la ola 3) y lecturas de textura en el peor camino (las mira `verify:quiebro-materia`).
 */
import * as THREE from 'three';
import type { Retoque } from '../atmosfera/parcheo';
import { parchear } from '../atmosfera/parcheo';
import { nieblaEn } from '../atmosfera/niebla';
import { UNIFORMES_DE_LA_LUZ } from '../atmosfera/paleta';
import { Molde } from './geometria';
import { NUMERO_DEL_ESTILO, colorDeLaVentana, encendida } from './hash';
import { RETOQUE_ENTORNO, RETOQUE_MUNDO, RETOQUE_SOLO_BRILLO, UNIFORMES_DE_LA_CIUDAD } from './retoques';
import { retoqueDeLaMateria } from './materia/retoque';
import { RETOQUE_DE_LA_LUZ_CON_DIRECCION } from './luz-con-direccion';
import type { CajaXZ, EdificioDelPlano, EstiloDeFachada, NivelDeLaCiudad, Volumen } from './tipos';
import { DETALLE_DEL_NIVEL } from './tipos';
import { DECLARACIONES_DEL_FRAGMENTO, DECLARACIONES_DEL_VERTICE, PASO_DE_LOS_ATRIBUTOS } from './fachada/declaraciones';
import { GLSL_COMUN_DE_LA_FACHADA } from './fachada/glsl-comun';
import { GLSL_DEL_MURO } from './fachada/glsl-muro';
import { GLSL_DEL_HUECO, TRAMO_DEL_HUECO } from './fachada/glsl-hueco';
import { CIERRE_DEL_CUERPO, PREFACIO_DEL_CUERPO } from './fachada/glsl-cuerpo';
import { TRAMO_DE_LAS_PIEZAS } from './fachada/glsl-piezas';
import { TRAMO_DEL_BAJO } from './fachada/glsl-bajo';
import { TRAMO_DEL_ENVEJECIDO } from './fachada/glsl-envejecer';
import { ATRIBUTOS_DE_LA_FACHADA, BAJO, GRADO_POR_DEFECTO, SUBTIPO_DE_RELIEVE, TIPO } from './fachada/tipos-de-cara';
import type { ObraDeLaFachada, OpcionesDeLasFachadas, VentanaEncendida } from './fachada/tipos-de-cara';
import { caraDelVolumen, carasDe, escribirElMuro, indiceDeVolumenes, normalDe, puntoDeLaCara, recorrerLosHuecos } from './fachada/caras';
import { escaparatesDe, muroDelBajo } from './fachada/bajo';
import { balconesDeLaCara, puedeLlevarBalcones, tieneBalcon } from './fachada/balcones';
import { azoteaDelVolumen } from './fachada/remate';
import { soportalDelEdificio } from './fachada/soportal';
import { ritmoDeLaCara } from './fachada/ritmo';
import { hayRemateDeTorre, remateDeTorre, volumenMasAlto } from './fachada/torres';
import { rematesDeHuecoDeLaCara } from './fachada/remates-de-hueco';

/* La API de siempre: quien importaba esto de aquí lo sigue importando de aquí. */
export { ATRIBUTOS_DE_LA_FACHADA } from './fachada/tipos-de-cara';
export type { GradoDeLaFachada, OpcionesDeLasFachadas, VentanaEncendida } from './fachada/tipos-de-cara';
export { carasDeCalle, normalDe } from './fachada/caras';
export type { CaraDeCalle } from './fachada/caras';

/* ═══════════════════════════════ EL SOMBREADOR ═══════════════════════════════ */

/*
 * ═══ LOS TRAMOS QUE NO SON DE LAS PAREDES, A LA MATERIA ═══
 *
 * El techo del soportal, la medianera, el relieve, el depósito y la chapa de la azotea (`glsl-piezas.ts`) y la
 * persiana y las pintadas del bajo (`glsl-bajo.ts`) llevan ruido de HASH (`fbmQ`, `ruidoQ`), y esos dos ficheros no
 * son de este paquete en la ola 2 (los recibe O3-SILUETA en la ola 3). Con la materia puesta, el plan no deja ni un
 * `fbmQ` ni un `ruidoQ` de adorno en N0 ni en lo lejano (§7.4; lo mira `verify:quiebro-materia`, b), y el de N1 se
 * come el tope de fxc. Así que aquí, AL MONTAR el texto y sin tocar esos ficheros, cada llamada de las piezas pasa a
 * la textura (`fbmT`, `ruidoT`, con su mip) o, donde en N0 no cabe otra lectura, a la mancha grande del muro
 * (`manchaDelMuroQ`, que lee el prefacio una vez). Las del bajo (la chapa de la persiana y sus pintadas) sólo en N0 y
 * en lo lejano: en la ventana de N1-N3 se quedan como estaban (ver `SUSTITUCIONES_DEL_BAJO_DE_LA_VENTANA`). Y el bajo
 * avisa de dónde está el hueco de la tienda (`paredQ`), para que el envejecido no ponga el relieve ni el agua sobre la
 * persiana o el escaparate.
 *
 * Cada sustitución tiene que encontrar su texto UNA vez: si no, se apunta en `SUSTITUCIONES_QUE_NO_ENTRARON` y
 * `verify:quiebro-ciudad` (paredes, f) se pone rojo. Quien reciba esos tramos, que lleve esto a su texto y vacíe la
 * lista.
 */
type SustitucionDeTramo = readonly [antes: string, despues: string];

const SUSTITUCIONES_DE_LAS_PIEZAS: readonly SustitucionDeTramo[] = [
  ['float n = fbmQ(P.xz * 0.35);', 'float n = fbmT(P.xz * 0.35, lodQ(0.35));'],
  ['float g = ruidoQ(P.xz * 5.0);', 'float g = ruidoT(P.xz * 5.0, lodQ(5.0));'],
  ['fbmQ(P.xz * 0.23 + semilla * 0.01)', 'fbmT(P.xz * 0.23 + semilla * 0.01, lodQ(0.23))'],
  ['fbmQ(P.xz * 0.8)', 'fbmT(P.xz * 0.8, lodQ(0.8))'],
  ['fbmQ(q * 0.12 + semilla * 0.01)', 'manchaDelMuroQ'],
  ['(0.85 + 0.2 * fbmQ(q * 0.7))', '(0.85 + 0.2 * manchaDelMuroQ)'],
  [
    '        albedo = vec3(0.2, 0.13, 0.08) * (0.8 + 0.3 * fbmQ(q * vec2(4.0, 0.3))) * (1.0 - 0.35 * duela);',
    '        #if NIVEL_Q >= 1\n        albedo = vec3(0.2, 0.13, 0.08) * (0.8 + 0.3 * ruidoT(q * vec2(4.0, 0.3), lodQ(4.0))) * (1.0 - 0.35 * duela);\n        #else\n        albedo = vec3(0.2, 0.13, 0.08) * (0.8 + 0.3 * manchaDelMuroQ) * (1.0 - 0.35 * duela);\n        #endif',
  ],
  [
    '        albedo = vec3(0.34, 0.35, 0.35) * (0.8 + 0.3 * fbmQ(q * 1.7));',
    '        #if NIVEL_Q >= 1\n        albedo = vec3(0.34, 0.35, 0.35) * (0.8 + 0.3 * ruidoT(q * 1.7, lodQ(1.7)));\n        #else\n        albedo = vec3(0.34, 0.35, 0.35) * (0.8 + 0.3 * manchaDelMuroQ);\n        #endif',
  ],
];

/*
 * EL BAJO: la chapa de la persiana y sus pintadas se quedan COMO ESTABAN (en hash) en la fachada de la ventana de
 * N1-N3. Pasadas a la textura, el mismo umbral sobre otro ruido dibujaba otras pintadas, y las de las persianas de J, O
 * e I se perdían (la revisión 1): el bajo es de O3-SILUETA y la ficha de las paredes no pide tocarlo. Sólo N0 y lo
 * lejano (sin un `fbmQ` de adorno, §7.4) leen la textura: UNA lectura (`nZona`), llevada a la media y la anchura del
 * fbm de cuatro octavas (0,469 y 0,577 de la desviación de una octava), y de ella sale todo, sin otra lectura: la zona
 * (con el umbral más bajo que el de N1, para que salgan en las MISMAS persianas que en N1: cuáles llevan pintada y de
 * qué color lo decide el hash de la tienda, que es el mismo), el relleno, su contorno (una cresta de `nZona`) y el
 * trazo (las curvas de nivel de un campo de senos torcido por `nZona`, sólo en la franja de `nZona` que rodea el relleno:
 * garabatos de tres o cuatro dedos; en toda la zona eran una red). Con el relleno solo, sin trazo, salían manchas lisas y
 * en la O de N0 la pintada amarilla desaparecía (la revisión 2).
 *
 * Por eso lo lejano lleva su PROPIO texto del cuerpo (el bajo sin hash) y su retoque se llama `fachada-nN-lejos`
 * (cada retoque lleva en el nombre lo que cambia su texto: `atmosfera/parcheo.ts`). No se decide con `MATERIA_Q`:
 * la fachada no puede nombrar en un `#if` un define que pone otro retoque (en GLSL ES, sin definir, es un error).
 */
const PAREDQ_DEL_BAJO: SustitucionDeTramo = ['      float hueco = bajo == 3 ? 0.0 : 1.0 - smoothstep(-pxm, 0.0, sdT);', '      float hueco = bajo == 3 ? 0.0 : 1.0 - smoothstep(-pxm, 0.0, sdT);\n      paredQ = 1.0 - hueco;'];
/*
 * En el PORTAL y en la VENTANA BAJA CON REJA de un bajo de viviendas, lo que no es la puerta ni la ventana es muro (el
 * hueco de 6 m es sólo el reparto): ahí también van el relieve, la humedad del pie y la suciedad. Con `1 − hueco` en
 * todo el tramo, la planta baja de los edificios de viviendas salía limpia y sin zócalo húmedo (la E, a la izquierda).
 */
const PAREDQ_DEL_PORTAL: SustitucionDeTramo = ['        float puerta = 1.0 - smoothstep(-pxm, 0.0, sp);', '        float puerta = 1.0 - smoothstep(-pxm, 0.0, sp);\n        paredQ = 1.0 - puerta;'];
const PAREDQ_DE_LA_VENTANA_BAJA: SustitucionDeTramo = ['        float ventana = 1.0 - smoothstep(-pxm, 0.0, sv);', '        float ventana = 1.0 - smoothstep(-pxm, 0.0, sv);\n        paredQ = 1.0 - ventana;'];
const CHAPA_DE_HASH = '        vec3 chapa = vec3(0.19, 0.2, 0.2) * (0.8 + 0.4 * ruidoQ(q * vec2(0.8, 3.0)));';
const CHAPA_DE_LA_MANCHA = '        vec3 chapa = vec3(0.19, 0.2, 0.2) * (0.8 + 0.4 * manchaDelMuroQ);';
const PINTADAS_DE_HASH = `        float zona = smoothstep(0.48, 0.56, fbmQ(qg * 0.45));
        float trazo = 1.0 - smoothstep(0.025, 0.05 + px.x * 2.0, abs(fbmQ(qg * vec2(1.7, 2.9)) - 0.5));
        float relleno = smoothstep(0.62, 0.66, fbmQ(qg * vec2(0.9, 1.4) + 5.0)) * 0.6;`;
const PINTADAS_DE_LA_TEXTURA = `        float nZona = 0.469 + 0.577 * (ruidoT(qg * 0.45, lodQ(0.45)) - 0.5);
        float zona = smoothstep(0.38, 0.44, nZona);
        float garabato = sin(qg.x * 4.3 + 2.1 * sin(qg.y * 2.9 + nZona * 9.0)) + sin(qg.y * 5.7 + 1.6 * sin(qg.x * 3.3 - nZona * 7.0)) + 0.8 * sin((qg.x + qg.y) * 6.1 + nZona * 11.0);
        float anchoT = 0.1 + px.x * 10.0;
        float cerco = smoothstep(0.39, 0.43, nZona) * (1.0 - smoothstep(0.66, 0.72, nZona));
        float trazo = max((1.0 - smoothstep(anchoT, 2.0 * anchoT, abs(garabato - 0.3))) * cerco, 1.0 - smoothstep(0.004 + px.x * 0.3, 0.008 + px.x * 0.6, abs(nZona - 0.56)));
        float relleno = smoothstep(0.555, 0.565, nZona) * 0.6;`;

/** El bajo de la ventana: en N1-N3 como estaba; en N0, a la textura. */
const SUSTITUCIONES_DEL_BAJO_DE_LA_VENTANA: readonly SustitucionDeTramo[] = [
  PAREDQ_DEL_BAJO,
  PAREDQ_DEL_PORTAL,
  PAREDQ_DE_LA_VENTANA_BAJA,
  [CHAPA_DE_HASH, `        #if NIVEL_Q >= 1\n${CHAPA_DE_HASH}\n        #else\n${CHAPA_DE_LA_MANCHA}\n        #endif`],
  [PINTADAS_DE_HASH, `        #if NIVEL_Q >= 1\n${PINTADAS_DE_HASH}\n        #else\n${PINTADAS_DE_LA_TEXTURA}\n        #endif`],
];

/** El bajo de lo lejano: a la textura en todos los niveles. */
const SUSTITUCIONES_DEL_BAJO_DE_LO_LEJANO: readonly SustitucionDeTramo[] = [
  PAREDQ_DEL_BAJO,
  PAREDQ_DEL_PORTAL,
  PAREDQ_DE_LA_VENTANA_BAJA,
  [CHAPA_DE_HASH, CHAPA_DE_LA_MANCHA],
  [PINTADAS_DE_HASH, PINTADAS_DE_LA_TEXTURA],
];

/**
 * Las llamadas al ruido de hash que el bajo conserva en N1-N3 (ver arriba), tal como salen en el texto: las únicas que
 * `verify:quiebro-ciudad` (paredes, f) deja en la fachada de N1-N3. En N0 y en lo lejano, ninguna.
 */
export const RUIDO_DE_HASH_DEL_BAJO_EN_N1: readonly string[] = [
  'ruidoQ(q * vec2(0.8, 3.0))',
  'fbmQ(qg * 0.45)',
  'fbmQ(qg * vec2(1.7, 2.9))',
  'fbmQ(qg * vec2(0.9, 1.4) + 5.0)',
];

/** Las sustituciones que no encontraron su texto (una vez, y sólo una). Vacía, si todo va bien. */
export const SUSTITUCIONES_QUE_NO_ENTRARON: string[] = [];

/** Cuántas sustituciones de los tramos ajenos se hacen (el mínimo de lo que mira `verify:quiebro-ciudad`). */
export const SUSTITUCIONES_DE_LOS_TRAMOS_AJENOS =
  SUSTITUCIONES_DE_LAS_PIEZAS.length + SUSTITUCIONES_DEL_BAJO_DE_LA_VENTANA.length + SUSTITUCIONES_DEL_BAJO_DE_LO_LEJANO.length;

function aLaMateria(tramo: string, sustituciones: readonly SustitucionDeTramo[], nombre: string): string {
  let t = tramo;
  for (const [antes, despues] of sustituciones) {
    const veces = t.split(antes).length - 1;
    if (veces !== 1) {
      SUSTITUCIONES_QUE_NO_ENTRARON.push(`${nombre}: «${antes.trim().slice(0, 70)}» está ${String(veces)} veces`);
      continue;
    }
    t = t.replace(antes, despues);
  }
  return t;
}

/** Lo que va antes de `#include <lights_pars_begin>`: las declaraciones y las funciones, por este orden. */
const DECLARACIONES_Y_FUNCIONES_DEL_FRAGMENTO = DECLARACIONES_DEL_FRAGMENTO + GLSL_COMUN_DE_LA_FACHADA + GLSL_DEL_MURO + GLSL_DEL_HUECO;

/** Las piezas, pasadas a la materia (las mismas en la ventana y en lo lejano). */
const PIEZAS_A_LA_MATERIA = aLaMateria(TRAMO_DE_LAS_PIEZAS, SUSTITUCIONES_DE_LAS_PIEZAS, 'glsl-piezas');

/** Lo que va después de `#include <normal_fragment_maps>`: el cuerpo, por este orden (la Grafía, al final). */
const CUERPO_DEL_FRAGMENTO =
  PREFACIO_DEL_CUERPO +
  PIEZAS_A_LA_MATERIA +
  TRAMO_DEL_HUECO +
  aLaMateria(TRAMO_DEL_BAJO, SUSTITUCIONES_DEL_BAJO_DE_LA_VENTANA, 'glsl-bajo') +
  TRAMO_DEL_ENVEJECIDO +
  CIERRE_DEL_CUERPO;

/** El cuerpo de lo lejano: el mismo, con el bajo sin ruido de hash en ningún nivel (ver `SUSTITUCIONES_DEL_BAJO_DE_LO_LEJANO`). */
const CUERPO_DE_LO_LEJANO =
  PREFACIO_DEL_CUERPO +
  PIEZAS_A_LA_MATERIA +
  TRAMO_DEL_HUECO +
  aLaMateria(TRAMO_DEL_BAJO, SUSTITUCIONES_DEL_BAJO_DE_LO_LEJANO, 'glsl-bajo (lo lejano)') +
  TRAMO_DEL_ENVEJECIDO +
  CIERRE_DEL_CUERPO;

/** Las opciones del material de la fachada. */
export interface OpcionesDelMaterialDeFachada {
  /** Lo lejano (la LOD1): `NIVEL_Q` como mucho 1 y la materia de lo lejano (ver la cabecera). */
  readonly lejos?: boolean;
}

/** El `NIVEL_Q` del sombreador de la fachada: el nivel, o como mucho 1 en lo lejano. */
export function nivelDelSombreadorDeLaFachada(nivel: NivelDeLaCiudad, opciones: OpcionesDelMaterialDeFachada = {}): NivelDeLaCiudad {
  return opciones.lejos === true ? (Math.min(nivel, 1) as NivelDeLaCiudad) : nivel;
}

/**
 * El retoque de la fachada para un `NIVEL_Q`, de la ventana o de lo lejano. El texto sólo depende de eso, y va en el
 * nombre (`fachada-n1`, `fachada-n1-lejos`). Le nombra a la materia la UV de la fachada (`MATERIA_UV_Q`): el
 * preámbulo toma sus derivadas, que son el tamaño del píxel (`px`).
 */
function retoqueDeLaFachada(nivelQ: NivelDeLaCiudad, lejos: boolean): Retoque {
  return {
    nombre: `fachada-n${String(nivelQ)}${lejos ? '-lejos' : ''}`,
    orden: 10,
    uniformes: {
      uVentanas: UNIFORMES_DE_LA_CIUDAD.uVentanas,
      uRejillaDeGlifos: UNIFORMES_DE_LA_CIUDAD.uRejillaDeGlifos,
      uHumedad: UNIFORMES_DE_LA_CIUDAD.uHumedad,
      uLuzDeVentanas: UNIFORMES_DE_LA_LUZ.uLuzDeVentanas,
      uVentanasEncendidas: UNIFORMES_DE_LA_LUZ.uVentanasEncendidas,
      uClaridad: UNIFORMES_DE_LA_LUZ.uClaridad,
    },
    defines: { NIVEL_Q: String(nivelQ), MATERIA_UV_Q: 'vUvQ' },
    vertice: [
      { buscar: '#include <common>', como: 'despues', texto: DECLARACIONES_DEL_VERTICE },
      { buscar: '#include <uv_vertex>', como: 'despues', texto: PASO_DE_LOS_ATRIBUTOS },
    ],
    fragmento: [
      { buscar: '#include <lights_pars_begin>', como: 'antes', texto: DECLARACIONES_Y_FUNCIONES_DEL_FRAGMENTO },
      { buscar: '#include <normal_fragment_maps>', como: 'despues', texto: lejos ? CUERPO_DE_LO_LEJANO : CUERPO_DEL_FRAGMENTO },
    ],
  };
}

/**
 * El material de las fachadas para un nivel; con `{ lejos: true }`, el de lo lejano (la LOD1, ver la cabecera). Cada
 * llamada, un material nuevo.
 */
export function materialDeFachada(nivel: NivelDeLaCiudad, opciones: OpcionesDelMaterialDeFachada = {}): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0 });
  m.name = 'quiebro-fachada';
  const lejos = opciones.lejos === true;
  parchear(
    m,
    RETOQUE_MUNDO,
    retoqueDeLaMateria(nivel, { lejos }),
    RETOQUE_ENTORNO,
    RETOQUE_SOLO_BRILLO,
    retoqueDeLaFachada(nivelDelSombreadorDeLaFachada(nivel, opciones), lejos),
    RETOQUE_DE_LA_LUZ_CON_DIRECCION,
  );
  nieblaEn(m);
  return m;
}

/**
 * EL TECHO DEL SOMBREADOR DE LA FACHADA (§5.2.9 y §7.4 del plan; la ficha de O2-PAREDES): instrucciones estáticas de
 * fxc (`ps_5_0 /O3`, las mide `verify:quiebro-gl` en el estado principal del nivel) y lecturas de textura de TODOS los
 * samplers en el peor camino de `main` (las mide `verify:quiebro-materia`, b). Las instrucciones son las de §7.4
 * menos 40 en N1-N3, el margen que la ola 2 deja al horizonte local de la ola 3; la de N0 es «≤ hoy», con los 42
 * del tono propio de N0 que el coordinador confirmó (revisión 2 de la ola 1b). Las lecturas, lo medido al cerrar
 * O2-PAREDES y ni una más: la del mapa de la luz de la calle (`entorno`), las dos de la luz con dirección (N1+) y
 * las de la materia (4, 14, 20 y 28 en el peor camino, contra las 4, 16, 24 y 36 de la materia: el remate añadió el
 * moteado fino del revoco, la hebra de los regueros y lo de cerca del todo del ladrillo y del sillar). Medido al
 * cerrar el remate de O2-PAREDES con fxc: 2.438, 4.946, 5.367 y 5.900 instrucciones (hoy eran 6.345, 7.381, 7.591 y
 * 7.703: el ruido de hash y el muro pintado dos veces se llevaban más de la mitad; las pintadas de la persiana, que en
 * N1-N3 se quedan en hash, suman unas 1.000).
 */
export const TOPE_DEL_SOMBREADOR_POR_NIVEL: Readonly<Record<NivelDeLaCiudad, { readonly instrucciones: number; readonly lecturas: number }>> = {
  0: { instrucciones: 6345, lecturas: 5 },
  1: { instrucciones: 7341, lecturas: 17 },
  2: { instrucciones: 9460, lecturas: 23 },
  3: { instrucciones: 11960, lecturas: 31 },
};

/**
 * EL TECHO DEL SOMBREADOR DE LO LEJANO, que es el de la fachada con `{ lejos: true }` (`NIVEL_Q` ≤ 1, `MATERIA_Q 0`).
 * Lo reexporta `lejos.ts` con el nombre de §5.2.9, al lado de su fábrica (`materialDeLoLejano`). fxc no lo mide
 * (`verify:quiebro-gl` mira la fachada de la ventana): las instrucciones son las de la fachada de su `NIVEL_Q`. Las
 * lecturas, lo medido: la luz de la calle, las dos de la luz con dirección (N1+) y 4 o 10 de la materia.
 */
export const TOPE_DEL_SOMBREADOR_DE_LO_LEJANO: Readonly<Record<NivelDeLaCiudad, { readonly instrucciones: number; readonly lecturas: number }>> = {
  0: { instrucciones: 6345, lecturas: 5 },
  1: { instrucciones: 7341, lecturas: 13 },
  2: { instrucciones: 7341, lecturas: 13 },
  3: { instrucciones: 7341, lecturas: 13 },
};

/* ═══════════════════════════════ LA GEOMETRÍA ═══════════════════════════════ */

/**
 * UNA CAJA DE RELIEVE con los atributos de la fachada: pared lisa del estilo, sin huecos. Para lo que va con
 * las fachadas sin ser un edificio (la viga y los pilares del Elevado en lo lejano). `subtipo` va en `aCara.z`
 * (`SUBTIPO_DE_RELIEVE`): 0, lo de siempre.
 */
export function cajaDeRelieve(
  m: Molde,
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  estilo: EstiloDeFachada,
  caras = 'nseoa',
  subtipo: number = SUBTIPO_DE_RELIEVE.ninguno,
): void {
  m.poner('aCara', 1, NUMERO_DEL_ESTILO[estilo], subtipo, TIPO.relieve);
  m.poner('aVolumen', 4.5, y1, 0.5, 3);
  m.poner('aPlanta', 3, BAJO.sinCalle);
  m.caja(x0, y0, z0, x1, y1, z1, caras);
}

/** Lo que estorba de las fachadas: la planta baja de cada edificio y los pilares de su soportal. */
export function huellasDeLasFachadas(edificios: readonly EdificioDelPlano[]): CajaXZ[] {
  return edificios.flatMap((e) => [e.caja, ...e.pilares]);
}

/**
 * ESCRIBE LAS FACHADAS de una lista de edificios en un molde con los atributos de la fachada.
 * Devuelve las ventanas encendidas bajas y los escaparates (si se piden).
 */
export function escribirLasFachadas(m: Molde, edificios: readonly EdificioDelPlano[], opciones: OpcionesDeLasFachadas): VentanaEncendida[] {
  const ventanas: VentanaEncendida[] = [];
  for (const _ of fachadasPorPartes(m, edificios, opciones, ventanas)) {
    /* de un tirón */
  }
  return ventanas;
}

/**
 * LAS FACHADAS A TROZOS: lo mismo que `escribirLasFachadas`, cediendo el paso después de cada cara, de
 * cada azotea y de cada puñado de balcones. Es lo que usa la ventana de celdas (`celdas.ts`) para que el
 * trabajo de un fotograma no pase de su tope de triángulos: una cara con balcones son 1.500 triángulos, y
 * un edificio entero de N3 pasa de 5.000. Las ventanas encendidas y los escaparates van a `ventanas`.
 *
 * Cada escritor recibe la `ObraDeLaFachada` (el relieve y el grado de las opciones, tal cual) y cede donde
 * le toca: el muro, al acabar la cara; los balcones, cada `BALCONES_POR_TROZO`; la azotea, al acabar el
 * volumen; el soportal, al acabar el edificio. El ritmo, las torres y los remates de hueco se llaman y
 * todavía no escriben ni ceden.
 */
export function* fachadasPorPartes(m: Molde, edificios: readonly EdificioDelPlano[], opciones: OpcionesDeLasFachadas, ventanas: VentanaEncendida[]): Generator<void, void, void> {
  const obra: ObraDeLaFachada = { relieve: opciones.relieve, grado: opciones.grado ?? GRADO_POR_DEFECTO };
  const todos: Volumen[] = [...edificios.flatMap((e) => e.volumenes), ...(opciones.vecinos ?? [])];
  const cerca = indiceDeVolumenes(todos);

  for (const e of edificios) {
    const estilo = NUMERO_DEL_ESTILO[e.estilo];
    const conBalcones = obra.relieve && puedeLlevarBalcones(e);
    const masAlto = volumenMasAlto(e);
    for (let iv = 0; iv < e.volumenes.length; iv++) {
      const v = e.volumenes[iv] as Volumen;
      for (const cara of carasDe(v)) {
        const c = caraDelVolumen(e, iv, cara, cerca);
        /* El muro, por tramos: el de la planta baja lo escribe `bajo.ts`. */
        yield* iv === 0 ? muroDelBajo(m, e, c, obra) : escribirElMuro(m, e, c, obra);
        if (c.fachada !== undefined && (opciones.ventanas || conBalcones)) {
          const huecos: (readonly [number, number])[] = [];
          recorrerLosHuecos(e, v, cara, c.toques, (celda, planta, ux, y, ySuelo) => {
            const [nx, nz] = normalDe(cara.mira);
            const [px, pz] = puntoDeLaCara(cara, ux);
            if (opciones.ventanas && planta <= 3 && encendida(celda, planta, c.semilla, estilo)) {
              ventanas.push({ x: px + nx * 0.05, y, z: pz + nz * 0.05, color: colorDeLaVentana(celda, planta, c.semilla), escaparate: false, normal: [nx, nz] });
            }
            if (obra.relieve && tieneBalcon(e, c, planta, celda)) huecos.push([ux, ySuelo]);
          });
          yield* balconesDeLaCara(m, e, c, huecos, obra);
        }
        if (opciones.ventanas && c.fachada !== undefined && c.fachada.bajo !== 'portales' && v.y0 < 0.01) {
          escaparatesDe(c, ventanas, obra);
        }
        yield* ritmoDeLaCara(m, e, c, obra);
        yield* rematesDeHuecoDeLaCara(m, e, c, obra);
      }
      /* La azotea y, con relieve, su remate. */
      yield* azoteaDelVolumen(m, e, iv, obra);
      if (iv === masAlto && hayRemateDeTorre(e)) yield* remateDeTorre(m, e, v, obra);
    }
    yield* soportalDelEdificio(m, e, obra);
  }
}

/** Construye las fachadas del barrio para un nivel. */
export function construirLasFachadas(
  edificios: readonly EdificioDelPlano[],
  nivel: NivelDeLaCiudad,
): { geometria: THREE.BufferGeometry; ventanas: VentanaEncendida[]; huellas: CajaXZ[] } {
  const m = new Molde(ATRIBUTOS_DE_LA_FACHADA);
  const ventanas = escribirLasFachadas(m, edificios, { relieve: DETALLE_DEL_NIVEL[nivel].relieve, ventanas: true });
  return { geometria: m.geometria(), ventanas, huellas: huellasDeLasFachadas(edificios) };
}
