/**
 * LA CIUDAD DE «EL QUIEBRO»: la columna de la ciudad abierta de 540 m (`docs/quiebro/CIUDAD-ABIERTA.md`).
 *
 * ═══ QUÉ ES ESTE FICHERO ═══
 *
 * La columna que los frentes de la obra usan sin poder preguntarse (§6.3, ola 0) —los tipos de la ciudad
 * de una mesa, de su noche, de sus plazas y de las celdas del cliente; la numeración de zonas, límites y
 * celdas; las ocho simetrías; los distritos; las distancias por calles—, comprobada en
 * `verify:liza-protocolo`, y DEBAJO la obra que la llena (ola A, frente Traza): la traza orientada, la
 * geometría de cada traza, la ciudad de la mesa, la noche, las plazas despejadas, el mundo de la Liza, el
 * tren y los semáforos. Lo comprueba entero `verify:quiebro-barrio`: las 32 trazas, diez noches cada una.
 * Ver «La obra» al final del fichero.
 *
 * ═══ LAS CAPAS, Y DE QUÉ SALE CADA UNA (§2.6) ═══
 *
 *   · LA TRAZA (`traza`, 0-31, en la vista de la mesa): cuál de las 4 trazas dibujadas y con cuál de las 8
 *     simetrías del cuadrado (`traza = dibujo · 8 + simetria`). Distritos, plazas con su plantilla,
 *     avenidas, callejones, soportales, cabinas candidatas, refugios, el grafo base y la red de aceras.
 *   · LOS EDIFICIOS: alturas, fachadas, rótulos y neones, del CÓDIGO de la mesa con un chorro por manzana
 *     (`CÓDIGO#m<i>`). Traza y edificios son la CIUDAD DE LA MESA: la misma en las diez noches.
 *   · LA NOCHE (su vestido): coches, quioscos, 4-6 cortes de obra, tiempo, hora, semáforos y tren, de
 *     (código, noche) con un chorro por aspecto. Las rondas de guion (entrega 3) entrarán aquí también.
 *     Lo variable de las plazas (el quiosco de la Glorieta, sus bancos del borde, las carretillas del
 *     Patio y los coches de su acera) va con las cajas de la noche pero sale del CÓDIGO (`CÓDIGO#plazas`):
 *     una plaza no cambia de una noche a otra de la mesa (ver el paso 7 de `vestirLaNoche`).
 *   · LOS FALLOS: la plaza de la Bajada, los Fallos y las plazas de propina, que elige el reductor en la
 *     Bajada entre los tríos válidos (`triosDeFallos`). Van en la vista, y entran aquí como `fallos`.
 *
 * ═══ UNA FUNCIÓN PURA POR CAPA, Y LO QUE ESO COMPRA ═══
 *
 * Nada de esto viaja por el cable: la sala (por el productor), el escritorio, el WebView de la app y el
 * iPhone derivan la misma ciudad de lo que ya viaja —la vista—, como hacía el barrio. Con las reglas de
 * `shared/` sin excepción: sin trigonometría, sin `sort()` sin comparador y sin cierres sobre el `let` de
 * un bucle (Hermes 0.12 no lo liga por iteración). Las memorias (la ciudad de las 16 últimas mesas, el
 * índice de un grafo, las cajas por celda de una noche) no son estado del juego: la misma entrada da
 * siempre lo mismo, y guardarlo sólo evita rehacerlo.
 *
 * ═══ LAS MEDIDAS, EN METROS Y EN CUARTOS ═══
 *
 * Todo lo de aquí va en METROS con coma flotante, y toda medida de la ciudad es un múltiplo de 0,25 m
 * (como en `quiebro-barrio.ts`): un cuarto es exacto en binario y en Q16.16, así que pasar al mundo de la
 * Liza es multiplicar por `UNO` sin redondear, y sumar distancias por calles no deja un último bit que un
 * aparato redondee hacia un lado y otro hacia el otro. Origen en el centro de la Glorieta del Relojero, `x`
 * al este y `z` al sur (el norte es −z), como en `mundo.ts`. Los rumbos, de la tabla de 256 (0 al norte,
 * 64 al este).
 *
 * ═══ EL ORDEN DE LAS CAJAS ES CONTRATO ═══
 *
 * El suceso `empuja` nombra la caja contra la que se estampó por su índice, y la grieta dura toda la noche
 * en esa caja. Así que el orden es fijo (§5.1), y las de la mesa conservan su índice en todas las noches:
 *
 *   `CiudadDeLaMesa.cajas`   1. el cerco y sus bordes;
 *                            2. las manzanas, hueco a hueco en orden de índice: su edificio (dos si la parte
 *                               un callejón), los pilares de sus soportales y las farolas de pie de sus aceras;
 *                            3. las avenidas: pilares del viaducto, troncos y bancos de la mediana;
 *                            4. las plazas, de la 1 a la 6: lo fijo de su plantilla;
 *                            5. las cabinas candidatas y los refugios, en su orden.
 *   `NocheDeLaCiudad.cajas`  las de la mesa, con los MISMOS índices, y detrás:
 *                            6. lo de las calles de la noche (coches y quioscos), tramo a tramo;
 *                            7. lo variable de las plazas, de la 1 a la 6 (del código: lo mismo cada noche);
 *                            8. los cortes de obra, en orden de tramo.
 *
 * «Plazas despejadas» quita cajas y renumera (`despejarLasPlazas`): la sala y el cliente llaman a la misma
 * función, y el índice de un `empuja` es el mismo en los dos lados.
 *
 * ═══ LOS NÚMEROS QUE LA LIZA VE ═══
 *
 * La Liza nombra zonas, clases de zona y límites con enteros de 1 a 255 que viajan por el cable. Se fijan
 * AQUÍ, con fórmulas y no con tablas de cada traza, para que el productor, el cliente y el comprobador
 * numeren igual sin mirarse (ver «La numeración»). Caben de sobra en 255 (§2.8): 148 con las arcas.
 *
 * ═══ LAS DISTANCIAS POR CALLES, LAS MISMAS PARA TODOS ═══
 *
 * `campoHasta` es un Dijkstra sobre un grafo que va SÓLO por los ejes (§5.4, invariante): cada arista mide
 * `|Δx| + |Δz|`, múltiplo de 0,25 m, y la suma es exacta. En la ciudad cuenta en cuartos enteros con una cola
 * de cubetas (`dijkstraPorCubetas`); los metros son los del camino más corto, así que no dependen del orden
 * en que salen los nudos de la cola, y `verify:quiebro-barrio` los compara con un Dijkstra suyo, de
 * montículo, en las 32 trazas. En el mundo de la Liza el mismo grafo va multiplicado por `UNO`, y el Dijkstra de la sala
 * (`largo` de `cuerpo.ts`, exacto en una arista por un eje) da los mismos metros por `UNO`: el HUD, los
 * robots, el reductor, el comprobador y la sala miden lo mismo.
 *
 * ═══ QUÉ NO ESTÁ ═══
 *
 *   · Los datos de las trazas y de las plantillas: `quiebro-trazas.ts` y `quiebro-plantillas.ts`.
 *   · El vestido de las manzanas (alturas, fachadas, rótulos): `vestirLaManzana` de `quiebro-barrio.ts`.
 *   · Los durmientes: `quiebro-durmientes.ts`, con las firmas de «Los durmientes de la ciudad», abajo.
 *   · Los NOMBRES que se leen (distritos, plazas, calles, pasajes): `quiebro-nombres.ts`. Aquí van índices
 *     y claves, con el largo mínimo que tienen que tener sus listas.
 */
import { UNO } from '../../mecanicas/fijo';
import type { LimiteDelMundo, MundoDeLaLiza, SitioDeNacer, ZonaDelMundo } from '../../mecanicas/liza/declaracion';
import type { Casilla, Cuerpo } from '../../mecanicas/mundo';
import { chorroDeAzar, claveDeLaNoche, FONDO_DEL_SOPORTAL, normalizarLaNoche, PILARES_DE_SOPORTAL_EN_LA_CIUDAD, ticDelBarrio, TICS_DEL_SEMAFORO, TICS_EN_VERDE, vestirLaManzana } from './quiebro-barrio';
import type {
  AristaDelGrafo,
  Cara,
  ClaseDeCaja,
  EstiloDeFachada,
  Eje,
  FachadaDeLaForma,
  FachadaDelEdificio,
  ParteDeLaManzana,
  Punto,
  Rectangulo,
  RotuloDelBarrio,
  SitioDelBarrio,
  Tiempo,
  TipoDeCaja,
  TramoDeAcera,
  TramoDeAltura,
} from './quiebro-barrio';
import { BANDA_DE_COCHE, BOCAS_DE_LA_PLAZA, COCHES_DE_LA_PLAZA, COCHES_DE_LA_PLAZA_POR_NOCHE, EJE_DE_LAS_CALLES_DE_LA_PLAZA, LARGO_DE_COCHE, PLANTILLAS_DE_PLAZA, SITIOS_DE_COCHE_EN_30, SITIOS_DE_COCHE_EN_36 } from './quiebro-plantillas';
import type { CajaDePlantilla, GrupoVariable } from './quiebro-plantillas';
import { TRAZAS_DE_LA_CIUDAD } from './quiebro-trazas';
import type { PosteDibujado, TrazaDibujada } from './quiebro-trazas';

/* ─── LAS MEDIDAS (§2.1) ─────────────────────────────────────────────────── */

/** El paso de la rejilla: solar de 36 y calle de 12. Los ejes de calle caen en `24 + 48k`. */
export const PASO_DE_LA_REJILLA = 48;
/** El lado de un solar, y su mitad: el solar del hueco `(i, j)` va de `48i − 18` a `48i + 18`. */
export const LADO_DEL_SOLAR = 36;
export const MEDIO_SOLAR = 18;
/** Una calle: acera de 3, calzada de 6 y acera de 3. */
export const ANCHO_DE_CALLE = 12;
export const ANCHO_DE_ACERA = 3;
export const ANCHO_DE_CALZADA = 6;

/** Los huecos de manzana van de `−HUECO_MAXIMO` a `HUECO_MAXIMO` en cada eje: 11 × 11 = 121. */
export const HUECO_MAXIMO = 5;
export const HUECOS_POR_LADO = 2 * HUECO_MAXIMO + 1;
export const HUECOS = HUECOS_POR_LADO * HUECOS_POR_LADO;

/** Los doce ejes de calle de cada sentido, de −264 a 264: 144 cruces y 264 tramos entre ellos. */
export const EJES_DE_LA_CIUDAD: readonly number[] = Object.freeze([-264, -216, -168, -120, -72, -24, 24, 72, 120, 168, 216, 264]);
export const CRUCES = EJES_DE_LA_CIUDAD.length * EJES_DE_LA_CIUDAD.length;
export const TRAMOS = 2 * EJES_DE_LA_CIUDAD.length * (EJES_DE_LA_CIUDAD.length - 1);

/** La acera exterior acaba en ±270 y el cerco va de ±270 a ±272: 540 m de acera a acera, 544 con el cerco. */
export const BORDE_DE_LA_CIUDAD = 270;
export const CERCO_DE_LA_CIUDAD = 272;
export const LADO_DE_LA_CIUDAD = 2 * BORDE_DE_LA_CIUDAD;

/**
 * LAS DOS AVENIDAS, de 24 m (acera de 4, calzada de 7, mediana de 2, calzada de 7, acera de 4), cada una en
 * una línea de la rejilla y comiéndose 6 m de las manzanas que dan a ella. En la traza DIBUJADA (simetría
 * 0): el Elevado corre por `x` en el eje `z = −120`, de canto a canto; el Bulevar corre por `z` en el eje
 * `x = 120`, del Elevado al canto sur. Cada simetría las mueve con todo lo demás.
 */
export const ANCHO_DE_AVENIDA = 24;
export const ACERA_DE_AVENIDA = 4;
export const CALZADA_DE_AVENIDA = 7;
export const MEDIANA_DE_AVENIDA = 2;
export const EJE_DEL_ELEVADO = -120;
export const EJE_DEL_BULEVAR = 120;
/** El viaducto, a 7,5 m sobre la mediana, con un pilar de 1 × 1 m cada 12 m fuera de los cruces. */
export const ALTO_DEL_VIADUCTO = 7.5;
export const PILARES_DEL_VIADUCTO_CADA = 12;
/** La mediana arbolada del Bulevar: un tronco cada 8 m (de 0,5 m y no de 0,6: toda medida de la ciudad va en cuartos). */
export const TRONCOS_DEL_BULEVAR_CADA = 8;
/** El tren del Elevado: cada 60 s (1.200 tics), a 16 m/s. */
export const TICS_ENTRE_TRENES = 1200;
export const METROS_DEL_TREN_POR_TIC = 0.8;
/** Lo que la avenida sigue fuera del borde antes de deshacerse en glifos (§2.5). */
export const SALIDA_DE_GLIFOS = 20;

/** Un callejón: pasaje de 6 m que parte la manzana en 15 + 6 + 15, sin acera, con una línea de grafo por el centro. */
export const ANCHO_DE_CALLEJON = 6;

/**
 * LA CASILLA DEL SUELO, de 8 m (§2.4): 69 × 69 = 4.761 casillas, centradas en los múltiplos de 8, todas
 * pisables. La casilla sólo dice «aquí hay suelo»; lo que estorba son cajas.
 */
export const LADO_DE_CASILLA_DE_LA_CIUDAD = 8;
export const CASILLAS_DEL_CENTRO_AL_BORDE = 34;
export const CASILLAS_DE_LA_CIUDAD = (2 * CASILLAS_DEL_CENTRO_AL_BORDE + 1) * (2 * CASILLAS_DEL_CENTRO_AL_BORDE + 1);

/** El grafo: una línea por el centro de cada calzada (dos en las avenidas) con un nudo cada 6 m. */
export const NUDOS_CADA = 6;
/** El radio con que se anda cada arista: el de una persona del juego. */
export const RADIO_DEL_GRAFO = 0.35;

/** Los topes que el comprobador de la ciudad exige en las 32 trazas (§2.8); la Liza admite más. */
export const TOPE_DE_CAJAS_DE_LA_CIUDAD = 2400;
export const TOPE_DE_NUDOS_DE_LA_CIUDAD = 4500;
export const TOPE_DE_ARISTAS_DE_LA_CIUDAD = 6500;

/** Las trazas: 4 dibujadas × 8 simetrías. `traza = dibujo · SIMETRIAS + simetria`. */
export const TRAZAS_DIBUJADAS = 4;
export const SIMETRIAS = 8;
export const TRAZAS = TRAZAS_DIBUJADAS * SIMETRIAS;

/** Cuántas de cada cosa tiene toda ciudad (§2.3, §2.8, §4). */
export const PLAZAS_POR_CIUDAD = 6;
export const CABINAS_POR_CIUDAD = 20;
export const REFUGIOS_POR_CIUDAD = 10;
export const SITIOS_POR_REFUGIO = 3;
export const SITIOS_DE_ASIENTO_POR_PLAZA = 6;
export const ZONAS_DE_IMPRESION_POR_PLAZA = 8;
export const BOCAS_POR_PLAZA = 8;
export const ARCAS_POR_CIUDAD = 16;
/** El límite de la Bajada: la plaza de 60 × 60 m (36 de hueco más 12 de cada calle). */
export const LADO_DEL_LIMITE_DE_PLAZA = 60;

/** La plaza 1 es la Glorieta del Relojero, en el hueco (0, 0), en todas las trazas y con todas las simetrías. */
export const LA_GLORIETA_DEL_RELOJERO = 1;

/** Cuántas ciudades de mesa se guardan (§5.1): las 16 últimas por (traza, código). */
export const CIUDADES_GUARDADAS = 16;

/**
 * LOS NOMBRES QUE SE LEEN (§2.7) viven en `quiebro-nombres.ts`: aquí van ÍNDICES a sus listas, y éstos son
 * los largos mínimos que esas listas tienen que tener. El 0 de las plazas es «Glorieta del Relojero».
 */
export const NOMBRES_DE_PLAZA_COMO_MINIMO = 16;
export const NOMBRES_DE_CALLE_COMO_MINIMO = 40;
export const NOMBRES_DE_PASAJE_COMO_MINIMO = 24;

/* ─── LOS DISTRITOS (§2.2) ───────────────────────────────────────────────── */

/** Los cinco distritos. Sus nombres que se leen, en `quiebro-nombres.ts`. */
export type IdDeDistrito = 'casco' | 'ensanche' | 'lonja' | 'naves' | 'torres';
export const DISTRITOS: readonly IdDeDistrito[] = Object.freeze(['casco', 'ensanche', 'lonja', 'naves', 'torres'] as const);

/** Las plantillas de plaza de la v1 (§2.3). La fase 2 trae más. */
export type IdDePlantilla = 'glorieta' | 'porticada' | 'patio';
export const PLANTILLAS: readonly IdDePlantilla[] = Object.freeze(['glorieta', 'porticada', 'patio'] as const);

/**
 * EL MOLINETE DIBUJADO (simetría 0): el Casco en las 5 × 5 del centro y cada distrito de fuera en una franja
 * de 3 × 8 que incluye su esquina, separados por las líneas ±120. Es el mapa del §2.2 tal cual:
 *
 *            i →  −5 −4 −3 −2 −1  0 +1 +2 +3 +4 +5
 *     j  −5..−3    O  O  O  N  N  N  N  N  N  N  N
 *        −2..+2    O  O  O  C  C  C  C  C  E  E  E
 *        +3..+5    S  S  S  S  S  S  S  S  E  E  E
 */
function distritoDibujado(i: number, j: number): IdDeDistrito {
  if (j <= -3 && i >= -2) return 'naves';
  if (i <= -3 && j <= 2) return 'lonja';
  if (j >= 3 && i <= 2) return 'ensanche';
  if (i >= 3 && j >= -2) return 'torres';
  return 'casco';
}

/** El distrito del hueco `(i, j)` en una traza con la simetría `simetria`. Lanza fuera de la rejilla. */
export function distritoDelHueco(simetria: number, i: number, j: number): IdDeDistrito {
  comprobarHueco(i, j);
  const antes = huecoAntesDeLaSimetria(simetria, i, j);
  return distritoDibujado(antes.i, antes.j);
}

/* ─── LOS HUECOS ─────────────────────────────────────────────────────────── */

/** Un hueco de la rejilla: `i` a lo largo de `x`, `j` a lo largo de `z`, de −5 a 5. */
export interface CoordenadaDeHueco {
  readonly i: number;
  readonly j: number;
}

function comprobarHueco(i: number, j: number): void {
  if (!Number.isInteger(i) || !Number.isInteger(j) || Math.abs(i) > HUECO_MAXIMO || Math.abs(j) > HUECO_MAXIMO) {
    throw new RangeError(`No hay hueco (${String(i)}, ${String(j)}): van de −${String(HUECO_MAXIMO)} a ${String(HUECO_MAXIMO)}.`);
  }
}

/** El índice de un hueco en `CiudadDeLaMesa.huecos`: `(j + 5) · 11 + (i + 5)`, de 0 a 120. */
export function indiceDeHueco(i: number, j: number): number {
  comprobarHueco(i, j);
  return (j + HUECO_MAXIMO) * HUECOS_POR_LADO + (i + HUECO_MAXIMO);
}

/** El hueco de un índice. Lanza fuera de 0-120. */
export function huecoDelIndice(indice: number): CoordenadaDeHueco {
  if (!Number.isInteger(indice) || indice < 0 || indice >= HUECOS) throw new RangeError(`No hay hueco ${String(indice)}: son ${String(HUECOS)}.`);
  return { i: (indice % HUECOS_POR_LADO) - HUECO_MAXIMO, j: Math.floor(indice / HUECOS_POR_LADO) - HUECO_MAXIMO };
}

/* ─── LAS OCHO SIMETRÍAS (§2.6) ──────────────────────────────────────────── */

/**
 * `simetria` es un número de 0 a 7 con tres bits que se aplican EN ESTE ORDEN: el 4 cambia los ejes (`x` por
 * `z`), el 1 da la vuelta a `x` y el 2 da la vuelta a `z`. Las ocho del cuadrado, y ninguna mueve el
 * centro: la Glorieta del Relojero se queda en (0, 0). Las distancias entre plazas no cambian con ninguna.
 */
function comprobarSimetria(s: number): void {
  if (!Number.isInteger(s) || s < 0 || s >= SIMETRIAS) throw new RangeError(`No hay simetría ${String(s)}: van de 0 a ${String(SIMETRIAS - 1)}.`);
}

/** Un punto de la traza dibujada, llevado a la traza con la simetría `s`. */
export function puntoSimetrico(s: number, x: number, z: number): Punto {
  comprobarSimetria(s);
  const a = (s & 4) !== 0 ? z : x;
  const b = (s & 4) !== 0 ? x : z;
  return { x: (s & 1) !== 0 ? -a || 0 : a, z: (s & 2) !== 0 ? -b || 0 : b };
}

/** El punto de la traza dibujada que la simetría `s` lleva a `(x, z)`: la inversa de `puntoSimetrico`. */
export function puntoAntesDeLaSimetria(s: number, x: number, z: number): Punto {
  comprobarSimetria(s);
  const a = (s & 1) !== 0 ? -x || 0 : x;
  const b = (s & 2) !== 0 ? -z || 0 : z;
  return (s & 4) !== 0 ? { x: b, z: a } : { x: a, z: b };
}

/** Un hueco de la traza dibujada, en la traza con la simetría `s`. */
export function huecoSimetrico(s: number, i: number, j: number): CoordenadaDeHueco {
  const p = puntoSimetrico(s, i, j);
  return { i: p.x, j: p.z };
}

/** El hueco de la traza dibujada que la simetría `s` lleva a `(i, j)`. */
export function huecoAntesDeLaSimetria(s: number, i: number, j: number): CoordenadaDeHueco {
  const p = puntoAntesDeLaSimetria(s, i, j);
  return { i: p.x, j: p.z };
}

/** Un rectángulo de la traza dibujada, en la traza con la simetría `s` (sigue con `x0 < x1` y `z0 < z1`). */
export function rectanguloSimetrico(s: number, r: Rectangulo): Rectangulo {
  const a = puntoSimetrico(s, r.x0, r.z0);
  const b = puntoSimetrico(s, r.x1, r.z1);
  return { x0: a.x < b.x ? a.x : b.x, z0: a.z < b.z ? a.z : b.z, x1: a.x < b.x ? b.x : a.x, z1: a.z < b.z ? b.z : a.z };
}

/** Un rumbo (0-255) de la traza dibujada, en la traza con la simetría `s`. */
export function rumboSimetrico(s: number, rumbo: number): number {
  comprobarSimetria(s);
  let r = ((rumbo % 256) + 256) % 256;
  /* Cambiar los ejes lleva (dx, dz) a (dz, dx): el norte (0, −1) al oeste (−1, 0), el este al sur. */
  if ((s & 4) !== 0) r = (192 - r + 256) % 256;
  if ((s & 1) !== 0) r = (256 - r) % 256;
  if ((s & 2) !== 0) r = (128 - r + 256) % 256;
  return r;
}

/** Una cara de fachada de la traza dibujada, en la traza con la simetría `s`. */
export function caraSimetrica(s: number, cara: Cara): Cara {
  const r = rumboSimetrico(s, cara === 'norte' ? 0 : cara === 'este' ? 64 : cara === 'sur' ? 128 : 192);
  return r === 0 ? 'norte' : r === 64 ? 'este' : r === 128 ? 'sur' : 'oeste';
}

/** Un eje de la traza dibujada, en la traza con la simetría `s`: cambiar los ejes es lo único que lo mueve. */
export function ejeSimetrico(s: number, eje: Eje): Eje {
  comprobarSimetria(s);
  return (s & 4) !== 0 ? (eje === 'x' ? 'z' : 'x') : eje;
}

/** De qué traza dibujada y con qué simetría es la traza `traza` (0-31). Lanza fuera de rango. */
export function partesDeLaTraza(traza: number): { readonly dibujo: number; readonly simetria: number } {
  if (!Number.isInteger(traza) || traza < 0 || traza >= TRAZAS) throw new RangeError(`No hay traza ${String(traza)}: van de 0 a ${String(TRAZAS - 1)}.`);
  return { dibujo: Math.floor(traza / SIMETRIAS), simetria: traza % SIMETRIAS };
}

/* ─── LA NUMERACIÓN QUE VE LA LIZA ───────────────────────────────────────── */

/** Qué es cada zona de una plaza (§2.3): la del Fallo, las 8 de impresión y las 8 bocas. */
export type TipoDeZonaDePlaza = 'fallo' | 'impresion' | 'boca';

/** Cuántas zonas tiene cada plaza, y cuántas llevan antes que ellas las cabinas, los refugios y las arcas. */
export const ZONAS_POR_PLAZA = 1 + ZONAS_DE_IMPRESION_POR_PLAZA + BOCAS_POR_PLAZA;
const PRIMERA_ZONA_DE_CABINA = 1 + PLAZAS_POR_CIUDAD * ZONAS_POR_PLAZA;
const PRIMERA_ZONA_DE_REFUGIO = PRIMERA_ZONA_DE_CABINA + CABINAS_POR_CIUDAD;
const PRIMERA_ZONA_DE_ARCA = PRIMERA_ZONA_DE_REFUGIO + REFUGIOS_POR_CIUDAD;
/** El mayor id de zona de una ciudad: el de la última arca. */
export const ULTIMA_ZONA_DE_LA_CIUDAD = PRIMERA_ZONA_DE_ARCA + ARCAS_POR_CIUDAD - 1;

function comprobarPlaza(plaza: number): void {
  if (!Number.isInteger(plaza) || plaza < 1 || plaza > PLAZAS_POR_CIUDAD) throw new RangeError(`No hay plaza ${String(plaza)}: van de 1 a ${String(PLAZAS_POR_CIUDAD)}.`);
}

function comprobarCuenta(k: number, cuantas: number, que: string): void {
  if (!Number.isInteger(k) || k < 0 || k >= cuantas) throw new RangeError(`No hay ${que} ${String(k)}: van de 0 a ${String(cuantas - 1)}.`);
}

/**
 * EL ID DE UNA ZONA DE PLAZA en la Liza (1-102): la plaza `p` tiene, desde `(p − 1) · 17 + 1`, su zona del
 * Fallo, sus 8 de impresión (`k` 0-7) y sus 8 bocas (`k` 0-7). La del Fallo lleva `k` 0.
 */
export function idDeZonaDePlaza(plaza: number, tipo: TipoDeZonaDePlaza, k: number): number {
  comprobarPlaza(plaza);
  const base = (plaza - 1) * ZONAS_POR_PLAZA + 1;
  if (tipo === 'fallo') {
    comprobarCuenta(k, 1, 'zona del Fallo');
    return base;
  }
  if (tipo === 'impresion') {
    comprobarCuenta(k, ZONAS_DE_IMPRESION_POR_PLAZA, 'zona de impresión');
    return base + 1 + k;
  }
  comprobarCuenta(k, BOCAS_POR_PLAZA, 'boca');
  return base + 1 + ZONAS_DE_IMPRESION_POR_PLAZA + k;
}

/** El id de la zona de la cabina candidata `k` (0-19): de 103 a 122. */
export function idDeZonaDeCabina(k: number): number {
  comprobarCuenta(k, CABINAS_POR_CIUDAD, 'cabina');
  return PRIMERA_ZONA_DE_CABINA + k;
}

