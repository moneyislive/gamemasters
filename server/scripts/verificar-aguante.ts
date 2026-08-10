/**
 * El servidor no se cae solo.
 *
 *   npm run verify:aguante
 *
 * QUÉ SE COMPRUEBA Y POR QUÉ. Express 4 no entiende de promesas: si un
 * manejador `async` rechaza, el rechazo sube hasta Node, y Node 20 responde
 * matando el proceso. No es un 500: es el servidor entero abajo, en mitad de
 * una cena con doce invitados y sin nadie mirando la consola.
 *
 * Las comprobaciones de esta tanda van en dos planos:
 *
 *   1. EL MECANISMO, en memoria: que la fábrica de routers convierte un
 *      rechazo en un 500 y que un router pelado NO lo hace. La segunda mitad
 *      es la importante — es el control que demuestra que la prueba mide algo.
 *   2. LA COBERTURA, sobre el código fuente: que no queda ni un
 *      `express.Router()` suelto. Da igual lo bien que funcione la red si la
 *      ruta veintiuno se escribe fuera de ella.
 *
 * Y luego, contra el servidor de verdad por HTTP: que una pista lanzada por
 * quien dirige LLEGA al móvil que está esperando, que una foto que no existe
 * es un 404 y no una página HTML disfrazada, y que tras todo el maltrato el
 * proceso sigue en pie y respondiendo.
 *
 * AISLAMIENTO. Igual que el resto de comprobadores: proceso aparte, cwd en una
 * carpeta temporal sin `.env` al lado y un entorno explícito. Ni la clave de
 * Anthropic ni el Atlas de producción entran aquí.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import express from 'express';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { generateBoardLayout } from '../src/board/generator';
import { generateDemoPlot } from '../src/plot/demoPlot';
import { crearRouter } from '../src/rutas';
import type { GameSession } from '../../shared/types';
import type { LiveSession } from '../../shared/live';

const REPO = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const TSX = path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SERVIDOR = path.join(REPO, 'server', 'src', 'index.ts');
const PUERTO = 5700 + Math.floor(Math.random() * 400);
const BASE = `http://127.0.0.1:${PUERTO}`;
const CONTRASENA = 'contrasena-de-prueba';
const FOTO = 'retrato-de-prueba.png';
/** El PNG válido más pequeño que existe: 1x1, transparente. */
const PNG_MINIMO = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

