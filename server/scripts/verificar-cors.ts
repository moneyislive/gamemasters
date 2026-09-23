/**
 * EL CORS DE LA CASA: una lista blanca, y no `Access-Control-Allow-Origin: *`.
 *
 *   npm run verify:cors
 *
 * ═══ QUÉ AFIRMA ═══
 *
 * Que el servidor ya no deja LEER su API a cualquier página. `docs/CAPA-ESPACIAL.md` §4 escribió
 * la cadena: con `cors()` pelado, una página ajena —o un realm de terceros embebido en la nuestra—
 * se sienta en una mesa con el código y juega con la llave que le devuelven, desde el navegador de
 * quien la visita. Lo que se comprueba:
 *
 *  1. Un origen ajeno recibe su respuesta SIN `Access-Control-Allow-Origin`: el navegador no le deja
 *     leerla. Tampoco el origen `null` de un marco aislado, ni los que se parecen a uno propio.
 *  2. Los orígenes propios —y, fuera de producción, el bucle local en cualquier puerto: los Vite y
 *     los Expo web de la casa— reciben SU origen de vuelta, y nunca credenciales.
 *  3. Sin cabecera `Origin` —la app nativa, `curl`, los comprobadores— todo se sirve como siempre.
 *  4. El preflight con `x-asiento` desde un origen permitido pasa, con la lista cerrada de
 *     cabeceras y no la que se le pida; desde uno ajeno no pasa.
 *  5. En modo producción el bucle local NO pasa, y lo que se añada en `ORIGENES_PERMITIDOS` sí.
 *  6. `ORIGENES_PERMITIDOS` es OPCIONAL: vacía no cambia nada; con una entrada ilegible, `*`,
 *     `null` o un comodín en cualquier parte (`https://*.example`), el arranque se niega a seguir
 *     diciendo por qué — el del comodín, además, con el servidor de verdad levantado.
 *  7. `https://harkania.com` NO va fijo en la lista: el dominio está suspendido por el registrador
 *     y podría cambiar de manos. Se vuelve a poner, si hace falta, con `ORIGENES_PERMITIDOS` o con
 *     `PUBLIC_ORIGIN`.
 *
 * ═══ POR QUÉ LAS DOS PUERTAS ═══
 *
 * En proceso se monta un Express con el middleware de verdad, en los dos modos, escuchando donde
 * diga el sistema (`listen(0)`), y se le pregunta todo. Pero eso no dice que `index.ts` lo use: un
 * `app.use(cors())` olvidado ahí dejaría esto verde y la producción abierta. Así que además se
 * levanta EL SERVIDOR DE VERDAD —en modo de desarrollo: el de producción exige una base de datos—
 * y se le preguntan las cuatro cosas que se ven desde fuera. Es la lección de esta casa: verde en
 * proceso, roto al arrancar.
 */
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import {
  CABECERAS_PERMITIDAS,
  corsDeLaCasa,
  leerOrigenesPermitidos,
  ORIGENES_PROPIOS,
  origenPermitido,
} from '../src/puerta/origenes';
import type { ContextoDelCors } from '../src/puerta/origenes';
import { sinComentarios } from './sin-comentarios';

