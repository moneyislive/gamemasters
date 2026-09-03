/**
 * LA RED DE CAMINOS DEL MUNDO, hecha con las teselas de camino del pack.
 *
 * ═══ QUÉ PROBLEMA RESUELVE ESTO ═══
 *
 * El juego pone caminos en las ARISTAS de las comarcas y construcciones en los
 * VÉRTICES. Para que eso se pueda jugar hay que ver dónde están, y la primera
 * versión lo resolvió pintando una raya recta de tierra a lo largo de cada arista.
 * Se veía como lo que era: una raya. Setenta y dos rayas rectas dibujando un panal
 * perfecto sobre un terreno que se había generado justamente para no tener patrones.
 *
 * El pack trae TRECE teselas de camino, y no son decoración: son un catálogo
 * completo. Cada una lleva el trazado entrando y saliendo por un conjunto distinto de
 * lados, y entre las trece —con sus seis giros— cubren TODAS las formas posibles de
 * que un camino atraviese un hexágono. Medido, no supuesto:
 *
 *     A={0,3}  B={1,3}  C={2,3}          dos bocas: recta, curva suave, curva cerrada
 *     D={1,3,5}  E={0,1,3}  F={0,3,5}  G={2,3,4}        tres bocas
 *     H={0,2,3,4}  I={1,2,4,5}  J={0,3,4,5}             cuatro bocas
 *     K={1,2,3,4,5}   L={0,1,2,3,4,5}                   cinco y seis
 *     M={3}                                             callejón sin salida
 *
 * Son 1+3+4+3+1+1 = 13 clases, y ésas son TODAS las que hay salvo rotación. O sea
 * que cualquier trazado que se le ocurra a este módulo tiene pieza. Eso no es
 * suerte: es la razón por la que el algoritmo puede permitirse serpentear.
 *
 * ═══ POR QUÉ EL CAMINO SERPENTEA ═══
 *
 * Un camino que fuera en línea recta de un vértice al siguiente volvería a dibujar
 * el panal, sólo que con mejores texturas. Así que el trazado se desvía a los lados
 * siguiendo un ruido continuo: se aleja del borde, vuelve, se cruza con él. Sigue
 * uniendo los mismos dos vértices —eso lo exige el juego— pero por un recorrido que
 * no se repite en dos aristas y que no se adivina.
 *
 * ═══ Y POR QUÉ SE CAMINA POR LA REJILLA Y NO SE MUESTREA LA CURVA ═══
 *
 * Muestrear la curva y quedarse con el hexágono de cada muestra deja AGUJEROS en
 * cuanto la curva cruza una esquina: dos muestras consecutivas caen en hexágonos que
 * no son vecinos, y el camino sale partido. Aquí se muestrea y luego se REPARA,
 * rellenando con la línea recta de hexágonos entre cada dos eslabones que no se
 * tocan. Así la cadena es siempre continua, que es la condición para que las bocas de
 * una tesela casen con las de la siguiente.
 */
import { DIRECCIONES, centroDeHex, vecino } from '../shared/mecanicas/malla-hexagonal';
import type { Hex, Punto } from '../shared/mecanicas/malla-hexagonal';
import { MODELO } from './nombres';
import { fbm } from './ruido';

/**
 * DE UN VECINO DE NUESTRA MALLA AL NÚMERO DE LADO DEL PACK.
 *
 * El pack numera sus lados con la normal en `(cos 60k, 0, -sin 60k)`, o sea por el
 * ángulo `atan2(-z, x)`; nuestra malla vive en el plano `(x, y)` y su `y` es la `z`
 * del mundo. Así que el lado que corresponde al vecino `j` sale de medir el ángulo
 * de la dirección a ese vecino con ese mismo convenio y dividir entre sesenta.
 *
 * Se CALCULA en vez de escribirse a mano. Una tabla escrita a mano es una tabla que
 * deja de valer el día que la malla cambie de convenio, y el síntoma serían caminos
 * que entran por un lado y salen por otro sin tocarse — que se ve, pero muy tarde.
 */
