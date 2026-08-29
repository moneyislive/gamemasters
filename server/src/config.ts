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

/**
 * El origen público: cómo se llega a este servidor desde fuera.
 *
 * POR QUÉ ES CONFIGURACIÓN Y NO LA CABECERA `Host`. El servidor construye con
 * él la `redirect_uri` que se le manda a Google, y Google exige que coincida
 * carácter por carácter con la que está dada de alta. Sacarla de `Host` la deja
 * en manos de quien llama: si nginx no reenvía la cabecera llega
 * `localhost:5174` y **todos** los inicios de sesión del taller fallan con
 * `redirect_uri_mismatch`; y si alguien la falsifica, el enlace de vuelta apunta
 * a donde él diga.
 *
 * De aquí cuelga además el flag `secure` de las cookies. Atarlo a `req.secure`
 * a secas significa que, el día que nginx se despiste con `X-Forwarded-Proto`,
 * las tres cookies salen SIN `Secure` en un sitio HTTPS y **nada falla a la
 * vista**: se entra, se juega, y la sesión de noventa días viaja en claro. Con
 * el origen configurado, ese fallo silencioso no puede ocurrir.
 */
function readPublicOrigin(): string | undefined {
  const raw = process.env.PUBLIC_ORIGIN?.trim();
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    // Sin barra final y sin ruta: se concatena con rutas absolutas.
    return `${url.protocol}//${url.host}`;
  } catch {
    return undefined;
  }
}

/**
 * En qué interfaz escucha el proceso.
 *
 * EN PRODUCCIÓN, SOLO EL BUCLE LOCAL, y la razón es `app.set('trust proxy', 1)`:
 * eso significa «me fío del primer salto, sea quien sea». Si el puerto es
 * alcanzable desde fuera, quien llegue directo ES el primer salto, y puede
 * dictar `X-Forwarded-Proto` y `X-Forwarded-For` a voluntad — saltándose nginx
 * entero y, con él, todo lo que dependa del protocolo o de la IP.
 *
 * Fuera de producción se abre, porque el portátil hace de servidor de los
 * móviles de la casa y en esa wifi hay que ser alcanzable.
 */
function readHost(): string {
  const raw = process.env.HOST?.trim();
  if (raw) return raw;
  return process.env.NODE_ENV === 'production' ? '127.0.0.1' : '0.0.0.0';
}

/** Variables de entorno ya normalizadas. */
export const env: {
  apiKey?: string;
  defaultModel: ModelId;
  port: number;
  /** Dónde vive este servidor de cara al mundo, p. ej. `https://harkania.com`. */
  publicOrigin?: string;
  /** Interfaz de escucha. Ver `readHost`. */
  host: string;
  mongoUri?: string;
  /** Base de datos a usar; si se omite, se deduce de la URI (ver db/store.ts). */
  mongoDbName?: string;
  /** Contraseña única de acceso. Sin ella, la aplicación queda abierta. */
  appPassword?: string;
  /**
   * Quién hay delante del servidor, y por tanto de quién es la `X-Forwarded-For`.
   *
   * `loopback` (por defecto): solo se cree la cabecera si la conexión viene de
   * esta misma máquina, que es donde vive nginx en el despliegue de casa. Es el
   * valor seguro: en una velada real el portátil escucha en 0.0.0.0 y cualquier
   * móvil de la casa se conecta directo, así que su cabecera no vale nada.
   *
   * `plataforma`: hay un balanceador externo —Render— que reescribe la cabecera
   * en cada petición. Ahí el otro extremo del TCP es SIEMPRE el balanceador, así
   * que sin esto todo el mundo comparte dirección y el limitador se convierte en
   * un cerrojo global: ocho contraseñas mal tecleadas por cualquiera dejan fuera
   * a todos.
   *
   * Se declara a mano y no se adivina: las dos formas de equivocarse son malas y
   * en direcciones opuestas, y ninguna avisa.
   */
  proxyDeConfianza: 'loopback' | 'plataforma';
  uploadsDir: string;
  clientDir?: string;
} = {
  apiKey: process.env.ANTHROPIC_API_KEY?.trim() || undefined,
  defaultModel: readDefaultModel(),
  port: readPort(),
  publicOrigin: readPublicOrigin(),
  host: readHost(),
  mongoUri: process.env.MONGODB_URI?.trim() || undefined,
  mongoDbName: process.env.MONGODB_DB?.trim() || undefined,
  appPassword: process.env.APP_PASSWORD?.trim() || undefined,
  // Cualquier valor que no sea exactamente 'plataforma' cae en el seguro.
  proxyDeConfianza: process.env.PROXY_DE_CONFIANZA?.trim() === 'plataforma' ? 'plataforma' : 'loopback',
  uploadsDir: readUploadsDir(),
  clientDir: readClientDir(),
};

/** Sin clave de API se activa el modo demo: toda la experiencia sigue siendo navegable. */
export const DEMO_MODE: boolean = !env.apiKey;
