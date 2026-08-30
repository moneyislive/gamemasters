/**
 * El Mayordomo no puede dar ventaja: se comprueba aquí.
 *
 *   npm run verify:mayordomo
 *
 * No basta con pedirle al modelo que no ayude a deducir; un jugador insistente
 * acaba sacándole cualquier cosa que tenga delante. Lo que de verdad lo impide
 * es que su contexto no contenga la información. Esto lo verifica de forma
 * literal: monta partidas completas, las lleva al peor caso —ronda cerrada,
 * pistas repartidas, tablón poblado, giros entregados— y busca en el texto que
 * viaja al modelo fragmentos exactos de todo lo que jamás debería llegarle.
 *
 * Sobre los falsos positivos: el generador de demostración reparte secretos,
 * motivos y coartadas ciclando listas fijas, así que dos personajes distintos
 * comparten a menudo el mismo texto palabra por palabra. Encontrar «la coartada
 * de Bruno» en el contexto no prueba nada si resulta ser también la coartada de
 * quien pregunta. Por eso un fragmento solo cuenta como fuga cuando aparece en
 * el contexto Y NO procede de nada que el Mayordomo tenga permitido saber.
 *
 * Y como el culpable se sortea al azar, se repite con varias tramas: una sola
 * pasada no vería el caso en que quien pregunta es el asesino.
 *
 * Si alguien añade `vista.misPistas` o `vista.tablon` al contexto «para que
 * ayude mejor», esto falla. Esa es toda su razón de ser.
 */
import { generateDemoPlot } from '../src/plot/cluedo-demo';
import { generateBoardLayout } from '../src/board/generator';
import { contextoDelMayordomo } from '../src/live/consejero';
import { vistaDeJugador } from '../src/live/proyeccion';
import { abrirRonda, cerrarRonda } from '../src/live/sesion';
import { REGLAS_JUGADOR } from '../src/docs/datos';
import type { GameSession } from '../../shared/types';
import type { LiveSession } from '../../shared/live';

const RONDAS = 25;
const MARCA_GIRO = 'GIRO PERSONAL QUE NADIE MAS DEBE VER';
const MARCA_CRONOLOGIA = 'REVELACION RESERVADA DE LA CRONOLOGIA';
const MARCA_AYUDA = 'AYUDA DE NIVEL TRES QUE CASI LO DICE TODO';
const MARCA_CONFESION = 'LA CONFESION FINAL DEL CULPABLE';

/** Una partida llevada hasta el momento en que más información hay repartida. */
function partidaEnElPeorCaso(n: number): { game: GameSession; sesion: LiveSession; yo: string } {
  const ahora = new Date().toISOString();
  const game: GameSession = {
    id: `verificacion-${n}`,
    name: 'Verificación del Mayordomo',
    status: 'ready',
    createdAt: ahora,
    updatedAt: ahora,
    suspects: ['Ana', 'Bruno', 'Carla', 'Dani', 'Elena'].map((name, i) => ({ id: `s${i}`, name })),
    rooms: ['Salón', 'Cocina', 'Biblioteca', 'Invernadero'].map((name, i) => ({ id: `r${i}`, name })),
    weapons: ['Candelabro', 'Cuerda', 'Abrecartas'].map((name, i) => ({ id: `w${i}`, name })),
    boardMode: 'generated',
    settings: { language: 'es' },
  };
  game.board = generateBoardLayout(game.rooms);
  game.plot = generateDemoPlot(game);

  // Material impreso, con marcas reconocibles: si alguna aparece en el
  // contexto, el fallo es inequívoco y no hay nada que interpretar.
  game.plot.material = {
    generatedAt: ahora,
    narrations: [{ round: 1, title: 'Ronda 1', text: 'Se abre la ronda.', stageDirection: '' }],
    twists: game.suspects.map((s, i) => ({
      id: `giro-${i}`,
      participanteId: s.id,
      round: 2,
      instruction: `${MARCA_GIRO}: viste algo junto al invernadero.`,
    })),
    timelineReveals: [{ round: 1, time: '21:40', fact: `${MARCA_CRONOLOGIA} de la ronda uno.` }],
    hints: [{ level: 3, text: MARCA_AYUDA }],
    finale: {
      reconstruction: 'RECONSTRUCCION',
      confession: MARCA_CONFESION,
      epilogue: 'EPILOGO',
    },
  };

  const yo = game.suspects[n % game.suspects.length]!.id;
  const sesion: LiveSession = {
    id: game.id,
    code: 'PRUEBA',
    phase: 'lobby',
    round: 0,
    totalRounds: 4,
    players: game.suspects.map((s) => ({
      participanteId: s.id,
      displayName: s.name,
      joinCode: 'AAAAAA',
      joined: true,
      elecciones: [],
      notas: '',
      girosRecibidos: game.suspects.map((_, i) => `giro-${i}`),
    })),
    respuestasEntregadas: [],
    porDondePasaron: [],
    rev: 1,
    updatedAt: ahora,
  };

  // Se juega una ronda entera y se cierra: así hay pistas encontradas, el
  // tablón tiene contenido y los `pointsTo` ya se han desvelado.
  abrirRonda(sesion, 15);
  for (const j of sesion.players) {
    const sala = game.plot.clues.find((c) => c.round === 1 && c.lugarId)?.lugarId;
    if (sala) j.elecciones.push({ round: 1, lugarId: sala, at: ahora });
  }
  cerrarRonda(sesion);

  return { game, sesion, yo };
}

