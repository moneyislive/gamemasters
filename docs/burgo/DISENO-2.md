# EL BURGO — el diseño definitivo (2 de 3: la escena, los clientes, el lobby)

> Si algo de aquí no coincide con el código, gana el código. Parte 2 de
> [DISENO.md](DISENO.md) (§0–§4: qué es, irreversibles, reglas, vista, traducción); la
> parte 3 es [DISENO-3.md](DISENO-3.md) (§8–§12: comprobadores, fases, ficheros, riesgos,
> fuera de alcance). Todas las medidas de aquí están tomadas del `.glb` compilado con
> `@gltf-transform` (73 piezas, 62.833 triángulos, 2.822.452 bytes, un material, cero
> texturas) y de `escenas/modelos/dados.glb` (`dado`: 662 triángulos; 521 son vértices), y
> ninguna se supone: `verify:burgo-escena` las vuelve a sumar contra el fichero real.

---

## 5. La escena `escenas/burgo/`

Ficheros, todos HERMANOS del embarcadero y ninguno heredero de `escenas/delta.tsx` (que es
hexagonal y no sirve; de él se copian patrones internos: `Puesta`/`Copias` con
`computeBoundingSphere()` tras escribir matrices, `Luces` sin sombras, dados con refs +
`useFrame` + cola, asa invisible `colorWrite={false}`):

| Fichero | Importa `three` | Qué |
|---|---|---|
| `tipos.ts` | no | el contrato de props (§5.9) |
| `anillo-en-3d.ts` | no | geometría del anillo en unidades del mundo: sitio y bandas de cada casilla, huecos de peones/casas/bandera, polilínea de la marcha, muralla, plaza, esquinas; usa `shared/mecanicas/anillo.ts` |
| `presupuesto.ts` | no | `MULTIPLICIDADES` de un tablero LLENO (plena y sobria) y topes; lo suma `verify:burgo-escena` con el `.glb` real y lo importa `verify:burgo-modelos` |
| `coreografia.ts` | no | duraciones y curvas de cada suceso; la cola de sucesos como máquina pura |
| `peon.ts` | no | la máquina del aventurero que anda (fases, clip que toca, posición sobre la polilínea, rumbo) |
| `dados-del-burgo.ts` | no | hermana de `faseDeLosDados` que recibe el PAR de la vista; reutiliza las curvas de `escenas/dados.ts` |
| `camara-del-burgo.ts` | no | alcance, mirador de salida, límites de cercanía, «seguir al que mueve», poses por ventana |
| `tinte-del-burgo.ts` | sí | prepara las geometrías teñibles: `tenir()` por color para las de máscara parcial, gris de luminancia para `instanceColor` en las enteras |
| `Burgo.tsx` | sí | el componente: carga, mundo estático fundido, dinámicos instanciados, `useFrame`, toques; sólo `three` + React + núcleo r3f (sin drei, DOM, Expo, fetch) |
| `Aventurero.tsx` | sí | el clon con marioneta (de `escenas/aventureros/marioneta.ts`) y el disco de contacto |

### 5.1 Geometría del tablero (unidades del mundo; `y = 0` es el suelo del anillo)

```
ANCHO_DE_CASILLA = 8    FONDO_DE_CASILLA = 14    LADO_DE_ESQUINA = 14    CASILLAS_POR_LADO = 11
LADO_EXTERIOR = 9·8 + 2·14 = 100        MEDIO_LADO = 50
LADO_INTERIOR = 100 − 2·14 = 72         (la ciudad interior mide 72 × 72)
Bandas de una casilla lateral, desde el centro del tablero hacia fuera:
  acera de color    5,5   (y = 0,15; caja teñida del barrio; aquí se alzan las casas: 2 × 2 de 5,1 caben a escala 1)
  calle             3,5   (peones en rejilla 3 × 2 y el aventurero; su línea media está a 43,25 del centro)
  solar             5,0   (el edificio, mirando hacia dentro; puede desbordar hacia FUERA hasta 4: fuera no hay vecino)
La esquina es un cuadrado de 14 × 14 sin bandas; el punto de paso de la marcha es (±43,25, ±43,25).
```

**Orientación** (cámara de salida mirando desde +Z, o sea el lado sur es el más cercano): la
**Puerta Mayor (0)** es la esquina sureste (+43,25, +43,25); la marcha va hacia el oeste por
el lado sur (1–9: `x = 36 − 8k + 4`, `z = +43,25`), la **Mazmorra (10)** en la esquina
suroeste, sube por el oeste (11–19: `x = −43,25`, `z = 36 − 8k + 4`), la **Feria (20)** en
la noroeste, cruza el norte (21–29: `x = −36 + 8k − 4`, `z = −43,25`), **¡A la Mazmorra!
(30)** en la noreste y baja por el este (31–39: `x = +43,25`, `z = −36 + 8k − 4`). Es el
sentido de las agujas del reloj visto desde arriba, el del género, y coincide con «la puerta
más cercana» de las cartas. `sitioDeCasilla(i)` (de `anillo.ts`) devuelve el centro de la
CALLE y `cuartos` (0..3) de giro hacia fuera; la polilínea de la marcha son esos 40 puntos.
Todo con sumas: `l = floor(i / 10)`, `k = i − 10·l`, y una tabla de cuatro rotaciones de
cuarto `(x, z) → (−z, x)` aplicadas `l` veces. **Por qué esta orientación y no otra**: el
reglamento pone en las casillas 1–9 (el lado más cercano a la cámara de salida) los
edificios más bajos (caserón 6, tonel, verja) y en el este y el norte los altos (torre-b
13,6; iglesia 9; ayuntamiento), así que ninguno tapa la calle desde el punto de vista de
salida; y como el mirador gira, `MIRADOR_DEL_BURGO.rumbo = 0,35` (desde el sur, algo al
este) es sólo el punto de partida.

**Puestos dentro de una casilla**: seis huecos de peón en la calle (rejilla 3 × 2, paso 2,2
en `x` y 1,6 en `z`, ordenados por índice de asiento; el peón mide 1,27 × 2,33 a escala 1);
cuatro huecos de casa en la acera (2 × 2, paso 2,55); un hueco de posada centrado; el hueco
de la bandera de dueño en la esquina exterior-izquierda de la acera; el aventurero se pone
en el hueco de peón de su asiento desplazado 1,2 hacia el solar. En la Mazmorra, seis huecos
de PRESO dentro de la celda (rejilla 3 × 2 sobre las losas) y seis de VISITA en la franja
exterior de la esquina. `verify:burgo-escena` afirma que cada rejilla cabe en su banda con
la huella medida de la pieza.

**La ciudad interior** (72 × 72): una **ronda** de 7 con `arbol-a` × 12, `arbol-b` × 4,
`banco` × 4, `farola` × 2, y dentro la **muralla**, un cuadrado de ≈ 58 de lado: por lado
`muralla, muralla, puerta-muralla, muralla, muralla` (4 × 10,94 + 10,94 = 54,7) con
`esquina-muralla` en tres esquinas y `esquina-puerta` en la esquina sureste (la que mira a la
Puerta Mayor: la puerta grande del burgo); las cuatro puertas en los medios de los lados,
encaradas con las casillas 5, 15, 25 y 35, que son las puertas del juego (su acera lleva la
bandera del dueño y un `pendon` a cada lado con un `farol`; la puerta de verdad es la de la
muralla que tienen enfrente, a ± 0,5 de su eje, y `verify:burgo-escena` lo mide). Dentro de
la muralla, la **plaza**: `ayuntamiento` al norte (**el Concejo**: a él vuelan las monedas
que se pagan al Concejo y de él salen las que se cobran), `pozo` desplazado al oeste,
`mesa-redonda` × 2 con `silla` × 4 al este, y el **suelo de dados** (un cuadrado de 14 × 14
de losa clara, geometría propia de 2 triángulos) en el centro, donde caen los dos dados a la
vista de todos. Ni `mercado` ni `posada` (la taberna) en el tablero: van a la Plaza del
lobby (§7).

