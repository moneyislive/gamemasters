/**
 * El circuito de la invitación, de punta a punta.
 *
 *   npm run verify:enlaces
 *
 * QUÉ SE PRUEBA AQUÍ. Que una invitación sale por correo con un enlace que de
 * verdad lleva a alguna parte, que ese enlace sienta a quien tiene derecho a
 * sentarse, y —sobre todo— QUE NO SIENTA A NADIE MÁS. Esa última es la razón de
 * ser del fichero, porque es la que falla en silencio: un sobre que abriera la
 * partida por sí solo funcionaría perfectamente en todas las pruebas de la casa
 * y solo se notaría el día que alguien reenviase un correo.
 *
 * LO QUE NO SE PRUEBA, dicho para que no se confunda con lo que sí:
 *
 *   · Que Amazon acepte la firma. Eso solo se sabe hablando con Amazon. Lo que
 *     sí se comprueba es que la firma que sale cubre EXACTAMENTE el cuerpo que
 *     se manda, recomponiéndola aquí por separado desde la peticion recibida:
 *     el modo de fallo clásico de una firma escrita a mano es firmar una cosa y
 *     enviar otra, y AWS responde a eso con un 403 que no explica nada.
 *   · Que el correo llegue a una bandeja de entrada. Eso son SPF, DKIM y
 *     reputación de dominio, y no vive en este repositorio.
 *
 * AISLAMIENTO. Todo lo que arranca va en un proceso aparte, con cwd temporal y
 * entorno explícito y enumerado. Sin eso, `dotenv` cargaría el `.env` de la casa
 * y la prueba hablaría con el Atlas de PRODUCCIÓN y con la clave de Anthropic
 * de verdad. Por el mismo motivo, en ESTE proceso solo se importan módulos que
 * no tocan la configuración: `identidad/sobre` y `live/token`, que solo saben de
 * `secreto.ts`.
 */
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const TSX = path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SERVIDOR = path.join(REPO, 'server', 'src', 'index.ts');

const CONTRASENA = 'la-contrasena-de-la-casa';
const SECRETO = 'secreto-de-prueba-de-enlaces-0123456789abcdef';
const ORIGEN = 'https://harkania.example';
const TITULO = 'La velada del jueves';
/** El código personal de Ana. No puede aparecer JAMÁS en el correo. */
const CODIGO_PERSONAL = 'NOSALE';
/** Un trozo del misterio. Tampoco puede salir en un correo que se reenvía. */
const DEL_MISTERIO = 'Condesa de Arenal';

// Credenciales de mentira para firmar contra un SES de mentira.
const AWS_CLAVE = 'AKIAEJEMPLODEPRUEBA0';
const AWS_SECRETA = 'secreta-de-prueba-que-no-vale-para-nada-0000';
const AWS_REGION = 'eu-west-1';

/*
 * El secreto se fija ANTES de importar nada, porque `secreto.ts` lo lee al
 * cargarse. Con él, esta prueba puede fabricar sobres y credenciales legítimos
 * —incluida una atada a una apertura que ya no existe— en vez de limitarse a
 * comprobar que la basura se rechaza, que no prueba casi nada.
 */
process.env.PLAYER_TOKEN_SECRET = SECRETO;
const { cerrarSobre } = await import('../src/identidad/sobre');
const { emitirCredencial } = await import('../src/live/token');

