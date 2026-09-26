/**
 * EL APUNTADO DEL RAYO: a quién va, adónde se mira y cómo ayuda la mano (`docs/quiebro/EL-RAYO.md` §1.1 y §3).
 *
 * ═══ SE ELIGE EN LA PANTALLA, NO EN EL SUELO ═══
 *
 * El enganche de los golpes (`enganche.ts`) elige en el suelo: cerca y de frente a la palanca. El rayo no: el
 * jugador APUNTA, y lo que quiere es lo que tiene debajo de la mira. Así que el blanco es el enemigo cuyo pecho
 * cae más cerca del centro de la PANTALLA —no el que está más de frente al giro de la cámara: el hombro a 0,7 m
 * desvía la línea de la mira entre 4° y 8° de la del cuerpo, y un Celador a 3 m a la izquierda de la mira puede
 * estar «más de frente» que el que se tiene encima—. Y sólo los que el rayo alcanzaría AHORA: dentro del alcance
 * del nivel que saldría al soltar (crece con la carga: un blanco lejano se engancha cuando la carga ya llega) y
 * con línea de vista desde el cuerpo, con la prueba de losa de la sala (la misma que mira ella al aceptarlo).
 *
 * ═══ QUE NO SALTE ═══
 *
 * Dos enemigos casi a la misma distancia de la mira harían bailar las marcas entre uno y otro con un temblor del
 * pulgar. El que ya estaba enganchado tiene ventaja (`HISTERESIS_DEL_BLANCO`) y se le sigue viendo en un círculo
 * más ancho (`ENSANCHE_DEL_ANTERIOR`): para cambiar hay que llevar la mira claramente al otro.
 *
 * ═══ EL IMÁN ═══
 *
 * Suave, y sólo con un blanco enganchado: la mano frena al cruzarlo (`friccionDelIman`: el giro del dedo vale
 * menos cerca de él) y la vista se deja caer un poco hacia él (`tironDelIman`, con constante de 0,35 s y nada en
 * el borde del imán). Nunca lo clava: el que quiera irse, se va.
 *
 * ═══ LA MIRA EN PANTALLA ═══
 *
 * Lo que se proyecta se cuenta en MEDIAS ALTURAS de pantalla desde el centro (`u` a la derecha, `v` arriba): una
 * medida que no depende de los píxeles del aparato, y que por la altura en píxeles entre dos da píxeles. El ojo
 * (`OjoDelRayo`) es la cámara del fotograma escrita en números, sin three: esto se prueba en Node.
 *
 * Puro: metros y radianes (el aparato elige; la sala acepta), Q16.16 sólo para preguntar a la losa.
 */
import { UNO } from '../../../../shared/mecanicas/fijo';
import { primeraLosa, TOPE_DE_LA_LIZA, TOPE_DE_RADIO } from '../../../../shared/mecanicas/liza/geometria';
import type { Candidato } from './enganche';
import { anguloEntre, direccionHacia } from './enganche';

/* ─────────────────────────────── El ojo y la pantalla ─────────────────────────────── */

/**
 * LA CÁMARA DEL FOTOGRAMA, EN NÚMEROS: dónde está, sus tres ejes (unitarios) y su campo. La escribe `Camara.tsx`
 * al acabar de ponerse, en un objeto que se reutiliza.
 */
export interface OjoDelRayo {
  x: number;
  y: number;
  z: number;
  /** Hacia dónde mira, su derecha y su arriba (unitarios, en el mundo). */
  fx: number;
  fy: number;
  fz: number;
  rx: number;
  ry: number;
  rz: number;
  ux: number;
  uy: number;
  uz: number;
  /** tan(campo vertical / 2), y el ancho entre el alto de la pantalla. */
  tanMedio: number;
  aspecto: number;
}