**Las esquinas**: **Puerta Mayor** = `estandarte` × 2 teñidos de ámbar del Concejo
(`#d9a441`) + `farol` + `lingotes` (el tesoro del que salen las monedas del pago al pasar) ≈
1.270 tri; **Mazmorra** = `losa` × 4 (2 × 2 = 12 × 12 dentro de 14 × 14), `muro` × 2 al
fondo, `muro-reja` × 2 hacia la calle (UNA es la reja que sube y baja), `muro-esquina`,
`pilar` × 2, `antorcha-pared` × 2, `cofre`, `tonel`, `llavero`, `pendon` ≈ 5.960; **Feria** =
`tablado`, `mesa-redonda`, `silla` × 2, `farola`, `almiar` × 2, `diana` ≈ 3.004 (sin
`tienda`, que se va a la Plaza del lobby: 2.452 que no caben); **¡A la Mazmorra!** = `verja`
× 2, `verja-puerta`, `antorcha` × 2, `farol`, `roca-a` × 2 ≈ 2.220.

**Los solares** (`EDIFICIO_DE_LA_CASILLA: Record<number, { pieza, giroEnCuartos, desplazamiento }>`
en `anillo-en-3d.ts`; `verify:burgo-escena` mide contra el `.glb` que ninguno pase de 7,6 de
frente ni de 9 de fondo):

| Casillas | Piezas (frente × fondo, triángulos medidos) |
|---|---|
| 1 Lodo, 11 Cera, 13 Bordadores, 27 Libreros, 34 Escribanos | `caseron` 4,78 × 6,01 (1.393) |
| 3 Corral de los Cabreros | `verja` × 2 + `almiar` × 2 (1.088) |
| 6 Tejedores | `tablado` + `tonel` × 2 (1.906) |
| 8 Tintoreros | `tonel` × 4 + `mesa-de-madera` (2.412) |
| 9 Ribera de los Curtidores | `muelle` girado: 2,73 de frente y 10,94 hacia fuera, colocado a `y = 0` tal cual (la cubierta queda a +2,43 y el pilotaje, que baja a −5,47, bajo el suelo); un plano de agua propio (4 tri, `#3d6f9a`) detrás, en el campo (958) |
| 14 Plazuela de los Ciegos | `banco` × 2 + `farola` + `arbol-a` (962) |
| 16 Herreros | `herreria` 7,04 × 6,81 (2.410) |
| 18 Caldereros, 19 Espaderos, 26 Plateros | `torreon` 5,08 × 6,08 (1.538) |
| 21 Mercaderes | `tienda` girada 7,36 × 8,29 (2.452) |
| 23 Plaza del Mercado | `tablado` + `caja-de-zanahorias` (2.536) |
| 24 Lonja | `tablado` + `mesa-redonda` × 2 (1.408) |
| 29 Cambistas | `vigia` 5,71 (1.490) |
| 31 Hospital | `ermita` 6,31 × 7,09 (1.075) |
| 32 Colegiata | `iglesia` 5,63 × 6,32 × 9,0 de alto (1.601) |
| 37 Plaza del Alcázar | `torre-a` 5,43 × 6,31 (2.138) |
| 39 Calle Mayor | `torre-b` 6,55 × 7,56 × 13,6 de alto (2.418): lo más alto del anillo, en la casilla más cara |
| 12 El Molino, 28 El Pozo (oficios) | `molino` (2.653; las aspas son un hijo con nombre y GIRAN en `useFrame`; minY −0,5, se sube 0,5), `pozo` (726) |
| 5, 15, 25, 35 (puertas) | `pendon` × 2 + `farol` (458) — la puerta grande es la de la muralla de enfrente |
| 2, 17, 33 (Arca) | `arca` (chest_gold) sobre la acera; 7, 22, 36 (Pregón): `tablado` pequeño; 4 (Diezmo), 38 (Alcabala): `cofre` + `lingotes` |

**Fuera del anillo, el campo**: `tesela` × 30 en dos coronas hexagonales aproximadas por
posición fija (1.080, una instancia), `colinas-a` × 2, `arboleda-pequena` × 2, `nube-grande`
× 1 y `nube-pequena` × 2 flotando a 28 de alto y derivando 0,3 u/s en `useFrame` (vuelven
por el otro lado). Sembrado con `semillaDelCodigo(codigo)` (decorado, NUNCA `ctx.azar`).

### 5.2 Presupuesto, con las cifras medidas (tablero LLENO: 6 sentados, 32 casas, 12 posadas, 28 banderas)

| Bloque | Cuenta | Triángulos |
|---|---|---|
| Suelo del anillo y aceras (geometría propia con `vertexColors`: 40 caras × 3 bandas + 4 esquinas + suelo de dados) | | 600 |
| Campo: tesela 30 × 36, colinas 2 × 383, arboleda 2 × 432, nube-grande 672, nube-pequena 2 × 366 | | 4.114 |
| Ronda: arbol-a 12 × 50, arbol-b 4 × 220, banco 4 × 172, farola 2 × 568 | | 3.304 |
| Muralla: muralla 16 × 504, puerta-muralla 4 × 820, esquina-muralla 3 × 414, esquina-puerta 796 | | 13.382 |
| Plaza: ayuntamiento 3.322, pozo 726, mesa-redonda 2 × 312, silla 4 × 428 | | 6.386 |
| Solares (tabla §5.1) | | 36.433 |
| Oficios y puertas: molino 2.653, pozo 726, 4 × (pendon × 2 + farol) 1.832 | | 5.211 |
| Esquinas: Puerta Mayor 1.270, Mazmorra 5.960, Feria 3.004, ¡A la Mazmorra! 2.220 | | 12.454 |
| **Estático** | | **81.884** |
| Casas 32 × 128 | | 4.096 |
| Posadas 12 × (casa 128 + bandera 48) | | 2.112 |
| Banderas de dueño 28 × 48 | | 1.344 |
| Peones 6 × 320 | | 1.920 |
| Discos de contacto 8 × 18 | | 144 |
| Dados 2 × 662 (`dados.glb`) | | 1.324 |
| Monedas en vuelo 6 × 320 | | 1.920 |
| Naipe 2, marca 36, cielo (esfera 24 × 12) 576 | | 614 |
| **Dinámico** | | **13.474** |
| **Tablero lleno sin aventurero** | | **95.358** |
| UN aventurero (exploradora, la peor) | | 8.900 |
| **Total plena** | | **104.258** |

Cabe en los 110.000 de `escenas/embarcadero/presupuesto.ts:24` con 5.742 de margen (lo
que la escena añade sin contar: la marca de casilla tocable, el cartel). Dos aventureros
serían 113.158: por eso la decisión 11. **Calidad `sobria`** (la decide `juzgarCalidad`,
extraída a `escenas/embarcadero/calidad.ts`: media > 22 ms sobre 120 fotogramas): sin campo
(−4.114), sin ronda (−3.304), sin aventurero (−8.900: el peón se desliza solo por la
polilínea a la misma velocidad), sin monedas (−1.920), plaza sin mesas ni sillas (−2.336):
**≈ 83.700**. `verify:burgo-escena` suma las DOS tablas de `presupuesto.ts` contra el
`.glb` real y falla por encima de 110.000 / 90.000; vacuna: una tabla con la posada =
taberna tiene que caer. Las cifras se IMPRIMEN siempre.

**Llamadas de dibujo** (tope 70; las llamadas no las exige ningún comprobador de la casa:
se miran en el banco con `gl.info.render`): el mundo ESTÁTICO —suelo, aceras, edificios de
solar, esquinas, muralla, plaza, campo— se aplana con `aplana` y se FUNDE con `fundir` de
`embarcadero/cargar.ts` en UNA geometría (el `.glb` trae un solo material) + UNA para el
suelo/aceras propio: **2 llamadas** (un `fundir` de ≈ 90 k vértices: ~40 ms en un móvil,
medido en el Muelle con seis barcos; se hace una vez, en el telón). Lo que cambia:

| Dinámico | Cómo | Llamadas |
|---|---|---|
| Casas (≤ 32) y las casas de posada (≤ 12) | UNA `InstancedMesh` de `casa` con `instanceColor`: la casa está TEÑIDA ENTERA (`PIEZAS_TENIDAS_ENTERAS`), así que la geometría se prepara una vez a gris de su luminancia relativa a `AZUL_DE_LAS_FICHAS` (`tinte-del-burgo.ts`, la misma cuenta que `colorTenido`) y el color de instancia pone el tono | 1 |
| Peones (≤ 6) | ídem, `peon` entero | 1 |
| Banderas de dueño (≤ 28) y de posada (≤ 12) | la `bandera` es de máscara PARCIAL (mástil): `instanceColor` teñiría el mástil. Una `InstancedMesh` POR COLOR con la geometría de `tenir()` (6 asientos + 1 ámbar del Concejo para la almoneda); a media asta si empeñada (otra matriz) | ≤ 7 |
| Discos de contacto (≤ 8) | `InstancedMesh` de un disco de 18 sectores, `meshBasicMaterial` | 1 |
| Aventurero (1) | clon fundido (`clonarAventurero`), un `AnimationMixer` | 1 |
| Dados (2) | `dados.glb` (`MODELO.dado`) o `cubo-del-dado.ts` de respaldo | 2 |
| Monedas en vuelo (≤ 6) | `InstancedMesh` de `moneda` | 1 |
| Aspas del molino | el hijo con nombre, girando (fuera del fundido) | 1 |
| Reja de la Mazmorra (2 `muro-reja` sueltos, uno se anima) | | 2 |
| Naipe de la carta | plano 3 × 4,2 con el color del mazo, pegado a la cámara, `renderOrder` = `ORDEN_DE_LAS_CARTAS` de `capas.ts`, `depthTest: false` | 1 |
| Marca de casilla tocable / destacada | anillo plano teñido del acento, `depthTest: false` | 1 |
| Agua del solar 9 | plano | 1 |
| Cielo, nubes | 1 + 1 (nubes instanciadas) | 2 |
| **Total** | | **≈ 24** |

Cada `InstancedMesh` llama `computeBoundingSphere()` tras escribir matrices (trampa del
descarte por frustum). Sin sombras en NINGÚN cliente (2048 baja un móvil de 60 a 20 fps):
disco de contacto bajo aventurero y peones, como el Muelle. `soltarTintes` al desmontar.

### 5.3 El peón y el aventurero (`peon.ts`, `Aventurero.tsx`)

Cada asiento tiene un peón (instancia) SIEMPRE en su hueco de casilla; el color es
`jugador.color`. Al llegar un suceso `mueve` para el asiento A:

1. Si hay un aventurero en pie de OTRO asiento: `despidiendose` (0,4 s de `reposo-a`
   desvaneciéndose por ESCALA 1 → 0, no por opacidad: un aventurero fundido no la tiene) y
   se desmonta ANTES de que nazca el de A (decisión 11: nunca dos a la vez).
2. Si A no tiene aventurero en pie, nace (`aparecer`, 1,3 s) en su hueco, 1,2 hacia el
   solar. Mientras nace, el peón de A se hunde 0,4 en 0,3 s: «lo recoge».
3. `recogiendo` (`recoger` cortado a 0,6 s) y el peón desaparece de la casilla.
4. `andando`: recorre `recorrido` por la polilínea. **Velocidad, con los clips como son**:
   ≤ 3 casillas → `andar` a `PASO_POR_SEGUNDO = 4` u/s (`escala.ts:155`; 2 s por casilla
   lateral de 8, 2,75 s por el tramo de 11 hacia una esquina); 4 o más → `correr` a 8 u/s
   (1 s por casilla); y UNA sola cota: **ningún recorrido dura más de 8 s**: si a 8 u/s no
   llega (más de 8 casillas), `timeScale` sube hasta 1,5 (12 casillas = 96 u = 8 s). En las
   esquinas la polilínea dobla 90°: giro con `giroCorto` (de `marioneta.ts`) amortiguado con
   `amortiguado(dt, 8)` sin parar la marcha. Al cruzar la Puerta Mayor: `saludar` superpuesto
   0,6 s sin detenerse y las monedas del Concejo (§5.7). `como: 'viaja'` (cartas «avanza
   hasta…» de más de 12 casillas): `usar` 1,6 s mientras brilla el naipe, escala 1 → 0 en
   0,4 s, `aparecer` en el destino. `como: 'retrocede'`: anda hacia atrás mirando en el
   sentido de la marcha (`andar` con `timeScale −1`), 3 × 2 s.
5. Al llegar: `salto` (1,167 s) y en el punto más alto el peón reaparece en su hueco
   cayendo 0,8 con `reboteDelDado` (0,35 s): «lo deja». Después `reposo-a` en pie, a 1,2 del
   peón, hasta el paso 1 del siguiente. Cada 6–11 s (sorteo con `semillaDelCodigo`) un gesto
   de espera: `reposo-b`, o `saludar` si le toca tirar a él.
6. `a-la-mazmorra`: `golpe` (0,667 s) donde está, se desvanece (0,4 s), la reja SUBE 4
   unidades (0,6 s), `aparecer` en su hueco de preso (1,3 s), la reja BAJA (0,6 s) ≈ 3,5 s.
   Sin viaje por la plaza: es más barato, más claro y no cruza edificios. `sale-de-la-mazmorra`:
   la reja sube, `salto`, y sigue el recorrido normal de la tirada (fianza/indulto: monedas o
   el naipe al fondo). `sigue-presa`: `golpe` contra la reja. De visita (cae en la 10 por la
   marcha): anda hasta el hueco de visita, sin reja.
7. `quiebra`: `golpe`, anda 14 unidades hacia FUERA del anillo cruzando su solar y se
   desvanece (0,8 s); su peón cae de lado (giro de 90° sobre `x`, 0,4 s) y desaparece; sus
   banderas cambian de tinte al acreedor con un giro de 180° o caen al suelo y se esfuman
   (Concejo), escalonadas 80 ms.

`peon.ts` es una máquina PURA hermana de `gestos.ts` (reloj y semilla por parámetro):

```ts
export type FaseDelPeon = 'quieto' | 'apareciendo' | 'recogiendo' | 'andando' | 'corriendo' | 'viajando' | 'saltando'
  | 'cobrando' | 'pagando' | 'alzando' | 'preso' | 'quebrando' | 'despidiendose';
export interface EstadoDelPeon {
  readonly fase: FaseDelPeon; readonly desde: number;
  readonly camino: readonly number[];      // casillas que quedan por pisar
  readonly enCasilla: number; readonly haciaCasilla: number; readonly u: number;   // 0..1 dentro del tramo
  readonly cola: readonly SucesoDelBurgo[];// sucesos pendientes de animar, en orden
  readonly semilla: number;
}
export function nacer(casilla: number, semilla: number, ahora: number): EstadoDelPeon;
export function encolar(e: EstadoDelPeon, sucesos: readonly SucesoDelBurgo[]): EstadoDelPeon;
export function avanzar(e: EstadoDelPeon, ahora: number, dt: number): EstadoDelPeon;          // la máquina
export function saltarLaCola(e: EstadoDelPeon, ahora: number): EstadoDelPeon;                 // todo a su sitio final
export function clipQueToca(e: EstadoDelPeon): { readonly clip: NombreDeClip; readonly bucle: boolean; readonly desde: number; readonly velocidad: number };  // nunca 't-pose'; si falta → 'reposo-a'
export function posicionYRumbo(e: EstadoDelPeon, anillo: AnilloEn3D): { readonly x: number; readonly z: number; readonly rumbo: number; readonly escala: number };
```

