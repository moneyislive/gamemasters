/**
 * LOS GESTOS: la máquina de estados de un aventurero en su amarre.
 *
 * ═══ POR QUÉ ES PURA, CON EL RELOJ Y LA SEMILLA POR FUERA ═══
 *
 * Un aventurero clavado en T-pose es el fallo más feo que puede tener el lobby y
 * el más silencioso: ningún error, sólo un muñeco con los brazos en cruz. La
 * única forma de prometer que no pasa es que la función que decide el clip sea
 * pura y se pueda recorrer en Node diez mil pasos con sucesos al azar, mirando
 * que nunca devuelve `t-pose` ni un clip que no exista. Por eso el «ahora» entra
 * por parámetro y el azar de los gestos es una semilla que viaja dentro del
 * estado: la misma semilla y los mismos sucesos dan la misma secuencia.
 *
 * ═══ LAS FASES ═══
 *
 *     naciendo    → `aparecer` (me acabo de sentar) o nada (ya estaba al montar)
 *     llegando    → viaje en barco, `salto` a las tablas, un paso de `andar`
 *     esperando   → `reposo-a` con gestos sorteados cada 6–14 s
 *     ausente     → `reposo-a` mirando al mar (la escena gira; aquí sólo el clip)
 *     vistiendose → `lanzar` cortado, humo, `aparecer` con la figura nueva
 *     zarpando    → `saludar` escalonado, `correr` al barco, `salto`
 *     zarpado     → en el barco; `reposo-a`
 *
 * Los tiempos salen de la DURACIÓN de los clips compilados (informe de
 * `compilar-aventureros.ts`), no de números redondos: un clip que se corta antes
 * de terminar se ve como un tirón.
 */
import { CLIP } from './figuras';
import type { NombreDeClip } from './figuras';

/** Segundos por clip, medidos por el compilador. `t-pose` no se usa nunca; está para que la tabla sea total. */
export const DURACION: Readonly<Record<NombreDeClip, number>> = {
  'reposo-a': 1.067,
  'reposo-b': 2.133,
  andar: 1.067,
  correr: 0.8,
  saludar: 1.3,
  recoger: 1.3,
  aparecer: 1.3,
  usar: 1.6,
  lanzar: 1.367,
  golpe: 0.667,
  salto: 1.167,
  't-pose': 1,
};

export type Fase = 'naciendo' | 'llegando' | 'esperando' | 'ausente' | 'vistiendose' | 'zarpando' | 'zarpado';

/**
 * Los sucesos que le llegan desde fuera. `tic` es «ha pasado el tiempo»: la
 * escena lo manda cada fotograma y es lo que cierra las fases con duración.
 */
export type Suceso = 'tic' | 'saluda' | 'se-ausenta' | 'vuelve' | 'se-viste' | 'zarpa';

export type ModoDeNacer = 'aparecer' | 'quieto' | 'barco';

export interface Gesto {
  readonly clip: NombreDeClip;
  readonly desde: number;
}

export interface EstadoDeAventurero {
  readonly fase: Fase;
  /** Cuándo entró en la fase. */
  readonly desde: number;
  /** El estado del sorteo. Cambia con cada gesto sorteado. */
  readonly semilla: number;
  /** El gesto en curso mientras espera, o ninguno. */
  readonly gesto: Gesto | null;
  /** Cuándo toca sortear el siguiente gesto. */
  readonly proximoGesto: number;
  /** Se le ha visto hace poco. Decide si al terminar una fase se espera o se está ausente. */
  readonly presente: boolean;
  /** Escalonado por asiento: cuánto tarda en empezar a nacer o a zarpar. */
  readonly retraso: number;
  readonly modoDeNacer: ModoDeNacer;
}

/* ─────────────────────────── Los tiempos de cada fase ─────────────────────────── */

