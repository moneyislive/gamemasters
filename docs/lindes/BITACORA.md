# Bitácora de Las Lindes

**Para quien retome esto sin contexto** —incluido el temporizador de dos horas—:
esto dice dónde está el trabajo, qué queda y cuál es el siguiente paso. Se
actualiza al terminar cada capa, nunca al empezarla: una casilla marcada aquí
significa «escrito Y comprobado», y si no lo significa, esta bitácora miente y
deja de servir para lo único que sirve.

- **Árbol:** `C:\Users\QWERTY\Documents\GameMasters-lindes`
- **Rama:** `lindes`, nacida de `main` en `865135d` (la app 1.6.0, con El Burgo dentro).
- **Diseño:** `docs/lindes/DISENO.md`. Si algo de la bitácora no coincide con él, gana el diseño.
- **Batería:** `npm run verificar` desde la raíz del árbol. Nunca `| tail`: el
  código de salida es lo que manda.

## Estado

| Capa | Qué es | Estado |
|---|---|---|
| 0 | Árbol, rama, `node_modules`, CRLF normalizado, typecheck en verde | **hecho** |
| 1 | `docs/lindes/DISENO.md` — el plano | **hecho** |
| 2 | `shared/arcade/juegos/lindes-losas.ts` — las 24 losas y el reparto de 72 | **hecho** |
| 3 | `lindes-cosas.ts` y `lindes.ts` — reglas, reductor, opciones, proyección | **hecho** |
| 4 | El tablero declarado, dentro de `lindes.ts` | **hecho** |
| 5 | Alta en `shared/arcade/juegos/index.ts` | **hecho** |
| 6 | `server/scripts/verificar-lindes.ts` + entrada en la batería | **hecho** — 13.295 comprobaciones |
| 7 | `escenas/lindes/` — la losa en tres dimensiones, procedural | **hecho** |
| 8 | `shared/arcade/juegos/lindes-en-tres.ts` — vista ⇄ escena | **hecho** |
| 9 | `escritorio/src/lindes-en-tres.tsx` + fila en `pintores.ts` | **hecho**, con su hoja |
| 10 | `app/src/arcade/lindes-en-tres-escena.tsx` + fila en `pintados.ts` | **hecho** |
| 11 | El lobby propio (La Linde Alta) + fila en `escenas/embarcadero/tema.ts` | **hecho** |
| 12 | El paseo en primera y tercera persona sobre el tablero | **hecho** — mesa, hombro y ojos |
| 13 | El maestro de oro: `robot-de-las-lindes.ts` y `oro-arcade/lindes.json` | **hecho** |
| 14 | La pantalla del jugador: la losa de la mano y el reloj de la bolsa | **hecho** |
| 15 | `verify:mesa` juega a Las Lindes, con la bolsa vigilada | **hecho** — 94 revisiones |
| 16 | `npm run jugar:lindes` — una mesa entera POR EL CABLE, medida | **hecho** |
| 17 | Sentarse a una mesa de verdad y jugarla pulsando | **hecho** — tres fallos |
| 18 | Sentarse **en la app** y jugarla tocando | **hecho** — dos fallos más |
| 19 | Batería entera en verde | **hecho** — 86 de 86 |

## Siguiente paso

Lo que Miguel mire por la mañana. Lo que queda apuntado de mi parte está en
«Deudas apuntadas», y lo que hay que enseñarle, en «Lo que hay que mirar con ojos».

## Lo que hay que mirar con ojos

Una batería en verde no dice que se vea bien, y en esta capa eso ha vuelto a
demostrarse tres veces. Lo que hay que abrir y mirar:

- `escritorio/banco-lindes.html` — el tablero, la losa de la mano (abajo a la
  izquierda) y el reloj de la bolsa (abajo a la derecha). El botón «giro» tiene
  que dar un cuarto de vuelta a la losa de la mano, a la vista.
