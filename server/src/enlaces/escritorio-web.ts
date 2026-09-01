/**
 * La Sala de Arcade para un PC, en `/sala`.
 *
 * POR QUÉ EXISTE Y NO BASTA CON `/jugar`. `/jugar` es la app de MÓVIL exportada
 * a web: las mismas pantallas, pensadas para un pulgar y para una pantalla
 * estrecha y alta. Abrirla en un monitor de veintisiete pulgadas funciona y se
 * nota lo que es. Para un PC hace falta otra cosa —ratón, teclado, ancho
 * aprovechado, direcciones que se pueden pegar en un chat— y esa otra cosa es
 * un cliente aparte, no la de móvil ensanchada.
 *
 * QUÉ SIRVE, EXACTAMENTE. El paquete `escritorio/`, que es React + Vite y que
 * habla con la MISMA API (`/api/arcade`) que la app. No reimplementa ningún
 * juego: las reglas viven en `shared/arcade` y la autoridad en `server/`, así
 * que este cliente pinta los dos muebles genéricos —`formulario` y `tablero`— a
 * partir de datos declarados y no sabe a qué se juega. Un arcade que entre por
 * `ARCADES_EXTERNOS` sale jugable aquí sin que nadie lo compile.
 *
 * VA DELANTE DEL GUARDIÁN, por lo mismo que `arcadeRouter`: un arcade no tiene
 * Game Master. Cuatro personas abren una mesa con un código de cinco letras y
 * juegan, sin taller, sin cuenta y sin contraseña de la casa.
 *
 * UN SOLO SERVICIO, como hoy. El taller en la raíz, la app en `/jugar`, la Sala
 * en `/sala` y la API en `/api`: mismo origen, así que no hay CORS, ni
 * direcciones que configurar, ni un segundo despliegue que mantener. Por eso el
 * empaquetado se hace con `base: '/sala/'` —ver `escritorio/vite.config.ts`—: sin
 * eso, sus recursos se pedirían a la raíz, donde contesta el comodín del taller
 * con un `index.html`, y el navegador se encontraría HTML donde esperaba
 * JavaScript.
 */
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { crearRouter } from '../rutas';

const router = crearRouter();

/**
 * Dónde quedó el empaquetado del escritorio.
 *
 * Se busca en dos sitios y con una variable que manda por encima de los dos, por
 * lo mismo que en `jugar-web.ts`: el proceso arranca desde `server/` en local y
 * desde la raíz del repositorio en algunos despliegues, y adivinar por rutas
 * relativas deja de funcionar en cuanto alguien lo arranca desde otro sitio —con
 * el síntoma más inútil que hay, «esa página no existe», sin decir dónde la
 * buscaba.
 */
export function carpetaDelEscritorio(): string | undefined {
  const puesta = process.env.ESCRITORIO_DIR?.trim();
  const candidatas = puesta
    ? [path.resolve(puesta)]
    : [
        path.resolve(process.cwd(), '../escritorio/dist'),
        path.resolve(process.cwd(), 'escritorio/dist'),
      ];
  return candidatas.find((ruta) => fs.existsSync(path.join(ruta, 'index.html')));
}

const carpeta = carpetaDelEscritorio();

if (carpeta) {
  /*
   * Los recursos primero y el comodín después. Al revés, el comodín devolvería
   * el `index.html` también para el fichero de JavaScript.
   *
   * `redirect: false` para que `express.static` no conteste a `/sala` con un 301
   * hacia `/sala/`: funciona igual en un navegador, pero convierte la dirección
   * que se le pasa a la gente en un rebote.
   */
  router.use('/sala', express.static(carpeta, { index: false, redirect: false }));

  /*
   * El comodín es lo que hace que `/sala/riberas?codigo=ABCDE` funcione al
   * entrar directo o al recargar. Esas direcciones son la mitad de lo que hace
   * de escritorio a este cliente —un código de mesa se pega en un chat— y sin
   * esta línea todas darían 404 en cuanto se recargara la página.
   */
  router.get(['/sala', '/sala/*'], (_req, res) => {
    res.sendFile(path.join(carpeta, 'index.html'));
  });
} else {
  /*
   * Sin empaquetado se DICE, y se dice qué falta. Un 404 aquí se leería como
   * «esa dirección no existe» cuando lo que pasa es que falta un paso de la
   * compilación, y quien administra buscaría el fallo en el enrutador.
   */
  router.get(['/sala', '/sala/*'], (_req, res) => {
    res.status(503).type('html').send(
      `<!doctype html><html lang="es"><head><meta charset="utf-8">
       <title>Todavía no</title></head><body style="background:#06110f;color:#5fd4c8;
       font-family:system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0;
       text-align:center;padding:1.5rem">
       <div><h1>La Sala de Arcade no está compilada en este servidor</h1>
       <p style="opacity:.8">El cliente de escritorio se sirve desde aquí, y no se ha empaquetado.</p>
       <p style="opacity:.5;font-size:.85rem">Para quien administra: falta
       <code>npm run build -w escritorio</code> en el despliegue, o
       <code>ESCRITORIO_DIR</code> apuntando a la carpeta ya compilada.</p></div>
       </body></html>`,
    );
  });
}

export default router;