const REPO = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const TSX = path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SERVIDOR = path.join(REPO, 'server', 'src', 'index.ts');

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  const cola = detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 500)}`;
  fallos.push(`${que}${cola}`);
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

function dormir(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Lo que interesa de una respuesta para hablar de CORS. */
interface LoQueVuelve {
  estado: number;
  cuerpo: string;
  permite: string | null;
  vary: string;
  credenciales: string | null;
  cabeceras: string | null;
}

/** Una petición con el `Origin` que se diga, o sin él. */
async function preguntar(
  base: string,
  ruta: string,
  opciones: { metodo?: string; origen?: string; pideCabeceras?: string; pideMetodo?: string } = {},
): Promise<LoQueVuelve> {
  const cabeceras: Record<string, string> = {};
  if (opciones.origen !== undefined) cabeceras.Origin = opciones.origen;
  if (opciones.pideMetodo !== undefined) cabeceras['Access-Control-Request-Method'] = opciones.pideMetodo;
  if (opciones.pideCabeceras !== undefined) cabeceras['Access-Control-Request-Headers'] = opciones.pideCabeceras;
  const r = await fetch(`${base}${ruta}`, { method: opciones.metodo ?? 'GET', headers: cabeceras });
  return {
    estado: r.status,
    cuerpo: await r.text(),
    permite: r.headers.get('access-control-allow-origin'),
    vary: r.headers.get('vary') ?? '',
    credenciales: r.headers.get('access-control-allow-credentials'),
    cabeceras: r.headers.get('access-control-allow-headers'),
  };
}

/** ¿Lleva `Vary: Origin`? La cabecera puede traer varias, separadas por comas. */
function varia(r: LoQueVuelve): boolean {
  return r.vary
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .includes('origin');
}

/** Un Express con el middleware de verdad y dos rutas tontas, escuchando donde diga el sistema. */
async function montar(contexto: ContextoDelCors): Promise<{ base: string; cerrar: () => Promise<void> }> {
  const app = express();
  app.use(corsDeLaCasa(contexto));
  app.use(express.json());
  app.get('/api/salud', (_req, res) => {
    res.json({ ok: true });
  });
  app.post('/api/eco', (req, res) => {
    res.json({ eco: req.body as unknown });
  });
  const escucha = app.listen(0, '127.0.0.1');
  await new Promise<void>((lista) => escucha.once('listening', () => lista()));
  const donde = escucha.address();
  const puerto = typeof donde === 'object' && donde !== null ? donde.port : 0;
  return {
    base: `http://127.0.0.1:${String(puerto)}`,
    cerrar: () => new Promise<void>((cerrado) => escucha.close(() => cerrado())),
  };
}

/* Lo que mandan de verdad los clientes de desarrollo de esta casa: los Vite y los Expo web. */
const PUERTOS_DE_CASA = [5173, 5175, 5176, 5177, 5232, 5241, 8081, 8082, 8091];
const AJENOS = [
  'https://malo.example',
  'null',
  'https://harkania.onrender.com.malo.example',
  'https://malo-harkania.onrender.com',
  'http://harkania.onrender.com',
  'https://HARKANIA.ONRENDER.COM',
  'http://localhost.malo.example:5175',
  'http://127.0.0.1.nip.io:8081',
  'https://localhost:5175.malo.example',
];

// ---------------------------------------------------------------------------
paso('En proceso, en desarrollo: lo propio y el bucle local sí; lo ajeno, no');
// ---------------------------------------------------------------------------

{
  const { base, cerrar } = await montar({ produccion: false, publico: 'https://harkania.onrender.com', extra: [] });
  try {
    const sinOrigen = await preguntar(base, '/api/salud');
    comprobar(
      'sin `Origin` se sirve como siempre: 200 y el mismo cuerpo',
      sinOrigen.estado === 200 && sinOrigen.cuerpo === '{"ok":true}',
      sinOrigen,
    );
    comprobar('y sin `Access-Control-Allow-Origin`, que a quien no es un navegador no le sirve', sinOrigen.permite === null, sinOrigen.permite);
    comprobar('pero con `Vary: Origin`, también ahí', varia(sinOrigen), sinOrigen.vary);

    for (const ajeno of AJENOS) {
      const r = await preguntar(base, '/api/salud', { origen: ajeno });
      comprobar(
        `«${ajeno}»: se atiende —el CORS no cierra el servidor— pero SIN permiso para leerlo`,
        r.estado === 200 && r.permite === null,
        r,
      );
      comprobar(`«${ajeno}»: y con \`Vary: Origin\``, varia(r), r.vary);
    }

    for (const propio of ORIGENES_PROPIOS) {
      const r = await preguntar(base, '/api/salud', { origen: propio });
      comprobar(`«${propio}» recibe SU origen de vuelta`, r.permite === propio, r);
      comprobar(`«${propio}»: y nunca credenciales`, r.credenciales === null, r.credenciales);
    }

    for (const puerto of PUERTOS_DE_CASA) {
      for (const anfitrion of ['localhost', '127.0.0.1']) {
        const origen = `http://${anfitrion}:${String(puerto)}`;
        const r = await preguntar(base, '/api/salud', { origen });
        comprobar(`en desarrollo, «${origen}» pasa`, r.permite === origen, r.permite);
      }
    }

    const previo = await preguntar(base, '/api/eco', {
      metodo: 'OPTIONS',
      origen: 'http://localhost:5175',
      pideMetodo: 'POST',
      pideCabeceras: 'x-asiento, content-type, x-otra-que-nadie-manda',
    });
    const lista = (previo.cabeceras ?? '').split(',').map((c) => c.trim().toLowerCase());
    comprobar(
      'el preflight con `x-asiento` desde un origen permitido PASA',
      previo.estado === 204 && previo.permite === 'http://localhost:5175' && lista.includes('x-asiento'),
      previo,
    );
    comprobar(
      'y con la lista CERRADA de cabeceras: las cuatro que mandan los clientes, no las que se le piden',
      lista.length === CABECERAS_PERMITIDAS.length &&
        CABECERAS_PERMITIDAS.every((c) => lista.includes(c.toLowerCase())) &&
        !lista.includes('x-otra-que-nadie-manda'),
      previo.cabeceras,
    );
    comprobar('y sin credenciales', previo.credenciales === null, previo.credenciales);

    const previoAjeno = await preguntar(base, '/api/eco', {
      metodo: 'OPTIONS',
      origen: 'https://malo.example',
      pideMetodo: 'POST',
      pideCabeceras: 'x-asiento',
    });
    comprobar(
      'el mismo preflight desde un origen ajeno NO pasa: ni permiso de origen ni de cabeceras',
      previoAjeno.permite === null && previoAjeno.cabeceras === null,
      previoAjeno,
    );
  } finally {
    await cerrar();
  }
}

