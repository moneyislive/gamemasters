/**
 * EL PASEO POR EL DELTA QUE SE CORRE EN LOS DOS MOTORES.
 *
 * Vive aparte de `verificar-riberas-mundo.ts` por la misma razón que `paseo-del-banco.ts` vive
 * aparte de `verificar-mundo.ts`: el comprobador EMPAQUETA este fichero con esbuild y lo ejecuta
 * en Hermes, y un fichero con efectos al cargarse —levantar Hermes, jugar partidas, escribir
 * temporales— se lanzaría a sí mismo dentro de sí mismo. Aquí no hay nada de `node:`:
 * `--platform=neutral` lo rechazaría, y el mensaje se leería como «los motores no coinciden».
 *
 * ═══ QUÉ SE COMPARA ENTRE MOTORES, Y POR QUÉ LAS DOS COSAS ═══
 *
 *  1. EL MUNDO MISMO. Las vistas entran tal cual salieron del reductor y el mundo se DERIVA
 *     dentro de cada motor: si la rasterización, las cajas o los sitios de nacer dependieran del
 *     motor —un redondeo, una comparación de coma flotante en la raya—, el servidor y el aparato
 *     no estarían andando por el mismo delta. Se compara la huella de su forma canónica.
 *  2. EL PASEO. Sobre la arena de ese mundo se anda con `pasoDelTic`, el paso de verdad, y se
 *     compara la huella de las posiciones.
 *
 * ═══ Y SE ANDA HACIA LO QUE HAY QUE TOCAR, NO SÓLO AL AZAR ═══
 *
 * Un paseante al azar por un delta de 650 unidades casi nunca pisa una caja de 24: daría la MISMA
 * huella en los dos motores —la de no tocar nada— y el comprobador se quedaría verde sin vigilar
 * un solo choque. Así que cada vista se recorre en tres tandas, cada una hacia lo que tiene que
 * probar: del centro del tablero AL MAR en dieciséis rumbos (el vado y lo hondo), desde fuera de
 * cada choza, torre y estiaje HACIA ELLA (los cuerpos), y un rato al azar desde el primer sitio de
 * nacer (lo demás). Cada tanda cuenta con qué se topó, y el comprobador exige suelos a los dos
 * lados del empaquetado.
 */
import { UNO, por } from '../../shared/mecanicas/fijo';
import {
  ANDANDO,
  CORRIENDO,
  COSENO,
  DT_DEL_TIC,
  pasoDelTic,
  RADIO_DEL_PASEANTE,
  RUMBOS,
  SENO,
  VELOCIDAD_ANDANDO,
  VELOCIDAD_CORRIENDO,
} from '../../shared/mecanicas/andar';
import type { Marcha } from '../../shared/mecanicas/andar';
import { canonico } from '../../shared/mecanicas/canonico';
import { arenaDe, hayPiso, sePuedeEstar, sueloEn, VADO } from '../../shared/mecanicas/mundo';
import type { Andante, Arena } from '../../shared/mecanicas/mundo';
import { mundoDeRiberas, rumboHacia } from '../../shared/arcade/juegos/riberas-mundo';
import type { PuntoDelMundo } from '../../shared/arcade/juegos/riberas-mundo';

/** Lo que devuelve el paseo: las dos huellas y CON QUÉ se topó, contado por separado. */
export interface PaseoDeRiberas {
  /** La huella de la forma canónica de todos los mundos derivados. */
  huellaDelMundo: number;
  /** Cuántas letras suman esos mundos canonizados. */
  pesoDelMundo: number;
  /** Casillas firmes, de vado, cuerpos y sitios de nacer de todos los mundos, sumados. */
  firmes: number;
  vados: number;
  cuerpos: number;
  nacimientos: number;
  /** La huella de las posiciones, tic a tic. */
  huella: number;
  tics: number;
  /** Paradas en seco porque delante había un cuerpo. */
  porCuerpo: number;
  /** Paradas en seco porque delante no había suelo: lo hondo. */
  porBorde: number;
  /** Pasos en los que sólo se pudo avanzar por un eje. */
  resbalados: number;
  /** Tics que empezaron con el agua por las rodillas. */
  enElVado: number;
  /** Veces que acabó un tic sin suelo debajo. Tiene que ser cero. */
  fuera: number;
  /** Tandas que no se pudieron empezar porque el sitio de salida no valía. Tiene que ser cero. */
  saltadas: number;
}

