# ESPECIFICACIÓN FINAL — GENERACIÓN DE AGUA EN EL TABLERO HEXAGONAL

Base: propuesta 1 (hidrología por inundación prioritaria sobre el campo continuo).
Injertos: de la propuesta 2, el muestreo del campo y el ritmo (lóbulos, arena, barco, decisión explícita de sequía); de la propuesta 3, el orden de operaciones, la invariante entera de distancia a los vértices, el decreto del cruce antes de trazar el camino, la lámina única de agua y el aplanado de la plaza.

Todas las roturas que señalaron los doce jueces están corregidas y listadas nominalmente en la sección 10.

---

## 0. LAS SEIS DECISIONES DE LAS QUE CUELGA TODO

1. **La hidrología se calcula sobre el campo CONTINUO en escalones**, nunca sobre el nivel entero. Una sola inundación prioritaria da a la vez el nivel del agua, el árbol de drenaje y los lagos.
2. **El cauce dibujado no baja escalones.** Cada tramo vive entero en un nivel entero. El único cambio de nivel permitido es un vertido a un lago o al mar, y va decorado como cascada. Donde el terreno exigiría subir más de `CAVADO_MAXIMO`, el cauce se corta y pasa a vaguada.
3. **El valle no se pinta con un perfil de radio fijo: se define como un CONO 1-Lipschitz y se compone con `min`.** De ahí sale el teorema de la sección 4.11: el cavado no puede fabricar ningún muro que no existiera ya en el terreno. Esto mata de raíz la familia entera de fallos "zanja con murete de dos escalones" que los cuatro jueces encontraron en las tres propuestas.
4. **El agua nunca entra en el disco de un vértice ni en el de una plaza.** Es una invariante ENTERA sobre distancia hexagonal, comprobable sin coma flotante, y es una restricción del trazado (celdas prohibidas en el A*), no una reparación posterior.
5. **El cruce río-camino se DECRETA antes de trazar el camino**, y todo vado lleva encima el prop de puente. Un vado desnudo es un camino que se mete en el agua.
6. **Hay UNA sola lámina de agua en todo el mundo**, a `-0.2` del pack medido desde la cara superior del nivel del cuerpo de agua. Las piezas de río y de costa se emiten en su variante `waterless` y el agua la pone un plano compartido. Esto elimina el labio de 0.547 entre río (-0.1) y lago (-0.2) y el escalón contra el disco de Mar.

---

## 1. CONSTANTES

```
ESCALA_DEL_PACK        = 6.315 / 1.1547005 = 5.46895      // exacta, no 5.47
RADIO_DE_TESELA        = 6.315
PASO                   = 10.93790                          // = 2 * apotema * ESCALA
ESCALON                = 5.46895
K_PENDIENTE            = ESCALON / PASO = 0.500000          // exacto a 6 cifras
RADIO_DE_COMARCA       = 75.78
N                      = 2736                               // subteselas
LAMINA_PACK            = -0.2
LAMINA                 = LAMINA_PACK * ESCALA_DEL_PACK = -1.09379   // relativa a la cara superior del nivel del cuerpo

// hidrología
EPS_DESEMPATE          = 1e-4        // escalones
VAGUADA_A_MIN          = 40          // unidades de lluvia-subtesela
CAUDAL_MINIMO_DE_BOCA  = 150
RIOS_MAX               = 2
SEPARACION_DE_BOCAS    = 12          // pasos de subtesela
TAU_MIN, TAU_MAX       = 2, 200      // rango de la búsqueda binaria
TAU_ITER               = 24
LONGITUD_MIN_DIBUJADA  = 14          // subteselas; por debajo, no se pinta
LONGITUD_MAX_DIBUJADA  = 55
CAVADO_MAXIMO          = 2           // escalones que el cauce puede excavar bajo el terreno
CASCADA_MAXIMA         = 3           // escalones de vertido a lago o mar
CASCADAS_MAX           = 2           // por tablero

// lagos
LAGO_MIN_CELDAS        = 7
LAGO_PROFUNDIDAD_MIN   = 0.35        // escalones (1.91 de mundo)
ENDORREICO_LLUVIA_MAX  = 0.55
ENDORREICO_REBOSE_MIN  = 2.0         // escalones
MAX_INUNDACION         = 328         // 12% de N; tope duro de celdas de agua

// vetos geométricos (distancia HEXAGONAL entera)
VETO_VERTICE_CAUCE     = 2           // prohibido dHex <= 2 desde la subtesela del vértice
VETO_VERTICE_CUERPO    = 3           // lagos, pozas, estuarios
VETO_PLAZA_CAUCE       = 1           // desde la subtesela del centro de comarca
VETO_PLAZA_CUERPO      = 2

// costas y decorado
BANDA_ARENA            = 1.6 * RADIO_DE_TESELA
CIERRE_MAX_VUELTAS     = 8
PROB_RIBERA            = 0.22
```

**Escala del pack.** Usar `ESCALA_DEL_PACK = 5.46895`, no 5.47. La deriva es de una milésima por escalón y muerde en cuanto se comparan cotas con igualdad.

---

## 2. ESTRUCTURAS DE DATOS

Todo indexado por `i ∈ [0, N)`, en el mismo orden en que `relieve.todas()` emite las subteselas. Todos los arrays son tipados y de tamaño fijo.

```
h        : Float64Array(N)   // altura CRUDA continua, en ESCALONES, sin rellanos ni plazas
lluvia   : Float64Array(N)
w        : Float64Array(N)   // cota de la lámina tras la inundación, en ESCALONES
receptor : Int32Array(N)     // -1 en el borde
vuelco   : Int32Array(N)     // orden de saque del montículo, w no decreciente
A        : Float64Array(N)   // acumulación
orden    : Uint8Array(N)     // Strahler
nivelAgua: Int8Array(N)      // nivel entero del cuerpo de agua al que pertenece; -128 = tierra
clase    : Uint8Array(N)     // 0 tierra, 1 cauce, 2 cuerpo (lago/poza/estuario), 3 vaguada
mascara  : Uint8Array(N)     // bits 0..5 de lados con agua, sólo para clase 1
cono     : Float64Array(N)   // cono de cavado, en escalones; +Inf donde no aplica
cavado   : Float64Array(N)   // min(h, cono), en escalones
nivel    : Int8Array(N)      // round(altura final)
```

Índices auxiliares, todos con **clave entera** `(q,r)`, nunca con clave de coma flotante:

