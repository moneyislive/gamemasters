/**
 * Un servidor con OTRO reparto de juegos, sin recompilar nada.
 *
 *   npm run verify:reparto
 *
 * ═══ QUÉ AFIRMA, Y POR QUÉ ES LA PRUEBA QUE FALTABA ═══
 *
 * El objetivo declarado de toda esta arquitectura es que el mismo binario sirva
 * a países distintos con repartos distintos: aquí se juega a la Momia, allí a
 * las Sombras. Sin eso hay que compilar un servidor por país, y eso no escala.
 *
 * Lo que hasta hoy hacía imposible probarlo no era la falta de un interruptor:
 * era que `manifiestoDe` devolvía CLUEDO para cualquier juego que no estuviera,
 * así que un servidor «sin CLUEDO» seguía jugando CLUEDO en cuanto alguien
 * abría una partida suya. La lista de instalados era decorativa.
 *
 * Así que esto arranca un servidor DE VERDAD con `JUEGOS=sombras` y comprueba
 * las tres cosas que tienen que pasar a la vez:
 *
 *   1. Crear una partida de un juego que no está se rechaza.
 *   2. Una partida GUARDADA de un juego que no está se puede LISTAR —esconderla
 *      haría creer que se ha borrado— y NO se puede abrir. Este es el
 *      importante: antes se abría y se jugaba entera como CLUEDO.
 *   3. Y el juego que sí está se juega igual que siempre.
 *
 * ═══ POR QUÉ ARRANCA UN SERVIDOR Y NO LLAMA A LAS FUNCIONES ═══
 *
 * Porque lo que se prueba es el ARRANQUE, y ahí estaba el fallo. La primera vez
 * que esto se ejecutó, el servidor imprimía «[juegos] instalados: sombras» y
 * creaba partidas de CLUEDO tan contento.
 *
 * La causa: `shared/juegos/index.ts` SE CARGA DOS VECES —una prueba lo importa
 * como `../../shared/juegos` y `staleness.ts` como `./juegos`, y el cargador las
 * trata como módulos distintos, cosa que ese fichero lleva documentada desde
 * hace tiempo—. La tabla sobrevivía porque está anclada con `Symbol.for`; el
 * filtro no, porque la segunda carga volvía a dar de alta los tres juegos
 * DESPUÉS de haberlos quitado.
 *
 * Llamar a `instalarSoloEstos` desde una prueba en proceso habría dado verde y
 * se habría saltado exactamente eso.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { GameSession } from '../../shared/types';

const REPO = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const TSX = path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SERVIDOR = path.join(REPO, 'server', 'src', 'index.ts');
// Puerto al azar: Windows tarda en soltar el del servidor recién matado.
const PUERTO = 6600 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PUERTO}/api`;

/** El reparto de este servidor. CLUEDO y la Momia NO están. */
const REPARTO = 'sombras';

