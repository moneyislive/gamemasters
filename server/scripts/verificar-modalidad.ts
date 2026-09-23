/**
 * LA MODALIDAD DE LA MESA: `normal` o `botas`, elegida al abrir y para siempre.
 *
 *   npm run verify:modalidad
 *
 * ═══ QUÉ AFIRMA ESTE FICHERO ═══
 *
 * La decisión 3 de Miguel del 20-sep-2026 (`docs/BOOTS-ON-BOARD.md`): una mesa se abre en
 * modalidad `normal` —el tablero desde arriba— o `botas` —bajar al tablero—, y NO CAMBIA. Lo que
 * se comprueba, por las dos puertas —en proceso contra `mesas.ts`, y por el cable contra un
 * servidor levantado de verdad—:
 *
 *  1. Sin decir nada, la mesa es `normal`, y la vista lo dice.
 *  2. `botas` sólo se abre para un juego que la ADMITE, y hoy no la admite ninguno: el registro
 *     de `modalidades.ts` nace vacío. Se da de alta un juego en la prueba y entonces sí.
 *  3. Un valor raro —otra palabra, otra capitalización, un número, un nulo— es un 400 legible y
 *     no deja mesa detrás.
 *  4. La modalidad SOBREVIVE a que el proceso muera, y un fichero de antes del campo —o con una
 *     palabra que este servidor no conoce— se lee como `normal`.
 *  5. Y el acceso de SOLO LECTURA que usará el canal de Boots on Board: dada una llave, qué
 *     silla es, o nulo. Sin proyectar, sin meter el tic, sin marcar presencia y sin escribir. Y
 *     también sobre una mesa FRÍA —sólo en el disco, y que el juego da por acabada aunque su
 *     fichero no—: la mira allí, no la trae a la memoria, no la cierra y no toca el fichero.
 *
 * ═══ POR QUÉ LAS DOS PUERTAS Y NO UNA ═══
 *
 * Porque cada una ve lo que la otra no. En proceso se ve lo que no sale por el cable —que la
 * autoridad, llamada desde otra puerta que no sea la ruta, se niega igual; que el acceso por llave
 * no proyecta, contado—. Por el cable se ve lo que en proceso no existe: el arranque de verdad
 * con su registro vacío, la ruta con sus 400, y un proceso nuevo leyendo lo que escribió el viejo.
 * Es la lección de esta casa escrita dos veces: verde en proceso, roto al arrancar.
 *
 * El juego que se da de alta como recorrible se da de alta con un ENVOLTORIO que importa
 * `modalidades.ts`, llama a `admitirBotas` y después importa el servidor tal cual, sin tocarlo.
 * Es la técnica de `verify:mesa` para instalar un arcade roto: no hay variable de entorno para
 * esto, a propósito, porque una costura de prueba que se enciende desde el panel es una puerta.
 */
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { instalarArcade, olvidarArcade, rechazar } from '../../shared/arcade';
import type { ManifiestoDeArcade, Movimiento } from '../../shared/arcade';

const REPO = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const TSX = path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SERVIDOR = path.join(REPO, 'server', 'src', 'index.ts');
const MODALIDADES_TS = path.join(REPO, 'server', 'src', 'arcade', 'modalidades.ts');

/*
 * La carpeta de las mesas de la mitad EN PROCESO, antes de cargar `mesas.ts`: `MESAS_DIR` se lee
 * al cargarse el módulo, y sin esto este comprobador escribiría mesas de mentira en la carpeta de
 * datos del portátil. Por eso `mesas.ts` se importa a mano, más abajo, y no arriba.
 */
