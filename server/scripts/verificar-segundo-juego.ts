/**
 * La prueba que de verdad importa: meter un juego que NO es CLUEDO.
 *
 *   npm run verify:segundo-juego
 *
 * Todo lo demás de este refactor comprueba que CLUEDO sigue funcionando. Eso
 * es necesario pero no demuestra nada sobre la generalización: un código puede
 * seguir haciendo lo mismo y seguir sirviendo solo para un juego. Lo único que
 * lo demuestra es meter un segundo juego distinto y ver si el motor lo aguanta
 * sin tocarlo.
 *
 * EL JUEGO DE PRUEBA: «El Legado». Una noche de herencias en la que alguien se
 * ha llevado una pieza de la colección. Está elegido para romper por donde
 * CLUEDO no rompía:
 *
 *   · DOS ejes, no tres. Quién y qué. No hay «dónde» en la respuesta, que era
 *     justo lo que el contrato daba por supuesto.
 *   · La categoría sobre la que se actúa en la ronda —las estancias— NO es
 *     ninguno de los ejes. En CLUEDO la sala era las dos cosas a la vez, y eso
 *     escondía si el código las distinguía de verdad.
 *   · Nombres de categoría propios: herederos, piezas, estancias. Si algo
 *     seguía buscando «sospechosos» o «armas», aquí se cae.
 *
 * No se le escribe generador de trama ni plantillas de imprimibles: eso es
 * contenido y cada juego lo trae. Lo que se comprueba es el MOTOR.
 */
import { manifiestoDe, registrarJuego, ejes as ejesDe } from '../../shared/juegos';
import { abrirRonda, responder, cerrarRonda, elegirSala } from '../src/live/sesion';
import { vistaDeGameMaster, vistaDeJugador } from '../src/live/proyeccion';
import { repararRespuestas } from '../src/juegos/solucion';
import { computeStaleness } from '../../shared/staleness';
import type { ManifiestoDeJuego } from '../../shared/juegos';
import type { GameSession, Plot } from '../../shared/types';
import type { LiveSession } from '../../shared/live';
import { leerBloqueDePistas } from '../../shared/mecanicas/pistas';
import type { BloqueDePistas } from '../../shared/mecanicas/pistas';
import type { VistaJugador } from '../../shared/live';
import { registrarProyeccion } from '../src/juegos/proyecciones';
import { bloqueDePistas } from '../src/mecanicas/pistas';

/**
 * El bloque de la mecanica de pistas, o un fallo ruidoso.
 *
 * REVIENTA a proposito cuando no esta. Estos campos viajaban en la vista comun
 * y ahora van en `estadoDelJuego`, que es `unknown`: si esto devolviera un
 * objeto vacio en vez de tirar, cada comprobacion de aqui abajo seguiria
 * ejecutandose y comparando listas vacias con listas vacias. Pasarian todas, y
 * la pestana de Pistas estaria en blanco en el movil.
 */
function pistasDe(v: VistaJugador): BloqueDePistas {
  const estado = leerBloqueDePistas(v.estadoDelJuego);
  if (!estado) throw new Error('la vista no trae el bloque de pistas: mira si el juego registra la proyeccion que lo compone');
  return estado;
}

let hechas = 0;
const fallos: string[] = [];
function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (!condicion) {
    fallos.push(`${que}${detalle === undefined ? '' : `\n      ${JSON.stringify(detalle)?.slice(0, 220)}`}`);
  }
}

// ---------------------------------------------------------------------------
// El manifiesto del segundo juego
// ---------------------------------------------------------------------------

