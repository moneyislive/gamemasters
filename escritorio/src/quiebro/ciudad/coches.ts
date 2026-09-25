/**
 * LOS COCHES APARCADOS: compactos, berlinas, familiares, furgonetas y taxis procedurales, dentro de la caja
 * de cada uno (4,5 × 1,75 m: ninguna carrocería pasa de 1,72 de ancho ni de 4,45 de largo).
 *
 * ═══ UN LOFT, NO UNA CAJA ═══
 *
 * Un coche se reconoce por su silueta: el capó que cae hacia el morro, el parabrisas tumbado, el techo, la
 * luna de atrás, los pasos de rueda y las ruedas dentro de ellos. Aquí el cuerpo es un LOFT (`loft`, abajo):
 * secciones puestas a lo largo del coche y cosidas, cada una con su anillo (el costado con su panza y el
 * hombro que redondea hacia la tapa del capó o del maletero). Las secciones van donde cambia algo: las puntas
 * con sus esquinas redondeadas en planta, el arco de cada paso de rueda (el canto de abajo del costado sube
 * alrededor de la rueda: el paso va RECORTADO en el perfil, no pintado) y donde empieza y acaba la cabina.
 * Encima va la cabina, otro loft más pequeño (con su caída hacia dentro), apoyada en el canto del hombro: la
 * línea de cintura sigue de punta a punta.
 *
 * ═══ CUATRO GRADOS (§3.1 y §3.7 del plan del detalle) ═══
 *
 *   · g1 (≤ 180 triángulos; los horneados de N0 y N1): anillo de seis puntos, pasos de tres tramos, la
 *     cabina en cinco caras con las lunas oscuras, ruedas de seis caras apoyadas en una (el neumático en cono y
 *     un tapacubos gris claro, que de noche en N0 se distingue del costado en sombra). Las lunas de g1 y g2 son
 *     opacas, del mobiliario (sin interior detrás, el cuerpo no tiene tapa bajo la cabina: una luna transparente
 *     dejaría ver el suelo a través del coche); reflejan el cielo falso como la chapa.
 *   · g2 (≤ 450; los horneados de N2 y del anillo de N3): la panza del costado, pasos de cuatro tramos con su
 *     hueco oscuro, esquinas redondeadas, los pilares (el B negro), el flanco del neumático con la llanta
 *     rehundida, los retrovisores plegados, la rejilla y las matrículas.
 *   · g3 (≤ 1.000, dos pasos; los horneados del bloque de 3 × 3 de N3 y los cercanos de N2): lunas de
 *     CRISTAL de verdad con el interior detrás (el techo y los pilares por dentro, y la TINA del habitáculo, que
 *     baja 32 cm por debajo de la cintura: paneles de puerta, piso, salpicadero, asientos con su reposacabezas y,
 *     detrás, la bandeja o la mampara de la furgoneta), el bajo del costado, el techo abombado y las manillas.
 *   · g4 (≤ 3.500; sólo la capa de lo cercano de N3, `lo-cercano.ts`): todo más fino, los radios de la llanta
 *     en bulto, el volante, las manillas y los retrovisores con cuerpo, las lamas de la rejilla.
 *
 * La furgoneta puede gastar un 20 % más. Faros y pilotos van en el MISMO sitio en los cuatro grados (±1 cm:
 * lo mira `verify:quiebro-ciudad`, vehículos f), y la luz de «libre» del taxi también: la luz de una celda no
 * depende de su grado.
 *
 * ═══ LO QUE ARREGLA DE LO DE ANTES ═══
 *
 *   · Los bajos iban en una caja de 0,30-0,42 m con los costados en el mismo plano que la chapa: las dos caras
 *     se peleaban por la profundidad y el estribo parpadeaba en franjas. Ahora van de 0,12 a 0,26 m, un
 *     centímetro por dentro del estribo (que empieza en 0,28): ningún plano compartido.
 *   · La rueda es de 0,31 m con el centro a 0,31 (toca el suelo), sin tapa por dentro, con el neumático negro,
 *     la llanta de metal 0,6 y rugosidad 0,35 y el disco oscuro detrás de los radios (lo pinta la familia
 *     `llanta`, `materia/familias/llanta.ts`, por la UV del disco).
 *   · Los faros eran una caja gris que brillaba: ahora son una LENTE (tipo 4 de `emisivo.ts`) que no alumbra
 *     y sólo devuelve el brillo a ras. Los pilotos, una banda roja de lado a lado.
 *   · Los retrovisores van plegados contra la ventanilla, dentro de ±0,86 m.
 *
 * ═══ LA PINTURA Y LAS FAMILIAS DE LA MATERIA ═══
 *
 * La chapa es de la familia `carroceria` con la marca de barniz (el lóbulo lo pone la materia después de la
 * luz), y la llanta y la matrícula, de la familia `llanta`. Las dos las pinta el material del mobiliario de la
 * ventana cuando reparte familias. Mientras no las reparta (la ola 2 se integra paquete a paquete: quien
 * cablea la materia en el mobiliario es O2-MOBILIARIO), un acabado con familia se leería como rugosidad 11 y
 * el coche entero saldría mate. Por eso el acabado de cada pieza se elige al escribirla
 * (`acabadoDeVehiculo`): con familia si el material del mobiliario lleva la materia, y el de siempre
 * (rugosidad y metal a pelo) si no. Cuando estén los dos paquetes, la rama de siempre queda muerta.
 *
 * La familia necesita saber qué carrocería pinta (las costuras de las puertas no están en el mismo sitio en
 * un compacto que en una furgoneta). Viaja en la UV, que en el cuerpo es suya: `u` es la x del coche en
 * metros y `v` la altura (en lo que mira de lado) o la z (en lo que mira arriba), más 10 por el número de
 * carrocería (`NUMERO_DE_CARROCERIA`). La tabla de costuras está al lado del sombreador que la lee
 * (`COSTURAS_DE_LA_CARROCERIA`, en `materia/familias/carroceria.ts`).
 *
 * ═══ UN COCHE, UNA PIEZA QUE CEDE ═══
 *
 * `escribirElCoche` escribe un coche de un grado en los tres moldes que se le den (mobiliario, cristal y
 * emisivo), en su sitio (la matriz se aplica aquí, vértice a vértice: un generador no puede ceder dentro de
 * `Molde.con`), y cede donde el trozo de la ventana lo pide (§3.1: entre dos cesiones no más de 600
 * triángulos en N0 ni 1.000 en N1-N3, sumando familias): g1 y g2 en un paso, g3 en dos y g4 en cuatro.
 * `cocheAparcado` es el escritor de pieza de la celda (con el grado de los coches de su obra) y la capa de lo
 * cercano llama a `escribirElCoche` con el suyo. El tipo y el color salen del hash del sitio: dos aparatos ven
 * el mismo taxi en el mismo hueco.
 */
import * as THREE from 'three';
import type { Molde, P2, V3 } from './geometria';
import { ACABADO, lineal, materialDelMobiliario } from './materiales';
import type { CocheDelPlano, Orientacion } from './tipos';
import { azarEn } from './azar';
import type { CocheEncendido, ObraDeLaCelda, ParteDeLaCelda } from './celdas';
import { FAMILIA, acabado } from './materia/familias';
import type { MarcasDelAcabado, NumeroDeFamilia } from './materia/familias';
import { nombreDeLaMateria } from './materia/retoque';
import { llevaElRetoque } from '../atmosfera/parcheo';

/* ═══════════════════════════════ LAS CARROCERÍAS ═══════════════════════════════ */

/** Las cinco carrocerías. El taxi es una berlina con su librea. */
export type Carroceria = 'compacto' | 'berlina' | 'familiar' | 'furgoneta' | 'taxi';
export const CARROCERIAS: readonly Carroceria[] = ['compacto', 'berlina', 'familiar', 'furgoneta', 'taxi'];

/** El número de cada carrocería: viaja en la UV del cuerpo (ver la cabecera) y elige su fila de costuras. */
export const NUMERO_DE_CARROCERIA: Readonly<Record<Carroceria, number>> = { compacto: 0, berlina: 1, familiar: 2, furgoneta: 3, taxi: 4 };

/** Los grados de un coche: 1-3 los horneados en la celda, 4 sólo la capa de lo cercano. */
export type GradoDelCoche = 1 | 2 | 3 | 4;
export const GRADOS_DEL_COCHE: readonly GradoDelCoche[] = [1, 2, 3, 4];

/** Lo más que gasta en el mobiliario un turismo de cada grado (§3.1); la furgoneta, un 20 % más. */
export const TOPE_DEL_COCHE: Readonly<Record<GradoDelCoche, number>> = { 1: 180, 2: 450, 3: 1000, 4: 3500 };

/** El tope de una carrocería y un grado (la furgoneta, +20 %). */
export function topeDelCoche(carroceria: Carroceria, grado: GradoDelCoche): number {
  return Math.floor(TOPE_DEL_COCHE[grado] * (carroceria === 'furgoneta' ? 1.2 : 1));
}

/** La carrocería de un coche del plano: el tipo del barrio y, en un turismo, su semilla (lo decide el cliente). */
export function carroceriaDe(c: CocheDelPlano): Carroceria {
  if (c.tipo === 'taxi') return 'taxi';
  if (c.tipo === 'furgoneta') return 'furgoneta';
  const h = azarEn(c.semilla, 91);
  return h < 0.34 ? 'compacto' : h < 0.78 ? 'berlina' : 'familiar';
}

/** Un corte de la cabina a lo largo del coche: su x y lo que va en su costado hasta el corte siguiente (hacia delante). */
interface CorteDeLaCabina {
  readonly x: number;
  readonly costado: 'pilar' | 'pilarB' | 'luna' | 'panel';
}

/** La forma de una carrocería: todo en metros, en el sitio del coche (+x el morro, y arriba, z a un lado). */
export interface Forma {
  readonly largo: number;
  /** La x del eje de atrás y la del de delante. */
  readonly ejes: readonly [number, number];
  /** El canto de abajo del costado entre los pasos (el estribo). */
  readonly estribo: number;
  /** El canto de abajo fuera de los pasos (los paragolpes suben hacia las puntas): (x, y), de atrás adelante. */
  readonly fondo: readonly P2[];
  /** La tapa del cuerpo por el eje (maletero, cubierta bajo la cabina, capó): (x, y). */
  readonly tapa: readonly P2[];
  /** El medio ancho en planta: (x, z). Las puntas, redondeadas. */
  readonly ancho: readonly P2[];
  readonly cabina: {
    /** Los cortes de atrás adelante: el primero es la base de la luna (o la trasera, si `cerrada`), el último, la del parabrisas. */
    readonly cortes: readonly CorteDeLaCabina[];
    /** La x del alto del parabrisas y la del alto de la luna de atrás (donde empieza y acaba el techo). */
    readonly parabrisas: number;
    readonly techoAtras: number;
    readonly techo: number;
    readonly medioTecho: number;
    /** La furgoneta: la cabina acaba en una trasera vertical (las puertas de atrás), no en una luna tumbada. */
    readonly cerrada: boolean;
    /** Dónde se apoya: en el canto del hombro (turismos: la cintura sigue) o en la cintura (furgoneta: a paño). */
    readonly base: 'hombro' | 'cintura';
  };
  /** El faro derecho (z > 0; el izquierdo, en espejo): centro y medias medidas, en la cara del morro. */
  readonly faro: { readonly y: number; readonly z: number; readonly medioAlto: number; readonly medioAncho: number };
  /** La banda de los pilotos en la cara de atrás. */
  readonly piloto: { readonly y0: number; readonly y1: number; readonly medioAncho: number };
  /** La altura del centro de la matrícula delante y detrás. */
  readonly matricula: readonly [number, number];
}

