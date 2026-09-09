# El ladrón de Riberas

> Si algo de aquí no coincide con el código, gana el código. Este documento recoge las
> decisiones y su porqué. Se escribió el 6 de septiembre de 2026, sobre la rama
> `lobby-catan`, con el código en `6372bc7` más la fase 4 de la mesa sin confirmar, a
> partir de lo que Miguel escribió después de jugar una partida entera.
>
> **Segunda versión, después de dos revisiones**, y lo que cambió no es cosmético: el
> corte de `estiajePorMover` estaba puesto donde la guardia antes de tirar (que es justo
> lo que Miguel pidió) no habría movido nada (§7, §3 y las fases 1 y 3); el aviso del
> descarte elegía por `turnoDe`, y con dos descartando eso le dice al segundo que espere
> mientras tiene los botones delante (§9.1); las medidas de mano no decían con cuántos
> colonos ni con qué política estaban tomadas, y dependen de las dos más que de ninguna
> otra cosa (§0 y §11); y el jugador ciego que se daba por vigilante no juega a esto
> (§2.5). Se añaden el turno que nadie había descrito (§3), dónde vive el toque del
> descarte con lo que eso le hace al bucle de `verify:mesa` (§2.5 y §12), y la fase del
> jugador ciego (§15, fase 5), que es de este documento porque el estiaje va primero y
> porque su descarte es lo único que puede colgar un bucle.
>
> **Tercera versión, y lo que se arregla aquí es que el documento NO ERA EJECUTABLE.** Las
> dos primeras se leían bien y no se podían seguir al pie de la letra, que es peor que
> equivocarse en voz alta, porque un documento que se lee bien se empuja. Cuatro cosas:
> (1) la fase 1 pedía la guarda de `tirarLosDados` y **no pedía la línea que enciende la
> bandera**, así que ejecutada literalmente entregaba la pieza, la vista, el bloqueo, los
> dieciocho destinos, el corte y el comprobador, y salía **verde con un estiaje que no se
> activa jamás** (§15.1, fase 1); (2) el descarte estaba escrito en dos sitios
> incompatibles —el §10 lo ponía en `opcionesDeRiberas` y el §2.2 y el §2.3 en
> `opcionesDeTurno`—, y con el segundo, en `'descartando'` la mesa se queda **sin ninguna
> opción para nadie**, porque `opcionesDeRiberas` despacha por momento y `opcionesDeTurno`
> sólo se alcanza en `'jugando'` (§2.2); (3) el movimiento de mover no traía **ni la forma
> de su carga ni su `id`**, y el `id` es justamente de lo que cuelga el retablo, que en una
> mesa de cinco o seis es la única pantalla que hay (§1 decisión 5, §4, §5 y §9.2); y (4)
> la afirmación (d) de la fase 5 estaba redactada de una manera aquí y de otra en
> `docs/EL-TRUEQUE-DE-RIBERAS.md`, que además apoya en esa fase una marca, `declaracion`,
> que este documento no nombraba ni una vez (§15.1, fase 5). Se añaden además el orden
> global de las **nueve** fases de los tres encargos (§15.0) y la etiqueta de tanda y de
> reejecución de cada número medido (§11).
>
> **Cuarta versión, y es la primera que se escribe con el código delante: LA FASE 1
> ATERRIZÓ, en `958962a`.** Lo que hace esta pasada es dejar de contar la fase 1 como un
> plan y contarla como lo que hay, con lo que trajo y con los recuentos medidos al
> aterrizar (`verify:riberas` 423, `verify:mesa` 2.915 con **32 sietes jugados de
> verdad**, `verify:riberas-en-tres` 343, `verify:escritorio` 458; batería 76 de 76 en
> verde). Van escritas aparte las **seis decisiones que este documento no terminaba de
> decir** y que se decidieron al escribir el código (§1 bis), y las **tres cosas que
> cambiaron respecto a lo escrito**, que son lo más importante de la vuelta:
>
> (a) **El filo no bastaba, y estaba medido con la cinta equivocada** (§6.3, §9.2 y
> §12.14). Este documento defendía el turquesa con 42,1 de CIE76 contra los rellenos, y
> esa cuenta contesta a otra pregunta: «¿se confunden dos rellenos puestos al lado?». La
> de un TRAZO sobre el relleno que lo rodea es 3:1 de luminancia, que esta casa ya tiene
> escrita en `app/src/arcade/retablo.tsx`. Medido, el turquesa da 1,1:1 sobre la salina,
> 1,3:1 sobre la duna donde el estiaje nace y 1,4:1 sobre la vega. Y no hay color que lo
> arregle solo. La salida es que la isla seca se pinta **en penumbra**, que es un área y
> no un filo; el filo se queda como refuerzo.
>
> (b) **El tablero de tres dimensiones YA LO DIBUJA, y eso no era la fase 4** (§9.1,
> §12.7 y §15.1). El componente que planta la tienda, su sitio sobre el relieve y el
> modelo estaban escritos desde hacía tiempo, y lo único que llegaba era `null`. Se
> adelantó porque sin ello, en una mesa de dos a cuatro colonos (que son las que se juegan
> de verdad, porque el retablo sólo entra con cinco o seis), un siete habría secado una
> isla sin que se viera cuál. Lo que sigue siendo de la fase 4 es SOLTAR la pieza sobre
> una comarca.
>
> (c) **Tres arreglos de comprobación**, que salieron al ver caer las nuevas (§12.15).
>
> Y una nota que afecta a los otros dos documentos: **el bucle de Riberas de
> `verificar-mesa.ts` ya no se atasca** (`3942556`), así que la regla del estiaje sí se
> ejercita ahí. Eso cambia lo que el §13 decía sobre los dos testigos, y está reescrito.
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
> escriben nada. Este encargo sigue siendo de diseño: al escribir esta cuarta versión no
> se ha tocado ni una línea de código, y lo que se cuenta de la fase 1 se ha leído del
> que ya está confirmado en `958962a`. Los recuentos de comprobadores de esta versión
> son los de ese commit y están en el §11.3.
> **Y cada número lleva ahora dos etiquetas y no una: de qué tanda es, y si su guion se
> reejecutó o no.** El §11.2 dice cuáles se volvieron a correr en la tercera vuelta, cuáles
> se quedan sin reejecutar y por qué el reparo de fondo no se arregla reejecutando.

## 0. Qué había al sacar un siete, y qué se perdía con ello

> **Esto es el ANTES, y se queda escrito en pasado porque es lo que sostiene todo lo
> demás.** Desde `958962a` un siete hace lo que dice el §15.1 fase 1. Lo que sigue es el
> estado del código hasta ese commit y el argumento que lo movió, y no se borra por lo
> mismo que no se borra la revocación: quien lea esto dentro de un año tiene derecho a
> saber por qué la regla entró.

`tirarLosDados` gastaba dos tiradas de `enteroEntre`, sumaba, y si la suma era siete devolvía
el estado con `ultimaTirada: 7` y nada más. La rama entera era una línea:

```
if (suma === ESTIAJE) return conLaTirada;
```

No hay descarte, no hay robo, no hay pieza y no hay isla bloqueada. La duna, que es la
única isla que no rinde, se reparte con `numero: 0` y se queda ahí toda la partida sin
hacer nada. En el tablero declarado su cara sale con `cifra: ''` y en el de tres
dimensiones con `cifra: null`, así que `delta.tsx` no le pinta el `Numero` y la isla
queda sin posavasos, sin círculo y sin cifra. **Eso es exactamente lo que Miguel vio y
describió**: «la tesela de ladrón no aparece como casilla, ni círculo blanco ni número».

Lo que se pierde sin la pieza, dicho con números medidos y no con adjetivos. **Y con la
advertencia delante, que en la primera versión faltaba y es la mitad del dato: una medida
de mano NO ES UN NÚMERO DEL JUEGO, es un número del juego MÁS el bot que lo jugó MÁS
cuánta gente había en la mesa.** Los números se mueven tanto con esas dos cosas que
darlos sueltos invita a compararlos con los de otro documento y sacar la conclusión
contraria; el §11 dice de dónde sale cada uno y aquí van etiquetados.

**Con un bot que elige UNIFORMEMENTE de `opciones()` completa** (o sea, de la unión de lo
que se le ofrece a cada sentado, que es lo que hará el comprobador de la fase 5) sobre
doce partidas por mesa y unos 14.300 pasos por mesa (`medir6.mts`):

| Colonos | Sietes | Manos miradas al siete | Por encima de siete | Mano media | Mano máxima |
|---|---|---|---|---|---|
| 2 | 234 | 468 | **64,7 %** | 13,35 | **65** |
| 3 | 154 | 462 | 26,0 % | 6,14 | 40 |
| 4 | 105 | 420 | 17,9 % | 5,04 | 26 |
| 5 | 92 | 460 | 18,5 % | 4,80 | 27 |
| 6 | 81 | 486 | 13,4 % | 4,46 | 19 |

Léase la primera columna antes que ninguna otra: **con dos colonos dos de cada tres manos
pasan de siete, y con seis lo hace una de cada siete.** Es el mismo juego. Lo que cambia
es que con seis en la mesa cada isla que rinde se reparte entre más gente y cada uno
construye antes de acumular. Las cinco mesas juntas dan 28,2 % de 2.296 manos, mano
máxima 65 y 7,21 fichas por descarte de media; ése es el número que sale si se mezclan
las mesas, y es el que la primera versión daba sin decir que era una mezcla.

**Y el número que NO depende del bot,** que es el que de verdad cierra el argumento: un
jugador que **CONSTRUYE EN CUANTO PUEDE** (la misma preferencia que ya usa el paso «Una
partida entera, con el árbitro, y reejecutada» de `verificar-riberas.ts`: tirar, torre,
fundar, vereda, pasar) es el jugador que menos puede acumular de todos los que se pueden
escribir, porque gasta todo lo que la ley le deja gastar en el instante en que puede. Aun
así, en 59.549 pasos y 4.767 sietes de dos a seis colonos (`medir6.mts` y `medir8.mts`):

| Qué | Medida |
|---|---|
| Manos miradas al sacar un siete | 19.493 |
| Por encima de siete fichas | 18.286 = **93,8 %** |
| Mano máxima | **831 fichas** |
| Fichas que tiraría un descarte, de media | 80,31 |

Y por qué acumula tanto quien gasta todo lo que puede, medido y no supuesto
(`medir9.mts`): de 1.681 manos grandes, **el 26,7 % era de alguien que ya tenía puestas
las doce veredas** de `TOPE_DE_PIEZAS`, y ninguna era de alguien con las nueve piezas de
vértice puestas. O sea que la mitad larga del problema no son los topes: es que **no hay
en qué gastar**. Sin trueque que compita y sin castigo por guardar, el almacén sólo
crece. Un almacén de ochocientas treinta y una fichas no es un juego con un
desequilibrio: es un juego donde guardar no cuesta nada, y donde por tanto el trueque, la
compra de cartas y La Guardia sólo compiten contra sí mismos.

Las medidas de la primera versión (mano máxima **107**, mano media 11,03 al siete, 51,1 %
por encima de siete; y con el descarte puesto a mano encima del estado, máxima 26, media
6,21, 26,8 %) salen de `medir2.ts` y `medir4.ts` (**primera vuelta, reejecutados en la
tercera y confirmados uno a uno**, §11.2), con un bot uniforme sobre una tanda
**mezclada de dos a cinco colonos**. Se quedan porque siguen siendo verdad de esa tanda,
y ahora dicen de qué tanda son.

Y con eso se resuelve la contradicción aparente con el otro documento, que hay que dejar
resuelta por escrito porque los dos se van a leer seguidos. El §1.4 de
`docs/EL-TRUEQUE-DE-RIBERAS.md` mide **mediana 6 y p90 21** bienes en mano
(`medir-la-factura.ts`, §D) sobre **ocho partidas de CUATRO colonos** jugadas a ciegas
eligiendo uniformemente de `opciones()` de toda la mesa. Es exactamente la misma política
que la tabla de arriba, y a cuatro colonos ésta da mano media 5,04 al sacar un siete y
máxima 26. **No se contradicen: dicen lo mismo de la misma mesa.** Lo que chocaba era el
107, que es de una tanda mezclada de dos a cinco donde las mesas de dos (las de dos
tercios de manos grandes) arrastran la cola entera. Ninguna de las dos cifras significa
nada sin su etiqueta, y por eso a partir de aquí todas la llevan.

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
   toca la cabecera del fichero, la de `NUMEROS_DE_LAS_ISLAS`, `tirarLosDados` y el §12
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
   tira.** Medido sobre los 148 sietes de doce partidas a ciegas de **dos a cinco colonos
   mezcladas, bot uniforme, 14.400 pasos** (`medir3.ts`, primera vuelta, **reejecutado**): los
   repartos distintos de un descarte salen a 24,36 de media, 42 en el percentil 90 y
   **713 en el peor caso**. Con la regla ya puesta, la mano más grande que se vio son 26
   fichas (`medir4.ts`, misma tanda, **reejecutado**), y una mano de 26 repartida
   (7,6,5,4,4) da **802 repartos distintos**; ese 802 **no lo imprime ningún guion**, y no
   hace falta que lo imprima: es el número de composiciones acotadas que suman trece con
   topes 7, 6, 5, 4 y 4, y se recomprueba con esos cinco topes delante en las cinco líneas
   de programación dinámica que el §11.2 deja escritas. Ficha a
   ficha son **cinco opciones como mucho, siempre**, una por clase de bien que quede en
   la mano, sean cuantas sean las fichas; medido, la mano de un descarte tiene 2,51
   clases distintas de media y cuatro como máximo. Y es exactamente el mecanismo que el
   juego ya tiene escrito dos veces, `faltaVereda` y `veredasGratis`: un contador en el
   estado, y `opciones()` que mientras el contador no llegue a cero no ofrece otra cosa.
   El precio es que un descarte cuesta varias revisiones en vez de una: 4,91 fichas de
   media, 7 en el percentil 90 y 13 en el peor caso medido (`medir4.ts`, primera vuelta,
   **reejecutado**: 152 sietes, 482 manos, 26,8 % por encima de siete).

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
   dos. **Y la carga y el `id` de ese movimiento van escritos aquí, con esas letras**,
   porque la segunda versión decía «con la isla y la víctima dentro» sin decir en qué
   campos, y dos agentes distintos habrían escrito dos cargas distintas: el descarte sí
   traía la suya (`{ tipo: DESCARTAR, carga: { bien } }`) y ésta no, y de ella cuelga el
   retablo, que en una mesa de cinco o seis es la única pantalla que hay (§9.2).

   ```
   export const MOVER_EL_ESTIAJE = 'riberas:estiaje';
   // carga: { donde: LlaveDeHex, a: AsientoId | null }
   // id:    `estiaje:${donde}:${a ?? 'nadie'}`
   ```

   **Los dos campos ya tienen lector escrito en el fichero, y por eso se llaman así y no
   de otra manera.** `donde` es el campo de sitio del `ALZAR` (`carga: { que, donde }`) y
   lo lee `dondeDeLaCarga`; `a` es el campo de víctima de `JUGAR_LA_GUARDIA` (`carga: {
   carta, a }`) y lo lee `campoDeTexto(movimiento.carga, 'a')`. Elegir `isla` o `hex` para
   lo primero, o `victima` para lo segundo, sería estrenar dos lectores de carga para
   decir lo que el fichero ya sabe decir. Y `a: null` no es un hueco: es «se mueve y no se
   roba», que es el caso del §5 y el que hace que mover siga siendo obligatorio.

   **El `id` lleva la víctima dentro, y eso no es adorno.** Un `id` es único por opción
   —`porSitio` de `tableroDeRiberas` y la lista de `acciones` lo usan como llave— y una
   isla puede tener dos víctimas (medido: 108 islas de 2.812 tenían dos, `medir5.ts`,
   primera vuelta, **reejecutado**). Con
   el `id` sólo de la isla, las dos opciones colisionarían y una de las dos víctimas
   dejaría de poder elegirse sin que nada se pusiera rojo. Cómo llega cada una al retablo
   está en el §9.2, y el reparto medido dice lo que cuesta: 18 destinos siempre, 18,73
   opciones de media y 23 como máximo, o sea de cero a cinco de más.

   Medido: los destinos son siempre **18** (las diecinueve islas menos la de
   ahora), y metiendo la víctima en la misma opción la lista sube a **18,73 de media, 20
   en el percentil 90 y 23 como máximo** en 148 sietes (`medir5.ts`, primera vuelta,
   reejecutado). El tope duro son
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

11. **El corte de `estiajePorMover` va ANTES del `if (!v.tirado)`, y no después.** Ésta
    es la corrección más cara de la segunda versión, porque la primera decía «corta como
    corta con `veredasGratis`» y el corte de `veredasGratis` está DESPUÉS del bloque de
    tirar. Con esa colocación, la guardia jugada antes de tirar (lo que Miguel pidió)
    pone `estiajePorMover` a `true`, se vuelven a pedir opciones, y lo único que sale es
    **Tirar los dados**: los dieciocho destinos no aparecen nunca y el movimiento se
    aplaza a después de la cosecha, que es justo la cosecha que la carta iba a evitar. El
    orden correcto está escrito con todas sus consecuencias en el §7, y las dos mitades
    (la de `opciones()` y la guarda propia de `tirarLosDados`) van juntas, por lo que
    dice la cabecera de `sePuedeJugarLaCarta`: «cuál de las dos copias hay que tocar para
    cambiar la regla: LAS DOS».

12. **El toque del descarte vive en `acciones` del tablero declarado, y el de mover el
    estiaje en `caras[].toque`.** No es una decisión de pantalla: decide si el bucle de
    Riberas de `verify:mesa` sigue conduciéndose solo o hay que tocar `verificar-mesa.ts`
    en el mismo empujón. `unToqueDelTablero` recorre `nudos`, `lineas`, `caras` y
    `acciones` y nada más, así que las dos listas que se eligen son las dos que el bucle
    ya lee. El §2.5 lo mide, con la sorpresa que salió al medirlo.

## 1 bis. Las seis decisiones que este documento no terminaba de decir

Están tomadas, están en `958962a` y cada una lleva su porqué escrito en el código. Van
aquí porque son exactamente las que un agente distinto habría resuelto de otra manera, y
porque la que las lea después no debería tener que reconstruirlas del diff.

**1. El nombre y el sitio del reductor, y por dónde NO pasa.** La rama del `switch` de
`avanzarRiberas` llama a **`moverElEstiaje`**, que mira el turno y la bandera y nada más;
la mudanza de verdad vive en **`conElEstiajeEn`**, que es la parte que comparten el
movimiento y el reloj y que por eso no mira ni turno ni bandera (`yo: -1` cuando quien
mueve es el tic). Y lo que no se deduce de sus hermanas es cómo termina: `fundar` y
`alzar` acaban en `puedeHaberGanado(conElVado(...))` porque una choza mueve el premio de
recorrido y los puntos, y `jugarLaGuardia` en `puedeHaberGanado(conLaGuardia(...))` porque
La Mayor Guardia da un punto. **Esto no pasa por ninguno de los tres**, y es la misma
decisión que ya llevaba escrita `jugarElAnoBueno`: mover el estiaje y robar cambian de
sitio UNA FICHA y nada más. Llamarlos «por simetría» sería recalcular en cada siete dos
premios que no se pueden haber movido, y sobre todo sería escribir que esto puede acabar
una partida, que no puede. Y hay una guarda que este documento no pedía y que hizo falta:
**`pasarTurno` también corta con `estiajePorMover`**, porque sin ella la bandera cruzaría
a `siguienteTurno` y el destino pendiente se le ofrecería al siguiente, que no ha sacado
ningún siete. Por eso `siguienteTurno` **no** la apaga «por limpieza»: apagarla ahí
convertiría saltarse la regla en la salida silenciosa de este caso.

