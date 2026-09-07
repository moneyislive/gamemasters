/**
 * LA CINTA DEL TERCIO CENTRAL: cuánto ancho se lleva y qué le cabe dentro.
 *
 * ═══ QUÉ ES ESTO Y POR QUÉ NO ESTÁ ESCRITO EN LA PANTALLA ═══
 *
 * Con el delta a pantalla completa (§2 de `docs/LA-MESA-DE-RIBERAS.md`) el aviso del
 * juego y la puerta del cajón dejan de vivir DEBAJO del lienzo y pasan a una cinta de
 * vidrio pegada a su canto de arriba. Esa cinta no ocupa el ancho entero: se queda en el
 * tercio central en apaisado y en el 40 % de pie, porque a los lados están las dos manos
 * de cartas y son cartas que se ARRASTRAN. Una cinta de lado a lado tapa la de arriba de
 * las dos en todos los apaisados.
 *
 * Las dos fracciones viven aquí, en una función pura y sin `three`, por lo mismo que
 * `escenas/barra.ts` guarda el reparto de la barra: las pintan DOS pantallas —el
 * escritorio hoy, la app en la fase 6— y las mide un comprobador desde Node. Una copia
 * en cada cliente son dos repartos que divergen el día que alguien toque uno, y el que
 * diverge es el que nadie estaba mirando. La cinta que se pinta es la que se mide.
 *
 * ═══ AQUÍ NO HAY NI UNA LETRA NI UN COLOR ═══
 *
 * Esto devuelve puntos de pantalla y nada más. Cuánto ocupa una letra depende del cuerpo
 * con el que cada cliente pinta la frase —y en el escritorio, además, de la preferencia
 * de tamaño de letra del navegador, que `raizDelNavegador` respeta a propósito—, así que
 * el hueco MÍNIMO que la frase necesita entra por la puerta: `loQueLlevaLaCinta` lo
 * recibe en puntos y no lo calcula. Con la letra escrita aquí, subir la preferencia del
 * navegador dejaría la cuenta de este fichero diciendo que la frase cabe mientras en
 * pantalla salen tres letras y unos puntos suspensivos.
 *
 * ═══ Y EL LADO DEL BOTÓN ENTRA POR LA MISMA PUERTA, POR LA MISMA RAZÓN ═══
 *
 * Aquí se dan sus 44 puntos, que es el suelo de toque, y ése es el número en un cliente que
 * pinte puntos. El escritorio no pinta puntos: escribe `2.75rem`, porque así escribe esta
 * casa los 44 (44 partido por los 16 de un navegador de serie), y con la raíz de esta casa
 * —`106.25 %`, o sea 17— eso son 46,75. MEDIDO en un lienzo de 522,6×130,2: la cuenta daba
 * el hueco de la frase en 86,2 puntos y en pantalla eran 80,5, y con la preferencia de letra
 * en grande la diferencia deja de ser un pelo. Así que el lado también se puede pasar, y lo
 * dice el que lo pinta.
 */

/**
 * EL ALTO DE LA CINTA Y EL LADO DE SUS BOTONES: los 44 puntos del suelo de toque (§1.2).
 *
 * Son el mismo número a propósito: la cinta ES la línea de sus botones, y la frase se
 * pliega a dos renglones dentro de esos 44 en vez de hacerla crecer (§2.2).
 */
export const ALTO_DE_LA_CINTA = 44;
/** El lado de «‹», de la ficha de mis puntos y de cada botón del carril. El mismo 44. */
export const BOTON_DE_LA_CINTA = 44;

