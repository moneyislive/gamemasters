# Las Lindes

**El tercer arcade: un tablero que no existe hasta que lo ponéis vosotros.**

Escrito el 17 de septiembre de 2026, después de Riberas y de El Burgo, contra el
§7 y el §9 de [MOTOR-DE-ARCADE.md](../MOTOR-DE-ARCADE.md). Si algo de aquí no
coincide con el código, gana el código: corre `npm run verificar` y créele a él.

---

## 0. Lo legal, que aquí va primero y no al final

Las **reglas y las mecánicas** de un juego de mesa no son objeto de copyright ni
de patente, y el §8 del motor tiene las cuatro fuentes. Lo que **sí** está
protegido es la expresión: el nombre, la marca, el arte y los textos.

Así que se hace exactamente lo que se hizo con Riberas y con El Burgo, y con las
mismas cuatro condiciones innegociables:

1. **Nombre propio y no evocador.** «Las Lindes». Una *linde* es la raya entre
   dos campos, y el juego entero consiste en que la raya de una losa continúe la
   de su vecina. El nombre nombra la mecánica, no a nadie.
2. **Arte propio.** Ni una losa escaneada: cada una se **genera** con las piezas
   del pack que ya levantan el delta de Riberas y la ciudad de El Burgo. Ver §7.
3. **Reglas reescritas con nuestras palabras.** Este documento y
   `shared/arcade/juegos/lindes.ts` no traducen un reglamento: lo dicen.
4. **Cero descargos.** No hay ningún «inspirado en», ni aquí, ni en la ficha, ni
   en un comentario del código. Un descargo no protege y mete la marca ajena en
   los metadatos indexables, que es justo lo que las tiendas sancionan.

`procedencia: { tipo: 'mecanica-generica' }`. Poner losas cuadradas que casan por
los bordes y plantar un peón en lo que acabas de poner es una mecánica sin dueño,
igual que emparejar o adivinar una palabra. Lo que NO se declara es
`'creacion-propia'`, que sería falso: el reparto de losas viene de un juego
concreto y fingir lo contrario sería la clase de etiqueta que nadie puede
auditar.

---

## 1. A qué se juega, en un párrafo

Hay una bolsa de setenta y dos losas cuadradas. Cada lado de una losa enseña
**campo**, **senda** o **muralla**. En tu turno coges la de arriba y la pones
tocando algo que ya esté puesto, con la condición de que todo lado que quede
pegado a otro enseñe lo mismo que él. Después, si quieres, plantas uno de tus
**siete labriegos** en algo de la losa que acabas de poner —una senda, una
villa, un prado o una ermita—, siempre que nadie tenga ya gente en eso mismo. Lo
que se cierra se cobra en el acto y la gente vuelve a tu mano. Cuando se acaba la
bolsa se cuenta lo que quedó a medias y lo que los labriegos criaron en los
prados, y gana quien más tenga.

**Las cinco reglas que lo gobiernan todo**, y que son las que comprueba
`verify:lindes`:

- **Casan los bordes.** Todo lado compartido tiene que enseñar lo mismo. Sin
  excepciones y sin «casi».
- **Se toca algo.** Una losa suelta en mitad del mapa no vale: tiene que pegar
  con al menos una ya puesta.
- **Un labriego solo entra por la losa que acabas de poner**, y solo si la cosa
  donde entra —contando todo lo que esa cosa toca por el tablero— está vacía.
- **Lo cerrado se cobra y se recoge.** Una senda, una villa o una ermita que se
  completan se pagan en ese mismo instante, y sus labriegos vuelven.
- **Manda la mayoría.** En una cosa con gente de varios, cobra quien más tenga; y
  si empatan, cobran los dos enteros. Nadie cobra la mitad de nada.

---

## 2. Las setenta y dos losas

Veinticuatro clases. El reparto está en
`shared/arcade/juegos/lindes-losas.ts`, y `verify:lindes` lo cuenta.