/** El id de la zona del refugio `k` (0-9): de 123 a 132. */
export function idDeZonaDeRefugio(k: number): number {
  comprobarCuenta(k, REFUGIOS_POR_CIUDAD, 'refugio');
  return PRIMERA_ZONA_DE_REFUGIO + k;
}

/** El id de la zona del sitio de arca `k` (0-15, entrega 3): de 133 a 148. */
export function idDeZonaDeArca(k: number): number {
  comprobarCuenta(k, ARCAS_POR_CIUDAD, 'arca');
  return PRIMERA_ZONA_DE_ARCA + k;
}

/** Qué es la zona `id` de una ciudad, o `null` si ninguna ciudad tiene esa zona. La inversa de las cuatro de arriba. */
export type QueZonaEs =
  | { readonly que: 'plaza'; readonly plaza: number; readonly tipo: TipoDeZonaDePlaza; readonly k: number }
  | { readonly que: 'cabina'; readonly k: number }
  | { readonly que: 'refugio'; readonly k: number }
  | { readonly que: 'arca'; readonly k: number };

export function queZonaEs(id: number): QueZonaEs | null {
  if (!Number.isInteger(id) || id < 1 || id > ULTIMA_ZONA_DE_LA_CIUDAD) return null;
  if (id >= PRIMERA_ZONA_DE_ARCA) return { que: 'arca', k: id - PRIMERA_ZONA_DE_ARCA };
  if (id >= PRIMERA_ZONA_DE_REFUGIO) return { que: 'refugio', k: id - PRIMERA_ZONA_DE_REFUGIO };
  if (id >= PRIMERA_ZONA_DE_CABINA) return { que: 'cabina', k: id - PRIMERA_ZONA_DE_CABINA };
  const n = id - 1;
  const plaza = Math.floor(n / ZONAS_POR_PLAZA) + 1;
  const dentro = n % ZONAS_POR_PLAZA;
  if (dentro === 0) return { que: 'plaza', plaza, tipo: 'fallo', k: 0 };
  if (dentro <= ZONAS_DE_IMPRESION_POR_PLAZA) return { que: 'plaza', plaza, tipo: 'impresion', k: dentro - 1 };
  return { que: 'plaza', plaza, tipo: 'boca', k: dentro - 1 - ZONAS_DE_IMPRESION_POR_PLAZA };
}

/**
 * LA CLASE DE UNA ZONA DE PLAZA (la que eligen los grupos de un encuentro): `10 · plaza + t`, con `t` 1 el
 * Fallo, 2 la impresión y 3 las bocas. De 11 a 63.
 */
export function claseDeZonaDePlaza(plaza: number, tipo: TipoDeZonaDePlaza): number {
  comprobarPlaza(plaza);
  return 10 * plaza + (tipo === 'fallo' ? 1 : tipo === 'impresion' ? 2 : 3);
}

/** Las clases de las cabinas y de los refugios: todas las de la ciudad en una. */
export const CLASE_DE_ZONA_DE_CABINA = 100;
export const CLASE_DE_ZONA_DE_REFUGIO = 101;

/**
 * La clase del sitio de arca `k`: una por sitio (110-125), para que el encuentro de cada tramo encienda LOS
 * QUE QUIERA —dos buzones y una caja, cerca de la ruta— sin que el mundo, que es el mismo toda la noche,
 * tenga que cambiar (L12).
 */
export function claseDeZonaDeArca(k: number): number {
  comprobarCuenta(k, ARCAS_POR_CIUDAD, 'arca');
  return 110 + k;
}

/** Los límites de fase: `ciudad` (1) en todo lo que no es la Bajada, y `plaza-k` (1 + k) en la Bajada. */
export const ID_DEL_LIMITE_DE_LA_CIUDAD = 1;
export function idDelLimiteDePlaza(plaza: number): number {
  comprobarPlaza(plaza);
  return 1 + plaza;
}

/* ─── LOS TIPOS DE LA CIUDAD DE LA MESA ──────────────────────────────────── */

/** Qué hay en un hueco. `callejon` es una manzana partida por un pasaje (dos edificios). */
export type UsoDelHueco = 'edificio' | 'plaza' | 'callejon';

/**
 * UN HUECO DE MANZANA: su solar, su distrito y qué hay en él. El solar mide 36 × 36, o 30 en el eje en que
 * da a una avenida. `callejon` es el eje por el que CORRE el pasaje (sólo con uso `callejon`); `plaza`, el
 * número de la plaza (0 si no lo es); `soportales`, las caras de su manzana que llevan soportal; y
 * `edificios`, índices de `CiudadDeLaMesa.edificios` (uno, dos con callejón, ninguno en una plaza).
 */
export interface HuecoDeLaCiudad {
  readonly indice: number;
  readonly i: number;
  readonly j: number;
  readonly distrito: IdDeDistrito;
  readonly solar: Rectangulo;
  readonly uso: UsoDelHueco;
  readonly callejon: Eje | null;
  readonly plaza: number;
  readonly soportales: readonly Cara[];
  readonly edificios: readonly number[];
}

/**
 * UNA PLAZA (§2.3): un hueco sin edificar con su plantilla y sus cuatro calles. `numero` es 1-6 (la 1, la
 * Glorieta del Relojero); `nombre`, su índice en la lista de plazas de `quiebro-nombres.ts`; `limite`, el
 * cuadrado de 60 m de la Bajada, que en la Liza es el límite `idDelLimiteDePlaza(numero)`; `nudo`, el nudo
 * de su centro (de donde se miden sus distancias); `objeto`, lo que falla y se lee (la Lectura, §3.3); y
 * `nace`, sus 6 sitios de asiento. Las zonas van por su id (`idDeZonaDePlaza`).
 */
export interface PlazaDeLaCiudad {
  readonly numero: number;
  readonly hueco: number;
  readonly distrito: IdDeDistrito;
  readonly plantilla: IdDePlantilla;
  readonly nombre: number;
  readonly centro: Punto;
  readonly limite: Rectangulo;
  readonly nudo: number;
  readonly objeto: Punto;
  readonly nace: readonly SitioDelBarrio[];
}

/** Qué clase de calle es una línea entera: la de fuera (±264), una mayor (±120 sin avenida), una avenida o una calle. */
export type ClaseDeCalle = 'calle' | 'mayor' | 'avenida' | 'exterior';

/**
 * UNA CALLE: una línea entera de la rejilla, de canto a canto. `eje` es por dónde corre y `linea` la
 * coordenada de su eje en el otro; `nombre`, su índice en la lista de calles de `quiebro-nombres.ts` (las
 * avenidas llevan el suyo propio y aquí −1). Doce corren por `x` (las primeras, de norte a sur) y doce por
 * `z` (de oeste a este).
 */
export interface CalleDeLaCiudad {
  readonly indice: number;
  readonly eje: Eje;
  readonly linea: number;
  readonly clase: ClaseDeCalle;
  readonly ancho: number;
  readonly nombre: number;
}

/**
 * Un lado de un tramo de calle: el hueco al que da (o `null` fuera del borde) y qué le da la cara.
 * `soportal` dice si esa fachada lo lleva.
 */
export interface LadoDelTramo {
  readonly hueco: number | null;
  readonly frente: 'edificio' | 'plaza' | 'callejon' | 'borde';
  readonly soportal: boolean;
}

/**
 * UN TRAMO DE CALLE: lo que hay entre dos cruces seguidos de una calle. `desde`/`hasta` van de centro de
 * cruce a centro de cruce a lo largo de `eje`; `cruces`, sus dos cruces (índices de `CiudadDeLaMesa.cruces`);
 * `lados[0]`, el de la coordenada menor. `daAPlaza` si uno de sus lados es una plaza: ahí no va nunca un
 * corte de obra.
 */
export interface TramoDeLaCiudad {
  readonly indice: number;
  readonly calle: number;
  readonly eje: Eje;
  readonly centro: number;
  readonly desde: number;
  readonly hasta: number;
  readonly cruces: readonly [number, number];
  readonly clase: ClaseDeCalle;
  readonly ancho: number;
  readonly lados: readonly [LadoDelTramo, LadoDelTramo];
  readonly daAPlaza: boolean;
}

/** UNA AVENIDA (§2.1): corre a lo largo de `eje` por la `linea` del otro, de `desde` a `hasta` (acera exterior incluida). */
export interface AvenidaDeLaCiudad {
  readonly id: 'elevado' | 'bulevar';
  readonly eje: Eje;
  readonly linea: number;
  readonly desde: number;
  readonly hasta: number;
  readonly ancho: number;
  /** Las cajas de su mediana (pilares, troncos, bancos): índices de `CiudadDeLaMesa.cajas`. */
  readonly cajas: readonly number[];
}

/** UN CALLEJÓN: el pasaje de 6 m de una manzana partida. Corre a lo largo de `eje`; `nombre`, su índice en la lista de pasajes. */
export interface CallejonDeLaCiudad {
  readonly hueco: number;
  readonly eje: Eje;
  readonly caja: Rectangulo;
  readonly nombre: number;
}

/**
 * UN EDIFICIO. Lo mismo que `EdificioDelBarrio` —porque sale del mismo generador de manzanas—, con el
 * `hueco` en vez de la manzana y las caras con soportal en plural. `caja` es su caja de choque (la planta
 * baja, retranqueada 3 m en cada cara con soportal) y `pilares`, las de los pilares de sus soportales, uno
 * cada 6 m: índices de `CiudadDeLaMesa.cajas`.
 */
export interface EdificioDeLaCiudad {
  readonly indice: number;
  readonly hueco: number;
  readonly distrito: IdDeDistrito;
  readonly huella: Rectangulo;
  readonly tramos: readonly TramoDeAltura[];
  readonly alto: number;
  readonly estilo: EstiloDeFachada;
  readonly tono: number;
  readonly vano: number;
  readonly balcones: boolean;
  readonly semilla: number;
  readonly fachadas: readonly FachadaDelEdificio[];
  readonly soportales: readonly Cara[];
  readonly caja: number;
  readonly pilares: readonly number[];
}

/**
 * Qué es cada caja: las del barrio de hoy (el viaducto usa `pilar-del-tren`; el cerco, `fachada-exterior` y
 * `valla`) y las que trae la ciudad: los troncos del Bulevar, la estatua y el mobiliario de las plantillas
 * nuevas, los refugios y los cortes de obra.
 */
export type TipoDeCajaDeLaCiudad = TipoDeCaja | 'tronco' | 'estatua' | 'contenedor' | 'carretilla' | 'muelle' | 'refugio' | 'corte';

/**
 * UNA CAJA DE LA ESTRUCTURA: lo que para a quien anda, a quien empujan y a la vista. Lo de `CajaDelBarrio`
 * (tipo, clase, alto, frente, edificio, despejable) más de quién es: `hueco`, el de la manzana o plaza que la
 * lleva (`null` en el cerco, las avenidas, las cabinas, los refugios y los cortes), y `plaza`, 1-6 si es de
 * una plaza (0 si no). `despejable` es lo que quita «Plazas despejadas» en las plazas de los Fallos.
 */
export interface CajaDeLaCiudad extends Rectangulo {
  readonly tipo: TipoDeCajaDeLaCiudad;
  readonly clase: ClaseDeCaja;
  readonly alto: number;
  readonly mira: number;
  readonly edificio: number | null;
  readonly despejable: boolean;
  readonly hueco: number | null;
  readonly plaza: number;
}

/**
 * UNA CABINA CANDIDATA de la Llamada (4 por distrito): el poste, el sitio donde se planta quien descuelga,
 * su zona (`idDeZonaDeCabina(indice)`), su caja y el tramo en que está.
 */
export interface CabinaDeLaCiudad {
  readonly indice: number;
  readonly distrito: IdDeDistrito;
  readonly poste: Punto;
  readonly mira: number;
  readonly sitio: Punto;
  readonly zona: number;
  readonly caja: number;
  readonly tramo: number;
}

/** UN REFUGIO (2 por distrito): donde se reaparece, con sus 3 sitios, su zona (`idDeZonaDeRefugio(indice)`) y su caja. */
export interface RefugioDeLaCiudad {
  readonly indice: number;
  readonly distrito: IdDeDistrito;
  readonly sitios: readonly SitioDelBarrio[];
  readonly zona: number;
  readonly caja: number;
  readonly tramo: number;
}

/**
 * UNA ZONA, ya con sus números de la Liza: `id` (1-255, su puesto en `CiudadDeLaMesa.zonas` más uno) y
 * `clase`. Contrato, como en el barrio: CUALQUIER punto de su caja es un sitio donde cabe una persona sin
 * tocar ninguna caja de ninguna noche.
 */
export interface ZonaDeLaCiudad {
  readonly id: number;
  readonly clase: number;
  readonly caja: Rectangulo;
}

/**
 * EL GRAFO: nudos en metros y aristas `{a, b, largo, tramo}` (las de `quiebro-barrio.ts`). Los `CRUCES`
 * primeros nudos son los cruces, en el orden de `CiudadDeLaMesa.cruces`. Invariantes (§5.4): toda arista va
 * por un eje (sin diagonales), su `largo` es `|Δx| + |Δz|`, y se anda en recta con `RADIO_DEL_GRAFO` en
 * cualquier noche; `tramo` es el tramo de calle que recorre, o `null` (callejones, plazas).
 */
export interface GrafoDeLaCiudad {
  readonly nudos: readonly Punto[];
  readonly aristas: readonly AristaDelGrafo[];
}

/** La red de aceras por la que andan los durmientes (la de `quiebro-barrio.ts`, a la escala de la ciudad). `cruce` es de `CiudadDeLaMesa.cruces`. */
export interface RedDeAcerasDeLaCiudad {
  readonly nudos: readonly Punto[];
  readonly tramos: readonly TramoDeAcera[];
}

/**
 * UNA CELDA DEL CLIENTE (§5.7): 48 × 48 m alineados con las manzanas —un hueco más la mitad de sus calles—.
 * La celda `(i, j)` cubre `[48i − 24, 48i + 24)` en `x` y lo mismo en `z`, de −6 a 6: las de −5 a 5 llevan
 * su hueco en el centro, y el anillo de fuera (±6) la mitad de la calle exterior, la acera, el cerco y el
 * borde de glifos. `edificios` y `tramos` son los que la tocan; `cajas`, las de la MESA cuyo centro cae
 * dentro (las de la noche, con `cajasDeLaCelda`).
 */
export interface CeldaDeLaCiudad {
  readonly i: number;
  readonly j: number;
  readonly indice: number;
  readonly caja: Rectangulo;
  readonly hueco: number | null;
  readonly distrito: IdDeDistrito | null;
  readonly edificios: readonly number[];
  readonly tramos: readonly number[];
  readonly cajas: readonly number[];
}

/**
 * LA CIUDAD DE UNA MESA: traza y edificios, la misma en sus diez noches. Congelada, y guardada la de las
 * `CIUDADES_GUARDADAS` últimas por (traza, código).
 *
 *   · `huecos`: 121, en orden de `indiceDeHueco`.     · `plazas`: 6, la 1 primero.
 *   · `calles`: 24 (12 por `x` y 12 por `z`).         · `cruces`: 144, `fila · 12 + columna`.
 *   · `tramos`: 264.                                  · `avenidas`: el Elevado y el Bulevar.
 *   · `cajas`: la estructura fija (ver la cabecera).  · `zonas`: en orden de id.
 *   · `grafo`: el base, sin cortes.                   · `celdas`: 169, en orden de `indiceDeCelda`.
 *   · `distancias`: 6 × 6, por calles entre los `nudo` de las plazas, con el grafo base.
 */
export interface CiudadDeLaMesa {
  readonly traza: number;
  readonly dibujo: number;
  readonly simetria: number;
  readonly codigo: string;
  readonly huecos: readonly HuecoDeLaCiudad[];
  readonly plazas: readonly PlazaDeLaCiudad[];
  readonly calles: readonly CalleDeLaCiudad[];
  readonly cruces: readonly Punto[];
  readonly tramos: readonly TramoDeLaCiudad[];
  readonly avenidas: readonly AvenidaDeLaCiudad[];
  readonly callejones: readonly CallejonDeLaCiudad[];
  readonly edificios: readonly EdificioDeLaCiudad[];
  readonly rotulos: readonly RotuloDelBarrio[];
  readonly cajas: readonly CajaDeLaCiudad[];
  readonly cabinas: readonly CabinaDeLaCiudad[];
  readonly refugios: readonly RefugioDeLaCiudad[];
  readonly zonas: readonly ZonaDeLaCiudad[];
  readonly grafo: GrafoDeLaCiudad;
  readonly aceras: RedDeAcerasDeLaCiudad;
  readonly distancias: readonly (readonly number[])[];
  readonly celdas: readonly CeldaDeLaCiudad[];
}

/* ─── LOS TIPOS DE LA NOCHE ──────────────────────────────────────────────── */

/** Un corte de obra: el tramo que corta y su caja (índice de `NocheDeLaCiudad.cajas`). */
export interface CorteDeObra {
  readonly tramo: number;
  readonly caja: number;
}

/**
 * EL TREN DEL ELEVADO: corre a lo largo de `eje` por la `linea` del viaducto, de `desde` a `hasta` (la
 * salida de glifos incluida), a `alto` metros, cada `TICS_ENTRE_TRENES` con el `desfaseTics` de la noche y
 * en su `sentido`.
 */
export interface TrenDeLaCiudad {
  readonly eje: Eje;
  readonly linea: number;
  readonly desde: number;
  readonly hasta: number;
  readonly alto: number;
  readonly largo: number;
  readonly desfaseTics: number;
  readonly sentido: 1 | -1;
}

/**
 * LA NOCHE DE UNA CIUDAD: su vestido y sus Fallos. `fallos` son números de plaza, sin repetir: el primero,
 * la plaza de la Bajada (F1), y detrás los Fallos y las propinas en el orden de la vista; vacía antes de la
 * Bajada (la reunión). `cajas` lleva las de la mesa con sus índices y detrás las de la noche (ver la
 * cabecera); `cajasDeLaMesa`, cuántas de ellas son de la mesa. `grafo` tiene LOS MISMOS NUDOS que el base,
 * en el mismo orden —un índice de nudo es el mismo en todas las noches—, y sus aristas menos las que cruzan
 * un corte, en el mismo orden. `semaforos`, el desfase de cada uno de los 144 cruces (0-1.199).
 */
export interface NocheDeLaCiudad {
  readonly ciudad: CiudadDeLaMesa;
  readonly noche: number;
  readonly fallos: readonly number[];
  readonly plazasDespejadas: boolean;
  readonly cajas: readonly CajaDeLaCiudad[];
  readonly cajasDeLaMesa: number;
  readonly cortes: readonly CorteDeObra[];
  readonly grafo: GrafoDeLaCiudad;
  readonly semaforos: readonly number[];
  readonly tren: TrenDeLaCiudad;
  readonly tiempo: Tiempo;
  readonly hora: { readonly h: number; readonly m: number };
}

/* ─── LO QUE DERIVA LA CIUDAD: las firmas de la columna, con su obra debajo ─── */

/**
 * Lo que lanzaban las firmas de la columna mientras la ciudad no estaba escrita (ola 0). Ya no lo lanza
 * ninguna: se queda exportada porque `verify:liza-protocolo` la nombra («da una ciudad o lanza esto»).
 */
export class CiudadSinEscribir extends Error {
  constructor(que: string) {
    super(`${que} aún no está escrita: la escribe el frente Traza (docs/quiebro/CIUDAD-ABIERTA.md §6.3, ola A).`);
    this.name = 'CiudadSinEscribir';
  }
}

/**
 * LA CIUDAD DE UNA MESA (§5.1): la traza `traza` (0-31) con su simetría, y los edificios del `codigo` con un
 * chorro por manzana (`CÓDIGO#m<hueco>`). Pura y congelada; se guardan las `CIUDADES_GUARDADAS` últimas por
 * (traza, código), y la geometría de las `TRAZAS_GUARDADAS` últimas trazas aparte (ver «La obra»). Lanza con
 * una traza fuera de 0-31. El código va en mayúsculas, como en `semilla.ts`.
 */
export function ciudadDeLaMesa(traza: number, codigo: string): CiudadDeLaMesa {
  partesDeLaTraza(traza);
  return laCiudadDeLaMesa(traza, codigo.toUpperCase());
}

/**
 * LA NOCHE `noche` DE UNA CIUDAD: coches, quioscos, lo variable de las plazas, cortes, tiempo, hora,
 * semáforos y tren, con un chorro por aspecto de `CÓDIGO#noche` (lo de las plazas, del código: dentro del
 * límite de una plaza no cambia nada de una noche a otra), y el grafo de la noche. `fallos` como en
 * `NocheDeLaCiudad` (números de plaza sin repetir, cinco como mucho). Los cortes no van en un tramo que dé a
 * una plaza, dejan la ciudad conexa, y con ellos dos plazas de cualquier trío válido no quedan a más de
 * `FALLOS_CON_CORTES_COMO_MUCHO` por calles: los cortes no dependen de los Fallos, así que valen para
 * cualquier trío que elija el reductor. Con `plazasDespejadas` a `false`. `codigo` tiene que ser el de la
 * ciudad (lanza si no): dos códigos serían dos ciudades mezcladas.
 */
export function ciudadDeLaNoche(ciudad: CiudadDeLaMesa, codigo: string, noche: number, fallos: readonly number[]): NocheDeLaCiudad {
  if (codigo.toUpperCase() !== ciudad.codigo) throw new RangeError(`La noche es del código ${codigo.toUpperCase()} y la ciudad del ${ciudad.codigo}.`);
  comprobarLosFallos(fallos);
  return laNoche(ciudad, normalizarLaNoche(noche), fallos);
}

/**
 * «PLAZAS DESPEJADAS» (Memoria del Sistema, §3.9): la misma noche sin las cajas `despejable` de las plazas de
 * sus `fallos`, con todo lo que apunta a una caja por su índice renumerado (los cortes: lo de la mesa va
 * antes y no se mueve) y sin cambiar el orden de las que quedan. Despejar dos veces es despejar una, y
 * despejar la misma noche dos veces da el mismo objeto. El grafo no cambia: se hizo contra todo lo que
 * PUEDE estorbar, y quitar cajas no tapa nada. La sala (por el productor) y el cliente llaman a ésta: ven la
 * misma plaza y numeran igual.
 */
export function despejarLasPlazas(noche: NocheDeLaCiudad): NocheDeLaCiudad {
  if (noche.plazasDespejadas) return noche;
  return laNocheDespejada(noche);
}

/**
 * EL MUNDO DE LA LIZA DE UNA NOCHE (declaración B), el de `despejarLasPlazas(noche)` si `despejadas`:
 *
 *   · `suelo`: casillas de 8 m, las 4.761 pisables; `cuerpos`, las cajas de la noche en su orden; `nace` vacío.
 *   · `clasesDeCaja`: una por caja (todas `alta` en la v1).
 *   · `zonas`: las de la ciudad, con su id y su clase, en Q16.16.
 *   · `limites`: `ciudad` (id 1, de −270 a 270) y `plaza-k` (id 1 + k, el `limite` de cada plaza).
 *   · `grafo`: el de la noche, en Q16.16 y en pares, con los mismos índices.
 *   · `nace`: los 36 sitios de `asiento` —primero los 6 de la plaza de la Bajada (`fallos[0]`, o la Glorieta
 *     antes de elegirla) y detrás los de las demás, de la 1 a la 6— y los 30 de `reaparicion`, refugio a
 *     refugio por su distancia por calles al centro de esa plaza (empate: el índice menor). Así, con el
 *     `orden` de hoy (sin L6), quien nace lo hace en la plaza de la Bajada y quien reaparece en el refugio
 *     más cercano a ella. La distancia es la del grafo BASE: la de la noche cambia con las obras, y el orden
 *     de reaparecer no tiene por qué.
 *
 * La memoria de mundos (16, §5.3) es del productor: el mundo es el mismo toda la noche. Aquí sólo se guarda
 * lo que no cambia en toda la mesa (las zonas, los límites, los nudos en Q16.16, los sitios por Bajada) y
 * el mundo de cada objeto noche: la misma noche da el mismo objeto mundo.
 */
export function mundoDeLaLizaDeLaCiudad(noche: NocheDeLaCiudad, despejadas: boolean): MundoDeLaLiza {
  return elMundoDeLaLiza(noche, despejadas);
}

/**
 * Dónde va el tren del Elevado en un tic, o `null` si no está pasando: `cabeza` y `cola` a lo largo del
 * viaducto, en metros, recortadas a lo que se ve (la salida de glifos incluida). Pasa cada
 * `TICS_ENTRE_TRENES` a `METROS_DEL_TREN_POR_TIC`: todos los aparatos lo ven pasar a la vez. Lanza con un
 * tic que no es un número finito.
 */
export function trenEnLaCiudad(noche: NocheDeLaCiudad, tic: number): { readonly cabeza: number; readonly cola: number } | null {
  const t = noche.tren;
  const fase = modulo(ticDelBarrio(tic) + t.desfaseTics, TICS_ENTRE_TRENES);
  const recorrido = t.hasta - t.desde + t.largo;
  const andado = fase * METROS_DEL_TREN_POR_TIC;
  if (andado >= recorrido) return null;
  const cabeza = t.sentido > 0 ? t.desde + andado : t.hasta - andado;
  const cola = cabeza - t.sentido * t.largo;
  const recortar = (v: number): number => Math.max(t.desde, Math.min(t.hasta, v));
  return { cabeza: recortar(cabeza), cola: recortar(cola) };
}

/**
 * ¿Pueden cruzar ahora por los pasos del cruce `cruce` (0-143) los que andan a lo largo de `eje`? El
 * semáforo de `pasoAbierto` del barrio, para los 144 cruces: 30 s para los que cruzan andando por `x` y 30
 * para los que cruzan por `z`, desfasado lo que diga `semaforos[cruce]`. Lanza con un cruce que no existe o
 * un tic que no es un número finito.
 */
export function pasoAbiertoEnLaCiudad(noche: NocheDeLaCiudad, cruce: number, eje: Eje, tic: number): boolean {
  const fase = faseDelSemaforoEnLaCiudad(noche, cruce, tic);
  return eje === 'x' ? fase < TICS_EN_VERDE : fase >= TICS_EN_VERDE;
}

/** En qué tic de su ciclo de 1.200 va el semáforo de un cruce. Lanza con un cruce que no existe. */
export function faseDelSemaforoEnLaCiudad(noche: NocheDeLaCiudad, cruce: number, tic: number): number {
  const desfase = noche.semaforos[cruce];
  if (!Number.isInteger(cruce) || desfase === undefined) throw new RangeError(`No hay cruce ${String(cruce)}: son ${String(CRUCES)}, del 0 al ${String(CRUCES - 1)}.`);
  return modulo(ticDelBarrio(tic) + desfase, TICS_DEL_SEMAFORO);
}

/* ─── LOS FALLOS DE UNA NOCHE (§3.3) ─────────────────────────────────────── */

/** F2 y F3 van a esta distancia por calles de F1 y entre ellos. */
export const FALLO_MAS_CERCA = 120;
export const FALLO_MAS_LEJOS = 240;
/** Con los cortes de la noche, dos Fallos no quedan nunca más lejos que esto por calles. */
export const FALLOS_CON_CORTES_COMO_MUCHO = 260;

