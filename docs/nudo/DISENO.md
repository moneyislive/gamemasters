# El Nudo de Valdehierro — diseño del juego

> Madrugada del 14 de enero de 1927. Ardió la oficina del telégrafo de Valdehierro y con
> ella el cuadro de marchas de esta noche. Seis convoyes vienen rodando hacia el nudo y no
> hay forma de avisarles. Uno de ellos lleva el suero para el valle.

Este documento es el diseño completo: las reglas, las cuentas, y el porqué de cada
número. Lo que hay que saber para **escribir** un juego está en
`docs/ESCRIBIR-UN-JUEGO.md`; lo que hay que saber para **jugar** a este está en
`manifiesto.reglas` y en la guía imprimible.

---

## 0. Por qué este juego y no otro

CLUEDO fue el juego para el que se escribió la plataforma. El Misterio de la Momia
demostró que aguantaba uno que no cabía en ella. El Paso de las Sombras demostró que,
hecho aquel trabajo, un juego nuevo ya no obligaba a ampliarla: solo a rellenar los huecos
que el manual enumera.

Pero los tres son el mismo juego visto de tres maneras: **rondas simultáneas, una persona
de la mesa es la respuesta, y al final se señala a alguien.** Todo lo que la plataforma no
había tenido que hacer nunca seguía sin probarse — y una arquitectura que solo ha
soportado tres variaciones de lo mismo no ha demostrado nada sobre la cuarta.

Este juego se escribe para probarlo, y por eso rompe cinco cosas a la vez:

| Lo que hacían los tres | Lo que hace este |
|---|---|
| Una persona de la mesa es la respuesta | **Nadie es el malo.** Ningún eje señala a nadie |
| Uno o tres ejes | **Seis ejes**, todos de la misma categoría |
| Gana quien acierta antes (o un bando) | **Se gana o se pierde en grupo**, contra un presupuesto |
| Tres categorías de entidades | **Cuatro**, y una que no entra en el rompecabezas |
| Todo se juega hablando | **Cuatro minijuegos** dentro de la app, planteados y corregidos por el servidor |

Y una restricción autoimpuesta, que conviene leer antes que nada: **no se inventa ningún
nombre de fase**. El contrato dice que son libres; el §11 explica por qué a día de hoy no
lo son del todo.

---

## 1. La ficción, y qué parte es verdad

Valdehierro es inventada. Todo lo demás es de la época y se sostiene:

- **El cuadro de marchas** existía y era exactamente eso: un impreso grande con las horas
  a las que cada tren ocupa cada tramo. Perderlo paralizaba una estación.
- **El enclavamiento** es real y es la pieza más bonita del ferrocarril del XIX: un
  armazón de palancas trabadas mecánicamente entre sí, de modo que **es físicamente
  imposible dar dos itinerarios que se cortan**. No decide por ti: te impide equivocarte.
  El juego entero cuelga de esa idea.
- **La difteria** mataba niños todos los inviernos, y el suero antidiftérico —descubierto
  en 1894— había que llevarlo en frío y deprisa. Una expedición de urgencia con suero es
  exactamente el tipo de cosa que un ferrocarril hacía.
- **El telégrafo** transmitía sin minúsculas ni signos de puntuación: por eso los
  telegramas del juego van en versalitas y con STOP.
- **El hectógrafo** —la copia de gelatina, tinta violeta— es la razón de que los
  imprimibles tengan tres tintas y de que la de «lo escrito a mano en la estación» sea
  morada.

Lo que el juego inventa: la noche concreta, el incendio y las reglas.

**Lo que NO hay, y es deliberado: no hay sabotaje, no hay culpable y no ha muerto nadie.**
El antagonista es el reloj y la nieve. Una velada cooperativa contra un presupuesto se
juega distinta de una donde se sospecha del de al lado, y esa diferencia es medio encargo
de este juego.

---

## 2. Cómo se juega, en una página

**La noche tiene seis franjas horarias** (00:00, 00:40, 01:20, 02:00, 02:40, 03:20) y en
cada una sale **un convoy**, sin repetir. Averiguar cuál va en cada una es el juego.

Nadie conoce el cuadro. Lo que hay son **las tiras de telegrama** que cada cual salvó del
fuego: entre todas determinan **un solo cuadro posible**, y ninguna persona sola puede
sacarlo.