const EL_LEGADO: ManifiestoDeJuego = {
  id: 'el-legado',
  nombre: 'El Legado',
  lema: 'La colección estaba completa al empezar la cena.',

  categorias: [
    { id: 'herederos', singular: 'heredero', plural: 'herederos', minimo: 3, sonJugadores: true, admiteFoto: true, admiteEmail: true },
    { id: 'piezas', singular: 'pieza', plural: 'piezas', minimo: 3, admiteFoto: true },
    { id: 'estancias', singular: 'estancia', plural: 'estancias', minimo: 2, sonLugares: true, admiteFoto: true },
  ],

  // Dos ejes. Aquí es donde el contrato antiguo se rompía sin remedio.
  ejes: [
    { id: 'ladron', pregunta: '¿Quién se la llevó?', rotulo: 'Quién', categoria: 'herederos' },
    { id: 'pieza', pregunta: '¿Qué falta?', rotulo: 'Qué', categoria: 'piezas' },
  ],

  turnos: 'simultaneo',
  acciones: [
    {
      id: 'entrar-en-estancia',
      rotulo: 'Pasar a una estancia',
      fases: ['ronda-abierta'],
      eligeDe: [{ campo: 'estancia', categoria: 'estancias', rotulo: '¿A dónde pasas?' }],
    },
    { id: 'senalar', rotulo: 'Señalar', fases: ['acusaciones'], vecesPorTurno: 1 },
  ],

  // Cinco pestañas, no seis: aquí no hay cuaderno.
  barra: [
    { pantalla: 'ronda', rotulo: 'La cena', icono: 'reloj' },
    { pantalla: 'personaje', rotulo: 'Tú', icono: 'mascara' },
    { pantalla: 'mapa', rotulo: 'La casa', icono: 'plano' },
    { pantalla: 'hechos', rotulo: 'Lo visto', icono: 'cartel' },
    { pantalla: 'perfil', rotulo: 'Perfil', icono: 'copa' },
  ],
  // Un dosier corto: este juego tiene pestana de `tablon` donde mirar lo visto.
  dosier: ['identidad', 'senalado', 'persona-publica', 'secreto', 'conocimiento'],

  asistente: {
    nombre: 'El Notario', descripcion: 'Guarda el testamento y poco más', icono: 'mayordomo',
    voz: 'Eres el asistente de esta velada. Hablas en espanol, breve y claro.',
    saludo: 'Tu diras. No se la solucion ni las pistas.',
    seNiega: 'yo no resuelvo nada, solo acompano',
    sinIa: {
      reglas: 'Se juega por rondas: se actua, se cierra y se habla.',
      personaje: 'Tu papel lo sabes tu mejor que yo.',
      solucion: 'Eso no me toca a mi decirlo.',
      general: 'Habla con quien todavia no hayas hablado.',
    },
  },

  // Y se actúa sobre una categoría que no responde a ningún eje.
  ronda: { accionSobre: 'estancias', cambiosPermitidos: 2 },

  fases: {
    lobby: ['ronda-abierta'],
    'ronda-abierta': ['ronda-cerrada'],
    'ronda-cerrada': ['ronda-abierta', 'acusaciones'],
    acusaciones: ['desenlace'],
    // Una velada empieza y acaba la misma noche: nunca hay intermedio.
    // Este juego no pasa por el sellado de la Momia.
    sellado: [],
    intermedio: [],
    desenlace: [],
  },

  papelDeFase: {
    lobby: 'espera',
    'ronda-abierta': 'turno',
    'ronda-cerrada': 'entreacto',
    intermedio: 'pausa',
    acusaciones: 'decision',
    desenlace: 'fin',
  },

  trofeos: [
    { id: 'primera-partida', nombre: 'Primera velada', descripcion: 'Jugaste una entera.', glifo: '🕯' },
  ],
  seccionesDeDosier: [
    { id: 'cover', label: 'Portada', description: 'El título y de quién es el dosier.', required: true },
    { id: 'character', label: 'Tu personaje', description: 'Quién eres esta noche.', required: true },
  ],
  documentos: [],
};

registrarJuego(EL_LEGADO);

/*
 * ═══ Y SE APUNTA A LA MECANICA DE LAS PISTAS ═══
 *
 * Esta linea es, ella sola, la prueba de que la tercera capa funciona.
 *
 * Antes las pistas las componia el nucleo para todo el mundo, asi que este
 * juego las tenia porque no habia forma de no tenerlas —y la Momia y las
 * Sombras las tenian vacias por la misma razon—. Ahora se cogen llamando a una
 * funcion, y quien la llama aqui es un juego inventado para esta prueba que no
 * conoce a CLUEDO, no importa nada suyo, y no tiene ni sus nombres de
 * categoria ni sus ejes ni su numero de ejes.
 *
 * Si esta linea se borra, las diez comprobaciones de mas abajo se caen con un
 * error que lo dice. Si la mecanica dejara de ser reutilizable —si volviera a
 * mirar dentro de CLUEDO por algun sitio— tambien.
 */
registrarProyeccion('el-legado', bloqueDePistas);

// ---------------------------------------------------------------------------
// Una partida de El Legado
// ---------------------------------------------------------------------------

const HEREDEROS = ['Amelia', 'Bernardo', 'Casilda', 'Damián'];
const PIEZAS = ['El camafeo', 'La miniatura', 'El reloj de leontina'];
const ESTANCIAS = ['La galería', 'El fumadero', 'La escalinata'];
const ahora = '2026-03-01T21:00:00.000Z';