const CARPETA = fs.mkdtempSync(path.join(os.tmpdir(), 'modalidad-'));
const MESAS_EN_PROCESO = path.join(CARPETA, 'en-proceso');
const MESAS_DEL_SERVIDOR = path.join(CARPETA, 'servidor');
process.env.MESAS_DIR = MESAS_EN_PROCESO;

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  const cola = detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 500)}`;
  fallos.push(`${que}${cola}`);
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

function dormir(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Lo que lanza una promesa, o `undefined` si no lanza. */
async function loQueLanza(hacer: () => Promise<unknown>): Promise<unknown> {
  try {
    await hacer();
    return undefined;
  } catch (error) {
    return error;
  }
}

function nombreDe(error: unknown): string {
  return error instanceof Error ? error.name : String(error);
}

// ---------------------------------------------------------------------------
// EL ARCADE DE PRUEBA, QUE CUENTA SUS PROYECCIONES
// ---------------------------------------------------------------------------

/**
 * EL MIRADOR. Un juego de mesa mínimo cuya proyección se cuenta.
 *
 * Hace falta uno propio y no uno de la casa por lo que se quiere afirmar del acceso por llave: que
 * NO PROYECTA. Eso sólo se puede afirmar contando, y contar las proyecciones de un juego de la casa
 * obligaría a sustituirle la suya en el registro global y acordarse de devolvérsela. Éste nace y
 * muere aquí.
 *
 * El tic CAMBIA el estado a propósito: si el acceso por llave metiera el tic de un plazo vencido,
 * la revisión subiría y se vería.
 */
const MIRADOR = 'el-mirador';
let proyecciones = 0;

interface EstadoDelMirador {
  tics: number;
  jugadas: number;
  /** Sólo lo traen las mesas escritas a mano: jugando, el Mirador no llega nunca a acabarse. */
  fin?: boolean;
}

const manifiestoDelMirador: ManifiestoDeArcade = {
  id: MIRADOR,
  nombre: 'El Mirador',
  gancho: 'Una prueba de modalidad, y nada más.',
  icono: 'mando',
  jugadores: { minimo: 1, maximo: 4 },
  sede: 'servidor',
  tickHz: 0,
  mueble: 'formulario',
  secretos: false,
  marcador: { tipo: 'ninguno' },
  procedencia: { tipo: 'creacion-propia' },
};

instalarArcade<EstadoDelMirador | undefined>({
  manifiesto: manifiestoDelMirador,
  avanzar: (estado: EstadoDelMirador | undefined, movimiento: Movimiento) => {
    const actual = estado ?? { tics: 0, jugadas: 0 };
    if (movimiento.tipo === 'arcade:tic') return { ...actual, tics: actual.tics + 1 };
    if (movimiento.tipo === 'jugar') return { ...actual, jugadas: actual.jugadas + 1 };
    return rechazar(actual, 'Eso no es una jugada del Mirador.');
  },
  proyeccion: (estado: EstadoDelMirador | undefined) => {
    proyecciones++;
    return estado ?? null;
  },
  /* Acaba sólo si su estado lo dice, y eso sólo lo escribe a mano la prueba de la mesa fría. */
  seAcabo: (estado: EstadoDelMirador | undefined) => estado?.fin === true,
});

const mesas = await import('../src/arcade/mesas');
const { admitirBotas, admiteBotas, dejarDeAdmitirBotas, arcadesQueAdmitenBotas } = await import(
  '../src/arcade/modalidades'
);
const { senalEnMemoria } = await import('../src/mecanicas/presencia');

function ficherosEnProceso(): string[] {
  try {
    return fs.readdirSync(MESAS_EN_PROCESO).filter((n) => n.endsWith('.json'));
  } catch {
    return [];
  }
}

function leerElFichero(carpeta: string, codigo: string): any {
  return JSON.parse(fs.readFileSync(path.join(carpeta, `${codigo}.json`), 'utf8'));
}

// ---------------------------------------------------------------------------
// PRIMERA MITAD · EN PROCESO, CONTRA LA AUTORIDAD
// ---------------------------------------------------------------------------

paso('En proceso: sin decir nada, la mesa es normal');

const normal = await mesas.abrir({ arcade: MIRADOR, nombre: 'Ana', plazoSegundos: 0 });
{
  comprobar('la mesa guarda su modalidad', normal.mesa.modalidad === 'normal', normal.mesa.modalidad);
  const vista = await mesas.mirar(normal.mesa.codigo, normal.silla.llave);
  comprobar('y la vista la dice', vista.modalidad === 'normal', vista.modalidad);
  const enDisco = leerElFichero(MESAS_EN_PROCESO, normal.mesa.codigo);
  comprobar(
    'y el fichero la lleva, en la MISMA versión 2: un campo nuevo que un lector viejo ignora no sube el número',
    enDisco.mesa?.modalidad === 'normal' && enDisco.version === 2,
    { modalidad: enDisco.mesa?.modalidad, version: enDisco.version },
  );
}

paso('En proceso: `botas` sólo para un juego que la admite, y hoy no la admite ninguno');

{
  comprobar(
    'el registro nace VACÍO: hoy ningún juego ha declarado su mundo',
    arcadesQueAdmitenBotas().length === 0,
    arcadesQueAdmitenBotas(),
  );
  const antes = { vivas: mesas.mesasVivas(), ficheros: ficherosEnProceso().length };
  const sinAdmitir = await loQueLanza(() =>
    mesas.abrir({ arcade: MIRADOR, nombre: 'Bea', modalidad: 'botas' }),
  );
  comprobar(
    'pedir `botas` para un juego que no la admite lanza ModalidadNoAdmitida desde la AUTORIDAD, no sólo desde la ruta',
    sinAdmitir instanceof mesas.ModalidadNoAdmitida,
    nombreDe(sinAdmitir),
  );
  comprobar(
    'y no deja mesa detrás, ni en memoria ni en disco',
    mesas.mesasVivas() === antes.vivas && ficherosEnProceso().length === antes.ficheros,
    { antes, ahora: { vivas: mesas.mesasVivas(), ficheros: ficherosEnProceso().length } },
  );
}

admitirBotas(MIRADOR);
const botas = await mesas.abrir({ arcade: MIRADOR, nombre: 'Cid', plazoSegundos: 1, modalidad: 'botas' });
{
  comprobar('dado de alta el juego, la mesa `botas` se abre', botas.mesa.modalidad === 'botas', botas.mesa.modalidad);
  comprobar('y la tabla de altas lo dice', admiteBotas(MIRADOR) && arcadesQueAdmitenBotas().includes(MIRADOR));
  const vista = await mesas.mirar(botas.mesa.codigo, botas.silla.llave);
  comprobar('y su vista dice `botas`', vista.modalidad === 'botas', vista.modalidad);
  const deOtro = await mesas.mirar(botas.mesa.codigo, null);
  comprobar('también para quien mira sin asiento: es de la mesa, no de nadie', deOtro.modalidad === 'botas');
  const enDisco = leerElFichero(MESAS_EN_PROCESO, botas.mesa.codigo);
  comprobar('y está en el disco', enDisco.mesa?.modalidad === 'botas', enDisco.mesa?.modalidad);
}

paso('En proceso: un valor raro se rechaza y no se arregla');

{
  for (const raro of ['volar', 'Botas', 'NORMAL', ' botas', '', 7, null, true, { modalidad: 'botas' }]) {
    const antes = mesas.mesasVivas();
    const error = await loQueLanza(() =>
      mesas.abrir({ arcade: MIRADOR, nombre: 'Dan', modalidad: raro as never }),
    );
    comprobar(
      `«${JSON.stringify(raro)}» lanza ModalidadDesconocida y no abre nada`,
      error instanceof mesas.ModalidadDesconocida && mesas.mesasVivas() === antes,
      { error: nombreDe(error), antes, ahora: mesas.mesasVivas() },
    );
  }
}

paso('En proceso: ningún verbo cambia la modalidad');

{
  const silla = await mesas.sentarse(botas.mesa.codigo, 'Eva');
  const vista = await mesas.mirar(botas.mesa.codigo, silla.llave);
  const jugada = await mesas.mover(botas.mesa.codigo, silla.llave, vista.rev, { tipo: 'jugar' });
  await mesas.vestir(botas.mesa.codigo, silla.llave, 'centinela');
  const cerrada = await mesas.cerrar(botas.mesa.codigo, silla.llave);
  comprobar(
    'sentarse, mover, vestirse y cerrar dejan la mesa en `botas`',
    jugada.modalidad === 'botas' && cerrada.modalidad === 'botas' && botas.mesa.modalidad === 'botas',
    { jugada: jugada.modalidad, cerrada: cerrada.modalidad, tabla: botas.mesa.modalidad },
  );
  /*
   * Los verbos de `mesas.ts` empiezan en minúscula y las clases de error en mayúscula: de los que
   * nombran la modalidad, el único verbo que puede haber es la pregunta de forma. Un
   * `cambiarModalidad` que alguien añadiera «para un caso» pondría esto rojo.
   */
  const verbos = Object.keys(mesas).filter(
    (k) => /modalidad/i.test(k) && /^[a-z]/.test(k) && typeof (mesas as Record<string, unknown>)[k] === 'function',
  );
  comprobar(
    'y no hay ningún verbo exportado para cambiarla: sólo la pregunta de forma',
    verbos.length === 1 && verbos[0] === 'esModalidad',
    verbos,
  );
}

paso('En proceso: quién es esta llave, SIN mirar la partida');

{
  /*
   * Una mesa `botas` nueva, con el plazo vencido a propósito: si el acceso por llave metiera el
   * tic —como hace `mirar`—, la revisión y el tic subirían. Y se cuentan las proyecciones.
   */
  const otra = await mesas.abrir({ arcade: MIRADOR, nombre: 'Fede', plazoSegundos: 1, modalidad: 'botas' });
  const segunda = await mesas.sentarse(otra.mesa.codigo, 'Gala');
  await dormir(1200);

  const m = otra.mesa;
  const antes = {
    rev: m.mesa.rev,
    tic: m.mesa.tic,
    venceEn: m.venceEn,
    estado: m.mesa.estado,
    proyecciones,
    fichero: fs.readFileSync(path.join(MESAS_EN_PROCESO, `${m.codigo}.json`), 'utf8'),
    presencia: senalEnMemoria(`arcade:${m.codigo}`, segunda.id),
  };
  comprobar('el plazo ya ha vencido, que si no lo de abajo no mediría nada', (m.venceEn ?? Infinity) <= Date.now(), m.venceEn);

  const buena = await mesas.quienEsLaLlave(m.codigo, segunda.llave);
  comprobar(
    'con su llave, devuelve SU asiento, con su nombre y la modalidad de la mesa',
    buena !== null && buena.id === segunda.id && buena.nombre === 'Gala' && buena.modalidad === 'botas',
    buena,
  );
  comprobar(
    'y NUNCA la llave: la respuesta no la lleva ni como clave',
    buena !== null && !('llave' in buena) && !JSON.stringify(buena).includes(segunda.llave),
    buena,
  );
  const dePrimera = await mesas.quienEsLaLlave(m.codigo, otra.silla.llave);
  comprobar('la llave de quien abrió es la de quien abrió', dePrimera?.id === otra.silla.id, dePrimera);

  comprobar('una llave inventada es nulo', (await mesas.quienEsLaLlave(m.codigo, 'X'.repeat(24))) === null);
  comprobar(
    'y la llave BUENA DE OTRA MESA, también nulo: una llave vale en su mesa y en ninguna más',
    (await mesas.quienEsLaLlave(m.codigo, normal.silla.llave)) === null,
  );
  comprobar('sin llave, nulo', (await mesas.quienEsLaLlave(m.codigo, null)) === null);
  comprobar('con la llave vacía, nulo', (await mesas.quienEsLaLlave(m.codigo, '')) === null);
  const deNinguna = await loQueLanza(() => mesas.quienEsLaLlave('QQQQQ', segunda.llave));
  comprobar(
    'y con una mesa que no existe, nulo y no un error: «no existe» y «no es tuya» contestan lo mismo',
    deNinguna === undefined && (await mesas.quienEsLaLlave('QQQQQ', segunda.llave)) === null,
    nombreDe(deNinguna),
  );

  comprobar(
    'NO PROYECTA: el contador de proyecciones no se ha movido',
    proyecciones === antes.proyecciones,
    { antes: antes.proyecciones, ahora: proyecciones },
  );
  comprobar(
    'NO METE EL TIC aunque el plazo haya vencido: ni revisión, ni tic, ni plazo, ni estado',
    m.mesa.rev === antes.rev && m.mesa.tic === antes.tic && m.venceEn === antes.venceEn && m.mesa.estado === antes.estado,
    { antes: { rev: antes.rev, tic: antes.tic, venceEn: antes.venceEn }, ahora: { rev: m.mesa.rev, tic: m.mesa.tic, venceEn: m.venceEn } },
  );
  comprobar(
    'NO ESCRIBE: el fichero de la mesa está byte a byte como estaba',
    fs.readFileSync(path.join(MESAS_EN_PROCESO, `${m.codigo}.json`), 'utf8') === antes.fichero,
  );
  comprobar(
    'NO MARCA PRESENCIA: reconocer una llave no es «se le ha visto»',
    senalEnMemoria(`arcade:${m.codigo}`, segunda.id) === antes.presencia,
    { antes: antes.presencia, ahora: senalEnMemoria(`arcade:${m.codigo}`, segunda.id) },
  );
  comprobar('y no deja ningún candado suelto', mesas.candadosDeMesaVivos() === 0, mesas.candadosDeMesaVivos());

  /* La vacuna: `mirar` sobre la misma mesa SÍ proyecta y SÍ mete el tic. */
  const mirada = await mesas.mirar(m.codigo, segunda.llave);
  comprobar(
    'y la vacuna: `mirar` sobre la misma mesa sí proyecta y sí mete el tic, así que lo de arriba mide algo',
    proyecciones > antes.proyecciones && mirada.tic === antes.tic + 1 && mirada.rev > antes.rev,
    { proyecciones, tic: mirada.tic, rev: mirada.rev },
  );
}

paso('En proceso: y sobre una mesa FRÍA, reconocer una llave no la trae, no la cierra y no escribe');

{
  /*
   * Lo de arriba mide una mesa que está en memoria. Faltaba la FRÍA: una que sólo está en el disco
   * y que el juego da por acabada aunque su fichero no lo diga —la guardó un servidor de antes de
   * que las mesas se cerraran solas—. Traerla a la memoria la cierra y la escribe (revisión 5 → 6),
   * que es justo lo que este acceso promete no hacer. Se escribe a mano y no se pide nunca antes.
   */
  const codigo = 'FRIA1';
  const llave = 'LLAVEDELAFRIA00000000000';
  const fichero = path.join(MESAS_EN_PROCESO, `${codigo}.json`);
  const ahora = Date.now();
  fs.writeFileSync(
    fichero,
    JSON.stringify({
      version: 2,
      mesa: {
        codigo,
        mesa: {
          id: codigo,
          arcade: MIRADOR,
          asientos: ['aFRIA0000'],
          estado: { tics: 0, jugadas: 3, fin: true },
          rev: 5,
          tic: 0,
          semilla: 7,
          terminada: false,
          diario: [],
          empezada: true,
        },
        sillas: [{ id: 'aFRIA0000', nombre: 'Hugo', llave, figura: 'centinela' }],
        plazoMs: 0,
        venceEn: null,
        turnoDesde: ahora,
        abiertaEn: ahora,
        ultimoToqueEn: ahora,
        modalidad: 'botas',
      },
    }),
    'utf8',
  );
  const antes = { fichero: fs.readFileSync(fichero, 'utf8'), memoria: mesas.memoriaDeLasMesas(), proyecciones };

  const quien = await mesas.quienEsLaLlave(codigo, llave);
  comprobar(
    'con la mesa FRÍA reconoce la llave: su asiento, su nombre, su figura y la modalidad de la mesa',
    quien !== null && quien.id === 'aFRIA0000' && quien.nombre === 'Hugo' && quien.figura === 'centinela' && quien.modalidad === 'botas',
    quien,
  );
  const enDisco = leerElFichero(MESAS_EN_PROCESO, codigo);
  comprobar(
    'y NO ESCRIBE: el fichero sigue byte a byte, aunque el juego dé la partida por acabada',
    fs.readFileSync(fichero, 'utf8') === antes.fichero,
    { rev: enDisco.mesa?.mesa?.rev, terminada: enDisco.mesa?.mesa?.terminada },
  );
  comprobar(
    'ni la trae a la memoria: la mira en el disco y la deja donde estaba',
    mesas.memoriaDeLasMesas().enMemoria === antes.memoria.enMemoria &&
      mesas.memoriaDeLasMesas().leidasDelDisco === antes.memoria.leidasDelDisco,
    { antes: antes.memoria, ahora: mesas.memoriaDeLasMesas() },
  );
  comprobar('ni proyecta', proyecciones === antes.proyecciones, { antes: antes.proyecciones, ahora: proyecciones });
  comprobar(
    'y una llave que no es de ella, nulo también en frío',
    (await mesas.quienEsLaLlave(codigo, 'X'.repeat(24))) === null,
  );
  comprobar('y no deja ningún candado suelto', mesas.candadosDeMesaVivos() === 0, mesas.candadosDeMesaVivos());

  /* La vacuna: `mirar` sí la trae, la cierra y la escribe. */
  const mirada = await mesas.mirar(codigo, llave);
  const trasMirar = leerElFichero(MESAS_EN_PROCESO, codigo);
  comprobar(
    'y la vacuna: `mirar` sí la trae, la cierra y la escribe (revisión 5 → 6), así que lo de arriba mide algo',
    mirada.terminada && mirada.rev === 6 && trasMirar.mesa?.mesa?.terminada === true && trasMirar.mesa?.mesa?.rev === 6,
    { terminada: mirada.terminada, rev: mirada.rev, enDisco: trasMirar.mesa?.mesa?.rev },
  );
}

dejarDeAdmitirBotas(MIRADOR);
comprobar('y al terminar se devuelve el registro a vacío', arcadesQueAdmitenBotas().length === 0, arcadesQueAdmitenBotas());

// ---------------------------------------------------------------------------
// SEGUNDA MITAD · POR EL CABLE, CON EL SERVIDOR DE VERDAD
// ---------------------------------------------------------------------------

/**
 * UN PUERTO QUE EL SISTEMA DICE QUE ESTÁ LIBRE, y no uno de `.claude/launch.json`, que apuntan a
 * otros árboles de trabajo: un comprobador que cae en uno de ellos sale verde midiendo el trabajo
 * de otra rama y escribiéndole mesas en su almacén.
 */
async function puertoLibre(): Promise<number> {
  const { createServer } = await import('node:net');
  return new Promise<number>((resolver, rechazar) => {
    const sonda = createServer();
    sonda.once('error', rechazar);
    sonda.listen(0, '127.0.0.1', () => {
      const donde = sonda.address();
      const puerto = typeof donde === 'object' && donde !== null ? donde.port : 0;
      sonda.close(() => resolver(puerto));
    });
  });
}

const PUERTO = await puertoLibre();
const BASE = `http://127.0.0.1:${PUERTO}/api`;