En cada franja:

1. **Se va a un puesto.** Cada habitación de la casa es un puesto de la estación con su
   instrumento. Hay que ir andando y ocuparlo desde la app.
2. **Se resuelve el instrumento** (un minijuego). El primero que lo saca da la
   **conformidad** de ese puesto; todo el que lo saque se lleva **margen**.
3. **Se cursa la orden de salida** de un convoy. Gasta una conformidad. Si es el que
   tocaba, sale. Si no, **el enclavamiento no da paso**: dos minutos de retraso y a
   pensar otra vez.

Al final, cada cual **entrega su cuadro de marchas** de memoria —esa es la puntuación
individual— y quien dirige **da el parte del amanecer**.

**Se gana** si el Correo de Medianoche cruzó y el retraso final no pasó del tope. Gana el
turno entero o no gana nadie.

---

## 3. Las piezas

### 3.1 Categorías de entidades

| Id | Qué es | Mínimo | Notas |
|---|---|---|---|
| `ferroviarios` | Las personas de la mesa | 4 | `sonJugadores`. Cuatro porque hay cuatro oficios |
| `convoyes` | Los seis trenes | **exacto 6** | Única categoría de los cuatro juegos con `exacto` |
| `puestos` | Las habitaciones de la casa | 4 | `sonLugares`. Uno por instrumento |
| `mercancias` | Los cargamentos | 3 | **No entra en el rompecabezas** |

`convoyes` tiene `exacto: 6` porque el cuadro es una **biyección** entre convoyes y
franjas, y las franjas son seis porque los **ejes del manifiesto son datos estáticos**: no
pueden crecer con la mesa. Con cinco convoyes sobra una franja y con siete falta una.

`mercancias` existe por dos razones. Una de producto: las hojas de porte encima de la mesa
son ambientación barata y muy eficaz. Y una arquitectónica: hacía falta una **cuarta
categoría que no cargue con el peso del juego**, para comprobar que una partida con cuatro
familias de entidades las manda las cuatro al móvil. Antes de la migración solo cabía una
además de personas y lugares.

Son **tres** cargamentos para seis convoyes, no seis: con uno cada uno, la carga sería otro
nombre del convoy. Repitiéndose, «el que lleva carbón» deja de identificar a nadie — que
es justo lo que obliga a decir el nombre del convoy.

### 3.2 Los seis ejes

`franja-1` … `franja-6`, todos de categoría `convoyes`, con rótulo la hora.

Esto es lo que hace que **la maquinaria de acusación de la plataforma sirva sin tocarla**:
`respuestaCompleta`, `aciertos` (que es la puntuación individual), la hoja de respuesta del
móvil con seis selectores y el desenlace con un renglón por franja salen gratis.

Y `ejeDeJugadores` devuelve `undefined`, porque ningún eje apunta a la categoría de
personas. De ahí sale que `soyElSenalado` sea falso para todo el mundo, que el dosier no
declare el bloque `senalado`, y que el desenlace no lleve `senaladoId`.

### 3.3 Los cuatro oficios

| Oficio | Instrumento | Maña (una vez en toda la noche) |
|---|---|---|
| `agujas` · guardagujas | La maniobra | **Cambio de aguja**: la siguiente orden que te rechacen no cuenta retraso |
| `telegrafo` · telegrafista | El parte | **Línea directa**: tu siguiente consulta al archivo sale gratis |
| `enclavamiento` · factor de circulación | Las palancas | **Llave maestra**: cursas una orden sin gastar conformidad |
| `muelle` · jefe de carga | El cargue | **Doble turno**: ganas tres de margen de golpe |

La maña va **atada al oficio** y no repartida aparte: quien lleva la garita sabe qué puede
hacer con la garita, así que se explica sola y no hay que releer el dosier a las dos de la
mañana. Cada una toca una parte distinta de la economía (el retraso, el archivo, las
conformidades, el margen) y **ninguna resuelve el rompecabezas**: dan aire, no respuestas.

Tres de las cuatro dejan un efecto **armado** que se gasta en la acción siguiente. Es a
propósito: obliga a decirlo en voz alta antes de la jugada, que es lo que convierte una
maña en un momento de mesa en vez de en un botón.

### 3.4 La economía