const LADO_DEL_PACK: readonly number[] = DIRECCIONES.map((_, j) => {
  const centro = centroDeHex({ q: 0, r: 0 }, 1);
  const v = centroDeHex(vecino({ q: 0, r: 0 }, j), 1);
  const angulo = Math.atan2(-(v.y - centro.y), v.x - centro.x);
  const k = Math.round((angulo / (Math.PI / 3) + 6) % 6);
  return k % 6;
});

/**
 * LAS DOCE FORMAS DE ATRAVESAR UN HEXÁGONO, con la letra que les puso el pack.
 *
 * Es la misma tabla para los CAMINOS y para los RÍOS: está medido que
 * `hex_river_A` conecta exactamente los mismos lados que `hex_road_A`, y así las
 * doce. Por eso la tabla de abajo lleva la letra y no el modelo, y cada familia pone
 * el suyo.
 *
 * La M —callejón sin salida— la tienen sólo los caminos. Un río que se acaba dentro
 * del mapa no existe ni en la naturaleza ni en el pack, así que su ausencia es una
 * regla y no una carencia: si el generador de aguas pidiera una M, es que ha trazado
 * un río que no desemboca.
 */
const FORMAS: ReadonlyArray<{ letra: string; lados: readonly number[] }> = [
  { letra: 'a', lados: [0, 3] },
  { letra: 'b', lados: [1, 3] },
  { letra: 'c', lados: [2, 3] },
  { letra: 'd', lados: [1, 3, 5] },
  { letra: 'e', lados: [0, 1, 3] },
  { letra: 'f', lados: [0, 3, 5] },
  { letra: 'g', lados: [2, 3, 4] },
  { letra: 'h', lados: [0, 2, 3, 4] },
  { letra: 'i', lados: [1, 2, 4, 5] },
  { letra: 'j', lados: [0, 3, 4, 5] },
  { letra: 'k', lados: [1, 2, 3, 4, 5] },
  { letra: 'l', lados: [0, 1, 2, 3, 4, 5] },
];

/** Los trazados de camino: las doce formas más el callejón sin salida. */
const TRAZADOS: ReadonlyArray<{ modelo: string; lados: readonly number[] }> = [
  { modelo: MODELO.sendaM, lados: [3] },
  ...FORMAS.map((f) => ({ modelo: `senda-${f.letra}`, lados: f.lados })),
];

/** Los trazados de cauce: las doce formas, sin callejón sin salida. */
const CAUCES: ReadonlyArray<{ modelo: string; lados: readonly number[] }> = FORMAS.map((f) => ({
  modelo: `rio-${f.letra}`,
  lados: f.lados,
}));

/** Un conjunto de lados, empaquetado en seis bits. */
function mascaraDe(lados: Iterable<number>): number {
  let m = 0;
  for (const l of lados) m |= 1 << (((l % 6) + 6) % 6);
  return m;
}

/** Gira una máscara de lados `n` sextos de vuelta. */
function giraMascara(m: number, n: number): number {
  let salida = 0;
  for (let k = 0; k < 6; k++) {
    if ((m & (1 << k)) !== 0) salida |= 1 << ((k + n) % 6);
  }
  return salida;
}

/**
 * LA TABLA COMPLETA: para cada forma posible de atravesar un hexágono, qué tesela y
 * con qué giro.
 *
 * Se construye una vez, girando los trece trazados canónicos. Las 63 máscaras no
 * vacías quedan cubiertas, y `verify:escena` lo comprueba — si el pack cambiara y
 * faltara una clase, se caería en la batería y no en un camino partido a la vista.
 */
function tablaDe(
  trazados: ReadonlyArray<{ modelo: string; lados: readonly number[] }>,
): ReadonlyMap<number, { modelo: string; giro: number }> {
  const tabla = new Map<number, { modelo: string; giro: number }>();
  for (const t of trazados) {
    const base = mascaraDe(t.lados);
    for (let n = 0; n < 6; n++) {
      const m = giraMascara(base, n);
      if (tabla.has(m)) continue;
      tabla.set(m, { modelo: t.modelo, giro: (n * Math.PI) / 3 });
    }
  }
  return tabla;
}