**2. Adónde mueve `venceElPlazo`, y qué pasa después.** A la **primera isla legal del
orden canónico** (el de `mallaDeRadio`, que es el de `estado.islas`) saltando la de ahora,
que es la misma regla de `colocarPorElAusente` y por la misma razón, aquí más fuerte
todavía: elegir al azar gastaría una tirada de `estado.azar`, y entonces dos ejecuciones
del mismo diario con distinto número de plazos vencidos dejarían el acumulador en sitios
distintos y `reejecutarEn` dejaría de valer. **Y después pasa el turno**, con el mismo
`siguienteTurno` de siempre, porque lo que un plazo vencido significa en `'jugando'` ya
era «pasa el turno»; dejarlo abierto le regalaría a quien no está un plazo entero más para
el resto de su turno, que es justo lo que el tic existe para no hacer. Y **no se roba**:
robar sí gasta azar y además elegiría víctima por quien no está, así que se mueve con `a:
null`, que es el caso que la propia regla ya tenía escrito para las islas vacías. Lo hace
`moverPorElAusente`, y el comprobador lo mira entero: que la bandera se apaga, que va al
primer sitio legal, que el azar no se mueve, que nadie pierde una ficha, que el turno
avanza, y que **al siguiente se le ofrece tirar y no mover el estiaje de otro**.

**3. Por dónde se corta `elRobo`, y qué se queda en la guardia.** En `jugarLaGuardia`
convivían cinco cosas: el sorteo, el traslado de la ficha, `sinLaCarta`, `guardias + 1` y
`conLaGuardia`. **Bajan las dos primeras y sólo ellas.** Las tres últimas son DE LA CARTA
y no del robo, y si bajaran, mover el estiaje gastaría una carta que nadie jugó y subiría
un premio que nadie ganó. `elRobo` comprueba lo que es del robo (que la víctima existe,
que no soy yo, y que le queda algo) y **devuelve `null` y no un estado**, para que cada
quien decida qué significa: para la guardia, `null` es un movimiento ilegal; para el
estiaje, «no robar» ni siquiera llega ahí, porque viaja como `a: null`. Lo que NO
comprueba es nada del sitio ni de la carta: que la víctima tenga pieza en la isla lo mira
`conElEstiajeEn` con `tienePiezaEn`, y que la carta se pueda jugar lo sigue mirando la
guardia. Cada regla, en la función que la tiene.

**4. El relleno de las mesas guardadas es LA DUNA, y no nulo.** Es la única de las altas
de `comoSiSiempreHubieraHabidoMazo` que **no** se rellena con el valor vacío, y la razón
es de reglas: con `estiaje: null` una mesa escrita ayer se reabre con la pieza en ninguna
parte, no hay isla bloqueada, y **los destinos que ofrece `opcionesDelEstiaje` pasan a ser
DIECINUEVE en vez de dieciocho**, porque la lista se hace quitando la isla de ahora y no
habría ninguna que quitar. O sea que el relleno vacío cambiaría una regla del juego a
mitad de partida. Se rellena con lo que habría habido si la pieza hubiera existido desde
el principio y nadie la hubiera movido, y la duna se encuentra por `RINDE[terreno] ===
null` (`laDuna`) y no por su nombre, que es la misma regla con la que se reparte. La
guarda es `=== undefined` y **no** `=== null`, porque `null` es un valor legítimo de este
campo (la mesa que aún se reúne) y confundirlos volvería a poner la pieza en la duna cada
vez que se proyecta una mesa sin delta. Y el descarte queda ejecutado y no escrito en un
comentario: el comprobador monta a mano el relleno vacío y **exige que salgan diecinueve**.

**5. El color del filo.** `BORDE_DEL_ESTIAJE = '#2ad0e0'`. Un color del juego y **no «el
acento»**, por dos razones que no se pueden esquivar: `CaraDeTablero.borde` es una cadena
que los dos clientes meten CRUDA en el trazo (`stroke={cara.borde}` en el retablo de la
app, que es SVG nativo y no resuelve variables de CSS: un `var(--acento)` ahí se pinta
como nada), y aunque las resolviera, esta casa tiene **un acento por tema**, así que el
mismo tablero declararía tres bordes distintos según quién lo mire y ninguna comprobación
podría decir cuál es el bueno. Se elige como se eligió el de cada terreno: que se separe
de todo lo que va a tener al lado. Y el hueco de la rueda es uno solo, porque los seis
rellenos y los seis colores de colono ocupan enteros los cálidos y los verdes. Lo que esta
cuarta versión corrige es **qué demuestra ese 42,1**, y está en el §12.14: demuestra que
el filo no se confunde con ningún relleno, no que se vea encima de él.

**6. El `aria-label`, partido en dos baterías, y la partición es la mitad de la
comprobación.** `verify:riberas` no importa nada de `escritorio/`: no puede pintar un SVG
ni leer un `aria-label`. Así que allí se mira **lo que es del juego** (que la cara ofrecida
sale del tablero declarado con su `rotulo` y su `cifra` dentro del dato, y que la isla
ocupada rotula `· estiaje` y no lleva `toque`), y en `verify:escritorio`, en el paso nuevo
`elEstiajeSeOye`, **lo que es del mueble**: que esas dos palabras acaban dentro del nombre
del botón, que ninguna cara se anuncia con el tipo del movimiento ni con su llave, y que
el texto que se esconde para no decirlo dos veces **sólo se esconde donde hay botón que lo
diga**. Con sus dos vacunas, que son las que lo hacen morder: la isla donde ESTÁ la pieza
conserva su texto visible y sin `aria-hidden` (es la única de las diecinueve, y es
justamente la que hay que encontrar), y **con ninguna cara tocable no se esconde ni un
texto**, que es lo que se habría caído si el retablo escondiera siempre.

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

**Y hay una segunda diferencia, más burda, que la segunda versión de este documento no
vio y que la volvía inejecutable: el descarte no ocurre en el mismo momento.** Contestar
un trueque ocurre en `'jugando'`, así que cabe dentro de `opcionesDeTurno`. Descartar
ocurre en `'descartando'`, y a `opcionesDeTurno` **no se llega en `'descartando'`**:
`opcionesDeRiberas` despacha por momento en cuatro líneas, y la de `opcionesDeTurno` está
detrás de `if (v.momento === 'jugando')`. Todo lo que se escriba dentro de
`opcionesDeTurno` para el descarte es código que no se ejecuta nunca, y el resultado no es
un descarte a medias: es una mesa **sin ninguna opción para nadie**, parada en seco, con
el bucle del comprobador y los dos clientes mirando una lista vacía. Dónde va de verdad
está en el §2.2 bis, dicho una sola vez y repetido igual en el §2.3 y en el §10.

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

**Y en `'descartando'` NO SE CONTESTA A TRUEQUES.** Hay que decirlo aquí, en voz alta,
porque es la única regla del documento que QUITA algo que hoy se puede hacer. La razón es de reglas y no de pantalla:
lo que se descarta es la mitad de lo que uno tenga en el instante del siete, y `descartes`
se llena con `Math.floor(almacen.length / 2)` **congelado en ese instante**; si entre el
siete y el descarte se pudiera aceptar un trueque, dos colonos que se pasaran fichas de
ida y vuelta podrían salvar la mitad de sus dos almacenes sin que ninguna cuenta cambiara.
No es un caso raro: es la primera jugada que descubre cualquiera que juegue dos partidas.

La comprobación que lo sostiene, y que va en la fase 2: **con un trato en `'propuesta'`
abierto y la partida en `'descartando'`, `opcionesDeRiberas` del destinatario no contiene
ni un `ACEPTAR` ni un `RECHAZAR`, y sí contiene sus `DESCARTAR`.** Con su vacuna al lado,
que es la que le da valor: el mismo trato, la misma mesa y el momento en `'jugando'`, y
entonces el `ACEPTAR` tiene que estar. Sin la vacuna, un `opciones()` que devolviera lista
vacía por cualquier motivo daría verde.

Y el trato no se cancela ni caduca por esto: sigue abierto, y se contesta al volver a
`'jugando'`. Caducarlo sería inventar una regla nueva (el §14 dice que no entra) y además
castigaría al que ofreció por una tirada que no hizo él.

**Y esta regla no cuesta ninguna línea, que es la mejor manera de que una regla no se
rompa.** Con el despacho del §2.2 bis, en `'descartando'` no se llega a `opcionesDeTurno`
en absoluto, y el bloque de contestar trueques vive dentro de `opcionesDeTurno`. O sea que
«en `'descartando'` no se contesta a trueques» sale gratis de la forma del despacho, y lo
único que hay que escribir es que `opcionesDeDescarte` **no** vuelve a emitir esas
opciones. La comprobación de arriba se queda tal cual, con su vacuna, porque una regla que
hoy sale gratis es exactamente la que mañana alguien deshace sin darse cuenta.

### 2.2 bis. Dónde vive el descarte: UNA rama en `opcionesDeRiberas`, y nada en `opcionesDeTurno`

Esto está aquí, en un apartado propio y con su nombre, porque la segunda versión lo decía
de dos maneras incompatibles en tres sitios (aquí, en el §2.3 y en el §10) y ninguna de
las dos se podía deducir de la otra. **La forma es una sola, y es ésta:**

```
if (v.momento === 'reuniendo')   return opcionesDeReunion();
if (v.momento === 'colocando')   return opcionesDeColocacion(v, quien);
if (v.momento === 'descartando') return opcionesDeDescarte(v, quien);   // <- la rama nueva
if (v.momento === 'jugando')     return opcionesDeTurno(v, quien);
return [];
```

Una rama nueva en `opcionesDeRiberas`, hermana de las tres que ya hay, **y ni una línea del
descarte dentro de `opcionesDeTurno`**. Es un cambio de la **fase 2**, dicho así para que
se pueda empujar sin buscarlo: la fase 2 añade el momento, el campo, la rama y la función.

Tres cosas de esta forma, que son las que la hacen la buena y no una entre dos:

- **`opcionesDeRiberas` ya despacha por momento, y eso no es un detalle de estilo.** Cada
  momento tiene su función y su lista, y por eso `'reuniendo'` no puede fundar y
  `'colocando'` no puede tirar sin que nadie escriba una guarda para impedirlo. El descarte
  es un momento; le toca una rama.
- **`opcionesDeDescarte` no mira `turnoDe` ni una vez**, y por eso el descarte se ofrece a
  varios a la vez sin inventar nada: la comprobación de turno vive dentro de
  `opcionesDeColocacion` y de `opcionesDeTurno`, cada una la suya, y la función nueva
  sencillamente no la escribe. Recorre `descartes`, encuentra la entrada de `quien` con
  `faltan > 0`, y emite una opción por clase de bien que le quede en `misFichas`. Si no
  está en la lista, o ya no le falta ninguna, devuelve la lista vacía, que es lo correcto:
  quien ya descartó espera.
- **Y con esto el §2.5 se sostiene sin tocar nada**: en `'descartando'`, `opciones()`
  devuelve sólo `DESCARTAR`, así que `nudos`, `lineas` y `caras` del tablero declarado
  salen sin `toque` y `acciones` lleva sólo los descartes. El bucle de `verify:mesa` coge
  uno a la primera, por el `turnoDe` que el §2.3 le apunta.

### 2.3. Quién puede mover mientras, y a quién apunta el reloj

Las dos cosas son distintas y aquí es donde se separan:

- **Puede mover cualquiera que esté en `descartes` con `faltan > 0`**, a la vez, sin
  esperar turno. Y la forma en que eso se consigue es la del §2.2 bis y no la de contestar
  un trueque: contestar vive **dentro** de `opcionesDeTurno`, delante del `if (v.turnoDe
  !== quien)`, y el descarte vive **fuera**, en su propia rama de `opcionesDeRiberas`, que
  no mira `turnoDe` en ningún sitio. Se parecen en lo que consiguen y no en cómo, y
  confundir las dos cosas es lo que dejó inejecutable la segunda versión.
- **`turnoDe` apunta al primero de `descartes` que aún tenga `faltan > 0`.** No es
  cosmética: de `turnoDe` cuelgan el aviso que se manda al móvil de quien no está
  delante (`shared/mecanicas/turno-declarado.ts`, que existe precisamente para eso), el
  reloj de pared de la mesa (`empiezaTurnoNuevo`), el tapete de «me toca» del tablero en
  tres dimensiones (`turnoEnTres`), y el bucle del comprobador que juega partidas
  enteras. Apuntándolo al primero que falta, las cuatro cosas siguen funcionando sin
  tocar una línea de plataforma.

**Y aquí está el precio de esa decisión, que hay que pagar con los ojos abiertos.**
`turnoDe` es **un solo campo** (`turno-declarado.ts` declara uno y su cabecera explica por
qué no puede declarar más), y durante el descarte hay hasta seis personas que pueden
mover. O sea que `turnoDe` deja de significar «el único que puede mover» y pasa a
significar «el primero de los que pueden mover». Todo lo que lea `turnoDe` para decidir
qué puede hacer YO tiene que dejar de leerlo:

- **La frase de la cinta** ya no puede elegir con `v.turnoDe === quien`. El §9.1 la
  reescribe con tres ramas, y la primera mira `descartes`.
- **Lo que sí puede seguir leyendo `turnoDe`** es todo lo que pregunta «a quién esperamos»
  y no «qué puedo hacer»: el reloj de pared, el aviso al móvil, el tapete de `turnoEnTres`
  y el bucle del comprobador. Los cuatro dan una respuesta correcta con «el primero de la
  cola», aunque incompleta.
- **Y `opciones()` NUNCA lee `turnoDe` para el descarte**, porque en `'descartando'` no
  llega a ninguna función que lo lea: `opcionesDeRiberas` despacha a `opcionesDeDescarte`,
  que recorre `descartes` y nada más (§2.2 bis). Ésa es la única lectura que de verdad
  decide qué se puede hacer, y no depende del campo del turno.

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

**Primero hay que corregir una frase de la primera versión, porque de ella colgaba una
tranquilidad falsa.** Decía que `jugar:fondo` y `verify:mesa` juegan Riberas a ciegas.
`jugar:fondo` **no juega a esto**: su cabecera dice que lee `acciones` del manifiesto y
juega «los cuatro juegos» que devuelve `juegosInstalados()`, que son los de la SALA, y no
toca ningún arcade. O sea que hoy quien juega Riberas sin saber a qué juega es **un solo
testigo**, el bucle de Riberas de `verificar-mesa.ts`, y el segundo testigo no existe
todavía: es el comprobador de la fase 5 de este documento.

**Y el testigo que hay mira menos de lo que parece.** Medido reproduciendo la forma exacta
de ese bucle con `medir7.mts`, o sea tres semillas, tres colonos, cuarenta vueltas,
`quien` sacado del `turnoDe` del espectador y el movimiento sacado del tablero declarado
con `unToqueDelTablero` saltando `riberas:pasar`, lo que juega cada semilla es esto:

| Movimiento | Veces por semilla |
|---|---|
| `riberas:empezar` | 1 |
| `riberas:fundar` | 6 |
| `riberas:alzar` | 6 |
| **`riberas:tirar`** | **1** |
| `riberas:ofrecer` | **26** |

Las cuarenta vueltas se gastan enteras, la partida se queda en `'jugando'`, y **se tira
los dados UNA vez por semilla, tres en total**. Las veintiséis restantes son el mismo
colono proponiendo trueques uno detrás de otro, porque `unToqueDelTablero` devuelve el
primer toque que no sea `pasar` y `OFRECER` sale antes que `PASAR` en `acciones`. En
las tres semillas **no salió ni un siete**, y con tres tiradas era lo más probable: con el
siete a 6 de 36 (`medir11.mts`), que ninguna de tres tiradas sea un siete tiene una
probabilidad del 58 %.

> **CADUCADO, y se queda por lo que enseña.** Todo lo de arriba era cierto hasta
> `3942556`. Desde ese commit el bucle **juega tres partidas enteras hasta el ganador**,
> eligiendo por familias y sorteando dentro de cada una, y con la fase 1 encima atraviesa
> **32 sietes** y los resuelve (§11.3, §12.11). Las tres consecuencias de abajo, que se
> escribieron contra el bucle viejo, quedan como estaban con su fecha: la primera sigue
> siendo la medida buena de lo que cuesta un descarte, la segunda **ya no vale** (la fase
> 1 sí puede prometer que `verify:mesa` juega el estiaje, y lo promete), y la tercera se
> cumplió.
>
> Lo único que hay que retener del bucle nuevo para lo que queda: sigue preguntándole **a
> uno**, y por eso la fase 5 sigue haciendo falta (§13).

De ahí salían tres consecuencias, y las tres hay que escribirlas:

- **El descarte no se puede comer la ventana de cuarenta vueltas, porque la ventana no
  llega.** La preocupación era razonable y la medida la contesta: con la política del
  jugador uniforme a tres colonos, un siete costaría 5,2 fichas de descarte de media
  (0,78 colonos por encima de siete, `medir6.mts`) más una vuelta de mover, o sea unas
  **seis vueltas de cuarenta, el 15 %**; el peor caso medido de un solo descarte, 20
  fichas, se comería la mitad. Sería un problema si el bucle llegara a un siete. Hoy no
  llega, y **subir la ventana no arregla nada mientras el bucle se quede atascado
  ofreciendo trueques**: es cambiar un número para que un comprobador que no mira mire lo
  mismo más veces.
- **Por eso `verify:mesa` no puede ser el testigo de que lo nuevo es jugable, y la fase 1
  no promete que lo sea.** Lo que la fase 1 promete es lo que sí se puede sostener: que
  `verify:mesa` **sigue** en el recuento que tenga el día que la fase se empuje y su bucle
  **sigue** conduciéndose solo, sin tocar `verificar-mesa.ts`. El número no se fija aquí a
  propósito —el 856 del §11.1 es de antes del arreglo que está en marcha—, porque una fase
  no debe prometer un número que no es suyo. Eso es un «no he roto nada», no un «esto está
  vigilado». Quien vigila es la fase 5.
- **Y el bucle atascado es un hallazgo de este documento que NO es de este documento
  arreglar, y ya no hace falta pedirlo: se está arreglando en paralelo**, en
  `server/scripts/verificar-mesa.ts` y en este mismo árbol (§12.11). Este documento no
  escribe en ese fichero y no cita una línea suya. Lo que cambia cuando ese arreglo
  aterrice está dicho en el §13, con las cuatro diferencias entre ese bucle y la fase 5
  delante, y la primera de todas es la que importa: **ese bucle le pregunta a uno y la fase
  5 les pregunta a todos**, y un descarte de tres colonos a la vez no lo ve quien pregunta
  por un solo asiento.

Dicho eso, la forma de ofrecer el descarte no cambia, y es la que hace que el bucle siga
conduciéndose solo cuando por fin llegue a un siete:

- El descarte se ofrece como opciones normales, una por clase de bien en mi mano:
  `{ id: 'descartar:limo', tipo: DESCARTAR, carga: { bien } }`, con rótulo «Tirar un limo»
  y ayuda «Te quedan N por tirar». El `bien` se lee con `bienDeLaCarga(carga, 'bien')`, que
  ya existe y que ya usa el acaparamiento; y el `id` lleva el bien dentro por lo mismo que
  el de mover lleva la víctima (§1, decisión 5): son cinco opciones a la vez en la misma
  lista de `acciones`, y un `id` repetido es una que deja de poder pulsarse.
