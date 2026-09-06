# Las cartas se explican

> Si algo de aquí no coincide con el código, gana el código. Este documento recoge las
> decisiones y su porqué. Se escribió el 6 de septiembre de 2026 sobre la rama
> `lobby-catan`, con el código en `6372bc7`, a partir de una frase que Miguel dijo tras
> jugar una partida entera: «cuando ponemos el cursor encima de una carta de la izquierda
> aparezca una descripción de la carta, porque ahora los usuarios no saben qué hace cada
> una, qué consiguen, ni cómo la tienen que usar». Es el más pequeño de los tres encargos
> de esa partida (los otros dos son el trueque múltiple y el ladrón) y el que toca a más
> gente: a quien abre Riberas por primera vez.
>
> Ningún número de aquí es una opinión. Cada uno sale de un guion de medida corrido sobre
> el código de `6372bc7` (los cinco están en el §9) o de un comprobador que se nombra con
> su cuenta del día. Las citas al código son por NOMBRE de función o de constante y nunca
> por número de línea, a propósito: hay otro agente escribiendo a la vez la fase 4 de la
> mesa en `escenas/delta.tsx` y en las dos pantallas, y una cita de línea nace caducada.
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

6. **El presupuesto del texto sale del lienzo peor, y no al revés.** Las tres frases juntas
   miden como mucho **145 caracteres** y la primera sola como mucho **55**. Los dos números
   salen de `medir-el-presupuesto-del-cartel.ts` sobre los quince lienzos de la lista
   `LIENZOS` de `verify:escena` (§5). Escribir primero y medir después es cómo se llega a un
   cartel que se recorta justo en el teléfono de quien más lo necesita.

7. **Los once naipes llevan texto, y ninguno se queda sin él.** Las nueve clases y los dos
   premios. Un comprobador lo afirma clase a clase (§7), porque una carta sin texto es la
   que nadie mira hasta que un jugador la compra.

8. **La guardia se escribe DOS veces, y la que entra la decide el ladrón, no este
   documento.** Hoy una guardia sólo se puede jugar después de tirar (`jugarLaGuardia`
   empieza con `if (yo < 0 || !estado.tirado) return estado;`) y lo único que hace es robar
   un bien al azar. Con el ladrón, Miguel pidió por escrito que se pueda jugar «incluso
   antes de lanzar los dados» y que mueva la figura. Las dos versiones están escritas en el
   §2, y cuál entra lo dice un comprobador y no una fecha (§7, la vacuna de la guardia).

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
| **La Guardia** (con ladrón) | Mueves al ladrón y robas a quien tenga allí. | Un bien al azar, y una muesca para La Mayor Guardia. | Suéltala en JUGAR, antes o después de tirar. |
| **El Año Bueno** | Coges 2 bienes del arcón, iguales o no. | Dos bienes que no le quitas a nadie. | Tras tirar, suéltala en JUGAR y di cuáles. |
| **El Acaparamiento** | Pides un bien y todos te dan los que tengan. | Todo ese bien de las otras manos, o nada. | Tras tirar, suéltala en JUGAR y di cuál pides. |
| **Las Dos Veredas** | Abres 2 veredas sin pagarlas. | Dos pasos del Vado Largo, o sitio de choza. | Tras tirar, suéltala en JUGAR y trázalas. |
| **El Molino, La Cantera, El Torreón, El Faro, El Huerto** | No se juega: se tiene. Vale 1 punto. | Ese punto: sólo lo cuentas tú hasta que lo enseñes. | Suéltala en REVELAR; no gasta la jugada. |
| **El Vado Largo** (premio) | Lo tiene quien encadena más veredas, desde 5. | 2 puntos mientras nadie te supere. | Nada: se gana trazando veredas y se va solo. |
| **La Mayor Guardia** (premio) | La tiene quien más guardias juega, desde 3. | 1 punto mientras nadie te supere. | Nada: se gana jugando guardias y se va sola. |

Y lo que cada frase mide, con las tildes puestas y contado por
`textos-con-tildes.mjs`:

| Naipe | Hace | Consigues | Usas | Las tres | Bytes |
|---|---|---|---|---|---|
| La Guardia (hoy) | 41 | 45 | 43 | 131 | 133 |
| La Guardia (con ladrón) | 44 | 52 | 44 | 142 | 146 |
| El Año Bueno | 39 | 36 | 42 | 119 | 122 |
| El Acaparamiento | 44 | 41 | 46 | 133 | 135 |
| Las Dos Veredas | 29 | 43 | 41 | 115 | 117 |
| Los cinco títulos | 36 | 51 | 40 | 129 | 133 |
| El Vado Largo | 45 | 34 | 44 | 125 | 126 |
| La Mayor Guardia | 43 | 33 | 44 | 122 | 123 |

La más larga de «qué hace» son 45 caracteres, contra el presupuesto de 55. Las tres juntas
más largas son 142, contra el presupuesto de 145. Los dos presupuestos salen del §5.

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
partida ENTERA con un jugador que elige a ciegas entre las opciones (el mismo jugador de
`jugar:fondo`) y mide con `Buffer.byteLength` lo que `proyectarRiberas` devuelve a cada
asiento después de cada movimiento:

| Qué se midió | Cuánto |
|---|---|
| Movimientos de la partida a ciegas | 2.775 |
| Vistas proyectadas (una por asiento por movimiento) | 8.328 |
| Lo que pesa una vista en JSON, de media | 29.879 bytes |
| La más ligera y la más pesada | 26.966 y 32.470 |
| La tabla de los once naipes en JSON, con tildes | 1.926 bytes |

Con esos números, las dos ramas:

- **Dentro de la vista:** +6,4 % de cable en CADA vista, o sea 1.926 bytes por asiento y por
  movimiento. En la partida medida, **15,3 MiB** de las mismas once frases, que no cambian
  nunca, repetidas 8.328 veces.
- **En el cliente:** 1.926 bytes una vez, dentro del binario que ya se descarga.

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
   carpeta contiene los dos ficheros. O sea que las veintidós frases nuevas entran solas en
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
de `verify:escena`, con el cuerpo de `.opcion-ayuda` (0,82 rem, o sea 13 puntos), el 0,6 por
letra de `tamanoDeTexto` (`app/src/arcade/retablo.tsx`, que es el único número de anchura de
letra que la casa tiene escrito), interlineado 1,35, doce puntos de margen por lado y ocho de
aire hasta la barra, y con la caja topada a la mitad del alto libre sobre el asa:

| Lienzo | Banda libre | Letras por línea | Alto libre sobre la barra | Caja | Líneas | Caracteres que caben |
|---|---|---|---|---|---|---|
| 320×360 | 241 | 27 | 272 | 136 | 5 | **95** |
| 360×490 | 253 | 29 | 379 | 190 | 8 | 189 |
| 390×490 | 283 | 33 | 377 | 189 | 8 | 215 |
| 390×845 | 240 | 27 | 677 | 339 | 16 | 392 |
| 768×640 | 628 | 77 | 488 | 244 | 11 | 732 |
| 768×1024 | 544 | 66 | 800 | 400 | 20 | 1.221 |
| 1920×900 | 1.723 | 217 | 690 | 345 | 17 | 3.364 |
| 568×320 (SE apaisado) | 498 | 60 | 240 | 120 | 4 | **150** |
| 667×375 | 585 | 71 | 283 | 141 | 5 | 249 |
| 780×360 | 701 | 86 | 271 | 136 | 5 | 301 |
| 844×390 | 759 | 94 | 294 | 147 | 5 | 329 |
| 932×430 | 838 | 104 | 325 | 163 | 6 | 468 |
| 1024×768 | 856 | 106 | 587 | 294 | 14 | 1.325 |
| 1180×820 | 1.001 | 125 | 628 | 314 | 15 | 1.688 |
| 1920×1080 | 1.684 | 212 | 829 | 415 | 21 | 4.134 |

