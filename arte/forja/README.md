# La forja: el reparto de El Quiebro hecho por código

Todos los personajes de El Quiebro (`docs/EL-QUIEBRO.md` §1, §3, §4.8, §8) salen de aquí: seis
desvelados (hombre y mujer con Gabardina, Ligera y Mole), cuatro Celadores (alto y enjuto, ancho,
mujer y mayor con sombrero; el tirador es el mismo con la pistola en la mano), ocho durmientes (dos
cuerpos por cuatro ropas de calle), dos piezas aparte (pistola y paraguas) y los 48 clips que pintan
cada `Gesto` de `escritorio/src/quiebro/cuerpos.ts` (con sus variantes por dirección y por clase).
Blender 4.2 sin ventana modela con campos de distancia (SDF), malla con *surface nets*, pesa, anima y
exporta. Lo único que viene de fuera es la captura de movimiento de UAL (CC0, en `arte/ual/`), que
reorienta `captura.py` a este esqueleto: ver «La captura».

Lo que baja el juego está en `escritorio/src/quiebro/recursos/` (los GLB y `reparto.json`). Lo que
hay aquí son los guiones que lo fabrican; lo fabricado a medias (`obra/`) y las capturas
(`capturas/`) no se versionan.

## Una orden

```
bash arte/forja/rehacer.sh                 # todo: figuras, piezas, clips, empaquetado, capturas y batería (~30 min)
bash arte/forja/rehacer.sh sin-capturas    # lo que hace falta para el juego, con la batería (~10 min)
bash arte/forja/rehacer.sh figuras|piezas|clips|empaquetar|capturas|bateria     # una fase
bash arte/forja/rehacer.sh captura           # UAL (arte/ual/) -> obra/captura/ual.npz, lo que leen los clips
bash arte/forja/rehacer.sh solo-clips        # captura, clips, empaquetado SÓLO de los clips y batería (~7 min)
bash arte/forja/rehacer.sh empaquetar-clips  # sólo clips-{hombre,mujer}.glb y sus entradas de reparto.json
CAPTURA=0 bash arte/forja/rehacer.sh clips   # los clips de la forja pura (para comparar)
FIGS="celador-hombre-mayor" bash arte/forja/rehacer.sh figuras                  # unas figuras
PARALELO=6 bash arte/forja/rehacer.sh ...                                       # Blender a la vez (5)
REPARTO_SALIDA=<carpeta> ...                                                    # empaquetar y medir fuera de recursos/
```

Sale con código distinto de 0 si falla un Blender, el empaquetado o la batería (todos los Blender
van con `--python-exit-code 1`: sin él, una excepción de Python sale con 0 y se lee como verde). Pide
Blender 4.2 en `C:/Program Files/Blender Foundation/Blender 4.2/` (o `BLENDER=` y `BLENDER_PY=`) y
el `node` del repositorio para la comprobación con three.

| Fase | Qué hace | Deja |
|---|---|---|
| figuras | una por figura de `reparto.FIGURAS`, en paralelo: SDF, malla, LOD, pesos, oclusión, materiales | `obra/figuras/<figura>{,-lod1,-lod2,-lod3}.glb`, su `.json`, y en `obra/tmp/<figura>/` el `.blend` y la nube de puntos pesada (LOD0 y LOD2) |
| piezas | pistola y paraguas en el marco del hueso de agarre | `obra/piezas/pieza-*.glb` |
| clips | un horneado por esqueleto (hombre, mujer) con las nubes de `reparto.NUBES_DEL_HORNEADO` | `obra/clips-{m,f}.glb` y su `.json` |
| empaquetar | junta las variantes por familia (y el LOD0 de cada desvelado aparte), adelgaza los clips, comprime (meshopt), escribe el manifiesto | `escritorio/src/quiebro/recursos/*.glb` y `reparto.json` |
| capturas | hojas (frente, perfil, tres cuartos, espalda), caras, LOD, manos con las piezas y tiras por clip (la cámara del juego) | `capturas/` |
| bateria | `comprobar.py` (malla deformada en Blender), `validar.py` (GLB a mano), `comprobar_movimiento.py` (el esqueleto: bisagras, marcha, fundidos, golpes), `en_three.mjs` (GLTFLoader de three), `resumen.py` | `obra/comprobacion_*.json`, `obra/validacion.json`, `obra/movimiento_{m,f}.json`, `obra/en_three.json`, `obra/resumen_bateria.json` |

Para ajustar unos pocos clips sin rehacer nada: `ensayo.py` hornea los clips pedidos sobre UNA figura
y saca una tira por clip (la cámara del juego de `encuadre.ts`, perfil, frente…), con un blanco a
1,1 m en los golpes; `fr=12-19` los enseña fotograma a fotograma, `medir=1` escribe las posiciones y
`ampliar=1.5` saca las tiras más grandes.