const BERLINA: Forma = {
  largo: 4.45,
  ejes: [-1.33, 1.36],
  estribo: 0.28,
  fondo: [
    [-2.225, 0.4],
    [-2.05, 0.31],
    [-1.8, 0.28],
    [1.85, 0.28],
    [2.08, 0.31],
    [2.225, 0.4],
  ],
  tapa: [
    [-2.225, 0.9],
    [-2.12, 0.965],
    [-1.95, 0.99],
    [-1.45, 1.0],
    [0.95, 0.975],
    [1.55, 0.9],
    [2.0, 0.82],
    [2.16, 0.77],
    [2.225, 0.72],
  ],
  ancho: [
    [-2.225, 0.74],
    [-2.12, 0.82],
    [-1.95, 0.85],
    [1.95, 0.85],
    [2.12, 0.81],
    [2.225, 0.73],
  ],
  cabina: {
    cortes: [
      { x: -1.45, costado: 'pilar' },
      { x: -0.88, costado: 'luna' },
      { x: -0.17, costado: 'pilarB' },
      { x: -0.07, costado: 'luna' },
      { x: 0.18, costado: 'pilar' },
      { x: 0.95, costado: 'pilar' },
    ],
    parabrisas: 0.18,
    techoAtras: -0.88,
    techo: 1.42,
    medioTecho: 0.64,
    cerrada: false,
    base: 'hombro',
  },
  faro: { y: 0.64, z: 0.52, medioAlto: 0.045, medioAncho: 0.11 },
  piloto: { y0: 0.78, y1: 0.855, medioAncho: 0.64 },
  matricula: [0.455, 0.575],
};

const COMPACTO: Forma = {
  largo: 3.9,
  ejes: [-1.24, 1.22],
  estribo: 0.28,
  fondo: [
    [-1.95, 0.4],
    [-1.78, 0.3],
    [-1.62, 0.28],
    [1.62, 0.28],
    [1.8, 0.31],
    [1.95, 0.4],
  ],
  tapa: [
    [-1.95, 0.93],
    [-1.9, 0.985],
    [-1.72, 0.995],
    [0.78, 0.975],
    [1.3, 0.9],
    [1.72, 0.82],
    [1.88, 0.77],
    [1.95, 0.72],
  ],
  ancho: [
    [-1.95, 0.75],
    [-1.84, 0.82],
    [-1.65, 0.84],
    [1.65, 0.84],
    [1.84, 0.8],
    [1.95, 0.72],
  ],
  cabina: {
    cortes: [
      { x: -1.9, costado: 'pilar' },
      { x: -1.62, costado: 'pilar' },
      { x: -1.28, costado: 'luna' },
      { x: -0.52, costado: 'pilarB' },
      { x: -0.42, costado: 'luna' },
      { x: 0.02, costado: 'pilar' },
      { x: 0.78, costado: 'pilar' },
    ],
    parabrisas: 0.02,
    techoAtras: -1.62,
    techo: 1.45,
    medioTecho: 0.64,
    cerrada: false,
    base: 'hombro',
  },
  faro: { y: 0.64, z: 0.5, medioAlto: 0.045, medioAncho: 0.1 },
  piloto: { y0: 0.82, y1: 0.895, medioAncho: 0.64 },
  matricula: [0.46, 0.6],
};

const FAMILIAR: Forma = {
  ...BERLINA,
  tapa: [
    [-2.225, 0.92],
    [-2.16, 0.985],
    [-2.0, 0.995],
    [-1.45, 1.0],
    [0.95, 0.975],
    [1.55, 0.9],
    [2.0, 0.82],
    [2.16, 0.77],
    [2.225, 0.72],
  ],
  cabina: {
    cortes: [
      { x: -2.14, costado: 'pilar' },
      { x: -1.98, costado: 'luna' },
      { x: -1.4, costado: 'pilar' },
      { x: -1.28, costado: 'luna' },
      { x: -0.17, costado: 'pilarB' },
      { x: -0.07, costado: 'luna' },
      { x: 0.18, costado: 'pilar' },
      { x: 0.95, costado: 'pilar' },
    ],
    parabrisas: 0.18,
    techoAtras: -1.98,
    techo: 1.43,
    medioTecho: 0.65,
    cerrada: false,
    base: 'hombro',
  },
  piloto: { y0: 0.8, y1: 0.875, medioAncho: 0.64 },
};

const FURGONETA: Forma = {
  largo: 4.45,
  ejes: [-1.4, 1.42],
  estribo: 0.3,
  fondo: [
    [-2.225, 0.42],
    [-2.05, 0.32],
    [-1.85, 0.3],
    [1.9, 0.3],
    [2.1, 0.33],
    [2.225, 0.42],
  ],
  tapa: [
    [-2.225, 1.04],
    [-2.2, 1.06],
    [1.3, 1.06],
    [1.65, 1.0],
    [2.0, 0.92],
    [2.16, 0.86],
    [2.225, 0.8],
  ],
  ancho: [
    [-2.225, 0.8],
    [-2.17, 0.85],
    [-2.0, 0.86],
    [1.95, 0.86],
    [2.13, 0.82],
    [2.225, 0.74],
  ],
  cabina: {
    cortes: [
      { x: -2.19, costado: 'panel' },
      { x: 0.23, costado: 'pilarB' },
      { x: 0.33, costado: 'luna' },
      { x: 0.72, costado: 'pilar' },
      { x: 1.3, costado: 'pilar' },
    ],
    parabrisas: 0.72,
    techoAtras: -2.19,
    techo: 1.84,
    medioTecho: 0.8,
    cerrada: true,
    base: 'cintura',
  },
  faro: { y: 0.7, z: 0.52, medioAlto: 0.05, medioAncho: 0.11 },
  piloto: { y0: 0.9, y1: 0.975, medioAncho: 0.7 },
  matricula: [0.48, 0.62],
};

export const FORMA_DE_LA_CARROCERIA: Readonly<Record<Carroceria, Forma>> = {
  compacto: COMPACTO,
  berlina: BERLINA,
  familiar: FAMILIAR,
  furgoneta: FURGONETA,
  taxi: BERLINA,
};

/* ═══════════════════════════════ LOS COLORES Y LOS ACABADOS ═══════════════════════════════ */

type Rgb = readonly [number, number, number];

/*
 * Las pinturas de los turismos. Las oscuras (el azul noche, el negro y el verde) van un punto por encima de su
 * tono de catálogo: con el costado en sombra, de madrugada y en N0 (sin familias ni luces reales), el negro de
 * 0x1c1d1f y el azul de 0x243150 salían a 1-4 de 255 y el coche se leía como un agujero.
 */
const PINTURAS: readonly number[] = [0x2c3c62, 0x9a9ea3, 0x2a2c2f, 0x5a1519, 0x31563f, 0x6d7278, 0xc4c7c9, 0x35507a, 0x7a5634, 0x8a1c1c];
/* La furgoneta: blanca o de un azul pizarra (era 0x2d3440, que de noche no se distinguía de su sombra). */
const FURGONETA_BLANCA = 0xc9cbcc;
const FURGONETA_AZUL = 0x3f4d63;

/* El plástico negro y la goma, del gris oscuro de verdad (un albedo del 1-2 %): más negros, de noche eran negro puro. */
const NEGRO: Rgb = lineal(0x202224);
const GOMA: Rgb = lineal(0x1d1d1d);
const LLANTA: Rgb = lineal(0x6f7275);
const CUBO: Rgb = lineal(0x26282a);
/*
 * La cara de la rueda de g1 (N0 y N1): un TAPACUBOS gris claro, pintado y sin metal. Con la llanta de metal 0,6 la
 * difusa se quedaba en un 40 % del albedo y, de madrugada en N0, la rueda salía a 13-16 de 255 con el costado a 3.
 */
const LLANTA_DE_LEJOS: Rgb = lineal(0xb4b8bc);
/* La luna oscura de g1-g2: un gris azulado (lo de dentro, en sombra); más negro, de noche salía negro puro. */
const VIDRIO: Rgb = lineal(0x20262c);
/* El interior, en sombra: más claro, al alba los asientos se leían como cajas sueltas detrás del parabrisas. */
const DENTRO: Rgb = lineal(0x0f0f10);
/* La tapicería de los asientos, un punto más clara que la tina y la mampara: su silueta se lee contra ellas. */
const ASIENTO: Rgb = lineal(0x27282c);
const HUECO: Rgb = lineal(0x060606);
const MATRICULA: Rgb = lineal(0xdedcd0);
const FRANJA_DEL_TAXI: Rgb = lineal(0x9a1a1a);

let familiasEnElMobiliario: boolean | null = null;

/**
 * ¿Reparte ya el material del mobiliario las familias de la materia? Sí, si su fábrica le pone el retoque
 * `materia-nN` (ver la cabecera: la transición de la ola 2). Se mira una vez, con el nivel 1.
 */
export function elMobiliarioLeeFamilias(): boolean {
  if (familiasEnElMobiliario === null) {
    const m = materialDelMobiliario(1);
    familiasEnElMobiliario = llevaElRetoque(m, nombreDeLaMateria(1));
    m.dispose();
  }
  return familiasEnElMobiliario;
}

/**
 * EL ACABADO DE UNA PIEZA DE VEHÍCULO: con su familia si el mobiliario las reparte, y `deSiempre` (rugosidad y
 * metal a pelo, como la tabla `ACABADO`) si no. Lo usan los coches, el tren y el viaducto.
 */
export function acabadoDeVehiculo(
  familia: NumeroDeFamilia,
  rugosidad: number,
  metal: number,
  marcas: MarcasDelAcabado = {},
  deSiempre: readonly [number, number] = [rugosidad, metal],
): readonly [number, number] {
  return elMobiliarioLeeFamilias() ? acabado(familia, rugosidad, metal, marcas) : [Math.min(deSiempre[0], 0.999), Math.min(deSiempre[1], 0.999)];
}

interface AcabadosDelCoche {
  readonly pintura: readonly [number, number];
  readonly vidrio: readonly [number, number];
  readonly plastico: readonly [number, number];
  readonly goma: readonly [number, number];
  readonly llanta: readonly [number, number];
  readonly tapacubos: readonly [number, number];
  readonly dentro: readonly [number, number];
  readonly matricula: readonly [number, number];
}

/** Los acabados de un coche (se piden al escribir, por la transición: ver `acabadoDeVehiculo`). */
function acabadosDelCoche(): AcabadosDelCoche {
  return {
    /* La pintura con barniz: la capa de color algo rugosa y el lóbulo del barniz encima (la familia). */
    pintura: acabadoDeVehiculo(FAMILIA.carroceria, 0.42, 0.08, { barniz: true }, ACABADO.chapa),
    /* La luna oscura de g1-g2: lisa (más de 0,03, que sería agua) y sin metal. */
    vidrio: [0.09, 0],
    plastico: [0.62, 0],
    goma: acabadoDeVehiculo(FAMILIA.caucho, 0.88, 0, {}, ACABADO.caucho),
    llanta: acabadoDeVehiculo(FAMILIA.llanta, 0.35, 0.6),
    /* El tapacubos de g1: plástico pintado (la familia `llanta` no pinta nada en N0 ni en N1, donde va g1). */
    tapacubos: acabadoDeVehiculo(FAMILIA.llanta, 0.45, 0),
    dentro: [0.85, 0],
    matricula: acabadoDeVehiculo(FAMILIA.llanta, 0.4, 0),
  };
}

