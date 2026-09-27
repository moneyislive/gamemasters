/**
 * LA CARGA DE LOS TROZOS EN LA WEB: traer el trozo ANTES de pedir el módulo, no después.
 *
 * Este fichero no lo importa nadie a mano: `metro.config.js` lo pone como
 * `transformer.asyncRequireModulePath`, y Metro lo mete en cada módulo que escriba un
 * `import('./…')`. Es la función a la que se convierte ese `import()` al empaquetar.
 *
 * ═══ EL FALLO QUE ESTO CIERRA, Y CÓMO SE VIO ═══
 *
 * La app en la web (`/jugar`) apuntaba un fallo FATAL al abrir cualquier pantalla perezosa
 * —El Quiebro, El Burgo, Riberas, Las Lindes, el Muelle, La Peonza, el lienzo del arcade—:
 * «Requiring unknown module "1627"», `global · fatal`. La app seguía funcionando, pero en la
 * siguiente carga el parte de fallos enseñaba «La última vez la app se cerró por esto…» y
 * había que pulsar «Olvidar». El 1627 del paquete exportado era el módulo de
 * `quiebro-en-tres-escena`, que vive en su propio trozo; en desarrollo salían otros números
 * porque Metro numera distinto, pero era lo mismo.
 *
 * ═══ POR QUÉ PASABA: UNA SONDA QUE ESPERA UN `throw` Y RECIBE UN FATAL ═══
 *
 * El `import()` de Expo 57 (`expo/src/async-require/asyncRequireModule.ts`) hace en la web
 * una cosa distinta que en el aparato. En el aparato baja el trozo y luego pide el módulo.
 * En la web PRIMERO pide el módulo a pelo, dentro de un `try`, por si el trozo ya estuviera
 * en la página con una etiqueta `<script>` de antemano, y sólo si eso lanza baja el trozo.
 *
 * Pero pedir a pelo un módulo que no está NO lanza: el `require` de Metro
 * (`metro-runtime/src/polyfills/require.js`, `guardedLoadModule`) envuelve la carga, y si
 * no está ya dentro de otra carga y existe `global.ErrorUtils` —y en la web existe: lo
 * pone el propio runtime de Metro—, recoge el error y lo manda a
 * `ErrorUtils.reportFatalError`. De ahí sale el fatal que guarda `parte-de-fallos.tsx`. La
 * sonda luego sí revienta, más abajo y por otra cosa (`importedAll` de un módulo que no
 * existe), el `catch` de Expo baja el trozo, y la pantalla sale bien. Por eso la app
 * funcionaba y el parte decía que se había cerrado.
 *
 * Con `web.output: "single"` nunca hay trozos puestos de antemano en la página, así que la
 * sonda falla SIEMPRE, en cada primera carga de cada trozo.
 *
 * ═══ EL ARREGLO: HACER EN LA WEB LO QUE YA SE HACE EN EL APARATO ═══
 *
 * Si el `import()` trae la ruta de su trozo, se baja el trozo primero y se le pasa luego la
 * pregunta al `import()` de Expo tal cual; para entonces el módulo ya está definido y su
 * sonda acierta a la primera. No se copia el fichero de Expo: se envuelve, así que todo lo
 * demás —los `Worker`, `prefetch`, la resolución— sigue siendo el suyo.
 *
 *   · Bajar dos veces no cuesta nada: `__loadBundleAsync` (`buildAsyncRequire.ts`) guarda
 *     una promesa por ruta, así que el segundo `import()` del mismo trozo recibe la misma
 *     promesa ya resuelta, y la sonda de Expo, que viene detrás, lo encuentra.
 *   · En el aparato no se toca nada: allí Hermes lleva un solo paquete sin trozos y el
 *     `import()` de Expo ya baja antes de pedir. Por eso la rama es sólo para la web.
 *   · El paquete inicial no crece: los trozos siguen siendo trozos, sólo cambia el orden
 *     de las dos cosas que se hacen al pedir uno.
 *
 * `npm run verify` (verificar-app.mjs, «El import() baja su trozo antes de pedir el
 * módulo») EJECUTA este fichero con un Expo y un Metro de mentira que sondean como los de
 * verdad, cuenta las preguntas por módulos que aún no están, lo ve caer sin el envoltorio y
 * carga `metro.config.js` para ver que lo enchufa.
 *
 * Es `.js` y no `.ts` a propósito: Metro lo pide con `require` y espera la función en
 * `module.exports`, y así no hay que declarar `module` ni `require` para el `tsc` de la app.
 */
'use strict';

const importDeExpo = require('expo/internal/async-require-module');

/**
 * La promesa de bajar el trozo donde vive `idDelModulo`, o `null` si no hay trozo que bajar
 * (no es la web, el `import()` no es de otro trozo, o el runtime no sabe bajar trozos).
 */
function bajarElTrozo(idDelModulo, rutas) {
  if (process.env.EXPO_OS !== 'web') return null;
  if (rutas == null) return null;
  const ruta = rutas[String(idDelModulo)];
  if (ruta == null) return null;
  const prefijo = typeof __METRO_GLOBAL_PREFIX__ === 'string' ? __METRO_GLOBAL_PREFIX__ : '';
  const bajar = globalThis[`${prefijo}__loadBundleAsync`];
  if (typeof bajar !== 'function') return null;
  return bajar(ruta);
}

/** El `import()`: primero el trozo, luego el `import()` de Expo, que ya lo encuentra. */
function importarConSuTrozo(idDelModulo, rutas, nombre) {
  const trozo = bajarElTrozo(idDelModulo, rutas);
  if (trozo === null) return importDeExpo(idDelModulo, rutas, nombre);
  const promesa = trozo.then(() => importDeExpo(idDelModulo, rutas, nombre));
  /* Expo cuelga el resultado en `_result` para la rehidratación; aquí es la misma promesa. */
  promesa._result = promesa;
  return promesa;
}

/* Lo mismo para la versión «quizá síncrona», que hace la misma sonda por dentro. */
importarConSuTrozo.unstable_importMaybeSync = function (idDelModulo, rutas, nombre) {
  const trozo = bajarElTrozo(idDelModulo, rutas);
  if (trozo === null) return importDeExpo.unstable_importMaybeSync(idDelModulo, rutas, nombre);
  return trozo.then(() => importDeExpo.unstable_importMaybeSync(idDelModulo, rutas, nombre));
};

/* Lo demás no sondea: se usa el de Expo tal cual. */
importarConSuTrozo.prefetch = importDeExpo.prefetch;
importarConSuTrozo.unstable_resolve = importDeExpo.unstable_resolve;
importarConSuTrozo.unstable_createWorker = importDeExpo.unstable_createWorker;

module.exports = importarConSuTrozo;