/**
 * LOS TRÍOS VÁLIDOS CON LA BAJADA EN `bajada`: los pares `[F2, F3]` (números de plaza, `F2 < F3`) en dos
 * distritos distintos entre sí y del de la Bajada, a `FALLO_MAS_CERCA`-`FALLO_MAS_LEJOS` por calles de la
 * Bajada y entre ellos, según la tabla `distancias` de la ciudad. En orden de `F2` y luego de `F3`: el
 * reductor sortea UNO con el azar del contexto, y el comprobador exige que en toda traza haya alguno para
 * toda Bajada.
 */
export function triosDeFallos(ciudad: Pick<CiudadDeLaMesa, 'plazas' | 'distancias'>, bajada: number): readonly (readonly [number, number])[] {
  comprobarPlaza(bajada);
  const plazas = ciudad.plazas;
  const d = ciudad.distancias;
  const distrito = (p: number): IdDeDistrito => (plazas[p - 1] as PlazaDeLaCiudad).distrito;
  const dentro = (a: number, b: number): boolean => {
    const m = (d[a - 1] as readonly number[])[b - 1] as number;
    return m >= FALLO_MAS_CERCA && m <= FALLO_MAS_LEJOS;
  };
  const salida: (readonly [number, number])[] = [];
  for (let f2 = 1; f2 <= plazas.length; f2++) {
    if (f2 === bajada || distrito(f2) === distrito(bajada) || !dentro(bajada, f2)) continue;
    for (let f3 = f2 + 1; f3 <= plazas.length; f3++) {
      if (f3 === bajada || distrito(f3) === distrito(bajada) || distrito(f3) === distrito(f2)) continue;
      if (dentro(bajada, f3) && dentro(f2, f3)) salida.push([f2, f3]);
    }
  }
  return salida;
}

/* ─── LAS CELDAS DEL CLIENTE (§5.7) ──────────────────────────────────────── */

/** El lado de una celda, y de qué celda a qué celda van en cada eje. */
export const LADO_DE_CELDA = 48;
export const CELDA_MINIMA = -6;
export const CELDA_MAXIMA = 6;
export const CELDAS_POR_LADO = CELDA_MAXIMA - CELDA_MINIMA + 1;
export const CELDAS = CELDAS_POR_LADO * CELDAS_POR_LADO;

/** Una celda por sus dos coordenadas, de −6 a 6. */
export interface CoordenadaDeCelda {
  readonly i: number;
  readonly j: number;
}

/**
 * La celda en que cae una coordenada: `k` con `48k − 24 ≤ v < 48k + 24`. Se corrige contra los bordes
 * con productos exactos, así que un punto justo en la raya cae siempre en la de la derecha.
 */
function celdaDelValor(v: number): number {
  let k = Math.floor((v + LADO_DE_CELDA / 2) / LADO_DE_CELDA);
  if (LADO_DE_CELDA * k - LADO_DE_CELDA / 2 > v) k--;
  else if (LADO_DE_CELDA * (k + 1) - LADO_DE_CELDA / 2 <= v) k++;
  return k;
}

/** La celda del punto `(x, z)`, en metros, o `null` si cae fuera de todas (más allá de ±312). */
export function celdaDe(x: number, z: number): CoordenadaDeCelda | null {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  const i = celdaDelValor(x);
  const j = celdaDelValor(z);
  if (i < CELDA_MINIMA || i > CELDA_MAXIMA || j < CELDA_MINIMA || j > CELDA_MAXIMA) return null;
  return { i, j };
}

function comprobarCelda(i: number, j: number): void {
  if (!Number.isInteger(i) || !Number.isInteger(j) || i < CELDA_MINIMA || i > CELDA_MAXIMA || j < CELDA_MINIMA || j > CELDA_MAXIMA) {
    throw new RangeError(`No hay celda (${String(i)}, ${String(j)}): van de ${String(CELDA_MINIMA)} a ${String(CELDA_MAXIMA)}.`);
  }
}

/** El índice de una celda en `CiudadDeLaMesa.celdas`: `(j + 6) · 13 + (i + 6)`, de 0 a 168. */
export function indiceDeCelda(i: number, j: number): number {
  comprobarCelda(i, j);
  return (j - CELDA_MINIMA) * CELDAS_POR_LADO + (i - CELDA_MINIMA);
}

/** La celda de un índice. Lanza fuera de 0-168. */
export function celdaDelIndice(indice: number): CoordenadaDeCelda {
  if (!Number.isInteger(indice) || indice < 0 || indice >= CELDAS) throw new RangeError(`No hay celda ${String(indice)}: son ${String(CELDAS)}.`);
  return { i: (indice % CELDAS_POR_LADO) + CELDA_MINIMA, j: Math.floor(indice / CELDAS_POR_LADO) + CELDA_MINIMA };
}

/** Lo que cubre una celda: `[48i − 24, 48i + 24)` × `[48j − 24, 48j + 24)`. */
export function rectanguloDeLaCelda(i: number, j: number): Rectangulo {
  comprobarCelda(i, j);
  const m = LADO_DE_CELDA / 2;
  return { x0: LADO_DE_CELDA * i - m, z0: LADO_DE_CELDA * j - m, x1: LADO_DE_CELDA * i + m, z1: LADO_DE_CELDA * j + m };
}

/** Las cajas de cada celda de una noche, por celda: se reparten una vez por noche y se guardan. */
const CAJAS_POR_CELDA = new WeakMap<readonly CajaDeLaCiudad[], readonly (readonly number[])[]>();

/**
 * LAS CAJAS DE UNA CELDA en una noche: índices de `noche.cajas` cuyo CENTRO cae en la celda `(i, j)`, en
 * orden de índice. Es un reparto: cada caja está en una celda y en una sola (las que cruzan una raya, como
 * los pilares de la mediana, van a la de su centro), así que pintar celda a celda no pinta nada dos veces
 * ni se deja nada. Una caja cuyo centro cae fuera de todas las celdas no está en ninguna (no hay ninguna
 * así: el cerco llega a ±272). Para la noche despejada, se le pasa `despejarLasPlazas(noche)`.
 */
export function cajasDeLaCelda(noche: Pick<NocheDeLaCiudad, 'cajas'>, i: number, j: number): readonly number[] {
  const k = indiceDeCelda(i, j);
  let reparto = CAJAS_POR_CELDA.get(noche.cajas);
  if (reparto === undefined) {
    const listas: number[][] = [];
    for (let c = 0; c < CELDAS; c++) listas.push([]);
    const cajas = noche.cajas;
    for (let n = 0; n < cajas.length; n++) {
      const caja = cajas[n] as CajaDeLaCiudad;
      const celda = celdaDe((caja.x0 + caja.x1) / 2, (caja.z0 + caja.z1) / 2);
      if (celda !== null) (listas[indiceDeCelda(celda.i, celda.j)] as number[]).push(n);
    }
    reparto = listas;
    CAJAS_POR_CELDA.set(noche.cajas, reparto);
  }
  return reparto[k] as readonly number[];
}

/* ─── LAS DISTANCIAS POR CALLES ──────────────────────────────────────────── */

/**
 * UN CAMPO DE DISTANCIAS: lo que se anda por el grafo desde cada nudo hasta `meta`, en metros; −1 si no se
 * llega. Se calcula una vez por objetivo y tramo (≈ 0,3 ms con 3.500 nudos) y leerlo es una suma.
 */
export interface CampoDeDistancias {
  readonly meta: number;
  readonly metros: Float64Array;
}

/** Lo que se guarda de un grafo para no rehacerlo: sus vecinos en listas planas y un índice de nudos por celdas. */
interface IndiceDelGrafo {
  /** `vecinos[inicio[n] … inicio[n + 1])` son los vecinos de `n`, con su largo en `largos`. */
  readonly inicio: Int32Array;
  readonly vecinos: Int32Array;
  readonly largos: Float64Array;
  /** Los mismos largos en cuartos de metro, si todos lo son (ver `largosEnCuartos`); si no, `null`. */
  readonly cuartos: LargosEnCuartos | null;
  /** Los nudos por celdas de `LADO_DEL_INDICE` m: `nudos[desde[c] … desde[c + 1])`, en orden de índice. */
  readonly x0: number;
  readonly z0: number;
  readonly columnas: number;
  readonly filas: number;
  readonly desde: Int32Array;
  readonly nudos: Int32Array;
}

/** El lado de las celdas del índice de nudos: con un nudo cada 6 m, unos 5 por celda de 16 m. */
const LADO_DEL_INDICE = 16;

const INDICES = new WeakMap<GrafoDeLaCiudad, IndiceDelGrafo>();

function indiceDelGrafo(grafo: GrafoDeLaCiudad): IndiceDelGrafo {
  const hecho = INDICES.get(grafo);
  if (hecho !== undefined) return hecho;
  const nudos = grafo.nudos;
  const cuantos = nudos.length;
  const grado = new Int32Array(cuantos + 1);
  for (let i = 0; i < grafo.aristas.length; i++) {
    const a = grafo.aristas[i] as AristaDelGrafo;
    if (!Number.isInteger(a.a) || !Number.isInteger(a.b) || a.a < 0 || a.b < 0 || a.a >= cuantos || a.b >= cuantos) {
      throw new RangeError(`Una arista une ${String(a.a)} con ${String(a.b)}, y el grafo tiene ${String(cuantos)} nudos.`);
    }
    grado[a.a] = (grado[a.a] as number) + 1;
    grado[a.b] = (grado[a.b] as number) + 1;
  }
  const inicio = new Int32Array(cuantos + 1);
  for (let n = 0; n < cuantos; n++) inicio[n + 1] = (inicio[n] as number) + (grado[n] as number);
  const vecinos = new Int32Array(inicio[cuantos] as number);
  const largos = new Float64Array(inicio[cuantos] as number);
  const puesto = inicio.slice(0, cuantos);
  for (let i = 0; i < grafo.aristas.length; i++) {
    const a = grafo.aristas[i] as AristaDelGrafo;
    const p = nudos[a.a] as Punto;
    const q = nudos[a.b] as Punto;
    const largo = Math.abs(q.x - p.x) + Math.abs(q.z - p.z);
    let k = puesto[a.a] as number;
    vecinos[k] = a.b;
    largos[k] = largo;
    puesto[a.a] = k + 1;
    k = puesto[a.b] as number;
    vecinos[k] = a.a;
    largos[k] = largo;
    puesto[a.b] = k + 1;
  }
  let x0 = 0;
  let z0 = 0;
  let x1 = 0;
  let z1 = 0;
  for (let n = 0; n < cuantos; n++) {
    const p = nudos[n] as Punto;
    if (n === 0 || p.x < x0) x0 = p.x;
    if (n === 0 || p.z < z0) z0 = p.z;
    if (n === 0 || p.x > x1) x1 = p.x;
    if (n === 0 || p.z > z1) z1 = p.z;
  }
  const columnas = Math.floor((x1 - x0) / LADO_DEL_INDICE) + 1;
  const filas = Math.floor((z1 - z0) / LADO_DEL_INDICE) + 1;
  const celdaDelNudo = new Int32Array(cuantos);
  const desde = new Int32Array(columnas * filas + 1);
  for (let n = 0; n < cuantos; n++) {
    const p = nudos[n] as Punto;
    const c = Math.floor((p.z - z0) / LADO_DEL_INDICE) * columnas + Math.floor((p.x - x0) / LADO_DEL_INDICE);
    celdaDelNudo[n] = c;
    desde[c + 1] = (desde[c + 1] as number) + 1;
  }
  for (let c = 0; c < columnas * filas; c++) desde[c + 1] = (desde[c + 1] as number) + (desde[c] as number);
  const lleno = desde.slice(0, columnas * filas);
  const enCeldas = new Int32Array(cuantos);
  /* En orden de índice dentro de cada celda: los nudos se recorren en orden y se apilan en su celda. */
  for (let n = 0; n < cuantos; n++) {
    const c = celdaDelNudo[n] as number;
    enCeldas[lleno[c] as number] = n;
    lleno[c] = (lleno[c] as number) + 1;
  }
  const indice: IndiceDelGrafo = { inicio, vecinos, largos, cuartos: largosEnCuartos(largos, cuantos), x0, z0, columnas, filas, desde, nudos: enCeldas };
  INDICES.set(grafo, indice);
  return indice;
}

/**
 * EL NUDO MÁS CERCANO a `(x, z)`, en metros y en recta, sin mirar lo que haya en medio; a igual distancia,
 * el de índice menor. −1 si el grafo no tiene nudos. Recorre anillos de celdas del índice hasta que el
 * anillo siguiente ya queda más lejos que el mejor: da lo mismo que mirar todos los nudos, y en ≈ 20.
 */
export function nudoMasCercano(grafo: GrafoDeLaCiudad, x: number, z: number): number {
  const nudos = grafo.nudos;
  if (nudos.length === 0) return -1;
  const ix = indiceDelGrafo(grafo);
  const cx = Math.floor((x - ix.x0) / LADO_DEL_INDICE);
  const cz = Math.floor((z - ix.z0) / LADO_DEL_INDICE);
  let mejor = -1;
  let mejorD = 0;
  const tope = Math.max(Math.abs(cx), Math.abs(cz), Math.abs(cx - ix.columnas + 1), Math.abs(cz - ix.filas + 1)) + 1;
  for (let r = 0; r <= tope; r++) {
    /* Lo más cerca que puede estar un nudo del anillo `r` es `(r − 1) · lado`: el punto está dentro de su celda. */
    if (mejor >= 0 && r >= 1) {
      const cerca = (r - 1) * LADO_DEL_INDICE;
      if (cerca * cerca > mejorD) break;
    }
    for (let dz = -r; dz <= r; dz++) {
      const fila = cz + dz;
      if (fila < 0 || fila >= ix.filas) continue;
      const borde = dz === -r || dz === r;
      for (let dx = -r; dx <= r; dx += borde ? 1 : 2 * r) {
        const columna = cx + dx;
        if (columna >= 0 && columna < ix.columnas) {
          const c = fila * ix.columnas + columna;
          for (let k = ix.desde[c] as number; k < (ix.desde[c + 1] as number); k++) {
            const n = ix.nudos[k] as number;
            const p = nudos[n] as Punto;
            const d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
            if (mejor < 0 || d < mejorD || (d === mejorD && n < mejor)) {
              mejor = n;
              mejorD = d;
            }
          }
        }
        if (r === 0) break;
      }
    }
  }
  return mejor;
}

/**
 * EL CAMPO HASTA EL NUDO `meta`: Dijkstra por las aristas, con su largo `|Δx| + |Δz|` (`dijkstraPlano`).
 * Los metros de cada nudo son los del camino más corto, y en la ciudad son exactos (múltiplos de 0,25 m):
 * no dependen del orden en que se visitan los nudos, así que salen los mismos en cualquier motor y con
 * cualquier cola (la de cubetas de los cuartos, o el montículo para un grafo que no va en cuartos).
 */
export function campoHasta(grafo: GrafoDeLaCiudad, meta: number): CampoDeDistancias {
  const cuantos = grafo.nudos.length;
  if (!Number.isInteger(meta) || meta < 0 || meta >= cuantos) throw new RangeError(`No hay nudo ${String(meta)}: el grafo tiene ${String(cuantos)}.`);
  const ix = indiceDelGrafo(grafo);
  return { meta, metros: dijkstraPlano(cuantos, ix.inicio, ix.vecinos, ix.largos, meta, Number.POSITIVE_INFINITY, null, ix.cuartos) };
}

/**
 * LOS METROS POR CALLES de `(x, z)` al objetivo del campo: los del campo en el nudo más cercano al punto más
 * lo que hay del punto a ese nudo por los ejes (`|Δx| + |Δz|`). −1 si desde ese nudo no se llega. Es lo que
 * enseña el HUD junto a un Fallo o una cabina, y lo mismo que mide cualquiera con el mismo campo.
 */
export function distanciaPorCalles(grafo: GrafoDeLaCiudad, campo: CampoDeDistancias, x: number, z: number): number {
  const n = nudoMasCercano(grafo, x, z);
  if (n < 0) return -1;
  const hasta = campo.metros[n];
  if (hasta === undefined || hasta < 0) return -1;
  const p = grafo.nudos[n] as Punto;
  return hasta + Math.abs(p.x - x) + Math.abs(p.z - z);
}

/**
 * EL CAMINO POR EL CAMPO desde el nudo `desde`: nudo a nudo hacia la meta por una arista que está en un
 * camino corto (`metros[v] + largo = metros[u]`; a igual, el vecino menor), hasta andar `metros` o llegar.
 * Empieza en `desde`. Vacío si desde ahí no se llega. Es el hilo de rumbo del HUD (60 m por delante) y el
 * paso de los robots que andan el grafo.
 */
export function caminoPorElCampo(grafo: GrafoDeLaCiudad, campo: CampoDeDistancias, desde: number, metros: number): readonly number[] {
  const cuantos = grafo.nudos.length;
  if (!Number.isInteger(desde) || desde < 0 || desde >= cuantos) throw new RangeError(`No hay nudo ${String(desde)}: el grafo tiene ${String(cuantos)}.`);
  if ((campo.metros[desde] as number) < 0) return [];
  const ix = indiceDelGrafo(grafo);
  const camino: number[] = [desde];
  let u = desde;
  let andado = 0;
  while (u !== campo.meta && andado < metros) {
    const du = campo.metros[u] as number;
    let siguiente = -1;
    let largo = 0;
    for (let k = ix.inicio[u] as number; k < (ix.inicio[u + 1] as number); k++) {
      const v = ix.vecinos[k] as number;
      const dv = campo.metros[v] as number;
      if (dv < 0 || dv + (ix.largos[k] as number) !== du) continue;
      if (siguiente < 0 || v < siguiente) {
        siguiente = v;
        largo = ix.largos[k] as number;
      }
    }
    if (siguiente < 0) break;
    camino.push(siguiente);
    andado += largo;
    u = siguiente;
  }
  return camino;
}

/* ─── LOS DURMIENTES DE LA CIUDAD (§5.8): firmas que escribe `quiebro-durmientes.ts` ─── */

/**
 * Los durmientes pasan de 48 a unos 630, en unas 320 cuadrillas, y su guion se escribe cuando hace falta.
 * `quiebro-durmientes.ts` exporta, con ESTOS nombres y ESTAS firmas (y conserva las de hoy hasta que la
 * multitud pase a éstas, en la ola B):
 *
 *   · `durmientesDeLaCiudad: CuantosDurmientes` — cuántos tiene la ciudad de una mesa. Sus índices (0 …
 *     n − 1) son los mismos todas las noches: son los que `FuenteDeCuerpos.prestados()` nombra.
 *   · `sitioDelDurmienteEnLaCiudad: SitioDeUnDurmiente` — dónde está el `i` en el tic `tic`, en Q16.16, o
 *     `null` si esta noche no sale (su vuelta pasa por un corte de obra).
 *   · `durmienteMasCercanoEnLaCiudad: DurmienteMasCercano` — el que sale de un Prestado: el más cercano a
 *     `(x, z)` (Q16.16) a `radio` o menos (60 m por defecto), sin los `excluidos`; empate, el índice menor;
 *     `null` si no hay nadie (las Naves de madrugada: el Prestado se imprime). Igual en todos los aparatos.
 *   · `durmientesCercaEnLaCiudad: DurmientesCerca` — los que están a `radio` o menos de `(x, z)`, en orden
 *     de (distancia, índice), como mucho `tope`: los 64 que se pintan a 90 m y los de 40 m de cada jugador.
 */
export type CuantosDurmientes = (ciudad: CiudadDeLaMesa) => number;
export type SitioDeUnDurmiente = (
  noche: NocheDeLaCiudad,
  i: number,
  tic: number,
) => { readonly x: number; readonly z: number; readonly rumbo: number; readonly anda: boolean } | null;
export type DurmienteMasCercano = (noche: NocheDeLaCiudad, tic: number, x: number, z: number, excluidos: readonly number[], radio?: number) => number | null;
export type DurmientesCerca = (noche: NocheDeLaCiudad, tic: number, x: number, z: number, radio: number, tope: number) => readonly number[];

/** Los radios del §5.8, en metros: de dónde sale un Prestado, qué se pinta, y quién es candidato siempre. */
export const RADIO_DEL_PRESTADO = 60;
export const RADIO_DE_LO_QUE_SE_PINTA = 90;
export const DURMIENTES_QUE_SE_PINTAN = 64;
export const RADIO_DE_LOS_CANDIDATOS = 40;

/* ═══════════════════════════════════════════════════════════════════════════
 *  LA OBRA: CÓMO SE DERIVA LA CIUDAD (frente Traza, ola A de CIUDAD-ABIERTA §6.3)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ═══ TRES CAPAS, Y LO QUE CUESTA CADA UNA ═══
 *
 *   · LA GEOMETRÍA DE UNA TRAZA (`geometriaDeLaTraza`): la traza dibujada con su simetría (`trazaOrientada`),
 *     los solares, los tramos, TODAS las cajas de la mesa (con los edificios aún sin alto), las zonas, el
 *     grafo base, la red de aceras, las celdas y lo que la noche necesita para vestirse. Es lo caro, y no
 *     depende del código: se guarda la de las `TRAZAS_GUARDADAS` últimas trazas del proceso, que es lo que
 *     pidió la medida de la puerta (una traza nueva es lo que no cabía en 8 ms).
 *   · LA CIUDAD DE LA MESA (`ciudadDeLaMesa`): la geometría y el vestido de cada manzana con su chorro
 *     (`vestirLaManzana`). Barata: lo único nuevo son los edificios, sus rótulos y sus cajas con su alto.
 *   · LA NOCHE (`ciudadDeLaNoche`): coches, quioscos, lo variable de las plazas (del código, lo mismo cada
 *     noche), las obras, el tiempo, la hora, los semáforos, el tren y el grafo sin lo que cruza una obra.
 *     Se guarda por ciudad y noche; los Fallos sólo cambian `fallos`, así que elegirlos en la Bajada no
 *     vuelve a vestir nada.
 *
 * ═══ SE CONSTRUYE ORIENTADA, NO SE GIRA AL FINAL ═══
 *
 * La simetría se aplica a los DATOS —la traza dibujada y las plantillas— y la ciudad se construye ya en su
 * orientación, con avenidas que pueden correr por `x` o por `z`. Girar al final lo hecho sería más corto
 * de escribir y obligaría a renumerar: el orden de las cajas es el de los huecos de la ciudad orientada,
 * los 144 primeros nudos son los cruces en su orden, y los chorros de azar van por índice de hueco y de
 * tramo. Así el índice de un hueco, de un tramo, de un cruce o de una caja es el que se lee, sin tabla de
 * por medio. Lo que la simetría NO puede cambiar —las distancias entre plazas, que la plaza siga siendo la
 * misma plantilla girada— lo mira `verify:quiebro-barrio` en las 32.
 *
 * ═══ LO QUE NO SE SORTEA: SITIOS SIMÉTRICOS ═══
 *
 * Como en el barrio, nada se sortea y se descarta: cada cosa de la calle tiene su banda en la acera y sus
 * sitios a lo largo de la cara de su manzana, y ningún par se pisa por construcción. Y los sitios son
 * SIMÉTRICOS respecto al centro de la cara (coches, quioscos, farolas y postes): la ciudad se construye en
 * ocho orientaciones, y un sitio que sólo valiera contado desde un extremo quedaría en otro sitio al girar.
 * Por la misma razón el grafo pasa entre los coches de la plaza por huecos centrados (ver
 * `quiebro-plantillas.ts`).
 *
 * ═══ EL GRAFO: LÍNEAS POR LOS EJES, Y SE QUEDA LO QUE SE ANDA ═══
 *
 * Una línea por el centro de cada calzada (dos en las avenidas, por el centro de cada una de sus calzadas),
 * una por cada callejón y las de cada plantilla dentro de su plaza. Cada línea lleva un nudo cada
 * `NUDOS_CADA` metros y otro en cada cruce con otra línea, y las aristas unen nudos seguidos de la misma
 * línea: sólo por los ejes, así que una diagonal no se puede ni escribir. Se queda cada arista que se anda
 * en recta con `RADIO_DEL_GRAFO` contra TODO lo que puede estorbar en cualquier noche —las cajas de la
 * mesa, cada sitio de lo variable de las plazas y los dieciséis coches de cada una—; lo demás de la noche
 * no pisa nunca una línea por la acera por bandas. Las obras sí, y por eso el grafo de la noche es el base
 * sin las aristas que cruzan una: con los MISMOS nudos, en el mismo orden.
 */

function modulo(a: number, n: number): number {
  return ((a % n) + n) % n;
}

/** Las caras en su orden de siempre, y su bit en los mapas de soportales de las trazas. */
const CARAS: readonly Cara[] = ['norte', 'este', 'sur', 'oeste'];
const BIT_DE_LA_CARA: Readonly<Record<Cara, number>> = { norte: 1, este: 2, sur: 4, oeste: 8 };

/** Dónde va la línea del grafo de cada calzada de una avenida: a media mediana más media calzada del eje (4,5 m). */
const MEDIO_EJE_DE_LA_CALZADA_DE_AVENIDA = MEDIANA_DE_AVENIDA / 2 + CALZADA_DE_AVENIDA / 2;

/** Congela un objeto recién hecho y lo devuelve (sin recorrerlo: cada pieza se congela al hacerse). */
function fijo<T extends object>(v: T): T {
  return Object.freeze(v);
}

/** Congela un valor entero, con todo lo que cuelga de él: sólo para lo que se hace una vez por traza. */
function congeladoEntero<T>(valor: T): T {
  if (typeof valor !== 'object' || valor === null || Object.isFrozen(valor)) return valor;
  Object.freeze(valor);
  for (const clave of Object.keys(valor)) congeladoEntero((valor as Record<string, unknown>)[clave]);
  return valor;
}

/* ─── La traza orientada ──────────────────────────────────────────────────── */

/** Una avenida ya orientada: corre a lo largo de `eje` por la `linea` del otro, de `desde` a `hasta` (del canto, o del eje de la otra avenida en la que acaba). */
export interface AvenidaOrientada {
  readonly id: 'elevado' | 'bulevar';
  readonly eje: Eje;
  readonly linea: number;
  readonly desde: number;
  readonly hasta: number;
}

/** Las dos avenidas de la traza dibujada (§2.1): el Elevado de canto a canto y el Bulevar del Elevado al canto sur. */
const AVENIDAS_DIBUJADAS: readonly AvenidaOrientada[] = [
  { id: 'elevado', eje: 'x', linea: EJE_DEL_ELEVADO, desde: -BORDE_DE_LA_CIUDAD, hasta: BORDE_DE_LA_CIUDAD },
  { id: 'bulevar', eje: 'z', linea: EJE_DEL_BULEVAR, desde: EJE_DEL_ELEVADO, hasta: BORDE_DE_LA_CIUDAD },
];

function avenidaOrientada(s: number, a: AvenidaOrientada): AvenidaOrientada {
  const p = a.eje === 'x' ? puntoSimetrico(s, a.desde, a.linea) : puntoSimetrico(s, a.linea, a.desde);
  const q = a.eje === 'x' ? puntoSimetrico(s, a.hasta, a.linea) : puntoSimetrico(s, a.linea, a.hasta);
  const eje = ejeSimetrico(s, a.eje);
  const u0 = eje === 'x' ? p.x : p.z;
  const u1 = eje === 'x' ? q.x : q.z;
  return { id: a.id, eje, linea: eje === 'x' ? p.z : p.x, desde: Math.min(u0, u1), hasta: Math.max(u0, u1) };
}

