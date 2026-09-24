/**
 * LAS CUATRO TRAZAS DIBUJADAS DE LA CIUDAD DE «EL QUIEBRO» (`docs/quiebro/CIUDAD-ABIERTA.md` §2.6). Son
 * DATOS: ni una cuenta, ni un sorteo. Con las ocho simetrías del cuadrado dan las 32 trazas (`traza =
 * dibujo · 8 + simetria`); la simetría la aplica `quiebro-ciudad.ts` (`trazaOrientada`), que es donde
 * viven las ocho y sus inversas, para que no haya dos definiciones de «girar».
 *
 * ═══ POR QUÉ DIBUJADAS Y NO GENERADAS ═══
 *
 * Porque el Casco, con sus pasajes y su Plaza Mayor, se diseña como se diseña una plaza, y porque un
 * conjunto finito se comprueba ENTERO: `verify:quiebro-barrio` mira las 32 trazas en diez noches cada una,
 * no una muestra. Lo que no es de la traza —alturas, fachadas, coches, obras— sale del código de la mesa y
 * de la noche.
 *
 * ═══ CÓMO SE LEE UNA TRAZA ═══
 *
 * En la orientación dibujada (simetría 0): `x` al este, `z` al sur, el Elevado por `z = −120` y el Bulevar
 * por `x = 120` del Elevado al canto sur. Los mapas van en 11 filas de 11 caracteres, de norte (`j = −5`) a
 * sur, y cada fila de oeste (`i = −5`) a este:
 *
 *   · `huecos`: `.` una manzana maciza; `1`-`6` la plaza de ese número (la 1, la Glorieta del Relojero, en
 *     el centro); `|` una manzana partida por un callejón que CORRE por `z` (norte-sur); `-` uno que corre
 *     por `x` (este-oeste).
 *   · `soportales`: un dígito hexadecimal por hueco con las caras de su manzana que llevan soportal: 1
 *     norte, 2 este, 4 sur, 8 oeste (`0` ninguna).
 *
 * Las reglas del dibujo, que `verify:quiebro-barrio` exige en las cuatro (§2.2-§2.5):
 *
 *   · seis plazas: la 1 (Glorieta) en (0, 0) y otra en el Casco (la Plaza Mayor), y una en cada distrito de
 *     fuera; ninguna en el anillo de fuera (sus bocas saldrían de la ciudad) ni junto a una avenida (ahí el
 *     hueco mide 30 m y una plantilla mide 36); ninguna a menos de dos manzanas de otra;
 *   · para cada plaza como Bajada, al menos un trío de Fallos (§3.3) con la tabla `distancias`;
 *   · callejones: los del §2.4 por distrito (unos 8 en el Casco, 6 en la Lonja, 6 en las Naves y 3 en el
 *     Ensanche), nunca en una plaza, y nunca partiendo 30 m: junto al Elevado corren por `z`, junto al
 *     Bulevar por `x`;
 *   · soportales en los porcentajes de su distrito (10, 20 y 25 %; ninguno en las Naves ni en las Torres),
 *     nunca en la cara por la que sale un callejón;
 *   · 20 cabinas candidatas (4 por distrito) y 10 refugios (2 por distrito), en la acera de una manzana y
 *     nunca en un tramo que dé a una plaza, en los sitios de poste de su cara (a 12 o 24 m de su esquina en
 *     una cara de 36; a 12 o 18 en una de 30); y desde cualquier nudo, alguna cabina a 100-160 m por calles
 *     y alguna a 180-260 (§3.7).
 *
 * `distancias` es la tabla de §2.6: los metros por calles entre los nudos de las seis plazas con el grafo
 * base. No cambia con la simetría (las ocho conservan los metros por los ejes), así que es un dato de la
 * traza dibujada; el comprobador la contrasta con el grafo en las 32.
 *
 * `nombres`: el índice de cada plaza en la lista de plazas de `quiebro-nombres.ts` (el 0, la Glorieta del
 * Relojero; se piden 16 como mínimo).
 */
import type { Cara } from './quiebro-barrio';
import type { IdDePlantilla } from './quiebro-ciudad';

/** Un poste de la traza dibujada: la cara `cara` de la manzana del hueco (`i`, `j`), a `a` metros de su esquina de menor coordenada. */
export type PosteDibujado = readonly [number, number, Cara, number];

/** UNA TRAZA DIBUJADA. Ver la cabecera. */
export interface TrazaDibujada {
  readonly huecos: readonly string[];
  readonly soportales: readonly string[];
  /** La plantilla de cada plaza, de la 1 a la 6. */
  readonly plantillas: readonly IdDePlantilla[];
  /** El nombre de cada plaza, de la 1 a la 6: índices de la lista de plazas de `quiebro-nombres.ts`. */
  readonly nombres: readonly number[];
  readonly cabinas: readonly PosteDibujado[];
  readonly refugios: readonly PosteDibujado[];
  /** 6 × 6, en metros por calles, entre los nudos de las plazas (la fila `p − 1` es la plaza `p`). */
  readonly distancias: readonly (readonly number[])[];
}