export function ojoNuevo(): OjoDelRayo {
  return { x: 0, y: 0, z: 0, fx: 0, fy: 0, fz: -1, rx: 1, ry: 0, rz: 0, ux: 0, uy: 1, uz: 0, tanMedio: Math.tan((75 * Math.PI) / 360), aspecto: 16 / 9 };
}

/** Un punto proyectado: en medias alturas desde el centro (`u` a la derecha, `v` arriba) y a qué profundidad (m). */
export interface EnPantalla {
  u: number;
  v: number;
  profundidad: number;
}

export function enPantallaNuevo(): EnPantalla {
  return { u: 0, v: 0, profundidad: 0 };
}

/** Lo más cerca de la cámara que se proyecta algo (lo de detrás, o pegado al plano cercano, no está en pantalla). */
const PROFUNDIDAD_MINIMA = 0.3;

/** PROYECTA un punto del mundo con el ojo. `false` si está detrás (o encima) de la cámara; `salida` no vale entonces. */
export function proyectar(ojo: OjoDelRayo, x: number, y: number, z: number, salida: EnPantalla): boolean {
  const dx = x - ojo.x;
  const dy = y - ojo.y;
  const dz = z - ojo.z;
  const p = dx * ojo.fx + dy * ojo.fy + dz * ojo.fz;
  if (!(p > PROFUNDIDAD_MINIMA)) return false;
  const escala = 1 / (p * ojo.tanMedio);
  salida.u = (dx * ojo.rx + dy * ojo.ry + dz * ojo.rz) * escala;
  salida.v = (dx * ojo.ux + dy * ojo.uy + dz * ojo.uz) * escala;
  salida.profundidad = p;
  return true;
}

/** ¿Cae dentro de la pantalla? (con un margen, en medias alturas, que puede ser negativo). */
export function dentroDeLaPantalla(ojo: OjoDelRayo, e: EnPantalla, margen = 0): boolean {
  return Math.abs(e.u) <= ojo.aspecto + margen && Math.abs(e.v) <= 1 + margen;
}

/** CUÁNTO MIDE EN PANTALLA un radio de `metros` a `profundidad` m de la cámara, en medias alturas. */
export function radioEnPantalla(ojo: OjoDelRayo, metros: number, profundidad: number): number {
  if (!(profundidad > PROFUNDIDAD_MINIMA) || !(metros > 0)) return 0;
  return metros / (profundidad * ojo.tanMedio);
}

/* ─────────────────────────────── El blanco ─────────────────────────────── */

/** A qué altura se mira un cuerpo: el pecho (donde el rayo lo toca y donde van las marcas). */
export const ALTO_DEL_BLANCO = 1.25;
/**
 * Hasta dónde se engancha mientras se carga: a menos de esto de la mira, en medias alturas (0,2 son 39 px en un
 * teléfono tumbado de 390 de alto). Con área se ensancha con ella (`radioDeEnganche`): un chispazo de 3 m perdona
 * más que un pleno, que es una línea.
 */
export const RADIO_DE_ENGANCHE = 0.2;
export const RADIO_DE_ENGANCHE_MAXIMO = 0.42;
/** La ventaja del blanco que ya estaba, en medias alturas, y cuánto más ancho se le sigue viendo. */
export const HISTERESIS_DEL_BLANCO = 0.07;
export const ENSANCHE_DEL_ANTERIOR = 1.5;

/** El círculo de enganche con un área de `areaEnPantalla` medias alturas alrededor del blanco. */
export function radioDeEnganche(areaEnPantalla: number): number {
  return Math.min(RADIO_DE_ENGANCHE_MAXIMO, RADIO_DE_ENGANCHE + 0.5 * Math.max(0, areaEnPantalla));
}