/** La avenida que corre a lo largo de `eje` por `linea`, o `null`. */
function avenidaSobre(avenidas: readonly AvenidaOrientada[], eje: Eje, linea: number): AvenidaOrientada | null {
  for (const a of avenidas) if (a.eje === eje && a.linea === linea) return a;
  return null;
}

/** ¿Pasa la avenida por la coordenada `v` a lo largo? Estricto: donde acaba en el eje de otra, ya no. */
function pasaPor(a: AvenidaOrientada, v: number): boolean {
  return v > a.desde && v < a.hasta;
}

/**
 * EL SOLAR DEL HUECO (`i`, `j`): 36 × 36 centrado en (48i, 48j), menos 6 m en cada lado que da a una
 * avenida que pasa por delante (la avenida mide 24 y ocupa la línea de una calle de 12: §2.1).
 */
export function solarDelHueco(avenidas: readonly AvenidaOrientada[], i: number, j: number): Rectangulo {
  let x0 = PASO_DE_LA_REJILLA * i - MEDIO_SOLAR;
  let x1 = PASO_DE_LA_REJILLA * i + MEDIO_SOLAR;
  let z0 = PASO_DE_LA_REJILLA * j - MEDIO_SOLAR;
  let z1 = PASO_DE_LA_REJILLA * j + MEDIO_SOLAR;
  const come = (ANCHO_DE_AVENIDA - ANCHO_DE_CALLE) / 2;
  for (const a of avenidas) {
    if (a.eje === 'x' && pasaPor(a, PASO_DE_LA_REJILLA * i)) {
      if (z1 + ANCHO_DE_CALLE / 2 === a.linea) z1 -= come;
      if (z0 - ANCHO_DE_CALLE / 2 === a.linea) z0 += come;
    } else if (a.eje === 'z' && pasaPor(a, PASO_DE_LA_REJILLA * j)) {
      if (x1 + ANCHO_DE_CALLE / 2 === a.linea) x1 -= come;
      if (x0 - ANCHO_DE_CALLE / 2 === a.linea) x0 += come;
    }
  }
  return { x0, z0, x1, z1 };
}

/** Un poste ya orientado: la cara `cara` de la manzana del hueco `hueco`, a `a` metros de su esquina de menor coordenada. */
export interface PosteOrientado {
  readonly hueco: number;
  readonly cara: Cara;
  readonly a: number;
}

/** Una plaza de la traza orientada: su número, su hueco, su plantilla y su nombre. */
export interface PlazaOrientada {
  readonly numero: number;
  readonly hueco: number;
  readonly plantilla: IdDePlantilla;
  readonly nombre: number;
}

/**
 * LA TRAZA ORIENTADA: la dibujada con su simetría, hueco a hueco en el orden de la ciudad (`indiceDeHueco`).
 * `callejones[n]` es el eje por el que corre el callejón del hueco `n` (o `null`), `plazaDelHueco[n]` su
 * número de plaza (0 si no lo es) y `soportales[n]` las caras de su manzana que lo llevan, en el orden
 * norte, este, sur, oeste. Los nombres de calle van por calle (−1 la del Elevado, que tiene el suyo) y los
 * de pasaje por hueco (−1 sin callejón): salen de la traza dibujada, así que una calle se llama igual con
 * cualquier simetría.
 */
export interface TrazaOrientada {
  readonly traza: number;
  readonly dibujo: number;
  readonly simetria: number;
  readonly usos: readonly UsoDelHueco[];
  readonly callejones: readonly (Eje | null)[];
  readonly plazaDelHueco: readonly number[];
  readonly soportales: readonly (readonly Cara[])[];
  readonly plazas: readonly PlazaOrientada[];
  readonly avenidas: readonly AvenidaOrientada[];
  readonly cabinas: readonly PosteOrientado[];
  readonly refugios: readonly PosteOrientado[];
  readonly nombresDeCalle: readonly number[];
  readonly nombresDePasaje: readonly number[];
  readonly distancias: readonly (readonly number[])[];
}

/** El carácter del mapa `mapa` de una traza dibujada en el hueco (`i`, `j`). Lanza si el dibujo está mal formado. */
function caracterDibujado(mapa: readonly string[], i: number, j: number): string {
  const fila = mapa[j + HUECO_MAXIMO];
  if (fila === undefined || fila.length !== HUECOS_POR_LADO) throw new RangeError(`La traza dibujada tiene la fila ${String(j)} mal formada.`);
  return fila.charAt(i + HUECO_MAXIMO);
}

function posteOrientado(s: number, avenidas: readonly AvenidaOrientada[], p: PosteDibujado): PosteOrientado {
  const [di, dj, dcara, da] = p;
  const solarDibujado = solarDelHueco(AVENIDAS_DIBUJADAS, di, dj);
  const punto =
    dcara === 'norte'
      ? { x: solarDibujado.x0 + da, z: solarDibujado.z0 }
      : dcara === 'sur'
        ? { x: solarDibujado.x0 + da, z: solarDibujado.z1 }
        : dcara === 'oeste'
          ? { x: solarDibujado.x0, z: solarDibujado.z0 + da }
          : { x: solarDibujado.x1, z: solarDibujado.z0 + da };
  const h = huecoSimetrico(s, di, dj);
  const cara = caraSimetrica(s, dcara);
  const q = puntoSimetrico(s, punto.x, punto.z);
  const solar = solarDelHueco(avenidas, h.i, h.j);
  const a = cara === 'norte' || cara === 'sur' ? q.x - solar.x0 : q.z - solar.z0;
  return fijo({ hueco: indiceDeHueco(h.i, h.j), cara, a });
}

const ORIENTADAS: (TrazaOrientada | undefined)[] = [];

/** LA TRAZA `traza` (0-31) ORIENTADA. Pura; las 32 se guardan (son unos pocos kB cada una). Lanza fuera de 0-31. */
export function trazaOrientada(traza: number): TrazaOrientada {
  const { dibujo, simetria: s } = partesDeLaTraza(traza);
  const hecha = ORIENTADAS[traza];
  if (hecha !== undefined) return hecha;
  const d = TRAZAS_DE_LA_CIUDAD[dibujo];
  if (d === undefined) throw new RangeError(`No hay traza dibujada ${String(dibujo)}: hay ${String(TRAZAS_DE_LA_CIUDAD.length)}.`);
  const avenidas = AVENIDAS_DIBUJADAS.map((a) => fijo(avenidaOrientada(s, a)));
  /* El orden de los callejones en la traza dibujada, para sus nombres. */
  const ordenDelPasaje = new Map<number, number>();
  for (let j = -HUECO_MAXIMO; j <= HUECO_MAXIMO; j++) {
    for (let i = -HUECO_MAXIMO; i <= HUECO_MAXIMO; i++) {
      const c = caracterDibujado(d.huecos, i, j);
      if (c === '|' || c === '-') ordenDelPasaje.set(indiceDeHueco(i, j), ordenDelPasaje.size);
    }
  }
  const usos: UsoDelHueco[] = [];
  const callejones: (Eje | null)[] = [];
  const plazaDelHueco: number[] = [];
  const soportales: (readonly Cara[])[] = [];
  const nombresDePasaje: number[] = [];
  const plazas: (PlazaOrientada | undefined)[] = [];
  for (let n = 0; n < HUECOS; n++) {
    const { i, j } = huecoDelIndice(n);
    const v = huecoAntesDeLaSimetria(s, i, j);
    const c = caracterDibujado(d.huecos, v.i, v.j);
    const mascara = parseInt(caracterDibujado(d.soportales, v.i, v.j), 16);
    if (!(mascara >= 0 && mascara <= 15)) throw new RangeError(`La traza dibujada ${String(dibujo)} tiene un soportal que no es un dígito en (${String(v.i)}, ${String(v.j)}).`);
    const caras: Cara[] = [];
    for (const cara of CARAS) if ((mascara & BIT_DE_LA_CARA[cara]) !== 0) caras.push(caraSimetrica(s, cara));
    caras.sort((a, b) => CARAS.indexOf(a) - CARAS.indexOf(b));
    soportales.push(fijo(caras));
    if (c === '|' || c === '-') {
      usos.push('callejon');
      callejones.push(ejeSimetrico(s, c === '|' ? 'z' : 'x'));
      plazaDelHueco.push(0);
      nombresDePasaje.push(modulo(5 * (ordenDelPasaje.get(indiceDeHueco(v.i, v.j)) ?? 0) + 7 * dibujo, NOMBRES_DE_PASAJE_COMO_MINIMO));
    } else if (c >= '1' && c <= '6') {
      const numero = c.charCodeAt(0) - 48;
      usos.push('plaza');
      callejones.push(null);
      plazaDelHueco.push(numero);
      nombresDePasaje.push(-1);
      plazas[numero - 1] = fijo({ numero, hueco: n, plantilla: d.plantillas[numero - 1] ?? 'glorieta', nombre: d.nombres[numero - 1] ?? 0 });
    } else if (c === '.') {
      usos.push('edificio');
      callejones.push(null);
      plazaDelHueco.push(0);
      nombresDePasaje.push(-1);
    } else {
      throw new RangeError(`La traza dibujada ${String(dibujo)} tiene «${c}» en (${String(v.i)}, ${String(v.j)}).`);
    }
  }
  const lasPlazas: PlazaOrientada[] = [];
  for (let k = 0; k < PLAZAS_POR_CIUDAD; k++) {
    const p = plazas[k];
    if (p === undefined) throw new RangeError(`La traza dibujada ${String(dibujo)} no tiene la plaza ${String(k + 1)}.`);
    lasPlazas.push(p);
  }
  const nombresDeCalle: number[] = [];
  for (let c = 0; c < 2 * EJES_DE_LA_CIUDAD.length; c++) {
    const eje: Eje = c < EJES_DE_LA_CIUDAD.length ? 'x' : 'z';
    const linea = EJES_DE_LA_CIUDAD[c % EJES_DE_LA_CIUDAD.length] as number;
    const v = eje === 'x' ? puntoAntesDeLaSimetria(s, 0, linea) : puntoAntesDeLaSimetria(s, linea, 0);
    const ejeDibujado = ejeSimetrico(s, eje);
    const lineaDibujada = ejeDibujado === 'x' ? v.z : v.x;
    const k = (ejeDibujado === 'x' ? 0 : EJES_DE_LA_CIUDAD.length) + EJES_DE_LA_CIUDAD.indexOf(lineaDibujada);
    const elevado = ejeDibujado === 'x' && lineaDibujada === EJE_DEL_ELEVADO;
    nombresDeCalle.push(elevado ? -1 : modulo(7 * k + 11 * dibujo, NOMBRES_DE_CALLE_COMO_MINIMO));
  }
  const orientada: TrazaOrientada = {
    traza,
    dibujo,
    simetria: s,
    usos,
    callejones,
    plazaDelHueco,
    soportales,
    plazas: lasPlazas,
    avenidas,
    cabinas: d.cabinas.map((p) => posteOrientado(s, avenidas, p)),
    refugios: d.refugios.map((p) => posteOrientado(s, avenidas, p)),
    nombresDeCalle,
    nombresDePasaje,
    distancias: d.distancias,
  };
  congeladoEntero(orientada);
  ORIENTADAS[traza] = orientada;
  return orientada;
}

/* ─── Las plantillas giradas ──────────────────────────────────────────────── */

/** Los tipos de caja que tienen frente: su `mira` gira con la simetría. Lo demás lleva 0 y se queda en 0. */
const CON_FRENTE: ReadonlySet<TipoDeCajaDeLaCiudad> = new Set<TipoDeCajaDeLaCiudad>(['banco', 'quiosco', 'quiosco-de-prensa', 'coche', 'cabina', 'carretilla', 'refugio']);

/**
 * UNA PLANTILLA GIRADA con la simetría de la traza, todavía relativa al centro de su plaza. `lineasX` son
 * las `x` de sus líneas que corren por `z`, y `lineasZ` las `z` de las que corren por `x`.
 */
interface PlantillaGirada {
  readonly id: IdDePlantilla;
  readonly fijas: readonly CajaDePlantilla[];
  readonly variables: readonly GrupoVariable[];
  readonly impresion: readonly Rectangulo[];
  readonly bocas: readonly Rectangulo[];
  readonly coches: readonly CajaDePlantilla[];
  readonly fallo: Rectangulo;
  readonly objeto: Punto;
  readonly nace: readonly SitioDelBarrio[];
  readonly lineasX: readonly number[];
  readonly lineasZ: readonly number[];
  readonly centro: Punto;
}

function cajaGirada(s: number, c: CajaDePlantilla): CajaDePlantilla {
  const r = rectanguloSimetrico(s, c);
  return fijo({ x0: r.x0, z0: r.z0, x1: r.x1, z1: r.z1, tipo: c.tipo, alto: c.alto, mira: CON_FRENTE.has(c.tipo) ? rumboSimetrico(s, c.mira) : c.mira, despejable: c.despejable });
}

const GIRADAS = new Map<string, PlantillaGirada>();

function plantillaGirada(id: IdDePlantilla, s: number): PlantillaGirada {
  const llave = `${id}#${String(s)}`;
  const hecha = GIRADAS.get(llave);
  if (hecha !== undefined) return hecha;
  const p = PLANTILLAS_DE_PLAZA[id];
  const girar = (r: Rectangulo): Rectangulo => fijo(rectanguloSimetrico(s, r));
  const conSigno = (lineas: readonly number[], bit: number): number[] => lineas.map((v) => ((s & bit) !== 0 ? -v || 0 : v)).sort((a, b) => a - b);
  const girada: PlantillaGirada = {
    id,
    fijas: p.fijas.map((c) => cajaGirada(s, c)),
    variables: p.variables.map((g) => fijo({ sitios: fijo(g.sitios.map((c) => cajaGirada(s, c))), minimo: g.minimo, maximo: g.maximo })),
    impresion: p.impresion.map(girar),
    bocas: BOCAS_DE_LA_PLAZA.map(girar),
    coches: COCHES_DE_LA_PLAZA.map((c) => cajaGirada(s, c)),
    fallo: girar(p.fallo),
    objeto: fijo(puntoSimetrico(s, p.objeto.x, p.objeto.z)),
    nace: p.nace.map((n) => {
      const q = puntoSimetrico(s, n.x, n.z);
      return fijo({ x: q.x, z: q.z, rumbo: rumboSimetrico(s, n.rumbo) });
    }),
    /* Las líneas son las mismas en `x` y en `z` en la plantilla: al cambiar los ejes, las de uno pasan al otro. */
    lineasX: conSigno(p.lineas, 1),
    lineasZ: conSigno(p.lineas, 2),
    centro: fijo(puntoSimetrico(s, p.centro.x, p.centro.z)),
  };
  congeladoEntero(girada);
  GIRADAS.set(llave, girada);
  return girada;
}

/* ─── Lo que la noche necesita saber de cada lado de cada tramo ──────────── */

/**
 * UN LADO DE UN TRAMO, con lo que la noche necesita para amueblarlo sin mirar nada más: el hueco y lo que
 * le da la cara, su distrito, la línea de solar y hacia dónde queda la calzada, lo que ocupa su cara a lo
 * largo (`s0`, `largo`: 36, o 30 junto a una avenida), si sale un callejón por ella (`boca`), si lleva
 * soportal y cuántos postes (cabinas y refugios) tiene.
 */
interface LadoParaAmueblar {
  readonly hueco: number | null;
  readonly frente: LadoDelTramo['frente'];
  readonly distrito: IdDeDistrito | null;
  readonly linea: number;
  readonly hacia: 1 | -1;
  readonly s0: number;
  readonly largo: number;
  readonly boca: boolean;
  readonly soportal: boolean;
  postes: number;
}

/** La cara de la manzana que da al lado `lado` de un tramo que corre por `eje`. */
function caraDelLado(eje: Eje, lado: 0 | 1): Cara {
  if (eje === 'x') return lado === 0 ? 'sur' : 'norte';
  return lado === 0 ? 'este' : 'oeste';
}

/** El tramo (su índice) y el lado por el que da a la calle la cara `cara` del hueco (`i`, `j`). */
export function tramoDeLaCara(i: number, j: number, cara: Cara): { tramo: number; lado: 0 | 1 } {
  const n = EJES_DE_LA_CIUDAD.length;
  const segmentos = n - 1;
  if (cara === 'norte') return { tramo: (j + HUECO_MAXIMO) * segmentos + (i + HUECO_MAXIMO), lado: 1 };
  if (cara === 'sur') return { tramo: (j + HUECO_MAXIMO + 1) * segmentos + (i + HUECO_MAXIMO), lado: 0 };
  if (cara === 'oeste') return { tramo: (n + i + HUECO_MAXIMO) * segmentos + (j + HUECO_MAXIMO), lado: 1 };
  return { tramo: (n + i + HUECO_MAXIMO + 1) * segmentos + (j + HUECO_MAXIMO), lado: 0 };
}

/** Un rectángulo en un lado de una calle: `a0..a1` a lo largo y `d0..d1` metros desde la línea de solar hacia la calzada. */
function enLaCalle(eje: Eje, lado: { readonly linea: number; readonly hacia: 1 | -1 }, a0: number, a1: number, d0: number, d1: number): Rectangulo {
  const p = lado.linea + lado.hacia * d0;
  const q = lado.linea + lado.hacia * d1;
  const p0 = Math.min(p, q);
  const p1 = Math.max(p, q);
  return eje === 'x' ? { x0: a0, z0: p0, x1: a1, z1: p1 } : { x0: p0, z0: a0, x1: p1, z1: a1 };
}

function puntoEnLaCalle(eje: Eje, lado: { readonly linea: number; readonly hacia: 1 | -1 }, a: number, d: number): Punto {
  const p = lado.linea + lado.hacia * d;
  return eje === 'x' ? { x: a, z: p } : { x: p, z: a };
}

/** El rumbo de ir por el eje perpendicular a una calle que corre por `eje`, en sentido `s`. */
function rumboDeTraves(eje: Eje, s: number): number {
  if (eje === 'x') return s > 0 ? 128 : 0;
  return s > 0 ? 64 : 192;
}

/** El rumbo de ir a lo largo de una calle que corre por `eje`, en sentido `s`. */
function rumboALoLargo(eje: Eje, s: number): number {
  if (eje === 'x') return s > 0 ? 64 : 192;
  return s > 0 ? 128 : 0;
}

/*
 * LOS SITIOS DE LA ACERA POR BANDAS, a lo largo de la cara de una manzana (desde su esquina de menor
 * coordenada), para caras de 36 y de 30 m. Todos simétricos respecto al centro de la cara. Las bandas, en
 * metros desde la línea de solar hacia la calzada: farolas y postes de 2,25 a 2,75; quioscos de 2,25 a
 * 3,75; coches de 3,25 a 5 (de 4,25 a 6 en la avenida, cuya acera mide 4). Por la acera libre (de 0 a
 * 2,25) andan los durmientes, a 1 m.
 */
const D_POSTE: readonly [number, number] = [2.25, 2.75];
const D_QUIOSCO: readonly [number, number] = [2.25, 3.75];
const D_COCHE_EN_LA_AVENIDA: readonly [number, number] = [BANDA_DE_COCHE[0] + 1, BANDA_DE_COCHE[1] + 1];
const D_SITIO_DE_CABINA = 1.5;
const D_ZONA_DE_CABINA: readonly [number, number] = [1.25, 1.75];
const D_SITIO_DE_REFUGIO = 1;
const D_ZONA_DE_REFUGIO: readonly [number, number] = [0.75, 1.25];
/** Dónde puede ir un poste (cabina o refugio): a 12 m de cada esquina. */
export function sitiosDePoste(largo: number): readonly number[] {
  return [12, largo - 12];
}
/** Dónde van las farolas de pie: a 6 m de cada esquina, y en el centro de las caras de 36 (sólo en un lado en las calles mayores). */
function sitiosDeFarola(largo: number, clase: ClaseDeCalle, lado: 0 | 1): readonly number[] {
  if (largo !== LADO_DEL_SOLAR) return [6, largo - 6];
  if (clase === 'avenida') return [6, largo / 2, largo - 6];
  return lado === 0 ? [6, largo - 6] : [largo / 2];
}
/** Dónde va un quiosco de prensa (su centro): a 3 m del centro de la cara en las de 36, en el centro en las de 30. */
function sitiosDeQuiosco(largo: number): readonly number[] {
  return largo === LADO_DEL_SOLAR ? [largo / 2 - 3, largo / 2 + 3] : [largo / 2];
}
/** Lo que ocupa a lo largo la boca de un callejón en su cara (6 m en medio). */
function bocaDelCallejon(largo: number): readonly [number, number] {
  return [largo / 2 - ANCHO_DE_CALLEJON / 2, largo / 2 + ANCHO_DE_CALLEJON / 2];
}

/* ─── La geometría de una traza ───────────────────────────────────────────── */

/** Cuántas geometrías de traza se guardan por proceso: cada una pesa en torno a 1 MB. */
export const TRAZAS_GUARDADAS = 8;

/** Una parte de manzana ya puesta: su hueco, su forma y los índices de su caja y de sus pilares. */
interface ParteDeEdificio {
  readonly hueco: number;
  readonly distrito: IdDeDistrito;
  readonly parte: ParteDeLaManzana;
  readonly soportales: readonly Cara[];
  readonly caja: number;
  readonly pilares: readonly number[];
}


interface GeometriaDeLaTraza {
  readonly orientada: TrazaOrientada;
  readonly huecos: readonly HuecoDeLaCiudad[];
  readonly plazas: readonly PlazaDeLaCiudad[];
  readonly calles: readonly CalleDeLaCiudad[];
  readonly cruces: readonly Punto[];
  readonly tramos: readonly TramoDeLaCiudad[];
  readonly avenidas: readonly AvenidaDeLaCiudad[];
  readonly callejones: readonly CallejonDeLaCiudad[];
  readonly cajas: readonly CajaDeLaCiudad[];
  readonly partes: readonly ParteDeEdificio[];
  readonly cabinas: readonly CabinaDeLaCiudad[];
  readonly refugios: readonly RefugioDeLaCiudad[];
  readonly zonas: readonly ZonaDeLaCiudad[];
  readonly grafo: GrafoDeLaCiudad;
  readonly aceras: RedDeAcerasDeLaCiudad;
  readonly celdas: readonly CeldaDeLaCiudad[];
  readonly distancias: readonly (readonly number[])[];
  readonly lados: readonly LadoParaAmueblar[];
  readonly cortables: readonly number[];
  readonly giradas: readonly PlantillaGirada[];
  readonly grueso: GrafoGrueso;
  readonly pares: readonly (readonly [number, number])[];
  /** El orden de los refugios por Bajada (ver `ordenDeLosRefugios`): se llena cuando hace falta. */
  readonly ordenDeLosRefugios: Map<number, readonly number[]>;
}

const GEOMETRIAS = new Map<number, GeometriaDeLaTraza>();

/** LA GEOMETRÍA DE LA TRAZA `traza`, guardada (las `TRAZAS_GUARDADAS` últimas; ver la cabecera de «La obra»). */
function geometriaDeLaTraza(traza: number): GeometriaDeLaTraza {
  const hecha = GEOMETRIAS.get(traza);
  if (hecha !== undefined) {
    GEOMETRIAS.delete(traza);
    GEOMETRIAS.set(traza, hecha);
    return hecha;
  }
  const nueva = hacerLaGeometria(traza);
  GEOMETRIAS.set(traza, nueva);
  for (const vieja of GEOMETRIAS.keys()) {
    if (GEOMETRIAS.size <= TRAZAS_GUARDADAS) break;
    GEOMETRIAS.delete(vieja);
  }
  return nueva;
}

/** Una caja de la ciudad, congelada. */
function nuevaCaja(r: Rectangulo, tipo: TipoDeCajaDeLaCiudad, alto: number, mira: number, edificio: number | null, despejable: boolean, hueco: number | null, plaza: number): CajaDeLaCiudad {
  return fijo({ x0: r.x0, z0: r.z0, x1: r.x1, z1: r.z1, tipo, clase: 'alta' as const, alto, mira, edificio, despejable, hueco, plaza });
}

function mas(r: Rectangulo, x: number, z: number): Rectangulo {
  return { x0: r.x0 + x, z0: r.z0 + z, x1: r.x1 + x, z1: r.z1 + z };
}

function hacerLaGeometria(traza: number): GeometriaDeLaTraza {
  const o = trazaOrientada(traza);
  const s = o.simetria;
  /* 1 · Los solares, los distritos y las plantillas giradas. */
  const solares: Rectangulo[] = [];
  const distritos: IdDeDistrito[] = [];
  for (let n = 0; n < HUECOS; n++) {
    const { i, j } = huecoDelIndice(n);
    solares.push(fijo(solarDelHueco(o.avenidas, i, j)));
    distritos.push(distritoDelHueco(s, i, j));
  }
  const giradas = o.plazas.map((p) => plantillaGirada(p.plantilla, s));
  const centros: Punto[] = o.plazas.map((p) => {
    const { i, j } = huecoDelIndice(p.hueco);
    return fijo({ x: PASO_DE_LA_REJILLA * i, z: PASO_DE_LA_REJILLA * j });
  });
  /* 2 · Los tramos, con sus lados; 3 · las cajas de la mesa; 4 · las zonas; 5 · el grafo base. */
  const { tramos, lados, clasesDeCalle } = losTramos(o, solares, distritos);
  const mesa = lasCajasDeLaMesa(o, solares, distritos, tramos, lados, giradas, centros);
  const zonas = lasZonas(giradas, centros, mesa.zonasDeCabina, mesa.zonasDeRefugio);
  const grafo = elGrafoBase(o, tramos, mesa.cajas, giradas, centros);
  /* 6 · Lo que cuelga de todo eso. */
  const plazas = lasPlazas(o, distritos, giradas, centros, grafo.nudoEn);
  const grueso = elGrafoGrueso(tramos, plazas, mesa.cabinas, grafo.grafo, s);
  const g: GeometriaDeLaTraza = {
    orientada: o,
    huecos: losHuecos(o, solares, distritos, mesa.edificiosDelHueco),
    plazas,
    calles: lasCalles(o, clasesDeCalle),
    cruces: losCruces(),
    tramos,
    avenidas: mesa.avenidas,
    callejones: losCallejones(o, solares),
    cajas: mesa.cajas,
    partes: mesa.partes,
    cabinas: mesa.cabinas,
    refugios: mesa.refugios,
    zonas,
    grafo: grafo.grafo,
    aceras: laRedDeAceras(solares),
    celdas: lasCeldas(distritos, mesa.partes, tramos, mesa.cajas),
    distancias: o.distancias,
    lados: fijo(lados.map((l) => fijo(l))),
    cortables: losCortables(tramos, lados),
    giradas: fijo(giradas),
    grueso,
    pares: losParesDeLosTrios(plazas, o.distancias),
    ordenDeLosRefugios: new Map(),
  };
  return fijo(g);
}

/**
 * LOS TRAMOS, CON SUS LADOS: primero las calles que corren por `x` (de norte a sur), luego las que corren
 * por `z` (de oeste a este); en cada calle, de tramo en tramo. Y los postes contados en su lado (la noche no
 * pone quioscos donde hay uno, y las obras no van ahí).
 */