/** El barco cruza la niebla hasta el amarre en este tiempo antes del salto. */
export const VIAJE_DE_LLEGADA = 2.6;
/** Cuánto del `lanzar` se ve antes del humo: se corta ahí porque el resto es la recogida del brazo. */
export const CORTE_DEL_LANZAR = 0.6;
/** El zarpe entero, escalonado incluido, cabe en 3,2 s: el `saludar` se corta y el `salto` cierra. */
export const DURACION_DEL_ZARPE = 3.2;
const SALUDO_AL_ZARPAR = 0.9;
/** Cuánto tarda en «brotar» del suelo quien ya estaba al montar: sin clip, sólo escala. */
const BROTE = 0.4;

export const LLEGADA = {
  viaje: VIAJE_DE_LLEGADA,
  salto: DURACION.salto,
  andar: DURACION.andar,
  total: VIAJE_DE_LLEGADA + DURACION.salto + DURACION.andar,
} as const;

export const VESTIDO = {
  lanzar: CORTE_DEL_LANZAR,
  aparecer: DURACION.aparecer,
  total: CORTE_DEL_LANZAR + DURACION.aparecer,
} as const;

export const ZARPE = {
  saludar: SALUDO_AL_ZARPAR,
  correr: DURACION.correr,
  total: DURACION_DEL_ZARPE,
} as const;

/* ────────────────────────────── El sorteo ────────────────────────────── */

/** Un paso de mulberry32: la siguiente fracción y la semilla que la sigue. */
function sortea(semilla: number): { readonly u: number; readonly siguiente: number } {
  const siguiente = (semilla + 0x6d2b_79f5) >>> 0;
  let t = siguiente;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { u: ((t ^ (t >>> 14)) >>> 0) / 4294967296, siguiente };
}

/** Los gestos de espera y sus pesos: `reposo-b` 60 %, `saludar` 25 %, `recoger` 15 %. */
function gestoSorteado(u: number): NombreDeClip {
  if (u < 0.6) return CLIP.reposoB;
  if (u < 0.85) return CLIP.saludar;
  return CLIP.recoger;
}

/** Entre 6 y 14 s hasta el siguiente gesto. */
function esperaSorteada(u: number): number {
  return 6 + 8 * u;
}

/* ─────────────────────────────── Nacer ─────────────────────────────── */

export function nacer(semilla: number, ahora: number, modo: ModoDeNacer, retraso = 0, presente = true): EstadoDeAventurero {
  const s = sortea(semilla >>> 0);
  return {
    fase: modo === 'barco' ? 'llegando' : 'naciendo',
    desde: ahora,
    semilla: s.siguiente,
    gesto: null,
    proximoGesto: ahora + retraso + esperaSorteada(s.u),
    presente,
    retraso,
    modoDeNacer: modo,
  };
}

/* ───────────────────────────── Transiciones ───────────────────────────── */

const reposo = (e: EstadoDeAventurero): Fase => (e.presente ? 'esperando' : 'ausente');

function entraEn(e: EstadoDeAventurero, fase: Fase, ahora: number): EstadoDeAventurero {
  const s = sortea(e.semilla);
  return {
    ...e,
    fase,
    desde: ahora,
    gesto: null,
    semilla: s.siguiente,
    proximoGesto: ahora + esperaSorteada(s.u),
  };
}

/** Cuánto dura la fase actual, o `null` si no termina sola. */
function duracionDeLaFase(e: EstadoDeAventurero): number | null {
  switch (e.fase) {
    case 'naciendo':
      return e.retraso + (e.modoDeNacer === 'aparecer' ? DURACION.aparecer : BROTE);
    case 'llegando':
      return LLEGADA.total;
    case 'vistiendose':
      return VESTIDO.total;
    case 'zarpando':
      return ZARPE.total;
    default:
      return null;
  }
}

