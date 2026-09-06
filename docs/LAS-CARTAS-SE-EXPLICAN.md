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
> **CUARTA PASADA, Y ES LA DEL ATERRIZAJE. LAS TRES PRIMERAS NO ESCRIBIERON UNA LÍNEA DE
> CÓDIGO; ÉSTA CUENTA EL QUE SE ESCRIBIÓ.** Las fases 1 y 2 están confirmadas en `85f28c6`
> —el texto con su comprobador, y el cartel en el escritorio—, con tres vueltas y tres
> revisores distintos encima. Esta pasada no diseña nada nuevo: pone el documento a decir
> lo que hay en el árbol, y trae de vuelta lo que salió al escribirlo. Tres cosas cambian
> de sitio:
>
>   · **El §2 deja de ser el sitio donde se decide el texto.** Seis de sus ocho filas
>     mentían en la columna de «cómo se usa» —las cuatro que se juegan y las dos que la
>     tercera vuelta ya había tocado—, porque los naipes cambiaron esa columna entera por
>     una sola frase compartida. Se copia una última vez, con las veintiuna frases leídas
>     del fichero, y se cierra en pasado: el porqué está en el §2.0.
>   · **Entra el §2 bis, «las cinco reglas que el juego no contaba», que es lo más valioso
>     que salió del encargo** y no estaba en ninguna parte. Al escribir las once
>     explicaciones, tres revisores encontraron cinco textos que prometían lo que Riberas
>     no cumple, y cada uno destapó una regla que hasta ese día sólo vivía en la cabeza de
>     quien la escribió. Son reglas del JUEGO y no de este encargo: el documento del ladrón
>     y el del trueque también tienen que conocerlas.
>   · **Y entra el §9 bis, «lo que se hizo distinto de lo escrito»**, con los siete sitios
>     donde el código no siguió a este documento y por qué —el peor lienzo de este cliente
>     entre ellos, que no es ninguno de los que aquí se midieron—. El §5.1 y el §5.3 se
>     quedan como tablas de DISEÑO, previas y fechadas; el número de hoy se lee en el
>     §9 bis y, antes que ahí, en `elCartelQueCabe` y en `verify:escritorio`.
>
> Los dos recuentos de esta pasada, corridos en este árbol el 6-sep-2026 sobre `85f28c6`
> limpio, con el código de salida mirado y no la última línea: **`verify:riberas-en-tres`
> 337 comprobaciones, salida 0**; **`verify:escritorio` 448 comprobaciones, salida 0**.

## 0. Qué había antes, y qué no sabía quien abría Riberas por primera vez

> **Este §0 describe `6372bc7`, o sea antes de las fases 1 y 2.** Se queda porque es el
> planteamiento del encargo y porque tres de sus cuatro agujeros siguen abiertos en alguna
> pantalla. Lo que cambió en `85f28c6`: en el escritorio, los once naipes llevan sus tres
> frases y hay cartel al pie del lienzo, así que el primer agujero y el tercero están
> cerrados **ahí**. En la app siguen los dos (fase 3), y **el cuarto —el retablo, que en las
> mesas de cinco y seis es la única pantalla— sigue entero** (fase 4).

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

    **Y es la única de las diez que no se cumplió.** El cartel del escritorio aterrizó
    primero, y con eso el retablo quedó detrás del trueque entero. No se retira la decisión
    —el argumento es el mismo y sigue siendo bueno—: se anota que una decisión escrita en un
    documento no empuja una fase, y que la única defensa que este encargo tiene contra que se
    olvide es que alguien la lea aquí (§11, primera fila; §12.0).

## 2. Los once naipes, con sus tres frases

### 2.0. Esta tabla se cierra aquí, y en pasado

**La decisión es de esta cuarta pasada y va delante, porque manda sobre lo que viene
debajo.** Lo que sigue es una FOTO de cómo quedaron las veintiuna frases en `85f28c6`,
leídas del fichero el 6-sep-2026. No es «las frases»: es «cómo quedaron ese día». La
diferencia no es de estilo, y el precio de no haberla hecho antes está contado:

- **Seis de las ocho filas que esta tabla tenía mentían al empezar la pasada.** Las cuatro
  que se juegan —La Guardia, El Año Bueno, El Acaparamiento y Las Dos Veredas— llevaban un
  «cómo se usa» que hoy no existe en ninguna parte: «Tras tirar, suéltala en JUGAR y di a
  quién», «… y di cuáles», «… y di cuál pides», «… y trázalas». Los cinco títulos mentían en
  las dos columnas de la derecha, y El Vado Largo en la de en medio. Las dos que se salvaban
  eran La Mayor Guardia y la guardia con el estiaje, que no ha aterrizado.
  Las cuatro colas se fueron **enteras** y las sustituye una sola frase compartida,
  `USAS_DE_LA_JUGADA`, y el porqué está en el §2 bis, regla (b): repetían lo que su propio
  «qué hace» ya decía, y a cambio ocupaban el sitio de dos puertas que el juego impone y que
  ningún texto contaba. Seis mentiras en una tabla de ocho filas, y ninguna se veía
  leyéndola: para verlas hay que abrir el fichero, que es exactamente el argumento.
- **El texto vive hoy en UN sitio y con la batería encima.** `RETRATO_DE_LA_CARTA`,
  `RETRATO_DEL_PREMIO` y `EXPLICACION_DEL_TITULO` en
  `shared/arcade/juegos/riberas-en-tres.ts`, con las siete constantes componiéndolo y con
  las vacunas de `verify:riberas-en-tres` preguntándole a una mesa de verdad si lo que la
  frase promete es lo que el reductor hace. Esta tabla no tiene ni una comprobación encima,
  y no la puede tener: un documento no se compila.
- **Así que una copia en presente es un sitio más donde desfasarse, y una copia fechada no
  lo es.** Un renglón que dice «hoy la guardia dice X» se pudre; uno que dice «en `85f28c6`
  la guardia decía X» es verdad para siempre. De aquí en adelante este documento **nombra**
  las tres constantes y no las copia; quien quiera el texto de hoy lo lee de ahí, que es
  además el único sitio donde puede estar seguro de que lo es.

Lo que el §2 sigue aportando, y por eso no se borra entero, es lo que la tabla no dice: **el
porqué de cada frase**, que está en los párrafos de más abajo y en las cabeceras del fichero,
y **la forma del presupuesto** (renglones y no caracteres), que es la decisión 6 y la que
tres vueltas seguidas se equivocaron en calcular.

### 2.1. Las veintiuna frases, como quedaron en `85f28c6`

Las tres columnas son las tres cosas que Miguel pidió, en su orden: **qué hace**, **qué
consigues**, **cómo se usa**. En el idioma de Riberas, sin jerga de reglas, sin nombrar un
tipo de movimiento y sin decir «desarrollo», «caballero» ni «monopolio».

Son **veintiuna frases distintas en siete juegos de tres** —las cuatro clases que se juegan,
uno para los cinco títulos y los dos premios—, repartidas en treinta y tres campos porque los
cinco títulos comparten los suyos. Y de esas veintiuna sólo hay **dieciocho cadenas
distintas**, porque las cuatro que se juegan comparten `USAS_DE_LA_JUGADA` palabra por
palabra: es una constante y no cuatro copias, por lo mismo que los cinco títulos comparten el
objeto entero. Cuatro copias de la misma regla son cuatro sitios donde corregir una errata y
tres donde olvidarla.