let hechas = 0;
const fallos: string[] = [];
function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(
    `${que}${detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 300)}`}`,
  );
}
function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

// ---------------------------------------------------------------------------
// La velada de mentira
// ---------------------------------------------------------------------------

const ahora = new Date().toISOString();

const personaje = (participanteId: string, nombre: string) => ({
  participanteId,
  characterName: nombre,
  role: 'Invitado de la casa',
  publicPersona: 'Llegó tarde y sin abrigo.',
  secret: 'Debe dinero al anfitrión.',
  motive: 'Una deuda vieja.',
  alibi: 'Dice que estaba en el jardín.',
  knowledge: ['Oyó una discusión.'],
  personalHook: 'Le encantan las novelas de misterio.',
});

const datos = {
  games: [
    {
      id: 'velada',
      name: TITULO,
      status: 'ready',
      createdAt: ahora,
      updatedAt: ahora,
      suspects: [
        { id: 's0', name: 'Ana', email: 'ana@ejemplo.com' },
        { id: 's1', name: 'Bruno', email: 'bruno@ejemplo.com' },
        { id: 's2', name: 'Quien no dejó correo' },
      ],
      rooms: [{ id: 'r0', name: 'Salón' }],
      weapons: [{ id: 'w0', name: 'Candelabro' }],
      boardMode: 'generated',
      settings: { language: 'es' },
      plot: {
        title: TITULO,
        tagline: 'Nadie se va hasta que se sepa.',
        synopsis: 'Se apagaron las luces y, al volver, el anfitrión no respiraba.',
        victim: { name: 'El anfitrión', description: 'Cayó junto a la chimenea.' },
        setting: 'Una casa de campo, otoño de 1927.',
        solution: {
          respuestas: { culpable: 's1', objeto: 'w0', lugar: 'r0' },
          motive: 'Una deuda vieja.',
          howItHappened: 'A oscuras, en el salón.',
        },
        characters: [
          personaje('s0', DEL_MISTERIO),
          personaje('s1', 'Doctor Vela'),
          personaje('s2', 'La sobrina'),
        ],
        timeline: [
          { time: '21:00', description: 'Se sirve la cena.', participanteIds: ['s0', 's1'], isPublic: true },
        ],
        clues: [{ id: 'c1', lugarId: 'r0', description: 'Una copa rota.', pointsTo: 's1', round: 1 }],
        gmScript: ['Acto I: la cena.'],
      },
    },
  ],
  messages: {},
  config: { model: 'claude-fable-5' },
  live: [
    {
      id: 'velada',
      sid: 'apertura-de-hoy',
      code: 'TEJAD',
      phase: 'lobby',
      round: 0,
      totalRounds: 3,
      players: [
        {
          participanteId: 's0',
          displayName: 'Ana',
          email: 'ana@ejemplo.com',
          joinCode: CODIGO_PERSONAL,
          joined: false,
          elecciones: [],
          notas: '',
          girosRecibidos: [],
        },
        {
          participanteId: 's1',
          displayName: 'Bruno',
          email: 'bruno@ejemplo.com',
          joinCode: 'BRUNO1',
          joined: false,
          elecciones: [],
          notas: '',
          girosRecibidos: [],
        },
        {
          participanteId: 's2',
          displayName: 'Quien no dejó correo',
          joinCode: 'SINCOR',
          joined: false,
          elecciones: [],
          notas: '',
          girosRecibidos: [],
        },
      ],
      respuestasEntregadas: [],
      porDondePasaron: [],
      rev: 1,
      updatedAt: ahora,
    },
  ],
  accounts: [
    {
      id: 'cta-ana',
      email: 'ana@ejemplo.com',
      displayName: 'Ana',
      createdAt: ahora,
      partidas: [],
      trofeos: [],
      // Buzón demostrado por un proveedor: es lo único que abre la puerta sin
      // código, y aquí hace falta para poder comprobar que la abre de verdad.
      correos: [{ correo: 'ana@ejemplo.com', nivel: 'buzon', origen: 'google', anadidoEl: ahora }],
    },
    {
      id: 'cta-carla',
      email: 'carla@ejemplo.com',
      displayName: 'Carla',
      createdAt: ahora,
      partidas: [],
      trofeos: [],
      correos: [{ correo: 'carla@ejemplo.com', nivel: 'buzon', origen: 'google', anadidoEl: ahora }],
    },
  ],
};

function sembrar(dir: string): string {
  fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'data', 'db.json'), JSON.stringify(datos, null, 2), 'utf8');
  return dir;
}

// ---------------------------------------------------------------------------
// Arrancar cosas
// ---------------------------------------------------------------------------

const entornoBase = (dir: string): Record<string, string | undefined> => ({
  PATH: process.env.PATH,
  SystemRoot: process.env.SystemRoot,
  TEMP: process.env.TEMP,
  TMP: process.env.TMP,
  NODE_ENV: 'test',
  APP_PASSWORD: CONTRASENA,
  PLAYER_TOKEN_SECRET: SECRETO,
  CLIENT_DIR: path.join(dir, 'cliente'),
  UPLOADS_DIR: path.join(dir, 'uploads'),
});

/**
 * Un servidor mínimo que monta el router del correo EN SU SITIO.
 *
 * Existe porque `correo/router.ts` todavía no está montado en `index.ts` —lo
 * integra otra persona, y tocar ese fichero no me corresponde—. Así que la
 * prueba levanta la cadena de guardianes tal como se pide que se monte: la
 * puerta de la casa, después de quién es dueño de la partida, y detrás el
 * router. Lo que esto NO demuestra es que alguien lo haya montado de verdad; lo
 * que sí, que montado ahí hace lo que dice y que no deja pasar a quien no debe.
 *
 * Las importaciones van por ruta absoluta porque este fichero vive en una
 * carpeta temporal, fuera del repositorio, y desde allí no se resuelve ni
 * `express` ni nada.
 */
function fuenteDeLaApp(): string {
  const repo = JSON.stringify(REPO);
  return `import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO = ${repo};
const u = (rel) => pathToFileURL(path.join(REPO, ...rel.split('/'))).href;

const { default: express } = await import(u('node_modules/express/index.js'));
const { initStore } = await import(u('server/src/db/store.ts'));
const auth = await import(u('server/src/auth.ts'));
const { default: duenoRouter } = await import(u('server/src/taller/dueno.ts'));
const { default: correoRouter } = await import(u('server/src/correo/router.ts'));
const { enviosDeMemoria } = await import(u('server/src/correo/index.ts'));

await initStore();