const game: GameSession = {
  id: 'legado',
  name: 'La cena de los Ardavín',
  status: 'ready',
  createdAt: ahora,
  updatedAt: ahora,
  // Las tres categorías van en `entidades`, con sus nombres propios. Ni un solo
  // `suspects`, `rooms` ni `weapons`: si algo del motor los buscara, no
  // encontraría nada y la prueba se caería.
  entidades: {
    herederos: HEREDEROS.map((name, i) => ({ id: `h${i}`, name })),
    piezas: PIEZAS.map((name, i) => ({ id: `p${i}`, name })),
    estancias: ESTANCIAS.map((name, i) => ({ id: `e${i}`, name })),
  },
  boardMode: 'generated',
  settings: { language: 'es', juego: 'el-legado' },
};

const plot: Plot = {
  title: 'El Legado',
  tagline: 'La colección estaba completa al empezar la cena.',
  synopsis: 'Al servirse el café faltaba una pieza de la vitrina. Nadie ha salido de la casa.',
  victim: { name: 'La colección Ardavín', description: 'Tres piezas heredadas de la abuela.' },
  setting: 'La casa de los Ardavín, una noche de marzo.',
  solution: {
    // Dos respuestas. Ni tres, ni con nombres de CLUEDO.
    respuestas: { ladron: 'h2', pieza: 'p1' },
    motive: 'Casilda creía que la miniatura le correspondía por testamento.',
    howItHappened: 'La sacó de la vitrina mientras los demás discutían en el fumadero.',
  },
  characters: HEREDEROS.map((name, i) => ({
    participanteId: `h${i}`,
    characterName: `${name} Ardavín`,
    role: 'Heredero',
    publicPersona: `${name} llegó con prisa y sin abrigo.`,
    secret: `Lo que ${name} no cuenta.`,
    motive: 'Cree merecer más de lo que le tocó.',
    alibi: 'Estuvo en el fumadero, dice.',
    knowledge: [`${name} vio algo raro en la galería.`],
    personalHook: 'Interprétalo con paciencia y mala uva.',
  })),
  /*
   * La cronología, escrita para poder probar la guardia del dosier.
   *
   * Los cuatro momentos son los cuatro casos que se dan: el público sin nadie,
   * el secreto de dos inocentes, el secreto del ladrón a solas y —el que
   * importa— el secreto en el que están un inocente y el ladrón, redactado
   * desde fuera como los escribe un modelo. Ese último es el que jamás puede
   * llegarle al inocente.
   */
  timeline: [
    { time: '21:30', description: 'Se sirve la cena.', participanteIds: [], isPublic: true },
    { time: '21:50', description: 'Amelia y Bernardo discuten en la escalinata.', participanteIds: ['h0', 'h1'], isPublic: false },
    { time: '22:05', description: 'Casilda se acerca a la vitrina mientras Amelia mira.', participanteIds: ['h0', 'h2'], isPublic: false },
    { time: '22:10', description: 'Alguien apaga la luz de la galería.', participanteIds: ['h2'], isPublic: false },
  ],
  mecanicas: { pistas: [
    { id: 'c1', lugarId: 'e0', description: 'La vitrina está sin cerrar.', pointsTo: 'Alguien la abrió sin forzarla.', round: 1 },
    { id: 'c2', lugarId: 'e1', description: 'Una copa con carmín.', pointsTo: 'Alguien estuvo aquí y no lo ha dicho.', round: 1 },
    { id: 'c3', lugarId: 'e2', description: 'Un pañuelo en el escalón.', pointsTo: 'Se subió con prisa.', round: 2 },
  ] },
  gmScript: ['Abre la velada.', 'Cierra la velada.'],
};
game.plot = plot;

const sesion: LiveSession = {
  id: game.id,
  juego: 'el-legado',
  code: 'LEGADO',
  phase: 'lobby',
  round: 0,
  totalRounds: 2,
  players: HEREDEROS.map((name, i) => ({
    participanteId: `h${i}`,
    displayName: name,
    joinCode: `LEG00${i}`,
    joined: true,
    elecciones: [],
    notas: '',
    girosRecibidos: [],
  })),
  respuestasEntregadas: [],
  porDondePasaron: [],
  rev: 1,
  updatedAt: ahora,
};

// ---------------------------------------------------------------------------
// La velada
// ---------------------------------------------------------------------------

const manifiesto = manifiestoDe(sesion.juego);
comprobar('el juego queda registrado', manifiesto.id === 'el-legado', manifiesto.id);
comprobar('con dos ejes, no tres', ejesDe(manifiesto).length === 2);

const vistaDe = (id: string) => vistaDeJugador(game, sesion, id)!;