/**
 * ═══ LA SEGUNDA TIRA: EL CARRIL DE LOS BOTONES SUELTOS, QUE YA NO ES «TODAVÍA NO» ═══
 *
 * Aquí ponía que la línea de los botones de `opcionesFueraDeLaMesa` «todavía no está escrita
 * en ninguna pantalla» y que cuando lo estuviera la suma máxima serían 88. Ya lo está, y lo
 * que la obligó a existir se cuenta con un número: CON EL ESTIAJE POR MOVER el juego emite
 * DIECIOCHO destinos siempre —hasta veintitrés con las víctimas dentro— y ninguno de ellos lo
 * pinta el delta, así que los dieciocho salen por esta puerta. Medido en el escritorio, un
 * botón de opción con su rótulo y su ayuda mide 238 puntos de ancho: los dieciocho son 4.284
 * puntos de botón puestos DEBAJO del lienzo, en una ventana que puede tener 320 de alto
 * entero. Eso no es una lista larga: es una mesa parada, porque mover la pieza es obligatorio
 * y al botón no se llega.
 *
 * Por eso la segunda tira no lleva rótulos: lleva un botón CUADRADO del suelo de toque por
 * opción y rueda a lo ancho. Dieciocho cuadrados de 44 son 792 puntos de carril, que en un
 * lienzo de 288 se recorren de dos en dos y en un monitor se ven trece de una vez
 * (`cuantosSeVenEnElCarril`). La lista con rótulo Y ayuda sigue entera dentro del cajón, que
 * es donde hay ancho para leerla: cada opción se alcanza por los dos sitios.
 *
 * ═══ Y ESTO ES LO QUE HAY QUE RESTARLE AL CARTEL DE LOS NAIPES ═══
 *
 * La cinta y su carril son una caja opaca pegada al canto de ARRIBA del mismo lienzo en cuyo
 * pie se apoya el cartel de un naipe. `elCartelQueCabe` resta este alto a la banda libre
 * ANTES de partirla por la mitad; sin restar la segunda tira, el cartel crece hacia arriba y
 * se mete por debajo del vidrio. Se pregunta con esta función y no multiplicando por dos en
 * cada cliente, para que el día que la cinta cambie de alto haya UN sitio que tocar.
 */
export function altoDeLaCinta(conCarril: boolean): number {
  return ALTO_DE_LA_CINTA * (conCarril ? 2 : 1);
}

/**
 * CUÁNTOS BOTONES DEL CARRIL SE VEN DE UNA VEZ, sin rodarlo.
 *
 * No decide nada —el carril rueda y caben todos—: es la cifra que dice si rueda o no en cada
 * lienzo, y la miden los comprobadores. Sirve para lo que el diseño no tenía escrito: en el
 * lienzo más estrecho de este cliente (288, cinta de 115,2) se ven DOS de los dieciocho, y en
 * un monitor (cinta de 640) trece. Con el lienzo sin medir todavía —cero por cero, el primer
 * render y también Node— devuelve cero, que es «no hay carril» y no una división por cero.
 *
 * El lado del botón entra por la puerta por lo mismo que en `loQueLlevaLaCinta`: esta casa
 * escribe los 44 como `2.75rem` y con su raíz eso son 46,75.
 */
export function cuantosSeVenEnElCarril(
  anchoDeLaCinta: number,
  ladoDelBoton: number = BOTON_DE_LA_CINTA,
): number {
  if (!(anchoDeLaCinta > 0) || !(ladoDelBoton > 0)) return 0;
  return Math.floor(anchoDeLaCinta / ladoDelBoton);
}

/**
 * EL TERCIO EN APAISADO Y EL 40 % DE PIE, y por qué no son el mismo número.
 *
 * En apaisado las dos manos se quedan en los cantos y el tercio central deja aire de
 * sobra: 138 puntos hasta la franja del mazo y 155 hasta la mano de bienes en el peor
 * apaisado de la lista (568×320), 466 y 524 en un monitor.
 *
 * De pie las manos SUBEN hasta arriba y el aire se acaba: medido en 390×845, al 50 % la
 * cinta SE METE 3,9 puntos por dentro de la franja de la mano del mazo, al 45 % le deja
 * 5,8 —que no es un margen— y al 40 % le deja 15,6, y 26,5 a la de bienes. De ahí sale el
 * 0,40, y de ahí sale también el suelo de 15 puntos con que `verify:escena` mide esto en
 * todos los lienzos.
 *
 * ═══ Y CADA MANO SE MIDE CONTRA UNA COSA DISTINTA, QUE NO ES UN DESCUIDO ═══
 *
 * La del MAZO, contra su FRANJA (`franjaDeLasCartas`), que es el rectángulo reservado para
 * ella: dentro viven las cartas y también las casillas donde se sueltan al arrastrarlas, y
 * ésas llegan al 93 % del ancho de la franja. Medir sólo las cartas daría 33 puntos de
 * holgura que no existen. La de BIENES no tiene franja declarada, así que se mide contra
 * sus cartas ABIERTAS —el imán a tope sobre la de arriba, que es cuando más se meten hacia
 * dentro—: quietas asoman menos, y medir quietas sería medir el caso fácil.
 */
export const TERCIO_APAISADO = 1 / 3;
export const PARTE_DE_PIE = 0.4;

