import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * A qué servidor habla el taller en desarrollo.
 *
 * Por defecto, el de siempre. La variable existe para poder levantar una
 * segunda instancia contra un servidor aparte —una partida de muestra para
 * enseñar el producto, por ejemplo— sin tocar el que ya está en marcha con las
 * partidas de verdad.
 */
const SERVIDOR = process.env.GM_API_URL ?? 'http://localhost:5174';

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.GM_CLIENT_PORT ?? 5173),
    proxy: {
      '/api': {
        target: SERVIDOR,
        changeOrigin: true,
      },
      '/uploads': {
        target: SERVIDOR,
        changeOrigin: true,
      },
    },
  },
});