- Van también al `tablero` declarado, **dentro de `acciones`** (decisión 12), que es una
  de las cuatro listas que lee `unToqueDelTablero`. La alternativa era un panel, y se
  descarta por eso mismo: `panelesDe` produce `PanelDeTablero`, que es texto y no lleva
  `toque`, así que un descarte en un panel no lo puede pulsar ni el bucle ni un lector de
  pantalla. Y como en `'descartando'` no hay ninguna otra opción, ni contestar trueques
  por el §2.2, ni construir, ni tirar, `nudos`, `lineas` y `caras` salen sin
  toque y `acciones` sólo lleva los descartes: el bucle coge uno a la primera. **Y esto
  sigue en pie para el descarte, pero la promesa que había aquí, «`verificar-mesa.ts` no se
  toca en ninguna de las cinco fases», ya se rompió en la fase 1 y por otra puerta**: no
  por dónde vive el toque, sino porque con el estiaje por mover **no hay ninguna otra
  opción**, y una lista de familias que no incluya `riberas:estiaje` deja al bucle sin
  jugada en el primer siete. Está contado en el §12.11.
- Mover el estiaje va por `caras[].toque` y no por `acciones` (§9.2), y por la misma
  razón sigue siendo alcanzable: `caras` es la tercera lista que recorre
  `unToqueDelTablero`.
- Y como `turnoDe` apunta al que descarta, el bucle le pregunta a él y encuentra qué
  jugar. **Sin la decisión 2, esto no funciona**: es la misma decisión mirada desde el
  comprobador.

El bucle del descarte termina siempre porque cada movimiento baja `faltan` en uno y
`faltan` sale de un número que no crece durante el momento: como mucho 13 movimientos con
la regla puesta y bot uniforme de dos a cinco colonos (`medir4.ts`, primera vuelta,
**reejecutado**), y 20 en el peor caso de la tanda de dos colonos de `medir6.mts` (segunda
vuelta, sin reejecutar).

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

### 3 bis. Y para que eso sea verdad, el orden del corte

La primera versión de este documento decía que `opcionesDeTurno` corta con
`estiajePorMover` «como corta con `veredasGratis`». **Es la línea que había que arreglar.**
El corte de `veredasGratis` está aquí:

```
if (v.turnoDe !== quien) return opciones;

if (!v.tirado) { opciones.push(tirar); opciones.push(...opcionesDeRevelar(v)); return opciones; }

if (v.veredasGratis > 0) { ...; return opciones; }
```

O sea **después** del bloque de tirar, y ahí está bien, porque las veredas de la carta
sólo pueden existir con la tirada hecha. El estiaje no: se activa antes de tirar cada vez
que se juega una guardia antes de tirar, que es la mitad de la petición de Miguel. Con el
corte en el sitio de `veredasGratis`, la partida entera de esa carta es ésta: juego la
guardia sin haber tirado, `estiajePorMover` se pone a `true`, vuelvo a pedir opciones y lo
único que sale es **Tirar los dados**. Los dieciocho destinos no aparecen nunca y el
movimiento se aplaza a después de la cosecha, que es exactamente la cosecha que la carta
servía para evitar. La carta no se rompe con estrépito: se convierte en una carta que
mueve el estiaje tarde, que es peor, porque parece que funciona.

**El orden, escrito para que no haya que deducirlo:**

```
for (trato of v.tratos) { ...aceptar / rechazar... }      // sin turno, como hoy
if (v.turnoDe !== quien) return opciones;

if (v.estiajePorMover) {                                  // <- AQUÍ, y no más abajo
  opciones.push(...opcionesDelEstiaje(v, mio));
  opciones.push(...opcionesDeRevelar(v));
  return opciones;                                        // y NO se ofrece TIRAR
}

if (!v.tirado) { ...tirar...; return opciones; }
if (v.veredasGratis > 0) { ...; return opciones; }
```

Tres cosas que no son evidentes y por eso van escritas:

- **Mientras `estiajePorMover` vale `true` no se ofrece TIRAR**, ni siquiera sin haber
  tirado. Es lo que hace que el `return` de arriba sea correcto y no una trampa: si
  `tirar` se colara, la lista tendría diecinueve entradas de las que dieciocho son un
  destino y una es «sáltate la regla».
- **`tirarLosDados` necesita su propia guarda**, `if (estado.estiajePorMover) return
  estado;`, con su motivo escrito: mover el estiaje está pendiente. Las dos mitades y no
  una, por la cabecera de `sePuedeJugarLaCarta`. Si sólo se tocara `opciones()`, el
  reductor aceptaría una tirada que nadie ofreció el día que un cliente viejo la mandara;
  si sólo se tocara el reductor, habría un botón encendido que no responde, que es el
  fallo que el paso «Los topes: lo que el reductor no va a aceptar, `opciones()` no lo
  ofrece» de `verificar-riberas.ts` ya persiguió una vez con las veredas, y que su cabecera
  cuenta con los 2.834 movimientos devueltos sin cambio que costó descubrirlo.
- **Revelar un título sigue saliendo**, como sale por los otros tres caminos del turno y
  por la razón que su comentario ya explica: no es una jugada. Es la cuarta copia de
  `opcionesDeRevelar` y hay que escribirla, no ahorrarla.

**La vacuna, y es la fase 3 la que la trae:** jugar una guardia **sin haber tirado** y
comprobar que la única lista que sale son los dieciocho destinos (que `TIRAR` no está en
ella, y que sí están los destinos con su víctima). Sin ese «que `TIRAR` no está», la
comprobación pasa igual con el corte en el sitio malo, porque el corte malo también
devuelve una lista.

### 3 ter. El turno que nadie había descrito

Este turno es legal desde la fase 3 y no aparecía en ninguna parte del documento. Va
escrito entero porque es el que va a salir jugando y el que hay que poder explicar:

1. Es mi turno y **no he tirado**. Juego una guardia. `cartaJugada` se pone a `true`.
2. `estiajePorMover` se pone a `true`, muevo el estiaje a una isla y **robo una ficha**.
3. Ahora sí tiro. Sale un **siete**.
4. `estiajePorMover` se vuelve a poner a `true` (la misma bandera, la segunda vez en el
   mismo turno) y esta vez, además, `tirarLosDados` llena `descartes`.
5. Se descarta, se mueve otra vez y **se roba otra vez**.

O sea: **dos movimientos del estiaje, dos robos y un descarte en el mismo turno**, con la
carta del turno gastada antes de saber la tirada. Y no es un fallo, es la jugada: quien
juega la guardia antes de tirar apuesta a que no saldrá un siete, y si sale, ha gastado su
carta para nada y encima descarta. Que la apuesta se pueda perder es lo que la hace una
apuesta.

Lo que hay que comprobar de este turno, y va en la fase 3, porque es donde una bandera
booleana reutilizada se rompe: que **el segundo robo del turno funciona** (`cartaJugada` no
lo bloquea, porque el segundo movimiento no viene de una carta), que **`guardias` sube una
sola vez** y que **La Mayor Guardia se recalcula una sola vez**. Con su vacuna: dos
guardias en el mismo turno siguen sin poder jugarse, que es lo que `sePuedeJugarLaCarta`
ya defiende y que este turno no debe abrir por la puerta de atrás.

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

**Cómo se ofrece sin que sean cientos.** Una opción por isla y víctima, con la víctima
dentro de la carga y dentro del `id`, en la forma que fija la decisión 5:

```
{ id: `estiaje:${donde}:${a ?? 'nadie'}`, tipo: MOVER_EL_ESTIAJE, carga: { donde, a },
  rotulo: 'Mover el estiaje a la vega 9', ayuda: 'Y robar una ficha a Bruno.' }
```

Las dieciocho llaves salen de `v.islas.map((i) => llaveDeHex(i.hex))` quitando
`v.estiaje`, en el orden de `islas`, que es el de `mallaDeRadio` y por tanto fijo; y las
víctimas de cada isla, en el orden de `colonos`. Los dos órdenes son los que ya hacen
reejecutable el reparto de la cosecha, y aquí sirven para lo mismo: que la lista salga
igual dos veces.

Y lo que cuesta:

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
en el percentil 90 y 37 como máximo (`medir2.ts`, primera vuelta, **reejecutado**, dos a
cinco colonos mezcladas). O sea que la lista de mover el estiaje
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
emite igual pero con `a: null` (y su `id` acaba en `:nadie`, §1 decisión 5): se mueve y no
se roba. Eso es lo que dice la regla que
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
razón está ya escrita en la cabecera de **`NUMEROS_DE_LAS_ISLAS`** de `riberas.ts` (la
primera versión de este documento la llamó `LOS_DIECIOCHO_NUMEROS`, que es como empieza el
texto de la cabecera y no como se llama la constante): «No hay ningún siete, y eso NO es
porque el siete esté reservado a nada: es que con dos dados el siete es la suma más
probable, así que colgarlo de una isla la haría rendir el doble que las demás».

Los números, enumerando las treinta y seis tiradas (`medir11.mts`), porque **el «doble» de
esa cabecera no es exacto y conviene decirlo aquí antes de citarla**: el siete sale 6
veces de 36; el seis y el ocho, 5; el cinco y el nueve, 4; el cuatro y el diez, 3; el tres
y el once, 2; el dos y el doce, 1. De ahí:

- Contra **el seis y el ocho, que son las mejores islas del reparto**, un siete rendiría
  **un 20 % más**. No el doble.
- Contra un cuatro o un diez, exactamente el doble; contra un tres o un once, el triple;
  y **seis veces más** que un dos o un doce.
- Contra la isla media de las dieciocho (58/36 de probabilidad repartidos entre ellas),
  **1,86 veces**, que es lo que la cabecera redondeó a «el doble».

O sea que la conclusión de la cabecera es correcta y su número no lo es contra las islas
con las que hay que compararse. El §12 dice cómo se reescribe.

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

**En tres dimensiones.** Dos piezas, y las dos baratas. **De las dos, la segunda entró en
la fase 1 y la primera sigue pendiente**, y el reparto no es caprichoso: la tienda es lo
único sin lo cual un siete secaba una isla sin que se viera cuál, y el posavasos de la
duna es lo que le faltaba a la duna desde antes de que la pieza existiera.

- **PENDIENTE, fase 4.** La duna gana un **posavasos sin cifra y sin puntos**: el mismo disco crema de `Numero`,
  `circleGeometry(RADIO_DE_TESELA * 1,9, 44)`, **44 triángulos**, una llamada de dibujo,
  sin los guarismos y sin los círculos de probabilidad. Con él, la duna se lee como una
  casilla del tablero (que es lo que Miguel echó en falta) y sigue sin decir un número
  que no tiene (que es lo correcto).
- **HECHO en la fase 1.** El estiaje se pinta con `MODELO.tienda`, que **ya está compilado** en `tablero.glb` y
  que **ya lo pintaba** el componente de `delta.tsx` con `talla 3` sobre el centro
  de la comarca. Lo único que faltaba era que le llegara una comarca y no `null`, y eso
  es lo que hace ahora `deltaDeLaVista` leyendo `vista.estiaje` con `hexDeLlave`. Medido en el `.gltf` del pack (`arte/kaykit/hexagon-extra/.../decoration/props/tent.gltf`):
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

**En dos dimensiones.** Nada nuevo en el mueble genérico: los campos que hacen falta
ya existen en `CaraDeTablero`. **HECHO en la fase 1**, con un cambio de fondo respecto a
lo que las tres primeras versiones decían, que va entero en el §6.4.

- La isla donde está el estiaje escribe en su `rotulo` el terreno y la palabra: `vega ·
  estiaje`. Es el único texto que un lector de pantalla saca de una cara que no se toca,
  y `textoDeCara` lo dice en su cabecera.
- **Su `relleno` se va a la PENUMBRA**, a la mitad de luz, y eso es lo que se ve sin leer.
  Aquí ponía que lo que se ve es el borde en el acento, y **las dos mitades de esa frase
  eran falsas**: ni es el borde lo que se ve, ni puede ser «el acento». El §6.4 lo cuenta
  con las medidas delante.
- Su `borde` pasa del `#1d1f26` de todas al `#2ad0e0` del estiaje. **Acompaña**, porque no
  cuesta nada, y no es lo que sostiene la información.
- Su `cifra` **no cambia**: la isla bloqueada sigue enseñando su número, porque saber qué
  número está bloqueado es la mitad de la información.
- La duna sigue con `cifra: ''`, y eso ahora tiene una explicación en pantalla: encima de
  ella hay una pieza.

### 6.4. El filo no bastaba, y la medida que lo defendía contestaba a otra pregunta

**Esto es lo que cambió al escribir el código, y es el cambio de fondo de esta cuarta
versión.** Las tres primeras defendían el filo turquesa con una cifra correcta puesta en
el sitio equivocado, y con ella el aviso «sin leer» no se veía en la mitad larga del
tablero.

**La cinta que se usó, y la que hacía falta.** El 42,1 de CIE76 al relleno más cercano
contesta a «¿se confunden dos rellenos puestos uno al lado del otro?», que es exactamente
para lo que `verify:riberas` usa esa cuenta con los seis terrenos. La pregunta de un
**trazo fino sobre el relleno que lo rodea** es otra, y esta casa ya la tiene contestada y
escrita en `app/src/arcade/retablo.tsx`: el mínimo de un elemento no textual es **3:1 de
luminancia**, y allí está dicho con todas las letras que ningún color fijo puede prometer
3:1 contra un relleno que declara un arcade. Medido el turquesa contra los seis:

| Relleno | Luminancia contra el filo | ¿Llega a 3:1? |
|---|---|---|
| salina `#9dc257` | **1,09:1** | no |
| duna `#e6d8ae`, donde el estiaje NACE | **1,32:1** | no |
| vega `#b89a55` | **1,44:1** | no |
| cantil `#78828d` | **2,08:1** | no |
| marisma `#9d4f25` | 3,13:1 | sí |
| carrizal `#346d3d` | 3,29:1 | sí |

O sea que el filo solo no decía nada en **cuatro de las seis islas**, y entre ellas la
duna, que es donde la pieza empieza toda partida. (La cabecera de `BORDE_DEL_ESTIAJE`
dice «tres de las seis» porque enumera los tres peores y deja fuera el cantil, que a
2,08:1 tampoco llega; el §12.14 lo anota, porque lo que hay que arreglar ahí es la cifra
del comentario y no la del código.)

**Y no hay color que lo arregle solo.** Cualquiera que contraste 3:1 con los seis rellenos
a la vez es casi negro, y entonces deja de distinguirse de `BORDE_DE_LA_ISLA`, que ya es
casi negro. Y el contrato de `CaraDeTablero` no tiene ni grosor de trazo ni doble trazo,
así que no hay por dónde comprar el contraste que al color le falta. Un filo más gordo o
un halo claro debajo serían campos nuevos en un mueble genérico, y eso es otro encargo.

**La salida: lo que se ve es el ÁREA.** `PENUMBRA_DEL_ESTIAJE = 0,5`, y la función
`enPenumbra` (exportada a propósito, para que el comprobador la mida) multiplica los tres
canales del relleno de la isla ocupada. Es la única isla oscura de un tablero de colores
medios, se encuentra de un vistazo, y dice lo que pasa sin traducir nada: el estiaje es el
agua que se retiró, y lo que queda es la isla en sombra.

**Por qué la mitad, y no más ni menos, medido sobre los seis rellenos:**

| Multiplicador | CIE76 de su propio color, el peor de los seis | CIE76 del borde de la isla, el peor |
|---|---|---|
| 0,35 | 35,3 | **7,5**: la cara se lee como un trazo gordo |
| 0,40 | 31,9 | 10,0 |
| **0,50** | **26,3** | **15,6** |
| 0,55 | **23,8**: por debajo del mínimo | 18,6 |
| 0,60 | 21,1 | 21,1 |

El umbral de la segunda columna es el que `verify:riberas` ya exige entre **dos rellenos
cualesquiera** para que no se confundan, 25: o sea que la isla seca se distingue de sí
misma tanto como dos terrenos distintos entre sí. La ventana que cumple las dos cosas es
de 0,40 a 0,50, y se coge el techo, porque más abajo se ve mejor pero se acerca al filo.
En luminancia la penumbra da **2,11:1** en el peor de los seis (el carrizal), que **no**
alcanza el 3:1 de un elemento no textual, y por eso esto tampoco viaja solo: van con él el
rótulo `· estiaje`, que es la mitad que lee un lector de pantalla, y el filo, que ahora
refuerza en vez de sostener.

**Las tres comprobaciones que trae, en `verify:riberas`:** que la isla del estiaje se
pinta en penumbra y **se separa de su propio color tanto como dos terrenos distintos**;
que **no se va tan abajo** que la cara se lea como un filo, midiéndola contra el borde de
la isla; y que **sólo ella**, o sea que las otras dieciocho se pintan con el color de su
terreno. Y las dos vacunas que las hacen morder: la del filo contra los seis rellenos se
escribe **con su fallo al lado** (un filo del color de la duna no se vería sobre la duna,
y esa línea tiene que salir falsa, porque si no un `enElPlano` vacío o un `NaN` darían
verde), y el filo se mide además contra los seis colores de colono, que es el mismo par de
superficies: las chozas se pintan encima de la isla ocupada, y un filo del color de un
colono le borraría las suyas justo el turno en que hay que mirarla.

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
ofrece siempre, por lo que dice su comentario). Es un corte **de la misma forma** que el
de `veredasGratis` y **en otro sitio**, y la diferencia es lo único que hay que retener de
este párrafo: el de `veredasGratis` va después del bloque de tirar y el del estiaje va
**antes**, porque el estiaje se puede activar sin haber tirado. El orden completo, con lo
que pasa si se pone donde no va, está en el §3 bis; y la mitad que vive en el reductor es
`if (estado.estiajePorMover) return estado;` en la primera línea de `tirarLosDados`, con
su motivo. Las dos mitades van en el mismo empujón, siempre, por lo que dice la cabecera
de `sePuedeJugarLaCarta`.

Y por qué un `boolean` y no un contador como `veredasGratis`: porque el estiaje se mueve
una vez por activación y no dos. Un contador invitaría a `estiajePorMover: 2` el día que
alguien quisiera una carta que mueve dos veces, y esa carta no existe ni va a existir
(§14). Lo que sí puede pasar dos veces en un turno está en el §3 ter, y son dos
activaciones de la misma bandera, no una bandera con valor dos.

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
donde vive hoy el nombre y por tanto el fichero donde se cambia. **HECHO en la fase 1**, y
con una pieza más que no estaba escrita aquí: `comoVistaLlana`, que es la que normaliza lo
que le llega, también normaliza el estiaje (`typeof v.estiaje === 'string' ? v.estiaje :
null`), porque una vista guardada de antes de la pieza no lo trae y entonces no hay comarca
seca. Es la misma decisión que `comoVista` toma en `riberas.ts`, y por la misma razón.

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
| `riberas-en-3d.ts` | `ladron: null` | lo lee de la vista. **HECHO** |
| `escenas/tipos.ts`, contrato genérico | `ladron: Hex \| null` | **`seca: Hex \| null`**, y no `bloqueada`. **HECHO** |
| `delta.tsx`, el componente | `Ladron` | **`LaComarcaSeca`**, y no `Estiaje`. **HECHO** |
| `nombres.ts` | `MODELO.tienda` | **no cambia**: es el nombre del modelo, no el de la regla |

No `estiaje` en `escenas/tipos.ts` a propósito: ese fichero dice de sí mismo
que el vocabulario de terrenos es de cada juego y que por eso `terreno` es una cadena
libre. Lo mismo vale aquí: el contrato dice **qué le pasa a la comarca**, y cómo se llame
la pieza que lo causa es cosa del juego.

