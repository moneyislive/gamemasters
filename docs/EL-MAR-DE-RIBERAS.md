# El mar de Riberas

> Si algo de aquí no coincide con el código, gana el código. Este documento recoge
> las decisiones y su porqué. Se escribió el 5 de septiembre de 2026, después de que
> Miguel pidiera «animaciones del mar en la costa» y «olas a cierta distancia con
> altura variable», y con la condición que él mismo puso: **no hay recursos 3D**.

## 0. Qué hay hoy, y por qué el mar no se lee como mar

El mar del delta es **un disco plano y quieto**: `circleGeometry(alcance · 6, 84)` a
la cota de la lámina, con el material del agua del pack —una celda del atlas— clonado
para que su color sea exactamente el de las teselas de agua del tablero
(`delta.tsx`, componente `Mar`). Esa decisión fue buena y se mantiene: el río llega
al mar y no cambia de color.

Lo que le falta no es oleaje en mar abierto: es **lo que pasa donde el agua toca la
tierra**. Sin eso, el delta parece recortado con tijera sobre una lámina azul.

Y hay un precedente que resuelve la mitad del problema: **el mar del Muelle ya es un
sombreador escrito a mano** (`escenas/embarcadero/agua.ts`), con su
`ShaderMaterial`, sus uniforms tipados, la niebla de three incluida y el tiempo
movido desde `useFrame`. No hace falta arte: hace falta la misma técnica aplicada a
la otra agua.

## 1. Las decisiones que no se pueden deshacer después

1. **El color del mar no cambia.** Hoy sale del atlas del pack y coincide con el agua
   de los lagos del tablero; ésa fue una decisión medida y escrita (`delta.tsx`, la
   cabecera del `Mar`). El sombreador nuevo ARRANCA de ese color y le suma espuma y
   luz: si al terminar el mar en calma se ve distinto del de antes, está mal.

2. **La distancia a la costa se calcula en la CPU, una vez, y viaja en el vértice.**
   No se calcula en el sombreador. Dos razones, y la segunda es la que manda:
   - El contorno del delta es dentado —diecinueve comarcas hexagonales— y aproximarlo
     con un hexágono grande dejaría la espuma despegada de la costa media comarca.
   - Una cuenta en el sombreador no se puede comprobar sin abrir un navegador y
     mirar; una en TypeScript se ejercita en Node con `verify:escena`, que es como se
     hace todo lo demás en esta casa. **La aritmética fuera, el sombreador tonto.**

   Se calcula al montar el mundo, que es cuando ya se conocen las comarcas, y no
   cambia durante la partida: el delta no se mueve.

   Y NO sirve la que ya hay. `aguas.ts` calcula `dOrilla` —y `relieve.ts` la pasea
   hasta `Subtesela.aOrilla`— pero mide **desde el agua hacia tierra adentro**, que es
   lo contrario de lo que la espuma necesita; es entera, en pasos de celda de casi
   once unidades; y sólo cubre las subteselas del tablero, no el mar de fuera, que es
   donde vive el disco. Además hoy no la lee nadie. Se deja como está.

3. **El disco del mar deja de ser un abanico y pasa a ser anillos.** `circleGeometry`
   pone todos sus vértices en el borde y uno en el centro: no hay dónde interpolar
   una distancia ni dónde levantar una ola. Se sustituye por anillos que crecen
   geométricamente desde la costa hacia fuera —densos donde se mira, sueltos en el
   horizonte—, que es exactamente lo que ya hace `geometriaDelMar` del Muelle.

4. **La lámina NO sube ni baja.** El vaivén sobre la arena se cuenta con la BANDA DE
   ESPUMA que avanza y retrocede, no moviendo la cota del agua. Subir la lámina de
   verdad inundaría teselas donde hay chozas y cambiaría la relación con las teselas
   de agua del pack, que son geometría fija. El efecto que se busca —«el mar se
   mueve»— se consigue igual; el riesgo, no.

