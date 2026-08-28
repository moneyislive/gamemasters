/**
 * Las puertas por las que entra la mesa.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUÉ EXISTE, Y ES INCÓMODO
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `verify:momia` tenía 209 comprobaciones en verde y `verify:momia-trama` otras
 * 95, y entre las dos no cazaron que en una velada de verdad NO SE PODÍA
 * SEÑALAR AL SAQUEADOR ni cerrar la noche. La razón es de manual:
 *
 *  · Probaban `senalar` llamando a `ejecutarAccion(...)` o a `POST
 *    /jugar/accion`. La app no usa ninguna de las dos para eso: usa
 *    `POST /jugar/acusar`, que despachaba el id `'acusar'` escrito a mano y en
 *    la Momia no existe. Respuesta: 409 para todo el mundo y toda la noche.
 *  · Llamaban a `ejecutarSellado(...)` a mano. Ninguna ruta lo hacía: el botón
 *    del taller pegaba contra una URL que no existía y devolvía 404 en
 *    silencio.
 *
 * O sea: el motor estaba probado por dentro y las puertas no estaban abiertas.
 * Esto comprueba LO CONTRARIO — que cada cosa que la mesa toca de verdad llega
 * a donde tiene que llegar, entrando por donde entra la app y el taller.
 *
 * NO SUSTITUYE A LAS OTRAS, LAS COMPLETA. Aquellas prueban que las reglas del
 * juego son correctas; esta, que se puede jugar.
 *
 * AISLAMIENTO. El servidor arranca con el directorio de trabajo en una carpeta
 * temporal sin `.env` al lado, y con el entorno enumerado a mano: es lo que
 * impide que se cargue la clave de Anthropic o el Atlas de producción.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generarTramaMomia, estadoInicial, tramaDe } from '../src/juegos/momia-trama';
import { generateBoardLayout } from '../src/board/generator';
import { generateDemoPlot } from '../src/plot/demoPlot';
import { armarPaquete } from '../src/docs/paquete';
import { juegosConMaterial } from '../src/juegos/materiales';
import { juegosConAmpliacion } from '../src/juegos/ampliaciones';
import { entidadesDeLaMomia, ensamblarTramaMomia } from '../src/plot/momia-generacion';
import { cimientosDeMomia } from '../src/plot/momia-cimientos';
import { respuestaDeDemostracion } from '../src/plot/momia-demo';
import { ampliarExpedicion } from '../src/juegos/momia-trama';
import '../src/plot/refresh';
import '../src/plot/material';
import { manifiestoDe, accionDeAcusacion, accionDeEntrarEnLugar } from '../../shared/juegos';
import type { GameSession } from '../../shared/types';
import type { LiveSession } from '../../shared/live';
import type { EstadoMomia } from '../../shared/juegos/momia-tipos';

const REPO = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const TSX = path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SERVIDOR = path.join(REPO, 'server', 'src', 'index.ts');
const PUERTO = 5800 + Math.floor(Math.random() * 400);
const BASE = `http://127.0.0.1:${PUERTO}/api`;

const fallos: string[] = [];
let hechas = 0;

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

function comprobar(que: string, cierto: boolean, detalle?: unknown): void {
  hechas += 1;
  if (cierto) {
    console.log(`  ✔ ${que}`);
    return;
  }
  console.log(`  ✘ ${que}`);
  if (detalle !== undefined) console.log(`     ${JSON.stringify(detalle).slice(0, 300)}`);
  fallos.push(que);
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
    /* respuesta no JSON */
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
// La mesa
// ---------------------------------------------------------------------------

const NOMBRES = ['Ana', 'Bruno', 'Carla', 'Dani'];
const ahora = new Date().toISOString();