| Clase | Qué enseña | Cuántas |
|---|---|---|
| `ermita` | Una ermita en medio del prado | 4 |
| `ermita-senda` | Ermita con una senda que muere en su puerta | 2 |
| `villa-redonda` | Muralla por los cuatro lados, con blasón | 1 |
| `puerta-senda` | Muralla al norte y una senda que cruza de lado a lado | 4 |
| `muralla` | Muralla en un lado, prado en los otros tres | 5 |
| `calle-blason` | Dos murallas enfrentadas y unidas, con blasón | 2 |
| `calle` | Dos murallas enfrentadas y unidas | 1 |
| `dos-murallas-enfrentadas` | Dos murallas enfrentadas y separadas | 3 |
| `dos-murallas-escuadra` | Dos murallas en esquina y separadas | 2 |
| `muralla-senda-derecha` | Muralla al norte, senda que dobla al este | 3 |
| `muralla-senda-izquierda` | Muralla al norte, senda que dobla al oeste | 3 |
| `muralla-encrucijada` | Muralla al norte y tres sendas que se juntan | 3 |
| `villa-escuadra-blason` | Dos murallas en esquina y unidas, con blasón | 2 |
| `villa-escuadra` | Dos murallas en esquina y unidas | 3 |
| `villa-escuadra-senda-blason` | Lo mismo, con blasón y con senda | 2 |
| `villa-escuadra-senda` | Lo mismo, con senda | 3 |
| `villa-tres-blason` | Muralla por tres lados, con blasón | 1 |
| `villa-tres` | Muralla por tres lados | 3 |
| `villa-tres-senda-blason` | Muralla por tres lados, blasón y senda | 2 |
| `villa-tres-senda` | Muralla por tres lados y senda | 1 |
| `senda-recta` | Una senda de lado a lado | 8 |
| `senda-curva` | Una senda que dobla | 9 |
| `encrucijada-tres` | Tres sendas que se juntan | 4 |
| `encrucijada-cuatro` | Cuatro sendas que se juntan | 1 |

**La primera losa se pone sola**, en el centro, y es una `puerta-senda`; las
setenta y una restantes se barajan. Si la que sale no cabe en ningún sitio, se
retira de la partida y se coge otra — y eso pasa, aunque poco.

### Cómo se dice una losa, que es la decisión de la que cuelga el reductor

Una losa son **cuatro lados** y unas **cosas** dentro:

```
lados[0..3]      norte, este, sur, oeste — 'campo' | 'senda' | 'muralla'
villas[]         { lados: [...], blason }      las murallas que van juntas
sendas[]         { lados: [...] }              los tramos que van juntos
prados[]         { huecos: [...], villas: [...] }
ermita           sí o no
```

Los **huecos** son la mitad del asunto y conviene decirlos despacio. Una senda
que cruza una losa parte su prado en dos, así que un prado no se puede decir con
los lados: hace falta media raya. Cada lado tiene **dos huecos**, numerados en el
sentido de las agujas del reloj empezando por la mitad occidental del norte:

```
            0   1
          ┌───┬───┐
        7 │       │ 2
          ├       ┤
        6 │       │ 3
          └───┴───┘
            5   4
```

Y así, el hueco `2i` y el `2i+1` son las dos mitades del lado `i`. Pegando dos
losas por el lado `i` y el lado `j = (i+2) % 4`, el hueco `2i` toca el `2j+1` y el
`2i+1` toca el `2j`. Girar un cuarto de vuelta a la derecha lleva el lado `i` al
`(i+1) % 4` y el hueco `h` al `(h+2) % 8`. Eso es toda la geometría del juego, y
son dos sumas.

`prados[].villas` dice **qué murallas de esa misma losa toca ese prado**, y de
ahí sale lo único que los labriegos cobran al final. Sin ese campo habría que
adivinarlo mirando el dibujo, que es exactamente lo que un dato existe para
evitar.

---

## 3. El estado

Opaco para el motor, como manda el §5.1. Por dentro:

