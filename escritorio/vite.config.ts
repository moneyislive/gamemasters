import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * El cliente de escritorio de la Sala de Arcade.
 *
 * ═══ POR QUÉ `base: '/sala/'` Y NO LA RAÍZ ═══
 *
 * En la raíz vive el taller del Game Master, y en `/jugar` la app de móvil
 * exportada a web. Este es el tercer inquilino del mismo servicio, así que
 * necesita su propia acera. Sin `base`, los `<script src="/assets/…">` que
 * escribe Vite se pedirían a la raíz —donde contesta el comodín del taller con
 * su `index.html`— y el navegador se encontraría HTML donde esperaba
 * JavaScript. Ese fallo sale en la consola como «Unexpected token '<'» y no
 * menciona ni la ruta ni la causa: es exactamente el mismo pisotón que la
 * cabecera de `server/src/enlaces/jugar-web.ts` cuenta para `/jugar`.
 *
 * ═══ Y POR QUÉ EL PROXY DE `/api` EN DESARROLLO ═══
 *
 * En producción esto lo sirve el mismo Node que la API, así que el escritorio
 * habla con rutas relativas (`/api/arcade`) y no hay ni CORS ni dirección que
 * configurar. Para que en desarrollo valga el MISMO código —y no una rama de
 * «si estoy en dev, apunta a otro sitio», que es una rama que solo se prueba en
 * dev— el servidor de Vite reenvía `/api` al Node de al lado.
 */
const SERVIDOR = process.env.GM_API_URL ?? 'http://localhost:5174';

/**
 * ═══ EN DESARROLLO, `/sala/quiebro` ES LA SALA, COMO EN PRODUCCIÓN ═══
 *
 * La Sala enruta cada arcade por su id (`/sala/riberas`, `/sala/quiebro`), y desde El Quiebro hay
 * además un `quiebro.html` en esta carpeta: el documento suelto del juego. En producción no chocan:
 * `express.static` sólo sirve un fichero por su nombre EXACTO, así que `/sala/quiebro` cae al comodín
 * y contesta la Sala. Pero el servidor de desarrollo de Vite, cuando una ruta sin extensión tiene un
 * `.html` con ese nombre, sirve ESE `.html`: `/sala/quiebro` abría el documento suelto esperando a un
 * anfitrión que no llega nunca, y a la mesa del Quiebro no se podía llegar desde la Sala en desarrollo.
 * Medido abriéndolo: «Esperando a la mesa…» con la Sala en ninguna parte.
 *
 * Esto quita ESA traducción y sólo ésa: una ruta de un solo tramo, sin extensión, que tenga su `.html`
 * al lado se sirve con la Sala (`index.html`), que es lo que hace el servidor de verdad. Los bancos y el
 * documento se siguen abriendo por su nombre con `.html`, que es como se abren en todas partes; y en el
 * empaquetado no cambia nada, porque esto sólo se monta al servir (`apply: 'serve'`).
 */
function laSalaComoEnProduccion(): Plugin {
  return {
    name: 'la-sala-como-en-produccion',
    apply: 'serve',
    configureServer(servidor) {
      /* Registrado aquí y no devuelto: así corre ANTES que los intermediarios de Vite. */
      servidor.middlewares.use((peticion, _respuesta, siguiente) => {
        const url = peticion.url ?? '';
        const corte = url.indexOf('?');
        const ruta = corte < 0 ? url : url.slice(0, corte);
        const nombre = /^\/sala\/([A-Za-z0-9-]+)$/.exec(ruta)?.[1];
        if (
          (peticion.method === 'GET' || peticion.method === 'HEAD') &&
          nombre !== undefined &&
          existsSync(fileURLToPath(new URL(`./${nombre}.html`, import.meta.url)))
        ) {
          peticion.url = `/sala/${corte < 0 ? '' : url.slice(corte)}`;
        }
        siguiente();
      });
    },
  };
}

/**
 * ═══ `__ARBOL_DEL_QUIEBRO__`: DE QUÉ ÁRBOL SALE LO QUE SE SIRVE ═══
 *
 * Con varios worktrees del repositorio abiertos a la vez, cada uno con su Vite en su puerto, un comprobador que mide
 * en el navegador (`verify:quiebro-gl`) puede estar mirando el banco de OTRO árbol sin enterarse: verde por el
 * trabajo de otra rama. Por eso el banco escribe en el DOM la carpeta de la que sale, que es ésta: la raíz del
 * worktree donde está este fichero, con barras normales. El comprobador la compara con la suya.
 *
 * En desarrollo Vite la pone como global en cada página que sirve (`@vite/env`); en el empaquetado sólo se sustituye
 * donde se nombra (hoy, `src/quiebro/ciudad/banco-gl.tsx`, que no entra en él): la ruta de esta máquina no llega a lo
 * que se publica.
 */
