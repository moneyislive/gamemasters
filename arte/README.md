# El material de arte, de dónde sale y cómo se vuelve a hacer

En este directorio no hay casi nada versionado, y es a propósito. Lo que se guarda en
git es el resultado compilado —`escenas/modelos/tablero.glb`— y no las materias primas.
Este fichero es la receta para rehacerlo.

## Qué hay que bajarse

Cuatro packs de [Kay Lousberg](https://kaylousberg.com), todos con licencia **CC0**
(`License.txt` dentro de cada uno). CC0 significa dominio público: se pueden usar en
proyectos personales, educativos y comerciales, sin obligación de citar. Citarle no es
obligatorio y se hace igual, que para eso está el `NOTICE`.

| Descomprimir en | Pack | Dónde |
| --- | --- | --- |
| `arte/kaykit/hexagon/` | KayKit Medieval Hexagon Pack 1.0 **FREE** | [itch.io](https://kaylousberg.itch.io/kaykit-medieval-hexagon) |
| `arte/kaykit/hexagon-extra/` | KayKit Medieval Hexagon Pack 1.0 **EXTRA** | el mismo, comprando el EXTRA |
| `arte/kaykit/adventurers/` | KayKit Adventurers 2.0 FREE | [itch.io](https://kaylousberg.itch.io/kaykit-adventurers) |
| `arte/kaykit/resource-bits/` | KayKit Resource Bits 1.0 FREE | [itch.io](https://kaylousberg.itch.io/resource-bits) |

El EXTRA se paga (unos 10 €) y **hace falta**: de ahí salen los barcos, los muelles, las
teselas de río y de costa, las variantes de camino y las texturas de bioma. Sin él, el
generador de mundos no tiene con qué construir el agua. Lo que se paga es apoyar al
autor: la licencia del EXTRA es la misma CC0 que la del gratuito, comprobado en su
`License.txt`.

La estructura que espera el compilador es la del zip tal cual, sin tocar. Por ejemplo:

    arte/kaykit/hexagon-extra/KayKit_Medieval_Hexagon_Pack_1.0_EXTRA/Assets/gltf/...

## Por qué no está en git

Son 44 MB de FBX, OBJ y GLTF de los que el juego usa una fracción. Entran en el
repositorio a cambio de nada: son CC0 y se pueden volver a bajar siempre, mientras que
un binario grande en la historia no se quita sin reescribirla.

Lo que sí se versiona es `escenas/modelos/tablero.glb`, que son las 122 piezas que el
mundo usa de verdad. Es lo único que se despliega y lo único que hace falta para
levantar el proyecto sin bajarse antes los 44 MB.

## Cómo se rehace el `.glb`

```bash
npx tsx escenas/scripts/compilar-modelos.ts
```

El compilador:

1. Comprueba que lo que va a meter es **exactamente** lo que el código pide
   (`nombresEnElGlb()` en `escenas/nombres.ts`). Si falta una pieza o sobra una que
   nadie usa, se para y lo dice — una pieza que nadie pide son kilobytes que se
   despliegan a todo el mundo sin que nadie sepa por qué.
2. Comprueba que ningún nombre lleve caracteres que `GLTFLoader` borra al cargar
   (`.`, `:`, `/`, `[`, `]`). Esto costó una tarde: los nodos se llamaban `arbol:a`, el
   fichero salía con sus 114 nodos correctos, y al cargarlo no aparecía **ni un árbol
   ni una montaña ni una construcción de jugador**. Sin error, sin hueco, sin nada.
3. Funde todo en un solo fichero, suelda vértices repetidos, quita duplicados y poda lo
   que no cuelga de nada.

Luego, `npm run verificar` vuelve a comprobar el fichero de verdad desde fuera.

## Las piezas de jugador vienen una sola vez

El pack trae cada pieza de jugador —poblado, ciudad, torre, torreón, bandera, muelle y
barco— en cuatro ficheros de color. En el `.glb` entra **sólo la azul**.

Está medido comparando byte a byte las posiciones de los vértices de las veintiocho
variantes: las cuatro de cada pieza son la misma geometría exacta, y lo único que cambia
son las UV de los vértices que caen en la celda (0,3) del atlas, una columna por color.
Los otros tres colores se fabrican al cargar moviendo esas UV, que es la misma técnica
con la que se pintan los biomas. Ver `CELDA_DEL_JUGADOR` en `escenas/paleta.ts`.

## Los aventureros: seis personajes y una biblioteca de clips

Del pack **KayKit Adventurers 2.0 FREE** (`arte/kaykit/adventurers/`) salen siete ficheros
más en `escenas/modelos/aventureros/`, con otro compilador:

```bash
npm run compilar:aventureros -w escenas
npm run verify:aventureros -w escenas
```

| sale | entra |
| --- | --- |
| `caballero.glb`, `barbaro.glb`, `maga.glb`, `exploradora.glb`, `picaro.glb`, `encapuchado.glb` | `Characters/gltf/{Knight,Barbarian,Mage,Ranger,Rogue,Rogue_Hooded}.glb` |
| `animaciones.glb` (doce clips: `reposo-a`, `reposo-b`, `andar`, `correr`, `saludar`, `recoger`, `aparecer`, `usar`, `lanzar`, `golpe`, `salto`, `t-pose`) | `Animations/gltf/Rig_Medium/Rig_Medium_General.glb` y `Rig_Medium_MovementBasic.glb` |

Los seis personajes llevan el mismo esqueleto —`Rig_Medium`, 23 huesos— y por eso una
sola biblioteca de clips vale para todos: se carga una vez y cualquier clip se aplica a
cualquier personaje por el nombre de sus huesos. La tabla completa de equivalencias
(nombre nuestro ↔ fichero del pack ↔ clip del pack) está en la cabecera de
`escenas/scripts/compilar-aventureros.ts`.

Dos cosas que el compilador hace y conviene saber:

- **La textura se hornea en el color de cada vértice.** El pack trae un PNG empotrado por
  personaje, y en el móvil eso no se puede abrir: `GLTFLoader` lo decodifica con un
  `<img>` que Hermes no tiene (ver `app/src/tres/texturas-nativas.ts`). Como las texturas
  de KayKit son paletas de celdas planas, muestrear el PNG en la UV de cada vértice y
  guardarlo en `COLOR_0` pinta lo mismo y no deja nada que el móvil no sepa cargar. Los
  seis salen sin textura, sin UV y con el material en blanco; el PNG lo decodifica
  `pngjs`, que es JavaScript puro.
- **Los huesos se llaman como en el pack, con punto** (`foot.l`), y `GLTFLoader` les
  quita el punto al cargar (`footl`). Pasa igual en los personajes y en la biblioteca,
  así que el retarget por nombre funciona; `verify:aventureros` lo comprueba cargando los
  siete ficheros con el `GLTFLoader` de three de verdad y buscando el hueso de cada pista
  en cada personaje. No se renombran para que Blender y el propio pack sigan reconociendo
  el rig.

Y un dato que manda sobre todo lo demás: el caballero mide **2,543**, que es
`ALTURA_DE_UNA_PERSONA` en `escenas/escala.ts` y la unidad del mundo entero. Los otros
cinco miden entre 2,17 y 2,66 según el sombrero; el esqueleto es idéntico en los seis.

## El embarcadero: el lobby de Riberas, con el color horneado

`escenas/modelos/embarcadero.glb` son las piezas del muelle en tres dimensiones que se
ve antes de que empiece una partida de Riberas (`docs/EL-MUELLE.md`): teselas y orillas
para la cala, el muelle, el barco, la bandera y el estandarte de cada asiento, botes,
trastos, el caserío del embarque, arboledas, colinas, montañas y nubes. Salen del
**mismo pack hexagonal EXTRA** que `tablero.glb`, a la misma escala, para que el día
que el muelle y el tablero compartan `Canvas` sean el mismo mundo. La lista de piezas y
sus nombres están en `escenas/embarcadero/piezas.ts`, y es esa tabla la que manda.

```bash
npm run compilar:embarcadero -w escenas
npm run verify:embarcadero-modelos -w escenas
```

Es un fichero aparte de `tablero.glb`, y no el mismo, por dos cosas:

- **El color va horneado en el vértice, no en una textura.** `tablero.glb` lleva el
  atlas del pack dentro y pinta moviendo las UV; en el móvil Hermes no decodifica ese
  PNG y el tablero saldría gris. El embarcadero pasa por el mismo horno que los
  aventureros (`escenas/scripts/hornear.ts`): cada vértice se queda con el color que la
  textura tenía en su UV, en `COLOR_0`, y el fichero sale sin texturas, sin imágenes y
  sin UV, con un solo material en blanco. Se carga igual en la app y en el escritorio.
- **El color de jugador se tiñe al cargar.** El pack trae el muelle, el barco, la
  bandera y el estandarte en cuatro colores y Riberas sienta a seis, con la paleta de
  su tablero SVG. Entra sólo la variante azul, más un atributo `_TINTE` por vértice
  (0 o 255) que el compilador deriva horneando también la variante roja y marcando los
  vértices cuyo color cambia. La escena pinta esos vértices del color del asiento. Dos
  datos medidos que conviene saber: el muelle tiene 44 vértices de color entre 1.709 y
  la bandera 44 entre 68, pero el barco y el estandarte —las «unidades» `_full` del
  pack, que son fichas— salen teñidos **enteros**, con el sombreado en un degradado
  del propio color. Quien tiña tiene que recuperar ese sombreado del color horneado,
  no de la máscara.

El compilador no escala nada (la escena aplica `ESCALA_DEL_PACK`, como el tablero) y
conserva los hijos de cada pieza con su nombre del pack en minúsculas: el molino trae
las aspas en `building_windmill_top_fan_red`, colgando de `building_windmill_top_red`, y
la escena las gira. `verify:embarcadero-modelos` vuelve a abrir el fichero desde fuera,
con `@gltf-transform` y con el `GLTFLoader` de three, y comprueba todo lo de arriba más
que una escena llena cabe en el presupuesto de un móvil.

## Lo que queda por hacer

El `.glb` pesa 4,2 MB, y de eso 3,5 MB son 114.929 vértices con posición, normal y UV en
`float32`: 32 bytes por vértice. `KHR_mesh_quantization` los dejaría en unos 14 —el
fichero bajaría a unos 2,4 MB— y three lo carga sin decodificador ni dependencia nueva,
así que también valdría en la app.

No está hecho porque cambia el contrato de carga: `aplana()`, en `escenas/delta.tsx`,
aplica matrices sobre los atributos de la geometría, y una matriz aplicada sobre enteros
de 16 bits los destroza en silencio. Hay que convertir a `float32` al aplanar antes de
cuantizar, y eso merece su propio cambio y su propia comprobación mirando el mundo.
