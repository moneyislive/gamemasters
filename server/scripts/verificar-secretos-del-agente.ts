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

const { bloquesDeSistema, buildSystemPrompt } = await import('../src/agent/systemPrompt');
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
  /*
   * Los dos de El Misterio de la Momia, y no son un extra del mismo problema:
   * son PEORES. En CLUEDO chivar la solución arruina el final; aquí el orden
   * verdadero de los cinco ritos sella la tumba en la primera vigilia, y saber
   * qué fragmentos son falsos desarma al saqueador, que es el motor adversarial
   * del juego entero. Los dos viven en `plot.delJuego`, que es un campo nuevo:
   * exactamente el sitio por el que se filtraría algo sin que nadie lo notara.
   */
  ordenVerdadero: 'CENTINELA-ORDEN-DEL-SELLADO-5c19',
  fragmentoFalso: 'CENTINELA-FRAGMENTO-FALSO-2d63',
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
        participanteId: 's0',
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
      { id: 'c0', lugarId: 'r0', description: 'Una copa rota.', pointsTo: CENTINELAS.aQueApunta, round: 1 },
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

/**
 * La misma partida, pero de El Misterio de la Momia.
 *
 * Lleva los centinelas donde de verdad duelen en ese juego: el orden verdadero
 * del sellado y el texto de un fragmento falso, los dos dentro de
 * `plot.delJuego`. Y las entidades van por las cuatro categorías de la Momia
 * —incluidos los `ritos`, que no caben en `suspects`, `rooms` ni `weapons`—
 * para que el prompt del Escriba y `get_game_state` se compongan de verdad y no
 * sobre una partida vacía que no probaría nada.
 */
