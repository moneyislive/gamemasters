# Las cartas de Riberas

> Si algo de aquí no coincide con el código, gana el código. Este documento recoge
> las decisiones y su porqué. Se escribió la noche del 4 al 5 de septiembre de 2026,
> a partir de lo que Miguel pidió por escrito antes de irse a dormir, para que su
> primera partida completa tuviera lo que le faltaba a Riberas.

## 0. Qué falta y por qué esto es el juego, no un extra

Riberas ya reparte, funda, alza, tira los dados, cobra, truequea y da el Vado Largo.
Lo que no tiene es **el mazo**: esa segunda economía por la que se cambian tres
bienes por una carta que no sabes cuál es. Sin él, una partida es sólo construir, y
las partidas se deciden por quién tuvo mejores números.

Miguel lo dijo así: «quiero que todo funcione como en el catán completo». Esto es
lo que faltaba para eso.

## 1. Las decisiones que no se pueden deshacer después

1. **Los nombres son de Riberas, no del juego del que viene la mecánica.** El
   vocabulario de aquel es suyo, y éste tiene el propio desde el primer día (limo,
   junco, sal, piedra, grano; chozas, torres, veredas; el Vado Largo). Y no es sólo
   coherencia: uno de los nombres de aquellas cartas está en la lista negra de
   `server/scripts/marcas-registradas.ts` —es a la vez una marca y una palabra de
   economía—, así que escribirlo en el código pondría rojo `verify:procedencia`, y
   con razón. Las cinco familias se llaman **La Guardia**, **El Año Bueno**, **El
   Acaparamiento**, **Las Dos Veredas** y los cinco **títulos** (Molino, Cantera,
   Torreón, Faro, Huerto).

2. **Hay CINCO cartas de punto distintas y no una repetida cinco veces.** Es lo que
   pidió Miguel y es lo que hace su imagen de referencia: cinco dibujos, cinco
   nombres, el mismo efecto. Cuestan lo mismo y valen lo mismo; lo que cambia es lo
   que se ve al revelarlas, y eso es la mitad de la gracia de guardarlas.

3. **El mazo se baraja UNA vez, al empezar, con la semilla de la mesa.** No se
   sortea carta a carta al comprar. Dos razones: un mazo barajado se puede contar
   —quedan tres guardias, ya no puede salir un título— y eso es información legítima
   del juego; y un sorteo por compra dependería del orden en que llegan las
   peticiones, o sea que dos servidores con el mismo estado darían partidas
   distintas. `reejecutarEn` dejaría de valer, y con él la comprobación que sostiene
   todo el motor.

4. **Una carta comprada no se juega en el mismo turno.** La compras y espera al
   siguiente. Sin esa regla, tres bienes se convierten en un efecto inmediato y el
   mazo pasa a ser una tienda: se acabó la tensión de guardar. La excepción son los
   títulos, que no se «juegan» sino que se **revelan**, y eso se puede hacer el mismo
   turno: revelar no hace nada salvo enseñar lo que ya tenías.

5. **Una carta jugada por turno.** Igual que arriba, y por lo mismo: encadenar tres
   efectos en un turno convierte una mano guardada en una jugada única que gana
   partidas sin que nadie pueda responder.

6. **Los títulos suman EN SECRETO para su dueño y en público sólo al revelarlos.**
   Tu vista te dice tus puntos con lo oculto dentro —es tu información— y a los
   demás les dice los públicos. Quien va ganando en secreto es exactamente lo que
   hace que las últimas rondas se jueguen distinto. Ver §5 bis del contrato del
   arcade: lo secreto no viaja, ni siquiera dentro de un identificador de opción.

7. **La Guardia roba, y no mueve a nadie. REVOCADO el 6 de septiembre de 2026 por
   Miguel, tras jugar una partida entera.** Lo que decía, y por qué se decidió así:
   «en el juego del que viene la mecánica, el caballero mueve al ladrón. Riberas no
   tiene ladrón: su desgracia es el estiaje, que no ocupa una comarca sino que corta
   la producción del turno». Era una decisión de la fase en que había que demostrar
   que el motor no sabía de qué juego hablaba, y el castigo por acumular era una
   regla rica que aquello no necesitaba.

   Lo que se vio jugando la tumbó: salen una docena de sietes por partida y los doce
   no hacían nada, así que guardar no costaba y la Guardia significaba la mitad. El
   estiaje pasó a ser también LA PIEZA (`docs/EL-LADRON-DE-RIBERAS.md`, fase 1 en el
   commit 958962a): se posa en una isla, la seca y roba a un vecino. Y la Guardia
   pasa a moverla, como el caballero del que viene. Lo que sigue siendo cierto de
   este punto es lo que la carta le da a quien la juega: **un bien al azar de otro
   colono**, sólo que ahora es el de la isla donde se planta la pieza. Si no
   tiene ninguno, no se ofrece robarle.

8. **Dos premios, no uno, y con la misma regla.** Al Vado Largo se le suma **La
   Mayor Guardia**: quien haya jugado tres guardias o más, y más que nadie. Los dos
   se recalculan solos, los dos valen un punto, y los dos sólo cambian de dueño si
   se supera ESTRICTAMENTE —quien empata no arrebata—, que es la regla que evita que
   un premio salte de mano en mano sin que nadie haga nada.

9. **El Vado Largo pasa de cuatro veredas a CINCO.** Lo pidió Miguel («al menos 5
   puentes consecutivos») y es lo que hace el juego completo. Con cuatro, el premio
   caía demasiado pronto y cambiaba de manos por accidente.

## 2. El mazo: veinticinco cartas