// ---------------------------------------------------------------------------
paso('En proceso, en producción: el bucle local ya no, y lo añadido a mano sí');
// ---------------------------------------------------------------------------

{
  const { base, cerrar } = await montar({
    produccion: true,
    publico: 'https://harkania.onrender.com',
    extra: ['https://amigo.example'],
  });
  try {
    for (const origen of ['http://localhost:5175', 'http://127.0.0.1:8081', 'http://[::1]:5173']) {
      const r = await preguntar(base, '/api/salud', { origen });
      comprobar(`en producción, «${origen}» NO pasa`, r.estado === 200 && r.permite === null, r);
    }
    for (const origen of [...ORIGENES_PROPIOS, 'https://amigo.example']) {
      const r = await preguntar(base, '/api/salud', { origen });
      comprobar(`en producción, «${origen}» sí`, r.permite === origen, r.permite);
    }
    const ajeno = await preguntar(base, '/api/salud', { origen: 'https://malo.example' });
    comprobar('y lo ajeno sigue sin pasar', ajeno.permite === null, ajeno.permite);
    const dominioSuspendido = await preguntar(base, '/api/salud', { origen: 'https://harkania.com' });
    comprobar(
      'ni el dominio propio suspendido, `https://harkania.com`, que ya no va fijo en la lista',
      dominioSuspendido.estado === 200 && dominioSuspendido.permite === null,
      dominioSuspendido,
    );
    const sinOrigen = await preguntar(base, '/api/salud');
    comprobar('y sin `Origin` se sirve igual', sinOrigen.estado === 200 && sinOrigen.permite === null, sinOrigen);
  } finally {
    await cerrar();
  }
  /* Y la función sola, con el origen público que diga `PUBLIC_ORIGIN` aunque no sea de la lista. */
  comprobar(
    'el origen de `PUBLIC_ORIGIN` pasa aunque no esté entre los propios escritos',
    origenPermitido('https://otro-dominio.example', { produccion: true, publico: 'https://otro-dominio.example', extra: [] }),
  );
}

// ---------------------------------------------------------------------------
paso('`ORIGENES_PERMITIDOS`: opcional, y lo que no se entiende para el arranque');
// ---------------------------------------------------------------------------