/* ─── Las cuatro trazas ───────────────────────────────────────────────────── */

/*
 * Cada una con su carácter: la 0 sube las Naves hasta el centro y abre la Lonja por su esquina; la 1 baja
 * la Plaza Mayor al sureste del Casco, junto al camino de las Torres; la 2 junta la Plaza Mayor con la
 * Glorieta y reparte seis tríos; la 3 se lleva las Naves al este, bajo el Bulevar. Las distancias, los
 * tríos y la cobertura de las cabinas los mira `verify:quiebro-barrio`; los soportales y los postes se
 * sacaron con el tablero de dibujo del frente (`scratchpad/ciudad-traza/banco/disenar.mts`) y se escriben
 * aquí como datos: quien cambie un callejón vuelve a sacarlos allí, y el comprobador dice si no.
 */

const TRAZA_0: TrazaDibujada = {
  huecos: ['-.||...-.|.', '.4...3..-..', '....|.....|', '....|.|....', '|..2...-...', '..-.-1-....', '-..-.|...6.', '.|...|.....', '......5....', '.|..-......', '.......-...'],
  soportales: ['46800000000', '20900000000', '41200000000', '24100000000', '24800440000', '12420008000', '12403080000', '28110080000', '12458204000', '28124181000', '00100201000'],
  plantillas: ['glorieta', 'porticada', 'patio', 'porticada', 'glorieta', 'glorieta'],
  nombres: [0, 1, 2, 3, 4, 5],
  cabinas: [[-1, 0, 'oeste', 12], [-2, 2, 'sur', 12], [-2, 0, 'oeste', 12], [0, -2, 'oeste', 12], [-4, 5, 'norte', 24], [2, 5, 'norte', 18], [-2, 5, 'norte', 24], [0, 4, 'este', 24], [-5, -2, 'norte', 24], [-5, -4, 'sur', 24], [-5, -1, 'sur', 24], [-3, -3, 'este', 12], [2, -4, 'norte', 24], [3, -3, 'sur', 24], [4, -4, 'oeste', 12], [-1, -4, 'sur', 24], [3, 2, 'sur', 18], [3, 0, 'este', 12], [3, -1, 'norte', 18], [3, 4, 'este', 24]],
  refugios: [[-2, 0, 'este', 12], [1, 0, 'este', 24], [-4, 4, 'este', 12], [0, 4, 'este', 12], [-4, -5, 'este', 24], [-5, 0, 'este', 12], [-1, -5, 'sur', 24], [3, -4, 'este', 24], [4, -1, 'sur', 12], [4, 3, 'sur', 12]],
  distancias: [[0, 144, 240, 384, 192, 240], [144, 0, 240, 240, 336, 384], [240, 240, 0, 232, 384, 432], [384, 240, 232, 0, 576, 624], [192, 336, 384, 576, 0, 240], [240, 384, 432, 624, 240, 0]],
};

const TRAZA_1: TrazaDibujada = {
  huecos: ['.|.-..|...-', '-...3...|..', '..|..|...|.', '....|......', '..4...-....', '|..-.1|....', '.-..-..-...', '..-|.|2....', '..|......6.', '.....5-....', '....-......'],
  soportales: ['00100000000', '10000000000', '2D200000000', 'C3402400000', '04004240000', '20C10000000', '84100000000', '1B000000000', '40034010000', '21980018000', '00205044000'],
  plantillas: ['glorieta', 'porticada', 'patio', 'porticada', 'glorieta', 'glorieta'],
  nombres: [0, 6, 7, 8, 9, 10],
  cabinas: [[2, 2, 'este', 12], [-2, 1, 'este', 12], [0, -2, 'oeste', 12], [2, -2, 'este', 12], [-2, 5, 'sur', 12], [1, 4, 'sur', 12], [-4, 3, 'este', 24], [-1, 3, 'oeste', 12], [-4, 1, 'este', 24], [-4, -3, 'norte', 24], [-3, -2, 'este', 18], [-5, 2, 'oeste', 12], [0, -3, 'norte', 12], [-2, -4, 'sur', 12], [4, -4, 'sur', 24], [2, -3, 'norte', 24], [5, -2, 'oeste', 18], [3, 4, 'oeste', 12], [3, 4, 'este', 24], [3, 1, 'este', 24]],
  refugios: [[-2, 0, 'este', 12], [1, 0, 'este', 24], [-4, 3, 'sur', 24], [1, 5, 'norte', 12], [-5, -4, 'este', 24], [-4, 0, 'sur', 12], [-2, -5, 'este', 24], [3, -4, 'este', 24], [4, -1, 'sur', 12], [4, 4, 'este', 12]],
  distancias: [[0, 144, 240, 192, 240, 336], [144, 0, 384, 336, 144, 192], [240, 384, 0, 240, 432, 576], [192, 336, 240, 0, 384, 528], [240, 144, 432, 384, 0, 240], [336, 192, 576, 528, 240, 0]],
};

