# EL DETALLE DE LA CIUDAD: plan de obra (ARCHIVADO)

> **Estado: archivado el 26-sep-2026 por decisión de Miguel.** Las olas 1 y 2 están hechas e integradas en la rama
> `matrix`; las olas 3 y 4 quedan **por hacer**, «para mejorar cuando tengamos más tiempo». Miguel vio que las mejoras
> visuales de la ciudad no compensaban el tiempo frente a la jugabilidad (el rayo y los botones, `docs/quiebro/EL-RAYO.md`).

## Qué está hecho

- **Ola 1 (base, sin cambio visible)**: `fachadas.ts` partido en `fachada/`; la ciudad partida en escritores que ceden
  por trozos, grados de celda (`grados.ts`), capas (`capas.ts`, `capas/`), `lo-cercano.ts` neutro; la **materia**
  analítica (`ciudad/materia/`: ruido de 128 px con el PCG de `hash.ts`, juntas, grano, familias por fichero); primitivas
  de oficio en el `Molde` (torno, caja biselada, seccionado, cornisa); el banco de fotos (`escritorio/scripts/fotos/`:
  `foto.sh`, `protocolo.sh`, `hoja.mjs`, `POSICIONES.md`); comprobadores nuevos (`verify:quiebro-gl`,
  `verify:quiebro-materia`, `verify:quiebro-molde`, y ampliaciones de `verify:quiebro-ciudad` y `-calidad`); la sombra
  pasa a `PCFShadowMap`.
- **Ola 2 (visible)**: paredes con materia y envejecimiento; suelo con materia, bordillos, vados y tapas; mobiliario con
  familias (banco, fuente, quioscos, cabina con su auricular ámbar); farolas de fundición, árboles con copa y piezas;
  coches por loft en cinco carrocerías y cuatro grados, tren y viaducto.

## Qué queda (olas 3 y 4, §6 del plan de abajo)

- **Ola 3**: O3-SILUETA (bajos, balcones, cornisas, ritmo, azoteas, soportal y voladizos: el paquete más grande),
  O3-LEJANO (ciudad lejana, suelo lejano, luces lejanas, hitos: el reloj de la Glorieta va sobre un edificio),
  O3-NEONES (tubo con volumen, luz pintada, pantallas de la Grafía), O3-LUZ-EN-EL-AIRE (halos con forma, haces, vapor,
  horizonte local), O3-LO-CERCANO (el coche que sube a g4 a 2-5 m).
- **Ola 4**: O4-HORNO (micro-relieve en GPU en N2-N3), O4-SEMAFOROS-Y-CABEZAS (rojo y verde amarillento, sin ámbar;
  apagados en el Apagón), O4-REMATES-Y-SOMBRAS, O4-CIERRE (volver a medir, apretar el libro, fotos finales).
- **Cabos sueltos apuntados**: ver el acta (§13, §13.1, §13.2 al final), p. ej. el negro puro de noche en lo que da la
  espalda a las farolas (falta un suelo de luz ambiente), la farola de pared metida en un balcón en N3, la cabecera de
  `grados.ts` que aún habla de `cochesFinos`.

## Cómo retomarlo

1. Un worktree por paquete desde `matrix` (`git worktree add`, `core.autocrlf=false` por worktree, `node_modules` con
   `robocopy`), cada uno con su vite en un puerto propio (`launch.json`: las entradas `detalle-*`; como mucho cinco
   servidores a la vez).
2. La tanda de fotos «antes» NO está en el repositorio (vivía en el scratchpad de la sesión): se rehace con
   `PUERTO=<vite> bash escritorio/scripts/fotos/protocolo.sh <carpeta>` sobre el `matrix` de ese momento, con la base
   de `POSICIONES.md` (lleva `reloj=`).
3. Las rutas `scratchpad/…` de abajo (auditorías, prototipos de `mat-analitico/`, `mat-horno-gpu/`, fotos) eran de la
   sesión y ya no existen. Las decisiones que contenían están en este documento.
4. La batería entera necesita `PUERTO` (`verify:quiebro-gl` y `verify:quiebro-materia` miran la GPU).

---

# El plan de obra (tal como se escribió)

Pedido de Miguel: «Mejor el nivel de detalle del resto de elementos de la ciudad». El resto es todo lo que no son
personajes ni durmientes, que esperan a MetaHuman y quedan fuera. El objetivo es calidad de juego AAA: lo más
fotorrealista que se pueda en PC y lo mejor que quepa en un móvil de gama media, con N0-N3 escalando el detalle
solos.

- Base: worktree `C:/Users/QWERTY/Documents/GameMasters-matrix`, rama `matrix`, commit `d4402d0` (árbol limpio).
- Síntesis de: las siete auditorías por familia, los tres enfoques de materiales y los dos juicios. Todo lo
  dudoso se ha vuelto a mirar en el código (§1).
- Nada de este plan toca `shared/`, el servidor ni la Liza. Lo que lo necesitaría está en §10 y §11.

---

## 0. En una página

1. **Materiales.** Se hace una MEZCLA en dos fases, que es lo que votaron los dos jueces.
   - Fase 1, en todos los niveles: una «materia» ANALÍTICA en el sombreador. La única textura es una de
     ruido de 128² RGBA8 generada en JS con el PCG de `hash.ts`. Da relieve de juntas en chaflán, piezas
     inclinadas, envejecimiento y familias de material para el mobiliario. En N0 y N1 ABARATA el sombreador,
     porque el ruido entero sale del bucle PCG y pasa a una lectura.
   - Fase 2, sólo N2 y N3: un HORNO de micro-relieve en la GPU al arrancar. Son 6 capas A+B que SUMAN poro,
     cincel y árido encima de la estructura analítica.
   - Nada se descarga. Nada toca los charcos.
2. **El GRADO de cada celda (§3.1) manda en el detalle de la ventana, y NUNCA cambia cerca de la cámara.**
   Fachadas, balcones, bajos y mobiliario escalan con él.
   - N0 y N1 llevan un solo grado en sus 9 celdas; N2 cambia de grado a 18 m o más de la cámara, y N3 a 42 m
     o más (bloque central de 3×3). Esto arregla la «acera de enfrente sin nada» de N1 sin el salto al
     recentrar que hoy tiene `relieveSoloEnElCentro` (`ventana.ts:450`).
   - Lo que de verdad se ve a 2-5 m, el coche, sube por DISTANCIA en una capa aparte («lo cercano», §3.7):
     los K coches más cercanos se pintan con el grado alto del nivel y se funden con la trama de 4×4 con su
     versión horneada. En N3 son 8 coches de hasta 3.500 triángulos.
3. **Veinte paquetes en cuatro olas** de ficheros disjuntos (§5).
   - Ola 1: parte los ficheros calientes, fija los contratos y monta la materia, las herramientas del Molde,
     los comprobadores y el banco de fotos.
   - Olas 2 y 3: las familias. En la ola 3 la silueta es UN paquete (alta y baja juntas) y entra «lo cercano».
   - Ola 4: el horno, los semáforos, los remates, y un cierre que vuelve a medir y aprieta el libro.
4. **Presupuesto** (declarado, §7). Hoy → plan:
   - N0: 52 k → 66,5 k de 75 k, con 20 de 30 llamadas.
   - N1: 95 k → 117,9 k de 125 k, con 24 de 45 llamadas.
   - N2: 220 k → 281,0 k de 300 k, con 28 de 75 llamadas, más unos 12 k de sombra.
   - N3: 326 k → 676,2 k de 750 k, con 29 de 125 llamadas, más unos 17 k de sombra.
   - El barrio viejo (`construir.ts`) no sube en N0-N1: su N1 declara hoy 123.728 de 125.000 (§7.6).
   - Memoria de GPU de la ciudad: unos 15 / 26 / 87 (75 en táctil) / 207 MiB. Descarga: 0 bytes de arte.
5. **Fotos.** 17 posiciones fijas: 76 fotos por tanda, con hoja de diferencias (§8). Hay dos nuevas: el
   recentrado de la ventana (antes y después del cruce, en N0, N1 y N3) y un vado con lluvia. La tanda «antes»
   sale al cerrar la ola 1, con `?panel=0&lluvia=0`, que hoy no existen.
6. **Enmiendas.** La crítica del plan se ha comprobado en el código. Al final (§12) está qué se aplicó, qué
   no y por qué.

---

## 1. Lo comprobado en el código, y las correcciones a las auditorías

Todo en el worktree de la rama `matrix` en `d4402d0` (`git status` limpio).

- `fachadas.ts:648`: `NIVEL_Q = interiores ? 1 : 0`, así que N1, N2 y N3 compilan el mismo texto de fachada.
  - La Grafía está al final del cuerpo (`fachadas.ts:621-625`).
  - La semilla se redondea con `floor(x + 0.5)` (`:285-287`) y el bajo con `int(vPlantaQ.y + 0.5)` (`:294`).
  - El balcón se decide sólo en JS: `balcones && planta <= 5` (`:858`, `:897`).
  - El escaparate pone su tarjeta a 5 cm del muro (`:1126-1131`).
- `tipos.ts:220-330` (`DetalleDelNivel`): N1 lleva `relieveSoloEnElCentro` (`:240`, `:286`). La ventana lo
  resuelve con la clave `CON_RELIEVE = 1000` (`ventana.ts:89`).
- `presupuesto.ts:49-54` tiene los topes del juego y `:172-248` el libro de la ciudad abierta. La suma de lo
  declarado no cuenta la sombra (`sumaDeLoDeclarado`, `:330-338`), pero lo medido sí (`:289-325`).
  Hoy se declara 51.932 / 95.056 / 219.550 / 326.044 triángulos.
- `abierta.ts:117-146` (`CAPACIDAD_DE_LA_VENTANA`), `:149` (`INSTANCIAS_DE_SALIDA`) y `:395-400`: los
  materiales de la ventana, con `RETOQUE_DEL_FUNDIDO` desde N1.
  - `:449-458`: sólo lo lejano proyecta sombra.
  - `:592` y `:612`: `actualizar(camara, tiempo, tic)` le pasa el tic al tren.
- `ventana.ts:73-80`: el trabajo por fotograma es de 800/2.000/4.000/8.000 triángulos, con trozos de 600 o
  1.000 y 96 KiB-1 MiB.
- `celdas.ts:566-736` (`construirLaCelda`): cede tras cada pieza. `celdas.ts:628-631` llama a `cabina(...)` sin
  mirar `refugio`.
- `materiales.ts:28` (`aAcabado: 2`), `:33-46` (`ACABADO`, el cromo lleva metal 1,0), `:48-78` (el retoque del
  mobiliario; el agua es rugosidad < 0,03) y `:88-114` (emisivo: tipo 1 farola, tipo 2 baliza).
- `charcoQ` y `charcoDeLaAceraQ` (`glsl.ts:116-137`) los leen `suelo.ts:85` y `:249`, `reflejos.ts:116`,
  `atmosfera/lluvia.ts:187` y `posproceso/sombreadores.ts:87`.
- **Nadie en el Quiebro escucha la pérdida de contexto**: `grep` de `contextlost|contextrestored|isContextLost`
  en `escritorio/src/quiebro` no da nada.
- `capacidades.ts:152`: el aparato táctil sin gráfica dedicada tiene techo N2. `sondeo.ts:64`: `multiDibujo`
  sale de `getExtension` y nadie lo usa en la ciudad.
- `coches.ts:102` contra `:107`: el perfil de chapa (±medioAncho) y la caja de bajos (0,30-0,42, ±medioAncho)
  son coplanares. De ahí sale el parpadeo del estribo.
- `personajes/presupuesto.ts:188-193` (`RESTO_DEL_JUEGO_MEDIDO`): 38 k / 91 k / 176 k / 125 k medidos en el juego
  real. El comentario de `:170-181` dice que dirección de arte lo vuelve a medir.

**Comprobado al enmendar** (crítica del plan, mismo árbol):

- `ventana.ts:546-555`: la ventana suma el `yield` de cada paso y sólo empieza un trozo si le cabe ENTERO;
  `celdas.ts:583-589` cede la suma de TODAS las familias desde el paso anterior, y `celdas.ts:597-704` cede una
  vez por pieza. `verificar-quiebro-ciudad.ts:585` pone en rojo todo trozo por encima de 600 (N0) o 1.000 (N1-N3,
  `ventana.ts:74-79`). Un coche de 1.000 triángulos más sus lunas y faros ya no cabe en un paso.
- `ventana.ts:47` y `:132`: se recentra a 30 m del centro, 6 m dentro de la celda nueva. Con grados por anillos
  impares (N1, N3) el grado de la celda que pisa la cámara cambia en ese instante, a 2-5 m de lo que tiene al
  lado. El fundido con trama sólo existe en el canto de la ventana (`lejos.ts:70-80`).
- `verificar-quiebro-ciudad.ts:587-592`: la franja mira sólo N0 y N3, toma `celdaGuardada(k) ?? construirLaCeldaYa`
  (`ventana.ts:596-597` devuelve la que haya, con o sin relieve) y deja fuera la familia `neones` (`celdas.ts:83`).
- `presupuesto.ts:174-176`: lo medido el 24-sep es fachadas 790 / 9.270 / 76.454 / 107.346 y cristal
  340 / 340 / 538 / 768. `sumaDeLoDeclarado` del BARRIO da hoy 46.728 / 123.728 / 164.344 / 189.684 contra
  75.000 / 125.000 / 300.000 / 750.000 (medido con `plan/medidas/sumas.ts`). El barrio N1 está al 99 %, y
  `verificar-quiebro-ciudad.ts:264-266` lo comprueba.
- Coches aparcados (traza 0, `vehiculos/medir.ts`): 305 en la ciudad y, en la peor ventana, 38 / 38 / 59 / 83.
  Hoy cada coche cuesta 146 / 426 / 490 / 554 triángulos de mobiliario, más 8-18 de emisivo y 6-8 de cristal.
- three r185 pinta la sombra con `renderObject(scene, camera, shadow.camera, …)` y mira
  `object.layers.test(camera.layers)` con la cámara PRINCIPAL (`three.module.js:9400`, `:9556-9560`). Una malla en
  una capa que sólo tiene la cámara de la sombra no proyecta. `getDepthMaterial` copia `visible` pero no
  `depthWrite` ni `colorWrite` (`three.module.js:9467-9554`).
- La cámara de la sombra cubre ±20 m alrededor de un foco 8 m por delante de la cámara, y lo sigue
  (`atmosfera/luz.ts:78-84`, `:133-139`).
- `GLSL_ALTURA` (`reflejos.ts:45-55`) lo importan `lluvia.ts:26`, `personajes/material.ts:51` y
  `personajes/sombras.ts:16`. Las salpicaduras eligen la máscara con `y > 0.07` (`lluvia.ts:180-187`), las
  tarjetas con `vSueloQ > 0.05` (`reflejos.ts:116`) y el SSR con `W.y > 0.05`, y trata como suelo mojado todo lo
  horizontal por debajo de 0,25 m (`posproceso/sombreadores.ts:80-87`).
- `RETOQUE_ENTORNO` (`retoques.ts:112-146`) lo aplican fachada, mobiliario, cristal, asfalto y acera
  (`fachadas.ts:664`, `materiales.ts:83`, `:145`, `suelo.ts:180`, `:296`). La niebla sustituye los `fog_*` de
  TODOS los materiales (`atmosfera/niebla.ts:12-20`) y el diseño la fija verde-cian (`EL-QUIEBRO.md:526`).
- `CIUDAD-ABIERTA.md:224` y `:230`: el borde no enseña «calles formadas que no se pueden andar»; detrás, «sin
  calles a la vista». `:261-266`: la torre del reloj es DE LA GLORIETA (36 m), y la Glorieta está en (0, 0) en las
  32 trazas (`quiebro-ciudad.ts:205-206`), con una fuente de 5 × 5 m en el centro (`quiebro-plantillas.ts:222`).
- `lejos.ts:8-10`: el edificio que entra en la ventana «no cambia de cara, sólo gana su relieve». La LOD1 se
  escribe sin relieve (`lejos.ts:183`) y es la misma geometría para los cuatro niveles (`lejos.ts:126`).
- `fachadas.ts:858`: `balcones = opciones.relieve && …`; `:884`: el muro escribe `aPlanta` (bajo) en
  `fachadasPorPartes`. El soportal está en `fachadas.ts:1093-1110` y `soportalDePlaza` en `piezas.ts:219`.
- `abierta.ts:152-158` (`LEJANA_DESDE`, `LEJANA_HASTA`, `CAJAS_LEJANAS_DE_LA_CIUDAD`), `:485-488` (horizonte y
  ciudad lejana) y `:613-615` (el horizonte sigue a la cámara).
- `calidad/precompilar.ts:14-38`: un cambio de nivel ya enlaza 22-25 programas, y el posproceso vuelve a pintar
  la escena con otro estado.
- La cabina: poste de hierro, marquesina curva y auricular ámbar «que funciona con monedas» (`EL-QUIEBRO.md:48`,
  `:953`); «el auricular queda balanceándose» (`:562`). Su caja mide 0,5 × 0,5 m y 2,5 de alto
  (`quiebro-ciudad.ts:2124`, con `D_POSTE` en `:1673`).
- La franja de luz del Elevado está en `piezas.ts:274-283`; las escaleras de incendios, en `voladizos.ts:104`.
- `efectos/presupuesto.ts:158-165` y `:89` reservan 12 / 20 / 28 / 36 pantallas de Grafía «de la ciudad», y
  `efectos/tapices.tsx:5` dice que las pone `ciudad/`, pero nadie llama a `sistema.pantallas.poner` fuera del
  banco de efectos (`efectos/banco.tsx:392`, `:500-502`).
- `trafico.ts:19` y `:40` usan `ACABADO.chapa` de `materiales.ts`, y sólo el barrio lo monta (`construir.ts:222`).

**Correcciones a las auditorías** (quien implemente, que no se fíe de estas citas):

- **Auditoría de luces:** las líneas que da de `haces.ts`, `vapor.ts` y `reflejos.ts` NO existen en `d4402d0`.
  `haces.ts` tiene 88 líneas, `vapor.ts` 150 y `reflejos.ts` 318. Las buenas son:
  - `haces.ts:16` (`ALTO = 6.2`), `:52` (brillo `* 0.05`) y `:68` (cono de 16 lados);
  - `vapor.ts:22` (`BOCANADAS = 6`), `:50` (alfa `0.55`) y `:53` (color);
  - `reflejos.ts:97-127` (el fragmento de las tarjetas) y `:148-150` (`polygonOffset`);
  - el parpadeo en `neones.ts:145-149` y `halos.ts:45-50`, y el radio del halo de un rótulo en `fuentes.ts:80`.
- **`GLSL_CIELO_REFLEJADO` lo usan también los personajes** (`personajes/material.ts:243` y `:278`). El
  «horizonte local» NO puede cambiar esa función: hay que añadir otra nueva que sólo use `RETOQUE_ENTORNO` de la
  ciudad. Si no, se rompe el material de los personajes, que es de otro frente.
- **La «banda de detalle por distancia en la misma llamada»** (auditoría del mobiliario) NO baja los triángulos
  que se cuentan: `gl.info` cuenta lo enviado, no lo que el vértice tira. Se sustituye por el grado de la celda
  (§3.1).
- **La furgoneta de 1,95 m** (auditoría de vehículos) se sale de la caja de coche de 1,75 m
  (`quiebro-plantillas.ts:151-152`) en la franja de andar. Toda carrocería mide 1,75 m como mucho, con la
  holgura de 3 cm del comprobador (`verificar-quiebro-ciudad.ts:80`).
- **Los vados en rebaje dentro de la base** costarían unos 11.000 triángulos en TODOS los niveles: son 1.356
  vados a unos 8 triángulos, y la base se pinta entera con `frustumCulled = false`. Con eso N0 se pone al 97 % y
  N1 al 99 % de su cuota. Van como rampa en la ventana (§3.3).

---

## 2. El sistema de materiales

### 2.1 La decisión

**Mezcla en dos capas, con el analítico como base en todos los niveles.** El horno de GPU entra recortado y sólo
en N2-N3, como micro-relieve encima. La forja de Blender NO es el sistema de materiales. Sus piezas de coche y
mobiliario quedan para una fase posterior con descarga, que decide Miguel (§11).

Por qué:

- En Adreno y Mali el cuello es la aritmética entera del hash. Un `fbmQ` son 4 `ruidoQ` × 4 `hashQ` × 3 `pcgQ`
  (`glsl.ts:22-56`), y el asfalto de N1 llama unas 7-9 veces a `fbmQ` (`suelo.ts:76-77, 89-90, 94, 111, 135`).
- La materia analítica lo cambia por lecturas de una textura de 87 KB. Medido con fxc sobre el HLSL de ANGLE
  (`mat-analitico/banco/fxc.json`):

  | Material (N1) | Instrucciones hoy → materia | Enteras hoy → materia |
  |---|---|---|
  | Asfalto | 2.841 → 819 | 1.606 → 85 |
  | Fachada | 7.381 → 5.602 | 3.972 → 2.418 |

  El tiempo de enlace de la fachada en ANGLE baja de 3,6 s a 3,2-3,3 s.
- Con MÁS detalle, N0 y N1 cuestan menos que hoy. No hay descarga ni horno que perder con el contexto.
- El horno aporta lo que el analítico no da barato (poro, cincel, árido, cavidad, rugosidad variable), y sólo
  merece su memoria donde la hay: N2 PC 16,8 MiB, N2 táctil 4,2 MiB, N3 67 MiB.

### 2.2 Fase 1: la materia analítica (ola 1 la construye; olas 2-3 la cablean)

**Ficheros:** carpeta nueva `escritorio/src/quiebro/ciudad/materia/`.

- **`ruido.ts`.**
  - `texturaDeRuido()` da un singleton: `DataTexture` de 128², RGBA8, `RepeatWrapping`,
    `LinearMipmapLinearFilter`.
    - Canal r: la retícula.
    - Canal g: un grano suave periódico de 3 octavas (celdas de 16, 8 y 4 téxeles).
    - Canales b y a: el gradiente analítico del grano.
  - Se genera con `pcg` importado de `hash.ts`, así que su sha256 es fijo. El prototipo da `5d9df310578ac622…`
    (`mat-analitico/banco/ruido-gen.js`).
  - `varianzaPorMip[8]` se tabula en JS.
  - `UNIFORMES_DE_LA_MATERIA = { uRuidoQ, uVarianzaDelGranoQ }`: objetos compartidos, como
    `UNIFORMES_DE_LA_CIUDAD` (`retoques.ts:42-75`).
  - Se genera en la primera llamada, antes de compilar el primer material. Así nunca hay un sampler sin textura,
    tampoco en Node.
- **`glsl.ts`.**
  - `ruidoT`, `fbmT` (octavas por `#if OCTAVAS_Q`), `granoT` (altura y gradiente en una sola lectura), `lodQ`,
    `hash2Q` (un solo PCG para dos valores), `juntaQ` y `relieveDeJuntaQ` (chaflán en forma cerrada),
    `rugosidadFiltradaQ` (se le suma la varianza perdida por mip, como el antialias LEAN), `humedadDelPieQ` y
    `chorretonQ`.
  - `normalPorDerivadasQ`: sólo en el preámbulo.
  - `microRelieveQ(capa, p, px)`: neutra hasta la fase 2, devuelve 0.
  - `grietaQ(...)`: neutra, el sitio de la grieta del Estampado (`uGrietasQ[8]`), que hoy no existe. Se deja el
    gancho y no se implementa.
- **`familias.ts`.**
  - `FAMILIA` (0 liso, 1 hierro fundido pintado, 2 madera, 3 piedra/granito, 4 hormigón, 5 caucho, 6 plástico,
    7 chapa pintada, 8 chapa ondulada/galvanizada, 9 fundición de tapa, 10 llanta, 11 carrocería, 12 aluminio
    estriado, 13 follaje, 14 hormigón del viaducto).
  - `acabado(familia, rug, metal, { chaflan?, barniz? })` empaqueta sin bytes nuevos:
    - `aAcabado.x = familia + min(rug, 0,999)`;
    - `aAcabado.y = 4·chaflán + 2·barniz + min(metal, 0,999)`. El cromo de hoy (metal 1,0) pasa a 0,999 en la
      tabla `ACABADO` (`materiales.ts:33-46`), que se queda y sigue valiendo: familia 0, liso. Así el tráfico
      del barrio (`trafico.ts:40`), que queda fuera, no cambia.
  - En el GLSL, `decodificarAcabadoQ`, y `superficieQ(familia, …)` reparte a `familias/<nombre>.ts`.
    - Hay UN fichero por familia para que cada paquete sea dueño del suyo.
    - La ola 1 los deja como stub: devuelven el color y la rugosidad de entrada.
    - **La salida es un struct**, fijado en la ola 1: `SuperficieQ { vec3 albedo; float rug; float metal;
      vec3 n; float barniz; float rugBarniz; vec3 emision; }`. `barniz` y `emision` valen 0 en los stubs.
    - **El lóbulo de barniz** lo pone `retoque.ts` de la materia para todos, después de la luz
      (`#include <aomap_fragment>`, antes):
      `reflectedLight.indirectSpecular += barniz · schlick(0,04) · cieloReflejadoQ(r, rugBarniz)`. Con barniz 0
      no hace nada. VEHICULOS sólo rellena `familias/carroceria.ts`, sin tocar el material del mobiliario.
  - `vAcabadoQ` pasa a `flat`. WebGL2 lo da, y el entero interpolado puede llegar como 9,999, el mismo fallo que
    `fachadas.ts:285-286`.
- **`retoque.ts`.**
  - `retoqueDeLaMateria(nivel, { lejos? })`, con orden −5, justo después de `mundo` (−10).
  - Defines: `MATERIA_Q` (igual al nivel; 0 si `lejos`) y `OCTAVAS_Q` (1/2/3/4).
  - Pone el preámbulo con `pxMundoQ` después de `#include <clipping_planes_fragment>`, en flujo uniforme.
  - Nombre `materia-nN` o `materia-lejos`: entra en la llave de caché (`parcheo.ts:164-165`).
- **Banco propio:** `materia/banco-materia.tsx` + `escritorio/banco-quiebro-materia.html`. Pinta las cuatro
  superficies del prototipo (`mat-analitico/banco/vista-n*.png`) en N0-N3.

**Por nivel** (cifras del prototipo; los topes duros están en §7.4):

| Nivel | Qué lleva |
|---|---|
| N0 | Una octava y ningún relieve de materia: la normal se queda como hoy. Banda de humedad del pie analítica (unas 8 instrucciones). **Coste ≤ hoy** en cada material. En el mobiliario, las familias NO se reparten (`#if MATERIA_Q >= 1`): el prototipo subía de 461 a 560 por decodificarlas. |
| N1 | Dos octavas. Relieve de juntas con chaflán (sillar, ladrillo, azulejo, adoquín, baldosa) y cada pieza inclinada hasta un píxel de 8 cm. Borde de la humedad con ruido, chorretones y familias con normal por derivadas a menos de 5 cm de píxel. |
| N2 | Tres octavas. Grano por mapa de derivadas (1 lectura y unas 20 instrucciones), salitre y rugosidad filtrada. |
| N3 | Cuatro octavas. Gotas a menos de unos 2,5 m, paralaje de un paso en sillar y adoquín a menos de 6 m (sin `gl_FragDepth`) y una segunda lectura girada para que no se note la repetición desde la Vigía. |

**Condiciones (de los jueces; cada una tiene su comprobación en §6):**

- Sampler siempre atado:
  - `uRuidoQ` existe y apunta a una textura válida antes de compilar nada.
  - Todo sombreador cuyo texto use `ruidoT`, `fbmT`, `granoT` o `superficieQ` lleva `uRuidoQ`, y es el MISMO
    objeto compartido. Se identifica con una marca (`userData.materiaQ`), no con `===`: `tsx` puede cargar dos
    veces un módulo (memoria).
- Derivadas: `dFdx`, `dFdy`, `fwidth` y `texture()` con mip implícito sólo en el preámbulo y fuera de ramas. En
  todo lo demás, `textureLod` con lod explícito.
- Las coordenadas del ruido se reducen módulo el periodo ANTES de leer. Posiciones en `highp` (`glsl.ts:12-16`).
- **Lo que decide sigue en `hashQ` entero con su gemelo en `hash.ts`:** ventanas, tiendas, colores y tarjetas.
  La textura sólo adorna.
- **El relieve de materia se anula bajo `uRejillaDeGlifos > 0,5`**, y el bloque de la Grafía sigue siendo lo
  último.