function partidaDeMomia(
  fase: 'ronda-abierta' | 'sellado',
  id = 'expedicion',
  code = 'PUERTA',
  clave = 'PUER',
): {
  game: GameSession;
  sesion: LiveSession;
} {
  const game = {
    id,
    name: 'La tumba de Nebkaura',
    status: 'ready',
    createdAt: ahora,
    updatedAt: ahora,
    suspects: NOMBRES.map((name, i) => ({ id: `e${i}`, name })),
    rooms: ['Antesala', 'Camara del Barquero', 'Pozo', 'Corredor', 'Balanza'].map((name, i) => ({
      id: `c${i}`,
      name,
    })),
    weapons: ['Escarabeo', 'Mascara', 'Daga'].map((name, i) => ({ id: `r${i}`, name })),
    entidades: {
      ritos: ['Agua', 'Aliento', 'Nombre', 'Balanza', 'Silencio'].map((name, i) => ({
        id: `t${i}`,
        name: `Rito del ${name}`,
      })),
    },
    boardMode: 'generated',
    settings: { language: 'es', juego: 'momia' },
  } as unknown as GameSession;

  game.board = generateBoardLayout(game.rooms, manifiestoDe('momia').rotuloCentralDelPlano);
  game.plot = generarTramaMomia(game, { semilla: 'puertas', vigilias: 3, saqueador: 'e3' });
  const estado: EstadoMomia = estadoInicial(
    tramaDe(game.plot)!,
    game.suspects.map((s) => s.id),
  );

  const sesion = {
    id: game.id,
    juego: 'momia',
    code,
    phase: fase,
    round: 1,
    totalRounds: 3,
    roundEndsAt: new Date(Date.now() + 3600_000).toISOString(),
    players: game.suspects.map((s, i) => ({
      suspectId: s.id,
      displayName: s.name,
      joinCode: `${clave}${i}A`,
      joined: true,
      elecciones: [],
      notas: '',
      girosRecibidos: [],
    })),
    acusaciones: [],
    tablon: [],
    estado: { momia: estado },
    rev: 3,
    updatedAt: ahora,
  } as unknown as LiveSession;

  return { game, sesion };
}

function partidaDeCluedo(): { game: GameSession; sesion: LiveSession } {
  const game = {
    id: 'mansion',
    name: 'La casa del acantilado',
    status: 'ready',
    createdAt: ahora,
    updatedAt: ahora,
    suspects: NOMBRES.map((name, i) => ({ id: `s${i}`, name })),
    rooms: ['Biblioteca', 'Cocina', 'Salon', 'Jardin'].map((name, i) => ({ id: `h${i}`, name })),
    weapons: ['Candelabro', 'Cuerda', 'Llave'].map((name, i) => ({ id: `w${i}`, name })),
    boardMode: 'generated',
    settings: { language: 'es' },
  } as unknown as GameSession;

  game.board = generateBoardLayout(game.rooms, manifiestoDe(undefined).rotuloCentralDelPlano);
  game.plot = generateDemoPlot(game);

  const sesion = {
    id: game.id,
    juego: 'cluedo',
    code: 'MANSIO',
    phase: 'ronda-abierta',
    round: 1,
    totalRounds: 3,
    roundEndsAt: new Date(Date.now() + 3600_000).toISOString(),
    players: game.suspects.map((s, i) => ({
      suspectId: s.id,
      displayName: s.name,
      joinCode: `MANS${i}A`,
      joined: true,
      elecciones: [],
      notas: '',
      girosRecibidos: [],
    })),
    acusaciones: [],
    tablon: [],
    rev: 3,
    updatedAt: ahora,
  } as unknown as LiveSession;

  return { game, sesion };
}

function sembrar(
  dir: string,
  partidas: Array<{ game: GameSession; sesion: LiveSession }>,
  sinSesion: GameSession[] = [],
): void {
  fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'data', 'db.json'),
    JSON.stringify(
      {
        games: [...partidas.map((p) => p.game), ...sinSesion],
        messages: {},
        config: { model: 'claude-fable-5' },
        live: partidas.map((p) => p.sesion),
        accounts: [],
      },
      null,
      2,
    ),
    'utf8',
  );
}

// ---------------------------------------------------------------------------

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gm-puertas-'));
const momia = partidaDeMomia('sellado');
const enJuego = partidaDeMomia('ronda-abierta', 'excavacion', 'ABIERT', 'ABIE');
/*
 * Una tercera partida SIN sesión en vivo: se abre desde el taller durante la
 * prueba, que es el único modo de mirar lo que hay en el instante de abrir.
 */
const porAbrir = partidaDeMomia('ronda-abierta', 'excavacion2', 'NOABRE', 'NOAB');
const cluedo = partidaDeCluedo();
sembrar(dir, [momia, enJuego, cluedo], [porAbrir.game]);

let servidor: ChildProcess | undefined;

async function entrar(code: string, joinCode: string): Promise<string> {
  const r = await pedir('/jugar/entrar', { metodo: 'POST', cuerpo: { code, joinCode } });
  if (r.estado !== 200 || !r.datos?.token) {
    throw new Error(`no se pudo entrar con ${code}/${joinCode}: ${JSON.stringify(r.datos)}`);
  }
  return String(r.datos.token);
}

