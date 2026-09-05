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

const raizShared = path.resolve(raizRepo, 'shared');
const raizEscenas = path.resolve(raizRepo, 'escenas');

/*
 * Carpetas de fuera del proyecto que Metro debe vigilar y resolver.
 *
 * `escenas/` entra con `shared/` desde que el lobby de la Sala se pinta en tres
 * dimensiones: las escenas las comparten los dos clientes —la app y el escritorio—
 * y por eso viven fuera de los dos. Ver la cabecera de `escenas/tipos.ts`.
 */
config.watchFolders = [raizShared, raizEscenas];

// Los módulos se buscan primero en la app y después en la raíz del repositorio.
config.resolver.nodeModulesPaths = [
  path.resolve(raizApp, 'node_modules'),
  path.resolve(raizRepo, 'node_modules'),
];

/*
 * ═══ UNA SOLA COPIA DE `three`, DE `react` Y DE R3F, AUNQUE HAYA VARIAS EN EL DISCO ═══
 *
 * La app es un proyecto de npm aparte, con su `node_modules`; `escenas/` es un
 * paquete del taller de la raíz, y la raíz tiene OTRO `three` y OTRO `react`
 * (versiones distintas incluso: 19.2.3 aquí, 19.2.8 allí). Metro resuelve cada
 * `import` subiendo por las carpetas desde el fichero que importa, así que un
 * `import * as THREE from 'three'` escrito en `escenas/delta.tsx` encontraría
 * primero el `three` de la raíz, y el `Canvas` de la app —que trae el suyo—
 * recibiría mallas fabricadas por otra copia del motor. Con `react` es peor: dos
 * copias son «Invalid hook call» en el primer `useFrame`, sin más pista.
 *
 * Por eso, para lo que viene de FUERA de la app, estos paquetes se resuelven como
 * si los pidiera la propia app. Sólo estos: son los que guardan estado global o
 * comparan con `instanceof`. Lo demás sigue el camino normal.
 */
const UNICOS = new Set(['react', 'react-dom', 'react-native', 'three', '@react-three/fiber', 'scheduler']);

function paqueteDe(especificador) {
  if (especificador.startsWith('.') || path.isAbsolute(especificador)) return null;
  const trozos = especificador.split('/');
  return especificador.startsWith('@') ? trozos.slice(0, 2).join('/') : trozos[0];
}

/*
 * ═══ LA REGLA ES «TODO LO QUE NO SEA node_modules DE LA APP», Y LA COMPARACIÓN VA NORMALIZADA ═══
 *
 * La primera versión de esto sólo reescribía los imports cuyo origen empezara por
 * `escenas/` o `shared/`, comparando cadenas con `path.sep`. Se vio fallar de dos maneras
 * que no se ven en el escritorio:
 *
 *   · La comparación dependía de la FORMA de la ruta: con barras invertidas casaba y con
 *     barras normales no, y Metro no promete una u otra. En cuanto no casa, el fichero de
 *     `escenas/` resuelve `three` hacia arriba y se lleva la copia de la raíz del monorepo.
 *   · Y aunque case, cualquier paquete resuelto desde la raíz que importe `three` tampoco
 *     está en `escenas/` ni en `shared/`: se lleva la copia de la raíz igual.
 *
 * Dos copias de `three` no fallan al empaquetar ni al arrancar: fallan en el primer
 * `position={vector}`. Fiber sólo copia un vector si `value.constructor` es SU `Vector3`;
 * si es el de la otra copia lo asigna a pelo y `position` es de sólo lectura. En el
 * teléfono eso fue «Cannot assign to read-only property 'position'» al abrir el Muelle, y
 * la app cerrada. Por eso ahora la pregunta es la contraria: ¿viene este import de DENTRO
 * de los node_modules de la app? Si no, se resuelve como si viniera de la app. Y las rutas
 * se comparan normalizadas —barras normales y sin distinguir mayúsculas en Windows—.
 */
const nodeModulesDeLaApp = normaliza(path.resolve(raizApp, 'node_modules')) + '/';
function normaliza(ruta) {
  const conBarras = String(ruta).replace(/\\/g, '/');
  return process.platform === 'win32' ? conBarras.toLowerCase() : conBarras;
}
function vieneDeFuera(fichero) {
  return !normaliza(fichero).startsWith(nodeModulesDeLaApp);
}

const resolverAnterior = config.resolver.resolveRequest;
function resolverComoAntes(context, moduleName, platform) {
  return resolverAnterior
    ? resolverAnterior(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
}

/* La segunda red: si a pesar de todo Metro busca uno de los ÚNICOS por su cuenta, que lo
   encuentre en la app y no en la raíz. */
config.resolver.extraNodeModules = Object.fromEntries(
  [...UNICOS].map((paquete) => [paquete, path.resolve(raizApp, 'node_modules', paquete)]),
);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const paquete = paqueteDe(moduleName);
  if (paquete !== null && UNICOS.has(paquete) && vieneDeFuera(context.originModulePath)) {
    // Como si lo pidiera un fichero de la app: la búsqueda arranca en app/node_modules.
    return resolverComoAntes(
      { ...context, originModulePath: path.join(raizApp, 'package.json') },
      moduleName,
      platform,
    );
  }
  return resolverComoAntes(context, moduleName, platform);
};

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
