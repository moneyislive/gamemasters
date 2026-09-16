# EL BURGO — el reglamento

> **Qué es este documento.** La ley del juego. Todo el código del Burgo lo cita por número
> de sección (`shared/arcade/juegos/burgo.ts:8` dice «lo gobierna entero el reglamento
> `REGLAS-EL-BURGO.md`»), y hasta ahora el fichero no existía: cada vez que alguien se
> encontraba una diferencia con el juego de mesa clásico del género no había forma de saber
> si era una decisión de esta casa o un olvido. Aquí está escrita, con su porqué.
>
> **De dónde sale.** No de la memoria de nadie: del código, que es donde la ley se cumple.
> Por orden de autoridad: `shared/arcade/juegos/burgo.ts` (el reductor —lo que
> hace es lo que el juego ES—), `shared/arcade/juegos/burgo-tablero.ts` (las
> cuarenta casillas y las treinta y dos cartas como DATO),
> `server/scripts/verificar-burgo.ts` (lo que se afirma que pasa: la mejor
> descripción ejecutable que hay) y `docs/burgo/DISENO.md`, `DISENO-2.md` y `DISENO-3.md`
> (las decisiones y por qué). Las tablas del §1, del §7 y del §11 están GENERADAS desde
> `burgo-tablero.ts`, no copiadas a mano.
>
> **Si algo de aquí no coincide con el código, gana el código.** Corre `npm run verificar`
> desde la raíz mirando el CÓDIGO DE SALIDA (nunca la última línea) y créele a él; y
> después corrige esta hoja, que para eso está.
>
> **Cuatro reglas entraron tarde, y ya están comprobadas.** `shared/arcade/juegos/burgo.ts`
> lleva en su cabecera un bloque titulado «las cuatro reglas oficiales que faltaban» que abre
> lo que `DISENO-3.md` daba por fuera de alcance: **obrar fuera del propio turno** (§6.5),
> **tratos entre dos jugadores cualesquiera** (§8.1), **la subasta de la última casa** (§6.6)
> y **la elección del 10 % en el Impuesto** (§3.4). Esas cuatro secciones están escritas con
> la regla NUEVA, y su juez es el paso 15 de `server/scripts/verificar-burgo.ts` («LAS CUATRO
> REGLAS OFICIALES QUE FALTABAN»), que corre en verde y lleva una vacuna por regla: el veneno
> de cada una es el comportamiento VIEJO —la mesa ocupada donde antes no se obraba, el
> Ayuntamiento con dos casas donde antes se alzaba por orden de llegada, el Impuesto ya
> cobrado donde antes no había elección—. La primera redacción de esta hoja se escribió con
> ese comprobador roto y se equivocó en dos sitios (decía que con el Impuesto sin pagar no se
> obraba, cuando se obra: §3.4 y §6.5); están corregidos contra el reductor, no contra la
> memoria.
>
> **Nota legal, sin adornos.** El Burgo es una creación propia sobre una mecánica de dominio
> público: la patente del juego del que desciende caducó en 1921, y las reglas de un juego no
> son objeto de copyright ni de patente. Lo protegido es la EXPRESIÓN —nombre, marca, arte,
> textos—, y aquí es nuestra entera: las cuarenta calles de una ciudad inventada, los ocho
> barrios, los textos de las treinta y dos cartas. En este documento no se nombra ninguna
> marca ajena, ni siquiera para decir que no se nombra; donde hace falta comparar, se dice
> «el juego de mesa clásico del género» o «el reglamento oficial del género».
>
> **Y una excepción decidida, con fecha.** El 16 de septiembre de 2026 Miguel pidió que las casillas
> especiales llevaran los nombres del tablero clásico tal cual —la Caja de Comunidad, el Impuesto sobre
> el Capital, Suerte, la Compañía de Electricidad, la Compañía de Aguas, el Impuesto de Lujo y las
> estaciones de Goya, Delicias, Mediodía y Norte—, y se le avisó antes de que eso era justo lo que
> esta nota evitaba: son textos de una edición comercial. Lo confirmó («úsalos tal cual»). Así que
> esos nombres son de esa edición; las calles, los barrios y los textos de las cartas siguen siendo
> propios, y las MARCAS —el nombre del juego y el de sus editores— siguen prohibidas y vigiladas por
> `verify:procedencia`.