**Y las dos filas de arriba salieron con otro nombre del que este documento proponía, por
el mismo argumento llevado un paso más lejos.** El documento pedía `bloqueada` y el
componente `Estiaje`; el código escribió **`seca`** y **`LaComarcaSeca`**. `bloqueada` es
una palabra de reglas (dice que algo está prohibido) y lo que el contrato de escena puede
saber es lo que le PASA a la comarca, no por qué; y `Estiaje` habría metido en
`escenas/delta.tsx`, que es tan genérico como `tipos.ts`, el nombre que le da un juego a
su pieza. Los dos nombres nuevos dicen lo mismo desde el lado del que mira: la escena
planta ahí una tienda y no sabe de quién es. Gana el código, y se anota aquí para que la
próxima persona que busque `bloqueada` no la encuentre y crea que falta.

Lo que se tumba, y por qué se deja escrito: llamarla `ladron` en el código y «El estiaje»
en pantalla. Es la solución de menos trabajo y es la peor de todas, porque deja el
vocabulario partido en dos y obliga a traducir mentalmente cada vez que se lee una
función. Este árbol ya tiene esa lección escrita en `compilar-modelos.ts` («si la escena
buscara por el nombre del pack, cambiar de pack sería tocar la escena entera»).

**Esto es una decisión de Miguel y está en el §13.**

## 9. Los dos clientes

### 9.1. El tablero en tres dimensiones: elegir la isla

> **DE ESTO, LA MITAD ENTRÓ EN LA FASE 1 Y NO ERA LA FASE 4.** Lo que hay desde
> `958962a`: el campo del contrato (`seca`), `deltaDeLaVista` leyéndolo de la vista con
> `hexDeLlave`, y la tienda plantada sobre el relieve de la comarca que está seca. **Se
> VE dónde está el estiaje.** Lo que sigue siendo de la fase 4 es lo que sigue debajo:
> `sitiosDelEstiaje`, el `Colocando` de clase `'comarca'` y una `Senal` por isla, o sea
> **soltar la pieza**; hasta entonces se mueve desde los botones, que los hay siempre.
>
> **Por qué se adelantó, dicho con la mesa delante.** `COLORES_EN_3D` tiene cuatro
> colores, así que el tablero de tres dimensiones existe **de dos a cuatro colonos**, que
> son las mesas que se juegan de verdad; el retablo sólo entra con cinco o seis. Dejar el
> dibujo para la fase 4 habría dejado esas mesas con un siete que seca una isla **sin que
> se vea cuál**, y con la única pista de dieciocho rótulos de botón. Soltar la pieza, en
> cambio, es comodidad: el botón ya mueve. Ésa es la línea por la que se partió, y no la
> de «el 3D va al final».
>
> **Y hay un bloque de comprobación nuevo que cubre justamente esa ventana**, el 12 bis de
> `verify:riberas-en-tres`: con el estiaje por mover, el juego ofrece los dieciocho
> destinos y ninguna otra cosa salvo revelar; los dieciocho **llegan enteros a los
> botones**, así que la mesa no se queda parada; cada uno con su rótulo, que dice a qué
> isla va; y `obrasPosibles` devuelve sus tres piezas **con cero sitios y sin clase**, o
> sea que ninguna de las opciones nuevas se cuela en la barra de obra haciéndose pasar por
> una obra. Con su vacuna: en un turno normal, los sitios del tablero **sí** se caen de los
> botones, que es lo que demuestra que el filtro filtra. Sin ese bloque, el día que alguien
> tocara `opcionesFueraDeLaMesa` o `obraPosible` esa mesa se quedaría parada con la bandera
> encendida y no se caería nada.

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

**El aviso, con TRES ramas y no dos.** La primera versión daba dos y no decía por qué
campo elegía, y ése era el agujero: `avisoDe` elige hoy con `const suyo = v.turnoDe ===
quien;` y no hay otra cosa con la que elegir, porque el único campo que la plataforma sabe
leer es `turnoDe` (`shared/mecanicas/turno-declarado.ts` declara **un solo campo**, con su
cabecera explicando por qué no puede haber más). Con dos colonos descartando a la vez y
`turnoDe` apuntando al primero (§2.3), el segundo lee **«Se espera a Bruno, que tira 4
fichas»** mientras él mismo tiene sus cinco botones de descarte encendidos delante. Es el
peor aviso posible: no dice que no puedas, dice que le toca a otro.

Las tres ramas, y la primera es la nueva:

| Cuándo | Qué se lee |
|---|---|
| **Estoy en `descartes` con `faltan > 0`** (mire lo que mire `turnoDe`) | «Tira 3 fichas.» |
| No estoy, y el momento es `'descartando'` | «Se espera a Bruno, que tira 4 fichas.» |
| `estiajePorMover`, según sea mío el turno o no | «Sacaste 7: mueve el estiaje.» / «Turno de Ana, que mueve el estiaje.» |

O sea: **la primera rama mira `descartes`, no `turnoDe`**, y se evalúa antes que las
otras. Es la misma forma que tiene el bloque de contestar trueques en `opcionesDeTurno`, y
por la misma razón: lo que puedo hacer sin turno no se decide con el campo del turno.

**Y lo que esto cuesta, dicho en voz alta porque no es gratis:** el aviso de la pantalla
se arregla, y el aviso del MÓVIL no. `turnoDeLaVista` lee `turnoDe` y nada más, así que al
segundo y siguientes de la cola de descartes **no les llega notificación hasta que
`turnoDe` llegue a ellos**, que es cuando el primero termine. En una partida de diez
minutos eso no se nota. En La Larga, con `PLAZO_MAXIMO_S` de siete días, significa que
tres personas que deben descartar se enteran en serie y no a la vez, y que el reloj de la
mesa se reprograma tres veces (§2.3). Se acepta a sabiendas, y la razón es que la
alternativa es peor: un segundo campo en la vista para «quién más puede mover» sería
inventar en la mecánica común una forma de turno que hoy no tiene ningún juego, y el §5.3
del diseño prohíbe exactamente eso. Lo que sí se puede hacer sin tocar nada común está en
el §13 como decisión de Miguel: que el tic vaya por todos (decisión 4) hace que la espera
tenga tope, y ese tope es **un** plazo y no seis.

**Lo que le hace a la cinta.** El aviso es el mismo campo `tablero.aviso` que la cinta del
tercio central pinta en una línea (§2.2 de `docs/LA-MESA-DE-RIBERAS.md`), así que estas
tres ramas **no añaden ni un punto de alto**: sustituyen texto, no lo apilan. La cinta
puede llegar a 88 puntos por otras razones ya escritas allí, y el peor lienzo con la cinta
a 88 lo miden los dos documentos que sí cuelgan cosas de la banda central,
`docs/EL-TRUEQUE-DE-RIBERAS.md` y `docs/LAS-CARTAS-SE-EXPLICAN.md`; lo único que este
documento les añade a esa cuenta es que **la frase de la cinta puede ser una de éstas**,
que son más largas que «Te toca: tira los dados.» y más cortas que el aviso más largo que
el juego produce hoy, 104 caracteres, medido sobre 18.000 tableros (`medir9.mts`). O sea
que no cambian el peor caso de la cinta.

**Lo que no se toca.** Ni `baraja.ts`, ni `cartas.ts`, ni `barra.ts`, ni `camara.ts`. Las
señales de comarca viven sobre el tablero, que es la zona que el §4.4 de la mesa dejó
libre, y la mesa no cambia de alto.

### 9.2. El retablo en dos dimensiones, que en las mesas grandes es el único cliente

**Esto no es la versión pobre de lo de arriba, y la primera versión lo trataba como si lo
fuera.** `MANIFIESTO_RIBERAS.jugadores` es `{ minimo: 2, maximo: 6 }`; `COLORES_EN_3D` de
`riberas-en-3d.ts` tiene **cuatro** colores (`red`, `blue`, `yellow`, `green`) y
`bastanColores` devuelve `false` en cuanto los colonos son cinco. `verify:riberas-en-tres`
lo afirma tal cual: «cinco colonos son más que los colores del atlas: no se ve en tres».
O sea que **hoy, en una mesa de cinco o de seis, el retablo es la única pantalla que
existe**, y lo que no tenga forma en el retablo sencillamente no se puede jugar en esas
mesas. Por eso el retablo va en la MISMA fase que el 3D o antes (las fases 1 y 2, que son
de reglas, ya lo dejan jugable; la fase 4 sólo añade la escena), y no en una fase de
adorno al final.

(De paso, la contradicción que esto deja al descubierto y que **no es de este documento**:
el §1.11 de `docs/LA-MESA-DE-RIBERAS.md` diseñó el cajón del marcador «hecho para SEIS»,
con seis fichas de 44 puntos, y ese cajón hoy no se puede ver nunca, porque con seis
colonos no hay mesa de tres dimensiones donde abrirlo. Que el 3D aprenda a pintar seis
colores es un encargo propio y va al §13 para que Miguel lo pida aparte.)

Todo cabe en lo que el mueble genérico ya pinta, y lo que cuesta está medido sobre 18.000
tableros de partidas a ciegas de tres y de seis colonos (`medir9.mts`):

| Qué | Hoy | Con el estiaje |
|---|---|---|
| Caras con `toque` | **0** de 342.000 miradas | **18** de 19, y sólo mientras hay que mover |
| Botones (`acciones`), media | 5,53 | 5,53 + 0,73 de víctimas de más mientras hay que mover |
| Botones, máximo medido | **36** | **41** en el peor caso (36 + las cinco víctimas de más), y en `'descartando'` **5 como mucho** |
| Rótulo de botón más largo | 35 caracteres | sin cambio: «Tirar un limo» son 13 |

Los dos números que deciden el diseño son el 0 y el 36. El **0** dice que hoy ninguna isla
es tocable nunca, así que el mecanismo de cara tocable del retablo no se ha ejercitado ni
una vez en Riberas y la fase 1 es la primera que lo enciende. El **36** dice que la lista
de botones ya llega a treinta y seis en un turno normal (casi todos `OFRECER`), y por eso
meter los dieciocho destinos ahí, además, no es «un poco más»: es la diferencia entre una
lista larga y una lista de cincuenta y cuatro. Van a las caras.

**Y una advertencia de unidades, para quien convierta estos caracteres en anchura.** Los
tres números de esta tabla que hablan de texto están en caracteres y no en puntos, a
propósito, porque el ancho de una letra en esta casa no es el que se supone: `estilo.css`
declara `html { font-size: 106.25%; }`, así que **la raíz de esta casa vale 17 puntos y no
16**. Con eso, `.opcion-ayuda`, que es `0.82rem`, mide **13,94 puntos y no 13**, y el ancho
por letra que hay que usar es **8,36 y no 7,8**, con renglón de 19. Se dice aquí porque
otros dos documentos de esta tanda sí montan tablas de letra y el error de partida fue ése
en los dos; y porque un rótulo de 35 caracteres da 293 puntos con la cuenta buena y 273
con la mala, que es la diferencia entre caber y no caber en el rail de 22 rem.

- Las caras de las islas pasan a llevar `toque` cuando son un destino legal. El tablero ya
  lo tiene previsto: `CaraDeTablero.toque` existe, `figuraDe` del retablo del escritorio
  hace tocable «una pieza con `toque`» sin saber qué es, y `unToqueDelTablero` de
  `verify:mesa` recorre las caras.
- **De qué llave cuelga el movimiento de la cara, que es lo que la segunda versión dejó
  sin decir y de lo que depende que esto se pueda escribir.** `porSitio` se construye con
  `o.id` y guarda la primera opción de cada `id`; los `id` de mover son
  `estiaje:${donde}:${a ?? 'nadie'}` (§1, decisión 5), o sea que **la llave de la cara no
  es el `id`**: es la isla. Así que `tableroDeRiberas` construye, en el mismo bucle en el
  que hoy construye `porSitio`, un segundo mapa `primeraDelEstiaje`, de `carga.donde` a la
  primera opción de esa isla. Tres líneas, y **no se toca el contrato de `porSitio`**, que
  sigue siendo «la primera opción de cada sitio gana» con la razón que ya lleva escrita
  («está escrito así para que el día que haya dos opciones distintas sobre el mismo sitio,
  el tablero elija de forma estable en vez de según el orden de recorrido»). Ese día es
  éste, y la elección estable es la primera víctima en el orden de `colonos`.
- **Las víctimas de más SÍ van a `acciones`, y sólo ellas.** La cara de una isla lleva un
  `toque` y uno solo, así que la segunda víctima de una isla no tendría por dónde
  elegirse: quedaría ofrecida por `opciones()` y sin pintar en la única pantalla que existe
  en una mesa de cinco o seis, que es el fallo del botón encendido al revés —una opción
  legal que no se puede pulsar—. Cuánto cuesta está medido y es poco: los destinos son 18
  y las opciones 18,73 de media y 23 como máximo (`medir5.ts`, primera vuelta,
  **reejecutado**), o sea **de cero a cinco
  botones de más**, y sólo el 3,8 % de las islas tiene dos víctimas (108 de 2.812). La
  lista de botones pasa de un máximo medido de 36 a 41 en el peor caso, no a 54.
- **La primera opción de cada isla se excluye de `acciones`**, igual que se excluyen
  `FUNDAR` y el `ALZAR` con sitio, porque ésa ya está en su cara. Si se metieran las 18, la
  lista de botones sí pasaría del máximo medido de 36 a 54, y de una media de 5,53 a
  veintitantos en el turno del siete.
- El descarte **sí** va a `acciones`, porque un descarte no tiene sitio en el mapa: es
  exactamente el mismo caso que un trueque, y está escrito ahí («forzarlo a tener uno
  sería inventar geometría para una regla que no la tiene»).

**Y lo que se oye cuando la isla es tocable, que la primera versión dejó como pregunta
abierta y no lo es.** `textoDeCara` de `escritorio/src/retablo.tsx` esconde el texto de una
cara tocable con `aria-hidden` para no decirlo dos veces, y lo justifica con que «las
diecinueve islas de Riberas no llevan `toque`, así que esconderlo siempre habría dejado el
mapa mudo». Con el estiaje, dieciocho de las diecinueve lo llevan justo en el momento en
que hay que elegir. Pero leído el fichero entero, **el mapa NO se queda mudo**: la que
pone el nombre de una pieza para quien no la ve es `nombreParaElLector`, y su primer caso
es exactamente el que hace falta («una cara trae `rotulo` y `cifra`: "Carrizal 8" es un
nombre de verdad y lo escribió quien sabe a qué se juega»). O sea que la cara tocable se
anuncia «vega 9» y el texto se esconde para no repetirlo, que es lo correcto y ya está
escrito.

Lo que sí queda falso es **el comentario**, no la conducta, y por eso va al §12 como lo que
es: una justificación que dejó de valer. La decisión, escrita para que no se vuelva a
abrir: **no se toca `nombreParaElLector` ni `textoDeCara`**; se reescribe el porqué del
`aria-hidden` diciendo que el nombre del botón ya lleva el terreno y la cifra dentro. Y la
comprobación que lo ata, en la fase 1: **con el estiaje por mover, el `aria-label` de una
cara ofrecida contiene el nombre del terreno y su cifra**, con su vacuna (una cara que no
se ofrece sigue teniendo su texto visible y sin `aria-hidden`).

Lo que sí hay que decidir y aquí se decide es **la isla donde ESTÁ el estiaje**, que es
otra cosa: su `rotulo` pasa a `vega · estiaje` (§6.3), y como esa cara **no** es un destino
legal (mover es a otra isla, §4), no lleva `toque`, no lleva `aria-hidden` y su texto se
lee entero. Es la única isla de las diecinueve que se queda con su texto visible durante el
momento de mover, y eso es una casualidad afortunada que conviene no romper: es justo la
que hay que encontrar.

## 10. Dónde vive cada cosa

| Qué | Fichero | Nombre |
|---|---|---|
| La suma que activa | `shared/arcade/juegos/riberas.ts` | `SUMA_DEL_ESTIAJE` |
| Dónde está la pieza | `shared/arcade/juegos/riberas.ts` | `EstadoDeRiberas.estiaje` |
| Que falta moverla | `shared/arcade/juegos/riberas.ts` | `EstadoDeRiberas.estiajePorMover` |
| Quién debe descartar | `shared/arcade/juegos/riberas.ts` | `EstadoDeRiberas.descartes` |
| El momento nuevo | `shared/arcade/juegos/riberas.ts` | `MomentoDeRiberas`, `'descartando'` |
| Los movimientos | `shared/arcade/juegos/riberas.ts` | `MOVER_EL_ESTIAJE`, `DESCARTAR` |
| **La rama del descarte** | `shared/arcade/juegos/riberas.ts` | `opcionesDeRiberas`, `if (v.momento === 'descartando') return opcionesDeDescarte(v, quien);` (§2.2 bis) |
| Qué se puede descartar | `shared/arcade/juegos/riberas.ts` | `opcionesDeDescarte`, hermana de `opcionesDeColocacion` y de `opcionesDeTurno`. **NO mira `turnoDe`** |
| Los dieciocho destinos | `shared/arcade/juegos/riberas.ts` | `opcionesDelEstiaje`, dentro de `opcionesDeTurno` |
| **La línea que enciende la bandera** | `shared/arcade/juegos/riberas.ts` | `tirarLosDados`, la rama del siete: `estiajePorMover: true` (§15.1, fase 1) |
| El corte, antes de `if (!v.tirado)` | `shared/arcade/juegos/riberas.ts` | `opcionesDeTurno` (§3 bis) |
| La otra mitad del corte | `shared/arcade/juegos/riberas.ts` | `tirarLosDados`, guarda de `estiajePorMover` |
| Que en `'descartando'` no se contesta | `shared/arcade/juegos/riberas.ts` | Sale de la forma del despacho: en `'descartando'` no se llega a `opcionesDeTurno`, que es donde vive el bloque de tratos. `opcionesDeDescarte` no lo repite (§2.2) |
| La isla y la víctima del movimiento | `shared/arcade/juegos/riberas.ts` | `carga: { donde, a }`, leídos con `dondeDeLaCarga` y `campoDeTexto(carga, 'a')`, que ya existen |
| La llave con la que la cara encuentra su movimiento | `shared/arcade/juegos/riberas.ts` | `tableroDeRiberas`, `primeraDelEstiaje` (por `carga.donde`), al lado de `porSitio` (§9.2) |
| El aviso de quien descarta | `shared/arcade/juegos/riberas.ts` | `avisoDe`, la rama que mira `descartes` |
| El botón del descarte | `shared/arcade/juegos/riberas.ts` | `tableroDeRiberas`, `acciones` |
| El bloqueo | `shared/arcade/juegos/riberas.ts` | `repartirLaCosecha`, una línea |
| El robo, una sola vez | `shared/arcade/juegos/riberas.ts` | extraído de `jugarLaGuardia` |
| Qué pasa al vencer el plazo | `shared/arcade/juegos/riberas.ts` | `venceElPlazo` |
| El plazo de pared | `server/src/arcade/mesas.ts` | `plazoSegundos`, `empiezaTurnoNuevo` |
| La comarca que no rinde, en la escena | `escenas/tipos.ts` | `DeltaEn3D.seca` (el documento proponía `bloqueada`; §8) |
| Cómo llega a la escena | `shared/arcade/juegos/riberas-en-3d.ts` | `deltaDeLaVista` |
| Dónde se puede soltar | `shared/arcade/juegos/riberas-en-3d.ts` | `sitiosDelEstiaje` |
| Los sitios de comarca | `escenas/sitios.ts` | `sitiosDelTablero().comarcas`, ya escrito |
| El anillo y el agarre | `escenas/delta.tsx` | `Senal`, sin cambios |
| La pieza | `escenas/delta.tsx` | `LaComarcaSeca` (antes `Ladron`; el documento proponía `Estiaje`, §8), `MODELO.tienda` |
| El filo y la penumbra de la isla seca | `shared/arcade/juegos/riberas.ts` | `BORDE_DEL_ESTIAJE`, `PENUMBRA_DEL_ESTIAJE`, `enPenumbra`, `BORDE_DE_LA_ISLA` (§6.4) |
| La preposición del rótulo | `shared/arcade/juegos/riberas.ts` | `A_LA_ISLA`, `laIslaEnPalabras` |
| Que no se pasa el turno con el estiaje por mover | `shared/arcade/juegos/riberas.ts` | `pasarTurno`, la guarda (§1 bis, 1) |
| Que una partida terminada no debe un movimiento | `shared/arcade/juegos/riberas.ts` | `puedeHaberGanado`, `estiajePorMover: false` (§12.15) |
| El posavasos de la duna | `escenas/delta.tsx` | dentro de `Numero`, sin cifra |
| La isla tocable en el retablo | `shared/arcade/juegos/riberas.ts` | `tableroDeRiberas`, `caras[].toque` |