const PIEZA_DE_MASCARA = tablaDe(TRAZADOS);
const CAUCE_DE_MASCARA = tablaDe(CAUCES);

/** La tesela de camino que corresponde a un conjunto de lados, o `null` si no hay ninguno. */
export function piezaDeSenda(lados: Iterable<number>): { modelo: string; giro: number } | null {
  return PIEZA_DE_MASCARA.get(mascaraDe(lados)) ?? null;
}

/**
 * La tesela de CAUCE que corresponde a un conjunto de lados.
 *
 * Devuelve `null` si el conjunto tiene un solo lado, porque el pack no trae un río
 * que muera dentro del mapa. Quien lo pida está trazando un río que no desemboca, y
 * eso es un fallo del generador de aguas, no una pieza que falte.
 */
export function piezaDeCauce(lados: Iterable<number>): { modelo: string; giro: number } | null {
  return CAUCE_DE_MASCARA.get(mascaraDe(lados)) ?? null;
}

/** Cuántas formas distintas de cruce sabe resolver la tabla de caminos. Para el comprobador. */
export function cuantasFormasDeCruce(): number {
  return PIEZA_DE_MASCARA.size;
}

/** Y cuántas la de cauces: seis menos, las de una sola boca. */
export function cuantasFormasDeCauce(): number {
  return CAUCE_DE_MASCARA.size;
}

/** El vecino `j` de un hexágono, como número de lado del pack. */
export function ladoHaciaElVecino(j: number): number {
  return LADO_DEL_PACK[((j % 6) + 6) % 6] as number;
}

/** Convierte coordenadas axiales a cúbicas, que es donde se puede interpolar. */
function aCubicas(h: Hex): [number, number, number] {
  return [h.q, -h.q - h.r, h.r];
}

/** Redondea una coordenada cúbica fraccionaria al hexágono más cercano. */
function redondeaCubicas(x: number, y: number, z: number): Hex {
  let rx = Math.round(x);
  let ry = Math.round(y);
  const rz = Math.round(z);
  const dx = Math.abs(rx - x);
  const dy = Math.abs(ry - y);
  const dz = Math.abs(rz - z);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dy > dz) ry = -rx - rz;
  return { q: rx, r: -rx - ry };
}

/** La línea recta de hexágonos entre dos, ambos incluidos. Sirve para reparar la cadena. */
function lineaDeHexes(a: Hex, b: Hex): Hex[] {
  const [ax, ay, az] = aCubicas(a);
  const [bx, by, bz] = aCubicas(b);
  const pasos = Math.max(Math.abs(ax - bx), Math.abs(ay - by), Math.abs(az - bz));
  if (pasos === 0) return [a];
  const salida: Hex[] = [];
  for (let i = 0; i <= pasos; i++) {
    const t = i / pasos;
    salida.push(
      redondeaCubicas(ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t),
    );
  }
  return salida;
}

/** ¿Son vecinos estos dos hexágonos? Devuelve el índice de dirección, o -1. */
function direccionEntre(a: Hex, b: Hex): number {
  for (let j = 0; j < DIRECCIONES.length; j++) {
    const v = vecino(a, j);
    if (v.q === b.q && v.r === b.r) return j;
  }
  return -1;
}

/**
 * CUÁNTO SE DESVÍA UN CAMINO de la recta que une dos vértices.
 *
 * Poco más de una tesela. Con menos no se nota que serpentea; con mucho más el
 * camino se mete en la comarca vecina y deja de leerse que va por la arista, que es
 * la información que el juego necesita transmitir.
 */
const DESVIO_MAXIMO = 1.35;

/** Cada cuánto se muestrea la curva, en pasos de tesela. Medio paso no deja huecos. */
const MUESTREO = 0.45;