| Naipe | Qué hace | Qué consigues | Cómo se usa |
|---|---|---|---|
| **La Guardia** | Le quitas un bien al azar a quien elijas. | Ese bien, y una muesca para La Mayor Guardia. | Tras tirar, suelta una al turno; la nueva no. |
| **El Año Bueno** | Coges 2 bienes del arcón, iguales o no. | Dos bienes que no le quitas a nadie. | Tras tirar, suelta una al turno; la nueva no. |
| **El Acaparamiento** | Pides un bien y todos te dan los que tengan. | Todo ese bien de los demás, o nada. | Tras tirar, suelta una al turno; la nueva no. |
| **Las Dos Veredas** | Abres 2 veredas gratis; este turno o nada. | Dos pasos del Vado Largo, o sitio de choza. | Tras tirar, suelta una al turno; la nueva no. |
| **El Molino, La Cantera, El Torreón, El Faro, El Huerto** | No se juega: se tiene. Vale 1 punto. | Sin enseñarla no ganas: suéltala en su hueco. | En tu turno, y no gasta la jugada. |
| **El Vado Largo** (premio) | Lo tiene quien encadena más veredas, desde 5. | 2 puntos, hasta que te superen o te corten. | Nada: se gana trazando veredas y se va solo. |
| **La Mayor Guardia** (premio) | La tiene quien más guardias juega, desde 3. | 1 punto mientras nadie te supere. | Nada: se gana jugando guardias y se va sola. |

Y la de la guardia CON EL ESTIAJE, que es la fase que queda y **sustituye** a la de arriba,
no se suma: «Mueves el estiaje y robas a quien tenga allí» / «Un bien suyo, y muesca para La
Mayor Guardia» / y un «cómo se usa» que la vacuna decidirá, porque la fase que la dispara es
la que le quita el «Tras tirar» (§7.6 y §12).

Y lo que cada frase mide, con las tildes puestas y contado sobre las cadenas de `85f28c6`.
Las dos columnas de renglones son las dos que el cartel usa de verdad: **25 letras por línea**
es el peor lienzo de la lista compartida con el móvil (320×360) y **20** es el peor que este
cliente puede dar (288×420, §9 bis).

| Naipe | Hace | Consigues | Usas | Las tres seguidas | Bytes | Renglones a 25 | Renglones a 20 |
|---|---|---|---|---|---|---|---|
| La Guardia | 41 | 45 | 45 | 133 | 133 | 2+2+2 = 6 | 2+3+3 = 8 |
| El Año Bueno | 39 | 36 | 45 | 122 | 123 | 2+2+2 = 6 | 2+2+3 = 7 |
| El Acaparamiento | 44 | 35 | 45 | 126 | 127 | 2+2+2 = 6 | 3+2+3 = 8 |
| Las Dos Veredas | 42 | 43 | 45 | 132 | 132 | 2+2+2 = 6 | 3+3+3 = 9 |
| Los cinco títulos | 36 | 45 | 34 | 117 | 119 | 2+2+2 = 6 | 2+3+2 = 7 |
| El Vado Largo | 45 | 43 | 44 | 134 | 135 | 2+2+2 = 6 | 3+3+3 = 9 |
| La Mayor Guardia | 43 | 33 | 44 | 122 | 123 | 2+2+2 = 6 | 3+2+3 = 8 |

Las veintiuna ocupan **exactamente dos renglones** a 25 letras, y **ninguna pasa de 45
caracteres**. A 20 letras se van a dos o a tres, que es por lo que en el 288×420 del
escritorio caben DOS frases y no tres. Ésa es la forma del presupuesto (decisión 6): no
«cuántas letras», sino «cuántos renglones en el lienzo peor», porque el cartel se corta por
renglones y no por letras. La columna «las tres seguidas» cuenta los dos espacios que las
unen, y es la que se usó en el §3 para pesar el cable.

**Las tres vueltas de diseño reescribieron cuatro frases, y las cuatro veces por lo mismo:
un tope en caracteres no ve dónde cae el corte.** «Un bien al azar, y una muesca para La
Mayor Guardia» medía 52 y cabía de sobra en el tope viejo de 55, y ocupaba TRES renglones.
«Ese punto: sólo lo cuentas tú hasta que lo enseñes» medía 51, cabía en cualquier tope de
caracteres, y ocupaba TRES renglones a 25 letras —a 27, el ancho falso que salía del rem de
16, ocupaba dos, y por eso pasó una vuelta entera sin que nadie la viera—. Y «Mueves al
ladrón» nombraba una pieza que **no se llama así en pantalla**: la decisión 10 de
`docs/EL-LADRON-DE-RIBERAS.md` la llama EL ESTIAJE, y deja `ladron` fuera del vocabulario de
Riberas por lo mismo que `limo` no es `madera`. Las tres correcciones aguantan en `85f28c6`.

**Y al escribir el código, las once explicaciones se volvieron a tocar, y esta vez no por la
medida sino por la regla.** Las cinco frases que prometían lo que Riberas no cumple están en
el §2 bis, con lo que cada una destapó. Se dice aquí para que nadie lea la tabla del §2.1
como si fuera la del diseño con las erratas quitadas: **seis de sus siete filas dicen otra
cosa que la primera vuelta**, y ninguna de esas seis cambió por sitio ni por tildes. La
única que no se movió ni una letra es La Mayor Guardia, y tampoco fue por descuido: es la
regla (e), y hay una comprobación que exige que siga sin moverse.

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

**Y la CIFRA no era la mitad del problema: era la mitad barata.** Eso lo descubrió el
código, y está en el §9 bis. «Dos bienes», «Dos pasos», «Vale 1 punto» y «2 puntos» hablan
del mismo número sin escribirlo con cifra, y la palabra escrita a mano y la concordancia
escrita a mano son exactamente el mismo fallo que la cifra escrita a mano: el día que
alguien suba `VEREDAS_DE_LA_CARTA` a tres, «Abres 3 veredas» y «Dos pasos» se contradicen
dentro del mismo naipe y las dos se leen igual de bien. Así que la palabra sale de
`cardinal`, el plural de `plural` y la mayúscula de cabeza de `enCabeza`, las tres
exportadas al lado de la tabla.

**Lo que las frases NO dicen, y por qué.** No dicen lo que cuesta comprar una carta (eso lo
dice el rótulo y la ayuda de COMPRAR, que ya los escribe `opcionesDelMazo` con
`listar(COSTE_DE_LA_CARTA)`), no dicen cuántas hay de cada clase en el mazo (`BOLSA_DE_CARTAS`
es información que se cuenta jugando, y publicarla en un cartel cambia el juego) y no dicen
con cuántos puntos se gana (`PUNTOS_PARA_GANAR` es del juego, no de la carta).

## 2 bis. Las cinco reglas que el juego no contaba

**Esto es lo más valioso que salió del encargo, y no lo diseñó nadie: apareció al tener que
escribir once frases cortas y verdaderas.** Tres revisores, en tres vueltas sobre el código,
encontraron cinco textos que prometían lo que Riberas no cumple. Cada uno destapó una regla
que el juego SÍ tiene, que el reductor SÍ aplica, y que hasta ese día no estaba escrita en
ninguna pantalla ni en ningún documento: sólo en la cabeza de quien la escribió y en el
cuerpo de una función.

Y son reglas del JUEGO, no de este encargo. `docs/EL-LADRON-DE-RIBERAS.md` y
`docs/EL-TRUEQUE-DE-RIBERAS.md` tocan las cinco: la (b) manda sobre cuándo se puede jugar la
guardia que el estiaje mueve, la (c) sobre lo que una choza le hace al Vado, la (d) sobre lo
que un turno que se acaba se lleva por delante, y la (a) sobre qué significa ir ganando.
Ninguna de las cinco se puede tocar creyendo que se está tocando texto.

Las cinco están JUGADAS y no leídas: cada una tiene en `verify:riberas-en-tres` una mesa de
verdad que hace el movimiento y le pregunta al reductor, y sólo con esa respuesta en la mano
se le exige algo a la frase. La diferencia es la que separa comprobar la regla de comprobar
lo que uno mismo escribió.

### (a) Un título sin revelar NO puntúa para ganar

**Dónde está la regla.** `puntosDe` (`riberas.ts`) suma piezas, premios y títulos
**revelados**, y su cabecera lo dice en mayúsculas: «CON UN TÍTULO SIN REVELAR NO SE GANA».
Los ocultos los cuenta `puntosOcultosDe`, que entra en la vista sólo por `misPuntos` y no le
llega a nadie más. Y `puedeHaberGanado` cuenta `puntosDe`, nunca `puntosOcultosDe`.

