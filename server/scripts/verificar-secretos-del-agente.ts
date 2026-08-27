/**
 * Que el asistente del taller NUNCA reciba la solución.
 *
 *   npm run verify:secretos-agente
 *
 * POR QUÉ ESTA PRUEBA EXISTE. La regla «el asistente no revela la solución» es
 * la más importante del producto —si el Mayordomo o El Escriba pueden chivar
 * quién fue, no hay velada— y hasta ahora **no estaba escrita en ningún sitio**.
 * Se cumplía por omisión: `buildSystemPrompt` solo inyecta el título, y
 * `get_game_state` solo devuelve si la trama está generada. Ni `plot.solution`,
 * ni `characters[].secret`, ni `material.finale`, ni `clues[].pointsTo` entraban
 * nunca en el contexto.
 *
 * Cumplirse por omisión es una forma frágil de cumplirse. Cualquier herramienta
 * nueva que devuelva el `Plot` entero rompe la regla EN SILENCIO: no falla nada,
 * no salta ningún aviso, y el fallo se descubre cuando alguien le pregunta al
 * asistente quién es el culpable y se lo dice. Con un segundo juego entrando y
 * herramientas nuevas escribiéndose, el riesgo dejó de ser teórico.
 *
 * CÓMO FUNCIONA. Se siembra una partida cuya solución, secretos, finales y
 * significados de pista son CENTINELAS: cadenas inventadas que no aparecen en
 * ningún otro sitio del sistema. Después se compone todo lo que el agente puede
 * llegar a leer y se busca cada centinela dentro. Si aparece uno, la prueba
 * canta cuál y por dónde se ha colado.
 *
 * No comprueba «que el modelo no lo diga», que no se puede comprobar: comprueba
 * que **no se lo damos**, que es lo único que está en nuestra mano.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/*
 * AISLAMIENTO, Y AQUI NO ES UNA FORMALIDAD.
 *
 * Esta prueba llama a `executeTool`, que necesita el almacen inicializado, y
 * `initStore()` lee `env.mongoUri`. Si el proceso arranca con el `.env` de la
 * casa al lado, dotenv lo carga y la prueba se pone a hablar con el Atlas de
 * PRODUCCION y con la clave de Anthropic de verdad.
 *
 * Asi que se relanza a si misma con el directorio de trabajo en una carpeta
 * temporal —sin `.env` que cargar— y con el entorno enumerado a mano. En
 * Windows, ademas, vaciar una variable la BORRA: no vale con ponerlas en
 * blanco, hay que no pasarlas. La leccion esta en ARCHITECTURE.md.
 */
if (process.env.GM_AISLADA !== '1') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gm-secretos-'));
  fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
  const r = spawnSync(
    process.execPath,
    [
      path.resolve(import.meta.dirname ?? __dirname, '..', '..', 'node_modules', 'tsx', 'dist', 'cli.mjs'),
      path.resolve(import.meta.dirname ?? __dirname, 'verificar-secretos-del-agente.ts'),
    ],
    {
      cwd: dir,
      env: {
        PATH: process.env.PATH,
        SystemRoot: process.env.SystemRoot,
        TEMP: process.env.TEMP,
        TMP: process.env.TMP,
        NODE_ENV: 'test',
        GM_AISLADA: '1',
      },
      stdio: 'inherit',
    },
  );
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* carpeta temporal: da igual si no se deja borrar */
  }
  process.exit(r.status ?? 1);
}

const { buildSystemPrompt } = await import('../src/agent/systemPrompt');
const { executeTool } = await import('../src/agent/tools');
const { initStore } = await import('../src/db/store');
import type { GameSession } from '../../shared/types';

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (!condicion) fallos.push(`${que}${detalle === undefined ? '' : ` · ${JSON.stringify(detalle)}`}`);
}

/**
 * Las cadenas que NO pueden salir. Cada una lleva su nombre dentro para que,
 * cuando una se cuele, el fallo diga exactamente qué campo se ha filtrado.
 */
const CENTINELAS = {
  culpable: 'CENTINELA-QUIEN-FUE-9f3a',
  motivo: 'CENTINELA-MOTIVO-7b21',
  comoPaso: 'CENTINELA-COMO-PASO-4c88',
  secreto: 'CENTINELA-SECRETO-1d54',
  aQueApunta: 'CENTINELA-A-QUE-APUNTA-6e10',
  confesion: 'CENTINELA-CONFESION-3a77',
  reconstruccion: 'CENTINELA-RECONSTRUCCION-8b02',
} as const;

const ahora = new Date().toISOString();

