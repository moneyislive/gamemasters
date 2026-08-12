/**
 * Punto de entrada del servidor GameMasters.
 *
 * Orden de arranque: cargar configuración (dotenv vía ./config), montar
 * express con sus routers bajo /api, inicializar el almacén y escuchar.
 */
import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { DEMO_MODE, env } from './config';
import authRouter, { passwordRequired, requireAuth, tallerAbiertoPara } from './auth';
import aterrizajeRouter from './enlaces/aterrizaje';
import wellKnownRouter from './enlaces/well-known';
import { getStorageKind, getStore, initStore } from './db/store';
import boardRouter from './routes/board';
import chatRouter from './routes/chat';
import configRouter from './routes/config';
import documentsRouter from './routes/documents';
import entitiesRouter from './routes/entities';
import gamesRouter from './routes/games';
import generateRouter from './routes/generate';
import cuentaRouter from './routes/cuenta';
import generacionRouter from './routes/generacion';
import jugarRouter from './routes/jugar';
import liveRouter from './routes/live';
import materialRouter from './routes/material';
import refreshRouter from './routes/refresh';
import uploadsRouter from './routes/uploads';
import duenoRouter from './taller/dueno';
import { costurasDePruebaActivas } from './identidad/oidc';
import { paginaDePrivacidad } from './legal/privacidad';
import { secretoDeFirma } from './secreto';

const app = express();

/*
 * Detrás de un proxy (Render, Fly, un Nginx doméstico) la conexión con el
 * navegador es HTTPS pero el último salto hasta aquí es HTTP en claro. Sin
 * esto, `req.secure` es falso, la cookie de sesión sale sin `secure`, y viaja
 * expuesta a cualquiera que comparta la wifi. El 1 es «me fío de UN proxy
 * delante», no de la cabecera que traiga cualquiera.
 */
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json({ limit: '25mb' }));

// Directorio de subidas (disco persistente en producción): se crea al arrancar
// y se sirve estático en /uploads, tras la contraseña si la hay.
const uploadsDir = env.uploadsDir;
fs.mkdirSync(uploadsDir, { recursive: true });
app.use(
  '/uploads',
  (req, res, next) => {
    // Las fotos de los invitados son parte del misterio, y además son personas
    // reales: no se sirven a extraños. Va por `tallerAbiertoPara` como el resto
    // de la puerta —no por la firma del pasaporte a secas—, porque un pasaporte
    // de cuenta lo tiene también quien juega desde la app.
    void tallerAbiertoPara(req)
      .then((abierto) => (abierto ? next() : res.status(401).end()))
      .catch(() => res.status(503).end());
  },
  express.static(uploadsDir, {
    setHeaders: (res, filePath) => {
      // La tabla mime de Express no conoce AVIF y lo sirve como octet-stream,
      // con lo que el navegador no lo pinta. Se corrige a mano.
      if (filePath.toLowerCase().endsWith('.avif')) {
        res.setHeader('Content-Type', 'image/avif');
      }
    },
  }),
  // Una foto que no está es un 404, y se acaba aquí. Sin esto la petición
  // seguía hasta el comodín del cliente y devolvía index.html con un 200: el
  // navegador se encontraba una página HTML donde esperaba un JPEG, la imagen
  // salía rota sin decir por qué, y en el registro no quedaba ni rastro del
  // fallo.
  (_req, res) => {
    res.status(404).end();
  },
);

/*
 * La política de privacidad, en abierto y por delante de todo.
 *
 * Detrás de la contraseña no serviría de nada: las dos tiendas exigen una
 * dirección pública, accesible SIN instalar la app —para que pueda leerla quien
 * se lo está pensando, y para que la revise quien revisa—, y Apple pide además
 * un enlace desde dentro de la aplicación (directriz 5.1.1(i)).
 */
app.get(['/privacidad', '/privacidad.html'], (_req, res) => {
  res.type('html').send(paginaDePrivacidad());
});

/*
 * Los ficheros de asociación de dominio de Apple y Google. Van AQUI, delante
 * del guardian de la contrasena y delante del comodin, porque las dos
 * plataformas los piden sin credenciales ninguna y porque el comodin les
 * devolveria el index.html del taller con un 200 alegre. Ver enlaces/well-known.
 */
app.use(wellKnownRouter);

/*
 * Donde cae quien pulsa un enlace de invitacion SIN la app instalada. Tambien
 * delante del guardian: quien recibe la invitacion no conoce la contrasena de
 * la casa, y sin esto el enlace acaba en la portada del taller.
 */
app.use(aterrizajeRouter);

