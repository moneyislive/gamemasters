# El ladrón de Riberas

> Si algo de aquí no coincide con el código, gana el código. Este documento recoge las
> decisiones y su porqué. Se escribió el 6 de septiembre de 2026, sobre la rama
> `lobby-catan`, con el código en `6372bc7`, a partir de lo que Miguel escribió después
> de jugar una partida entera. Es la primera versión.
>
> Y empieza revocando una decisión escrita. Riberas no tiene ladrón a propósito: está
> dicho en la constante `ESTIAJE` de `shared/arcade/juegos/riberas.ts` («cuando el dado
> saca siete el agua baja y las islas no producen. Y no pasa nada más»), en la cabecera
> de `jugarLaGuardia`, en la de `deltaDeLaVista` de `riberas-en-3d.ts` («`ladron` sale
> siempre `null`, y eso no es un hueco por rellenar») y en el §1.7 de
> `docs/LAS-CARTAS-DE-RIBERAS.md`. **Quien la revoca es Miguel**, después de jugar, y su
> razón es la buena: sin la pieza, acumular no tiene castigo, el trueque no compite con
> guardar, y La Guardia, que son catorce de las veinticinco cartas del mazo, hace media
> carta. El §0 cuenta lo que había, el §12 lista una por una las líneas de código que
> esa revocación deja falsas, y el §1 dice qué se pone en su sitio.
>
> **Ningún número de aquí es una opinión.** Cada uno sale de un guion de medida que
> importa el motor de verdad y juega partidas a ciegas con `opcionesDeRiberas`, de una
> lectura de los `.gltf` del pack con sus accesores, o de un comprobador que se nombra.
> Los guiones están listados en el §11, viven en el scratchpad de la sesión y no
> escriben nada. Este encargo es de diseño: aquí no se ha tocado ni una línea de código.

## 0. Qué hay hoy al sacar un siete, y qué se pierde con ello

`tirarLosDados` gasta dos tiradas de `enteroEntre`, suma, y si la suma es siete devuelve
el estado con `ultimaTirada: 7` y nada más. La rama entera es una línea:

```
if (suma === ESTIAJE) return conLaTirada;
```

No hay descarte, no hay robo, no hay pieza y no hay isla bloqueada. La duna, que es la
única isla que no rinde, se reparte con `numero: 0` y se queda ahí toda la partida sin
hacer nada. En el tablero declarado su cara sale con `cifra: ''` y en el de tres
dimensiones con `cifra: null`, así que `delta.tsx` no le pinta el `Numero` y la isla
queda sin posavasos, sin círculo y sin cifra. **Eso es exactamente lo que Miguel vio y
describió**: «la tesela de ladrón no aparece como casilla, ni círculo blanco ni número».

Lo que se pierde sin la pieza, dicho con números medidos y no con adjetivos:

| Qué | Hoy, sin la regla | Con la regla puesta |
|---|---|---|
| Mano más grande vista en doce partidas a ciegas | **107 fichas** | **26** |
| Mano media en el momento de sacar un siete | 11,03 | 6,21 |
| Manos por encima de siete fichas al sacar un siete | 239 de 468 (**51,1 %**) | 129 de 482 (26,8 %) |

(`medir2.ts` y `medir4.ts`, §11. El segundo es el mismo juego con el descarte aplicado a
mano encima del estado, sin tocar el motor.) Un almacén de ciento siete fichas no es un
juego con un desequilibrio: es un juego donde guardar no cuesta nada, y donde por tanto
el trueque, la compra de cartas y La Guardia sólo compiten contra sí mismos.

Y La Guardia: catorce de veinticinco cartas hacen hoy la mitad de lo que hacen en la
familia de la que viene la mecánica. Roban, que es la mitad barata; no mueven la pieza,
que es la que decide la partida. Eso está razonado en su cabecera y el razonamiento era
correcto **mientras no hubiera pieza**. Deja de serlo en cuanto la hay.

## 1. Las decisiones que no se pueden deshacer después

1. **El estiaje deja de ser sólo una suma y pasa a ser también una pieza, y las dos
   cosas conviven con nombres distintos.** La constante `ESTIAJE = 7` pasa a llamarse
   `SUMA_DEL_ESTIAJE`, y `estiaje` pasa a ser el campo del estado que dice en qué isla
   está la pieza. No se puede dejar el mismo nombre para las dos: un `estado.estiaje`
   que a veces es un siete y a veces una llave de isla es el fallo que el compilador no
   ve porque los dos son cadenas o números según quién los lea. Es un renombrado que
   toca la cabecera del fichero, `LOS_DIECIOCHO_NUMEROS`, `tirarLosDados` y el §12
   entero, y por eso va el primero: hacerlo después obliga a hacerlo dos veces.

2. **El descarte es un momento nuevo del juego, `'descartando'`, y mientras dura
   `turnoDe` apunta a quien tiene que descartar, no a quien tiró.** Es la decisión más
   cara del documento y la que sostiene todo lo demás; está entera en el §2. Lo que la
   obliga está medido y no supuesto: `verify:larga` juega Riberas leyendo
   `turnoDeLaVista(mesa.vista)` y preguntándole a `opcionesDeRiberas` qué puede hacer
   ese asiento (su comentario dice por qué no escribe los movimientos a mano);
   `verify:mesa` hace lo mismo con `espectador.turnoDe` en su bucle de cuarenta vueltas;
   y `empiezaTurnoNuevo` de `server/src/arcade/mesas.ts` reprograma el plazo de pared
   **sólo cuando `turnoDe` cambia**, con su cabecera explicando el agujero que se cerró
   así. Si durante el descarte `turnoDe` siguiera apuntando al que tiró: los dos
   comprobadores se quedan sin opciones que jugar y la partida se para en seco, y quien
   tiró se lleva de regalo el plazo entero de todos los que descartan.

3. **Se descarta FICHA A FICHA, no en un solo movimiento con la lista de lo que se
   tira.** Medido sobre los 148 sietes de doce partidas a ciegas (`medir3.ts`): los
   repartos distintos de un descarte salen a 24,36 de media, 42 en el percentil 90 y
   **713 en el peor caso**. Con la regla ya puesta, la mano más grande que se vio son 26
   fichas, y una mano de 26 repartida (7,6,5,4,4) da **802 repartos distintos**. Ficha a
   ficha son **cinco opciones como mucho, siempre**, una por clase de bien que quede en
   la mano, sean cuantas sean las fichas; medido, la mano de un descarte tiene 2,51
   clases distintas de media y cuatro como máximo. Y es exactamente el mecanismo que el
   juego ya tiene escrito dos veces, `faltaVereda` y `veredasGratis`: un contador en el
   estado, y `opciones()` que mientras el contador no llegue a cero no ofrece otra cosa.
   El precio es que un descarte cuesta varias revisiones en vez de una: 4,91 fichas de
   media, 7 en el percentil 90 y 13 en el peor caso medido (`medir4.ts`).

4. **El tic descarta por TODOS los que falten, y no por uno.** Aquí se separa
   deliberadamente de `colocarPorElAusente`, que coloca por uno solo y deja que la
   serpentina siga. La razón es de reloj: el plazo se reprograma cada vez que cambia
   `turnoDe`, así que drenar de uno en uno cuesta **un plazo por persona**, y en La Larga
   el plazo son 86.400 segundos (`PLAZO_MAXIMO_S` admite siete días). Con seis en la
   mesa eso son seis días por un siete. Descartando por todos, un siete cuesta como
   mucho **un** plazo. Se tiran las fichas más viejas, que es lo que ya hace `cobrar`
   («se quita SIEMPRE la ficha de número más bajo de cada clase»), y no una al azar: el
   azar en un vencimiento haría que dos partidas con los mismos movimientos y distinto
   número de plazos vencidos tuvieran el acumulador en sitios distintos, que es la razón
   ya escrita en `colocarPorElAusente`.

