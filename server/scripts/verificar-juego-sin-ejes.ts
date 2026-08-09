/**
 * Un juego que no es de adivinar nada.
 *
 *   npm run verify:sin-ejes
 *
 * La plataforma tiene que servir para todo el abanico: desde una oca temática
 * hasta una campaña de rol de varios días. Ninguno de esos dos extremos tiene
 * «respuesta que adivinar», y una oca tampoco tiene rondas simultáneas. Mientras
 * los ejes fueron obligatorios y lo único que se podía hacer en una ronda fue
 * elegir sala, la plataforma solo sabía organizar juegos de deducción aunque
 * nadie lo hubiera dicho en voz alta.
 *
 * Esta comprobación es la que impide que eso vuelva. «La Oca del Misterio»:
 *
 *   · CERO ejes. No hay nada que acertar, y por tanto no hay acusación.
 *   · POR TURNOS. Solo actúa quien lo tiene.
 *   · Una acción propia —tirar el dado— con su reductor, que el motor ejecuta
 *     sin saber qué significa. Ahí está la prueba de verdad: el juego trae su
 *     lógica, y el motor solo comprueba lo que es igual en todos.
 *   · Estado propio: las casillas de cada ficha. El motor lo guarda y no lo
 *     mira.
 */
import { manifiestoDe, registrarJuego } from '../../shared/juegos';
import {
  AccionInvalida,
  accionesDisponibles,
  ejecutarAccion,
  registrarAcciones,
} from '../src/juegos/motor';
import { acusar } from '../src/live/sesion';
import { vistaDeJugador } from '../src/live/proyeccion';
import { ejes as ejesDe } from '../../shared/juegos';
import type { ManifiestoDeJuego } from '../../shared/juegos';
import type { GameSession, Plot } from '../../shared/types';
import type { LiveSession } from '../../shared/live';

let hechas = 0;
const fallos: string[] = [];
function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (!condicion) {
    fallos.push(`${que}${detalle === undefined ? '' : `\n      ${JSON.stringify(detalle)?.slice(0, 200)}`}`);
  }
}

// ---------------------------------------------------------------------------
// El juego
// ---------------------------------------------------------------------------

const CASILLAS = ['Salida', 'El puente', 'La posada', 'El pozo', 'El laberinto', 'La meta'];

const LA_OCA: ManifiestoDeJuego = {
  id: 'la-oca',
  nombre: 'La Oca del Misterio',
  lema: 'De oca a oca, y tiro porque me toca.',
  categorias: [
    { id: 'jugadores', singular: 'jugador', plural: 'jugadores', minimo: 2, sonJugadores: true },
    { id: 'casillas', singular: 'casilla', plural: 'casillas', minimo: 4, sonLugares: true },
  ],
  // Sin `ejes`. Deliberadamente ausente, no vacío: un juego que no va de
  // adivinar no debería tener ni que mencionarlo.
  turnos: 'por-turnos',
  acciones: [
    { id: 'tirar', rotulo: 'Tirar el dado', fases: ['ronda-abierta'], vecesPorTurno: 1 },
    {
      id: 'plantarse',
      rotulo: 'Plantarse en una casilla',
      fases: ['ronda-abierta'],
      eligeDe: [{ campo: 'casilla', categoria: 'casillas', rotulo: '¿Dónde te plantas?' }],
    },
  ],
  ronda: { accionSobre: 'casillas', cambiosPermitidos: 0 },
  fases: {
    lobby: ['ronda-abierta'],
    'ronda-abierta': ['ronda-cerrada'],
    'ronda-cerrada': ['ronda-abierta', 'acusaciones'],
    acusaciones: ['desenlace'],
    desenlace: [],
  },
  trofeos: [],
  seccionesDeDosier: [],
  documentos: [],
};

registrarJuego(LA_OCA);

/**
 * Lo que HACEN las acciones de la oca. El motor no sabe qué es una casilla.
 *
 * El dado es determinista a propósito —avanza siempre dos— para que la prueba
 * pueda afirmar dónde acaba cada ficha.
 */
