/**
 * Una noche entera de El Paso de las Sombras.
 *
 *   npm run verify:sombras
 *
 * POR QUÉ HACE FALTA ADEMÁS DE `verify:senda-sombras` Y DEL MAESTRO DE ORO.
 * Aquella demuestra que el rompecabezas es bueno; el maestro de oro, que CLUEDO
 * no ha cambiado. Ninguno de los dos toca la frontera por la que de verdad se
 * cuelan los fallos: **el cable**. La app no llama a funciones, manda JSON, y el
 * cuerpo de una petición es `unknown` para TypeScript. Y hay un fallo que SOLO
 * se ve aquí: que `juegos/instalados.ts` dé de alta los módulos. Si falta esa
 * línea, el servidor arranca perfectamente y la primera partida contesta «esta
 * partida todavía no sabe hacer eso» toda la noche.
 *
 * AISLAMIENTO. El servidor arranca con el directorio de trabajo en una carpeta
 * temporal sin `.env` al lado, y con el entorno enumerado a mano. La lección
 * está en ARCHITECTURE.md y costó cara: en Windows, vaciar una variable de
 * entorno la BORRA, y entonces dotenv carga el fichero de verdad —con la clave
 * de Anthropic y el Atlas de producción dentro—.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * LO QUE ESTA PRUEBA VIGILA Y NINGUNA OTRA PUEDE
 * ────────────────────────────────────────────────────────────────────────────
 *
 *   · **La contraseña de la puerta.** Que una mal escrita se rechace, que NO
 *     gaste la hora, y que la buena entregue el hito. Es la mecánica que
 *     distingue este juego, y vive entera en el reductor: el motor pasa el campo
 *     sin mirarlo.
 *   · **Que las contraseñas no viajen al móvil.** Si viajaran, el juego dejaría
 *     de exigir levantarse del sofá y no daría ningún error.
 *   · **Que los pasos batidos que aún no han pasado no viajen**, salvo el de
 *     esta hora a quien lleva el farol.
 *   · **Que la marca de procedencia no delate al hito falso**: la llevan también
 *     los verdaderos que se publican.
 *   · **Que el consejo pese los votos** y que desenmascarar al kanchō anule el
 *     suyo.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  estadoInicial,
  generarTramaSombras,
  pasoBatido,
  tramaDe,
} from '../src/juegos/sombras-trama';
import {
  darPrenda,
  estadoDe,
  invocarPapel,
  papelesDe,
  pasarEnser,
  proponerSenda,
  quienLleva,
  reconocerPaso,
} from '../src/juegos/sombras-acciones';
import { consejoDe, ejecutarConsejo, resolverConsejo, trofeosDe } from '../src/juegos/sombras-consejo';
import { vistaSombrasDe } from '../src/juegos/sombras-proyeccion';
import { trofeosDelJuego } from '../src/juegos/trofeos';
import { sendasDe } from '../../shared/juegos/sombras-tipos';
import type { Condicion, EstadoSombras, TramaSombras } from '../../shared/juegos/sombras-tipos';
import { manifiestoDe } from '../../shared/juegos';
import type { GameSession } from '../../shared/types';
import type { LiveSession, VistaJugador } from '../../shared/live';

const REPO = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const TSX = path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SERVIDOR = path.join(REPO, 'server', 'src', 'index.ts');
const INSTALADOS = path.join(REPO, 'server', 'src', 'juegos', 'instalados.ts');
/** Puerto al azar: Windows tarda en soltar el del servidor recién matado. */
const PUERTO = 6100 + Math.floor(Math.random() * 400);
const BASE = `http://127.0.0.1:${PUERTO}/api`;

// ---------------------------------------------------------------------------
// Comprobaciones
// ---------------------------------------------------------------------------

let hechas = 0;
const fallos: string[] = [];
const pendientes: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(
    `${que}${detalle === undefined ? '' : `\n      ${JSON.stringify(detalle)?.slice(0, 320)}`}`,
  );
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

// ---------------------------------------------------------------------------
// La partida sembrada
// ---------------------------------------------------------------------------

const GENTE = ['Ana', 'Bruno', 'Carla', 'Dani'];
const PASOS = [
  'El Vado del Kizu',
  'El Collado de Kabuto',
  'El Bosque de Tsuge',
  'El Puerto de Otogi',
  'La Cuesta de Kashiwabara',
  'La Playa de Shirako',
];
const ENSERES = ['El farol de papel', 'La plata de Chaya', 'La lanza de Hanzo'];
const ESTANDARTES = [
  'Las tres malvarrosas',
  'El carro de los Hattori',
  'La tela de Chaya',
  'El pino de los Tarao',
];
const HORAS = 4;
const KANCHO = 'e3';