/* ═══════════════════════════════ LA PLUMA: ESCRIBIR EN SU SITIO ═══════════════════════════════ */

/** La colocación de un coche, en números: sin objetos por vértice. */
interface Colocacion {
  readonly p: Float64Array;
  readonly n: Float64Array;
}

function colocacion(m: THREE.Matrix4): Colocacion {
  const e = m.elements;
  const q = new THREE.Matrix3().getNormalMatrix(m).elements;
  return { p: Float64Array.from(e), n: Float64Array.from(q) };
}

/** Con qué se pinta una cara: su molde, dónde está el coche, su color y su acabado (o su emisor). */
interface Pincel {
  readonly m: Molde;
  readonly t: Colocacion;
  readonly color?: Rgb;
  readonly acabado?: readonly [number, number];
  readonly emisor?: readonly [number, number];
  /** La chapa: se ensucia por abajo (el polvo y el barro que salpican las ruedas), en el color de cada vértice. */
  readonly sucia?: boolean;
}

function mojar(p: Pincel): void {
  if (p.color !== undefined) p.m.color(p.color[0], p.color[1], p.color[2]);
  if (p.acabado !== undefined) p.m.poner('aAcabado', p.acabado[0], p.acabado[1]);
  if (p.emisor !== undefined) p.m.poner('aEmisor', p.emisor[0], p.emisor[1]);
}

/** El color del polvo y del barro seco de abajo. */
const POLVO: Rgb = lineal(0x3a342b);

/**
 * LA SUCIEDAD BAJA, en el color de los vértices: de 0,6 m para abajo la chapa se va al color del polvo, hasta un
 * 35 % en el estribo. No le cuesta nada al sombreador (la familia `carroceria` lo paga todo el mobiliario) y se ve
 * también en N0.
 */
function ensuciar(p: Pincel, y: number): void {
  if (p.sucia !== true || p.color === undefined) return;
  const t = Math.min(1, Math.max(0, (y - 0.26) / (0.62 - 0.26)));
  const f = 0.35 * (1 - t * t * (3 - 2 * t));
  const c = p.color;
  p.m.color(c[0] + (POLVO[0] - c[0]) * f, c[1] + (POLVO[1] - c[1]) * f, c[2] + (POLVO[2] - c[2]) * f);
}

/** Un vértice en el sitio del coche (posición y normal colocadas; la UV, tal cual). */
function V(p: Pincel, x: number, y: number, z: number, nx: number, ny: number, nz: number, u: number, w: number): number {
  ensuciar(p, y);
  const e = p.t.p;
  const q = p.t.n;
  const X = (e[0] as number) * x + (e[4] as number) * y + (e[8] as number) * z + (e[12] as number);
  const Y = (e[1] as number) * x + (e[5] as number) * y + (e[9] as number) * z + (e[13] as number);
  const Z = (e[2] as number) * x + (e[6] as number) * y + (e[10] as number) * z + (e[14] as number);
  let a = (q[0] as number) * nx + (q[3] as number) * ny + (q[6] as number) * nz;
  let b = (q[1] as number) * nx + (q[4] as number) * ny + (q[7] as number) * nz;
  let c = (q[2] as number) * nx + (q[5] as number) * ny + (q[8] as number) * nz;
  const l = Math.hypot(a, b, c) || 1;
  a /= l;
  b /= l;
  c /= l;
  return p.m.vertice(X, Y, Z, a, b, c, u, w);
}

/* ═══════════════════════════════ LA GEOMETRÍA ═══════════════════════════════ */

/** Interpolación lineal en una lista de (x, valor) ordenada por x (fuera, el extremo). */
function enLaLinea(p: readonly P2[], x: number): number {
  const primero = p[0] as P2;
  if (x <= primero[0]) return primero[1];
  for (let i = 1; i < p.length; i++) {
    const b = p[i] as P2;
    if (x <= b[0]) {
      const a = p[i - 1] as P2;
      const t = (x - a[0]) / Math.max(b[0] - a[0], 1e-9);
      return a[1] + (b[1] - a[1]) * t;
    }
  }
  return (p[p.length - 1] as P2)[1];
}

/** Una estación del loft: su x y su anillo (puntos (z, y), antihorario visto con z a la derecha). */
interface Estacion {
  readonly x: number;
  readonly anillo: readonly P2[];
}

const COS_SUAVE_A_LO_LARGO = Math.cos((55 * Math.PI) / 180);
const COS_SUAVE_EN_EL_ANILLO = Math.cos((62 * Math.PI) / 180);

/**
 * EL LOFT DEL COCHE: las estaciones cosidas punto a punto, cara a cara con su pincel (`pintar(banda, arista)`,
 * o `null` para no escribirla), con las normales suaves donde las caras se tuercen poco, y la UV de la
 * cabecera: (x, altura) en lo que mira de lado y (x, z) en lo que mira arriba o abajo, más 10 por el número
 * de carrocería. Los triángulos y su sentido, como `Molde.seccionado` (a, d, c y a, c, b): la materia a la
 * izquierda del anillo. `tapas`: la de la primera estación (mira a −x) y la de la última (+x). Cede cuando ha
 * escrito `ceder` triángulos desde la última vez (0: nunca).
 */
function* loft(
  estaciones: readonly Estacion[],
  pintar: (banda: number, arista: number) => Pincel | null,
  o: {
    readonly cerrado: boolean;
    readonly carroceria: number;
    readonly tapas?: { readonly inicio?: Pincel | null; readonly fin?: Pincel | null };
    readonly ceder?: number;
  },
): Generator<void, void, void> {
  const ns = estaciones.length;
  const np = (estaciones[0] as Estacion).anillo.length;
  const aristas = o.cerrado ? np : np - 1;
  const bandas = ns - 1;
  const desfase = 10 * o.carroceria;
  const P = (s: number, k: number): V3 => {
    const e = estaciones[s] as Estacion;
    const q = e.anillo[((k % np) + np) % np] as P2;
    return [e.x, q[1], q[0]];
  };
  /* La normal de cada cara (sin normalizar: pesa por su área). */
  const nf = new Float64Array(bandas * aristas * 3);
  for (let s = 0; s < bandas; s++) {
    for (let k = 0; k < aristas; k++) {
      const a = P(s, k);
      const b = P(s, k + 1);
      const c = P(s + 1, k + 1);
      const d = P(s + 1, k);
      /* (d − a) × (c − a) + (c − a) × (b − a), como `Molde.seccionado`. */
      const ux = d[0] - a[0];
      const uy = d[1] - a[1];
      const uz = d[2] - a[2];
      const wx = c[0] - a[0];
      const wy = c[1] - a[1];
      const wz = c[2] - a[2];
      const vx = b[0] - a[0];
      const vy = b[1] - a[1];
      const vz = b[2] - a[2];
      const i = (s * aristas + k) * 3;
      nf[i] = uy * wz - uz * wy + (wy * vz - wz * vy);
      nf[i + 1] = uz * wx - ux * wz + (wz * vx - wx * vz);
      nf[i + 2] = ux * wy - uy * wx + (wx * vy - wy * vx);
    }
  }
  const na = [0, 0, 0];
  const nb = [0, 0, 0];
  const unidad = (s: number, k: number, salida: number[]): boolean => {
    const i = (s * aristas + k) * 3;
    const x = nf[i] as number;
    const y = nf[i + 1] as number;
    const z = nf[i + 2] as number;
    const l = Math.hypot(x, y, z);
    if (l < 1e-12) return false;
    salida[0] = x / l;
    salida[1] = y / l;
    salida[2] = z / l;
    return true;
  };
  const casan = (s0: number, k0: number, s1: number, k1: number, cosMin: number): boolean =>
    unidad(s0, k0, na) && unidad(s1, k1, nb) && (na[0] as number) * (nb[0] as number) + (na[1] as number) * (nb[1] as number) + (na[2] as number) * (nb[2] as number) >= cosMin;
  const arista = (k: number): number => (o.cerrado ? ((k % aristas) + aristas) % aristas : k);
  const hayArista = (k: number): boolean => o.cerrado || (k >= 0 && k < aristas);
  /* ¿Se suaviza en el punto p del anillo entre las aristas p−1 y p de la banda s? */
  const suaveEnElAnillo = (s: number, p: number): boolean => hayArista(p - 1) && hayArista(p) && casan(s, arista(p - 1), s, arista(p), COS_SUAVE_EN_EL_ANILLO);
  /* ¿Se suaviza en la estación S entre las bandas S−1 y S de la arista k? */
  const suaveALoLargo = (S: number, k: number): boolean => S > 0 && S < bandas && casan(S - 1, k, S, k, COS_SUAVE_A_LO_LARGO);
  const suma = [0, 0, 0];
  const sumar = (s: number, k: number): void => {
    const i = (s * aristas + k) * 3;
    suma[0] = (suma[0] as number) + (nf[i] as number);
    suma[1] = (suma[1] as number) + (nf[i + 1] as number);
    suma[2] = (suma[2] as number) + (nf[i + 2] as number);
  };
  /* La normal de la esquina (estación S, punto p) de la cara (banda s, arista k). */
  const esquina = (s: number, k: number, S: number, p: number, n: number[]): void => {
    suma[0] = 0;
    suma[1] = 0;
    suma[2] = 0;
    sumar(s, k);
    const otraBanda = S === s ? s - 1 : s + 1;
    const conBanda = otraBanda >= 0 && otraBanda < bandas && suaveALoLargo(S, k);
    const otraArista = p === k ? k - 1 : k + 1;
    const conArista = hayArista(otraArista) && suaveEnElAnillo(s, p);
    if (conBanda) sumar(otraBanda, k);
    if (conArista) sumar(s, arista(otraArista));
    if (conBanda && conArista && suaveALoLargo(S, arista(otraArista)) && suaveEnElAnillo(otraBanda, p)) sumar(otraBanda, arista(otraArista));
    const l = Math.hypot(suma[0] as number, suma[1] as number, suma[2] as number) || 1;
    n[0] = (suma[0] as number) / l;
    n[1] = (suma[1] as number) / l;
    n[2] = (suma[2] as number) / l;
  };
  const ceder = o.ceder ?? 0;
  let escritos = 0;
  const cara = [0, 0, 0];
  const n = [0, 0, 0];
  for (let s = 0; s < bandas; s++) {
    for (let k = 0; k < aristas; k++) {
      const pincel = pintar(s, k);
      if (pincel === null) continue;
      const kk = k + 1;
      const a = P(s, k);
      const b = P(s, kk);
      const c = P(s + 1, kk);
      const d = P(s + 1, k);
      const abajoNula = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) < 1e-6;
      const arribaNula = Math.hypot(c[0] - d[0], c[1] - d[1], c[2] - d[2]) < 1e-6;
      if (abajoNula && arribaNula) continue;
      if (!unidad(s, k, cara)) continue;
      const deLado = Math.abs(cara[1] as number) < 0.6;
      mojar(pincel);
      const vertice = (q: V3, S: number, p: number): number => {
        esquina(s, k, S, p, n);
        return V(pincel, q[0], q[1], q[2], n[0] as number, n[1] as number, n[2] as number, q[0], (deLado ? q[1] : q[2]) + desfase);
      };
      const ia = vertice(a, s, k);
      const id = vertice(d, s + 1, k);
      if (abajoNula) {
        pincel.m.tri(ia, id, vertice(c, s + 1, kk));
        escritos += 1;
      } else if (arribaNula) {
        pincel.m.tri(ia, id, vertice(b, s, kk));
        escritos += 1;
      } else {
        const ic = vertice(c, s + 1, kk);
        const ib = vertice(b, s, kk);
        pincel.m.tri(ia, id, ic);
        pincel.m.tri(ia, ic, ib);
        escritos += 2;
      }
    }
    if (ceder > 0 && escritos >= ceder && s < bandas - 1) {
      escritos = 0;
      yield;
    }
  }
  for (const [s, haciaMas] of [
    [0, false],
    [ns - 1, true],
  ] as const) {
    const pincel = haciaMas ? o.tapas?.fin : o.tapas?.inicio;
    if (pincel === undefined || pincel === null) continue;
    const e = estaciones[s] as Estacion;
    tapaDelAnillo(pincel, e.x, e.anillo, haciaMas, desfase);
  }
}