/**
 * TRAZA UN CAMINO de un punto a otro y devuelve la cadena de teselas por las que va.
 *
 * La cadena es SIEMPRE continua —cada eslabón es vecino del siguiente— porque
 * después de muestrear se rellenan los huecos con la línea recta de hexágonos. Sin
 * ese remiendo, la curva al cruzar una esquina salta de un hexágono a otro que no lo
 * toca y el camino sale partido en dos trozos que no casan.
 */
export function teselasDeUnCamino(
  desde: Punto,
  hasta: Punto,
  radioDeTesela: number,
  pasoEntreTeselas: number,
  canal: number,
  hexDePunto: (p: Punto, tamano: number) => Hex,
): Hex[] {
  const dx = hasta.x - desde.x;
  const dy = hasta.y - desde.y;
  const largo = Math.hypot(dx, dy);
  if (largo <= 0) return [hexDePunto(desde, radioDeTesela)];

  /* La perpendicular unitaria, que es hacia donde se desvía el trazado. */
  const px = -dy / largo;
  const py = dx / largo;
  const cuantas = Math.max(2, Math.ceil(largo / (pasoEntreTeselas * MUESTREO)));

  const cadena: Hex[] = [];
  for (let i = 0; i <= cuantas; i++) {
    const t = i / cuantas;
    /*
     * El desvío se anula en los dos extremos con `sin(πt)`: los caminos TIENEN que
     * llegar exactamente al vértice, porque ahí es donde se construye y donde se
     * encuentran con los otros dos caminos que salen de él. Serpentear por el medio
     * es paisaje; serpentear en la punta sería un fallo de juego.
     */
    const cuanto = Math.sin(Math.PI * t);
    const x = desde.x + dx * t;
    const y = desde.y + dy * t;
    const ruido =
      fbm(x / (pasoEntreTeselas * 4), y / (pasoEntreTeselas * 4), canal, 3) - 0.5;
    const desvio = ruido * 2 * DESVIO_MAXIMO * pasoEntreTeselas * cuanto;
    const h = hexDePunto({ x: x + px * desvio, y: y + py * desvio }, radioDeTesela);

    const ultimo = cadena[cadena.length - 1];
    if (ultimo === undefined) {
      cadena.push(h);
      continue;
    }
    if (ultimo.q === h.q && ultimo.r === h.r) continue;
    if (direccionEntre(ultimo, h) >= 0) {
      cadena.push(h);
      continue;
    }
    /* Se saltó una esquina: se rellena con la línea recta entre los dos. */
    for (const relleno of lineaDeHexes(ultimo, h).slice(1)) {
      const anterior = cadena[cadena.length - 1] as Hex;
      if (anterior.q === relleno.q && anterior.r === relleno.r) continue;
      cadena.push(relleno);
    }
  }
  return cadena;
}

/**
 * APUNTA POR QUÉ LADOS SALE EL CAMINO EN CADA TESELA DE UNA CADENA.
 *
 * Un cruce sale solo: si tres caminos llegan a la misma tesela —que es lo que pasa
 * en los vértices, donde se juntan tres aristas— sus lados se acumulan en el mismo
 * conjunto y la tabla devuelve la pieza de tres bocas. No hay que detectar los cruces
 * ni tratarlos aparte.
 */
export function apuntaLosLados(cadena: readonly Hex[], donde: Map<string, Set<number>>): void {
  for (let i = 0; i < cadena.length; i++) {
    const aqui = cadena[i] as Hex;
    const llave = `${String(aqui.q)},${String(aqui.r)}`;
    let lados = donde.get(llave);
    if (lados === undefined) {
      lados = new Set<number>();
      donde.set(llave, lados);
    }
    const antes = cadena[i - 1];
    const despues = cadena[i + 1];
    if (antes !== undefined) {
      const j = direccionEntre(aqui, antes);
      if (j >= 0) lados.add(ladoHaciaElVecino(j));
    }
    if (despues !== undefined) {
      const j = direccionEntre(aqui, despues);
      if (j >= 0) lados.add(ladoHaciaElVecino(j));
    }
    /* Un extremo suelto lleva la pieza de callejón sin salida, que también existe. */
    if (antes === undefined && despues === undefined) lados.add(3);
  }
}
