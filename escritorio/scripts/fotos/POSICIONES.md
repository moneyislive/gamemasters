# Las posiciones del protocolo de fotos de la ciudad

Las 17 posiciones fijas con las que se juzga el detalle de la ciudad de El Quiebro (plan del detalle, §8). Las
fijó O1-FOTOS el 25-sep mirando cada foto en el banco de la ciudad abierta (traza 0, K7M2P, noche 1, `d4402d0`
más O1-FOTOS). `protocolo.sh` lee de aquí la base y el bloque de posiciones: cambiar una posición es cambiarla
AQUÍ, y a partir de ahí las tandas nuevas no se comparan con las viejas en esa letra.

## Cómo se sacan

```bash
# desde bash (en PowerShell `PUERTO=…` delante de una orden no pone nada)
PUERTO=5315 bash escritorio/scripts/fotos/protocolo.sh <scratchpad>/detalle/fotos/antes            # las 76
PUERTO=5315 bash escritorio/scripts/fotos/protocolo.sh <carpeta> --solo A,C,E --tomas 2 --edge 2   # un paquete
node escritorio/scripts/fotos/hoja.mjs <antes> <despues> --hoja <hoja.png>                         # la hoja
node escritorio/scripts/fotos/hoja.mjs <toma1> <despues> --ruido <toma2>                           # contra el ruido
node escritorio/scripts/fotos/hoja.mjs --recentrado <tanda> --ruido <otra toma de la tanda>          # la P (abajo)
node escritorio/scripts/fotos/hoja.mjs --niveles <tanda> --antes <antes> --hoja <hoja.png>          # N3 contra N1
```

La hoja sale con 0 si todo cabe, 1 si algo falla, 2 si no se puede mirar y **3 si sólo hay negro o magenta
HEREDADOS**: el negro puro ≥ 0,5 %, o el magenta saturado, que la MISMA foto de la tanda «antes» ya tenía y en los
mismos píxeles (acta del plan, §13, decisión 3, y remate de la 1b; ver «El negro y el magenta», abajo). Con dos
tandas, «antes» es la primera; con `--niveles` y `--recentrado` hay que darle `--antes <tanda «antes»>`, y sin él
todo negro y todo magenta cuentan como nuevos. Con `--antes`, cada foto se juzga SÓLO contra su foto de «antes» (la
N3 contra la N3 de «antes», no contra la N1 de su tanda).

`--niveles` empareja dentro de una tanda cada `X-…-n1-<luz>….png` con su `X-…-n3-<luz>….png` y juzga el criterio
«N3 contra N1» de §8: ≥ 12 % de píxeles que cambian en A-D y O, ≥ 5 % en E-G (las demás letras se miden y no se
juzgan). En la tanda «antes» (25-sep, ola 1a integrada, `reloj=55`, con la E movida en el remate de la 1b) se quedan
por debajo **4 de los 16** pares con umbral: B de madrugada 8,9 %, D al alba 8,6 %, O 6,3 % (alba) y 12,0 %
(madrugada, 11,99). Es lo que el plan quiere subir, no un fallo de la hoja. La E, en su posición nueva, cumple:
9,7 % de madrugada y 8,7 % al alba (en la vieja, 4,2 % de madrugada; no se comparan).

**OJO: esos números NO se comparan con los de la tanda del 25-sep sin reloj** (13 de 16 por debajo, A-D y O en
3,5-11,2 %). Aquella retrataba N3 casi siempre **con las luces de verdad APAGADAS**: sin `reloj=` las luces eligen y
se funden con el `dt`, y en Edge sin ventana la foto sale antes de que se enciendan (en tres tomas de A, C y E de N3
sin reloj, la A y la E salieron las tres sin ellas y la C, una de tres con ellas). Con `reloj=` se encienden siempre,
y N3 se separa más de N1: A de madrugada pasa de 6,2 % a 19,1 %, C de 5,7 % a 18,5 % y E de 2,8 % a 4,2 % (las
mismas fotos, sin y con reloj; la E, en su posición de antes del remate de la 1b). Parte del «N3 contra N1» es,
pues, el brillo de esas luces en el suelo mojado.

`PUERTO` es el del vite de TU worktree: `foto.sh` pregunta al banco de ese puerto de qué carpeta sale y se niega
si no es la suya. `protocolo.sh --lista` dice qué fotos sacaría sin sacarlas.

## La base

`protocolo.sh` lee la línea `BASE=`. Cada foto le añade `&nivel=N&luz=madrugada|alba&pos=…` y lo de su posición.
Un parámetro de la posición que ya esté en la base (la `lluvia=1` de la R) SUSTITUYE al de la base: el banco lee
el primero de dos iguales, y `foto.sh` se niega a sacar una foto con un parámetro repetido.

