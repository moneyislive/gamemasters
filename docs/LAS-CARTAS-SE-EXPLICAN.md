# Las cartas se explican

> Si algo de aquí no coincide con el código, gana el código. Este documento recoge las
> decisiones y su porqué. Se escribió el 6 de septiembre de 2026 sobre la rama
> `lobby-catan`, con el código en `6372bc7`, a partir de una frase que Miguel dijo tras
> jugar una partida entera: «cuando ponemos el cursor encima de una carta de la izquierda
> aparezca una descripción de la carta, porque ahora los usuarios no saben qué hace cada
> una, qué consiguen, ni cómo la tienen que usar». Es el más pequeño de los tres encargos
> de esa partida (los otros dos son el trueque múltiple y el estiaje) y el que toca a más
> gente: a quien abre Riberas por primera vez.
>
> Ningún número de aquí es una opinión. Cada uno sale de un guion de medida corrido sobre
> el código de `6372bc7` (los seis están en el §9) o de un comprobador que se nombra con
> su cuenta del día. Las citas al código son por NOMBRE de función o de constante y nunca
> por número de línea, a propósito: hay otro agente escribiendo a la vez la fase 4 de la
> mesa en `escenas/delta.tsx` y en las dos pantallas, y una cita de línea nace caducada.
>
> **SEGUNDA VUELTA, EL MISMO DÍA, Y ES LA QUE MANDA.** El presupuesto del cartel estaba
> medido con la cinta del tercio central en 44 puntos, y la cinta llega a **88** (renglón
> de aviso 44 más línea de botones 44: §2.2 de `docs/LA-MESA-DE-RIBERAS.md`, «la suma
> máxima es por tanto 88 puntos»). Y hay algo peor que la cinta equivocada: la tabla del
> §5.1 de la primera vuelta no restaba NINGUNA cinta. El guion nuevo reproduce su columna
> de «alto libre» clavada, lienzo a lienzo, poniendo la cinta a cero (272 en 320×360, 240
> en el SE apaisado), mientras el texto de al lado prometía que se le restaban 44. Los dos
> encargos hermanos empujan justo hacia la cinta de dos líneas: el estiaje añade avisos, y
> el trueque deja «pasar» y «empezar» en la línea de botones. Así que el §5 entero está
> vuelto a medir con las DOS cintas declaradas y con el pregón del trueque encima, y lo
> que eso cambia sube a Miguel en el §11.
>
> **TERCERA VUELTA, Y ES DE ARITMÉTICA: EL REM DE ESTA CASA VALE 17 PUNTOS Y NO 16.**
> `estilo.css` abre con `html { font-size: 106.25%; }`, y su propia cabecera dice por qué
> («la base es 106,25 % —los 17 px de siempre cuando el navegador viene con sus 16—», y va
> en porcentaje y no en píxeles para no anular la preferencia de tamaño de letra del
> navegador). La segunda vuelta de este documento escribió, con todas sus letras, «0,82 rem
> sobre 16, o sea 13 puntos», y sobre esos 13 puntos levantó sus dos tablas de letra: el
> ancho por letra y el alto del renglón. Los tres números buenos son **13,94 de cuerpo,
> 8,36 por letra** (el 0,6 de `tamanoDeTexto`) **y 19 de renglón** (`ceil(13,94 · 1,35)`).
> Las tablas del §5.1 y del §5.3 están rehechas con ellos y con la geometría intacta —la
> banda libre y el techo del asa no dependen de la letra—, y lo que se movió y lo que no
> está apuntado en el §10.10. El titular no se movió. Una frase del §2 sí: la de «qué
> consigues» de los cinco títulos ocupaba TRES renglones al ancho bueno, que es exactamente
> el fallo que la segunda vuelta le pilló a la primera en la guardia, y por el mismo
> motivo: un presupuesto escrito en caracteres no ve los renglones.
>
> También cambia el nombre del mueble del otro documento: lo que aquí se llamaba «el
> tablón» es **el pregón** desde la segunda pasada de `docs/EL-TRUEQUE-DE-RIBERAS.md`
> (§10.8 de aquí dice por qué se renombró allí, y por qué no era cosmético).
>
> Este documento no escribe una sola línea de código.

## 0. Qué hay hoy, y qué no sabe quien abre Riberas por primera vez

La mano de la izquierda es la de las cartas del mazo. La coloca `huecosDeLasCartas`
(`escenas/cartas.ts`), la pinta `ManoDelMazo` con una `CartaDelMazoEnLaMano` por naipe
(`escenas/delta.tsx`) y la compone `laManoDeLaIzquierda` (`shared/arcade/juegos/riberas-en-tres.ts`),
que junta dos cosas distintas:

| Qué | De dónde sale | Cuántos naipes |
|---|---|---|
| Las nueve clases de carta del mazo | `cartasEnTres`, desde `vista.misCartas` (secreto) | 9 |
| Los dos premios | `premiosEnTres`, desde `vista.vado` y `vista.guardia` (públicos) | 2 |

Son **once naipes**, no nueve, y eso importa desde la primera línea del encargo: El Vado
Largo y La Mayor Guardia se ven en la misma mano, con la misma forma y el mismo gesto, y
quien no sabe qué hace La Guardia tampoco sabe qué es ese naipe con un vado dibujado que
apareció solo y que no se puede coger para nada. Un cartel que explique nueve de once deja
justo fuera los dos que aparecen sin que nadie los pida.

De cada naipe, hoy, en el lienzo se ve: su **color**, que es el de su familia
(`COLOR_DE_LA_FAMILIA`); su **dibujo**, que es un contorno compilado de `escenas/iconos.ts`;
y si está **apagada** o no, que dice si hoy se puede hacer algo con ella (`apagada` en
`CartaDelMazoColocada`). No se ve su nombre: en el lienzo no hay letras, y no las hay a
propósito (§4). El nombre existe (`nombre` en `CartaDelMazoEnTres`, que viene de
`RETRATO_DE_LA_CARTA`) y hoy sólo se lee en dos sitios fuera del lienzo: en el rótulo de
una opción («La Guardia: robar a Ana») y en el título del menú que sale al soltar el naipe
en la casilla de JUGAR (`LO_QUE_SE_PREGUNTA` en el escritorio, `PREGUNTA_DE_LA_JUGADA` en la app).

O sea que hoy la única explicación de una carta es la `ayuda` de su OPCIÓN, y esa ayuda
tiene tres agujeros:

1. **Sólo existe si la carta se puede jugar ahora.** `opcionesDelMazo` corta antes con
   `if (v.cartaJugada) continue;` y con `if (enMano.comprada >= v.turnosAbiertos) continue;`.
   La carta que acabas de comprar, que es exactamente la que no conoces, no ofrece ninguna
   opción y por tanto no tiene ninguna ayuda. Se dibuja apagada y muda.
2. **Está escrita para la jugada, no para la carta.** «Le quitas un bien al azar. Cuenta
   para La Mayor Guardia.» contesta qué hace, no qué consigues ni cuándo puedes usarla.
3. **Los dos premios no tienen opción ninguna,** y por eso no tienen ayuda ninguna. Salen
   con `sePuedeJugar: false`, `sePuedeRevelar: false` y `esPremio: true`.

Y hay un cuarto agujero que no es de la ayuda sino del sitio: en el retablo (el tablero
plano) **no hay mano de cartas**. El marcador publica `cartas` de cada colono, que es un
número y no una lista (`ColonoVisto`, comentario «CUÁNTAS CARTAS TIENE EN LA MANO. El
número, no cuáles»). Quien juega en el retablo no ve un naipe en su vida: ve botones.

**Y el retablo no es la pantalla de repuesto: en las mesas grandes es la única.**
`MANIFIESTO_RIBERAS.jugadores` es `{ minimo: 2, maximo: 6 }`, o sea que se sientan hasta
seis; pero `COLORES_EN_3D` (`riberas-en-3d.ts`) tiene **cuatro** colores (`red`, `blue`,
`yellow`, `green`) y `bastanColores` devuelve falso en cuanto `vista.colonos.length` pasa
de cuatro. `esVistaQueSePinta && bastanColores` es la llave del 3D en `riberas-en-tres.ts`,
y `porQueElRetablo` en `escritorio/src/riberas-en-tres.tsx` manda al `Retablo` cuando falla.
Traducido: **en una mesa de cinco o de seis, hoy, el retablo es la única pantalla que
existe**, y este encargo va justamente de la gente que no sabe qué hace una carta. Por eso
la forma del cartel en el retablo (§5.2) no es una fase opcional del final, y por eso está
la segunda del §12 y no la última.

## 1. Las decisiones que no se pueden deshacer después

1. **El texto vive en `RETRATO_DE_LA_CARTA` y en `RETRATO_DEL_PREMIO`, en
   `shared/arcade/juegos/riberas-en-tres.ts`, y NO viaja en la vista.** Es la decisión que
   manda sobre las demás, y está medida en el §3: meter las once filas en cada vista cuesta
   un 6,4 % más de cable por vista y 15,3 MiB de las mismas once frases en una partida
   entera; tenerlas en el cliente cuesta 1.926 bytes una vez por descarga. Y la tabla ya
   está ahí, ya es `Record<ClaseDeCarta, ...>`, así que una carta nueva sin texto no
   compila. Es irreversible porque la alternativa (un campo `explicacion` en
   `VistaDeRiberas`) obligaría a tocar el tipo cerrado de la vista, que es la mitad de la
   defensa de los secretos, para meter dentro algo que no es del estado de nadie.

2. **El texto llega a la escena DENTRO del naipe, en un campo nuevo de `CartaDelMazo`, y no
   por un mapa que la escena consulte.** `escenas/` no importa valores de `shared/`, sólo
   tipos, y ésa es una regla del repositorio y no una casualidad («POR QUÉ SÓLO SE IMPORTAN
   TIPOS DE `escenas/`», cabecera de `riberas-en-tres.ts`). Un mapa de textos dentro de
   `escenas/` sería la segunda copia del vocabulario de Riberas en un fichero que no sabe
   que Riberas existe. El campo viaja como viajan `nombre`, `familia` y `dibujo`: lo pone
   la traducción, la escena lo pinta sin saber qué es.

3. **El cartel NO es un objeto de la escena: es interfaz por encima del lienzo.** Medido:
   la única manera de escribir que la escena tiene hoy son contornos compilados
   (`geometriaDeContornos` sobre `CONTORNOS_DE_LA_CIFRA`, `CONTORNOS_DE_LA_CARTA` y
   `CONTORNOS_DEL_BIEN`), y ahí no hay una sola LETRA: hay diez cifras, doce dibujos de
   carta y cinco bienes. Un glifo compilado cuesta 60,0 triángulos de media
   (`medir-las-letras.ts`, sobre las diez cifras de verdad: de 8 la más barata a 160 la más
   cara). El cartel más largo tiene 142 caracteres, o sea **8.520 triángulos**, contra un
   presupuesto de mesa de `TOPE_DE_LA_MESA = 4.500` y unos fijos de
   `TRIANGULOS_FIJOS_DE_LA_MESA = 1.470`. Son **189 % del tope de la mesa entera** sólo para
   una frase, y antes de eso habría que compilar y guardar unos setenta y cuatro glifos
   nuevos en `escenas/iconos.ts`. Esto no es una preferencia estética: es que no cabe.