- `tesVertice[54] : Int32Array` — subtesela que contiene cada uno de los 54 vértices.
- `tesCentro[19] : Int32Array` — subtesela del centro de cada comarca.
- `dVertice[N] : Uint8Array` — distancia hexagonal mínima a cualquier `tesVertice`, por BFS multiorigen.
- `dPlaza[N] : Uint8Array` — ídem a `tesCentro`.
- `vedadoCauce[N] : Uint8Array` — `dVertice ≤ 2 || dPlaza ≤ 1`.
- `vedadoCuerpo[N] : Uint8Array` — `dVertice ≤ 3 || dPlaza ≤ 2`.

**Canales de ruido.** Toda llamada usa `canal(n) = n + semilla * 7919`. Ninguna llamada del módulo de aguas puede escribirse como `fraccion(0, 0, CONSTANTE)` sin semilla: eso es una constante de compilación, y el juez de la propuesta 3 demostró que con ella todos los tableros del juego salen iguales. Canales nuevos: `CANAL.desempate`, `CANAL.lluvia`, `CANAL.clima`, `CANAL.cauce`, `CANAL.curvy`, `CANAL.arena`, `CANAL.ribera`.

---

## 3. ORDEN DE OPERACIONES

El orden es parte del algoritmo. En particular, **el cavado entra ANTES de los rellanos y de las plazas**, y los rellanos leen el campo cavado; si se hace al revés, el rellano levanta el lecho justo donde el agua tiene que pasar.

```
 1. h = perfil continuo crudo (sin rellanos, sin plazas) + desempate
 2. lluvia
 3. inundación prioritaria -> w, receptor, vuelco, depresiones
 4. acumulación A y orden de Strahler
 5. DECISIÓN DE AGUA: seco / húmedo, número de bocas, calibración de tau
 6. lagos: filtros, conservación, nivel, endorreicos
 7. vetos geométricos (dVertice, dPlaza, vedadoCauce, vedadoCuerpo)
 8. trazado del cauce: A* restringido por rama
 9. niveles: tramos, truncamiento, cascadas
10. cabeceras: borde, lago o poza; si no, acortar; si no, degradar
11. cono de cavado -> cavado = min(h, cono)
12. inundación de bancos hasta punto fijo
13. rellanos (54) y plazas (19) sobre `cavado`   [mecanismo existente, sin tocarlo]
14. redondeo a niveles enteros; rampas de terreno
15. máscara final de agua (cauce + cuerpos + mar exterior)
16. cierre morfológico de costas (fases A y B)
17. asignación de piezas: cauce y costa, con giro
18. sendas: decreto de vados, curva muestreada, A* de reparación
19. props: puentes, rocas de costura, cascadas, carrizo, muelles, barcos, ribera
20. emisión: plano de agua, teselas, sendas, rampas
21. verificación
```

---

## 4. LOS PASOS, CON FÓRMULAS

### 4.1 Campo continuo y desempate

`relieve` expone `perfil(): Float64Array` con las N evaluaciones de la altura CRUDA continua **cacheadas**, en escalones. Hoy `nivelDeSub` la recalcula entera en cada llamada y `habitabilidadDe` + `rampaDe` la piden hasta 14 veces por subtesela; exponer el array cacheado no es "coste cero", **es el trabajo**, y baja el tiempo de generación del mundo aunque no hubiera agua. El caché se indexa por `(q,r)` entero, jamás por clave de coma flotante.

```
h[i] = perfil[i] + EPS_DESEMPATE * fraccion(q_i, r_i, canal(CANAL.desempate))
```

El desempate es 1e-4 sobre un rango de pocos escalones: no mueve ninguna cota real y hace la elección reproducible. Además, **el comparador del montículo desempata AL FINAL por `(q, r)` entero**, porque `Math.exp` está aproximada por la implementación y un empate exacto podría voltearse entre V8 y Hermes.

### 4.2 Lluvia

```
base(bioma):  montana 1.30  cantil 1.20  bosque 1.30  colina 1.00  pradera 1.00
              campo 0.95    vega 0.95    carrizal 1.10 marisma 1.10
              desierto 0.35 duna 0.35    salina 0.35

lluvia[i] = baseMezclada(p_i)
          * (0.55 + 0.9 * h[i] / max(h))
          * (0.6 + 0.8 * fbm(x/(RADIO_DE_COMARCA*2.2), y/(RADIO_DE_COMARCA*2.2), canal(CANAL.lluvia), 3))
```

`baseMezclada` usa la MISMA mezcla gaussiana de 19 comarcas que ya emplea `techoEn`: sin bordes, sin círculo de influencia. `A` queda en unidades de lluvia-subtesela; una comarca entera son 144.

### 4.3 Inundación prioritaria

Montículo de mínimos con clave `w`; comparador `(w, q, r)`.

1. Empujar las subteselas del BORDE exterior de la unión de las 19 comarcas con `w = 0`, `receptor = -1`.
2. Sacar la de `w` menor. Para cada vecina `n` no visitada: `w[n] = max(h[n], w[sacada])`, `receptor[n] = sacada`, empujar con clave `w[n]`.
3. Anotar el receptor **en el EMPUJE, no en el saque**: es lo que hace que dentro de un lago, donde `w` es constante y no hay pendiente, el árbol apunte al punto de rebose.
4. Guardar `vuelco[]` con el orden de saque.

Al terminar: `w[i] > h[i]` significa bajo el agua con profundidad `w-h`; `receptor` es un árbol enraizado en el borde, acíclico y con salida garantizada.

### 4.4 Acumulación y Strahler

Una sola pasada INVERSA sobre `vuelco`, sin ordenar nada más:

```
A[i] = lluvia[i];  luego, recorriendo vuelco al revés:  A[receptor[i]] += A[i]
orden[i] = 1 si no tiene hijos encauzados;
           max(ordenes de los hijos), o max+1 si dos hijos empatan en el máximo.
```

### 4.5 Decisión de agua, y por qué a veces no hay río

**Pendiente, con las unidades del código.** `h` y `w` están en ESCALONES; un paso entre subteselas mide `PASO` de mundo. Por tanto:

```
S[i] = max(1e-3, (w[i] - w[receptor[i]]) * K_PENDIENTE)      // K_PENDIENTE = 0.5
```

