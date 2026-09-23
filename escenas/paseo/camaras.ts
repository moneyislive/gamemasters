/**
 * LAS CÁMARAS DE A PIE: la de hombro, la de ojos, y hacia dónde se gira la marioneta.
 *
 * ═══ POR QUÉ SALEN DE LAS LINDES ═══
 *
 * Nacieron en `escenas/lindes/paseo.ts`, que era el único sitio de la casa donde se andaba, y
 * no sabían nada de losas: una cámara detrás de alguien es la misma en un valle, en el anillo de
 * una ciudad o en un delta. Se mudan con el paseo para que el segundo juego que se ande no las
 * copie, porque la copia es exactamente como se pierde un arreglo como el de
 * `giroDeLaMarioneta`, que costó ver a un aventurero andando de espaldas. `lindes/paseo.ts` las
 * reexporta: quien las pedía allí las sigue encontrando.
 *
 * ═══ Y AHORA VAN A LA ALTURA DEL SUELO QUE SE PISA ═══
 *
 * Iban a una altura fija sobre el cero, y el cero no es el suelo en ningún sitio que importe: en
 * Las Lindes la senda está hundida 1,20 unidades y la villa alzada 0,66, y la senda es
 * justamente por donde se anda. La altura la da la escena, que es quien dibuja el suelo; aquí
 * sólo se le suma. Es presentación: dónde se puede estar lo decide la arena, que es plana.
 */
import { ALTURA_DE_UNA_PERSONA } from '../escala';

/** A qué altura van los ojos sobre el suelo que se pisa. */
export const ALTURA_DE_LOS_OJOS = ALTURA_DE_UNA_PERSONA * 0.92;

/** Cuánto se queda la cámara de hombro por detrás y por encima del suelo que se pisa. */
export const ATRAS_DEL_HOMBRO = ALTURA_DE_UNA_PERSONA * 2.6;
export const SOBRE_EL_HOMBRO = ALTURA_DE_UNA_PERSONA * 1.5;

/** Dónde va la cámara y hacia dónde mira. */
export interface PoseDeCamara {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly miraX: number;
  readonly miraY: number;
  readonly miraZ: number;
}

/** Lo justo que una cámara de a pie tiene que saber de quien anda. */
export interface QuienSeMira {
  /** Hacia el este, en unidades del mundo. */
  readonly x: number;
  /** Hacia el sur, en unidades del mundo. */
  readonly z: number;
  /** Hacia dónde mira, en radianes: 0 es el norte y crece hacia el este. */
  readonly rumbo: number;
}

/**
 * HACIA DÓNDE HAY QUE GIRAR LA MARIONETA PARA QUE MIRE A SU RUMBO.
 *
 * ═══ POR QUÉ NO ES `rumbo + π`, QUE ES LO QUE PARECE ═══
 *
 * El rumbo de esta casa tiene el cero al NORTE y crece hacia el ESTE, así que quien anda se
 * mueve hacia `(sin r, −cos r)` — es la dirección de un rumbo en `andar.ts`. Las marionetas de
 * KayKit, en cambio, nacen mirando a su `+z`, y un giro de `θ` alrededor del eje vertical deja
 * ese `+z` en `(sin θ, cos θ)`. Igualando las dos cosas sale `θ = π − r`, que es exactamente
 * `atan2(sin r, −cos r)`: el ángulo de su propio rumbo, sin más.
 *
 * Aquí había `r + π`, y **las dos cuentas dan lo mismo mirando al norte y al sur**. Por eso
 * pasó: el paseante nace mirando al norte, se mira, se ve la nuca, y todo parece bien. Al este y
 * al oeste dan lo CONTRARIO, y el aventurero andaba de espaldas.
 *
 * Mirado en el móvil girando de cuarenta y cinco en cuarenta y cinco: en 180° de giro se vieron
 * dos nucas y dos caras. Con la cámara pegada detrás, el ángulo aparente sólo puede cambiar al
 * DOBLE del giro si el muñeco está espejado; si estuviera bien, no cambiaría nunca.
 */
export function giroDeLaMarioneta(rumbo: number): number {
  return Math.PI - rumbo;
}

/** La cámara de ojos: donde está la cara, mirando adelante. `suelo` es la altura que pisa. */
export function camaraDeOjos(quien: QuienSeMira, suelo = 0): PoseDeCamara {
  return {
    x: quien.x,
    y: suelo + ALTURA_DE_LOS_OJOS,
    z: quien.z,
    miraX: quien.x + Math.sin(quien.rumbo) * 10,
    miraY: suelo + ALTURA_DE_LOS_OJOS * 0.85,
    miraZ: quien.z - Math.cos(quien.rumbo) * 10,
  };
}

/** La cámara de hombro: por detrás y por encima, mirando a la nuca. `suelo` es la altura que pisa. */
export function camaraDeHombro(quien: QuienSeMira, suelo = 0): PoseDeCamara {
  return {
    x: quien.x - Math.sin(quien.rumbo) * ATRAS_DEL_HOMBRO,
    y: suelo + SOBRE_EL_HOMBRO,
    z: quien.z + Math.cos(quien.rumbo) * ATRAS_DEL_HOMBRO,
    miraX: quien.x + Math.sin(quien.rumbo) * 6,
    miraY: suelo + ALTURA_DE_UNA_PERSONA * 0.6,
    miraZ: quien.z - Math.cos(quien.rumbo) * 6,
  };
}
