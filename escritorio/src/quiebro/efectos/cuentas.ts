/**
 * LAS CUENTAS DE LOS EFECTOS: colores, tamaños, tiempos y trayectorias, sin three y sin DOM.
 *
 * ═══ POR QUÉ LAS CUENTAS VAN EN LA CPU Y NO EN EL SOMBREADOR ═══
 *
 * Lo que el jugador USA para decidir —cuándo se cierra el anillo, dónde está la bala, cuánto mide
 * en pantalla lo que tiene que leer a 20 m— se calcula aquí, en doble precisión, y la pieza se lo
 * pasa al sombreador ya hecho en un atributo por instancia. Si viviera en GLSL habría dos copias de
 * la misma fórmula (la del sombreador, que pinta, y la de este fichero, que el comprobador prueba),
 * y la suite comprobaría la que no se usa. Son pocas instancias (24 anillos, 12 balas), así que
 * cuesta unos microsegundos por fotograma.
 *
 * Lo que es sólo adorno y hay a cientos (chispas, esquirlas, lluvia) se anima en el sombreador con
 * el tiempo como uniforme: ahí no hay nada que decidir y sí mucho que mover.
 *
 * ═══ EL ANILLO, QUE ES LO ÚNICO DE AQUÍ QUE ES JUEGO ═══
 *
 * El anillo se cierra LINEALMENTE de `RADIO_INICIAL_DEL_ANILLO` a `RADIO_FINAL_DEL_ANILLO` entre el
 * inicio y el impacto que manda el servidor, ya traducidos a `performance.now()` del aparato
 * (diseño §4.3). Lineal a propósito: a velocidad constante el ojo extrapola cuándo toca el anillo
 * fijo —como en cualquier juego de ritmo—, y una curva «bonita» que frenara al final movería ese
 * instante percibido. En el impacto el progreso vale 1 EXACTO y el radio es el final EXACTO.
 *
 * «Legible a 20 m»: lejos, el anillo se agranda lo justo para que el radio final no baje de
 * `MIN_PX_DEL_RADIO_FINAL` ni el trazo de `MIN_PX_DEL_TRAZO` en la pantalla más pobre de N0. El
 * tiempo no cambia: sólo el tamaño.
 */
import { COSENO, RUMBOS, SENO } from '../../../../shared/mecanicas/andar';
import { UNO } from '../../../../shared/mecanicas/fijo';

/* ─────────────────────────────── La paleta ─────────────────────────────── */

/**
 * La paleta del §1 del diseño, en sRGB: verde-cian de pantalla vieja para el código, ámbar de
 * farola de sodio para todo lo del jugador, magenta de neón para los rótulos.
 */
export const COLORES = {
  codigo: 0x3ff2c2,
  codigoHondo: 0x0f6f5a,
  ambar: 0xffa13a,
  ambarClaro: 0xffd489,
  magenta: 0xff3fa4,
  blanco: 0xf1fff8,
  /** El verde con que acaban los hilos del Trasvase, en el Celador: más frío que el código. */
  verdeDelTrasvase: 0x5dff7a,
} as const;

/** De quién viene el golpe que anuncia el anillo. */
export type Amenaza = 'prestado' | 'celador' | 'respuesta' | 'tirador';
export const AMENAZAS: readonly Amenaza[] = ['prestado', 'celador', 'respuesta', 'tirador'];

/**
 * Color por amenaza. Ninguno es ámbar (eso es del jugador) y los cuatro se separan en tono Y en
 * forma (`TRAZOS_DE_LA_AMENAZA`), para quien no distingue el rojo del verde.
 */
export const COLOR_DE_LA_AMENAZA: Readonly<Record<Amenaza, number>> = {
  prestado: COLORES.codigo,
  celador: 0xff3d6e,
  /** La respuesta de la guardia de un Celador: el quiebro más valioso, en blanco violáceo. */
  respuesta: 0xdcc2ff,
  tirador: 0xff5a24,
};

/** Cuántos trazos concéntricos lleva el anillo que se cierra: la forma dice la amenaza sin color. */
export const TRAZOS_DE_LA_AMENAZA: Readonly<Record<Amenaza, number>> = {
  prestado: 1,
  celador: 2,
  respuesta: 3,
  tirador: 1,
};

