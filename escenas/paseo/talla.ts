/**
 * LO QUE MIDE QUIEN ANDA: la altura del avatar a pie, de la que cuelga todo lo que depende de su
 * tamaño en el paseo.
 *
 * ═══ POR QUÉ UNA CONSTANTE PROPIA Y NO `ALTURA_DE_UNA_PERSONA` A SECAS ═══
 *
 * `ALTURA_DE_UNA_PERSONA` (`escenas/escala.ts`) es la vara con la que está hecho el MUNDO: la escala
 * del pack, lo que mide una casa, el zócalo de una losa. Quien anda puede cambiar de tamaño sin que
 * el mundo cambie, y si lo que depende de su cuerpo siguiera colgando de la vara del mundo, achicar
 * al avatar dejaría chocando con la copa de un árbol a alguien que ya pasa por debajo de ella.
 *
 * ═══ Y DESDE EL 27-SEP-2026 MIDE LA MITAD ═══
 *
 * Miguel: «los avatares son grandes de forma desproporcionada». Medido contra puertas, coches,
 * bancos y barriles de los tres juegos, la decisión y sus números están en
 * `shared/mecanicas/talla.ts` (`TALLA_A_PIE`, 0,5), que vive en `shared/` porque el servidor arbitra
 * con ella el golpe y la recogida. Aquí sólo se convierte en altura: 1,27 unidades.
 *
 * Lo que el paseo decide POR EL TAMAÑO DE QUIEN ANDA sale de aquí, y sólo de aquí:
 *
 *   · la FIGURA: la marioneta propia y la de los demás se pintan a `TALLA_A_PIE` de su tamaño de
 *     serie (`quien-anda.tsx`, `mueveAQuienAnda`), y con ella la zancada de su clip (`zancada.ts`);
 *   · lo que va ENCIMA de ella: sus corazones y el rótulo de los demás (`rotulo.ts`);
 *   · las dos CÁMARAS de a pie: los ojos, el hombro, lo que cabe detrás y lo que hay que ver
 *     (`camaras.ts`);
 *   · la FRANJA DEL CUERPO con la que se choca con el adorno, de los pies a la cabeza
 *     (`adorno-que-choca.ts`: `ALTURA_DE_QUIEN_ANDA`, y lo que no llega a `LO_QUE_SE_PISA`), y lo
 *     fino que se corta cada pieza para saber qué tiene a esa altura (`ALTO_DE_UNA_RODAJA_QUE_CHOCA`);
 *   · y las FICHAS que a pie pasan a ser personas: el labriego de Las Lindes
 *     (`loQueEncogeElLabriego`) y el peón y el aventurero del anillo del Burgo (`tallaDelPeon`).
 *     Desde la mesa siguen grandes: son marcas para leerse desde arriba.
 *
 * Lo que NO sale de aquí, y conviene saberlo al cambiarla: el RADIO con el que se choca
 * (`RADIO_DEL_PASEANTE`, en `shared/mecanicas/andar.ts`), que decide también el reparto de los
 * mundos y por eso no encoge (ver `shared/mecanicas/talla.ts`).
 */
import { TALLA_A_PIE } from '../../shared/mecanicas/talla';
import { ALTURA_DE_UNA_PERSONA } from '../escala';

export { TALLA_A_PIE };

/** Lo que mide quien anda, de los pies a la coronilla, en unidades del mundo: media persona del mundo. */
export const ALTURA_DE_QUIEN_ANDA = ALTURA_DE_UNA_PERSONA * TALLA_A_PIE;
