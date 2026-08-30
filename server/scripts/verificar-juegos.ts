/**
 * Lo que cada juego DECLARA, ¿existe de verdad?
 *
 *   npm run verify:juegos
 *
 * ═══ POR QUÉ HACE FALTA ═══
 *
 * Cada juego tiene su comprobador —`verify:momia`, `verify:sombras`— y cada uno
 * juega una velada de lo suyo de punta a punta. Son excelentes y no cubren esto:
 * miran que la MECÁNICA funcione, no que lo declarado en el manifiesto esté
 * enchufado. Y el manifiesto es una tabla larga de promesas.
 *
 * Los fallos que caza esto son todos de la misma familia: **no dan error al
 * arrancar, no rompen la compilación, y aparecen en la mesa con doce personas
 * delante**. Una acción declarada sin reductor sale en la app y contesta 409 al
 * pulsarla. Una fase declarada sin ruta POST pinta el botón en el taller y da un
 * 404. Un imprimible que revienta desaparece del ZIP sin dejar traza. Un juego
 * que hereda las palabras de otro se ve completo y correcto, y es de otro.
 *
 * ═══ Y POR QUÉ MIRA LOS TRES JUEGOS A LA VEZ ═══
 *
 * Porque el fallo que de verdad importa es el CRUZADO: tocar CLUEDO y romperle
 * algo a la Momia sin enterarse. El maestro de oro está cableado a CLUEDO y su
 * verde no dice nada de los otros dos; esto recorre `juegosInstalados()`, así
 * que un juego nuevo entra aquí solo, sin que nadie se acuerde de añadirlo.
 */
import '../src/juegos/instalados';
import fs from 'node:fs';
import path from 'node:path';
import { generarTramaMomia } from '../src/juegos/momia-trama';
import { generarTramaSombras } from '../src/juegos/sombras-trama';
import { generateDemoPlot } from '../src/plot/cluedo-demo';
import { generateBoardLayout } from '../src/board/generator';
import { iniciarJuego } from '../src/juegos/inicios';
import { alDia, sesionAlDia } from '../src/juegos/migracion';
import { entidadesDe } from '../../shared/juegos';
import { trofeosDelJuego } from '../src/juegos/trofeos';
import { generadorDeTrama } from '../src/juegos/generadores';
import { ampliacionDe } from '../src/juegos/ampliaciones';
import { fasesConPapel, papelDe } from '../../shared/juegos';
import { dosieresDe } from '../src/docs/dosieres';
import { vozDelTaller } from '../src/agent/voces';
import { juegosConVeredicto } from '../src/juegos/veredictos';
import { abrirRonda } from '../src/live/sesion';
import { renderPlayerDocument } from '../src/docs/renderer';
import { renderPrintableDocument } from '../src/docs/imprimibles';
import { imprimiblesRegistrados, plantillaDe } from '../src/docs/imprimibles/registro';
import { printableDocsFor } from '../../shared/documents';
import {
  JuegoNoInstalado,
  juegosInstalados,
  manifiestoDe,
  manifiestoSiExiste,
} from '../../shared/juegos';
import { PAPELES_EN_JUEGO } from '../../shared/live';
import type { BloqueDeDosier, ManifiestoDeJuego } from '../../shared/juegos';
import type { LivePhase, LiveSession } from '../../shared/live';
import type { GameSession } from '../../shared/types';

const RAIZ = path.resolve(import.meta.dirname ?? __dirname, '..', '..');

