/**
 * ¿ES EL BARRIO DE LA NOCHE UNO SOLO EN TODOS LOS APARATOS, SE ANDA, SE NAVEGA, Y SUS DURMIENTES NO
 * SE METEN EN NADA? ¿Y LA CIUDAD ABIERTA, EN SUS 32 TRAZAS Y SUS NOCHES?
 *
 *   npm run verify:quiebro-barrio -w server
 *
 * ═══ POR QUÉ EXISTE ═══
 *
 * El barrio de «El Quiebro» no viaja: el servidor, el escritorio, el WebView de la app y el iPhone
 * lo sacan cada uno de (código, noche) con `barrioDeLaNoche`, y la sala valida con la arena que
 * sale de `mundoDelBarrio`. Si dos de ellos derivaran barrios distintos —un bit en una caja, otro
 * orden en los rótulos— cada uno andaría por el suyo, coherente consigo mismo, y cualquier prueba
 * que mirara un solo lado pasaría en los dos. Y sus 48 durmientes son de quien sale cada Prestado:
 * si uno se mete medio cuerpo en un quiosco, lo ve todo el mundo; si divergen, cada aparato ve
 * temblar a otro civil. Esto es lo que tiene que ser verdad para que nada de eso pase.
 *
 * Desde la ciudad abierta (`docs/quiebro/CIUDAD-ABIERTA.md`, §6.4) mira también la ciudad de 540 m, y se
 * queda el nombre para no tocar la batería. Es lo mismo en grande: la ciudad no viaja, cada aparato la saca
 * de (traza, código) con `ciudadDeLaMesa` y la noche de (ciudad, noche, Fallos) con `ciudadDeLaNoche`, y la
 * sala valida con `mundoDeLaLizaDeLaCiudad`. Un conjunto finito se mira ENTERO: las 32 trazas, diez noches
 * cada una, y no una muestra.
 *
 * ═══ LO QUE AFIRMA, EN TRECE PASOS (SEIS DEL BARRIO Y SIETE DE LA CIUDAD) ═══
 *
 *  1. Nada entra en el barrio que no sea (código, noche): el mismo barrio dos veces, con otros
 *     entre medias y después de estropear el anterior; el código sin mayúsculas y la noche con
 *     decimales dan el mismo; los ficheros no importan nada fuera de su lista ni tocan el reloj, el
 *     proceso ni el navegador; y lo compartido entre barrios está congelado.
 *  2. Lo que el barrio es, en 200 noches: cajas bien formadas, dentro del cerco y sin pisarse; toda
 *     medida en cuartos de metro; cada solar repartido entero entre sus edificios; nacer, cabinas y
 *     zonas sin una caja encima (con el radio de una persona); las cabinas, una por cuadrante y con
 *     la carrera en 60-110 m con soportales o sin ellos; el grafo, con los 16 cruces delante, nudos
 *     dentro de la plaza y conexo; la red de aceras con sus 64 pasos de cebra; el adorno en su
 *     sitio, con cada rótulo de tienda entero en la pared de su planta baja; lo despejable y la plaza
 *     despejada. Y que las 200 den variedad de verdad.
 *  3. Se anda y se navega, sobre `arenaDe(mundoDelBarrio(…))`: el mundo es el contrato de `mundo.ts`
 *     con `nace` vacío, y el de la Liza (`mundoDeLaLizaDelBarrio`) no tiene problemas para
 *     `problemasDeLaDeclaracion`; una búsqueda en anchura con paso de medio metro llega a las
 *     cabinas, al refugio, a todas las zonas y a los 16 cruces, y a TODO el suelo libre; andando
 *     desde el centro, cada cabina queda entre lo que declara con atajos y sin ellos, y en 60-110 m;
 *     cada arista del grafo se anda en recta y cada nudo se pisa, también con la plaza despejada;
 *     todo el suelo de la glorieta de 60 ve algún nudo, y por el grafo no se rodea mucho más que
 *     andando.
 *  4. Los durmientes: 48, en cuadrillas de una a tres, con vueltas que duran minutos exactos;
 *     durante 20.000 tics siempre sobre suelo, fuera de toda caja y dentro del barrio, sin saltos, y
 *     en la calzada SÓLO cruzando por un paso con su semáforo en verde; lanzan con un tic que no es
 *     número y con un punto en metros; el guion se reusa con otro objeto igual y no con uno
 *     distinto; el más cercano es el más cercano.
 *  5. Tiempos: en un Node recién arrancado y SIN barrer la memoria a mano, derivar el barrio y su
 *     mundo cuesta 3 ms o menos, con el mundo de la Liza 5 ms o menos, el guion de los durmientes
 *     otros 3, y cargar el módulo 10 como mucho.
 *  6. Node contra Hermes: el barrio, su mundo, el de la Liza, el despejado, el guion y 48 × 9 sitios
 *     de durmiente dan la misma huella en los dos motores y en este proceso.
 *  7. Nada entra en la ciudad que no sea (traza, código, noche, Fallos): la misma ciudad y la misma
 *     noche con cuarenta más entre medias; el código sin mayúsculas; lo que se comparte, congelado, y
 *     tocarlo no cambia nada; otra mesa de la misma traza comparte la traza (el mismo objeto) y no los
 *     edificios; la noche con los mismos Fallos es el mismo objeto, con otros el mismo vestido, y otra
 *     noche otro; lo que lanza; las cifras del diseño; y cuánto espera cada función. Lo que puede importar
 *     cada uno de los cinco ficheros, en el paso 1.
 *  8. Las tres plantillas de plaza en sus ocho giros: cajas en cuartos dentro de la plaza, sin pisarse
 *     contando cada sitio de lo variable y los coches de su acera; zonas y sitios de nacer libres contra
 *     todo eso; el Fallo a 1,5 m de su objeto; las bocas en la calzada y pasado el cruce; su subgrafo sólo
 *     por los ejes, simétrico, conexo y por los cuatro lados; y la Glorieta, caja a caja, la de hoy.
 *  9. Las cuatro trazas dibujadas: los mapas bien escritos; seis plazas con la plantilla de su distrito,
 *     lejos del anillo, de las avenidas y entre sí; callejones y soportales en la cuenta de su distrito;
 *     20 cabinas y 10 refugios en sitios de poste válidos y sin repetir; la tabla de distancias simétrica
 *     y con algún trío para cada Bajada; los nombres.
 * 10. La ciudad de las 32 trazas, diez noches cada una, veintiuna reglas contra todas: canónica y en
 *     cuartos; su forma; el orden de las cajas; edificios y pilares; el grafo base; la tabla de
 *     distancias, que es la del grafo y la de la traza dibujada; plazas, cabinas, refugios y celdas; cada
 *     noche sin cajas que se pisen, con 4-6 obras de acera a acera donde pueden ir, las zonas libres, el
 *     grafo de la noche exacto y andable arista a arista, sin bolsas (una rejilla de 1 m desde la
 *     Glorieta, contrastada antes con `sePuedeEstar`), los tríos a 260 m o menos, las cabinas en sus
 *     bandas (ver abajo lo que no se promete), el mundo de la Liza exacto en Q16.16, nace en su orden, lo
 *     despejado, el tren y los semáforos; y `campoHasta` (el Dijkstra por cubetas de la ciudad) contra un
 *     Dijkstra de montículo del comprobador, campo entero a campo entero: 8 en el grafo base de cada traza
 *     y 3 en el de cada noche, con su suelo (se cuentan los 1.216).
 * 11. Los 635 durmientes: el reparto por distrito; vueltas por la red de aceras en minutos exactos; no
 *     salen si su vuelta pasa por una obra; cada vuelta se anda con los tres apartes; cruzan en verde con
 *     el margen de su calle; tic a tic en dos ciudades 20.000 tics y en ocho 2.000; el orden en que se
 *     piden no importa; el más cercano, los de cerca y el desempate contra la fuerza bruta; la lista
 *     plana; lo que lanza; y gente cerca de cada plaza.
 * 12. La puerta, en un Node recién arrancado: una traza nueva con su noche y su mundo en 8 ms (la mediana
 *     de quince trazas nuevas seguidas en el mismo proceso: ver en el paso por qué no una toma sola), y una
 *     mesa nueva de una traza hecha en 3 (la medida pidió 1,5; aquí 3, por la máquina compartida).
 * 13. Node contra Hermes: cuatro ciudades con su noche, la despejada, sus dos mundos de la Liza y los
 *     durmientes de cerca de cada plaza en ocho tics, con la misma huella en los dos motores y en este
 *     proceso.
 *
 * ═══ LOS SUELOS ═══
 *
 * Un barrio sin cajas se anda entero y no mete a ningún durmiente en ninguna: el verde por conjunto
 * vacío. Por eso se exige que haya cajas de cada tipo, que la búsqueda en anchura choque de verdad
 * (muchos nudos ocupados), que los durmientes anden de verdad (más del 40 % del tiempo, más de 50 m
 * cada uno), que crucen pasos de cebra (cientos de cruces vistos con su semáforo, y miles de sitios
 * en la calzada mirados tic a tic), que la cobertura del grafo mire miles de puntos y que la prueba
 * de la Liza vea los problemas de un mundo roto a propósito antes de creer que el bueno no tiene.
 *
 * En la ciudad: la rejilla de metro en metro se contrasta con `sePuedeEstar` en sus 292.681 puntos antes de
 * fiarse de ella, y cada noche deja 120.000 puntos libres o más; los durmientes, más de 15.000 vueltas
 * miradas, más de 20.000 cruces, alguna vuelta que no sale por una obra, más de 100.000 sitios en una
 * calzada mirados tic a tic y más del 40 % andando; el más cercano, con alguien cerca en más de 100 de sus
 * 300 puntos; y los dos motores, las cuatro ciudades.
 *
 * LO QUE NO SE PROMETE. El §6.4 pide, desde CADA nudo, una cabina en cada banda (100-160 y 180-260 m por
 * calles). Con 20 cabinas, cuatro por distrito, no se encontró reparto que lo cumpla: se promete desde el
 * nudo de cada plaza, siempre, con las obras de cada noche (la noche no elige obras que lo rompan); desde
 * cualquier nudo, con el grafo base, alguna a 80-180 y alguna a 160-280; y las dos bandas exactas en el
 * 97 % de los nudos (el 95 % con las obras). Lo que falte lo decide el reductor (la Llamada).
 *
 * ═══ CÓMO SE HA VISTO ROJA CADA COMPROBACIÓN ═══
 *
 * Primera pasada: las 70 de entonces, en 24 tandas, rompiendo una copia del árbol en el scratchpad
 * del frente «barrio», corriendo esto allí y volviendo a poner los ficheros buenos, comprobado byte
 * a byte. Cada rotura y lo que se puso rojo:
 *
 *  1. Un contador de módulo que suma a la noche en cada llamada → «dos veces» y «cincuenta entre
 *     medias». `typeof performance` en el barrio y `typeof navigator` en los durmientes, y los dos
 *     importando `canonico` → las cuatro de lo estático. El grafo compartido sin congelar → «tocarlo
 *     lanza», «congelado de verdad» y «estropear un barrio no cambia el siguiente» (el 999 del nudo
 *     pasaba al barrio de después). El código sin mayúsculas, la noche sin truncar y un tercer
 *     parámetro → las suyas. La clave de la noche sin código ni noche → «200 distintos» y «otra
 *     noche», pero SÓLO después de mirarlos por dentro: comparados enteros seguían en verde por el
 *     código y la noche que el barrio lleva apuntados.
 *  2. El soportal a 2,9 m, una farola a 21 (sobre el quiosco), el cerco sin esquinas, cortes de
 *     solar a 11, un retranqueo que no entra, una zona de impresión menos, dos desvelados mirando
 *     igual, la glorieta de 58, una arista de 49 m, los pasos de una fila en otro cruce, un pilar del
 *     tren a 19 m, «, » por «. » en el rótulo y los rótulos del soportal sin meter → las catorce
 *     suyas. La fuente sin alto, manzanas de un solo edificio, solares con rendija, coches en la
 *     acera, cabinas desde 20 m, la zona de cabina hasta la fachada y el refugio a 14 m → sus siete.
 *     Un `parpadea` sin valor → «canoniza». Sin quioscos, siempre llovizna y cabinas desde 75 m →
 *     los cuatro suelos de variedad.
 *  3. La distancia a vuelo de cuervo cuadriculado, que fue la primera versión → «se llega andando
 *     lo que declaran». El mundo sin cuerpos → el suelo de la búsqueda. Un jardín vallado en la
 *     plaza con una zona dentro → «se llega» y «no hay bolsas».
 *  4. Cuadrillas siempre de uno, `<=` en el más cercano, sin vueltas junto a la plaza (y el suelo de
 *     gente cerca estaba en diez: seguía verde hasta subirlo a veinte, que es lo que el guion
 *     garantiza). Vueltas sin redondear al minuto, los excluidos contados, la cuadrilla apartada un
 *     metro (a la fachada), el reloj de la vuelta con el `%` de C (los tics negativos), el doble de
 *     paso, pasos de hormiga y `sitioDelDurmiente` apartado al otro lado → cada una la suya.
 *  5. 20 millones de vueltas en el barrio y en el guion, y 60 al cargar → los tres cronómetros. Y
 *     del comprobador: el cronómetro a un fichero que no existe y su Node con una bandera que no
 *     existe → «se empaquetan» y «dicen algo».
 *  6. Hermes buscado donde no está y Babel sin devolver código (del comprobador); `Array.prototype
 *     .at`, que Hermes 0.12 no tiene → «corren sin caerse» y el suelo de las cuatro mesas; una
 *     clausura sobre el `let` de un bucle en el guion (Hermes 0.12 no liga por iteración) → «la MISMA
 *     huella»; y el barrio contando las banderas del proceso → «lo mismo sin empaquetar».
 *
 * Segunda pasada, tras la revisión adversaria: las comprobaciones nuevas y las que cambiaron, en 26
 * tandas más, igual, en `scratchpad/barrio/p2/espejo` (el guion que las corre es `p2/rojos2.py`).
 * Cada rotura y lo que se puso rojo:
 *
 *  1. Los nudos de la rejilla sin congelar → «congelado de verdad». `despejarLaPlaza` con un
 *     parámetro de más, y el barrio importando un valor de la declaración de la Liza → «no esperan
 *     nada más» y «de la Liza y el mundo sólo tipos».
 *  2. Los cruces de la fila de arriba como aparición cercana → «las zonas». La cota de abajo por
 *     encima de la ruta → «las cuatro cabinas», «andando desde el centro» y «alguna que se puede
 *     atajar». Una arista repetida → «el grafo» y «el mundo de la Liza». Los rótulos otra vez por la
 *     fachada entera → «los rótulos». Los coches de las calles, despejables → «lo despejable».
 *     Despejar sin renumerar las cabinas → «la plaza despejada». Siempre dos bancos en el borde →
 *     «variedad de verdad».
 *  3. El grafo de la primera versión (los 16 cruces y nada más) → «el grafo», «todo el suelo de la
 *     glorieta ve algún nudo», «no se rodea» y «fuera de la glorieta». Sin ninguna línea de la plaza
 *     → «el grafo» y «ve algún nudo». Sin las líneas de los huecos entre coches → «no se rodea». Los
 *     coches de la plaza fuera de lo que puede estorbar → «cada arista se anda» (quitar el quiosco
 *     no rompe nada, y se probó: ninguna línea pasa por donde puede estar). `nace` otra vez en el
 *     suelo → «el contrato de mundo.ts» y «el mundo de la Liza». Todas las zonas con el id 1 → «el
 *     mundo de la Liza». La declaración de prueba sin mundo (del comprobador) → su suelo. Lo andado
 *     sin la holgura de la esquina (del comprobador) → «andando desde el centro».
 *  4. El margen del verde otra vez en cinco segundos → «tic a tic» y «10 s por delante». La memoria
 *     por noche sin mirar los semáforos, y sin memoria por noche → «el guion se reusa». El tic sin
 *     mirar al escribir los 48, y el punto sin mirar → las dos de lo que lanza.
 *  5. El cronómetro con el `gc()` de antes → «no barre la memoria a mano». El barrio con veinte
 *     millones de vueltas de más → «3 ms» y «5 ms», también con las quince tomas; el mundo de la
 *     Liza con treinta → «5 ms». El cronómetro diciendo algo que no se lee → «las tomas dicen algo».
 *  6. Una clausura sobre el `let` de un bucle en el mundo de la Liza (Hermes 0.12 no liga por
 *     vuelta) → «la MISMA huella».
 *
 * Tercera pasada, la ciudad abierta (24-sep): las de los pasos 7 a 13 y las del paso 1 que ahora miran
 * cinco ficheros, en 38 corridas, rompiendo copias del árbol en `scratchpad/ciudad-traza/rojos/espejo-*`
 * (el guion que las corre es `rojos/campana.py`), devolviendo los ficheros buenos y comprobándolos byte a
 * byte, con la huella del árbol de trabajo igual antes y después. Corrían cinco a la vez, y con la máquina
 * así los cronómetros de los pasos 5 y 12 se ponían rojos solos: eso no cuenta como rojo de nada. Cada
 * rotura y lo que se puso rojo; «NADA» es una rotura que no se vio, y lo que se cambió para verla:
 *
 *  1. La ciudad importando `canonico`, las plantillas un valor de la ciudad, las trazas un tipo de
 *     `fijo`, los durmientes uno de `azar` y el barrio uno de la ciudad → las cinco de «importa sólo lo
 *     suyo». `typeof performance` en la ciudad, `Date` en las plantillas y `typeof navigator` en las
 *     trazas → las tres de «no lee nada del aparato».
 *  7. Un contador de módulo sumado a los semáforos → «la misma ciudad y la misma noche dos veces». El
 *     código sin pasar a mayúsculas → «sin mayúsculas» (y el reparto, que se guarda por ciudad). Los nudos
 *     del grafo sin congelar → «tocarlo lanza» y «tocarlo no cambió nada». Los edificios con un chorro sin
 *     el código → «otra mesa comparte la traza». El vestido de la primera noche para todas → «el mismo
 *     objeto». La noche de otro código sin lanzar → «lanzan». La cifra de los tríos a 300 → «las cifras
 *     del diseño» y la regla de los tríos, que ya no lee la cifra del módulo. Un parámetro de más → «no
 *     esperan nada más».
 *  8. Un banco de la Porticada sobre la estatua → «ninguna pisa otra» (y los sitios de nacer). Una zona de
 *     impresión sobre la fuente → «zonas de impresión» y «cada zona, libre». Dos sitios de nacer con el
 *     mismo rumbo → «miran cada uno a un sitio». Las bocas empezando dentro de la plaza → NADA: la regla
 *     sólo pedía que no estuvieran del todo dentro; ahora pide la calzada de su calle y pasado el cruce, y
 *     se puso roja. Una línea de más en el Patio → «su subgrafo». La fuente 25 cm más alta → «la Glorieta
 *     es la de hoy».
 *  9. Un soportal escrito en minúscula (el generador lo lee igual) → «mapas bien escritos». Un Patio en
 *     las Torres → «seis plazas». Una plaza en el anillo → «ninguna plaza en el anillo» (y la tabla). Un
 *     callejón en las Torres → «los callejones». Un soportal en las Naves → «los soportales». Una cabina
 *     repetida → «20 cabinas» (y dos cajas que se pisan). Una plaza fuera de su banda, a 700 m de las demás
 *     → «algún trío para cada Bajada» (y la tabla). Un nombre repetido → «los nombres».
 * 10. Troncos de 0,6 m → «canoniza». Dos huecos con el mismo índice → «su forma». Los refugios antes que
 *     las cabinas → «el orden del contrato». Un pilar cada 9 m → «cada manzana». Una diagonal en la
 *     Glorieta → «aristas sólo por los ejes» (y el grafo de la noche: pasa por la fuente). Una distancia 8
 *     m más larga en la tabla → «la tabla es la del grafo». El límite de una plaza 2 m más ancho → «su
 *     límite». El poste fuera de su caja → «su poste en su caja». Las cajas en la celda de su esquina → «las
 *     celdas». Coches y quioscos también donde hay obra → «ninguna caja pisa otra». Obras en las calles
 *     mayores → «las obras». La zona de la cabina hasta el poste → «cada zona, libre». Una farola en medio
 *     de la calzada, y el grafo de la noche sin quitar nada → «el grafo de la noche», cada una. Un callejón
 *     cerrado por sus dos bocas → «no hay bolsas». Tríos aceptados hasta 400 m → «los tríos». Las obras sin
 *     mirar las cabinas de las plazas → «las cabinas», como salió antes de que la noche lo mirara. Las
 *     cuatro cabinas de las Torres amontonadas en una esquina, que es quitar candidatas → «las
 *     cabinas» (y noches sin obras que sirvan). Las zonas del mundo con otro id → «el mundo de la Liza». Las
 *     reapariciones por índice → «nace». Despejar sin renumerar los cortes → «las plazas despejadas».
 *     Semáforos fuera de su ciclo → «el tren y los semáforos». Del comprobador, la rejilla pintando 25 cm
 *     de más → «SUELO: la rejilla»; con `>=` por `>`, o 12,5 cm, NADA, y con razón: con el radio en Q16.16
 *     ningún borde cae en un punto entero de la rejilla, y el primero que cambia está a 15 cm.
 * 11. Ocho por manzana en el Casco → «el reparto». Vueltas a dos por una avenida → «el reparto». Un metro
 *     de más en el perímetro → «dura minutos exactos». Salir aunque la vuelta pase por una obra → «no sale
 *     sólo si», «se anda entera» y «pisan siempre suelo». Una farola en la acera libre, a 1 m de la
 *     fachada, por donde van → «se anda entera» y «pisan siempre suelo». Echarse a cruzar con 5 s de verde
 *     → «se echan a cruzar»; el margen de la avenida a 10 s → NADA, porque por una avenida no cruza nadie
 *     (la regla dice ahora lo que mira, y el reparto mira que nadie cruce una avenida). El guion guardado
 *     por ciudad y no por noche → «no depende del orden». Sin mirar los excluidos → NADA: los cinco de la
 *     prueba casi nunca eran los más cercanos; ahora se excluye a los dos más cercanos de verdad, y rojo.
 *     Los de cerca por índice → «los de cerca». El desempate al revés → «a igual distancia». La lista plana
 *     con `anda` siempre a 1 → «dice lo mismo», después de que el comprobador reventara con tres
 *     durmientes por plaza (pedía el 612 escrito a mano; ahora, el último). Tres por plaza → «gente cerca»
 *     (y el reparto). El doble de paso → «no dan saltos». Cruzar sin esperar → «en la calzada sólo en
 *     verde». `anda` siempre falso → «SUELO: andan». Sin vueltas a dos → «SUELO: salen y cruzan».
 * 12. Treinta millones de vueltas en cada traza nueva → «LA PUERTA»; diez millones en cada mesa → «una
 *     mesa nueva». Del comprobador: el cronómetro a un fichero que no existe → «se empaqueta» y «las tomas
 *     dicen algo»; su Node con una bandera que no existe → «las tomas dicen algo».
 * 13. `Array.prototype.at` → «corren sin caerse». Una clausura sobre el `let` de un bucle DENTRO de
 *     `vestirLaNoche` → NADA: ahí Hermes 0.12 liga bien (también con `-eager`); en una función pequeña
 *     aparte liga mal → «la MISMA huella». El contador de módulo → NADA en «lo mismo sin empaquetar»: la
 *     tanda de este proceso carga su propia copia del módulo; los semáforos con las banderas del proceso →
 *     rojo. Un error sólo en este proceso → «corre en este proceso». Del comprobador: Hermes donde no está,
 *     esbuild con un objetivo que no existe y tres mesas en vez de cuatro → sus tres.
 *
 * Cuarta pasada, el arreglo de la entrega 1 (24-sep): la regla de `campoHasta` contra el Dijkstra del
 * comprobador, su suelo y la puerta por la mediana de la serie, en `scratchpad/ciudad-traza/arreglo2/rojo-*`
 * (el guion es `arreglo2/romper.mjs`), con los ficheros devueltos y comprobados byte a byte:
 *
 * 10. `campoHasta` con una cota de 700 m olvidada → «campoHasta da los metros de un Dijkstra del
 *     comprobador» (y «nace», que ordena los refugios con el mismo campo). El Dijkstra por cubetas sin
 *     mejorar un nudo si lo nuevo es medio metro más corto, y luego tres → NADA, y con razón: en estos grafos
 *     ningún nudo se mejora después de alcanzarlo por primera vez (contado: 0 de 176 campos distintos). Del
 *     comprobador, los campos de la noche sin mirar → «SUELO: los campos contrastados» (256 de 1.216).
 * 12. Seis millones de vueltas en cada traza nueva (≈ 2,7 ms) → NADA, con razón: la mediana de la serie
 *     quedó en 7,6 ms; quince millones → «LA PUERTA», sola (mediana 8,9-9,5 ms).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { arnes } from './arnes';
import { sinComentarios } from './sin-comentarios';
import { canonico, porQueNoEsCanonico } from '../../shared/mecanicas/canonico';
import { deNumero, UNO } from '../../shared/mecanicas/fijo';
import { CLASE_DE_CAJA, problemasDeLaDeclaracion, VERSION_DE_LA_DECLARACION } from '../../shared/mecanicas/liza/declaracion';
import type { LizaDeclarada, MundoDeLaLiza } from '../../shared/mecanicas/liza/declaracion';
import { primeraLosa } from '../../shared/mecanicas/liza/geometria';
import { arenaDe, hayPiso, seAndaEnRecta, sePuedeEstar } from '../../shared/mecanicas/mundo';
import type { Arena } from '../../shared/mecanicas/mundo';
import {
  CARRILES,
  CLASE_DE_ZONA_EN_LA_LIZA,
  ID_DE_LIMITE_EN_LA_LIZA,
  NOMBRES_DE_GLORIETA,
  ROTULOS_DE_NEON,
  ROTULOS_DE_TIENDA,
  barrioDeLaNoche,
  despejarLaPlaza,
  faseDelSemaforo,
  idDeZonaEnLaLiza,
  mundoDeLaLizaDelBarrio,
  mundoDelBarrio,
  pasoAbierto,
  trenEn,
} from '../../shared/arcade/juegos/quiebro-barrio';
import type { Barrio, CajaDelBarrio, Rectangulo, TipoDeCaja } from '../../shared/arcade/juegos/quiebro-barrio';
import {
  ANDA,
  PASOS_POR_TIC,
  durmienteMasCercano,
  durmientesEn,
  escribirLosDurmientes,
  guionDeLosDurmientes,
  sitioDelDurmiente,
} from '../../shared/arcade/juegos/quiebro-durmientes';
import * as C from '../../shared/arcade/juegos/quiebro-ciudad';
import type { CajaDeLaCiudad, CiudadDeLaMesa, GrafoDeLaCiudad, IdDeDistrito, IdDePlantilla, NocheDeLaCiudad } from '../../shared/arcade/juegos/quiebro-ciudad';
import * as D from '../../shared/arcade/juegos/quiebro-durmientes';
import { BOCAS_DE_LA_PLAZA, COCHES_DE_LA_PLAZA, PLANTILLAS_DE_PLAZA } from '../../shared/arcade/juegos/quiebro-plantillas';
import type { PlantillaDePlaza } from '../../shared/arcade/juegos/quiebro-plantillas';
import { TRAZAS_DE_LA_CIUDAD } from '../../shared/arcade/juegos/quiebro-trazas';

const { comprobar, paso, nota, terminar } = arnes();

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(AQUI, '..', '..');
const FICHERO_DEL_BARRIO = path.join(REPO, 'shared', 'arcade', 'juegos', 'quiebro-barrio.ts');
const FICHERO_DE_LOS_DURMIENTES = path.join(REPO, 'shared', 'arcade', 'juegos', 'quiebro-durmientes.ts');
const FICHERO_DE_LA_CIUDAD = path.join(REPO, 'shared', 'arcade', 'juegos', 'quiebro-ciudad.ts');
const FICHERO_DE_LAS_PLANTILLAS = path.join(REPO, 'shared', 'arcade', 'juegos', 'quiebro-plantillas.ts');
const FICHERO_DE_LAS_TRAZAS = path.join(REPO, 'shared', 'arcade', 'juegos', 'quiebro-trazas.ts');

/** El radio de una persona, en metros y en Q16.16. */
const RADIO = 0.35;
const RADIO_EN_FIJO = deNumero(RADIO);

/*
 * LAS CIFRAS DEL DISEÑO, escritas aquí y no importadas del barrio: una comprobación que leyera del
 * propio barrio a qué distancia tienen que estar las cabinas seguiría en verde el día que el barrio
 * cambiara la cifra. Salen de `docs/EL-QUIEBRO.md` (§4.11, §6.1, §8) y del §3.2 de
 * `docs/quiebro/ARQUITECTURA.md`.
 */
/** 3 × 36 + 4 × 12 = 156 m de barrio, de −78 a 78. */
const DEL_CENTRO_AL_BORDE = 78;
/** El solar de una manzana. */
const LADO_DEL_SOLAR = 36;
/** Las calzadas de las cuatro calles de cada eje: calles de 12 m entre solares de 36. */
const EJES = [-72, -24, 24, 72];
/** Media calzada: 6 m de calzada por calle. */
const MEDIA_CALZADA = 3;
/** La manzana del centro, la plaza. */
const LA_PLAZA = 4;
/** «A 60-110 m del centro de la glorieta por calles reales». */
const CABINA_DESDE = 60;
const CABINA_HASTA = 110;
/** Los durmientes de guion de cada barrio. */
const CUANTOS_DURMIENTES = 48;
/** Semáforos de 30 s por sentido, a 20 tics por segundo. */
const CICLO_DEL_SEMAFORO = 1200;
const VERDE = 600;
/** La glorieta de 60 de lado: donde se pelea con cinco o seis, y donde el grafo tiene que verse entero. */
const GLORIETA_60 = 30;