async function estadoDeLaSesion(gameId: string): Promise<any> {
  const r = await pedir(`/games/${gameId}/live`);
  const s = r.datos?.sesion ?? r.datos?.live ?? r.datos;
  return s;
}

async function probar(): Promise<void> {
  // -------------------------------------------------------------------------
  paso('Señalar al saqueador POR LA PUERTA DE LA APP');
  // -------------------------------------------------------------------------
  {
    const eje = accionDeAcusacion(manifiestoDe('momia'));
    comprobar('el manifiesto de la Momia dice con qué acción se acusa', eje?.id === 'senalar', eje?.id);

    const testigo = await entrar('PUERTA', 'PUER0A');
    /*
     * ESTA ES LA LLAMADA QUE HACE LA APP. No `/jugar/accion`: los dos botones
     * de «Señalar al saqueador» —la barra de la vigilia y el panel del
     * Sellado— llevan a la pantalla de acusar, y esa manda aquí.
     */
    const r = await pedir('/jugar/acusar', {
      metodo: 'POST',
      testigo,
      cuerpo: { respuestas: { saqueador: 'e3' } },
    });
    comprobar('la app puede señalar y el servidor lo acepta', r.estado === 200, r.datos);

    const sesion = await estadoDeLaSesion('expedicion');
    const suya = (sesion?.acusaciones ?? []).find((a: any) => a.suspectId === 'e0');
    comprobar('el señalamiento queda guardado en la partida', Boolean(suya), sesion?.acusaciones);
    comprobar('y se apunta que acertó', suya?.correcta === true, suya);
  }

  // -------------------------------------------------------------------------
  paso('Y CLUEDO sigue acusando por la misma puerta');
  // -------------------------------------------------------------------------
  {
    const eje = accionDeAcusacion(manifiestoDe('cluedo'));
    comprobar('en CLUEDO la acción sigue siendo `acusar`', eje?.id === 'acusar', eje?.id);

    const testigo = await entrar('MANSIO', 'MANS0A');
    const sol = cluedo.game.plot!.solution.respuestas as Record<string, string>;
    const r = await pedir('/jugar/acusar', {
      metodo: 'POST',
      testigo,
      cuerpo: { respuestas: sol },
    });
    comprobar('acusar en CLUEDO responde 200', r.estado === 200, r.datos);
  }

  // -------------------------------------------------------------------------
  paso('Ejecutar el ritual POR LA PUERTA DEL TALLER');
  // -------------------------------------------------------------------------
  {
    // Dos propuestas, para que haya algo que ejecutar y algo que descartar.
    const uno = await entrar('PUERTA', 'PUER1A');
    const dos = await entrar('PUERTA', 'PUER2A');
    const orden = ['t0', 't1', 't2', 't3', 't4'];
    for (const testigo of [uno, dos]) {
      const r = await pedir('/jugar/accion', {
        metodo: 'POST',
        testigo,
        cuerpo: { accion: 'proponer-orden', datos: { orden } },
      });
      comprobar('se puede entregar una propuesta de orden', r.estado === 200, r.datos);
    }

    const antes = await estadoDeLaSesion('expedicion');
    comprobar('todavía no hay veredicto escrito', !antes?.estado?.momia?.sellado, antes?.estado?.momia?.sellado);

    /*
     * ESTA ES LA LLAMADA QUE HACE EL TALLER al pulsar «Ejecutar el ritual».
     * Antes pegaba contra `/live/sellado/ejecutar`, que no existía: 404 y el
     * aviso se borraba solo en poco más de un segundo.
     */
    const r = await pedir('/games/expedicion/live/cierre', { metodo: 'POST' });
    comprobar('el taller puede ejecutar el ritual', r.estado === 200, r.datos);

    const despues = await estadoDeLaSesion('expedicion');
    const sellado = despues?.estado?.momia?.sellado;
    comprobar('el veredicto queda ESCRITO y no solo calculado', Boolean(sellado), despues?.estado?.momia);
    comprobar('con el orden que se ejecutó', Array.isArray(sellado?.ordenEjecutado), sellado);

    /*
     * LO QUE DE VERDAD SE PROTEGE: que no se pueda volcar un final ya dicho en
     * voz alta. Se entrega otra propuesta DESPUÉS y el veredicto no se mueve.
     */
    const tres = await entrar('PUERTA', 'PUER3A');
    await pedir('/jugar/accion', {
      metodo: 'POST',
      testigo: tres,
      cuerpo: { accion: 'proponer-orden', datos: { orden: ['t4', 't3', 't2', 't1', 't0'] } },
    });
    const final = await estadoDeLaSesion('expedicion');
    comprobar(
      'una propuesta posterior NO cambia el veredicto',
      JSON.stringify(final?.estado?.momia?.sellado?.ordenEjecutado) ===
        JSON.stringify(sellado?.ordenEjecutado),
      final?.estado?.momia?.sellado,
    );
  }

  // -------------------------------------------------------------------------
  paso('Quien dirige tiene algo que leer DESDE QUE ABRE, sin que nadie actúe');
  // -------------------------------------------------------------------------
  {
    /*
     * ABRE UNA MESA NUEVA Y NO TOCA NADA MÁS. Es el momento exacto del fallo:
     * el estado nacía con la primera acción de alguien, así que hasta entonces
     * el panel de quien dirige no encontraba cámara profanada que anunciar
     * —que es literalmente lo primero que hay que decir en voz alta— y en su
     * lugar aconsejaba cerrar la partida y volver a abrirla, que borra la
     * sesión y echa a las ocho personas de la mesa.
     */
    const abierta = await pedir('/games/excavacion2/live/abrir', {
      metodo: 'POST',
      cuerpo: {},
    });
    comprobar('la mesa se abre', abierta.estado === 200, abierta.datos);

    const recien = await estadoDeLaSesion('excavacion2');
    const suyo = recien?.estado?.momia;
    comprobar('el estado del juego existe ANTES de que nadie actúe', Boolean(suyo), recien?.estado);
    comprobar(
      'y trae las cámaras profanadas, que es lo que hay que anunciar',
      Array.isArray(suyo?.profanadas) && suyo.profanadas.length > 0,
      suyo?.profanadas,
    );
    comprobar(
      'y a toda la expedición, con sus marcas y sus amuletos',
      Object.keys(suyo?.gente ?? {}).length === 4,
      Object.keys(suyo?.gente ?? {}),
    );
    comprobar(
      'y los fragmentos, para saber qué hay sobre la mesa',
      Object.keys(suyo?.fragmentos ?? {}).length > 0,
    );

    // Y CLUEDO abre exactamente igual que siempre: sin estado, porque no registra ninguno.
    const cluedoAbierto = await estadoDeLaSesion('mansion');
    comprobar(
      'CLUEDO sigue abriendo sin estado propio',
      cluedoAbierto?.estado === undefined || cluedoAbierto?.estado === null,
      cluedoAbierto?.estado,
    );
  }

  // -------------------------------------------------------------------------
  paso('Tocar un sitio en el plano funciona en los dos juegos');
  // -------------------------------------------------------------------------
  {
    const entrada = accionDeEntrarEnLugar(manifiestoDe('momia'));
    comprobar('la Momia dice con qué acción se entra', entrada?.accion.id === 'explorar', entrada?.accion.id);
    comprobar('y en qué campo va', entrada?.campo === 'camara', entrada?.campo);
    const enCluedo = accionDeEntrarEnLugar(manifiestoDe('cluedo'));
    comprobar('CLUEDO sigue con la suya', enCluedo?.accion.id === 'entrar-en-sala', enCluedo?.accion.id);

    /*
     * LA LLAMADA QUE HACE EL PLANO. Despachaba `'entrar-en-sala'` a pelo, así
     * que en la Momia contestaba 409 mientras la propia pantalla invitaba a
     * tocar la cámara y pintaba el error justo debajo.
     */
    const testigo = await entrar('ABIERT', 'ABIE1A');
    const r = await pedir('/jugar/sala', {
      metodo: 'POST',
      testigo,
      cuerpo: { roomId: 'c1' },
    });
    comprobar('tocar una cámara en el plano entra de verdad', r.estado === 200, r.datos);
    comprobar('y la vista dice que estás dentro', r.datos?.vista?.miSala === 'c1', r.datos?.vista?.miSala);
  }

  // -------------------------------------------------------------------------
  paso('Lo que se elige y NO es una entidad llega al reductor');
  // -------------------------------------------------------------------------
  {
    /*
     * LA PRUEBA MÁS FINA DE LAS DOS, y la que de verdad demuestra que el campo
     * VIAJA: se manda un don que no es tuyo. Si el motor lo pasa, el reductor
     * lo mira y lo rechaza —«Ese don no es tuyo»—. Si el motor lo descartase
     * por no estar declarado, el reductor caería en el don por defecto y esto
     * respondería 200: el mismo silencio que dejaba al saqueador sin su jugada.
     */
    const impostor = await entrar('ABIERT', 'ABIE0A');
    const ajeno = await pedir('/jugar/accion', {
      metodo: 'POST',
      testigo: impostor,
      cuerpo: { accion: 'invocar', datos: { don: 'falsificar' } },
    });
    /*
     * SE MIRA EL MOTIVO, NO SOLO EL CÓDIGO, y la diferencia lo era todo: con el
     * motor descartando el campo, este jugador usaba su don de siempre y podía
     * fallar igualmente por otra razón —al suyo le falta un objetivo—, así que
     * un simple «responde 400» pasaba en verde con el fallo puesto. Solo el
     * mensaje «ese don no es tuyo» demuestra que el campo llegó y se miró.
     */
    comprobar(
      'un don que no es tuyo se rechaza POR NO SER TUYO',
      String(ajeno.datos?.error ?? '').toLowerCase().includes('no es tuyo'),
      ajeno,
    );

    // Y el saqueador —el único con dos— sí puede elegir el suyo.
    const saqueador = await entrar('ABIERT', 'ABIE3A');
    const miente = await pedir('/jugar/accion', {
      metodo: 'POST',
      testigo: saqueador,
      cuerpo: { accion: 'invocar', datos: { don: 'falsificar' } },
    });
    comprobar('el saqueador sí puede falsificar', miente.estado === 200, miente.datos);

    const declarado = manifiestoDe('momia').acciones.find((a) => a.id === 'invocar');
    const libres = (declarado?.eligeLibre ?? []).map((c) => c.campo).sort();
    comprobar(
      'el manifiesto declara los dos campos que no son entidades',
      JSON.stringify(libres) === JSON.stringify(['don', 'fragmento']),
      libres,
    );
  }

  // -------------------------------------------------------------------------
  paso('CLUEDO no gana una puerta nueva');
  // -------------------------------------------------------------------------
  {
    const r = await pedir('/games/mansion/live/cierre', { metodo: 'POST' });
    comprobar('cerrar así una partida de CLUEDO se rechaza', r.estado >= 400, r.datos);
  }

  // -------------------------------------------------------------------------
  paso('Reescribir el material no destruye una partida que no es de CLUEDO');
  // -------------------------------------------------------------------------
  {
    const antes = await pedir('/games/expedicion');
    const r = await pedir('/games/expedicion/material', { metodo: 'POST' });
    comprobar('la Momia rechaza el material de velada', r.estado === 409, r.estado);
    const despues = await pedir('/games/expedicion');
    comprobar(
      'y la trama sigue exactamente igual',
      JSON.stringify(antes.datos?.plot) === JSON.stringify(despues.datos?.plot),
    );
    comprobar(
      'CLUEDO sí declara material de velada',
      manifiestoDe('cluedo').materialDeVelada === true,
    );
    comprobar(
      'y la Momia no lo declara',
      manifiestoDe('momia').materialDeVelada !== true,
    );

    /*
     * LO DECLARADO Y LO REGISTRADO NO PUEDEN SEPARARSE. Son dos cosas
     * distintas —el manifiesto decide si el taller pinta el botón, el registro
     * decide quién escribe— y por eso pueden divergir sin dar error: declarar
     * sin generador deja un botón que contesta 409, y generador sin declarar
     * deja código al que no llega nadie.
     */
    const conGenerador = new Set(juegosConMaterial());
    for (const juego of ['cluedo', 'momia'] as const) {
      comprobar(
        `«${juego}»: lo que declara el manifiesto y lo que hay registrado coinciden`,
        (manifiestoDe(juego).materialDeVelada === true) === conGenerador.has(juego),
        { declara: manifiestoDe(juego).materialDeVelada, registrado: conGenerador.has(juego) },
      );
    }
  }
}