{
  comprobar('ausente es la lista vacía', leerOrigenesPermitidos(undefined).length === 0);
  comprobar('vacía, también', leerOrigenesPermitidos('  ').length === 0 && leerOrigenesPermitidos(',,').length === 0);
  const leidos = leerOrigenesPermitidos(' https://a.example , https://b.example:8443/ruta/ ,http://c.example ');
  comprobar(
    'se reduce cada entrada a su origen: sin ruta ni barra final, que la cabecera no las lleva',
    leidos.join(' ') === 'https://a.example https://b.example:8443 http://c.example',
    leidos,
  );
  for (const mala of ['ejemplo.com', '*', 'null', 'ftp://a.example', 'https://a.example, *']) {
    let error: unknown;
    try {
      leerOrigenesPermitidos(mala);
    } catch (e) {
      error = e;
    }
    comprobar(
      `«${mala}» no se admite, y el error nombra la variable`,
      error instanceof Error && error.message.includes('ORIGENES_PERMITIDOS'),
      error instanceof Error ? error.message : error,
    );
  }
  /*
   * UN COMODÍN EN CUALQUIER PARTE PARA EL ARRANQUE. `new URL('https://*.example')` se lee sin error
   * —el asterisco vale en un nombre para ese analizador—, así que se guardaba como un origen literal
   * que ningún navegador manda nunca: quien lo puso creía haber abierto un dominio entero y no había
   * abierto nada, sin una línea en ningún sitio.
   */
  for (const conComodin of ['https://*.example', 'https://a.example, https://*.b.example', 'http://*', 'https://a.*.example']) {
    let error: unknown;
    try {
      leerOrigenesPermitidos(conComodin);
    } catch (e) {
      error = e;
    }
    comprobar(
      `«${conComodin}», con un comodín, PARA el arranque en vez de aceptarse como un nombre literal`,
      error instanceof Error && error.message.includes('ORIGENES_PERMITIDOS') && error.message.includes('comodín'),
      error instanceof Error ? error.message : leerOrigenesPermitidos(conComodin),
    );
  }
}

// ---------------------------------------------------------------------------
paso('`harkania.com` no va fijo en la lista: el dominio está suspendido y podría cambiar de manos');
// ---------------------------------------------------------------------------

{
  /*
   * Un origen escrito a fuego es un permiso que no caduca. Con el dominio propio suspendido por el
   * registrador, si cambiara de manos su nuevo dueño leería la API desde el navegador de quien
   * visitara su página. Sale de la lista fija; el día que vuelva, se pone desde el panel.
   */
  comprobar(
    'la lista fija de orígenes propios ya no lleva `https://harkania.com`',
    !ORIGENES_PROPIOS.includes('https://harkania.com'),
    ORIGENES_PROPIOS,
  );
  comprobar(
    'y sigue llevando la producción viva, `https://harkania.onrender.com`',
    ORIGENES_PROPIOS.includes('https://harkania.onrender.com'),
    ORIGENES_PROPIOS,
  );
  const enProduccion: ContextoDelCors = { produccion: true, publico: 'https://harkania.onrender.com', extra: [] };
  comprobar(
    'en producción, `https://harkania.com` no lee la API si nadie lo ha puesto',
    !origenPermitido('https://harkania.com', enProduccion),
  );
  comprobar(
    'y el día que vuelva, se pone con `ORIGENES_PERMITIDOS` y entra',
    origenPermitido('https://harkania.com', { ...enProduccion, extra: leerOrigenesPermitidos('https://harkania.com') }),
  );
  comprobar(
    'o, si pasa a ser EL origen del despliegue, con `PUBLIC_ORIGIN`',
    origenPermitido('https://harkania.com', { ...enProduccion, publico: 'https://harkania.com' }),
  );
}

// ---------------------------------------------------------------------------
paso('Y el servidor DE VERDAD lo usa: `index.ts` ya no monta el CORS pelado');
// ---------------------------------------------------------------------------

async function puertoLibre(): Promise<number> {
  const { createServer } = await import('node:net');
  return new Promise<number>((resolver, rechazar) => {
    const sonda = createServer();
    sonda.once('error', rechazar);
    sonda.listen(0, '127.0.0.1', () => {
      const donde = sonda.address();
      const puerto = typeof donde === 'object' && donde !== null ? donde.port : 0;
      sonda.close(() => resolver(puerto));
    });
  });
}

function esperarAQueMuera(proceso: ChildProcess): Promise<void> {
  return new Promise((resolver) => {
    if (proceso.exitCode !== null || proceso.signalCode !== null) {
      resolver();
      return;
    }
    proceso.once('exit', () => resolver());
  });
}

