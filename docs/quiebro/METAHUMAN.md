# El reparto de El Quiebro en MetaHuman: qué hay que crear y cómo se exporta

**Para Miguel.** Los personajes de El Quiebro pasan de la forja procedural de Blender a **MetaHuman**
de Epic, que desde Unreal Engine 5.6 (junio de 2025) se puede usar en otros motores sin regalías y
gratis por debajo de un millón de dólares al año
([licencia](https://www.metahuman.com/license), [CG Channel](https://www.cgchannel.com/2025/06/you-can-now-sell-metahumans-or-use-them-in-unity-or-godot/)).
Tú creas y exportas los personajes en Unreal con tu cuenta de Epic (yo no puedo iniciar sesión por
ti); yo convierto lo exportado en personajes para el navegador y el móvil: niveles de detalle,
texturas comprimidas, nuestro esqueleto y las animaciones de captura de Quaternius (CC0).

Tiempo estimado: la instalación, 1-2 h de descarga; cada personaje, 10-15 min.

---

## 1. Instalar (una vez)

1. **Epic Games Launcher** → pestaña Unreal Engine → Biblioteca → instalar **Unreal Engine 5.6 o
   posterior** (la más reciente que haya). En **Opciones** de la instalación, marca
   **«MetaHuman Creator Core Data»**. Hacen falta unos 100 GB libres.
2. Crea un proyecto **Third Person** (en Blueprint, sin contenido de ejemplo). Llámalo `Quiebro`.
3. **Edit → Plugins**, busca **«MetaHuman Creator»**, actívalo y reinicia el editor.

## 2. Crear cada personaje

1. En el Content Browser: clic derecho → **MetaHuman → MetaHuman Character**. Ponle el nombre de
   la tabla de abajo (columna «id», por ejemplo `desvelado-gabardina-h`).
2. Ábrelo y ajústalo con **Presets**, **Body**, **Head** y **Details** (pelo, cejas, piel y ropa).
3. **Assembly**: tipo **«UE Optimized»**, calidad alta. Pulsa **Create Full Rig** (te pedirá iniciar
   sesión en la web de Epic), después **Download Texture Source** a **2K** (no hace falta más para
   web; 4K y 8K sólo pesan) y por último **Assemble**. (Si el botón Assemble no aparece, cambia de
   panel y vuelve: es un fallo conocido.)

### Reglas de diseño que no se pueden saltar (propiedad intelectual y legibilidad)

- **Nadie puede parecerse a un actor ni a un personaje conocido.** Nada de gabardinas de cuero negro
  largas con gafas redondas, ni trajeados idénticos con auricular. Caras variadas en edad y origen.
- **Pelo corto o recogido** en todos (rapado, corto, engominado, moño). Las melenas largas no se
  pueden llevar a la web con calidad.
- **Desvelados sin gafas oscuras.** Colores de ropa apagados (topo, oliva, azul marino, gris). Su
  forro y sus ribetes los tiñe el juego del color de cada jugador.
- **Celadores con gafas oscuras**, traje de chaqueta, camisa y corbata, **sin auricular** y cada uno
  distinto de los demás.

## 3. El reparto, por orden de prioridad

Con los **seis primeros** ya se puede jugar con personajes nuevos; el resto se va sumando.

| # | id | Quién es | Complexión | Ropa (lo más parecido que ofrezca MetaHuman) |
|---|---|---|---|---|
| 1 | `desvelado-gabardina-h` | Desvelado, 30-40 años | media, atlético | abrigo largo hasta la rodilla color topo u oliva, pantalón oscuro, botas |
| 2 | `desvelada-gabardina-m` | Desvelada, 25-35 años | atlética | abrigo o gabardina hasta la rodilla gris o azul marino, pantalón, botas |
| 3 | `celador-alto` | Celador, 40-50 años | alto y enjuto | traje marengo, camisa blanca, corbata oscura, gafas de sol rectangulares |
| 4 | `celadora` | Celadora, 35-45 años | media | traje azul noche, camisa, corbata fina, gafas de sol, pelo recogido |
| 5 | `durmiente-h` | Civil, 20-60 años | cualquiera | chubasquero o cazadora de calle, vaqueros |
| 6 | `durmiente-m` | Civil, 20-60 años | cualquiera | sudadera o abrigo corto, pantalón |
| 7 | `desvelado-ligera-h` | Desvelado | delgado | chaqueta corta (tipo cazadora), camiseta, pantalón |
| 8 | `desvelada-ligera-m` | Desvelada | delgada | chaqueta corta, pantalón ceñido |
| 9 | `desvelado-mole-h` | Desvelado | corpulento | abrigo grueso o parka |
| 10 | `desvelada-mole-m` | Desvelada | robusta | abrigo grueso o parka |
| 11 | `celador-ancho` | Celador | ancho, pesado | traje pardo |
| 12 | `celador-mayor` | Celador, 60 años | media | traje verde botella; sombrero si hay |
| 13-16 | `durmiente-2..5` | Civiles variados | variadas | camarero (camisa blanca y chaleco), chaqueta de obra, gabardina de lluvia, sudadera |

## 4. Exportar

Para cada personaje, en `Content/MetaHumans/<id>/`:

1. **Body**: clic derecho en la Skeletal Mesh del cuerpo → **Asset Actions → Export…** → FBX. En las
   opciones de exportación FBX, activa **Level Of Detail** (así salen todos los LOD).
2. **Face**: lo mismo con la Skeletal Mesh de la cara (también con **Level Of Detail**).
3. **Ropa**: cada malla de ropa que aparezca en la carpeta del personaje, igual.
4. **Pelo**: si en la carpeta del pelo hay mallas de «cards» (tarjetas de pelo), expórtalas también en
   FBX. Si sólo hay «groom», no pasa nada: lo resuelvo yo con tarjetas.
5. **Texturas**: copia la carpeta de texturas descargadas a 2K (los PNG), o exporta cada textura del
   personaje (clic derecho → Export) en PNG o TGA.

Déjalo todo en:

```
C:\Users\QWERTY\Documents\GameMasters-matrix\arte\metahuman\<id>\
    cuerpo.fbx   cara.fbx   ropa-*.fbx   pelo-*.fbx   texturas\*.png
```

Esa carpeta no va a git (pesa cientos de megas): lo que se versiona es el resultado ya convertido.

## 5. Qué hago yo con lo exportado

- Elijo el nivel de detalle de MetaHuman que toca a cada nivel del juego (el propio de cerca, los
  demás más ligeros, la multitud en el más bajo) y lo mido contra el presupuesto de cada nivel.
- Bajo y comprimo las texturas para la web y junto materiales para ahorrar llamadas de dibujo.
- Monto el esqueleto del cuerpo y paso las animaciones de captura de Quaternius (Universal Animation
  Library 1 y 2, CC0, ya descargadas en `arte/ual/`), que vienen preparadas para el esqueleto de
  Unreal, que es el mismo que el del cuerpo de MetaHuman.
- Sombreado de piel, ojos y pelo en tarjetas para el navegador.

Si algo de esta guía no coincide con lo que ves en tu versión de Unreal, dímelo con una captura y lo
ajusto.
