/**
 * ¿ESTÁ SKIA LISTO? — LA VERSIÓN WEB, QUE ES LA QUE PAGA LA DEUDA DEL §7.
 *
 * En web, Skia es CanvasKit: un binario de WebAssembly de varios megabytes que el
 * navegador descarga y compila antes de que se pueda pintar un solo píxel. Hasta
 * que eso termina no hay lienzo, así que este fichero devuelve `false` y quien
 * pinta enseña que está cargando.
 *
 * ═══ LAS DOS DEUDAS QUE SE PAGAN AQUÍ, LAS DOS DEL §7 DEL DISEÑO ═══
 *
 * 1. EL FICHERO TIENE QUE ESTAR SERVIDO. `npx setup-skia-web public` copia
 *    `canvaskit.wasm` desde `node_modules/canvaskit-wasm` a `app/public/`, que es
 *    la carpeta que Expo publica tal cual al exportar la web. Sin ese paso no hay
 *    nada que descargar, y el síntoma es el mismo que el del punto siguiente.
 *
 * 2. Y TIENE QUE PEDIRSE DONDE ESTÁ. Aquí está el fallo mudo que el diseño dejó
 *    apuntado antes de instalar nada: `app.json` declara
 *    `experiments.baseUrl: "/jugar"`, así que la app se sirve bajo ese prefijo,
 *    mientras que el cargador de Emscripten pide `/canvaskit.wasm` desde la raíz
 *    del dominio. En Render eso devuelve el `index.html` del comodín, el
 *    instanciador de WebAssembly se encuentra un HTML donde esperaba un binario, y
 *    lo que ve quien abre la página es UNA PANTALLA EN BLANCO SIN ERROR LEGIBLE.
 *
 *    Se arregla con `locateFile`, que es el gancho que CanvasKit ofrece justo para
 *    esto. La cuenta la hace `./canvaskit.ts`, aparte y sin importar nada, para
 *    que `verify:canvaskit` pueda comprobar LA DIRECCIÓN QUE SALE y no la
 *    presencia de una línea.
 *
 * ═══ POR QUÉ SE CARGA AL PINTAR Y NO AL ARRANCAR LA APP ═══
 *
 * Porque son megabytes que solo necesita quien abra un arcade de lienzo. Cargarlo
 * en el arranque se los cobraría a quien entra a ver una velada, que es la mayoría.
 * `LoadSkiaWeb` guarda su propia promesa compartida, así que llamarlo desde dos
 * pantallas a la vez descarga una sola vez.
 */
import { useEffect, useState } from 'react';
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { dondePideCanvasKit, FICHERO_DE_CANVASKIT } from './canvaskit';

/**
 * Dónde vive cada fichero que CanvasKit pida.
 *
 * `process.env.EXPO_BASE_URL` lo SUSTITUYE METRO por un literal al empaquetar, a
 * partir del `experiments.baseUrl` de `app.json`. Se lee así —la expresión entera,
 * sin guardarla antes en una variable— porque la sustitución es textual: con
 * `const env = process.env; env.EXPO_BASE_URL` no habría nada que sustituir y en
 * producción saldría `undefined`, o sea el fallo de arriba otra vez y esta vez sin
 * que nadie lo estuviera esperando.
 *
 * Y `__DEV__` entra porque la base vale para producción y NO para el servidor de
 * desarrollo, que sirve `public/` en la raíz aunque sustituya la variable igual.
 * La cuenta entera —con el porqué y las dos respuestas HTTP medidas— está en
 * `./canvaskit.ts`, que es donde `verify:canvaskit` puede ejecutarla.
 */
function donde(fichero: string): string {
  return dondePideCanvasKit(process.env.EXPO_BASE_URL, __DEV__, fichero);
}

/** ¿Se puede pintar ya? Falso hasta que el `.wasm` esté descargado y compilado. */
export function usarCanvasKit(): boolean {
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let vivo = true;
    LoadSkiaWeb({ locateFile: donde })
      .then(() => {
        if (vivo) setListo(true);
      })
      .catch((error: unknown) => {
        /*
         * Se deja dicho en la consola y NO se relanza. Un fallo aquí ya tiene su
         * pantalla —quien pinta enseña «cargando» para siempre— y relanzar dentro
         * de un efecto en web se convierte en un rechazo sin capturar que no
         * explica nada mejor. Lo que sí hace falta es que el mensaje nombre al
         * fichero y a la ruta: es lo único que distingue «no está» de «está donde
         * no lo pido», que son los dos fallos de este cargador y tienen el mismo
         * síntoma.
         */
        console.error(
          `No se ha podido cargar ${FICHERO_DE_CANVASKIT} desde «${donde(FICHERO_DE_CANVASKIT)}» ` +
            `(${__DEV__ ? 'desarrollo: Metro sirve `public/` en la RAÍZ' : 'producción: bajo la base de `app.json`'}). ` +
            'Si la dirección no es la que toca para este servidor, es el fallo del `locateFile`; ' +
            'si es la que toca, es que nadie ha corrido `npx setup-skia-web public`. Y si no ' +
            'aparece nada aquí y aun así no se pinta, mira la consola por un aborto de ' +
            'WebAssembly: Emscripten aborta FUERA de esta promesa y este `catch` no lo ve.',
          error,
        );
      });
    return () => {
      vivo = false;
    };
  }, []);

  return listo;
}
