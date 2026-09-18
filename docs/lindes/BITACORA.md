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
| 15 | Batería entera en verde | **hecho** — 86 de 86 |

## Siguiente paso

Lo que Miguel mire por la mañana. Lo que queda apuntado de mi parte está en
«Deudas apuntadas», y lo que hay que enseñarle, en «Lo que hay que mirar con ojos».

## Lo que hay que mirar con ojos

Una batería en verde no dice que se vea bien, y en esta capa eso ha vuelto a
demostrarse tres veces. Lo que hay que abrir y mirar:

- `escritorio/banco-lindes.html` — el tablero, la losa de la mano (abajo a la
  izquierda) y el reloj de la bolsa (abajo a la derecha). El botón «giro» tiene
  que dar un cuarto de vuelta a la losa de la mano, a la vista.
- `escritorio/banco-linde.html` — el lobby.
- Y lo que NO se ha podido mirar: el móvil de verdad. El panel del navegador
  informa siempre de una ventana de 1024 de ancho, así que lo que se ha medido
  del encuadre en pantalla estrecha es la ARITMÉTICA (que está en verde, en seis
  formas de pantalla) y no el píxel.

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
- **El móvil de verdad, sin mirar.** Ver arriba: el panel del navegador no deja
  emular una ventana estrecha de verdad. La aritmética del encuadre está medida
  en seis formas de pantalla; los píxeles de un teléfono, no.
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
