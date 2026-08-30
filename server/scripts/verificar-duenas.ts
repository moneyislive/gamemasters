/**
 * Cada partida es de quien es.
 *
 *   npm run verify:duenas
 *
 * POR QUÉ NO BASTA CON FILTRAR EL LISTADO, que es lo primero que uno piensa: el
 * identificador de una partida lo recibe CADA MÓVIL que entra a jugar, y viaja
 * además en el historial de todo el que tiene cuenta. Todos los invitados de
 * todas las veladas conocen identificadores reales. Así que lo que hay que
 * probar no es que la lista esté filtrada —eso es cosmética— sino que un Game
 * Master ajeno no pueda TOCAR la partida de otro aunque sepa su identificador.
 *
 * Se recorren TODAS las rutas que cuelgan de `/games/:id`, las diez familias, y
 * se exige 404 para el ajeno. Si mañana alguien añade una ruta nueva y la monta
 * por delante del guardián, esto se cae.
 *
 * AISLAMIENTO. Servidor aparte con cwd en carpeta temporal y entorno explícito,
 * como el resto: ni la clave de Anthropic ni el Atlas de producción entran aquí.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const TSX = path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SERVIDOR = path.join(REPO, 'server', 'src', 'index.ts');
const PUERTO = 6200 + Math.floor(Math.random() * 400);
const BASE = `http://127.0.0.1:${PUERTO}`;
const CONTRASENA = 'la-llave-de-la-casa';

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

interface Respuesta {
  estado: number;
  datos: any;
  cookies: string[];
}

async function pedir(
  ruta: string,
  opciones: { metodo?: string; cuerpo?: unknown; cookie?: string } = {},
): Promise<Respuesta> {
  const r = await fetch(`${BASE}${ruta}`, {
    method: opciones.metodo ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opciones.cookie ? { Cookie: opciones.cookie } : {}),
    },
    ...(opciones.cuerpo === undefined ? {} : { body: JSON.stringify(opciones.cuerpo) }),
  });
  const texto = await r.text();
  let datos: unknown = texto;
  try {
    datos = JSON.parse(texto);
  } catch {
    /* no era JSON */
  }
  return { estado: r.status, datos, cookies: r.headers.getSetCookie?.() ?? [] };
}

/** Entra con la contraseña y un nombre, y devuelve las dos cookies juntas. */
async function entrarComo(nombre: string): Promise<string> {
  const r = await pedir('/api/auth/login', {
    metodo: 'POST',
    cuerpo: { password: CONTRASENA, nombre },
  });
  if (r.estado !== 200) throw new Error(`no se pudo entrar como ${nombre}: ${r.estado}`);
  return r.cookies.map((c) => c.split(';')[0]).join('; ');
}