| Concepto | Valor |
|---|---|
| Orden rechazada | **+2** de retraso |
| Franja cerrada sin despachar | **+2** de retraso |
| Convoy que se queda en la vía al amanecer | **+3** de retraso |
| Conformidad al abrir cada franja | +1 |
| Conformidad por puesto rendido | +1 (una vez por puesto y franja) |
| Margen por instrumento | +1, **+2 en tu oficio** |
| Consultar el archivo | −2 de margen |
| Recuperar un minuto | −3 de margen, −1 de retraso |
| Tope de retraso | 10 con seis personas, hasta **13** |

Ver §4.4: los dos primeros números salen de una cuenta, no del gusto.

---

## 4. El rompecabezas del cuadro: la pieza técnica seria

### 4.1 Los ocho tipos de telegrama

| Tipo | Dice | Fuerza |
|---|---|---|
| `no-franja` | «X no puede ocupar la franja de las HH:MM» | La más débil |
| `paridad` | «X solo cruza con el paso a nivel abierto / cerrado» | Parte los seis en dos grupos de tres |
| `no-seguidos` | «X e Y no pueden salir en franjas seguidas» | Débil |
| `bloque` | «X e Y salen los dos antes del relevo o los dos después» | Débil |
| `antes` | «X ha de haber salido antes que Y» | Media |
| `separados` | «Entre X e Y median al menos N franjas» | Media |
| `entre` | «Y sale entre X y Z» | Fuerte |
| `seguidos` | «X e Y salen en franjas seguidas» | La más fuerte |

**Ocho tipos y no tres**, porque el conjunto tiene que cumplir dos cosas que tiran en
direcciones contrarias: determinar un solo cuadro y ser lo bastante **grande** para
repartirlo entre doce personas. Con solo condiciones fuertes el conjunto mínimo baja a
cinco y media mesa se queda sin papel; con solo débiles sube a quince pero el juego se
convierte en tachar casillas.

El generador elige la mezcla **según cuánta gente juegue**: mesas grandes, telegramas más
flojos y más numerosos; mesas pequeñas, más variedad. Es lo que hace que el mismo juego se
lea distinto con cinco personas y con once.

### 4.2 Las cuatro garantías

Un cuadro entregado a una mesa cumple cuatro cosas, y las cuatro se comprueban
**enumerando los 720 cuadros posibles** antes de entregar nada:

1. **CONSISTENTE.** Al menos un cuadro cumple todos los telegramas.
2. **ÚNICO.** Exactamente uno. Con dos, media mesa defendería un cuadro y la otra media
   otro, los dos correctos, y el enclavamiento rechazaría uno sin poder explicar por qué.
3. **MÍNIMO.** Ningún telegrama sobra: quitar cualquiera deja dos cuadros o más. Es lo que
   garantiza que **todo el papel que hay en la mesa importa**. Un telegrama redundante es
   una persona que lee su tira, la mesa asiente y no cambia nada — la peor sensación
   posible en un juego cooperativo.
4. **REPARTIDO.** Los telegramas de una sola persona admiten dos cuadros o más: **nadie
   puede resolverlo en solitario**.

Y una quinta que no estaba en El Paso de las Sombras: **todo el mundo con papel**. Con más
personas que telegramas se reparten **copias de servicio** —el telegrafista sacaba copia
para quien la necesitara— antes que dejar a alguien con las manos vacías.

**Por enumeración completa y a propósito.** Un solucionador con propagación de
restricciones sería más rápido y sería la clase de código donde un fallo sutil devuelve
«una sola solución» cuando hay dos. Esa mentira no la ve nadie hasta que hay doce personas
discutiendo dos cuadros igual de válidos.

### 4.3 Cómo se llega a un conjunto grande y mínimo a la vez

Suenan a contradicción y no lo son:

1. Se elige un cuadro al azar (con semilla).
2. Se van añadiendo telegramas **ciertos**, descartando los que no recortan nada, hasta
   que solo queda un cuadro vivo.
3. Se **minimiza**: se prueba a quitar cada uno y se quita si el cuadro sigue siendo
   único. Se repite hasta el punto fijo, porque quitar uno puede hacer que otro deje de
   ser imprescindible.

