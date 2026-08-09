/**
 * Una campaña de varias jornadas.
 *
 *   npm run verify:campana
 *
 * Una velada de CLUEDO empieza y acaba la misma noche, y por eso la sesión en
 * vivo nunca tuvo que sobrevivir a que la gente se fuera a su casa. Una campaña
 * de rol dura semanas: se juega un rato, se levanta la mesa y se retoma el
 * sábado siguiente con doce personas que ya no recuerdan dónde lo dejaron.
 *
 * Lo que se comprueba aquí es exactamente eso: que al cerrar un encuentro NO se
 * pierde nada —códigos, notas, tablón, giros repartidos y el estado propio del
 * juego— y que al retomarlo la gente encuentra escrito lo que pasó.
 *
 * EL JUEGO DE PRUEBA: «La Torre de Vela», una campaña por capítulos con fichas
 * de personaje que suben de nivel. Está elegida para romper por donde ni CLUEDO
 * ni la oca rompían: la partida NO termina al cerrar la jornada.
 */
import { manifiestoDe, registrarJuego } from '../../shared/juegos';
import { ejecutarAccion, registrarAcciones } from '../src/juegos/motor';
import { abrirEncuentro, abrirRonda, cerrarEncuentro, cerrarRonda, guardarNotas } from '../src/live/sesion';
import { vistaDeJugador } from '../src/live/proyeccion';
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

const LA_TORRE: ManifiestoDeJuego = {
  id: 'la-torre',
  nombre: 'La Torre de Vela',
  lema: 'Lo que empezó una noche tardará meses en terminar.',
  categorias: [
    { id: 'heroes', singular: 'héroe', plural: 'héroes', minimo: 2, sonJugadores: true },
    { id: 'lugares', singular: 'lugar', plural: 'lugares', minimo: 2, sonLugares: true },
  ],
  // Sin ejes: no hay nada que adivinar, hay una historia que jugar.
  turnos: 'simultaneo',
  acciones: [{ id: 'entrenar', rotulo: 'Entrenar', fases: ['ronda-abierta'], vecesPorTurno: 1 }],
  // Cuatro, y con los nombres de una campaña: la ficha se llama «Mi héroe».
  barra: [
    { pantalla: 'ronda', rotulo: 'La escena', icono: 'reloj' },
    { pantalla: 'personaje', rotulo: 'Mi héroe', icono: 'mascara' },
    { pantalla: 'cuaderno', rotulo: 'Diario', icono: 'cuaderno' },
    { pantalla: 'perfil', rotulo: 'Perfil', icono: 'copa' },
  ],
  asistente: { nombre: 'El Farolero', descripcion: 'Alumbra cuando te pierdes', icono: 'farol' },

  ronda: { accionSobre: 'lugares', cambiosPermitidos: 0 },
  fases: {
    lobby: ['ronda-abierta'],
    'ronda-abierta': ['ronda-cerrada'],
    // Aquí está la diferencia con una velada: al cerrar una ronda se puede
    // levantar la mesa sin terminar la partida.
    'ronda-cerrada': ['ronda-abierta', 'intermedio', 'acusaciones'],
    intermedio: ['lobby'],
    acusaciones: ['desenlace'],
    desenlace: [],
  },
  trofeos: [],
  seccionesDeDosier: [],
  documentos: [],
};
registrarJuego(LA_TORRE);

/** Entrenar sube un nivel. Es el estado que tiene que sobrevivir a la semana. */
registrarAcciones('la-torre', {
  entrenar: ({ sesion, suspectId }) => {
    const niveles = (sesion.estado?.niveles ?? {}) as Record<string, number>;
    const nivel = (niveles[suspectId] ?? 1) + 1;
    sesion.estado = { ...(sesion.estado ?? {}), niveles: { ...niveles, [suspectId]: nivel } };
    return { nivel };
  },
});

const ahora = '2026-05-01T19:00:00.000Z';

