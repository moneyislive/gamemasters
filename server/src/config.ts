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
import { leerOrigenesPermitidos } from './puerta/origenes';

const rootEnvPath = path.resolve(process.cwd(), '../.env');
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}
// Fallback (y complemento): el .env local de server/. dotenv nunca
// sobreescribe variables ya definidas, así que esta llamada es inocua.
dotenv.config();

/**
 * Catálogo de modelos.
 *
 * El orden importa: el primero es el que se usa cuando nadie elige, y el taller
 * los enseña en este orden. Los que llevan `paraVeladas: false` se quedan para
 * poder leer partidas antiguas que los tienen guardados, pero no se ofrecen al
 * generar: el tope de calidad de una velada pagada no lo puede bajar un
 * desplegable.
 */
export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'claude-opus-5-5',
    label: 'Opus 5.5 — el de la casa',
    description:
      'Tramas bien atadas, coartadas que encajan y giros con intención, a un precio contenido. Es el que se usa si no eliges nada.',
    paraVeladas: true,
  },
  {
    id: 'claude-fable-5-1',
    label: 'Fable 5.1 — máxima calidad narrativa',
    description:
      'El narrador más fino: personajes más hondos y prosa más cuidada. Cuesta bastante más que el de la casa.',
    paraVeladas: true,
  },
  {
    id: 'claude-sonnet-5',
    label: 'Sonnet 5 — económico',
    description:
      'Más rápido y más barato. Tramas algo más sencillas: va bien con mesas pequeñas y pocas salas.',
    paraVeladas: true,
  },
  {
    id: 'claude-fable-5',
    label: 'Fable 5 (versión anterior)',
    description: 'Sustituido por Fable 5.1, al mismo precio. Se conserva para las partidas que lo tenían.',
    paraVeladas: false,
  },
  {
    id: 'claude-opus-5',
    label: 'Opus 5 (versión anterior)',
    description: 'Sustituido por Opus 5.5, que es mejor y más barato. Se conserva para las partidas que lo tenían.',
    paraVeladas: false,
  },
  {
    id: 'claude-haiku-4-5',
    label: 'Haiku 4.5 — solo pruebas',
    description: 'Casi instantáneo, pero no escribe tramas a la altura de una velada de pago.',
    paraVeladas: false,
  },
];

/** ¿Se puede escribir una velada con este modelo? */
export function esModeloDeVelada(value: unknown): value is ModelId {
  return MODEL_OPTIONS.some((option) => option.id === value && option.paraVeladas);
}

/** Comprueba en tiempo de ejecución que un valor es un ModelId conocido. */
export function isModelId(value: unknown): value is ModelId {
  return typeof value === 'string' && MODEL_OPTIONS.some((option) => option.id === value);
}

function readPort(): number {
  const raw = Number(process.env.PORT ?? '5174');
  return Number.isInteger(raw) && raw > 0 ? raw : 5174;
}

/**
 * El tope es un número redondo y su única función es cazar un dedazo: nadie tiene diez
 * balanceadores en fila, así que un `SALTOS_DE_CONFIANZA=80` es un error de tecleo y no una
 * topología. Sin tope, ese dedazo hace fiable la cabecera entera y con ella a quien llama.
 */
export const TOPE_DE_SALTOS = 10;

/**
 * CUÁNTOS PROXIES HAY DELANTE, que no es lo mismo que si hay alguno.
 *
 * ═══ POR QUÉ ES UN NÚMERO Y NO UN BOOLEANO ═══
 *
 * `PROXY_DE_CONFIANZA` dice SI hay que fiarse de la cabecera; esto dice DE CUÁNTOS. Express
 * necesita el número para saber dónde acaba la parte de `X-Forwarded-For` que escribió la
 * infraestructura y dónde empieza la que escribió quien llama, y se equivoca en las dos
 * direcciones con consecuencias opuestas:
 *
 *   · CORTO: Express tira al cliente de `req.ips` y lo que queda es el balanceador, igual
 *     para todo el mundo. El limitador mete a la casa entera en un cubo y los jugadores se
 *     bloquean entre ellos. **Es lo que pasa hoy**: el número estaba escrito a mano como 1 en
 *     `index.ts` y producción tiene DOS saltos (Cloudflare por delante de Render, medido en
 *     las cabeceras: `Server: cloudflare` + `x-render-origin-server: Render`).
 *   · LARGO: quien llama puede ANTEPONER una entrada inventada a `X-Forwarded-For` y que sea
 *     ésa la que se cuente. Rotándola no acumula fallos nunca; fijándola en la de otra
 *     persona, la deja fuera. Eso es peor: convierte la defensa en un arma, que es justo lo
 *     que `limitador.ts` cuenta que ya pasó una vez.
 *
 * Ninguno de los dos lados es «el seguro», así que no se adivina: se declara, y si lo que se
 * declara no es un entero se para el arranque. Un `SALTOS_DE_CONFIANZA=dos` convertido con
 * `Number` da `NaN`, y `app.set('trust proxy', NaN)` deja `req.ips` VACÍO y el limitador DEJA
 * DE BLOQUEAR en toda la casa, en silencio. Medido. Por eso lanza en vez de caer a un valor.
 *
 * El valor por defecto es 1 —lo que había escrito a mano— para que un despliegue de casa sin
 * la variable siga comportándose exactamente igual que antes de este cambio.
 */