/**
 * Señal de vida, para quien vigila el servicio.
 *
 * Existe porque `render.yaml` apuntaba su comprobación de salud a
 * `/api/config`, que está DETRÁS del guardián de la contraseña. En producción
 * —donde `APP_PASSWORD` es obligatoria— eso responde 401, así que Render daba
 * el servicio por caído y lo reiniciaba en bucle: el despliegue nunca llegaba a
 * estar sano, y no porque el servidor fallara.
 *
 * Dice lo justo. Ni la versión, ni el modo de almacenamiento, ni si hay
 * contraseña: una sonda pública no tiene por qué contarle a nadie de fuera cómo
 * está montada la casa.
 */
app.get('/api/salud', (_req, res) => {
  res.json({ ok: true });
});

// La app del jugador va ANTES del guardián: quien juega no conoce la contraseña
// de la casa. Su credencial es el testigo firmado que recibe al emparejar el
// móvil, y cada ruta lo verifica por su cuenta.
app.use('/api', jugarRouter);
// La cuenta va con ellos: quien juega no conoce la contraseña de la casa.
app.use('/api', cuentaRouter);
// El estudio de generación: su puerta la pone él (cualquier identidad + tope).
app.use('/api', generacionRouter);

// Acceso: el router de autenticación va primero y el guardián protege el resto.
app.use('/api', authRouter);
app.use('/api', requireAuth);

/*
 * De quién es cada partida. Va JUSTO detrás del guardián de acceso y DELANTE de
 * todos los routers que tocan una partida: si se moviera detrás, cada uno de
 * ellos tendría que comprobarlo por su cuenta, y ahí es donde se olvida.
 */
app.use('/api', duenoRouter);

// Routers de la API, todos bajo el prefijo /api.
app.use('/api', configRouter);
app.use('/api', gamesRouter);
app.use('/api', entitiesRouter);
app.use('/api', uploadsRouter);
app.use('/api', chatRouter);
app.use('/api', boardRouter);
app.use('/api', generateRouter);
app.use('/api', refreshRouter);
app.use('/api', materialRouter);
app.use('/api', liveRouter);
app.use('/api', documentsRouter);

// 404 en JSON para rutas de API desconocidas.
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Ruta de API no encontrada.' });
});

/*
 * Cliente compilado (producción): un único servicio sirve la web y la API, de
 * modo que no hay CORS ni URLs que configurar. El comodín devuelve index.html
 * para que las rutas de react-router (/cluedo/:id) funcionen al entrar directo
 * o al recargar; sin esto darían 404.
 */
if (env.clientDir) {
  const clientDir = env.clientDir;
  app.use(express.static(clientDir, { index: false }));
  app.get('*', (req, res) => {
    /*
     * El comodin NO puede contestar por la API ni por los ficheros de
     * asociacion. Sin esto, una ruta mal escrita de /api/ o un fichero de
     * .well-known que falte devuelven el index.html del taller con estado 200:
     * quien llama cree que le han respondido y lo que recibe es una pagina web.
     * Apple y Google, en concreto, dan la verificacion por buena y luego no
     * funciona nada.
     */
    if (req.path.startsWith('/api/') || req.path.startsWith('/.well-known/')) {
      res.status(404).json({ error: 'No existe.' });
      return;
    }
    res.sendFile(path.join(clientDir, 'index.html'));
  });
}

// Middleware de error final: cualquier excepción no controlada → 500 en JSON.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[servidor] Error no controlado:', err);
  if (res.headersSent) {
    res.end();
    return;
  }
  res.status(500).json({ error: 'Error interno del servidor.' });
});

/**
 * Comprobaciones que se hacen ANTES de escuchar.
 *
 * Un servidor que se niega a arrancar se arregla en cinco minutos. Uno que
 * arranca inseguro no se arregla nunca, porque nadie se entera. Y aquí lo que
 * está en juego no es abstracto: sin contraseña, `requireAuth` deja pasar a
 * todo el mundo, de modo que cualquiera que alcance la dirección puede leer la
 * solución del caso en `/api/games/<id>`, descargar los dosieres y forzar el
 * desenlace para los doce invitados.
 */