**`reloj=55` ESTÁ en la base** desde la ola 1b (acta del plan, §13, decisión 2). `reloj=T` para el reloj del adorno
en T segundos (parpadeos, vapor, glifos, charcos, cielo y el tic del tren, `20 T`) y, desde la 1b, ASIENTA las luces
de verdad de N2-N3 (`atmosfera/luz.ts` con paso fijo; sin `reloj=` van con el `dt` de los fotogramas, como en el
juego). Lo que eso quita del ruido, en «El ruido», abajo.

**Por qué 55.** Con la traza 0, K7M2P y noche 1, el tren del Elevado sale por `x = 290` hacia el oeste en el tic
`1.050` de cada ciclo de 1.200 (`trenEnLaCiudad`: desfase de 150 tics, 0,8 m por tic). Con `T = 55` (tic 1.100) va
ENTERO entre `x = 250` y `x = 286`, delante de la M (la cámara en `x ≈ 237` mirando al este): la foto de la salida
del Elevado enseña el tren, que es una de las cosas que hay que mirar en ella. Con otra T (la 20 de las pruebas del
25-sep) está a 350 m, fuera de toda foto. Cambiar la T es cambiar todas las fotos: las tandas con otra T no se
comparan con la «antes».

BASE=ciudad=abierta&traza=0&codigo=K7M2P&noche=1&montar=1&lluvia=0&panel=0&reloj=55

## Las posiciones

`pos = x, y, z, rumbo, cabeceo`: metros y radianes; rumbo 0 = norte (−z), crece hacia el este; cabeceo negativo
mira abajo. Con la cámara al hombro (lo de siempre) `pos` es el MUÑECO: la cámara va 3,2 m detrás, 0,55 m a su
derecha y a unos 2,6 m de alto. Con `camara=libre`, la cámara está en `pos`.

| | Nombre | pos (+ extra) | Estado | Qué hay que mirar |
|---|---|---|---|---|
| A | banco-2m | `9,1.7,19,0,-0.3` | verificada (plan) | Listones y costados de fundición, veta y desgaste en chaflanes; la baldosa; la farola de plaza. |
| B | coche-3m | `-7.2,1.7,24.6,-0.95,-0.35` | verificada (plan) | Carrocería, pasos de rueda, llanta, sin franja punteada, suciedad baja, el coche de lo cercano en N3. |
| C | fachada-5m | `17.5,1.7,9.5,1.0,-0.15` | verificada (plan) | Relieve de la fábrica bajo la farola, zócalo, chorretones, bajo hundido y cantoneras. |
| D | cruce-neones-8m | `14,1.7,21,1.9,-0.1` | verificada (plan) | Tubo y variedad de rótulos, halo con forma, tarjetas en el charco, semáforo, placa. |
| E | calle-25m | `23.4,1.7,50,0,0.2` | **movida** (remate de la 1b) | Ritmo y cornisas en las dos aceras, asfalto, luces lejanas al fondo. Aquí NO hay balcones (esos edificios no los llevan): los balcones se miran en C, J, O y G. |
| F | callejón-plaza-25m | `0,1.7,45,0,-0.05` | verificada (plan) | Losas del callejón, la plaza al alba, la fuente. |
| G | pájaro-40m | `0,40,20,0.6,-0.5` + `camara=libre` | verificada (plan) | Azoteas, cornisas, remates, la plaza desde la Bajada, repetición del grano. |
| H | taxi-3m | `20.3,1.7,-0.8,0.63,-0.3` | verificada (plan) | Estribo, ruedas, faros, banda del taxi. |
| I | bajo-2m | `27.5,1.7,-45,1.571,-0.1` | **fijada** | El Horno San Blas de frente: escaparate encendido entre dos persianas, rótulo, machones. |
| J | aceras-n1 | `23,1.7,-45,0,-0.05` | **fijada** | La calle `x = 24`, que es la raya entre la celda del centro de la ventana (a la izquierda) y la de al lado (a la derecha). Hoy en N1 la izquierda tiene balcones y la derecha no. |
| K | azoteas-40m | `48,40,-34,-0.8,-0.6` + `camara=libre` | **fijada** (rumbo) | Tres manzanas de azoteas hacia el noroeste, de cerca a 60 m, con la calle entre ellas. |
| L | pájaro-150m | `0,150,20,0.6,-0.42` + `camara=libre` | **fijada** (cabeceo) | El skyline entero con cielo encima, y debajo las calles de la ciudad y el suelo de fuera al pie de las torres. |
| M | salida-Elevado | `240,1.7,-114,1.571,0.05` | **fijada** | El Elevado hacia el canto este: viga con su franja de luz, pilares, la cortina de glifos al fondo. |
| N | cruce-cenital-28m | `24,28,35,0,-1.2` + `camara=libre` | **mirada, sin cambio** | El cruce de `(24, 24)` en el centro, con sus cuatro cebras, las tapas y la rigola. |
| O | ladrillo-2m | `20.5,1.7,-52,-1.571,0.1` | **fijada** | La fábrica de ladrillo de la Taberna el Farol a 2 m: machones, el paño sobre las persianas, la línea de balcones. |
| P | recentrado | `24,1.7,-32.2,0,-0.05` + `ventana=0,0` (antes) o `ventana=0,-48` (después) | **fijada** | Mirando al norte por la calle `x = 24`, con la cámara 5 m dentro de la celda de al lado. |
| R | vado-lluvia | `24,1.7,-30,0,-0.35` + `lluvia=1` | **fijada** | La cebra del norte del cruce `(24, −24)`, con sus dos bocas contra el bordillo a 2-5 m, lloviendo. |