/** Un color sRGB en tres componentes de 0 a 1. */
export function componentesDe(color: number): [number, number, number] {
  return [((color >> 16) & 255) / 255, ((color >> 8) & 255) / 255, (color & 255) / 255];
}

/** Una componente sRGB (0 a 1) en lineal: la curva de siempre, la misma que usa three. */
export function aLineal(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Un color sRGB en tres componentes LINEALES, que es lo que los sombreadores suman: los efectos
 * trabajan en el espacio de la escena y el `colorspace_fragment` del final lo devuelve a sRGB.
 */
export function componentesLineales(color: number): [number, number, number] {
  const [r, g, b] = componentesDe(color);
  return [aLineal(r), aLineal(g), aLineal(b)];
}

/* ─────────────────────────────── El azar del adorno ─────────────────────────────── */

/**
 * Un entero de 32 bits mezclado. Constantes de «lowbias32» de Chris Wellons (hash-prospector,
 * dominio público). El adorno no usa `Math.random`: el mismo suceso da las mismas chispas, que es lo
 * que deja comparar dos capturas del banco.
 */
export function mezclar(x: number): number {
  let h = x >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/** Un número en [0, 1) a partir de dos enteros. */
export function azarDe(a: number, b: number): number {
  return mezclar(mezclar(a) ^ Math.imul(b | 0, 0x9e3779b9)) / 4294967296;
}

/* ─────────────────────────────── La pantalla ─────────────────────────────── */

/** Píxeles del búfer por metro a un metro de la cámara, para un alto de búfer y un campo vertical. */
export function pxPorMetroA1m(altoDelBuferPx: number, fovVerticalGrados: number): number {
  return altoDelBuferPx / (2 * Math.tan((fovVerticalGrados * Math.PI) / 360));
}

/**
 * LA PANTALLA MÁS POBRE en la que el anillo tiene que leerse: un móvil apaisado de 360 puntos de
 * alto, a la densidad de N0 (0,75) y con el campo de visión del móvil (75°, diseño §7).
 */
export const PANTALLA_MAS_POBRE = { altoCss: 360, dpr: 0.75, fovGrados: 75 } as const;

/** Distancia a la que el diseño exige que el anillo se lea (§1 del encargo y §3: 6 jugadores). */
export const DISTANCIA_DE_LECTURA = 20;

/* ─────────────────────────────── El anillo del anuncio ─────────────────────────────── */

/** Radio del anillo cuando empieza a cerrarse, en metros. */
export const RADIO_INICIAL_DEL_ANILLO = 1.6;
/** Radio en el instante del impacto: algo más que el cuerpo (0,35 m) para que no lo tape la silueta. */
export const RADIO_FINAL_DEL_ANILLO = 0.55;
/** Grosor del trazo principal, en metros. */
export const GROSOR_DEL_ANILLO = 0.045;
/** Alto de los glifos que corren por fuera del trazo, en metros. */
export const ALTO_DE_LOS_GLIFOS_DEL_ANILLO = 0.17;
/** A qué altura sobre los pies del blanco se centra el anillo: el pecho. */
export const ALTURA_DEL_ANILLO = 1.1;
/** Lo que dura el remate tras el impacto (el destello, o el estallido si fue limpio). */
export const TRAS_EL_IMPACTO_MS = 240;
/** Cuánto se apaga un anillo que no es para ti. */
export const OPACIDAD_TENUE = 0.32;
/** El radio final no baja de esto en pantalla, en píxeles del búfer. */
export const MIN_PX_DEL_RADIO_FINAL = 12;
/** El trazo no baja de esto en pantalla. */
export const MIN_PX_DEL_TRAZO = 2;

/**
 * Cuánto va cerrado el anillo en `t`: 0 al inicio, 1 EXACTO en el impacto y después. Si el servidor
 * mandara un impacto que no está por delante del inicio, el anillo nace cerrado: mejor un destello
 * que una división por cero.
 */
export function progresoDelAnuncio(t: number, inicio: number, impacto: number): number {
  if (t >= impacto) return 1;
  if (!(impacto > inicio) || t <= inicio) return impacto > inicio ? 0 : 1;
  return (t - inicio) / (impacto - inicio);
}

/** El radio (sin escala de lectura) para un progreso. En 1, el final exacto. */
export function radioDelAnillo(progreso: number): number {
  if (progreso >= 1) return RADIO_FINAL_DEL_ANILLO;
  if (progreso <= 0) return RADIO_INICIAL_DEL_ANILLO;
  return RADIO_INICIAL_DEL_ANILLO + (RADIO_FINAL_DEL_ANILLO - RADIO_INICIAL_DEL_ANILLO) * progreso;
}

/** Por cuánto se agranda el anillo a una distancia para que el radio final se lea. Nunca encoge. */
export function escalaDeLectura(distancia: number, pxPorMetro: number): number {
  if (!(distancia > 0) || !(pxPorMetro > 0)) return 1;
  const radioFinalPx = (RADIO_FINAL_DEL_ANILLO * pxPorMetro) / distancia;
  return Math.max(1, MIN_PX_DEL_RADIO_FINAL / radioFinalPx);
}

/** El grosor del trazo en metros a una distancia: el del anillo escalado, o el mínimo en píxeles. */
export function grosorDeLectura(distancia: number, pxPorMetro: number, escala: number): number {
  const minimo = distancia > 0 && pxPorMetro > 0 ? (MIN_PX_DEL_TRAZO * distancia) / pxPorMetro : 0;
  return Math.max(GROSOR_DEL_ANILLO * escala, minimo);
}

/** Lo que mide en pantalla un anillo a una distancia, para el comprobador y el banco. */
export function anilloEnPantalla(
  distancia: number,
  pxPorMetro: number,
): { radioInicialPx: number; radioFinalPx: number; trazoPx: number; recorridoPx: number } {
  const escala = escalaDeLectura(distancia, pxPorMetro);
  const aPx = pxPorMetro / distancia;
  const radioInicialPx = RADIO_INICIAL_DEL_ANILLO * escala * aPx;
  const radioFinalPx = RADIO_FINAL_DEL_ANILLO * escala * aPx;
  return {
    radioInicialPx,
    radioFinalPx,
    trazoPx: grosorDeLectura(distancia, pxPorMetro, escala) * aPx,
    recorridoPx: radioInicialPx - radioFinalPx,
  };
}

/* ─────────────────────────────── Las balas ─────────────────────────────── */

/** Velocidad de la bala lenta: 20 m/s (diseño §4.6). */
export const VELOCIDAD_DE_LA_BALA = 20;
/** Alcance: 30 m. */
export const ALCANCE_DE_LA_BALA = 30;
/** Radio de la bala: 0,2 m. Lo que se pinta de núcleo, no de estela. */
export const RADIO_DE_LA_BALA = 0.2;
/** Altura de la pistola sobre el suelo, que es la de la bala: la bala viaja en horizontal. */
export const ALTURA_DE_LA_BALA = 1.35;
/** Largo de la estela detrás del núcleo. */
export const LARGO_DE_LA_ESTELA = 2.4;
/** Cada cuánto deja la bala una onda de aire. */
export const ESPACIO_ENTRE_ONDAS = 1.2;
/** Lo que vive una onda de aire. */
export const VIDA_DE_LA_ONDA_MS = 420;
/** Lo que tarda la estela en recogerse cuando la bala se para. */
export const RECOGIDA_DE_LA_ESTELA_MS = 160;

/**
 * La dirección en el suelo de un rumbo de la tabla (0 = norte = −z), en metros por metro. Escribe
 * en `salida` si se le da (las piezas pasan uno suyo para no asignar en cada fotograma).
 */
export function direccionDelRumbo(rumbo: number, salida: { x: number; z: number } = { x: 0, z: 0 }): { x: number; z: number } {
  const r = ((Math.floor(rumbo) % RUMBOS) + RUMBOS) % RUMBOS;
  salida.x = (SENO[r] as number) / UNO;
  salida.z = -(COSENO[r] as number) / UNO;
  return salida;
}

export interface BalaDeEfecto {
  /** Instante de salida en ms del aparato (`performance.now()`). */
  readonly salida: number;
  /** Boca de la pistola. */
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Rumbo de la tabla de 256 (el mismo que viaja en el aviso `bala`). */
  readonly rumbo: number;
  /** Instante en que el servidor la dio por acabada (golpe o pared), o `null` si sigue. */
  readonly fin: number | null;
}

/** Metros que ha recorrido la bala en `t`. Se para en su alcance y en su `fin`. */
export function recorridoDeLaBala(bala: BalaDeEfecto, t: number): number {
  const hasta = bala.fin === null ? t : Math.min(t, bala.fin);
  const recorrido = ((hasta - bala.salida) * VELOCIDAD_DE_LA_BALA) / 1000;
  return Math.min(ALCANCE_DE_LA_BALA, Math.max(0, recorrido));
}

/** ¿Ya no hay nada que pintar de la bala? (se paró y la estela terminó de recogerse). */
export function balaAcabada(bala: BalaDeEfecto, t: number): boolean {
  const paradaNatural = bala.salida + (ALCANCE_DE_LA_BALA / VELOCIDAD_DE_LA_BALA) * 1000;
  const parada = bala.fin === null ? paradaNatural : Math.min(bala.fin, paradaNatural);
  return t > parada + RECOGIDA_DE_LA_ESTELA_MS;
}

/**
 * La onda de aire `k` (0 la primera) de una bala: nace cuando la bala pasa por `(k + 1)·ESPACIO`,
 * crece y se apaga en `VIDA_DE_LA_ONDA_MS`. Devuelve su edad en ms, o −1 si no está viva.
 */
export function edadDeLaOnda(bala: BalaDeEfecto, k: number, t: number): number {
  const distancia = (k + 1) * ESPACIO_ENTRE_ONDAS;
  if (distancia > recorridoDeLaBala(bala, t) + 1e-9) return -1;
  const nace = bala.salida + (distancia / VELOCIDAD_DE_LA_BALA) * 1000;
  const edad = t - nace;
  return edad >= 0 && edad < VIDA_DE_LA_ONDA_MS ? edad : -1;
}

/* ─────────────────────────────── El impacto ─────────────────────────────── */

/** Chispas de un impacto de fuerza `f` (0 a 1) cuando el nivel da `porImpacto` para la fuerza 1. */
export function chispasDelImpacto(fuerza: number, porImpacto: number): number {
  const f = Math.min(1, Math.max(0, fuerza));
  return Math.max(2, Math.round(porImpacto * (0.35 + 0.65 * f)));
}
/** Vida de una chispa, en ms. */
export function vidaDeLaChispa(fuerza: number): number {
  return 260 + 260 * Math.min(1, Math.max(0, fuerza));
}
/** Velocidad de salida de las chispas, m/s. */
export function velocidadDeLasChispas(fuerza: number): number {
  return 2.5 + 5 * Math.min(1, Math.max(0, fuerza));
}
/** Lo que dura la onda del impacto. */
export const ONDA_DEL_IMPACTO_MS = 320;
/** Radio final de la onda para la fuerza `f`. */
export function radioDeLaOndaDelImpacto(fuerza: number): number {
  return 0.5 + 1.3 * Math.min(1, Math.max(0, fuerza));
}
/** Lo que dura el destello. */
export const DESTELLO_MS = 90;

/**
 * EL PARPADEO de un impacto, de 0 a 1: lo que el posproceso usa para el fogonazo de pantalla y la
 * cámara para la sacudida. Cae lineal en `DESTELLO_MS`. Fuera de él, 0.
 */
export function parpadeoDelImpacto(t: number, nace: number, fuerza: number): number {
  const e = t - nace;
  if (e < 0 || e >= DESTELLO_MS) return 0;
  return Math.min(1, Math.max(0, fuerza)) * (1 - e / DESTELLO_MS);
}

/* ─────────────────────────────── Las líneas de tiempo del adorno ─────────────────────────────── */

const entre01 = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x);
const suave = (x: number): number => {
  const y = entre01(x);
  return y * y * (3 - 2 * y);
};

/** La impresión de un Celador: 1,2 s (diseño §4.8). */
export const IMPRESION_MS = 1200;
/** La primera parte de la impresión: la columna cae desde lo alto hasta el suelo. */
export const CAIDA_DE_LA_IMPRESION_MS = 480;
/** Desde qué altura cae la columna, en metros. */
export const ALTURA_DE_LA_CAIDA = 9;
/** Lo que tardan los glifos en irse cuando el cuerpo ya está. */
export const COLA_DE_LOS_GLIFOS_MS = 320;

export interface MomentoDeLaImpresion {
  /** Frente de la columna: 0 arriba del todo, 1 en el suelo. */
  caida: number;
  /** De columna ancha a silueta: 0 columna, 1 silueta. */
  compacto: number;
  /** Cuánto se ve ya el cuerpo (para `personajes/`): 0 nada, 1 entero en el instante 1,2 s. */
  cuerpo: number;
  /** Brillo de los glifos. */
  glifos: number;
  viva: boolean;
}

/*
 * LAS LÍNEAS DE TIEMPO escriben en `m` si se les da uno: las piezas pasan el suyo y así no asignan
 * un objeto por silueta y fotograma. Sin `m`, devuelven uno nuevo (el comprobador y el banco).
 */

/** Dónde va una impresión que empezó en `inicio` (reloj presentado). */
export function impresionEn(
  t: number,
  inicio: number,
  m: MomentoDeLaImpresion = { caida: 0, compacto: 0, cuerpo: 0, glifos: 0, viva: false },
): MomentoDeLaImpresion {
  const e = t - inicio;
  m.viva = e >= 0 && e < IMPRESION_MS + COLA_DE_LOS_GLIFOS_MS;
  m.caida = suave(e / CAIDA_DE_LA_IMPRESION_MS);
  m.compacto = suave((e - CAIDA_DE_LA_IMPRESION_MS * 0.8) / (IMPRESION_MS - CAIDA_DE_LA_IMPRESION_MS * 0.8));
  m.cuerpo = e >= IMPRESION_MS ? 1 : entre01((e - IMPRESION_MS * 0.55) / (IMPRESION_MS * 0.45));
  m.glifos = e < 0 ? 0 : e < IMPRESION_MS ? 1 : 1 - entre01((e - IMPRESION_MS) / COLA_DE_LOS_GLIFOS_MS);
  return m;
}

/** El desalojo: dura lo que el REMATE, 24 tics (1,2 s), y los glifos siguen subiendo un poco más. */
export const DESALOJO_MS = 1200;
export const COLA_DEL_DESALOJO_MS = 500;

export interface MomentoDelDesalojo {
  /** Frente que sube por el cuerpo: por debajo ya no hay cuerpo, sólo glifos que suben. */
  erosion: number;
  /** Cuánto queda de cuerpo (para `personajes/`). */
  cuerpo: number;
  glifos: number;
  viva: boolean;
}

export function desalojoEn(
  t: number,
  inicio: number,
  m: MomentoDelDesalojo = { erosion: 0, cuerpo: 1, glifos: 0, viva: false },
): MomentoDelDesalojo {
  const e = t - inicio;
  m.viva = e >= 0 && e < DESALOJO_MS + COLA_DEL_DESALOJO_MS;
  m.erosion = suave(e / DESALOJO_MS);
  m.cuerpo = 1 - m.erosion;
  m.glifos = e < 0 ? 0 : e < DESALOJO_MS ? Math.min(1, e / 150) : 1 - entre01((e - DESALOJO_MS) / COLA_DEL_DESALOJO_MS);
  return m;
}

/** El Trasvase: 0,6 s de hilos (diseño §4.8) y un apagado corto. */
export const TRASVASE_MS = 600;
export const APAGADO_DEL_TRASVASE_MS = 220;

export interface MomentoDelTrasvase {
  /** Por dónde va el frente de los glifos en los hilos, del Prestado (0) al Celador (1). */
  flujo: number;
  brillo: number;
  /** Cuánto se ha apagado ya el Prestado (para `personajes/`). */
  prestadoApagado: number;
  viva: boolean;
}

export function trasvaseEn(
  t: number,
  inicio: number,
  m: MomentoDelTrasvase = { flujo: 0, brillo: 0, prestadoApagado: 0, viva: false },
): MomentoDelTrasvase {
  const e = t - inicio;
  m.viva = e >= 0 && e < TRASVASE_MS + APAGADO_DEL_TRASVASE_MS;
  m.flujo = entre01(e / (TRASVASE_MS * 0.7));
  m.brillo = e < 0 ? 0 : e < TRASVASE_MS ? Math.min(1, e / 80) : 1 - entre01((e - TRASVASE_MS) / APAGADO_DEL_TRASVASE_MS);
  m.prestadoApagado = suave(e / TRASVASE_MS);
  return m;
}

/** El Bis: dos veces el mismo segundo, con entrada y salida (diseño §8, momento 7). */
export const RADIO_DEL_BIS = 20;
export const ALTO_DEL_MURO_DEL_BIS = 7;
export const SEGUNDO_REPETIDO_MS = 1000;
export const ENTRADA_DEL_BIS_MS = 200;
export const BIS_MS = ENTRADA_DEL_BIS_MS * 2 + SEGUNDO_REPETIDO_MS * 2;

export interface MomentoDelBis {
  /** Presencia del muro, 0 a 1. */
  muro: number;
  /** Cuál de las dos pasadas: 0, 1, o −1 en la entrada y la salida. */
  pasada: number;
  /**
   * El tiempo que ven los glifos del muro: en las dos pasadas es EL MISMO segundo, que es lo que
   * hace que el muro «se repita» y no sólo parpadee.
   */
  tiempoRepetido: number;
  /** Intensidad del marco en pantalla: dos pulsos iguales, uno por pasada. */
  marco: number;
  viva: boolean;
}

export function bisEn(
  t: number,
  inicio: number,
  m: MomentoDelBis = { muro: 0, pasada: -1, tiempoRepetido: 0, marco: 0, viva: false },
): MomentoDelBis {
  const e = t - inicio;
  m.viva = e >= 0 && e < BIS_MS;
  m.muro = e < 0 ? 0 : e < ENTRADA_DEL_BIS_MS ? e / ENTRADA_DEL_BIS_MS : e < BIS_MS - ENTRADA_DEL_BIS_MS ? 1 : entre01((BIS_MS - e) / ENTRADA_DEL_BIS_MS);
  const dentro = e - ENTRADA_DEL_BIS_MS;
  m.pasada = dentro >= 0 && dentro < 2 * SEGUNDO_REPETIDO_MS ? Math.floor(dentro / SEGUNDO_REPETIDO_MS) : -1;
  const enLaPasada = m.pasada >= 0 ? dentro - m.pasada * SEGUNDO_REPETIDO_MS : 0;
  m.tiempoRepetido = m.pasada >= 0 ? inicio + ENTRADA_DEL_BIS_MS + enLaPasada : t;
  /* El pulso del marco: sube en 60 ms y cae en 500, igual en las dos pasadas. */
  m.marco = m.pasada >= 0 ? (enLaPasada < 60 ? enLaPasada / 60 : Math.max(0, 1 - (enLaPasada - 60) / 500)) : 0;
  return m;
}

/** La salida por la cabina. */
export const SALIDA_MS = 1400;

export interface MomentoDeLaSalida {
  /** Frente que sube por el cuerpo al deshacerse. */
  disolucion: number;
  /** Por dónde van los glifos por el cable, de 0 (auricular) a 1 (arriba del todo). */
  cable: number;
  cuerpo: number;
  glifos: number;
  viva: boolean;
}

export function salidaEn(
  t: number,
  inicio: number,
  m: MomentoDeLaSalida = { disolucion: 0, cable: 0, cuerpo: 1, glifos: 0, viva: false },
): MomentoDeLaSalida {
  const e = t - inicio;
  m.viva = e >= 0 && e < SALIDA_MS;
  m.disolucion = suave(e / (SALIDA_MS * 0.55));
  m.cable = entre01((e - SALIDA_MS * 0.2) / (SALIDA_MS * 0.7));
  m.cuerpo = 1 - m.disolucion;
  m.glifos = e < 0 ? 0 : e < SALIDA_MS * 0.85 ? Math.min(1, e / 120) : 1 - entre01((e - SALIDA_MS * 0.85) / (SALIDA_MS * 0.15));
  return m;
}

/** El haz de la cabina que suena. */
export const ALTO_DEL_HAZ = 70;
export const ANCHO_DEL_HAZ = 2.4;
/**
 * El timbre del teléfono de siempre: suena 1,5 s y calla 3 s. El haz late con él, para que quien
 * juega sin sonido «oiga» la cabina con los ojos (diseño §9, accesibilidad).
 */
export const TIMBRE_SUENA_MS = 1500;
export const TIMBRE_CALLA_MS = 3000;
export function timbreDeLaCabina(t: number, inicio: number): number {
  const e = t - inicio;
  if (e < 0) return 0;
  const ciclo = e % (TIMBRE_SUENA_MS + TIMBRE_CALLA_MS);
  if (ciclo >= TIMBRE_SUENA_MS) return 0;
  /* Dentro del timbre, el martillo: dos golpes por cada 0,1 s se ven como un temblor. */
  return 0.75 + 0.25 * (Math.floor(ciclo / 50) % 2);
}

/* ─────────────────────────────── Las siluetas ─────────────────────────────── */

/**
 * Las siluetas con que se compacta la impresión y se deshace un cuerpo. Las cuatro de los
 * Celadores son las del diseño (§1): alto y enjuto, ancho, mujer y mayor con sombrero; la quinta es
 * la del desvelado con su gabardina, para la salida por la cabina. En metros.
 */
export interface Silueta {
  readonly nombre: string;
  readonly alto: number;
  /** Medio ancho de hombros. */
  readonly hombros: number;
  /** Medio ancho de cadera. */
  readonly cadera: number;
  /** 0 nada; 1 sombrero; 2 falda; 3 faldón de gabardina. */
  readonly prenda: 0 | 1 | 2 | 3;
}

export const SILUETAS: readonly Silueta[] = [
  { nombre: 'alto y enjuto', alto: 1.92, hombros: 0.19, cadera: 0.13, prenda: 0 },
  { nombre: 'ancho', alto: 1.8, hombros: 0.28, cadera: 0.21, prenda: 0 },
  { nombre: 'mujer', alto: 1.72, hombros: 0.19, cadera: 0.19, prenda: 2 },
  { nombre: 'mayor con sombrero', alto: 1.76, hombros: 0.22, cadera: 0.19, prenda: 1 },
  { nombre: 'desvelado', alto: 1.8, hombros: 0.22, cadera: 0.17, prenda: 3 },
];

/* ─────────────────────────────── Las esquirlas ─────────────────────────────── */

/** Altura a la que flotan. */
export const ALTURA_DE_LA_ESQUIRLA = 0.5;
/** Cuánto suben y bajan. */
export const VAIVEN_DE_LA_ESQUIRLA = 0.09;
/** Lo que dura el salto desde el cuerpo hasta su sitio. */
export const SALTO_DE_LA_ESQUIRLA_MS = 420;
/** Lo que dura la recogida: sube hacia quien la coge y se apaga. */
export const RECOGIDA_DE_LA_ESQUIRLA_MS = 260;

/**
 * Dónde cae la esquirla `i` de `n` alrededor del sitio del montón: en corona, entre 0,3 y 0,8 m,
 * repartidas en ángulo y con algo de azar sembrado. Dentro del radio de recogida (1,2 m) siempre:
 * la esquirla que se ve es la que se coge.
 */
export function dondeCaeLaEsquirla(i: number, n: number, semilla: number): { dx: number; dz: number } {
  const angulo = ((i + azarDe(semilla, i * 2 + 1) * 0.6) / Math.max(1, n)) * Math.PI * 2;
  const radio = 0.3 + 0.5 * azarDe(semilla, i * 2 + 2);
  return { dx: Math.cos(angulo) * radio, dz: Math.sin(angulo) * radio };
}

/* ─────────────────────────────── El cielo ─────────────────────────────── */

/** Las columnas del cielo viven entre estas distancias del centro: detrás de la niebla del barrio. */
export const CIELO_CERCA = 170;
export const CIELO_LEJOS = 290;

export interface ColumnaDelCielo {
  readonly x: number;
  readonly z: number;
  /** Altura de la base (las columnas nacen detrás de los tejados, no en el suelo). */
  readonly base: number;
  readonly alto: number;
  readonly ancho: number;
  /** Filas por segundo que suben. */
  readonly velocidad: number;
}

/** Las `n` columnas del cielo, siempre las mismas para la misma semilla. */
export function columnasDelCielo(n: number, semilla: number): ColumnaDelCielo[] {
  const salen: ColumnaDelCielo[] = [];
  for (let i = 0; i < n; i++) {
    const angulo = ((i + azarDe(semilla, i * 5 + 1)) / n) * Math.PI * 2;
    const d = CIELO_CERCA + (CIELO_LEJOS - CIELO_CERCA) * azarDe(semilla, i * 5 + 2);
    salen.push({
      x: Math.cos(angulo) * d,
      z: Math.sin(angulo) * d,
      base: 12 + 30 * azarDe(semilla, i * 5 + 3),
      alto: 50 + 70 * azarDe(semilla, i * 5 + 4),
      ancho: 2.2 + 2.6 * azarDe(semilla, i * 5 + 5),
      velocidad: 2.5 + 4 * azarDe(semilla, i * 5 + 6),
    });
  }
  return salen;
}