function losTramos(o: TrazaOrientada, solares: readonly Rectangulo[], distritos: readonly IdDeDistrito[]): { tramos: TramoDeLaCiudad[]; lados: LadoParaAmueblar[]; clasesDeCalle: ClaseDeCalle[][] } {
  const EJES = EJES_DE_LA_CIUDAD;
  const N = EJES.length;
  const tramos: TramoDeLaCiudad[] = [];
  const lados: LadoParaAmueblar[] = [];
  const clasesDeCalle: ClaseDeCalle[][] = [];
  for (let c = 0; c < 2 * N; c++) {
    const eje: Eje = c < N ? 'x' : 'z';
    const k = c % N;
    const centro = EJES[k] as number;
    const av = avenidaSobre(o.avenidas, eje, centro);
    const clases: ClaseDeCalle[] = [];
    clasesDeCalle.push(clases);
    for (let sg = 0; sg < N - 1; sg++) {
      const desde = EJES[sg] as number;
      const hasta = EJES[sg + 1] as number;
      const esAvenida = av !== null && pasaPor(av, (desde + hasta) / 2);
      const clase: ClaseDeCalle = esAvenida ? 'avenida' : Math.abs(centro) === EJES[N - 1] ? 'exterior' : Math.abs(centro) === Math.abs(EJE_DEL_BULEVAR) ? 'mayor' : 'calle';
      clases.push(clase);
      const ancho = esAvenida ? ANCHO_DE_AVENIDA : ANCHO_DE_CALLE;
      const cruces: [number, number] = eje === 'x' ? [k * N + sg, k * N + sg + 1] : [sg * N + k, (sg + 1) * N + k];
      const l0 = elLado(o, solares, distritos, lados, eje, k, sg, 0, centro, ancho, desde, hasta);
      const l1 = elLado(o, solares, distritos, lados, eje, k, sg, 1, centro, ancho, desde, hasta);
      tramos.push(fijo({ indice: tramos.length, calle: c, eje, centro, desde, hasta, cruces: fijo(cruces), clase, ancho, lados: fijo([l0, l1] as const), daAPlaza: l0.frente === 'plaza' || l1.frente === 'plaza' }));
    }
  }
  for (const p of [...o.cabinas, ...o.refugios]) {
    const { tramo, lado } = ladoDelPoste(p);
    (lados[2 * tramo + lado] as LadoParaAmueblar).postes++;
  }
  return { tramos, lados, clasesDeCalle };
}

/** Un lado de un tramo: el que se apunta en el tramo y el que se guarda para amueblarlo (en `lados`). */
function elLado(
  o: TrazaOrientada,
  solares: readonly Rectangulo[],
  distritos: readonly IdDeDistrito[],
  lados: LadoParaAmueblar[],
  eje: Eje,
  k: number,
  sg: number,
  lado: 0 | 1,
  centro: number,
  ancho: number,
  desde: number,
  hasta: number,
): LadoDelTramo {
  const N = EJES_DE_LA_CIUDAD.length;
  const i = eje === 'x' ? sg - HUECO_MAXIMO : k - N / 2 + lado;
  const j = eje === 'x' ? k - N / 2 + lado : sg - HUECO_MAXIMO;
  const hacia: 1 | -1 = lado === 0 ? 1 : -1;
  if (Math.abs(i) > HUECO_MAXIMO || Math.abs(j) > HUECO_MAXIMO) {
    lados.push({ hueco: null, frente: 'borde', distrito: null, linea: centro - hacia * (ancho / 2), hacia, s0: desde, largo: hasta - desde, boca: false, soportal: false, postes: 0 });
    return fijo({ hueco: null, frente: 'borde' as const, soportal: false });
  }
  const n = indiceDeHueco(i, j);
  const solar = solares[n] as Rectangulo;
  const callejon = o.callejones[n] as Eje | null;
  const boca = callejon !== null && callejon !== eje;
  const frente: LadoDelTramo['frente'] = (o.plazaDelHueco[n] as number) > 0 ? 'plaza' : boca ? 'callejon' : 'edificio';
  const soportal = (o.soportales[n] as readonly Cara[]).includes(caraDelLado(eje, lado));
  const linea = eje === 'x' ? (lado === 0 ? solar.z1 : solar.z0) : lado === 0 ? solar.x1 : solar.x0;
  if (linea !== centro - hacia * (ancho / 2)) throw new RangeError(`El solar del hueco ${String(n)} no da a su calle: ${String(linea)} contra ${String(centro)}.`);
  lados.push({ hueco: n, frente, distrito: distritos[n] as IdDeDistrito, linea, hacia, s0: eje === 'x' ? solar.x0 : solar.z0, largo: eje === 'x' ? solar.x1 - solar.x0 : solar.z1 - solar.z0, boca, soportal, postes: 0 });
  return fijo({ hueco: n, frente, soportal });
}

/** El tramo y el lado de un poste. */
function ladoDelPoste(p: PosteOrientado): { tramo: number; lado: 0 | 1 } {
  const { i, j } = huecoDelIndice(p.hueco);
  return tramoDeLaCara(i, j, p.cara);
}

/** Lo que sale de las cajas de la mesa, además de ellas. */
interface LaMesa {
  readonly cajas: readonly CajaDeLaCiudad[];
  readonly partes: readonly ParteDeEdificio[];
  readonly edificiosDelHueco: readonly (readonly number[])[];
  readonly avenidas: readonly AvenidaDeLaCiudad[];
  readonly cabinas: readonly CabinaDeLaCiudad[];
  readonly refugios: readonly RefugioDeLaCiudad[];
  readonly zonasDeCabina: readonly Rectangulo[];
  readonly zonasDeRefugio: readonly Rectangulo[];
}

/** LAS CAJAS DE LA MESA, en el orden del contrato: el cerco, las manzanas, las avenidas, las plazas y los postes. */
function lasCajasDeLaMesa(
  o: TrazaOrientada,
  solares: readonly Rectangulo[],
  distritos: readonly IdDeDistrito[],
  tramos: readonly TramoDeLaCiudad[],
  lados: readonly LadoParaAmueblar[],
  giradas: readonly PlantillaGirada[],
  centros: readonly Punto[],
): LaMesa {
  const cajas: CajaDeLaCiudad[] = [];
  const poner = (c: CajaDeLaCiudad): number => {
    cajas.push(c);
    return cajas.length - 1;
  };
  elCerco(poner);
  const { partes, edificiosDelHueco } = lasManzanas(o, solares, distritos, tramos, lados, poner);
  const avenidas = lasMedianas(o.avenidas, poner);
  for (let p = 0; p < PLAZAS_POR_CIUDAD; p++) {
    const c = centros[p] as Punto;
    const hueco = (o.plazas[p] as PlazaOrientada).hueco;
    for (const f of (giradas[p] as PlantillaGirada).fijas) poner(nuevaCaja(mas(f, c.x, c.z), f.tipo, f.alto, f.mira, null, false, hueco, p + 1));
  }
  const postes = losPostes(o, distritos, tramos, lados, poner);
  return { cajas: fijo(cajas), partes, edificiosDelHueco, avenidas, ...postes };
}

/** EL CERCO: fachadas continuas de ±270 a ±272, en trozos centrados en las celdas de 48 m (el norte y el sur con sus esquinas). */
function elCerco(poner: (c: CajaDeLaCiudad) => number): void {
  const B = BORDE_DE_LA_CIUDAD;
  const C = CERCO_DE_LA_CIUDAD;
  for (let k = CELDA_MINIMA; k <= CELDA_MAXIMA; k++) {
    const a = Math.max(-C, LADO_DE_CELDA * k - LADO_DE_CELDA / 2);
    const b = Math.min(C, LADO_DE_CELDA * k + LADO_DE_CELDA / 2);
    poner(nuevaCaja({ x0: a, z0: -C, x1: b, z1: -B }, 'fachada-exterior', 18, 128, null, false, null, 0));
    poner(nuevaCaja({ x0: a, z0: B, x1: b, z1: C }, 'fachada-exterior', 18, 0, null, false, null, 0));
  }
  for (let k = CELDA_MINIMA; k <= CELDA_MAXIMA; k++) {
    const a = Math.max(-B, LADO_DE_CELDA * k - LADO_DE_CELDA / 2);
    const b = Math.min(B, LADO_DE_CELDA * k + LADO_DE_CELDA / 2);
    poner(nuevaCaja({ x0: -C, z0: a, x1: -B, z1: b }, 'fachada-exterior', 18, 64, null, false, null, 0));
    poner(nuevaCaja({ x0: B, z0: a, x1: C, z1: b }, 'fachada-exterior', 18, 192, null, false, null, 0));
  }
}

/** Las huellas de una manzana: su solar, o las dos mitades que deja su callejón (15 + 6 + 15). */
function huellasDeLaManzana(solar: Rectangulo, callejon: Eje | null, i: number, j: number): Rectangulo[] {
  const m = ANCHO_DE_CALLEJON / 2;
  if (callejon === 'z') return [{ ...solar, x1: PASO_DE_LA_REJILLA * i - m }, { ...solar, x0: PASO_DE_LA_REJILLA * i + m }];
  if (callejon === 'x') return [{ ...solar, z1: PASO_DE_LA_REJILLA * j - m }, { ...solar, z0: PASO_DE_LA_REJILLA * j + m }];
  return [solar];
}

/** La forma de una parte: sus fachadas (las caras en el borde del solar, y la que da al callejón) y su caja, retranqueada en cada soportal. */
function formaDeLaParte(h: Rectangulo, solar: Rectangulo, conSoportal: readonly Cara[]): ParteDeLaManzana {
  const fachadas: FachadaDeLaForma[] = [];
  let x0 = h.x0;
  let z0 = h.z0;
  let x1 = h.x1;
  let z1 = h.z1;
  for (const cara of CARAS) {
    const enBorde = cara === 'norte' ? h.z0 === solar.z0 : cara === 'sur' ? h.z1 === solar.z1 : cara === 'oeste' ? h.x0 === solar.x0 : h.x1 === solar.x1;
    const soportal = enBorde && conSoportal.includes(cara);
    const porX = cara === 'norte' || cara === 'sur';
    fachadas.push(fijo({ cara, linea: cara === 'norte' ? h.z0 : cara === 'sur' ? h.z1 : cara === 'oeste' ? h.x0 : h.x1, desde: porX ? h.x0 : h.z0, hasta: porX ? h.x1 : h.z1, soportal }));
    if (!soportal) continue;
    if (cara === 'norte') z0 += FONDO_DEL_SOPORTAL;
    else if (cara === 'sur') z1 -= FONDO_DEL_SOPORTAL;
    else if (cara === 'oeste') x0 += FONDO_DEL_SOPORTAL;
    else x1 -= FONDO_DEL_SOPORTAL;
  }
  return fijo({ huella: fijo({ x0: h.x0, z0: h.z0, x1: h.x1, z1: h.z1 }), caja: fijo({ x0, z0, x1, z1 }), fachadas: fijo(fachadas) });
}

/**
 * Los pilares de los soportales de una parte: uno cada 6 m, el primero a 3 de la esquina, pegados a la línea
 * de solar por dentro. Llevan ya el índice de su edificio (`edificio`, el de la parte), que es de la traza y
 * no de la mesa: la ciudad de cada mesa los usa tal cual.
 */
function pilaresDeLaParte(forma: ParteDeLaManzana, n: number, edificio: number, poner: (c: CajaDeLaCiudad) => number): number[] {
  const salida: number[] = [];
  const P = PILARES_DE_SOPORTAL_EN_LA_CIUDAD;
  for (const f of forma.fachadas) {
    if (!f.soportal) continue;
    const largo = f.hasta - f.desde;
    for (let a = P / 2; a <= largo - P / 2; a += P) {
      const c = f.desde + a;
      const r =
        f.cara === 'norte'
          ? { x0: c - 0.25, z0: f.linea, x1: c + 0.25, z1: f.linea + 0.5 }
          : f.cara === 'sur'
            ? { x0: c - 0.25, z0: f.linea - 0.5, x1: c + 0.25, z1: f.linea }
            : f.cara === 'oeste'
              ? { x0: f.linea, z0: c - 0.25, x1: f.linea + 0.5, z1: c + 0.25 }
              : { x0: f.linea - 0.5, z0: c - 0.25, x1: f.linea, z1: c + 0.25 };
      salida.push(poner(nuevaCaja(r, 'pilar-de-soportal', 4.5, 0, edificio, false, n, 0)));
    }
  }
  return salida;
}

/** LAS MANZANAS, hueco a hueco: sus cajas (una, o dos con callejón), sus pilares y sus farolas de pie. */
function lasManzanas(
  o: TrazaOrientada,
  solares: readonly Rectangulo[],
  distritos: readonly IdDeDistrito[],
  tramos: readonly TramoDeLaCiudad[],
  lados: readonly LadoParaAmueblar[],
  poner: (c: CajaDeLaCiudad) => number,
): { partes: readonly ParteDeEdificio[]; edificiosDelHueco: readonly (readonly number[])[] } {
  const partes: ParteDeEdificio[] = [];
  const edificiosDelHueco: (readonly number[])[] = [];
  for (let n = 0; n < HUECOS; n++) {
    if (o.usos[n] === 'plaza') {
      edificiosDelHueco.push(fijo([]));
      continue;
    }
    const { i, j } = huecoDelIndice(n);
    const solar = solares[n] as Rectangulo;
    const conSoportal = o.soportales[n] as readonly Cara[];
    const formas = huellasDeLaManzana(solar, o.callejones[n] as Eje | null, i, j).map((h) => formaDeLaParte(h, solar, conSoportal));
    const cajaDeParte = formas.map((f) => poner(nuevaCaja(f.caja, 'edificio', 0, 0, null, false, n, 0)));
    const primera = partes.length;
    const pilares = formas.map((f, k) => pilaresDeLaParte(f, n, primera + k, poner));
    lasFarolasDePie(i, j, n, tramos, lados, poner);
    const suyos: number[] = [];
    for (let k = 0; k < formas.length; k++) {
      suyos.push(partes.length);
      const forma = formas[k] as ParteDeLaManzana;
      partes.push(fijo({ hueco: n, distrito: distritos[n] as IdDeDistrito, parte: forma, soportales: fijo(forma.fachadas.filter((f) => f.soportal).map((f) => f.cara)), caja: cajaDeParte[k] as number, pilares: fijo(pilares[k] as number[]) }));
    }
    edificiosDelHueco.push(fijo(suyos));
  }
  return { partes: fijo(partes), edificiosDelHueco: fijo(edificiosDelHueco) };
}

/** Las farolas de pie de las aceras de una manzana: en las avenidas y en las calles mayores (§2.4); en las demás, de pared, sin caja. */
function lasFarolasDePie(i: number, j: number, n: number, tramos: readonly TramoDeLaCiudad[], lados: readonly LadoParaAmueblar[], poner: (c: CajaDeLaCiudad) => number): void {
  for (const cara of CARAS) {
    const { tramo, lado } = tramoDeLaCara(i, j, cara);
    const t = tramos[tramo] as TramoDeLaCiudad;
    if (t.clase !== 'avenida' && t.clase !== 'mayor') continue;
    const l = lados[2 * tramo + lado] as LadoParaAmueblar;
    const [b0, b1] = bocaDelCallejon(l.largo);
    for (const a of sitiosDeFarola(l.largo, t.clase, lado)) {
      if (l.boca && a > b0 - 0.5 && a < b1 + 0.5) continue;
      poner(nuevaCaja(enLaCalle(t.eje, l, l.s0 + a - 0.25, l.s0 + a + 0.25, D_POSTE[0], D_POSTE[1]), 'farola', 6, rumboDeTraves(t.eje, l.hacia), null, false, n, 0));
    }
  }
}

/**
 * LAS MEDIANAS DE LAS AVENIDAS: pilares del Elevado y troncos y bancos del Bulevar, fuera de los cruces.
 * Cada cruce ocupa 6 m a cada lado si es de una calle, y 12 si es de la otra avenida.
 */
function lasMedianas(avenidas: readonly AvenidaOrientada[], poner: (c: CajaDeLaCiudad) => number): readonly AvenidaDeLaCiudad[] {
  const salida: AvenidaDeLaCiudad[] = [];
  for (const av of avenidas) {
    const suyas: number[] = [];
    const cruces: { v: number; medio: number }[] = [];
    for (const e of EJES_DE_LA_CIUDAD) {
      if (e < av.desde || e > av.hasta) continue;
      const otra = avenidaSobre(avenidas, av.eje === 'x' ? 'z' : 'x', e);
      const tocaLaOtra = otra !== null && av.linea >= otra.desde && av.linea <= otra.hasta;
      cruces.push({ v: e, medio: tocaLaOtra ? ANCHO_DE_AVENIDA / 2 : ANCHO_DE_CALLE / 2 });
    }
    if (av.desde > -BORDE_DE_LA_CIUDAD) cruces.push({ v: av.desde, medio: ANCHO_DE_AVENIDA / 2 });
    if (av.hasta < BORDE_DE_LA_CIUDAD) cruces.push({ v: av.hasta, medio: ANCHO_DE_AVENIDA / 2 });
    cruces.sort((a, b) => a.v - b.v);
    const enLaMediana = (u: number, medioLargo: number, medioAncho: number): Rectangulo =>
      av.eje === 'x' ? { x0: u - medioLargo, z0: av.linea - medioAncho, x1: u + medioLargo, z1: av.linea + medioAncho } : { x0: av.linea - medioAncho, z0: u - medioLargo, x1: av.linea + medioAncho, z1: u + medioLargo };
    for (let k = 0; k + 1 < cruces.length; k++) {
      const a = cruces[k] as { v: number; medio: number };
      const b = cruces[k + 1] as { v: number; medio: number };
      if (a.v === b.v) continue;
      const desde = a.v + a.medio;
      const hasta = b.v - b.medio;
      const largo = hasta - desde;
      if (largo < 12) continue;
      const m = (desde + hasta) / 2;
      if (av.id === 'elevado') {
        for (const u of [m - largo / 2 + 1.5, m - 5.5, m + 5.5, m + largo / 2 - 1.5]) suyas.push(poner(nuevaCaja(enLaMediana(u, 0.5, 0.5), 'pilar-del-tren', ALTO_DEL_VIADUCTO, 0, null, false, null, 0)));
      } else {
        for (const u of [m - 12, m - 4, m + 4, m + 12]) suyas.push(poner(nuevaCaja(enLaMediana(u, 0.25, 0.25), 'tronco', 6, 0, null, false, null, 0)));
        suyas.push(poner(nuevaCaja(enLaMediana(m, 0.75, 0.25), 'banco', 0.5, rumboDeTraves(av.eje, 1), null, false, null, 0)));
      }
    }
    salida.push(fijo({ id: av.id, eje: av.eje, linea: av.linea, desde: av.desde, hasta: av.hasta, ancho: ANCHO_DE_AVENIDA, cajas: fijo(suyas) }));
  }
  return fijo(salida);
}

/** LAS CABINAS CANDIDATAS Y LOS REFUGIOS: el poste en la banda de las farolas, en su sitio de la cara; y sus zonas. */
function losPostes(
  o: TrazaOrientada,
  distritos: readonly IdDeDistrito[],
  tramos: readonly TramoDeLaCiudad[],
  lados: readonly LadoParaAmueblar[],
  poner: (c: CajaDeLaCiudad) => number,
): Pick<LaMesa, 'cabinas' | 'refugios' | 'zonasDeCabina' | 'zonasDeRefugio'> {
  const cabinas: CabinaDeLaCiudad[] = [];
  const refugios: RefugioDeLaCiudad[] = [];
  const zonasDeCabina: Rectangulo[] = [];
  const zonasDeRefugio: Rectangulo[] = [];
  const postes = [...o.cabinas.map((p) => ({ p, refugio: false })), ...o.refugios.map((p) => ({ p, refugio: true }))];
  for (const { p, refugio } of postes) {
    const { tramo, lado } = ladoDelPoste(p);
    const t = tramos[tramo] as TramoDeLaCiudad;
    const l = lados[2 * tramo + lado] as LadoParaAmueblar;
    const a = l.s0 + p.a;
    const mira = rumboDeTraves(t.eje, -l.hacia);
    const caja = poner(nuevaCaja(enLaCalle(t.eje, l, a - 0.25, a + 0.25, D_POSTE[0], D_POSTE[1]), refugio ? 'refugio' : 'cabina', 2.5, mira, null, false, null, 0));
    const distrito = distritos[p.hueco] as IdDeDistrito;
    if (!refugio) {
      const k = cabinas.length;
      cabinas.push(fijo({ indice: k, distrito, poste: fijo(puntoEnLaCalle(t.eje, l, a, (D_POSTE[0] + D_POSTE[1]) / 2)), mira, sitio: fijo(puntoEnLaCalle(t.eje, l, a, D_SITIO_DE_CABINA)), zona: idDeZonaDeCabina(k), caja, tramo }));
      zonasDeCabina.push(fijo(enLaCalle(t.eje, l, a - 0.75, a + 0.75, D_ZONA_DE_CABINA[0], D_ZONA_DE_CABINA[1])));
    } else {
      const k = refugios.length;
      const hacia = rumboDeTraves(t.eje, l.hacia);
      const sitios: SitioDelBarrio[] = [];
      for (const d of [-1.5, 0, 1.5]) {
        const q = puntoEnLaCalle(t.eje, l, a + d, D_SITIO_DE_REFUGIO);
        sitios.push(fijo({ x: q.x, z: q.z, rumbo: hacia }));
      }
      refugios.push(fijo({ indice: k, distrito, sitios: fijo(sitios), zona: idDeZonaDeRefugio(k), caja, tramo }));
      zonasDeRefugio.push(fijo(enLaCalle(t.eje, l, a - 2, a + 2, D_ZONA_DE_REFUGIO[0], D_ZONA_DE_REFUGIO[1])));
    }
  }
  return { cabinas: fijo(cabinas), refugios: fijo(refugios), zonasDeCabina, zonasDeRefugio };
}

/** LAS ZONAS, en orden de id: las 17 de cada plaza, las cabinas y los refugios. */
function lasZonas(giradas: readonly PlantillaGirada[], centros: readonly Punto[], zonasDeCabina: readonly Rectangulo[], zonasDeRefugio: readonly Rectangulo[]): readonly ZonaDeLaCiudad[] {
  const zonas: ZonaDeLaCiudad[] = [];
  const zona = (id: number, clase: number, caja: Rectangulo): void => {
    if (id !== zonas.length + 1) throw new RangeError(`La zona ${String(id)} va en el puesto ${String(zonas.length + 1)}.`);
    zonas.push(fijo({ id, clase, caja: fijo(caja) }));
  };
  for (let p = 0; p < PLAZAS_POR_CIUDAD; p++) {
    const c = centros[p] as Punto;
    const g = giradas[p] as PlantillaGirada;
    zona(idDeZonaDePlaza(p + 1, 'fallo', 0), claseDeZonaDePlaza(p + 1, 'fallo'), mas(g.fallo, c.x, c.z));
    g.impresion.forEach((r, k) => zona(idDeZonaDePlaza(p + 1, 'impresion', k), claseDeZonaDePlaza(p + 1, 'impresion'), mas(r, c.x, c.z)));
    g.bocas.forEach((r, k) => zona(idDeZonaDePlaza(p + 1, 'boca', k), claseDeZonaDePlaza(p + 1, 'boca'), mas(r, c.x, c.z)));
  }
  zonasDeCabina.forEach((r, k) => zona(idDeZonaDeCabina(k), CLASE_DE_ZONA_DE_CABINA, r));
  zonasDeRefugio.forEach((r, k) => zona(idDeZonaDeRefugio(k), CLASE_DE_ZONA_DE_REFUGIO, r));
  return fijo(zonas);
}

/** LAS PLAZAS, ya con su nudo (el del centro de su plantilla girada). */
function lasPlazas(o: TrazaOrientada, distritos: readonly IdDeDistrito[], giradas: readonly PlantillaGirada[], centros: readonly Punto[], nudoEn: (x: number, z: number) => number): readonly PlazaDeLaCiudad[] {
  const M = LADO_DEL_LIMITE_DE_PLAZA / 2;
  return fijo(
    o.plazas.map((p, k) => {
      const c = centros[k] as Punto;
      const g = giradas[k] as PlantillaGirada;
      const nudo = nudoEn(c.x + g.centro.x, c.z + g.centro.z);
      if (nudo < 0) throw new RangeError(`La plaza ${String(p.numero)} no tiene nudo en su centro.`);
      return fijo({
        numero: p.numero,
        hueco: p.hueco,
        distrito: distritos[p.hueco] as IdDeDistrito,
        plantilla: p.plantilla,
        nombre: p.nombre,
        centro: c,
        limite: fijo({ x0: c.x - M, z0: c.z - M, x1: c.x + M, z1: c.z + M }),
        nudo,
        objeto: fijo({ x: c.x + g.objeto.x, z: c.z + g.objeto.z }),
        nace: fijo(g.nace.map((n) => fijo({ x: c.x + n.x, z: c.z + n.z, rumbo: n.rumbo }))),
      });
    }),
  );
}

function losCallejones(o: TrazaOrientada, solares: readonly Rectangulo[]): readonly CallejonDeLaCiudad[] {
  const salida: CallejonDeLaCiudad[] = [];
  const m = ANCHO_DE_CALLEJON / 2;
  for (let n = 0; n < HUECOS; n++) {
    const e = o.callejones[n];
    if (e === null || e === undefined) continue;
    const { i, j } = huecoDelIndice(n);
    const solar = solares[n] as Rectangulo;
    const caja = e === 'z' ? { x0: PASO_DE_LA_REJILLA * i - m, z0: solar.z0, x1: PASO_DE_LA_REJILLA * i + m, z1: solar.z1 } : { x0: solar.x0, z0: PASO_DE_LA_REJILLA * j - m, x1: solar.x1, z1: PASO_DE_LA_REJILLA * j + m };
    salida.push(fijo({ hueco: n, eje: e, caja: fijo(caja), nombre: o.nombresDePasaje[n] as number }));
  }
  return fijo(salida);
}

/**
 * LAS 24 CALLES. Una calle con un trozo de avenida (la del Bulevar, que empieza en el Elevado) lleva la clase
 * y el nombre de su trozo de calle; sus tramos de avenida dicen `avenida`.
 */
function lasCalles(o: TrazaOrientada, clasesDeCalle: readonly (readonly ClaseDeCalle[])[]): readonly CalleDeLaCiudad[] {
  const N = EJES_DE_LA_CIUDAD.length;
  const salida: CalleDeLaCiudad[] = [];
  for (let c = 0; c < 2 * N; c++) {
    const clases = clasesDeCalle[c] as readonly ClaseDeCalle[];
    const todaAvenida = clases.every((x) => x === 'avenida');
    const clase: ClaseDeCalle = todaAvenida ? 'avenida' : (clases.find((x) => x !== 'avenida') as ClaseDeCalle);
    salida.push(fijo({ indice: c, eje: c < N ? ('x' as const) : ('z' as const), linea: EJES_DE_LA_CIUDAD[c % N] as number, clase, ancho: todaAvenida ? ANCHO_DE_AVENIDA : ANCHO_DE_CALLE, nombre: o.nombresDeCalle[c] as number }));
  }
  return fijo(salida);
}

/** Los 144 cruces, `fila · 12 + columna`: los mismos en todas las trazas, así que se hacen una vez. */
const LOS_CRUCES: readonly Punto[] = ((): readonly Punto[] => {
  const N = EJES_DE_LA_CIUDAD.length;
  const salida: Punto[] = [];
  for (let f = 0; f < N; f++) for (let c = 0; c < N; c++) salida.push(Object.freeze({ x: EJES_DE_LA_CIUDAD[c] as number, z: EJES_DE_LA_CIUDAD[f] as number }));
  return Object.freeze(salida);
})();