function nuevaPartida(): { game: GameSession; sesion: LiveSession } {
  const ahora = '2026-06-21T21:00:00.000Z';
  const game: GameSession = {
    id: 'sombras',
    name: 'La casa de la calle Sakai',
    status: 'ready',
    createdAt: ahora,
    updatedAt: ahora,
    /*
     * Las tres categorías con almacén heredado van donde el manifiesto dice, y
     * los estandartes —sin campo heredado— en `entidades`. Si algo de esto
     * estuviera mal, no se encontrarían los estandartes y nadie daría un error.
     */
    suspects: GENTE.map((name, i) => ({ id: `e${i}`, name })),
    rooms: PASOS.map((name, i) => ({ id: `p${i}`, name })),
    weapons: ENSERES.map((name, i) => ({ id: `n${i}`, name })),
    entidades: { estandartes: ESTANDARTES.map((name, i) => ({ id: `b${i}`, name })) },
    boardMode: 'generated',
    settings: { language: 'es', juego: 'sombras' },
  };

  /*
   * SEMILLA FIJA Y KANCHŌ FIJO. La trama reparte el papel al azar, y esta
   * prueba juega siempre con las mismas personas: si el kanchō cambiara de una
   * ejecución a otra, media prueba fallaría una vez de cada cuatro sin que nada
   * estuviera roto. Un comprobador intermitente se acaba ignorando, que es peor
   * que no tenerlo.
   */
  game.plot = generarTramaSombras(game, {
    semilla: 'noche-de-prueba',
    horas: HORAS,
    kancho: KANCHO,
  });

  const sesion: LiveSession = {
    id: game.id,
    juego: 'sombras',
    code: 'SOMBRA',
    phase: 'lobby',
    round: 0,
    totalRounds: HORAS,
    players: GENTE.map((name, i) => ({
      participanteId: `e${i}`,
      displayName: name,
      joinCode: `SOMBR${i}`,
      joined: false,
      elecciones: [],
      notas: '',
      girosRecibidos: [],
    })),
    acusaciones: [],
    tablon: [],
    rev: 1,
    updatedAt: ahora,
  };
  return { game, sesion };
}

const { game, sesion } = nuevaPartida();
const trama = tramaDe(game.plot)!;

function sembrar(dir: string, g: GameSession, s: LiveSession): void {
  fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'data', 'db.json'),
    JSON.stringify(
      { games: [g], messages: {}, config: { model: 'claude-fable-5' }, live: [s], accounts: [] },
      null,
      2,
    ),
    'utf8',
  );
}

// ---------------------------------------------------------------------------
// Cliente HTTP mínimo
// ---------------------------------------------------------------------------

async function pedir(
  ruta: string,
  opciones: { metodo?: string; cuerpo?: unknown; testigo?: string } = {},
): Promise<{ estado: number; datos: any }> {
  const r = await fetch(`${BASE}${ruta}`, {
    method: opciones.metodo ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opciones.testigo ? { Authorization: `Bearer ${opciones.testigo}` } : {}),
    },
    ...(opciones.cuerpo === undefined ? {} : { body: JSON.stringify(opciones.cuerpo) }),
  });
  const texto = await r.text();
  let datos: unknown = texto;
  try {
    datos = JSON.parse(texto);
  } catch {
    /* respuesta no JSON: se deja el texto */
  }
  return { estado: r.status, datos };
}