## Qué es cada fichero

| Fichero | Papel |
|---|---|
| `reparto.py` | **La lista**: figuras, familias, variantes, paletas, zonas tenibles, presupuestos por LOD y qué LOD0 va por variante. Lo demás la lee. |
| `anatomia.py` | Esqueleto (57 huesos: cuerpo, dedos, giro del antebrazo, agarre y 24 del faldón), cuerpo, cráneo por sexo, cara, manos, complexiones y todo el vestuario; `figura(id)` da los grupos SDF de una figura. |
| `sdf.py` | Primitivas y operaciones SDF, *surface nets*. |
| `malla.py` | SDF → malla: remallado, diezmado, limpieza, pliegues, bordes de material exactos, oclusión por vértice, los dos materiales de los LOD de lejos, LOD2 y LOD3. |
| `accesorios.py` | Ojos pintados, cejas, gafas (cinco monturas, ninguna redonda), corbata y el faldón (forro por dentro, aberturas, grosor hacia fuera). |
| `rig.py` | Esqueleto en Blender, pesos (calor, proxy remallado si el calor no converge, traspaso por lados), faldón, faldones de la chaqueta. |
| `construir.py` | Una figura entera en sus LOD. |
| `animacion.py` | El solucionador (FK, IK de dos huesos con bisagra, brazo que golpea, pivote en la punta del pie, manos y muñecas con topes), la locomoción, el horneado (pasada de suelo sobre la malla, rodadura, raíz del juego) y la simulación del faldón. |
| `clips.py` | **El vocabulario**: un clip por `Gesto` con su nombre definitivo, y `GESTOS`, `POR_DIRECCION`, `POR_CLASE`, `ENTRA_CON`, los mapas que van a `reparto.json`. Al final registra la captura. |
| `captura.py` | **La captura**: extrae UAL, las tablas de correspondencias (forja y MetaHuman), la reorientación, la marcha, los golpes, las recetas (de dónde sale cada clip) y el segundo destino. Ver «La captura». |
| `piezas.py` | Pistola y paraguas. |
| `forja.py` | Punto de entrada de Blender (fases figura, clips, piezas, capturas; `fig=clips ... salida=<carpeta>` hornea unos clips fuera de `obra/`). |
| `ensayo.py` | Hornear y mirar unos pocos clips sobre una figura (arriba). |
| `empaquetar.py`, `glb.py`, `comprimir.mjs` | Del GLB de Blender al GLB del juego (sin Blender): familias, clips adelgazados, compresión meshopt y el manifiesto. |
| `mosaico.py` | El reparto de un vistazo (`capturas/reparto.png`). |
| `escena.py`, `tiras.py`, `imagen.py` | Luces de noche, cámaras (la del juego, `camara_juego`), hojas, tiras y mosaicos. |
| `comprobar.py`, `comprobar_movimiento.py`, `validar.py`, `en_three.mjs`, `resumen.py` | La batería. |
| `rehacer.sh` | La orden. |

## Decisiones que conviene conocer antes de tocar

- **Familias, y el LOD0 del desvelado por estilo.** Cada familia (`desvelado-hombre`, `celador-mujer`…)
  es un GLB por LOD con un esqueleto y una malla por variante; el cliente clona la escena y deja
  visible la malla que le toca (`reparto.json` → `clases`). El LOD0 de los desvelados va además por
  estilo (`desvelado-hombre-gabardina.glb`…): el propio solo baja el suyo, no los tres.
- **Cuatro niveles, los del diseño (§8).** LOD0 ~8.000 triángulos (el propio y los Celadores de cerca),
  LOD1 ~4.000 (compañeros y NPC), LOD2 ~1.000 (la multitud) y LOD3, el maniquí de ~400 de los
  durmientes de la primera noche. Los topes van en `reparto.PRESUPUESTO` y los vigila `validar.py`.
- **Mismo esqueleto por sexo.** Las cuatro siluetas del Celador cambian el volumen alrededor de las
  mismas articulaciones; el alto se escala entero en el cliente (`escala` de su variante, 1,06), y
  los clips valen tal cual porque la escala uniforme no mueve los pies del suelo. El cliente escala
  también su zancada y su velocidad (`usoDeLosClips.escala`).
- **Materiales por zona, como los lee el cliente.** El LOD0 lleva un material por zona (`mat_piel`,
  `mat_abrigo`, `mat_forro`, `mat_traje`, `mat_corbata`, `mat_gafas`…) con su color y la oclusión
  horneada en COLOR_0; el LOD1 y siguientes, dos (`mat_lod_mate`, `mat_lod_brillo`) con color ×
  oclusión en el rgb, la oclusión en el alfa y la zona en `_zona`. Tenibles: `mat_forro` del color
  del asiento, `mat_traje` de una de las cuatro telas del Celador y `mat_corbata` de la paleta que
  va con esa tela (mismo índice: `paletaDeLaCorbata`).