- La LOD1 usa `materia-lejos` (MATERIA_Q 0) y `NIVEL_Q ≤ 1`. Su color por estilo sale del albedo medio de la
  materia, para que no salte entre 45 y 60 m.
- **Los charcos no se tocan.** `charcoQ` y `charcoDeLaAceraQ` siguen en hash entero. La «fase 2 de charcos» del
  enfoque analítico queda DESCARTADA.

### 2.3 Fase 2: el horno de micro-relieve (ola 4; sólo N2-N3)

- **Seis capas**, en dos `WebGLArrayRenderTarget` RGBA8 (A: altura, cavidad, variación y rugosidad; B: normal
  x/y, …):
  0. piedra (poro y cincel: sillería, granito, adoquín);
  1. barro cocido (poro y canto: ladrillo, baldosa);
  2. hormigón (coquera, grano de encofrado);
  3. asfalto (árido);
  4. metal pintado (martelé, desconchón);
  5. madera (veta).

  Three r185 ata cada textura del MRT a su capa (`node_modules/three/build/three.module.js:19029-19038`).
- **Reglas medidas en el prototipo** (`mat-horno-gpu/horno.html`):
  - UN programa por capa y la normal en un segundo pase. El programa «uber» tardó 46 s en enlazar en D3D11.
  - Con `KHR_parallel_shader_compile`, todo a la vez; sin él, un programa por fotograma.
  - Toksvig en los mips: `generateMipmap` acorta la normal y el mojado centellea a 10-30 m.
- **Resolución, por TECHO y memoria del aparato, no por el nivel del momento:**

  | Aparato | Lado | Memoria |
  |---|---|---|
  | N2 PC | 512² | 16,8 MiB |
  | N2 táctil | 256² | 4,2 MiB |
  | N3 | 1024² | 67 MiB |

  Al bajar de nivel NO se rehornea. En un aparato táctil, el array se suelta tras 60 s estables en N0-N1.
- **El define `MICRO_Q` es fijo por nivel desde la primera compilación.** Desde el primer fotograma se atan
  arrays neutros de 1×1×1: normal plana, AO 1 y rugosidad neutra. Al acabar el horno sólo cambian `.value` y un
  `uMicroPeso`, que se funde de 0 a 1 dentro de la Bajada. Nunca se recompila jugando.
- **Sonda `hornoEnCapas`** (`calidad/sondeo.ts`, con el patrón de `guardaMasDeUno`, `sondeo.ts:85-116`): crear un
  array de 4×4×2, pintar en la capa 1 con MRT, generar mips y leer. Si falla, horno apagado sin tocar el nivel.
- El trabajo va repartido en `actualizar` del relevo, fuera del pintado.
- **Pérdida de contexto:**
  - en `webglcontextlost`, `uMicroPeso = 0` y los neutros atados;
  - en `webglcontextrestored`, el horno vuelve a empezar a pasos (la `DataTexture` del ruido la resube three
    sola).
- `microRelieveQ(capa, …)` es la ÚNICA puerta. Paredes, suelo y mobiliario ya la llaman en la ola 2 (neutra), así
  que el horno sólo toca `materia/`.

### 2.4 Lo que el sistema de materiales NO toca

- **`GLSL_CHARCOS`** y sus cinco consumidores. Una regla de fuente con `soloCodigo` prohíbe que la altura, la
  materia o el micro-relieve entren en la máscara de charco.
- **`GLSL_CIELO_REFLEJADO`**, que usan los personajes.
- **`hashQ`, `pcgQ` y `hash.ts`**, salvo reglas dobles nuevas, cada una con su comprobación de paridad.
- **Los retoques de la Grafía**:
  - `uRejillaDeGlifos` sigue siendo lo último del cuerpo de la fachada;
  - el alambre de la Bajada vive en `borde.ts`;
  - la ley de la cortina tiene su texto vigilado (`verificar-quiebro-ciudad.ts:1414-1447`).

---

## 3. Decisiones transversales

### 3.1 El grado de la celda: nunca cambia cerca de la cámara

`ciudad/grados.ts` (nuevo) define `gradoDeLaCelda(nivel, dx, dz)` según la distancia de Chebyshev a la celda
del centro (lado impar) o a la raya del centro (lado par):

| Nivel | Ventana | Grados | Dónde cambia el grado al recentrar |
|---|---|---|---|
| N0 | 3×3 | 1 en las 9 celdas: silueta, sin `discard`, así que sin balcones | nunca |
| N1 | 3×3 | 1 en las 9 celdas (con lo de N1: balcones ligeros y barandilla con `discard`) | nunca |
| N2 | 4×4 | las 2×2 centrales 3, el resto 2 | a 18 m o más por delante y a 30 m o más por detrás |
| N3 | 5×5 | las 3×3 centrales 3, el anillo de fuera 2 | a 42 m o más por delante y a 54 m o más por detrás |

**Por qué así** (crítica, comprobado en `ventana.ts:47`, `:132`): la ventana se recentra cuando la cámara está a
30 m del centro, 6 m dentro de la celda nueva. Con un centro de 1 celda en lado impar, esa celda sube de grado en
ese instante, con sus coches y balcones a 2-5 m. Es el salto que hoy da N1 con `relieveSoloEnElCentro`. Con la
tabla de arriba:

- En lado par (N2) el centro es una raya y el bloque de 2×2 rodea a la cámara, a 18 m o más de su borde.
- En N3 el bloque de 3×3 deja el cambio a 42 m, dentro de la niebla de la madrugada (empieza a 16 m, `niebla.ts:28-30`).
- N0 y N1 no cambian nunca.

**Lo que se pierde, y cómo se recupera:** el grado 4 de celda y el grado 2 del centro de N1. Lo que más se veía
de ellos, el coche a 2-5 m, pasa a «lo cercano» (§3.7), que sube por distancia y con fundido. El resto de g4
(tornillos del banco, cordón en espiral, balcón de 60) no justificaba un salto a los pies. Palanca de CIERRE: si N1
mide 12 k libres, las piezas de N1 (no las fachadas) suben a g2 en las 9 celdas, sin salto.

- Todo lo que se escribe en la celda consulta `obra.nivel` y `obra.grado` de su `ObraDeLaCelda` (§5.2): relieve,
  balcones, bajos, mobiliario y voladizos. Los coches HORNEADOS tienen su propio grado por nivel (§3.7).
- La clave de la celda guardada pasa de `k + CON_RELIEVE` a `k + 1000·grado + 10000·relieveDeHoy`.
- **En la ola 1, `relieveDeHoy(nivel, esCentro)` reproduce el relieve de HOY** (N0 no; N1 sólo en la celda del
  centro, `ventana.ts:450`; N2 y N3 siempre) para que la partición sea idéntica. Va en la obra aparte del grado.
  En la ola 3, O3-SILUETA lo retira y deja sólo el grado.
- **Regla contra el temblor por grado:** ninguna pieza más fina que 2 píxeles a la distancia máxima de su bloque
  (auditoría de silueta):
  - N1 ≥ 25 cm;
  - N2 ≥ 9 cm (g3) y 18 cm (g2);
  - N3 ≥ 6 cm (g3) y 14 cm (g2).
- **Coste:** al recentrarse, en N3 cambian de grado 6 celdas (3 suben y 3 bajan) además de las 5 nuevas. Se
  mide la latencia (≤ 207 fotogramas y margen ≥ 12 m, `verificar-quiebro-ciudad.ts:731`, `:776-793`). Palanca:
  subir `CELDAS_GUARDADAS` (`ventana.ts:83`).
- **Foto de control:** la posición P del protocolo (§8) fotografía el mismo sitio con la ventana antes y después
  del cruce, en N0, N1 y N3.

**Topes de triángulos por pieza y grado** (g1 / g2 / g3; la columna g4 es SÓLO para «lo cercano»):

| Pieza | g1 | g2 | g3 | g4 | Nota |
|---|---|---|---|---|---|
| Coche (turismo; furgoneta +20 %) | 180 | 450 | 1.000 | 3.500 | + lunas 8/24/60/150 en cristal y faros de lente (unos 20) en emisivo; g4 sólo en la capa de lo cercano |
| Farola de calle | 90 | 260 | 500 | — | |
| Farola de plaza | 110 | 300 | 600 | — | |
| Lámpara de pared | 60 | 120 | 200 | — | |
| Banco | 130 | 320 | 600 | — | |
| Árbol | 120 | 350 | 650 | — | |
| Cabina / refugio | 160 | 380 | 700 | — | |
| Quiosco de prensa | 60 | 250 | 600 | — | |
| Quiosco de plaza | 230 | 500 | 1.500 | — | 2 pasos en g3 |
| Fuente | 300 | 700 | 1.800 | — | 2 pasos en g3 |
| Estatua | 120 | 400 | 1.500 | — | 2 pasos en g3 |
| Contenedor de carga | 132 | 200 | 400 | — | |
| Pilar del viaducto | 60 | 150 | 350 | — | |
| Tramo de 48 m | como hoy | 120 | 600 | — | |
| Balcón | 8 (N0: 0) | 20 | 48 | — | |
| Tienda con el bajo hundido | 16 | 26 | 34 | — | |
| Tapa de alcantarilla | 30 | 45 | 70 | — | N0: la de hoy con otro albedo |

**Todo escritor CEDE en pasos que caben en el trozo** (crítica; `ventana.ts:546`, `celdas.ts:583-589`): ninguna
pieza, en ningún grado, escribe entre dos `yield` más de 600 triángulos (N0) o 1.000 (N1-N3), contando todas sus
familias (un coche g3 son 1.000 de chapa, más 60 de lunas y unos 20 de faros: dos pasos como mínimo). La firma
está en §5.2.1 y la comprobación, en O1-VERIFICACION (12).

### 3.2 Coches y balcones horneados en la celda, sin instancias nuevas

- **Instanciar los coches** con LOD por distancia exige `WEBGL_multi_draw` (`BatchedMesh`), que no está
  garantizado en WKWebView. Sin él serían 15-30 llamadas.
- **Instanciar los balcones** exige una variante instanciada del material de fachada y ampliar la franja a
  instancias.
- Con coches horneados por nivel y «lo cercano» (§3.7), el recuento es casi el de instanciar, con 3 llamadas en
  N1+ (las de la capa) y la franja y las cajas pintadas viéndolos sin cambiar nada.
- Se paga en memoria: dos mitades en la ventana (§7.3). La vía instanciada queda como palanca futura (§10).

### 3.3 Vados: rampa adosada en la ventana, con el mapa de alturas BINARIO

- **Qué es:** una rampa de hormigón de 0,8 m en la calzada, contra el bordillo, en cada boca con cebra. Son
  4-6 triángulos en la familia mobiliario, y la escribe el escritor de suelo de la celda (`tapas.ts`).
- **En la acera:** podotáctil de botones pintado en la franja del vado (N1+) y bordillo rebajado sólo en color.
- **El mapa de alturas NO cambia** (sigue en 0 o 255, `luz-de-la-calle.ts:148-162`). Con la rampa graduada en el
  mapa de toda la ciudad, la frontera de las máscaras de charco se movía en salpicaduras (`lluvia.ts:187`),
  tarjetas (`reflejos.ts:116`) y SSR (`posproceso/sombreadores.ts:87`), y fuera de la ventana, donde la rampa no
  tiene geometría, tarjetas y salpicaduras flotaban hasta 15 cm. Además, `GLSL_ALTURA` lo leen los pies y las
  sombras de los personajes (`personajes/material.ts:51`, `personajes/sombras.ts:16`), que quedan fuera.
- **Lo que queda:** un pie que pise la rampa se hunde como mucho unos 10 cm en su parte alta, porque el mapa,
  filtrado a 2 téxeles/m, sube a medio metro del bordillo. Es del orden del escalón de hoy. Va en los riesgos y en
  la foto R.
- **El SSR de N3** trata la rampa y las tapas como suelo mojado (`posproceso/sombreadores.ts:80-87`: horizontal y
  por debajo de 0,25 m), igual que hoy las alcantarillas. Es agua sobre hormigón y fundición, así que no se
  cambia el SSR, que queda fuera. Bajo un charco, el relieve de la tapa lo tapa el espejo.
- **Coste:** unos 300 triángulos por ventana, frente a unos 11.000 en todos los niveles del rebaje en la base
  (1.356 vados a unos 8 triángulos, en la base que se pinta entera). Con el rebaje, N0 y N1 no caben (§7.1).

### 3.4 Remates de torre y cornisas de lo lejano: desde N2

- Mástiles, agujas, coronas, góndolas y helipuertos (107 edificios de más de 45 m, unos 6.500 triángulos) y las
  cornisas de la LOD1 (392 edificios) van en una malla nueva de lo lejano sólo en N2+, con el material de la LOD1.
- **N0 y N1 no llevan cornisa en la LOD1, y la ventana sí:** el edificio gana su cornisa al entrar, que es lo que
  `lejos.ts:8-10` permite («no cambia de cara, sólo gana su relieve») y lo que hoy ya pasa en N2-N3. En N1 entra
  con la trama de 12 m del canto; en N0, sin trama, a 42-102 m de la cámara y en la niebla (`lejos.ts:17-19`).
  Llevarla a la LOD1 costaría unos 6-12 k en todos los niveles: N0 y N1 pasarían del 96 % y del 100 % de su cuota.
- **Lo que NO puede cambiar al entrar es la CARA:** huecos, balconeras, tiendas y medianeras. Por eso la
  balconera no depende del relieve (§3.6), y O4-REMATES lo comprueba en los cuatro niveles.
- En N0 y N1 las torres tienen balizas (luces lejanas) y no remate. La ventana tampoco lo pone en N0-N1.

### 3.5 Mallas nuevas: las «capas» de la ciudad

`ciudad/capas.ts` (nuevo) define `CapaDeLaCiudad` (§5.2). `abierta.ts` monta las capas de una lista fija:

- `lejana` (el horizonte y la ciudad lejana de hoy, que la ola 1 saca de `abierta.ts:152-158`, `:485-488` y
  `:613-615` sin cambiar nada);
- `suelo-lejano`, `luces-lejanas`, `remates-lejanos`;
- `tubos`, `luz-pintada`;
- `horizonte-local` (sólo textura), `semaforos` (sólo textura);
- `sombras-cercanas`, `coches-cercanos`.

Cada una vive en `capas/<nombre>.ts`, con dueño propio. La ola 1 deja `lejana` con el comportamiento de hoy y las
demás como stub que devuelve `null`. Todas:

- montadas siempre que el nivel las lleve, con `frustumCulled = false`. Las instanciadas llevan al menos una
  instancia: three no pinta ni cuenta un `InstancedMesh` con 0 (`three.module.js:4427-4433`), y las llamadas
  cambiarían con la cámara;
- con su renglón en el libro;
- pasan por `suyo()` para precompilarse y guardarse (`abierta.ts:388-392`);
- declaran su estorbo para la franja (§6, VERIFICACIÓN).

### 3.6 Reglas dobles GLSL ↔ JS

Hoy viven dos veces, sin comprobador:

- `encendidaQ`, `queTiendaQ` y `colorDeLuzQ` (`fachadas.ts:88-110`) contra `hash.ts:39-60`;
- `huecoQ` (`:112-118`) contra `HUECO_DEL_ESTILO` (`:50-57`);
- la tienda de 6 m (`:490-497`) contra `LARGO_DE_UNA_TIENDA` (`hash.ts:36`).

Este plan añade tres reglas dobles:

- el **balcón** (`tieneBalcon`), que decide el hueco balconera. Es función del edificio, la cara, la planta y el
  hueco, y NO del relieve ni del grado: la LOD1 y N0 escriben el mismo patrón en `aPlanta.y` y pintan la misma
  balconera. Donde no hay losa (N0 y la LOD1), el sombreador pinta un antepecho de hierro de balcón francés.
- la **faja o imposta en bulto**;
- el **fallo de letra** del neón. Éste se decide en JS y viaja en el atributo, así que no se duplica.

Cada una lleva su comprobación de paridad, vista en rojo: los literales en Node (`verify:quiebro-ciudad`) y la
evaluación en la GPU con el banco de `verify:quiebro-gl`, que pinta la función GLSL a una textura y lee los
píxeles.

### 3.7 Lo cercano: el coche que se ve a 2-5 m sube por distancia

**Por qué:** el coche es lo que más se ve de cerca y lo que más salta de grado (de 180 a 3.500 triángulos). Con el
grado de celda (§3.1) no puede subir cerca de la cámara sin salto. `WEBGL_multi_draw` no está garantizado en
WKWebView (§3.2).

**Cómo:**

- **Los coches HORNEADOS** llevan un grado por nivel, no por anillo: N0 g1, N1 g1, N2 g2, N3 g3 en el bloque de
  3×3 y g2 en el anillo. Ya no dependen de `cochesFinos`.
- **La capa `coches-cercanos`** (N1+) guarda en un búfer reservado los K coches aparcados más cercanos a la
  cámara, escritos con el grado alto del nivel:
  - N1: 4 en g2;
  - N2: 6 en g3;
  - N3: 8 en g4.
  - Entra un coche como mucho por fotograma, en trozos de 1.000 triángulos, sin memoria nueva con la cámara
    quieta.
  - La pertenencia tiene histéresis: entra a menos de d_K y sale pasado d_K + 4 m.
- **El fundido.** Durante unos 0,4 s, la versión horneada y la de la capa se reparten los píxeles con la MISMA
  trama de Bayer 4×4 del canto de la ventana (`lejos.ts:53-67`): ningún píxel se pinta dos veces ni se queda sin
  pintar.
  - Los materiales de la ventana (mobiliario, cristal y emisivo) llevan desde la ola 1 un retoque neutro,
    `retoqueDeLoCercano(false)`, en `lo-cercano.ts`. La ola 3 lo rellena:
    - un `uniform vec4 uCercanosQ[8]` con la caja del coche (x0, z0, x1, z1), que son las de `shared/` y
      alineadas con la calle;
    - un `uniform vec4 uFundidoCercanoQ[2]`;
    - `discard` dentro de la caja donde la trama es menor que el fundido.
  - La capa usa esos mismos materiales con `retoqueDeLoCercano(true)`, que tira lo complementario.
  - Son 3 programas más en N1+, contados en el tope de programas.
  - N0 no lleva capa, ni `discard`.
- **Las luces:** faros y pilotos del coche de la capa caen a ±1 cm de los del horneado. Las fuentes de luz, las
  tarjetas y los halos salen de las celdas y no cambian.

**Coste:** 3 llamadas en N1+ (mobiliario, cristal y emisivo de la capa). Triángulos, §7.1: unos 2,4 / 7,5 / 34 k
en N1 / N2 / N3. Lo hace O3-LO-CERCANO sobre el loft que deja O2-VEHICULOS en todos los grados.

---

## 4. Reglas de trabajo para quien implemente

Vienen de la memoria del proyecto y no son opcionales.

1. **Un paquete, un worktree aislado** sobre la base de su ola: `git worktree add` desde el commit de cierre de
   la ola anterior.
   - `node_modules` se copia con `robocopy` (el 1 de robocopy no es fallo), no con `npm install`.
   - `core.autocrlf` por worktree y normalizar a LF: un worktree nuevo sale con CRLF y tres comprobadores por
     regex se ponen rojos.
   - Con varios agentes en un árbol, un rojo no dice de quién es.
2. **Cada paquete toca SÓLO sus ficheros** (§5). Si necesita otro, lo pide en su informe y no lo toca. `celdas.ts`,
   `abierta.ts` y `presupuesto.ts` sólo tienen dueño en la ola 1 y en el cierre.
3. **Fotos con un vite propio en el worktree aislado**, en un puerto explícito (5300 + n), y `PUERTO=` siempre
   explícito en `foto.sh`: un puerto por defecto mide OTRO árbol. El banco escribe en el DOM de qué carpeta sale
   (§6, VERIFICACIÓN).
   - Al acabar, se apagan vite y los Edge: nadie apaga a los agentes.
   - Cada agente tiene su carpeta en el scratchpad (`scratchpad/detalle/<clave>/`), también su perfil de Edge.
4. **No se cronometra con la máquina ocupada.** Se cuentan triángulos, llamadas, bytes, instrucciones (fxc) y
   lecturas. El tiempo (enlace, horno) va sólo como indicio: el mínimo de 3 corridas.
5. **La batería se mira por el CÓDIGO DE SALIDA**, no por la última línea (`| tail` devuelve 0).
   - `npm run typecheck -w escritorio` siempre, porque `tsx` no mira tipos.
   - Los guardianes de `shared/` van en todos los encargos aunque no se toque `shared/`: `verify:fijo`,
     `verify:pureza`, `verify:nucleo-quieto`, `verify:fronteras`, `verify:determinismo` y `verify:procedencia`,
     con `-w server`.
6. **Toda comprobación nueva se ve en ROJO** rompiendo una COPIA en el scratchpad, nunca el árbol.
   - Cada filtro lleva un mínimo de inspeccionados: cero inspeccionados es cero fallos.
   - Las reglas de fuente usan `soloCodigo` y se prueban con varias grafías: la vacuna cierra la grafía, no la
     puerta.
7. **Rojos que no son rojos:** tres comprobadores se caen por CPU o azar. Mirar antes de repetir.
8. **Escritura:** PowerShell no entiende `VAR=valor comando` (usar bash para `foto.sh`). Los parches se escriben
   con Write, no con heredoc de bash, que se come las barras. Python escribe en binario o con `newline=""`.
   Todo en LF y los comentarios en castellano, en el tono de la casa (ARQUITECTURA §5).
9. **Nada de `git push`, de APK ni de publicar.** Publicar espera a que El Quiebro esté completo. Los commits van
   en la rama `matrix`, uno por paquete, los hace el coordinador al integrar y terminan con la línea de autoría
   de la casa.
10. **Nada de descargas, dependencias ni instalar nada.** `sharp`, `pngjs`, `meshoptimizer` y `@gltf-transform`
    ya están. `basisu` y `toktx`, NO.

---

## 5. Olas, ficheros y contratos

### 5.1 Quién es dueño de qué, ola a ola

Rutas relativas a `escritorio/src/quiebro/ciudad/`, salvo que digan otra cosa. Dentro de una ola, disjuntas.

| Fichero | Ola 1 | Ola 2 | Ola 3 | Ola 4 |
|---|---|---|---|---|
| `fachadas.ts` | PARTICION-FACHADA | PAREDES | — | — |
| `fachada/declaraciones.ts`, `fachada/tipos-de-cara.ts` | PARTICION-FACHADA | PAREDES (sólo declaraciones) | SILUETA | REMATES (sólo declaraciones) |
| `fachada/glsl-comun.ts`, `glsl-muro.ts`, `glsl-envejecer.ts` | PARTICION-FACHADA | PAREDES | — | — |
| `fachada/glsl-hueco.ts`, `glsl-cuerpo.ts` | PARTICION-FACHADA | PAREDES | SILUETA | REMATES (sólo hueco) |
| `fachada/caras.ts` | PARTICION-FACHADA | PAREDES (empaquetado de atributos) | SILUETA (sólo líneas de atributos: patrón de balcón) | REMATES (sólo líneas de atributos: marca de bulto) |
| `fachada/glsl-bajo.ts`, `glsl-piezas.ts`, `remate.ts`, `ritmo.ts`, `bajo.ts`, `balcones.ts`, `soportal.ts` | PARTICION-FACHADA | — | SILUETA | — |
| `fachada/torres.ts` | PARTICION-FACHADA | — | LEJANO | — |
| `fachada/remates-de-hueco.ts` | PARTICION-FACHADA | — | — | REMATES |
| `luz-con-direccion.ts` (nuevo) | — | PAREDES | — | — |
| `materiales.ts`, `cristal.ts`, `mobiliario.ts` | PARTICION-CIUDAD | MOBILIARIO | — | — |
| `celda-mobiliario.ts` (nuevo) | PARTICION-CIUDAD | MOBILIARIO | — | SEMAFOROS |
| `emisivo.ts` (nuevo) | PARTICION-CIUDAD | VEHICULOS | — | SEMAFOROS |
| `farolas.ts` (nuevo) | PARTICION-CIUDAD | FAROLAS-Y-PIEZAS | — | SEMAFOROS |
| `piezas.ts` | PARTICION-CIUDAD | FAROLAS-Y-PIEZAS | SILUETA (sólo `soportalDePlaza`) | — |
| `tapas.ts` (nuevo), `suelo.ts` | PARTICION-CIUDAD | SUELO | — | — |
| `coches.ts`, `tren.ts`, `viaducto.ts` (nuevo) | PARTICION-CIUDAD | VEHICULOS | — | — |
| `plano.ts` | — | VEHICULOS | — | — |
| `borde.ts` | — | VEHICULOS (sólo la viga) | — | — |
| `lo-cercano.ts` (nuevo), `capas/coches-cercanos.ts` | PARTICION-CIUDAD (neutro) | — | LO-CERCANO | — |
| `celdas.ts`, `ventana.ts` | PARTICION-CIUDAD | — | — | CIERRE (`ventana.ts`, si la latencia lo pide) |
| `grados.ts` (nuevo), `tipos.ts` | PARTICION-CIUDAD | — | SILUETA | CIERRE (sólo `grados.ts`: la palanca de N1) |
| `voladizos.ts` | PARTICION-CIUDAD | — | SILUETA | — |
| `hash.ts` | — | — | SILUETA | — |
| `neones.ts` | PARTICION-CIUDAD | — | NEONES | — |
| `tubos.ts`, `luz-pintada.ts`, `pantallas.ts` (nuevos) | — | — | NEONES | — |
| `halos.ts`, `fuentes.ts`, `reflejos.ts` | PARTICION-CIUDAD (sólo `halos.ts`) | — | LUZ-EN-EL-AIRE | SEMAFOROS |
| `haces.ts`, `vapor.ts` | — | — | LUZ-EN-EL-AIRE | — |
| `glsl.ts` | PARTICION-CIUDAD (sólo mueve el parpadeo) | — | LUZ-EN-EL-AIRE | — |
| `retoques.ts` | — | — | LUZ-EN-EL-AIRE | — |
| `lejos.ts` | — | PAREDES (una línea) | LEJANO | — |
| `anillo.ts`, `anillo-de-la-ciudad.ts` | — | — | LEJANO | — |
| `construir.ts` | PARTICION-CIUDAD | — | LEJANO | — |
| `abierta.ts`, `capas.ts` (nuevo) | PARTICION-CIUDAD | — | — | — |
| `capacidad.ts` (nuevo), `presupuesto.ts` | PARTICION-CIUDAD | — | — | CIERRE |
| `relevo.ts` | PARTICION-CIUDAD | — | — | HORNO |
| `CiudadAbierta.tsx` | — | — | — | HORNO |
| `LaCiudadDeNoche.tsx` | FOTOS | — | NEONES (la prop de las pantallas) | — |
| `escritorio/src/quiebro/Quiebro.tsx` | — | — | NEONES (una línea: pasar `sistema.pantallas`) | — |
| `capas/lejana.ts` (nuevo) | PARTICION-CIUDAD (lo de hoy) | — | LEJANO | — |
| `capas/suelo-lejano.ts`, `capas/luces-lejanas.ts` | PARTICION-CIUDAD (stub) | — | LEJANO | — |
| `capas/tubos.ts`, `capas/luz-pintada.ts` | PARTICION-CIUDAD (stub) | — | NEONES | — |
| `capas/horizonte-local.ts` | PARTICION-CIUDAD (stub) | — | LUZ-EN-EL-AIRE | — |
| `capas/semaforos.ts` | PARTICION-CIUDAD (stub) | — | — | SEMAFOROS |
| `capas/remates-lejanos.ts`, `capas/sombras-cercanas.ts` | PARTICION-CIUDAD (stub) | — | — | REMATES |
| `materia/*` (menos `familias/`) | MATERIA | — | — | HORNO |
| `materia/familias/{liso,hierro,madera,piedra,hormigon,caucho,plastico,chapa}.ts` | MATERIA (stub) | MOBILIARIO | — | — |
| `materia/familias/fundicion.ts` | MATERIA (stub) | SUELO | — | — |
| `materia/familias/follaje.ts` | MATERIA (stub) | FAROLAS-Y-PIEZAS | — | — |
| `materia/familias/{carroceria,llanta,aluminio,viaducto}.ts` | MATERIA (stub) | VEHICULOS | — | — |
| `geometria.ts` | MOLDE | — | — | — |
| `banco-abierto.tsx`, `atmosfera/Atmosfera.tsx` | FOTOS | — | — | — |
| `atmosfera/cielo.ts` | — | — | LEJANO | — |
| `atmosfera/lluvia.ts` | — | — | LUZ-EN-EL-AIRE | — |
| `calidad/sondeo.ts`, `calidad/capacidades.ts` | — | — | — | HORNO |
| `escritorio/scripts/verificar-quiebro-{ciudad,calidad,gl}.ts`, `banco-gl.tsx`, `escritorio/banco-quiebro-gl.html`, `escritorio/package.json`, `escritorio/vite.config.ts`, `scripts/verificar-todo.mjs` (raíz) | VERIFICACION | — | — | HORNO (sólo gl, calidad y el banco) |
| `escritorio/scripts/verificar-quiebro-materia.ts` | MATERIA | — | — | HORNO |
| `escritorio/scripts/verificar-quiebro-molde.ts` | MOLDE | — | — | — |
| `escritorio/scripts/quiebro-ciudad/<paquete>.ts` | VERIFICACION (stubs) | el dueño de cada familia | el dueño de cada familia | el dueño de cada familia |
| `escritorio/scripts/fotos/*` | FOTOS | — | — | CIERRE (`POSICIONES.md`) |
| `personajes/presupuesto.ts` (sólo `RESTO_DEL_JUEGO_MEDIDO`), `docs/EL-QUIEBRO.md`, `docs/quiebro/CIUDAD-ABIERTA.md` | — | — | — | CIERRE |