Un escalón de caída entre celdas contiguas es `S = 0.5`, que es exactamente la pendiente de 26.6 grados. Escribir `S = Δw / 10.94` mezcla escalones con unidades de mundo y deja el umbral 5.47 veces mal.

**Predicado único de cauce** (una sola definición para bocas, Strahler, confluencias y pintado; no puede haber dos):

```
encauzado(i)  <=>  A[i] * S[i]^0.6 >= tau
```

**Bocas.** Celdas del borde con al menos un hijo encauzado. Se ordenan por `A` descendente. Si dos bocas distan menos de `SEPARACION_DE_BOCAS` pasos, se descarta la menor.

**La decisión de sequía es absoluta y climática, no un dado:**

```
si (no hay ninguna boca)  o  (A de la mejor boca < CAUDAL_MINIMO_DE_BOCA):
    ARQUETIPO = SECANO
```

Como `CAUDAL_MINIMO_DE_BOCA` es un umbral ABSOLUTO sobre `A`, y `A` escala con la lluvia, un reparto con tres desiertos (`base` 0.35) produce del orden de un tercio del caudal de uno con montaña y bosque (`base` 1.30) y cae en SECANO con mucha más frecuencia. La frase "no hay río porque no llueve bastante sobre este tablero" es literalmente cierta y se ve en los biomas antes de contarla.

**Número de ríos.** `cuantos = min(RIOS_MAX, número de bocas con A ≥ CAUDAL_MINIMO_DE_BOCA)`.

**Calibración de tau.** NO se calibra por rango de boca: multiplicar toda la lluvia por una constante escala `A` y el umbral por igual y el conjunto pintado sale idéntico, con lo que el río sería invariante al clima. Se calibra por **longitud pintada**, con búsqueda binaria de 24 iteraciones sobre `tau ∈ [TAU_MIN, TAU_MAX]`:

```
objetivo: para cada boca conservada, |{celdas encauzadas de su cuenca}| ∈ [LONGITUD_MIN_DIBUJADA, LONGITUD_MAX_DIBUJADA]
se maximiza tau sujeto a que la rama principal alcance LONGITUD_MIN_DIBUJADA
```

Si tras la búsqueda la rama principal no llega a `LONGITUD_MIN_DIBUJADA` celdas, esa boca se descarta. Si no queda ninguna, `ARQUETIPO = SECANO`. Esto es lo que impide el "acuario": un canal de seis teselas pegado al canto del tablero con su estuario, su bote y su ancla no se emite nunca.

**Vaguada.** `clase = 3` donde `¬encauzado ∧ A ≥ VAGUADA_A_MIN`. La vaguada NO cava, NO tiene lámina y NO pide pieza: es terreno. `poblar.ts` le pone carrizal, arboleda pequeña, tocón y roca húmeda; se le prohíbe arbolado cerrado y edificio; es donde el pueblo pone el abrevadero y el pozo. Un tablero SECANO no queda pelado: sigue teniendo vaguadas, o sea valles secos, que es exactamente el paisaje de un sitio donde el agua va por debajo.

**Arquetipo resultante** (descriptivo, no sorteado):

```
SECANO           : sin cauce dibujado
UN RIO           : una boca
RIO CON LAGO     : una boca y al menos un lago conservado en su cuenca
DOS RIOS         : dos bocas
LAGUNA           : SECANO pero con un lago endorreico conservado
```

### 4.6 Lagos

Se agrupan por conectividad las celdas con `w[i] > h[i]`. Un grupo se CONSERVA si cumple las cuatro:

- `|grupo| ≥ LAGO_MIN_CELDAS` (7: un hexágono y su anillo, ~35 de ancho).
- `max(w - h) ≥ LAGO_PROFUNDIDAD_MIN` **escalones** (0.35 escalones = 1.91 de mundo). Escribirlo como `0.6 * ESCALON` son 18 unidades de profundidad en escalones y ningún lago del mundo pasa ese filtro.
- Ninguna de sus celdas tiene `vedadoCuerpo`.
- El grupo cabe: `|grupo| ≤ 0.35 * 144` dentro de una misma comarca.

Los que fallan se DRENAN (`w := h`); el árbol de flujo no se toca porque ya apuntaba al rebose.

Los conservados: `nivelAgua = floor(w_rebose)`, `clase = 2`, todas sus celdas al MISMO nivel entero. Su anillo de tierra pasa a costa (sección 4.14).

**Endorreico.** Si la lluvia media de la cuenca del lago es `< ENDORREICO_LLUVIA_MAX` y el rebose está `≥ ENDORREICO_REBOSE_MIN` escalones por encima del fondo, se le suprime el desagüe: no se traza cauce de salida y su orilla se decora como salina. Sale gratis del mismo cálculo.

### 4.7 Vetos geométricos

BFS multiorigen desde `tesVertice` y desde `tesCentro` para llenar `dVertice` y `dPlaza`. Después:

```
vedadoCauce[i]  = (dVertice[i] <= VETO_VERTICE_CAUCE)  || (dPlaza[i] <= VETO_PLAZA_CAUCE)
vedadoCuerpo[i] = (dVertice[i] <= VETO_VERTICE_CUERPO) || (dPlaza[i] <= VETO_PLAZA_CUERPO)
```

**Por qué esos números, y qué garantizan.** El rellano de construcción mezcla hacia la cota del vértice con radio 16.42; el anillo 1 de subtesela está a 10.94 (dentro) y el anillo 2 a 18.94 (fuera). Con `vedadoCauce` a `dHex ≤ 2`, el agua empieza en el anillo 3 (28.4 como mínimo) y queda un anillo entero de tierra seca entre el disco de aplanado y el agua. Como el cono de cavado es 1-Lipschitz (4.11) y el disco de mezcla tiene radio 1 celda, **la variación que el cavado introduce dentro del disco del rellano es de a lo sumo 1 escalón**, y la misma cifra protege en los dos sentidos: el aplanado tampoco puede levantar el lecho, porque su peso ya vale 0 a la distancia a la que está el agua.

**Geometría del corredor resultante.** Dos vértices contiguos distan 75.78 = 6.93 celdas; dos discos de radio 2 dejan un pasillo libre de ~2.9 celdas centrado en el punto medio de la arista. El interior de cada comarca queda libre salvo el disco de plaza (radio 1). Es decir: **el río circula por los interiores de comarca y cruza las aristas por su punto medio**, que es justo donde el vado tiene que estar. La estructura que la propuesta 3 decretaba, aquí sale derivada.

