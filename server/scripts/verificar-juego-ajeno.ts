/**
 * Un juego que NO SE PARECE EN NADA a un misterio.
 *
 *   npm run verify:ajeno
 *
 * ═══ QUÉ PRUEBA Y POR QUÉ NO BASTA CON LOS QUE HAY ═══
 *
 * La plataforma tiene tres juegos y los tres son la misma forma: gente con un
 * papel y un secreto, lugares por los que moverse, cosas que señalar y una noche
 * que termina cuando se descubre algo. Que los tres funcionen no demuestra que la
 * plataforma sea general: demuestra que aguanta tres variaciones de lo mismo.
 * `verificar-juego-sin-ejes.ts` ya dio un paso —La Oca no tiene nada que
 * adivinar— pero sigue teniendo casillas, o sea lugares, y un tablero.
 *
 * «La Almoneda» está escrita para romper todo lo que queda:
 *
 *   · SIN EJES. No hay nada que acertar y por tanto no hay acusación ni sobre.
 *   · SIN LUGARES. Ninguna categoría es `sonLugares`, así que no hay mapa, ni
 *     plano, ni chinchetas, ni salas donde entrar. La mecánica entera ocurre
 *     sobre una mesa.
 *   · SIN PISTAS. `plot.clues` va vacío: aquí no se encuentra nada, se puja.
 *   · SIN PERSONAJE QUE INTERPRETAR. Nadie tiene secreto, ni coartada, ni
 *     motivo. El dosier declara CERO bloques.
 *   · SIN VÍCTIMA. No ha muerto nadie.
 *   · SIN NARRACIÓN. No hay trama que generar: los lotes y sus valores son todo
 *     el contenido, y los decide quien organiza.
 *   · CON UNA CATEGORÍA SIN `almacen`, que vive en `game.entidades`.
 *   · Y CON DINERO, que es un número: la única acción interesante —pujar— pide
 *     una CANTIDAD, y eso el contrato de acciones no sabe expresarlo.
 *
 * ═══ CÓMO SE LEE ESTE FICHERO ═══
 *
 * Cada vez que ha habido que FINGIR algo para que la plataforma lo aceptara, hay
 * un comentario que empieza por «PEAJE:». Esos comentarios son el inventario de
 * lo que todavía obliga a un juego nuevo a disfrazarse de CLUEDO, y son el
 * verdadero resultado de esta comprobación: mientras quede uno, el patrón limita.
 */
import { manifiestoDe, registrarJuego } from '../../shared/juegos';
import {
  accionesDisponibles,
  ejecutarAccion,
  registrarAcciones,
} from '../src/juegos/motor';
import { registrarProyeccion } from '../src/juegos/proyecciones';
import { vistaDeJugador } from '../src/live/proyeccion';
import { abrirRonda, cerrarRonda } from '../src/live/sesion';
import { ejes as ejesDe } from '../../shared/juegos';
import type { ManifiestoDeJuego } from '../../shared/juegos';
import type { GameSession, Plot } from '../../shared/types';
import type { LiveSession } from '../../shared/live';