{
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'cors-'));
  const puerto = await puertoLibre();
  const base = `http://127.0.0.1:${String(puerto)}`;
  let dijo = '';
  const servidor = spawn(process.execPath, [TSX, SERVIDOR], {
    cwd: carpeta,
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      PORT: String(puerto),
      NODE_ENV: 'test',
      MESAS_DIR: path.join(carpeta, 'mesas'),
      ORIGENES_PERMITIDOS: 'https://amigo.example',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  servidor.stdout?.on('data', (d: Buffer) => (dijo += d.toString()));
  servidor.stderr?.on('data', (d: Buffer) => (dijo += d.toString()));
  try {
    let arranco = false;
    for (let i = 0; i < 200 && !arranco; i++) {
      try {
        arranco = (await fetch(`${base}/api/salud`)).ok;
      } catch {
        await dormir(250);
      }
    }
    comprobar('el servidor arranca', arranco, dijo.slice(-800));

    const ajeno = await preguntar(base, '/api/arcade', { origen: 'https://malo.example' });
    comprobar(
      'una página ajena pide el catálogo y NO recibe permiso para leerlo (con `cors()` pelado recibía «*»)',
      ajeno.estado === 200 && ajeno.permite === null,
      { estado: ajeno.estado, permite: ajeno.permite },
    );
    const local = await preguntar(base, '/api/arcade', { origen: 'http://localhost:8081' });
    comprobar('la app web de desarrollo, en el 8081, sí', local.permite === 'http://localhost:8081', local.permite);
    const amigo = await preguntar(base, '/api/arcade', { origen: 'https://amigo.example' });
    comprobar(
      'y el que se añadió en `ORIGENES_PERMITIDOS` también: la variable se lee al arrancar',
      amigo.permite === 'https://amigo.example',
      amigo.permite,
    );
    const sinOrigen = await preguntar(base, '/api/arcade');
    comprobar(
      'sin `Origin`, el catálogo sale como siempre',
      sinOrigen.estado === 200 && sinOrigen.cuerpo.includes('"arcades"') && sinOrigen.permite === null,
      { estado: sinOrigen.estado, permite: sinOrigen.permite },
    );
    comprobar('y todas llevan `Vary: Origin`', [ajeno, local, amigo, sinOrigen].every(varia));
    const previo = await preguntar(base, '/api/arcade/mesas/QQQQQ/movimientos', {
      metodo: 'OPTIONS',
      origen: 'http://localhost:8081',
      pideMetodo: 'POST',
      pideCabeceras: 'x-asiento, content-type',
    });
    comprobar(
      'el preflight de un movimiento con `x-asiento` desde el 8081 pasa',
      previo.estado === 204 && previo.permite === 'http://localhost:8081' && (previo.cabeceras ?? '').toLowerCase().includes('x-asiento'),
      previo,
    );
    const previoAjeno = await preguntar(base, '/api/arcade/mesas/QQQQQ/movimientos', {
      metodo: 'OPTIONS',
      origen: 'https://malo.example',
      pideMetodo: 'POST',
      pideCabeceras: 'x-asiento, content-type',
    });
    comprobar(
      'y desde una página ajena NO: sin permiso de origen ni de cabeceras, el navegador no manda la llave',
      previoAjeno.permite === null && previoAjeno.cabeceras === null,
      previoAjeno,
    );
  } finally {
    servidor.kill();
    await esperarAQueMuera(servidor);
    try {
      fs.rmSync(carpeta, { recursive: true, force: true });
    } catch {
      /* en Windows un fichero recién cerrado a veces sigue tomado un instante */
    }
  }
}

{
  /*
   * Y EL COMODÍN, POR EL CABLE: que `leerOrigenesPermitidos` lance no dice que el servidor no
   * arranque —podría estar envuelto en algún sitio—. Se levanta el de verdad con un comodín en la
   * variable y se mira que se PARA, diciendo por qué, y que no llega a contestar.
   */
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'cors-comodin-'));
  const puerto = await puertoLibre();
  let dijo = '';
  /* En un objeto, y no en dos `let`: los rellena un oyente, y el análisis de flujo no lo ve. */
  const final: { murio: boolean; codigo: number | null } = { murio: false, codigo: null };
  const servidor = spawn(process.execPath, [TSX, SERVIDOR], {
    cwd: carpeta,
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      PORT: String(puerto),
      NODE_ENV: 'test',
      MESAS_DIR: path.join(carpeta, 'mesas'),
      ORIGENES_PERMITIDOS: 'https://*.example',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  servidor.stdout?.on('data', (d: Buffer) => (dijo += d.toString()));
  servidor.stderr?.on('data', (d: Buffer) => (dijo += d.toString()));
  servidor.once('exit', (codigo) => {
    final.murio = true;
    final.codigo = codigo;
  });
  try {
    let contesto = false;
    for (let i = 0; i < 240 && !contesto && !final.murio; i++) {
      try {
        contesto = (await fetch(`http://127.0.0.1:${String(puerto)}/api/salud`)).ok;
      } catch {
        await dormir(250);
      }
    }
    /* «comod» y no la palabra entera: un trozo de la salida puede partir la tilde en dos. */
    comprobar(
      'con un comodín en `ORIGENES_PERMITIDOS`, el servidor de verdad NO arranca: se para, y dice por qué',
      final.murio && final.codigo !== 0 && !contesto && dijo.includes('ORIGENES_PERMITIDOS') && dijo.includes('comod'),
      { ...final, contesto, dijo: dijo.slice(-600) },
    );
  } finally {
    if (!final.murio) {
      servidor.kill();
      await esperarAQueMuera(servidor);
    }
    try {
      fs.rmSync(carpeta, { recursive: true, force: true });
    } catch {
      /* en Windows un fichero recién cerrado a veces sigue tomado un instante */
    }
  }
}

{
  /*
   * Y EN EL FUENTE, sin comentarios: el servidor de producción no se puede levantar aquí —exige
   * una base de datos—, así que lo que se afirma de él es que `index.ts` monta ESTE middleware y
   * no el pelado. La prosa que explica por qué se quitó `cors()` no cuenta.
   */
  const indice = sinComentarios(fs.readFileSync(SERVIDOR, 'utf8'));
  comprobar('`index.ts` ya no llama a `cors()` a pelo', !/\bcors\(\s*\)/.test(indice));
  comprobar('y monta el de la lista blanca', /app\.use\(\s*corsDeLaCasa\(/.test(indice));
  comprobar(
    'con el modo de producción sacado de `NODE_ENV`, y no escrito a mano',
    /produccion:\s*process\.env\.NODE_ENV\s*===\s*'production'/.test(indice),
  );
  /* La vacuna: las búsquedas cazarían lo que buscan si estuviera. */
  comprobar(
    'y las búsquedas cazarían un `cors()` pelado si volviera',
    /\bcors\(\s*\)/.test(sinComentarios('app.use(cors());')) && !/\bcors\(\s*\)/.test(sinComentarios('// app.use(cors());')),
  );
  const envEjemplo = fs.readFileSync(path.join(REPO, '.env.example'), 'utf8');
  const render = fs.readFileSync(path.join(REPO, 'render.yaml'), 'utf8');
  comprobar('`ORIGENES_PERMITIDOS` está documentada en `.env.example`', /^ORIGENES_PERMITIDOS=/m.test(envEjemplo));
  comprobar(
    'y en `render.yaml` como opcional, en un comentario y no como clave: no se le exige a nadie',
    render.includes('ORIGENES_PERMITIDOS') && !/key:\s*ORIGENES_PERMITIDOS/.test(render),
  );
}

console.log('');
if (fallos.length > 0) {
  console.log(`✘ ${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
  for (const f of fallos) console.log(`   · ${f}`);
  process.exit(1);
}

/* EL GUARDIA: un comprobador que se cae a mitad sin decirlo se parece mucho a uno verde. */
const COMPROBACIONES_ESCRITAS = 86;
if (hechas < COMPROBACIONES_ESCRITAS) {
  console.log(`Sólo se han hecho ${hechas} de las ${COMPROBACIONES_ESCRITAS} comprobaciones escritas.`);
  process.exit(2);
}

console.log(
  `✔ ${hechas} comprobaciones. La API ya no se deja leer desde cualquier página: sólo desde los\n` +
    '  orígenes propios, desde lo que se añada a mano en `ORIGENES_PERMITIDOS`, y —fuera de\n' +
    '  producción— desde el bucle local en cualquier puerto. Lo que llega sin `Origin` se sirve\n' +
    '  como siempre, el preflight con `x-asiento` pasa sólo desde donde toca y con la lista cerrada\n' +
    '  de cabeceras, y el servidor de verdad lo monta en lugar del `cors()` pelado.',
);
process.exit(0);