let hechas = 0;
const fallos: string[] = [];
function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(`${que}${detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 300)}`}`);
}
function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

async function pedir(
  ruta: string,
  opciones: { metodo?: string; cuerpo?: unknown } = {},
): Promise<{ estado: number; datos: any }> {
  const r = await fetch(`${BASE}${ruta}`, {
    method: opciones.metodo ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
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

/**
 * Se siembra una partida de un juego que este servidor NO instala.
 *
 * Es el caso que de verdad importa y no se puede montar por las rutas —crear
 * una partida de CLUEDO aquí se rechaza, que es el punto 2—, así que se escribe
 * directamente en el almacén: es exactamente lo que se encontraría un servidor
 * que hereda una base de datos con partidas de todos los países.
 */
function sembrar(dir: string): void {
  const ahora = '2026-08-30T21:00:00.000Z';
  const ajena: GameSession = {
    id: 'partida-de-otro-pais',
    name: 'Un caso que aquí no se juega',
    status: 'ready',
    createdAt: ahora,
    updatedAt: ahora,
    entidades: {
      escoltas: [],
      pasos: [],
      enseres: [],
    },
    boardMode: 'generated',
    settings: { language: 'es', juego: 'cluedo' },
  };
  fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'data', 'db.json'),
    JSON.stringify({ games: [ajena], messages: {}, config: {}, live: [], accounts: [] }, null, 2),
    'utf8',
  );
}

async function comprobarElReparto(): Promise<void> {
  paso('Un juego que no está no se puede empezar');

  const nueva = await pedir('/games', { metodo: 'POST', cuerpo: { name: 'Prueba', juego: 'cluedo' } });
  comprobar('crear una partida de CLUEDO se rechaza', nueva.estado === 400, nueva);
  comprobar(
    'y el mensaje nombra el juego que se pidió',
    typeof nueva.datos?.error === 'string' && nueva.datos.error.includes('cluedo'),
    nueva.datos,
  );

  paso('Y una partida guardada de ese juego NO se juega como otro');
  /*
   * ═══ ESTE ES EL PUNTO ═══
   *
   * Antes, `manifiestoDe('cluedo')` en un servidor sin CLUEDO devolvía CLUEDO
   * igual, porque el respaldo era el propio CLUEDO. Aquí el juego que falta ES
   * CLUEDO, así que el fallo antiguo no se puede reproducir con él — pero la
   * regla que lo cierra es la misma y se comprueba igual: la partida existe,
   * está en la base, y abrir su mesa no puede acabar en una velada.
   */
  const listado = await pedir('/games');
  const listadas: string[] = Array.isArray(listado.datos)
    ? listado.datos.map((g: { id: string }) => g.id)
    : [];
  comprobar(
    'la partida ajena sigue en la base y se puede listar',
    listadas.includes('partida-de-otro-pais'),
    { listadas, porque: 'esconderla haría creer que se ha borrado' },
  );

  const abrir = await pedir('/games/partida-de-otro-pais/live/abrir', { metodo: 'POST' });
  comprobar(
    'pero su mesa no se abre',
    abrir.estado >= 400,
    { estado: abrir.estado, datos: abrir.datos, porque: 'antes se abría y se jugaba entera como CLUEDO' },
  );
  comprobar(
    'y quien lo pide se entera de qué juegos SÍ hay aquí',
    abrir.estado !== 500,
    { estado: abrir.estado, porque: 'no hay nada roto: hay algo que aquí no se puede hacer' },
  );

  paso('El juego que sí está se juega igual que siempre');

  const suya = await pedir('/games', {
    metodo: 'POST',
    cuerpo: { name: 'Una noche de Iga', juego: 'sombras' },
  });
  comprobar('se puede crear una partida del juego instalado', suya.estado === 201, suya);
  comprobar(
    'y nace declarando su juego',
    (suya.datos as GameSession)?.settings?.juego === 'sombras',
    (suya.datos as GameSession)?.settings,
  );
}

// ---------------------------------------------------------------------------

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reparto-'));
sembrar(dir);
let servidor: ChildProcess | undefined;

console.log(`\nUn servidor que solo instala «${REPARTO}»`);

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
      // Lo único que cambia respecto de un servidor normal.
      JUEGOS: REPARTO,
    },
    stdio: 'ignore',
  });
  await esperarServidor();
  await comprobarElReparto();
} catch (e) {
  fallos.push(`la prueba se cayó: ${e instanceof Error ? e.message : String(e)}`);
} finally {
  servidor?.kill();
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* en Windows a veces el fichero sigue tomado un instante */
  }
}

console.log('');
if (fallos.length === 0) {
  console.log(`${hechas} comprobaciones`);
  console.log(
    '\nEl mismo binario sirve un reparto distinto, y lo que no está no se juega como otra cosa.',
  );
  process.exit(0);
}
console.log(`${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
for (const f of fallos) console.log(`  ✗ ${f}`);
process.exit(1);
