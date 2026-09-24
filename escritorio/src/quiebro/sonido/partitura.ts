/**
 * LA PARTITURA DEL QUIEBRO: qué suena en cada semicorchea, por capas (diseño §9, punto 7).
 *
 * ═══ LA MÚSICA ES UNA FUNCIÓN DEL PASO ═══
 *
 * `notasDelPaso(paso, capas)` devuelve lo que toca en la semicorchea `paso` con las capas encendidas,
 * y nada más: sin estado, sin azar, sin reloj. El planificador (`musica.ts`) la llama para cada paso
 * que cae en su ventana y programa lo que le devuelve. Eso compra que la música se pruebe en Node
 * (que el pulso se oye en TODOS los pulsos aunque no haya percusión, que la melodía no se sale de la
 * escala, que la percusión entra con la racha y no antes) y que cambiar de modo sea cambiar el
 * argumento, no reconstruir un secuenciador.
 *
 * ═══ POR QUÉ ESTA MÚSICA ═══
 *
 * La voz de la casa es la madrugada española (diseño §1): la «Glorieta del Relojero, 3:12». Así que
 * la armonía es la CADENCIA ANDALUZA —La menor, Sol, Fa, Mi mayor, bajando— que es la firma armónica
 * del sur y se reconoce en cuatro compases, vestida de sintetizador oscuro bajo la lluvia. El Mi
 * MAYOR del cuarto compás (con su Sol sostenido) es la tensión frigia que tira de vuelta al La: la
 * música nunca termina de resolver, que es lo que tiene que hacer una noche que no acaba.
 *
 * Tres capas, como pide el diseño:
 *
 *   · BASE, siempre que haya música: el bajo en corcheas, un colchón de acordes que «bombea» en cada
 *     pulso y el TIC-TAC de un reloj en cada pulso. El reloj es el metrónomo honrado: el «a compás»
 *     (diseño §4.5) se tiene que poder oír sin percusión, con la música al mínimo, en un altavoz de
 *     teléfono que no da graves. Por eso el pulso lo marca un chasquido agudo y no el bombo.
 *   · PERCUSIÓN, que entra con la RACHA (limpios seguidos sin daño, diseño §4.7): con uno, bombo en
 *     1 y 3 y charles a contratiempo; con tres, bombo a negras y palmada en 2 y 4; con seis, además
 *     charles en semicorcheas y PALMAS en 3+3+2, el acento que suena a tablao sin dejar de ser 4/4.
 *   · MELODÍA, sólo en la Llamada: una voz de sintetizador que baja con la cadencia y acaba cada vuelta
 *     en el Fa→Mi (el semitono frigio), más un arpegio de cuerda pulsada en semicorcheas que empuja la
 *     carrera. La segunda vuelta de ocho compases cierra con una escala que baja: variación sin azar.
 *
 * Todas las alturas son números MIDI (La 4 = 69 = 440 Hz).
 */

export type Instrumento =
  | 'bajo'
  | 'colchon'
  | 'tic'
  | 'tac'
  | 'bombo'
  | 'palmada'
  | 'charles'
  | 'charles-abierto'
  | 'palmas'
  | 'cuerda'
  | 'voz';

export interface Nota {
  readonly instrumento: Instrumento;
  /** Alturas MIDI. Vacío en la percusión. */
  readonly alturas: readonly number[];
  /** 0..1. */
  readonly fuerza: number;
  /** Duración en pasos (semicorcheas). */
  readonly pasos: number;
}

export type ModoDeLaMusica = 'callada' | 'calma' | 'combate' | 'llamada';

export interface Capas {
  /** 0 nada; 1 calma (bajo a negras); 2 entera (bajo a corcheas). */
  readonly base: 0 | 1 | 2;
  /** 0 sin percusión; 1, 2 y 3 los niveles de la racha. */
  readonly percusion: 0 | 1 | 2 | 3;
  readonly melodia: boolean;
}

/** Limpios seguidos para cada nivel de percusión. */
export const UMBRALES_DE_RACHA = [1, 3, 6] as const;

const PASOS_POR_COMPAS = 16;
const COMPASES_POR_VUELTA = 4;

