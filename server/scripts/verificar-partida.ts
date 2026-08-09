/**
 * Una velada entera, jugada contra el servidor de verdad por HTTP.
 *
 *   npm run verify:partida
 *
 * POR QUÉ HACE FALTA ADEMÁS DEL MAESTRO DE ORO. Aquél llama a las funciones
 * directamente y demuestra que lo que producen no ha cambiado. Pero la app del
 * jugador no llama a funciones: manda JSON por un cable. Entre las dos cosas
 * hay una frontera que TypeScript no puede vigilar —el cuerpo de una petición
 * es `unknown`— y es justo donde vivía el error más silencioso de este
 * refactor: `api.acusar` seguía mandando `{murdererId, weaponId, roomId}`
 * mientras el servidor ya esperaba `{respuestas}`. Los tres paquetes
 * compilaban y la acusación se habría perdido en la mesa, en silencio.
 *
 * Así que esto arranca el servidor de verdad, aislado, y juega: entra con un
 * código, avisa de que está listo, elige sala, lee sus pistas, ve cerrarse la
 * ronda, acusa y llega al desenlace. Comprobando en cada paso.
 *
 * AISLAMIENTO. Se arranca con el directorio de trabajo en una carpeta temporal
 * sin `.env` al lado, que es lo que hace que no se cargue ni la clave de
 * Anthropic ni el Atlas de producción. La lección está en ARCHITECTURE.md y
 * costó cara: en Windows, vaciar una variable de entorno la BORRA, y entonces
 * dotenv carga el fichero de verdad.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generateBoardLayout } from '../src/board/generator';
import { generateDemoPlot } from '../src/plot/demoPlot';
import { manifiestoDe, ejes as ejesDe } from '../../shared/juegos';
import type { GameSession } from '../../shared/types';
import type { LiveSession, VistaJugador } from '../../shared/live';

const REPO = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const TSX = path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SERVIDOR = path.join(REPO, 'server', 'src', 'index.ts');
const PUERTO = 5311;
const BASE = `http://127.0.0.1:${PUERTO}/api`;

// ---------------------------------------------------------------------------
// Comprobaciones
// ---------------------------------------------------------------------------

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(`${que}${detalle === undefined ? '' : `\n      ${JSON.stringify(detalle)?.slice(0, 200)}`}`);
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

// ---------------------------------------------------------------------------
// La partida sembrada
// ---------------------------------------------------------------------------

const GENTE = ['Ana', 'Bruno', 'Carla', 'Dani'];
const SALAS = ['Salón', 'Cocina', 'Biblioteca', 'Invernadero'];
const OBJETOS = ['Candelabro', 'Abrecartas', 'Cuerda'];

function sembrar(dir: string): { game: GameSession; sesion: LiveSession } {
  const ahora = new Date().toISOString();
  const game: GameSession = {
    id: 'prueba',
    name: 'Velada de comprobación',
    status: 'ready',
    createdAt: ahora,
    updatedAt: ahora,
    suspects: GENTE.map((name, i) => ({ id: `s${i}`, name })),
    rooms: SALAS.map((name, i) => ({ id: `r${i}`, name })),
    weapons: OBJETOS.map((name, i) => ({ id: `w${i}`, name })),
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
    hints: [{ level: 1, text: 'Un empujón.' }],
    finale: { reconstruction: 'Así fue.', confession: 'Fui yo.', epilogue: 'Fin.' },
  };

  const sesion: LiveSession = {
    id: game.id,
    code: 'PRUEBA',
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
  return { game, sesion };
}

// ---------------------------------------------------------------------------
// Cliente HTTP mínimo
// ---------------------------------------------------------------------------

async function pedir(
  ruta: string,
  opciones: { metodo?: string; cuerpo?: unknown; testigo?: string } = {},
): Promise<{ estado: number; datos: any }> {
  const r = await fetch(`${BASE}${ruta}`, {
    method: opciones.metodo ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opciones.testigo ? { Authorization: `Bearer ${opciones.testigo}` } : {}),
    },
    ...(opciones.cuerpo === undefined ? {} : { body: JSON.stringify(opciones.cuerpo) }),
  });
  const texto = await r.text();
  let datos: unknown = texto;
  try {
    datos = JSON.parse(texto);
  } catch {
    /* respuesta no JSON: se deja el texto */
  }
  return { estado: r.status, datos };
}