/**
 * La TAPA de un anillo en x, mirando a +x (`haciaMas`) o a −x, triangulada. En (z, y) antihorario un triángulo
 * mira a −x (como en `Molde.seccionado`). UV: (z, altura + desfase).
 */
function tapaDelAnillo(pincel: Pincel, x: number, anillo: readonly P2[], haciaMas: boolean, desfase: number): void {
  const tris = THREE.ShapeUtils.triangulateShape(
    anillo.map(([z, y]) => new THREE.Vector2(z, y)),
    [],
  );
  if (tris.length === 0) return;
  mojar(pincel);
  const nx = haciaMas ? 1 : -1;
  const indices = anillo.map(([z, y]) => V(pincel, x, y, z, nx, 0, 0, z, y + desfase));
  for (const t of tris) {
    const [i, j, k] = t as [number, number, number];
    const pi = anillo[i] as P2;
    const pj = anillo[j] as P2;
    const pk = anillo[k] as P2;
    const antihorario = (pj[0] - pi[0]) * (pk[1] - pi[1]) - (pj[1] - pi[1]) * (pk[0] - pi[0]) >= 0;
    /* Antihorario mira a −x: la tapa de atrás lo toma así y la de delante, al revés. */
    if (antihorario !== haciaMas) pincel.m.tri(indices[i] as number, indices[j] as number, indices[k] as number);
    else pincel.m.tri(indices[i] as number, indices[k] as number, indices[j] as number);
  }
}

/**
 * Un CUADRILÁTERO en el sitio del coche con la UV del cuerpo (ver la cabecera): esquinas en sentido antihorario
 * vistas desde `n`.
 */
function cuadro(p: Pincel, a: V3, b: V3, c: V3, d: V3, n: V3, desfase: number): void {
  mojar(p);
  const lado = Math.abs(n[1]) < 0.6;
  const q = (v: V3): number => V(p, v[0], v[1], v[2], n[0], n[1], n[2], v[0], (lado ? v[1] : v[2]) + desfase);
  const ia = q(a);
  const ib = q(b);
  const ic = q(c);
  const id = q(d);
  p.m.tri(ia, ib, ic);
  p.m.tri(ia, ic, id);
}

/** Una CAJA con la UV del cuerpo; `caras` como en `Molde.caja` (n s e o arriba abajo). */
function caja(p: Pincel, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, caras: string, desfase: number): void {
  if (caras.includes('n')) cuadro(p, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], desfase);
  if (caras.includes('s')) cuadro(p, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], desfase);
  if (caras.includes('e')) cuadro(p, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], desfase);
  if (caras.includes('o')) cuadro(p, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], desfase);
  if (caras.includes('a')) cuadro(p, [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], desfase);
  if (caras.includes('b')) cuadro(p, [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], desfase);
}

/* ═══════════════════════════════ EL CUERPO ═══════════════════════════════ */

/** Los pasos de rueda por grado: tramos del arco y su radio (el polígono deja fuera la rueda de 0,31 con 3 cm). */
const PASO_POR_GRADO: Readonly<Record<GradoDelCoche, { readonly tramos: number; readonly radio: number }>> = {
  1: { tramos: 3, radio: 0.4 },
  2: { tramos: 4, radio: 0.375 },
  3: { tramos: 7, radio: 0.355 },
  4: { tramos: 11, radio: 0.35 },
};

/** Los lados de la rueda por grado. */
export const LADOS_DE_LA_RUEDA_POR_GRADO: Readonly<Record<GradoDelCoche, number>> = { 1: 6, 2: 8, 3: 12, 4: 16 };

/** El radio de la rueda, que es también la altura de su centro. */
export const RADIO_DE_LA_RUEDA = 0.31;
const MEDIO_NEUMATICO = 0.1;
const RADIO_DE_LA_LLANTA = 0.205;
/** Lo que baja la cintura desde la tapa: el hombro que redondea el costado hacia arriba. */
const HOMBRO = 0.1;
/** Lo que baja el piso del habitáculo (g3+) desde la boca de la cabina: queda por encima de los pasos de rueda. */
const HONDO_DEL_HABITACULO = 0.32;

/** Los vértices del polígono de un paso (de delante a atrás, por arriba): (x, y). */
function verticesDelPaso(f: Forma, grado: GradoDelCoche, eje: number): P2[] {
  const paso = PASO_POR_GRADO[grado];
  const phi0 = Math.asin((f.estribo - RADIO_DE_LA_RUEDA) / paso.radio);
  const salida: P2[] = [];
  for (let i = 0; i <= paso.tramos; i++) {
    const phi = phi0 + (i * (Math.PI - 2 * phi0)) / paso.tramos;
    salida.push([eje + paso.radio * Math.cos(phi), RADIO_DE_LA_RUEDA + paso.radio * Math.sin(phi)]);
  }
  return salida;
}

/**
 * Las x del cuerpo en un grado: puntas, esquinas, los vértices de los pasos y los dos extremos de la cabina.
 * Dos que caen a menos de 3 cm se juntan, y manda la de más peso: la de un paso (el arco no se deforma), luego
 * la de la cabina. Devuelve también dónde quedan los extremos de la cabina (la cabina se apoya en ellos).
 */
function xsDelCuerpo(f: Forma, grado: GradoDelCoche): { xs: number[]; cabina0: number; cabina1: number } {
  const medio = f.largo / 2;
  const candidatas: { x: number; peso: number; sola?: boolean }[] = [
    { x: -medio, peso: 3 },
    { x: medio, peso: 3 },
  ];
  if (grado >= 2) candidatas.push({ x: -medio + 0.11, peso: 0 }, { x: medio - 0.11, peso: 0 });
  if (grado >= 3) candidatas.push({ x: -medio + 0.035, peso: 0 }, { x: medio - 0.035, peso: 0 });
  if (grado >= 4) candidatas.push({ x: -medio + 0.27, peso: 0 }, { x: medio - 0.27, peso: 0 });
  for (const eje of f.ejes) for (const [x] of verticesDelPaso(f, grado, eje)) candidatas.push({ x, peso: 2 });
  const cortes = f.cabina.cortes;
  const c0 = (cortes[0] as CorteDeLaCabina).x;
  const c1 = (cortes[cortes.length - 1] as CorteDeLaCabina).x;
  /* La trasera de una cabina cerrada (la furgoneta) no se junta con nada: su tapa y la de la punta quedarían en el mismo plano. */
  candidatas.push({ x: c0, peso: 1, sola: f.cabina.cerrada }, { x: c1, peso: 1 });
  if (grado >= 4) {
    for (const p of f.tapa) candidatas.push({ x: p[0], peso: 0 });
    for (let x = -medio + 0.3; x < medio - 0.3; x += 0.32) candidatas.push({ x, peso: 0 });
  }
  candidatas.sort((a, b) => a.x - b.x);
  /* En g1 se junta hasta 6 cm (la base de la luna o del parabrisas corrida 5 cm no se ve, y una sección menos sí se cuenta). */
  const junta = grado === 1 ? 0.06 : 0.03;
  const grupos: { x: number; peso: number; de: number[]; sola: boolean }[] = [];
  for (const c of candidatas) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo !== undefined && c.x - ultimo.x < junta && !(c.sola === true || ultimo.sola)) {
      ultimo.de.push(c.x);
      if (c.peso > ultimo.peso) {
        ultimo.x = c.x;
        ultimo.peso = c.peso;
      }
      continue;
    }
    grupos.push({ x: c.x, peso: c.peso, de: [c.x], sola: c.sola === true });
  }
  const dondeQueda = (x: number): number => (grupos.find((g) => g.de.includes(x)) ?? { x }).x;
  return { xs: grupos.map((g) => g.x), cabina0: dondeQueda(c0), cabina1: dondeQueda(c1) };
}

/** El canto de abajo del costado en x: el polígono de un paso si cae en uno, o el fondo. */
function fondoEn(f: Forma, grado: GradoDelCoche, x: number): number {
  for (const eje of f.ejes) {
    const v = verticesDelPaso(f, grado, eje);
    const delante = (v[0] as P2)[0];
    const detras = (v[v.length - 1] as P2)[0];
    if (x >= delante || x <= detras) continue;
    for (let i = 0; i + 1 < v.length; i++) {
      const a = v[i] as P2;
      const b = v[i + 1] as P2;
      if (x <= a[0] && x >= b[0]) return a[1] + ((b[1] - a[1]) * (a[0] - x)) / Math.max(a[0] - b[0], 1e-9);
    }
  }
  return enLaLinea(f.fondo, x);
}

/** Lo que el anillo del cuerpo necesita en una x: medio ancho, fondo, cintura y tapa. */
interface Seccion {
  readonly w: number;
  readonly abajo: number;
  readonly cintura: number;
  readonly tapa: number;
}

function seccionEn(f: Forma, grado: GradoDelCoche, x: number): Seccion {
  const tapa = enLaLinea(f.tapa, x);
  return { w: enLaLinea(f.ancho, x), abajo: fondoEn(f, grado, x), cintura: tapa - HOMBRO, tapa };
}

/** El costado derecho del anillo de un grado, de abajo arriba: (factor del medio ancho, alto de 0 a 1 hasta la cintura, o de 1 a 2 en el hombro). */
const COSTADO_POR_GRADO: Readonly<Record<GradoDelCoche, readonly (readonly [number, number])[]>> = {
  1: [
    [0.955, 0],
    [0.975, 1],
    [0.84, 2],
  ],
  2: [
    [0.955, 0],
    [1, 0.47],
    [0.975, 1],
    [0.84, 2],
  ],
  3: [
    [0.955, 0],
    [0.99, 0.22],
    [1, 0.47],
    [0.975, 1],
    [0.84, 2],
  ],
  4: [
    [0.955, 0],
    [0.978, 0.1],
    [0.992, 0.24],
    [1, 0.47],
    [0.994, 0.74],
    [0.975, 1],
    [0.95, 1.4],
    [0.905, 1.72],
    [0.84, 2],
  ],
};

/** El índice (en el anillo) de la cintura y del canto del hombro, del lado derecho. */
function indicesDelHombro(grado: GradoDelCoche): { cintura: number; canto: number } {
  const c = COSTADO_POR_GRADO[grado];
  return { cintura: c.findIndex(([, t]) => t === 1), canto: c.length - 1 };
}