/**
 * `canonico`, sin reventar: un barrio que no canoniza da una cadena que lo dice. Así el paso 1 se
 * pone rojo con su nombre y el paso 2 llega a decir qué campo es, en vez de caerse el guion entero
 * en la primera comparación.
 */
function huella(valor: unknown): string {
  try {
    return canonico(valor);
  } catch (e) {
    return `NO CANONIZA: ${e instanceof Error ? e.message : String(e)}`;
  }
}

/** ¿Lanza esto un `RangeError`? */
function lanzaRango(hacer: () => unknown): boolean {
  try {
    hacer();
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
}

/* ─── Utilidades ──────────────────────────────────────────────────────────── */

function solapan(a: Rectangulo, b: Rectangulo): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;
}

function ensanchado(r: Rectangulo, m: number): Rectangulo {
  return { x0: r.x0 - m, z0: r.z0 - m, x1: r.x1 + m, z1: r.z1 + m };
}

function dentroDe(r: Rectangulo, x: number, z: number): boolean {
  return x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
}

function areaDe(r: Rectangulo): number {
  return (r.x1 - r.x0) * (r.z1 - r.z0);
}

function igualQue(a: Rectangulo, b: Rectangulo | undefined): boolean {
  return b !== undefined && a.x0 === b.x0 && a.z0 === b.z0 && a.x1 === b.x1 && a.z1 === b.z1;
}

/** Todos los números que cuelgan de un valor, con su ruta. */
function losNumeros(valor: unknown, ruta: string, salida: { ruta: string; valor: number }[]): void {
  if (typeof valor === 'number') {
    salida.push({ ruta, valor });
    return;
  }
  if (Array.isArray(valor)) {
    valor.forEach((v, k) => losNumeros(v, `${ruta}.${String(k)}`, salida));
    return;
  }
  if (typeof valor === 'object' && valor !== null) {
    for (const k of Object.keys(valor).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) losNumeros((valor as Record<string, unknown>)[k], `${ruta}.${k}`, salida);
  }
}

/**
 * LAS MESAS DE LA PRUEBA: la de siempre y 199 más, con códigos de cinco letras del alfabeto del
 * servidor y noches del 1 al 10. Escritas por una sucesión fija, no sorteadas: un comprobador con
 * entradas al azar es uno que se pone rojo un día de cada cien y que nadie reproduce.
 */
function lasMesas(cuantas: number): { codigo: string; noche: number }[] {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const salida = [{ codigo: 'QWXYZ', noche: 1 }];
  let h = 20260924;
  while (salida.length < cuantas) {
    let codigo = '';
    for (let k = 0; k < 5; k++) {
      h = (Math.imul(h, 1103515245) + 12345) >>> 0;
      codigo += letras[(h >>> 11) % letras.length] ?? 'A';
    }
    salida.push({ codigo, noche: 1 + (salida.length % 10) });
  }
  return salida;
}

const MESAS = lasMesas(200);
/** Los barrios de las 200 mesas, derivados una vez. */
const BARRIOS: Barrio[] = MESAS.map((m) => barrioDeLaNoche(m.codigo, m.noche));

// ---------------------------------------------------------------------------
paso('1 · Nada entra en el barrio que no sea (código, noche)');
// ---------------------------------------------------------------------------

{
  const cinco = MESAS.slice(0, 5);
  const primeras = cinco.map((m) => huella(barrioDeLaNoche(m.codigo, m.noche)));
  const segundas = cinco.map((m) => huella(barrioDeLaNoche(m.codigo, m.noche)));
  comprobar('el mismo barrio dos veces seguidas, en cinco mesas', primeras.every((c, k) => c === segundas[k]));

  const antes = huella(barrioDeLaNoche('QWXYZ', 1));
  for (let k = 0; k < 50; k++) barrioDeLaNoche(`OTRA${String(k)}`, k);
  comprobar('y el mismo después de derivar cincuenta barrios más entre medias', huella(barrioDeLaNoche('QWXYZ', 1)) === antes);

  /*
   * Estropear un barrio ya derivado no puede cambiar el siguiente: ni lo propio (su lista de cajas,
   * su adorno), ni lo compartido, que además tiene que negarse a cambiar.
   */
  const estropeado = barrioDeLaNoche('QWXYZ', 1) as unknown as { cajas: unknown[]; adorno: { nombre: string }; grafo: { nudos: { x: number }[] } };
  estropeado.cajas.length = 0;
  estropeado.adorno.nombre = 'Otra cosa';
  let negado = false;
  try {
    (estropeado.grafo.nudos[0] as { x: number }).x = 999;
  } catch {
    negado = true;
  }
  comprobar('lo compartido entre barrios está congelado: tocarlo lanza', negado);
  comprobar('y estropear un barrio no cambia el siguiente', huella(barrioDeLaNoche('QWXYZ', 1)) === antes);

  const b = barrioDeLaNoche('QWXYZ', 1);
  const compartidos: [string, unknown][] = [
    ['el grafo', b.grafo],
    ['sus nudos', b.grafo.nudos],
    ['un nudo de la plaza', b.grafo.nudos.find((n) => n.x === 4 && n.z === 4)],
    ['una arista de la rejilla', b.grafo.aristas[b.grafo.aristas.length - 1]],
    ['los límites', b.limites],
    ['los tramos de acera', b.aceras.tramos],
    ['los sitios de nacer de los desvelados', b.nace.desvelado],
    ['la primera caja del cerco', b.cajas[0]],
    ['el grafo de la Liza', mundoDeLaLizaDelBarrio(b).grafo],
  ];
  const sinCongelar = compartidos.filter(([, v]) => v === undefined || !Object.isFrozen(v)).map(([n]) => n);
  comprobar('y está congelado de verdad, no por casualidad', sinCongelar.length === 0, sinCongelar);

  comprobar('el código sin mayúsculas da el mismo barrio', huella(barrioDeLaNoche('qwxyz', 1)) === antes);
  comprobar('la noche con decimales se trunca, y lo que no es número es la noche 0', huella(barrioDeLaNoche('QWXYZ', 1.75)) === antes && huella(barrioDeLaNoche('QWXYZ', Number.NaN)) === huella(barrioDeLaNoche('QWXYZ', 0)));
  /*
   * Distintos por DENTRO: sin el código, la noche y la semilla que el barrio lleva apuntados. Con
   * ellos, 200 barrios idénticos salían «distintos» por su etiqueta —se vio al romper la clave de
   * la noche para que no mirara nada: esto seguía en verde—.
   */
  const contenido = (x: Barrio): string => huella({ ...x, codigo: '', noche: 0, semilla: 0 });
  const distintos = new Set(BARRIOS.map(contenido)).size;
  comprobar('las 200 mesas dan 200 barrios distintos, por dentro', distintos === MESAS.length, distintos);
  comprobar('y la misma mesa en otra noche es otro barrio, por dentro', contenido(barrioDeLaNoche('QWXYZ', 2)) !== contenido(barrioDeLaNoche('QWXYZ', 1)));
  comprobar(
    'las funciones no esperan nada más que lo suyo',
    barrioDeLaNoche.length === 2 &&
      mundoDelBarrio.length === 1 &&
      mundoDeLaLizaDelBarrio.length === 1 &&
      despejarLaPlaza.length === 1 &&
      sitioDelDurmiente.length === 3 &&
      durmientesEn.length === 2 &&
      guionDeLosDurmientes.length === 1,
  );

  /*
   * Lo estático: lo que importan los dos ficheros y lo que leen del mundo. `verify:pureza` ya caza
   * el reloj y el azar sin semilla en todo `shared/`; aquí se mira además lo que haría que el barrio
   * dependiera del aparato: el proceso, el navegador, el almacenamiento, un `require` o un `import()`.
   * La declaración de la Liza entra sólo por sus tipos (`import type`): el barrio no la carga.
   */
  /*
   * Lo que cada fichero puede importar, y de dónde sólo tipos. Las plantillas y las trazas son DATOS: no cargan
   * nada, y de la ciudad sólo toman tipos (la ciudad las carga a ellas; al revés sería un ciclo). La ciudad y
   * los durmientes cargan el barrio (su generador de manzanas, el chorro de azar), y la ciudad las plantillas
   * y las trazas; de la Liza y del mundo, todos sólo tipos.
   */
  const LIZA_Y_MUNDO = ['../../mecanicas/mundo', '../../mecanicas/liza/declaracion'];
  const LO_DE_CADA_UNO: readonly { fichero: string; permitidos: readonly string[]; soloTipos: readonly string[] }[] = [
    { fichero: FICHERO_DEL_BARRIO, permitidos: ['../../mecanicas/azar', '../../mecanicas/fijo', '../../mecanicas/semilla', ...LIZA_Y_MUNDO], soloTipos: LIZA_Y_MUNDO },
    { fichero: FICHERO_DE_LOS_DURMIENTES, permitidos: ['../../mecanicas/fijo', './quiebro-barrio', './quiebro-ciudad'], soloTipos: [] },
    { fichero: FICHERO_DE_LA_CIUDAD, permitidos: ['../../mecanicas/fijo', './quiebro-barrio', './quiebro-plantillas', './quiebro-trazas', ...LIZA_Y_MUNDO], soloTipos: LIZA_Y_MUNDO },
    { fichero: FICHERO_DE_LAS_PLANTILLAS, permitidos: ['./quiebro-barrio', './quiebro-ciudad'], soloTipos: ['./quiebro-barrio', './quiebro-ciudad'] },
    { fichero: FICHERO_DE_LAS_TRAZAS, permitidos: ['./quiebro-barrio', './quiebro-ciudad'], soloTipos: ['./quiebro-barrio', './quiebro-ciudad'] },
  ];
  const AJENOS = /\b(process|navigator|document|localStorage|sessionStorage|performance|Date|require|globalThis|window)\b|\bMath\s*\.\s*random\b|\bimport\s*\(/;
  for (const { fichero, permitidos, soloTipos } of LO_DE_CADA_UNO) {
    const nombre = path.basename(fichero);
    const codigo = sinComentarios(fs.readFileSync(fichero, 'utf8'));
    const importa = [...codigo.matchAll(/\bimport\s+(type\s+)?[^;]*?\bfrom\s+'([^']+)'/g)].map((m) => ({ deTipos: m[1] !== undefined, de: m[2] ?? '' }));
    const deMas = importa.filter((i) => !permitidos.includes(i.de)).map((i) => i.de);
    const cargaDeMas = importa.filter((i) => soloTipos.includes(i.de) && !i.deTipos).map((i) => i.de);
    comprobar(`${nombre} importa sólo lo suyo de shared/, y de lo que no carga sólo tipos`, importa.length > 0 && deMas.length === 0 && cargaDeMas.length === 0, { importa, deMas, cargaDeMas });
    const ajeno = AJENOS.exec(codigo);
    comprobar(`${nombre} no lee nada del aparato: ni proceso, ni navegador, ni reloj`, ajeno === null, ajeno?.[0]);
  }
}

// ---------------------------------------------------------------------------
paso('2 · Lo que el barrio es, en 200 noches');
// ---------------------------------------------------------------------------

{
  const fallos = new Map<string, unknown[]>();
  const apuntar = (que: string, detalle: unknown): void => {
    const lista = fallos.get(que) ?? [];
    if (lista.length < 3) lista.push(detalle);
    fallos.set(que, lista);
  };
  const REGLAS = [
    'canoniza',
    'toda medida es un múltiplo de 0,25 m (y así de 0,05) y todo índice un entero',
    'las cajas están bien formadas, son altas y caen dentro del cerco',
    'ninguna caja pisa otra',
    'el cerco cierra el barrio: sus cajas cubren el anillo de 78 a 80 sin huecos',
    'nueve manzanas, la glorieta en medio sin edificios y las demás con 2 a 4',
    'cada solar se reparte ENTERO entre sus edificios, sin que se pisen',
    'ningún edificio baja de 12 × 12, y todos dan a la calle',
    'cada edificio tiene su caja: la huella, menos el soportal si lo tiene, y sus pilares',
    'las alturas van por tramos seguidos, con los retranqueos después del cuerpo',
    'ninguna zona, sitio de nacer ni cabina tiene una caja a menos de 0,35 m',
    'las zonas: 12 de aparición junto a la plaza, 12 lejanas en los cruces de fuera, 8 de impresión dentro de la plaza, 4 de cabina y el refugio',
    'las cuatro cabinas: una por cuadrante (NE, SE, SO, NO), con la carrera en 60-110 m con atajos y sin ellos',
    'se descuelga a 1,5 m o menos del poste desde cualquier punto de la zona de cabina',
    'el refugio está en el borde de la glorieta, dentro de los 48, con sus tres sitios en su zona',
    'los desvelados nacen en la plaza, seis, mirando cada uno a un sitio',
    'los límites: glorieta48, glorieta60 y barrio, con sus medidas',
    'el grafo: los 16 cruces delante con sus 24 calles de 48 m, detrás aristas en línea y sin repetir, nudos dentro de la plaza, y conexo',
    'la red de aceras: 64 nudos, 112 tramos, 4 pasos de cebra por cruce, y conexa',
    'el tren cruza la plaza con cuatro pilares en su línea',
    'el adorno: tiempo, hora de madrugada, nombre de la lista y rótulo «nombre, h:mm»',
    'los rótulos: textos de las listas sin repetirse; los de tienda ENTEROS en la pared de su planta baja, los neones en su fachada',
    'lo despejable son los coches de junto a la plaza (2 o 3) y los bancos de su borde (2 a 4), y nada más',
    'la plaza despejada: las mismas cajas sin las despejables y en su orden, cada índice renumerado a la misma caja, y lo demás igual',
  ];

  const variedad = {
    tiempos: new Set<string>(),
    nombres: new Set<string>(),
    porManzana: new Set<number>(),
    conSoportal: 0,
    conRetranqueo: 0,
    cochesDePlaza: new Set<number>(),
    bancosDelBorde: new Set<number>(),
    ejesDelTren: new Set<string>(),
    distancias: [] as number[],
    atajos: 0,
    quioscos: 0,
    tipos: new Set<TipoDeCaja>(),
  };

  for (let k = 0; k < BARRIOS.length; k++) {
    const b = BARRIOS[k] as Barrio;
    const id = `${b.codigo}#${String(b.noche)}`;
    const mal = (regla: number, detalle: unknown): void => apuntar(REGLAS[regla] as string, { mesa: id, detalle });

    const porque = porQueNoEsCanonico(b);
    if (porque !== null) mal(0, porque);

    const numeros: { ruta: string; valor: number }[] = [];
    losNumeros(b, 'barrio', numeros);
    for (const n of numeros) if (!Number.isFinite(n.valor) || n.valor * 4 !== Math.round(n.valor * 4)) mal(1, n);

    const cajas = b.cajas;
    for (const [i, c] of cajas.entries()) {
      variedad.tipos.add(c.tipo);
      if (!(c.x0 < c.x1 && c.z0 < c.z1) || c.clase !== 'alta' || c.alto <= 0 || c.x0 < -80 || c.x1 > 80 || c.z0 < -80 || c.z1 > 80) mal(2, { i, c });
      if (!Number.isInteger(c.mira) || c.mira < 0 || c.mira > 255) mal(1, { i, mira: c.mira });
      for (let j = i + 1; j < cajas.length; j++) {
        const d = cajas[j] as CajaDelBarrio;
        if (solapan(c, d)) mal(3, { i, j, a: c, b: d });
      }
    }
    /* El cerco, sin huecos: la suma de las áreas de sus cajas es la del anillo. */
    const cerco = cajas.filter((c) => c.tipo === 'fachada-exterior' || c.tipo === 'valla');
    const anillo = 160 * 160 - 156 * 156;
    const areaDelCerco = cerco.reduce((s, c) => s + areaDe(c), 0);
    if (areaDelCerco !== anillo || cerco.some((c) => Math.max(Math.abs(c.x0), Math.abs(c.x1), Math.abs(c.z0), Math.abs(c.z1)) !== 80)) mal(4, { areaDelCerco, anillo });

    if (b.manzanas.length !== 9) mal(5, b.manzanas.length);
    for (const m of b.manzanas) {
      const esGlorieta = m.indice === LA_PLAZA;
      if (esGlorieta !== (m.tipo === 'glorieta') || (esGlorieta ? m.edificios.length !== 0 : m.edificios.length < 2 || m.edificios.length > 4)) mal(5, m);
      if (!esGlorieta) variedad.porManzana.add(m.edificios.length);
      const suyos = m.edificios.map((e) => b.edificios[e]).filter((e) => e !== undefined);
      const area = suyos.reduce((s, e) => s + areaDe(e.huella), 0);
      const fuera = suyos.filter((e) => !(e.huella.x0 >= m.solar.x0 && e.huella.x1 <= m.solar.x1 && e.huella.z0 >= m.solar.z0 && e.huella.z1 <= m.solar.z1));
      let sePisan = false;
      for (let a = 0; a < suyos.length; a++) for (let c = a + 1; c < suyos.length; c++) if (solapan((suyos[a] as (typeof suyos)[number]).huella, (suyos[c] as (typeof suyos)[number]).huella)) sePisan = true;
      if (!esGlorieta && (area !== LADO_DEL_SOLAR * LADO_DEL_SOLAR || fuera.length > 0 || sePisan)) mal(6, { manzana: m.indice, area, fuera: fuera.length, sePisan });
    }
    for (const e of b.edificios) {
      const h = e.huella;
      if (h.x1 - h.x0 < 12 || h.z1 - h.z0 < 12 || e.fachadas.length === 0) mal(7, { e: e.indice, h, fachadas: e.fachadas.length });
      const suCaja = cajas[e.caja];
      const fondo = 3;
      const esperada =
        e.soportal === 'norte' ? { ...h, z0: h.z0 + fondo } : e.soportal === 'sur' ? { ...h, z1: h.z1 - fondo } : e.soportal === 'este' ? { ...h, x1: h.x1 - fondo } : e.soportal === 'oeste' ? { ...h, x0: h.x0 + fondo } : h;
      const pilaresBien = e.pilares.every((p) => {
        const c = cajas[p];
        return c !== undefined && c.tipo === 'pilar-de-soportal' && c.edificio === e.indice && c.x0 >= h.x0 && c.x1 <= h.x1 && c.z0 >= h.z0 && c.z1 <= h.z1;
      });
      const soportalBien = e.soportal === null ? e.pilares.length === 0 : e.pilares.length >= 2 && e.fachadas.some((f) => f.cara === e.soportal && f.bajo === 'soportal');
      if (suCaja === undefined || suCaja.tipo !== 'edificio' || suCaja.edificio !== e.indice || !igualQue(esperada, suCaja) || !pilaresBien || !soportalBien) {
        mal(8, { e: e.indice, soportal: e.soportal, caja: suCaja, esperada });
      }
      if (e.soportal !== null) variedad.conSoportal++;
      if (e.tramos.length > 2) variedad.conRetranqueo++;
      const t = e.tramos;
      const seguidos = t.every((x, i) => i === 0 || x.desde === (t[i - 1] as (typeof t)[number]).hasta);
      const entrantes = t.every((x, i) => (i < 2 ? x.entrante === 0 : x.entrante > (t[i - 1] as (typeof t)[number]).entrante));
      if (t.length < 2 || (t[0] as (typeof t)[number]).desde !== 0 || !seguidos || !entrantes || e.alto !== (t[t.length - 1] as (typeof t)[number]).hasta) mal(9, { e: e.indice, tramos: t });
    }

    /* Lo que tiene que estar libre, con el radio de una persona. */
    const libre = (r: Rectangulo): boolean => !cajas.some((c) => solapan(ensanchado(r, RADIO), c));
    const punto = (x: number, z: number): Rectangulo => ({ x0: x, z0: z, x1: x, z1: z });
    for (const zona of b.zonas) {
      if (!libre(zona.caja) || !(zona.caja.x0 < zona.caja.x1 && zona.caja.z0 < zona.caja.z1)) mal(10, { zona: zona.id });
    }
    for (const s of [...b.nace.desvelado, ...b.nace.refugio]) if (!libre(punto(s.x, s.z))) mal(10, { nace: s });
    for (const c of [...b.cabinas, b.refugio]) if (!libre(punto(c.sitio.x, c.sitio.z))) mal(10, { cabina: c.id });

    const deClase = (clase: string): typeof b.zonas => b.zonas.filter((z) => z.clase === clase);
    const ids = new Set(b.zonas.map((z) => z.id));
    const lejosDelCentro = (r: Rectangulo): number => Math.max(Math.abs(r.x0), Math.abs(r.x1), Math.abs(r.z0), Math.abs(r.z1));
    const impresionEnLaPlaza = deClase('impresion').every((z) => z.caja.x0 >= -18 && z.caja.x1 <= 18 && z.caja.z0 >= -18 && z.caja.z1 <= 18);
    /* Las de aparición, a un paso de la glorieta de 60 (las bocas llegan a 33,5); las lejanas, en los cruces de fuera. */
    const aparicionCerca = deClase('aparicion').every((z) => lejosDelCentro(z.caja) <= 34);
    const lejanasLejos = deClase('aparicion-lejana').every((z) => lejosDelCentro(z.caja) >= 69.5);
    const enElBarrio = b.zonas.every((z) => z.caja.x0 >= -DEL_CENTRO_AL_BORDE && z.caja.x1 <= DEL_CENTRO_AL_BORDE && z.caja.z0 >= -DEL_CENTRO_AL_BORDE && z.caja.z1 <= DEL_CENTRO_AL_BORDE);
    if (
      deClase('aparicion').length !== 12 ||
      deClase('aparicion-lejana').length !== 12 ||
      deClase('impresion').length !== 8 ||
      deClase('cabina').length !== 4 ||
      deClase('refugio').length !== 1 ||
      ids.size !== b.zonas.length ||
      b.zonas.length !== 37 ||
      !impresionEnLaPlaza ||
      !aparicionCerca ||
      !lejanasLejos ||
      !enElBarrio
    ) {
      mal(11, { ids: ids.size, aparicionCerca, lejanasLejos });
    }

    const cuadrantes = b.cabinas.map((c) => (c.sitio.z < 0 ? (c.sitio.x > 0 ? 'NE' : 'NO') : c.sitio.x > 0 ? 'SE' : 'SO'));
    const cabinasBien =
      b.cabinas.length === 4 &&
      cuadrantes.join(',') === 'NE,SE,SO,NO' &&
      b.cabinas.every((c, q) => {
        const poste = cajas[c.caja];
        return (
          c.id === `cabina-${String(q + 1)}` &&
          c.zona === c.id &&
          c.distancia >= Math.abs(c.sitio.x) + Math.abs(c.sitio.z) &&
          c.atajando <= c.distancia &&
          c.atajando >= CABINA_DESDE &&
          c.distancia <= CABINA_HASTA &&
          poste !== undefined &&
          poste.tipo === 'cabina' &&
          dentroDe(poste, c.poste.x, c.poste.z)
        );
      });
    if (!cabinasBien) mal(12, b.cabinas.map((c) => ({ id: c.id, sitio: c.sitio, distancia: c.distancia, atajando: c.atajando })));
    for (const c of b.cabinas) {
      variedad.distancias.push(c.distancia);
      if (c.atajando < c.distancia) variedad.atajos++;
    }
    for (const c of b.cabinas) {
      const z = b.zonas.find((x) => x.id === c.zona);
      const esquinas = z === undefined ? [] : [[z.caja.x0, z.caja.z0], [z.caja.x1, z.caja.z0], [z.caja.x0, z.caja.z1], [z.caja.x1, z.caja.z1]];
      const lejos = esquinas.filter(([x, zz]) => ((x as number) - c.poste.x) ** 2 + ((zz as number) - c.poste.z) ** 2 > 1.5 * 1.5);
      if (z === undefined || lejos.length > 0 || !dentroDe(z.caja, c.sitio.x, c.sitio.z)) mal(13, { cabina: c.id, zona: z?.caja, poste: c.poste });
    }
    const r = b.refugio;
    const zonaRefugio = b.zonas.find((z) => z.id === 'refugio');
    const alBorde = Math.max(Math.abs(r.poste.x), Math.abs(r.poste.z)) >= 16 && Math.max(Math.abs(r.poste.x), Math.abs(r.poste.z)) <= 18;
    if (
      !alBorde ||
      zonaRefugio === undefined ||
      !b.nace.refugio.every((s) => dentroDe(zonaRefugio.caja, s.x, s.z) && Math.abs(s.x) <= 24 && Math.abs(s.z) <= 24) ||
      b.nace.refugio.length !== 3 ||
      cajas[r.caja]?.tipo !== 'cabina'
    ) {
      mal(14, { refugio: r, zona: zonaRefugio?.caja });
    }
    const rumbos = new Set(b.nace.desvelado.map((s) => s.rumbo));
    if (b.nace.desvelado.length !== 6 || rumbos.size !== 6 || !b.nace.desvelado.every((s) => Math.abs(s.x) < 18 && Math.abs(s.z) < 18)) mal(15, b.nace.desvelado);

    const limite = (idl: string): Rectangulo | undefined => b.limites.find((l) => l.id === idl)?.caja;
    const cuadra = (rr: Rectangulo | undefined, m: number): boolean => rr !== undefined && rr.x0 === -m && rr.z0 === -m && rr.x1 === m && rr.z1 === m;
    if (b.limites.length !== 3 || !cuadra(limite('glorieta48'), 24) || !cuadra(limite('glorieta60'), GLORIETA_60) || !cuadra(limite('barrio'), DEL_CENTRO_AL_BORDE)) mal(16, b.limites);

    /*
     * El grafo: los 16 cruces delante (fila × 4 + columna) y las 24 calles de cruce a cruce, con su
     * tramo; detrás, aristas en línea con un eje, de largo exacto, sin bucles ni repetidas; nudos
     * DENTRO de la plaza (la primera versión no tenía ninguno: ése fue el hallazgo) y todos unidos.
     */
    const g = b.grafo;
    const cruces = g.nudos.slice(0, 16).every((n, i) => n.x === EJES[i % 4] && n.z === EJES[Math.floor(i / 4)]);
    const calles = g.aristas.slice(0, 24).every((a) => {
      const t = a.tramo === null ? undefined : b.calles[a.tramo];
      const p = g.nudos[a.a];
      const q = g.nudos[a.b];
      return t !== undefined && p !== undefined && q !== undefined && t.cruces[0] === a.a && t.cruces[1] === a.b && a.largo === 48 && Math.abs(p.x - q.x) + Math.abs(p.z - q.z) === 48 && (p.x === q.x || p.z === q.z);
    });
    const vistas = new Set<string>();
    let rejillaBien = true;
    for (const a of g.aristas.slice(24)) {
      const p = g.nudos[a.a];
      const q = g.nudos[a.b];
      const llave = a.a < a.b ? `${String(a.a)}-${String(a.b)}` : `${String(a.b)}-${String(a.a)}`;
      if (p === undefined || q === undefined || a.a === a.b || a.tramo !== null || vistas.has(llave) || !(p.x === q.x || p.z === q.z) || a.largo !== Math.abs(p.x - q.x) + Math.abs(p.z - q.z) || a.largo <= 0) rejillaBien = false;
      vistas.add(llave);
    }
    const enLaPlaza = g.nudos.filter((n) => Math.abs(n.x) < 18 && Math.abs(n.z) < 18).length;
    const dentro = g.nudos.every((n) => Math.abs(n.x) < DEL_CENTRO_AL_BORDE && Math.abs(n.z) < DEL_CENTRO_AL_BORDE);
    const vecinos: number[][] = g.nudos.map(() => []);
    for (const a of g.aristas) {
      vecinos[a.a]?.push(a.b);
      vecinos[a.b]?.push(a.a);
    }
    const unidos = new Set([0]);
    const cola = [0];
    while (cola.length > 0) {
      const u = cola.pop() as number;
      for (const v of vecinos[u] ?? []) {
        if (unidos.has(v)) continue;
        unidos.add(v);
        cola.push(v);
      }
    }
    if (g.nudos.length <= 16 || g.aristas.length <= 24 || !cruces || !calles || !rejillaBien || enLaPlaza < 40 || !dentro || unidos.size !== g.nudos.length) {
      mal(17, { nudos: g.nudos.length, aristas: g.aristas.length, cruces, calles, rejillaBien, enLaPlaza, dentro, unidos: unidos.size });
    }

    const ac = b.aceras;
    const pasos = ac.tramos.filter((t) => t.tipo === 'paso');
    const porCruce = new Array<number>(16).fill(0);
    let pasosBien = true;
    for (const t of pasos) {
      if (t.cruce === null) {
        pasosBien = false;
        continue;
      }
      porCruce[t.cruce] = (porCruce[t.cruce] ?? 0) + 1;
      const p = ac.nudos[t.a];
      const q = ac.nudos[t.b];
      const cruce = g.nudos[t.cruce];
      if (p === undefined || q === undefined || cruce === undefined) {
        pasosBien = false;
        continue;
      }
      const mx = (p.x + q.x) / 2;
      const mz = (p.z + q.z) / 2;
      /* Un paso cruza la calzada de su cruce: su punto medio está en el eje de la calle que cruza, a 5 m del cruce. */
      const cruza = t.eje === 'x' ? mx === cruce.x && Math.abs(mz - cruce.z) === 5 : mz === cruce.z && Math.abs(mx - cruce.x) === 5;
      if (!cruza || t.largo !== 10) pasosBien = false;
    }
    const tocados = new Set([0]);
    for (let vuelta = 0; vuelta < 64; vuelta++) {
      for (const t of ac.tramos) {
        if (!tocados.has(t.a) && !tocados.has(t.b)) continue;
        tocados.add(t.a);
        tocados.add(t.b);
      }
    }
    const nudosDeAcera = ac.nudos.length === 64 && ac.nudos.every((n, i) => n.x === CARRILES[i % 8] && n.z === CARRILES[Math.floor(i / 8)]);
    if (!nudosDeAcera || ac.tramos.length !== 112 || pasos.length !== 64 || !porCruce.every((n) => n === 4) || !pasosBien || tocados.size !== 64 || ac.semaforos.length !== 16 || !ac.semaforos.every((s) => s >= 0 && s < CICLO_DEL_SEMAFORO)) {
      mal(18, { pasos: pasos.length, porCruce, pasosBien, tocados: tocados.size });
    }

    const tr = b.tren;
    variedad.ejesDelTren.add(tr.eje);
    const pilares = tr.pilares.map((p) => cajas[p]);
    const enLinea = pilares.every((c) => c !== undefined && c.tipo === 'pilar-del-tren' && (tr.eje === 'x' ? (c.z0 + c.z1) / 2 === tr.linea : (c.x0 + c.x1) / 2 === tr.linea) && c.x0 >= -18 && c.x1 <= 18 && c.z0 >= -18 && c.z1 <= 18);
    let trenBien = pilares.length === 4 && enLinea && tr.cadaTics >= 700 && tr.cadaTics <= 900 && tr.desfaseTics >= 0 && tr.desfaseTics < tr.cadaTics;
    let pasa = 0;
    for (let t = 0; t < 2000; t += 7) {
      const en = trenEn(b, t);
      if (en === null) continue;
      pasa++;
      if (en.cabeza < tr.desde || en.cabeza > tr.hasta || en.cola < tr.desde || en.cola > tr.hasta) trenBien = false;
    }
    if (!trenBien || pasa === 0) mal(19, { tren: tr, pasa });

    const a = b.adorno;
    variedad.tiempos.add(a.tiempo);
    variedad.nombres.add(a.nombre);
    const hora = `${String(a.hora.h)}:${a.hora.m < 10 ? '0' : ''}${String(a.hora.m)}`;
    const adornoBien =
      ['llovizna', 'aguacero', 'niebla'].includes(a.tiempo) &&
      a.hora.h >= 1 &&
      a.hora.h <= 4 &&
      a.hora.m >= 0 &&
      a.hora.m <= 59 &&
      NOMBRES_DE_GLORIETA.map((n) => `Glorieta ${n}`).includes(a.nombre) &&
      a.rotulo === `${a.nombre}, ${hora}`;
    if (!adornoBien) mal(20, { tiempo: a.tiempo, hora: a.hora, nombre: a.nombre, rotulo: a.rotulo });

    /*
     * Un rótulo de tienda va ENTERO sobre la pared de la planta baja de su edificio —la caja con la
     * que se choca, que es la que pinta la ciudad—: en el plano de esa cara de la caja y con su
     * ancho dentro de lo que la caja mide a lo largo. La primera versión miraba la fachada entera, y
     * al lado de un soportal la planta baja es 3 m más corta: 306 rótulos colgaban sobre el hueco.
     */
    const textos = a.rotulos.map((x) => x.texto);
    let rotulosBien = new Set(textos).size === textos.length && a.rotulos.length >= 8;
    const colgando: unknown[] = [];
    for (const x of a.rotulos) {
      const e = b.edificios[x.edificio];
      const f = e?.fachadas.find((ff) => ff.cara === x.cara);
      const bajo = e === undefined ? undefined : cajas[e.caja];
      const lista = x.clase === 'tienda' ? ROTULOS_DE_TIENDA : ROTULOS_DE_NEON;
      if (e === undefined || f === undefined || bajo === undefined || !lista.includes(x.texto) || x.y <= 0 || x.ancho <= 0 || x.alto <= 0) {
        rotulosBien = false;
        continue;
      }
      const porX = f.cara === 'norte' || f.cara === 'sur';
      const [enPlano, aLoLargo] = porX ? [x.z, x.x] : [x.x, x.z];
      if (x.clase === 'tienda') {
        const plano = f.cara === 'norte' ? bajo.z0 : f.cara === 'sur' ? bajo.z1 : f.cara === 'este' ? bajo.x1 : bajo.x0;
        const [p0, p1] = porX ? [bajo.x0, bajo.x1] : [bajo.z0, bajo.z1];
        if (f.bajo === 'portales' || enPlano !== plano || aLoLargo - x.ancho / 2 < p0 || aLoLargo + x.ancho / 2 > p1) {
          rotulosBien = false;
          colgando.push({ texto: x.texto, cara: x.cara, de: aLoLargo - x.ancho / 2, a: aLoLargo + x.ancho / 2, pared: [p0, p1] });
        }
      } else if (enPlano !== f.linea || aLoLargo < f.desde || aLoLargo > f.hasta) {
        rotulosBien = false;
      }
    }
    if (!rotulosBien) mal(21, { rotulos: a.rotulos.length, textos: textos.length, colgando: colgando.slice(0, 2) });

    /*
     * Lo despejable: los coches de la acera de la plaza (los que caen dentro de ±24) y los bancos del
     * borde (a 16 o más del centro); ni un coche de otra calle, ni un banco del anillo, ni el quiosco.
     */
    const despejables = cajas.filter((c) => c.despejable);
    const cochesDePlaza = cajas.filter((c) => c.tipo === 'coche' && lejosDelCentro(c) <= 24);
    const bancosDelBorde = cajas.filter((c) => c.tipo === 'banco' && lejosDelCentro(c) >= 16);
    const esperadas = new Set([...cochesDePlaza, ...bancosDelBorde]);
    if (despejables.length !== esperadas.size || !despejables.every((c) => esperadas.has(c)) || cochesDePlaza.length < 2 || cochesDePlaza.length > 3 || bancosDelBorde.length < 2 || bancosDelBorde.length > 4) {
      mal(22, { despejables: despejables.map((c) => c.tipo), coches: cochesDePlaza.length, bancos: bancosDelBorde.length });
    }
    variedad.cochesDePlaza.add(cochesDePlaza.length);
    variedad.bancosDelBorde.add(bancosDelBorde.length);

    /*
     * La plaza despejada: las cajas que quedan son las mismas y en el mismo orden; todo índice
     * (edificio, pilares, cabinas, refugio, tren) apunta a la MISMA caja que antes; lo demás no
     * cambia; y despejar lo despejado no hace nada.
     */
    const d = despejarLaPlaza(b);
    const quedan = cajas.filter((c) => !c.despejable);
    const mismaCaja = (i: number, j: number): boolean => cajas[i] !== undefined && d.cajas[j] === cajas[i];
    const renumerado =
      d.edificios.every((e, i) => {
        const o = b.edificios[i];
        return o !== undefined && mismaCaja(o.caja, e.caja) && e.pilares.length === o.pilares.length && e.pilares.every((p, k) => mismaCaja(o.pilares[k] as number, p));
      }) &&
      d.cabinas.every((c, i) => mismaCaja((b.cabinas[i] as (typeof b.cabinas)[number]).caja, c.caja)) &&
      mismaCaja(b.refugio.caja, d.refugio.caja) &&
      d.tren.pilares.every((p, i) => mismaCaja(b.tren.pilares[i] as number, p));
    const sinIndices = (x: Barrio): string =>
      huella({ ...x, plazaDespejada: null, cajas: null, edificios: x.edificios.map((e) => ({ ...e, caja: 0, pilares: [] })), cabinas: x.cabinas.map((c) => ({ ...c, caja: 0 })), refugio: { ...x.refugio, caja: 0 }, tren: { ...x.tren, pilares: [] } });
    if (
      !d.plazaDespejada ||
      b.plazaDespejada ||
      d.cajas.length !== quedan.length ||
      !d.cajas.every((c, i) => c === quedan[i]) ||
      !renumerado ||
      sinIndices(d) !== sinIndices(b) ||
      despejarLaPlaza(d) !== d
    ) {
      mal(23, { cajas: d.cajas.length, quedan: quedan.length, renumerado });
    }

    variedad.quioscos += cajas.filter((c) => c.tipo === 'quiosco-de-prensa').length;
  }

  for (const regla of REGLAS) comprobar(regla, !fallos.has(regla), fallos.get(regla));

  const dist = variedad.distancias;
  const TIPOS: TipoDeCaja[] = ['edificio', 'pilar-de-soportal', 'fachada-exterior', 'valla', 'fuente', 'quiosco', 'banco', 'pilar-del-tren', 'farola', 'coche', 'quiosco-de-prensa', 'cabina'];
  nota(
    `200 barrios: ${String(variedad.nombres.size)} nombres, tiempos ${[...variedad.tiempos].join('/')}, ` +
      `edificios por manzana ${[...variedad.porManzana].sort().join('/')}, ${String(variedad.conSoportal)} soportales, ` +
      `${String(variedad.conRetranqueo)} edificios con retranqueo, ${String(variedad.quioscos)} quioscos, cabinas de ${String(Math.min(...dist))} a ${String(Math.max(...dist))} m ` +
      `(${String(variedad.atajos)} que se pueden atajar)`,
  );
  comprobar('SUELO: salen cajas de todos los tipos', TIPOS.every((t) => variedad.tipos.has(t)), TIPOS.filter((t) => !variedad.tipos.has(t)));
  comprobar(
    'y las 200 noches dan variedad de verdad: los tres tiempos, 20 nombres o más, manzanas de 2, 3 y 4 edificios, los dos ejes del tren, dos o tres coches en la plaza y de dos a cuatro bancos en su borde',
    variedad.tiempos.size === 3 &&
      variedad.nombres.size >= 20 &&
      variedad.porManzana.size === 3 &&
      variedad.ejesDelTren.size === 2 &&
      variedad.cochesDePlaza.size === 2 &&
      variedad.bancosDelBorde.size === 3,
    { tiempos: [...variedad.tiempos], nombres: variedad.nombres.size, porManzana: [...variedad.porManzana], coches: [...variedad.cochesDePlaza], bancos: [...variedad.bancosDelBorde] },
  );
  comprobar('soportales, retranqueos y quioscos en cantidad, no de milagro', variedad.conSoportal >= 200 && variedad.conRetranqueo >= 500 && variedad.quioscos >= 400, variedad);
  comprobar('y cabinas cerca y lejos: de menos de 70 m a más de 100, y alguna que se puede atajar', Math.min(...dist) < 70 && Math.max(...dist) > 100 && variedad.atajos > 0, { min: Math.min(...dist), max: Math.max(...dist), atajos: variedad.atajos });
}

// ---------------------------------------------------------------------------
paso('3 · Se anda y se navega: arenaDe(mundoDelBarrio), la Liza, la búsqueda en anchura y el grafo');
// ---------------------------------------------------------------------------

/** La rejilla de la búsqueda: cada medio metro de −79 a 79. */
const PASO_DE_REJILLA = 0.5;
const DESDE = -79;
const NUDOS_POR_LADO = Math.round((2 * 79) / PASO_DE_REJILLA) + 1;
const coord = (i: number): number => DESDE + i * PASO_DE_REJILLA;
const indiceDe = (v: number): number => Math.round((v - DESDE) / PASO_DE_REJILLA);

/** Dónde cabe una persona, nudo a nudo de la rejilla. */
function loLibre(arena: Arena): Uint8Array {
  const n = NUDOS_POR_LADO;
  const libre = new Uint8Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) libre[j * n + i] = sePuedeEstar(arena, deNumero(coord(i)), deNumero(coord(j)), RADIO_EN_FIJO) ? 1 : 0;
  return libre;
}