- **El faldón.** Gabardina y Mole hasta la rodilla, bajo recto, aberturas laterales y raja, forro
  (color del asiento) por dentro. El grosor va hacia FUERA: la cadena que se simula es la cara de
  dentro, y el margen contra las piernas es holgura de verdad. Va horneado en los clips: muelle,
  inercia, aire, choques con cápsulas, el arrastre del muslo (con zona muerta: andando y en guardia
  la tela aguanta sola), un tope de ángulo por clip respecto a la cadera (`tope_faldon`: 22° en
  guardia, 35 al trotar, 50 al correr y en los quiebros) y el talle (de pie o inclinado hasta ~37°,
  ninguna junta sube por encima de la cadera; sentado o a gatas la tela cae al suelo y no se fuerza).
  Las cápsulas se miden en la malla (percentil 70), y **lo que cada punto de la tela ya se metía en
  una cápsula sin posar no se empuja**: donde la tela va pegada al cuerpo el percentil engordaba la
  pierna y el bajo se abría ya en reposo (0,57 m contra 0,42); encoger las cápsulas lo arreglaba pero
  dejaba pasar la pierna al apuntar o en la guardia.
- **La raíz de los clips que viajan es la del juego.** Quiebros, Entrada y acometida los mueve el
  juego en línea recta a velocidad fija; su clip lleva esa misma raíz (`raiz_lineal`) y el cuerpo
  se escribe en el mundo sobre ella, así que el pie que se clava en el clip se clava en la calle
  aunque el cliente quite `raiz.position`. En la mujer (0,94) los recorridos se escalan para que
  sean los mismos metros (`VIAJE`, `k_viaje()`).
- **Golpes que llegan.** El brazo que golpea se resuelve desde el hombro (`golpe_s`: dirección y
  extensión), con el pico de velocidad al entrar al impacto; cada golpe declara su efector y el
  manifiesto lleva `alcanceM`, `recorridoM` y `alturaImpactoM` medidos en el horneado.
- **Gestos con variantes.** `porDireccion` (quiebro, quiebro torpe, tocado y derribado según de dónde
  viene el empujón), `porClase` (la guardia de manos abiertas del Celador) y `entraCon` (el
  desconectado entra con la caída). Todo en `reparto.json` → `gestos`.
- **Compresión (meshopt).** Con `EXT_meshopt_compression` (`comprimir.mjs`, con el `@gltf-transform`
  y el `meshoptimizer` que ya hay en el repositorio) el reparto entero pesa unos 5,5 MB y la primera
  noche en N0, unos 3,1. El cliente TIENE que registrar el descodificador de three
  (`three/examples/jsm/libs/meshopt_decoder.module.js`) antes de cargar: sin él la carga falla entera.
  En los clips: rotaciones en short, fuera las pistas que se quedan en la pose de enlace y cada pista
  en la rejilla de claves más gruesa que reproduce el horneado (0,3°; el faldón a 1°, los dedos a 0,6).
- **La batería mide lo empaquetado.** `validar.py` y `comprobar.py` leen `obra/empaquetado/` (los
  mismos GLB justo antes de comprimir: ni este lector ni el importador de Blender descomprimen
  meshopt); `en_three.mjs` carga los de `recursos/` con el descodificador del cliente.

## Lo que el juego hace con esto (y lo que conviene saber al rehacer)

- **Una llamada por cuerpo.** El cliente (`escritorio/src/quiebro/personajes/malla.ts`) funde las zonas
  de cada LOD en una geometría con su paleta: por eso importa que las zonas se llamen como dice
  `reparto.json` y no el número de materiales.
- **Los desvelados lejanos van en el maniquí del PRIMER estilo de su cuerpo** (la Gabardina de hombre y
  la de mujer), teñidos con la ropa de SU estilo (la paleta de cada figura de estilo) y el forro de su
  asiento: dos rebaños y no seis (`director.ts`, «Los desvelados lejanos»). Un estilo nuevo no cuesta
  una llamada de lejos; cuesta su LOD0 de cerca. Si el primer estilo cambia, cambia el maniquí de lejos.
- **El presupuesto se juzga con el juego entero**: el peor caso de los personajes en N0 va justo en su
  cuota (15 de 15 llamadas, `presupuesto.ts`), y lo que el resto del juego gasta está medido allí
  (`RESTO_DEL_JUEGO_MEDIDO`). Una figura más cara en LOD2 o LOD3 se nota en N0 y N1 antes que en ningún
  sitio: `verify:quiebro-personajes` lo dice.