// ---------------------------------------------------------------------------
// El paquete de papel: cada documento en su carpeta. Sin servidor.
// ---------------------------------------------------------------------------

function probarPaquete(): void {
  paso('El ZIP a ciegas: quien dirige no recibe lo de quien juega');

  const aCiegas = partidaDeMomia('ronda-abierta').game;
  aCiegas.settings = { ...aCiegas.settings, gmPlays: true } as never;
  const paquete = armarPaquete(aCiegas);
  const rutas = paquete.entradas.map((e) => e.ruta);

  const docs = manifiestoDe('momia').documentos;
  const deJugadores = docs.filter((d) => d.audience === 'players');
  comprobar('la Momia declara documentos para quien juega', deJugadores.length > 0);

  /*
   * EL NOMBRE SE LIMPIA IGUAL QUE EN EL PAQUETE —sin acentos y con guiones
   * bajos—, y esto no es un detalle: buscando el nombre tal cual, «Dosieres de
   * la expedición» no aparecía en ninguna ruta y la comprobación pasaba por
   * VACÍO. Pasaba en verde con el fallo puesto, que es peor que no tenerla.
   * Por eso además se exige encontrarlo antes de juzgar dónde está.
   */
  const comoEnElZip = (t: string): string =>
    t
      .normalize('NFD')
      .split('')
      .filter((c) => c.charCodeAt(0) < 768 || c.charCodeAt(0) > 879)
      .join('')
      .split('')
      .map((c) => (/[a-zA-Z0-9]/.test(c) ? c : '_'))
      .join('');

  for (const doc of deJugadores) {
    const suya = rutas.find((r) => r.includes(comoEnElZip(doc.name)));
    comprobar(`«${doc.name}» está en el paquete`, Boolean(suya), rutas);
    comprobar(
      `«${doc.name}» no cae en la carpeta de quien dirige`,
      Boolean(suya) && !suya!.startsWith('01_'),
      suya,
    );
  }

  /*
   * LA CARA DE LA TIRA FALSA. Es la mitad que queda a la vista al doblarla, así
   * que cualquier palabra que la delate ahí acaba con la mecánica del traidor
   * en el momento de usarla.
   */
  const papiro = paquete.entradas.find((e) => e.ruta.toLowerCase().includes('fragmentos'));
  const html = papiro?.componer({} as never) ?? '';
  const caras = html.split('class="cara"').slice(1).map((t) => t.split('class="doblez"')[0] ?? '');
  comprobar('el documento de fragmentos se compone', caras.length > 0);
  comprobar(
    'ninguna cara de tira dice que es una falsificación',
    !caras.some((c) => c.toLowerCase().includes('falsific')),
  );
  comprobar(
    'ni que no se reparte',
    !caras.some((c) => c.toLowerCase().includes('no se reparte')),
  );

  const dosieres = rutas.find((r) => r.toLowerCase().includes('dosieres'));
  comprobar('los dosieres van a la carpeta que no puede abrir quien dirige', Boolean(dosieres) && dosieres!.startsWith('02_'), dosieres);

  // Y en modo anfitrión no se ha movido nada: allí no hay dos personas.
  const anfitrion = partidaDeMomia('ronda-abierta').game;
  const rutasAnfitrion = armarPaquete(anfitrion).entradas.map((e) => e.ruta);
  const dosierAnfitrion = rutasAnfitrion.find((r) => r.toLowerCase().includes('dosieres'));
  comprobar(
    'en modo anfitrión los dosieres siguen donde estaban',
    Boolean(dosierAnfitrion) && dosierAnfitrion!.startsWith('01_'),
    dosierAnfitrion,
  );
}

