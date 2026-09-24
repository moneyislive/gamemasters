/**
 * LA CÁMARA DEL QUIEBRO, EN NÚMEROS: al hombro, que no atraviesa la ciudad, que encuadra sola y que
 * sube a vigía. Sin three: sale un punto, un punto al que mirar y un campo de visión.
 *
 * ═══ LO QUE PIDE EL DISEÑO (§7) Y CÓMO SE CUMPLE ═══
 *
 *   · AL HOMBRO, 3,2 m detrás y 1,7 m de alto, algo a la derecha para que el cuerpo no tape el blanco.
 *     Se abre a 4 m con enemigos a menos de 5 m: en una pelea hace falta ver quién viene por los lados.
 *     No se balancea al correr: el cuerpo corre, la cámara no (marea en un teléfono).
 *   · NO ATRAVIESA LA ESTRUCTURA. Del pecho del desvelado a donde querría estar la cámara se tira un
 *     tramo y se prueba contra las cajas del barrio como cajas DE VERDAD, con su alto: la prueba de losa
 *     de siempre, en tres ejes. Si choca, la cámara se pone delante del choque. Acercarse es inmediato
 *     (una pared no puede asomar ni un fotograma); alejarse otra vez, suave.
 *   · AUTOMÁTICA: si hay un blanco enganchado y el dedo no ha tocado la cámara en 2 s, gira sola para
 *     tenerlo delante. Si el dedo la toca, manda el dedo.
 *   · EL REMANSO: orbita 20° y cierra el campo 8°, con la intensidad del reloj de presentación.
 *   · VIGÍA (el rol sin cuerpo): cenital a 25 m sobre el sitio que se vigila.
 *
 * Es adorno: la cámara no decide nada del juego. Por eso aquí se permite la coma flotante y la
 * trigonometría; lo que sí sale de aquí y vuelve al juego (la dirección de la palanca) sólo elige, y
 * la sala valida.
 */

/** Una caja de la estructura en metros, con su alto: lo que tapa a la cámara. */
export interface CajaAlta {
  readonly x0: number;
  readonly z0: number;
  readonly x1: number;
  readonly z1: number;
  readonly alto: number;
}

export interface Punto3 {
  x: number;
  y: number;
  z: number;
}

/** La cámara al hombro, a secas (diseño §7). */
export const DISTANCIA_AL_HOMBRO = 3.2;
export const DISTANCIA_ABIERTA = 4;
/** Con enemigos a menos de esto, se abre. */
export const ENEMIGOS_CERCA_M = 5;
export const ALTO_DE_LA_CAMARA = 1.7;
/** El pivote: el pecho del desvelado, y un poco a la derecha (el «hombro»). */
export const ALTO_DEL_PIVOTE = 1.5;
export const HOMBRO_M = 0.45;
/** El cabeceo, en radianes: de −10° a +35° (positivo = la cámara sube y mira hacia abajo). */
export const CABECEO_MINIMO = (-10 * Math.PI) / 180;
export const CABECEO_MAXIMO = (35 * Math.PI) / 180;
/** El cabeceo con que se queda la cámara a 1,7 m de alto y 3,2 m detrás. */
export const CABECEO_DE_REPOSO = Math.asin((ALTO_DE_LA_CAMARA - ALTO_DEL_PIVOTE) / DISTANCIA_AL_HOMBRO);
/** Campo de visión: 75° en el móvil, 70° en PC. */
export const FOV_MOVIL = 75;
export const FOV_PC = 70;
/** El Remanso: 20° de órbita y 8° menos de campo. */
export const ORBITA_DEL_REMANSO = (20 * Math.PI) / 180;
export const FOV_DEL_REMANSO = 8;
/** Vigía: a 25 m. */
export const ALTO_DEL_VIGIA = 25;
/** Lo más cerca que se pone la cámara del pivote cuando algo la tapa. */
export const DISTANCIA_MINIMA = 0.6;
/** Lo que se aparta la cámara de lo que la tapa (para que el plano cercano no corte la pared). */
const MARGEN_DE_PARED = 0.25;
/** Cuánto se aleja por segundo cuando deja de estar tapada. */
const ALEJARSE_M_POR_S = 5;
/** A qué ritmo gira sola la cámara automática, y desde qué ángulo empieza. */
const GIRO_AUTOMATICO_RAD_POR_S = 2.4;
const GIRO_AUTOMATICO_DESDE = (18 * Math.PI) / 180;