function losCruces(): readonly Punto[] {
  return LOS_CRUCES;
}

function losHuecos(o: TrazaOrientada, solares: readonly Rectangulo[], distritos: readonly IdDeDistrito[], edificiosDelHueco: readonly (readonly number[])[]): readonly HuecoDeLaCiudad[] {
  const salida: HuecoDeLaCiudad[] = [];
  for (let n = 0; n < HUECOS; n++) {
    const { i, j } = huecoDelIndice(n);
    salida.push(
      fijo({
        indice: n,
        i,
        j,
        distrito: distritos[n] as IdDeDistrito,
        solar: solares[n] as Rectangulo,
        uso: o.usos[n] as UsoDelHueco,
        callejon: o.callejones[n] as Eje | null,
        plaza: o.plazaDelHueco[n] as number,
        soportales: o.soportales[n] as readonly Cara[],
        edificios: edificiosDelHueco[n] as readonly number[],
      }),
    );
  }
  return fijo(salida);
}

/** Los tramos donde puede ir una obra: calles que no son mayores, ni avenidas, ni de fuera, ni dan a una plaza, sin soportal, boca ni poste. */
function losCortables(tramos: readonly TramoDeLaCiudad[], lados: readonly LadoParaAmueblar[]): readonly number[] {
  const salida: number[] = [];
  for (const t of tramos) {
    const a = lados[2 * t.indice] as LadoParaAmueblar;
    const b = lados[2 * t.indice + 1] as LadoParaAmueblar;
    if (t.clase !== 'calle' || t.daAPlaza) continue;
    if (a.frente !== 'edificio' || b.frente !== 'edificio' || a.soportal || b.soportal || a.postes > 0 || b.postes > 0) continue;
    salida.push(t.indice);
  }
  return fijo(salida);
}

/** Los pares de plazas que salen juntos en algún trío válido (para cualquier Bajada): los que las obras no pueden alejar. */
function losParesDeLosTrios(plazas: readonly PlazaDeLaCiudad[], distancias: readonly (readonly number[])[]): readonly (readonly [number, number])[] {
  const pares: [number, number][] = [];
  if (distancias.length !== PLAZAS_POR_CIUDAD) return fijo(pares);
  for (let b = 1; b <= PLAZAS_POR_CIUDAD; b++) {
    for (const [f2, f3] of triosDeFallos({ plazas, distancias }, b)) {
      for (const [u, v] of [
        [b, f2],
        [b, f3],
        [f2, f3],
      ] as const) {
        const par: [number, number] = u < v ? [u, v] : [v, u];
        if (!pares.some((q) => q[0] === par[0] && q[1] === par[1])) pares.push(par);
      }
    }
  }
  pares.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  return fijo(pares.map((p) => fijo(p)));
}

/* ─── El grafo base ───────────────────────────────────────────────────────── */

/** Una línea del grafo: corre por `eje` en la coordenada `c` del otro, de `a0` a `a1`; `calle` es su calle, o −1. */
interface LineaDelGrafo {
  readonly eje: Eje;
  readonly c: number;
  readonly a0: number;
  readonly a1: number;
  readonly calle: number;
  /** Si sus aristas se miran contra lo que puede estorbar (sólo las de las plazas: ver `elGrafoBase`). */
  readonly probar: boolean;
}

/** La llave de un punto en cuartos de metro: exacta y sin colisiones dentro de ±512 m. */
function llaveDelPunto(x: number, z: number): number {
  return (x * 4 + 4096) * 8192 + (z * 4 + 4096);
}

/** Lo que estorba ya ensanchado el radio, en una rejilla de celdas de 16 m, para mirar cada arista contra lo suyo. */
class RejillaDeEstorbos {
  private readonly celdas = new Map<number, number[]>();
  private readonly cajas: Rectangulo[] = [];

  meter(r: Rectangulo, radio: number): void {
    const e = { x0: r.x0 - radio, z0: r.z0 - radio, x1: r.x1 + radio, z1: r.z1 + radio };
    const k = this.cajas.length;
    this.cajas.push(e);
    for (let cz = Math.floor(e.z0 / 16); cz <= Math.floor(e.z1 / 16); cz++) {
      for (let cx = Math.floor(e.x0 / 16); cx <= Math.floor(e.x1 / 16); cx++) {
        const llave = (cz + 64) * 128 + (cx + 64);
        const lista = this.celdas.get(llave);
        if (lista === undefined) this.celdas.set(llave, [k]);
        else lista.push(k);
      }
    }
  }

  /** ¿Entra el tramo recto de (ax, az) a (bx, bz), paralelo a un eje, en el interior de algo? */
  tapa(ax: number, az: number, bx: number, bz: number): boolean {
    const x0 = Math.min(ax, bx);
    const x1 = Math.max(ax, bx);
    const z0 = Math.min(az, bz);
    const z1 = Math.max(az, bz);
    for (let cz = Math.floor(z0 / 16); cz <= Math.floor(z1 / 16); cz++) {
      for (let cx = Math.floor(x0 / 16); cx <= Math.floor(x1 / 16); cx++) {
        const lista = this.celdas.get((cz + 64) * 128 + (cx + 64));
        if (lista === undefined) continue;
        for (let i = 0; i < lista.length; i++) {
          const k = lista[i] as number;
          const e = this.cajas[k] as Rectangulo;
          if (x0 === x1 ? e.x0 < x0 && x0 < e.x1 && e.z0 < z1 && z0 < e.z1 : e.z0 < z0 && z0 < e.z1 && e.x0 < x1 && x0 < e.x1) return true;
        }
      }
    }
    return false;
  }
}

/**
 * EL GRAFO BASE (ver la cabecera de «La obra»). Devuelve el grafo y una forma de encontrar el nudo de un
 * punto (el de cada plaza).
 *
 * ═══ QUÉ SE MIRA CONTRA LO QUE ESTORBA, Y QUÉ NO ═══
 *
 * Sólo las líneas de las plazas, contra lo que puede haber en una plaza (lo fijo de su plantilla, cada sitio
 * de lo variable y los dieciséis coches de su acera): son las únicas que pasan entre cajas. Las demás van
 * por donde la acera por bandas no pone nada —el centro de una calzada, a 1 m o más de un coche; el centro
 * de una calzada de avenida, a 4 m de la mediana; el centro de un callejón, a 3 m de cada pared—, y mirarlas
 * era medio milisegundo de cada traza nueva. No se da por bueno a ciegas: `verify:quiebro-barrio` anda cada
 * arista de cada noche de las 32 trazas con `seAndaEnRecta`, y lo vio rojo con una farola en la calzada.
 */
function elGrafoBase(
  o: TrazaOrientada,
  tramos: readonly TramoDeLaCiudad[],
  cajas: readonly CajaDeLaCiudad[],
  giradas: readonly PlantillaGirada[],
  centros: readonly Punto[],
): { grafo: GrafoDeLaCiudad; nudoEn: (x: number, z: number) => number } {
  const EJES = EJES_DE_LA_CIUDAD;
  const N = EJES.length;
  const primero = EJES[0] as number;
  const ultimo = EJES[N - 1] as number;
  const media = MEDIO_EJE_DE_LA_CALZADA_DE_AVENIDA;
  const lineas: LineaDelGrafo[] = [];
  /* Las calles: una línea por el centro de la calzada, o dos (una por calzada) donde hay avenida. */
  for (let c = 0; c < 2 * N; c++) {
    const eje: Eje = c < N ? 'x' : 'z';
    const e = EJES[c % N] as number;
    const av = avenidaSobre(o.avenidas, eje, e);
    if (av === null) {
      lineas.push({ eje, c: e, a0: primero, a1: ultimo, calle: c, probar: false });
      continue;
    }
    const desde = av.desde <= -BORDE_DE_LA_CIUDAD ? primero : av.desde + media;
    const hasta = av.hasta >= BORDE_DE_LA_CIUDAD ? ultimo : av.hasta - media;
    lineas.push({ eje, c: e - media, a0: desde, a1: hasta, calle: c, probar: false }, { eje, c: e + media, a0: desde, a1: hasta, calle: c, probar: false });
    if (av.desde > -BORDE_DE_LA_CIUDAD) lineas.push({ eje, c: e, a0: primero, a1: av.desde + media, calle: c, probar: false });
    if (av.hasta < BORDE_DE_LA_CIUDAD) lineas.push({ eje, c: e, a0: av.hasta - media, a1: ultimo, calle: c, probar: false });
  }
  /* Los callejones: de la línea de una calle a la de la otra (la calzada de este lado, si es avenida). */
  const extremo = (eje: Eje, linea: number, a: number, haciaDentro: number): number => {
    const av = avenidaSobre(o.avenidas, eje, linea);
    return av !== null && pasaPor(av, a) ? linea + haciaDentro * media : linea;
  };
  for (let n = 0; n < HUECOS; n++) {
    const e = o.callejones[n];
    if (e === null || e === undefined) continue;
    const { i, j } = huecoDelIndice(n);
    const x = PASO_DE_LA_REJILLA * i;
    const z = PASO_DE_LA_REJILLA * j;
    const m = PASO_DE_LA_REJILLA / 2;
    if (e === 'z') lineas.push({ eje: 'z', c: x, a0: extremo('x', z - m, x, 1), a1: extremo('x', z + m, x, -1), calle: -1, probar: false });
    else lineas.push({ eje: 'x', c: z, a0: extremo('z', x - m, z, 1), a1: extremo('z', x + m, z, -1), calle: -1, probar: false });
  }
  /* Las plazas: las líneas de su plantilla girada, cruzadas todas con todas hasta el eje de sus calles. */
  const R = EJE_DE_LAS_CALLES_DE_LA_PLAZA;
  for (let p = 0; p < centros.length; p++) {
    const c = centros[p] as Punto;
    const g = giradas[p] as PlantillaGirada;
    for (const v of g.lineasX) lineas.push({ eje: 'z', c: c.x + v, a0: c.z - R, a1: c.z + R, calle: -1, probar: true });
    for (const v of g.lineasZ) lineas.push({ eje: 'x', c: c.z + v, a0: c.x - R, a1: c.x + R, calle: -1, probar: true });
  }

  /* Los cruces de cada línea con las que corren por el otro eje (sus extremos van también). */
  const extras: number[][] = lineas.map((l) => [l.a0, l.a1]);
  for (let u = 0; u < lineas.length; u++) {
    const a = lineas[u] as LineaDelGrafo;
    if (a.eje !== 'x') continue;
    for (let v = 0; v < lineas.length; v++) {
      const b = lineas[v] as LineaDelGrafo;
      if (b.eje !== 'z') continue;
      if (b.c >= a.a0 && b.c <= a.a1 && a.c >= b.a0 && a.c <= b.a1) {
        (extras[u] as number[]).push(b.c);
        (extras[v] as number[]).push(a.c);
      }
    }
  }

  /* Los nudos: primero los 144 cruces, en su orden; luego los de cada línea, en orden de línea y a lo largo. */
  const numero = new Map<number, number>();
  const xs: number[] = [];
  const zs: number[] = [];
  const nudo = (x: number, z: number): number => {
    const llave = llaveDelPunto(x, z);
    let k = numero.get(llave);
    if (k === undefined) {
      k = xs.length;
      xs.push(x);
      zs.push(z);
      numero.set(llave, k);
    }
    return k;
  };
  for (let f = 0; f < N; f++) for (let c = 0; c < N; c++) nudo(EJES[c] as number, EJES[f] as number);

  /* Lo que puede estorbar a las líneas de las plazas: lo de cada plaza en todos sus sitios, ensanchado el radio. */
  const estorbos = new RejillaDeEstorbos();
  for (let i = 0; i < cajas.length; i++) {
    const c = cajas[i] as CajaDeLaCiudad;
    if (c.plaza > 0) estorbos.meter(c, RADIO_DEL_GRAFO);
  }
  for (let p = 0; p < centros.length; p++) {
    const c = centros[p] as Punto;
    const g = giradas[p] as PlantillaGirada;
    for (const grupo of g.variables) for (const sitio of grupo.sitios) estorbos.meter(mas(sitio, c.x, c.z), RADIO_DEL_GRAFO);
    for (const coche of g.coches) estorbos.meter(mas(coche, c.x, c.z), RADIO_DEL_GRAFO);
  }

  /*
   * ¿Van dos líneas por el mismo sitio, a lo largo de más de un punto? Sólo entonces puede salir dos veces la
   * misma arista (dos nudos seguidos en las dos), y se miran las repetidas con un conjunto. Sin solapes cada
   * arista sale una vez: en una línea los puntos van en orden y sin repetir, y dos líneas que sólo se tocan en
   * un extremo comparten ese nudo pero ninguna arista. En las 32 trazas no hay solapes, y el conjunto sobra.
   */
  let solapan = false;
  for (let u = 0; u < lineas.length && !solapan; u++) {
    const p = lineas[u] as LineaDelGrafo;
    for (let v = u + 1; v < lineas.length; v++) {
      const q = lineas[v] as LineaDelGrafo;
      if (p.eje === q.eje && p.c === q.c && Math.max(p.a0, q.a0) < Math.min(p.a1, q.a1)) {
        solapan = true;
        break;
      }
    }
  }
  const vistas = solapan ? new Set<number>() : null;
  /* Las aristas que se quedan, en listas de enteros (sus dos nudos, su calle y si corre por `x`): sin un objeto por arista hasta el final. */
  const aristaA: number[] = [];
  const aristaB: number[] = [];
  const aristaCalle: number[] = [];
  const aristaPorX: boolean[] = [];
  for (let u = 0; u < lineas.length; u++) {
    const l = lineas[u] as LineaDelGrafo;
    /* Los puntos a lo largo, en orden y sin repetir: los de cada `NUDOS_CADA` y los cruces, mezclados. */
    const cruces = (extras[u] as number[]).sort((a, b) => a - b);
    let antes = -1;
    let previo = Number.NaN;
    let c = 0;
    let fijoA = Math.ceil(l.a0 / NUDOS_CADA) * NUDOS_CADA;
    for (;;) {
      const deLosCruces = c < cruces.length ? (cruces[c] as number) : Number.POSITIVE_INFINITY;
      const deLaRejilla = fijoA <= l.a1 ? fijoA : Number.POSITIVE_INFINITY;
      if (deLosCruces === Number.POSITIVE_INFINITY && deLaRejilla === Number.POSITIVE_INFINITY) break;
      let a: number;
      if (deLosCruces <= deLaRejilla) {
        a = deLosCruces;
        c++;
      } else {
        a = deLaRejilla;
        fijoA += NUDOS_CADA;
      }
      if (a === previo) continue;
      previo = a;
      const k = l.eje === 'x' ? nudo(a, l.c) : nudo(l.c, a);
      if (antes >= 0 && antes !== k) {
        let nueva = true;
        if (vistas !== null) {
          const llave = antes < k ? antes * 65536 + k : k * 65536 + antes;
          nueva = !vistas.has(llave);
          vistas.add(llave);
        }
        if (nueva && (!l.probar || !estorbos.tapa(xs[antes] as number, zs[antes] as number, xs[k] as number, zs[k] as number))) {
          aristaA.push(antes);
          aristaB.push(k);
          aristaCalle.push(l.calle);
          aristaPorX.push(l.eje === 'x');
        }
      }
      antes = k;
    }
  }

  /* Sólo los nudos con alguna arista, renumerados en orden; los cruces, siempre (y todos tienen). */
  const usado = new Uint8Array(xs.length);
  for (let i = 0; i < aristaA.length; i++) {
    usado[aristaA[i] as number] = 1;
    usado[aristaB[i] as number] = 1;
  }
  const nuevo = new Int32Array(xs.length).fill(-1);
  const nudos: Punto[] = [];
  for (let k = 0; k < xs.length; k++) {
    if (k >= CRUCES && usado[k] === 0) continue;
    if (k < CRUCES && usado[k] === 0) throw new RangeError(`El cruce ${String(k)} se quedó sin aristas.`);
    nuevo[k] = nudos.length;
    nudos.push(fijo({ x: xs[k] as number, z: zs[k] as number }));
  }
  const finales: AristaDelGrafo[] = new Array<AristaDelGrafo>(aristaA.length);
  for (let i = 0; i < aristaA.length; i++) {
    const a = nuevo[aristaA[i] as number] as number;
    const b = nuevo[aristaB[i] as number] as number;
    const calle = aristaCalle[i] as number;
    const p = nudos[a] as Punto;
    const q = nudos[b] as Punto;
    let tramo: number | null = null;
    if (calle >= 0) {
      const medio = aristaPorX[i] === true ? (p.x + q.x) / 2 : (p.z + q.z) / 2;
      let sg = 0;
      while (sg < N - 2 && medio > (EJES[sg + 1] as number)) sg++;
      tramo = (tramos[calle * (N - 1) + sg] as TramoDeLaCiudad).indice;
    }
    finales[i] = fijo({ a, b, largo: Math.abs(q.x - p.x) + Math.abs(q.z - p.z), tramo });
  }
  const grafo: GrafoDeLaCiudad = fijo({ nudos: fijo(nudos), aristas: fijo(finales) });
  return {
    grafo,
    nudoEn: (x: number, z: number): number => {
      const k = numero.get(llaveDelPunto(x, z));
      return k === undefined ? -1 : (nuevo[k] as number);
    },
  };
}

/* ─── La red de aceras ────────────────────────────────────────────────────── */

/**
 * LA RED DE ACERAS DE LA CIUDAD: por donde andan los durmientes, a 1 m de la línea de solar de cada hueco
 * (plazas incluidas). El nudo `4n + k` es la esquina `k` del anillo del hueco `n` (0 noroeste, 1 noreste, 2
 * sureste, 3 suroeste). Los tramos: los cuatro lados de cada anillo (`acera`) y, entre las esquinas de dos
 * huecos vecinos, el paso de cebra que cruza la calle entre ellos (`paso`), con el cruce cuyo semáforo lo
 * manda. Donde dos esquinas no se miran (a un lado y otro del Elevado, junto al Bulevar) no hay paso.
 */
function laRedDeAceras(solares: readonly Rectangulo[]): RedDeAcerasDeLaCiudad {
  const nudos: Punto[] = [];
  for (let n = 0; n < HUECOS; n++) {
    const s = solares[n] as Rectangulo;
    nudos.push(fijo({ x: s.x0 - 1, z: s.z0 - 1 }), fijo({ x: s.x1 + 1, z: s.z0 - 1 }), fijo({ x: s.x1 + 1, z: s.z1 + 1 }), fijo({ x: s.x0 - 1, z: s.z1 + 1 }));
  }
  const tramos: TramoDeAcera[] = [];
  const tramo = (a: number, b: number, eje: Eje, tipo: 'acera' | 'paso', cruce: number | null): void => {
    const p = nudos[a] as Punto;
    const q = nudos[b] as Punto;
    tramos.push(fijo({ a, b, eje, tipo, cruce, largo: Math.abs(q.x - p.x) + Math.abs(q.z - p.z) }));
  };
  for (let n = 0; n < HUECOS; n++) {
    tramo(4 * n, 4 * n + 1, 'x', 'acera', null);
    tramo(4 * n + 3, 4 * n + 2, 'x', 'acera', null);
    tramo(4 * n, 4 * n + 3, 'z', 'acera', null);
    tramo(4 * n + 1, 4 * n + 2, 'z', 'acera', null);
  }
  const N = EJES_DE_LA_CIUDAD.length;
  for (let n = 0; n < HUECOS; n++) {
    const { i, j } = huecoDelIndice(n);
    /* Con el vecino del este: la calle que corre por `z` en x = 48i + 24 (columna i + 6 de los cruces). */
    if (i < HUECO_MAXIMO) {
      const m = indiceDeHueco(i + 1, j);
      const columna = i + HUECO_MAXIMO + 1;
      if ((nudos[4 * n + 1] as Punto).z === (nudos[4 * m] as Punto).z) tramo(4 * n + 1, 4 * m, 'x', 'paso', (j + HUECO_MAXIMO) * N + columna);
      if ((nudos[4 * n + 2] as Punto).z === (nudos[4 * m + 3] as Punto).z) tramo(4 * n + 2, 4 * m + 3, 'x', 'paso', (j + HUECO_MAXIMO + 1) * N + columna);
    }
    /* Con el vecino del sur: la calle que corre por `x` en z = 48j + 24 (fila j + 6 de los cruces). */
    if (j < HUECO_MAXIMO) {
      const m = indiceDeHueco(i, j + 1);
      const fila = j + HUECO_MAXIMO + 1;
      if ((nudos[4 * n + 3] as Punto).x === (nudos[4 * m] as Punto).x) tramo(4 * n + 3, 4 * m, 'z', 'paso', fila * N + (i + HUECO_MAXIMO));
      if ((nudos[4 * n + 2] as Punto).x === (nudos[4 * m + 1] as Punto).x) tramo(4 * n + 2, 4 * m + 1, 'z', 'paso', fila * N + (i + HUECO_MAXIMO + 1));
    }
  }
  return fijo({ nudos: fijo(nudos), tramos: fijo(tramos) });
}

/* ─── Las celdas del cliente ──────────────────────────────────────────────── */

/** Las celdas (índices) que toca un rectángulo por dentro: las de `[x0, x1)` × `[z0, z1)`, recortadas a la rejilla. */
function celdasQueToca(r: Rectangulo, apuntar: (celda: number) => void): void {
  const i0 = Math.max(CELDA_MINIMA, Math.floor((r.x0 + LADO_DE_CELDA / 2) / LADO_DE_CELDA));
  const i1 = Math.min(CELDA_MAXIMA, Math.ceil((r.x1 + LADO_DE_CELDA / 2) / LADO_DE_CELDA) - 1);
  const j0 = Math.max(CELDA_MINIMA, Math.floor((r.z0 + LADO_DE_CELDA / 2) / LADO_DE_CELDA));
  const j1 = Math.min(CELDA_MAXIMA, Math.ceil((r.z1 + LADO_DE_CELDA / 2) / LADO_DE_CELDA) - 1);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) apuntar(indiceDeCelda(i, j));
}

function lasCeldas(distritos: readonly IdDeDistrito[], partes: readonly ParteDeEdificio[], tramos: readonly TramoDeLaCiudad[], cajas: readonly CajaDeLaCiudad[]): readonly CeldaDeLaCiudad[] {
  const porCelda: number[][] = [];
  const edificios: number[][] = [];
  const suyos: number[][] = [];
  for (let k = 0; k < CELDAS; k++) {
    porCelda.push([]);
    edificios.push([]);
    suyos.push([]);
  }
  for (let n = 0; n < cajas.length; n++) {
    const c = cajas[n] as CajaDeLaCiudad;
    const celda = celdaDe((c.x0 + c.x1) / 2, (c.z0 + c.z1) / 2);
    if (celda !== null) (porCelda[indiceDeCelda(celda.i, celda.j)] as number[]).push(n);
  }
  /* Lo que toca cada celda: se recorre cada edificio y cada tramo una vez, en orden, y se apunta en las suyas. */
  for (let e = 0; e < partes.length; e++) {
    const huella = (partes[e] as ParteDeEdificio).parte.huella;
    celdasQueToca(huella, (celda) => (edificios[celda] as number[]).push(e));
  }
  for (const t of tramos) {
    const r = t.eje === 'x' ? { x0: t.desde, z0: t.centro - t.ancho / 2, x1: t.hasta, z1: t.centro + t.ancho / 2 } : { x0: t.centro - t.ancho / 2, z0: t.desde, x1: t.centro + t.ancho / 2, z1: t.hasta };
    celdasQueToca(r, (celda) => (suyos[celda] as number[]).push(t.indice));
  }
  const celdas: CeldaDeLaCiudad[] = [];
  for (let k = 0; k < CELDAS; k++) {
    const { i, j } = celdaDelIndice(k);
    const dentro = Math.abs(i) <= HUECO_MAXIMO && Math.abs(j) <= HUECO_MAXIMO;
    const hueco = dentro ? indiceDeHueco(i, j) : null;
    celdas.push(
      fijo({
        i,
        j,
        indice: k,
        caja: fijo(rectanguloDeLaCelda(i, j)),
        hueco,
        distrito: hueco === null ? null : (distritos[hueco] as IdDeDistrito),
        edificios: fijo(edificios[k] as number[]),
        tramos: fijo(suyos[k] as number[]),
        cajas: fijo(porCelda[k] as number[]),
      }),
    );
  }
  return fijo(celdas);
}

/* ─── Un Dijkstra sobre listas planas, con cota ───────────────────────────── */

/**
 * UN DIJKSTRA SOBRE LISTAS PLANAS: `vecinos[inicio[u] … inicio[u + 1])` son los vecinos de `u`, con su largo
 * en `largos`; `cerrada[k]`, si no es `null`, quita la entrada `k`. El montículo va con orden total
 * (distancia, y a igual distancia el nudo menor), y los dos paran en cuanto lo que sale pasa de `cota`: lo que
 * queda más lejos se queda en −1. Dentro de la cota, las distancias son las del Dijkstra entero, porque un
 * camino que sale de la cota ya es más largo.
 *
 * Con los largos en cuartos (`cuartos`, lo de toda la ciudad) va por cubetas (`dijkstraPorCubetas`), y si no,
 * por el montículo. Los metros son los mismos: son los del camino más corto, exactos en los dos, y no
 * dependen del orden en que salen los nudos; el orden total del montículo sólo hace que ese orden también
 * sea el mismo en todos los motores (el de las cubetas lo es sin más: enteros y listas).
 */
function dijkstraPlano(n: number, inicio: Int32Array, vecinos: Int32Array, largos: Float64Array, desde: number, cota: number, cerrada: Uint8Array | null, cuartos: LargosEnCuartos | null): Float64Array {
  if (cuartos !== null) return dijkstraPorCubetas(n, inicio, vecinos, cuartos, desde, cota, cerrada);
  const metros = new Float64Array(n).fill(-1);
  const hecho = new Uint8Array(n);
  const tope = vecinos.length + 1;
  const monton = new Int32Array(tope);
  const clave = new Float64Array(tope);
  let tam = 0;
  const antes = (i: number, j: number): boolean => {
    const a = clave[i] as number;
    const b = clave[j] as number;
    return a < b || (a === b && (monton[i] as number) < (monton[j] as number));
  };
  const cambiar = (i: number, j: number): void => {
    const u = monton[i] as number;
    const d = clave[i] as number;
    monton[i] = monton[j] as number;
    clave[i] = clave[j] as number;
    monton[j] = u;
    clave[j] = d;
  };
  const meter = (u: number, d: number): void => {
    let i = tam++;
    monton[i] = u;
    clave[i] = d;
    while (i > 0) {
      const padre = (i - 1) >> 1;
      if (!antes(i, padre)) break;
      cambiar(i, padre);
      i = padre;
    }
  };
  metros[desde] = 0;
  meter(desde, 0);
  while (tam > 0) {
    const u = monton[0] as number;
    const du = clave[0] as number;
    tam--;
    if (tam > 0) {
      monton[0] = monton[tam] as number;
      clave[0] = clave[tam] as number;
      let i = 0;
      for (;;) {
        const iz = 2 * i + 1;
        const de = iz + 1;
        let m = i;
        if (iz < tam && antes(iz, m)) m = iz;
        if (de < tam && antes(de, m)) m = de;
        if (m === i) break;
        cambiar(i, m);
        i = m;
      }
    }
    if (hecho[u] === 1) continue;
    if (du > cota) {
      metros[u] = -1;
      continue;
    }
    hecho[u] = 1;
    for (let k = inicio[u] as number; k < (inicio[u + 1] as number); k++) {
      if (cerrada !== null && cerrada[k] === 1) continue;
      const v = vecinos[k] as number;
      if (hecho[v] === 1) continue;
      const dv = du + (largos[k] as number);
      const ya = metros[v] as number;
      if (ya >= 0 && ya <= dv) continue;
      metros[v] = dv;
      meter(v, dv);
    }
  }
  for (let u = 0; u < n; u++) if (hecho[u] === 0) metros[u] = -1;
  return metros;
}