Superficie vedada al cauce: ~42% de N. El A* de la sección 4.8 la respeta por construcción, y el SECANO es la salida cuando no hay ruta.

### 4.8 Trazado del cauce

La hidrología dice DÓNDE está el valle; una búsqueda restringida dice qué cadena exacta de teselas se pinta. Para cada boca conservada, de la boca hacia la cabecera:

```
d_arbol[u] = distancia hexagonal de u al conjunto {encauzado}  (BFS, una vez)

A* sobre las subteselas, de la celda de cabecera a la celda de boca:
  PROHIBIDO: vedadoCauce[u]; celdas de lago; celdas de otro cauce ya trazado a dHex < 2
  PROHIBIDO: subir, salvo tolerancia:  w[u] > w[t] + 0.05
  coste(t -> u) = 1
                + 4.0 * max(0, w[u] - w[t])
                + 0.8 * d_arbol[u]
  heurística: distancia hexagonal a la boca
  desempate del montículo: (f, q, r) enteros
```

Si el A* no encuentra camino, esa rama se degrada entera a vaguada; si era la única, `ARQUETIPO = SECANO`.

**Confluencias.** Una celda con dos hijos encauzados produce máscara de tres lados, que tiene pieza (D, E, F o G). Antes de emitir: si una celda tiene ≥3 hijos, se conservan los dos de mayor `A` y el resto se degrada a vaguada en sus dos últimas celdas, de modo que se unan una celda más abajo. Si los dos lados de entrada son ADYACENTES (difieren en 1), la uve queda pinzada a nada: la unión se empuja una celda río abajo.

**Suavizado.** Dos iteraciones de Chaikin sobre la polilínea de centros con tope de desplazamiento de una celda, y re-rasterizado con el mismo `lineaDeHexes` que ya usan las sendas para reparar los saltos de esquina. Después se revalida contra `vedadoCauce`: cualquier celda desplazada que caiga en veto se devuelve a su posición original.

**Variante curvy.** En una celda de máscara `{k, k+3}` se emite `hex_river_A_curvy` si `fraccion(q, r, canal(CANAL.curvy)) < 0.5`, salvo si la celda es un vado o es vecina de un vado (ahí el cauce tiene que estar recto). Es intercambiable 1:1: mismos lados, mismo ancho en los bordes, área 1.8482 contra 1.8475.

### 4.9 Niveles: tramos, truncamiento y cascadas

**Regla dura: el río no puede cruzar el borde de una terraza, porque no existe `hex_river_sloped`.**

```
TRAMO = subcadena maximal de cauce a un mismo nivel entero.
```

Recorriendo la cadena de la boca hacia arriba:

```
nivel del tramo de la boca = 0                         (desemboca en el mar)
nivel del tramo que sale de un lago = nivel del lago
```

Dentro de un tramo, `nivelAgua[i]` es constante. La cadena avanza mientras

```
round(w[i]) - nivelTramo <= CAVADO_MAXIMO
```

y en cuanto se incumple, **TRUNCAMIENTO**: el cauce se corta ahí y todo lo de aguas arriba pasa a vaguada. Es la manera honesta de decir que un río no trepa un muro: simplemente no tiene esa cabecera. `CAVADO_MAXIMO = 2` acota el desfiladero a 10.94 de mundo y es lo que impide que el cauce arrase una sierra entera.

**Cambio de nivel: sólo una CASCADA de vertido.** Un tramo puede terminar aguas abajo en un lago conservado o en el mar, y sólo ahí puede caer:

```
salto = nivelTramo - nivelDestino,  con 1 <= salto <= CASCADA_MAXIMA
la celda de vertido es una celda de cauce RECTA (máscara {k, k+3})
sus dos orillas llevan roca-c/d/e obligatoria, más roca en la celda de abajo
como máximo CASCADAS_MAX por tablero; si se pide una tercera, esa rama se trunca
```

No hay ningún otro sitio donde el nivel del agua cambie. Ni entre dos celdas de cauce, ni dentro de un lago, ni entre un lago y su anillo de costa.

**Consecuencia asumida y acotada:** los ríos viven en la mitad baja del tablero. Es la concesión que el pack impone al no publicar la pieza de caída, y está escrita, medida (`CAVADO_MAXIMO`) y verificada, no disimulada.

### 4.10 Cabeceras: por qué nunca se pide la pieza M

Las 12 letras de río cubren las 57 máscaras de cardinal 2 a 6. **La única máscara sin pieza es la de cardinal 1.** Un extremo de cadena tiene cardinal 1. Por tanto:

**Todo extremo de aguas arriba de un cauce dibujado es exactamente una de estas tres cosas:**

**(a) El borde exterior del tablero.** La cadena se extiende UNA celda virtual fuera del tablero y sólo después se recorta. `apuntaLosLados` se ejecuta sobre la cadena COMPLETA, antes de recortar, así que la celda del borde conserva en su máscara el lado que mira afuera: sale una pieza de dos lados, no una M.

**(b) Una celda de lago conservado.** La cadena incluye la celda de lago; la última celda de cauce tiene dos lados.

**(c) Una POZA DE CABECERA.** Una única celda `hex_water` al nivel del tramo, creada aquí, con estas condiciones:

- la celda y sus 6 vecinas están libres de `vedadoCuerpo`;
- ninguna de las 6 pertenece a otro cuerpo de agua;
- `round(cavado)` de las 6 es igual al nivel del tramo tras el cavado.

Sus 5 vecinas que no son cauce ven agua por 1 solo lado, o sea `hex_coast_A` cada una, y sus medias de arena casan entre sí por la regla de la sección 4.14. La sexta es la celda de cauce, que está EXENTA de la regla de costas.

**El orden de intento es (a), (b), (c).** Si ninguna es viable, la cadena se acorta una celda y se reintenta; si baja de `LONGITUD_MIN_DIBUJADA`, la rama entera pasa a vaguada.

**La única costura del sistema, medida y acotada.** En la arista donde una celda de cauce toca una celda de agua ancha (poza, lago, estuario o mar), la celda de cauce presenta hierba a Y=0 en los dos hombros del cauce, y la vecina presenta arena seca a Y=-0.1 o lámina a -0.2. Queda un labio de `0.1` del pack = 0.547 de mundo (una quinta parte de una persona) sobre media arista = 3.16 de mundo, en dos sitios por junta. **Decoración obligatoria: `roca-b` en las dos esquinas.** Conteo verificado: 2 por poza, 2 por junta con lago, 2 por boca. Tope duro del tablero: 8. Es la única discontinuidad geométrica del diseño y está contada.

