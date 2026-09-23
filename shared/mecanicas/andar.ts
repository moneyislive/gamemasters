/**
 * ANDAR POR TICS: el paso que dan igual el aparato, el servidor y el comprobador.
 *
 * ═══ POR QUÉ UN PASO POR TIC Y NO UN PASO POR FOTOGRAMA ═══
 *
 * El paseante de Las Lindes daba un paso por fotograma con el `dt` que tocara, en coma flotante
 * y con el seno del rumbo. Para pasear a solas vale; para que el servidor diga dónde está cada
 * uno en Boots on Board, no: el servidor no pinta fotogramas, y un paso que depende de cuánto
 * tardó el fotograma no se puede repetir en otra máquina. Así que se anda POR TICS —veinte por
 * segundo, todos igual de largos— y lo que se pinta entre tic y tic es interpolación, que no
 * decide nada.
 *
 * ═══ POR QUÉ UNA TABLA DE RUMBOS ESCRITA A MANO ═══
 *
 * Porque el seno no es igual en todos los motores: medido en esta casa, `Math.sin` difiere de un
 * motor a otro en el último bit un 2,2 % de las veces, y `verify:pureza` lo prohíbe en
 * `shared/`. Un rumbo es un número de 0 a 255 —1,4 grados cada uno, menos de lo que se nota
 * andando— y su dirección sale de dos tablas LITERALES en Q16.16. Se escribieron una vez con
 * `Math.round(Math.sin(2πi/256) · 65536)` y se pegaron; `verify:mundo` comprueba que siguen
 * diciendo eso. Si alguien las regenerara en tiempo de carga con un bucle de `Math.sin`, el
 * problema volvería entero y escondido en una línea que parece inicialización.
 *
 * El convenio es el del paseante de siempre: el rumbo 0 es el norte —la `z` negativa— y crece
 * hacia el este. La dirección de un rumbo es (SENO[r], −COSENO[r]).
 *
 * ═══ QUÉ NO ESTÁ AQUÍ ═══
 *
 * Ni la cámara, ni la marioneta, ni cómo se interpola: eso es presentación y vive en `escenas/`.
 * Ni cómo valida el servidor lo que le cuentan: eso es suyo. Aquí sólo está el paso, porque es
 * lo único que tiene que dar exactamente lo mismo en todas partes.
 */
import { por } from './fijo';
import { unPaso } from './mundo';
import type { Andante, Arena } from './mundo';

/** Cuántos rumbos distintos hay. Una vuelta entera. */
export const RUMBOS = 256;

/** Cuántos tics de paseo hay por segundo. */
export const TICS_POR_SEGUNDO = 20;

/** Lo que dura un tic, en Q16.16: 65.536 / 20 = 3.276,8, redondeado. */
export const DT_DEL_TIC = 3277;

/** A qué velocidad se anda, en unidades del mundo por segundo y en Q16.16: 12 u/s. */
export const VELOCIDAD_ANDANDO = 786432;

/** Y corriendo: 26,4 u/s (12 × 2,2, lo mismo que tenía el paseante de Las Lindes). */
export const VELOCIDAD_CORRIENDO = 1730150;

/**
 * El radio de quien anda, en Q16.16: 0,4 unidades. Una persona mide 2,543 de alto en esta casa
 * (`ALTURA_DE_UNA_PERSONA`), y 0,8 de hombro a hombro es lo que deja pasar entre dos almiares sin
 * que parezca que se atraviesan.
 */
export const RADIO_DEL_PASEANTE = 26214;

/** Cómo se mueve alguien en un tic. */
export type Marcha = 0 | 1 | 2;
export const QUIETO = 0;
export const ANDANDO = 1;
export const CORRIENDO = 2;

/** SENO[r] = round(sin(2πr/256) · 65536). Literal: ver la cabecera. */
export const SENO: readonly number[] = [
  0, 1608, 3216, 4821, 6424, 8022, 9616, 11204,
  12785, 14359, 15924, 17479, 19024, 20557, 22078, 23586,
  25080, 26558, 28020, 29466, 30893, 32303, 33692, 35062,
  36410, 37736, 39040, 40320, 41576, 42806, 44011, 45190,
  46341, 47464, 48559, 49624, 50660, 51665, 52639, 53581,
  54491, 55368, 56212, 57022, 57798, 58538, 59244, 59914,
  60547, 61145, 61705, 62228, 62714, 63162, 63572, 63944,
  64277, 64571, 64827, 65043, 65220, 65358, 65457, 65516,
  65536, 65516, 65457, 65358, 65220, 65043, 64827, 64571,
  64277, 63944, 63572, 63162, 62714, 62228, 61705, 61145,
  60547, 59914, 59244, 58538, 57798, 57022, 56212, 55368,
  54491, 53581, 52639, 51665, 50660, 49624, 48559, 47464,
  46341, 45190, 44011, 42806, 41576, 40320, 39040, 37736,
  36410, 35062, 33692, 32303, 30893, 29466, 28020, 26558,
  25080, 23586, 22078, 20557, 19024, 17479, 15924, 14359,
  12785, 11204, 9616, 8022, 6424, 4821, 3216, 1608,
  0, -1608, -3216, -4821, -6424, -8022, -9616, -11204,
  -12785, -14359, -15924, -17479, -19024, -20557, -22078, -23586,
  -25080, -26558, -28020, -29466, -30893, -32303, -33692, -35062,
  -36410, -37736, -39040, -40320, -41576, -42806, -44011, -45190,
  -46341, -47464, -48559, -49624, -50660, -51665, -52639, -53581,
  -54491, -55368, -56212, -57022, -57798, -58538, -59244, -59914,
  -60547, -61145, -61705, -62228, -62714, -63162, -63572, -63944,
  -64277, -64571, -64827, -65043, -65220, -65358, -65457, -65516,
  -65536, -65516, -65457, -65358, -65220, -65043, -64827, -64571,
  -64277, -63944, -63572, -63162, -62714, -62228, -61705, -61145,
  -60547, -59914, -59244, -58538, -57798, -57022, -56212, -55368,
  -54491, -53581, -52639, -51665, -50660, -49624, -48559, -47464,
  -46341, -45190, -44011, -42806, -41576, -40320, -39040, -37736,
  -36410, -35062, -33692, -32303, -30893, -29466, -28020, -26558,
  -25080, -23586, -22078, -20557, -19024, -17479, -15924, -14359,
  -12785, -11204, -9616, -8022, -6424, -4821, -3216, -1608,
];