- `escritorio/banco-linde.html` — el lobby. Con cinco sentados se ven CUATRO
  aventureros y está bien: el quinto asiento del corro es desde donde se mira.
- Y lo que NO se ha podido mirar: el móvil de verdad. El panel del navegador
  informa siempre de una ventana de 1024 de ancho, así que lo que se ha medido
  del encuadre en pantalla estrecha es la ARITMÉTICA (que está en verde, en seis
  formas de pantalla) y no el píxel.

## Y dos más, que sólo se vieron sentándose EN LA APP

El escritorio ya estaba jugado y la batería en verde. La app nunca se había ejecutado — y
esta casa tiene escrito que ningún juego es sólo para PC.

### 4 · En la app NO SE PODÍA PONER UNA LOSA

O sea: no se podía jugar. El tablero se tocaba con `onClick`, y React Native Web llama a
`preventDefault` en el `pointerdown` para su propio sistema de gestos, así que el
navegador **nunca sintetiza el `click`**. Con ratón, en el escritorio, sí lo sintetiza: el
mismo código, el mismo servidor, dos resultados.

Y engañaba, porque los `pointermove` SÍ llegaban: al pasar por encima aparecía el fantasma
de la losa y el botón de girar se encendía. La pantalla respondía a todo menos a lo único
que importa.

`Lindes.tsx` era el **único** sitio de `escenas/` con `onClick`; las otras veintiuna asas
de la casa usan `onPointerDown`/`onPointerUp`. Ahora también, y con la distinción entre
toque y arrastre que el Burgo ya tenía: sin ella, girar la cámara con el dedo pondría una
losa en cada giro.

### 5 · Cada sitio donde plantar salía DOS veces

Las dos pantallas pintan dos tiras: la de SITIOS —cada cosa donde cabe un labriego, con
lo que valdría— y la de ACCIONES, que su propio comentario describe como «lo que no se
toca en el tablero: empezar, no plantar». Pero `acciones` trae todo lo que no sea poner
una losa, o sea también los plantados. **Seis chips donde había tres cosas**, la mitad con
su valor y la mitad sin él. En los dos clientes.

El tablero declarado tiene que seguir trayéndolos —un cliente sin el pintor de Las Lindes
sólo tiene eso, y sin ellos no podría plantar—, así que quien filtra es quien pinta las
dos tiras. Pero **cuál** filtrar es una regla, y los clientes de esta casa no saben
reglas: lo dice `accionesFueraDeLosSitios`, en `shared/`.

### Y la red, las dos probadas rompiendo lo que vigilan

- **`verify:escena`** barre los fuentes de `escenas/` y exige que ninguna escena use
  `onClick`. Con el `onClick` puesto: roja, y nombra el fichero.
- **`verify:lindes-en-tres`** exige las DOS mitades del reparto: que ningún sitio se
  repita como acción, y que el reparto no pierda ninguna. Lo segundo importa tanto como lo
  primero: un filtro que se comiera «No plantar» pasaría la primera mitad tan tranquilo y
  dejaría la pantalla sin la única manera de no plantar. Con el filtro roto: 252 rojas.

### Lo que la app enseñó del panel, y conviene saber

El panel del navegador **no entrega punteros de verdad al lienzo de la app**: el `hover` y
el `click` reales no llegan a la escena, aunque sí funcionan sobre los botones. Lo que sí
llega es un `PointerEvent` despachado a mano. O sea que para probar una escena 3D de la
app hay que hacerlo con punteros sintéticos, y conviene no confundir «no responde» con
«está roto»: el primer diagnóstico de esta noche fue equivocado por esto.

## Los tres fallos que sólo se vieron SENTÁNDOSE

Con la batería en 86 de 86, los dos bancos mirados y una mesa entera jugada por HTTP,
quedaba un camino sin recorrer: abrir la Sala, sentarse y jugar **pulsando**. Salieron
tres, y ninguno da un error en ninguna consola.

### 1 · El tablero en NUEVE PÍXELES