5. **Mover el estiaje y robar son UN movimiento, con la isla y la víctima dentro.** No
   dos. Medido: los destinos son siempre **18** (las diecinueve islas menos la de
   ahora), y metiendo la víctima en la misma opción la lista sube a **18,73 de media, 20
   en el percentil 90 y 23 como máximo** en 148 sietes (`medir5.ts`). El tope duro son
   54 y sale de una regla que ya existe: los seis vértices de una isla forman un ciclo
   de seis, y la regla de distancia impide dos piezas contiguas, así que **no caben más
   de tres piezas en una isla**; medido, el máximo real de piezas en una isla fue 3 y el
   de víctimas 2. Partirlo en dos movimientos (mover, y luego robar) abriría un hueco
   entre los dos en el que quien mueve puede cerrar la app, y obligaría a un tercer
   momento con su plazo para una elección de entre tres.

6. **Con la guardia se mueve y se roba igual, y NO se descarta.** Es lo que pidió Miguel
   y es lo correcto: el descarte castiga el siete, no la carta. Y la guardia pasa a
   poder jugarse **antes de tirar**, lo que hoy no se puede por dos sitios a la vez:
   `jugarLaGuardia` exige `estado.tirado` en su primera línea, y `opcionesDeTurno` sólo
   llega a `opcionesDelMazo` después del `if (!v.tirado) { ...; return opciones; }`. Hay
   que tocar los dos: si sólo se tocara uno, la carta se ofrecería y el reductor la
   rechazaría en silencio, o el reductor la aceptaría y nadie tendría botón. `GUARDIA_MINIMA`
   (3), `PUNTOS_DE_LA_GUARDIA` (1) y La Mayor Guardia no cambian en nada: `conLaGuardia`
   se sigue recalculando en el mismo sitio y con la misma regla del máximo estricto.

7. **La isla donde está el estiaje no rinde a nadie, y el sitio es una línea de
   `repartirLaCosecha`.** Va dentro del bucle `for (const isla of estado.islas)`,
   **después** del `if (isla.numero !== suma) continue;` y **antes** de leer `RINDE`.
   Después, porque así la comparación de cadenas sólo se paga en las islas que iban a
   rendir (una o dos por tirada, no diecinueve). Y no se toca `loQueRodea`, que es la
   cosecha de la segunda choza de la colocación: el estiaje sólo se mueve en `'jugando'`
   y en la colocación está siempre en la duna, que ya no rinde por `RINDE`. Escribirlo
   ahí «por simetría» sería una rama muerta que nadie podría poner roja.

8. **El estiaje empieza en la duna, y la duna sigue sin número.** El §6 corrige con
   datos, y con todo el cariño, la frase de Miguel sobre el siete de la casilla del
   ladrón.

9. **El estiaje es PÚBLICO y viaja en la vista.** `VistaDeRiberas` gana `estiaje:
   LlaveDeHex | null` y no entra en `loSecretoDeRiberas`: dónde está la pieza se ve
   mirando el tablero, igual que las chozas. Lo que sí es secreto sigue siéndolo: la
   ficha robada viaja entera con su número de serie, como ya hace `jugarLaGuardia`, y por
   la misma razón que está escrita ahí.

10. **La pieza se llama EL ESTIAJE en pantalla y `estiaje` en el código, y `ladron`
    desaparece del vocabulario de la casa.** El §8 lo argumenta y deja la alternativa en
    el §13, que es lo que Miguel tiene que decidir.

## 2. El descarte: la fase donde actúan varios, en un motor por turnos

### 2.1. Qué se puede hacer hoy sin tener el turno, y por dónde entra esto

Una sola cosa: contestar a un trueque. Está escrito con todas las letras en
`opcionesDeTurno`, en el bloque que va **antes** del `if (v.turnoDe !== quien) return
opciones;` y con un comentario que dice por qué está ahí arriba («ponerlo aquí arriba
evita que alguien lo meta dentro del `if` del turno al añadir la siguiente opción»). Ese
comentario acertó: la siguiente opción que actúa sin turno es ésta, y entra por el mismo
sitio.

Pero el trueque y el descarte no son el mismo caso, y la diferencia es la que decide el
diseño: **el trueque es voluntario y el descarte bloquea la partida**. Nadie espera a que
contestes un trueque; todo el mundo espera a que descartes.

### 2.2. El momento nuevo, y qué ve cada uno

`MomentoDeRiberas` tiene hoy cuatro valores y gana un quinto, entre `'jugando'` y
`'terminada'` porque es a `'jugando'` a donde vuelve:

```
| 'reuniendo' | 'colocando' | 'jugando' | 'descartando' | 'terminada'
```

Y el estado gana un campo:

```
/** Quién debe tirar fichas y cuántas le faltan. En el orden de `colonos`. */
descartes: Array<{ de: AsientoId; faltan: number }>;
```

`tirarLosDados`, al sacar `SUMA_DEL_ESTIAJE`, lo llena con quien tenga **más de siete**
fichas y `faltan: Math.floor(almacen.length / 2)`, recorriendo `colonos` en su orden, que
es estable desde `repartirElDelta` y por tanto reejecutable. Si la lista sale vacía se
salta el momento entero y se pasa directo a mover.

Lo que ve cada uno, y por qué no hay fuga:

- `descartes` va **entero y público** en la vista. Cuántas fichas tiene cada cual ya es
  público (`ColonoVisto.bienes`, «se cuentan mirando su montón»), y `faltan` es la mitad
  de un número público congelado en el instante del siete. No hace falta mirar dentro de
  ningún almacén para calcularlo, así que `verify:mesa` no tiene nada nuevo que vigilar.
- Lo que NO es público es **qué** tira cada cual, y no hace falta que lo sea: la ficha
  desaparece del estado y no aparece en ninguna vista, que es el caso más fácil de la
  regla de `loSecretoDeRiberas` («ningún valor secreto puede aparecer en la vista de más
  de un asiento» se cumple de sobra con cero). Es el mismo trato que recibe una carta
  jugada, que sale de la mano y deja un contador.

### 2.3. Quién puede mover mientras, y a quién apunta el reloj

Las dos cosas son distintas y aquí es donde se separan:

- **Puede mover cualquiera que esté en `descartes` con `faltan > 0`**, a la vez, sin
  esperar turno. Es el mismo mecanismo que contestar un trueque, y por eso las opciones
  del descarte se emiten antes de cualquier comprobación de turno.
- **`turnoDe` apunta al primero de `descartes` que aún tenga `faltan > 0`.** No es
  cosmética: de `turnoDe` cuelgan el aviso que se manda al móvil de quien no está
  delante (`shared/mecanicas/turno-declarado.ts`, que existe precisamente para eso), el
  reloj de pared de la mesa (`empiezaTurnoNuevo`), el tapete de «me toca» del tablero en
  tres dimensiones (`turnoEnTres`), y el bucle de los dos comprobadores que juegan
  partidas enteras. Apuntándolo al primero que falta, las cuatro cosas siguen
  funcionando sin tocar una línea de plataforma.

Y una consecuencia que hay que decir porque no es gratis: **cada vez que uno termina de
descartar, `turnoDe` cambia y el plazo de pared se reprograma**. Ésa es la razón por la
que el tic descarta por todos (decisión 4): sin eso, seis colonos lentos son seis plazos
encadenados.

### 2.4. Qué pasa con el que no contesta

Esto es lo que Miguel no preguntó y es lo que de verdad rompe una partida: un colono
desconectado no puede congelar la mesa.