<!-- protocolo:inicio -->
```text
A|banco-2m|9,1.7,19,0,-0.3||
B|coche-3m|-7.2,1.7,24.6,-0.95,-0.35||
C|fachada-5m|17.5,1.7,9.5,1.0,-0.15||
D|cruce-neones-8m|14,1.7,21,1.9,-0.1||
E|calle-25m|23.4,1.7,50,0,0.2||
F|callejon-plaza-25m|0,1.7,45,0,-0.05||
G|pajaro-40m|0,40,20,0.6,-0.5|&camara=libre|
H|taxi-3m|20.3,1.7,-0.8,0.63,-0.3||
I|bajo-2m|27.5,1.7,-45,1.571,-0.1||
J|aceras-n1|23,1.7,-45,0,-0.05||
K|azoteas-40m|48,40,-34,-0.8,-0.6|&camara=libre|
L|pajaro-150m|0,150,20,0.6,-0.42|&camara=libre|
M|salida-elevado|240,1.7,-114,1.571,0.05||
N|cruce-cenital-28m|24,28,35,0,-1.2|&camara=libre|
O|ladrillo-2m|20.5,1.7,-52,-1.571,0.1||
P|recentrado|24,1.7,-32.2,0,-0.05||antes:&ventana=0,0;despues:&ventana=0,-48;mascara40:&ventana=0,0&mascara=40
R|vado-lluvia|24,1.7,-30,0,-0.35|&lluvia=1|
```
<!-- protocolo:fin -->

Formato: `LETRA|nombre del fichero|pos|extra|variantes`. Las variantes (sólo la P) son `nombre:parámetros`
separadas por `;`, y cada una es una foto aparte con `-<nombre>` en el fichero.

## Por qué cada una está donde está

- **E (calle-25m).** MOVIDA en el remate de la 1b (decisión del coordinador): en `16,5, 40, 0, −0,03` (la del
  plan) la cámara iba pegada a la fachada de la izquierda, medio encuadre era muro de canto a menos de un metro y no
  se veía la acera izquierda (§8 pide «ritmo y cornisas en las dos aceras»). Es la misma calle, `x = 24` (la raya
  entre las celdas `i = 0` e `i = 1`, 12 m: aceras de 3 y calzada de 6), mirando al norte hacia el cruce `(24, 24)`,
  pero con la cámara en el EJE de la calzada: el muñeco en `x = 23,4` deja la cámara (0,55 m a su derecha) en
  `x = 23,95`, y 3,2 m detrás, en `z = 53,2`. Probadas con fotos `z = 45, 50, 55, 60 y 62,5` y cabeceos de
  `−0,03` a `+0,28`: en 45, 55 y 60 un coche aparcado tapa el primer término; en 62,5 la cámara queda a 29,8 m del
  centro de la ventana, al filo de la holgura de 30 m que la recentra (ver la P). En `z = 50` no hay nada en el primer
  término (los dos coches aparcados del carril izquierdo quedan a media distancia, delante del cruce) y se ven las
  DOS aceras enteras, las dos fachadas de 3 a 25 m, los edificios del otro lado del cruce
  y las torres del fondo. El cabeceo `+0,2` (mirar un poco ARRIBA) es por las cornisas: con `−0,03` las fachadas de
  primer término se cortan en el segundo piso; con `+0,2` suben hasta el borde de arriba de la foto, salen enteras
  las del otro lado del cruce, y el asfalto sigue saliendo desde unos 6 m.
  La ventana es la de antes, `(0, 48)` (`montar=1` la monta donde el muñeco, `x = 23,4`: celda `i = 0`; mirado en el
  DOM): la acera OESTE (izquierda) es la celda del centro y la este no, y en N1 sólo la izquierda lleva relieve
  (`relieveSoloEnElCentro`, como en la J). OJO: la cámara está a 5 cm de la raya; con el muñeco en `x ≥ 24` la
  ventana salta a `(48, 48)` y la foto es otra. Las siete fotos E de la tanda «antes» (y su segunda toma) se
  rehicieron con esta posición y la base de siempre, en el árbol de la tanda (sin el cambio de sombras del remate):
  no se comparan con fotos E de antes del remate. Su ruido, en `antes/hojas/ruido-E.txt`: 0-19 píxeles de un nivel,
  `dif` 0,00. Y ya no pasa del tope de negro: 0,21-0,27 % de madrugada (el coche que lo daba ya no está a su lado).