**Qué prometía el texto.** «Ese punto: secreto tuyo hasta que la enseñes». De ahí un recién
llegado sale creyendo que guardar el título es gratis y que el punto ya cuenta, o sea peor
de lo que estaba: es el §1.6 del diseño contado por la mitad que no decide la partida.

**Qué se hizo.** El «qué consigues» de los cinco títulos pasa a «Sin enseñarla no ganas:
suéltala en su hueco». Lleva la regla Y el gesto, y eso no es adorno: es la frase que se
pinta en los dos lienzos estrechos, donde la tercera no se lee (§9 bis).

**Cómo se comprueba.** Se monta un colono con SIETE puntos en público y el octavo en un
título en la mano, se hace un movimiento que no da puntos (una vereda vale cero) y se exige
que la partida siga «jugando» y sin ganadores; luego se revela por el árbitro y se exige que
termine y que el ganador sea él. No se mira el `momento` del estado montado a mano, porque
`puedeHaberGanado` sólo corre al final de un movimiento: trazando, habla el juez.

### (b) Sólo se juega UNA carta por turno, y la comprada hoy no se juega hoy

**Dónde está la regla.** `sePuedeJugarLaCarta` (`riberas.ts`) son dos líneas y son dos
puertas: `if (estado.cartaJugada) return false;` y `return enMano.comprada <
estado.turnosAbiertos;`. `opcionesDelMazo` repite el mismo corte sobre la vista, y su
cabecera explica que ahí es donde muerden —el portillo para el movimiento antes de llegar al
reductor—.

**Qué prometía el texto.** «Tras tirar, suéltala en JUGAR y di a quién», y sus tres
hermanas. Eso nombra UNA de las tres condiciones como si fuera la condición entera. **Y la
ironía es la que lo hace grave: la carta que un recién llegado mira primero es justo la que
acaba de comprar**, o sea la única que el texto le explicaba cómo jugar y el juego no le
dejaba. Se dibuja apagada y muda, y el cartel le contaba cómo soltarla.

**Qué se hizo.** Las cuatro colas («di a quién», «di cuáles», «di cuál pides», «trázalas»)
repetían lo que su propio «qué hace» ya decía, así que se van y dejan sitio a las dos puertas
que faltaban. Queda **una sola frase compartida por las cuatro**, `USAS_DE_LA_JUGADA`: «Tras
tirar, suelta una al turno; la nueva no.» Cuarenta y cinco caracteres, dos renglones. Y el
gesto se dice sin nombrar mando ninguno, por lo que cuenta el §9 bis.

**Cómo se comprueba.** Las tres puertas, con tres mesas: la misma carta comprada ayer se
ofrece y comprada hoy no; con `cartaJugada` puesto la segunda no se ofrece; y antes de tirar
tampoco. Y entonces se exige que la frase diga cada una **si y sólo si** el juego la impone.

### (c) El Vado Largo queda VACANTE también si te cortan la cadena

**Dónde está la regla.** La cabecera de `recalcularElVado` la tiene escrita en mayúsculas:
«Si el dueño baja del mínimo —porque alguien le partió la cadena con una choza— el premio
queda VACANTE y se reparte de nuevo». Y el código la cumple: `sigueSiendoSuyo` exige
`largoActual >= VADO_MINIMO`, y `largoDelVado` cuenta con los vértices bloqueados por las
piezas ajenas.

**Qué prometía el texto.** «2 puntos mientras nadie te supere», que es MEDIA regla. Se te va
el premio, y con él dos puntos, por una choza ajena que ni siquiera es una vereda, y quien
leía el naipe no tenía manera de enterarse.

**Qué se hizo.** «2 puntos, hasta que te superen o te corten.»

**Cómo se comprueba.** No se lee la cabecera: se juega. Se monta al dueño con su cadena de
cinco, se le parte por el vértice de en medio con una choza de otro, se hace un movimiento
para que hable el reductor, y se exige que el Vado quede vacante sin que nadie le haya
superado. Con eso contestado, se le exige a la frase que nombre las dos maneras.

### (d) El crédito de Las Dos Veredas caduca al acabar el turno, y es invisible

**Dónde está la regla, y quién la reconoce.** `jugarLasDosVeredas` no pone ni una vereda:
deja `veredasGratis` en dos y las veredas se alzan después, una a una. El crédito muere por
dos caminos escritos: `trazar` lo apaga si la primera se comió el último hueco, y
`siguienteTurno` lo pone a cero al acabar el turno. **El propio comentario de
`siguienteTurno` admite que es invisible**: «quien juega Las Dos Veredas y luego pasa sin
poner la segunda la pierde, porque la alternativa convierte una carta en un crédito que hay
que recordar, y nadie que mire el tablero sabría que existe».

**Y hay un matiz que sólo se ve preguntando, y que hace la regla peor de lo que su comentario
dice.** Pasar A PROPÓSITO no se puede: con crédito vivo, `opcionesDeRiberas` se va por su
`if (v.veredasGratis > 0)` con las veredas y revelar y nada más, así que PASAR ni se ofrece.
Lo que sí acaba el turno es EL PLAZO, y ahí la segunda se va sin que nadie haya tocado nada.
O sea que el «nadie sabría que existe» es todavía más cierto de lo que su comentario dice.

**Qué prometía el texto.** «Abres 2 veredas sin pagarlas». El naipe promete dos y el juego
puede dar una, en silencio. En la pantalla no hay contador: lo que hay es la `ayuda` de la
opción de alzar, que sólo aparece cuando YA hay crédito.

**Qué se hizo.** «Abres 2 veredas gratis; este turno o nada.» El plazo se dice en los dos
sitios que se leen ANTES de que sea tarde: el naipe, al cogerlo, y la `ayuda` de la opción
que gasta la carta, que es el último texto antes de quedarse con el crédito en la mano.

**Cómo se comprueba.** Se juega entero: se juega la carta y se exige que el tablero quede
como estaba con el crédito en dos; se pone UNA y queda una; se pregunta a las opciones y no
hay PASAR; se avanza el reloj hasta que vence el plazo y se exige que el crédito haya muerto
con el turno.

### (e) La Mayor Guardia NO se puede perder por bajar, y su texto cuenta una sola manera a propósito

**Dónde está la regla.** `recalcularLaGuardia` es línea a línea la misma función que
`recalcularElVado` con otra cuenta dentro, y tiene el mismo `sigueSiendoSuya`. Pero la rama
del vacante **no se puede dar**: lo que cuenta es `c.guardias`, que sólo sube —`jugarLaGuardia`
la incrementa y nada la baja—, así que una vez alcanzado el mínimo no se baja de él.

**Por qué esto es un hallazgo y no una ausencia.** Es la única de las cinco donde el texto se
queda como estaba, y hacía falta saber por qué. Con la (c) recién descubierta, lo natural es
copiarle el arreglo al premio hermano: «hasta que te superen o te corten» en los dos. Sería
mentir del otro lado. Que las dos frases digan cosas distintas es la verdad de cada premio, y
sin este párrafo el siguiente que las lea las «arregla».

**Cómo se comprueba.** En la MISMA mesa de la (c): con la choza que le parte la cadena al
dueño se exige a la vez que el Vado quede vacante **y que La Mayor Guardia siga siendo suya**;
y luego se le exige a la frase del Vado que nombre el corte y a la de La Mayor Guardia que
**no** lo nombre. El día que una de las dos reglas cambie, se pone roja la frase que dejó de
ser verdad y no la otra.

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

