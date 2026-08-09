/**
 * El maestro de oro: la red de seguridad para tocar el contrato sin romper CLUEDO.
 *
 *   npm run oro:capturar     ← congela cómo se comporta CLUEDO HOY
 *   npm run oro:verificar    ← comprueba que se sigue comportando igual
 *
 * POR QUÉ ESTO Y NO TESTS NORMALES. Lo que viene por delante es un refactor del
 * contrato: convertir «la respuesta son tres cosas» en «la respuesta son N
 * ejes», y «lo único que haces en una ronda es elegir sala» en algo general.
 * Un refactor así no cambia lo que el sistema HACE, solo cómo lo dice. La
 * prueba adecuada, entonces, no es afirmar invariantes uno a uno —siempre se
 * escapan— sino congelar TODA la salida observable y exigir que no se mueva ni
 * un byte.
 *
 * QUÉ SE CONGELA
 *   · Los 13 documentos imprimibles, en modo anfitrión y a ciegas, en sus dos
 *     variantes (con estilo y en blanco). 52 documentos.
 *   · Los dosieres de los 8 jugadores, en las dos variantes.
 *   · El plano generado.
 *   · Una partida entera jugada paso a paso, capturando la vista COMPLETA de
 *     cada jugador y la de quien dirige tras cada movimiento. Ahí es donde vive
 *     la defensa antitrampas, así que se guarda entera y sin resumir: si un día
 *     se filtra un campo que no debía salir, aparece en el diff.
 *
 * DETERMINISMO. La trama de demostración se sortea con `Math.random`, así que
 * se genera UNA vez y se congela en `oro/partida.json`. Las marcas de tiempo se
 * sustituyen por un testigo antes de comparar: lo que se verifica es la forma y
 * el contenido, no el reloj.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { generateBoardLayout } from '../src/board/generator';
import { generateDemoPlot } from '../src/plot/demoPlot';
import { renderPlayerDocument } from '../src/docs/renderer';
import { renderPrintableDocument } from '../src/docs/imprimibles';
import { abrirRonda, acusar, cerrarRonda, elegirSala, guardarNotas } from '../src/live/sesion';
import { vistaDeGameMaster, vistaDeJugador } from '../src/live/proyeccion';
import { printableDocsFor } from '../../shared/documents';
import type { DocumentVariant, GameSession } from '../../shared/types';
import type { LiveSession } from '../../shared/live';

const AQUI = path.resolve(import.meta.dirname ?? __dirname, 'oro');
const FIXTURE = path.join(AQUI, 'partida.json');
const INSTANTANEA = path.join(AQUI, 'instantanea.json');

// ---------------------------------------------------------------------------
// La partida congelada
// ---------------------------------------------------------------------------

const NOMBRES = ['Ana', 'Bruno', 'Carla', 'Dani', 'Elena', 'Fabio', 'Gema', 'Hugo'];
const SALAS = [
  'Salón',
  'Cocina',
  'Biblioteca',
  'Invernadero',
  'Despacho',
  'Sala de billar',
  'Bodega',
  'Galería',
];
const OBJETOS = ['Candelabro', 'Abrecartas', 'Cuerda de cortina', 'Frasco de láudano', 'Atizador'];

/**
 * La partida de referencia.
 *
 * Se escribe a disco la primera vez y a partir de ahí se lee siempre igual. Si
 * se regenerase en cada ejecución, el maestro de oro compararía dos tramas
 * distintas y no serviría para nada.
 */
function partidaDeReferencia(): GameSession {
  if (fs.existsSync(FIXTURE)) {
    return JSON.parse(fs.readFileSync(FIXTURE, 'utf8')) as GameSession;
  }

  const ahora = '2026-01-01T20:00:00.000Z';
  const game: GameSession = {
    id: 'oro',
    name: 'Partida de referencia',
    status: 'ready',
    createdAt: ahora,
    updatedAt: ahora,
    suspects: NOMBRES.map((name, i) => ({
      id: `s${i}`,
      name,
      description: `Invitado número ${i + 1}.`,
      email: `${name.toLowerCase()}@ejemplo.es`,
    })),
    rooms: SALAS.map((name, i) => ({
      id: `r${i}`,
      name,
      description: `Descripción de ${name.toLowerCase()}.`,
    })),
    weapons: OBJETOS.map((name, i) => ({ id: `w${i}`, name, description: `Un ${name.toLowerCase()}.` })),
    boardMode: 'generated',
    settings: { language: 'es' },
  };
  game.board = generateBoardLayout(game.rooms);
  game.plot = generateDemoPlot(game);
  game.plot.material = {
    generatedAt: ahora,
    narrations: [1, 2, 3, 4].map((round) => ({
      round,
      title: `Ronda ${round}`,
      text: `Texto que se lee en alto al abrir la ronda ${round}.`,
      stageDirection: round === 2 ? 'Apaga una lámpara.' : '',
    })),
    twists: game.suspects.slice(0, 4).map((s, i) => ({
      id: `giro-${i}`,
      suspectId: s.id,
      round: (i % 2) + 2,
      instruction: `Giro personal ${i + 1}: recuerdas algo que no habías contado.`,
    })),
    timelineReveals: [
      { round: 1, time: '21:40', fact: 'Se apagaron las luces del pasillo.' },
      { round: 2, time: '22:05', fact: 'Alguien cerró la puerta del invernadero.' },
    ],
    hints: [1, 2, 3].map((level) => ({ level, text: `Ayuda de nivel ${level}.` })),
    finale: {
      reconstruction: 'Reconstrucción de lo ocurrido.',
      confession: 'La confesión, en primera persona.',
      epilogue: 'El epílogo de la velada.',
    },
  };

  fs.mkdirSync(AQUI, { recursive: true });
  fs.writeFileSync(FIXTURE, JSON.stringify(game, null, 2), 'utf8');
  return game;
}