let hechas = 0;
const fallos: string[] = [];
function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(`${que}${detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 300)}`}`);
}
function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

// ---------------------------------------------------------------------------
// Los registros, leídos del ámbito global donde los anclan con Symbol.for
// ---------------------------------------------------------------------------

const registro = (nombre: string): Record<string, unknown> =>
  ((globalThis as Record<symbol, unknown>)[Symbol.for(nombre)] as Record<string, unknown>) ?? {};

const reductores = registro('gamemasters.juegos.reductores');

// ---------------------------------------------------------------------------
// Una partida de mentira de cualquier juego, para poder renderizar
// ---------------------------------------------------------------------------

const GENTE = ['Ana', 'Bruno', 'Carla', 'Dani'];

/**
 * Monta una partida jugable del juego que sea.
 *
 * Se apoya en las categorías del manifiesto para saber cuántas entidades hacen
 * falta y dónde van, en vez de escribir tres casos a mano: así, un juego nuevo
 * entra por aquí sin tocar nada. Los nombres son de relleno a propósito —lo que
 * se mide es la maquinaria, no la prosa— salvo los de la Momia y las Sombras,
 * cuyos generadores de trama sí los miran.
 */
function partidaDe(m: ManifiestoDeJuego): GameSession | null {
  const ahora = '2026-03-01T21:00:00.000Z';
  const game = {
    id: `prueba-${m.id}`,
    name: `Prueba de ${m.nombre}`,
    status: 'ready',
    createdAt: ahora,
    updatedAt: ahora,
    suspects: [],
    rooms: [],
    weapons: [],
    entidades: {},
    boardMode: 'generated',
    settings: { language: 'es', juego: m.id },
  } as unknown as GameSession;

  for (const cat of m.categorias) {
    const cuantas = Math.max(cat.minimo, cat.sonJugadores ? GENTE.length : cat.minimo);
    const lista = Array.from({ length: cuantas }, (_, i) => ({
      id: `${cat.id[0]}${i}`,
      name: cat.sonJugadores ? (GENTE[i] ?? `Persona ${i + 1}`) : `${capitalizar(cat.singular)} ${i + 1}`,
    }));
    if (cat.almacenHeredado) (game as unknown as Record<string, unknown>)[cat.almacenHeredado] = lista;
    else (game.entidades as Record<string, unknown>)[cat.id] = lista;
  }

  // La trama la escribe cada juego. Sin generador propio se usa la de
  // demostración de CLUEDO, que es la que sirve para los juegos que no traen uno.
  try {
    if (m.id === 'momia') {
      game.plot = generarTramaMomia(game, { semilla: 'verificar-juegos', vigilias: 4 });
    } else if (m.id === 'sombras') {
      game.plot = generarTramaSombras(game, { semilla: 'verificar-juegos', horas: 4 });
    } else {
      game.plot = generateDemoPlot(game);
    }
  } catch {
    return null;
  }
  game.board = generateBoardLayout(game.rooms, m.rotuloCentralDelPlano);
  return game;
}

function capitalizar(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function sesionDe(game: GameSession, m: ManifiestoDeJuego): LiveSession {
  const sesion = {
    id: game.id,
    juego: m.id,
    code: 'PRUEBA',
    phase: 'lobby',
    round: 0,
    totalRounds: 4,
    players: game.suspects.map((s, i) => ({
      participanteId: s.id,
      displayName: s.name,
      joinCode: `P${i}`,
      joined: true,
      elecciones: [],
      notas: '',
      girosRecibidos: [],
    })),
    acusaciones: [],
    tablon: [],
    rev: 1,
    updatedAt: game.createdAt,
  } as unknown as LiveSession;
  iniciarJuego(game, sesion);
  return sesion;
}

// ---------------------------------------------------------------------------
// El vocabulario de cada juego, para cazar el material heredado
// ---------------------------------------------------------------------------

/**
 * Palabras que solo tienen sentido en UN juego.
 *
 * Si el material de la Momia dice «asesino» o «mayordomo», es que está saliendo
 * de una plantilla de CLUEDO; si el de CLUEDO dice «vigilia» o «papiro», al
 * revés. Es el fallo que describe el manual de montaje como «funciona, y dice
 * CLUEDO»: todo se ve completo y correcto, y es de otro juego.
 *
 * OJO A LOS FALSOS POSITIVOS. Una regla de CLUEDO dice hoy «no hay tablón común»
 * —negándolo— así que buscar «tablón común» a secas lo señalaría. Por eso las
 * palabras de abajo son las que NO pueden aparecer ni negadas: nombres propios
 * del mobiliario narrativo de cada juego.
 */
const VOCABULARIO: Record<string, RegExp[]> = {
  cluedo: [/\basesin[oa]\b/i, /\bmayordomo\b/i, /\bmansi[oó]n\b/i, /sospechos[oa]s?\b/i],
  momia: [/\bvigilia/i, /\bpapiro/i, /\bsaqueador/i, /\bfara[oó]n/i, /\bmomia\b/i],
  sombras: [/\bkanch[oō]/i, /\bescolta/i, /\bIga\b/, /\bninja/i, /\bHonn[oō]/i],
};

// ---------------------------------------------------------------------------

console.log('\nLo que cada juego declara, ¿existe de verdad?');
console.log(`Juegos instalados: ${juegosInstalados().map((m) => m.id).join(', ')}\n`);

const rutasLive = fs.readFileSync(path.join(RAIZ, 'server/src/routes/live.ts'), 'utf8');

/** Qué ruta POST abre cada fase. Si un juego declara una fase, tiene que existir. */
const RUTA_DE_FASE: Record<string, RegExp> = {
  'ronda-abierta': /ronda\/abrir/,
  'ronda-cerrada': /ronda\/cerrar/,
  acusaciones: /acusaciones/,
  sellado: /sellado/,
  intermedio: /encuentro\/cerrar/,
  desenlace: /desenlace/,
};

/** Bloques del dosier que solo pertenecen a un juego. */
const BLOQUES_PROPIOS: Record<string, BloqueDeDosier> = { momia: 'don', sombras: 'disfraz' };

for (const m of juegosInstalados()) {
  paso(`${m.nombre} · lo declarado está implementado`);

  // ---- 1. Acciones con reductor ----
  const suyos = new Set(Object.keys((reductores[m.id] ?? {}) as Record<string, unknown>));
  const sinReductor = m.acciones.map((a) => a.id).filter((id) => !suyos.has(id));
  comprobar(
    `${m.id}: toda acción declarada tiene reductor`,
    sinReductor.length === 0,
    { sinReductor, consecuencia: 'sale en la app y contesta 409 al pulsarla' },
  );

  // ---- 2. Fases con ruta que las abra ----
  const alcanzables = new Set<LivePhase>();
  for (const destinos of Object.values(m.fases)) for (const d of destinos ?? []) alcanzables.add(d);
  const sinRuta = [...alcanzables].filter((f) => {
    const re = RUTA_DE_FASE[f];
    return re ? !re.test(rutasLive) : false;
  });
  comprobar(
    `${m.id}: toda fase alcanzable tiene ruta POST`,
    sinRuta.length === 0,
    { sinRuta, consecuencia: 'el taller pinta el boton y da 404 delante de la mesa' },
  );

  /*
   * ---- 2 bis. QUIEN ESCRIBE SU TRAMA ----
   *
   * El generador se elegía con un ternario encadenado por id de juego dentro de
   * la tubería común, con CLUEDO como rama por defecto EN SILENCIO: un juego que
   * se olvidara de entrar en él no daba error, le generaban un asesinato con
   * culpable, arma y sala sobre sus entidades. Ahora se da de alta por registro y
   * falla cerrado.
   *
   * Pero un registro tiene su propia trampa, y es la que este repositorio ya se
   * comió una vez: el alta solo ocurre si ALGUIEN IMPORTA el módulo. Si nadie lo
   * hace, el registro queda vacío, el servidor arranca perfectamente, los
   * comprobadores de cada juego siguen en verde --porque importan sus módulos a
   * mano-- y el fallo sale al pulsar «generar». Esto entra por la misma puerta
   * que la producción: `instalados.ts`, que es lo que carga el arranque.
   */
  comprobar(
    `${m.id}: tiene generador de trama dado de alta`,
    generadorDeTrama(m.id) !== undefined,
    'sin el, `runGeneration` lanza; y si el alta existe pero nadie importa el modulo, el registro queda vacio',
  );
  comprobar(
    `${m.id}: y su generador trae el rótulo que se lee mientras escribe`,
    (generadorDeTrama(m.id)?.rotulo ?? '').length > 0,
    'estaban en dos ternarios distintos y se podian separar: la Momia recomponia su papiro mientras la pantalla decia «Tejiendo la trama del crimen»',
  );

  /*
   * ---- 2 bis. QUIEN SABE ESCRIBIR UNA TRAMA SABE PONERLA AL DIA ----
   *
   * No es simetría por gusto: quien prepara una partida toca los datos DESPUÉS
   * de generar —añade a alguien, borra un lugar— y entonces la trama se queda
   * vieja. `runRefresh` poda lo que puede gratis y para lo demás le pregunta al
   * juego con `ampliacionDe`. Un juego que genera y no amplía deja esa partida
   * marcada `ready` con los personajes que faltan sin escribir, sin un error.
   *
   * ESTA COMPROBACIÓN NACIÓ DE HABERLO ROTO. Al partir `refresh.ts` —que tenía
   * dentro las cuatrocientas líneas de la ampliación de CLUEDO— el
   * `registrarAmpliacion('cluedo', …)` se quedó en un módulo que no importaba
   * nadie. Se probó quitando el import de `instalados.ts` y la batería entera
   * siguió en verde: doce comprobadores, tres maestros de oro y dos veladas
   * completas, todos contentos con CLUEDO sin poder repararse.
   *
   * Es exactamente el fallo que `instalados.ts` describe en su cabecera y que ya
   * estuvo a punto de ocurrir dos veces. La lección no es «acuérdate del
   * import»: es que un registro sin comprobación que lo respalde se pierde,
   * antes o después, y sin hacer ruido.
   */
  /*
   * ---- 2 ter. QUIEN COMPONE SUS DOSIERES ----
   *
   * Los dosieres eran el CUERPO de `docs/renderer.ts`: quinientas lineas de la
   * victima, los sospechosos y los pasadizos secretos dentro del fichero que
   * los compone para cualquier juego. Y no colgaban de un `if`: eran el camino
   * por defecto, con `if (!manifiesto.dosieresPropios)` decidiendo si ademas se
   * añadian el de quien dirige y el sobre sellado.
   *
   * Ahora los tres juegos se dan de alta igual. Sin alta, el taller no sirve ni
   * un dosier — lo caza el maestro de oro, pero «16 diferencias» dice bastante
   * menos que esta linea.
   */
  comprobar(
    `${m.id}: tiene sus dosieres dados de alta`,
    dosieresDe(m.id) !== undefined,
    'sin ellos el taller no sirve ni un dosier, y antes caia en el generico de CLUEDO',
  );

  comprobar(
    `${m.id}: si sabe escribir una trama, sabe ponerla al día`,
    ampliacionDe(m.id) !== undefined,
    'sin ampliacion, una partida que se queda vieja sale `ready` con lo que falta sin escribir',
  );

  /*
   * ---- 2 ter. QUIEN LE PONE VOZ A SU ASISTENTE EN EL TALLER ----
   *
   * `buildSystemPrompt` empezaba con un `if` por cada juego y todo lo que venia
   * debajo era el prompt de CLUEDO. Un juego sin su linea recibia a Edmund, el
   * mayordomo, explicando refutaciones y pasadizos secretos en una expedicion
   * egipcia --y con la cara y el nombre de SU asistente al lado, porque esos si
   * salen del manifiesto: la mezcla mas confusa posible--.
   *
   * CLUEDO no entra: su prompt ES el que hay debajo de la bifurcacion, o sea el
   * respaldo, y darle un alta seria escribirlo dos veces.
   */
  if (m.id !== 'cluedo') {
    comprobar(
      `${m.id}: tiene voz propia en el taller`,
      vozDelTaller(m.id) !== undefined,
      'sin ella, quien prepare esta partida habla con Edmund el mayordomo de CLUEDO',
    );
  }

  /*
   * ---- 2 quater. QUIEN DECIDE SU VICTORIA ----
   *
   * `sesion.winnerId` significa «el primero que acerto la acusacion», que es
   * ganar en CLUEDO y no lo es en un juego de bandos. Un juego cuyo desenlace no
   * quepa ahi tiene que dar de alta su veredicto, o la plataforma anotara en el
   * historial de cada cuenta un ganador que no lo es --y eso no se arregla
   * despues: la velada ya paso--.
   *
   * Se pregunta por el EJE: un juego cuyo eje de personas senala a alguien --el
   * culpable, el saqueador, el kancho-- y que ademas resuelve por bandos, tiene
   * que traerlo. CLUEDO no, porque para el `winnerId` ES la respuesta correcta.
   */
  if (m.id !== 'cluedo' && (m.ejes ?? []).length > 0) {
    comprobar(
      `${m.id}: da de alta quien gana, en vez de dejarlo en «el primero que acerto»`,
      juegosConVeredicto().includes(m.id),
      'sin el, el historial de la cuenta de cada persona anota mal quien gano esa noche',
    );
  }

  /*
   * ---- 3. Se puede terminar la partida ----
   *
   * POR EL PAPEL, NO POR EL NOMBRE. Esto miraba si desde una de las cuatro
   * fases de `FASES_EN_JUEGO` —una lista de nombres de CLUEDO en el contrato
   * comun— habia camino a una fase llamada literalmente `desenlace`. Un juego
   * con sus propias fases no tenia ninguna de las dos cosas y salia en rojo sin
   * estar roto.
   */
  const finales = new Set(fasesConPapel(m, 'fin'));
  comprobar(
    `${m.id}: declara alguna fase que termine la partida`,
    finales.size > 0,
    'sin una fase con papel «fin» no hay forma de acabar ni de enseñar la respuesta',
  );
  const puedeAcabar = Object.entries(m.fases).some(
    ([desde, a]) =>
      PAPELES_EN_JUEGO.includes(papelDe(m, desde)) && (a ?? []).some((d) => finales.has(d)),
  );
  comprobar(`${m.id}: hay camino desde una fase en juego hasta el final`, puedeAcabar);

  // ---- 4. Coherencia interna del manifiesto ----
  const cats = new Set(m.categorias.map((c) => c.id));
  const ejesRotos = (m.ejes ?? []).filter((e) => !cats.has(e.categoria)).map((e) => e.id);
  comprobar(`${m.id}: todo eje apunta a una categoría que existe`, ejesRotos.length === 0, ejesRotos);
  const accionesRotas = m.acciones
    .flatMap((a) => (a.eligeDe ?? []).map((c) => ({ accion: a.id, categoria: c.categoria })))
    .filter((x) => !cats.has(x.categoria));
  comprobar(`${m.id}: toda acción elige de una categoría que existe`, accionesRotas.length === 0, accionesRotas);
  comprobar(
    `${m.id}: alguna categoría es «sonJugadores»`,
    m.categorias.some((c) => c.sonJugadores),
    'sin ella no hay emparejamiento de moviles, ni dosieres, ni correos',
  );

  // ---- 5. El dosier del móvil ----
  const tienePestana = m.barra.some((p) => p.pantalla === 'personaje');
  comprobar(
    `${m.id}: declara la pestaña del dosier si y solo si declara bloques`,
    tienePestana === m.dosier.length > 0,
    { pestana: tienePestana, bloques: m.dosier.length },
  );
  comprobar(
    `${m.id}: no repite ningún bloque del dosier`,
    new Set(m.dosier).size === m.dosier.length,
    m.dosier,
  );
  for (const [duenno, bloque] of Object.entries(BLOQUES_PROPIOS)) {
    if (m.id === duenno) continue;
    comprobar(
      `${m.id}: no declara «${bloque}», que es de ${duenno}`,
      !m.dosier.includes(bloque),
      'un bloque propio de otro juego se pintaria vacio o con su estado',
    );
  }

  // ---- 6. Reglas, avisos y rótulos propios ----
  comprobar(
    `${m.id}: trae sus propias reglas`,
    Array.isArray(m.reglas) && m.reglas.length > 0,
    'sin ellas los tres consumidores caen en las de CLUEDO: «Alguien de esta casa es un asesino»',
  );

  /*
   * ═══ EL TÍTULO Y EL CUERPO DEL TELÓN, DEL MISMO JUEGO ═══
   *
   * El telón a pantalla completa que anuncia cada cambio tiene dos partes: el
   * CUERPO, que sale de `manifiesto.avisos`, y el RÓTULO, que es la línea grande
   * de encima. Un juego que declare el cuerpo y no el rótulo se queda con el
   * título de CLUEDO sobre su propio texto: la Momia decía «Comienza la ronda»
   * encima de «Vigilia 3 de 5. Elige cámara», en la misma pantalla y a tamaño
   * grande.
   *
   * Así que si declaras uno, declara el otro. CLUEDO no declara ninguno de los
   * dos —los suyos son los de la app— y por eso no entra en esta comprobación.
   */
  if (m.avisos) {
    const rotulos = m.rotulosDeAviso ?? {};
    const alcanzables = new Set<string>();
    for (const destinos of Object.values(m.fases)) for (const d of destinos ?? []) alcanzables.add(d);
    /* Solo las fases por las que este juego pasa de verdad. */
    const sinRotulo = [...alcanzables].filter((f) => f !== 'intermedio' && !rotulos[f]);
    comprobar(
      `${m.id}: si declara los cuerpos de los telones, declara también sus rótulos`,
      sinRotulo.length === 0,
      {
        sinRotulo,
        porque: 'el telon saldria con el titulo de CLUEDO encima del cuerpo de este juego',
      },
    );
  }
}

// ---------------------------------------------------------------------------
// El material: que se genere, y que sea del juego que dice ser
// ---------------------------------------------------------------------------

for (const m of juegosInstalados()) {
  paso(`${m.nombre} · el material se genera y es suyo`);

  const game = partidaDe(m);
  comprobar(`${m.id}: se puede montar una partida y generarle trama`, game !== null);
  if (!game) continue;
  const sesion = sesionDe(game, m);
  abrirRonda(sesion, 15);

  const ajenas = Object.entries(VOCABULARIO)
    .filter(([juego]) => juego !== m.id)
    .flatMap(([juego, res]) => res.map((re) => [juego, re] as const));

  /** Mira un HTML: que exista, que sea sustancial y que no hable de otro juego. */
  const revisar = (nombre: string, html: string | undefined): void => {
    const cuerpo = html ?? '';
    comprobar(`${m.id}/${nombre}: se genera y no sale vacío`, cuerpo.length > 1500, cuerpo.length);
    if (cuerpo.length <= 1500) return; // Sin cuerpo, buscar palabras no comprueba nada.
    const coladas = ajenas.filter(([, re]) => re.test(cuerpo)).map(([juego, re]) => `${juego}:${re.source}`);
    comprobar(`${m.id}/${nombre}: no usa el vocabulario de otro juego`, coladas.length === 0, coladas);
  };

  // El dosier genérico solo se revisa si el juego lo usa: quien trae los suyos
  // (`dosieresPropios`) no lo mete en su paquete y lo que salga de ahí da igual.
  const propios = (m as { dosieresPropios?: boolean }).dosieresPropios === true;
  if (!propios) {
    revisar('dosier-generico', renderPlayerDocument(game, game.suspects[0]!.id, { variant: 'color' })?.html);
  }

  const docs = printableDocsFor(game.settings, m.documentos);
  comprobar(`${m.id}: su paquete trae imprimibles`, docs.length > 0, docs.length);

  /*
   * ═══ LO DECLARADO Y LO ENCHUFADO, PIEZA A PIEZA ═══
   *
   * Antes esto lo garantizaba el COMPILADOR: las plantillas vivían en un
   * `Record<PrintableDocId, Plantilla>` exhaustivo, así que declarar un
   * documento sin escribir su plantilla no compilaba. Esa tabla era también el
   * cuello de botella —un fichero del núcleo con las veintinueve plantillas de
   * los tres juegos— y al partirla en un registro por juego se perdió el aviso.
   *
   * Lo que se perdió hay que recuperarlo aquí, porque el fallo sin esto es de
   * los malos: el documento no revienta ni avisa, sale AUSENTE del paquete y
   * quien prepara la velada descubre que le falta una hoja cuando ya tiene a
   * doce personas en casa.
   *
   * Y se mira en las dos direcciones. Una plantilla registrada que el juego no
   * declara no puede salir por ningún sitio: es código muerto que se seguirá
   * manteniendo, y suele ser el rastro de un documento que se renombró en el
   * manifiesto y no en el registro.
   */
  const declarados = new Set(m.documentos.map((d) => d.id));
  const registrados = new Set(imprimiblesRegistrados(m.id));
  const sinPlantilla = [...declarados].filter(
    (id) => !registrados.has(id) && plantillaDe(m.id, id) === undefined,
  );
  comprobar(
    `${m.id}: todo documento declarado tiene plantilla`,
    sinPlantilla.length === 0,
    { sinPlantilla, porque: 'saldría ausente del paquete, sin reventar y sin avisar' },
  );
  const sinDeclarar = [...registrados].filter((id) => !declarados.has(id));
  comprobar(
    `${m.id}: no registra plantillas que no declara`,
    sinDeclarar.length === 0,
    { sinDeclarar, porque: 'no puede salir por ningún sitio: es código muerto' },
  );
  for (const doc of docs) {
    let html: string | undefined;
    let reventó: string | null = null;
    try {
      html = renderPrintableDocument(game, doc.id, { variant: 'color' })?.html;
    } catch (e) {
      reventó = e instanceof Error ? e.message : String(e);
    }
    comprobar(`${m.id}/${doc.id}: no revienta al renderizar`, reventó === null, reventó);
    if (reventó === null) revisar(doc.id, html);

    /*
     * LA HOJA POR LA QUE SE ABRE EL PAQUETE NO PUEDE PROMETER LO QUE NO HAY.
     *
     * `indice-paquete` la comparten los tres juegos y lista qué imprimir y
     * cuántas copias. Tenía escritos a mano los tres dosieres genéricos de
     * CLUEDO —el de cada persona, el de quien dirige y el sobre del crimen— y los
     * emitía siempre; pero el ZIP solo los mete cuando el juego NO trae los
     * suyos. A la Momia y a las Sombras se les prometían dos documentos que no
     * están dentro, y quien prepara la velada los busca y se pregunta qué ha
     * hecho mal.
     *
     * `verificar-puertas` ya comprobaba la lista de RUTAS del ZIP y confirmaba
     * que los genéricos no estaban; lo que no miraba nadie era el HTML de esta
     * hoja. El agujero cabía justo en ese hueco.
     */
    if (doc.id === 'indice-paquete' && (m as { dosieresPropios?: boolean }).dosieresPropios === true) {
      const promete = ['Dosier del Game Master', 'El sobre del crimen', 'Guía de la velada'].filter(
        (t) => (html ?? '').includes(t),
      );
      comprobar(
        `${m.id}/indice-paquete: no promete dosieres genéricos que su ZIP no lleva`,
        promete.length === 0,
        { promete, porque: 'este juego declara dosieresPropios y paquete.ts no mete los genericos' },
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Las medallas de un juego no se reparten en otro
// ---------------------------------------------------------------------------

/*
 * ═══ POR QUÉ ESTO TIENE COMPROBACIÓN PROPIA ═══
 *
 * `live/cuentas.ts` concedía seis trofeos con los ids escritos a mano, en código
 * de plataforma que corre para CUALQUIER partida, y tres de los seis son reglas
 * de CLUEDO. El que lo retrata es «Crimen perfecto», cuyo texto dice «fuiste el
 * culpable y nadie te descubrió»: se concedía con `eraSenalado && !winnerId`, y
 * en El Misterio de la Momia `winnerId` solo se escribe si alguien SEÑALA al
 * saqueador. O sea que una noche en la que la expedición sellaba la tumba en el
 * orden bueno —en la que el saqueador PERDÍA— le daba igualmente la medalla de
 * haberse salido con la suya, si además nadie llegó a señalarlo.
 *
 * Ahora los tres viven en `juegos/cluedo-trofeos.ts` y se piden por el mismo
 * gancho que los de los demás. Esto comprueba las dos mitades: que CLUEDO los
 * sigue dando exactamente igual, y que ningún otro juego los da.
 */
paso('Las medallas de un juego no se reparten en otro');
{
  const DE_CLUEDO: string[] = ['ganador', 'sabueso', 'culpable-impune'];

  /*
   * SE LLAMA AL REPARTO DIRECTAMENTE, SIN LA RED.
   *
   * `trofeosDelJuego` se traga las excepciones a propósito —un fallo repartiendo
   * medallas no puede impedir que se guarde la partida de alguien— y devuelve
   * lista vacía. Eso es correcto en producción y ARRUINA una comprobación: la
   * primera versión de esto pasaba en verde para la Momia porque su reparto
   * reventaba por dentro («Esta partida todavía no tiene tumba que sellar», por
   * pasarle una sesión de mentira) y una lista vacía no contiene ningún trofeo de
   * CLUEDO. Verde por no haber mirado.
   *
   * Así que se coge el reparto del registro y se llama a pelo: si lanza, esto
   * falla, que es lo que tiene que pasar.
   */
  const repartos = registro('gamemasters.juegos.trofeos') as Record<
    string,
    ((c: unknown) => string[]) | undefined
  >;

  for (const m of juegosInstalados()) {
    const game = partidaDe(m);
    if (!game) continue;
    const sesion = sesionDe(game, m);
    sesion.phase = 'desenlace';
    const jugador = sesion.players[0]!;

    /** Un cierre real de este juego, con el caso que se quiera probar encima. */
    const cierre = (extra: { gano?: boolean; acerto?: boolean; eraSenalado?: boolean; winnerId?: string }) => ({
      game,
      sesion: { ...sesion, winnerId: extra.winnerId },
      plot: game.plot!,
      jugador,
      eraSenalado: extra.eraSenalado === true,
      gano: extra.gano === true,
      acerto: extra.acerto === true,
    });

    const reparto = repartos[m.id];
    const CASOS = [
      { gano: true, winnerId: jugador.participanteId },
      { acerto: true },
      { eraSenalado: true },
    ];

    let reventó: string | null = null;
    const repartidos = new Set<string>();
    if (reparto) {
      for (const caso of CASOS) {
        try {
          for (const t of reparto(cierre(caso))) repartidos.add(t);
        } catch (e) {
          reventó = e instanceof Error ? e.message : String(e);
        }
      }
    }

    comprobar(
      `${m.id}: su reparto de trofeos no revienta`,
      reventó === null,
      { reventó, porque: 'trofeosDelJuego se traga el error y devuelve lista vacia: el fallo seria mudo' },
    );

    if (m.id === 'cluedo') {
      // Las tres condiciones de CLUEDO, una por una, tal como estaban.
      comprobar('cluedo: quien gana se lleva «ganador»', repartidos.has('ganador'));
      comprobar('cluedo: quien acierta se lleva «sabueso»', repartidos.has('sabueso'));
      comprobar(
        'cluedo: el culpable a quien nadie descubre se lleva «culpable-impune»',
        repartidos.has('culpable-impune'),
      );
      comprobar(
        'cluedo: si alguien resolvió el caso, el culpable NO se lo lleva',
        !(reparto?.(cierre({ eraSenalado: true, winnerId: 'otro' })) ?? []).includes('culpable-impune'),
      );
    } else {
      const colados = [...repartidos].filter((t) => DE_CLUEDO.includes(t));
      comprobar(
        `${m.id}: no reparte ninguna medalla de CLUEDO`,
        colados.length === 0,
        { colados, porque: '«Crimen perfecto» premiaba al saqueador de la Momia justo cuando perdia' },
      );
    }

    /*
     * Y que solo reparta trofeos que él mismo declara: un id que no esté en su
     * manifiesto no se pinta en la vitrina del perfil, así que se ganaría en
     * silencio y no lo vería nadie.
     */
    const suyos = new Set(m.trofeos.map((t) => t.id as string));
    const sinDeclarar = [...repartidos].filter((t) => !suyos.has(t));
    comprobar(
      `${m.id}: todo trofeo que reparte está declarado en su manifiesto`,
      sinDeclarar.length === 0,
      { sinDeclarar, porque: 'un trofeo no declarado se gana en silencio y no se pinta en la vitrina' },
    );
  }
}

// ---------------------------------------------------------------------------
// Una partida guardada con los nombres VIEJOS, ¿se sigue pudiendo abrir?
// ---------------------------------------------------------------------------

paso('Lo guardado con los nombres viejos se pone al dia al leerlo');

/*
 * ═══ POR QUE ESTO ES LO MAS DELICADO DE TODO EL REFACTOR ═══
 *
 * Renombrar un campo del codigo es mecanico y el compilador lo vigila. Renombrar
 * un campo GUARDADO no: los documentos que ya estan en Mongo siguen llevando el
 * nombre viejo, y el codigo nuevo no los encuentra.
 *
 * El fallo no se ve al desplegar. Se ve cuando alguien abre una partida que
 * preparo la semana pasada y la mesa aparece vacia —ningun jugador, ninguna
 * acusacion, ningun personaje— porque los campos que los llevaban se llamaban de
 * otra forma. De noche, con doce personas delante.
 *
 * Asi que aqui se monta una partida y una sesion CON LOS NOMBRES VIEJOS, tal
 * como estarian en la base, se pasan por las dos puertas del almacen —`alDia` y
 * `sesionAlDia`— y se comprueba que salen enteras.
 */
{
  const vieja = {
    id: 'partida-vieja',
    name: 'Guardada antes del renombrado',
    status: 'ready',
    createdAt: '2026-01-01T20:00:00.000Z',
    updatedAt: '2026-01-01T20:00:00.000Z',
    // Las entidades, en los tres campos heredados.
    suspects: [{ id: 's0', name: 'Ana' }, { id: 's1', name: 'Bruno' }],
    rooms: [{ id: 'r0', name: 'Salón' }],
    weapons: [{ id: 'w0', name: 'Candelabro' }],
    boardMode: 'generated',
    settings: { language: 'es', juego: 'cluedo' },
    documents: [{ suspectId: 's0', title: 'Dosier de Ana' }],
    plot: {
      title: 'Un caso viejo',
      tagline: 'De antes.',
      synopsis: 'Algo pasó.',
      setting: 'La casa.',
      solution: { respuestas: {} },
      characters: [{ suspectId: 's0', characterName: 'Ana', role: 'Invitada', publicPersona: '', knowledge: [] }],
      timeline: [{ time: '21:00', description: 'Llegaron', suspectIds: ['s0', 's1'], isPublic: true }],
      clues: [],
      gmScript: [],
      material: {
        generatedAt: '2026-01-01T20:00:00.000Z',
        narrations: [],
        twists: [{ id: 'g0', suspectId: 's1', round: 2, instruction: 'Recuerdas algo.' }],
        timelineReveals: [],
        hints: [],
        finale: { reconstruction: '', confession: '', epilogue: '' },
      },
    },
  } as unknown as GameSession;

  const puesta = alDia(vieja)!;

  comprobar(
    'las entidades se mudan de los campos heredados a `entidades`',
    entidadesDe(puesta, 'sospechosos').length === 2 &&
      entidadesDe(puesta, 'salas').length === 1 &&
      entidadesDe(puesta, 'objetos').length === 1,
    { entidades: Object.keys(puesta.entidades ?? {}) },
  );
  comprobar(
    'y los campos heredados se quedan vacios',
    puesta.suspects.length === 0 && puesta.rooms.length === 0 && puesta.weapons.length === 0,
  );
  comprobar(
    'el indice de dosieres estrena `id`',
    puesta.documents?.[0]?.id === 's0' &&
      (puesta.documents?.[0] as unknown as { suspectId?: string }).suspectId === undefined,
    puesta.documents,
  );
  comprobar(
    'los personajes de la trama saben a quien interpretan',
    puesta.plot?.characters[0]?.participanteId === 's0',
    puesta.plot?.characters[0],
  );
  comprobar(
    'la cronologia sabe quien estaba',
    puesta.plot?.timeline[0]?.participanteIds.join(',') === 's0,s1',
    puesta.plot?.timeline[0],
  );
  comprobar(
    'y los giros saben a quien van',
    puesta.plot?.material?.twists[0]?.participanteId === 's1',
    puesta.plot?.material?.twists[0],
  );

  const sesionVieja = {
    id: 'partida-vieja',
    juego: 'cluedo',
    code: 'VIEJA1',
    phase: 'ronda-cerrada',
    round: 2,
    totalRounds: 4,
    players: [
      { suspectId: 's0', displayName: 'Ana', joinCode: 'AAA111', joined: true, elecciones: [], notas: '', girosRecibidos: [] },
      { suspectId: 's1', displayName: 'Bruno', joinCode: 'BBB222', joined: true, elecciones: [], notas: '', girosRecibidos: [] },
    ],
    acusaciones: [{ suspectId: 's0', respuestas: {}, at: '2026-01-01T21:00:00.000Z', correcta: false, aciertos: 0 }],
    acciones: [{ suspectId: 's1', accion: 'entrar-en-sala', round: 1, at: '2026-01-01T20:30:00.000Z' }],
    denuncias: [{ suspectId: 's0', displayName: 'Ana', pregunta: '¿?', respuesta: '…', at: '2026-01-01T20:40:00.000Z' }],
    tablon: [],
    rev: 3,
    updatedAt: '2026-01-01T21:00:00.000Z',
  } as unknown as LiveSession;

  const sesionPuesta = sesionAlDia(sesionVieja)!;

  comprobar(
    'la mesa no se queda vacia: cada silla sabe quien la ocupa',
    sesionPuesta.players.every((j) => typeof j.participanteId === 'string' && j.participanteId !== ''),
    sesionPuesta.players.map((j) => j.participanteId),
  );
  comprobar(
    'las acusaciones ya entregadas siguen sabiendo quien las entrego',
    sesionPuesta.acusaciones[0]?.participanteId === 's0',
    sesionPuesta.acusaciones[0],
  );
  comprobar(
    'el registro de acciones no pierde de quien es cada una',
    sesionPuesta.acciones?.[0]?.participanteId === 's1',
    sesionPuesta.acciones?.[0],
  );
  comprobar(
    'y las denuncias tampoco',
    sesionPuesta.denuncias?.[0]?.participanteId === 's0',
    sesionPuesta.denuncias?.[0],
  );
  comprobar(
    'y no queda ni un `suspectId` suelto por ningun lado',
    !JSON.stringify([puesta, sesionPuesta]).includes('suspectId'),
    { porque: 'dos copias del mismo dato divergen en cuanto alguien edita' },
  );
}

// ---------------------------------------------------------------------------
// El plano, ¿cabe cualquier numero de lugares?
// ---------------------------------------------------------------------------

paso('El plano no dibuja dos lugares encima');

/*
 * ═══ EL FALLO QUE ESTO CIERRA ═══
 *
 * La colocacion era `huecos[indice % huecos.length]` sobre una tabla de
 * dieciseis. Con diecisiete lugares, el decimoseptimo recibia EXACTAMENTE las
 * coordenadas del primero: dos dibujados uno encima de otro, en silencio, sin
 * un aviso ni un error. En el plano se ve uno solo y quien mira cuenta
 * dieciseis donde hay diecisiete.
 *
 * Diecisiete es mucho para un misterio en una casa y es poco para casi
 * cualquier otra cosa. Se prueba hasta sesenta porque el objetivo declarado es
 * que quepa un mundo de campaña entero, con sus aldeas, sus cuevas y sus
 * caminos.
 */
{
  const solapan = (a: { x: number; y: number; w: number; h: number },
                   b: { x: number; y: number; w: number; h: number }): boolean =>
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  const malos: Array<{ cuantos: number; que: string }> = [];
  for (let cuantos = 1; cuantos <= 60; cuantos++) {
    const lugares = Array.from({ length: cuantos }, (_, i) => ({
      // Con relleno a la izquierda: el generador ordena por id, y sin esto
      // «sala-10» iria antes que «sala-9» y la prueba mediria otra cosa.
      id: `sala-${String(i).padStart(3, '0')}`,
      name: `Lugar ${i + 1}`,
    }));
    const plano = generateBoardLayout(lugares as never);

    if (plano.rooms.length !== cuantos) {
      malos.push({ cuantos, que: `se dibujaron ${plano.rooms.length} de ${cuantos}` });
      continue;
    }
    for (let i = 0; i < plano.rooms.length && malos.length < 5; i++) {
      for (let j = i + 1; j < plano.rooms.length; j++) {
        if (solapan(plano.rooms[i]!, plano.rooms[j]!)) {
          malos.push({ cuantos, que: `${plano.rooms[i]!.roomId} pisa a ${plano.rooms[j]!.roomId}` });
          break;
        }
      }
    }
    const fuera = plano.rooms.filter(
      (r) => r.x < 0 || r.y < 0 || r.x + r.w > plano.grid.cols || r.y + r.h > plano.grid.rows,
    );
    if (fuera.length > 0) {
      malos.push({ cuantos, que: `${fuera.length} lugares se salen de la rejilla` });
    }
  }

  comprobar(
    'de 1 a 60 lugares: todos se dibujan y ninguno pisa a otro',
    malos.length === 0,
    malos.slice(0, 5),
  );

  /*
   * Y que hasta dieciseis NO haya cambiado nada. Las tablas fijas estan
   * calibradas —esquinas primero, pasillo entre lugares, el perimetro clasico—
   * y se ven mejor que cualquier rejilla automatica. La rejilla que crece es
   * para cuando ya no queda mas remedio.
   */
  const doce = generateBoardLayout(
    Array.from({ length: 12 }, (_, i) => ({ id: `s${i}`, name: `S${i}` })) as never,
  );
  comprobar(
    'hasta 16 lugares se sigue usando el perimetro clasico de 24x24',
    doce.grid.cols === 24 && doce.grid.rows === 24,
    { grid: doce.grid },
  );
}

// ---------------------------------------------------------------------------
// Un juego que no esta instalado, ¿se puede jugar por error?
// ---------------------------------------------------------------------------

paso('Un juego que no esta instalado no se juega como otro');

/*
 * ═══ POR QUE ESTO ES LO MAS GRAVE DE TODO EL FICHERO ═══
 *
 * `manifiestoDe` devolvia CLUEDO para cualquier id desconocido. Mientras la
 * lista de juegos fue la misma en todas partes eso era inofensivo: no habia id
 * desconocido posible. Con juegos instalados por servidor —que es a donde va
 * esto— pasa a ser el modo de fallo mas probable que hay, y del peor tipo: el
 * que NO FALLA.
 *
 * Una partida de un juego no instalado se abria y se jugaba entera como CLUEDO.
 * Con sus fases, sus acciones, sus imprimibles y sus trofeos, sobre los datos de
 * otro juego, sin un solo error por ninguna parte. Doce personas alrededor de
 * una mesa repartiendo sobres de un asesinato que no ocurre.
 */
{
  const inventado = 'juego-que-no-existe-en-ninguna-parte';

  let lanzo: unknown;
  try {
    manifiestoDe(inventado);
  } catch (e) {
    lanzo = e;
  }
  comprobar(
    'manifiestoDe falla con un juego que no esta instalado',
    lanzo instanceof JuegoNoInstalado,
    { devolvio: lanzo === undefined ? 'nada, siguio adelante' : String(lanzo) },
  );
  comprobar(
    'y el error dice de QUE juego se trata',
    lanzo instanceof JuegoNoInstalado && lanzo.juego === inventado,
    { porque: 'sin el nombre hay que abrir los registros para saber lo que el error ya sabia' },
  );

  /*
   * Y las dos cosas que NO pueden cambiar al arreglar lo de arriba, porque son
   * las que mantienen vivas las partidas de antes de que existiera el campo.
   */
  comprobar(
    'una partida sin juego declarado sigue siendo CLUEDO',
    manifiestoDe(undefined).id === 'cluedo',
    { porque: 'son todas las partidas anteriores al campo; sin esto habria que migrar la base' },
  );
  comprobar(
    'manifiestoSiExiste contesta «no se» en vez de reventar',
    manifiestoSiExiste(inventado) === undefined && manifiestoSiExiste(undefined)?.id === 'cluedo',
  );

  /*
   * El generador es el sitio donde el respaldo silencioso hacia mas daño, y
   * ademas dejaba codigo muerto: `plot/pipeline.ts` tiene un bloque «FALLA
   * CERRADO» escrito para negarse a generar sin generador, y era inalcanzable
   * porque `GENERADORES[manifiestoDe(juego).id]` siempre encontraba el de
   * CLUEDO. O sea que a una partida de un juego desconocido se le generaba un
   * asesinato.
   */
  let generadorLanzo = false;
  try {
    generadorDeTrama(inventado);
  } catch (e) {
    generadorLanzo = e instanceof JuegoNoInstalado;
  }
  comprobar(
    'no se le puede pedir una trama a un juego que no esta instalado',
    generadorLanzo,
    { porque: 'antes se le generaba un asesinato de CLUEDO, y el «FALLA CERRADO» era codigo muerto' },
  );
}

// ---------------------------------------------------------------------------

console.log('');
if (fallos.length === 0) {
  console.log(`${hechas} comprobaciones`);
  console.log('\nLos tres juegos tienen implementado lo que declaran, y su material es suyo.');
  process.exit(0);
}
console.log(`${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
for (const f of fallos) console.log(`  ✗ ${f}`);
process.exit(1);
