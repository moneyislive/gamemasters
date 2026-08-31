/**
 * Lo que el servidor mete en `estadoDelJuego`, ¿sabe leerlo la app?
 *
 *   npm run verify:estado
 *
 * ═══ EL UNICO SITIO DONDE EL COMPILADOR NO MIRA ═══
 *
 * Entre el servidor y la app hay un contrato, `shared/live.ts`, y el compilador
 * lo hace valer: `npm run typecheck` en `app/` compila las pantallas contra el
 * mismo `VistaJugador` que rellena el servidor. Un campo que se renombre en un
 * lado y no en el otro NO COMPILA. Por eso los renombrados de esta semana
 * —`salas` a `lugares`, `soyCulpable` a `soyElSenalado`— fueron mecanicos.
 *
 * Salvo en un campo:
 *
 *     estadoDelJuego?: unknown;
 *
 * Es `unknown` A PROPOSITO: es el hueco donde cada juego mete lo suyo, y el
 * nucleo no puede tipar algo que no conoce. Lo escribe la proyeccion del juego
 * en el servidor y lo interpreta un lector escrito a mano en la app
 * —`leerEstadoMomia`, `leerEstadoSombras`, `leerEstadoNudo`,
 * `leerBloqueDePistas`—.
 *
 * Los dos lados hablan de `franjas`, `marcas`, `amuletos`, `senda`. Y no hay
 * NADA que compruebe que hablan de lo mismo.
 *
 * ═══ COMO SE VE EL FALLO, QUE ES LO QUE LO HACE GRAVE ═══
 *
 * Los lectores son defensivos: si falta lo que esperan, devuelven `null` o
 * `undefined` en vez de reventar. Eso esta bien —una pantalla en blanco es
 * mejor que un cierre— y tiene un precio: renombrar un campo en la proyeccion
 * del servidor y olvidarse del lector NO da ningun error. Compila, arranca,
 * pasa la bateria entera, y la pestaña propia del juego sale vacia. En la mesa,
 * de noche.
 *
 * Es exactamente el fallo que se vio entre el APK publicado y el servidor de
 * hoy —la app buscaba `salas` y llegaba `lugares`— pero DENTRO de una misma
 * version, donde nadie lo espera.
 *
 * ═══ COMO SE COMPRUEBA ═══
 *
 * Sin inventarse nada: se monta una partida de verdad de cada juego instalado,
 * se le pide al servidor el `estadoDelJuego` de una persona concreta, y se le
 * da AL LECTOR DE LA APP, importado tal cual desde `app/src/`. Si el lector lo
 * entiende, los dos lados hablan el mismo idioma. Si devuelve vacio, no.
 *
 * Se puede importar porque esos lectores son TypeScript puro: no traen React ni
 * React Native, solo tipos de `shared/`. Es una propiedad que conviene no
 * perder, y esta comprobacion la vigila de paso: el dia que alguien meta un
 * `import { View } from 'react-native'` ahi, esto deja de compilar.
 */
import '../src/juegos/instalados';
import { generarTramaMomia } from '../src/juegos/momia-trama';
import { generarTramaSombras } from '../src/juegos/sombras-trama';
import { generarTramaNudo } from '../src/juegos/nudo-trama';
import { generateDemoPlot } from '../src/plot/cluedo-demo';
import { generateBoardLayout } from '../src/board/generator';
import { iniciarJuego } from '../src/juegos/inicios';
import { proyectarEstado } from '../src/juegos/proyecciones';
import { abrirRonda } from '../src/live/sesion';
import {
  fasesConPapel,
  juegosInstalados,
  lugaresDe,
  manifiestoDe,
  personasDe,
} from '../../shared/juegos';
import type { ManifiestoDeJuego } from '../../shared/juegos';
import type { GameSession } from '../../shared/types';
import type { LiveSession } from '../../shared/live';

// LOS LECTORES DE LA APP, tal cual los usa el movil.
import { leerBloqueDePistas } from '../../shared/mecanicas/pistas';
import { leerEstadoMomia } from '../../app/src/momia/vista';
import { leerEstadoSombras } from '../../app/src/sombras/vista';
import { leerEstadoNudo } from '../../app/src/nudo/vista';

