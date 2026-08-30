/**
 * El maestro de oro: la red de seguridad para tocar el contrato sin romper nada.
 *
 *   npm run oro:capturar            ← congela cómo se comportan HOY los tres juegos
 *   npm run oro:verificar           ← comprueba que se siguen comportando igual
 *   npm run oro:verificar -- momia  ← solo uno
 *
 * ═══ POR QUÉ ESTO Y NO TESTS NORMALES ═══
 *
 * Lo que viene por delante es un refactor del contrato: sacar del núcleo todo lo
 * que tiene forma de CLUEDO —víctima, salas, pistas, acusación— y mudarlo al
 * juego que lo usa. Un refactor así no cambia lo que el sistema HACE, solo cómo
 * lo dice. La prueba adecuada, entonces, no es afirmar invariantes uno a uno
 * —siempre se escapan— sino congelar TODA la salida observable y exigir que no
 * se mueva ni un byte.
 *
 * ═══ POR QUÉ AHORA SON TRES Y NO UNO ═══
 *
 * Porque el verde de CLUEDO no dice nada de los otros dos, y son exactamente
 * los que más se van a mover. La Momia y las Sombras tenían comprobadores
 * excelentes —`verify:momia`, `verify:sombras`— que miran que la MECÁNICA
 * funcione: que el sellado resuelva, que el rastro suba, que el kanchō gane si
 * intercepta. Ninguno de los dos congela la SALIDA. Con ellos en verde se puede
 * cambiar el nombre de un campo de la vista, filtrar un dato que no debía salir
 * o dejar de mandar la crónica, y los dos siguen pasando.
 *
 * Dicho de otro modo: hasta hoy, dos tercios del producto se iban a refactorizar
 * a ciegas.
 *
 * ═══ QUÉ SE CONGELA, POR JUEGO ═══
 *
 *   · Todos sus documentos imprimibles, en modo anfitrión y a ciegas, en sus dos
 *     variantes (con estilo y en blanco).
 *   · Los dosieres de cada persona, en las dos variantes.
 *   · El plano generado, si lo tiene.
 *   · Una partida entera jugada paso a paso, capturando la vista COMPLETA de
 *     cada jugador y la de quien dirige tras cada movimiento. Ahí es donde vive
 *     la defensa antitrampas, así que se guarda entera y sin resumir: si un día
 *     se filtra un campo que no debía salir, aparece en el diff.
 *   · Y lo que el motor CONTESTÓ a cada acción, incluido cuando la rechazó. Esos
 *     mensajes los lee gente con el móvil en la mano; son producto.
 *
 * DETERMINISMO. Las tramas se sortean con generadores sembrados, así que cada
 * guion pasa su semilla explícita y la partida resultante se congela en
 * `oro/<juego>/partida.json`. Las marcas de tiempo se sustituyen por un testigo
 * antes de comparar: lo que se verifica es la forma y el contenido, no el reloj.
 */
import '../src/juegos/instalados';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { renderPlayerDocument } from '../src/docs/renderer';
import { renderPrintableDocument } from '../src/docs/imprimibles';
import { vistaDeGameMaster, vistaDeJugador } from '../src/live/proyeccion';
import { ejecutarAccion } from '../src/juegos/motor';
import { iniciarJuego } from '../src/juegos/inicios';
import { printableDocsFor } from '../../shared/documents';
import { manifiestoDe } from '../../shared/juegos';
import { alDia } from '../src/juegos/migracion';
import { GUION as CLUEDO } from './oro-guiones/cluedo';
import { GUION as MOMIA } from './oro-guiones/momia';
import { GUION as SOMBRAS } from './oro-guiones/sombras';
import type { DocumentVariant, GameSession } from '../../shared/types';
import type { LiveSession } from '../../shared/live';
import type { GuionDeOro, Mesa } from './oro-guiones/tipos';

const AQUI = path.resolve(import.meta.dirname ?? __dirname, 'oro');

const GUIONES: GuionDeOro[] = [CLUEDO, MOMIA, SOMBRAS];

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

interface Paso {
  paso: string;
  jugadores: Record<string, unknown>;
  gm: unknown;
  /**
   * Qué contestó el motor a cada acción de este paso.
   *
   * Ausente cuando no hubo ninguna, para que la instantánea de CLUEDO —cuyo
   * guion conduce la partida llamando a sus funciones y no al motor— no gane
   * una clave vacía en cada uno de sus dieciséis pasos.
   */
  intentos?: Array<{ quien: string; que: string; resultado: unknown }>;
}

interface Instantanea {
  documentos: Record<string, { huella: string; largo: number }>;
  dosieres: Record<string, { huella: string; largo: number }>;
  tablero: unknown;
  partida: Paso[];
}