const gameMomia = {
  id: 'secretos-momia',
  name: 'Expedición con centinelas',
  status: 'ready',
  createdAt: ahora,
  updatedAt: ahora,
  suspects: [
    { id: 'e0', name: 'Marta', description: 'Discute por deporte.' },
    { id: 'e1', name: 'Bruno' },
    { id: 'e2', name: 'Carla' },
    { id: 'e3', name: 'Dani' },
  ],
  rooms: [
    { id: 'c0', name: 'Antesala de los Sellos' },
    { id: 'c1', name: 'Pozo de las Ofrendas' },
    { id: 'c2', name: 'Corredor de las Estrellas' },
    { id: 'c3', name: 'Cámara del Barquero' },
    { id: 'c4', name: 'Sala de la Balanza' },
  ],
  weapons: [
    { id: 'q0', name: 'Escarabeo' },
    { id: 'q1', name: 'Máscara' },
    { id: 'q2', name: 'Vaso canopo' },
  ],
  entidades: {
    ritos: [
      { id: 't0', name: 'Rito del Agua' },
      { id: 't1', name: 'Rito del Aliento' },
      { id: 't2', name: 'Rito del Nombre' },
      { id: 't3', name: 'Rito de la Balanza' },
      { id: 't4', name: 'Rito del Silencio' },
    ],
  },
  boardMode: 'generated',
  settings: { language: 'es', juego: 'momia' },
  plot: {
    title: 'La tumba abierta',
    tagline: 'Alguien rompió el sello.',
    synopsis: 'Una expedición que acaba mal.',
    victim: { name: 'Neferhotep', description: 'Lo enterraron deprisa.' },
    setting: 'Una casa grande',
    solution: {
      respuestas: { saqueador: CENTINELAS.culpable },
      motive: CENTINELAS.motivo,
      howItHappened: CENTINELAS.comoPaso,
    },
    characters: [
      {
        participanteId: 'e0',
        characterName: 'Marta Vance',
        role: 'Epigrafista',
        publicPersona: 'Traduce lo que nadie sabe leer.',
        secret: CENTINELAS.secreto,
        motive: 'Una concesión.',
        alibi: 'Estaba en el corredor.',
        knowledge: [],
        personalHook: 'Discute por deporte.',
      },
    ],
    timeline: [],
    clues: [],
    gmScript: [],
    delJuego: {
      ordenVerdadero: [CENTINELAS.ordenVerdadero, 't1', 't2', 't3', 't4'],
      restricciones: [{ id: 'p-01', restriccion: { tipo: 'extremos', a: 't0' }, texto: 'El Agua abre o cierra.' }],
      falsasCandidatas: [
        { id: 'p-02', restriccion: { tipo: 'extremos', a: 't1' }, texto: CENTINELAS.fragmentoFalso },
      ],
      profanadas: ['c0'],
      hallazgos: [],
      dones: { e0: 'descifrar' },
      reliquiaCodiciada: 'q0',
    },
    material: {
      generatedAt: ahora,
      narrations: [],
      twists: [],
      timelineReveals: [],
      hints: [],
      finale: {
        reconstruction: CENTINELAS.reconstruccion,
        confession: CENTINELAS.confesion,
        epilogue: 'Amaneció.',
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

  /*
   * EL CORTE PARA LA CACHE NO PUEDE CAMBIAR NI UN CARÁCTER.
   *
   * El prompt sale en dos bloques para que la marca de la cache quede antes del
   * inventario, que es lo único que cambia de un turno a otro. Todo el
   * argumento depende de que el modelo reciba exactamente lo mismo que recibía:
   * si los dos trozos dejan de recomponer el original —un corte que se lleva un
   * salto de línea, un titular renombrado a medias— el mayordomo cambia de
   * comportamiento sin que nadie lo haya pedido, y en un juego que ya está en
   * producción.
   *
   * Se comprueba en los tres, porque los tres traen su prompt entero.
   */
  console.log('\n· El prompt partido para la cache');
  // La misma partida con el manifiesto de las Sombras: aquí no se mira el
  // contenido, se mira que el corte caiga en su sitio en las tres ramas.
  const gameSombras = {
    ...gameMomia,
    id: 'secretos-sombras',
    settings: { ...gameMomia.settings, juego: 'sombras' },
  } as unknown as typeof gameMomia;

  for (const [nombre, partida] of [
    ['CLUEDO', game],
    ['la Momia', gameMomia],
    ['las Sombras', gameSombras],
  ] as const) {
    const entero = buildSystemPrompt(partida);
    const { estable, volatil } = bloquesDeSistema(partida);
    comprobar(`en ${nombre} los dos trozos recomponen el prompt`, estable + volatil === entero);
    comprobar(`en ${nombre} el corte cae donde empieza el inventario`, volatil.startsWith('# ESTADO ACTUAL DE LA PARTIDA'));
    /*
     * Y el trozo cacheado tiene que ser GRANDE: por debajo del mínimo que pide
     * la API la marca no hace nada, y la mejora sería imaginaria. Mil tokens es
     * el mínimo; se pide holgura sobre él en caracteres.
     */
    comprobar(`en ${nombre} el trozo cacheado supera el mínimo de la API`, estable.length > 5000, estable.length);
    comprobar(`en ${nombre} el corte deja fuera de la cache lo que cambia`, !estable.includes('# ESTADO ACTUAL'));
  }

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

  console.log('\n· El Escriba, en El Misterio de la Momia');
  /*
   * El mismo par de comprobaciones sobre el otro juego. No sobra por ser «lo
   * mismo con otro manifiesto»: son OTRA rama de `buildSystemPrompt` y OTRA de
   * `get_game_state`, escritas aparte, y lo que garantiza una no garantiza nada
   * sobre la otra. La primera vez que alguien meta aquí «un resumen de la trama
   * para que el Escriba ayude mejor», es esta línea la que se pone roja.
   */
  const promptMomia = buildSystemPrompt(gameMomia);
  comprobar('el prompt del Escriba se compone', promptMomia.length > 100);
  comprobar('y habla de la Momia, no de CLUEDO', promptMomia.includes('Escriba'), promptMomia.slice(0, 60));
  const enPromptMomia = filtrados(promptMomia);
  comprobar('y NO lleva ni un secreto dentro', enPromptMomia.length === 0, enPromptMomia);

  const estadoMomia = await executeTool(gameMomia, 'get_game_state', {});
  const momiaTexto = JSON.stringify(estadoMomia);
  comprobar(
    'get_game_state responde de verdad en la Momia',
    !momiaTexto.includes('desconocida') && momiaTexto.includes('ritos'),
    estadoMomia,
  );
  const enEstadoMomia = filtrados(momiaTexto);
  comprobar('y NO lleva ni un secreto dentro', enEstadoMomia.length === 0, enEstadoMomia);

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
