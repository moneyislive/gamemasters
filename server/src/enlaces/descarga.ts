/**
 * La descarga del APK, mientras no haya tienda.
 *
 * PARA QUÉ. Publicar en Google Play es un ciclo de revisión de días por cada
 * cambio, y en la App Store hace falta además una cuenta de pago. Mientras se
 * prueba con gente de verdad, Android permite instalar desde fuera de la
 * tienda, así que basta con una dirección estable que siempre dé la última
 * versión: `harkania.com/descargar`.
 *
 * EL FICHERO NO SE SIRVE DESDE AQUÍ, Y ES DELIBERADO. Un APK son decenas de
 * megas. Meterlo en el repositorio lo dejaría en el historial de git para
 * siempre —cada versión, una copia— y servirlo desde el propio proceso gastaría
 * su ancho de banda y su memoria en algo que hacen mejor otros. Se aloja en
 * GitHub Releases, que es gratis, sirve el fichero con las cabeceras correctas
 * y da una dirección que no caduca; aquí solo vive la página que lleva a él.
 *
 * NI GOOGLE DRIVE NI SIMILARES, aunque parezcan más cómodos: el enlace de
 * compartir lleva a una vista previa y no al fichero, por encima de cierto
 * tamaño se interpone un aviso de antivirus, y sobre todo el fichero no sale
 * con `Content-Type: application/vnd.android.package-archive`, así que Android
 * lo guarda como un fichero cualquiera y no ofrece instalarlo. Se descarga bien
 * y luego no se puede abrir, que es la peor forma de fallar.
 *
 * SIN CONFIGURAR, NO HAY BOTÓN. Si falta `APK_URL`, la página lo dice. Es la
 * misma regla que el resto de la casa: un botón que no lleva a ningún sitio es
 * peor que no tenerlo, porque quien lo pulsa cree que el problema es suyo.
 */
import { crearRouter } from '../rutas';
import { escaparHtml } from './aterrizaje';

const router = crearRouter();

/** Dónde vive el fichero, y qué versión es. */
function apk(): { url?: string; version: string } {
  return {
    url: process.env.APK_URL?.trim() || undefined,
    version: process.env.APK_VERSION?.trim() || 'sin numerar',
  };
}

function pagina(cuerpo: string): string {
  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Instalar Harkania</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 1.5rem;
    background: radial-gradient(circle at 50% 0%, #14301f 0%, #0b1710 60%);
    color: #f0e6cd; font-family: Georgia, 'Times New Roman', serif; line-height: 1.6;
  }
  main { max-width: 28rem; width: 100%; }
  .sello { font-size: 2.4rem; line-height: 1; text-align: center; }
  h1 { font-size: 1.7rem; margin: .6rem 0 .3rem; color: #e8cf7f; text-align: center; }
  .version { text-align: center; font-size: .82rem; opacity: .55; margin: 0 0 1.6rem;
    font-variant-numeric: tabular-nums; letter-spacing: .06em; }
  p { margin: 0 0 1.1rem; opacity: .85; font-size: .96rem; }
  .btn {
    display: block; text-align: center; padding: .95rem 1rem; margin: 0 0 1.4rem;
    border-radius: 4px; background: #e8cf7f; color: #0b1710; border: 1px solid #e8cf7f;
    font: inherit; font-size: 1.05rem; font-weight: 700; text-decoration: none;
    letter-spacing: .03em;
  }
  h2 { font-size: 1rem; color: #e8cf7f; margin: 1.8rem 0 .6rem; letter-spacing: .05em; }
  ol { margin: 0 0 1.2rem; padding-left: 1.3rem; }
  li { margin-bottom: .5rem; opacity: .85; font-size: .93rem; }
  .nota { border-left: 2px solid rgba(232,207,127,.35); padding-left: .9rem;
    font-size: .88rem; font-style: italic; opacity: .75; }
  .filete { border: 0; height: 1px; margin: 1.8rem 0 1.1rem;
    background: linear-gradient(90deg, transparent, rgba(232,207,127,.3), transparent); }
  .menudo { font-size: .8rem; opacity: .6; text-align: center; }
  a.menudo, .nota a { color: inherit; }
</style>
</head><body><main>
${cuerpo}
<hr class="filete">
<p class="menudo"><a class="menudo" href="/privacidad">Cómo tratamos tus datos</a></p>
</main></body></html>`;
}

/**
 * La página de instalación.
 *
 * Va DELANTE del guardián de la contraseña, como las de invitación: quien va a
 * instalar la app es quien juega, y no conoce ni tiene por qué conocer la
 * contraseña de la casa.
 */
router.get(['/descargar', '/descargar.html'], (_req, res) => {
  const { url, version } = apk();

  if (!url) {
    res.status(503).type('html').send(
      pagina(
        `<div class="sello">📦</div>
         <h1>Todavía no hay descarga</h1>
         <p>Aún no se ha publicado ninguna versión instalable en este servidor.
            Pídele el archivo a quien organiza la velada, o entra con tu código
            desde el navegador.</p>
         <p class="nota">Para quien administra: se configura con la variable
            <code>APK_URL</code>, apuntando al archivo publicado en GitHub
            Releases.</p>`,
      ),
    );
    return;
  }

  res.type('html').send(
    pagina(
      `<div class="sello">🕯</div>
       <h1>Instalar Harkania</h1>
       <p class="version">Versión ${escaparHtml(version)} · Android</p>

       <a class="btn" href="${escaparHtml(url)}">Descargar la aplicación</a>

       <h2>Si Android se resiste</h2>
       <p>La aplicación todavía no está en Google Play, así que el teléfono pide
          permiso una vez antes de instalarla. Es normal y no hace falta cambiar
          nada más:</p>
       <ol>
         <li>Al abrir el archivo descargado, Android dirá que no permite
             instalar de esta procedencia. Toca <strong>Ajustes</strong>.</li>
         <li>Activa <strong>Permitir de esta fuente</strong> para tu navegador y
             vuelve atrás.</li>
         <li>Puede aparecer un aviso de <strong>Play Protect</strong>. Toca
             <strong>Instalar de todos modos</strong>.</li>
       </ol>

       <h2>¿iPhone?</h2>
       <p>Todavía no. Apple no permite instalar aplicaciones fuera de su tienda,
          así que en iPhone habrá que esperar a la publicación. Mientras tanto,
          puedes jugar desde el navegador con tu código de partida.</p>

       <p class="nota">Al no venir de la tienda, la aplicación no se actualiza
          sola: cuando haya una versión nueva, vuelve a esta página y descárgala
          otra vez.</p>`,
    ),
  );
});

export default router;