/**
 * LO ANDADO desde unas semillas, en pasos de la rejilla, por nudos libres y en cuatro direcciones:
 * la distancia por calles (metros de x más metros de z) que se anda de verdad. Cada semilla sale con
 * su distancia de partida, así que es un Dijkstra con cubos, que con pasos enteros es exacto.
 */
function andarDesde(libre: Uint8Array, semillas: readonly { k: number; d: number }[]): Int32Array {
  const n = NUDOS_POR_LADO;
  const distancia = new Int32Array(n * n).fill(-1);
  const cubos: number[][] = [];
  for (const s of semillas) if (libre[s.k] === 1) (cubos[s.d] ??= []).push(s.k);
  const meter = (v: number, d: number): void => {
    if (libre[v] === 1 && distancia[v] === -1) (cubos[d] ??= []).push(v);
  };
  for (let d = 0; d < cubos.length; d++) {
    const cubo = cubos[d];
    if (cubo === undefined) continue;
    for (let c = 0; c < cubo.length; c++) {
      const k = cubo[c] as number;
      if (distancia[k] !== -1) continue;
      distancia[k] = d;
      const i = k % n;
      if (i > 0) meter(k - 1, d + 1);
      if (i < n - 1) meter(k + 1, d + 1);
      if (k >= n) meter(k - n, d + 1);
      if (k < n * (n - 1)) meter(k + n, d + 1);
    }
  }
  return distancia;
}

/**
 * ¿Se llega andando a este punto? Se busca un nudo alcanzado a medio metro o menos desde el que se
 * vaya en línea recta hasta él (los puntos del barrio van en cuartos; la rejilla, en medios). Da
 * la distancia andada en metros, o −1.
 */
function seLlegaA(arena: Arena, distancia: Int32Array, x: number, z: number): number {
  let mejor = -1;
  for (const dx of [-0.5, -0.25, 0, 0.25, 0.5]) {
    for (const dz of [-0.5, -0.25, 0, 0.25, 0.5]) {
      const nx = x + dx;
      const nz = z + dz;
      if ((nx - DESDE) % PASO_DE_REJILLA !== 0 || (nz - DESDE) % PASO_DE_REJILLA !== 0) continue;
      const k = indiceDe(nz) * NUDOS_POR_LADO + indiceDe(nx);
      const d = distancia[k];
      if (d === undefined || d < 0) continue;
      if (!seAndaEnRecta(arena, { x: deNumero(nx), z: deNumero(nz) }, { x: deNumero(x), z: deNumero(z) }, RADIO_EN_FIJO)) continue;
      const metros = d * PASO_DE_REJILLA + Math.abs(dx) + Math.abs(dz);
      if (mejor < 0 || metros < mejor) mejor = metros;
    }
  }
  return mejor;
}

/** ¿Se anda en recta de A a B con el cuerpo de una persona? La prueba de losa de la Liza, exacta. */
function seVe(arena: Arena, ax: number, az: number, bx: number, bz: number): boolean {
  return primeraLosa(arena.cuerpos, deNumero(ax), deNumero(az), deNumero(bx), deNumero(bz), RADIO_EN_FIJO) === null;
}

/**
 * ¿Ve (x, z) algún nudo de `nudos` a `hasta` metros por calles o menos? Se prueban del más cercano
 * al más lejano, y casi siempre el primero se ve: por eso se van sacando de uno en uno en vez de
 * ordenarlos todos para cada uno de los cien mil puntos que se miran.
 */
function veAlgunNudo(arena: Arena, x: number, z: number, nudos: readonly { readonly x: number; readonly z: number }[], hasta: number): boolean {
  const d = new Float64Array(nudos.length);
  for (let k = 0; k < nudos.length; k++) {
    const n = nudos[k] as { readonly x: number; readonly z: number };
    d[k] = Math.abs(n.x - x) + Math.abs(n.z - z);
  }
  for (;;) {
    let mejor = -1;
    for (let k = 0; k < d.length; k++) if ((d[k] as number) <= hasta && (mejor < 0 || (d[k] as number) < (d[mejor] as number))) mejor = k;
    if (mejor < 0) return false;
    const n = nudos[mejor] as { readonly x: number; readonly z: number };
    if (seVe(arena, x, z, n.x, n.z)) return true;
    d[mejor] = Number.POSITIVE_INFINITY;
  }
}

/**
 * La Liza revisando un mundo. `problemasDeLaDeclaracion` revisa una declaración entera y el mundo
 * va después de los catálogos de estados, portables y proyectiles: con esos tres vacíos llega al
 * mundo, y de lo que diga se toma lo que es del mundo. Que llegue de verdad se comprueba antes con
 * un mundo roto a propósito (ver abajo): si un día la revisión cambiara de orden, eso se pone rojo
 * en vez de dar por bueno un mundo que nadie ha mirado.
 */
function problemasDelMundo(mundo: MundoDeLaLiza): string[] {
  const declaracion = { version: VERSION_DE_LA_DECLARACION, estados: [], portables: [], proyectiles: [], mundo } as unknown as LizaDeclarada;
  return problemasDeLaDeclaracion(declaracion).filter((p) => p.startsWith('mundo.'));
}

{
  const BUSCADAS = BARRIOS.slice(0, 24);
  let mundoBien = true;
  const mundoMal: unknown[] = [];
  const lizaMal: unknown[] = [];
  const noSeLlega: unknown[] = [];
  const bolsas: unknown[] = [];
  const lejos: unknown[] = [];
  const andadas: number[] = [];
  let ocupados = 0;
  let libres = 0;
  const aristasTapadas: unknown[] = [];
  const nudosTapados: unknown[] = [];
  let aristasMiradas = 0;
  const ciegos: unknown[] = [];
  let miradosEnLaGlorieta = 0;

  /* Primero, que la revisión de la Liza mira el mundo de verdad: uno roto tiene que dar sus problemas. */
  {
    const bueno = mundoDeLaLizaDelBarrio(BARRIOS[0] as Barrio);
    const roto: MundoDeLaLiza = { ...bueno, suelo: { ...bueno.suelo, nace: [{ x: 0, z: -4, rumbo: 0 }] }, zonas: [...bueno.zonas, bueno.zonas[0] as MundoDeLaLiza['zonas'][number]] };
    const suyos = problemasDelMundo(roto);
    comprobar(
      'SUELO: la revisión de la Liza ve un mundo roto (nace en el suelo y una zona repetida) antes de creerla con el bueno',
      suyos.some((p) => p.startsWith('mundo.suelo.nace')) && suyos.some((p) => p.startsWith('mundo.zonas')),
      suyos,
    );
  }

  for (const [k, b] of BUSCADAS.entries()) {
    const id = `${b.codigo}#${String(b.noche)}`;
    const mundo = mundoDelBarrio(b);
    const cuerposIguales = mundo.cuerpos.length === b.cajas.length && mundo.cuerpos.every((c, i) => igualQue(c, b.cajas[i]) && Object.keys(c).length === 4);
    const arena = arenaDe(mundo);
    const dentro = deNumero(DEL_CENTRO_AL_BORDE - 0.01);
    const cubre = [[0, 0], [dentro, dentro], [-dentro, dentro], [dentro, -dentro], [-dentro, -dentro]].every(([x, z]) => hayPiso(arena, x as number, z as number));
    const nadaFuera = !hayPiso(arena, deNumero(79.5), 0) && !hayPiso(arena, 0, deNumero(-79.5));
    if (mundo.lado !== 2 || mundo.vados.length !== 0 || mundo.nace.length !== 0 || !cuerposIguales || !cubre || !nadaFuera || porQueNoEsCanonico(mundo) !== null) {
      mundoBien = false;
      mundoMal.push({ id, nace: mundo.nace.length, cuerposIguales, cubre, nadaFuera });
    }

    /*
     * El mundo de la Liza: sin problemas para la Liza, y cada número es el del barrio pasado a
     * Q16.16 sin redondear (el barrio va en cuartos de metro, exactos en coma fija).
     */
    const l = mundoDeLaLizaDelBarrio(b);
    const exacto = (q: number, m: number): boolean => Number.isInteger(q) && q === m * UNO;
    const cajaExacta = (q: Rectangulo, m: Rectangulo): boolean => exacto(q.x0, m.x0) && exacto(q.z0, m.z0) && exacto(q.x1, m.x1) && exacto(q.z1, m.z1);
    const problemas = problemasDelMundo(l);
    const lizaBien =
      problemas.length === 0 &&
      l.metrosPorUnidad === UNO &&
      huella(l.suelo) === huella(mundo) &&
      l.clasesDeCaja.length === b.cajas.length &&
      l.clasesDeCaja.every((c) => c === CLASE_DE_CAJA.alta) &&
      l.zonas.length === b.zonas.length &&
      l.zonas.every((z, i) => {
        const o = b.zonas[i];
        return o !== undefined && z.id === i + 1 && z.id === idDeZonaEnLaLiza(o.id) && z.clase === CLASE_DE_ZONA_EN_LA_LIZA[o.clase] && cajaExacta(z.caja, o.caja);
      }) &&
      new Set(l.zonas.map((z) => z.clase)).size === 5 &&
      l.limites.every((x, i) => {
        const o = b.limites[i];
        return o !== undefined && x.id === ID_DE_LIMITE_EN_LA_LIZA[o.id] && cajaExacta(x.caja, o.caja);
      }) &&
      new Set(l.limites.map((x) => x.id)).size === 3 &&
      l.grafo.nudos.length === b.grafo.nudos.length &&
      l.grafo.nudos.every((n, i) => exacto(n.x, (b.grafo.nudos[i] as (typeof b.grafo.nudos)[number]).x) && exacto(n.z, (b.grafo.nudos[i] as (typeof b.grafo.nudos)[number]).z)) &&
      l.grafo.aristas.length === b.grafo.aristas.length &&
      l.grafo.aristas.every(([u, v], i) => u === b.grafo.aristas[i]?.a && v === b.grafo.aristas[i]?.b) &&
      l.nace.length === 9 &&
      l.nace.filter((s) => s.papel === 'asiento').length === 6 &&
      l.nace.filter((s) => s.papel === 'reaparicion').length === 3 &&
      [...b.nace.desvelado, ...b.nace.refugio].every((s, i) => {
        const q = l.nace[i];
        return q !== undefined && exacto(q.x, s.x) && exacto(q.z, s.z) && q.rumbo === s.rumbo;
      }) &&
      porQueNoEsCanonico(l) === null;
    if (!lizaBien) lizaMal.push({ id, problemas: problemas.slice(0, 3) });

    const libre = loLibre(arena);
    const desdeNacer = andarDesde(
      libre,
      b.nace.desvelado.map((s) => ({ k: indiceDe(s.z) * NUDOS_POR_LADO + indiceDe(s.x), d: 0 })),
    );
    const objetivos: { que: string; x: number; z: number }[] = [
      ...b.cabinas.map((c) => ({ que: c.id, x: c.sitio.x, z: c.sitio.z })),
      { que: 'refugio', x: b.refugio.sitio.x, z: b.refugio.sitio.z },
      ...b.nace.refugio.map((s, i) => ({ que: `renace-${String(i)}`, x: s.x, z: s.z })),
      ...b.zonas.map((z) => ({ que: z.id, x: (z.caja.x0 + z.caja.x1) / 2, z: (z.caja.z0 + z.caja.z1) / 2 })),
      ...b.grafo.nudos.slice(0, 16).map((n, i) => ({ que: `cruce-${String(i)}`, x: n.x, z: n.z })),
    ];
    for (const o of objetivos) if (seLlegaA(arena, desdeNacer, o.x, o.z) < 0) noSeLlega.push({ id, que: o.que, x: o.x, z: o.z });

    /*
     * Lo andado DESDE EL CENTRO, como lo cuenta el diseño: la fuente está en medio, así que se sale
     * de todo el suelo libre a 4 m o menos del centro, cada punto con lo que tiene de x más de z.
     * Cada cabina tiene que quedar entre lo que declara atajando y lo que declara sin atajar, y en
     * 60-110 m. Con UNA holgura, y medida: lo declarado cuenta a quien anda como un punto, y una
     * persona de 0,35 m de radio que dobla por fuera la esquina de una manzana tiene que pasar 0,35
     * más allá y volver, 0,7 m; en la rejilla de medio metro, uno. Se vio en las cabinas de 97,5,
     * que se andan en 98,5 cuando no hay soportal por el que atajar.
     */
    const semillas: { k: number; d: number }[] = [];
    for (let z = -4; z <= 4; z += PASO_DE_REJILLA) for (let x = -4; x <= 4; x += PASO_DE_REJILLA) semillas.push({ k: indiceDe(z) * NUDOS_POR_LADO + indiceDe(x), d: Math.round((Math.abs(x) + Math.abs(z)) / PASO_DE_REJILLA) });
    const desdeElCentro = andarDesde(libre, semillas);
    for (const c of b.cabinas) {
      const pasos = desdeElCentro[indiceDe(c.sitio.z) * NUDOS_POR_LADO + indiceDe(c.sitio.x)] ?? -1;
      const andado = pasos * PASO_DE_REJILLA;
      andadas.push(andado);
      if (pasos < 0 || andado < c.atajando || andado > c.distancia + 1 || andado < CABINA_DESDE || andado > CABINA_HASTA) lejos.push({ id, cabina: c.id, atajando: c.atajando, distancia: c.distancia, andado });
    }

    let sueltos = 0;
    for (let q = 0; q < libre.length; q++) {
      if (libre[q] === 1) libres++;
      else ocupados++;
      if (libre[q] === 1 && desdeNacer[q] === -1) sueltos++;
    }
    if (sueltos > 0) bolsas.push({ id, sueltos });

    /*
     * EL GRAFO, contra el mundo de verdad de esta noche y el de su plaza despejada: cada nudo se
     * pisa y cada arista se anda en recta con el radio de una persona (`seAndaEnRecta`, la pregunta
     * del que valida en `mundo.ts`, que no sabe nada de cómo se hizo el grafo). Y cada punto libre de
     * la glorieta de 60 ve algún nudo con la prueba de losa: por ahí es por donde se pelea.
     */
    for (const bb of [b, despejarLaPlaza(b)]) {
      const ar = bb === b ? arena : arenaDe(mundoDelBarrio(bb));
      const g = bb.grafo;
      for (const n of g.nudos) if (!sePuedeEstar(ar, deNumero(n.x), deNumero(n.z), RADIO_EN_FIJO)) nudosTapados.push({ id, despejada: bb.plazaDespejada, n });
      for (const a of g.aristas) {
        aristasMiradas++;
        const p = g.nudos[a.a] as (typeof g.nudos)[number];
        const q = g.nudos[a.b] as (typeof g.nudos)[number];
        if (!seAndaEnRecta(ar, { x: deNumero(p.x), z: deNumero(p.z) }, { x: deNumero(q.x), z: deNumero(q.z) }, RADIO_EN_FIJO)) aristasTapadas.push({ id, despejada: bb.plazaDespejada, de: p, a: q });
      }
    }
    if (k < 6) {
      for (const bb of [b, despejarLaPlaza(b)]) {
        const ar = bb === b ? arena : arenaDe(mundoDelBarrio(bb));
        const nudos = bb.grafo.nudos.filter((n) => Math.abs(n.x) <= GLORIETA_60 + 6 && Math.abs(n.z) <= GLORIETA_60 + 6);
        for (let z = -GLORIETA_60; z <= GLORIETA_60; z += PASO_DE_REJILLA) {
          for (let x = -GLORIETA_60; x <= GLORIETA_60; x += PASO_DE_REJILLA) {
            if (!sePuedeEstar(ar, deNumero(x), deNumero(z), RADIO_EN_FIJO)) continue;
            miradosEnLaGlorieta++;
            if (!veAlgunNudo(ar, x, z, nudos, 2 * GLORIETA_60)) ciegos.push({ id, despejada: bb.plazaDespejada, x, z });
          }
        }
      }
    }
  }
  nota(
    `${String(BUSCADAS.length)} barrios buscados: ${String(libres)} nudos libres y ${String(ocupados)} ocupados; las cabinas se andan desde el centro en ` +
      `${String(Math.min(...andadas))}-${String(Math.max(...andadas))} m; ${String(aristasMiradas)} aristas del grafo andadas; ${String(miradosEnLaGlorieta)} puntos de la glorieta de 60 mirando un nudo`,
  );
  comprobar('el mundo del barrio es el contrato de mundo.ts: casillas de 2 m que cubren el barrio y nada más, las cajas como cuerpos, y `nace` vacío', mundoBien, mundoMal.slice(0, 3));
  comprobar('el mundo de la Liza no tiene problemas para la Liza, y es el del barrio en Q16.16 exacto, con sus ids, sus clases y el nacer por papel', lizaMal.length === 0, lizaMal.slice(0, 3));
  comprobar('SUELO: la búsqueda choca de verdad (más de un 25 % de los nudos, ocupados)', ocupados > (libres + ocupados) / 4, { libres, ocupados });
  comprobar('desde donde nacen los desvelados se llega andando a las cuatro cabinas, al refugio, a todas las zonas y a los 16 cruces', noSeLlega.length === 0, noSeLlega.slice(0, 5));
  comprobar('andando desde el centro, cada cabina queda entre lo que declara atajando y sin atajar, y en 60-110 m', lejos.length === 0, lejos.slice(0, 5));
  comprobar('no hay bolsas: todo el suelo libre del barrio se alcanza', bolsas.length === 0, bolsas.slice(0, 5));
  comprobar('cada nudo del grafo se pisa y cada arista se anda en recta, también con la plaza despejada', nudosTapados.length === 0 && aristasTapadas.length === 0, { nudos: nudosTapados.slice(0, 3), aristas: aristasTapadas.slice(0, 3) });
  comprobar('todo el suelo libre de la glorieta de 60 ve algún nudo del grafo, también con la plaza despejada', ciegos.length === 0 && miradosEnLaGlorieta > 100000, { ciegos: ciegos.length, primeros: ciegos.slice(0, 5), mirados: miradosEnLaGlorieta });
}