let v = vistaDe('h0');
comprobar('se compone la vista de un jugador', Boolean(v));
comprobar('con el título del juego nuevo', v.sesion.tituloPartida === 'El Legado');
comprobar(
  'la acusación pregunta DOS cosas',
  v.ejes.length === 2 && v.ejes.map((e) => e.ejeId).join(',') === 'ladron,pieza',
  v.ejes.map((e) => e.ejeId),
);
comprobar(
  'y pregunta con las palabras del juego',
  v.ejes[0]?.pregunta === '¿Quién se la llevó?' && v.ejes[1]?.pregunta === '¿Qué falta?',
);
comprobar(
  'las opciones de «quién» son los herederos, con su nombre de personaje',
  v.ejes[0]?.opciones.length === 4 && v.ejes[0].opciones[0]?.nombre.includes('Ardavín'),
  v.ejes[0]?.opciones,
);
comprobar(
  'las opciones de «qué» son las piezas',
  v.ejes[1]?.opciones.length === 3 && v.ejes[1].opciones[1]?.nombre === 'La miniatura',
  v.ejes[1]?.opciones,
);
comprobar('en la sala de espera no hay solución', v.desenlace === undefined);

// Quien se llevó la pieza lo sabe, y nadie más.
comprobar('la culpable sabe que lo es', vistaDe('h2').yo.soyElSenalado === true);
comprobar('los demás no', vistaDe('h0').yo.soyElSenalado === false);

// --- Ronda 1 ---
abrirRonda(sesion, 10);
elegirSala(sesion, 'h0', 'e0');
elegirSala(sesion, 'h1', 'e1');
v = vistaDe('h0');
comprobar('la ronda abre', v.sesion.phase === 'ronda-abierta');
comprobar('entro en una estancia', v.miLugar === 'e0');
comprobar('y veo lo que hay allí', pistasDe(v).misPistas.length === 1, pistasDe(v).misPistas);
comprobar('sin que me digan qué significa', pistasDe(v).misPistas[0]?.pointsTo === undefined);
comprobar(
  'no veo lo de la estancia ajena',
  !pistasDe(v).misPistas.some((p) => p.description.includes('carmín')),
);

cerrarRonda(sesion);
v = vistaDe('h0');
comprobar('al cerrar sigo teniendo solo lo mío', pistasDe(v).misHallazgos.length === 1, pistasDe(v).misHallazgos.length);
comprobar('y ya con su significado', pistasDe(v).misHallazgos.every((p) => typeof p.pointsTo === 'string'));
/*
 * Y LA DE LA ESTANCIA AJENA SIGUE SIN LLEGAR. Aquí decía que al cerrar «lo
 * hallado es público» y esperaba las DOS pistas, la mía y la de la estancia en
 * la que estuvo el otro. Esa regla se retiró: lo que se encuentra es de quien lo
 * encuentra, en este juego y en CLUEDO.
 */
comprobar(
  'lo de la estancia ajena tampoco llega con la ronda cerrada',
  !pistasDe(v).misHallazgos.some((p) => p.description.includes('carmín')),
);

/*
 * ---- LA CRONOLOGÍA DE TU PERSONAJE, y lo que NO entra en ella ----
 *
 * El dosier enseña qué hacía tu personaje esa noche. Sale de la cronología de
 * la trama recortada a los momentos donde figuras, y hasta ahí es información
 * que tu personaje vivió. El peligro está en los momentos SECRETOS donde
 * estabais el señalado y tú: esa frase la escribe un modelo, muchas veces desde
 * fuera —«Casilda se acerca a la vitrina»— y sirve el nombre del culpable en la
 * primera pantalla que abre alguien.
 *
 * Se prueba aquí, sobre un juego cuyo eje de personas se llama `ladron` y no
 * `culpable`, porque la guardia resuelve el eje desde el manifiesto: si algún
 * día se cableara a CLUEDO, los otros juegos se quedarían sin ella y CLUEDO
 * seguiría en verde.
 */
const cronoDe = (id: string): string[] =>
  vistaDe(id).yo.cronologiaPropia.map((m) => m.description);

const ladron = plot.solution.respuestas.ladron!;
comprobar('el eje de personas de este juego es el ladrón', ladron === 'h2', ladron);

const deAmelia = cronoDe('h0');
comprobar('a un inocente le llega su momento con otro inocente', deAmelia.some((t) => t.includes('discuten en la escalinata')));
comprobar(
  'pero NO el secreto en el que estaba el ladrón, aunque él figure en él',
  !deAmelia.some((t) => t.includes('se acerca a la vitrina')),
  deAmelia,
);
comprobar('y tampoco el del ladrón a solas', !deAmelia.some((t) => t.includes('apaga la luz')));

