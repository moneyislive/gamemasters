/**
 * EL TINTE DEL BURGO: preparar las geometrías teñibles para instanciarlas. Con `three`,
 * sin React.
 *
 * ═══ DOS CLASES DE PIEZA, DOS MANERAS DE TEÑIR ═══
 *
 * `burgo/piezas.ts` distingue las piezas teñidas ENTERAS (casa, peón, figura, ficha,
 * estandarte: todos sus vértices llevan máscara) de las de máscara PARCIAL (bandera,
 * casa grande, posada: el mástil, la madera y la piedra no cambian de color). La
 * diferencia manda en cómo se instancian:
 *
 *   · Una pieza ENTERA se puede pintar con `instanceColor`: UNA `InstancedMesh` para las
 *     44 casas de seis colores, otra para los seis peones. Para eso la geometría se
 *     prepara UNA vez «a gris»: cada vértice guarda su luminancia RELATIVA al azul medio
 *     del pack (la misma cuenta que `colorTenido` de `embarcadero/tinte.ts`, acotada a
 *     [0,25, 1,75]) en los tres canales, y el color de instancia —el del asiento— la
 *     multiplica en el sombreador. El resultado por vértice es `asiento × relación`, que
 *     es exactamente lo que `colorTenido` devuelve; la única diferencia es que el
 *     recorte a [0, 1] lo hace la GPU al escribir el color, y no aquí. Así la casa
 *     conserva su volumen (el degradado de ochenta tonos del pack) con cualquier
 *     `#rrggbb` y sin una geometría por color.
 *
 *   · Una pieza PARCIAL no puede: `instanceColor` multiplicaría también el mástil. Para
 *     ésas se pide `tenir()` POR COLOR (una copia de la geometría por color, de la caché
 *     de `tinte.ts`) y una `InstancedMesh` por color: seis asientos y el ámbar del
 *     Concejo son como mucho siete llamadas para todas las banderas del tablero.
 *
 * ═══ EL AZUL DE REFERENCIA ES EL DEL PACK DE CADA PIEZA (decisión 15) ═══
 *
 * La casa y el peón son de Board Game Bits y su azul medio es `AZUL_DE_LAS_FICHAS`; la
 * bandera es del hexagonal y el suyo es `AZUL_DEL_PACK`. Medir una contra el azul de la
 * otra le cambia el volumen sin que nada proteste, así que cada función recibe la
 * referencia y `referenciaDe(pieza)` dice cuál toca.
 *
 * ═══ LO QUE SE SUELTA AL DESMONTAR ═══
 *
 * Las geometrías grises son copias nuestras y se guardan por (geometría, referencia):
 * `soltarTintesDelBurgo` las tira de la GPU y olvida la caché, y llama a `soltarTintes`
 * de `tinte.ts` para las teñidas por color. Como allí, `dispose` borra la copia de la GPU
 * y no los datos: si la escena vuelve a montarse con el mismo catálogo, three las vuelve
 * a subir sola.
 */
import * as THREE from 'three';
import { ATRIBUTO_DE_TINTE_CARGADO, AZUL_DEL_PACK } from '../embarcadero/piezas';
import { RELACION_MAXIMA, RELACION_MINIMA, luminancia, soltarTintes, tenirGeometria } from '../embarcadero/tinte';
import type { AzulDeReferencia } from '../embarcadero/tinte';
import { AZUL_DE_LAS_FICHAS, PIEZA, PIEZAS_TENIDAS_ENTERAS } from './piezas';
import type { NombreDePieza } from './piezas';

/** El ámbar del Concejo: la bandera de la almoneda y los estandartes de la Puerta Mayor. */
export const AMBAR_DEL_CONCEJO = '#d9a441';

/** Las piezas de Board Game Bits se miden contra su azul; las del hexagonal, contra el suyo. */
const DE_LAS_FICHAS: readonly NombreDePieza[] = [PIEZA.casa, PIEZA.peon, PIEZA.figura, PIEZA.ficha];

/** El azul de referencia con el que se tiñe una pieza del Burgo. */
export function referenciaDe(pieza: NombreDePieza): AzulDeReferencia {
  return DE_LAS_FICHAS.includes(pieza) ? AZUL_DE_LAS_FICHAS : AZUL_DEL_PACK;
}

/** ¿Se puede pintar esta pieza con `instanceColor` (está teñida entera)? */
export function seTineEntera(pieza: NombreDePieza): boolean {
  return PIEZAS_TENIDAS_ENTERAS.includes(pieza);
}

const pinza = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x));

const luminanciasDeReferencia = new Map<string, number>();
function luminanciaDeReferencia(referencia: AzulDeReferencia): number {
  const clave = referencia.join(',');
  const sabida = luminanciasDeReferencia.get(clave);
  if (sabida !== undefined) return sabida;
  const azul = new THREE.Color().setRGB(referencia[0] / 255, referencia[1] / 255, referencia[2] / 255, THREE.SRGBColorSpace);
  const l = Math.max(1e-4, luminancia(azul.r, azul.g, azul.b));
  luminanciasDeReferencia.set(clave, l);
  return l;
}

/**
 * LA RELACIÓN DE LUMINANCIA de un vértice horneado respecto del azul de referencia,
 * acotada como en `colorTenido`. Es el gris que se guarda en la geometría para que
 * `instanceColor` lo multiplique. Expuesta para que el comprobador mire la regla.
 */