Cuál sea el tamaño del mínimo depende de **qué telegramas se probaron primero**: empezando
por los fuertes se llega a seis; empezando por los flojos, a quince. Así que el orden de
prueba lleva un **sesgo que sube con los intentos**: los primeros van casi al azar
—conjuntos pequeños y variados, buenos para una mesa de cinco— y si el resultado se queda
corto para la gente que hay, el intento siguiente prefiere un poco más los flojos.

Medido sobre 360 cuadros: mínimo 6 telegramas, mediana 8, máximo 16, con 9 intentos de
media. **360 de 360 cumplen las cuatro garantías.**

### 4.4 Por qué una orden rechazada cuesta dos y no uno

Adivinar el primer convoy a ciegas cuesta de media 2,5 intentos fallidos; el segundo, 2; y
así hasta el último, que sale solo. **7,5 órdenes rechazadas de media**, 15 en el peor
caso.

Con el coste a uno, adivinar la noche entera sale por 7,5 y el tope anda por 10 o 13: **una
mesa que no dedujera nada ganaría**, y las tiras de telegrama —o sea, el juego— pasarían a
ser decoración. Con el coste a dos, adivinar sale por 15 de media y pierde; deducir con
tres o cuatro fallos sigue ganando de sobra.

Esa cuenta está escrita como comprobación en `verify:cuadro-nudo`, no como comentario:
**si alguien cambia uno de los dos números, la batería se pone roja.** La primera versión
salía roja para las mesas de dieciséis, y es lo que hizo subir el coste a dos y bajar el
techo del tope de 16 a 13.

### 4.5 La regla que sostiene la noche

`cursar-orden` acepta el convoy que el cuadro pone en la posición `despachados`, y ninguno
más. De ahí salen tres propiedades que no son evidentes:

- **La noche siempre se puede terminar.** Una franja perdida no bloquea nada: el cuadro se
  corre entero, como se corre un horario de verdad. **No existe un estado del que no se
  pueda salir.**
- **Adivinar es posible y caro.** No está prohibido: está tarifado.
- **Lo que se aprende al fallar es real y no regala nada.** Un rechazo dice «ese no» y nada
  más. Es información honesta que la mesa combina con las tiras, y es la razón por la que
  la partida **converge** en vez de atascarse.

---

## 5. Los cuatro instrumentos

| Instrumento | Qué es | Cómo se garantiza que tiene solución |
|---|---|---|
| **La maniobra** | Ordenar una rama de 4-5 vagones con dos vías muertas (dos pilas) | Se **resuelve por anchura** antes de entregarla; si no hay camino, se tira y se plantea otra |
| **El parte** | Transcribir una palabra en Morse, sacada del vocabulario de la partida | Por construcción: la palabra existe |
| **El enclavamiento** | Dar un itinerario bajando las palancas mínimas, con bloqueos mecánicos | Se **enumeran las 2^N** configuraciones y solo se entrega si el mínimo es **único** |
| **El cargue** | Repartir bultos entre vagones sin pasarse de peso y sin juntar lo incompatible | Se genera **desde una solución**: primero el reparto, después los topes |

**Los plantea y los corrige el servidor**, y hay tres razones que no son intercambiables:

1. **Tienen que ser el mismo** para todo el que se acerque a ese puesto en esa franja. Es
   lo que convierte un puesto en un sitio al que se va —dos personas delante del mismo
   cuadro de palancas discutiendo cuál bajar— en vez de en un solitario.
2. **La app no puntúa.** Manda la respuesta y el servidor la corrige. Si puntuara la app,
   la conformidad la daría el móvil.
3. **Se pueden jugar sin pantalla.** El comprobador de la velada entera resuelve los cuatro
   por HTTP, porque el servidor conoce la solución de todos. Un minijuego que solo supiera
   corregirse dentro del móvil sería un trozo del juego imposible de probar, y son cuatro.

Y una propiedad que hace que se puedan usar sin miedo: **fallar no cuesta nada**. El motor
apunta la acción **después** de que el reductor devuelva, así que basta con lanzar
`AccionInvalida` para que el intento no cuente. Es la misma propiedad que usan las
contraseñas de El Paso de las Sombras.

Medido: **720 planteamientos** (4 instrumentos × 6 franjas × 30 semillas), **720
resueltos**.

---

## 6. El estado, la trama y las acciones

