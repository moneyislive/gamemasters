# La ciudad de El Burgo: la traza

> Si esto no coincide con el código, gana el código. Se comprueba con
> `npm run compilar:burgo -w escenas`, `npm run verify:burgo-modelos -w escenas`,
> `npm run verify:burgo-escena -w escenas` y `npm run verificar`, mirando el **código de
> salida** y nunca la última línea.

Este documento **revoca** la geometría, el atrezo y el presupuesto de `DISENO-2.md` §5.1 y
§5.2. Lo que de aquella parte SIGUE valiendo y no se toca: los dados, las cartas, las
coreografías y el contrato de props (`escenas/burgo/tipos.ts`).

Lo escribe el equipo de la traza para los dos que vienen detrás: el que hace **el anillo**
(§2 y §3) y el que hace **la ciudad** (§4 a §8). Todos los números de aquí están medidos, no
supuestos, y dicen contra qué se midieron.

---

## −1. La escala, que es lo que manda sobre todo lo demás

La primera versión de este tablero tenía un centro de **72 × 72** cerrado por una muralla. La
segunda lo llevó a 288 —cuatro veces— y se quedó corta. La orden que manda sobre ésta es
literal, y es un mínimo, no una preferencia:

> «El tablero debe ser una ciudad enorme, por lo menos 9-10 veces el tamaño que tiene ahora
> mismo la zona central.»

Nueve veces 72 son **648**, y 648 es el recinto. No se eligió por redondo: se eligió porque
es el mínimo que cumple lo pedido, y además cae clavado en las dos retículas que ya existían:

```
  648 = 54 × 12    →  cincuenta y cuatro celdas de la retícula de la ciudad, sin resto
  648 =  9 × 72    →  nueve casillas de frente por lado, la proporción de un tablero de mesa
```

De ahí sale todo. Y de ahí salen también **las tres cosas que NO se multiplican por 2,25**,
que son las que costó trabajo ver y las que hay que respetar:

| Lo que crece con el tablero | Lo que NO crece, y por qué |
| --- | --- |
| Las cuatro bandas de la casilla (§2) | **El carril del avatar**: se mide en peones (1,272) y aventureros (2,543), y esas piezas siguen midiendo lo mismo |
| El alto del precio, 12 → **27** (§2) | **Los umbrales de nivel de detalle** (§8): salen de píxeles por unidad a una distancia, no del tamaño del tablero |
| La esquina, 48 → **108** (§2) | **La velocidad de la marcha**… que precisamente por no crecer sola hay que subirla a mano (§7) |
| El claro del Concejo y la corona del campo (§8) | **Las piezas del pack**: un `cuerpo-h` mide 12,04 aquí y en la ciudad |

---

## 0. De dónde sale cada número

Tres medidas mandan sobre todas las demás, y ninguna se eligió: las tres salieron de pasar
`@gltf-transform` por los 1.154 `.gltf` de los ocho packs.

| Qué | Cuánto | Medido contra |
| --- | --- | --- |
| Una persona | **2,543** unidades | `escenas/escala.ts`, la cadena del tablero de Riberas |
| El módulo de sala | **4** unidades (2,83 m) | `restaurant-bits/wall` 4,000 × 4,000 × 0,500 y `floor_kitchen` 4,000 × 0,500 × 4,000; `dungeon/floor_tile_large` 4 × 4; `halloween-bits/fence` 4 de largo |
| La retícula de la ciudad | **12** unidades (8,49 m) | las siete losas del City Builder miden 2,000 × 2,000 en el pack, y 2 × `ESCALA_DEL_URBANISMO` (6) = 12 |

Y de ahí, la altura de planta: la del pack mide **0,75** (`building_C`, `D`, `E`, `F` y `G`
sin base miden 2,250 = 3 × 0,750 clavado), y 0,75 × 6 = **4,50**, que es el módulo de sala
(4) más el grueso de la losa (0,5). O sea: **las ventanas de la fachada del pack caen
exactamente en los pisos que se construyen dentro**. Esto no se forzó; salió al medir, y
`verify:burgo-modelos` lo vigila con el cuerpo C.

La retícula de 12 es además **tres módulos de sala**. Una parcela de ciudad es, por dentro,
un damero de 3 × 3 salas. Una unidad del mundo son **0,7075 m**.

### La losa de carretera, por dentro

Medido vértice a vértice sobre `road_straight.gltf` (x y z de −1 a +1, centrada en el
origen). En unidades del **mundo**, ya multiplicado por 6:

```
  ancho de la losa .................. 12,00   (de −6,00 a +6,00)
  bordillo (acera alzada) ...........  0,60   a cada lado, de |x| = 5,40 a 6,00
  calzada entre bordillos ........... 10,80   (7,64 m)
  carril ............................  5,40   (3,82 m); su eje a |x| = 2,70
  línea de eje ...................... a |x| < 0,12, a trazos de 1,20 cada 2,40
  líneas de carril .................. a |x| de 3,48 a 3,72
  altura del asfalto ................  0,42   (y = 0,070 en el pack)
  altura del bordillo ...............  0,60   (y = 0,100 en el pack)
```

Y las medidas del pack que se van a repetir mucho, ya en unidades del mundo, con sus
triángulos medidos en `burgo.glb`:

| Pieza | Caja (ancho × alto × fondo) | Triángulos |
| --- | --- | --- |
| `calzada` | 12,00 × 0,60 × 12,00 | 58 |
| `calzada-paso` (cebra) | 12,00 × 0,60 × 12,00 | 64 |
| `calzada-cruce` | 12,00 × 0,60 × 12,00 | 170 |
| `calzada-te` | 12,00 × 0,60 × 12,00 | 138 |
| `calzada-curva` | 12,00 × 0,60 × 12,00 | 152 |
| `calzada-curva-suave` | 12,00 × 0,60 × 12,00 | 172 |
| `solera` (parcela) | 12,00 × 0,60 × 12,00 | 60 |
| `bloque-a` / `cuerpo-a` (2 plantas) | 12,00 × 9,90 × 12,00 / 7,24 × 9,30 × 8,70 | 828 / 435 |
| `bloque-c` / `cuerpo-c` (3 plantas) | 12,00 × 17,86 × 12,00 / 7,24 × 13,50 × 7,80 | 1.020 / 666 |
| `bloque-h` / `cuerpo-h` (4 plantas) | 12,04 × 18,30 × 12,00 / 12,04 × 17,70 × 7,80 | 1.885 / 1.333 |
| `coche-berlina` | 2,51 × 2,21 × 5,63 | 1.222 |
| `coche-taxi` / `coche-patrulla` | 2,51 × 2,61 × 5,63 | 1.256 / 1.316 |
| `farola-de-calle` | 1,62 × 5,76 × 0,41 | 176 |
| `semaforo-c` (brazo sobre calzada) | 4,79 × 5,82 × 1,63 | 444 |
| `banco-de-calle` | 2,40 × 0,60 × 0,90 | 44 |
| `arbusto` | 1,14 × 2,28 × 1,20 | 72 |
| `papelera` | 0,76 × 0,31 × 0,80 | 18 |
| `pino` (medio) | 3,33 × 5,87 × 3,12 | 318 |
| `verja` (cementerio) | 4,00 × 2,20 × 0,50 | 380 |
| `tumba` | 2,00 × 2,13 × 1,00 | 323 |
| `silla` | 0,75 × 1,21 × 0,80 | 428 |
| `mesa-redonda` | 3,00 × 1,00 × 3,00 | 312 |
| `sofa` | 3,00 × 1,22 × 1,60 | 636 |
| `cama` | 3,10 × 1,00 × 3,00 | 540 |
| `tesela` (el campo de fuera) | 10,94 × 5,47 × 12,63 | 36 |

El fichero entero: **163 piezas, 68.789 triángulos, 3.073 kB** (tope 8.192 kB).

Dos números para tener a mano al leer §8: un **bloque del pack cuesta unos 1.100
triángulos** y una **losa de calle unos 75**. Con 2.916 celdas de ciudad, ésa es toda la
aritmética del presupuesto.

---

## 1. La medida del tablero

```
  ANCHO_DE_CASILLA .......  72        FONDO_DE_CASILLA ......  108
  LADO_DE_ESQUINA ........ 108        CASILLAS_POR_LADO .....   11   (9 + 2 esquinas)
  LADO_EXTERIOR = 9 × 72 + 2 × 108 = 864         MEDIO_LADO = 432
  LADO_INTERIOR = 9 × 72 = 648                   BORDE_INTERIOR = 324
```

La ciudad es un damero de **54 × 54 = 2.916 celdas** de 12, o sea 458 × 458 metros. Una
esquina del tablero, que antes eran cuatro losas, ahora son **81 celdas: una manzana
entera**.

**La casilla 5 cae centrada en el eje.** El centro de la casilla *k* (1 a 9) de un lado está
a `72k − 360` del centro del lado; para *k* = 5 sale **0**. Las cuatro casillas 5, 15, 25 y
35 —las «Puertas» del reglamento, que no se toca— están encaradas exactamente con el eje de
la ciudad, y por ahí entran las cuatro avenidas. No es una casualidad afortunada: es lo que
hace que la traza de §3 sea simétrica y que el jugador entienda de un vistazo por dónde se
entra.

Y una consecuencia que hay que decir en voz alta antes de seguir: **con 864 de lado, el
aventurero es una ficha, no un personaje**. Mide 2,543 sobre una casilla de 72, o sea 1/28
del frente. Eso decide dos cosas —el ritmo de la marcha (§7) y el carril (§2)— y no decide
ninguna otra: dentro de la ciudad, que está a escala de persona (planta de 4,5, calzada de
10,8 entre bordillos), el mismo aventurero vuelve a ser una persona.

---

## 2. La casilla, como casilla de tablero de mesa

Miguel pidió casillas «más estilo tablero de mesa clásico, mejor definidas, y no hace falta
que pongas muchos elementos 3D». Esto es lo que eso significa en números.

Las bandas van **de dentro (el borde de la ciudad) hacia fuera (el campo)**, que es como se
mira el tablero desde la pose de salida. Distancias al centro del tablero:

```
  324 ──── 345   FRANJA DEL BARRIO     21   color del barrio, con reborde alzado 0,6
  345 ──── 354   FILETE CLARO           9   una raya del color del tablero, y = 0,20
  354 ──── 414   SUPERFICIE            60   lo que se lee y lo que se pisa
  414 ──── 432   BORDE CLARO           18   el marco exterior, y = 0,30
                                      ───
                                      108
```

Son las cuatro bandas de la escala anterior multiplicadas por 2,25 y redondeadas a entero
(9→21, 4→9, 27→60, 8→18). **La casilla crece pero se lee igual**, porque lo que la define es
la proporción entre sus bandas, no su tamaño.

- **La franja del barrio** (21 × 72) es la única que lleva el color del grupo, y lleva un
  reborde alzado de 0,6 —la altura de un bordillo, medida— en su arista interior. Es lo que
  hace que una casilla se lea como casilla y no como una loseta de suelo. Ahí, y sólo ahí,
  se posan las **casas**. Medida en pantalla desde la pose de salida: **13,0 px** en un PC
  16:9, 7,8 en una tableta 3:4 y 3,9 en el móvil de 9:19,5 con el lienzo al 58 % del alto.
  El mínimo que `verify:burgo-escena` exige son 3.
- **El filete claro** (9) separa la franja de la superficie: sin él, el color del barrio y el
  del tablero se tocan y el ojo no encuentra el borde. Su centro, a 349,5 del centro del
  tablero, es la **línea de la marcha**.
- **La superficie** (60 × 72) es el campo de la casilla. Su mitad interior lleva el precio;
  su mitad exterior, el atrezo.
- **El borde claro** (18) es el marco exterior de todo el tablero, continuo de casilla a
  casilla y por las cuatro esquinas.

### Los huecos de la superficie, en coordenadas de casilla

Origen en el centro de la casilla, `u` a lo largo del anillo (de −36 a +36), `v` radial
(distancia al centro del tablero menos 324, de 0 a 108).

| Qué | Sitio | Talla | Notas |
| --- | --- | --- | --- |
| Cuatro casas | `v` = 10,5, `u` = −18 / −6 / +6 / +18 | 2,50 × 2,54 × 2,54 cada una | en fila sobre la franja, con 12 de paso |
| La posada | `v` = 10,5, `u` = 0 | una `casa` teñida + un `estandarte` clavado (y = 2,45) | sustituye a las cuatro; no hay pieza propia (§9) |
| La bandera del dueño | `v` = 15, `u` = +30 | 2,61 × 3,63 × 1,91 | en medio de la franja, no en su borde |
| Los seis peones | `v` = 25,5, `u` = −17,5 + 7·i | 1,27 × 2,33 de huella | fila de seis, con 7 de paso |
| El nombre | arriba del blanco: su primer renglón empieza en `v` = 33, centrado en `u` | letra de **4,7**, renglones cada 7,05 | el mismo alto en las 36 laterales |
| El pie | abajo del blanco: acaba en `v` = 87, centrado en `u` | letra de **4,2** | «PRECIO 60 €», «PAGA 100 €» o «COGE CARTA» |
| El atrezo | `v` = 60 a 90 | ver abajo | la mitad exterior, sin subirse al marco |

### El carril del avatar no crece con la casilla

`CARRIL_DEL_AVATAR` va de `v = 23` a `v = 29`: **seis unidades, las mismas que antes**. No se
multiplica por 2,25 porque lo que tiene que caber dentro son un peón de 1,272 de huella y un
aventurero puesto 1,2 hacia fuera, y esas dos piezas no han cambiado de tamaño. Seis unidades
son cuatro peones y medio: sobra.

Lo que el tablero grande regala no es carril: es **sitio alrededor del carril**. Por eso la
bandera del dueño sube de `v = 6,5` a `v = 15` —el medio de la franja, que es donde de verdad
se ve— y aun así se queda a **6,34** del carril (medido con la caja real del `.glb`: el
mástil sale 1,655 por un lado, así que la bandera llega a 16,66). La vacuna del comprobador
es ponerla en `v = 22`, pegada al filete, que es el error que de verdad se comete al mover
una banda.

### El nombre y el precio, como en el tablero de mesa

