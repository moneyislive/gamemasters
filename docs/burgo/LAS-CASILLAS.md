# Las casillas que no se compran

Este documento es el encargo de Miguel del 16 de septiembre de 2026 convertido en plan, con la
medida de lo que el tablero aguanta delante. Lo que aquí se decide lo construye
`escenas/burgo/anillo-en-3d.ts` (dónde va cada cosa, sin `three`) y lo monta
`escenas/burgo/ciudad-en-3d.ts` (la geometría), y `verify:burgo-escena` lo mide.

La traza general del tablero está en [LA-CIUDAD.md](LA-CIUDAD.md); esto es el detalle de las
**catorce casillas que no son solar** más las cuatro esquinas.

---

## 1. El encargo, en sus palabras

> «Me gustaría que mejoráramos la apariencia de las casillas del tablero, ahora mismo las veo
> demasiado básicas y toscas.»

Y casilla por casilla: la **salida** con una flecha roja y SALIDA en grande en vez de fragmentos
de carretera; **ningún edificio** en los solares (hecho el 16 de septiembre); la **caja de la
comunidad** con un cofre o un ayuntamiento y una animación al caer; una **oficina del estado**
para el impuesto, con animación de recaudación; **cuatro estaciones distintas en 3D** unidas por
una vía que recorra **todo el perímetro** con trenes que circulen y paren; un **casino** para
suerte; una **compañía eléctrica** característica con su texto y su cantidad; una **cárcel que
parezca una cárcel** con animación de entrada; una **comisaría** en la que se vea entrar en la
celda; un **parking de verdad** con un cartel que ponga PARKING **visible desde arriba**; el
**agua** como la eléctrica; y el **impuesto de lujo**, a mi criterio.

Dos reglas transversales, que valen para todo lo de abajo:

- **Las animaciones siempre muy breves.** Ninguna pasa de 0,8 s; la del tren, que es continua,
  no espera a nadie.
- **Cada casilla con su nombre y un texto pequeño que explique de qué va.**

---

## 2. Lo que el tablero aguanta, medido el día del plan

| | Medido | Tope | Sobra |
| --- | --- | --- | --- |
| Triángulos, calidad plena | 181.333 | 900.000 | 718.667 |
| Triángulos, calidad sobria | 136.547 | 230.000 | 93.453 |
| Llamadas de dibujo, pose de salida | 92 | 150 | 58 |
| Llamadas de dibujo, cámara cerca | 114 | 150 | 36 |

Con el plan hecho —obras, vía y trenes, textos y piezas vivas— sigue sobrando de lo uno y
escaseando lo otro. La cifra de hoy está en la cabecera de `presupuesto.ts`, y `verify:burgo-escena`
la compara con la suma: no se copia aquí para que no se quede vieja.

Y de ahí sale **la decisión que gobierna todo este documento**:

> **Sobran triángulos y faltan llamadas.** Una pieza NUEVA del pack cuesta una llamada de dibujo
> para siempre —una `InstancedMesh` por pieza distinta en pantalla—; un edificio construido en
> código y FUNDIDO con los demás cuesta **cero**. Trece casillas con piezas nuevas se comerían la
> mitad del margen; trece casillas fundidas no gastan ninguna.

Por eso los edificios de estas casillas **no se traen del `.glb`: se construyen en código** y se
funden en una geometría única, del mismo modo que los precios, los emblemas y los nombres se
funden hoy en `geometriaDeLosRotulos()` y son **una sola llamada** para 88 dígitos, 12 emblemas y
55 letras. Se reusan piezas del pack sólo cuando ya están en pantalla por otra razón (coches,
farolas, semáforos, verja, torre de agua, columna, contenedor).

**Lo que se mueve no se puede fundir.** Cada pieza animada sale del fundido y se lleva su propio
grupo, como ya hace la reja de la Mazmorra (`papel: 'reja'` en las piezas de esquina, animada por
`alzadoDeLaReja` de `coreografia.ts` y movida en el bucle de `Burgo.tsx`). Cada una de ésas sí
cuesta una llamada, y por eso están contadas una a una más abajo.