**El criterio, escrito como regla:** cuando vence el plazo de la mesa estando en
`'descartando'`, `venceElPlazo` tira por **todos** los que falten, quitando de cada
almacén las fichas más viejas, y devuelve el juego a mover el estiaje. No se gasta ni una
tirada de `estado.azar`.

**Cuánto se espera:** exactamente lo que la mesa tenga escrito en `plazoSegundos`, que es
de quien abrió la mesa y no del juego. Son 120 segundos por defecto
(`PLAZO_POR_DEFECTO_S`), y hasta siete días en una partida larga (`PLAZO_MAXIMO_S`). No
se inventa un plazo propio para el descarte, y la razón es la que ya está escrita en
`venceElPlazo`: «el plazo de pared vive en LA MESA, que es la autoridad y lo evalúa al
leer, y lo que vive aquí es LA REGLA de qué significa que venza». Un segundo reloj dentro
del juego sería un reloj que el reductor no puede mirar sin dejar de ser puro.

**Por qué las fichas más viejas y no al azar:** por lo mismo que `colocarPorElAusente`
coloca en el primer sitio legal del orden canónico y no en uno al azar. Gastar azar en un
vencimiento haría que dos ejecuciones del mismo diario con distinto número de plazos
vencidos dejaran el acumulador en sitios distintos, y con eso `reejecutarEn` deja de
valer. Y hay un criterio ya escrito para «la más vieja»: es el que usa `cobrar`.

**Por qué no se resuelve solo, sin esperar:** porque entonces el descarte deja de ser una
decisión y pasa a ser un impuesto, y la mitad de la gracia de la regla es elegir qué
salvas. El plazo existe para que el juego no dependa de que todos estén mirando.

### 2.5. Jugable a ciegas, que es la condición dura

`jugar:fondo` y el bucle de Riberas de `verify:mesa` juegan eligiendo opciones sin saber
a qué se juega. Si el descarte no se ofreciera como opciones, el segundo se para en la
línea `if (movimiento === null) break;` y deja de contar revisiones, y su comprobación
«se han jugado bastantes revisiones de Riberas como para que el verde signifique algo»
empieza a medir menos partida cada vez sin ponerse roja. Por eso:

- El descarte se ofrece como opciones normales, una por clase de bien en mi mano:
  `{ tipo: DESCARTAR, carga: { bien } }`, con rótulo «Tirar un limo» y ayuda «Te quedan N
  por tirar».
- Van también al `tablero` declarado, dentro de `acciones`, que es una de las cuatro
  listas que lee `unToqueDelTablero`.
- Y como `turnoDe` apunta al que descarta, el bucle le pregunta a él y encuentra qué
  jugar. **Sin la decisión 2, esto no funciona**: es la misma decisión mirada desde el
  comprobador.

El bucle termina siempre porque cada movimiento baja `faltan` en uno y `faltan` sale de
un número que no crece durante el momento: como mucho 13 movimientos, medido.

## 3. La guardia: mueve igual, pero sin descarte

Lo que cambia, línea por línea, en `jugarLaGuardia`:

- Deja de recibir `a` como asiento elegido a pelo y pasa a recibir la isla y la víctima,
  como el movimiento de mover el estiaje. Es la misma función de robo, extraída, para que
  el robo esté escrito **una vez**: hoy roba con `enteroEntre(estado.azar, 0,
  suyo.almacen.length - 1)` y hace viajar la ficha entera con su número de serie. Eso se
  reutiliza tal cual, y hay que reutilizarlo y no reescribirlo: `verify:mesa` comprueba
  que un secreto que cambia de manos deja de aparecer en una vista y empieza a aparecer
  en la otra, y esa comprobación vale para el camino nuevo sólo si el camino nuevo mueve
  la misma ficha, con el mismo número, del mismo modo.
- Se cae el `if (yo < 0 || !estado.tirado) return estado;`, que pasa a ser `if (yo < 0)
  return estado;`. Y en `opcionesDelMazo`, la rama de la guardia pasa a ofrecerse también
  por el camino de antes de tirar. Las dos mitades a la vez, por lo que dice la cabecera
  de `sePuedeJugarLaCarta`: «cuál de las dos copias hay que tocar para cambiar la regla:
  LAS DOS».
- **No se descarta.** El descarte lo pone `tirarLosDados` y sólo `tirarLosDados`; la
  guardia salta directamente a mover. Eso es lo que Miguel pidió, y es también lo que
  hace que la carta valga la pena: mover sin pagar el peaje que paga el siete.
- `cartaJugada` se sigue poniendo a `true`, `guardias` sigue subiendo, `conLaGuardia` se
  sigue recalculando en el mismo sitio y `puedeHaberGanado` se sigue llamando después,
  porque La Mayor Guardia da un punto y puede cerrar la partida.

Y una consecuencia que hay que escribir antes de que aparezca jugando: **la guardia
antes de tirar es una jugada de verdad**, no una comodidad. Mueves el estiaje a la isla
del número que más te asusta y luego tiras. Eso es lo que hace que catorce cartas de
veinticinco tengan sentido.

## 4. Mover: obligatorio, a otra isla, y sin que la lista se vaya de las manos

**Qué islas se pueden elegir: las 18 que no son la de ahora.** Las diecinueve del delta,
incluida la duna, menos donde está la pieza. Se descartaron dos alternativas:

- *Sólo las que rinden* (dieciocho, quitando la duna): dejaría la duna como un refugio
  permanente y el estiaje no podría volver a casa. Además complica la regla sin
  simplificar la lista, porque son igualmente dieciocho.
- *También el mar*: no existe. El delta es `mallaDeRadio(2)`, diecinueve hexágonos, y
  fuera no hay hexágonos con llave. Un estiaje en el mar sería una isla número veinte que
  habría que inventar.

**Mover es obligatorio y no se puede quedar donde está.** La opción de quedarse
sencillamente no se emite, así que el portillo del §5 bis la rechaza sola sin que haya
que escribir una guarda. Aun así el reductor comprueba `llaveDeHex(destino) !==
estado.estiaje`, por la doctrina de siempre: quien lea la rama dentro de un año no debe
tener que demostrar el teorema del portillo para saber que está a salvo.

**Qué pasa si la única elección posible es mala.** No hay caso de «no hay dónde»: siempre
hay 18. Lo que sí puede pasar es que todas las buenas estén ocupadas por lo tuyo. Medido
sobre 148 sietes: había **8,22 islas completamente libres de piezas de media, y nunca
menos de 2**; y había **al menos 13 islas sin ninguna pieza tuya** en el peor tablero.
Así que el caso «me tengo que bloquear a mí mismo» no apareció ni una vez, y no hace
falta una regla de excepción para él. Si algún día apareciera, la respuesta correcta es
que se bloquee: es una decisión del juego y no un fallo.

**Cómo se ofrece sin que sean cientos.** Una opción por isla, con la víctima dentro:

| Qué se cuenta | Medida |
|---|---|
| Destinos, siempre | **18** |
| Opciones con la víctima dentro, media | **18,73** |
| Percentil 90 | 20 |
| Máximo en 148 sietes | **23** |
| Tope duro por la regla de distancia | 54 (18 islas x 3 piezas) |
| Piezas en una isla: máximo medido | 3 |
| Víctimas en una isla: máximo medido | 2 |

Para comparar: `opcionesDeTurno` ya emite 14,67 opciones de media en un turno normal, 25
en el percentil 90 y 37 como máximo (`medir2.ts`). O sea que la lista de mover el estiaje
es **del mismo tamaño que un turno cualquiera**, y por eso no necesita mecanismo nuevo.

## 5. Robar

**A quién se puede robar:** a quien tenga choza **o torre** en uno de los seis vértices de
esa isla, no sea uno mismo, y tenga al menos una ficha. Las tres condiciones son
públicas, así que las tres se comprueban en `opciones()` y ninguna necesita el «sólo si»:
las piezas están en `ColonoVisto.chozas` y `.torres`, y `bienes` es un número público. Es
la misma comprobación que ya hace `opcionesDelMazo` para la guardia («a quien no tiene
nada no se le roba: es público cuántos bienes tiene»).

