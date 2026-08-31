/**
 * Metro tiene que poder leer `shared/`, que vive FUERA de esta carpeta.
 *
 * Es lo que permite que la app y el servidor compartan el mismo contrato de
 * tipos en vez de mantener dos copias que se desincronizan a la primera de
 * cambio. Por defecto Metro solo mira dentro del proyecto, así que hay que
 * decírselo explícitamente.
 */
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const raizApp = __dirname;
const raizRepo = path.resolve(raizApp, '..');

const config = getDefaultConfig(raizApp);

// Carpetas de fuera del proyecto que Metro debe vigilar y resolver.
config.watchFolders = [path.resolve(raizRepo, 'shared')];

// Los módulos se buscan primero en la app y después en la raíz del repositorio.
config.resolver.nodeModulesPaths = [
  path.resolve(raizApp, 'node_modules'),
  path.resolve(raizRepo, 'node_modules'),
];

/*
 * ═══ Y AQUÍ NO HAY NADA PARA `canvaskit.wasm`, QUE ES LO QUE HABÍA QUE MIRAR ═══
 *
 * El §7 del diseño del motor de arcade dejó apuntado que, al entrar Skia, habría
 * que «ejecutar `setup-skia-web` y añadir el `.wasm` a los activos públicos de
 * `app/metro.config.js`». Se comprobó al entrar, y de las dos mitades solo hace
 * falta la primera:
 *
 *   · `setup-skia-web public` copia el binario a `app/public/`, y está enganchado
 *     al `postinstall` de `package.json`, así que un clon recién instalado y el
 *     despliegue de Render lo tienen sin que nadie se acuerde de nada.
 *   · Y no hace falta tocar NADA aquí: desde el SDK 49, Expo sirve `app/public/`
 *     tal cual en desarrollo y lo copia al exportar la web — está en
 *     `@expo/cli/build/src/export/publicFolder.js`. Nadie importa el `.wasm` desde
 *     JavaScript —el cargador de Emscripten lo pide por HTTP en tiempo de
 *     ejecución—, así que meterlo en `resolver.assetExts` no compraría nada y
 *     sería una línea que parece hacer algo.
 *
 * Queda escrito porque quien lea aquel §7 va a venir aquí a buscar la línea que
 * falta, y no encontrarla se parece demasiado a un olvido. Lo que sí existe es un
 * comprobador —`verify:canvaskit`— que vigila las dos cosas que de verdad dejan la
 * web en blanco: que el binario esté servido y que se pida bajo el `baseUrl` de
 * `app.json` y no desde la raíz del dominio.
 */

module.exports = config;