- **La Acometida vuela ahora 14 m en 10 tics** (decisión del coordinador del 24-sep: con 10 m no llegaba
  a los tiradores de 16 a 18 m). El clip `avance` sigue horneado con los 10 m en 400 ms de antes
  (`clips.py`), pero el juego lo pinta con la carrera orientada (`gestos.ts`, `avance: carrera`) y el
  recorrido lo pone la partida, así que no se ve el desfase; si algún día se usa el clip con su raíz, hay
  que rehornearlo con los números nuevos.

## La captura: clips de captura de movimiento (UAL, CC0) en este esqueleto

Desde el 24-sep buena parte de los clips salen de captura de movimiento: la *Universal Animation Library*
1 y 2 de Quaternius, versión Standard, **CC0** (licencia comprobada en su `License.txt`). Miguel la bajó
y descomprimió en `arte/ual/ual1/` y `arte/ual/ual2/`; no se versiona (se vuelve a bajar de la página de
Quaternius, «Universal Animation Library» y «Universal Animation Library 2», Standard). `captura.py` la
**reorienta** al esqueleto de la forja con los **mismos nombres de clip** (uno por `Gesto`): el cliente no
cambia, y el manifiesto dice de dónde sale cada uno (`clips.<clip>.fuente`).

- `rehacer.sh captura` importa los dos GLB (UAL1 trae los huesos `DEF-*` de Rigify; UAL2, los del maniquí
  de Unreal; el esqueleto es el MISMO, medido, y todo se nombra como Unreal) y guarda cada clip a 60
  muestras por segundo en `obra/captura/ual.npz` (8 s). Sin él, el horneado de un clip con receta falla
  con su porqué (no sale la forja callando).
- Al importarse, `clips.py` llama a `captura.registrar(CLIPS)`: TODOS los clips pasan por una receta
  (`captura.RECETAS`): los de captura, los de la forja con la guardia de la captura en sus extremos y los de la
  forja pura (su pose, tal cual). El horneado de siempre (pasada de suelo sobre las mallas, raíz, faldón
  simulado, exportación) no distingue de dónde sale la pose (`animacion._resolver_fk`).

### Cómo se reorienta

1. **Compensación de la pose de reposo.** UAL está en pose T y la forja en pose A (55°). Por hueso se copia el
   giro EN EL MUNDO respecto a su reposo, `D = Δ_fuente · C`, con `C = F_fuente · F_destinoᵀ` (F: marco del
   hueso en reposo, hacia la articulación siguiente y hacia delante). Tronco, piernas, pies y clavícula tienen
   los dos reposos «de pie y neutro» y `C = I`; brazos, manos y dedos, la rotación de la A a la T.
2. **Posiciones a escala de pierna.** La cadera y los tobillos: `P = k·(P_fuente − reposo_fuente) + reposo_destino`,
   `k` = pierna del destino / pierna de la fuente (1,018 el hombre, 0,956 la mujer).
3. **Codos y rodillas, bisagras** (`animacion._ik_bisagra`, segunda pasada). El giro que la captura da al húmero y al
   muslo NO es el de su bisagra (medido en los datos de UAL: el eje en que dobla el codo se aparta 20-44° del de su
   reposo en el percentil 90, fotograma a fotograma), y la primera pasada lo copiaba: codos que doblaban 47-84° fuera
   de su eje. Ahora el plano en que dobla lo ponen las articulaciones (hombro, codo y muñeca de la captura, que están
   donde están) y el húmero y el muslo toman el giro que ese plano pide; el antebrazo y la tibia, ninguno. Con el
   brazo o la pierna casi rectos, el eje es el de los fotogramas de alrededor que sí doblan (`bisagras_seguidas`: si no,
   el húmero daba media vuelta al pasar por recto). Topes: codo 145°, rodilla 155°; con la pierna casi recta la
   rodilla va hacia la punta del pie (±14°, ±32° doblada hasta 45°).
4. **La muñeca, con topes y seguida.** La mano conserva su giro en el mundo; respecto al antebrazo se dobla como
   mucho 72° y gira como mucho ±110° (la mitad va al hueso `giro_`). Ese giro se sigue en el tiempo: cerca de media
   vuelta el signo saltaba de +110 a -110 de un fotograma a otro.
5. **Pies clavados** (`clavar_pies`): donde el talón o la bola apoyan y el medio del pie no se traslada, el pie
   deja de moverse y de girar sobre el suelo (alrededor del punto que apoya). Lo que, ya corregido, roza el suelo (a
   menos de 5 cm) y se mueve a más de 0,35 m/s se levanta hasta 5 cm: un paso corto y no un arrastre (la primera
   pasada levantaba desde 0,7 m/s y entre 0,4 y 0,7 el pie ni se clavaba ni se levantaba).