export interface PeticionDelBlanco {
  readonly ojo: OjoDelRayo;
  /** Dónde estoy (metros): el rayo sale de aquí, y desde aquí se mide el alcance y la vista. */
  readonly x: number;
  readonly z: number;
  /** El alcance del nivel que saldría ahora (metros). */
  readonly alcance: number;
  /** Hasta dónde se busca, en medias alturas desde la mira (el de entrada: la pantalla entera). */
  readonly radio: number;
  /** El que ya estaba enganchado (0 = ninguno). */
  readonly anterior: number;
  /** Las cajas de la estructura, planas en Q16.16 (`Arena.cuerpos`), para la línea de vista. */
  readonly cuerpos: ArrayLike<number>;
}

function aFijo(m: number): number {
  const v = Math.round(m * UNO);
  return v > TOPE_DE_LA_LIZA ? TOPE_DE_LA_LIZA : v < -TOPE_DE_LA_LIZA ? -TOPE_DE_LA_LIZA : v;
}

/** ¿Se ve (x2, z2) desde (x1, z1)? Con la losa de la sala; lo que no se puede preguntar, no se ve. */
export function seVe(cuerpos: ArrayLike<number>, x1: number, z1: number, x2: number, z2: number): boolean {
  try {
    return primeraLosa(cuerpos, aFijo(x1), aFijo(z1), aFijo(x2), aFijo(z2), 0) === null;
  } catch {
    return false;
  }
}

const proyeccion = enPantallaNuevo();

/* ─────────────────────────────── El cuerpo propio, en la pantalla ─────────────────────────────── */

/*
 * ═══ EL PROPIO CUERPO TAMBIÉN TAPA ═══
 *
 * La cámara va al hombro y el cuerpo propio ocupa un buen trozo de pantalla a la izquierda de la mira. Un blanco que
 * queda DETRÁS de él (en la pantalla, dentro de su silueta, y más lejos de la cámara) no se ve: se le pintaba la mira
 * encima de la espalda, y seguía enganchado con la ventaja del anterior. Así que el cuerpo propio es una ocultación
 * más, como una pared, pero en la pantalla:
 *   · LA SILUETA es una cápsula de pie en el sitio del cuerpo: su eje de `PIE_DE_LA_SILUETA` a `CABEZA_DE_LA_SILUETA`
 *     y `RADIO_DE_LA_SILUETA` de radio (de 0 a 1,9 m de alto y hombros con codos: lo que se ve de una persona de pie
 *     o cargando), proyectada con el ojo: su eje, y el radio a la profundidad del cuerpo.
 *   · NO SE ENGANCHA un candidato cuyo pecho proyectado cae dentro de la FRANJA (la silueta ensanchada
 *     `FRANJA_DE_LA_SILUETA` veces) y está detrás del cuerpo; y el que YA estaba enganchado se SUELTA en cuanto su
 *     pecho entra en la silueta misma. Entre las dos, la franja: el enganchado se queda, y el imán
 *     (`empujeFueraDeLaSilueta`) gira la vista para sacarlo de ella por el lado más corto.
 */
export const RADIO_DE_LA_SILUETA = 0.3;
export const PIE_DE_LA_SILUETA = 0.3;
export const CABEZA_DE_LA_SILUETA = 1.6;
export const FRANJA_DE_LA_SILUETA = 1.5;
/** Lo que tarda el imán en sacar al blanco de la franja (constante de tiempo, s): más firme que el tirón a la mira. */
export const TAU_FUERA_DE_LA_SILUETA_S = 0.12;

/** La silueta propia proyectada: su eje (de los pies a la cabeza) y su radio, en medias alturas; y su profundidad. */
export interface SiluetaEnPantalla {
  pu: number;
  pv: number;
  cu: number;
  cv: number;
  radio: number;
  profundidad: number;
}

export function siluetaNueva(): SiluetaEnPantalla {
  return { pu: 0, pv: 0, cu: 0, cv: 0, radio: 0, profundidad: 0 };
}

const pieProyectado = enPantallaNuevo();
const cabezaProyectada = enPantallaNuevo();
const centroProyectado = enPantallaNuevo();