const app = express();
app.use(express.json());
app.get('/listo', (_req, res) => res.json({ ok: true }));
// El array del transporte de memoria, tal cual, para poder mirar dentro del
// sobre cerrado. Va fuera de /api a propósito: no es una ruta del producto.
app.get('/enviados', (_req, res) => res.json(enviosDeMemoria()));
app.use('/api', auth.default);
app.use('/api', auth.requireAuth);
app.use('/api', duenoRouter);
app.use('/api', correoRouter);
app.listen(Number(process.env.PUERTO_APP), '127.0.0.1', () => console.log('en pie'));
`;
}

interface Arrancada {
  proceso: ChildProcess;
  salida: () => string;
}

function arrancar(
  guion: string,
  dir: string,
  entorno: Record<string, string | undefined>,
): Arrancada {
  const proceso = spawn(process.execPath, [TSX, guion], {
    cwd: dir,
    env: entorno,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let texto = '';
  proceso.stdout?.on('data', (t) => {
    texto += String(t);
  });
  proceso.stderr?.on('data', (t) => {
    texto += String(t);
  });
  return { proceso, salida: () => texto };
}

type Respuesta = { estado: number; cuerpo: string; cabeceras: Headers; json: unknown };

async function pedir(puerto: number, ruta: string, init?: RequestInit): Promise<Respuesta> {
  const r = await fetch(`http://127.0.0.1:${puerto}${ruta}`, { redirect: 'manual', ...init });
  const cuerpo = await r.text();
  let json: unknown = null;
  try {
    json = JSON.parse(cuerpo);
  } catch {
    /* no todas las respuestas son JSON: la página de aterrizaje es HTML */
  }
  return { estado: r.status, cuerpo, cabeceras: r.headers, json };
}

async function esperar(puerto: number, ruta: string, quien: string): Promise<void> {
  for (let intento = 0; intento < 100; intento++) {
    try {
      await fetch(`http://127.0.0.1:${puerto}${ruta}`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  throw new Error(`${quien} no llegó a responder en el puerto ${puerto}`);
}

/** Entra por la puerta de la casa y devuelve la cookie para las siguientes. */
async function entrarEnElTaller(puerto: number): Promise<string> {
  const r = await pedir(puerto, '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: CONTRASENA }),
  });
  const galleta = r.cabeceras.get('set-cookie') ?? '';
  return galleta.split(';')[0] ?? '';
}

const PUERTO_REAL = 5941;
const PUERTO_MEMORIA = 5942;
const PUERTO_SIN_ORIGEN = 5943;
const PUERTO_SES = 5944;
const PUERTO_MODO_MALO = 5945;
const PUERTO_CAPTURA = 5946;

const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'gm-enlaces-'));
const vivos: ChildProcess[] = [];
let captura: http.Server | undefined;

