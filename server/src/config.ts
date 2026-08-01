/**
 * Configuración global del servidor GameMasters.
 *
 * Carga las variables de entorno desde el `.env` de la RAÍZ del repositorio.
 * El proceso arranca con cwd = `server/` (script `npm run dev`), por lo que la
 * raíz se resuelve como `../.env`; si no existe, se recurre al `.env` local.
 */
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import type { ModelId, ModelOption } from '../../shared/types';

const rootEnvPath = path.resolve(process.cwd(), '../.env');
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}
// Fallback (y complemento): el .env local de server/. dotenv nunca
// sobreescribe variables ya definidas, así que esta llamada es inocua.
dotenv.config();

/** Catálogo de modelos disponibles para el agente maestro de ceremonias. */
export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'claude-fable-5',
    label: 'Fable 5 — máxima calidad narrativa',
    description:
      'El narrador supremo: tramas profundas, personajes memorables y giros elegantes. La elección para la velada definitiva.',
  },
  {
    id: 'claude-opus-5',
    label: 'Opus 5 — deducción magistral',
    description:
      'Potencia deductiva de primer nivel para misterios complejos, con muchos sospechosos y coartadas entrelazadas.',
  },
  {
    id: 'claude-sonnet-5',
    label: 'Sonnet 5 — equilibrio brillante',
    description:
      'Rapidez y calidad a partes iguales: perfecto para preparar partidas sin apenas esperas.',
  },
  {
    id: 'claude-haiku-4-5',
    label: 'Haiku 4.5 — ligero y veloz',
    description:
      'Respuestas casi instantáneas, ideal para pruebas rápidas y partidas improvisadas.',
  },
];

/** Comprueba en tiempo de ejecución que un valor es un ModelId conocido. */
export function isModelId(value: unknown): value is ModelId {
  return typeof value === 'string' && MODEL_OPTIONS.some((option) => option.id === value);
}

function readPort(): number {
  const raw = Number(process.env.PORT ?? '5174');
  return Number.isInteger(raw) && raw > 0 ? raw : 5174;
}

function readDefaultModel(): ModelId {
  // ANTHROPIC_MODEL es el nombre documentado en .env.example; DEFAULT_MODEL se
  // acepta como alias por comodidad.
  const raw = process.env.ANTHROPIC_MODEL ?? process.env.DEFAULT_MODEL;
  return isModelId(raw) ? raw : 'claude-fable-5';
}

/**
 * Directorio de las imágenes subidas.
 *
 * En local es `server/uploads`. En producción debe apuntar al disco PERSISTENTE
 * del proveedor (en Render, por ejemplo, `/var/data/uploads`), porque el sistema
 * de ficheros del contenedor se borra en cada despliegue.
 */
function readUploadsDir(): string {
  const raw = process.env.UPLOADS_DIR?.trim();
  return raw ? path.resolve(raw) : path.resolve(process.cwd(), 'uploads');
}

/**
 * Carpeta con el cliente ya compilado (`client/dist`). Si existe, el servidor
 * la sirve y la aplicación queda publicada en un único sitio, sin CORS.
 */
function readClientDir(): string | undefined {
  const raw = process.env.CLIENT_DIR?.trim();
  const candidatos = raw
    ? [path.resolve(raw)]
    : [
        path.resolve(process.cwd(), '../client/dist'), // ejecutando desde server/
        path.resolve(process.cwd(), 'client/dist'), // ejecutando desde la raíz
      ];
  return candidatos.find((ruta) => fs.existsSync(path.join(ruta, 'index.html')));
}

/** Variables de entorno ya normalizadas. */
export const env: {
  apiKey?: string;
  defaultModel: ModelId;
  port: number;
  mongoUri?: string;
  /** Base de datos a usar; si se omite, se deduce de la URI (ver db/store.ts). */
  mongoDbName?: string;
  /** Contraseña única de acceso. Sin ella, la aplicación queda abierta. */
  appPassword?: string;
  uploadsDir: string;
  clientDir?: string;
} = {
  apiKey: process.env.ANTHROPIC_API_KEY?.trim() || undefined,
  defaultModel: readDefaultModel(),
  port: readPort(),
  mongoUri: process.env.MONGODB_URI?.trim() || undefined,
  mongoDbName: process.env.MONGODB_DB?.trim() || undefined,
  appPassword: process.env.APP_PASSWORD?.trim() || undefined,
  uploadsDir: readUploadsDir(),
  clientDir: readClientDir(),
};

/** Sin clave de API se activa el modo demo: toda la experiencia sigue siendo navegable. */
export const DEMO_MODE: boolean = !env.apiKey;