// ---------------------------------------------------------------------------
// El selector de imprimibles: que no vuelva a mirar el catálogo de CLUEDO.
// ---------------------------------------------------------------------------

function probarSelector(): void {
  paso('El selector del taller usa el catálogo del juego');

  const fichero = path.join(REPO, 'client', 'src', 'components', 'documents', 'PrintablePicker.tsx');
  const texto = fs.readFileSync(fichero, 'utf8');
  /*
   * Comprobación sobre el TEXTO, y se dice lo que puede y lo que no. No prueba
   * que el componente se comporte bien: prueba que no vuelve a existir la única
   * forma que tenía de comportarse mal, que era filtrar contra la constante de
   * CLUEDO teniendo el catálogo del juego delante. Pulsar cualquier documento
   * en una partida de la Momia guardaba entonces ids de CLUEDO, el orden
   * canónico los descartaba todos, y el ZIP salía con una hoja.
   */
  /*
   * SE MIRA EL USO, NO LA MENCIÓN. Aquí arriba se nombra la constante de CLUEDO
   * para explicar el fallo, y una comprobación que se rompiera por su propio
   * comentario no comprobaría nada. Las dos señales que se buscan son de código
   * y no caben en una explicación: importarla, y filtrar con ella.
   */
  const constante = ['PRINTABLE', 'DOCS'].join('_');
  comprobar('el componente no importa el catálogo de CLUEDO', !texto.includes('{ ' + constante));
  comprobar('ni filtra con él', !texto.includes(constante + '.filter'));
  comprobar('y sí lee el del manifiesto', texto.includes('manifiestoDe('));
}

