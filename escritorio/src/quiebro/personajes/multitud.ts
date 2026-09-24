/**
 * LA MULTITUD: dónde pintar cada uno de los 48 durmientes en este fotograma, qué pie lleva adelante y
 * cuánto anda. Puro: sin three. Lo pinta `rebano.ts` con texturas de huesos, y el comprobador lo
 * contrasta con `sitioDelDurmiente` de `quiebro-durmientes.ts`, que es el que manda.
 *
 * ═══ EL SITIO ES EL DEL GUION, NO EL NUESTRO ═══
 *
 * Un Prestado sale del durmiente más cercano a un punto, y cada aparato lo elige con la misma función
 * pura (`durmienteMasCercano`). Si aquí se pintara al durmiente medio metro más allá de donde el guion
 * lo pone, el jugador vería temblar a un civil y convertirse en Prestado a otro. Así que el sitio sale
 * de `escribirLosDurmientes` en el tic entero y en el siguiente, y entre los dos se interpola (sin
 * interpolar si en un tic salta más de 2 m, que es el guion doblando una esquina o empezando otra
 * vuelta). Lo único propio es el apartarse: los jugadores y los NPC atraviesan a los durmientes, y
 * éstos se apartan medio metro en local (§8), con suavidad y sin salirse nunca de ese medio metro.
 *
 * ═══ EL RELOJ DEL REMANSO ═══
 *
 * La gente es adorno y el adorno va en el reloj de presentación (§4.4): durante el Remanso los
 * durmientes andan a ×0,3 y luego recuperan. El tic pintado es el de la sala menos el retraso que el
 * Remanso lleva acumulado (`ticPintado`): como mucho 315 ms, unos seis tics, que se recuperan solos.
 * No cambia a quién se elige de Prestado: eso se decide con el tic de la sala, no con éste.
 *
 * ═══ EL PIE ADELANTE ═══
 *
 * La fase del paso sale del tic, de lo que anda su cuadrilla por tic y de la zancada del clip de andar
 * (`faseDeAndar`): con un paso de 1,1 m/s y una zancada de 1,3 m, el pie de apoyo va hacia atrás a
 * 1,1 m/s y la persona no patina. Parado (esperando al semáforo o charlando en su esquina) pasa a
 * reposo con un fundido de 0,3 s.
 */
import { UNO } from '../../../../shared/mecanicas/fijo';
import { DURMIENTES, escribirLosDurmientes, guionDeLosDurmientes } from '../../../../shared/arcade/juegos/quiebro-durmientes';
import type { Barrio } from '../../../../shared/arcade/juegos/quiebro-barrio';
import { faseDeAndar, normalizarAngulo } from './gestos';

/** Lo que dura un tic, en ms. */
export const MS_POR_TIC = 50;
/** Lo más que se aparta un durmiente de su sitio del guion (§8: medio metro). */
export const APARTE_COMO_MUCHO_M = 0.5;
/** A qué distancia de un cuerpo empieza a apartarse. */
export const APARTARSE_DESDE_M = 1.2;
/** Fundido entre andar y estar parado. */
export const FUNDIDO_DE_PARAR_MS = 300;
/** Lo que gira como mucho al doblar una esquina, en rad/s. */
export const GIRO_COMO_MUCHO = 5;
/** Un salto de sitio de más de esto en un tic no se interpola. */
const SALTO_M = 2;

/** El estado de la multitud entre fotogramas. Todo en arrays: ni un objeto por cabeza. */
export interface Multitud {
  /** Sitio del guion interpolado, en metros (sin apartarse). */
  readonly x: Float64Array;
  readonly z: Float64Array;
  /** Lo que se aparta ahora, en metros. */
  readonly apartX: Float64Array;
  readonly apartZ: Float64Array;
  /** Hacia dónde mira, suavizado (convenio de `cuerpos.ts`: 0 al norte, creciendo al este). */
  readonly rumbo: Float64Array;
  /** Peso de andar (0 parado, 1 andando), fundido. */
  readonly andando: Float64Array;
  /** Fase del paso y del reposo (0 a 1). */
  readonly faseAndar: Float64Array;
  readonly faseReposo: Float64Array;
  /** Metros por segundo del paso de su cuadrilla. */
  readonly rapidez: Float64Array;
  /** 1 si se pinta (no es Prestado ahora). */
  readonly visible: Uint8Array;
  /** Guion en el tic entero y en el siguiente (192 enteros cada uno, Q16.16). */
  readonly plano: Int32Array;
  readonly siguiente: Int32Array;
  /** Ya se colocó una vez (el primer fotograma no funde nada). */
  iniciada: boolean;
  barrio: Barrio | null;
  /**
   * El tic entero de `plano` (NaN si ninguno). El guion sólo cambia de tic en tic (cada 50 ms, unos tres
   * fotogramas): se lee cuando cambia, y al pasar al siguiente, `siguiente` pasa a ser `plano`.
   */
  ticDelPlano: number;
}