const ARBOL_DEL_QUIEBRO = fileURLToPath(new URL('..', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, '');

/**
 * ═══ EL ARRANQUE DE `quiebro.html`: LOS ANFITRIONES FIJADOS Y EL PAQUETE CONTADO ═══
 *
 * El documento suelto lleva DENTRO un guion de arranque (ver su cabecera y `DONDE_ARRANCA` en
 * `src/quiebro/contrato.ts`) que dice `listo`, guarda la mesa en una cola y enseña la barra de carga antes
 * de que baje el juego. Este complemento le da dos cosas que sólo se saben al compilar:
 *
 *   · LOS ANFITRIONES FIJADOS, en el hueco `[/*ANFITRIONES_FIJADOS*\/]` del guion: los mismos que lee
 *     `documento.tsx` —`VITE_QUIEBRO_ANFITRIONES` y, al servir en desarrollo, la app web del 8131—. Del
 *     `.env` y de esta orden, nunca de un mensaje ni de la dirección.
 *   · EN EL EMPAQUETADO, EL PAQUETE CONTADO. Vite escribe la entrada como `<script type="module">` y sus
 *     trozos como `modulepreload`: el navegador los baja sin decir cuánto lleva, y en un teléfono con datos
 *     son 2,5 MB de pantalla negra. Aquí se quitan esas etiquetas y, al final del cuerpo, se llama a
 *     `quiebroArranque.bajar({entrada, trozos: [[dirección, bytes]…]})`, que los baja contando y luego
 *     carga la entrada (de la caché). Si el arranque no estuviera, esa misma llamada carga la entrada como
 *     antes: un guion roto no deja el documento sin juego. La hoja de estilo se queda donde la puso Vite.
 *
 * Sólo toca `quiebro.html`: la Sala (`index.html`) sale igual que siempre.
 */
function elArranqueDelQuiebro(): Plugin {
  let fijados: string[] = [];
  let base = '/';
  return {
    name: 'el-arranque-del-quiebro',
    configResolved(c) {
      base = c.base;
      const env = loadEnv(c.mode, c.envDir, 'VITE_');
      fijados = String(env.VITE_QUIEBRO_ANFITRIONES ?? process.env.VITE_QUIEBRO_ANFITRIONES ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => /^https?:\/\/[A-Za-z0-9.-]+(:\d{1,5})?$/.test(s));
      if (c.command === 'serve') fijados.push('http://localhost:8131');
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!/quiebro\.html$/.test(ctx.filename.replace(/\\/g, '/'))) return html;
        const hueco = '/*ANFITRIONES_FIJADOS*/';
        if (!html.includes(hueco)) throw new Error('quiebro.html: falta el hueco de los anfitriones fijados en el guion de arranque');
        let salida = html.replace(hueco, fijados.map((f) => JSON.stringify(f)).join(','));
        const paquete = ctx.bundle;
        if (paquete === undefined) return salida;
        const bytesDe = (url: string): number => {
          const nombre = url.startsWith(base) ? url.slice(base.length) : url.replace(/^\//, '');
          const pieza = paquete[nombre];
          if (pieza === undefined) throw new Error(`quiebro.html: el trozo ${url} no está en el paquete`);
          return Buffer.byteLength(pieza.type === 'chunk' ? pieza.code : typeof pieza.source === 'string' ? pieza.source : Buffer.from(pieza.source));
        };
        const entrada = /<script type="module" crossorigin src="([^"]+)"><\/script>\s*/.exec(salida);
        if (entrada === null) throw new Error('quiebro.html: no encuentro la entrada del paquete que escribe Vite');
        const direccionDeEntrada = entrada[1] as string;
        salida = salida.replace(entrada[0], '');
        const trozos: [string, number][] = [[direccionDeEntrada, bytesDe(direccionDeEntrada)]];
        salida = salida.replace(/<link rel="modulepreload" crossorigin href="([^"]+)">\s*/g, (_todo, url: string) => {
          trozos.push([url, bytesDe(url)]);
          return '';
        });
        const plan = JSON.stringify({ entrada: direccionDeEntrada, trozos });
        const llamada =
          `<script>(function(p){var a=window.quiebroArranque;if(a&&typeof a.bajar==='function'){a.bajar(p);return;}` +
          `var s=document.createElement('script');s.type='module';s.crossOrigin='anonymous';s.src=p.entrada;document.head.appendChild(s);})(${plan});</script>\n`;
        return salida.replace('</body>', `${llamada}  </body>`);
      },
    },
  };
}