`.lindes-pantalla` medía 34 puntos de alto y el lienzo **566 × 9**. La cadena de seis
eslabones que reparte el alto desde la ventana hasta el recuadro termina, por selector
LITERAL, en `.burgo-en-tres` y `.burgo-lienzo`. El tercer pintor entró sin los suyos.

El comentario del Burgo lo avisaba dos mil líneas más arriba, palabra por palabra: «con
base cero un antepasado que no tenga alto que repartir dejaría el recuadro en cero
puntos y la mesa en negro, sin un error en ninguna consola».

**Por qué el banco no lo veía:** `banco-lindes.html` se pinta con `position: fixed;
inset: 0`, así que allí nunca falta alto. Un banco no es la pantalla.

### 2 · El raíl, DOS VECES en el árbol

`sala.tsx` pinta el raíl dentro del lienzo cuando hay lienzo, y en un `<aside>` cuando
no. Quién lo sabe es el pintor —puede caer al respaldo en mitad de su render— y lo avisa
llamando a `foco` con su recuadro. `LindesEnTres` ni recibía ese `foco`, así que la Sala
pintaba su `<aside>` **además** del que el propio pintor ya pintaba: dos regiones vivas
diciendo lo mismo, el código de la mesa repetido y **dos botones de «Tirar la mesa»**.

Y ese `<aside>` de más era también la causa del fallo 1: el grid de la pantalla declara
UNA fila, y el `<aside>` caía en una fila implícita que se llevaba el alto entero.
Medido: `grid-template-rows: 34px 888px`.

Arreglado y medido en pantalla: `.lindes-pantalla` de 34 a **922**, `aside.rail` de 1 a
**0**, «Tirar la mesa» de 2 a **1**.

### 3 · «Le toca a otro», dicho a quien le tocaba

Con la flecha del turno señalando mi propio asiento en el raíl y la losa en mi mano, el
panel de acciones decía «Le toca a otro. Cuando ponga su losa, te tocará a ti».

La causa: la lista de acciones se salta los `PONER` a propósito —no son botones, son
casillas del tablero—, así que sale vacía TAMBIÉN para quien tiene el turno, y el
respaldo de lista vacía sólo miraba si estaba vacía. Ahora dice **«Ponla en el tablero ·
Señala una casilla clara y tócala»**, y ninguna de las 13.295 comprobaciones del
reglamento lo veía porque todas miran QUÉ SE PUEDE HACER y ésta es una frase sobre quién
manda.

### Y lo que se deja puesto para que no vuelva

- **`verify:lindes`** comprueba ahora lo que el tablero LE DICE a cada cual, y no sólo lo
  que ofrece. Probada deshaciendo el arreglo: se pone roja con el mensaje exacto.
- **`verify:escritorio`** barre los fuentes, saca la clase de TODO recuadro que lleve
  `lienzo-propio` y le exige su eslabón. El cuarto pintor lo estrena en cuanto escriba su
  `<div className="lienzo-propio …">`. Probada quitando el eslabón de Las Lindes: roja.
- Y esa guardia **nació mal y hubo que rehacerla**: la primera versión montaba cada
  pintor con una vista fabricada para leerle la clase, y ningún pintor se monta con una
  vista que no es suya —caen al respaldo, que es correcto—, así que no inspeccionaba
  nada y pasaba en verde. Lo delató quitar el eslabón a mano. Lleva vacuna desde
  entonces: si el barrido se queda a cero, lo dice.

### Y después se jugó, pulsando

Losa colocada tocando el tablero, labriego plantado desde el raíl (7 → 6), revisión 4 y
turno al siguiente. Las dos ramas del mensaje del turno, vistas en el producto.

## Lo que pesa una mesa por el cable, que nadie había medido

`npm run jugar:lindes -- --servidor http://localhost:5174` juega una mesa entera
contra un servidor levantado, con los movimientos sacados del TABLERO QUE EL
SERVIDOR MANDÓ. Una partida de tres, medida:

- **105 vueltas**, terminada: 71 losas puestas, 23 labriegos plantados, 11 pasadas.
- Ni un 500, y **ni un botón que el servidor ofrezca y luego rechace** — que es lo
  más grave que ese guion puede encontrar, porque significaría que lo que se pinta
  y lo que se acepta no son la misma cosa.
- **La lectura más gorda: 85,1 kB.** Media 39,0 kB. **6,86 MB** en toda la partida.

### Y el peor momento NO es el final, que es lo que uno supondría

Medido vuelta a vuelta: el máximo cae con **69 losas puestas y 56 colocaciones
abiertas** —el tablero casi lleno y todavía con sitios donde cabe la losa— y son
**73,5 kB**. Con las 72 puestas no queda ni una colocación, las caras bajan de 125 a
72, y la vista se queda en **59,1 kB**. Medir sólo el final se habría dejado fuera el
caso peor por catorce kilobytes.

**Y lleva presupuesto**, en `verify:mesa`, como los triángulos de la escena: 96 kB
sobre los 74,2 que mide su partida, o sea un 30 % de holgura. Ni pegado —un tope al
8 % se pone rojo el día que alguien añada un campo legítimo, y entonces se sube sin
mirar, que es como un presupuesto deja de serlo— ni al doble, que sería no vigilar.

### Y de dónde sale ese peso

De la vista con el tablero lleno —59,1 kB sin los avisos—, repartida así:

| Qué | Cuánto | |
|---|---|---|
| `tablero` | 49,5 kB | **84 %** |
| `losas` | 7,4 kB | 12 % |
| `cobros` | 1,7 kB | 3 % |
| todo lo demás | 0,4 kB | 1 % |

Y dentro del tablero: `lineas` 32,8 kB (252 piezas), `caras` 13,7 kB (72), `nudos`
2,0 kB (16). **Las líneas no llevan texto**: son `id`, dos puntos, un color, un
grosor y un `toque`. Ahí no hay grasa que quitar.

### Y no es un fallo: es lo que se compró

Las Lindes declara `mueble: 'tablero'`, o sea el mueble GENÉRICO. Eso significa que
un cliente que no tenga el pintor de Las Lindes puede jugar igual, pintando el
tablero declarado — que es el §18 entero y la razón de que exista el tablero
declarado. El pintor propio de esta casa NO usa esas 49,5 kB: pinta con `losas`,
`plantados` y `colocaciones`, que son 7,6 kB.

O sea: **cuatro quintas partes de cada sondeo son el precio de que cualquiera pueda
jugar a esto sin saber a qué se juega.** Queda escrito para que la decisión de
cobrarlo o no la tome alguien mirando el número, y no por sorpresa un día con datos
móviles.

## Por qué el reloj de arena mide la BOLSA y no el turno

Miguel pidió «reloj de arena» entre los elementos de la pantalla del jugador.
Las Lindes declara `tickHz: 0`: no hay plazo de turno, no hay nada que el
servidor haga por nadie si tarda, y un reloj que contara el turno sería una
mentira muy bien pintada.

Lo que sí se acaba es la bolsa, y es lo que de verdad hay que ver de un vistazo:
la partida termina cuando sale la última losa, y cuánto queda decide si mandar un
labriego al prado —de donde no vuelve— o guardárselo. Estaba en el raíl como
«Quedan 38», que es un número que hay que leer y comparar con otro que no está en
ninguna parte.

Es el mismo `RelojDeArena` de Riberas y es también, como allí, el botón de pasar.
Lo que manda al tocarlo es LA MISMA acción que manda el botón de la tira, porque
se la pregunta a `shared/`: los clientes de esta casa no saben reglas.