/** COSENO[r] = round(cos(2πr/256) · 65536). Literal: ver la cabecera. */
export const COSENO: readonly number[] = [
  65536, 65516, 65457, 65358, 65220, 65043, 64827, 64571,
  64277, 63944, 63572, 63162, 62714, 62228, 61705, 61145,
  60547, 59914, 59244, 58538, 57798, 57022, 56212, 55368,
  54491, 53581, 52639, 51665, 50660, 49624, 48559, 47464,
  46341, 45190, 44011, 42806, 41576, 40320, 39040, 37736,
  36410, 35062, 33692, 32303, 30893, 29466, 28020, 26558,
  25080, 23586, 22078, 20557, 19024, 17479, 15924, 14359,
  12785, 11204, 9616, 8022, 6424, 4821, 3216, 1608,
  0, -1608, -3216, -4821, -6424, -8022, -9616, -11204,
  -12785, -14359, -15924, -17479, -19024, -20557, -22078, -23586,
  -25080, -26558, -28020, -29466, -30893, -32303, -33692, -35062,
  -36410, -37736, -39040, -40320, -41576, -42806, -44011, -45190,
  -46341, -47464, -48559, -49624, -50660, -51665, -52639, -53581,
  -54491, -55368, -56212, -57022, -57798, -58538, -59244, -59914,
  -60547, -61145, -61705, -62228, -62714, -63162, -63572, -63944,
  -64277, -64571, -64827, -65043, -65220, -65358, -65457, -65516,
  -65536, -65516, -65457, -65358, -65220, -65043, -64827, -64571,
  -64277, -63944, -63572, -63162, -62714, -62228, -61705, -61145,
  -60547, -59914, -59244, -58538, -57798, -57022, -56212, -55368,
  -54491, -53581, -52639, -51665, -50660, -49624, -48559, -47464,
  -46341, -45190, -44011, -42806, -41576, -40320, -39040, -37736,
  -36410, -35062, -33692, -32303, -30893, -29466, -28020, -26558,
  -25080, -23586, -22078, -20557, -19024, -17479, -15924, -14359,
  -12785, -11204, -9616, -8022, -6424, -4821, -3216, -1608,
  0, 1608, 3216, 4821, 6424, 8022, 9616, 11204,
  12785, 14359, 15924, 17479, 19024, 20557, 22078, 23586,
  25080, 26558, 28020, 29466, 30893, 32303, 33692, 35062,
  36410, 37736, 39040, 40320, 41576, 42806, 44011, 45190,
  46341, 47464, 48559, 49624, 50660, 51665, 52639, 53581,
  54491, 55368, 56212, 57022, 57798, 58538, 59244, 59914,
  60547, 61145, 61705, 62228, 62714, 63162, 63572, 63944,
  64277, 64571, 64827, 65043, 65220, 65358, 65457, 65516,
];

/**
 * Un rumbo cualquiera llevado a 0..255. Enteros de verdad: un rumbo con decimales no es un
 * rumbo, y se trunca hacia abajo antes de dar la vuelta.
 */
export function rumboValido(r: number): number {
  const entero = Math.floor(r);
  return ((entero % RUMBOS) + RUMBOS) % RUMBOS;
}

/**
 * De radianes a rumbo. Sólo para quien MANDA el paso —el aparato, al leer las teclas o la
 * palanca—: el ángulo que entra ya viene de una cámara en coma flotante, así que esto no se usa
 * en ningún sitio que arbitre. Lo que viaja y se arbitra es el entero que sale.
 */
export function rumboDeRadianes(radianes: number): number {
  return rumboValido(Math.round((radianes / (Math.PI * 2)) * RUMBOS));
}

/** De rumbo a radianes, para PINTAR: lo que sale de aquí no vuelve a entrar. */
export function radianesDelRumbo(r: number): number {
  return (rumboValido(r) / RUMBOS) * Math.PI * 2;
}

/**
 * UN TIC DE PASEO. La misma función en el aparato, en el servidor y en el comprobador.
 *
 * Todo entero: la velocidad por la dirección con `por`, y el paso con `unPaso` de `mundo.ts`,
 * que ya sabe resbalar contra lo que estorba y frenar en el vado.
 */
export function pasoDelTic(
  arena: Arena,
  quien: Andante,
  rumbo: number,
  marcha: Marcha,
  radio: number = RADIO_DEL_PASEANTE,
): Andante {
  if (marcha === QUIETO) return quien;
  const r = rumboValido(rumbo);
  const v = marcha === CORRIENDO ? VELOCIDAD_CORRIENDO : VELOCIDAD_ANDANDO;
  const vx = por(v, SENO[r] as number);
  const vz = -por(v, COSENO[r] as number);
  return unPaso(arena, quien, vx, vz, DT_DEL_TIC, radio);
}