/** El paso del tiempo: cierra fases y sortea gestos. */
function tic(e: EstadoDeAventurero, ahora: number): EstadoDeAventurero {
  const dura = duracionDeLaFase(e);
  if (dura !== null) {
    if (ahora - e.desde < dura) return e;
    if (e.fase === 'zarpando') return entraEn(e, 'zarpado', ahora);
    return entraEn(e, reposo(e), ahora);
  }
  if (e.fase !== 'esperando') return e;
  if (e.gesto !== null) {
    if (ahora - e.gesto.desde < DURACION[e.gesto.clip]) return e;
    const s = sortea(e.semilla);
    return { ...e, gesto: null, semilla: s.siguiente, proximoGesto: ahora + esperaSorteada(s.u) };
  }
  if (ahora < e.proximoGesto) return e;
  const s = sortea(e.semilla);
  return { ...e, gesto: { clip: gestoSorteado(s.u), desde: ahora }, semilla: s.siguiente };
}

/**
 * EL SIGUIENTE ESTADO ante un suceso. Siempre devuelve un estado; un suceso que
 * no toca en esta fase se ignora, que es lo que hace que la escena pueda mandar
 * lo que ve sin preguntar antes.
 */
export function siguiente(e: EstadoDeAventurero, suceso: Suceso, ahora: number): EstadoDeAventurero {
  switch (suceso) {
    case 'tic':
      return tic(e, ahora);
    case 'saluda':
      if (e.fase !== 'esperando' || e.gesto !== null) return e;
      return { ...e, gesto: { clip: CLIP.saludar, desde: ahora } };
    case 'se-ausenta':
      if (!e.presente) return e;
      if (e.fase === 'esperando') return entraEn({ ...e, presente: false }, 'ausente', ahora);
      return { ...e, presente: false };
    case 'vuelve':
      if (e.presente) return e;
      if (e.fase === 'ausente') return entraEn({ ...e, presente: true }, 'esperando', ahora);
      return { ...e, presente: true };
    case 'se-viste':
      if (e.fase === 'zarpando' || e.fase === 'zarpado' || e.fase === 'vistiendose') return e;
      return entraEn(e, 'vistiendose', ahora);
    case 'zarpa':
      if (e.fase === 'zarpando' || e.fase === 'zarpado') return e;
      return entraEn(e, 'zarpando', ahora);
    default:
      return e;
  }
}

/* ────────────────────────────── El clip ────────────────────────────── */

export interface ClipQueToca {
  readonly clip: NombreDeClip;
  /** En bucle o una sola vez. */
  readonly bucle: boolean;
  /** Cuándo empezó, para que el mezclador lo ponga en su instante y no desde cero. */
  readonly desde: number;
}

/**
 * QUÉ CLIP SE VE AHORA. Nunca `t-pose`, por construcción: todas las ramas
 * devuelven un clip de la tabla y la que no sabe qué hacer devuelve `reposo-a`.
 */
export function clipQueToca(e: EstadoDeAventurero, ahora: number): ClipQueToca {
  const t = ahora - e.desde;
  switch (e.fase) {
    case 'naciendo':
      if (e.modoDeNacer === 'aparecer') return { clip: CLIP.aparecer, bucle: false, desde: e.desde + e.retraso };
      return { clip: CLIP.reposoA, bucle: true, desde: e.desde };
    case 'llegando':
      if (t < LLEGADA.viaje) return { clip: CLIP.reposoA, bucle: true, desde: e.desde };
      if (t < LLEGADA.viaje + LLEGADA.salto) return { clip: CLIP.salto, bucle: false, desde: e.desde + LLEGADA.viaje };
      return { clip: CLIP.andar, bucle: false, desde: e.desde + LLEGADA.viaje + LLEGADA.salto };
    case 'esperando':
      if (e.gesto !== null) return { clip: e.gesto.clip, bucle: e.gesto.clip === CLIP.reposoB, desde: e.gesto.desde };
      return { clip: CLIP.reposoA, bucle: true, desde: e.desde };
    case 'ausente':
      return { clip: CLIP.reposoA, bucle: true, desde: e.desde };
    case 'vistiendose':
      if (t < VESTIDO.lanzar) return { clip: CLIP.lanzar, bucle: false, desde: e.desde };
      return { clip: CLIP.aparecer, bucle: false, desde: e.desde + VESTIDO.lanzar };
    case 'zarpando': {
      const arranque = e.desde + e.retraso;
      if (ahora < arranque) return { clip: CLIP.reposoA, bucle: true, desde: e.desde };
      if (ahora < arranque + ZARPE.saludar) return { clip: CLIP.saludar, bucle: false, desde: arranque };
      if (ahora < arranque + ZARPE.saludar + ZARPE.correr) return { clip: CLIP.correr, bucle: true, desde: arranque + ZARPE.saludar };
      return { clip: CLIP.salto, bucle: false, desde: arranque + ZARPE.saludar + ZARPE.correr };
    }
    case 'zarpado':
      return { clip: CLIP.reposoA, bucle: true, desde: e.desde };
    default:
      return { clip: CLIP.reposoA, bucle: true, desde: e.desde };
  }
}