## 11. Cómo se midió

### 11.0. La regla que la segunda versión aprendió: una medida de mano lleva etiqueta

Antes de los guiones, lo que hay que saber para leerlos. **En este juego, una medida sobre
las manos de los colonos depende de tres cosas y no de una**, y la primera versión daba
sólo la tercera:

1. **Cuántos colonos hay.** De 64,7 % de manos grandes con dos a 13,4 % con seis, con el
   mismo bot y el mismo motor (§0, `medir6.mts`). Es el factor que más manda.
2. **Qué política juega el bot.** El uniforme sobre `opciones()` completa da 28,2 % de
   manos por encima de siete; el que construye en cuanto puede da 93,8 %. Los dos son
   ciertos y miden cosas distintas: el primero, cómo es una partida cualquiera; el
   segundo, cuál es el suelo del problema.
3. **Cuántos pasos se juegan.** Las manos crecen con la partida, así que una tanda de mil
   pasos y otra de cuatro mil no dan la misma cola.

Un número de mano sin las tres etiquetas no se puede comparar con ningún otro, y la
tentación de compararlo es exactamente lo que produjo la contradicción aparente con
`docs/EL-TRUEQUE-DE-RIBERAS.md` que el §0 deja resuelta. **A partir de aquí, todos los
números de mano de este documento llevan las tres.**

### 11.1. Los guiones

Once guiones en el scratchpad de la sesión, corridos con `node_modules/.bin/tsx` desde
el worktree. Ninguno escribe nada y ninguno vive en el árbol: importan
`shared/arcade/juegos/riberas.ts`, `shared/arcade/motor.ts` y
`shared/mecanicas/malla-hexagonal.ts` de verdad, y juegan partidas eligiendo al azar de
lo que devuelve `opcionesDeRiberas`, que es exactamente lo que hace un jugador a ciegas.
El azar de la elección es un generador propio con semilla, para que las medidas se puedan
repetir; el del juego es el suyo.

Los cuatro primeros, más la lectura del pack, son de la primera versión; los siete últimos
son de la segunda y llevan extensión `.mts`, porque importan el motor por ruta absoluta con
`import()` y así el guion puede vivir fuera del árbol sin inventarse una ristra de `..`.

- **`medir2.ts`**: doce partidas **de dos a cinco colonos mezcladas**, **bot uniforme**,
  14.400 pasos. De aquí salen los 148 sietes, las 468 manos miradas, el 51,1 % por encima
  de siete fichas, la mano máxima de 107, la media de 11,03 al sacar un siete (p90 23, p99
  71) y las opciones por turno (media 14,67, p50 13, p90 25, máximo 37). **La mezcla es lo
  que hay que retener**: las mesas de dos colonos, que son las de manos grandes, arrastran
  la cola de toda la tanda, y por eso el 107 y el 51,1 % no se pueden comparar con un
  número de otro documento sin desmezclarlos. Desmezclados están en `medir6.mts`.
- **`medir3.ts`**: las mismas partidas contando lo que costaría cada forma del descarte.
  Los repartos distintos se cuentan con programación dinámica sobre las cinco clases (no
  con una fórmula cerrada, porque cada clase tiene su tope). De aquí: media 24,36, p50 8,
  p90 42, máximo 713; 2,51 clases distintas de media y cuatro como máximo; y las manos de
  manual que el guion imprime, que son **cuatro y no cinco**: 8 fichas (2,2,2,1,1) dan 26
  repartos, 9 (3,2,2,1,1) dan 30, 12 (4,3,2,2,1) dan 62 y **20 (5,5,4,3,3) dan 344**. Las
  dos versiones anteriores citaban aquí «16 dan 172 y 26 dan 802», y **ninguna de las dos
  la imprime este guion**: son el mismo cálculo hecho aparte sobre (4,4,3,3,2) y sobre
  (7,6,5,4,4), los dos ciertos y los dos comprobados otra vez en la tercera vuelta (§11.2).
  Queda escrito porque una cita que atribuye un número al guion que no lo saca es
  exactamente lo que hace que nadie lo vuelva a comprobar.
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

Y los de la segunda versión, que son los que traen las etiquetas del §11.0:

- **`medir6.mts`**: la tabla del §0. Doce partidas **por cada número de colonos, de dos a
  seis y cada mesa por separado**, unos 14.300 pasos por mesa, con **dos políticas**: la
  uniforme sobre la unión de `opciones()` de todos los sentados, y la que construye en
  cuanto puede. De aquí: los sietes, las manos y los descartes por mesa; los 28,2 % y
  93,8 % de las dos políticas juntas; y las manos máximas de 65 y 831.
- **`medir7.mts`**: **reproduce la forma exacta del bucle de Riberas de
  `verificar-mesa.ts`** (tres semillas, tres colonos, cuarenta vueltas, `quien` del
  `turnoDe` del espectador, movimiento de `unToqueDelTablero` saltando `riberas:pasar`).
  De aquí, el reparto de movimientos del §2.5: por semilla, 1 `empezar`, 6 `fundar`, 6
  `alzar`, **1 `tirar`** y **26 `ofrecer`**; cero sietes en las tres semillas; y las 123
  revisiones que cuenta hoy el comprobador contra su umbral de 40.
- **`medir8.mts`**: el número que no depende del bot, con el reparto de topes al lado. De
  aquí: 59.549 pasos, 4.767 sietes, 19.493 manos, 93,8 % por encima de siete, mano máxima
  831.
- **`medir9.mts`**: lo que mide el tablero declarado hoy, sobre 18.000 tableros de mesas
  de tres y de seis. De aquí: botones media 5,53 y **máximo 36**; **cero** caras con
  `toque` de 342.000 miradas; rótulo de botón más largo 35 caracteres; aviso más largo 104
  caracteres. Y el reparto de topes de las manos grandes: 26,7 % con las doce veredas
  puestas, 0 % con las nueve piezas de vértice.
- **`medir10.mts`**: **lo que hace falta para que la fase 5 sea verde por algo**. Juega
  uniformemente de la unión de `opciones()` con tope de 4.000 pasos. De aquí: **ninguna
  partida se quedó sin opciones para nadie** en ninguna mesa; las partidas SÍ terminan
  jugando a ciegas, pero cuestan lo que cuestan (a dos colonos 6 de 8 terminaron con media
  de 1.527 pasos y máximo 2.365; a tres, 4 de 8 con media 2.457 y máximo 3.028; a cuatro,
  5 de 8 con media 2.019 y máximo 2.593; **a seis, 7 de 8 con media 3.170 y máximo
  3.934**). Ése es el número que decide el tope de la fase 5, y por qué no puede ser mil.
  **Y la misma tanda empezando con el almacén lleno** (cuarenta fichas por colono, el
  mismo atajo que ya usa `verificar-riberas.ts`) **termina las ocho de ocho en las cuatro
  mesas, con medias de 115 a 274 pasos y máximo 581**. O sea que las mil partidas de la
  fase 5 salen baratas por ese camino y caras por el otro, y por eso la fase 5 lleva las
  dos tandas y no una.
- **`medir12.mts`**: el mismo juego contando **qué movimientos ofrecidos devuelven el
  mismo estado**, que es la afirmación más delicada de la fase 5. De aquí: los hay, y son
  pocos (4 en 8.742 pasos a dos colonos, 34 en 12.616 a tres, 42 en 10.443 a cuatro, 120
  en 13.606 a seis), del orden de **cuatro por mil**. Y **todos son del mismo tipo**: los
  200 son `riberas:aceptar`, ni uno de ningún otro. O sea que la única fuente de
  movimientos ofrecidos que no cambian nada es exactamente la que `opcionesDeTurno` deja
  documentada en su sitio: «se ofrece aceptar si YO tengo lo que se me pide, y no se
  comprueba que el oferente tenga lo que promete: SU ALMACÉN NO ESTÁ EN MI VISTA». La fase
  5 no puede afirmar «ninguno»: afirma «ninguno que no sea un `ACEPTAR`», que es una
  afirmación mucho más fuerte y que hoy se cumple.
- **`medir11.mts`**: los dos dados enumerados, las treinta y seis. De aquí la tabla del
  §6.2 y del §12.

### 11.2. Qué se reejecutó en la tercera vuelta, y qué no arregla reejecutar

**El reparo, dicho primero, porque es el que importa y no se arregla corriendo nada.** Los
once guiones viven en el scratchpad de la sesión, no en el árbol, así que **quien lea esto
dentro de un mes no puede volver a sacar ni uno solo de estos números**. Eso no lo cambia
que hoy corran: lo cambiaría escribirlos en el árbol, y eso es escribir código, que este
encargo no hace. Así que cada número lleva su etiqueta de tanda y, desde aquí, la de si se
volvió a correr; y si alguien quiere estos números vivos, **dejar los guiones escritos es
un encargo propio y hay que pedirlo aparte**, como los dos del §13.

**Lo que sí se hizo en la tercera vuelta:** se volvieron a correr los cuatro guiones de la
primera, que son los que sostienen los números más citados del documento y los que más
riesgo tenían de haberse escrito de memoria. Los cuatro devolvieron **exactamente** lo que
el documento decía:

| Guion | Tanda | Qué salió al reejecutarlo |
|---|---|---|
| `medir2.ts` | primera vuelta; **dos a cinco colonos MEZCLADAS**, bot uniforme, 12 partidas, 14.400 pasos | 148 sietes, 468 manos miradas, 239 por encima de siete (**51,1 %**), mano máxima **107**, media al siete **11,03** (p90 23, p99 71), opciones por turno media **14,67** (p50 13, p90 25, máximo 37) |
| `medir3.ts` | primera vuelta; misma tanda | repartos del descarte media **24,36**, p50 8, p90 42, máximo **713**; clases por mano media **2,51**, máximo 4; manos de manual 26, 30, 62 y 344 |
| `medir4.ts` | primera vuelta; misma tanda, **con la regla del descarte puesta a mano encima del estado** | 152 sietes, 482 manos, 129 por encima de siete (**26,8 %**), mano máxima **26**, media al siete **6,21** (p90 10, p99 16), fichas tiradas media **4,91** (p50 4, p90 7, máximo 13) |
| `medir5.ts` | primera vuelta; misma tanda, con los seis vértices de verdad | 19 islas, 54 vértices, 148 sietes; piezas por isla media 0,69 máximo **3**; víctimas por isla media 0,44 máximo **2** (reparto 1.672 / 1.032 / **108**); mover con víctima media **18,73**, mínimo 18, p90 20, máximo **23**; islas libres media **8,22**, mínimo **2**; islas sin nada mío mínimo 13 |

De ese último reparto sale el 3,8 % del §9.2: **108 islas de 2.812 tenían dos víctimas**, y
son exactamente las que obligan a que el `id` lleve la víctima dentro y a que las de más
vayan a `acciones`.

**Y los dos números que no salen de ningún guion**, que hasta la tercera vuelta se citaban
como si salieran de `medir3.ts`: los repartos de una mano de 16 (4,4,3,3,2) son **172** y
los de una de 26 (7,6,5,4,4) son **802**. No hace falta un guion y por eso no lo tienen: es
contar las composiciones acotadas que suman la mitad, y se recomprueba con esto, que cabe
en cinco líneas y no depende de nada del juego:

```
function repartos(topes, k) {
  let dp = new Array(k + 1).fill(0); dp[0] = 1;
  for (const c of topes) { const nd = new Array(k + 1).fill(0);
    for (let s = 0; s <= k; s++) if (dp[s]) for (let t = 0; t <= c && s + t <= k; t++) nd[s + t] += dp[s];
    dp = nd; }
  return dp[k];
}
// repartos([7,6,5,4,4], 13) === 802 ; repartos([4,4,3,3,2], 8) === 172
```

**Los que NO se reejecutaron, y qué son:** los siete de la segunda vuelta (`medir6.mts` a
`medir12.mts`), que son los caros —`medir6.mts` juega cinco mesas de doce partidas y
`medir10.mts` llega a partidas de 3.934 pasos— y los que ya nacieron con las tres etiquetas
del §11.0. Se quedan **de la segunda vuelta, sin reejecutar**, con su tanda dicha donde se
citan, y con el mismo reparo de fondo: viven en el scratchpad.

**Comprobadores corridos para escribir esto. CADUCADOS TODOS: los vivos están en el
§11.3**, y se quedan aquí porque son el «antes» de la tabla de allí y porque el párrafo
que sigue explica por qué se tomaron así. `verify:riberas`, verde, **349
comprobaciones**. Los recuentos de los demás se citan como los deja escritos
`docs/LA-MESA-DE-RIBERAS.md` §11 con la fase 3 aterrizada: `verify:mesa` 856,
`verify:escena` 335, `verify:escritorio` 400, `verify:sala` 152,
`verify:riberas-en-tres` 295, `verify:dados` 27, y la batería `npm run verificar` con 76
comprobadores. **Esos recuentos son de la segunda vuelta y en la tercera no se ha corrido
ninguno**, por dos razones que conviene dejar dichas: este encargo es de diseño y no toca
código, así que nada de lo suyo puede haberlos movido; y hay otro agente arreglando
`server/scripts/verificar-mesa.ts` en este mismo árbol, así que un recuento tomado ahora
sería de un árbol a medio arreglar y se leería como si fuera de éste. El 856 de
`verify:mesa` es, por tanto, **el de antes de ese arreglo**, y la fase 1 lo cita como el
número contra el que comparar y no como una promesa (§15.1 y §12.11).

**Lo que NO se ha medido y hay que medir al hacerlo:** cuántas revisiones cuesta de verdad
un siete en una mesa de seis con el descarte encadenado **jugado por el motor y no
simulado encima del estado**; cuánto tarda la fase 5 con mil partidas de hasta tres mil
pasos, que es el único comprobador de este documento que puede pasar de un minuto; si los
dieciocho anillos de comarca se leen en un lienzo de 320 puntos de alto sin taparse entre
ellos, que es cosa de mirar y no de contar; y qué movimientos son exactamente los tres por
mil que devuelven el mismo estado (se sabe cuántos, no cuáles, y el §15 lista los motivos
que se esperan sin haberlos confirmado uno a uno).

### 11.3. Los recuentos de la cuarta vuelta, que son los del código y no los de un guion

Éstos no salen de ningún guion del scratchpad: **salen de los comprobadores de la casa
corridos sobre `958962a`**, que es la diferencia que el §11.2 pedía a gritos, y por eso son
los únicos números de este documento que cualquiera puede volver a sacar mañana con
`npm run verificar`.

| Comprobador | Antes | Al aterrizar la fase 1 |
|---|---|---|
| `verify:riberas` | 349 (§11.1, tercera vuelta) | **423** |
| `verify:mesa` | 856 antes de `3942556`, **2.539** después | **2.915**, con **32 sietes jugados de verdad** |
| `verify:riberas-en-tres` | 295 | **343** |
| `verify:escritorio` | 400 | **458** |
| La batería `npm run verificar` | 76 comprobadores | **76 de 76 en verde** |

Dos lecturas de esta tabla, y las dos importan más que los números:

- **El 2.915 con 32 sietes es lo que la fase 1 no podía prometer y ahora sí.** El §2.5 y
  el §15.1 decían, con razón, que `verify:mesa` no era testigo de nada de esto porque su
  bucle no llegaba a ningún siete. Llega, y los cuenta. Lo que eso cambia está en el §13.
- **Y `verify:riberas` sube 74 comprobaciones sin que ninguna se pierda**, que es lo que
  hay que mirar cuando un bloque nuevo entra en un comprobador viejo: el bloque del
  estiaje se juega hasta un siete de verdad con el árbitro delante, no se monta a mano, y
  lo dice él mismo en su primera línea (que el siete SALE), para que el día que dejara de
  salir no fuera el silencio quien lo contara.

## 12. Lo que choca con lo escrito

Esto es lo caro de revocar una decisión en esta casa: hay comentarios que la defienden, y
un comentario que defiende lo contrario de lo que hace el código es peor que no tener
comentario. Van uno a uno, con el fichero, lo que dice y por qué cambia.

> **Y desde la cuarta versión, con el estado de cada uno delante.** Los diez primeros
> (1 a 10) están **REESCRITOS en `958962a`**, y no borrados: cada uno conserva lo que
> ponía, en voz alta, con la premisa marcada como revocada y el porqué debajo, que es la
> forma que esta casa le da a una decisión que se cae. El 11 lo arregló otro empujón,
> `3942556`, y ya no es un encargo abierto. El 13 está hecho. **El 12 sigue pendiente**:
> las dos líneas de `docs/LAS-CARTAS-DE-RIBERAS.md` siguen diciendo que Riberas no tiene
> ladrón y que el siete no hace nada todavía, y son las únicas dos frases de todo el árbol
> que la fase 1 dejó falsas sin tocar. Se anotan aquí como lo que son: deuda, y de un
> documento que es la fuente de las decisiones del mazo.
>
> Y se añaden cuatro apartados que esta versión trae: el 14, que es un número de este
> documento que estaba puesto en el sitio equivocado; el 15, los tres arreglos de
> comprobación; el 16, dos comprobaciones viejas que la fase 1 puso rojas por motivos que
> no tenían nada que ver con lo que ellas miran; y el 17, la palabra que no terminó de
> desaparecer.

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
   que no cierra el vocabulario de los juegos. **HECHO**, y con otro nombre del que este
   documento pedía: pasa a **`seca`** y no a `bloqueada`, con el comentario diciendo qué le
   pasa a la comarca (no rinde, y la escena planta ahí una tienda sin saber de quién es) y
   no quién la ocupa. El porqué del cambio de nombre está en el §8, y el componente de
   `escenas/delta.tsx` fue por el mismo camino: `LaComarcaSeca` y no `Estiaje`.

9. **`escritorio/src/retablo.tsx`, la cabecera de `textoDeCara`.** «En una cara que no se
   toca, este texto es lo ÚNICO que un lector tiene del terreno: las diecinueve islas de
   Riberas no llevan `toque`, así que esconderlo siempre habría dejado el mapa mudo.» La
   premisa era cierta y está medida (**cero caras con `toque` en 342.000 miradas**,
   `medir9.mts`) y deja de serlo en el turno del siete, cuando dieciocho de diecinueve lo
   llevan. **Lo que NO cambia es la conducta**: `nombreParaElLector` compone el nombre de
   una cara con su `rotulo` y su `cifra`, así que la cara ofrecida se anuncia «vega 9» y el
   mapa no se queda mudo. Lo que se reescribe es el porqué, con eso dentro (§9.2).