De ahí salen los dos presupuestos de la decisión 6: **145 caracteres para las tres frases**
(cabe en catorce de los quince; el que no es 320×360, con 95) y **55 para «qué hace» sola**
(cabe en los quince). La regla de pintado, en una línea: **el cartel enseña, en orden, las
frases enteras que quepan**; en 320×360 caben dos (la más larga de las dos primeras juntas
mide 91) y en los otros catorce caben las tres. No se corta una frase por la mitad ni se
ponen puntos suspensivos: media frase de ayuda es peor que ninguna.

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
barra queda debajo, con ocho puntos de aire hasta el asa. Arriba se le restan los 44 puntos
de la cinta del tercio central que la fase 5 de la mesa va a poner (`docs/LA-MESA-DE-RIBERAS.md`
§2.2), aunque hoy no exista: un cartel que hay que volver a medir dentro de dos fases es un
cartel medido a medias.

### 5.2. En el retablo: la mano que hoy no está

En el tablero plano no hay naipes que señalar (§0). Así que el cartel cuelga de un sitio
nuevo y pequeño en el marcador: **mi mano, por clases**, una fila por clase con cuántas
tengo, en el mismo orden en que la escena las agrupa (`manoDelMazoPorFamilias` y
`ORDEN_DE_LAS_FAMILIAS`), más los dos premios si son míos. Los datos ya están todos en la
vista (`misCartas`, `vado`, `guardia`); el texto se pide con `retratoDeLaCarta(clase)`, que
ya existe y ya recibe `string`; y el gesto es un botón, que es el gesto del retablo.

La `ayuda` de las opciones **no se toca**. Es de la jugada, no de la carta, y las dos cosas
conviven: el botón dice «El Acaparamiento: pedir sal» con su ayuda «Todos los demás te dan
los que tengan de ése, y puede que no tengan ninguno», y la fila de la mano dice qué es El
Acaparamiento aunque hoy no se pueda jugar.

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
   veintidós frases nuevas puede ser byte a byte igual a una `ayuda` de `opcionesDelMazo` o de
   `opcionesDeRevelar`. Eso es comprobable y se comprueba (§7).

## 7. Los comprobadores

Todos en `verify:riberas-en-tres`, que hoy hace 295 comprobaciones con `MINIMO = 293`
(corrido en este árbol el 6-sep-2026, código de salida 0), salvo los dos últimos, que van
donde vive la pantalla. Ese comprobador ya mete lo que sale de la traducción en
`huecosDeLasCartas` y en `puertasDeLaCarta` de la escena de verdad, así que es el sitio.

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
4. **El presupuesto se cumple.** `hace` mide 55 caracteres o menos y las tres juntas 145 o
   menos, contando la frase ya compuesta con sus constantes dentro. Los dos números salen del
   §5 y se escriben en el comprobador con su porqué al lado, para que quien los toque sepa
   qué lienzo está gastando.
5. **No se dice dos veces lo mismo.** Se juega una mesa de verdad hasta tener las cuatro
   clases jugables ofrecidas, se recogen las `ayuda` de todas las opciones del mazo y de
   revelar, y ninguna coincide byte a byte con ninguna de las veintidós frases.
6. **La vacuna de la guardia, que es la más importante de las seis.** El comprobador PREGUNTA
   al juego si hay una opción de guardia antes de tirar (mesa de verdad, carta comprada el
   turno anterior, turno propio, `tirado` en falso) y exige que el texto y la regla no
   discrepen: si el juego NO la ofrece, la frase «cómo se usa» de la guardia tiene que empezar
   por «Tras tirar»; si el juego SÍ la ofrece (o sea, cuando el ladrón entre), tiene que NO
   decirlo. Sin esta comprobación, el día que el ladrón cambie `jugarLaGuardia` el cartel
   seguirá enseñando la regla vieja con toda la batería en verde, que es la clase de fallo que
   este repositorio ya tiene escrita como la peor.
7. **El cartel no come punteros.** En `verify:escritorio`, que hace 400 comprobaciones: la
   regla del cartel en `estilo.css` lleva `pointer-events: none` y el elemento no tiene ni
   `onClick` ni `tabindex`. En la app, el equivalente sobre `pointerEvents="none"`. Es la
   decisión 5, y sin comprobador se pierde en el primer retoque.
8. **Y el que no hace falta escribir:** `jugar:fondo` ya juega los cuatro juegos enteros a
   ciegas desde la lista de opciones, y este encargo no añade ni un movimiento ni una opción,
   así que sigue verde por construcción. Que no haya nada nuevo que jugar es, además, la
   prueba de que el cartel es una ayuda y no una regla.