4. **El gesto no se inventa: es el que ya hay.** Con ratón, los dos manejadores que ya
   existen dentro de `CartaDelMazoEnLaMano` (`onPointerOver` y `onPointerOut`, los que hoy
   mueven el estado local `encima`) avisan hacia fuera. Con dedo, no hace falta nada nuevo:
   coger un naipe con un toque YA es un estado de los dos clientes (`cartaDelMazo` en el
   escritorio, `cogidaDelMazo` en la app) y YA es lo que abre las casillas. El cartel se
   cuelga de ese estado. Ni un toque más, ni un toque robado. El §4 lo desarrolla.

5. **El cartel no puede recibir un solo puntero.** `pointer-events: none` en el escritorio y
   `pointerEvents="none"` en la app, siempre, sin excepción y sin botón de cerrar. El cartel
   vive al pie del lienzo, encima del delta, y la única manera de que una ayuda no cambie el
   juego es que no sea pulsable: un rectángulo de 240 por 136 puntos que se traga los toques
   del tablero sería un cartel que impide construir donde tapa. Se cierra soltando la carta
   (segundo toque, que es lo que ya hace `alCogerCartaDelMazo`) o apartando el cursor.

6. **El presupuesto del texto se escribe en RENGLONES, con la cinta declarada y con el rem
   de esta casa, no en caracteres a secas.** Cada frase cabe en **dos renglones a 25 letras
   por línea**, que es lo que da el lienzo más estrecho (320×360), y en uno a partir de 46
   letras. Contado en caracteres eso son **46 como mucho por frase**, pero el número que
   manda es el renglón, y el renglón depende de dos cosas que este documento escribió mal
   una vez cada una: la cinta (segunda vuelta) y el cuerpo de la letra (tercera). Con el rem
   a 16 salían 27 letras por línea y un renglón de 18 puntos; con el rem de verdad, que es
   **17**, salen **25 letras y 19 puntos**, y a 25 una frase de 51 caracteres ocupa TRES
   renglones. Las dos veces el error fue el mismo: un tope en caracteres que no ve dónde
   cae el corte. El presupuesto viejo (145 caracteres las tres juntas, 55 la primera) salía
   además de una tabla medida **sin cinta ninguna**. Todo está vuelto a medir en el §5.1,
   con `medir-el-presupuesto-del-cartel.ts` sobre los quince lienzos de la lista `LIENZOS`
   de `verify:escena`, con las dos cintas dichas por su nombre en cada columna y con los
   13,94 puntos de cuerpo escritos en el modelo. Escribir primero y medir después es cómo
   se llega a un cartel que se recorta justo en el teléfono de quien más lo necesita.

7. **Los once naipes llevan texto, y ninguno se queda sin él.** Las nueve clases y los dos
   premios. Un comprobador lo afirma clase a clase (§7), porque una carta sin texto es la
   que nadie mira hasta que un jugador la compra.

8. **La guardia se escribe DOS veces, y la que entra la decide el ladrón, no este
   documento.** Hoy una guardia sólo se puede jugar después de tirar (`jugarLaGuardia`
   empieza con `if (yo < 0 || !estado.tirado) return estado;`) y lo único que hace es robar
   un bien al azar. Con el ladrón, Miguel pidió por escrito que se pueda jugar «incluso
   antes de lanzar los dados» y que mueva la figura. Las dos versiones están escritas en el
   §2, y cuál entra lo dice un comprobador y no una fecha (§7, la vacuna de la guardia).

9. **El cartel NO se pinta mientras el pregón del trueque está abierto, y desde la hoja de
   una propuesta se puede pedir igual.** Los dos cuelgan de la misma banda central y los dos
   se pueden pedir a la vez: el cartel sale con el puntero sobre un naipe, que no exige
   turno, y el pregón existe justo cuando el turno es de otro. Así que el sitio hay que
   medirlo UNA vez y con todo puesto. Medido (§5.3): con la cinta a 88 y las cuatro
   propuestas colgando, en el SE apaisado el pie del pregón cae **24 puntos por debajo** del
   techo del asa de la barra, y en 320×360 quedan **8 puntos** entre los dos. No es que el
   cartel quepa apretado: es que no queda banda. La regla es de exclusión y no de reparto, y
   el mismo par de números está escrito en `docs/EL-TRUEQUE-DE-RIBERAS.md`, que es el
   documento hermano de esta banda y el único otro que mide aquí.

10. **La forma del retablo entra en la MISMA tanda que la del 3D, no después.** Con cinco o
    seis colonos el retablo es la única pantalla que hay (`COLORES_EN_3D` tiene cuatro
    colores, §0), así que un encargo que sólo llegue al lienzo deja sin explicación
    justamente a las mesas más grandes. Es irreversible en el sentido que importa aquí: si
    la fase del retablo se deja para el final, se queda para siempre detrás de las tres del
    3D, que es exactamente lo que pasó con la primera vuelta de este documento.

## 2. Los once naipes, con sus tres frases

Las tres columnas son las tres cosas que Miguel pidió, en su orden: **qué hace**, **qué
consigues**, **cómo se usa**. En el idioma de Riberas, sin jerga de reglas, sin nombrar un
tipo de movimiento y sin decir «desarrollo», «caballero» ni «monopolio».

Los cinco títulos comparten las tres frases, y eso no es pereza: es lo que dice el propio
código («Los cinco TÍTULOS son una sola familia con cinco caras: cuestan lo mismo, valen lo
mismo y hacen lo mismo», cabecera de `ClaseDeCarta`). Lo que los distingue es el dibujo y el
nombre, y ésos ya son distintos.

| Naipe | Qué hace | Qué consigues | Cómo se usa |
|---|---|---|---|
| **La Guardia** (hoy) | Le quitas un bien al azar a quien elijas. | Ese bien, y una muesca para La Mayor Guardia. | Tras tirar, suéltala en JUGAR y di a quién. |
| **La Guardia** (con el estiaje) | Mueves el estiaje y robas a quien tenga allí. | Un bien suyo, y muesca para La Mayor Guardia. | Suéltala en JUGAR, antes o después de tirar. |
| **El Año Bueno** | Coges 2 bienes del arcón, iguales o no. | Dos bienes que no le quitas a nadie. | Tras tirar, suéltala en JUGAR y di cuáles. |
| **El Acaparamiento** | Pides un bien y todos te dan los que tengan. | Todo ese bien de las otras manos, o nada. | Tras tirar, suéltala en JUGAR y di cuál pides. |
| **Las Dos Veredas** | Abres 2 veredas sin pagarlas. | Dos pasos del Vado Largo, o sitio de choza. | Tras tirar, suéltala en JUGAR y trázalas. |
| **El Molino, La Cantera, El Torreón, El Faro, El Huerto** | No se juega: se tiene. Vale 1 punto. | Ese punto: secreto tuyo hasta que la enseñes. | Suéltala en REVELAR; no gasta la jugada. |
| **El Vado Largo** (premio) | Lo tiene quien encadena más veredas, desde 5. | 2 puntos mientras nadie te supere. | Nada: se gana trazando veredas y se va solo. |
| **La Mayor Guardia** (premio) | La tiene quien más guardias juega, desde 3. | 1 punto mientras nadie te supere. | Nada: se gana jugando guardias y se va sola. |

Y lo que cada frase mide, con las tildes puestas y contado por `textos-con-tildes.mjs`. La
columna que manda es la última: cuántos RENGLONES ocupa cada frase envuelta con avaricia a
**25 letras por línea**, que es lo que da el lienzo más estrecho de los quince con el rem de
esta casa en 17 puntos (§5.1). La segunda vuelta ponía ahí 27, que salían de un rem de 16.

| Naipe | Hace | Consigues | Usas | Las tres seguidas | Bytes | Renglones a 25 (h+c+u) |
|---|---|---|---|---|---|---|
| La Guardia (hoy) | 41 | 45 | 43 | 131 | 133 | 2+2+2 = 6 |
| La Guardia (con el estiaje) | 45 | 45 | 44 | 136 | 139 | 2+2+2 = 6 |
| El Año Bueno | 39 | 36 | 42 | 119 | 122 | 2+2+2 = 6 |
| El Acaparamiento | 44 | 41 | 46 | 133 | 135 | 2+2+2 = 6 |
| Las Dos Veredas | 29 | 43 | 41 | 115 | 117 | 2+2+2 = 6 |
| Los cinco títulos | 36 | 45 | 40 | 123 | 125 | 2+2+2 = 6 |
| El Vado Largo | 45 | 34 | 44 | 125 | 126 | 2+2+2 = 6 |
| La Mayor Guardia | 43 | 33 | 44 | 122 | 123 | 2+2+2 = 6 |

Las veinticuatro frases ocupan **exactamente dos renglones** a 25 letras y **uno** a partir
de 46, y ninguna pasa de 46 caracteres. Ésa es la forma del presupuesto (decisión 6): no
«cuántas letras», sino «cuántos renglones en el lienzo peor», porque el cartel se corta por
renglones y no por letras. La columna «las tres seguidas» cuenta los dos espacios que las
unen, y es la que se usa en el §3 para pesar el cable.

**Y una segunda frase que hubo que reescribir, por el mismo motivo que la primera y con el
otro error debajo.** La de «qué consigues» de los cinco títulos decía «Ese punto: sólo lo
cuentas tú hasta que lo enseñes»: 51 caracteres, que cabían de sobra en cualquier tope de
caracteres y que a **25** letras por línea ocupaban **TRES** renglones. A 27 —el ancho falso
que salía del rem de 16— ocupaban dos, y por eso pasó la segunda vuelta entera sin que nadie
la viera. Queda «Ese punto: secreto tuyo hasta que la enseñes»: 45 caracteres y dos
renglones, como las otras veintitrés. Es la misma clase de fallo que la frase de la guardia
del párrafo de más abajo, y las dos juntas son el argumento de la decisión 6: en este
documento el presupuesto en caracteres ya ha mentido dos veces, y el de renglones ninguna
—siempre que el ancho del renglón esté medido con el rem que la casa tiene de verdad.

**Veinticuatro aquí, veintiuna en el código, y la cuenta hay que darla.** La tabla de arriba
tiene ocho filas porque la guardia sale dos veces, una por cada regla; en
`RETRATO_DE_LA_CARTA` y `RETRATO_DEL_PREMIO` hay a la vez **siete juegos de tres, o sea
veintiuna frases distintas** (las cuatro clases que se juegan, uno para los cinco títulos, y
los dos premios), repartidas en treinta y tres campos porque los cinco títulos comparten los
suyos. Las tres de la guardia con el estiaje **sustituyen** a las tres de hoy, no se suman:
entran en la fase 5 (§12).

**Y una frase que la primera vuelta escribió mal, con la palabra que no es.** Decía «Mueves
al ladrón y robas a quien tenga allí», y la pieza **no se llama así en pantalla**: la
decisión 10 de `docs/EL-LADRON-DE-RIBERAS.md` la llama EL ESTIAJE en pantalla y `estiaje`
en el código, y deja `ladron` fuera del vocabulario de Riberas por lo mismo que `limo` no es
`madera`. Con «el estiaje» la frase mide 45 en vez de 44 y sigue en dos renglones. La otra
que cambió es la de «qué consigues» de esa misma fila: «Un bien al azar, y una muesca para
La Mayor Guardia» medía 52 caracteres, cabía de sobra en el tope viejo de 55 y ocupaba
**TRES** renglones ya a 27 letras. Queda «Un bien suyo, y muesca para La Mayor Guardia»: 45
y dos renglones, como todas las demás. La segunda vuelta escribió aquí que aquél era «el
único sitio del documento donde el presupuesto en caracteres mentía», y no lo era: con el
ancho de renglón bien medido —25 letras y no 27, §5.1— mentía en un segundo sitio, el de
los cinco títulos, que es el párrafo de más arriba. Un tope en caracteres no falla una vez:
falla cada vez que el corte cae donde no se miró.