### 4.11 El cono de cavado, y el teorema que cierra la familia entera de fallos de muro

**Definición** (sobre subteselas, BFS multiorigen desde el conjunto de agua, en escalones):

```
cono[t] = min sobre celdas de agua c de ( nivelAgua[c] + max(0, dHex(t, c) - 1) )
cono[t] = +Infinito si no hay agua
```

Es decir: el anillo 1 alrededor del agua queda al nivel del agua (banco accesible), el anillo 2 un escalón por encima, el anillo 3 dos, y así.

Para un punto arbitrario `p` (que es como lo consulta `alturaContinua`), se corrige con las 7 celdas más cercanas, lo que mantiene la propiedad Lipschitz y cuesta 7 distancias:

```
conoEn(p) = min sobre {celda que contiene p} ∪ {sus 6 vecinas} de ( cono[t] + |p - centro(t)| / PASO )
```

**El campo cavado:**

```
cavado(p) = min( alturaCruda(p), conoEn(p) )        // en escalones
```

**TEOREMA (el que hace innecesarias las tres reparaciones que los jueces tumbaron).**
`cono` es 1-Lipschitz sobre la malla: para vecinas `t, u`, `|cono[t] - cono[u]| ≤ 1`, porque `dHex` cambia como mucho en 1 y `max(0, x-1)` es 1-Lipschitz. Por la desigualdad `|min(a₁,b₁) - min(a₂,b₂)| ≤ max(|a₁-a₂|, |b₁-b₂|)`:

```
para vecinas t,u:   |cavado(t) - cavado(u)|  <=  max( |h(t) - h(u)| , 1 )
```

**El cavado no puede fabricar ningún muro que no existiera ya en el terreno.** Y como `|round(x) - round(y)| ≤ 1` cuando `|x - y| ≤ 1`, la propiedad sobrevive al redondeo a escalones.

Esto sustituye al perfil multiplicativo `f(d) = [0, 0, 0.25, 0.5, 0.75, 1]` de la propuesta 3, cuya cota de salto dependía de `max(TECHO_DEL_BIOMA)` y por lo tanto se rompía en cuanto ese valor no era 3. **Aquí la garantía no depende de ningún techo de bioma.** Es la corrección más importante de toda la especificación.

Y sustituye al pinzado `lecho ≤ nivel ≤ lecho+1` de la propuesta 1, que fijaba enteros a pelo en un anillo y dejaba el segundo anillo intacto: eso es exactamente la zanja con murete que los cuatro jueces encontraron, y que `relieve.ts` ya documenta como el bug de los dieciséis muros insalvables.

**Consecuencia gratuita y necesaria:** el anillo 1 al nivel del agua y el 2 un escalón por encima significan que **el camino que baja al vado desciende exactamente un escalón por anillo**, que es justo lo que sabe hacer `hex_road_*_sloped`. Las rampas de aproximación al vado salen del cono, no de una regla aparte.

### 4.12 Inundación de bancos

El A* no sigue necesariamente el mínimo del terreno, así que un banco podría quedar por debajo de la lámina: agua colgada sobre una loma vista desde el otro lado. Se cierra a punto fijo, y sólo añade:

```
repetir hasta punto fijo:
  para toda celda de TIERRA t vecina de un cuerpo o cauce de nivel L:
    si round(cavado(t)) < L:  t := agua del mismo cuerpo, nivelAgua[t] = L
```

Termina (el conjunto de agua crece y está acotado). Después:

- si alguna celda inundada tiene `vedadoCuerpo` (o `vedadoCauce` si es cauce): se marca esa zona como prohibida y se REENRUTA la rama una sola vez con el A* de 4.8;
- si el total de agua supera `MAX_INUNDACION`: la rama se degrada a vaguada;
- si tras el reenrutado vuelve a fallar: `ARQUETIPO = SECANO`.

Ladder de tres peldaños, determinista, sin bucles.

### 4.13 Rellanos y plazas

**No se toca el mecanismo de rellano que ya existe.** No se crea ningún mapa `aplanado` ni ningún conjunto `enRellano` de teselas ya cortadas: forzar niveles discretos a posteriori es literalmente el bug que `relieve.ts` documenta haber corregido. El único cambio es la ENTRADA:

```
la mezcla del rellano y la de la plaza leen `cavado`, no `alturaCruda`
```

**Aplanado de la plaza** (arreglo que el agua destapa y que ya hacía falta): las 7 subteselas de `rango ≤ 1` de cada comarca se mezclan hacia `cavado(centroDeComarca)` con el mismo peso quíntico de `pesoDelRellano`, radio `1.5 * PASO`. Sin esto, el disco del número puede apoyarse en un escalón que lo cruza, y con el agua cerca deja de ser una posibilidad remota.

No hay ciclo de arranque: la hidrología usa `alturaCruda` (sin rellanos), el cavado sale de la hidrología, y los rellanos leen el cavado. Una sola dirección.

### 4.14 Máscara final y encadenado de costas

**Regla de exterior.** Para el cálculo de la máscara de agua, el exterior del tablero cuenta como agua **sólo para las subteselas de borde cuyo nivel es 0**. Una subtesela de borde a nivel ≥1 es un acantilado sobre el mar y se decora con roca; no genera costa, porque su lámina quedaría flotando sobre el mar.

**La regla de encadenado** (validada de punta a punta, 0 fallos en 18 costas):

1. Para cada subtesela de TIERRA, `W` = conjunto de lados `k` cuyo vecino es agua.
2. `W` tiene que ser una TIRADA CONTIGUA módulo 6 de longitud `L ∈ [0,4]`. Sea `primero` el único `a ∈ W` tal que `(a-1) mod 6 ∉ W`. Entonces:

```
L = 0  ->  hex_grass,   sin giro
L = 1  ->  hex_coast_A  (tramo recto),  primero canónico = 5
L = 2  ->  hex_coast_B  (esquina hacia el mar), primero canónico = 4
L = 3  ->  hex_coast_C  (península),     primero canónico = 4
L = 4  ->  hex_coast_D  (cabo),          primero canónico = 4
rotation.y = 60 * ((primero - primero_canonico) mod 6) grados
```