- **I (bajo-2m).** En `27.8, −10` (lo del plan) no hay tienda: la cámara miraba un muro ciego. El bajo con más
  oficio a mano es el Horno San Blas, en la acera este de la calle `x = 24`: escaparate encendido con estantes y
  dos persianas con pintadas a los lados. El Bar la Esquina (`−20.5, −40`, al este) también vale, pero tiene un
  coche aparcado delante que tapa medio escaparate.
- **J (aceras-n1).** En `0, −20` la acera sur es la Glorieta: no hay dos aceras con fachada. La raya de dos celdas
  con edificios a los dos lados más cerca del centro es la calle `x = 24` entre `z = −24` y `z = −72`. Con la
  cámara en `x = 23,55` la ventana se centra en `(0, −48)`: la acera oeste es la celda del centro (en N1, con
  relieve) y la este no. OJO: con `x = 24` exacto el centro salta a `x = 48` (`Math.round(0,5)`), y la foto sería
  otra.
- **K (azoteas-40m).** De los cuatro rumbos diagonales, el noroeste (`−0.8`) llena el encuadre de azoteas a
  15-60 m; el sureste y el suroeste se comen media foto con la plaza o una sola azotea.
- **L (pájaro-150m).** Con `−0.35` el suelo de dentro casi no sale; con `−0.5` el skyline queda arriba del todo. Con
  `−0.42` salen las torres enteras con cielo encima, su pie y las calles encendidas debajo.
- **M (salida-Elevado).** En `246, 1.7, −120` (lo del plan) el muñeco está en la mediana y la cámara mira un pilar a
  un metro. Seis metros al sur (la calzada) y seis al oeste se ven la viga con la franja, tres pilares y la cortina.
- **N (cruce-cenital).** Mirada: el cruce `(24, 24)` queda en el centro con sus cuatro cebras. Sin cambio.
- **O (ladrillo-2m).** La fábrica de ladrillo más limpia a pie de calle es la de la Taberna el Farol, en la acera
  oeste de la calle `x = 24` (machones anchos y paño corrido encima de las persianas). En `20.5, −45` (lo del plan)
  la cámara mira ese paño con el cabeceo del plan (`−0.1`): media foto es acera, del ladrillo sólo salen los
  machones entre persianas, y el rótulo de la taberna queda en el canto izquierdo. Más al sur (`z = −38`) el rótulo
  cae en medio y su halo morado lava el ladrillo: se juzgaría el neón, no la fábrica. Siete metros al NORTE
  (`z = −52`) el paño queda sin rótulo ni halo, con machones anchos, y con el cabeceo `+0.1` entra la línea de
  balcones: el ladrillo es más de la mitad de la foto. La ventana es la misma en los dos sitios (`0, −48`, con la
  pared en la celda del centro), así que el cambio no mueve lo que N1 pinta con relieve.
- **P (recentrado).** En `0, −29` (lo del plan) el muñeco está bajo un soportal mirando una pared a 3 m. La calle
  norte-sur más cercana es `x = 24`. La ventana se recentra cuando la CÁMARA (no el muñeco) pasa de 30 m del
  centro (`HOLGURA_DEL_RECENTRADO`, `ventana.ts:47`), y la cámara va 3,2 m detrás: con el muñeco en `z = −32,2`
  la cámara queda en `(24,55, −29,0)`, 5 m dentro de la celda `j = −1` y a 29 m del centro `(0, 0)`, así que las
  dos ventanas, la de antes (`0, 0`) y la de después (`0, −48`), se sostienen con la cámara quieta. `foto.sh`
  comprueba en el DOM de cada foto que la ventana pintada es la pedida.
  **Hoy ya enseña el salto:** en N1 la ventana de después pone balcones y cornisa en el edificio de la izquierda,
  a 2-20 m (es `relieveSoloEnElCentro`, lo que O3-SILUETA quita).
- **R (vado-lluvia).** Las cebras de la traza 0 están pegadas a los cruces. La de la calle `x = 24` al norte del
  cruce `(24, −24)` queda bajo la cámara con sus dos bocas contra los bordillos, que es donde O2-SUELO pone las
  rampas. Con `lluvia=1` (y sin `panel`).
  **Su ventana se centra en `(48, −48)`, no en `(0, −48)`.** `montar=1` la monta donde está el muñeco, `(24, −30)`:
  `x = 24` es justo la raya entre las celdas `i = 0` e `i = 1`, y `Math.round(0,5)` redondea hacia arriba (lo mismo
  que avisa la J). La cámara, 0,55 m a la derecha del muñeco, queda en `(24,55, −27)`, dentro de la misma, así que
  no se recentra. La cebra está en el canto OESTE de la celda del centro: en N1, lo que tiene relieve es la acera
  este de la calle (la celda `48, −48`) y no la oeste. Quien mueva la R medio metro al oeste cambia de ventana, y
  la foto es otra.