**Cómo se elige la víctima cuando hay varias:** viene dentro de la opción, así que la
elección la hace la lista. En pantalla, tocar una isla con dos víctimas abre las mismas
casillas que ya abre coger una carta del mazo (`Casilla` en `delta.tsx`), una por
víctima, con el color de su dueño. Con una sola víctima no hay confirmación ninguna,
porque la lista tenía una sola entrada.

**Si no hay nadie a quien robar,** o si a quien tocaría no le queda nada, la opción se
emite igual pero con `a: null`: se mueve y no se roba. Eso es lo que dice la regla que
escribió Miguel («si el hexágono está vacío o sólo tiene construcciones del propio
jugador activo, no se roba a nadie») y es además lo que evita el peor fallo posible: que
una isla vacía no se pueda elegir y mover deje de ser obligatorio.

**Cómo se roba:** con `enteroEntre(estado.azar, 0, suyo.almacen.length - 1)`, y la ficha
viaja entera con su número de serie. No es una elección nueva: es la que ya hace
`jugarLaGuardia`, con su porqué escrito («coger la primera sería determinista y también
sería una fuga de reglas: el orden del almacén ajeno es el orden en que le fueron
llegando las fichas»). Se reutiliza por tres razones:

1. Es correcto: el azar vive en el estado y la partida sigue siendo reejecutable.
2. `verify:mesa` ya lo vigila. Su comprobación de Riberas coge lo que devuelve
   `loSecretoDeRiberas` y exige que ningún valor aparezca en más de una vista; una ficha
   robada tiene que dejar de aparecer en la del robado y empezar a aparecer en la del
   ladrón, y eso sólo se puede comprobar porque la ficha lleva número de serie.
3. Escribir un segundo robo sería tener dos, y el día que uno de los dos cambie el
   comprobador sólo mirará al otro.

## 6. Bloqueo, y la duna: dónde Miguel se equivoca, con datos

### 6.1. El bloqueo

Una línea en `repartirLaCosecha`, dentro del bucle de islas:

```
for (const isla of estado.islas) {
  if (isla.numero !== suma) continue;
  if (llaveDeHex(isla.hex) === estado.estiaje) continue;   // <- aquí
  const bien = RINDE[isla.terreno];
  ...
```

Después del número, para pagar la comparación sólo en las islas que iban a rendir. Y no
en `loQueRodea` (decisión 7).

Con la duna no pasa nada raro: la duna ya no rinde por `RINDE[terreno] === null`, así que
el estiaje encima de la duna bloquea algo que ya estaba bloqueado. Eso no es un caso
especial que haya que escribir: es que las dos reglas coinciden, y por eso la duna es el
sitio donde empezar (§6.3).

### 6.2. Lo que Miguel dice, y lo que dice el código

Miguel escribió: la tesela del ladrón «suele tener el número 7 porque no se asigna en
otras casillas». Esa parte no es así, y conviene decirlo aquí porque de ella cuelga lo
que hay que arreglar.

En la familia de la que viene la mecánica **el desierto no lleva ficha numérica**, y la
razón está ya escrita en `LOS_DIECIOCHO_NUMEROS` de `riberas.ts`: «No hay ningún siete, y
eso NO es porque el siete esté reservado a nada: es que con dos dados el siete es la suma
más probable, así que colgarlo de una isla la haría rendir el doble que las demás». Los
números, para que la frase sea comprobable y no una creencia: con dos dados el siete sale
6 veces de 36; el seis y el ocho, 5; el cinco y el nueve, 4; el dos y el doce, 1. Una isla
con un siete rendiría un 20 % más que la mejor de las que hay y **seis veces más** que un
dos.

Y hay una segunda razón, que en Riberas es la de verdad y que ninguna caja necesita
explicar: **el siete es la suma que activa el estiaje**. Una isla con un siete produciría
exactamente en el turno en que nadie produce. No es un desequilibrio: es una
contradicción.

Así que lo que le falta a la duna no es un número. Es que **se vea la pieza**, y ahí
Miguel tiene toda la razón y el código le da la razón por escrito:

- En tres dimensiones, `deltaDeLaVista` manda `cifra: numero === 0 ? null : numero` con el
  comentario «El cero de la duna NO es un número que salga con los dados: es no rinde», y
  `delta.tsx` pinta `isla.cifra === null ? null : <Numero .../>`. O sea que la duna se
  queda sin posavasos, sin cifra y sin los puntos de probabilidad: un hexágono liso.
- En el tablero declarado, `tableroDeRiberas` manda `cifra: isla.numero === 0 ? '' :
  String(isla.numero)`, y `textoDeCara` del retablo escribe sólo el rótulo «duna».

### 6.3. Cómo se ve la duna, con el estiaje y sin él

**En tres dimensiones.** Dos piezas, y las dos baratas:

- La duna gana un **posavasos sin cifra y sin puntos**: el mismo disco crema de `Numero`,
  `circleGeometry(RADIO_DE_TESELA * 1,9, 44)`, **44 triángulos**, una llamada de dibujo,
  sin los guarismos y sin los círculos de probabilidad. Con él, la duna se lee como una
  casilla del tablero (que es lo que Miguel echó en falta) y sigue sin decir un número
  que no tiene (que es lo correcto).
- El estiaje se pinta con `MODELO.tienda`, que **ya está compilado** en `tablero.glb` y
  que **ya lo pinta** el componente `Ladron` de `delta.tsx` con `talla 3` sobre el centro
  de la comarca. Medido en el `.gltf` del pack (`arte/kaykit/hexagon-extra/.../decoration/props/tent.gltf`):
  **86 triángulos, una primitiva, un material**, caja de 0,516 en los tres ejes. A `talla
  3` eso son **8,47 unidades de mundo**, o sea 1,67 veces la casa de un colono
  (`ALTURA_DE_UNA_CASA` = 5,09) y 3,33 personas: se lee desde la vista de tablero sin
  agrandar nada.

  Se descartó el bote varado, que contaba mejor la metáfora del agua que baja: mide 132
  triángulos y su caja es 0,60 x 0,12 x 0,30, así que a `talla 3` levanta **1,97 de
  mundo, 0,39 casas**. Desde las seiscientas setenta unidades a las que mira la cámara de
  tablero es una mancha. Es la misma lección que `Senal` dejó escrita cuando quitó la
  flecha: lo que se lee a plomo tiene que estar pegado al suelo, pero también tiene que
  medir algo.

  El coste total en el delta son **130 triángulos** (86 de la pieza y 44 del posavasos),
  el 0,56 % de los 23.328 del mar (`TRIANGULOS_DEL_MAR`) y menos del 3 % del tope de la
  mesa (`TOPE_DE_LA_MESA` = 4.500).

**En dos dimensiones.** Nada nuevo en el mueble genérico: los tres campos que hacen falta
ya existen en `CaraDeTablero`.

- La isla donde está el estiaje escribe en su `rotulo` el terreno y la palabra: `vega ·
  estiaje`. Es el único texto que un lector de pantalla saca de una cara que no se toca,
  y `textoDeCara` lo dice en su cabecera.
- Su `borde` pasa del `#1d1f26` de todas al acento, que es lo que se ve sin leer.
- Su `cifra` **no cambia**: la isla bloqueada sigue enseñando su número, porque saber qué
  número está bloqueado es la mitad de la información.
- La duna sigue con `cifra: ''`, y eso ahora tiene una explicación en pantalla: encima de
  ella hay una pieza.

## 7. El estado, la vista y los secretos