/* ────────────────── Lo que la escena necesita además del clip ────────────────── */

export interface Progreso {
  readonly etapa: string;
  /** De 0 a 1 dentro de la etapa. */
  readonly u: number;
}

/** En qué punto de la llegada está: `viaje` (en el barco), `salto`, `andar` o `hecho`. */
export function progresoDeLlegada(e: EstadoDeAventurero, ahora: number): Progreso {
  if (e.fase !== 'llegando') return { etapa: 'hecho', u: 1 };
  const t = ahora - e.desde;
  if (t < LLEGADA.viaje) return { etapa: 'viaje', u: t / LLEGADA.viaje };
  if (t < LLEGADA.viaje + LLEGADA.salto) return { etapa: 'salto', u: (t - LLEGADA.viaje) / LLEGADA.salto };
  return { etapa: 'andar', u: Math.min(1, (t - LLEGADA.viaje - LLEGADA.salto) / LLEGADA.andar) };
}

/** En qué punto del zarpe está: `espera` (aún no le toca), `saludo`, `carrera`, `salto` o `hecho`. */
export function progresoDeZarpe(e: EstadoDeAventurero, ahora: number): Progreso {
  if (e.fase === 'zarpado') return { etapa: 'hecho', u: 1 };
  if (e.fase !== 'zarpando') return { etapa: 'espera', u: 0 };
  const t = ahora - e.desde - e.retraso;
  if (t < 0) return { etapa: 'espera', u: 0 };
  if (t < ZARPE.saludar) return { etapa: 'saludo', u: t / ZARPE.saludar };
  if (t < ZARPE.saludar + ZARPE.correr) return { etapa: 'carrera', u: (t - ZARPE.saludar) / ZARPE.correr };
  const salto = ZARPE.total - e.retraso - ZARPE.saludar - ZARPE.correr;
  return { etapa: 'salto', u: Math.min(1, (t - ZARPE.saludar - ZARPE.correr) / Math.max(0.2, salto)) };
}

/** En qué punto del cambio de figura está, y si ya toca enseñar la nueva (`cambiaYa`). */
export function progresoDeVestido(e: EstadoDeAventurero, ahora: number): Progreso & { readonly cambiaYa: boolean } {
  if (e.fase !== 'vistiendose') return { etapa: 'hecho', u: 1, cambiaYa: true };
  const t = ahora - e.desde;
  if (t < VESTIDO.lanzar) return { etapa: 'lanzar', u: t / VESTIDO.lanzar, cambiaYa: false };
  return { etapa: 'aparecer', u: Math.min(1, (t - VESTIDO.lanzar) / VESTIDO.aparecer), cambiaYa: true };
}

/** Cuánto se ve del aventurero mientras nace: 0 nada, 1 entero. Para el brote escalonado sin coreografía. */
export function cuantoHaNacido(e: EstadoDeAventurero, ahora: number): number {
  if (e.fase !== 'naciendo') return 1;
  const t = ahora - e.desde - e.retraso;
  if (t <= 0) return 0;
  if (e.modoDeNacer === 'aparecer') return 1;
  return Math.min(1, t / BROTE);
}