const TRAZA_2: TrazaDibujada = {
  huecos: ['|......|..|', '..-.3.-..-.', '...|....|..', '.|...|.....', '..4.-.2-...', '-..|.1-....', '..|.|.-..6.', '.-.-.......', '.-....5....', '...|.......', '.....-.....'],
  soportales: ['02000000000', '15100000000', '10400000000', '20A60200000', '60000001000', '00904042000', '40800200000', '41610000000', '00904808000', '31203480000', 'C20A8180000'],
  plantillas: ['glorieta', 'porticada', 'patio', 'porticada', 'glorieta', 'glorieta'],
  nombres: [0, 11, 12, 13, 14, 15],
  cabinas: [[2, 2, 'este', 24], [1, -2, 'norte', 12], [2, 0, 'este', 12], [-1, 2, 'este', 12], [0, 4, 'oeste', 24], [-3, 3, 'sur', 12], [-4, 3, 'oeste', 24], [-2, 4, 'este', 12], [-4, 1, 'oeste', 12], [-3, 1, 'norte', 12], [-4, -2, 'este', 12], [-3, -4, 'oeste', 24], [4, -4, 'sur', 24], [2, -3, 'este', 12], [-2, -3, 'este', 12], [1, -4, 'oeste', 24], [4, 3, 'este', 24], [3, 4, 'oeste', 12], [5, 0, 'sur', 24], [5, -2, 'oeste', 18]],
  refugios: [[-2, 0, 'este', 12], [1, 0, 'este', 12], [-4, 4, 'este', 12], [0, 4, 'este', 12], [-4, -5, 'sur', 24], [-5, 0, 'este', 12], [-2, -5, 'este', 24], [3, -4, 'este', 24], [4, -1, 'sur', 12], [4, 3, 'sur', 12]],
  distancias: [[0, 96, 240, 192, 192, 240], [96, 0, 240, 232, 240, 240], [240, 240, 0, 240, 432, 480], [192, 232, 240, 0, 384, 432], [192, 240, 432, 384, 0, 240], [240, 240, 480, 432, 240, 0]],
};

const TRAZA_3: TrazaDibujada = {
  huecos: ['.-...|...|.', '..|-...-3..', '|.....|...|', '..|..|.....', '...-|.2....', '.-..-1.-.6.', '..4..|-....', '|..|.......', '....5......', '.|....-....', '...-.......'],
  soportales: ['01D00000000', '08A00000000', '01300000000', '43020005000', '06100508000', '00400040000', '0C002800000', '06700040000', '80000D4A000', '101A0A09000', '00201880000'],
  plantillas: ['glorieta', 'porticada', 'patio', 'porticada', 'glorieta', 'glorieta'],
  nombres: [0, 1, 12, 3, 9, 5],
  cabinas: [[1, 1, 'este', 24], [0, -2, 'este', 18], [-2, -2, 'oeste', 18], [-2, 2, 'sur', 12], [1, 3, 'sur', 12], [-3, 4, 'sur', 12], [0, 5, 'sur', 12], [-4, 3, 'norte', 24], [-4, -1, 'oeste', 12], [-3, 0, 'este', 12], [-3, -3, 'norte', 24], [-4, -3, 'oeste', 12], [1, -5, 'sur', 12], [2, -5, 'sur', 24], [2, -3, 'sur', 12], [4, -4, 'sur', 24], [4, -1, 'este', 12], [3, 5, 'norte', 18], [4, 1, 'sur', 12], [4, 3, 'norte', 12]],
  refugios: [[-2, 0, 'este', 12], [1, 0, 'este', 12], [-4, 4, 'este', 12], [0, 4, 'este', 12], [-4, -5, 'sur', 24], [-5, 0, 'este', 12], [4, -5, 'sur', 12], [-1, -4, 'este', 24], [4, -1, 'este', 24], [4, 3, 'sur', 12]],
  distancias: [[0, 96, 336, 192, 192, 232], [96, 0, 240, 288, 288, 192], [336, 240, 0, 528, 528, 240], [192, 288, 528, 0, 192, 384], [192, 288, 528, 192, 0, 384], [232, 192, 240, 384, 384, 0]],
};

/** LAS CUATRO TRAZAS DIBUJADAS, por su número (`dibujo`, de 0 a 3). */
export const TRAZAS_DE_LA_CIUDAD: readonly TrazaDibujada[] = [TRAZA_0, TRAZA_1, TRAZA_2, TRAZA_3];