Comprobada en Node 10.000 pasos con los clips y duraciones reales de `DURACION`
(`gestos.ts:32`): nunca `t-pose`, nunca un clip que no exista, posición siempre a ≤ 1,5 de
la polilínea, doce casillas en ≤ 8 s, tres en ≤ 6,75 s, «a la Mazmorra» sin pisar casillas.
Las curvas de la escena (rebote, arco de monedas, back-out) pueden usar `Math.sin`/`Math.pow`:
esto es `escenas/`, no `shared/`. Un toque en el lienzo o en un botón **salta la cola**
(todo a su estado final en 0,2 s): la mesa no espera a la animación, y la revisión siguiente
puede llegar a mitad; la hoja enseña la vista nueva desde el primer fotograma.

El aventurero se carga con `cargadorPara(traer).aventurero(figuraQueSePinta(asiento.id,
asiento.figura))` y `.animaciones()` con la MISMA `traer` de módulo de cada cliente (la
caché es por identidad de la función: en la app la de `traer.ts`; en el escritorio UNA
exportada desde `muelle.tsx` para no estrenar caché de 1,7 MB). Se precargan al montar las
figuras de TODOS los sentados (memoria, no llamadas: sólo una está montada). Si
`animaciones.glb` no ha llegado, el aventurero NO se enseña (regla del Muelle: nunca T-pose)
y el peón se desliza solo. Riesgo abierto, heredado del Muelle: skinning en `expo-gl`
(huesos en `DataTexture` flotante, three 0.185) sin medida en iPhone físico; con UN mixer y
el peón como respaldo la partida se ve igual de clara.

### 5.4 Los dados (`dados-del-burgo.ts`)

Se reutilizan `dados.glb` (`MODELO.dado`, 662 tri, arista escalada con `aristaDelDado`),
`cubo-del-dado.ts` como respaldo (12 + 210 tri, `cuaternionDelValor`), y las curvas
`sacudida`, `saltoDelDado`, `anguloRodado`, `reboteDelDado`, `giroDelDadoAsentado` de
`escenas/dados.ts`, con `RODAR_MINIMO 0,6`, `ASENTAR 0,35`, `TOPE_SIN_RESPUESTA 6`. NO se
reutiliza `faseDeLosDados`: lee la SUMA (`dados.ts:356-360`) y `repartoDeLaTirada` (l.328)
inventa el par; aquí los dobles son regla. `faseDeLosDadosConPar` copia las tres fases
(`quieta`, `rodando`, `asentando`) y los cuatro sucesos (`tocado`, `tic`, `rechazado`,
`vista`) con:

```ts
export interface VistaDeLosDadosDelBurgo { readonly par: ParDeDados | null; readonly tirado: boolean; readonly sello: number; }
export function faseDeLosDadosConPar(estado: EstadoDeLosDadosDelBurgo, suceso: SucesoDeLosDados, ahora: number): EstadoDeLosDadosDelBurgo;
```

con la misma regla de «la primera vista nunca es nueva» y `[1, 1]` en reposo cuando `par ===
null`. Vacuna en `verify:burgo-escena`: cambiar el par y ver que cambia; una vista con un
solo número → `dadosEnTres` devuelve `null`. Los dados viven en el suelo de dados de la
plaza, arista 3 (desde la vista aérea miden ≥ 22 px en un móvil, `DADO_MINIMO`); el asa de
tocar es un cilindro invisible (`colorWrite: false`) de radio 5 sobre ellos, montado sólo
cuando `porTirar` (lo que no debe pulsarse SE DESMONTA: `visible=false` no quita el toque).
En el sorteo de salida ruedan en la plaza una vez por jugador y la marca se enciende en el
peón de `delanteDe`. Un doble se subraya: salto extra de 0,25 s y el aviso de la hoja lo
dice.

### 5.5 Las cartas

Al `carta`: desde la casilla del Pregón/Arca sube (0,4 s) un naipe de 3 × 4,2 del color del
mazo (Pregón ámbar `#c9a227`, Arca verde `#3f9a5a`), gira sobre su eje mientras se pega a la
cámara (`ORDEN_DE_LAS_CARTAS`, `depthTest: false`; ocupa el 28 % del alto en la parte
superior del lienzo para no tapar el anillo), se queda 2,4 s y vuelve a la casilla
encogiendo. **En el lienzo NO hay texto** (no hay fuente; sólo las cifras 2..12 de
`iconos.ts`): el título y el texto van a la hoja, sección «La carta» (`cartelEnTres`), y allí
se quedan hasta el siguiente turno. Si es un Indulto, el naipe no vuelve: va volando al peón
y aparece un icono en el marcador. Un toque en el naipe lo cierra. `cartas.ts`/`baraja.ts`
no encajan (son manos con familias); se toma de ellas la aritmética del hueco pegado a la
cámara.

### 5.6 La cámara (`camara-del-burgo.ts`) y la luz

Aérea, reutilizando `Mirador` + `Cercania` de `escenas/camara.ts` y `escenas/acercar.ts`,
compuestos con `ojoYMira` en el `useFrame` de cada cliente (giro con arrastre, rueda /
pellizco, botón derecho / dos dedos para pasear, como Riberas; `mirador-tactil.ts` en la
app, `CamaraAerea` en el escritorio). Constantes propias, todas pasadas por PARÁMETRO a las
funciones de `acercar.ts` tal como quedan tras la decisión 14 (nunca tocando sus
constantes):

```ts
export const ALCANCE_DEL_BURGO = 66;                       // MEDIO_LADO 50 × 1,32: el anillo entero cabe en 16:9 con `LEJANIA`
export const MIRADOR_DEL_BURGO: Mirador = { rumbo: 0.35, altura: (55 * Math.PI) / 180 };   // más alto que el delta (40°): hay que leer las aceras
export const LIMITES_DEL_BURGO = { masCerca: 0.15, masLejos: 1.25 };   // 66 × 0,15 ≈ 10: una casilla y sus vecinas llenando el lienzo
export const ALTURA_MINIMA_DEL_OJO_DEL_BURGO = 12;          // la de siempre: torre-b mide 13,6 pero es delgada
export const CERCANIA_DE_SEGUIMIENTO = 0.42;
export const CERCANIA_DE_ALMONEDA = 0.5;
export function poseDeSalida(ventana: Ventana): Cercania;   // retrato: `alejarseParaQueQuepa` retira el ojo; el anillo cabe en 9:19,5 con el lienzo al 58 % del alto
export function seguir(actual: Cercania, objetivo: { x: number; z: number }, dt: number): Cercania;  // amortiguado(dt, 3)
```

`verify:burgo-escena` afirma con `proyecta` (de `escenas/embarcadero/camara.ts`) que las
cuatro esquinas exteriores (± 50, ± 50) caen dentro del lienzo en 16:9, 3:4 y 9:19,5 con
`franjaInferior: 0` (en la app el lienzo va al 58 % del alto —mínimo 360— y la hoja es
HERMANA debajo, no encima: `riberas-en-tres-escena.tsx:266`), y que a `masCerca` una
casilla ocupa ≥ 45 % del alto.

**Seguir al que mueve**: al empezar un `mueve` la `Cercania` objetivo pasa a `{ factor:
0,42, centro: posición del aventurero }` y sigue amortiguada hasta que acaba el salto; 1,2 s
después vuelve a la cercanía que tenía el usuario. Cualquier gesto del usuario durante el
seguimiento lo cancela para ese recorrido. Un botón «Ver el burgo entero» (fuera del lienzo,
hermano del detector de gestos) vuelve a la salida y apaga el seguimiento hasta el siguiente
turno. En el sorteo, la cámara mira a la plaza (los dados). En la almoneda, encuadra la
casilla a 0,5. En `fin`, la pose cenital sobre la plaza.

