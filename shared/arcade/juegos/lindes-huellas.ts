/**
 * LAS HUELLAS DE LO QUE ESTORBA EN LAS LINDES — TABLA GENERADA: NO SE EDITA A MANO.
 *
 *   npx tsx escenas/scripts/medir-huellas-de-las-lindes.ts
 *
 * Es la caja en planta de cada modelo de `tablero.glb` que estorba al andar, medida por debajo
 * de la cabeza de una persona, con el origen donde el reparto pone la pieza y en unidades del
 * pack; y, de cada uno, su alto —con el que se decide si una piedra pasa de la cintura— y el
 * radio de su planta —con el que se cubre lo que va girado de cualquier manera—. Cómo se mide y
 * por qué así está en la cabecera del guion que la escribe; quién estorba y quién no, en
 * `comoEstorba` (`lindes-piezas.ts`); y cómo se convierte en una caja del mundo —escala, largo,
 * giro—, en `lindes-mundo.ts`.
 *
 * Es literal porque la usa `shared/`, que corre en el servidor y en Hermes y no abre un `.glb`.
 * `verify:lindes-mundo` la vuelve a medir y exige los mismos números: si se recompila el pack,
 * se pone rojo ahí, y se arregla volviendo a correr el guion, no tocando esto.
 */

/** Una caja en planta, en unidades del pack. `x0 < x1`, `z0 < z1`. */
export interface HuellaDelModelo {
  readonly x0: number;
  readonly x1: number;
  readonly z0: number;
  readonly z1: number;
}

/** Hasta qué altura del modelo se midió: una persona a la escala de una torre. */
export const ALTURA_DE_LA_HUELLA_EN_PACK = 0.3321428571428572;

/** La huella de cada pieza que estorba. */
export const HUELLA_DEL_MODELO: Readonly<Record<string, HuellaDelModelo>> = {
  'almiar': { x0: -0.2, x1: 0.2, z0: -0.108, z1: 0.108 },
  'arbol-a': { x0: -0.2876, x1: 0.2865, z0: -0.3018, z1: 0.2453 },
  'arbol-b': { x0: -0.3425, x1: 0.3425, z0: -0.3601, z1: 0.3601 },
  'arboleda-grande': { x0: -0.9685, x1: 0.9768, z0: -0.9915, z1: 0.9752 },
  'arboleda-media': { x0: -0.8615, x1: 0.89, z0: -0.8732, z1: 0.9412 },
  'arboleda-pequena': { x0: -0.7605, x1: 0.6659, z0: -0.7306, z1: 0.7045 },
  'atalaya': { x0: -0.4649, x1: 0.4649, z0: -0.5, z1: 0.58 },
  'casa': { x0: -0.4388, x1: 0.4362, z0: -0.5387, z1: 0.56 },
  'colina-a': { x0: -0.5188, x1: 0.5912, z0: -0.4017, z1: 0.4077 },
  'concejo': { x0: -0.7188, x1: 0.7162, z0: -0.7837, z1: 0.78 },
  'cuadras': { x0: -0.9173, x1: 0.9414, z0: -1.0805, z1: 1.0513 },
  'ermita': { x0: -0.573, x1: 0.5815, z0: -1.0455, z1: 0.2518 },
  'herreria': { x0: -0.6301, x1: 0.6576, z0: -0.56, z1: 0.6852 },
  'iglesia': { x0: -0.5145, x1: 0.5145, z0: -0.5593, z1: 0.56 },
  'mercado': { x0: -0.9014, x1: 0.898, z0: -0.715, z1: 0.6007 },
  'molino': { x0: -0.5579, x1: 0.5679, z0: -0.379, z1: 0.415 },
  'muro': { x0: -1, x1: 1, z0: -0.3, z1: 0.4 },
  'muro-puerta': { x0: -1, x1: 1, z0: -0.4, z1: 0.4 },
  'piedra': { x0: -0.2106, x1: 0.2106, z0: -0.1771, z1: 0.1808 },
  'roca-a': { x0: -0.1492, x1: 0.1492, z0: -0.1568, z1: 0.1269 },
  'roca-b': { x0: -0.142, x1: 0.1447, z0: -0.1281, z1: 0.1218 },
  'roca-c': { x0: -0.1853, x1: 0.1587, z0: -0.1821, z1: 0.1622 },
  'roca-d': { x0: -0.142, x1: 0.1447, z0: -0.1298, z1: 0.1201 },
  'roca-e': { x0: -0.2554, x1: 0.2328, z0: -0.1849, z1: 0.1628 },
  'taberna': { x0: -0.4987, x1: 0.5768, z0: -0.7024, z1: 0.6301 },
  'taller': { x0: -0.8364, x1: 0.8291, z0: -0.8811, z1: 0.7862 },
  'tocon': { x0: -0.0849, x1: 0.0848, z0: -0.0891, z1: 0.0727 },
  'vigia': { x0: -0.5156, x1: 0.5156, z0: -0.5156, z1: 0.5156 },
};

