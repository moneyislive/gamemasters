/**
 * Un juego que NO está dentro del binario, instalado desde disco.
 *
 *   npm run verify:de-fuera
 *
 * ═══ ESTA ES LA PIEZA DE LEGO, LITERALMENTE ═══
 *
 * Todo lo demás de esta arquitectura se puede resumir en una pregunta: ¿puede
 * existir un juego que la plataforma no conozca? Hasta hoy la respuesta era no.
 * No por falta de registros —hay dieciséis— sino porque para llegar a ellos
 * había que estar DENTRO: las funciones de alta viven en el paquete compilado, y
 * un módulo de fuera no tiene forma de llamarlas.
 *
 * Así que esto escribe un juego entero en un fichero `.mjs` en un directorio
 * temporal —fuera del repositorio, sin compilar, sin `import` de nada del
 * servidor—, arranca el servidor con `JUEGOS_EXTERNOS=<esa ruta>` y comprueba
 * que se puede jugar.
 *
 * ═══ QUÉ TIENE DE DIFERENTE EL JUEGO DE PRUEBA ═══
 *
 * Todo lo que se pueda. No tiene ejes —no hay nada que adivinar—, sus personas
 * viven fuera de `suspects`, sus fases se llaman como quiere, y su acción pide
 * un número. Si algo de eso siguiera cableado a CLUEDO, este fichero no
 * arrancaría.
 *
 * ═══ LO QUE ESTO NO PRUEBA ═══
 *
 * Que sea seguro. El juego corre en el mismo proceso y con los mismos permisos
 * que el servidor: instalar uno es una decisión de quien administra la máquina,
 * del mismo orden que instalar un módulo de nginx. No es una tienda abierta.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { GameSession } from '../../shared/types';

const REPO = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const TSX = path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SERVIDOR = path.join(REPO, 'server', 'src', 'index.ts');
const PUERTO = 6900 + Math.floor(Math.random() * 300);
const SEMBRADA = 'la-ultima-ronda';
const BASE = `http://127.0.0.1:${PUERTO}/api`;

let hechas = 0;
const fallos: string[] = [];
function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(`${que}${detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 400)}`}`);
}
function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

async function pedir(
  ruta: string,
  opciones: { metodo?: string; cuerpo?: unknown } = {},
): Promise<{ estado: number; datos: any }> {
  const r = await fetch(`${BASE}${ruta}`, {
    method: opciones.metodo ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    ...(opciones.cuerpo === undefined ? {} : { body: JSON.stringify(opciones.cuerpo) }),
  });
  const texto = await r.text();
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    datos = texto;
  }
  return { estado: r.status, datos };
}

async function esperarServidor(): Promise<void> {
  for (let i = 0; i < 160; i++) {
    try {
      await fetch(`${BASE}/games`);
      return;
    } catch {
      /* todavía no escucha */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('el servidor no arrancó');
}

/**
 * EL JUEGO, escrito como lo escribiría alguien de fuera.
 *
 * Un `.mjs` suelto. No importa nada del servidor: todo lo que necesita le llega
 * en `api`. Eso es lo que se está probando.
 */
const EL_JUEGO = `
export function instalar(api) {
  const FAROLA = {
    id: 'la-farola',
    nombre: 'La Farola',
    lema: 'Alguien tiene que quedarse el último, y nadie quiere.',

    categorias: [
      {
        id: 'trasnochadores',
        singular: 'trasnochador',
        plural: 'trasnochadores',
        minimo: 2,
        sonJugadores: true,
        // SIN \`almacen\`: su gente vive en \`game.entidades.trasnochadores\`.
      },
    ],

    // Sin ejes: aqui no hay nada que adivinar.
    ejes: [],

    turnos: 'simultaneo',

    acciones: [
      {
        id: 'aguantar',
        rotulo: 'Aguantar un rato mas',
        fases: ['la-noche'],
        vecesPorTurno: 1,
        pideNumero: [
          { campo: 'minutos', rotulo: '¿Cuantos minutos aguantas?', minimo: 1, maximo: 90, entero: true },
        ],
      },
    ],

    fases: {
      'antes-de-salir': ['la-noche'],
      'la-noche': ['el-ultimo'],
    },
    papelDeFase: {
      'antes-de-salir': 'espera',
      'la-noche': 'turno',
      'el-ultimo': 'fin',
    },

    barra: [{ pantalla: 'ronda', rotulo: 'La noche', icono: 'reloj' }],
    dosier: [],
    documentos: [],
    trofeos: [],
    reglas: [{ titulo: 'La regla', texto: 'Gana quien aguante mas, y pierde quien lo diga en alto.' }],
    asistente: { nombre: 'El Sereno', descripcion: 'Sabe a que hora cierra todo.', icono: 'reloj' },
    ceremonia: [],
    preparacion: [],
  };

  api.registrarJuego(FAROLA);

  api.registrarAcciones('la-farola', {
    aguantar: ({ sesion, participanteId, numeros }) => {
      const estado = (sesion.estado ??= {});
      const mio = (estado.farola ??= {});
      mio[participanteId] = (mio[participanteId] ?? 0) + (numeros.minutos ?? 0);
      return { aguantados: mio[participanteId] };
    },
  });

  api.registrarProyeccion('la-farola', (game, sesion, participanteId) => ({
    // Solo lo tuyo: lo que aguantan los demas no se enseña.
    aguantado: sesion.estado?.farola?.[participanteId] ?? 0,
    cuantosSiguen: api.entidadesDe(game, 'trasnochadores').length,
  }));

  api.registrarVeredicto('la-farola', (game, sesion) => {
    const marcas = sesion.estado?.farola ?? {};
    const mejor = Math.max(0, ...Object.values(marcas));
    if (mejor === 0) return undefined;
    return Object.keys(marcas).filter((id) => marcas[id] === mejor);
  });
}
`;