10. **`riberas.ts`, la cabecera de `NUMEROS_DE_LAS_ISLAS`.** Esta no la revoca el estiaje:
    la corrige la aritmética, y hay que corregirla porque la primera versión de este
    documento la citó como si fuera exacta. Dice: «con dos dados el siete es la suma más
    probable, así que colgarlo de una isla **la haría rendir el doble que las demás**».
    Enumeradas las treinta y seis tiradas (`medir11.mts`), el «doble» sólo vale contra las
    islas flojas, y **contra las buenas es falso**:

    | Comparado con una isla de… | Veces de 36 | Cuánto rinde de más un siete |
    |---|---|---|
    | **seis u ocho** (las mejores que hay) | 5 | **x1,20, o sea un 20 % más** |
    | cinco o nueve | 4 | x1,50 |
    | cuatro o diez | 3 | x2,00, el doble exacto |
    | tres u once | 2 | x3,00 |
    | dos o doce | 1 | x6,00 |
    | la isla media de las dieciocho (las dieciocho suman 58 de 36, o sea 3,22 cada una) | 3,22 | x1,86 |

    O sea: contra un tres o un once el «doble» se queda corto (es el triple), contra un
    cuatro o un diez acierta, y **contra el seis y el ocho, que son las islas con las que
    hay que compararse porque son las mejores del reparto, el número exacto es un 20 %**.
    La frase se reescribe con el 20 % dentro, porque un 20 % ya es razón de sobra y una
    razón exacta aguanta mejor que una redonda. Lo que **no** cambia es la conclusión: no
    hay ningún siete en el reparto, y ahora hay una segunda razón que no cabía antes y que
    está en el §6.2: el siete es la suma que activa la pieza, así que una isla con un siete
    produciría exactamente el turno en que nadie produce.

11. **`server/scripts/verificar-mesa.ts`, el bucle de Riberas.** Esto no lo rompe el
    estiaje: **ya está roto** y se descubrió al medir para el §2.5. El bucle da cuarenta
    vueltas por semilla y las gasta así (`medir7.mts`): 1 `empezar`, 6 `fundar`, 6 `alzar`,
    **1 `tirar`** y **26 `ofrecer`**. O sea que se queda atascado proponiendo trueques,
    porque `unToqueDelTablero` devuelve el primer toque que no sea `pasar` y `OFRECER` sale
    antes que `PASAR` en `acciones`. Se tira los dados **tres veces en las tres semillas**,
    la partida no sale nunca del primer turno del primer colono, y sus dos comprobaciones
    («bastantes revisiones» con umbral 40 sobre 123, y «en la mayoría había fichas
    repartidas») **salen verdes igual**. Es el modo de fallo que esta casa ya tiene
    apuntado tres veces: verde por no mirar. Ninguna fase de este documento lo arregla y
    ninguna lo empeora.

    **Y ESTO YA NO ES UN ENCARGO POR ABRIR: ESTÁ ARREGLADO, en `3942556`**, y no por este
    documento. El bucle ya no coge el primer toque que encuentra: elige por **familias
    ordenadas por cuánto mueven la partida** y sortea dentro de la familia con el azar
    sembrado de la plataforma, quien no tiene el turno contesta trueques (que es lo único
    que el juego le ofrece y que el bucle viejo no ejercía nunca), y las ofertas llevan
    tope. **Las tres partidas terminan con ganador** (342, 496 y 586 movimientos), se
    tiran los dados 218 veces y salen 31 sietes. Y con la fase 1 encima son **32 sietes y
    2.915 comprobaciones** (§11.3). Lo que cambió para nosotros: la fase 1 **sí** puede
    prometer que `verify:mesa` juega el estiaje, la ventana de cuarenta vueltas dejó de
    existir, y el 856 que este documento citaba está doblemente caducado. Lo que **no**
    cambia es que la fase 5 sigue haciendo falta, y el §13 dice por qué son dos cosas
    distintas y no una.

    **Y la fase 1 sí tuvo que tocar ese fichero, contra lo que las tres primeras versiones
    prometían, por una razón que no existía cuando lo prometieron.** El §14 decía «no se
    toca `verificar-mesa.ts`», y era cierto mientras el bucle no llegara a ningún siete.
    Llegando, se cortaba: con el estiaje por mover **no se ofrece ninguna otra cosa** hasta
    que la pieza se mueva, así que sin una familia para `riberas:estiaje` el bucle se
    quedaba sin jugada la primera vez que salía un siete (medido: las tres semillas se
    cortaron en las vueltas 26, 27 y 40, con «el tablero no ofrece nada en jugando»). Son
    dos líneas, una constante y una familia, más el campo nuevo en la lista de campos de la
    vista. Y no es un remiendo para que el comprobador pase: es que **la política de ese
    bucle dejó de ser completa el día que el siete empezó a hacer algo**, que es
    exactamente lo mismo que le pasó al paso «Una partida entera» de `verificar-riberas.ts`
    (§15.1, fase 1).

12. **`docs/LAS-CARTAS-DE-RIBERAS.md`, §1.7 y la línea del §7.** «La Guardia roba, y no
    mueve a nadie... **Riberas no tiene ladrón**» y «Ladrón y estiaje: el siete no hace
    nada todavía, y esto no lo cambia». Las dos se revocan, y como ese documento es la
    fuente de las decisiones del mazo, la revocación se anota ahí con la fecha y con quién
    la firma, no se borra.

13. **`server/scripts/verificar-riberas.ts`, el paso «La producción por dados, y el
    estiaje».** Su comprobación «ninguna isla lleva el siete, así que el estiaje no puede
    rendir» **sigue siendo verdad y se queda**. Lo que hay que mirar es el resto del
    bloque, que hoy afirma que con siete no pasa nada: una comprobación escrita contra la
    regla vieja que se pone verde con la nueva sin tocarla no es una comprobación que haya
    aguantado el cambio, es una que no estaba mirando. Es exactamente la lección que dejó
    escrita `VADO_MINIMO` al pasar de cuatro a cinco. **HECHO**: se quedó lo que era
    verdad, se cayó lo que afirmaba que con siete no pasa nada, y el bloque nuevo se juega
    hasta un siete de verdad en vez de montarlo a mano.

14. **ESTE DOCUMENTO, el 42,1 de CIE76 del filo.** Es la única entrada de esta lista que
    no es un comentario del código sino **de aquí**, y va con las otras porque el modo de
    fallo es el mismo: una cifra correcta citada para sostener algo que no sostiene. El
    42,1 dice que el turquesa no se confunde con ningún relleno; no dice que se VEA encima
    de él, que es lo que un filo tiene que hacer, y para eso el mínimo de esta casa son 3:1
    de luminancia. Está corregido en el §6.4, con la tabla de los seis delante. Y queda una
    cifra por corregir, ésta ya en el código: la cabecera de `BORDE_DEL_ESTIAJE` dice que el
    aviso «no se veía en **tres** de las seis islas» y enumera la salina, la duna y la vega,
    pero **el cantil tampoco llega** (2,08:1 contra 3:1). Son cuatro. No cambia ninguna
    decisión, porque el filo dejó de sostener la información igualmente, y por eso se anota
    como deuda de comentario y no como fallo. Pero es exactamente la clase de número que
    esta casa no deja redondeado, y el apartado 10 de aquí arriba existe por lo mismo.

15. **Tres arreglos de COMPROBACIÓN, que salieron al ver caer las nuevas.** Los tres son
    del mismo género y conviene leerlos juntos, porque los tres son casos de una
    comprobación que pasaba por una razón que no era la suya:

    - **Una partida terminada apaga el estiaje pendiente.** Se puede llegar a
      `puedeHaberGanado` con la bandera encendida, porque lo único que el corte del estiaje
      sigue ofreciendo es **revelar un título**, y un título revelado puede dar el octavo
      punto. Sin la línea, el estado final quedaba diciendo «alguien tiene que mover» para
      siempre, y esa invariante es justo la que `venceElPlazo` lee para saber si hay algo
      pendiente. Se arregla en el propio `puedeHaberGanado`, que es donde la partida se
      cierra, y no en la rama del estiaje, que no puede saber que alguien acaba de ganar.
    - **La del robo dejaba de ser cierta con una sola ficha.** Decía que el robo gasta
      siempre una tirada de azar, y `enteroEntre` con el mismo mínimo y el mismo máximo
      devuelve el azar intacto: a quien le queda una sola ficha no se le sortea nada. La
      afirmación pasa a ser «el robo de un almacén **con dos o más** gasta una tirada», con
      la frase diciendo por qué, para que nadie lea ahí una propiedad universal que no lo
      es.
    - **La que compraba que mover no pregunta por la victoria pasaba con el fallo
      delante.** Comparaba `vado`, `guardia` y `ganadores` antes y después de mover, y de
      los tres sólo los dos primeros cambiarían si la rama llamara a `conElVado` o a
      `conLaGuardia`. El tercero no: `puedeHaberGanado` sólo escribe en `ganadores` cuando
      alguien llega a los ocho puntos, **y en ese escenario nadie estaba cerca**. O sea que
      envolver `moverElEstiaje` en `puedeHaberGanado` «por simetría con sus hermanas» habría
      dejado la comprobación verde. Ahora se le pone a alguien la victoria delante, con
      títulos suficientes para los ocho puntos, y se exige que mover **no** la declare.

16. **Y dos comprobaciones viejas que la fase 1 puso rojas sin que ningún color cambiara.**
    Las dos son del bloque de la paleta de `verificar-riberas.ts`, y las dos merecen
    quedarse escritas porque son el mismo acoplamiento por dos puertas distintas:

    - Preguntaba **de qué terreno es cada cara leyendo su `rotulo`**, que funcionaba
      mientras el rótulo de una isla fuera siempre y sólo el nombre de su terreno. Desde el
      estiaje la ocupada rotula `Duna · estiaje`, el mapa perdía una entrada y las tres
      comprobaciones de color se ponían rojas diciendo cosas como «el duna del plano se
      parece más al cantil de la escena». Ahora se pregunta por el **`id`** de la cara, que
      es la llave de su isla y que no pinta nadie.
    - Y pedía el tablero **con el estiaje puesto**, así que recogía la duna a media luz. Lo
      que ese bloque mide es LA PALETA (que los seis terrenos se distinguen entre sí y de
      los colonos), y eso no depende de dónde esté una pieza: ahora se le pide a una vista
      con `estiaje: null`, que es exactamente lo que trae una mesa guardada de antes. La
      penumbra se mide aparte, en su propio bloque, porque es otra pregunta. Y por lo mismo
      la línea de «las **diecinueve** caras declaran el mismo borde» pasa a ser «las
      **dieciocho** que no tienen el estiaje», con una tercera que exige que la que lo tiene
      declare otro.

17. **Y la palabra «ladrón» sigue viva en un sitio, que es el que nadie mira.** El §8 pedía
    que `ladron` desapareciera del vocabulario de la casa, y desapareció de donde importa:
    del juego, del contrato de la escena, del componente que la pinta, del banco y de todos
    los rótulos que alguien lee jugando. Lo que queda es dentro del bloque de la guardia de
    `server/scripts/verificar-riberas.ts`: una variable local `ladron` y cuatro rótulos de
    comprobación que dicen «el ladrón gana una ficha», «está ahora en el del ladrón». Es
    deuda menor y se anota por dos razones: porque un rótulo de comprobación **sí se lee**,
    sale por pantalla cada vez que el comprobador corre, y porque ese bloque es justo el que
    la **fase 3** va a tocar, así que ahí es donde toca arreglarlo y no en un barrido aparte.
    (El `ladron` de `verificar-segundo-juego.ts` no cuenta: es el eje de personas de otro
    juego, donde la palabra significa lo que significa.)

## 13. Para Miguel

Seis cosas, con una recomendación cada una. Las cuatro primeras son de reglas y de
pantalla; las dos últimas salieron al medir para éste y no se pueden dejar sin decir.

> **QUÉ QUEDA VIVO DE ESTE APARTADO EN LA CUARTA VERSIÓN.** La fase 1 se empujó con las
> cuatro recomendaciones de arriba puestas, que es lo que había que hacer con un
> documento revisado tres veces: **tres de las cuatro están ya en el código y ninguna es
> difícil de deshacer si no te convence** (la columna de en medio dice cuánto cuesta cada
> una), y la tercera es de la fase 2, que no ha entrado. De las dos de abajo, **la del
> bucle de `verify:mesa` ya no es nada tuyo: está arreglada** en `3942556`, y las cifras
> están medidas y puestas. La que sigue abierta y que hay que pedir aparte es la de los
> **dos colores que le faltan al 3D**.

| Qué hay que decidir | Recomendación | Por qué |
|---|---|---|
| **Cómo se llama la pieza** · **PUESTO en `958962a`** | **El estiaje**, en pantalla y en el código, y `ladron` desaparece del vocabulario | La palabra ya está en el juego y explica el bloqueo, que es la mitad que «ladrón» no explica. Y el nombre de la caja original en los rótulos es andar hacia atrás en lo que la cabecera de `riberas.ts` defiende (§8). Deshacerlo hoy es un renombrado y no un rediseño, y está casi entero: no queda ni un `ladron` en el juego, en la escena ni en los rótulos, y el contrato genérico dice `seca`, que no es de nadie. Lo que queda son cuatro rótulos de comprobación y una variable local en el bloque de la guardia de `verificar-riberas.ts` (§12.17) |
| **El siete de la casilla de la duna** · **PUESTO** | **No se le pone número**, y a cambio se le pone posavasos y pieza | Con dos dados el siete sale 6 veces de 36 y el dos 1: una isla con siete rendiría seis veces más que la peor. Y el siete es la suma que activa la pieza, así que esa isla produciría el turno en que nadie produce. Lo que falta no es un número, es que se vea la pieza (§6). **La pieza ya se ve; el posavasos sigue pendiente, en la fase 4** |
| **Cuánto se espera al que no descarta** · **DE LA FASE 2, sin entrar** | **El plazo de la mesa, y luego se descarta por él**, tirando sus fichas más viejas y por todos a la vez | No se inventa un reloj dentro del juego, que un reductor puro no puede mirar. Y drenando de uno en uno, una partida larga costaría hasta seis días por un siete (§2.4). Lo que la fase 1 sí dejó puesto es la otra mitad del mismo tic: con el estiaje por mover, un plazo vencido mueve por el ausente y pasa el turno (§1 bis, 2) |
| **La pieza que se pinta** · **PUESTA, y ya se ve en pantalla** | **La tienda del pack**, que ya está compilada y ya se pinta | 86 triángulos, una llamada de dibujo, 8,47 de mundo (1,67 casas): se lee desde la vista de tablero. El bote varado cuenta mejor la historia del agua que baja y mide 1,97 de alto: desde 670 unidades es una mancha. Si aun así lo prefieres, **sigue siendo una línea**: `MODELO.tienda` en `delta.tsx`, y se mide en el banco (§6.3) |

Y las dos que son encargos aparte, y que hay que pedir aparte o no se harán:

| Qué salió al medir | Recomendación | Por qué importa aquí |
|---|---|---|
| **El 3D sólo sabe pintar cuatro colores** (`COLORES_EN_3D`, y `bastanColores` manda al retablo con cinco), pero la mesa admite seis (`MANIFIESTO_RIBERAS.jugadores`) | **Pedirlo como encargo propio**: dos colores más en el atlas de piezas | Hoy, en una mesa de cinco o seis, el retablo es la ÚNICA pantalla que hay, y por eso todo lo de este documento tiene su forma en el retablo desde la fase 1 (§9.2). De paso: el §1.11 de `docs/LA-MESA-DE-RIBERAS.md` diseñó el cajón del marcador «hecho para SEIS», y ese cajón hoy no se puede abrir nunca, porque con seis no hay mesa de tres dimensiones |
| **El bucle de Riberas de `verify:mesa` se atascaba proponiendo trueques**: 26 de sus 40 vueltas eran `ofrecer`, y sólo se tiraba los dados una vez por semilla (§12.11, `medir7.mts`) | **ARREGLADO, y no por este documento**: `3942556`. Ya no hay nada que pedir | Ahora **juega tres partidas enteras hasta el ganador** (342, 496 y 586 movimientos), eligiendo por familias y sorteando dentro de cada una, y quien no tiene el turno contesta trueques. Sale de 856 comprobaciones a 2.539, y con la fase 1 encima a **2.915 con 32 sietes jugados**. Lo que eso cambia para nosotros está justo debajo |
| **Aun con ese bucle arreglado, ¿hace falta la fase 5?** | **Sí, y no es una cautela: son dos cosas distintas** | Van abajo, por su nombre |

**Lo que ese arreglo cambió para este documento, dicho antes que nada porque es la nota
que la cuarta versión trae.** Tres cosas, y las tres se han cobrado ya:

- **La fase 1 puede prometer lo que no podía.** El §2.5 y la fase 1 decían, con razón, que
  `verify:mesa` no era testigo de nada de esto y que lo único que se le podía pedir era un
  «no he roto nada». Ahora su bucle **atraviesa 32 sietes de verdad** y los resuelve, así
  que la regla del estiaje sí se ejercita ahí: para que el bucle no se cortara hubo que
  darle una familia propia a `riberas:estiaje`, y su comentario deja escrito lo que pasaba
  sin ella (las tres semillas se cortaron en las vueltas 26, 27 y 40 con «el tablero no
  ofrece nada en jugando»). O sea que ese bucle **no** es un testigo pasivo del estiaje: es
  uno que se cae si la regla deja de ofrecer destino.
- **La ventana de cuarenta vueltas dejó de ser un número de nadie**, porque ya no hay
  ventana: se juega hasta el ganador. Lo que la fase 2 tenía que mirar (§15.1) se queda
  como medida escrita y no como encargo.
- **Y el 856 de `verify:mesa` que este documento citaba está doblemente caducado.** Pasó a
  2.539 con aquel arreglo y a 2.915 con la fase 1. Los recuentos vivos están en el §11.3.

**Por qué la fase 5 sigue haciendo falta aunque ese bucle juegue, dicho con las cuatro
diferencias delante.** No es que uno sea la versión pobre del otro: miden cosas distintas y
ninguno de los dos cubre lo del otro. **Y esta tabla ya no habla de un futuro: el bucle
está arreglado y sigue sin poder hacer lo de la derecha.**

| | El bucle de `verify:mesa`, ya arreglado | La fase 5, el jugador ciego |
|---|---|---|
| **Qué prueba** | Que **la plataforma** conduce una mesa: que el árbitro acepta, que la revisión sube, que el diario se escribe y se relee, que la vista se proyecta | Que **el juego** se puede jugar: que nunca falta una opción, que ninguna miente y que la partida se acaba |
| **De dónde saca el movimiento** | Del **tablero declarado**, con `unToqueDelTablero`, que recorre `nudos`, `lineas`, `caras` y `acciones`; ahora elige por **familias ordenadas** y sortea dentro de la familia, en vez de coger el primero que encuentra | De `opciones()` **completa**, la unión de lo que se le ofrece a cada sentado, eligiendo **uniformemente** |
| **A quién le pregunta** | A `turnoDe` del espectador: **a uno** (quien no tiene el turno sólo contesta trueques) | A **todos** los sentados, que es la única forma de ver un descarte de tres a la vez o un `ACEPTAR` |
| **Cuánto juega** | Tres partidas enteras hasta el ganador, tres semillas | Hasta 5.000 pasos, de dos a seis colonos, y una segunda tanda de mil partidas con el almacén lleno |