/** La huella de una cadena: FNV-1a sobre sus unidades de código, entera en los dos motores. */
export function huellaDeTexto(texto: string): number {
  let h = 0x811c9dc5 | 0;
  for (let i = 0; i < texto.length; i++) {
    h = (h ^ texto.charCodeAt(i)) | 0;
    h = Math.imul(h, 0x01000193) | 0;
  }
  return h >>> 0;
}

/** Un número del mundo a coma fija, como lo hace `arenaDe`. */
function aFijo(x: number): number {
  return Math.round(x * UNO) | 0;
}

/** Lo que llevan las tandas mientras andan. */
interface Cuenta {
  h: number;
  tics: number;
  porCuerpo: number;
  porBorde: number;
  resbalados: number;
  enElVado: number;
  fuera: number;
}

/**
 * UN TIC, CONTADO. El destino se calcula EXACTAMENTE como lo calcula `unPaso` —con la mitad en
 * el vado— para decir qué lo paró: si el destino tenía suelo, fue un cuerpo; si no, el borde.
 */
function unTic(arena: Arena, quien: Andante, rumbo: number, marcha: Marcha, c: Cuenta): Andante {
  const vadeando = sueloEn(arena, quien.x, quien.z) === VADO;
  if (vadeando) c.enElVado++;
  const despues = pasoDelTic(arena, quien, rumbo, marcha);
  const movioX = despues.x !== quien.x;
  const movioZ = despues.z !== quien.z;
  if (!movioX && !movioZ) {
    const v = marcha === CORRIENDO ? VELOCIDAD_CORRIENDO : VELOCIDAD_ANDANDO;
    let dx = por(por(v, SENO[rumbo] as number), DT_DEL_TIC);
    let dz = por(-por(v, COSENO[rumbo] as number), DT_DEL_TIC);
    if (vadeando) {
      dx = (dx / 2) | 0;
      dz = (dz / 2) | 0;
    }
    if (hayPiso(arena, quien.x + dx, quien.z + dz)) c.porCuerpo++;
    else c.porBorde++;
  } else if (!movioX || !movioZ) c.resbalados++;
  if (!hayPiso(arena, despues.x, despues.z)) c.fuera++;
  c.tics++;
  let h = c.h;
  h = (h ^ despues.x) | 0;
  h = Math.imul(h, 2654435761) | 0;
  h = (h ^ (h >>> 15)) | 0;
  h = (h ^ despues.z) | 0;
  h = Math.imul(h, 2654435761) | 0;
  h = (h ^ (h >>> 15)) | 0;
  c.h = h;
  return despues;
}

/**
 * Anda recto con un rumbo unos tics, desde un sitio. Si en el sitio no se puede estar —sin suelo
 * o dentro de algo— no anda y lo dice: una tanda que empieza dentro de una caja se queda clavada
 * y contaría cientos de choques que no ha habido.
 */
function tanda(arena: Arena, desde: PuntoDelMundo, rumbo: number, tics: number, c: Cuenta): boolean {
  const x = aFijo(desde.x);
  const z = aFijo(desde.z);
  if (!sePuedeEstar(arena, x, z, RADIO_DEL_PASEANTE)) return false;
  let quien: Andante = { x, z };
  for (let k = 0; k < tics; k++) quien = unTic(arena, quien, rumbo, ANDANDO, c);
  return true;
}

/** Del centro al mar: 700 tics a 0,6 u son 420 unidades, y el borde más lejano está a 347. */
const TICS_AL_MAR = 700;
/** Hacia cada cuerpo desde cuarenta: 120 tics son 72 unidades, y la caja se toca antes de 30. */
const TICS_AL_CUERPO = 120;
const TICS_AL_AZAR = 6000;
const TICS_POR_TRAMO = 256;

/**
 * EL PASEO ENTERO sobre unas vistas. La misma función en proceso y dentro del paquete.
 *
 * Sólo aritmética y las funciones de `shared/`. `Math.sqrt` sí —está fijada al bit por
 * IEEE 754— para poner el punto de salida a cuarenta de cada cuerpo.
 */