/*
 * POR EL GRAFO NO SE RODEA MUCHO MÁS QUE ANDANDO. Con la primera versión, de (0, −10) a (0, 10), al
 * otro lado de la fuente, eran 124 m por el grafo contra unos 26 andando. Aquí, en seis noches y la
 * plaza despejada de una, entre puntos libres de la glorieta de 60 que no se ven: el camino por el
 * grafo —en recta al nudo que se ve, por aristas, en recta al final— frente a lo que se anda, los
 * dos en metros de x más metros de z. Y los tres casos de la revisión, con nombre.
 */
{
  const peores: { id: string; de: number[]; a: number[]; grafo: number; andado: number }[] = [];
  let pares = 0;
  let peorRazon = 0;
  const casos: string[] = [];
  const noches = [...BARRIOS.slice(0, 6), despejarLaPlaza(BARRIOS[1] as Barrio)];
  for (const b of noches) {
    const id = `${b.codigo}#${String(b.noche)}${b.plazaDespejada ? ' despejada' : ''}`;
    const arena = arenaDe(mundoDelBarrio(b));
    const libre = loLibre(arena);
    const g = b.grafo;
    /* Floyd-Warshall sobre los nudos del grafo, con el largo (exacto) de cada arista. */
    const n = g.nudos.length;
    const D = new Float64Array(n * n).fill(Number.POSITIVE_INFINITY);
    for (let i = 0; i < n; i++) D[i * n + i] = 0;
    for (const a of g.aristas) {
      D[a.a * n + a.b] = Math.min(D[a.a * n + a.b] as number, a.largo);
      D[a.b * n + a.a] = Math.min(D[a.b * n + a.a] as number, a.largo);
    }
    for (let m = 0; m < n; m++) {
      for (let i = 0; i < n; i++) {
        const im = D[i * n + m] as number;
        if (im === Number.POSITIVE_INFINITY) continue;
        for (let j = 0; j < n; j++) {
          const v = im + (D[m * n + j] as number);
          if (v < (D[i * n + j] as number)) D[i * n + j] = v;
        }
      }
    }
    const cercanos = (x: number, z: number): { i: number; d: number }[] =>
      g.nudos
        .map((p, i) => ({ i, d: Math.abs(p.x - x) + Math.abs(p.z - z) }))
        .filter((v) => v.d <= 24 && seVe(arena, x, z, (g.nudos[v.i] as (typeof g.nudos)[number]).x, (g.nudos[v.i] as (typeof g.nudos)[number]).z));
    const porElGrafo = (ax: number, az: number, bx: number, bz: number): number => {
      let mejor = Number.POSITIVE_INFINITY;
      const va = cercanos(ax, az);
      const vb = cercanos(bx, bz);
      for (const u of va) for (const v of vb) mejor = Math.min(mejor, u.d + (D[u.i * n + v.i] as number) + v.d);
      return mejor;
    };
    /* Puntos de salida: los libres de la glorieta de 60 de una rejilla de 3,5 m, y de llegada, de 5 m. */
    const salidas: [number, number][] = [];
    for (let z = -28; z <= 28; z += 3.5) for (let x = -28; x <= 28; x += 3.5) if (libre[indiceDe(z) * NUDOS_POR_LADO + indiceDe(x)] === 1) salidas.push([x, z]);
    const llegadas: [number, number][] = [];
    for (let z = -27.5; z <= 27.5; z += 5) for (let x = -27.5; x <= 27.5; x += 5) if (libre[indiceDe(z) * NUDOS_POR_LADO + indiceDe(x)] === 1) llegadas.push([x, z]);
    const mirar = (ax: number, az: number, destinos: readonly [number, number][], dist: Int32Array): void => {
      for (const [bx, bz] of destinos) {
        if (seVe(arena, ax, az, bx, bz)) continue;
        const pasos = dist[indiceDe(bz) * NUDOS_POR_LADO + indiceDe(bx)] ?? -1;
        if (pasos < 0) continue;
        pares++;
        const andado = pasos * PASO_DE_REJILLA;
        const grafo = porElGrafo(ax, az, bx, bz);
        peorRazon = Math.max(peorRazon, grafo / andado);
        if (!(grafo <= 1.5 * andado + 4)) peores.push({ id, de: [ax, az], a: [bx, bz], grafo, andado });
      }
    };
    for (let s = 0; s < salidas.length; s += 3) {
      const [ax, az] = salidas[s] as [number, number];
      mirar(ax, az, llegadas, andarDesde(libre, [{ k: indiceDe(az) * NUDOS_POR_LADO + indiceDe(ax), d: 0 }]));
    }
    if (b === BARRIOS[0]) {
      for (const [ax, az, bx, bz] of [[-10, 0, 10, 0], [0, -10, 0, 10], [-8, -8, 8, 8]] as const) {
        const dist = andarDesde(libre, [{ k: indiceDe(az) * NUDOS_POR_LADO + indiceDe(ax), d: 0 }]);
        const andado = (dist[indiceDe(bz) * NUDOS_POR_LADO + indiceDe(bx)] ?? -1) * PASO_DE_REJILLA;
        const grafo = porElGrafo(ax, az, bx, bz);
        casos.push(`(${String(ax)},${String(az)})→(${String(bx)},${String(bz)}): ${String(grafo)} por el grafo, ${String(andado)} andando`);
        if (!(grafo <= 1.5 * andado + 4)) peores.push({ id, de: [ax, az], a: [bx, bz], grafo, andado });
      }
    }
  }
  nota(`los casos de la revisión en ${(BARRIOS[0] as Barrio).codigo}: ${casos.join('; ')}; ${String(pares)} pares tapados, el peor a ${peorRazon.toFixed(2)} veces lo andado`);
  comprobar('por el grafo no se rodea más de vez y media lo andado (más 4 m), en la glorieta de 60 y en los casos de la revisión', peores.length === 0 && pares > 2000 && casos.length === 3, { peores: peores.slice(0, 5), pares });
}

/*
 * Y FUERA DE LA GLORIETA, en la Llamada: el grafo no promete verse desde todas partes —pegado a un
 * coche o a una farola de una calle de fuera puede no verse ningún nudo, y la Liza va entonces en
 * recta y resbala hasta verlo—, pero casi. Se mide cada metro en cuatro noches.
 */
{
  let mirados = 0;
  let ciegos = 0;
  for (const b of BARRIOS.slice(0, 4)) {
    const arena = arenaDe(mundoDelBarrio(b));
    const nudos = b.grafo.nudos;
    for (let z = -77; z <= 77; z += 1) {
      for (let x = -77; x <= 77; x += 1) {
        if (Math.abs(x) <= GLORIETA_60 && Math.abs(z) <= GLORIETA_60) continue;
        if (!sePuedeEstar(arena, deNumero(x), deNumero(z), RADIO_EN_FIJO)) continue;
        mirados++;
        if (!veAlgunNudo(arena, x, z, nudos, 40)) ciegos++;
      }
    }
  }
  nota(`fuera de la glorieta de 60: ${String(ciegos)} de ${String(mirados)} puntos sin ningún nudo a la vista (${((100 * ciegos) / mirados).toFixed(2)} %)`);
  comprobar('fuera de la glorieta de 60, el 97 % del suelo libre ve algún nudo', mirados > 20000 && ciegos <= mirados * 0.03, { ciegos, mirados });
}

// ---------------------------------------------------------------------------
paso('4 · Los 48 durmientes');
// ---------------------------------------------------------------------------

{
  /* El guion, en todas las mesas: bien formado. */
  const guionMal: unknown[] = [];
  const tamanos = new Set<number>();
  for (const b of BARRIOS.slice(0, 60)) {
    const g = guionDeLosDurmientes(b);
    const suma = g.cuadrillas.reduce((s, c) => s + c.miembros, 0);
    const puestosBien = g.durmientes.every((d) => {
      const c = g.cuadrillas[d.cuadrilla];
      return c !== undefined && d.puesto >= 0 && d.puesto < c.miembros && d.cuerpo >= 0 && d.cuerpo <= 1 && d.ropa >= 0 && d.ropa <= 3 && (b.adorno.tiempo !== 'niebla' || !d.paraguas);
    });
    for (const c of g.cuadrillas) tamanos.add(c.miembros);
    const vueltasBien = g.cuadrillas.every((c) => {
      const t = c.trozos;
      let arco = 0;
      const seguidos = t.every((x, i) => (i === 0 ? x.desde === 0 : x.desde === (t[i - 1] as (typeof t)[number]).hasta) && x.hasta > x.desde);
      const andados = c.andados.every((k) => {
        const x = t[k];
        if (x === undefined || x.hace !== ANDA || x.arco !== arco || x.hasta - x.desde !== Math.ceil(x.largo / c.paso)) return false;
        arco += x.largo;
        return true;
      });
      return (
        c.miembros >= 1 &&
        c.miembros <= 3 &&
        PASOS_POR_TIC.includes(c.paso) &&
        c.periodo % CICLO_DEL_SEMAFORO === 0 &&
        c.desfase >= 0 &&
        c.desfase < c.periodo &&
        seguidos &&
        (t[t.length - 1] as (typeof t)[number]).hasta === c.periodo &&
        andados &&
        arco === c.perimetro
      );
    });
    if (g.durmientes.length !== CUANTOS_DURMIENTES || suma !== CUANTOS_DURMIENTES || !puestosBien || !vueltasBien) guionMal.push({ id: `${b.codigo}#${String(b.noche)}`, n: g.durmientes.length, suma, puestosBien, vueltasBien });
  }
  comprobar('48 durmientes en cuadrillas de 1 a 3, con vueltas de minutos exactos que se leen seguidas', guionMal.length === 0, guionMal.slice(0, 3));
  comprobar('y hay cuadrillas de uno, de dos y de tres', tamanos.has(1) && tamanos.has(2) && tamanos.has(3), [...tamanos]);

  /*
   * Durante 20.000 tics en tres barrios, y 2.000 en veinte más: siempre sobre suelo, fuera de toda
   * caja y dentro del barrio, sin moverse más que su paso en un tic, y mirando a un eje. Y en la
   * CALZADA sólo cruzando por un paso de cebra con su semáforo en verde: se mira tic a tic, no sólo
   * al empezar a cruzar, que es lo que dejó pasar gente en la calzada con el semáforo ya cambiado.
   */
  const LIMITE = deNumero(DEL_CENTRO_AL_BORDE - RADIO);
  const RUMBOS_DE_EJE = new Set([0, 64, 128, 192]);
  const malos: unknown[] = [];
  const saltos: unknown[] = [];
  const enRojoTicATic: unknown[] = [];
  let enLaCalzada = 0;
  let andando = 0;
  let mirados = 0;
  let quietos = 0;
  const plano = new Int32Array(CUANTOS_DURMIENTES * 4);
  const antes = new Int32Array(CUANTOS_DURMIENTES * 4);
  /** La calle (0-3) en cuya calzada cae una coordenada, o −1. */
  const calzadaDe = (v: number): number => EJES.findIndex((e) => Math.abs(v - e) < MEDIA_CALZADA);
  const ejeMasCercano = (v: number): number => {
    let mejor = 0;
    for (let k = 1; k < 4; k++) if (Math.abs(v - (EJES[k] as number)) < Math.abs(v - (EJES[mejor] as number))) mejor = k;
    return mejor;
  };
  const tandas: { b: Barrio; tics: number }[] = [...BARRIOS.slice(0, 3).map((b) => ({ b, tics: 20000 })), ...BARRIOS.slice(3, 23).map((b) => ({ b, tics: 2000 }))];
  for (const { b, tics } of tandas) {
    const arena = arenaDe(mundoDelBarrio(b));
    const g = guionDeLosDurmientes(b);
    const pasoDe = g.durmientes.map((d) => (g.cuadrillas[d.cuadrilla] as (typeof g.cuadrillas)[number]).paso);
    const recorrido = new Array<number>(CUANTOS_DURMIENTES).fill(0);
    for (let t = 0; t <= tics; t++) {
      escribirLosDurmientes(b, t, plano);
      for (let i = 0; i < CUANTOS_DURMIENTES; i++) {
        const x = plano[i * 4] as number;
        const z = plano[i * 4 + 1] as number;
        const rumbo = plano[i * 4 + 2] as number;
        mirados++;
        if (plano[i * 4 + 3] === 1) andando++;
        if (!sePuedeEstar(arena, x, z, RADIO_EN_FIJO) || Math.abs(x) > LIMITE || Math.abs(z) > LIMITE || !RUMBOS_DE_EJE.has(rumbo)) {
          if (malos.length < 5) malos.push({ mesa: b.codigo, t, i, x: x / UNO, z: z / UNO, rumbo });
          else malos.push(null);
        }
        const xm = x / UNO;
        const zm = z / UNO;
        const cx = calzadaDe(xm);
        const cz = calzadaDe(zm);
        if (cx >= 0 || cz >= 0) {
          enLaCalzada++;
          /* En la calzada de la calle que corre por z (cx) se cruza por x, a 5 m del cruce, y al revés. */
          const cruzaPorX = cx >= 0;
          const fila = cruzaPorX ? ejeMasCercano(zm) : cz;
          const columna = cruzaPorX ? cx : ejeMasCercano(xm);
          const desvio = cruzaPorX ? Math.abs(zm - (EJES[fila] as number)) : Math.abs(xm - (EJES[columna] as number));
          const enElPaso = !(cx >= 0 && cz >= 0) && desvio >= 4.625 && desvio <= 5.375;
          if (!enElPaso || !pasoAbierto(b, fila * 4 + columna, cruzaPorX ? 'x' : 'z', t)) {
            if (enRojoTicATic.length < 5) enRojoTicATic.push({ mesa: b.codigo, t, i, x: xm, z: zm, enElPaso });
            else enRojoTicATic.push(null);
          }
        }
        if (t > 0) {
          const d = Math.abs(x - (antes[i * 4] as number)) + Math.abs(z - (antes[i * 4 + 1] as number));
          recorrido[i] = (recorrido[i] as number) + d;
          if (d > (pasoDe[i] as number)) saltos.push({ mesa: b.codigo, t, i, d: d / UNO });
        }
      }
      antes.set(plano);
    }
    if (tics === 20000) quietos += recorrido.filter((r) => r < 50 * UNO).length;
  }
  nota(`${String(mirados)} sitios mirados, ${((100 * andando) / mirados).toFixed(1)} % andando, ${String(enLaCalzada)} en la calzada`);
  comprobar('los durmientes pisan siempre suelo, fuera de toda caja y dentro del barrio, mirando a un eje', malos.length === 0, malos.slice(0, 5));
  comprobar('y no dan saltos: ninguno se mueve en un tic más que su paso', saltos.length === 0, saltos.slice(0, 5));
  comprobar('SUELO: andan de verdad, más del 40 % del tiempo, y cada uno más de 50 m en 20.000 tics', andando > mirados * 0.4 && quietos === 0, { andando, mirados, quietos });
  comprobar(
    `en la calzada sólo se está cruzando por un paso con el semáforo en verde, tic a tic (${String(enLaCalzada)} sitios en la calzada)`,
    enRojoTicATic.length === 0 && enLaCalzada > 20000,
    { vistos: enRojoTicATic.length, primeros: enRojoTicATic.slice(0, 5) },
  );

  /* Y al empezar a cruzar, con 10 s de verde por delante: se mira en el guion, contra el semáforo del barrio. */
  let cruces = 0;
  const sinMargen: unknown[] = [];
  for (const b of BARRIOS.slice(0, 30)) {
    const g = guionDeLosDurmientes(b);
    for (const c of g.cuadrillas) {
      for (const x of c.trozos) {
        if (x.hace !== ANDA || x.cruce === null) continue;
        for (let tic = x.desde - c.desfase; tic < 20000; tic += c.periodo) {
          cruces++;
          const eje = x.dx !== 0 ? 'x' : 'z';
          const fase = faseDelSemaforo(b, x.cruce, tic);
          const queda = eje === 'x' ? VERDE - fase : CICLO_DEL_SEMAFORO - fase;
          if (!pasoAbierto(b, x.cruce, eje, tic) || queda < 200) sinMargen.push({ mesa: b.codigo, tic, cruce: x.cruce, eje, fase });
        }
      }
    }
  }
  comprobar(`se echan a cruzar sólo con su semáforo en verde y 10 s por delante (${String(cruces)} cruces vistos)`, sinMargen.length === 0 && cruces >= 500, sinMargen.slice(0, 5));

  /* Leer el guion es una función del barrio y del tic: da igual por dónde se pregunte. */
  const b = BARRIOS[0] as Barrio;
  const g = guionDeLosDurmientes(b);
  let coinciden = true;
  let periodicos = true;
  for (const t of [0, 1, 777, 5999, 12345, 20000, -1, -4321]) {
    const todos = durmientesEn(b, t);
    for (let i = 0; i < CUANTOS_DURMIENTES; i++) {
      const uno = sitioDelDurmiente(b, i, t);
      const deLista = todos[i];
      if (deLista === undefined || canonico(uno) !== canonico(deLista)) coinciden = false;
      const c = g.cuadrillas[(g.durmientes[i] as (typeof g.durmientes)[number]).cuadrilla] as (typeof g.cuadrillas)[number];
      if (canonico(sitioDelDurmiente(b, i, t + c.periodo)) !== canonico(uno) || canonico(sitioDelDurmiente(b, i, t - 3 * c.periodo)) !== canonico(uno)) periodicos = false;
    }
  }
  comprobar('`sitioDelDurmiente`, `durmientesEn` y `escribirLosDurmientes` dicen lo mismo', coinciden);
  comprobar('y cada uno repite su vuelta exacta, también en tics negativos', periodicos);
  const otroIgual = barrioDeLaNoche(b.codigo, b.noche);
  comprobar(
    'el guion no depende de qué objeto sea el barrio: otro igual da los mismos sitios',
    otroIgual !== b && [0, 999, 17000].every((t) => canonico(durmientesEn(otroIgual, t)) === canonico(durmientesEn(b, t))),
  );

  /*
   * La memoria del guion: una copia del barrio, el mismo derivado otra vez y el despejado REUSAN el
   * guion escrito (el mismo objeto, no uno igual: reescribirlo en cada fotograma era el hallazgo);
   * uno con otros semáforos, aunque se llame igual, NO. La memoria por noche guarda las últimas
   * ocho, y desde el principio del paso se han escrito cincuenta y nueve noches más: se le pide una
   * vez para que ésta sea la reciente, como lo es en un aparato que juega su noche.
   */
  const reciente = guionDeLosDurmientes(barrioDeLaNoche(b.codigo, b.noche));
  const conOtrosSemaforos = { ...b, aceras: { ...b.aceras, semaforos: b.aceras.semaforos.map((s) => (s + 600) % CICLO_DEL_SEMAFORO) } };
  comprobar(
    'el guion se reusa con una copia, con el barrio derivado otra vez y con el despejado, y no con otro de semáforos distintos',
    canonico(reciente) === canonico(g) &&
      guionDeLosDurmientes({ ...b }) === reciente &&
      guionDeLosDurmientes(barrioDeLaNoche(b.codigo, b.noche)) === reciente &&
      guionDeLosDurmientes(despejarLaPlaza(barrioDeLaNoche(b.codigo, b.noche))) === reciente &&
      guionDeLosDurmientes(conOtrosSemaforos) !== reciente &&
      canonico(guionDeLosDurmientes(conOtrosSemaforos)) !== canonico(reciente),
  );

  /* Lo que lanza: un tic que no es número, y un punto que no es Q16.16. */
  const plano48 = new Int32Array(CUANTOS_DURMIENTES * 4);
  comprobar(
    'un tic que no es un número finito lanza, en los durmientes, en el semáforo y en el tren',
    [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY].every(
      (t) =>
        lanzaRango(() => durmientesEn(b, t)) &&
        lanzaRango(() => sitioDelDurmiente(b, 0, t)) &&
        lanzaRango(() => escribirLosDurmientes(b, t, plano48)) &&
        lanzaRango(() => durmienteMasCercano(b, t, 0, 0)) &&
        lanzaRango(() => pasoAbierto(b, 0, 'x', t)) &&
        lanzaRango(() => trenEn(b, t)),
    ) && !lanzaRango(() => durmientesEn(b, 12.5)),
  );
  comprobar(
    'el punto del más cercano va en Q16.16: uno con decimales (en metros) o fuera de ±512 m lanza, y uno entero no',
    lanzaRango(() => durmienteMasCercano(b, 0, 12.5, -3.25)) && lanzaRango(() => durmienteMasCercano(b, 0, 600 * UNO, 0)) && !lanzaRango(() => durmienteMasCercano(b, 0, 12 * UNO, -3 * UNO)),
  );

  let cercanoBien = true;
  let desempate = true;
  let h = 7;
  for (let k = 0; k < 400; k++) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    const t = h % 30000;
    const x = ((h >>> 3) % 150) * UNO - 75 * UNO;
    const z = ((h >>> 9) % 150) * UNO - 75 * UNO;
    const excluidos = k % 3 === 0 ? [0, 5, 17] : [];
    const todos = durmientesEn(b, t);
    let mejor = -1;
    let mejorD = 0;
    todos.forEach((s, i) => {
      if (excluidos.includes(i)) return;
      const d = (s.x - x) ** 2 + (s.z - z) ** 2;
      if (mejor < 0 || d < mejorD) {
        mejor = i;
        mejorD = d;
      }
    });
    if (durmienteMasCercano(b, t, x, z, excluidos) !== mejor) cercanoBien = false;
  }
  /*
   * El desempate: dos durmientes y el punto medio exacto entre ellos (enteros, así que la distancia
   * es la misma de verdad), con todos los demás excluidos. Tiene que ganar el de índice menor. Se
   * prueban los primeros cien pares cuyo punto medio cae en un entero.
   */
  let empates = 0;
  const todosEnCien = durmientesEn(b, 100);
  for (let i = 0; i < CUANTOS_DURMIENTES && empates < 100; i++) {
    for (let j = i + 1; j < CUANTOS_DURMIENTES && empates < 100; j++) {
      const p = todosEnCien[i] as (typeof todosEnCien)[number];
      const q = todosEnCien[j] as (typeof todosEnCien)[number];
      if ((p.x + q.x) % 2 !== 0 || (p.z + q.z) % 2 !== 0 || (p.x === q.x && p.z === q.z)) continue;
      empates++;
      const fuera: number[] = [];
      for (let k = 0; k < CUANTOS_DURMIENTES; k++) if (k !== i && k !== j) fuera.push(k);
      if (durmienteMasCercano(b, 100, (p.x + q.x) / 2, (p.z + q.z) / 2, fuera) !== i) desempate = false;
    }
  }
  comprobar('el durmiente más cercano es el más cercano, sin contar los excluidos (400 puntos)', cercanoBien);
  comprobar('a igual distancia gana el de índice menor (100 empates), y sin nadie que elegir no hay nadie', desempate && empates === 100 && durmienteMasCercano(b, 0, 0, 0, Array.from({ length: CUANTOS_DURMIENTES }, (_, i) => i)) === null, { empates });

  /*
   * Los Prestados del principio salen de gente que está cerca: en cualquier noche y en cualquier
   * momento. El guion pone a los veinte primeros en vueltas que no salen de las calles que rodean la
   * plaza (a 58 m como mucho), y se exige eso y no menos: con el suelo en diez, quitar esas vueltas
   * seguía en verde porque el azar ya deja una decena cerca casi siempre.
   */
  let menos = CUANTOS_DURMIENTES;
  for (const otro of BARRIOS.slice(0, 60)) {
    for (const t of [0, 3000, 9000]) {
      let cerca = 0;
      for (const s of durmientesEn(otro, t)) if (Math.abs(s.x) + Math.abs(s.z) <= 60 * UNO) cerca++;
      menos = Math.min(menos, cerca);
    }
  }
  comprobar('hay gente cerca de la glorieta para que salgan Prestados: siempre veinte o más a 60 m por calles', menos >= 20, menos);
}

// ---------------------------------------------------------------------------
paso('5 · Tiempos, en un Node recién arrancado');
// ---------------------------------------------------------------------------

const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'quiebro-barrio-'));
const ESBUILD = path.join(REPO, 'node_modules', 'esbuild', 'bin', 'esbuild');
const barra = (p: string): string => p.replace(/\\/g, '/');
const RUTA_DEL_BARRIO = barra(FICHERO_DEL_BARRIO.replace(/\.ts$/, ''));
const RUTA_DE_LOS_DURMIENTES = barra(FICHERO_DE_LOS_DURMIENTES.replace(/\.ts$/, ''));
const RUTA_CANONICO = barra(path.join(REPO, 'shared', 'mecanicas', 'canonico'));

function empaquetar(entrada: string, salida: string, objetivo: string): { bien: boolean; error: string } {
  const hecho = spawnSync(process.execPath, [ESBUILD, entrada, '--bundle', '--format=iife', `--target=${objetivo}`, '--platform=neutral', `--outfile=${salida}`, '--log-level=error'], { encoding: 'utf8' });
  return { bien: hecho.status === 0, error: `${hecho.stderr}`.slice(0, 500) };
}

{
  /*
   * El cronómetro corre en un Node NUEVO, con el paquete que haría el servidor (`--target=node20`,
   * como su `build`): el primer `barrioDeLaNoche` de un proceso es lo que cuesta de verdad, con el
   * código aún sin compilar.
   *
   * SIN barrer la memoria a mano. La primera versión llamaba a `gc()` antes de pulsar, y la
   * revisión midió lo que eso tapaba: sin él, en nueve arranques de cada diez el barrio con su mundo
   * pasaba de 3 ms, porque un barrido de la memoria joven caía dentro. Lo que se mide ahora es lo
   * que pasa de verdad —cargar y derivar—, y lo que se pagó para que quepa es no dejar basura
   * (el grafo y lo que no depende de la noche se hacen al cargar, y la noche sólo pone lo suyo).
   * Se toma el mejor de cinco arranques porque lo que se mide es el barrio y no si la máquina estaba
   * ocupada con otra cosa (esta casa ya se ha comido rojos de cronómetro que eran la máquina); un
   * barrido que cayera SIEMPRE dentro caería en los cinco, así que el mejor no lo esconde. La
   * mediana va en la nota. Y si con cinco alguno de los topes no se cumple, se toman diez más antes
   * de dar el rojo: en esta máquina corren a la vez otros frentes —Blender incluido— y se midió el
   * mismo barrio en 2,4 ms con la máquina tranquila y entre 3 y 6 con ella ocupada. Diez tomas más
   * no esconden nada que el barrio pague siempre: lo que es suyo sale en las quince.
   *
   * Aparte, lo que cuesta CARGAR el módulo (lo que no depende de la noche, y el grafo): una vez por
   * proceso, pero en el WebView de un móvil modesto es varias veces más.
   */
  const entrada = path.join(DIR, 'cronometro.ts');
  fs.writeFileSync(
    entrada,
    `import { barrioDeLaNoche, mundoDelBarrio, mundoDeLaLizaDelBarrio } from '${RUTA_DEL_BARRIO}';\n` +
      `import { guionDeLosDurmientes, durmientesEn } from '${RUTA_DE_LOS_DURMIENTES}';\n` +
      'const t0 = performance.now();\n' +
      "const b = barrioDeLaNoche('QWXYZ', 1);\n" +
      'const t1 = performance.now();\n' +
      'const m = mundoDelBarrio(b);\n' +
      'const t2 = performance.now();\n' +
      'const l = mundoDeLaLizaDelBarrio(b);\n' +
      'const t3 = performance.now();\n' +
      'const g = guionDeLosDurmientes(b);\n' +
      'const t4 = performance.now();\n' +
      'durmientesEn(b, 1234);\n' +
      'const t5 = performance.now();\n' +
      'const muestras: number[] = [];\n' +
      "for (let k = 0; k < 200; k++) { const a = performance.now(); barrioDeLaNoche('M' + String(k), k % 10); muestras.push(performance.now() - a); }\n" +
      'muestras.sort((x, y) => x - y);\n' +
      'console.log(JSON.stringify({ barrio: t1 - t0, mundo: t2 - t1, liza: t3 - t2, guion: t4 - t3, durmientes: t5 - t4, templado: muestras[100], cuerpos: m.cuerpos.length + l.zonas.length, cuadrillas: g.cuadrillas.length }));\n',
    'utf8',
  );
  const paquete = path.join(DIR, 'cronometro.js');
  const hecho = empaquetar(entrada, paquete, 'node20');
  const entradaDeCarga = path.join(DIR, 'carga.ts');
  fs.writeFileSync(
    entradaDeCarga,
    'const t0 = performance.now();\n' +
      `import('${RUTA_DEL_BARRIO}').then((m) => { const t1 = performance.now(); m.barrioDeLaNoche('QWXYZ', 1); console.log(JSON.stringify({ carga: t1 - t0 })); });\n`,
    'utf8',
  );
  const paqueteDeCarga = path.join(DIR, 'carga.js');
  const hechoDeCarga = empaquetar(entradaDeCarga, paqueteDeCarga, 'node20');
  comprobar('los cronómetros se empaquetan', hecho.bien && hechoDeCarga.bien, `${hecho.error}${hechoDeCarga.error}`);
  comprobar('y el cronómetro no barre la memoria a mano', !/\bgc\b/.test(fs.readFileSync(entrada, 'utf8')));
  const tomas: { barrio: number; mundo: number; liza: number; guion: number; durmientes: number; templado: number }[] = [];
  const cargas: number[] = [];
  const TOMAS = 5;
  const TOMAS_CON_LA_MAQUINA_OCUPADA = 15;
  let intentadas = 0;
  const tomar = (cuantas: number): void => {
    for (let k = 0; k < cuantas; k++) {
      intentadas++;
      const r = spawnSync(process.execPath, [paquete], { encoding: 'utf8' });
      const c = spawnSync(process.execPath, [paqueteDeCarga], { encoding: 'utf8' });
      try {
        tomas.push(JSON.parse(r.stdout.trim()) as (typeof tomas)[number]);
        cargas.push((JSON.parse(c.stdout.trim()) as { carga: number }).carga);
      } catch {
        /* Una toma que no dice nada no cuenta; el suelo de abajo lo dice. */
      }
    }
  };
  const mejor = (valores: number[]): number => Math.min(...valores);
  const mediana = (valores: number[]): number => valores.slice().sort((a, c) => a - c)[Math.floor(valores.length / 2)] as number;
  const topes = (): boolean =>
    tomas.length > 0 &&
    mejor(tomas.map((t) => t.barrio + t.mundo)) <= 3 &&
    mejor(tomas.map((t) => t.barrio + t.liza)) <= 5 &&
    mejor(tomas.map((t) => t.guion)) <= 3 &&
    mejor(cargas) <= 10;
  if (hecho.bien && hechoDeCarga.bien) {
    tomar(TOMAS);
    if (!topes()) tomar(TOMAS_CON_LA_MAQUINA_OCUPADA - TOMAS);
  }
  comprobar(`las ${String(intentadas)} tomas dicen algo`, intentadas >= TOMAS && tomas.length === intentadas && cargas.length === intentadas, { intentadas, tomas: tomas.length, cargas: cargas.length });
  if (tomas.length > 0) {
    const conMundo = tomas.map((t) => t.barrio + t.mundo);
    const conLiza = tomas.map((t) => t.barrio + t.liza);
    nota(
      `en frío (mejor de ${String(tomas.length)} y mediana): barrio y su mundo ${mejor(conMundo).toFixed(2)} / ${mediana(conMundo).toFixed(2)} ms, ` +
        `barrio y el mundo de la Liza ${mejor(conLiza).toFixed(2)} / ${mediana(conLiza).toFixed(2)} ms, guion de los durmientes ${mejor(tomas.map((t) => t.guion)).toFixed(2)} ms, ` +
        `primeros 48 sitios ${mejor(tomas.map((t) => t.durmientes)).toFixed(2)} ms; templado, mediana ${mejor(tomas.map((t) => t.templado)).toFixed(3)} ms`,
    );
    nota(`cargar el módulo del barrio: ${mejor(cargas).toFixed(2)} / ${mediana(cargas).toFixed(2)} ms`);
    comprobar('derivar el barrio y su mundo cuesta 3 ms o menos en frío, sin barrer la memoria a mano', mejor(conMundo) <= 3, conMundo);
    comprobar('y con el mundo de la Liza en vez del de mundo.ts, 5 ms o menos (lo que el diseño da a la declaración B)', mejor(conLiza) <= 5, conLiza);
    comprobar('y el guion de los 48 durmientes, otros 3 ms o menos', mejor(tomas.map((t) => t.guion)) <= 3, tomas.map((t) => t.guion));
    comprobar('y cargar el módulo del barrio, 10 ms o menos', mejor(cargas) <= 10, cargas);
  }
}