**La trama** (`plot.delJuego`) es lo que se decidió antes de que llegara nadie: el cuadro,
los telegramas, el reparto, los oficios, las cargas y los partes. **El estado**
(`LiveSession.estado.nudo`) es lo que va pasando: el retraso, las conformidades, el
margen de cada cual, las órdenes cursadas y el parte del amanecer.

Las siete acciones:

| Acción | Pide | Notas |
|---|---|---|
| `ocupar-puesto` | `eligeDe` puestos | Dos por franja. Se apoya en `elegirSala` de la plataforma |
| `rendir-instrumento` | `eligeLibre` | La solución viaja como cadena. El motor no la mira |
| `cursar-orden` | `eligeDe` convoyes | Sin tope: el freno es la economía |
| `consultar-archivo` | `eligeDe` convoyes + **`pideNumero`** | El primer uso real de `pideNumero` |
| `recuperar-tiempo` | — | |
| `usar-mana` | — | El límite es por noche, no por ronda: lo lleva el estado |
| `entregar-cuadro` | `eligeDe` × 6 | Es la acusación. Los campos se llaman como los ejes |

**El archivo contesta lo que la mesa habría podido deducir**, no lo que el cuadro dice: se
resuelve contra los telegramas con `cuadrosDe`, no comparando con `trama.cuadro`. Las dos
dan la misma respuesta —el cuadro es único— pero solo una se puede justificar.

---

## 7. Lo que genera la IA, y lo que garantiza el código

**El modelo no toca el rompecabezas.** El cuadro, los telegramas y el reparto los calcula
`cimientosDelNudo` con azar sembrado y comprobación exhaustiva **antes** de que el modelo
escriba una palabra. El modelo pone la prosa: el título, la sinopsis, la ficha de cada
persona, el parte de cada franja y el guion de quien dirige.

No es desconfianza: es que el rompecabezas tiene que cumplir cuatro garantías comprobables
y un modelo no puede garantizar nada. Un cuadro escrito por el modelo tendría dos
soluciones una noche de cada cinco.

Léase al revés: **si la llamada falla, si el JSON viene truncado o si el modelo se inventa
la mitad de los ids, la partida sigue siendo jugable y el cuadro sigue teniendo una sola
solución.** La generación con IA es una capa de mejora sobre algo que ya funciona.

El esquema pide **siete campos de primer nivel**, tres de ellos cadenas sueltas: es el más
pequeño de los cuatro juegos, y se lo puede permitir justamente porque no lleva lógica
dentro. (Hay un techo real: con `output_config.format` la API compila el esquema a una
gramática y si sale grande rechaza la petición entera con un 400. Al esquema de la Momia
le pasó.)

---

## 8. Lo imprimible

Nueve documentos. El más importante no es el dosier: son **las tiras del telégrafo**, que
se recortan y se meten en el sobre de cada cual. El juego se resuelve leyéndolas en voz
alta encima de la mesa.

- `guia-de-la-noche` — lo que quien dirige lleva encima. Es el único que recibe `VistaGm`:
  **a ciegas no lleva el cuadro**.
- `dosier-ferroviario` — uno por persona. Filtra por `opciones.soloPara`.
- `tiras-telegrama` — a **una cara**: a doble cara se leen al trasluz.
- `cuadro-en-blanco` — la cuadrícula de 6×6 para tachar a lápiz. Una por persona.
- `hojas-de-porte` — una por convoy, públicas desde el minuto uno.
- `rotulos-de-puesto` — un cartel por habitación.
- `tabla-de-la-noche` — la contabilidad. **No lleva el cuadro**: la usa quien dirige a
  ciegas.
- `cuadro-verdadero` — el árbitro. Para quien prepara, en los dos modos.
- `informe-del-cuadro` — la demostración de las cuatro garantías, con los números.

**Se puede jugar sin móviles**, y aquí eso cuesta más que en los otros tres: se pierden los
cuatro instrumentos, así que las conformidades pasan a darse por franja en vez de ganarse
y quien dirige arbitra las órdenes con la hoja del cuadro verdadero. Está escrito en la
guía; un paquete que promete lo que no da es peor que uno que avisa.

