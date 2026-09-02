/**
 * DE DÓNDE SALE EL RENGLÓN QUE HAY EN PANTALLA, Y POR QUÉ HAY QUE SABERLO.
 *
 * ═══ EL FALLO QUE ESTO ARREGLA, CONTADO ENTERO ═══
 *
 * Hay un solo renglón de aviso y lo escriben dos cosas que no se parecen en
 * nada: la RED —«se ha perdido la mesa, reintentando»— y TU ÚLTIMA JUGADA —«ese
 * movimiento no se ha podido hacer»—. Mientras fue una cadena suelta, el bucle
 * de sondeo lo borraba entero cada vez que una respuesta traía algo, porque para
 * el sondeo borrar significaba «ya vuelvo a hablar con el servidor».
 *
 * Y ahí se iba por delante lo único que dice que tu movimiento no ha entrado. La
 * secuencia medida: Ana pulsa una pieza, el reductor la rechaza —que con la
 * regla del «sólo si» del §5 bis es el camino NORMAL y no una rareza—, aparece
 * el aviso; medio segundo después Bruno mueve, el sondeo de Ana despierta con un
 * `200` y borra el aviso. Ana ve el tablero cambiar y da por hecho que movió
 * ella. Es exactamente el fallo que la regla 2 de este fichero existe para
 * evitar, reintroducido veinte líneas más abajo por una línea que parecía
 * limpieza.
 *
 * ═══ LA REGLA, Y POR QUÉ NO ES UN TEMPORIZADOR ═══
 *
 * Un aviso de red lo borra la red cuando se recupera: eso es información nueva
 * sobre lo mismo. Un aviso sobre TU JUGADA no lo puede borrar que juegue otro,
 * porque que juegue otro no dice nada sobre tu jugada. Lo borra lo único que lo
 * deja de ser verdad: que vuelvas a mover, que te sientes en otra mesa o que te
 * levantes.
 *
 * La alternativa evidente —que se borre solo a los cinco segundos— es peor de lo
 * que parece: la ventana en la que alguien mira la pantalla no la marca un
 * cronómetro, y un mensaje que se va solo obliga a estar delante justo entonces.
 * Que se quede hasta que vuelvas a hacer algo es la única regla que no depende de
 * dónde estuvieras mirando.
 */
export type DeDondeSaleElAviso =
  /** Del bucle de sondeo: la conexión. Se borra sola cuando se recupera. */
  | 'la-red'
  /** De tu último movimiento. Solo la borra otra acción tuya. */
  | 'tu-jugada';

export interface AvisoPuesto {
  texto: string;
  de: DeDondeSaleElAviso;
}

export const SIN_AVISO: AvisoPuesto = { texto: '', de: 'la-red' };

/**
 * QUÉ QUEDA EN PANTALLA CUANDO EL SONDEO TRAE ALGO.
 *
 * Tres líneas y una función exportada, y las dos cosas son a propósito. Esta
 * regla vivía escrita dentro del bucle de sondeo y por eso no la miraba ningún
 * comprobador: es una decisión de una línea metida en un `async` de cuarenta que
 * no se puede llamar desde Node sin montar React, sin un servidor y sin una
 * mesa. Sacada aquí se le puede dar un aviso y contar lo que devuelve, que es la
 * misma cirugía que este cliente ya hace con `queSePinta` y con `loQuePide`.
 *
 * Y la regla, otra vez en corto: una respuesta del sondeo es información nueva
 * sobre la CONEXIÓN. Borra lo que la conexión había dicho, y no toca lo que dijo
 * tu jugada — porque que juegue otro no dice nada sobre si la tuya entró.
 */
export function loQueQuedaTrasElSondeo(antes: AvisoPuesto): AvisoPuesto {
  if (antes.texto.length === 0) return SIN_AVISO;
  return antes.de === 'la-red' ? SIN_AVISO : antes;
}