### Las medidas de una casilla, que ninguna pieza puede saltarse

Casilla lateral 72 × 108; esquina 108 × 108. Bandas, de fuera adentro: **franja** `0..21` (ahí va
el nombre, `V_DEL_ROTULO = 11`), **filete** `21..30`, **superficie** `30..90` (el atrezo va en
`ATREZO = 60..90`, el precio en `V_DEL_PRECIO = 45`), **borde** `90..108`. El **carril del
avatar** es `23..29` y no lo pisa nada. Ninguna pieza puede salirse de su casilla ni entrar en la
ele engordada de la marcha.

---

## 3. El reparto, casilla por casilla

Los nombres son los del reglamento (`docs/burgo/REGLAS-EL-BURGO.md`). El código llama a algunas
por su identificador viejo —`arca`, `pregon`, `diezmo`, `alcabala`— y así se queda: el §0.3 del
reglamento decide no tocarlos, porque cambiarlos obligaría a migrar el diario y las mesas guardadas
sin cambiar ni una palabra de las que se leen. Lo que se lee sí va con el reglamento (§3 bis).

| # | Casilla | Qué se ve | Hecho de | Animación (dura) |
| --- | --- | --- | --- | --- |
| 0 | SALIDA ✅ | SALIDA por la diagonal (101 × 18,4) y la flecha roja de 28 en el pico de fuera | Sólo rótulo fundido; el cruce entero fuera | — |
| 10 | CÁRCEL ✅ | Muro, dos torretas con tejadillo, seis barrotes, dos pabellones y un ala; patio de hormigón | Código fundido + `verja` (que se anima) | La reja ya sube y baja tras el peón |
| 20 | PARKING ✅ | La esquina entera asfaltada, sesenta plazas amarillas, catorce coches y el cartel tumbado que dice PARKING | Código fundido + coches del pack | pendiente: el coche del que cae aparca (0,6) |
| 30 | COMISARÍA ✅ | Cuerpo, porche con dos columnas, farol azul y una celda de tres paredes y cinco barrotes, sin techo | Código fundido + la avenida y su patrulla; la reja, pieza viva | ✅ quien cae aquí corre a la celda por el paso de la avenida, entra bajo la reja subida y se desvanece dentro (0,8 más) |
| 2·17·33 | FONDO VECINAL ✅ | Cofre de madera con tapa, dos herrajes y cerradura, sobre zócalo de piedra | Código fundido; la tapa, pieza viva | ✅ la tapa se abre al coger carta del Fondo (0,7) |
| 7·22·36 | SUCESOS ✅ | Casino: cuerpo, marquesina que vuela, rótulo vertical con cinco bombillas y la ruleta tumbada en el suelo | Código fundido (discos); la ruleta, pieza viva | ✅ la ruleta gira al coger carta de Sucesos (0,8) |
| 12 | CENTRAL ELÉCTRICA ✅ | Dos torres de refrigeración CON CINTURA (dos troncos pegados), chimenea con banda roja y nave de turbinas | Código fundido (troncos); el humo, pieza viva | ✅ al pagar la renta de la Luz, tres bocanadas salen por la chimenea (0,8) |
| 28 | CANAL DE AGUAS ✅ | Depósito elevado sobre cuatro patas, alberca con agua y caseta de bombas | Código fundido (troncos); la onda, pieza viva | ✅ al pagar la renta del Agua, una onda se abre en la alberca (0,6) |
| 4 | IMPUESTO ✅ | Escalinata de dos peldaños que es también basamento, cuatro columnas, puerta, cornisa y ático escalonado | Código fundido; la moneda, pieza viva | ✅ al pagar el Impuesto, una moneda grande sube rodando la escalinata y entra por la puerta (0,6) |
| 38 | TASA DE LUJO ✅ | Alfombra granate, pedestal de mármol y una joya de ocho caras —la única pieza que no es un prisma— | Código fundido (triángulos); la joya, pieza viva | ✅ la joya da una vuelta al pagar la Tasa (0,5) |
| 5·15·25·35 | LAS CUATRO ESTACIONES ✅ | Andén, marquesina sobre cuatro columnas y casa de viajeros; y el remate que las distingue: torre del reloj (5), aguada y carbonera (15), bóveda escalonada (25) y apeadero de madera (35) | Código fundido | ✅ los trenes paran 2,5 s en cada una |
| — | EL FERROCARRIL ✅ | Balasto, 584 traviesas y dos carriles dando la vuelta entera, con curvas de radio 15 en las esquinas | Código fundido (3.072 triángulos con todo lo demás) | ✅ dos trenes dan la vuelta sin esperar a nadie |

