/**
 * EL SUELO DEL TABLERO: una sola geometría con todas las losas puestas.
 *
 * ═══ POR QUÉ UNA SOLA Y NO UNA POR LOSA ═══
 *
 * Porque setenta y dos mallas son setenta y dos llamadas de dibujo, y el suelo es
 * lo único que está SIEMPRE entero en pantalla: no se puede recortar por
 * distancia como el relleno, porque un agujero en el suelo no es menos detalle,
 * es un agujero. Juntándolas, el tablero entero cuesta UNA llamada.
 *
 * El precio es que hay que rehacerla cuando se pone una losa. Son 144 celdas por
 * losa y una losa nueva cada varios segundos: se mide en microsegundos y no se
 * nota. Y se rehace ENTERA y no por partes a propósito — una geometría que se
 * parchea es una geometría con dos caminos, y el que se usa poco es el que está
 * mal.
 *
 * ═══ EL GRUESO SE VE, Y ESO ES LA MITAD DE QUE PAREZCA UN TABLERO ═══
 *
 * Cada losa lleva su faldón: cuatro caras que bajan del borde de arriba hasta el
 * grueso. Sin él, el tablero es un mapa pintado en el suelo; con él, son fichas
 * que alguien ha ido poniendo, que es exactamente lo que son. Y como cada losa
 * tiene el suyo y se deja una raya de aire entre vecinas, se ve dónde acaba una y
 * empieza la otra sin pintar ninguna línea.
 */
import * as THREE from 'three';
import { GRUESO_DE_LOSA, LADO_DE_CELDA, LADO_DE_LOSA, CELDAS_POR_LOSA, ALZADO_DE_LA_VILLA, HUNDIDO_DE_LA_SENDA } from './medidas';
import { sueloDeLaLosa } from './losa';
import type { ClaseDeSuelo } from './losa';
import { losaPorId } from '../../shared/arcade/juegos/lindes-losas';
import type { Giro } from '../../shared/arcade/juegos/lindes-losas';

/** Lo que hay que pintar de una losa: dónde está y qué es. */
export interface LosaQueSePinta {
  readonly x: number;
  readonly y: number;
  readonly losa: string;
  readonly giro: Giro;
  /** Se pinta más clara mientras se está eligiendo dónde va. */
  readonly fantasma?: boolean;
}

/**
 * LOS COLORES DEL SUELO.
 *
 * Salen de la paleta del pack —el verde es el de la hierba del atlas, el pardo el
 * de la tierra— para que el suelo y las piezas que se ponen encima parezcan del
 * mismo sitio. Un suelo con otro verde debajo de un árbol del pack se ve como un
 * recorte pegado.
 */
export const COLOR_DEL_PRADO = '#6f9a4e';
export const COLOR_DE_LA_SENDA = '#b08a55';
export const COLOR_DE_LA_VILLA = '#9b9389';
export const COLOR_DEL_FALDON = '#4c3b28';

const PRADO = new THREE.Color(COLOR_DEL_PRADO);
const SENDA = new THREE.Color(COLOR_DE_LA_SENDA);
const VILLA = new THREE.Color(COLOR_DE_LA_VILLA);
const FALDON = new THREE.Color(COLOR_DEL_FALDON);

/**
 * CUÁNTO SE DEJA DE AIRE ENTRE DOS LOSAS VECINAS, para que se distingan.
 *
 * ═══ VALÍA 0,012 Y POR AHÍ SE VEÍA EL CIELO ═══
 *
 * Con la losa en 175, doce milésimas son dos unidades de hueco, y por un hueco de
 * dos unidades entre dos cartones de tres y medio de grueso SE VE EL FONDO cuando la
 * cámara está inclinada. En la vista de mesa eso salía como una retícula de rayas
 * azul cielo cruzando el tablero de lado a lado — y no se leía como «hay juntas»,
 * se leía como «el tablero está roto».
 *
 * Se arregla por los dos lados a la vez: la junta baja a la tercera parte, y debajo
 * del tablero hay una MESA (ver `geometriaDeLaMesa`). Lo segundo es lo que de verdad
 * lo cierra —por la junta se ve la mesa, que es lo que se ve en una mesa— y lo
 * primero es lo que hace que la junta siga contando dónde acaba una losa.
 */
export const JUNTA_ENTRE_LOSAS = LADO_DE_LOSA * 0.004;

/** La altura a la que va la cara de arriba de cada clase de suelo. */
export function alturaDe(clase: ClaseDeSuelo): number {
  if (clase === 'senda') return -HUNDIDO_DE_LA_SENDA;
  if (clase === 'villa') return ALZADO_DE_LA_VILLA;
  return 0;
}

