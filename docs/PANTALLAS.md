# PANTALLAS: que cada juego quepa y se disfrute en todos los aparatos

Encargo de Miguel del 27-sep-2026: al probar los juegos «la disposición de botones y elementos en la
pantalla hacía que no se vieran las cosas bien, no se pudiera jugar correctamente y no se pudiera
disfrutar». Hay que revisar cada juego —El Burgo, Riberas, Las Lindes y El Quiebro— en varias
resoluciones de ordenador y **sobre todo de móvil**, en los tres clientes: la Sala (`/sala`,
`escritorio/`), la app en el navegador (`/jugar`, `app/` con Expo web) y la app nativa. Y usar la
pantalla completa para no perder sitio con las barras del navegador ni con las del sistema.

## 0 · Lo primero que se encontró

**La Sala obligaba a `width=1024` también en el teléfono** (`escritorio/index.html`): el móvil la
pintaba como un monitor encogido a un tercio. Desde el 27-sep es `width=device-width,
viewport-fit=cover`. Eso deja al descubierto todas las pantallas de la Sala que sólo se habían
pensado para 1024 o más: es el grueso del trabajo.

## 1 · Cómo se mide: el fotógrafo, no el panel

El panel del navegador NO cambia el viewport de verdad ni emula el toque. Se usa
`scripts/fotografo.mjs`, que abre Edge sin ventana por el protocolo de depuración y emula cada
aparato de verdad (viewport, densidad, `(pointer: coarse)`, agente de usuario):

    node scripts/fotografo.mjs <plan.json>

Ver la cabecera del guion para el plan. Aparatos: `movil-pequeno` 360×640, `iphone-se` 375×667,
`iphone-14` 390×844, `android-grande` 412×915, `movil-tumbado` 844×390, `android-tumbado` 915×412,
`tableta` 768×1024, `tableta-tumbada` 1024×768, `portatil` 1366×768, `escritorio` 1920×1080.

Deja un PNG por aparato (se mira con Read: **mirarlo es obligatorio**, el informe sólo da pistas) e
`informe.json` con lo que se sale de la pantalla, lo que se pisa, los botones de menos de 44 px en
táctil y los textos cortados. Si `cuadra` es `false`, la foto no vale.

**Un perfil y un puerto de depuración por agente** (`perfil`, `puerto` del plan), o se pisan.

## 2 · Los servidores (ya levantados; no arranques otros)

- API: `http://localhost:5270` (worktree `GameMasters-avatares`).
- Sala: `http://localhost:5271/sala/<arcade>` (`burgo`, `riberas`, `lindes`, `quiebro`…).
- App web: `http://localhost:8121` (Expo web; en producción es `/jugar`). Su servidor de API es el
  guardado en `localStorage.gm_servidor`: ponlo a `http://localhost:5270` con `almacen`.

## 3 · Sentarse a una mesa sin pulsar nada

    POST http://localhost:5270/api/arcade/mesas            {arcade, nombre, modalidad: 'botas'|'normal', plazoSegundos: 0}
      → { codigo, asiento, llave, mesa }
    POST http://localhost:5270/api/arcade/mesas/:codigo/asientos   {nombre, arcade}   (el segundo jugador)
    POST http://localhost:5270/api/arcade/mesas/:codigo/movimientos {rev, tipo, carga} con cabecera x-asiento: <llave>
      (para empezar: la opción de `mesa.opciones` con id `empezar`)

Todas con cabecera `origin: http://localhost:5271`. En la Sala el asiento se guarda en
`localStorage['escritorio.arcade.<arcade>'] = '<CODIGO>:<LLAVE>'`, y Boots on Board necesita
`localStorage['escritorio.aparato.veredicto'] = 'plena'`. Con eso en `almacen` el fotógrafo abre la
mesa ya sentado. Para bajar a pie, `antes` pulsa el botón de la cámara («Al hombro»).

## 4 · Qué es «correcto»

En los diez aparatos y en cada estado de la pantalla que importe (vestíbulo, mesa esperando, mesa
jugando desde arriba, a pie, hojas/cajones abiertos, fin de partida):

1. **Nada imprescindible tapado ni fuera de la pantalla**: marcador, de quién es el turno, las
   acciones del turno, los mandos (palanca, correr, golpear, cámaras), avisos, código de la mesa.
2. **Nada encima de otra cosa que haga falta ver o tocar**, y nada que tape el tablero más de lo
   imprescindible. Lo secundario se recoge (cajón, hoja, botón que lo abre) en vez de apilarse.
3. **Tocable con el dedo**: 44 px como poco en táctil, con aire entre botones.
4. **Legible**: nada por debajo de 12 px de letra en móvil; contraste suficiente.
5. **Sin desplazamiento de la página** en las pantallas de juego (el tablero ocupa la ventana: `100dvh`,
   no `100vh`, que en el móvil incluye la barra del navegador), respetando las zonas seguras
   (`env(safe-area-inset-*)`) de muescas y barras de gestos.
6. **La escena encuadrada**: el tablero entero a la vista desde la mesa en cada forma de pantalla;
   a pie, el avatar y lo que tiene delante.
7. **Tumbado también**: en 844×390 no cabe lo mismo que de pie; se reparte distinto, no se amontona.

## 5 · La pantalla completa

- **Web (Sala y /jugar):** un botón de pantalla completa (Fullscreen API) en las pantallas de juego,
  y petición automática al primer toque de un aparato táctil al entrar en una partida. En iPhone
  Safari no existe la API para páginas: allí sirve el manifiesto (`display: fullscreen`) y las
  metas de aplicación web, que dan pantalla completa al añadirla a la pantalla de inicio.
- **App nativa:** barra de estado oculta y barra de navegación de Android en modo inmersivo
  (`expo-navigation-bar`, deslizar para verla) mientras se juega. Añadir un módulo nativo pide
  compilar un APK nuevo: lo lanza Miguel.
