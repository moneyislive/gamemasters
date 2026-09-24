# La forja: el reparto de El Quiebro hecho por código

Todos los personajes de El Quiebro (`docs/EL-QUIEBRO.md` §1, §3, §4.8, §8) salen de aquí: seis
desvelados (hombre y mujer con Gabardina, Ligera y Mole), cuatro Celadores (alto y enjuto, ancho,
mujer y mayor con sombrero; el tirador es el mismo con la pistola en la mano), ocho durmientes (dos
cuerpos por cuatro ropas de calle), dos piezas aparte (pistola y paraguas) y los 46 clips que pintan
cada `Gesto` de `escritorio/src/quiebro/cuerpos.ts` (con sus variantes por dirección y por clase).
Nada se descarga: Blender 4.2 sin ventana modela con campos de distancia (SDF), malla con *surface
nets*, pesa, anima y exporta.

Lo que baja el juego está en `escritorio/src/quiebro/recursos/` (los GLB y `reparto.json`). Lo que
hay aquí son los guiones que lo fabrican; lo fabricado a medias (`obra/`) y las capturas
(`capturas/`) no se versionan.

## Una orden

```
bash arte/forja/rehacer.sh                 # todo: figuras, piezas, clips, empaquetado, capturas y batería (~30 min)
bash arte/forja/rehacer.sh sin-capturas    # lo que hace falta para el juego, con la batería (~10 min)
bash arte/forja/rehacer.sh figuras|piezas|clips|empaquetar|capturas|bateria     # una fase
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
| bateria | `comprobar.py` (malla deformada en Blender), `validar.py` (GLB a mano), `en_three.mjs` (GLTFLoader de three), `resumen.py` | `obra/comprobacion_*.json`, `obra/validacion.json`, `obra/en_three.json`, `obra/resumen_bateria.json` |

Para ajustar unos pocos clips sin rehacer nada: `ensayo.py` hornea los clips pedidos sobre UNA figura
y saca una tira por clip (la cámara del juego de `encuadre.ts`, perfil, frente…), con un blanco a
1,1 m en los golpes; `fr=12-19` los enseña fotograma a fotograma y `medir=1` escribe las posiciones.

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
| `animacion.py` | El solucionador (FK, IK de dos huesos, brazo que golpea, pivote en la punta del pie, manos), la locomoción, el horneado (pasada de suelo sobre la malla, rodadura, raíz del juego) y la simulación del faldón. |
| `clips.py` | **El vocabulario**: un clip por `Gesto` con su nombre definitivo, y `GESTOS`, `POR_DIRECCION`, `POR_CLASE`, `ENTRA_CON`, los mapas que van a `reparto.json`. |
| `piezas.py` | Pistola y paraguas. |
| `forja.py` | Punto de entrada de Blender (fases figura, clips, piezas, capturas). |
| `ensayo.py` | Hornear y mirar unos pocos clips sobre una figura (arriba). |
| `empaquetar.py`, `glb.py`, `comprimir.mjs` | Del GLB de Blender al GLB del juego (sin Blender): familias, clips adelgazados, compresión meshopt y el manifiesto. |
| `mosaico.py` | El reparto de un vistazo (`capturas/reparto.png`). |
| `escena.py`, `tiras.py`, `imagen.py` | Luces de noche, cámaras (la del juego, `camara_juego`), hojas, tiras y mosaicos. |
| `comprobar.py`, `validar.py`, `en_three.mjs`, `resumen.py` | La batería. |
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

## Lo que mide la batería

`comprobar.py`, por figura y clip, sobre la malla deformada: suelo (nada por debajo de -1 cm), flotar
en los tramos de contacto y **levitar** fuera de los vuelos declarados, solapes entre partes del
cuerpo, el faldón atravesado por las piernas, el **miriñaque** (en reposo y guardia el bajo no pasa
de 1,15 veces el de la malla sin posar ni del ancho de hombros), el **talle** (ninguna junta del faldón
por encima de la cadera), los **dientes de sierra** (un vértice que se aparta de sus vecinos: pesos
mal copiados), el **pie que patina** (a menos de 2 cm del suelo y a más de 1 m/s), el resbalar de lo
apoyado, y los **golpes** (recorrido mínimo del puño desde la guardia, alcance hasta el blanco a 0,9 m
y pico de velocidad al impacto). `validar.py`, sobre los GLB: presupuestos, esqueletos, pesos,
zonas, gestos contra `cuerpos.ts`, bytes, y la dirección de arte que se puede medir (abrigos por
encima de L* 35, nada ámbar fuera de lo del jugador, cuatro cristales tintados distintos). Cada
comprobación nueva se vio en rojo contra la primera entrega antes de darla por buena.

## Cómo añadir una figura o un clip

- Figura: una entrada en `reparto.FIGURAS` (y su variante en `FAMILIAS`), su vestuario en
  `anatomia.figura`, y `FIGS="<id>" bash rehacer.sh figuras`, luego `empaquetar` y `bateria`.
- Clip: una función con `@clip(...)` en `clips.py`, su lugar en `ORDEN` y, si pinta un gesto, en
  `GESTOS` (o en `POR_DIRECCION` / `POR_CLASE`). `validar.py` lee el tipo `Gesto` de `cuerpos.ts` y
  falla si a algún gesto le falta clip. Para mirarlo mientras se ajusta, `ensayo.py`.