**En `EstadoDeRiberas`:**

```
/** En qué isla está el estiaje. Público: se ve mirando el tablero. */
estiaje: LlaveDeHex | null;
/** ¿Falta mover el estiaje? Mismo mecanismo que `veredasGratis`. */
estiajePorMover: boolean;
/** Quién debe tirar fichas y cuántas le faltan. En el orden de `colonos`. */
descartes: Array<{ de: AsientoId; faltan: number }>;
```

`null` mientras la mesa se reúne, y `llaveDeHex` de la duna desde `repartirElDelta`. La
llave y no el `Hex`: es lo mismo que hacen las chozas y las veredas, se compara con `===`
sin escribir un comparador, y `llaveDeHex` y `hexDeLlave` ya existen en la malla.

**`estiajePorMover` es un `boolean` y no un tercer momento**, por lo mismo que
`veredasGratis` es un contador y no un momento: mientras vale `true`, `opcionesDeTurno`
no ofrece más que los dieciocho destinos (y revelar un título, que no es una jugada y se
ofrece siempre, por lo que dice su comentario). Es el mismo corte que ya hace
`if (v.veredasGratis > 0) { ...; return opciones; }`.

**En `VistaDeRiberas`,** los tres campos tal cual, públicos. Y `comoVista` los normaliza
en vez de exigirlos, por la razón ya escrita ahí para el mazo: lo que le llega es
`unknown` de verdad, puede venir de un cliente viejo o de `vistaDePrueba`, y un campo que
falta no puede apagar las reglas que no tienen que ver con él. `estiaje: null`,
`estiajePorMover: false`, `descartes: []` es exactamente «este juego todavía no tiene
estiaje», que es lo que hay hoy.

**En `comoSiSiempreHubieraHabidoMazo`,** los tres campos entran en la lista de lo que se
rellena. Las mesas de Riberas se guardan en disco y una partida larga dura días: sin esto,
una mesa escrita ayer revienta al proyectarla, y quien vuelve a su partida no ve «esta
versión no sabe abrir tu mesa», ve que la Sala no carga. Se rellena con «no había
estiaje»: la pieza aparece en la duna la primera vez que se proyecta.

**En `loSecretoDeRiberas`: nada.** El estiaje es público. Lo único que la regla nueva
mueve de secreto es la ficha robada, que ya viaja como debe, y las fichas descartadas, que
desaparecen.

**En `riberas-en-3d.ts`,** `deltaDeLaVista` deja de devolver `ladron: null` y devuelve la
comarca donde está la pieza, leyéndola de la vista con `hexDeLlave`. Ése es el fichero
donde vive hoy el nombre y por tanto el fichero donde se cambia.

## 8. El nombre

**La recomendación, y va fuerte: la pieza se llama EL ESTIAJE.** El estiaje deja de ser
«la suma que no rinde» y pasa a ser la pieza: el agua baja donde el estiaje se posa, y esa
isla se seca. La palabra ya está en el juego, ya significa lo que tiene que significar y
no viene de ninguna caja.

Lo que sostiene la recomendación, y no es sólo gusto:

- **La palabra ya explica la regla.** Un estiaje es una bajada de aguas, y lo que hace la
  pieza es secar una isla. «Ladrón» explica el robo pero no el bloqueo, que es la mitad
  más importante de la regla.
- **`ladron` es vocabulario de la caja original.** La cabecera de `riberas.ts` dedica un
  apartado entero a que en ninguna parte del fichero, del manifiesto ni de los rótulos
  aparezca el nombre de ningún juego publicado, y `verify:procedencia` barre las cadenas
  literales de esa carpeta. `ladron` no está hoy en esa lista negra, pero meterlo en los
  rótulos sería empezar a andar en la dirección contraria por comodidad.
- **Ya hay un sitio donde el nombre se rompe.** `escenas/tipos.ts` declara `ladron: Hex |
  null` en un contrato **genérico** de escena, que no es de Riberas y que otro juego
  hexagonal usará. Un contrato genérico no puede llamar a las cosas por el nombre que les
  da un juego. Ahí el campo debería llamarse por su efecto y no por su personaje.

Lo que se propone, con nombre y sitio:

| Dónde | Hoy | Propuesta |
|---|---|---|
| Pantalla, en las dos | (no existe) | **El estiaje** |
| `riberas.ts`, la suma | `ESTIAJE = 7` | `SUMA_DEL_ESTIAJE = 7` |
| `riberas.ts`, el estado y la vista | (no existe) | `estiaje: LlaveDeHex \| null` |
| `riberas.ts`, el movimiento | (no existe) | `MOVER_EL_ESTIAJE = 'riberas:estiaje'` |
| `riberas.ts`, el descarte | (no existe) | `DESCARTAR = 'riberas:descartar'` |
| `riberas-en-3d.ts` | `ladron: null` | lo lee de la vista |
| `escenas/tipos.ts`, contrato genérico | `ladron: Hex \| null` | `bloqueada: Hex \| null` |
| `delta.tsx`, el componente | `Ladron` | `Estiaje` |
| `nombres.ts` | `MODELO.tienda` | **no cambia**: es el nombre del modelo, no el de la regla |

`bloqueada` y no `estiaje` en `escenas/tipos.ts` a propósito: ese fichero dice de sí mismo
que el vocabulario de terrenos es de cada juego y que por eso `terreno` es una cadena
libre. Lo mismo vale aquí: el contrato dice **qué comarca no rinde**, y cómo se llame la
pieza que lo causa es cosa del juego.

Lo que se tumba, y por qué se deja escrito: llamarla `ladron` en el código y «El estiaje»
en pantalla. Es la solución de menos trabajo y es la peor de todas, porque deja el
vocabulario partido en dos y obliga a traducir mentalmente cada vez que se lee una
función. Este árbol ya tiene esa lección escrita en `compilar-modelos.ts` («si la escena
buscara por el nombre del pack, cambiar de pack sería tocar la escena entera»).

**Esto es una decisión de Miguel y está en el §13.**

## 9. Los dos clientes

### 9.1. El tablero en tres dimensiones: elegir la isla

**No hay mecanismo nuevo, y ésa es la mejor noticia del documento.** `escenas/sitios.ts`
declara tres clases de sitio desde que se escribió: `'vertice' | 'arista' | 'comarca'`.
Las dos primeras se usan para fundar y para trazar; **la tercera no se ha usado nunca**.
`sitiosDelTablero` ya construye las diecinueve comarcas, con su punto en el centro y su
altura ya consultada, y con la llave `${q},${r}`, que es **exactamente** lo que devuelve
`llaveDeHex` de la malla. Y `sitiosPermitidos` ya sabe filtrar por `clase: 'comarca'`.

Así que mover el estiaje es:

```
Colocando { clase: 'comarca', donde: [las 18 llaves de las opciones] }
```

y de ahí para adelante todo está escrito: `Senal` recibe un `Sitio`, pinta su anillo con
el tamaño constante en pantalla, y avisa con `onElegir` al **soltar** el puntero sobre el
cilindro invisible de agarre. Eso resuelve el dedo y el ratón de una vez, y con los dos
gestos que ya existen (pulsar el anillo, o arrastrar y soltar encima), por la razón que
está escrita en su comentario: `onPointerUp` y no `onClick`.

**Lo que sí hay que escribir, y es poco:** `obraPosible` de `riberas-en-3d.ts` **no
sirve** para esto, y no por pereza. Esa función deduce la clase del sitio con
`claseDeLlave`, que sólo conoce los prefijos `v:` y `a:` y devuelve `null` para una llave
de comarca como `0,-2`. Su deducción es una afirmación a propósito («una lista con un
vértice y una arista dentro no es una lista con dos clases: es un fallo»), y para el
estiaje no hay nada que deducir: hay una sola pieza y su clase es conocida. Así que va una
función hermana, `sitiosDelEstiaje(vista, quien)`, que devuelve `clase: 'comarca'`
**escrito** y la lista de las llaves. Lo que **no** se hace es darle prefijo `c:` a las
comarcas: eso cambiaría `sitios.ts` y todos los recuentos de `verify:escena` para
arreglar un problema que no existe.