/** Todo lo que el Mayordomo SÍ puede saber. Nada más puede salir de aquí. */
function corpusPermitido(game: GameSession, yo: string): string {
  const plot = game.plot!;
  const mio = plot.characters.find((c) => c.participanteId === yo)!;
  return [
    plot.title ?? '',
    plot.synopsis,
    plot.victim?.name ?? '',
    plot.victim?.description ?? '',
    plot.setting ?? '',
    mio.characterName,
    mio.role,
    mio.publicPersona,
    mio.secret,
    mio.motive,
    mio.alibi,
    mio.personalHook,
    ...plot.characters.map((c) => `${c.characterName} ${c.role}`),
    ...game.rooms.map((r) => r.name),
    ...game.weapons.map((w) => w.name),
    ...REGLAS_JUGADOR.map((r) => `${r.titulo} ${r.texto}`),
  ].join('\n');
}

interface Fuga {
  vuelta: number;
  que: string;
  fragmento: string;
}

const fugas: Fuga[] = [];
let culpablesPreguntando = 0;
let totalComprobaciones = 0;
let ambiguos = 0;
let ultimoTamano = 0;

for (let n = 0; n < RONDAS; n++) {
  const { game, sesion, yo } = partidaEnElPeorCaso(n);
  const plot = game.plot!;
  const vista = vistaDeJugador(game, sesion, yo);
  if (!vista) throw new Error('la proyección no devolvió vista');

  const contexto = contextoDelMayordomo(vista);
  ultimoTamano = contexto.length;
  if (vista.yo.soyCulpable) culpablesPreguntando++;

  const permitido = corpusPermitido(game, yo);
  const ajenos = plot.characters.filter((c) => c.participanteId !== yo);

  const prohibido: Array<[string, string]> = [
    ['el relato de cómo ocurrió', plot.solution.howItHappened ?? ''],
    ['el motivo real del crimen', plot.solution.motive ?? ''],
    ['el giro personal', MARCA_GIRO],
    ['la revelación de la cronología', MARCA_CRONOLOGIA],
    ['la ayuda de nivel 3', MARCA_AYUDA],
    ['la confesión final', MARCA_CONFESION],
    ...plot.clues.map((c, i): [string, string] => [`la pista ${i + 1}`, c.description]),
    ...plot.clues.map((c, i): [string, string] => [`a qué señala la pista ${i + 1}`, c.pointsTo]),
    ...plot.timeline.map((e, i): [string, string] => [`el momento ${i + 1} de la cronología`, e.description]),
    ...ajenos.map((c): [string, string] => [`el secreto de ${c.characterName}`, c.secret ?? '']),
    ...ajenos.map((c): [string, string] => [`la coartada de ${c.characterName}`, c.alibi ?? '']),
    ...ajenos.map((c): [string, string] => [`el motivo de ${c.characterName}`, c.motive ?? '']),
    ...ajenos.flatMap((c) =>
      (c.knowledge ?? []).map((k): [string, string] => [`lo que sabe ${c.characterName}`, k]),
    ),
  ];

  for (const [que, texto] of prohibido) {
    const frag = texto.trim().slice(0, 45);
    if (frag.length < 15) continue;
    totalComprobaciones++;
    if (!contexto.includes(frag)) continue;
    // Está en el contexto. ¿Ha entrado por una vía legítima?
    if (permitido.includes(frag)) {
      ambiguos++;
      continue;
    }
    fugas.push({ vuelta: n, que, fragmento: frag });
  }
}

console.log(`\nEl Mayordomo · ${RONDAS} tramas llevadas a ronda cerrada`);
console.log(`${totalComprobaciones} comprobaciones · último contexto: ${ultimoTamano} caracteres`);
console.log(
  `en ${culpablesPreguntando} de las ${RONDAS} preguntaba el propio culpable\n` +
    `${ambiguos} coincidencias descartadas por proceder de material que sí puede ver\n`,
);

if (fugas.length > 0) {
  console.log('FUGAS — el contexto lleva material reservado:');
  for (const f of fugas.slice(0, 20)) {
    console.log(`  ✗ [trama ${f.vuelta}] ${f.que}\n      «${f.fragmento}…»`);
  }
  console.log(`\n${fugas.length} fugas. El Mayordomo puede dar ventaja.`);
  process.exit(1);
}

console.log('Ninguna fuga: el contexto no contiene solución, pistas, cronología,');
console.log('giros, ni secretos, motivos o coartadas de los demás.');
