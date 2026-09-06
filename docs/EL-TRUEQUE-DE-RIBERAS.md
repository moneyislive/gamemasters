# El trueque de Riberas

> Si algo de aquí no coincide con el código, gana el código. Este documento recoge las
> decisiones y su porqué. Se escribió el 6 de septiembre de 2026 sobre la rama
> `lobby-catan`, con el código en `6372bc7`, a partir de lo que Miguel pidió por escrito
> tras jugar una partida entera: que un trueque pueda llevar varios bienes y varias
> unidades de cada uno; que se pueda pedir un bien que ya se tiene; que las propuestas
> se vean en pantalla, una por jugador, con aceptar y rechazar; y que la aceptación se
> confirme para que nadie acepte por equivocación.
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
> Ningún número de aquí es una opinión. Cada uno sale de uno de los cuatro guiones de
> medida del §6, que importan el código real y juegan partidas enteras con el reductor
> de verdad, o de un comprobador que se nombra. Las funciones y las constantes se citan
> por NOMBRE y nunca por línea: hay otro encargo escribiendo la fase 4 de la mesa en
> `escenas/delta.tsx` y en las dos pantallas, y una cita de línea de hoy sería falsa
> mañana.
>
> Lo que NO es de este encargo, aunque Miguel lo pidiera en el mismo mensaje: el ladrón
> y la regla del descarte con más de siete cartas, y la descripción de las cartas al
> pasar el cursor. Se nombran aquí sólo donde tocan (§1.4 y §7).

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
   (`medir-trueque.ts`, §2). En ocho partidas jugadas a ciegas con el reductor real
   (6.979 turnos con turno y tirada hecha) eso pasa en 20 turnos (el 0,3 %), y hay 31
   turnos en los que el juego no ofrece ningún trueque. Es poco, y es exactamente el
   turno en el que uno quiere trocar: el que llega con la mano llena y le falta CANTIDAD,
   no clase.
3. **Las propuestas no se ven.** Están en la lista de botones del pie, mezcladas con
   pasar y tirar, con el rótulo «Aceptar el trueque t3», y se aceptan de un toque.

## 1. Las decisiones que no se pueden deshacer después

### 1.1. La combinatoria no cabe en la lista, así que la opción se hace PARAMÉTRICA

**Es la decisión de la que cuelga todo lo demás, y es irreversible porque toca el
portillo del §5 bis.**

El motor tiene una regla que manda sobre todo: `avanzarRiberas` proyecta la vista de
quien mueve, le pregunta a `opcionesDeRiberas` qué le habría ofrecido, y **compara la
forma canónica de `{ tipo, carga }` contra la de cada opción** (`estaOfrecido`). Lo que
`opciones()` no ofrece, el reductor no lo hace. Con multiplicidad, `opcionesDeTrueque`
no puede enumerar «cualquier montón por cualquier montón». Medido, con manos de verdad y
con manos construidas (`medir-trueque.ts` y `medir-portillo.ts`, §6):

| Tope por lado | Por rival, mano `[2,2,2,2,2]` | Mesa de cuatro (3 rivales) | Mesa de seis (5 rivales) | Abierto (sin destinatario) |
|---|---|---|---|---|
| 1×1 (hoy, sin el filtro) | 20 | 60 | 100 | 20 |
| 2×2 | 230 | 690 | 1.150 | 230 |
| 2×3 | 530 | 1.590 | 2.650 | 530 |
| 3×3 | 1.000 | 3.000 | 5.000 | 1.000 |
| 4×4 | 2.630 | 7.890 | 13.150 | 2.630 |
| 5×5 | 4.975 | 14.925 | 24.875 | 4.975 |

Con manos de VERDAD (los 6.979 turnos de las ocho partidas a ciegas), el tope de 3×3
dirigido da una mediana de 720 opciones y un máximo de 2.976 en mesa de cuatro
(`medir-portillo.ts`, §B). Y esas listas no se quedan en el servidor: `mesas.ts` mete
`opciones: loQueSePuedeHacer(...)` dentro de lo que se lee de una mesa, así que **la
lista viaja entera a cada dispositivo en cada lectura**. Medido en JSON, con rótulo y
ayuda (`medir-cable.ts`):

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
rechazado, que es el que recorre la lista completa (`medir-portillo.ts`, §A):

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
  factura se paga con la decisión 1.2: la lista de uno por uno se queda, así que un
  cliente tonto (o un comprobador que juega a ciegas) sigue pudiendo trocar mandando
  cargas verbatim, y sólo el componedor usa la puerta.
- **NO cambia `canonico.ts`.** El encargo daba por hecho que sí. Se ha medido y no hace
  falta: la comparación por forma cuenta multiconjuntos, no compara cadenas, y el orden
  canónico de los dos lados se resuelve donde ya se resuelve todo lo demás en este juego
  (decisión 1.5). `canonico.ts` es del núcleo y no se toca.
- **NO cambia `shared/arcade/`.** `estaOfrecido` es una función PRIVADA de
  `riberas.ts`. El portillo de este juego se debilita dentro de este juego, y el de los
  otros tres arcades no se entera. Esto se ha comprobado leyendo el fichero: el núcleo
  registra `opciones()`, no el portillo.
- **La declaración no puede llevar mi mano dentro**, y por eso no la lleva. Ver §2.

**(b) El trueque sale del portillo y lleva su validación exhaustiva en el reductor.**
Se descarta. El coste no es el código (ya está escrito: `ofrecer` valida todo lo que hay
que validar), es lo que se pierde:

- La única comprobación de toda la batería que distingue un motor CON portillo de uno
  SIN él es la de `verificar-riberas.ts` (paso «El §5 bis: "sólo si", nunca "si y sólo
  si"»), y es justamente una de trueque: «proponer lo que ya tienes no se ofrece» y «aunque
  la rama del reductor lo daría por bueno, el portillo lo rechaza». Sacar el trueque del
  portillo mata esa vacuna, y entonces nada del árbol demuestra que el portillo exista.
- El portillo garantiza que la legalidad se decide sobre LA VISTA y nunca sobre el
  estado. Con (b), `ofrecer` decide sobre el estado, que es donde está el almacén ajeno.
  Hoy no lo mira; el día que alguien «mejore» la validación mirando lo que el otro tiene
  («no ofrezcas lo que él no puede pagar»), la fuga no la caza nadie: `verify:mesa` busca
  los valores canónicos de `loSecreto` en lo que SALE por la red, no en lo que el reductor
  LEE.
- Y la asimetría de `contestar` (una guarda habla y las otras cuatro callan porque a
  ellas no llega nadie) deja de ser cierta, porque el portillo era quien las hacía
  inalcanzables. Habría que reescribir esas cinco guardas con sus motivos, y cada motivo
  es una frase que ningún comprobador de secretos mira.

**(c) Opciones enumeradas pero acotadas.** Se descarta por las dos tablas de arriba. El
tope más pequeño que le sirve a Miguel para algo (dos por lado, que es lo mínimo que
merece llamarse «varias unidades») ya cuesta 233,8 kB de lista en cada lectura de una
mesa de seis, veinticinco veces lo de hoy, mandados a seis aparatos en cada movimiento.
Y hay un argumento que no es de tamaño y pesa más: **con un tope, la interfaz tiene que
componer de todos modos**, porque nadie va a leer una lista de 230 botones. Y si la
interfaz compone, lo único que necesita de la lista es EL TOPE, no la lista. O sea que
las 230 opciones no las lee nadie: son porte.

### 1.2. Y la lista de uno por uno SE QUEDA al lado de la puerta

No es un cinturón: es lo que paga la factura de 1.1. Sin ella, `opciones()` deja de
llevar dentro un movimiento de trueque que se pueda mandar tal cual, y con eso se cae un
principio de la casa («todo lo que se propone tiene que ser jugable desde la lista de
opciones») y se caen tres cosas concretas: un cliente que sólo pinta botones, la vacuna
del portillo del §1.3, y cualquier jugador ciego que se escriba mañana para este arcade.

Lo que cuesta, medido: la lista de uno por uno SIN el filtro del §1.3 son, en mesa de
seis con la mano repartida, 100 opciones y 17,6 kB. Sumado a lo demás, la lista entera
se va de los 9,3 kB de hoy a unos 27 kB en el peor caso de una mesa de seis. Es tres
veces lo de hoy y sigue siendo dos órdenes de magnitud menos que cualquier enumeración
con multiplicidad. Y el portillo, a 100 opciones, cuesta 0,26 ms.

`opcionesFueraDelTablero` ya saca OFRECER de la lista de botones del pie, así que ni las
de uno por uno ni la puerta se pintan como botones en ninguna de las dos pantallas. No
hay que tocar esa función.

### 1.3. Pedir lo que ya tienes: se quita el filtro, Y CON ÉL SE VA LA VACUNA DEL PORTILLO

Miguel tiene razón y `opcionesDeTrueque` pierde esta línea:

```
if (llegaPara(v.misFichas, [quiero])) continue;
```

Lo que se pierde con ella, dicho sin adornos: **evitaba ofertas absurdas**. Un colono con
cuatro limos que pide un limo más está pidiendo algo que ya tiene, y con uno por uno eso
casi nunca es lo que quiere. Con multiplicidad deja de ser absurdo (pedir dos piedras
cuando se tiene una es la mitad de los trueques de este juego), y en la lista de uno por
uno se queda como ruido aceptado. Lo que cuesta, medido sobre los 6.979 turnos:

| | Media | Mediana | p90 | Máximo |
|---|---|---|---|---|
| Opciones de OFRECER hoy | 16,5 | 18 | 18 | 18 |
| Sin el filtro | 30,8 | 36 | 48 | 60 |

O sea que la lista de trueque casi se duplica y el máximo se triplica. Y hay 31 turnos de
6.979 en los que hoy no se ofrece nada, que bajan a 7 sin el filtro.

**Y AHORA LO GRAVE, QUE ES LO QUE NADIE VE AL QUITAR LA LÍNEA.** Esa línea es la que
sostiene la única comprobación de todo el árbol que demuestra que el portillo existe.
`verificar-riberas.ts` lo dice con estas palabras en el paso del §5 bis: «Si alguien quita
el portillo, esta comprobación (y sólo ésta) se pone roja». Y la comprobación es
literalmente `ofrecer junco por limo` teniendo limo: se ofrece que no, el reductor lo
aceptaría, el portillo lo para. **Quitar el filtro deja esa comprobación en verde por
nada y el portillo sin vigilancia, y ningún comprobador se pone rojo al hacerlo.** Es
exactamente la forma de fallo que este repositorio ya tiene apuntada dos veces: el
comprobador verde por filtro roto.

**La vacuna que la sustituye, y hay que escribirla en el MISMO empujón que quita la
línea:** `opcionesDeTrueque` salta también `if (otro.bienes === 0) continue;`, o sea que
no se ofrece trocar con quien no tiene nada. Y `ofrecer`, en el reductor, NO comprueba
eso: sólo mira `otro >= 0 && otro !== yo`. Así que un `OFRECER` dirigido a un colono con
el almacén vacío es un movimiento que el reductor daría por bueno y que `opciones()` no
ofrece, que es la misma forma exacta de la vacuna vieja. Y la puerta paramétrica lo hereda
gratis, porque su lista `a` se construye con el mismo `continue`.

### 1.4. El tope: TRES por lado, y sale de la pantalla más pequeña

`TOPE_POR_LADO_DEL_TRUEQUE = 3`, sustituyendo a `BIENES_POR_LADO_DEL_TRUEQUE = 1`. Tres
razones, dos medidas y una del juego:

- **La tira del tablón en el lienzo más pequeño cabe justo.** Una propuesta se lee como
  fichas de bien con su cifra («3 piedra», una ficha por CLASE y no por unidad), y en el
  SE apaisado (568×320) a la oferta le quedan 165 puntos, o sea **6 fichas** contando la
  flecha del medio (`medir-tablon.ts`). Tres clases por lado son seis fichas: cabe
  exactamente. Con tope de cuatro o cinco no cabe, y lo que se pierde al recortar es la
  mitad derecha de la oferta, que es lo que se pide.
- **Cubre las dos mitades de la pieza más cara.** `COSTES.torre` es `['grano', 'grano',
  'piedra', 'piedra', 'piedra']`: la mitad de piedra son tres y la de grano son dos. Con
  tres por lado se puede pedir de una vez cualquiera de las dos mitades de cualquier
  compra del juego.
- **Las manos reales no dan para más.** En los 6.979 turnos medidos, la mediana de CLASES
  distintas en la mano es 3 y el máximo 5; la mediana de bienes es 5, el p90 es 10 y el
  máximo 20 (`medir-trueque.ts`, §3). Un trueque de tres por tres es ya un trueque
  grande.

Y el tope no cuesta nada en la lista, que es la gracia de la decisión 1.1: la puerta
declara `tope: 3` en cuatro caracteres, y quien enumera son las de uno por uno. Subir el
tope a cinco mañana cuesta cambiar una constante y volver a medir la tira; con enumeración
habría costado 6.692 kB.

**Nota para el encargo del ladrón:** el máximo de 20 bienes en mano es un número de HOY.
La regla del descarte con más de siete cartas lo va a bajar a la mitad larga. El tope de
tres no depende de eso (sale de la tira del SE), así que las dos decisiones no se pisan.

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
comparación por forma no depende del orden en que el dedo tocó las fichas. Es una línea, y
sin ella el fallo aparece en la crónica de una partida de dos aparatos, que es donde no se
mira.

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
cinco por cinco son 3.851 (+477), y con veinticuatro, 6.233 (`medir-portillo.ts`, §C). El
tope del presupuesto es `TOPE_BYTES = 524.288`.

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
   - **Si ya ha leído** (el sondeo largo le trajo la vista nueva), `opcionesDeRiberas` ya
     no ofrece aceptarlo, porque el bucle de `opcionesDeTurno` salta todo trato con
     `estado !== 'propuesta'`. Lo para el PORTILLO, una capa antes de `contestar`, con el
     motivo corto y ciego que ya está escrito: «Eso ya no se puede hacer: la mesa cambió
     entre que se pintó el botón y lo pulsaste». Es literalmente el caso que ese motivo
     nombra en su cabecera.
4. Las dos pantallas ya saben leer las dos cosas: `mover` devuelve `'rechazado'` y hay un
   `seIgnoro` en las dos `mesa.ts`. La siguiente vista trae el trato en `'aceptada'` y el
   tablón lo quita de la lista.

**Y la guarda de `contestar` sigue sin recibir a nadie**, que es lo que hay que ver: la de
`if (trato.estado !== 'propuesta') return estado;` parece que debería empezar a
dispararse con las propuestas abiertas, y no lo hace, porque los dos caminos de arriba
paran antes. Su cabecera («a esas guardas no llega nadie») sigue siendo verdad y hay que
dejarlo escrito ahí, o el siguiente que lea el código le pondrá un motivo que nadie va a
leer nunca.

**Lo que se ha pensado y NO se hace:** dar un motivo específico («se lo llevó otro»).
Sería legítimo, porque el estado de un trato es PÚBLICO y no filtra nada, pero para
decirlo habría que seguir ofreciendo ACEPTAR sobre un trato ya aceptado (para que el
movimiento pase el portillo y llegue a `contestar`), y eso es pintar un botón que no
hace nada, que es el fallo que la cabecera de los topes de `opcionesDeTurno` cuenta con
2.834 movimientos medidos. El motivo genérico más la vista que llega detrás dicen lo
mismo y no encienden nada muerto. Queda anotado en el §7 por si al verlo molesta.

### 1.8. Cuatro propuestas vivas por turno, y `TRATOS_QUE_SE_RECUERDAN` sigue en 8

`TRATOS_QUE_SE_RECUERDAN = 8` sigue valiendo, pero **no por sí solo**, y esto es un
hallazgo de comprobar el número contra lo nuevo:

- `ultimos` recorta por el final SIN mirar el estado de cada trato. Hoy nadie propone
  nueve veces en un turno, así que no pasa nada. Con propuestas abiertas y varias vivas a
  la vez, un proponente que encadene nueve empuja fuera de la lista una propuesta que
  alguien está mirando, **y esa propuesta desaparece de la vista de todos sin explicación
  ninguna**: no caduca, no se rechaza, no se acepta; se cae del array.
- Así que se acota por el otro lado: `opcionesDeTrueque` **deja de ofrecer la puerta y
  las de uno por uno cuando ya hay `PROPUESTAS_VIVAS_A_LA_VEZ = 4` en `'propuesta'` mías
  en este turno**. Se cuenta sobre `v.tratos`, que es público y está en la vista de todos,
  así que no es un caso del «sólo si»: es una guarda que se puede mirar, como los topes de
  piezas.
- Con cuatro vivas como máximo y ocho de memoria, `ultimos` nunca puede tirar una viva:
  quedan cuatro huecos para las contestadas y caducadas del turno anterior. El número 8
  sobrevive, y ahora sobrevive POR UNA RAZÓN y no por costumbre.

Y cuatro es además lo que cabe en la pantalla: cuatro tiras de 44 son 176 puntos, y
**caben en los quince lienzos de `LIENZOS`** (el peor, el SE apaisado, tiene 276 puntos
útiles bajo la cinta; `medir-tablon.ts`). Con ocho no cabrían: el SE enseñaría seis
enteras y 12 puntos de la séptima.

### 1.9. La aceptación se confirma, y la tira NO lleva botón de aceptar

Miguel: «la aceptación debe tener que confirmarse para que no se acepte por
equivocación». La forma de garantizarlo no es poner un diálogo detrás del botón: es que
**en la tira no haya botón de aceptar**.

La tira entera es un botón, y lo único que hace es ABRIR la hoja de la propuesta. En la
hoja están «Aceptar» y «Rechazar», cada uno con su renglón de 44 y su rótulo escrito. Dos
toques, y el primero no está encima del segundo. Aparte de ser lo que Miguel pide, es lo
que hace que la tira quepa: medido, si la tira llevara sus dos botones de 44 al lado, a
la oferta le quedarían **77 puntos en el SE apaisado (2 fichas)** y **16 en 320×360 (cero
fichas)**, contra los 165 y 104 que quedan sin ellos (`medir-tablon.ts`). O sea que la
decisión de producto y la aritmética piden lo mismo, que es cuando una decisión está
bien.

### 1.10. El tablón cuelga de la cinta y NO es modal; el componedor SÍ lo es y va a todo el ancho

Son dos superficies distintas y se separan por quién las usa y cuándo:

- **El tablón** lo lee quien NO tiene el turno, mientras otro juega. Tiene que estar a la
  vista sin abrir nada (Miguel: «se tiene que mostrar en la pantalla las propuestas»), así
  que **no es modal**: cuelga de la cinta, mide lo que la cinta (`anchoDeLaCinta`) y sólo
  existe mientras haya propuestas vivas que yo pueda contestar. Debajo se sigue pudiendo
  girar el tablero.
- **El componedor** lo usa quien SÍ tiene el turno, y mientras compone no puede tocar el
  tablero (un toque perdido funda una choza). Así que **es modal**, como el cajón del
  marcador, y por ser modal puede ocupar **todo el ancho** del lienzo, que es lo que
  necesita: medido, un renglón de bien mide 162 puntos (ficha 44, «−» 44, cifra 30, «+»
  44) y el ancho de la cinta se queda corto en los cuatro lienzos de pie (128, 144, 156 y
  156). A todo el ancho cabe en los quince.

El tablón y el cajón cuelgan del mismo sitio, así que **sólo uno está abierto a la vez**:
abrir el cajón cierra el tablón y al revés. Es un cambio del otro documento y va en el §4.

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

## 2. El portillo con forma: qué comprueba, y qué se rompe si se debilita mal

**Lo que comprueba `cabeEnLaPuerta(declaracion, carga)`**, y nada más:

1. `da` y `pide` son listas de bienes de `BIENES`, cada una con entre 1 y `tope`
   elementos.
2. Ningún bien está en los dos lados (no se cambia limo por limo).
3. `para` es `null` (si la declaración trae `mesa: true`) o uno de los asientos de
   `declaracion.a`.

**Y lo que NO comprueba, a propósito: si tengo lo que ofrezco.** La declaración **no
lleva mi mano dentro**, y ésta es la decisión de seguridad de todo el documento. El
motivo es medible: `verify:mesa` compone lo que se le manda a cada asiento como
`{ vista, opciones: opcionesDeArcade(...) }` y busca ahí dentro los valores canónicos de
`loSecreto`, o sea `"b17:junco"` CON comillas. Una ficha metida en la declaración la
cazaría. **Una CUENTA («tengo cuatro limos») no la caza**, porque no contiene esa cadena.
O sea que una declaración con cuentas sería una superficie nueva que el comprobador de
secretos no vigila, y el día que alguien la componga con la mano de otro (por ejemplo
para no ofrecer lo que el otro no puede pagar) la fuga sería invisible. Así que la
declaración lleva sólo datos públicos: un número y una lista de asientos.

Que yo tenga lo que ofrezco lo sigue comprobando `ofrecer` contra el estado, con el
`llegaPara` que ya está escrito. Es exactamente el «sólo si» del §5 bis: se ofrece una
familia mirando la vista, y el reductor valida el miembro concreto mirando todo lo que
hay.

**QUÉ SE ROMPE SI EL PORTILLO SE DEBILITA MAL.** El portillo es lo único que impide que
un cliente manipulado mande cualquier cosa; el árbitro no mira dentro de la carga porque
no puede (el estado es opaco para él). Las cuatro formas de estropearlo, con lo que pasa
en cada una:

| Cómo se debilita | Qué entra por ahí |
|---|---|
| La rama de forma se aplica a TODOS los movimientos y no sólo a OFRECER | Se acabó el portillo. `fundar` en cualquier vértice, `alzar` donde no pega, jugar una carta que no está en la mano. Las guardas de cada rama tapan casi todo, pero no todo: la cabecera de `pegaConLoSuyo` mide que sin el corte en la vista **la vereda ENTRA**, porque el portillo es justo quien pregunta |
| La declaración se construye leyendo el ESTADO en vez de la vista | El portillo deja de garantizar lo que existe para garantizar. `opciones()` recibe la vista y jamás el estado, y eso es «imposible por construcción y no por disciplina»; una declaración que se salte esa firma es una segunda proyección con su propio tapado, y `verify:mesa` no la mira |
| La declaración lleva cuentas de la mano (mía o de otro) | Superficie nueva de fuga que el comprobador de secretos NO caza, por lo dicho arriba |
| La comprobación de forma se hace ANTES de buscar la opción de puerta | Se puede ofrecer sin tener el turno, sin haber tirado y con una vereda de la carta pendiente, porque esas tres cosas no las dice la forma: las dice el hecho de que la puerta esté en la lista. Es el fallo más fácil de escribir y el más difícil de ver |

Y hay un quinto, que es de presupuesto y no de reglas: **la comprobación de forma corre
DENTRO del tramo cronometrado**, igual que el `canonico` de hoy. Tiene que ser
proporcional al tamaño del movimiento y no al de la lista, o sea contar hasta `tope` y
parar. Un `cabeEnLaPuerta` que recorriera algo que elige quien llama reabre por la puerta
de al lado el ataque de los 240 kB que `TOPE_CARGA_BYTES` cerró, y la cuarentena que hay
al otro lado es por arcade, permanente y sin puerta para levantarla. Medido: con la carga
acotada a 8 kB por la ruta, contar tres bienes por lado es del orden del microsegundo.

## 3. La pantalla, en los dos clientes

Las tres piezas son las mismas en el escritorio (DOM) y en la app (React Native), con los
mismos números, y las tres viven fuera del lienzo, como manda la decisión 7 del otro
documento (el lienzo no puede escribir «Miguel»).

### 3.1. La tira: qué se ve de una propuesta sin abrir nada

Una tira por propuesta viva que yo pueda contestar, **44 puntos de alto**, en el ancho de
la cinta. De izquierda a derecha: el raíl de color de quien la propone (4 puntos, el
`fichaRail` de siempre), y la oferta como fichas de bien con su cifra, `da` a la
izquierda, una flecha, `pide` a la derecha. Sin botones (§1.9). Lo que se oye es la frase
entera: «Ana ofrece tres piedras y dos granos por un limo. A la mesa. Toca para
contestar».

Medido en los quince lienzos de `LIENZOS` (`medir-tablon.ts`), con el ancho de la cinta
reproducido de su regla (el tercio en apaisado, el 40 % de pie: la función
`anchoDeLaCinta` de `escenas/cinta.ts` está PENDIENTE de la fase 5 del otro documento, y
aquí se copia la fracción como `medir-con-014.ts` copió la de `huecosDeLaBarra`):

| Lienzo | Ancho de la cinta | Alto útil bajo ella | Tiras de 44 que caben | Ancho para la oferta | Fichas que caben |
|---|---|---|---|---|---|
| 568×320 (SE apaisado) | 189 | 276 | 6 | 165 | 6 |
| 667×375 (SE 2/3) | 222 | 331 | 7 | 198 | 8 |
| 780×360 (Android) | 260 | 316 | 7 | 236 | 10 |
| 844×390 (iPhone 14) | 281 | 325 | 7 | 257 | 10 |
| 932×430 (Pro Max) | 311 | 365 | 8 | 287 | 12 |
| 1024×768 (tableta 4:3) | 341 | 724 | 16 | 317 | 13 |
| 1180×820 (iPad Air) | 393 | 756 | 17 | 369 | 16 |
| 1920×1080 (monitor) | 640 | 1.036 | 23 | 616 | 27 |
| 320×360 (de pie) | 128 | 316 | 7 | 104 | 4 |
| 390×845 (de pie) | 156 | 801 | 18 | 132 | 5 |
| 768×1024 (tableta de pie) | 307 | 980 | 22 | 283 | 12 |

**Las cuatro propuestas vivas caben en los quince lienzos**, con el SE apaisado como peor
caso: 176 de 276, y sitio para dos más. El tope de tres por lado sale de la columna de la
derecha: seis fichas en el SE son tres clases por lado. **De pie en 320×360 sólo caben
cuatro fichas**, así que ahí una oferta de 3×3 se recorta con puntos suspensivos en el
lado de `pide`; de pie es la forma secundaria (la app bloquea el apaisado y en la web
está el cartel de girar), la frase entera se oye y está en la hoja. Es lo mismo que hace
el segundo renglón de la ficha del cajón.

### 3.2. La hoja de la propuesta: donde se confirma

Se abre tocando la tira. Modal, del ancho de la cinta, tres renglones de 44:

1. **Qué es**, con las dos manos escritas en palabras y no en fichas: «Ana te da 3 piedra
   y 2 grano. Tú le das 1 limo». Y debajo, en tenue, «A la mesa: puede aceptarlo
   cualquiera» o «Sólo a ti».
2. **«Aceptar el trueque»**, con el fondo de acento.
3. **«Rechazar»** para un dirigido, **«No me interesa»** para un abierto, porque no es lo
   mismo: apartar un abierto no lo mata para los demás (§1.6).

Un toque fuera la cierra sin hacer nada, igual que el cajón. Tres renglones son 132
puntos y caben en los quince lienzos por la tabla de arriba.

### 3.3. El componedor: cómo se monta una oferta de varios bienes con el dedo

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
4. **«Proponer»**, apagado mientras algún lado esté vacío.

Medido: el renglón de 162 puntos cabe a todo el ancho en los quince lienzos. De los ocho
renglones se ven seis en el SE apaisado (faltan 76 puntos) y siete en el SE 2, el Android
de 360 y el iPhone 14; se desplaza en vertical, como el cajón.

### 3.4. Lo que sale de los botones del pie

Aceptar y rechazar dejan de ser botones del `Formulario` del escritorio y de
`LasOpciones` de la app: ahora los pinta el tablón, y la regla de la casa es que cada
movimiento se enseña exactamente una vez. Hace falta un filtro nuevo en
`shared/arcade/juegos/riberas-en-tres.ts`, hermano de `opcionesFueraDeLaMesa`:
`opcionesFueraDelTablon(opciones, hayTablon)`, que quita ACEPTAR y RECHAZAR cuando el
tablón está pintado y las deja cuando no (un mirón, una pantalla que todavía no lo pinte).
Y con el mismo orden que `opcionesFueraDeLaMesa`: **el tablón recibe las opciones ENTERAS,
antes del filtro**, o se quedaría sin nada que pintar.

Lo que queda en el pie: tirar (donde no hay dados), pasar y empezar.

## 4. Lo que esto cambia de `docs/LA-MESA-DE-RIBERAS.md`

Tres cosas, dichas explícitamente para que no se contradigan los dos documentos. Ninguna
toca lo que las fases 1, 2 y 3 ya dejaron en el código.

1. **§2.2, la segunda línea de la cinta.** Dice que la línea de botones sueltos lleva
   «pasar, aceptar, rechazar, contestar, empezar». Aceptar y rechazar **se van al tablón**
   (§3.4). La línea sigue midiendo 44 y sigue apareciendo sólo cuando hay botones, así que
   la suma máxima de la cinta sigue siendo 88 puntos y ninguna de las medidas del vértice
   lejano cambia. Lo que cambia es que la línea aparece menos a menudo y con rótulos más
   cortos.
2. **§1.11, el cajón.** Dice que el cajón cuelga de la cinta con el ancho de la cinta y es
   modal. Sigue siendo verdad, pero **deja de ser lo único que cuelga de ahí**: el tablón
   ocupa el mismo sitio y no es modal. La regla nueva es que sólo uno está abierto a la
   vez, y abrir uno cierra el otro. El aire del cajón a las dos manos, que el §1.11 mide,
   vale igual para el tablón porque es la misma geometría.
3. **§11, fase 5 (pantalla completa en el escritorio) y fase 6 (la app).** Ganan el
   tablón, la hoja y el componedor. El componedor es lo único de todo este encargo que NO
   mide lo que la cinta: va a todo el ancho, y `anchoDeLaCinta` no le sirve.

Y una fila para el §10 de aquel documento: **el componedor a todo el ancho tapa las dos
manos mientras está abierto**, y eso hay que verlo en el banco antes de darlo por bueno.
Está en el §7 de aquí.

## 5. Dónde vive cada cosa

Todo por NOMBRE de función o de constante, nunca por línea.

| Fichero | Qué |
|---|---|
| `shared/arcade/juegos/riberas.ts` | `BIENES_POR_LADO_DEL_TRUEQUE` muere; nace `TOPE_POR_LADO_DEL_TRUEQUE = 3` con su cabecera contando la revocación y el porqué del tres (§1.4). `PROPUESTAS_VIVAS_A_LA_VEZ = 4` (§1.8). `Trato.para` pasa a `AsientoId \| null` y gana `rechazada: AsientoId[]`. `bienesDeLaCarga(carga, campo, minimo, maximo)` acepta un rango en vez de una cifra exacta. `opcionesDeTrueque` pierde el filtro de `quiero`, gana la opción de puerta y la guarda de las cuatro vivas. `estaOfrecido` gana la rama de forma y llama a `cabeEnLaPuerta`, las dos privadas de este fichero. `ofrecer` admite `para: null`, ordena los dos lados por `BIENES` y sigue con su `llegaPara`. `contestar` admite abiertos y escribe en `rechazada`. `opcionesDeTurno` cambia el filtro de a quién se le ofrece contestar |
| `shared/mecanicas/canonico.ts` | **NADA.** Medido y comprobado: la comparación por forma cuenta multiconjuntos y el orden canónico lo resuelve `ofrecer` |
| `shared/arcade/opciones.ts` | **NADA.** El portillo es privado de `riberas.ts`; el núcleo sólo registra `opciones()` |
| `shared/arcade/juegos/riberas-en-tres.ts` | `truequeDeLaOpcion` deja de leer `da[0]` y `pide[0]` y lee las listas enteras; `TruequePosible` gana `doy: string[]` y `quiero: string[]`. `bienesQueSeCambianPor` y `truequesPosibles` se quedan para la lista de uno por uno. NUEVO: `puertaDelTrueque(opciones)`, que devuelve la declaración de la puerta o `null`, y `propuestasEnTres(vista, yo)`, la lista de tiras del tablón con quien la propone, su color, los dos lados y si es abierta. NUEVO: `opcionesFueraDelTablon` |
| `escenas/delta.tsx` | `AreaDeTrueque` pasa a ser una sola (§1.11): `areasDeTrueque(1, ...)`, el dibujo de la mesa en vez del de un bien, y `onProponerTrueque` deja de mandar un movimiento y pasa a abrir el componedor con ese bien. Su cabecera, reescrita |
| `escenas/baraja.ts`, `escenas/cartas.ts`, `escenas/barra.ts`, `escenas/camara.ts` | **NADA** |
| `escritorio/src/riberas-en-tres.tsx`, `escritorio/src/estilo.css` | El tablón, la hoja y el componedor en DOM; `alProponerTrueque` deja de mandar y pasa a abrir; `A_QUIEN_SE_LO_PROPONES` se va (el componedor tiene su renglón de destino); el filtro nuevo en la composición de `opciones` |
| `app/src/arcade/riberas-en-tres-escena.tsx` | Lo mismo en React Native, con `accessibilityViewIsModal` en la hoja y en el componedor, como `HojaDeAQuien` |
| `server/scripts/verificar-riberas.ts` | La vacuna sustituta del portillo (§1.3), la comparación por forma con sus roturas, el ciclo de vida de un abierto, la carrera de dos aceptaciones, el orden canónico de los dos lados, y que `ultimos` no puede tirar una viva con el tope de cuatro. Hoy son 349 comprobaciones y el guardia está en 349 |
| `server/scripts/verificar-riberas-en-tres.ts` | Que `propuestasEnTres` cuenta lo que la vista dice, que `opcionesFueraDelTablon` quita ACEPTAR y RECHAZAR y sólo con tablón, y que sigue a las opciones enteras. Hoy son 295 con `MINIMO` 293 |
| `escenas/scripts/verificar-escena.ts` | Que cuatro tiras de 44 caben bajo la cinta en los quince lienzos con su inset de abajo, y que el renglón del componedor de 162 cabe a todo el ancho. Hoy son 335 |
| `server/scripts/verificar-mesa.ts` | Nada nuevo que escribir, pero es el que tiene que seguir verde: la declaración de la puerta viaja dentro de `opciones` y su búsqueda de secretos la mira. Hoy son 856 |

## 6. Cómo se midió

Cuatro guiones en el scratchpad de la sesión, que importan el código real de `6372bc7`,
sin tocar nada y sin levantar ningún servidor. Mueren con la sesión.

- **`medir-trueque.ts`.** Juega ocho partidas ENTERAS a ciegas con `partidaNueva`,
  `proyectarRiberas`, `opcionesDeRiberas` y `avanzarRiberas` de verdad, cuatro colonos,
  eligiendo opciones al azar con un generador propio y reproducible (13.872 movimientos
  aplicados). Anota la mano de cada turno con turno y tirada hecha (6.979 muestras) y
  cuenta, para cada una, lo que `opciones()` emite hoy y lo que emitiría sin el filtro.
  Y aparte, la combinatoria pura de multiconjuntos por lado con y sin lados disjuntos.
  De aquí salen: bienes en mano (mediana 5, p90 10, p99 17, máximo 20), clases distintas
  (mediana 3, máximo 5), la mano mediana medida `[4,0,0,1,0]` y la mayor `[4,0,0,0,16]`,
  las opciones de hoy contra las de sin el filtro, y la tabla de la combinatoria del §1.1.
- **`medir-portillo.ts`.** Tres cosas. (A) El coste del portillo: reproduce `estaOfrecido`
  con el `canonico` de verdad y cronometra un movimiento RECHAZADO (el peor caso, que
  recorre la lista entera) contra listas de 30 a 50.625 opciones. (B) Las mismas ocho
  partidas, con cada mano medida contra cinco topes, dirigido y abierto, con media,
  mediana, p90, p99 y máximo. (C) Lo que ocupa el estado en forma canónica a media
  partida (3.374 caracteres), con ocho tratos de cinco por cinco (3.851) y con
  veinticuatro (6.233), contra `TOPE_BYTES`.
- **`medir-cable.ts`.** Monta las listas de opciones que cada tope produciría, con su
  `id`, su `rotulo` y su `ayuda` como los escribe el juego, y las mide en JSON: es lo que
  `mesas.ts` mete en `opciones` y manda a cada aparato en cada lectura. Y mide lo de hoy
  de verdad, jugando: la lista más larga que se ve en una partida (54 opciones, 9,3 kB) y
  lo que tarda `opcionesDeRiberas` (0,050 ms de media).
- **`medir-tablon.ts`.** El tablón, la tira y el componedor en los quince lienzos de la
  lista `LIENZOS` de `escenas/scripts/verificar-escena.ts`, con la cuarta columna del
  inset de abajo que el §1.11 del otro documento fija (0 salvo 844×390 → 21, 932×430 → 21
  y 1180×820 → 20). Reproduce la fracción de `anchoDeLaCinta` porque esa función está
  pendiente de la fase 5, y lo dice en su cabecera. De aquí salen la tabla del §3.1, las
  cuatro tiras que caben en los quince, los 162 puntos del renglón del componedor y la
  alternativa descartada de la tira con dos botones (77 puntos en el SE, 16 en 320×360).

Lo que NO se ha medido y hay que medir en el banco antes de cerrar la fase de pantalla:
el ancho real del texto de una tira con la fuente de la casa (a qué largo se recorta la
oferta), y si el componedor a todo el ancho molesta tapando las manos. Los dos están en el
§7.

## 7. Lo que NO entra, y las decisiones abiertas con dueño

**No entra:** el ladrón, la regla del descarte con más de siete cartas y el bloqueo de
producción (es otro encargo, y toca `tirarLosDados` y `GUARDIA`, no el trueque); la
descripción de las cartas al pasar el cursor (otro encargo, y es de la mano del mazo);
trocar con el banco a razón fija, que este juego no tiene y no se estrena aquí; contraofertar
sobre una propuesta ajena (sería un `Trato` que apunta a otro `Trato`, y con eso el ciclo
de vida deja de caber en cuatro estados); trueques que sobrevivan al turno; y ninguna
regla nueva sobre qué se puede pedir: lo sigue diciendo la lista de opciones más la
puerta.

**Decisiones abiertas con dueño:**

| Qué | Lo que hay decidido | Quién la cierra |
|---|---|---|
| El motivo cuando se pierde la carrera de una aceptación | Sale el motivo genérico del portillo, y la vista que llega detrás enseña quién se lo llevó (§1.7). La alternativa (seguir ofreciendo ACEPTAR sobre un trato aceptado para poder dar un motivo específico) se descarta por encender un botón que no hace nada | Quien haga la fase 2, viéndolo con dos aparatos. Si molesta, se cambia con lo escrito en el §1.7 |
| A qué largo se recorta la oferta de una tira | El hueco está medido (165 puntos en el SE, 104 en 320×360, 6 y 4 fichas), y lo que se recorta es el lado de `pide`, que es lo que se pide y por tanto lo que menos duele perder cuando ya se ve el lado de `da`. El ancho del texto con la fuente de la casa no se mide en Node | La fase de pantalla, en el banco, y se deja escrito |
| El componedor a todo el ancho tapa las dos manos | Es modal y sólo lo abre quien tiene el turno, así que no hay nada que arrastrar debajo. Cabe en los quince lienzos; con el ancho de la cinta no cabía en los cuatro de pie | **Miguel**, en el banco. Si prefiere verlo más pequeño, lo que se toca es el renglón (dos contadores por fila no caben: 296 puntos), no el ancho |
| El tope de tres por lado | Sale de las seis fichas del SE apaisado y de las dos mitades de `COSTES.torre`. Subirlo a cuatro o cinco cuesta cambiar una constante y volver a medir la tira, y NO cuesta nada en la lista ni en el portillo, que es la gracia de la decisión 1.1 | **Miguel**, cuando juegue con tres y le sepa a poco |
| Abierto por defecto o dirigido por defecto | El componedor pone «A la mesa» el primero, porque es lo que Miguel pidió y porque una mesa de seis con todo dirigido son cinco propuestas por trueque | **Miguel**, jugando |

## 8. El orden, en fases que se empujan una a una

Cada fase deja el juego entero y verde, y ninguna depende de la siguiente. **El motor va
primero y solo**, porque es lo que hace que todo lo demás sea jugable a ciegas: cuando la
fase 1 esté empujada, un trueque de tres por dos se puede hacer sin que exista todavía ni
una línea de pantalla nueva.

**Fase 1: el motor. Sólo `shared/arcade/juegos/riberas.ts` y su comprobador.**

Lo que trae: `TOPE_POR_LADO_DEL_TRUEQUE`, `PROPUESTAS_VIVAS_A_LA_VEZ`, `Trato` con `para`
nulable y `rechazada`, `bienesDeLaCarga` con rango, `opcionesDeTrueque` sin el filtro y con
la puerta, `cabeEnLaPuerta` y la rama de forma en `estaOfrecido`, `ofrecer` con abiertos y
con el orden canónico, `contestar` con abiertos, y el filtro de `opcionesDeTurno`. Y las
cabeceras que dejan de ser verdad, reescritas EN EL MISMO empujón (§9).

Comprobadores: `verify:riberas` (349 hoy) y `verify:mesa` (856, que tiene que seguir verde
sin tocarlo: es el que mira que la declaración de la puerta no lleve secretos).

**Las vacunas, y son las que dicen si la fase está bien hecha.** Cada una se rompe a mano
en el fichero real, se corre el comprobador y se restaura:

1. Quitar la rama de forma del portillo: se ponen rojas las de multiplicidad, y NINGUNA
   otra (o sea que la rama sólo afecta a OFRECER).
2. Aplicar la rama de forma a todos los tipos: se pone roja «una carga que no coincide con
   ninguna opción se rechaza».
3. Comprobar la forma sin buscar antes la opción de puerta: se pone roja una nueva, «no
   se puede ofrecer antes de tirar».
4. Subir el tope dentro de `cabeEnLaPuerta` sin subir la constante: roja.
5. Ofrecer a un colono con el almacén vacío: roja (es la vacuna sustituta del §1.3, la
   que demuestra que el portillo existe).
6. Quitar el orden canónico de `ofrecer`: roja la que manda el mismo trueque en dos
   órdenes y compara los dos estados con `canonico`.
7. Quitar la guarda de las cuatro vivas: roja la que propone cinco veces y comprueba que
   `ultimos` no tiró ninguna en `'propuesta'`.

**Fase 2: `shared/arcade/juegos/riberas-en-tres.ts`, que es lo que las dos pantallas
comparten.**

`truequeDeLaOpcion` con listas, `puertaDelTrueque`, `propuestasEnTres`,
`opcionesFueraDelTablon`. Nada se pinta todavía; `verify:riberas-en-tres` (295, `MINIMO`
293) comprueba que las cuentas cuadran con la vista y que el filtro sigue a las opciones
enteras. Vacuna: invertir el orden de `opcionesFueraDelTablon` y `opcionesFueraDeLaMesa`,
que tiene que ponerse roja igual que se pone hoy con `porTirar`.

**Fase 3: el escritorio.** El tablón, la hoja y el componedor en DOM, con la composición
nueva de `opciones` y el «+» apagado con `aria-disabled`. `verify:escritorio` (400 hoy)
gana las comprobaciones de que la tira no lleva botón de aceptar, de que el componedor no
monta `disabled` nativo, y de que aceptar y rechazar no salen dos veces. Y se mira en el
banco: una propuesta de 3×2 en una ventana estrecha, cuatro propuestas a la vez, y aceptar
una que otro acaba de llevarse.

**Fase 4: la app.** Lo mismo en React Native, con `accessibilityViewIsModal` en la hoja y
en el componedor. `verify:sala` (152 hoy). Se prueba en el aparato, en apaisado, con el
teclado de accesibilidad encendido.

**Fase 5: el mostrador del 3D.** `areasDeTrueque(1, ...)` y `onProponerTrueque` abriendo el
componedor. Va la última porque es un gesto de comodidad sobre algo que ya funciona sin él,
y porque toca `escenas/delta.tsx`, que es donde está trabajando el otro encargo.
`verify:escena` (335 hoy) mide que sigue habiendo un área y no cinco, y que sigue sin
pisar la mano de bienes.

## 9. Las cabeceras que dejan de ser verdad

Se listan aparte porque en esta casa un comentario falso es un fallo, y porque la mitad de
ellos defienden justamente lo que se está cambiando. Todos se reescriben en la fase que
toca su fichero.

| Dónde | Qué dice hoy | Por qué deja de ser verdad |
|---|---|---|
| `BIENES_POR_LADO_DEL_TRUEQUE` | «uno por uno se lee de un vistazo… la combinatoria completa son miles de opciones, que no es una interfaz sino una lista que nadie lee» | El diagnóstico se queda (medido: 5.000 opciones y 1,14 MB) y la conclusión se revoca. La constante muere y la nueva cuenta las dos cosas |
| `opcionesDeTrueque` | «Uno por uno y sólo de lo que me sobra por lo que no tengo» y «Aquí NO hay ningún ejemplo del "sólo si" del §5 bis» | Lo primero es la regla revocada. Lo segundo pasa a ser al revés: **la puerta paramétrica ES un ejemplo del «sólo si»**, y de los buenos, porque se ofrece una familia mirando la vista y el reductor valida el miembro mirando el estado |
| `estaOfrecido` | «Se compara la forma canónica de `{ tipo, carga }` contra la de cada opción, y no campo a campo» | Gana una excepción, y la excepción tiene que contar las cuatro formas de estropearla del §2 |
| `bienesDeLaCarga` | «Exige EXACTAMENTE `cuantos`, y quien llama dice cuántos» | Pasa a exigir un rango. El porqué de que el número entre por parámetro (esta función no sabe de qué regla la llaman) se queda tal cual |
| `Trato` y `Trato.para` | «Lo propone quien tiene el turno y lo contesta quien NO lo tiene» | Sigue siendo verdad. Lo que cambia es que `para` puede ser `null` y que hay un campo nuevo, y las dos cosas hay que contarlas ahí |
| `contestar` | «Queda UNA sola guarda alcanzable… las demás son texto muerto: a esas guardas no llega nadie» | **Sigue siendo verdad y hay que decir por qué**, porque parece que debería cambiar: con abiertos, dos aceptaciones no llegan a la vez (los movimientos se serializan) y la segunda la para el portillo. La guarda de `estado !== 'propuesta'` sigue sin recibir a nadie |
| `AreaDeTrueque` en `escenas/delta.tsx` | «Recibe una lista de bienes de quien conoce las reglas, pinta un área por cada uno y avisa de cuál se soltó» | Pasa a ser un área que no es de ningún bien y que abre el componedor |
| `truequeDeLaOpcion` y `truequesPosibles` | «Si sale una sola, el cliente puede mandarla sin preguntar; si salen varias, tiene que preguntar a quién» | El componedor tiene su renglón de destino, así que `A_QUIEN_SE_LO_PROPONES` deja de hacer falta para la ruta rica; el texto vale sólo para la lista de uno por uno |
| `docs/LA-MESA-DE-RIBERAS.md` §2.2, §1.11 y §11 | Ver el §4 | Tres cambios declarados, ninguno contradice lo ya construido |