```
momento        'reuniendo' | 'colocando' | 'plantando' | 'terminada'
labriegos[]    los jugadores, en el orden en que se sentaron
puestas{}      llave 'x,y' → { losa, giro, quien }
bolsa[]        lo que queda por robar, ya barajado
enMano         la losa robada que hay que poner, o ''
turno          índice dentro de `labriegos`
azar           semilla y contador (secreto: sale en la proyección)
retiradas      cuántas se fueron por no caber
```

**Qué es secreto y qué no.** La bolsa entera y el azar. Lo demás —el tablero, los
labriegos puestos, los puntos, de quién es el turno— es público, porque se ve
mirando la mesa. La losa **en mano** es pública en cuanto se roba: en la mesa de
verdad se pone boca arriba antes de decidir dónde va, y es la mitad de la tensión
del turno.

`loSecretoDeLasLindes` devuelve el contenido de la bolsa y la semilla. Si alguna
de las dos cosas aparece en la vista de otro asiento, `verify:mesa` se pone rojo.

**Las cosas se cuentan solas.** Ni las villas, ni las sendas, ni los prados viven
en el estado: se derivan del tablero cada vez que hacen falta, con un
*union-find* sobre los nudos `(x,y,lado)` y `(x,y,hueco)`. Guardarlas sería
guardar dos veces lo mismo, y la copia que se queda vieja es la que se lee.

---

## 4. Los movimientos

| Movimiento | Quién | Qué hace |
|---|---|---|
| `lindes:empezar` | cualquiera sentado | Baraja, pone la primera losa y roba |
| `lindes:poner` | a quien le toca | `{ x, y, giro }` — coloca la losa de la mano |
| `lindes:plantar` | el mismo, después | `{ clase, indice }` — planta un labriego en la losa recién puesta |
| `lindes:pasar` | el mismo | No planta, y el turno pasa |

Cuatro, y ni uno más. El cobro no es un movimiento: pasa dentro de `poner` y de
`plantar`, porque no es una decisión de nadie.

La **puerta del §5 bis** se respeta entera: `opcionesDeLasLindes` recibe la VISTA
y nunca el estado, el reductor rechaza lo que no se ofreció **y sigue validando
después**, y un rechazo devuelve el mismo objeto de estado con su motivo por
fuera (`rechazar`).

Y hay una puerta de las de `declaracion`, por lo mismo que el trueque de Riberas:
las colocaciones legales de una losa son, como mucho, unas pocas decenas, así
que **esas sí caben en la lista**; lo que no cabe es el producto de todas por
todos los labriegos plantables. `plantar` va aparte y en su propio momento, que
es lo que lo mantiene pequeño.

---

## 5. Lo que se cobra

| Cosa | Al cerrarse | Al acabar la partida |
|---|---|---|
| Senda | 1 por losa | 1 por losa |
| Villa | 2 por losa + 2 por blasón | 1 por losa + 1 por blasón |
| Ermita | 9 (ella y sus ocho vecinas) | 1 + las vecinas que haya |
| Prado | — | 3 por cada villa **cerrada** que toque |

Una senda se cierra cuando sus dos cabos mueren —en una encrucijada, en una
ermita o en una villa—, o cuando da la vuelta y se muerde la cola. Una villa se
cierra cuando no le queda ni un lado de muralla mirando a un hueco vacío. Una
ermita, cuando sus ocho vecinas están puestas.

---

## 6. El tablero declarado

`mueble: 'tablero'`, como los otros tres. Una losa puesta es una **cara**
cuadrada con su rótulo; los sitios donde cabe la de la mano son **caras**
punteadas con su `toque` puesto; los labriegos son **nudos** del color de cada
cual. Con eso el juego se puede jugar entero en los dos clientes **sin una línea
de tres dimensiones**, que es lo que hace que la escena sea un lujo y no una
dependencia. Es la lección de La Ronda del §7.

---

## 7. Las tres dimensiones

La escena vive en `escenas/lindes/` y **no sabe que existe Las Lindes**: recibe
una lista de losas puestas con su clase y su giro, y las levanta.

### La losa mide 175, y de ahí sale todo lo demás