/** El color de cada clase, con una pizca de variación para que no sea una plancha. */
function colorDe(clase: ClaseDeSuelo, ruido: number, salida: THREE.Color): THREE.Color {
  const base = clase === 'senda' ? SENDA : clase === 'villa' ? VILLA : PRADO;
  const f = 0.92 + ruido * 0.16;
  return salida.setRGB(base.r * f, base.g * f, base.b * f);
}

/** Un ruido barato y estable por celda: la misma losa da siempre lo mismo. */
function ruidoDeCelda(x: number, y: number, i: number, j: number): number {
  let h = ((x * 73856093) ^ (y * 19349663) ^ (i * 83492791) ^ (j * 2971215073)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

/**
 * LA GEOMETRÍA DE UN TABLERO ENTERO.
 *
 * Devuelve `null` si no hay ni una losa, que es lo que pasa mientras la mesa se
 * reúne — y devolver `null` y no una geometría vacía es deliberado: `three` pinta
 * una geometría vacía sin quejarse, y entonces «no hay tablero» y «el tablero no
 * se ve» dejan de distinguirse.
 */
export function geometriaDelSuelo(losas: readonly LosaQueSePinta[]): THREE.BufferGeometry | null {
  if (losas.length === 0) return null;

  const posiciones: number[] = [];
  const colores: number[] = [];
  const normales: number[] = [];
  const aux = new THREE.Color();
  const media = LADO_DE_LOSA / 2;

  const cara = (
    puntos: readonly [number, number, number][],
    color: THREE.Color,
    normal: readonly [number, number, number],
  ): void => {
    const [a, b, c, d] = puntos as [
      [number, number, number],
      [number, number, number],
      [number, number, number],
      [number, number, number],
    ];
    for (const p of [a, b, c, a, c, d]) {
      posiciones.push(p[0], p[1], p[2]);
      colores.push(color.r, color.g, color.b);
      normales.push(normal[0], normal[1], normal[2]);
    }
  };

  for (const l of losas) {
    const losa = losaPorId(l.losa);
    if (losa === null) continue;
    const celdas = sueloDeLaLosa(losa, l.giro);
    /* El centro de la losa en el mundo: la `y` del tablero crece al norte, la `z` al sur. */
    const cx = l.x * LADO_DE_LOSA;
    const cz = -l.y * LADO_DE_LOSA;

    /*
     * ═══ LAS CELDAS SEGUIDAS DE LA MISMA CLASE SE FUNDEN EN UN RECTÁNGULO ═══
     *
     * Con la retícula en 48 son 2.304 celdas por losa: 4.608 triángulos cada una y
     * 331.776 el tablero entero, o sea un tercio del techo de un PC gastado en un
     * plano. Y no hace ninguna falta: un prado que ocupa media losa es UN
     * rectángulo, no quinientas casillas.
     *
     * Se recorren las celdas en orden, y de cada una sin usar se estira un
     * rectángulo todo lo que se pueda a lo ancho y después todo lo que se pueda a
     * lo largo, mientras la clase sea la misma. Es el algoritmo de siempre para
     * esto; lo que importa aquí es lo que cuesta: una losa pasa de 4.608 triángulos
     * a entre veinte y doscientos, según lo picada que esté.
     *
     * ═══ Y EL COLOR PASA A SER POR RECTÁNGULO, QUE ADEMÁS SE VE MEJOR ═══
     *
     * Antes cada celda llevaba su pizca de variación y el prado salía moteado como
     * confeti; ahora la lleva cada rectángulo, y el prado sale a manchas —que es
     * como se ve un campo de verdad desde arriba, y lo que el ojo lee como terreno
     * en vez de como retícula.
     */
    const usada: boolean[] = new Array(CELDAS_POR_LOSA * CELDAS_POR_LOSA).fill(false);
    const claseEn = (i: number, j: number): ClaseDeSuelo =>
      (celdas[j * CELDAS_POR_LOSA + i] as { clase: ClaseDeSuelo }).clase;

    for (let j = 0; j < CELDAS_POR_LOSA; j++) {
      for (let i = 0; i < CELDAS_POR_LOSA; i++) {
        if (usada[j * CELDAS_POR_LOSA + i] === true) continue;
        const clase = claseEn(i, j);

        let ancho = 1;
        while (
          i + ancho < CELDAS_POR_LOSA &&
          usada[j * CELDAS_POR_LOSA + i + ancho] !== true &&
          claseEn(i + ancho, j) === clase
        ) {
          ancho++;
        }

        let alto = 1;
        crecer: while (j + alto < CELDAS_POR_LOSA) {
          for (let k = 0; k < ancho; k++) {
            if (usada[(j + alto) * CELDAS_POR_LOSA + i + k] === true) break crecer;
            if (claseEn(i + k, j + alto) !== clase) break crecer;
          }
          alto++;
        }

        for (let b = 0; b < alto; b++) {
          for (let a = 0; a < ancho; a++) usada[(j + b) * CELDAS_POR_LOSA + i + a] = true;
        }

        /*
         * ═══ LA JUNTA SÓLO MUERDE EN EL BORDE DE LA LOSA, Y ESTO ESTABA MAL ═══
         *
         * La primera versión con rectángulos le quitaba media junta por cada lado a
         * TODOS, también a los de dentro. Como un rectángulo acaba donde empieza el
         * de al lado, eso abría una rendija de siete décimas ENTRE CADA DOS CLASES
         * DE SUELO: entre el prado y el camino, entre el camino y la villa. Por esas
         * rendijas se veía la mesa oscura de debajo, y desde la cámara de mesa el
         * tablero salía RAYADO, con líneas oscuras siguiendo cada borde.
         *
         * No daba ningún error y costó encontrarlo porque la causa —«el suelo se
         * encoge»— no se parece al síntoma —«hay rayas»—. La junta es para separar
         * LOSAS, así que sólo se aplica donde el rectángulo toca el canto de la suya.
         */
        const recortaOeste = i === 0 ? JUNTA_ENTRE_LOSAS / 2 : 0;
        const recortaNorte = j === 0 ? JUNTA_ENTRE_LOSAS / 2 : 0;
        const recortaEste = i + ancho === CELDAS_POR_LOSA ? JUNTA_ENTRE_LOSAS / 2 : 0;
        const recortaSur = j + alto === CELDAS_POR_LOSA ? JUNTA_ENTRE_LOSAS / 2 : 0;
        const x0 = cx - media + i * LADO_DE_CELDA + recortaOeste;
        const z0 = cz - media + j * LADO_DE_CELDA + recortaNorte;
        const anchoReal = ancho * LADO_DE_CELDA - recortaOeste - recortaEste;
        const altoReal = alto * LADO_DE_CELDA - recortaNorte - recortaSur;
        const y = alturaDe(clase);
        const color = colorDe(clase, ruidoDeCelda(l.x, l.y, i, j), aux);
        /*
         * ═══ EL ORDEN DE LOS CUATRO PUNTOS ES LA CARA, Y AL REVÉS NO FALLA NADA ═══
         *
         * Una cara mira hacia donde la lleva el ORDEN de sus vértices, y `three`
         * sólo pinta la de delante. Con el orden natural —de oeste a este y luego
         * al sur— la cara de arriba de una losa mira HACIA ABAJO, y el tablero se
         * ve con las casas y las murallas puestas sobre el vacío: el suelo está
         * ahí, con todos sus triángulos, y no se ve ni uno.
         *
         * Costó una pasada entera y no dio ningún error. Esta casa ya lo tenía
         * apuntado de los tejados de una ciudad, y aquí se repitió: se va al sur
         * ANTES que al este, que visto desde arriba es lo que deja la cara mirando
         * al cielo.
         */
        cara(
          [
            [x0, y, z0],
            [x0, y, z0 + altoReal],
            [x0 + anchoReal, y, z0 + altoReal],
            [x0 + anchoReal, y, z0],
          ],
          color,
          [0, 1, 0],
        );
      }
    }

    /*
     * El faldón. Cuatro caras que bajan, con la normal hacia FUERA de la losa: si
     * mirasen hacia dentro, la luz les daría por detrás y el tablero saldría con
     * el canto negro. Es el fallo que esta casa ya pagó una vez con los tejados de
     * una ciudad entera, y no da ningún error: se ve.
     */
    const a = media - JUNTA_ENTRE_LOSAS / 2;
    const abajo = -GRUESO_DE_LOSA;
    const esquinas: readonly [number, number][] = [
      [cx - a, cz - a],
      [cx + a, cz - a],
      [cx + a, cz + a],
      [cx - a, cz + a],
    ];
    const normalesDelFaldon: readonly [number, number, number][] = [
      [0, 0, -1],
      [1, 0, 0],
      [0, 0, 1],
      [-1, 0, 0],
    ];
    for (let k = 0; k < 4; k++) {
      const p = esquinas[k] as [number, number];
      const q = esquinas[(k + 1) % 4] as [number, number];
      cara(
        [
          [p[0], 0, p[1]],
          [q[0], 0, q[1]],
          [q[0], abajo, q[1]],
          [p[0], abajo, p[1]],
        ],
        FALDON,
        normalesDelFaldon[k] as [number, number, number],
      );
    }
  }

  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
  geometria.setAttribute('color', new THREE.Float32BufferAttribute(colores, 3));
  geometria.setAttribute('normal', new THREE.Float32BufferAttribute(normales, 3));
  geometria.computeBoundingSphere();
  return geometria;
}

/**
 * LA MESA DE DEBAJO: el tablero está encima de algo.
 *
 * ═══ NO ES ADORNO: ES LO QUE TAPA LAS JUNTAS ═══
 *
 * Una losa es un cartón con grueso, así que entre dos vecinas hay una raya de aire.
 * Sin nada debajo, por esa raya se ve EL CIELO, y un tablero atravesado por rayas
 * de cielo no parece un tablero con juntas: parece un tablero roto. Con la mesa,
 * por la junta se ve la mesa.
 *
 * Y de paso da lo que a la vista aérea le faltaba: un sitio. Un tablero flotando
 * sobre el vacío azul es una maqueta; sobre una mesa es una partida.
 *
 * Sale UN PELO más grande que lo que abarcan las losas —media losa por cada lado—
 * para que no se le vea el borde justo donde acaba el tablero, y se queda POR
 * DEBAJO del faldón para que no pelee con él por el mismo píxel.
 */
export function geometriaDeLaMesa(
  losas: readonly { readonly x: number; readonly y: number }[],
): THREE.BufferGeometry | null {
  if (losas.length === 0) return null;
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const l of losas) {
    if (l.x < minX) minX = l.x;
    if (l.x > maxX) maxX = l.x;
    if (l.y < minY) minY = l.y;
    if (l.y > maxY) maxY = l.y;
  }
  const margen = LADO_DE_LOSA * 0.75;
  const x0 = (minX - 0.5) * LADO_DE_LOSA - margen;
  const x1 = (maxX + 0.5) * LADO_DE_LOSA + margen;
  /* La `y` del tablero crece al norte y la `z` al sur: por eso se cruzan. */
  const z0 = -(maxY + 0.5) * LADO_DE_LOSA - margen;
  const z1 = -(minY - 0.5) * LADO_DE_LOSA + margen;
  const y = -GRUESO_DE_LOSA * 1.02;

  const posiciones = [x0, y, z0, x0, y, z1, x1, y, z1, x0, y, z0, x1, y, z1, x1, y, z0];
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
  geometria.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3),
  );
  geometria.computeBoundingSphere();
  return geometria;
}