Nadie toca `atmosfera/niebla.ts` ni `atmosfera/paleta.ts`: el resplandor de sodio va en los sombreadores del
horizonte y de la ciudad lejana (§12, enmienda 15). Tampoco `luz-de-la-calle.ts`: el mapa de alturas se queda
binario (§3.3).

### 5.2 Los contratos que fija la ola 1

Los paquetes de una misma ola trabajan a la vez contra estas interfaces. Quien las escribe en la ola 1 no puede
cambiarlas sin avisar al coordinador.

1. **`ObraDeLaCelda`** (`celdas.ts`, PARTICION-CIUDAD):
   ```ts
   interface ObraDeLaCelda {
     readonly nivel: NivelDeLaCiudad; readonly grado: 1 | 2 | 3; readonly relieveDeHoy: boolean;
     readonly gradoDeLosCoches: 1 | 2 | 3; readonly detalle: DetalleDelNivel;
     readonly lados: number; readonly ciudad: PartesDeLaCiudad;
     readonly m: Readonly<Record<Familia, Molde>>;
     readonly luces: LuzDelMobiliario[]; readonly estorba: CajaXZ[];
     readonly cochesEncendidos: CocheEncendido[]; readonly rotulos: FuenteDeRotulo[]; readonly bocas: { x: number; z: number }[];
   }
   /** Cada `yield` es un paso: entre dos, como mucho el trozo del nivel (600 en N0, 1.000 en N1-N3), sumando familias. */
   type EscritorDeLaCelda = (obra: ObraDeLaCelda, parte: ParteDeLaCelda) => Generator<void, void, void>;
   /** TODA pieza (mobiliario, farolas, coches, viaducto, voladizos, rótulos, tapas) también cede. */
   type EscritorDePieza<P> = (obra: ObraDeLaCelda, pieza: P) => Generator<void, LuzDelMobiliario | readonly LuzDelMobiliario[] | void, void>;
   ```
   - `construirLaCelda` encadena, EN ESTE ORDEN, y cede en cada `yield` de dentro:
     1. fachadas (`fachadasPorPartes`, que cede también por tramo de cornisa, por ritmo y por puñado de balcones);
     2. `mobiliarioDeLaCelda` (`celda-mobiliario.ts`);
     3. `viaductoDeLaCelda` (`viaducto.ts`);
     4. `cochesDeLaCelda` (`coches.ts`);
     5. `voladizosDeLaCelda` (`voladizos.ts`);
     6. `rotulosDeLaCelda` (`neones.ts`);
     7. `sueloDeLaCelda` (`tapas.ts`).
   - Las piezas de hoy, que escriben de una vez, se envuelven en un generador de un solo paso. El texto de los
     sombreadores y la geometría no cambian.
   - **La luz se saca en grado 1:** `fuentesDeLaCelda` y `fuentesDeLaCeldaAPasos` (`celdas.ts:544-558`)
     construyen con `grado: 1` y moldes que no guardan. Es lo más barato de CPU, y las fuentes son las mismas en
     todo grado: lo exige VERIFICACION (11).
   - El barrio viejo (`construir.ts`) construye su obra con `gradoDelBarrio(nivel)` = 1 / 1 / 2 / 2 (§7.6).
2. **`grados.ts`:** `gradoDeLaCelda(nivel, dx, dz)` con la tabla FINAL (§3.1), `GRADO_DE_LOS_COCHES_POR_NIVEL`
   (§3.7) y `relieveDeHoy(nivel, esCentro)`, que reproduce el relieve de hoy hasta la ola 3.
3. **`fachadasPorPartes(m, edificios, { relieve, grado, ventanas, vecinos }, ventanas)`** (PARTICION-FACHADA). Pasa
   `grado` sin tocarlo a los escritores de:
   - `remate.ts`, `balcones.ts`, `bajo.ts` (el muro del volumen 0 y `escaparatesDe`), `soportal.ts` (sale de
     `fachadas.ts:1093-1110`);
   - `ritmo.ts` (stub, por cara);
   - `torres.ts` (stub, al volumen más alto de todo edificio de más de 45 m, CON y SIN relieve);
   - `remates-de-hueco.ts` (stub).

   Además, con la regla FINAL escrita ya en la ola 1 (son funciones puras del edificio, sin geometría):
   - `balcones.ts` exporta `tieneBalcon(edificio, cara, planta, hueco)`, con la regla de hoy (`fachadas.ts:858`,
     `:897`) hasta la ola 3, y `patronDeBalcon(edificio)`, que da 0 hasta la ola 3. Los voladizos la importan.
   - `torres.ts` exporta `hayRemateDeTorre(e)` y `hitoDe(e)` (qué edificio lleva la chimenea de las Naves, la
     cúpula de la Lonja o el reloj de la Glorieta, §11, pregunta 4). La azotea los consulta para no poner
     maquinaria encima.
   - `remate.ts` exporta `respiraderosDe(e)`: de 1 a 3 puntos por azotea, por hash y lejos del pretil. Los usan la
     azotea (SILUETA) y el vapor (LUZ-EN-EL-AIRE).
   - `caras.ts` exporta `recorrerLosHuecos` y `atributosDelMuro(e, c, grado)`: el único sitio que escribe
     `aCara`/`aVolumen`/`aPlanta` del muro (`fachadas.ts:882-884` hoy).
   - `cajaDeRelieve(..., subtipo = 0)`: el subtipo de relieve va en `aCara.z` (la semilla, que en el relieve vale
     0); 0 es lo de hoy.
   - La API pública de `fachadas.ts` no cambia (reexporta).
4. **Partición del GLSL de la fachada en tramos CONTIGUOS**, sin envolverlos en funciones: el texto montado tiene
   que salir IDÉNTICO byte a byte.
   - `declaraciones.ts`: las declaraciones del vértice y del fragmento.
   - `glsl-comun.ts`: hash, `lineaQ`, `encendidaQ`, `queTiendaQ`, `huecoQ`.
   - `glsl-muro.ts`: `muroQ`.
   - `glsl-hueco.ts`: las funciones del hueco, más el tramo del cuerpo de la fachada y el hueco
     (`fachadas.ts:369-487`), con la faja de la imposta (`:480-487`).
   - `glsl-cuerpo.ts`: el prefacio (`:279-310`) y el cierre (`:619-633`).
   - `glsl-piezas.ts`: el tramo de tejado, medianera, relieve, barandilla y techo del soportal (`:312-367`).
   - `glsl-bajo.ts`: `:488-597`.
   - `glsl-envejecer.ts`: `:599-618`.

   Las variables locales del `main` se comparten entre tramos, y la cabecera de cada fichero dice cuáles lee y
   cuáles escribe. En el cierre, un centinela `/* FIN-DE-LA-GRAFIA */` justo después del bloque de
   `uRejillaDeGlifos`.
5. **`CapaDeLaCiudad`** (`capas.ts`):
   ```ts
   interface CapaDeLaCiudad {
     readonly nombre: string;                 // = el renglón del libro (o el primero, si tiene varios)
     readonly objeto: THREE.Object3D;         // siempre montado, frustumCulled = false, rango ≥ 1 triángulo
     renglones(): RenglonDeLaCiudad[];
     alCambiarLaVentana?(v: EstadoDeLaVentana): void;
     actualizar?(camara: THREE.Camera, tiempo: number, tic: number): void; // sin asignar memoria
     texturas?(): readonly THREE.Texture[];   // piezasPorSubir del relevo
     readonly estorbo: 'por-encima-de-1,9' | 'fuera-de-la-ciudad' | 'pegado-al-muro' | ((salida: Tri[]) => void);
     soltar(): void;
   }
   type FabricaDeCapa = (c: ContextoDeLaCapa) => CapaDeLaCiudad | null;
   // ContextoDeLaCapa: nivel, detalle, base (partes, noche, anillo, lejos), materiales de la ciudad, suyo(), uniformes, ventana.
   ```
   `tic` es el MISMO de `tren.actualizar(tic)` (`abierta.ts:612`). La capa `lejana` sale en la ola 1 con lo de hoy:
   `LEJANA_DESDE`, `LEJANA_HASTA`, `CAJAS_LEJANAS_DE_LA_CIUDAD` y el `actualizar` que la hace seguir a la cámara.
6. **Materia** (MATERIA), §2.2:
   - `texturaDeRuido`, `UNIFORMES_DE_LA_MATERIA`, `retoqueDeLaMateria(nivel, { lejos })`, `acabado(...)` con su
     empaquetado, `FAMILIA`;
   - las funciones GLSL, el struct `SuperficieQ` (con `barniz`, `rugBarniz` y `emision`) y las firmas de
     `superficieQ` y `microRelieveQ`;
   - el lóbulo de barniz, puesto por la materia después de la luz;
   - un fichero por familia.
7. **Tablas de palancas por nivel:** toda tabla nueva de adorno por nivel se exporta con nombre `*_POR_NIVEL` y
   forma `Record<0|1|2|3, number | boolean>`. VERIFICACION las busca por nombre en `ciudad/**` y exige que no
   bajen al subir de nivel.
8. **Comprobaciones por paquete:** `escritorio/scripts/quiebro-ciudad/<paquete>.ts` exporta
   `comprobar(ctx): Resultado[]` con `inspeccionados` y `minimo`.
   - Los dueños son: `paredes`, `suelo`, `mobiliario`, `piezas`, `vehiculos`, `silueta`, `bajos`, `paridad`,
     `lejano`, `neones`, `luces`, `cercanos`, `semaforos` y `remates`.
   - `verificar-quiebro-ciudad.ts` las importa todas.
9. **Topes de sombreador por material:** cada material exporta `TOPE_DEL_SOMBREADOR_POR_NIVEL` (instrucciones fxc
   y lecturas de textura) al lado de su fábrica, y `verify:quiebro-gl` y `verify:quiebro-materia` los leen. En la
   ola 2, los materiales de la ventana dejan en N1-N3 un margen bajo su tope para la ola 3: 40 instrucciones en
   todos (el horizonte local, que va en `RETOQUE_ENTORNO`) y 60 más en mobiliario, cristal y emisivo (lo cercano).
   N0 no necesita margen: ninguna de las dos cosas entra en N0.
10. **Fotos:** `escritorio/scripts/fotos/foto.sh SALIDA CONSULTA [ANCHO ALTO]` exige `PUERTO` y comprueba el árbol
    (§8).
11. **`FuenteDeRotulo`** (`neones.ts:31-39`) gana `{ ancho, alto, eje }`, rellenos en la ola 1 con lo que hoy ya se
    sabe de cada chapa. Los usa el halo rectangular de LUZ-EN-EL-AIRE; NEONES no puede cambiarlos de sentido.
12. **Lo cercano** (`lo-cercano.ts`): `retoqueDeLoCercano(esLaCapa)`, neutro en la ola 1 (texto vacío, así que los
    shas no cambian), metido en las fábricas del mobiliario, el cristal y el emisivo. Las tres fábricas aceptan
    `{ deLaCapa?: boolean }` y se lo pasan al retoque, así que la capa pide sus materiales sin tocar esos ficheros.
    También `GRADO_DE_LO_CERCANO_POR_NIVEL` y `COCHES_CERCANOS_POR_NIVEL` (0 / 4 / 6 / 8).

---

## 6. Los paquetes

Formato de cada ficha:

- **Objetivo.** Qué se consigue.
- **Ficheros.** Sólo los de esta ola.
- **Niveles.** Qué cambia en cada nivel.
- **Presupuesto.** Lo que el paquete puede añadir o quitar, contado en triángulos, llamadas y bytes.
- **Verificación.** Qué comprobadores corre, qué comprobaciones nuevas escribe y cómo las ve fallar, y qué fotos
  saca.
- **Aceptación.** Cuándo está terminado.

Comprobadores comunes a TODOS los paquetes, en su worktree y mirando el código de salida:

- `npm run typecheck -w escritorio`;
- `npm run verify:quiebro-ciudad -w escritorio`, que incluye los 50 barrios viejos (`verificar-quiebro-ciudad.ts:76`,
  `:264-266`), `verify:quiebro-calidad` y `verify:quiebro-efectos`;
- `npm run verify:quiebro-materia -w escritorio`, desde que existe;
- desde la ola 2, `npm run verify:quiebro-gl -w escritorio` con el `PUERTO` de su vite: topes de fxc (§7.4) y de
  programas. Sin fxc o sin servidor sale con 2, y eso NO es verde;
- los seis guardianes de `shared/` con `-w server`.

Quien toque geometría de la franja corre también `verify:quiebro-juego`, por la cámara pegada a fachadas
(`verificar-quiebro-juego.ts:2904`). Quien cambie triángulos o llamadas corre también `verify:quiebro-personajes`,
por el tope del juego entero.

**Si un paquete mide más que su reserva del libro, PARA y lo dice en su informe** (§7.2). No toca
`presupuesto.ts`, que sólo tiene dueño en la ola 1 y en el cierre.

### OLA 1: la base común

**Paso 0 (coordinador, antes de lanzar la ola).** Nada que fotografiar. Las 32 fotos de
`scratchpad/detalle/presupuesto/antes/` llevan el panel de medidas y la lluvia (`?panel=0` y `?lluvia=0` no
existen en `d4402d0`, `banco-abierto.tsx:48-60`), así que no sirven de referencia a ±1. Cada paquete de la ola 1
saca su «antes» en su propio worktree, antes de tocar nada:

- con la consulta de hoy;
- dos tomas iguales, para medir el ruido (lluvia, parpadeos, vapor);
- comparando con una máscara sobre el panel (0-545 × 0-145 px a 1280 × 720).

#### O1-PARTICION-FACHADA

- **Objetivo.** Partir `fachadas.ts` (1.199 líneas; la tocan PAREDES, SILUETA, LEJANO y REMATES) para que trabajen a
  la vez. Es refactor puro: el texto de los sombreadores y la geometría quedan IDÉNTICOS.
  - GLSL en tramos contiguos (§5.2.4), con el centinela de la Grafía.
  - Geometría en `caras`, `remate`, `balcones`, `bajo` y `soportal` (sale de `fachadas.ts:1093-1110`), más stubs
    que se llaman y no escriben: `ritmo`, `torres` y `remates-de-hueco`.
  - Todo escritor CEDE: los de hoy ceden donde hoy (`fachadas.ts:888`, `:902-904`, `:916`, `:919`), y los
    nuevos, por tramo.
  - Las funciones puras de §5.2.3, con su regla final: `tieneBalcon` y `patronDeBalcon` (0), `hayRemateDeTorre`,
    `hitoDe`, `respiraderosDe` y `atributosDelMuro`.
  - `cajaDeRelieve(..., subtipo = 0)`.
- **Ficheros.** `fachadas.ts` y `fachada/{declaraciones, tipos-de-cara, glsl-comun, glsl-muro, glsl-hueco,
  glsl-bajo, glsl-piezas, glsl-envejecer, glsl-cuerpo, caras, remate, balcones, bajo, soportal, ritmo, torres,
  remates-de-hueco}.ts`.
- **Niveles.** Ningún cambio visible.
- **Presupuesto.** 0 en todo.
- **Verificación.**
  - Guion en el scratchpad que, antes y después, vuelca el texto final parcheado del material de fachada y del de
    lo lejano en N0-N3 (con `onBeforeCompile` como three r185, igual que `mat-analitico/banco/volcar.ts`) y compara
    los sha256. Hay que verlo en rojo cambiando un espacio en un tramo de una copia.
  - Huella de determinismo de `verify:quiebro-ciudad` idéntica antes y después.
  - Geometría: los volcados de las 169 celdas de la traza 0 en N0-N3 dan el mismo sha256 antes y después.
  - Fotos C y E en N1 y N3 contra su propio «antes» (Paso 0): diferencia media, con la máscara del panel, ≤ el
    ruido medido entre las dos tomas, y negro 0 %.
- **Aceptación.** Shas de texto y de geometría idénticos, huella idéntica y batería verde. Los stubs se llaman y no
  escriben nada. Las funciones puras de §5.2.3 están exportadas.

#### O1-PARTICION-CIUDAD

- **Objetivo.** Partir los ficheros calientes de la ciudad y fijar los contratos 1, 2, 5, 11 y 12 de §5.2, sin
  cambiar nada visible:
  - escritores de celda por familia y piezas que CEDEN (generadores de un paso para lo de hoy);
  - grado por la tabla final (§3.1), con `relieveDeHoy` para que el relieve siga como hoy;
  - `GRADO_DE_LOS_COCHES_POR_NIVEL`, que en la ola 1 reproduce `cochesFinos`;
  - la luz sacada en grado 1 (`fuentesDeLaCelda`, `celdas.ts:544-558`). Si las fuentes de grado 1 no salen
    idénticas a las de hoy, se deja lo de hoy y se dice en el informe;
  - capas con stubs, y la capa `lejana` con el horizonte y la ciudad lejana de hoy (`abierta.ts:152-158`,
    `:485-488`, `:613-615`);
  - `lo-cercano.ts` neutro, metido en las fábricas del mobiliario, el cristal y el emisivo;
  - `FuenteDeRotulo` con `{ ancho, alto, eje }`;
  - materiales con el nivel en su fábrica (`materialDelMobiliario(nivel)`, `materialEmisivo(nivel)`,
    `materialDelCristal(nivel)`, `materialDeLaAcera(nivel)`, `materialesDelTren(nivel)`);
  - `GLSL_PARPADEO` único en `glsl.ts` con el texto de HOY (el de `neones.ts:145-149` y `halos.ts:45-50`);
  - `CAPACIDAD_DE_LA_VENTANA` e `INSTANCIAS_DE_SALIDA` trasladados a `capacidad.ts`;
  - la reserva provisional del libro de la ciudad (§7.2) y del barrio (§7.6), con los renglones nuevos declarados,
    y `gradoDelBarrio(nivel)` = 1 / 1 / 2 / 2 en `construir.ts` (en la ola 1 con el relieve de hoy).
- **Ficheros.** `materiales.ts`, `emisivo.ts` (nuevo), `cristal.ts` (nuevo), `mobiliario.ts`, `farolas.ts`
  (nuevo), `tapas.ts` (nuevo), `piezas.ts`, `viaducto.ts` (nuevo), `celda-mobiliario.ts` (nuevo), `celdas.ts`,
  `ventana.ts`, `grados.ts` (nuevo), `tipos.ts`, `coches.ts`, `voladizos.ts`, `neones.ts`, `halos.ts`, `glsl.ts`,
  `tren.ts`, `suelo.ts` (sólo la firma), `abierta.ts`, `capacidad.ts` (nuevo), `capas.ts` (nuevo),
  `capas/{lejana, suelo-lejano, luces-lejanas, remates-lejanos, tubos, luz-pintada, horizonte-local, semaforos,
  sombras-cercanas, coches-cercanos}.ts`, `lo-cercano.ts` (nuevo), `presupuesto.ts`, `relevo.ts` (texturas de las
  capas en `piezasPorSubir`) y `construir.ts`.
- **Niveles.** Ningún cambio visible.
- **Presupuesto.** 0 triángulos y 0 llamadas medidos. El libro se reserva según §7.2 y §7.6.
- **Verificación.**
  - El mismo volcado de textos de O1-PARTICION-FACHADA para mobiliario, emisivo, cristal, asfalto, acera,
    tarjetas, halos y neones en N0-N3: shas idénticos. Rojo, con el retoque de lo cercano no vacío en una copia.
  - Huella idéntica y volcados de geometría de las celdas idénticos.
  - `verify:quiebro-ciudad` en verde con el libro reservado. La suma declarada cabe en la cuota en la ciudad y en
    el barrio (`verificar-quiebro-ciudad.ts:264-266`, `:534-537`).
  - La comprobación de trozos (VERIFICACION 12) en verde con los generadores de un paso.
  - Fotos C, E y G contra su propio «antes» (Paso 0).
- **Aceptación.** Shas y huella idénticos. Ningún escritor de familia necesita tocar `celdas.ts` ni `abierta.ts`
  para escribir sus piezas o montar su capa. Latencia y margen del cruce iguales que hoy.

#### O1-MATERIA

- **Objetivo.** El sistema de materiales de la fase 1 (§2.2), SIN cablear a los materiales de la ciudad. Lo
  cablean las familias en la ola 2. Se porta y se limpia el prototipo de `mat-analitico/banco/glsl-materia.ts` y
  `ruido-gen.js`.
  - `SuperficieQ` con `barniz`, `rugBarniz` y `emision`.
  - El lóbulo de barniz, después de la luz, neutro con barniz 0.
- **Ficheros.** `materia/{ruido, glsl, familias, retoque}.ts`, `materia/familias/*.ts` (stubs que devuelven su
  entrada), `materia/banco-materia.tsx`, `escritorio/banco-quiebro-materia.html` y
  `escritorio/scripts/verificar-quiebro-materia.ts`.
- **Niveles.** Los de §2.2. En el banco, las cuatro superficies en N0-N3.
- **Presupuesto.** 0 triángulos y 0 llamadas.
  - Textura: 65.536 B, más 21.844 B de mips.
  - Generación: ≤ 20 ms en Node. El prototipo, 3,6 ms.
- **Verificación.** `verify:quiebro-materia`, nuevo. Cada comprobación se ve en rojo en una copia:
  - (a) Con `parchear` real sobre un material de prueba de cada tipo en N0-N3, todo texto que use
    `ruidoT`/`fbmT`/`granoT`/`superficieQ` lleva `uRuidoQ` marcado como el de la materia. Rojo: quitarlo del
    material de prueba.
  - (b) Presupuesto de lecturas y PCG por nivel sobre el texto resuelto: un preprocesador mínimo de `#if` para
    `MATERIA_Q`, `OCTAVAS_Q`, `NIVEL_Q` y `MICRO_Q`, contra `TOPE_DEL_SOMBREADOR_POR_NIVEL`. Rojo: poner
    `OCTAVAS_Q 4` en N0.
  - (c) La textura: 128², sha fijo, medias por canal 127 ± 3 y varianza por mip creciente. Rojo: cambiar la
    semilla.
  - (d) Derivadas sólo en el preámbulo y nunca dentro de un `if`, por regex con `soloCodigo`. Rojo: el prototipo,
    que deriva dentro del `if` de la familia.
  - (e) El nombre del retoque lleva el nivel. Rojo: dos niveles con el mismo nombre.
  - (f) El texto de `GLSL_CHARCOS` y `GLSL_CIELO_REFLEJADO` tiene el mismo sha que en `d4402d0`. Rojo: tocar un
    espacio.
  - (g) Con barniz 0, el texto del lóbulo no cambia el color: el banco pinta igual con el lóbulo y sin él. Rojo:
    un barniz de 1 en el stub.

  Foto: el banco de materia en N0, N1 y N3, lado a lado con `mat-analitico/banco/vista-n*.png`.
- **Aceptación.** Las siete comprobaciones en verde, cada una vista en rojo. El banco reproduce las vistas del
  prototipo. La API de §5.2.6 está congelada y documentada en la cabecera de `materia/glsl.ts`.

#### O1-MOLDE

- **Objetivo.** Las primitivas que el mobiliario, los coches y la silueta necesitan en `Molde`. Todas escriben
  sólo con `vertice` y `tri`, así que valen en `MoldeQueNoGuarda` (`geometria.ts:467-479`), y las UV van en metros
  (`geometria.ts:15-21`).
  - `torno(cx, cz, contorno[(r, y)], lados, { suave, tapas })`: superficie de revolución con normales promediadas.
  - `cajaBiselada(x0..z1, bisel, caras, { alChaflan })`: 44 triángulos. El `alChaflan` avisa para marcar el bit
    `chaflan` del acabado.
  - `perfil(..., { suave: angulo })`.
  - `seccionado(secciones, { aristasVivas })`: el loft del coche, del tren y de las cornisas.
  - `extruirPerfil(camino, perfil, { ingletes })`: la cornisa por perfil con ingletes en las esquinas.
- **Ficheros.** `geometria.ts` y `escritorio/scripts/verificar-quiebro-molde.ts`.
- **Niveles.** No cambia nada por sí solo.
- **Presupuesto.** 0 en la ciudad.
- **Verificación.** `verify:quiebro-molde`, nuevo:
  - toda primitiva, con 3 parámetros cada una, sin NaN;
  - el sentido de cada triángulo casa con su normal (el producto vectorial por la normal es > 0). Una cara al
    revés no la caza nada más;
  - volumen firmado > 0 en las cerradas;
  - UV en metros continuas;
  - `MoldeQueNoGuarda` da el mismo recuento que `Molde`;
  - **coste de CPU por triángulo, contado, no cronometrado**: llamadas a `vertice`, productos de matriz y
    raíces por triángulo de cada primitiva, contra `caja` y `cilindro` de hoy. Queda en una tabla que O4-CIERRE
    usa para ajustar `porFotograma` (`ventana.ts:74-79`) si alguna pasa de 1,5 veces la caja.

  Rojo: invertir el orden de un triángulo del torno en una copia.
- **Aceptación.** Verde y visto en rojo. Recuento de triángulos de cada primitiva igual a la fórmula documentada.
  Tabla de coste por triángulo escrita.

#### O1-VERIFICACION

- **Objetivo.** Que lo que va a cambiar tenga quien lo mire ANTES de cambiarlo.
- **Ficheros.** `escritorio/scripts/verificar-quiebro-ciudad.ts`, `verificar-quiebro-calidad.ts`,
  `verificar-quiebro-gl.ts` (nuevo), `escritorio/scripts/quiebro-ciudad/*.ts` (nuevos: `comun` y un stub por
  paquete, también `cercanos`), `escritorio/banco-quiebro-gl.html` y `ciudad/banco-gl.tsx` (nuevos),
  `escritorio/package.json` (`verify:quiebro-gl`, `verify:quiebro-materia`, `verify:quiebro-molde`),
  `escritorio/vite.config.ts` (un `define` `__ARBOL_DEL_QUIEBRO__` con la carpeta del worktree) y
  `scripts/verificar-todo.mjs` (alta de los tres; `gl` como «lento»).
- **Niveles.** Todos.
- **Presupuesto.** 0 en el juego. `verify:quiebro-ciudad` cuesta unas 3 veces más en la franja: hoy construye 2
  ciudades de celdas por traza (N0 y N3) y pasa a 6 (un grado por nivel y bloque).
