# El trueque de Riberas

> Si algo de aquí no coincide con el código, gana el código. Este documento recoge las
> decisiones y su porqué. Se escribió el 6 de septiembre de 2026 sobre la rama
> `lobby-catan`, con el código en `6372bc7`, a partir de lo que Miguel pidió por escrito
> tras jugar una partida entera: que un trueque pueda llevar varios bienes y varias
> unidades de cada uno; que se pueda pedir un bien que ya se tiene; que las propuestas
> se vean en pantalla, una por jugador, con aceptar y rechazar; y que la aceptación se
> confirme para que nadie acepte por equivocación.
>
> **Ésta es la segunda pasada.** La primera se revisó entera contra el código y se le
> encontraron nueve cosas: dos afirmaciones falsas que sostenían decisiones (la guarda de
> las cuatro vivas del §1.8 y la frase del §1.3 sobre qué comprobadores se ponen rojos),
> una opción muerta (la puerta del §1.1, que mandada tal cual no hace nada), una factura
> sin pagar (lo que ese silencio cuesta), tres agujeros de pantalla (la mesa de cinco y
> seis, el que propone y no ve lo que propuso, y la confirmación que faltaba en una de
> las dos pantallas) y dos cabeceras a medias. Los nueve están arreglados aquí, cada uno
> con la medida que lo reprodujo. Y de paso un nombre: lo que la primera pasada llamaba
> «el tablón» se llama aquí **el pregón**, porque `tablon` ya significa la mesa de madera
> en `escenas/tablon.ts` (§1.10). Lo que cambia respecto de la primera pasada está dicho
> en su sitio y no se ha borrado nada sin decirlo.
>
> **Y esta segunda pasada se ha vuelto a revisar contra el código, con siete correcciones
> más.** Dos dejaban un fallo entero en pie. La primera: **la marca `declaracion` del §1.12
> no llega al retablo**, que es justo la pantalla que iba a salvar, porque el mueble del
> retablo no pinta opciones sino `AccionDeTablero`, que tiene cinco campos y ninguno es
> ése; dónde muere la puerta se decide en el §1.12 bis, y la decisión cambia lo que tocan
> tres ficheros del §6. La segunda: **la tabla del alto del tablero del retablo estaba
> medida contra la regla de estilo que no decide el alto**, y con la buena son cuatro
> lienzos y no cinco (§4.2). Las otras cinco: la banda libre del §4.1 restaba un inset que
> el asa no tiene debajo, y por eso no cuadraba con `docs/LAS-CARTAS-SE-EXPLICAN.md` en
> tres lienzos; **la raíz de esta casa vale 17 puntos y no 16**, así que las cuentas de
> letra del §3.2 estaban cortas y en el peor lienzo la conclusión se da la vuelta; el orden
> del §9 son NUEVE fases y aquí se contaban dos, y seguido a la letra llevaba a empujar el
> trueque antes de que existiera la fase que lo vigila; los sietes por partida son 12,3
> medidos y no «once»; y la cabecera de `bienesDeLaCarga` sí nombra a sus dos llamantes.
>
> **Y un nombre más, que es de toda la casa y no de este documento.** La pieza que el
> siete pone en movimiento se llama **EL ESTIAJE**, en pantalla y en el código
> (`docs/EL-LADRON-DE-RIBERAS.md`, su decisión 10). Aquí se la llamaba por el nombre
> revocado en nueve sitios, y en los nueve pasa a llamarse el estiaje; lo único que no
> cambia es el nombre del FICHERO, que sigue siendo `docs/EL-LADRON-DE-RIBERAS.md`.
>
> **Miguel revoca aquí una decisión escrita.** `BIENES_POR_LADO_DEL_TRUEQUE = 1` en
> `shared/arcade/juegos/riberas.ts` no es un descuido: es una decisión razonada en
> veinte líneas de cabecera, y dice que «uno por uno se lee de un vistazo en una lista
> de botones, y la combinatoria completa (cualquier montón por cualquier montón) son
> miles de opciones, que no es una interfaz sino una lista que nadie lee». Ese
> diagnóstico es CORRECTO y está medido más abajo (§1.1: con topes de tres por lado y
> cinco rivales son 5.000 opciones y 1,14 MB de lista por cada lectura de la mesa). Lo
> que estaba mal era la salida: de «la lista no puede ser la interfaz» se concluyó «los
> trueques son de uno por uno», cuando lo que se sigue es «la interfaz no puede ser la
> lista». Este documento revoca la conclusión, se queda con el diagnóstico y resuelve el
> problema que la cabecera planteaba.
>
> Ningún número de aquí es una opinión. Cada uno sale de uno de los ocho guiones de
> medida del §7, que importan el código real y juegan partidas enteras con el reductor
> de verdad, o de un comprobador que se nombra. Las funciones y las constantes se citan
> por NOMBRE y nunca por línea: hay otro encargo escribiendo la fase 4 de la mesa en
> `escenas/delta.tsx` y en las dos pantallas, y una cita de línea de hoy sería falsa
> mañana.
>
> Lo que NO es de este encargo, aunque Miguel lo pidiera en el mismo mensaje: el estiaje
> y la regla del descarte con más de siete cartas (`docs/EL-LADRON-DE-RIBERAS.md`), y la
> descripción de las cartas al pasar el cursor (`docs/LAS-CARTAS-SE-EXPLICAN.md`). Se
> nombran aquí donde tocan, que son cuatro sitios y no dos: el tope del §1.4, el sitio
> compartido del §4, la red de seguridad del §8 y el orden de empuje del §9.

## 0. Qué hay hoy, y por qué no le vale a Miguel

El trueque vive entero en `shared/arcade/juegos/riberas.ts`, en cinco piezas:

| Pieza | Qué hace hoy |
|---|---|
| `BIENES_POR_LADO_DEL_TRUEQUE` | Vale `1`. Un lado de un trueque es EXACTAMENTE un bien |
| `opcionesDeTrueque(v, mio)` | Emite una opción por (rival, bien que doy, bien que pido), con `carga: { para, da: [uno], pide: [uno] }` |
| `ofrecer(estado, ctx, carga)` | Lee `para`, `da` y `pide` con `bienesDeLaCarga`, comprueba `llegaPara` y añade el `Trato` |
| `contestar(estado, ctx, id, acepta)` | Lo llama quien NO tiene el turno; valida la mitad que `opciones()` no podía ver |
| `caducarLosAbiertos` / `ultimos` | Los trueques caducan al acabar el turno; se recuerdan los últimos `TRATOS_QUE_SE_RECUERDAN` (8) |

Y en la pantalla, en tres piezas más: `AreaDeTrueque` en `escenas/delta.tsx` (se suelta
una carta de bien sobre un área y se propone), `bienesQueSeCambianPor` y
`truequesPosibles` en `shared/arcade/juegos/riberas-en-tres.ts` (que leen `da[0]` y
`pide[0]`, o sea que sólo saben de trueques de uno), y los botones de aceptar y rechazar
que salen en el `Formulario` del escritorio y en `LasOpciones` de la app con el rótulo
que escribe el propio juego: «Aceptar el trueque t3».

**Los tres fallos que Miguel encontró jugando, con su medida:**

1. **No hay multiplicidad.** Es la decisión escrita, y se revoca.
2. **No se puede pedir lo que ya se tiene.** `opcionesDeTrueque` salta con
   `if (llegaPara(v.misFichas, [quiero])) continue;`. Miguel tiene razón y la medida es
   dura: con la mano repartida en los cinco bienes, **hoy no se puede proponer NINGÚN
   trueque**, ni uno. Con `[2,2,2,2,2]` (diez bienes, dos de cada) `opcionesDeTrueque`
   devuelve **cero** opciones, y sin el filtro devuelve **veinte** por rival
   (`medir-trueque.ts`). Es exactamente el turno en el que uno quiere trocar: el que llega
   con la mano llena y le falta CANTIDAD, no clase.
3. **Las propuestas no se ven.** Están en la lista de botones del pie, mezcladas con
   pasar y tirar, con el rótulo «Aceptar el trueque t3», y se aceptan de un toque.

**Y un cuarto que Miguel no podía encontrar jugando, porque juega de tres o de cuatro.**
`MANIFIESTO_RIBERAS.jugadores` es `{ minimo: 2, maximo: 6 }` y `COLORES_EN_3D` tiene
CUATRO colores, así que `bastanColores` manda al `Retablo` en cuanto hay cinco sentados.
En una mesa de cinco o seis **el tablero en tres dimensiones no existe**, y con él no
existe la cinta de la que la primera pasada de este documento colgaba las tres pantallas
nuevas. La palabra «retablo» no aparecía ni una vez. Está arreglado en el §4.

## 1. Las decisiones que no se pueden deshacer después

### 1.1. La combinatoria no cabe en la lista, así que la opción se hace PARAMÉTRICA

**Es la decisión de la que cuelga todo lo demás, y es irreversible porque toca el
portillo del §5 bis.**

El motor tiene una regla que manda sobre todo: `avanzarRiberas` proyecta la vista de
quien mueve, le pregunta a `opcionesDeRiberas` qué le habría ofrecido, y **compara la
forma canónica de `{ tipo, carga }` contra la de cada opción** (`estaOfrecido`). Lo que
`opciones()` no ofrece, el reductor no lo hace. Con multiplicidad, `opcionesDeTrueque`
no puede enumerar «cualquier montón por cualquier montón». Medido, con manos de verdad y
con manos construidas (`medir-trueque.ts` y `medir-portillo.ts`):

| Tope por lado | Por rival, mano `[2,2,2,2,2]` | Mesa de cuatro (3 rivales) | Mesa de seis (5 rivales) | Abierto (sin destinatario) |
|---|---|---|---|---|
| 1×1 (hoy, sin el filtro) | 20 | 60 | 100 | 20 |
| 2×2 | 230 | 690 | 1.150 | 230 |
| 2×3 | 530 | 1.590 | 2.650 | 530 |
| 3×3 | 1.000 | 3.000 | 5.000 | 1.000 |
| 4×4 | 2.630 | 7.890 | 13.150 | 2.630 |
| 5×5 | 4.975 | 14.925 | 24.875 | 4.975 |

Y esas listas no se quedan en el servidor: `mesas.ts` mete `opciones:
loQueSePuedeHacer(...)` dentro de lo que se lee de una mesa, así que **la lista viaja
entera a cada dispositivo en cada lectura**. Medido en JSON, con rótulo y ayuda
(`medir-cable.ts`):

| Tope | Mesa de cuatro | Mesa de seis | Abierto |
|---|---|---|---|
| 1×1 | 10,6 kB | 17,6 kB | 3,6 kB |
| 2×2 | 140,3 kB | 233,8 kB | 47,2 kB |
| 3×3 | 685,1 kB | **1.141,9 kB** | 230,3 kB |
| 5×5 | 4.015,2 kB | 6.692,0 kB | 1.348,1 kB |

Para comparar: **la lista entera más larga que se ve hoy en una partida son 54 opciones
y 9,3 kB**, y `opcionesDeRiberas` tarda 0,050 ms de media (`medir-cable.ts`; el tope del
presupuesto es `TOPE_MS = 50`). Y el portillo paga la lista en CADA movimiento, no sólo
en los de trueque: poner una vereda canoniza la lista entera. Medido, para un movimiento
rechazado, que es el que recorre la lista completa (`medir-portillo.ts`):

| Opciones | Coste del portillo |
|---|---|
| 30 | 0,15 ms |
| 260 | 0,47 ms |
| 1.300 | 2,22 ms |
| 5.850 | 10,13 ms |
| 24.875 | **45,12 ms** |
| 50.625 | **96,16 ms** |

O sea: con topes de cinco por lado en una mesa de seis, el portillo solo se come el
presupuesto entero del movimiento, y la cuarentena por arcade (permanente, sin puerta
para levantarla) es lo que hay al otro lado. Esa cuarentena ya se disparó una vez por
este mismo camino, y está contada en la cabecera de `TOPE_CARGA_BYTES`.

**LAS TRES SALIDAS, Y LO QUE CUESTA CADA UNA.**

**(a) Una opción PARAMÉTRICA que el portillo valida por FORMA. ES LA QUE SE ELIGE.**
`opcionesDeTrueque` emite, además de las de uno por uno, **una sola opción de puerta**
cuya carga no es un movimiento montado sino una DECLARACIÓN de lo que cabe:
`{ tope, a: [asientos con bienes], mesa: true }`. El portillo gana una rama:

```
si el movimiento es OFRECER y no coincide con ninguna opción por igualdad canónica,
   se busca la opción de puerta en la MISMA lista;
   si no está, se rechaza (o sea: no es mi turno, o no he tirado, o me queda
   una vereda de la carta por poner, exactamente como hoy);
   si está, el movimiento entra sólo si CABE EN LO QUE LA PUERTA DECLARA.
```

Lo que cuesta, dicho entero:

- **Deja de ser cierto que la carga de una opción es el movimiento ya montado.** La
  cabecera de `Opcion.carga` en `shared/arcade/opciones.ts` promete eso, y es lo que
  mantiene mudo al mueble genérico: la pantalla manda lo que la opción lleva dentro y no
  traduce nada. La opción de puerta rompe esa promesa para UN tipo de movimiento. La
  factura se paga con tres cosas: la decisión 1.2 (la lista de uno por uno se queda, así
  que un cliente tonto sigue pudiendo trocar mandando cargas verbatim), la marca del §1.12,
  que es la que dice en voz alta que esa carga NO se manda, y el §1.12 bis, que es dónde se
  para la puerta en la pantalla a la que la marca no llega.
- **NO cambia `canonico.ts`.** El encargo daba por hecho que sí. Se ha medido y no hace
  falta: la comparación por forma cuenta multiconjuntos, no compara cadenas, y el orden
  canónico de los dos lados se resuelve donde ya se resuelve todo lo demás en este juego
  (decisión 1.5). `canonico.ts` es del núcleo y no se toca.
- **SÍ cambia `shared/arcade/opciones.ts`, y la primera pasada decía que no.** Decía
  «NO cambia `shared/arcade/`», y era verdad sólo del portillo: `estaOfrecido` es privada
  de `riberas.ts` y ahí no se toca nada. Pero la opción de puerta necesita una marca en el
  tipo `Opcion` para que el mueble genérico y el jugador ciego no la manden, y esa marca
  vive en el núcleo. Es aditiva y opcional (§1.12): una opción que no la trae se comporta
  exactamente como hoy, y los otros tres arcades no se enteran.
- **La declaración no puede llevar mi mano dentro**, y por eso no la lleva. Ver §2.

**(b) El trueque sale del portillo y lleva su validación exhaustiva en el reductor.**
Se descarta. El coste no es el código (ya está escrito: `ofrecer` valida todo lo que hay
que validar), es lo que se pierde:

- La única comprobación de toda la batería que distingue un motor CON portillo de uno
  SIN él está en `verificar-riberas.ts` (paso «El §5 bis: "sólo si", nunca "si y sólo
  si"»), y es justamente una de trueque. Sacar el trueque del portillo la mata, y
  entonces nada del árbol demuestra que el portillo exista. Cuál es exactamente esa
  comprobación, y qué le pasa al quitar el filtro, está medido en el §1.3, porque la
  primera pasada de este documento se equivocó al contarlo.
- El portillo garantiza que la legalidad se decide sobre LA VISTA y nunca sobre el
  estado. Con (b), `ofrecer` decide sobre el estado, que es donde está el almacén ajeno.
  Hoy no lo mira; el día que alguien «mejore» la validación mirando lo que el otro tiene
  («no ofrezcas lo que él no puede pagar»), la fuga no la caza nadie: `verify:mesa` busca
  los valores canónicos de `loSecreto` en lo que SALE por la red, no en lo que el reductor
  LEE.
- Y la asimetría de `contestar` (una guarda habla y las otras callan porque a ellas no
  llega nadie) deja de ser cierta, porque el portillo era quien las hacía inalcanzables.
  Habría que reescribir esas guardas con sus motivos, y cada motivo es una frase que
  ningún comprobador de secretos mira.

**(c) Opciones enumeradas pero acotadas.** Se descarta por las dos tablas de arriba. El
tope más pequeño que le sirve a Miguel para algo (dos por lado, que es lo mínimo que
merece llamarse «varias unidades») ya cuesta 233,8 kB de lista en cada lectura de una
mesa de seis, veinticinco veces lo de hoy, mandados a seis aparatos en cada movimiento.
Y hay un argumento que no es de tamaño y pesa más: **con un tope, la interfaz tiene que
componer de todos modos**, porque nadie va a leer una lista de 230 botones. Y si la
interfaz compone, lo único que necesita de la lista es EL TOPE, no la lista.

### 1.2. Y la lista de uno por uno SE QUEDA al lado de la puerta

No es un cinturón: es lo que paga la factura de 1.1. Sin ella, `opciones()` deja de
llevar dentro un movimiento de trueque que se pueda mandar tal cual, y con eso se cae un
principio de la casa («todo lo que se propone tiene que ser jugable desde la lista de
opciones») y se caen tres cosas concretas: un cliente que sólo pinta botones, la vacuna
del portillo del §1.3, y el jugador ciego de la fase 5 del estiaje (§8).

Lo que cuesta, medido: la lista de uno por uno SIN el filtro del §1.3 son, en mesa de
seis con la mano repartida, 100 opciones y 17,6 kB. Sumado a lo demás, la lista entera
se va de los 9,3 kB de hoy a unos 27 kB en el peor caso de una mesa de seis. Es tres
veces lo de hoy y sigue siendo dos órdenes de magnitud menos que cualquier enumeración
con multiplicidad. Y el portillo, a 100 opciones, cuesta 0,26 ms.

`opcionesFueraDelTablero` ya saca OFRECER de la lista de botones del pie (filtra por
`tipo`, así que se lleva por delante las de uno por uno y la puerta a la vez), y sólo la
llaman las dos pantallas del 3D. Lo que esa función NO cubre es el retablo, y ahí la
puerta se pintaría como un botón cualquiera: por eso hacen falta la marca del §1.12 y,
además, la decisión del §1.12 bis sobre dónde muere.

### 1.3. Pedir lo que ya tienes: se quita el filtro, y DOS COMPROBACIONES SE PONEN ROJAS

Miguel tiene razón y `opcionesDeTrueque` pierde esta línea:

```
if (llegaPara(v.misFichas, [quiero])) continue;
```

Lo que se pierde con ella, dicho sin adornos: **evitaba ofertas absurdas**. Un colono con
cuatro limos que pide un limo más está pidiendo algo que ya tiene, y con uno por uno eso
casi nunca es lo que quiere. Con multiplicidad deja de ser absurdo (pedir dos piedras
cuando se tiene una es la mitad de los trueques de este juego), y en la lista de uno por
uno se queda como ruido aceptado. Lo que cuesta en tamaño de lista está medido en
`medir-trueque.ts`: la media de opciones de OFRECER por turno pasa de 16,5 a 30,8 y el
máximo de 18 a 60.

**Y AHORA LO QUE LA PRIMERA PASADA CONTÓ MAL.** Decía, con estas palabras, que quitar la
línea «deja esa comprobación en verde por nada y el portillo sin vigilancia, y ningún
comprobador se pone rojo al hacerlo». **Es falso**, y se ha medido sobre una copia del
fichero real con la línea quitada (`medir-la-puerta.ts`, §B). Las tres comprobaciones de
ese bloque de `verificar-riberas.ts` quedan así:

| Comprobación, a la letra | Con el filtro | Sin el filtro |
|---|---|---|
| `proponer lo que ya tienes no se ofrece` | verde | **ROJA** |
| `y aunque la rama del reductor lo daría por bueno, el portillo lo rechaza` | verde | **ROJA** |
| `mientras que el mismo trueque por algo que NO tienes sí entra` | verde | verde |

La primera es `!opciones.some(o => o.id === 'ofrecer:B:junco:limo')`, y al quitar el
filtro esa opción SÍ se emite. La segunda manda esa misma carga y exige que el reductor
devuelva el mismo objeto; sin el filtro la carga está ofrecida, el movimiento entra y el
estado cambia.

**Así que el peligro no es el que se había escrito, y es peor de contar aunque sea mejor
de vivir.** No es que nadie se entere: se entera la batería en el primer empujón. Es que
quien las vea rojas las va a BORRAR, porque describen una regla que acaba de revocarse,
y con ellas se va la única vacuna del árbol que demuestra que el portillo existe. Un
comprobador rojo que hay que borrar es una invitación a borrarlo y seguir, y este
repositorio ya tiene apuntado dos veces qué pasa después.

**La regla, entonces:** las dos se borran EN EL MISMO EMPUJÓN que quita la línea, y en
ese mismo empujón entra su sustituta, o la revisión no se acepta. `verify:riberas` está
hoy en 349 comprobaciones y su guardia en 349, así que borrar dos y no poner nada baja el
número y el guardia lo canta; poner una sola también. Se ponen dos.

**La vacuna que las sustituye, medida en el mismo guion (§C):** `opcionesDeTrueque` salta
también `if (otro.bienes === 0) continue;`, o sea que no se ofrece trocar con quien no
tiene nada. Y `ofrecer`, en el reductor, NO comprueba eso: sólo mira `otro >= 0 && otro
!== yo`. Medido con B de almacén vacío: a A no se le ofrece ninguna opción de OFRECER
dirigida a B, y el mismo movimiento mandado a pelo no cambia el estado. Y las dos cosas
siguen siendo verdad CON el filtro y SIN él, que es lo que hace que la sustituta sirva:
no depende de la regla que se está revocando. La puerta paramétrica lo hereda gratis,
porque su lista `a` se construye con el mismo `continue`.

### 1.4. El tope: TRES por lado, y sale de la pantalla más pequeña

`TOPE_POR_LADO_DEL_TRUEQUE = 3`, sustituyendo a `BIENES_POR_LADO_DEL_TRUEQUE = 1`. Tres
razones, dos medidas y una del juego:

- **La tira del pregón en el lienzo más pequeño cabe justo.** Una propuesta se lee como
  fichas de bien con su cifra («3 piedra», una ficha por CLASE y no por unidad), y en el
  SE apaisado (568×320) a la oferta le quedan 165 puntos, o sea **6 fichas** contando la
  flecha del medio (`medir-tablon.ts`). Tres clases por lado son seis fichas: cabe
  exactamente. Con tope de cuatro o cinco no cabe, y lo que se pierde al recortar es la
  mitad derecha de la oferta, que es lo que se pide.
- **Cubre las dos mitades de la pieza más cara.** `COSTES.torre` es `['grano', 'grano',
  'piedra', 'piedra', 'piedra']`: la mitad de piedra son tres y la de grano son dos. Con
  tres por lado se puede pedir de una vez cualquiera de las dos mitades de cualquier
  compra del juego.
- **Las manos reales no dan para más.** En 15.834 turnos con turno y tirada hecha
  (`medir-la-factura.ts`, §D), la mediana de CLASES distintas en la mano es 3 y el máximo
  5. Un trueque de tres por tres es ya un trueque grande.

Y el tope no cuesta nada en la lista, que es la gracia de la decisión 1.1: la puerta
declara `tope: 3` en cuatro caracteres, y quien enumera son las de uno por uno. Subir el
tope a cinco mañana cuesta cambiar una constante y volver a medir la tira; con enumeración
habría costado 6.692 kB. Lo que sí cuesta subirlo está en el §2, y no es la lista: es
cuántos movimientos admite la puerta.

**Nota para el encargo del estiaje:** la mediana de bienes en mano medida hoy es 6 y el
p90 es 21 (`medir-la-factura.ts`, §D). Son números de HOY. La regla del descarte con más
de siete cartas los va a bajar mucho, y por eso el tope de tres no se apoya en ellos: sale
de la tira del SE apaisado y de `COSTES.torre`, y las dos decisiones no se pisan.

### 1.5. Los dos lados van en el ORDEN de `BIENES`, y los normaliza el reductor

Esto no es cosmética: hoy es un fallo que ya se aprendió en rojo. `verificar-riberas.ts`
lo deja escrito en el paso del año bueno: mandar `['sal','limo']` cuando lo ofrecido es
`['limo','sal']` **lo rechaza el portillo**, porque compara formas canónicas y una lista
conserva su orden. Con un bien por lado eso no se notaba. Con tres por lado, un cliente
que monte `da` en el orden en que se tocaron las fichas manda una lista que la puerta
acepta (cuenta multiconjuntos) pero que se GUARDA en el estado con ese orden, y entonces
dos aparatos que compongan el mismo trueque en distinto orden dejan dos `Trato` distintos
en la crónica y en el rótulo.

Así que: `ofrecer` **ordena `da` y `pide` por `BIENES`** antes de construir el `Trato`. El
estado queda canónico, la lista de uno por uno ya sale ordenada (recorre `BIENES`), y la
comparación por forma no depende del orden en que el dedo tocó las fichas.

### 1.6. Se ofrece a la MESA y también a UN colono, y por defecto a la mesa

Miguel pide ver «las propuestas de trueque por cada jugador con capacidad de aceptar o
rechazar». Eso se puede leer de dos maneras y las dos se cumplen a la vez:

- **`para: AsientoId | null`.** `null` es una propuesta ABIERTA, dicha a la mesa. El
  campo `para` de `Trato` deja de ser `AsientoId` y pasa a admitir `null`. El componedor
  ofrece «A la mesa» primero y los nombres después.
- **El dirigido SE QUEDA.** No es nostalgia: es lo que hace que las opciones de uno por
  uno sigan siendo movimientos montados con destinatario, y es lo único que permite una
  oferta discreta al único que tiene piedra. Quitarlo obligaría a la lista de uno por uno
  a ser abierta, y entonces una mesa de seis vería seis veces cada oferta.

**Lo que crece en el estado:** `Trato` gana `rechazada: AsientoId[]`, quienes han
apartado una propuesta abierta. Un abierto sigue en `'propuesta'` mientras quede alguien
que no la haya apartado; cuando la apartan todos los que podían contestarla, pasa a
`'rechazada'`. Un dirigido pasa a `'rechazada'` con el primero, como hoy. Medido, esto no
cuesta nada: el estado a media partida son 3.374 caracteres canónicos; con ocho tratos de
cinco por cinco son 3.851, y con veinticuatro, 6.233 (`medir-portillo.ts`). El tope del
presupuesto es `TOPE_BYTES = 524.288`.

**`opcionesDeTurno` cambia una línea y hay que verla:** hoy filtra
`if (trato.para !== quien) continue;`. Pasa a ofrecer también los abiertos que no son
míos y que no he apartado: `trato.para === quien || (trato.para === null && trato.de !== quien
&& !trato.rechazada.includes(quien))`. La condición «no soy yo quien lo propuso» no
estaba y ahora hace falta: un abierto lo ve todo el mundo, y el proponente no se contesta
a sí mismo.

### 1.7. La carrera: quien acepta primero se lo lleva, y el segundo se entera por el portillo

Con propuestas abiertas, dos personas pueden pulsar «Aceptar» sobre la misma propuesta.
La carrera se resuelve sin ambigüedad y sin escribir nada nuevo, y conviene decir por qué:

1. Los movimientos de una mesa **se serializan**: la cabecera de `mesas.ts` lo dice con
   esas palabras («un candado que serializa»). No hay dos aceptaciones «a la vez»: hay una
   primera y una segunda.
2. La primera entra por `contestar`, cobra las dos mitades y deja el trato en
   `'aceptada'`. La revisión de la mesa sube.
3. La segunda llega por uno de dos caminos, y los dos acaban igual:
   - **Si todavía no ha vuelto a leer**, trae la revisión vieja y el ÁRBITRO la para con
     `revision-rancia`, antes incluso del portillo. Vuelve a pedir el estado y se
     encuentra con que se lo llevaron.
   - **Si ya ha leído**, `opcionesDeRiberas` ya no ofrece aceptarlo, porque el bucle de
     `opcionesDeTurno` salta todo trato con `estado !== 'propuesta'`. Lo para el PORTILLO,
     una capa antes de `contestar`, con el motivo corto y ciego que ya está escrito: «Eso
     ya no se puede hacer: la mesa cambió entre que se pintó el botón y lo pulsaste».
4. Las dos pantallas ya saben leer las dos cosas: `mover` devuelve `'rechazado'` y hay un
   `seIgnoro` en las dos `mesa.ts`. La siguiente vista trae el trato en `'aceptada'` y el
   pregón lo mueve al bloque de las mías con «la aceptó Fulano» (§3.2).

**Y la guarda de `contestar` sigue sin recibir a nadie**, que es lo que hay que ver: la de
`if (trato.estado !== 'propuesta') return estado;` parece que debería empezar a
dispararse con las propuestas abiertas, y no lo hace, porque los dos caminos de arriba
paran antes. Su cabecera («a esas guardas no llega nadie») sigue siendo verdad y hay que
dejarlo escrito ahí, junto con las dos condiciones NUEVAS que tampoco reciben a nadie
(§8), o el siguiente que lea el código le pondrá un motivo que nadie va a leer nunca.

**Lo que se ha pensado y NO se hace:** dar un motivo específico («se lo llevó otro»).
Sería legítimo, porque el estado de un trato es PÚBLICO y no filtra nada, pero para
decirlo habría que seguir ofreciendo ACEPTAR sobre un trato ya aceptado, y eso es pintar
un botón que no hace nada, que es el fallo que la cabecera de los topes de
`opcionesDeTurno` cuenta con 2.834 movimientos medidos. Queda anotado en el §10.

### 1.8. Cuatro propuestas vivas por turno, y `ultimos` deja de ser ciego al estado

`TRATOS_QUE_SE_RECUERDAN = 8` sigue valiendo, y **la primera pasada de este documento
dijo por qué con una frase falsa**. Decía: «con cuatro vivas como máximo y ocho de
memoria, `ultimos` nunca puede tirar una viva: quedan cuatro huecos para las contestadas
y caducadas del turno anterior». No es verdad, porque las contestadas de ESTE turno
también ocupan hueco, y en un turno se puede contestar muchas veces.

**Reproducido con el reductor de verdad, dentro de UN turno y sin pasar nunca de cuatro
vivas** (`medir-la-carrera.ts`, §A). A tiene junco y limo, B tiene sal; proponer no cobra
nada, así que A puede repetir la misma oferta:

```
t1 (nadie la contesta)   ·  t2 t3 t4  ->  cuatro vivas, el tope
rechazadas t2 t3 t4      ->  una viva
t5 t6 t7                 ->  cuatro vivas otra vez
rechazadas t5 t6 t7      ->  una viva
t8                       ->  dos vivas
t9                       ->  la lista llega a nueve y `ultimos` corta por el final
```

Quince movimientos dentro de un turno. Al final el estado guarda `t2` a `t9` y **`t1`,
que seguía en `'propuesta'`, no está**: no caducó, no se rechazó, no se aceptó; se cayó
del array, y desaparece de la vista de todos sin explicación ninguna.

**El arreglo, elegido entre los dos que había:**

- **Se descarta el tope dinámico** (que `PROPUESTAS_VIVAS_A_LA_VEZ` dependa de cuántos
  huecos queden). El tope de vivas es una regla que el jugador VE, porque sale en
  `opciones()` y en el botón apagado del componedor. Hacerla depender de cuántas
  contestadas lleve el turno la convierte en una regla que cambia sola y que nadie puede
  contar mirando la mesa.
- **Se elige que la memoria deje de ser ciega.** `ultimos` se llama
  **`losQueSeRecuerdan(tratos)`**, porque su nombre viejo prometía un recorte por el final
  y lo que hace ahora no lo es, y esta casa tiene escrito que un nombre que miente es un
  fallo. Guarda TODOS los que están en `'propuesta'` y recorta sólo entre los cerrados
  (aceptadas, rechazadas y caducadas), del más viejo al más nuevo, hasta que la lista
  quepa en `TRATOS_QUE_SE_RECUERDAN`. Su cabecera nueva dice, entero, por qué el nombre
  cambió y qué se reprodujo para llegar aquí.
- **Y el tope de cuatro baja al REDUCTOR, no sólo a `opciones()`.** `ofrecer` cuenta mis
  vivas y responde `rechazar(estado, 'Ya tienes cuatro propuestas en la mesa.')`. Es dato
  público (`v.tratos` entero está en la vista de todos), así que el motivo no filtra nada.
  Con eso la cuenta se cierra por aritmética y no por costumbre: sólo propone quien tiene
  el turno, los trueques caducan al acabarlo, así que **todas las vivas son de la misma
  persona y no pueden pasar de cuatro**. Cuatro vivas más cuatro cerradas caben en ocho, y
  `losQueSeRecuerdan` no tiene nunca que elegir entre dos vivas.

**La vacuna, y es literalmente el guion de arriba:** el comprobador reproduce t1 a t9 con
sus seis rechazos, exige que el máximo de vivas simultáneas sea cuatro, que la lista final
tenga ocho, y que **`t1` siga dentro y en `'propuesta'`**. Con el `ultimos` de hoy se pone
roja. Y una segunda que exige que la novena propuesta consecutiva sin rechazar ninguna
salga con motivo, que es la guarda nueva de `ofrecer`.

Y cuatro es además el número que cabe en la pantalla, aunque no en todas: ver el §4, donde
la cuenta se rehace con la barra puesta y sale distinta de la que había.

### 1.9. La aceptación se confirma, y la tira NO lleva botón de aceptar

Miguel: «la aceptación debe tener que confirmarse para que no se acepte por
equivocación». La forma de garantizarlo no es poner un diálogo detrás del botón: es que
**en la tira no haya botón de aceptar**.

La tira entera es un botón, y lo único que hace es ABRIR la hoja de la propuesta. En la
hoja están «Aceptar» y «Rechazar», cada uno con su renglón de 44 y su rótulo escrito. Dos
toques, y el primero no está encima del segundo. Aparte de ser lo que Miguel pide, es lo
que hace que la tira quepa: medido, si la tira llevara sus dos botones de 44 al lado, a
la oferta le quedarían **77 puntos en el SE apaisado (2 fichas)** y **16 en 320×360 (cero
fichas)**, contra los 165 y 104 que quedan sin ellos (`medir-tablon.ts`).

**Y esto vale para las DOS pantallas, no para una.** En el retablo, aceptar es hoy un
botón suelto de `AccionesDelTablero` que se dispara de un toque, o sea que la mesa de
cinco y de seis se quedaba sin la confirmación que Miguel pidió. El §4.2 lo arregla con
el mismo mecanismo y sin componente nuevo.

### 1.10. El PREGÓN cuelga de la cinta y NO es modal; el componedor SÍ lo es y va a todo el ancho

**Antes del qué, el nombre, porque la primera pasada eligió uno que ya está cogido.** Lo
llamaba «el tablón», y en este árbol `tablon` significa otra cosa: `escenas/tablon.ts` es
la MESA hecha geometría, con `geometriaDeLaTapa`, `vetaDelTablon` y los tres tablones de
madera que `docs/LA-MESA-DE-RIBERAS.md` mide en nueve sitios. Y peor todavía: el filtro
nuevo se iba a llamar `opcionesFueraDelTablon`, a una letra de `opcionesFueraDelTablero`,
que existe y hace otra cosa. Tres palabras casi iguales para tres cosas distintas es la
clase de nombre que se lee mal a las dos semanas.

Se llama **EL PREGÓN**: lo que se dice en voz alta para que lo oiga quien quiera, que es
exactamente lo que es una propuesta abierta, y es vocabulario de ribera. El filtro es
`opcionesFueraDelPregon` y ya no se parece a nada.

Dicho eso, son dos superficies distintas y se separan por quién las usa y cuándo:

- **El pregón** lo lee quien NO tiene el turno, mientras otro juega. Tiene que estar a la
  vista sin abrir nada (Miguel: «se tiene que mostrar en la pantalla las propuestas»), así
  que **no es modal**: cuelga de la cinta, mide lo que la cinta (`anchoDeLaCinta`) y sólo
  existe mientras haya propuestas vivas que yo pueda contestar o propuestas mías. Debajo
  se sigue pudiendo girar el tablero. **Y se desplaza en vertical**, porque medido no cabe
  entero en el peor lienzo (§4.1).
- **El componedor** lo usa quien SÍ tiene el turno, y mientras compone no puede tocar el
  tablero (un toque perdido funda una choza). Así que **es modal**, como el cajón del
  marcador, y por ser modal puede ocupar **todo el ancho** del lienzo, que es lo que
  necesita: medido, un renglón de bien mide 162 puntos (ficha 44, «−» 44, cifra 30, «+»
  44) y el ancho de la cinta se queda corto en los cuatro lienzos de pie (128, 144, 156 y
  156). A todo el ancho cabe en los quince.

El pregón y el cajón cuelgan del mismo sitio, así que **sólo uno está abierto a la vez**:
abrir el cajón cierra el pregón y al revés. Es un cambio del otro documento y va en el §5.

### 1.11. Las CINCO áreas de trueque del 3D se convierten en UNA

`AreaDeTrueque` en `escenas/delta.tsx` existe para soltar una carta de bien sobre el área
del bien que se quiere a cambio: es un trueque de uno por uno hecho gesto, y con
multiplicidad no significa nada (no hay dónde decir «tres»). Pero borrarlas del todo deja
la mano de bienes sin ningún gesto: hoy lo único para lo que se coge una carta de bien es
soltarla en un área.

Así que se queda **una sola**, el mostrador: `areasDeTrueque` se llama con `cuantas = 1`,
el área no lleva el dibujo de un bien sino el de la mesa, y soltar una carta encima
**abre el componedor con ese bien ya puesto en el lado de "doy"**. El gesto sobrevive, la
mano de bienes no cambia una línea (`escenas/baraja.ts` sigue congelado) y lo que decide
cantidades es el componedor, que es DOM y React Native y sabe escribir números.

### 1.12. LA MARCA: una opción que es una DECLARACIÓN y no un movimiento

**Es la decisión que la primera pasada no tomó, y sin ella la puerta es una opción
muerta.** Medido con el fichero real más la puerta añadida (`medir-la-puerta.ts`, §A): la
carga de la puerta es `{ tope: 3, a: ['B'], mesa: true }`, sin `da` ni `pide`. Mandada tal
cual, **coincide consigo misma en forma canónica**, o sea que pasa el portillo entero, y
cae en la primera guarda de `ofrecer`, que hoy es muda y devuelve el MISMO objeto de
estado. Resultado medido: `tratos` sigue en cero, el árbitro contesta que sí, la revisión
no sube y el motivo llega nulo.

Y mandarla tal cual no es un caso raro: es LO QUE HACE la casa. La mandan un cliente
tonto, la manda `AccionesDelTablero` del retablo (que pinta lo que hay en `acciones` y
manda su `toque` sin mirar), y la manda el jugador ciego de la fase 5 del estiaje, que
elige uniformemente de `opciones()`. Para eso está en la lista.

**Se arreglan las dos cosas en el mismo empujón, porque cada una sola deja el fallo a
medias:**

**(a) `ofrecer` deja de ser mudo en esa guarda.** Como `para: null` pasa a ser legal
(§1.6), la guarda se parte en dos y sólo la primera es la del error de forma:

```
si da === null o pide === null  ->  rechazar(estado, 'Eso no es un trueque: falta lo que das o lo que pides.')
```

El motivo no filtra nada: habla de la CARGA que acaba de mandar quien mueve, no del
estado ni de nadie más. Con eso, la puerta mandada tal cual deja de ser silencio y pasa a
ser un mensaje, y la afirmación «ninguna opción devuelve el mismo estado sin motivo» de la
fase 5 del estiaje se puede escribir sin excepciones.

**(b) La marca en el tipo `Opcion`, para que nadie la mande.** Un mensaje de error no
basta: la puerta seguiría pintándose como un botón en las listas de opciones, y el jugador
ciego seguiría gastando en ella una de cada N elecciones. (La lista de opciones no es el
único camino por el que la puerta llega a una pantalla, y el otro no lo cierra esta marca:
está en el §1.12 bis, y es la corrección de esta revisión.)

| Qué | Cómo |
|---|---|
| **Nombre** | `declaracion` |
| **Tipo** | `declaracion?: true` en `Opcion`, en `shared/arcade/opciones.ts`. Opcional y sólo `true`: una opción que no la trae es exactamente lo de hoy, y no hay `false` que alguien pueda leer al revés |
| **Qué significa** | «Esto NO es un movimiento montado: es una declaración de lo que el juego admitiría. No la mandes; léela para construir el movimiento que sí se manda» |
| **Quién la escribe** | Sólo `opcionesDeTrueque`, en la opción de puerta. Es la única de todo el árbol hoy |
| **Quién la lee, y son cuatro** | 1. Los muebles genéricos que pintan OPCIONES: `Formulario` del escritorio (dentro de `loQueSePuedePintar`, que es donde ya se decide qué se pinta y qué no) y `LasOpciones` de la app. Una opción con `declaracion` no se pinta. 2. `opcionesFueraDelTablero` y `opcionesFueraDeLaMesa` en `riberas-en-tres.ts`, que ya filtran y ahora filtran también por la marca, para no depender de que cada mueble se acuerde. 3. `puertaDelTrueque(opciones)`, que la busca POR la marca y no por su `id`. 4. El jugador ciego de la fase 5 del estiaje, que la salta al elegir |
| **Quién NO la lee porque no puede** | `AccionesDelTablero`, que es el mueble del retablo. No recibe opciones: recibe `AccionDeTablero`, que es otro tipo y no tiene ese campo. Ahí la puerta se para una capa antes, y es el §1.12 bis entero |
| **Quién NO la lee, a propósito** | El portillo. `estaOfrecido` sigue comparando `{ tipo, carga }` y nada más: la marca es de la pantalla, no de la legalidad, y meterla en la comparación canónica cambiaría la firma de todas las opciones |

**Qué se rompe si alguien la ignora, medido:** exactamente lo del párrafo de arriba. Un
mueble que la ignore pinta un botón «Proponer un trueque» que, pulsado, manda la
declaración, recibe el motivo de la guarda (a) y no hace nada más: un botón encendido que
no juega, que es el mismo fallo que la cabecera de los topes de `opcionesDeTurno` cuenta
con 2.834 movimientos. Y un jugador ciego que la ignore gasta elecciones en un movimiento
que nunca avanza la partida.

**Y por qué la marca y no un convenio en el `id`.** Un `id` que empiece por
`ofrecer:puerta` lo entendería `riberas-en-tres.ts` y nadie más. La cabecera de
`Opcion.id` dice que un id sale del vocabulario público y sirve para reconciliar por
identidad, no para llevar significado que el lector tenga que saberse. Y el mueble
genérico existe justamente para los arcades que esta casa no escribe
(`ARCADES_EXTERNOS`): un convenio que hay que conocer no lo conoce quien llega mañana.
El precio, dicho: es el único cambio de este encargo en `shared/arcade/`, y por eso la
fase 1 lo empuja con `verify:nucleo` y `verify:arcade-pobre` delante.

### 1.12 bis. DÓNDE MUERE LA PUERTA EN EL RETABLO, que es donde la marca no llega

**La marca sola no salva la pantalla que se escribió para salvar, y esto es lo que la
revisión encontró.** El §1.12 da por hecho que `AccionesDelTablero` lee `declaracion` y no
pinta la puerta. No puede: **ese mueble no recibe opciones.** Recibe un `TableroDeclarado`,
y sus botones son `AccionDeTablero`, que está declarado en
`shared/mecanicas/tablero-declarado.ts` con CINCO campos (`id`, `rotulo`, `ayuda`,
`disponible` y `toque`) y ni uno es `Opcion`. La marca se queda en la orilla.

Y no es que la puerta *pudiera* llegar hasta ahí: llega. `tableroDeRiberas` construye
`acciones` recorriendo `opcionesDeRiberas(v, quien)` y copiando TODA opción salvo dos
(FUNDAR, y el ALZAR que ya tiene sitio en el mapa) con `disponible: true` fijo. La puerta
no es ninguna de las dos, así que cae ahí como un botón normal, encendido, que pulsado
manda la declaración y no hace nada. Es exactamente el fallo del §1.12, intacto, en la
única pantalla que tiene una mesa de cinco o de seis.

**LAS DOS SALIDAS, Y LA QUE SE ELIGE.**

**(a) El filtro va en `tableroDeRiberas`, con el MISMO `continue`. ES LA QUE SE ELIGE.** La
condición que hoy salta FUNDAR y el ALZAR con sitio salta también la opción marcada, y la
marca se lee ahí porque ahí todavía es una `Opcion`: `tableroDeRiberas` tiene la lista
entera delante, la ha pedido él. **La marca se lee donde nace la lista y no viaja al
mueble.** Y el mismo `continue` va en la copia que hace `tableroVacio` de ese fichero, no
porque haga falta hoy, que sin islas repartidas no hay trueque que ofrecer, sino para que no
haya un camino que dependa de eso.

**(b) La marca baja también a `AccionDeTablero`.** Se descarta, y por tres cosas:

- `shared/mecanicas/tablero-declarado.ts` es el contrato del mueble GENÉRICO, el que
  comparten La Ronda y los arcades que esta casa no escribe. Meter ahí `declaracion` es
  poner el mismo concepto en dos tipos, y dos tipos son dos sitios donde olvidarlo. El
  argumento del §1.12 contra el convenio en el `id` es literalmente éste: un significado
  que hay que conocer no lo conoce quien llega mañana. Escribirlo dos veces es conocerlo
  dos veces.
- Un `AccionDeTablero` con `declaracion` sería un botón que el tablero declara **para no
  pintarlo**, o sea una acción que existe para no ser una acción. `disponible: false` no
  sirve como sucedáneo: el mueble tiene escrito que una acción no disponible **se pinta
  apagada en vez de desaparecer**, porque saber que existe un «pasar» que ahora no se puede
  pulsar es información. Un «Proponer un trueque» apagado que nunca se enciende es la
  misma mentira con menos tinta.
- Y cuesta el §6: dejaría de ser verdad que el único cambio fuera de `riberas.ts` y de las
  pantallas es `declaracion?: true` en `shared/arcade/opciones.ts`.

**LO QUE CUESTA (a), QUE NO ES GRATIS Y ES LA MITAD DE ESTA DECISIÓN.** Sacar la puerta de
`acciones` la devuelve por la otra puerta. `opcionesSueltas`, en ese mismo
`shared/mecanicas/tablero-declarado.ts`, es la que hace que cada movimiento se enseñe
exactamente una vez: recoge los `toque` de caras, líneas, nudos y **acciones**, y devuelve
de `opciones()` lo que no esté ahí, comparando por forma canónica del movimiento. Si la
puerta deja de estar en `acciones`, su movimiento deja de estar recogido, y
`opcionesSueltas` la manda derecha al `Formulario` de «Y además puedes» que el retablo
pinta debajo. Sería el mismo botón muerto, una fila más abajo.

Así que **el filtro de `tableroDeRiberas` no cierra el agujero solo**: lo cierra junto con
el filtro por `declaracion` de `Formulario` y de `LasOpciones` (§1.12), con la misma regla
que el §1.3 le impone a las dos comprobaciones y a su sustituta. Uno sin el otro deja el
botón muerto: el filtro sin el mueble lo baja de sitio, y el mueble sin el filtro lo deja
arriba.

**Y por eso los dos entran en la FASE 1 y no en la 3, aunque uno de ellos toque dos
ficheros de pantalla.** La puerta nace en la fase 1; si sus dos filtros no nacen con ella,
la fase 1 deja el juego con un botón encendido que no juega en la única pantalla de las
mesas de cinco y de seis, y la regla de estas fases es que cada una deja el juego entero y
verde. Son dos líneas en dos muebles, `loQueSePuedePintar` en el `Formulario` y el mapeo de
`LasOpciones`, y no una pantalla nueva, y las tres comprobaciones de abajo van con ellas
(§9, fase 1).

**Lo que esto AHORRA, y conviene decirlo porque es lo contrario de una factura:**
`escritorio/src/retablo.tsx` y `app/src/arcade/retablo.tsx` **no cambian ni una línea**. El
retablo sigue sin saber qué es un trueque, que es lo que el §6 prometía y con la salida (b)
habría dejado de ser verdad.

**La vacuna, y son tres comprobaciones de una pieza** (fase 3, `verify:riberas` y
`verify:escritorio`): sobre una vista donde la puerta existe, (1) `tableroDeRiberas` no
mete ninguna acción cuyo `toque` sea el de la declaración; (2) `opcionesSueltas` SÍ la
devuelve, que es la consecuencia honrada de (1) y se escribe para que nadie la arregle a
escondidas; y (3) el `Formulario` de «Y además puedes» no la pinta. Romper cualquiera de
las tres a mano tiene que poner una roja: volver a meterla en `acciones`, la primera;
quitar el filtro de `loQueSePuedePintar`, la tercera.

## 2. El portillo con forma: qué comprueba, qué cuesta, y qué se rompe si se debilita mal

**Lo que comprueba `cabeEnLaPuerta(declaracion, carga)`**, y nada más:

1. `da` y `pide` son listas de bienes de `BIENES`, cada una con entre 1 y `tope`
   elementos.
2. Ningún bien está en los dos lados (no se cambia limo por limo).
3. `para` es `null` (si la declaración trae `mesa: true`) o uno de los asientos de
   `declaracion.a`.

**LA FACTURA DE LA PUERTA, QUE ES EL COSTE DE LA DECISIÓN 1.1.** Con tope 3, cinco clases
de bien y una mesa de cuatro (tres rivales más «a la mesa», o sea cuatro destinos), la
puerta admite (`medir-la-factura.ts`, §A):

| Tope | Multiconjuntos por lado | Pares con la regla 2 | OFRECER en mesa de cuatro | OFRECER en mesa de seis |
|---|---|---|---|---|
| 1 | 5 | 20 | 80 | 120 |
| 2 | 20 | 230 | 920 | 1.380 |
| **3** | **55** | **1.170** | **4.680** | **7.020** |
| 4 | 125 | 4.000 | 16.000 | 24.000 |

**Y la regla 2 no es cosmética: es la mitad de la factura.** Sin ella (o sea, si alguien
la quita «porque pedir dos piedras teniendo una es legítimo» y de paso deja pasar dar limo
por limo), los pares suben de 1.170 a 3.025 y los movimientos admitidos en mesa de cuatro
de 4.680 a **12.100**. Ése es el número que hay que tener delante al tocar `cabeEnLaPuerta`.

**Lo que pasa con casi todos ellos:** que el reductor los devuelve MUDOS. Medido sobre
15.834 manos de verdad, de ocho partidas de cuatro colonos jugadas a ciegas eligiendo
uniformemente de `opciones()` de toda la mesa (16.698 movimientos aplicados;
`medir-la-factura.ts`, §B y §C), contando cuántos de los OFRECER admitidos NO pasan
`llegaPara(mio.almacen, da)`:

| | Media | Mediana | Mínimo | Máximo |
|---|---|---|---|---|
| Con la regla 2 puesta (1.170 pares) | **75,0 %** | 76,6 % | 2,9 % | 100 % |
| Sin la regla 2 (3.025 pares) | 78,4 % | 80,0 % | 1,8 % | 100 % |

O sea que en un turno mediano tres de cada cuatro movimientos que la puerta deja pasar
mueren en una guarda que hoy no dice nada, porque `if (!llegaPara(mio.almacen, da)) return
estado;` era inalcanzable (el portillo enumeraba y lo que enumeraba lo tenía) y pasa a ser
un camino normal.

**Así que esa guarda deja de ser muda:** `rechazar(estado, 'No tienes lo que estás
ofreciendo.')`. No es fuga, y el criterio es el mismo de siempre: habla de MI almacén, que
está en MI vista, y no nombra ningún bien ni a nadie. Es lo contrario del caso de
`contestar`, donde el motivo callado habla del almacén del OTRO.

**Y lo que NO comprueba la puerta, a propósito: si tengo lo que ofrezco.** La declaración
**no lleva mi mano dentro**, y ésta es la decisión de seguridad de todo el documento. El
motivo es medible: `verify:mesa` compone lo que se le manda a cada asiento como
`{ vista, opciones: opcionesDeArcade(...) }` y busca ahí dentro los valores canónicos de
`loSecreto`, o sea `"b17:junco"` CON comillas. Una ficha metida en la declaración la
cazaría. **Una CUENTA («tengo cuatro limos») no la caza**, porque no contiene esa cadena.
O sea que una declaración con cuentas sería una superficie nueva que el comprobador de
secretos no vigila, y el día que alguien la componga con la mano de otro (por ejemplo
para no ofrecer lo que el otro no puede pagar) la fuga sería invisible. Así que la
declaración lleva sólo datos públicos: un número y una lista de asientos, y el 75 % de
movimientos mudos es el precio de eso, dicho con su cifra.

**QUÉ SE ROMPE SI EL PORTILLO SE DEBILITA MAL.** El portillo es lo único que impide que
un cliente manipulado mande cualquier cosa; el árbitro no mira dentro de la carga porque
no puede (el estado es opaco para él). Las cinco formas de estropearlo:

| Cómo se debilita | Qué entra por ahí |
|---|---|
| La rama de forma se aplica a TODOS los movimientos y no sólo a OFRECER | Se acabó el portillo. `fundar` en cualquier vértice, `alzar` donde no pega, jugar una carta que no está en la mano. Las guardas de cada rama tapan casi todo, pero no todo: la cabecera de `pegaConLoSuyo` mide que sin el corte en la vista **la vereda ENTRA**, porque el portillo es justo quien pregunta |
| La declaración se construye leyendo el ESTADO en vez de la vista | El portillo deja de garantizar lo que existe para garantizar. `opciones()` recibe la vista y jamás el estado, y eso es «imposible por construcción y no por disciplina»; una declaración que se salte esa firma es una segunda proyección con su propio tapado, y `verify:mesa` no la mira |
| La declaración lleva cuentas de la mano (mía o de otro) | Superficie nueva de fuga que el comprobador de secretos NO caza, por lo dicho arriba |
| La comprobación de forma se hace ANTES de buscar la opción de puerta | Se puede ofrecer sin tener el turno, sin haber tirado y con una vereda de la carta pendiente, porque esas tres cosas no las dice la forma: las dice el hecho de que la puerta esté en la lista. Es el fallo más fácil de escribir y el más difícil de ver |
| Se quita la regla 2 de `cabeEnLaPuerta` | Los movimientos admitidos por turno pasan de 4.680 a 12.100 en mesa de cuatro, y entran los trueques de limo por limo, que no son un trueque |

Y hay un sexto, que es de presupuesto y no de reglas: **la comprobación de forma corre
DENTRO del tramo cronometrado**, igual que el `canonico` de hoy. Tiene que ser
proporcional al tamaño del movimiento y no al de la lista, o sea contar hasta `tope` y
parar. Un `cabeEnLaPuerta` que recorriera algo que elige quien llama reabre por la puerta
de al lado el ataque de los 240 kB que `TOPE_CARGA_BYTES` cerró, y la cuarentena que hay
al otro lado es por arcade, permanente y sin puerta para levantarla. Medido: con la carga
acotada a 8 kB por la ruta, contar tres bienes por lado es del orden del microsegundo.

## 3. La pantalla en el tablero de tres dimensiones

Las tres piezas son las mismas en el escritorio (DOM) y en la app (React Native), con los
mismos números, y las tres viven fuera del lienzo, como manda la decisión 7 del otro
documento (el lienzo no puede escribir «Miguel»).

### 3.1. La tira: qué se ve de una propuesta sin abrir nada

Una tira por propuesta, **44 puntos de alto**, en el ancho de la cinta. De izquierda a
derecha: el raíl de color de quien la propone (4 puntos, el `fichaRail` de siempre), y la
oferta como fichas de bien con su cifra, `da` a la izquierda, una flecha, `pide` a la
derecha. Sin botones (§1.9). Lo que se oye es la frase entera: «Ana ofrece tres piedras y
dos granos por un limo. A la mesa. Toca para contestar».

Medido en los quince lienzos de `LIENZOS` (`medir-tablon.ts`), con el ancho de la cinta
reproducido de su regla (el tercio en apaisado, el 40 % de pie: la función
`anchoDeLaCinta` de `escenas/cinta.ts` está PENDIENTE de la fase 5 del otro documento):

| Lienzo | Ancho de la cinta | Ancho para la oferta | Fichas que caben |
|---|---|---|---|
| 568×320 (SE apaisado) | 189 | 165 | 6 |
| 667×375 (SE 2/3) | 222 | 198 | 8 |
| 780×360 (Android) | 260 | 236 | 10 |
| 844×390 (iPhone 14) | 281 | 257 | 10 |
| 932×430 (Pro Max) | 311 | 287 | 12 |
| 1024×768 (tableta 4:3) | 341 | 317 | 13 |
| 1180×820 (iPad Air) | 393 | 369 | 16 |
| 1920×1080 (monitor) | 640 | 616 | 27 |
| 320×360 (de pie) | 128 | 104 | 4 |
| 390×845 (de pie) | 156 | 132 | 5 |
| 768×1024 (tableta de pie) | 307 | 283 | 12 |

El tope de tres por lado sale de la columna de la derecha: seis fichas en el SE son tres
clases por lado. **De pie en 320×360 sólo caben cuatro fichas**, así que ahí una oferta de
3×3 se recorta con puntos suspensivos en el lado de `pide`; de pie es la forma secundaria
(la app bloquea el apaisado y en la web está el cartel de girar), la frase entera se oye y
está en la hoja.

**Cuántas tiras caben es otra cuenta, y la primera pasada la hizo mal.** Decía «276 puntos
útiles bajo la cinta» en el SE apaisado, que es `320 − 44` y **se olvidó de la barra**, que
vive DENTRO del lienzo. Rehecha con `huecosDeLaBarra`, `ASA_DEL_HUECO` y `loQueSeVe` del
código de verdad, está en el §4.1, y sale distinta.

### 3.2. El pregón: dos bloques, porque el que propone tampoco veía nada

**Es el segundo agujero que la primera pasada dejó abierto.** El pregón sólo pintaba las
propuestas que YO puedo contestar. El que propone no veía nada de lo suyo: ni sus hasta
cuatro vivas, ni quién había apartado cuál (el campo `rechazada` no se pintaba en ninguna
parte), ni por qué de pronto dejaba de poder proponer, ni quién le había aceptado una.

Caminando el caso que Miguel pidió, «un trueque de tres por dos con dos aceptaciones»: el
primero que pulsa se lo lleva; el segundo se lleva el motivo genérico del portillo (§1.7),
que es correcto; y el que propuso no se entera de quién de los dos fue, porque en su
pantalla no hay ningún sitio donde eso se escriba. Son datos PÚBLICOS: `v.tratos` va
entero en la vista de todos, con `de`, `para`, `estado` y `rechazada`.

Así que el pregón tiene **dos bloques**, cada uno con su renglón de rótulo de 44:

1. **«Para contestar»**, las que yo puedo contestar. Tira igual que la del §3.1.
2. **«Tuyas»**, las mías de este turno, en cualquier estado. Misma tira, con **una
   segunda línea de texto en tenue** que dice en qué anda: `viva`, `apartada ×2`,
   `la aceptó Ana`, `caducada`.

**La segunda línea no cuesta ancho, y por eso es una segunda línea y no una columna.**

**Antes de la cuenta, el número que esta tabla tenía mal: LA RAÍZ DE ESTA CASA VALE 17
PUNTOS Y NO 16.** `escritorio/src/estilo.css` abre con `html { font-size: 106.25% }`, que
sobre los 16 del navegador son 17. Aquí se había escrito la cuenta con 16 («0,82 rem, o sea
13 puntos») y de ese 16 salían un cuerpo corto y un ancho de letra corto: una tabla que
decía que caben más letras de las que caben. Ése es el error, y es el que produjo la tabla.
Con la raíz de verdad:

| Qué | De dónde sale | Cuánto |
|---|---|---|
| Cuerpo de `.opcion-ayuda` | `font-size: 0.82rem` sobre 17 | **13,94 puntos** |
| Ancho por letra | `ANCHO_DE_GLIFO` (0,6) en `escritorio/src/retablo.tsx`, el único número de anchura de letra que la casa tiene escrito | **8,36 puntos** |
| Renglón | el cuerpo por el interlineado de 1,35, redondeado hacia arriba | **19 puntos** |

Dos renglones de 19 miden **38 puntos y caben en la tira de 44**, que es lo que había que
comprobar y sigue saliendo, ahora con tres puntos menos de holgura. Y las letras que caben
en el ancho de la oferta, rehechas con los 8,36 (`medir-el-sitio-con-todo.ts`):

| Lienzo | Ancho para la oferta | Letras en la segunda línea |
|---|---|---|
| 568×320 | 165 | 19 |
| 320×360 | 104 | **12** |
| 390×845 | 132 | 15 |
| 844×390 | 257 | 30 |
| 1920×1080 | 616 | 73 |

**Y con la raíz buena, en el peor lienzo la conclusión se da la vuelta.** `apartada ×2` son
once letras, 91,96 puntos de 104, y sigue cabiendo en los quince. Pero `la aceptó Ana` son
TRECE, o sea 108,68 contra 104: **en 320×360 no cabe, y se pasa por 4,68 puntos**. La
primera versión decía que cabía «el peor por tres puntos», y era el 16 hablando.

Así que la regla que estaba escrita como precaución pasa a ser la que se aplica de verdad,
y por eso queda escrita aquí y no en una nota: **si un nombre no cabe se recorta ÉL, nunca
el estado.** En 320×360 se lee «la aceptó A…», y quién fue está entero en la hoja. Saber
que te la aceptaron importa más que saber quién.

**Y el renglón de «no puedes proponer más» va en dos sitios, porque uno solo no siempre
está.** Cuando tengo cuatro vivas, el bloque «Tuyas» gana un renglón en tenue: «Cuatro
propuestas en la mesa: no puedes proponer más hasta que se contesten o pase el turno». Y
además, y esto es lo que siempre se ve, el botón «Proponer un trueque» de la cinta se
apaga con `aria-disabled` y su ayuda dice lo mismo. El renglón puede quedar fuera del
recorte del pregón en el SE apaisado (§4.1); el botón no, porque está en la cinta.

**Tocar una tira mía abre la hoja en modo lectura:** qué ofrecí, a quién, quién la apartó
por su nombre, quién la aceptó, y sin botones. Es la misma hoja del §3.3 con el bloque de
botones vacío, no un componente nuevo.

### 3.3. La hoja de la propuesta: donde se confirma

Se abre tocando la tira. Modal, del ancho de la cinta, tres renglones de 44:

1. **Qué es**, con las dos manos escritas en palabras y no en fichas: «Ana te da 3 piedra
   y 2 grano. Tú le das 1 limo». Y debajo, en tenue, «A la mesa: puede aceptarlo
   cualquiera» o «Sólo a ti».
2. **«Aceptar el trueque»**, con el fondo de acento.
3. **«Rechazar»** para un dirigido, **«No me interesa»** para un abierto, porque no es lo
   mismo: apartar un abierto no lo mata para los demás (§1.6).

Un toque fuera la cierra sin hacer nada, igual que el cajón. Tres renglones son 132
puntos.

### 3.4. El componedor: cómo se monta una oferta de varios bienes con el dedo

Modal, **a todo el ancho** (§1.10), y se abre de dos maneras: el botón «Proponer un
trueque» de la cinta cuando es mi turno, o soltando una carta de bien en el mostrador del
3D (§1.11), que además lo abre con ese bien ya puesto.

Ocho renglones de 44, o sea **352 puntos**:

1. El conmutador **«Doy» / «Pido»**, dos mitades de un renglón. Es lo que evita dos
   contadores por fila: medido, una fila con dos contadores mide 296 puntos y no cabe en
   el ancho de la cinta de ningún teléfono.
2. a 6. **Un renglón por bien**: la ficha del bien (44), «−» (44), la cifra (30), «+»
   (44), y a la derecha, en tenue, cuántos tengo. En el lado «Doy» sólo salen los bienes
   que tengo (mediana medida: 3 clases; máximo: 5); en el lado «Pido» salen los cinco
   menos los que estoy dando. El «+» se apaga con `aria-disabled` al llegar al tope o a lo
   que tengo, **nunca con `disabled` nativo**, por lo mismo que el botón de tirar los
   dados: un `disabled` deja de ser enfocable y el navegador tira el foco al `body`.
3. **A quién**: «A la mesa» primero, y luego un nombre por colono con bienes.
4. **«Proponer»**, apagado mientras algún lado esté vacío, y también con las cuatro vivas
   puestas, con su ayuda diciendo por qué.

Medido: el renglón de 162 puntos cabe a todo el ancho en los quince lienzos. De los ocho
renglones se ven seis en el SE apaisado (faltan 76 puntos) y siete en el SE 2, el Android
de 360 y el iPhone 14; se desplaza en vertical, como el cajón.

### 3.5. Lo que sale de los botones del pie

Aceptar y rechazar dejan de ser botones del `Formulario` del escritorio y de
`LasOpciones` de la app: ahora los pinta el pregón, y la regla de la casa es que cada
movimiento se enseña exactamente una vez. Hace falta un filtro nuevo en
`shared/arcade/juegos/riberas-en-tres.ts`, hermano de `opcionesFueraDeLaMesa`:
`opcionesFueraDelPregon(opciones, hayPregon)`, que quita ACEPTAR y RECHAZAR cuando el
pregón está pintado y las deja cuando no (un mirón, una pantalla que todavía no lo pinte).
Y con el mismo orden que `opcionesFueraDeLaMesa`: **el pregón recibe las opciones ENTERAS,
antes del filtro**, o se quedaría sin nada que pintar.

Lo que queda en el pie: tirar (donde no hay dados), pasar y empezar.

## 4. El sitio, medido UNA VEZ y con todo puesto

**Ésta es la sección que la primera pasada no tenía, y es donde se ven los errores de
medida y el agujero de la mesa de cinco.** Todo sale de `medir-el-sitio-con-todo.ts`, que
saca el techo del asa de la barra de `huecosDeLaBarra`, `ASA_DEL_HUECO` y `loQueSeVe` de
`escenas/barra.ts` (el código de verdad, con los cuatro huecos de jugar y el campo de 45
grados que usa `verify:escena`) y reproduce la fracción de `anchoDeLaCinta`.

**Son cuatro errores y no dos, porque la revisión de esta segunda pasada encontró otros
dos.** Los dos que ya estaban dichos: que las tiras bajo la cinta se contaban con
`alto − 44`, olvidando la barra (§3.1 y §4.1), y que la mesa de cinco y de seis no tenía
pantalla escrita (§4.2). Los dos nuevos: que a la banda libre se le restaba **la cuarta
columna de insets de abajo del §1.11 de la mesa**, que ahí no pinta nada porque el asa vive
por encima de ella (§4.1); y que el alto del tablero del retablo se leía de la regla de
estilo equivocada (§4.2).

### 4.1. La banda central con la cinta de 88, el pregón y el cartel a la vez

Tres cosas se pelean por la misma columna de puntos y hasta ahora cada documento medía la
suya sola:

- **La cinta** puede llegar a **88** y no a 44: su segunda línea (los botones sueltos)
  aparece cuando hay alguno, y el estiaje le añade avisos. Ocupa de 0 a 88 desde el canto
  de arriba.
- **El pregón** cuelga de ella, hacia abajo.
- **El cartel de la carta** (`docs/LAS-CARTAS-SE-EXPLICAN.md` §5.1) va pegado al canto de
  abajo, sobre el asa de la barra, y su caja está topada a la mitad del alto libre.

Los dos son alcanzables a la vez: el cartel se pide con el puntero sobre un naipe, que no
exige turno, y el pregón existe justo cuando el turno es de otro.

**El modelo, entero, y con el arreglo dentro.** La banda libre va del canto de arriba al
techo del asa de la barra (`huecosDeLaBarra(4)`, `y + lado/2`) menos ocho puntos de aire. Y
**no se le resta el inset de abajo**, que es lo que esta tabla hacía mal en tres lienzos: el
asa está DENTRO del lienzo y por encima del inset, así que el inset no le quita nada. Quien
sí lo resta es el §1.11 de `docs/LA-MESA-DE-RIBERAS.md`, y con razón, porque el cajón del
marcador cuelga hasta el canto de verdad. Restarlo aquí hacía que 844×390, 932×430 y
1180×820 salieran cortos, 273, 304 y 607, y que `docs/LAS-CARTAS-SE-EXPLICAN.md` §5.1
diera 294, 325 y 627 para los mismos tres lienzos, que era el número bueno. Corregido, los
quince cuadran con los suyos y T2 se cumple: un número y no dos.

*Los ocho puntos de aire no son una medida de aquí: son el dato del modelo del §5.1 de
`docs/LAS-CARTAS-SE-EXPLICAN.md`, de la primera vuelta y con el guion ya no reejecutable
(el aire de la franja del cartel, tanda de los quince lienzos de `LIENZOS`); allí está
dicho de dónde sale. Los quince techos del asa sí se reproducen aquí, y son los mismos que
la columna «Techo del asa» de aquella tabla.*

| Lienzo | Techo del asa | Banda libre sobre el asa | Caja del cartel | Tiras con cinta 88 y cartel | Tiras con cinta 88, sin cartel | Tiras con cinta 44, sin cartel |
|---|---|---|---|---|---|---|
| 320×360 (de pie) | 280,5 | 272 | 136 | **1** | 4 | 5 |
| 360×490 | 387,4 | 379 | 189 | 2 | 6 | 7 |
| 390×490 | 385,1 | 377 | 188 | 2 | 6 | 7 |
| 390×845 | 685,1 | 677 | 338 | 5 | 13 | 14 |
| 768×640 | 496,0 | 488 | 244 | 3 | 9 | 10 |
| 768×1024 | 808,3 | 800 | 400 | 7 | 16 | 17 |
| 1920×900 | 697,5 | 689 | 344 | 5 | 13 | 14 |
| **568×320 (SE apaisado)** | **248,0** | **240** | **120** | **0** | **3** | **4** |
| 667×375 | 290,6 | 282 | 141 | 1 | 4 | 5 |
| 780×360 | 279,0 | 271 | 135 | 1 | 4 | 5 |
| 844×390 | 302,3 | **294** | **147** | 1 | 4 | 5 |
| 932×430 | 333,3 | **325** | **162** | 1 | **5** | **6** |
| 1024×768 | 595,2 | 587 | 293 | 4 | 11 | 12 |
| 1180×820 | 635,5 | **627** | **313** | **5** | **12** | **13** |
| 1920×1080 | 837,0 | 829 | 414 | 7 | 16 | 17 |

Lo que el arreglo mueve de verdad es poco y está en la mitad derecha: en 844×390 no cambia
ni una tira, y en 932×430 y 1180×820 cabe una más de las que se habían contado. **Los dos
peores lienzos, que son los que deciden, no se mueven**, porque ninguno de los dos tiene
inset abajo.

**Los dos peores, al detalle:**

- **568×320 (SE apaisado).** El techo del asa cae a 248 puntos del canto de arriba; menos
  los 8 de aire que el cartel deja hasta la barra, la banda libre son **240**. El cartel,
  topado a la mitad, ocupa de 120 a 240. La cinta de dos líneas ocupa de 0 a 88. Entre las
  dos quedan **32 puntos: CERO tiras**.
- **320×360 (de pie).** Banda libre **272**, cartel de 136 a 272, y entre la cinta y el
  cartel quedan **48 puntos: UNA tira**.

**LA REGLA, decidida y escrita en los dos documentos: EL CARTEL NO SE PINTA MIENTRAS EL
PREGÓN ESTÁ ABIERTO.** No es un apaño: es que las dos superficies no compiten de verdad
por la atención. El pregón se lee cuando juega otro; el cartel se pide señalando un naipe
propio. Y desde la hoja de una propuesta se puede pedir igual, porque la hoja es modal y
ocupa su propio sitio: al abrir la hoja el pregón deja de estar pintado y el cartel vuelve
a caber entero.

Sin el cartel, la cuenta que queda es la de las dos últimas columnas, y ahí están los dos
números que este documento tiene que corregir:

- **Con la cinta de 44 caben cuatro tiras en los quince lienzos**, con el SE apaisado como
  peor caso (196 puntos para 176). O sea que la conclusión de la primera pasada era cierta,
  pero por 20 puntos y no por 100: los «276 útiles» eran `320 − 44` y se olvidaban de la
  barra, que ocupa 80 puntos de ese lienzo.
- **Con la cinta de 88 NO caben cuatro**: en el SE apaisado caben **tres**, y en otros
  cuatro lienzos (667×375, 780×360, 844×390 y el 320×360 de pie) caben cuatro justas, sin
  sitio para la quinta. El 932×430 salía en esa lista y ya no: con la banda libre buena
  caben cinco. Así que **el pregón se desplaza en vertical**,
  como el cajón y como el componedor, y con los dos bloques del §3.2 (dos rótulos de 44
  más las tiras) se desplaza casi siempre. Lo que NO se desplaza y por eso está ahí es el
  botón apagado de la cinta con el porqué (§3.2).

`docs/LAS-CARTAS-SE-EXPLICAN.md` §5.1 mide el cartel con este mismo guion y llega a los
mismos 240 y 272 de banda libre, y ahora también a los mismos 294, 325 y 627. Los quince
cuadran, y ése era el punto: los dos documentos se citan el uno al otro y no vuelven a
medir cada uno lo suyo. Su §5.3 mide además las dos cosas juntas y saca lo que aquí no se
había dicho con su número: **con la cinta de 88 y cuatro tiras, el pie del pregón cae en
264 y el techo del asa del SE apaisado está en 248, o sea que las cuatro tiras se meten
dieciséis puntos por dentro del asa.** Es un dato de aquí y está apuntado en la última fila
del §10, que es donde aquel documento lo cita.

### 4.2. En el retablo, que es la única pantalla de una mesa de cinco o seis

**`MANIFIESTO_RIBERAS.jugadores` admite hasta seis y `COLORES_EN_3D` tiene cuatro
colores.** `bastanColores` devuelve `false` con cinco colonos y `seVeEnTres` manda al
`Retablo`, con la frase que ya está escrita: «Sois más de cuatro y el tablero en tres
dimensiones sólo sabe pintar cuatro colores todavía». O sea que **hoy, en una mesa de
cinco o de seis, el retablo es la única pantalla que existe**, y todo lo de los §3 y §4.1
(que cuelga de la cinta, que es mueble del cliente 3D) no está.

*Una línea que no es de este encargo y hay que dejar dicha:* el §1.11 de
`docs/LA-MESA-DE-RIBERAS.md` diseñó el cajón del marcador para SEIS colonos, y ese cajón
no se puede ver nunca, porque con seis se juega en el retablo. Que el 3D aprenda a pintar
seis colores es un encargo propio y se le sube a Miguel (§11).

**Lo que hay hoy en la pantalla del retablo**, en este orden: la letra chica del porqué, el
`<Retablo>` (el SVG del tablero), `AccionesDelTablero` (donde caen aceptar y rechazar) y
un `Formulario` de «Y además puedes».

**Y aquí estaba el otro error de medida de este documento.** La primera versión de esta
tabla trataba `--alto-del-tablero: max(24rem, 62vh)` como si fuera el alto del SVG, y no lo
es: **es un tope, y hay otro.** `.lienzo-del-tablero` es `width: 100%; height: auto` con
`max-height: var(--alto-del-tablero)` **y** `max-width: calc(var(--alto-del-tablero) *
var(--razon-del-tablero, 999))`. Con la altura automática, el alto pintado es el menor de
dos cosas: el tope de alto, y **el ancho de la columna partido por la razón del tablero**.
La razón la pone `retablo.tsx` en `--razon-del-tablero` con `vista.ancho / vista.alto` del
encuadre, y el encuadre del delta es el que su propia cabecera cita: **1012,82 × 920, o sea
1,101**. En una columna estrecha manda el ancho, y el tablero sale bastante más bajo que
408.

La cuenta buena, entonces, es `min(max(408, 62 % del alto), ancho útil / 1,101)`, y el
ancho útil es el de la columna del mueble: `.dentro` con tope de 92 rem (1.564) menos su
relleno lateral `clamp(1rem, 4vw, 2.5rem)` por lado y, cuando `.tablero-y-panel` va en dos
columnas, menos el raíl de 22 rem (374) y el hueco de 2 rem (34). Todo con la raíz de 17 y
con el `box-sizing: border-box` que esta hoja declara global
(`medir-el-sitio-con-todo.ts`, §D):

| Lienzo | Ancho útil de la columna | Alto del tablero | Lo que sobra debajo |
|---|---|---|---|
| 320×360 | 286 | 260 | 100 |
| 360×490 | 326 | 296 | 194 |
| 390×490 | 356 | 323 | 167 |
| 390×845 | 356 | 323 | 522 |
| 768×640 | 707 | 408 | 232 |
| 768×1024 | 707 | 635 | 389 |
| 1920×900 | 1.071 | 558 | 342 |
| **568×320** | 523 | 408 | **−88** |
| **780×360** | 718 | 408 | **−48** |
| **667×375** | 614 | 408 | **−33** |
| **844×390** | 776 | 408 | **−18** |
| 932×430 | 857 | 408 | 22 |
| 1024×768 | 534 | 476 | 292 |
| 1180×820 | 687 | 508 | 312 |
| 1920×1080 | 1.071 | 670 | 410 |

**Lo que cambia y lo que no.** Cambia el 320×360: ahí la columna tiene 286 puntos de ancho,
así que el tablero mide **260 y no 408**, y la fila no es −48 sino +100. Los otros cuatro
negativos siguen exactamente donde estaban, porque son apaisados anchos donde el tope de
408 sí es el que muerde. **O sea: en CUATRO lienzos, y no en cinco, aceptar y rechazar
están hoy bajo el pliegue**, y en un quinto (932×430) queda menos de medio renglón.

Dos cosas más que la tabla enseña y la anterior no podía. Una: **el 1024×768 tiene la
columna más estrecha de los siete lienzos grandes** (534 contra los 857 del 932×430),
porque es el primero en el que aparece el raíl de 22 rem al lado; es el sitio donde una
ventana más ancha deja el tablero más pequeño, y no es un fallo, es la rejilla. Y dos: **el
número de la última columna es un techo generoso**, porque no descuenta ni el `<h1>` con el
nombre del juego, ni la letra chica del porqué, ni los 2 rem de relleno de arriba de
`.dentro`. Con todo eso puesto, el pliegue está más arriba en los quince. Y aun así hay
cuatro que lo pasan.

**La decisión no cambia, y ahora se apoya en un motivo más que en el otro.** Antes era
«en cinco lienzos no se ve»; ahora es eso en cuatro, y en el resto es que debajo no cabe el
pregón. Cinco renglones de 46,75, el rótulo contado como uno más y cuatro tiras, son
**233,75 puntos**, y de los quince lienzos sólo seis dejan debajo más que eso: 390×845,
768×1024, 1920×900, 1024×768, 1180×820 y 1920×1080. En los otros nueve, con los cinco
apaisados de teléfono entre ellos, el pregón puesto debajo del tablero saldría cortado o
directamente fuera. Un botón
de aceptar al que hay que desplazarse después de pasar el tablero entero es un botón que en
una partida real no se ve.

**Las tres cosas en el retablo, entonces, con su medida:**

1. **El pregón va ARRIBA, entre la letra chica y el `<Retablo>`.** Es un `<section
   class="panel">` con su `<h2>` y una lista de tiras, y va arriba precisamente por la
   tabla de encima: es el único sitio donde se ve sin desplazar en los quince lienzos. Cada
   tira es un `<button class="opcion">`, que la hoja de estilo ya fija en `min-height:
   2,75rem`, o sea **46,75 puntos** con la raíz de 17: por encima del suelo de 44 de la
   casa, sin escribir un número nuevo. Los dos bloques del §3.2 son los mismos, y la
   segunda línea de la tira mía es la `.opcion-ayuda` que `.opcion` ya sabe pintar.
   Rótulo más cuatro tiras son **233,75 puntos**, y aquí la página se desplaza, así que no
   hay recorte que decidir: lo que se decide es el ORDEN, y el orden es que el pregón va
   antes que el tablero.
2. **La hoja es el menú pequeño que ya existe: `ElijeUna` en el escritorio y
   `HojaDeAQuien` en la app.** Es el que hoy pregunta «a quién» (`A_QUIEN_SE_LO_PROPONES`),
   y ya es modal, ya tiene título de fuera, ya devuelve la opción elegida y en la app ya
   lleva `accessibilityViewIsModal`. Tocar una tira lo abre con dos renglones, «Aceptar el trueque» y
   «Rechazar», y con eso **la confirmación de Miguel existe también en la mesa de cinco y
   de seis**, que era el otro agujero: en el retablo aceptar sigue siendo hoy un botón
   suelto de un toque. No hace falta un componente nuevo en ninguno de los dos clientes.
3. **El componedor es una `<section>` más, con los mismos ocho renglones.** Ocho por 46,75
   son **374 puntos**, y a diferencia del 3D no compite con ningún lienzo: la página se
   desplaza y el tablero se queda arriba. **Y NO se abre desde `AccionesDelTablero`**, que
   es lo que decía la primera versión de este párrafo: por el §1.12 bis la puerta no llega
   a `acciones`, así que ahí no hay botón que pulsar. Lo abre un botón propio de esta
   sección, «Proponer un trueque», que pinta la pantalla de Riberas y no el mueble
   genérico, y que existe cuando `puertaDelTrueque(opciones)` devuelve una declaración. Es
   el mismo botón, con la misma ayuda y el mismo apagado por las cuatro vivas, que el
   §3.2 pone en la cinta del 3D. Y se puede hacer porque el retablo de Riberas **no es la
   rama genérica de la Sala**: `sala.tsx` manda a Riberas a `RiberasEnTres` siempre, y es
   `RiberasEnTres` quien decide caer al retablo, así que la pantalla que pinta el retablo
   de este juego es de este juego y sabe leer una declaración.

**Y en qué fase entra:** en la fase 3, que es la MISMA en la que entra el escritorio y
ANTES que el 3D (§9). No es una fase de acabado: es la única pantalla de media tabla de
tamaños de mesa.

## 5. Lo que esto cambia de `docs/LA-MESA-DE-RIBERAS.md`

Cuatro cosas, dichas explícitamente para que no se contradigan los dos documentos.
Ninguna toca lo que las fases 1, 2 y 3 ya dejaron en el código.

1. **§2.2, la segunda línea de la cinta.** Dice que la línea de botones sueltos lleva
   «pasar, aceptar, rechazar, contestar, empezar». Aceptar y rechazar **se van al pregón**
   (§3.5). La línea sigue midiendo 44 y sigue apareciendo sólo cuando hay botones, así que
   la suma máxima de la cinta sigue siendo 88 puntos y ninguna de las medidas del vértice
   lejano cambia.
2. **§1.11, el cajón.** Sigue siendo verdad que cuelga de la cinta y es modal, pero **deja
   de ser lo único que cuelga de ahí**: el pregón ocupa el mismo sitio y no es modal. La
   regla nueva es que sólo uno está abierto a la vez. El aire del cajón a las dos manos,
   que el §1.11 mide, vale igual para el pregón porque es la misma geometría.
3. **§11, las fases.** Ganan el pregón, la hoja y el componedor, en el retablo y en el 3D.
   El componedor es lo único de todo este encargo que NO mide lo que la cinta: va a todo el
   ancho, y `anchoDeLaCinta` no le sirve.
4. **Lo que cabe bajo la cinta se mide con la barra puesta, y SIN restar el inset de
   abajo.** El §4.1 de aquí corrige la cuenta que este mismo documento hacía en su primera
   pasada (`alto − 44`), y el número que vale es la banda libre sobre el asa: 240 en el SE
   apaisado y 272 en 320×360. Y una precisión que hay que dejar dicha para que los dos
   documentos no se contradigan: **el §1.11 de aquel resta la cuarta columna de insets y
   hace bien, porque el cajón del marcador cuelga hasta el canto; el pregón no llega ahí
   abajo**, porque se para en el asa de la barra, que está por encima del inset. Misma
   geometría, tope distinto, y por eso el número no es el mismo.

Y una fila para el §10 de aquel documento: **el componedor a todo el ancho tapa las dos
manos mientras está abierto**, y eso hay que verlo en el banco antes de darlo por bueno.
Está en el §10 de aquí.

## 6. Dónde vive cada cosa

Todo por NOMBRE de función o de constante, nunca por línea.

| Fichero | Qué |
|---|---|
| `shared/arcade/juegos/riberas.ts` | `BIENES_POR_LADO_DEL_TRUEQUE` muere; nace `TOPE_POR_LADO_DEL_TRUEQUE = 3` con su cabecera contando la revocación y el porqué del tres (§1.4). `PROPUESTAS_VIVAS_A_LA_VEZ = 4` (§1.8). `Trato.para` pasa a `AsientoId \| null` y gana `rechazada: AsientoId[]`. `bienesDeLaCarga(carga, campo, minimo, maximo)` acepta un rango, SIN valores por defecto (§8). `ultimos` se llama `losQueSeRecuerdan` y mira el estado de cada trato (§1.8). `opcionesDeTrueque` pierde el filtro de `quiero`, gana la opción de puerta con su `declaracion: true` y la guarda de las cuatro vivas. `estaOfrecido` gana la rama de forma y llama a `cabeEnLaPuerta`, las dos privadas de este fichero. `ofrecer` admite `para: null`, ordena los dos lados por `BIENES`, cuenta mis vivas, y sus dos guardas mudas pasan a hablar (§1.12 y §2). `contestar` admite abiertos y escribe en `rechazada`. `opcionesDeTurno` cambia el filtro de a quién se le ofrece contestar. Y `tableroDeRiberas` deja la opción marcada FUERA de `acciones`, con el mismo `continue` que ya salta FUNDAR y el ALZAR con sitio, más la misma condición en la copia que hace su `tableroVacio` (§1.12 bis) |
| `shared/arcade/opciones.ts` | **`declaracion?: true` en `Opcion`**, con su cabecera entera: qué significa, quién la escribe, quiénes la leen y qué se rompe si alguien la ignora (§1.12). Es el único cambio del núcleo en todo el encargo, y es aditivo |
| `shared/mecanicas/canonico.ts` | **NADA.** Medido y comprobado: la comparación por forma cuenta multiconjuntos y el orden canónico lo resuelve `ofrecer` |
| `shared/mecanicas/tablero-declarado.ts` | **NADA, y es una decisión y no una casualidad** (§1.12 bis). `AccionDeTablero` NO gana `declaracion`: la marca se lee donde nace la lista de opciones y no baja al contrato del mueble genérico. `opcionesSueltas` tampoco cambia, y por eso hay que contar en voz alta que devolverá la puerta al `Formulario` de debajo, que es quien la filtra |
| `shared/arcade/juegos/riberas-en-tres.ts` | `truequeDeLaOpcion` deja de leer `da[0]` y `pide[0]` y lee las listas enteras; `TruequePosible` gana `doy: string[]` y `quiero: string[]`. `bienesQueSeCambianPor` y `truequesPosibles` se quedan para la lista de uno por uno. NUEVO: `puertaDelTrueque(opciones)`, que busca la opción POR la marca `declaracion` y devuelve la declaración o `null`; `propuestasEnTres(vista, yo)`, que devuelve los DOS bloques del pregón (las que puedo contestar y las mías, con su estado ya en palabras); y `opcionesFueraDelPregon`. Y `opcionesFueraDeLaMesa` y `opcionesFueraDelTablero` filtran además por `declaracion` |
| `escenas/delta.tsx` | `AreaDeTrueque` pasa a ser una sola (§1.11): `areasDeTrueque(1, ...)`, el dibujo de la mesa en vez del de un bien, y `onProponerTrueque` deja de mandar un movimiento y pasa a abrir el componedor con ese bien. Su cabecera, reescrita |
| `escenas/baraja.ts`, `escenas/cartas.ts`, `escenas/barra.ts`, `escenas/camara.ts` | **NADA** |
| `escritorio/src/riberas-en-tres.tsx`, `escritorio/src/estilo.css` | La rama del RETABLO primero (§4.2): el pregón como `<section class="panel">` antes del `<Retablo>`, la hoja reusando `ElijeUna`, el componedor como sección y **su botón «Proponer un trueque» pintado aquí a partir de `puertaDelTrueque`, no desde `acciones`** (§1.12 bis y §4.2). Y después la rama del 3D: el pregón colgado de la cinta, la hoja y el componedor. `alProponerTrueque` deja de mandar y pasa a abrir; `A_QUIEN_SE_LO_PROPONES` se va (el componedor tiene su renglón de destino); el filtro nuevo en la composición de `opciones` |
| `app/src/arcade/riberas-en-tres-escena.tsx`, `app/src/arcade/riberas-en-tres.tsx` | Lo mismo en React Native, con `accessibilityViewIsModal` en la hoja y en el componedor, como `HojaDeAQuien` |
| `escritorio/src/formulario.tsx`, `app/src/arcade/tablero-en-linea.tsx` | El filtro por `declaracion` donde ya se decide qué se pinta: `loQueSePuedePintar` del `Formulario`, y `LasOpciones` de la app. Es lo que cierra la otra mitad del §1.12 bis, porque `opcionesSueltas` le manda la puerta a este mueble |
| `escritorio/src/retablo.tsx`, `app/src/arcade/retablo.tsx` | **NADA, ni una línea** (§1.12 bis). Era la fila que decía que `AccionesDelTablero` no pintara la opción marcada, y ese mueble no puede verla: no recibe opciones. El retablo sigue sin aprender qué es un trueque, que es lo que se prometía |
| `server/scripts/verificar-riberas.ts` | La vacuna sustituta del portillo (§1.3), la comparación por forma con sus roturas, el ciclo de vida de un abierto, la carrera de dos aceptaciones, el orden canónico de los dos lados, la carrera de t1 a t9 (§1.8), que la puerta mandada tal cual sale con motivo (§1.12), y **que `tableroDeRiberas` no mete la opción marcada en `acciones` mientras `opcionesSueltas` sí la devuelve** (§1.12 bis). Hoy son 349 comprobaciones y el guardia está en 349 |
| `server/scripts/verificar-riberas-en-tres.ts` | Que `propuestasEnTres` devuelve los dos bloques y cuenta lo que la vista dice, que `puertaDelTrueque` la encuentra por la marca y no por el `id`, que `opcionesFueraDelPregon` quita ACEPTAR y RECHAZAR y sólo con pregón, y que sigue a las opciones enteras. Hoy son 295 con `MINIMO` 293 |
| `escritorio/scripts/verificar-escritorio.tsx` | Que en la rama del retablo el pregón va ANTES del `<Retablo>` en el orden del DOM (§4.2), que la tira no lleva botón de aceptar, que el componedor no monta `disabled` nativo, y **que la declaración no sale ni como botón de `AccionesDelTablero` ni en el `Formulario` de «Y además puedes»** (§1.12 bis). Hoy son 400 |
| `escenas/scripts/verificar-escena.ts` | Que las tiras que caben bajo la cinta se cuentan con la BARRA puesta y no con `alto − 44`, y que con la cinta de 88 el peor lienzo da tres (§4.1); y que el renglón del componedor de 162 cabe a todo el ancho. Hoy son 335 |
| `server/scripts/verificar-mesa.ts` | Nada nuevo que escribir, pero es el que tiene que seguir verde: la declaración de la puerta viaja dentro de `opciones` y su búsqueda de secretos la mira. Hoy son 856 |
| `server/scripts/verificar-nucleo-agnostico.ts`, `verificar-arcade-pobre.ts` | Que un juego que no pone `declaracion` se comporta exactamente como antes (§1.12) |

## 7. Cómo se midió

Ocho guiones en el scratchpad de la sesión, que importan el código real de `6372bc7`,
sin tocar nada y sin levantar ningún servidor. Mueren con la sesión.

**Y eso, dicho como toca: mueren con la sesión quiere decir que estos números NO se pueden
reejecutar hoy.** Los de aquí se volvieron a sacar en esta revisión y por eso siguen en
pie. Los que este documento toma prestados de otro y no se han vuelto a sacar van marcados
donde están, con su tanda al lado: **los 148 sietes de una tanda de doce partidas y el
rango de 81 a 234 por tanda** (§9), y **los ocho puntos de aire del cartel** (§4.1). Quien
vuelva a tocar cualquiera de los tres tiene que reejecutar antes, o apoyarse en otra cosa.

**Los cuatro de la primera pasada**, de donde salen los números del §1.1, §1.2, §1.4,
§1.6, §3.1 y §3.4:

- **`medir-trueque.ts`.** Juega ocho partidas enteras a ciegas con `partidaNueva`,
  `proyectarRiberas`, `opcionesDeRiberas` y `avanzarRiberas` de verdad, y cuenta para cada
  mano lo que `opciones()` emite hoy y lo que emitiría sin el filtro. Y la combinatoria
  pura de multiconjuntos por lado.
- **`medir-portillo.ts`.** El coste del portillo contra listas de 30 a 50.625 opciones, las
  manos medidas contra cinco topes, y lo que ocupa el estado en forma canónica con ocho y
  con veinticuatro tratos.
- **`medir-cable.ts`.** Lo que cada tope pesa en JSON dentro de `opciones`, y lo de hoy de
  verdad jugando (54 opciones, 9,3 kB, 0,050 ms).
- **`medir-tablon.ts`.** La tira y el componedor en los quince lienzos: el ancho de la
  cinta, el ancho para la oferta y las fichas que caben. Se llama así porque se escribió
  cuando el pregón se llamaba tablón (§1.10); el nombre se deja como estaba, que es lo
  honrado con un guion que ya no existe. **Su columna de «alto útil» NO vale**, porque
  restaba sólo la cinta y se olvidaba de la barra; la sustituye
  `medir-el-sitio-con-todo.ts`.

**Los cuatro de esta pasada:**

- **`medir-la-carrera.ts`.** Reproduce con el árbitro y el reductor de verdad el guion de
  t1 a t9 dentro de un turno, sin pasar nunca de cuatro vivas, y enseña que la lista se
  queda con `t2..t9` y que `t1`, en `'propuesta'`, se cae. De aquí sale todo el §1.8.
- **`medir-la-puerta.ts`.** Trabaja sobre DOS COPIAS del `riberas.ts` de la rama,
  parcheadas en el scratchpad y no en el árbol: una con la opción de puerta añadida a
  `opcionesDeTrueque` y otra sin la línea del filtro. De aquí salen: que la puerta mandada
  tal cual pasa el portillo y devuelve el mismo objeto de estado (§1.12), la tabla de las
  tres comprobaciones que se ponen rojas y verdes al quitar el filtro (§1.3), y que la
  vacuna sustituta funciona con el filtro y sin él.
- **`medir-la-factura.ts`.** Cuenta los multiconjuntos y los pares que la puerta admite por
  tope, con la regla 2 y sin ella, y juega ocho partidas de cuatro colonos eligiendo
  uniformemente de `opciones()` de TODA la mesa (16.698 movimientos, 15.834 manos) para
  medir qué fracción de esos OFRECER muere en `llegaPara`. De aquí sale el §2 entero y las
  clases de la mano del §1.4.
- **`medir-el-sitio-con-todo.ts`.** El techo del asa de la barra en puntos, sacado de
  `huecosDeLaBarra`, `ASA_DEL_HUECO` y `loQueSeVe` de `escenas/barra.ts`, en los quince
  lienzos; de ahí, la banda libre, la caja del cartel y cuántas tiras caben con la cinta de
  44 y de 88, con cartel y sin él. **Y aquí van sus dos correcciones**, que son las del §4:
  la banda libre **ya no resta la cuarta columna de insets**, porque el asa vive dentro del
  lienzo y por encima de ese inset (§4.1); y la columna del retablo se rehace entera,
  porque `max(24rem, 62vh)` no es el alto del tablero sino uno de sus dos topes, así que lo
  que se mide es `min(max(408, 62 % del alto), ancho útil / 1,101)`, con el ancho útil
  sacado del tope de 92 rem de `.dentro`, de su relleno `clamp(1rem, 4vw, 2.5rem)` y del
  raíl de 22 rem cuando la rejilla va en dos columnas, y con la razón 1,101 del encuadre
  1012,82 × 920 (§4.2). Sigue midiendo la raíz de 17 y el renglón de 46,75 de `.opcion`. De
  aquí sale el §4 entero. **Reproduce los quince techos del asa y las quince bandas libres
  de `docs/LAS-CARTAS-SE-EXPLICAN.md` §5.1**, que es lo que permite que los dos documentos
  citen un número y no dos; con el inset restado no cuadraban tres.

Lo que NO se ha medido y hay que medir en el banco antes de cerrar la fase de pantalla:
el ancho real del texto de una tira con la fuente de la casa (a qué largo se recorta la
oferta), y si el componedor a todo el ancho molesta tapando las manos. Los dos están en el
§10.

## 8. Las cabeceras que dejan de ser verdad

Se listan aparte porque en esta casa un comentario falso es un fallo, y porque la mitad de
ellos defienden justamente lo que se está cambiando. Todos se reescriben en la fase que
toca su fichero.

| Dónde | Qué dice hoy | Por qué deja de ser verdad |
|---|---|---|
| `BIENES_POR_LADO_DEL_TRUEQUE` | «uno por uno se lee de un vistazo… la combinatoria completa son miles de opciones, que no es una interfaz sino una lista que nadie lee» | El diagnóstico se queda (medido: 5.000 opciones y 1,14 MB) y la conclusión se revoca. La constante muere y la nueva cuenta las dos cosas |
| `opcionesDeTrueque` | «Uno por uno y sólo de lo que me sobra por lo que no tengo» y «Aquí NO hay ningún ejemplo del "sólo si" del §5 bis» | Lo primero es la regla revocada. Lo segundo pasa a ser al revés: **la puerta paramétrica ES un ejemplo del «sólo si»**, y de los buenos, porque se ofrece una familia mirando la vista y el reductor valida el miembro mirando el estado |
| `estaOfrecido` | «Se compara la forma canónica de `{ tipo, carga }` contra la de cada opción, y no campo a campo» | Gana una excepción, y la excepción tiene que contar las cinco formas de estropearla del §2, con la factura de 4.680 y 12.100 delante |
| `bienesDeLaCarga` | «Exige EXACTAMENTE `cuantos`, y quien llama dice cuántos: `BIENES_POR_LADO_DEL_TRUEQUE` para un lado de un trueque y `BIENES_DEL_ANO_BUENO` para la carta» | Pasa a exigir un RANGO, `(carga, campo, minimo, maximo)`, **y sin valores por defecto en la firma**. La cabecera sigue nombrando a sus dos llamantes, y el segundo pasa a escribirse `bienesDeLaCarga(movimiento.carga, 'bienes', BIENES_DEL_ANO_BUENO, BIENES_DEL_ANO_BUENO)`. Sin valores por defecto a propósito, y éste es el argumento entero: quien se olvide de un parámetro **no compila**, en vez de aflojar una regla en silencio. Con `maximo = Infinity` por defecto, un `ANO_BUENO` al que se le olvidara el cuarto argumento aceptaría cargas de cuarenta bienes y ningún comprobador tendría por qué enterarse. El porqué de que el número entre por parámetro (esta función no sabe de qué regla la llaman) se queda tal cual |
| `ultimos` | «Sólo se recuerdan los últimos, para que el estado no crezca sin tope» | Cambia de nombre a `losQueSeRecuerdan` y de comportamiento: mira el estado de cada trato y no recorta nunca uno en `'propuesta'`. La cabecera nueva lleva el guion de t1 a t9 medido, porque es lo que explica por qué el nombre viejo era el fallo |
| `Trato` y `Trato.para` | «Lo propone quien tiene el turno y lo contesta quien NO lo tiene» | Sigue siendo verdad. Lo que cambia es que `para` puede ser `null` y que hay un campo nuevo, `rechazada`, y las dos cosas hay que contarlas ahí |
| `contestar` | «Queda UNA sola guarda alcanzable… las demás son texto muerto: a esas guardas no llega nadie» | **Sigue siendo verdad, y ahora hay MÁS guardas de las que decirlo.** La guarda `trato.para !== mi asiento` se parte en tres: `trato.para !== null && trato.para !== mio` (un dirigido que no es para mí), `trato.para === null && trato.de === mio` (un abierto mío, y no me contesto a mí mismo) y `trato.para === null && trato.rechazada.includes(mio)` (un abierto que ya aparté). A las tres se les deja el `return estado` mudo, y la cabecera dice por qué a ninguna llega nadie, incluida la del oferente, que es la nueva: `opcionesDeTurno` no le ofrece a nadie contestar un trato que no sea suyo, que ya haya apartado, o que él mismo propuso, y el portillo corre ANTES y rechaza todo lo que `opciones()` no ofreció. Y la de `estado !== 'propuesta'` sigue sin recibir a nadie con propuestas abiertas, por el §1.7: los movimientos se serializan, así que la segunda aceptación llega con la revisión rancia o con la vista ya nueva, y las dos paran antes |
| `ofrecer` | «aquí sí se comprueba que tenga lo que ofrece» y sus guardas mudas | Sigue siendo verdad y ahora HABLA: la guarda de `llegaPara` da motivo (§2), y con ella la cabecera tiene que llevar el 75 % medido, que es lo que la convierte de inalcanzable en camino normal. Y la guarda de forma también habla (§1.12) |
| `Opcion.carga` en `shared/arcade/opciones.ts` | «Su carga, ya montada» | Deja de ser verdad para UNA opción de UN juego, y la excepción tiene nombre: `declaracion`. La cabecera de `carga` remite a la de la marca nueva, que es donde está contado el caso entero |
| El bloque de `acciones` de `tableroDeRiberas` | «LO QUE NO SE PUEDE TOCAR SOBRE EL TABLERO va como botón: empezar, tirar, pasar, y los trueques…» | Deja de ser verdad en la primera de las tres: **proponer ya no va como botón de aquí**, porque la opción de puerta es una declaración y no un movimiento montado (§1.12 bis). La cabecera tiene que decir qué se salta y por qué son ahora tres cosas y no dos, y que la marca se lee AQUÍ, donde todavía es una `Opcion`, porque al mueble no le llega |
| `AreaDeTrueque` en `escenas/delta.tsx` | «Recibe una lista de bienes de quien conoce las reglas, pinta un área por cada uno y avisa de cuál se soltó» | Pasa a ser un área que no es de ningún bien y que abre el componedor |
| `truequeDeLaOpcion` y `truequesPosibles` | «Si sale una sola, el cliente puede mandarla sin preguntar; si salen varias, tiene que preguntar a quién» | El componedor tiene su renglón de destino, así que `A_QUIEN_SE_LO_PROPONES` deja de hacer falta para la ruta rica; el texto vale sólo para la lista de uno por uno |
| `docs/LA-MESA-DE-RIBERAS.md` §2.2, §1.11 y §11 | Ver el §5 | Cuatro cambios declarados, ninguno contradice lo ya construido |

## 9. El orden, en fases que se empujan una a una

**Dónde va este encargo dentro de los tres.** El trueque va **el último de los tres**,
después de `docs/EL-LADRON-DE-RIBERAS.md` y de `docs/LAS-CARTAS-SE-EXPLICAN.md`. Las tres
razones, y ninguna es de gusto:

- **Hay 12,3 sietes por partida que hoy no hacen nada.** Medido: 148 sietes en una tanda de
  doce partidas a ciegas (`medir2.ts` del documento del estiaje, §12 de las cartas), y de
  81 a 234 sietes por tanda de doce según la mesa, o sea **de 6,8 a 19,5 por partida**
  (`medir6.mts`). *Los dos números son de la primera vuelta y sus guiones no se pueden
  reejecutar: vivían en el scratchpad de aquella sesión.* La primera versión de este
  párrafo decía «once» sin guion detrás y sin rango; once no sale de ninguna tanda. Es lo
  que más se nota jugando y no cuesta ninguna superficie nueva.
- **Mientras acumular no cueste, el trueque no hace falta.** El descarte es lo que crea la
  presión que hace que alguien quiera cambiar tres piedras por dos granos. Empujar el
  trueque antes es construir la herramienta antes que el problema.
- **El trueque es lo que más superficie nueva mete**: un tipo nuevo en el núcleo, una rama
  nueva en el portillo y tres pantallas en dos clientes. Va detrás de lo que no toca
  ninguna regla (las cartas) y detrás de lo que las toca poco (el estiaje).

### 9.1. EL ORDEN COMPLETO SON NUEVE FASES, y aquí se contaban dos

**Lo que la primera versión de este párrafo decía era «el tercero, después de las fases 1 y
2 del estiaje y de las cartas», y seguido al pie de la letra llevaba a un sitio malo:** a
empujar el trueque entero antes de la fase 5 del estiaje, que es exactamente la fase que
vigila que lo nuevo sea jugable, y de la que este documento dice dos párrafos más abajo que
depende. Los tres documentos no son tres bloques que se ponen uno detrás de otro: son nueve
fases que se intercalan, y dos de ellas se empujan JUNTAS.

| # | Fase | De quién es | Por qué va ahí |
|---|---|---|---|
| 1 | La pieza, el bloqueo y el robo | Estiaje | No depende de nada. Es la primera de todo el trabajo |
| 2 | El descarte | Estiaje | De la 1. Es lo que crea la presión que hace falta un trueque |
| 3 | El texto y su comprobador | Cartas | De nada. No toca ninguna regla |
| 4 | La mano por clases en el retablo | Cartas | De la 3 |
| 5 | «La guardia mueve» **junto con** «La guardia con el estiaje» | Estiaje (3) **y** cartas (5), en el MISMO empujón | La del estiaje quita el `!estado.tirado` de `jugarLaGuardia`; la de las cartas es la fila y la comprobación que cambian de sentido justo con eso. Separarlas deja una de las dos mintiendo entre medias, y lo dice el §12 de las cartas con esas palabras |
| 6 | El jugador ciego, «Las mil partidas» | Estiaje (5) | De la 1, la 2 y la 3, porque es quien las juega todas. **Y es la que este documento necesita detrás** |
| 7 | El trueque entero (mis seis fases) | Aquí | De la 6, por lo que se dice debajo |
| 8 | El tablero en tres dimensiones del estiaje | Estiaje (4) | **Donde quepa: nadie depende de ella**, y con cinco o seis colonos ni existe |

Son nueve fases en ocho renglones porque el 5 lleva dos dentro. Y **dos que no atan el
orden de nadie más pero sí el mío**: las fases 3 y 4 de las cartas (el cartel en el
escritorio y el cartel en la app) pueden ir en cualquier hueco anterior, pero tienen que
estar antes de mis fases 4 y 5 respectivamente, por lo que se dice debajo del cartel.

**De qué depende, dicho por su nombre:**

- **De la fase 5 de `docs/EL-LADRON-DE-RIBERAS.md`, «Las mil partidas».** Es la única cosa
  de todo el árbol que juega Riberas eligiendo UNIFORMEMENTE de `opciones()` completa, y
  afirma que ninguna partida se queda sin opciones para nadie. Hoy eso no existe: `jugar:fondo`
  juega los cuatro juegos de la SALA por el manifiesto y no toca ningún arcade, y el único
  sitio que juega Riberas entera (el paso «Una partida entera, con el árbitro, y
  reejecutada» de `verificar-riberas.ts`) elige con una preferencia fija, `TIRAR` y luego
  `torre:`, `fundar:`, `vereda:` y `PASAR`, que **nunca ofrece un trueque, nunca acepta uno
  y nunca compra una carta**. O sea que hoy nada vigila que lo nuevo sea jugable desde la
  lista. La marca del §1.12 y la guarda que habla del §2 están escritas para que esa fase 5
  pueda afirmar además que ninguna opción devuelve el mismo estado sin motivo, y esa
  afirmación es la red de seguridad de la fase 1 de aquí.
- **De las fases 3 y 4 de `docs/LAS-CARTAS-SE-EXPLICAN.md`, el cartel**, para mis fases 4 y
  5: la regla de que el cartel no se pinta con el pregón abierto (§4.1) sólo se puede
  escribir cuando el cartel existe, y el número que las dos comparten sale del mismo guion.
  La del escritorio ata mi fase 4 y la de la app mi fase 5.
- **De la fase 2 del estiaje, y no por lo que se juega sino por dónde se escribe.** Esa
  fase mete la regla de que en `'descartando'` no se contesta a un trueque, y eso vive
  **dentro del mismo bucle de `v.tratos` de `opcionesDeTurno`** cuyo filtro cambia mi §1.6.
  Como va delante, yo heredo esa condición y **no puedo reescribir el bucle sin
  conservarla**; su comprobador («con un trato en `'propuesta'` el destinatario no ve
  ACEPTAR ni RECHAZAR mientras descarta, y sí los ve en `'jugando'`») es el que se pone rojo
  si se me olvida. La fase 1 escribe en la misma función pero fuera de ese bucle, justo
  después de `if (v.turnoDe !== quien) return opciones;`, que hoy está DEBAJO del bucle de
  tratos: las dos cosas conviven sin tocarse, y conviene saberlo antes de mover ninguna de
  las dos de sitio.

**Y quién depende de MÍ, que son dos y ninguna se bloquea:**

- **`docs/LAS-CARTAS-SE-EXPLICAN.md`, decisión 9**, sólo para la llave que apaga el cartel
  mientras el pregón está abierto. Su propio §12 lo dice bien: mientras el pregón no exista,
  la condición se escribe igual y sale siempre verdadera. **No es una espera**, y por eso
  las cartas van delante y no detrás.
- **`docs/LA-MESA-DE-RIBERAS.md`**, en los cuatro sitios del §5 de aquí. Ninguno de los
  cuatro toca lo que sus fases 1, 2 y 3 ya dejaron en el código.

Dicho al revés, y es lo que importa para no bloquearse: **las fases 1 y 2 de aquí se pueden
empujar sin ninguna de las otras dos**, técnicamente. Lo que no se debe hacer es empujarlas
antes, porque entonces lo nuevo se estrena sin nadie que lo juegue a ciegas, y eso no es una
dependencia de compilación: es la red de seguridad.

---

Cada fase deja el juego entero y verde, y ninguna depende de la siguiente. **El motor va
primero, y va con tres líneas de pantalla dentro**, que es la corrección de esta revisión:
cuando la fase 1 esté empujada, un trueque de tres por dos se puede hacer sin que exista
ninguna pantalla nueva, **y sin que haya quedado encendido un botón que no juega**.

**Fase 1: el motor. `shared/arcade/juegos/riberas.ts`, la marca del núcleo, los tres
filtros que la puerta necesita para no aparecer, y su comprobador.**

Lo que trae: `TOPE_POR_LADO_DEL_TRUEQUE`, `PROPUESTAS_VIVAS_A_LA_VEZ`, `Trato` con `para`
nulable y `rechazada`, `bienesDeLaCarga` con rango y sin defectos (y `ANO_BUENO`
reescrito), `losQueSeRecuerdan` en vez de `ultimos`, `opcionesDeTrueque` sin el filtro y
con la puerta marcada, `cabeEnLaPuerta` y la rama de forma en `estaOfrecido`, `ofrecer`
con abiertos, con el orden canónico, con la cuenta de vivas y con sus dos guardas
hablando, `contestar` con abiertos, el filtro de `opcionesDeTurno`, y `declaracion?: true`
en `shared/arcade/opciones.ts`. Y las cabeceras que dejan de ser verdad, reescritas EN EL
MISMO empujón (§8).

**Y los tres filtros del §1.12 bis, que van aquí y no en la fase 3**, porque la puerta nace
en esta fase y sin ellos esta fase deja un botón muerto en el retablo: el `continue` de
`tableroDeRiberas` (y el de su `tableroVacio`), el filtro por `declaracion` en
`loQueSePuedePintar` del `Formulario` del escritorio, y el mismo en `LasOpciones` de la
app. Son tres líneas y ninguna pantalla nueva.

Comprobadores: `verify:riberas` (349 hoy), `verify:mesa` (856, que tiene que seguir verde
sin tocarlo: es el que mira que la declaración de la puerta no lleve secretos),
`verify:nucleo` y `verify:arcade-pobre` (que un juego sin `declaracion` sigue igual), y
`verify:escritorio` (400) y `verify:sala` (152) con la comprobación de que la declaración
no se pinta en ninguno de los dos muebles.

**Las vacunas, y son las que dicen si la fase está bien hecha.** Cada una se rompe a mano
en el fichero real, se corre el comprobador y se restaura:

1. Quitar la rama de forma del portillo: se ponen rojas las de multiplicidad, y NINGUNA
   otra (o sea que la rama sólo afecta a OFRECER).
2. Aplicar la rama de forma a todos los tipos: se pone roja «una carga que no coincide con
   ninguna opción se rechaza».
3. Comprobar la forma sin buscar antes la opción de puerta: se pone roja una nueva, «no
   se puede ofrecer antes de tirar».
4. Subir el tope dentro de `cabeEnLaPuerta` sin subir la constante: roja.
5. Quitar la regla 2 de `cabeEnLaPuerta`: roja la que manda limo por limo.
6. Ofrecer a un colono con el almacén vacío: roja. **Es la vacuna sustituta del §1.3, y
   entra en el MISMO empujón que borra las dos que se ponen rojas al quitar el filtro.** La
   revisión que borre aquéllas sin traer ésta no se acepta, y el guardia de 349 lo canta.
7. Quitar el orden canónico de `ofrecer`: roja la que manda el mismo trueque en dos
   órdenes y compara los dos estados con `canonico`.
8. Volver a poner el `ultimos` ciego: roja la que reproduce t1 a t9 y exige que `t1` siga
   dentro y en `'propuesta'` (§1.8).
9. Quitar la cuenta de vivas de `ofrecer`: roja la que propone cinco veces sin rechazar
   ninguna y exige motivo en la quinta.
10. Volver a poner mudas las dos guardas de `ofrecer`: rojas «la declaración mandada tal
    cual sale con motivo» y «ofrecer lo que no tengo sale con motivo».
11. **Quitar el `continue` de `tableroDeRiberas`:** roja «la declaración no está en
    `acciones`» (§1.12 bis).
12. **Quitar el filtro por `declaracion` de `loQueSePuedePintar`:** roja «el `Formulario` de
    “Y además puedes” no la pinta». Y la tercera de ese trío no es una vacuna sino una
    afirmación que se escribe para que nadie la «arregle»: **`opcionesSueltas` SÍ la
    devuelve**, porque el tablero ya no la enseña, y ése es el camino por el que llega al
    mueble que la filtra.

**Fase 2: `shared/arcade/juegos/riberas-en-tres.ts`, que es lo que las dos pantallas
comparten.**

`truequeDeLaOpcion` con listas, `puertaDelTrueque` buscando por la marca,
`propuestasEnTres` con sus dos bloques, `opcionesFueraDelPregon`, y los dos filtros que ya
existen mirando además `declaracion`. Nada se pinta todavía; `verify:riberas-en-tres` (295,
`MINIMO` 293) comprueba que las cuentas cuadran con la vista y que el filtro sigue a las
opciones enteras. Vacunas: invertir el orden de `opcionesFueraDelPregon` y
`opcionesFueraDeLaMesa`, que tiene que ponerse roja igual que se pone hoy con `porTirar`; y
buscar la puerta por el `id` en vez de por la marca, cambiando el `id`, que tiene que
seguir encontrándola.

**Fase 3: EL RETABLO, en los dos clientes.** El pregón antes del `<Retablo>`, la hoja
reusando `ElijeUna` y `HojaDeAQuien` con «Aceptar» y «Rechazar», y el componedor como
sección, **con su botón «Proponer un trueque» pintado a partir de `puertaDelTrueque` y no
de `acciones`** (§4.2 y §1.12 bis). Va aquí y no al final porque **es la única pantalla que
tiene una mesa de cinco o de seis**, y porque hasta que exista, en esas mesas aceptar sigue
siendo un botón de un toque bajo el pliegue. `verify:escritorio` (400 hoy) gana el orden
del DOM y que la tira no lleve botón de aceptar; `verify:sala` (152 hoy), lo mismo en la
app. Y se mira en el banco con cinco sentados, que es la única forma de llegar a esta rama.
Lo que esta fase **ya no trae**, porque se adelantó a la fase 1, son los tres filtros de la
puerta; y lo que no trae nunca es una línea de `retablo.tsx`, que no cambia en todo el
encargo.

**Fase 4: el escritorio en tres dimensiones.** El pregón colgado de la cinta con sus dos
bloques, la hoja y el componedor en DOM, con la composición nueva de `opciones`, el
desplazamiento vertical del pregón y el «+» apagado con `aria-disabled`. `verify:escena`
(335 hoy) mide las tiras que caben con la BARRA puesta (§4.1). Depende de que el cartel de
las cartas ya esté, para poder afirmar que no se pintan a la vez. Y se mira en el banco:
una propuesta de 3×2 en una ventana estrecha, cuatro propuestas a la vez, y aceptar una que
otro acaba de llevarse.

**Fase 5: la app en tres dimensiones.** Lo mismo en React Native, con
`accessibilityViewIsModal` en la hoja y en el componedor. Se prueba en el aparato, en
apaisado, con el teclado de accesibilidad encendido.

**Fase 6: el mostrador del 3D.** `areasDeTrueque(1, ...)` y `onProponerTrueque` abriendo el
componedor. Va la última porque es un gesto de comodidad sobre algo que ya funciona sin él,
y porque toca `escenas/delta.tsx`, que es donde está trabajando el otro encargo.
`verify:escena` mide que sigue habiendo un área y no cinco, y que sigue sin pisar la mano
de bienes.

## 10. Lo que NO entra, y las decisiones abiertas con dueño

**No entra:** el estiaje, la regla del descarte con más de siete cartas y el bloqueo de
producción (es otro encargo, y toca `tirarLosDados` y `GUARDIA`, no el trueque); la
descripción de las cartas al pasar el cursor (otro encargo, y es de la mano del mazo);
trocar con el banco a razón fija, que este juego no tiene y no se estrena aquí;
contraofertar sobre una propuesta ajena (sería un `Trato` que apunta a otro `Trato`, y con
eso el ciclo de vida deja de caber en cuatro estados); trueques que sobrevivan al turno; y
ninguna regla nueva sobre qué se puede pedir: lo sigue diciendo la lista de opciones más la
puerta.

**Decisiones abiertas con dueño:**

| Qué | Lo que hay decidido | Quién la cierra |
|---|---|---|
| El motivo cuando se pierde la carrera de una aceptación | Sale el motivo genérico del portillo, y el pregón de quien propuso enseña quién se la llevó (§3.2). La alternativa (seguir ofreciendo ACEPTAR sobre un trato aceptado para poder dar un motivo específico) se descarta por encender un botón que no hace nada | Quien haga la fase 4, viéndolo con dos aparatos |
| A qué largo se recorta la oferta de una tira | El hueco está medido (165 puntos en el SE, 104 en 320×360, 6 y 4 fichas), y lo que se recorta es el lado de `pide`. El ancho del texto con la fuente de la casa no se mide en Node | La fase de pantalla, en el banco, y se deja escrito |
| El componedor a todo el ancho tapa las dos manos | Es modal y sólo lo abre quien tiene el turno, así que no hay nada que arrastrar debajo. Cabe en los quince lienzos; con el ancho de la cinta no cabía en los cuatro de pie | **Miguel**, en el banco. Si prefiere verlo más pequeño, lo que se toca es el renglón (dos contadores por fila no caben: 296 puntos), no el ancho |
| El tope de tres por lado | Sale de las seis fichas del SE apaisado y de las dos mitades de `COSTES.torre`. Subirlo a cuatro no cuesta nada en la lista, pero **sí en la puerta**: los movimientos admitidos por turno pasan de 4.680 a 16.000 en mesa de cuatro (§2), y con ellos sube lo que el reductor devuelve rechazado | **Miguel**, cuando juegue con tres y le sepa a poco |
| Abierto por defecto o dirigido por defecto | El componedor pone «A la mesa» el primero, porque es lo que Miguel pidió y porque una mesa de seis con todo dirigido son cinco propuestas por trueque | **Miguel**, jugando |
| Que el pregón se desplace en el SE apaisado | Con la cinta de 88 caben tres tiras y puede haber ocho (cuatro para contestar y cuatro mías). Se desplaza, y lo que nunca se desplaza es el botón apagado de la cinta con el porqué (§3.2 y §4.1). **El número que lo obliga, y que `docs/LAS-CARTAS-SE-EXPLICAN.md` §5.3 cita desde aquí: con la cinta de 88 y cuatro tiras el pie del pregón cae en 264, y el techo del asa de ese lienzo está en 248, o sea que las cuatro tiras se meterían dieciséis puntos por dentro del asa de la barra.** Sin desplazamiento no es que quede apretado: es que la cuarta tira se pinta encima del asa | La fase 4, en el banco, con cuatro propuestas puestas |

## 11. Para Miguel

Tres cosas que no se deciden leyendo código:

1. **En una mesa de cinco o seis se juega hoy sobre el tablero dibujado, no sobre el de
   tres dimensiones**, porque `COLORES_EN_3D` tiene cuatro colores. Este documento diseña
   el trueque para las dos pantallas y pone la del retablo antes que la del 3D (§4.2 y §9),
   pero eso no arregla el fondo: **que el 3D aprenda a pintar seis colores es un encargo
   propio**, y hasta que se haga, media docena de cosas ya diseñadas para seis (entre
   ellas el cajón del marcador del §1.11 de `docs/LA-MESA-DE-RIBERAS.md`) no se pueden ver
   nunca. Es una decisión de prioridad, no de código.
2. **El trueque va el último de los tres**, después del estiaje y de las cartas, con los
   tres motivos del §9. Y el orden entero **no son tres bloques sino nueve fases que se
   intercalan** (§9.1): el trueque va detrás de «Las mil partidas», que es la fase que
   vigila que lo nuevo sea jugable, y sólo la fase 4 del estiaje puede quedarse para
   después porque nadie depende de ella. Si a Miguel le pesa más el trueque que los 12,3
   sietes por partida, el orden se cambia y lo único que cuesta es que la fase 1 se estrene
   sin nadie que la juegue a ciegas detrás.
3. **Tres por lado y cuatro propuestas vivas** son los dos números que se ven jugando.
   Están medidos contra la pantalla más pequeña y contra el coste de la puerta, y los dos
   se suben cambiando una constante, pero el de tres cuesta en el portillo y el de cuatro
   cuesta en el pregón. Se juega con ellos y se dice.