**Los números de las frases no se escriben a mano.** `2 bienes` es `BIENES_DEL_ANO_BUENO`,
`2 veredas` es `VEREDAS_DE_LA_CARTA`, `desde 5` es `VADO_MINIMO`, `desde 3` es
`GUARDIA_MINIMA`, `2 puntos` es `PUNTOS_DEL_VADO`, `1 punto` de La Mayor Guardia es
`PUNTOS_DE_LA_GUARDIA` y `1 punto` del título es `PUNTOS_DEL_TITULO`. Las siete constantes
están exportadas de `riberas.ts` y `riberas-en-tres.ts` ya importa de ahí, así que las filas
se componen con literales de plantilla al cargar el módulo, exactamente como
`opcionesDelMazo` compone hoy su ayuda con `${VEREDAS_DE_LA_CARTA}`. Un texto que diga «dos
veredas» con letras es un texto que miente el día que alguien toque la constante, y
`BIENES_DEL_ANO_BUENO` lleva escrito en su propia cabecera por qué esa coincidencia con
`VEREDAS_DE_LA_CARTA` es casualidad y no debe compartirse.

**Lo que las frases NO dicen, y por qué.** No dicen lo que cuesta comprar una carta (eso lo
dice el rótulo y la ayuda de COMPRAR, que ya los escribe `opcionesDelMazo` con
`listar(COSTE_DE_LA_CARTA)`), no dicen cuántas hay de cada clase en el mazo (`BOLSA_DE_CARTAS`
es información que se cuenta jugando, y publicarla en un cartel cambia el juego) y no dicen
con cuántos puntos se gana (`PUNTOS_PARA_GANAR` es del juego, no de la carta).

## 3. De dónde sale el texto, y por qué no viaja en la vista

Se midió antes de decidir. `medir-el-peso-de-los-textos.ts` abre una mesa de tres asientos
con el árbitro de verdad (`abrirMesa` y `jugar` de `server/src/arcade/arbitro`), juega una
partida ENTERA con un jugador que elige a ciegas y uniformemente entre las opciones que le
ofrece `opcionesDeRiberas`, y mide con `Buffer.byteLength` lo que `proyectarRiberas` devuelve
a cada asiento después de cada movimiento. (La primera vuelta llamaba a ese jugador «el mismo
jugador de `jugar:fondo`». No lo es: `jugar:fondo` no juega ningún arcade, §7.9. El jugador
de este guion está escrito aquí, y es de la misma clase que el que la fase 5 de
`docs/EL-LADRON-DE-RIBERAS.md` va a meter en la batería.)

| Qué se midió | Cuánto |
|---|---|
| Movimientos de la partida a ciegas | 2.775 |
| Vistas proyectadas (una por asiento por movimiento) | 8.328 |
| Lo que pesa una vista en JSON, de media | 29.879 bytes |
| La más ligera y la más pesada | 26.966 y 32.470 |
| La tabla de los once naipes en JSON, con tildes | 1.926 bytes (1.918 desde la tercera vuelta) |

Con esos números, las dos ramas:

- **Dentro de la vista:** +6,4 % de cable en CADA vista, o sea 1.926 bytes por asiento y por
  movimiento. En la partida medida, **15,3 MiB** de las mismas once frases, que no cambian
  nunca, repetidas 8.328 veces.
- **En el cliente:** 1.926 bytes una vez, dentro del binario que ya se descarga.

(La tercera vuelta reescribió una frase del §2 y la tabla adelgazó **8 bytes**, de 1.926 a
1.918. Se dice porque aquí no se redondea nada a la ligera, y se deja el 1.926 en la medida
porque es lo que el guion midió; ni el 6,4 % ni los 15,3 MiB se mueven a esta precisión.)

No hay nada que empatar. Y el argumento de peso no es el único: la vista es un tipo CERRADO
y su cabecera dice por qué («es la mitad de la defensa de los secretos»); un campo nuevo ahí
es un campo que `verify:mesa` tiene que contrastar campo a campo contra lo que de verdad
sale por el cable, para meter dentro algo que no es del estado de nadie y que es igual en
todas las partidas que se jueguen nunca.

**Y por qué en `riberas-en-tres.ts` y no en `riberas.ts`, junto a `NOMBRE_DE_LA_CARTA`.**
Tres razones, y la tercera es la que decide:

1. `NOMBRE_DE_LA_CARTA` no está exportado. Sacarlo para colgarle tres columnas sería abrir
   el fichero de reglas por un motivo de pantalla.
2. La tabla hermana ya existe y su cabecera ya contestó esta misma pregunta:
   «POR QUÉ ESTA TABLA ESTÁ AQUÍ Y NO EN `riberas.ts`: porque las tres columnas son de
   PRESENTACIÓN y ninguna es del juego». Las tres nuevas son de la misma clase, y además
   `RETRATO_DE_LA_CARTA` ya es `Readonly<Record<ClaseDeCarta, ...>>`, o sea que el
   compilador exige las nueve filas y el comprobador afirma que no sobra ninguna.
3. **`verify:procedencia` barre las cadenas literales de `shared/arcade/juegos/`**, y esa
   carpeta contiene los dos ficheros. O sea que las veintiuna frases nuevas entran solas en
   la red de la lista negra de `marcas-registradas.ts` el día que se escriben. Es la única
   parte de este encargo donde un descuido de vocabulario tiene consecuencias fuera del
   juego, y ponerlo ahí lo vigila sin escribir un comprobador nuevo.

La forma concreta, con los nombres de hoy:

- `RetratoDeLaCarta` (la interfaz) gana un campo `explicacion` con `hace`, `consigues` y
  `usas`.
- `RETRATO_DE_LA_CARTA` gana esas tres frases en sus nueve filas, y `RETRATO_DEL_PREMIO` en
  sus dos.
- `CartaDelMazoEnTres` gana `explicacion`, y lo rellenan `cartasEnTres` y `premiosEnTres`.
- `CartaDelMazo` (en `escenas/cartas.ts`) gana el mismo campo, `readonly`, para que los dos
  contratos declarados dos veces sigan encajando por estructura. Es UN campo en UNA
  interfaz: ni una constante nueva, ni una línea de aritmética, ni nada que `verify:escena`
  mida. Ver el §10, porque esto roza una frase escrita.
- `retratoDeLaCarta(clase)` sigue devolviendo la fila entera, así que el retablo puede pedir
  el texto de una clase sin pasar por un naipe (§5).

## 4. Cómo se pide el cartel, sin cursor

En el móvil no hay «encima». Y lo que hay ya sirve.

**Hoy, una carta se coge y se juega en DOS gestos, no en uno.** El primer toque la coge
(`onPointerDown` de `CartaDelMazoEnLaMano` llama a `onCoger`, y el cliente pone
`cartaDelMazo` o `cogidaDelMazo`); ese estado es lo que abre las casillas de JUGAR y REVELAR
(`puertasDeLaCarta` y `casillasDeLaMano`); el segundo gesto suelta el naipe en la casilla y
manda el movimiento. Coger otra vez la misma carta la suelta: lo hace `alCogerCartaDelMazo`
con `(antes) => (antes === carta.id ? null : carta.id)`.

**El cartel se cuelga de ese estado, y de nada más.** Con carta cogida hay cartel; sin carta
cogida no hay. No hace falta un toque largo, ni un primer toque que enseña y un segundo que
juega, ni un botón de ayuda. Y no le roba nada a jugar la carta porque no cambia el
manejador: el toque hace hoy exactamente lo que hará mañana.

**El caso que esto arregla sin pedirlo, y que es la mitad del encargo.** Una carta que hoy no
se puede ni jugar ni revelar se dibuja apagada, se deja coger y NO abre ninguna casilla. La
cabecera de `ManoDelMazo` lo dice con todas sus letras y lo defiende: «la carta se levanta,
no aparece ningún sitio donde soltarla, y ya está dicho que hoy no». Ese toque hoy no dice
por qué. Con el cartel dice qué es la carta, qué te da y cuándo la podrás usar, que es
exactamente lo que Miguel pidió, en el gesto que ya existía y en el hueco que ya estaba
vacío.

**Con ratón**, además, lo que Miguel dijo literalmente: `CartaDelMazoEnLaMano` ya tiene
`onPointerOver` y `onPointerOut` con `e.stopPropagation()`, y hoy sólo mueven su estado
local `encima`. Los dos avisan hacia fuera por una entrada nueva de `ManoDelMazo`,
`onSenalar(carta | null)`, que `<Delta>` sube al cliente. Un manejador nuevo, cero.

**Y una idea que parecía mejor y está medida y descartada:** deducir la carta señalada del
IMÁN, que `huecosDeLasCartas` ya calcula por carta y que ya es una función pura y
comprobable en Node. No funciona. Con el cursor exactamente sobre el centro de una carta, el
imán de la señalada es 1,000 y el de su vecina llega a **0,940** con la mano de ocho y a
**0,989** con catorce guardias, que es la mano peor posible (hay catorce guardias en
`BOLSA_DE_CARTAS`); y es igual en los cuatro lienzos medidos, porque el alcance del imán es
una fracción del alto. Una diferencia de once milésimas no distingue nada:
`ALCANCE_DEL_IMAN` está puesto para que un grupo entero se levante a la vez, y eso es lo
contrario de un detector. La medida está en `medir-el-iman.ts`.

**La precedencia, en una línea:** si hay carta cogida, el cartel es el suyo, aunque el cursor
pase por otra. Al revés, el cartel cambiaría bajo el dedo que está a punto de soltar el
naipe en la casilla.

**Y por qué el cartel nunca describe una carta distinta de la que se va a jugar:** porque el
aviso sale del MISMO rayo. Las cartas se solapan y se dibujan sin probar la profundidad, así
que la que el rayo alcanza no siempre es la que se ve delante; pero la que el rayo alcanza es
por definición la que `onCoger` cogería, porque los dos manejadores están en la misma malla.
El cartel y el toque no pueden discrepar.

## 5. Qué forma tiene, y dónde cabe

### 5.1. En tres dimensiones: una franja al pie del lienzo

El cartel es interfaz por encima del `<canvas>`, no un objeto de la escena (decisión 3).
En el escritorio cabe dentro de `RECUADRO_DEL_LIENZO`, que ya es el sitio: la regla
`.riberas-lienzo` de `estilo.css` es `position: relative` con `overflow: hidden`, y dentro
ya vive un hermano del lienzo (el botón de volver). En la app, dentro de la vista que
envuelve el `Canvas`, que es la misma que desde la fase 3 lleva `accessibilityActions`.

Va **pegado al canto de abajo, entre el canto derecho de la franja de las cartas y el canto
izquierdo de la mano de bienes, y por encima del asa de la barra**. Se mide contra la mano
de bienes QUIETA y sin áreas de trueque, y eso no es una comodidad: mientras hay cartel hay
un naipe cogido, y coger un naipe suelta el bien y cierra las áreas
(`alCogerCartaDelMazo` hace `ponerTomada(null)` y `ponerCogida(null)` antes de nada).