// ---------------------------------------------------------------------------
// Normalización
// ---------------------------------------------------------------------------

const RELOJ = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z/g;

/** Sustituye cualquier instante por un testigo: se compara la forma, no la hora. */
function sinReloj<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor).replace(RELOJ, '«instante»')) as T;
}

function huella(texto: string): string {
  return crypto.createHash('sha256').update(texto.replace(RELOJ, '«instante»')).digest('hex').slice(0, 16);
}

// ---------------------------------------------------------------------------
// La captura
// ---------------------------------------------------------------------------

interface Instantanea {
  documentos: Record<string, { huella: string; largo: number }>;
  dosieres: Record<string, { huella: string; largo: number }>;
  tablero: unknown;
  partida: Array<{ paso: string; jugadores: Record<string, unknown>; gm: unknown }>;
}

const VARIANTES: DocumentVariant[] = ['color', 'blanco'];

function capturarDocumentos(game: GameSession): Instantanea['documentos'] {
  const salida: Instantanea['documentos'] = {};
  for (const gmPlays of [false, true]) {
    const modo = gmPlays ? 'ciego' : 'anfitrion';
    const conAjustes: GameSession = { ...game, settings: { ...game.settings, gmPlays } };
    for (const info of printableDocsFor(conAjustes.settings)) {
      for (const variant of VARIANTES) {
        const doc = renderPrintableDocument(conAjustes, info.id, { variant });
        const clave = `${modo}/${info.id}/${variant}`;
        salida[clave] = doc
          ? { huella: huella(doc.html ?? ''), largo: (doc.html ?? '').length }
          : { huella: 'AUSENTE', largo: 0 };
      }
    }
  }
  return salida;
}

function capturarDosieres(game: GameSession): Instantanea['dosieres'] {
  const salida: Instantanea['dosieres'] = {};
  for (const s of game.suspects) {
    for (const variant of VARIANTES) {
      const doc = renderPlayerDocument(game, s.id, { variant });
      salida[`${s.id}/${variant}`] = doc
        ? { huella: huella(doc.html ?? ''), largo: (doc.html ?? '').length }
        : { huella: 'AUSENTE', largo: 0 };
    }
  }
  return salida;
}

/**
 * Una velada entera, jugada paso a paso.
 *
 * El guion es fijo a propósito y toca todo lo que se puede tocar: elegir sala,
 * cambiarse, escribir notas, recibir giros, acusar bien y acusar mal, y llegar
 * al desenlace. Tras cada paso se guarda la vista COMPLETA de los ocho
 * jugadores, que es donde se vería cualquier filtración.
 */
