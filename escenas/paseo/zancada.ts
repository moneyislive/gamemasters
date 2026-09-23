/**
 * QUÉ CLIP TOCA Y A QUÉ RITMO SUENA: de la velocidad REAL a los pies.
 *
 * ═══ LOS DOS FALLOS QUE ESTO CIERRA ═══
 *
 *  1. EL CLIP DE CORRER NO SONABA NUNCA, Y CONTRA UNA PARED SE ANDABA EN EL SITIO. La marioneta
 *     elegía el clip con la derivada de `andando`, que el paseante contaba en SEGUNDOS, contra un
 *     umbral de 1,6 unidades por segundo. La derivada de un contador de segundos vale uno, se
 *     ande o se corra, así que nunca pasaba de 1,6: se corría con las piernas de andar. Y contra
 *     el borde `andando` seguía sumando, así que se pulsaba adelante, no se avanzaba, y la figura
 *     andaba en el sitio. Las dos cosas salían de medir LO QUE SE PULSA en vez de LO QUE PASA.
 *  2. LOS PIES PATINABAN POR TRES. El paseo va a 12 unidades por segundo andando y a 26,4
 *     corriendo (`shared/mecanicas/andar.ts`), y el clip sonaba siempre a su velocidad de serie,
 *     con la que `andar` cubre 4 y `correr` 8 (`gestos-de-la-plaza.ts`, donde está medido). El
 *     suelo corría tres veces más que las piernas.
 *
 * ═══ LO QUE SE HACE ═══
 *
 * Se mide la velocidad entre dos tics —lo que se movió de verdad partido por lo que dura un
 * tic, `poseDelPaseo`— y de ella sale todo: por debajo de medio paso por segundo, quieto aunque
 * se pulse; de ahí a la media entre andar y correr, `andar`; por encima, `correr`. Y el clip
 * suena a la velocidad medida partida por lo que cubre a su velocidad de serie, así que el suelo
 * y los pies van a la par: andando a 3 y corriendo a 3,3. Hacia atrás, con el signo cambiado,
 * que es como `peon.ts` hace retroceder a su aventurero.
 *
 * Un ritmo de 3 es mucho —la plaza no deja pasar de 1,5 porque «parece una película
 * acelerada»— y no es este fichero quien puede bajarlo: la plaza elige cuánto dura su camino, y
 * el paseo no elige su velocidad, que la fija el paso que comparten el aparato y el servidor. Si
 * se ve acelerado, lo que se toca es esa velocidad, no los pies: acotar el ritmo aquí sería
 * volver a hacer patinar el suelo, que es el fallo que esto arregla.
 *
 * ═══ Y NO PREGUNTA POR LA MARCHA, A PROPÓSITO ═══
 *
 * La marcha es lo que se PIDE, y contra un muro se pide andar sin andar. Además, cuando se vea
 * andar a los demás, de ellos llegará dónde están y no qué pulsaron: la misma cuenta tiene que
 * servir con una velocidad medida entre dos fotos de la red. Un vado frena a la mitad, así que
 * quien corre por el agua va a paso de andar y se le ve andar: el agua frena, no disfraza.
 *
 * Sin `three`, para que `verify:paseo` lo mida en Node.
 */
import { CLIP } from '../embarcadero/figuras';
import type { NombreDeClip } from '../embarcadero/figuras';
import { VELOCIDAD_DE_CARRERA, VELOCIDAD_DE_PASEO } from '../plaza/gestos-de-la-plaza';
import { VELOCIDAD_ANDANDO, VELOCIDAD_CORRIENDO } from '../../shared/mecanicas/andar';
import { aNumero } from '../../shared/mecanicas/fijo';

/** Lo que cubre `andar` a velocidad 1, en unidades por segundo. Medido: `gestos-de-la-plaza.ts`. */
export const ZANCADA_DE_ANDAR = VELOCIDAD_DE_PASEO;

/** Y `correr`, el doble. Medido igual. */
export const ZANCADA_DE_CORRER = VELOCIDAD_DE_CARRERA;

/**
 * POR DEBAJO DE ESTO ESTÁ QUIETO, en unidades por segundo.
 *
 * Un octavo de lo que cubre `andar`: a esa velocidad el clip sonaría a 0,125, que es una figura
 * congelada a media zancada. Lo que se mueve menos —resbalar casi de frente contra un muro— se
 * lee mejor quieto que a cámara lenta.
 */
export const QUIETO_POR_DEBAJO_DE = ZANCADA_DE_ANDAR / 8;

/**
 * A PARTIR DE AQUÍ CORRE: a medio camino entre la velocidad de andar y la de correr del paso por
 * tics, 12 y 26,4. Salen de `andar.ts` y no se escriben aquí, para que el día que cambien el
 * umbral siga cayendo en medio.
 */
export const CORRE_A_PARTIR_DE = (aNumero(VELOCIDAD_ANDANDO) + aNumero(VELOCIDAD_CORRIENDO)) / 2;

/** El clip de quien se mueve a esta velocidad, con signo o sin él. */
export function clipDelPaso(velocidad: number): NombreDeClip {
  const v = Math.abs(velocidad);
  /* Escrito al revés a propósito: un `NaN` no es mayor que nada, y así cae en quieto. */
  if (!(v >= QUIETO_POR_DEBAJO_DE)) return CLIP.reposoA;
  return v >= CORRE_A_PARTIR_DE ? CLIP.correr : CLIP.andar;
}

/**
 * A QUÉ VELOCIDAD SUENA EL CLIP para que los pies pisen el suelo que pasa.
 *
 * Con signo: hacia atrás, el clip va hacia atrás. Quieto suena a su velocidad de serie.
 */
export function ritmoDelClip(clip: NombreDeClip, velocidad: number): number {
  if (clip === CLIP.andar) return velocidad / ZANCADA_DE_ANDAR;
  if (clip === CLIP.correr) return velocidad / ZANCADA_DE_CORRER;
  return 1;
}