/** El alto de un modelo y el radio de su planta, en unidades del pack. */
export interface AltoYRadioDelModelo {
  /** Lo más alto de su geometría, desde el suelo donde se apoya. */
  readonly alto: number;
  /** Lo más lejos del sitio donde se pone que llega su planta: lo que ocupa girado de cualquier manera. */
  readonly radio: number;
}

/**
 * De todo lo que estorba, con los mismos nombres que la huella. El alto lo usan las piedras, las
 * rocas y los tocones, que estorban sólo si pasan de la cintura; el radio, todo lo que el reparto
 * pone girado a un ángulo que no es un cuarto de vuelta.
 */
export const ALTO_Y_RADIO_DEL_MODELO: Readonly<Record<string, AltoYRadioDelModelo>> = {
  'almiar': { alto: 0.1787, radio: 0.2155 },
  'arbol-a': { alto: 1.0939, radio: 0.3019 },
  'arbol-b': { alto: 1.1127, radio: 0.3601 },
  'arboleda-grande': { alto: 0.9132, radio: 1.1048 },
  'arboleda-media': { alto: 1.2749, radio: 0.9694 },
  'arboleda-pequena': { alto: 1.0885, radio: 0.7912 },
  'atalaya': { alto: 2.4854, radio: 0.6053 },
  'casa': { alto: 1.2801, radio: 0.6262 },
  'colina-a': { alto: 0.3073, radio: 0.5936 },
  'concejo': { alto: 1.8862, radio: 0.9656 },
  'cuadras': { alto: 0.61, radio: 1.0805 },
  'ermita': { alto: 0.8532, radio: 1.0651 },
  'herreria': { alto: 0.9801, radio: 0.738 },
  'iglesia': { alto: 1.6451, radio: 0.694 },
  'mercado': { alto: 0.9761, radio: 1.0573 },
  'molino': { alto: 1.4579, radio: 0.5916 },
  'muro': { alto: 1.1, radio: 1.0441 },
  'muro-puerta': { alto: 1.3641, radio: 1.0441 },
  'piedra': { alto: 0.28, radio: 0.2655 },
  'roca-a': { alto: 0.0694, radio: 0.1568 },
  'roca-b': { alto: 0.1346, radio: 0.1569 },
  'roca-c': { alto: 0.1947, radio: 0.1869 },
  'roca-d': { alto: 0.163, radio: 0.1556 },
  'roca-e': { alto: 0.1947, radio: 0.2596 },
  'taberna': { alto: 1.3967, radio: 0.768 },
  'taller': { alto: 1.144, radio: 0.9911 },
  'tocon': { alto: 0.2277, radio: 0.0894 },
  'vigia': { alto: 1.1096, radio: 0.5901 },
};

/**
 * El hueco de `muro-puerta`, a lo largo del muro —la `x` del modelo—: por aquí se cruza. Lo de
 * los dos lados es muro y estorba.
 */
export const HUECO_DE_LA_PUERTA: { readonly x0: number; readonly x1: number } = {
  x0: -0.5,
  x1: 0.5,
};