export function leerSaltosDeConfianza(
  crudo: string | undefined,
  modo: 'loopback' | 'plataforma' = 'plataforma',
): number {
  const texto = crudo?.trim() ?? '';
  if (texto.length === 0) return 1;
  const n = Number(texto);
  if (!Number.isInteger(n) || n < 1 || n > TOPE_DE_SALTOS) {
    throw new Error(
      `\`SALTOS_DE_CONFIANZA\` vale «${texto}» y tiene que ser un entero entre 1 y ` +
        `${String(TOPE_DE_SALTOS)}: es cuántos proxies hay delante de este servidor. Con un ` +
        'valor que no sea un número, Express deja `req.ips` vacío y el limitador deja de ' +
        'bloquear sin decir nada.',
    );
  }
  /*
   * ═══ Y LAS DOS VARIABLES TIENEN QUE DECIR LO MISMO ═══
   *
   * `loopback` es el despliegue de casa: el portátil de una velada, con un nginx suyo delante
   * como mucho. Ese nginx usa `$proxy_add_x_forwarded_for`, que AÑADE la dirección de quien
   * llama a lo que quien llama haya mandado. Con un salto, Express tira lo que mandó el móvil
   * y se queda con lo que puso el nginx: correcto. Con DOS, se cree también la entrada que
   * escribió el móvil — y entonces cualquiera rota la cabecera para no acumular fallos nunca,
   * o la fija en la de otra persona para dejarla fuera. El propio `limitador.ts` cuenta que
   * eso ya pasó una vez y lo llama «convertir una defensa en un arma».
   *
   * Las dos variables se aceptaban por separado y nadie las cruzaba. Se cruzan aquí, que es
   * donde se leen, y no en una guarda de arranque: así también lo ven los comprobadores y
   * cualquiera que las lea sin levantar un servidor.
   */
  if (modo === 'loopback' && n > 1) {
    throw new Error(
      `\`SALTOS_DE_CONFIANZA\` vale ${String(n)} pero \`PROXY_DE_CONFIANZA\` no es ` +
        '`plataforma`, o sea que éste es el despliegue de casa: delante hay un nginx propio ' +
        'como mucho. Con más de un salto, el servidor se cree la parte de la cabecera que ' +
        'escribió quien llama, y entonces cualquiera puede elegir con qué dirección se le ' +
        'cuenta: rotarla para no acumular fallos nunca, o fijar la de otra persona para ' +
        'dejarla fuera. Si de verdad hay un balanceador externo delante, lo que falta es ' +
        '`PROXY_DE_CONFIANZA=plataforma`.',
    );
  }
  return n;
}