> **ESTA SECCIÓN ES DE DISEÑO, Y ES PREVIA AL CÓDIGO. Se conserva fechada y no se actualiza.**
> Todo lo de aquí abajo se midió antes de escribir `elCartelQueCabe`, sobre `6372bc7` y con
> guiones que no están en el repositorio. Lo que aterrizó mide lo mismo pero con la escena
> dentro del cliente y con dos entradas que este documento no tenía: **la lista son
> dieciséis lienzos y no quince**, porque el peor que este cliente puede dar es **288×420** y
> aquí no estaba (§9 bis, punto 6); y **la raíz de la letra se le pide al navegador** en vez
> de valer 17 (§9 bis, punto 5). Ni la cinta del tercio central ni el pregón existen todavía
> en el árbol, así que las dos columnas de cinta de la tabla siguen siendo lo que eran: un
> presupuesto para cuando bajen. El número de hoy vive en `elCartelQueCabe` y lo mide
> `verify:escritorio` contra las tres manos de la escena en cada uno de los dieciséis.

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
llega a una sola mesa de cinco o seis colonos**, y esta media página sí. Por eso este
documento la puso de fase 2, delante de las dos del cartel en el lienzo.

**Y no salió así: es la fase 4 y está sin escribir.** El cartel del escritorio se empujó
antes, y con eso esta media página quedó detrás del trueque entero, que es justo el sitio del
que este párrafo la había sacado. El argumento no ha cambiado ni un número —`COLORES_EN_3D`
sigue teniendo cuatro colores—, así que lo que hay que leer aquí es lo que hoy es verdad:
**una mesa de seis colonos no ve ninguna explicación de ninguna carta**, y el texto que le
serviría está escrito, compuesto y vigilado desde `85f28c6`.

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

> **También de diseño y previa, y de las tres tablas es la que más aguanta**, porque su
> conclusión no se pierde por poco: la más holgada de sus siete filas se queda en 26 de los
> 43 puntos de caja que hacen falta. Los números están hoy en la cabecera de
> `elCartelQueCabe`, para quien escriba la llave; la llave no está escrita, y el §9 bis punto
> 8 dice por qué.

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

Del uno al seis van en `verify:riberas-en-tres`, que hace **337** comprobaciones sobre
`85f28c6` (corrido en este árbol el 6-sep-2026, con el código de salida mirado y no la última
línea: 0). Ese comprobador ya mete lo que sale de la traducción en `huecosDeLasCartas` y en
`puertasDeLaCarta` de la escena de verdad, así que es el sitio. El siete y el ocho van donde
vive cada pantalla: `verify:escritorio` hace **448**, salida 0. El nueve no lo escribe este
documento y por eso está el último: se apoya en una fase de otro.

**Y las seis de aquí abajo se quedaron cortas, que es lo que hay que decir de una lista de
comprobaciones escrita antes del código.** Lo que aterrizó son éstas más las cinco vacunas
del §2 bis, que no son de texto: montan una mesa, hacen un movimiento y le preguntan al
reductor. La lista sigue aquí porque es la que explica POR QUÉ hay comprobador en cada sitio;
la cuenta de lo que hay está arriba.

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
4. **El presupuesto se cumple, y se cuenta en RENGLONES.** Cada una de las veintiuna
   frases, ya compuesta con sus constantes dentro, envuelta con avaricia a **25 letras por
   línea** cabe en **dos renglones**. Las 25 letras no son
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
   `verify:escritorio` (**448** con la fase 2 dentro; 400 cuando esto se escribió, aunque
   entre medias hay otro encargo que también le añadió y la resta no vale, §9): la regla del
   cartel en `estilo.css` lleva `pointer-events: none` y el elemento no
   tiene ni `onClick` ni `tabindex`. En la app, el equivalente sobre `pointerEvents="none"`.
   Y la decisión 9: que el cartel se monte con una condición que incluye «no hay pregón».
   **De esas dos mitades, la primera está y la segunda NO, a propósito**: la llave del pregón
   no se escribe hasta que el pregón exista, porque una condición sobre un estado que nadie
   crea no la puede poner roja ningún comprobador (§9 bis, punto 8). Lo que sí compró la fase
   2, y este documento no había pedido, es que la aritmética medida llegue al estilo pintado:
   `elEstiloDelCartel` se LLAMA con cuatro números distintos y se mira en cuál acabó cada uno
   (§9 bis, punto 4).
8. **El retablo explica las once clases, no menos.** En `verify:escritorio` y en
   `verify:sala`, que es donde vive cada pantalla: que el marcador monta una fila por
   clase de `misCartas` con `retratoDeLaCarta`, que las dos de premio salen cuando son
   mías, y que el texto que pinta es el de la tabla y no una copia. **Es la fase 4 y sigue
   sin escribirse**, aunque este documento la había puesto de segunda; es la única forma que
   llega a las mesas de cinco y seis (§5.2, §12.0).
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
| **Las veintiuna frases** | `shared/arcade/juegos/riberas-en-tres.ts`: `ExplicacionDeLaCarta`, `EXPLICACION_DEL_TITULO`, `USAS_DE_LA_JUGADA`, `RETRATO_DE_LA_CARTA`, `RETRATO_DEL_PREMIO`, y `cardinal`, `plural` y `enCabeza` | **HECHO** (fase 1) |
| El naipe que llega a la escena | El mismo fichero: `CartaDelMazoEnTres`, `cartasEnTres`, `premiosEnTres`, `laManoDeLaIzquierda` | **HECHO**: un campo nuevo |
| El contrato del naipe en la escena | `escenas/cartas.ts`: `CartaDelMazo` | **HECHO**: un campo `readonly` |
| El reparto y el imán de la mano | `escenas/cartas.ts`: `huecosDeLasCartas`, `franjaDeLasCartas`, `puertasDeLaCarta`, `casillasDeLaMano` | Nada |
| El aviso de la carta señalada | `escenas/delta.tsx`: `CartaDelMazoEnLaMano` (sus `onPointerOver` y `onPointerOut`), `ManoDelMazo`, `Delta` | **HECHO**: una entrada nueva, `onSenalar` |
| El estado de la carta cogida | `escritorio/src/riberas-en-tres.tsx`: `cartaDelMazo`, `alCogerCartaDelMazo`. `app/src/arcade/riberas-en-tres-escena.tsx`: `cogidaDelMazo`, `alCogerCartaDelMazo`, `soltarTodo` | **HECHO** en el escritorio; se lee en la app en la fase 3 |
| **El sitio del cartel y su estilo** | `escritorio/src/riberas-en-tres.tsx`: `elCartelQueCabe`, `elEstiloDelCartel`, `raizDelNavegador`, `RAIZ_DE_LA_CASA` | **HECHO** (fase 2), y las dos primeras son puras y exportadas para que la fase 3 no las vuelva a escribir |
| El cartel | Dentro de `RECUADRO_DEL_LIENZO` en el escritorio, con su regla `.riberas-cartel` en `estilo.css` junto a `.riberas-lienzo` y `.riberas-solo-apoyo`. Dentro de la vista del `Canvas` en la app | **HECHO** en el escritorio; **fase 3** en la app |
| La mano por clases del retablo | `escritorio/src/riberas-en-tres.tsx` (`MarcadorDeRiberas`) y `app/src/arcade/riberas-en-tres-escena.tsx` (`ElMarcador`, `FichaDelColono`) | Nuevo, **fase 4**: es la única forma que llega a las mesas de cinco y seis (§5.2) |
| La llave que apaga el cartel con el pregón abierto | Las dos mismas pantallas, junto al estado del pregón que trae `docs/EL-TRUEQUE-DE-RIBERAS.md` | Una condición, **detrás del trueque**, y a propósito no escrita todavía (§9 bis, punto 8) |
| La puerta que explique los premios a quien NO los tiene | Por decidir; el candidato es el marcador, donde vive `renglonDelVado` | Fase futura sin forma (§12.1) |

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
última línea. **Antes del encargo, sobre `6372bc7`:** `verify:riberas-en-tres` 295
comprobaciones, salida 0 (vuelto a correr en la segunda vuelta y sigue en 295);
`verify:escena` 346 comprobaciones, salida 0. Del segundo hay que decir cómo se sacó: se
corrió con la fase 4 de la mesa ya a medio escribir en el árbol (otro agente estaba tocando
`escenas/delta.tsx`, `escenas/scripts/verificar-escena.ts` y las dos pantallas), así que 346
no es la cuenta de `6372bc7` limpio y quien lea esto tiene que volver a contarla antes de
usarla como referencia.