Medido por `medir-el-presupuesto-del-cartel.ts` en los quince lienzos de la lista `LIENZOS`
de `verify:escena`, llamando a `franjaDeLasCartas`, `huecosDeLasCartas`, `huecosDeLaBaraja` y
`huecosDeLaBarra` de verdad. El modelo, entero, para que cualquiera lo vuelva a correr y le
salga lo mismo:

- **La banda libre** va del canto que quede más adentro por la izquierda (el borde derecho
  de `franjaDeLasCartas` o el de la carta más saliente de la mano del mazo) al canto
  izquierdo de la mano de bienes **quieta** (catorce cartas, `apunta` a `null`), sin áreas
  de trueque. Es legítimo medirla quieta porque mientras hay cartel hay un naipe cogido, y
  coger un naipe suelta el bien y cierra las áreas.
- **Las letras por línea** son `(banda − 2·12) / (13,94 · 0,6)`, o sea **8,36 puntos por
  letra**: cuerpo de `.opcion-ayuda`, que es `0.82rem` sobre una raíz de `106.25%`, y
  **la raíz de esta casa vale 17 puntos, no 16**, así que el cuerpo es **13,94**; el 0,6 por
  letra de `tamanoDeTexto` (`app/src/arcade/retablo.tsx`, el único ancho de letra que la
  casa tiene escrito); y doce puntos de margen por lado.
- **El alto libre** va del pie de la cinta al techo del asa de la barra
  (`huecosDeLaBarra(4)`, `y + lado/2`) menos ocho puntos de aire. **Aquí estaba el arreglo
  de la segunda vuelta:** la cinta ya no es un cero silencioso, es una columna que se dice
  con su número.
- **La caja** es la mitad del alto libre, y **los renglones** son
  `(caja − 2·12) / ceil(13,94 · 1,35)`, o sea **de 19 en 19 puntos**. La segunda vuelta los
  contaba de 18 en 18, que es el mismo error del rem por el otro lado.
- **Las frases enteras** salen de envolver con avaricia las tres frases de cada uno de los
  ocho juegos del §2, al ancho de ESE lienzo, y quedarse con la peor tanda.

| Lienzo | Banda libre | Letras por línea | Techo del asa | **Cinta 44**: libre / caja / renglones / frases | **Cinta 88**: libre / caja / renglones / frases |
|---|---|---|---|---|---|
| 320×360 | 241 | **25** | 280 | 228 / 114 / 4 / **2** | 184 / 92 / 3 / **1** |
| 360×490 | 252 | 27 | 387 | 335 / 167 / 7 / 3 | 291 / 145 / 6 / 3 |
| 390×490 | 282 | 30 | 385 | 333 / 166 / 7 / 3 | 289 / 144 / 6 / 3 |
| 390×845 | 239 | **25** | 685 | 633 / 316 / 15 / 3 | 589 / 294 / 14 / 3 |
| 768×640 | 628 | 72 | 496 | 444 / 222 / 10 / 3 | 400 / 200 / 9 / 3 |
| 768×1024 | 544 | 62 | 808 | 756 / 378 / 18 / 3 | 712 / 356 / 17 / 3 |
| 1920×900 | 1.723 | 203 | 697 | 645 / 322 / 15 / 3 | 601 / 300 / 14 / 3 |
| 568×320 (SE apaisado) | 498 | 56 | 248 | 196 / 98 / 3 / 3 | 152 / 76 / 2 / **2** |
| 667×375 | 584 | 66 | 290 | 238 / 119 / 5 / 3 | 194 / 97 / 3 / 3 |
| 780×360 | 701 | 80 | 279 | 227 / 113 / 4 / 3 | 183 / 91 / 3 / 3 |
| 844×390 | 758 | 87 | 302 | 250 / 125 / 5 / 3 | 206 / 103 / 4 / 3 |
| 932×430 | 837 | 97 | 333 | 281 / 140 / 6 / 3 | 237 / 118 / 4 / 3 |
| 1024×768 | 856 | 99 | 595 | 543 / 271 / 13 / 3 | 499 / 249 / 11 / 3 |
| 1180×820 | 1.000 | 116 | 635 | 583 / 291 / 14 / 3 | 539 / 269 / 12 / 3 |
| 1920×1080 | 1.683 | 198 | 837 | 785 / 392 / 19 / 3 | 741 / 370 / 18 / 3 |

**Las dos columnas de geometría no se han tocado, y es a propósito.** «Banda libre» y «techo
del asa» salen de `franjaDeLasCartas`, `huecosDeLasCartas`, `huecosDeLaBaraja` y
`huecosDeLaBarra`, que no saben qué cuerpo tiene una letra; el rem malo sólo envenenaba las
columnas derivadas. Y el techo del asa es además el número con el que el otro documento y
éste se citan, así que conviene decir que aquí está clavado en los quince (§10.7).

**Con qué cinta está medida la tabla de la primera vuelta: con ninguna.** El guion nuevo
reproduce su columna de «alto libre» clavada (272 en 320×360, 240 en el SE apaisado, 379,
377, 677, 488, 800, 271, 294, 325, 587) poniendo la cinta a **cero**; con la de 44 salen 228
y 196. O sea que aquel «se le restan los 44 puntos de la cinta» era una frase, no una
medida. Y la columna de «caracteres que caben» de aquella tabla (95 en 320×360, 150 en el
SE) no la reproduce ningún modelo simple, así que aquí se retira entera y se sustituye por
lo único que el cartel necesita saber: **cuántas frases enteras caben**.

**Y con qué rem estaba medida la tabla de la segunda vuelta: con 16, que no es el de esta
casa.** Todo lo que salía de la letra bajaba un escalón: 27 letras por línea donde hay 25,
renglones de 18 donde son de 19, y por tanto un renglón de más en casi todos los lienzos
(veinte en 1920×1080 donde son diecinueve, dieciséis en 390×845 donde son quince, once en
768×640 donde son diez). Se dice el sentido del error, que es lo que importa: el rem malo
**sobrestimaba** el sitio, en las dos direcciones a la vez. Un cartel diseñado con esa tabla
se habría recortado solo en la pantalla, y en un teléfono, que es donde no se ve venir.

**Lo que hay que decidir, y sube al §11. El titular no se movió con el rem bueno, y ése es
el resultado que había que comprobar.** Con la cinta en una línea, el cartel enseña las tres
frases en catorce de los quince lienzos y dos en 320×360, que es lo que la primera vuelta ya
había decidido. Con la cinta en dos, y con el estiaje y el trueque empujando hacia ahí, en
**320×360 sólo cabe UNA frase** y en el SE apaisado dos. Ninguna otra pantalla pierde nada:
los otros trece siguen con las tres. Con el rem a 16 salía exactamente lo mismo, pero por
márgenes más anchos; con el de 17 los dos casos que deciden quedan más justos, y el de
320×360 con la cinta corta pasa a caber por los pelos: cuatro renglones para dos frases de
dos, sin uno de sobra. La conclusión aguanta, pero ya no le sobra nada.

La regla de pintado no cambia, y es la que hace que esto se degrade solo: **el cartel enseña,
en orden, las frases enteras que quepan en los renglones que haya AHORA**, y los renglones
los da el alto libre del momento, con la cinta que la cinta tenga. No se corta una frase por
la mitad ni se ponen puntos suspensivos: media frase de ayuda es peor que ninguna. Con dos
frases se leen «qué hace» y «qué consigues»; con una, «qué hace». Las que no se pintan se
oyen igual, y están en la lista de apoyo (§6).

Y una ruta que se probó y NO vale, con el número que la mata: **pegar el cartel a la derecha
de la mano de cartas, a la altura del naipe**, que es lo primero que se piensa. Medido en
`medir-el-cartel.ts`: el aire entre el canto derecho de la franja y lo primero de la mano de
bienes es de 138 puntos en 320×360, 112 en 360×490, 142 en 390×490 y **menos cuatro** en
390×845 (el móvil de pie con el lienzo entero), donde la columna de áreas de trueque nace ya
dentro de la franja. En los cuatro lienzos de pie no hay sitio; y son justo los cuatro donde
alguien abre Riberas por primera vez con el teléfono en la mano.

**Lo que el cartel no puede tapar, y no tapa:** la mano de cartas queda a su izquierda (los
ocho naipes de una mano llena ocupan de 32 a 159 puntos desde arriba en 320×360, y de 28 a
142 en el SE apaisado, o sea la mitad de arriba); la mano de bienes queda a su derecha; y la
barra queda debajo, con ocho puntos de aire hasta el asa. Y arriba se le resta la cinta del
tercio central que la fase 5 de la mesa va a poner (`docs/LA-MESA-DE-RIBERAS.md` §2.2), que
**no es de 44 sino de 44 o de 88**: la línea del aviso está siempre y la de los botones
aparece en cuanto hay uno tras `opcionesFueraDeLaMesa` (pasar, aceptar, rechazar, contestar,
empezar), o sea durante buena parte de cada turno. Un cartel medido con la cinta corta es un
cartel que se recorta solo el día que aparece un botón.

### 5.2. En el retablo: la mano que hoy no está, y la única pantalla de las mesas grandes

En el tablero plano no hay naipes que señalar (§0). Así que el cartel cuelga de un sitio
nuevo y pequeño en el marcador: **mi mano, por clases**, una fila por clase con cuántas
tengo, en el mismo orden en que la escena las agrupa (`manoDelMazoPorFamilias` y
`ORDEN_DE_LAS_FAMILIAS`), más los dos premios si son míos. Los datos ya están todos en la
vista (`misCartas`, `vado`, `guardia`); el texto se pide con `retratoDeLaCarta(clase)`, que
ya existe y ya recibe `string`; y el gesto es un botón, que es el gesto del retablo.

**Y esto no es la versión pobre de lo de arriba: en cinco y en seis es lo único que hay.**
`MANIFIESTO_RIBERAS.jugadores` llega a seis y `COLORES_EN_3D` tiene cuatro colores, así que
`bastanColores` manda al `Retablo` en cuanto se sientan cinco (§0). O sea que **todo lo
medido en el §5.1 (la banda, los renglones, las frases enteras, el pleito con el pregón) no
llega a una sola mesa de cinco o seis colonos**, y esta media página sí. Por eso es la fase
2 del §12, delante de las dos del cartel en el lienzo, y no la última.

**La medida del retablo, que aquí es corta y por eso hay que darla igual.** La fila es un
botón, o sea un renglón de 44 como todos los del retablo, con el nombre de la clase, la
cuenta y un galón de familia; y el texto se abre debajo del botón que se pulsa, no en un
sitio nuevo. Las once filas son once renglones y no compiten con ninguna banda: el marcador
del retablo ya se desplaza en vertical, que es la diferencia entera con el lienzo, donde el
sitio se acaba. Las tres frases se enseñan **siempre las tres**, sin presupuesto, porque
ahí caben; el número que las recorta (los renglones del §5.1) es del 3D y sólo del 3D. Es la
razón por la que la mesa de seis colonos, que es la que hoy no ve nada, acaba siendo la que
más explicación tiene.

La `ayuda` de las opciones **no se toca**. Es de la jugada, no de la carta, y las dos cosas
conviven: el botón dice «El Acaparamiento: pedir sal» con su ayuda «Todos los demás te dan
los que tengan de ése, y puede que no tengan ninguno», y la fila de la mano dice qué es El
Acaparamiento aunque hoy no se pueda jugar.

