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
import { generateDemoPlot } from '../src/plot/demoPlot';
import { generateBoardLayout } from '../src/board/generator';
import { iniciarJuego } from '../src/juegos/inicios';
import { abrirRonda } from '../src/live/sesion';
import { renderPlayerDocument } from '../src/docs/renderer';
import { renderPrintableDocument } from '../src/docs/imprimibles';
import { printableDocsFor } from '../../shared/documents';
import { juegosInstalados, manifiestoDe } from '../../shared/juegos';
import { FASES_EN_JUEGO } from '../../shared/live';
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
    if (cat.almacen) (game as unknown as Record<string, unknown>)[cat.almacen] = lista;
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
      suspectId: s.id,
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
  for (const destinos of Object.values(m.fases)) for (const d of destinos) alcanzables.add(d);
  const sinRuta = [...alcanzables].filter((f) => {
    const re = RUTA_DE_FASE[f];
    return re ? !re.test(rutasLive) : false;
  });
  comprobar(
    `${m.id}: toda fase alcanzable tiene ruta POST`,
    sinRuta.length === 0,
    { sinRuta, consecuencia: 'el taller pinta el boton y da 404 delante de la mesa' },
  );

  // ---- 3. Se puede terminar la partida ----
  const puedeAcabar = Object.entries(m.fases).some(
    ([desde, a]) => (FASES_EN_JUEGO as readonly LivePhase[]).includes(desde as LivePhase) && a.includes('desenlace'),
  );
  comprobar(`${m.id}: hay camino a «desenlace» desde una fase en juego`, puedeAcabar);

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

  // ---- 6. Reglas y avisos propios ----
  comprobar(
    `${m.id}: trae sus propias reglas`,
    Array.isArray(m.reglas) && m.reglas.length > 0,
    'sin ellas los tres consumidores caen en las de CLUEDO: «Alguien de esta casa es un asesino»',
  );
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
  }
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