/**
 * ¿EN QUÉ FRACCIÓN DEL TRAMO A→B SE ENTRA EN LA CAJA? `null` si no se entra. La prueba de losa en tres
 * ejes, con la caja ensanchada `margen` por cada lado (y por arriba).
 */
export function losaEnTresEjes(a: Punto3, b: Punto3, c: CajaAlta, margen: number): number | null {
  let entra = 0;
  let sale = 1;
  const ejes: readonly [number, number, number, number][] = [
    [a.x, b.x, c.x0 - margen, c.x1 + margen],
    [a.y, b.y, -1, c.alto + margen],
    [a.z, b.z, c.z0 - margen, c.z1 + margen],
  ];
  for (const [desde, hasta, min, max] of ejes) {
    const d = hasta - desde;
    if (Math.abs(d) < 1e-9) {
      if (desde <= min || desde >= max) return null;
      continue;
    }
    let t0 = (min - desde) / d;
    let t1 = (max - desde) / d;
    if (t0 > t1) {
      const t = t0;
      t0 = t1;
      t1 = t;
    }
    if (t0 > entra) entra = t0;
    if (t1 < sale) sale = t1;
    if (entra >= sale) return null;
  }
  return entra;
}

/** La primera caja que corta el tramo A→B: su fracción (0..1), o 1 si no corta ninguna. */
export function primerCorte(a: Punto3, b: Punto3, cajas: readonly CajaAlta[], margen: number): number {
  const minX = Math.min(a.x, b.x) - margen;
  const maxX = Math.max(a.x, b.x) + margen;
  const minZ = Math.min(a.z, b.z) - margen;
  const maxZ = Math.max(a.z, b.z) + margen;
  let mejor = 1;
  for (const c of cajas) {
    if (c.x0 > maxX || c.x1 < minX || c.z0 > maxZ || c.z1 < minZ) continue;
    const f = losaEnTresEjes(a, b, c, margen);
    if (f !== null && f < mejor) mejor = f;
  }
  return mejor;
}

/** El ángulo `a` llevado a (−π, π]. */
export function normalizar(a: number): number {
  let r = a % (2 * Math.PI);
  if (r <= -Math.PI) r += 2 * Math.PI;
  if (r > Math.PI) r -= 2 * Math.PI;
  return r;
}

/** Lo que la cámara recuerda de un fotograma a otro. */
export interface EstadoDeLaCamara {
  /** Hacia dónde mira, en el convenio de `andar.ts` (0 al norte, creciendo al este), y el cabeceo. */
  giro: number;
  cabeceo: number;
  /** La distancia al pivote que tenía el fotograma anterior (para alejarse con suavidad). */
  distancia: number;
}

export function camaraNueva(giro: number): EstadoDeLaCamara {
  return { giro, cabeceo: CABECEO_DE_REPOSO, distancia: DISTANCIA_AL_HOMBRO };
}

/** Lo que la cámara necesita saber del mundo en este fotograma. */
export interface SituacionDeLaCamara {
  /** El desvelado (metros). */
  readonly x: number;
  readonly z: number;
  /** Segundos desde el fotograma anterior. */
  readonly dt: number;
  /** ¿Hay enemigos a menos de `ENEMIGOS_CERCA_M`? */
  readonly enemigosCerca: boolean;
  /** El blanco enganchado (metros), o `null`. */
  readonly blanco: { readonly x: number; readonly z: number } | null;
  /** ¿Manda el dedo? Entonces la cámara automática no gira. */
  readonly mandaElDedo: boolean;
  /** 0..1: cuánto Remanso se ve. */
  readonly remanso: number;
  /** ¿Es un aparato táctil? (el campo de visión). */
  readonly tactil: boolean;
  /** Vigía: sin cuerpo, cenital. */
  readonly vigia: boolean;
  readonly cajas: readonly CajaAlta[];
}