function comprobarArranque(): void {
  // Falla aquí si falta el secreto de firma en producción.
  secretoDeFirma();

  /*
   * Las costuras de prueba de OIDC permiten apuntar la verificación de
   * identidad a un emisor y a unas claves cualesquiera. Es justo lo que hace
   * falta para probarlo sin cuentas de Google ni de Apple, y justo lo que
   * jamás puede estar activo en producción: con ellas, cualquiera que pueda
   * levantar un servidor de claves se fabrica la identidad de quien quiera.
   */
  if (process.env.NODE_ENV === 'production' && costurasDePruebaActivas()) {
    throw new Error(
      'Hay variables OIDC_ISS_* u OIDC_JWKS_* definidas y esto es producción. Sirven para PROBAR ' +
        'la verificación de identidad contra claves propias: con ellas activas, cualquiera se ' +
        'fabrica la identidad de quien quiera.\nQuítalas.',
    );
  }

  if (process.env.NODE_ENV === 'production' && !env.appPassword) {
    throw new Error(
      'Falta APP_PASSWORD y esto es producción. Sin ella el taller queda ABIERTO: cualquiera con ' +
        'la dirección lee la solución del caso, descarga los dosieres y puede cerrar la partida.\n' +
        'Defínela, o arranca sin NODE_ENV=production si de verdad quieres una instancia abierta.',
    );
  }

  if (process.env.NODE_ENV === 'production' && !env.publicOrigin) {
    throw new Error(
      'Falta PUBLIC_ORIGIN y esto es producción. Sin ella el servidor se cree lo que diga la ' +
        'cabecera Host, así que la dirección de vuelta que se le manda a Google la elige quien ' +
        'llama: si nginx no la reenvía llega «localhost:5174» y fallan TODOS los inicios de ' +
        'sesión a la vez, con un «redirect_uri_mismatch» que no dice de dónde viene.\n' +
        'Y de ella cuelga el flag «secure» de las cookies: sin origen, una sesión de noventa ' +
        'días puede acabar viajando en claro sin que nada falle a la vista.\n' +
        'Defínela con el dominio público, sin barra final. Ejemplo: https://harkania.com',
    );
  }
}

/**
 * Red de última instancia.
 *
 * Los routers ya encaminan hacia el middleware de error todo lo que escape de
 * un manejador (ver `rutas.ts`). Esto cubre lo que NO nace de una petición: un
 * temporizador, una promesa suelta en el hub de avisos, una llamada a la API de
 * Anthropic que rechaza después de haber respondido. Node 20 mata el proceso
 * ante un rechazo sin gestionar, y aquí eso significa dejar a doce personas con
 * el móvil colgado en mitad de la cena.
 *
 * Se registra el fallo y se sigue en pie. Es deliberado: un servidor de juego
 * degradado sirve para terminar la partida; uno muerto, no. Las excepciones no
 * capturadas sí se dejan pasar —ahí el proceso ya está en un estado del que no
 * se puede razonar— pero se anotan antes de caer, que es lo que faltaba para
 * poder averiguar qué pasó.
 */
process.on('unhandledRejection', (razon) => {
  console.error('[servidor] Promesa rechazada sin gestionar:', razon);
});
process.on('uncaughtException', (error) => {
  console.error('[servidor] Excepción no capturada — el proceso termina:', error);
  process.exit(1);
});

comprobarArranque();

await initStore();
const activeModel = await getStore().getConfigModel();

/*
 * En producción se escucha SOLO en el bucle local, y la razón es la línea
 * `app.set('trust proxy', 1)` de arriba: eso significa «me fío del primer
 * salto». Si el puerto fuera alcanzable desde fuera, quien llegara directo
 * SERÍA el primer salto, y podría dictar `X-Forwarded-Proto` y
 * `X-Forwarded-For` a voluntad — saltándose nginx entero y, con él, todo lo que
 * dependa del protocolo o de la IP de quien llama.
 *
 * Fuera de producción se abre, porque el portátil hace de servidor de los
 * móviles de la casa. Ver `readHost` en config.ts.
 */
app.listen(env.port, env.host, () => {
  const storageLabel =
    getStorageKind() === 'mongo'
      ? 'MongoDB Atlas (mongoose)'
      : 'fichero JSON (server/data/db.json)';
  const demoLabel = DEMO_MODE
    ? 'ACTIVO — sin ANTHROPIC_API_KEY, el agente responde con guion de demostración'
    : 'inactivo — API de Anthropic conectada';

  const title = 'GAMEMASTERS · Estudio de Misterios';
  const width = 50;
  const padLeft = Math.floor((width - title.length) / 2);
  const padRight = width - title.length - padLeft;

  console.log('');
  console.log(`  ╔${'═'.repeat(width)}╗`);
  console.log(`  ║${' '.repeat(padLeft)}${title}${' '.repeat(padRight)}║`);
  console.log(`  ╚${'═'.repeat(width)}╝`);
  console.log(`   » Escuchando en ....... http://localhost:${env.port}`);
  console.log(
    `   » Cliente ............. ${env.clientDir ? `servido desde ${env.clientDir}` : 'no compilado (en desarrollo lo sirve Vite en el 5173)'}`,
  );
  console.log(`   » Subidas ............. ${uploadsDir}`);
  console.log(
    `   » Acceso .............. ${passwordRequired() ? 'protegido con contraseña (APP_PASSWORD)' : 'ABIERTO — sin APP_PASSWORD configurada'}`,
  );
  console.log(`   » Almacenamiento ...... ${storageLabel}`);
  console.log(`   » Modelo activo ....... ${activeModel}`);
  console.log(`   » Modo demo ........... ${demoLabel}`);
  console.log('');
  console.log('   El telón se levanta. Que comience el misterio.');
  console.log('');
});