Lo que se ve leyendo la tabla es que **el arreglo curó la tercera fila a medias y no tocó
la tercera columna de problemas**: el bucle ya no se atasca y ya llega al final, pero sigue
cogiendo **uno** por vuelta y preguntándole a **uno**. Las tres afirmaciones que sostienen
este documento (que ninguna partida se queda sin opciones para nadie, que ninguna opción
ofrecida devuelve el mismo estado sin motivo, y que ningún almacén pasa de siete después de
un siete) no se pueden hacer desde ahí, y ya no por falta de vueltas: por falta de
**quiénes** y de **cuáles**. Un descarte de tres colonos a la vez no lo ve nadie que
pregunte por un solo asiento, y eso es exactamente lo que la fase 2 va a traer.

Y una cosa que **no** es una decisión y conviene que sepas: las otras dos peticiones de tu
mensaje (el trueque de varios bienes y varias unidades con aceptación confirmada, y la
descripción de las cartas al pasar el ratón) no están en este documento. Son otros dos
encargos, con su documento cada uno: `docs/EL-TRUEQUE-DE-RIBERAS.md` y
`docs/LAS-CARTAS-SE-EXPLICAN.md`. **El orden en el que se empujan los tres está decidido y
es éste: primero el estiaje, después las cartas, y el trueque el último** (§15).

## 14. Lo que NO entra

No entra: cambiar el trueque; las descripciones de las cartas al pasar el ratón; puertos;
que el estiaje se pueda mover fuera del delta; una segunda pieza; el descarte con reloj
propio distinto del de la mesa; que la vista diga qué ha descartado cada cual; una
animación de la pieza viajando de isla en isla (aparece en la nueva, como aparecen las
chozas); tocar `barra.ts`, `baraja.ts`, `cartas.ts` ni `camara.ts`; y ninguna regla más
que las que Miguel escribió.

Y tres que la segunda versión añade, porque salieron al medir y hay que dejarlas cerradas
para que no se cuelen por la puerta de atrás:

- **Un segundo campo de turno en la vista** para decir «éstos otros también pueden mover».
  Sería inventar en `shared/mecanicas/` una forma de turno que hoy no tiene ningún juego, y
  es exactamente lo que el §5.3 del diseño prohíbe. El precio de no hacerlo está dicho en
  el §9.1: al segundo de la cola no le llega aviso al móvil hasta que le toque.
- ~~**Tocar `verificar-mesa.ts`.**~~ **ESTA SE CAYÓ EN LA FASE 1, y hay que decirlo aquí
  porque es la única promesa de este apartado que se rompió.** El argumento («con el
  descarte en `acciones` y el destino en `caras`, su bucle se conduce solo») era correcto y
  seguía siendo correcto; lo que no se vio es que el bucle elige por **familias**, y una
  regla que no ofrece ninguna otra cosa deja sin jugada a quien no tenga familia para ella.
  Son dos líneas y el campo nuevo en la lista de campos de la vista. Lo que se conserva del
  espíritu de esta prohibición es que **ninguna fase de aquí reescribe ese bucle**: la
  fase 1 le añadió lo que necesitaba para no cortarse, y nada más (§12.11).
- **Subir la ventana de cuarenta vueltas de ese bucle.** No entra, y ahora por una razón
  mejor: **esa ventana ya no existe**. Desde `3942556` el bucle juega hasta el ganador
  (§12.11), así que no hay número que subir. Lo que la fase 2 tenía que mirar aquí se
  queda como medida escrita: un siete cuesta unas seis vueltas con la política uniforme a
  tres colonos, y veinte en el peor descarte de la tanda de dos colonos.

## 15. El orden, en fases que se empujan una a una

### 15.0. Dónde va este documento entre los tres, y por qué

Los tres encargos que salieron del mensaje de Miguel tienen su documento, y **el orden de
empuje está decidido. Y son NUEVE fases y no dos**: la segunda versión de este apartado
colocaba en el orden global sólo las fases 1 y 2 de aquí, y dejaba fuera las tres restantes
de este documento y las de los otros dos. Seguido al pie de la letra, ese orden llevaba a
empujar el trueque entero **antes de que existiera la fase que lo vigila**, que es la 5 de
aquí y de la que el trueque cuelga por su nombre (§9 de `docs/EL-TRUEQUE-DE-RIBERAS.md`).
El orden completo es éste:

| # | Fase | De quién |
|---|---|---|
| 1 | **La pieza, con su bloqueo y su robo. HECHA en `958962a`** | **Mía, fase 1** |
| 2 | **El descarte del siete** | **Mía, fase 2** |
| 3 | El texto de las cartas y su comprobador, sin nada en pantalla | Cartas, fase 1 |
| 4 | La mano por clases en el retablo | Cartas, fase 2 |
| 5 | **La guardia mueve**, junto con la guardia con el estiaje | **Mía, fase 3** + cartas, fase 5 |
| 6 | **Las mil partidas: el jugador ciego y uniforme** | **Mía, fase 5** |
| 7 | El trueque entero | Trueque, sus fases |
| 8 | El cartel en el escritorio | Cartas, fase 3 |
| 9 | El cartel en la app | Cartas, fase 4 |

Y **la fase 4 de aquí** (el tablero en tres dimensiones) **cabe donde quepa**, porque nadie
depende de ella; no está en la lista por eso y no por olvido. Es la misma tabla que escribe
`docs/LAS-CARTAS-SE-EXPLICAN.md` en su apartado del orden, y está copiada a propósito: un
orden que sólo viva en uno de los tres documentos es un orden que el que empuja no lee.

> **¿CAMBIA EL ORDEN DE LAS NUEVE POR LO QUE SE ADELANTÓ? NO, Y CONVIENE DECIR POR QUÉ NO,
> QUE ES LO QUE SE PODRÍA LEER MAL.** Lo que la fase 1 se llevó por delante es **la mitad
> de la fase 4**, y la fase 4 es justamente la única que **no tiene sitio en esta tabla**.
> O sea que lo adelantado salió del único cajón cuyo movimiento no mueve nada: nadie
> dependía de la fase 4 antes, nadie depende de ella ahora, y su mitad restante (soltar la
> pieza sobre una comarca) sigue sin bloquear a nadie. Las ocho filas de arriba se quedan
> donde estaban, con las mismas dependencias y por las mismas razones: **mi 3 sigue detrás
> de la fase 1 de las cartas**, porque la vacuna que ese cambio de regla pone roja no
> existe antes; y **la 6 sigue delante de la 7**, porque el trueque cuelga por su nombre de
> mi fase 5.
>
> Lo que sí cambia, y no es de orden sino de tamaño: **la fase 4 mide ahora la mitad**, y
> la 1 midió más de lo que este documento le había puesto. Eso hay que anotarlo aquí y no
> sólo en la lista de fases, porque quien planifique por el número de fases y no por lo que
> cada una contiene se llevaría la sorpresa al revés.

**Léase la tabla y no la numeración de aquí abajo.** Mis cinco fases están numeradas 1 a 5
por lo que cuesta cada una, no por el orden en que se empujan: en el calendario de verdad
**mi 3 va después de dos fases de las cartas** y **mi 4 no va en ningún sitio fijo**.

**De qué dependo yo, y quién depende de mí**, que es lo que hay que poder leer sin abrir los
otros dos:

- **De qué dependo:** de una sola fase ajena, y no es evidente. **Mi fase 3, «La guardia
  mueve», depende de la fase 1 de las cartas**, que es la del texto y su comprobador. El día
  que mi fase 3 le quite el `!estado.tirado` a `jugarLaGuardia`, la vacuna que ata el texto
  de la guardia a su regla se pone roja y hay que cambiar una fila; si esa fase no está
  empujada, la vacuna no existe, y el cambio de regla entra con el texto viejo y **toda la
  batería en verde**. Por eso mi 3 cae en el quinto sitio y no en el tercero. Mis fases 1, 2,
  4 y 5 no dependen de nada de los otros dos.
- **Quién depende de mí, y por su nombre:** **el trueque entero depende de mi fase 5**. Lo
  dice él en su apartado del orden, y apoya en ella dos afirmaciones suyas: que ninguna
  partida se queda sin opciones para nadie y que ningún movimiento ofrecido devuelve el mismo
  estado sin motivo. Y **las cartas dependen de mi fase 5** por lo mismo, y de mi fase 3, que
  es la que dispara su fase 5. Por eso **la 6 va antes que la 7** y no al revés: empujar el
  trueque antes es empujarlo sin la fase que lo vigila.
- **De quién no depende nadie:** de mi fase 4. Con cinco o seis colonos no existe (§9.2), y
  ninguna fase de ningún documento la cita. Adelantarla no desbloquea nada y aplazarla no
  bloquea nada.
- **Y una frontera que no es dependencia:** la regla del §2.2 —que en `'descartando'` no se
  contesta a trueques— quita algo que el trueque de hoy ya hace, y se escribe **aquí**, en mi
  fase 2. No espera al trueque y el trueque no la espera a ella.

Dicho corto, el orden de los tres documentos sigue siendo el de siempre:

1. **EL ESTIAJE** (este documento): la pieza con su bloqueo y su robo, el descarte, la
   guardia y el jugador ciego.
2. **LAS CARTAS** (`docs/LAS-CARTAS-SE-EXPLICAN.md`): el texto de las cartas y el cartel,
   que no tocan ninguna regla.
3. **EL TRUEQUE** (`docs/EL-TRUEQUE-DE-RIBERAS.md`): lo que más superficie nueva mete, y lo
   que espera a que el jugador ciego exista.

Y las razones, que son de lo que se ve jugando y no de comodidad de programación:

- **Hay una docena de sietes por partida que hoy no hacen nada.** Medido: 148 sietes en
  doce partidas, o sea 12,3 por partida (`medir2.ts`, primera vuelta, **reejecutado**, dos a
  cinco colonos mezcladas y bot uniforme); y de 81 a 234 sietes por tanda de
  doce partidas según la mesa, o sea de 6,8 a 19,5 por partida (`medir6.mts`, segunda
  vuelta, sin reejecutar, una tanda por cada número de colonos). Cada uno de
  ellos es un turno en el que hoy la única consecuencia es que nadie cobra. Es la
  superficie más grande del juego que está en blanco.
- **Mientras acumular no cueste, el trueque no hace falta.** Ésa es la razón de orden más
  importante y está medida en el §0: con el bot que más gasta de todos, el 93,8 % de las
  manos pasa de siete y la máxima llega a 831 fichas. Un trueque mejor sirve para
  conseguir lo que te falta; con almacenes así, no falta nada. **Empujar el trueque antes
  que el estiaje sería mejorar la puerta de una casa sin paredes.**
- **Y las cartas van en medio porque no tocan ninguna regla**, así que no pueden chocar ni
  con lo de antes ni con lo de después.

**De qué depende cada fase de este documento**, dicho para que se pueda empujar de una en
una sin sorpresas:

| Fase | Depende de | No depende de |
|---|---|---|
| 1. La pieza, el bloqueo y el robo | Nada. Es la primera de todo el trabajo | Ni de las cartas, ni del trueque, ni del 3D |
| 2. El descarte | De la fase 1 (`estiaje` en el estado, y el momento al que se vuelve) | Del trueque, salvo por la regla de que en `'descartando'` no se contesta (§2.2), que se escribe aquí y no allí |
| 3. La guardia mueve | De la fase 1 (el robo extraído), de la 2 (para poder afirmar que la guardia **no** llena `descartes`) y **de la fase 1 de las cartas**, que es la que deja escrita la vacuna que este cambio de regla pone roja | Del trueque |
| 4. El tablero en tres dimensiones. **Media hecha en la 1** | De la 1 (que ya se llevó el dibujo) y de la 2 | Y **nadie depende de ella**: con cinco o seis colonos no existe (§9.2). Lo que le queda es soltar la pieza, y el botón ya mueve |
| 5. El jugador ciego | De la 1, la 2 y la 3, porque es quien las juega todas | De la 4 |

### 15.1. Las fases

Cada fase deja el juego entero y verde, y ninguna depende de la siguiente. **Y en cada una
de ellas, lo del retablo va DENTRO y no después**: en una mesa de cinco o seis el retablo
es la única pantalla que hay (§9.2), así que una fase que dejara el retablo para luego
dejaría el juego sin jugar en esas mesas.

1. **La pieza, el bloqueo y el robo. Sin descarte. HECHA en `958962a`.**

   **Lo que trajo, en `shared/arcade/juegos/riberas.ts` y con la misma forma que hoy tiene
   el código.** El renombrado de `ESTIAJE` a `SUMA_DEL_ESTIAJE`, que iba el primero porque
   hacerlo después obliga a hacerlo dos veces. `estiaje: LlaveDeHex | null` y
   `estiajePorMover: boolean` en `EstadoDeRiberas`, en `VistaDeRiberas` y en `loQueSeVe`,
   los dos públicos y ninguno en `loSecretoDeRiberas`. `laDuna(islas)`, que busca por
   `RINDE[terreno] === null` y no por el nombre. El estiaje naciendo ahí en
   `repartirElDelta`. El relleno de `comoSiSiempreHubieraHabidoMazo` **en la duna y no en
   nulo**, con la guarda por `=== undefined` (§1 bis, 4), y la normalización de `comoVista`.
   El `continue` de `repartirLaCosecha`, después del número y antes de `RINDE`. El
   movimiento `MOVER_EL_ESTIAJE = 'riberas:estiaje'` con su carga `{ donde, a }` y su `id`
   `estiaje:${donde}:${a ?? 'nadie'}`, leídos con `dondeDeLaCarga` y `campoDeTexto`, que ya
   existían. `elRobo` extraído de `jugarLaGuardia` y llamado desde las dos puertas, con la
   carta quedándose lo que es de la carta (§1 bis, 3). `moverElEstiaje` y `conElEstiajeEn`
   (§1 bis, 1). `opcionesDelEstiaje`, con `piezaSuyaEn` y con `A_LA_ISLA` y
   `laIslaEnPalabras`, que es una pieza que este documento no tenía: la preposición y el
   artículo van en la tabla porque dos de los seis terrenos son masculinos, así que un `a
   la` fijo escribe «a la cantil» y un `a ${el}` escribe «a el carrizal», y ésta es la casa
   donde los rótulos se leen en voz alta. El corte de `opcionesDeTurno` justo después del
   `if` del turno y **antes** del bloque de tirar, sin ofrecer `TIRAR` (§3 bis), con la
   guarda hermana en `tirarLosDados`. **Y una guarda que este documento no pedía y que hizo
   falta: `pasarTurno` también corta**, o la bandera cruzaría al turno siguiente (§1 bis,
   1). `venceElPlazo` con `moverPorElAusente`, sin robar y sin gastar azar, y pasando el
   turno después (§1 bis, 2). La rama del aviso, **delante** de la de tirar. La ayuda de
   `TIRAR`, que ahora cuenta lo que pasa con un siete. Y `MOVER_EL_ESTIAJE` exportado en
   `shared/arcade/juegos/index.ts`.

   **LA LÍNEA QUE ENCIENDE LA BANDERA**, que es de la que cuelga todo:

   ```
   if (suma === SUMA_DEL_ESTIAJE) return { ...conLaTirada, estiajePorMover: true };
   ```

   Sin ella, esta fase se puede empujar entera (la pieza, la vista, el bloqueo, los
   dieciocho destinos, el corte, la guarda del reductor, las dieciocho caras tocables y el
   comprobador) y **sale verde con un estiaje que no se activa jamás**. Es el peor de los
   verdes, porque parece hecho. **Su vacuna aterrizó como forma y no como línea suelta**, y
   eso es mejor de lo que este documento pedía: el bloque del estiaje de `verify:riberas`
   **se juega hasta un siete de verdad con el árbitro delante**, no se monta con un estado
   escrito a mano, y su primera comprobación es que el siete SALE, con el número de tiradas
   que costó; así, quitar esa línea no pone roja una comprobación, sino el bloque entero.

   **En el retablo, en esta misma fase.** `primeraDelEstiaje` al lado de `porSitio`,
   con su mismo contrato de «la primera gana» y sin tocar `porSitio`, porque la llave con
   la que una cara encuentra su movimiento es la isla y no el `id`. El `toque` en las
   dieciocho caras y **la exclusión de `acciones` de esas dieciocho**, dejando ahí sólo las
   víctimas de más. El `rotulo` `· estiaje` de la ocupada. **Y el relleno EN PENUMBRA, que
   es lo que cambió**: aquí ponía «el borde en acento», y las dos mitades de esa frase eran
   falsas (§6.4). La cabecera de `textoDeCara` reescrita, sin tocar una línea de código
   debajo (§12.9).

   **En el tablero de tres dimensiones, que era de la fase 4 y se adelantó** (§9.1): el
   campo del contrato pasa de `ladron` a **`seca`** en `escenas/tipos.ts`, el componente de
   `escenas/delta.tsx` de `Ladron` a **`LaComarcaSeca`**, `deltaDeLaVista` lo lee de la
   vista con `hexDeLlave` y `comoVistaLlana` lo normaliza, y `banco3d.tsx` lo llama por su
   nombre nuevo. Lo que **no** entró y sigue en la fase 4: `sitiosDelEstiaje`, la señal por
   comarca y el posavasos de la duna.

   **Comprobadores al aterrizar** (§11.3): `verify:riberas` **423**, `verify:mesa`
   **2.915** con **32 sietes jugados**, `verify:riberas-en-tres` **343**,
   `verify:escritorio` **458**; batería **76 de 76 en verde**. Lo que ganó cada uno:

   - **`verify:riberas`**, el bloque «EL ESTIAJE: la pieza, el bloqueo, el robo y el
     reloj», jugado y no montado. Que el siete enciende la bandera; que mientras haya que
     mover no se ofrece `TIRAR` ni `PASAR` ni construir ni trocar ni comprar, y que a los
     otros dos no se les ofrece nada; que `TIRAR` y `PASAR` mandados a mano devuelven el
     mismo objeto; que los destinos son dieciocho **y son exactamente ésos**; que quedarse
     donde está y un destino que no es isla devuelven el mismo objeto; **quién puede ser
     víctima, calculado como regla para cada isla y contrastado con la lista**, y no como
     caso de esta semilla; que la ficha viaja entera **con su número de serie**; que nadie
     más gana ni pierde; que el turno sigue siendo suyo; que no se mueve ningún premio, con
     la victoria puesta delante (§12.15); el caso sin víctima, que mueve igual y no gasta
     azar; el retablo, con sus dieciocho caras tocables y la ocupada con su texto entero; el
     bloqueo **con una tirada fabricada**, midiendo que la isla deja de rendir exactamente
     lo suyo y que las demás de ese número siguen rindiendo; el reloj entero; la mesa
     guardada de ayer, **con la vacuna de los diecinueve destinos ejecutada**; y la vista de
     ayer, que no apaga el juego. Más el bloque de la penumbra y del filo (§6.4).
   - **`verify:escritorio`**, el paso `elEstiajeSeOye` (§1 bis, 6).
   - **`verify:riberas-en-tres`**, el bloque 12 bis, que cubre la ventana entre esta fase y
     la 4 (§9.1).
   - **`verify:mesa`**, la familia `estiaje` en su bucle y los dos campos nuevos en la lista
     de campos de la vista (§12.11).

   **Y lo que esta fase le hizo a lo que ya había, que es la parte que no estaba escrita.**
   Tres comprobadores conducían partidas con una política fija, y **una política fija dejó
   de ser completa el día que el siete empezó a hacer algo**: el paso «Una partida entera»
   de `verificar-riberas.ts`, el bucle de `verificar-mesa.ts` y dos turnos escritos a mano
   en `verificar-riberas-en-tres.ts` se quedaban sin jugada una de cada seis tiradas. Los
   tres ganaron el estiaje **el primero** de su orden, no para que pasaran, sino porque un
   siete no se resuelve hasta que alguien mueve la pieza. Y en `verificar-riberas.ts`,
   `ctxDe` pasó de `const` con una flecha a función declarada, para poder llamarla desde el
   bloque nuevo, que va arriba.

   **Lo que esta fase promete y lo que no.** Promete lo de arriba, y **ya sí promete que
   `verify:mesa` juega el estiaje**, que las tres primeras versiones decían con razón que
   no podía prometer (§12.11). No promete que nada de esto esté vigilado **desde la lista
   completa y para todos los sentados**: eso es la fase 5, y sigue haciendo falta (§13).

   **Lo visible:** al sacar un siete hay que mover, una isla deja de rendir, se ve cuál (en
   penumbra en el retablo, con una tienda plantada en el tablero de tres dimensiones), y a
   quien tiene algo puesto ahí se le quita una ficha.

