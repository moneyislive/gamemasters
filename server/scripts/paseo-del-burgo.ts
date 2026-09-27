/**
 * EL MUNDO DEL BURGO Y LOS PASEOS QUE SE CORREN EN LOS DOS MOTORES.
 *
 * Vive aparte de `verificar-burgo-mundo.ts` por la misma razón que `paseo-del-banco.ts` vive aparte
 * de `verificar-mundo.ts`: el comprobador EMPAQUETA esto con esbuild y lo ejecuta en Hermes, y un
 * fichero con efectos al cargarse —levantar Hermes, escribir temporales— se lanzaría a sí mismo
 * dentro de sí mismo. Por lo mismo, aquí no se importa nada de `node:`.
 *
 * ═══ LO QUE SE COMPARA ENTRE MOTORES NO ES SÓLO EL PASO ═══
 *
 * `verify:mundo` ya demuestra que la ARENA contesta lo mismo en Node y en Hermes. Lo nuevo del
 * Burgo es que el mundo no se escribe a mano: sale de LEVANTAR LA CIUDAD —la traza, el chorro de
 * azar, las alturas por el pulso de cada parcela, las cajas de los modelos— dentro de cada motor.
 * Así que el paquete levanta el mundo de varias mesas, lo canoniza y lo resume en una huella, y
 * sólo después pasea por él. Si la traza divergiera en un bit entre el móvil y el servidor, el
 * paseo ni siquiera empezaría en el mismo mundo.
 *
 * ═══ EL PASEO DA EL PASO DE VERDAD ═══
 *
 * Con `pasoDelTic`, la tabla de 256 rumbos y las dos marchas, como el de Las Lindes: un banco que
 * recibe los incrementos ya hechos certifica el determinismo de la operación que no es.
 */
import { ANDANDO, CORRIENDO, COSENO, DT_DEL_TIC, pasoDelTic, RADIO_DEL_PASEANTE, RUMBOS, rumboDeRadianes, SENO } from '../../shared/mecanicas/andar';
import { VELOCIDAD_ANDANDO, VELOCIDAD_CORRIENDO } from '../../shared/mecanicas/andar';
import type { Marcha } from '../../shared/mecanicas/andar';
import { canonico } from '../../shared/mecanicas/canonico';
import { por, UNO } from '../../shared/mecanicas/fijo';
import { arenaDe, hayPiso } from '../../shared/mecanicas/mundo';
import type { Andante, Arena, Cuerpo, MundoDeclarado } from '../../shared/mecanicas/mundo';
import { mundoDelBurgo } from '../../shared/arcade/juegos/burgo-mundo';

/** Las mesas del banco: códigos de cinco letras del alfabeto de la casa, y la portada. */
export const CODIGOS_DEL_PASEO: readonly string[] = ['QWXYZ', 'B4RGK', 'M7NPT', ''];

/** Cuántos tics anda cada paseo: 40.000 son treinta y tres minutos de juego a veinte por segundo. */
export const PASOS_DEL_PASEO = 40000;

/** Cada cuántos tics se cambia de rumbo: 256 tics a 0,6-1,32 u son 150-340 unidades, o sea que se cruzan manzanas. */
const TICS_POR_TRAMO = 256;

