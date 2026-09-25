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
node escritorio/scripts/fotos/hoja.mjs --niveles <tanda> --hoja <hoja.png>                          # N3 contra N1
```

`--niveles` empareja dentro de una tanda cada `X-…-n1-<luz>….png` con su `X-…-n3-<luz>….png` y juzga el criterio
«N3 contra N1» de §8: ≥ 12 % de píxeles que cambian en A-D y O, ≥ 5 % en E-G (las demás letras se miden y no se
juzgan). En la tanda del 25-sep (`d4402d0` más O1-FOTOS) se quedan por debajo 13 de los 16 pares con umbral: A-D
y O dan 3,5-11,2 %, E 2,8-5,0 % y F de madrugada 2,4 %. Es lo que el plan quiere subir, no un fallo de la hoja.

`PUERTO` es el del vite de TU worktree: `foto.sh` pregunta al banco de ese puerto de qué carpeta sale y se niega
si no es la suya. `protocolo.sh --lista` dice qué fotos sacaría sin sacarlas.

## La base

`protocolo.sh` lee la línea `BASE=`. Cada foto le añade `&nivel=N&luz=madrugada|alba&pos=…` y lo de su posición.
Un parámetro de la posición que ya esté en la base (la `lluvia=1` de la R) SUSTITUYE al de la base: el banco lee
el primero de dos iguales, y `foto.sh` se niega a sacar una foto con un parámetro repetido.

`reloj=T` (el reloj del adorno parado en T segundos: parpadeos, vapor, glifos, charcos, cielo y tren) NO está en la
base: quita el ruido de N2 pero no el de N3 (ver «El ruido», abajo), y cambia lo que enseña cada foto (el tren y
cada parpadeo quedan en un instante fijo). Si se pone, tiene que ser ANTES de sacar la tanda «antes», y en todas.

BASE=ciudad=abierta&traza=0&codigo=K7M2P&noche=1&montar=1&lluvia=0&panel=0

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
| E | calle-25m | `16.5,1.7,40,0,-0.03` | verificada (plan) | Ritmo y cornisas en las dos aceras, balcones, asfalto, luces lejanas al fondo. |
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
E|calle-25m|16.5,1.7,40,0,-0.03||
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

## El ruido (dos tomas iguales, 25-sep, `d4402d0`)

Con la consulta de hoy (con lluvia y panel; la máscara `panel` quita 0-545 × 0-145): A, C y E en N1 salen **idénticas
byte a byte**; en N3, A da `dif` 3,07 (7,4 % de píxeles cambian) y C 4,67 (9,7 %); E, 0,00.

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

- **En N2 baja**: el ruido de A y C era el reloj (las bocanadas de VAPOR de `vapor.ts`, desde N2, y los parpadeos),
  y con `reloj=` se va entero.
- **En N3 NO baja.** Lo que cambia entre tomas con el reloj parado son **charcos de luz enteros** en el suelo y en
  las fachadas (la lupa de diferencias los pinta como manchas redondas bajo las farolas): son las LUCES DE VERDAD
  (`LucesDeLaNoche`, `atmosfera/luz.ts`: 4 en N2 y 6 en N3), que cada 0,3 s eligen las farolas más cercanas a un
  punto 8 m por delante de la cámara y se encienden con un fundido de `dt × 4`. Las mueve el `dt` de los fotogramas
  (lo que Edge sin ventana tarde en pintar cada uno), no el reloj del adorno, y `reloj=` no las toca. La E de N2
  con reloj (0,40) es lo mismo: un charco de luz al pie de la fachada izquierda. Fijarlas pide tocar `luz.ts` o
  `Atmosfera.tsx` (que O1-FOTOS sólo toca para la lluvia): queda pedido en su informe.
- Con reloj y sin él, N1 sale idéntica byte a byte entre tomas; entre una toma sin reloj y una con él, 0,1-0,2 (el
  instante de los parpadeos y los glifos).

**Este ruido está medido SÓLO con tomas de «antes»** (el árbol de O1-FOTOS, sin nada de la ola 2): lo que añadan las
olas que se mueva con el reloj o con las luces (tubos que parpadean, vapor, pantallas, haces) puede subirlo. Quien
compare su «después» contra el ruido saca también DOS tomas de su «después» y se queda con el mayor de los dos
ruidos, como hace la P.

La P (`hoja.mjs --recentrado`, dos tomas): N0 0,20 y N1 3,12 sobre un ruido de 0,00 (N1 es el salto de
`relieveSoloEnElCentro`, que se ve: el edificio de la izquierda gana balcones y cornisa a 2-20 m); N3 0,00 o 3,4-6,2
según la toma, porque **las luces de verdad de N3 con la ventana de después no salen iguales en dos tomas**
(`atmosfera/luz.ts` elige las seis farolas cercanas de N3 cada 0,3 s y las funde con el `dt`; `reloj=` no lo fija): el ruido de la P en N3 es
de 3,74.

Un aviso para quien juzgue: §8 pide menos de 0,5 % de negro puro en TODAS las fotos, y la hoja lo juzga (y además el
negro NUEVO, el que en antes no lo era, que es el que dice que algo se ha roto). La tanda del 25-sep ya lo pasa en
cuatro posiciones de madrugada, sin nada roto por O1-FOTOS: **E 0,68-0,81 %** (las ruedas y los bajos del coche
aparcado a su derecha), **H 0,53-0,83 %** (los bajos del taxi y dos cristales de ventana), **M 1,34-1,36 %** (el
poste ENTERO de la farola del primer término, a 3 m, y cristales de escaparate) y **N 0,65-0,74 %** (cristales de
ventana vistos desde arriba). Lo de la farola de la M no parece «negro de verdad» y es para quien haga las farolas.
Esas fotos salen marcadas en todas las tandas y la hoja sale con 1 hasta que alguien las alumbre o el plan cambie
el criterio; la línea de cada una dice si ANTES ya lo pasaba.
