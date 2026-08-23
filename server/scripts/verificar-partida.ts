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
import { esElSenalado, manifiestoDe, ejes as ejesDe } from '../../shared/juegos';
import type { GameSession } from '../../shared/types';
import type { LiveSession, VistaJugador } from '../../shared/live';

const REPO = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const TSX = path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SERVIDOR = path.join(REPO, 'server', 'src', 'index.ts');
/**
 * Puerto al azar, no fijo.
 *
 * Con uno fijo, encadenar los comprobadores fallaba de vez en cuando: Windows
 * tarda en soltar el puerto del servidor recién matado y el siguiente arranque
 * lo encontraba ocupado. Un comprobador que falla una de cada cinco veces sin
 * que nada esté roto acaba ignorándose, que es peor que no tenerlo.
 */
const PUERTO = 5300 + Math.floor(Math.random() * 400);
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
  /*
   * La trama de demostración reparte la culpa AL AZAR, y esta prueba juega
   * siempre con `s0`. Cuando le tocaba ser culpable —una de cada cuatro veces—
   * acusar correctamente NO da la victoria, y hace bien: quien es señalado no
   * gana delatándose, su juego es no ser descubierto. Pero la comprobación
   * «gané, porque acerté los tres ejes» daba por hecho lo contrario y fallaba.
   *
   * Un comprobador que falla una de cada cuatro veces sin que nada esté roto se
   * acaba ignorando, y entonces deja de servir para el día en que sí lo está.
   * Se siembra hasta que el culpable sea otro, y así el caso que se prueba es
   * siempre el mismo.
   */
  let trama = generateDemoPlot(game);
  for (let intento = 0; intento < 40; intento++) {
    if (!esElSenalado(manifiestoDe(game.settings.juego), trama.solution.respuestas, 's0')) break;
    trama = generateDemoPlot(game);
  }
  game.plot = trama;
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

  paso('Acusar en mitad de la ronda, sin permiso de nadie');
  /*
   * ESTO ES LO NUEVO. Antes acusar exigía que quien dirige abriera una fase de
   * acusaciones, y hasta entonces el servidor devolvía 409. Eso convertía en
   * cola lo que es una carrera —gana quien acierta ANTES—, así que ahora se
   * puede acusar en cualquier fase de juego.
   *
   * Acusa Bruno y lo hace MAL a propósito: así se prueba que la puerta está
   * abierta sin robarle la victoria a quien acierta más abajo, que es lo que
   * comprueban las líneas del desenlace.
   */
  const bruno = await pedir('/jugar/entrar', {
    metodo: 'POST',
    cuerpo: { code: 'PRUEBA', joinCode: 'CODIG1' },
  });
  const testigoBruno: string = bruno.datos?.token ?? '';
  comprobar('entra un segundo jugador', testigoBruno.length > 20, bruno.datos);

  const suVista = await pedir('/jugar/vista', { testigo: testigoBruno });
  const respuestasBuenas = game.plot!.solution.respuestas;
  const equivocada: Record<string, string> = {};
  for (const eje of (suVista.datos as { vista: VistaJugador }).vista.ejes) {
    const otra = eje.opciones.find((o) => o.id !== respuestasBuenas[eje.ejeId]);
    equivocada[eje.ejeId] = otra!.id;
  }
  comprobar(
    'su acusación es completa y distinta de la solución',
    Object.keys(equivocada).length === ejesDe(manifiesto).length &&
      ejesDe(manifiesto).some((e) => equivocada[e.id] !== respuestasBuenas[e.id]),
    equivocada,
  );

  const enRonda = await pedir('/jugar/acusar', {
    metodo: 'POST',
    testigo: testigoBruno,
    cuerpo: { respuestas: equivocada },
  });
  comprobar(
    'se puede acusar con la ronda ABIERTA, sin habilitación del GM',
    enRonda.estado === 200,
    enRonda.datos,
  );
  comprobar('tampoco a él se le dice si acertó', !('correcta' in (enRonda.datos ?? {})), enRonda.datos);

  v = await vista();
  comprobar('y acusar no altera la ronda en curso', v.sesion.phase === 'ronda-abierta', v.sesion.phase);

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

  paso('Una segunda ronda, para probar que la acusación no se renueva');
  /*
   * HACE FALTA LA RONDA 2, y no vale reintentar en la misma. El motor limita
   * `acusar` a `vecesPorTurno: 1`, y eso cuenta POR RONDA: reintentando en la
   * ronda 1 el 409 lo devolvería ese contador y no la regla que se quiere
   * probar. De hecho así estaba escrito primero, y pasaba igual de verde con la
   * regla rota. En la ronda 2 el contador vuelve a cero, así que lo único que
   * puede rechazar la segunda acusación es que sea una por partida.
   */
  const ronda2 = await pedir(`/games/${game.id}/live/ronda/abrir`, {
    metodo: 'POST',
    cuerpo: { minutos: 10 },
  });
  comprobar('abrir la ronda 2 responde 200', ronda2.estado === 200, ronda2.datos);
  v = await vista();
  comprobar('estamos en la ronda 2', v.sesion.round === 2, v.sesion.round);

  const otraRonda = await pedir('/jugar/acusar', {
    metodo: 'POST',
    testigo: testigoBruno,
    cuerpo: { respuestas: equivocada },
  });
  comprobar(
    'una acusación por PARTIDA, no por ronda: en la ronda 2 sigue sin poder',
    otraRonda.estado === 409,
    otraRonda.datos,
  );

  const cerrar2 = await pedir(`/games/${game.id}/live/ronda/cerrar`, { metodo: 'POST' });
  comprobar('cerrar la ronda 2 responde 200', cerrar2.estado === 200, cerrar2.datos);

  paso('Acusar con la ronda cerrada, sin pasar por ninguna fase de acusaciones');
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

  paso('La fase vieja sigue viva, y la partida sabe salir sin ella');
  /*
   * DOS COSAS QUE PROBAR AQUÍ, y las dos por el mismo cambio.
   *
   * La primera: la fase `acusaciones` y su ruta siguen funcionando. El taller ya
   * no tiene botón para abrirla, pero las partidas que estuvieran en ella cuando
   * se desplegó esto tienen que poder seguir.
   *
   * La segunda, y es la que costó: al quitar ese botón, el sobre del crimen se
   * quedó sin puerta. Solo se podía abrir desde `acusaciones`, y a `acusaciones`
   * ya no llegaba nadie: la partida entera se volvía interminable. Por eso ahora
   * se sale al desenlace desde `ronda-cerrada`, y por eso se comprueba.
   */
  const acusaciones = await pedir(`/games/${game.id}/live/acusaciones`, { metodo: 'POST' });
  comprobar('la ruta vieja de acusaciones sigue respondiendo 200', acusaciones.estado === 200, acusaciones.datos);
  v = await vista();
  comprobar('y deja la partida en esa fase', v.sesion.phase === 'acusaciones', v.sesion.phase);

  const volver = await pedir(`/games/${game.id}/live/ronda/abrir`, {
    metodo: 'POST',
    cuerpo: { minutos: 10 },
  });
  comprobar('desde ahí se puede volver a jugar', volver.estado === 200, volver.datos);
  const cerrar3 = await pedir(`/games/${game.id}/live/ronda/cerrar`, { metodo: 'POST' });
  comprobar('y cerrar esa ronda', cerrar3.estado === 200, cerrar3.datos);
  v = await vista();
  comprobar('quedando la ronda cerrada', v.sesion.phase === 'ronda-cerrada', v.sesion.phase);

  paso('El desenlace');
  const desenlace = await pedir(`/games/${game.id}/live/desenlace`, { metodo: 'POST' });
  comprobar(
    'se abre el sobre DIRECTAMENTE desde la ronda cerrada',
    desenlace.estado === 200,
    desenlace.datos,
  );
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