// ---------------------------------------------------------------------------
// El panel de quien dirige: ni aconseja el desastre, ni le esconde la partida.
// ---------------------------------------------------------------------------

/**
 * El paquete no mete DOS dosieres por persona, uno de ellos equivocado.
 *
 * La plataforma sabe componer dosieres genéricos y están escritos en CLUEDO:
 * hablan de la víctima, de los sospechosos y de pasadizos secretos. Se metían
 * siempre, así que en la Momia quedaban dos por cabeza — el bueno en una
 * carpeta y el de CLUEDO en `02_JUGADORES`, que es donde va a mirar quien
 * prepare para saber qué repartir.
 */
function probarDosieres(): void {
  paso('Un solo dosier por persona, y el bueno');

  const conSuyos = partidaDeMomia('ronda-abierta').game;
  const rutas = armarPaquete(conSuyos).entradas.map((e) => e.ruta);

  comprobar(
    'la Momia declara que trae los suyos',
    manifiestoDe('momia').dosieresPropios === true,
  );
  /*
   * `dosier_<nombre>` en minúscula y dentro de la carpeta de jugadores: es la
   * forma exacta del genérico. Buscar «dosier_» a secas contaba también
   * «Dosier_del_Game_Master», y una comprobación que cuenta de más miente igual
   * que una que cuenta de menos.
   */
  const genericos = (lista: string[]): string[] =>
    lista.filter((r) => r.split('/').pop()?.startsWith('dosier_'));

  comprobar(
    'no se cuela el dosier genérico de cada jugador',
    genericos(rutas).length === 0,
    genericos(rutas),
  );
  comprobar(
    'ni el dosier genérico de quien dirige',
    !rutas.some((r) => r.includes('Dosier_del_Game_Master')),
    rutas,
  );
  comprobar(
    'y sí están los suyos',
    rutas.some((r) => r.toLowerCase().includes('dosieres')),
    rutas,
  );

  // Y CLUEDO sigue teniendo los suyos, que son estos: uno por persona.
  const cluedoGame = partidaDeCluedo().game;
  const deCluedo = armarPaquete(cluedoGame).entradas.map((e) => e.ruta);
  comprobar(
    'CLUEDO conserva un dosier por jugador',
    genericos(deCluedo).length === cluedoGame.suspects.length,
    genericos(deCluedo),
  );
  comprobar(
    'y el suyo de quien dirige',
    deCluedo.some((r) => r.includes('Dosier_del_Game_Master')),
    deCluedo,
  );
  comprobar('CLUEDO no declara dosieres propios', !manifiestoDe('cluedo').dosieresPropios);
}