**Con sus conos y no con `reloj.glb`, y está medido:** el modelo trae el color
horneado a vértice y horneado oscuro —la arena en `rgb(133, 74, 29)`, la madera
casi negra—, y sobre la mesa oscura de Las Lindes, a un 17 % del alto del lienzo,
es una silueta donde no se distingue cuánta arena queda. Contado sobre el lienzo
con la bolsa a dos tercios: **20 píxeles claros dentro de los bulbos con el
modelo, 3.539 con los conos**, y éstos repartidos arriba y abajo como toca. En
Riberas se ve bien porque allí vive en la barra, cerca del ojo y sobre madera
clara. Si algún día el modelo se hornea claro, volver a él es pasarle el
`modelo` y nada más.

## La losa mide 175, por decisión de Miguel

Se levantó a las 23:50 del 17-sep mirando el banco: con la losa en 22 unidades
las piezas del pack cabían pero no cabía una COMPOSICIÓN. Ocho veces el lado
—sesenta y cuatro veces el suelo— es lo que deja sitio para manzanas con calles,
murallas con torres y puertas, y campos partidos en parcelas con sus setos. El
presupuesto de triángulos sube a 2,5 millones por lo mismo, y lo que lo sostiene
es el nivel de detalle por distancia y no el número.

## Lo que ya se ha visto en el banco, y lo que costó

`http://localhost:5241/sala/banco-lindes.html?losas=16&jugadores=4&semilla=LINDE`

Cuatro fallos que no dan ningún error y sólo se ven mirando, los cuatro
apuntados en el código donde se arreglaron:

1. `<color attach="background">` dentro de un `<group>` no pinta el cielo: se
   engancha al grupo. El lienzo salía NEGRO con el tablero dentro.
2. Las caras de arriba del suelo iban con el orden de vértices al revés y
   miraban hacia abajo: el tablero salía con las casas flotando sobre el vacío.
3. La junta entre losas se le aplicaba a CADA rectángulo del suelo y no sólo al
   borde de la losa: abría rendijas por las que se veía la mesa, y desde arriba
   el tablero salía rayado.
4. Un `<instancedMesh>` con el material como HIJO en vez de en `args` nace sin
   material: veintiséis labriegos plantados en el estado y ninguno a la vista.

Y tres más de la noche del 17 al 18, los tres de ENCUADRE y no de geometría, que
es por lo que ninguna de las 22.000 comprobaciones de la escena los veía —todas
miraban dónde cae cada cosa en el mundo, ninguna miraba qué entra en el lienzo—:

5. `camaraDeMesa` despejaba la distancia en el CENTRO del tablero, y lo que se
   sale es el canto de acá: está más cerca y se proyecta más ancho. El tablero
   salía al **110 % del ancho** del banco, con los dos cantos cortados.
6. El plano de fondo (`far`) lo escribía a mano quien monta la escena. Con un
   tablero largo en una pantalla estrecha la cámara se va a cuatro mil y la
   esquina de allá queda a **seis mil trescientos**: detrás del fondo. El tablero
   entero desaparecía, se veía cielo, y no había un solo error en la consola.
7. El reloj de arena colocado con el alto de los CONOS del respaldo (0,82 lados)
   se salía por abajo en cuanto llegaba el `.glb`, que mide un lado entero. Un
   fallo que sólo aparece cuando todo va bien.

Y el banco mentía dos veces: se paraba justo al PONER una losa —o sea con la mano
vacía, sin fantasma y sin huecos: la mitad de la pantalla del jugador imposible de
mirar en el banco que está para mirarla— y le juraba a la escena que la ventana
seguía siendo la del arranque.

**Lo que cambió para poder verlos:** la aritmética salió de los `useFrame`.
`escenas/lindes/rincones.ts` y `camaraDeMesa` son cuentas sin `three`, así que un
comprobador de Node puede proyectar a mano y preguntar si lo que tiene que verse
cae entre menos uno y uno. Son 132 comprobaciones nuevas: seis formas de tablero
por seis de pantalla, más los dos rincones.

## Lo medido hasta aquí