## 8. Dónde vive cada cosa

| Qué | Dónde | Qué se le hace |
|---|---|---|
| Las nueve clases y sus reglas | `shared/arcade/juegos/riberas.ts`: `ClaseDeCarta`, `CLASES_DE_CARTA`, `TITULOS`, `BOLSA_DE_CARTAS`, `jugarLaGuardia`, `jugarElAnoBueno`, `jugarElAcaparamiento`, `jugarLasDosVeredas`, `revelarUnTitulo`, `sePuedeJugarLaCarta` | Nada |
| Las siete constantes de los números de las frases | El mismo fichero: `BIENES_DEL_ANO_BUENO`, `VEREDAS_DE_LA_CARTA`, `VADO_MINIMO`, `GUARDIA_MINIMA`, `PUNTOS_DEL_VADO`, `PUNTOS_DE_LA_GUARDIA`, `PUNTOS_DEL_TITULO` | Se leen |
| La `ayuda` de cada opción | El mismo fichero: `opcionesDelMazo` y `opcionesDeRevelar` | Nada |
| **Las veintidós frases** | `shared/arcade/juegos/riberas-en-tres.ts`: `RetratoDeLaCarta`, `RETRATO_DE_LA_CARTA`, `RETRATO_DEL_PREMIO` | Tres columnas nuevas |
| El naipe que llega a la escena | El mismo fichero: `CartaDelMazoEnTres`, `cartasEnTres`, `premiosEnTres`, `laManoDeLaIzquierda` | Un campo nuevo |
| El contrato del naipe en la escena | `escenas/cartas.ts`: `CartaDelMazo` | Un campo `readonly` |
| El reparto y el imán de la mano | `escenas/cartas.ts`: `huecosDeLasCartas`, `franjaDeLasCartas`, `puertasDeLaCarta`, `casillasDeLaMano` | Nada |
| El aviso de la carta señalada | `escenas/delta.tsx`: `CartaDelMazoEnLaMano` (sus `onPointerOver` y `onPointerOut`), `ManoDelMazo`, `Delta` | Una entrada nueva, `onSenalar` |
| El estado de la carta cogida | `escritorio/src/riberas-en-tres.tsx`: `cartaDelMazo`, `alCogerCartaDelMazo`. `app/src/arcade/riberas-en-tres-escena.tsx`: `cogidaDelMazo`, `alCogerCartaDelMazo`, `soltarTodo` | Se lee |
| El cartel | Dentro de `RECUADRO_DEL_LIENZO` en el escritorio, con su regla en `estilo.css` junto a `.riberas-lienzo` y `.riberas-solo-apoyo`. Dentro de la vista del `Canvas` en la app | Nuevo |
| La mano por clases del retablo | `escritorio/src/riberas-en-tres.tsx` (`MarcadorDeRiberas`) y `app/src/arcade/riberas-en-tres-escena.tsx` (`ElMarcador`, `FichaDelColono`) | Nuevo, fase 4 |

## 9. Cómo se midió

Cinco guiones de solo lectura, corridos con `tsx` desde `server` sobre el código de
`6372bc7` el 6 de septiembre de 2026. Ninguno está en el repositorio: este documento no
escribe código. Si una fase quiere conservarlos, los tres primeros van a `escenas/` junto a
`medir-lienzos.ts` y `medir-cinta-central.ts`, y el del cable a `server/scripts/`.

| Guion | Qué contesta | Con qué código de verdad |
|---|---|---|
| `medir-el-peso-de-los-textos.ts` | Cuánto pesa una vista y cuánto costaría meterle los textos | `abrirMesa`, `jugar`, `opcionesDeRiberas`, `proyectarRiberas`; partida entera a ciegas de tres asientos, semilla 11 |
| `medir-las-letras.ts` | Cuánto costaría escribir el cartel dentro de la escena | `geometriaDeContornos` sobre `CONTORNOS_DE_LA_CIFRA`, `CONTORNOS_DE_LA_CARTA` y `CONTORNOS_DEL_BIEN`; `TOPE_DE_LA_MESA` y `TRIANGULOS_FIJOS_DE_LA_MESA` |
| `medir-el-cartel.ts` | Si cabe a la derecha de la mano de cartas | `franjaDeLasCartas`, `huecosDeLasCartas`, `huecosDeLaBaraja`, `areasDeTrueque`, `huecosDeLaBarra` en los quince lienzos |
| `medir-el-presupuesto-del-cartel.ts` | Cuántas letras caben al pie del lienzo, y en cuál caben menos | Las mismas cinco funciones, con la mano de bienes quieta y sin áreas |
| `medir-el-iman.ts` | Si el imán distingue la carta señalada (no) | `huecosDeLasCartas` con la mano de ocho y con catorce guardias, en cuatro lienzos |
| `textos-con-tildes.mjs` | Lo que miden y pesan las veintidós frases | `Buffer.byteLength`, sobre las frases del §2 |