**Luz y cielo**: mediodía como el delta y NO la hora azul del Muelle (es un tablero para
leer y el mediodía es lo que da contraste a las aceras): `directionalLight` desde (+1, 2,
+1,2) y `hemisphereLight`; sin sombras; cúpula `SphereGeometry(24, 12)` por dentro con
degradado por vértice (azul arriba, crema en el horizonte); niebla lineal de `alcance × 2` a
`× 4`. Sin sombreadores propios con tiempo: las antorchas parpadean con `Math.sin` en
`useFrame` sobre `intensity`, no en GLSL (un `tiempo * k` en `mediump` degenera a los
minutos y nadie lo ve).

### 5.7 Las coreografías, con su duración (`coreografia.ts`)

| Suceso | Qué se ve | Duración |
|---|---|---|
| `sale` (sorteo) | los seis peones caen uno a uno en la Puerta Mayor (rebote, escalonados 120 ms); por cada jugador los dados ruedan en la plaza y la marca se enciende en su peón; el ganador `saludar` | 0,9 s por jugador |
| `empieza` / `turno` | la marca de casilla destacada se desliza al peón del siguiente; si soy yo, un pulso y `saludar` de mi aventurero si está en pie | 0,4 s |
| `tira` | dados: `RODAR_MINIMO` + `ASENTAR`; dobles: salto extra | 0,95 s (+ 0,25) |
| `mueve` | §5.3 | ≤ 8 s + aparecer/recoger/salto |
| `cobra` / `paga` | 1–6 monedas (una por cada 50 mrs, tope 6) vuelan en arco (altura 6, `Math.sin`) del peón del pagador al del cobrador, o al `ayuntamiento` / desde él si es el Concejo, escalonadas 70 ms; `lanzar` (corte 0,6) / `recoger`; el marcador de la hoja interpola el dinero en 0,6 s. Los de un mismo movimiento se SOLAPAN a 200 ms (una renta de tres no dura seis segundos) | 0,9 s + 0,07 × n |
| `compra` / `almoneda-cerrada` con ganador | una `bandera` teñida cae desde 4 sobre el hueco de dueño y clava con rebote; el edificio «respira» (1 → 1,06 → 1) | 0,7 s |
| `almoneda-abierta` | la bandera ámbar del Concejo se planta y parpadea a 1 Hz mientras dure; la cámara la encuadra | 0,5 s |
| `puja` | `monton-pequeno` crece delante del peón del mejor postor | 0,3 s |
| `almoneda-cerrada` desierta | la bandera ámbar se hunde | 0,5 s |
| `alza` | cada casa brota desde escala 0 con back-out (sobrepaso 1,7) en su hueco, con `usar`; al pasar a posada las cuatro se hunden (0,3 s) y la casa con bandera brota | 0,45 s por casa |
| `vende` | la casa se hunde y unas monedas vuelan al peón | 0,4 s |
| `empena` / `desempena` | la bandera baja a media asta y la acera se apaga al 55 % de luminancia (color por vértice reescrito; nunca opacidad) / sube y recobra | 0,5 s |
| `carta` | §5.5 | 0,4 + 2,4 + 0,4 s |
| `a-la-mazmorra` / `sale-de-la-mazmorra` / `sigue-presa` | §5.3 | ≈ 3,5 s / 0,6 s + salto / 0,667 s |
| `trato` propuesto | una línea de 12 discos en el suelo entre los dos peones; la hoja abre «El trato» | mientras dure |
| `trato` aceptado | monedas y banderas cambian de sitio: las banderas de los títulos giran 180° cambiando de color | 1,0 s |
| `apuro` | el peón del deudor tiembla (`sacudida`) y su fila del marcador se pone en rojo; la hoja abre «Lo mío» con vender/empeñar | 0,6 s |
| `quiebra` | §5.3 | ≈ 2 s |
| `fin` | la cámara sube a plomo sobre la plaza, el aventurero del ganador aparece en el centro y `saludar` en bucle; llueven 24 monedas (`particulas.ts`) | 3,0 s |

La cola se reproduce en orden; ninguna animación decide nada; `verify:burgo-escena` afirma
que ninguna cola de un movimiento real (tirada + renta a tres + carta) dura más de 14 s y
que saltarla deja el estado final.

### 5.8 Dentro y fuera del lienzo

**Dentro** (se toca): las casillas (raycast sobre UNA malla instanciada de asas planas por
casilla con `instanceId → casilla`; nada de 40 mallas; la marca del acento se enciende en las
`tocable`), los dados, los peones (abre la ficha del jugador), el naipe (lo cierra). Sólo con
el botón primario (`noEsElPrimario`); todo manejador llama `laInterfazSeLoQueda()` LO
PRIMERO en la app; `mesa.quieto` es estado, no cerrojo (cada manejador lo vuelve a mirar).

**Fuera**: la hoja (móvil) y el raíl (PC), §6.3.

### 5.9 El contrato de props: `escenas/burgo/tipos.ts` (sin `three`)

```ts
import type { FiguraId } from '../embarcadero/figuras';
import type { Traer, Ventana, Calidad } from '../embarcadero/tipos';
import type { ParDeDados } from '../dados';
import type { SucesoDelBurgo } from '../../shared/arcade/juegos/burgo';   // import type: se borra al compilar; un solo vocabulario de sucesos

export type ClaseDeCasillaEn3D = 'salida' | 'solar' | 'arca' | 'diezmo' | 'puerta' | 'pregon' | 'mazmorra' | 'oficio' | 'feria' | 'a-la-mazmorra' | 'alcabala';

export interface CasillaEn3D {
  readonly indice: number;                  // 0..39
  readonly clase: ClaseDeCasillaEn3D;
  readonly colorDelBarrio: string | null;   // '#rrggbb' de la acera, o null
  readonly dueno: string | null;            // '#rrggbb' del dueño, o null (el Concejo)
  readonly casas: number;                   // 0..4; 5 = posada
  readonly empenada: boolean;
  readonly enAlmoneda: boolean;
  readonly tocable: boolean;                // hay una opción al tocarla: la marca se enciende
}

export interface FiguraEn3D {
  readonly asiento: string;
  readonly color: string;                   // '#rrggbb' del peón y del disco
  readonly figura: FiguraId;                // ya resuelta con figuraQueSePinta; la escena decide cuántas monta (hoy: una)
  readonly casilla: number;
  readonly presa: boolean;
  readonly quebrada: boolean;
  readonly esLocal: boolean;
  readonly leToca: boolean;
}

export interface DadosDelBurgoEn3D {
  readonly par: ParDeDados | null;
  readonly tirado: boolean;
  readonly sello: number;
  readonly porTirar: boolean;               // el asa se monta
  readonly delanteDe: string | null;        // sorteo: asiento cuya marca se enciende; null = la plaza
}

export interface TableroDelBurgoEn3D {
  readonly casillas: readonly CasillaEn3D[];   // 40; LA MISMA lista por identidad si la firma no cambió
  readonly figuras: readonly FiguraEn3D[];     // en orden de asiento
  readonly destacada: number | null;           // casilla de quien tiene el turno
  readonly almoneda: number | null;
  readonly carta: { readonly mazo: 'pregon' | 'arca'; readonly enCasilla: number; readonly jugada: number } | null;
  readonly trato: { readonly de: string; readonly a: string } | null;
  readonly ganador: string | null;
}

/** El segundo modo está RESERVADO: hoy la escena ignora el valor y lo dice en cabecera. `peon.ts` ya da {x, z, rumbo} por fotograma. */
export type ModoDeCamara = { readonly modo: 'aerea' } | { readonly modo: 'tercera-persona'; readonly asiento: string };

export interface PropsDelBurgo {
  readonly tablero: TableroDelBurgoEn3D;
  readonly dados: DadosDelBurgoEn3D | null;
  /** Lo que acaba de pasar: `jugada` sube con cada vista nueva; la escena reproduce lo que no ha visto (sucesosEnTres). */
  readonly sucesos: { readonly jugada: number; readonly lista: readonly SucesoDelBurgo[] };
  readonly codigo: string;                  // semilla del DECORADO (semillaDelCodigo); nunca la del azar
  readonly ventana: Ventana;                // franjaInferior 0: la hoja no tapa el lienzo
  readonly traer: Traer;
  readonly calidad: Calidad;
  readonly camara: ModoDeCamara;
  readonly seguirAlQueMueve: boolean;
  readonly quieto: boolean;                 // un movimiento en vuelo: las asas no mandan
  readonly alTocarCasilla?: (indice: number) => void;
  readonly alTocarLosDados?: () => Promise<'hecho' | 'rechazado' | 'sin-red'>;
  readonly alTocarFigura?: (asiento: string) => void;   // abre la ficha del jugador (tratos)
  readonly alEstarListo?: () => void;       // SIEMPRE una vez, con o sin modelos, tope 15 s (contrato del Muelle)
  readonly alFallar?: (motivo: string) => void;
  readonly alMedir?: (m: { triangulos: number; llamadas: number; ms: number; fotogramas: number }) => void;   // una vez por segundo
  readonly alTerminarLaCola?: () => void;   // la escena ya está en el estado final de la vista
}
```