6. **Brazos que cuelgan, más abiertos** (`abrir_brazos`, 7°; 10 al andar, 12-14 tumbado): el maniquí de UAL es
   delgado y los abrigos no. **La mano fuera** de la cara, el cuello, el tronco y los muslos (`manos_fuera`: esfera y
   cápsulas en los huesos; la muñeca, el puño y la punta de los dedos): se saca con la IK del brazo.
7. **Tiempos del diseño.** Cada receta lleva su mapa de tiempos (fotograma → segundo de la fuente): el impacto de
   cada golpe en su milisegundo (jab 233 ms, directo 267, golpe del Prestado 700) con la llegada acelerada (el pico
   de velocidad al entrar en él), y la vuelta rápida (el puño recoge 30-40 cm en 5 fotogramas).
8. **Golpes a la cara, con paso y carga** (`ajustar_golpe`). La captura golpea al pecho (1,20 m) y a su distancia;
   ahora los nudillos llegan a 1,42 m (× escala) y a 0,98 m de la raíz en los DOS sexos (el blanco no encoge):
   el jab con un paso corto del pie de delante (en el aire, no arrastrado) y la cadera con él; el directo con carga
   (la cadera 4 cm atrás antes de entrar) y la cadera que entra; lo que falta, la clavícula (hasta 16°) y el tronco
   (hasta 6-8°). Tras el impacto el puño no pasa de un palmo (`pasada`): lo que se pasa lo recoge el cuerpo.
9. **La marcha, a la cadencia de una persona** (`Marcha`). La primera pasada estiraba el tiempo para cuadrar la
   velocidad (el trote a 106 pasos por minuto con 24 cm de bote; el andar, el paso ceremonioso de Walk_Formal a 1,7x
   con los brazos muertos y cojeando). Ahora el ciclo es el de una persona (pasear 103 pasos por minuto, andar 129,
   trotar y correr 180) y lo que se ajusta es la zancada, con la IK de los tobillos: simétrica (medio ciclo de un pie
   es el espejo del otro), a pie más por detrás que por delante (el talón no llega más lejos de lo que alcanza la
   pierna), corriendo con el apoyo retemplado (el trote de UAL apoya el 14 % del ciclo y vuela el 71: cada pie se
   retiempla hasta apoyar un tercio y el tobillo apoyado va en línea recta), la cadera baja lo justo para llegar al
   pie y bota como mucho 5-9 cm, los brazos bracean más al andar, y el pie que se va no arrastra la punta. Luego,
   como antes, el vaivén que deja el pie apoyado a velocidad constante (`uniformar_marcha`).
10. **Las posturas, recogidas.** La guardia de UAL abre los pies de lado y las rodillas hacia fuera, y el reposo abre
    el pie derecho 44°: los pies se acercan, giran hacia delante (`PiesRectos`) y la rodilla con ellos
    (`RodillasAdelante`). La guardia lleva el puño de delante a la altura del pómulo (`PunoAdelante`: la de UAL lo
    tenía bajo la barbilla, tocando la mandíbula), y los golpes y el encajar la llevan igual.
11. **Lo que empalma, empalma.** `desconectado` es el último fotograma ya procesado de `caer` (`FinalDe`) con
    respiración, y `levantarse` empieza en él; `caer` sale de la guardia; `salir` empieza en el último fotograma de
    `descolgar`; el golpe del Prestado sale del paso de calle.
12. **El faldón** (`animacion.Faldon`): tumbado se extiende con la pelvis (sobre las piernas y el suelo) en vez de
    colgar hacia el suelo; y al acabar de simular, ningún hueso suyo se aleja de su forma de reposo más de 25° por
    fotograma, el panel de delante no se aparta más de 60° de su muslo hacia delante y, de pie, el bajo no pasa de
    50° de la vertical (75 al correr y en los quiebros); luego las cápsulas y el talle otra vez. Los golpes llevan
    `tope_faldon` (30).

### De dónde sale cada clip