- `verify:lindes`: 13.295 comprobaciones en verde. Diez partidas enteras, 709
  losas puestas, 397 labriegos plantados; se cerraron 62 villas, 66 sendas y 20
  ermitas, y 35 prados cobraron al final.
- `verify:mesa`: Las Lindes se juega ENTERA con el árbitro de la mesa —94
  revisiones, 71 losas puestas, 14 labriegos plantados, 7 veces sin plantar— y en
  cada revisión se comprueba que ni la bolsa ni la semilla salen por ninguna vista
  ni por ninguna opción. Con vacuna: se exige que `loSecreto` declare más de 60
  cosas, porque una lista vacía daría verde sin mirar nada.
- `verify:escena`: 17 comprobaciones nuevas del montaje del reloj, con un `.glb`
  fabricado torcido a propósito. Cazaron un fallo que llevaba dentro de Riberas
  desde que se escribió.
- Sin tocar el núcleo: `verify:nucleo-quieto`, `verify:pureza`, `verify:fronteras`,
  `verify:procedencia`, `verify:marcador`, `verify:mesa`, `verify:larga`,
  `verify:determinismo` y `oro:arcade` siguen en verde con el séptimo arcade dado
  de alta.

## Deudas apuntadas

- ~~`oro:arcade` todavía no juega a Las Lindes.~~ **Saldada.** `oro-arcade/lindes.json`
  está capturado y en verde, y lo juega `robot-de-las-lindes.ts`.
- **`verify:determinismo` sigue sin jugar a Las Lindes, y se deja a propósito.**
  Ese comprobador mide que dos servidores con el mismo estado y el mismo
  movimiento lleguen al mismo sitio, y lo hace con los juegos que reparten algo
  por `azar` en el CLIENTE. Las Lindes es `sede: 'servidor'` y su único azar —el
  reparto de la bolsa— vive en el reductor, que ya está congelado por el maestro
  de oro movimiento a movimiento. Meterlo no compraría nada que no esté comprado.
  Queda escrito para que el siguiente no tenga que volver a deducirlo.
- ~~El móvil de verdad, sin mirar.~~ **Saldada.** El banco se pone del tamaño del
  lienzo —`móvil con hoja` (390×584, que es el de verdad en la app), `móvil de pie`,
  `móvil tumbado` y `tableta`— porque lo que la escena mide es el LIENZO y no la
  ventana. Mirado en los dos móviles: el tablero entra entero, la losa de la mano
  entra entera y el reloj entra entero.
- **`jugar:lindes` no está en la batería.** Necesita un servidor levantado y hoy se
  le pasa por `--servidor`. `verify:mesa` ya cubre la superficie HTTP genérica y
  juega Las Lindes entera con el árbitro, así que el hueco que quedaría es sólo el
  PESO —y eso, hoy, está medido a mano y escrito arriba. Meterlo pide que se levante
  su propio servidor, como hace `jugar:fondo`; es barato y no está hecho.
- **La arena de `reloj.glb` no se ve en la escena de Las Lindes.** Se ha decidido
  usar los conos y está explicado arriba, pero el porqué de fondo —que el horneado
  de ese modelo sea tan oscuro— igual conviene mirarlo también del lado de
  Riberas, que usa el mismo fichero.

## Lo que NO se hace, y por qué

- **IR Engine no entra.** El §2.1 de `docs/MOTOR-DE-ARCADE.md` lo descarta por
  tres bloqueos independientes, y el primero es legal: CPAL-1.0 §15 cuenta
  servir por red como distribuir, así que desplegar en Render obligaría a
  publicar GameMasters entero. El paseo en primera y tercera persona se hace con
  la capa 3D que esta casa ya tiene (`@react-three/fiber` + `three`), que es la
  misma con la que andan los aventureros de El Muelle y de La Plaza.
- **Ni la palabra ni el arte del juego del que salen estas reglas.** Las reglas
  y el reparto de losas no son objeto de copyright; el nombre y el dibujo sí.
  Ver el §0 del diseño.