---

## 6. Los dos clientes

### 6.1 App (Expo: web y nativo)

- `app/src/arcade/burgo-en-tres.tsx` (≈ 70 líneas): `const LaPantalla = lazy(() =>
  import('./burgo-en-tres-escena'))` en ÁMBITO DE MÓDULO; `ElBurgoEnTres` con `Suspense`
  gris (`SALA.suelo`, `SALA.tenue`, `LETRA.rotuloChico`, «Preparando el burgo…»). Sin
  importar `three`.
- `app/src/arcade/burgo-en-tres-escena.tsx` (`export default`): copia de la arquitectura
  de `riberas-en-tres-escena.tsx`: `useLocalSearchParams`, `usarMesaDeArcade(BURGO)`,
  vestíbulo con `ESTILOS_DE_LA_MESA` + `PLAZOS` y ramas `'yendo'`/`'fuera'`; catálogo
  cacheado en módulo con `recordada` (`traer(rutaDelBurgo())` → `abrirGlb` →
  `catalogoDeModelos`, SIN complemento de texturas: el glb va horneado; y
  `traer(rutaDeLosDados()).catch(() => null)` ANTES del `Promise.all`, `unirCatalogos`);
  `RedDelLienzo` (clase con `getDerivedStateFromError`) obligatoria alrededor del `Canvas`
  de `../tres/Lienzo`; `LaMesaEnTres` como componente aparte con TODOS los hooks antes de
  cualquier `return` (`altoDelLienzo = max(360, round(alto × 0,58))`, lo cogido se suelta en
  `useEffect(..., [vista.rev])`, `datos = useMemo(tableroEnTres(...))` con
  `firmaDelTablero`, `usarMiradorTactil(medida, ALCANCE_DEL_BURGO)`); `<Canvas
  gl={{antialias:true}} dpr={[1,2]} shadows={false} camera={{fov:45, near:0.5, far:
  alcance*16}}>` con `ACESFilmicToneMapping` 1,05; `<Ojo/>` con `ojoYMira(cercania.current,
  ALCANCE_DEL_BURGO, (d) => ojoDelMirador(m, d, proporcion), ALTURA_MINIMA_DEL_OJO_DEL_BURGO)`;
  `<Burgo …/>` de `escenas/burgo/Burgo.tsx`; telón mientras `'llegando'`; botón «Ver el burgo
  entero» y las hojas modales HERMANAS del `GestureDetector`; pie `<ScrollView>` con la hoja
  (§6.3), `<LasOpciones opciones={fuera}/>` sólo si `hayAlgoQuePintar(fuera)` y
  `<LaCronica/>`; `respaldoSobreElRetablo(nota)` función local SIN hooks con `<Retablo
  tablero={tableroDeLaVista(vista)} alTocar={mesa.mover} quieto/>` y `opcionesSueltas`,
  usada si `datos === null`, el lienzo cayó o el catálogo falló. `Platform.OS` NO aparece
  (ni en `shadows`: van a `false`). Manejadores: `laInterfazSeLoQueda(); if (mesa.quieto)
  return; mesa.mover({ tipo: o.tipo, carga: o.carga })` con la opción ENTERA;
  `alPulsarLosDados` devuelve `mesa.mover(tirarEnTres(opciones))` para cortar el rodar.
- `app/src/arcade/hojas-del-burgo.tsx`: las secciones de `hojaEnTres` pintadas con
  `Pressable`/`Text` sobre `Pantalla` de `piezas.tsx`, sin lógica propia.
- `app/src/arcade/pintados.ts`: fila `[BURGO]: ElBurgoEnTres` en `LOS_QUE_PINTA` (clave
  CONSTANTE importada de `'../../../shared/arcade/juegos'`). Ruta: `/tablero?arcade=burgo`;
  no se toca `_layout.tsx` ni ninguna ruta (`typedRoutes`).
- `app/src/comprobadores/verificar-sala.mjs`: `BINARIO.juegos` (l.78) += `'burgo'`; el
  bucle de constantes (l.282-284) += `'BURGO'`; `COMPROBACIONES_ESCRITAS` (178) al número
  real. Correr en `app/`: `npm run verify:sala`, `verify:gramatica`, `verify`, `npx tsc
  --noEmit` (TS ~6.0.3: un `satisfies` que acepte el server puede no aceptarlo aquí).
- Trampas propias: `Gesture.Pan().manualActivation(true)` sin `.runOnJS(true)`; Skia sólo
  tras `React.lazy` (`verify:canvaskit`); ninguna constante de módulo nombra otra declarada
  más abajo; `flex: 1` con suelo en la caja del lienzo; `accessible` en la View del Canvas
  hace inalcanzable lo de dentro.

### 6.2 Escritorio (Vite)

- `escritorio/src/pintores.ts` (NUEVO; decisión 18):

```ts
export interface PintorPropio {
  readonly Pintor: ComponentType<LoQueVeElPintor>;
  readonly Marcador?: ComponentType<{ vista: unknown; yo: string | null }>;
  readonly panelesDe?: (paneles: readonly PanelDeTablero[], vista: unknown) => PanelDeTablero[];
  readonly pregonDe?: (vista: unknown) => string | null;
}
export const PINTORES_PROPIOS: Readonly<Record<string, PintorPropio>> = {
  [RIBERAS]: { Pintor: RiberasEnTres, Marcador: MarcadorDeRiberas, panelesDe: …, pregonDe: … },   // lo que hoy está en sala.tsx L604/640/698/718-727/801
  [BURGO]: { Pintor: BurgoEnTres, Marcador: MarcadorDelBurgo, panelesDe: panelesDelBurgoFueraDeLaHoja, pregonDe: elPregonDelBurgo },
};
```

  `RIBERAS`/`BURGO` se importan de `shared/arcade/juegos/riberas` y `/burgo` (no del índice,
  que instala). `sala.tsx` sustituye sus cinco puntos por lecturas de la tabla CONSERVANDO
  literalmente `<aside className="rail" aria-label="El carril de la mesa">{elRail}</aside>`,
  `railCon(true/false)`, `foco={apuntarElLienzo}`, `elRail={elRailDelCajon}` y el cuerpo de
  `apuntarElLienzo`; en el MISMO commit se actualizan las regex de
  `verificar-escritorio.tsx` que nombran `<RiberasEnTres`, `<MarcadorDeRiberas` y
  `panelesFueraDelPregon(panelesEnTres(...), elPregonSePinta)` (l.4400-4437, 5195-5225,
  6610), y sube `COMPROBACIONES_ESCRITAS` (719) al número real.
