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
import { manifiestoDe, papelDe, personasDe, registrarJuego } from '../../shared/juegos';
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
import { leerBloqueDePistas } from '../../shared/mecanicas/pistas';

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
       * ═══ Y AQUI YA NO HAY `almacenHeredado: 'suspects'` ═══
       *
       * Lo habia, y con una nota que decia: «se llaman postores y no
       * sospechosos, pero media plataforma cuelga de ese campo con ese nombre —
       * el emparejamiento de los moviles, los dosieres y los correos leen
       * `personasDe(game)` a pelo—. Sin esto no se puede jugar, y no porque el
       * motor lo exija sino porque nadie mas se ha girado.»
       *
       * Ya se han girado. El nucleo pregunta `personasDe(game)`, que resuelve
       * por el manifiesto cual es la categoria de personas y devuelve SUS
       * entidades, vivan donde vivan. Los postores de esta subasta viven en
       * `game.entidades.postores` y `personasDe(game)` esta vacio.
       */
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
      fases: ['lote-cantado'],
      eligeDe: [{ campo: 'lote', categoria: 'lotes', rotulo: '¿Por cuál pujas?' }],
      /*
       * LA PUJA ES UN NÚMERO, y ahora se puede pedir.
       *
       * Antes no cabía: las cuatro formas de pedir datos sabían pedir entidades y
       * cadenas, así que la cantidad había que calcularla dentro del reductor
       * —«sube diez sobre la anterior»— porque no había forma de preguntarla. Y
       * en el móvil la acción salía como un botón SIN CAMPOS.
       *
       * El motor comprueba que sea un número de verdad y que quepa entre el
       * mínimo y el máximo. Puede hacerlo porque un número no depende de ningún
       * estado secreto: es aritmética, no reglas.
       */
      pideNumero: [
        { campo: 'cuanto', rotulo: '¿Cuánto ofreces?', minimo: 1, maximo: 100, entero: true },
      ],
      vecesPorTurno: 1,
    },
    { id: 'pasar', rotulo: 'Pasar', fases: ['lote-cantado'], vecesPorTurno: 1 },
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
  /*
   * ═══ SUS PROPIOS NOMBRES DE FASE ═══
   *
   * Aqui ponia `lobby`, `ronda-abierta`, `ronda-cerrada` y `desenlace`, que son
   * los de CLUEDO, porque `LivePhase` era una union cerrada de siete y no habia
   * otros. Una almoneda llamaba «ronda-abierta» a que se canta un lote.
   *
   * Ahora los nombres son suyos. La plataforma no reconoce ninguno: pregunta el
   * PAPEL, que se declara justo debajo. Esta es la prueba de que el peaje se
   * fue de verdad y no solo de la lista.
   */
  fases: {
    'sala-vacia': ['lote-cantado'],
    'lote-cantado': ['lote-adjudicado'],
    'lote-adjudicado': ['lote-cantado', 'almoneda-cerrada'],
  },

  papelDeFase: {
    'sala-vacia': 'espera',
    'lote-cantado': 'turno',
    'lote-adjudicado': 'entreacto',
    'almoneda-cerrada': 'fin',
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
  for (const p of sesion.players) nuevo.fondo[p.participanteId] = FONDO_INICIAL;
  sesion.estado = { ...(sesion.estado ?? {}), almoneda: nuevo };
  return nuevo;
}