Hasta el 16 de septiembre de 2026 el precio eran **dígitos gordos** —contornos propios de 25 de
alto, `CONTORNOS_DEL_GUARISMO`— en medio del blanco, y el nombre de las casillas especiales iba en la
franja de color. Ese día Miguel mandó la foto del tablero clásico y pidió lo que hace él: **el nombre
arriba del blanco y el precio abajo**, los dos centrados, el precio «ligeramente más pequeño que el
nombre», y los nombres cortos del mismo tamaño que los largos. Los treinta y seis de los lados:

```
  alto del nombre ....... 4,70   el de AYUNTAMIENTO, la palabra más ancha, en el ancho útil
  ancho útil ............ 60,48  de los 72: el 8 % de margen a cada lado
  paso de renglón ....... 7,05   vez y media el alto, que deja sitio a las tildes
  alto del pie .......... 4,20   un 10 % menos
  el nombre empieza ..... v = 33 y el pie acaba en v = 87: a 3 del blanco por los dos lados
```

**El precio ya no se lee desde la pose de salida**, y se dice aquí en vez de esconderlo: un tablero
de mesa mirado desde el otro lado de la habitación tampoco se lee. Se lee siguiendo al que mueve, que
es cuando la cámara se acerca sola, y `verify:burgo-escena` lo mide en la casilla PEOR de las treinta
y seis —las de delante y detrás, que se ven escorzadas—:

| Dónde | Nombre | Pie |
| --- | --- | --- |
| Siguiendo al que mueve, PC 16:9 | **11,9 px** | **9,4 px** |
| Acercándose del todo, móvil 9:19,5 | **6,7 px** | **5,2 px** |

La franja del barrio, en cambio, se sigue viendo desde la salida en las tres ventanas (13,0, 7,8 y
3,9 px): el color es lo que dice de quién es cada lado desde lejos.

Y las obras de las casillas especiales van **entre el nombre y el pie**, con la cámara del juego
delante: mira a 55° desde el sur, y lo alto se ve corrido hacia el fondo siete décimas de su altura,
así que en el lado de delante tapa el nombre y en el de detrás el precio. `verify:burgo-escena`
proyecta cada cara de obra con esa cámara y no deja que ningún punto de una letra caiga dentro.

### Qué atrezo lleva cada clase de casilla, y qué poco es

Esto es lo que hay HOY. Lo que estas casillas van a ser —cofre, casino, central eléctrica,
estaciones con su ferrocarril, cárcel, parking— está planeado, con su coste contado por delante,
en [LAS-CASILLAS.md](LAS-CASILLAS.md).

| Clase | Atrezo, en la banda `v = 60..90` |
| --- | --- |
| Solar de barrio (22) | **Sin edificio.** Sólo una `farola-de-calle` en la esquina de atrás (`u = −31`, `v = 84`): una pieza. Lo que sobresale de un solar son las casas y el hotel del jugador, en la franja. |
| Las cuatro Puertas (5, 15, 25, 35) | **Ninguno.** Llevaban la cebra de la avenida y sus dos semáforos en medio del blanco, y ése es ahora el sitio del edificio de viajeros de cada estación (`obras.ts`). |
| Arca del Concejo (2, 17, 33) | El emblema `arca` a `u = −14` y un `contenedor` a `u = +18`. |
| Pregón (7, 22, 36) | El emblema `pregon` y una `papelera`. |
| Molino y Pozo (12, 28) | El emblema `oficio` y una `boca-de-riego`. |
| Diezmo y Alcabala (4, 38) | El emblema `tasa` y su cifra. Sin volumen. |

**Por qué ningún edificio.** Hasta el 16 de septiembre de 2026 cada solar llevaba un frente de
manzana de DOS `cuerpo-*` a `u = ±13`, y se quitó por una razón de **lectura**, no de
presupuesto: a la talla del tablero un edificio del pack y una casa del jugador son dos bultos
del mismo tamaño compitiendo en la misma casilla, y contar las casas de un vistazo —que es lo
que se hace cien veces por partida— se volvía un ejercicio de vista. Con el frente quitado, lo
único que sobresale de una casilla es **lo que el jugador ha construido**.

La farola se queda porque no es un edificio: va al fondo, contra el marco, y lejos del carril de
las casas (`v = 10,5`), así que da escala sin disputarle el sitio a lo que cuenta. Lo que define
la casilla sigue siendo la franja de color, el filete, el marco y lo que lleva escrito: su nombre y su precio.

De propina, el tablero adelgazó al quitarlos: quedó en **172.808** triángulos en plena. Con los
NOMBRES de las casillas encima (8.525 triángulos de letras, §2 bis) iba entonces por **181.333**, de
un tope de 900.000, así que el sitio para lo que venga después seguía ahí entero (la cifra de hoy, con
lo que añadió `LAS-CASILLAS.md`, está en la cabecera de `presupuesto.ts`, que el comprobador
compara con la suma en cada pasada).

El emblema mide **27** de lado (creció con el dígito, por la misma razón) y va a `u = −14`
cuando la casilla lleva pieza, centrado cuando no.

### 2 bis. El nombre de la casilla, y de dónde salen sus letras

Las treinta y seis casillas de los lados llevan su **nombre entero arriba del blanco** y su **pie
abajo** (§2): CALLEJÓN DE LAS LATAS y PRECIO 60 €, CAJA DE COMUNIDAD y COGE CARTA, IMPUESTO SOBRE EL
CAPITAL y PAGA 200 € O 10 %. Los nombres de las especiales son los del tablero clásico por decisión de
Miguel (ver la nota del reglamento); el código sigue llamando a algunas `arca`, `pregon`, `diezmo` o
`alcabala` por dentro, y el §0.3 del reglamento lo deja así a propósito.

**Un solo alto para todos los nombres**, el de la palabra más ancha —una palabra no se parte—, y los
renglones partidos en los menos posibles y, de ésos, en los más iguales: «CALLEJÓN DE / LAS LATAS» y
no «CALLEJÓN DE LAS / LATAS». Cada letra se agarra **por el centro de su avance**, no por su caja,
que es lo que hace que quede ópticamente centrada.

Y **deja margen**. Lo pidió Miguel viendo el tablero —«los textos tienen que tener un margen para que
queden estéticos, ahora mismo ocupan de extremo a extremo»—. En una lateral es el 8 % de la casilla a
cada lado (**60,5** de los 72): con un solo alto para los treinta y seis, cada punto de margen es un
punto de letra para todos, y al 12 % el nombre se quedaba en 4,3. En una esquina es el 12 % de la
diagonal (**96,7** de los 127,3). El margen no se cree: `verify:burgo-escena` toma la caja de cada
letra puesta —su avance real, no su alto— en las coordenadas de su casilla y comprueba que no entra
en él, con su vacuna delante.

**Una esquina lo escribe en diagonal**, porque no tiene franja: su suelo es un cuadro de 90 (de
324 a 414) y el renglón va por su diagonal, que es además desde donde se mira una esquina. Ahí el
hueco **no es el lado**: un cuadro girado un octavo es un rombo, y a `α` del centro quedan
`L√2/2 − |α|` a cada lado, así que lo que tiene que caber es **`ancho + alto ≤ L√2`**. Con el
lado —que fue el primer intento— la palabra cabe de mentira y se sale por los picos, justo donde
el tablero levanta su marco. `verify:burgo-escena` mide la caja de cada letra puesta, por sus
cuatro esquinas, contra el rombo de verdad.

**Las letras salen de un tipo de verdad.** Los contornos se extraen de
`arte/tipos/Cinzel_700Bold.ttf` —la familia con la que la app titula, con su licencia SIL OFL al
lado— **al compilar**, con `opentype.js` como dependencia sólo de compilación. Treinta y nueve
glifos: mayúsculas, eñe, vocales acentuadas, diéresis, apertura de interrogación y de admiración,
puntuación, los diez dígitos, el euro y el tanto por ciento. **Cambiar el juego de idioma es declarar sus caracteres en el charset de
`escenas/scripts/compilar-iconos.ts` y volver a compilar**; si el tipo no trae alguno, el
compilador se para y dice cuál en vez de emitir un hueco.

Por qué el arte acaba siendo código y no se lee el `.ttf` en caliente: Metro no sabe traer un
fichero como texto y **en React Native no existe `DOMParser`**, así que un tipo analizado al
arrancar se vería en el escritorio y saldría **vacío en la app**, sin un error en ninguna consola.

Cuestan **81 triángulos por glifo** de media, con las curvas a TRES tramos. Fueron seis —155 de
media— hasta que el tablero llevó nombre y precio en las treinta y seis laterales: pasó de 206 letras
a más de mil, y la calidad sobria se iba a 280.000 con un tope de 230.000. Bajar los tramos era la
palanca que esta nota dejaba apuntada, y a la talla de un nombre tres no se distinguen de seis. No
cuestan ninguna llamada de dibujo: van fundidas en una sola geometría con los emblemas, los carteles
y el neón de los casinos.

### Las cuatro esquinas (108 × 108 = 9 × 9 celdas de retícula)

Nada medieval. Cada esquina es ahora una **manzana urbana entera** de 81 celdas. La ele de
la marcha —entra por `v = 349,5`, sale por `u = 349,5`— se come las celdas `a ≤ 2` de los dos
brazos, así que las **nueve celdas del rincón interior sólo admiten suelo**: una cebra, una
acera. Quedan setenta y dos celdas libres.

- **Salida (0, sureste)**: **ninguna pieza**. Fue un cruce urbano entero —seis cebras, un
  `calzada-cruce`, cuatro farolas, dos semáforos, un taxi y una berlina— hasta que Miguel pidió
  lo contrario: «en vez de fragmentos de carretera únicamente una flecha roja y el mensaje del
  tablero con SALIDA en grande». Y tiene razón de fondo: la salida no es una calle, es la casilla
  por la que se pasa cuarenta veces por partida y en la que se cobra; lo que hay que ver desde el
  otro lado de la mesa es eso y no un semáforo. Quedan **SALIDA** escrito por la diagonal (101 de
  ancho, 18,4 de alto: el rótulo más grande del tablero) y el emblema `flecha`, ahora **rojo**
  (`#b3261e`) y de 28, en el pico de fuera —por el de dentro cruza la ele de la marcha y ahí se
  planta el peón de quien acaba de mover—. **Cero piezas**: las dos cosas van fundidas con los
  precios y los emblemas, o sea en la llamada de dibujo que ya se pagaba.
- **La cárcel (10, suroeste)**: era una manzana de pisos con el patio vallado —cuatro bloques del
  pack— y desde el aire eso no es una cárcel, es cualquier otra esquina del recinto. Miguel pidió
  «una cárcel de verdad», y lo que la hace serlo desde arriba no es el edificio sino tres cosas:
  el **muro** (1,6 de grueso, 7 de alto, por fuera de las dos verjas), las dos **torretas de
  vigilancia** (5 de lado, 17 de alto, con tejadillo que vuela 1,4) y los seis **barrotes** de la
  cara del pabellón que da al patio. Más dos pabellones y un ala que cierran el patio por sus
  otros tres lados, y el patio de hormigón. Todo eso lo levanta `obras.ts` en código.
  **Lo que sigue siendo pieza del pack es lo que se mueve o ya estaba instanciado**: los cuatro
  tramos de `verja` y sus dos `verja-puerta` —una sube al encerrar a un peón— y los dos
  `coche-patrulla`, aparcados sobre el suelo del tablero.
  El patio NO se tocó: sigue siendo la celda (6, 6) de la retícula (12 × 12, centro 402, 402),
  porque ahí dentro caen los seis huecos de preso.
  **Sin calle.** Tuvo delante una calle con su cebra, dos semáforos y cuatro farolas, y el suelo del
  patio y del aparcamiento empedrado; por eso su nombre iba sobre la solera, a 0,66, para no quedar
  debajo del pavimento. La calle cruzaba el nombre y el texto pequeño por la diagonal, y Miguel la
  quitó el 16 de septiembre de 2026: «quita los trozos de carretera tanto de la comisaría como de la
  cárcel para que se vea bien el texto». El nombre vuelve a 0,08, como en las demás esquinas, y el
  patio a ras.
- **El aparcamiento (20, noroeste)**: era una plaza arbolada con tres terrazas hasta que Miguel
  pidió «un parking que se vea real … con un cartel visible desde arriba que ponga PARKING». Hoy
  la esquina ENTERA es el aparcamiento: el asfalto cubre su cuadro de suelo menos el rincón de
  dentro, que se queda de zona verde con dos `pino-pequeno` y un `arbusto` —sin ese recorte los
  árboles saldrían plantados en alquitrán—. En el cuadro de fuera van **cuatro hileras de quince
  plazas** de 3,6 × 7 (la medida sale del coche del pack: 2,51 × 5,63), espalda contra espalda y
  con su calle de 14 en medio. El nombre va en **blanco** sobre el asfalto y las rayas en
  **amarillo**, porque dos blancos sobre negro se pelean; y las rayas se CORTAN a 2,5 de los dos
  renglones, que cruzan la mitad de dentro en diagonal. Quedan treinta y dos plazas enteras, y de
  ésas dieciocho a la vista: en ellas, **nueve coches**, porque un aparcamiento lleno se lee como un
  atasco y uno vacío como una pista de tenis. Y el cartel es un panel TUMBADO de 22 × 22 sobre un
  poste de 13, con PARKING impreso encima —un panel a plomo, que es como son los de la calle, desde
  un tablero no se ve—, al **fondo** de la diagonal y detrás del texto pequeño: en el carril de
  entrada tapaba letras desde arriba y desde la cámara, que lo ve corrido 9 hacia el fondo.