const game: GameSession = {
  id: 'torre',
  name: 'La Torre de Vela',
  status: 'ready',
  createdAt: ahora,
  updatedAt: ahora,
  entidades: {
    heroes: [
      { id: 'a', name: 'Íñigo' },
      { id: 'b', name: 'Berta' },
    ],
    lugares: [
      { id: 'l0', name: 'El foso' },
      { id: 'l1', name: 'La atalaya' },
    ],
  },
  suspects: [
    { id: 'a', name: 'Íñigo' },
    { id: 'b', name: 'Berta' },
  ],
  rooms: [
    { id: 'l0', name: 'El foso' },
    { id: 'l1', name: 'La atalaya' },
  ],
  weapons: [],
  boardMode: 'generated',
  settings: { language: 'es', juego: 'la-torre' },
};

const plot: Plot = {
  title: 'La Torre de Vela',
  tagline: 'Lo que empezó una noche tardará meses en terminar.',
  synopsis: 'La torre lleva encendida desde antes de que nadie recuerde.',
  victim: { name: '—', description: '' },
  setting: 'La frontera del norte.',
  solution: { respuestas: {}, motive: '', howItHappened: '' },
  characters: [
    { suspectId: 'a', characterName: 'Íñigo', role: 'Explorador', publicPersona: '', secret: '', motive: '', alibi: '', knowledge: [], personalHook: '' },
    { suspectId: 'b', characterName: 'Berta', role: 'Cantera', publicPersona: '', secret: '', motive: '', alibi: '', knowledge: [], personalHook: '' },
  ],
  timeline: [],
  clues: [
    { id: 'k1', roomId: 'l0', description: 'Una cuerda cortada.', pointsTo: 'Alguien bajó por aquí.', round: 1 },
  ],
  gmScript: [],
};
game.plot = plot;

const sesion: LiveSession = {
  id: game.id,
  juego: 'la-torre',
  code: 'TORRE1',
  phase: 'lobby',
  round: 0,
  totalRounds: 99,
  players: [
    { suspectId: 'a', displayName: 'Íñigo', joinCode: 'TOR001', joined: true, elecciones: [], notas: '', girosRecibidos: [] },
    { suspectId: 'b', displayName: 'Berta', joinCode: 'TOR002', joined: true, elecciones: [], notas: '', girosRecibidos: [] },
  ],
  acusaciones: [],
  tablon: [],
  rev: 1,
  updatedAt: ahora,
};

// ---------------------------------------------------------------------------
// Primera jornada
// ---------------------------------------------------------------------------

comprobar('la campaña se registra', manifiestoDe('la-torre').id === 'la-torre');

let v = vistaDeJugador(game, sesion, 'a')!;
comprobar('empieza en el primer encuentro', v.sesion.encuentro === 1, v.sesion.encuentro);
comprobar('sin crónica todavía', v.cronica.length === 0);

abrirRonda(sesion, 30);
ejecutarAccion(game, sesion, 'a', 'entrenar', {});
ejecutarAccion(game, sesion, 'b', 'entrenar', {});
guardarNotas(sesion, 'a', 'Lo del foso me da mala espina.');
sesion.players[0]!.girosRecibidos.push('giro-x');
cerrarRonda(sesion);

comprobar(
  'entrenar ha subido de nivel',
  (sesion.estado?.niveles as Record<string, number>)?.a === 2,
  sesion.estado,
);
const tablonAntes = sesion.tablon.length;
const rondaAntes = sesion.round;

// --- Se levanta la mesa ---
cerrarEncuentro(sesion, {
  titulo: 'La noche del foso',
  resumen: 'Bajaron al foso y encontraron la cuerda cortada. Íñigo subió de nivel.',
});