const delLadron = cronoDe('h2');
comprobar('al ladrón le llegan los suyos, que ya se los sabe', delLadron.some((t) => t.includes('se acerca a la vitrina')));
comprobar('incluido el que hizo a solas', delLadron.some((t) => t.includes('apaga la luz')));
comprobar(
  'a quien no figura en un momento no le llega ese momento',
  cronoDe('h3').length === 0,
  cronoDe('h3'),
);

// --- Acusaciones ---
sesion.phase = 'acusaciones';

let rechazada = false;
try {
  // Falta un eje: no vale.
  responder(sesion, 'h0', { ladron: 'h2' }, plot.solution.respuestas);
} catch {
  rechazada = true;
}
comprobar('una acusación a medias se rechaza', rechazada);

responder(sesion, 'h0', { ladron: 'h1', pieza: 'p1' }, plot.solution.respuestas);
responder(sesion, 'h1', { ladron: 'h2', pieza: 'p1' }, plot.solution.respuestas);
comprobar('la equivocada no gana', sesion.primeroEnAcertar === 'h1', sesion.primeroEnAcertar);
comprobar(
  'la acertada se marca correcta',
  sesion.respuestasEntregadas.find((a) => a.participanteId === 'h1')?.correcta === true,
);
comprobar(
  'y la fallida, no',
  sesion.respuestasEntregadas.find((a) => a.participanteId === 'h0')?.correcta === false,
);

// La culpable acierta —se sabe la respuesta— pero no puede ganar.
responder(sesion, 'h2', { ladron: 'h2', pieza: 'p1' }, plot.solution.respuestas);
comprobar('quien se la llevó no gana acusándose', sesion.primeroEnAcertar === 'h1');

// --- Desenlace ---
sesion.phase = 'desenlace';
v = vistaDe('h0');
comprobar('llega el desenlace', Boolean(v.desenlace));
comprobar(
  'con DOS renglones, uno por eje',
  v.desenlace?.respuestas.length === 2,
  v.desenlace?.respuestas,
);
comprobar(
  'resueltos a nombres del juego nuevo',
  v.desenlace?.respuestas[0]?.nombre === 'Casilda' &&
    v.desenlace?.respuestas[1]?.nombre === 'La miniatura',
  v.desenlace?.respuestas,
);
comprobar('y con sus rótulos', v.desenlace?.respuestas.map((r) => r.rotulo).join('/') === 'Quién/Qué');
comprobar('se sabe quién fue', v.desenlace?.senaladoId === 'h2');
comprobar('gana quien acertó', v.desenlace?.ganador?.participanteId === 'h1');
comprobar(
  'los aciertos se cuentan sobre DOS ejes',
  v.desenlace?.clasificacion.find((c) => c.participanteId === 'h1')?.aciertos === 2 &&
    v.desenlace?.clasificacion.find((c) => c.participanteId === 'h0')?.aciertos === 1,
  v.desenlace?.clasificacion,
);

// --- El puesto de mando ---
const gm = vistaDeGameMaster(game, sesion);
comprobar('la vista de quien dirige se compone', Boolean(gm.sesion));
comprobar('con las tres acusaciones', gm.respuestasRecibidas === 3);

// --- Coherencia y reparación ---
comprobar(
  'la solución se ve coherente',
  computeStaleness(game).brokenSolution.length === 0,
  computeStaleness(game).brokenSolution,
);

// Si desaparece la pieza robada, se detecta y se repara sobre la categoría
// correcta: no hay ningún «coge la primera arma» escondido.
game.entidades!.piezas = game.entidades!.piezas.filter((p) => p.id !== 'p1');
comprobar(
  'y si la pieza desaparece, se detecta ese eje',
  computeStaleness(game).brokenSolution.join() === 'pieza',
  computeStaleness(game).brokenSolution,
);
const reparados = repararRespuestas(plot, game);
comprobar('se repara solo ese eje', reparados.join() === 'pieza', reparados);
comprobar(
  'con otra pieza, no con un heredero',
  ['p0', 'p2'].includes(plot.solution.respuestas.pieza ?? ''),
  plot.solution.respuestas,
);

// ---------------------------------------------------------------------------

console.log(`\nEl Legado · un juego de dos ejes sobre el motor de CLUEDO`);
console.log(`${hechas} comprobaciones`);
if (fallos.length === 0) {
  console.log('\nEl motor sostiene un segundo juego sin tocar una línea suya.');
  process.exit(0);
}
console.log(`\n${fallos.length} FALLOS:\n`);
for (const f of fallos) console.log(`  ✗ ${f}`);
process.exit(1);
