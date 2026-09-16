# La Plaza: el lobby en tres dimensiones de El Burgo

> Si algo de aquí no coincide con el código, gana el código. Este documento recoge las
> decisiones y su porqué, para que quien construya o revise no tenga que redescubrirlas.
> Se escribió el 16 de septiembre de 2026 sobre la rama `burgo`, construyendo la escena
> hermana que `docs/burgo/DISENO-2.md` §7 dejó apuntada como fase opcional.

## 0. Qué es y por qué no es el Muelle

El Muelle (`docs/EL-MUELLE.md`) es el lobby de Riberas: una cala a la hora azul con seis
amarres, barcos y un mar con sombreador propio. El Burgo lo ha estado usando prestado, con
otros colores y tres frases cambiadas, y eso se notaba: **una ciudad moderna no empieza en
un embarcadero medieval**. La Plaza es la escena hermana que cumple el MISMO contrato
(`escenas/embarcadero/tipos.ts`, `PropsDelEmbarcadero`) y enseña lo que el juego promete:
una plaza de la ciudad del tablero, con su calle, sus fachadas, sus terrazas y su
monumento, a última hora de la tarde.

**Lo que se comparte, y no es poco:** el contrato y sus avisos, la máquina de gestos
(`embarcadero/gestos.ts`), la proyección y la respiración de cámara (`embarcadero/camara.ts`),
la carga y el fundido (`cargar.ts`), el tinte (`tinte.ts`, `burgo/tinte-del-burgo.ts`), las
partículas, la marioneta (`aventureros/marioneta.ts`) y la semilla de la mesa
(`shared/mecanicas/semilla.ts`). **Lo que no:** el paisaje. Por eso son dos ficheros y no
un `if` dentro de uno.

**Las piezas salen de `burgo.glb`**, el mismo fichero del tablero, por la misma caché
(`burgo/catalogo-del-burgo.ts`): cuando se zarpa, el tablero se encuentra el catálogo
hecho y no vuelve a bajar 2,8 MB en el peor momento posible.

## 1. La medida: siete por siete celdas de doce

La ciudad del tablero se traza sobre una retícula de doce (`RETICULA_DE_LA_CIUDAD`, que
sale de las losas de 2 × 2 del City Builder a escala del mundo). La plaza usa **esa**
retícula:

| | |
|---|---|
| Plaza entera | 7 × 7 celdas = **84 × 84** |
| Anillo de calle | las 24 celdas del borde, con esquinas curvas y un paso de cebra en el centro de cada lado |
| Plaza de solera | las 5 × 5 de dentro = 60 × 60 |
| Fachadas | una celda MÁS ALLÁ de la calle: la fila del fondo entera (9) y cinco por cada costado |
| Cota de la acera | 0,6 (`ALTURA_DEL_BORDILLO`); el asfalto, 0,42 |

**La cota de 0,6 es la trampa de la casa.** Una `solera` puesta a y = 0 tiene su cara de
arriba a 0,6: ahí se plantan los aventureros, las mesas, las sillas y los árboles. Un
`cuerpo-*` puesto a 0 NO flota: su geometría empieza en 0,6 porque trae dentro el grueso
de su acera. Un coche se posa a 0,786 porque sus ruedas bajan 0,366 del origen.
`verify:plaza` mide las cuatro cosas contra las cajas del `.glb` de verdad, y tiene su
vacuna: un `cuerpo-a` puesto sobre la acera flota exactamente 0,6 y se pone rojo.

**La escala ya va horneada.** `burgo.glb` sale del compilador a escala del mundo, así que
la plaza lo instancia a 1: `matrizDeLaPlaza` es traslación, giro en Y y talla, y nada más.
Usar `matrizDePuesta` del Muelle (que multiplica por 5,469, el factor del pack hexagonal)
daría una plaza seis veces mayor sin un solo error en ninguna consola, y por eso el
barrido de `verify:plaza` prohíbe ese nombre —y `ESCALA_DEL_PACK`— en toda la carpeta.

## 2. Los seis puestos: un arco delante del monumento

El encargo pedía «seis puestos en arco **abierto hacia la cámara**». Un arco cóncavo hacia
la cámara —el que uno dibuja primero, con las puntas viniendo hacia quien mira— **no cabe
en un teléfono**, y eso no es una opinión:

> En 9:19,5 con 68° de campo vertical, el cono HORIZONTAL de la cámara es de ±15°. A la
> distancia a la que está el local eso son unas cuatro unidades de ancho útil: las puntas
> de ese arco, que son lo más cercano, se salen de cuadro. El sitio ancho está al fondo.

Así que el arco se abre al revés y **abraza el monumento por delante**: el local en la
punta, más cerca de la cámara que nadie, y los otros cinco alternando lados y retrocediendo.
Lo que el encargo compraba se cumple entero y se comprueba: nadie detrás del monumento,
nadie tapado por él, nadie tapado por otro.

| Puesto | Sitio | Lado |
|---|---|---|
| 0 (local) | (0, 22,5) | eje, delante de todos |
| 1 | (−3,5, 12) | izquierda |
| 2 | (6,5, 6,5) | derecha |
| 3 | (−7,5, 6) | izquierda |
| 4 | (4,5, 0) | derecha |
| 5 | (11, −1) | derecha |

**Alternan lados a propósito**: el orden de los puestos es el orden de llegada, y con dos
sentados la plaza no se ve torcida. Los sitios salieron de una búsqueda numérica (recocido
simulado y después descenso por coordenadas sobre números redondos) contra las mismas
condiciones que `verify:plaza` exige.

**Cada puesto** tiene su banco, su farola y su estandarte del color del asiento, y los tres
van **detrás** del aventurero, abriéndose 28°. No es decoración: puestos a los lados, quien
llegaba por la derecha atravesaba su propio estandarte (el camino le pasaba a 0,4) y la
farola quedaba entre la cara del aventurero y la cámara. Detrás queda libre el semiplano
que da a la cámara —por donde se mira y por donde se sale corriendo— y el pasillo por el
que se llega. La rama que se lleva el estandarte es la más lejana del camino de entrada,
porque el estandarte tiene peana (1,35 de radio al andar) y la farola es un poste de un
palmo por el que se pasa al lado.

**Un puesto vacío se lee apagado**: sin estandarte (asta a cero) y con la farola casi
negra. Uno ocupado se enciende; uno ausente baja el estandarte a media asta y su dueño se
gira hacia el monumento. Es el raíl de aforo hecho paisaje, como los amarres del Muelle.

**El monumento**: un pedestal de dos cuerpos (7 × 1,2 y 4,6 × 3,2, girado 45°) con la
`figura` del pack —el meeple de Board Game Bits— a talla 2,4 y teñida de bronce. Doce
unidades de alto en total, casi cinco personas. Es la pieza que da punto focal al fondo del
arco, y es un guiño: la ciudad del juego de mesa tiene en su plaza la estatua de una ficha.

## 3. La cámara

Una sola cámara viva, gobernada por `escenas/plaza/camara-de-la-plaza.ts` (aritmética pura
y comprobable) y aplicada con `useFrame`. Toda pose es un OBJETIVO al que se llega por
interpolación amortiguada; nunca se asigna en seco salvo el primer fotograma.

- **Retrato**: a 13 del local, ojo a 4 sobre la acera, 22° de inclinación, 68° de campo.
  El campo es ancho porque el cono horizontal de un móvil es el campo vertical por la
  relación de aspecto: con los 50° del Muelle, los seis no caben separados.
- **Panorámica**: a 14, apartada 1,5 a la derecha, ojo a 7,5, girada 5°, 16° de inclinación
  y 34° de campo. El local cae en el **tercio izquierdo**, que es donde tiene que estar en
  el PC: el raíl del HUD son 22 rem de vidrio a la derecha. Estuvo a 10 con el ojo a 6 y
  21° de inclinación, y en el banco se vio que eso era una plaza SIN CIELO —con 21° y 32°
  de campo el horizonte queda por encima del borde de arriba— y con el local y su
  estandarte comiéndose el cuadro. Bajar la inclinación devolvió el cielo; retirarse a 14
  devolvió la plaza.
- Las dos se mezclan por relación de aspecto, para que girar una tableta no dé un salto.
- **La cámara retrocede según el puesto ocupado MÁS ALTO**, 1,5 por puesto, y no según
  cuántos hay. Es la diferencia que importa: si el 5 está ocupado y los demás se han
  levantado, el encuadre tiene que seguir cabiendo. Con un solo aventurero la cámara está
  encima de él; con los seis, abierta a toda la plaza.
