/**
 * Que una categoría SIN campo heredado se pueda dar de alta, leer y borrar.
 *
 *   npm run verify:entidades
 *
 * POR QUÉ HACE FALTA. Una partida guarda sus cosas en `suspects`, `rooms` y
 * `weapons`, con esos nombres, desde antes de que existieran las categorías. El
 * lector genérico (`entidadesDe`) ya sabía mirar primero en `game.entidades`,
 * pero NADIE ESCRIBÍA AHÍ: las rutas de alta tenían el nombre de la cosa metido
 * en la URL, así que una categoría nueva no tenía por dónde crearse. El destino
 * estaba puesto y no salía ningún tren.
 *
 * Se descubrió con el segundo juego: El Misterio de la Momia tiene «ritos», que
 * no son personas ni lugares ni objetos. Es la primera categoría de la
 * plataforma que no cabe en ninguno de los tres campos, y por eso es exactamente
 * la que hay que probar: con las tres de siempre, esta prueba pasaría aunque el
 * almacén genérico no funcionase.
 *
 * AISLAMIENTO. Carpeta temporal sin `.env` al lado y entorno enumerado a mano.
 * En Windows, vaciar una variable la BORRA, y entonces dotenv carga el fichero
 * de verdad —con la clave de Anthropic y el Atlas de producción—. La lección
 * está en ARCHITECTURE.md y costó cara.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { entidadesDe, manifiestoDe } from '../../shared/juegos';
import type { GameSession } from '../../shared/types';

const REPO = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const TSX = path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SERVIDOR = path.join(REPO, 'server', 'src', 'index.ts');
const PUERTO = 5400 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PUERTO}/api`;
const CONTRASENA = 'contrasena-de-la-prueba-de-entidades';

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (!condicion) fallos.push(`${que}${detalle === undefined ? '' : ` · ${JSON.stringify(detalle)}`}`);
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gm-entidades-'));
const ahora = new Date().toISOString();

/** Una partida de la Momia, que es el juego con una categoría sin campo. */
const game: GameSession = {
  id: 'tumba',
  name: 'Expedición de comprobación',
  status: 'draft',
  createdAt: ahora,
  updatedAt: ahora,
  suspects: [],
  rooms: [],
  weapons: [],
  boardMode: 'generated',
  settings: { language: 'es', juego: 'momia' },
} as unknown as GameSession;

fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
fs.writeFileSync(
  path.join(dir, 'data', 'db.json'),
  JSON.stringify({ games: [game], messages: {}, config: { model: 'claude-fable-5' }, live: [], accounts: [] }),
  'utf8',
);

let servidor: ChildProcess | undefined;
let galleta = '';

async function pedir(
  ruta: string,
  opciones: { metodo?: string; cuerpo?: unknown } = {},
): Promise<{ estado: number; datos: any }> {
  const r = await fetch(`${BASE}${ruta}`, {
    method: opciones.metodo ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(galleta ? { Cookie: galleta } : {}),
    },
    ...(opciones.cuerpo === undefined ? {} : { body: JSON.stringify(opciones.cuerpo) }),
  });
  const texto = await r.text();
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    datos = texto;
  }
  return { estado: r.status, datos };
}