/** PROYECTA LA SILUETA del cuerpo que está en `(x, z)`. `false` si el cuerpo no queda delante de la cámara. */
export function siluetaEnPantalla(ojo: OjoDelRayo, x: number, z: number, salida: SiluetaEnPantalla): boolean {
  if (!proyectar(ojo, x, (PIE_DE_LA_SILUETA + CABEZA_DE_LA_SILUETA) / 2, z, centroProyectado)) return false;
  if (!proyectar(ojo, x, PIE_DE_LA_SILUETA, z, pieProyectado)) return false;
  if (!proyectar(ojo, x, CABEZA_DE_LA_SILUETA, z, cabezaProyectada)) return false;
  salida.pu = pieProyectado.u;
  salida.pv = pieProyectado.v;
  salida.cu = cabezaProyectada.u;
  salida.cv = cabezaProyectada.v;
  salida.profundidad = centroProyectado.profundidad;
  salida.radio = radioEnPantalla(ojo, RADIO_DE_LA_SILUETA, centroProyectado.profundidad);
  return true;
}

/** Lo que dista (en medias alturas) el punto `(u, v)` del EJE de la silueta: dentro de ella si es menos que su radio. */
export function distanciaAlEje(s: SiluetaEnPantalla, u: number, v: number): number {
  const ax = s.cu - s.pu;
  const ay = s.cv - s.pv;
  const l2 = ax * ax + ay * ay;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((u - s.pu) * ax + (v - s.pv) * ay) / l2)) : 0;
  return Math.hypot(u - (s.pu + ax * t), v - (s.pv + ay * t));
}

/** ¿Está el punto `e` (proyectado) DETRÁS de la silueta `s` y a menos de `ensanche` radios de su eje? */
export function detrasDeLaSilueta(s: SiluetaEnPantalla, e: EnPantalla, ensanche: number): boolean {
  return e.profundidad > s.profundidad && distanciaAlEje(s, e.u, e.v) < s.radio * ensanche;
}

const silueta = siluetaNueva();
const siluetaDelBlanco = siluetaNueva();
const pechoDelBlanco = enPantallaNuevo();

/**
 * EL IMÁN FUERA DE LA SILUETA: lo que gira la vista en `dt` s (radianes, con signo, convenio de `andar.ts`) para sacar
 * de la franja de mi silueta (el cuerpo en `(x, z)`) al blanco enganchado que está en `(bx, bz)`, por el lado en que
 * ya está (el más corto); 0 si no está en ella, o si está delante de mí. El cuerpo no se mueve en la pantalla al girar
 * (la cámara orbita el hombro), así que basta con girar lo que el blanco tiene que correrse en ella.
 */
export function empujeFueraDeLaSilueta(ojo: OjoDelRayo, x: number, z: number, bx: number, bz: number, dt: number): number {
  if (!(dt > 0)) return 0;
  if (!siluetaEnPantalla(ojo, x, z, siluetaDelBlanco)) return 0;
  if (!proyectar(ojo, bx, ALTO_DEL_BLANCO, bz, pechoDelBlanco)) return 0;
  const s = siluetaDelBlanco;
  const e = pechoDelBlanco;
  const franja = s.radio * FRANJA_DE_LA_SILUETA;
  if (!detrasDeLaSilueta(s, e, FRANJA_DE_LA_SILUETA)) return 0;
  /* El punto del eje más cercano, y lo que la franja tiene de ancho a la altura del blanco. */
  const ax = s.cu - s.pu;
  const ay = s.cv - s.pv;
  const l2 = ax * ax + ay * ay;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((e.u - s.pu) * ax + (e.v - s.pv) * ay) / l2)) : 0;
  const eu = s.pu + ax * t;
  const ev = s.pv + ay * t;
  const medio = Math.sqrt(Math.max(0, franja * franja - (e.v - ev) * (e.v - ev)));
  /* Por el lado en que está; justo en el eje, hacia la mira. */
  const aLaDerecha = e.u > eu || (e.u === eu && eu < 0);
  const quiere = aLaDerecha ? eu + medio + 0.01 : eu - medio - 0.01;
  /* Girar δ corre el blanco en la pantalla de atan(u·tan) a atan(u·tan) − δ. */
  const falta = Math.atan(e.u * ojo.tanMedio) - Math.atan(quiere * ojo.tanMedio);
  return falta * (1 - Math.exp(-dt / TAU_FUERA_DE_LA_SILUETA_S));
}