- **La hoja del HUD manda**: `franjaInferior` baja el objetivo por bisección hasta que los
  pies del local quedan en su límite (el 22 % del alto útil, `limiteDeLosPies` del Muelle).
- **Respiración**: la del Muelle (órbita ±3° con periodo 23 s, altura y travelling), que es
  lo que separa una cámara viva de una cámara en bucle.
- **Arrastre**: ±22° con el dedo, ±2° con el ratón, con muelle al soltar.
- **Al llegar alguien**: la cámara gira 6° hacia su sitio y vuelve, durante 1,6 s. En el
  Muelle eran 0,8; aquí quien llega ANDA, y en ocho décimas no se le ve entrar.
- **Al zarpar**: grúa con `easeInOutQuart` hasta (0, 84, 58) mirando a (0, 0,6, −1): son
  54,7° de altura y el campo de `camara-del-burgo.ts`, o sea **la pose con la que abre el
  tablero**. A los 3,2 s, `alZarpar`.

### Lo que esto cuesta, dicho sin adornos

Con los **seis sentados**, el aventurero local mide el **21 % del alto de la pantalla** en
retrato, no el 65 % que mide en el Muelle. Es el precio de tener a seis personas separadas
el 6 % del ancho dentro de un cono de ±15°, y la alternativa medida era gente tapándose. Con
uno o dos sentados la cámara está mucho más cerca y el local se ve grande, que es cuando
importa.

## 4. Las coreografías

La máquina de estados es la del Muelle, sin copiarla: las mismas fases, los mismos sucesos,
los mismos tiempos. Lo que cambia es el paisaje, y el paisaje sólo toca dos fases
(`escenas/plaza/gestos-de-la-plaza.ts`):

- **Llegar es andar.** En vez de 2,6 s de barco, un `salto` y un paso, son los mismos 4,83 s
  (`LLEGADA.total`) de `andar` en bucle por un camino que sale de una boca de calle —el
  borde interior de un paso de cebra— y acaba en su sitio. El clip se acelera o se frena
  para que los pies no patinen: `ritmo = largo / (4,83 s × 4 u/s)`, y `verify:plaza` exige
  que los seis caminos caigan entre 0,8 y 1,5 (el mismo tope que `peon.ts`).
- **Zarpar es salir corriendo.** `saludar` escalonado por puesto (0,15 s cada uno) y
  `correr` hasta que acaba el zarpe, hacia la calle del lado de la cámara; en `zarpado` se
  sigue corriendo, porque lo que sale de cuadro no se para a mitad de zancada, y al llegar
  al final de su camino deja de pintarse.
- **Los caminos de salida no se escriben: se buscan.** La primera versión abría las seis
  carreras en abanico y el comprobador la tiró con dos números: una pasaba a 1,57 del PIE de
  otro puesto (o sea, por encima de una persona) y otra se llevaba por delante un semáforo
  con veintiún centímetros de paso negativo. Ahora, para cada puesto se prueban treinta y
  siete puntos de la calle y se mide el claro más estrecho que deja cada recta contra todo
  lo fijo —la gente, sus bancos, sus farolas, sus estandartes y el mobiliario de la calle—;
  se queda el que más claro deja y, entre los que dejan bastante, el que menos desvía de la
  carrera natural. Un abanico escrito a ojo no puede saber dónde están los muebles.
- **Ausente** es girarse hacia el monumento y bajar el estandarte. **Vestirse** es el
  `lanzar` cortado, el humo y `aparecer` con la figura nueva, como en el Muelle.
- **Nunca T-pose**: `clipDeLaPlaza` no la pide por construcción, y `verify:plaza` recorre
  diez mil pasos sembrados con sucesos al azar para comprobarlo —con su vacuna: un juez de
  clips que devuelva `t-pose` en una fase tiene que salir rojo.

## 5. La hora: una tarde que corre hacia el mediodía

El Muelle espera a la hora azul porque su tablero amanece. **El Burgo se juega a mediodía**
(`Burgo.tsx`: cénit `#6fa9dc`, horizonte `#e9e0c8`, niebla `#d6dfe4`), y una ciudad a la
hora azul sería una calle apagada. Así que la plaza espera a última hora de la tarde —cielo
limpio, sol bajo y cálido que dora las fachadas y las caras— y el zarpe no es un amanecer:
es el reloj corriendo hacia el mediodía del tablero mientras la cámara sube.