Ejemplo: agua sólo por el lado 2 → `hex_coast_A` con `rotation.y = 60 * ((2-5) mod 6) = 180`.

3. **La playa es lo que cierra el escalón.** Cada pieza saca arena a MEDIO LADO en los dos lados que flanquean la tirada: en el lado `(primero - 1)` sobre `s = [0, +0.5774]`, y en el lado `(ultimo + 1)` sobre `s = [-0.5774, 0]`, con `ultimo = primero + L - 1`. Siempre la mitad pegada a la esquina que toca el agua.
4. **Por qué casa.** Al cruzar una arista compartida el parámetro `s` CAMBIA DE SIGNO, porque `t_(j+3) = -t_j`. La condición de continuidad es: si T saca arena en el lado `j` sobre `[a,b]`, el vecino la saca en su lado `j+3` sobre `[-b,-a]`. Con las cuatro piezas medidas eso se cumple SIEMPRE, exactamente, sin escalón ni hueco.
5. **`hex_coast_E` no entra en la regla.** No tiene agua, y su firma de arena corresponde a una configuración que en malla hexagonal no puede darse. Sólo como duna o arenal decorativo tierra adentro.
6. **El anillo de costa es obligatorio, no cosmético.** `hex_water` no tiene tierra: su Ymax es -0.2, y pegada a hierba deja un corte vertical de 0.2 del pack (1.094 de mundo) sin playa.
7. **Las celdas de CAUCE están exentas** de esta regla: el río lleva su propia orilla horneada. Es la fuente de la costura de 4.10, contada y decorada.

**No existe pieza para `L = 5`, `L = 6`, ni para `W` no contiguo** (por ejemplo `{0,3}`, un istmo de una sola subtesela). Reparación:

```
FASE A (cierre, sólo AÑADE, dominio = celdas sin vedadoCuerpo):
  repetir hasta punto fijo:
    para cada celda de TIERRA t del dominio:
      si |W(t)| >= 5  o  W(t) no es tirada contigua:  t := agua del cuerpo mayoritario vecino

FASE B (erosión, sólo QUITA, sobre celdas VEDADAS):
  para cada celda de TIERRA VEDADA t con W(t) inválido:
      quitar el agua de la vecina de agua con menor A (o menor profundidad si es lago)
  si se quitó algo, volver a FASE A

Tope: CIERRE_MAX_VUELTAS = 8 alternancias. Si no converge, ARQUETIPO = SECANO.
```

Coste medido del cierre: sobre ruido blanco al 35% inundaría un 16-25% extra; sobre un campo suave tipo fBm como el de este mundo, entre el 0% y el 2.4%, y casi siempre 0%. Se hace igualmente: es lo que garantiza que nunca se pide una pieza que no existe.

### 4.15 Asignación de piezas de cauce

Si `piezaDeCauce` / `CAUCE_DE_MASCARA` ya existen en `sendas.ts`, reutilizarlas tal cual. Si no, la tabla se construye una vez rotando las 12 máscaras base por las 6 rotaciones:

```
A={0,3} B={1,3} C={2,3} D={1,3,5} E={0,1,3} F={0,3,5} G={2,3,4}
H={0,2,3,4} I={1,2,4,5} J={0,3,4,5} K={1,2,3,4,5} L={0,1,2,3,4,5}
```

Cubren las 57 máscaras de cardinal 2..6. **Cardinal 1 devuelve `null` y es un ERROR del generador, no un caso a rodear**: significa que se ha trazado un cauce que no desemboca, y la sección 4.10 lo hace imposible por construcción.

Recordatorio de convenio, que es donde se equivocaron dos de los tres análisis previos: `phi = atan2(-z, x)`. Los lados 0 y 3 son puntos fijos del espejo `k' = (6-k) mod 6`, así que ninguna prueba que use sólo `hex_river_A` o los vados detecta un convenio girado. Si hace falta comprobarlo, se mide `hex_coast_A`: si da `{5}`, bien; si da `{1}`, hay un `atan2(+z, x)` metido en alguna parte; si da `{4,5}`, hay un test de esquina sin filtrar.

### 4.16 La lámina única de agua

**Un solo plano por cuerpo de agua**, a `Y = nivelAgua * ESCALON + LAMINA` (LAMINA = -1.09379), construido como la unión de los hexágonos de todas las subteselas del cuerpo **más las de su anillo de costa y las de cauce que lo alimentan**. Una sola geometría fusionada por cuerpo.

- Las piezas de río y de costa se emiten en su variante **`waterless`** (comprobado con el ráster: en `tiles/rivers/waterless` y `tiles/coast/waterless` el cauce y la laguna no tienen ninguna superficie vista desde arriba; las paredes bajan a Y=-1.0). El plano rellena el hueco.
- `hex_water` puede emitirse tal cual: su lámina horneada está a -0.2, o sea coincidente con el plano; para evitar z-fighting, usar su variante waterless si existe, o desplazar el plano `-0.004` del pack.
- El **Mar** deja de estar en `base + ESCALON*0.5` y pasa a un ANILLO horizontal en `Y = 0 * ESCALON + LAMINA`, con radio interior igual al circunradio del tablero. Una subtesela de borde a nivel 0 sin costa muestra 1.094 de pared de tierra sobre el agua; por eso el anillo de costa del borde a nivel 0 es obligatorio.

Esto elimina de golpe: el labio de 0.547 entre río y lago, el labio entre río y mar, y el escalón invisible de 1.64 del disco de Mar. **Es un cambio que afecta también a los tableros SECANO**, y hay que decirlo al desplegarlo: se verifica aparte (sección 9, comprobación M1).

### 4.17 Sendas, vados y puentes

**Corrección de premisa, medida:** `hex_river_crossing_A` y `_B` **NO son puentes, son VADOS**. Recorriendo la línea central del camino: existe calzada en Y=-0.05 hasta `s = ±0.55`, y en todo el tramo central la única superficie es agua en Y=-0.1. No hay tablero, ni pilas. Si el generador da por hecho que la crossing lleva puente, salen caminos que se meten en el río por todo el tablero.

**El puente de verdad es un PROP:** `gltf/buildings/neutral/building_bridge_A.gltf`. Calzada en Y=+0.20, pretiles a +0.25, pilas hasta -1.0, eje de calzada en phi=120 grados (eje de lados `{2,5}`), ancho 0.32-0.38 (el camino mide 0.385: encaja), rampas aterrizando en Y=-0.047 a `s = ±0.99`, o sea exactamente sobre la calzada del vado y en el punto medio de los lados. Está hecho para posarse encima de `hex_river_crossing_A` sin girar.