5. **Nada de esto puede tapar dónde se construye.** Los vértices y las aristas de la
   costa son sitios de juego. La espuma vive en el AGUA, del contorno hacia fuera, y
   se apaga antes de llegar a donde se pone una choza. Es la misma regla que ya
   gobierna la franja de borde de las comarcas en `poblar.ts`.

6. **La ola no levanta nada mientras haya tablero encima.** El disco pasa POR DEBAJO del
   tablero hasta el centro y vive en `LAMINA`, que es exactamente la cota de la lámina de
   una tesela de agua del pack a nivel cero —decisión buena: así el río llega al mar sin
   escalón—. Pero la distancia a la costa es POSITIVA sobre los ríos y estuarios de
   dentro, porque la inundación los marca como mar, así que una envolvente que sólo mire
   esa distancia levanta el disco por encima de teselas que son geometría fija. Medido
   antes de cerrarlo: asomaba 0,19, y estaba a la cota exacta el resto del tiempo, que es
   donde aparece el parpadeo de profundidad. `SOMBRA_DEL_TABLERO` lo apaga, y
   `verify:escena` cruza los vértices del disco con las subteselas del tablero y exige
   cero espuma y cero subida en los 44.592 que tienen tesela encima.

7. **Las olas rompen por fuera de la flota, y ese número no se escribe dos veces.**
   `marina.ts` publica hasta dónde navega el barco más lejano y `marea.ts` empieza ahí su
   corona. Si alguien acerca los barcos, la espuma se acerca con ellos.

8. **Se paga en píxeles, así que se mide.** El mar cubre la pantalla entera detrás del
   tablero: cada línea del fragmento se ejecuta millones de veces, y los anillos
   cuestan triángulos.

   Y aquí hay una trampa que conviene decir antes de tropezar con ella: **el delta no
   tiene presupuesto declarado**. Los 110.000 triángulos y 70 llamadas de
   `escenas/embarcadero/presupuesto.ts` son del MUELLE, y su comprobador sólo suma las
   piezas del muelle. El disco de 84 triángulos del mar nunca se consideró un coste, y
   por eso nadie lo cuenta. Así que esto trae su propia medida: cuántos triángulos
   añade el mar nuevo, escrito y comprobado, para que el día que alguien suba los
   anillos se vea el precio en vez de descubrirlo en un móvil.

## 2. Lo que hay, después de mirarlo en pantalla

Este apartado se reescribió el mismo día, viendo el mar correr. Lo proyectado eran cuatro
cosas colgadas todas de la distancia a la costa; lo que quedó son dos, y ninguna de las
dos cuelga sólo de ahí.

### 2.1. Las olas: parches sueltos en una corona, y por qué no son anillos

Es lo único que se ve, y costó tres versiones:

- **La primera** dibujó la espuma con un seno sobre la distancia a la costa, que es lo
  que se hace normalmente. Salieron **anillos concéntricos, como las ondas de un
  estanque**. Y el fallo no era de afinado sino de qué variable se estaba usando: el
  campo de distancias de un delta casi redondo tiene curvas de nivel casi circulares, así
  que cualquier cosa dibujada sobre él sale en anillos por mucho que se le tuerza la fase.
- **La segunda** llevó la espuma a coordenadas de mundo. Se acabaron los anillos, pero
  entonces **las olas iban todas en la misma dirección** —un tren de fondo tiene una
  sola— y, con el umbral fijo, las manchas medían todas lo mismo: veinticinco manchas de
  las cuales veintitrés de cincuenta y dos unidades. Rayas puestas con regla.
- **La tercera**, que es la que está, junta las dos. La cresta SÍ cuelga de la distancia
  a la costa —por eso las olas son paralelas a la orilla y avanzan hacia ella, que es
  como rompe el mar de verdad— y lo que impide que sean anillos son tres cosas a la vez:
  el paso varía entre 36 y 75 unidades según el punto, la línea va torcida por dos senos
  del mundo, y un **campo de parches** la recorta en tramos.