// ---------------------------------------------------------------------------
paso('6 · El mismo barrio y los mismos durmientes en Node y en Hermes');
// ---------------------------------------------------------------------------

interface Resumen {
  readonly codigo: string;
  readonly noche: number;
  readonly barrio: string;
  readonly mundo: string;
  readonly liza: string;
  readonly despejado: string;
  readonly guion: string;
  readonly durmientes: string;
  readonly cajas: number;
  readonly rotulo: string;
}

function dondeEstaHermes(): string | null {
  const carpeta = path.join(REPO, 'node_modules', 'hermes-engine-cli');
  const candidato =
    process.platform === 'win32'
      ? path.join(carpeta, 'win64-bin', 'hermes.exe')
      : process.platform === 'darwin'
        ? path.join(carpeta, 'osx-bin', 'hermes')
        : path.join(carpeta, 'linux64-bin', 'hermes');
  return fs.existsSync(candidato) ? candidato : null;
}

{
  /*
   * LA TANDA: cuatro mesas, y de cada una la huella del barrio, de su mundo, del de la Liza, del
   * despejado, del guion y de los 48 sitios en nueve tics (con el más cercano, el tren y un
   * semáforo). Se escribe UNA vez; este proceso la importa y los dos motores la corren empaquetada,
   * así que lo que se compara es el mismo código en tres sitios y no tres copias de él.
   */
  const tanda = path.join(DIR, 'tanda.ts');
  fs.writeFileSync(
    tanda,
    `import { canonico } from '${RUTA_CANONICO}';\n` +
      `import { barrioDeLaNoche, despejarLaPlaza, mundoDeLaLizaDelBarrio, mundoDelBarrio, pasoAbierto, trenEn } from '${RUTA_DEL_BARRIO}';\n` +
      `import { durmienteMasCercano, durmientesEn, guionDeLosDurmientes } from '${RUTA_DE_LOS_DURMIENTES}';\n` +
      'function fnv(texto: string): string { let h = 0x811c9dc5; for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); }\n' +
      "const MESAS: [string, number][] = [['QWXYZ', 1], ['K7M2P', 3], ['ZZZZZ', 10], ['ABCDE', 7]];\n" +
      'const TICS = [0, 1, 599, 600, 1199, 12345, 20000, 123457, -777];\n' +
      'export function tanda() {\n' +
      '  const salida = [];\n' +
      '  for (const [codigo, noche] of MESAS) {\n' +
      '    const b = barrioDeLaNoche(codigo, noche);\n' +
      "    let d = '';\n" +
      '    for (const t of TICS) {\n' +
      "      for (const s of durmientesEn(b, t)) d += String(s.x) + ',' + String(s.z) + ',' + String(s.rumbo) + (s.anda ? 'a' : 'q') + ';';\n" +
      "      d += '|' + String(durmienteMasCercano(b, t, 0, 0)) + '|' + String(durmienteMasCercano(b, t, 40 * 65536, -20 * 65536, [0, 1, 2]));\n" +
      '      const tren = trenEn(b, t);\n' +
      "      d += '|' + (tren === null ? '-' : String(tren.cabeza) + ':' + String(tren.cola)) + '|' + (pasoAbierto(b, 5, 'x', t) ? '1' : '0');\n" +
      '    }\n' +
      '    const despejado = despejarLaPlaza(b);\n' +
      '    salida.push({ codigo, noche, barrio: fnv(canonico(b)), mundo: fnv(canonico(mundoDelBarrio(b))), liza: fnv(canonico(mundoDeLaLizaDelBarrio(b))), despejado: fnv(canonico(despejado) + canonico(mundoDeLaLizaDelBarrio(despejado))), guion: fnv(canonico(guionDeLosDurmientes(b))), durmientes: fnv(d), cajas: b.cajas.length, rotulo: b.adorno.rotulo });\n' +
      '  }\n' +
      '  return salida;\n' +
      '}\n',
    'utf8',
  );
  const entrada = path.join(DIR, 'entrada.ts');
  fs.writeFileSync(entrada, "import { tanda } from './tanda';\nconst linea = JSON.stringify(tanda());\n// @ts-ignore\nif (typeof print === 'function') print(linea); else console.log(linea);\n", 'utf8');

  let enProceso: Resumen[] = [];
  try {
    const modulo = (await import(pathToFileURL(tanda).href)) as { tanda: () => Resumen[] };
    enProceso = modulo.tanda();
  } catch (e) {
    comprobar('la tanda corre en este proceso', false, e instanceof Error ? e.message : String(e));
  }
  for (const r of enProceso) nota(`${r.codigo}#${String(r.noche)} «${r.rotulo}»: ${String(r.cajas)} cajas · barrio ${r.barrio} · mundo ${r.mundo} · liza ${r.liza} · despejado ${r.despejado} · guion ${r.guion} · durmientes ${r.durmientes}`);

  const hermes = dondeEstaHermes();
  comprobar('el intérprete de Hermes está instalado', hermes !== null, 'falta `hermes-engine-cli`: sin él esto NO compara dos motores, y se pone rojo en vez de saltárselo.');
  const crudo = path.join(DIR, 'tanda.js');
  const hecho = empaquetar(entrada, crudo, 'es2015');
  comprobar('el barrio y los durmientes se empaquetan para los dos motores', hecho.bien, hecho.error);
  let listo = hecho.bien;
  if (listo) {
    /*
     * `class` se baja a funciones una vez, sobre el paquete que corren los dos: Hermes 0.12 no la
     * entiende y `fijo.ts` y `canonico.ts` declaran una cada uno. Es la pasada de `verify:mundo`.
     */
    const NOMBRE_DEL_COMPLEMENTO = '@babel/plugin-transform-classes';
    const bajarClases = (await import(NOMBRE_DEL_COMPLEMENTO)) as { default: unknown };
    const babel = await import('@babel/core');
    const transformado = babel.transformFileSync(crudo, { babelrc: false, configFile: false, compact: false, plugins: [bajarClases.default as babel.PluginItem] });
    const codigo = transformado?.code ?? '';
    listo = codigo.length > 0;
    comprobar('y sus clases se bajan a funciones', listo);
    if (listo) fs.writeFileSync(crudo, codigo, 'utf8');
  }
  if (listo && hermes !== null) {
    const leer = (s: string): Resumen[] | null => {
      try {
        return JSON.parse(s.trim().split('\n').pop() ?? '') as Resumen[];
      } catch {
        return null;
      }
    };
    const enNode = spawnSync(process.execPath, [crudo], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const enHermes = spawnSync(hermes, [crudo], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    comprobar('Node y Hermes corren el paquete sin caerse', enNode.status === 0 && enHermes.status === 0, { node: enNode.stderr.slice(0, 300), hermes: enHermes.stderr.slice(0, 300) });
    const a = leer(enNode.stdout);
    const h = leer(enHermes.stdout);
    comprobar('SUELO: los dos motores y este proceso devuelven las cuatro mesas', a !== null && h !== null && a.length === 4 && h.length === 4 && enProceso.length === 4, { node: a?.length, hermes: h?.length, proceso: enProceso.length });
    if (a !== null && h !== null) {
      for (let k = 0; k < h.length; k++) nota(`Hermes ${h[k]?.codigo ?? '?'}: barrio ${h[k]?.barrio ?? '?'} · mundo ${h[k]?.mundo ?? '?'} · liza ${h[k]?.liza ?? '?'} · despejado ${h[k]?.despejado ?? '?'} · guion ${h[k]?.guion ?? '?'} · durmientes ${h[k]?.durmientes ?? '?'}`);
      comprobar('el barrio, su mundo, el de la Liza, el despejado, el guion y los sitios de los durmientes dan la MISMA huella en Node y en Hermes', JSON.stringify(a) === JSON.stringify(h), { node: a, hermes: h });
      comprobar('y el paquete da lo mismo que el código sin empaquetar en este proceso', JSON.stringify(a) === JSON.stringify(enProceso), { empaquetado: a, proceso: enProceso });
    }
  }
}

fs.rmSync(DIR, { recursive: true, force: true });

/* ═══════════════════════════════════════════════════════════════════════════
 *  LA CIUDAD ABIERTA (docs/quiebro/CIUDAD-ABIERTA.md §6.4)
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Los doce ejes de calle de la ciudad, escritos aquí y no importados (§2.1). */
const EJES_C = [-264, -216, -168, -120, -72, -24, 24, 72, 120, 168, 216, 264];
/*
 * LAS CIFRAS DE LA CIUDAD, escritas aquí por lo mismo que las del barrio: una comprobación que leyera del
 * módulo cuántas trazas mirar o cuántos metros caben entre dos plazas de un trío con obras seguiría en verde
 * el día que el módulo cambiara la cifra. Salen de `docs/quiebro/CIUDAD-ABIERTA.md` (§2, §3, §5) y de la
 * columna de `quiebro-ciudad.ts`; el paso 7 mira que el módulo diga lo mismo.
 */
/** 4 dibujos × 8 simetrías. */
const TRAZAS_C = 32;
const DIBUJOS_C = 4;
const SIMETRIAS_C = 8;
const DISTRITOS_C: readonly IdDeDistrito[] = ['casco', 'ensanche', 'lonja', 'naves', 'torres'];
const PLANTILLAS_C: readonly IdDePlantilla[] = ['glorieta', 'porticada', 'patio'];
/** Con las obras de una noche, dos plazas de un trío válido no quedan a más de esto por calles. */
const TRIO_CON_OBRAS_COMO_MUCHO = 260;
/** Los nombres de plaza de la lista: 16 como mínimo. */
const NOMBRES_DE_PLAZA_C = 16;
/** La plantilla de cada distrito de fuera (§2.3), y la de la Plaza Mayor. */
const DISTRITO_DE_LA_PLANTILLA: Readonly<Record<IdDeDistrito, IdDePlantilla>> = { casco: 'porticada', ensanche: 'glorieta', lonja: 'porticada', naves: 'patio', torres: 'glorieta' };

/** ¿Se pisan dos de estas cajas? Con una rejilla de 16 m. Devuelve el primer par. */
function primerPisoton(cajas: readonly Rectangulo[]): [number, number] | null {
  const celdas = new Map<number, number[]>();
  for (let k = 0; k < cajas.length; k++) {
    const c = cajas[k] as Rectangulo;
    for (let cz = Math.floor(c.z0 / 16); cz <= Math.floor(c.z1 / 16); cz++) {
      for (let cx = Math.floor(c.x0 / 16); cx <= Math.floor(c.x1 / 16); cx++) {
        const llave = (cz + 64) * 128 + (cx + 64);
        const lista = celdas.get(llave);
        if (lista === undefined) celdas.set(llave, [k]);
        else {
          for (const o of lista) if (solapan(c, cajas[o] as Rectangulo)) return [o, k];
          lista.push(k);
        }
      }
    }
  }
  return null;
}

/**
 * Los puntos libres de metro en metro, de −270 a 270, con el radio de una persona. Se pinta cada caja en la
 * rejilla con la misma pregunta que `chocaConCuerpo` (desigualdades estrictas, en Q16.16): el paso 10 lo
 * compara con `sePuedeEstar` punto a punto en una noche antes de fiarse.
 */
const LADO_DE_LA_REJILLA = 541;
function rejillaLibre(cajas: readonly Rectangulo[]): Uint8Array {
  const L = LADO_DE_LA_REJILLA;
  const libre = new Uint8Array(L * L).fill(1);
  for (const c of cajas) {
    const x0 = c.x0 * UNO - RADIO_EN_FIJO;
    const x1 = c.x1 * UNO + RADIO_EN_FIJO;
    const z0 = c.z0 * UNO - RADIO_EN_FIJO;
    const z1 = c.z1 * UNO + RADIO_EN_FIJO;
    for (let z = Math.max(-270, Math.floor(z0 / UNO)); z <= Math.min(270, Math.ceil(z1 / UNO)); z++) {
      if (!(z * UNO > z0 && z * UNO < z1)) continue;
      for (let x = Math.max(-270, Math.floor(x0 / UNO)); x <= Math.min(270, Math.ceil(x1 / UNO)); x++) {
        if (x * UNO > x0 && x * UNO < x1) libre[(z + 270) * L + (x + 270)] = 0;
      }
    }
  }
  return libre;
}

/**
 * Desde un punto libre, cuántos puntos libres quedan sin alcanzar andando de metro en metro. Andar de un
 * punto libre al de al lado es andar: toda caja de la ciudad mide 0,5 m o más, así que ensanchada el radio
 * mide 1,2 o más y no cabe entre dos puntos de la rejilla sin tapar alguno.
 */
function sinAlcanzar(libre: Uint8Array, x: number, z: number): { sueltos: number; primero: [number, number] | null; libres: number } {
  const L = LADO_DE_LA_REJILLA;
  const visto = new Uint8Array(L * L);
  const cola = new Int32Array(L * L);
  let cabeza = 0;
  let cuantos = 0;
  const inicio = (z + 270) * L + (x + 270);
  if (libre[inicio] === 1) {
    visto[inicio] = 1;
    cola[cuantos++] = inicio;
  }
  while (cabeza < cuantos) {
    const k = cola[cabeza++] as number;
    const i = k % L;
    for (const v of [i > 0 ? k - 1 : -1, i < L - 1 ? k + 1 : -1, k >= L ? k - L : -1, k < L * (L - 1) ? k + L : -1]) {
      if (v < 0 || visto[v] === 1 || libre[v] === 0) continue;
      visto[v] = 1;
      cola[cuantos++] = v;
    }
  }
  let sueltos = 0;
  let libres = 0;
  let primero: [number, number] | null = null;
  for (let k = 0; k < L * L; k++) {
    if (libre[k] === 0) continue;
    libres++;
    if (visto[k] === 1) continue;
    sueltos++;
    if (primero === null) primero = [(k % L) - 270, Math.floor(k / L) - 270];
  }
  return { sueltos, primero, libres };
}

function conexo(g: GrafoDeLaCiudad): boolean {
  const vecinos: number[][] = g.nudos.map(() => []);
  for (const a of g.aristas) {
    vecinos[a.a]?.push(a.b);
    vecinos[a.b]?.push(a.a);
  }
  const visto = new Uint8Array(g.nudos.length);
  const pila = [0];
  visto[0] = 1;
  let n = 1;
  while (pila.length > 0) {
    const u = pila.pop() as number;
    for (const v of vecinos[u] ?? []) {
      if (visto[v] === 1) continue;
      visto[v] = 1;
      n++;
      pila.push(v);
    }
  }
  return n === g.nudos.length;
}

// ---------------------------------------------------------------------------
paso('7 · Nada entra en la ciudad que no sea (traza, código, noche, Fallos)');
// ---------------------------------------------------------------------------

{
  const antes = huella(C.ciudadDeLaMesa(5, 'K7M2P'));
  const antesDeLaNoche = huella({ ...C.ciudadDeLaNoche(C.ciudadDeLaMesa(5, 'K7M2P'), 'K7M2P', 3, [2]), ciudad: null });
  for (let k = 0; k < 40; k++) C.ciudadDeLaNoche(C.ciudadDeLaMesa(k % TRAZAS_C, `OTRA${String(k)}`), `OTRA${String(k)}`, 1 + (k % 10), [1]);
  comprobar('la misma ciudad y la misma noche dos veces, con cuarenta más entre medias que las sacan de la memoria', huella(C.ciudadDeLaMesa(5, 'K7M2P')) === antes && huella({ ...C.ciudadDeLaNoche(C.ciudadDeLaMesa(5, 'K7M2P'), 'K7M2P', 3, [2]), ciudad: null }) === antesDeLaNoche);
  comprobar('el código sin mayúsculas da la misma ciudad', huella(C.ciudadDeLaMesa(5, 'k7m2p')) === antes);
  const c = C.ciudadDeLaMesa(5, 'K7M2P');
  const n = C.ciudadDeLaNoche(c, 'K7M2P', 3, [2]);
  const tocar: (() => void)[] = [
    () => (c.cajas as CajaDeLaCiudad[]).push(c.cajas[0] as CajaDeLaCiudad),
    () => {
      (c.grafo.nudos[0] as { x: number }).x = 999;
    },
    () => {
      (c.plazas[0] as { nudo: number }).nudo = 3;
    },
    () => {
      (c.edificios[0] as { alto: number }).alto = 1;
    },
    () => {
      (c.tramos[0] as { clase: string }).clase = 'avenida';
    },
    () => {
      (n.cajas[n.cajas.length - 1] as { x0: number }).x0 = 0;
    },
    () => {
      (C.mundoDeLaLizaDeLaCiudad(n, false).nace[0] as { x: number }).x = 0;
    },
  ];
  comprobar('lo que se guarda y se comparte entre mesas y noches está congelado: tocarlo lanza', tocar.every((t) => {
    try {
      t();
      return false;
    } catch (e) {
      return e instanceof TypeError;
    }
  }));
  comprobar('y tocarlo no cambió nada', huella(C.ciudadDeLaMesa(5, 'K7M2P')) === antes);
  const otraMesa = C.ciudadDeLaMesa(5, 'ZZZZZ');
  const otraTraza = C.ciudadDeLaMesa(6, 'K7M2P');
  const sinEtiqueta = (x: CiudadDeLaMesa): string => huella({ ...x, codigo: '', traza: 0, simetria: 0 });
  comprobar(
    'otra mesa de la misma traza comparte la traza (los mismos tramos y el mismo grafo, el mismo objeto) y no los edificios; otra traza es otra ciudad',
    otraMesa.grafo === c.grafo && otraMesa.tramos === c.tramos && huella(otraMesa.edificios) !== huella(c.edificios) && sinEtiqueta(otraTraza) !== sinEtiqueta(c),
  );
  const f1 = C.ciudadDeLaNoche(c, 'K7M2P', 3, [2]);
  const f2 = C.ciudadDeLaNoche(c, 'K7M2P', 3, [2, 1, 4]);
  const otraNoche = C.ciudadDeLaNoche(c, 'K7M2P', 4, [2]);
  comprobar(
    'la misma noche con los mismos Fallos es el mismo objeto; con otros Fallos, el mismo vestido (las mismas cajas y el mismo grafo); otra noche, otro vestido',
    f1 === n && f2 !== n && f2.cajas === n.cajas && f2.grafo === n.grafo && huella(f2.fallos) === '[2,1,4]' && huella({ ...otraNoche, ciudad: null, noche: 0, fallos: [] }) !== huella({ ...n, ciudad: null, noche: 0, fallos: [] }),
  );
  comprobar(
    'lanzan: una traza fuera de 0-31, una noche de otro código, unos Fallos repetidos, de una plaza que no hay o más de cinco, y un cruce que no existe',
    lanzaRango(() => C.ciudadDeLaMesa(32, 'K7M2P')) &&
      lanzaRango(() => C.ciudadDeLaMesa(-1, 'K7M2P')) &&
      lanzaRango(() => C.ciudadDeLaMesa(1.5, 'K7M2P')) &&
      lanzaRango(() => C.ciudadDeLaNoche(c, 'OTRO', 1, [])) &&
      lanzaRango(() => C.ciudadDeLaNoche(c, 'K7M2P', 1, [2, 2])) &&
      lanzaRango(() => C.ciudadDeLaNoche(c, 'K7M2P', 1, [7])) &&
      lanzaRango(() => C.ciudadDeLaNoche(c, 'K7M2P', 1, [1, 2, 3, 4, 5, 6])) &&
      lanzaRango(() => C.pasoAbiertoEnLaCiudad(n, 144, 'x', 0)) &&
      lanzaRango(() => C.trenEnLaCiudad(n, Number.NaN)) &&
      lanzaRango(() => C.pasoAbiertoEnLaCiudad(n, 3, 'x', Number.POSITIVE_INFINITY)),
  );
  const mismas = (a: readonly unknown[], b: readonly unknown[]): boolean => a.length === b.length && a.every((v, k) => v === b[k]);
  comprobar(
    'las cifras de la ciudad son las del diseño: 32 trazas de 4 dibujos en 8 simetrías, sus 5 distritos y 3 plantillas, 260 m entre las plazas de un trío con obras, 16 nombres de plaza y las bandas de la Llamada en 100-160 y 180-260',
    C.TRAZAS === TRAZAS_C &&
      C.TRAZAS_DIBUJADAS === DIBUJOS_C &&
      C.SIMETRIAS === SIMETRIAS_C &&
      mismas(C.DISTRITOS, DISTRITOS_C) &&
      mismas(C.PLANTILLAS, PLANTILLAS_C) &&
      C.FALLOS_CON_CORTES_COMO_MUCHO === TRIO_CON_OBRAS_COMO_MUCHO &&
      C.NOMBRES_DE_PLAZA_COMO_MINIMO === NOMBRES_DE_PLAZA_C &&
      mismas(C.BANDA_DE_LA_CABINA_CERCANA, [100, 160]) &&
      mismas(C.BANDA_DE_LA_CABINA_LEJANA, [180, 260]),
    { trazas: C.TRAZAS, dibujos: C.TRAZAS_DIBUJADAS, simetrias: C.SIMETRIAS, trio: C.FALLOS_CON_CORTES_COMO_MUCHO, nombres: C.NOMBRES_DE_PLAZA_COMO_MINIMO, bandas: [C.BANDA_DE_LA_CABINA_CERCANA, C.BANDA_DE_LA_CABINA_LEJANA] },
  );
  comprobar(
    'las funciones de la ciudad no esperan nada más que lo suyo',
    C.ciudadDeLaMesa.length === 2 &&
      C.ciudadDeLaNoche.length === 4 &&
      C.despejarLasPlazas.length === 1 &&
      C.mundoDeLaLizaDeLaCiudad.length === 2 &&
      C.trenEnLaCiudad.length === 2 &&
      C.pasoAbiertoEnLaCiudad.length === 4 &&
      C.trazaOrientada.length === 1 &&
      D.durmientesDeLaCiudad.length === 1 &&
      D.sitioDelDurmienteEnLaCiudad.length === 3 &&
      D.durmientesCercaEnLaCiudad.length === 6,
  );
}

// ---------------------------------------------------------------------------
paso('8 · Las plantillas de plaza, en sus ocho giros');
// ---------------------------------------------------------------------------
{
  const mal = new Map<string, unknown[]>();
  const apuntar = (regla: string, detalle: unknown): void => {
    const l = mal.get(regla) ?? [];
    if (l.length < 3) l.push(detalle);
    mal.set(regla, l);
  };
  const REGLAS = [
    'todas sus cajas bien formadas, en cuartos, dentro de la plaza con sus calles (±24), y ninguna pisa otra: ni lo fijo, ni un sitio de lo variable, ni un coche de la plaza',
    'sus 8 zonas de impresión, la del Fallo y sus 6 sitios de nacer caben con el radio de una persona contra TODO lo que puede haber, dentro del solar',
    'los 6 sitios de nacer miran cada uno a un sitio, y la zona del Fallo queda a 1,5 m o menos del objeto que falla',
    'las 8 bocas, en la calzada de una de las calles de la plaza (a 3 m o menos de su eje) y pasado el cruce (a más de 27 m del centro), y libres de los coches de la plaza',
    'su subgrafo sólo por los ejes: con sus líneas simétricas, conexo, con el nudo del centro y entrando por los cuatro lados',
  ];
  for (const id of PLANTILLAS_C) {
    const p = PLANTILLAS_DE_PLAZA[id] as PlantillaDePlaza;
    for (let s = 0; s < SIMETRIAS_C; s++) {
      const girar = (r: Rectangulo): Rectangulo => C.rectanguloSimetrico(s, r);
      const cajas: Rectangulo[] = [...p.fijas.map(girar), ...p.variables.flatMap((g) => g.sitios.map(girar)), ...COCHES_DE_LA_PLAZA.map(girar)];
      const donde = `${id}·${String(s)}`;
      for (const c of cajas) {
        const cuarto = [c.x0, c.z0, c.x1, c.z1].every((v) => v * 4 === Math.round(v * 4));
        if (!(c.x0 < c.x1 && c.z0 < c.z1) || !cuarto || Math.max(Math.abs(c.x0), Math.abs(c.x1), Math.abs(c.z0), Math.abs(c.z1)) > 24) apuntar(REGLAS[0] as string, { donde, c });
      }
      const pis = primerPisoton(cajas);
      if (pis !== null) apuntar(REGLAS[0] as string, { donde, a: cajas[pis[0]], b: cajas[pis[1]] });
      const libre = (r: Rectangulo): boolean => !cajas.some((c) => solapan(ensanchado(r, RADIO), c)) && r.x0 >= -18 && r.x1 <= 18 && r.z0 >= -18 && r.z1 <= 18;
      const punto = (x: number, z: number): Rectangulo => ({ x0: x, z0: z, x1: x, z1: z });
      for (const r of [...p.impresion.map(girar), girar(p.fallo)]) if (!libre(r)) apuntar(REGLAS[1] as string, { donde, r });
      for (const n of p.nace) {
        const q = C.puntoSimetrico(s, n.x, n.z);
        if (!libre(punto(q.x, q.z))) apuntar(REGLAS[1] as string, { donde, n });
      }
      const f = girar(p.fallo);
      const o = C.puntoSimetrico(s, p.objeto.x, p.objeto.z);
      const cx = Math.max(f.x0, Math.min(f.x1, o.x));
      const cz = Math.max(f.z0, Math.min(f.z1, o.z));
      if (new Set(p.nace.map((n) => C.rumboSimetrico(s, n.rumbo))).size !== 6 || p.nace.length !== 6 || (cx - o.x) ** 2 + (cz - o.z) ** 2 > 1.5 * 1.5 || p.impresion.length !== 8) apuntar(REGLAS[2] as string, { donde });
      const coches = COCHES_DE_LA_PLAZA.map(girar);
      for (const b of BOCAS_DE_LA_PLAZA.map(girar)) {
        /* Las calles de la plaza tienen el eje en ±24 y 6 m de calzada; el cruce es donde se tocan las dos calzadas (±27). */
        const porX = Math.abs(Math.abs((b.z0 + b.z1) / 2) - 24) + (b.z1 - b.z0) / 2 <= 3 && (b.x0 >= 27 || b.x1 <= -27);
        const porZ = Math.abs(Math.abs((b.x0 + b.x1) / 2) - 24) + (b.x1 - b.x0) / 2 <= 3 && (b.z0 >= 27 || b.z1 <= -27);
        if (!(porX || porZ) || coches.some((c) => solapan(ensanchado(b, RADIO), c))) apuntar(REGLAS[3] as string, { donde, b });
      }
      /* El subgrafo, como lo haría la ciudad: las líneas (y las de las calles, en ±24) cruzadas todas con todas. */
      const lineas = [...p.lineas];
      const simetricas = lineas.every((v) => lineas.includes(-v || 0)) && lineas.every((v) => Math.abs(v) < 24);
      const lx = [-24, ...p.lineas.map((v) => ((s & 1) !== 0 ? -v || 0 : v)), 24].sort((a, b) => a - b);
      const lz = [-24, ...p.lineas.map((v) => ((s & 2) !== 0 ? -v || 0 : v)), 24].sort((a, b) => a - b);
      const idx = (i: number, j: number): number => j * lx.length + i;
      const tapa = (ax: number, az: number, bx: number, bz: number): boolean => cajas.some((c) => {
        const e = ensanchado(c, RADIO);
        return ax === bx ? e.x0 < ax && ax < e.x1 && e.z0 < Math.max(az, bz) && Math.min(az, bz) < e.z1 : e.z0 < az && az < e.z1 && e.x0 < Math.max(ax, bx) && Math.min(ax, bx) < e.x1;
      });
      const vecinos: number[][] = [];
      for (let k = 0; k < lx.length * lz.length; k++) vecinos.push([]);
      for (let j = 0; j < lz.length; j++) {
        for (let i = 0; i < lx.length; i++) {
          if (i + 1 < lx.length && !(j === 0 || j === lz.length - 1) && !tapa(lx[i] as number, lz[j] as number, lx[i + 1] as number, lz[j] as number)) {
            (vecinos[idx(i, j)] as number[]).push(idx(i + 1, j));
            (vecinos[idx(i + 1, j)] as number[]).push(idx(i, j));
          }
          if (j + 1 < lz.length && !(i === 0 || i === lx.length - 1) && !tapa(lx[i] as number, lz[j] as number, lx[i] as number, lz[j + 1] as number)) {
            (vecinos[idx(i, j)] as number[]).push(idx(i, j + 1));
            (vecinos[idx(i, j + 1)] as number[]).push(idx(i, j));
          }
        }
      }
      const centro = C.puntoSimetrico(s, p.centro.x, p.centro.z);
      const k0 = idx(lx.indexOf(centro.x), lz.indexOf(centro.z));
      const alcanzados = new Set([k0]);
      const pila = [k0];
      while (pila.length > 0) for (const v of vecinos[pila.pop() as number] ?? []) if (!alcanzados.has(v)) (alcanzados.add(v), pila.push(v));
      const lados = { oeste: 0, este: 0, norte: 0, sur: 0 };
      for (const k of alcanzados) {
        const i = k % lx.length;
        const j = Math.floor(k / lx.length);
        if (i === 0) lados.oeste++;
        if (i === lx.length - 1) lados.este++;
        if (j === 0) lados.norte++;
        if (j === lz.length - 1) lados.sur++;
      }
      const conAristas = [...vecinos.keys()].filter((k) => (vecinos[k] as number[]).length > 0);
      if (!simetricas || lx.indexOf(centro.x) < 0 || lz.indexOf(centro.z) < 0 || conAristas.some((k) => !alcanzados.has(k)) || Object.values(lados).some((n) => n < 2)) apuntar(REGLAS[4] as string, { donde, simetricas, lados, sueltos: conAristas.filter((k) => !alcanzados.has(k)).length });
    }
  }
  for (const regla of REGLAS) comprobar(`las tres plantillas, en sus ocho giros: ${regla}`, !mal.has(regla), mal.get(regla));
  /* La Glorieta es la de hoy: lo fijo de la plantilla, caja a caja, es lo fijo de la glorieta del barrio (sin el tren ni el refugio). */
  const b = barrioDeLaNoche('QWXYZ', 1);
  const deHoy = b.cajas.filter((c) => (c.tipo === 'fuente' || (c.tipo === 'banco' && Math.max(Math.abs(c.x0), Math.abs(c.x1)) <= 6.5 && Math.max(Math.abs(c.z0), Math.abs(c.z1)) <= 6.5) || (c.tipo === 'farola' && Math.max(Math.abs(c.x0), Math.abs(c.z0)) < 18)));
  const plantilla = PLANTILLAS_DE_PLAZA.glorieta.fijas;
  const igual = (a: Rectangulo, c: Rectangulo): boolean => a.x0 === c.x0 && a.z0 === c.z0 && a.x1 === c.x1 && a.z1 === c.z1;
  comprobar(
    'la plantilla de la Glorieta es la glorieta del barrio de hoy: sus 13 cajas fijas, una a una, con su tipo, su alto y su frente',
    deHoy.length === 13 && plantilla.length === 13 && deHoy.every((c) => plantilla.some((q) => igual(q, c) && q.tipo === c.tipo && q.alto === c.alto && q.mira === c.mira)),
    { deHoy: deHoy.length, plantilla: plantilla.length },
  );
}

// ---------------------------------------------------------------------------
paso('9 · Las cuatro trazas dibujadas');
// ---------------------------------------------------------------------------
{
  const mal = new Map<string, unknown[]>();
  const apuntar = (regla: string, detalle: unknown): void => {
    const l = mal.get(regla) ?? [];
    if (l.length < 3) l.push(detalle);
    mal.set(regla, l);
  };
  const REGLAS = [
    'cuatro trazas, cada una con sus dos mapas de 11 × 11 bien escritos',
    'seis plazas: la Glorieta en (0, 0), la Plaza Mayor en el Casco y una por distrito de fuera, cada una con la plantilla de su distrito (§2.3)',
    'ninguna plaza en el anillo de fuera ni junto a una avenida, y ninguna a menos de dos manzanas de otra',
    'los callejones de cada distrito (Casco 7-9, Lonja y Naves 5-7, Ensanche 2-4, Torres ninguno), nunca partiendo 30 m',
    'los soportales en el porcentaje de su distrito (±8 puntos; ninguno en las Naves ni en las Torres), nunca en una plaza ni en la cara de la boca de un callejón',
    '20 cabinas (4 por distrito) y 10 refugios (2 por distrito), en un sitio de poste de una cara de manzana que no da a una plaza, sin repetir',
    'la tabla de distancias es simétrica, con ceros en la diagonal, y cada plaza como Bajada tiene algún trío de Fallos',
    'los nombres de las plazas: seis distintos de la lista de 16, y el 0 para la Glorieta del Relojero',
  ];
  const distritoDe = (i: number, j: number): IdDeDistrito => C.distritoDelHueco(0, i, j);
  const alElevado = (j: number): boolean => j === -3 || j === -2;
  const alBulevar = (i: number, j: number): boolean => (i === 2 || i === 3) && j >= -2;
  if (TRAZAS_DE_LA_CIUDAD.length !== DIBUJOS_C) apuntar(REGLAS[0] as string, TRAZAS_DE_LA_CIUDAD.length);
  TRAZAS_DE_LA_CIUDAD.forEach((t, d) => {
    const bien = t.huecos.length === 11 && t.soportales.length === 11 && t.huecos.every((f) => /^[.|\-1-6]{11}$/.test(f)) && t.soportales.every((f) => /^[0-9A-F]{11}$/.test(f));
    if (!bien) {
      apuntar(REGLAS[0] as string, { d });
      return;
    }
    const at = (mapa: readonly string[], i: number, j: number): string => (mapa[j + 5] as string)[i + 5] as string;
    const plazas: { n: number; i: number; j: number }[] = [];
    const callejones: Record<IdDeDistrito, number> = { casco: 0, ensanche: 0, lonja: 0, naves: 0, torres: 0 };
    const caras: Record<IdDeDistrito, [number, number]> = { casco: [0, 0], ensanche: [0, 0], lonja: [0, 0], naves: [0, 0], torres: [0, 0] };
    for (let j = -5; j <= 5; j++) {
      for (let i = -5; i <= 5; i++) {
        const c = at(t.huecos, i, j);
        const s = parseInt(at(t.soportales, i, j), 16);
        const dd = distritoDe(i, j);
        if (c >= '1' && c <= '6') {
          plazas.push({ n: Number(c), i, j });
          if (s !== 0) apuntar(REGLAS[4] as string, { d, i, j, plaza: true });
          continue;
        }
        if (c === '|' || c === '-') {
          callejones[dd]++;
          if ((c === '-' && alElevado(j)) || (c === '|' && alBulevar(i, j))) apuntar(REGLAS[3] as string, { d, i, j, c });
          if ((c === '|' && (s & 5) !== 0) || (c === '-' && (s & 10) !== 0)) apuntar(REGLAS[4] as string, { d, i, j, boca: c, s });
        }
        for (const bit of [1, 2, 4, 8]) {
          if ((c === '|' && (bit & 5) !== 0) || (c === '-' && (bit & 10) !== 0)) continue;
          (caras[dd] as [number, number])[1]++;
          if ((s & bit) !== 0) (caras[dd] as [number, number])[0]++;
        }
      }
    }
    const porNumero = [1, 2, 3, 4, 5, 6].map((n) => plazas.find((p) => p.n === n));
    const distritos = porNumero.map((p) => (p === undefined ? null : distritoDe(p.i, p.j)));
    const fuera = new Set(distritos.slice(2));
    const plantillasBien = t.plantillas[0] === 'glorieta' && t.plantillas.every((pl, k) => k === 0 || pl === DISTRITO_DE_LA_PLANTILLA[distritos[k] as IdDeDistrito]);
    if (plazas.length !== 6 || porNumero.some((p) => p === undefined) || porNumero[0]?.i !== 0 || porNumero[0]?.j !== 0 || distritos[1] !== 'casco' || fuera.size !== 4 || fuera.has('casco') || !plantillasBien) apuntar(REGLAS[1] as string, { d, plazas, distritos });
    for (const p of plazas) {
      if (Math.abs(p.i) > 4 || Math.abs(p.j) > 4 || alElevado(p.j) || alBulevar(p.i, p.j)) apuntar(REGLAS[2] as string, { d, p });
      for (const q of plazas) if (q !== p && Math.abs(q.i - p.i) + Math.abs(q.j - p.j) < 2) apuntar(REGLAS[2] as string, { d, p, q });
    }
    const rangos: Record<IdDeDistrito, [number, number]> = { casco: [7, 9], lonja: [5, 7], naves: [5, 7], ensanche: [2, 4], torres: [0, 0] };
    for (const dd of DISTRITOS_C) if (callejones[dd] < (rangos[dd] as [number, number])[0] || callejones[dd] > (rangos[dd] as [number, number])[1]) apuntar(REGLAS[3] as string, { d, dd, n: callejones[dd] });
    const objetivo: Record<IdDeDistrito, number> = { casco: 10, ensanche: 20, lonja: 25, naves: 0, torres: 0 };
    for (const dd of DISTRITOS_C) {
      const [con, total] = caras[dd] as [number, number];
      const por = (100 * con) / total;
      if (Math.abs(por - objetivo[dd]) > 8 || (objetivo[dd] === 0 && con > 0)) apuntar(REGLAS[4] as string, { d, dd, por });
    }
    const postes = [...t.cabinas.map((p) => ({ p, que: 'cabina' })), ...t.refugios.map((p) => ({ p, que: 'refugio' }))];
    const cuenta = new Map<string, number>();
    const vistos = new Set<string>();
    for (const { p, que } of postes) {
      const [i, j, cara, a] = p;
      const c = Math.abs(i) <= 5 && Math.abs(j) <= 5 ? at(t.huecos, i, j) : '?';
      const vi = cara === 'este' ? i + 1 : cara === 'oeste' ? i - 1 : i;
      const vj = cara === 'sur' ? j + 1 : cara === 'norte' ? j - 1 : j;
      const vecino = Math.abs(vi) <= 5 && Math.abs(vj) <= 5 ? at(t.huecos, vi, vj) : '.';
      const porX = cara === 'norte' || cara === 'sur';
      const largo = porX ? 36 - (alBulevar(i, j) ? 6 : 0) : 36 - (alElevado(j) ? 6 : 0);
      const boca = (c === '|' && porX) || (c === '-' && !porX);
      const llave = `${String(i)},${String(j)},${cara},${String(a)}`;
      if (!(c === '.' || c === '|' || c === '-') || (vecino >= '1' && vecino <= '6') || !C.sitiosDePoste(largo).includes(a) || (boca && largo !== 36) || vistos.has(llave)) apuntar(REGLAS[5] as string, { d, p, que });
      vistos.add(llave);
      if (c !== '?') cuenta.set(`${que}·${distritoDe(i, j)}`, (cuenta.get(`${que}·${distritoDe(i, j)}`) ?? 0) + 1);
    }
    if (t.cabinas.length !== 20 || t.refugios.length !== 10 || DISTRITOS_C.some((dd) => cuenta.get(`cabina·${dd}`) !== 4 || cuenta.get(`refugio·${dd}`) !== 2)) apuntar(REGLAS[5] as string, { d, cuenta: [...cuenta] });
    const dist = t.distancias;
    const simetrica = dist.length === 6 && dist.every((f, a) => f.length === 6 && f.every((v, b) => v === (dist[b] as readonly number[])[a] && (a === b) === (v === 0)));
    const conPlazas = { plazas: porNumero.map((p, k) => ({ numero: k + 1, distrito: p === undefined ? 'casco' : distritoDe(p.i, p.j) })) as unknown as CiudadDeLaMesa['plazas'], distancias: dist };
    const sinTrio = simetrica ? [1, 2, 3, 4, 5, 6].filter((b) => C.triosDeFallos(conPlazas, b).length === 0) : [0];
    if (!simetrica || sinTrio.length > 0) apuntar(REGLAS[6] as string, { d, simetrica, sinTrio });
    if (t.nombres.length !== 6 || new Set(t.nombres).size !== 6 || t.nombres[0] !== 0 || t.nombres.some((n) => !Number.isInteger(n) || n < 0 || n >= NOMBRES_DE_PLAZA_C)) apuntar(REGLAS[7] as string, { d, nombres: t.nombres });
  });
  for (const regla of REGLAS) comprobar(regla, !mal.has(regla), mal.get(regla));
}

// ---------------------------------------------------------------------------
paso('10 · La ciudad de las 32 trazas, diez noches cada una');
// ---------------------------------------------------------------------------

/** Los códigos de la prueba: uno por traza, del alfabeto de las mesas, escritos por una sucesión fija. */
function codigosDeLaPrueba(cuantos: number): string[] {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const salida: string[] = [];
  let h = 20260924;
  while (salida.length < cuantos) {
    let codigo = '';
    for (let k = 0; k < 5; k++) {
      h = (Math.imul(h, 1103515245) + 12345) >>> 0;
      codigo += letras[(h >>> 11) % letras.length] ?? 'A';
    }
    salida.push(codigo);
  }
  return salida;
}
const CODIGOS = codigosDeLaPrueba(TRAZAS_C);
const NOCHES = 10;

/** Los Fallos de la noche `n` de la prueba: la Bajada y un trío válido (la 1, en la Glorieta; las demás, rotando), para despejar de verdad. */
function fallosDeLaPrueba(ciudad: CiudadDeLaMesa, n: number): number[] {
  const bajada = n === 1 ? 1 : 1 + ((n * 5 + ciudad.traza) % 6);
  const trios = C.triosDeFallos(ciudad, bajada);
  const trio = trios[(n + ciudad.traza) % Math.max(1, trios.length)];
  return trio === undefined ? [bajada] : [bajada, trio[0], trio[1]];
}

/**
 * UN DIJKSTRA DEL COMPROBADOR, para contrastar `campoHasta`: de montículo binario, con el `largo` que trae
 * cada arista y sin nada de la ciudad (ni su índice, ni sus cuartos, ni sus cubetas). −1 donde no se llega.
 */
function dijkstraDeReferencia(grafo: GrafoDeLaCiudad, meta: number): Float64Array {
  const n = grafo.nudos.length;
  const vecinos: { v: number; largo: number }[][] = [];
  for (let u = 0; u < n; u++) vecinos.push([]);
  for (const a of grafo.aristas) {
    (vecinos[a.a] as { v: number; largo: number }[]).push({ v: a.b, largo: a.largo });
    (vecinos[a.b] as { v: number; largo: number }[]).push({ v: a.a, largo: a.largo });
  }
  const metros = new Float64Array(n).fill(Number.POSITIVE_INFINITY);
  const hecho = new Uint8Array(n);
  const monton: [number, number][] = [];
  const subir = (i0: number): void => {
    let i = i0;
    while (i > 0) {
      const padre = (i - 1) >> 1;
      if ((monton[padre] as [number, number])[0] <= (monton[i] as [number, number])[0]) break;
      [monton[padre], monton[i]] = [monton[i] as [number, number], monton[padre] as [number, number]];
      i = padre;
    }
  };
  const bajar = (): void => {
    let i = 0;
    for (;;) {
      const iz = 2 * i + 1;
      const de = iz + 1;
      let m = i;
      if (iz < monton.length && (monton[iz] as [number, number])[0] < (monton[m] as [number, number])[0]) m = iz;
      if (de < monton.length && (monton[de] as [number, number])[0] < (monton[m] as [number, number])[0]) m = de;
      if (m === i) return;
      [monton[m], monton[i]] = [monton[i] as [number, number], monton[m] as [number, number]];
      i = m;
    }
  };
  metros[meta] = 0;
  monton.push([0, meta]);
  while (monton.length > 0) {
    const [d, u] = monton[0] as [number, number];
    const ultimo = monton.pop() as [number, number];
    if (monton.length > 0) {
      monton[0] = ultimo;
      bajar();
    }
    if (hecho[u] === 1) continue;
    hecho[u] = 1;
    for (const { v, largo } of vecinos[u] as { v: number; largo: number }[]) {
      if (d + largo < (metros[v] as number)) {
        metros[v] = d + largo;
        monton.push([d + largo, v]);
        subir(monton.length - 1);
      }
    }
  }
  for (let u = 0; u < n; u++) if (hecho[u] === 0) metros[u] = -1;
  return metros;
}

/** ¿Da `campoHasta` los metros del Dijkstra del comprobador? `null` si sí; si no, el primer nudo distinto. */
function campoDistinto(grafo: GrafoDeLaCiudad, meta: number): { meta: number; nudo: number; campo: number; referencia: number } | null {
  const campo = C.campoHasta(grafo, meta);
  const referencia = dijkstraDeReferencia(grafo, meta);
  if (campo.meta !== meta || campo.metros.length !== referencia.length) return { meta, nudo: -1, campo: campo.metros.length, referencia: referencia.length };
  for (let k = 0; k < referencia.length; k++) {
    if (campo.metros[k] !== referencia[k]) return { meta, nudo: k, campo: campo.metros[k] as number, referencia: referencia[k] as number };
  }
  return null;
}

{
  const fallos = new Map<string, unknown[]>();
  const apuntar = (regla: string, detalle: unknown): void => {
    const l = fallos.get(regla) ?? [];
    if (l.length < 3) l.push(detalle);
    fallos.set(regla, l);
  };
  const REGLAS = [
    'la ciudad de la mesa canoniza, con toda medida en cuartos de metro y todo índice entero',
    'su forma: 121 huecos en orden con el distrito de su simetría, 6 plazas (la 1, la Glorieta, en (0, 0)), 144 cruces en los ejes, 24 calles, 264 tramos, 169 celdas, 20 cabinas, 10 refugios y 132 zonas del 1 en adelante',
    'sus cajas van en el orden del contrato (el cerco, las manzanas hueco a hueco, las avenidas, las plazas de la 1 a la 6, las cabinas y los refugios) y no pasan de 2.400',
    'cada manzana, un edificio (dos con callejón) cuya caja es su huella menos 3 m en cada soportal, con un pilar cada 6 m en cada soportal, dentro de su huella',
    'el grafo base: los 144 cruces delante, aristas sólo por los ejes, sin bucles ni repetidas, con su largo exacto, 4.500 nudos y 6.500 aristas como mucho, y conexo',
    'la tabla de distancias es la del grafo, entre los nudos de las plazas, y la misma que la de su traza dibujada',
    'cada plaza con su límite de 60 × 60, su nudo en su sitio, el objeto que falla y sus 6 sitios de nacer',
    'las cabinas y los refugios: su poste en su caja, la cabina a 1,5 m o menos de toda su zona, los tres sitios del refugio dentro de la suya',
    'las celdas: cada caja de la mesa en la de su centro, y los edificios que tocan cada una',
    'la noche: las cajas de la mesa con sus índices, detrás las de la calle, lo variable de las plazas y las obras, y ninguna caja pisa otra (2.400 como mucho, en cuartos, dentro de ±272)',
    'las obras: de 4 a 6 por noche, en calles que no son mayores, ni avenidas, ni de fuera, ni dan a una plaza, de acera a acera',
    'cada zona, libre para una persona contra todas las cajas de cada noche',
    'el grafo de la noche: los mismos nudos, las aristas del base menos exactamente las que entran en una obra, conexo, y cada arista se anda en recta con el radio de una persona',
    'no hay bolsas: con las obras, todo punto libre de la ciudad (de metro en metro) se alcanza desde la Glorieta',
    'con las obras, las plazas de cada trío válido quedan a 260 m o menos por calles',
    'las cabinas, con campos desde ellas: desde el nudo de cada plaza, alguna a 100-160 m por calles y alguna a 180-260, también con las obras de cada noche; y con el grafo base, desde cualquier nudo alguna a 80-180 y alguna a 160-280, y el 97 % de los nudos con las dos bandas exactas (el 95 % con las obras)',
    'el mundo de la Liza, con las plazas y despejadas, no tiene problemas para la Liza, y es la noche en Q16.16 exacto',
    'nace: los 6 de la plaza de la Bajada primero, los 36 de asiento y los 30 de reaparición por su distancia a ella, y en todos cabe una persona',
    'las plazas despejadas: la noche sin las cajas despejables de las plazas de los Fallos, en su orden, con las obras renumeradas a su misma caja, y despejar lo despejado no hace nada',
    'el tren pasa por el Elevado sin salirse de su viaducto, y los 144 semáforos son de su ciclo',
    'campoHasta da los metros de un Dijkstra del comprobador (de montículo, con el largo de cada arista): desde las 6 plazas y dos nudos fijos en el grafo base, y en el de cada noche desde la Bajada y dos cabinas',
    'dentro del límite de cada plaza (con el radio de una persona, sin despejar) no cambia nada de una noche a otra de la mesa: quien acaba una noche dentro de la plaza de la Bajada siguiente no amanece dentro de una caja',
  ];
  let libresMirados = 0;
  let aristasAndadas = 0;
  let nochesSinObras = 0;
  const tipos = new Set<string>();
  let cajasPorNoche = 0;
  let maxCajas = 0;
  let maxNudos = 0;
  let maxAristas = 0;
  let sinCercana = 0;
  let sinLejana = 0;
  let comprobadaLaRejilla = false;
  let camposMirados = 0;
  let deLaNocheEnLasPlazas = 0;
  for (let t = 0; t < TRAZAS_C; t++) {
    const codigo = CODIGOS[t] as string;
    const c = C.ciudadDeLaMesa(t, codigo);
    const id = `${String(t)}#${codigo}`;
    const mal = (regla: number, detalle: unknown): void => apuntar(REGLAS[regla] as string, { id, detalle });
    const porque = porQueNoEsCanonico(c);
    if (porque !== null) mal(0, porque);
    const numeros: { ruta: string; valor: number }[] = [];
    losNumeros({ ...c, rotulos: [] }, 'ciudad', numeros);
    for (const n of numeros) if (!Number.isFinite(n.valor) || n.valor * 4 !== Math.round(n.valor * 4)) mal(0, n);

    const { dibujo, simetria } = C.partesDeLaTraza(t);
    const forma =
      c.huecos.length === 121 &&
      c.huecos.every((h, n) => h.indice === n && C.indiceDeHueco(h.i, h.j) === n && h.distrito === C.distritoDelHueco(simetria, h.i, h.j)) &&
      c.plazas.length === 6 &&
      c.plazas.every((p, k) => p.numero === k + 1) &&
      c.plazas[0]?.hueco === C.indiceDeHueco(0, 0) &&
      c.cruces.length === 144 &&
      c.cruces.every((q, k) => q.x === EJES_C[k % 12] && q.z === EJES_C[Math.floor(k / 12)]) &&
      c.calles.length === 24 &&
      c.tramos.length === 264 &&
      c.tramos.every((tr, k) => tr.indice === k) &&
      c.celdas.length === 169 &&
      c.cabinas.length === 20 &&
      c.refugios.length === 10 &&
      c.zonas.every((z, k) => z.id === k + 1) &&
      c.zonas.length === 132 &&
      c.dibujo === dibujo &&
      c.simetria === simetria;
    if (!forma) mal(1, { huecos: c.huecos.length, zonas: c.zonas.length });

    /* El orden de las cajas de la mesa. */
    let fase = 0;
    let huecoAntes = -1;
    let plazaAntes = 0;
    const ordenMal: unknown[] = [];
    c.cajas.forEach((k, i) => {
      const f =
        k.tipo === 'fachada-exterior'
          ? 0
          : k.hueco !== null && k.plaza === 0 && (k.tipo === 'edificio' || k.tipo === 'pilar-de-soportal' || k.tipo === 'farola')
            ? 1
            : k.hueco === null && (k.tipo === 'pilar-del-tren' || k.tipo === 'tronco' || k.tipo === 'banco')
              ? 2
              : k.plaza > 0
                ? 3
                : k.tipo === 'cabina'
                  ? 4
                  : k.tipo === 'refugio'
                    ? 5
                    : 9;
      if (f < fase || f === 9) ordenMal.push({ i, tipo: k.tipo, f, fase });
      if (f === 1 && (k.hueco as number) < huecoAntes) ordenMal.push({ i, hueco: k.hueco, huecoAntes });
      if (f === 3 && k.plaza < plazaAntes) ordenMal.push({ i, plaza: k.plaza });
      fase = f;
      if (f === 1) huecoAntes = k.hueco as number;
      if (f === 3) plazaAntes = k.plaza;
    });
    const nCabinas = c.cajas.filter((k) => k.tipo === 'cabina').length;
    const nRefugios = c.cajas.filter((k) => k.tipo === 'refugio').length;
    if (ordenMal.length > 0 || c.cajas.length > 2400 || nCabinas !== 20 || nRefugios !== 10) mal(2, { ordenMal: ordenMal.slice(0, 3), cajas: c.cajas.length });

    /* Los edificios. */
    for (const h of c.huecos) {
      const esperados = h.uso === 'plaza' ? 0 : h.uso === 'callejon' ? 2 : 1;
      if (h.edificios.length !== esperados) mal(3, { hueco: h.indice, uso: h.uso, edificios: h.edificios.length });
    }
    for (const e of c.edificios) {
      const k = c.cajas[e.caja];
      const hu = e.huella;
      const esperada = { x0: hu.x0 + (e.soportales.includes('oeste') ? 3 : 0), z0: hu.z0 + (e.soportales.includes('norte') ? 3 : 0), x1: hu.x1 - (e.soportales.includes('este') ? 3 : 0), z1: hu.z1 - (e.soportales.includes('sur') ? 3 : 0) };
      const pilaresBien = e.pilares.every((q) => {
        const p = c.cajas[q];
        return p !== undefined && p.tipo === 'pilar-de-soportal' && p.edificio === e.indice && p.x0 >= hu.x0 && p.x1 <= hu.x1 && p.z0 >= hu.z0 && p.z1 <= hu.z1;
      });
      let pilaresEsperados = 0;
      for (const cara of e.soportales) pilaresEsperados += Math.floor((cara === 'norte' || cara === 'sur' ? hu.x1 - hu.x0 : hu.z1 - hu.z0) / 6);
      if (k === undefined || k.tipo !== 'edificio' || k.edificio !== e.indice || k.x0 !== esperada.x0 || k.z0 !== esperada.z0 || k.x1 !== esperada.x1 || k.z1 !== esperada.z1 || !pilaresBien || e.pilares.length !== pilaresEsperados || k.alto <= 0) {
        mal(3, { e: e.indice, soportales: e.soportales, pilares: e.pilares.length, pilaresEsperados });
      }
    }

    /* El grafo base. */
    const g = c.grafo;
    const cruzados = g.nudos.slice(0, 144).every((q, k) => q.x === EJES_C[k % 12] && q.z === EJES_C[Math.floor(k / 12)]);
    const vistas = new Set<string>();
    let aristasBien = true;
    for (const a of g.aristas) {
      const p = g.nudos[a.a];
      const q = g.nudos[a.b];
      const llave = a.a < a.b ? `${String(a.a)}-${String(a.b)}` : `${String(a.b)}-${String(a.a)}`;
      if (p === undefined || q === undefined || a.a === a.b || vistas.has(llave) || !(p.x === q.x || p.z === q.z) || a.largo !== Math.abs(p.x - q.x) + Math.abs(p.z - q.z) || a.largo <= 0) aristasBien = false;
      vistas.add(llave);
    }
    maxNudos = Math.max(maxNudos, g.nudos.length);
    maxAristas = Math.max(maxAristas, g.aristas.length);
    if (!cruzados || !aristasBien || g.nudos.length > 4500 || g.aristas.length > 6500 || !conexo(g)) mal(4, { cruzados, aristasBien, nudos: g.nudos.length, aristas: g.aristas.length });

    /* Las distancias entre plazas, con el grafo. */
    const campos = c.plazas.map((p) => C.campoHasta(g, p.nudo));
    const tabla = campos.map((campo) => c.plazas.map((q) => campo.metros[q.nudo] as number));
    const dibujada = TRAZAS_DE_LA_CIUDAD[dibujo]?.distancias ?? [];
    if (JSON.stringify(tabla) !== JSON.stringify(c.distancias) || JSON.stringify(tabla) !== JSON.stringify(dibujada)) mal(5, { tabla, declarada: c.distancias });
    /* Y los campos enteros, contra el Dijkstra del comprobador: desde las plazas, el primer cruce y el último nudo. */
    for (const meta of [...c.plazas.map((p) => p.nudo), 0, g.nudos.length - 1]) {
      camposMirados++;
      const distinto = campoDistinto(g, meta);
      if (distinto !== null) mal(20, { base: true, ...distinto });
    }

    /* Las plazas. */
    for (const p of c.plazas) {
      const nd = g.nudos[p.nudo];
      const dentro = (x: number, z: number): boolean => Math.abs(x - p.centro.x) < 18 && Math.abs(z - p.centro.z) < 18;
      if (
        p.limite.x1 - p.limite.x0 !== 60 ||
        p.limite.z1 - p.limite.z0 !== 60 ||
        (p.limite.x0 + p.limite.x1) / 2 !== p.centro.x ||
        (p.limite.z0 + p.limite.z1) / 2 !== p.centro.z ||
        nd === undefined ||
        !dentro(nd.x, nd.z) ||
        !dentro(p.objeto.x, p.objeto.z) ||
        p.nace.length !== 6 ||
        !p.nace.every((s) => dentro(s.x, s.z)) ||
        c.huecos[p.hueco]?.plaza !== p.numero ||
        p.distrito !== c.huecos[p.hueco]?.distrito
      ) {
        mal(6, { plaza: p.numero });
      }
    }
    /* Cabinas y refugios. */
    for (const k of c.cabinas) {
      const poste = c.cajas[k.caja];
      const z = c.zonas[k.zona - 1];
      const esquinas = z === undefined ? [] : [[z.caja.x0, z.caja.z0], [z.caja.x1, z.caja.z0], [z.caja.x0, z.caja.z1], [z.caja.x1, z.caja.z1]];
      const lejos = esquinas.some(([x, zz]) => ((x as number) - k.poste.x) ** 2 + ((zz as number) - k.poste.z) ** 2 > 1.5 * 1.5);
      if (poste === undefined || poste.tipo !== 'cabina' || !(k.poste.x > poste.x0 && k.poste.x < poste.x1 && k.poste.z > poste.z0 && k.poste.z < poste.z1) || z === undefined || z.clase !== C.CLASE_DE_ZONA_DE_CABINA || lejos || k.zona !== C.idDeZonaDeCabina(k.indice)) mal(7, { cabina: k.indice });
    }
    for (const r of c.refugios) {
      const poste = c.cajas[r.caja];
      const z = c.zonas[r.zona - 1];
      if (poste === undefined || poste.tipo !== 'refugio' || z === undefined || z.clase !== C.CLASE_DE_ZONA_DE_REFUGIO || r.sitios.length !== 3 || !r.sitios.every((s) => s.x >= z.caja.x0 && s.x <= z.caja.x1 && s.z >= z.caja.z0 && s.z <= z.caja.z1)) mal(7, { refugio: r.indice });
    }
    /* Las celdas. */
    const enCelda = new Array<number>(c.cajas.length).fill(0);
    for (const celda of c.celdas) {
      const r = C.rectanguloDeLaCelda(celda.i, celda.j);
      for (const k of celda.cajas) {
        const q = c.cajas[k] as CajaDeLaCiudad;
        const cx = (q.x0 + q.x1) / 2;
        const cz = (q.z0 + q.z1) / 2;
        enCelda[k] = (enCelda[k] as number) + 1;
        if (!(cx >= r.x0 && cx < r.x1 && cz >= r.z0 && cz < r.z1)) mal(8, { celda: celda.indice, k });
      }
      const tocan = c.edificios.filter((e) => solapan(e.huella, r)).map((e) => e.indice);
      if (JSON.stringify(tocan) !== JSON.stringify(celda.edificios)) mal(8, { celda: celda.indice, edificios: celda.edificios.length, tocan: tocan.length });
    }
    if (enCelda.some((v) => v !== 1)) mal(8, { sinCelda: enCelda.filter((v) => v !== 1).length });

    /* Las diez noches. */
    let lasPlazasDeLaPrimera: readonly string[] = [];
    for (let n = 1; n <= NOCHES; n++) {
      const f = fallosDeLaPrueba(c, n);
      const noche = C.ciudadDeLaNoche(c, codigo, n, f);
      const nid = `${id}·${String(n)}`;
      const malN = (regla: number, detalle: unknown): void => apuntar(REGLAS[regla] as string, { nid, detalle });
      const cajas = noche.cajas;
      /*
       * Lo que toca el límite de cada plaza, con el radio de una persona: lo mismo en las diez noches. La sala
       * deja donde está a quien ya queda dentro del límite de la Bajada nueva; si algo de dentro cambiara de
       * sitio, amanecería dentro de una caja (la revisión de la sala, con el quiosco de la Glorieta).
       */
      const lasPlazas = c.plazas.map((p) => {
        const r = ensanchado(p.limite, RADIO);
        const dentro = cajas.filter((k) => solapan(r, k));
        deLaNocheEnLasPlazas += cajas.slice(noche.cajasDeLaMesa).filter((k) => solapan(r, k)).length;
        return JSON.stringify(dentro.map((k) => [k.x0, k.z0, k.x1, k.z1, k.tipo, k.mira, k.despejable, k.plaza]));
      });
      if (n === 1) lasPlazasDeLaPrimera = lasPlazas;
      else lasPlazas.forEach((h, k) => {
        if (h !== lasPlazasDeLaPrimera[k]) malN(21, { plaza: k + 1, noche: n });
      });
      cajasPorNoche += cajas.length;
      maxCajas = Math.max(maxCajas, cajas.length);
      for (const k of cajas) tipos.add(k.tipo);
      let faseN = 0;
      let ordenN = true;
      for (let i = noche.cajasDeLaMesa; i < cajas.length; i++) {
        const k = cajas[i] as CajaDeLaCiudad;
        const fn = k.tipo === 'corte' ? 2 : k.plaza > 0 ? 1 : k.tipo === 'coche' || k.tipo === 'quiosco-de-prensa' ? 0 : 9;
        if (fn < faseN || fn === 9) ordenN = false;
        faseN = fn;
      }
      const mesaIgual = noche.cajasDeLaMesa === c.cajas.length && c.cajas.every((k, i) => cajas[i] === k);
      const fuera = cajas.filter((k) => !(k.x0 < k.x1 && k.z0 < k.z1) || Math.max(Math.abs(k.x0), Math.abs(k.x1), Math.abs(k.z0), Math.abs(k.z1)) > 272 || [k.x0, k.z0, k.x1, k.z1].some((v) => v * 4 !== Math.round(v * 4)));
      const pis = primerPisoton(cajas);
      if (!mesaIgual || !ordenN || fuera.length > 0 || pis !== null || cajas.length > 2400) malN(9, { mesaIgual, ordenN, fuera: fuera.length, pis: pis === null ? null : [cajas[pis[0]], cajas[pis[1]]] });
      if (noche.cortes.length === 0) nochesSinObras++;
      for (const o of noche.cortes) {
        const tr = c.tramos[o.tramo];
        const k = cajas[o.caja];
        const ancho = tr === undefined || k === undefined ? 0 : tr.eje === 'x' ? k.z1 - k.z0 : k.x1 - k.x0;
        if (tr === undefined || k === undefined || k.tipo !== 'corte' || tr.clase !== 'calle' || tr.daAPlaza || ancho !== tr.ancho) malN(10, { o, clase: tr?.clase, ancho });
      }
      if (noche.cortes.length < 4 || noche.cortes.length > 6) malN(10, { cortes: noche.cortes.length });
      const arena: Arena = arenaDe(C.mundoDeLaLizaDeLaCiudad(noche, false).suelo);
      for (const z of c.zonas) {
        const r = ensanchado(z.caja, RADIO);
        if (cajas.some((k) => solapan(r, k))) malN(11, { zona: z.id });
      }
      const gn = noche.grafo;
      const enLaNoche = new Set(gn.aristas);
      const quitadas = g.aristas.filter((a) => !enLaNoche.has(a));
      const debenQuitarse = g.aristas.filter((a) => {
        const p = g.nudos[a.a] as { x: number; z: number };
        const q = g.nudos[a.b] as { x: number; z: number };
        const x0 = Math.min(p.x, q.x);
        const x1 = Math.max(p.x, q.x);
        const z0 = Math.min(p.z, q.z);
        const z1 = Math.max(p.z, q.z);
        return noche.cortes.some((o) => {
          const e = ensanchado(cajas[o.caja] as Rectangulo, RADIO);
          return x0 === x1 ? e.x0 < x0 && x0 < e.x1 && e.z0 < z1 && z0 < e.z1 : e.z0 < z0 && z0 < e.z1 && e.x0 < x1 && x0 < e.x1;
        });
      });
      const base = new Set(g.aristas);
      const aristasDeLaNocheBien = gn.nudos === g.nudos && gn.aristas.every((a) => base.has(a)) && quitadas.length === debenQuitarse.length && debenQuitarse.every((a) => !enLaNoche.has(a));
      let andables = true;
      let primeraMala: unknown = null;
      for (const a of gn.aristas) {
        aristasAndadas++;
        const p = gn.nudos[a.a] as { x: number; z: number };
        const q = gn.nudos[a.b] as { x: number; z: number };
        if (!seAndaEnRecta(arena, { x: p.x * UNO, z: p.z * UNO }, { x: q.x * UNO, z: q.z * UNO }, RADIO_EN_FIJO) || !sePuedeEstar(arena, p.x * UNO, p.z * UNO, RADIO_EN_FIJO)) {
          andables = false;
          primeraMala ??= { de: p, a: q };
        }
      }
      if (!aristasDeLaNocheBien || !andables || !conexo(gn)) malN(12, { aristasDeLaNocheBien, andables, primeraMala });
      const libre = rejillaLibre(cajas);
      if (!comprobadaLaRejilla) {
        let distintos = 0;
        for (let z = -270; z <= 270; z++) for (let x = -270; x <= 270; x++) if ((libre[(z + 270) * LADO_DE_LA_REJILLA + (x + 270)] === 1) !== sePuedeEstar(arena, x * UNO, z * UNO, RADIO_EN_FIJO)) distintos++;
        comprobar('SUELO: la rejilla de metro en metro dice lo mismo que sePuedeEstar en sus 292.681 puntos', distintos === 0, { distintos });
        comprobadaLaRejilla = true;
      }
      const bfs = sinAlcanzar(libre, 0, -4);
      libresMirados += bfs.libres;
      if (bfs.sueltos > 0 || bfs.libres < 120000) malN(13, bfs);
      for (let bajada = 1; bajada <= 6; bajada++) {
        for (const [f2, f3] of C.triosDeFallos(c, bajada)) {
          for (const [u, v] of [[bajada, f2], [bajada, f3], [f2, f3]] as const) {
            const campo = C.campoHasta(gn, (c.plazas[u - 1] as { nudo: number }).nudo);
            const m = campo.metros[(c.plazas[v - 1] as { nudo: number }).nudo] as number;
            if (m < 0 || m > TRIO_CON_OBRAS_COMO_MUCHO) malN(14, { u, v, m });
          }
        }
      }
      const deCabina = c.cabinas.map((k) => {
        const nudo = C.nudoMasCercano(gn, k.sitio.x, k.sitio.z);
        const q = gn.nudos[nudo] as { x: number; z: number };
        return { campo: C.campoHasta(gn, nudo), extra: Math.abs(q.x - k.sitio.x) + Math.abs(q.z - k.sitio.z) };
      });
      /* Los campos de la noche (sin las aristas de las obras), contra el Dijkstra del comprobador: la Bajada y dos cabinas que van rotando. */
      for (const meta of [(c.plazas[(f[0] ?? 1) - 1] as { nudo: number }).nudo, (deCabina[n % 20] as { campo: { meta: number } }).campo.meta, (deCabina[(3 * n + 7) % 20] as { campo: { meta: number } }).campo.meta]) {
        camposMirados++;
        const distinto = campoDistinto(gn, meta);
        if (distinto !== null) malN(20, { noche: true, ...distinto });
      }
      let sinC = 0;
      let sinL = 0;
      let sinAnchas = 0;
      const deLasPlazas = new Set(c.plazas.map((p) => p.nudo));
      const plazasSin: number[] = [];
      for (let k = 0; k < gn.nudos.length; k++) {
        let a = false;
        let b = false;
        let aa = false;
        let bb = false;
        for (const dc of deCabina) {
          const m = dc.campo.metros[k] as number;
          if (m < 0) continue;
          const d = m + dc.extra;
          if (d >= 100 && d <= 160) a = true;
          if (d >= 180 && d <= 260) b = true;
          if (d >= 80 && d <= 180) aa = true;
          if (d >= 160 && d <= 280) bb = true;
        }
        if (!a) sinC++;
        if (!b) sinL++;
        if (!aa || !bb) sinAnchas++;
        if ((!a || !b) && deLasPlazas.has(k)) plazasSin.push(k);
      }
      sinCercana = Math.max(sinCercana, sinC);
      sinLejana = Math.max(sinLejana, sinL);
      if (plazasSin.length > 0 || sinC + sinL > 0.05 * 2 * gn.nudos.length) malN(15, { plazasSin, sinC, sinL });
      if (n === 1) {
        /* Con el grafo base (sin obras), una vez por traza: lo que la traza dibujada promete. */
        const deCabinaBase = c.cabinas.map((k) => {
          const nudo = C.nudoMasCercano(g, k.sitio.x, k.sitio.z);
          const q = g.nudos[nudo] as { x: number; z: number };
          return { campo: C.campoHasta(g, nudo), extra: Math.abs(q.x - k.sitio.x) + Math.abs(q.z - k.sitio.z) };
        });
        let sinExactas = 0;
        let sinAnchasBase = 0;
        for (let k = 0; k < g.nudos.length; k++) {
          let a = false;
          let b = false;
          let aa = false;
          let bb = false;
          for (const dc of deCabinaBase) {
            const d = (dc.campo.metros[k] as number) + dc.extra;
            if (d >= 100 && d <= 160) a = true;
            if (d >= 180 && d <= 260) b = true;
            if (d >= 80 && d <= 180) aa = true;
            if (d >= 160 && d <= 280) bb = true;
          }
          if (!a) sinExactas++;
          if (!b) sinExactas++;
          if (!aa || !bb) sinAnchasBase++;
        }
        if (sinAnchasBase > 0 || sinExactas > 0.03 * 2 * g.nudos.length) mal(15, { base: true, sinAnchasBase, sinExactas });
      }
      for (const despejadas of [false, true]) {
        const m = C.mundoDeLaLizaDeLaCiudad(noche, despejadas);
        const nd = despejadas ? C.despejarLasPlazas(noche) : noche;
        const problemas = problemasDelMundo(m);
        const exacto = (qv: number, mv: number): boolean => Number.isInteger(qv) && qv === mv * UNO;
        const bien =
          problemas.length === 0 &&
          m.metrosPorUnidad === UNO &&
          m.suelo.lado === 8 &&
          m.suelo.pisables.length === 4761 &&
          m.suelo.nace.length === 0 &&
          m.suelo.cuerpos.length === nd.cajas.length &&
          m.suelo.cuerpos.every((q, i) => {
            const k = nd.cajas[i] as CajaDeLaCiudad;
            return q.x0 === k.x0 && q.z0 === k.z0 && q.x1 === k.x1 && q.z1 === k.z1 && Object.keys(q).length === 4;
          }) &&
          m.clasesDeCaja.length === nd.cajas.length &&
          m.clasesDeCaja.every((k) => k === CLASE_DE_CAJA.alta) &&
          m.zonas.length === c.zonas.length &&
          m.zonas.every((z, i) => {
            const o = c.zonas[i];
            return o !== undefined && z.id === o.id && z.clase === o.clase && exacto(z.caja.x0, o.caja.x0) && exacto(z.caja.z0, o.caja.z0) && exacto(z.caja.x1, o.caja.x1) && exacto(z.caja.z1, o.caja.z1);
          }) &&
          m.limites.length === 7 &&
          m.limites.every((l, i) => l.id === i + 1) &&
          m.grafo.nudos.length === gn.nudos.length &&
          m.grafo.nudos.every((q, i) => exacto(q.x, (gn.nudos[i] as { x: number }).x) && exacto(q.z, (gn.nudos[i] as { z: number }).z)) &&
          m.grafo.aristas.length === nd.grafo.aristas.length &&
          m.grafo.aristas.every(([u, v], i) => u === nd.grafo.aristas[i]?.a && v === nd.grafo.aristas[i]?.b) &&
          porQueNoEsCanonico(m) === null;
        if (!bien) malN(16, { despejadas, problemas: problemas.slice(0, 3) });
        const bajada = f[0] ?? 1;
        const asientos = m.nace.filter((s) => s.papel === 'asiento');
        const reapariciones = m.nace.filter((s) => s.papel === 'reaparicion');
        const deLaBajada = (c.plazas[bajada - 1] as { nace: readonly { x: number; z: number; rumbo: number }[] }).nace;
        const primeros = deLaBajada.every((s, i) => {
          const q = m.nace[i];
          return q !== undefined && q.papel === 'asiento' && exacto(q.x, s.x) && exacto(q.z, s.z) && q.rumbo === s.rumbo;
        });
        const campoB = C.campoHasta(g, (c.plazas[bajada - 1] as { nudo: number }).nudo);
        const metros = c.refugios.map((r) => C.distanciaPorCalles(g, campoB, (r.sitios[1] as { x: number }).x, (r.sitios[1] as { z: number }).z));
        const orden = c.refugios.map((r) => r.indice).sort((a, b) => (metros[a] as number) - (metros[b] as number) || a - b);
        const reapBien = orden.every((k, o) =>
          (c.refugios[k] as { sitios: readonly { x: number; z: number }[] }).sitios.every((s, q) => {
            const r = reapariciones[o * 3 + q];
            return r !== undefined && exacto(r.x, s.x) && exacto(r.z, s.z);
          }),
        );
        const arenaM = arenaDe(m.suelo);
        const caben = m.nace.every((s) => sePuedeEstar(arenaM, s.x, s.z, RADIO_EN_FIJO));
        if (asientos.length !== 36 || reapariciones.length !== 30 || !primeros || !reapBien || !caben) malN(17, { despejadas, asientos: asientos.length, reapariciones: reapariciones.length, primeros, reapBien, caben });
      }
      const d = C.despejarLasPlazas(noche);
      const quedan = cajas.filter((k) => !(k.despejable && noche.fallos.includes(k.plaza)));
      const despejables = cajas.filter((k) => k.despejable);
      const cortesBien = d.cortes.every((o, i) => d.cajas[o.caja] === cajas[(noche.cortes[i] as { caja: number }).caja]);
      if (!d.plazasDespejadas || noche.plazasDespejadas || d.cajas.length !== quedan.length || !d.cajas.every((k, i) => k === quedan[i]) || !cortesBien || C.despejarLasPlazas(d) !== d || C.despejarLasPlazas(noche) !== d || despejables.some((k) => k.plaza === 0) || (f.length > 1 && d.cajas.length === cajas.length)) {
        malN(18, { quedan: quedan.length, d: d.cajas.length, cortesBien });
      }
      let pasa = 0;
      const elevado = c.avenidas.find((a) => a.id === 'elevado');
      let trenBien = elevado !== undefined && noche.tren.eje === elevado.eje && noche.tren.linea === elevado.linea;
      for (let tic = 0; tic < 1300; tic += 7) {
        const en = C.trenEnLaCiudad(noche, tic);
        if (en === null) continue;
        pasa++;
        if (en.cabeza < noche.tren.desde || en.cabeza > noche.tren.hasta || en.cola < noche.tren.desde || en.cola > noche.tren.hasta) trenBien = false;
      }
      if (!trenBien || pasa === 0 || noche.semaforos.length !== 144 || !noche.semaforos.every((s) => Number.isInteger(s) && s >= 0 && s < 1200)) malN(19, { trenBien, pasa });
    }
  }
  for (const regla of REGLAS) comprobar(regla, !fallos.has(regla), fallos.get(regla));
  comprobar(
    `SUELO: los campos contrastados con el Dijkstra del comprobador son los ${String(TRAZAS_C * (6 + 2 + 3 * NOCHES))} de las 32 trazas (8 en el grafo base y 3 por noche)`,
    camposMirados === TRAZAS_C * (6 + 2 + 3 * NOCHES),
    camposMirados,
  );
  comprobar(
    'SUELO: lo que se compara noche a noche en las plazas lleva cajas de la noche (el quiosco, los bancos del borde, las carretillas y los coches de su acera): 20 o más por noche en las seis',
    deLaNocheEnLasPlazas >= TRAZAS_C * NOCHES * 20,
    { deLaNocheEnLasPlazas, porNoche: deLaNocheEnLasPlazas / (TRAZAS_C * NOCHES) },
  );
  nota(
    `32 trazas × ${String(NOCHES)} noches: ${String(maxCajas)} cajas como mucho (media ${(cajasPorNoche / (32 * NOCHES)).toFixed(0)}), ${String(maxNudos)} nudos y ${String(maxAristas)} aristas como mucho, ` +
      `${String(aristasAndadas)} aristas andadas, ${String(libresMirados)} puntos libres alcanzados, ${String(nochesSinObras)} noches sin obras; tipos ${[...tipos].sort((a, b) => (a < b ? -1 : 1)).join('/')}`,
  );
  nota(`sin cabina cercana: ${String(sinCercana)} nudos como mucho en una noche; sin lejana: ${String(sinLejana)}`);
}

// ---------------------------------------------------------------------------
paso('11 · Los durmientes de la ciudad');
// ---------------------------------------------------------------------------

/**
 * ¿Está este punto (en metros) en una calzada? Y si lo está, ¿cruzando por qué paso? Una calzada es la de
 * una calle normal (a menos de 3 m de su eje) o una de las dos de una avenida (de 1 a 8 m de su eje: la
 * mediana no es calzada). Se cruza por un paso de cebra a 5 m del centro del cruce (a 11 en una avenida:
 * la acera mide 4), con el aparte de la fila (±0,375). En las dos calzadas a la vez es estar en medio del
 * cruce, y eso no lo hace nadie.
 */
function enLaCalzada(c: CiudadDeLaMesa, x: number, z: number): { cruzaPor: 'x' | 'z'; cruce: number; enElPaso: boolean } | 'acera' | 'en-medio' {
  const avenidaEn = (eje: 'x' | 'z', linea: number, a: number): boolean => c.avenidas.some((av) => av.eje === eje && av.linea === linea && a > av.desde && a < av.hasta);
  const calzada = (eje: 'x' | 'z', v: number, a: number): number => {
    for (let k = 0; k < 12; k++) {
      const e = EJES_C[k] as number;
      const d = Math.abs(v - e);
      if (avenidaEn(eje, e, a) ? d > 1 && d < 8 : d < 3) return k;
    }
    return -1;
  };
  const cz = calzada('z', x, z);
  const cx = calzada('x', z, x);
  if (cz < 0 && cx < 0) return 'acera';
  if (cz >= 0 && cx >= 0) return 'en-medio';
  const cruzaPor: 'x' | 'z' = cz >= 0 ? 'x' : 'z';
  const k = cz >= 0 ? cz : cx;
  const a = cruzaPor === 'x' ? z : x;
  let fila = 0;
  for (let f = 1; f < 12; f++) if (Math.abs(a - (EJES_C[f] as number)) < Math.abs(a - (EJES_C[fila] as number))) fila = f;
  const e = EJES_C[fila] as number;
  const aparte = avenidaEn(cruzaPor === 'x' ? 'x' : 'z', e, cruzaPor === 'x' ? x : z) ? 11 : 5;
  const desvio = Math.abs(Math.abs(a - e) - aparte);
  return { cruzaPor, cruce: cruzaPor === 'x' ? fila * 12 + k : k * 12 + fila, enElPaso: desvio <= 0.375 };
}

{
  const fallos = new Map<string, unknown[]>();
  const apuntar = (regla: string, detalle: unknown): void => {
    const l = fallos.get(regla) ?? [];
    if (l.length < 3) l.push(detalle);
    fallos.set(regla, l);
  };
  const REGLAS = [
    'el reparto: 7, 6, 6, 2 y 4 por manzana según su distrito y 10 por plaza, en cuadrillas de 1 a 3 que dan la vuelta a su manzana o a dos por la cebra de una calle (no de una avenida), y el mismo todas las noches',
    'cada vuelta va por la red de aceras, dura minutos exactos y se lee seguida',
    'una cuadrilla no sale sólo si su vuelta pasa por la acera de una obra',
    'la vuelta de cada cuadrilla que sale se anda entera con los suyos (cada uno con su aparte) sin tocar ninguna caja de la noche',
    'se echan a cruzar sólo con su semáforo en verde y 10 s por delante (por una avenida no cruza nadie: lo dice el reparto)',
  ];
  const DENSIDAD: Readonly<Record<IdDeDistrito, number>> = { casco: 7, ensanche: 6, lonja: 6, naves: 2, torres: 4 };
  let cuadrillasMiradas = 0;
  let cruces = 0;
  let noSalen = 0;
  let total = 0;
  for (let t = 0; t < TRAZAS_C; t++) {
    const codigo = CODIGOS[t] as string;
    const c = C.ciudadDeLaMesa(t, codigo);
    const reparto = D.repartoDeLosDurmientes(c);
    total = D.durmientesDeLaCiudad(c);
    const id = `${String(t)}#${codigo}`;
    let esperados = 0;
    for (const h of c.huecos) esperados += h.uso === 'plaza' ? 10 : DENSIDAD[h.distrito];
    const porHueco = new Map<number, number>();
    let bien = reparto.durmientes.length === esperados && total === esperados;
    const pasos = new Map<string, { tipo: string; largo: number }>();
    for (const tr of c.aceras.tramos) {
      pasos.set(`${String(tr.a)}-${String(tr.b)}`, tr);
      pasos.set(`${String(tr.b)}-${String(tr.a)}`, tr);
    }
    reparto.cuadrillas.forEach((q, k) => {
      porHueco.set(q.huecos[0] as number, (porHueco.get(q.huecos[0] as number) ?? 0) + q.miembros);
      const vuelta = q.vuelta;
      const porLaRed = vuelta.every((u, s) => {
        const tr = pasos.get(`${String(u)}-${String(vuelta[(s + 1) % vuelta.length] as number)}`);
        return tr !== undefined && (tr.tipo === 'acera' || tr.largo <= 12);
      });
      const dentro = vuelta.every((u) => {
        const p = c.aceras.nudos[u] as { x: number; z: number };
        return p.x >= q.caja.x0 && p.x <= q.caja.x1 && p.z >= q.caja.z0 && p.z <= q.caja.z1;
      });
      const deUnaPlaza = c.huecos[q.huecos[0] as number]?.uso === 'plaza';
      if (q.miembros < 1 || q.miembros > 3 || (vuelta.length !== 4 && vuelta.length !== 8) || !porLaRed || !dentro || (deUnaPlaza && q.huecos.length !== 1) || q.huecos.some((h) => h !== q.huecos[0] && c.huecos[h]?.uso === 'plaza')) {
        bien = false;
        apuntar(REGLAS[0] as string, { id, cuadrilla: k, vuelta: vuelta.length, porLaRed, dentro });
      }
      for (let p = 0; p < q.miembros; p++) if (reparto.durmientes[q.primero + p]?.cuadrilla !== k || reparto.durmientes[q.primero + p]?.puesto !== p) bien = false;
    });
    for (const h of c.huecos) if ((porHueco.get(h.indice) ?? 0) !== (h.uso === 'plaza' ? 10 : DENSIDAD[h.distrito])) bien = false;
    const otra = C.ciudadDeLaMesa(t, codigo.toLowerCase());
    if (!bien || D.repartoDeLosDurmientes(otra) !== reparto) apuntar(REGLAS[0] as string, { id, esperados, total });

    for (const n of [1, 6]) {
      const noche = C.ciudadDeLaNoche(c, codigo, n, fallosDeLaPrueba(c, n));
      const arena = arenaDe(C.mundoDeLaLizaDeLaCiudad(noche, false).suelo);
      const cortadas = new Set(noche.cortes.map((o) => o.tramo));
      reparto.cuadrillas.forEach((q, k) => {
        cuadrillasMiradas++;
        const g = D.guionDeLaCuadrillaEnLaCiudad(noche, k);
        const debe = !q.tramos.some((tr) => cortadas.has(tr));
        if ((g !== null) !== debe) apuntar(REGLAS[2] as string, { id, n, k, sale: g !== null, debe });
        if (g === null) {
          noSalen++;
          return;
        }
        const cu = g.cuadrilla;
        const tz = cu.trozos;
        let arco = 0;
        const seguidos = tz.every((x, i) => (i === 0 ? x.desde === 0 : x.desde === (tz[i - 1] as { hasta: number }).hasta) && x.hasta > x.desde);
        const andados = cu.andados.every((s) => {
          const x = tz[s];
          if (x === undefined || x.hace !== D.ANDA || x.arco !== arco || x.hasta - x.desde !== Math.ceil(x.largo / cu.paso)) return false;
          arco += x.largo;
          return true;
        });
        if (!(D.PASOS_POR_TIC.includes(cu.paso) && cu.periodo % 1200 === 0 && cu.desfase >= 0 && cu.desfase < cu.periodo && seguidos && (tz[tz.length - 1] as { hasta: number }).hasta === cu.periodo && andados && arco === cu.perimetro && cu.miembros === q.miembros)) {
          apuntar(REGLAS[1] as string, { id, n, k });
        }
        /* La vuelta entera, desplazada lo que se aparta cada puesto (en los dos ejes), en recta tramo a tramo. */
        for (const a of q.miembros === 1 ? [0] : q.miembros === 2 ? [0, 0.375] : [0, 0.375, -0.375]) {
          for (let s = 0; s < q.vuelta.length; s++) {
            const p = c.aceras.nudos[q.vuelta[s] as number] as { x: number; z: number };
            const r = c.aceras.nudos[q.vuelta[(s + 1) % q.vuelta.length] as number] as { x: number; z: number };
            if (!seAndaEnRecta(arena, { x: (p.x + a) * UNO, z: (p.z + a) * UNO }, { x: (r.x + a) * UNO, z: (r.z + a) * UNO }, RADIO_EN_FIJO) || !sePuedeEstar(arena, (p.x + a) * UNO, (p.z + a) * UNO, RADIO_EN_FIJO)) {
              apuntar(REGLAS[3] as string, { id, n, k, de: p, a: r, aparte: a });
            }
          }
        }
        /* Al empezar cada cruce, verde y margen: en 20.000 tics. */
        for (const x of tz) {
          if (x.hace !== D.ANDA || x.cruce === null) continue;
          const eje = x.dx !== 0 ? 'x' : 'z';
          const margen = 200;
          for (let tic = x.desde - cu.desfase; tic < 20000; tic += cu.periodo) {
            cruces++;
            const fase = C.faseDelSemaforoEnLaCiudad(noche, x.cruce, tic);
            const queda = eje === 'x' ? 600 - fase : 1200 - fase;
            if (!C.pasoAbiertoEnLaCiudad(noche, x.cruce, eje, tic) || queda < margen) apuntar(REGLAS[4] as string, { id, n, k, tic, cruce: x.cruce, eje, fase, margen });
          }
        }
      });
    }
  }
  for (const regla of REGLAS) comprobar(regla, !fallos.has(regla), fallos.get(regla));
  nota(`${String(total)} durmientes en la última ciudad; ${String(cuadrillasMiradas)} vueltas miradas (${String(noSalen)} no salen por una obra); ${String(cruces)} cruces vistos`);
  comprobar('SUELO: salen de verdad y cruzan de verdad (más de 15.000 vueltas y 20.000 cruces), y alguna no sale por una obra', cuadrillasMiradas > 15000 && cruces > 20000 && noSalen > 0, { cuadrillasMiradas, cruces, noSalen });
}

{
  /*
   * TIC A TIC, en dos ciudades 20.000 tics y en ocho más 2.000: cada durmiente que sale, siempre sobre suelo
   * y fuera de toda caja, dentro de la ciudad, mirando a un eje, sin saltos de más de su paso, y en la calzada
   * SÓLO en un paso de cebra con su semáforo en verde.
   */
  const malos: unknown[] = [];
  const saltos: unknown[] = [];
  const enRojo: unknown[] = [];
  let mirados = 0;
  let enLaCalzadaVistos = 0;
  let andando = 0;
  const RUMBOS = new Set([0, 64, 128, 192]);
  const tandas: { t: number; n: number; tics: number }[] = [{ t: 0, n: 1, tics: 20000 }, { t: 21, n: 3, tics: 20000 }];
  for (let k = 0; k < 8; k++) tandas.push({ t: 3 + 4 * k, n: 2 + (k % 8), tics: 2000 });
  for (const { t, n, tics } of tandas) {
    const codigo = CODIGOS[t] as string;
    const c = C.ciudadDeLaMesa(t, codigo);
    const noche = C.ciudadDeLaNoche(c, codigo, n, fallosDeLaPrueba(c, n));
    const arena = arenaDe(C.mundoDeLaLizaDeLaCiudad(noche, false).suelo);
    const total = D.durmientesDeLaCiudad(c);
    const indices = Array.from({ length: total }, (_, i) => i);
    const plano = new Int32Array(total * 4);
    const antes = new Int32Array(total * 4);
    const reparto = D.repartoDeLosDurmientes(c);
    const pasoDe = reparto.durmientes.map((d) => D.guionDeLaCuadrillaEnLaCiudad(noche, d.cuadrilla)?.cuadrilla.paso ?? 0);
    for (let tic = 0; tic <= tics; tic++) {
      D.escribirLosDurmientesDeLaCiudad(noche, tic, indices, plano);
      for (let i = 0; i < total; i++) {
        if (plano[i * 4 + 3] === -1) continue;
        mirados++;
        const x = plano[i * 4] as number;
        const z = plano[i * 4 + 1] as number;
        if (plano[i * 4 + 3] === 1) andando++;
        if (!sePuedeEstar(arena, x, z, RADIO_EN_FIJO) || Math.abs(x) > 270 * UNO || Math.abs(z) > 270 * UNO || !RUMBOS.has(plano[i * 4 + 2] as number)) {
          if (malos.length < 5) malos.push({ t, n, tic, i, x: x / UNO, z: z / UNO });
          else malos.push(null);
        }
        const donde = enLaCalzada(c, x / UNO, z / UNO);
        if (donde !== 'acera') {
          enLaCalzadaVistos++;
          if (donde === 'en-medio' || !donde.enElPaso || !C.pasoAbiertoEnLaCiudad(noche, donde.cruce, donde.cruzaPor, tic)) {
            if (enRojo.length < 5) enRojo.push({ t, n, tic, i, x: x / UNO, z: z / UNO, donde });
            else enRojo.push(null);
          }
        }
        if (tic > 0 && antes[i * 4 + 3] !== -1) {
          const d = Math.abs(x - (antes[i * 4] as number)) + Math.abs(z - (antes[i * 4 + 1] as number));
          if (d > (pasoDe[i] as number)) saltos.push({ t, tic, i, d: d / UNO });
        }
      }
      antes.set(plano);
    }
  }
  nota(`${String(mirados)} sitios mirados, ${((100 * andando) / mirados).toFixed(1)} % andando, ${String(enLaCalzadaVistos)} en una calzada`);
  comprobar('los durmientes pisan siempre suelo, fuera de toda caja y dentro de la ciudad, mirando a un eje', malos.length === 0, malos.slice(0, 5));
  comprobar('y no dan saltos: ninguno se mueve en un tic más que su paso', saltos.length === 0, saltos.slice(0, 5));
  comprobar(`en la calzada sólo se está cruzando por un paso con el semáforo en verde, tic a tic (${String(enLaCalzadaVistos)} sitios en la calzada)`, enRojo.length === 0 && enLaCalzadaVistos > 100000, { vistos: enRojo.length, primeros: enRojo.slice(0, 5) });
  comprobar('SUELO: andan de verdad (más del 40 % del tiempo)', andando > mirados * 0.4, { andando, mirados });
}

{
  const c = C.ciudadDeLaMesa(13, CODIGOS[13] as string);
  const noche = C.ciudadDeLaNoche(c, CODIGOS[13] as string, 4, fallosDeLaPrueba(c, 4));
  const total = D.durmientesDeLaCiudad(c);
  /* El orden no importa: una copia de la noche (otra memoria de guiones), pidiéndolos al revés y salteados. */
  const copia: NocheDeLaCiudad = { ...noche, semaforos: noche.semaforos.slice() };
  const orden = Array.from({ length: total }, (_, i) => i);
  let h = 99;
  for (let i = orden.length - 1; i > 0; i--) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    const j = h % (i + 1);
    [orden[i], orden[j]] = [orden[j] as number, orden[i] as number];
  }
  const alReves: Record<number, string> = {};
  for (const i of orden) alReves[i] = huella(D.sitioDelDurmienteEnLaCiudad(copia, i, 7777));
  let igual = true;
  for (let i = 0; i < total; i++) if (huella(D.sitioDelDurmienteEnLaCiudad(noche, i, 7777)) !== alReves[i]) igual = false;
  comprobar('el guion no depende del orden en que se piden los durmientes: al revés y salteados, en otra memoria, dan lo mismo', igual && D.guionDeLaCuadrillaEnLaCiudad(copia, 0) !== D.guionDeLaCuadrillaEnLaCiudad(noche, 0));

  /* El más cercano y los de cerca, contra la fuerza bruta. */
  const todos = (tic: number): ({ x: number; z: number } | null)[] => Array.from({ length: total }, (_, i) => D.sitioDelDurmienteEnLaCiudad(noche, i, tic));
  let cercanoBien = true;
  let cercaBien = true;
  let conAlguien = 0;
  h = 7;
  for (let k = 0; k < 300; k++) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    const tic = h % 30000;
    const x = (((h >>> 3) % 520) - 260) * UNO;
    const z = (((h >>> 12) % 520) - 260) * UNO;
    const radio = [60, 40, 90, 15][k % 4] as number;
    const sitios = todos(tic);
    const dentro: { i: number; d: number }[] = [];
    sitios.forEach((s, i) => {
      if (s === null) return;
      const d = (s.x - x) ** 2 + (s.z - z) ** 2;
      if (d <= (radio * UNO) ** 2) dentro.push({ i, d });
    });
    dentro.sort((a, b) => a.d - b.d || a.i - b.i);
    /* Uno de cada tres, sin los dos más cercanos de verdad (y tres que casi nunca están): si no, excluir no se prueba. */
    const excluidos = k % 3 === 0 ? [...dentro.slice(0, 2).map((q) => q.i), 0, 5, 17] : [];
    const sinExcluidos = dentro.filter((q) => !excluidos.includes(q.i));
    if (D.durmienteMasCercanoEnLaCiudad(noche, tic, x, z, excluidos, radio) !== (sinExcluidos[0]?.i ?? null)) cercanoBien = false;
    const tope = [64, 5, 1000, 0][k % 4] as number;
    if (JSON.stringify(D.durmientesCercaEnLaCiudad(noche, tic, x, z, radio, tope)) !== JSON.stringify(dentro.slice(0, tope).map((q) => q.i))) cercaBien = false;
    if (sinExcluidos.length > 0) conAlguien++;
  }
  /* El desempate: el punto medio exacto entre dos, con los demás lejos. */
  let empates = 0;
  let desempate = true;
  const en100 = todos(100);
  for (let i = 0; i < total && empates < 60; i++) {
    for (let j = i + 1; j < total && empates < 60; j++) {
      const p = en100[i];
      const q = en100[j];
      if (p === null || q === null || (p.x + q.x) % 2 !== 0 || (p.z + q.z) % 2 !== 0 || (p.x === q.x && p.z === q.z)) continue;
      const dd = (p.x - q.x) ** 2 + (p.z - q.z) ** 2;
      if (dd > (20 * UNO) ** 2) continue;
      empates++;
      const fuera: number[] = [];
      for (let k = 0; k < total; k++) if (k !== i && k !== j) fuera.push(k);
      if (D.durmienteMasCercanoEnLaCiudad(noche, 100, (p.x + q.x) / 2, (p.z + q.z) / 2, fuera, 60) !== i) desempate = false;
    }
  }
  comprobar('el durmiente más cercano es el de la fuerza bruta, sin los excluidos (en uno de cada tres puntos, los dos más cercanos) y nunca más lejos que su radio (300 puntos)', cercanoBien && conAlguien > 100, { conAlguien });
  comprobar('los de cerca, en orden de distancia y de índice, como mucho los que se piden', cercaBien);
  comprobar('a igual distancia gana el de índice menor (60 empates)', desempate && empates === 60, { empates });
  const plano = new Int32Array(40);
  let escritoBien = true;
  const pedidos = [0, 3, 99, 400, total - 1, 1, 2, 5, 8, 9];
  D.escribirLosDurmientesDeLaCiudad(noche, 555, pedidos, plano);
  pedidos.forEach((i, k) => {
    const s = D.sitioDelDurmienteEnLaCiudad(noche, i, 555);
    if (s === null ? plano[4 * k + 3] !== -1 : plano[4 * k] !== s.x || plano[4 * k + 1] !== s.z || plano[4 * k + 2] !== s.rumbo || plano[4 * k + 3] !== (s.anda ? 1 : 0)) escritoBien = false;
  });
  comprobar('escribirLosDurmientesDeLaCiudad dice lo mismo que sitioDelDurmienteEnLaCiudad', escritoBien);
  comprobar(
    'lanzan: un tic que no es un número, un punto en metros o fuera de ±512 m, un durmiente que no existe y un radio que no es un número',
    [Number.NaN, Number.POSITIVE_INFINITY].every((t) => lanzaRango(() => D.sitioDelDurmienteEnLaCiudad(noche, 0, t)) && lanzaRango(() => D.durmientesCercaEnLaCiudad(noche, t, 0, 0, 60, 5))) &&
      lanzaRango(() => D.durmienteMasCercanoEnLaCiudad(noche, 0, 12.5, 3, [])) &&
      lanzaRango(() => D.durmienteMasCercanoEnLaCiudad(noche, 0, 600 * UNO, 0, [])) &&
      lanzaRango(() => D.sitioDelDurmienteEnLaCiudad(noche, total, 0)) &&
      lanzaRango(() => D.sitioDelDurmienteEnLaCiudad(noche, -1, 0)) &&
      lanzaRango(() => D.durmientesCercaEnLaCiudad(noche, 0, 0, 0, Number.NaN, 5)) &&
      !lanzaRango(() => D.durmienteMasCercanoEnLaCiudad(noche, 12.5, 12 * UNO, -3 * UNO, [])),
  );

  /* Gente cerca de cada plaza, que es de donde salen los Prestados de los Fallos. */
  let menos = Infinity;
  let donde = '';
  let menosFuera = Infinity;
  let dondeFuera = '';
  for (const t of [0, 5, 10, 15, 20, 25, 30]) {
    const cc = C.ciudadDeLaMesa(t, CODIGOS[t] as string);
    const nn = C.ciudadDeLaNoche(cc, CODIGOS[t] as string, 2, fallosDeLaPrueba(cc, 2));
    for (const p of cc.plazas) {
      for (const tic of [0, 3000, 9000, 15000]) {
        const n = D.durmientesCercaEnLaCiudad(nn, tic, p.centro.x * UNO, p.centro.z * UNO, 60, 1000).length;
        if (n < menos) {
          menos = n;
          donde = `${String(t)}·${String(p.numero)}·${p.distrito}·${String(tic)}`;
        }
        if (p.distrito !== 'naves' && n < menosFuera) {
          menosFuera = n;
          dondeFuera = `${String(t)}·${String(p.numero)}·${p.distrito}·${String(tic)}`;
        }
      }
    }
  }
  nota(`a 60 m del centro de una plaza hay como poco ${String(menos)} durmientes (${donde}); fuera de las Naves, ${String(menosFuera)} (${dondeFuera})`);
  comprobar('hay gente cerca de cada plaza para que salgan Prestados: siempre 18 o más a 60 m de su centro, y 12 en las Naves, que son de poca gente (§2.2)', menosFuera >= 18 && menos >= 12, { menos, donde, menosFuera, dondeFuera });
}