/** Lo que sale: dónde se pone la cámara, adónde mira y con qué campo. */
export interface EncuadreDeLaCamara {
  readonly ojo: Punto3;
  readonly mira: Punto3;
  readonly fov: number;
}

/** La dirección horizontal de un giro (convenio de `andar.ts`): (sen, −cos). */
function adelante(giro: number): { x: number; z: number } {
  return { x: Math.sin(giro), z: -Math.cos(giro) };
}

/**
 * UN FOTOGRAMA DE CÁMARA. Cambia `estado` (el giro automático y la distancia suavizada) y devuelve el
 * encuadre.
 */
export function encuadrar(estado: EstadoDeLaCamara, s: SituacionDeLaCamara): EncuadreDeLaCamara {
  if (s.vigia) {
    const a = adelante(estado.giro);
    return {
      ojo: { x: s.x - a.x * 6, y: ALTO_DEL_VIGIA, z: s.z - a.z * 6 },
      mira: { x: s.x, y: 0, z: s.z },
      fov: s.tactil ? FOV_MOVIL : FOV_PC,
    };
  }

  /* La cámara automática: gira hacia el blanco si el dedo no manda. */
  if (s.blanco !== null && !s.mandaElDedo) {
    const quiere = Math.atan2(s.blanco.x - s.x, -(s.blanco.z - s.z));
    const falta = normalizar(quiere - estado.giro);
    if (Math.abs(falta) > GIRO_AUTOMATICO_DESDE) {
      const paso = Math.sign(falta) * Math.min(Math.abs(falta) - GIRO_AUTOMATICO_DESDE * 0.5, GIRO_AUTOMATICO_RAD_POR_S * s.dt);
      estado.giro = normalizar(estado.giro + paso);
    }
  }
  estado.cabeceo = Math.max(CABECEO_MINIMO, Math.min(CABECEO_MAXIMO, estado.cabeceo));

  const giro = estado.giro + ORBITA_DEL_REMANSO * s.remanso;
  const a = adelante(giro);
  /* El derecho del giro: (cos, sen) en (x, z). */
  const derecha = { x: Math.cos(giro), z: Math.sin(giro) };
  const pivote: Punto3 = {
    x: s.x + derecha.x * HOMBRO_M,
    y: ALTO_DEL_PIVOTE,
    z: s.z + derecha.z * HOMBRO_M,
  };
  const quiereDistancia = s.enemigosCerca ? DISTANCIA_ABIERTA : DISTANCIA_AL_HOMBRO;
  const horizontal = Math.cos(estado.cabeceo);
  const vertical = Math.sin(estado.cabeceo);
  const lejos: Punto3 = {
    x: pivote.x - a.x * horizontal * quiereDistancia,
    y: pivote.y + vertical * quiereDistancia,
    z: pivote.z - a.z * horizontal * quiereDistancia,
  };
  const corte = primerCorte(pivote, lejos, s.cajas, MARGEN_DE_PARED);
  const libre = Math.max(DISTANCIA_MINIMA, corte * quiereDistancia - (corte < 1 ? 0.05 : 0));
  /* Acercarse, en el acto; alejarse, poco a poco. */
  if (libre < estado.distancia) estado.distancia = libre;
  else estado.distancia = Math.min(libre, estado.distancia + ALEJARSE_M_POR_S * s.dt);
  const d = estado.distancia;
  const ojo: Punto3 = {
    x: pivote.x - a.x * horizontal * d,
    y: Math.max(0.35, pivote.y + vertical * d),
    z: pivote.z - a.z * horizontal * d,
  };
  /* Se mira hacia delante del pivote, con el mismo cabeceo: el desvelado queda abajo a la izquierda. */
  const mira: Punto3 = {
    x: pivote.x + a.x * horizontal * 8,
    y: pivote.y - vertical * 8 + 0.1,
    z: pivote.z + a.z * horizontal * 8,
  };
  const fov = (s.tactil ? FOV_MOVIL : FOV_PC) - FOV_DEL_REMANSO * s.remanso;
  return { ojo, mira, fov };
}