**Y después, sobre `85f28c6` limpio y con las fases 1 y 2 dentro:**
`verify:riberas-en-tres` **337**, salida 0; `verify:escritorio` **448**, salida 0. Los dos se
corrieron en un árbol sin nada a medio escribir —`git status` vacío, y las dos salidas están
fechadas nueve minutos antes de que el primer fichero de la fase 1 del estiaje se tocara en
este árbol—, así que estos dos sí se pueden usar como referencia. **Quien los vuelva a correr
más tarde, que mire antes su `git status`:** en cuanto la fase 1 del estiaje entre aquí,
`shared/arcade/juegos/riberas.ts` deja de ser el de `85f28c6` y las dos cuentas dejan de ser
comparables con éstas. Es el mismo cuidado que el §9 se tuvo que tener con `verify:escena` en
la primera vuelta, y por el mismo motivo.

**Y la resta no se hace, a propósito.** Entre `6372bc7` y `85f28c6` hay otro commit que toca
los mismos dos comprobadores (la fase 4 de la mesa), así que 337 − 295 no son «las
comprobaciones que trajo este encargo» y decirlo sería inventarse un número. Lo que sí se
puede decir sin restar nada es de qué son las que trajo: las cinco vacunas del §2 bis, la red
de las constantes del §9 bis, y el cartel medido contra las tres manos de la escena en los
dieciséis lienzos.

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

## 9 bis. Lo que se hizo distinto de lo escrito, y por qué

Ocho sitios donde el código de `85f28c6` no siguió a este documento. Todos están leídos del
árbol y no de aquí. **Gana el código**, así que lo que sigue no es una lista de desviaciones
a corregir: es el documento poniéndose al día.

**1. El texto viaja dentro del naipe, y las tres frases son tres campos y no un párrafo.**
Esto sí era el diseño (decisiones 1 y 2), y lo que cambió es que el campo tiene tipo propio:
`ExplicacionDeLaCarta`, con `hace`, `consigues` y `usas`, exportada al lado de
`RetratoDeLaCarta`. **Y el orden de los campos ES el orden en que se enseñan**, que es lo que
lo hace tres campos: con un párrafo, la única forma de recortar en el lienzo estrecho sería
cortarlo por la mitad, y media frase de ayuda es peor que ninguna. El texto de los cinco
títulos vive además en una constante suya, `EXPLICACION_DEL_TITULO`, y los cinco comparten el
MISMO objeto: cinco copias iguales son cinco sitios donde corregir una errata y uno donde
olvidarla, en la carta que menos sale.

**2. Las cifras no bastaban: la palabra y el plural también salen de la constante.** El
documento escribió que los números entran por plantilla, y eso sólo cubría el DÍGITO. «Dos
bienes», «Dos pasos», «Vale 1 punto» y «2 puntos» hablan del mismo número con letras, y una
palabra escrita a mano miente igual que una cifra escrita a mano: con `VEREDAS_DE_LA_CARTA`
a tres, «Abres 3 veredas» y «Dos pasos» se pelean dentro del mismo naipe y las dos se leen
perfectamente. Así que se añadieron tres funciones puras y exportadas —`cardinal` (el número
con letras), `plural` (la concordancia) y `enCabeza` (la mayúscula de apertura)— y las frases
se componen con ellas. No hay comprobador que pille una mentira escrita en castellano; esto
la convierte en un rojo.

**3. Y la red que vigila esas tres funciones se clava contra palabras escritas A MANO en el
comprobador. Es un hallazgo de método y merece su párrafo.** La comprobación natural es
componer la expectativa con `cardinal` y `plural`, o sea con las mismas dos funciones con las
que se compone el texto que va a juzgar. **Escrita así no mira nada:** las dos orillas de la
afirmación salen del mismo sitio, y el día que `cardinal(2)` devolviera otra palabra, el
naipe cambiaría, la expectativa cambiaría con él y la comprobación seguiría verde. Una
comprobación cuyas dos mitades comparten fuente es una comprobación que se compone consigo
misma. Así que en `verify:riberas-en-tres` hay una tabla clavada a mano —`[0, 'cero']`,
`[1, 'un']`, `[2, 'dos']`, y hasta cinco— y una sola vez; con ese clavo puesto, todo lo que
cuelga de ella sí compra algo, y tocar `CARDINALES` o `plural` pone rojo ese renglón antes de
que nadie mire una frase. La misma idea, girada, está en la tabla de qué constantes puede
nombrar cada naipe: se mantiene a mano porque qué regla nombra cada naipe es una decisión y
no se deduce de nada, y se afirma además que está completa, para que un naipe nuevo sin fila
se ponga rojo en vez de heredar el permiso de otro.

**4. El estilo del cartel sale de una función pura que el comprobador LLAMA, y no de una
expresión regular sobre el JSX.** El documento midió `izquierda`, `derecha`, `abajo` y `caja`
con muchísimo cuidado y no ató ninguna de las cuatro a la propiedad que el navegador recibe.
Intercambiadas, la batería seguía entera en verde con el cartel puesto encima de la mano que
estaba explicando: la aritmética medida y el estilo pintado eran dos cosas que no se
encontraban en ninguna comprobación. La traducción vive ahora en `elEstiloDelCartel`, pura y
exportada, y el comprobador la llama con cuatro números distintos entre sí para mirar en cuál
acabó cada uno. Dos cambiados de sitio se ven ahí y no en la pantalla de alguien. Y con
`null` devuelve `undefined` y no un objeto vacío, para que el `<p>` no lleve un `style` que
no dice nada.

**5. La raíz de la letra se le pide al navegador, y el 17 se queda de suelo.** La tercera
vuelta arregló el rem —vale 17 y no 16— y clavó el 17. Está mal por el otro lado: `106.25 %`
va en porcentaje **justamente** para que la preferencia de tamaño de letra del navegador siga
mandando, así que quien la tenga en grande pinta con bastante más de 13,94 puntos de cuerpo
mientras el alto máximo se calculaba con un 17 escrito a mano. Con el `overflow: hidden` del
cartel, eso corta el último renglón SIN NINGUNA SEÑAL, que es lo único que la función promete
no hacer nunca. Ahora `raizDelNavegador` la mide con `getComputedStyle` sobre la raíz del
documento y la observa, `elCartelQueCabe` la recibe por parámetro, y `RAIZ_DE_LA_CASA = 17`
es sólo el respaldo para Node, donde no hay `document`. El comprobador no pregunta «¿dice
17?»: saca el porcentaje de `estilo.css` y exige que dé lo mismo.

**6. El peor lienzo de ESTE cliente es 288×420, y no está en la lista que este documento
midió.** El §5.1 midió quince lienzos, y esa lista se comparte con el móvil: por eso la abre
320×360, y por eso los dos casos «que deciden» eran ése y el SE apaisado. **En el escritorio
ninguno de los dos se puede dar.** `.riberas-lienzo` lleva `min-height: 420px`, así que los
**cinco** lienzos de la lista con menos de 420 de alto —320×360, 568×320, 667×375, 780×360 y
844×390— no existen aquí, y se medían de todas formas mientras la forma que sí se da no se
medía ni una vez. Esa forma es la contraria: **estrecha y alta**. El 288 sale de sumas y no
de una corazonada: WCAG 1.4.10 pone el suelo del documento en 320 puntos, `.dentro` se lleva
`clamp(1rem, 4vw, 2.5rem)` por lado y a 320 manda el mínimo de 17, así que al recuadro le
quedan 286 y se mide con 288 por caer del lado seguro; de alto, los 420 del `min-height`. Ahí
el renglón cabe **20 letras** contra las 25 del móvil, las frases de dos renglones pasan a
tres, hay siete renglones y se pintan **DOS** frases. Ése es el presupuesto de verdad de este
cliente, y por eso el §2.1 trae ahora las dos columnas.