/**
 * Lo que se imprime en la hoja de TODO EL MUNDO pasa por el depurador.
 *
 * Se ejecuta el ensamblador con una respuesta ENVENENADA a mano: los cinco
 * ritos en el orden verdadero, metidos en la presentación pública de alguien y
 * en un momento público de la cronología. Los dos sitios se imprimen para todos
 * y ninguno de los dos pasaba por el filtro.
 */
function probarDepuracion(): void {
  paso('Nada público enumera el orden verdadero');

  const game = partidaDeMomia('ronda-abierta').game;
  const entidades = entidadesDeLaMomia(game);
  const cimientos = cimientosDeMomia(entidades, { semilla: 'depurar', vigilias: 3 });
  const respuesta = respuestaDeDemostracion(game.name, entidades, cimientos.trama);

  // El orden verdadero, escrito de corrido.
  const nombres = cimientos.trama.ordenVerdadero.map(
    (id) => entidades.ritos.find((r) => r.id === id)?.name ?? id,
  );
  const veneno = `Lo sabe de memoria: ${nombres.join(', ')}. Ese es el orden.`;

  respuesta.expedicionarios[0]!.publicPersona = veneno;
  respuesta.expedicionarios[0]!.role = veneno;
  respuesta.cronologia = [
    {
      hora: '23:00',
      descripcion: veneno,
      expedicionarioIds: entidades.expedicionarios.slice(0, 2).map((e) => e.id),
      publico: true,
    },
  ];

  const { plot } = ensamblarTramaMomia(game, entidades, cimientos, respuesta);

  const publica = plot.characters.find((c) => c.suspectId === entidades.expedicionarios[0]!.id);
  comprobar('la presentación pública envenenada NO sobrevive', publica?.publicPersona !== veneno, publica?.publicPersona);
  comprobar('ni el papel', publica?.role !== veneno, publica?.role);

  const momento = plot.timeline.find((e) => e.isPublic);
  comprobar('hay un momento público que mirar', Boolean(momento));
  comprobar('y su texto envenenado tampoco sobrevive', momento?.description !== veneno, momento?.description);

  /*
   * Y LO PRIVADO NO SE TOCA. El dosier del saqueador tiene que poder decirle
   * que fue él; un filtro demasiado celoso ahí romperia el juego en silencio.
   */
  comprobar(
    'los secretos de cada cual siguen enteros',
    plot.characters.every((c) => Boolean(c.secret)),
  );
}