- **La comisaría (30, noreste)**: el **edificio**, un cuerpo de 28 × 28 al fondo de la esquina con
  su porche de dos columnas y el **farol azul** encima, que es lo único que dice «policía» desde
  lejos; y delante, el `coche-patrulla` aparcado con el morro hacia la cárcel —mirando allá cuenta
  lo que hace esta casilla mejor que ningún edificio—, un arbusto y una papelera.
  Y la **celda**, que Miguel pidió ver: un cubículo de 12 × 12 con tres paredes, cinco barrotes
  con su dintel y **sin techo**. Eso último no es un olvido: en un tablero que se mira desde el
  aire, un calabozo cerrado es una caja opaca en la que no se ve entrar a nadie.
  Los dos bancos y la papelera que había a ese lado se fueron cuando llegó el edificio: los habría
  enterrado dentro de una pared.
  **Sin avenida y sin flecha.** Hasta el 16 de septiembre de 2026 fue una avenida de dos carriles
  (24 de ancho) con sus cebras, dos `semaforo-c`, cuatro farolas, sus aceras, una berlina, un taxi y
  una `flecha` apuntando a la 10. La avenida cruzaba ¡A COMISARÍA! y RETENIDO por la diagonal, y
  Miguel la quitó con la flecha, igual que la calle de la cárcel. Con ella se fue el arbusto que se
  quedaba solo encima del nombre. El paso por el que el peón corre a la celda sigue en su sitio:
  nació para esquivar una farola y un arbusto de la avenida, y el camino por él sigue libre.

### 2 quater. Las obras: volumen construido en código, y por qué no con piezas del pack

El asfalto del aparcamiento, sus rayas y su cartel no son piezas: los describe `burgo/obras.ts`
cuadro a cuadro —sin `three`— y `ciudad-en-3d.ts` los funde en UNA malla. La razón es la moneda
que escasea: el tablero iba por 181.333 triángulos de 900.000, o sea que **triángulos sobran**;
y por 92 llamadas de dibujo de 150 en la pose de salida, o sea que **llamadas no**. Una pieza
nueva del pack cuesta una llamada para siempre —una `InstancedMesh` por pieza distinta en
pantalla—; un volumen construido en código y fundido cuesta **cero**, y las trece casillas que
faltan por amueblar cabrán en esa misma malla.

Con una trampa que conviene tener escrita: el marco de una casilla lleva `(u, v)` al mundo con
**determinante −1** —en la esquina de la salida, `x = v` y `z = u`—, o sea que es un reflejo, y
una cara que se recorre al derecho en el plano sale del revés en el mundo. Como el material es
`FrontSide`, una cara del revés no falla: **desaparece**, que es lo que pasó con los tejados de
la ciudad entera. Por eso `verify:burgo-escena` no juzga el código sino que MIRA: una rejilla de
rayos verticales sobre las obras, y la cara horizontal más alta que cada rayo encuentra tiene que
mirar al cielo —con su vacuna, que voltea la de arriba y las caza todas—.

Ninguna pieza que no sea suelo puede pisar la ele engordada `HOLGURA_DE_LA_MARCHA` (2), y
ninguna puede salirse del cuadrado de 108. Las dos cosas las mide `verify:burgo-escena` con
la caja real del `.glb` — y ahí se cazó una trampa que conviene anotar: **`bloque-d` mide
12,123 de ancho y los `e`..`h` 12,04**, así que ninguno de ésos puede ir centrado en la celda
8 (se saldría por seis centésimas). En la celda 8 sólo van los de 12 justos.

---

## 3. La retícula de la ciudad

La celda es **12 × 12**. La ciudad son 54 × 54 celdas, índices `i` (eje x) y `j` (eje z) de 0
a 53; el centro de la celda (i, j) está en `x = −324 + 12i + 6`, `z = −324 + 12j + 6`.

Cada celda es **una de tres cosas**, y nunca dos:

```
  CALLE      una losa de carretera del pack, orientada por sus vecinas
  PARCELA    una `solera` con lo que le toque encima
  RESERVA    suelo del distrito (pradera, tierra, asfalto, agua): geometría propia
```

### El esqueleto, que es fijo, y que CRECE con el recinto

Con 24 celdas por lado, un bulevar de una celda y unas avenidas de dos eran la mitad y la
cuarta parte de una casilla. Con 54 serían hilos: doce unidades de ronda para 458 metros de
ciudad no es un bulevar, es un callejón. Las secciones suben:

```
  i, j ∈ {0, 1, 52, 53} ....... BULEVAR DE CIRCUNVALACIÓN     2 celdas = 24
  i, j ∈ {25, 26, 27, 28} ..... AVENIDA                       4 celdas = 48
  i y j ∈ {25..28} ............ GLORIETA                      48 × 48
```

- El **bulevar** es una calle, no una ronda de muralla: no hay muralla, no hay nada que
  rodear. Es el borde urbanizado de la ciudad y separa la ciudad del anillo del tablero. Dos
  losas: cuatro carriles, dos por sentido, con aparcamiento en línea en el bordillo interior.
- Las **avenidas** son de cuatro losas. Las dos centrales, puestas una al lado de otra, se
  encuentran por sus bordillos interiores: **eso es la mediana**, y ahí van los árboles
  (`pino-pequeno` cada 3 celdas) y las farolas (cada 2 celdas, alternando lado). Ocho
  carriles en total, cuatro por sentido.
- Las cuatro celdas de la avenida **caen simétricas respecto del eje** (25+28 = 26+27 = 53):
  su eje es `x = 0`, que es el centro de las casillas 5, 15, 25 y 35. `verify:burgo-escena`
  lo afirma, porque una avenida asimétrica entra torcida por su Puerta y nadie lo ve hasta
  que se mira una captura.
- La avenida (48) es más estrecha que la casilla (72): quedan **12 de acera a cada lado**,
  que es donde se plantan los dos semáforos de la Puerta.
- **La glorieta**: las dieciséis celdas centrales forman un anillo de 48 × 48 con una isleta
  de 24 × 24 en medio (`calzada-curva-suave` en las esquinas, `calzada` en los tramos). En la
  isleta, geometría propia: un pedestal octogonal (16 triángulos) con la `figura` de un
  aventurero encima, y un cantero de `arbusto` alrededor.

Eso deja **cuatro cuadrantes de 23 × 23 celdas** (276 × 276 unidades, 195 × 195 m, 529
celdas cada uno). Antes eran de 10 × 10. La diferencia entre «cuatro bloques» y «una ciudad»
está justo ahí, y es la que permite §4.

```
                 j
        0  1  2        24 25 26 27 28 29       51 52 53
      +-----+-------------+-----------+-------------+-----+
   0  |            b u l e v a r  (2 celdas)              |
   1  |                                                   |
      +-----+-------------+-----------+-------------+-----+
   2  |     |  CUADRANTE  |           |  CUADRANTE  |     |
      |  b  |     NO      |  avenida  |     NE      |  b  |
  24  |     |   23 x 23   | 4 celdas  |   23 x 23   |     |
      +-----+-------------+-----------+-------------+-----+
  25  |          a v e n i d a       GLORIETA             |
  28  |                              48 x 48              |
      +-----+-------------+-----------+-------------+-----+
  29  |     |  CUADRANTE  |           |  CUADRANTE  |     |
      |  b  |     SO      |  avenida  |     SE      |  b  |
  51  |     |   23 x 23   |           |   23 x 23   |     |
      +-----+-------------+-----------+-------------+-----+
  52  |            b u l e v a r                          |
  53  |                                                   |
      +-----+-------------+-----------+-------------+-----+
   i
```

### Cruces, esquinas y finales: la regla que los resuelve todos

Una celda de calle mira a sus cuatro vecinas y se elige sola. No hay tabla de casos escrita a
mano; hay una regla, y por eso no puede haber un cruce mal resuelto:

| Vecinas de calle | Pieza | Giro |
| --- | --- | --- |
| 4 | `calzada-cruce` | 0 |
| 3 | `calzada-te` | el tronco mira al lado sin vecina |
| 2 opuestas | `calzada` | según el eje |
| 2 en ángulo | `calzada-curva` | hacia el cuadrante que las une |
| 1 | `calzada` | según el eje, y en el extremo una `solera` de fondo de saco |
| 0 | no puede pasar: una calle suelta es un error de la traza y el comprobador lo dice |

**El paso de cebra** (`calzada-paso`) sustituye a la `calzada` en las celdas que tocan un
cruce: la inmediatamente anterior a toda celda de 3 o 4 vecinas, en los cuatro brazos. Eso
pone las cebras donde estarían, sin decidir ninguna a mano.

**Los semáforos** van sólo en los cruces de 4 vecinas donde al menos una de las calles es
avenida o bulevar: cuatro `semaforo-c` por cruce, uno por brazo, con el brazo sobre la
calzada. En los cruces de calle con calle, nada (una ciudad no tiene un semáforo en cada
esquina, y poner uno donde no toca es justo lo contrario de «detalles bien organizados»).

**Las farolas** van en el bordillo, a 5,70 del eje de la calzada, cada **2 celdas** (24
unidades) y alternando lado: nunca dos enfrentadas. En las avenidas van en la mediana.

**La acera** no es una pieza: es el bordillo de la losa de calle (0,60 de alto, 0,60 de
ancho) más el borde libre de la parcela vecina. Un `cuerpo-*` mide de 7,24 a 12,04 de frente
sobre una parcela de 12: quedan de 0 a 4,76 de acera. **Regla**: un `cuerpo-*` se centra en
su parcela y se arrima al frente de manzana dejando **2,4** de acera libre; el que mide 12,04
de frente (`cuerpo-e`, `f`, `g`, `h`) va con `bloque-*` (que trae su propia parcela) y no con
`cuerpo-*`.

### Las calles secundarias de cada cuadrante

Un cuadrante de 23 celdas se parte con **cuatro calles por eje**, y sus sitios los sortea la
semilla: 23 = a + 1 + b + 1 + c + 1 + d + 1 + e con a..e ≥ 3, que da **35 repartos por eje**
y **1.225 tramas por cuadrante**. Manzanas de 3 a 7 celdas (36 a 84 unidades, 25 a 59 m de
fondo): manzanas urbanas de verdad, y ninguna igual a la de al lado.

Los cuadrantes que albergan un distrito de los grandes (§4) **no llevan calles interiores**
en la parte que ocupa ese distrito: un parque no tiene calles dentro.

---

## 4. Los distritos

Con 288 de recinto cabían ocho áreas. Con 648 caben **dieciséis**, y Miguel pidió
expresamente «todo tipo de áreas que pueda tener una ciudad». Están todas, y cada una tiene
un tamaño que sale de lo que hay que meter dentro, no de lo que sobra.

### Cómo se reparten, y por qué siempre tiene sentido

Cuatro **familias** de distritos, una por cuadrante. Van en familias y no sueltos porque lo
que hace verosímil una ciudad no es qué hay, sino **qué hay al lado de qué**.

| Familia | El grande (esquina exterior del cuadrante) | Los medianos | El tejido |
| --- | --- | --- | --- |
| **MOTOR** | **CIRCUITO DE CARRERAS**, 12 × 12 celdas (144 × 144) | **POLÍGONO** 8 × 10, **OBRA EN CONSTRUCCIÓN** 3 × 4, **GASOLINERA** 2 × 3 | naves y bloques bajos sin acera |
| **COMERCIO** | **CENTRO COMERCIAL** con aparcamiento, 8 × 8 (96 × 96) | **ESTADIO** 8 × 9, **ESTACIÓN** con playa de vías 4 × 14, **FERIA** 6 × 6 | restaurantes y ocio: bajos comerciales, terrazas |
| **VERDE** | **PARQUE**, 10 × 13 celdas (120 × 156) | **HOSPITAL** 5 × 6, **COLEGIO** con patio 5 × 5 | vivienda alta: bloques de 3 y 4 plantas mirando al parque |
| **REPOSO** | **CEMENTERIO**, 7 × 9 celdas (84 × 108) | **CANAL Y MUELLES** 3 × 20 pegado al bulevar, **BARRIO DE CHALETS** 8 × 10 | ensanche residencial denso, bloques de 2 plantas |

La colocación **no es libre**: la semilla elige el cuadrante de MOTOR (4 posibilidades) y
COMERCIO cae en el **diagonalmente opuesto** —el ruido lejos del ocio—; luego un bit decide
si VERDE va a la izquierda o a la derecha de MOTOR, y REPOSO ocupa el que queda. **Ocho
disposiciones**, todas con sentido, ninguna con el cementerio pegado a la terraza del
restaurante ni el circuito debajo de las ventanas del centro comercial.

Dentro de su cuadrante, el distrito **grande** ocupa siempre la esquina exterior (la que toca
las dos calles del bulevar), porque lo que necesita silencio o superficie se va del centro, y
lo que paga el suelo caro se queda en él. Los **medianos** se reparten por los tres cuartos
que quedan con dos reglas: el que hace ruido o huele (polígono, obra, estación, cementerio)
va pegado al bulevar; el que la gente usa a pie (hospital, colegio, feria, muelles) va hacia
la avenida. Es la regla que ordena una ciudad de verdad.

### La altura, que es la regla que más se ve

La altura de un bloque la decide su distancia de Chebyshev al centro de la ciudad, en celdas
(`d = max(|i − 26,5|, |j − 26,5|)`):

```
  d <=  7        TORRES         6 a 14 plantas, geometría propia (§6)
   8 <= d <= 16  MEDIA ALTURA   `bloque-c/d/e/f/g` (3 plantas) y `bloque-h` (4)
  17 <= d        BAJA           `bloque-a` y `bloque-b` (2 plantas)
  + 1 planta si el bloque da a una avenida o al bulevar
  − 1 planta si el bloque da a un parque, al cementerio o al canal (y nunca baja de 2)
  − 1 planta si a la parcela le toca DESCOLGARSE (42 de cada 100, y nunca baja de 2)
```

Los tres tramos son los de antes multiplicados por 2,25 y redondeados, por la misma razón que
las bandas de la casilla: lo que se ve es la SILUETA, y la silueta es una proporción. Sale
sola la que tiene una ciudad —alta en el centro, bajando hacia el borde, con las avenidas
marcadas por una cornisa más alta— y sale **igual en las seis pantallas de la mesa**, porque
no depende de nada más que de la posición.

**Y por eso hizo falta el descuelgue.** Una función de la distancia da el MISMO número a todas
las parcelas que están a la misma distancia, y ésas son un anillo entero de la ciudad: la
regla decía la verdad sobre la silueta grande y mentía sobre la pequeña. En la manzana, todos
los tejados a la misma cota, y una manzana de tejados a la misma cota vista desde el aire es
una losa con juntas pintadas:

> «además todos son muy repetidos»

Así que cerca de dos de cada cinco parcelas bajan una planta de lo que les tocaba. Cuál baja
lo dice `pulsoDeLaParcela`, un revoltillo entero de `(i, j)` — **del sitio, no del sorteo**:
la misma parcela da el mismo tejado en las seis pantallas, hoy y el día que alguien meta un
distrito nuevo que gaste el chorro de `azar()` de otra manera. Y baja, nunca sube, porque
subir se comería el escalón de la avenida, que es lo que hace que las avenidas se lean desde
el aire.

### Qué pieza de las ocho, y con qué regla

El pack trae ocho bloques y ninguno se puede teñir (el color va horneado en el atlas, y el
horno no reserva máscara para ellos). El **carácter** de un distrito, entonces, no lo da el
color del edificio: lo dan **qué modelos**, **qué mobiliario** y **qué arbolado**.

Y **la lista de cada distrito tiene modelos de dos alturas**, que es lo que salva la silueta.
El ensanche decía `a, b` y el barrio de chalets decía lo mismo: las dos letras de dos plantas.
Como el modelo se elige filtrando la lista por las plantas que pide el sitio, cuando el sitio
pedía tres no había ninguna, el filtro se quedaba vacío y volvía a caer en `a` o `b` — así que
el tejido más grande de la ciudad salía **entero de dos plantas y de 9,30 clavado**, casa por
casa. Con dos alturas en la lista, el escalón y el descuelgue tienen dónde caer; y cuando el
distrito no llega a la altura que se pide, se coge **la más cercana**, no la lista entera.

| Distrito | Modelos | Mobiliario | Arbolado |
| --- | --- | --- | --- |
| Centro | torres propias + `bloque-g`, `bloque-h` | `semaforo-c`, `farola-de-calle` doble, `papelera` cada celda | `arbusto` en alcorque, cada 2 celdas |
| Ensanche residencial | `bloque-a`, `bloque-b` (2 plantas), `bloque-c`, `bloque-d` (3) | `farola-de-calle`, `contenedor` uno por manzana, `boca-de-riego` en esquina | `pino-pequeno` cada 3 celdas |
| Restaurantes y ocio | `bloque-c`, `bloque-e`, `cuerpo-c`, `cuerpo-e` | terrazas: `mesa-pequena` + 2 `silla` en la acera, `farola-de-calle` cada celda | `arbusto` en jardinera |
| Centro comercial | nave propia + aparcamiento | 40 plazas pintadas, 20 coches, 10 `farola-de-calle`, 6 `papelera` | `pino` en las islas del aparcamiento |
| Parque | ninguno | ver abajo | ver abajo |
| Cementerio | `cripta`, `sarcofago`, `losa-conmemorativa` | ver abajo | `arbol-seco`, `arbol-seco-mediano` |
| Polígono | `bloque-f`, `bloque-h` sin acera + naves propias | `palet`, `bidon`, `contenedor`, `torre-de-agua`, `chatarra`, `perfiles` | ninguno |
| Circuito | gradas propias | quitamiedos propio, 6 coches | `pino-pequeno` fuera de la valla |
| Estadio | grada propia en anillo | 4 `torre-de-agua` como torres de luz, vallas de `verja` | `arbusto` en el perímetro |
| Hospital | `bloque-g` en U + porche propio | ambulancia (`coche-familiar`), 12 plazas, `banco-de-parque` | `arbusto` y `pino-pequeno` en el jardín |
| Colegio | `bloque-a` en L | patio propio con líneas pintadas, `verja` alrededor, `banco-de-parque` | `pino` en el patio, cada 4 celdas |
| Estación | marquesina propia + `bloque-e` | vías propias, andenes propios, `banco-de-calle` cada 8, `farol-de-pie` | ninguno |
| Canal y muelles | `bloque-b` de almacén | `barril`, `caja`, `fardo`, `lingotes`, `sillares`, `verja-poste` de amarre | `arbusto` en el paseo |
| Feria | ninguno | `mesa-larga`, `banqueta`, `farol-de-pie`, `caja-de-jamones`, `caja-de-zanahorias` | `pino-pequeno` en el perímetro |
| Gasolinera | marquesina propia + `bloque-a` de tienda | 4 surtidores propios, 2 coches, `papelera` | `arbusto` |
| Obra | esqueleto propio (forjados sin cerrar) | `palet-cubierto`, `tablones`, `sillares`, `caja-de-obra`, `contenedor`, `torre-de-agua` de grúa | ninguno |
| Chalets | `cuerpo-a` y `cuerpo-b`, uno por parcela, retranqueados | `verja` de parcela, `banco-de-parque` en el porche, un coche por chalet | `pino` y `arbusto` en cada jardín |

**Regla contra el damero**: dentro de una manzana no puede haber tres bloques iguales
seguidos en el mismo frente, y una manzana usa como mucho **tres** modelos distintos. Se
consigue con el sorteo de la semilla y un rechazo: si el sorteo repite el anterior dos veces,
se coge el siguiente de la lista del distrito. Determinista, y no hace falta memoria.

### El parque, estilo Central Park

10 × 13 celdas = 120 × 156 unidades (85 × 110 m). Todo lo que no sea pieza del pack es
geometría propia con color por vértice.

- **Pradera**: un plano con vértices cada 12 (11 × 14 = 154 vértices, 260 triángulos), con el
  color verdeando por ruido de la semilla ±6 % de luminancia. Nunca plana del todo.
- **Sendero serpenteante**: una cinta de 3,6 de ancho que entra por una esquina y sale por la
  contraria pasando por el estanque y el templete. Es una polilínea de 40 puntos sorteados
  dentro de un pasillo, suavizada; 2 triángulos por tramo, **80 triángulos** todo el sendero.
  Con `sendero` (la baldosa del pack, 361 triángulos) harían falta 400 losetas: 144.400
  triángulos por un camino. Por eso es propio, y es el ejemplo que explica §8 entera.
- **Estanque**: un disco de 24 sectores (24 triángulos) hundido 0,3, con el mismo material de
  agua que ya usa la escena (`escenas/aguas.ts`). Diámetro 48.
- **Arboleda**: `pino-grande`, `pino`, `pino-pequeno` y `pino-rojo` en grupos de 3 a 7,
  **nunca en línea**, con la separación mínima de 4 entre troncos, y siempre a más de 6 del
  sendero. Entre **160 y 190 árboles** (el parque es 2,6 veces el de antes).
- **Bancos**: `banco-de-parque` a los lados del sendero, mirándolo, cada 18 a 24 unidades, y
  siempre por parejas enfrentadas cuando el sendero se ensancha.
- **Farolas**: `farola-de-parque` a lo largo del sendero cada 24, alternando lado.
- **Templete**: geometría propia, en el punto más alejado de las cuatro esquinas: ocho
  columnas prismáticas (48 triángulos) y un techo octogonal (16), sobre un pedestal de 3
  escalones (48). **112 triángulos**.

### El cementerio

7 × 9 celdas = 84 × 108. Cerrado con `verja` (mide 4 justos: encaja sola) y `verja-poste`
cada 4; la entrada es un `arco-de-verja` con dos `verja-puerta`, siempre en el lado que da a
la calle más ancha. Dentro: `tierra` de suelo, calles de `sendero` en cruz, la `cripta` al
fondo del eje con dos `sarcofago` y una `losa-conmemorativa`, y las tumbas en **filas
alineadas** —`tumba`, `tumba-llana`, `lapida`, `hito`, `hito-b`— con 3 de paso entre filas y
2,5 entre tumbas, todas mirando al mismo lado. Un cementerio es lo más ordenado que hay en
una ciudad: nada de dispersión aleatoria. Entre las filas, `arbol-seco` y
`arbol-seco-mediano` cada 4 o 5 huecos, y `farol-de-pie` en los cruces.

### El polígono, la obra y la gasolinera

- **Polígono**, 8 × 10 celdas. Suelo de `solera`. Cuatro naves de geometría propia (una caja
  de 36 × 9 × 24 con un frente de portones, 40 triángulos cada una), dos `torre-de-agua`,
  `palet` y `palet-cubierto` en pilas de 2 y 3 contra las paredes, `bidon` en grupos de 4,
  `contenedor` junto a los portones, `chatarra`, `perfiles`, `tablones` y `sillares` en el
  patio, y dos `coche-familiar` aparcados. Todo pegado a las paredes o alineado con los
  portones: un patio industrial ordenado, no un vertedero.
- **Obra en construcción**, 3 × 4 celdas. Un esqueleto propio: cuatro forjados de 4,5 de
  altura sobre pilares prismáticos (12 triángulos por pilar, 2 por forjado), sin cerrar. Una
  `torre-de-agua` hace de grúa a un lado, con un brazo propio de 2 triángulos. Alrededor,
  `caja-de-obra` y `caja-de-obra-grande` (20 y 32 triángulos: las piezas más baratas del
  catálogo) en una valla perimetral, `tablones`, `sillares` y un `contenedor`.
- **Gasolinera**, 2 × 3 celdas. Una marquesina propia (una losa sobre cuatro pilares: 20
  triángulos), cuatro surtidores prismáticos (8 cada uno), un `bloque-a` de tienda, dos
  coches repostando y una `papelera`.

### El circuito y el estadio

- **Circuito**, 12 × 12 celdas = 144 × 144. Un óvalo con dos rectas de 108 y dos curvas de
  radio 36, en asfalto de geometría propia: una cinta de 12 de ancho, 120 tramos, **240
  triángulos**. Encima: **quitamiedos** (otra cinta, de 1,2 de alto, por dentro y por fuera;
  2 triángulos por tramo, **960** las dos), **gradas** (tres escalones de 1,2 de alto y 3 de
  fondo a lo largo de una recta; **270 triángulos**), **seis coches** dando vueltas (§7) y una
  **línea de meta** de damero de 12 × 2,4 (2 triángulos). No se usan las barreras del Dungeon:
  son de mazmorra y costarían 90 triángulos por cada 4 unidades.
- **Estadio**, 8 × 9 celdas = 96 × 108. El césped es un rectángulo de 2 triángulos con las
  líneas pintadas por color de vértice; alrededor, una **grada en anillo** de geometría
  propia: cuatro tramos de tres escalones, 2 triángulos por escalón y tramo, **288
  triángulos**. Cuatro `torre-de-agua` en las esquinas hacen de torres de luz. El perímetro,
  cerrado con `verja`.

### La estación y el canal

- **Estación**, 4 × 14 celdas pegadas al bulevar. La playa de vías son cintas propias (2
  triángulos por tramo de 12, cuatro vías: **112 triángulos**), los andenes losas alzadas 0,6
  (2 triángulos cada uno) y la marquesina una losa sobre pilares (24 triángulos). El edificio
  de viajeros es un `bloque-e`. Sobre el andén, `banco-de-calle` cada 8 celdas y
  `farol-de-pie` cada 4. **No hay trenes**: un tren serían dos coches de coste y no aporta
  nada que la vía no cuente ya.
- **Canal y muelles**, 3 × 20 celdas a lo largo del bulevar. El agua es un rectángulo con el
  material de `escenas/aguas.ts` (2 triángulos), los cantiles dos cintas de 1,2 de alto (2
  triángulos por tramo), y el paseo una franja de `solera`. En el muelle: `barril`,
  `barril-pequeno`, `caja`, `caja-pequena`, `fardo`, `lingotes` y `sillares` en pilas
  alineadas con los almacenes (`bloque-b`), y `verja-poste` cada 8 haciendo de norays. Tres
  puentes propios (una losa de 24 × 4 con dos pretiles: 12 triángulos cada uno) cruzan el
  canal donde lo cruzan las calles.

### El hospital, el colegio y la feria

- **Hospital**, 5 × 6 celdas. Un `bloque-g` en U alrededor de un patio de acceso, con un
  porche propio de 20 triángulos en la entrada. Doce plazas de aparcamiento pintadas, un
  `coche-familiar` de ambulancia, cuatro `banco-de-parque` y un jardín de `arbusto` y
  `pino-pequeno`.
- **Colegio**, 5 × 5 celdas. Un `bloque-a` en L y un **patio** propio (un rectángulo con las
  líneas de una pista pintadas por color de vértice: 2 triángulos), cerrado con `verja` y
  `arco-de-verja` en la entrada. Cuatro `pino` y seis `banco-de-parque`.
- **Feria**, 6 × 6 celdas. Suelo de `tierra`. Ocho puestos: cada uno es una `mesa-larga` con
  dos `banqueta`, un toldo propio de 8 triángulos, y encima `caja-de-jamones`,
  `caja-de-zanahorias`, `cuenco` y `garrafa`. `farol-de-pie` en las cuatro esquinas y
  `pino-pequeno` en el perímetro.

---

## 5. Los edificios y sus interiores

Los bloques del pack son **cuerpos cerrados**: no tienen interior, y no se pueden abrir. Así
que un edificio del Burgo es en realidad **dos objetos que nunca se ven a la vez**:

```
  LA CÁSCARA    el `bloque-*` o `cuerpo-*` del pack, con sus ventanas y su tejado
  EL INTERIOR   geometría propia (losa, tabiques) + muebles de los packs de persona
```

Cuando el edificio está a menos de **60 unidades del punto que la cámara mira** y el ojo
tiene ese punto a menos de **420**, la cáscara se **desmonta** (no se pone `visible={false}`:
`visible` no quita los toques, y una fachada invisible que sigue cogiendo el dedo es un fallo
que ya ha pasado en este árbol) y en su lugar se montan las plantas con su interior. Al
alejarse, al revés. Nunca hay más de **tres** edificios abiertos a la vez.

**Y NO SE ABRE DEL TODO: SE ABRE COMO UNA CASA DE MUÑECAS.** Desmontar la cáscara desmontaba
el edificio entero, y lo que quedaba entre dos vecinos con su fachada y su tejado era una
rejilla de tabiques blancos con muebles flotando al aire. Se vio a la primera:

> «cuando nos acercamos a los edificios y se muestran en versión detallada, algunos quedan
> solo el interior»

