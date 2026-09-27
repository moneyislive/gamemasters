/**
 * LA TALLA A PIE: cuánto mide quien anda por el tablero de Boots on Board, como FRACCIÓN de la
 * persona con la que está hecho el mundo (`ALTURA_DE_UNA_PERSONA`, 2,543, medida en `Knight.glb`).
 *
 * ═══ LO QUE PIDIÓ MIGUEL (27-sep-2026) ═══
 *
 * «Los avatares son grandes de forma desproporcionada, deberían ser un 50 % o incluso un 70 % más
 * pequeños, están desproporcionados con las cosas del entorno. Exceptuando los del Quiebro.» En El
 * Burgo, Riberas y Las Lindes, sobre todo a pie, junto a puertas, coches, bancos y casas.
 *
 * ═══ LO QUE SE MIDIÓ ANTES DE DECIDIR ═══
 *
 * Las cajas de los `.glb` que se pintan, en unidades del mundo (con la escala de cada juego
 * puesta), contra el aventurero a su talla de siempre (2,543 de alto; 1,94 de ancho con los brazos
 * en cruz, ~1,3 en reposo):
 *
 *     EL BURGO (`burgo.glb`, ya a su escala)
 *       hoja de puerta ........ 2,80 × 1,60     coche ................ 2,21 de alto
 *       banco de calle ........ 0,60 de alto     farola ............... 5,76
 *     RIBERAS (`tablero.glb` × 5,469; las casas de un poblado a talla ~1)
 *       casa .................. 7,00             su PUERTA ............ 1,61 × 0,84 (0,294 × 0,154 en el pack)
 *       barril ................ 1,16             caja ................. 0,77
 *     LAS LINDES (`tablero.glb` × 5,469, la casa × 2,2 por jerarquía)
 *       casa .................. 15,4             su PUERTA ............ 3,54 × 1,85
 *       barril ................ 1,16             carro ................ 1,03
 *
 * Y lo que dicen, con una persona de verdad (1,75 m; puerta 2,1 m = 1,2 personas; hombros 0,45 m
 * = la mitad del ancho de una puerta; asiento de banco 0,45 m):
 *
 *   · POR LA ALTURA, cada juego dice una cosa distinta, porque sus packs son maquetas a escalas
 *     distintas: la puerta de Riberas pide 0,53 de la talla de antes (el aventurero era 1,58 veces
 *     su puerta: no cabía por ella); la hoja del Burgo, 0,92; la puerta de Las Lindes, 1,16.
 *   · POR LA MASA, los tres dicen lo mismo, y es lo que se ve: las figuras de KayKit son CABEZONAS
 *     —la cabeza es casi dos quintos del cuerpo y el ancho en reposo la mitad del alto—. A su talla
 *     de siempre el aventurero ocupaba de ancho el 80 % de una hoja de puerta del Burgo (una persona,
 *     el 50 %), era casi tan ancho como un coche y el respaldo de un banco le llegaba a la rodilla.
 *     Lo que el ojo juzga de una figura es su bulto, no su coronilla, y ese bulto era el de dos
 *     personas.
 *
 * ═══ LO DECIDIDO: LA MITAD, EN LOS TRES ═══
 *
 * `TALLA_A_PIE = 0,5`: la figura mide 1,27 de alto y ~0,65 de ancho en reposo, que es el ancho de
 * los hombros de un adulto con la vara del Burgo (coche y puerta: ~1,4 unidades por metro). Es el
 * extremo bajo de lo que pidió Miguel, y es donde lo dejan las medidas:
 *
 *   · el respaldo del banco del Burgo le llega por la cintura (47 %; de verdad, 49 %), y la puerta
 *     de Riberas le saca un 27 % (de verdad, un 20 %);
 *   · MÁS PEQUEÑA NO: al 0,3 que también se pidió mediría 0,76, MENOS que un barril de Riberas o de
 *     Las Lindes (1,16) y que la mitad del respaldo del banco más un palmo; sería un muñeco entre
 *     los trastos, que es la desproporción al revés.
 *   · UNA SOLA PARA LOS TRES, y no una por juego: por la masa los tres piden lo mismo, y las
 *     alturas que discrepan son de sus packs (la casa de Las Lindes va a 2,2 veces A PROPÓSITO,
 *     por jerarquía vista desde la mesa: su puerta queda 2,8 veces más alta que quien anda, como
 *     el portón de una casa grande). Una talla por juego obligaría además a que el servidor
 *     arbitrara el golpe y la recogida con números distintos por juego para lo mismo.
 *
 * El Quiebro no pasa por aquí: su liza y sus figuras son suyas (`shared/mecanicas/liza/`), y Miguel
 * los dio por buenos.
 *
 * ═══ QUÉ CUELGA DE ESTE NÚMERO ═══
 *
 * Todo lo que va con el cuerpo a pie: en `escenas/paseo/talla.ts` la altura de quien anda, y de
 * ella la marioneta (la propia y la de los demás), los corazones y el rótulo, las dos cámaras de a
 * pie, la franja que choca con el adorno, la zancada del clip, y los peones y labriegos vistos a pie.
 * Aquí, en `shared/` porque los arbitra el servidor: el alcance del golpe y de las armas
 * (`canal-de-botas.ts`, `riberas-armas.ts`), el radio de recoger (`hallazgos.ts`) y las
 * velocidades del paso (`andar.ts`), con la compatibilidad de la app ya instalada explicada allí.
 *
 * Lo que NO cuelga, y por qué: el RADIO con el que se choca (`RADIO_DEL_PASEANTE`, 0,4). Decide
 * también dónde se nace y qué sitios valen al REPARTIR los mundos de Riberas y de Las Lindes
 * (`riberas-mundo.ts`, `lindes-mundo.ts`), así que cambiarlo cambiaría el mundo de las mesas que ya
 * existen y el de la app instalada; y 0,4 de radio contra un cuerpo de ~0,65 de ancho sigue
 * dejando al aventurero un palmo separado de las paredes, que se lee bien.
 */

/** Lo que mide quien anda a pie, como fracción de la persona del mundo. Ver la cabecera. */
export const TALLA_A_PIE = 0.5;