Treinta y dos unidades de pack, ocho veces lo que medía en la primera versión.
Con veintidós unidades las piezas del pack cabían y no cabía una COMPOSICIÓN;
con 175 —sesenta y nueve personas de lado— caben manzanas con calles, murallas
con torres y puertas, y campos partidos en parcelas. El razonamiento entero, con
las medidas, está en `escenas/lindes/medidas.ts`.

### Qué lleva una losa

- el **suelo** se construye por celdas y se funde en rectángulos: una retícula de
  48 × 48 decide si cada punto es villa, senda o prado, y las celdas seguidas de
  la misma clase se juntan en un rectángulo antes de hacerse geometría;
- las **villas** son bandas desde cada muralla, **con chaflán en las esquinas**:
  eso es lo que hace que dos losas que las reglas dejan pegar casen también en el
  dibujo, y está explicado donde se decide;
- las **murallas** salen del borde villa/prado —nunca de los lados de la losa,
  que es por donde la villa CONTINÚA— con `muro`, `muro-puerta` donde llega un
  camino, y `atalaya` o `vigia` en los extremos de los tramos largos;
- las **sendas** salen rectas de su borde antes de doblar, para que la huella que
  dejan en la raya sea el ancho del camino;
- los **prados** se parten en parcelas con un uso cada una —trigo, barbecho,
  pasto, arboleda, erial— y en la raya entre dos parcelas hay un **seto**, que es
  literalmente lo que el juego se llama;
- la **ermita** es la pieza `ermita` del pack, con su cerca y su pozo.

El sorteo de todo eso cuelga de `semillaDelCodigo(codigo)` mezclado con las
coordenadas de la losa, nunca de `ctx.azar` —que es secreto y filtraría la
bolsa—, así que los cinco aparatos de una mesa ven exactamente el mismo paisaje y
otra mesa ve otro. Es la regla que ya tiene escrita `escenas/burgo/ciudad.ts`.

### El nivel de detalle no es un ahorro: es la condición

**El tablero crece.** Con las setenta y dos losas puestas y todo pintado harían
falta millones de triángulos, así que hay dos anillos alrededor de donde mira la
cámara: hasta 1,8 losas se pinta todo; hasta 4, lo que tiene bulto; más allá,
sólo lo que cuenta una regla —murallas, torres, ermitas—. Un tablero sin árboles
al fondo sigue siendo el tablero; uno sin la muralla de una villa cerrada es el
tablero mintiendo sobre la partida.

`verify:lindes-escena` mide las dos cuentas —el peor caso desnudo y el tablero
con el recorte puesto— con los triángulos REALES leídos del `.glb`, y es la
segunda la que manda.

---

## 8. El lobby

El tercero, hermano de El Muelle y de La Plaza, cumpliendo el mismo contrato
(`escenas/embarcadero/tipos.ts`) y con su fila en `escenas/embarcadero/tema.ts`.
Se llama **La Linde Alta**: un altozano sobre el valle vacío, con una mesa de
piedra donde los aventureros esperan y desde donde se ve el sitio donde va a
crecer el tablero.

---

## 9. El paseo

Lo que Miguel pidió con «recorrerlo en primera o tercera persona con los avatares
encima del tablero», y que **no** se hace con IR Engine: ver el §2.1 del motor y
el apartado del final de la bitácora. Se hace con lo que esta casa ya tiene
andando por El Muelle y por La Plaza, y con la máquina de pasos que El Burgo ya
tiene escrita y probada (`escenas/burgo/peon.ts`).

Tres cámaras, y se cambia con una tecla:

- **de mesa** — la de siempre, mirando el tablero desde arriba;
- **de hombro** — detrás de tu aventurero, que anda por encima de las losas;
- **de ojos** — desde su cara.

Andar no cambia el estado del juego: es una cámara y un avatar, y por eso no
entra por el reductor ni viaja por el cable. Lo que sí viaja es **dónde está cada
cual**, para que se vean entre ellos.

---

## 9 bis. Los dos rincones de la pantalla del jugador

