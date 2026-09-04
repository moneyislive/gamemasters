/**
 * EL PRESUPUESTO DE LA ESCENA: lo que el muelle pone además de las piezas del
 * pack, contado con los mismos números que se dibujan.
 *
 * ═══ POR QUÉ ESTOS NÚMEROS NO VIVEN EN `agua.ts` NI EN `Embarcadero.tsx` ═══
 *
 * `docs/EL-MUELLE.md` §2 fija el tope en 110 000 triángulos con seis sentados y
 * dice que «se mide en Node sumando piezas». Las piezas del pack se cuentan
 * abriendo `embarcadero.glb`; pero el mar, la cúpula del cielo, los faroles y los
 * discos de contacto los hace la escena a mano, y sus triángulos dependen de
 * cuántos sectores y anillos se le den a cada geometría. Si esos números se
 * escribieran dentro de `agua.ts` —que importa `three`— el comprobador no podría
 * leerlos sin arrastrar el motor de dibujo, y acabaría con una copia a mano que
 * el día menos pensado ya no es la misma. Así que se declaran AQUÍ, sin `three`,
 * y los dos lados los importan: la escena para construir, el comprobador para
 * sumar. No hay dos sitios que puedan discrepar.
 *
 * ═══ SIN `three`, A PROPÓSITO ═══
 *
 * Aritmética y constantes. Lo lee `verify:embarcadero` en Node.
 */

/** El tope del §2, con seis sentados y en calidad plena. */
export const TOPE_DE_TRIANGULOS = 110_000;
export const TOPE_DE_LLAMADAS = 70;

/* ────────────────────────────────── El mar ────────────────────────────────── */

/** El primer anillo a metro y medio de los pies; el último, en la niebla. */
export const RADIO_INTERIOR_DEL_MAR = 1.5;
export const RADIO_EXTERIOR_DEL_MAR = 900;
/** Cuarenta y ocho sectores bastan: el agua no tiene aristas que delaten el polígono, sólo olas. */
export const SECTORES_DEL_MAR = 48;
/** Cada anillo un 28 % más lejos que el anterior: veintiséis anillos hasta el horizonte. */
export const RAZON_DEL_MAR = 1.28;

/** Cuántos anillos tiene el disco, con la misma cuenta que `geometriaDelMar`. */
export function anillosDelMar(
  radioInterior = RADIO_INTERIOR_DEL_MAR,
  radioExterior = RADIO_EXTERIOR_DEL_MAR,
  razon = RAZON_DEL_MAR,
): number {
  let anillos = 1;
  for (let r = radioInterior; r < radioExterior; r *= razon) anillos++;
  return anillos + 1;
}

/** Los triángulos del mar: un abanico en el centro y dos por celda en los demás anillos. */
export function triangulosDelMar(
  radioInterior = RADIO_INTERIOR_DEL_MAR,
  radioExterior = RADIO_EXTERIOR_DEL_MAR,
  sectores = SECTORES_DEL_MAR,
  razon = RAZON_DEL_MAR,
): number {
  const anillos = anillosDelMar(radioInterior, radioExterior, razon);
  return sectores + (anillos - 2) * sectores * 2;
}

/* ───────────────────────────────── El cielo ───────────────────────────────── */

/** La cúpula: una esfera vista por dentro, y de radio menor que el plano lejano de la cámara. */
export const RADIO_DEL_CIELO = 700;
export const SEGMENTOS_DEL_CIELO = { ancho: 24, alto: 12 } as const;

/** Los triángulos de una `SphereGeometry(ancho, alto)`: los casquetes son abanicos. */
export function triangulosDelCielo(ancho = SEGMENTOS_DEL_CIELO.ancho, alto = SEGMENTOS_DEL_CIELO.alto): number {
  return ancho * 2 + (alto - 2) * ancho * 2;
}

/* ────────────────────────── Faroles, norays y discos ────────────────────────── */

/** El poste del farol: un cilindro de seis lados con sus dos tapas. */
export const LADOS_DEL_POSTE = 6;
/** La esfera del farol: diez por ocho segmentos. */
export const SEGMENTOS_DE_LA_ESFERA = { ancho: 10, alto: 8 } as const;
/** El disco de contacto bajo cada aventurero. */
export const SEGMENTOS_DEL_DISCO = 18;

export function triangulosDelPoste(lados = LADOS_DEL_POSTE): number {
  return lados * 2 + lados * 2;
}

export function triangulosDeLaEsfera(
  ancho = SEGMENTOS_DE_LA_ESFERA.ancho,
  alto = SEGMENTOS_DE_LA_ESFERA.alto,
): number {
  return ancho * 2 + (alto - 2) * ancho * 2;
}

/* ─────────────────────────────── Lo que flota ─────────────────────────────── */

/** Las motas del volumen del muelle en calidad plena. Puntos, no triángulos. */
export const MOTAS = 400;
/** El humo de la taberna. */
export const MOTAS_DE_HUMO = 28;
/** Las brumas a ras del agua: planos de dos triángulos. */
export const BRUMAS = 6;

/* ─────────────────────────── La suma, en un solo sitio ─────────────────────────── */

export interface RenglonDelPresupuesto {
  readonly que: string;
  readonly cuantos: number;
  readonly triangulos: number;
}

/**
 * LO QUE LA ESCENA PONE ADEMÁS DE LA CALA, con seis sentados y calidad plena.
 *
 * Seis plataformas de amarre (la cala trae los dos tramos; las seis plataformas
 * las pone la escena), un barco y una bandera por sentado, el estandarte del
 * local, un farol por amarre, un disco de contacto por aventurero, el mar, el
 * cielo y las brumas. Los aventureros entran con los triángulos que se le den:
 * el comprobador exige el tope con el PEOR caso (seis iguales de la más pesada),
 * porque seis exploradoras es una mesa posible, e imprime la media aparte.
 */
export function renglonesFijos(
  triangulosPorPieza: ReadonlyMap<string, number>,
  triangulosDeUnAventurero: number,
  sentados = 6,
): RenglonDelPresupuesto[] {
  const de = (pieza: string): number => triangulosPorPieza.get(pieza) ?? 0;
  return [
    { que: 'plataformas de amarre (muelle)', cuantos: 6, triangulos: 6 * de('muelle') },
    { que: 'barcos de asiento', cuantos: sentados, triangulos: sentados * de('barco') },
    { que: 'banderas de asiento', cuantos: sentados, triangulos: sentados * de('bandera') },
    { que: 'el estandarte del local', cuantos: 1, triangulos: de('estandarte') },
    { que: 'botes de los amarres vacíos', cuantos: 6 - sentados, triangulos: (6 - sentados) * de('bote') },
    { que: 'aventureros', cuantos: sentados, triangulos: sentados * triangulosDeUnAventurero },
    { que: 'postes de farol', cuantos: 6, triangulos: 6 * triangulosDelPoste() },
    { que: 'esferas de farol', cuantos: 6, triangulos: 6 * triangulosDeLaEsfera() },
    { que: 'discos de contacto', cuantos: sentados, triangulos: sentados * SEGMENTOS_DEL_DISCO },
    { que: 'el mar', cuantos: 1, triangulos: triangulosDelMar() },
    { que: 'la cúpula del cielo', cuantos: 1, triangulos: triangulosDelCielo() },
    { que: 'brumas y reflejos (planos)', cuantos: BRUMAS + 6, triangulos: (BRUMAS + 6) * 2 },
  ];
}
