/**
 * LAS HUELLAS DE LO QUE ESTORBA EN LAS LINDES — TABLA GENERADA: NO SE EDITA A MANO.
 *
 *   npx tsx escenas/scripts/medir-huellas-de-las-lindes.ts
 *
 * Es la caja en planta de cada modelo de `tablero.glb` que estorba al andar, medida por debajo
 * de la cabeza de una persona, con el origen donde el reparto pone la pieza y en unidades del
 * pack. Cómo se mide y por qué así está en la cabecera del guion que la escribe; quién estorba y
 * quién no, en `comoEstorba` (`lindes-piezas.ts`); y cómo se convierte en una caja del mundo
 * —escala, largo, giro—, en `lindes-mundo.ts`.
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
  'taberna': { x0: -0.4987, x1: 0.5768, z0: -0.7024, z1: 0.6301 },
  'taller': { x0: -0.8364, x1: 0.8291, z0: -0.8811, z1: 0.7862 },
  'vigia': { x0: -0.5156, x1: 0.5156, z0: -0.5156, z1: 0.5156 },
};

/**
 * El hueco de `muro-puerta`, a lo largo del muro —la `x` del modelo—: por aquí se cruza. Lo de
 * los dos lados es muro y estorba.
 */
export const HUECO_DE_LA_PUERTA: { readonly x0: number; readonly x1: number } = {
  x0: -0.5,
  x1: 0.5,
};