/**
 * EL ANILLO DEL CUERPO en una sección, abierto por abajo (el fondo del coche no lo ve ninguna cámara: todas
 * van por encima del estribo), de estribo derecho a estribo izquierdo pasando por el hombro y la tapa, con el
 * lomo de la tapa desde g3.
 */
function anilloDelCuerpo(s: Seccion, grado: GradoDelCoche): P2[] {
  const lado: P2[] = COSTADO_POR_GRADO[grado].map(([k, t]): P2 => [s.w * k, t <= 1 ? s.abajo + (s.cintura - s.abajo) * t : s.cintura + (s.tapa - s.cintura) * (t - 1)]);
  const lomo: P2[] = grado >= 4 ? [[s.w * 0.42, s.tapa + 0.008], [-s.w * 0.42, s.tapa + 0.008]] : grado >= 3 ? [[0, s.tapa + 0.01]] : [];
  const izquierdo = [...lado].reverse().map(([z, y]): P2 => [-z, y]);
  return [...lado, ...lomo, ...izquierdo];
}

/**
 * El medio ancho de la chapa del costado en (x, y), en un grado: donde van pegadas la franja del taxi y las
 * manillas (interpolando el costado del anillo de la sección de x).
 */
function costadoEn(f: Forma, grado: GradoDelCoche, x: number, y: number): number {
  const anillo = anilloDelCuerpo(seccionEn(f, grado, x), grado);
  const n = COSTADO_POR_GRADO[grado].length;
  let z = (anillo[0] as P2)[0];
  for (let i = 0; i + 1 < n; i++) {
    const a = anillo[i] as P2;
    const b = anillo[i + 1] as P2;
    if (y >= a[1] && y <= b[1]) return a[0] + ((b[0] - a[0]) * (y - a[1])) / Math.max(b[1] - a[1], 1e-9);
    if (y > b[1]) z = b[0];
  }
  return z;
}

/* ═══════════════════════════════ EL COCHE ═══════════════════════════════ */

/** Los tres moldes donde se escribe un coche. */
export interface MoldesDelCoche {
  readonly mobiliario: Molde;
  readonly cristal: Molde;
  readonly emisivo: Molde;
}

/** El ángulo que lleva el +x local (el morro) a mirar hacia `o`. */
function anguloDelMorro(o: Orientacion): number {
  return o === 'e' ? 0 : o === 'o' ? Math.PI : o === 'n' ? Math.PI / 2 : -Math.PI / 2;
}

/** La matriz que pone un coche en su caja, con el morro hacia donde mira. */
export function matrizDelCoche(c: CocheDelPlano): THREE.Matrix4 {
  const cx = (c.caja.x0 + c.caja.x1) / 2;
  const cz = (c.caja.z0 + c.caja.z1) / 2;
  return new THREE.Matrix4().makeRotationY(anguloDelMorro(c.mira)).setPosition(cx, 0, cz);
}

/** La pintura de un coche: el taxi blanco, la furgoneta blanca o azul pizarra, los demás de la lista. */
function pinturaDe(c: CocheDelPlano): Rgb {
  const h = azarEn(c.semilla, 3);
  if (c.tipo === 'taxi') return lineal(0xd8d9d6);
  if (c.tipo === 'furgoneta') return lineal(h < 0.6 ? FURGONETA_BLANCA : FURGONETA_AZUL);
  return lineal(PINTURAS[Math.floor(h * PINTURAS.length)] ?? 0x121314);
}

/** Dónde empieza el pilar B (el corte que lo lleva). */
function xDelPilarB(f: Forma): number {
  return (f.cabina.cortes.find((c) => c.costado === 'pilarB') ?? (f.cabina.cortes[1] as CorteDeLaCabina)).x;
}

/** La luz de «libre» del taxi, en el sitio del coche: la misma en todos los grados. */
export function luzDelTaxi(f: Forma): V3 {
  return [-0.26, f.cabina.techo + 0.06, 0];
}

/**
 * UN COCHE de un grado en sus tres moldes (ver la cabecera), colocado con `matriz` (por omisión,
 * `matrizDelCoche`). La luz de «libre» del taxi se apunta en `encendidos`. Cede donde el trozo lo pide.
 */
export function* escribirElCoche(
  m: MoldesDelCoche,
  c: CocheDelPlano,
  grado: GradoDelCoche,
  matriz: THREE.Matrix4 = matrizDelCoche(c),
  encendidos?: CocheEncendido[],
): Generator<void, void, void> {
  const carroceria = carroceriaDe(c);
  const f = FORMA_DE_LA_CARROCERIA[carroceria];
  const numero = NUMERO_DE_CARROCERIA[carroceria];
  const desfase = 10 * numero;
  const t = colocacion(matriz);
  const ac = acabadosDelCoche();
  const pintura: Pincel = { m: m.mobiliario, t, color: pinturaDe(c), acabado: ac.pintura, sucia: true };
  const negro: Pincel = { m: m.mobiliario, t, color: NEGRO, acabado: ac.plastico };
  const dentro: Pincel = { m: m.mobiliario, t, color: DENTRO, acabado: ac.dentro };
  const hueco: Pincel = { m: m.mobiliario, t, color: HUECO, acabado: ac.plastico };
  const vidrio: Pincel = grado >= 3 ? { m: m.cristal, t } : { m: m.mobiliario, t, color: VIDRIO, acabado: ac.vidrio };
  const medio = f.largo / 2;

  /* ─── El cuerpo ─── */
  const { xs, cabina0, cabina1 } = xsDelCuerpo(f, grado);
  const estaciones: Estacion[] = xs.map((x) => ({ x, anillo: anilloDelCuerpo(seccionEn(f, grado, x), grado) }));
  const np = (estaciones[0] as Estacion).anillo.length;
  const { cintura, canto } = indicesDelHombro(grado);
  /* Lo de arriba del anillo: del canto (o de la cintura, en la furgoneta) de un lado al del otro. */
  const primeraDeArriba = f.cabina.base === 'cintura' ? cintura : canto;
  const ultimaDeArriba = np - 2 - primeraDeArriba;
  /*
   * Bajo la cabina el cuerpo no tiene tapa: en g1-g2 la tapan las lunas opacas y en g3+ ese hueco es la boca de
   * la TINA del habitáculo (`cabina`), que baja por debajo de la cintura.
   */
  const bajoLaCabina = (s: number): boolean => {
    const xm = ((estaciones[s] as Estacion).x + (estaciones[s + 1] as Estacion).x) / 2;
    return xm > cabina0 && xm < cabina1;
  };
  yield* loft(
    estaciones,
    (s, k) => {
      if (k >= primeraDeArriba && k <= ultimaDeArriba && bajoLaCabina(s)) return null;
      return pintura;
    },
    /* En g4 el cuerpo (unos 1.500) cede una vez por la mitad. */
    { cerrado: false, carroceria: numero, tapas: { inicio: pintura, fin: pintura }, ceder: grado >= 4 ? 760 : 0 },
  );
  if (grado >= 4) yield;

  /* ─── Los bajos: 0,12-0,26 m, un centímetro por dentro del estribo (ver la cabecera) ─── */
  const pasoDetras = (verticesDelPaso(f, grado, f.ejes[0])[0] as P2)[0];
  const delDelante = verticesDelPaso(f, grado, f.ejes[1]);
  const pasoDelante = (delDelante[delDelante.length - 1] as P2)[0];
  const wBajos = enLaLinea(f.ancho, 0) * 0.955 - 0.01;
  /* El taxi de g1 no los lleva: su franja cuesta lo mismo y el tope es de 180. */
  if (!(grado === 1 && carroceria === 'taxi')) caja(negro, pasoDetras, 0.12, -wBajos, pasoDelante, 0.26, wBajos, grado === 1 ? 'ns' : 'nseo', desfase);

  /* ─── Las ruedas, y el hueco del paso (g2+): el techo oscuro por dentro del arco, para no ver el coche hueco ─── */
  for (const eje of f.ejes) {
    const zc = enLaLinea(f.ancho, eje) - 0.12;
    for (const lado of [-1, 1] as const) rueda({ m: m.mobiliario, t }, eje, lado * zc, lado, grado, ac);
    if (grado >= 2) {
      const v = verticesDelPaso(f, grado, eje);
      const zDentro = zc - MEDIO_NEUMATICO - 0.05;
      const w = enLaLinea(f.ancho, eje) * 0.955 - 0.004;
      /* Sin el primer tramo ni el último: los de abajo los tapa la rueda; el hueco que se ve es el de arriba. */
      for (let i = 1; i + 2 < v.length; i++) {
        const a = v[i] as P2;
        const b = v[i + 1] as P2;
        /* Un pelo por dentro del arco, mirando a su centro (abajo y hacia la rueda). */
        const ra = (q: P2): P2 => [eje + (q[0] - eje) * 0.992, RADIO_DE_LA_RUEDA + (q[1] - RADIO_DE_LA_RUEDA) * 0.992];
        const [xa, ya] = ra(a);
        const [xb, yb] = ra(b);
        const nx = eje - (xa + xb) / 2;
        const ny = RADIO_DE_LA_RUEDA - (ya + yb) / 2;
        const l = Math.hypot(nx, ny) || 1;
        const n: V3 = [nx / l, ny / l, 0];
        /* Antihorario visto desde abajo (desde el centro del arco): de a por dentro a a por fuera, y a b. */
        cuadro(hueco, [xa, ya, zDentro], [xa, ya, w], [xb, yb, w], [xb, yb, zDentro], n, desfase);
        cuadro(hueco, [xa, ya, -w], [xa, ya, -zDentro], [xb, yb, -zDentro], [xb, yb, -w], n, desfase);
      }
    }
  }
  /* En g4 las ruedas y la cabina van en el mismo paso (unos 750). */
  if (grado === 3) yield;

  /* ─── La cabina ─── */
  const bajo = xs.filter((x) => x >= cabina0 - 1e-9 && x <= cabina1 + 1e-9);
  yield* cabina(f, grado, { pintura, negro, dentro, vidrio, desfase, numero, cabina0, cabina1, bajo });
  if (grado >= 4) yield;

  /* ─── Lo de fuera: retrovisores, rejilla, matrículas, manillas, la librea del taxi ─── */
  const yCanto = enLaLinea(f.tapa, cabina1);
  const wCanto = enLaLinea(f.ancho, cabina1) * 0.84;
  if (grado >= 2) {
    /* Los retrovisores, plegados contra la ventanilla: dentro de ±0,86. */
    const x0 = cabina1 - (f.cabina.base === 'cintura' ? 0.3 : 0.27);
    const alto = f.cabina.base === 'cintura' ? 0.14 : 0.12;
    for (const lado of [-1, 1] as const) {
      const za = lado * (wCanto - 0.02);
      const zb = lado * 0.855;
      caja(pintura, x0, yCanto + 0.05, Math.min(za, zb), x0 + 0.17, yCanto + 0.05 + alto, Math.max(za, zb), lado > 0 ? 'seoab' : 'neoab', desfase);
      if (grado >= 4) {
        const zp = lado * (wCanto + 0.05);
        caja(negro, x0 + 0.05, yCanto + 0.004, Math.min(za, zp), x0 + 0.11, yCanto + 0.05, Math.max(za, zp), lado > 0 ? 'seo' : 'neo', desfase);
      }
    }
    /* La rejilla, entre los faros, un pelo fuera de la cara del morro. */
    const yR = f.faro.y;
    cuadro(negro, [medio + 0.008, yR - 0.075, 0.3], [medio + 0.008, yR - 0.075, -0.3], [medio + 0.008, yR + 0.03, -0.3], [medio + 0.008, yR + 0.03, 0.3], [1, 0, 0], desfase);
    if (grado >= 4) {
      for (let i = 0; i < 4; i++) {
        const y = yR - 0.062 + i * 0.026;
        caja(pintura, medio + 0.008, y, -0.29, medio + 0.02, y + 0.008, 0.29, 'eab', desfase);
      }
    }
    /* Las matrículas (la familia `llanta` escribe los caracteres desde N2): u = semilla + t, v = 10 + s. */
    matriculas({ m: m.mobiliario, t, color: MATRICULA, acabado: ac.matricula }, f, c);
  }
  if (grado >= 3) {
    /* Las manillas: una por puerta (la de delante y, si no es la furgoneta, la de atrás), cerca de su canto de atrás. */
    const xB = xDelPilarB(f);
    for (const x of f.cabina.cerrada ? [xB + 0.28] : [xB + 0.28, xB - 0.62]) {
      const y = enLaLinea(f.tapa, x) - HOMBRO - 0.06;
      for (const lado of [-1, 1] as const) {
        const z = lado * (costadoEn(f, grado, x, y) + 0.006);
        if (grado >= 4) {
          const z2 = z + lado * 0.014;
          caja(negro, x - 0.13, y - 0.018, Math.min(z, z2), x, y + 0.018, Math.max(z, z2), lado > 0 ? 'seoab' : 'neoab', desfase);
        } else if (lado > 0) cuadro(negro, [x - 0.13, y - 0.018, z], [x, y - 0.018, z], [x, y + 0.018, z], [x - 0.13, y + 0.018, z], [0, 0, 1], desfase);
        else cuadro(negro, [x, y - 0.018, z], [x - 0.13, y - 0.018, z], [x - 0.13, y + 0.018, z], [x, y + 0.018, z], [0, 0, -1], desfase);
      }
    }
  }
  if (carroceria === 'taxi') {
    /* La banda roja en diagonal de las puertas delanteras, pegada a la chapa de su grado. */
    const franja: Pincel = { m: m.mobiliario, t, color: FRANJA_DEL_TAXI, acabado: ac.pintura };
    /* Un paralelogramo de (0,05-0,35, 0,5) a (0,44-0,74, 0,84); desde g2 partido a la altura de la panza, que
       sobresale del plano de sus esquinas y lo tapaba por la mitad. */
    const y0 = 0.5;
    const y1 = 0.84;
    const alturas = grado >= 2 ? [y0, enLaLinea(f.tapa, 0.4) - HOMBRO - (enLaLinea(f.tapa, 0.4) - HOMBRO - f.estribo) * 0.53, y1] : [y0, y1];
    const borde = (y: number, derecho: boolean): number => (derecho ? 0.35 : 0.05) + ((y - y0) / (y1 - y0)) * 0.39;
    for (const lado of [-1, 1] as const) {
      for (let i = 0; i + 1 < alturas.length; i++) {
        const ya = alturas[i] as number;
        const yb = alturas[i + 1] as number;
        const q = (x: number, y: number): V3 => [x, y, lado * (costadoEn(f, grado, x, y) + 0.006)];
        const p0 = q(borde(ya, false), ya);
        const p1 = q(borde(ya, true), ya);
        const p2 = q(borde(yb, true), yb);
        const p3 = q(borde(yb, false), yb);
        if (lado > 0) cuadro(franja, p0, p1, p2, p3, [0, 0, 1], desfase);
        else cuadro(franja, p1, p0, p3, p2, [0, 0, -1], desfase);
      }
    }
  }

  /* ─── Lo emisivo: los faros (lentes que no alumbran), los pilotos en banda y el «libre» del taxi ─── */
  const lente: Pincel = { m: m.emisivo, t, color: [0.05, 0.055, 0.06], emisor: [4, 0] };
  const faro = f.faro;
  for (const lado of [-1, 1] as const) {
    const zc = lado * faro.z;
    const x = medio + 0.006;
    mojar(lente);
    /* Mirando a +x; la UV de 0 a 1 en la lente (u hacia fuera del coche en los dos lados). */
    const zi = zc - lado * faro.medioAncho;
    const zo = zc + lado * faro.medioAncho;
    const i0 = V(lente, x, faro.y - faro.medioAlto, zi, 1, 0, 0, 0, 0);
    const i1 = V(lente, x, faro.y - faro.medioAlto, zo, 1, 0, 0, 1, 0);
    const i2 = V(lente, x, faro.y + faro.medioAlto, zo, 1, 0, 0, 1, 1);
    const i3 = V(lente, x, faro.y + faro.medioAlto, zi, 1, 0, 0, 0, 1);
    if (lado < 0) {
      m.emisivo.tri(i0, i1, i2);
      m.emisivo.tri(i0, i2, i3);
    } else {
      m.emisivo.tri(i0, i2, i1);
      m.emisivo.tri(i0, i3, i2);
    }
  }
  {
    const p = f.piloto;
    const piloto: Pincel = { m: m.emisivo, t, color: [0.26, 0.012, 0.01], emisor: [0, 0] };
    const x = -medio - 0.006;
    cuadro(piloto, [x, p.y0, -p.medioAncho], [x, p.y0, p.medioAncho], [x, p.y1, p.medioAncho], [x, p.y1, -p.medioAncho], [-1, 0, 0], 0);
  }
  if (carroceria === 'taxi') {
    const [lx, ly] = luzDelTaxi(f);
    caja({ m: m.emisivo, t, color: [0.3, 3.2, 0.9], emisor: [0, 0] }, lx - 0.14, f.cabina.techo - 0.01, -0.14, lx + 0.14, ly + 0.04, 0.14, 'nseoa', 0);
    if (encendidos !== undefined) {
      const p = new THREE.Vector3(...luzDelTaxi(f)).applyMatrix4(matriz);
      encendidos.push({ x: p.x, y: p.y, z: p.z, color: [0.1, 1.0, 0.3] });
    }
  }
  yield;
}