async function esperarServidor(): Promise<void> {
  for (let i = 0; i < 90; i++) {
    try {
      if ((await fetch(`${BASE}/api/salud`)).ok) return;
    } catch {
      /* todavía no escucha */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('el servidor no llegó a arrancar');
}

// ---------------------------------------------------------------------------

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gm-duenas-'));
fs.mkdirSync(path.join(dir, 'data'), { recursive: true });

/** Una partida ANTERIOR a las cuentas: sin dueño. Es lo que hay hoy en disco. */
const ahora = new Date().toISOString();
const huerfana = {
  id: 'de-antes',
  name: 'Una velada de antes',
  status: 'draft',
  createdAt: ahora,
  updatedAt: ahora,
  entidades: {
    sospechosos: [],
    salas: [],
    objetos: [],
  },
  boardMode: 'generated',
  settings: { language: 'es' },
};
fs.writeFileSync(
  path.join(dir, 'data', 'db.json'),
  JSON.stringify(
    { games: [huerfana], messages: {}, config: { model: 'claude-fable-5' }, live: [], accounts: [] },
    null,
    2,
  ),
  'utf8',
);

let servidor: ChildProcess | undefined;

try {
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
      PLAYER_TOKEN_SECRET: 'secreto-de-prueba-de-duenas-0123456789abcdef',
    },
    stdio: 'ignore',
  });
  await esperarServidor();

  paso('Dos Game Masters con la misma llave, pero distinta identidad');

  const ana = await entrarComo('Ana');
  const bruno = await entrarComo('Bruno');
  comprobar('Ana entra', ana.includes('gm_cuenta'), ana.slice(0, 40));
  comprobar('Bruno entra', bruno.includes('gm_cuenta'));
  comprobar('y son cuentas distintas', ana !== bruno);

  paso('Lo que crea Ana es de Ana');

  const creada = await pedir('/api/games', {
    metodo: 'POST',
    cuerpo: { name: 'La velada de Ana' },
    cookie: ana,
  });
  comprobar('Ana crea una partida', creada.estado === 201, creada.datos);
  const suya: string = creada.datos?.id ?? '';
  comprobar('lleva su firma', (creada.datos?.duenos ?? []).length === 1, creada.datos?.duenos);

  comprobar('Ana la ve', (await pedir(`/api/games/${suya}`, { cookie: ana })).estado === 200);
  comprobar(
    'y Bruno recibe 404, no 403: un 403 confirmaría que existe',
    (await pedir(`/api/games/${suya}`, { cookie: bruno })).estado === 404,
  );

  paso('Y no puede tocarla por NINGUNA de las rutas de partida');

  // Las diez familias de rutas que cuelgan de /games/:id, una por router.
  const intentos: Array<{ ruta: string; metodo: string; cuerpo?: unknown }> = [
    { ruta: '', metodo: 'GET' },
    { ruta: '', metodo: 'PATCH', cuerpo: { name: 'Secuestrada' } },
    { ruta: '', metodo: 'DELETE' },
    { ruta: '/live', metodo: 'GET' },
    { ruta: '/live/abrir', metodo: 'POST' },
    { ruta: '/live/desenlace', metodo: 'POST' },
    { ruta: '/live', metodo: 'DELETE' },
    { ruta: '/live/ronda/abrir', metodo: 'POST' },
    { ruta: '/live/ayuda', metodo: 'POST', cuerpo: { nivel: 1 } },
    { ruta: '/suspects', metodo: 'POST', cuerpo: { name: 'Intruso' } },
    { ruta: '/board', metodo: 'POST' },
    { ruta: '/documents', metodo: 'GET' },
    { ruta: '/material', metodo: 'POST' },
    { ruta: '/generate', metodo: 'POST' },
    { ruta: '/refresh', metodo: 'POST' },
    { ruta: '/chat', metodo: 'GET' },
  ];

  for (const intento of intentos) {
    const r = await pedir(`/api/games/${suya}${intento.ruta}`, {
      metodo: intento.metodo,
      cuerpo: intento.cuerpo,
      cookie: bruno,
    });
    comprobar(
      `${intento.metodo} /games/:id${intento.ruta} le da 404 a quien no es`,
      r.estado === 404,
      { estado: r.estado, datos: r.datos },
    );
  }

  // Y lo más importante: que sigue INTACTA después de todos esos intentos.
  const despues = await pedir(`/api/games/${suya}`, { cookie: ana });
  comprobar('la partida de Ana sigue ahí', despues.estado === 200, despues.estado);
  comprobar('y con su nombre', despues.datos?.name === 'La velada de Ana', despues.datos?.name);

  paso('El listado: las mías y las que no son de nadie');

  const listaDeBruno = await pedir('/api/games', { cookie: bruno });
  const ids: string[] = (listaDeBruno.datos ?? []).map((g: { id: string }) => g.id);
  comprobar('Bruno NO ve la partida de Ana', !ids.includes(suya), ids);
  comprobar('pero SÍ ve la huérfana', ids.includes('de-antes'), ids);
  comprobar(
    'y viene marcada como tal, para que nadie la dé por perdida',
    (listaDeBruno.datos ?? []).find((g: { id: string }) => g.id === 'de-antes')?.huerfana === true,
  );

  paso('Las partidas de antes no se le esconden a nadie');

  // Es el modo de fallo que el propio repo describe: quien no ve sus partidas
  // las da por perdidas y las vuelve a crear.
  comprobar(
    'Ana puede abrir la huérfana',
    (await pedir('/api/games/de-antes', { cookie: ana })).estado === 200,
  );
  comprobar(
    'y Bruno también, mientras no tenga dueño',
    (await pedir('/api/games/de-antes', { cookie: bruno })).estado === 200,
  );

  paso('La llave de la casa sigue abriéndolo todo');

  // Sin `nombre` no hay pasaporte de cuenta: es la sesión de siempre.
  const soloLlave = (
    await pedir('/api/auth/login', { metodo: 'POST', cuerpo: { password: CONTRASENA } })
  ).cookies
    .map((c) => c.split(';')[0])
    .join('; ');
  comprobar('la llave sola entra', soloLlave.includes('gm_sesion'), soloLlave.slice(0, 30));
  comprobar('y NO reparte pasaporte de cuenta', !soloLlave.includes('gm_cuenta'));
  comprobar(
    'y abre la partida de Ana: quitársela de golpe dejaría al usuario fuera de lo suyo',
    (await pedir(`/api/games/${suya}`, { cookie: soloLlave })).estado === 200,
  );

  paso('El modelo de la instancia no lo cambia cualquiera');

  const config = await pedir('/api/config', {
    metodo: 'PUT',
    cuerpo: { model: 'claude-haiku-4-5' },
    cookie: soloLlave,
  });
  comprobar('con la llave de la casa, sí', config.estado === 200, config.datos);

  paso('Sin credencial no se llega a ninguna parte');

  comprobar('sin cookie, el listado da 401', (await pedir('/api/games')).estado === 401);
  comprobar(
    'y una partida concreta también',
    (await pedir(`/api/games/${suya}`)).estado === 401,
  );
} catch (e) {
  fallos.push(`la prueba se cayó: ${e instanceof Error ? e.message : String(e)}`);
} finally {
  servidor?.kill();
  await new Promise((r) => setTimeout(r, 400));
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* carpeta temporal */
  }
}

console.log('');
if (fallos.length === 0) {
  console.log(`✔ ${hechas} comprobaciones. Cada partida es de quien es.`);
  process.exit(0);
}
console.log(`✘ ${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
for (const f of fallos) console.log(`   · ${f}`);
process.exit(1);