## La P y su máscara

La tanda saca, para cada nivel de la P, la foto de antes, la de después y `P-recentrado-nN-madrugada-mascara40.png`:
el banco con `mascara=40` pinta en blanco lo que está a menos de 40 m de la cámara. Así se mira el criterio «a menos
de 40 m no cambia nada» (§8):

```bash
# en una tanda, cada P de antes contra la de después, sólo a menos de 40 m, y contra el ruido de dos tomas
node escritorio/scripts/fotos/hoja.mjs --recentrado <tanda>/toma1 --ruido <tanda>/toma2 --exigir-ruido
```

La hoja empareja `P-recentrado-nN-madrugada-antes.png` con `…-despues.png` y cuenta sólo lo blanco de
`…-mascara40.png`; sin máscara sale con 2. Con dos tandas (`hoja.mjs ANTES DESPUES --profundidad`) usa la máscara
de la foto que la tenga, de después o de antes.

## El ruido

### Con la base de hoy (`reloj=55`, luces asentadas): tres tomas, 25-sep, ola 1b

A, C y E de madrugada en N1, N2 y N3, **tres tomas** de cada una, sin `reloj=` y con `reloj=55`, en la misma corrida
(dos Edge; el árbol de la ola 1a integrada más O1B-FOTOS; la E, en su posición de antes del remate). Por foto, las
tres parejas (1-2, 1-3, 2-3): `dif` y, entre paréntesis, cuántos PÍXELES cambian algo (no el % de más de 12: aquí
importa si son iguales byte a byte).

| | sin reloj: N1 | N2 | N3 | con `reloj=55`: N1 | N2 | N3 |
|---|---|---|---|---|---|---|
| A | 0,00 (58-257 px, de 1) | **1,40-4,31** (hasta 10,0 % > 12) | 0,00 (1-142 px, de 1) | **0 px** | **0 px** | 0,00 (1-2 px, de 1) |
| C | **0 px** | **0,00-1,49** (4,8 % > 12) | **0,00-6,16** (10,7 % > 12) | **0 px** | **0 px** | 0,00 (0-9 px, de 1) |
| E | 0,00 (0-275 px, hasta 3) | 0,00 (4-154 px, de 1) | 0,00 (1-2 px) | **0 px** | **0 px** | 0,00 (0-1 px, de 1) |

- **Con la base, el ruido de A, C y E es CERO en la práctica: `dif` 0,00, y casi siempre byte a byte.** En esta
  corrida las 18 parejas de N1 y N2 salieron byte a byte, y en N3 se quedaron en 0-9 píxeles que cambian UN nivel de
  255 (`dif` 0,0000). Byte a byte NO está garantizado, tampoco en N1 ni en N2: en las dos tomas de la tanda «antes»
  (abajo), la A de N1 de madrugada dio 56 píxeles de un nivel, y en la repetición de la revisión (dos tomas con
  `reloj=55`) la C de N2 dio 58 píxeles de un nivel, la A de N3 15 y la C de N3 9. La `dif` no se mueve de 0,00.
  Con la base, cuenten con que entre dos tomas cualesquiera cambien de 0 a ~60 píxeles, casi todos de un nivel y alguno de hasta
  14; `dif` 0,00 (las dos tomas de la tanda «antes», abajo: la G de N1 de madrugada tiene 44 píxeles distintos y
  alguno cambia 14 niveles; la H de N3 de madrugada, 13).
- **Sin reloj, N1 NO sale idéntica byte a byte** (lo que decía esta página el 25-sep era inexacto: la `dif` redondeaba a
  0,00): en A y E cambian 58-275 píxeles, casi todos en un nivel y alguno en tres (los parpadeos y los glifos, que van
  con el reloj del lienzo). Con `reloj=55`, cero en esas tres tomas.
- **Sin reloj, N2 y N3 tienen ruido de verdad** (hasta 4,31 y 6,16 de `dif`): las bocanadas de vapor (desde N2, con el
  reloj) y las luces de verdad (4 en N2, 6 en N3, con el `dt`). Qué pareja sale mal es cosa del azar: la C de N3 dio
  0,00 en una pareja y 6,16 en las otras dos. Con dos tomas se subestima.