- **Verificación.**
  - (1) **Franja y cajas pintadas por nivel Y POR GRADO**, con `construirLaCeldaYa(parte, partes, n, grado)`
    explícito y no la celda guardada que haya (`verificar-quiebro-ciudad.ts:590`):
    - grados: N0 {1}, N1 {1}, N2 {2, 3}, N3 {2, 3};
    - la familia `neones` entra en la franja (hoy sólo `fachadas, mobiliario, cristal, emisivo`, `:591`);
    - también las capas: `estorbo` como función se mete en la franja, y las otras declaraciones se comprueban
      con su caja envolvente;
    - inspeccionados por nivel y grado, con su mínimo.

    Rojo: una pieza de prueba que sólo sale en g3 y se sale de su caja; y una capa de prueba con un triángulo a
    1 m dentro de ±270.
  - (2) **Sentido de las caras** en las familias con material de una sola cara. Se compara el CONJUNTO de caras
    al revés de hoy (por celda, familia e índice de posición redondeada), no el número: ni una nueva. Rojo:
    arreglar una y romper otra en una copia.
  - (3) **Paridad GLSL↔JS** de `encendida`, `queTienda`, `colorDeLuz`, `huecoQ` y la tienda de 6 m:
    - en Node, los literales numéricos de cada función gemela, en orden, iguales;
    - en `verify:quiebro-gl`, evaluando el GLSL de verdad: el banco pinta cada función en 1.000 semillas a una
      textura y lee los píxeles, contra `hash.ts`.

    Rojo: cambiar un umbral en una copia del GLSL.
  - (4) **La Grafía es lo último:** en el texto final de la fachada de N0-N3, el bloque de `uRejillaDeGlifos` va
    seguido del centinela, y después no se escribe `albedo` ni `emision`. Rojo: mover una línea detrás.
  - (5) **Memoria.**
    - GPU: los bytes de la geometría reservada (dos mitades), más la luz, más los mapas, más las texturas de
      materia, capas y horno, contra el tope por nivel (§7.3).
    - JS: los bytes de las celdas guardadas (`CELDAS_GUARDADAS = 36`, `ventana.ts:83`, con claves por grado) y de
      los moldes, por nivel. La cifra de hoy se anota, y el tope es hoy × 1,8 hasta el cierre.
  - (6) **Relevo:** toda textura que un material de la ciudad referencia está en `piezasPorSubir` o es de un
    almacén ya subido.
  - (8) **Palancas:** en `verify:quiebro-calidad`, todo `*_POR_NIVEL` de `ciudad/**` es monótono. Rojo: una tabla
    que baje.
  - (9) **`verify:quiebro-gl`, nuevo:**
    - Edge sin ventana con `--dump-dom` sobre `/sala/banco-quiebro-gl.html` y PUERTO explícito;
    - compila todos los materiales de la ciudad en N0-N3 y en cada estado del pintor (con y sin sombras, y la
      segunda pasada del posproceso);
    - devuelve `LINK_STATUS`, diagnósticos, `gl.info.programs`, `gl.info.memory` y el libro de bytes;
    - **tope de programas** por nivel y estado: lo de hoy, anotado, más 6 (materia-lejos, suelo lejano, luces
      lejanas, tubos, luz pintada, sombras cercanas) y más 3 en N1+ (lo cercano);
    - **un cambio de nivel N1 → N2** simulado con el relevo: programas enlazados y bytes subidos, contra un tope;
    - con fxc del Windows SDK, las instrucciones del HLSL de ANGLE contra los topes de §7.4. **Sin fxc sale con 2**:
      no se puede mirar, y eso no es verde;
    - exige que el DOM diga que el banco sale de ESTE worktree;
    - sale con 2 si no hay servidor.

    Rojo: un error de GLSL en una copia de un retoque; un material de más en el banco; fxc renombrado.
  - (10) **Pérdida de contexto**, en informe (no falla hasta la ola 4): fuerza `WEBGL_lose_context`, restaura y
    compara la luminancia media con la de antes.
  - (11) **Las fuentes no dependen del grado:** para cada celda y cada grado de su nivel, las fuentes de la celda
    construida (horneadas, reflejos, halos y cabezas) son las de `fuentesDeLaCelda` en grado 1, a ±1 cm. Rojo:
    una farola de prueba cuya luz sube 10 cm con el grado.
  - (12) **Trozos por pieza y grado:** cada escritor de pieza, en cada grado de §3.1 y en cada nivel, entre dos
    `yield` no pasa de 600 (N0) o 1.000 (N1-N3) triángulos sumando familias. Rojo: un coche g3 escrito sin ceder
    (1.000 de chapa + lunas + faros).
  - (13) **Las capas cuentan:** con una capa de prueba que añade una malla, la comprobación de llamadas se pone en
    rojo. Así se ve que «las capas stub no añaden llamadas» mira algo.

  La antigua (7), la descarga de `recursos/`, se quita: el plan no añade bytes y no podía ponerse en rojo.
- **Aceptación.** Todo en verde sobre el árbol de hoy, con el conjunto de caras al revés de hoy anotado. Cada
  comprobación vista en rojo. Los stubs de `quiebro-ciudad/<paquete>.ts` están importados y cuentan sus
  inspeccionados. Los números de hoy (programas, memoria de JS) están anotados.

#### O1-FOTOS

- **Objetivo.** El banco sirve para juzgar, y hay un protocolo de fotos reproducible (§8).
- **Ficheros.** `ciudad/banco-abierto.tsx` y `ciudad/LaCiudadDeNoche.tsx`:
  - `?panel=0` esconde las medidas, que tapan un tercio del móvil;
  - `?lluvia=0` para la lluvia, para juzgar sin ruido;
  - `?camino=juego` pinta con el posproceso y el DPR del nivel en vez de `banco-abierto.tsx:354` y `:365`;
  - `?ventana=cx,cz` monta la ventana en ese centro aunque la cámara esté en `pos` (la foto P del recentrado);
  - el DOM dice de qué árbol sale.

  `atmosfera/Atmosfera.tsx`: sólo la prop de la lluvia. `escritorio/scripts/fotos/{foto.sh, protocolo.sh, hoja.mjs,
  POSICIONES.md}`, nuevos y portados de `scratchpad/detalle/`:
  - `foto.sh` exige `PUERTO` y comprueba el árbol con `--dump-dom` una vez por tanda;
  - `protocolo.sh` admite `--solo A,C,H` y varios Edge en paralelo, cada uno con su perfil;
  - `hoja.mjs` admite una máscara y da el ruido entre dos tomas iguales.
- **Niveles.** —
- **Presupuesto.** 0 en el juego.
- **Verificación.**
  - Fija los rumbos de las 10 posiciones «a fijar» (§8) mirando cada foto, y los apunta en `POSICIONES.md`.
  - Saca la tanda «antes» completa (76 fotos) al CERRAR la ola 1, con los refactors integrados y `panel=0`,
    `lluvia=0`. Con lluvia sólo va la R.
  - Ruido de referencia: dos tomas iguales de A, C y E; la hoja da su diferencia media.
  - Rojo: `foto.sh` sin `PUERTO` o con el puerto de otro árbol falla con un mensaje claro.
- **Aceptación.** La tanda «antes» de 76 fotos está en `scratchpad/detalle/fotos/antes/`, `POSICIONES.md` tiene
  las 17 consultas finales, y `hoja.mjs` da los números de §8 y el ruido.

### OLA 2: las familias I (la materia a la vista, el suelo, el mobiliario y los vehículos)

#### O2-PAREDES

- **Objetivo.** Que las paredes dejen de ser cartón a 1-10 m y que N2 y N3 tengan de verdad más detalle que N1.
  - **`NIVEL_Q = nivel`** (`fachadas.ts:648`). Toda capa nueva va en su `#if` y se corta por distancia o por px:
    la LOD1 comparte el material.
  - **Materia cableada:**
    - relieve de fábrica por estilo: sillar con bisel y almohadillado en la baja; ladrillo con llaga rehundida y
      piezas inclinadas; azulejo con bisel y ondulación del vidriado; hormigón con encofrado y berenjenos; revoco
      fratasado con desconchones;
    - cavidad en juntas; desportillado en N2; paralaje de un paso en N3;
    - anulado dentro del hueco y bajo `uRejillaDeGlifos > 0,5`;
    - las llamadas a `microRelieveQ` (capas 0, 1 y 2), neutras hasta la ola 4.
  - **Luz de la calle con dirección** (`luz-con-direccion.ts`). Dos lecturas más de `uLuzCalle` a ±1,5 m a lo
    largo de T dan una seudoluz de las farolas, que modula la difusa horneada sólo en la fachada. Es lo único que
    hace leer el relieve de noche (`glsl.ts:170-194`). N1 a menos de 30 m; N2 siempre; N3 con brillo especular.
  - **Envejecimiento con sentido arquitectónico**, que sustituye al reguero fbm (`fachadas.ts:599-618`) a coste
    igual en N1:
    - chorretón bajo cada alféizar (largo por hash de la ventana);
    - velo bajo la cornisa y lavado a franjas visible a 60 m;
    - salpicadura del pie; capilaridad con eflorescencia (N2);
    - hollín sobre dinteles de tiendas;
    - mojado por `uHumedad`: albedo al 60-70 % y rugosidad 0,3-0,4; seco bajo voladizos (N2).
  - **Variedad por edificio sin tocar `shared/`.** De `e.semilla` y `azarEn` salen un subestilo (aparejo, color
    de mortero, piedra), una edad sesgada por distrito y un tono continuo. Empaquetado sin atributos nuevos, en
    `atributosDelMuro` de `fachada/caras.ts`:
    - `aVolumen.z` = subestilo + tinte;
    - `aPlanta.y` = bajo + 4·`patronDeBalcon(e)` + 32·edad. `patronDeBalcon` es de `balcones.ts` y da 0 hasta la
      ola 3, así que O3-SILUETA sólo cambia `balcones.ts`.

    Se actualiza la lectura de `fachadas.ts:294` (`int(vPlantaQ.y + 0.5)`), que pasa a desempaquetar.
  - **Torres de vidrio y hormigón** (`glsl-muro.ts`):
    - banda de antepecho y montantes cada 2-3 vanos;
    - paño ladeado ±0,03;
    - corona encendida en el 30 % de las torres de más de 45 m, multiplicada por `uVentanas`;
    - plantas de oficina enteras encendidas SÓLO desde la planta 4, en un término aparte de `encendidaQ`: no hace
      falta gemelo en `hash.ts`, que sólo mira las plantas 0-3 (`fachadas.ts:895`).
  - **Hueco:** banda de sombra de contacto bajo el alféizar (4-8 cm) y dintel con normal.
  - **LOD1:** `materialDeFachada(nivel, { lejos: true })` da `NIVEL_Q ≤ 1` y `materia-lejos`. Es una línea en
    `lejos.ts:113`.
- **Ficheros.** `fachadas.ts`, `fachada/{declaraciones, glsl-comun, glsl-muro, glsl-hueco, glsl-envejecer,
  glsl-cuerpo}.ts`, `fachada/caras.ts` (sólo `atributosDelMuro`), `luz-con-direccion.ts` (nuevo), `lejos.ts` (una
  línea) y `escritorio/scripts/quiebro-ciudad/paredes.ts`.
- **Niveles.**

  | Nivel | Qué lleva |
  |---|---|
  | N0 | Ruido de textura en vez de hash (coste ≤ hoy), zócalo y humedad del pie en color, mojado por `uHumedad`, variedad por edificio en el albedo |
  | N1 | Más relieve de juntas y cavidad a menos de 20 m, chorretones y velo, luz con dirección a menos de 30 m, antepecho |
  | N2 | Más desportillado, rugosidad por pieza, capilaridad y eflorescencia, secado bajo voladizos, montantes y luz con dirección siempre |
  | N3 | Más paralaje de juntas, segunda octava en chorretones y eflorescencia, agua que escurre (con `uTiempo`, que el Remanso frena), ladeo por paño y brillo especular de la seudoluz |
- **Presupuesto.** 0 triángulos, 0 llamadas y 0 bytes de vértice. Instrucciones fxc de la fachada, según
  §7.4 menos 40 de margen para la ola 3 en N1-N3: N0 ≤ 6.303; N1 ≤ 7.341; N2 ≤ 9.460 y N3 ≤ 11.960. Lecturas: la
  luz con dirección +2 en N1-N3.
- **Verificación.** Comunes. En `quiebro-ciudad/paredes.ts`:
  - (a) Los textos de la fachada en N0-N3 son distintos dos a dos, y cada capa nueva está dentro de su
    `#if NIVEL_Q`. Rojo: `NIVEL_Q` fijo a 1.
  - (b) El material de lo lejano lleva `materia-lejos` y `NIVEL_Q ≤ 1`.
  - (c) La paridad de O1-VERIFICACION sigue verde.
  - (d) El bloque de la Grafía sigue siendo lo último.
  - (e) **Ida y vuelta del empaquetado** de `aPlanta.y` (bajo + 4·patrón + 32·edad): en JS y, con el banco de
    `verify:quiebro-gl`, en el GLSL, para todos los bajos, patrones y edades. Rojo: la lectura de hoy,
    `int(vPlantaQ.y + 0.5)`, sin desempaquetar.

  Fotos C, E, O y G en N1 y N3, madrugada y alba, y C y E en N0 y N2. Hay que mirar el relieve a 2-5 m de noche
  bajo la farola, los chorretones a 25-60 m y que N3 se separe de N1.
- **Aceptación.**
  - En C y O, N3 se separa de N1 en ≥ 12 % de píxeles (hoy 5 %) y N1 de N0 en ≥ 8 %. Sin negro ni magenta.
  - N0 no sube de fxc y su foto sólo cambia donde está listado.
  - El Remanso sigue transparentando la fachada: banco de efectos, `estampado` y el pico del Remanso.
  - Batería verde.

#### O2-SUELO

- **Objetivo.** Que el suelo tenga materia y oficio a 1-30 m, y que la plaza deje de parecer agua.
  - **Materia:**
    - asfalto con `NIVEL_Q = nivel` (hoy lo decide `ondas`, `suelo.ts:155`) y acera con nivel (hoy sin él,
      `suelo.ts:293`);
    - grano, parches y relieve de ruido con `fbmT`/`granoT`, en vez de las 7-9 `fbmQ` de hoy;
    - `microRelieveQ` para las capas 3 (asfalto) y 0 (piedra).
  - **Plaza:**
    - juntas PREFILTRADAS en vez de apagadas (`suelo.ts:235-241`) y tono por pieza hasta 30 m;
    - rugosidad de piedra: 0,6-0,7 seca y 0,35-0,45 mojada fuera del charco;
    - cenefa de granito de 0,4 m; almohadillado (N1, a menos de 12 m);
    - bandas cada 6 m o abanico, y piezas partidas o repuestas (N2);
    - paralaje de juntas a menos de 6 m (N3, sin escribir profundidad: el SSR la reconstruye,
      `posproceso/sombreadores.ts:78-84`).
  - **Bordillo:**
    - canto con bisel SÓLO por normal (sin triángulos en la base);
    - rigola de 0,3 m en el asfalto; marca de humedad al pie; piezas de 0,5-1,2 m;
    - desconchados y moteado (N2).
  - **Vados** (§3.3): rampa adosada en la ventana en cada boca con cebra (`tapas.ts`, `sueloDeLaCelda`) y
    podotáctil pintado (N1+). **El mapa de alturas no se toca**, y `luz-de-la-calle.ts` sale de la ficha.
  - **Asfalto con materia:**
    - N0: parches rectangulares de reasfaltado, junta longitudinal sellada, pintura con borde irregular y gastada
      en la rodada, humedad por `uHumedad` (hoy es un ×0,5 fijo, `suelo.ts:115`);
    - N1: más grietas transversales, aceite en la banda de aparcamiento y tres escalas de grano;
    - N2: más piel de cocodrilo (celdas con la materia), destellos del árido que se apagan con px, y pintura con
      grosor y retrorreflexión;
    - N3: más película irisada, cavidad en las grietas y flechas o cuadrícula en los cruces.
  - **Capas de humedad** sobre la MISMA máscara: seco, húmedo, película, lámina. La orilla es un halo oscuro, no un
    recorte.
    - No cambia DÓNDE hay agua: `charcoQ` y `charcoDeLaAceraQ` intactos.
    - El agua de las juntas y de las baldosas hundidas es sólo rugosidad, como `enJunta` hoy.
  - **Acera y callejón:**
    - junta con rugosidad 0,25 fuera del charco (hoy 0,08: líneas cromadas);
    - baldosas repuestas y levantadas (N2), chicles, suciedad por la oclusión;
    - tacos filtrados por px hasta 5-6 m;
    - callejón en losas de 3×3 m con juntas serradas, canaleta (sólo rugosidad) y manchas.
  - **Tapas, imbornales, registros y alcorques** (`tapas.ts`, en el mobiliario, SIEMPRE por debajo de 0,2 m
    contando la acera), cediendo por tapa:
    - tapa con marco y dibujo de fundición (familia `fundicion`, relieve por normal y lo alto gastado);
    - imbornal hundido en la rigola; registros de servicios en la acera;
    - alcorque de 1,2 × 1,2 m alrededor de cada tronco del Bulevar.

    En N0, las tapas de hoy con otro albedo: dejan de ser manchas negras.
- **Ficheros.** `suelo.ts`, `tapas.ts`, `materia/familias/fundicion.ts` y `escritorio/scripts/quiebro-ciudad/suelo.ts`.
- **Niveles.** Como arriba.
- **Presupuesto.**
  - Mobiliario de la ventana: vados +300 en N0-N3; tapas y registros +0 / +1.500 / +3.000 / +5.000.
  - Asfalto y aceras de la base: +0.
  - fxc, con 40 de margen para la ola 3 en N1-N3: asfalto ≤ 2.303 / 2.801 / 3.460 / 4.460 y acera
    ≤ 2.072 / 2.032 / 2.760 / 3.460.
  - Mapa de alturas: el mismo, byte a byte.
- **Verificación.** Comunes, más `verify:quiebro-juego`. En `quiebro-ciudad/suelo.ts`:
  - (a) Para cada tramo «paso» de `laRedDeAceras`, hay rampa en la celda que cubre la línea de paso ±1 m, dentro
    de la cebra de 1-4,2 m (`suelo.ts:104-107`), y el mapa de alturas tiene el sha256 de `d4402d0`. Rojo: mover la
    rampa 3 m; tocar un téxel del mapa.
  - (b) Todo lo de `tapas.ts` queda por debajo de 0,2 m sobre el suelo que pisa. Rojo: una tapa a 0,25.
  - (c) Los sombreadores de asfalto, acera, tarjetas, salpicaduras y SSR incluyen el `GLSL_CHARCOS` de sha fijo, y
    ni el asfalto ni la acera escriben la máscara con términos nuevos. Rojo: una zanja que retiene agua en una
    copia.

  Fotos A, E, F, N y G en N1 y N3 y en las dos luces, A y E en N0, y R (vado con lluvia) en N1 y N3: tarjetas y
  salpicaduras posadas sobre la rampa y sin flotar al lado. Hay que mirar que la plaza no sea espejo al alba,
  las cebras y los vados, las tapas, el callejón y que el grano no se repita desde arriba.
- **Aceptación.**
  - En F al alba, la plaza tiene juntas y tono por pieza a 10-25 m.
  - Ninguna cebra acaba en escalón en N y E.
  - Asfalto de N0 y N1 con menos fxc que hoy.
  - Charcos y tarjetas en el mismo sitio: la máscara es idéntica en una foto de diferencia con `lluvia=0`.
  - Batería verde.

#### O2-MOBILIARIO

- **Objetivo.** Material del mobiliario con familias, y las piezas de `mobiliario.ts` con perfil de oficio.
  - **Material** `materialDelMobiliario(nivel)`:
    - `retoqueDeLaMateria` y reparto de familias sólo con `MATERIA_Q ≥ 1`;
    - familias `hierro` (desconchón en chaflanes y óxido que chorrea, N2-N3), `madera` (veta, gris de intemperie,
      más oscura y lisa arriba si llueve), `piedra` (moteado), `hormigon` (árido y manchas), `caucho`,
      `plastico` y `chapa` (suciedad al pie y pegatinas por hash, N3);
    - decodificar `aAcabado` antes del agua (`materiales.ts:64`);
    - `microRelieveQ` para las capas 4 y 5;
    - el retoque de lo cercano (neutro) sigue donde lo dejó la ola 1.
  - **Banco** de fundición: costados de perfil suave, listones redondeados con su hueco.
  - **Fuente** en torno: pilón con reborde, columna abalaustrada y taza con gallones; lámina de agua que cae y
    caños en el cristal, con `uTiempo` en el retoque del cristal. Cede en 2 pasos en g3.
  - **Quiosco de la plaza:** 8 columnas con capitel, 8 paños de cristal con id de paño y una máscara uniforme
    `vec4` para un rompible futuro, crestería por encima de 2,7 m y estantes con revistas en g3.
  - **Quiosco de prensa:** cantoneras, persiana de lamas pintada (el dibujo de las persianas de fachada),
    tejadillo volado por encima de 2,15 m, carteles y buzón de periódicos.
  - **Cabina** (`EL-QUIEBRO.md:48`, `:953`), distinta del refugio (`celda-mobiliario.ts` mira `c.refugio`,
    `tipos.ts:118`):
    - poste de hierro biselado y marquesina CURVA;
    - el **monedero** (ranura y cajetín de monedas), no un teclado;
    - el **auricular ámbar**, que es luz del jugador: pieza aparte, con su propio rango de vértices y su pivote
      exportados, para que otro frente pueda dejarlo balanceándose en la salida (`EL-QUIEBRO.md:562`);
    - el cordón, sólo desde g3;
    - letrero alto con un pictograma de auricular hecho con quads emisivos (sin sombreador nuevo; nada de marca);
    - todo lo que baja de 1,9 m cabe en su caja de 0,5 × 0,5 m (`quiebro-ciudad.ts:1673`, `:2124`);
    - el refugio, con otra linterna.
  - **Valla de obra** con perfil.
  - **`celda-mobiliario.ts`:** grados, y cada pieza cede en pasos que caben en el trozo (§3.1).
- **Ficheros.** `materiales.ts`, `cristal.ts`, `mobiliario.ts`, `celda-mobiliario.ts`,
  `materia/familias/{liso, hierro, madera, piedra, hormigon, caucho, plastico, chapa}.ts` y
  `escritorio/scripts/quiebro-ciudad/mobiliario.ts`.
- **Niveles.** Topes por pieza y grado en §3.1. Familias: N0 no; N1 variación grande y oscurecido del mojado
  (unas 12 instrucciones); N2 veta, grano, suciedad y desgaste de chaflán; N3 óxido, pegatinas y relieve de
  fundición.
- **Presupuesto.**
  - Mobiliario de la ventana: +500 / +600 / +4.500 / +12.000 (N1 en g1 en las 9 celdas; N3 sin g4).
  - Cristal: +100 / +300 / +400 / +500.
  - Emisivo (pictograma): unos +50 en todos los niveles.
  - fxc del mobiliario, con 100 de margen para la ola 3 en N1-N3 (40 del horizonte local y 60 de lo cercano):
    ≤ 461 (hoy) / 900 / 1.400 / 1.900.
  - 0 llamadas.
- **Verificación.** Comunes, más `verify:quiebro-juego`. En `quiebro-ciudad/mobiliario.ts`:
  - (a) Tabla `TOPE_POR_PIEZA` por grado, medida en las 32 trazas. Rojo: un banco de g1 con 200 triángulos.
  - (b) Triángulos por tipo con N0 ≤ N1 ≤ N2 ≤ N3.
  - (c) Cabina y refugio se construyen distintos, y el auricular de la cabina tiene su rango y su pivote.
  - (d) Todo id de familia escrito tiene su rama en el GLSL.
  - (e) Las luces que saca `MoldeQueNoGuarda` son las del molde que guarda.
  - (f) La comprobación de trozos de VERIFICACION (12) cubre todas sus piezas en todos los grados.

  Fotos A, D, F y L en N1 y N3 y en las dos luces, más A en N0 y en móvil. Hay que mirar el banco a 2 m, la
  fuente y el quiosco a 5-25 m, la cabina a 3 y a 60 m, y el brillo mojado en los chaflanes.
- **Aceptación.** Ninguna pieza fuera de su caja (la franja por grado, verde), todas las cajas pintadas, fxc de N0
  ≤ hoy, y las fotos A y F con la silueta nueva. La cabina es poste, marquesina curva, monedero y auricular
  ámbar. Batería verde.

#### O2-FAROLAS-Y-PIEZAS

- **Objetivo.** Las siluetas peores del mobiliario.
  - **Árbol del Bulevar:**
    - el tronco sigue en su caja de 0,5 hasta 2,6 m;
    - 3-7 ramas por encima de 2,6 m;
    - grumos de follaje (icosaedros achatados, normales esféricas, color por grumo);
    - familia `follaje` (ruido de hoja, huecos oscuros sin transparencia, N2+);
    - corteza de plátano por la materia.
  - **Farolas con perfil de fundición:**
    - calle: basa en torno con molduras, fuste que se estrecha con anillos y puerta, brazo con voluta y tirante,
      luminaria de perfil suave;
    - plaza: pedestal en tres cuerpos, fuste acanalado (g3 geometría, g2 sombreador) y farol de seis caras;
    - pared: ménsula de voluta y farol de cuatro caras con tejadillo.

    Por debajo de 1,9 m todo cabe en el radio de la caja. El vidrio de la cabeza (cuenco de 8 lados en g2+ y
    ampolla en g3) va en el emisivo con `aEmisor.y` = coordenada radial 0-1 (contrato con SEMAFOROS). Hoy el
    tipo 1 no usa la fase: `materiales.ts:105`.

    **Las luces devueltas NO se mueven de sitio** (`mobiliario.ts:107`, `:122`; `piezas.ts:212`), en ningún grado.
    Alimentan la luz horneada, los halos, las tarjetas y las 4-6 luces reales.
  - **Estatua** en torno y perfiles (sin forja), en 2 pasos en g3.
  - **Contenedor de carga** con puertas, bisagras, barras de cierre y cantoneras.
  - Carretilla, muelle y corte con biseles.
  - Toda pieza cede en pasos que caben en el trozo.
- **Ficheros.** `piezas.ts` (menos `soportalDePlaza` y el viaducto, que ya no están), `farolas.ts`,
  `materia/familias/follaje.ts` y `escritorio/scripts/quiebro-ciudad/piezas.ts`.
- **Niveles.** Topes de §3.1.
- **Presupuesto.** Mobiliario de la ventana +500 / +800 / +7.000 / +27.000 (N1 en g1; N3 sin g4). Emisivo
  +0 / +0 / +1.200 / +2.500. 0 llamadas.
- **Verificación.** Comunes, más `verify:quiebro-juego`. En `quiebro-ciudad/piezas.ts`:
  - (a) La posición de cada luz devuelta es la misma que en `d4402d0` (±1 cm), en cada grado. Rojo: subir la cabeza
    10 cm.
  - (b) Las ramas por encima de 1,9 m o dentro del radio del tronco.
  - (c) Los topes por pieza.
  - (d) Las banderolas (`voladizos.ts:295-306`) no atraviesan el fuste nuevo.

  Fotos A, E y la del Bulevar (`pos` de la auditoría de mobiliario, a fijar en FOTOS) en N1 y N3 y en las dos
  luces. Hay que mirar la copa a 10-40 m, la farola a 3 m y que halos y cabeza coincidan.
- **Aceptación.** El árbol deja de ser un rombo en todos los niveles. Luces en su sitio. Batería verde.

#### O2-VEHICULOS

- **Objetivo.** El coche deja de ser una caja, el tren deja de verse negro y el viaducto gana volumen.
  - **Arreglos inmediatos, todos los niveles:**
    - bajos 1 cm hacia dentro y bajados a 0,12-0,26 m: se acaba el parpadeo del estribo (`coches.ts:102` contra
      `:107`);
    - pasos de rueda recortados en el perfil;
    - rueda de 0,31 con el centro a 0,31, sin tapa interior;
    - llanta de metal 0,6 y rugosidad 0,35, con disco oscuro;
    - faros como lente sobre reflector, sin gris emisivo, y pilotos en banda;
    - retrovisores plegados (≤ ±0,86).
  - **Loft** (`Molde.seccionado`) con cinco carrocerías: compacto de 3,9 m, berlina y familiar de 4,45,
    furgoneta, y taxi.
    - TODAS de 1,75 m de ancho como mucho.
    - El tipo sale en el CLIENTE (`plano.ts:80-83`) de la semilla. No se toca `shared/`.
    - **Los cuatro grados** (§3.1): g1-g3 para los coches horneados según `GRADO_DE_LOS_COCHES_POR_NIVEL` (N0 g1,
      N1 g1, N2 g2, N3 g3 en el bloque de 3×3 y g2 fuera), y g4 (interior, llanta de radios, manillas y matrícula)
      para la capa de lo cercano, que la usa en la ola 3.
    - Cada coche cede en pasos que caben en el trozo: g3 en 2 pasos y g4 en 4.
    - Faros y pilotos en el MISMO sitio en los cuatro grados (±1 cm).
  - **Familia `carroceria`:**
    - `barniz` en su `SuperficieQ`: el lóbulo lo pone la materia (§2.2) con muro sin rejilla en N1 y la rejilla de
      ventanas nítida en N2+;
    - juntas de puertas pintadas en la banda de UV (N1+);
    - suciedad baja (N1+), gotas en lo horizontal (N2+) y regueros (N3).
  - **Familia `llanta`.** Matrícula de formato INVENTADO (dos letras, cuatro cifras y una letra) con caracteres de
    bloques en el sombreador, desde N2.
  - **Tren:**
    - familia `aluminio` (metal 0,35, rugosidad 0,35 y estrías por normal): ya coge la luz de la calle
      (`retoques.ts:139-144`);
    - carrocería por secciones, puertas, fuelles, bogies con ruedas, equipos de techo;
    - ventanas con interior falso: emisivo tipo 3, con viajeros por hash desde N2 y marco oscuro;
    - temblor de ±1,2 cm y ±0,15° en función del tic, sin memoria nueva por fotograma (`tren.ts`);
    - `materialesDelTren(nivel)`, que el gancho de PARTICION-CIUDAD registra con `suyo()`. Se decide a propósito
      si el tren lleva el fundido.
  - **Viaducto** (`viaducto.ts`):
    - pilar con plinto achaflanado, fuste octogonal dentro de 1×1, bajante, capitel en seta por encima de 1,9 m
      y apoyos;
    - viga trapezoidal con goterón, juntas cada 24 m, bandeja de cables y pasarela en g3;
    - **la franja de luz verde-cian bajo el peto, por los dos lados, se conserva** (`piezas.ts:274-283`): es el
      hito «el Elevado, con su franja de luz» (`CIUDAD-ABIERTA.md:263`);
    - familia `viaducto`: chorretones bajo juntas y apoyos;
    - exporta `seccionDelViaducto(grado)` (pilar y viga), que LEJANO usa para la LOD1;
    - cede por pilar y por tramo.

    La viga en alambre del borde sigue casando con la sección nueva (`borde.ts:258-263`). NO se tocan la ley de la
    cortina ni su texto (`verificar-quiebro-ciudad.ts:1440-1447`).
