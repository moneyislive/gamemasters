/**
 * LOS GESTOS DE LA PLAZA: qué clip toca y por dónde va un aventurero que llega
 * andando a su puesto y se va corriendo hacia la calle.
 *
 * ═══ LA MÁQUINA NO SE COPIA: SE LEE DE OTRA MANERA ═══
 *
 * La máquina de estados es la del Muelle (`escenas/embarcadero/gestos.ts`): las
 * mismas fases, los mismos sucesos, los mismos tiempos y el mismo sorteo. Copiarla
 * habría sido tener dos máquinas que se separan en silencio el día que una arregle
 * algo y la otra no. Lo que cambia es el PAISAJE, y el paisaje sólo toca dos fases:
 *
 *     llegando  → en el Muelle, 2,6 s de barco, un `salto` a las tablas y un paso de
 *                 `andar`. Aquí no hay barco: son los mismos 4,83 s (`LLEGADA.total`)
 *                 de `andar` en bucle, por un camino que sale de una boca de calle.
 *     zarpando  → en el Muelle, `saludar`, `correr` al barco y `salto` a cubierta.
 *                 Aquí no hay cubierta: `saludar` y `correr` hasta que el zarpe acaba,
 *                 hacia la calle del lado de la cámara; y en `zarpado` se sigue
 *                 corriendo, porque lo que sale de cuadro no se para a mitad de zancada.
 *
 * Todo lo demás —naciendo, esperando con sus gestos sorteados, ausente, vistiéndose—
 * lo contesta `clipQueToca` del Muelle tal cual. El modo de nacer `'barco'` de
 * `gestos.ts` se lee aquí como «llega andando»: el nombre es del Muelle, la fase es
 * de los dos.
 *
 * ═══ POR QUÉ LA VELOCIDAD DEL CLIP SALE DEL LARGO DEL CAMINO ═══
 *
 * La fase de llegada dura lo que dura, y el camino mide lo que mide. Si el clip de
 * `andar` sonara siempre a su velocidad de serie, los pies patinarían o se quedarían
 * atrás. La casa tiene medida la zancada: `andar` a 1 cubre `PASO_POR_SEGUNDO` (4
 * unidades por segundo, `escala.ts`) y `correr` el doble (`peon.ts` hace la misma
 * cuenta). Así que el clip suena a `largo / (4,83 s × 4)`, y `la-plaza.ts` tiene los
 * caminos cortados para que ese número caiga entre `RITMO.minimo` y `RITMO.maximo`:
 * `verify:plaza` lo mide camino a camino.
 *
 * ═══ SIN `three`, A PROPÓSITO ═══
 *
 * Es aritmética con el reloj y la semilla por fuera, como `gestos.ts`: `verify:plaza`
 * la recorre diez mil pasos en Node mirando que no salga nunca `t-pose`.
 */
import { CLIP } from '../embarcadero/figuras';
import type { NombreDeClip } from '../embarcadero/figuras';
import { clipQueToca, LLEGADA, ZARPE } from '../embarcadero/gestos';
import type { EstadoDeAventurero } from '../embarcadero/gestos';
import { PASO_POR_SEGUNDO } from '../escala';

/* ─────────────────────────────── Las velocidades ─────────────────────────────── */

/** Lo que cubre `andar` a velocidad 1, en unidades por segundo (`escala.ts`). */
export const VELOCIDAD_DE_PASEO = PASO_POR_SEGUNDO;
/** Lo que cubre `correr` a velocidad 1: el doble, como en `peon.ts`. */
export const VELOCIDAD_DE_CARRERA = 2 * PASO_POR_SEGUNDO;

/**
 * ENTRE QUÉ VELOCIDADES DE CLIP SE ACEPTA UNA ENTRADA. Por debajo de 0,8 el paso se
 * lee como alguien que duda; por encima de 1,5 las piernas van más deprisa de lo que
 * el clip se deja estirar sin parecer una película acelerada (el mismo tope que
 * `TOPE_DE_VELOCIDAD` de `peon.ts`).
 */
export const RITMO = { minimo: 0.8, maximo: 1.5 } as const;

const pinza = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x));

/** La velocidad del clip de `andar` para cubrir `largo` en lo que dura la llegada. Sin acotar: lo acota quien la usa. */
export function ritmoDeLaEntrada(largo: number): number {
  return largo / (LLEGADA.total * VELOCIDAD_DE_PASEO);
}

/* ─────────────────────────────── Los caminos ─────────────────────────────── */

/** Un punto del suelo de la plaza. La cota la pone la escena: la solera está a 0,6. */
export interface PuntoDelSuelo {
  readonly x: number;
  readonly z: number;
}

/** El largo de una polilínea abierta. */
export function largoDelCamino(camino: readonly PuntoDelSuelo[]): number {
  let largo = 0;
  for (let i = 1; i < camino.length; i++) {
    const a = camino[i - 1] as PuntoDelSuelo;
    const b = camino[i] as PuntoDelSuelo;
    largo += Math.hypot(b.x - a.x, b.z - a.z);
  }
  return largo;
}