Las casillas SIN precio llevan además su **texto pequeño** debajo del nombre —hasta 8 de alto,
cuando el nombre llega a 16 en una lateral y a 26 en una esquina—: lo que hace al caer en ella, en
dos o tres palabras. Las que tienen precio no lo llevan, porque su explicación es la cifra (§3 bis).

### El coste de todo esto, contado antes de escribirlo

Fundido en una geometría nueva (`geometriaDeLaObra`, hermana de la de los rótulos): **1 llamada**.
Piezas animadas, una llamada cada una: reja (ya existe), tapa del cofre, ruleta, moneda del
impuesto, joya, coche del parking, y los trenes (una `InstancedMesh` para los dos). Total nuevo:
**7 llamadas** de las 36 que hay de margen con la cámara cerca. Los triángulos no son problema:
trece edificios de código a ~1.500 son 20.000 de los 718.000 que sobran.

---

## 3 bis. El tablero habla como el reglamento

Los nombres de las cuatro esquinas se escribieron primero con las palabras del encargo —CÁRCEL
en la 10, PARKING en la 20, COMISARÍA en la 30— y dos de las tres eran un error: el §0.2 del
reglamento dice literalmente «ni "cárcel" por la Comisaría», y la lista de nombres es cerrada. El
cartel del pie decía «La Comisaría» mientras el suelo de la misma casilla decía CÁRCEL.

Así que el suelo dice lo que dice el reglamento:

| Casilla | En el suelo | Texto pequeño | Lo que hay construido |
| --- | --- | --- | --- |
| 0 | SALIDA | COBRA 200 | flecha roja |
| 10 | COMISARÍA | DE VISITA | el recinto con muro, torretas y barrotes |
| 20 | DESCANSO | NI DA NI QUITA | el aparcamiento, con su cartel PARKING |
| 30 | ¡A COMISARÍA! | RETENIDO | el cuartel con su celda |
| 2 · 17 · 33 | FONDO | COGE CARTA | el cofre |
| 7 · 22 · 36 | SUCESOS | COGE CARTA | el casino |
| 4 | IMPUESTO | — (su cifra: 200) | la oficina del estado |
| 38 | TASA | — (su cifra: 100) | la joya en su escaparate |
| 12 · 28 | LUZ · AGUA | — (su precio) | la central y el canal de aguas |
| 5 · 15 · 25 · 35 | PUERTO · BUSES · CARGA · TREN | — (su precio) | las cuatro estaciones |

Las cuatro estaciones se quedaron un tiempo sin nombre: los nombres nacieron al quitar los
emblemas planos de las casillas especiales, y las estaciones nunca llevaron emblema. Llevan su
rótulo del reglamento, en la franja, que su obra deja libre.

Lo que Miguel pidió con sus palabras está en lo CONSTRUIDO: el recinto de la 10 parece lo que él
llamó una cárcel de verdad, y el cartel del aparcamiento dice PARKING, porque es un letrero y no
el nombre de la casilla —igual que el casino no le cambia el nombre a los Sucesos—.