comprobar('la partida queda en intermedio', sesion.phase === 'intermedio', sesion.phase);
comprobar('y NO ha terminado', sesion.phase !== 'desenlace');
comprobar('se apunta lo ocurrido', sesion.cronica?.length === 1, sesion.cronica);
comprobar(
  'con las rondas que abarcó',
  sesion.cronica?.[0]?.desdeRonda === 1 && sesion.cronica[0].hastaRonda === rondaAntes,
  sesion.cronica?.[0],
);
comprobar('nadie tiene el turno con la mesa levantada', sesion.turnoDe === undefined);
comprobar('y el «estoy listo» se limpia', sesion.players.every((p) => p.pideEmpezar === false));

v = vistaDeJugador(game, sesion, 'a')!;
comprobar('quien juega ve que está en intermedio', v.sesion.phase === 'intermedio');
comprobar('y puede leer lo que pasó', v.cronica[0]?.titulo === 'La noche del foso', v.cronica);

// ---------------------------------------------------------------------------
// Una semana después
// ---------------------------------------------------------------------------

abrirEncuentro(sesion);

comprobar('se retoma en el segundo encuentro', sesion.encuentro === 2, sesion.encuentro);
comprobar('y en la sala de espera', sesion.phase === 'lobby', sesion.phase);

// NADA se ha perdido: eso es lo que se viene a comprobar.
comprobar(
  'los códigos con los que emparejaron siguen valiendo',
  sesion.players[0]?.joinCode === 'TOR001' && sesion.players[1]?.joinCode === 'TOR002',
);
comprobar('las notas siguen ahí', sesion.players[0]?.notas.includes('mala espina'));
comprobar('los giros ya repartidos también', sesion.players[0]?.girosRecibidos.includes('giro-x'));
comprobar('el tablón común se conserva', sesion.tablon.length === tablonAntes);
comprobar(
  'y el estado propio del juego, que es lo más importante',
  (sesion.estado?.niveles as Record<string, number>)?.a === 2,
  sesion.estado,
);

v = vistaDeJugador(game, sesion, 'a')!;
comprobar('el móvil ve el encuentro nuevo', v.sesion.encuentro === 2);
comprobar('y sigue viendo la crónica anterior', v.cronica.length === 1);
comprobar('mi personaje sigue siendo el mío', v.yo.characterName === 'Íñigo');

// --- Segunda jornada: las rondas siguen contando ---
abrirRonda(sesion, 30);
comprobar(
  'las rondas no se reinician: la 7 es la 7 de la campaña',
  sesion.round === rondaAntes + 1,
  sesion.round,
);
ejecutarAccion(game, sesion, 'a', 'entrenar', {});
comprobar(
  'y se sigue subiendo desde donde se quedó',
  (sesion.estado?.niveles as Record<string, number>)?.a === 3,
  sesion.estado,
);

cerrarRonda(sesion);
cerrarEncuentro(sesion, { titulo: 'La atalaya', resumen: 'Subieron a la atalaya.' });
comprobar('la crónica crece', sesion.cronica?.length === 2);
comprobar(
  'y cada entrada sabe qué rondas abarcó',
  sesion.cronica?.[1]?.desdeRonda === rondaAntes + 1,
  sesion.cronica?.[1],
);

// --- Una velada normal no puede levantarse a medias ---
let cluedoNoPuede = false;
try {
  cerrarEncuentro({ ...sesion, juego: 'cluedo', phase: 'ronda-cerrada' } as LiveSession, {
    titulo: 'x',
    resumen: 'y',
  });
} catch {
  cluedoNoPuede = true;
}
comprobar('una velada de una noche no admite intermedio', cluedoNoPuede);

// ---------------------------------------------------------------------------

console.log('\nLa Torre de Vela · una campaña de dos jornadas');
console.log(`${hechas} comprobaciones`);
if (fallos.length === 0) {
  console.log('\nLa partida sobrevive a que la gente se vaya a su casa.');
  process.exit(0);
}
console.log(`\n${fallos.length} FALLOS:\n`);
for (const f of fallos) console.log(`  ✗ ${f}`);
process.exit(1);
