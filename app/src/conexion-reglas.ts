/**
 * De quién es el problema: de la plataforma o de una partida.
 *
 * VIVE APARTE PORQUE ES LA REGLA, NO UN DETALLE DE `estado.tsx`. Estaba escrita
 * dos veces —en la primera carga y en el bucle de sondeo— y las dos copias
 * decidían quién ve una franja a lo ancho de la app. Dos copias de una regla
 * así divergen sin que nadie lo note: no dan error, solo empiezan a avisar de
 * cosas distintas según por dónde entre el fallo.
 *
 * Aquí no se importa nada de React Native a propósito, para que se pueda cargar
 * y comprobar desde fuera de la app.
 */

/** Lo que hay que enseñar ante un fallo, según de quién sea. */
export interface Reparto {
  /**
   * No llegamos a un servidor que sirva. Afecta a TODO lo que se esté jugando,
   * así que es lo único que puede pintar la franja a lo ancho de la app.
   */
  sinRed: boolean;
  /**
   * Es cosa de ESTA partida y de ninguna más. Se cuelga de su fila en el panel
   * y de la propia pantalla del juego, nunca de una franja global: se pueden
   * perder los hilos de una velada y seguir teniendo los de las demás.
   */
  deLaPartida: boolean;
}

/**
 * Reparte un fallo a partir de su código HTTP. `0` significa que no hubo
 * respuesta ninguna.
 *
 * 401, 403 y 404 son de la partida —caducó la credencial, ya no participas, la
 * velada se cerró— y además DEMUESTRAN que hay conexión: el servidor contestó.
 * Por eso apagan `sinRed` en vez de dejarlo como estaba; si no, un parpadeo de
 * wifi seguido de una partida que responde 404 dejaba la franja puesta
 * indefinidamente mientras cada 404 demostraba que la red iba fina.
 *
 * Todo lo demás —sin respuesta, o un 5xx de un servidor que no está
 * sirviendo— es de la plataforma.
 */
export function repartirFallo(estado: number): Reparto {
  const deLaPartida = estado === 401 || estado === 403 || estado === 404;
  return { sinRed: !deLaPartida, deLaPartida };
}

/**
 * Cuántos fallos SEGUIDOS hacen falta para decir «sin conexión».
 *
 * ═══ POR QUÉ NO ES UNO ═══
 *
 * El sondeo largo deja la conexión CALLADA hasta veinticinco segundos: el
 * servidor no contesta hasta que la partida cambia. Veinticinco segundos de
 * silencio es justo lo que cortan los NAT de las operadoras y algunos proxies,
 * y cuando lo cortan, el móvil ve un fetch fallido sin código HTTP.
 *
 * Con tolerancia cero, ese corte —del que la partida se recupera sola en el
 * siguiente sondeo, dos segundos y medio después— encendía la franja «Sin
 * conexión» a lo ancho de la app. De ahí la sensación de estar desconectándose
 * continuamente MIENTRAS EL JUEGO RESPONDE PERFECTAMENTE: no es que se pierda
 * la partida, es que el aviso no distingue un tropiezo de una caída.
 *
 * Se aguanta uno y se avisa al segundo. El precio es que una caída de verdad
 * tarda un sondeo más en anunciarse —dos segundos y medio— y a cambio los
 * tropiezos, que son la inmensa mayoría, no se ven.
 *
 * NO ES UN PARCHE COSMÉTICO SOBRE UN FALLO DE RED: es que un aviso que salta
 * con cada tropiezo deja de significar nada, y entonces el día que la conexión
 * se cae de verdad, nadie lo mira.
 */
export const FALLOS_ANTES_DE_AVISAR = 2;

/**
 * ¿Toca ya poner la franja?
 *
 * Se cuenta aparte de `repartirFallo` porque son dos preguntas distintas:
 * aquella dice DE QUIÉN es el problema, esta dice SI YA MERECE LA PENA
 * contarlo. Mezclarlas obligaría a que el reparto llevara memoria, y su gracia
 * es justamente no llevarla.
 */
export function hayQueAvisar(fallosSeguidos: number): boolean {
  return fallosSeguidos >= FALLOS_ANTES_DE_AVISAR;
}