/** El color de la mesa sobre la que se juega: un fieltro oscuro de tablero. */
export const COLOR_DE_LA_MESA = '#2b3524';

/**
 * LA GEOMETRÍA DE LAS CASILLAS DONDE CABE LA LOSA DE LA MANO.
 *
 * Una chapa plana por casilla, un pelo por encima del suelo, para que se pueda
 * tocar y para que se vea dónde hay sitio. No lleva el contenido de la losa: eso
 * lo enseña el fantasma, y sólo en la casilla que se está señalando.
 */
export function geometriaDeLosHuecos(
  huecos: readonly { readonly x: number; readonly y: number }[],
): THREE.BufferGeometry | null {
  if (huecos.length === 0) return null;
  const posiciones: number[] = [];
  const media = LADO_DE_LOSA / 2 - JUNTA_ENTRE_LOSAS;
  const y = LADO_DE_LOSA * 0.004;
  const vistas = new Set<string>();
  for (const h of huecos) {
    const llave = `${h.x},${h.y}`;
    if (vistas.has(llave)) continue;
    vistas.add(llave);
    const cx = h.x * LADO_DE_LOSA;
    const cz = -h.y * LADO_DE_LOSA;
    /* En el mismo orden que la cara de arriba de una losa, y por lo mismo. */
    const p: readonly [number, number][] = [
      [cx - media, cz - media],
      [cx - media, cz + media],
      [cx + media, cz + media],
      [cx + media, cz - media],
    ];
    const [a, b, c, d] = p as [[number, number], [number, number], [number, number], [number, number]];
    for (const q of [a, b, c, a, c, d]) posiciones.push(q[0], y, q[1]);
  }
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
  geometria.computeVertexNormals();
  geometria.computeBoundingSphere();
  return geometria;
}