La lista del comprobador son hoy **dieciséis** lienzos, los quince de aquí más ése. Las tres
frases caben en **catorce**, y en los dos estrechos —320×360 y 288×420, cada uno estrecho de
una manera distinta— caben **dos**. Y los dos números que la cabecera de `elCartelQueCabe`
escribe para ahorrarle la medida al siguiente (cinco lienzos bajos, diez de los dables con las
tres) **no están escritos a mano**: el comprobador los saca del `min-height` de la hoja y de
la lista, y exige que la cabecera los diga con esas palabras. Ya se desfasaron una vez.

Y una tercera medida que este documento no tenía: **con la mesa recogida no hay asa en la que
apoyarse.** El pie del cartel se apoya en el techo del ASA de la barra, y con la mesa abajo no
hay barra en pantalla; medido contra sus cuatro huecos, el cartel se quedaba flotando el alto
de una barra entera por encima del canto, justo cuando la mesa se ha recogido para ver MÁS
tablero. No tapaba nada, y por eso llevaba ahí sin que nadie lo viera. El cliente le pasa los
huecos de VERDAD —los mismos que deciden si caben los dados—, no un cuatro escrito a mano.

**7. Con la letra muy grande el cartel deja de pintarse, y el texto sobrevive en la lista de
apoyo.** Ésta es la consecuencia del punto 5 y hay que decirla entera, porque suena a fallo y
es lo prometido. Medido con las ONCE frases de verdad y no con tres cortas de mentira —que es
la diferencia entre ver «caben menos» y ver lo que pasa—: en 288×420, con la raíz en 20 se
pintan dos frases en todos los naipes, con 24 una, hacia 27 empiezan a salir naipes SIN
CARTEL, y con 34 no se pinta ninguno; en 320×360 el corte llega antes. **O sea que el usuario
para el que se hizo el respeto a la preferencia es el que se queda sin cartel.** Y está bien:
antes ninguno que uno cortado a la mitad sin avisar. Lo que lo hace aceptable es la otra
mitad, y se compra en el mismo sitio: **la lista `.riberas-solo-apoyo` se pinta desde
`cartasDelMazo` y no mira el cartel ni una vez**, así que las tres frases de los once naipes
siguen ahí, con cartel o sin él, y siguen siendo lo que oye quien no puede pasar el cursor por
un lienzo. Las dos mitades tienen comprobación.

**8. La llave que apaga el cartel con el pregón abierto NO está escrita, y es a propósito.**
El §7.7 la pedía en la fase del escritorio y el §12 decía que «mientras el pregón no exista, la
condición se escribe igual y sale siempre verdadera; no es una espera». El código dice lo
contrario, y tiene razón: el pregón no existe todavía en este árbol, y **una condición sobre
un estado que nadie crea es una condición que ningún comprobador puede poner roja** —se
quedaría de adorno hasta que alguien la borrara por muerta—. Así que la decisión 9 se queda
escrita en la cabecera de `elCartelQueCabe`, con sus números para quien la escriba (−24 puntos
de banda en el SE apaisado y 8 en 320×360 con la cinta a 88 y las cuatro propuestas colgando,
contra los 43 de caja que el cartel necesita para existir), y entra con el trueque. Lo mismo
la cinta del tercio central, que tampoco existe: hoy el alto libre llega hasta el techo del
recuadro, y el día que la cinta baje se le resta ANTES de partirlo por la mitad.

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

**Las tres primeras filas eran de la fase 2, y la fase 2 ya está empujada.** Se quedan
porque explican por qué el cartel se degrada como se degrada, pero lo que hay que contestar
hoy son las cuatro últimas, que son nuevas de esta pasada.

| Qué | La recomendación, y por qué |
|---|---|
| **NUEVA, y es la que más gente deja fuera: la mano por clases del retablo ha caído al octavo puesto de nueve.** | **Hay que subirla, y es corta.** Este documento la puso de segunda con un argumento que no ha cambiado: `COLORES_EN_3D` tiene **cuatro** colores y `MANIFIESTO_RIBERAS.jugadores` llega a seis, así que **en una mesa de cinco o de seis el retablo es la única pantalla que existe**, y ésta es la única fase de todo el encargo que llega a ella. Al aterrizar antes el cartel del escritorio, quedó detrás del trueque entero, y nada la empuja ni depende de ella. Traducido: **hoy las mesas de cinco y seis colonos siguen sin ver una sola explicación de una carta**, con el texto escrito, vigilado y a una función de distancia (`retratoDeLaCarta`, que ya existe y ya recibe `string`) |
| **NUEVA: los dos naipes de premio sólo los ve quien ya los tiene, así que se explican tarde.** | **Es una fase propia y su forma está por decidir** (§12.1). `premiosEnTres` devuelve el naipe sólo al dueño, y las dos pantallas piden la mano de uno mismo, así que las frases de El Vado Largo y de La Mayor Guardia le cuentan cómo se gana el premio a quien ya lo ganó. El texto no hay que escribirlo —ya está, y con vacuna—; lo que falta es una puerta. El candidato es el marcador, donde `renglonDelVado` ya le dice «vado 1 de 5» a quien va corto, y que es además el único sitio que sirve también en el retablo. No hacer nada es defendible y se dice |
| **NUEVA, y de aviso: la vacuna de la guardia se pondrá ROJA a propósito, y con la fase concreta.** | El «cómo se usa» de la guardia empieza hoy por «Tras tirar», y hay una comprobación que ata esa frase a que el juego no la ofrezca antes. **La fase que le da la vuelta es la 3 de `docs/EL-LADRON-DE-RIBERAS.md`, «La guardia mueve»**, que es la que quita el `!estado.tirado` de `jugarLaGuardia`. El día que se empuje, esa comprobación se pone roja, y eso es lo que se compró. No es «el día que aterrice»: es esa fase, con su número, y volver a verde es mi fase 5. **Y hay un detalle que hay que mirar antes:** el «Tras tirar» vive en `USAS_DE_LA_JUGADA`, una constante que comparten las cuatro cartas que se juegan, y las otras tres SÍ siguen esperando a los dados |
| **NUEVA, y no cuesta pantalla: quien tiene la letra del navegador en «muy grande» se queda sin cartel.** | **Se deja así, y hay que saberlo.** Medido con las once frases de verdad: hacia una raíz de 27 empiezan a salir naipes sin cartel, y con 34 no se pinta ninguno (§9 bis, punto 7). Es lo prometido —antes ninguno que uno cortado a la mitad sin avisar— y lo que lo hace aceptable es que **el texto no se pierde**: la lista de apoyo se pinta desde la mano y no mira el cartel ni una vez, así que las tres frases de los once naipes siguen ahí y se siguen oyendo. La ironía conviene decirla igual: el usuario para el que se hizo el respeto a la preferencia es el que se queda sin la caja |
| ¿El cartel al pie del lienzo, o pegado al naipe? | **Al pie.** Pegado al naipe no cabe en los cuatro lienzos de pie, y en 390×845 el aire es de menos cuatro puntos (§5.1). Al pie cabe en los quince. Cuesta que el texto quede lejos de la carta: en el SE apaisado, unos 240 puntos de recorrido de ojo |
| **La que hay que contestar: con la cinta a 88, en 320×360 sólo cabe UNA frase.** ¿Se deja así? | **Sí, y no se toca nada más.** Los números, medidos con las dos cintas y con el rem de esta casa en 17 (§5.1): con la cinta en una línea salen 4 renglones y **dos** frases; con la de dos líneas, 3 renglones y **una**. En el SE apaisado se pasa de tres frases a dos. Los otros trece lienzos siguen con las tres con las dos cintas. Se deja así porque las alternativas son peores y están medidas: bajar el cuerpo mete una frase más pero cae por debajo del suelo de letra de la casa, que `retablo.tsx` sube a 13 puntos a propósito y que aquí ya vamos justos por arriba con 13,94; y quitarle el tope de la mitad del alto libre a la caja tapa media pantalla de tablero en el lienzo donde menos tablero hay. La frase que se ve es «qué hace», que es la que Miguel nombró primero; las otras se oyen igual y están en la lista de apoyo. Lo que NO se hace es recortar con puntos suspensivos: media frase de ayuda es peor que ninguna |
| **NUEVA, y es de aviso y no de decisión: esta respuesta ya no tiene margen.** | La segunda vuelta contestaba lo mismo pero con las cuentas de un rem de 16, que daba 5 renglones donde hay 4 y 27 letras por línea donde hay 25. La recomendación aguanta con los números buenos (§10.10), pero el caso de 320×360 con la cinta corta pasa a caber **exacto**: cuatro renglones para dos frases de dos, sin uno de sobra. Traducido: **cualquier cosa que le quite un renglón a esa banda deja ese teléfono en una sola frase con las dos cintas.** Lo dice aquí y no en el §5.1 porque es lo que hay que recordar cuando el estiaje pida un aviso más |
| ¿Y qué pasa cuando el pregón del trueque está abierto? | **El cartel no se pinta, y desde la hoja se puede pedir igual** (decisión 9). No es una preferencia: con las cuatro propuestas colgando de una cinta de 88, en el SE apaisado quedan **−24 puntos** de banda y en 320×360 **8**, y el cartel necesita **43** para existir (§5.3). El mueble se llama **el pregón** en los dos documentos desde la segunda pasada del otro (§10.8), y los dos miden contra el techo del asa y dan **264 contra 248** en el SE apaisado (§10.6) |
| ¿Los dos premios llevan cartel? | **Contestada y HECHA:** sí. Son dos naipes de la misma mano que aparecen solos, que no se pueden jugar y que nadie había explicado nunca. Lo que la fase 1 destapó al escribirlo es que sólo los ve su dueño, y eso es la fila nueva de más arriba |
| ¿El retablo gana «mi mano» en el marcador? | **Sí. Sigue sin hacerse, y es la primera fila de esta tabla.** Se deja el renglón para que se vea que la respuesta no ha cambiado desde la primera vuelta: lo que cambió es el sitio en la cola (§12.0) |
| **NUEVA, y no es de este documento:** que el 3D aprenda a pintar seis colores | **Es un encargo propio y va aparte.** Se apunta aquí porque desde este documento se ve la contradicción entera: el §1.11 de `docs/LA-MESA-DE-RIBERAS.md` diseñó el cajón del marcador para SEIS fichas, y hoy con seis se juega en el retablo, así que ese cajón de seis no se puede ver nunca |
| ¿La guardia con dos textos? | **Contestada:** sí, con el comprobador que los ata a la regla y a una fase concreta. El de hoy entró en la fase 1; el otro entra con «La guardia mueve». El detalle nuevo está en la fila de aviso de más arriba |
| Lo que hay que mirar con ojos, y no puede medir nadie | Si el cartel al pie estorba al construir en la fila de abajo del delta (no come punteros, pero tapa); si **13,94 puntos** se leen en un SE de verdad; y si el cartel apareciendo y desapareciendo con el cursor por la mano molesta. En el banco `escritorio/banco3d.html` y, para lo tercero, en un teléfono. **Nada de esto se ha mirado todavía con ojos**: la fase 2 está verde en 448 comprobaciones y eso no es lo mismo |