/**
 * Quien se apunta con el misterio ya escrito recibe su don.
 *
 * Se quedaba fuera del reparto, y entonces la partida daba DOS RESPUESTAS
 * DISTINTAS a la misma pregunta: el móvil le ponía `descifrar` en silencio —por
 * el valor por defecto de `estadoInicial`— y su dosier impreso le decía que
 * esta partida no le había asignado ninguno.
 */
function probarAmpliacion(): void {
  paso('Quien llega tarde entra en la expedición entera');

  const { game } = partidaDeMomia('ronda-abierta');
  const trama = game.plot!.delJuego as { dones: Record<string, string> };
  const antes = Object.keys(trama.dones).length;

  // Se sienta alguien más, como cuando confirman tarde.
  game.suspects.push({ id: 'e9', name: 'Nueva' } as never);

  comprobar('antes de ampliar no tiene don', trama.dones.e9 === undefined);
  comprobar('ni papel escrito', !game.plot!.characters.some((c) => c.suspectId === 'e9'));

  const { anadidos } = ampliarExpedicion(game, game.plot!);

  comprobar('la ampliación la ve', anadidos.includes('e9'), anadidos);
  comprobar('ahora tiene don', Boolean(trama.dones.e9), trama.dones.e9);
  comprobar('y papel escrito', game.plot!.characters.some((c) => c.suspectId === 'e9'));
  comprobar(
    'y no le ha quitado el suyo a nadie',
    Object.keys(trama.dones).length === antes + 1,
    Object.keys(trama.dones),
  );

  /*
   * Y CADA JUEGO AMPLÍA CON EL SUYO. Que los dos estén dados de alta es lo que
   * impide que la Momia reciba el pipeline de CLUEDO, que le pasa al modelo el
   * motivo —el que NOMBRA a quien rompió el sello— para escribir textos que se
   * imprimen en la hoja de todo el mundo.
   */
  const registrados = new Set(juegosConAmpliacion());
  comprobar('CLUEDO tiene la suya', registrados.has('cluedo'), [...registrados]);
  comprobar('y la Momia la suya', registrados.has('momia'), [...registrados]);
}

function probarPanel(): void {
  paso('El panel del Game Master');

  const fichero = path.join(REPO, 'client', 'src', 'components', 'live', 'PanelDeLaMomia.tsx');
  const texto = fs.readFileSync(fichero, 'utf8');

  /*
   * NO PUEDE ACONSEJAR CERRAR LA PARTIDA. Lo hacía —«ciérrala y vuelve a
   * abrirla»— justo cuando no encontraba estado, que era justo al abrir la
   * mesa; y cerrar BORRA la sesión en vivo y echa a las ocho personas. El
   * consejo que parecía la solución era el desastre.
   */
  comprobar(
    'no aconseja cerrar y reabrir la partida',
    !texto.toLowerCase().includes('vuelve a abrirla'),
  );

  // Y lo que quien dirige no veía nunca: qué hay publicado y quién gastó su don.
  comprobar('enseña los fragmentos publicados', texto.includes('publicados'));
  comprobar('y si cada cual ha usado su don', texto.includes('donUsadoEnRonda'));
}

// ---------------------------------------------------------------------------

try {
  probarPaquete();
  probarDosieres();
  probarDepuracion();
  probarAmpliacion();
  probarSelector();
  probarPanel();

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
  await probar();
} catch (e) {
  fallos.push(`la prueba se cayó: ${e instanceof Error ? e.message : String(e)}`);
} finally {
  servidor?.kill();
  await new Promise((r) => setTimeout(r, 600));
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    console.log(`  (queda por limpiar ${dir})`);
  }
}

console.log(`\n${hechas} comprobaciones`);
if (fallos.length > 0) {
  console.log(`\n${fallos.length} sin pasar:`);
  for (const f of fallos) console.log(`  ✘ ${f}`);
  process.exit(1);
}
console.log('Todo lo que la mesa toca llega a donde tiene que llegar.');