La imprenta es propia: **papel de estraza, tinta negra de imprenta, violeta de hectógrafo
y roja de tampón**. Son las tres tintas que tenía un impreso de ferrocarril de 1927, y
sirven para lo mismo: negro lo impreso, violeta lo que se rellenó a mano, rojo lo que no
se discute.

---

## 9. Cómo se comprueba

| Comando | Qué demuestra |
|---|---|
| `npm run verify:cuadro-nudo` | 360 cuadros y 720 instrumentos. **45 comprobaciones** |
| `npm run verify:nudo` | Una noche entera por HTTP con servidor de verdad. **92 comprobaciones** |
| `npm run verify:juegos` | Los 30 invariantes del manifiesto y los 9 imprimibles |
| `npm run oro:verificar` | Que ni este juego ni los otros tres cambian de comportamiento |
| `cd app && npm run verify` | Las tablas de módulo y el tema |

La velada entera se juega **sin abrir la app**, y eso no es casualidad: los instrumentos
son deterministas a partir del id de la partida, del puesto y de la franja, así que el
comprobador los plantea con los mismos tres datos, obtiene el mismo problema y manda la
solución por HTTP como la mandaría un móvil.

---

## 10. Trofeos

| Id | Nombre | Cómo se gana |
|---|---|---|
| `paso-a-nivel` | El Correo pasó | El Correo cruzó. Es de todo el turno |
| `noche-sin-retraso` | Noche limpia | Los seis fuera y cero de retraso |
| `cuadro-de-memoria` | El cuadro de memoria | Tu entrega individual, entera y correcta |
| `mano-en-la-palanca` | Mano en la palanca | Cinco instrumentos o más |
| `sin-consultar-archivo` | De cabeza | La noche se sacó y tú no preguntaste al archivo |

Ninguno es de CLUEDO: `ganador`, `sabueso` y `culpable-impune` significan cosas que aquí no
existen. Los ids son largos y propios porque **los ids de trofeo no llevan prefijo de
juego**: dos juegos con el mismo id hacen que el trofeo de uno salga en la vitrina con el
nombre y el glifo del otro.

---

## 11. Lo que este juego ha encontrado y no arregla aquí

Un juego que rompe cinco supuestos a la vez es un instrumento de medida. Esto es lo que
midió.

### 11.1 Arreglado, porque no había forma de jugar sin ello

- **Un juego no podía declarar cuántas rondas tiene.** `numeroDeRondas` deducía la duración
  de la ronda más alta de las **pistas** de la trama, y sin ninguna se quedaba en cuatro.
  Eso es una propiedad de CLUEDO disfrazada de regla general: este juego no entra a ningún
  sitio a encontrar nada, así que su noche de seis franjas enseñaba «Franja 5 de 4» en doce
  móviles, sin un solo error. Ahora se declara en `manifiesto.ronda.cuantas` y se pregunta
  al juego antes que a la trama. Los otros tres no lo declaran y su cuenta no cambia.
- **El dosier del móvil decía «No eres el asesino» a todo el mundo.** El bloque `identidad`
  pintaba siempre un veredicto, y en un juego sin eje que señale a nadie
  `soyElSenalado` es falso para todos. Ahora se pregunta al **manifiesto**
  (`ejeDeJugadores(manifiesto) !== undefined`), no al id del juego: el siguiente juego sin
  culpable no tiene que acordarse de nada.

### 11.2 Encontrado y NO arreglado, con su porqué

- **Los nombres de fase no son libres, aunque el contrato diga que sí.** `LivePhase` es
  `string` y `fases` es un `Record` parcial, pero quedan sitios que comparan por nombre:
  `live/proyeccion.ts` (seis comparaciones, y una de ellas decide si se compone
  `vista.desenlace`), `live/panel.ts`, `live/invitaciones.ts`, `routes/cuenta.ts` y los dos
  botones de `LivePanel.tsx`. Además, `verificar-juegos` exige que toda fase alcanzable
  tenga una ruta POST que la abra, y esas rutas están escritas una por una para los nombres
  de CLUEDO — una fase con nombre nuevo **pasa la comprobación sin comprobarse** y luego da
  404 delante de la mesa. Un juego que se inventara los nombres se estrenaría sin poder
  abrir una ronda **y con la mesa sin ver nunca la solución**. Este juego usa los cinco de
  siempre y les cambia las palabras, que es lo que sí está resuelto.