| Familia | Cuántas | Qué hace |
|---|---|---|
| **La Guardia** | 14 | Le quitas un bien al azar a un colono que elijas. Cuenta para La Mayor Guardia. |
| **El Molino**, **La Cantera**, **El Torreón**, **El Faro**, **El Huerto** | 1 cada uno (5) | Un punto. Se guarda en secreto y se revela cuando se quiere. |
| **El Año Bueno** | 2 | Coges dos bienes cualesquiera del arcón, iguales o distintos. |
| **El Acaparamiento** | 2 | Dices un bien; todos los demás colonos te dan los que tengan de ése. |
| **Las Dos Veredas** | 2 | Alzas dos veredas sin pagarlas, donde las reglas te dejen. |

Son las mismas proporciones del juego completo, y no es casualidad: catorce de
veinticinco siendo guardias es lo que hace que el premio de la Mayor Guardia sea
alcanzable y que comprar sea una apuesta y no un cambio seguro.

**El coste es sal, piedra y grano.** Uno de cada, como pidió Miguel.

**Cuando el mazo se acaba, no se puede comprar.** No se rebaraja: un mazo que vuelve
a empezar deja de poder contarse, y contar el mazo es parte del juego.

## 3. Lo que se puede hacer con ellas, y cuándo

- **Comprar**: en tu turno, después de tirar, si tienes sal, piedra y grano y queda
  mazo. Sale de tu almacén y entra a tu mano, boca abajo para los demás.
- **Jugar** (Guardia, Año Bueno, Acaparamiento, Dos Veredas): en tu turno, después de
  tirar, si la carta no la compraste este mismo turno y no has jugado ya otra.
- **Revelar** (los cinco títulos): en tu turno, cuando quieras, incluso el turno que
  la compraste. No cuenta como «jugar una carta».

Y una cosa que el juego completo hace y que aquí se hace también: **jugar una
guardia antes de tirar los dados** no está permitido en esta versión, a sabiendas.
En el juego original sí se puede, y sirve para mover al ladrón antes de que te
robe; sin ladrón, esa jugada no tiene sentido aquí y su única consecuencia sería
complicar el momento del turno.

## 4. Qué se ve, y quién lo ve

- **Tu mano de cartas**: sólo tú. Cada carta con su familia y su nombre.
- **Cuántas cartas tiene cada colono**: todos. El número, no cuáles.
- **Las guardias jugadas de cada colono**: todos. Es lo que hace que La Mayor
  Guardia se pueda ver venir.
- **Los títulos revelados**: todos.
- **Tus puntos con lo oculto dentro**: sólo tú. Los de los demás, los públicos.
- **Cuántas cartas quedan en el mazo**: todos.

## 5. En la pantalla

**La mano de cartas va a la IZQUIERDA del lienzo**, agrupada por familias, como los
bienes van a la derecha. Lo pidió Miguel así y además es lo correcto: son dos manos
distintas —lo que gastas y lo que guardas— y mezclarlas obligaría a leer cada carta
antes de cada decisión.

**Para revelar un título se arrastra a una casilla**, igual que un bien se arrastra
al área de trueque. El gesto ya está aprendido; repetirlo cuesta cero.

**Los bienes que pide una carta se eligen en la mano, no en un menú** (septiembre de
2026). El Acaparamiento pide un bien y El Año Bueno dos, y en el escritorio abrían
`ElijeUna` con cinco o quince renglones de texto. Miguel pidió que se eligieran
«mostrando las 5 celdas de recursos que se utilizan para trueque» y que, según se
elige, «aparezcan las cartas en su mano». Así queda: al jugar la carta salen las
cinco casillas en el sitio de las de trueque —sin carta cogida, porque lo elegido
ENTRA en la mano, no sale de ella—, cada casilla pulsada mete una carta provisional
en la mano, y con el último bien viaja la jugada ENTERA que el juego ofrecía para
esa combinación (`jugadaConLosBienes`, portillo §5 bis: no se monta nada en el
cliente). Qué carta pide bienes y cuántos NO está en una tabla: lo dice
`eleccionDeBienes` mirando las jugadas que el juego ofrece, así que si mañana una
carta pide tres, se abren las casillas igual. `Escape`, volver a coger el naipe o
que la mesa cambie debajo deshacen la elección; un roce en la mano de al lado no, a
propósito. `ElijeUna` sigue para lo que no son bienes (a quién le robas, a quién se
lo propones). La app del móvil no compone esto y conserva el menú.

**El contador de puntos de cada colono se ve siempre**, y en el tuyo se distingue lo
público de lo que sólo cuentas tú.

## 6. Los dibujos

Cinco familias más los cinco títulos son nueve dibujos nuevos (los cinco títulos
comparten familia pero cada uno tiene el suyo). Van en `escenas/iconos.ts` con el
mismo sistema que los bienes: trazo, sin relleno, legibles a tamaño de carta.

El estilo es el de la segunda imagen que mandó Miguel —línea clara sobre fondo
oscuro, sin acuarela—, que es además el que ya usan los bienes.

## 7. Lo que NO entra, a sabiendas

- ~~**Ladrón y estiaje**: el siete no hace nada todavía, y esto no lo cambia.~~ YA
  ENTRÓ: el estiaje es una pieza desde el commit 958962a y el siete la mueve. Ver
  `docs/EL-LADRON-DE-RIBERAS.md`.
- **Descartar con más de siete bienes**: era del mismo bloque que el ladrón, y entra
  con él, en la fase 2 de aquel documento.
- **Puertos**: no están en el tablero ni en las reglas.
- **Jugar una guardia antes de tirar**: §3.