**Lo que cuestan las señales.** Cada `Senal` son 88 triángulos: 56 del anillo
(`ringGeometry(0,4r, 0,78r, 28)`) y 32 del cilindro de agarre
(`cylinderGeometry(r, r, h, 8)`). Dieciocho señales son **1.584 triángulos**, y sólo
existen mientras hay que mover. Para comparar: la colocación inicial ya pinta hasta 54
señales, que son 4.752. O sea, **menos de un tercio de lo que el juego ya hace**.

**El aviso.** `avisoDe` gana dos ramas, y ninguna crece de tamaño porque la cinta del
tercio central del §2.2 de `docs/LA-MESA-DE-RIBERAS.md` pinta el mismo campo:
«Sacaste 7: mueve el estiaje.» / «Turno de Ana, que mueve el estiaje.» y
«Tira 3 fichas.» / «Se espera a Bruno, que tira 4 fichas.»

**Lo que no se toca.** Ni `baraja.ts`, ni `cartas.ts`, ni `barra.ts`, ni `camara.ts`. Las
señales de comarca viven sobre el tablero, que es la zona que el §4.4 de la mesa dejó
libre, y la mesa no cambia de alto.

### 9.2. El retablo en dos dimensiones

Todo cabe en lo que el mueble genérico ya pinta:

- Las caras de las islas pasan a llevar `toque` cuando son un destino legal. El tablero ya
  lo tiene previsto: `CaraDeTablero.toque` existe, `figuraDe` del retablo del escritorio
  hace tocable «una pieza con `toque`» sin saber qué es, y `unToqueDelTablero` de
  `verify:mesa` recorre las caras.
- El movimiento se saca de `porSitio` con la misma llave que ya usan las veredas y las
  chozas, y **se excluye de `acciones`**, igual que se excluyen `FUNDAR` y el `ALZAR` con
  sitio. Si no se excluyera, la lista de botones pasaría de tener tres o cuatro entradas a
  tener veintitrés en el turno del siete.
- El descarte **sí** va a `acciones`, porque un descarte no tiene sitio en el mapa: es
  exactamente el mismo caso que un trueque, y está escrito ahí («forzarlo a tener uno
  sería inventar geometría para una regla que no la tiene»).

Y hay un comentario del retablo que esto deja falso, apuntado en el §12: `textoDeCara`
esconde el texto de una cara tocable con `aria-hidden` para no decirlo dos veces, y lo
justifica con que «las diecinueve islas de Riberas no llevan `toque`, así que esconderlo
siempre habría dejado el mapa mudo». Con el estiaje, dieciocho de las diecinueve lo llevan
justo en el momento en que hay que elegir. Lo que se oiga entonces hay que decidirlo y
escribirlo: el nombre del botón tiene que llevar dentro el terreno y la cifra, o el mapa
se queda mudo justo cuando importa.

## 10. Dónde vive cada cosa

| Qué | Fichero | Nombre |
|---|---|---|
| La suma que activa | `shared/arcade/juegos/riberas.ts` | `SUMA_DEL_ESTIAJE` |
| Dónde está la pieza | `shared/arcade/juegos/riberas.ts` | `EstadoDeRiberas.estiaje` |
| Que falta moverla | `shared/arcade/juegos/riberas.ts` | `EstadoDeRiberas.estiajePorMover` |
| Quién debe descartar | `shared/arcade/juegos/riberas.ts` | `EstadoDeRiberas.descartes` |
| El momento nuevo | `shared/arcade/juegos/riberas.ts` | `MomentoDeRiberas`, `'descartando'` |
| Los movimientos | `shared/arcade/juegos/riberas.ts` | `MOVER_EL_ESTIAJE`, `DESCARTAR` |
| Quién puede mover ahora | `shared/arcade/juegos/riberas.ts` | `opcionesDeDescarte`, dentro de `opcionesDeRiberas` |
| El bloqueo | `shared/arcade/juegos/riberas.ts` | `repartirLaCosecha`, una línea |
| El robo, una sola vez | `shared/arcade/juegos/riberas.ts` | extraído de `jugarLaGuardia` |
| Qué pasa al vencer el plazo | `shared/arcade/juegos/riberas.ts` | `venceElPlazo` |
| El plazo de pared | `server/src/arcade/mesas.ts` | `plazoSegundos`, `empiezaTurnoNuevo` |
| La comarca que no rinde, en la escena | `escenas/tipos.ts` | `DeltaEn3D.bloqueada` |
| Cómo llega a la escena | `shared/arcade/juegos/riberas-en-3d.ts` | `deltaDeLaVista` |
| Dónde se puede soltar | `shared/arcade/juegos/riberas-en-3d.ts` | `sitiosDelEstiaje` |
| Los sitios de comarca | `escenas/sitios.ts` | `sitiosDelTablero().comarcas`, ya escrito |
| El anillo y el agarre | `escenas/delta.tsx` | `Senal`, sin cambios |
| La pieza | `escenas/delta.tsx` | `Estiaje` (hoy `Ladron`), `MODELO.tienda` |
| El posavasos de la duna | `escenas/delta.tsx` | dentro de `Numero`, sin cifra |
| La isla tocable en el retablo | `shared/arcade/juegos/riberas.ts` | `tableroDeRiberas`, `caras[].toque` |

## 11. Cómo se midió

Cinco guiones en el scratchpad de la sesión, corridos con `node_modules/.bin/tsx` desde
el worktree. Ninguno escribe nada y ninguno vive en el árbol: importan
`shared/arcade/juegos/riberas.ts`, `shared/arcade/motor.ts` y
`shared/mecanicas/malla-hexagonal.ts` de verdad, y juegan partidas eligiendo al azar de
lo que devuelve `opcionesDeRiberas`, que es exactamente lo que hace un jugador a ciegas.
El azar de la elección es un generador propio con semilla, para que las medidas se puedan
repetir; el del juego es el suyo.

- **`medir2.ts`**: doce partidas de dos a cinco colonos, 14.400 pasos. De aquí salen los
  148 sietes, las 468 manos miradas, el 51,1 % por encima de siete fichas, la mano máxima
  de 107, la media de 11,03 al sacar un siete (p90 23, p99 71) y las opciones por turno
  (media 14,67, p50 13, p90 25, máximo 37).
- **`medir3.ts`**: las mismas partidas contando lo que costaría cada forma del descarte.
  Los repartos distintos se cuentan con programación dinámica sobre las cinco clases (no
  con una fórmula cerrada, porque cada clase tiene su tope). De aquí: media 24,36, p50 8,
  p90 42, máximo 713; y las manos de manual: 8 fichas dan 26 repartos, 9 dan 30, 12 dan
  62, 16 dan 172 y 26 dan 802.
- **`medir4.ts`**: el mismo juego **con la regla puesta a mano** encima del estado, que
  es lo que permite decir qué mide un descarte cuando la regla existe. De aquí: mano
  máxima 26, media al siete 6,21 (p90 10, p99 16), 26,8 % de manos por encima de siete, y
  las fichas que se tiran (media 4,91, p50 4, p90 7, máximo 13).