- Lo que hizo falta, además del reloj: **asentar las luces de verdad** (`atmosfera/luz.ts`). Sin `reloj=` eligen las
  farolas más cercanas a un punto 8 m por delante de la cámara cada 0,3 s de `dt` y se encienden con un fundido de
  `dt × 4`: el `dt` es lo que tarde Edge en pintar cada fotograma, y una toma podía salir con una luz a medio fundir,
  en otra farola o apagada (ver «N3 contra N1», arriba). Con `reloj=`, el banco les pone un paso fijo de 0,3 s
  (`fijarElPasoDeLasLuces`): cada fotograma elige y el fundido llega entero, y en dos fotogramas están en su sitio.
  El juego no lo ve: sin `reloj=` el paso es
  `null` y `actualizar` usa el `dt` como siempre (probado: 12.000 fotogramas con `dt` al azar dan las mismas luces, bit
  a bit, con la `luz.ts` de antes y la de ahora). El DOM del banco lo dice (`data-luces`), y `foto.sh` tira una foto
  con `reloj=` cuyas luces no lo digan.

### Lo medido antes (25-sep, `d4402d0`, sin luces asentadas), con sus correcciones

Lo que sigue es la historia, para quien compare con fotos de entonces (la E, en su posición de antes del remate).
**Tres frases de aquí eran inexactas** y van tachadas en el texto con su corrección.

Con la consulta de entonces (con lluvia y panel; la máscara `panel` quita 0-545 × 0-145): A, C y E en N1 dieron `dif`
0,00 (~~idénticas byte a byte~~: **no lo eran**, ver la tabla de arriba, «sin reloj»); en N3, A da `dif` 3,07 (7,4 % de
píxeles cambian) y C 4,67 (9,7 %); E, 0,00.

Con la base (`lluvia=0 panel=0`), `protocolo.sh --solo A,C,E --tomas 2`, 18 pares:

| | N0 madr. | N1 madr. | N1 alba | N1 móvil | N2 madr. | N3 madr. | N3 alba |
|---|---|---|---|---|---|---|---|
| A | 0,00 | 0,00 | 0,00 | 0,00 | — | 2,81 (6,8 %) | 0,00 |
| C | — | 0,00 | 0,00 | — | 4,89 (8,3 %) | 4,27 (8,9 %) | 0,00 |
| E | 0,00 | 0,00 | 0,00 | 0,00 | 0,74 (1,0 %) | 0,40 (0,5 %) | 0,09 (0,0 %) |

Quitar la lluvia NO quita el ruido de N2-N3 de madrugada. Con dos tomas el ruido se subestima: la E de N3, que dio
0,00 entre las dos tomas de antes, dio 0,40 en otra pareja. Para decidir «≤ ruido» en N2-N3 de madrugada hacen
falta tres tomas o mirar la hoja.

**Con el reloj parado (`reloj=20`), 25-sep.** Dos tomas de A, C y E de madrugada en N1, N2 y N3, sin y con
`reloj=20`, en la misma corrida (tres Edge; `dif` y, entre paréntesis, el % de píxeles que cambian):

| | N1 sin | N1 con | N2 sin | N2 con | N3 sin | N3 con |
|---|---|---|---|---|---|---|
| A | 0,00 | 0,00 | 5,51 (12,0 %) | **0,00** | 4,90 (11,0 %) | 2,81 (6,8 %) |
| C | 0,00 | 0,00 | 3,40 (6,9 %) | **0,00** | 0,00 | 4,27 (8,9 %) |
| E | 0,00 | 0,00 | 0,00 | 0,40 (0,4 %) | 0,00 | 0,00 |

- **En N2 baja**: el ruido de A y C era sobre todo el reloj (las bocanadas de VAPOR de `vapor.ts`, desde N2, y los
  parpadeos), ~~y con `reloj=` se va entero~~: **no entero**. N2 tiene 4 luces de verdad, y su sorteo de farolas y su
  fundido con el `dt` seguían con `reloj=` (la E de N2 con reloj, 0,40, es eso). Lo quita el asentado de la ola 1b.
- **En N3 NO baja.** Lo que cambia entre tomas con el reloj parado son **charcos de luz enteros** en el suelo y en
  las fachadas (la lupa de diferencias los pinta como manchas redondas bajo las farolas): son las LUCES DE VERDAD
  (`LucesDeLaNoche`, `atmosfera/luz.ts`: 4 en N2 y 6 en N3), que cada 0,3 s eligen las farolas más cercanas a un
  punto 8 m por delante de la cámara y se encienden con un fundido de `dt × 4`. Las mueve el `dt` de los fotogramas
  (lo que Edge sin ventana tarde en pintar cada uno), no el reloj del adorno, y `reloj=` no las toca. La E de N2
  con reloj (0,40) es lo mismo: un charco de luz al pie de la fachada izquierda. Lo arregla la ola 1b (arriba):
  con `reloj=` el banco asienta las luces.
- ~~Con reloj y sin él, N1 sale idéntica byte a byte entre tomas~~: **sólo con reloj**. Sin él cambian decenas o
  cientos de píxeles en uno-tres niveles (la tabla de arriba); la `dif` de dos decimales lo escondía. Entre una toma
  sin reloj y una con él, 0,1-0,2 (el instante de los parpadeos y los glifos).

