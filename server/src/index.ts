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
import authRouter, { isAuthenticated, passwordRequired, requireAuth } from './auth';
import { getStorageKind, getStore, initStore } from './db/store';
import boardRouter from './routes/board';
import chatRouter from './routes/chat';
import configRouter from './routes/config';
import documentsRouter from './routes/documents';
import entitiesRouter from './routes/entities';
import gamesRouter from './routes/games';
import generateRouter from './routes/generate';
import refreshRouter from './routes/refresh';
import uploadsRouter from './routes/uploads';

const app = express();

app.use(cors());
app.use(express.json({ limit: '25mb' }));

// Directorio de subidas (disco persistente en producción): se crea al arrancar
// y se sirve estático en /uploads, tras la contraseña si la hay.
const uploadsDir = env.uploadsDir;
fs.mkdirSync(uploadsDir, { recursive: true });
app.use(
  '/uploads',
  (req, res, next) => {
    // Las fotos de los invitados son parte del misterio: no se sirven a extraños.
    if (!passwordRequired() || isAuthenticated(req)) return next();
    res.status(401).end();
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
);

// Acceso: el router de autenticación va primero y el guardián protege el resto.
app.use('/api', authRouter);
app.use('/api', requireAuth);

// Routers de la API, todos bajo el prefijo /api.
app.use('/api', configRouter);
app.use('/api', gamesRouter);
app.use('/api', entitiesRouter);
app.use('/api', uploadsRouter);
app.use('/api', chatRouter);
app.use('/api', boardRouter);
app.use('/api', generateRouter);
app.use('/api', refreshRouter);
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
  app.get('*', (_req, res) => {
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

await initStore();
const activeModel = await getStore().getConfigModel();

app.listen(env.port, () => {
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