let hechas = 0;
const fallos: string[] = [];
function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(
    `${que}${detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 200)}`}`,
  );
}
function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

// ---------------------------------------------------------------------------
// 1. El mecanismo: un rechazo no puede escapar
// ---------------------------------------------------------------------------

/** Levanta una app en un puerto libre y devuelve cómo hablarle y cómo cerrarla. */
async function levantar(
  montar: (app: express.Express) => void,
): Promise<{ puerto: number; cerrar: () => Promise<void> }> {
  const app = express();
  montar(app);
  app.use((_err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ error: 'Error interno del servidor.' });
  });
  const servidor = http.createServer(app);
  await new Promise<void>((r) => servidor.listen(0, '127.0.0.1', r));
  const dir = servidor.address();
  const puerto = typeof dir === 'object' && dir ? dir.port : 0;
  return {
    puerto,
    cerrar: () => new Promise<void>((r) => servidor.close(() => r())),
  };
}

/** Cuenta los rechazos sin gestionar que ocurren mientras corre `accion`. */
async function contarRechazos(accion: () => Promise<void>): Promise<number> {
  let vistos = 0;
  const espia = (): void => {
    vistos++;
  };
  // Se retiran los oyentes reales para que el proceso no muera durante la
  // prueba: aquí un rechazo suelto es justamente lo que se quiere observar.
  const previos = process.listeners('unhandledRejection');
  process.removeAllListeners('unhandledRejection');
  process.on('unhandledRejection', espia);
  try {
    await accion();
    // Los rechazos sin gestionar se notifican al final del turno de bucle, no
    // al instante. Sin esta espera se contarían cero siempre y la prueba
    // pasaría por casualidad.
    await new Promise((r) => setTimeout(r, 300));
  } finally {
    process.removeListener('unhandledRejection', espia);
    for (const oyente of previos) process.on('unhandledRejection', oyente as never);
  }
  return vistos;
}

async function comprobarMecanismo(): Promise<void> {
  paso('La fábrica de routers');

  // a) Con la fábrica: 500 limpio y ni un rechazo suelto.
  {
    const conFabrica = crearRouter();
    conFabrica.get('/revienta', async () => {
      throw new Error('la partida ya no está en juego');
    });
    conFabrica.get('/revienta-sincrono', () => {
      throw new Error('a lo bruto');
    });
    conFabrica.get('/bien', (_req, res) => res.json({ ok: true }));

    const { puerto, cerrar } = await levantar((app) => app.use(conFabrica));
    let estadoAsync = 0;
    let estadoSync = 0;
    let cuerpo: unknown = null;
    const rechazos = await contarRechazos(async () => {
      const r = await fetch(`http://127.0.0.1:${puerto}/revienta`);
      estadoAsync = r.status;
      cuerpo = await r.json();
      estadoSync = (await fetch(`http://127.0.0.1:${puerto}/revienta-sincrono`)).status;
    });
    const sano = await fetch(`http://127.0.0.1:${puerto}/bien`);
    await cerrar();

    comprobar('un manejador async que revienta devuelve 500', estadoAsync === 500, estadoAsync);
    comprobar('y el 500 es JSON, no una página', (cuerpo as { error?: string })?.error !== undefined, cuerpo);
    comprobar('uno síncrono que revienta también devuelve 500', estadoSync === 500, estadoSync);
    comprobar('sin un solo rechazo sin gestionar', rechazos === 0, rechazos);
    comprobar('y el resto de rutas siguen respondiendo', sano.status === 200, sano.status);
  }

  // b) El control: sin la fábrica, el rechazo SÍ escapa. Si esto dejase de
  //    cumplirse, la comprobación de arriba no estaría midiendo nada.
  {
    const pelado = express.Router();
    pelado.get('/revienta', async () => {
      throw new Error('la partida ya no está en juego');
    });
    const { puerto, cerrar } = await levantar((app) => app.use(pelado));
    const rechazos = await contarRechazos(async () => {
      // Sin nadie que responda, la petición se queda colgada: lo que importa
      // es el rechazo que deja atrás, no la respuesta.
      await Promise.race([
        fetch(`http://127.0.0.1:${puerto}/revienta`).catch(() => undefined),
        new Promise((r) => setTimeout(r, 500)),
      ]);
    });
    await cerrar();
    comprobar(
      'CONTROL: un router pelado sí deja escapar el rechazo (mataría el proceso)',
      rechazos >= 1,
      rechazos,
    );
  }
}

// ---------------------------------------------------------------------------
// 2. La cobertura: no queda ningún router fuera de la red
// ---------------------------------------------------------------------------

function ficherosTs(dir: string, acc: string[] = []): string[] {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const completo = path.join(dir, entrada.name);
    if (entrada.isDirectory()) ficherosTs(completo, acc);
    else if (entrada.name.endsWith('.ts')) acc.push(completo);
  }
  return acc;
}