**Todo este ruido está medido SÓLO con tomas de «antes»** (sin nada de la ola 2): lo que añadan las
olas que se mueva con el reloj o con las luces (tubos que parpadean, vapor, pantallas, haces) puede subirlo. Quien
compare su «después» contra el ruido saca también DOS tomas de su «después» y se queda con el mayor de los dos
ruidos, como hace la P.

La P (`hoja.mjs --recentrado`, dos tomas), 25-sep sin reloj: N0 0,20 y N1 3,12 sobre un ruido de 0,00 (N1 es el
salto de `relieveSoloEnElCentro`, que se ve: el edificio de la izquierda gana balcones y cornisa a 2-20 m); N3 0,00 o
3,4-6,2 según la toma, porque las luces de verdad de N3 con la ventana de después no salían iguales en dos tomas: el
ruido de la P en N3 era de 3,74. **En la tanda «antes» (con `reloj=55`)**: N0 0,20 y N1 3,12 igual, y **N3 0,00 sobre
un ruido de 0,00**: con las luces asentadas la P de N3 ya no tiene ruido, y «a menos de 40 m no cambia nada» se
juzga ahí sin holgura.

### La tanda «antes» entera, dos tomas (25-sep, ola 1b)

`scratchpad/detalle/fotos/antes/` (las 76 y las 3 máscaras) y `antes/toma2/` (otra toma igual, justo después). Las
**76 parejas dan `dif` 0,00**: de los 79 ficheros, 61 son idénticos byte a byte y los otros 18 difieren en 2-56
píxeles (casi todos de uno a ocho niveles; el que más, 14, en la G de N1 de madrugada). Las siete E son las del
remate de la 1b (la E movida, arriba), sacadas con sus dos tomas en la misma corrida; las otras 72, las del 25-sep.
La hoja del ruido sale con 3 (aviso) por el negro y el magenta heredados de H, M y N (abajo), y nada más. Las hojas
y sus números van en `antes/hojas/` y no junto a las fotos (un `.png` más en la tanda sería una foto sin pareja): la
del ruido (`ruido.*`, rehecha con las E nuevas), la del ruido de la E sola (`ruido-E.*`), la de N3 contra N1
(`niveles.*`, rehecha), la de la P y los de las tres tomas de A, C y E (éstos, con la E vieja).
Quien compare su «después» con la «antes» compara, en la práctica, contra ruido cero:
cualquier `dif` que no sea 0,00 es un cambio suyo (o de algo que se mueva con el reloj o las luces que haya añadido
él; por eso saca también dos tomas de su «después»).

## El negro y el magenta

§8 pide menos de 0,5 % de negro puro y cero magenta en TODAS las fotos, y la hoja lo juzga. Desde la ola 1b (acta del
plan, §13, decisión 3) el negro se parte en dos, y desde el remate de la 1b (decisión del coordinador) el magenta
también, con la MISMA regla:

- **heredado**: la MISMA foto de la tanda «antes» ya pasaba del tope, **y es eso mismo**: comparada píxel a píxel con
  su foto de «antes», lo que allí no lo era no llega al tope, y el % no ha subido un tope entero. Es un AVISO: la hoja
  lo escribe en la línea y sale con **3** si no hay nada peor. El tope del negro es 0,5 %; el del magenta, UN píxel
  (un solo píxel magenta que en «antes» no lo era ya es nuevo);
- **nuevo**: la foto de «antes» no pasaba del tope (o no está, o no se le ha dado `--antes`), o lo de ahora está en
  píxeles que en «antes» no lo eran (un tope o más), o ha crecido un tope. Es un FALLO: sale con **1**.
- **Contra qué foto.** Con dos tandas, cada foto contra la suya de la primera. Con `--niveles` y `--recentrado` y
  `--antes`, cada foto (la N1 y la N3; en la P, sólo la de DESPUÉS del cruce: la de antes del cruce no se juzga por negro ni magenta) SÓLO contra la suya de `--antes`:
  el «nuevo píxel a píxel» dentro del par (N3 contra N1 de la misma tanda) no cuenta, porque un negro que la N1 ya
  no tiene y la N3 tenía igual en «antes» no es nuevo (lo vio la revisión 2 de la 1b: salía 1 donde tocaba 3). Sin
  `--antes` todo negro y todo magenta es nuevo, y ahí sí se mira el par. Con `--niveles` se juzgan las DOS fotos del
  par, en el negro y en el magenta. (La primera versión de la 1b sólo comparaba los %: un negro que creciera de 0,6
  a 10 %, o que se moviera, salía como aviso; lo vio la revisión 1.)