**Índice.** [§0 El vocabulario](#0-el-vocabulario) · [§1 Las cuarenta
casillas](#1-las-cuarenta-casillas) · [§2 El turno](#2-el-turno-los-dados-los-dobles-y-el-movimiento)
· [§3 La casilla que pide una decisión](#3-la-casilla-que-pide-una-decisión-comprar-la-subasta-y-los-dos-impuestos)
· [§4 Los dos mazos](#4-los-dos-mazos-suerte-y-la-caja-de-comunidad) · [§5 La Comisaría](#5-la-comisaría) ·
[§6 Las rentas y las obras](#6-las-rentas-y-las-obras) · [§7 La hipoteca y el
dinero](#7-la-hipoteca-y-el-dinero) · [§8 Los tratos](#8-los-tratos) · [§9 El apuro y la
quiebra](#9-el-apuro-y-la-quiebra) · [§10 El final de la
partida](#10-el-final-de-la-partida) · [§11 Las treinta y dos
cartas](#11-las-treinta-y-dos-cartas) · [§12 La mesa en
línea](#12-las-decisiones-para-la-mesa-en-línea) · [Apéndices](#apéndice-a--las-divergencias-en-una-lista)

---

## 0. El vocabulario

Es la sección que más se cita, y la razón es sencilla: el juego se llama El Burgo pero sus
identificadores nacieron con otras palabras, y confundir las dos listas es lo que rompe la
regla de procedencia. **Hay dos vocabularios y no se mezclan.**

### 0.1 Lo que se LEE en pantalla (cerrado: no se admite ninguna otra palabra)

Este es el único vocabulario que puede aparecer en rótulos, ayudas, avisos, la crónica de la
mesa, la hoja, el retablo y este documento.

| Palabra | Qué es |
|---|---|
| **euros**, **«€»** | La moneda. Se escribe con el separador de millar en punto y el símbolo detrás, separado por un espacio: «1.500 €». Lo formatea `maravedies(n)` de `burgo.ts`, que es un identificador viejo con salida nueva. |
| **el Ayuntamiento** | Quien cobra los dos impuestos, vende los títulos, paga las ventas de edificios, guarda las casas y los hoteles y se queda con lo que no tiene dueño. Su caja no se agota. En el código es el Concejo (`casasEnElConcejo`, `CASAS_DEL_CONCEJO`) y en la vista es `dueno: null`. |
| **solar** | Una de las 22 casillas de calle que se compran, se agrupan en barrios y admiten obras. |
| **barrio** | Cada uno de los 8 grupos de solares. «Barrio entero» es tener todos los solares de un barrio. También se dice «la calle es tuya». |
| **estación** | Una de las 4 casillas de transporte: la Estación de Goya (5), la de Delicias (15), la del Mediodía (25) y la del Norte (35). En el código, `puerta`. |
| **servicio** | Una de las 2 casillas de servicio público: la Compañía de Electricidad (12) y la Compañía de Aguas (28). En el código, `oficio`. |
| **casa** | El edificio pequeño. Hay 32 en el Ayuntamiento. |
| **hotel** | El edificio grande: sustituye a cuatro casas. Hay 12 en el Ayuntamiento. En el código, `posada`, y `casas === 5` significa hotel. |
| **hipoteca**, **hipotecar**, **deshipotecar** | Empeñar un título al Ayuntamiento por la mitad de su precio y recuperarlo pagando la hipoteca más el interés. En el código, `empeno`, `empenar`, `desempenar`. |
| **subasta** | La puja por un título sin dueño. En el código, `almoneda`. |
| **la Comisaría** | La casilla 10. Se pasa de visita o se está retenido en ella. En el código, `mazmorra`, y el jugador retenido lleva `presa >= 0`. |
| **la Salida** | La casilla 0. Al pasarla o caer en ella se cobran 200 €. En el código, `PUERTA_MAYOR` y `PAGA_DE_LA_PUERTA_MAYOR`. |
| **el Descanso** | La casilla 20. No da ni quita nada. En el código, `feria`. |
| **¡A comisaría!** | La casilla 30, que manda derecho a la Comisaría. En el código, `a-la-mazmorra`. |
| **el Impuesto sobre el Capital** | La casilla 4: 200 € o el 10 % del patrimonio al Ayuntamiento. En corto, **el Impuesto**. En el código, `diezmo` y `EL_DIEZMO`. |
| **el Impuesto de Lujo** | La casilla 38: 100 € al Ayuntamiento. En el código, `alcabala` y `LA_ALCABALA`. |
| **Suerte** | Uno de los dos mazos (casillas 7, 22, 36). En el código, `pregon`, y las series son `'p01'`…`'p16'`. |
| **la Caja de Comunidad** | El otro mazo (casillas 2, 17, 33). En el código, `arca`, series `'a01'`…`'a16'`. |
| **el Salvoconducto** | La carta que saca de la Comisaría. Hay una en cada mazo. En el código, `indulto`. |
| **quiebra** | Quedarse fuera de la partida entregando todo. |
| **apuro** | Deber más de lo que se tiene en efectivo, con la mesa parada esperando a que se venda, se hipoteque o se quiebre. |

### 0.2 Lo que NO se dice nunca

Ninguna MARCA de ninguna edición comercial —el nombre del juego, el de sus editores—, en ningún
texto visible, en ningún comentario y en ningún identificador — **ni siquiera para decir que no se
nombra**. Los nombres de las casillas especiales son la excepción decidida que cuenta la nota del
principio. Lo barre
`verify:procedencia` sobre las cadenas literales de `shared/arcade/juegos/`, y
`verify:burgo-modelos` barre con las marcas partidas en trozos los ficheros de
`escenas/burgo/`. Y tampoco se usa un sinónimo para algo que ya tiene su palabra en el §0.1:
ni «cárcel» por la Comisaría, ni «propiedad» por solar, ni «peón» por la ficha de un jugador.
La lista del §0.1 es cerrada.

### 0.3 Los identificadores viejos, que NO se tocan

`presa`, `posada`, `almoneda`, `empeno`, `pregon`, `arca`, `mazmorra`, `puerta`, `oficio`,
`diezmo`, `alcabala`, `feria`, `mrs`, `Concejo`, `BURGO`, `MazoId`. Cambiarlos obligaría a
reescribir el diario, el oro sellado y las mesas guardadas en disco, y no cambiaría ni una
palabra de las que se leen. Un identificador viejo con un rótulo nuevo no es una deuda: es lo
que evita una migración que nadie necesita.

### 0.4 Palabras de la máquina que también son ley

Se usan en las secciones siguientes y conviene tenerlas aquí:

- **título**: cualquiera de las 28 casillas que se compran (22 solares + 4 estaciones + 2
  servicios).
- **paso**: el subestado del turno. Cinco: `por-tirar`, `comprar`, `almoneda` (la subasta),
  `apuro`, `por-pasar`.
- **`turnoDe`**: a quién se ESPERA (el que puja, el endeudado, o el del turno).
  **`duenoDelTurno`**: de quién es el turno de verdad. Casi siempre coinciden; en la subasta y
  en el apuro ajeno, no (§12.1).
- **la crónica** (`sucesos`): la lista de lo que acaba de pasar en el último cambio. No es un
  histórico: se sustituye entera en cada jugada.

---

## 1. Las cuarenta casillas

El anillo tiene 40 casillas numeradas de 0 a 39 en el sentido de la marcha. Todas las filas
salen de `CASILLAS` en `burgo-tablero.ts`, y `verify:mecanicas-burgo` afirma que
`CASILLAS[i].indice === i`: la tabla se lee por posición, y una fila movida sin querer sería
un tablero que se pinta bien y cobra mal.

**Los precios son todos PARES** para que la hipoteca (la mitad) salga entera sin redondear.
**Las rentas de un solar crecen estrictamente** de sin casas a hotel. En cualquier casilla que
no cobre por edificios, la lista de rentas es `[0,0,0,0,0,0]` entera — nunca una lista más
corta— para que nadie tenga que preguntar por su longitud.

La columna «Renta» es la renta del solar SIN casas; con barrio entero se cobra el doble
(§6.2). Las estaciones y los servicios no cobran por tabla de casilla: ver §6.3 y §6.4.

| # | Casilla | Rótulo | Clase | Barrio | Precio | Renta | 1 casa | 2 | 3 | 4 | Hotel | Casa |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | La Salida | Salida | la Salida | — | — | — | — | — | — | — | — | — |
| 1 | Callejón de las Latas | Latas | solar | El Poblado (pardo) | 60 | 2 | 10 | 30 | 90 | 160 | 250 | 50 |
| 2 | La Caja de Comunidad | Caja | la Caja de Comunidad | — | — | — | — | — | — | — | — | — |
| 3 | Pasaje de los Charcos | Charco | solar | El Poblado (pardo) | 60 | 4 | 20 | 60 | 180 | 320 | 450 | 50 |
| 4 | El Impuesto | Fisco | el Impuesto | — | 200 | — | — | — | — | — | — | — |
| 5 | Estación de Goya | Goya | estación | — | 200 | §6.3 | — | — | — | — | — | — |
| 6 | Calle de los Talleres | Taller | solar | Las Naves (celeste) | 100 | 6 | 30 | 90 | 270 | 400 | 550 | 50 |
| 7 | Suerte | Suerte | Suerte | — | — | — | — | — | — | — | — | — |
| 8 | Calle de la Imprenta | Tinta | solar | Las Naves (celeste) | 100 | 6 | 30 | 90 | 270 | 400 | 550 | 50 |
| 9 | Calle de las Grúas | Grúas | solar | Las Naves (celeste) | 120 | 8 | 40 | 100 | 300 | 450 | 600 | 50 |
| 10 | La Comisaría | Visita | la Comisaría | — | — | — | — | — | — | — | — | — |
| 11 | Calle de la Frutería | Fruta | solar | El Mercadillo (rosa) | 140 | 10 | 50 | 150 | 450 | 625 | 750 | 100 |
| 12 | La Compañía de Electricidad | Luz | servicio | — | 150 | §6.4 | — | — | — | — | — | — |
| 13 | Calle de la Ferretería | Tuerca | solar | El Mercadillo (rosa) | 140 | 10 | 50 | 150 | 450 | 625 | 750 | 100 |
| 14 | Plaza del Mercadillo | Puesto | solar | El Mercadillo (rosa) | 160 | 12 | 60 | 180 | 500 | 700 | 900 | 100 |
| 15 | Estación de Delicias | Delic. | estación | — | 200 | §6.3 | — | — | — | — | — | — |
| 16 | Calle de los Balcones | Balcón | solar | El Ensanche (naranja) | 180 | 14 | 70 | 200 | 550 | 750 | 950 | 100 |
| 17 | La Caja de Comunidad | Caja | la Caja de Comunidad | — | — | — | — | — | — | — | — | — |
| 18 | Calle de los Garajes | Garaje | solar | El Ensanche (naranja) | 180 | 14 | 70 | 200 | 550 | 750 | 950 | 100 |
| 19 | Calle del Semáforo | Ámbar | solar | El Ensanche (naranja) | 200 | 16 | 80 | 220 | 600 | 800 | 1000 | 100 |
| 20 | El Descanso | Pausa | el Descanso | — | — | — | — | — | — | — | — | — |
| 21 | Calle de los Cines | Cine | solar | El Centro (rojo) | 220 | 18 | 90 | 250 | 700 | 875 | 1050 | 150 |
| 22 | Suerte | Suerte | Suerte | — | — | — | — | — | — | — | — | — |
| 23 | Plaza del Ayuntamiento | Plaza | solar | El Centro (rojo) | 220 | 18 | 90 | 250 | 700 | 875 | 1050 | 150 |
| 24 | Calle del Teatro | Teatro | solar | El Centro (rojo) | 240 | 20 | 100 | 300 | 750 | 925 | 1100 | 150 |
| 25 | Estación del Mediodía | Medio. | estación | — | 200 | §6.3 | — | — | — | — | — | — |
| 26 | Calle del Cristal | Vidrio | solar | Las Torres (amarillo) | 260 | 22 | 110 | 330 | 800 | 975 | 1150 | 150 |
| 27 | Calle de las Antenas | Antena | solar | Las Torres (amarillo) | 260 | 22 | 110 | 330 | 800 | 975 | 1150 | 150 |
| 28 | La Compañía de Aguas | Aguas | servicio | — | 150 | §6.4 | — | — | — | — | — | — |
| 29 | Calle de la Bolsa | Bolsa | solar | Las Torres (amarillo) | 280 | 24 | 120 | 360 | 850 | 1025 | 1200 | 150 |
| 30 | ¡A comisaría! | Cepo | ¡A comisaría! | — | — | — | — | — | — | — | — | — |
| 31 | Calle del Hospital | Salud | solar | El Parque (verde) | 300 | 26 | 130 | 390 | 900 | 1100 | 1275 | 200 |
| 32 | Calle de la Biblioteca | Libros | solar | El Parque (verde) | 300 | 26 | 130 | 390 | 900 | 1100 | 1275 | 200 |
| 33 | La Caja de Comunidad | Caja | la Caja de Comunidad | — | — | — | — | — | — | — | — | — |
| 34 | Calle de los Jardines | Jardín | solar | El Parque (verde) | 320 | 28 | 150 | 450 | 1000 | 1200 | 1400 | 200 |
| 35 | Estación del Norte | Norte | estación | — | 200 | §6.3 | — | — | — | — | — | — |
| 36 | Suerte | Suerte | Suerte | — | — | — | — | — | — | — | — | — |
| 37 | Paseo de los Tilos | Tilos | solar | Los Paseos (azul) | 350 | 35 | 175 | 500 | 1100 | 1300 | 1500 | 200 |
| 38 | El Impuesto de Lujo | Lujo | el Impuesto de Lujo | — | 100 | — | — | — | — | — | — | — |
| 39 | Avenida de las Acacias | Acacia | solar | Los Paseos (azul) | 400 | 50 | 200 | 600 | 1400 | 1700 | 2000 | 200 |

### 1.1 Los ocho barrios

El «color» del barrio es su nombre técnico (`BarrioId`), no un rótulo de pantalla: en pantalla
el barrio se llama por su nombre propio. Los ocho colores de acera están medidos contra los
seis colores de asiento (diferencia máxima por canal ≥ 60/255 y suma ≥ 100, y blanco encima
con contraste ≥ 3:1), y esa medición la hace `verify:mecanicas-burgo`.

| Barrio | Casillas | Solares | Precios | Precio de la casa |
|---|---|---|---|---|
| El Poblado (pardo) | 1, 3 | Callejón de las Latas · Pasaje de los Charcos | 60 € / 60 € | 50 € |
| Las Naves (celeste) | 6, 8, 9 | Calle de los Talleres · Calle de la Imprenta · Calle de las Grúas | 100 € / 100 € / 120 € | 50 € |
| El Mercadillo (rosa) | 11, 13, 14 | Calle de la Frutería · Calle de la Ferretería · Plaza del Mercadillo | 140 € / 140 € / 160 € | 100 € |
| El Ensanche (naranja) | 16, 18, 19 | Calle de los Balcones · Calle de los Garajes · Calle del Semáforo | 180 € / 180 € / 200 € | 100 € |
| El Centro (rojo) | 21, 23, 24 | Calle de los Cines · Plaza del Ayuntamiento · Calle del Teatro | 220 € / 220 € / 240 € | 150 € |
| Las Torres (amarillo) | 26, 27, 29 | Calle del Cristal · Calle de las Antenas · Calle de la Bolsa | 260 € / 260 € / 280 € | 150 € |
| El Parque (verde) | 31, 32, 34 | Calle del Hospital · Calle de la Biblioteca · Calle de los Jardines | 300 € / 300 € / 320 € | 200 € |
| Los Paseos (azul) | 37, 39 | Paseo de los Tilos · Avenida de las Acacias | 350 € / 400 € | 200 € |

Dos barrios tienen dos solares (el primero y el último) y seis tienen tres. **El precio de la
casa es del BARRIO, no del solar**: los tres solares de un barrio construyen al mismo precio.

### 1.2 Las constantes de la mesa

| Constante | Valor | Qué es |
|---|---|---|
| `CUANTAS_CASILLAS` | 40 | Casillas del anillo. |
| `DINERO_DE_SALIDA` | 1.500 € | Con lo que empieza cada jugador. |
| `PAGA_DE_LA_PUERTA_MAYOR` | 200 € | Lo que paga la Salida al pasarla o caer en ella. |
| `EL_DIEZMO` | 200 € | El Impuesto (casilla 4). |
| `LA_ALCABALA` | 100 € | El Impuesto de Lujo (casilla 38). |
| `PRECIO_DE_PUERTA` | 200 € | Precio de cada estación. |
| `PRECIO_DE_OFICIO` | 150 € | Precio de cada servicio. |
| `FIANZA` | 50 € | Lo que cuesta salir de la Comisaría pagando. |
| `INTENTOS_EN_LA_MAZMORRA` | 3 | Tiradas que se pueden probar en la Comisaría. |
| `DOBLES_QUE_ENCIERRAN` | 3 | Dobles seguidos que mandan a la Comisaría. |
| `CASAS_DEL_CONCEJO` | 32 | Casas que existen. |
| `POSADAS_DEL_CONCEJO` | 12 | Hoteles que existen. |
| `POSADA` | 5 | `casas === 5` significa hotel. |
| `PUJA_MINIMA` / `PASO_DE_PUJA` | 10 € | Puja de apertura y escalón de la subasta. |
| `INTERES_DEL_EMPENO` | 10 | Por ciento del interés de la hipoteca. |
| `PARTES_DE_LA_CASA_AL_VENDER` | 2 | Vender un edificio devuelve la mitad de su precio. |
| `TRATOS_ABIERTOS_POR_PROPONENTE` | 3 | Tratos que se pueden tener en pie a la vez. |
| `RONDAS_DE_SORTEO` | 12 | Tope de rondas del sorteo de salida. |
| `INDULTOS_QUE_EXISTEN` | 2 | Salvoconductos que hay en el juego (uno por mazo). |
| `TOPE_DE_SUCESOS` | 64 | Sucesos que caben en la crónica de una jugada. |
| Aforo | 2–6 | `MANIFIESTO_BURGO.jugadores`. |

---

## 2. El turno: los dados, los dobles y el movimiento

### 2.1 Antes de empezar

Se sientan entre 2 y 6 jugadores. Cuando estén todos, **cualquiera de los sentados** abre la
partida; no hace falta que sea nadie en concreto, porque en una mesa asíncrona esperar a un
anfitrión es esperar a alguien que puede no volver. Con menos de 2 o más de 6, el movimiento
se rechaza con motivo («Hacen falta entre 2 y 6 sentados.»).

Al empezar, y en este orden (`empezar`, en `burgo.ts`):

1. Se siembra el azar de la partida. Es **la única vez** que se lee el azar que trae el
   contexto: a partir de ahí todo el azar del Burgo sale de ese objeto sembrado, encadenado
   tirada a tirada. Por eso una partida se puede reejecutar entera desde el diario.
2. Cada jugador recibe **1.500 €** y un color de asiento, por orden de asiento y sin módulo.
   Los seis colores son propios y distintos de las ocho aceras.
3. Las 28 casillas comprables quedan del Ayuntamiento, sin casas y sin hipoteca. Hay 32 casas
   y 12 hoteles en el Ayuntamiento.
4. Se barajan **una vez** los dos mazos, encadenando el azar. No se vuelven a barajar nunca
   (§4.2).
5. Todos los jugadores están en la Salida (casilla 0) y **no cobran los 200 € por estar ahí**:
   la Salida paga por pasarla, no por partir de ella.
6. Se sortea quién sale.

### 2.2 El sorteo de salida

Se resuelve DENTRO del mismo movimiento que abre la partida, no como una fase aparte: una fase
interactiva más es una fase más que vencer, animar y comprobar, y un ausente la bloquearía
antes de que la mesa hubiera empezado.

Por ronda, cada candidato tira dos dados en orden de asiento; siguen los de suma máxima; se
repite hasta que quede uno. Si a las **12 rondas** sigue habiendo empate, sale el primero en
orden de asiento. Se guarda la ÚLTIMA tirada de cada jugador —también la de los que quedaron
fuera en rondas anteriores— para que la escena pueda animar el sorteo.

**Regla de la casa.** El reglamento oficial del género repite el desempate hasta que alguien
gane. Aquí hay un tope de 12 rondas porque una partida tiene que empezar aunque el azar se
empeñe: sin tope, un azar tozudo dejaría la mesa colgada antes de repartir.

### 2.3 La tirada

Dos dados de seis caras. **La tirada se guarda como PAR, nunca como suma**: los dobles son una
regla del juego, y una suma no sabe si era doble. Los dos dados se sacan encadenando el azar
(el segundo dado se saca del azar que dejó el primero): nunca se usa el mismo azar dos veces.

Se avanza la suma de los dos dados en el sentido de la marcha, se cobra la Salida si se cruza
o se cae en ella (§2.5), y se resuelve la casilla de llegada (§2.6).

### 2.4 Los dobles

- Con dobles, **se vuelve a tirar** después de resolver la casilla. El turno no se puede pasar
  mientras haya un doble pendiente.
- Al **tercer doble seguido** se va derecho a la Comisaría, **antes de mover**: no se avanza,
  no se cobra la Salida y no se resuelve ninguna casilla.
- Los dobles se ponen a cero al relevar el turno, al ir a la Comisaría por cualquier motivo y
  al salir de ella con dobles.
- Salir de la Comisaría sacando dobles **no da tirada extra** (§5.3).

### 2.5 La Salida

Se cobran **200 €** cada vez que se pasa por la casilla 0 o se cae en ella andando o viajando
por una carta que lo diga. No se cobra:

- yendo a la Comisaría (ni por la casilla 30, ni por carta, ni por tres dobles): a la
  Comisaría se va **derecho**, sin recorrer el anillo;
- retrocediendo (la carta «Tres calles atrás» no cobra aunque cruce la 0 hacia atrás);
- al repartir al empezar la partida.

Cada paso por la Salida sube el contador de vueltas del jugador, que es lo que mide el tope de
vueltas del §10.3.

### 2.6 Resolver la casilla

Al caer, y según la clase de la casilla:

| Clase | Qué pasa |
|---|---|
| La Salida (0) | Nada más que el cobro del §2.5. |
| Solar, estación, servicio | Sin dueño → se abre `comprar` (§3.1). Con dueño ajeno y sin hipoteca → se paga la renta (§6). Propio, o hipotecado → nada. |
| Suerte (7, 22, 36) | Se roba una carta del mazo de Suerte y se cumple (§4). |
| La Caja de Comunidad (2, 17, 33) | Ídem con el otro mazo. |
| El Impuesto (4) | Se elige con qué se paga: **200 € o el 10 % del patrimonio** (§3.4). |
| El Impuesto de Lujo (38) | **100 € al Ayuntamiento**, sin elección (§3.5). |
| La Comisaría (10) | Nada: se está de visita. |
| El Descanso (20) | **Nada.** No se cobra ni se paga. |
| ¡A comisaría! (30) | Derecho a la Comisaría (§5.1). |

Las tres casillas que **piden una decisión** —el título sin dueño, la casilla del Impuesto y,
desde la regla de la última casa, el edificio en disputa— comparten el mismo paso y están
todas en el §3.

**El Descanso no acumula nada.** Ni los dos impuestos ni las multas se amontonan en la
casilla 20 para que alguien las recoja. Eso coincide con el reglamento oficial del género —la
variante del bote es una costumbre de mesa, no una regla— y aquí además haría falta un
depósito público más en el estado y en la vista, para el que no hay dueño.

### 2.7 Pasar el turno

Cuando ya se ha tirado y resuelto, el paso es `por-pasar`: se puede obrar (§6.5), hipotecar y
deshipotecar (§7), tratar (§8) y pasar. **No se puede pasar con un doble pendiente**, ni con
una subasta abierta, ni con un apuro sin saldar.

Al pasar (`relevo`, en `burgo.ts`): caducan todos los tratos abiertos del turno anterior
(§8.5), los dobles vuelven a 0, el sello de tiradas vuelve a 0, el turno pasa al **siguiente
vivo** en orden de asiento y el paso vuelve a `por-tirar`. Los quebrados se saltan.

---

## 3. La casilla que pide una decisión: comprar, la subasta y los dos impuestos

Hay casillas que se resuelven solas (§2.6) y hay casillas que **paran la mesa a esperar una
respuesta del que tiene el turno**. Son dos: el título sin dueño («¿lo compras o va a
subasta?») y el Impuesto («¿con cuál de los dos pagos lo pagas?»). **Ninguna de las dos estrena
un paso.** El título sin dueño usa el paso `comprar`, que ya existía; el Impuesto no usa paso
ninguno: enciende una MARCA del turno (`impuestoSinPagar`, como `dobles`) y el paso se queda en
`por-tirar` o en `por-pasar`, que es donde estaba. Y es a propósito: un paso nuevo pondría rojo
un comprobador de otro fichero —la traducción a la escena normaliza a «por tirar» cualquier paso
que no conozca, y los dados dirían que no se ha tirado cuando ya se tiró—, y con la marca TIRAR
y PASAR se siguen ofreciendo y son ellos los que cobran (§3.4).

Las dos paran la mesa, pero **no paran las obras igual**: con un título sin dueño sin decidir
los DEMÁS no obran y el del turno sí; con el Impuesto sin pagar **obra todo el mundo, incluido
el del turno** (§6.5, y el porqué en el §3.4).

### 3.1 Caer en un título sin dueño

Se abre el paso `comprar`, y el del turno tiene exactamente dos salidas:

- **Comprar** por el precio de la tabla del §1. Sólo se ofrece si el efectivo alcanza.
- **Sacarlo a subasta.** Siempre se ofrece.

**No hay una tercera salida.** No se puede dejar el título en el Ayuntamiento sin más: si no se
compra, se subasta. Es la regla oficial del género y aquí además es lo que impide que el
tablero se quede sin vender nada cuando todos van justos de efectivo.

Si el jugador no contesta, el plazo vence y el tic saca el título a subasta por él (§12.2):
comprar por el ausente sería gastarle el dinero, y no comprar ni subastar dejaría la mesa
parada.

**Regla de la casa: con un apuro abierto, caer en un título sin dueño NO abre la compra.** El
título se pone en la cola de subastas y sale a subasta en cuanto el apuro se cierre. La razón
es que no caben dos pasos a la vez: un jugador que debe 340 € no puede estar decidiendo si
compra. El caso llega, por ejemplo, tras el tercer intento en la Comisaría cuando no alcanza
para la fianza (§5.4).

### 3.2 La subasta de un título

(La subasta de un **edificio**, cuando queda la última casa, está en el §6.6 y tiene reglas
propias de apertura y de mínimo.)

La subasta es una **fase con relevo por asiento**, nunca «todos pujando a la vez». La mesa
tiene UN plazo y lo reprograma sólo cuando cambia a quién se espera; con pujas simultáneas
habría que elegir a quién esperar, y el que no estuviera bloquearía la subasta para siempre.

- **Quién puja:** todos los jugadores vivos, **incluido el que la abrió**. El orden empieza en
  el siguiente al del turno y **el que abrió la subasta puja el último**.
- **Puja mínima:** 10 € si no hay ninguna puja; la mejor puja + 10 € después.
- **La puja tiene que ser un múltiplo de 10 €** y no puede pasar del efectivo del que puja. Un
  jugador no puede pujar más de lo que tiene: la subasta nunca genera deuda.
- **Pasar** saca al jugador de la subasta para siempre; ya no se le vuelve a esperar.
- **Cierra** cuando ya no hay a quién esperar: o no queda nadie en pie, o queda uno solo y es
  el mejor postor.
- **Con puja ganadora:** el mejor postor paga al Ayuntamiento y se lleva el título, sin casas y
  sin hipoteca.
- **Sin ninguna puja:** el título se queda en el Ayuntamiento y podrá volver a comprarse la
  próxima vez que alguien caiga en él.

**Regla de la casa: si el mejor postor ya no puede pagar al cerrar, el título se queda en el
Ayuntamiento.** Sólo puede ocurrir por un trato aceptado mientras la subasta estaba abierta
(§8.4), que es el único camino por el que el efectivo de un postor baja entre que pujó y se
cerró. Se prefiere dejar el título sin dueño a abrir un apuro por una puja: es el único cierre
del juego que no deja deuda, y así se queda.

### 3.3 La cola de subastas

Una quiebra con el Ayuntamiento devuelve muchos títulos de golpe (§9.5) y hay que colocarlos
uno a uno. Se encolan **en orden de casilla** y se subastan de una en una: al cerrar cada
subasta se abre la siguiente. La mesa no le devuelve el turno a nadie hasta que la cola se
vacía, y las subastas de la cola se cierran solas por vencimiento de plazo si nadie contesta.

**Está declarado como decisión revisable** (`DISENO-3.md`, «Para Miguel»): la alternativa era
que los títulos de un quebrado volvieran al Ayuntamiento sin subasta. Se eligió la subasta por
fidelidad al reglamento oficial del género, sabiendo que con todos ausentes cuesta del orden
de ciento cincuenta vencimientos de plazo vaciar la cola entera.

### 3.4 El Impuesto: la cantidad fija o el 10 % del patrimonio

> Regla que entró tarde y ya está comprobada: paso 15 de `verificar-burgo.ts`, con vacuna.

Caer en el Impuesto (casilla 4) **no cobra en el acto**: abre la decisión, y el del turno elige
con qué paga.

- **200 € fijos**, o
- **el 10 % de su patrimonio**, redondeado **hacia abajo** y nunca negativo.

El patrimonio es el mismo del §10.3: efectivo + precio de los títulos sin hipoteca + la mitad
del precio de los hipotecados + el precio de la casa por cada casa (y por cinco, en un hotel).

**El redondeo va hacia abajo, y es al revés que el interés de la hipoteca** (§7.2), que redondea
hacia arriba. No es un descuido: el interés lo cobra el Ayuntamiento sobre un préstamo que él
hizo, mientras que el 10 % es una **alternativa que se le ofrece a quien paga**, y una
alternativa que redondeara hacia arriba podría costar más que la décima que promete el botón.
Y entera, porque el dinero del Burgo son euros enteros: un pago con coma se pierde al sumar y
deja saldos que no cuadran.

Los dos importes se enseñan **antes de elegir**, calculados con la misma función que después
cobra: si el botón y el cobro usaran cuentas distintas, el botón podría prometer una cifra y
el Ayuntamiento llevarse otra.

El Impuesto de Lujo **no** tiene elección (§3.5): el reglamento oficial del género tampoco se la da.

**Con el Impuesto sin pagar SÍ se obra**, y eso es lo contrario de lo que parecería. La marca no
cierra ninguna puerta: cualquiera puede alzar, vender, hipotecar y deshipotecar mientras el del
turno decide con qué paga. Y no hay nada que ganar haciéndolo: vender casas a mitad de precio
para bajar la décima pierde 100 por ahorrar 20, e hipotecar **no mueve el patrimonio ni un
euro** —quita medio precio en título y pone medio precio en efectivo (§10.3)—. Si no hay nada
que ganar, no hay nada que cerrar. Medido con el reductor: con la marca encendida se le ofrecen
al del turno sus seis obras y `avanzar` las acepta.

**Quien TIRA o PASA sin elegir paga la fija**, que es la que la casilla anuncia y la que el
reglamento pone por defecto: el 10 % hay que pedirlo. Si esa fija no le alcanza, se abre su
apuro (§9.1) y el turno **no** se releva.

### 3.5 El Impuesto de Lujo

Caer en el Impuesto de Lujo (casilla 38) paga **100 € al Ayuntamiento**, en el acto y sin elección. No hay
nada que decidir, así que no abre ningún paso.

### 3.6 Lo que la subasta NO tiene

No hay reloj propio de subasta ni puja a ciegas: la mesa tiene un solo plazo y la subasta se
cierra por pases.

---

## 4. Los dos mazos: Suerte y la Caja de Comunidad

### 4.1 Los mazos

Dieciséis cartas cada uno. Suerte se roba en las casillas 7, 22 y 36; la Caja de Comunidad, en la
2, 17 y 33. Las cartas están en el §11, una a una, con su texto y su efecto.

### 4.2 Cómo se roba: la carta va al FONDO y no se rebaraja nunca

Se roba **la de arriba**. Al cumplirla, esa misma carta va **al fondo de su mazo**, con lo que
el orden del mazo rota y las dieciséis vuelven a salir en el mismo orden vuelta tras vuelta.
**El descarte no se rebaraja jamás.** Dos razones: es reproducible (una partida se reejecuta
desde el diario y tiene que salir idéntica) y es lo que dice el reglamento oficial del género.

La única carta que **sale** del mazo es el Salvoconducto: se queda en la mano de quien la robó
hasta que la use o la cambie en un trato, y vuelve al fondo de su mazo en ese momento (§5.3,
§8.3, §9.5).

Contar las cartas que quedan es parte del juego: la vista publica **cuántas** quedan en cada
mazo. Lo que no publica nunca es **cuáles ni en qué orden** (§12.3).

### 4.3 Encadenar cartas

Una carta puede llevar a otra casilla y esa casilla se resuelve enseguida, con todo lo que eso
implica: se cobra la renta, se abre la compra, se paga el Impuesto. Los casos concretos:

- Las cartas que mandan a una casilla concreta («A la Salida», «Al Paseo de los Tilos»…) nunca
  mandan a una casilla de carta, así que ahí la cadena se acaba.
- **«Tres calles atrás» sí puede encadenar**: desde la casilla 36 se retrocede a la 33, que es
  la Caja de Comunidad, y **se roba una segunda carta**. Desde la 22 se cae en la 19 (un solar) y
  desde la 7 en la 4 (el Impuesto). La cadena tiene como mucho dos cartas, porque ninguna carta
  de la Caja de Comunidad manda a una casilla de carta.
- «A la estación más cercana» y «Al servicio más cercano» buscan hacia delante desde la casilla
  de la carta, cobran la Salida si la cruzan, y cobran distinto (§6.3, §6.4).

### 4.4 Qué se ve de una carta

Cuando sale una carta, **se publica su número** (1 a 16) y su mazo, y con eso cualquier cliente
encuentra el título, el texto y el efecto en la tabla del §11. Lo que nunca sale de la mesa es
la serie interna con la que la carta viaja dentro del mazo. La última carta salida se queda a
la vista mientras dure el turno en que salió.

---

## 5. La Comisaría

### 5.1 Cómo se acaba en la Comisaría

Tres caminos, y ninguno más:

1. Caer en **¡A comisaría!** (casilla 30).
2. Sacar una carta que lo diga (hay una en cada mazo).
3. Sacar **tres dobles seguidos** en el mismo turno.

En los tres casos se va **derecho**: no se recorre el anillo, no se cobra la Salida y no se
resuelve ninguna casilla por el camino. Ir a la Comisaría **termina el turno** en el acto: los
dobles se ponen a cero y ya no se vuelve a tirar. (Si al ir quedaba un apuro abierto, el apuro
manda y se atiende primero: §9.)

La Comisaría es también la casilla 10 de paso. **Caer en ella sin estar retenido no hace nada**:
se está de visita.

### 5.2 Estar retenido no es dejar de jugar

Quien está en la Comisaría **sigue cobrando rentas**, sigue pudiendo alzar y vender edificios,
hipotecar y deshipotecar, y proponer y contestar tratos. Lo único que no puede es avanzar.

### 5.3 Las tres salidas

En su turno, quien está retenido elige una de tres:

- **Pagar la fianza: 50 €.** Queda libre y **tira con normalidad** — y si saca dobles, repite.
- **Usar un Salvoconducto**, si tiene alguno. Queda libre y tira con normalidad, igual que con
  la fianza. La carta vuelve al fondo de su mazo.
- **Probar con los dados.** Con dobles sale y **mueve la suma de esa misma tirada, pero NO
  repite**: la tirada que le abre la puerta es la que le mueve, y ahí se acaba su turno. Sin
  dobles, suma un intento fallido y el turno se acaba.

### 5.4 El tercer intento

Se pueden probar **tres tiradas** (una por turno). Si la tercera tampoco es doble, **se paga la
fianza de 50 € obligatoriamente y se mueve** lo que sumó esa tirada.

El orden importa y está escrito así a propósito: **primero se paga, después se mueve**. Si no
alcanza para los 50 €, se abre el apuro (§9.1) y **el jugador sale y mueve igual**. Es el caso
que produce la regla del §3.1: si con el apuro abierto cae en un título sin dueño, ese título
va a la cola de subastas en vez de abrir la compra.

---

## 6. Las rentas y las obras

### 6.1 Quién cobra y cuándo

La renta la paga quien cae en un título con dueño ajeno, **en el acto y sin que nadie la pida**
(§12.4). No se cobra:

- si el título está **hipotecado** (esa es toda la gracia de la hipoteca);
- si el título es **propio**;
- si el dueño ya **quebró**.

Que el dueño esté retenido en la Comisaría **no le impide cobrar**.

### 6.2 La renta de un solar

- **Sin casas y sin barrio entero:** la renta de la tabla del §1.
- **Sin casas y con barrio entero:** **el doble** de la renta de la tabla.
- **Con casas u hotel:** la columna que corresponda de la tabla del §1 (1, 2, 3, 4 casas, u
  hotel). El barrio entero ya no dobla nada: la casa manda.

**El doble por barrio entero se cobra aunque otro solar del barrio esté hipotecado.** Es la
regla oficial del género y aquí está afirmada por comprobador con ese nombre
(`verificar-burgo.ts`, paso 3: «y sigue cobrando el doble aunque OTRO solar del barrio esté
hipotecado (regla oficial)»). Lo que sí deja de cobrar es el solar hipotecado, cada uno por su
cuenta.

### 6.3 La renta de una estación

Depende de **cuántas estaciones tenga el dueño**:

| Estaciones del dueño | Renta |
|---|---|
| 1 | 25 € |
| 2 | 50 € |
| 3 | 100 € |
| 4 | 200 € |

La carta «A la estación más cercana» hace pagar **el doble** de lo que salga de esa tabla.

Las estaciones **hipotecadas del dueño cuentan** para el número (§7.4).

### 6.4 La renta de un servicio

Depende de cuántos servicios tenga el dueño y de la tirada:

| Servicios del dueño | Renta |
|---|---|
| 1 | 4 × la tirada |
| 2 | 10 × la tirada |

La tirada es la que trajo al jugador a esa casilla. **Excepción:** con la carta «Al servicio
más cercano» se cobra **10 × una tirada NUEVA**, sea uno o sean dos los servicios del dueño; la
tirada nueva se lanza en ese momento y se publica en la crónica para que se pueda animar.

Los servicios **hipotecados del dueño cuentan** para el número (§7.4).

### 6.5 Alzar casas y hoteles

Para alzar en un solar hacen falta **todas** estas condiciones:

1. El solar es tuyo y es un solar (no una estación ni un servicio).
2. Tienes el **barrio entero**.
3. **Ningún solar del barrio está hipotecado.**
4. **Construcción pareja:** el solar donde alzas no puede tener más casas que el que menos
   tenga del barrio. O sea: se sube el barrio a la vez, escalón a escalón.
5. Queda algo que alzar: si vas a poner la 1.ª, 2.ª, 3.ª o 4.ª casa, tiene que quedar al menos
   **una casa** en el Ayuntamiento; si vas a poner el **hotel** (que es la quinta), tiene que
   quedar al menos **un hotel**.
6. Te alcanza el efectivo para el precio de la casa del barrio (§1.1).

El **hotel sustituye a las cuatro casas**: al alzarlo, las cuatro casas vuelven al Ayuntamiento
(se suman a las existencias) y sale un hotel de las existencias.

**Cuándo se obra: en cualquier momento, también durante el turno de otro.**

> Regla que entró tarde y ya está comprobada: paso 15 de `verificar-burgo.ts`, con vacuna.

Alzar, vender, hipotecar y deshipotecar se hacen **cuando uno quiera**, tenga el turno o no.
Es media táctica del juego —alzar de golpe justo antes de que el rival caiga en tu barrio— y
sin eso, en una mesa de seis, cada jugador obraba una vez cada seis turnos.

Hay **tres momentos y sólo tres** en los que nadie obra, y son exactamente los tres en los que
la mesa está esperando **una** respuesta concreta con su plazo:

1. **Con una subasta abierta.**
2. **Con un apuro abierto** — salvo el propio endeudado, que puede vender e hipotecar, que son
   las dos obras que dan dinero (§9.2).
3. **Con el título sin dueño del que tiene el turno sin decidir** (el paso `comprar`, §3.1) —
   salvo el propio dueño del turno, que es el único que puede resolverlo y sigue obrando.

**El Impuesto sin pagar NO es uno de los tres**: con la marca encendida obra todo el mundo,
incluido el del turno, y el porqué está en el §3.4.

Los dos primeros porque **el dinero es lo que decide quién gana la puja y quién quiebra**: un
pago de un tercero metido en medio cambia el resultado sin que a ese tercero le tocara nada. La
única puerta que queda abierta a eso —un trato aceptado durante una subasta— ya está medida y
tiene su rama entera en el cierre (§3.2). El tercero, porque una obra de otro puede abrir la
subasta de la última casa (§6.6) y llevarse por delante una compra que el del turno todavía
estaba decidiendo.

### 6.6 Cuando queda una sola casa: la subasta del edificio

Hay 32 casas y 12 hoteles, y **son un recurso escaso de verdad**.

> Regla que entró tarde y ya está comprobada: paso 15 de `verificar-burgo.ts`, con vacuna.

Cuando queda **una sola** casa (o un solo hotel) en el Ayuntamiento y **hay al menos otro
jugador que también podría alzarla**, pedir alzar **no alza**: abre una **subasta por ese
edificio**.

- El que la pidió **abre la puja al precio de lista de la casa de su barrio**. Así, si los
  demás pasan, se la lleva por exactamente lo que le habría costado: nadie pierde nada por la
  regla nueva.
- **Cada uno puja por SU solar**: la subasta apunta al solar del mejor postor, y nadie puede
  pujar por debajo del precio de la casa de su propio barrio.
- **Un solar por pujador**, no una lista. La construcción pareja deja casi siempre un único
  solar donde tocaría alzar, y una puerta por solar no cabe en el portillo, que busca una
  puerta por tipo de movimiento.

Si el edificio escaso no lo quiere nadie más, se alza como siempre. Y si de verdad no queda
ninguno, la opción no se ofrece y la ayuda lo dice con esas palabras: «No hay casas en el
Ayuntamiento».

**Por qué existe la subasta.** Antes, con el Ayuntamiento sin casas, el primero que pulsaba se
llevaba la última, y eso era una rareza mientras sólo se obraba en el propio turno. Con la
regla de obrar en cualquier momento deja de ser una rareza y pasa a ser **una carrera**: seis
personas pueden pedir la misma casa en el mismo instante, y quien gane será quien tuviera mejor
conexión. La subasta convierte esa carrera en una decisión.

### 6.7 Vender edificios al Ayuntamiento

Se venden **al Ayuntamiento por la mitad del precio de la casa**, y sólo por eso: no hay
mercado de edificios entre jugadores, y los edificios no entran en los tratos (§8.2).

- **Una casa:** cobras la mitad del precio de la casa del barrio y la casa vuelve a las
  existencias.
- **Parejo al revés:** se quita de donde haya más. No se puede vender una casa de un solar si
  otro solar del barrio tiene más casas que él.
- **Un hotel, con al menos 4 casas en el Ayuntamiento:** se degrada a 4 casas, cobras **la
  mitad del precio de una casa**, el hotel vuelve a las existencias y salen cuatro casas de
  ellas.
- **Un hotel, sin 4 casas en el Ayuntamiento:** **se vende entero**. El solar se queda con
  cero casas y cobras **cinco veces la mitad del precio de la casa**.

**Regla de la casa, la del hotel sin casas.** El caso existe porque las casas son escasas de
verdad (§6.6) y hay que decidir algo. Degradar el hotel a «cuatro casas que no existen» sería
mentir en el estado; dejar el hotel sin poder venderlo dejaría a un jugador sin salida en un
apuro. Se vende entero, cobrando lo mismo que costó dividido por dos, y se dice en la ayuda.

Vender es también lo que se hace en un apuro, y por eso **vender vale también fuera del propio
turno cuando el apuro es tuyo** (§9.2).

---

## 7. La hipoteca y el dinero

### 7.1 Hipotecar

Un título se hipoteca **al Ayuntamiento por la mitad de su precio**, que siempre es una
cantidad entera porque todos los precios son pares (§1).

Condiciones: el título es tuyo, no está ya hipotecado, **no tiene casas**, y **ningún solar de
su barrio tiene edificios**. Esta última es la que sorprende: para hipotecar el Callejón de las
Latas hay que haber vendido antes hasta la última casa del Pasaje de los Charcos, porque son
del mismo barrio.

Un título hipotecado **no cobra renta** (§6.1), pero **sigue siendo tuyo**: cuenta para el
barrio entero, cuenta para el número de estaciones y de servicios (§7.4) y cuenta en tu
patrimonio por la mitad de su precio (§10.3).

### 7.2 Deshipotecar

Cuesta **la hipoteca más el 10 % de la hipoteca, redondeado hacia arriba**. El redondeo hacia
arriba es donde vive el fallo fácil (175 € de hipoteca dan 18 € de interés, no 17), y
hay DOS tablas escritas a mano que la clavan precisamente por eso: `DESEMPENO_A_MANO` en
`verificar-mecanicas-del-burgo.ts` (las 28 casillas comprables, 16 precios distintos) y la del
paso 7 de `verificar-burgo.ts`.

### 7.3 La tabla, precio a precio

| Precio | Hipoteca | Interés (10 %) | Deshipoteca |
|---|---|---|---|
| 60 € | 30 € | 3 € | 33 € |
| 100 € | 50 € | 5 € | 55 € |
| 120 € | 60 € | 6 € | 66 € |
| 140 € | 70 € | 7 € | 77 € |
| 150 € | 75 € | 8 € | 83 € |
| 160 € | 80 € | 8 € | 88 € |
| 180 € | 90 € | 9 € | 99 € |
| 200 € | 100 € | 10 € | 110 € |
| 220 € | 110 € | 11 € | 121 € |
| 240 € | 120 € | 12 € | 132 € |
| 260 € | 130 € | 13 € | 143 € |
| 280 € | 140 € | 14 € | 154 € |
| 300 € | 150 € | 15 € | 165 € |
| 320 € | 160 € | 16 € | 176 € |
| 350 € | 175 € | 18 € | 193 € |
| 400 € | 200 € | 20 € | 220 € |

### 7.4 Lo hipotecado cuenta para el número

Para contar cuántas estaciones o cuántos servicios tiene un dueño —que es lo que fija la renta
del §6.3 y del §6.4—, **las hipotecadas cuentan**. Lo único que la hipoteca quita es que ESE
título cobre.

Es una decisión explícita, porque el reglamento oficial del género no lo dice con todas las
letras y las mesas lo juegan de las dos maneras. Se eligió esta porque es la que hace que la
hipoteca sea una herramienta de tesorería y no una demolición: quien hipoteca una estación para
salir de un apuro no debería además hundir la renta de las otras tres.

### 7.5 Un título hipotecado que cambia de mano

Quien **recibe** un título hipotecado —en un trato (§8.4) o en una quiebra (§9.5)— paga **el
interés en el acto**, al Ayuntamiento, y el título **sigue hipotecado**.

**Regla de la casa, y es una simplificación declarada.** El reglamento oficial del género
ofrece al receptor elegir entre pagar la hipoteca entera más el interés y quedárselo libre, o
pagar sólo el interés y quedárselo hipotecado. Aquí siempre es lo segundo, y por dos razones:
la elección sería otra fase interactiva dentro de una operación que ya es compleja, y en una
quiebra con veintiocho títulos habría que preguntar veintiocho veces a alguien que puede no
estar. Quien quiera el título libre lo deshipoteca después, en su turno, por el mismo precio.

Si al receptor no le alcanza para ese interés:

- en un **trato**, el trato se rechaza con motivo y no se mueve nada;
- en una **quiebra**, el acreedor **entra él mismo en apuro** con el Ayuntamiento por ese
  importe. No se puede rechazar una quiebra.

### 7.6 El dinero se mueve de diez en diez

Todo lo que un jugador teclea —la puja libre de la subasta y los euros de un trato— va **de
diez en diez**. La razón es de mano, no de reglamento: en un móvil, un campo de importe con
paso de 1 € obliga a cuarenta toques para pujar 400 €, y un escalón de 10 € cubre el juego
entero (la puja mínima es 10 € y el escalón de la subasta es 10 €).

Lo que el juego cobra y paga por sí solo (rentas, impuestos, intereses, mitades de casa) no
tiene por qué ser múltiplo de diez, y no lo es.

### 7.7 Todo pago es todo o nada

**Nunca hay pago parcial.** Quien no alcanza no paga lo que puede: no se mueve ni un euro y se
abre su apuro con **la deuda entera** (§9.1). El dinero es siempre entero y nunca negativo.

**Regla de la casa.** En el juego de mesa clásico del género, quien no puede pagar entrega lo
que tiene y quiebra en el mismo gesto. Aquí el apuro es un paso propio con su plazo, para que
el endeudado tenga la oportunidad de vender, hipotecar o cerrar un trato antes de rendirse — que
en una mesa asíncrona puede ser un día entero. Un pago a medias con un saldo negativo sería un
estado que ninguna regla posterior sabría leer.

---

## 8. Los tratos

### 8.1 Quién trata con quién

> El «entre dos cualesquiera» es regla que entró tarde y ya está comprobada: paso 15 de
> `verificar-burgo.ts`, con vacuna. La caducidad del §8.5 no cambia.

- **Cualquier jugador vivo puede proponer a cualquier otro jugador vivo**, tenga o no el turno
  ninguno de los dos. Es lo que hace el juego de mesa clásico del género.
- **No se PROPONE mientras hay una subasta abierta.** Contestar (aceptar, rechazar) y retirar un
  trato ya propuesto sí se puede durante una subasta, y de ahí sale el caso del §3.2.
- Cada proponente puede tener **3 tratos abiertos** como mucho, y ese tope no es decorativo: sin
  él, seis jugadores con propuestas infinitas llenarían el aviso de todos y engordarían cada
  lectura de la mesa.
- Nadie se propone un trato a sí mismo.

### 8.2 Qué se puede poner en un trato

Cada lado del trato lleva tres cosas, y ninguna más:

- **euros** (nunca más de los que tiene quien los ofrece);
- **títulos** propios **sin edificios**, y cuyo barrio no tenga edificios en ningún solar;
- **Salvoconductos** (nunca más de los que tiene quien los ofrece).

**Un lado puede ir vacío** —eso es un regalo, y vale—, pero **los dos no**.

Lo que **no** se puede poner: casas y hoteles (se venden al Ayuntamiento, §6.7), inmunidades de
renta, promesas, ni nada que no sea una de esas tres cosas. Tampoco hay préstamos ni tratos a
tres bandas.

### 8.3 Los Salvoconductos en un trato

Se dan los **primeros de la lista** del que los da. Como no hay más de uno por mazo, nadie puede
acabar con dos Salvoconductos del mismo mazo.

### 8.4 Aceptar

Sólo lo acepta el destinatario, y puede hacerlo **en cualquier momento de la partida, tenga o
no el turno**. Al aceptar se **revalida todo con el estado de ahora**, porque entre que el trato
se propuso y se pulsó el botón han podido pasar cosas:

- las dos partes siguen vivas y la partida sigue en marcha;
- los títulos de cada lado siguen siendo de quien los ofrecía, siguen sin edificios y sus
  barrios siguen sin edificios;
- a cada parte le alcanza el dinero que puso;
- a cada parte le alcanza, **después del intercambio de euros**, para el interés de las
  hipotecas que recibe (§7.5).

Si algo de eso falla, el trato **se rechaza con motivo** («Ese trato ya no está en pie.», «No te
alcanza para el interés de las hipotecas.») y **no se mueve nada**.

Al aceptarse: se intercambian euros, títulos y Salvoconductos; se paga el interés de cada
hipoteca recibida; y **caducan todos los demás tratos abiertos que tocaran alguno de esos
títulos**, porque han dejado de decir la verdad.

Aceptar un trato puede **saldar un apuro** de cualquiera de las dos partes (§9.2). Y puede
dejar sin efectivo al mejor postor de una subasta abierta, que es el caso del §3.2.

### 8.5 Rechazar, retirar y caducar

- **Rechazar**: sólo el destinatario, en cualquier momento.
- **Retirar**: sólo el proponente, en cualquier momento.
- **Caducar**: todos los tratos abiertos caducan **al relevar el turno**. Un trato dura, como
  mucho, el turno en que se propuso.

Ahora que se trata entre dos cualesquiera (§8.1), la caducidad **significa otra cosa**: ya no es
«tus tratos mueren cuando dejas de tener el turno», sino **«una propuesta vale para la vuelta en
que se hizo»**. Se conserva por tres razones, y ninguna es inercia:

1. **Un trato es la foto de un tablero que cambia** — y ahora cambia más, porque cualquiera
   obra en cualquier momento (§6.5). Una propuesta de hace diez turnos describe un tablero que
   ya no existe.
2. **El aviso de cada asiento enseña el trato pendiente.** Un trato inmortal taparía para
   siempre lo que de verdad concierne a quien mira.
3. **El vencimiento del plazo no sabe contestar tratos**, así que un ausente acumularía
   propuestas hasta el fin de la partida.

Volver a proponer cuesta un gesto.

El plazo **no contesta tratos por el ausente** (§12.2): proponer y aceptar son decisiones, y un
robot que aceptara tratos por alguien sería un robot que le regala la partida a quien mejor
sepa redactarlos. Los tratos del ausente caducan solos al relevar.

---

## 9. El apuro y la quiebra

### 9.1 Qué es un apuro

Cuando alguien tiene que pagar más de lo que tiene en efectivo, **no paga nada** (§7.7) y se
abre su **apuro**: la mesa pasa a esperarle a él, aunque el turno sea de otro. El aviso lo dice
con esas palabras: «Debes 340 €: vende, hipoteca o declárate en quiebra.»

Un apuro puede llevar **varias deudas** (por ejemplo la carta que hace pagar a cada jugador
abre una deuda por jugador), y **se saldan todas de golpe** en cuanto el efectivo alcanza la
suma. No se paga a uno y luego a otro.

Si una carta endeuda a **varios jugadores a la vez** («cada jugador te paga 10 €»), los apuros
se hacen **cola**: se atiende el primero, y cuando se cierra entra el siguiente. La mesa espera
al primero de la cola.

### 9.2 Qué se puede hacer en un apuro

El endeudado, aunque no sea su turno:

- **vender** edificios (§6.7);
- **hipotecar** títulos (§7.1);
- **aceptar o rechazar** tratos (§8.4);
- **declararse en quiebra** (§9.4).

Lo que **no** puede hacer en un apuro: alzar, deshipotecar ni comprar. Todo lo que gaste
dinero está fuera mientras deba dinero.

En cuanto el efectivo alcanza la suma de las deudas, **se pagan todas y la mesa sigue** por
donde iba: el siguiente apuro de la cola, la siguiente subasta de la cola, o el paso del turno
que se había interrumpido.

### 9.3 Qué hace el plazo por el ausente

Si el endeudado no contesta y el plazo vence, la mesa **liquida por él en un solo vencimiento**
y en orden determinista (§12.2): primero vende un edificio del solar que **más casas** tenga
(empate: la casilla de número más alto), y si no hay edificios, hipoteca el título **de mayor
precio** (empate: la casilla de número más alto), repitiendo hasta cubrir la deuda. Si con todo
vendido e hipotecado no llega, **quiebra**.

Se hace entero en un vencimiento a propósito: si cada venta costara un plazo, un apuro con
cuarenta edificios tardaría cuarenta plazos en resolverse y la mesa parecería colgada.

### 9.4 Declararse en quiebra

**Se puede hacer en cualquier momento**, se deba dinero o no, tenga uno el turno o no. Es la
salida de emergencia del reglamento.

**Regla de la casa.** En el juego de mesa clásico del género se quiebra sólo cuando no se puede
pagar. Aquí, en una mesa que puede durar días, alguien tiene que poder irse sin dejar la partida
muerta esperándole; el botón se llama «Declararse en quiebra» y su ayuda dice a quién va todo.

### 9.5 Qué pasa al quebrar

Primero, **todos los edificios del quebrado se venden al Ayuntamiento por la mitad** y vuelven a
las existencias. Después, según a quién se quiebre:

**Con acreedor jugador** (el efectivo del quebrado más lo que dieron sus edificios):

- todo ese dinero pasa al acreedor;
- **los títulos pasan tal cual**: los hipotecados siguen hipotecados, y el acreedor paga el
  interés de cada uno **en el acto** (§7.5); si no le alcanza, entra él en apuro con el
  Ayuntamiento por ese importe;
- los Salvoconductos pasan al acreedor.

**Con el Ayuntamiento:**

- el dinero **se pierde**: no se reparte ni se acumula en ninguna casilla;
- los títulos vuelven al Ayuntamiento **sin hipoteca y sin casas** y salen a subasta uno a uno,
  en orden de casilla (§3.3);
- los Salvoconductos vuelven al fondo de su mazo.

En los dos casos: el quebrado se queda con 0 €, **queda fuera de la partida**, sus tratos
caducan, y si estaba pujando en una subasta sale de ella — y si además era el mejor postor, la
puja vuelve a cero.

### 9.6 Con quién se quiebra cuando hay varios acreedores

**Regla de la casa.** Se quiebra con **el que más reclama**. Si dos reclaman lo mismo, con el que
va antes en orden de mesa. Con el Ayuntamiento sólo si nadie reclama más que él. Se dice en la
ayuda del botón antes de pulsarlo, para que nadie descubra a quién le regaló su patrimonio
después de haberlo hecho.

El caso llega por las cartas que hacen pagar a todos y por una deuda de renta que se junta con
una deuda de impuesto. El reglamento oficial del género no lo resuelve porque en una mesa
presencial se resuelve hablando.

### 9.7 Un acreedor que ya quebró

Si quien tenía que cobrar ya no está en la partida, **cobra el Ayuntamiento**: la deuda no se
perdona, se destruye. Es lo que se hace con el dinero de una cuenta cerrada, y es la única
respuesta que no cambia el patrimonio de un tercero: repartir la deuda entre los vivos o
perdonarla sin más regalaría euros que nadie ganó.

---

## 10. El final de la partida

### 10.1 El último en pie

La partida termina cuando **queda un solo jugador sin quebrar**. Ése gana. Es el final normal y
es el único que la versión 1 del juego ofrece de fábrica.

### 10.2 Al terminar

El momento pasa a «terminada» y se limpian la subasta, las colas, el apuro y los tratos: en una
partida terminada **no se puede hacer nada**, ni siquiera contestar un trato que había quedado
abierto. La lista de opciones está vacía para todos, incluido el espectador.

### 10.3 El tope de vueltas (regla de mesa)

Quien abre la partida puede fijar un **tope de vueltas a la Salida**. Con tope, la partida
termina en el primer relevo de turno en que **el MÍNIMO de vueltas de los jugadores vivos**
alcanza el tope, y **gana el mayor patrimonio**.

El patrimonio es: efectivo + precio de los títulos sin hipoteca + **la mitad** del precio de los
hipotecados + el precio de la casa por cada casa (y por cinco, en un hotel).

Si hay **empate a patrimonio, comparten la victoria**: no hay desempate inventado. Un desempate
por número de títulos, por orden de asiento o por lo que sea es una regla que nadie ha pedido y
que decidiría partidas.

**Regla de la casa.** El juego de mesa clásico del género no tiene final por tiempo, y las
partidas largas son su fama. El tope existe porque una mesa en línea con seis personas y un
plazo de un día puede durar meses. **El reductor lo admite y está comprobado, pero la versión 1
sólo ofrece empezar sin tope** (`DISENO-3.md`): la hoja del Muelle enseña una única opción de
arranque, y ofrecer la variante sólo en el escritorio rompería la regla de que ningún juego es
sólo para PC. Cuando se ofrezca, se ofrecerá en los dos sitios a la vez.

---

## 11. Las treinta y dos cartas

Los textos son propios y salen tal cual de `burgo-tablero.ts`. La columna «Efecto» dice lo que
el reductor hace de verdad, que es lo que manda cuando el texto es ambiguo.

Lo común a todas: la carta se cumple en el acto; si manda a otra casilla, esa casilla se
resuelve enseguida (§4.3); y la carta vuelve al fondo de su mazo salvo el Salvoconducto (§4.2).

### 11.1 Suerte

| # | Título | Texto | Efecto |
|---|---|---|---|
| 1 | A la Salida | «Avanza hasta la Salida. Cobra 200 €.» | Va a la 0 (La Salida) y cobra los 200 €. |
| 2 | Al Paseo de los Tilos | «Avanza hasta el Paseo de los Tilos. Si pasas la Salida, cobra 200 €.» | Va a la 37; cobra 200 € si cruza la Salida; luego se resuelve la casilla (renta, o compra si no tiene dueño). |
| 3 | A la Calle de los Balcones | «Avanza hasta la Calle de los Balcones. Si pasas la Salida, cobra 200 €.» | Va a la 16, igual que la anterior. |
| 4 | A la Calle de la Frutería | «Avanza hasta la Calle de la Frutería. Si pasas la Salida, cobra 200 €.» | Va a la 11, igual. |
| 5 | A la Estación de Goya | «Avanza hasta la Estación de Goya. Si pasas la Salida, cobra 200 €.» | Va a la 5; renta **normal** de estación (§6.3), no doble. |
| 6 | A la estación más cercana | «Avanza hasta la estación más cercana. Si tiene dueño, págale el doble de la renta; si no, puedes comprarla.» | Busca hacia delante entre las casillas 5, 15, 25 y 35; cobra la Salida si la cruza; con dueño, **renta doble**; sin dueño, se abre `comprar`. |
| 7 | A la estación más cercana | «Avanza hasta la estación más cercana. Si tiene dueño, págale el doble de la renta; si no, puedes comprarla.» | Igual que la 6: hay dos cartas iguales en el mazo. |
| 8 | Al servicio más cercano | «Avanza hasta el servicio público más cercano. Si tiene dueño, tira los dados y págale diez veces la tirada; si no, puedes comprarlo.» | Busca hacia delante entre las casillas 12 y 28; cobra la Salida si la cruza; con dueño, **10 × una tirada NUEVA** (§6.4); sin dueño, se abre `comprar`. |
| 9 | Dividendo de acciones | «Tus acciones reparten dividendo: cobra 50 €.» | Cobra 50 € del Ayuntamiento. |
| 10 | Salvoconducto | «Sales de la Comisaría cuando quieras. Guarda esta carta hasta usarla o cambiarla.» | La carta **sale del mazo** y se guarda en la mano (§4.2, §5.3). |
| 11 | Tres calles atrás | «Retrocede tres casillas.» | Retrocede 3 **sin cobrar la Salida**; luego se resuelve la casilla. Desde la 36 cae en la Caja de Comunidad y se roba otra carta (§4.3). |
| 12 | ¡A comisaría! | «Ve derecho a la Comisaría, sin pasar por la Salida ni cobrar 200 €.» | A la Comisaría, retenido; termina el turno (§5.1). |
| 13 | Derrama de la comunidad | «Paga 25 € por cada casa y 100 € por cada hotel.» | 25 € por casa y 100 € por hotel, al Ayuntamiento. Un solar con hotel cuenta **como un hotel y ninguna casa**. |
| 14 | Multa de tráfico | «Paga una multa de 15 € por aparcar en doble fila.» | Paga 15 € al Ayuntamiento. |
| 15 | Viaje a la Estación del Norte | «Viaja hasta la Estación del Norte. Si pasas la Salida, cobra 200 €.» | Va a la 35; renta **normal** de estación. |
| 16 | Presides la comunidad | «Te eligen presidente de la comunidad: paga 50 € a cada jugador.» | 50 € a cada jugador vivo, uno por uno. Si no alcanza, se abre un apuro con **todas** las deudas dentro (§9.1). |

### 11.2 La Caja de Comunidad

| # | Título | Texto | Efecto |
|---|---|---|---|
| 1 | A la Salida | «Avanza hasta la Salida. Cobra 200 €.» | Va a la 0 y cobra los 200 €. |
| 2 | Error del Ayuntamiento | «Error del Ayuntamiento a tu favor: cobra 200 €.» | Cobra 200 € del Ayuntamiento. |
| 3 | Factura del dentista | «Paga 50 € al dentista.» | Paga 50 € al Ayuntamiento. |
| 4 | Venta de trastos | «Vendes tus trastos en el mercadillo: cobra 50 €.» | Cobra 50 € del Ayuntamiento. |
| 5 | Salvoconducto | «Sales de la Comisaría cuando quieras. Guarda esta carta hasta usarla o cambiarla.» | La carta sale del mazo y se guarda en la mano. |
| 6 | ¡A comisaría! | «Ve derecho a la Comisaría, sin pasar por la Salida ni cobrar 200 €.» | A la Comisaría, retenido; termina el turno. |
| 7 | Fiestas del barrio | «Fiestas del barrio: cada jugador te paga 10 €.» | Cada jugador vivo paga 10 €. Quien no pueda, entra en la cola de apuros (§9.1). |
| 8 | Te toca la lotería | «Te toca un pellizco de la lotería: cobra 100 €.» | Cobra 100 € del Ayuntamiento. |
| 9 | Devolución de impuestos | «El Ayuntamiento te devuelve impuestos: cobra 20 €.» | Cobra 20 € del Ayuntamiento. |
| 10 | Es tu cumpleaños | «Es tu cumpleaños: cada jugador te paga 10 €.» | Igual que la 7. |
| 11 | Vence el seguro | «Vence tu seguro de vida: cobra 100 €.» | Cobra 100 € del Ayuntamiento. |
| 12 | Urgencias | «Paga 100 € en urgencias.» | Paga 100 € al Ayuntamiento. |
| 13 | Matrícula del colegio | «Paga 50 € de matrícula en el colegio.» | Paga 50 € al Ayuntamiento. |
| 14 | Cobras tus facturas | «Cobra 25 € de facturas pendientes.» | Cobra 25 € del Ayuntamiento. |
| 15 | Obras en la calle | «Te toca pagar las obras de la calle: paga 40 € por cada casa y 115 € por cada hotel.» | 40 € por casa y 115 € por hotel, al Ayuntamiento. |
| 16 | Concurso de balcones | «Ganas el segundo premio del concurso de balcones: cobra 10 €.» | Cobra 10 € del Ayuntamiento. |

### 11.3 Las cuentas de las dos cartas de obras

Las cartas 13 de Suerte y 15 de la Caja de Comunidad cuentan **casas y hoteles por separado**: un
solar con hotel aporta un hotel y **cero** casas, no cinco casas. Con el tablero lleno de un
jugador (por ejemplo cuatro solares con hotel), la 13 de Suerte cuesta 400 € y la 15 de la Caja
de Comunidad, 460 €.

---

## 12. Las decisiones para la mesa en línea

Todo lo que hay en esta sección existe porque El Burgo se juega **en una mesa asíncrona**:
seis personas que pueden tardar días en contestar, en un móvil y en un escritorio, con el
servidor como única autoridad. Nada de esto está en el reglamento oficial del género, porque
allí todos están sentados a la vez.

### 12.1 A quién se espera

La mesa tiene **UN plazo**, y lo reprograma cuando cambia **a quién se espera**. Por eso hay dos
conceptos y no uno:

- **a quién se espera** es el que puja en la subasta, el endeudado en el apuro, o el del turno
  en los demás pasos;
- **de quién es el turno** es otra cosa, y la cinta lo dice aparte: «Turno de Ana · puja Bea».

Si el que puja no fuera «a quién se espera», un tercero pujando prorrogaría indefinidamente el
plazo del ausente. En las fases con cola (varios apuros), se espera **al primero de la cola**.

### 12.2 El tic: qué juega la mesa por el ausente

Cuando vence el plazo, la mesa juega lo **mínimo** por el ausente, y hace **una sola cosa** por
vencimiento. La mesa mete hasta ocho vencimientos por lectura
(`TICS_DE_GOLPE` en `server/src/arcade/mesas.ts`), así que un turno entero del ausente son
tres o cuatro.

| Situación | Qué hace la mesa |
|---|---|
| Reuniendo, o terminada | **Nada.** Devuelve exactamente el mismo estado; una partida no se abre sola ni se reabre sola. |
| Subasta | **Pasa** por el que tenía que pujar. |
| Apuro | **Liquida** al endeudado entero, en el orden del §9.3, y si no llega, quiebra. |
| Tiene un título sin dueño sin decidir | **Lo saca a subasta.** Nunca compra por él: sería gastarle el dinero. |
| Tiene el Impuesto sin pagar | **Lo paga por él, y por el camino más barato de los dos** (a igualdad, la fija, que no depende de contar el patrimonio). Lo barato porque el tic juega POR el ausente, no contra él. El Impuesto no es una oportunidad que se pueda declinar: es una deuda, y dejarla sin pagar dejaría la mesa parada. Va ANTES que tirar o pasar, porque el tic que tirase cobraría la fija de camino y la elección se perdería sin que nadie la viera. Ojo: es lo contrario de lo que hace un HUMANO que tira o pasa sin elegir, que paga la fija (§3.4). |
| Tiene que tirar (libre) | **Tira por él.** |
| Tiene que tirar (retenido) | **Prueba con los dados** por él: con dobles sale; al tercer fallo paga la fianza (o entra en apuro) y mueve. |
| Ya tiró, con doble pendiente | **Vuelve a tirar.** |
| Ya tiró, sin doble pendiente | **Pasa el turno.** |

Lo que la mesa **nunca** hace por nadie: comprar, alzar, deshipotecar, proponer un trato,
aceptar un trato ni rechazarlo.

**El tic gasta azar donde el jugador lo gastaría** (los dados y sólo los dados). Es una
decisión tomada a sabiendas y apartándose de Riberas, cuyo tic no gasta azar: aquí el ausente
tiene que **mover**, y mover son dados. Sigue siendo reproducible porque cada vencimiento va al
diario con su contexto y se reejecuta en el mismo sitio.

**Lo que no puede pasar nunca, y hay comprobador que lo exige:** que el tic deje la mesa en un
estado del que sólo pueda sacarla un humano. Por eso el apuro se liquida entero de una vez y
por eso la quiebra con el Ayuntamiento encola las subastas y las cierra sola. La propiedad
comprobada es dura: una mesa real con plazo de un segundo, seis sentados y **nadie moviendo**
tiene que **terminar sola, con ganador**, y cada vencimiento en marcha tiene que cambiar algo.

**Una mesa sin plazo es jugable.** Con plazo cero no entra ningún vencimiento nunca: el Burgo no
caduca NADA por tiempo. Lo único que caduca son los tratos, y caducan por turno, no por reloj
(§8.5).

### 12.3 Qué es secreto y qué es público

**Público, para todos, incluido el espectador:** el dinero de cada jugador, sus títulos, sus
casas y hoteles, sus hipotecas, su posición, si está retenido, **cuántos** Salvoconductos tiene,
todos los tratos abiertos con su contenido, la subasta entera con sus pujas, el apuro con sus
deudas, las existencias de casas y hoteles del Ayuntamiento, **cuántas** cartas quedan en cada
mazo y el número de la última carta que salió.

**Secreto, y no sale de la autoridad:** el objeto de azar de la partida y **el orden de los dos
mazos**. Nada más.

La vista es **la misma para todos**: no hay manos ocultas en el Burgo. Lo único que cambia según
quién mire es qué opciones se le ofrecen, qué aviso le concierne y cuál es «su» asiento.

Consecuencias que son ley:

- La carta que sale se publica por su **número**, nunca por la serie con la que viaja en el
  mazo.
- **Ningún identificador de opción lleva dentro una carta ni el azar.**
- **Ningún motivo de rechazo nombra una carta que no haya salido.** Hay una vacuna que envenena
  un motivo con una serie de carta para ver caer al comprobador que lo vigila.

### 12.4 La renta se cobra sola

**Regla de la casa.** En el juego de mesa clásico del género —y desde luego en la costumbre de
muchas mesas— el dueño tiene que **pedir** la renta, y si no la pide antes de la siguiente
tirada, la pierde. Aquí la renta **se cobra sola**, en el acto, en cuanto alguien cae.

La razón es la mesa asíncrona: el dueño puede estar dormido, o de viaje, o puede tardar tres
días en abrir la aplicación. Una regla que castiga por no estar mirando convierte el juego en
una competición de reflejos, y en una mesa que dura una semana no sería ni una competición: sería
un impuesto sobre quien tiene el móvil en la mano. El Ayuntamiento cobra por el dueño.

### 12.5 Todo se puede jugar sin el tablero 3D

**Ningún juego es sólo para PC**, y aquí eso significa algo más fuerte: el Burgo entero se juega
también en el **retablo de respaldo**, un tablero declarado en cuatro tiras de diez casillas que
funciona cuando el modelo 3D no llega o el lienzo se cae, en el móvil y en el escritorio.

El retablo es un **mapa que no se toca**: ni las casillas ni las fichas responden al dedo. Se
juega por **botones** —que miden al menos 44 píxeles en los dos clientes— y por **paneles** (la
mesa, lo mío, la última carta, la última tirada, y al final la subasta, el apuro y los tratos si
existen). La razón está medida: en un móvil de 390 píxeles, un anillo de cuarenta casillas da
casillas de 29 píxeles, y cuatro tiras de diez dan 36 — las dos por debajo del tamaño de un
dedo.

Lo único que el respaldo **no** compone son las dos declaraciones: la **puja libre** (importe
tecleado) y la **propuesta de trato**. En el respaldo se puja por escalones —el mínimo legal,
+50 € y +100 €— y se aceptan, rechazan y retiran tratos, pero para proponer uno hace falta el
componedor del cliente. Se dice en la ayuda.

### 12.6 Las mesas guardadas sobreviven a los despliegues

El estado del Burgo lleva número de versión desde el primer commit, y la partida guardada en
disco se rellena con lo que falte al cargarla. Si no falta nada, se devuelve **el mismo objeto**,
porque la mesa compara por identidad y una copia idéntica subiría la revisión, engordaría el
diario y despertaría a seis móviles para nada.

### 12.7 La crónica: sólo lo último, y con tope

Cada cambio publica **los sucesos de ese cambio y de ninguno más** —no hay histórico— junto con
un número de jugada que los sella. La escena anima lo que hay entre la jugada que vio y la que
llega; el retablo la ignora salvo para el aviso.

Si un solo cambio produce más de **64** sucesos (una liquidación puede producir docenas de
ventas e hipotecas), **se cortan los PRIMEROS** y se conserva el final: la quiebra, el relevo de
turno y el fin de partida van siempre al final y no se pueden perder.

### 12.8 Lo que no existe en el Burgo

Y no es un olvido:

- **Levantarse de la mesa antes de empezar.** Una silla ocupada gasta aforo para siempre; lo que
  hay es declararse en quiebra una vez empezada (§9.4).
- **Entrar en una partida ya empezada.**
- **Préstamos, regalos fuera de un trato, y tratos a tres bandas.** Un trato con un lado vacío
  sí es un regalo, y ése vale (§8.2).
- **Récords y marcador.** El Burgo no tiene reloj de juego, así que no hay tiempos que comparar.
- **Mesa local sin servidor.** El Burgo es de servidor, como Riberas: las reglas viven en un solo
  sitio y ese sitio es la autoridad.

---

## Apéndice A · Las divergencias, en una lista

Todo lo que en El Burgo se aparta del juego de mesa clásico del género, junto, para que nadie
tenga que buscarlo. La columna «Por qué» está resumida; el porqué entero está en la sección.

| # | Divergencia | Sección | Por qué |
|---|---|---|---|
| 1 | **El 10 % del Impuesto redondea HACIA ABAJO** (al revés que el interés de la hipoteca), y quien tira o pasa sin elegir paga la fija; el tic, por el ausente, paga lo más barato. | §3.4, §12.2 | Una alternativa que redondeara hacia arriba podría costar más que la décima que promete el botón; la fija es la que la casilla anuncia, y el tic juega por el ausente y no contra él. |
| 2 | **La renta se cobra sola**: nadie tiene que pedirla. | §12.4 | Mesa asíncrona: castigar al que no está mirando convertiría el juego en un impuesto sobre quien tiene el móvil en la mano. |
| 3 | **Hay tres momentos en los que no se obra**: subasta abierta, apuro abierto (salvo el endeudado) y título sin dueño del turno sin decidir (salvo el del turno). El Impuesto sin pagar NO es uno. | §6.5 | Un pago de un tercero metido en medio cambia quién gana una puja y quién quiebra sin que a ese tercero le tocara nada. |
| 4 | **Los tratos caducan al relevar el turno**, y hay un tope de 3 abiertos por proponente. | §8.5, §8.1 | Un trato es la foto de un tablero que cambia; el aviso enseña el pendiente; y el vencimiento del plazo no sabe contestarlos. |
| 5 | **La subasta de la última casa la abre el que la pidió, al precio de lista de su barrio, y cada uno puja por SU solar.** | §6.6 | Así el que la pidió no pierde nada por la regla nueva si los demás pasan; y una puerta por solar no cabe en el portillo. |
| 6 | **No hay pago parcial**: quien no alcanza no paga nada y entra en apuro con la deuda entera. | §7.7, §9.1 | El apuro es un paso con su plazo, para que el endeudado pueda vender, hipotecar o tratar antes de rendirse. |
| 7 | **Un título hipotecado que cambia de mano paga siempre y sólo el interés**, y sigue hipotecado. | §7.5 | La elección del receptor sería otra fase; en una quiebra habría que preguntarla veintiocho veces. |
| 8 | **Con varios acreedores se quiebra con el que más reclama** (empate: el asiento anterior). | §9.6 | En una mesa presencial se resuelve hablando; aquí hace falta una regla escrita, y se dice en la ayuda. |
| 9 | **Con un apuro abierto, caer en un título sin dueño no abre la compra**: va a la cola de subastas. | §3.1 | No caben dos pasos a la vez. |
| 10 | **Declararse en quiebra vale en cualquier momento**, se deba dinero o no. | §9.4 | Salida de emergencia: alguien tiene que poder irse sin dejar la partida muerta. |
| 11 | **Vender un hotel sin 4 casas en el Ayuntamiento lo vende entero** (cinco medias casas). | §6.7 | Degradarlo a casas que no existen sería mentir en el estado. |
| 12 | **Las estaciones y los servicios hipotecados cuentan** para el número del dueño. | §7.4 | El reglamento oficial del género no lo dice con todas las letras; se elige que hipotecar sea tesorería y no demolición. |
| 13 | **El sorteo de salida tiene tope de 12 rondas**; después sale el primero en orden de asiento. | §2.2 | Una partida tiene que empezar aunque el azar se empeñe. |
| 14 | **Tope de vueltas opcional** con victoria por patrimonio y empates compartidos. | §10.3 | Una mesa en línea con seis personas y plazo de un día puede durar meses. Hoy no se ofrece todavía. |
| 15 | **Un acreedor que ya quebró no cobra: cobra el Ayuntamiento.** | §9.7 | Es lo único que no cambia el patrimonio de un tercero. |
| 16 | **El mejor postor que se queda sin dinero al cerrar la subasta pierde el título**, que se queda en el Ayuntamiento. | §3.2 | Es el único cierre del juego que no deja deuda. |
| 17 | **El Descanso no acumula nada**, y la variante del bote no existe. | §2.6 | Coincide con el reglamento oficial del género; la variante necesitaría un depósito público sin dueño. |

### Lo que DEJÓ de ser divergencia

Cuatro reglas del juego de mesa clásico del género estuvieron fuera y han vuelto a entrar. Se
apuntan aquí para que nadie las busque en la lista de arriba y crea que se han perdido, y
porque las cuatro tocan lo mismo —quién puede hacer qué y cuándo— y llegaron juntas:

| Antes | Ahora | Sección |
|---|---|---|
| Sólo se obraba en el propio turno. | Se obra en cualquier momento, salvo en los tres en que la mesa espera una respuesta concreta. | §6.5 |
| Sólo se trataba con el del turno. | Se trata entre dos jugadores cualesquiera; la caducidad al relevar se queda y significa «una propuesta vale para la vuelta en que se hizo». | §8.1, §8.5 |
| Con el Ayuntamiento sin casas no se alzaba, y la última se la llevaba el primero que pulsaba. | La última casa sale a subasta si hay más de un interesado. | §6.6 |
| El Impuesto eran 200 € fijos. | Se elige entre 200 € y el 10 % del patrimonio. | §3.4 |

`DISENO-3.md` §12 las daba las cuatro por fuera de alcance. El porqué de reabrirlas está en la
cabecera de `shared/arcade/juegos/burgo.ts`, bajo «las cuatro reglas oficiales que faltaban», y
las cuatro secciones de esta hoja lo recogen. **Las cuatro las comprueba el paso 15 de
`server/scripts/verificar-burgo.ts`**, cada una con su vacuna, y el veneno de cada vacuna es el
comportamiento viejo.

## Apéndice B · Dónde vive cada regla

Para el que tenga que cambiar algo. Las rutas son del árbol; los números de línea envejecen,
los nombres de función no.

| Sección | Dónde |
|---|---|
| §1 la tabla, §11 las cartas | `shared/arcade/juegos/burgo-tablero.ts` (`CASILLAS`, `BARRIOS`, `EL_PREGON`, `EL_ARCA`) |
| §2 empezar y el sorteo | `burgo.ts` → `empezar` |
| §2 la tirada y los dobles | `burgo.ts` → `tirar`, `tirarDosDados` |
| §2 mover y la Salida | `burgo.ts` → `mover`, `andar`, `viajar`; `shared/mecanicas/anillo.ts` |
| §2.6 resolver la casilla | `burgo.ts` → `resolverCasilla` |
| §3 la subasta | `burgo.ts` → `abrirAlmoneda`, `pujar`, `pasarPuja`, `cerrarSiToca`, `cerrarAlmoneda` |
| §3.4 el Impuesto y el 10 % | `burgo-tablero.ts` → `PARTE_DEL_IMPUESTO`, `decimaDelPatrimonio`; `burgo.ts` → `PAGAR_IMPUESTO`, `pagarElImpuesto`, y la marca `impuestoSinPagar` del estado |
| §4 los mazos | `burgo.ts` → `robarCarta`, `cumplirLaCarta`; `shared/mecanicas/mazo.ts` |
| §5 la Comisaría | `burgo.ts` → `aLaMazmorra`, `tirar`, y las ramas `PAGAR_FIANZA` y `USAR_INDULTO` |
| §6 las rentas | `burgo.ts` → `rentaDe`, `barrioEntero`, `cuantasTiene` |
| §6.5 las obras y cuándo se obra | `burgo.ts` → `puedeAlzar`, `puedeVender`, `alzar`, `vender`, `loQueDaVender`, `puedeObrarAhora` |
| §7 la hipoteca | `burgo-tablero.ts` → `valorDeEmpeno`, `interesDelEmpeno`, `costeDeDesempeno`; `burgo.ts` → `puedeEmpenar`, `puedeDesempenar`, `empenar`, `desempenar` |
| §8 los tratos | `burgo.ts` → `puedeProponer`, `proponer`, `aceptar`, `rechazarTrato`, `retirarTrato`, `ladoValido` |
| §9 el apuro y la quiebra | `burgo.ts` → `apurar`, `saldar`, `reanudar`, `acreedorDe`, `quebrar`; `shared/mecanicas/hacienda.ts` |
| §10 el final | `burgo.ts` → `puedeHaberAcabado`, `finPorPatrimonio`, `patrimonioDe`, `terminar` |
| §12.1 a quién se espera | `burgo.ts` → `aQuienSeEspera`, `duenoDelTurno` |
| §12.2 el tic | `burgo.ts` → `venceElPlazo`, `liquidar`; `server/src/arcade/mesas.ts` |
| §12.3 los secretos | `burgo.ts` → `loSecretoDelBurgo`, `loQueSeVe` |
| §12.5 el respaldo | `burgo.ts` → `tableroDelBurgo`; `shared/mecanicas/tablero-declarado.ts` |
| §12.6 las mesas guardadas | `burgo.ts` → `comoSiSiempreHubieraHabidoBurgo` |
| §12.7 la crónica | `burgo.ts` → `conSucesos`, `SucesoDelBurgo` |
| Todo, comprobado | `server/scripts/verificar-burgo.ts` (15 pasos; el 15 son las cuatro reglas que entraron tarde), `server/scripts/verificar-mecanicas-del-burgo.ts` |

## Apéndice C · Cómo se mantiene verdadera esta hoja

1. **Las cifras se generan, no se escriben.** Las tres tablas grandes (§1, §1.1, §7.3, §11)
   salieron de un guion que importa `burgo-tablero.ts` y las imprime. Si cambia un precio,
   se vuelve a generar; no se corrige a mano.
2. **Los números de sección son una interfaz.** El código cita hoy §0, §1, §3, §4, §5, §7, §8,
   §9, §10, **§11** y §12 por número —once números en treinta y un sitios de `shared/`,
   `server/`, `escritorio/` y `docs/`; el §11 lo citan tres veces las cartas de
   `burgo-tablero.ts` y es el que más fácil se olvida—. Renumerar una sección
   obliga a cambiar todas sus citas **en el mismo commit**, o el código quedará apuntando a una
   regla que no es la suya. Se encuentran con `grep -rn "reglamento §" shared/ server/ escenas/
   escritorio/ app/ docs/`.
3. **Cada divergencia del apéndice A vive en su sección con su porqué.** Una divergencia sin
   porqué escrito envejece igual de mal que una lista negra sin explicación: dentro de dos años
   nadie sabe si fue una decisión o un descuido, y entonces no se puede ni defender ni corregir.
4. **Gana el código.** Si esta hoja y el reductor no dicen lo mismo, el reductor tiene razón por
   definición: él es quien juega la partida.