Y la contradicción que se ve desde aquí y **no es de este documento**, en una línea: el
§1.11 de `docs/LA-MESA-DE-RIBERAS.md` diseñó el cajón del marcador para SEIS fichas, y hoy
ese cajón no se puede ver con seis nunca, porque con seis se juega en el retablo. Que el 3D
aprenda a pintar seis colores es un encargo propio y sube a Miguel como tal (§11).

### 5.3. El pregón del trueque y el cartel: se miden juntos, y no caben

El pregón de `docs/EL-TRUEQUE-DE-RIBERAS.md` cuelga de la cinta hacia abajo, mide lo que la
cinta de ancho y enseña una tira de **44 puntos por propuesta viva**, hasta **cuatro** (su
§1.8 y su §3.1). El cartel cuelga del pie de la MISMA banda. No es una coincidencia que
haya que descartar: el cartel se pide con el puntero sobre un naipe, que no exige turno, y
el pregón existe justo cuando el turno es de otro. Los dos pueden estar en pantalla a la vez
y ninguno de los dos documentos medía al otro.

Medido por el mismo guion, con la cinta y las cuatro tiras puestas, contra el techo del asa
de la barra menos los ocho puntos de aire:

| Lienzo | Cinta | Pie del pregón | Techo del asa | Lo que queda para el cartel |
|---|---|---|---|---|
| 568×320 (SE apaisado) | 44 | 220 | 248 | **20** |
| 568×320 (SE apaisado) | 88 | 264 | 248 | **−24** |
| 320×360 | 44 | 220 | 280 | **52** |
| 320×360 | 88 | 264 | 280 | **8** |
| 780×360 | 88 | 264 | 279 | 7 |
| 844×390 | 88 | 264 | 302 | 30 |
| 667×375 | 88 | 264 | 290 | 18 |

Y ahora la cuenta hasta el final, con la regla de la caja del §5.1 (la caja es la mitad del
alto libre, y el primer renglón pide 24 puntos de margen más **19** de línea, o sea **43 de
caja y 86 de alto libre**): en las siete filas de arriba la caja sale, en ese orden, de 10,
un número negativo, 26, 4, 3, 15 y 9 puntos, así que **el cartel se queda en CERO renglones
en todas**. No es que salga apretado en las peores: es que no sale en ninguna de las que se
miden aquí, ni siquiera con la cinta corta. El renglón de 19 en vez de 18 sube el mínimo de
42 a 43 y de 84 a 86, y no cambia ni una de las siete filas, porque la más holgada de todas
se queda en 26 de los 43 que hacen falta: aquí no se pierde por poco. Y con 88 en el SE
apaisado el número es negativo por un motivo que no es del cartel: **las cuatro tiras del
pregón se meten 16 puntos por dentro del asa de la barra** (264 contra 248), que es un dato
del otro documento y la cita cruzada está en el §10.6.

**En un monitor sí cabrían los dos, y la regla es igual de exclusión.** Con la cinta a 88 y
el pregón puesto, en 1920×1080 quedan 565 puntos de alto libre, caja de 282, que dan **trece**
renglones (la segunda vuelta decía catorce, con el renglón de 18). La regla no reparte por
lienzo a propósito: un cartel que aparece en el monitor y no en el teléfono es una
explicación que se tiene cuando no hace falta, y además obliga a las dos pantallas a llevar
dentro la aritmética del §5.1 sólo para decidir si pintan algo. Una línea de condición
cuesta menos y se comprueba (§7.7).

Así que la regla, que es la decisión 9 y está escrita igual en los dos sitios:

- **Mientras el pregón está abierto, el cartel no se pinta.** No se encoge, no se aparta y
  no se reparte la banda: no se pinta. Es una línea de condición en las dos pantallas.
- **Y no se pierde nada,** porque desde la **hoja** de una propuesta, que es modal y ya
  tapa el pregón, se puede pedir igual: la hoja es del trueque, no del lienzo, y ahí el
  cartel de una carta de mi mano no compite con nada.
- **Lo que se oye no depende de esto.** La lista `.riberas-solo-apoyo` (§6) tiene las once
  filas con sus tres frases siempre, haya pregón o no. El que no puede señalar no pierde una
  explicación porque otro esté ofreciendo un trueque.

## 6. Lo que se oye

La frase que se oye de una carta hoy es la `ayuda` de su opción, y llega por dos puertas ya
escritas: `accessibilityHint={o.ayuda...}` en `LasOpciones` de `tablero-en-linea.tsx`, y
`aria-describedby` apuntando al `<span class="opcion-ayuda">` en `formulario.tsx`. Dentro del
lienzo no se oye nada de las cartas: el `<canvas>` tiene UN `accessibilityLabel` para toda la
escena.

Tres reglas, y la tercera es la que evita el fallo:

1. **El cartel es texto de verdad**, no un dibujo. Siendo `<p>` en el escritorio y `<Text>`
   en la app, ya se lee; con `aria-live="polite"` y `accessibilityLiveRegion="polite"` se
   anuncia al aparecer, que es el mismo trato que la fase 5 de la mesa le da a la frase del
   juego. No hace falta un elemento oculto paralelo.
2. **Quien no puede señalar necesita otra puerta**, porque no se puede pasar el cursor por un
   naipe de un lienzo. Es la puerta que ya inventó la fase 3 para tirar los dados: en el
   escritorio, una lista dentro de `RECUADRO_DEL_LIENZO` con la clase `.riberas-solo-apoyo`,
   que `estilo.css` saca de la vista con `clip-path: inset(50%)` y NUNCA con `display: none`,
   que los lectores saltan; en la app, filas `accessible` dentro de la vista del `Canvas`. Una
   fila por naipe de mi mano, con su nombre y sus tres frases.
3. **Y no se dice dos veces lo mismo.** Esta casa ya tropezó con eso: el comentario de
   `formulario.tsx` cuenta que el `title` «repetía la ayuda como descripción: dos lecturas de
   la misma frase por botón» y que por eso el `title` se fue entero. Así que ninguna de las
   veintiuna frases nuevas puede ser byte a byte igual a una `ayuda` de `opcionesDelMazo` o de
   `opcionesDeRevelar`. Eso es comprobable y se comprueba (§7).

## 7. Los comprobadores

Del uno al seis van en `verify:riberas-en-tres`, que hoy hace 295 comprobaciones con
`MINIMO = 293` (corrido otra vez en este árbol en la segunda vuelta, 6-sep-2026, con el
código de salida mirado y no la última línea: 0). Ese comprobador ya mete lo que sale de la
traducción en `huecosDeLasCartas` y en `puertasDeLaCarta` de la escena de verdad, así que es
el sitio. El siete y el ocho van donde vive cada pantalla. El nueve no lo escribe este
documento y por eso está el último: se apoya en una fase de otro.

1. **Las once filas están y ninguna está vacía.** Se recorre `CLASES_DE_CARTA` y se piden las
   dos filas de premio; para cada una, las tres frases existen y ninguna tiene longitud cero.
   El compilador ya exige las nueve filas por el `Record<ClaseDeCarta, ...>`; lo que el
   compilador no mira es que una frase esté en blanco.
2. **Ninguna sobra.** Las llaves de la tabla son exactamente `CLASES_DE_CARTA`, ni una más.
   Es la misma afirmación que el comprobador ya hace hoy sobre `RETRATO_DE_LA_CARTA`.
3. **Ninguna se repite donde no debe.** Las cuatro clases que se juegan tienen cuatro juegos
   de frases distintos entre sí y distintos de los dos premios. Los cinco títulos comparten
   el suyo, y eso se AFIRMA (los cinco iguales), no se tolera: si un día un título deja de
   compartirlo será porque alguien lo decidió, no porque se le escapó.
4. **El presupuesto se cumple, y se cuenta en RENGLONES.** Cada una de las veinticuatro
   frases, ya compuesta con sus constantes dentro, envuelta con avaricia a **25 letras por
   línea** cabe en **dos renglones**, y ninguna pasa de 46 caracteres. Las 25 letras no son
   un número escrito a mano en el comprobador: son las del lienzo más estrecho de `LIENZOS`,
   y van con su porqué al lado (§5.1) para que quien las toque sepa qué pantalla está
   gastando. Y con el porqué va la aritmética entera —banda de 241, doce de margen por lado,
   **8,36 puntos por letra sobre un rem de 17**—, porque el número que este comprobador
   tenía escrito antes era 27 y salía de dar por hecho que el rem valía 16. Un comprobador
   con el ancho equivocado es un comprobador verde que no vigila nada: dejaba pasar frases
   de tres renglones, y dejó pasar una. El tope viejo (145 caracteres las tres juntas) se
   retira, y con él la idea de contar caracteres: fue el que dejó pasar una frase de 52 que
   ocupaba tres renglones, y el que habría dejado pasar la de 51 de los títulos.
5. **No se dice dos veces lo mismo.** Se juega una mesa de verdad hasta tener las cuatro
   clases jugables ofrecidas, se recogen las `ayuda` de todas las opciones del mazo y de
   revelar, y ninguna coincide byte a byte con ninguna de las veintiuna frases.
6. **La vacuna de la guardia, que es la más importante de todas, y está atada a una fase
   concreta y no a una fecha.** El comprobador PREGUNTA al juego si hay una opción de guardia
   antes de tirar (mesa de verdad, carta comprada el turno anterior, turno propio, `tirado`
   en falso) y exige que el texto y la regla no discrepen: si el juego NO la ofrece, la frase
   «cómo se usa» de la guardia tiene que empezar por «Tras tirar»; si el juego SÍ la ofrece,
   tiene que NO decirlo. **La fase que le da la vuelta es la 3 de
   `docs/EL-LADRON-DE-RIBERAS.md`, «La guardia mueve»**, que es donde `jugarLaGuardia` pierde
   el `!estado.tirado` y `opcionesDelMazo` empieza a ofrecerla antes de tirar. O sea que esta
   comprobación se pone **roja el mismo día que esa fase se empuja**, y ponerla verde otra vez
   es cambiar una fila de tabla: eso, y no un recordatorio, es lo que hace que el cambio de
   texto no se olvide. Sin ella, el día que esa fase entre el cartel seguiría enseñando la
   regla vieja con toda la batería en verde, que es la clase de fallo que este repositorio ya
   tiene escrita como la peor.
7. **El cartel no come punteros, y no se pinta con el pregón abierto.** En
   `verify:escritorio`, que hace 400 comprobaciones: la regla del cartel en `estilo.css` lleva
   `pointer-events: none` y el elemento no tiene ni `onClick` ni `tabindex`. En la app, el
   equivalente sobre `pointerEvents="none"`. Y la decisión 9: que el cartel se monte con una
   condición que incluye «no hay pregón», leída por texto como se leen hoy las demás llaves de
   esas dos pantallas. Es la decisión 5 y la 9, y sin comprobador las dos se pierden en el
   primer retoque.
8. **El retablo explica las once clases, no menos.** En `verify:escritorio` y en
   `verify:sala`, que es donde vive cada pantalla: que el marcador monta una fila por
   clase de `misCartas` con `retratoDeLaCarta`, que las dos de premio salen cuando son
   mías, y que el texto que pinta es el de la tabla y no una copia. Es la fase 2, y es la
   única forma que llega a las mesas de cinco y seis (§5.2).