2. **El descarte.** El momento `'descartando'`, `descartes` en el estado y en la vista, **la
   rama nueva `if (v.momento === 'descartando') return opcionesDeDescarte(v, quien);` en
   `opcionesDeRiberas` con su función hermana** (§2.2 bis) —y **ni una línea del descarte
   dentro de `opcionesDeTurno`**, que es donde las dos versiones anteriores lo pusieron y
   donde no se ejecuta nunca—;
   `turnoDe` apuntando al primero que falta, las opciones ficha a ficha con su `id`
   `descartar:${bien}`, el `DESCARTAR` en
   `acciones` (decisión 12), **la regla de que en `'descartando'` no se contesta a
   trueques** (§2.2), **el aviso que mira `descartes` y no `turnoDe`** (§9.1), y el tic
   descartando por todos con las fichas más viejas.
   **Comprobadores:** que el descarte se ofrece a quien no tiene el turno; **que en
   `'descartando'` `opcionesDeRiberas` devuelve una lista NO VACÍA para cada uno de los que
   deben descartar**, que es la que caza el fallo de haberlo escrito en `opcionesDeTurno`
   (con la lista vacía, la mesa se para en seco y ninguna otra comprobación se entera); que
   tira exactamente `floor(n/2)`; que quien tiene siete o menos no descarta (la vacuna: con
   ocho sí); que el tic resuelve el de todos; **que con un trato en `'propuesta'` el
   destinatario no ve `ACEPTAR` ni `RECHAZAR` mientras descarta, y sí los ve en
   `'jugando'`** (§2.2); **que el segundo de la cola lee «Tira N fichas» y no «Se espera
   a…»**, que es la vacuna del §9.1 y la que se habría caído con el diseño anterior; y **la
   comprobación que sostiene la decisión 2**: que jugando a ciegas leyendo `turnoDe` la
   partida atraviesa un siete con manos grandes y sigue, con el recuento de revisiones
   delante para que el verde no sea por conjunto vacío. `verify:larga` gana una vuelta con
   un siete y un plazo vencido en medio.
   **Lo que hereda de la fase 1, y que ya no hay que escribir aquí:** `estiaje` y
   `estiajePorMover` en el estado y en la vista con su relleno y su normalización; el
   momento al que se vuelve; el `id` con el bien dentro, que es la misma forma que ya usa
   el destino con su víctima; y sobre todo **la línea del siete**, que en esta fase gana su
   segunda mitad: `descartes` lleno con quien tenga más de siete fichas y `faltan:
   Math.floor(almacen.length / 2)`, congelado en ese instante.
   **Y la ventana de `verify:mesa`: ya no existe.** Esta fase no tiene número que subir,
   porque desde `3942556` el bucle juega hasta el ganador (§12.11). Lo que sí hereda es una
   pregunta nueva y mejor: ese bucle **atraviesa 32 sietes**, así que en cuanto el descarte
   entre, los atravesará descartando, y hay que mirar que su política de familias sepa
   elegir un `riberas:descartar` (con el descarte en `acciones`, lo sabe: §2.5). Los números
   medidos se quedan escritos para quien los necesite: **unas seis vueltas por siete** con
   la política uniforme a tres colonos, y **veinte en el peor descarte** de la tanda de dos
   colonos (`medir6.mts`).
   **Lo visible:** con más de siete fichas, un siete duele.

3. **La guardia mueve.** `jugarLaGuardia` pierde el `!estado.tirado`, `opcionesDelMazo` se
   ofrece también antes de tirar, y la carta pasa a mover y robar desde la isla sin
   descarte. `GUARDIA_MINIMA`, `PUNTOS_DE_LA_GUARDIA` y La Mayor Guardia intactos.
   **Comprobadores:** que la guardia se puede jugar sin haber tirado (vacuna: y que sigue
   sin poder jugarse la comprada hoy, y sigue siendo una por turno); **que al jugarla sin
   haber tirado, la lista que sale son los dieciocho destinos y `TIRAR` NO está en ella**
   (ésta es la comprobación que la primera versión de este documento no habría pasado, y va
   escrita así, con el «y `TIRAR` no está», porque sin esa mitad la comprobación pasa
   también con el corte en el sitio malo del §3 bis); que jugarla **no** llena `descartes`
   aunque haya manos de nueve; **el turno del §3 ter entero**: guardia antes de tirar, robo,
   tirada de siete, descarte y segundo robo, comprobando que el segundo robo funciona, que
   `guardias` sube una sola vez y que La Mayor Guardia se recalcula una sola vez; y que La
   Mayor Guardia sigue cambiando de dueño sólo por superación estricta.
   **Lo que hereda de la fase 1, y es más de lo que este documento le había puesto:** el
   robo ya está extraído en `elRobo` y llamado desde las dos puertas, así que esta fase **no
   toca el robo**; el corte de `opcionesDeTurno` ya está en su sitio, antes del bloque de
   tirar y no donde corta `veredasGratis`, que es exactamente lo que esta fase necesitaba y
   la razón por la que se escribió allí ya (su comentario lo dice, nombrando esta fase); y
   la rama del aviso ya va **delante** de la de tirar, por lo mismo. O sea que de las tres
   cosas que esta fase pedía de fontanería, las tres están puestas, y lo que le queda es la
   regla: quitar el `!estado.tirado` y ofrecer la carta por el camino de antes de tirar,
   **las dos mitades a la vez**.
   **Y lo que sigue igual: esta fase depende de la fase 1 de las cartas**, que es la que
   deja escrita la vacuna que este cambio de regla pone roja
   (`docs/LAS-CARTAS-SE-EXPLICAN.md`). Sin ella el cambio entra con el texto viejo y toda la
   batería en verde. Por eso va en el quinto sitio del orden global y no en el tercero.
   **Lo visible:** catorce cartas de veinticinco pasan a valer lo que valen.

4. **El tablero en tres dimensiones. LA MITAD ENTRÓ EN LA FASE 1** (§9.1).
   > **HECHO el 9 de septiembre de 2026, en `lobby-catan`, después de dos partidas más.** Lo que
   > queda escrito debajo como pendiente ya está, con dos diferencias respecto a lo previsto,
   > las dos pedidas jugando: (1) `sitiosDelEstiaje` (en `riberas-en-3d.ts`, como se dijo) no
   > devuelve un movimiento por isla sino **la lista de opciones de cada isla** —una por
   > víctima—, y `estiajeEnTres` la traduce a un `Colocando` de clase `comarca` más un mapa por
   > isla; al soltar, una se manda y dos abren `ElijeUna` («A quién le robas»). La señal es la
   > misma `Senal` de los sitios de obra y va en **negro** (`COLOR_DEL_ESTIAJE`), no en verde:
   > secar no es construir. Los dieciocho botones del carril se van por `opcionesFueraDeLasIslas`,
   > que recibe el estiaje traducido y no un interruptor, así que el retablo y la app los
   > conservan. (2) La **duna** lleva por fin ficha: un posavasos **blanco** con el
   > **siete y sus seis puntos**, igual que las demás y en su mismo sitio (`Numero` con
   > `enBlanco`, `SIETE_DE_LA_DUNA` en `delta.tsx`). Es lo que Miguel echaba de menos —«el número
   > 7 con el círculo blanco en la tesela del ladrón», la del ladrón es la duna donde empieza—;
   > estuvo un rato puesto sobre la comarca del estiaje, viajando con la tienda, y lo corrigió
   > jugando: «no en el desierto». El §7 de esta tabla, que decía «no se le pone número», se
   > refería al número CON EL QUE RINDE la isla, que sigue sin ponerse. Y una tercera cosa que no era de esta
   > fase pero se vio con ella: durante `descartando` los dados y el hueco del mazo **se
   > quedan**, apagados —`laMesaEstaPuesta` en `riberas-en-tres.ts`—, porque salían con el
   > siete puesto y desaparecían, y la barra recolocaba sus piezas por un paréntesis. De esta fase no
   > queda nada pendiente.
   **Ya está:** el campo `seca` en `escenas/tipos.ts` (no `bloqueada`), `deltaDeLaVista`
   devolviéndolo, el componente `LaComarcaSeca` (no `Estiaje`) plantando la tienda sobre el
   relieve, y `banco3d.tsx` al día. **Se ve dónde está el estiaje.**
   **Lo que queda:** `sitiosDelEstiaje` en `riberas-en-3d.ts`, el `Colocando` de clase
   `'comarca'` con una `Senal` por isla, y el posavasos sin cifra de la duna. O sea,
   **soltar la pieza**, y darle a la duna la casilla que le falta.
   **Y un hueco que la fase 1 dejó abierto y que hay que cerrar aquí, dicho en voz alta
   porque es la clase de cosa que se pierde:** la tienda **ya se pinta y nadie la cuenta**.
   `verify:escena` no nombra `DeltaEn3D` en ninguna línea, así que no cubría `ladron` antes
   y no cubre `seca` ahora; quien mira el campo es `verify:riberas-en-tres`, y mira el
   CONTRATO (que al empezar la comarca seca es la duna, y que es la duna de verdad y no
   cualquiera), no el dibujo. O sea que los 86 triángulos y la `talla 3` de la tienda están
   medidos en este documento y en ninguna batería. **Es de esta fase cerrarlo**, y va con lo
   demás.
   **Comprobadores:** `verify:escena` cuenta los triángulos nuevos (44 del posavasos, y los
   86 de la tienda, que se pintan desde la fase 1 sin que nadie los sume), exige que la duna
   lleve posavasos y no lleve cifra, y que las señales de comarca sean 18 y ninguna sea la
   de ahora. Y lo que ya vigila el bloque
   12 bis de `verify:riberas-en-tres` (que con el estiaje por mover los dieciocho destinos
   llegan a los botones y que `obrasPosibles` no se inventa un sitio de comarca) **pasa a
   ser su vacuna**: el día que las señales existan, esa afirmación tiene que seguir siendo
   verdad o el botón se habrá quedado sin reserva. En el banco (`escritorio/banco3d.html`)
   se mira con ojos: que la tienda se lee a 23 puntos, que los dieciocho anillos no se pisan
   en el lienzo más pequeño, y que la pieza no tapa el número de su isla.
   **Lo visible:** se mueve con el dedo, en vez de con un botón. Y **sólo hasta cuatro
   colonos**: con cinco o seis se sigue jugando en el retablo, que ya lo tiene todo desde la
   fase 1 (§9.2 y §13).

5. **EL JUGADOR CIEGO. El comprobador que hoy no existe y que hace falta más que ninguno.**

   **Por qué es una fase de este documento y no de los otros dos.** Porque el estiaje va
   primero, y porque de las tres reglas nuevas de los tres encargos **la única que puede
   colgar un bucle es el descarte**: es el único momento del juego en que la partida no
   avanza hasta que alguien haga varios movimientos seguidos, y el único en que quien
   mueve no es quien tiene el turno «de verdad». Los otros dos documentos citan esta fase
   por su nombre y apoyan las suyas en ella.

   **Lo que hereda de las tres primeras, y lo que la cuarta versión le quita de encima.**
   De la fase 1 hereda la regla entera y, sobre todo, **un segundo testigo que ya no es
   ninguno de los dos que este documento contaba**: el bucle de `verify:mesa` juega tres
   partidas hasta el ganador y atraviesa 32 sietes (§12.11), así que la afirmación «hoy
   nadie juega esto» ya no vale tal cual y hay que decirlo con precisión, porque de esa
   frase colgaba media justificación de esta fase. Lo que **sigue** sin vigilar nadie es lo
   de la tabla del §13: la lista **completa** y **todos** los sentados. Un descarte de tres
   colonos a la vez no lo ve quien pregunta por un solo asiento, y eso no lo arregla jugar
   más partidas.

   **Qué vigila que no vigila nadie.** Medido y no supuesto (§2.5): `jugar:fondo` juega
   los cuatro juegos de la SALA por su manifiesto y no toca ningún arcade. Y los dos sitios
   que hoy juegan Riberas entera eligen los dos **con una política escrita**, que es
   justamente lo que esta fase no hace: el paso «Una partida entera, con el árbitro, y
   reejecutada» de `verificar-riberas.ts` va con una preferencia fija (estiaje, tirar,
   torre, fundar, vereda, pasar) que **nunca ofrece un trueque, nunca acepta uno y nunca
   compra una carta**; y el bucle de `verificar-mesa.ts`, desde `3942556`, elige por
   familias ordenadas y sortea dentro de la familia, que es mucho mejor y **sigue siendo
   una política, y sigue preguntándole a uno**. O sea que nada comprueba que lo nuevo sea
   jugable **desde la lista completa y para todos los sentados**, que es la única forma en
   que un cliente lo va a jugar.

   **Qué es.** Partidas eligiendo **uniformemente de `opciones()` completa** (la unión de
   lo que se le ofrece a cada sentado, no sólo al del turno), de dos a seis colonos, en la
   batería como los otros lentos. Y **dos tandas y no una**, porque miden cosas distintas y
   cuestan cosas distintas (`medir10.mts`):

   | Tanda | Cuántas | Tope de pasos | Qué mide, y por qué así |
   |---|---|---|---|
   | **Desde cero** | pocas (del orden de veinte) | **5.000** | La partida entera con su colocación y su acumulación de verdad, que es donde el descarte se dispara solo. Cuesta lo suyo: a seis colonos la partida más larga medida fue de **3.934 pasos**, y terminaron 7 de 8 |
   | **Con el almacén lleno** (cuarenta fichas por colono, el atajo que ya usa `verificar-riberas.ts` y que el árbitro documenta) | **mil** | **1.000** | El final de partida, el descarte más duro que hay y la reejecución. Es barata: **ocho de ocho terminan en las cuatro mesas**, con medias de 115 a 274 pasos y máximo 581 |

   Y el tope no es un número de adorno: **si una tanda lo toca, el comprobador lo dice en
   voz alta con el recuento delante**, porque un tope que se toca a menudo es un
   comprobador que empezó a medir menos sin ponerse rojo, que es el modo de fallo del §12.11.

   **Qué afirma, y con qué recuento delante para que el verde no sea por conjunto vacío:**

   **(a)** Ninguna isla rindió nunca teniendo el estiaje encima. Con el recuento de cuántas
   veces salió el número de la isla bloqueada, delante. *Vacuna: quitando el `continue` de
   `repartirLaCosecha`, se pone roja.*

   **(b)** Ningún almacén pasó de siete fichas después de resolverse un siete. Con el
   recuento de sietes resueltos, delante. *Vacuna: quitando el descarte, se pone roja.*

   **(c)** **Ninguna partida se quedó sin opciones para nadie.** Medido, hoy eso se cumple:
   cero partidas sin opciones en las cuatro mesas de `medir10.mts`. Es la afirmación que
   caza un descarte que no ofrece nada, un `estiajePorMover` que no se apaga, y una cola de
   `descartes` con un asiento que ya no está.

   **(d)** **Ésta es la afirmación que otro documento espera por su nombre, así que va
   redactada UNA sola vez y con estas palabras, iguales aquí y en
   `docs/EL-TRUEQUE-DE-RIBERAS.md`:**

   > **Ningún movimiento ofrecido devolvió el mismo estado sin motivo, y el único que lo
   > devuelve con motivo es un `ACEPTAR` de un trueque cuyo oferente ya no tiene lo que
   > prometía.**

   Las dos versiones anteriores la escribían de otra manera («ninguno, salvo un `ACEPTAR`»)
   y el trueque de otra («ninguna opción devuelve el mismo estado sin motivo»), y las dos
   redacciones se leían igual y afirmaban cosas distintas: la de aquí exceptuaba **todos**
   los `ACEPTAR`, y la de allí no exceptuaba ninguno pero exigía un motivo. La de arriba es
   la que hay que escribir, porque dice las dos cosas: la excepción tiene nombre **y**
   tiene causa, y cualquier otro movimiento que no cambie el estado —o un `ACEPTAR` que no
   cambie el estado por cualquier otra razón— la pone roja.

   La medida que la sostiene: de 45.000 pasos, los 200 movimientos que no cambiaron nada
   eran **todos** `riberas:aceptar` (`medir12.mts`, segunda vuelta, sin reejecutar), que es
   exactamente el contraejemplo del «sólo si» que `opcionesDeTurno` documenta en su sitio
   (se ofrece aceptar mirando mi mano, no la del oferente, porque su almacén no está en mi
   vista). Afirmar «ninguno» sería escribir un comprobador que nace rojo; ésta es una
   afirmación fuerte que hoy se cumple y que se rompe en cuanto alguien ofrezca un descarte
   imposible o un destino ilegal. *Vacuna: ofrecer a propósito un `DESCARTAR` de un bien que
   no está en la mano tiene que ponerla roja.*

   **Y la otra mitad de lo que el trueque espera de esta fase, que este documento no
   nombraba ni una vez: la marca `declaracion`.** El trueque estrena en
   `shared/arcade/opciones.ts` un campo opcional `declaracion?: true`, que marca una opción
   que **no es un movimiento montado** sino la declaración de lo que el juego admitiría —su
   puerta del trueque—, y lista como su cuarto lector **al jugador ciego de esta fase**. Así
   que se escribe aquí, con estas dos frases:

   - **El jugador ciego SALTA las opciones marcadas con `declaracion` al elegir.** Mandarlas
     no avanza la partida: la carga no está montada, el reductor la rechaza con un motivo, y
     lo único que se consigue es gastar una de cada N elecciones en un movimiento que nunca
     mueve nada. Que sea un filtro por la marca y no por el `id` es cosa del otro documento;
     lo que es de éste es que el jugador ciego la lea.
   - **Y hasta que el trueque exista no hay ninguna opción marcada**, así que este filtro
     nace sin nada que filtrar y **sin ponerse verde por conjunto vacío sin decirlo**: la
     fase 5 imprime cuántas saltó, y ese recuento es cero hasta la fase 7 del orden global y
     deja de serlo el día que el trueque aterrice. Un filtro que empieza en cero y no lo
     dice es el mismo verde de no mirar del §12.11, y aquí se dice.

   **(e)** Todas las partidas o terminan dentro del tope, o siguen teniendo opciones al
   llegar a él. **No** «todas terminan»: medido, terminan entre la mitad y siete de cada
   ocho (6/8 a dos colonos, 4/8 a tres, 5/8 a cuatro, 7/8 a seis; `medir10.mts`), y exigir
   el cien por cien sería exigirle a un jugador que elige al azar que gane una partida, que
   es otra cosa. Lo que sí se afirma es **el recuento de las que terminaron**, impreso, para
   que el día que baje a cero alguien lo vea.

   **Lo visible:** nada. Es el comprobador que hace que lo de arriba siga siendo verdad
   dentro de un año, y el segundo testigo de que Riberas se puede jugar sin saber a qué se
   juega.