let hechas = 0;
const fallos: string[] = [];
const peajes: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(`${que}${detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 250)}`}`);
}
function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}
/** Anota algo que este juego ha tenido que fingir para que lo acepten. */
function peaje(que: string): void {
  peajes.push(que);
}

// ---------------------------------------------------------------------------
// El juego
// ---------------------------------------------------------------------------

const LOTES = [
  'Un reloj de sobremesa parado a las cuatro',
  'Tres cartas sin abrir',
  'Un espejo con el azogue picado',
  'Una caja de música que no suena',
  'El retrato de alguien que nadie reconoce',
];

const LA_ALMONEDA: ManifiestoDeJuego = {
  id: 'la-almoneda',
  nombre: 'La Almoneda',
  lema: 'Todo lo que queda de una casa, y una tarde para repartirlo.',

  categorias: [
    {
      id: 'postores',
      singular: 'postor',
      plural: 'postores',
      minimo: 3,
      sonJugadores: true,
      /*
       * PEAJE: la categoría de personas TIENE que ir a `suspects`.
       *
       * Se llaman postores y no sospechosos, pero media plataforma cuelga de ese
       * campo con ese nombre: el emparejamiento de los móviles, los dosieres y
       * los correos leen `game.suspects` a pelo. Sin esto no se puede jugar, y no
       * porque el motor lo exija —`entidadesDe` mira primero `game.entidades`—
       * sino porque nadie más se ha girado.
       */
      almacen: 'suspects',
      presentacion: {
        titulo: 'Los postores',
        descripcion: 'Quienes se sientan a repartirse la casa.',
        forma: 'circle',
        ejemploNombre: 'Marta',
        ejemploDescripcion: 'Viene con la lista hecha y no piensa enseñarla.',
      },
    },
    {
      /*
       * Sin `almacen`: vive en `game.entidades.lotes`. Es la prueba de que una
       * categoría que no encaja en ninguno de los tres campos heredados funciona.
       */
      id: 'lotes',
      singular: 'lote',
      plural: 'lotes',
      minimo: 4,
      presentacion: {
        titulo: 'Los lotes',
        descripcion: 'Lo que queda en la casa y sale a subasta.',
        forma: 'square',
        ejemploNombre: 'Un reloj de sobremesa',
        ejemploDescripcion: 'Parado a las cuatro. Nadie recuerda por qué.',
      },
    },
  ],

  // Sin `ejes`: aquí no se adivina nada. Ausente, no vacío.

  turnos: 'por-turnos',

  acciones: [
    {
      id: 'pujar',
      rotulo: 'Pujar',
      fases: ['ronda-abierta'],
      /*
       * PEAJE: una puja es un NÚMERO y no cabe.
       *
       * `eligeDe` solo sabe pedir «una entidad de esta categoría». No hay forma
       * de declarar una cantidad, ni un texto libre, ni un booleano. Así que la
       * cantidad se manda por fuera del contrato: el reductor la lee de `datos`
       * aunque el motor no la haya declarado ni validado, y la app genérica no
       * puede pintar el campo. Un juego con dinero, con dados o con puntos de
       * vida se queda hoy sin pantalla genérica.
       */
      eligeDe: [{ campo: 'lote', categoria: 'lotes', rotulo: '¿Por cuál pujas?' }],
      vecesPorTurno: 1,
    },
    { id: 'pasar', rotulo: 'Pasar', fases: ['ronda-abierta'], vecesPorTurno: 1 },
  ],

  /*
   * TRES pestañas. Sin mapa —no hay lugares—, sin tablón, sin cuaderno y SIN
   * dosier: aquí nadie interpreta a nadie.
   */
  barra: [
    { pantalla: 'ronda', rotulo: 'La subasta', icono: 'reloj' },
    { pantalla: 'perfil', rotulo: 'Perfil', icono: 'copa' },
  ],

  /* Un juego sin personajes no tiene dosier, y la lista vacía lo dice. */
  dosier: [],

  asistente: {
    nombre: 'El Subastador',
    descripcion: 'Canta los lotes y lleva la cuenta',
    icono: 'farol',
    voz: 'Eres el subastador de una almoneda. Hablas en espanol, breve y seco.',
    saludo: 'Se abre la sala. Pregunte por los lotes, no por lo que valen.',
    seNiega: 'yo canto los lotes, no tasa nadie por mi',
    sinIa: {
      reglas: 'Por turnos: se puja o se pasa. Quien mas ofrece se lleva el lote.',
      personaje: 'Aqui no hay papeles que interpretar: hay bolsillo.',
      solucion: 'No hay solucion que dar: hay una cuenta al final.',
      general: 'Mire lo que queda por salir antes de gastarse el fondo.',
    },
  },

  /*
   * Sin `ronda`. Era obligatorio y una subasta no tenía qué poner: sus dos campos
   * son de CLUEDO —«sobre qué categoría actúas» y «cuántas veces puedes
   * cambiarte»— y aquí no significan nada. Ya es opcional.
   */

  /*
   * SOLO LAS FASES POR LAS QUE PASA. La tabla era un `Record` exhaustivo y había
   * que nombrar las siete que existen, incluidas `sellado` --de El Misterio de la
   * Momia-- y `acusaciones` --de un juego donde se acusa--, aunque fuera para
   * ponerlas a `[]`. Una almoneda tenía que declarar que no pasa por el sellado
   * de una tumba. Ahora es parcial y solo se nombran las tres que se usan.
   *
   * QUEDA EL OTRO MEDIO PEAJE: los NOMBRES siguen siendo los de CLUEDO. Aquí
   * `ronda-abierta` es «se canta un lote», `ronda-cerrada` es «adjudicado» y
   * `desenlace` es «la cuenta». Traducido, no dicho.
   */
  fases: {
    lobby: ['ronda-abierta'],
    'ronda-abierta': ['ronda-cerrada'],
    'ronda-cerrada': ['ronda-abierta', 'desenlace'],
  },

  reglas: [
    { titulo: 'La sala', texto: 'Se sale a subasta lote por lote, en el orden en que los canta el subastador.' },
    { titulo: 'El turno', texto: 'Por turnos: cuando te toca, pujas por un lote o pasas.' },
    { titulo: 'El fondo', texto: 'Empiezas con cien y no hay más. Lo que gastas no vuelve.' },
    { titulo: 'La adjudicación', texto: 'Al cerrar la puja, el lote es de quien más ofreció. Si nadie pujó, se retira.' },
    { titulo: 'La cuenta', texto: 'Gana quien se lleve más valor a casa, no quien más gaste.' },
  ],

  /* Sin trofeos, sin secciones de dosier impreso y sin imprimibles propios. */
  trofeos: [],
  seccionesDeDosier: [],
  documentos: [],
};

registrarJuego(LA_ALMONEDA);

// ---------------------------------------------------------------------------
// Lo que hacen sus acciones. El motor no sabe qué es una puja.
// ---------------------------------------------------------------------------

const FONDO_INICIAL = 100;

interface EstadoAlmoneda {
  /** Lo que le queda a cada cual. */
  fondo: Record<string, number>;
  /** La puja más alta de este lote, si la hay. */
  pujas: Record<string, { de: string; cuanto: number }>;
  /** Quién se llevó cada lote ya adjudicado. */
  adjudicado: Record<string, string>;
}

function estadoDe(sesion: LiveSession): EstadoAlmoneda {
  const guardado = (sesion.estado?.almoneda ?? null) as EstadoAlmoneda | null;
  if (guardado) return guardado;
  const nuevo: EstadoAlmoneda = { fondo: {}, pujas: {}, adjudicado: {} };
  for (const p of sesion.players) nuevo.fondo[p.suspectId] = FONDO_INICIAL;
  sesion.estado = { ...(sesion.estado ?? {}), almoneda: nuevo };
  return nuevo;
}

registrarAcciones('la-almoneda', {
  pujar: ({ sesion, suspectId, datos }) => {
    const estado = estadoDe(sesion);
    const lote = datos.lote ?? '';
    /*
     * PEAJE: la cantidad llega por `datos` sin estar declarada.
     *
     * El motor construye `datos` SOLO con los campos de `eligeDe`, así que un
     * `cuanto` que venga del móvil se descarta en silencio. Aquí se calcula para
     * poder seguir jugando, y eso es exactamente lo que no debería tener que
     * hacer un juego: inventarse el dato que no le dejan pedir.
     */
    const anterior = estado.pujas[lote]?.cuanto ?? 0;
    const cuanto = Math.min(estado.fondo[suspectId] ?? 0, anterior + 10);
    if (cuanto <= anterior) return { pujado: false };
    estado.pujas[lote] = { de: suspectId, cuanto };
    sesion.estado = { ...(sesion.estado ?? {}), almoneda: estado };
    return { pujado: true, cuanto };
  },
  pasar: ({ sesion }) => {
    estadoDe(sesion);
    return { pasado: true };
  },
});

/** Al cerrar la puja se adjudica y se cobra. Lo hace el juego, no la plataforma. */
function adjudicar(sesion: LiveSession): void {
  const estado = estadoDe(sesion);
  for (const [lote, puja] of Object.entries(estado.pujas)) {
    if (estado.adjudicado[lote]) continue;
    estado.adjudicado[lote] = puja.de;
    estado.fondo[puja.de] = (estado.fondo[puja.de] ?? 0) - puja.cuanto;
  }
  estado.pujas = {};
  sesion.estado = { ...(sesion.estado ?? {}), almoneda: estado };
}

registrarProyeccion('la-almoneda', (_game, sesion, suspectId) => {
  const estado = estadoDe(sesion);
  return {
    fondo: estado.fondo[suspectId] ?? 0,
    /* Lo que se ha llevado cada cual es público: se canta en voz alta. */
    adjudicado: estado.adjudicado,
    /* Y la puja más alta de cada lote, sin decir de quién. */
    pujas: Object.fromEntries(Object.entries(estado.pujas).map(([l, p]) => [l, p.cuanto])),
  };
});

// ---------------------------------------------------------------------------
// Una partida
// ---------------------------------------------------------------------------

const ahora = '2026-05-01T17:00:00.000Z';
const POSTORES = ['Marta', 'Nico', 'Olga'];

const game: GameSession = {
  id: 'almoneda',
  name: 'La almoneda de la casa de la calle Mayor',
  status: 'ready',
  createdAt: ahora,
  updatedAt: ahora,
  suspects: POSTORES.map((name, i) => ({ id: `p${i}`, name })),
  rooms: [],
  weapons: [],
  entidades: { lotes: LOTES.map((name, i) => ({ id: `l${i}`, name })) },
  boardMode: 'generated',
  settings: { language: 'es', juego: 'la-almoneda' },
};

/*
 * PEAJE: hay que inventarse una trama para un juego que no tiene ninguna.
 *
 * `vistaDeJugador` empieza con `if (!plot) return null`, así que sin `plot` no hay
 * partida. Y `Plot` exige `victim`, `synopsis`, `setting` y `solution`, que en una
 * subasta no significan nada: no ha muerto nadie y no hay respuesta. Se rellenan
 * con guiones y cadenas vacías. Peor: `characters` exige un `secret`, un `motive`,
 * una `alibi` y un `personalHook` por persona, y aquí nadie interpreta a nadie.
 */
const plot: Plot = {
  title: 'La Almoneda',
  tagline: 'Todo lo que queda de una casa, y una tarde para repartirlo.',
  synopsis: 'Se vacía la casa de la calle Mayor. Lo que no se reparta hoy, se tira.',
  victim: { name: '—', description: '' },
  setting: 'El salón, con los muebles ya apartados contra la pared.',
  solution: { respuestas: {}, motive: '', howItHappened: '' },
  characters: POSTORES.map((name, i) => ({
    suspectId: `p${i}`,
    characterName: name,
    role: 'Postor',
    publicPersona: '',
    secret: '',
    motive: '',
    alibi: '',
    knowledge: [],
    personalHook: '',
  })),
  timeline: [],
  clues: [],
  gmScript: [],
};
game.plot = plot;

const sesion: LiveSession = {
  id: game.id,
  juego: 'la-almoneda',
  code: 'ALMON',
  phase: 'lobby',
  round: 0,
  totalRounds: 5,
  players: POSTORES.map((name, i) => ({
    suspectId: `p${i}`,
    displayName: name,
    joinCode: `A${i}`,
    joined: true,
    elecciones: [],
    notas: '',
    girosRecibidos: [],
  })),
  acusaciones: [],
  tablon: [],
  rev: 1,
  updatedAt: ahora,
};

// ---------------------------------------------------------------------------

console.log('\nLa Almoneda · un juego sin ejes, sin lugares, sin pistas y sin personajes');

paso('El manifiesto se acepta tal cual');
const m = manifiestoDe('la-almoneda');
comprobar('el juego queda instalado con su id', m.id === 'la-almoneda', m.id);
comprobar('sin ejes: no hay nada que adivinar', ejesDe(m).length === 0);
comprobar('sin lugares: ninguna categoría los declara', !m.categorias.some((c) => c.sonLugares));
comprobar('sin dosier: nadie interpreta a nadie', m.dosier.length === 0);
comprobar(
  'una categoría vive fuera de los tres campos heredados',
  m.categorias.some((c) => !c.almacen),
);

paso('Se juega una subasta entera');
abrirRonda(sesion, 10);
comprobar('la sala se abre', sesion.phase === 'ronda-abierta');

sesion.turnoDe = 'p0';
const disponibles = accionesDisponibles(sesion, 'p0').map((a) => a.id);
comprobar('a quien le toca se le ofrecen sus dos acciones', disponibles.join() === 'pujar,pasar', disponibles);
comprobar(
  'y a quien no le toca, ninguna',
  accionesDisponibles(sesion, 'p1').length === 0,
  accionesDisponibles(sesion, 'p1'),
);

ejecutarAccion(game, sesion, 'p0', 'pujar', { lote: 'l0' });
sesion.turnoDe = 'p1';
ejecutarAccion(game, sesion, 'p1', 'pujar', { lote: 'l0' });
const trasPujar = (sesion.estado?.almoneda ?? {}) as EstadoAlmoneda;
comprobar('la segunda puja sube sobre la primera', trasPujar.pujas.l0?.cuanto === 20, trasPujar.pujas);
comprobar('y es de quien pujó último', trasPujar.pujas.l0?.de === 'p1');

cerrarRonda(sesion);
adjudicar(sesion);
const trasCerrar = (sesion.estado?.almoneda ?? {}) as EstadoAlmoneda;
comprobar('al cerrar se adjudica el lote', trasCerrar.adjudicado.l0 === 'p1');
comprobar('y se le cobra del fondo', trasCerrar.fondo.p1 === FONDO_INICIAL - 20, trasCerrar.fondo);
comprobar('a quien no se lo llevó no se le cobra', trasCerrar.fondo.p0 === FONDO_INICIAL);

paso('Lo que llega al móvil es de este juego, no de un misterio');
const v = vistaDeJugador(game, sesion, 'p1')!;
comprobar('se compone la vista', v !== null);
comprobar('sin salas', v.salas.length === 0, v.salas.length);
comprobar('sin pistas encontradas', v.misHallazgos.length === 0);
comprobar('sin hechos establecidos', v.hechos.length === 0);
comprobar('sin ejes que acusar', v.ejes.length === 0, v.ejes);
comprobar('sin cronología pública', v.cronologia.length === 0);
comprobar('nadie es el señalado, porque no hay a quién señalar', v.yo.soyCulpable === false);
comprobar(
  'y sí llega el estado propio del juego',
  (v.estadoDelJuego as { fondo?: number } | undefined)?.fondo === FONDO_INICIAL - 20,
  v.estadoDelJuego,
);
comprobar(
  'las reglas que se leen son las suyas',
  v.caso.reglas[0]?.startsWith('La sala.') === true,
  v.caso.reglas[0],
);

/*
 * PEAJE, y este se ve en la propia vista: hay que mandar una víctima que no
 * existe. La app pintará «La víctima · —» si alguien declara el bloque del caso.
 */
comprobar('la víctima va vacía porque no hay ninguna', v.caso.victima.nombre === '—');
peaje('`Plot` exige victim, synopsis, setting y solution: un juego sin crimen se los inventa');
peaje('`PlotCharacter` exige secret, motive, alibi y personalHook por persona, aunque nadie interprete a nadie');
peaje('los NOMBRES de las fases siguen siendo los de CLUEDO: una subasta llama «ronda-abierta» a «se canta un lote»');
peaje('la categoría de personas tiene que ir a `suspects` o no hay emparejamiento, dosieres ni correos');
peaje('una acción no puede pedir un número: `eligeDe` solo sabe pedir una entidad de una categoría');
peaje('`VistaJugador` obliga a mandar salas, objetos, pistas y cronología vacías aunque el juego no tenga nada de eso');

// ---------------------------------------------------------------------------

console.log('');
if (fallos.length > 0) {
  console.log(`${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
  for (const f of fallos) console.log(`  ✗ ${f}`);
  process.exit(1);
}

console.log(`${hechas} comprobaciones`);
console.log('\nLa plataforma sostiene un juego que no comparte NADA con un misterio.');
console.log(`\nPero cobra ${peajes.length} peajes por dejarlo entrar:\n`);
for (const p of peajes) console.log(`  · ${p}`);
console.log(
  '\nMientras quede uno, un juego nuevo tiene que disfrazarse de CLUEDO para ser admitido.',
);