Miguel pidió que la pantalla del jugador tuviera «dados, reloj de arena,
fragmentos de tablero, menús». De esos, dos se hacen EN LA ESCENA y colgados de
la cámara, uno en cada rincón de abajo. Dados no hay: este juego no tira.

### La losa de la mano — abajo a la izquierda

La pieza que toca poner, **en tres dimensiones y montada con el mismo generador**
que la va a poner en el tablero: misma semilla, mismo giro, mismas casas y
mismos árboles. Que sea la misma y no un dibujo aparte es la mitad del asunto —un
dibujo aparte se separa del generador en la primera semana y nadie se entera
hasta que alguien compara—. Y gira con el botón, que es lo único que hace que
«girar» deje de ser una palabra y pase a ser algo que se ve antes de tocar el
tablero.

### El reloj de arena — abajo a la derecha

**Mide la BOLSA, no el turno**, y eso no es un adorno del reglamento: este juego
declara `tickHz: 0`, no tiene plazos y no hay nada que el servidor haga por nadie
si tarda. Un reloj de turno sería una mentira pintada muy bien. Lo que sí se
acaba es la bolsa —la partida termina cuando sale la última losa—, y cuánto queda
es lo que decide si mandar un labriego al prado, de donde no vuelve, o guardarlo.

Es el mismo `RelojDeArena` de Riberas y, como allí, es también el botón de pasar:
lo que manda al tocarlo es LA MISMA acción que manda el botón de la tira, porque
se la pregunta a `shared/` (`laAccionDePasar`). Los clientes de esta casa no
saben reglas.

### Por qué los dos cuelgan de la cámara, y no de un sitio del mundo

Porque **el tablero crece**: cualquier rincón del mundo que hoy caiga en una
esquina del encuadre, con setenta losas puestas cae en medio o fuera. Colgados de
la cámara ocupan siempre el mismo trozo de pantalla, que es lo que una pieza en la
mano tiene que hacer. Es la misma decisión que la bandeja de los dados del Burgo.

Y **no** son un segundo `<Canvas>`: serían dos contextos de WebGL en la misma
pantalla, y en esta casa ya está apuntado cómo acaba eso en un móvil.

### Y su aritmética vive fuera de la escena, a propósito

`escenas/lindes/rincones.ts` no importa `three`: es la cuenta de dónde va cada
cosa y cuánto ocupa, y nada más. En Node no hay WebGL, así que **lo único que un
comprobador de esta casa puede mirar de una escena es la CUENTA** — y sólo si la
cuenta está en un sitio al que se pueda llamar. La de la cámara de mesa vive en
`paseo.ts` por lo mismo.

No es teoría: con la cuenta dentro del `useFrame`, el tablero salía al 110 % del
ancho del lienzo y el reloj se salía por abajo, con 22.000 comprobaciones de la
escena en verde encima. Todas miraban dónde cae cada cosa en el MUNDO; ninguna
miraba qué entra en el LIENZO.

---

## 10. La red

| Comprobador | Qué mira |
|---|---|
| `verify:lindes` | Las reglas: el reparto, los casamientos, las cuentas y una partida entera jugada de principio a fin |
| `verify:lindes-en-tres` | La traducción de la vista a la escena, desde Node |
| `verify:lindes-escena` | La geometría: que ni una cara del suelo mire hacia abajo, que las 24 losas por sus 4 giros casen celda a celda en la raya, que ningún muro parta una villa, que nada se plante en un camino, que el presupuesto se cumpla con los triángulos del `.glb`, y que el lobby se vea |
| `verify:lindes-escena`, el §del encuadre | Y lo que ENTRA en el lienzo, proyectado a mano: seis formas de tablero por seis de pantalla, que el tablero quepa entero y no se salga por el fondo, que los dos rincones quepan, no se pisen y se vean, y que la arena diga lo que queda de bolsa y nunca vuelva a subir |

Y los que ya existen y lo cogen solo: `verify:juegos`, `verify:mesa`,
`verify:procedencia`, `verify:pureza`, `verify:fronteras`, `oro:arcade`.
