/**
 * LO QUE MIDE QUIEN ANDA: la altura del avatar a pie, de la que cuelga todo lo que depende de su
 * tamaño en el paseo.
 *
 * ═══ POR QUÉ UNA CONSTANTE PROPIA Y NO `ALTURA_DE_UNA_PERSONA` A SECAS ═══
 *
 * `ALTURA_DE_UNA_PERSONA` (`escenas/escala.ts`) es la vara con la que está hecho el MUNDO: la escala
 * del pack, lo que mide una casa, el zócalo de una losa. Quien anda puede cambiar de tamaño sin que
 * el mundo cambie —se ha pedido ya un avatar más pequeño en El Burgo, Riberas y Las Lindes—, y si
 * la franja del cuerpo que choca con el adorno siguiera colgando de la vara del mundo, achicar al
 * avatar dejaría chocando con la copa de un árbol a alguien que ya pasa por debajo de ella.
 *
 * Así que lo que el paseo decide POR EL TAMAÑO DE QUIEN ANDA sale de aquí, y sólo de aquí:
 *
 *   · la FRANJA DEL CUERPO con la que se choca con el adorno, de los pies a la cabeza
 *     (`adorno-que-choca.ts`: `ALTURA_DE_QUIEN_ANDA`, y lo que no llega a `LO_QUE_SE_PISA`);
 *   · y lo fino que se corta cada pieza para saber qué tiene a esa altura
 *     (`ALTO_DE_UNA_RODAJA_QUE_CHOCA`).
 *
 * Lo que NO sale de aquí, y conviene saberlo al cambiarla: el RADIO con el que se choca
 * (`RADIO_DEL_PASEANTE`, en `shared/mecanicas/andar.ts`) es de `shared/` porque lo usa también el
 * servidor para validar, y las cámaras de a pie (`camaras.ts`) siguen midiendo con la vara del
 * mundo.
 */
import { ALTURA_DE_UNA_PERSONA } from '../escala';

/** Lo que mide quien anda, de los pies a la coronilla, en unidades del mundo. Hoy, una persona. */
export const ALTURA_DE_QUIEN_ANDA = ALTURA_DE_UNA_PERSONA;
