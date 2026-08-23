/**
 * La app, jugable desde el navegador, en `/jugar`.
 *
 * POR QUÉ EXISTE. Apple no permite instalar aplicaciones fuera de su tienda, y
 * llegar a TestFlight exige la cuenta de desarrollador de pago y una revisión
 * que tarda. Así que quien tiene iPhone no puede instalar el APK — y en una
 * mesa de doce, la mitad tiene iPhone. Sin esto, media velada se queda fuera.
 *
 * ES LA MISMA APP, no una versión recortada. Se exporta con Expo para web desde
 * el mismo código: las mismas pantallas, el mismo agente, el mismo tablero. Lo
 * único que cambia por debajo es dónde se guarda la sesión —`localStorage` en
 * vez del almacén seguro del móvil— y eso ya estaba escrito.
 *
 * Y EN EL MISMO ORIGEN QUE LA API, que es lo que lo hace simple: nada de CORS,
 * nada de direcciones que configurar, y las cookies y las credenciales viajan
 * como en cualquier otra página del sitio. Por eso se exporta con
 * `experiments.baseUrl: '/jugar'`: sin eso, los recursos se pedirían a la raíz
 * —donde vive el taller— y el enrutador no reconocería ninguna ruta.
 *
 * VA DELANTE DEL GUARDIÁN. Quien juega no conoce la contraseña de la casa ni
 * tiene por qué: su credencial es el código de la partida o su cuenta.
 *
 * UNA COSA QUE AQUÍ SÍ FUNCIONA Y EN EL MÓVIL NO: las texturas de los avatares
 * 3D. Un navegador decodifica imágenes empotradas sin ayuda, así que en `/jugar`
 * los modelos de Tripo se ven con su textura pintada. Ver
 * `app/src/tres/texturas-nativas.ts` para por qué en el teléfono no.
 */
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { crearRouter } from '../rutas';

const router = crearRouter();

/**
 * Dónde quedó el empaquetado web de la app.
 *
 * Se busca en dos sitios porque el proceso arranca desde `server/` en local y
 * desde la raíz del repositorio en algunos despliegues; una ruta única fallaría
 * en uno de los dos y el fallo sería «la página no existe», que no dice nada.
 */
export function carpetaDeLaAppWeb(): string | undefined {
  /*
   * `APP_WEB_DIR` manda si esta puesta. Adivinar por rutas relativas funciona
   * mientras el proceso arranque desde donde se espera, y deja de funcionar en
   * cuanto alguien lo arranca desde otro sitio — con el sintoma mas inutil que
   * hay: «esa pagina no existe», sin decir que la buscaba en dos carpetas
   * concretas y no estaba en ninguna.
   */
  const puesta = process.env.APP_WEB_DIR?.trim();
  const candidatas = puesta
    ? [path.resolve(puesta)]
    : [path.resolve(process.cwd(), '../app/dist'), path.resolve(process.cwd(), 'app/dist')];
  return candidatas.find((ruta) => fs.existsSync(path.join(ruta, 'index.html')));
}

const carpeta = carpetaDeLaAppWeb();

if (carpeta) {
  /*
   * Los recursos primero y el comodín después, en este orden: si el comodín
   * fuera antes, devolvería el `index.html` también para el fichero de
   * JavaScript, y el navegador se encontraría HTML donde esperaba código —un
   * fallo que en la consola sale como «Unexpected token '<'» y que no menciona
   * ni las rutas ni el orden.
   */
  /*
   * `redirect: false` porque si no, `express.static` contesta a `/jugar` con un
   * 301 hacia `/jugar/` en vez de dejarlo pasar al comodín. Funciona igual en un
   * navegador, pero convierte la dirección que se le pasa a la gente en un
   * rebote — y con el enrutador de la app detrás, una barra de más o de menos
   * cambia qué pantalla cree que le toca abrir.
   */
  router.use('/jugar', express.static(carpeta, { index: false, redirect: false }));

  router.get(['/jugar', '/jugar/*'], (_req, res) => {
    res.sendFile(path.join(carpeta, 'index.html'));
  });
} else {
  /*
   * Sin empaquetado, se dice. Un 404 aquí se leería como «esa dirección no
   * existe» cuando lo que pasa es que falta un paso de la compilación.
   */
  router.get(['/jugar', '/jugar/*'], (_req, res) => {
    res.status(503).type('html').send(
      `<!doctype html><html lang="es"><head><meta charset="utf-8">
       <title>Todavía no</title></head><body style="background:#0b1710;color:#e8cf7f;
       font-family:Georgia,serif;display:grid;place-items:center;height:100vh;margin:0;
       text-align:center;padding:1.5rem">
       <div><h1>Todavía no se puede jugar aquí</h1>
       <p style="opacity:.8">La versión de navegador no está compilada en este servidor.</p>
       <p style="opacity:.5;font-size:.85rem">Para quien administra: falta
       <code>npm run build -w app</code> en el despliegue.</p></div>
       </body></html>`,
    );
  });
}

export default router;