**`building_bridge_A.gltf` y `_B.gltf` son EL MISMO MODELO** (mismo SHA1 del .bin, `e40e...`, 25576 bytes). No se gasta una tirada de aleatoriedad en elegir.

#### 4.17.1 Decreto del vado (antes de trazar ningún camino)

Para cada una de las 72 aristas cuyos dos vértices quedan en orillas opuestas del cauce:

1. Celda candidata `b` = celda de cauce más cercana a `puntoDeArista(arista)`.
2. Se busca en `b ± 4` celdas a lo largo del cauce la primera que admita:
   - **cauce RECTO**: la máscara de la celda es `{w, w+3}` exactamente, o puede hacerse recta sustituyendo la terna (`anterior`, `b`, `siguiente`) por tres celdas colineales sin pisar `vedadoCauce`;
   - **camino RECTO** por un eje `{r, r+3}` con `r mod 3 ≠ w mod 3`, eligiendo entre los dos ejes disponibles el que maximiza el producto escalar con `puntoDeVertice(v2) - puntoDeVertice(v1)`;
   - las tres celdas del eje de camino tienen el MISMO nivel (garantizado por el cono: la celda de vado está a nivel `L` y sus vecinas de anillo 1 también).
3. Selección y giro, con `a = w mod 3` y `b_ = r mod 3`:

```
si b_ = (a+2) mod 3  ->  hex_river_crossing_A,  rotation.y = 60*a
si b_ = (a+1) mod 3  ->  hex_river_crossing_B,  rotation.y = 60*a
si b_ = a            ->  NO HAY PIEZA  (no puede ocurrir: se exige r != w mod 3)
```

4. **Prop de puente, SIEMPRE.** Sobre la crossing_A se gira `60*a`; sobre la crossing_B, `(60*a - 60) mod 360`, porque su calzada canónica está en el eje `{2,5}` y la B lleva el camino por el `{1,4}`. Un vado desnudo en una arista jugable no se emite nunca.
5. Si en las 9 celdas candidatas no sale ninguna pareja válida: se marca la ventana de esa arista como prohibida y se **reenruta el cauce una sola vez**. Si sigue sin salir, **la rama entera del cauce se degrada a vaguada** (que es legal: la vaguada no tiene máscara ni pide pieza). No se enderaza el río para acomodar el camino más allá de la terna, y no se deja jamás una arista sin cruce.

#### 4.17.2 Trazado de las 72 sendas, en dos peldaños

**Peldaño 1 (por defecto, conserva el aspecto de hoy):** la curva muestreada actual, `teselasDeUnCamino`, con su desvío de ruido y su envolvente `sin(pi t)`. Se valida contra:

- ninguna celda de la cadena es agua, salvo la celda decretada de vado;
- entre dos celdas consecutivas, `|Δnivel| ≤ 1`;
- la cadena es 6-conexa y empieza y acaba en las subteselas de los dos vértices.

**Peldaño 2 (reparación):** si falla, A* sobre subteselas con las mismas restricciones como restricciones DURAS:

```
PROHIBIDO: celda de agua que no sea el vado decretado
PROHIBIDO: transición con |Δnivel| >= 2       // no existe rampa de camino de dos escalones
coste(t) = 1
         + 0.9 * fbm(centro(t)/(4*PASO), canal(CANAL.senda))
         + PESO_CORREDOR * (dist(t, recta de la arista) / RADIO_DE_TESELA)^2
         + 0.35 * [Δnivel != 0]
```

En una arista con vado, el A* se parte en dos mitades a un lado y otro de la terna clavada.

**El coste de la rampa lleva el signo correcto.** No se penaliza la rampa: se penaliza el CAMBIO DE NIVEL, y el salto de dos escalones es infinito. Penalizar la rampa (como hacía la propuesta 3) hace que la búsqueda prefiera sistemáticamente el muro, que es peor que lo que arregla.

#### 4.17.3 Orden de mando de la tesela, y el camino del jugador

```
ORDEN: agua > senda > rampa > tesela
```

**La senda gana a la rampa.** Una celda de senda que cambia de nivel emite `hex_road_*_sloped`, así que no necesita la rampa de terreno. Con el orden contrario (`rampa > senda`, que es el que hay hoy en `delta.tsx`), cada rampa que caiga sobre una tesela de camino BORRA el camino, y el río, al crear bancos a nivel del agua, fabrica rampas nuevas a lo largo de las dos orillas. Ese es el mecanismo por el que dos jueces distintos encontraron aristas con el trazado sin dibujar.

**La cinta del jugador sigue la cadena, no la recta.** `tramosEntre(puntoDeVertice(a), puntoDeVertice(b), ...)` traza hoy una cinta RECTA de vértice a vértice apoyada en el relieve: sobre un valle cavado eso vuela por encima del agua, al lado del puente. Se sustituye por: la cinta recorre los centros de las subteselas de la cadena de senda, tomando en cada una `nivel * ESCALON + 0.3`, y en la celda de vado toma `nivel * ESCALON + 0.20 * ESCALA_DEL_PACK` (la calzada del prop de puente). Sin esto, las 3 a 7 aristas más miradas del tablero muestran el camino de piedra en un sitio y la cinta de color en otro.

### 4.18 Arena, UV y biomas

**Fallo latente que hay que arreglar y que existe hoy sin agua:** el `useMemo` de `suelos` fabrica los biomas desplazando TODAS las UV de la tesela. `hex_road_*` lleva su tierra en la celda (3,2) y ya está saliendo con el color de dos columnas a la derecha. Aplicado a una costa movería también el agua y la arena.

```
sólo se desplaza el vértice cuya UV cae en CELDA_DE_LA_HIERBA
```

Un `if`, y deja seguras para siempre todas las teselas multicelda del pack. **Las teselas de cauce, costa y agua NO se clonan por bioma**: no llevan desplazamiento de atlas.

**Banda de U de tierra.** La banda `[0.047, 0.088]` NO cubre estas teselas: la hierba y la pared de tierra de costas y ríos están en `U = 0.039..0.047`. Usar `[0.030, 0.095]`. Las bandas de agua `[0.16,0.21]`, arena `[0.54,0.58]` y camino `[0.41,0.46]` son correctas.