/** Las capas que tocan en un modo con una racha. La racha no finita o negativa cuenta como 0. */
export function capasDe(modo: ModoDeLaMusica, racha: number): Capas {
  const r = Number.isFinite(racha) ? Math.max(0, Math.floor(racha)) : 0;
  const porRacha: 0 | 1 | 2 | 3 = r >= UMBRALES_DE_RACHA[2] ? 3 : r >= UMBRALES_DE_RACHA[1] ? 2 : r >= UMBRALES_DE_RACHA[0] ? 1 : 0;
  switch (modo) {
    case 'callada':
      return { base: 0, percusion: 0, melodia: false };
    case 'calma':
      return { base: 1, percusion: 0, melodia: false };
    case 'combate':
      return { base: 2, percusion: porRacha, melodia: false };
    case 'llamada':
      return { base: 2, percusion: porRacha < 2 ? 2 : porRacha, melodia: true };
  }
}

export interface Acorde {
  readonly nombre: string;
  /** Fundamental en la octava del bajo (MIDI). */
  readonly fundamental: number;
  /** Las tres notas del colchón, en posición cerrada. */
  readonly notas: readonly [number, number, number];
  /** Clases de altura (0 = Do … 11 = Si) que la melodía puede usar sobre este acorde. */
  readonly escala: readonly number[];
}

/** La menor natural (La Si Do Re Mi Fa Sol) y armónica (con Sol♯), en clases de altura. */
const LA_MENOR = [9, 11, 0, 2, 4, 5, 7] as const;
const LA_ARMONICA = [9, 11, 0, 2, 4, 5, 8] as const;

/** La cadencia andaluza, un acorde por compás. */
export const CADENCIA: readonly Acorde[] = [
  { nombre: 'La menor', fundamental: 33, notas: [57, 60, 64], escala: LA_MENOR },
  { nombre: 'Sol mayor', fundamental: 31, notas: [55, 59, 62], escala: LA_MENOR },
  { nombre: 'Fa mayor', fundamental: 29, notas: [53, 57, 60], escala: LA_MENOR },
  { nombre: 'Mi mayor', fundamental: 28, notas: [52, 56, 59], escala: LA_ARMONICA },
];

/** El acorde que suena en el paso `paso`. */
export function acordeDelPaso(paso: number): Acorde {
  const compas = Math.floor(paso / PASOS_POR_COMPAS);
  const i = ((compas % COMPASES_POR_VUELTA) + COMPASES_POR_VUELTA) % COMPASES_POR_VUELTA;
  return CADENCIA[i] ?? (CADENCIA[0] as Acorde);
}

/** Frecuencia de una altura MIDI. */
export function frecuencia(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * LA NOTA DEL ACENTO «A COMPÁS»: un golpe acertado en el pulso suena, además, a la fundamental del
 * acorde dos octavas por encima del colchón (La 5, Sol 5, Fa 5, Mi 5). El golpe se AFINA con la música:
 * el jugador oye que ha entrado en ella, que es la mejor recompensa que puede dar un sonido.
 */
export function notaDeAcento(paso: number): number {
  return acordeDelPaso(paso).fundamental + 48;
}

/** Una variación pequeña y fija por paso (−1..1), para que el charles no suene a máquina. Sin azar. */
function temblor(paso: number): number {
  let h = Math.imul(paso ^ 0x5bd1e995, 0x27d4eb2d) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x165667b1) >>> 0;
  return ((h >>> 8) / 0xffffff) * 2 - 1;
}

/** [paso dentro de la vuelta de cuatro compases, altura MIDI, duración en pasos]. */
type NotaDeVoz = readonly [number, number, number];

/** La melodía de la Llamada, primera vuelta. Baja con la cadencia y acaba en Fa→Mi. */
const VOZ_A: readonly NotaDeVoz[] = [
  [0, 76, 6], [6, 74, 2], [8, 72, 4], [12, 71, 2], [14, 72, 2],
  [16, 74, 6], [22, 72, 2], [24, 71, 4], [28, 69, 2], [30, 71, 2],
  [32, 72, 6], [38, 69, 2], [40, 77, 4], [44, 76, 2], [46, 74, 2],
  [48, 77, 4], [52, 76, 8], [60, 68, 2], [62, 71, 2],
];

/** La segunda vuelta: igual hasta el último compás, que baja en escala hasta el Sol♯. */
const VOZ_B: readonly NotaDeVoz[] = [
  ...VOZ_A.filter(([p]) => p < 48),
  [48, 77, 2], [50, 76, 2], [52, 74, 2], [54, 72, 2], [56, 71, 4], [60, 68, 4],
];

/** El arpegio de la cuerda: índices sobre [fundamental, tercera, quinta, octava] en la octava 3-4. */
const ARPEGIO = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 3, 2, 1] as const;

/**
 * LO QUE SUENA EN LA SEMICORCHEA `paso` con las capas dadas. Los pasos negativos no suenan (la rejilla
 * empieza en 0).
 */