/**
 * EL BLANCO DEL RAYO: el candidato cuyo pecho cae más cerca de la mira en la pantalla, dentro de `radio`, del
 * alcance, a la vista y NO detrás del cuerpo propio (el que está en `(p.x, p.z)`: ver arriba); con ventaja para el
 * anterior. 0 si ninguno.
 */
export function elegirBlancoDelRayo(p: PeticionDelBlanco, candidatos: Iterable<Candidato>): number {
  let mejor = 0;
  let mejorNota = Number.POSITIVE_INFINITY;
  const alcance = Math.max(0, p.alcance);
  /*
   * La silueta propia oculta mientras se APUNTA; no en la elección de ENTRADA (un radio que abarca la pantalla entera):
   * justo después la cámara gira y pone ese blanco bajo la mira, fuera de mi cuerpo.
   */
  const alEmpezar = p.radio > p.ojo.aspecto;
  const conSilueta = !alEmpezar && siluetaEnPantalla(p.ojo, p.x, p.z, silueta);
  for (const c of candidatos) {
    const lejos = Math.hypot(c.x - p.x, c.z - p.z);
    if (lejos > alcance) continue;
    if (!proyectar(p.ojo, c.x, ALTO_DEL_BLANCO, c.z, proyeccion)) continue;
    const esElAnterior = c.numero === p.anterior && p.anterior !== 0;
    const d = Math.hypot(proyeccion.u, proyeccion.v);
    if (d > p.radio * (esElAnterior ? ENSANCHE_DEL_ANTERIOR : 1)) continue;
    if (!dentroDeLaPantalla(p.ojo, proyeccion, 0.05)) continue;
    const nota = esElAnterior ? d - HISTERESIS_DEL_BLANCO : d;
    if (nota >= mejorNota) continue;
    /* Detrás de mí no: el nuevo, ni en la franja; el que ya estaba, en cuanto entra en la silueta. */
    if (conSilueta && detrasDeLaSilueta(silueta, proyeccion, esElAnterior ? 1 : FRANJA_DE_LA_SILUETA)) continue;
    if (!seVe(p.cuerpos, p.x, p.z, c.x, c.z)) continue;
    mejor = c.numero;
    mejorNota = nota;
  }
  return mejor;
}

/* ─────────────────────────────── Adónde se apunta ─────────────────────────────── */

/** Lo que se toca apuntando: el punto (metros) y si es la estructura (`true`) o el final del alcance. */
export interface Apuntado {
  x: number;
  z: number;
  choca: boolean;
  /** El rumbo del rayo desde el cuerpo hasta ahí (radianes, convenio de `andar.ts`). */
  direccion: number;
}

export function apuntadoNuevo(): Apuntado {
  return { x: 0, z: 0, choca: false, direccion: 0 };
}

/**
 * ADÓNDE VA EL RAYO SIN BLANCO: por la línea de la mira. La mira es el centro de la pantalla, y su línea en el
 * suelo pasa por el hombro, no por el cuerpo; el rayo sale del cuerpo. Así que se busca en la línea de la mira el
 * punto donde se cruzan: el de la primera pared que la mira toca delante del cuerpo o, sin pared, el que está a
 * `alcance` del cuerpo; el rayo va del cuerpo hacia ahí, y se para en lo primero que toque por su camino (con el
 * radio de su bala contra la estructura, como en la sala). Escribe en `salida`; devuelve `false` si la cámara mira
 * en vertical y no hay línea que seguir (entonces `salida` no se toca).
 */