/**
 * UNA RUEDA en (eje, 0,31, zc), con la cara de fuera hacia `lado`: el neumático sin tapa por dentro (en g1 de
 * seis caras enteras; desde g2 sin las de arriba, que tapa el paso) y la cara de fuera. En g1 el neumático es un
 * tronco de cono que se cierra hasta el radio de la llanta y la cara es la llanta, un polígono gris claro; desde
 * g2 el flanco del neumático es un anillo que se abomba y la llanta va un centímetro por dentro de su borde, con
 * el cubo oscuro; en g4, los cinco radios en bulto. La UV de la cara es el disco (cos, sin) · r, de radio 1 en el
 * canto del neumático: la familia `llanta` pinta por ella (desde N2, donde ya no hay g1).
 */
function rueda(p: { readonly m: Molde; readonly t: Colocacion }, eje: number, zc: number, lado: 1 | -1, grado: GradoDelCoche, ac: AcabadosDelCoche): void {
  const m = p.m;
  const n = LADOS_DE_LA_RUEDA_POR_GRADO[grado];
  const R = RADIO_DE_LA_RUEDA;
  const yc = R;
  const zFuera = zc + lado * MEDIO_NEUMATICO;
  const zDentro = zc - lado * MEDIO_NEUMATICO;
  /*
   * En g1 el hexágono se APOYA EN UNA CARA (girado medio lado) y su apotema es el radio: con el vértice abajo y el
   * neumático en cono (abajo), visto de frente la rueda acababa en una cuña que no tocaba el suelo por fuera.
   * `vertice` pasa del radio (la apotema) al de los vértices.
   */
  const giro = grado === 1 ? Math.PI / n : 0;
  const vertice = grado === 1 ? 1 / Math.cos(Math.PI / n) : 1;
  const ang = (k: number): number => -Math.PI / 2 + giro + (k * 2 * Math.PI) / n;
  const goma: Pincel = { ...p, color: GOMA, acabado: ac.goma };
  mojar(goma);
  /*
   * En g1 el neumático es un TRONCO DE CONO: de 0,31 por dentro al radio de la llanta en la cara. Visto de lado
   * es un anillo de goma oscura alrededor de la cara clara, sin un triángulo más (la cara pasa a ser sólo la
   * llanta). Con el prisma de antes la cara era toda la rueda, un hexágono gris sin goma alrededor, y de noche,
   * en N0, la rueda no se distinguía del costado en sombra. Desde g2 el prisma es recto: el flanco va aparte.
   */
  const rFuera = grado === 1 ? RADIO_DE_LA_LLANTA : R;
  const inclinacion = (R - rFuera) / (2 * MEDIO_NEUMATICO);
  const nCono = Math.hypot(1, inclinacion);
  const Rv = R * vertice;
  const rFueraV = rFuera * vertice;
  for (let k = 0; k < n; k++) {
    const a0 = ang(k);
    const a1 = ang(k + 1);
    const medio = (a0 + a1) / 2;
    if (grado >= 2 && Math.sin(medio) > Math.cos((50 * Math.PI) / 180)) continue;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    const nz = (lado * inclinacion) / nCono;
    const va = V(goma, eje + Rv * c0, yc + Rv * s0, zDentro, c0 / nCono, s0 / nCono, nz, a0 * R, zDentro);
    const vb = V(goma, eje + Rv * c1, yc + Rv * s1, zDentro, c1 / nCono, s1 / nCono, nz, a1 * R, zDentro);
    const vc = V(goma, eje + rFueraV * c1, yc + rFueraV * s1, zFuera, c1 / nCono, s1 / nCono, nz, a1 * R, zFuera);
    const vd = V(goma, eje + rFueraV * c0, yc + rFueraV * s0, zFuera, c0 / nCono, s0 / nCono, nz, a0 * R, zFuera);
    if (lado > 0) {
      m.tri(va, vb, vc);
      m.tri(va, vc, vd);
    } else {
      m.tri(va, vc, vb);
      m.tri(va, vd, vc);
    }
  }
  /* Un disco en z, mirando a `lado`: en abanico desde el centro (con su color) o, sin centro, un polígono. */
  const disco = (radio: number, z: number, colorCentro: Rgb, colorCanto: Rgb, radioUv: number, conCentro: boolean, acabado = ac.llanta): void => {
    const canto: Pincel = { ...p, color: colorCanto, acabado };
    mojar(canto);
    const idx: number[] = [];
    for (let k = 0; k < n; k++) {
      const a = ang(k);
      idx.push(V(canto, eje + radio * Math.cos(a), yc + radio * Math.sin(a), z, 0, 0, lado, Math.cos(a) * radioUv, Math.sin(a) * radioUv));
    }
    if (conCentro) {
      m.color(colorCentro[0], colorCentro[1], colorCentro[2]);
      const ic = V(canto, eje, yc, z, 0, 0, lado, 0, 0);
      for (let k = 0; k < n; k++) {
        const a = idx[k] as number;
        const b = idx[(k + 1) % n] as number;
        if (lado > 0) m.tri(ic, a, b);
        else m.tri(ic, b, a);
      }
    } else {
      for (let k = 1; k + 1 < n; k++) {
        const a = idx[0] as number;
        const b = idx[k] as number;
        const c = idx[k + 1] as number;
        if (lado > 0) m.tri(a, b, c);
        else m.tri(a, c, b);
      }
    }
  };
  if (grado === 1) {
    /*
     * La cara de g1 es la llanta entera (el cono de goma la rodea): el tapacubos gris claro, sin metal, con una
     * difusa de casi el 50 %, cuarenta veces la de la goma. g1 sólo se hornea en N0 y N1, donde la familia `llanta`
     * no pinta nada (N0 no reparte familias y en N1 se pliega): lo que se ve es este gris. La UV, la de g2.
     */
    disco(RADIO_DE_LA_LLANTA * vertice, zFuera, LLANTA_DE_LEJOS, LLANTA_DE_LEJOS, RADIO_DE_LA_LLANTA / R, false, ac.tapacubos);
    return;
  }
  /* El flanco: un anillo del canto de la llanta (en la cara) al del neumático (2,5 cm más dentro). */
  const rL = RADIO_DE_LA_LLANTA;
  const zFlanco = zFuera - lado * 0.025;
  const flanco: Pincel = { ...p, color: GOMA, acabado: ac.llanta };
  mojar(flanco);
  const nl = Math.hypot(0.35, 1);
  const dentroA: number[] = [];
  const fueraA: number[] = [];
  for (let k = 0; k <= n; k++) {
    const a = ang(k);
    const c = Math.cos(a);
    const s = Math.sin(a);
    dentroA.push(V(flanco, eje + rL * c, yc + rL * s, zFuera, (0.35 * c) / nl, (0.35 * s) / nl, lado / nl, c * (rL / R), s * (rL / R)));
    fueraA.push(V(flanco, eje + R * c, yc + R * s, zFlanco, (0.35 * c) / nl, (0.35 * s) / nl, lado / nl, c, s));
  }
  for (let k = 0; k < n; k++) {
    const a = dentroA[k] as number;
    const b = dentroA[k + 1] as number;
    const c = fueraA[k + 1] as number;
    const d = fueraA[k] as number;
    if (lado > 0) {
      m.tri(a, d, c);
      m.tri(a, c, b);
    } else {
      m.tri(a, c, d);
      m.tri(a, b, c);
    }
  }
  /* La llanta, un centímetro por dentro del borde del flanco, con el cubo oscuro en el centro. */
  const zLlanta = zFuera - lado * 0.01;
  disco(rL, zLlanta, CUBO, LLANTA, rL / R, true);
  if (grado >= 4) {
    const radio: Pincel = { ...p, color: LLANTA, acabado: ac.llanta };
    mojar(radio);
    for (let i = 0; i < 5; i++) {
      const a = (i * 2 * Math.PI) / 5 + Math.PI / 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const r0 = 0.045;
      const r1 = rL - 0.018;
      const px = -s * 0.022;
      const py = c * 0.022;
      const z = zLlanta + lado * 0.012;
      const q = (x: number, y: number): number => V(radio, x, y, z, 0, 0, lado, (x - eje) / R, (y - yc) / R);
      const i0 = q(eje + c * r0 - px, yc + s * r0 - py);
      const i1 = q(eje + c * r1 - px, yc + s * r1 - py);
      const i2 = q(eje + c * r1 + px, yc + s * r1 + py);
      const i3 = q(eje + c * r0 + px, yc + s * r0 + py);
      if (lado > 0) {
        m.tri(i0, i1, i2);
        m.tri(i0, i2, i3);
      } else {
        m.tri(i0, i2, i1);
        m.tri(i0, i3, i2);
      }
    }
  }
}