- **`medir5.ts`**: las víctimas contadas **con los seis vértices de verdad**
  (`verticesDeHex`) y no comparando cadenas. La primera pasada lo hizo con
  `vertice.includes(llaveDeIsla)` y sobrecontaba, porque una llave de vértice lleva tres
  hexágonos dentro y `1,-2` aparece dentro de `-1,-2`: daba un máximo de 4 víctimas por
  isla donde el máximo real es 2. Queda escrito porque es el error que un guion de medida
  puede cometer sin fallar. De aquí, ya corregido: 19 islas, 54 vértices; piezas por isla
  media 0,69 y máximo **3** (reparto 0..3: 1.217, 1.254, 339, 2); víctimas por isla media
  0,44 y máximo 2; opciones de mover con víctima media 18,73, mínimo 18, p90 20, máximo
  23; islas completamente libres por siete media 8,22 y **mínimo 2**; islas sin ninguna
  pieza propia, mínimo 13.
- **La lectura del pack**: los `.gltf` de `arte/kaykit/hexagon-extra/.../decoration/props/`
  leídos como JSON, sumando `accessors[primitive.indices].count / 3` por primitiva. De
  aquí: `tent` 86 triángulos, 176 vértices, 1 primitiva, 1 material, caja 0,516 en los
  tres ejes; `boat` 132 triángulos y caja 0,60 x 0,12 x 0,30; `anchor` 224;
  `resource_stone` 220. Y de `escenas/escala.ts`: `ESCALA_DEL_PACK` = 5,4688,
  `RADIO_DE_TESELA` = 6,315, `RADIO_DE_COMARCA` = 75,78, de donde salen los 8,47 de mundo
  de la tienda a `talla 3` y los 1,97 del bote.

**Comprobadores corridos para escribir esto:** `verify:riberas`, verde, **349
comprobaciones**. Los recuentos de los demás se citan como los deja escritos
`docs/LA-MESA-DE-RIBERAS.md` §11 con la fase 3 aterrizada: `verify:mesa` 856,
`verify:escena` 335, `verify:escritorio` 400, `verify:sala` 152,
`verify:riberas-en-tres` 295, `verify:dados` 27, y la batería `npm run verificar` con 76
comprobadores.

**Lo que NO se ha medido y hay que medir al hacerlo:** cuántas revisiones cuesta de verdad
un siete en una mesa de seis con el descarte encadenado; cuánto tarda `verify:mesa` con el
momento nuevo dentro de su bucle; y si los dieciocho anillos de comarca se leen en un
lienzo de 320 puntos de alto sin taparse entre ellos, que es cosa de mirar y no de contar.

## 12. Lo que choca con lo escrito

Esto es lo caro de revocar una decisión en esta casa: hay comentarios que la defienden, y
un comentario que defiende lo contrario de lo que hace el código es peor que no tener
comentario. Van uno a uno, con el fichero, lo que dice y por qué cambia.

1. **`riberas.ts`, la constante `ESTIAJE`.** «Cuando el dado saca siete el agua baja y las
   islas no producen. Y no pasa nada más: ni se roba, ni se descarta, ni se mueve ninguna
   pieza. Es a propósito, el castigo por acumular es la clase de regla rica que este juego
   no necesita para demostrar lo que la fase tiene que demostrar.» Se reescribe entera: el
   argumento era de la fase 4, cuando lo que había que demostrar era que el motor era
   agnóstico; ahora lo que hay que demostrar es que el juego se juega. La constante además
   se renombra a `SUMA_DEL_ESTIAJE`.

2. **`riberas.ts`, la cabecera del fichero, apartado «LO LEGAL».** «Lo que SÍ se decidió
   aquí son cuatro números y una regla: doce veredas, ocho puntos para ganar, mínimo de
   cuatro veredas para que el Vado Largo exista, y el ESTIAJE (al sacar siete no rinde
   nadie y no pasa nada más). Esa última es la que más cambia cómo se juega.» **Ésta es la
   más importante de todas**, porque esa cabecera existe justamente «para que nadie más
   tenga que comprobarlo» y porque su primera versión se adornó y hubo que contrastarla
   número a número. La regla deja de ser propia y pasa a ser la de la familia. Hay que
   decirlo con esas palabras y en ese sitio, y quitar la frase de que es la que más cambia
   cómo se juega, porque desde ahora lo que cambia cómo se juega es lo contrario.

3. **`riberas.ts`, `procedencia`.** «El código, el nombre, el arte, los seis terrenos, los
   cinco bienes, **el estiaje**, el Vado Largo con su mínimo, el número de puntos y todos
   los textos se escribieron en este fichero.» El estiaje sale de esa lista y pasa a la de
   abajo, la de lo que la etiqueta **no** afirma: la mecánica tiene género y el bloqueo con
   robo es de ese género. Lo que sigue siendo propio es el nombre y su lectura (el agua que
   baja), no la mecánica.

4. **`riberas.ts`, la cabecera de `jugarLaGuardia`.** «RIBERAS NO TIENE ESA PIEZA: su
   desgracia es el ESTIAJE, que no ocupa una isla sino que corta la producción del turno.
   Así que la guardia hace lo OTRO que hacía aquella carta, que es robar.» Se revoca la
   premisa y se conserva el resto: el robo al azar del estado y el viaje de la ficha
   entera se quedan tal cual, y el comentario que los defiende también.

5. **`riberas.ts`, la cabecera, apartado del mazo.** «Y lo que la Guardia NO hace: mover
   una pieza de la desgracia por el tablero. Este juego no la tiene.» Ahora la tiene.

6. **`riberas.ts`, la ayuda de la opción de tirar.** «Las islas con esa suma rinden a quien
   las toca. Con siete no rinde nadie.» Sigue siendo verdad y se queda corta: hay que
   añadir lo que pasa además.

7. **`riberas-en-3d.ts`, la cabecera de `deltaDeLaVista`, apartado «Y NO HAY LADRÓN».**
   «Riberas no lo tiene... `ladron` sale siempre `null`, y eso no es un hueco por rellenar:
   es que este juego no tiene esa pieza. **Cuando el estiaje quiera verse, será otra cosa y
   tendrá su propio campo.**» La primera mitad se revoca; **la última frase se cumple**, y
   conviene decirlo así al reescribirla: es otra cosa, se llama estiaje y tiene su propio
   campo.

8. **`escenas/tipos.ts`.** `/** Dónde está el ladrón, o `null` si no hay ninguno en el
   tablero. */ ladron: Hex | null;` en un contrato genérico de escena que dice de sí mismo
   que no cierra el vocabulario de los juegos. Pasa a `bloqueada`, con el comentario
   diciendo qué significa (esa comarca no rinde) y no quién la ocupa.

9. **`escritorio/src/retablo.tsx`, la cabecera de `textoDeCara`.** «En una cara que no se
   toca, este texto es lo ÚNICO que un lector tiene del terreno: las diecinueve islas de
   Riberas no llevan `toque`, así que esconderlo siempre habría dejado el mapa mudo.» Deja
   de ser cierto en el turno del siete, que es cuando más importa. Hay que decidir qué se
   oye entonces (§9.2) y reescribirlo con la decisión dentro.

10. **`docs/LAS-CARTAS-DE-RIBERAS.md`, §1.7 y la línea del §7.** «La Guardia roba, y no
    mueve a nadie... **Riberas no tiene ladrón**» y «Ladrón y estiaje: el siete no hace
    nada todavía, y esto no lo cambia». Las dos se revocan, y como ese documento es la
    fuente de las decisiones del mazo, la revocación se anota ahí con la fecha y con quién
    la firma, no se borra.

11. **`server/scripts/verificar-riberas.ts`, el paso «La producción por dados, y el
    estiaje».** Su comprobación «ninguna isla lleva el siete, así que el estiaje no puede
    rendir» **sigue siendo verdad y se queda**. Lo que hay que mirar es el resto del
    bloque, que hoy afirma que con siete no pasa nada: una comprobación escrita contra la
    regla vieja que se pone verde con la nueva sin tocarla no es una comprobación que haya
    aguantado el cambio, es una que no estaba mirando. Es exactamente la lección que dejó
    escrita `VADO_MINIMO` al pasar de cuatro a cinco.