async function esperarServidor(): Promise<void> {
  for (let i = 0; i < 90; i++) {
    try {
      const r = await fetch(`${BASE}/games`);
      if (r.ok) return;
    } catch {
      /* todavía no escucha */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('el servidor no llegó a arrancar');
}

// ---------------------------------------------------------------------------
// La regla de oro
// ---------------------------------------------------------------------------

/**
 * Las claves que no pueden aparecer NUNCA en el JSON que recibe el móvil.
 *
 * `condicion` NO ESTÁ, y a propósito: `texto` dice exactamente lo mismo en prosa
 * —la generación valida que coincidan— así que esconder la estructura no
 * escondería nada y a cambio dejaría el tablero de deducción de la app sin
 * poder tachar una casilla. Es la misma lección que la Momia aprendió con sus
 * restricciones.
 *
 * Las cuatro que quedan sí son secreto puro: no hay ninguna forma de deducirlas
 * de lo que ya viaja.
 */
const PROHIBIDAS = ['sendaVerdadera', 'contrasenas', 'falso', 'falsasCandidatas', 'batidos'];

/** Lo que una persona puede ver de lo suyo sin que sea una fuga. */
const LEGITIMAS = ['estadoDelJuego.yo.miPropuesta'];

function podar(vista: unknown, rutas: string[]): unknown {
  const copia = JSON.parse(JSON.stringify(vista ?? null));
  for (const ruta of rutas) {
    const partes = ruta.split('.');
    let nodo: any = copia;
    for (let i = 0; i < partes.length - 1 && nodo; i++) nodo = nodo[partes[i]!];
    if (nodo && typeof nodo === 'object') delete nodo[partes[partes.length - 1]!];
  }
  return copia;
}

/**
 * Busca fugas en lo que se le manda a una persona.
 *
 * Mira tres cosas distintas a propósito, porque ninguna basta sola:
 *
 *   · Que no exista ninguna CLAVE prohibida a cualquier profundidad. Cazaría un
 *     `falso: false`, que ya diría de qué fiarse.
 *   · Que la SECUENCIA de la senda verdadera no aparezca serializada, ni como
 *     lista de cadenas ni como lista de objetos con `id`. La segunda forma es la
 *     que se cuela: troceada por los nombres de en medio, como texto no aparece.
 *   · Que ninguna CONTRASEÑA viaje. Es la más fácil de olvidar y la que más
 *     duele: sin ella el juego se puede jugar sentado.
 */
function fugasEn(vistaCruda: unknown, senda: string[], contrasenas: string[]): string[] {
  const encontradas: string[] = [];
  const vista = podar(vistaCruda, LEGITIMAS);

  const recorrer = (nodo: unknown, camino: string): void => {
    if (Array.isArray(nodo)) {
      nodo.forEach((x, i) => recorrer(x, `${camino}[${i}]`));
      return;
    }
    if (!nodo || typeof nodo !== 'object') return;
    for (const [clave, valor] of Object.entries(nodo as Record<string, unknown>)) {
      if (PROHIBIDAS.includes(clave)) encontradas.push(`${camino}.${clave}`);
      recorrer(valor, `${camino}.${clave}`);
    }
  };
  recorrer(vista, 'vista');

  const texto = JSON.stringify(vista);

  // La secuencia, serializada tal cual.
  if (texto.includes(JSON.stringify(senda).slice(1, -1))) {
    encontradas.push('la secuencia de la senda verdadera');
  }

  /*
   * Y LA SECUENCIA EN FORMA DE OBJETOS. Se probó rompiéndolo: haciendo que la
   * proyección mandara los pasos ordenados por la senda verdadera —o sea, la
   * respuesta entera servida como `[{id, nombre}, …]`— la comprobación de arriba
   * decía que no había fuga, porque troceada por los nombres no aparece como
   * texto. De poco sirve un detector que solo caza la fuga escrita de una manera.
   */
  const comoIds = (nodo: unknown): string[] | undefined => {
    if (!Array.isArray(nodo) || nodo.length < senda.length) return undefined;
    const ids = nodo.map((x) =>
      typeof x === 'string' ? x : x && typeof x === 'object' ? (x as any).id : undefined,
    );
    return ids.every((x) => typeof x === 'string') ? (ids as string[]) : undefined;
  };
  const buscarSecuencia = (nodo: unknown): void => {
    const ids = comoIds(nodo);
    if (ids) {
      for (let i = 0; i + senda.length <= ids.length; i++) {
        if (ids.slice(i, i + senda.length).join('|') === senda.join('|')) {
          encontradas.push('la senda verdadera, en forma de lista de objetos');
          break;
        }
      }
    }
    if (Array.isArray(nodo)) nodo.forEach(buscarSecuencia);
    else if (nodo && typeof nodo === 'object') Object.values(nodo).forEach(buscarSecuencia);
  };
  buscarSecuencia(vista);

  // Y las contraseñas. Se buscan como palabra suelta entre comillas para no
  // cazar por accidente un nombre de paso que las contenga.
  for (const palabra of contrasenas) {
    if (new RegExp(`"${palabra}"`, 'i').test(texto)) {
      encontradas.push(`la contraseña «${palabra}»`);
    }
  }

  return encontradas;
}

// ---------------------------------------------------------------------------
// ACTO I · la noche entera, por el cable
// ---------------------------------------------------------------------------

async function jugarPorElCable(): Promise<void> {
  paso('Entran los cuatro de la columna');
  const testigos: Record<string, string> = {};
  for (let i = 0; i < GENTE.length; i++) {
    const r = await pedir('/jugar/entrar', {
      metodo: 'POST',
      cuerpo: { code: 'SOMBRA', joinCode: `SOMBR${i}` },
    });
    comprobar(`${GENTE[i]} entra`, r.estado === 200, r.datos);
    testigos[`e${i}`] = r.datos?.token ?? '';
  }
  comprobar('los cuatro traen testigo', Object.values(testigos).every((t) => t.length > 20));

  const vista = async (id: string): Promise<VistaJugador> => {
    const r = await pedir('/jugar/vista', { testigo: testigos[id] });
    comprobar(`la vista de ${id} responde 200`, r.estado === 200, r.datos);
    return r.datos.vista as VistaJugador;
  };
  const accion = (id: string, nombre: string, datos: Record<string, unknown> = {}) =>
    pedir('/jugar/accion', {
      metodo: 'POST',
      testigo: testigos[id],
      cuerpo: { accion: nombre, datos },
    });

  const palabras = Object.values(trama.contrasenas);

  paso('La sala de espera: el juego se reconoce, y no se filtra nada');
  let v = await vista('e0');
  comprobar('la partida es de El Paso de las Sombras', v.sesion.juego === 'sombras', v.sesion.juego);
  comprobar('el título es el suyo', v.sesion.tituloPartida === 'El Paso de las Sombras');
  comprobar(
    'se señala UNA sola cosa: quién cobra de Akechi',
    v.ejes.length === 1 && v.ejes[0]?.ejeId === 'kancho',
    v.ejes.map((e) => e.ejeId),
  );
  comprobar('y llega el estado propio del juego', Boolean(v.estadoDelJuego), Boolean(v.estadoDelJuego));
  comprobar(
    'las reglas que se leen son las suyas, no las de un asesinato',
    v.caso.reglas.some((r) => r.includes('Iga') || r.includes('kanchō')),
    v.caso.reglas[0],
  );

  paso('LA REGLA DE ORO · ni la senda, ni las contraseñas, ni los cazadores de mañana');
  for (const id of Object.keys(testigos)) {
    const suya = await vista(id);
    const fugas = fugasEn(suya, trama.sendaVerdadera, palabras);
    comprobar(
      `nada se le filtra a ${id}${id === KANCHO ? ' (el kanchō)' : ''}`,
      fugas.length === 0,
      fugas,
    );
  }
  const deOtro = await vista('e0');
  comprobar(
    'y a quien no es el kanchō no le llega ni la palabra «falsear»',
    !JSON.stringify(deOtro).includes('falsear') && !JSON.stringify(deOtro).includes('mentiras'),
  );
  const delKancho = await vista(KANCHO);
  const mentiras = (delKancho.estadoDelJuego as { mentiras?: { disponibles: number } }).mentiras;
  comprobar(
    'al kanchō SÍ le llegan sus mentiras, o el papel sería injugable',
    Boolean(mentiras) && mentiras!.disponibles > 0,
    mentiras,
  );

  paso('Quien dirige abre la primera hora');
  const abrir = await pedir(`/games/${game.id}/live/ronda/abrir`, {
    metodo: 'POST',
    cuerpo: { minutos: 20 },
  });
  comprobar('la hora se abre', abrir.estado === 200, abrir.datos);

  paso('LA CONTRASEÑA · sin ir a la puerta no hay hito');
  const pasoElegido = 'p0';
  const buena = trama.contrasenas[pasoElegido]!;
  const mala = await accion('e0', 'avanzar', { paso: pasoElegido, contrasena: 'NOESESA' });
  comprobar('una palabra equivocada se rechaza', mala.estado === 409, mala.datos);
  comprobar(
    'y el mensaje manda a mirar la puerta, no a otra parte',
    String(mala.datos?.error ?? '').toLowerCase().includes('puerta'),
    mala.datos?.error,
  );
  const vacia = await accion('e0', 'avanzar', { paso: pasoElegido });
  comprobar('sin palabra tampoco se pasa', vacia.estado === 409, vacia.datos);

  /*
   * LO QUE DE VERDAD IMPORTA DE LOS DOS RECHAZOS DE ARRIBA: que no hayan gastado
   * la hora. Si el motor apuntara la acción antes de que el reductor decidiera,
   * equivocarse de palabra costaría la noche entera, y eso convertiría la
   * mecánica en un castigo por tener mala vista a oscuras.
   */
  const buenaTras = await accion('e0', 'avanzar', { paso: pasoElegido, contrasena: buena });
  comprobar(
    'una palabra equivocada NO gasta la hora: a la tercera se entra',
    buenaTras.estado === 200,
    buenaTras.datos,
  );
  comprobar(
    'y se sale con al menos un hito',
    Array.isArray(buenaTras.datos?.resultado?.hitos) && buenaTras.datos.resultado.hitos.length > 0,
    buenaTras.datos?.resultado,
  );
  comprobar(
    'la palabra vale escrita de cualquier manera',
    (await accion('e1', 'avanzar', { paso: pasoElegido, contrasena: `  ${buena.toLowerCase()} ` }))
      .estado === 200,
  );

  paso('Dos personas en el mismo paso sacan EL MISMO hito');
  const de0 = (await vista('e0')).estadoDelJuego as any;
  const de1 = (await vista('e1')).estadoDelJuego as any;
  const hitos0 = new Set((de0.yo.hitos ?? []).map((h: any) => h.id));
  const hitos1 = new Set((de1.yo.hitos ?? []).map((h: any) => h.id));
  comprobar(
    'coincidir en un paso da la misma información: eso es lo que permite desmentir',
    [...hitos1].every((id) => hitos0.has(id as string)) && hitos1.size > 0,
    { hitos0: [...hitos0], hitos1: [...hitos1] },
  );
  comprobar(
    'y los encuentros lo dicen en público',
    (de0.encuentros ?? []).some(
      (h: any) =>
        h.ronda === 1 &&
        h.pasos.some((p: any) => p.pasoId === pasoElegido && p.quienes.includes('e1')),
    ),
    de0.encuentros,
  );

  paso('El rastro y los cazadores');
  const batido1 = pasoBatido(trama.batidos, 1)!;
  const otroPaso = PASOS.map((_, i) => `p${i}`).find((p) => p !== batido1 && p !== pasoElegido)!;
  const antes = ((await vista('e2')).estadoDelJuego as any).hora.rastro as number;
  const entraEnBatido = await accion('e2', 'avanzar', {
    paso: batido1,
    contrasena: trama.contrasenas[batido1],
  });
  comprobar('se puede entrar donde están los cazadores', entraEnBatido.estado === 200, entraEnBatido.datos);
  comprobar('quien entra lo sabe: los ha visto', entraEnBatido.datos?.resultado?.batido === true);
  const despues = ((await vista('e2')).estadoDelJuego as any).hora.rastro as number;
  comprobar('y el rastro de la columna sube', despues > antes, { antes, despues });

  comprobar(
    'el paso batido de esta hora NO se sabe todavía en la mesa',
    !(((await vista('e0')).estadoDelJuego as any).hora.batidosRevelados ?? []).some(
      (b: any) => b.ronda === 1,
    ),
  );

  paso('El farol: quien lo lleva ve dónde esperan, y solo él');
  const conFarol = Object.entries(trama.cargaInicial).find(
    ([enser]) => trama.portes[enser] === 'farol',
  )?.[1];
  comprobar('alguien lleva el farol', Boolean(conFarol), trama.cargaInicial);
  if (conFarol) {
    const suya = (await vista(conFarol)).estadoDelJuego as any;
    comprobar(
      'quien lleva el farol ve el paso batido de esta hora',
      suya.hora.batidoQueVes?.pasoId === batido1,
      suya.hora.batidoQueVes,
    );
    const sinFarol = Object.keys(testigos).find((id) => id !== conFarol)!;
    const otra = (await vista(sinFarol)).estadoDelJuego as any;
    comprobar('y quien no lo lleva, no', otra.hora.batidoQueVes === undefined, otra.hora.batidoQueVes);
  }

  paso('Las prendas');
  const prendaOk = await accion('e0', 'avalar', { aQuien: 'e1' });
  comprobar('se da una prenda a otra persona', prendaOk.estado === 200, prendaOk.datos);
  const prendaAMi = await accion('e0', 'avalar', { aQuien: 'e0' });
  comprobar('no se puede avalar a uno mismo', prendaAMi.estado === 409, prendaAMi.datos);
  await accion('e2', 'avalar', { aQuien: 'e1' });
  const tercera = await accion('e3', 'avalar', { aQuien: 'e1' });
  comprobar(
    'nadie puede tener más de dos prendas: la tercera se rechaza',
    tercera.estado === 409,
    tercera.datos,
  );

  paso('La carga se pasa de mano');
  const quienLlevaAlgo = Object.entries(trama.cargaInicial)[0]!;
  const [enserId, portador] = quienLlevaAlgo;
  const otroId = Object.keys(testigos).find((id) => id !== portador)!;
  const pase = await accion(portador, 'entregar', { enser: enserId, aQuien: otroId });
  comprobar('se le pasa un enser a otra persona', pase.estado === 200, pase.datos);
  const paseAjeno = await accion(portador, 'entregar', { enser: enserId, aQuien: otroId });
  comprobar('y no se puede pasar lo que ya no llevas', paseAjeno.estado === 409, paseAjeno.datos);

  paso('El disfraz, con sus campos libres');
  const usa = await accion('e0', 'invocar', {});
  comprobar('el disfraz se usa por el cable', usa.estado === 200, usa.datos);
  const repite = await accion('e0', 'invocar', {});
  comprobar('y solo una vez por hora', repite.estado === 409, repite.datos);

  paso('La senda se propone por el cable (lista ordenada de cuatro)');
  const propuesta = ['p1', 'p2', 'p3', 'p4'];
  const prop = await accion('e0', 'proponer-senda', { senda: propuesta });
  comprobar(
    'una lista ordenada llega entera al reductor',
    prop.estado === 200,
    prop.datos,
  );
  const propCorta = await accion('e1', 'proponer-senda', { senda: ['p1', 'p2'] });
  comprobar('una senda corta se rechaza en el motor', propCorta.estado === 409, propCorta.datos);
  const propRepe = await accion('e1', 'proponer-senda', { senda: ['p1', 'p1', 'p2', 'p3'] });
  comprobar('y una con un paso repetido, también', propRepe.estado === 409, propRepe.datos);
  const miPropuesta = ((await vista('e0')).estadoDelJuego as any).yo.miPropuesta;
  comprobar('la propuesta vuelve en tu propia vista', Array.isArray(miPropuesta) && miPropuesta.length === 4, miPropuesta);
  comprobar(
    'que alguien ha propuesto es público; QUÉ ha propuesto, no',
    ((await vista('e1')).estadoDelJuego as any).mesa.some((m: any) => m.participanteId === 'e0' && m.haPropuesto) &&
      !JSON.stringify(((await vista('e1')).estadoDelJuego as any).mesa).includes('"senda"'),
  );

  paso('Se cierra la hora y se revela dónde estaban los cazadores');
  const cerrar = await pedir(`/games/${game.id}/live/ronda/cerrar`, { metodo: 'POST' });
  comprobar('la hora se cierra', cerrar.estado === 200, cerrar.datos);
  const trasCierre = (await vista('e0')).estadoDelJuego as any;
  comprobar(
    'ahora sí se sabe qué paso estaba batido',
    (trasCierre.hora.batidosRevelados ?? []).some((b: any) => b.ronda === 1 && b.pasoId === batido1),
    trasCierre.hora.batidosRevelados,
  );
  comprobar(
    'y se ve quién pisó allí, que es lo que hace comprobable lo que se dijo',
    (trasCierre.mesa ?? []).some((m: any) => m.participanteId === 'e2' && m.pisadasVistas === 1),
    trasCierre.mesa,
  );
  comprobar(
    'pero el de la hora que viene sigue sin viajar',
    fugasEn(await vista('e0'), trama.sendaVerdadera, palabras).length === 0,
  );

  paso('Segunda hora: el kanchō miente, y la mentira lleva sitio y hora');
  await pedir(`/games/${game.id}/live/ronda/abrir`, { metodo: 'POST', cuerpo: { minutos: 20 } });
  const suPaso = PASOS.map((_, i) => `p${i}`).find((p) => p !== pasoBatido(trama.batidos, 2))!;
  await accion(KANCHO, 'avanzar', { paso: suPaso, contrasena: trama.contrasenas[suPaso] });
  const miente = await accion(KANCHO, 'invocar', { papel: 'falsear' });
  comprobar('el kanchō publica un hito falso', miente.estado === 200, miente.datos);

  const publicoTrasMentira = ((await vista('e0')).estadoDelJuego as any).camino as any[];
  comprobar('la mentira está sobre la mesa', publicoTrasMentira.length > 0, publicoTrasMentira.length);
  comprobar(
    'con el sitio y la hora donde dice haberse leído',
    publicoTrasMentira.some((h) => h.halladoEn?.pasoId === suPaso && h.halladoEn?.ronda === 2),
    publicoTrasMentira.map((h) => h.halladoEn),
  );
  comprobar(
    'y sin decir que es falsa: el campo ni siquiera existe',
    publicoTrasMentira.every((h) => !('falso' in h)),
    publicoTrasMentira,
  );

  paso('Y la marca de procedencia NO delata al falso');
  /*
   * ES LA COMPROBACIÓN MÁS SUTIL DE ESTE FICHERO. El hito falso lleva pegado un
   * sitio y una hora, y eso es lo mejor del juego. Pero si SOLO lo llevara él,
   * bastaría con mirar cuál de los públicos dice dónde apareció para saber cuál
   * es mentira. Aquí se publica uno CIERTO y se exige que también la lleve.
   */
  const quienPublica = Object.keys(testigos).find(
    (id) => papelesDe(game, estadoDe(game, sesion), id).includes('referir') && id !== KANCHO,
  );
  if (quienPublica) {
    /*
     * PRIMERO TIENE QUE TENER ALGO QUE CONTAR. Sin este paso, la comprobación se
     * saltaba sola con «no tienes ningún mojón sin contar» y quedaba anotada como
     * pendiente — o sea, la comprobación más sutil del fichero no se ejecutaba y
     * la suite seguía en verde. Un pendiente que se repite siempre es un fallo
     * disfrazado.
     */
    const suPaso2 = PASOS.map((_, i) => `p${i}`).find((p) => p !== pasoBatido(trama.batidos, 2))!;
    await accion(quienPublica, 'avanzar', { paso: suPaso2, contrasena: trama.contrasenas[suPaso2] });
    const antesDeReferir = ((await vista('e0')).estadoDelJuego as any).camino.length;
    const refiere = await accion(quienPublica, 'invocar', { papel: 'referir' });
    if (refiere.estado === 200) {
      const camino = ((await vista('e0')).estadoDelJuego as any).camino as any[];
      comprobar('un hito cierto también se puede poner sobre la mesa', camino.length > antesDeReferir);
      comprobar(
        'y también lleva su procedencia: la marca no distingue al falso',
        camino.every((h) => h.halladoEn !== undefined),
        camino.map((h) => ({ id: h.id, halladoEn: h.halladoEn })),
      );
    } else {
      pendientes.push(
        `no se pudo publicar un hito cierto en esta semilla (${String(refiere.datos?.error)}): la comprobación de la marca se queda a medias`,
      );
    }
  } else {
    pendientes.push('en esta semilla nadie tiene el papel «referir»: la marca no se ha podido contrastar');
  }

  paso('Se señala al kanchō');
  for (const id of ['e0', 'e1', 'e2']) {
    const r = await accion(id, 'senalar', { kancho: KANCHO });
    comprobar(`${id} señala`, r.estado === 200, r.datos);
  }
  const dosVeces = await accion('e0', 'senalar', { kancho: 'e1' });
  comprobar('no se puede señalar dos veces', dosVeces.estado === 409, dosVeces.datos);
  comprobar(
    'y no se dice si has acertado',
    !JSON.stringify(dosVeces.datos ?? {}).includes('correcta'),
  );

  paso('El consejo del alba, con las rutas que ya existen');
  await pedir(`/games/${game.id}/live/ronda/cerrar`, { metodo: 'POST' });
  const consejo = await pedir(`/games/${game.id}/live/acusaciones`, { metodo: 'POST' });
  comprobar(
    'el consejo se abre por la ruta de siempre: este juego NO añade fases',
    consejo.estado === 200,
    consejo.datos,
  );
  comprobar(
    'y la mesa lee el aviso de ESTE juego, no el de otro',
    manifiestoDe('sombras').avisos?.acusaciones?.includes('consejo del alba') === true,
    manifiestoDe('sombras').avisos?.acusaciones,
  );

  const echarAAndar = await pedir(`/games/${game.id}/live/cierre`, { metodo: 'POST' });
  comprobar('se echa a andar por la ruta genérica de cierre', echarAAndar.estado === 200, echarAAndar.datos);

  paso('El desenlace');
  const desenlace = await pedir(`/games/${game.id}/live/desenlace`, { metodo: 'POST' });
  comprobar('el desenlace se revela', desenlace.estado === 200, desenlace.datos);
  const final = (await vista('e0')).estadoDelJuego as any;
  comprobar('y AHORA sí sale la senda verdadera', Array.isArray(final.desenlace?.sendaVerdadera), final.desenlace);
  comprobar(
    'con el bando que gana, que no es una persona',
    final.desenlace?.gana === 'columna' || final.desenlace?.gana === 'kancho',
    final.desenlace?.gana,
  );
  comprobar(
    'y ahora sí se dice qué hitos eran mentira',
    (final.camino ?? []).some((h: any) => 'falso' in h),
    final.camino,
  );
}

// ---------------------------------------------------------------------------
// ACTO II · el consejo, en el mismo proceso
// ---------------------------------------------------------------------------

/**
 * Lo que no se puede ejercer por el cable en una sola noche.
 *
 * Aquí se prueban las reglas del consejo —el peso de las prendas, la anulación
 * del kanchō desenmascarado, la intercepción por rastro— construyendo estados a
 * mano. Por el cable haría falta jugar cuatro noches distintas para llegar a los
 * cuatro finales, y una prueba que tarda ocho minutos no la corre nadie.
 */
function jugarElConsejo(): void {
  paso('ACTO II · el consejo, con los votos pesados');

  const nueva = nuevaPartida();
  const g = nueva.game;
  const s = nueva.sesion;
  const t = tramaDe(g.plot)!;
  s.phase = 'ronda-abierta';
  s.round = 1;
  const estado = estadoDe(g, s);

  // --- Las prendas pesan ---
  proponerSenda(g, s, 'e0', t.sendaVerdadera);
  proponerSenda(g, s, 'e1', ['p5', 'p4', 'p3', 'p2']);
  proponerSenda(g, s, 'e2', ['p5', 'p4', 'p3', 'p2']);
  let r = resolverConsejo(estado, KANCHO, ['e0', 'e1', 'e2', 'e3'], { aciertos: 0, total: 0 }, 'z');
  comprobar('dos votos de uno ganan a uno de uno', r.sendaAndada.join('|') === 'p5|p4|p3|p2', r.votos);

  darPrenda(g, s, 'e3', 'e0');
  darPrenda(g, s, 'e1', 'e0');
  r = resolverConsejo(estado, KANCHO, ['e0', 'e1', 'e2', 'e3'], { aciertos: 0, total: 0 }, 'z');
  comprobar(
    'con dos prendas, una sola persona vale tres y da la vuelta al consejo',
    r.sendaAndada.join('|') === t.sendaVerdadera.join('|'),
    r.votos.map((v) => ({ senda: v.senda, peso: v.peso })),
  );
  comprobar('y entonces la senda andada es la buena', r.correcta === true);
  comprobar('gana la columna entera menos el kanchō', r.gana === 'columna' && !r.ganadores.includes(KANCHO), r.ganadores);

  // --- Desenmascararlo le quita la mano del timón ---
  const nueva2 = nuevaPartida();
  const g2 = nueva2.game;
  const s2 = nueva2.sesion;
  const t2 = tramaDe(g2.plot)!;
  s2.phase = 'ronda-abierta';
  s2.round = 1;
  const estado2 = estadoDe(g2, s2);
  proponerSenda(g2, s2, KANCHO, ['p5', 'p4', 'p3', 'p2']);
  proponerSenda(g2, s2, 'e0', t2.sendaVerdadera);
  darPrenda(g2, s2, 'e1', KANCHO);
  darPrenda(g2, s2, 'e2', KANCHO);

  const sinDesenmascarar = resolverConsejo(
    estado2, KANCHO, ['e0', 'e1', 'e2', 'e3'], { aciertos: 0, total: 3 }, 'z',
  );
  comprobar(
    'un kanchō con dos prendas se lleva el consejo si nadie lo ve',
    sinDesenmascarar.sendaAndada.join('|') === 'p5|p4|p3|p2',
    sinDesenmascarar.votos.map((v) => ({ senda: v.senda, peso: v.peso })),
  );
  const desenmascarado = resolverConsejo(
    estado2, KANCHO, ['e0', 'e1', 'e2', 'e3'], { aciertos: 2, total: 3 }, 'z',
  );
  comprobar(
    'y si la mayoría lo señala, su voto pasa a valer cero',
    desenmascarado.desenmascarado && desenmascarado.sendaAndada.join('|') === t2.sendaVerdadera.join('|'),
    desenmascarado.votos.map((v) => ({ senda: v.senda, peso: v.peso })),
  );
  comprobar(
    'la mayoría es ESTRICTA sobre los señalamientos entregados',
    resolverConsejo(estado2, KANCHO, ['e0'], { aciertos: 2, total: 4 }, 'z').desenmascarado === false,
  );

  // --- La intercepción manda sobre todo ---
  estado2.rastro = estado2.rastroMaximo;
  const interceptada = resolverConsejo(
    estado2, KANCHO, ['e0', 'e1', 'e2', 'e3'], { aciertos: 2, total: 3 }, 'z',
  );
  comprobar(
    'con el rastro al tope no se embarca aunque la senda sea la buena',
    interceptada.correcta === true && interceptada.interceptada === true && interceptada.gana === 'kancho',
    { correcta: interceptada.correcta, gana: interceptada.gana },
  );

  // --- Sin propuestas, no se anda ---
  const nueva3 = nuevaPartida();
  const estado3 = estadoDe(nueva3.game, { ...nueva3.sesion, phase: 'ronda-abierta', round: 1 });
  const vacio = resolverConsejo(estado3, KANCHO, ['e0', 'e1'], { aciertos: 0, total: 0 }, 'z');
  comprobar('sin ninguna propuesta no se anda nada y gana el kanchō', vacio.sendaAndada.length === 0 && vacio.gana === 'kancho');

  paso('Los trofeos');
  const nueva4 = nuevaPartida();
  const g4 = nueva4.game;
  const s4 = { ...nueva4.sesion, phase: 'ronda-abierta' as const, round: 1 };
  const t4 = tramaDe(g4.plot)!;
  const e4 = estadoDe(g4, s4);
  proponerSenda(g4, s4, 'e0', t4.sendaVerdadera);
  darPrenda(g4, s4, 'e1', 'e0');
  darPrenda(g4, s4, 'e1', 'e2');
  s4.acusaciones = [
    { participanteId: 'e0', respuestas: { kancho: KANCHO }, at: 'z', correcta: true },
  ];
  const res4 = ejecutarConsejo(g4, s4);
  const trofeos = trofeosDe(g4, s4, res4);
  comprobar('«El que abrió el paso» a quien propuso la senda buena', trofeos.e0?.includes('paso-abierto') === true, trofeos.e0);
  comprobar('«El ojo de Hanzō» a quien señaló bien', trofeos.e0?.includes('ojo-de-hanzo') === true, trofeos.e0);
  comprobar('«Palabra dada» a quien dio sus dos prendas', trofeos.e1?.includes('palabra-dada') === true, trofeos.e1);
  comprobar('«Sin rastro» a quien no pisó donde no debía', trofeos.e0?.includes('sin-rastro') === true, trofeos.e0);
  comprobar(
    'y «La sombra de Akechi» solo si el kanchō gana',
    (trofeos[KANCHO] ?? []).includes('sombra-de-akechi') === (res4.gana === 'kancho'),
    { trofeo: trofeos[KANCHO], gana: res4.gana },
  );
  comprobar(
    'y la plataforma los pide por el gancho del juego, no a mano',
    trofeosDelJuego('sombras', {
      game: g4,
      sesion: s4,
      plot: g4.plot!,
      jugador: s4.players[0]!,
      eraSenalado: false,
      gano: false,
      acerto: true,
    }).includes('paso-abierto'),
  );

  paso('La proyección, mirada de cerca');
  const suya = vistaSombrasDe(g4, s4, 'e0');
  comprobar('la vista se compone', Boolean(suya), Boolean(suya));
  /*
   * SE ENVUELVE COMO LA MANDA EL SERVIDOR, y no es un detalle del test: las rutas
   * legítimas de `fugasEn` están escritas sobre la vista del jugador
   * (`estadoDelJuego.yo.miPropuesta`), porque es la forma que llega al móvil.
   * Pasando el estado desnudo, la poda no encontraba nada que podar y la
   * propuesta de e0 —que en esta prueba es justamente la senda buena— se
   * denunciaba como fuga. El detector estaba bien; la llamada, mal.
   */
  const comoLaRecibeElMovil = { estadoDelJuego: suya };
  const fugas4 = fugasEn(comoLaRecibeElMovil, t4.sendaVerdadera, Object.values(t4.contrasenas));
  comprobar('y no lleva ni la senda ni ninguna contraseña', fugas4.length === 0, fugas4);
  comprobar(
    'tu propia propuesta SÍ vuelve: no se puede cambiar, así que hay que poder consultarla',
    JSON.stringify(suya?.yo.miPropuesta) === JSON.stringify(t4.sendaVerdadera),
    suya?.yo.miPropuesta,
  );

  paso('El disfraz que no puede juntar el camino entero');
  const nueva5 = nuevaPartida();
  const g5 = nueva5.game;
  const s5 = { ...nueva5.sesion, phase: 'ronda-abierta' as const, round: 1 };
  const t5 = tramaDe(g5.plot)!;
  const e5 = estadoDe(g5, s5);
  // Se le da a e0 todo el camino menos uno y se le deja rastrear.
  e5.gente.e0!.papel = 'rastrear';
  e5.gente.e0!.hitos = t5.condiciones.slice(0, -1).map((c) => c.id);
  let seNego = false;
  try {
    invocarPapel(g5, s5, 'e0', { papel: 'rastrear' });
  } catch {
    seNego = true;
  }
  comprobar(
    'el yamabushi NUNCA entrega el último que falta: nadie resuelve en solitario',
    seNego,
  );

  paso('El komusō puede llegar tarde');
  const nueva6 = nuevaPartida();
  const g6 = nueva6.game;
  const s6 = { ...nueva6.sesion, phase: 'ronda-abierta' as const, round: 1 };
  const t6 = tramaDe(g6.plot)!;
  const e6 = estadoDe(g6, s6);
  // Nadie lleva la plata ni la lanza, para aislar el efecto del amparo.
  for (const p of Object.values(e6.gente)) p.enseres = [];
  e6.gente.e1!.papel = 'amparar';
  const batido = pasoBatido(t6.batidos, 1)!;
  reconocerPaso(g6, s6, 'e0', batido, t6.contrasenas[batido]!);
  const rastroTrasPisar = e6.rastro;
  invocarPapel(g6, s6, 'e1', { papel: 'amparar', aQuien: 'e0' });
  comprobar(
    'amparar a quien ya pisó devuelve el rastro que costó',
    rastroTrasPisar === 1 && e6.rastro === 0,
    { rastroTrasPisar, ahora: e6.rastro },
  );

  paso('El rompecabezas es de verdad: no se resuelve con lo de uno solo');
  const porPersona: Record<string, Condicion[]> = {};
  const nueva7 = nuevaPartida();
  const t7 = tramaDe(nueva7.game.plot)!;
  const pasosIds = PASOS.map((_, i) => `p${i}`);
  comprobar(
    'todo el conjunto determina una sola senda',
    sendasDe(pasosIds, t7.condiciones.map((c) => c.condicion)).length === 1,
  );
  // Lo máximo que junta una persona: cuatro horas, un paso por hora.
  const porHora: string[][] = [];
  for (let ronda = 1; ronda <= HORAS; ronda++) {
    porHora.push(
      pasosIds.map((p) =>
        t7.hallazgos.filter((h) => h.ronda === ronda && h.pasoId === p).map((h) => h.hitoId).join(''),
      ),
    );
  }
  let peor = 0;
  const recorrer = (i: number, llevados: Set<string>): void => {
    if (i === porHora.length) {
      const suyas = t7.condiciones.filter((c) => llevados.has(c.id)).map((c) => c.condicion);
      peor = Math.max(peor, sendasDe(pasosIds, suyas).length === 1 ? 1 : 0);
      return;
    }
    for (const id of porHora[i]!) recorrer(i + 1, new Set([...llevados, id]));
  };
  recorrer(0, new Set());
  comprobar(
    'y NINGÚN camino de exploración deja a una sola persona con la senda entera',
    peor === 0,
  );
  void porPersona;
}

// ---------------------------------------------------------------------------

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sombras-'));
sembrar(dir, game, sesion);
let servidor: ChildProcess | undefined;

try {
  /*
   * QUE EL ALTA SIGA EN SU SITIO, y se comprueba leyendo el fichero antes de
   * arrancar nada. Parece redundante —si faltara, la noche de abajo se caería
   * entera— y no lo es: el día que se caiga, el mensaje será «esta partida
   * todavía no sabe hacer eso» repetido treinta veces, y nadie sabrá que lo que
   * falta es una línea de import. Esto lo dice en un renglón.
   */
  const instalados = fs.readFileSync(INSTALADOS, 'utf8');
  for (const modulo of ['sombras-acciones', 'sombras-proyeccion', 'sombras-consejo', 'sombras-trama']) {
    comprobar(`juegos/instalados.ts da de alta \`${modulo}\``, instalados.includes(modulo));
  }

  servidor = spawn(process.execPath, [TSX, SERVIDOR], {
    cwd: dir,
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      PORT: String(PUERTO),
      NODE_ENV: 'test',
    },
    stdio: 'ignore',
  });

  await esperarServidor();
  await jugarPorElCable();
  jugarElConsejo();
} catch (e) {
  fallos.push(`la prueba se cayó: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
} finally {
  servidor?.kill();
  await new Promise((r) => setTimeout(r, 600));
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    console.log(`  (queda por limpiar ${dir})`);
  }
}

console.log(`\nEl Paso de las Sombras · una noche entera`);
console.log(`${hechas} comprobaciones`);
if (pendientes.length > 0) {
  console.log(`\n${pendientes.length} cosas que no se han podido comprobar en esta semilla:\n`);
  for (const p of pendientes) console.log(`  ⚠ ${p}`);
}
if (fallos.length === 0) {
  console.log('\nLa noche funciona de punta a punta, y ni la senda ni las contraseñas viajan.');
  process.exit(0);
}
console.log(`\n${fallos.length} FALLOS:\n`);
for (const f of fallos) console.log(`  ✗ ${f}`);
process.exit(1);