/**
 * LOS LARGOS DE UN GRAFO EN CUARTOS DE METRO: enteros, con el mayor aparte (`mayor`). En la ciudad todo largo
 * es un múltiplo de 0,25 m (`|Δx| + |Δz|` entre puntos en cuartos), así que el Dijkstra puede contar en
 * enteros con una cola de cubetas. `null` si algún largo no es un número entero de cuartos (un grafo que no
 * es de la ciudad: el del cliente de ensayo, uno de un comprobador), si una arista pasa de `MAYOR_ARISTA_EN_CUARTOS`
 * (demasiadas cubetas) o si un camino podría pasar de 2^30 cuartos: entonces va por el montículo.
 */
interface LargosEnCuartos {
  readonly cuartos: Int32Array;
  readonly mayor: number;
}

/** La arista más larga que se cuenta en cubetas: 1.024 m, 4.096 cuartos (en la ciudad, la del grueso mide 57). */
const MAYOR_ARISTA_EN_CUARTOS = 4096;

function largosEnCuartos(largos: Float64Array, nudos: number): LargosEnCuartos | null {
  const cuartos = new Int32Array(largos.length);
  let mayor = 0;
  for (let k = 0; k < largos.length; k++) {
    const c = (largos[k] as number) * 4;
    if (!Number.isInteger(c) || c < 0 || c > MAYOR_ARISTA_EN_CUARTOS) return null;
    cuartos[k] = c;
    if (c > mayor) mayor = c;
  }
  if (mayor * Math.max(1, nudos) >= 1073741824) return null;
  return { cuartos, mayor };
}

/**
 * EL DIJKSTRA DE `dijkstraPlano` POR CUBETAS (el de Dial), con las distancias en cuartos enteros. Una cubeta
 * por cuarto, en círculo: lo que está en la cola dista de `actual` a `actual + mayor`, así que con
 * `mayor + 1` cubetas cada una sólo guarda entradas de una distancia. Un nudo puede entrar varias veces (una
 * por arista relajada) y sólo cuenta cuando sale con su distancia de ahora. Da los mismos metros que el
 * montículo: los del camino más corto, que en cuartos son exactos.
 */
function dijkstraPorCubetas(n: number, inicio: Int32Array, vecinos: Int32Array, l: LargosEnCuartos, desde: number, cota: number, cerrada: Uint8Array | null): Float64Array {
  const cubetas = l.mayor + 1;
  const cabeza = new Int32Array(cubetas).fill(-1);
  const tope = vecinos.length + 1;
  const siguiente = new Int32Array(tope);
  const quien = new Int32Array(tope);
  const cuartos = l.cuartos;
  const d = new Int32Array(n).fill(-1);
  const hecho = new Uint8Array(n);
  const cotaEnCuartos = cota * 4;
  let usadas = 0;
  let pendientes = 1;
  d[desde] = 0;
  quien[0] = desde;
  siguiente[0] = -1;
  cabeza[0] = 0;
  usadas = 1;
  let actual = 0;
  let cubeta = 0;
  while (pendientes > 0) {
    const e = cabeza[cubeta] as number;
    if (e < 0) {
      actual++;
      cubeta = cubeta + 1 === cubetas ? 0 : cubeta + 1;
      continue;
    }
    if (actual > cotaEnCuartos) break;
    cabeza[cubeta] = siguiente[e] as number;
    pendientes--;
    const u = quien[e] as number;
    if (hecho[u] === 1 || d[u] !== actual) continue;
    hecho[u] = 1;
    for (let k = inicio[u] as number; k < (inicio[u + 1] as number); k++) {
      if (cerrada !== null && cerrada[k] === 1) continue;
      const v = vecinos[k] as number;
      if (hecho[v] === 1) continue;
      const dv = actual + (cuartos[k] as number);
      const ya = d[v] as number;
      if (ya >= 0 && ya <= dv) continue;
      d[v] = dv;
      const b = dv % cubetas;
      quien[usadas] = v;
      siguiente[usadas] = cabeza[b] as number;
      cabeza[b] = usadas;
      usadas++;
      pendientes++;
    }
  }
  const metros = new Float64Array(n).fill(-1);
  for (let u = 0; u < n; u++) if (hecho[u] === 1) metros[u] = (d[u] as number) / 4;
  return metros;
}

/* ─── El grafo grueso de las obras ────────────────────────────────────────── */

/**
 * EL GRAFO GRUESO: los 144 cruces (0-143), las 6 plazas (144-149) y las 20 cabinas (150-169), en listas planas. Cada tramo une sus dos
 * cruces con lo que se anda de uno a otro por el grafo de verdad a lo largo de su calle (48 m, o 57 en una
 * avenida: se baja a la calzada, 4,5 m, y se vuelve a subir); cada plaza, su nudo con sus cuatro esquinas,
 * con lo que se anda por el grafo de verdad (un Dijkstra con cota desde su nudo). Ninguna arista mide menos
 * que el camino de verdad entre sus extremos, así que ninguna distancia del grueso es menor que la del
 * grafo: si el grueso dice que dos plazas quedan a 260 o menos con unas obras, el grafo lo dice también. La
 * noche lo usa para elegir las obras sin un Dijkstra de 3.000 nudos por plaza, y sólo pregunta al grafo de
 * verdad cuando el grueso se pasa. `tramo[k]` es el tramo de la entrada `k` (−1 las de las plazas y las de
 * las cabinas). Cada cabina, su nudo (el más cercano a su sitio, como lo mide `verify:quiebro-barrio`) con los
 * dos cruces de su tramo, con lo que se anda por los ejes: a lo largo de su calzada y, si es de avenida, los
 * 4,5 m de subir al eje. Es un camino de verdad, y el tramo de una cabina nunca lleva obra (tiene un poste).
 */
interface GrafoGrueso {
  readonly inicio: Int32Array;
  readonly vecinos: Int32Array;
  readonly largos: Float64Array;
  readonly tramo: Int32Array;
  /** Los largos en cuartos (`largosEnCuartos`), para el Dijkstra por cubetas. */
  readonly cuartos: LargosEnCuartos | null;
  /** Cada cabina candidata `k` (el nodo `NODOS_SIN_LAS_CABINAS + k`): su nudo más cercano del grafo y lo que hay de él a su sitio. */
  readonly cabinas: readonly { readonly nudo: number; readonly extra: number }[];
}

/** Los nodos del grueso antes de las cabinas: los cruces y las plazas. */
const NODOS_SIN_LAS_CABINAS = CRUCES + PLAZAS_POR_CIUDAD;

/**
 * Lo que se anda del nudo de una plaza a sus cuatro esquinas (noroeste, suroeste, noreste, sureste), por el
 * grafo de verdad. Sólo depende de su plantilla y de la simetría: una plaza nunca da a una avenida, sus cuatro
 * calles son siempre calles, y nada de fuera de la plantilla pisa sus líneas. Así que se mide una vez por
 * plantilla y simetría (un Dijkstra con cota) y se guarda.
 */
const ESQUINAS = new Map<string, readonly number[]>();
function esquinasDeLaPlaza(p: PlazaDeLaCiudad, simetria: number, grafo: GrafoDeLaCiudad): readonly number[] {
  const llave = `${p.plantilla}#${String(simetria)}`;
  const hechas = ESQUINAS.get(llave);
  if (hechas !== undefined) return hechas;
  const ix = indiceDelGrafo(grafo);
  const metros = dijkstraPlano(grafo.nudos.length, ix.inicio, ix.vecinos, ix.largos, p.nudo, COTA_DE_LAS_ESQUINAS, null, ix.cuartos);
  const salida: number[] = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = p.centro.x + sx * EJE_DE_LAS_CALLES_DE_LA_PLAZA;
      const z = p.centro.z + sz * EJE_DE_LAS_CALLES_DE_LA_PLAZA;
      salida.push(metros[EJES_DE_LA_CIUDAD.indexOf(z) * EJES_DE_LA_CIUDAD.length + EJES_DE_LA_CIUDAD.indexOf(x)] as number);
    }
  }
  const listas = fijo(salida);
  ESQUINAS.set(llave, listas);
  return listas;
}

function elGrafoGrueso(tramos: readonly TramoDeLaCiudad[], plazas: readonly PlazaDeLaCiudad[], cabinas: readonly CabinaDeLaCiudad[], grafo: GrafoDeLaCiudad, simetria: number): GrafoGrueso {
  const aristas: { a: number; b: number; largo: number; tramo: number }[] = [];
  for (const t of tramos) aristas.push({ a: t.cruces[0], b: t.cruces[1], largo: t.clase === 'avenida' ? PASO_DE_LA_REJILLA + 2 * MEDIO_EJE_DE_LA_CALZADA_DE_AVENIDA : PASO_DE_LA_REJILLA, tramo: t.indice });
  for (const p of plazas) {
    const esquinas = esquinasDeLaPlaza(p, simetria, grafo);
    let k = 0;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const x = p.centro.x + sx * EJE_DE_LAS_CALLES_DE_LA_PLAZA;
        const z = p.centro.z + sz * EJE_DE_LAS_CALLES_DE_LA_PLAZA;
        const cruce = EJES_DE_LA_CIUDAD.indexOf(z) * EJES_DE_LA_CIUDAD.length + EJES_DE_LA_CIUDAD.indexOf(x);
        const m = esquinas[k] as number;
        k++;
        if (m >= 0) aristas.push({ a: CRUCES + p.numero - 1, b: cruce, largo: m, tramo: -1 });
      }
    }
  }
  /* Las cabinas. Si su nudo no cayera en la calzada de su tramo, se queda sin aristas: la noche irá al grafo de verdad. */
  const deLasCabinas: { readonly nudo: number; readonly extra: number }[] = [];
  for (let k = 0; k < cabinas.length; k++) {
    const c = cabinas[k] as CabinaDeLaCiudad;
    const nudo = nudoMasCercano(grafo, c.sitio.x, c.sitio.z);
    const q = grafo.nudos[nudo] as Punto;
    deLasCabinas.push(fijo({ nudo, extra: Math.abs(q.x - c.sitio.x) + Math.abs(q.z - c.sitio.z) }));
    const t = tramos[c.tramo] as TramoDeLaCiudad;
    const traves = t.eje === 'x' ? q.z : q.x;
    const largo = t.eje === 'x' ? q.x : q.z;
    if (Math.abs(traves - t.centro) > MEDIO_EJE_DE_LA_CALZADA_DE_AVENIDA || largo < t.desde || largo > t.hasta) continue;
    for (const cruce of t.cruces) {
      const r = LOS_CRUCES[cruce] as Punto;
      aristas.push({ a: NODOS_SIN_LAS_CABINAS + k, b: cruce, largo: Math.abs(q.x - r.x) + Math.abs(q.z - r.z), tramo: -1 });
    }
  }
  const nodos = NODOS_SIN_LAS_CABINAS + cabinas.length;
  const grado = new Int32Array(nodos + 1);
  for (let i = 0; i < aristas.length; i++) {
    const a = aristas[i] as (typeof aristas)[number];
    grado[a.a] = (grado[a.a] as number) + 1;
    grado[a.b] = (grado[a.b] as number) + 1;
  }
  const inicio = new Int32Array(nodos + 1);
  for (let u = 0; u < nodos; u++) inicio[u + 1] = (inicio[u] as number) + (grado[u] as number);
  const total = inicio[nodos] as number;
  const vecinos = new Int32Array(total);
  const largos = new Float64Array(total);
  const tramo = new Int32Array(total);
  const puesto = inicio.slice(0, nodos);
  for (let i = 0; i < aristas.length; i++) {
    const a = aristas[i] as (typeof aristas)[number];
    /* De `a` a `b` y de `b` a `a`, en ese orden. */
    for (let sentido = 0; sentido < 2; sentido++) {
      const u = sentido === 0 ? a.a : a.b;
      const k = puesto[u] as number;
      vecinos[k] = sentido === 0 ? a.b : a.a;
      largos[k] = a.largo;
      tramo[k] = a.tramo;
      puesto[u] = k + 1;
    }
  }
  return fijo({ inicio, vecinos, largos, tramo, cuartos: largosEnCuartos(largos, nodos), cabinas: fijo(deLasCabinas) });
}

/** Hasta dónde se busca desde el nudo de una plaza para medir sus esquinas: están a unos 44 m, y 150 deja rodear lo que haya. */
const COTA_DE_LAS_ESQUINAS = 150;

/** Las distancias del grueso desde la plaza `desde` (1-6) con las entradas `cerrada`: por nodo, −1 si no se llega. */
function distanciasGruesas(g: GrafoGrueso, cerrada: Uint8Array, desde: number): Float64Array {
  return dijkstraPlano(g.inicio.length - 1, g.inicio, g.vecinos, g.largos, CRUCES + desde - 1, Number.POSITIVE_INFINITY, cerrada, g.cuartos);
}

/**
 * DESDE EL NUDO DE CADA PLAZA, por el grafo base: para cada cabina, lo que se anda hasta su sitio y los tramos
 * de UN camino más corto (el que baja, nudo a nudo, por la primera arista que está en un camino corto); y lo
 * mismo hasta las otras plazas (los tríos). Una obra sólo quita aristas de su propio tramo, y quitar aristas
 * sólo alarga: si ningún tramo de ese camino lleva obra, esa noche está exactamente a lo mismo; si alguno la
 * lleva, a eso o más. Es de la traza: seis Dijkstras la primera vez que se viste una noche suya, con cota
 * (`cotaDeLosCaminos`): lo que queda más lejos no puede estar en una banda ni en un trío esa noche, y se
 * apunta con −1.
 */
interface DesdeLasPlazas {
  readonly aLasCabinas: readonly (readonly CaminoALaCabina[])[];
  /** `aLasPlazas[a][b]`: de la plaza `a + 1` a la `b + 1`, de nudo a nudo. */
  readonly aLasPlazas: readonly (readonly CaminoALaCabina[])[];
}

interface CaminoALaCabina {
  /** Hasta el sitio de la cabina (su nudo y lo de su sitio), o hasta el nudo de la plaza; −1 si queda más allá de la cota. */
  readonly metros: number;
  readonly tramos: readonly number[];
}

const DESDE_LAS_PLAZAS = new WeakMap<GeometriaDeLaTraza, DesdeLasPlazas>();

/** Hasta dónde se miden los caminos: lo más que puede medir algo que valga, una cabina lejana o un trío. */
function cotaDeLosCaminos(): number {
  return Math.max(BANDA_DE_LA_CABINA_LEJANA[1], FALLOS_CON_CORTES_COMO_MUCHO);
}

function desdeLasPlazas(g: GeometriaDeLaTraza): DesdeLasPlazas {
  const hecho = DESDE_LAS_PLAZAS.get(g);
  if (hecho !== undefined) return hecho;
  const grafo = g.grafo;
  const n = grafo.nudos.length;
  /*
   * Las listas del índice del grafo (las mismas que usa `campoHasta`, hechas una vez), y el tramo de cada
   * entrada: se recorren las aristas en el mismo orden que al hacer el índice, así que la entrada `k` es la
   * misma arista. El largo del índice (`|Δx| + |Δz|` de sus nudos) es el `largo` de la arista del grafo base.
   */
  const ix = indiceDelGrafo(grafo);
  const inicio = ix.inicio;
  const vecinos = ix.vecinos;
  const largos = ix.largos;
  const tramoDe = new Int32Array(vecinos.length);
  const puesto = inicio.slice(0, n);
  for (let i = 0; i < grafo.aristas.length; i++) {
    const a = grafo.aristas[i] as AristaDelGrafo;
    const t = a.tramo === null ? -1 : a.tramo;
    let k = puesto[a.a] as number;
    tramoDe[k] = t;
    puesto[a.a] = k + 1;
    k = puesto[a.b] as number;
    tramoDe[k] = t;
    puesto[a.b] = k + 1;
  }
  /* Un camino más corto de `desde` (con sus metros `m`) hasta `hasta`, bajando por la primera arista corta de cada nudo. */
  const camino = (m: Float64Array, desde: number, hasta: number, extra: number): CaminoALaCabina => {
    if ((m[hasta] as number) < 0) return fijo({ metros: -1, tramos: fijo([] as number[]) });
    const tramos: number[] = [];
    let u = hasta;
    while (u !== desde) {
      let siguiente = -1;
      for (let k = inicio[u] as number; k < (inicio[u + 1] as number); k++) {
        const v = vecinos[k] as number;
        const mv = m[v] as number;
        if (mv < 0 || mv + (largos[k] as number) !== (m[u] as number)) continue;
        siguiente = v;
        const t = tramoDe[k] as number;
        if (t >= 0 && !tramos.includes(t)) tramos.push(t);
        break;
      }
      if (siguiente < 0) throw new RangeError(`El camino al nudo ${String(hasta)} se quedó sin arista en el ${String(u)}.`);
      u = siguiente;
    }
    return fijo({ metros: (m[hasta] as number) + extra, tramos: fijo(tramos) });
  };
  const aLasCabinas: (readonly CaminoALaCabina[])[] = [];
  const aLasPlazas: (readonly CaminoALaCabina[])[] = [];
  const cota = cotaDeLosCaminos();
  for (const p of g.plazas) {
    const m = dijkstraPlano(n, inicio, vecinos, largos, p.nudo, cota, null, ix.cuartos);
    aLasCabinas.push(fijo(g.grueso.cabinas.map((cabina) => camino(m, p.nudo, cabina.nudo, cabina.extra))));
    aLasPlazas.push(fijo(g.plazas.map((q) => camino(m, p.nudo, q.nudo, 0))));
  }
  const listo: DesdeLasPlazas = fijo({ aLasCabinas: fijo(aLasCabinas), aLasPlazas: fijo(aLasPlazas) });
  DESDE_LAS_PLAZAS.set(g, listo);
  return listo;
}

/** Las entradas del grueso que quedan cerradas con los tramos `cortados`. */
function entradasCerradas(g: GrafoGrueso, cortados: readonly number[]): Uint8Array {
  const cerrada = new Uint8Array(g.tramo.length);
  for (let k = 0; k < g.tramo.length; k++) if (cortados.includes(g.tramo[k] as number)) cerrada[k] = 1;
  return cerrada;
}

/* ─── La ciudad de la mesa ────────────────────────────────────────────────── */

const CIUDADES = new Map<string, CiudadDeLaMesa>();
/** La geometría de cada ciudad: la guarda viva mientras viva la ciudad, aunque salga de la memoria de trazas. */
const GEOMETRIA_DE_LA_CIUDAD = new WeakMap<CiudadDeLaMesa, GeometriaDeLaTraza>();

function laCiudadDeLaMesa(traza: number, codigo: string): CiudadDeLaMesa {
  const llave = `${String(traza)}#${codigo}`;
  const hecha = CIUDADES.get(llave);
  if (hecha !== undefined) {
    CIUDADES.delete(llave);
    CIUDADES.set(llave, hecha);
    return hecha;
  }
  const g = geometriaDeLaTraza(traza);
  const cajas = g.cajas.slice();
  const edificios: EdificioDeLaCiudad[] = [];
  const rotulos: RotuloDelBarrio[] = [];
  for (const h of g.huecos) {
    if (h.edificios.length === 0) continue;
    const primero = h.edificios[0] as number;
    const suyas = h.edificios.map((e) => g.partes[e] as ParteDeEdificio);
    const vestida = vestirLaManzana(`${codigo}#m${String(h.indice)}`, h.distrito, suyas.map((p) => p.parte));
    for (let k = 0; k < suyas.length; k++) {
      const p = suyas[k] as ParteDeEdificio;
      const v = vestida.edificios[k] as (typeof vestida.edificios)[number];
      const e = primero + k;
      const vieja = cajas[p.caja] as CajaDeLaCiudad;
      cajas[p.caja] = nuevaCaja(vieja, 'edificio', v.alto, 0, e, false, h.indice, 0);
      /* Sus pilares ya llevan su edificio desde la geometría (`pilaresDeLaParte`): son los mismos en todas las mesas. */
      edificios.push(
        fijo({
          indice: e,
          hueco: h.indice,
          distrito: h.distrito,
          huella: p.parte.huella,
          tramos: fijo(v.tramos.map((t) => fijo(t))),
          alto: v.alto,
          estilo: v.estilo,
          tono: v.tono,
          vano: v.vano,
          balcones: v.balcones,
          semilla: v.semilla,
          fachadas: fijo(v.fachadas.map((f) => fijo(f))),
          soportales: p.soportales,
          caja: p.caja,
          pilares: p.pilares,
        }),
      );
    }
    for (const r of vestida.rotulos) rotulos.push(fijo({ ...r, edificio: primero + r.edificio }));
  }
  const o = g.orientada;
  const ciudad: CiudadDeLaMesa = fijo({
    traza,
    dibujo: o.dibujo,
    simetria: o.simetria,
    codigo,
    huecos: g.huecos,
    plazas: g.plazas,
    calles: g.calles,
    cruces: g.cruces,
    tramos: g.tramos,
    avenidas: g.avenidas,
    callejones: g.callejones,
    edificios: fijo(edificios),
    rotulos: fijo(rotulos),
    cajas: fijo(cajas),
    cabinas: g.cabinas,
    refugios: g.refugios,
    zonas: g.zonas,
    grafo: g.grafo,
    aceras: g.aceras,
    distancias: g.distancias,
    celdas: g.celdas,
  });
  GEOMETRIA_DE_LA_CIUDAD.set(ciudad, g);
  CIUDADES.set(llave, ciudad);
  for (const vieja of CIUDADES.keys()) {
    if (CIUDADES.size <= CIUDADES_GUARDADAS) break;
    CIUDADES.delete(vieja);
  }
  return ciudad;
}

/** La geometría de una ciudad: la suya si es de `ciudadDeLaMesa`, o la de su traza si es una copia. */
function geometriaDe(ciudad: CiudadDeLaMesa): GeometriaDeLaTraza {
  return GEOMETRIA_DE_LA_CIUDAD.get(ciudad) ?? geometriaDeLaTraza(ciudad.traza);
}

/* ─── La noche ────────────────────────────────────────────────────────────── */

function comprobarLosFallos(fallos: readonly number[]): void {
  if (!Array.isArray(fallos) || fallos.length > 5) throw new RangeError('Los Fallos de una noche son cinco plazas como mucho: la Bajada, dos Fallos y dos propinas.');
  for (let k = 0; k < fallos.length; k++) {
    const p = fallos[k] as number;
    comprobarPlaza(p);
    if (fallos.indexOf(p) !== k) throw new RangeError(`La plaza ${String(p)} está dos veces en los Fallos.`);
  }
}

/** Lo que la noche pone y no depende de los Fallos: se guarda por ciudad y noche. */
interface VestidoDeLaNoche {
  readonly noche: number;
  readonly cajas: readonly CajaDeLaCiudad[];
  readonly cajasDeLaMesa: number;
  readonly cortes: readonly CorteDeObra[];
  readonly grafo: GrafoDeLaCiudad;
  readonly semaforos: readonly number[];
  readonly tren: TrenDeLaCiudad;
  readonly tiempo: Tiempo;
  readonly hora: { readonly h: number; readonly m: number };
}

const VESTIDOS = new WeakMap<CiudadDeLaMesa, Map<number, VestidoDeLaNoche>>();
const NOCHES = new WeakMap<VestidoDeLaNoche, Map<string, NocheDeLaCiudad>>();

function laNoche(ciudad: CiudadDeLaMesa, noche: number, fallos: readonly number[]): NocheDeLaCiudad {
  let porNoche = VESTIDOS.get(ciudad);
  if (porNoche === undefined) {
    porNoche = new Map();
    VESTIDOS.set(ciudad, porNoche);
  }
  let vestido = porNoche.get(noche);
  if (vestido === undefined) {
    vestido = vestirLaNoche(ciudad, noche);
    porNoche.set(noche, vestido);
  }
  let porFallos = NOCHES.get(vestido);
  if (porFallos === undefined) {
    porFallos = new Map();
    NOCHES.set(vestido, porFallos);
  }
  const llave = fallos.join(',');
  const hecha = porFallos.get(llave);
  if (hecha !== undefined) return hecha;
  const nueva: NocheDeLaCiudad = fijo({
    ciudad,
    noche: vestido.noche,
    fallos: fijo(fallos.slice()),
    plazasDespejadas: false,
    cajas: vestido.cajas,
    cajasDeLaMesa: vestido.cajasDeLaMesa,
    cortes: vestido.cortes,
    grafo: vestido.grafo,
    semaforos: vestido.semaforos,
    tren: vestido.tren,
    tiempo: vestido.tiempo,
    hora: vestido.hora,
  });
  porFallos.set(llave, nueva);
  return nueva;
}

/** Cuántas veces se sortean las obras antes de dejar la noche sin ninguna: con los cortables de las cuatro trazas no pasa. */
const INTENTOS_DE_OBRAS = 24;

/** La probabilidad (en %) de que haya coche en cada sitio de la acera que aparca, por distrito (§2.2). */
const COCHES_POR_DISTRITO: Readonly<Record<IdDeDistrito, number>> = { casco: 40, ensanche: 70, lonja: 50, naves: 45, torres: 35 };

/** Lo que mide la valla de una obra a lo largo de su calle, y dónde va: entre el nudo del centro del tramo y el siguiente. */
const OBRA_DESDE = 2;
const OBRA_HASTA = 4;

/** La caja de la obra del tramo `t`: de línea de solar a línea de solar, de 2 a 4 m pasado el centro del tramo. */
function cajaDeLaObra(t: TramoDeLaCiudad, lados: readonly LadoParaAmueblar[]): Rectangulo {
  const a = lados[2 * t.indice] as LadoParaAmueblar;
  const b = lados[2 * t.indice + 1] as LadoParaAmueblar;
  const medio = (t.desde + t.hasta) / 2;
  const p0 = Math.min(a.linea, b.linea);
  const p1 = Math.max(a.linea, b.linea);
  return t.eje === 'x' ? { x0: medio + OBRA_DESDE, z0: p0, x1: medio + OBRA_HASTA, z1: p1 } : { x0: p0, z0: medio + OBRA_DESDE, x1: p1, z1: medio + OBRA_HASTA };
}

/** El grafo de la noche: el base sin las aristas que entran en alguna obra, con los mismos nudos. */
function grafoSinLasObras(base: GrafoDeLaCiudad, tramos: readonly TramoDeLaCiudad[], lados: readonly LadoParaAmueblar[], cortados: readonly number[]): GrafoDeLaCiudad {
  if (cortados.length === 0) return base;
  const estorbos = new RejillaDeEstorbos();
  for (const t of cortados) estorbos.meter(cajaDeLaObra(tramos[t] as TramoDeLaCiudad, lados), RADIO_DEL_GRAFO);
  const quedan: AristaDelGrafo[] = [];
  for (let i = 0; i < base.aristas.length; i++) {
    const a = base.aristas[i] as AristaDelGrafo;
    if (a.tramo !== null && cortados.includes(a.tramo)) {
      const p = base.nudos[a.a] as Punto;
      const q = base.nudos[a.b] as Punto;
      if (estorbos.tapa(p.x, p.z, q.x, q.z)) continue;
    }
    quedan.push(a);
  }
  return fijo({ nudos: base.nudos, aristas: fijo(quedan) });
}