const game: GameSession = {
  id: 'secretos',
  name: 'Velada con centinelas',
  status: 'ready',
  createdAt: ahora,
  updatedAt: ahora,
  suspects: [
    { id: 's0', name: 'Ana' },
    { id: 's1', name: 'Bruno' },
    { id: 's2', name: 'Carla' },
  ],
  rooms: [
    { id: 'r0', name: 'Salón' },
    { id: 'r1', name: 'Cocina' },
    { id: 'r2', name: 'Biblioteca' },
    { id: 'r3', name: 'Invernadero' },
  ],
  weapons: [
    { id: 'w0', name: 'Candelabro' },
    { id: 'w1', name: 'Cuerda' },
    { id: 'w2', name: 'Abrecartas' },
  ],
  boardMode: 'generated',
  settings: { language: 'es' },
  plot: {
    title: 'La velada',
    tagline: 'Alguien miente.',
    synopsis: 'Una cena que acaba mal.',
    victim: { name: 'El anfitrión', description: 'Cayó en el salón.' },
    setting: 'Una casa grande',
    solution: {
      // El culpable va como texto, no como id, para que se vea si se filtra.
      respuestas: { culpable: CENTINELAS.culpable, objeto: 'w1', lugar: 'r0' },
      motive: CENTINELAS.motivo,
      howItHappened: CENTINELAS.comoPaso,
    },
    characters: [
      {
        suspectId: 's0',
        characterName: 'Ana Escarlata',
        role: 'La heredera',
        publicPersona: 'Sonríe mucho.',
        secret: CENTINELAS.secreto,
        motive: 'Una herencia.',
        alibi: 'Estaba fuera.',
        knowledge: [],
        personalHook: 'Le gusta el teatro.',
      },
    ],
    timeline: [],
    clues: [
      { id: 'c0', roomId: 'r0', description: 'Una copa rota.', pointsTo: CENTINELAS.aQueApunta, round: 1 },
    ],
    gmScript: [],
    material: {
      generatedAt: ahora,
      narrations: [],
      twists: [],
      timelineReveals: [],
      hints: [],
      finale: {
        reconstruction: CENTINELAS.reconstruccion,
        confession: CENTINELAS.confesion,
        epilogue: 'Se hizo de día.',
      },
    },
  },
} as unknown as GameSession;

/** Busca centinelas dentro de un texto y devuelve los nombres de los que salen. */
function filtrados(texto: string): string[] {
  return Object.entries(CENTINELAS)
    .filter(([, valor]) => texto.includes(valor))
    .map(([nombre]) => nombre);
}

async function comprobarTodo(): Promise<void> {
  await initStore();
  console.log('\n· El prompt de sistema');
  const prompt = buildSystemPrompt(game);
  comprobar('se compone', prompt.length > 100);
  const enPrompt = filtrados(prompt);
  comprobar('y NO lleva ni un secreto dentro', enPrompt.length === 0, enPrompt);

  console.log('\n· Lo que devuelven las herramientas del agente');
  /*
   * `get_game_state` es la unica herramienta de LECTURA del agente y por eso es
   * la que hay que vigilar: las demas escriben. Si algun dia se anade otra que
   * lea de la partida, esta prueba hay que ampliarla — y ese es justo el
   * momento en el que a alguien se le olvidaria.
   */
  const estado = await executeTool(game, 'get_game_state', {});
  comprobar(
    'y la herramienta se llama de verdad, no devuelve «desconocida»',
    !JSON.stringify(estado).includes('desconocida'),
    estado,
  );
  const comoTexto = JSON.stringify(estado);
  comprobar('get_game_state devuelve algo', comoTexto.length > 2);
  const enEstado = filtrados(comoTexto);
  comprobar('y NO lleva ni un secreto dentro', enEstado.length === 0, enEstado);

  console.log('\n· El centinela funciona de verdad');
  /*
   * La comprobacion de la comprobacion, y no sobra: si `filtrados` estuviera mal
   * escrita —un `includes` invertido, un centinela mal copiado— todas las lineas
   * de arriba pasarian en verde para siempre sin mirar nada. Una prueba que no
   * puede fallar no es una prueba.
   */
  comprobar(
    'un texto con un secreto SI se detecta',
    filtrados(`bla bla ${CENTINELAS.secreto} bla`).length === 1,
  );
  comprobar('y un texto limpio no', filtrados('bla bla bla').length === 0);
}

await comprobarTodo().catch((e) => {
  fallos.push(`la prueba se cayó: ${e instanceof Error ? e.message : String(e)}`);
});

console.log(`\n${hechas} comprobaciones`);
if (fallos.length === 0) {
  console.log('El asistente no recibe la solución por ninguna vía conocida.');
  process.exit(0);
}
console.log(`\n${fallos.length} FALLOS:\n`);
for (const f of fallos) console.log(`  ✗ ${f}`);
console.log(
  '\nUn fallo aquí significa que el asistente PUEDE chivar la solución.\n' +
    'No es un fallo de estilo: es el producto.',
);
process.exit(1);