function comprobarCobertura(): void {
  paso('Ningún router se queda fuera');

  const src = path.join(REPO, 'server', 'src');
  const sueltos: string[] = [];
  let conFabrica = 0;

  for (const fichero of ficherosTs(src)) {
    // `rutas.ts` es quien fabrica: es el único sitio donde debe aparecer.
    if (path.basename(fichero) === 'rutas.ts') continue;
    const texto = fs.readFileSync(fichero, 'utf8');
    if (/\bexpress\.Router\(\)|(?<!crear)\bRouter\(\)/.test(texto)) {
      sueltos.push(path.relative(src, fichero));
    }
    if (texto.includes('crearRouter()')) conFabrica++;
  }

  comprobar('no queda ni un express.Router() suelto', sueltos.length === 0, sueltos);
  comprobar('y hay routers de verdad usando la fábrica', conFabrica >= 12, conFabrica);

  paso('Toda escritura sobre la partida pasa por el candado');

  /*
   * ESTA COMPROBACIÓN ES ESTRUCTURAL, Y SE DICE A PROPÓSITO.
   *
   * Se intentó primero por HTTP —doce móviles refrescando mientras otro
   * escribe— y no sirve: con el almacén de fichero, entre leer la sesión y
   * guardarla pasan microsegundos, así que la ventana en la que la presencia
   * pisaba una acusación casi nunca se abre. Una prueba que solo falla una vez
   * de cada mil no es una prueba, es un sorteo. Con MongoDB la ventana es de
   * milisegundos y el fallo sí ocurre, pero no se va a levantar un Atlas para
   * comprobarlo.
   *
   * Así que se comprueban dos cosas por separado, y entre las dos cubren el
   * caso: que `mutar` de verdad serializa (eso lo mide la sonda, con doce
   * mutaciones simultáneas que se pisarían sin candado), y aquí, que nadie
   * escriba la sesión por su cuenta saltándoselo.
   */
  const escrituraSuelta: string[] = [];
  for (const fichero of ficherosTs(src)) {
    // El almacén ES quien guarda, y `sesion.ts` es dueño del candado.
    const relativo = path.relative(src, fichero).replace(/\\/g, '/');
    if (relativo.startsWith('db/') || relativo === 'live/sesion.ts') continue;
    for (const [n, linea] of fs.readFileSync(fichero, 'utf8').split('\n').entries()) {
      if (/\.saveLive\(/.test(linea)) escrituraSuelta.push(`${relativo}:${n + 1}`);
    }
  }

  comprobar(
    'nadie guarda la sesión saltándose `mutar`, salvo el cierre de partida',
    // El desenlace apunta trofeos en las cuentas y vuelve a guardar; ahí la
    // partida ya ha terminado y no queda nadie escribiendo contra ella.
    escrituraSuelta.every((sitio) => sitio.startsWith('routes/live.ts')),
    escrituraSuelta,
  );
  // El cuerpo de `mutarPresencia`, hasta la llave que lo cierra en su columna.
  const jugarTs = fs.readFileSync(path.join(src, 'routes', 'jugar.ts'), 'utf8');
  const tras = jugarTs.split('async function mutarPresencia')[1] ?? '';
  const cuerpo = tras.split('\n}')[0] ?? '';
  comprobar('se encuentra el cuerpo de mutarPresencia', cuerpo.length > 20, cuerpo.length);
  comprobar('la presencia va por `mutar`', cuerpo.includes('await mutar('), cuerpo.trim().slice(0, 160));
  comprobar(
    'y no guarda la sesión por su cuenta',
    !cuerpo.includes('saveLive'),
    cuerpo.trim().slice(0, 160),
  );
}

// ---------------------------------------------------------------------------
// 3. La partida sembrada para las pruebas por HTTP
// ---------------------------------------------------------------------------

function sembrar(dir: string): void {
  const ahora = new Date().toISOString();
  const game: GameSession = {
    id: 'aguante',
    name: 'Prueba de aguante',
    status: 'ready',
    createdAt: ahora,
    updatedAt: ahora,
    suspects: ['Ana', 'Bruno', 'Carla'].map((name, i) => ({ id: `s${i}`, name })),
    rooms: ['Salón', 'Cocina', 'Biblioteca'].map((name, i) => ({ id: `r${i}`, name })),
    weapons: ['Candelabro', 'Cuerda'].map((name, i) => ({ id: `w${i}`, name })),
    boardMode: 'generated',
    settings: { language: 'es' },
  };
  game.board = generateBoardLayout(game.rooms);
  game.plot = generateDemoPlot(game);
  game.plot.material = {
    generatedAt: ahora,
    narrations: [{ round: 1, title: 'Ronda 1', text: 'Se abre la ronda.', stageDirection: '' }],
    twists: [],
    timelineReveals: [],
    hints: [{ level: 1, text: 'Mira debajo del reloj.' }],
    finale: { reconstruction: 'Así fue.', confession: 'Fui yo.', epilogue: 'Fin.' },
  };

  const sesion: LiveSession = {
    id: game.id,
    code: 'AGUANT',
    phase: 'lobby',
    round: 0,
    totalRounds: 3,
    players: game.suspects.map((s, i) => ({
      suspectId: s.id,
      displayName: s.name,
      joinCode: `CODIG${i}`,
      joined: false,
      elecciones: [],
      notas: '',
      girosRecibidos: [],
    })),
    acusaciones: [],
    tablon: [],
    rev: 1,
    updatedAt: ahora,
  };

  /*
   * Un «cliente compilado» de mentira, con su index.html.
   *
   * Hace falta para que la comprobación de `/uploads` mida algo: el comodín que
   * devuelve index.html —el que hace funcionar las rutas de react-router— solo
   * se monta si hay cliente. Sin él, una foto que falta daba 404 de todas
   * formas y la prueba habría pasado por casualidad. Con él, si el 404 de
   * `/uploads` desapareciera, la petición seguiría hasta el comodín y el
   * navegador recibiría una página HTML con un 200 donde esperaba un JPEG.
   */
  fs.mkdirSync(path.join(dir, 'cliente'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'cliente', 'index.html'),
    '<!DOCTYPE html><title>taller</title><div id="root"></div>',
    'utf8',
  );

  /*
   * Una foto de verdad en la carpeta de subidas, y un sospechoso que la use.
   * Es lo que permite comprobar que la app puede VERLA en producción, donde
   * `/uploads` está detrás de la contraseña de la casa.
   */
  fs.mkdirSync(path.join(dir, 'uploads'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'uploads', FOTO), PNG_MINIMO);
  game.suspects[0]!.photoUrl = `/uploads/${FOTO}`;
  game.rooms[0]!.photoUrl = `/uploads/${FOTO}`;

  fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'data', 'db.json'),
    JSON.stringify(
      { games: [game], messages: {}, config: { model: 'claude-fable-5' }, live: [sesion], accounts: [] },
      null,
      2,
    ),
    'utf8',
  );
}

