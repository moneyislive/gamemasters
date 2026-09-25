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
 */
import * as THREE from 'three';
import type { Retoque } from '../atmosfera/parcheo';
import { parchear } from '../atmosfera/parcheo';
import { nieblaEn } from '../atmosfera/niebla';
import { UNIFORMES_DE_LA_LUZ } from '../atmosfera/paleta';
import { Molde } from './geometria';
import { NUMERO_DEL_ESTILO, colorDeLaVentana, encendida } from './hash';
import { RETOQUE_ENTORNO, RETOQUE_MUNDO, RETOQUE_SOLO_BRILLO, UNIFORMES_DE_LA_CIUDAD } from './retoques';
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

/** Lo que va antes de `#include <lights_pars_begin>`: las declaraciones y las funciones, por este orden. */
const DECLARACIONES_Y_FUNCIONES_DEL_FRAGMENTO = DECLARACIONES_DEL_FRAGMENTO + GLSL_COMUN_DE_LA_FACHADA + GLSL_DEL_MURO + GLSL_DEL_HUECO;

/** Lo que va después de `#include <normal_fragment_maps>`: el cuerpo, por este orden (la Grafía, al final). */
const CUERPO_DEL_FRAGMENTO = PREFACIO_DEL_CUERPO + TRAMO_DE_LAS_PIEZAS + TRAMO_DEL_HUECO + TRAMO_DEL_BAJO + TRAMO_DEL_ENVEJECIDO + CIERRE_DEL_CUERPO;

/** El retoque de la fachada para un nivel. El nivel entra en el nombre: cambia el texto. */
function retoqueDeLaFachada(nivel: NivelDeLaCiudad): Retoque {
  return {
    nombre: `fachada-n${String(nivel)}`,
    orden: 10,
    uniformes: {
      uVentanas: UNIFORMES_DE_LA_CIUDAD.uVentanas,
      uRejillaDeGlifos: UNIFORMES_DE_LA_CIUDAD.uRejillaDeGlifos,
      uLuzDeVentanas: UNIFORMES_DE_LA_LUZ.uLuzDeVentanas,
      uVentanasEncendidas: UNIFORMES_DE_LA_LUZ.uVentanasEncendidas,
      uClaridad: UNIFORMES_DE_LA_LUZ.uClaridad,
    },
    defines: { NIVEL_Q: DETALLE_DEL_NIVEL[nivel].interiores ? '1' : '0' },
    vertice: [
      { buscar: '#include <common>', como: 'despues', texto: DECLARACIONES_DEL_VERTICE },
      { buscar: '#include <uv_vertex>', como: 'despues', texto: PASO_DE_LOS_ATRIBUTOS },
    ],
    fragmento: [
      { buscar: '#include <lights_pars_begin>', como: 'antes', texto: DECLARACIONES_Y_FUNCIONES_DEL_FRAGMENTO },
      { buscar: '#include <normal_fragment_maps>', como: 'despues', texto: CUERPO_DEL_FRAGMENTO },
    ],
  };
}

/** El material de las fachadas para un nivel. */
export function materialDeFachada(nivel: NivelDeLaCiudad): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0 });
  m.name = 'quiebro-fachada';
  parchear(m, RETOQUE_MUNDO, RETOQUE_ENTORNO, RETOQUE_SOLO_BRILLO, retoqueDeLaFachada(nivel));
  nieblaEn(m);
  return m;
}

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
