/**
 * EL PASEO POR UN TABLERO DE VERDAD DE LAS LINDES, EL QUE SE CORRE EN LOS DOS MOTORES.
 *
 * Vive aparte de `verificar-lindes-mundo.ts` por lo mismo que `paseo-del-banco.ts` vive aparte de
 * `verificar-mundo.ts`: el comprobador EMPAQUETA este fichero con esbuild y lo ejecuta en Hermes,
 * y un fichero con efectos —levantar Hermes, escribir temporales— se lanzaría a sí mismo dentro
 * de sí mismo. Por lo mismo, aquí NO se importa nada de `node:`: `--platform=neutral` lo
 * rechazaría, y el mensaje se leería como «los motores no coinciden», que no es.
 *
 * ═══ QUÉ SE COMPARA ENTRE MOTORES, Y POR QUÉ LAS DOS COSAS ═══
 *
 *  1. EL MUNDO ENTERO. Se deriva con `mundoDeLasLindes` —el reparto de las setenta y dos losas,
 *     las cajas, los sitios de nacer— y se canoniza. Su huella es la prueba de que el servidor y
 *     el aparato derivan el MISMO mundo de la misma vista, que es lo que el paso 3 promete. Es
 *     aquí donde un seno en el reparto se habría notado: no en el paseo, en el mundo.
 *  2. EL PASEO. Se anda con `pasoDelTic` —la función de verdad, con la tabla de 256 rumbos y
 *     `por`— y se firma cada posición. Con la huella del paseo se compara además con QUÉ se
 *     chocó: cuántas veces paró cada cuerpo, por su índice.
 *
 * ═══ EL PASEO RECORRE EL TABLERO, NO UNA ESQUINA ═══
 *
 * Nace en el sitio de nacer de la primera losa y cada ocho tramos salta al de la siguiente, en
 * el orden de la lista: así pisa las setenta y dos, con sus villas, sus murallas y sus bordes,
 * y no se queda dando vueltas contra la misma tapia. Y cada salto mira, en el motor en el que
 * corre, que en ese sitio de nacer se pueda estar: es la misma pregunta que se hizo al
 * declararlo, contestada por la arena del otro lado.
 */
import { canonico } from '../../shared/mecanicas/canonico';
import { ANDANDO, CORRIENDO, COSENO, DT_DEL_TIC, pasoDelTic, RADIO_DEL_PASEANTE, RUMBOS, SENO } from '../../shared/mecanicas/andar';
import { VELOCIDAD_ANDANDO, VELOCIDAD_CORRIENDO } from '../../shared/mecanicas/andar';
import type { Marcha } from '../../shared/mecanicas/andar';
import { por } from '../../shared/mecanicas/fijo';
import { arenaDe, hayPiso, sePuedeEstar } from '../../shared/mecanicas/mundo';
import type { Andante } from '../../shared/mecanicas/mundo';
import { mundoDeLasLindes } from '../../shared/arcade/juegos/lindes-mundo';
import type { LosaParaElMundo } from '../../shared/arcade/juegos/lindes-mundo';

/** Cuántos tics se anda. */
export const PASOS_DEL_PASEO = 40000;

/** Cada cuántos tics se cambia de rumbo: 128 tics a 0,6-1,3 u son 80-170 unidades, media losa. */
const TICS_POR_TRAMO = 128;

/** Cada cuántos tramos se salta al sitio de nacer de la losa siguiente. */
const TRAMOS_POR_SALTO = 8;

/** Lo que devuelve un paseo. Todo enteros o cadenas: se compara como texto entre motores. */
export interface PaseoDeLasLindes {
  /** La huella del mundo canonizado, y cuánto pesa: lo que se compara del MUNDO. */
  huellaDelMundo: number;
  pesoDelMundo: number;
  cuerpos: number;
  nace: number;
  /** La huella del recorrido. */
  huella: number;
  /** Paradas en seco por un cuerpo. */
  porCuerpo: number;
  /** Paradas en seco por el borde de lo pisable. */
  porBorde: number;
  /** Pasos en los que sólo se pudo avanzar por un eje. */
  resbalados: number;
  /** Veces que acabó fuera de lo pisable. Tiene que ser cero. */
  fuera: number;
  /** Veces que se saltó a un sitio de nacer donde no se podía estar. Tiene que ser cero. */
  nacerMalo: number;
  /** Cuántos rumbos distintos de la tabla se han andado. */
  rumbosAndados: number;
  /** Por cada cuerpo, cuántas paradas en seco causó. En el orden de `mundo.cuerpos`. */
  paradasPorCuerpo: number[];
  x: number;
  z: number;
}