/** Las matrículas de delante y de detrás: la UV lleva la semilla del coche para los caracteres (familia `llanta`). */
function matriculas(p: Pincel, f: Forma, c: CocheDelPlano): void {
  const medio = f.largo / 2;
  const semilla = c.semilla % 1000;
  mojar(p);
  for (const [x, y, n] of [
    [medio + 0.009, f.matricula[0], 1],
    [-medio - 0.009, f.matricula[1], -1],
  ] as const) {
    const y0 = y - 0.055;
    const y1 = y + 0.055;
    /* t de izquierda a derecha de quien la lee (de frente); s de abajo arriba. */
    const izq = n > 0 ? 0.26 : -0.26;
    const der = -izq;
    const a = V(p, x, y0, izq, n, 0, 0, semilla, 10);
    const b = V(p, x, y0, der, n, 0, 0, semilla + 1, 10);
    const cc = V(p, x, y1, der, n, 0, 0, semilla + 1, 11);
    const d = V(p, x, y1, izq, n, 0, 0, semilla, 11);
    p.m.tri(a, b, cc);
    p.m.tri(a, cc, d);
  }
}

/**
 * LA CABINA: el invernadero sobre el hombro, cortado donde lo dice la forma. g1: cinco caras (parabrisas,
 * techo, luna y los dos costados enteros) con las lunas oscuras; la furgoneta, con su costado partido en la
 * luna de la puerta y el panel, y su trasera. g2+: un loft por los cortes, con los pilares; g3+ con el marco,
 * el techo abombado, las lunas de cristal y el interior (el techo y los pilares por dentro, la tina del
 * habitáculo con el salpicadero y los asientos, y en g4 el volante y los limpiaparabrisas). `bajo`: las x de las
 * estaciones del cuerpo de `cabina0` a `cabina1`, por donde va la boca de la tina.
 */