registrarAcciones('la-oca', {
  tirar: ({ sesion, suspectId }) => {
    const posiciones = (sesion.estado?.posiciones ?? {}) as Record<string, number>;
    const nueva = Math.min(CASILLAS.length - 1, (posiciones[suspectId] ?? 0) + 2);
    sesion.estado = { ...(sesion.estado ?? {}), posiciones: { ...posiciones, [suspectId]: nueva } };
    if (nueva === CASILLAS.length - 1) sesion.winnerId = suspectId;
    return { casilla: nueva };
  },
  plantarse: ({ sesion, suspectId, datos }) => {
    const indice = CASILLAS.findIndex((_, i) => `c${i}` === datos.casilla);
    const posiciones = (sesion.estado?.posiciones ?? {}) as Record<string, number>;
    sesion.estado = { ...(sesion.estado ?? {}), posiciones: { ...posiciones, [suspectId]: indice } };
    return { casilla: indice };
  },
});

// ---------------------------------------------------------------------------
// Una partida
// ---------------------------------------------------------------------------

const ahora = '2026-04-01T18:00:00.000Z';

const game: GameSession = {
  id: 'oca',
  name: 'Oca en casa de la abuela',
  status: 'ready',
  createdAt: ahora,
  updatedAt: ahora,
  entidades: {
    jugadores: [
      { id: 'j0', name: 'Marta' },
      { id: 'j1', name: 'Nico' },
    ],
    casillas: CASILLAS.map((name, i) => ({ id: `c${i}`, name })),
  },
  // Los campos heredados de CLUEDO van vacíos: si algo del motor los buscara,
  // esta prueba se caería, que es justo lo que se quiere comprobar.
  suspects: [
    { id: 'j0', name: 'Marta' },
    { id: 'j1', name: 'Nico' },
  ],
  rooms: [],
  weapons: [],
  boardMode: 'generated',
  settings: { language: 'es', juego: 'la-oca' },
};

const plot: Plot = {
  title: 'La Oca del Misterio',
  tagline: 'De oca a oca, y tiro porque me toca.',
  synopsis: 'Se juega en el salón de la abuela, con el tablero de siempre.',
  victim: { name: '—', description: '' },
  setting: 'El salón, después de comer.',
  // Sin respuesta. El diccionario va vacío y nadie lo echa de menos.
  solution: { respuestas: {}, motive: '', howItHappened: '' },
  characters: [
    {
      suspectId: 'j0',
      characterName: 'Marta',
      role: 'Jugadora',
      publicPersona: 'Tira con ganas.',
      secret: '',
      motive: '',
      alibi: '',
      knowledge: [],
      personalHook: '',
    },
    {
      suspectId: 'j1',
      characterName: 'Nico',
      role: 'Jugador',
      publicPersona: 'Se queja del dado.',
      secret: '',
      motive: '',
      alibi: '',
      knowledge: [],
      personalHook: '',
    },
  ],
  timeline: [],
  clues: [],
  gmScript: [],
};
game.plot = plot;

const sesion: LiveSession = {
  id: game.id,
  juego: 'la-oca',
  code: 'OCAOCA',
  phase: 'lobby',
  round: 0,
  totalRounds: 3,
  turnoDe: 'j0',
  players: [
    { suspectId: 'j0', displayName: 'Marta', joinCode: 'OCA001', joined: true, elecciones: [], notas: '', girosRecibidos: [] },
    { suspectId: 'j1', displayName: 'Nico', joinCode: 'OCA002', joined: true, elecciones: [], notas: '', girosRecibidos: [] },
  ],
  acusaciones: [],
  tablon: [],
  rev: 1,
  updatedAt: ahora,
};

// ---------------------------------------------------------------------------
// Comprobaciones
// ---------------------------------------------------------------------------

const manifiesto = manifiestoDe('la-oca');
comprobar('el juego se registra', manifiesto.id === 'la-oca');
comprobar('sin ningún eje', ejesDe(manifiesto).length === 0);
comprobar('y va por turnos', manifiesto.turnos === 'por-turnos');

let v = vistaDeJugador(game, sesion, 'j0')!;
comprobar('se compone la vista de un juego sin misterio', Boolean(v));
comprobar('nada que preguntar para acusar', v.ejes.length === 0, v.ejes);
comprobar('nadie es el culpable', v.yo.soyCulpable === false);
comprobar('el título es el del juego', v.sesion.tituloPartida === 'La Oca del Misterio');