// ---------------------------------------------------------------------------
// 4. Contra el servidor de verdad
// ---------------------------------------------------------------------------

async function pedir(
  ruta: string,
  opciones: {
    metodo?: string;
    cuerpo?: unknown;
    testigo?: string;
    cookie?: string;
    cabeceras?: Record<string, string>;
  } = {},
): Promise<{ estado: number; datos: any; texto: string; cabeceras: Headers }> {
  const r = await fetch(`${BASE}${ruta}`, {
    method: opciones.metodo ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opciones.testigo ? { Authorization: `Bearer ${opciones.testigo}` } : {}),
      ...(opciones.cookie ? { Cookie: opciones.cookie } : {}),
      ...(opciones.cabeceras ?? {}),
    },
    ...(opciones.cuerpo === undefined ? {} : { body: JSON.stringify(opciones.cuerpo) }),
    redirect: 'manual',
  });
  const texto = await r.text();
  let datos: unknown = texto;
  try {
    datos = JSON.parse(texto);
  } catch {
    /* no era JSON */
  }
  return { estado: r.status, datos, texto, cabeceras: r.headers };
}

async function esperarServidor(): Promise<void> {
  for (let i = 0; i < 90; i++) {
    try {
      const r = await fetch(`${BASE}/api/auth/status`);
      if (r.ok) return;
    } catch {
      /* todavía no escucha */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('el servidor no llegó a arrancar');
}

async function comprobarServidor(): Promise<void> {
  paso('La cookie del taller viaja protegida tras un proxy');

  // Detrás de un proxy la conexión con el navegador es HTTPS aunque el último
  // salto sea HTTP. Sin `trust proxy`, la cookie de sesión salía sin `secure` y
  // viajaba expuesta.
  const detrasDeProxy = await pedir('/api/auth/login', {
    metodo: 'POST',
    cuerpo: { password: CONTRASENA },
    cabeceras: { 'X-Forwarded-Proto': 'https' },
  });
  comprobar('la contraseña correcta entra', detrasDeProxy.estado === 200, detrasDeProxy.datos);
  const galleta = detrasDeProxy.cabeceras.get('set-cookie') ?? '';
  comprobar('y la cookie sale marcada como Secure', /;\s*Secure/i.test(galleta), galleta);
  comprobar('y como HttpOnly', /HttpOnly/i.test(galleta), galleta);

  const enLocal = await pedir('/api/auth/login', {
    metodo: 'POST',
    cuerpo: { password: CONTRASENA },
  });
  comprobar(
    'sin proxy (wifi de casa, sin HTTPS) NO se marca Secure, o el móvil la tiraría',
    !/;\s*Secure/i.test(enLocal.cabeceras.get('set-cookie') ?? ''),
    enLocal.cabeceras.get('set-cookie'),
  );

  const cookie = (galleta.split(';')[0] ?? '').trim();
  comprobar('la cookie sirve para entrar al taller', (await pedir('/api/games', { cookie })).estado === 200);

  paso('Una foto que no existe es un 404, no una página');
  const foto = await pedir('/uploads/no-existe-jamas.jpg', { cookie });
  comprobar('devuelve 404', foto.estado === 404, foto.estado);
  comprobar(
    'y no devuelve el index.html del taller disfrazado de imagen',
    !/<!doctype/i.test(foto.texto),
    foto.texto.slice(0, 80),
  );
  // Y el comodín del cliente SÍ está montado: si no, lo de arriba no probaría
  // nada.
  const paginaCualquiera = await pedir('/una/ruta/del/taller', { cookie });
  comprobar(
    'CONTROL: el comodín del cliente está activo y sirve index.html',
    paginaCualquiera.estado === 200 && /<!doctype/i.test(paginaCualquiera.texto),
    paginaCualquiera.estado,
  );

  paso('Una pista lanzada por quien dirige LLEGA al móvil que espera');

  const entrada = await pedir('/api/jugar/entrar', {
    metodo: 'POST',
    cuerpo: { code: 'AGUANT', joinCode: 'CODIG0' },
  });
  comprobar('el jugador entra sin saber la contraseña de la casa', entrada.estado === 200, entrada.datos);
  const testigo: string = entrada.datos?.token ?? '';

  const primera = await pedir('/api/jugar/vista', { testigo });
  const rev: number = primera.datos?.vista?.rev ?? 0;
  comprobar('la vista trae una revisión', rev > 0, rev);

  // El móvil se queda esperando desde la revisión que ya tiene, que es
  // exactamente el caso que fallaba: el aviso se anunciaba con esa misma
  // revisión y `avisosDesde` lo descartaba por no ser MAYOR.
  const espera = pedir(`/api/jugar/vista?desde=${rev}`, { testigo });
  await new Promise((r) => setTimeout(r, 300));
  const lanzada = await pedir('/api/games/aguante/live/ayuda', {
    metodo: 'POST',
    cuerpo: { nivel: 1 },
    cookie,
  });
  comprobar('la pista se lanza sin error', lanzada.estado === 200, lanzada.datos);

  const despertado = await espera;
  comprobar('el móvil se despierta', despertado.estado === 200, despertado.estado);
  const avisos: Array<{ clave: string; texto: string }> = despertado.datos?.avisos ?? [];
  comprobar(
    'y la pista le llega de verdad',
    avisos.some((a) => a.clave === 'ayuda' && a.texto.includes('reloj')),
    avisos,
  );

  paso('Doce móviles a la vez no pierden lo que se escribe');

  // La presencia se guardaba fuera del candado: leía la sesión, tardaba, y
  // escribía encima de lo que se hubiera registrado entretanto. Aquí se
  // entrelazan lecturas y escrituras a propósito.
  const notas = Array.from({ length: 12 }, (_, i) => `nota ${i}`);
  await Promise.all([
    ...notas.map((n) => pedir('/api/jugar/notas', { metodo: 'POST', cuerpo: { notas: n }, testigo })),
    ...Array.from({ length: 12 }, () => pedir('/api/jugar/vista', { testigo })),
    pedir('/api/jugar/listo', { metodo: 'POST', cuerpo: { listo: true }, testigo }),
  ]);

  const despues = await pedir('/api/jugar/vista', { testigo });
  comprobar(
    'el «estoy listo» sobrevive a doce refrescos simultáneos',
    despues.datos?.vista?.yo?.pediEmpezar === true,
    despues.datos?.vista?.yo?.pediEmpezar,
  );
  comprobar(
    'y las notas también',
    notas.includes(String(despues.datos?.vista?.yo?.notas ?? '')),
    despues.datos?.vista?.yo?.notas,
  );

  paso('Las fotos llegan al móvil aunque haya contraseña de la casa');

  const conFoto = await pedir('/api/jugar/vista', { testigo });
  const urlRetrato: string = conFoto.datos?.vista?.yo?.photoUrl ?? '';
  comprobar('la vista trae el retrato', urlRetrato.length > 0, urlRetrato);
  comprobar(
    'y NO apunta a /uploads, que el jugador no puede abrir',
    !urlRetrato.startsWith('/uploads/'),
    urlRetrato,
  );
  comprobar('sino a la ruta firmada de la app', urlRetrato.startsWith('/api/jugar/foto/'), urlRetrato);

  // Lo que de verdad importa: SIN la cookie del taller.
  const imagen = await pedir(urlRetrato);
  comprobar('la foto se sirve sin la cookie del Game Master', imagen.estado === 200, imagen.estado);
  comprobar('y son bytes de imagen, no una página de error', imagen.texto.includes('PNG'), imagen.texto.slice(0, 20));

  // CONTROL: por el camino viejo sigue sin poderse. Si esto dejara de ser
  // cierto, la comprobación de arriba no probaría nada.
  const porElCaminoViejo = await pedir(`/uploads/${FOTO}`);
  comprobar(
    'CONTROL: /uploads sigue cerrado sin la contraseña (por eso hacía falta la ruta nueva)',
    porElCaminoViejo.estado === 401,
    porElCaminoViejo.estado,
  );

  paso('Y el enlace firmado no vale para nada más');

  const sinFirma = await pedir(urlRetrato.split('?')[0] ?? '');
  comprobar('sin firma, no hay foto', sinFirma.estado === 404, sinFirma.estado);

  const firmaTocada = `${urlRetrato.slice(0, -1)}${urlRetrato.slice(-1) === 'a' ? 'b' : 'a'}`;
  comprobar('con la firma alterada, tampoco', (await pedir(firmaTocada)).estado === 404);

  const firma = urlRetrato.split('?f=')[1] ?? '';
  const deOtraPartida = await pedir(`/api/jugar/foto/otra-partida/${FOTO}?f=${firma}`);
  comprobar(
    'la firma de una partida no sirve en otra',
    deOtraPartida.estado === 404,
    deOtraPartida.estado,
  );

  /*
   * Salir del directorio: aquí un fallo no es una foto de más, es leer
   * ficheros del servidor.
   *
   * Se comprueba lo que IMPORTA —que no se sirva el fichero— y no un código
   * concreto. Algunos intentos ni llegan a la ruta: `....//package.json` trae
   * un segmento de más, así que no casa con `:gameId/:archivo`, se cuela hasta
   * el guardián de la contraseña y se lleva un 401. También está bien; lo que
   * no puede pasar es un 200 con contenido.
   */
  for (const intento of [
    '..%2f..%2fpackage.json',
    '..%5c..%5cpackage.json',
    '....//package.json',
    '%2e%2e%2fpackage.json',
    'db.json',
  ]) {
    const fuga = await pedir(`/api/jugar/foto/aguante/${intento}?f=${firma}`);
    comprobar(
      `no se sirve nada con «${intento}»`,
      fuga.estado !== 200 && !fuga.texto.includes('"name"'),
      { estado: fuga.estado, principio: fuga.texto.slice(0, 60) },
    );
  }

  paso('La señal de vida responde sin contraseña');

  // `render.yaml` la usa para decidir si el despliegue está sano. Apuntaba a
  // `/api/config`, que va detrás del guardián: en producción respondía 401 y el
  // servicio se daba por caído aunque estuviera perfectamente.
  const salud = await pedir('/api/salud');
  comprobar('responde 200 sin cookie', salud.estado === 200, salud.estado);
  comprobar('y dice que está bien', salud.datos?.ok === true, salud.datos);
  comprobar(
    'CONTROL: la ruta que se usaba antes SÍ está cerrada',
    (await pedir('/api/config')).estado === 401,
  );

  paso('La política de privacidad se lee sin contraseña y sin instalar nada');

  // Es la condición que ponen las dos tiendas, y la que se incumplía sin querer:
  // cualquier cosa que se sirva detrás del guardián NO vale.
  const politica = await pedir('/privacidad');
  comprobar('responde 200 sin cookie ninguna', politica.estado === 200, politica.estado);
  comprobar('y es HTML', /<!doctype html>/i.test(politica.texto), politica.texto.slice(0, 40));
  comprobar(
    'con el responsable y su correo, que es lo que exige el RGPD',
    politica.texto.includes('miguelpeidroparedes@gmail.com'),
  );
  comprobar(
    'y con la vía para ejercer la supresión',
    politica.texto.includes('Borrar mi cuenta y mis datos'),
  );
  comprobar(
    'no necesita nada de fuera: ni scripts ni recursos remotos',
    !/<script/i.test(politica.texto) && !/https?:\/\/(?!www\.aepd\.es)/i.test(politica.texto),
    politica.texto.match(/https?:\/\/[^"' ]+/g)?.slice(0, 4),
  );

  paso('Se puede denunciar al Mayordomo sin salir de la app');

  const revAntesDeDenunciar: number =
    (await pedir('/api/jugar/vista', { testigo })).datos?.vista?.rev ?? 0;

  const denuncia = await pedir('/api/jugar/denunciar', {
    metodo: 'POST',
    testigo,
    cuerpo: { pregunta: '¿quién fue?', respuesta: 'Una respuesta impropia del Mayordomo.' },
  });
  comprobar('la denuncia se acepta', denuncia.estado === 200, denuncia.datos);

  const vistaGm = await pedir('/api/games/aguante/live', { cookie });
  const denuncias: Array<{ respuesta: string; displayName: string }> =
    vistaGm.datos?.sesion?.denuncias ?? [];
  comprobar('y quien dirige la ve', denuncias.length === 1, denuncias);
  comprobar(
    'con el texto y quién la puso',
    denuncias[0]?.respuesta.includes('impropia') && denuncias[0]?.displayName === 'Ana',
    denuncias[0],
  );

  const revDespues: number = (await pedir('/api/jugar/vista', { testigo })).datos?.vista?.rev ?? 0;
  comprobar(
    'denunciar NO despierta a los doce móviles',
    revDespues === revAntesDeDenunciar,
    { antes: revAntesDeDenunciar, despues: revDespues },
  );

  const vacia = await pedir('/api/jugar/denunciar', {
    metodo: 'POST',
    testigo,
    cuerpo: { pregunta: 'algo', respuesta: '   ' },
  });
  comprobar('una denuncia sin texto se rechaza', vacia.estado === 400, vacia.estado);

  const sinCredencial = await pedir('/api/jugar/denunciar', {
    metodo: 'POST',
    cuerpo: { respuesta: 'hola' },
  });
  comprobar('y sin credencial no se puede denunciar', sinCredencial.estado === 401, sinCredencial.estado);

  paso('Las fotos que ya no usa nadie se retiran');

  const carpetaFotos = path.join(dir, 'uploads');
  const hay = (nombre: string): boolean => fs.existsSync(path.join(carpetaFotos, nombre));

  // Una foto compartida por DOS entidades. Es el caso que haría destructiva una
  // limpieza ingenua: quitar una no puede dejar sin foto a la otra.
  comprobar('la foto sembrada está', hay(FOTO));
  const quitarSala = await pedir('/api/games/aguante/rooms/r0', { metodo: 'DELETE', cookie });
  comprobar('se puede quitar la sala', quitarSala.estado === 200, quitarSala.datos);
  comprobar(
    'y la foto SIGUE, porque el sospechoso la comparte',
    hay(FOTO),
    'se ha borrado una foto que todavía se usaba',
  );

  // Ahora al sospechoso se le cambia la foto por otra: la vieja queda sin dueño.
  fs.writeFileSync(path.join(carpetaFotos, 'otra.png'), PNG_MINIMO);
  const cambiar = await pedir('/api/games/aguante/suspects', {
    metodo: 'POST',
    cookie,
    cuerpo: { id: 's0', name: 'Ana', photoUrl: '/uploads/otra.png' },
  });
  comprobar('se puede cambiar la foto', cambiar.estado === 200, cambiar.datos);
  comprobar('la nueva está', hay('otra.png'));
  comprobar('y la vieja, ya sin dueño, se ha retirado', !hay(FOTO));

  paso('El candado serializa y no deja basura detrás');

  // Esto no se ve por HTTP: es memoria del servidor. Va en un proceso aparte,
  // aislado igual que el servidor de la prueba (ver `sonda-candados.ts`).
  const sonda = await new Promise<string>((resolver, rechazar) => {
    let salida = '';
    const hijo = spawn(process.execPath, [TSX, path.join(REPO, 'server', 'scripts', 'sonda-candados.ts')], {
      cwd: dir,
      env: {
        PATH: process.env.PATH,
        SystemRoot: process.env.SystemRoot,
        TEMP: process.env.TEMP,
        TMP: process.env.TMP,
        NODE_ENV: 'test',
        PLAYER_TOKEN_SECRET: 'secreto-de-prueba-de-aguante-0123456789abcdef',
      },
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    hijo.stdout.on('data', (trozo) => {
      salida += String(trozo);
    });
    hijo.on('error', rechazar);
    hijo.on('close', () => resolver(salida.trim().split('\n').pop() ?? ''));
  });

  let medida: {
    antes: number;
    despues: number;
    ronda: number;
    mutaciones: number;
    revAntes: number;
    revTrasSilenciosa: number;
  } | null = null;
  try {
    medida = JSON.parse(sonda);
  } catch {
    /* la sonda no llegó a hablar */
  }
  comprobar('la sonda del candado responde', medida !== null, sonda.slice(0, 200));
  if (medida) {
    comprobar(
      'doce mutaciones simultáneas se aplican las doce (ninguna pisa a otra)',
      medida.ronda === 12,
      medida,
    );
    comprobar('no queda ni un candado vivo al terminar', medida.despues === 0, medida);
    comprobar('ni había ninguno de antes', medida.antes === 0, medida);
    comprobar(
      'y una mutación silenciosa NO sube la revisión (o los móviles no pararían)',
      medida.revTrasSilenciosa === medida.revAntes,
      medida,
    );
  }

  paso('Y después de todo esto, el servidor sigue en pie');
  const vivo = await pedir('/api/auth/status');
  comprobar('responde', vivo.estado === 200, vivo.estado);
  comprobar('el proceso no ha muerto', servidor?.exitCode === null, servidor?.exitCode);
}

// ---------------------------------------------------------------------------

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gm-aguante-'));
let servidor: ChildProcess | undefined;

try {
  await comprobarMecanismo();
  comprobarCobertura();

  sembrar(dir);
  servidor = spawn(process.execPath, [TSX, SERVIDOR], {
    cwd: dir,
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      PORT: String(PUERTO),
      NODE_ENV: 'test',
      APP_PASSWORD: CONTRASENA,
      PLAYER_TOKEN_SECRET: 'secreto-de-prueba-de-aguante-0123456789abcdef',
      CLIENT_DIR: path.join(dir, 'cliente'),
      UPLOADS_DIR: path.join(dir, 'uploads'),
    },
    stdio: 'ignore',
  });

  await esperarServidor();
  await comprobarServidor();
} catch (e) {
  fallos.push(`la prueba se cayó: ${e instanceof Error ? e.message : String(e)}`);
} finally {
  servidor?.kill();
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* carpeta temporal: no merece tumbar la prueba */
  }
}

console.log('');
if (fallos.length === 0) {
  console.log(`✔ ${hechas} comprobaciones. El servidor aguanta.`);
  process.exit(0);
}
console.log(`✘ ${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
for (const f of fallos) console.log(`   · ${f}`);
process.exit(1);