function* cabina(
  f: Forma,
  grado: GradoDelCoche,
  p: {
    readonly pintura: Pincel;
    readonly negro: Pincel;
    readonly dentro: Pincel;
    readonly vidrio: Pincel;
    readonly desfase: number;
    readonly numero: number;
    readonly cabina0: number;
    readonly cabina1: number;
    readonly bajo: readonly number[];
  },
): Generator<void, void, void> {
  const k = f.cabina;
  const cortes = k.cortes;
  const conBase = k.base === 'cintura';
  const x0 = p.cabina0;
  const x1 = p.cabina1;
  /* La base de la cabina en una x: el canto del hombro (o la cintura) del anillo del cuerpo en esa x. */
  const base = (x: number): P2 => {
    const s = seccionEn(f, grado, x);
    return conBase ? [s.w * 0.975, s.cintura] : [s.w * 0.84, s.tapa];
  };
  /* El techo en una x: plano de parabrisas a techoAtras, y bajando hasta la base en las lunas tumbadas. */
  const techoEn = (x: number): { y: number; w: number } => {
    const b = base(x);
    if (x >= k.parabrisas) {
      const t = Math.min(1, (x - k.parabrisas) / Math.max(x1 - k.parabrisas, 1e-6));
      return { y: k.techo + (b[1] - k.techo) * t, w: k.medioTecho + (b[0] - k.medioTecho) * t };
    }
    if (x <= k.techoAtras && !k.cerrada) {
      const t = Math.min(1, (k.techoAtras - x) / Math.max(k.techoAtras - x0, 1e-6));
      return { y: k.techo + (b[1] - k.techo) * t, w: k.medioTecho + (b[0] - k.medioTecho) * t };
    }
    return { y: k.techo, w: k.medioTecho };
  };
  const cd = p.desfase;
  const xB = xDelPilarB(f);
  if (grado === 1) {
    const bA = base(x1);
    const bL = base(x0);
    const tP = techoEn(k.parabrisas);
    const tA = techoEn(k.techoAtras);
    for (const lado of [-1, 1] as const) {
      const n: V3 = [0, 0.25, lado];
      const pb: V3 = [x1, bA[1], lado * bA[0]];
      const pp: V3 = [k.parabrisas, tP.y, lado * tP.w];
      const pa: V3 = [k.techoAtras, tA.y, lado * tA.w];
      const pl: V3 = [x0, bL[1], lado * bL[0]];
      if (k.cerrada) {
        /* La luna de la puerta de delante hasta el pilar B, y el panel de carga hasta la trasera. */
        const bB = base(xB);
        const tB = techoEn(xB);
        const qb: V3 = [xB, bB[1], lado * bB[0]];
        const qt: V3 = [xB, tB.y, lado * tB.w];
        if (lado > 0) {
          cuadro(p.vidrio, qb, pb, pp, qt, n, cd);
          cuadro(p.pintura, pl, qb, qt, pa, n, cd);
        } else {
          cuadro(p.vidrio, pb, qb, qt, pp, n, cd);
          cuadro(p.pintura, qb, pl, pa, qt, n, cd);
        }
      } else if (lado > 0) cuadro(p.vidrio, pl, pb, pp, pa, n, cd);
      else cuadro(p.vidrio, pb, pl, pa, pp, n, cd);
    }
    /* El parabrisas, el techo y la luna (o la trasera). */
    cuadro(p.vidrio, [x1, bA[1], bA[0]], [x1, bA[1], -bA[0]], [k.parabrisas, tP.y, -tP.w], [k.parabrisas, tP.y, tP.w], [0.6, 0.8, 0], cd);
    cuadro(p.pintura, [k.parabrisas, tP.y, tP.w], [k.parabrisas, tP.y, -tP.w], [k.techoAtras, tA.y, -tA.w], [k.techoAtras, tA.y, tA.w], [0, 1, 0], cd);
    if (k.cerrada) cuadro(p.pintura, [x0, bL[1], -bL[0]], [x0, bL[1], bL[0]], [x0, tA.y, tA.w], [x0, tA.y, -tA.w], [-1, 0, 0], cd);
    else cuadro(p.vidrio, [k.techoAtras, tA.y, tA.w], [k.techoAtras, tA.y, -tA.w], [x0, bL[1], -bL[0]], [x0, bL[1], bL[0]], [-0.6, 0.8, 0], cd);
    return;
  }
  /* g2+: un loft por los cortes y por el alto del parabrisas y de la luna. */
  const xs = new Set<number>([x0, x1, ...cortes.slice(1, -1).map((c) => c.x), k.parabrisas]);
  if (!k.cerrada) xs.add(k.techoAtras);
  if (grado >= 3) {
    xs.add((x1 + k.parabrisas) / 2);
    if (!k.cerrada) xs.add((x0 + k.techoAtras) / 2);
  }
  const lista = [...xs].filter((x) => x >= x0 - 1e-9 && x <= x1 + 1e-9).sort((a, b) => a - b);
  const costadoDe = (x: number): CorteDeLaCabina['costado'] => {
    let que: CorteDeLaCabina['costado'] = (cortes[0] as CorteDeLaCabina).costado;
    for (const corte of cortes) if (corte.x <= x + 1e-6) que = corte.costado;
    return que;
  };
  /* El anillo abierto de la cabina: base derecha, (alto del cristal), canto del techo, (lomo), canto izquierdo, (…), base izquierda. */
  const anillo = (x: number): P2[] => {
    const b = base(x);
    const t = techoEn(x);
    const plana = Math.abs(t.y - b[1]) < 1e-4;
    const marco = (s: number): P2 => (plana ? [s * b[0], b[1]] : [s * (t.w + (b[0] - t.w) * 0.1), t.y - (t.y - b[1]) * 0.1]);
    const pts: P2[] = [[b[0], b[1]]];
    if (grado >= 3) pts.push(marco(1));
    pts.push([t.w, t.y]);
    if (grado >= 3) pts.push([0, plana ? t.y : t.y + 0.018]);
    pts.push([-t.w, t.y]);
    if (grado >= 3) pts.push(marco(-1));
    pts.push([-b[0], b[1]]);
    return pts;
  };
  const estaciones: Estacion[] = lista.map((x) => ({ x, anillo: anillo(x) }));
  const na = (estaciones[0] as Estacion).anillo.length - 1;
  /* Las aristas: 0 (y en g3+, 1: el marco) el costado derecho; las del medio, el techo; las últimas, el izquierdo. */
  const deCostado = grado >= 3 ? 1 : 0;
  const esCostado = (a: number): boolean => a <= deCostado || a >= na - 1 - deCostado;
  const esMarco = (a: number): boolean => grado >= 3 && (a === 1 || a === na - 2);
  const xm = (s: number): number => ((estaciones[s] as Estacion).x + (estaciones[s + 1] as Estacion).x) / 2;
  const esLunaDeArriba = (s: number): boolean => xm(s) > k.parabrisas || (!k.cerrada && xm(s) < k.techoAtras);
  yield* loft(
    estaciones,
    (s, a) => {
      const que = costadoDe(xm(s));
      if (esMarco(a)) return que === 'panel' || que === 'pilar' ? p.pintura : p.negro;
      if (esCostado(a)) return que === 'luna' ? p.vidrio : que === 'pilarB' ? p.negro : p.pintura;
      return esLunaDeArriba(s) ? p.vidrio : p.pintura;
    },
    { cerrado: false, carroceria: p.numero, tapas: k.cerrada ? { inicio: p.pintura } : {} },
  );
  if (grado < 3) return;
  /* Las filas de asientos (la x de la cara de delante del respaldo) y, en la furgoneta, la mampara detrás. */
  const filas = k.cerrada ? [xB - 0.02] : [xB + 0.05, xB - 0.72];
  const xMampara = k.cerrada ? (filas[0] as number) - 0.2 : x0;
  /* Por dentro (se ve por el cristal): el techo, el marco y los pilares, del revés y oscuros; en la furgoneta,
     sólo delante de la mampara (lo de detrás no se ve por ninguna luna). */
  const alReves: Estacion[] = estaciones.map((e) => ({ x: e.x, anillo: [...e.anillo].reverse() }));
  yield* loft(
    alReves,
    (s, a) => {
      if (xm(s) < xMampara) return null;
      const original = na - 1 - a;
      if (esCostado(original) && !esMarco(original)) return costadoDe(xm(s)) === 'luna' ? null : p.dentro;
      if (esCostado(original)) return p.dentro;
      return esLunaDeArriba(s) ? null : p.dentro;
    },
    { cerrado: false, carroceria: p.numero },
  );
  /*
   * LA TINA DEL HABITÁCULO. Antes el suelo de la cabina era la tapa del cuerpo, a la altura de la cintura: por el
   * cristal se veía una bandeja a la altura de la ventanilla, cogiendo la farola, con los asientos encima como
   * cajas sueltas. Ahora la boca del cuerpo bajo la cabina se abre y baja HONDO_DEL_HABITACULO: los paneles de las
   * puertas por dentro (siguiendo la boca estación a estación, sin rendija), el piso, el salpicadero hasta el
   * parabrisas, y detrás la bandeja bajo la luna (los turismos) o la mampara hasta el techo (la furgoneta).
   */
  const yBase = (x: number): number => base(x)[1];
  const zBase = (x: number): number => base(x)[0];
  const piso = yBase((x0 + x1) / 2) - HONDO_DEL_HABITACULO;
  const desde = xMampara;
  const xsTina = [desde, ...p.bajo.filter((x) => x > desde + 1e-6 && x < x1 - 1e-6), x1];
  for (let i = 0; i + 1 < xsTina.length; i++) {
    const xa = xsTina[i] as number;
    const xb = xsTina[i + 1] as number;
    const ya = yBase(xa);
    const yb = yBase(xb);
    const za = zBase(xa);
    const zb = zBase(xb);
    /* Los paneles de las puertas, mirando adentro, y el piso. */
    cuadro(p.dentro, [xb, piso, zb], [xa, piso, za], [xa, ya, za], [xb, yb, zb], [0, 0, -1], cd);
    cuadro(p.dentro, [xa, piso, -za], [xb, piso, -zb], [xb, yb, -zb], [xa, ya, -za], [0, 0, 1], cd);
    cuadro(p.dentro, [xa, piso, za], [xb, piso, zb], [xb, piso, -zb], [xa, piso, -za], [0, 1, 0], cd);
  }
  /* El salpicadero: de la boca bajo el parabrisas hacia atrás, 5 mm por debajo del pie del cristal. */
  const xSal = x1 - 0.48;
  const zSal = Math.min(zBase(xSal), zBase(x1)) - 0.002;
  const ySal = yBase(x1) - 0.005;
  caja(p.dentro, xSal, piso, -zSal, x1, ySal, zSal, 'oa', cd);
  if (k.cerrada) {
    /* La mampara: del piso al techo, por dentro de la cabina (5 mm), mirando adelante. */
    const aro = anillo(xMampara);
    const contorno: P2[] = [[zBase(xMampara), piso], ...aro.map(([z, y]): P2 => [z * 0.994, Math.min(y, k.techo - 0.005)]), [-zBase(xMampara), piso]];
    tapaDelAnillo(p.dentro, xMampara, contorno, true, cd);
  } else {
    /* La bandeja bajo la luna de atrás, del pie de la luna al respaldo de atrás. */
    const xBanco = (filas[1] as number) - 0.1;
    const zBan = Math.min(zBase(x0), zBase(xBanco)) - 0.002;
    const yBan = yBase(x0) - 0.012;
    caja(p.dentro, x0, yBan, -zBan, xBanco, yBan, zBan, 'a', cd);
  }
  /* Los asientos: respaldo del piso a media cabina, el reposacabezas encima y pegado, y el cojín delante. */
  const alto = k.techo - yBase((x0 + x1) / 2);
  const yRespaldo = yBase((x0 + x1) / 2) + alto * 0.45;
  const yCabeza = Math.min(yRespaldo + 0.2, yBase((x0 + x1) / 2) + alto * 0.76);
  const wIn = enLaLinea(f.ancho, 0) * 0.84 - 0.06;
  const asiento: Pincel = { ...p.dentro, color: ASIENTO };
  filas.forEach((xf, i) => {
    const plazas = i === 0 ? [-wIn * 0.5, wIn * 0.5] : [0];
    for (const z of plazas) {
      const ancho = i === 0 ? 0.24 : wIn * 0.92;
      caja(asiento, xf - 0.1, piso, z - ancho, xf, yRespaldo, z + ancho, 'nseoa', cd);
      caja(asiento, xf, piso, z - ancho, xf + 0.42, piso + 0.1, z + ancho, 'nsea', cd);
    }
    for (const zc of [-wIn * 0.5, wIn * 0.5]) caja(asiento, xf - 0.085, yRespaldo, zc - 0.12, xf - 0.015, yCabeza, zc + 0.12, 'nseoa', cd);
  });
  if (grado >= 4) {
    /* El volante: un aro de doce tramos, inclinado, detrás del salpicadero (a la izquierda del coche). */
    const xV = xSal - 0.09;
    const yV = yBase(x1) + 0.12;
    const zV = wIn * 0.5;
    const rV = 0.18;
    const aro: V3[] = [];
    for (let i = 0; i <= 12; i++) {
      const a = (i * 2 * Math.PI) / 12;
      aro.push([xV + Math.cos(a) * rV * 0.45, yV + Math.cos(a) * rV * 0.89, zV + Math.sin(a) * rV]);
    }
    tubo(p.dentro, aro, 0.016, 4);
    /* Los limpiaparabrisas, tumbados sobre el pie del parabrisas, un centímetro fuera del cristal. */
    const bA = base(x1);
    const tP = techoEn(k.parabrisas);
    const dx = k.parabrisas - x1;
    const dy = tP.y - bA[1];
    const l = Math.hypot(dx, dy);
    const nx = -dy / l;
    const ny = dx / l;
    const s = 0.12 / l;
    /* Dos brazos de 42 cm que no se pisan (de 0,3 a −0,12 y de −0,16 a −0,58), dentro del ancho del cristal. */
    for (const z of [0.3, -0.16]) {
      const px = x1 + dx * 0.04 + Math.abs(nx) * 0.012;
      const py = bA[1] + dy * 0.04 + Math.abs(ny) * 0.012;
      cuadro(p.negro, [px, py, z], [px, py, z - 0.42], [px + dx * s, py + dy * s, z - 0.42], [px + dx * s, py + dy * s, z], [Math.abs(nx), Math.abs(ny), 0], cd);
    }
  }
}

/** Un TUBO de sección de `lados` a lo largo de una polilínea cerrada (el volante), en el sitio del coche. */
function tubo(p: Pincel, puntos: readonly V3[], radio: number, lados: number): void {
  mojar(p);
  const anillos: number[][] = [];
  const t = new THREE.Vector3();
  const n = new THREE.Vector3();
  const b = new THREE.Vector3();
  const arriba = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < puntos.length; i++) {
    const q = puntos[i] as V3;
    const antes = puntos[Math.max(0, i - 1)] as V3;
    const despues = puntos[Math.min(puntos.length - 1, i + 1)] as V3;
    t.set(despues[0] - antes[0], despues[1] - antes[1], despues[2] - antes[2]).normalize();
    n.crossVectors(t, Math.abs(t.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : arriba).normalize();
    b.crossVectors(t, n).normalize();
    const anillo: number[] = [];
    for (let k = 0; k <= lados; k++) {
      const a = (k / lados) * Math.PI * 2;
      const nx = n.x * Math.cos(a) + b.x * Math.sin(a);
      const ny = n.y * Math.cos(a) + b.y * Math.sin(a);
      const nz = n.z * Math.cos(a) + b.z * Math.sin(a);
      anillo.push(V(p, q[0] + nx * radio, q[1] + ny * radio, q[2] + nz * radio, nx, ny, nz, i, k));
    }
    anillos.push(anillo);
  }
  for (let i = 0; i + 1 < anillos.length; i++) {
    const a = anillos[i] as number[];
    const c = anillos[i + 1] as number[];
    for (let k = 0; k < lados; k++) {
      p.m.tri(a[k] as number, a[k + 1] as number, c[k + 1] as number);
      p.m.tri(a[k] as number, c[k + 1] as number, c[k] as number);
    }
  }
}

/* ═══════════════════════════════ LOS ESCRITORES DE LA CELDA ═══════════════════════════════ */

/** UN COCHE APARCADO en los tres moldes de su obra, con el grado de los coches de la obra (ver la cabecera). */
export function* cocheAparcado(obra: ObraDeLaCelda, c: CocheDelPlano): Generator<void, void, void> {
  yield* escribirElCoche({ mobiliario: obra.m.mobiliario, cristal: obra.m.cristal, emisivo: obra.m.emisivo }, c, obra.gradoDeLosCoches, matrizDelCoche(c), obra.cochesEncendidos);
}

/** LOS COCHES DE UNA CELDA (el escritor de su familia, ver `celdas.ts`): uno por pieza, y cada caja estorba. */
export function* cochesDeLaCelda(obra: ObraDeLaCelda, parte: ParteDeLaCelda): Generator<void, void, void> {
  for (const c of parte.coches) {
    yield* cocheAparcado(obra, c);
    obra.estorba.push(c.caja);
  }
}

/** Los coches del barrio viejo, de un tirón (`construir.ts`): sus luces van a `obra.cochesEncendidos`. */
export function escribirLosCoches(obra: ObraDeLaCelda, coches: readonly CocheDelPlano[]): void {
  for (const c of coches) {
    for (const _ of cocheAparcado(obra, c)) {
      /* de un tirón */
    }
  }
}