| Clip (gesto) | Fuente | Tiempos |
|---|---|---|
| `reposo` | UAL1 Idle_Loop (pies juntos y rectos) | bucle 2,5 s |
| `guardia` | mezcla: UAL1 Punch_Jab (fotograma 0, recogida, el puño al pómulo) + Idle_Loop aditivo en el tronco | bucle 2,5 s |
| `pasear` | UAL1 Walk_Loop | ciclo 1,17 s (103 pasos/min), 1,30 m/s |
| `andar` | UAL1 Walk_Loop (zancada por IK, braceo ×1,45) | ciclo 0,93 s (129 pasos/min), 2 m/s |
| `trotar` | UAL1 Jog_Fwd_Loop (apoyo retemplado al 33 %) | ciclo 0,67 s (180 pasos/min), 5 m/s, bote 7 cm |
| `correr` | UAL1 Sprint_Loop (apoyo retemplado al 27 %) | ciclo 0,67 s (180 pasos/min), 7 m/s, pasos de 2,3 m |
| `andar-paraguas` | mezcla: Walk_Loop + la mano del paraguas con IK respecto a la cabeza (la muñeca y los dedos de la forja) | ciclo 1,17 s |
| `seguida-1` | UAL1 Punch_Jab (+ paso) | impacto 233 ms, 667 ms |
| `seguida-2` | UAL1 Punch_Cross (+ carga) | impacto 267 ms, 800 ms |
| `golpe-de-prestado` | mezcla: el paso de calle + UAL2 Melee_Hook + Melee_Hook_Rec | carga telegrafiada 0-633 ms, impacto 700 ms, 1,5 s |
| `tocado` | mezcla: la guardia + UAL2 Idle_Shield_Break aditivo (encajar sin mover los pies) | 600 ms |
| `caer` | mezcla: la guardia + UAL1 Death01 + UAL2 LayToIdle (fotograma 0) | 1,5 s |
| `desconectado` | el último fotograma de `caer`, con respiración | bucle 2 s |
| `derribado` | mezcla: UAL2 Hit_Knockback + LayToIdle + la guardia | 1,5 s: espalda en el suelo a 300 ms, se levanta desde 533 |
| `levantarse` | UAL2 LayToIdle desde el último fotograma de `caer` + la guardia | 1,13 s |
| `descolgar` | mezcla: UAL1 Interact en espejo + UAL2 Idle_TalkingPhone_Loop + la mano de la forja en la oreja (agarrada, respecto a la cabeza) | 1,5 s |
| `cargar-rayo` | UAL1 Spell_Simple_Enter + Spell_Simple_Idle_Loop, EN ESPEJO (la derecha es la boca del rayo), desde el reposo, con los pies del reposo y el izquierdo quieto (`PieComo`: sólo da un paso el derecho) | entra 0-9 (300 ms: el chispazo; `entrada`), se asienta 9-33, y desde el 33 la cola en bucle (`bucle_desde`, 2,1 s); 3,2 s |
| `lanzar-rayo` | desde el fotograma 33 de la carga (`FinalDe(..., fotograma=33)`) + el retroceso de UAL1 Spell_Simple_Shoot aumentado ×1,9 + Spell_Simple_Exit en espejo, y al reposo | la palma empuja en el impacto (fotograma 1: el destello), retrocede 1-5, baja el brazo 15-27 y recoge el pie 25-33 (desde el 15, la salida: `salida`); 1,1 s |
| quiebros (×8), `entrada`, `cierre`, `empellon`, `replica`, `tocado-espalda`, `derribado-espalda` | mezcla: la forja con la guardia de la captura en sus dos extremos (`ConGuardia`) | los de la forja |
| `descolocado`, `avance` | la forja con la guardia de la captura al principio | los de la forja |
| `salir` | la forja desde el último fotograma de `descolgar` | 1 s |
| `guardia-celador`, `retroceder`, `lateral-*`, `respuesta`, `apuntar`, `disparar`, `desalojable`, `rematar`, `absorber`, `rescatar`, `imprimirse`, `victoria` | la forja (por la misma maquinaria: bisagras, muñeca con topes) | los de la forja |

**El rayo (26-sep, `docs/quiebro/EL-RAYO.md` §6).** Los dos clips sólo existen con la captura (con `CAPTURA=0` sus gestos
pintan `apuntar` y `disparar`, como en la fase 0 del contrato). La carga es un clip de UNA vez con la cola en bucle:
`bucle_desde` en la receta, `bucleDesdeMs` en el manifiesto; el cliente pinta la entrada una vez y repite sólo la cola
(`tiempoConEntrada` en `personajes/gestos.ts`, la misma cuenta con esqueleto y en el rebaño), y el horneado cierra la
tela de esa cola como la de un bucle (`animacion.hornear`, «la cola en bucle»). El brazo que lanza lo apunta el cliente
al rumbo del gesto y tiembla con la carga (`personajes/postura.ts`, encima del clip); la mano (el hueco de `agarre_R`)
es la boca del rayo (`DirectorDeLosPersonajes.bocaDe`). `empaquetar.py clips` ya cambia el clip de un gesto si
`clips.GESTOS` lo cambia (antes se quedaba el del manifiesto viejo).

