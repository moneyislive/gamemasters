import { defineConfig } from 'vite';
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

export default defineConfig({
  base: '/sala/',
  plugins: [react()],
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
      '/api': { target: SERVIDOR, changeOrigin: true },
    },
  },
});