- `escritorio/src/lienzo-propio.tsx` (NUEVO): lo genérico que hoy es PRIVADO de
  `riberas-en-tres.tsx`, COPIADO y no movido (sus regex lo atan; Riberas no se toca en esta
  fase): `recordada`, `traerUnGlb`, `usarLosModelos(hazFalta, traer)` (renombrado:
  `usarElCatalogo` choca con `catalogo.tsx`), `LimiteDelMundo`, `CamaraAerea` parametrizada
  `{ recuadro, seDesplazanSolas, velo }`, `usarLaTrampaDeFoco` (importando
  `armarUnaTrampa`/`mandaEstaTrampa` de riberas-en-tres.tsx: la pila de trampas es UNA),
  `ElijeUna`, `pasosDeLaRueda`, `raizDelNavegador`.
- `escritorio/src/burgo-en-tres.tsx`: `LoQueVeElBurgo` con LA MISMA forma que
  `LoQueVeRiberas` (`{ manifiesto, mesa, puesta, tablero, opciones, foco?, elRail?, laSalida? }`)
  y `BurgoEnTres(props)`, `MarcadorDelBurgo({ vista })`. Orden del cuerpo calcado de
  `RiberasEnTres`: `datos` con firma; estados de «lo que tengo en la mano» + `soltarTodo` en
  `useEffect(..., [puesta.rev])`; cribas → `fuera`; `[lienzo, ponerLienzo]` +
  `medirElRecuadro` ref-callback que llama `foco?.(recuadro)` ANTES de `if (recuadro === null
  || typeof ResizeObserver === 'undefined') return`; `usarLosModelos(seVeEnTres(vista))` sólo
  en `useEffect` (`fetch(rutaDelBurgo())` + `GLTFLoader.parseAsync(bytes, '')`); `cercania`
  en ref + «Ver el burgo entero»; `semilla = semillaDelCodigo(puesta.codigo)`; salidas: sin
  caras → `<Formulario titulo="Lo que puedes hacer"/>`; respaldo (`!seVeEnTres || fallo ||
  datos === null`) → `<p class="letra-chica burgo-sin-mundo">` + `<Retablo/>` +
  `<AccionesDelTablero/>` + `<Formulario titulo="Y además puedes" atajos={false}/>`; render:
  `div.burgo-en-tres > div.burgo-lienzo.lienzo-propio` (ref, `tabIndex=-1`, `role=group`,
  `aria-label`) con cinta (`laSalida`, `<span role="timer">`, `<p aria-live="polite">
  {tablero.aviso}</p>` UNA sola vez, ficha que abre el cajón), cajón modal (velo + `role="dialog"
  aria-modal` + `<Formulario opciones={fuera} atajos={false}/>` + `{elRail}`,
  `usarLaTrampaDeFoco`), y `conMundo = typeof window !== 'undefined' && modelos !== null ?
  <LimiteDelMundo><Canvas shadows={false} dpr={[1,2]} gl={{antialias:true}} camera={{fov:45,
  near:0.5, far: alcance*8}}>…<CamaraAerea …/><Burgo …/></Canvas></LimiteDelMundo>` + botones
  `.burgo-solo-apoyo` («Tirar los dados» para lector de pantalla, `clip-path: inset(50%)`,
  nunca `display:none`) : `<div class="burgo-telon" aria-busy>` con `manifiesto.nombre`.
  `CAMPO_DE_LA_CAMARA = 45°` = `fov`. Botones que se apagan con foco: `aria-disabled`, nunca
  `disabled`.
- `escritorio/src/hojas-del-burgo.tsx`: las secciones de `hojaEnTres` en el cajón/raíl con
  `<section>`/`<button>`; el componedor de trato y la puja libre (campo numérico con
  `inputmode="numeric"`, múltiplos de 10, tope mi dinero) montan con `montar()`.
- `escritorio/src/estilo.css`: reglas `.burgo-*`, `.burgo-lienzo { height: 62vh; touch-action:
  none }` (lo que ruede por dentro: `touch-action: auto` y en `SE_DESPLAZAN_SOLAS`); la
  cadena de pantalla completa pasa de `.sala:has(.riberas-lienzo)` a `.sala:has(.lienzo-propio)`
  (clase en los DOS recuadros), actualizando `RAIZ` (l.4179) y los seis eslabones que
  `laPaginaDePie` busca con `reglaDe`. Colores COPIADOS a CSS, no importados de `app/`
  (`verify:fronteras`). Gramática: apagados con la clase quieta, nunca `opacity`; nunca
  blanco sobre acento; cuerpos ≥ 13 px.
- `escritorio/src/muelle.tsx`: exporta su `traer` para que el tablero comparta la caché de
  aventureros.
- `escritorio/banco-burgo.html` + `escritorio/src/banco-burgo.tsx` (copiados de
  `banco3d.html`/`banco3d.tsx`): tablero FIJO montado a mano (`?jugadores=6&lleno=1&semilla=`),
  `?url` de Vite para el glb (`glb.d.ts`), contador de triángulos/llamadas por `alMedir` y
  `gl.info.render`, botones que inyectan cada suceso de §5.7, y «reproducir diario» que lee
  un JSON de `verify:burgo` para ver una partida entera animada. Es el ÚNICO sitio donde se
  juzga que SE VE; ningún comprobador lo dice, y por eso existe `verify:burgo-escena`. Se
  abre en `http://localhost:5175/sala/banco-burgo.html`.
- `escritorio/scripts/verificar-escritorio.tsx`: bloque `burgoEnTres()` copiando
  `riberasEnTres()` (l.1403-1600) y registro en l.7797-7818: renderiza con
  `renderToStaticMarkup` en Node (sin `window`, `ResizeObserver` ni límites de error) y exige
  sin `<canvas>`, telón con `manifiesto.nombre`, cero `<svg>` cuando cabe, `tablero.aviso`
  presente, cada opción exactamente una vez entre escena y botones, respaldo con mesa reunida
  y con el catálogo caído.
- `.claude/launch.json` del worktree del Burgo: `burgo-server` (`npm run dev -w server`,
  5174), `burgo-escritorio` (`npm run dev -w escritorio`, 5175), `burgo-movil` (`npm run web
  --prefix app`, 8081). En PowerShell `$env:GM_API_URL='…'`; la forma `VAR=x cmd` no pone nada.

### 6.3 La interfaz fuera del lienzo: la hoja (móvil) y el raíl (PC), pantalla a pantalla

Las MISMAS secciones que sirve `hojaEnTres`, en este orden, pintadas por cada cliente con
sus widgets y sin lógica propia. La sección abierta se recuerda por mesa (bolsillo /
`localStorage`), pero **«Ahora» salta arriba cuando cambia `paso` y me toca**.

1. **Cinta** (siempre visible, `ALTO_DE_LA_CINTA 44`): «‹» salir, código de mesa, reloj del
   plazo (`cuantoQueda`), el aviso en `aria-live="polite"` (una sola región viva por
   pantalla), y **mi dinero** con mi color. En PC la cinta va sobre el lienzo; en el móvil,
   `BarraDeLaMesa` + `LineaDelTurno` + `ElAviso` de `tablero-en-linea.tsx`.
2. **Marcador** (fila horizontal desplazable): por jugador, disco de color, nombre, mrs,
   nº de títulos, icono de Indulto, «presa» / «quebró», y el marco del acento en
   `duenoDelTurno` (y un punto en `turnoDe` si es otro: «puja Bea»). Tocar un jugador abre
   su ficha (sus títulos y «Proponer trato» si procede).
3. **Ahora**: los botones del momento (`opcionesFueraDelTablero`): «Tirar» (también está en
   los dados; el filtro lo quita cuando los dados están montados), «Comprar por 180 mrs» /
   «Dejar en almoneda», «Pagar 50 y salir» / «Usar el Indulto» / «Probar con los dados»,
   «Pasar el turno», «Declararse en quiebra» (siempre al final, con confirmación). En
   almoneda, la **puja**: la cifra actual, quién va ganando, quiénes siguen en pie,
   «Pujar N» (mínimo) / «+50» / «+100», un campo numérico (múltiplos de 10, tope mi dinero,
   monta por la puerta) y «Pasar». En apuro: la deuda en rojo, «te faltan N mrs» y los
   botones de vender/empeñar de «Lo mío» subidos aquí.