- El sol está a unos 28° y **detrás de la cámara, un poco a su izquierda**: con el sol
  delante, la plaza entera quedaría a contraluz y los aventureros en silueta, que es justo
  lo que el Muelle tuvo que arreglar sobre la marcha. Estuvo a 15° —que es lo que uno
  escribe para decir «última hora de la tarde»— y en el banco la plaza salía marrón oscura:
  una direccional a 15° llega al SUELO con el coseno de 75°, o sea el 27 % de su
  intensidad. A 28° el suelo recibe casi la mitad y las fachadas siguen doradas de lado.
- La **luz de cara** va con la cámara (apartada 28°, para modelar en vez de aplanar) y se
  apaga al llegar el mediodía, porque el tablero no la tiene.
- El cielo es una cúpula con sombreador propio (`cielo-de-la-plaza.ts`): un `uniform` mueve
  cénit, horizonte, halo del sol y niebla de la tarde al mediodía. `verify:plaza` lee los
  tres colores del FUENTE de `Burgo.tsx` con una expresión regular y exige que el final del
  zarpe sea exactamente ese mediodía: el día que el tablero cambie de cielo, esto se pone
  rojo en vez de dejar un corte de color al cambiar de pantalla.

## 6. El presupuesto, medido

Tope: **110.000 triángulos y 70 llamadas** con seis sentados en calidad plena, los mismos
que el Muelle (no los del tablero: esto es un lobby que abre en un móvil). Medido con los
triángulos del `.glb` real —cargado con el `GLTFLoader` de three en Node— y con **seis
aventureros de la figura más pesada** (la exploradora, 8.900 triángulos), no con la media:

| | |
|---|---|
| La plaza más pesada de las nueve semillas probadas | **94.212 triángulos** |
| De ellos, aventureros | 53.400 (el 57 %) |
| De ellos, en UNA malla fundida | 37.332 |
| Llamadas de dibujo prometidas | **24** de 70 |
| Y medidas en el banco, con seis sentados | **19** (82.192 triángulos en esa pose, a 57 fotogramas) |

Las llamadas se gastan así: la cúpula (1), todo lo fijo fundido (1), los seis estandartes
instanciados con color por instancia (1), las seis bombillas (1), sus halos (1), las motas
(1, sólo en plena) y, por aventurero, su malla con piel, su disco de contacto y su humo
(3 × 6). **La calidad sobria** quita lo menudo —sillas, arbustos, papeleras, farolas de
parque— y las motas; no cambia el sorteo, así que dos aparatos de la misma mesa con
calidades distintas ven la misma plaza.

Lo estático se funde con `aplana` + `fundir` y la matriz de la plaza, como el tablero funde
su mundo. Lo teñido va aparte: el estandarte se prepara «a gris» (cada vértice guarda su
luminancia relativa al azul de las fichas, `AZUL_DE_LAS_FICHAS`) y el color del asiento
entra por `instanceColor`, que lo multiplica. Las fachadas no se tiñen —su color va
horneado— sino que se **matizan**: se multiplica su color por un factor cercano a uno sacado
de `tonoDeLaFachada` de la ciudad, para que dos casas del mismo modelo no salgan idénticas.

## 7. Lo sembrado y lo fijo

**Fijo** —y por tanto comprobable contra la cámara una sola vez—: los seis puestos, el
monumento, la calle, las aceras, el mobiliario de la calle y los caminos. **Sembrado** con
el código de la mesa: qué cuerpo y qué matiz tiene cada fachada, dónde caen las dos o tres
terrazas y con cuántas sillas, el arbolado, los bancos de parque y los dos a cuatro coches
aparcados. Dos mesas se distinguen a primera vista y los seis aparatos ven la misma plaza.
Sin código —en la orilla, eligiendo figura— se usa una semilla fija.

El atrezo se siembra sobre una corona de anclas pegadas al borde y **se rechaza lo que no
cabe**: nada puede quedar a menos de 3,4 de un puesto ni a menos de 1,8 de un camino, y las
huellas con las que se mide están declaradas en `la-plaza.ts` y contrastadas contra las cajas
del `.glb` por el comprobador (declarar una huella corta sería sembrar un árbol dentro de
un pasillo sin que nada protestara).

## 8. Cómo se comprueba

`npm run verify:plaza -w escenas` — **108 comprobaciones** en Node, sin abrir un contexto de
dibujo, con su guardia de «no se han hecho todas» y una vacuna por regla:

1. Barrido de la carpeta: nada de `drei`, `document`, `window`, `fetch`, Expo,
   `matrizDePuesta` ni `ESCALA_DEL_PACK`; los cinco ficheros puros no importan `three`; los
   dos de geometría no importan React. Con su fuente envenenado que enciende los siete.
2. Determinismo por semilla y diferencia entre códigos; los puestos no dependen de la semilla.
3. Toda pieza existe en `PIEZA` y en el `.glb`, cabe en el recinto y **apoya en su suelo**
   (vacunas: pieza inventada, cuerpo que flota 0,6, pieza fuera del recinto).
4. Nada deja menos de 0,6 de paso en un pasillo de entrada o de salida, y ningún pasillo
   pasa a menos de 2,2 del pie de otro (vacuna: un pino en mitad del camino).
5. Los seis caminos salen de una boca de calle, acaban en su sitio y se andan entre 0,8 y
   1,5 de ritmo (vacunas: un camino de 60 y otro de 3 unidades).
6. El arco: nadie detrás del monumento, nadie sobre el pedestal, el local en el eje y el más
   cercano, gente a los dos lados, y el monumento sin cruzarse en ninguna línea de mirada.
7. **La cámara**, en 9:19,5 (hoja 0,36), 3:4 (0,3) y 16:9 (0) × los seis aforos, y con la
   cámara RESPIRANDO en setenta instantes por encuadre: cada aventurero entero en cuadro y
   encima de la hoja, separación ≥ 0,12 en reposo y ≥ 0,09 respirando, y nadie tapando a
   nadie más del 5 %. Medido: **0,14 / 0,12 / 0 % de tapado**. Vacunas: un puesto movido al
   eje, otro llevado a la calle y otro puesto justo detrás de otro.
8. La grúa acaba a 55° con el campo del tablero, y el cielo en su mediodía exacto leído del
   fuente de `Burgo.tsx` (vacuna: la regex no encuentra un color que no existe).
9. Diez mil pasos de gestos sin `t-pose` ni clips que no estén en `animaciones.glb`
   (vacuna: un juez que devuelve `t-pose`).
10. **Lupa cenital** sobre los bultos propios: una rejilla de rayos verticales que exige que
    cada uno tenga techo y que ese techo mire ARRIBA. Es lo que salió de perder los tejados
    de la ciudad entera con 277 comprobaciones en verde. Vacunas: la caja sin tapa y las
    normales del revés.
11. Los giros propios coinciden con `giroMirandoA` y `cuartosDelBrazoHacia` de la ciudad en
    los cuatro rumbos rectos, y las huellas declaradas cubren las cajas del fichero.
12. El presupuesto, con la peor de nueve semillas (vacunas: seis figuras de veinte mil
    triángulos, y una pieza que el fichero no trae).

**Lo que esto NO prueba**, y hay que decirlo: que se VEA bien, cuántas llamadas de dibujo
salen de verdad, y lo que pasa dentro de un `useFrame` —Node no lo mide—. Para eso está el
banco **`escritorio/plaza3d.html`** (`?jugadores=1..6&codigo=ABCDE&aspecto=retrato`), con
la mesa simulada, los botones de llegada, ausencia, vestirse y zarpar, los tres marcos con
su hoja del HUD pintada encima, y el contador de triángulos, llamadas y milisegundos que
`alMedir` entrega.

## 9. Lo que falta, a sabiendas

- **La integración no la hace esta escena**: el campo `escena` en `TemaDelMuelle`, el
  `switch` de `app/src/arcade/muelle-escena.tsx` y `escritorio/src/muelle.tsx`, lo que
  cambie en `verificar-escritorio.tsx` y la entrada de `verify:plaza` en
  `scripts/verificar-todo.mjs` quedan fuera de esta carpeta a propósito.
- **Nadie la ha visto en un móvil de verdad.** El presupuesto está medido y la calidad
  sobria existe, pero el veredicto de `juzgarCalidad` sobre esta escena no se ha observado
  en un aparato.
- **Las llamadas de dibujo son una promesa hasta que el banco las cuenta**: la cuenta de
  `presupuesto-de-la-plaza.ts` dice 24; `gl.info.render.calls` es quien manda.
- Sin sombras proyectadas (ningún cliente las activa), sin sonido, sin coches circulando y
  sin gente de paso que no sea de la mesa.