export function notasDelPaso(paso: number, capas: Capas): Nota[] {
  if (!Number.isInteger(paso) || paso < 0) return [];
  const notas: Nota[] = [];
  const enCompas = paso % PASOS_POR_COMPAS;
  const acorde = acordeDelPaso(paso);
  const enPulso = enCompas % 4 === 0;

  // ── BASE ──────────────────────────────────────────────────────────────────────────────────────────
  if (capas.base > 0) {
    if (enPulso) {
      // El reloj: tic en 1 y 3, tac en 2 y 4. Siempre, en todos los pulsos.
      notas.push({ instrumento: enCompas % 8 === 0 ? 'tic' : 'tac', alturas: [], fuerza: enCompas === 0 ? 0.75 : 0.6, pasos: 1 });
    }
    if (enCompas === 0) {
      notas.push({ instrumento: 'colchon', alturas: acorde.notas, fuerza: capas.base === 2 ? 0.55 : 0.45, pasos: PASOS_POR_COMPAS });
    }
    const corchea = enCompas % 2 === 0;
    const tocaBajo = capas.base === 2 ? corchea : enPulso;
    if (tocaBajo) {
      // Octava arriba en el «y» del 2 y del 4: el bajo que anda.
      const octava = capas.base === 2 && (enCompas === 6 || enCompas === 14);
      notas.push({
        instrumento: 'bajo',
        alturas: [acorde.fundamental + (octava ? 24 : 12)],
        fuerza: enPulso ? 0.9 : 0.62,
        pasos: capas.base === 2 ? 1.6 : 3,
      });
    }
  }

  // ── PERCUSIÓN ─────────────────────────────────────────────────────────────────────────────────────
  if (capas.percusion >= 1) {
    const bomboEn = capas.percusion >= 2 ? enPulso : enCompas === 0 || enCompas === 8;
    if (bomboEn) notas.push({ instrumento: 'bombo', alturas: [], fuerza: enCompas === 0 ? 1 : 0.88, pasos: 2 });
    if (capas.percusion >= 2 && (enCompas === 4 || enCompas === 12)) {
      notas.push({ instrumento: 'palmada', alturas: [], fuerza: 0.85, pasos: 2 });
    }
    const contratiempo = enCompas % 4 === 2;
    if (capas.percusion >= 2 && enCompas === 14) {
      notas.push({ instrumento: 'charles-abierto', alturas: [], fuerza: 0.5, pasos: 2 });
    } else if (contratiempo || (capas.percusion >= 2 && enCompas % 2 === 0)) {
      notas.push({ instrumento: 'charles', alturas: [], fuerza: (contratiempo ? 0.55 : 0.35) + 0.06 * temblor(paso), pasos: 1 });
    } else if (capas.percusion >= 3 && enCompas % 2 === 1) {
      notas.push({ instrumento: 'charles', alturas: [], fuerza: 0.22 + 0.05 * temblor(paso), pasos: 1 });
    }
    if (capas.percusion >= 3) {
      // Palmas en 3+3+2 corcheas (pasos 0, 6 y 12), con sordas entre medias.
      if (enCompas === 0 || enCompas === 6 || enCompas === 12) notas.push({ instrumento: 'palmas', alturas: [], fuerza: 0.7, pasos: 1 });
      else if (enCompas === 3 || enCompas === 9) notas.push({ instrumento: 'palmas', alturas: [], fuerza: 0.3, pasos: 1 });
    }
  }

  // ── MELODÍA ───────────────────────────────────────────────────────────────────────────────────────
  if (capas.melodia) {
    const [fundamentalDelColchon, tercera, quinta] = acorde.notas;
    const arpegio = [fundamentalDelColchon, tercera, quinta, fundamentalDelColchon + 12];
    const altura = arpegio[ARPEGIO[enCompas] ?? 0] ?? fundamentalDelColchon;
    notas.push({ instrumento: 'cuerda', alturas: [altura], fuerza: enPulso ? 0.55 : 0.4, pasos: 2 });
    const enVuelta = paso % (PASOS_POR_COMPAS * COMPASES_POR_VUELTA);
    const vuelta = Math.floor(paso / (PASOS_POR_COMPAS * COMPASES_POR_VUELTA));
    const voz = vuelta % 2 === 0 ? VOZ_A : VOZ_B;
    for (const [p, midi, dur] of voz) {
      if (p === enVuelta) notas.push({ instrumento: 'voz', alturas: [midi], fuerza: 0.7, pasos: dur });
    }
  }
  return notas;
}