Una maqueta de arquitecto no se abre así: se le quita **una** fachada y se deja lo demás. Así
que al abrirse, el edificio conserva **su tejado y las tres medianeras que no dan a su calle**
(`cascaraAbierta`), del mismo color con el que se pintaba de lejos, y el hueco queda por el
**frente** — que es por donde lo mira quien va andando por la acera. Cuesta 32 triángulos por
edificio: 2 de cubierta y 10 por cada medianera, o sea 96 con los tres abiertos, de los
900.000 del tope.

> **Esta regla era otra, y el banco la tumbó.** Decía «a menos de 60 y con el ojo por debajo
> de 40 de ALTURA». Al montarla y medirla resultó ser una regla que **no puede cumplirse
> nunca** con la cámara que hay: con la cercanía más corta que `LIMITES_DEL_BURGO` admite
> (0,15) el ojo queda a **366** del punto que mira, y con la inclinación mínima que el cliente
> deja (`ALTURA_MINIMA`, 12°) su altura es 366 · sen 12° = **76**. El ojo nunca baja de 76, así
> que con el umbral en 40 los interiores no se abrían en ninguna partida: sólo bajando la
> mirada por debajo de lo que el cliente permite. Un adorno que el jugador no ve no es un
> adorno, es peso muerto.
>
> Lo que sustituye a la altura mide lo mismo donde de verdad está la atención: **el punto que
> la cámara mira** en el suelo y **a qué distancia lo tiene el ojo**. Con la cercanía más corta
> el ojo está a 366 y una sala de 8 de lado mide ahí 8/366 · 1.304 = **28 px** en un PC: se ve
> el sofá. Con la cercanía siguiente (0,2) el ojo se va a 488 y la sala baja de 21 px. El
> umbral se pone en **420**, entre las dos: se abren cuando el jugador ha acercado del todo, y
> no antes. Los 60 del radio no se tocan.

El 60 **no crece con el recinto**, por la misma razón que los umbrales de §8: sale de a qué
distancia una ventana de 1,2 unidades deja de leerse en pantalla, y eso no depende de lo
grande que sea la ciudad.

### Cómo se apilan las plantas

```
  ALTURA_DE_PLANTA = 4,5     (hueco libre 4,0 + losa 0,5)
  planta p: suelo en y = 0,6 + 4,5 p       (0,6 es el bordillo de la parcela)
```

La cáscara de `cuerpo-c` mide 13,50 = 3 × 4,5: las tres plantas de dentro caen donde caen las
tres filas de ventanas de fuera. Esto lo comprueba `verify:burgo-modelos` y no es decorativo:
si se pierde, al abrir un edificio se verá un suelo cruzando una ventana.

### Cómo se construye una sala

La huella interior de un `cuerpo-*` va de 7,24 × 8,70 a 12,04 × 7,80. Se traza sobre el
módulo de sala (4):

- **Losa**: un rectángulo de 2 triángulos, con color por vértice según el uso (tarima en
  vivienda, baldosa en cocina, moqueta en oficina).
- **Tabiques**: cajas de 0,3 de grueso y 4,0 de alto, 10 triángulos cada una (los 12 de una
  caja menos los 2 de la cara que da al suelo). Un hueco de puerta de 2,4 × 2,8 se hace con
  tres cajas en vez de una: 30 triángulos.
- **Techo**: las salas no llevan techo propio. El que se ve es **la cubierta de la casa de
  muñecas**, un rectángulo de 2 triángulos a la cota de la última planta, y tapa el edificio
  entero en vez de sala por sala. Dentro se ve por el frente abierto, no desde arriba.
- **Escalera**: no se usa `escalera` del Dungeon —sube 4,0 y la planta mide 4,5, y quedaría un
  escalón de medio módulo al llegar—. Es geometría propia: 12 peldaños de 0,375 de alzada y
  0,5 de huella, 4 triángulos cada uno, **48 triángulos** por tramo. `escalera`,
  `escalera-izquierda` y `escalera-derecha` siguen en el catálogo para los sótanos y las
  rampas del polígono, donde 4,0 sí vale.

Una planta tiene **una o dos salas**, según su huella: menos de 80 unidades cuadradas de
suelo, una; más, dos, partidas por el lado largo.

### Qué mueble va en qué sala, y dónde exactamente

La regla que hace que parezca ordenado y no esparcido: **cada clase de sala tiene una pared
de anclaje**, y todo se cuelga de ella. Nada se coloca «en el centro» salvo lo que en la vida
real está en el centro.

| Sala | Pared de anclaje | Contra ella | En el centro | En las otras |
| --- | --- | --- | --- | --- |
| **Cocina** | la medianera (la del conducto) | `encimera` ×2, `fregadero`, `fogon` con la `campana` encima (a y = 2,8), `horno`, `nevera` al final del tiro, `alacena` colgada a y = 2,4 | `mesa-de-cocina` con 2 `taburete` | `escurreplatos`, `estante-de-pared` con `tarro` ×3 |
| **Comedor de restaurante** | la que da a la cocina, con el `mostrador` | `anaquel` con `plato` ×6 | `mesa-redonda` en malla de 4 unidades, 4 `silla` alrededor a 1,6 del borde, `carta` + `salsa-roja` + `salsa-amarilla` + `servilletero` encima de cada una | `cuadro` a y = 2,0, `lampara` en las esquinas |
| **Salón** | la del hueco de escalera | `sofa` centrado, `cuadro` encima a y = 2,2 | `alfombra` (3 × 2) con la `mesa-baja` encima y 2 `butaca` enfrentadas a 1,2 | `anaquel` con `libros`, `lampara` en la esquina, `retrato` en la repisa |
| **Dormitorio** | la de enfrente de la puerta | `cama` con `almohada` ×2 y `mesilla` con `lamparaDeMesa` a un lado | `alfombra-ovalada` a los pies | `armario`, `cuadro-pequeno` a y = 2,0 |
| **Oficina (torres)** | las dos largas | `anaquel` cada 4 unidades | `mesa-mediana` en filas de 2 con `silla-de-oficina`, paso de 2,4 entre filas | `papelera` junto a cada mesa, `arbusto` de maceta en las esquinas |
| **Tienda (planta baja)** | la del fondo | `anaquel` ×4 con `caja-pequena` y `cajon` encima | `mostrador` mirando a la puerta, con la `caja` detrás | `cuadro`, `farol-de-pie` |
| **Sótano / trastero** | todas | `estante-de-pared`, `repisa` | `mesa-de-trabajo` con `tabla` y `sarten` | `caja`, `barril`, `barril-pequeno`, `palet` |

**Cuatro reglas de colocación que valen para todas**:

1. Nada a menos de **0,3** de un tabique, ni a más de 0,5 si dice «contra ella».
2. Delante de todo mueble contra pared quedan **2,0** libres (se pasa por delante).
3. El barrido de la puerta (2,4 de ancho × 1,2 de fondo) está **siempre vacío**.
4. Los muebles se colocan sobre la malla de **1,0** y giran sólo en cuartos de vuelta. Un
   sofá a 37 grados no parece más natural: parece un fallo.

Y la que decide el uso de cada planta, por distrito:

```
  restaurantes y ocio ....... baja: comedor + cocina; 1ª: comedor; 2ª y +: vivienda
  ensanche / vivienda alta .. baja: tienda; 1ª y +: salón + dormitorio (alternando)
  centro (torres) ........... baja: tienda; todas las demás: oficina
  chalets ................... baja: salón + cocina; 1ª: dormitorio ×2
  polígono .................. baja: sótano/almacén; no hay más plantas
```

---

## 6. Las torres del centro

El pack no tiene rascacielos: el más alto son cuatro plantas. Las torres del centro son
geometría propia, y por eso pueden tener las plantas que hagan falta:

```
  huella .......... 12 x 12 (una celda) o 24 x 24 (cuatro, en las esquinas de la glorieta)
  plantas ......... 6 a 14, sorteadas; la altura sube hacia la glorieta
  cuerpo .......... un prisma: 12 triángulos
  banda de ventanas  un anillo de 4 caras por planta, retranqueado 0,2: 8 triángulos
  remate .......... una cornisa y un casetón de ascensor: 20 triángulos
  ---------------------------------------------------------------
  una torre de 10 plantas: 12 + 80 + 20 = 112 triángulos
```

Con el centro de 7 celdas de radio caben unas **cuarenta** torres: 4.500 triángulos, menos de
tres `bloque-h`. Se tiñen por vértice con la paleta del centro (tres grises y un cristal
azulado), y por dentro llevan oficinas con la misma geometría de §5.

Que las torres sean propias es lo que permite que el centro de una ciudad de 458 metros
parezca el centro de una ciudad: con el pack, lo más alto serían cuatro plantas en todas
partes y la silueta sería plana.

---

## 7. El ritmo: la marcha del avatar y los coches

### La marcha del avatar por el TABLERO, que es la decisión que obligó la escala

Una casilla mide 72 de frente. Un aventurero mide 2,543 y anda a `PASO_POR_SEGUNDO` = 4
unidades por segundo. **72 / 4 = 18 segundos por casilla**, y doce casillas serían tres
minutos y medio de turno. El tope de 8 segundos por recorrido que `verify:burgo-escena` ya
vigila lo cortaría, sí, pero cortándolo el clip se aceleraría trece veces y los pies
patinarían de forma grotesca.

Se barajaron las tres salidas que hay:

1. **Subir la velocidad de la marcha en el tablero.** Es la que se toma: **×12**, o sea
   **48 u/s andando y 96 corriendo** (`VECES_LA_MARCHA_A_PIE` en `escenas/burgo/peon.ts`).
   Los pies patinan —el clip corre a su paso natural mientras la figura cubre doce veces más
   suelo—, y la pregunta buena es **cuántos píxeles mide ese patinazo**. Medido: mientras dura
   un recorrido la cámara sigue al que mueve a cercanía 0,42, o sea encuadrando un radio de
   239,5 unidades; en un PC de 1.920 eso son 4,0 px por unidad y el aventurero mide **10,2 px
   de alto**, con los pies en poco más de uno. En un móvil, **2,1 px enteros**. A ese tamaño
   el ciclo de piernas se lee como movimiento y el deslizamiento no se ve. Una ficha de
   tablero se desliza: eso es lo que es.
2. **Que la ficha viaje en coche.** Es lo más bonito y **no se puede hoy**: el pack trae
   CINCO coches y las mesas son de SEIS asientos, y los coches del City Builder llevan el
   color horneado en el atlas y no tienen máscara de tinte, así que dos jugadores
   compartirían modelo y color. Repartir seis figuras entre cinco modelos es exactamente el
   fallo que este árbol ya tiene anotado con los colores de peón. Además pide una fase nueva
   en `peon.ts` y una rama en `Burgo.tsx`. **Queda anotado** para cuando haya seis coches
   teñibles o una pieza propia; el resto del diseño no depende de ello.
3. **Achicar la casilla.** La descarta la orden.

Los tiempos que salen, y ninguno toca el tope salvo el peor de todos:

| Recorrido | Largo | Dura | Notas |
| --- | --- | --- | --- |
| 1 casilla | 72 | **1,50 s** | andando |
| 2 casillas | 144 | 3,00 s | andando |
| 3 casillas | 216 | 4,50 s | andando; el tope por casilla (2,25 s) ni se roza |
| 4 casillas | 288 | 3,00 s | corriendo |
| 7 casillas (la tirada media) | 504 | **5,25 s** | corriendo; dos tercios del tope |
| 12 casillas (el máximo) | 864 | **8,00 s** | el tope manda; el clip sube a 1,125, lejos del 1,5 |

Un tramo que llega a una esquina o sale de ella mide **61,5** y no 72 (la ele de la marcha
corta el rincón), así que un recorrido con esquinas es siempre algo más corto que el mismo
sin ellas.

**Dentro de la ciudad la marcha NO se toca**: pasear a 4 u/s por una calzada de 10,8 entre
bordillos, con edificios de 4,5 por planta, es lo que hace que «recorrerla con los avatares»
signifique algo. Las dos velocidades conviven porque son dos sitios distintos: el anillo es
un tablero y la ciudad es una ciudad.

### Los coches aparcados

Uno cada **2 celdas** (24 unidades) en el bordillo derecho de toda calle que tenga parcela
enfrente, en línea (nunca en batería, salvo en el aparcamiento del centro comercial, en la
cárcel, en el hospital y en la gasolinera). Sitio exacto: eje del coche a **4,2** del eje de
la calzada (o sea 1,2 del bordillo), girado con la calle. Altura: **0,42 + 0,366 = 0,786**
sobre asfalto —el `COCHE_SOBRE_EL_ASFALTO` de `anillo-en-3d.ts`— y **0,966** sobre una
`solera`, cuya cara de arriba está a 0,6 y no a 0,42.

Modelo: sorteado entre `coche-berlina`, `coche-utilitario`, `coche-familiar` y `coche-taxi`,
con dos reglas: el taxi sólo en el centro, en las avenidas y en el bulevar, y el
`coche-patrulla` sólo en la cárcel y en la esquina 30.

**Cuántos**: la regla «uno cada 2 celdas» sobre 54 × 54 daría cientos, y a 1.222 triángulos
cada uno eso es todo el presupuesto. El tope es **duro y por nivel de detalle**: sólo se
montan los coches aparcados de las celdas en **L1** (§8), y como mucho **56** en calidad
plena y **8** en sobria. Es el único sitio del diseño donde una regla de colocación se
recorta por presupuesto, y se dice aquí para que nadie la busque como un fallo.

### Los coches circulando

**Doce** en plena (dos en sobria), más los seis del circuito. Cada uno recorre una
**polilínea cerrada** por el eje de su carril:

- 4 en el bulevar (uno por sentido en cada eje).
- 8 en las avenidas (dos por sentido en cada avenida: ahora hay cuatro carriles por sentido).

Velocidad **12 unidades por segundo** (8,5 m/s = 30 km/h): una celda por segundo, que es lo
que hace que el movimiento se lea como movimiento y no como deslizamiento. Los del circuito
van a **22**. Estas velocidades **no cambian con la escala**: son las de un coche por una
calle, y la calle mide lo mismo que antes.