El texto pequeño sólo lo llevan las casillas **sin precio**: en las que tienen, la explicación ya
está escrita y en grande, que es la cifra. Sus palabras también son del reglamento —«no da ni quita
nada» es su definición del Descanso—, y los 200 de la Salida son `PAGA_DE_LA_PUERTA_MAYOR`.

**Y ya no se puede volver a desviar sin que se vea**: `verify:burgo-escena` compara cada nombre del
suelo con el reglamento —tiene que ser su rótulo o un trozo de su nombre— y barre todo el texto
del tablero, carteles incluidos, contra los sinónimos que el §0.2 prohíbe.

## 4. El orden, y por qué éste

1. **SALIDA** (fase 2) — **hecha**. Quitar piezas y escribir letras, que era lo más barato, y de
   paso resolver el sitio de los rótulos en las **esquinas**, que hasta entonces no llevaban
   ninguno: van por la diagonal del cuadro de suelo de 90, con la cuenta del rombo
   (`ancho + alto ≤ L√2`) que `verify:burgo-escena` mide letra a letra. La esquina se quedó en
   **cero piezas**, y lo que la sustituye no cuesta ninguna llamada: va fundido con los rótulos.
2. **Las tres esquinas restantes** (fase 3): cárcel, parking y comisaría. Comparten el problema de
   la esquina —108 × 108, la ele de la marcha por en medio— y conviene resolverlo una vez.
   - **El aparcamiento, hecho.** Con él entra la máquina que van a usar las once casillas que
     quedan: `burgo/obras.ts` describe volumen en código, cuadro a cuadro y sin `three`;
     `geometriaDeLasObras()` lo funde en UNA malla y UNA llamada de dibujo; el presupuesto lo
     cuenta a dos triángulos por cuadro; y la lupa cenital del comprobador mira desde arriba que
     ninguna cara esté del revés, que es el fallo que no se ve en ninguna cuenta.
   - **La cárcel, hecha.** Muro, torretas y barrotes en código; los cuatro bloques del pack se
     fueron. Y con ella entran dos reglas que valen para toda obra que venga: que **ninguna se
     sale del cuadro de su casilla** —la primera torreta asomaba hasta 435 y el cuadro acaba en
     432— y que la lupa cenital mira **por casilla** y no sobre la huella de todas juntas, que con
     dos esquinas amuebladas se quedaba en 29 rayos de 289.
   - **La comisaría, hecha** (el edificio y la celda; la animación de entrar en ella va con las
     demás, en la fase 6). Con ella, **las cuatro esquinas están**.
3. **Las laterales** (fase 4): fondo vecinal, sucesos, eléctrica, aguas, impuesto y tasa. Aquí
   entra también el arreglo de los nombres viejos.
   - **Hechas: el cofre (2, 17, 33), la oficina del Impuesto (4) y la joya de la Tasa (38).** Con
     ellas la máquina aprendió dos cosas que le faltaban: el marco de una casilla LATERAL —otra
     vara que la de una esquina, mismo determinante −1, mismas vueltas— y las caras de TRES
     puntos, que se escriben repitiendo el cuarto.
   - Y una regla de composición que vale para las cinco que faltan: **la casilla que tiene obra
     pierde su emblema plano**, porque el emblema ocupa exactamente la banda donde se levanta el
     edificio. El edificio es el icono.
   - **Hechas también el casino (7, 22, 36), la central (12) y el canal de aguas (28).** Con ellas
     entran las dos formas que no son cajas: el TRONCO DE CONO —la cintura de una torre de
     refrigeración son dos troncos pegados, que es como todo el mundo dibuja una central— y el
     DISCO tumbado, que es la ruleta y la tapa de un depósito. Las vueltas de las dos van
     derivadas y escritas, no probadas a ojo.
   - Y con la última obra **desaparece el emblema plano de casilla**: las diez que lo llevaban
     tienen volumen propio. De los doce emblemas quedan las dos flechas de la marcha.
   - **La fase 4 está hecha.** Falta el ferrocarril (fase 5) y las animaciones (fase 6).
