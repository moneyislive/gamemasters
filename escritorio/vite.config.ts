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