Comprobadores corridos en este árbol el 6-sep-2026, con su código de salida mirado y no su
última línea: `verify:riberas-en-tres` 295 comprobaciones, salida 0; `verify:escena` 346
comprobaciones, salida 0. El segundo número se mueve, y hay que decir cómo se sacó: se
corrió con la fase 4 de la mesa ya a medio escribir en el árbol (otro agente estaba tocando
`escenas/delta.tsx`, `escenas/scripts/verificar-escena.ts` y las dos pantallas), así que 346
no es la cuenta de `6372bc7` limpio y quien lea esto tiene que volver a contarla antes de
usarla como referencia. Los cinco guiones de medida, en cambio, sí son de código limpio:
ninguno de los ficheros que leen (`escenas/cartas.ts`, `escenas/baraja.ts`, `escenas/barra.ts`,
`escenas/iconos.ts`, `escenas/formas.ts`, `escenas/presupuesto-del-delta.ts` y los dos de
`shared/arcade/juegos/`) estaba tocado.

## 10. Lo que choca con lo ya escrito

Cinco cosas. Las dos primeras son decisiones escritas que hay que reescribir; las tres
últimas son comentarios que dejan de ser verdad.

1. **`docs/LA-MESA-DE-RIBERAS.md` §10, primera línea del «No entra»: «texto de ninguna clase
   dentro del lienzo».** Escrito así, prohíbe este encargo entero. Lo que aquella frase
   defiende sigue en pie y ahora tiene un número: dentro de la ESCENA no hay fuente, y
   escribir el cartel más largo con contornos compilados cuesta 8.520 triángulos contra un
   tope de 4.500 (§1, decisión 3). Lo que no defiende, y no puede defender, es que el cliente
   ponga letras encima del lienzo: el escritorio ya lo hace con el botón de volver dentro de
   `RECUADRO_DEL_LIENZO`, y la fase 5 de esa misma mesa va a poner ahí una cinta de 44 puntos
   con la frase del juego dentro. Reescribir: «ni una letra dentro de la escena», con el
   porqué medido al lado, y decir que la interfaz por encima del lienzo es otra cosa y tiene
   sus propias reglas (que no se toca lo que pinta la escena, y que no come punteros).

2. **`docs/LAS-CARTAS-DE-RIBERAS.md` §3, último párrafo, y §7, primera viñeta.** «Jugar una
   guardia antes de tirar los dados no está permitido en esta versión, a sabiendas. En el
   juego original sí se puede, y sirve para mover al ladrón antes de que te robe; sin
   ladrón, esa jugada no tiene sentido aquí». El ladrón que Miguel pidió le quita a ese
   párrafo su premisa entera, y a la viñeta «el siete no hace nada todavía» le quita el
   «todavía». Ese documento lo reescribe la fase del ladrón, no ésta; lo que ésta aporta es
   que la guardia tiene sus dos textos escritos (§2) y un comprobador que no deja que el
   texto y la regla se separen (§7, la vacuna).

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

## 11. Lo que le toca decidir a Miguel

