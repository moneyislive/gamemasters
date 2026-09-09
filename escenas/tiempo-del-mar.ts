/**
 * EL TIEMPO QUE VE EL AGUA: los segundos del reloj de la escena, PLEGADOS a un periodo.
 *
 * ═══ EL FALLO QUE ESTO CIERRA, VISTO JUGANDO ═══
 *
 * «Cuando se inicia el tablero el mar se ve bien, pero al cabo de cierto tiempo las regiones
 * que pintan las olas empiezan a pintar muchas más líneas, muy pequeñas, y acaban siendo muy
 * visibles las áreas que se habilitan para pintar las olas.» Es una degeneración por tiempo,
 * y la causa es la de siempre en un sombreador con reloj: el uniform `tiempo` era
 * `clock.elapsedTime` tal cual, sin tope, y en el fragmento del mar entraba MULTIPLICADO
 * —`(vCosta + tiempo * 9.5) * paso`— en el argumento de un seno. A los veinte minutos ese
 * argumento anda por los diez mil radianes, y ahí el `sin` de la GPU ya no es un seno: la
 * reducción de rango pierde la fase, el resultado se vuelve ruido de píxel a píxel, y el
 * umbral de la cresta lo recoge como un enjambre de rayitas dentro de cada parche de olas,
 * que es exactamente lo que se describió. En `mediump` de dieciséis bits —los teléfonos— pasa
 * en un par de minutos y acaba en infinito.
 *
 * ═══ EL ARREGLO: EL TIEMPO SE PLIEGA, Y EL PLIEGUE NO SE VE ═══
 *
 * Todo lo que el agua hace con el tiempo son senos de `t · ω`, y TODAS las ω —las de las
 * zonas, los tres trenes, los dos senos del vértice, el paso, la cresta, y las cinco del agua
 * del muelle— son múltiplos de 0,01 rad/s. Así que a los `2π · 100` segundos cada una ha dado
 * un número ENTERO de vueltas, y un tiempo plegado a ese periodo produce exactamente el mismo
 * campo a un lado y a otro del pliegue: no hay salto que ver. Con el tiempo acotado a 628 s,
 * el argumento más grande que entra en un seno son unos setecientos radianes, que cualquier
 * GPU reduce sin perder la fase.
 *
 * La única deuda que queda dicha: en dieciséis bits, setecientos radianes tienen medio radián
 * de resolución al final del periodo, o sea que un teléfono sigue viendo la cresta temblar un
 * poco los últimos minutos de cada vuelta. Es acotado y no crece. Si algún día molesta, el
 * paso siguiente es pasarle al sombreador cada fase ya reducida a `[0, 2π)` en vez de un
 * tiempo que él multiplica.
 *
 * `verify:escena` lee el GLSL de los dos sombreadores, saca TODOS los coeficientes del tiempo
 * y exige que cada uno dé vueltas enteras en este periodo; y afirma que la escena escribe en
 * el uniform el tiempo plegado y no el crudo. Vive aquí, sin `three`, para eso.
 */

/** Cien vueltas de un radián por segundo: el mínimo común de todas las velocidades del agua. */
export const PERIODO_DEL_MAR = 2 * Math.PI * 100;

/** Los segundos del reloj, plegados al periodo. Es lo único que el agua debe recibir. */
export function tiempoDelMar(segundos: number): number {
  return segundos % PERIODO_DEL_MAR;
}