**Banda de arena de bioma.** Una subtesela de tierra a distancia hexagonal `d` de la orilla con `d * PASO < BANDA_ARENA` usa la celda de arena (4,2) en vez de la de su comarca si

```
fraccion(q, r, canal(CANAL.arena)) < 1 - (d * PASO / BANDA_ARENA)^2
```

La probabilidad decreciente disuelve la banda; un anillo de grosor constante alrededor de un lago es lo más obviamente generado que se puede dibujar. Excepciones: en `montana` y `cantil` la banda usa piedra (2,2)/(3,0) — no hay playas al pie de un acantilado; en `carrizal` y `marisma` no hay banda, que ahí la orilla es junco.

**Los ríos no traen arena.** `hex_river_*` reparte sus UV entre hierba y agua; la arena sólo la traen las costas. El medio metro de ribera de la propia tesela de río se queda verde: es una limitación del pack, se documenta y no se disimula.

### 4.19 Props: muelles, barcos y ribera

**Definición de AGUA ANCHA.** Una celda de agua cuyas 6 vecinas son también agua, perteneciente a un cuerpo (`clase = 2`) de al menos 12 celdas. El cauce NUNCA es agua ancha: mide 0.9238 del pack = 5.05 de mundo, dos personas. Un muelle o un barco sobre un cauce es una mentira que se ve.

**BARCO** (`ship`/`boat.gltf`, largo 2.259 del pack = 12.36 de mundo = 1.13 celdas):
- uno solo por cuerpo de agua ancha, y como mucho uno por tablero;
- en la celda de agua ancha que maximiza `dHex` a la orilla, desempate por `(q,r)`;
- sólo si esa celda tiene al menos 2 celdas de holgura interior (≥ 4 de través, unas tres esloras y media);
- girado con la tangente local de la orilla más cercana, para que parezca fondeado y no soltado.

**MUELLE:**
- en un vértice `V` cuyo `dVertice = 0` y que está a `dHex ∈ {3,4}` de un cuerpo de agua ancha (lago conservado, estuario o mar);
- el prop se coloca sobre la tesela de costa que queda entre el disco y el agua, orientado hacia el agua, sólo si esa costa tiene tirada `L ∈ {1,2}` (un muelle en un cabo o una península se ve mal);
- máximo 1 por cuerpo y 4 por tablero, ordenados por `A` del cuerpo y desempate por índice de vértice;
- **nunca sobre el cauce**, y nunca dentro del disco de aplanado (va en la costa, que está fuera por el veto).

**ESTUARIO.** Las subteselas de borde a `dHex ≤ 2` de la celda de boca se fuerzan a nivel 0 y forman una cala: la celda de boca queda flanqueada por dos o tres celdas de agua ancha, ancladas por su anillo de costa. Es lo que hace que el canal desemboque en un abanico y no se pare en seco. Ahí van el barco, el ancla y el muelle. Nunca dentro de un rellano: el veto lo impide por construcción.

**ACEÑA:** una por tablero como mucho, en una celda de cauce a `dHex ≤ 3` del centro de una comarca poblada. Es la señal más fuerte de que el río es de verdad y ya está compilada.

**RIBERA:** `waterlily_A/B` y `waterplant_A/B/C` en celdas de agua a `dHex ≤ 2` de la orilla, con `fraccion(q, r, canal(CANAL.ribera)) < PROB_RIBERA`. Nunca en la celda del barco ni en una celda con vado. En medio de una lámina grande se leen como fallo de textura; contra la orilla, como bajío.

**COSTURA:** `roca-b` obligatoria en los dos puntos de cada junta cauce-cuerpo (sección 4.10).

**CASCADA:** `roca-c/d/e` en las dos orillas de la celda de vertido y de la celda de abajo.

---

## 5. CASOS LÍMITE: QUÉ HACER

| Caso | Qué se hace |
|---|---|
| Ninguna boca, o `A` de la mejor boca `< CAUDAL_MINIMO_DE_BOCA` | `SECANO`. El módulo devuelve máscara vacía; `relieve`, `poblar` y `delta` siguen el camino de hoy sin una rama nueva |
| La rama principal no llega a `LONGITUD_MIN_DIBUJADA` tras calibrar | esa boca se descarta; si no queda ninguna, `SECANO` |
| El A* del cauce no encuentra ruta | esa rama pasa a vaguada; si era la única, `SECANO` |
| `round(w) - nivelTramo > CAVADO_MAXIMO` | TRUNCAMIENTO: cauce cortado, todo lo de arriba a vaguada |
| Se pediría una tercera cascada | esa rama se trunca en el punto de vertido |
| El extremo de arriba no es borde, ni lago, ni admite poza | acortar una celda y reintentar; por debajo de `LONGITUD_MIN_DIBUJADA`, la rama pasa a vaguada |
| `piezaDeCauce` recibe máscara de cardinal 1 | ERROR del generador. No puede ocurrir; la batería lo comprueba |
| `W` de una celda de tierra no es tirada contigua, o `L ≥ 5` | cierre morfológico fase A; si la celda es vedada, fase B (erosión) |
| El cierre no converge en `CIERRE_MAX_VUELTAS` | `SECANO` |
| La inundación de bancos pisa una celda vedada | reenrutar la rama una vez; si vuelve a pasar, degradar a vaguada |
| El agua total supera `MAX_INUNDACION` | degradar la rama menor a vaguada y recomputar |
| Una arista con cruce no admite pareja recta en `b ± 4` | prohibir esa ventana y reenrutar el cauce una vez; si falla, degradar la rama a vaguada. **Nunca se deja una arista sin cruce** |
| El camino muestreado toca agua o salta 2 niveles | A* de reparación (peldaño 2) |
| Un lago candidato toca `vedadoCuerpo` | se drena; no se pinta nada |
| Lago con lluvia baja y rebose alto | se conserva SIN desagüe: endorreico, orilla de salina |
| Subtesela de borde a nivel ≥ 1 | acantilado; el exterior NO cuenta como agua para su `W`; se decora con roca |
| Celda que es a la vez vado y senda | gana la pieza de vado (ya lleva las dos) |
| Dos cadenas de cauce a `dHex < 2` | prohibido en el A*; la segunda rama busca otra ruta o se degrada |

---

## 6. LO QUE HAY QUE TOCAR FUERA DEL MÓDULO

Cinco cambios, y ninguno es opcional. Si falta