| Qué | La recomendación, y por qué |
|---|---|
| ¿El cartel al pie del lienzo, o pegado al naipe? | **Al pie.** Pegado al naipe no cabe en los cuatro lienzos de pie, y en 390×845 el aire es de menos cuatro puntos (§5.1). Al pie cabe en los quince. Cuesta que el texto quede lejos de la carta: en el SE apaisado, unos 240 puntos de recorrido de ojo |
| ¿Y en 320×360, donde sólo caben dos de las tres frases? | **Que salgan las dos enteras** («qué hace» y «qué consigues») y no las tres recortadas. La tercera se oye igual y está en la lista de apoyo. La alternativa (bajar el cuerpo de 13 a 11 puntos) mete las tres pero por debajo del suelo de letra de la casa, que `retablo.tsx` sube a 13 a propósito |
| ¿Los dos premios llevan cartel? | **Sí.** Son dos naipes de la misma mano que aparecen solos, que no se pueden jugar y que nadie ha explicado nunca. Son 2 de los 11 y cuestan 4 filas de tabla |
| ¿El retablo gana «mi mano» en el marcador? | **Sí, pero en su propia fase (la 4).** Quien juega en el retablo no ha visto un naipe en su vida, así que es el que más lo necesita; y es lo único de este encargo que añade un trozo de pantalla que hoy no existe, así que es lo único que puede esperar sin dejar nada a medias |
| ¿La guardia con dos textos? | **Sí, y con el comprobador que los ata a la regla.** El texto de hoy entra en la fase 1; el de después entra el día que el ladrón cambie `jugarLaGuardia`, y hasta ese día el comprobador se pone rojo si alguien lo adelanta |
| Lo que hay que mirar con ojos, y no puede medir nadie | Si el cartel al pie estorba al construir en la fila de abajo del delta (no come punteros, pero tapa); si trece puntos se leen en un SE de verdad; y si el cartel apareciendo y desapareciendo con el cursor por la mano molesta. En el banco `escritorio/banco3d.html` y, para lo tercero, en un teléfono |

## 12. El orden, en fases que se empujan una a una

Cada fase deja el juego entero y verde. Ninguna depende de la siguiente, y las tres primeras
se pueden parar en cualquier punto sin dejar nada roto.

1. **El texto y su comprobador. Sin nada en pantalla.** Las tres columnas en
   `RetratoDeLaCarta`, las veintidós frases en `RETRATO_DE_LA_CARTA` y `RETRATO_DEL_PREMIO`
   compuestas con las siete constantes, el campo en `CartaDelMazoEnTres` y en `CartaDelMazo`,
   `cartasEnTres` y `premiosEnTres` rellenándolo, y las seis comprobaciones del §7 en
   `verify:riberas-en-tres` (la 6, la vacuna de la guardia, con el texto de HOY). Al acabar,
   el texto existe, viaja al naipe, está vigilado y no se ve. Es la fase que hace que las
   otras tres sean cortas.
2. **El cartel en el escritorio.** La entrada `onSenalar` en `ManoDelMazo` y en `Delta`,
   cableada desde los `onPointerOver` y `onPointerOut` que ya existen; el estado en
   `riberas-en-tres.tsx`, que es el de la carta cogida (`cartaDelMazo`) con la señalada como
   respaldo y la precedencia del §4; el cartel dentro de `RECUADRO_DEL_LIENZO` con su regla
   en `estilo.css`, `pointer-events: none` y `aria-live="polite"`; y la lista
   `.riberas-solo-apoyo` con una fila por naipe. Las dos comprobaciones del §7.7 en
   `verify:escritorio`. Es la fase que contesta la frase que Miguel dijo, literal.
3. **El cartel en la app.** Lo mismo con `cogidaDelMazo`, dentro de la vista del `Canvas`,
   con `pointerEvents="none"` y `accessibilityLiveRegion="polite"`, y las filas `accessible`.
   Se prueba EN EL APARATO, porque el panel del navegador no pulsa igual que un dedo: coger un
   naipe apagado y leer el cartel, soltarlo con el segundo toque, y comprobar que un toque
   sobre el sitio del cartel construye en el delta que hay debajo.
4. **La mano por clases en el retablo.** La fila nueva del marcador en las dos pantallas, con
   `retratoDeLaCarta` y `manoDelMazoPorFamilias`, y los dos premios. Es la única fase que
   añade pantalla nueva, y por eso va la última de las que entran hoy.
5. **La guardia después del ladrón.** Una fila de tabla y una comprobación que cambia de
   sentido, el día que `docs/EL-LADRON-DE-RIBERAS.md` aterrice. No se adelanta: el
   comprobador del §7.6 no deja.