4. **El ferrocarril** (fase 5): las cuatro estaciones, la vía del perímetro y los trenes. Es la
   más cara y la única que toca el mundo fuera del anillo.
   - **La vía y las cuatro estaciones, hechas.** La vía no va por el marco del tablero —ahí se
     levantan la cárcel y la comisaría— sino por el **pasillo limpio** que el campo deja entre el
     canto (432) y la primera mancha de arbolado (448). Con curvas de verdad en las esquinas, y
     con una cuenta que hubo que hacer dos veces: el punto más adentro de una curva no es
     `eje − 0,293 r`, es eso menos el medio ancho del balasto en diagonal. La primera versión
     metía la vía por debajo de la losa de la cárcel.
   - Con ellas entra también la regla de que **ninguna obra se come una pieza del pack**, que es
     la que habría cazado sin mirar coordenadas los dos choques que hubo que arreglar a mano: los
     bancos enterrados en la comisaría y la carbonera plantada sobre un paso de cebra.
   - **Los trenes, hechos.** Dos, en una `InstancedMesh` de dos instancias —una llamada de dibujo
     para los dos—, por la misma polilínea que se ve dibujada y a media vuelta uno de otro. A 40
     por segundo, que es más despacio que un peón (48): un tren más rápido que los peón le roba la
     vista al juego. La vuelta dura 97,7 s con sus cuatro paradas de 2,5.
   - Y dos fallos que ninguna captura habría enseñado: el tren daba la vuelta **de lado** —estaba
     construido sobre `+x` y aquí todas las piezas miran a `+z`— y con **una sola** estación no se
     movía nunca, porque el tramo de una parada a sí misma da cero por el módulo.
   - **La fase 5 está hecha.** Queda la 6: las animaciones.