/**
 * ¿SIRVEN ESTAS OBRAS? La ciudad sigue conexa (en el grueso: cada cruce se alcanza desde la Glorieta, que
 * basta, porque una obra nunca va en un tramo con una boca de callejón ni con una plaza), cada par de
 * plazas de un trío válido queda a `FALLOS_CON_CORTES_COMO_MUCHO` o menos por calles, y desde el nudo de
 * cada plaza queda alguna cabina en cada banda de la Llamada. Primero con el grueso, que nunca mide menos;
 * si el grueso no lo asegura, con el grafo de verdad de esa noche.
 *
 * Una cabina está en su banda seguro si lo menos que puede medir no baja de la banda y lo más no se pasa. Lo
 * menos es lo que mide por el grafo base (las obras sólo alargan). Lo más, eso mismo si ninguna obra cae en
 * un tramo de su camino (`desdeLasPlazas`), y si cae, lo que mide por el grueso (ningún camino de verdad es
 * más largo). Sólo si con eso no hay alguna en cada banda se pregunta al grafo de verdad de esa noche.
 */
function sirvenLasObras(g: GeometriaDeLaTraza, cortados: readonly number[]): boolean {
  const fuera = entradasCerradas(g.grueso, cortados);
  const desdeLaGlorieta = distanciasGruesas(g.grueso, fuera, LA_GLORIETA_DEL_RELOJERO);
  for (let k = 0; k < CRUCES + PLAZAS_POR_CIUDAD; k++) if ((desdeLaGlorieta[k] as number) < 0) return false;
  const gruesas = new Map<number, Float64Array>();
  const caminos = desdeLasPlazas(g);
  const dudosos: [number, number][] = [];
  for (const [a, b] of g.pares) {
    const base = (caminos.aLasPlazas[a - 1] as readonly CaminoALaCabina[])[b - 1] as CaminoALaCabina;
    let intacto = base.metros >= 0;
    for (const t of base.tramos) if (cortados.includes(t)) intacto = false;
    if (intacto && base.metros <= FALLOS_CON_CORTES_COMO_MUCHO) continue;
    let d = gruesas.get(a);
    if (d === undefined) {
      d = distanciasGruesas(g.grueso, fuera, a);
      gruesas.set(a, d);
    }
    if ((d[CRUCES + b - 1] as number) > FALLOS_CON_CORTES_COMO_MUCHO) dudosos.push([a, b]);
  }
  const sinSusCabinas: PlazaDeLaCiudad[] = [];
  for (const p of g.plazas) {
    const suyas = caminos.aLasCabinas[p.numero - 1] as readonly CaminoALaCabina[];
    let d: Float64Array | undefined = undefined;
    let cercana = false;
    let lejana = false;
    for (let k = 0; k < suyas.length && !(cercana && lejana); k++) {
      const camino = suyas[k] as CaminoALaCabina;
      if (camino.metros < 0) continue;
      let intacto = true;
      for (const t of camino.tramos) if (cortados.includes(t)) intacto = false;
      /* Lo menos, lo del grafo base (las obras sólo alargan); lo más, lo mismo si su camino no tiene obra, y si no, el grueso. */
      const menos = camino.metros;
      let mas = camino.metros;
      if (!intacto) {
        if (d === undefined) {
          d = gruesas.get(p.numero) ?? distanciasGruesas(g.grueso, fuera, p.numero);
          gruesas.set(p.numero, d);
        }
        const porElGrueso = d[NODOS_SIN_LAS_CABINAS + k] as number;
        mas = porElGrueso < 0 ? Number.POSITIVE_INFINITY : porElGrueso + (g.grueso.cabinas[k] as { readonly extra: number }).extra;
      }
      if (menos >= BANDA_DE_LA_CABINA_CERCANA[0] && mas <= BANDA_DE_LA_CABINA_CERCANA[1]) cercana = true;
      if (menos >= BANDA_DE_LA_CABINA_LEJANA[0] && mas <= BANDA_DE_LA_CABINA_LEJANA[1]) lejana = true;
    }
    if (!cercana || !lejana) sinSusCabinas.push(p);
  }
  if (dudosos.length === 0 && sinSusCabinas.length === 0) return true;
  const grafo = grafoSinLasObras(g.grafo, g.tramos, g.lados, cortados);
  for (const [a, b] of dudosos) {
    const campo = campoHasta(grafo, (g.plazas[a - 1] as PlazaDeLaCiudad).nudo);
    const m = campo.metros[(g.plazas[b - 1] as PlazaDeLaCiudad).nudo] as number;
    if (m < 0 || m > FALLOS_CON_CORTES_COMO_MUCHO) return false;
  }
  for (const p of sinSusCabinas) {
    const campo = campoHasta(grafo, p.nudo);
    let cercana = false;
    let lejana = false;
    for (const cabina of g.grueso.cabinas) {
      const m = campo.metros[cabina.nudo] as number;
      if (m < 0) continue;
      const metros = m + cabina.extra;
      if (metros >= BANDA_DE_LA_CABINA_CERCANA[0] && metros <= BANDA_DE_LA_CABINA_CERCANA[1]) cercana = true;
      if (metros >= BANDA_DE_LA_CABINA_LEJANA[0] && metros <= BANDA_DE_LA_CABINA_LEJANA[1]) lejana = true;
    }
    if (!cercana || !lejana) return false;
  }
  return true;
}

/**
 * LAS DOS BANDAS DE LA LLAMADA (§3.7), en metros por calles hasta el sitio de la cabina: la cercana y la
 * lejana. Desde el nudo de cada plaza hay siempre alguna cabina en cada una, también con las obras de la
 * noche (la noche no elige obras que lo rompan). Desde cualquier otro sitio, casi siempre: con 20 cabinas,
 * cuatro por distrito, no se encontró reparto que cubra cada canto (lo que se promete, en la cabecera de
 * `verify:quiebro-barrio`).
 */
export const BANDA_DE_LA_CABINA_CERCANA: readonly [number, number] = fijo([100, 160] as [number, number]);
export const BANDA_DE_LA_CABINA_LEJANA: readonly [number, number] = fijo([180, 260] as [number, number]);

function vestirLaNoche(ciudad: CiudadDeLaMesa, noche: number): VestidoDeLaNoche {
  const g = geometriaDe(ciudad);
  const clave = claveDeLaNoche(ciudad.codigo, noche);

  /* Las obras primero: donde hay obra no se aparca ni se pone quiosco. */
  const chO = chorroDeAzar(`${clave}#obras`);
  let cortados: number[] = [];
  for (let intento = 0; intento < INTENTOS_DE_OBRAS; intento++) {
    const cuantas = chO.entero(4, 6);
    const prueba = chO.barajados(g.cortables).slice(0, cuantas).sort((a, b) => a - b);
    if (sirvenLasObras(g, prueba)) {
      cortados = prueba;
      break;
    }
  }

  const cajas: CajaDeLaCiudad[] = ciudad.cajas.slice();
  const poner = (c: CajaDeLaCiudad): number => {
    cajas.push(c);
    return cajas.length - 1;
  };

  /* 6 · Lo de las calles: coches en un lado de cada tramo y, a veces, un quiosco de prensa en el otro. */
  const chC = chorroDeAzar(`${clave}#calles`);
  const amueblable = (l: LadoParaAmueblar): boolean => l.frente === 'edificio' || l.frente === 'callejon';
  for (const t of g.tramos) {
    if (t.daAPlaza || cortados.includes(t.indice)) continue;
    const lados = [g.lados[2 * t.indice] as LadoParaAmueblar, g.lados[2 * t.indice + 1] as LadoParaAmueblar] as const;
    const avenida = t.clase === 'avenida';
    const tirada = chC.entero(0, 9);
    const aparca = tirada < 4 ? 0 : tirada < 8 ? 1 : null;
    if (aparca !== null && amueblable(lados[aparca])) {
      const l = lados[aparca];
      const [b0, b1] = bocaDelCallejon(l.largo);
      const [d0, d1] = avenida ? D_COCHE_EN_LA_AVENIDA : BANDA_DE_COCHE;
      for (const a of l.largo === LADO_DEL_SOLAR ? SITIOS_DE_COCHE_EN_36 : SITIOS_DE_COCHE_EN_30) {
        if (!chC.sale(COCHES_POR_DISTRITO[l.distrito as IdDeDistrito])) continue;
        if (l.boca && a < b1 && a + LARGO_DE_COCHE > b0) continue;
        poner(nuevaCaja(enLaCalle(t.eje, l, l.s0 + a, l.s0 + a + LARGO_DE_COCHE, d0, d1), 'coche', 1.5, rumboALoLargo(t.eje, chC.sale(50) ? 1 : -1), null, false, l.hueco, 0));
      }
    }
    if (chC.sale(25)) {
      const lado = aparca === null ? (chC.entero(0, 1) as 0 | 1) : ((1 - aparca) as 0 | 1);
      const l = lados[lado];
      if (l.frente === 'edificio') {
        const a = chC.uno(sitiosDeQuiosco(l.largo));
        poner(nuevaCaja(enLaCalle(t.eje, l, l.s0 + a - 1.25, l.s0 + a + 1.25, D_QUIOSCO[0], D_QUIOSCO[1]), 'quiosco-de-prensa', 2.5, rumboDeTraves(t.eje, -l.hacia), null, false, l.hueco, 0));
      }
    }
  }

  /*
   * 7 · Lo variable de las plazas, de la 1 a la 6: cada grupo de su plantilla, y los coches de su acera.
   * Con el chorro de la MESA (`CÓDIGO#plazas`), no el de la noche: la plaza es la misma las diez noches.
   * Porque la plaza de la Bajada es donde la sala deja, al empezar la noche, a quien ya está dentro de su
   * límite (sólo recoloca a quien queda fuera): con un quiosco que cambiara de cuadrante, quien acabó la
   * noche de antes donde no había nada amanecía DENTRO de él y no se podía mover (revisión de la sala,
   * 8 de 36 cambios de noche). Nada más de la noche entra en el límite de una plaza —los tramos que dan a
   * una plaza no llevan ni coches, ni quioscos, ni obras—, así que la plaza entera no cambia de una noche
   * a otra de la mesa (sin despejar: «Plazas despejadas» sólo quita). `verify:quiebro-barrio` lo mira.
   */
  const chP = chorroDeAzar(`${ciudad.codigo}#plazas`);
  for (let p = 0; p < PLAZAS_POR_CIUDAD; p++) {
    const c = (g.plazas[p] as PlazaDeLaCiudad).centro;
    const hueco = (g.plazas[p] as PlazaDeLaCiudad).hueco;
    const girada = g.giradas[p] as PlantillaGirada;
    const grupos: { sitios: readonly CajaDePlantilla[]; minimo: number; maximo: number; coche: boolean }[] = [
      ...girada.variables.map((v) => ({ sitios: v.sitios, minimo: v.minimo, maximo: v.maximo, coche: false })),
      { sitios: girada.coches, minimo: COCHES_DE_LA_PLAZA_POR_NOCHE[0], maximo: COCHES_DE_LA_PLAZA_POR_NOCHE[1], coche: true },
    ];
    for (const grupo of grupos) {
      const cuantos = chP.entero(grupo.minimo, grupo.maximo);
      const indices: number[] = [];
      for (let k = 0; k < grupo.sitios.length; k++) indices.push(k);
      const elegidos = chP.barajados(indices).slice(0, cuantos).sort((a, b) => a - b);
      for (const k of elegidos) {
        const sitio = grupo.sitios[k] as CajaDePlantilla;
        const mira = grupo.coche && chP.sale(50) ? (sitio.mira + 128) % 256 : sitio.mira;
        poner(nuevaCaja(mas(sitio, c.x, c.z), sitio.tipo, sitio.alto, mira, null, sitio.despejable, hueco, p + 1));
      }
    }
  }

  /* 8 · Las obras, en orden de tramo. */
  const cortes: CorteDeObra[] = [];
  for (const k of cortados) {
    const t = g.tramos[k] as TramoDeLaCiudad;
    cortes.push(fijo({ tramo: k, caja: poner(nuevaCaja(cajaDeLaObra(t, g.lados), 'corte', 1.25, rumboALoLargo(t.eje, 1), null, false, null, 0)) }));
  }

  /* El tiempo, la hora, los semáforos y el tren, cada uno con su chorro. */
  const chT = chorroDeAzar(`${clave}#tiempo`);
  const tirada = chT.entero(0, 9);
  const tiempo: Tiempo = tirada < 5 ? 'llovizna' : tirada < 8 ? 'aguacero' : 'niebla';
  const hora = fijo({ h: chT.entero(1, 4), m: chT.entero(0, 59) });
  const chS = chorroDeAzar(`${clave}#semaforos`);
  const semaforos: number[] = [];
  for (let k = 0; k < CRUCES; k++) semaforos.push(chS.entero(0, TICS_DEL_SEMAFORO - 1));
  const chR = chorroDeAzar(`${clave}#tren`);
  const elevado = g.avenidas.find((a) => a.id === 'elevado') as AvenidaDeLaCiudad;
  const tren: TrenDeLaCiudad = fijo({
    eje: elevado.eje,
    linea: elevado.linea,
    desde: -BORDE_DE_LA_CIUDAD - SALIDA_DE_GLIFOS,
    hasta: BORDE_DE_LA_CIUDAD + SALIDA_DE_GLIFOS,
    alto: ALTO_DEL_VIADUCTO,
    largo: LARGO_DEL_TREN,
    desfaseTics: chR.entero(0, TICS_ENTRE_TRENES - 1),
    sentido: chR.sale(50) ? 1 : -1,
  });

  return fijo({
    noche,
    cajas: fijo(cajas),
    cajasDeLaMesa: ciudad.cajas.length,
    cortes: fijo(cortes),
    grafo: grafoSinLasObras(ciudad.grafo, g.tramos, g.lados, cortados),
    semaforos: fijo(semaforos),
    tren,
    tiempo,
    hora,
  });
}

/** Lo que mide el tren del Elevado: tres coches. */
export const LARGO_DEL_TREN = 36;


/* ─── Las plazas despejadas ───────────────────────────────────────────────── */

const DESPEJADAS = new WeakMap<NocheDeLaCiudad, NocheDeLaCiudad>();

function laNocheDespejada(noche: NocheDeLaCiudad): NocheDeLaCiudad {
  const hecha = DESPEJADAS.get(noche);
  if (hecha !== undefined) return hecha;
  const cajas: CajaDeLaCiudad[] = [];
  const nuevoIndice: number[] = [];
  for (let i = 0; i < noche.cajas.length; i++) {
    const c = noche.cajas[i] as CajaDeLaCiudad;
    const fuera = c.despejable && noche.fallos.includes(c.plaza);
    nuevoIndice.push(fuera ? -1 : cajas.length);
    if (!fuera) cajas.push(c);
  }
  const indice = (i: number): number => {
    const j = nuevoIndice[i];
    if (j === undefined || j < 0) throw new RangeError(`La caja ${String(i)} se despeja, y algo de la noche apunta a ella.`);
    return j;
  };
  const despejada: NocheDeLaCiudad = fijo({
    ...noche,
    plazasDespejadas: true,
    cajas: fijo(cajas),
    cortes: fijo(noche.cortes.map((c) => fijo({ tramo: c.tramo, caja: indice(c.caja) }))),
  });
  DESPEJADAS.set(noche, despejada);
  return despejada;
}

/* ─── El mundo de la Liza ─────────────────────────────────────────────────── */

/** Lo pisable: las 4.761 casillas de 8 m, las mismas en todas las noches y todas las ciudades. */
const PISABLES_DE_LA_CIUDAD: readonly Casilla[] = Object.freeze(
  ((): Casilla[] => {
    const salida: Casilla[] = [];
    for (let y = -CASILLAS_DEL_CENTRO_AL_BORDE; y <= CASILLAS_DEL_CENTRO_AL_BORDE; y++) {
      for (let x = -CASILLAS_DEL_CENTRO_AL_BORDE; x <= CASILLAS_DEL_CENTRO_AL_BORDE; x++) salida.push({ x, y });
    }
    return salida;
  })(),
);

/** Un rectángulo en Q16.16: exacto, porque toda medida de la ciudad es un múltiplo de 0,25 m. */
function enFijo(r: Rectangulo): { readonly x0: number; readonly z0: number; readonly x1: number; readonly z1: number } {
  return fijo({ x0: r.x0 * UNO, z0: r.z0 * UNO, x1: r.x1 * UNO, z1: r.z1 * UNO });
}

/**
 * Lo del mundo que no es de la noche: zonas, límites y nudos en Q16.16, y los sitios por Bajada. Sale sólo
 * de la TRAZA (zonas, plazas, refugios y grafo base son los de su geometría, los mismos objetos en todas sus
 * mesas), así que se guarda por el grafo base y vale para todas las mesas de la traza, con tal de que la
 * ciudad traiga esos mismos objetos (`deLaTraza`); una ciudad que no (una copia tocada) hace el suyo.
 */
interface MundoDeLaMesa {
  readonly zonas: readonly ZonaDelMundo[];
  readonly limites: readonly LimiteDelMundo[];
  readonly nudos: readonly { readonly x: number; readonly z: number }[];
  readonly nace: Map<number, readonly SitioDeNacer[]>;
  /** De qué se hizo: si una ciudad trae otros, no es el suyo. */
  readonly deLaTraza: Pick<CiudadDeLaMesa, 'zonas' | 'plazas' | 'refugios' | 'grafo'>;
}

const MUNDOS_DE_LA_TRAZA = new WeakMap<GrafoDeLaCiudad, MundoDeLaMesa>();
const MUNDOS_DE_UNA_COPIA = new WeakMap<CiudadDeLaMesa, MundoDeLaMesa>();
/** Los pares de cada arista del grafo base, en su orden (los de la noche son un trozo de ellos, en el mismo orden). */
const PARES = new WeakMap<readonly AristaDelGrafo[], readonly (readonly [number, number])[]>();
/** Los cuerpos de las cajas de la geometría de una traza, en su orden: una caja de la mesa con el mismo rectángulo usa el suyo. */
const CUERPOS = new WeakMap<readonly CajaDeLaCiudad[], readonly Cuerpo[]>();
const MUNDOS = new WeakMap<NocheDeLaCiudad, MundoDeLaLiza>();

function esDeLaTraza(m: MundoDeLaMesa, ciudad: CiudadDeLaMesa): boolean {
  const t = m.deLaTraza;
  return t.zonas === ciudad.zonas && t.plazas === ciudad.plazas && t.refugios === ciudad.refugios && t.grafo === ciudad.grafo;
}

function mundoDeLaMesa(ciudad: CiudadDeLaMesa): MundoDeLaMesa {
  const deLaTraza = MUNDOS_DE_LA_TRAZA.get(ciudad.grafo);
  if (deLaTraza !== undefined && esDeLaTraza(deLaTraza, ciudad)) return deLaTraza;
  const deLaCopia = MUNDOS_DE_UNA_COPIA.get(ciudad);
  if (deLaCopia !== undefined) return deLaCopia;
  const B = BORDE_DE_LA_CIUDAD;
  const m: MundoDeLaMesa = {
    zonas: fijo(ciudad.zonas.map((z) => fijo({ id: z.id, clase: z.clase, caja: enFijo(z.caja) }))),
    limites: fijo([fijo({ id: ID_DEL_LIMITE_DE_LA_CIUDAD, caja: enFijo({ x0: -B, z0: -B, x1: B, z1: B }) }), ...ciudad.plazas.map((p) => fijo({ id: idDelLimiteDePlaza(p.numero), caja: enFijo(p.limite) }))]),
    nudos: fijo(ciudad.grafo.nudos.map((n) => fijo({ x: n.x * UNO, z: n.z * UNO }))),
    nace: new Map(),
    deLaTraza: fijo({ zonas: ciudad.zonas, plazas: ciudad.plazas, refugios: ciudad.refugios, grafo: ciudad.grafo }),
  };
  if (deLaTraza === undefined) MUNDOS_DE_LA_TRAZA.set(ciudad.grafo, m);
  else MUNDOS_DE_UNA_COPIA.set(ciudad, m);
  return m;
}

/** El cuerpo de una caja: su rectángulo, sin más. */
function cuerpoDe(c: Rectangulo): Cuerpo {
  return fijo({ x0: c.x0, z0: c.z0, x1: c.x1, z1: c.z1 });
}

/**
 * Los cuerpos de las cajas de una noche. Los de la geometría de su traza se hacen una vez por traza, y una
 * caja con el mismo rectángulo que la de la geometría en su puesto usa ese cuerpo (lo de la mesa, en todas
 * sus mesas y noches: las cajas de la ciudad sólo cambian el alto y el edificio); lo demás, uno nuevo.
 */
function cuerposDeLaNoche(n: NocheDeLaCiudad): readonly Cuerpo[] {
  const g = geometriaDe(n.ciudad);
  let deLaTraza = CUERPOS.get(g.cajas);
  if (deLaTraza === undefined) {
    deLaTraza = fijo(g.cajas.map(cuerpoDe));
    CUERPOS.set(g.cajas, deLaTraza);
  }
  const base = deLaTraza;
  const cuerpos: Cuerpo[] = new Array<Cuerpo>(n.cajas.length);
  for (let i = 0; i < n.cajas.length; i++) {
    const c = n.cajas[i] as CajaDeLaCiudad;
    const b = i < base.length ? (base[i] as Cuerpo) : null;
    cuerpos[i] = b !== null && b.x0 === c.x0 && b.z0 === c.z0 && b.x1 === c.x1 && b.z1 === c.z1 ? b : cuerpoDe(c);
  }
  return fijo(cuerpos);
}

/**
 * Los pares de las aristas de una noche. Los del grafo base se hacen una vez por traza; el grafo de la noche
 * es el base sin las aristas de las obras, con los MISMOS objetos en el mismo orden (`grafoSinLasObras`), así
 * que se recorren los dos a la vez y cada arista que está en el base usa su par. Una que no (un grafo que no
 * sale de aquí), el suyo.
 */
function paresDeLaNoche(n: NocheDeLaCiudad): readonly (readonly [number, number])[] {
  const aristasBase = n.ciudad.grafo.aristas;
  let deLaBase = PARES.get(aristasBase);
  if (deLaBase === undefined) {
    deLaBase = fijo(aristasBase.map((a) => fijo([a.a, a.b] as const)));
    PARES.set(aristasBase, deLaBase);
  }
  if (n.grafo.aristas === aristasBase) return deLaBase;
  const base = deLaBase;
  const aristas = n.grafo.aristas;
  const pares: (readonly [number, number])[] = new Array<readonly [number, number]>(aristas.length);
  let j = 0;
  for (let i = 0; i < aristas.length; i++) {
    const a = aristas[i] as AristaDelGrafo;
    let k = j;
    while (k < aristasBase.length && aristasBase[k] !== a) k++;
    if (k < aristasBase.length) {
      pares[i] = base[k] as readonly [number, number];
      j = k + 1;
    } else {
      pares[i] = fijo([a.a, a.b] as const);
    }
  }
  return fijo(pares);
}

/** Los sitios de nacer con la Bajada en la plaza `bajada` (ver `mundoDeLaLizaDeLaCiudad`). */
/**
 * Los refugios por su distancia por calles (grafo base) a la plaza `bajada`, y a igual distancia el de
 * índice menor. Es de la traza y no de la mesa, así que se guarda en su geometría: un Dijkstra por Bajada y
 * por traza, no por mesa.
 */
function ordenDeLosRefugios(ciudad: CiudadDeLaMesa, bajada: number): readonly number[] {
  const g = geometriaDe(ciudad);
  const hecho = g.ordenDeLosRefugios.get(bajada);
  if (hecho !== undefined) return hecho;
  const campo = campoHasta(ciudad.grafo, (ciudad.plazas[bajada - 1] as PlazaDeLaCiudad).nudo);
  const metros = ciudad.refugios.map((r) => {
    const s = r.sitios[1] as SitioDelBarrio;
    const d = distanciaPorCalles(ciudad.grafo, campo, s.x, s.z);
    return d < 0 ? Number.POSITIVE_INFINITY : d;
  });
  const orden = fijo(ciudad.refugios.map((r) => r.indice).sort((a, b) => (metros[a] as number) - (metros[b] as number) || a - b));
  g.ordenDeLosRefugios.set(bajada, orden);
  return orden;
}

function sitiosDeNacer(ciudad: CiudadDeLaMesa, m: MundoDeLaMesa, bajada: number): readonly SitioDeNacer[] {
  const hechos = m.nace.get(bajada);
  if (hechos !== undefined) return hechos;
  const sitios: SitioDeNacer[] = [];
  const asiento = (p: PlazaDeLaCiudad): void => {
    for (const s of p.nace) sitios.push(fijo({ papel: 'asiento' as const, x: s.x * UNO, z: s.z * UNO, rumbo: s.rumbo }));
  };
  asiento(ciudad.plazas[bajada - 1] as PlazaDeLaCiudad);
  for (const p of ciudad.plazas) if (p.numero !== bajada) asiento(p);
  for (const k of ordenDeLosRefugios(ciudad, bajada)) {
    for (const s of (ciudad.refugios[k] as RefugioDeLaCiudad).sitios) sitios.push(fijo({ papel: 'reaparicion' as const, x: s.x * UNO, z: s.z * UNO, rumbo: s.rumbo }));
  }
  const listos = fijo(sitios);
  m.nace.set(bajada, listos);
  return listos;
}

function elMundoDeLaLiza(noche: NocheDeLaCiudad, despejadas: boolean): MundoDeLaLiza {
  const n = despejadas ? despejarLasPlazas(noche) : noche;
  const hecho = MUNDOS.get(n);
  if (hecho !== undefined) return hecho;
  const m = mundoDeLaMesa(n.ciudad);
  /* Los cuerpos y los pares de lo de la traza se hacen una vez por traza; los de la noche, una vez por noche. */
  const cuerpos = cuerposDeLaNoche(n);
  const pares = paresDeLaNoche(n);
  const bajada = n.fallos.length > 0 ? (n.fallos[0] as number) : LA_GLORIETA_DEL_RELOJERO;
  const clases: number[] = new Array<number>(cuerpos.length).fill(CLASE_DE_CAJA_ALTA);
  const mundo: MundoDeLaLiza = fijo({
    metrosPorUnidad: UNO,
    suelo: fijo({ lado: LADO_DE_CASILLA_DE_LA_CIUDAD, pisables: PISABLES_DE_LA_CIUDAD, vados: fijo([] as Casilla[]), cuerpos, nace: fijo([]) }),
    clasesDeCaja: fijo(clases),
    zonas: m.zonas,
    limites: m.limites,
    grafo: fijo({ nudos: m.nudos, aristas: pares }),
    nace: sitiosDeNacer(n.ciudad, m, bajada),
  });
  MUNDOS.set(n, mundo);
  return mundo;
}

/**
 * La clase `alta` de la Liza. Se escribe aquí y no se importa, como en el barrio, para no cargar la
 * declaración entera de la Liza; `verify:quiebro-barrio` la compara con `CLASE_DE_CAJA.alta`.
 */
const CLASE_DE_CAJA_ALTA = 1;