/**
 * EL ANCHO DE LA CINTA, EN PUNTOS, para un lienzo de este tamaño.
 *
 * Se decide con la PROPORCIÓN del lienzo y no con un umbral de ancho: «de pie» es que el
 * lienzo sea más alto que ancho, que es exactamente cuando las manos suben. Un umbral en
 * puntos —«por debajo de 400 es de pie»— haría que una tableta apaisada estrecha se
 * midiera como un teléfono de pie y al revés.
 *
 * Con un lienzo sin medir todavía (cero por cero, el primer render) devuelve cero, y
 * quien pinta no pinta cinta: es lo mismo que hace `elCartelQueCabe`, y por lo mismo —una
 * cinta de ancho negativo o infinito no se ve como un error, se ve como una raya.
 */
export function anchoDeLaCinta(ancho: number, alto: number): number {
  if (!(ancho > 0) || !(alto > 0)) return 0;
  return ancho * (ancho >= alto ? TERCIO_APAISADO : PARTE_DE_PIE);
}

/** Lo que la cinta puede llevar hoy, con el ancho que le ha tocado. */
export interface LoQueLlevaLaCinta {
  /** Su ancho en puntos: `anchoDeLaCinta`. */
  readonly ancho: number;
  /**
   * Si el «‹» de salir cabe DENTRO de la cinta. Cuando no, la cinta se queda con la
   * frase y la ficha de mis puntos: quién recoge entonces la salida es cosa de cada
   * cliente, y en el escritorio está contado en `riberas-en-tres.tsx`.
   */
  readonly salidaDentro: boolean;
  /** Los puntos que le quedan a la frase, ya descontados los botones Y el reloj que la cinta lleva. */
  readonly hueco: number;
}