Ese campo (`CAMPO_DE_LAS_OLAS`) son tres senos cruzados de 55, 29 y 18 unidades cortados
por un umbral que **otro tren, mucho más largo, sube y baja**: donde el mar está picado
el corte baja y pasa una ola ancha, y donde está liso sólo asoman las cimas y quedan
motas sueltas. De ahí sale la variedad de tamaño, y se mide en Node sobre la misma tabla
de la que se escribe el GLSL: **de 3 a 22 unidades de diámetro, mediana 13**, unas 270
manchas. Con umbral fijo eran todas iguales; con éste, no.

Y no rompen por todo el mar sino en una **corona anclada a los barcos**: empieza justo
donde acaba de navegar el más lejano —59 unidades; el número sale de `marina.ts`, no de
aquí—, rompe entera a 100 y se ha ido a 248. Entre los barcos y la playa no hay espuma
porque ahí no se lee como oleaje sino como suciedad en el agua; en el horizonte tampoco,
porque los anillos del disco pasan a medir más que la propia mota y la espuma parpadea de
un fotograma a otro.

### 2.2. La altura: dos escalas, cada una donde su malla llega

La ola levanta el vértice de verdad, y la amplitud la modula el tren LARGO del mismo
campo, no las motas. La razón es de muestreo y no de gusto: los anillos del disco van a
un radio de tesela en el aro de la costa, o sea tres vértices por longitud de onda de una
mota, justo en el límite de Nyquist, y por fuera del aro crecen un 18 % por vuelta y ya no
llegan. Colgar la altura de ahí da un mar que tiembla. El fragmento sí puede con el
detalle, porque resuelve por píxel. **Una tabla, dos lectores, cada uno con la escala que
aguanta.**

Y la amplitud vale cero mientras haya tablero encima, por la decisión 6 del §1.

### 2.3. La orilla que se moja: escrita, APAGADA y comentada

Se hizo —una banda de espuma pegada al contorno cuyo ancho respira con un vaivén más
lento que el rizo— y **no vale**: en pantalla salen manchas y arañazos blancos pegados a
la tierra. Está comentada línea a línea en `marea.ts`, no borrada, con las dos sospechas
escritas para quien la retome:

1. **La distancia viaja interpolada entre vértices.** En el aro de la costa los anillos
   van a un radio de tesela y los sectores a seis: una banda de seis unidades de ancho se
   dibuja con un vértice de margen, así que donde el contorno hace un diente la banda se
   corta o se ensancha de golpe. Las olas de §2.1 no lo sufren porque miden decenas de
   unidades; la orilla sí.
2. **El signo dentro de las bocas de río.** El contorno sube por los estuarios, así que
   la banda se pinta a los dos lados de un cauce de una tesela de ancho, y eso se lee como
   una mancha y no como una orilla.

El contrato que protegía —que la espuma no pase de `ESPUMA_TIERRA_ADENTRO` hacia tierra—
sigue en pie y sigue comprobado.

## 3. Dónde vive cada cosa

| Fichero | Qué |
|---|---|
| `escenas/costa.ts` (NUEVO) | La aritmética: la distancia de un punto al contorno del delta, y la geometría del disco de anillos con esa distancia por vértice. Sin `three` en la parte medible; comprobado en `verify:escena`. |
| `escenas/marea.ts` (NUEVO) | El `ShaderMaterial`: uniforms tipados, GLSL, y el color de partida tomado del material del pack. Sigue la forma de `escenas/embarcadero/agua.ts`. |
| `escenas/delta.tsx` | El componente `Mar` pasa a montar lo anterior y a mover el tiempo en `useFrame`. |

## 4. Lo que NO entra, a sabiendas

- **Espuma en los ríos y lagos de dentro del tablero.** Son teselas del pack con su
  propio material; tocarlas es otro trabajo.
- **Reflejos del cielo o de las piezas.** Cuestan una segunda pasada.
- **Sonido.**
- **Mover la lámina de agua**, por la decisión 4 del §1.