- **`eligeVarias`, `eligeOpcional` y `eligeLibre` no llegan al móvil.**
  `live/proyeccion.ts` solo aplana `eligeDe` → `campos` y `pideNumero` → `numeros`. Una
  acción declarada con cualquiera de las tres llega como un botón sin campos. Es la razón
  de que la pantalla `puesto` tenga que ser propia: la respuesta de un instrumento viaja
  por `eligeLibre`.
- **`turnos: 'por-turnos'` no lo ejercita nadie.** El motor lo comprueba, pero el guardia
  es `sesion.turnoDe && …` y en todo el repositorio la única escritura de ese campo es
  ponerlo a `undefined`. Un juego por turnos se comporta como uno simultáneo hasta que él
  mismo lo escriba y lo rote. Este juego es simultáneo porque es lo que le conviene, así
  que sigue sin probarse.
- **El papel `pausa` sigue sin usarse.** Es el que separa una velada de una campaña.
  Ningún juego pasa por ahí.
- **`manifiesto.ronda.accionSobre` y `cambiosPermitidos` no los lee nadie.** El límite real
  lo pone `vecesPorTurno`. `cuantas` sí se lee ahora (§11.1), lo que rehabilita a medias el
  campo.
- **El panel genérico de acciones de la app no está tematizado.** `app/src/acciones.tsx`
  usa el `color` estático de CLUEDO. Lo sufre justamente el juego que no ha escrito
  pantalla propia.
- **`EMBLEMAS` y `RETRATOS` del taller dejan a El Paso de las Sombras con la cara de otro
  juego** — una lupa victoriana en el centro de su plano del monte y a Edmund el mayordomo
  en su chat. Este juego rellena las suyas; arreglar las de Sombras es de otra entrega.
- **Quedan tres cadenas de CLUEDO en componentes que se pintan para cualquier juego.**
  Son anteriores a esta entrega y afectan igual a la Momia y a las Sombras, así que no se
  tocan aquí: arreglarlas bien es ampliar `PalabrasDeJuego` y rellenarla en los cuatro,
  que es una decisión de quien mantiene el taller y no un efecto colateral de meter un
  juego. Están localizadas:
  - `AgentChatPanel.tsx:424` — el aviso de red dice «no he podido contactar con **la
    mansión**», y lo lee quien esté hablando con el Jefe de Estación o con el Escriba.
  - `DocumentsPanel.tsx:360` — un dosier de alguien que ya no juega dice «ya no figura
    entre los **sospechosos**».
  - `StylePanel.tsx:154` — el ejemplo del cuadro de estilo termina «…la tensión de que el
    **asesino** no puede bajarse».

  Y una que se comprobó y **no** es un problema: `GenerateOverlay` sí lee
  `manifiesto.ceremonia`, así que los sesenta segundos de la generación hablan de la
  estación y no de la mansión. Las constantes de CLUEDO que hay en ese fichero son el
  respaldo, no lo que se pinta.
- **La imprenta y la paleta siguen sin factorizar.** Cuatro hojas de estilo casi iguales y
  cuatro paletas cuyas claves se llaman `caoba900` y `oro400` en un juego donde no hay ni
  caoba ni oro. Renombrarlas a ranuras de verdad —`fondo`, `masa`, `metal`, `acento`,
  `papel`— toca las cuarenta pantallas de los otros tres, y la regla de esta entrega es no
  moverlos. Es lo mismo que anotaron la Momia y las Sombras, y ya son cuatro.

---

## 12. La regla que manda sobre todas

**No se rompe ninguno de los tres juegos que ya funcionan.** Todo lo que este juego ha
tenido que añadir al contrato común —cinco secciones de dosier, cinco trofeos, dos iconos,
dos pantallas, dos bloques y un campo de ronda— es **aditivo**, y el maestro de oro lo
comprueba byte a byte: CLUEDO, la Momia y las Sombras contrastan 76, 59 y 58 piezas y se
comportan exactamente igual que antes.

Las dos únicas cosas que cambian comportamiento en la plataforma —cómo se cuentan las
rondas y cuándo se pinta el veredicto del dosier— **están escritas para no cambiar nada en
los tres primeros**: los tres se saltan la rama nueva porque no declaran `ronda.cuantas` y
porque los tres sí tienen un eje que señala a alguien.
