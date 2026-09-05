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

   Y NO sirve la que ya hay. `aguas.ts` calcula `dOrilla` —y `relieve.ts` la pasea
   hasta `Subtesela.aOrilla`— pero mide **desde el agua hacia tierra adentro**, que es
   lo contrario de lo que la espuma necesita; es entera, en pasos de celda de casi once
   unidades; y sólo cubre las subteselas del tablero, no el mar de fuera, que es donde
   vive el disco. Además hoy no la lee nadie. Se deja como está.
   No se calcula en el sombreador. Dos razones, y la segunda es la que manda:
   - El contorno del delta es dentado —diecinueve comarcas hexagonales— y aproximarlo
     con un hexágono grande dejaría la espuma despegada de la costa media comarca.
   - Una cuenta en el sombreador no se puede comprobar sin abrir un navegador y
     mirar; una en TypeScript se ejercita en Node con `verify:escena`, que es como se
     hace todo lo demás en esta casa. **La aritmética fuera, el sombreador tonto.**

   Se calcula al montar el mundo, que es cuando ya se conocen las comarcas, y no
   cambia durante la partida: el delta no se mueve.

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

6. **Se paga en píxeles, así que se mide.** El mar cubre la pantalla entera detrás del
   tablero: cada línea del fragmento se ejecuta millones de veces, y los anillos
   cuestan triángulos.

   Y aquí hay una trampa que conviene decir antes de tropezar con ella: **el delta no
   tiene presupuesto declarado**. Los 110.000 triángulos y 70 llamadas de
   `escenas/embarcadero/presupuesto.ts` son del MUELLE, y su comprobador sólo suma las
   piezas del muelle. El disco de 84 triángulos del mar nunca se consideró un coste, y
   por eso nadie lo cuenta. Así que esto trae su propia medida: cuántos triángulos
   añade el mar nuevo, escrito y comprobado, para que el día que alguien suba los
   anillos se vea el precio en vez de descubrirlo en un móvil.

## 2. Las cuatro cosas, y en qué orden importan

Todas salen de UN número por vértice: **la distancia a la costa**, en unidades de
mundo, negativa dentro de tierra y positiva en el agua.

1. **La orilla que se moja y se seca.** Una banda estrecha de espuma pegada al
   contorno, cuyo ancho respira con el tiempo. Es lo que más devuelve por lo que
   cuesta: sin ella, el corte entre tierra y agua es una línea de tijera.

2. **La rompiente.** Dos o tres líneas de espuma paralelas a la costa que nacen mar
   adentro, avanzan hacia ella y se deshacen al llegar. Es la misma banda de arriba
   desplazada en el tiempo, así que sale casi gratis.

3. **Las olas con cresta, a cierta distancia y de altura variable.** Lo que pidió
   Miguel. Levantan el vértice de verdad —no es un dibujo— con la altura modulada
   por dos cosas: la distancia a la costa (cero pegadas a tierra, máximo en la franja
   de rompiente, y suave en mar abierto) y un ruido lento que hace que unas sean más
   altas que otras. Sin ese ruido, un oleaje perfecto se lee como una chapa ondulada.

4. **El vaivén sobre la arena.** El avance y retroceso de (1) sobre las teselas de
   playa, con su propio ritmo, más lento que el rizo.

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