- **Ficheros.** `coches.ts`, `tren.ts`, `viaducto.ts`, `emisivo.ts` (el tipo 3 y las lentes), `borde.ts` (sólo la
  viga), `plano.ts` (sólo el tipo de coche), `materia/familias/{carroceria, llanta, aluminio, viaducto}.ts` y
  `escritorio/scripts/quiebro-ciudad/vehiculos.ts`.
- **Niveles.**

  | Nivel | Coches horneados | Lo cercano (ola 3) | Tren |
  |---|---|---|---|
  | N0 | g1 (≤ 180) | — | 220 |
  | N1 | g1 | 4 en g2 | 500 |
  | N2 | g2 (≤ 450) | 6 en g3 | 3.000 |
  | N3 | g3 en el 3×3, g2 fuera | 8 en g4 | 7.000 |

  Los coches pasan por la familia `carroceria` desde N1; el barniz nítido, desde N2.
- **Presupuesto.**
  - Coches horneados en el mobiliario de la ventana (el peor, con 45 / 45 / 68 / 95 coches, que es lo medido en
    la traza 0 más un 15 %):

    | Nivel | Hoy | Plan | Diferencia | Viaducto |
    |---|---|---|---|---|
    | N0 | 6.900 | 8.500 | +1.600 | — |
    | N1 | 16.200 | 8.500 | −7.700 | +1.000 |
    | N2 | 35.800 | 35.200 | −600 | +4.000 |
    | N3 | 52.600 | 74.500 | +21.900 | +8.000 |
  - Cristal: +150 / +500 / +1.800 / +3.500. Emisivo (lentes y tipo 3): unos +550 / +550 / +800 / +1.100.
  - Tren: coches 300 / 500 / 3.000 / 7.000 y ventanas 200 / 200 / 300 / 300.
  - 0 llamadas.
- **Verificación.** Comunes, más `verify:quiebro-juego`. En `quiebro-ciudad/vehiculos.ts`:
  - (a) Cada tipo, grado (g1-g4) y orientación: la envolvente entre 0,2 y 1,9 m cabe en 4,5 × 1,75 más la
    holgura. Rojo: un coche escalado ×1,05.
  - (b) Detector de caras coplanares solapadas (mismo plano ±1 mm, áreas que se pisan) en un coche y un pilar de
    cada grado. Rojo: los bajos de hoy.
  - (c) Pilar del viaducto dentro de su caja de 1×1 en la franja.
  - (d) El temblor del tren es función pura del tic.
  - (e) No se renombran las mallas del tren: el comprobador excluye `coches` y `ventanas`
    (`verificar-quiebro-ciudad.ts:473`).
  - (f) Faros y pilotos a ±1 cm entre los cuatro grados de cada tipo. Rojo: un faro de g4 adelantado 3 cm.
  - (g) Hay emisivo de la franja de luz en cada tramo del Elevado de la ventana. Rojo: quitarla en una copia.

  Fotos B, H, M y E en N1 y N3 y en las dos luces, y B en N0 y en móvil. Hay que mirar la rueda y la llanta a
  2-3 m, que no haya franja punteada, el reflejo de ventanas en las puertas en N2+ y el tren de noche.
- **Aceptación.** Ni rastro del parpadeo del estribo en B y H en ningún nivel. Las ruedas se ven en N0. Tren
  legible de madrugada. La franja de luz del Elevado se ve en M. Batería verde.

### OLA 3: las familias II (silueta, lo lejano, las luces y lo cercano)

#### O3-SILUETA

Es UN paquete: la silueta alta y la baja comparten ficheros (la faja de la imposta en `glsl-hueco`, los miradores
contra `tieneBalcon` y el soportal) y presupuesto. En N2 las cornisas suman +16.000 y los balcones con patrón
restan 41.000, y la reserva de fachadas es de 80.000 contra 76.454 medidos hoy. Por eso el orden de trabajo es
fijo: **primero bajo y balcones (fase A), después cornisas, ritmo, azoteas, soportal y voladizos (fase B)**, y se
mide al acabar cada fase.

- **Objetivo.**
  - **Grado (fase A).** Se retira `relieveDeHoy` de la obra y `relieveSoloEnElCentro` de `tipos.ts` (`:240`,
    `:286`): sólo manda `(nivel, grado)`. `relieve` se queda, porque lo usa el barrio.
  - **Bajo hundido** (`fachada/bajo.ts`, fase A). La cara del volumen 0 se parte por tienda, con la MISMA partición
    del sombreador: 6 m desde `c.desde` (`fachadas.ts:490-497`).
    - Machones y zócalo a haces de la caja; paño 6 cm hacia dentro.
    - Escaparate, portal y persiana 0,20-0,25 m hacia dentro, con jambas, dintel y umbral en bulto. Tipo nuevo
      `derrame`, que pinta `muroQ` oscurecido.
    - Cajón de la persiana (0,15 m fuera, a 3,0-3,4 m) y guardapolvo del portal, ambos por encima de 1,9 m.
    - El fondo lleva las mismas UV, así que el sombreador pinta escaparate, cuarto falso, persiana y reja sin
      cambios.
    - `escaparatesDe` pone la tarjeta en el plano hundido: plano − 0,20 + 0,05. Es igual en todos los grados, así
      que las fuentes no cambian con el grado.
    - En los soportales no se rehunde dos veces.
    - Todo lo que queda entre 0,2 y 1,9 m está DENTRO de la caja: la franja se cumple sin cajas nuevas.
  - **Planta baja con oficio** (`glsl-bajo.ts`, fase A):
    - zócalo de 0,5-1,0 m por estilo y edad (hoy son 20 cm de color, `fachadas.ts:594-596`);
    - cantoneras; bisel de esquina por normal;
    - chapado por tienda con el hash de `queTiendaQ` (mármol, madera con junquillos, chapa, azulejo o el muro):
      el escaparate encendido nunca cae sobre un frente ciego;
    - dintel del rótulo con canto; veteado de mármol (N3, a menos de 15 m); paralaje del zócalo (N3).
  - **Balcones de oficio** (`fachada/balcones.ts` y `fachada/caras.ts` sólo en `atributosDelMuro`, fase A):
    - `patronDeBalcon(e)`: todas las plantas, principal corrido y sueltos, sólo 1-2, alternos, o corrido en la
      última. Sale del hash de la semilla, es adorno del pintor y quita un 35 % de balcones;
    - **balconera**: donde hay balcón, el hueco baja al suelo y la bandeja va al forjado. **Es igual con y sin
      relieve y en todo grado**: la LOD1 y N0 escriben el mismo patrón en `aPlanta.y` y pintan la misma
      balconera, con un antepecho de hierro de balcón francés donde no hay losa. Así el edificio no cambia de cara
      al entrar en la ventana (`lejos.ts:8-10`);
    - la regla `tieneBalcon` pasa a PCG en `hash.ts` y su gemela `tieneBalconQ` a `glsl-hueco.ts`;
    - ligero (8), medio (20: bandeja con canto, 2 ménsulas de perfil, tarjeta y pasamanos) y fino (48: goterón,
      ménsulas de 4 aristas, pletinas);
    - la barandilla sigue siendo de sombreador con `discard` y su paño macizo de lejos. N0 no lleva losas;
    - `tieneBalcon` descuenta las columnas con mirador y con escalera de incendios (las dos decisiones viven en
      este paquete).
  - **Cornisas por perfil** (`remate.ts`, fase B), extruido con ingletes, según el estilo:
    - piedra y revoco: corona volada; ladrillo: aplantillada de 3 escalones; azulejo: alero fino; vidrio y
      hormigón: remate metálico;
    - pretil con albardilla de 4 cm de vuelo;
    - modillones en bulto en g3 y pintados en g2;
    - impostas en bulto en g3, siguiendo EXACTAMENTE la regla de la faja pintada (`fachadas.ts:480-487`, en
      `glsl-hueco.ts`). Es regla doble y lleva su paridad en `paridad.ts`;
    - g1 (N0, N1 y el borde de N2-N3): cornisa de listones, pretil e imposta pintada.

    La cornisa sigue fuera del muro y nunca sobre la azotea (`fachadas.ts:1019-1020`). Cede por tramo de cornisa.
  - **Molduras analíticas** (`glsl-piezas.ts`, fase B):
    - subtipo en `aCara.z` (1 cornisa, 2 imposta, 3 pretil, 4 losa de balcón, 5 pilar, 6 caseta, 7 viga), que
      `cajaDeRelieve(..., subtipo)` ya acepta desde la ola 1;
    - perfil 1D en la normal y cavidad;
    - color del relieve por estilo y tinte (hoy es fijo, `fachadas.ts:351-354`);
    - ménsulas pintadas.
  - **Ritmo vertical** (`ritmo.ts`, sólo por encima de 4,5 m, fase B):
    - pilastras cada 2-3 vanos en piedra, revoco y azulejo, con la rejilla de `recorrerLosHuecos` (N1+);
    - cantoneras de sillares en g3;
    - miradores (g2+): su frente es `TIPO.fachada` con los parámetros del vidrio, y quitan balcón y aparato de aire
      de su columna;
    - aletas en hormigón y vidrio.
  - **Azoteas pobladas** (`remate.ts`, fase B): chimeneas y shunts, claraboyas (subtipo; se encienden sólo en el
    sombreador, sin gemelo), caseta con alero, maquinaria con patas, conductos, depósito de 16 lados, antenas
    (≥ 6 cm, g3) y albardillas.
    - Evitan el centro si `hayRemateDeTorre(e)` o `hitoDe(e)`.
    - Ponen un respiradero en cada punto de `respiraderosDe(e)`, que el vapor usa.
  - **Medianeras y azoteas con historia** (`glsl-piezas.ts`, fase B):
    - ladrillo desnudo o enfoscado con remiendos, huella del derribo;
    - anuncio pintado desvaído: un rectángulo de color con letras borrosas procedurales, sin texto legible ni
      marcas;
    - bajantes pintadas;
    - baldosín catalán o grava según el estilo.
  - **Soportal con orden** (`fachada/soportal.ts` y `soportalDePlaza` de `piezas.ts:219`, fase B): basa de
    granito, fuste achaflanado DENTRO de la caja, zapata por encima de 1,9 m, vigas sin coplanaridad con el techo
    (`fachadas.ts:1101-1102`) y casetones pintados.
  - **Voladizos con oficio** (`voladizos.ts`, fase B):
    - aparato de aire con ventilador, rejilla, escuadras y desagüe;
    - bajantes desde la cornisa hasta 2,2 m (por debajo de 1,9 m no salen de la caja);
    - brazos de toldo y soporte de banderola;
    - cables con radio y lados por nivel, colgados sólo donde pasan de 2 px a 15 m;
    - **escaleras de incendios** (`voladizos.ts:104`, lo más caro de los voladizos del barrio, `presupuesto.ts:88-99`):
      descansillos con rejilla pintada en la familia hierro, barandilla de pletina con menos cajas, zanca con
      perfil y escala plegada. En su columna no hay balconera ni mirador;
    - no chocan con `tieneBalcon`.
- **Ficheros.** `fachada/{remate, ritmo, glsl-piezas, bajo, balcones, soportal, glsl-bajo, glsl-hueco, glsl-cuerpo,
  declaraciones, tipos-de-cara}.ts`, `fachada/caras.ts` (sólo `atributosDelMuro`), `grados.ts`, `tipos.ts`,
  `voladizos.ts`, `hash.ts`, `piezas.ts` (sólo `soportalDePlaza`) y
  `escritorio/scripts/quiebro-ciudad/{silueta, bajos, paridad}.ts`.
- **Niveles.**

  | Nivel | Bajo | Balcones | Cornisa y ritmo | Oficio en el sombreador |
  |---|---|---|---|---|
  | N0 | 16 por tienda (machones, zócalo y hueco sin cajón) | balconera pintada, sin losa | listones, pretil, imposta pintada | zócalo en color |
  | N1 | 16 por tienda | ligeros | listones, pretil, pilastras | + cantoneras, chapado en albedo |
  | N2 | 26 (g2) y 34 (g3) | medios (g2) y finos (g3) | perfil, miradores y aletas; modillones pintados en g2 | + normales |
  | N3 | 26 (g2) y 34 (g3) | medios y finos | + modillones e impostas en bulto, sillares de cantonera y antenas en g3 | + mármol y paralaje |
- **Presupuesto.**

  | Nivel | Fase A (bajo + balcones) | Fase B (cornisas, ritmo, azoteas, soportal) | Fachadas, neto | Voladizos (mobiliario) |
  |---|---|---|---|---|
  | N0 | +3.400 | +2.000 | +5.400 | +0 |
  | N1 | +6.400 | +5.000 | +11.400 como mucho | +500 |
  | N2 | −31.200 | +16.000 | −15.200 | +3.500 |
  | N3 | −500 | +45.000 | +44.500 | +15.000 |

  0 llamadas. fxc de la fachada dentro de los topes de §7.4, contando lo de PAREDES; en N1, dentro del margen de
  40 que la ola 2 dejó para el horizonte local no entra: SILUETA no lo gasta.
- **Verificación.** Comunes, más `verify:quiebro-juego` (cámara al hombro, 2904) y `verify:quiebro-personajes`. En
  `quiebro-ciudad/silueta.ts`:
  - (a) «Relieve hasta 40 m en N1»: para cada cámara de N1, toda cara de calle a menos de 40 m tiene cornisa. Hoy
    fallaría en la plaza de la traza 0. Rojo: volver a `relieveSoloEnElCentro`.
  - (b) Grosor mínimo por grado (§3.1), sobre las cajas de lo escrito. Rojo: una antena de 3 cm.
  - (c) Ninguna cara de cornisa coplanar con la azotea.
  - (d) Latencia de la ventana y margen del cruce en las 32 trazas (los de `verificar-quiebro-ciudad.ts:731-793`):
    ≤ 207 fotogramas y ≥ 12 m.
  - (e) Ninguna maquinaria de azotea sobre un `hitoDe` ni un `hayRemateDeTorre`, y un respiradero en cada punto
    de `respiraderosDe`.

  En `quiebro-ciudad/bajos.ts`:
  - (f) Toda la geometría del bajo entre 0,2 y 1,9 m, dentro de la caja; y la caja sigue pintada a 0,3, 0,9 y
    1,5 m (`verificar-quiebro-ciudad.ts:220-242`).
  - (g) La tarjeta del escaparate queda en la acera.

  En `quiebro-ciudad/paridad.ts` (los literales en Node y la evaluación en la GPU con `verify:quiebro-gl`):
  - (h) `tieneBalcon` JS contra el GLSL, bit a bit, en una rejilla de semillas, celdas y plantas. Rojo: cambiar el
    umbral del patrón en una copia del GLSL.
  - (i) Las impostas en bulto contra la faja pintada. Rojo: la faja del revoco cada 2 plantas en vez de 3 en una
    copia.
  - (j) La balconera es la misma en la LOD1 y en la ventana: `aPlanta.y` de la LOD1 y de la celda, igual para cada
    cara. Rojo: escribir el patrón sólo con relieve.

  Fotos I, C, E, J, G, K y D en N1 y N3 y en las dos luces; E, G, I y C en N0 y N2; y P (recentrado) en N0, N1 y
  N3. Hay que mirar las dos aceras de N1, el perfil contra el cielo en N0, las azoteas a 40 m, el escaparate hundido
  a 2 m y la balconera, que ninguna ventana encendida quede sin su tarjeta, y que en P no cambie nada a menos de
  40 m.
- **Aceptación.**
  - En J, en N1, las dos aceras tienen cornisa (hoy, sólo una). N0 tiene perfil contra el cielo.
  - El bajo tiene fondo en N0-N3 en I y C.
  - N2 baja al menos 12.000 triángulos de fachadas sobre lo medido hoy (fases A + B).
  - En P, entre antes y después del cruce, no cambia ningún píxel a menos de 40 m de la cámara.
  - Paridades en verde y vistas en rojo.
  - Latencia y margen del cruce en verde, y batería verde.

#### O3-LEJANO

- **Objetivo.** Suelo, luces y silueta de lo lejano, sin enseñar calles donde no se anda (`CIUDAD-ABIERTA.md:224`,
  `:230`).
  - **Suelo lejano** (capa). Disco de 360 a unos 880 m con hueco cuadrado exacto sobre ±360:
    - suelo oscuro con un resplandor difuso de sodio, más fuerte hacia la ciudad, SIN trazado de calles, farolas
      ni semáforos;
    - apagado por `uFarolas`, con `nieblaEn`;
    - las cajas lejanas bajan a y = −1 para posarse.
  - **Luces lejanas** (capa, `InstancedMesh` de sprites aditivos):
    - las 812 luces de calle de DENTRO de la ciudad que quedan fuera de la ventana (tiradas dentro de ella): son
      calles que se andan;
    - balizas rojas en los edificios de más de 45 m, que parpadean a 40 por minuto con `uTiempo`: una por torre en
      N0, las cuatro esquinas en N1, más la media altura y la ciudad lejana en N2, y el destello blanco al alba y
      el halo en la niebla en N3;
    - tamaño mínimo de unos 2,5 px.
  - **Ciudad lejana** (`anillo.ts` y la capa `lejana`):
    - formas K0, K1 y K2 (zócalo, fuste y remate);
    - altura con 2-3 centros por semilla (composición, no ruido), en grupos irregulares: nada de rejilla de
      manzanas con calles de 12 m, que desde 150 m se leería como calles;
    - plantas de 4,5 + 3 m, paleta por estilo, oficinas y viviendas, tira de tiendas;
    - trama de salida entre 820 y 880 m.

    Se mantiene que N3 es N0 con más cajas (`anillo.ts:363-368`) y que el barrio sigue funcionando
    (`construir.ts`, que usa `CAJAS_LEJANAS` de `anillo.ts:358`).
  - **Horizonte** (capa `lejana`):
    - escribe la profundidad del plano lejano y ya no tapa cajas (hoy corta 413 de 1.500 en N3);
    - anclado al centro con radio de 1.100 m (su `actualizar` deja de seguir a la cámara), la niebla evaluada en un
      punto a 780 m;
    - misma paleta y rejilla; segunda fila en N2+.
  - **Resplandor de sodio**, sólo en los sombreadores del horizonte, de la ciudad lejana y del suelo lejano, con
    `uColorDeSodio` de `UNIFORMES_DE_LA_CIUDAD`. NO en `niebla.ts`: la niebla es de todos los materiales, también
    los personajes (`niebla.ts:12-20`), y el diseño la fija verde-cian (`EL-QUIEBRO.md:526`).
  - **El cielo** (`atmosfera/cielo.ts`): el resplandor de la ciudad bajo las nubes, con los colores que ya tiene, y
    las nubes con relieve iluminado desde abajo. La paleta no cambia. Las columnas de Grafía siguen detrás de la
    niebla (`verificar-quiebro-efectos.ts:733-745`).
  - **Remates de torre en la ventana** (`fachada/torres.ts`, N2+): mástil, aguja, corona de celosía (con `discard`
    en N2+), góndola, helipuerto y pretil de chapa.
  - **La LOD1 del Elevado** (`lejos.ts:186-189`) con la sección de g1 de `seccionDelViaducto(1)` (O2-VEHICULOS) y el
    subtipo 7: el pilar y la viga no saltan al entrar en la ventana.
  - **Hitos del §2.7** (`CIUDAD-ABIERTA.md:261-266`), en los edificios que da `hitoDe(e)`:
    - la chimenea de las Naves, de 45 m, con baliza;
    - la cúpula de la Lonja;
    - la torre del reloj de la Glorieta, de 36 m y con la esfera a la hora de la noche. Mientras Miguel no
      conteste la pregunta 4 (§11), va sobre un edificio que da a la Glorieta.

    Unos 270 triángulos en la LOD1 (`lejos.ts`), con `aCeldaQ = NUNCA` (`lejos.ts:50`): no se tiran dentro de la
    ventana, y ninguna celda los escribe, así que no desaparecen al acercarse ni se pintan dos veces.
- **Ficheros.** `lejos.ts`, `anillo.ts`, `anillo-de-la-ciudad.ts`, `fachada/torres.ts`,
  `capas/{lejana, suelo-lejano, luces-lejanas}.ts`, `construir.ts`, `atmosfera/cielo.ts` y
  `escritorio/scripts/quiebro-ciudad/lejano.ts`.
- **Niveles.**
  - Suelo lejano: el mismo en todos los niveles, con el resplandor más largo en N2+.
  - Balizas: como arriba.
  - Ciudad lejana: N0 300 cajas K0, N1 400, N2 800 y N3 1.500 con K2.
  - Horizonte: una fila en N0-N1 y dos en N2-N3.
  - Remates de torre: N2+.
- **Presupuesto.**
  - Suelo lejano: 256 triángulos y 1 llamada, en todos.
  - Luces lejanas: 2.200 / 2.900 / 3.500 / 5.500 y 1 llamada.
  - Ciudad lejana: 3.000 / 6.000 / 12.000 / 50.000.
  - Horizonte: 192 / 192 / 384 / 384.
  - Lejos (hitos y la sección del Elevado): +300.
  - Fachadas de la ventana (torres): +0 / +0 / +300 / +500.
  - Llamadas: +2 en todos los niveles.
- **Verificación.** Comunes, más `verify:quiebro-efectos` (las columnas del cielo siguen detrás de la niebla,
  `verificar-quiebro-efectos.ts:733-745`) y `verify:quiebro-personajes` (el cielo es de todos). En
  `quiebro-ciudad/lejano.ts`:
  - (a) Toda caja lejana y torre de detrás tiene suelo pintado debajo. Rojo: acortar el disco.
  - (b) Ninguna caja lejana pasa de 900 m desde una cámara en ±270 sin su trama, o el horizonte escribe la
    profundidad del plano lejano (por el texto del sombreador).
  - (c) Ninguna luz lejana dentro de la ventana ni fuera de ±270 (salvo balizas); una baliza sobre cada edificio de
    más de 45 m.
  - (d) Las llamadas no cambian al cruzar.
  - (e) Niebla en todos los materiales nuevos (`verificar-quiebro-ciudad.ts:355-370`).
  - (f) `niebla.ts` y `paleta.ts` tienen el sha de `d4402d0`. Rojo: tocar un espacio.
  - (g) Los hitos se pintan con la ventana encima: con `aCeldaQ = NUNCA`. Rojo: escribirlos con su celda.

  Fotos L, G, M y E en N1 y N3 y en las dos luces, y L en N0. Hay que mirar que no quede nada flotando, que desde
  150 m no se lean calles fuera de ±270, que no haya salto en el horizonte al cruzar, y el pilar del Elevado al
  entrar en la ventana.
- **Aceptación.** En L al alba no hay cajas flotando. De madrugada, en L y G, las calles DE LA CIUDAD se ven
  encendidas y hay balizas; más allá del borde, resplandor sin trazado. Los hitos se ven desde 20 m y desde 300 m.
  Batería verde.

#### O3-NEONES

- **Objetivo.** Que el rótulo se lea como tubo de vidrio, que haya variedad, que cada esquina tenga su placa de
  calle y que la ciudad ponga sus pantallas de Grafía.
  - **Fuente de trazo** (`tubos.ts`): unos 45 glifos (A-Z, Ñ, Á, É, Í, Ó, Ú, Ü, 0-9, «·», «-», «/») como
    polilíneas en metros de tubo, con los enlaces entre letras marcados como tapados.
  - **Atlas** como campo de distancia EXACTO calculado en JS, sin lienzo (en Node sale lo mismo y se puede
    comparar): 32 px por glifo en N0-N1 (256×192 R8) y 64 px en N2-N3 (512×384 R8).
  - **Sombreador de `neones.ts`:** núcleo caliente, cuerpo, resplandor con caída por nivel y más corto al alba,
    electrodos y pintura de tapado. La chapa deja de ser negra en todos: toma un tono pintado del color del rótulo
    (`neones.ts:446`).
  - **Variedad** con `mezclar(x, z, texto)` en el cliente y el modo en `aNeon.a`: tubo, caja de luz,
    retroiluminado, dos líneas con subtítulo de una tabla del cliente (COMIDAS · CAFÉS, DESDE 1964, TEL. 4 21 07,
    HABITACIONES, BILLAR, 24 H…; todo inventado) y placas junto a la puerta por encima de 1,9 m.
  - **Farmacia:** rótulo de neón magenta «FARMACIA», y ninguna cruz verde, porque el verde-cian es del código
    (`EL-QUIEBRO.md:53`).
  - **Fallo por letra:** 1 de cada 6 rótulos que parpadean lleva una letra con su propia semilla o muerta.
  - **Placas de calle** en cada esquina (`CIUDAD-ABIERTA.md:270`), a 2,6-3 m, en la cara del edificio de la
    esquina: el nombre de `nombreDeCalle` (`shared/arcade/juegos/quiebro-nombres.ts:485`), con los índices de la
    noche (`quiebro-ciudad.ts:1519`), pintado con el atlas en modo placa (azulejo, letras oscuras, sin brillo),
    en la familia neones. `shared/` sólo se lee.
  - **Pantallas de Grafía:** `pantallas.ts` elige, en caras de calle comerciales y por encima de 2,2 m, los sitios
    de hasta 12 / 20 / 28 / 36 pantallas (`efectos/presupuesto.ts:89`, que las cuenta en el presupuesto de
    efectos). `LaCiudadDeNoche.tsx` recibe la prop `pantallas` y, al cambiar la ventana, vacía y pone. `Quiebro.tsx`
    le pasa `sistema.pantallas` (una línea).
  - **Tubos cercanos** (capa):
    - en N2, cintas de 2 triángulos por segmento; en N3, prismas de 3 caras con soportes y cable;
    - en los rótulos a menos de 35-40 m;
    - búfer reservado, copia a trozos, cero memoria nueva con la cámara quieta;
    - el transformador, en el mobiliario por encima de 3 m.
  - **Luz pintada** (capa, mezcla `DstColor, One`): festón de las lámparas de pared y lavado de los rótulos sobre
    el muro, con parpadeo, apagada por `uFarolas` y bajada por `uRejillaDeGlifos`; se pinta después de lo opaco y
    antes de lo aditivo. En N1, los rótulos a menos de 40 m; en N2+, todo; en N3, la sombra del brazo.
  - `{ ancho, alto, eje }` de cada fuente de rótulo, que ya vienen de la ola 1, se conservan (contrato con
    LUZ-EN-EL-AIRE).
- **Ficheros.** `neones.ts`, `tubos.ts` (nuevo), `luz-pintada.ts` (nuevo), `pantallas.ts` (nuevo),
  `capas/{tubos, luz-pintada}.ts`, `LaCiudadDeNoche.tsx` (la prop), `escritorio/src/quiebro/Quiebro.tsx` (una línea)
  y `escritorio/scripts/quiebro-ciudad/neones.ts`.