export function apuntarPorLaMira(
  ojo: OjoDelRayo,
  x: number,
  z: number,
  alcance: number,
  radioContraLaEstructura: number,
  cuerpos: ArrayLike<number>,
  salida: Apuntado,
): boolean {
  const largo = Math.hypot(ojo.fx, ojo.fz);
  if (!(largo > 1e-3) || !(alcance > 0)) return false;
  const fx = ojo.fx / largo;
  const fz = ojo.fz / largo;
  /* La línea de la mira en el suelo: C + s·f. Desde el punto de ella más cercano al cuerpo, hacia delante. */
  const wx = ojo.x - x;
  const wz = ojo.z - z;
  const b = wx * fx + wz * fz;
  const disc = b * b - (wx * wx + wz * wz) + alcance * alcance;
  if (!(disc >= 0)) return false;
  const sLejos = -b + Math.sqrt(disc);
  const sCerca = Math.max(-b, 0);
  let qx = ojo.x + fx * sLejos;
  let qz = ojo.z + fz * sLejos;
  let choca = false;
  try {
    const c = primeraLosa(cuerpos, aFijo(ojo.x + fx * sCerca), aFijo(ojo.z + fz * sCerca), aFijo(qx), aFijo(qz), 0);
    if (c !== null) {
      const f = sCerca + ((sLejos - sCerca) * c.fraccion) / UNO;
      qx = ojo.x + fx * f;
      qz = ojo.z + fz * f;
      choca = true;
    }
  } catch {
    /* Fuera de lo que la losa sabe contar: sin pared. */
  }
  const direccion = direccionHacia(qx - x, qz - z);
  /* Y el rayo desde el cuerpo: lo primero que toque de camino (como mucho, el punto de la mira). */
  const lejos = Math.hypot(qx - x, qz - z);
  let px = qx;
  let pz = qz;
  if (lejos > 1e-3) {
    try {
      const radio = Math.min(TOPE_DE_RADIO, Math.max(0, Math.round(radioContraLaEstructura * UNO)));
      const c = primeraLosa(cuerpos, aFijo(x), aFijo(z), aFijo(qx), aFijo(qz), radio);
      if (c !== null) {
        px = x + ((qx - x) * c.fraccion) / UNO;
        pz = z + ((qz - z) * c.fraccion) / UNO;
        choca = true;
      }
    } catch {
      /* Ver arriba. */
    }
  }
  salida.x = px;
  salida.z = pz;
  salida.choca = choca;
  salida.direccion = direccion;
  return true;
}

/* ─────────────────────────────── La cámara que ayuda ─────────────────────────────── */

/**
 * EL GIRO DE CÁMARA QUE PONE UN PUNTO BAJO LA MIRA: la línea de la mira en el suelo va por el hombro (a `hombro`
 * m a la derecha del cuerpo) en la dirección del giro, así que el punto `(bx, bz)` queda en ella cuando el giro es
 * el rumbo hacia él menos el ángulo que abre el hombro a esa distancia. A menos del hombro, el rumbo tal cual.
 */
export function giroParaApuntar(x: number, z: number, bx: number, bz: number, hombro: number): number {
  const dx = bx - x;
  const dz = bz - z;
  const d = Math.hypot(dx, dz);
  const rumbo = direccionHacia(dx, dz);
  if (d <= hombro + 1e-6) return rumbo;
  return rumbo - Math.atan2(hombro, Math.sqrt(d * d - hombro * hombro));
}

/** Lo que dura el giro de entrada (EL-RAYO.md §1.1: ≈0,18 s). */
export const GIRO_DE_ENTRADA_MS = 180;