La posición es una **función pura del reloj de la escena**: `s = (v · t + fase) mod largo`, y
de ahí el punto y la tangente de la polilínea. Sin estado, sin integración, sin acumulación
de error: los seis aparatos de la mesa ven el mismo coche en el mismo sitio, y una pausa no
lo descoloca. Las **cuatro ruedas** giran con `s / radio` (por eso siguen siendo nodos
propios en el `.glb`, y `verify:burgo-modelos` lo exige).

### Cómo paran en los semáforos

Cada cruce con semáforo tiene un ciclo de **12 segundos**, con fase fija por cruce
(`(i + j) mod 2` decide qué eje empieza en verde):

```
  0,0 a 5,0 s .... verde para el eje A     5,0 a 6,0 s .... ámbar
  6,0 a 11,0 s ... verde para el eje B    11,0 a 12,0 s ... ámbar
```

Un coche que se acerca a una línea de parada mira el ciclo de ese cruce en el instante `t`.
Si su eje no está en verde y su distancia a la línea es menor que **12**, su avance se
multiplica por `(d/12)²`, que lo deja clavado en la línea y lo suelta al ponerse verde. Sigue
siendo una función de `t` —el factor se aplica sobre el parámetro, no sobre una velocidad
integrada— y por lo tanto sigue siendo determinista.

Lo que **no** se hace: los coches no se ven entre ellos y no chocan. Van por carriles
separados y con fases distintas, y elegir las fases para que no se alcancen es trabajo de la
traza, no del bucle.

---

## 8. Niveles de detalle y presupuesto

### Lo que cambia de raíz al pasar de 288 a 648

Con 288 de recinto, la ciudad entera cabía en el nivel de detalle alto y el presupuesto se
sumaba renglón a renglón: «tantos bloques, tantos coches, tantas farolas». **Con 648 no cabe
ni cabrá nunca.** La cuenta es de servilleta y no admite discusión:

```
  2.916 celdas de ciudad. Un bloque del pack cuesta ~1.100 triángulos.
  Si el 45 % de las celdas son parcelas con bloque: 1.312 × 1.100 = 1.443.000
  … más las calles, el mobiliario, los coches, los árboles y los interiores.
```

O sea que el nivel de detalle deja de ser un ahorro y pasa a ser **la única forma de que la
ciudad exista**. Y de ahí sale la regla que ordena esta sección entera: **los umbrales de
nivel se derivan del presupuesto y de los píxeles, no del tamaño del tablero.** Un objeto de
`s` unidades a `d` de la cámara mide `1.304 · s/d` píxeles en un PC de 1.080 de alto con 45°
de campo, y eso no cambia porque la ciudad sea más grande.

### Qué se ve a cada distancia

`d` es la distancia de la **cámara** al centro de la manzana o del edificio.

| Nivel | En plena | En sobria | Qué se monta |
| --- | --- | --- | --- |
| **L0** | punto mirado a ≤ 60 del edificio y ojo a ≤ 420 de ese punto | — (no hay interiores en sobria) | La cáscara se desmonta; se montan las plantas con losa, tabiques y muebles. Máximo 3 edificios. |
| **L1** | d ≤ **156** | d ≤ 60 | Todo: bloques del pack, coches aparcados, farolas, semáforos, bancos, papeleras, arbustos, árboles, terrazas. |
| **L2** | 156 < d ≤ **1.500** | 60 < d ≤ **1.500** | **Calles del pack** (que son lo que dibuja la trama urbana) y, en vez del bloque, un **prisma con banda de ventanas** de 30 triángulos sobre su `solera`. Las **torres del centro se quedan enteras**. Del mobiliario de un distrito, una de cada dos de las piezas de 100 triángulos o más en un PC; en un móvil, una de cada cuatro de las de 250 o más, y las calles pasan a manta. |
| **L3** | d > **1.500** | d > **1.500** | Una **manta de asfalto** de 2 triángulos por celda y **un prisma por edificio fundido en una sola malla por manzana**: unos 10 triángulos por celda. |

**Por qué L1 en 156 y no en 180.** Sale del presupuesto, hacia atrás. Un disco de radio 156
son `π · 156² / 144 = 531` celdas; una celda en L1 cuesta unos 700 triángulos de media
(mezcla de calles a 75 y parcelas con bloque y mobiliario a 1.200), o sea **372.000**. Con
180 serían 707 celdas y 495.000, y ya no quedaría sitio para el L2 ni para los interiores.
El número es el más grande que cabe, y por eso está escrito así y no redondeado.

**Por qué L2 en 1.500, y por qué el plano decía 420.** Decía 420 «porque desde cualquier punto
de DENTRO de la ciudad, 420 alcanza el borde más lejano (la diagonal desde el centro son
458)». Es cierto, y por eso no valía: **la pose que el jugador ve siempre —la de salida, el
arcade recién abierto— no está dentro de la ciudad**, está a 1.010 del centro. Con 420, desde
ahí la ciudad entera caía a L3 y se montaban **9.742 triángulos de los 692.000**: una mancha
de prismas de diez triángulos sobre asfalto donde tenía que haber una ciudad. Se vio mirando
la primera captura del tablero entero.

Al medirlo salió que **la ciudad ENTERA en L2 pesa 157.095 triángulos en un PC y 36.762 en un
móvil** (las cinco semillas del banco, antes de aflojar los distritos; con ellos aflojados,
205.515 y los mismos 36.762). O sea que el L3 estaba ahorrando lo que no hacía falta ahorrar.
El umbral se pone en **1.500**, que cubre la pose de salida más el rincón más lejano del
recinto (1.010 + 458 en diagonal = 1.373) con margen. El L3 sigue vivo —con `masLejos` (1,25)
el ojo se va a 1.261 del centro y el rincón queda a 1.719— pero deja de comerse la vista de
siempre. Consecuencia buscada: con 1.500 por encima de la diagonal de la ciudad (916), **L1 y
L3 ya no pueden coincidir**; L1 es «estoy dentro» y L3 es «estoy fuera del todo».

**Por qué L2 cambia el bloque por un prisma y NO al revés.** Es la decisión que hace posible
todo lo demás, y está medida: a 156 de distancia, una ventana del pack (1,2 unidades) mide
**10 px**; a 300, **5,2 px**; a 420, **3,7 px**. Por debajo de 5 px, el bloque del pack de
1.100 triángulos y el prisma con su banda de ventanas de 30 son **la misma mancha**. Se paga
un 3 % del coste por el mismo píxel. Lo que NO se sustituye a esa distancia son las calles:
la trama de calles es lo que hace que se lea «ciudad», y una losa de calle cuesta 75.

Es el mismo razonamiento del sendero del parque (§4): la pieza del pack cuesta entre 20 y 400
veces más que la geometría propia que hace lo mismo a esa distancia.

**Y desde la pose de salida no se ve ninguna diferencia**: el ojo queda a unas **1.010**
unidades del centro del tablero, así que la ciudad entera está en L3 y pesa unos **29.000
triángulos**. En un móvil de 390 px el tablero (864 unidades) se ve a 0,45 px por unidad: una
ventana sería 0,5 px y un coche 2,5. Lo que se ve es la silueta de una ciudad, y eso es lo
que tiene que verse.

**Cómo se monta y se desmonta sin que se note**: tres cosas.

1. **Histéresis** de 40 unidades en cada umbral: se sube de nivel a `d` y se baja a `d + 40`.
   Sin esto, una cámara parada en el umbral parpadea.
2. **Una manzana por fotograma como mucho.** Los cambios pendientes se encolan y se aplican
   de uno en uno, empezando por los que están **fuera del tronco de visión**. Con manzanas de
   3 a 7 celdas hay unas 120 manzanas por cuadrante; cambiar de nivel un cuadrante entero
   lleva dos segundos, y en dos segundos la cámara casi no se ha movido.
3. **Nunca se cambia el nivel de la manzana que la cámara está mirando de frente** (a menos de
   20° del eje de vista) mientras haya otra pendiente.

### El presupuesto, sumado

El tablero (el anillo, sus cuatro esquinas, el campo, los dados y lo que cambia con la
partida) lo suma `escenas/burgo/presupuesto.ts` de las listas de puestas de verdad, no de una
tabla copiada a mano, y `verify:burgo-escena` lo mide contra el `.glb` real en cada pasada.
Lo medido hoy:

**Calidad plena (PC) — EL TABLERO: 207.877 triángulos**

| Qué | Cuántos | Triángulos |
| --- | --- | --- |
| Manto de teselas del campo | 1.796 × 36 | **64.656** |
| Frentes de manzana de las 22 casillas de barrio | 44 cuerpos | ~35.100 |
| Las cuatro escenas de esquina (sin sus farolas) | ~150 piezas | ~30.000 |
| Manchas del campo (24 grupos) | ~60 piezas | ~15.400 |
| Banderas de dueño | 28 × 392 | 10.976 |
| Casas y posadas | 44 × 128 + 12 × 370 | 10.072 |
| Aventurero (la exploradora, la figura más cara) | 1 | 8.900 |
| Farolas del anillo y las esquinas | 34 × 176 | 5.984 |
| Dígitos del precio | 88 × 60 | 5.280 |
| Emblemas, suelo del anillo, discos, naipe, cielo, dados | | ~8.500 |
| Resto (peones, monedas, nubes, cebras, semáforos de Puerta…) | | ~13.000 |

**Calidad sobria (móvil) — EL TABLERO: 145.523 triángulos.** Se cae el decorado del campo,
el atrezo menudo (farolas, sillas, arbustos, papeleras), el segundo cuerpo de cada frente de
manzana, el aventurero y las monedas. **No** se cae el manto: es el paisaje, y quitarlo deja
el tablero flotando sobre un plano.

**Los topes**, declarados en `escenas/burgo/presupuesto.ts`:

```
  TOPE_PLENA  = 900.000     tablero 207.877 + 692.123 para lo que la ciudad tenga MONTADO
  TOPE_SOBRIA = 230.000     tablero 145.523 +  84.477 para la ciudad entera en prismas
```

`TOPE_PLENA` es el 45 % de los 2.000.000 que ya mueve el delta de Riberas en un PC. La
vacuna del comprobador es la ciudad de 648 generada **sin niveles de detalle**: mil
quinientos bloques del pack son 2,8 millones de triángulos, y se ve caer.

`TOPE_SOBRIA` sube de 130.000 por una razón que se puede señalar con el dedo: **el manto del
campo pasa de 738 teselas a 1.796** al crecer el perímetro del tablero —38.000 triángulos de
más—, y el resto es el atrezo de cuarenta casillas que ahora miden 72 × 108. La ciudad entera
en L3 son unos 29.000, así que cabe de sobra en los 84.477 reservados.

### El claro del Concejo, que es lo que ata la corona del campo

Un detalle de aritmética que conviene dejar escrito porque cuesta media hora encontrarlo. La
corona de teselas es de **cuatro** porque ahí delante del lado sur estuvo el **paño de dados**, y
tenía que caber entero entre el borde del tablero (432) y el final del manto, o quedaba un
fieltro flotando sobre el vacío: con cuatro teselas el manto acaba en 482,52 y el paño iba de 433
a 481, **lado 48, centrado en 457**.

Los dados ya no están ahí. Miguel no quería tener que buscarlos en el mapa, y se fueron a la
**caja del Burgo**, pegada a la pantalla (`escenas/burgo/bandeja-de-los-dados.ts`): abajo a la derecha
en el escritorio, arriba a la derecha en la app. Lo que queda en el campo es el **Concejo**, el punto a
donde vuelan las monedas que se le pagan, en 475: con tres teselas caería más allá del manto. El
cuadro de 48 se queda con sus mismos números como **claro del Concejo**, y las manchas del campo se
siembran fuera de él (se comprueba con cuatro semillas distintas): una arboleda encima escondería
las monedas al aterrizar, como antes tapaba los dados. Por eso el campo de cada mesa es el mismo que
era con el paño.

### La caja del Burgo

La primera respuesta a «los dados en la pantalla» fue una bandeja con los dos dados dentro, y Miguel la
vio pobre y demasiado desde arriba: «no se si mostrar representaciones del dinero, un reloj de arena
igual que el de Riberas también para mostrar lo que queda de turno, etc. […] creo que podemos intentar
ser originales y integrarlos en un elemento más temático». Lo más reconocible de un juego de tablero,
después del tablero, es su **caja abierta**, y eso es lo que va pegado a la pantalla: nogal por fuera,
el crema del tablero por dentro y un compartimento para cada cosa que dice algo de la partida.

- **Los dados**, sobre un fieltro del color del peón de quien tira —el del sorteo mientras se sortea— y
  verde de mesa cuando no tira nadie. Tocarlos es tirar: el asa es una caja invisible sobre su
  compartimento, montada sólo cuando toca tirar. Mientras estuvieron en el paño, el asa era un cilindro
  en el centro de la GLORIETA: un clic sobre los dados no tiraba y uno sobre la glorieta sí.
- **Tu dinero**: montones de billetes de 500, 100, 50, 20, 10, 5 y 1, cada uno de su color y con tope
  —dicen «mucho» o «poco» a simple vista—, y en la cara de delante una placa de latón con la cantidad
  exacta. Un mirón ve la de quien tiene el turno. Hasta 3.499 los billetes suman lo que hay.
- **Los dos mazos**, Suerte y Caja de Comunidad, con su emblema y tan gruesos como cartas les quedan; y
  **las casas y los hoteles del Concejo**, los 32 y los 12 del reglamento, que se van vaciando: cuando
  se acaban ya no se puede alzar, y se ve.
- **El reloj de arena de Riberas**, de pie sobre un **cajón** de nogal junto a la caja, con su frente
  rehundido y su tirador de latón: lo que queda de turno, y tocarlo pasa el turno. El cajón llegó cuando
  Miguel vio el reloj «flotando»: estaba de pie en la cota del canto de abajo de la caja, sobre nada.
  Mide lo que las paredes de la caja y su frente va a haces con el de ella; va fundido en su geometría,
  así que no cuesta una llamada. Tocarlo —apretar y soltar sin arrastrar, como los dados— y no apretarlo como en Riberas: la caja
  está encima del tablero, y quien empieza a girar la cámara desde el reloj no puede perder el turno. Se
  voltea al cambiar `turnosAbiertos`, a la vez en todas las pantallas. El de `reloj.glb` en plena, el de
  conos en sobria; si el `.glb` no llega se pinta el de conos y se dice por consola, sin `alFallar`, que
  en el escritorio mandaría la partida entera al tablero dibujado.