- **Niveles.** Como arriba.
- **Presupuesto.**
  - Neones: +100 / +400 / +1.000 / +1.900, y placas +150 en todos.
  - Tubos: 0 / 0 / 5.000 / 22.000 y 1 llamada en N2+.
  - Luz pintada: 0 / 200 / 800 / 800 y 1 llamada en N1+.
  - Mobiliario (chapas y transformadores): +200 / +300 / +1.200 / +1.500.
  - Pantallas: 0 en la ciudad; su gasto es de efectos.
  - Atlas: de unos 0,68 MiB a 0,06 (N0-N1) o 0,26 MiB (N2-N3).
- **Verificación.** Comunes, más `verify:quiebro-efectos` (las pantallas). En `quiebro-ciudad/neones.ts`:
  - (a) Todo carácter de `ROTULOS_DE_TIENDA`, `ROTULOS_DE_NEON`, los subtítulos y los nombres de calle tiene su
    trazo. Rojo: una Ñ borrada.
  - (b) Todo segmento cae dentro de la chapa más 5 cm.
  - (c) El atlas es igual byte a byte en dos construcciones.
  - (d) Tubos y luz pintada con la cámara quieta: < 1 KiB por fotograma (`verificar-quiebro-ciudad.ts:1411`).
  - (e) Relevo: la textura del atlas se suelta como hoy (`verificar-quiebro-ciudad.ts:1176-1270`).
  - (f) Nada de ámbar ni de verde-cian en rótulos y placas (`quiebro-barrio.ts:571-576`).
  - (g) Cada esquina de la ventana tiene sus placas, por encima de 1,9 m.
  - (h) Las pantallas no pasan de su cupo por nivel y quedan por encima de 2,2 m.

  Fotos D y la del rótulo a 3 m (la de la auditoría de luces, con `pos` a fijar) en N1 y N3 y en las dos luces, y
  D en N0. Hay que mirar el tubo a 3 m, el rótulo al alba, la variedad en E y una placa en una esquina.
- **Aceptación.** Rótulo nítido a 3 m en N0, tubo con volumen en N3, no todos iguales en E, placa legible a 5 m y
  pantallas en la calle en el juego. Batería verde.

#### O3-LUZ-EN-EL-AIRE

- **Objetivo.** Halos, haces, vapor, tarjetas, salpicaduras y lluvia que se comportan como luz y como agua.
  - **`GLSL_PARPADEO` único** con PCG entero en vez de `sin` (`glsl.ts`): el mismo en neones, halos y tarjetas.
    Las fuentes de reflejo ganan `parpadeo` (`fuentes.ts:79`), así que la tarjeta parpadea con su rótulo.
  - **Halo con la forma del rótulo:**
    - rectángulo en su plano con `aEje` por instancia, con `{ ancho, alto, eje }` de la fuente (§5.2.11);
    - adelanto de 0,3 m como mucho (hoy `min(radio × 0,9, d × 0,5)`);
    - las farolas, en círculo.
  - **Haces visibles:**
    - integral analítica de la dispersión en el cono, sólo cara delantera;
    - `ALTO` por instancia (`aCabeza.w`): el cono de la farola de plaza, colgada a 4,15 m, deja de atravesar el
      suelo (`haces.ts:16`, `:52`, `:68`);
    - ruido 3D y 24 lados cerca en N3;
    - `uHaces` y `uFarolas` como hoy.
  - **Vapor visible y cerca:**
    - el hash elige las bocas posibles (35 %) y se pintan las K más cercanas a la cámara;
    - fase de Henyey-Greenstein con el gradiente del mapa de luz;
    - albedo 0,12 y alfa 0,7 (hoy `vapor.ts:50` y `:53`);
    - 8-10 bocanadas en N2-N3; fbm de 2 octavas en N0-N1;
    - respiraderos de azotea en N3, en los puntos de `respiraderosDe(e)` (§5.2.3);
    - apagado a menos de 1 m de la cámara.

    K por nivel en `BOCAS_DE_VAPOR_POR_NIVEL`, dentro de `vapor.ts`.
  - **Tarjetas:**
    - estela rota con el grano de la materia (`uRuidoQ`);
    - tinte de agua sucia;
    - control de bordillo en el fragmento, leyendo `uAlturas`: en N0, multiplicar por 0, nada de `discard`.
  - **Salpicaduras** (`lluvia.ts`): color del reflejo, radio de 8 cm, sólo sobre charco > 0,3, y corona en N3.
  - **Rayas de lluvia** (`lluvia.ts`): toman el color de la luz de la calle que tienen al lado (`luzEnQ`), como ya
    hacen las salpicaduras. Mismo número de gotas por nivel.
  - **Horizonte local reflejado** (capa `horizonte-local`), **sólo N1+**:
    - 64 rayos al recentrar la ventana, a una `DataTexture` de 64×1 RGBA16F (512 B), interpolada en 1 s;
    - la usa una función NUEVA, `cieloReflejadoLocalQ`, sólo desde `RETOQUE_ENTORNO` (`retoques.ts:112-146`) y
      dentro de `#if defined(MATERIA_Q) && MATERIA_Q >= 1`: N0 no paga nada, y N1-N3 pagan dentro del margen de 40
      instrucciones que dejó la ola 2 (§5.2.9);
    - `GLSL_CIELO_REFLEJADO` queda intacto porque lo usan los personajes (`personajes/material.ts:243`, `:278`);
    - quita el «parece agua» del alba sin quitar el agua.
- **Ficheros.** `halos.ts`, `haces.ts`, `vapor.ts`, `reflejos.ts`, `fuentes.ts`, `glsl.ts`, `retoques.ts`,
  `capas/horizonte-local.ts`, `atmosfera/lluvia.ts` y `escritorio/scripts/quiebro-ciudad/luces.ts`.
- **Niveles.** Como arriba.
- **Presupuesto.**
  - Vapor: 48 / 80 / 220 / 400.
  - Halos: 500 / 600 / 900 / 1.200.
  - Tarjetas: 800 / 1.100 / 2.300 / 4.200.
  - Salpicaduras en N3: 1.280.
  - Haces: 4.500 / 6.900 en N2 / N3.
  - 0 llamadas nuevas. Horizonte local: 512 B de textura, en N1+.
  - fxc: N0 sin cambio en ningún material de la ventana; N1-N3, como mucho +40 sobre lo que dejó la ola 2.
- **Verificación.** Comunes, más `verify:quiebro-materia` (las tarjetas y la lluvia llevan `uRuidoQ`) y
  `verify:quiebro-personajes` (lluvia y tarjetas se ven sobre ellos). En `quiebro-ciudad/luces.ts`:
  - (a) Neones, halos y tarjetas incluyen el mismo `GLSL_PARPADEO`, y ninguno lleva `sin(` en el parpadeo. Rojo:
    una copia con la versión de hoy.
  - (b) Todo rótulo que parpadea pasa la MISMA semilla a su halo y a su tarjeta.
  - (c) El vapor por cercanía no asigna memoria con la cámara quieta.
  - (d) `GLSL_CIELO_REFLEJADO` tiene el sha de `d4402d0`.
  - (e) Los uniformes del posproceso siguen declarados (`verificar-quiebro-calidad.ts:704-737`).
  - (f) El texto de N0 de fachada, asfalto, acera, mobiliario y cristal no cambia con este paquete. Rojo: quitar el
    `#if` del horizonte local.
  - (g) Al CERRAR la ola 3, `verify:quiebro-gl` vuelve a comprobar los topes de §7.4 con todo integrado.

  Fotos D, F, E y la del vapor (`pos` a fijar) en N1 y N3 y en las dos luces, y R (lluvia) en N1 y N3. Hay que
  mirar el halo del rótulo a 3 m, el haz en la plaza a 18 m, el vapor a 5-10 m y la plaza al alba.
- **Aceptación.** El vapor se ve a 5-10 m en N1 y N3. Los haces se ven en N2 y N3. Ningún halo circular tiñe la
  fachada hasta los balcones. N0 sin una instrucción más. Batería verde.

#### O3-LO-CERCANO

- **Objetivo.** El coche que se ve a 2-5 m, con el grado alto del nivel y sin salto (§3.7).
  - La capa `coches-cercanos` (N1+): K = 4 / 6 / 8 coches aparcados más cercanos, en g2 / g3 / g4, con el loft de
    O2-VEHICULOS (`coches.ts`, sólo se importa).
  - Búfer reservado de K coches del grado alto en las tres familias (mobiliario, cristal y emisivo): 3 mallas y 3
    llamadas, siempre montadas (con un coche degenerado si no hay ninguno cerca, por la regla de §3.5).
  - Entra un coche como mucho por fotograma, en trozos de 1.000 triángulos. La pertenencia tiene histéresis de
    4 m.
  - `lo-cercano.ts`:
    - rellena `retoqueDeLoCercano(false)` en los materiales de la ventana: `uCercanosQ[8]` (cajas x0, z0, x1, z1)
      y `uFundidoCercanoQ[2]`, con `discard` dentro de la caja donde la trama de Bayer 4×4 es menor que el
      fundido;
    - hace `retoqueDeLoCercano(true)` para los materiales de la capa, que tiran lo complementario;
    - la trama es la de `lejos.ts:53-67`, escrita otra vez aquí para no tocar `lejos.ts`.
  - Fundido de unos 0,4 s al entrar y al salir, y un solo coche fundiéndose a la vez por cada hueco del búfer.
  - Sombra: la capa recibe sombra como la ventana y no la proyecta.
- **Ficheros.** `lo-cercano.ts`, `capas/coches-cercanos.ts` y `escritorio/scripts/quiebro-ciudad/cercanos.ts`.
- **Niveles.** N0: nada (ni capa ni `discard`). N1: 4 en g2. N2: 6 en g3. N3: 8 en g4.
- **Presupuesto.** Renglones nuevos: `cercanos · mobiliario` 0 / 2.100 / 6.900 / 32.200; `cercanos · cristal`
  0 / 150 / 420 / 1.400; `cercanos · emisivo` 0 / 100 / 210 / 400. 3 llamadas en N1+ y 3 programas más en N1+
  (los materiales de la capa). Memoria: hasta 2 MiB en N3. fxc: el retoque de lo cercano suma como mucho 60
  instrucciones al mobiliario, al cristal y al emisivo en N1+, dentro del margen que dejó la ola 2 (§5.2.9).
- **Verificación.** Comunes, más `verify:quiebro-juego` y `verify:quiebro-personajes`. En
  `quiebro-ciudad/cercanos.ts`:
  - (a) Los coches de la capa caben en su caja de `shared/` entre 0,2 y 1,9 m (en la franja, por la función de
    `estorbo`).
  - (b) Faros y pilotos de la capa a ±1 cm de los del horneado; las fuentes de luz no cambian con la capa.
  - (c) Llamadas constantes con 0, 1 y K coches cerca, y al cruzar.
  - (d) Cero memoria nueva con la cámara quieta, y ningún fotograma escribe más de un trozo de la capa.
  - (e) Tramas complementarias: en el banco, con un coche a medio fundir, ningún píxel de su caja sale dos veces
    ni vacío. Rojo: la misma trama en los dos.
  - (f) El texto de N0 del mobiliario, el cristal y el emisivo no lleva el retoque de lo cercano.

  Fotos B y H en N1 y N3 y en las dos luces; B en N2; y P (recentrado) en N1 y N3. Hay que mirar el coche a 2-3 m
  con el interior y la llanta de radios en N3, y que al andar hacia él no se vea el cambio.
- **Aceptación.** En B y H, N3 separa el coche cercano de N1 a simple vista. En una pasada del banco andando a
  1,4 m/s junto a una fila de coches, ningún salto visible. Batería verde.

### OLA 4: el horno, los semáforos, los remates y el cierre

#### O4-HORNO

- **Objetivo.** La fase 2 del sistema de materiales (§2.3) y la pérdida de contexto.
- **Ficheros.** `materia/{retoque, glsl}.ts`, `materia/horno.ts` (nuevo), `materia/micro.ts` (nuevo),
  `calidad/sondeo.ts`, `calidad/capacidades.ts` (`hornoEnCapas`, `anisotropia`, `capasMaximas`), `relevo.ts`,
  `CiudadAbierta.tsx` (el horno con `gl`, `webglcontextlost` y `webglcontextrestored`),
  `escritorio/scripts/{verificar-quiebro-gl, verificar-quiebro-materia, verificar-quiebro-calidad}.ts` (sólo sus
  casos) y `ciudad/banco-gl.tsx`.
- **Niveles.**

  | Nivel | Horno |
  |---|---|
  | N0-N1 | Nada |
  | N2 | 512² en PC o 256² en táctil, anisotropía 4 |
  | N3 | 1024², anisotropía 8-16 |
- **Presupuesto.** 0 triángulos y 0 llamadas en la escena. Memoria: N2 16,8 MiB en PC o 4,2 MiB en táctil, N3 67
  MiB. Horneado: 6 capas × 2 pases, repartido. Programas: los del horno se enlazan una vez y se sueltan al acabar,
  sin contar en el tope del pintor.
- **Verificación.**
  - `verify:quiebro-calidad`: aparatos inventados con y sin `hornoEnCapas`; sin él, el horno queda apagado y el
    nivel no cambia.
  - Relevo en Node, con un horno falso de N pasos:
    - al subir de nivel, no se enseña la ciudad hasta tener su array o hasta agotar la paciencia;
    - al bajar no se hornea;
    - `invalidar()` vuelve a empezar.

    Rojo: que `lista` ignore el horno.
  - Banco que LEE lo horneado: suma de control por capa distinta de 0, varianza de la normal por encima de un
    umbral, último mip parecido a la media, y lo mismo en dos horneados. Rojo: quitar el atributo del vértice.
  - `verify:quiebro-gl`: la pérdida de contexto pasa de informe a comprobación dura. Tras `WEBGL_lose_context` y
    restaurar, la luminancia media no baja de la de la materia 0 y nunca hay negro. El cambio de nivel N1 → N2
    con el horno cabe en su tope de programas y bytes.
  - Prueba de luz rasante: el canto de arriba del ladrillo sale más claro que el de abajo. Rojo: la Y de la normal
    al revés.

  Fotos C, O, B y N en N2 y N3 y en las dos luces, y G desde arriba (repetición). Hay que mirar el poro, el
  cincel y el árido a 1-3 m, y que no centellee a 10-30 m.
- **Aceptación.** Sin horno, la imagen es idéntica a la de la ola 3. Con horno, C y O se separan más en N3. Nunca
  se recompila jugando: `gl.info.programs` constante tras la Bajada. Pérdida de contexto verde. Memoria dentro de
  §7.3.

#### O4-SEMAFOROS-Y-CABEZAS

- **Objetivo.** Semáforos que obedecen a la partida, y cabezas de farola con óptica.
  - **Semáforos colgados** de las farolas de pie a 6 m de cada esquina (`quiebro-ciudad.ts:1685-1689`):
    - el de coches a 2,6-3,4 m, hacia la calzada; el de peatones a 2,2-2,5 m, hacia la cebra, dentro del radio
      del fuste;
    - en N2+, con cable sobre el cruce a 5,5 m donde no hay farola.
  - **La luz:** la capa escribe cada fotograma una `DataTexture` de 144×1 R8 con
    `faseDelSemaforoEnLaCiudad` (`shared/arcade/juegos/quiebro-ciudad.ts:882`) y el MISMO tic que el tren. Así la
    regla vive UNA vez y los durmientes casan con la luz.
  - **Emisivo:** tipo 4 lee su cruce. Halos y tarjetas del semáforo toman el color de su téxel.
  - **Cabezas de farola con óptica** (emisivo tipo 1): lámpara caliente en el centro, vidrio que se enfría hacia
    el marco y refractor de estrías, con `aEmisor.y` radial. El halo baja su núcleo cuando se ve la lámpara.
  - Todo cede en pasos que caben en el trozo.
- **Ficheros.** `farolas.ts`, `emisivo.ts`, `celda-mobiliario.ts`, `capas/semaforos.ts`, `halos.ts`,
  `reflejos.ts`, `fuentes.ts` y `escritorio/scripts/quiebro-ciudad/semaforos.ts`.
- **Niveles.** N0: cabezas de coche (unos 40 triángulos), sin tarjetas. N1: viseras y placa, más tarjetas. N2:
  peatones y cables. N3: biseles y abrazaderas. Por nivel y no por grado, así que no cambian al recentrar.
- **Presupuesto.**
  - Mobiliario: +300 / +800 / +2.000 / +7.000.
  - Emisivo: +100 / +200 / +500 / +1.000.
  - 144 B de subida por fotograma. 0 llamadas.
- **Verificación.** Comunes, más `verify:quiebro-juego`. En `quiebro-ciudad/semaforos.ts`:
  - (a) Todo vértice de semáforo tiene un cruce válido (0-143).
  - (b) La textura sale de `faseDelSemaforoEnLaCiudad` para 1.000 tics de muestra. Rojo: usar `uTiempo`.
  - (c) Todo por encima de 1,9 m o dentro de la caja de la farola.
  - (d) Las fuentes de luz del semáforo son las mismas en todo grado (VERIFICACION 11).

  Fotos D, N y E en N1 y N3 de madrugada. Hay que mirar el reflejo del semáforo en el asfalto mojado.
- **Aceptación.** Luz y durmientes casan en el banco con `montar=1` y el tic avanzando. La paleta queda como
  decida Miguel (§11, pregunta 2). Batería verde.

#### O4-REMATES-Y-SOMBRAS

- **Objetivo.** El detalle de N3 que sólo se ve en rasante, y que lo lejano no salte.
  - **Remates de hueco en bulto** (`fachada/remates-de-hueco.ts`, g3, sólo N3):
    - alféizar de 12 × 6 cm y guardapolvo en los huecos sin balcón, con `recorrerLosHuecos` y `tieneBalcon`;
    - todos por encima de 1,9 m (medido: 5.200 de 5.200);
    - el vértice los RETIRA 2 cm hacia dentro del muro entre 45 y 60 m (tipo nuevo en `declaraciones.ts`);
    - `glsl-hueco.ts` deja de pintar el alféizar analítico donde hay bulto. La marca («este hueco tiene bulto») la
      escribe `atributosDelMuro` de `fachada/caras.ts`, sólo en N3 y g3, sin atributos nuevos;
    - ceden por cara.
  - **Remates de lo lejano** (capa, N2+):
    - cornisa de grado 1 (con la función de perfil que exporta `remate.ts`), pretil y maquinaria para los 392
      edificios de la LOD1;
    - los remates de torre de `torres.ts`;
    - `aCeldaQ` y tirados dentro de la ventana, como la LOD1 (`lejos.ts:93-100`);
    - con el material de la LOD1: ningún programa nuevo. `castShadow = false`.
  - **Sombras de lo cercano** (capa, N3): 12 triángulos por coche y mueble de la ventana, que sólo proyectan.
    - Su material lleva `colorWrite = false` Y `depthWrite = false`: en el pase principal no pinta ni color ni
      profundidad, así que no hace agujeros. El pase de sombra usa su material de profundidad, que no copia
      ninguno de los dos (`three.module.js:9467-9554`) y escribe la profundidad de la sombra.
    - NO van en una `layer` sólo de la cámara de la sombra: three r185 mira las capas de la cámara PRINCIPAL
      también en el pase de sombra (`three.module.js:9400`, `:9560`), y no proyectarían.
    - Cuesta la llamada y los 3.000 triángulos que ya cuenta el libro.
    - `atmosfera/luz.ts` no se toca: la cámara de la sombra cubre ±20 m alrededor de un foco que sigue a la cámara
      (`luz.ts:78-84`, `:133-139`). Los sustitutos de fuera de ese cuadro cuestan, pero no se ven.
- **Ficheros.** `fachada/remates-de-hueco.ts`, `fachada/declaraciones.ts`, `fachada/glsl-hueco.ts`,
  `fachada/caras.ts` (sólo `atributosDelMuro`), `capas/{remates-lejanos, sombras-cercanas}.ts` y
  `escritorio/scripts/quiebro-ciudad/remates.ts`.
- **Niveles.** Remates de hueco sólo en N3. Remates lejanos en N2-N3. Sombras cercanas sólo en N3.
- **Presupuesto.**
  - Fachadas de N3: +30.000.
  - Remates lejanos: 19.000 / 26.500 y 1 llamada (N2 / N3).
  - Sombras cercanas: 3.000 y 1 llamada, más 3.000 de sombra (N3).
- **Verificación.** Comunes. En `quiebro-ciudad/remates.ts`:
  - (a) **En los cuatro niveles, la CARA de la LOD1 es la del detalle**: para cada edificio, `aCara`, `aVolumen` y
    `aPlanta` del muro (huecos, tiendas, balconeras y medianeras) son los mismos en la LOD1 y en la celda. Rojo:
    la balconera sólo con relieve.
  - (b) **En N2-N3, además, la silueta de la LOD1 es la del detalle**: la y máxima de cada edificio es la misma sin
    contar balcones. Rojo: quitar la cornisa lejana. En N0-N1, lo único que cambia al entrar es el relieve de
    encima de la línea del muro (`lejos.ts:8-10`), y se mira en la foto P.
  - (c) Ningún remate de hueco por debajo de 1,9 m.
  - (d) Llamadas constantes.
  - (e) En el banco, con la cámara dentro de la caja de un sustituto de sombra, el color y la profundidad del
    pase principal no cambian con la capa y sin ella. Rojo: `depthWrite` en true.

  Fotos E, G, L y K en N2 y N3 y en las dos luces, y P en N0 y N1. Hay que mirar el alféizar en rasante a
  10-40 m y que no haya salto en la línea de tejado al cruzar.
- **Aceptación.** No hay salto de cara al entrar una celda en la ventana, en ningún nivel, ni de remate en N2-N3.
  La sombra de un coche se ve al alba en N3, sin agujeros en el suelo. Batería verde.

#### O4-CIERRE

- **Objetivo.** Medir, apretar y dejar escrito.
- **Libro de la ciudad:** los renglones y `CAPACIDAD_DE_LA_VENTANA` pasan a medido + 15 % y + 25 %, en las 32 trazas
  × 25 cámaras × 4 niveles. Se quita la reserva provisional (§7.2).
- **Libro del barrio** (`RENGLONES_DECLARADOS`, `presupuesto.ts:80-163`): medido en los 50 barrios con
  `gradoDelBarrio`, + 15 %. La suma de N1 tiene que seguir cabiendo en 125.000 (hoy 123.728).
- **Ventana:** con la tabla de coste por triángulo de O1-MOLDE, se revisa `porFotograma` (`ventana.ts:74-79`) si
  alguna primitiva pasa de 1,5 veces la caja. Se fija el tope de memoria de JS de las celdas guardadas.
- **Juego real:** `RESTO_DEL_JUEGO_MEDIDO` se vuelve a medir con la orden de `personajes/presupuesto.ts:170-181`
  (`/sala/quiebro.html?prueba=1`, `forzarElNivel`, `__quiebro.medir()`), coordinando el uso del panel con el
  coordinador.
- **Documentación:** la tabla de §5.7 de `CIUDAD-ABIERTA.md` y §8 de `EL-QUIEBRO.md`, con los grados, lo cercano y
  el resplandor fuera de la niebla.
- **Fotos:** la tanda «después» completa y la hoja contra «antes». Además, A, B, D y E con `camino=juego`.
- **Palanca de N1:** si N1 mide 12 k libres, las piezas de N1 (no las fachadas) suben a g2 en las 9 celdas.
- **Batería:** `npm run verificar`, por el código de salida.
- **Commits:** uno por paquete en `matrix`, sin push.
- **Ficheros.** `presupuesto.ts`, `capacidad.ts`, `ventana.ts` (sólo si la latencia o el coste lo piden),
  `grados.ts` (sólo la palanca de N1), `personajes/presupuesto.ts` (sólo `RESTO_DEL_JUEGO_MEDIDO`),
  `docs/EL-QUIEBRO.md`, `docs/quiebro/CIUDAD-ABIERTA.md` y `escritorio/scripts/fotos/POSICIONES.md`.
- **Presupuesto.** Baja lo reservado a lo medido.
- **Verificación.** Batería entera verde. `verify:quiebro-gl` con la memoria de §7.3 y los programas. Hoja «antes |
  después» con los criterios de §8. `verify:quiebro-personajes` con el resto del juego nuevo.
- **Aceptación.**
  - Todo cabe con los márgenes de §7, en la ciudad y en el barrio.
  - N3 se separa de N1 en A-D en ≥ 12 % de píxeles (hoy 2-9 %).
  - En P, ningún píxel cambia a menos de 40 m entre antes y después del cruce en N0, N1 y N3.
  - Sin negro ni magenta en las 76 fotos.
  - Documentos al día y commits de los paquetes en `matrix`, sin push.

---

## 7. Presupuestos

### 7.1 Triángulos y llamadas por renglón (declarados; hoy → plan)

Los números de hoy vienen de `presupuesto.ts:172-248` y `renglonesDeLaAtmosfera`. Cada renglón del plan es lo
medido hoy (`presupuesto.ts:174-176`) más lo que suman TODOS los paquetes que lo tocan, más un 15 %, redondeado
hacia arriba. La suma está en `plan/medidas/libro.mjs`. Una cifra sola en la fila quiere decir que no cambia en
ningún nivel. Las llamadas son 1 por renglón salvo que se diga.

| Renglón | N0 | N1 | N2 | N3 | Quién lo mueve |
|---|---|---|---|---|---|
| ventana · fachadas | 1.200 → 7.200 | 11.000 → 24.000 | 88.000 → 71.000 | 124.000 → 210.000 | SILUETA, LEJANO (torres), REMATES |
| ventana · mobiliario | 17.500 → 21.500 | 43.500 → 44.000 | 72.000 → 101.000 | 121.000 → 236.000 | MOBILIARIO, FAROLAS, VEHICULOS, SUELO, SILUETA, NEONES, SEMAFOROS |
| ventana · emisivo | 1.400 → 2.200 | 1.400 → 2.400 | 2.300 → 5.200 | 3.500 → 8.900 | VEHICULOS (lentes), FAROLAS, MOBILIARIO, SEMAFOROS |
| ventana · cristal | 400 → 700 | 400 → 1.350 | 650 → 3.700 | 900 → 6.000 | MOBILIARIO y VEHICULOS, los dos |
| ventana · neones | 2.600 → 2.900 | 2.600 → 3.200 | 4.200 → 5.500 | 6.600 → 9.000 | NEONES (con las placas) |
| lejos (hitos y Elevado) | 14.000 → 14.300 | | | | LEJANO |
| suelo · asfalto | 2.600 | | | | |
| suelo · aceras | 4.600 | | | | |
| borde | 80 | | | | |
| horizonte | 128 → 192 | 128 → 192 | 128 → 384 | 128 → 384 | LEJANO |
| ciudad lejana | 3.000 | 6.000 | 10.000 → 12.000 | 15.000 → 50.000 | LEJANO |
| tarjetas de reflejo | 700 → 800 | 1.000 → 1.100 | 2.100 → 2.300 | 3.800 → 4.200 | LUZ-EN-EL-AIRE |
| halos | 500 | 500 → 600 | 800 → 900 | 1.000 → 1.200 | LUZ-EN-EL-AIRE |
| tren · coches | 140 → 300 | 140 → 500 | 140 → 3.000 | 140 → 7.000 | VEHICULOS |
| tren · ventanas | 100 → 200 | 100 → 200 | 100 → 300 | 100 → 300 | VEHICULOS |
| vapor | 24 → 48 | 48 → 80 | 72 → 220 | 96 → 400 | LUZ-EN-EL-AIRE |
| haces de luz | 0 | 0 | 4.500 | 6.900 | |
| **suelo lejano** (nuevo) | 256 | 256 | 256 | 256 | LEJANO |
| **luces lejanas** (nuevo) | 2.200 | 2.900 | 3.500 | 5.500 | LEJANO |
| **remates de lo lejano** (nuevo) | — | — | 19.000 | 26.500 | REMATES |
| **tubos de neón** (nuevo) | — | — | 5.000 | 22.000 | NEONES |
| **luz pintada** (nuevo) | — | 200 | 800 | 800 | NEONES |
| **sombras de lo cercano** (nuevo) | — | — | — | 3.000 | REMATES |
| **cercanos · mobiliario** (nuevo) | — | 2.100 | 6.900 | 32.200 | LO-CERCANO |
| **cercanos · cristal** (nuevo) | — | 150 | 420 | 1.400 | LO-CERCANO |
| **cercanos · emisivo** (nuevo) | — | 100 | 210 | 400 | LO-CERCANO |
| cielo | 960 | | | | |
| lluvia | 2.000 | 6.000 | 12.000 | 20.000 | |
| salpicaduras | — | — | 320 | 640 → 1.280 | LUZ-EN-EL-AIRE |