/**
 * EL GIRO DE ENTRADA: al empezar a cargar, la cámara va al blanco más a mano en una curva SUAVE de 180 ms —arranca y
 * llega con velocidad cero (`suave`), así que el primer fotograma apenas gira y el mayor tirón está a mitad—, no con
 * una exponencial que arranca a toda velocidad (con 63° de giro, 18° en el primer fotograma: un latigazo).
 *   · La curva empieza cuando hay blanco (el primer fotograma de la carga todavía no lo tiene) y vuelve a empezar si
 *     el blanco CAMBIA dentro de la ventana de entrada (`hastaMs`, la de elegir en toda la pantalla); fuera de ella
 *     un blanco nuevo no se persigue: lo acerca el imán.
 *   · Cada fotograma gira la parte de lo que FALTA que le toca a la curva: si el blanco se mueve o el dedo empuja,
 *     sigue siendo suave y llega igual a los 180 ms.
 */
export interface GiroDeEntrada {
  /** Hasta cuándo se elige blanco en toda la pantalla (180 ms desde que se pulsó). */
  readonly hastaMs: number;
  /** El blanco de la curva en curso (0 = ninguno aún), desde cuándo y el último fotograma. */
  blanco: number;
  desdeMs: number;
  antesMs: number;
}

export function giroDeEntrada(ahora: number): GiroDeEntrada {
  return { hastaMs: ahora + GIRO_DE_ENTRADA_MS, blanco: 0, desdeMs: ahora, antesMs: ahora };
}

/**
 * Lo que gira la entrada en este fotograma (radianes, con signo) hacia `blanco`, a `desvio` de la cámara; o `null` si
 * la entrada no manda (sin blanco, o ya acabó su curva: entonces tira el imán).
 */
export function pasoDelGiroDeEntrada(g: GiroDeEntrada, blanco: number, desvio: number, ahora: number): number | null {
  if (blanco !== 0 && blanco !== g.blanco && ahora < g.hastaMs) {
    g.blanco = blanco;
    g.desdeMs = ahora;
    g.antesMs = ahora;
  }
  if (g.blanco === 0 || blanco !== g.blanco || !Number.isFinite(desvio)) return null;
  const k0 = (g.antesMs - g.desdeMs) / GIRO_DE_ENTRADA_MS;
  const k1 = (ahora - g.desdeMs) / GIRO_DE_ENTRADA_MS;
  g.antesMs = ahora;
  if (k0 >= 1) return null;
  const s0 = suave(k0);
  return (desvio * (suave(k1) - s0)) / (1 - s0);
}

/** El ángulo del imán: a más de esto del blanco (en giro de cámara), ni frena ni tira. */
export const RADIO_DEL_IMAN = (6 * Math.PI) / 180;
/** Lo que vale el dedo justo encima del blanco (el 55 %), y la constante con que tira. */
export const FRICCION_EN_EL_BLANCO = 0.55;
export const TAU_DEL_TIRON_S = 0.35;

function suave(t: number): number {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return x * x * (3 - 2 * x);
}

/** Lo que vale el giro del dedo a `desvio` radianes del blanco: menos cerca de él, entero fuera del imán. */
export function friccionDelIman(desvio: number): number {
  const a = Math.abs(desvio);
  if (!Number.isFinite(a)) return 1;
  return FRICCION_EN_EL_BLANCO + (1 - FRICCION_EN_EL_BLANCO) * suave(a / RADIO_DEL_IMAN);
}

/** Lo que la vista se deja caer hacia el blanco en `dt` s (radianes, con signo): leve, y nada en el borde. */
export function tironDelIman(desvio: number, dt: number): number {
  const a = Math.abs(desvio);
  if (!Number.isFinite(a) || a >= RADIO_DEL_IMAN || !(dt > 0)) return 0;
  const peso = 1 - suave(a / RADIO_DEL_IMAN);
  return desvio * peso * (1 - Math.exp(-dt / TAU_DEL_TIRON_S));
}

/** El ángulo con signo que le falta al giro `giro` para llegar a `quiere` (−π..π). */
export function desvioDeGiro(giro: number, quiere: number): number {
  const d = anguloEntre(giro, quiere);
  const s = Math.sin(quiere - giro);
  return s < 0 ? -d : d;
}