export default defineConfig({
  base: '/sala/',
  plugins: [react(), laSalaComoEnProduccion(), elArranqueDelQuiebro()],
  define: { __ARBOL_DEL_QUIEBRO__: JSON.stringify(ARBOL_DEL_QUIEBRO) },
  /*
   * ═══ UNA SOLA COPIA DE R3F, DE `three` Y DE `react`, AUNQUE HAYA VARIAS EN EL DISCO ═══
   *
   * `escenas/` es un paquete del taller con su propio `node_modules`, y npm ha
   * dejado ahí una copia de `@react-three/fiber` distinta de la de `escritorio/`.
   * Vite resuelve cada `import` desde el fichero que importa, así que el
   * `useFrame` que escribe `escenas/delta.tsx` vendría de una copia y el `Canvas`
   * que monta este cliente de otra: dos contextos de React distintos, y el
   * `useFrame` de la escena no corre nunca — sin un error en ninguna consola.
   *
   * `dedupe` obliga a resolver estos paquetes desde la raíz de ESTE proyecto,
   * vengan de donde vengan. Sólo los que guardan estado global o comparan con
   * `instanceof`; el resto sigue el camino normal. La app hace lo mismo en su
   * `metro.config.js`, con otro mecanismo y por la misma razón.
   */
  resolve: {
    dedupe: ['react', 'react-dom', 'three', '@react-three/fiber', 'scheduler'],
  },
  /*
   * EL MOTOR 3D VA EN SU PROPIO TROZO. Desde que la Sala pinta el Muelle, `three`
   * y r3f entran en el empaquetado para TODOS los arcades, tengan muelle o no, y
   * el trozo principal pasaba de 200 kB a más de un mega. Separarlos no ahorra
   * bytes al que abre Riberas —los pide igual— pero deja al que abre La Ronda con
   * la Sala de siempre, y el navegador cachea el motor aparte de la Sala, que
   * cambia mucho más a menudo que él.
   */
  build: {
    rollupOptions: {
      /*
       * ═══ DOS PÁGINAS EN EL EMPAQUETADO: LA SALA Y EL DOCUMENTO SUELTO DEL QUIEBRO ═══
       *
       * Hasta El Quiebro el empaquetado tenía una sola entrada —`index.html`, la Sala— y los
       * `banco*.html` se quedaban fuera a propósito: son páginas para MIRAR en desarrollo, y en
       * producción no las pide nadie. `quiebro.html` no es un banco. Es la página que cargan el
       * WebView apaisado de la app y el `iframe` de `/jugar` (`docs/quiebro/ARQUITECTURA.md` §0.2):
       * el juego entero sin la Sala alrededor, que recibe la mesa por el puente de
       * `src/quiebro/contrato.ts`. Sin esta entrada el servidor sirve `/sala/quiebro.html` con el
       * comodín de la Sala —el `index.html`—, y el teléfono abriría la Sala de PC dentro del WebView
       * sin un solo error: la página carga, sólo que es otra.
       *
       * Con `input` escrito, Vite deja de deducir la entrada, así que `index.html` va aquí también:
       * es la mitad de «sin romper lo demás». Las dos comparten el trozo `tres` y los módulos que
       * tengan en común; cada una se lleva sólo lo que importa. Y las rutas son ABSOLUTAS, sacadas de
       * este fichero y no del directorio desde el que se lance la orden: `npm run build -w escritorio`
       * y `npx vite build` desde otra carpeta tienen que empaquetar lo mismo.
       *
       * Si `quiebro.html` faltara, el empaquetado FALLA diciendo qué entrada no encuentra. Es lo que
       * tiene que pasar: un despliegue sin el documento no es un despliegue más pequeño, es una app que
       * abre una página equivocada.
       */
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        quiebro: fileURLToPath(new URL('./quiebro.html', import.meta.url)),
      },
      output: {
        manualChunks: { tres: ['three', '@react-three/fiber'] },
      },
    },
  },
  server: {
    /*
     * 5173 es el taller y 5174 el servidor. Este pide el siguiente libre para
     * que las tres cosas puedan estar levantadas a la vez sin pelearse por un
     * puerto —que es lo normal mientras se trabaja en el escritorio: hace falta
     * el servidor de verdad detrás.
     */
    port: Number(process.env.GM_ESCRITORIO_PORT ?? 5175),
    proxy: {
      /*
       * `ws: true` porque el canal de Boots on Board es un WebSocket bajo `/api`
       * (`/api/arcade/mesas/:codigo/botas`): sin ello Vite contesta la subida de
       * protocolo él mismo y el canal no llega nunca al servidor, sólo en desarrollo.
       */
      '/api': { target: SERVIDOR, changeOrigin: true, ws: true },
    },
  },
});