export function crearLaMultitud(): Multitud {
  return {
    x: new Float64Array(DURMIENTES),
    z: new Float64Array(DURMIENTES),
    apartX: new Float64Array(DURMIENTES),
    apartZ: new Float64Array(DURMIENTES),
    rumbo: new Float64Array(DURMIENTES),
    andando: new Float64Array(DURMIENTES),
    faseAndar: new Float64Array(DURMIENTES),
    faseReposo: new Float64Array(DURMIENTES),
    rapidez: new Float64Array(DURMIENTES),
    visible: new Uint8Array(DURMIENTES),
    plano: new Int32Array(DURMIENTES * 4),
    siguiente: new Int32Array(DURMIENTES * 4),
    iniciada: false,
    barrio: null,
    ticDelPlano: Number.NaN,
  };
}

/**
 * El tic con que se pintan los durmientes: el de la sala, retrasado lo que el Remanso tenga acumulado
 * (`ahora − presentado(ahora)`, en ms). Con reloj propio (`presentado` la identidad), el de la sala.
 */
export function ticPintado(ticDeLaSala: number, ahoraMs: number, presentadoMs: number): number {
  return ticDeLaSala - Math.max(0, ahoraMs - presentadoMs) / MS_POR_TIC;
}

/** Un cuerpo del que apartarse (los desvelados y los NPC de este fotograma). */
export interface Obstaculo {
  readonly x: number;
  readonly z: number;
}

/**
 * MUEVE LA MULTITUD al tic `tic` (con decimales), `dtMs` después del fotograma anterior. `prestados`
 * no se pintan. `zancadaAndar` es la del clip de pasear de cada uno (un número para todos, o por
 * durmiente: la mujer da pasos más cortos) y `duracionReposoMs` la del reposo (del manifiesto).
 */
