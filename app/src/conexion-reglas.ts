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