9. **El que este encargo NO puede dar por hecho, y la primera vuelta dio.** Aquí decía que
   `jugar:fondo` ya cubre esto por construcción. Es falso dos veces. `jugar:fondo` juega los
   juegos de la SALA declarados en el manifiesto (`juegosInstalados` de `shared/juegos`) y no
   toca ningún arcade, así que **no juega Riberas**. Y el único sitio que sí la juega entera
   es el paso «Una partida entera, con el árbitro, y reejecutada» de
   `server/scripts/verificar-riberas.ts`, y elige con una preferencia fija, `TIRAR` → `torre:`
   → `fundar:` → `vereda:` → `PASAR`, que **nunca compra una carta, nunca juega una y nunca
   revela un título**. O sea que hoy nada vigila que lo del mazo siga siendo jugable desde la
   lista de opciones. Lo que lo vigilará es el comprobador de la tanda de partidas eligiendo
   **uniformemente** de `opciones()` completa, que es la fase 5 de
   `docs/EL-LADRON-DE-RIBERAS.md` («Las mil partidas»), y este documento **no lo escribe: se
   apoya en él**. Se dice aquí y no en el §11 porque cambia lo que este encargo puede
   prometer: el cartel sigue sin añadir un movimiento ni una opción, que es verdad y es lo que
   lo convierte en ayuda y no en regla, pero «y por eso ya está cubierto» no lo era.

## 8. Dónde vive cada cosa

| Qué | Dónde | Qué se le hace |
|---|---|---|
| Las nueve clases y sus reglas | `shared/arcade/juegos/riberas.ts`: `ClaseDeCarta`, `CLASES_DE_CARTA`, `TITULOS`, `BOLSA_DE_CARTAS`, `jugarLaGuardia`, `jugarElAnoBueno`, `jugarElAcaparamiento`, `jugarLasDosVeredas`, `revelarUnTitulo`, `sePuedeJugarLaCarta` | Nada |
| Las siete constantes de los números de las frases | El mismo fichero: `BIENES_DEL_ANO_BUENO`, `VEREDAS_DE_LA_CARTA`, `VADO_MINIMO`, `GUARDIA_MINIMA`, `PUNTOS_DEL_VADO`, `PUNTOS_DE_LA_GUARDIA`, `PUNTOS_DEL_TITULO` | Se leen |
| La `ayuda` de cada opción | El mismo fichero: `opcionesDelMazo` y `opcionesDeRevelar` | Nada |
| **Las veintiuna frases** | `shared/arcade/juegos/riberas-en-tres.ts`: `RetratoDeLaCarta`, `RETRATO_DE_LA_CARTA`, `RETRATO_DEL_PREMIO` | Tres columnas nuevas |
| El naipe que llega a la escena | El mismo fichero: `CartaDelMazoEnTres`, `cartasEnTres`, `premiosEnTres`, `laManoDeLaIzquierda` | Un campo nuevo |
| El contrato del naipe en la escena | `escenas/cartas.ts`: `CartaDelMazo` | Un campo `readonly` |
| El reparto y el imán de la mano | `escenas/cartas.ts`: `huecosDeLasCartas`, `franjaDeLasCartas`, `puertasDeLaCarta`, `casillasDeLaMano` | Nada |
| El aviso de la carta señalada | `escenas/delta.tsx`: `CartaDelMazoEnLaMano` (sus `onPointerOver` y `onPointerOut`), `ManoDelMazo`, `Delta` | Una entrada nueva, `onSenalar` |
| El estado de la carta cogida | `escritorio/src/riberas-en-tres.tsx`: `cartaDelMazo`, `alCogerCartaDelMazo`. `app/src/arcade/riberas-en-tres-escena.tsx`: `cogidaDelMazo`, `alCogerCartaDelMazo`, `soltarTodo` | Se lee |
| El cartel | Dentro de `RECUADRO_DEL_LIENZO` en el escritorio, con su regla en `estilo.css` junto a `.riberas-lienzo` y `.riberas-solo-apoyo`. Dentro de la vista del `Canvas` en la app | Nuevo |
| La mano por clases del retablo | `escritorio/src/riberas-en-tres.tsx` (`MarcadorDeRiberas`) y `app/src/arcade/riberas-en-tres-escena.tsx` (`ElMarcador`, `FichaDelColono`) | Nuevo, **fase 2**: es la única forma que llega a las mesas de cinco y seis (§5.2) |
| La llave que apaga el cartel con el pregón abierto | Las dos mismas pantallas, junto al estado del pregón que trae `docs/EL-TRUEQUE-DE-RIBERAS.md` | Una condición, fases 3 y 4 (decisión 9) |

## 9. Cómo se midió

Seis guiones de solo lectura, corridos con `tsx` y con `node` sobre el código de `6372bc7`
el 6 de septiembre de 2026. Ninguno está en el repositorio: este documento no escribe
código. Si una fase quiere conservarlos, los del lienzo van a `escenas/` junto a
`medir-lienzos.ts` y `medir-cinta-central.ts`, y el del cable a `server/scripts/`.

| Guion | Qué contesta | Con qué código de verdad |
|---|---|---|
| `medir-el-peso-de-los-textos.ts` | Cuánto pesa una vista y cuánto costaría meterle los textos | `abrirMesa`, `jugar`, `opcionesDeRiberas`, `proyectarRiberas`; partida entera a ciegas de tres asientos, semilla 11 |
| `medir-las-letras.ts` | Cuánto costaría escribir el cartel dentro de la escena | `geometriaDeContornos` sobre `CONTORNOS_DE_LA_CIFRA`, `CONTORNOS_DE_LA_CARTA` y `CONTORNOS_DEL_BIEN`; `TOPE_DE_LA_MESA` y `TRIANGULOS_FIJOS_DE_LA_MESA` |
| `medir-el-cartel.ts` | Si cabe a la derecha de la mano de cartas | `franjaDeLasCartas`, `huecosDeLasCartas`, `huecosDeLaBaraja`, `areasDeTrueque`, `huecosDeLaBarra` en los quince lienzos |
| `medir-el-presupuesto-del-cartel.ts` (segunda vuelta) | Cuántos renglones y cuántas frases enteras caben al pie del lienzo **con la cinta a 44 y con la cinta a 88**, y qué queda cuando además cuelga el pregón del trueque | `franjaDeLasCartas`, `huecosDeLasCartas`, `huecosDeLaBaraja` y `huecosDeLaBarra` de verdad en los quince lienzos, con la mano de bienes quieta y sin áreas |
| `medir-el-iman.ts` | Si el imán distingue la carta señalada (no) | `huecosDeLasCartas` con la mano de ocho y con catorce guardias, en cuatro lienzos |
| `textos-con-tildes.mjs` | Lo que miden, lo que pesan y **cuántos renglones ocupan a 25 letras** las veinticuatro frases | `Buffer.byteLength` y un envolvedor avaricioso, sobre las frases del §2 |

Comprobadores corridos en este árbol el 6-sep-2026, con su código de salida mirado y no su
última línea: `verify:riberas-en-tres` 295 comprobaciones, salida 0 (vuelto a correr en la
segunda vuelta y sigue en 295); `verify:escena` 346 comprobaciones, salida 0. El segundo
número se mueve, y hay que decir cómo se sacó: se corrió con la fase 4 de la mesa ya a medio
escribir en el árbol (otro agente estaba tocando `escenas/delta.tsx`,
`escenas/scripts/verificar-escena.ts` y las dos pantallas), así que 346 no es la cuenta de
`6372bc7` limpio y quien lea esto tiene que volver a contarla antes de usarla como
referencia.

Los guiones de medida, en cambio, sí son de código limpio, y en la segunda vuelta se
comprobó fichero a fichero: de los que leen (`escenas/cartas.ts`, `escenas/baraja.ts`,
`escenas/barra.ts`, `escenas/iconos.ts`, `escenas/formas.ts`,
`escenas/presupuesto-del-delta.ts` y los dos de `shared/arcade/juegos/`) el único que la
fase 4 de la mesa ha tocado es `escenas/barra.ts`, y lo que le ha añadido son tres
constantes y una función nuevas (`ASA_DEL_HUECO`, `GIRO_DE_LA_VITRINA` y
`fondoDelAsaGirada`) sin cambiar una línea de `huecosDeLaBarra`, que es lo único que estas
medidas llaman. `escenas/cartas.ts` y `escenas/baraja.ts` no están tocados.

**Y la tercera vuelta, que no volvió a llamar a la escena y hay que decir por qué.** El
error del rem es de aritmética y no de geometría: las columnas que salen del código
(«banda libre» y «techo del asa» del §5.1, «pie del pregón» y «techo del asa» del §5.3) no
dependen del cuerpo de una letra, y por eso se conservan tal cual las midió
`medir-el-presupuesto-del-cartel.ts` en la segunda vuelta. Lo que se rehízo son las columnas
derivadas —letras por línea, renglones y frases enteras—, con un guion de aritmética pura
(`renglones-con-el-rem-bueno.mjs`) que toma esas dos columnas como entrada, aplica los
13,94 / 8,36 / 19 y vuelve a envolver las veinticuatro frases del §2 al ancho de cada
lienzo. **Ese guion tampoco está en el repositorio**, como los otros seis; el modelo entero
está escrito en las viñetas del §5.1 precisamente para que se pueda rehacer sin él, que es
la única garantía que este documento puede dar de un número. Quien conserve alguno, que
conserve éste: es el que ata las tablas a `estilo.css`, y el que se habría puesto rojo el
día que alguien escribió «sobre 16».

## 10. Lo que choca con lo ya escrito

Diez cosas. Las dos primeras son decisiones escritas que hay que reescribir; la tercera, la
cuarta y la quinta son comentarios que dejan de ser verdad; de la sexta a la octava son
cuentas cruzadas con `docs/EL-TRUEQUE-DE-RIBERAS.md` (la sexta y la octava, cerradas; la
séptima, con lo que hay que mirar cuando aquel documento acabe su corrección); y la novena y
la décima son de este mismo documento, en su primera y en su segunda vuelta.

1. **`docs/LA-MESA-DE-RIBERAS.md` §10, primera línea del «No entra»: «texto de ninguna clase
   dentro del lienzo».** Escrito así, prohíbe este encargo entero. Lo que aquella frase
   defiende sigue en pie y ahora tiene un número: dentro de la ESCENA no hay fuente, y
   escribir el cartel más largo con contornos compilados cuesta 8.520 triángulos contra un
   tope de 4.500 (§1, decisión 3). Lo que no defiende, y no puede defender, es que el cliente
   ponga letras encima del lienzo: el escritorio ya lo hace con el botón de volver dentro de
   `RECUADRO_DEL_LIENZO`, y la fase 5 de esa misma mesa va a poner ahí una cinta de 44 o de
   88 puntos con la frase del juego dentro. Reescribir: «ni una letra dentro de la escena», con el
   porqué medido al lado, y decir que la interfaz por encima del lienzo es otra cosa y tiene
   sus propias reglas (que no se toca lo que pinta la escena, y que no come punteros).