export function moverLaMultitud(
  m: Multitud,
  barrio: Barrio,
  tic: number,
  dtMs: number,
  prestados: ReadonlySet<number>,
  obstaculos: readonly Obstaculo[],
  zancadaAndar: number | ((i: number) => number),
  duracionReposoMs: number,
): void {
  if (m.barrio !== barrio) {
    m.barrio = barrio;
    m.iniciada = false;
    m.ticDelPlano = Number.NaN;
    const guion = guionDeLosDurmientes(barrio);
    for (let i = 0; i < DURMIENTES; i++) {
      const a = guion.durmientes[i];
      const c = a === undefined ? undefined : guion.cuadrillas[a.cuadrilla];
      m.rapidez[i] = c === undefined ? 1.3 : ((c.paso / UNO) * 1000) / MS_POR_TIC;
    }
  }
  const base = Math.floor(tic);
  const f = tic - base;
  if (base !== m.ticDelPlano) {
    if (base === m.ticDelPlano + 1) m.plano.set(m.siguiente);
    else escribirLosDurmientes(barrio, base, m.plano);
    escribirLosDurmientes(barrio, base + 1, m.siguiente);
    m.ticDelPlano = base;
  }
  const dt = Math.max(0, Math.min(250, dtMs));
  const primera = !m.iniciada;
  for (let i = 0; i < DURMIENTES; i++) {
    const ax = (m.plano[i * 4] as number) / UNO;
    const az = (m.plano[i * 4 + 1] as number) / UNO;
    const bx = (m.siguiente[i * 4] as number) / UNO;
    const bz = (m.siguiente[i * 4 + 1] as number) / UNO;
    const salta = Math.abs(bx - ax) > SALTO_M || Math.abs(bz - az) > SALTO_M;
    m.x[i] = salta ? ax : ax + (bx - ax) * f;
    m.z[i] = salta ? az : az + (bz - az) * f;
    m.visible[i] = prestados.has(i) ? 0 : 1;

    /* El rumbo del guion (0-255, el de la tabla de 256 rumbos) en radianes, girado sin saltos. */
    const objetivo = (((m.plano[i * 4 + 2] as number) & 255) / 256) * Math.PI * 2;
    if (primera) m.rumbo[i] = objetivo;
    else {
      const falta = normalizarAngulo(objetivo - (m.rumbo[i] as number));
      const paso = (GIRO_COMO_MUCHO * dt) / 1000;
      m.rumbo[i] = normalizarAngulo((m.rumbo[i] as number) + Math.max(-paso, Math.min(paso, falta)));
    }

    /* Andar o no: fundido de 0,3 s. */
    const anda = m.plano[i * 4 + 3] === 1 ? 1 : 0;
    if (primera) m.andando[i] = anda;
    else {
      const p = dt / FUNDIDO_DE_PARAR_MS;
      const a = m.andando[i] as number;
      m.andando[i] = anda > a ? Math.min(1, a + p) : Math.max(0, a - p);
    }
    const porTic = ((m.rapidez[i] as number) * MS_POR_TIC) / 1000;
    m.faseAndar[i] = faseDeAndar(tic, porTic, typeof zancadaAndar === 'number' ? zancadaAndar : zancadaAndar(i), i);
    const r = (tic * MS_POR_TIC) / Math.max(1, duracionReposoMs) + ((i * 0.3819660) % 1);
    m.faseReposo[i] = r - Math.floor(r);

    /* Apartarse de los cuerpos: hacia fuera, más cuanto más cerca, nunca más de medio metro. */
    let ox = 0;
    let oz = 0;
    for (const o of obstaculos) {
      const dx = (m.x[i] as number) - o.x;
      const dz = (m.z[i] as number) - o.z;
      /* Sin `Math.hypot`, que asigna en cada llamada (ver `distancia3` en `director.ts`). */
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d >= APARTARSE_DESDE_M) continue;
      const fuerza = ((APARTARSE_DESDE_M - d) / APARTARSE_DESDE_M) * APARTE_COMO_MUCHO_M;
      if (d < 1e-4) {
        /* Encima: hacia su derecha, por decidir algo que no dependa del azar. */
        ox += Math.cos(m.rumbo[i] as number) * fuerza;
        oz += Math.sin(m.rumbo[i] as number) * fuerza;
      } else {
        ox += (dx / d) * fuerza;
        oz += (dz / d) * fuerza;
      }
    }
    const largo = Math.sqrt(ox * ox + oz * oz);
    if (largo > APARTE_COMO_MUCHO_M) {
      ox *= APARTE_COMO_MUCHO_M / largo;
      oz *= APARTE_COMO_MUCHO_M / largo;
    }
    if (primera) {
      m.apartX[i] = ox;
      m.apartZ[i] = oz;
    } else {
      /* Se aparta a 2 m/s como mucho: un paso rápido de lado, no un salto. */
      const k = Math.min(1, (dt / 1000) * 6);
      m.apartX[i] = (m.apartX[i] as number) + (ox - (m.apartX[i] as number)) * k;
      m.apartZ[i] = (m.apartZ[i] as number) + (oz - (m.apartZ[i] as number)) * k;
      const l = Math.sqrt((m.apartX[i] as number) ** 2 + (m.apartZ[i] as number) ** 2);
      if (l > APARTE_COMO_MUCHO_M) {
        m.apartX[i] = ((m.apartX[i] as number) * APARTE_COMO_MUCHO_M) / l;
        m.apartZ[i] = ((m.apartZ[i] as number) * APARTE_COMO_MUCHO_M) / l;
      }
    }
  }
  m.iniciada = true;
}

/**
 * LOS `k` DURMIENTES VISIBLES MÁS CERCANOS a (`x`, `z`), para darles esqueleto en N2 y N3. Escribe
 * sus índices en `salida` (reutilizada) por distancia, y a igual distancia el de índice menor.
 *
 * `preferidos` (los que ya llevan esqueleto) cuentan `margen` metros más cerca de lo que están: sin esa
 * histéresis, dos durmientes que se cruzan a la misma distancia se quitaban el esqueleto el uno al otro
 * en cada fotograma, y cada cambio es un cuerpo que se suelta y otro que se clona.
 */
export function durmientesMasCercanos(m: Multitud, x: number, z: number, k: number, salida: number[], preferidos: Uint8Array | null = null, margen = 0): number[] {
  salida.length = 0;
  if (k <= 0) return salida;
  for (let i = 0; i < DURMIENTES; i++) {
    if (m.visible[i] !== 1) continue;
    const di = distanciaPreferida(m, i, x, z, preferidos, margen);
    let pos = salida.length;
    while (pos > 0) {
      const j = salida[pos - 1] as number;
      const dj = distanciaPreferida(m, j, x, z, preferidos, margen);
      if (dj > di || (dj === di && j > i)) pos--;
      else break;
    }
    if (pos >= k) continue;
    /* Insertar en `pos` corriendo los de detrás (sin `splice`, que asigna la lista de lo quitado). */
    if (salida.length < k) salida.push(i);
    for (let q = salida.length - 1; q > pos; q--) salida[q] = salida[q - 1] as number;
    salida[pos] = i;
  }
  return salida;
}

function distanciaPreferida(m: Multitud, i: number, x: number, z: number, preferidos: Uint8Array | null, margen: number): number {
  const d = Math.sqrt(((m.x[i] as number) - x) ** 2 + ((m.z[i] as number) - z) ** 2);
  return preferidos !== null && preferidos[i] === 1 ? d - margen : d;
}