/** Una huella de 32 bits de un texto: FNV-1a, entera, la misma en los dos motores. */
export function huellaDeTexto(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** El paseo. La misma función en proceso y dentro del paquete. */
export function pasearLasLindes(
  losas: readonly LosaParaElMundo[],
  semilla: number,
  pasos: number = PASOS_DEL_PASEO,
): PaseoDeLasLindes {
  const mundo = mundoDeLasLindes(losas, semilla);
  const texto = canonico(mundo);
  const a = arenaDe(mundo);
  const n = mundo.nace.length;
  const cajas = a.cuerpos;
  const radio = RADIO_DEL_PASEANTE;
  const paradasPorCuerpo: number[] = [];
  for (let i = 0; i < mundo.cuerpos.length; i++) paradasPorCuerpo.push(0);

  let cual = 0;
  let quien: Andante = { x: a.nace[0] ?? 0, z: a.nace[1] ?? 0 };
  let rumbo = 0;
  let marcha: Marcha = ANDANDO;
  let sorteo = 424242;
  let tramo = 0;
  let h = 0;
  let porCuerpo = 0;
  let porBorde = 0;
  let resbalados = 0;
  let fuera = 0;
  let nacerMalo = 0;
  const vistos: boolean[] = [];
  for (let i = 0; i < RUMBOS; i++) vistos.push(false);

  for (let k = 0; k < pasos; k++) {
    if (k % TICS_POR_TRAMO === 0) {
      tramo++;
      if (tramo % TRAMOS_POR_SALTO === 0 && n > 0) {
        cual = (cual + 1) % n;
        quien = { x: a.nace[cual * 2] as number, z: a.nace[cual * 2 + 1] as number };
        /* Un sitio de nacer donde no se puede estar es un paseante que nace dentro de algo. */
        if (!sePuedeEstar(a, quien.x, quien.z, radio)) nacerMalo++;
      }
      /* Un rumbo y una marcha nuevos, sorteados con aritmética entera: los mismos en los dos. */
      sorteo = (Math.imul(sorteo, 1103515245) + 12345) | 0;
      rumbo = (sorteo >>> 8) % RUMBOS;
      marcha = ((sorteo >>> 20) & 1) === 0 ? ANDANDO : CORRIENDO;
      vistos[rumbo] = true;
    }
    const antes = quien;
    quien = pasoDelTic(a, quien, rumbo, marcha, radio);
    const movioX = quien.x !== antes.x;
    const movioZ = quien.z !== antes.z;
    if (!movioX && !movioZ) {
      /*
       * QUÉ lo paró, y no sólo QUE lo pararon. El destino, calculado EXACTAMENTE como lo
       * calcula `unPaso` —aquí no hay vados—: sin piso, el borde; con piso, un cuerpo, y se
       * busca cuál para poder contar contra qué se choca.
       */
      const v = marcha === CORRIENDO ? VELOCIDAD_CORRIENDO : VELOCIDAD_ANDANDO;
      const dx = por(por(v, SENO[rumbo] as number), DT_DEL_TIC);
      const dz = por(-por(v, COSENO[rumbo] as number), DT_DEL_TIC);
      const x = antes.x + dx;
      const z = antes.z + dz;
      if (!hayPiso(a, x, z)) porBorde++;
      else {
        porCuerpo++;
        for (let i = 0; i < mundo.cuerpos.length; i++) {
          if (
            x + radio > (cajas[i * 4] as number) &&
            x - radio < (cajas[i * 4 + 2] as number) &&
            z + radio > (cajas[i * 4 + 1] as number) &&
            z - radio < (cajas[i * 4 + 3] as number)
          ) {
            paradasPorCuerpo[i] = (paradasPorCuerpo[i] as number) + 1;
            break;
          }
        }
      }
    } else if (!movioX || !movioZ) resbalados++;
    if (!hayPiso(a, quien.x, quien.z)) fuera++;
    h = (h ^ quien.x) | 0;
    h = Math.imul(h, 2654435761) | 0;
    h = (h ^ (h >>> 15)) | 0;
    h = (h ^ quien.z) | 0;
    h = Math.imul(h, 2654435761) | 0;
    h = (h ^ (h >>> 15)) | 0;
  }
  let rumbosAndados = 0;
  for (const v of vistos) if (v) rumbosAndados++;
  return {
    huellaDelMundo: huellaDeTexto(texto),
    pesoDelMundo: texto.length,
    cuerpos: mundo.cuerpos.length,
    nace: n,
    huella: h >>> 0,
    porCuerpo,
    porBorde,
    resbalados,
    fuera,
    nacerMalo,
    rumbosAndados,
    paradasPorCuerpo,
    x: quien.x,
    z: quien.z,
  };
}