En la tanda «antes» (con `reloj=55`) pasan del tope de negro cuatro fotos, todas de madrugada, tres posiciones y sin
nada roto por la ola 1: **H 0,53 %** en N1 (los bajos del taxi y dos cristales), **M 1,36 %** en N1 (el poste ENTERO
de la farola del primer término, a 3 m, y cristales de escaparate) y **N 0,56-0,65 %** en N1 y N3 (cristales de
ventana vistos desde arriba). La E, en su posición de antes del remate, también pasaba (0,59-0,82 %, el coche aparcado
a su derecha); en la nueva se queda en 0,21-0,27 %. La H y la M de N3 bajan del tope con las luces de verdad
encendidas (0,20 y 0,32 %). La farola de la M es un fallo de verdad y lo arregla O2-FAROLAS-Y-PIEZAS (acta, decisión 3): cuando lo haga, su foto pasará
de aviso a nada, que es lo que tiene que pasar.

**El magenta de la N (lo que la hoja marca y no es una textura que falta).** La N de N1 tiene 3 píxeles (madrugada) y
6 (alba) de «magenta saturado» (r y b > 240, g < 20) en `(1025-1041, 236-239)`: el centro del rótulo de neón rosa
de la papelería, visto desde arriba. No es una textura rota, pero la regla de la hoja no lo distingue. En N3 no pasa
(el rótulo sale menos saturado). **Decidido en el remate de la 1b: es magenta HEREDADO** (arriba): mientras sean esos
mismos píxeles, la hoja lo escribe como aviso («magenta heredado > 0 (N1 magenta 0.0003 %, y ANTES ya …)») y sale
con 3, no con 1. Un solo píxel magenta más, o en otro sitio, es nuevo y sale con 1. Hasta el remate salía con 1 toda
comparación que incluyera la N de N1.

## Lo raro en la tanda «antes» (mirada entera, 25-sep, ola 1b)

Mirada foto a foto (en mosaicos de las cuatro de cada letra y a tamaño entero donde había algo). Nada de esto lo ha
roto la ola 1; es lo que el «antes» retrata y quien juzgue un «después» no debe tomarlo por suyo.

- **Las luces de verdad de N3 dejan las juntas de la baldosa blancas como cromo** (A abajo a la derecha, C y la N2
  de la C abajo a la izquierda): una rejilla de rayas blancas donde la farola de verdad pega de refilón. §8 pide
  «juntas no cromadas». Sin `reloj=` casi no se veía, porque las luces salían apagadas (arriba).
- ~~**E (calle-25m) no enseña las dos aceras.**~~ Con `pos` en `16,5, 40` (la del plan) la cámara iba pegada a la
  fachada de la izquierda y no salía la acera izquierda. **Resuelto en el remate de la 1b: la E se movió** (ver «Por
  qué cada una está donde está») y sus siete fotos de esta tanda se rehicieron.
- **D al alba en N1: la fachada lateral del edificio de la izquierda sale casi blanca**, quemada, con las ventanas
  apenas marcadas (en N3, algo menos).
- **I y O de madrugada en N1: las persianas salen lisas**, sin lamas; al alba y en N3 las lamas se ven. Es la luz
  (la direccional de madrugada casi no da), no la malla.
- **F en N3: un charco de luz redondo en la pared derecha del callejón**, encima de la reja, sin ninguna farola que
  lo explique en el encuadre: una luz de verdad (sin sombra) de una farola fuera de cuadro, que atraviesa lo que haya
  en medio. Sale igual en las dos tomas.
- **M en N3: los reflejos de las luces de verdad en el asfalto mojado son bolas pequeñas y muy brillantes**, casi
  blancas. Y el tren sale ENTERO sobre el Elevado (por eso `reloj=55`).
- **L al alba: torres lejanas que flotan**: trozos de torre con el cielo debajo, sobre todo a la izquierda y en
  medio del skyline. De madrugada la niebla lo tapa. Es de lo lejano (O3-LEJANO).
- **B: la furgoneta aparcada es una caja negra** casi sin forma, y de madrugada se funde con el asfalto (lo de
  O2-VEHICULOS).
- **La N de N1: el neón rosa de la papelería da magenta saturado** (arriba).
- **R (vado con lluvia) en N3: los bordes de los charcos salen como manchas blanquecinas y moradas**, y hay un
  destello naranja sobre la cebra (a tamaño entero, `x ≈ 300-800, y ≈ 380-450`). Y **en N1 y N3 la persiana del
  canto izquierdo tiene moaré** de rayas. Para O2-SUELO (charcos y lluvia) y quien toque las persianas. Lo vio la
  revisión de la 1b.
- **La P de N0 «cambia a menos de 40 m» por reflejos** (`dif` 0,20, 3.286 píxeles de más de 12 dentro de la
  máscara, todos en `x 571-714, y 348-512`): con la ventana de después aparecen luces y rótulos al FONDO de la calle,
  a más de 40 m, y lo que cae dentro de la máscara son sus REFLEJOS en el asfalto mojado, a pocos metros. La máscara
  de profundidad mira dónde está el suelo, no de dónde viene lo que refleja: quien juzgue la P lo tiene que saber. La
  de N1 es el salto de `relieveSoloEnElCentro`.