export function pasearRiberas(vistas: readonly unknown[]): PaseoDeRiberas {
  let huellaDelMundo = 0x811c9dc5;
  let pesoDelMundo = 0;
  let firmes = 0;
  let vados = 0;
  let cuerpos = 0;
  let nacimientos = 0;
  let saltadas = 0;
  const c: Cuenta = { h: 0, tics: 0, porCuerpo: 0, porBorde: 0, resbalados: 0, enElVado: 0, fuera: 0 };

  for (const vista of vistas) {
    const mundo = mundoDeRiberas(vista);
    const texto = canonico(mundo);
    huellaDelMundo = Math.imul((huellaDelMundo ^ huellaDeTexto(texto)) | 0, 0x01000193) >>> 0;
    pesoDelMundo += texto.length;
    firmes += mundo.pisables.length;
    vados += mundo.vados.length;
    cuerpos += mundo.cuerpos.length;
    nacimientos += mundo.nace.length;
    const arena = arenaDe(mundo);

    /* El centro del tablero: la media de lo firme, que para el delta de radio dos es el origen. */
    let sx = 0;
    let sz = 0;
    for (const k of mundo.pisables) {
      sx += k.x * mundo.lado;
      sz += -k.y * mundo.lado;
    }
    const n = mundo.pisables.length > 0 ? mundo.pisables.length : 1;
    const medio: PuntoDelMundo = { x: sx / n, z: sz / n };

    /* ── 1 · AL MAR: del centro hacia fuera, en dieciséis rumbos ───────────── */
    /*
     * Si el estiaje está plantado justo en el centro, el centro no vale: se sale del primer
     * sitio de nacer, que vale siempre (el comprobador lo exige por separado).
     */
    const primero = mundo.nace[0];
    const salida: PuntoDelMundo | null = sePuedeEstar(arena, aFijo(medio.x), aFijo(medio.z), RADIO_DEL_PASEANTE)
      ? medio
      : primero === undefined
        ? null
        : { x: primero.x, z: primero.z };
    for (let r = 0; r < 16; r++) {
      if (salida === null || !tanda(arena, salida, r * 16, TICS_AL_MAR, c)) saltadas++;
    }

    /* ── 2 · A LOS CUERPOS: desde cuarenta por fuera, derecho a su centro ─── */
    for (const cuerpo of mundo.cuerpos) {
      const centro: PuntoDelMundo = { x: (cuerpo.x0 + cuerpo.x1) / 2, z: (cuerpo.z0 + cuerpo.z1) / 2 };
      const hx = medio.x - centro.x;
      const hz = medio.z - centro.z;
      const largo = Math.sqrt(hx * hx + hz * hz);
      /* Una caja justo en el centro del tablero se busca desde el norte. */
      const ux = largo > 1 ? hx / largo : 0;
      const uz = largo > 1 ? hz / largo : -1;
      const desde: PuntoDelMundo = { x: centro.x + ux * 40, z: centro.z + uz * 40 };
      if (!tanda(arena, desde, rumboHacia(desde, centro), TICS_AL_CUERPO, c)) saltadas++;
    }

    /* ── 3 · AL AZAR, desde el primer sitio de nacer ──────────────────────── */
    if (primero === undefined) {
      saltadas++;
      continue;
    }
    let quien: Andante = { x: aFijo(primero.x), z: aFijo(primero.z) };
    let rumbo = 0;
    let marcha: Marcha = ANDANDO;
    let sorteo = (987654321 + nacimientos) | 0;
    for (let k = 0; k < TICS_AL_AZAR; k++) {
      if (k % TICS_POR_TRAMO === 0) {
        sorteo = (Math.imul(sorteo, 1103515245) + 12345) | 0;
        rumbo = (sorteo >>> 8) % RUMBOS;
        marcha = ((sorteo >>> 20) & 1) === 0 ? ANDANDO : CORRIENDO;
      }
      quien = unTic(arena, quien, rumbo, marcha, c);
    }
  }

  return {
    huellaDelMundo,
    pesoDelMundo,
    firmes,
    vados,
    cuerpos,
    nacimientos,
    huella: c.h >>> 0,
    tics: c.tics,
    porCuerpo: c.porCuerpo,
    porBorde: c.porBorde,
    resbalados: c.resbalados,
    enElVado: c.enElVado,
    fuera: c.fuera,
    saltadas,
  };
}
