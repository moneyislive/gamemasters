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
/** Dónde vive el fichero, y qué versión es. */
function apk(): { url?: string; version?: string } {
  const version = process.env.APK_VERSION?.trim() || undefined;
  const repo = process.env.APK_REPO?.trim() || 'moneyislive/gamemasters';
  const puesta = process.env.APK_URL?.trim() || undefined;

  /*
   * LA DIRECCIÓN SE DEDUCE DE LA VERSIÓN, y esto no es comodidad: es que
   * escribirlas por separado ya salió mal. Se publicó la 1.0.2 y en el panel
   * quedó la etiqueta vieja con el fichero nuevo —`v1.0.1/harkania-1.0.2.apk`—
   * que da 404. La página se veía perfecta, anunciaba «Versión 1.0.2», y el
   * botón no descargaba nada. Dos campos que tienen que concordar y que nadie
   * compara acaban discrepando siempre.
   *
   * Con una sola variable no hay nada que sincronizar: se pone la versión y la
   * dirección sale sola. `APK_URL` sigue existiendo para el caso en que el
   * fichero no esté en GitHub o no siga el patrón, y entonces manda ella — pero
   * es la excepción, no el camino.
   */
  if (puesta) return { url: puesta, version };
  if (!version) return { url: undefined, version };
  return {
    url: `https://github.com/${repo}/releases/download/v${version}/harkania-${version}.apk`,
    version,
  };
}

/**
 * Comprueba UNA VEZ, al arrancar, que la descarga anunciada existe de verdad.
 *
 * NO BLOQUEA NI TUMBA NADA: si GitHub no contesta, no es motivo para no
 * arrancar. Lo que hace es gritar en el registro, que es donde alguien mira
 * cuando algo va mal — y es exactamente el fallo que no se ve de otra forma,
 * porque la página se sirve igual de bien con un enlace muerto dentro.
 */
export function comprobarLaDescarga(): void {
  const { url, version } = apk();
  if (!url) return;
  void fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(8000) })
    .then((r) => {
      if (r.ok) {
        console.log(`[descarga] la versión ${version} está publicada y se puede descargar.`);
        return;
      }
      console.error(
        `[descarga] ATENCIÓN: /descargar anuncia la versión ${version} pero su enlace responde ` +
          `${r.status}. Nadie podrá instalar la app.
  ${url}
` +
          '  Revisa APK_VERSION —y que la release exista en GitHub con ese nombre de fichero.',
      );
    })
    .catch((e) => {
      console.warn(
        `[descarga] no se ha podido comprobar el enlace de la versión ${version}: ${String(e)}`,
      );
    });
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
       <p class="version">Versión ${escaparHtml(version ?? 'sin numerar')} · Android</p>

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