Lo que pasa ENTRE los gestos del rayo (la revisión 1) también sale de la receta: `entrada` (en el manifiesto `entradaMs`)
dice cuándo la carga ha dado el paso y subido la palma, y un lanzar que llega antes (el chispazo, el toque corto) espera a
que acabe en vez de fundirse a medio paso (`esperaLaEntrada`); `salida` (`salidaMs`) dice desde dónde el lanzar baja el
brazo y recoge el pie, y el cliente la pinta entera si el cuerpo se queda quieto aunque el juego ya vuelva al reposo (a los
260 ms del destello) o deje la carga sin lanzar (`salidaDelRayo`). `comprobar_movimiento.py` mide los dos empalmes (la
carga en su `entrada` al lanzar; la cola de la carga a la `salida`) y el golpe recibido en la carga.

**Por qué la forja con la guardia de la captura.** UAL no tiene patada circular, quiebros de lado, empellón
ni caída hacia delante. Pero la Tanda empalma golpe con golpe (fundido de 60 ms): si el Cierre empezara en la
guardia de la forja y la Seguida acabara en la de UAL, los brazos saltarían. `ConGuardia` suma a la pose de
la forja lo que va de su guardia a la de la captura, entero en los extremos y desvaneciéndose en 4-6
fotogramas. Los pies no se desvanecen: mientras un pie sigue en su primer (o último) apoyo se le aplica
entero el giro y el desplazamiento de guardia a guardia, como un sólido (si la forja pivota sobre la bola
al despegar, pivota igual en el sitio nuevo), y la corrección se reparte sólo por el aire. En medio, la
forja pura (impacto, alcance, raíz del juego e intocable intactos).

**Arreglos de la forja (segunda pasada).** De la FK a la IK el brazo de la forja se mezcla en posiciones (la
muñeca y hacia dónde apunta el codo) y no en giros: el húmero daba media vuelta en un fotograma al soltar la
guardia. En la Entrada y el avance las manos van con el cuerpo en el fotograma en que este vuela 0,9 m (el brazo
apuntaba atrás un fotograma); en la Entrada el puño se recoge a la cadera en el 11 y sale al blanco en el 12.

**Lo que se miró y no entró.** `Punch_Enter` no es una acometida: es ponerse en guardia (de reposo a los
puños arriba); la Entrada sigue siendo la de la forja (con la guardia de la captura). `Pistol_*` apunta a dos
manos y cuadrado, y el diseño pide el tirador a una mano, perfilado y con la izquierda a la espalda: sigue la
forja. `Fixing_Kneeling` se arrodilla sobre una rodilla y encorvado; el desalojable, el remate y el absorber
están hechos juntos (la cabeza del arrodillado a 1,15 m para la palma del remate) y siguen de la forja. `Yes`
es un pulgar arriba, no el puño al cielo de la victoria. `Roll` y `Slide` duran más de un segundo y no caben
en los 450 ms del quiebro. `Walk_Formal_Loop` (el andar de la primera pasada) balancea las manos 8-13 cm y cojea;
el andar es ahora `Walk_Loop`. Un andar propio de los Prestados (`Zombie_Walk_Fwd_Loop`), un paseo distinto para el
Celador o un `tocado` desde la guardia del Celador o desde apuntar necesitan un `porClase` en el gesto, que es del
manifiesto de gestos y no de los clips (queda para quien lleve el cliente).

### El segundo destino: MetaHuman

`captura.DESTINOS` tiene dos tablas: `forja` (este esqueleto) y `metahuman` (el cuerpo de MetaHuman, Unreal 5:
`pelvis`, `spine_01..05` (las cinco repartidas entre las tres de la fuente), `neck_01..02`, `head`, `clavicle`,
`upperarm`, `lowerarm`, `hand`, metacarpos y tres falanges por dedo, `thigh`, `calf`, `foot`, `ball`, y los
huesos de giro `upperarm_twist_0N`, `lowerarm_twist_0N`, `thigh_twist_01`, `calf_twist_0N`, horneados con una
fracción del giro de su hueso (`GIROS_METAHUMAN`), ya con la pose resuelta). Cada tabla dice también sus cadenas
(brazos, piernas, cabeza, pecho), así que la marcha, la guardia y las bisagras sirven igual. Con ese destino no hay
faldón ni pasada de suelo sobre las mallas de la forja: las recetas de captura pura (sin capas de la forja ni
poses de otra receta) se hornean sobre cualquier armadura con esos nombres, venga en los ejes y unidades que venga
(se mide hacia dónde mira y dónde es arriba); los codos y las rodillas, con la misma IK de bisagra:

```
blender -b --factory-startup --python-exit-code 1 --python arte/forja/captura.py -- hornear destino=metahuman \
    armadura=arte/metahuman/<id>/cuerpo.fbx salida=<carpeta>/clips-<id>.glb [clips=reposo+seguida-1] [tira=<png>]
blender ... --python arte/forja/captura.py -- hornear destino=metahuman prueba=1 salida=... tira=...
```