**Las cuentas de los renglones que la crítica encontró cortos**, ya corregidas:

- **Cristal:** lo medido (340 / 340 / 538 / 768), más MOBILIARIO (+100 / +300 / +400 / +500), más VEHICULOS
  (+150 / +500 / +1.800 / +3.500), más un 15 %, da 679 / 1.311 / 3.149 / 5.483. Se declaran
  700 / 1.350 / 3.700 / 6.000.
- **Fachadas:**
  - Lo medido (790 / 9.270 / 76.454 / 107.346), más SILUETA (+5.400 / +11.400 / −15.200 / +44.500), más torres
    (0 / 0 / +300 / +500), más REMATES (N3 +30.000), más un 15 %, da 7.119 / 23.771 / 70.787 / 209.698.
  - Se declaran 7.200 / 24.000 / 71.000 / 210.000.
- **Emisivo:** lo medido (1.202 / 1.202 / 1.940 / 2.982), más lentes (+550 / +550 / +800 / +1.100), más
  pictograma (+50), más farolas (0 / 0 / +1.200 / +2.500), más semáforos (+100 / +200 / +500 / +1.000), más un 15 %,
  da 2.187 / 2.302 / 5.164 / 8.777. Se declaran 2.200 / 2.400 / 5.200 / 8.900.
- **Neones:** lo medido (2.190 / 2.190 / 3.616 / 5.692), más NEONES (+100 / +400 / +1.000 / +1.900), más placas
  (+150), más un 15 %, da 2.806 / 3.151 / 5.481 / 8.903. Se declaran 2.900 / 3.200 / 5.500 / 9.000.
- **Mobiliario:**
  - Lo medido (15.038 / 37.850 / 62.424 / 105.218) más los deltas de las fichas (+3.400 / −1.900 / +24.900 /
    +97.700), más un 15 %, da 21.204 / 41.343 / 100.423 / 233.356.
  - Se declaran 21.500 / 44.000 / 101.000 / 236.000.
  - En N1 baja: coches horneados en g1 y sin centro en g2.

**Sumas de lo declarado, sin sombra, contra la cuota del 50 %:**

| Nivel | Hoy | Plan | Cuota | % de la cuota | Llamadas hoy → plan (de la cuota) |
|---|---|---|---|---|---|
| N0 | 51.932 | 66.536 | 75.000 | 88,7 % | 18 → 20 (de 30) |
| N1 | 95.056 | 117.868 | 125.000 | 94,3 % | 18 → 24 (de 45) |
| N2 | 219.550 | 280.950 | 300.000 | 93,7 % | 20 → 28 (de 75) |
| N3 | 326.044 | 676.160 | 750.000 | 90,2 % | 20 → 29 (de 125) |

**Sombra (N2+).** La comprobación dura es lo MEDIDO más la sombra contra la cuota (`presupuesto.ts:305-325`).
Lo declarado se comprueba sin sombra (`verificar-quiebro-ciudad.ts:534-537`).

- N2: proyecta lo lejano (unos 12.000 medidos). Declarado más sombra da 295.250 (98,4 %), sólo como indicador.
  Lo medido estimado (lo declarado entre 1,13) más la sombra es unos 261 k (87 %).
- N3: lo lejano más las sombras cercanas, 17.300. Declarado más sombra da 693.460 (92,5 %), y lo medido estimado
  unos 616 k (82 %).

**Margen para la variación entre trazas:** cada renglón ya es el peor de 32 trazas + 15 %, y lo medido real es un
13 % menor que lo declarado.

**El juego entero:** N1 pasaría de 91 k a unos 126 k de «resto medido». Con el peor de los personajes (su cuarto,
62.500) quedan unos 189 k de 250 k. N3 queda muy por debajo de 1,5 M. El cierre lo vuelve a medir de verdad.

**Palancas si una traza se pasa, por orden:**

- N0: coches a 146 (hoy), el bajo hundido fuera de N0, y las cornisas de N0 sólo en el centro (salto a 6 m: sólo
  si hace falta).
- N1: lo cercano a K = 2, la luz pintada fuera, y el anillo sin balcones ligeros.
- N2: la ciudad lejana a 8.000, los tubos a 3.000, y lo cercano a K = 4.
- N3: lo cercano a K = 6, y los remates de hueco sólo en el bloque de 3×3.

### 7.2 La reserva provisional (olas 1-3) y el cierre

Mientras las familias trabajan, O1-PARTICION-CIUDAD deja cada renglón y cada capacidad en el MÁXIMO de hoy y el
plan. Así nadie en las olas 2 y 3 tiene que tocar `presupuesto.ts` ni `capacidad.ts`.

- **Lo único que cambia respecto al plan es N2 fachadas:** 80.000 en vez de 71.000.
  - Hoy se miden 76.454, y O3-SILUETA baja primero los balcones (fase A) y después sube las cornisas (fase B).
  - La suma provisional de N2 queda en 289.950 (96,7 %), que cabe.
  - Sobre el papel, con la sombra, pasaría de 300.000, pero la sombra no entra en la suma declarada; lo que se
    comprueba con sombra es lo medido (unos 261 k).
- **Si un paquete mide más que su reserva, PARA y lo dice en su informe.** No sube el libro. O3-SILUETA mide al
  acabar la fase A y al acabar la fase B.
- O4-CIERRE baja todo a lo medido + 15 % (renglones) y + 25 % (capacidades).

### 7.3 Memoria de GPU de la ciudad

Geometría reservada (dos mitades) + luz por losetas + mapas + texturas nuevas. Hoy según la medida de
`presupuesto/medida.txt`.

| Nivel | Hoy | Plan | Desglose del plan | Tope que vigila VERIFICACION |
|---|---|---|---|---|
| N0 | 13,8 MiB | ≈ 15 MiB | geometría ≈ 9, luz 4, mapas 2,7, ruido 0,09 y capas 0,1; el atlas de neones baja 0,6 | 24 MiB |
| N1 | 21,8 | ≈ 26 | geometría ≈ 19, luz 4, mapas 2,7, ruido y capas 0,2, lo cercano 0,1 | 48 |
| N2 | 64,7 | ≈ 87 en PC / ≈ 75 en táctil | geometría ≈ 48, luz 16, mapas 2,7, horno 16,8 o 4,2, remates lejanos 2,2, tubos 0,3 y lo cercano 0,5 | 128 |
| N3 | 84,7 | ≈ 207 | geometría ≈ 115, luz 16, mapas 2,7, horno 67, remates 2,7, tubos 1 y lo cercano 2 | 256 |

- Durante un relevo conviven dos ciudades. El peor caso en un teléfono (techo N2) es N1 → N2, unos 100 MiB.
- **Memoria de JS** (nuevo, VERIFICACION 5): las celdas guardadas (`CELDAS_GUARDADAS = 36`, claves por grado) y los
  moldes. Se mide en la ola 1 y el tope es lo de hoy × 1,8 hasta el cierre, que lo fija.
- Palanca de memoria si hace falta: normales en Int8 y colores en Uint16 normalizados en la ventana (auditoría de
  presupuesto). Queda fuera salvo necesidad.

### 7.4 Coste del sombreador (tope duro)

Instrucciones estáticas de fxc `ps_5_0 /O3` sobre el HLSL de ANGLE, con el banco del analítico; hoy según
`mat-analitico/banco/fxc.json`. Lecturas: `texture*` en el texto resuelto. Sin fxc, `verify:quiebro-gl` sale con 2.

| Material | N0 | N1 | N2 | N3 |
|---|---|---|---|---|
| Fachada, hoy → tope | 6.303 → ≤ 6.303 | 7.381 → ≤ 7.381 | 7.607 → ≤ 9.500 | 7.719 → ≤ 12.000 |
| Asfalto | 2.303 → ≤ 2.303 | 2.841 → ≤ 2.841 | 3.068 → ≤ 3.500 | 3.180 → ≤ 4.500 |
| Acera | 2.072 → ≤ 2.072 | 2.072 → ≤ 2.072 | 2.296 → ≤ 2.800 | 2.408 → ≤ 3.500 |
| Mobiliario | 461 → ≤ 461 | 499 → ≤ 1.000 | 725 → ≤ 1.500 | 837 → ≤ 2.000 |

- **Reparto entre olas** (§5.2.9): la ola 2 deja en N1-N3 40 instrucciones de margen en todos (el horizonte
  local) y 60 más en el mobiliario (lo cercano). N0 no paga nada de la ola 3: el horizonte local y lo cercano no
  entran en N0.
- `verify:quiebro-gl` vuelve a comprobar esta tabla al cerrar la ola 3, con todo integrado.
- Lecturas de ruido de la materia en N0: ≤ 4 en fachada y suelo, y 0 `fbmQ` de adorno.
- **Programas** (nuevo, VERIFICACION 9): por nivel y estado del pintor, hoy + 6, y + 3 más en N1+ (lo cercano),
  contando la segunda pasada del posproceso. Un cambio de nivel N1 → N2 se mide en programas enlazados y bytes
  subidos.
- Tiempo de enlace (sólo indicio; el mínimo de 3 corridas en ANGLE): no por encima del de hoy en N0-N1. La fachada
  de hoy ya tarda 2,7-4,8 s, y `calidad/precompilar.ts` la cubre con la Bajada. Mali y Adreno no se miden aquí
  (§9, riesgo 2; §11, pregunta 6).

### 7.5 Descarga

- 0 bytes de arte.
- Código nuevo: unos 30-40 KB con gzip.
- Los topes de 8 MB (primera noche en N0) y 20 MB (total) de `EL-QUIEBRO.md:544` no se mueven. El plan no añade
  recursos, así que no se escribe comprobación para ellos (§12, enmienda 21).

### 7.6 El barrio viejo

El barrio (`construir.ts`) se pinta cuando la vista no trae traza (`red/lugar.ts:98-102`), y `verify:quiebro-ciudad`
lo mide en 50 barrios (`verificar-quiebro-ciudad.ts:76`, `:264-266`). Construye todo de una vez, sin ventana
(`construir.ts:95`), así que el grado alto en todo el barrio no cabe.

- **`gradoDelBarrio(nivel)` = 1 / 1 / 2 / 2.** En N1 baja lo de hoy: balcones ligeros en vez de los de hoy, y
  coches g1 (180) en vez de los de `cochesFinos` (426-430). Su suma declarada está hoy en 123.728 de 125.000, así
  que **ningún renglón del barrio de N1 sube**.
- **La reserva provisional del barrio** (O1-PARTICION-CIUDAD): `mobiliario y coches` de N2 y N3 sube de
  50.000 / 56.000 a 60.000 / 66.000, por las piezas en g2. Su suma queda en 174.344 / 200.324 de 300.000 / 750.000.
  N0 y N1 no cambian.
- **El tráfico del barrio** (`trafico.ts`), con los coches en marcha que son cajas con cabina, queda FUERA. Sigue
  con `ACABADO.chapa` (`trafico.ts:40`), que la materia mantiene como familia 0 (§2.2). No cambia ni un byte.
- O4-CIERRE mide el barrio con los grados nuevos y aprieta su libro.

---

## 8. El protocolo de fotos

**Consulta base** (con `foto.sh` de `escritorio/scripts/fotos/`, `PUERTO` explícito):

`B = ciudad=abierta&traza=0&codigo=K7M2P&noche=1&montar=1&lluvia=0&panel=0`

y a cada posición se le añade `&nivel=N&luz=madrugada|alba&pos=…`. `panel=0`, `lluvia=0` y `ventana=` los añade
O1-FOTOS: en `d4402d0` no existen (`banco-abierto.tsx:48-60`).

**Posiciones.** `pos = x, y, z, rumbo, cabeceo`: rumbo 0 = norte (−z), crece hacia el este. Las marcadas «a
fijar» las ajusta O1-FOTOS y las apunta en `POSICIONES.md`.

| | Nombre | pos (+ extra) | Estado | Qué hay que mirar |
|---|---|---|---|---|
| A | banco-2m | `9,1.7,19,0,-0.3` | verificada | Listones y costados de fundición, veta y desgaste en chaflanes; la baldosa (tacos hasta 5 m, juntas no cromadas); la farola de plaza. |
| B | coche-3m | `-7.2,1.7,24.6,-0.95,-0.35` | verificada | Carrocería loft, pasos de rueda, llanta, ni rastro de franja punteada, suciedad baja, reflejo de ventanas en las puertas (N2+), el coche de lo cercano en N3. |
| C | fachada-5m | `17.5,1.7,9.5,1.0,-0.15` | verificada | Relieve de la fábrica bajo la farola, zócalo, chorretones, bajo hundido y cantoneras. |
| D | cruce-neones-8m | `14,1.7,21,1.9,-0.1` | verificada | Tubo y variedad de los rótulos, halo con forma, tarjetas en el charco, semáforo, placa de calle. |
| E | calle-25m | `16.5,1.7,40,0,-0.03` | verificada | Ritmo y cornisas en las dos aceras, balcones, grietas y parches del asfalto, luces lejanas al fondo. |
| F | callejón-plaza-25m | `0,1.7,45,0,-0.05` | verificada | Losas del callejón, que la plaza no sea espejo al alba, la fuente. |
| G | pájaro-40m | `0,40,20,0.6,-0.5` + `&camara=libre` | verificada | Azoteas pobladas, cornisas, remates, la plaza desde la Bajada, repetición del grano. |
| H | taxi-3m | `20.3,1.7,-0.8,0.63,-0.3` | verificada (auditoría de vehículos, c1) | Estribo, ruedas, faros sin pegatina, banda del taxi. |
| I | bajo-2m | `27.8,1.7,-10,R,-0.1` | a fijar (silueta, g) | Escaparate y persiana hundidos, jambas, cajón, chapado de tienda. |
| J | aceras-n1 | `0,1.7,-20,R,-0.05` | a fijar (silueta, i: la raya de dos celdas) | En N1, las dos aceras con cornisa y balcones. |
| K | azoteas-40m | `48,40,-34,R,-0.6` + `&camara=libre` | a fijar (silueta, e) | Chimeneas, claraboyas, depósitos, albardillas y cornisas de perfil. |
| L | pájaro-150m | `0,150,20,0.6,-0.35` + `&camara=libre` | a fijar (el cabeceo) | Suelo lejano sin trazado de calles, cajas posadas, balizas, las calles DE LA CIUDAD encendidas, resplandor al pie del skyline, hitos. |
| M | salida-Elevado | `246,1.7,-120,1.571,0` | a fijar (lejano, 04) | Borde, pilares y viga del viaducto, la franja de luz, el tren si pasa. |
| N | cruce-cenital-28m | `24,28,35,0,-1.2` + `&camara=libre` | a fijar (suelo) | Cebras gastadas, vados, tapas, imbornales, rigola. |
| O | ladrillo-2m | `20.5,1.7,-45,R,-0.1` | a fijar (paredes) | Aparejo en relieve a 2 m, llaga, humedad del pie. |
| P | recentrado | `0,1.7,-29,0,-0.05` y `&ventana=0,0` (antes) o `&ventana=0,-48` (después) | a fijar: en la calle, 5 m dentro de la celda de al lado | El mismo encuadre con la ventana antes y después del cruce: a menos de 40 m no cambia nada; en N0-N1, al fondo, cornisas que entran. |
| R | vado-lluvia | `…&lluvia=1`, pos a fijar (suelo) | a fijar | Tarjetas y salpicaduras posadas sobre la rampa y sin flotar al lado; el velo del SSR en N3. |

**Tanda completa: 76 fotos.**

- A-O: 15 × {N1, N3} × {madrugada, alba}, 60 fotos.
- N0 de madrugada en A, B, E y L; N2 de madrugada en C y E.
- Móvil (844 × 390, N1, madrugada) en A y E.
- P, de madrugada, en N0, N1 y N3, antes y después: 6 fotos.
- R, de madrugada, en N1 y N3.

Con tres Edge en paralelo son unos 12-14 minutos. Cada paquete saca su subconjunto (`--solo`), como dice su ficha.

**Hoja** (`hoja.mjs` con el `sharp` del repo): por foto, la diferencia media, el % de píxeles que cambian > 12, el %
de negro puro y el % de magenta, y la hoja «antes | después». Admite una máscara (el panel, en las fotos de hoy) y
da el ruido entre dos tomas iguales.

**Criterios:**

- negro < 0,5 % y magenta 0 en todas;
- N3 contra N1: ≥ 12 % de píxeles distintos en A-D y O (hoy 2-9 %), y ≥ 5 % en E-G;
- N0 contra la «antes» de N0: cambia donde se ha listado y no cambia el tono medio (dif media ≤ 8);
- P: entre antes y después, diferencia por debajo del ruido en la parte de la imagen a menos de 40 m (la máscara
  sale de la profundidad del banco);
- el juicio final es de ojos, sobre la hoja.

**Juicio también en el juego:** el cierre toma A, B, D y E con `?camino=juego`, con el posproceso y el DPR del
nivel, porque el banco no es la pantalla. Las fotos «móvil 844×390» son Edge de escritorio sobre D3D11: no son un
teléfono (§11, pregunta 6).

---

## 9. Riesgos

1. **Latencia de la ventana en N3:** al recentrar se rehacen unas 11 celdas (5 nuevas, 3 que suben y 3 que bajan).
   Se mide en SILUETA y en VEHICULOS. Palancas: `CELDAS_GUARDADAS` y los bytes de N3.
2. **N0 al 89 % y N1 al 94 % de su cuota**, con los topes de los teléfonos aún provisionales
   (`calidad/niveles.ts:22-28`). Las palancas de §7.1 están ordenadas, y la primera de N1 es lo cercano. Sin una
   medida en un Android real de gama media, las cifras de N0 y N1 son apuestas, y la compilación en frío de Mali y
   Adreno no está medida (§11, pregunta 6).
3. **Compilación y programas:** la fachada ya tarda 2,7-4,8 s en ANGLE, y el plan suma unos 6 programas por
   estado (9 en N1+). Hay tope duro de programas y de fxc, y el enlace sólo como indicio. La Bajada tiene que
   taparlo.
4. **Memoria en N3** (unos 207 MiB) y el pico del relevo en PC (unos 290 MiB con dos ciudades). No hay codificador
   ETC2/ASTC/BC. En JS, las celdas guardadas por grado: tope en VERIFICACION (5).
5. **La paridad de las reglas dobles nuevas** (balconera, impostas): un fallo pone luz o tarjetas donde el
   sombreador no enciende. Cada una tiene comprobación bit a bit en Node y en la GPU.
6. **La Grafía:** cualquier tramo que escriba después del bloque de `uRejillaDeGlifos` rompe el Remanso. Hay
   comprobación de texto (centinela) y foto con el Remanso en el banco de efectos.
7. **Repetición del grano** de 128 téxeles desde arriba (Vigía, Bajada): segunda lectura girada en N2+ y la foto
   G. En N1 puede quedar un mosaico de 2-4 m a 10-30 m.
8. **El vado de rampa adosada con el mapa binario:**
   - un pie que la pise se hunde hasta unos 10 cm en su parte alta, y los durmientes cruzan por la cebra;
   - en N3, el SSR pone el velo mojado sobre la rampa y las tapas, como hoy sobre las alcantarillas.

   Se mira en R. El rebaje clásico no cabe (§3.3).
9. **Contención:** cinco agentes a la vez en la ola 2 y cinco en la 3. Hay rojos que no son rojos. Cada uno en su
   worktree con su vite, y el coordinador mide en un árbol aislado.
10. **La reserva provisional** hace más blanda la comprobación de renglones durante las olas 2 y 3. Cada paquete
    informa de su medida contra su presupuesto de ficha, y el cierre aprieta.
11. **Pérdida de contexto:** hasta la ola 4 no hay manejador (tampoco lo hay hoy). La materia de la fase 1 (una
    `DataTexture`) la resube three.
12. **Posiciones de fotos a fijar:** si FOTOS no las fija bien, las hojas comparan encuadres malos. Van revisadas a
    ojo antes de la tanda «antes».
13. **O3-SILUETA es el paquete más grande** (bajo, balcones, cornisas, ritmo, azoteas, soportal y voladizos). Va en
    dos fases, y la fase A sola ya es entregable (el bajo y los balcones, y N2 baja). Si la B no llega, se integra la
    A.
14. **Lo cercano añade `discard`** en el mobiliario, el cristal y el emisivo de N1+.
    - El mobiliario ya lo lleva desde N1 por el fundido del canto (`abierta.ts:397-400`), así que su rechazo
      temprano por profundidad ya estaba perdido.
    - El cristal es transparente, y el emisivo son pocos triángulos.
    - El coste nuevo son 8 cajas por fragmento, dentro del margen de fxc. Palanca: K = 0 en N1.
15. **N1 pierde el g2 del centro** que tenía el plan anterior: las piezas de N1 quedan en g1 a 2-5 m, a cambio de
    no saltar. Palanca de cierre: si sobran 12 k, g2 en las 9 celdas.
16. **Las cornisas de N0 entran sin trama** al canto de la ventana, a 42-102 m y en la niebla. Es lo que
    `lejos.ts:8-10` permite y lo que hoy hacen N2 y N3; se mira en P. Si molesta, la palanca es N0 sin cornisa fuera
    del centro, y eso vuelve a traer el salto a 6 m.

---

## 10. Fuera de alcance

- Personajes, durmientes y MetaHuman. Tampoco se tocan sus uniformes: `GLSL_ALTURA` y `GLSL_CIELO_REFLEJADO`
  quedan como están, y la niebla también.
- **Mobiliario nuevo en la franja de andar:** papeleras, bolardos, buzones, jardineras, terrazas, marquesinas y
  contenedores de basura. Exige cajas nuevas en `shared/`, y con ellas servidor, Liza y durmientes (§11).
- **La forja de Blender:** coches y ornamento en GLB, texturas horneadas fuera de línea. Es descarga y otro frente;
  queda para una fase posterior (§11).
- **Compresión de texturas** en KTX2, ETC2 o BC propio.
- **Los charcos:** la máscara compartida de bordillo y cuneta (SDF + «cubierto», P5 del suelo), el agua que corre
  en la cuneta y la máscara seca bajo soportales. Toca `GLSL_CHARCOS` y sus cinco consumidores: va en un commit
  aparte con revisión de dirección de arte.
- **El mapa de alturas graduado** (rampas de los vados en el mapa): mueve la frontera de las máscaras en tres
  consumidores y los pies de los personajes (§3.3).
- **Posproceso:** dispersión de las luces reales en el pase de posproceso, `RectAreaLight` de los rótulos y
  cambios del SSR (por ejemplo, excluir el mobiliario de su espejo).
- **La niebla y su paleta** (`niebla.ts`, `paleta.ts`): el resplandor de sodio va en lo lejano, no en la niebla.
- **Instanciar coches y props** con LOD por distancia (`BatchedMesh` + `WEBGL_multi_draw`). Queda como palanca,
  sustituida por el grado de la celda y lo cercano.
- **Sombra de todo el mobiliario en N3.** Sólo van los sustitutos de 12 triángulos.
- **El borde que se deshace** (tres capas del muro): prioridad 1, sin coste de oportunidad.
- **Los rompibles:** aquí sólo se preparan las mallas con id (paños del quiosco, buzón de periódicos, auricular de
  la cabina). El suceso es de otro frente.
- **La grieta del Estampado:** sólo el gancho `grietaQ`. La hace el frente de efectos.
- **Vértice ligero** (Int8/Uint16 en la ventana): palanca de memoria si hiciera falta.
- **Tráfico, faros o calles más allá del borde:** los prohíbe el diseño («sin calles a la vista»,
  `CIUDAD-ABIERTA.md:224`, `:230`).
- **El tráfico del barrio viejo** (`trafico.ts`): queda como está (§7.6).
- **Una cruz de farmacia verde:** el verde-cian es del código (`EL-QUIEBRO.md:53`); la farmacia es un rótulo magenta.
- Publicar, empujar a `main` o compilar el APK: espera a que El Quiebro esté completo.

---

## 11. Preguntas para Miguel

1. **Mobiliario de acera.** Papeleras, bolardos, buzones, jardineras, terrazas despejables, marquesinas y
   contenedores de basura son lo que más llena una acera de verdad, y no caben en ninguna caja de hoy. Exigen un
   tipo de caja nuevo en `shared/` (`TipoDeCajaDeLaCiudad`, `quiebro-ciudad.ts:603`), y con él servidor, Liza,
   rutas de los durmientes y «Plaza despejada». ¿Lo quieres, en una línea de trabajo aparte con sus guardianes?
2. **Semáforos y paleta.** El verde LED de un semáforo es casi el verde-cian «del código», y el ámbar es «del
   jugador» (`EL-QUIEBRO.md:53`). ¿Semáforos sólo en rojo y un verde desplazado, o se hace una excepción? Y en el
   Apagón, ¿se apagan o parpadean?
3. **Más textos de rótulos.** Pasar de 47 a unos 150 toca las listas de `shared/`, y con ello el barajado y los
   seis guardianes. ¿Se amplían, o bastan la variedad de forma y los subtítulos del cliente?
4. **La torre del reloj de la Glorieta** (`CIUDAD-ABIERTA.md:261-266`: 36 m, con la esfera a la hora de la noche).
   Hay dos sitios posibles:
   - sobre un edificio que da a la Glorieta, sin tocar `shared/`. Es lo que hace el plan mientras no contestes;
   - en el centro de la Glorieta, sobre la fuente de 5 × 5 m (`quiebro-plantillas.ts:222`). Eso cambia la
     plantilla en `shared/`, con su caja, su franja y la Liza.

   ¿Cuál? Y los hitos (reloj, chimenea de las Naves, cúpula de la Lonja), ¿van en el minimapa y el plano?
5. **La forja con descarga para N3.** Coches y ornamento modelados en Blender, en diferido tras la primera noche y
   sólo en PC, con unos 0,6-6 MB más de descarga. ¿Se abre esa fase cuando esto esté?
6. **Un teléfono de verdad.** N0 y N1 se juzgan en Edge de escritorio. ¿Puedes abrir el banco de un worktree en
   Chrome de tu teléfono de gama media, por la red local, sin compilar el APK? Lo lanzaría el coordinador con
   `__quiebro.medir()`, al empezar la ola 2 y al cierre, para medir el enlace en frío, el fotograma y la memoria de
   N0 y N1.

---

### 11.1 Respuestas de Miguel (25-sep-2026)

1. **Mobiliario de acera:** SÍ, pero en una línea de trabajo APARTE, después de esta obra, con sus guardianes de `shared/`. En esta obra no se toca `shared/`.
2. **Semáforos:** rojo normal y un verde desplazado hacia el AMARILLO (que no se confunda con el verde-cian del código). Sin ámbar. En el Apagón se apagan.
3. **Torre del reloj:** sobre un edificio que da a la Glorieta (lo que ya hacía el plan), sin tocar `shared/`.
4. **Forja con descarga para N3:** SÍ, como fase posterior al acabar esta obra (sólo PC, en diferido). No entra aquí.
5. Sin respuesta todavía: más textos de rótulos (se queda con los 47 y la variedad de forma) y la prueba en un teléfono real (se pedirá al cierre).

---

## 12. Enmiendas

La crítica traía 25 problemas y 15 huecos. Cada uno se ha mirado en el árbol (`d4402d0`, sin tocarlo). Las medidas
nuevas están en `plan/medidas/`: `sumas.ts` (sumas declaradas de la ciudad y del barrio) y `libro.mjs` (el libro
del plan). Resumen:

- aplicadas enteras: 22 (una, la 7, con otra forma que las propuestas);
- aplicadas en parte, porque una parte de la crítica no se sostenía: 3 (la 8, la 9 y la 10);
- rechazada del todo: ninguna;
- huecos: 13 cubiertos, uno a medias (el libro del barrio entra; su tráfico queda fuera, dicho) y uno como pregunta (el
  teléfono).

### 12.1 Los problemas

1. **Las piezas no ceden** (bloqueante). **Aplicada.**
   - Es cierto: `ventana.ts:546-555` sólo empieza un trozo si le cabe entero, y `celdas.ts:583-589` cede la suma
     de todas las familias.
   - Toda pieza pasa a ser un generador (§5.2.1). `fachadasPorPartes` cede por tramo de cornisa, por ritmo y por
     balcones.
   - VERIFICACION (12) mira el trozo por pieza y grado, con el rojo de un coche g3 sin ceder.