## 12. El orden, en fases que se empujan una a una

### 12.0. Dónde va esto hoy: las fases 1 y 2 están HECHAS

**Confirmadas en `85f28c6`, con tres vueltas y tres revisores distintos.** Lo que trajeron:

| Fase | Qué dejó hecho | Con qué cuenta |
|---|---|---|
| **1. El texto y su comprobador, sin nada en pantalla** | `ExplicacionDeLaCarta`, las veintiuna frases en `RETRATO_DE_LA_CARTA`, `RETRATO_DEL_PREMIO` y `EXPLICACION_DEL_TITULO`, compuestas con las siete constantes y con `cardinal`, `plural` y `enCabeza`; el campo en `CartaDelMazoEnTres` y en `CartaDelMazo`; `cartasEnTres` y `premiosEnTres` rellenándolo. Y las cinco reglas del §2 bis, jugadas en mesas de verdad | **`verify:riberas-en-tres` 337**, salida 0 |
| **2. El cartel en el escritorio** | `elCartelQueCabe` y `elEstiloDelCartel`, puras y exportadas; `raizDelNavegador`; el `<p class="riberas-cartel">` dentro del recuadro con `pointer-events: none` y `aria-live="polite"`; y la lista `.riberas-solo-apoyo` con los once naipes y sus tres frases | **`verify:escritorio` 448**, salida 0 |

**Y la fase 2 que aterrizó no es la que este documento había puesto de segunda.** Aquí la
segunda era la mano por clases del retablo, con un argumento que sigue siendo bueno y que
esta pasada no retira: `COLORES_EN_3D` tiene cuatro colores y
`MANIFIESTO_RIBERAS.jugadores` llega a seis, así que **en una mesa de cinco o de seis el
retablo es la única pantalla que existe** y es la única fase que llega a ellas. Al empujarse
antes el cartel del escritorio, esa fase ha caído a la cuarta, que es exactamente donde la
primera vuelta la había puesto y donde esta misma sección argumentó que no debía estar. Se
dice sin adornarlo: **hoy las mesas de cinco y seis colonos siguen sin ver una sola
explicación de una carta**, y lo seguirán mientras esa fase no se empuje.

**Quedan la 3 y la 4, y la 5 la dispara otro.** El orden y el porqué, abajo.

Cada fase deja el juego entero y verde. Ninguna depende de la siguiente, y se pueden parar
en cualquier punto sin dejar nada roto. Lo que sí tiene un orden que no se puede elegir es
el de los TRES encargos juntos: la tabla de más abajo.

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

| # | Fase | De quién | Estado |
|---|---|---|---|
| 1 | La pieza, con su bloqueo y su robo | Estiaje, fase 1 | En marcha en otro árbol |
| 2 | El descarte del siete | Estiaje, fase 2 | Pendiente |
| 3 | **El texto y su comprobador, sin nada en pantalla** | **Mía, fase 1** | **HECHA (`85f28c6`)** |
| 4 | **El cartel en el escritorio** | **Mía, fase 2** | **HECHA (`85f28c6`)** |
| 5 | La guardia mueve, **junto con** mi fase 5 (la guardia con el estiaje) | Estiaje, fase 3 + **mía, fase 5** | Pendiente |
| 6 | Las mil partidas (el jugador ciego y uniforme) | Estiaje, fase 5 | Pendiente |
| 7 | El trueque entero | Trueque, sus fases | Pendiente |
| 8 | **La mano por clases en el retablo** | **Mía, fase 4** | Pendiente |
| 9 | **El cartel en la app** | **Mía, fase 3** | Pendiente |

**Las dos primeras mías se adelantaron a las dos del estiaje, y eso no rompió nada porque no
tocan una regla.** Lo que sí se movió, y hay que leerlo en la tabla y no en la numeración, es
el sitio del retablo: bajó del cuarto puesto al octavo. Ahí no hay nada que lo empuje ni nada
que dependa de él, así que si alguien no lo pide se queda para siempre detrás del trueque
entero. **Es la única de mis fases que llega a las mesas de cinco y de seis** (§5.2), y por
eso sube a Miguel otra vez en el §11.

Y la fase 4 del estiaje (la que aquel documento deja suelta) **cabe donde quepa**, porque
nadie depende de ella; no está en la lista por eso y no por olvido.

**Léase la tabla y no la numeración de más abajo.** Mis fases están numeradas por lo que
cuesta cada una y por lo que deja hecha, no por el orden en que se empujan: en el calendario
de verdad **mi fase 5 va antes que mi 3 y que mi 4**, porque la dispara la fase 3 del estiaje
(§7.6) y ésa cae en el quinto sitio. Las mías siguen sin depender unas de otras —cada una
deja el juego entero y verde—, pero la 5 no espera a nadie: quien empuje en el orden en que
están escritas se encontrará la vacuna de la guardia en rojo desde el día que aterrice «La
guardia mueve».

**De qué dependo yo, y quién depende de mí.** Lo primero, en concreto:

- De la fase 5 del estiaje, «Las mil partidas», que es donde nace el único comprobador que
  juega Riberas eligiendo uniformemente de `opciones()` (§7.9). Este documento no lo escribe
  y se apoya en él; hasta que exista, que lo del mazo sea jugable desde la lista no lo
  vigila nadie, y eso hay que decirlo aunque este encargo no añada ni un movimiento.
- De la fase 3 del estiaje, «La guardia mueve», que es la que dispara la fase 5 de aquí.
- Del pregón del trueque, sólo para la llave que lo apaga (decisión 9). **Aquí decía que
  «mientras el pregón no exista, la condición se escribe igual y sale siempre verdadera; no
  es una espera», y el código no le hizo caso, con razón** (§9 bis, punto 8): la condición no
  se escribe hasta que exista el estado, porque si no ningún comprobador la puede poner roja.
  Lo que sí es cierto es la consecuencia: **mi fase 3 va detrás del trueque entero** en la
  lista de arriba, y por eso mismo.

Y quién depende de mí, que es más corto y hay que decirlo igual:

- **La fase 3 del estiaje depende de mi fase 1, que ya está empujada.** El día que «La
  guardia mueve» quite el `!estado.tirado` de `jugarLaGuardia`, la vacuna del §7.6 se pone
  roja; si mi fase 1 no estuviera, esa vacuna no existiría y el cambio de regla entraría con
  el texto viejo y toda la batería en verde. Está: es una de las 337.
- **Nadie más depende de mí.** Las fases 3 y 4 de aquí no las espera ningún otro documento:
  son pantalla, y ni añaden un movimiento ni tocan una regla.

1. ~~**El texto y su comprobador. Sin nada en pantalla.**~~ **HECHA en `85f28c6`** (§12.0).
   Al acabar, el texto existe, viaja al naipe, está vigilado y no se ve. Es la fase que hizo
   cortas a las demás, y la que destapó las cinco reglas del §2 bis.
2. ~~**El cartel en el escritorio.**~~ **HECHA en `85f28c6`** (§12.0). La entrada `onSenalar`
   en `ManoDelMazo` y en `Delta`, cableada desde los `onPointerOver` y `onPointerOut` que ya
   existían; el estado de la carta cogida con la señalada como respaldo y la precedencia del
   §4; el cartel dentro del recuadro con `pointer-events: none` y `aria-live="polite"`; y la
   lista de apoyo con una fila por naipe. Es la fase que contesta la frase que Miguel dijo,
   literal. Lo que NO lleva y era del guion: la llave del pregón (§9 bis, punto 8).
3. **El cartel en la app.** Lo mismo con `cogidaDelMazo`, dentro de la vista del `Canvas`,
   con `pointerEvents="none"` y `accessibilityLiveRegion="polite"`, y las filas `accessible`.
   La aritmética **no se vuelve a escribir**: `elCartelQueCabe` es una función pura y la app
   la puede llamar igual, sólo que con SU peor lienzo, que no es el de aquí —el escritorio
   tiene el suelo de 420 puntos del `min-height` y la app no lo tiene, así que allí sí valen
   los lienzos bajos de la lista y el peor vuelve a ser 320×360 (§9 bis, punto 6)—. Se prueba
   EN EL APARATO, porque el panel del navegador no pulsa igual que un dedo: coger un naipe
   apagado y leer el cartel, soltarlo con el segundo toque, y comprobar que un toque sobre el
   sitio del cartel construye en el delta que hay debajo. Y se mira con la letra del sistema
   en grande, que es donde el cartel se queda en una frase o en ninguna (§9 bis, punto 7).
4. **La mano por clases en el retablo.** La fila nueva del marcador en las dos pantallas, con
   `retratoDeLaCarta` y `manoDelMazoPorFamilias`, y los dos premios; y la comprobación del
   §7.8. **Es corta, y es la única que llega a las mesas de cinco y de seis.** Los datos ya
   están en la vista y `retratoDeLaCarta` ya existe y ya recibe `string`. El §12.0 dice cómo
   llegó a ser la cuarta cuando este documento la había puesto de segunda; el argumento no ha
   cambiado, sólo el sitio.
5. **La guardia con el estiaje: se empuja CON la fase 3 de
   `docs/EL-LADRON-DE-RIBERAS.md`, no después de «el día que aterrice».** Una fila de tabla y
   una comprobación que cambia de sentido. La fase 3 de aquel documento («La guardia mueve»)
   es la que quita el `!estado.tirado` de `jugarLaGuardia` y hace que `opcionesDelMazo` la
   ofrezca antes de tirar; en cuanto se empuje, la vacuna del §7.6 se pone **roja**, porque
   preguntará al juego y le contestará que sí mientras el texto sigue diciendo «Tras tirar».
   O sea que esta fase no espera a nadie: la dispara aquélla, y si no se hace, la batería no
   pasa. No se adelanta tampoco, por el mismo motivo y en el otro sentido. Y ya no es sólo la
   guardia: **`USAS_DE_LA_JUGADA` es una constante que comparten las cuatro cartas que se
   juegan**, así que quien la toque para quitarle el «Tras tirar» se lo quita también a El
   Año Bueno, a El Acaparamiento y a Las Dos Veredas, que siguen esperando a los dados. La
   vacuna del §7.6 pregunta por la guardia; las otras dos puertas de esa misma frase («una al
   turno» y «la nueva no») las preguntan otras dos comprobaciones sobre El Acaparamiento, así
   que sacar la guardia de la constante compartida no deja a nadie sin vigilar.

### 12.1. Y una fase más, que se dejó escrita y no se hizo: los premios se explican tarde

**Los dos naipes de premio SÓLO los ve quien ya los tiene.** No es una omisión de la fase 1:
`premiosEnTres` recibe `quien` y devuelve un naipe **sólo si el premio es de ese asiento**
(`if ((vista.vado?.de ?? null) === quien)`), y en las dos pantallas ese `quien` es el propio
jugador, porque la mano de la izquierda es la de uno. Así que hoy pasa esto: **las frases de
El Vado Largo y de La Mayor Guardia explican cómo se gana el premio a quien ya lo ganó.**

El §0 decía que estos dos naipes eran los que más falta hacían porque «aparecen solos, sin
que nadie los pida, y nadie los ha explicado nunca», y eso sigue siendo verdad —el día que
aparecen, ahora hay cartel—. Lo que no es verdad es que el cartel llegue a tiempo: quien está
trazando su cuarta vereda, que es exactamente quien necesita saber que a la quinta pasa algo,
no tiene ningún naipe que señalar. Y la frase que le serviría está escrita, compuesta con
`VADO_MINIMO`, y no la ve.

**Que se expliquen ANTES de tenerlos es otra fase, y su forma está por decidir.** Se deja
apuntada aquí y no se resuelve, porque las salidas que se ven no son equivalentes y ninguna
es gratis:

- **Devolver el naipe apagado a quien no lo tiene** es lo barato de escribir —`premiosEnTres`
  ya recibe la vista entera— y lo caro de todo lo demás: mete dos naipes más en una mano que
  ya se reparte por imán, y `esPremio` existe precisamente para que un premio NO se pinte
  apagado (cabecera de ese campo en `escenas/cartas.ts`). O sea que habría que decidir qué
  quiere decir un premio de otro dibujado en mi mano, y eso es una regla de pantalla nueva.
- **Colgarlo del marcador**, donde el renglón del vado ya dice «vado 1 de 5» a quien va corto
  (`renglonDelVado`). Ahí ya hay un sitio que habla del premio a quien no lo tiene, y ahí ya
  se sabe cuánto le falta. Es el candidato natural, y es además el único que sirve en el
  retablo.
- **No hacer nada y aceptarlo**, con el argumento de que un premio que no se puede pedir no
  es una jugada que haya que explicar. Es defendible y hay que decirlo, porque las otras dos
  cuestan pantalla.

Lo que sí está decidido es que **no se resuelve escribiendo un texto nuevo**: las dos frases
ya existen, ya están compuestas con las constantes y ya tienen vacuna encima. Lo que falta es
una PUERTA, y por eso esto es una fase y no una errata.