5. **Las animaciones** (fase 6): una función pura por animación en `coreografia.ts` —que el
   comprobador puede medir sin `three`— y el bucle de `Burgo.tsx` moviéndolas.
   - **Hechas las tres primeras**: la tapa del cofre (0,7 s), la ruleta del casino (0,8) y la joya
     de la Tasa (0,5). Con ellas entra la regla de que **lo que se mueve sale de la malla fundida**
     y se escribe en su propio marco, con el origen DONDE ESTÁ SU EJE: la tapa gira sobre su
     bisagra y no sobre su centro, o se abriría como una tapa de olla al aire.
   - Y la de que la lógica de «quién se anima» no vive en el bucle de fotogramas —el único rincón
     al que el comprobador no llega— sino en una función pura: `loQueAnimaUnaCarta`.
   - **La reja de la celda de la comisaría también**: sube y baja cuando mandan a alguien a la
     cárcel.
   - **Y se ve entrar en la celda**, que es lo que Miguel pidió literalmente. Quien cae en ¡A
     comisaría! ya no se desvanece en su sitio: tras el golpe CORRE a la celda del cuartel de esa
     misma esquina —0,8 s, el tope de toda animación de casilla—, entra bajo la reja subida y se
     desvanece dentro mientras la reja baja; después aparece en la Comisaría como siempre. Desde
     cualquier otra casilla (una carta, tres dobles) todo sigue igual, sin carrera.
     - La celda **cambió de lado**: la reja estaba en el lado pegado al cuartel, y para entrar por
       ahí había que atravesar el edificio. Ahora da a la avenida.
     - El camino tiene un **paso** en medio: en línea recta de su sitio a la puerta, cinco de los
       seis asientos se llevaban por delante la farola o el arbusto de la acera de enfrente.
     - La reja de la celda lleva **su propia curva** (`alzadoDeLaRejaDeLaCelda`) y la verja de la
       Comisaría **espera** a que se haya desvanecido, que desde la 30 es 0,8 s más tarde.
     - `verify:burgo-escena` lo mide con la máquina de verdad y los seis asientos: la etapa y su
       duración contra la coreografía, que pasa por la puerta y acaba dentro, que no atraviesa
       ninguna obra ni ninguna pieza de la esquina (con las cajas del `burgo.glb`), y que cada
       instante que está bajo la reja la reja está más alta que el aventurero más alto de los
       seis (la maga, 2,655). Con sus vacunas: la puerta vieja, la línea recta sin paso, la reja
       adelantada y la verja con el compás de siempre. Y visto caer con cuatro mutaciones.
   - **Y la recaudación de la oficina**, que se había dado por contada con las monedas de
     cualquier pago y no lo estaba: esas monedas vuelan al Concejo y, a la cercanía a la que se
     juega, son puntos de tres píxeles. Ahora, al pagar el Impuesto, aparece al pie de la
     escalinata una moneda de latón de 4,6 de canto, sube rodando los dos peldaños —girando sobre
     cada arista, que no es un salto— y entra por la puerta. 0,6 s, dentro del pago más corto.
     - La oficina gana **basamento** (los peldaños llegan al fondo del cuerpo: cuerpo y columnas
       empezaban a 1,6 sin nada debajo) y **puerta**.
     - `verify:burgo-escena` mide que en todo el recorrido esté apoyada —ni hundida en un peldaño
       ni flotando—, que pase entre las columnas y quepa por la puerta, que acabe entera dentro
       del cuerpo, que no pise el precio al empezar y que sólo la mueva el Impuesto pagado al
       Ayuntamiento. Vistas caer con seis mutaciones.
   - **Y un fallo de antes, arreglado por el camino:** la ruleta del casino tenía los 24
     triángulos de su plato y su buje mirando al SUELO —`disco` está escrito para el marco de una
     casilla, que lleva espejo, y la ruleta vive en uno que no— y su material sólo pinta la cara de
     delante: desde el aire se veía girar la rayita amarilla sobre nada. Ahora las seis piezas
     vivas pasan por una lupa cenital exacta, triángulo a triángulo, con la ruleta de antes de
     vacuna.
   - **Y otro fallo de antes, del mismo tipo:** el agua de la alberca del Canal estaba DEBAJO de la
     tapa de hormigón de su propia caja (1,15 contra 1,40): desde el aire, un bloque gris. La lupa
     de las obras daba verde porque la tapa miraba arriba como debe; preguntaba si lo primero que se
     ve mira arriba, no QUÉ es. La alberca es ahora hueca, y una regla exige que el agua y las bocas
     de las torres de la central sean lo primero que corta cada rayo que cae sobre ellas.
   - **Y dos losas bajo el empedrado:** la 10 y la 30 van llenas de `solera` y `calzada` del pack,
     que suben a 0,6, y el patio de hormigón de la Comisaría y el suelo de la celda del cuartel
     estaban a 0,05. El patio no se veía nada y la celda salía mitad losa de acera. Van ahora a
     `SOBRE_EL_EMPEDRADO` (0,62, por debajo de los rótulos), y una regla compara cada losa de obra de
     esas dos esquinas con las cajas de verdad de las piezas de suelo que pisa.
   - **Y los dos servicios, que eran las únicas casillas especiales sin movimiento:** al pagar la
     renta de la Luz salen tres bocanadas por la chimenea, y al pagar la del Agua se abre una onda en
     la alberca. Las bocanadas van en gris carbón: el gris claro no se distinguía del crema del
     tablero, y el medio se confundía con la nave de turbinas (visto en el banco). Las dos entran en la
     lupa de las piezas vivas y en el tope de 0,8, y el comprobador mide que sólo las suelta la renta
     de su casilla, que el humo sale de la BOCA de la chimenea y que la onda no se sale del agua.
   - **Lo que no se ha hecho, y por qué:** el coche que aparca en el Descanso. No es una animación
     de 0,6 s sino un estado —un coche por jugador, que se queda mientras esté ahí y se va cuando se
     vaya—, y nadie lo pidió.

Cada fase es un commit con la batería entera en verde.