## 13. Para Miguel

Cuatro cosas, con una recomendación cada una.

| Qué hay que decidir | Recomendación | Por qué |
|---|---|---|
| **Cómo se llama la pieza** | **El estiaje**, en pantalla y en el código, y `ladron` desaparece del vocabulario | La palabra ya está en el juego y explica el bloqueo, que es la mitad que «ladrón» no explica. Y el nombre de la caja original en los rótulos es andar hacia atrás en lo que la cabecera de `riberas.ts` defiende (§8) |
| **El siete de la casilla de la duna** | **No se le pone número**, y a cambio se le pone posavasos y pieza | Con dos dados el siete sale 6 veces de 36 y el dos 1: una isla con siete rendiría seis veces más que la peor. Y el siete es la suma que activa la pieza, así que esa isla produciría el turno en que nadie produce. Lo que falta no es un número, es que se vea la pieza (§6) |
| **Cuánto se espera al que no descarta** | **El plazo de la mesa, y luego se descarta por él**, tirando sus fichas más viejas y por todos a la vez | No se inventa un reloj dentro del juego, que un reductor puro no puede mirar. Y drenando de uno en uno, una partida larga costaría hasta seis días por un siete (§2.4) |
| **La pieza que se pinta** | **La tienda del pack**, que ya está compilada y ya se pinta | 86 triángulos, una llamada de dibujo, 8,47 de mundo (1,67 casas): se lee desde la vista de tablero. El bote varado cuenta mejor la historia del agua que baja y mide 1,97 de alto: desde 670 unidades es una mancha. Si aun así lo prefieres, se cambia en una línea y se mide en el banco (§6.3) |

Y una cosa que **no** es una decisión y conviene que sepas: las otras dos peticiones de tu
mensaje (el trueque de varios bienes y varias unidades con aceptación confirmada, y la
descripción de las cartas al pasar el ratón) no están en este documento. Son otros dos
encargos: el primero toca `BIENES_POR_LADO_DEL_TRUEQUE` y `opcionesDeTrueque`, que tienen
su propio porqué escrito, y el segundo es de pantalla y no de reglas.

## 14. Lo que NO entra

No entra: cambiar el trueque; las descripciones de las cartas al pasar el ratón; puertos;
que el estiaje se pueda mover fuera del delta; una segunda pieza; el descarte con reloj
propio distinto del de la mesa; que la vista diga qué ha descartado cada cual; una
animación de la pieza viajando de isla en isla (aparece en la nueva, como aparecen las
chozas); tocar `barra.ts`, `baraja.ts`, `cartas.ts` ni `camara.ts`; y ninguna regla más
que las que Miguel escribió.

## 15. El orden, en fases que se empujan una a una

Cada fase deja el juego entero y verde, y ninguna depende de la siguiente.

1. **La pieza, el bloqueo y el robo. Sin descarte.** El renombrado a `SUMA_DEL_ESTIAJE`;
   `estiaje` y `estiajePorMover` en el estado y en la vista, con su relleno en
   `comoSiSiempreHubieraHabidoMazo` y su normalización en `comoVista`; el estiaje naciendo
   en la duna en `repartirElDelta`; la línea de `repartirLaCosecha`; el movimiento
   `MOVER_EL_ESTIAJE` con la isla y la víctima dentro; el robo extraído de `jugarLaGuardia`
   y llamado desde los dos sitios; `opcionesDeTurno` cortando con `estiajePorMover` como
   corta con `veredasGratis`; `venceElPlazo` moviendo por el ausente sin robar y sin gastar
   azar; el `toque` en las caras del tablero declarado y su exclusión de `acciones`; y el
   aviso.
   **Comprobadores:** `verify:riberas` gana el bloque del estiaje (mover es obligatorio y a
   otra isla; la isla del estiaje no rinde; sólo se roba a quien tiene pieza ahí y algo en
   la mano; el tic mueve sin gastar azar) **con su vacuna cada uno**: quitar el `continue`
   de `repartirLaCosecha` tiene que poner rojo algo, y quitar la comprobación de «a otra
   isla» también. `verify:mesa` sigue en 856 y su bucle sigue jugando.
   **Lo visible:** al sacar un siete hay que mover, y una isla deja de rendir.

2. **El descarte.** El momento `'descartando'`, `descartes` en el estado y en la vista,
   `turnoDe` apuntando al primero que falta, las opciones ficha a ficha, el
   `DESCARTAR` en `acciones`, y el tic descartando por todos con las fichas más viejas.
   **Comprobadores:** que el descarte se ofrece a quien no tiene el turno; que tira
   exactamente `floor(n/2)`; que quien tiene siete o menos no descarta (la vacuna: con
   ocho sí); que el tic resuelve el de todos; y **la comprobación que sostiene la decisión
   2**: que jugando a ciegas leyendo `turnoDe` la partida atraviesa un siete con manos
   grandes y llega al final, con el recuento de revisiones delante para que el verde no
   sea por conjunto vacío. `verify:larga` gana una vuelta con un siete y un plazo vencido
   en medio.
   **Lo visible:** con más de siete fichas, un siete duele.

3. **La guardia mueve.** `jugarLaGuardia` pierde el `!estado.tirado`, `opcionesDelMazo` se
   ofrece también antes de tirar, y la carta pasa a mover y robar desde la isla sin
   descarte. `GUARDIA_MINIMA`, `PUNTOS_DE_LA_GUARDIA` y La Mayor Guardia intactos.
   **Comprobadores:** que la guardia se puede jugar sin haber tirado (vacuna: y que sigue
   sin poder jugarse la comprada hoy, y sigue siendo una por turno); que jugarla **no**
   llena `descartes` aunque haya manos de nueve; y que La Mayor Guardia sigue cambiando de
   dueño sólo por superación estricta.
   **Lo visible:** catorce cartas de veinticinco pasan a valer lo que valen.

4. **El tablero en tres dimensiones.** `bloqueada` en `escenas/tipos.ts`, `deltaDeLaVista`
   devolviéndola, `sitiosDelEstiaje` en `riberas-en-3d.ts`, el `Colocando` de clase
   `'comarca'`, el componente renombrado a `Estiaje`, y el posavasos sin cifra de la duna.
   **Comprobadores:** `verify:escena` cuenta los 130 triángulos nuevos, exige que la duna
   lleve posavasos y no lleve cifra, y que las señales de comarca sean 18 y ninguna sea la
   de ahora. Y en el banco (`escritorio/banco3d.html`, que ya trae un `ladron: { q: 0, r:
   -2 }` escrito a mano en `banco3d.tsx`) se mira con ojos: que la tienda se lee a 23
   puntos, que los dieciocho anillos no se pisan en el lienzo más pequeño, y que la pieza
   no tapa el número de su isla.
   **Lo visible:** se ve dónde está el estiaje y se mueve con el dedo.

5. **Las mil partidas.** El comprobador caro y lento, en la batería como los otros lentos:
   mil partidas a ciegas de dos a seis colonos, y tres afirmaciones sobre las mil:
   **(a)** ninguna isla rindió nunca teniendo el estiaje encima, con el recuento de
   cuántas veces salió el número de la isla bloqueada delante, para que el verde no sea por
   conjunto vacío; **(b)** ningún almacén pasó de siete fichas después de resolverse un
   siete; **(c)** ninguna partida se quedó sin opciones para nadie. Con su vacuna: quitando
   la línea del bloqueo, (a) se pone roja; quitando el descarte, (b) se pone roja.
   **Lo visible:** nada. Es el comprobador que hace que lo de arriba siga siendo verdad
   dentro de un año.