function capturarPartida(game: GameSession): Instantanea['partida'] {
  const ahora = '2026-01-01T20:00:00.000Z';
  const sesion: LiveSession = {
    id: game.id,
    code: 'OROORO',
    phase: 'lobby',
    round: 0,
    totalRounds: 4,
    players: game.suspects.map((s, i) => ({
      suspectId: s.id,
      displayName: s.name,
      joinCode: `CODIG${i}`,
      joined: true,
      lastSeenAt: ahora,
      elecciones: [],
      notas: '',
      girosRecibidos: [],
    })),
    acusaciones: [],
    tablon: [],
    rev: 1,
    updatedAt: ahora,
  };

  const pasos: Instantanea['partida'] = [];
  const retratar = (paso: string): void => {
    const jugadores: Record<string, unknown> = {};
    for (const s of game.suspects) {
      jugadores[s.id] = sinReloj(vistaDeJugador(game, sesion, s.id));
    }
    pasos.push({ paso, jugadores, gm: sinReloj(vistaDeGameMaster(game, sesion)) });
  };

  retratar('sala-de-espera');

  for (let ronda = 1; ronda <= 4; ronda++) {
    abrirRonda(sesion, 15);
    retratar(`ronda-${ronda}-abierta`);

    // Cada jugador entra en una sala distinta; el reparto es determinista.
    game.suspects.forEach((s, i) => {
      elegirSala(sesion, s.id, game.rooms[(i + ronda) % game.rooms.length]!.id);
    });
    // Y uno se cambia de idea, que es un caso propio.
    elegirSala(sesion, game.suspects[0]!.id, game.rooms[(ronda + 3) % game.rooms.length]!.id);
    guardarNotas(sesion, game.suspects[1]!.id, `Notas de la ronda ${ronda}.`);
    retratar(`ronda-${ronda}-elegidas`);

    // Los giros de esta ronda se entregan a sus destinatarios.
    for (const t of game.plot?.material?.twists ?? []) {
      if (t.round !== ronda) continue;
      const j = sesion.players.find((p) => p.suspectId === t.suspectId);
      if (j && !j.girosRecibidos.includes(t.id)) j.girosRecibidos.push(t.id);
    }

    cerrarRonda(sesion);
    retratar(`ronda-${ronda}-cerrada`);
  }

  sesion.phase = 'acusaciones';
  retratar('acusaciones-abiertas');

  const solucion = game.plot!.solution;
  // Una acusación equivocada, una a medias y la correcta: los tres casos que
  // decide el recuento de aciertos.
  acusar(
    sesion,
    game.suspects[2]!.id,
    { murdererId: game.suspects[7]!.id, weaponId: game.weapons[0]!.id, roomId: game.rooms[0]!.id },
    solucion,
  );
  acusar(
    sesion,
    game.suspects[3]!.id,
    { murdererId: solucion.murdererId, weaponId: game.weapons[1]!.id, roomId: solucion.roomId },
    solucion,
  );
  acusar(
    sesion,
    game.suspects[4]!.id,
    { murdererId: solucion.murdererId, weaponId: solucion.weaponId, roomId: solucion.roomId },
    solucion,
  );
  retratar('acusaciones-entregadas');

  sesion.phase = 'desenlace';
  retratar('desenlace');

  return pasos;
}

function capturar(game: GameSession): Instantanea {
  return {
    documentos: capturarDocumentos(game),
    dosieres: capturarDosieres(game),
    tablero: game.board,
    partida: capturarPartida(game),
  };
}

// ---------------------------------------------------------------------------
// Comparación
// ---------------------------------------------------------------------------

/** Diferencias hoja a hoja entre dos estructuras, con su ruta. */
function diferencias(a: unknown, b: unknown, ruta = ''): string[] {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  const objeto = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v);

  if (objeto(a) && objeto(b)) {
    const claves = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
    return claves.flatMap((k) => diferencias(a[k], b[k], ruta ? `${ruta}.${k}` : k));
  }
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) {
    return a.flatMap((v, i) => diferencias(v, b[i], `${ruta}[${i}]`));
  }
  const corto = (v: unknown): string => {
    const t = JSON.stringify(v) ?? 'undefined';
    return t.length > 90 ? `${t.slice(0, 90)}…` : t;
  };
  return [`${ruta || '(raíz)'}\n      antes: ${corto(a)}\n      ahora: ${corto(b)}`];
}

// ---------------------------------------------------------------------------

const modo = process.argv[2] === 'verificar' ? 'verificar' : 'capturar';
const game = partidaDeReferencia();
const actual = capturar(game);

const cuantos =
  Object.keys(actual.documentos).length +
  Object.keys(actual.dosieres).length +
  actual.partida.length;

if (modo === 'capturar') {
  fs.mkdirSync(AQUI, { recursive: true });
  fs.writeFileSync(INSTANTANEA, JSON.stringify(actual, null, 2), 'utf8');
  console.log(`Maestro de oro capturado en ${path.relative(process.cwd(), INSTANTANEA)}`);
  console.log(`  ${Object.keys(actual.documentos).length} documentos imprimibles`);
  console.log(`  ${Object.keys(actual.dosieres).length} dosieres`);
  console.log(`  ${actual.partida.length} pasos de partida × ${game.suspects.length} jugadores`);
  console.log(`  ${(fs.statSync(INSTANTANEA).size / 1024).toFixed(0)} KB`);
  process.exit(0);
}

if (!fs.existsSync(INSTANTANEA)) {
  console.error('No hay maestro de oro. Ejecuta antes: npm run oro:capturar');
  process.exit(2);
}

const esperado = JSON.parse(fs.readFileSync(INSTANTANEA, 'utf8')) as Instantanea;
const difs = diferencias(esperado, actual);

console.log(`\nMaestro de oro · ${cuantos} piezas contrastadas`);
if (difs.length === 0) {
  console.log('CLUEDO se comporta exactamente igual que antes.');
  process.exit(0);
}

console.log(`\n${difs.length} DIFERENCIAS:\n`);
for (const d of difs.slice(0, 40)) console.log(`  ✗ ${d}`);
if (difs.length > 40) console.log(`\n  … y ${difs.length - 40} más.`);
process.exit(1);