/**
 * EL PUNTO A `s` UNIDADES DEL PRINCIPIO del camino, y hacia dónde se mira ahí.
 *
 * `rumbo` es el giro en Y de una figura que anda por el tramo: `atan2(dx, dz)`, el
 * mismo convenio con el que `Embarcadero` encara a la cámara (la figura del pack mira
 * a su +Z). Fuera del camino se queda en su extremo, mirando como en el último tramo.
 */
export function puntoDelCamino(camino: readonly PuntoDelSuelo[], s: number): { readonly x: number; readonly z: number; readonly rumbo: number } {
  const primero = camino[0];
  if (primero === undefined) return { x: 0, z: 0, rumbo: 0 };
  if (camino.length === 1) return { x: primero.x, z: primero.z, rumbo: 0 };
  let resto = Math.max(0, s);
  for (let i = 1; i < camino.length; i++) {
    const a = camino[i - 1] as PuntoDelSuelo;
    const b = camino[i] as PuntoDelSuelo;
    const tramo = Math.hypot(b.x - a.x, b.z - a.z);
    const rumbo = Math.atan2(b.x - a.x, b.z - a.z);
    if (resto <= tramo || i === camino.length - 1) {
      const u = tramo < 1e-9 ? 1 : pinza(resto / tramo, 0, 1);
      return { x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u, rumbo };
    }
    resto -= tramo;
  }
  const ultimo = camino[camino.length - 1] as PuntoDelSuelo;
  return { x: ultimo.x, z: ultimo.z, rumbo: 0 };
}

/* ─────────────────────────────── El clip ─────────────────────────────── */

export interface ClipDeLaPlaza {
  readonly clip: NombreDeClip;
  readonly bucle: boolean;
  readonly desde: number;
  /** El `timeScale` del clip: 1 salvo en la entrada, que se ajusta al camino. */
  readonly velocidad: number;
}

/**
 * QUÉ CLIP SE VE AHORA EN LA PLAZA. Nunca `t-pose`: las dos fases que cambian
 * devuelven `andar`, `saludar`, `correr` o `reposo-a`, y las demás son las de
 * `clipQueToca`, que tampoco la devuelve (`verify:embarcadero` y `verify:plaza` lo
 * recorren diez mil pasos cada uno).
 */
export function clipDeLaPlaza(e: EstadoDeAventurero, ahora: number, ritmo = 1): ClipDeLaPlaza {
  switch (e.fase) {
    case 'llegando':
      return { clip: CLIP.andar, bucle: true, desde: e.desde, velocidad: pinza(ritmo, RITMO.minimo, RITMO.maximo) };
    case 'zarpando': {
      const arranque = e.desde + e.retraso;
      if (ahora < arranque) return { clip: CLIP.reposoA, bucle: true, desde: e.desde, velocidad: 1 };
      if (ahora < arranque + ZARPE.saludar) return { clip: CLIP.saludar, bucle: false, desde: arranque, velocidad: 1 };
      return { clip: CLIP.correr, bucle: true, desde: arranque + ZARPE.saludar, velocidad: 1 };
    }
    case 'zarpado':
      return { clip: CLIP.correr, bucle: true, desde: e.desde, velocidad: 1 };
    default:
      return { ...clipQueToca(e, ahora), velocidad: 1 };
  }
}

/* ────────────────────── Dónde va: la entrada y la salida ────────────────────── */

/** De 0 a 1, cuánto camino de entrada lleva andado. 1 fuera de la fase de llegada. */
export function progresoDeLaEntrada(e: EstadoDeAventurero, ahora: number): number {
  if (e.fase !== 'llegando') return 1;
  return pinza((ahora - e.desde) / LLEGADA.total, 0, 1);
}

/**
 * CUÁNTAS UNIDADES LLEVA CORRIDAS HACIA LA CALLE. Cero hasta que acaba su saludo
 * (escalonado por `retraso`, como en el Muelle); en `zarpado` sigue sumando, con lo
 * que corrió dentro del zarpe más lo que lleva desde que acabó.
 */
export function metrosDeLaSalida(e: EstadoDeAventurero, ahora: number): number {
  if (e.fase === 'zarpando') return Math.max(0, ahora - e.desde - e.retraso - ZARPE.saludar) * VELOCIDAD_DE_CARRERA;
  if (e.fase === 'zarpado') {
    const dentro = Math.max(0, ZARPE.total - e.retraso - ZARPE.saludar);
    return (dentro + Math.max(0, ahora - e.desde)) * VELOCIDAD_DE_CARRERA;
  }
  return 0;
}

/** En qué punto del zarpe está: `espera` (aún no le toca), `saludo`, `carrera` o `fuera` (ya es `zarpado`). */
export function etapaDeLaSalida(e: EstadoDeAventurero, ahora: number): 'quieto' | 'espera' | 'saludo' | 'carrera' | 'fuera' {
  if (e.fase === 'zarpado') return 'fuera';
  if (e.fase !== 'zarpando') return 'quieto';
  const t = ahora - e.desde - e.retraso;
  if (t < 0) return 'espera';
  if (t < ZARPE.saludar) return 'saludo';
  return 'carrera';
}