let hechas = 0;
const fallos: string[] = [];
function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(`${que}${detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 260)}`}`);
}

/**
 * Quien lee lo de cada juego en la app.
 *
 * Un juego SIN entrada aqui no se comprueba, y eso se dice en voz alta al
 * final: un juego nuevo que meta algo en `estadoDelJuego` y no aparezca en esta
 * tabla se queda sin red exactamente igual que antes de escribir este fichero.
 */
const LECTORES: Record<string, (v: unknown) => unknown> = {
  cluedo: leerBloqueDePistas,
  momia: leerEstadoMomia,
  sombras: leerEstadoSombras,
  nudo: leerEstadoNudo,
};

const GENTE = ['Ana', 'Bruno', 'Carla', 'Dani'];

function capitalizar(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function partidaDe(m: ManifiestoDeJuego): GameSession | null {
  const ahora = '2026-03-01T21:00:00.000Z';
  const game = {
    id: `estado-${m.id}`,
    name: `Prueba de ${m.nombre}`,
    status: 'ready',
    createdAt: ahora,
    updatedAt: ahora,
    entidades: {},
    boardMode: 'generated',
    settings: { language: 'es', juego: m.id },
  } as unknown as GameSession;

  for (const cat of m.categorias) {
    const cuantas = cat.exacto ?? Math.max(cat.minimo, cat.sonJugadores ? GENTE.length : cat.minimo);
    (game.entidades as Record<string, unknown>)[cat.id] = Array.from({ length: cuantas }, (_, i) => ({
      id: `${cat.id[0]}${i}`,
      name: cat.sonJugadores ? (GENTE[i] ?? `Persona ${i + 1}`) : `${capitalizar(cat.singular)} ${i + 1}`,
    }));
  }

  try {
    if (m.id === 'momia') game.plot = generarTramaMomia(game, { semilla: 'estado', vigilias: 4 });
    else if (m.id === 'sombras') game.plot = generarTramaSombras(game, { semilla: 'estado', horas: 4 });
    else if (m.id === 'nudo') game.plot = generarTramaNudo(game, { semilla: 'estado' });
    else game.plot = generateDemoPlot(game);
  } catch {
    return null;
  }
  game.board = generateBoardLayout(lugaresDe(game), m.rotuloCentralDelPlano);
  return game;
}

function sesionDe(game: GameSession, m: ManifiestoDeJuego): LiveSession {
  const sesion = {
    id: game.id,
    juego: m.id,
    code: 'ESTADO',
    phase: fasesConPapel(m, 'espera')[0] ?? 'lobby',
    round: 0,
    totalRounds: 4,
    players: personasDe(game).map((s, i) => ({
      participanteId: s.id,
      displayName: s.name,
      joinCode: `E${i}`,
      joined: true,
      elecciones: [],
      notas: '',
      girosRecibidos: [],
    })),
    respuestasEntregadas: [],
    porDondePasaron: [],
    rev: 1,
    updatedAt: game.createdAt,
  } as unknown as LiveSession;
  iniciarJuego(game, sesion);
  return sesion;
}

console.log('\nLo que el servidor mete en `estadoDelJuego`, ¿lo entiende la app?\n');

const sinLector: string[] = [];

for (const m of juegosInstalados()) {
  const lector = LECTORES[m.id];
  if (!lector) {
    sinLector.push(m.id);
    continue;
  }

  const game = partidaDe(m);
  if (!game) {
    comprobar(`${m.id}: se puede montar una partida de prueba`, false);
    continue;
  }
  const sesion = sesionDe(game, m);

  /*
   * SE MIRA CON LA RONDA ABIERTA, no en la sala de espera. Varias proyecciones
   * devuelven poco o nada antes de empezar —no hay nada que enseñar todavia— y
   * comprobar ahi seria comprobar el caso facil.
   */
  try {
    abrirRonda(sesion, 10);
  } catch {
    /* Un juego que no abra rondas se mira como este: es su estado inicial. */
  }

  const quien = sesion.players[0]?.participanteId ?? '';
  const delServidor = proyectarEstado(game, sesion, quien);

  comprobar(
    `${m.id}: el servidor mete algo en \`estadoDelJuego\``,
    delServidor !== undefined && delServidor !== null,
    { fase: sesion.phase },
  );
  if (delServidor === undefined || delServidor === null) continue;

  const leido = lector(delServidor);
  comprobar(
    `${m.id}: y el lector de la app lo entiende`,
    leido !== null && leido !== undefined,
    {
      porque:
        'el servidor y la app hablan de campos distintos: la pestaña propia del juego sale VACIA, sin error',
      queMandaElServidor: Object.keys(delServidor as Record<string, unknown>).sort(),
    },
  );

  /*
   * ═══ Y QUE LA COMPROBACION NO SEA HUECA ═══
   *
   * Un lector que devolviera cualquier cosa haria pasar lo de arriba sin
   * comprobar nada. Se le da basura y se exige que la rechace: si acepta esto,
   * tampoco esta mirando lo que dice mirar.
   */
  comprobar(
    `${m.id}: el lector RECHAZA lo que no es suyo`,
    lector({ campo: 'inventado', otro: 42 }) === null || lector({ campo: 'inventado', otro: 42 }) === undefined,
    { porque: 'si acepta cualquier objeto, la comprobacion de arriba no vale nada' },
  );
}

/*
 * UN JUEGO SIN LECTOR NO ES UN APROBADO, y decirlo importa: el silencio se lee
 * igual que el verde, y un juego nuevo que meta algo en `estadoDelJuego` sin
 * entrar en la tabla de arriba se queda sin red sin que nadie se entere.
 */
if (sinLector.length > 0) {
  const conEstado = sinLector.filter((id) => {
    const m = manifiestoDe(id);
    const game = partidaDe(m);
    if (!game) return false;
    const sesion = sesionDe(game, m);
    const quien = sesion.players[0]?.participanteId ?? '';
    return proyectarEstado(game, sesion, quien) !== undefined;
  });
  comprobar(
    `todo juego que use \`estadoDelJuego\` tiene lector en esta prueba`,
    conEstado.length === 0,
    { sinComprobar: conEstado, porque: 'mete algo en `estadoDelJuego` y nadie comprueba que la app lo lea' },
  );
}

console.log(`${hechas} comprobaciones`);
if (fallos.length === 0) {
  console.log('\nLos dos lados del hueco sin tipar hablan el mismo idioma.\n');
  process.exit(0);
}
console.log(`\n${fallos.length} FALLOS:\n`);
for (const f of fallos) console.log(`  ✗ ${f}`);
console.log('');
process.exit(1);