4. **La carta** (cuando hay `ultimaCarta` de este turno): título grande, texto, quién la
   sacó.
5. **El trato**: los abiertos con «Da / Pide» y «Aceptar» / «Rechazar» (si soy `a`) o
   «Retirar» (si soy `de`); y el **componedor** (si hay puerta): con quién (fichas del
   marcador), lo que doy (mis títulos sin edificios, mrs de 10 en 10, Indultos) y lo que
   pido; «Proponer» monta con `tratoEnTres.montar`.
6. **Lo mío**: mis títulos agrupados por barrio con su color, casas (■■■■ / posada),
   «empeñado», y por título los botones que `opciones` ofrezca (alzar con precio, vender,
   empeñar con lo que da, desempeñar con lo que cuesta). La **ficha de una casilla** (al
   tocarla en el lienzo o en el retablo) es la misma tarjeta: nombre, barrio, precio, tabla
   de rentas con la fila actual destacada, dueño y estado.
7. **La mesa**: dinero y patrimonio de todos, casas y posadas que quedan en el Concejo,
   cartas que quedan en cada mazo, vueltas y el tope si lo hay.
8. **La crónica** (`LaCronica` de la app / el raíl del escritorio), con los `pregon` de cada
   vista.

Estilo: `SALA`/`LETRA`/`BOTON`/`RADIO` en la app y `estilo.css` en el escritorio; botones
apagados con `BOTON.quieto`, nunca `opacity`; nunca `SALA.blanco` sobre `SALA.acento`;
`fontSize` ≥ 13; mínimo tocable 44; nunca `useTema()` (`verify:gramatica`).

### 6.4 Compartido entre los dos y servido por el servidor

Todo lo que no es DOM ni Expo: `shared/arcade/juegos/burgo-en-tres.ts`, `escenas/burgo/*`,
`escenas/{camara,acercar,dados,cubo-del-dado,capas,cinta,modelos,ruta-de-modelos}.ts`,
`escenas/embarcadero/{cargar,tinte,figuras,gestos,particulas,calidad}.ts`,
`escenas/aventureros/marioneta.ts`. Los textos de hoja salen de `burgo-en-tres.ts`
(funciones puras), no de los `.tsx`. El modelo: `router.get('/arcade/modelos/burgo.glb',
(_req, res) => { if (carpeta === undefined) { faltaLaCarpeta(res); return; } servir(res,
carpeta, 'burgo.glb'); })` en `server/src/routes/modelos.ts` (detrás de `dados.glb`, l.207)
y `rutaDelBurgo()` en `escenas/ruta-de-modelos.ts`; `verify:burgo-en-tres` lo pide por HTTP
(200, `model/gltf-binary`, bytes == fichero). `escenas/burgo/` ya entra en Metro
(`watchFolders = [shared, escenas]`, `UNICOS` con three/react/fiber) y en Vite (`dedupe`):
CERO dependencias nuevas.

---

## 7. El lobby: tema y paisaje, con lo que se reutiliza

**Decisión 19: la primera versión reutiliza El Muelle con textos y colores del Burgo; la
Plaza del Burgo va en la última fase, opcional, y NO bloquea publicar.** `tema.ts`
parametriza SÓLO tres frases y los colores; `Embarcadero.tsx:830` llama `generarCala` y
`:975` `cargador.embarcadero()` en seco; `muelle-escena.tsx:337` y `escritorio/src/muelle.tsx:288`
montan `<Embarcadero>` sin mirar el tema. Un paisaje propio son ~1.800 líneas + 600 de
comprobador que no mejoran la PARTIDA.

```ts
const BURGO: TemaDelMuelle = {
  arcade: 'burgo',
  lugar: 'A las puertas del Burgo',
  espera: 'Las puertas se abren cuando estéis todos.',
  zarpar: 'Se abre el Burgo',
  colonos: ['#f2e8cf', '#26262e', '#7d3fd6', '#2fe0d0', '#ff8f6b', '#c5e84a'],   // = COLORES_DEL_BURGO de burgo.ts, copiados y no importados
};
```

- `escenas/embarcadero/tema.ts`: la fila `[BURGO.arcade]: BURGO` en `TEMAS`. Con eso
  `tieneMuelle('burgo')` es verdad y `rutaDeArcade` manda a `/muelle?arcade=burgo` (regex de
  `verify:sala:431-486`: no se toca `rutaDeArcade`, `rutaDelMueble`, `haEmpezado`,
  `opcionDeEmpezar` ni `_layout.tsx`).
- `escenas/scripts/verificar-embarcadero.ts`: gana un bloque que extrae `COLORES_DEL_BURGO`
  de `burgo.ts` con la MISMA regex que usa con `COLORES_DE_COLONO` (`readonly string[] = [`)
  y exige igualdad con `temaDelMuelle('burgo').colonos`; `COMPROBACIONES_ESCRITAS` (72) + 3.
- `escritorio/scripts/verificar-escritorio.tsx:1222-1226`: «Riberas tiene muelle y el resto
  no» pasa a «los que tienen muelle son exactamente `['burgo', 'riberas']`», y se añade el
  `renderToStaticMarkup(<Muelle manifiesto={burgo} …/>)` en la orilla y dentro.
- Reglas que el juego cumple para el Muelle: la opción de arranque se llama `'empezar'`
  (`opcionDeEmpezar`: la hoja móvil sólo enseña ese botón; sin él NADIE puede empezar); el
  color del jugador sale del ORDEN de asiento con la misma regla que `colorDeAsiento`; nunca
  se zarpa al pulsar, sólo cuando llega `empezada: true` (`haEmpezado`).
- **El paso del lobby al tablero**: `empezada: true` por el sondeo → coreografía de zarpar
  (3,2 s, toque salta) → `router.replace(rutaDelMueble(manifiesto))` en la app /
  `alDesembarcar` en el escritorio → la pantalla del tablero abre con telón hasta
  `alEstarListo` (SIEMPRE, tope 15 s); la cámara nace sobre la Puerta Mayor a 0,5 y en 1,4 s
  se abre a la pose de salida; mientras, los peones caen en la Puerta Mayor y los dados del
  sorteo ruedan (sucesos `sale`). Como el sorteo ya está resuelto dentro de EMPEZAR, el primer
  fotograma jugable es «Le toca a Ana: tira».
- **La Plaza del Burgo** (fase 8, opcional): escena hermana `escenas/plaza/Plaza.tsx` que
  cumple el MISMO `PropsDelEmbarcadero`; `readonly escena: 'embarcadero' | 'plaza'` en
  `TemaDelMuelle` y un `switch` por tema DENTRO de `ElMuelleDe` (`muelle-escena.tsx`, con
  `lazy`) y de `escritorio/src/muelle.tsx` (tras `typeof window`); `cargadorPara` gana
  `burgo()`; hereda `gestos.ts` («llegando» = entrar andando por la `puerta-muralla`;
  «zarpando» = salir corriendo hacia el anillo), `camara.ts`, `cargar.ts`, `tinte.ts`,
  `particulas.ts`; las piezas salen de `burgo.glb` SIN recompilar (muralla, puerta, taberna
  `posada`, `tienda`, `mercado`, mesas, sillas, farolas, banco, verja: por eso están en la
  tabla); seis puestos fijos alrededor de la `mesa-redonda` medidos con `proyecta` en 9:19,5
  (franja 0,36), 3:4 (0,3) y 16:9 (0) × 1,2,4,6 ocupados (separación ≥ 0,12), 10.000 pasos
  de gestos sin t-pose, presupuesto con seis exploradoras < 110.000; `verify:plaza`, banco
  `plaza3d.html`. `alZarpar` coincide con el telón del tablero, que abre con la cámara en la
  Puerta Mayor: continuidad.

Sigue en **[DISENO-3.md](DISENO-3.md)**: §8 comprobadores y batería, §9 fases, §10 ficheros,
§11 riesgos, §12 fuera de alcance.