2. **SILUETA-ALTA no pasa sola en N2** (bloqueante). **Aplicada**, por la segunda vía (juntar):
   - SILUETA-ALTA y SILUETA-BAJA son un solo paquete, O3-SILUETA, con la fase A (bajo y balcones, −31.200 en
     N2) antes de la fase B (+16.000).
   - La reserva provisional de N2 fachadas baja a 80.000, sobre 76.454 medidos (`presupuesto.ts:174-176`), y N2
     suma 289.950 (96,7 %).
   - Subir la reserva a 105.000 no cabía: 306.620.
3. **LEJANO necesita `abierta.ts`** (bloqueante). **Aplicada.**
   - O1-PARTICION-CIUDAD saca el horizonte y la ciudad lejana a una capa, `capas/lejana.ts`, con
     `LEJANA_DESDE`, `LEJANA_HASTA`, `CAJAS_LEJANAS_DE_LA_CIUDAD` y el `actualizar` que la ancla
     (`abierta.ts:152-158`, `:485-488`, `:613-615`). La saca idéntica a hoy.
   - LEJANO es su dueño en la ola 3 y no toca `abierta.ts`.
4. **El patrón de balcón y la marca de bulto necesitan `caras.ts`** (grave). **Aplicada.**
   - El atributo se escribe en `fachadas.ts:882-884`.
   - `caras.ts` exporta desde la ola 1 `atributosDelMuro`, el único que escribe esos atributos. PAREDES lo
     empaqueta en la ola 2, llamando a `patronDeBalcon(e)` de `balcones.ts`, que da 0.
   - SILUETA (ola 3) y REMATES (ola 4) tienen `caras.ts` sólo para `atributosDelMuro`, cada uno en su ola.
5. **SILUETA-ALTA toca ficheros ajenos** (grave). **Aplicada:**
   - la faja y la imposta, los miradores contra `tieneBalcon` y el soportal quedan en el mismo paquete (enmienda 2);
   - el soportal sale a `fachada/soportal.ts` (`fachadas.ts:1093-1110`), y `soportalDePlaza` (`piezas.ts:219`)
     pasa a SILUETA en la ola 3;
   - el subtipo 7 del Elevado lo pone LEJANO en `lejos.ts:186-189`, con `cajaDeRelieve(..., subtipo)`, que la
     ola 1 deja listo.
6. **La franja mira un solo grado y no mira los neones** (grave). **Aplicada.**
   - Es cierto: `verificar-quiebro-ciudad.ts:587-592` toma la celda guardada que haya, y `:591` deja fuera
     `neones`.
   - VERIFICACION (1) construye cada grado de cada nivel con `construirLaCeldaYa(..., grado)`, mete `neones` y
     cuenta inspeccionados por grado. El rojo es una pieza que sólo sale en g3.
   - Con la tabla nueva los grados son N0 {1}, N1 {1}, N2 {2, 3} y N3 {2, 3}.
7. **El grado cambia a los pies al recentrar** (grave). **Aplicada, con otra forma** que las tres propuestas:
   - `ventana.ts:47` y `:132`: se recentra 6 m dentro de la celda nueva, y en lado impar el centro de 1 celda
     cambia de grado ahí.
   - Nueva tabla (§3.1): N0 y N1 con un solo grado; N2 con el bloque 2×2 alrededor de la raya (cambia a ≥ 18 m); N3
     con un bloque de 3×3 (cambia a ≥ 42 m).
   - El grado 4 de celda desaparece. Lo que justificaba el g4, el coche a 2-5 m, pasa a «lo cercano» (§3.7):
     sube por distancia con histéresis y se funde con la trama de 4×4 que ya existe (`lejos.ts:53-67`).
   - Esta forma recoge la idea del fundido (opción 2) sin pintar dos veces celdas enteras, que en N3 costaba unos
     230 k de golpe.
   - La foto P (recentrado, antes y después, en N0, N1 y N3) está en la tanda.
8. **Salto de silueta LOD1 ↔ ventana en N0-N1** (grave). **Aplicada en parte:**
   - **La balconera, sí.** Cambia la CARA (`fachadas.ts:858`: hoy sólo con relieve), y `lejos.ts:8-10` lo
     prohíbe. `tieneBalcon` no depende del relieve ni del grado, la LOD1 escribe el mismo patrón, y donde no hay
     losa se pinta un balcón francés. REMATES (a) mira la cara en los cuatro niveles.
   - **La cornisa en la LOD1 de N0-N1, no.**
     - `lejos.ts:8-10` dice que al entrar el edificio «sólo gana su relieve», y hoy ya pasa en N2-N3.
     - Llevarla a la LOD1 costaría unos 6-12 k en todos los niveles, y N0 y N1 pasarían del 96 % y del 100 %.
     - Dejar N0-N1 sin cornisa fuera del centro vuelve a traer el salto a 6 m de la enmienda 7.
     - Se deja como riesgo 16, mirado en la foto P.
9. **Las sombras de lo cercano escriben profundidad** (grave). **Aplicada en parte:**
   - **El fallo es cierto.** `colorWrite = false` deja `depthWrite` en true y hace agujeros. Se arregla con
     `depthWrite = false`. El material de profundidad de la sombra no copia ninguno de los dos
     (`three.module.js:9467-9554`) y proyecta igual.
   - **El arreglo propuesto no funciona en r185.** three pinta la sombra con `renderObject(scene, camera,
     shadow.camera, …)` y mira `object.layers.test(camera.layers)` con la cámara PRINCIPAL
     (`three.module.js:9400`, `:9560`). Una malla en una capa sólo de la cámara de la sombra no proyectaría.
   - **`atmosfera/luz.ts` no hace falta.** La cámara de la sombra ya sigue a la cámara con ±20 m (`luz.ts:78-84`,
     `:133-139`).
   - La llamada y los 3.000 triángulos ya estaban en el libro. La comprobación (e) de REMATES lo mira en el banco.
10. **Los vados tocan los charcos** (grave). **Aplicada en parte:**
    - **El mapa de alturas se queda binario.** Es cierto que la rampa graduada movía la frontera en `lluvia.ts:187`,
      `reflejos.ts:116` y el SSR, y dejaba tarjetas flotando fuera de la ventana. `luz-de-la-calle.ts` sale de
      SUELO.
    - **La foto R** mira el vado con lluvia en N1 y N3.
    - **La exclusión del mobiliario del SSR, no.**
      - Es un cambio de posproceso, que está fuera de alcance.
      - El SSR ya trata así hoy las alcantarillas, que también son mobiliario horizontal por debajo de 0,25 m
        (`posproceso/sombreadores.ts:80-87`), y el agua sobre fundición y hormigón es agua.
      - El relieve de la tapa se pierde bajo un charco, y se dice (§3.3).
11. **Las cuentas no cierran** (grave). **Aplicada.** Todo se ha rehecho con `plan/medidas/libro.mjs`, como lo
    medido más TODOS los paquetes de cada renglón y más un 15 % (§7.1):
    - cristal: 700 / 1.350 / 3.700 / 6.000;
    - fachadas: 7.200 / 24.000 / 71.000 / 210.000;
    - emisivo, con lentes y pictograma: 2.200 / 2.400 / 5.200 / 8.900;
    - neones, que también estaban cortos en el plan anterior (4.616 × 1,15 = 5.308 contra 5.200): 2.900 / 3.200 /
      5.500 / 9.000.

    N2 con sombra sobre el papel da 295.250. La comprobación dura, sin embargo, es lo MEDIDO más la sombra
    (`presupuesto.ts:305-325`), y lo declarado se comprueba sin sombra (`verificar-quiebro-ciudad.ts:534-537`).
12. **El barrio viejo, sin presupuesto ni dueño** (grave). **Aplicada.**
    - Medido: el barrio declara 46.728 / 123.728 / 164.344 / 189.684. N1 está al 99 %.
    - `gradoDelBarrio` = 1 / 1 / 2 / 2: en N1 baja lo de hoy.
    - La reserva provisional del barrio sube sólo el mobiliario de N2-N3 (+10.000), y CIERRE lo mide (§7.6).
    - `trafico.ts` queda fuera explícitamente, con `ACABADO.chapa` compatible.
13. **El coste de la ola 3 cae sobre los topes de la ola 2** (grave). **Aplicada.**
    - El horizonte local va bajo `#if MATERIA_Q >= 1`, así que N0 no paga.
    - La ola 2 deja 40 instrucciones de margen en N1-N3 en todos los materiales de `RETOQUE_ENTORNO`, y 60 más en
      el mobiliario para lo cercano (§5.2.9, §7.4).
    - El sodio sale de la niebla (enmienda 15).
    - `verify:quiebro-gl` pasa a los comunes desde la ola 2 y vuelve a mirar §7.4 al cerrar la ola 3.
14. **El suelo lejano contradice §2.5** (grave). **Aplicada.**
    - `CIUDAD-ABIERTA.md:224` y `:230`. Fuera de ±270 no hay rejilla, farolas ni semáforos: sólo suelo oscuro con
      resplandor difuso.
    - La ciudad lejana va en grupos irregulares, sin manzanas con calles.
    - Las 812 luces que quedan son de calles de DENTRO, que se andan.
15. **La niebla es de todos y es verde-cian** (grave). **Aplicada.** El resplandor de sodio va sólo en los
    sombreadores del horizonte, la ciudad lejana y el suelo lejano (`niebla.ts:12-20`, `EL-QUIEBRO.md:526`).
    `niebla.ts` y `paleta.ts` salen de LEJANO, y su sha queda vigilado (LEJANO f).
16. **Los hitos desaparecen al acercarse y están donde no dice el diseño** (grave). **Aplicada.**
    - Se escriben con `aCeldaQ = NUNCA` (`lejos.ts:50`).
    - `hitoDe(e)` se fija en la ola 1 para que la azotea no ponga maquinaria encima.
    - La pregunta 4 cita §2.7: ¿el reloj sobre un edificio de la Glorieta, o en su centro sobre la fuente de
      5 × 5 m (`quiebro-plantillas.ts:222`), tocando `shared/`?
17. **Sin tope de programas ni de enlace en móvil** (grave). **Aplicada.**
    - VERIFICACION (9) tiene tope de `gl.info.programs` por nivel y estado, con la segunda pasada del
      posproceso, y mide un cambio N1 → N2.
    - Sin fxc sale con 2.
    - El enlace en frío en un teléfono se pide como pregunta 6: hace falta el teléfono de Miguel.
18. **Las luces dependen del grado sin que nada lo vigile** (menor). **Aplicada.**
    - `fuentesDeLaCelda` construye en grado 1 (lo más barato de CPU).
    - VERIFICACION (11) exige las mismas fuentes en todo grado del nivel.
    - La tarjeta del escaparate va al plano hundido en TODOS los grados.
19. **Contratos sin fijar** (menor). **Aplicada:**
    - `FuenteDeRotulo` con `{ ancho, alto, eje }` (§5.2.11);
    - `SuperficieQ` con `barniz` y `emision`, y el lóbulo puesto por la materia después de la luz (§2.2), así que
      VEHICULOS no toca el material del mobiliario;
    - `respiraderosDe(e)` en `remate.ts` desde la ola 1.
20. **Las fotos «antes» no se pueden comparar** (menor). **Aplicada.**
    - Es cierto: llevan panel y lluvia, y `panel=0` no existe (`banco-abierto.tsx:48-60`).
    - En la ola 1, cada paquete saca su «antes» en su propio worktree, con dos tomas para medir el ruido y la
      máscara del panel.
    - La tanda «antes» de 76 fotos sale al cerrar la ola 1 con los parámetros nuevos.
21. **Comprobaciones que no pueden ponerse en rojo** (menor). **Aplicada:**
    - la paridad se evalúa en la GPU con el banco (pintar a textura y leer);
    - las caras al revés se comparan por conjunto;
    - sin fxc, 2;
    - «las capas no añaden llamadas» se ve en rojo con una capa de prueba;
    - el empaquetado de `aPlanta.y` tiene su ida y vuelta en JS y GLSL (PAREDES e);
    - la comprobación de la descarga se QUITA: el plan no añade bytes y no tenía cómo fallar.
22. **La cabina ya está diseñada** (menor). **Aplicada.**
    - Poste de hierro, marquesina curva, monedero en vez de teclado y auricular ámbar como pieza aparte, con su
      pivote (`EL-QUIEBRO.md:48`, `:562`, `:953`).
    - Por debajo de 1,9 m, dentro de su caja de 0,5 m (`quiebro-ciudad.ts:1673`, `:2124`).
23. **El Elevado puede perder su franja y no casar con la LOD1** (menor). **Aplicada.**
    - La franja (`piezas.ts:274-283`) es comprobación (g) y aceptación de VEHICULOS.
    - VEHICULOS exporta `seccionDelViaducto(grado)`, y LEJANO pone la de g1 en la LOD1.
24. **El mapa de alturas llega a los personajes** (menor). **Aplicada** por la vía de no cambiar el mapa
    (enmienda 10). Además, SILUETA, LO-CERCANO, LEJANO y LUZ-EN-EL-AIRE corren `verify:quiebro-personajes`.
25. **Preguntas que no son de Miguel** (menor). **Aplicada:**
    - P2 (faros lejanos) la resuelve §2.5: fuera de alcance.
    - P4 (farmacia): rótulo magenta, sin cruz verde (`EL-QUIEBRO.md:53`).
    - P7 (vados): la rampa, con los números de §3.3.
    - P6 se rehace sobre §2.7 (pregunta 4).
    - Quedan, renumeradas: mobiliario de acera, semáforos, textos de rótulos, forja. Y una nueva, el teléfono.

### 12.2 Lo que faltaba

1. **Pantallas de Grafía de la ciudad.** Cubierto en NEONES: `pantallas.ts` elige los sitios, con los cupos de
   `efectos/presupuesto.ts:89`; `LaCiudadDeNoche.tsx` las pone y `Quiebro.tsx` pasa `sistema.pantallas`.
2. **Rótulos de calle en cada esquina** (`CIUDAD-ABIERTA.md:270`). Cubierto en NEONES: placas con
   `nombreDeCalle`, en el atlas nuevo.
3. **El reloj de la Glorieta y la chimenea de las Naves.** Cubierto en LEJANO, con `hitoDe` y la pregunta 4.
4. **Escaleras de incendios** (`voladizos.ts:104`). Cubierto en SILUETA: se mejoran dentro de la familia hierro,
   y en su columna no hay balconera ni mirador.
5. **Dueño del soportal.** SILUETA (`fachada/soportal.ts` y `soportalDePlaza`).
6. **Tráfico del barrio y su libro.** El libro va en §7.6 y en CIERRE; el tráfico, fuera explícito.
7. **Transición de grado.** §3.1, §3.7 y la foto P.
8. **Fuentes iguales en todo grado y pase de luz en g1.** VERIFICACION (11) y §5.2.1.
9. **Coste de CPU de las primitivas nuevas.** MOLDE cuenta operaciones por triángulo, sin cronometrar; CIERRE
   ajusta `porFotograma`.
10. **Memoria de JS de las celdas guardadas.** VERIFICACION (5).
11. **Tope de programas con la segunda pasada del posproceso.** VERIFICACION (9).
12. **Medir en un móvil de verdad.** Es la pregunta 6: el teléfono es de Miguel, y aquí no se lanza nada.
13. **Cambio de nivel del gobernador N1 → N2**, en programas y bytes. VERIFICACION (9) y HORNO.
14. **El cielo y las rayas de lluvia.** El cielo, en LEJANO, sin cambiar la paleta ni las columnas de Grafía. Las
    rayas toman la luz de la calle, en LUZ-EN-EL-AIRE.
15. **Franja del Elevado y auricular ámbar como aceptación.** VEHICULOS y MOBILIARIO.

### 12.3 Lo que cambia de forma en el plan

- **O3-SILUETA-ALTA y O3-SILUETA-BAJA pasan a ser O3-SILUETA**, con dos fases.
- **Entra O3-LO-CERCANO.** Siguen siendo veinte paquetes.
- **Salen de las fichas** `atmosfera/niebla.ts`, `atmosfera/paleta.ts` y `luz-de-la-calle.ts`. **Entran**
  `atmosfera/cielo.ts`, `capas/lejana.ts`, `capas/coches-cercanos.ts`, `lo-cercano.ts`, `pantallas.ts`,
  `fachada/soportal.ts` y `Quiebro.tsx` (una línea).
- **El grado 4 de celda ya no existe**, y N1 queda en g1 en las 9 celdas.
- **El libro de N1 sube** de 114.068 a 117.868 (94,3 %), y el de N3, de 639.060 a 676.160 (90,2 %), sobre todo
  por lo cercano. El de N2 pasa a 280.950 (93,7 %).


---

## 13. Acta de la ola 1 (coordinador, 25-sep)

**Integrado en `matrix`** (commits 92f565b ciudad, 3894261 fachada, 5c02a81 molde, ba1ffe5 materia, ec7cbb9 fotos, sus fusiones y
70fe237, que pasa `obra.grado` a `fachadasPorPartes`). Sin cambio visible. O1-VERIFICACION va como **ola 1b**, sobre lo
integrado, porque sus comprobaciones miran la ciudad ya partida (grados, trozos, capas).

**Decisiones:**

1. `TOPE_DEL_SOMBREADOR_POR_NIVEL` de cada material tiene forma `Record<0|1|2|3, { instrucciones: number; lecturas: number }>`
   (§5.2.9). La regla de §5.2.7 (`*_POR_NIVEL` que no baja al subir de nivel) se aplica CAMPO A CAMPO a las tablas de objetos. Las
   tablas de la materia son `LECTURAS_DE_LA_MATERIA_POR_NIVEL` y `PCG_DE_LA_MATERIA_POR_NIVEL`, numéricas.
2. Fotos: `reloj=T` entra en la consulta BASE de §8 (fija parpadeos, vapor y tren). El banco, con `reloj`, asienta las luces de
   `atmosfera/luz.ts` con paso fijo (lo hace la 1b de fotos, que queda dueña de `luz.ts` sólo para eso). La tanda «antes» sale con
   esa base.
3. `hoja.mjs`: el negro ABSOLUTO que ya estaba en «antes» (E, H, M, N de madrugada) es AVISO con código de salida 3; sólo el negro
   NUEVO es fallo (1). La farola de M (poste entero negro a 3 m) es un fallo de verdad: lo arregla O2-FAROLAS-Y-PIEZAS.
4. Se acepta que la latencia del cruce en N2 y N3 no sea la de hoy (la clave por grado de §3.1 obliga a rehacer las celdas que
   cambian de grado): está dentro de topes; palanca `CELDAS_GUARDADAS` en O4-CIERRE.
5. El barrio en N3 declara 200.324 (no 200.324): la reserva de salpicaduras de 1.280 vale para los dos libros.
6. `GRADO_DE_LOS_COCHES_POR_NIVEL` sigue 1/2/2/2 (reproduce `cochesFinos`). La tabla final 1/1/2/3 la pone **O2-VEHICULOS**, que
   queda dueño de ESA línea de `grados.ts` en la ola 2.
7. `hitoDe` sólo da el reloj: para la chimenea de las Naves y la cúpula de la Lonja hace falta el distrito del edificio.
   **O2-VEHICULOS** (dueño de `plano.ts`) añade `distrito` a `EdificioDelPlano` (`tipos.ts`, sólo ese campo) y lo rellena en
   `plano.ts`; O3-LEJANO escribe la regla en `torres.ts`.
8. `voladizosDeLasCaras`, `escribirLosCables`, `escribirLasBanderolas` y `escribirRotulosDeGlifos` ceden pero reciben moldes, no
   la obra: O3-SILUETA (voladizos) y O3-NEONES (rótulos) les pasan la obra para leer `obra.grado`.
9. El horizonte de la capa lejana conserva `frustumCulled = true` (cambiarlo rompía la identidad): lo decide O3-LEJANO.
10. El torno reparte la u con el radio MAYOR del contorno (la u por anillo tuerce más: ×4,05 contra ×2,02 en el balaustre). Una
    pieza con radios muy distintos que lleve dibujo en la u se hace con DOS tornos.
11. La fachada de N0 de prueba ya está en 4 lecturas, el tope de §7.4: O2-PAREDES no puede añadir lecturas en N0.
12. El preámbulo de la materia va ANTES de `clipping_planes_fragment` y los fundidos (orden 5) detrás: documentado en
    `materia/glsl.ts`. En un GLES de móvil las derivadas tras un `discard` del mismo quad no están garantizadas: PAREDES y LEJANO
    lo tienen en cuenta.

**Ola 1b** (tres paquetes, ficheros disjuntos): O1-VERIFICACION (su ficha de §6, más la regla campo a campo y el alta de
`verify:quiebro-molde` y `verify:quiebro-materia` en `scripts/verificar-todo.mjs`); O1B-FOTOS (luces asentadas con `reloj`, código
3 del negro heredado, valores vacíos rechazados, correcciones de POSICIONES.md y la tanda «antes» de 76 fotos en
`scratchpad/detalle/fotos/antes/`); O1B-MATERIA (endurecer `verify:quiebro-materia`: un solo sampler `uRuidoQ` en materia/**,
`#define` dentro de cadenas, lo lejano real en `yaLaLlevan`, la fábrica devuelve un material nuevo o el banco lo clona).


### 13.1 Cierre de la ola 1b (coordinador, 25-sep)

Integrado en `matrix` (382a041 verificación, c1734a9 fotos, 439dbf2 materia, y sus fusiones; antes, 6a7ba1c arregló el rojo de
`núcleo agnóstico`, que venía de la entrega 1 de la ciudad). La ola 2 sale de `matrix` en 2481247.

**Lo que la ola 2 tiene que saber:**

1. **Fotos.** La tanda «antes» (79 ficheros, con dos tomas) está en `scratchpad/detalle/fotos/antes/` y sus hojas en `antes/hojas/`.
   Todo sobre posiciones, consulta base (lleva `reloj=`), ruido y criterios está en `escritorio/scripts/fotos/POSICIONES.md`:
   léelo antes de fotografiar. `protocolo.sh --solo …` con `PUERTO` de TU vite; `hoja.mjs` contra «antes»: código 0 verde,
   **3 = sólo negro o magenta HEREDADOS (aviso, no fallo)**, 1 = fallo (negro/magenta nuevos o umbral de §8 sin cumplir).
   La E se movió al eje de la calzada (dos aceras y cornisas; **sin balcones**: los balcones se miran en C, J, O y G).
2. **Comprobadores.** `verify:quiebro-gl` y `verify:quiebro-materia` necesitan `PUERTO` (sin él salen con 2, que NO es verde).
   verify:quiebro-materia (b) EXIGE que todo material real que ya lleve la materia exporte su `TOPE_DEL_SOMBREADOR_POR_NIVEL` con
   forma `{ instrucciones, lecturas }` por nivel. `verify:quiebro-gl` lo lee (con §7.4 como techo) y tiene tope de programas por
   nivel y estado del pintor. La batería entera: `PUERTO=<vite> npm run verificar` en la raíz.
3. **Sombras.** El juego usa `THREE.PCFShadowMap` (Atmosfera.tsx). El banco viejo del barrio (`ciudad/banco.tsx:368`) sigue con
   `shadows` de r3f y pone PCFSoft: sin dueño en la ola 2; lo cierra O4-CIERRE, que además añade la regla de fuente «Atmosfera usa
   PCFShadowMap» y el mínimo ≥ 1 de geometrías de capas de prueba en el filtro de memoria de verify:quiebro-gl.
4. **Reparto de cabos sueltos a la ola 2** (además de las fichas de §6):
   - O2-VEHICULOS: la línea `GRADO_DE_LOS_COCHES_POR_NIVEL` de `grados.ts` pasa a la tabla final 1/1/2/3 (decisión 6); añade
     `distrito` a `EdificioDelPlano` (`tipos.ts`, sólo ese campo) y lo rellena en `plano.ts` (decisión 7).
   - O2-FAROLAS-Y-PIEZAS: el poste ENTERO negro de la farola de la foto M a 3 m (1,3 % de negro puro) es un fallo de verdad.
   - O2-SUELO: con las luces asentadas de N3, las juntas de la baldosa salen blancas como cromo (A, C): rugosidad de la junta.
   - Para la ola 3 (no la toquéis ahora): moaré en la persiana del canto izquierdo de R (SILUETA, glsl-bajo), torres lejanas que
     flotan con cielo debajo en L al alba (LEJANO), bordes de charco blanquecinos en la R de N3 (charcos: fuera de alcance, §10).


### 13.2 Ola 2 (coordinador, 25-sep, noche)

Tras dos rondas de revisión: FAROLAS aprobada (a567a24) y VEHICULOS con su único grave resuelto por decisión (5204464). PAREDES, SUELO y
MOBILIARIO van a un remate (presencia de las paredes a media distancia con umbrales, bandas del asfalto mojado, carteles del quiosco).

**Decisiones:**

1. `verify:quiebro-materia` (g): tolerancia de orden ulp (`> 1e-6`). Con el lóbulo vivo, A0 y B0 compilan distinto y difieren 1-3 ulp
   (2-3e-8); la vacuna del stub roto da 0,2. El coordinador lo aplica al integrar, junto con el parche de las 5 vacunas de PAREDES.
2. Se aceptan de VEHICULOS: lunas OPACAS en g1-g2 (sin interior no pueden ser transparentes, y en el móvil ahorra transparencia); tapacubos
   pintado en la rueda de g1 (con metal 0,6 salía negra en N0); juntas de puertas desde N2 y matrícula con caracteres desde N3 (tope de fxc).
3. Se acepta de FAROLAS: los topes de g1 del muelle se ven y dan ~0,7 % de negro de noche (están de espaldas a toda luz); árbol de N0-N1 sin
   ramas (la regla contra el temblor pide ≥ 25 cm en N1).
4. **Las familias de VEHICULOS y FAROLAS sólo se ven cuando el material del mobiliario lleva la materia** (lo cablea MOBILIARIO). El fxc del
   sombreador del mobiliario lo comparten cuatro paquetes (carrocería +593 en N3, follaje +188, las de MOBILIARIO…): se mide al integrar
   contra §7.4 y, si no cabe, se reparte (el coordinador decide qué baja de nivel).
5. **Negro puro de noche en lo que da la espalda a las farolas** (hormigón 10 % → (0,1,0), goma → 0): falta un suelo de luz ambiente del
   cielo. No es de ningún paquete de la ola 2. Queda como tarea de luz para la ola 3 o el cierre (atmósfera o retoque `entorno`), con la
   condición de no aclarar la noche en general.
6. Al integrar, el coordinador sube `escritas` del suelo de verificar-quiebro-ciudad.ts a lo que cuente la integración.
7. Para la ola 3: la farola de pared de (−8, −30) queda metida en un balcón en N3 (SILUETA / celdas); la cabecera de grados.ts:22 sigue
   hablando de `cochesFinos` (SILUETA, dueño de grados.ts en la ola 3); LO-CERCANO usa `escribirElCoche(m, coche, 4, …)` (g4 cede 4
   veces, ≤ 2.410 de mobiliario); LEJANO tiene `seccionDelViaducto(1)` y `EdificioDelPlano.distrito`.
8. Para el cierre: fotos del Bulevar (116,1.7,20,0,0.05; árbol a 117,1.7,9,0,0.35) y del patio (contenedor 10.8,0.7,-209,π,-0.05 con
   camara=libre) en POSICIONES.md.


### 13.3 Cierre de la ola 2 y archivo (coordinador, 26-sep)

- Integradas en `matrix` las cinco ramas de la ola 2 (paredes 470c578, suelo 9750bf2, mobiliario d90fc4e, farolas a567a24,
  vehículos 5204464). En la integración: el parche de las 5 vacunas de verify:quiebro-materia que daban por hecho que la
  fachada no lleva la materia, la tolerancia de orden ulp de (g), el suelo `escritas` de verify:quiebro-ciudad a 168, y
  los topes de fxc del MOBILIARIO: la reserva de 100 para la ola 3 se libera y N2/N3 suben a 1.800 / 2.400 (las familias
  de los cuatro paquetes juntas miden 971 / 1.677 / 2.194).
- Desviación aceptada de O2-SUELO: con `lluvia=0` la lámina de la cuneta en N0 cambia en un 1-2 % de píxeles junto al
  bordillo; `charcoQ`, `charcoDeLaAceraQ`, tarjetas y salpicaduras, idénticos.
- **Las olas 3 y 4 quedan ARCHIVADAS** por decisión de Miguel (26-sep): las mejoras visuales no compensan el tiempo frente
  a la jugabilidad. Este documento pasa al repositorio como `docs/quiebro/DETALLE-DE-LA-CIUDAD.md`.