/** FNV-1a de 32 bits sobre las unidades de código de una cadena: una huella corta y la misma en los dos motores. */
export function fnv(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Un número del mundo a coma fija, igual que lo pasa `arenaDe`. */
export function enFijo(x: number): number {
  return Math.round(x * UNO) | 0;
}

/**
 * Lo que devuelve un paseo: la huella y CON QUÉ se topó, contado por separado. Separar «me paró
 * un cuerpo» de «me paró el borde» es lo que impide que el borde cumpla él solo el suelo del
 * comprobador con los cuerpos apagados.
 */
export interface Paseo {
  huella: number;
  porCuerpo: number;
  porBorde: number;
  resbalados: number;
  fuera: number;
  rumbosAndados: number;
  x: number;
  z: number;
}

/**
 * UN PASEO AL AZAR (un azar entero y propio) desde el sitio de nacer `desde`.
 *
 * Nada de clausuras sobre el índice de un bucle: Hermes 0.12 no liga el `let` por iteración, y
 * una clausura así daría otro valor en el móvil que en el servidor.
 */
export function pasear(arena: Arena, desde: number, pasos: number, semilla: number): Paseo {
  let quien: Andante = { x: arena.nace[desde * 2] as number, z: arena.nace[desde * 2 + 1] as number };
  let rumbo = 0;
  let marcha: Marcha = ANDANDO;
  let sorteo = semilla | 0;
  let h = 0;
  let porCuerpo = 0;
  let porBorde = 0;
  let resbalados = 0;
  let fuera = 0;
  const vistos: boolean[] = [];
  for (let i = 0; i < RUMBOS; i++) vistos.push(false);
  for (let k = 0; k < pasos; k++) {
    if (k % TICS_POR_TRAMO === 0) {
      sorteo = (Math.imul(sorteo, 1103515245) + 12345) | 0;
      rumbo = (sorteo >>> 8) % RUMBOS;
      marcha = ((sorteo >>> 20) & 1) === 0 ? ANDANDO : CORRIENDO;
      vistos[rumbo] = true;
    }
    const antes = quien;
    quien = pasoDelTic(arena, quien, rumbo, marcha);
    const movioX = quien.x !== antes.x;
    const movioZ = quien.z !== antes.z;
    /* El destino, calculado EXACTAMENTE como lo calcula `unPaso` (en el Burgo no hay vados). */
    const v = marcha === CORRIENDO ? VELOCIDAD_CORRIENDO : VELOCIDAD_ANDANDO;
    const dx = por(por(v, SENO[rumbo] as number), DT_DEL_TIC);
    const dz = por(-por(v, COSENO[rumbo] as number), DT_DEL_TIC);
    if (quien.x !== antes.x + dx || quien.z !== antes.z + dz) {
      /*
       * Todo TROPIEZO —pararse en seco o resbalar— y no sólo la parada en seco, como en
       * `paseo-del-banco.ts`: desde la talla a pie (`shared/mecanicas/talla.ts`) se anda a pasos de la
       * mitad y se resbala alrededor de casi todo, y contando sólo las paradas en seco un paseante se
       * quedaba en cero con los cuerpos funcionando.
       */
      if (hayPiso(arena, antes.x + dx, antes.z + dz)) porCuerpo++;
      else porBorde++;
      if (movioX !== movioZ) resbalados++;
    }
    if (!hayPiso(arena, quien.x, quien.z)) fuera++;
    h = (h ^ quien.x) | 0;
    h = Math.imul(h, 2654435761) | 0;
    h = (h ^ (h >>> 15)) | 0;
    h = (h ^ quien.z) | 0;
    h = Math.imul(h, 2654435761) | 0;
    h = (h ^ (h >>> 15)) | 0;
  }
  let rumbosAndados = 0;
  for (const v of vistos) if (v) rumbosAndados++;
  return { huella: h >>> 0, porCuerpo, porBorde, resbalados, fuera, rumbosAndados, x: quien.x, z: quien.z };
}

/**
 * EMBESTIR UNA CAJA: se sale de `salida` (en el mundo) andando derecho al rumbo de tic `rumbo`
 * durante `tics`, y se cuenta cuántas veces el centro del paseante acabó a menos de su radio de la
 * caja —tiene que ser NUNCA— y cuántos tics se quedó parado contra algo.
 */
export interface Embestida {
  /** Tics en los que el paseante quedó metido en la caja, contando su radio. Tiene que ser cero. */
  dentro: number;
  /** Tics en los que no se movió porque algo lo paró. */
  parado: number;
  /** Lo que llegó a avanzar, en unidades del mundo. */
  avanzado: number;
  /** A qué distancia de la caja acabó, en unidades del mundo (0 si pegado). */
  aLaCaja: number;
}

export function embestir(arena: Arena, caja: Cuerpo, salida: { readonly x: number; readonly z: number }, rumbo: number, tics: number): Embestida {
  const x0 = enFijo(caja.x0);
  const z0 = enFijo(caja.z0);
  const x1 = enFijo(caja.x1);
  const z1 = enFijo(caja.z1);
  const r = RADIO_DEL_PASEANTE;
  let quien: Andante = { x: enFijo(salida.x), z: enFijo(salida.z) };
  const inicio = quien;
  let dentro = 0;
  let parado = 0;
  for (let k = 0; k < tics; k++) {
    const antes = quien;
    quien = pasoDelTic(arena, quien, rumbo, ANDANDO);
    if (quien.x === antes.x && quien.z === antes.z) parado++;
    if (quien.x + r > x0 && quien.x - r < x1 && quien.z + r > z0 && quien.z - r < z1) dentro++;
  }
  const dx = (quien.x - inicio.x) / UNO;
  const dz = (quien.z - inicio.z) / UNO;
  const fuera = (v: number, a: number, b: number): number => (v < a ? a - v : v > b ? v - b : 0);
  const ax = fuera(quien.x, x0 - r, x1 + r) / UNO;
  const az = fuera(quien.z, z0 - r, z1 + r) / UNO;
  return { dentro, parado, avanzado: Math.sqrt(dx * dx + dz * dz), aLaCaja: Math.max(ax, az) };
}

/** El rumbo de tic (0..255) del sitio de nacer `k` de una arena: el que trae declarado, redondeado a la tabla. */
export function rumboDelSitio(arena: Arena, k: number): number {
  return rumboDeRadianes(arena.rumbos[k] as number);
}

/** Lo que un motor dice del mundo de una mesa: cuántos cuerpos, cuánto pesa canonizado, su huella y la de su paseo. */
export interface MundoResumido {
  codigo: string;
  cuerpos: number;
  peso: number;
  huellaDelMundo: number;
  paseo: Paseo;
}

/** EL BANCO ENTERO: la misma función en proceso y dentro del paquete. */
export function paseoDelBurgo(): MundoResumido[] {
  const salida: MundoResumido[] = [];
  for (let m = 0; m < CODIGOS_DEL_PASEO.length; m++) {
    const codigo = CODIGOS_DEL_PASEO[m] as string;
    const mundo: MundoDeclarado = mundoDelBurgo(codigo);
    const texto = canonico(mundo);
    const arena = arenaDe(mundo);
    /* Cada mesa pasea desde un sitio de nacer distinto y con otra semilla, para no andar cuatro veces lo mismo. */
    const paseo = pasear(arena, m % mundo.nace.length, PASOS_DEL_PASEO, 987654321 + m * 7919);
    salida.push({ codigo, cuerpos: mundo.cuerpos.length, peso: texto.length, huellaDelMundo: fnv(texto), paseo });
  }
  return salida;
}
