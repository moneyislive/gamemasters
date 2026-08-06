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

module.exports = config;