async function esperarServidor(): Promise<void> {
  /*
   * Basta con que CONTESTE, sea lo que sea. Aqui la puerta del taller esta
   * cerrada con contrasena —hace falta para probar las rutas de entidades— asi
   * que `/games` responde 401 hasta que se entra. Esperar un 200 era esperar
   * para siempre: el servidor llevaba en pie desde el primer segundo.
   */
  for (let i = 0; i < 120; i++) {
    try {
      await fetch(`${BASE}/games`);
      return;
    } catch {
      /* todavía no escucha */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('el servidor no arrancó');
}

async function jugar(): Promise<void> {
  paso('Entrar en el taller');
  const entrada = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: CONTRASENA }),
  });
  comprobar('la puerta abre', entrada.status === 200);
  galleta = (entrada.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
  comprobar('deja una galleta de sesión', galleta.length > 10);

  const manifiesto = manifiestoDe('momia');
  const ritos = manifiesto.categorias.find((c) => c.id === 'ritos');
  comprobar('la Momia declara la categoría «ritos»', Boolean(ritos));
  comprobar(
    'y NO tiene campo heredado, que es lo que la hace la prueba buena',
    ritos?.almacen === undefined,
    ritos?.almacen,
  );

  paso('Dar de alta un rito, que no cabe en ningún campo de CLUEDO');
  const alta = await pedir('/games/tumba/entidades/ritos', {
    metodo: 'POST',
    cuerpo: { name: 'Rito del Agua', description: 'Se vierte agua del Nilo sobre el umbral.' },
  });
  comprobar('el alta responde 200', alta.estado === 200, alta.datos);

  const guardada = alta.datos as GameSession;
  comprobar('la partida vuelve con el rito dentro', entidadesDe(guardada, 'ritos').length === 1);
  const rito = entidadesDe(guardada, 'ritos')[0];
  comprobar('con su nombre', rito?.name === 'Rito del Agua', rito);
  comprobar('y con un id de verdad', (rito?.id ?? '').length > 5, rito?.id);
  comprobar(
    'y NO se ha colado en ninguno de los tres campos heredados',
    guardada.suspects.length === 0 && guardada.rooms.length === 0 && guardada.weapons.length === 0,
    { s: guardada.suspects.length, r: guardada.rooms.length, w: guardada.weapons.length },
  );

  paso('Que sobreviva a releer la partida del almacén');
  const releida = await pedir('/games/tumba');
  comprobar('la partida se lee', releida.estado === 200, releida.datos);
  const dePersistencia = (releida.datos.game ?? releida.datos) as GameSession;
  comprobar(
    'y el rito sigue ahí después de guardar y volver a leer',
    entidadesDe(dePersistencia, 'ritos').length === 1,
    dePersistencia.entidades,
  );

  paso('Editarlo');
  const edicion = await pedir('/games/tumba/entidades/ritos', {
    metodo: 'POST',
    cuerpo: { id: rito?.id, name: 'Rito del Agua Negra' },
  });
  comprobar('la edición responde 200', edicion.estado === 200, edicion.datos);
  comprobar(
    'y cambia el nombre sin duplicar la entidad',
    entidadesDe(edicion.datos as GameSession, 'ritos').length === 1 &&
      entidadesDe(edicion.datos as GameSession, 'ritos')[0]?.name === 'Rito del Agua Negra',
    entidadesDe(edicion.datos as GameSession, 'ritos'),
  );

  paso('Las categorías con campo heredado siguen yendo al suyo');
  const camara = await pedir('/games/tumba/entidades/camaras', {
    metodo: 'POST',
    cuerpo: { name: 'Cámara del Barquero' },
  });
  comprobar('el alta de una cámara responde 200', camara.estado === 200, camara.datos);
  const conCamara = camara.datos as GameSession;
  comprobar(
    'y la cámara va a `rooms`, no a `entidades`',
    conCamara.rooms.length === 1 && conCamara.entidades?.camaras === undefined,
    { rooms: conCamara.rooms.length, entidades: Object.keys(conCamara.entidades ?? {}) },
  );
  comprobar(
    'y se lee igual por categoría',
    entidadesDe(conCamara, 'camaras')[0]?.name === 'Cámara del Barquero',
  );

  paso('Una categoría que este juego no tiene se rechaza');
  const inventada = await pedir('/games/tumba/entidades/dragones', {
    metodo: 'POST',
    cuerpo: { name: 'Smaug' },
  });
  comprobar('responde 404 y no la crea', inventada.estado === 404, inventada.datos);

  paso('Borrarlo');
  const borrado = await pedir(`/games/tumba/entidades/ritos/${rito?.id}`, { metodo: 'DELETE' });
  comprobar('el borrado responde 200', borrado.estado === 200, borrado.datos);
  comprobar(
    'y el rito ya no está',
    entidadesDe(borrado.datos as GameSession, 'ritos').length === 0,
    (borrado.datos as GameSession).entidades,
  );
}

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
    },
    stdio: 'ignore',
  });
  await esperarServidor();
  await jugar();
} catch (e) {
  fallos.push(`la prueba se cayó: ${e instanceof Error ? e.message : String(e)}`);
} finally {
  servidor?.kill();
  await new Promise((r) => setTimeout(r, 600));
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    console.log(`  (queda por limpiar ${dir})`);
  }
}

console.log(`\n${hechas} comprobaciones`);
if (fallos.length === 0) {
  console.log('Una categoría sin campo heredado se guarda, se lee y se borra.');
  process.exit(0);
}
console.log(`\n${fallos.length} FALLOS:\n`);
for (const f of fallos) console.log(`  ✗ ${f}`);
process.exit(1);