// ---------------------------------------------------------------------------
paso('12 · Los tiempos de la puerta, en un Node recién arrancado');
// ---------------------------------------------------------------------------

const DIR_DE_LA_CIUDAD = fs.mkdtempSync(path.join(os.tmpdir(), 'quiebro-ciudad-'));
const RUTA_DE_LA_CIUDAD = barra(path.join(REPO, 'shared', 'arcade', 'juegos', 'quiebro-ciudad'));
const RUTA_DE_LOS_DURMIENTES_DE_LA_CIUDAD = barra(path.join(REPO, 'shared', 'arcade', 'juegos', 'quiebro-durmientes'));
const RUTA_DEL_CANONICO = barra(path.join(REPO, 'shared', 'mecanicas', 'canonico'));


{
  /*
   * LA PUERTA (§6.3 de CIUDAD-ABIERTA): traza, noche y mundo en 8 ms o menos en un Node caliente. Se mide en
   * un Node nuevo, con el paquete que haría el servidor (`--target=node20`), sin barrer la memoria a mano:
   *
   *   · en frío, lo primero de un proceso (sólo la nota: ahí va compilar el código);
   *   · caliente, una TRAZA NUEVA —de un dibujo que el proceso aún no ha hecho—, su noche y su mundo: lo peor
   *     que le puede pasar a una mesa que empieza, y lo que la puerta pide en 8 ms. Se mide como la MEDIANA
   *     de quince trazas nuevas seguidas en el mismo proceso caliente (las 16-31 menos la 29), y la de la
   *     traza 29 sola queda en la nota;
   *   · caliente, una MESA NUEVA de una traza ya hecha, con su noche y su mundo: lo de casi siempre, y lo que
   *     la medida pidió en 1,5 ms (aquí, en 3, por la máquina compartida);
   *   · los 64 durmientes más cercanos a la Glorieta, en frío (el primer fotograma de la multitud).
   *
   * Lo mejor de cinco arranques, y diez más si con cinco no cabe: en esta máquina corren otros frentes a la
   * vez, y lo que es de la ciudad sale en las quince (ver el paso 5 del barrio).
   *
   * POR QUÉ LA MEDIANA DE QUINCE Y NO UNA TOMA. Una traza nueva asigna unos 10 MB y deja viva 3 (la
   * geometría, la ciudad y el mundo), así que el recolector trabaja dentro de cualquier medida suya. Y lo que
   * asigna un arranque es SIEMPRE lo mismo (todo es determinista), así que la toma sola cae en cada uno de
   * los quince arranques en la MISMA fase del recolector: «lo mejor de quince» no muestrea nada. Se vio el
   * 24-sep: al hacer la ciudad más rápida, el marcado del recolector viejo, que antes acababa justo antes de
   * la toma, pasó a caer dentro, y las quince tomas salieron entre 9 y 25 ms con 3,8 ms de mediana en serie;
   * con `--initial-heap-size=128`, que sólo cambia dónde cae el recolector, 4,9-6,8 ms. Quince trazas
   * seguidas caen cada una en una fase distinta, y su mediana es lo que paga una mesa que empieza.
   */
  const entrada = path.join(DIR_DE_LA_CIUDAD, 'cronometro.ts');
  fs.writeFileSync(
    entrada,
    `import { ciudadDeLaMesa, ciudadDeLaNoche, mundoDeLaLizaDeLaCiudad } from '${RUTA_DE_LA_CIUDAD}';\n` +
      `import { durmientesCercaEnLaCiudad } from '${RUTA_DE_LOS_DURMIENTES_DE_LA_CIUDAD}';\n` +
      'const t0 = performance.now();\n' +
      "const c = ciudadDeLaMesa(0, 'QWXYZ');\n" +
      "const n = ciudadDeLaNoche(c, 'QWXYZ', 1, [1]);\n" +
      'mundoDeLaLizaDeLaCiudad(n, false);\n' +
      'const t1 = performance.now();\n' +
      'durmientesCercaEnLaCiudad(n, 1234, 0, 0, 90, 64);\n' +
      'const t2 = performance.now();\n' +
      "for (let k = 0; k < 16; k++) { const cc = ciudadDeLaMesa(k, 'CALIENTE' + String(k)); const nn = ciudadDeLaNoche(cc, 'CALIENTE' + String(k), 1 + (k % 10), [1]); mundoDeLaLizaDeLaCiudad(nn, true); durmientesCercaEnLaCiudad(nn, 99 * k, 48 * (k % 5), 0, 90, 64); }\n" +
      'const t3 = performance.now();\n' +
      "const c2 = ciudadDeLaMesa(29, 'NUEVA');\n" +
      "const n2 = ciudadDeLaNoche(c2, 'NUEVA', 2, [1]);\n" +
      'mundoDeLaLizaDeLaCiudad(n2, false);\n' +
      'const t4 = performance.now();\n' +
      "const c3 = ciudadDeLaMesa(29, 'OTRA');\n" +
      "const n3 = ciudadDeLaNoche(c3, 'OTRA', 3, [1]);\n" +
      'mundoDeLaLizaDeLaCiudad(n3, false);\n' +
      'const t5 = performance.now();\n' +
      "const n4 = ciudadDeLaNoche(c3, 'OTRA', 4, [2]);\n" +
      'mundoDeLaLizaDeLaCiudad(n4, false);\n' +
      'const t6 = performance.now();\n' +
      'const serie: number[] = [];\n' +
      "for (let t = 16; t < 32; t++) { if (t === 29) continue; const a = performance.now(); const cs = ciudadDeLaMesa(t, 'SERIE' + String(t)); const ns = ciudadDeLaNoche(cs, 'SERIE' + String(t), 1 + (t % 10), [1 + (t % 6)]); mundoDeLaLizaDeLaCiudad(ns, false); serie.push(performance.now() - a); }\n" +
      'serie.sort((a, b) => a - b);\n' +
      'console.log(JSON.stringify({ frio: t1 - t0, durmientes: t2 - t1, trazaNueva: t4 - t3, mesaNueva: t5 - t4, nocheNueva: t6 - t5, trazas: serie.length, serieMediana: serie[serie.length >> 1], seriePeor: serie[serie.length - 1], cajas: n.cajas.length + n2.cajas.length }));\n',
    'utf8',
  );
  const paquete = path.join(DIR_DE_LA_CIUDAD, 'cronometro.js');
  const hecho = empaquetar(entrada, paquete, 'node20');
  comprobar('el cronómetro de la ciudad se empaqueta, y no barre la memoria a mano', hecho.bien && !/\bgc\b/.test(fs.readFileSync(entrada, 'utf8')), hecho.error);
  const tomas: { frio: number; durmientes: number; trazaNueva: number; mesaNueva: number; nocheNueva: number; trazas: number; serieMediana: number; seriePeor: number }[] = [];
  let intentadas = 0;
  const tomar = (cuantas: number): void => {
    for (let k = 0; k < cuantas; k++) {
      intentadas++;
      const r = spawnSync(process.execPath, [paquete], { encoding: 'utf8' });
      try {
        tomas.push(JSON.parse(r.stdout.trim()) as (typeof tomas)[number]);
      } catch {
        /* Una toma que no dice nada no cuenta: lo dice la comprobación de abajo. */
      }
    }
  };
  const mejor = (v: number[]): number => Math.min(...v);
  const mediana = (v: number[]): number => v.slice().sort((a, b) => a - b)[Math.floor(v.length / 2)] as number;
  const caben = (): boolean => tomas.length > 0 && mejor(tomas.map((t) => t.serieMediana)) <= 8 && mejor(tomas.map((t) => t.mesaNueva)) <= 3;
  if (hecho.bien) {
    tomar(5);
    if (!caben()) tomar(10);
  }
  comprobar(
    `las ${String(intentadas)} tomas de la ciudad dicen algo, cada una con sus 15 trazas nuevas en serie`,
    intentadas >= 5 && tomas.length === intentadas && tomas.every((t) => t.trazas === 15 && Number.isFinite(t.serieMediana) && Number.isFinite(t.seriePeor)),
    { intentadas, tomas: tomas.length },
  );
  if (tomas.length > 0) {
    const de = (k: keyof (typeof tomas)[number]): number[] => tomas.map((t) => t[k]);
    nota(
      `mejor / mediana de ${String(tomas.length)}: en frío (traza, noche y mundo) ${mejor(de('frio')).toFixed(2)} / ${mediana(de('frio')).toFixed(2)} ms; ` +
        `los 64 durmientes más cercanos, en frío, ${mejor(de('durmientes')).toFixed(2)} ms; caliente, una traza nueva: la mediana de 15 en serie ${mejor(de('serieMediana')).toFixed(2)} / ${mediana(de('serieMediana')).toFixed(2)} ms ` +
        `(la peor de las 15, ${mejor(de('seriePeor')).toFixed(2)} / ${mediana(de('seriePeor')).toFixed(2)}; la 29 sola, en la fase del recolector que le toque, ${mejor(de('trazaNueva')).toFixed(2)} / ${mediana(de('trazaNueva')).toFixed(2)}), ` +
        `una mesa nueva de una traza hecha ${mejor(de('mesaNueva')).toFixed(2)} / ${mediana(de('mesaNueva')).toFixed(2)} ms, otra noche de la misma mesa ${mejor(de('nocheNueva')).toFixed(2)} ms`,
    );
    comprobar('LA PUERTA: una traza nueva, su noche y su mundo, en 8 ms o menos en un Node caliente (la mediana de 15 trazas nuevas en serie)', mejor(de('serieMediana')) <= 8, de('serieMediana'));
    comprobar('y una mesa nueva de una traza ya hecha, con su noche y su mundo, en 3 ms o menos', mejor(de('mesaNueva')) <= 3, de('mesaNueva'));
  }
}