Y cómo se pone:

- **Dos formas**: la completa, con las dos filas de compartimentos, en los lienzos de al menos
  600 × 540; la compacta, sólo el dinero y los dados, en los estrechos y en los apaisados bajos, donde
  la completa, con su techo de alto, se quedaría en poco más de la mitad.
- **Cuánto mide**, proyectada y con el cajón y el reloj: la completa, la mitad del ancho del lienzo entre
  340 y 1.000 puntos, sin pasar del 45 % del alto; la compacta, el 94 % del ancho entre 240 y 600, sin
  pasar del 36 %; y nunca más que el lienzo menos sus márgenes. Un dado quieto mide 77 puntos en un
  monitor de 1.920 × 1.080, 64 en uno de 1.600 × 900 y 51 en un portátil de 1.280 × 720, y nunca menos de
  los 22 de `DADO_MINIMO` (23 en un lienzo de 288). La primera caja medía el 30 % del ancho, hasta 500
  puntos, y Miguel la vio «muy muy pequeño»: el dado no pasaba de 39 puntos en ningún lienzo. Y la
  primera cuenta medía el ancho en el centro del lienzo, y en un móvil de 375 la caja se salía cinco
  puntos por la izquierda.
- **La resolución** es la de los píxeles que ocupa: la escena se dibuja al `devicePixelRatio` del
  aparato (`dpr={[1, 2]}` en los tres lienzos), así que una caja más grande es una caja con más detalle,
  y no hay otra forma de ganarlo sin redibujar el tablero entero a más resolución.
- **Desde dónde se mira**: a 40° del rayo del ojo, en cualquier esquina (`cabeceoHaciaElOjo`). La
  bandeja se inclinaba 55° hacia la cámara, y en su esquina el rayo bajaba otros 17°: casi cenital; y
  arriba en la app, con la inclinación a secas, la caja quedaría rasante. Se probó también volverla de
  lado hacia el ojo, y los cantos dejaban de ir horizontales: parecía torcida.
- **Dónde va**: la esquina la dice el cliente (`bandejaDeLosDados`), porque la escena no sabe qué tiene
  encima. El escritorio, abajo a la derecha, y su cartel del pie se para antes de la caja si al lado
  cabe uno de 220 puntos; la app, arriba a la derecha, y su «Ver el burgo entero» baja debajo de ella.
- **No esconde casillas**: grande y abajo a la derecha, la pose de salida de siempre dejaba detrás de la
  caja la esquina de SALIDA y cuatro casillas —en 1.600 × 900, la 0, la 1, la 2, la 3 y la 39—, que es
  donde empiezan todos los peones. Los dos clientes salen, y vuelven con «Ver el burgo entero», con
  `poseDeSalidaAlLadoDeLaCaja`: la de siempre si no esconde nada, y si no, la mirada corrida lo justo
  —primero de lado, al hueco libre, sin que el anillo encoja— hasta que ninguna casilla quede detrás y
  las cuatro esquinas del anillo sigan en el lienzo. La mirada se corre hasta un lado entero del tablero,
  y nunca más allá del tope con el que la cámara acota el arrastre. En un móvil en vertical no se mueve.
  En los lienzos apaisados y bajos hace falta correrla mucho: con tres quintos de lado, como estuvo, el
  panel del banco (961 × 421) no encontraba ninguna pose y la caja seguía tapando la salida; con un
  lado entero se corre nueve décimas y la salida queda libre. Sólo en un móvil tumbado con la caja
  arriba (844 × 390) no hay forma de que quepan los dos —la fila del fondo queda detrás en cualquier
  pose en la que el anillo quepa de alto— y se queda la de siempre, como estaba.
- **No tiembla**: se pega a la cámara en el `useFrame` que sigue al seguimiento. Medido en el banco con
  la cámara corriendo a 108 unidades por segundo detrás del peón: el borde no se movió un píxel en 230
  fotogramas.
- **Nada se esconde detrás de una pared**: por eso los billetes van en la mitad de atrás de su
  compartimento. `verify:burgo-escena` tira un rayo del ojo a cada cosa que tiene que verse, en todas
  las poses.
- **Cuesta** 1.170 triángulos la caja con sus piezas, el cajón del reloj y sus dos asas, 807 los emblemas de los mazos y las
  letras de la placa, y el reloj: 20.086 el de Riberas en plena, 262 el de conos en sobria. En llamadas
  de dibujo, medidas en el banco, dieciséis en plena y veinte en sobria, dados y reloj incluidos: las
  asas no se dibujan (`visible={false}`, que no les quita el toque), y los mazos con sus emblemas y la
  placa con su cantidad van en una geometría cada uno. Recién puesta, la escena hacía 92 llamadas en
  sobria, con un tope de 90; ahora 86.

### Llamadas de dibujo

Todo va instanciado: una `InstancedMesh` por pieza distinta **en pantalla**, y toda
`InstancedMesh` llama a `computeBoundingSphere()` después de escribir sus matrices (si no, el
tronco de visión la poda mal y la ciudad desaparece a medias).

```
  calles ..................  7      bloques y cuerpos ....... 16
  coches ..................  5      mobiliario urbano ....... 12
  parque ..................  8      cementerio .............. 13
  polígono ................ 10      muebles (3 interiores) .. 26
  fichas de jugador .......  6      aventureros .............  6
  geometrías propias ...... 16      caja del Burgo .......... 16
  -----------------------------------------------------------------
  TOTAL esperado ........................................... 141
```

Los distritos nuevos (estadio, estación, canal, feria, obra, gasolinera y chalets) añaden
geometrías propias, no piezas nuevas del pack, así que el total sube poco y `TOPE_DE_LLAMADAS`
se queda en **150** en plena y **90** en sobria. La caja del Burgo es la partida que más aprieta la
sobria: con el reloj de conos son veinte, y medido en el banco con el tablero lleno la escena hace 86. Riberas hace 1.279 en PC: 150 no es un número
apretado, es un número que se nota si alguien se olvida de instanciar algo.

---

## 9. Lo que se queda fuera, y por qué

- **La muralla y su ronda.** Miguel, 9-sep-2026: «me gustaría que no hubiera muralla». No es
  peso: es que ya no hay nada que cerrar. Fuera también las cuatro piezas del catálogo
  (`muralla`, `puerta-muralla` y las dos esquinas, 2.534 triángulos entre las cuatro).
- **Todo lo medieval, y no sólo la muralla.** Iglesia, ayuntamiento, herrería, molino, pozo,
  torres, casas de aldea, vallas de madera y de piedra, antorchas, pendones, cofres. La
  ciudad es de este siglo. Está la lista entera con sus triángulos en `PIEZAS_EN_ESPERA`, en
  `escenas/burgo/piezas.ts`, y `verify:burgo-escena` afirma que ni una pieza del pack
  hexagonal aparece en una casilla o en una esquina.
- **La ficha en coche.** §7, salida 2: cinco coches para seis asientos y sin máscara de
  tinte. Es lo primero que hay que retomar si aparecen seis coches teñibles.
- **La posada como pieza propia.** No hay hotel en ningún pack. La posada se pinta como una
  `casa` teñida con un `estandarte` clavado en el tejado, que es lo que ya hacía el diseño
  anterior (decisión 12) y sigue valiendo.
- **El color de distrito en los edificios.** Los bloques del City Builder traen su color
  horneado del atlas y no llevan máscara de tinte: no se pueden repintar por distrito sin
  compilar ocho variantes más, y ocho variantes son ocho veces su peso. El carácter de cada
  distrito lo dan los modelos, el mobiliario y el arbolado (§4).
- **Trenes en la estación.** Un tren cuesta lo que dos coches y no cuenta nada que la vía y
  el andén no cuenten ya.
- **Sombras.** En ningún cliente, como en el resto del árbol.
- **Peatones que no sean los seis aventureros.** Una ciudad con gente andando sería otro
  presupuesto entero: un aventurero son 8.900 triángulos y su esqueleto.
- **Interiores en el móvil.** En sobria no se abre ningún edificio. Es la decisión que más
  duele y la que más ahorra: 43.800 triángulos y 26 llamadas.
- **El sendero del pack en el parque, las barreras del Dungeon en el circuito y la escalera
  del Dungeon entre plantas.** Los tres se sustituyen por geometría propia, y los tres por el
  mismo motivo medido: la pieza del pack cuesta entre 20 y 400 veces más que la cinta que
  hace lo mismo, o no encaja con la altura de planta (§5).
- **`trash_B`.** Mide 0,43 en su lado mayor y el suelo de talla del comprobador es 0,50.
  Entra `trash_A`, que es la misma papelera un número mayor.

---

## 10. Lo que hace falta y todavía no está

Dicho aquí para que no se pierda, con la firma exacta, porque `escenas/burgo/tipos.ts` es el
contrato con los dos clientes y **no se toca desde aquí**:

- Nada. La ciudad es decorado: se siembra con `semillaDelCodigo(codigo)` de
  `shared/mecanicas/semilla.ts`, que ya llega por props, y **nunca** con `ctx.azar`, que es
  secreto y filtraría la semilla de las reglas. Si al montarla apareciera algo que sí exige un
  campo nuevo, se escribe en el informe con su firma y se sigue sin él.

---

## 11. El contrato con `ciudad.ts`, en una tabla

Lo que `escenas/burgo/anillo-en-3d.ts` exporta y `escenas/burgo/ciudad.ts` tiene que usar sin
volver a deducirlo. Si un número se mueve aquí y no allí, la ciudad se sale del tablero o deja
un cerco de suelo vacío alrededor, y ninguna de las dos cosas da error.

| Nombre | Valor | Qué es |
| --- | --- | --- |
| `RECINTO_DE_LA_CIUDAD.lado` | **648** | El cuadrado que la ciudad llena entero |
| `RECINTO_DE_LA_CIUDAD.borde` | **324** | Distancia del centro a cualquiera de sus cuatro bordes |
| `RECINTO_DE_LA_CIUDAD.celdas` | **54** | Celdas por lado |
| `RECINTO_DE_LA_CIUDAD.reticula` | **12** | Lado de una celda |
| `CELDAS_DE_LA_CIUDAD` | **54** | Lo mismo, suelto |
| `centroDeCelda(i, j)` | `(−324 + 12i + 6, −324 + 12j + 6)` | Centro de una celda, en el mundo |
| `CELDAS_DEL_BULEVAR` | `[0, 1, 52, 53]` | Las celdas de la ronda, en cada eje |
| `ANCHO_DEL_BULEVAR` | **24** | Dos losas |
| `CELDAS_DE_LA_AVENIDA` | `[25, 26, 27, 28]` | Las celdas de una avenida, en el eje perpendicular al de avance |
| `ANCHO_DE_LA_AVENIDA` | **48** | Cuatro losas |
| `CELDAS_DE_LA_GLORIETA` | `[25, 26, 27, 28]` | Los dos ejes a la vez: 16 celdas, 48 × 48 |
| `PUERTAS_DE_LA_CIUDAD` | 4 entradas | `{ casilla, lado, eje, celdas, entrada, fuera, ancho }` para las casillas 5, 15, 25 y 35 |
| `RETICULA_DE_LA_CIUDAD` (de `piezas.ts`) | **12** | La misma retícula, para no importarla de dos sitios |
| `ALTURA_DE_PLANTA` (de `piezas.ts`) | **4,5** | Suelo a suelo |
| `MODULO_DE_LA_CIUDAD` (de `piezas.ts`) | **4** | El módulo de sala |
| `COCHE_SOBRE_EL_ASFALTO` | **0,786** | Lo que sube un coche sobre una `calzada` |
| `COCHE_SOBRE_LA_SOLERA` | **0,966** | Lo que sube sobre una `solera` |
| `TOPE_PLENA` / `TOPE_SOBRIA` (de `presupuesto.ts`) | **900.000** / **230.000** | Tablero MÁS ciudad; al tablero le corresponden 207.877 y 145.523 |

Y lo que la ciudad **no** tiene que mirar: el anillo entero (`suelosDelAnillo`,
`puestasDelAtrezo`, `puestasDeLasEsquinas`, el campo). Todo eso ya está montado antes de que
`ciudad.ts` diga una palabra, y ni una de sus piezas entra en el recinto.

---

## 12. Lo que la ciudad le corrigió al plano, y con qué medida

Este documento dice en su primera línea que **si esto no coincide con el código, gana el
código**. Al ejecutar §3 a §8 sobre las 2.916 celdas de verdad, nueve cosas no cuadraron.
Están aquí con su número para que nadie las busque como fallos, y todas las vigila
`verify:la-ciudad` (85 comprobaciones, `npm run verify:la-ciudad -w escenas`).