const VARIANTES: DocumentVariant[] = ['color', 'blanco'];

function capturarDocumentos(game: GameSession): Instantanea['documentos'] {
  const salida: Instantanea['documentos'] = {};
  /*
   * EL CATÁLOGO DEL JUEGO, no el de CLUEDO. Sin este segundo argumento,
   * `printableDocsFor` filtra los trece de CLUEDO, así que la Momia habría
   * congelado los documentos de un asesinato que no ocurre en su partida —o,
   * peor, ninguno— y el maestro de oro habría dado por buena una lista vacía.
   */
  const catalogo = manifiestoDe(game.settings.juego).documentos;
  for (const gmPlays of [false, true]) {
    const modo = gmPlays ? 'ciego' : 'anfitrion';
    const conAjustes: GameSession = { ...game, settings: { ...game.settings, gmPlays } };
    for (const info of printableDocsFor(conAjustes.settings, catalogo)) {
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

function capturarPartida(guion: GuionDeOro, game: GameSession): Paso[] {
  const sesion: LiveSession = guion.sesionInicial(game);
  /*
   * El arranque del juego, por la misma puerta que el servidor.
   *
   * Sin esto, la Momia y las Sombras entrarían en la velada sin su estado —el
   * mapa de la maldición, el rastro— y sus reductores lo crearían perezosamente
   * al primer intento. Funcionaría, y congelaría un camino que en producción no
   * ocurre: allí lo crea `registrarInicio` al abrir la mesa.
   */
  iniciarJuego(game, sesion);

  const pasos: Paso[] = [];
  let intentos: Paso['intentos'];

  const retratar = (paso: string): void => {
    const jugadores: Record<string, unknown> = {};
    for (const s of game.suspects) {
      jugadores[s.id] = sinReloj(vistaDeJugador(game, sesion, s.id));
    }
    pasos.push({
      paso,
      jugadores,
      gm: sinReloj(vistaDeGameMaster(game, sesion)),
      ...(intentos && intentos.length > 0 ? { intentos } : {}),
    });
    intentos = undefined;
  };

  const anotar = (quien: string, que: string, resultado: unknown): void => {
    intentos ??= [];
    intentos.push({ quien, que, resultado: sinReloj(resultado) });
  };

  const mesa: Mesa = {
    game,
    sesion,
    retratar,
    accion: (quien, accion, datos = {}) => {
      try {
        anotar(quien, accion, { aceptada: true, devolvio: ejecutarAccion(game, sesion, quien, accion, datos) });
      } catch (e) {
        anotar(quien, accion, { aceptada: false, porque: (e as Error).message });
      }
    },
    intentar: (que, hacer) => {
      try {
        hacer();
        anotar('mesa', que, { aceptada: true });
      } catch (e) {
        anotar('mesa', que, { aceptada: false, porque: (e as Error).message });
      }
    },
  };

  guion.velada(mesa);
  return pasos;
}

function capturar(guion: GuionDeOro, game: GameSession): Instantanea {
  return {
    documentos: capturarDocumentos(game),
    dosieres: capturarDosieres(game),
    tablero: game.board,
    partida: capturarPartida(guion, game),
  };
}

/**
 * La partida de referencia de un juego.
 *
 * Se escribe a disco la primera vez y a partir de ahí se lee siempre igual. Si
 * se regenerase en cada ejecución, el maestro de oro compararía dos tramas
 * distintas y no serviría para nada.
 */
function partidaCongelada(guion: GuionDeOro): GameSession {
  const fixture = path.join(AQUI, guion.juego, 'partida.json');
  if (fs.existsSync(fixture)) {
    // Por la MISMA puerta que el almacén. La partida congelada se deja a
    // propósito en el formato antiguo, así que cada ejecución vuelve a
    // comprobar que la conversión de partidas viejas sigue funcionando.
    return alDia(JSON.parse(fs.readFileSync(fixture, 'utf8')) as GameSession);
  }
  const game = guion.partidaDeReferencia();
  fs.mkdirSync(path.dirname(fixture), { recursive: true });
  fs.writeFileSync(fixture, JSON.stringify(game, null, 2), 'utf8');
  return game;
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

/**
 * Resumen por familias.
 *
 * Con ocho jugadores y dieciséis pasos, un solo campo cambiado produce decenas
 * de renglones idénticos. Lo que hay que poder afirmar no es «hay 96
 * diferencias» sino «las diferencias son estas cuatro cosas, y las cuatro son a
 * propósito». Así que se colapsan los índices y el id del jugador.
 */
const familia = (d: string): string =>
  d
    .split('\n')[0]!
    .replace(/^partida\[\d+\]\.jugadores\.[^.]+\./, 'vista del jugador · ')
    .replace(/^partida\[\d+\]\.gm\./, 'vista del Game Master · ')
    .replace(/\[\d+\]/g, '[]');

// ---------------------------------------------------------------------------

const argumentos = process.argv.slice(2);
const modo = argumentos.includes('verificar') ? 'verificar' : 'capturar';
const forzar = argumentos.includes('--forzar');
const pedidos = argumentos.filter((a) => !a.startsWith('--') && a !== 'verificar' && a !== 'capturar');

const aRecorrer = pedidos.length > 0 ? GUIONES.filter((g) => pedidos.includes(g.juego)) : GUIONES;

if (aRecorrer.length === 0) {
  console.error(`No conozco ese juego. Los que tienen guion: ${GUIONES.map((g) => g.juego).join(', ')}`);
  process.exit(2);
}

let falloGeneral = false;

for (const guion of aRecorrer) {
  const game = partidaCongelada(guion);
  const actual = capturar(guion, game);
  const instantanea = path.join(AQUI, guion.juego, 'instantanea.json');

  const cuantos =
    Object.keys(actual.documentos).length + Object.keys(actual.dosieres).length + actual.partida.length;

  if (modo === 'capturar') {
    /*
     * CAPTURAR ENCIMA DE UNA REFERENCIA QUE YA EXISTE ES DESTRUCTIVO, y de la
     * peor manera: en silencio y en verde. Quien teclea `oro:capturar` cuando
     * quería `oro:verificar` no ve ningún error — ve un mensaje de éxito y una
     * red que a partir de ese momento bendice exactamente la regresión que
     * acababa de introducir. El fallo no aparece hasta semanas después, cuando
     * alguien se pregunta por qué el maestro de oro no cazó aquello.
     *
     * Recapturar es legítimo y hace falta a menudo —cada cambio a propósito lo
     * exige—, así que no se prohíbe: se pide decirlo en voz alta.
     */
    if (fs.existsSync(instantanea) && !forzar) {
      console.error(`\n${guion.juego}: ya hay una referencia congelada.`);
      console.error(`  ${path.relative(process.cwd(), instantanea)}`);
      console.error('\n  Sobreescribirla da por buenas TODAS las diferencias que haya ahora mismo.');
      console.error('  Si es lo que quieres, dilo:  npm run oro:capturar -- --forzar');
      console.error('  Si lo que querías era comprobar:  npm run oro:verificar');
      falloGeneral = true;
      continue;
    }
    fs.mkdirSync(path.dirname(instantanea), { recursive: true });
    fs.writeFileSync(instantanea, JSON.stringify(actual, null, 2), 'utf8');
    console.log(`\n${guion.juego} · ${guion.titulo}`);
    console.log(`  ${Object.keys(actual.documentos).length} documentos imprimibles`);
    console.log(`  ${Object.keys(actual.dosieres).length} dosieres`);
    console.log(`  ${actual.partida.length} pasos de partida × ${game.suspects.length} jugadores`);
    console.log(`  ${(fs.statSync(instantanea).size / 1024).toFixed(0)} KB`);
    continue;
  }

  if (!fs.existsSync(instantanea)) {
    console.error(`\n${guion.juego}: no hay maestro de oro. Ejecuta antes: npm run oro:capturar`);
    falloGeneral = true;
    continue;
  }

  const esperado = JSON.parse(fs.readFileSync(instantanea, 'utf8')) as Instantanea;
  const difs = diferencias(esperado, actual);

  console.log(`\n${guion.juego} · ${cuantos} piezas contrastadas`);
  if (difs.length === 0) {
    console.log(`  se comporta exactamente igual que antes.`);
    continue;
  }

  falloGeneral = true;
  const porFamilia = new Map<string, number>();
  for (const d of difs) porFamilia.set(familia(d), (porFamilia.get(familia(d)) ?? 0) + 1);

  console.log(`  ${difs.length} diferencias, en ${porFamilia.size} familias:\n`);
  for (const [f, n] of [...porFamilia.entries()].sort()) {
    console.log(`    ✗ ${f}   (×${n})`);
  }
  console.log('\n  Detalle de las primeras:\n');
  for (const d of difs.slice(0, 12)) console.log(`    · ${d}`);
}

if (modo === 'capturar') {
  console.log(falloGeneral ? '\nNo se capturó todo.' : '\nMaestro de oro capturado.');
  process.exit(falloGeneral ? 1 : 0);
}

console.log('');
process.exit(falloGeneral ? 1 : 0);