2. **`docs/LAS-CARTAS-DE-RIBERAS.md` §3, último párrafo, y §7, primera viñeta.** «Jugar una
   guardia antes de tirar los dados no está permitido en esta versión, a sabiendas. En el
   juego original sí se puede, y sirve para mover al ladrón antes de que te robe; sin
   ladrón, esa jugada no tiene sentido aquí». EL ESTIAJE que Miguel pidió le quita a ese
   párrafo su premisa entera, y a la viñeta «el siete no hace nada todavía» le quita el
   «todavía». Ese documento lo reescriben las fases de `docs/EL-LADRON-DE-RIBERAS.md`, no
   ésta; lo que ésta aporta es que la guardia tiene sus dos textos escritos (§2) y un
   comprobador atado a la fase 3 de aquél, que no deja que el texto y la regla se separen
   (§7, la vacuna). Y de paso: la pieza **no se llama «el ladrón» en pantalla**, se llama EL
   ESTIAJE (decisión 10 de aquel documento), y este documento escribía «Mueves al ladrón» en
   una frase de cartel. Corregido en el §2.

3. **`docs/LA-MESA-DE-RIBERAS.md` §0, última línea: «Ni `baraja.ts` ni `cartas.ts` cambian una
   línea en este encargo», y §10, «tocar las constantes de `cartas.ts`» dentro del "no
   entra".** Aquello es de aquel encargo, no de éste; pero conviene decirlo en voz alta para
   que nadie lea las dos frases como una veda general: aquí `escenas/cartas.ts` SÍ cambia, y
   cambia en un campo `readonly` de la interfaz `CartaDelMazo`. Ni una constante, ni una
   línea de reparto, ni nada que `franjaDeLasCartas`, `huecosDeLasCartas` o `casillasDeLaMano`
   calculen. Si alguien lo amplía a otra cosa, está en otro encargo.

4. **La cabecera de `RETRATO_DE_LA_CARTA`, en `riberas-en-tres.ts`: «Una fila por clase y ni
   una regla dentro» y «las tres columnas son de PRESENTACIÓN y ninguna es del juego».** Con
   las tres frases dentro, la tabla pasa a contener una PARÁFRASIS de reglas, que no es lo
   mismo que una regla pero tampoco es `familia` ni `dibujo`. La cabecera tiene que decirlo:
   que la regla sigue viviendo en `riberas.ts`, que aquí sólo se cuenta con palabras, que los
   números salen de las constantes de allí y no de los dedos de nadie, y que existe un
   comprobador (§7, la vacuna) cuyo trabajo es exactamente vigilar que la paráfrasis no se
   despegue de la regla.

5. **La cabecera de `PASO_DENTRO_DEL_GRUPO`, en `escenas/cartas.ts`.** Dice que contar cantos
   es cómo se sabe que se tienen tres guardias «sin un número escrito, que además aquí
   costaría una fuente dentro del lienzo». Esa frase NO choca: es la cita que mejor defiende
   la decisión 3, y la medida del §9 le pone el número que le faltaba. Se queda como está, y
   se apunta aquí para que nadie la lea al revés y crea que el cartel la contradice.

6. **La cita cruzada de esta banda con `docs/EL-TRUEQUE-DE-RIBERAS.md`: CERRADA, y los dos
   documentos dicen el mismo número.** La segunda vuelta dejó esto apuntado como pendiente
   contra «la columna “alto útil bajo ella” del §3.1» de aquel documento, que estaba medida
   como «el alto del lienzo menos la cinta» (276 en el SE apaisado, 316 en 320×360, o sea
   320−44 y 360−44) y por tanto contra el canto de abajo del lienzo y no contra lo que hay
   ahí, que es la barra de construir. **Esa columna ya no existe:** la segunda pasada de
   aquel documento la retiró y la rehízo en su §4.1, midiendo contra el techo del asa de la
   barra con `huecosDeLaBarra`, `ASA_DEL_HUECO` y `loQueSeVe`, que es el mismo sitio del que
   sale la columna «techo del asa» del §5.1 de aquí. Así que la pendencia se cierra y lo que
   queda es la afirmación, que es la que importa: **los dos documentos miden ya contra el
   techo del asa, y los dos dicen 264 contra 248 en el SE apaisado**, o sea que con la cinta
   a 88 el pie del pregón se mete **16 puntos por dentro del asa** y el asa deja de recibir
   el toque donde el pregón la tapa. Ése es el número que sostiene la decisión 9 en los dos
   sitios, y ya no hay dos maneras de sacarlo.

7. **Y dentro de esa misma cita, la columna que NO coincide, con los tres lienzos donde se
   separa.** La columna «banda libre sobre el asa» del §4.1 de aquel documento sale de restar
   ocho puntos de aire al techo del asa, y coincide con la columna «techo del asa» del §5.1
   de aquí en **doce de los quince lienzos**; en tres no: **844×390 (273 contra 294), 932×430
   (304 contra 325) y 1180×820 (607 contra 627)**, o sea 21, 21 y 20 puntos de diferencia. Los
   tres son exactamente los tres lienzos de la lista con **inset de abajo**, y la diferencia
   es ese inset: allí se resta dos veces, una en `huecosDeLaBarra`, que ya coloca el asa por
   encima de él, y otra en la columna. La columna de aquí no lo resta y **clava los quince**.
   Aquel documento lo está corrigiendo en su pasada; **cuando lo haga, las dos columnas
   tienen que decir el mismo número en los quince**, y quien empuje la fase 3 o la 4 lo mira
   antes de escribir la condición de la decisión 9, porque es la única llave que las dos
   pantallas comparten. Se apunta aquí con los tres nombres y las tres diferencias para que
   la comprobación sea de mirar y no de volver a medir. Y hay un testigo de más, que además
   es de este documento y de antes de la discusión: la lista de «alto libre con la cinta a
   cero» que la PRIMERA vuelta de aquí midió y que el §5.1 conserva citada trae **294 y
   325** en esos dos lienzos, que son justo el techo del asa menos los ocho de aire. O sea
   que la medida buena estaba escrita aquí desde la primera vuelta y el inset se coló
   después, en la otra columna y en el otro documento.

8. **EL NOMBRE DEL MUEBLE: lo que aquí se llamaba «el tablón» es EL PREGÓN, y el cambio es
   de aquel documento.** La segunda pasada de `docs/EL-TRUEQUE-DE-RIBERAS.md` lo renombró en
   su §1.10, y el motivo está escrito allí: **`tablon` ya significa otra cosa en esta casa**
   —`escenas/tablon.ts` es la mesa de madera hecha geometría—, y la función que aquel
   documento iba a llamar `opcionesFueraDelTablon` quedaba a UNA letra de la
   `opcionesFueraDelTablero` que ya existe. Con el nombre nuevo es `opcionesFueraDelPregon` y
   no se parece a nada. Este documento lo escribía «tablón» en veinticinco sitios, y los
   veinticinco están cambiados: el título del §5.3, la decisión 9, el §8, el §9, el §11 y
   los demás. **No es cosmético, y por eso está en esta sección y no en la cabecera:** los
   dos documentos afirmaban que la regla de la decisión 9 estaba «escrita igual en los dos
   sitios», y no lo estaba —nombraban dos muebles distintos, y uno de los dos nombres era el
   que la otra pasada había retirado justamente por confundible. Una regla de exclusión que
   vive en dos pantallas y en dos documentos se sostiene sobre que las dos digan la misma
   palabra; ahora la dicen.

9. **Este mismo documento, primera vuelta, §5.1 y §7.8.** Dos frases que había que retirar y
   se retiran: «Arriba se le restan los 44 puntos de la cinta», que era falsa contra su propia
   tabla (estaba medida sin cinta, §5.1), y «`jugar:fondo` ya juega los cuatro juegos enteros
   a ciegas… así que sigue verde por construcción», que era falsa dos veces (§7.9). Se apunta
   aquí, y no sólo se corrige en su sitio, porque las dos eran del tipo que da verde: una
   medida que promete un descuento que no aplica, y un comprobador que se da por hecho.

10. **Este mismo documento, segunda vuelta, §5.1: «0,82 rem sobre 16, o sea 13 puntos».** Es
    la tercera frase del tipo que da verde, y la más cara de las tres, porque no prometía nada:
    afirmaba un dato, y de ese dato colgaban las dos tablas de letra del documento entero.
    `estilo.css` pone la raíz en `106.25%` y su cabecera dice que son «los 17 px de siempre»;
    **el rem de esta casa vale 17**, el cuerpo de `.opcion-ayuda` es 13,94, el ancho por letra
    8,36 y el renglón 19. Lo que se movió, dicho entero: las letras por línea del lienzo más
    estrecho pasan de **27 a 25**; el renglón, de **18 a 19**; casi todos los lienzos pierden un
    renglón; el mínimo de caja del §5.3 sube de 42 a 43 y el de alto libre de 84 a 86; y en
    1920×1080 con el pregón puesto quedan trece renglones y no catorce. Lo que NO se movió: las
    dos columnas de geometría, porque el rem no las toca; las siete filas del §5.3, que siguen
    en cero renglones y ni de lejos; y **el titular del §11**, que sigue siendo una frase en
    320×360 con la cinta a 88 y dos en el SE apaisado. Lo que se rompió y hubo que arreglar:
    una frase del §2, la de «qué consigues» de los cinco títulos, que a 25 letras ocupaba tres
    renglones. Se apunta aquí con ese detalle porque es la moraleja de las tres: **este
    documento ha escrito mal, una por vuelta, las tres entradas del modelo del §5.1** —la
    cinta, el descuento y ahora el cuerpo de la letra—, y las tres veces la tabla salió
    creíble. La defensa no es mirar más: es que el modelo esté escrito entero al lado de la
    tabla, con cada constante citada por su fichero, que es como está ahora y como se pilló
    ésta.

## 11. Lo que le toca decidir a Miguel