`prueba=1` usa una armadura con la jerarquía y los nombres del cuerpo de MetaHuman en pose A de 45° y mirando
a +X en su espacio local (cinco vértebras, dos cuellos, metacarpos, giros): así se probó el modo antes de que
lleguen los personajes (`tira` saca una tira de perfil de cada clip, con palos por hueso).

## Lo que mide la batería

**Segunda pasada de la captura (24-sep):** `validar.py` 0 errores; `en_three.mjs` 0 fallos (la pistola y el
paraguas en la mano); `verificar-quiebro-personajes` del cliente 170 de 170 (el pie apoyado a 1,4 / 2 / 4,2 / 5 /
6,5 m/s: 0,010 / 0,021 / 0,097 / 0,143 / 0,084 m/s de mediana). `comprobar_movimiento.py`: 8 fallos por sexo (la
primera pasada, 183 en el hombre; la forja pura, 42): ninguno en codos, rodillas, muñecas, marcha ni golpes; quedan
giros de más de 120° en un fotograma en clips de la forja (avance, derribado-espalda, descolocado, la Entrada al
sacar el puño de la cadera, quiebro-derecha, réplica, tocado-espalda) y el fundido de apuntar a tocado (del cliente:
le falta un `porClase`). `comprobar.py` sigue sin estar en verde, como la forja: 281 fallos en las 18 figuras contra
283 de la forja pura y 287 de la primera pasada (faldón atravesado 129/123, solapes 73/84, pie que patina 42/50,
levita 13/15, flota 11/0, miriñaque 9/8, dientes 2/2, suelo 2/1). Lo que sube: `caer` (la mano roza el muslo al
sentarse, un fotograma; flota 2 cm de más en las figuras gruesas al llegar al suelo) y el faldón de la guardia de la
gabardina (la tela interior roza el muslo de atrás: 3 figuras); lo que baja: los solapes de los quiebros, el
derribado y el levantarse, y el pie que patina al andar.

`comprobar.py`, por figura y clip, sobre la malla deformada: suelo (nada por debajo de -1 cm), flotar
en los tramos de contacto y **levitar** fuera de los vuelos declarados, solapes entre partes del
cuerpo, el faldón atravesado por las piernas, el **miriñaque** (en reposo y guardia el bajo no pasa
de 1,15 veces el de la malla sin posar ni del ancho de hombros), el **talle** (ninguna junta del faldón
por encima de la cadera), los **dientes de sierra** (un vértice que se aparta de sus vecinos: pesos
mal copiados), el **pie que patina** (a menos de 2 cm del suelo y a más de 1 m/s), el resbalar de lo
apoyado, y los **golpes** (recorrido mínimo del puño desde la guardia, alcance hasta el blanco a 0,9 m
y pico de velocidad al impacto). `comprobar_movimiento.py`, sobre el esqueleto de cada sexo (segunda pasada de
la captura: lo que la revisión de animación midió a mano y nada miraba): el codo y la rodilla dentro de su bisagra
(≤ 10°), el codo plegado ≤ 150° y nunca al revés, la muñeca ≤ 85°, ningún hueso que gire más de 120° de un
fotograma a otro, el puño fuera de la cara, la marcha de una persona por clip (pasos por minuto, bote, vuelo por
paso, cojear, el resbalón del pie apoyado en el percentil 90 y el vaivén de las manos), los fundidos que el
juego reproduce (leídos de `personajes/gestos.ts`: más de 6 m/s es un salto) y los golpes (altura, alcance en los
dos sexos, pasarse de rosca, chasquido). `validar.py`, sobre los GLB: presupuestos, esqueletos, pesos,
zonas, gestos contra `cuerpos.ts`, bytes, y la dirección de arte que se puede medir (abrigos por
encima de L* 35, nada ámbar fuera de lo del jugador, cuatro cristales tintados distintos). Cada
comprobación nueva se vio en rojo contra la primera entrega antes de darla por buena.

## Cómo añadir una figura o un clip

- Figura: una entrada en `reparto.FIGURAS` (y su variante en `FAMILIAS`), su vestuario en
  `anatomia.figura`, y `FIGS="<id>" bash rehacer.sh figuras`, luego `empaquetar` y `bateria`.
- Clip: una función con `@clip(...)` en `clips.py`, su lugar en `ORDEN` y, si pinta un gesto, en
  `GESTOS` (o en `POR_DIRECCION` / `POR_CLASE`). `validar.py` lee el tipo `Gesto` de `cuerpos.ts` y
  falla si a algún gesto le falta clip. Para mirarlo mientras se ajusta, `ensayo.py`.