// ---------------------------------------------------------------------------
paso('13 · La misma ciudad y los mismos durmientes en Node y en Hermes');
// ---------------------------------------------------------------------------

interface ResumenDeLaCiudad {
  readonly traza: number;
  readonly noche: number;
  readonly ciudad: string;
  readonly vestido: string;
  readonly despejada: string;
  readonly mundo: string;
  readonly mundoDespejado: string;
  readonly durmientes: string;
  readonly cajas: number;
}

{
  const tanda = path.join(DIR_DE_LA_CIUDAD, 'tanda.ts');
  fs.writeFileSync(
    tanda,
    `import { canonico } from '${RUTA_DEL_CANONICO}';\n` +
      `import { ciudadDeLaMesa, ciudadDeLaNoche, despejarLasPlazas, mundoDeLaLizaDeLaCiudad, pasoAbiertoEnLaCiudad, trenEnLaCiudad, triosDeFallos } from '${RUTA_DE_LA_CIUDAD}';\n` +
      `import { durmientesCercaEnLaCiudad, durmienteMasCercanoEnLaCiudad, sitioDelDurmienteEnLaCiudad, aspectoDelDurmienteEnLaCiudad } from '${RUTA_DE_LOS_DURMIENTES_DE_LA_CIUDAD}';\n` +
      'function fnv(texto: string): string { let h = 0x811c9dc5; for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); }\n' +
      "const MESAS: [number, string, number][] = [[0, 'QWXYZ', 1], [13, 'K7M2P', 3], [22, 'ZZZZZ', 10], [31, 'ABCDE', 7]];\n" +
      'const TICS = [0, 1, 599, 600, 1199, 12345, 20000, -777];\n' +
      'export function tanda() {\n' +
      '  const salida = [];\n' +
      '  for (const [traza, codigo, n] of MESAS) {\n' +
      '    const c = ciudadDeLaMesa(traza, codigo);\n' +
      '    const trio = triosDeFallos(c, 2)[0];\n' +
      '    const fallos = trio === undefined ? [2] : [2, trio[0], trio[1]];\n' +
      '    const noche = ciudadDeLaNoche(c, codigo, n, fallos);\n' +
      '    const d = despejarLasPlazas(noche);\n' +
      "    let dur = '';\n" +
      '    for (const t of TICS) {\n' +
      '      for (const p of c.plazas) {\n' +
      '        const cerca = durmientesCercaEnLaCiudad(noche, t, p.centro.x * 65536, p.centro.z * 65536, 90, 64);\n' +
      "        for (const i of cerca) { const s = sitioDelDurmienteEnLaCiudad(noche, i, t); const a = aspectoDelDurmienteEnLaCiudad(noche, i); dur += String(i) + ':' + (s === null ? '-' : String(s.x) + ',' + String(s.z) + ',' + String(s.rumbo) + (s.anda ? 'a' : 'q')) + (a.paraguas ? 'p' : '') + ';'; }\n" +
      "        dur += '|' + String(durmienteMasCercanoEnLaCiudad(noche, t, p.centro.x * 65536, p.centro.z * 65536, [0, 1, 2]));\n" +
      '      }\n' +
      '      const tren = trenEnLaCiudad(noche, t);\n' +
      "      dur += '|' + (tren === null ? '-' : String(tren.cabeza) + ':' + String(tren.cola)) + '|' + (pasoAbiertoEnLaCiudad(noche, 77, 'x', t) ? '1' : '0');\n" +
      '    }\n' +
      '    salida.push({ traza, noche: n, ciudad: fnv(canonico(c)), vestido: fnv(canonico({ ...noche, ciudad: null })), despejada: fnv(canonico({ ...d, ciudad: null })), mundo: fnv(canonico(mundoDeLaLizaDeLaCiudad(noche, false))), mundoDespejado: fnv(canonico(mundoDeLaLizaDeLaCiudad(noche, true))), durmientes: fnv(dur), cajas: noche.cajas.length });\n' +
      '  }\n' +
      '  return salida;\n' +
      '}\n',
    'utf8',
  );
  const entrada = path.join(DIR_DE_LA_CIUDAD, 'entrada.ts');
  fs.writeFileSync(entrada, "import { tanda } from './tanda';\nconst linea = JSON.stringify(tanda());\n// @ts-ignore\nif (typeof print === 'function') print(linea); else console.log(linea);\n", 'utf8');
  let enProceso: ResumenDeLaCiudad[] = [];
  try {
    const modulo = (await import(pathToFileURL(tanda).href)) as { tanda: () => ResumenDeLaCiudad[] };
    enProceso = modulo.tanda();
  } catch (e) {
    comprobar('la tanda de la ciudad corre en este proceso', false, e instanceof Error ? e.message : String(e));
  }
  for (const r of enProceso) nota(`traza ${String(r.traza)} noche ${String(r.noche)}: ${String(r.cajas)} cajas · ciudad ${r.ciudad} · noche ${r.vestido} · despejada ${r.despejada} · mundo ${r.mundo}/${r.mundoDespejado} · durmientes ${r.durmientes}`);
  const hermes = dondeEstaHermes();
  comprobar('el intérprete de Hermes está instalado (sin él esto no compara dos motores)', hermes !== null);
  const crudo = path.join(DIR_DE_LA_CIUDAD, 'tanda.js');
  const hecho = empaquetar(entrada, crudo, 'es2015');
  comprobar('la ciudad y sus durmientes se empaquetan para los dos motores', hecho.bien, hecho.error);
  let listo = hecho.bien;
  if (listo) {
    const NOMBRE_DEL_COMPLEMENTO = '@babel/plugin-transform-classes';
    const bajarClases = (await import(NOMBRE_DEL_COMPLEMENTO)) as { default: unknown };
    const babel = await import('@babel/core');
    const transformado = babel.transformFileSync(crudo, { babelrc: false, configFile: false, compact: false, plugins: [bajarClases.default as babel.PluginItem] });
    const codigo = transformado?.code ?? '';
    listo = codigo.length > 0;
    if (listo) fs.writeFileSync(crudo, codigo, 'utf8');
  }
  if (listo && hermes !== null) {
    const leer = (s: string): ResumenDeLaCiudad[] | null => {
      try {
        return JSON.parse(s.trim().split('\n').pop() ?? '') as ResumenDeLaCiudad[];
      } catch {
        return null;
      }
    };
    const enNode = spawnSync(process.execPath, [crudo], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const enHermes = spawnSync(hermes, [crudo], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    comprobar('Node y Hermes corren la tanda de la ciudad sin caerse', enNode.status === 0 && enHermes.status === 0, { node: enNode.stderr.slice(0, 300), hermes: enHermes.stderr.slice(0, 300) });
    const a = leer(enNode.stdout);
    const h = leer(enHermes.stdout);
    comprobar('SUELO: los dos motores y este proceso devuelven las cuatro ciudades', a !== null && h !== null && a.length === 4 && h.length === 4 && enProceso.length === 4, { node: a?.length, hermes: h?.length });
    if (a !== null && h !== null) {
      comprobar('la ciudad, su noche, la despejada, sus dos mundos de la Liza y los durmientes dan la MISMA huella en Node y en Hermes', JSON.stringify(a) === JSON.stringify(h), { node: a, hermes: h });
      comprobar('y el paquete da lo mismo que el código sin empaquetar en este proceso', JSON.stringify(a) === JSON.stringify(enProceso), { empaquetado: a, proceso: enProceso });
    }
  }
}

fs.rmSync(DIR_DE_LA_CIUDAD, { recursive: true, force: true });

terminar({
  escritas: 163,
  enVerde:
    'El barrio es uno solo, sale de (código, noche) y de nada más, se anda entero y se navega por la plaza,\n' +
    'su mundo vale para la Liza, y sus 48 durmientes no se meten en nada, cruzan en verde y están donde dicen\n' +
    'en Node, en Hermes y en un Node recién arrancado. Y la ciudad de 540 m, en sus 32 trazas y diez noches\n' +
    'cada una, no tiene una caja encima de otra, se anda entera con las obras, llega a sus cabinas y a sus\n' +
    'tríos, sus 635 durmientes no pisan nada ni cruzan en rojo, abre la puerta a tiempo y da lo mismo en\n' +
    'Node y en Hermes.',
});