async function jugarElDeFuera(): Promise<void> {
  paso('El juego de fuera está instalado');

  const nueva = await pedir('/games', {
    metodo: 'POST',
    cuerpo: { name: 'Una noche cualquiera', juego: 'la-farola' },
  });
  comprobar('se puede crear una partida suya', nueva.estado === 201, nueva);
  const game = nueva.datos as GameSession;
  comprobar('y nace declarando su juego', game?.settings?.juego === 'la-farola', game?.settings);
  if (!game?.id) return;

  paso('Su partida sembrada tiene la gente donde ÉL dice, no en `suspects`');

  const conGente = await pedir(`/games/${SEMBRADA}`);
  const partida = conGente.datos as GameSession & { entidades?: Record<string, unknown[]> };
  comprobar('la partida sembrada se lee', conGente.estado === 200, conGente.estado);
  comprobar(
    'sus personas viven en `entidades`, no en `suspects`',
    (partida.entidades?.trasnochadores ?? []).length === 3 && partida.suspects.length === 0,
    { entidades: Object.keys(partida.entidades ?? {}), suspects: partida.suspects.length },
  );

  paso('Y la mesa se abre en la fase que ÉL declara');

  const abrir = await pedir(`/games/${SEMBRADA}/live/abrir`, { metodo: 'POST' });
  comprobar('la mesa se abre', abrir.estado < 400, abrir);
  comprobar(
    'y empieza en «antes-de-salir», que es una fase que solo existe en su manifiesto',
    abrir.datos?.sesion?.phase === 'antes-de-salir',
    abrir.datos?.sesion?.phase,
  );

  const ronda = await pedir(`/games/${SEMBRADA}/live/ronda/abrir`, {
    metodo: 'POST',
    cuerpo: { minutos: 10 },
  });
  comprobar('se puede abrir su turno', ronda.estado < 400, ronda);
  comprobar(
    'y el turno se llama «la-noche»',
    ronda.datos?.sesion?.phase === 'la-noche',
    ronda.datos?.sesion?.phase,
  );
}

// ---------------------------------------------------------------------------

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'de-fuera-'));
const rutaDelJuego = path.join(dir, 'la-farola.mjs');
fs.writeFileSync(rutaDelJuego, EL_JUEGO, 'utf8');
/*
 * SE SIEMBRA UNA PARTIDA SUYA, con su gente y una trama minima.
 *
 * Se hace por el almacen y no por las rutas porque generar una trama pasa por
 * el modelo, y lo que se prueba aqui no es eso: es que un juego que la
 * plataforma no conocia se pueda PREPARAR y JUGAR. La trama es de una linea
 * porque este juego no tiene misterio ninguno.
 */
const AHORA = '2026-08-30T23:00:00.000Z';
const sembrada = {
  id: SEMBRADA,
  name: 'La ultima ronda',
  status: 'ready',
  createdAt: AHORA,
  updatedAt: AHORA,
  suspects: [],
  rooms: [],
  weapons: [],
  entidades: {
    trasnochadores: [
      { id: 't0', name: 'Ana' },
      { id: 't1', name: 'Bruno' },
      { id: 't2', name: 'Carla' },
    ],
  },
  boardMode: 'generated',
  settings: { language: 'es', juego: 'la-farola' },
  plot: {
    title: 'La ultima ronda',
    tagline: 'Alguien tiene que quedarse el ultimo.',
    synopsis: 'Cierra el bar y nadie se levanta.',
    setting: 'La acera, debajo de la farola.',
    solution: { respuestas: {} },
    characters: [
      { participanteId: 't0', characterName: 'Ana', role: 'Trasnochadora', publicPersona: '', knowledge: [] },
      { participanteId: 't1', characterName: 'Bruno', role: 'Trasnochador', publicPersona: '', knowledge: [] },
      { participanteId: 't2', characterName: 'Carla', role: 'Trasnochadora', publicPersona: '', knowledge: [] },
    ],
    timeline: [],
    clues: [],
    gmScript: [],
  },
};

fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
fs.writeFileSync(
  path.join(dir, 'data', 'db.json'),
  JSON.stringify({ games: [sembrada], messages: {}, config: {}, live: [], accounts: [] }, null, 2),
  'utf8',
);

let servidor: ChildProcess | undefined;
console.log(`\nUn juego escrito fuera del repositorio\n  ${rutaDelJuego}`);

try {
  servidor = spawn(process.execPath, [TSX, SERVIDOR], {
    cwd: dir,
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      PORT: String(PUERTO),
      NODE_ENV: 'test',
      // Lo único que hace falta para instalarlo.
      JUEGOS_EXTERNOS: rutaDelJuego,
    },
    stdio: 'ignore',
  });
  await esperarServidor();
  await jugarElDeFuera();
} catch (e) {
  fallos.push(`la prueba se cayó: ${e instanceof Error ? e.message : String(e)}`);
} finally {
  servidor?.kill();
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* en Windows a veces el fichero sigue tomado un instante */
  }
}

console.log('');
if (fallos.length === 0) {
  console.log(`${hechas} comprobaciones`);
  console.log('\nUn juego que la plataforma no conocía se instala, se prepara y se juega.');
  process.exit(0);
}
console.log(`${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
for (const f of fallos) console.log(`  ✗ ${f}`);
process.exit(1);