try {
  // -------------------------------------------------------------------------
  paso('El correo se compone con el enlace bueno, y sin la llave dentro');
  // -------------------------------------------------------------------------
  const dirCorreo = sembrar(path.join(raiz, 'correo'));
  const guion = path.join(dirCorreo, 'app-correo.mts');
  fs.writeFileSync(guion, fuenteDeLaApp(), 'utf8');

  const appMemoria = arrancar(guion, dirCorreo, {
    ...entornoBase(dirCorreo),
    PUERTO_APP: String(PUERTO_MEMORIA),
    PUBLIC_ORIGIN: ORIGEN,
  });
  vivos.push(appMemoria.proceso);
  await esperar(PUERTO_MEMORIA, '/listo', 'la app del correo').catch((e) => {
    throw new Error(`${String(e)}\n${appMemoria.salida().slice(0, 800)}`);
  });

  const cookie = await entrarEnElTaller(PUERTO_MEMORIA);
  comprobar('se entra al taller con la contraseña de la casa', cookie.startsWith('gm_sesion='), cookie);

  const sinCredenciales = await pedir(PUERTO_MEMORIA, '/api/games/velada/invitaciones', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  /*
   * Mandar correo a personas reales no puede estar al alcance de cualquiera que
   * dé con la dirección del servidor: sería un cañón de correo con el dominio
   * de la casa como remitente, que es como se pierde la reputación de un
   * dominio en una tarde.
   */
  comprobar('sin credenciales no se manda nada', sinCredenciales.estado === 401, sinCredenciales.estado);

  const conCabecera = { 'Content-Type': 'application/json', Cookie: cookie };
  const envio = await pedir(PUERTO_MEMORIA, '/api/games/velada/invitaciones', {
    method: 'POST',
    headers: conCabecera,
    body: '{}',
  });
  comprobar('con la contraseña, se manda', envio.estado === 200, envio);

  const resultado = envio.json as {
    modo?: string;
    enviadas?: Array<{ participanteId: string; para: string; enlace: string }>;
    sinCorreo?: Array<{ participanteId: string }>;
  } | null;
  comprobar('en el modo de memoria, que es el de por defecto', resultado?.modo === 'memoria', resultado?.modo);
  comprobar('a quienes tienen correo apuntado', resultado?.enviadas?.length === 2, resultado?.enviadas);
  comprobar(
    'y a quien no lo tiene se le dice, en vez de callarlo',
    resultado?.sinCorreo?.[0]?.participanteId === 's2',
    resultado?.sinCorreo,
  );

  const paraAna = resultado?.enviadas?.find((e) => e.para === 'ana@ejemplo.com');
  comprobar('el envío de Ana lleva su enlace', Boolean(paraAna?.enlace), paraAna);
  comprobar(
    'con el dominio público delante: un enlace relativo dentro de un correo no lleva a ninguna parte',
    paraAna?.enlace.startsWith(`${ORIGEN}/i/`) === true,
    paraAna?.enlace,
  );

  /*
   * El transporte de memoria guarda los envíos para que se pueda mirar dentro
   * del sobre. Es justo lo que hace falta aquí: el enlace se ve desde la
   * respuesta, pero lo que NO puede ir dentro del cuerpo del mensaje solo se
   * puede comprobar leyendo el cuerpo del mensaje.
   */
  const guardados = (await pedir(PUERTO_MEMORIA, '/enviados')).json as Array<{
    para: string;
    asunto: string;
    texto: string;
    html: string;
    enlace: string;
  }>;
  comprobar('el transporte de memoria guarda lo que manda', guardados.length === 2, guardados.length);

  const correoDeAna = guardados.find((g) => g.para === 'ana@ejemplo.com');
  const todoElCorreo = `${correoDeAna?.asunto ?? ''}\n${correoDeAna?.texto ?? ''}\n${correoDeAna?.html ?? ''}`;
  comprobar('el asunto nombra la velada', correoDeAna?.asunto.includes(TITULO) === true, correoDeAna?.asunto);
  comprobar('el cuerpo lleva el enlace, no solo el botón', correoDeAna?.texto.includes(paraAna?.enlace ?? 'x') === true, correoDeAna?.texto.slice(0, 300));
  comprobar(
    'y también en la versión HTML, que es la que se ve',
    correoDeAna?.html.includes(paraAna?.enlace ?? 'x') === true,
    correoDeAna?.html.slice(0, 200),
  );

  /*
   * LA COMPROBACIÓN QUE MÁS IMPORTA DE ESTA SECCIÓN. El código personal es el
   * único factor de acceso a una silla, y un correo se reenvía. Meterlo en el
   * mensaje —«así entra de un toque»— es la tentación evidente y convierte
   * cualquier reenvío en la llave de la silla de otra persona.
   */
  comprobar(
    'el CÓDIGO PERSONAL no viaja en el correo: un correo se reenvía',
    !todoElCorreo.includes(CODIGO_PERSONAL),
    'el código personal aparece en el mensaje',
  );
  comprobar(
    'ni el código de la partida',
    !todoElCorreo.includes('TEJAD'),
    'el código de la partida aparece en el mensaje',
  );
  comprobar(
    'ni nada del misterio: quien recibe el reenvío no juega',
    !todoElCorreo.includes(DEL_MISTERIO) && !todoElCorreo.includes('Una copa rota'),
    'el mensaje cuenta cosas de la trama',
  );
  /*
   * Sin nada remoto. Los clientes de correo bloquean por defecto imágenes y
   * hojas de estilo de fuera, así que una plantilla que dependa de ellas llega
   * descuadrada — y además cada recurso remoto es un chivato de lectura.
   */
  const remotos = (correoDeAna?.html ?? '').match(/(src|@import|url\()\s*=?\s*["']?https?:/gi);
  comprobar('el HTML no carga nada de fuera', remotos === null, remotos);

  const enConsola = appMemoria.salida();
  comprobar(
    'y el envío se escribe por consola, que es lo único que se ve sin base de datos',
    enConsola.includes('[correo:memoria]') && enConsola.includes('ana@ejemplo.com'),
    enConsola.slice(-300),
  );

  // -------------------------------------------------------------------------
  paso('Antes que mandar un correo inservible, no se manda');
  // -------------------------------------------------------------------------
  /*
   * Un correo no se puede corregir después de mandarlo. Sin `PUBLIC_ORIGIN`,
   * `enlaceDeInvitacion` cae a una ruta sin dominio y saldrían doce mensajes con
   * un «/i/eyJ…» dentro, que no es un enlace en ninguna parte. Vale mucho más un
   * error a la cara de quien organiza.
   */
  const dirSinOrigen = sembrar(path.join(raiz, 'sin-origen'));
  const appSinOrigen = arrancar(guion, dirSinOrigen, {
    ...entornoBase(dirSinOrigen),
    PUERTO_APP: String(PUERTO_SIN_ORIGEN),
  });
  vivos.push(appSinOrigen.proceso);
  await esperar(PUERTO_SIN_ORIGEN, '/listo', 'la app sin origen público');

  const cookieSinOrigen = await entrarEnElTaller(PUERTO_SIN_ORIGEN);
  const fallido = await pedir(PUERTO_SIN_ORIGEN, '/api/games/velada/invitaciones', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieSinOrigen },
    body: '{}',
  });
  comprobar('sin PUBLIC_ORIGIN no se manda ninguna', fallido.estado === 502, fallido.estado);
  comprobar(
    'y se dice exactamente qué falta',
    fallido.cuerpo.includes('PUBLIC_ORIGIN'),
    fallido.cuerpo.slice(0, 200),
  );

  // -------------------------------------------------------------------------
  paso('Un modo de correo mal escrito revienta, no se calla');
  // -------------------------------------------------------------------------
  /*
   * `CORREO_MODO=SES ` con un espacio, o `aws`, o `amazon`. Si eso cayera al
   * modo de memoria, el panel diría «doce invitaciones enviadas» y no habría
   * salido ninguna: nadie se entera hasta que llama el primer invitado.
   */
  const dirModoMalo = sembrar(path.join(raiz, 'modo-malo'));
  const appModoMalo = arrancar(guion, dirModoMalo, {
    ...entornoBase(dirModoMalo),
    PUERTO_APP: String(PUERTO_MODO_MALO),
    PUBLIC_ORIGIN: ORIGEN,
    CORREO_MODO: 'amazon',
  });
  vivos.push(appModoMalo.proceso);
  await esperar(PUERTO_MODO_MALO, '/listo', 'la app con el modo mal escrito');

  const cookieModoMalo = await entrarEnElTaller(PUERTO_MODO_MALO);
  const conModoMalo = await pedir(PUERTO_MODO_MALO, '/api/games/velada/invitaciones', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieModoMalo },
    body: '{}',
  });
  comprobar('con un modo desconocido no se manda nada', conModoMalo.estado === 500, conModoMalo.estado);
  comprobar(
    'y el error nombra la variable y los modos que hay',
    conModoMalo.cuerpo.includes('CORREO_MODO') && conModoMalo.cuerpo.includes('memoria'),
    conModoMalo.cuerpo.slice(0, 220),
  );

  // -------------------------------------------------------------------------
  paso('SES: la firma cubre exactamente lo que se manda');
  // -------------------------------------------------------------------------
  interface Capturada {
    metodo: string;
    ruta: string;
    cabeceras: http.IncomingHttpHeaders;
    cuerpo: string;
  }
  let capturada: Capturada | null = null;

  captura = http.createServer((req, res) => {
    const trozos: Buffer[] = [];
    req.on('data', (t: Buffer) => trozos.push(t));
    req.on('end', () => {
      capturada = {
        metodo: req.method ?? '',
        ruta: req.url ?? '',
        cabeceras: req.headers,
        cuerpo: Buffer.concat(trozos).toString('utf8'),
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ MessageId: 'de-mentira' }));
    });
  });
  await new Promise<void>((r) => captura?.listen(PUERTO_CAPTURA, '127.0.0.1', r));

  const dirSes = sembrar(path.join(raiz, 'ses'));
  const appSes = arrancar(guion, dirSes, {
    ...entornoBase(dirSes),
    PUERTO_APP: String(PUERTO_SES),
    PUBLIC_ORIGIN: ORIGEN,
    CORREO_MODO: 'ses',
    SES_ENDPOINT: `http://127.0.0.1:${PUERTO_CAPTURA}`,
    SES_REGION: AWS_REGION,
    AWS_ACCESS_KEY_ID: AWS_CLAVE,
    AWS_SECRET_ACCESS_KEY: AWS_SECRETA,
    CORREO_REMITENTE: 'invitaciones@harkania.example',
  });
  vivos.push(appSes.proceso);
  await esperar(PUERTO_SES, '/listo', 'la app en modo SES');

  const cookieSes = await entrarEnElTaller(PUERTO_SES);
  const porSes = await pedir(PUERTO_SES, '/api/games/velada/invitaciones', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieSes },
    body: JSON.stringify({ participanteIds: ['s0'] }),
  });
  comprobar('el envío por SES se da por bueno cuando SES responde bien', porSes.estado === 200, porSes);
  comprobar('y solo se manda a quien se pide', (porSes.json as { enviadas?: unknown[] })?.enviadas?.length === 1, porSes.json);

  const peticion = capturada as Capturada | null;
  comprobar('SES ha recibido una peticion', peticion !== null);

  if (peticion) {
    comprobar('por POST', peticion.metodo === 'POST', peticion.metodo);
    comprobar(
      'a la operación de la API v2 que manda correo',
      peticion.ruta === '/v2/email/outbound-emails',
      peticion.ruta,
    );

    const cuerpo = JSON.parse(peticion.cuerpo) as {
      FromEmailAddress: string;
      Destination: { ToAddresses: string[] };
      Content: { Simple: { Subject: { Data: string }; Body: { Text: { Data: string } } } };
    };
    comprobar('con el remitente configurado', cuerpo.FromEmailAddress === 'invitaciones@harkania.example', cuerpo.FromEmailAddress);
    comprobar('para Ana', cuerpo.Destination.ToAddresses[0] === 'ana@ejemplo.com', cuerpo.Destination);
    comprobar(
      'y con el mismo enlace que en el modo de memoria: es el mismo mensaje',
      cuerpo.Content.Simple.Body.Text.Data.includes(`${ORIGEN}/i/`),
      cuerpo.Content.Simple.Body.Text.Data.slice(0, 160),
    );

    const autorizacion = String(peticion.cabeceras['authorization'] ?? '');
    const marca = String(peticion.cabeceras['x-amz-date'] ?? '');
    const dia = marca.slice(0, 8);
    const ambito = `${dia}/${AWS_REGION}/ses/aws4_request`;

    comprobar('la peticion va firmada', autorizacion.startsWith('AWS4-HMAC-SHA256 '), autorizacion.slice(0, 60));
    comprobar('con fecha, que es lo que impide reutilizar una firma vieja', /^\d{8}T\d{6}Z$/.test(marca), marca);
    comprobar(
      'con el ámbito completo: día, región y servicio',
      autorizacion.includes(`Credential=${AWS_CLAVE}/${ambito}`),
      autorizacion.slice(0, 140),
    );
    comprobar(
      'declarando qué cabeceras firma',
      autorizacion.includes('SignedHeaders=content-type;host;x-amz-date'),
      autorizacion,
    );

    /*
     * Y AQUÍ LA DE VERDAD: se recompone la firma desde CERO con lo que ha
     * llegado —el cuerpo tal cual, las cabeceras tal cual— y tiene que dar la
     * misma. Si el código firmara una cosa y mandara otra (el fallo clásico de
     * una firma escrita a mano: componer el cuerpo dos veces, o añadirle un
     * campo después de firmar), esto no cuadraría. AWS respondería a eso con un
     * 403 sin explicación, días después, en producción.
     */
    const sha = (t: string) => crypto.createHash('sha256').update(t, 'utf8').digest('hex');
    const hmac = (clave: crypto.BinaryLike, t: string) =>
      crypto.createHmac('sha256', clave).update(t, 'utf8').digest();

    const canonica = [
      'POST',
      '/v2/email/outbound-emails',
      '',
      `content-type:application/json\nhost:127.0.0.1:${PUERTO_CAPTURA}\nx-amz-date:${marca}\n`,
      'content-type;host;x-amz-date',
      sha(peticion.cuerpo),
    ].join('\n');
    const aFirmar = ['AWS4-HMAC-SHA256', marca, ambito, sha(canonica)].join('\n');
    const clave = hmac(hmac(hmac(hmac(`AWS4${AWS_SECRETA}`, dia), AWS_REGION), 'ses'), 'aws4_request');
    const miFirma = hmac(clave, aFirmar).toString('hex');

    comprobar(
      'y la firma es la del CUERPO QUE HA LLEGADO, recompuesta aquí por separado',
      autorizacion.endsWith(`Signature=${miFirma}`),
      { esperada: miFirma, recibida: autorizacion.slice(-80) },
    );
    comprobar(
      'la huella del cuerpo viaja aparte y cuadra',
      peticion.cabeceras['x-amz-content-sha256'] === sha(peticion.cuerpo),
      peticion.cabeceras['x-amz-content-sha256'],
    );
  }

  // -------------------------------------------------------------------------
  paso('Donde cae quien pulsa el enlace del correo');
  // -------------------------------------------------------------------------
  const dirReal = sembrar(path.join(raiz, 'real'));
  const servidor = arrancar(SERVIDOR, dirReal, {
    ...entornoBase(dirReal),
    PORT: String(PUERTO_REAL),
    PUBLIC_ORIGIN: ORIGEN,
  });
  vivos.push(servidor.proceso);
  await esperar(PUERTO_REAL, '/api/salud', 'el servidor').catch((e) => {
    throw new Error(`${String(e)}\n${servidor.salida().slice(0, 800)}`);
  });

  /*
   * EL SOBRE QUE SE PRUEBA ES EL DEL CORREO. No uno fabricado aquí: el que ha
   * salido dentro del mensaje que compuso el módulo de correo. Es lo que
   * convierte esto en una prueba del CIRCUITO y no de dos piezas sueltas — si
   * el correo compusiera un enlace que el servidor no entiende, todo lo demás
   * seguiría en verde y nadie lo sabría.
   */
  const sobreDeAna = (paraAna?.enlace ?? '').split('/i/')[1] ?? '';
  comprobar('el correo lleva un sobre dentro del enlace', sobreDeAna.length > 20, sobreDeAna);

  const aterrizaje = await pedir(PUERTO_REAL, `/i/${sobreDeAna}`);
  comprobar('el enlace del correo lleva a una página de verdad', aterrizaje.estado === 200, aterrizaje.estado);
  comprobar('que nombra la velada', aterrizaje.cuerpo.includes(TITULO), aterrizaje.cuerpo.slice(0, 200));
  comprobar(
    'y NO es la portada del taller',
    !aterrizaje.cuerpo.includes('<div id="root"'),
    'el enlace acabó en el comodín del cliente',
  );
  /*
   * La página la ve cualquiera a quien le reenvíen el correo: no puede decir a
   * quién esperan ni qué papel le ha tocado.
   */
  comprobar(
    'sin decir a quién esperan',
    !aterrizaje.cuerpo.includes('Ana') && !aterrizaje.cuerpo.includes(DEL_MISTERIO),
    aterrizaje.cuerpo.slice(0, 300),
  );
  comprobar(
    'ni el código personal',
    !aterrizaje.cuerpo.includes(CODIGO_PERSONAL),
    'la página de aterrizaje enseña el código personal',
  );

  // -------------------------------------------------------------------------
  paso('El sobre caducado se explica, y no se confunde con otra cosa');
  // -------------------------------------------------------------------------
  const abrir = (cuerpo: unknown, pasaporte?: string) =>
    pedir(PUERTO_REAL, '/api/invitacion/abrir', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(pasaporte ? { 'X-GM-Cuenta': pasaporte } : {}),
      },
      body: JSON.stringify(cuerpo),
    });

  /*
   * Un sobre de hace treinta y un días: firmado por este mismo servidor, con la
   * firma buena, y caducado. Es lo que hay en el correo de cualquiera un mes
   * después, y es distinto de un sobre inventado — de ahí que se compruebe con
   * uno de verdad y no con basura.
   */
  const caducado = cerrarSobre('enlace:v1', { gameId: 'velada', participanteId: 's0' }, -10);
  const paginaCaducada = await pedir(PUERTO_REAL, `/i/${encodeURIComponent(caducado)}`);
  comprobar('la página de un sobre caducado responde 410', paginaCaducada.estado === 410, paginaCaducada.estado);
  comprobar(
    'y explica que caducan al mes, en vez de decir que no existe',
    paginaCaducada.cuerpo.includes('caduca'),
    paginaCaducada.cuerpo.slice(0, 400),
  );

  const canjeCaducado = await abrir({ sobre: caducado });
  comprobar('y la app recibe el mismo 410', canjeCaducado.estado === 410, canjeCaducado.estado);
  comprobar(
    'con un texto que se puede enseñar tal cual',
    String((canjeCaducado.json as { error?: string })?.error ?? '').includes('caduca'),
    canjeCaducado.json,
  );

  const basura = await abrir({ sobre: 'esto-no-es-un-sobre' });
  comprobar('un sobre inventado no se abre', basura.estado === 410, basura.estado);
  comprobar('y no cuenta nada de ninguna velada', !basura.cuerpo.includes(TITULO), basura.cuerpo.slice(0, 160));

  /*
   * El dominio del sobre importa: un pasaporte de cuenta está firmado con el
   * MISMO secreto del servidor. Si `abrirSobre` no atara el dominio dentro del
   * mensaje, una firma emitida para una cosa valdría para otra.
   */
  const pasaporteAna = cerrarSobre('cuenta:v1', { cuentaId: 'cta-ana', via: 'google' }, 3600);
  const otroDominio = await abrir({ sobre: pasaporteAna });
  comprobar(
    'un pasaporte de cuenta NO vale como sobre de invitación, aunque lo firme el mismo secreto',
    otroDominio.estado === 410,
    otroDominio.estado,
  );

  // -------------------------------------------------------------------------
  paso('EL SOBRE NO ABRE LA PARTIDA POR SÍ SOLO');
  // -------------------------------------------------------------------------
  /*
   * ESTA ES LA SECCIÓN POR LA QUE EXISTE EL FICHERO.
   *
   * Un correo se reenvía, se archiva y sobrevive a la velada. Así que hay que
   * dar por hecho que el sobre lo tiene cualquiera, y comprobar una por una las
   * puertas que NO abre.
   */
  const sinCuenta = await abrir({ sobre: sobreDeAna });
  comprobar('el sobre solo se abre y contesta', sinCuenta.estado === 200, sinCuenta.estado);
  comprobar(
    'pero lo primero que dice es que hace falta una cuenta',
    (sinCuenta.json as { requiereCuenta?: boolean })?.requiereCuenta === true,
    sinCuenta.json,
  );
  comprobar(
    'NO reparte ninguna credencial de jugador',
    !sinCuenta.cuerpo.includes('token'),
    sinCuenta.cuerpo.slice(0, 200),
  );
  comprobar(
    'ni dice a quién esperan: eso solo se cuenta a su cuenta',
    !sinCuenta.cuerpo.includes('Ana') && !sinCuenta.cuerpo.includes(CODIGO_PERSONAL),
    sinCuenta.cuerpo.slice(0, 200),
  );

  /*
   * Y el reenvío con cuenta propia, que es el caso de verdad: Carla tiene
   * cuenta, tiene su buzón demostrado por Google, y le han reenviado el correo
   * de Ana. Todo lo que le falta es ser la persona invitada.
   */
  const pasaporteCarla = cerrarSobre('cuenta:v1', { cuentaId: 'cta-carla', via: 'google' }, 3600);
  const reenviado = await abrir({ sobre: sobreDeAna }, pasaporteCarla);
  comprobar('a quien le reenvían el correo, el sobre se le abre', reenviado.estado === 200, reenviado.estado);
  comprobar(
    'pero NO le señala ninguna silla',
    (reenviado.json as { invitacion?: unknown })?.invitacion === undefined,
    reenviado.json,
  );
  comprobar(
    'y se le explica sin decirle de quién es la invitación',
    String((reenviado.json as { motivo?: string })?.motivo ?? '').includes('tu cuenta') &&
      !reenviado.cuerpo.includes('ana@ejemplo.com'),
    reenviado.json,
  );

  const carlaSeCuela = await pedir(PUERTO_REAL, '/api/cuenta/entrar-en-partida', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-GM-Cuenta': pasaporteCarla },
    body: JSON.stringify({ gameId: 'velada', participanteId: 's0' }),
  });
  comprobar(
    'y con los identificadores del sobre en la mano, tampoco se sienta',
    carlaSeCuela.estado === 404,
    carlaSeCuela,
  );

  /*
   * El sobre presentado como si fuera una credencial. Es lo que intentaría
   * cualquiera con quince minutos y las herramientas del navegador.
   */
  const sobreComoCredencial = await pedir(PUERTO_REAL, '/api/jugar/vista', {
    headers: { Authorization: `Bearer ${sobreDeAna}` },
  });
  comprobar(
    'el sobre presentado como credencial de jugador no vale',
    sobreComoCredencial.estado === 401,
    sobreComoCredencial.estado,
  );
  const sobreComoPasaporte = await pedir(PUERTO_REAL, '/api/cuenta/portada', {
    headers: { 'X-GM-Cuenta': sobreDeAna },
  });
  comprobar(
    'ni como pasaporte de cuenta',
    sobreComoPasaporte.estado === 401,
    sobreComoPasaporte.estado,
  );
  const sobreEnElTaller = await pedir(PUERTO_REAL, '/api/games', {
    headers: { 'X-GM-Cuenta': sobreDeAna },
  });
  comprobar('ni abre el taller', sobreEnElTaller.estado === 401, sobreEnElTaller.estado);

  // -------------------------------------------------------------------------
  paso('Y sin embargo, sirve para sentarse en la silla propia');
  // -------------------------------------------------------------------------
  const deAna = await abrir({ sobre: sobreDeAna }, pasaporteAna);
  comprobar('con la cuenta invitada, el sobre señala su silla', deAna.estado === 200, deAna);
  const invitacion = (deAna.json as {
    invitacion?: { gameId: string; participanteId: string; personaje: string; directa: boolean };
  })?.invitacion;
  comprobar('con la partida', invitacion?.gameId === 'velada', invitacion);
  comprobar('y la silla concreta', invitacion?.participanteId === 's0', invitacion);
  comprobar('y ahora sí, con el nombre de quien esperan', invitacion?.personaje === 'Ana', invitacion);
  comprobar('diciendo que puede entrar sin código', invitacion?.directa === true, invitacion);
  /*
   * NI SIQUIERA AQUÍ SALE UNA CREDENCIAL. Esta ruta resuelve el sobre y nada
   * más; repartir credenciales es de una sola puerta, y esta no es esa puerta.
   */
  comprobar(
    'y AUN ASÍ no reparte credencial: eso es de otra puerta',
    !deAna.cuerpo.includes('token'),
    deAna.cuerpo.slice(0, 300),
  );
  comprobar(
    'ni enseña el código personal, que sigue sin salir de la mesa',
    !deAna.cuerpo.includes(CODIGO_PERSONAL),
    deAna.cuerpo.slice(0, 300),
  );

  const sentada = await pedir(PUERTO_REAL, '/api/cuenta/entrar-en-partida', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-GM-Cuenta': pasaporteAna },
    body: JSON.stringify({ gameId: invitacion?.gameId, participanteId: invitacion?.participanteId }),
  });
  comprobar('por la puerta de siempre, Ana se sienta', sentada.estado === 200, sentada);
  const credencial = (sentada.json as { token?: string })?.token ?? '';
  comprobar('y recibe una credencial de jugador', credencial.length > 20, sentada.json);

  const vista = await pedir(PUERTO_REAL, '/api/jugar/vista', {
    headers: { Authorization: `Bearer ${credencial}` },
  });
  comprobar('que le abre su vista de la partida', vista.estado === 200, vista.cuerpo.slice(0, 200));
  comprobar(
    'la suya, con su personaje',
    JSON.stringify(vista.json).includes(DEL_MISTERIO),
    vista.cuerpo.slice(0, 200),
  );
  /*
   * El circuito entero, cerrado: del correo salió un enlace, el enlace señaló
   * una silla, y la silla —por la puerta de siempre— dio una credencial que de
   * verdad abre la partida.
   */

  // -------------------------------------------------------------------------
  paso('La credencial que sale es de las que se pueden revocar');
  // -------------------------------------------------------------------------
  /*
   * La única revocación real que tiene el juego es cerrar y reabrir la mesa, y
   * funciona porque la credencial va atada al `sid` de la apertura concreta. Si
   * este camino repartiera una credencial sin `sid` —o atada a otra cosa— esa
   * revocación se perdería para todo el que hubiera entrado por aquí, y nadie
   * se enteraría: la comprobación que la vigila seguiría en verde, porque mira
   * el camino de los códigos.
   */
  const carga = JSON.parse(
    Buffer.from(credencial.split('.')[0]!.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(
      'utf8',
    ),
  ) as { gameId: string; participanteId: string; sid?: string; exp?: number };
  comprobar('la credencial es de esta partida', carga.gameId === 'velada', carga);
  comprobar('y de esta silla', carga.participanteId === 's0', carga);
  comprobar('atada a ESTA apertura de la mesa', carga.sid === 'apertura-de-hoy', carga);
  comprobar('y con fecha de caducidad', typeof carga.exp === 'number', carga);

  const deOtraApertura = emitirCredencial('velada', 's0', 'una-apertura-anterior');
  const conVieja = await pedir(PUERTO_REAL, '/api/jugar/vista', {
    headers: { Authorization: `Bearer ${deOtraApertura}` },
  });
  comprobar(
    'una credencial de una apertura anterior ya no vale, aunque esté bien firmada',
    conVieja.estado === 401,
    conVieja,
  );
} catch (e) {
  fallos.push(`la prueba se cayó: ${e instanceof Error ? e.message : String(e)}`);
} finally {
  for (const p of vivos) p.kill();
  captura?.close();
  try {
    fs.rmSync(raiz, { recursive: true, force: true });
  } catch {
    /* carpeta temporal: no merece tumbar la prueba */
  }
}

console.log('');
if (fallos.length === 0) {
  console.log(`✔ ${hechas} comprobaciones. La invitación llega, sienta a quien debe y a nadie más.`);
  process.exit(0);
}
console.log(`✘ ${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
for (const f of fallos) console.log(`   · ${f}`);
process.exit(1);