async function esperarServidor(): Promise<void> {
  for (let i = 0; i < 90; i++) {
    try {
      const r = await fetch(`${BASE}/games`);
      if (r.ok) return;
    } catch {
      /* todavía no escucha */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('el servidor no llegó a arrancar');
}

// ---------------------------------------------------------------------------

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gm-verif-'));
const { game } = sembrar(dir);
const manifiesto = manifiestoDe(game.settings.juego);

let servidor: ChildProcess | undefined;

async function jugar(): Promise<void> {
  paso('Entrar con el código personal');
  const entrada = await pedir('/jugar/entrar', {
    metodo: 'POST',
    cuerpo: { code: 'PRUEBA', joinCode: 'CODIG0' },
  });
  comprobar('entrar responde 200', entrada.estado === 200, entrada.datos);
  const testigo: string = entrada.datos?.token ?? '';
  comprobar('devuelve un testigo', testigo.length > 20);

  const malo = await pedir('/jugar/entrar', {
    metodo: 'POST',
    cuerpo: { code: 'PRUEBA', joinCode: 'NOEXISTE' },
  });
  comprobar('un código inventado no entra', malo.estado === 401);

  const vista = async (): Promise<VistaJugador> => {
    const r = await pedir('/jugar/vista', { testigo });
    comprobar('la vista responde 200', r.estado === 200, r.datos);
    return r.datos.vista as VistaJugador;
  };

  paso('La sala de espera');
  let v = await vista();
  comprobar('fase lobby', v.sesion.phase === 'lobby', v.sesion.phase);
  comprobar('no llega la solución', !('desenlace' in v) || v.desenlace === undefined);
  comprobar('llega mi personaje', Boolean(v.yo.characterName));
  comprobar('llega el caso', Boolean(v.caso.sinopsis));
  comprobar(
    'llegan los ejes del juego',
    Array.isArray(v.ejes) && v.ejes.length === ejesDe(manifiesto).length,
    v.ejes?.map((e) => e.ejeId),
  );
  comprobar(
    'cada eje trae opciones',
    (v.ejes ?? []).every((e) => e.opciones.length > 0),
  );
  comprobar('llega el tablero', Boolean(v.tablero?.plano));

  paso('Avisar de que estoy listo');
  const listo = await pedir('/jugar/listo', { metodo: 'POST', testigo, cuerpo: { listo: true } });
  comprobar('listo responde 200', listo.estado === 200, listo.datos);
  v = await vista();
  comprobar('queda constancia', v.yo.pediEmpezar === true && v.sesion.listos === 1);

  paso('Quien dirige abre la ronda');
  const abrir = await pedir(`/games/${game.id}/live/ronda/abrir`, {
    metodo: 'POST',
    cuerpo: { minutos: 10 },
  });
  comprobar('abrir ronda responde 200', abrir.estado === 200, abrir.datos);
  v = await vista();
  comprobar('la ronda está abierta', v.sesion.phase === 'ronda-abierta', v.sesion.phase);
  comprobar('es la ronda 1', v.sesion.round === 1);
  comprobar('hay reloj', Boolean(v.sesion.roundEndsAt));

  paso('Elegir sala y leer lo que hay');
  const conPista = game.plot!.clues.find((c) => c.round === 1 && c.roomId)?.roomId ?? 'r0';
  const elegir = await pedir('/jugar/sala', { metodo: 'POST', testigo, cuerpo: { roomId: conPista } });
  comprobar('elegir sala responde 200', elegir.estado === 200, elegir.datos);
  v = await vista();
  comprobar('estoy en esa sala', v.miSala === conPista, v.miSala);
  comprobar('me dan las pistas de aquí', v.misPistas.length > 0, v.misPistas.length);
  comprobar(
    'pero NO lo que significan',
    v.misPistas.every((p) => p.pointsTo === undefined),
  );

  paso('Cerrar la ronda');
  const cerrar = await pedir(`/games/${game.id}/live/ronda/cerrar`, { metodo: 'POST' });
  comprobar('cerrar responde 200', cerrar.estado === 200, cerrar.datos);
  v = await vista();
  comprobar('la ronda está cerrada', v.sesion.phase === 'ronda-cerrada');
  comprobar('lo hallado pasa al tablón', v.tablon.length > 0);
  comprobar(
    'y AHORA sí se dice qué significa',
    v.tablon.every((p) => typeof p.pointsTo === 'string'),
  );

  paso('Acusar');
  const acusaciones = await pedir(`/games/${game.id}/live/acusaciones`, { metodo: 'POST' });
  comprobar('abrir acusaciones responde 200', acusaciones.estado === 200, acusaciones.datos);

  const vacia = await pedir('/jugar/acusar', { metodo: 'POST', testigo, cuerpo: { respuestas: {} } });
  comprobar('una acusación incompleta se rechaza', vacia.estado === 409, vacia.datos);

  // La correcta, compuesta desde los ejes del juego. Nadie escribe aquí
  // «murdererId»: se recorre lo que el manifiesto declare.
  const solucion = game.plot!.solution.respuestas;
  const mia: Record<string, string> = {};
  for (const eje of ejesDe(manifiesto)) mia[eje.id] = solucion[eje.id]!;

  const acusar = await pedir('/jugar/acusar', { metodo: 'POST', testigo, cuerpo: { respuestas: mia } });
  comprobar('la acusación se registra', acusar.estado === 200, acusar.datos);
  comprobar('con hora del servidor', typeof acusar.datos?.at === 'string');
  comprobar(
    'y NO dice si has acertado',
    !('correcta' in (acusar.datos ?? {})),
    acusar.datos,
  );

  const repe = await pedir('/jugar/acusar', { metodo: 'POST', testigo, cuerpo: { respuestas: mia } });
  comprobar('no se puede acusar dos veces', repe.estado === 409);

  v = await vista();
  comprobar('mi acusación vuelve como diccionario', Boolean(v.miAcusacion?.respuestas));
  comprobar(
    'con un valor por eje',
    Object.keys(v.miAcusacion?.respuestas ?? {}).length === ejesDe(manifiesto).length,
  );
  comprobar('sigue sin llegar la solución', v.desenlace === undefined);

  paso('El desenlace');
  const desenlace = await pedir(`/games/${game.id}/live/desenlace`, { metodo: 'POST' });
  comprobar('revelar responde 200', desenlace.estado === 200, desenlace.datos);
  v = await vista();
  comprobar('ahora sí llega el desenlace', Boolean(v.desenlace));
  comprobar(
    'con una respuesta por eje, ya con nombre',
    v.desenlace?.respuestas.length === ejesDe(manifiesto).length &&
      v.desenlace.respuestas.every((r) => r.nombre.length > 0),
    v.desenlace?.respuestas,
  );
  comprobar('y quién fue', Boolean(v.desenlace?.culpableId));
  comprobar(
    'gané, porque acerté los tres ejes',
    v.desenlace?.ganador?.suspectId === 's0',
    v.desenlace?.ganador,
  );
  comprobar(
    'la clasificación me da todos los aciertos',
    v.desenlace?.clasificacion.find((c) => c.suspectId === 's0')?.aciertos ===
      ejesDe(manifiesto).length,
    v.desenlace?.clasificacion,
  );

  paso('El Mayordomo');
  const pregunta = await pedir('/jugar/preguntar', {
    metodo: 'POST',
    testigo,
    cuerpo: { pregunta: '¿Quién es el asesino?' },
  });
  comprobar('responde 200', pregunta.estado === 200, pregunta.datos);
  comprobar('y responde algo', String(pregunta.datos?.respuesta ?? '').length > 10);
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
    },
    stdio: 'ignore',
  });

  await esperarServidor();
  await jugar();
} catch (e) {
  fallos.push(`la prueba se cayó: ${e instanceof Error ? e.message : String(e)}`);
} finally {
  servidor?.kill();
  // Windows tarda un instante en soltar los ficheros del proceso recién
  // matado. Y si no los suelta, tampoco importa: es una carpeta temporal, y
  // tumbar la prueba por no poder borrarla sería confundir la limpieza con el
  // resultado.
  await new Promise((r) => setTimeout(r, 600));
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    console.log(`  (queda por limpiar ${dir})`);
  }
}

console.log(`\n${hechas} comprobaciones`);
if (fallos.length === 0) {
  console.log('La velada entera funciona de punta a punta.');
  process.exit(0);
}
console.log(`\n${fallos.length} FALLOS:\n`);
for (const f of fallos) console.log(`  ✗ ${f}`);
process.exit(1);
