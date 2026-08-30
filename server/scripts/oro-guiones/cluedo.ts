/**
 * La velada de referencia de CLUEDO.
 *
 * ═══ ESTE FICHERO NO SE TOCA A LA LIGERA ═══
 *
 * Lo que hay aquí estaba dentro de `oro.ts` y se ha mudado SIN CAMBIAR NADA:
 * las mismas ocho personas, las mismas ocho salas, los mismos cinco objetos, el
 * mismo reparto determinista de salas por ronda y las mismas tres acusaciones.
 * Cambiar cualquiera de esas cosas mueve la instantánea entera y deja de haber
 * red: el diff saldría lleno y nadie sabría cuál de las mil diferencias era la
 * que importaba.
 *
 * Si algún día hay que cambiar el guion, se hace en un commit que NO toque nada
 * más, con el `oro:capturar` correspondiente, y explicando en el mensaje por
 * qué la velada nueva prueba lo mismo o más que la vieja.
 *
 * ═══ POR QUÉ SIGUE LLAMANDO A LAS FUNCIONES DE CLUEDO ═══
 *
 * Los guiones de la Momia y de las Sombras conducen su partida por el motor
 * genérico —`ejecutarAccion`—, que es lo correcto y de paso congela las
 * validaciones. Este no: llama a `elegirSala` y a `acusar` directamente, que es
 * lo que hacía antes.
 *
 * Es a propósito. Este guion tiene un trabajo que los otros dos no tienen:
 * demostrar que la mudanza de `oro.ts` a esta carpeta no cambió ni un byte de
 * lo que CLUEDO produce. Para eso tiene que hacer EXACTAMENTE lo de antes. El
 * día que esa comparación ya no haga falta, pasarlo al motor genérico es una
 * mejora — y entonces habrá que recapturar, porque el registro de acciones
 * (`sesion.acciones`) sí cambiaría, y ese sí viaja en la vista.
 */
import { generateBoardLayout } from '../../src/board/generator';
import { generateDemoPlot } from '../../src/plot/demoPlot';
import { acusar, elegirSala, abrirRonda, cerrarRonda, guardarNotas } from '../../src/live/sesion';
import { EJES, respuestasCluedo } from '../../src/juegos/cluedo';
import type { GameSession } from '../../../shared/types';
import type { LiveSession } from '../../../shared/live';
import type { GuionDeOro, Mesa } from './tipos';

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

const AHORA = '2026-01-01T20:00:00.000Z';

function partidaDeReferencia(): GameSession {
  const game: GameSession = {
    id: 'oro',
    name: 'Partida de referencia',
    status: 'ready',
    createdAt: AHORA,
    updatedAt: AHORA,
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
    generatedAt: AHORA,
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
  return game;
}

function sesionInicial(game: GameSession): LiveSession {
  return {
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
      lastSeenAt: AHORA,
      elecciones: [],
      notas: '',
      girosRecibidos: [],
    })),
    acusaciones: [],
    tablon: [],
    rev: 1,
    updatedAt: AHORA,
  };
}

/**
 * Una velada entera, jugada paso a paso.
 *
 * El guion es fijo a propósito y toca todo lo que se puede tocar: elegir sala,
 * cambiarse, escribir notas, recibir giros, acusar bien y acusar mal, y llegar
 * al desenlace.
 */
function velada({ game, sesion, retratar }: Mesa): void {
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

  const solucion = game.plot!.solution.respuestas;
  // Una acusación equivocada, una a medias y la correcta: los tres casos que
  // decide el recuento de aciertos.
  acusar(
    sesion,
    game.suspects[2]!.id,
    respuestasCluedo({
      murdererId: game.suspects[7]!.id,
      weaponId: game.weapons[0]!.id,
      roomId: game.rooms[0]!.id,
    }),
    solucion,
  );
  acusar(
    sesion,
    game.suspects[3]!.id,
    { ...solucion, [EJES.objeto]: game.weapons[1]!.id },
    solucion,
  );
  acusar(sesion, game.suspects[4]!.id, { ...solucion }, solucion);
  retratar('acusaciones-entregadas');

  sesion.phase = 'desenlace';
  retratar('desenlace');
}

export const GUION: GuionDeOro = {
  juego: 'cluedo',
  titulo: 'Una velada en la casa de los Sabrón',
  partidaDeReferencia,
  sesionInicial,
  velada,
};