// --- La acción propia del juego ---
sesion.phase = 'ronda-abierta';
sesion.round = 1;

comprobar(
  'a quien le toca puede tirar',
  accionesDisponibles(sesion, 'j0').some((a) => a.id === 'tirar'),
);
comprobar(
  'y a quien no le toca, no puede hacer nada',
  accionesDisponibles(sesion, 'j1').length === 0,
);

const tirada = ejecutarAccion(game, sesion, 'j0', 'tirar', {}) as { casilla: number };
comprobar('la tirada la resuelve el juego, no el motor', tirada.casilla === 2, tirada);
comprobar(
  'y queda guardada en el estado propio del juego',
  (sesion.estado?.posiciones as Record<string, number>)?.j0 === 2,
  sesion.estado,
);

let repetida = false;
try {
  ejecutarAccion(game, sesion, 'j0', 'tirar', {});
} catch (e) {
  repetida = e instanceof AccionInvalida;
}
comprobar('no se puede tirar dos veces en el mismo turno', repetida);

let fueraDeTurno = false;
try {
  ejecutarAccion(game, sesion, 'j1', 'tirar', {});
} catch (e) {
  fueraDeTurno = e instanceof AccionInvalida;
}
comprobar('ni tirar cuando no te toca', fueraDeTurno);

// El motor comprueba que lo elegido existe DE VERDAD y en su categoría.
let opcionInventada = false;
try {
  ejecutarAccion(game, sesion, 'j0', 'plantarse', { casilla: 'no-existe' });
} catch (e) {
  opcionInventada = e instanceof AccionInvalida;
}
comprobar('una opción inventada se rechaza', opcionInventada);

let sinElegir = false;
try {
  ejecutarAccion(game, sesion, 'j0', 'plantarse', {});
} catch (e) {
  sinElegir = e instanceof AccionInvalida;
}
comprobar('y también dejarla en blanco', sinElegir);

const plantado = ejecutarAccion(game, sesion, 'j0', 'plantarse', { casilla: 'c3' }) as {
  casilla: number;
};
comprobar('una opción real se acepta', plantado.casilla === 3, plantado);

// Una acción de otro juego no existe aquí.
let ajena = false;
try {
  ejecutarAccion(game, sesion, 'j0', 'acusar', {});
} catch (e) {
  ajena = e instanceof AccionInvalida;
}
comprobar('una acción que no está en el repertorio se rechaza', ajena);

// --- Ganar sin acertar nada ---
sesion.turnoDe = 'j1';
sesion.round = 2;
ejecutarAccion(game, sesion, 'j1', 'tirar', {});
sesion.round = 3;
ejecutarAccion(game, sesion, 'j1', 'tirar', {});
sesion.round = 4;
ejecutarAccion(game, sesion, 'j1', 'tirar', {});
comprobar('se gana llegando, no acertando', sesion.winnerId === 'j1', sesion.winnerId);

// --- Y no se puede acusar, porque no hay nada que acusar ---
let noSePuedeAcusar = false;
try {
  sesion.phase = 'acusaciones';
  acusar(sesion, 'j0', {}, {});
} catch {
  noSePuedeAcusar = true;
}
comprobar('no se puede acusar en un juego sin ejes', noSePuedeAcusar);

// --- El desenlace ---
sesion.phase = 'desenlace';
v = vistaDeJugador(game, sesion, 'j0')!;
comprobar('el desenlace se compone igual', Boolean(v.desenlace));
comprobar('con cero renglones de respuesta', v.desenlace?.respuestas.length === 0, v.desenlace?.respuestas);
comprobar('sin señalar a nadie', v.desenlace?.culpableId === undefined);
comprobar('pero con su ganador', v.desenlace?.ganador?.suspectId === 'j1', v.desenlace?.ganador);

// ---------------------------------------------------------------------------

console.log('\nLa Oca del Misterio · sin ejes, por turnos, con acción propia');
console.log(`${hechas} comprobaciones`);
if (fallos.length === 0) {
  console.log('\nEl motor organiza un juego que no va de adivinar nada.');
  process.exit(0);
}
console.log(`\n${fallos.length} FALLOS:\n`);
for (const f of fallos) console.log(`  ✗ ${f}`);
process.exit(1);