export function grisDeLuminancia(horneado: readonly [number, number, number], referencia: AzulDeReferencia): number {
  return pinza(luminancia(horneado[0], horneado[1], horneado[2]) / luminanciaDeReferencia(referencia), RELACION_MINIMA, RELACION_MAXIMA);
}

const cacheDeGrises = new WeakMap<THREE.BufferGeometry, Map<string, THREE.BufferGeometry>>();

/**
 * UNA COPIA DE LA GEOMETRÍA A GRIS DE LUMINANCIA: en los vértices con máscara, los tres
 * canales llevan la relación; los demás (no debería haberlos en una pieza entera) se
 * quedan como estaban. Sin máscara se devuelve la misma geometría: no hay nada que teñir.
 */
export function geometriaAGris(geometria: THREE.BufferGeometry, referencia: AzulDeReferencia): THREE.BufferGeometry {
  const mascara = geometria.getAttribute(ATRIBUTO_DE_TINTE_CARGADO);
  const color = geometria.getAttribute('color');
  if (mascara === undefined || color === undefined) return geometria;
  let porReferencia = cacheDeGrises.get(geometria);
  if (porReferencia === undefined) {
    porReferencia = new Map();
    cacheDeGrises.set(geometria, porReferencia);
  }
  const clave = referencia.join(',');
  const hecha = porReferencia.get(clave);
  if (hecha !== undefined) return hecha;
  const copia = geometria.clone();
  const n = color.count;
  const nuevo = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = color.getX(i);
    const g = color.getY(i);
    const b = color.getZ(i);
    if ((mascara as THREE.BufferAttribute).getX(i) > 0.5) {
      const gris = grisDeLuminancia([r, g, b], referencia);
      nuevo[i * 3] = gris;
      nuevo[i * 3 + 1] = gris;
      nuevo[i * 3 + 2] = gris;
    } else {
      nuevo[i * 3] = r;
      nuevo[i * 3 + 1] = g;
      nuevo[i * 3 + 2] = b;
    }
  }
  copia.setAttribute('color', new THREE.BufferAttribute(nuevo, 3));
  porReferencia.set(clave, copia);
  return copia;
}

/** La geometría de una pieza ENTERA lista para `instanceColor`. */
export function geometriaParaInstanciar(pieza: NombreDePieza, geometria: THREE.BufferGeometry): THREE.BufferGeometry {
  return seTineEntera(pieza) ? geometriaAGris(geometria, referenciaDe(pieza)) : geometria;
}

/** La geometría de una pieza PARCIAL teñida de un color: una por color, de la caché de `tinte.ts`. */
export function geometriaTenidaDe(pieza: NombreDePieza, geometria: THREE.BufferGeometry, hex: string): THREE.BufferGeometry {
  return tenirGeometria(geometria, hex, referenciaDe(pieza));
}

/**
 * LOS COLORES DE LAS BANDERAS que hacen falta en un tablero: los de los asientos que
 * aparecen y el ámbar del Concejo, sin repetir y en orden estable (para que las
 * `InstancedMesh` por color no se remonten al cambiar el orden de la lista).
 */
export function coloresDeLasBanderas(colores: readonly string[]): string[] {
  const salida: string[] = [];
  for (const c of [...colores, AMBAR_DEL_CONCEJO]) if (!salida.includes(c)) salida.push(c);
  return salida.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * SUELTA DE LA GPU las geometrías grises derivadas de ESTAS geometrías (las aplanadas que
 * la escena guarda por pieza) y olvida su caché. Las teñidas por color las suelta
 * `soltarTintesDelBurgo`, que trabaja sobre piezas. Devuelve cuántas ha soltado.
 */
export function soltarGrises(geometrias: Iterable<THREE.BufferGeometry>): number {
  let soltadas = 0;
  for (const geometria of geometrias) {
    const grises = cacheDeGrises.get(geometria);
    if (grises === undefined) continue;
    for (const g of grises.values()) {
      g.dispose();
      soltadas++;
    }
    cacheDeGrises.delete(geometria);
  }
  return soltadas;
}

/**
 * SUELTA las grises Y las teñidas por color derivadas de estas geometrías (las que la
 * escena aplana por pieza). `soltarTintes` de `tinte.ts` trabaja sobre piezas y busca su
 * caché por la geometría de cada malla, así que cada geometría se le presenta envuelta
 * en una malla desechable: es el mismo camino, sin abrir su caché.
 */
export function soltarTintesDeGeometrias(geometrias: Iterable<THREE.BufferGeometry>): number {
  const lista = [...geometrias];
  return soltarGrises(lista) + soltarTintes(lista.map((g) => new THREE.Mesh(g)));
}

/**
 * SUELTA DE LA GPU las geometrías grises y las teñidas por color de estas piezas, y
 * olvida sus cachés. Devuelve cuántas ha soltado.
 */
export function soltarTintesDelBurgo(piezas: Iterable<THREE.Object3D>): number {
  const lista = [...piezas];
  const geometrias: THREE.BufferGeometry[] = [];
  for (const pieza of lista) {
    pieza.traverse((n) => {
      const malla = n as THREE.Mesh;
      if (malla.isMesh) geometrias.push(malla.geometry);
    });
  }
  return soltarGrises(geometrias) + soltarTintes(lista);
}