interface Respuesta {
  estado: number;
  datos: any;
}

async function pedir(
  ruta: string,
  opciones: { metodo?: string; cuerpo?: unknown; llave?: string | null } = {},
): Promise<Respuesta> {
  const r = await fetch(`${BASE}${ruta}`, {
    method: opciones.metodo ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opciones.llave ? { 'x-asiento': opciones.llave } : {}),
    },
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

/**
 * EL ENVOLTORIO: da de alta Riberas como recorrible y DESPUÉS importa el servidor tal cual.
 *
 * Riberas y no La Ronda a propósito: así la misma prueba enseña las dos caras —un juego dado de
 * alta abre `botas`, uno que no, no— con dos juegos de verdad y el mismo servidor.
 */
const ENVOLTORIO = path.join(CARPETA, 'con-botas.mts');
fs.writeFileSync(
  ENVOLTORIO,
  `const { admitirBotas } = await import(${JSON.stringify(pathToFileURL(MODALIDADES_TS).href)});
admitirBotas('riberas');
await import(${JSON.stringify(pathToFileURL(SERVIDOR).href)});
`,
  'utf8',
);

let loQueDijoElServidor = '';
let servidor: ChildProcess | undefined;

function levantar(conBotas: boolean): ChildProcess {
  const proceso = spawn(process.execPath, [TSX, conBotas ? ENVOLTORIO : SERVIDOR], {
    cwd: CARPETA,
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      PORT: String(PUERTO),
      NODE_ENV: 'test',
      MESAS_DIR: MESAS_DEL_SERVIDOR,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  loQueDijoElServidor = '';
  const anotar = (d: Buffer): void => {
    loQueDijoElServidor += d.toString();
  };
  proceso.stdout?.on('data', anotar);
  proceso.stderr?.on('data', anotar);
  return proceso;
}

async function esperarAlServidor(): Promise<void> {
  for (let i = 0; i < 200; i++) {
    try {
      const r = await fetch(`${BASE}/salud`);
      if (r.ok) return;
    } catch {
      /* todavía no escucha */
    }
    await dormir(250);
  }
  throw new Error(`el servidor no arrancó en el puerto ${PUERTO}. Dijo:\n${loQueDijoElServidor.slice(-1500)}`);
}

function esperarAQueMuera(proceso: ChildProcess): Promise<void> {
  return new Promise((resolver) => {
    if (proceso.exitCode !== null || proceso.signalCode !== null) {
      resolver();
      return;
    }
    proceso.once('exit', () => resolver());
  });
}

async function reiniciar(conBotas: boolean): Promise<void> {
  if (servidor) {
    servidor.kill();
    await esperarAQueMuera(servidor);
  }
  servidor = levantar(conBotas);
  await esperarAlServidor();
}

try {
  paso('Por el cable: el servidor de verdad arranca SIN ningún juego que admita `botas`');

  await reiniciar(false);
  {
    const pedida = await pedir('/arcade/mesas', {
      metodo: 'POST',
      cuerpo: { arcade: 'riberas', nombre: 'Ana', modalidad: 'botas' },
    });
    comprobar(
      'sin el alta, `botas` para Riberas es un 400 que dice por qué',
      pedida.estado === 400 && pedida.datos.motivo === 'modalidad-no-admitida',
      pedida,
    );
    comprobar(
      'y el mensaje ofrece la salida: la modalidad normal',
      typeof pedida.datos.error === 'string' && pedida.datos.error.includes('normal'),
      pedida.datos.error,
    );
  }

  paso('Por el cable: con Riberas dado de alta, se abre y se lee en las dos modalidades');

  await reiniciar(true);
  const abiertas: Record<string, { codigo: string; llave: string }> = {};
  {
    const sinDecir = await pedir('/arcade/mesas', { metodo: 'POST', cuerpo: { arcade: 'riberas', nombre: 'Ana' } });
    comprobar('sin `modalidad` se abre, y en `normal`', sinDecir.estado === 201 && sinDecir.datos.mesa?.modalidad === 'normal', sinDecir);
    abiertas.normal = { codigo: sinDecir.datos.codigo, llave: sinDecir.datos.llave };

    const conBotas = await pedir('/arcade/mesas', {
      metodo: 'POST',
      cuerpo: { arcade: 'riberas', nombre: 'Bea', modalidad: 'botas' },
    });
    comprobar('con `botas` y el juego dado de alta, 201 y `botas`', conBotas.estado === 201 && conBotas.datos.mesa?.modalidad === 'botas', conBotas);
    abiertas.botas = { codigo: conBotas.datos.codigo, llave: conBotas.datos.llave };

    const explicita = await pedir('/arcade/mesas', {
      metodo: 'POST',
      cuerpo: { arcade: 'riberas', nombre: 'Cid', modalidad: 'normal' },
    });
    comprobar('`normal` dicho en voz alta también vale', explicita.estado === 201 && explicita.datos.mesa?.modalidad === 'normal', explicita);

    /* Dos más que se van a estropear a mano antes del reinicio. */
    for (const nombre of ['vieja', 'rara']) {
      const r = await pedir('/arcade/mesas', {
        metodo: 'POST',
        cuerpo: { arcade: 'riberas', nombre, modalidad: 'botas' },
      });
      comprobar(`la mesa «${nombre}» se abre en botas`, r.estado === 201, r);
      abiertas[nombre] = { codigo: r.datos.codigo, llave: r.datos.llave };
    }

    const deLaRonda = await pedir('/arcade/mesas', {
      metodo: 'POST',
      cuerpo: { arcade: 'la-ronda', nombre: 'Dan', modalidad: 'botas' },
    });
    comprobar(
      'y La Ronda, que no está dada de alta, sigue sin poder: 400 con su motivo y su juego',
      deLaRonda.estado === 400 && deLaRonda.datos.motivo === 'modalidad-no-admitida' && deLaRonda.datos.arcade === 'la-ronda',
      deLaRonda,
    );

    for (const raro of ['volar', 'Botas', 7, null, ['botas']]) {
      const r = await pedir('/arcade/mesas', {
        metodo: 'POST',
        cuerpo: { arcade: 'riberas', nombre: 'Eva', modalidad: raro },
      });
      comprobar(
        `«${JSON.stringify(raro)}» es un 400 legible, no un 500 ni una mesa normal`,
        r.estado === 400 &&
          r.datos.motivo === 'modalidad-desconocida' &&
          typeof r.datos.error === 'string' &&
          r.datos.error.includes('«normal»') &&
          r.datos.error.includes('«botas»'),
        r,
      );
    }

    const desdeElAsiento = await pedir(`/arcade/mesas/${abiertas.botas.codigo}`, { llave: abiertas.botas.llave });
    const desdeFuera = await pedir(`/arcade/mesas/${abiertas.botas.codigo}`);
    comprobar(
      'la lectura dice `botas` a quien está sentado y a quien mira de fuera',
      desdeElAsiento.datos.mesa?.modalidad === 'botas' && desdeFuera.datos.mesa?.modalidad === 'botas',
      { asiento: desdeElAsiento.datos.mesa?.modalidad, fuera: desdeFuera.datos.mesa?.modalidad },
    );
  }

  paso('Por el cable: el proceso muere, y la modalidad sigue ahí');

  {
    /*
     * Dos ficheros se estropean A MANO con el servidor vivo: a uno se le quita el campo —que es
     * exactamente una mesa guardada antes de que existiera— y a otro se le pone una palabra que
     * este servidor no conoce. Se mata sin volcar, así que lo que arranca lee lo editado.
     */
    const vieja = leerElFichero(MESAS_DEL_SERVIDOR, abiertas.vieja.codigo);
    delete vieja.mesa.modalidad;
    fs.writeFileSync(path.join(MESAS_DEL_SERVIDOR, `${abiertas.vieja.codigo}.json`), JSON.stringify(vieja), 'utf8');
    const rara = leerElFichero(MESAS_DEL_SERVIDOR, abiertas.rara.codigo);
    rara.mesa.modalidad = 'volar';
    fs.writeFileSync(path.join(MESAS_DEL_SERVIDOR, `${abiertas.rara.codigo}.json`), JSON.stringify(rara), 'utf8');

    await reiniciar(true);

    const laBotas = await pedir(`/arcade/mesas/${abiertas.botas.codigo}`, { llave: abiertas.botas.llave });
    comprobar(
      'la mesa `botas` vuelve `botas` en el proceso nuevo, y con su llave',
      laBotas.estado === 200 && laBotas.datos.mesa?.modalidad === 'botas' && laBotas.datos.mesa?.yo !== null,
      laBotas.datos,
    );
    const laNormal = await pedir(`/arcade/mesas/${abiertas.normal.codigo}`);
    comprobar('y la normal, normal', laNormal.estado === 200 && laNormal.datos.mesa?.modalidad === 'normal', laNormal.datos);
    const laVieja = await pedir(`/arcade/mesas/${abiertas.vieja.codigo}`);
    comprobar(
      'un fichero SIN el campo —una mesa de antes— se lee como `normal`, que es lo que era',
      laVieja.estado === 200 && laVieja.datos.mesa?.modalidad === 'normal',
      laVieja.datos,
    );
    const laRara = await pedir(`/arcade/mesas/${abiertas.rara.codigo}`);
    comprobar(
      'uno con una palabra que no se conoce, también `normal`: la única que admite cualquier juego',
      laRara.estado === 200 && laRara.datos.mesa?.modalidad === 'normal',
      laRara.datos,
    );
    comprobar(
      'y ESO SE DICE en el registro, con la palabra que traía: cambiar la modalidad en silencio es lo que la decisión prohíbe',
      loQueDijoElServidor.includes('modalidad que este servidor no conoce') && loQueDijoElServidor.includes('"volar"'),
      loQueDijoElServidor.slice(-600),
    );
  }
} catch (error) {
  fallos.push(`la prueba se cayó: ${error instanceof Error ? error.stack : String(error)}`);
} finally {
  if (servidor) {
    servidor.kill();
    await esperarAQueMuera(servidor);
  }
  olvidarArcade(MIRADOR);
  try {
    fs.rmSync(CARPETA, { recursive: true, force: true });
  } catch {
    /* en Windows un fichero recién cerrado a veces sigue tomado un instante */
  }
}

// ---------------------------------------------------------------------------

console.log('');
if (fallos.length > 0) {
  console.log(`✘ ${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
  for (const f of fallos) console.log(`   · ${f}`);
  process.exit(1);
}

/*
 * EL GUARDIA DE «NO SE HAN HECHO TODAS»: un comprobador que se cae a mitad sin decirlo se parece
 * mucho a uno verde. El número es el que se hace hoy, contado, y se sube al añadir comprobaciones.
 */
const COMPROBACIONES_ESCRITAS = 64;
if (hechas < COMPROBACIONES_ESCRITAS) {
  console.log(
    `Sólo se han hecho ${hechas} de las ${COMPROBACIONES_ESCRITAS} comprobaciones escritas: algo se ha ` +
      'saltado un bloque entero sin decirlo.',
  );
  process.exit(2);
}

console.log(
  `✔ ${hechas} comprobaciones. Una mesa se abre en \`normal\` o en \`botas\` y no cambia: sin decir nada\n` +
    '  es normal, `botas` sólo para un juego dado de alta —y hoy no lo está ninguno—, lo mal escrito es\n' +
    '  un 400 que no deja mesa, la modalidad sobrevive a que el proceso muera, y un fichero de antes se\n' +
    '  lee como normal. Y reconocer una llave no proyecta, no mete el tic, no marca presencia y no\n' +
    '  escribe, tampoco sobre una mesa fría: no la trae a la memoria ni la cierra.',
);
process.exit(0);