| Lo que el plano decía | Lo que hace el código, y por qué |
| --- | --- |
| Bulevar de 2 celdas como una calzada de 24 | **Dos anillos de dos carriles con su mediana.** Una losa del pack TRAE bordillo: dos losas pegadas no comparten asfalto, se dan los bordillos. Si las 416 celdas del bulevar se abrieran entre sí serían `calzada-cruce` (170 triángulos) y costarían 70.700; como dos anillos son rectas de 58 y cuestan 25.000, y se leen como lo que son: una ronda de circunvalación |
| La mediana, continua | **Se abre donde llega una calle.** Una mediana continua de 648 parte la ciudad en dos y ningún coche cruza. Se abre en las filas donde una calle del cuadrante muere en la avenida, y en las del bulevar: exactamente donde una ciudad pone un cruce |
| Glorieta: `calzada-curva-suave` en las esquinas | **La regla general la resuelve sola y mejor.** Con la glorieta de 4 × 4 y la isleta de 2 × 2, las cuatro esquinas del anillo son donde se encuentran los brazos de dos avenidas —cuatro caras: un cruce— y las ocho de en medio son tes con el tronco a la isleta. Doce celdas, cero casos especiales |
| 35 repartos de manzana por eje | **70.** Repartir cuatro celdas sobrantes entre cinco manzanas son C(8,4) = 70. Se enumeran, no se copian: 4.900 tramas por cuadrante |
| Un `semaforo-c` por brazo | **Dos por cruce, sobre el eje que atraviesa.** Hay 172 cruces con semáforo; a cuatro brazos de 444 triángulos son 305.000 —la quinta parte de la ciudad— y 138.000 dentro del disco de L1, más que todos sus edificios juntos. Con dos, se ve el semáforo desde donde se llega y cuesta la mitad |
| Circuito: rectas de 108, radio 36 | **Rectas de 72.** 108 + 2 × 36 = 180 y el recinto da 144. Se conserva el radio, que es lo que hace que la curva se lea; la vuelta mide 370 y se tarda 16,8 s a 22 u/s |
| Estadio cerrado con `verja` | **Con un muro propio de cuatro prismas.** `verja` cuesta 380 triángulos por cada 4 unidades y el perímetro son 102 tramos: 38.760 por una valla que se ve de canto. Cuatro prismas de 12 hacen el mismo cierre por 48. La verja se queda donde es la seña del distrito: el cementerio y el colegio |
| El chalet, retranqueado con su jardín | **3,20 y ni un palmo más.** `cuerpo-a` saca el alero 4,80 y mide 8,70 de fondo: sobre una parcela de 12 sólo puede correrse 2,10 atrás. A 5,40 asomaba por el fondo y se metía en el jardín del vecino |
| L2 conserva las calles del pack | **En un PC sí; en un móvil, no.** Las losas del anillo de L2 son 38.000 triángulos y el móvil tiene 84.477 para la ciudad entera; a esa distancia una línea de carril mide 0,12 píxeles. En sobria, el L2 de una tesela de calle es la misma manta que su L3 |

Y una décima, que no es una corrección del plano sino de la primera implementación, porque
costó una tarde encontrarla: **el nivel de un grupo se juzga por la distancia a su CENTRO**,
como dice §8, y no al centro menos su radio. Con el radio restado, una manzana de radio 49
entraba en L1 desde 109 unidades, cuatro manzanas gordas entraban a la vez y el montaje del
móvil se iba a 97.000 triángulos con 84.477 de tope. Al centro cabe con holgura, y quien está
dentro de una manzana la tiene igualmente a menos de un radio.

### Lo que la ciudad mide hoy, con la semilla de portada

```
  celdas ........ 2.916: bulevar 416 · avenida 368 · glorieta 12 · isleta 4 · calle 413
                         parcela 647 · patio 222 · torre 56 · reserva 778
  piezas ........ 1.577 losas de calzada · 691 edificios · 3.147 de mobiliario urbano
                  396 bultos propios · 9 cintas · 74 coches aparcados · 18 circulando
  interiores .... unas 3.700 salas y 32.000 muebles, que se piden edificio a edificio
  grupos ........ 174: 82 manzanas, 78 teselas de calle y 14 distritos, con sus tres niveles
  la ciudad entera en L1 .... 1.474.211 triángulos, que NO caben y por eso hay niveles
  lo que se monta ........... 546.061 en la peor de las nueve poses, de 692.000 (PC)
                              205.515 desde la pose de salida: la ciudad entera en L2
```

---

## 13. Cómo se midió, y qué le corrigió el banco al plano

Todo lo de arriba es aritmética hasta que alguien lo mira. Lo que sigue es lo que salió al
montarlo de verdad en `escenas/burgo/Burgo.tsx` y mirarlo en `escritorio/src/banco-burgo.tsx`,
con las cifras que dio `gl.info.render` y no las que decía el plano.

### Con qué se midió

`npm run dev -w escritorio` y
`localhost/sala/banco-burgo.html?jugadores=6&lleno=1&semilla=BANCO`: seis sentados, tablero
LLENO (todos los títulos con dueño, casas y posadas repartidas, dos hipotecados y uno en
subasta), lienzo de 1.280 × 800 y de 709 × 637, y las cinco semillas que el botón recorre.
El panel enseña en cada fotograma los triángulos y las llamadas de `gl.info.render`, los
milisegundos que la escena publica por `alMedir`, y —esto es nuevo— **lo que `montarLaCiudad`
tiene montado y de cuánto es el tope**, que es lo que convierte «esto va lento» en un número.
La escena no sabe nada de esto: el banco vuelve a generar la ciudad por su cuenta con la
misma semilla, y si su lista de distritos y la de la escena divergieran, el botón de un
distrito llevaría la cámara a un descampado y se vería.

Las cuatro poses del banco son las cuatro cosas que hay que mirar y que no se ven desde la
misma altura, y la de la calle está en la inclinación mínima que el cliente deja (12°), no
más abajo: un banco que mira desde donde el jugador no puede mirar prueba una escena que
nadie va a ver.

### Lo medido, con seis sentados y el tablero lleno

| Pose | Triángulos | Llamadas | ms | Ciudad montada |
| --- | --- | --- | --- | --- |
| Pose de salida (la de siempre) | 427.259 | 93 | 17,6 | 211.297 de 692.000 · grupos 0/159/0 |
| Media altura, sobre un cuadrante | 715.161 | 102 | 17,6 | 527.706 de 692.000 · grupos 33/126/0 |
| A pie de calle, con tres interiores abiertos | 662.898 | 116 | 17,5 | 476.775 de 692.000 · grupos 24/135/0 |
| La glorieta | 578.182 | 73 | 17,5 | 384.122 de 692.000 · grupos 23/136/0 |
| Otra semilla (ENSANCHE), media altura | 630.780 | 84 | 17,6 | 501.230 de 692.000 · grupos 39/132/0 |

Y en **sobria**, las mismas cuatro: 169.380 · 196.946 · 204.551 · 180.174 triángulos, con
35 · 45 · 43 · 60 llamadas. Topes: **900.000 y 150** en plena, **230.000 y 90** en sobria.
Lo peor visto es **715.161 triángulos (79 % del tope) y 116 llamadas (77 %)** en plena, y
**204.551 (89 %) y 60 (67 %)** en sobria. Los 17,5 ms son el techo del vsync a 60 Hz: la
escena no bajó de 57 fotogramas por segundo en ninguna de las poses, ni en 709 × 637 ni en
1.280 × 800.

**El reparto no se nota**: volver a repartir los 159 grupos cuesta **0,10 ms o menos**
—por debajo de lo que `performance.now()` distingue en un navegador— y sólo se hace cuando la
cámara cambia de celda de 12, no por fotograma. Por eso NO hizo falta encolar un grupo por
fotograma, que es lo que el informe anterior dejaba anotado como pendiente: se reescriben
todas las matrices de una vez y no se ve.

### Las siete cosas que se corrigieron por haberlas mirado

1. **Los precios salían espejados.** El 60 se leía «06» y el 400 «004». `guarismosDelPrecio`
   colocaba los dígitos hacia `+adelante`, y quien lee el tablero está FUERA del anillo: para
   un ojo en `+fuera` mirando al centro, la derecha de la pantalla proyectada en el suelo es
   `−adelante`. No parece un fallo de orientación, parece una fuente rara. Ahora se escriben
   hacia `−adelante` y `verify:burgo-escena` lo mide con el producto vectorial.
2. **Un lado del anillo se leía como una banda beige, no como nueve casillas.** Faltaba lo
   único que de verdad separa una casilla de la siguiente en un tablero de mesa: la línea. Se
   añadió una de 0,9 de ancho (un par de píxeles desde la pose de salida) en el borde de atrás
   de cada casilla lateral: **72 triángulos en todo el anillo**, y el tablero pasa de ser un
   marco a ser cuarenta casillas.
3. **La ciudad estaba plantada en un prado.** El suelo del recinto era verde (`#95b56c`) y a
   partir de 156 las parcelas no llevan solera, así que lo que se veía entre los edificios era
   campo. Un gris cálido de losa (`#a19d90`) y la ciudad se lee como ciudad en los tres
   niveles, sin gastar un triángulo. Lo verde de dentro lo pinta cada distrito.
4. **Desde la pose de salida no había ciudad.** Con el umbral de L2 en 420, la ciudad entera
   caía a L3: 9.742 triángulos de 692.000. Ver §8.
5. **Todos los prismas eran del mismo gris.** Los dieciséis volúmenes del pack tienen color
   horneado y son de tonos distintos —el A azulón, el C rojo teja, el D oliva, el E y el F
   terracota—, así que un edificio cambiaba de color al cruzar los 156. Ahora cada prisma lleva
   el tono de SU cáscara, **medido del `.glb`**: media de `COLOR_0` ponderada por área y
   contando sólo las caras verticales. Las dos condiciones hacen falta: sin ponderar por área
   manda el detalle (una ventana tiene tantos vértices que un paño de muro) y los dieciséis
   salían del mismo marrón sucio; sin descartar las horizontales manda el tejado, que en este
   pack es oscuro en todos. `verify:la-ciudad` vuelve a medirlo.

   **Y dieciséis colores para seiscientos edificios siguen siendo dieciséis colores.** Con dos
   modelos por distrito, eso eran dos tonos para un barrio entero, y una manzana se veía como
   una tira de cromos repetidos. Esa tabla no se toca —es la medida del `.glb`—, pero cada casa
   se aparta de ella un **±16 % de brillo** y se templa un poco hacia el ladrillo o hacia la
   piedra, y las dos cosas las decide el SITIO (`pulsoDeLaParcela`, con dos vetas distintas), no
   el orden de recorrido. **No cuesta nada**: el color va en `instanceColor`, que ya es un color
   por instancia, así que seiscientas fachadas distintas se dibujan con las mismas llamadas que
   seiscientas iguales. Las torres del centro se apartan del mismo modo, y el apartamiento es el
   mismo en L1 y en L2, que es lo que evita que una torre cambie de color al cruzar los 156.
6. **El centro de la ciudad era un amasijo de losas grises.** Una torre en L2 pasaba a un
   prisma de 30 triángulos con dos rayas. Ahora **se queda entera** (80 a 144 triángulos): son
   unas veintiséis torres, dos mil triángulos de 692.000, y a cambio hay una silueta de
   rascacielos que se ve desde cualquier calle. Es la única excepción a «en L2 todo es un
   prisma», y está escrita como tal.
7. **Los distritos eran explanadas.** En L2 sólo sobrevivía una de cada cuatro piezas de 250
   triángulos o más: un cementerio sin tumbas, un parque sin árboles. Se afloja a una de cada
   dos de las de 100 o más — **pero sólo en un PC**: con esa regla en las dos calidades, seis
   de las veinte semillas se pasaban de los 84.000 del móvil (hasta 93.369). El móvil se queda
   con la regla estricta.
8. **La ciudad entera no tenía tejado, y tampoco suelo.** Los cuatro puntos de toda cara
   horizontal iban en orden inverso, así que su normal apuntaba hacia abajo y el material
   —`FrontSide`— las tiraba: los tejados de los prismas, los suelos de los catorce distritos,
   el césped, el agua y las plazas de aparcamiento. Desde el suelo la calle se veía entera,
   porque las PAREDES sí estaban bien; desde el aire, que es como se mira un tablero, no:

   > «al tener una vista aérea vemos prismas inacabados sin techo ni el resto de paredes»

   **No falló nada.** El triángulo estaba: los prismas seguían teniendo sus doce, el juez que
   los cuenta pasaba, el presupuesto cuadraba y las 87 comprobaciones de la ciudad seguían en
   verde. La señal, cuando se buscó, fue el volumen firmado de la caja unitaria: **1/3 en vez
   de 1**. De aquí salen dos reglas nuevas:

   - **Todo volumen con altura se cierra por arriba.** Ocho triángulos eran cuatro paredes sin
     tapa —lo que llevaban el toldo del mercadillo y el surtidor de la gasolinera—, y desde el
     aire eso es un cajón abierto. El mínimo pasa a **diez**, y quien declare menos recibe diez
     (`cuentaDeBulto`), con un juez que exige que lo declarado y lo construido sigan siendo el
     mismo número, para que el presupuesto no se quede corto por la promoción.
   - **La lupa cenital.** Contar triángulos no prueba que se vean. `verify:burgo-escena` deja
     caer una rejilla de 81 rayos verticales sobre la huella de cada volumen que la ciudad
     monta, se queda con la cara horizontal más alta que corta cada rayo, y exige que exista y
     que mire hacia arriba. Con la avería puesta se pone roja en las diecinueve clases de bulto
     y en las nueve alturas de torre. Sus dos vacunas son los dos fallos de verdad: quitarle la
     tapa a una caja de diez, y darle la vuelta a las normales.

### Lo que se midió y NO se cambió

- **Los interiores en el móvil siguen sin abrirse.** Es lo del §9, y sigue siendo verdad.
- **Los coches aparcados siguen topados en 56 y 8.** No se vieron huecos evidentes.
- **El bulto tumbado gasta sus triángulos.** El suelo de un distrito declara «dos por celda»
  —260 triángulos en el parque— y se construye como una TIRA de 130 cuadros, no como un plano
  de dos. Se ve exactamente igual; la diferencia es que el presupuesto no miente.
- **Las nueve cintas van siempre montadas**, en los tres niveles. Suman unos mil triángulos y
  son el trazado del parque y el óvalo del circuito: quitarlos a 420 ahorraría mil triángulos
  de 692.000 y borraría dos de las tres cosas que hacen que la ciudad se entienda desde arriba.

### Lo que sigue sin verse bien, y queda dicho

- **Las manzanas en L2 se leen como una trama repetida.** Un prisma por edificio, todos de la
  misma altura dentro de un cuadrante, produce ristras y patios que a media altura parecen un
  laberinto. No es un fallo de montaje —es la forma de las manzanas que `ciudad.ts` traza— y
  arreglarlo es variar las alturas dentro de una manzana, no el nivel de detalle.
- **La estación se ve vacía desde media altura.** Su suelo es un andén largo y liso y casi
  todo lo que lleva encima es menudo. Es el distrito que peor aguanta el L2.
- **Los interiores sólo se abren con la cámara acercada del todo.** Con la aérea que hay es lo
  máximo: el modo `tercera-persona` de `tipos.ts`, que está reservado, es lo que de verdad los
  pondría a la altura de los ojos.
