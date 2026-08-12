/**
 * Los ficheros que Apple y Google piden en la raíz del dominio.
 *
 * QUÉ SON. Para que `https://harkania.com/i/…` abra la aplicación en vez del
 * navegador, las dos plataformas exigen que el dominio declare, en un fichero
 * público y firmado por el propio dominio, qué aplicación puede reclamar qué
 * rutas. Apple lo llama *Universal Links* y lee `apple-app-site-association`;
 * Google lo llama *App Links* y lee `assetlinks.json`.
 *
 * POR QUÉ SON RUTAS DE EXPRESS Y NO FICHEROS ESTÁTICOS. Dos razones, y las dos
 * se descubrieron mirando cómo estaba montado el servidor:
 *
 *   · El comodín que sirve el taller (`index.ts`) atrapa cualquier ruta que no
 *     reconozca y devuelve el `index.html`. Un fichero que faltase no daría 404:
 *     daría una página HTML **con estado 200**, y Apple, Google y certbot verían
 *     algo perfectamente válido que no es lo que pidieron. La verificación
 *     fallaría sin dejar el menor rastro.
 *   · El fichero de Apple NO TIENE EXTENSIÓN. `express.static` deduce el tipo
 *     del nombre, así que lo serviría sin `Content-Type`, y Apple lo descarta.
 *     Es el peor fallo posible: el fichero correcto, rechazado en silencio.
 *
 * SIN CONFIGURAR, NO SE INVENTAN. Si falta `APPLE_TEAM_ID` o
 * `ANDROID_CERT_SHA256`, la ruta responde 404 en vez de servir un documento con
 * un hueco dentro. Un fichero de asociación mal formado es peor que ninguno:
 * las plataformas lo cachean, y con él la app queda desvinculada del dominio
 * durante días.
 */
import fs from 'node:fs';
import path from 'node:path';
import { crearRouter } from '../rutas';

const router = crearRouter();

/** El identificador de la aplicación, el mismo en las dos tiendas. */
const BUNDLE = 'com.harkania.jugar';

/** Las rutas que abren la aplicación. Todo lo demás se queda en la web. */
export const RUTAS_DE_APP = ['/i/*', '/e/*'];

/** Dónde se dejan a mano los ficheros que da una plataforma ya hechos. */
function carpetaDeFicheros(): string {
  return path.resolve(process.cwd(), 'data', 'well-known');
}

/**
 * Apple: qué rutas de este dominio abren la aplicación.
 *
 * ESTÁ ESCRITO POR INCLUSIÓN, y es deliberado. La forma cómoda de escribirlo es
 * por exclusión —«todo el dominio menos `/api/*`»— y es una trampa: con eso iOS
 * reclama para la aplicación TAMBIÉN `/`, `/cluedo` y `/cluedo/<id>`, es decir,
 * el taller entero. Quien pulsara un enlace del taller en un iPhone con la app
 * instalada acabaría en una pantalla que no existe, y nadie relacionaría una
 * cosa con la otra.
 *
 * El orden importa: los `exclude` van antes, porque se evalúa de arriba abajo y
 * gana la primera regla que encaja.
 */
router.get('/.well-known/apple-app-site-association', (_req, res) => {
  const equipo = process.env.APPLE_TEAM_ID?.trim();
  if (!equipo) {
    res.status(404).json({ error: 'Sin APPLE_TEAM_ID configurado.' });
    return;
  }
  const appID = `${equipo}.${BUNDLE}`;
  res
    // A mano, porque el fichero no tiene extensión y sin esto sale sin tipo.
    .type('application/json')
    .json({
      applinks: {
        details: [
          {
            appIDs: [appID],
            components: [
              { '/': '/api/*', exclude: true, comment: 'la API se queda en el servidor' },
              { '/': '/privacidad', exclude: true, comment: 'los documentos legales se leen en la web' },
              ...RUTAS_DE_APP.map((ruta) => ({ '/': ruta })),
            ],
          },
        ],
      },
      // Permite que la app pida la contraseña guardada del dominio.
      webcredentials: { apps: [appID] },
    });
});

/**
 * Google: qué aplicación puede reclamar los enlaces de este dominio.
 *
 * La huella es la del certificado con el que se FIRMA EL BINARIO PUBLICADO, no
 * la del certificado de desarrollo. Con EAS, la firma la guarda Expo y la
 * huella se saca con `eas credentials`. Poner la de desarrollo hace que los
 * enlaces funcionen en el móvil de quien programa y en ningún otro, que es de
 * las cosas más difíciles de diagnosticar que hay.
 *
 * Se admite una lista separada por comas porque durante una rotación de clave
 * conviven dos huellas, y quedarse con una sola rompe a quien no ha actualizado.
 */
router.get('/.well-known/assetlinks.json', (_req, res) => {
  const huellas = (process.env.ANDROID_CERT_SHA256 ?? '')
    .split(',')
    .map((h) => h.trim().toUpperCase())
    .filter(Boolean);
  if (huellas.length === 0) {
    res.status(404).json({ error: 'Sin ANDROID_CERT_SHA256 configurado.' });
    return;
  }
  res.type('application/json').json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: BUNDLE,
        sha256_cert_fingerprints: huellas,
      },
    },
  ]);
});

/**
 * El fichero suelto que da Apple para demostrar que el dominio es tuyo.
 *
 * Hace falta para dar de alta «Entrar con Apple» en la web y en Android, que es
 * lo único que hoy no funciona fuera del iPhone. Se descarga del portal de
 * Apple y se deja en `server/data/well-known/`; no se puede generar aquí porque
 * su contenido lo firma Apple.
 */
router.get('/.well-known/apple-developer-domain-association.txt', (_req, res) => {
  const fichero = path.join(carpetaDeFicheros(), 'apple-developer-domain-association.txt');
  if (!fs.existsSync(fichero)) {
    res.status(404).type('text/plain').send('No hay fichero de verificación de Apple.');
    return;
  }
  res.type('text/plain').send(fs.readFileSync(fichero, 'utf8'));
});

export default router;