function readDefaultModel(): ModelId {
  // ANTHROPIC_MODEL es el nombre documentado en .env.example; DEFAULT_MODEL se
  // acepta como alias por comodidad.
  const raw = process.env.ANTHROPIC_MODEL ?? process.env.DEFAULT_MODEL;
  return esModeloDeVelada(raw) ? raw : 'claude-opus-5-5';
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
  /**
   * QUE JUEGOS INSTALA ESTE SERVIDOR. Vacio o ausente: todos los que trae.
   *
   * Es lo que permite que el mismo binario sirva a paises distintos con
   * repartos distintos —aqui la Momia, alli las Sombras— sin compilar uno por
   * pais. Se lee una vez al arrancar; no es una perilla que se toque en marcha,
   * porque quitar un juego con partidas abiertas dejaria a doce personas a
   * media velada con un error en el movil.
   */
  juegos?: string[];
  /**
   * JUEGOS QUE NO VIENEN DENTRO DEL BINARIO.
   *
   * Acepta lo que acepte `import()`: el nombre de un paquete de `node_modules`
   * o una ruta de fichero. Es lo que permite añadir un juego a un servidor sin
   * tocar este repositorio, compilar y desplegar en todas partes.
   */
  juegosDeFuera?: string[];
  /**
   * `ARCADES_EXTERNOS=@harkania/arcade-tal,/opt/arcades/otro.mjs`.
   *
   * Los arcades que NO vienen dentro del binario. Es el gemelo de
   * `juegosDeFuera`, con su propia variable y no compartiendo la de veladas por
   * lo mismo que los dos registros no comparten símbolo: son dos familias y un
   * servidor puede querer instalar arcades de terceros sin abrir la puerta a
   * veladas de terceros, o al revés. Ver `server/src/arcade/enchufe.ts`, que
   * advierte por escrito de que esto NO aísla.
   */
  arcadesDeFuera?: string[];
  defaultModel: ModelId;
  port: number;
  /** Dónde vive este servidor de cara al mundo, p. ej. `https://harkania.com`. */
  publicOrigin?: string;
  /**
   * `ORIGENES_PERMITIDOS`: páginas de OTRO origen a las que se deja leer la API, además de las
   * propias. OPCIONAL: vacía es lo normal, porque todo lo de la casa se sirve desde el mismo
   * origen que la API. Ver `puerta/origenes.ts`, que la lee y dice por qué para el arranque con
   * una entrada que no se entiende.
   */
  origenesPermitidos: string[];
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
  /**
   * CUÁNTOS hay delante, que es la otra mitad de la pregunta. Ver `leerSaltosDeConfianza`:
   * `proxyDeConfianza` dice si la cabecera vale, y esto dice hasta dónde vale.
   */
  saltosDeConfianza: number;
  uploadsDir: string;
  clientDir?: string;
} = {
  apiKey: process.env.ANTHROPIC_API_KEY?.trim() || undefined,
  /*
   * `JUEGOS=momia,sombras`. Vacio o ausente: todos los que trae el binario.
   *
   * Se filtran los huecos para que `JUEGOS=` o `JUEGOS=,,` no signifiquen «un
   * juego que se llama cadena vacia» y dejen el servidor sin ninguno.
   */
  juegos: (process.env.JUEGOS ?? '')
    .split(',')
    .map((j) => j.trim())
    .filter(Boolean)
    .length
    ? (process.env.JUEGOS ?? '').split(',').map((j) => j.trim()).filter(Boolean)
    : undefined,
  /* Mismo trato que `JUEGOS_EXTERNOS`, y con la misma limpieza de huecos. */
  arcadesDeFuera: (process.env.ARCADES_EXTERNOS ?? '')
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean),
  juegosDeFuera: (process.env.JUEGOS_EXTERNOS ?? '')
    .split(',')
    .map((j) => j.trim())
    .filter(Boolean),
  defaultModel: readDefaultModel(),
  port: readPort(),
  publicOrigin: readPublicOrigin(),
  origenesPermitidos: leerOrigenesPermitidos(process.env.ORIGENES_PERMITIDOS),
  host: readHost(),
  mongoUri: process.env.MONGODB_URI?.trim() || undefined,
  mongoDbName: process.env.MONGODB_DB?.trim() || undefined,
  appPassword: process.env.APP_PASSWORD?.trim() || undefined,
  // Cualquier valor que no sea exactamente 'plataforma' cae en el seguro.
  proxyDeConfianza: process.env.PROXY_DE_CONFIANZA?.trim() === 'plataforma' ? 'plataforma' : 'loopback',
  saltosDeConfianza: leerSaltosDeConfianza(
    process.env.SALTOS_DE_CONFIANZA,
    process.env.PROXY_DE_CONFIANZA?.trim() === 'plataforma' ? 'plataforma' : 'loopback',
  ),
  uploadsDir: readUploadsDir(),
  clientDir: readClientDir(),
};

/** Sin clave de API se activa el modo demo: toda la experiencia sigue siendo navegable. */
export const DEMO_MODE: boolean = !env.apiKey;