registrarAcciones('la-almoneda', {
  pujar: ({ sesion, participanteId, datos, numeros }) => {
    const estado = estadoDe(sesion);
    const lote = datos.lote ?? '';
    /*
     * La cantidad llega YA VALIDADA por el motor: es un número entero entre 1 y
     * 100, porque así lo declara la acción. Lo que el motor no puede saber son
     * las REGLAS —que hay que superar la puja anterior y que no se puede ofrecer
     * más de lo que queda en el fondo— y eso lo comprueba el juego, que es quien
     * las conoce.
     */
    const cuanto = numeros.cuanto ?? 0;
    const anterior = estado.pujas[lote]?.cuanto ?? 0;
    if (cuanto <= anterior) return { pujado: false, porque: 'hay que superar la puja anterior' };
    if (cuanto > (estado.fondo[participanteId] ?? 0)) return { pujado: false, porque: 'no te llega el fondo' };
    estado.pujas[lote] = { de: participanteId, cuanto };
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

registrarProyeccion('la-almoneda', (_game, sesion, participanteId) => {
  const estado = estadoDe(sesion);
  return {
    fondo: estado.fondo[participanteId] ?? 0,
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
  entidades: {
    postores: POSTORES.map((name, i) => ({ id: `p${i}`, name })),
    lotes: LOTES.map((name, i) => ({ id: `l${i}`, name })),
  },
  boardMode: 'generated',
  settings: { language: 'es', juego: 'la-almoneda' },
};

/*
 * PEAJE: hay que inventarse una trama para un juego que no tiene ninguna.
 *
 * `vistaDeJugador` empieza con `if (!plot) return null`, así que sin `plot` no hay
 * partida. Y `Plot` exige `synopsis`, `setting` y `solution`, que en una subasta
 * no significan gran cosa. Peor: `characters` exige un `secret`, un `motive`, una
 * `alibi` y un `personalHook` por persona, y aquí nadie interpreta a nadie.
 *
 * UNO MENOS: `victim` ya no está. Era el peaje más visible que había —esta misma
 * subasta ponía `{ name: '—', description: '' }` porque el contrato se lo exigía,
 * y la app pintaba «La víctima · —» en el dosier de todo el mundo— y ahora
 * simplemente no se declara. Ausente significa ausente.
 */
const plot: Plot = {
  title: 'La Almoneda',
  tagline: 'Todo lo que queda de una casa, y una tarde para repartirlo.',
  synopsis: 'Se vacía la casa de la calle Mayor. Lo que no se reparta hoy, se tira.',
  setting: 'El salón, con los muebles ya apartados contra la pared.',
  /*
   * SIN MOTIVO NI RELATO. `PlotSolution` los exigia —«por que lo hizo» y «como
   * lo hizo»— y aqui no lo ha hecho nadie. `respuestas` se queda vacio porque
   * este juego no tiene ejes: no hay nada que adivinar.
   */
  solution: { respuestas: {} },
  characters: POSTORES.map((name, i) => ({
    participanteId: `p${i}`,
    characterName: name,
    role: 'Postor',
    publicPersona: '',
    /*
     * NI SECRETO, NI MOTIVO, NI COARTADA, NI GANCHO. Aqui iban cuatro cadenas
     * vacias por postor porque el contrato las exigia, y en una subasta nadie
     * interpreta a nadie. Ya no hacen falta.
     */
    knowledge: [],
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
  phase: 'sala-vacia',
  round: 0,
  totalRounds: 5,
  players: POSTORES.map((name, i) => ({
    participanteId: `p${i}`,
    displayName: name,
    joinCode: `A${i}`,
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

console.log('\nLa Almoneda · un juego sin ejes, sin lugares, sin pistas y sin personajes');

paso('El manifiesto se acepta tal cual');
const m = manifiestoDe('la-almoneda');
comprobar('el juego queda instalado con su id', m.id === 'la-almoneda', m.id);
comprobar('sin ejes: no hay nada que adivinar', ejesDe(m).length === 0);
comprobar('sin lugares: ninguna categoría los declara', !m.categorias.some((c) => c.sonLugares));
comprobar('sin dosier: nadie interpreta a nadie', m.dosier.length === 0);
/*
 * Aqui se comprobaba que alguna categoria vivia «fuera de los tres campos
 * heredados». Ya no hay tres campos: todas viven en `entidades`, que es lo que
 * aquella comprobacion perseguia. Lo que se mira ahora es que las de este juego
 * —que no se parecen a ninguna de CLUEDO— se lean sin mas.
 */
comprobar(
  'sus categorías se leen por su id, sin sitio privilegiado',
  m.categorias.every((c) => Array.isArray(game.entidades?.[c.id])),
  m.categorias.map((c) => c.id),
);

paso('Se juega una subasta entera');
abrirRonda(sesion, 10);
/*
 * Y ESTA ES LA LINEA QUE MAS DICE DE TODO EL FICHERO.
 *
 * Antes afirmaba `sesion.phase === 'ronda-abierta'`, porque la plataforma solo
 * sabia llevar la partida a las siete fases de CLUEDO. `abrirRonda` tenia
 * escrito el nombre.
 *
 * Ahora la subasta abre `lote-cantado`, que es una fase que solo existe en su
 * manifiesto, y la conduce el mismo `abrirRonda` de siempre — preguntando cual
 * de las fases de este juego hace el papel de turno.
 */
comprobar('la sala se abre en la fase que ESTE juego llama suya', sesion.phase === 'lote-cantado');

sesion.turnoDe = 'p0';
const disponibles = accionesDisponibles(sesion, 'p0').map((a) => a.id);
comprobar('a quien le toca se le ofrecen sus dos acciones', disponibles.join() === 'pujar,pasar', disponibles);
comprobar(
  'y a quien no le toca, ninguna',
  accionesDisponibles(sesion, 'p1').length === 0,
  accionesDisponibles(sesion, 'p1'),
);

ejecutarAccion(game, sesion, 'p0', 'pujar', { lote: 'l0', cuanto: '15' });
sesion.turnoDe = 'p1';
ejecutarAccion(game, sesion, 'p1', 'pujar', { lote: 'l0', cuanto: '20' });
const trasPujar = (sesion.estado?.almoneda ?? {}) as EstadoAlmoneda;
comprobar('la puja que se teclea es la que se registra', trasPujar.pujas.l0?.cuanto === 20, trasPujar.pujas);
comprobar('y es de quien pujó último', trasPujar.pujas.l0?.de === 'p1');

/*
 * Y EL MOTOR HACE VALER LOS LÍMITES, que es lo que separa pedir un número de
 * dejar que llegue cualquier cosa. Se prueban los cuatro rechazos.
 */
sesion.turnoDe = 'p2';
const rechaza = (que: string, datos: Record<string, string>): void => {
  let salto = false;
  try {
    ejecutarAccion(game, sesion, 'p2', 'pujar', datos);
  } catch {
    salto = true;
  }
  comprobar(que, salto, datos);
};
rechaza('el motor rechaza una puja que no es un número', { lote: 'l1', cuanto: 'muchísimo' });
rechaza('rechaza una puja por debajo del mínimo', { lote: 'l1', cuanto: '0' });
rechaza('rechaza una puja por encima del máximo', { lote: 'l1', cuanto: '500' });
rechaza('rechaza una puja con decimales si se pidió entera', { lote: 'l1', cuanto: '12.5' });
rechaza('y rechaza que falte el número', { lote: 'l1' });
sesion.turnoDe = 'p1';

cerrarRonda(sesion);
adjudicar(sesion);
const trasCerrar = (sesion.estado?.almoneda ?? {}) as EstadoAlmoneda;
comprobar('al cerrar se adjudica el lote', trasCerrar.adjudicado.l0 === 'p1');
comprobar('y se le cobra del fondo', trasCerrar.fondo.p1 === FONDO_INICIAL - 20, trasCerrar.fondo);
comprobar('a quien no se lo llevó no se le cobra', trasCerrar.fondo.p0 === FONDO_INICIAL);

paso('Lo que llega al móvil es de este juego, no de un misterio');
const v = vistaDeJugador(game, sesion, 'p1')!;
comprobar('se compone la vista', v !== null);
comprobar('sin salas', v.lugares.length === 0, v.lugares.length);
/*
 * LA COMPROBACION SE HA VUELTO MAS FUERTE, no mas debil.
 *
 * Aqui decia «sin pistas encontradas: `v.misHallazgos.length === 0`» y «sin
 * hechos establecidos». Eran ciertas y no valian de mucho: los campos EXISTIAN
 * en la vista de este juego, con su forma de misterio, y lo unico que se
 * comprobaba es que venian vacios. Un array vacio es lo que devuelve tambien
 * una plataforma que no ha sabido rellenarlos.
 *
 * Ahora ni siquiera existen: viven en el bloque que CLUEDO declara, y este
 * juego declara el suyo. Que `leerEstadoCluedo` devuelva `null` es la prueba de
 * que la vista de una almoneda no lleva NADA con forma de crimen.
 */
comprobar('la vista no trae bloque de CLUEDO por ningun lado', leerBloqueDePistas(v.estadoDelJuego) === null);
comprobar('sin ejes que acusar', v.ejes.length === 0, v.ejes);
comprobar('sin cronología pública', v.cronologia.length === 0);
comprobar('nadie es el señalado, porque no hay a quién señalar', v.yo.soyElSenalado === false);
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
 * Y LA CANTIDAD LLEGA AL MÓVIL COMO CAMPO. Sin esto la acción aparecía como un
 * botón sin nada que rellenar, y un juego con dinero tenía que escribir pantalla
 * propia —o sea, publicar una versión nueva del binario— solo para poder teclear
 * una cifra.
 */
sesion.phase = 'lote-cantado';
/*
 * Se le pregunta a p2 y no a p1: `vecesPorTurno: 1` cuenta POR RONDA, y p1 ya
 * pujó en esta. Preguntarle a él devolvería la lista vacía por el motivo
 * correcto y esta comprobación diría que el campo no llega, que es otra cosa.
 */
sesion.turnoDe = 'p2';
const conAcciones = vistaDeJugador(game, sesion, 'p2')!;
const pujarEnLaApp = conAcciones.acciones.find((a) => a.id === 'pujar');
comprobar('la acción de pujar llega al móvil', pujarEnLaApp !== undefined);
comprobar(
  'y llega con su campo numérico y sus límites',
  pujarEnLaApp?.numeros?.[0]?.campo === 'cuanto' &&
    pujarEnLaApp.numeros[0].minimo === 1 &&
    pujarEnLaApp.numeros[0].maximo === 100,
  pujarEnLaApp?.numeros,
);

/*
 * ═══ UN PEAJE QUE YA NO SE COBRA ═══
 *
 * Esta comprobación decía `v.caso.victima.nombre === '—'` y era una de las que
 * más molestaban de leer: afirmaba, y daba por bueno, que un juego sin crimen
 * tiene que mandar una víctima inventada para que la plataforma lo admita.
 *
 * Ahora afirma lo contrario. Sin víctima, la vista NO la lleva, y la app se
 * salta el bloque entero en vez de pintar «La víctima · —».
 */
comprobar('la vista no lleva víctima porque no ha muerto nadie', v.caso.victima === undefined);
/*
 * Y EL CUARTO. `PlotSolution` exigia `motive` y `howItHappened` —«por que lo
 * hizo» y «como lo hizo»— asi que esta subasta escribia dos cadenas vacias, y
 * el movil pintaba un marco con el rotulo «El motivo» y nada dentro.
 *
 * Lo que QUEDA es `synopsis` y `setting`, y no los quito porque no son de
 * CLUEDO: de que va esto y donde ocurre son dos cosas que tiene cualquier
 * juego. La subasta las rellena con frases de verdad, no con guiones.
 */
comprobar(
  'no hay motivo ni relato del crimen porque no ha habido crimen',
  plot.solution.motive === undefined && plot.solution.howItHappened === undefined,
);
peaje('`Plot` exige `synopsis` y `setting`, que casi todo juego tiene, y un `solution` aunque no haya nada que adivinar');
/*
 * ═══ OTRO PEAJE QUE YA NO SE COBRA ═══
 *
 * `PlotCharacter` exigia un secreto, un motivo, una coartada y un gancho POR
 * PERSONA. Los cuatro son de un juego donde alguien miente, y esta subasta
 * escribia cuatro cadenas vacias por postor solo para que la dejaran entrar.
 *
 * Salio casi gratis, y eso dice algo: quien los pinta YA preguntaba —la
 * proyeccion hace `personaje?.secret ?? ''` y el movil solo enseña el bloque si
 * el juego lo declara en su dosier—. Lo unico que faltaba era dejar de
 * exigirlos en el contrato.
 */
comprobar(
  'los postores no tienen secreto, ni motivo, ni coartada, ni gancho',
  plot.characters.every(
    (c) => c.secret === undefined && c.motive === undefined && c.alibi === undefined && c.personalHook === undefined,
  ),
);
/*
 * ═══ Y OTRO PEAJE QUE YA NO SE COBRA ═══
 *
 * Este era el que el propio informe de arquitectura marcaba como «el bloqueo de
 * fondo». `LivePhase` era una union cerrada de siete nombres —seis de CLUEDO y
 * uno que añadio la Momia cuando le hizo falta, lo cual describe el problema
 * entero: para tener una fase propia habia que venir al contrato de todos y
 * añadir un renglon.
 *
 * Esta subasta ya no lo paga: sus fases se llaman `sala-vacia`, `lote-cantado`,
 * `lote-adjudicado` y `almoneda-cerrada`, y la plataforma la conduce sin
 * reconocer ni uno de esos nombres.
 */
comprobar(
  'sus fases se llaman como quiere y la plataforma las entiende igual',
  papelDe(LA_ALMONEDA, 'sala-vacia') === 'espera' &&
    papelDe(LA_ALMONEDA, 'lote-cantado') === 'turno' &&
    papelDe(LA_ALMONEDA, 'almoneda-cerrada') === 'fin',
);
/*
 * ═══ Y EL TERCERO QUE YA NO SE COBRA ═══
 *
 * Este era de los peores porque no lo exigia ningun tipo: la partida compilaba
 * igual con los postores en `game.entidades` y no en `game.suspects`. Lo que
 * pasaba es que el nucleo leia la gente en treinta y seis sitios —moviles,
 * dosieres, correos, limpieza de fotos, proyeccion— y ninguno se enteraba de
 * que ese juego la guarda en otro lado. Se jugaba una partida sin nadie
 * sentado a la mesa.
 *
 * Ya no hay dos sitios donde guardarla. Lo que se comprueba es lo que aquello
 * perseguia: que la plataforma encuentre a la gente de un juego cuya categoria
 * de personas se llama `postores` y no se parece a ninguna de CLUEDO.
 */
comprobar(
  'la plataforma encuentra a sus postores como gente de la mesa',
  personasDe(game).length === POSTORES.length,
  { personas: personasDe(game).length, esperados: POSTORES.length },
);
comprobar(
  'y la sesion reparte un sitio por persona, no por sospechoso',
  sesion.players.length === POSTORES.length,
  sesion.players.length,
);
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