| Qué | La recomendación, y por qué |
|---|---|
| ¿El cartel al pie del lienzo, o pegado al naipe? | **Al pie.** Pegado al naipe no cabe en los cuatro lienzos de pie, y en 390×845 el aire es de menos cuatro puntos (§5.1). Al pie cabe en los quince. Cuesta que el texto quede lejos de la carta: en el SE apaisado, unos 240 puntos de recorrido de ojo |
| **La que hay que contestar: con la cinta a 88, en 320×360 sólo cabe UNA frase.** ¿Se deja así? | **Sí, y no se toca nada más.** Los números, medidos con las dos cintas y con el rem de esta casa en 17 (§5.1): con la cinta en una línea salen 4 renglones y **dos** frases; con la de dos líneas, 3 renglones y **una**. En el SE apaisado se pasa de tres frases a dos. Los otros trece lienzos siguen con las tres con las dos cintas. Se deja así porque las alternativas son peores y están medidas: bajar el cuerpo mete una frase más pero cae por debajo del suelo de letra de la casa, que `retablo.tsx` sube a 13 puntos a propósito y que aquí ya vamos justos por arriba con 13,94; y quitarle el tope de la mitad del alto libre a la caja tapa media pantalla de tablero en el lienzo donde menos tablero hay. La frase que se ve es «qué hace», que es la que Miguel nombró primero; las otras se oyen igual y están en la lista de apoyo. Lo que NO se hace es recortar con puntos suspensivos: media frase de ayuda es peor que ninguna |
| **NUEVA, y es de aviso y no de decisión: esta respuesta ya no tiene margen.** | La segunda vuelta contestaba lo mismo pero con las cuentas de un rem de 16, que daba 5 renglones donde hay 4 y 27 letras por línea donde hay 25. La recomendación aguanta con los números buenos (§10.10), pero el caso de 320×360 con la cinta corta pasa a caber **exacto**: cuatro renglones para dos frases de dos, sin uno de sobra. Traducido: **cualquier cosa que le quite un renglón a esa banda deja ese teléfono en una sola frase con las dos cintas.** Lo dice aquí y no en el §5.1 porque es lo que hay que recordar cuando el estiaje pida un aviso más |
| ¿Y qué pasa cuando el pregón del trueque está abierto? | **El cartel no se pinta, y desde la hoja se puede pedir igual** (decisión 9). No es una preferencia: con las cuatro propuestas colgando de una cinta de 88, en el SE apaisado quedan **−24 puntos** de banda y en 320×360 **8**, y el cartel necesita **43** para existir (§5.3). El mueble se llama **el pregón** en los dos documentos desde la segunda pasada del otro (§10.8), y los dos miden contra el techo del asa y dan **264 contra 248** en el SE apaisado (§10.6) |
| ¿Los dos premios llevan cartel? | **Sí.** Son dos naipes de la misma mano que aparecen solos, que no se pueden jugar y que nadie ha explicado nunca. Son 2 de los 11 y cuestan 4 filas de tabla |
| ¿El retablo gana «mi mano» en el marcador? | **Sí, y en la fase 2, delante de las dos del cartel en el lienzo.** La primera vuelta lo puso el último y como opcional, y estaba mal: `COLORES_EN_3D` tiene **cuatro** colores y `MANIFIESTO_RIBERAS.jugadores` llega a seis, así que en una mesa de cinco o seis el retablo es la ÚNICA pantalla (§0, §5.2). Dejarlo para el final es decidir que las mesas grandes no reciben este encargo |
| **NUEVA, y no es de este documento:** que el 3D aprenda a pintar seis colores | **Es un encargo propio y va aparte.** Se apunta aquí porque desde este documento se ve la contradicción entera: el §1.11 de `docs/LA-MESA-DE-RIBERAS.md` diseñó el cajón del marcador para SEIS fichas, y hoy con seis se juega en el retablo, así que ese cajón de seis no se puede ver nunca |
| ¿La guardia con dos textos? | **Sí, y con el comprobador que los ata a la regla y a una fase concreta.** El texto de hoy entra en la fase 1; el otro entra con la **fase 3 de `docs/EL-LADRON-DE-RIBERAS.md`, «La guardia mueve»**, que es la que quita el `!estado.tirado` de `jugarLaGuardia`. Esa fase pone roja la vacuna del §7.6 el día que se empuje, y volverla verde es cambiar una fila de tabla. Hasta entonces el comprobador se pone rojo si alguien lo adelanta |
| Lo que hay que mirar con ojos, y no puede medir nadie | Si el cartel al pie estorba al construir en la fila de abajo del delta (no come punteros, pero tapa); si **13,94 puntos** se leen en un SE de verdad; y si el cartel apareciendo y desapareciendo con el cursor por la mano molesta. En el banco `escritorio/banco3d.html` y, para lo tercero, en un teléfono |

## 12. El orden, en fases que se empujan una a una

Cada fase deja el juego entero y verde. Ninguna depende de la siguiente, y las cuatro
primeras se pueden parar en cualquier punto sin dejar nada roto. Lo que sí tiene un orden
que no se puede elegir es el de los TRES encargos juntos, y son nueve fases: la tabla de
más abajo.

**Dónde va este encargo entre los tres, y de qué depende.** Este documento va **el segundo
de los tres**: **después de las fases 1 y 2 de `docs/EL-LADRON-DE-RIBERAS.md`** (la pieza con
su bloqueo y su robo, y el descarte) y **antes de `docs/EL-TRUEQUE-DE-RIBERAS.md`**. El
porqué es de lo que se ve jugando, y con los números de aquel documento: **148 sietes en doce
partidas a ciegas** que hoy no hacen absolutamente nada (su §0 y `medir3.ts`), o sea una
docena por partida, con la mano media en **11,03 fichas** justo al sacarlo. Los dos números
son **de la primera vuelta de aquel documento, y su guion no es reejecutable** (vivía en el
scratchpad de aquella sesión, que murió con ella); el 11,03 lleva además la etiqueta de tanda
que el §11.0 de aquel documento le impone a toda medida de mano, y se cita con ella o no se
cita. Mientras acumular no cueste nada, el trueque no hace falta. Y las cartas no tocan
ninguna regla, así que meterlas entre los otros dos no le mueve el suelo a nadie.

**EL ORDEN COMPLETO DE LOS TRES ENCARGOS SON NUEVE FASES, Y NO DOS.** Decir «este documento
va el segundo de los tres» no basta para empujar nada: los tres se entrelazan fase a fase, y
seguido al pie de la letra el orden que la segunda vuelta escribía llevaba a empujar el
trueque entero antes de que existiera la fase que lo vigila. Éste es el orden entero, con
las mías señaladas:

| # | Fase | De quién |
|---|---|---|
| 1 | La pieza, con su bloqueo y su robo | Estiaje, fase 1 |
| 2 | El descarte del siete | Estiaje, fase 2 |
| 3 | **El texto y su comprobador, sin nada en pantalla** | **Mía, fase 1** |
| 4 | **La mano por clases en el retablo** | **Mía, fase 2** |
| 5 | La guardia mueve, **junto con** mi fase 5 (la guardia con el estiaje) | Estiaje, fase 3 + **mía, fase 5** |
| 6 | Las mil partidas (el jugador ciego y uniforme) | Estiaje, fase 5 |
| 7 | El trueque entero | Trueque, sus fases |
| 8 | **El cartel en el escritorio** | **Mía, fase 3** |
| 9 | **El cartel en la app** | **Mía, fase 4** |

Y la fase 4 del estiaje (la que aquel documento deja suelta) **cabe donde quepa**, porque
nadie depende de ella; no está en la lista por eso y no por olvido.

**Léase la tabla y no la numeración de más abajo.** Mis cinco fases están numeradas 1 a 5
por lo que cuesta cada una y por lo que deja hecha, no por el orden en que se empujan: en el
calendario de verdad **mi fase 5 va antes que mi 3 y que mi 4**, porque la dispara la fase 3
del estiaje (§7.6) y ésa cae en el quinto sitio. Las mías siguen sin depender unas de otras
—cada una deja el juego entero y verde—, pero la 5 no espera a la 3 ni a la 4, y quien las
empuje en el orden en que están escritas se encontrará la vacuna de la guardia en rojo
desde el día que aterrice «La guardia mueve».

**De qué dependo yo, y quién depende de mí.** Lo primero, en concreto:

- De la fase 5 del estiaje, «Las mil partidas», que es donde nace el único comprobador que
  juega Riberas eligiendo uniformemente de `opciones()` (§7.9). Este documento no lo escribe
  y se apoya en él; hasta que exista, que lo del mazo sea jugable desde la lista no lo
  vigila nadie, y eso hay que decirlo aunque este encargo no añada ni un movimiento.
- De la fase 3 del estiaje, «La guardia mueve», que es la que dispara la fase 5 de aquí.
- Del pregón del trueque, sólo para la llave que lo apaga (decisión 9): mientras el pregón
  no exista, la condición se escribe igual y sale siempre verdadera. No es una espera. Pero
  **mis fases 3 y 4 van detrás del trueque entero** en la lista de arriba, y no por
  capricho: la llave es una condición sobre un estado que sólo el trueque crea, y escribirla
  contra un estado que todavía no existe es escribir una condición que ningún comprobador
  puede poner roja (§7.7).

Y quién depende de mí, que es más corto y hay que decirlo igual:

- **La fase 3 del estiaje depende de mi fase 1**, y no al revés como parecería. El día que
  «La guardia mueve» quite el `!estado.tirado` de `jugarLaGuardia`, la vacuna del §7.6 se
  pone roja; si mi fase 1 no está empujada, esa vacuna no existe y el cambio de regla entra
  con el texto viejo y toda la batería en verde. Por eso mi fase 1 va **antes** que la 3 del
  estiaje en la lista, aunque este encargo vaya «el segundo de los tres».
- **Nadie más depende de mí.** Las fases 2, 3 y 4 de aquí no las espera ningún otro
  documento: son pantalla, y ni añaden un movimiento ni tocan una regla.

1. **El texto y su comprobador. Sin nada en pantalla.** Las tres columnas en
   `RetratoDeLaCarta`, las veintiuna frases en `RETRATO_DE_LA_CARTA` y `RETRATO_DEL_PREMIO`
   compuestas con las siete constantes, el campo en `CartaDelMazoEnTres` y en `CartaDelMazo`,
   `cartasEnTres` y `premiosEnTres` rellenándolo, y las seis comprobaciones del §7 en
   `verify:riberas-en-tres` (la 6, la vacuna de la guardia, con el texto de HOY). Al acabar,
   el texto existe, viaja al naipe, está vigilado y no se ve. Es la fase que hace que las
   otras cuatro sean cortas.
2. **La mano por clases en el retablo.** La fila nueva del marcador en las dos pantallas, con
   `retratoDeLaCarta` y `manoDelMazoPorFamilias`, y los dos premios; y la comprobación del
   §7.8. **Va aquí, y no la última, y es la corrección de la primera vuelta:** con cinco o seis
   colonos el retablo es la única pantalla que existe (`COLORES_EN_3D` tiene cuatro colores,
   §0), así que ésta es la única fase de todo el documento que llega a esas mesas. Poniéndola
   detrás de las dos del lienzo, un empujón que se pare a medias deja sin explicación
   justamente a las partidas más grandes. Y es corta: los datos ya están en la vista y
   `retratoDeLaCarta` ya existe.
3. **El cartel en el escritorio.** La entrada `onSenalar` en `ManoDelMazo` y en `Delta`,
   cableada desde los `onPointerOver` y `onPointerOut` que ya existen; el estado en
   `riberas-en-tres.tsx`, que es el de la carta cogida (`cartaDelMazo`) con la señalada como
   respaldo y la precedencia del §4; el cartel dentro de `RECUADRO_DEL_LIENZO` con su regla
   en `estilo.css`, `pointer-events: none` y `aria-live="polite"`; la llave que lo apaga con
   el pregón abierto (decisión 9); y la lista `.riberas-solo-apoyo` con una fila por naipe.
   Las comprobaciones del §7.7 en `verify:escritorio`. Es la fase que contesta la frase que
   Miguel dijo, literal.
4. **El cartel en la app.** Lo mismo con `cogidaDelMazo`, dentro de la vista del `Canvas`,
   con `pointerEvents="none"` y `accessibilityLiveRegion="polite"`, y las filas `accessible`.
   Se prueba EN EL APARATO, porque el panel del navegador no pulsa igual que un dedo: coger un
   naipe apagado y leer el cartel, soltarlo con el segundo toque, y comprobar que un toque
   sobre el sitio del cartel construye en el delta que hay debajo. Y se mira con la cinta en
   dos líneas, que es cuando sólo cabe una frase (§5.1).
5. **La guardia con el estiaje: se empuja CON la fase 3 de
   `docs/EL-LADRON-DE-RIBERAS.md`, no después de «el día que aterrice».** Una fila de tabla y
   una comprobación que cambia de sentido. La fase 3 de aquel documento («La guardia mueve»)
   es la que quita el `!estado.tirado` de `jugarLaGuardia` y hace que `opcionesDelMazo` la
   ofrezca antes de tirar; en cuanto se empuje, la vacuna del §7.6 se pone **roja**, porque
   preguntará al juego y le contestará que sí mientras el texto sigue diciendo «Tras tirar».
   O sea que esta fase no espera a nadie: la dispara aquélla, y si no se hace, la batería no
   pasa. No se adelanta tampoco, por el mismo motivo y en el otro sentido.