/**
 * QUÉ LLEVA LA CINTA HOY, Y LA RAMA QUE EL DISEÑO NO TENÍA.
 *
 * ═══ EL CASO QUE APARECIÓ AL MEDIR: TRES LETRAS ═══
 *
 * El §2.2 da el hueco de la frase como `ancho/3 − 88`, o sea la cinta menos los dos
 * botones, y lo da por bueno porque su lienzo más estrecho es un teléfono de 320. Este
 * cliente da lienzos más estrechos desde que la página se puso de pie: a 288 puntos de
 * ancho la cinta vale 115,2 y, quitados los dos botones de 44, quedan 27,2 puntos, que
 * con la letra de la casa son TRES LETRAS. No es una frase recortada: es una frase que no
 * existe.
 *
 * Y ENSANCHARLA NO LO ARREGLA, que es lo que se prueba primero: el techo de la cinta a
 * 288 de ancho son 122,8 puntos —más allá se come los 15 que el propio comprobador exige
 * hasta la carta de arriba de la mano del mazo—, y 122,8 menos los dos botones son 34,8,
 * o sea cuatro letras. La anchura no es el problema.
 *
 * ═══ ASÍ QUE SE VA UNO DE LOS TRES, Y SE VA POR UNA REGLA Y NO POR UN NÚMERO ═══
 *
 * Aquí estuvo escrito un umbral («bajo 320 puntos de ancho»), y estaba mal: a 320 de
 * ancho de pie la cinta vale 128 y con los dos botones deja 40 puntos, que son cuatro
 * letras — o sea que el umbral dejaba dentro un lienzo que no puede. Lo que decide no es
 * el ancho: es si la FRASE conserva su hueco mínimo. Se pregunta eso, y el que se va es
 * el «‹»:
 *
 *   · la ficha de mis puntos no puede irse: es la única puerta del cajón, o sea de todo
 *     lo que no cabe en la cinta —el marcador, el código, el reloj, los paneles, las dos
 *     salidas y la crónica—, y además es el único sitio donde mis puntos están a la vista
 *     sin abrir nada (decisión 11);
 *   · la frase tampoco: es la ÚNICA línea de estado de la pantalla, la que dice de quién
 *     es el turno y en qué paso está;
 *   · el «‹» sí, y es el único de los tres que en el escritorio existe DOS veces: la
 *     cabecera de la Sala se queda en esta pantalla (§2.1) y su «Sala de Arcade» va al
 *     mismo sitio. De los tres, se va el que ya está fuera.
 *
 * Medido en el escritorio con la letra de la casa (raíz 17: cuerpo de 13,94 puntos, ancho
 * de letra 8,36, o sea 66,9 puntos para ocho letras; y botones de 46,75, que son los 44 de
 * aquí escritos `2.75rem`), el «‹» se queda fuera en SIETE lienzos de los dieciocho de la
 * lista —288×355, 288×317, 288×420, 320×360, 360×490, 390×490 y 390×845— y en ninguno de
 * ellos la frase baja de ocho letras: 8, 8, 8, 9, 11, 13 y 13.
 *
 * Y HAY UN EXTREMO EN EL QUE NI SACANDO EL «‹» SE LLEGA A OCHO, y queda dicho porque esta
 * función no lo puede arreglar: con la preferencia de tamaño de letra del navegador muy
 * alta la letra crece y la cinta no —su ancho es una fracción del lienzo, no de la raíz—.
 * A 288 de ancho con raíz 24 quedan cuatro letras y ya no hay nada más que soltar. Es el
 * mismo extremo que el del cartel de los naipes, y se degrada igual: la frase entera sigue
 * en el árbol y se lee con lector y al posar el ratón.
 *
 * ═══ Y AHORA HAY UN CUARTO INQUILINO: EL RELOJ, QUE ENTRA POR LA PUERTA ═══
 *
 * Lo que lo obligó a existir salió jugando y no leyendo: la cinta no decía NUNCA cuánto
 * quedaba de turno. La cuenta atrás vivía sólo dentro del cajón, o sea detrás de un toque,
 * y con el plazo de serie —«Como venga», 120 s medidos— la mesa jugó sola tres turnos
 * seguidos y fundó una choza que nadie puso. Un reloj al que hay que abrirle un cajón para
 * verlo no es un reloj.
 *
 * `huecoDelReloj` son los puntos que ese rótulo se lleva, y entra por la puerta por lo mismo
 * que `huecoMinimoDeLaFrase`: aquí no hay ni una letra ni un cuerpo, y quien pinta sabe
 * cuánto ocupa el suyo. CERO —lo de serie— es «esta cinta no lleva reloj», que es lo que
 * pasa en una mesa sin plazo, en una mesa terminada, y en todo cliente que todavía no lo
 * pinte; y con cero, esta función devuelve exactamente lo que devolvía antes.
 *
 * ═══ EL RELOJ VA DELANTE DE LA FRASE Y NO SE ENCOGE. EL ORDEN ES LA DECISIÓN ═══
 *
 * De los cuatro, el único que se puede recortar sin perder nada es la frase: se corta con
 * puntos suspensivos y sigue ENTERA en el árbol —lector y `title`—. Un reloj recortado no
 * es un reloj más corto: «12 mi…» o «4…» son otro número. Así que el reloj se lleva sus
 * puntos y la frase se queda con el resto, y el que se va sigue siendo el «‹», sólo que
 * ahora se va antes: la regla no cambia, cambia lo que hay que descontar antes de
 * preguntarla.
 *
 * Medido con la letra de la casa (raíz 17, 8,364 puntos por letra) y el reloj más largo que
 * el escritorio puede escribir —«12 min», seis caracteres, 50,2 puntos—: en un monitor la
 * cinta vale 640 y a la frase le quedan 496,3 puntos con el «‹» puesto, o sea de sobra; en
 * el lienzo estrecho de 288 la cinta vale 115,2, el «‹» ya se iba antes y ahora a la frase
 * le quedan 18,2 puntos, que son DOS letras.
 *
 * Ese caso es el extremo que la cabecera de arriba ya describía —a 288 con raíz 24 quedaban
 * cuatro letras y no había nada más que soltar—, y aquí se decide a sabiendas hacia qué lado
 * cae: antes DOS letras de aviso que ningún reloj. Lo que se pierde son letras de una frase
 * que sigue completa en el árbol; lo que se gana es que nadie vuelva a perder tres turnos
 * sin saber que se le acababa el tiempo.
 */
export function loQueLlevaLaCinta(
  ancho: number,
  alto: number,
  huecoMinimoDeLaFrase: number,
  ladoDelBoton: number = BOTON_DE_LA_CINTA,
  huecoDelReloj = 0,
): LoQueLlevaLaCinta {
  const suAncho = anchoDeLaCinta(ancho, alto);
  /*
   * El reloj se descuenta ANTES de preguntar por el «‹», que es lo único que este número
   * cambia: sin descontarlo, la cuenta diría que la frase conserva sus ocho letras mientras
   * en pantalla el reloj ya se ha llevado seis de ellas.
   */
  const paraLaFrase = (botones: number): number => suAncho - botones * ladoDelBoton - huecoDelReloj;
  const salidaDentro = paraLaFrase(2) >= huecoMinimoDeLaFrase;
  return {
    ancho: suAncho,
    salidaDentro,
    hueco: paraLaFrase(salidaDentro ? 2 : 1),
  };
}
