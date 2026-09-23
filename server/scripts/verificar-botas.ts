/**
 * EL CANAL DE BOOTS ON BOARD, DE PUNTA A PUNTA: el servidor de verdad y dos aparatos por `ws`.
 *
 *   npm run verify:botas
 *   npm run verify:botas -- --binario dist/index.js     (contra el COMPILADO, como en Render)
 *
 * ═══ POR QUÉ ESTO ADEMÁS DE `verify:sala-de-botas` ═══
 *
 * Porque aquel prueba las reglas con un reloj de mentira y una mesa de mentira, y lo que puede
 * fallar aquí no está en las reglas: que `index.ts` no enganche el `upgrade`, que la ruta del
 * contrato no sea la que atiende el servidor, que la mesa de verdad no reconozca la llave, que el
 * mundo que deriva el servidor no sea el que deriva el aparato de la MISMA vista, que `ws` se
 * comporte distinto empaquetado que con `tsx`, que la llave acabe en el registro. Es la lección de
 * esta casa escrita dos veces: verde en proceso, roto al arrancar.
 *
 * ═══ LO QUE HACE ═══
 *
 * Levanta el servidor como hijo —puerto pedido al sistema, `MESAS_DIR` y `UPLOADS_DIR` temporales,
 * entorno explícito y su salida capturada—, abre una mesa `botas` de Las Lindes, sienta a tres y
 * la empieza como la empiezan los guiones de Las Lindes (con la opción `lindes:empezar` que manda
 * el propio servidor). Y con clientes `ws`:
 *
 *   · `hola` → `dentro`, en un sitio donde se puede estar según el mundo que ESTA PRUEBA deriva de
 *     la vista de espectador, con la misma función que el servidor (`mundoDeLaMesa`).
 *   · Un paseo LEGAL generado con `pasoDelTic` se acepta entero, y el otro lo ve en sus fotos.
 *   · Un teletransporte, cruzar una MURALLA de verdad del mundo —se va andando hasta ella por un
 *     camino buscado sobre la misma estructura— y correr de más: `corrige` al último sitio bueno.
 *   · Llave mala → 4001; mesa `normal` → 4002; el mismo asiento dos veces → el primero recibe 4003;
 *     un atropello → 4005; sin `hola` → 4000; un mensaje de más de 256 bytes → 1009 (lo corta `ws`).
 *   · Un origen ajeno no abre el canal (403), una ruta que no es la del canal tampoco (404).
 *   · La mesa se cierra → 4006 a todos. El diagnóstico lo cuenta, y el temporizador se para.
 *   · Y la llave no sale NUNCA en lo que escribe el servidor.
 *
 * Con SUELOS: fotos recibidas, pasos aceptados y correcciones. Una prueba que no corrige nada no
 * demuestra que se corrija.
 */
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WebSocket } from 'ws';
import { CIERRE, leerMensajeDelServidor, rutaDelCanal, VERSION_DEL_CANAL } from '../../shared/mecanicas/canal-de-botas';
import type { MensajeDelServidor } from '../../shared/mecanicas/canal-de-botas';
import { pasoDelTic, RADIO_DEL_PASEANTE, TICS_POR_SEGUNDO } from '../../shared/mecanicas/andar';
import { deNumero, UNO } from '../../shared/mecanicas/fijo';
import { arenaDe, seAndaEnRecta, sePuedeEstar } from '../../shared/mecanicas/mundo';
import type { Andante, Arena } from '../../shared/mecanicas/mundo';
import { arcadesQueSeRecorren, mundoDeLaMesa, SEMILLA_DE_PORTADA_DE_LAS_LINDES } from '../../shared/arcade/juegos/mundos';
import { cuerposDeLasLindes } from '../../shared/arcade/juegos/lindes-mundo';
import { tableroEnTres } from '../../shared/arcade/juegos/lindes-en-tres';
import { LINDES } from '../../shared/arcade/juegos/lindes';
import { semillaDelCodigo } from '../../shared/mecanicas/semilla';
import { seAndaElTramo, UN_TIC_CON_HOLGURA } from '../src/botas/canal';

const REPO = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const TSX = path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SERVIDOR = path.join(REPO, 'server', 'src', 'index.ts');

const args = process.argv.slice(2);
const iBinario = args.indexOf('--binario');
const BINARIO = iBinario >= 0 && args[iBinario + 1] !== undefined ? path.resolve(REPO, 'server', args[iBinario + 1] as string) : null;

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  const cola = detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 600)}`;
  fallos.push(`${que}${cola}`);
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

function dormir(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const U = UNO;

// ---------------------------------------------------------------------------
// EL SERVIDOR, COMO HIJO
// ---------------------------------------------------------------------------

/**
 * UN PUERTO QUE EL SISTEMA DICE QUE ESTÁ LIBRE, y no uno de `.claude/launch.json`, que apuntan a
 * otros árboles de trabajo: un comprobador que cae en uno de ellos sale verde midiendo el trabajo
 * de otra rama.
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
const BASE = `http://127.0.0.1:${String(PUERTO)}/api`;
const CARPETA = fs.mkdtempSync(path.join(os.tmpdir(), 'botas-'));
let loQueDijoElServidor = '';
let servidor: ChildProcess | undefined;

function levantar(): ChildProcess {
  /*
   * Con `--binario`, el COMPILADO con `node` y el directorio en `server/`, que es como lo arranca
   * Render (`npm start` delega en el workspace). Si no, `index.ts` con `tsx` desde una carpeta
   * temporal. Las dos con el mismo entorno explícito: nada del de quien lanza la prueba.
   */
  const orden = BINARIO === null ? [TSX, SERVIDOR] : [BINARIO];
  const donde = BINARIO === null ? CARPETA : path.join(REPO, 'server');
  const proceso = spawn(process.execPath, orden, {
    cwd: donde,
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      PORT: String(PUERTO),
      NODE_ENV: 'test',
      MESAS_DIR: path.join(CARPETA, 'mesas'),
      UPLOADS_DIR: path.join(CARPETA, 'subidas'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
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
  throw new Error(`el servidor no arrancó en el puerto ${String(PUERTO)}. Dijo:\n${loQueDijoElServidor.slice(-1500)}`);
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

interface Respuesta {
  estado: number;
  datos: any;
}

async function pedir(ruta: string, opciones: { metodo?: string; cuerpo?: unknown; llave?: string } = {}): Promise<Respuesta> {
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

// ---------------------------------------------------------------------------
// UN APARATO: UN CLIENTE `ws`
// ---------------------------------------------------------------------------

/** Un aparato por el cable. Todo lo que recibe se lee con el lector ESTRICTO del contrato. */
class Aparato {
  readonly ws: WebSocket;
  readonly crudos: string[] = [];
  readonly mensajes: (MensajeDelServidor | null)[] = [];
  cierre: { codigo: number; razon: string } | null = null;
  rechazo: number | null = null;
  readonly abierto: Promise<boolean>;
  n = 0;
  x = 0;
  z = 0;

  constructor(codigo: string, opciones: { origen?: string; ruta?: string } = {}) {
    const url = `ws://127.0.0.1:${String(PUERTO)}${opciones.ruta ?? rutaDelCanal(codigo)}`;
    /* Con plazo para la subida: una ruta que el servidor dejara colgada no puede colgar la prueba. */
    this.ws = new WebSocket(url, {
      handshakeTimeout: 5000,
      ...(opciones.origen === undefined ? {} : { origin: opciones.origen }),
    });
    this.abierto = new Promise<boolean>((resolver) => {
      this.ws.once('open', () => resolver(true));
      this.ws.once('unexpected-response', (peticion, respuesta) => {
        this.rechazo = respuesta.statusCode ?? 0;
        respuesta.resume();
        peticion.destroy();
        resolver(false);
      });
      this.ws.once('error', () => resolver(false));
    });
    this.ws.on('message', (datos) => {
      const texto = datos.toString();
      this.crudos.push(texto);
      this.mensajes.push(leerMensajeDelServidor(texto));
    });
    this.ws.on('close', (c, r) => {
      this.cierre = { codigo: c, razon: r.toString() };
    });
    this.ws.on('error', () => {
      /* lo que importa se ve en `close` o en `rechazo` */
    });
  }

  de<T extends MensajeDelServidor['t']>(t: T): Extract<MensajeDelServidor, { t: T }>[] {
    return this.mensajes.filter((m): m is Extract<MensajeDelServidor, { t: T }> => m !== null && m.t === t);
  }

  ultimo<T extends MensajeDelServidor['t']>(t: T): Extract<MensajeDelServidor, { t: T }> | undefined {
    const todos = this.de(t);
    return todos[todos.length - 1];
  }

  ilegibles(): number {
    return this.mensajes.filter((m) => m === null).length;
  }

  enviar(texto: string): void {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(texto);
  }

  hola(llave: string): void {
    this.enviar(JSON.stringify({ t: 'hola', v: VERSION_DEL_CANAL, llave }));
  }

  aqui(x: number, z: number, r = 0, m: 0 | 1 | 2 = 1): void {
    this.n++;
    this.enviar(JSON.stringify({ t: 'aqui', n: this.n, x, z, r, m }));
  }

  async esperar(que: () => boolean, ms = 3000): Promise<boolean> {
    const fin = Date.now() + ms;
    while (Date.now() < fin) {
      if (que()) return true;
      await dormir(15);
    }
    return que();
  }

  /** Abre, dice `hola` y espera a `dentro`. Deja su sitio en `x`, `z`. */
  async entrar(llave: string): Promise<boolean> {
    if (!(await this.abierto)) return false;
    this.hola(llave);
    const dentro = await this.esperar(() => this.de('dentro').length > 0 || this.cierre !== null);
    const d = this.ultimo('dentro');
    if (d !== undefined) {
      this.x = d.x;
      this.z = d.z;
    }
    return dentro && d !== undefined;
  }

  cerrar(): void {
    try {
      this.ws.close(1000);
    } catch {
      /* ya cerrado */
    }
  }
}

/** Dónde enseña a `asiento` la última foto que ha recibido `a`. */
function enLaFoto(a: Aparato, asiento: string): readonly [string, number, number, number, number] | undefined {
  return a.ultimo('foto')?.p.find((e) => e[0] === asiento);
}

async function diagnostico(): Promise<any> {
  return (await pedir('/arcade/diagnostico')).datos.botas;
}

// ---------------------------------------------------------------------------
// EL CAMINO HASTA UNA MURALLA, SOBRE LA MISMA ESTRUCTURA
// ---------------------------------------------------------------------------

/**
 * UN CAMINO ANDABLE de `desde` hasta `hasta`, en pasos de una unidad (o de raíz de dos en
 * diagonal) cuya recta está libre: el servidor los acepta todos por la recta, sin escuadras. Una
 * búsqueda en anchura sobre una rejilla de una unidad, a ±120 unidades de `desde`.
 */
function camino(arena: Arena, desde: Andante, hasta: Andante): Andante[] | null {
  const PASO = U;
  const LIMITE = 120;
  const R = RADIO_DEL_PASEANTE;
  const clave = (i: number, j: number): number => (i + LIMITE) * (2 * LIMITE + 1) + (j + LIMITE);
  const previo = new Map<number, number>();
  const colaI: number[] = [0];
  const colaJ: number[] = [0];
  previo.set(clave(0, 0), -1);
  const VECINOS: readonly (readonly [number, number])[] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  let fin: number | null = null;
  for (let k = 0; k < colaI.length; k++) {
    const i = colaI[k] as number;
    const j = colaJ[k] as number;
    const p = { x: desde.x + i * PASO, z: desde.z + j * PASO };
    if (Math.hypot(hasta.x - p.x, hasta.z - p.z) <= deNumero(1.3) && seAndaEnRecta(arena, p, hasta, R)) {
      fin = clave(i, j);
      break;
    }
    for (const [di, dj] of VECINOS) {
      const ni = i + di;
      const nj = j + dj;
      if (Math.abs(ni) > LIMITE || Math.abs(nj) > LIMITE) continue;
      const c = clave(ni, nj);
      if (previo.has(c)) continue;
      const q = { x: desde.x + ni * PASO, z: desde.z + nj * PASO };
      if (!sePuedeEstar(arena, q.x, q.z, R) || !seAndaEnRecta(arena, p, q, R)) continue;
      previo.set(c, clave(i, j));
      colaI.push(ni);
      colaJ.push(nj);
    }
  }
  if (fin === null) return null;
  const puntos: Andante[] = [hasta];
  for (let c = fin; c !== clave(0, 0); c = previo.get(c) as number) {
    const i = Math.floor(c / (2 * LIMITE + 1)) - LIMITE;
    const j = (c % (2 * LIMITE + 1)) - LIMITE;
    puntos.push({ x: desde.x + i * PASO, z: desde.z + j * PASO });
  }
  return puntos.reverse();
}

interface Cruce {
  readonly delante: Andante;
  readonly detras: Andante;
  readonly pieza: string;
}

/**
 * Los sitios a los dos lados de un lienzo de muralla: delante y detrás, en el eje corto de su caja,
 * con los dos libres y la recta entre ellos cortada. Más de un tic de largo, para que la escuadra
 * ni se plantee: lo que se prueba es que la estructura para, no la tolerancia.
 */
function crucesDeMuralla(arena: Arena, codigo: string, vista: unknown): Cruce[] {
  const tablero = tableroEnTres(vista);
  if (tablero === null) return [];
  const cuerpos = cuerposDeLasLindes(tablero.losas, semillaDelCodigo(codigo, SEMILLA_DE_PORTADA_DE_LAS_LINDES));
  const R = RADIO_DEL_PASEANTE;
  const margen = R + deNumero(0.3);
  const salida: Cruce[] = [];
  for (const c of cuerpos) {
    if (c.porque !== 'muralla') continue;
    const x0 = deNumero(c.cuerpo.x0);
    const z0 = deNumero(c.cuerpo.z0);
    const x1 = deNumero(c.cuerpo.x1);
    const z1 = deNumero(c.cuerpo.z1);
    const aLoLargoDeZ = x1 - x0 < z1 - z0;
    for (const t of [0.5, 0.3, 0.7]) {
      const pares: [Andante, Andante][] = aLoLargoDeZ
        ? [
            [{ x: x0 - margen, z: Math.round(z0 + (z1 - z0) * t) }, { x: x1 + margen, z: Math.round(z0 + (z1 - z0) * t) }],
            [{ x: x1 + margen, z: Math.round(z0 + (z1 - z0) * t) }, { x: x0 - margen, z: Math.round(z0 + (z1 - z0) * t) }],
          ]
        : [
            [{ x: Math.round(x0 + (x1 - x0) * t), z: z0 - margen }, { x: Math.round(x0 + (x1 - x0) * t), z: z1 + margen }],
            [{ x: Math.round(x0 + (x1 - x0) * t), z: z1 + margen }, { x: Math.round(x0 + (x1 - x0) * t), z: z0 - margen }],
          ];
      for (const [delante, detras] of pares) {
        const largo = Math.hypot(detras.x - delante.x, detras.z - delante.z);
        if (largo <= UN_TIC_CON_HOLGURA || largo > deNumero(25)) continue;
        if (!sePuedeEstar(arena, delante.x, delante.z, R) || !sePuedeEstar(arena, detras.x, detras.z, R)) continue;
        if (seAndaElTramo(arena, delante, detras, R) !== null) continue;
        salida.push({ delante, detras, pieza: c.pieza });
      }
    }
  }
  return salida;
}

/** Un sorteo sembrado para el paseo: el mismo número, el mismo paseo. */
function sorteo(semilla: number): () => number {
  let x = semilla >>> 0;
  return () => {
    x = (Math.imul(x ^ (x >>> 15), 2246822519) + 0x9e3779b9) >>> 0;
    return x / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// LA PRUEBA
// ---------------------------------------------------------------------------

const aparatos: Aparato[] = [];
const llaves: string[] = [];
function aparato(codigo: string, opciones: { origen?: string; ruta?: string } = {}): Aparato {
  const a = new Aparato(codigo, opciones);
  aparatos.push(a);
  return a;
}

try {
  servidor = levantar();
  await esperarAlServidor();
  console.log(BINARIO === null ? '  (servidor: index.ts con tsx)' : `  (servidor: el COMPILADO, ${path.relative(REPO, BINARIO)}, con node desde server/)`);

  paso('El catálogo dice qué se puede recorrer');
  {
    const catalogo = await pedir('/arcade');
    const arcades = (catalogo.datos.arcades ?? []) as Array<{ id: string; sede: string; sePuedeRecorrer?: unknown }>;
    comprobar('el catálogo se lee', catalogo.estado === 200 && arcades.length > 0, catalogo.estado);
    comprobar(
      'y cada arcade trae `sePuedeRecorrer`, un booleano',
      arcades.every((a) => typeof a.sePuedeRecorrer === 'boolean'),
      arcades.map((a) => [a.id, a.sePuedeRecorrer]),
    );
    const seRecorren = arcades.filter((a) => a.sePuedeRecorrer === true).map((a) => a.id).sort();
    const conMundo = arcadesQueSeRecorren().filter((id) => arcades.some((a) => a.id === id)).map(String).sort();
    comprobar(
      'que es verdad para los instalados con mundo declarado, y sólo para ellos',
      seRecorren.length >= 2 && seRecorren.join(',') === conMundo.join(','),
      { seRecorren, conMundo },
    );
    comprobar('Las Lindes se recorre', seRecorren.includes(LINDES), seRecorren);
  }

  paso('Una mesa `botas` de Las Lindes, con tres sentados, empezada como la empiezan sus guiones');
  const abierta = await pedir('/arcade/mesas', {
    metodo: 'POST',
    cuerpo: { arcade: LINDES, nombre: 'Ana', modalidad: 'botas', plazoSegundos: 0 },
  });
  comprobar('la mesa `botas` de Las Lindes se abre (el arranque la dio de alta)', abierta.estado === 201 && abierta.datos.mesa?.modalidad === 'botas', abierta);
  const codigo = String(abierta.datos.codigo);
  const gente: { nombre: string; asiento: string; llave: string }[] = [
    { nombre: 'Ana', asiento: String(abierta.datos.asiento), llave: String(abierta.datos.llave) },
  ];
  for (const nombre of ['Bruno', 'Carla']) {
    const r = await pedir(`/arcade/mesas/${codigo}/asientos`, { metodo: 'POST', cuerpo: { nombre } });
    gente.push({ nombre, asiento: String(r.datos.asiento), llave: String(r.datos.llave) });
  }
  for (const g of gente) llaves.push(g.llave);
  const [ana, bruno, carla] = gente as [(typeof gente)[0], (typeof gente)[0], (typeof gente)[0]];
  {
    const vista = await pedir(`/arcade/mesas/${codigo}`, { llave: ana.llave });
    const opciones = (vista.datos.mesa?.opciones ?? []) as Array<{ tipo: string; carga?: unknown }>;
    const empezar = opciones.find((o) => o.tipo === 'lindes:empezar');
    comprobar('la mesa ofrece empezar', empezar !== undefined, opciones.map((o) => o.tipo));
    const r = await pedir(`/arcade/mesas/${codigo}/movimientos`, {
      metodo: 'POST',
      llave: ana.llave,
      cuerpo: { rev: vista.datos.mesa.rev, tipo: 'lindes:empezar', carga: empezar?.carga ?? null },
    });
    comprobar('y se empieza', r.estado === 200, r.datos);
  }
  const espectador = await pedir(`/arcade/mesas/${codigo}`);
  const vistaDeEspectador = espectador.datos.mesa?.vista as unknown;
  const mundo = mundoDeLaMesa(LINDES, vistaDeEspectador, codigo);
  comprobar('el mundo de la mesa se deriva AQUÍ, de la vista de espectador, con la misma función', mundo !== null, espectador.estado);
  if (mundo === null) throw new Error('sin mundo no hay nada que recorrer');
  const arena = arenaDe(mundo);

  /* Uno que no dice nada, desde el principio: al final tiene que llevar su `sinHola`. */
  const callado = aparato(codigo);
  const abiertoElCallado = Date.now();

  paso('Entrar: `hola` → `dentro`, en un sitio donde se puede estar');
  const a = aparato(codigo);
  const b = aparato(codigo);
  comprobar('Ana entra', await a.entrar(ana.llave), a.crudos);
  comprobar('Bruno entra', await b.entrar(bruno.llave), b.crudos);
  const da = a.ultimo('dentro');
  const db = b.ultimo('dentro');
  comprobar('`dentro` dice quién es cada uno', da?.yo === ana.asiento && db?.yo === bruno.asiento, [da, db]);
  comprobar(`y a ${String(TICS_POR_SEGUNDO)} tics por segundo`, da?.hz === TICS_POR_SEGUNDO && db?.hz === TICS_POR_SEGUNDO);
  comprobar(
    'los dos aparecen donde se puede estar según el mundo que deriva la prueba',
    da !== undefined && db !== undefined && sePuedeEstar(arena, da.x, da.z, RADIO_DEL_PASEANTE) && sePuedeEstar(arena, db.x, db.z, RADIO_DEL_PASEANTE),
    [da, db],
  );
  comprobar('y no en el mismo sitio', da !== undefined && db !== undefined && (da.x !== db.x || da.z !== db.z), [da, db]);

  paso('Un paseo legal generado con `pasoDelTic` se acepta entero, y Bruno lo ve en sus fotos');
  {
    const antes = await diagnostico();
    const azar = sorteo(20260923);
    let rumbo = Math.floor(azar() * 256);
    let moviendose = 0;
    for (let t = 0; t < 80; t++) {
      await dormir(50);
      if (azar() < 0.1) rumbo = Math.floor(azar() * 256);
      const marcha: 1 | 2 = azar() < 0.5 ? 2 : 1;
      const siguiente = pasoDelTic(arena, { x: a.x, z: a.z }, rumbo, marcha);
      if (siguiente.x === a.x && siguiente.z === a.z) rumbo = Math.floor(azar() * 256);
      else moviendose++;
      a.x = siguiente.x;
      a.z = siguiente.z;
      a.aqui(a.x, a.z, rumbo, marcha);
    }
    await dormir(300);
    const despues = await diagnostico();
    comprobar('ochenta tics de paseo legal: ni una corrección', a.de('corrige').length === 0, a.de('corrige'));
    comprobar(
      'y el servidor los ha aceptado (suelo: más de setenta, y moviéndose de verdad)',
      despues.aceptados - antes.aceptados >= 75 && moviendose >= 70,
      { aceptados: despues.aceptados - antes.aceptados, moviendose },
    );
    const vista = enLaFoto(b, ana.asiento);
    comprobar('Bruno ve a Ana en sus fotos donde acabó, al bit', vista !== undefined && vista[1] === a.x && vista[2] === a.z, { vista, ana: [a.x, a.z] });
    const sitiosVistos = new Set(b.de('foto').map((f) => f.p.find((e) => e[0] === ana.asiento)).filter((e) => e !== undefined).map((e) => `${String(e[1])},${String(e[2])}`));
    comprobar('y la ha visto andar: más de veinte sitios distintos en sus fotos', sitiosVistos.size > 20, sitiosVistos.size);
    comprobar('y la foto no repite a nadie', (b.ultimo('foto')?.p.length ?? 0) === new Set(b.ultimo('foto')?.p.map((e) => e[0])).size);
  }

  paso('Un teletransporte → `corrige` al último sitio bueno, y no se mueve');
  {
    await dormir(1100);
    const bueno = { x: a.x, z: a.z };
    const antes = a.de('corrige').length;
    a.aqui(a.x + deNumero(60), a.z);
    await a.esperar(() => a.de('corrige').length > antes);
    const c = a.ultimo('corrige');
    comprobar('llega un `corrige` con el último sitio bueno', c !== undefined && c.x === bueno.x && c.z === bueno.z && c.n === a.n, { c, bueno });
    await dormir(300);
    const vista = enLaFoto(b, ana.asiento);
    comprobar('y en las fotos de Bruno Ana sigue donde estaba', vista !== undefined && vista[1] === bueno.x && vista[2] === bueno.z, vista);
    /* Vuelve al sitio corregido, como haría el aparato. */
    a.aqui(a.x, a.z, 0, 0);
  }

  paso('Cruzar una muralla de verdad del mundo → `corrige`');
  {
    const cruces = crucesDeMuralla(arena, codigo, vistaDeEspectador);
    comprobar('el mundo tiene lienzos de muralla con los dos lados libres', cruces.length > 0, cruces.length);
    let hecho = false;
    for (const cruce of cruces) {
      const ruta = camino(arena, { x: a.x, z: a.z }, cruce.delante);
      if (ruta === null) continue;
      hecho = true;
      console.log(`  a pie hasta un lienzo de «${cruce.pieza}»: ${String(ruta.length)} pasos`);
      const antes = a.de('corrige').length;
      for (const p of ruta) {
        await dormir(50);
        a.x = p.x;
        a.z = p.z;
        a.aqui(p.x, p.z, 0, 1);
      }
      await dormir(300);
      comprobar('el camino hasta la muralla se anda entero sin una corrección', a.de('corrige').length === antes, a.de('corrige').slice(antes));
      const vista = enLaFoto(b, ana.asiento);
      comprobar('y Bruno la ve delante de la muralla', vista !== undefined && vista[1] === cruce.delante.x && vista[2] === cruce.delante.z, vista);
      await dormir(1100);
      const d0 = await diagnostico();
      a.aqui(cruce.detras.x, cruce.detras.z, 0, 2);
      await a.esperar(() => a.de('corrige').length > antes);
      const c = a.ultimo('corrige');
      comprobar(
        `saltar al otro lado del lienzo (${(Math.hypot(cruce.detras.x - cruce.delante.x, cruce.detras.z - cruce.delante.z) / U).toFixed(1)} u, dentro del presupuesto) se corrige a delante`,
        c !== undefined && c.x === cruce.delante.x && c.z === cruce.delante.z,
        { c, delante: cruce.delante },
      );
      const d1 = await diagnostico();
      comprobar('y el diagnóstico lo cuenta como estructura', d1.correcciones.estructura === d0.correcciones.estructura + 1, [d0.correcciones, d1.correcciones]);
      a.x = cruce.delante.x;
      a.z = cruce.delante.z;
      a.aqui(a.x, a.z, 0, 0);
      break;
    }
    comprobar('se ha llegado andando a una muralla y se ha intentado cruzar', hecho, cruces.length);
  }

  paso('Correr de más → `corrige` por el presupuesto');
  {
    /* Ida y vuelta entre dos sitios a 5,3 u —cuatro veces lo que se corre en un tic—, con la recta libre. */
    let otro: Andante | null = null;
    for (let r = 0; r < 256 && otro === null; r += 16) {
      const angulo = (r / 256) * Math.PI * 2;
      const p = { x: a.x + Math.round(Math.sin(angulo) * deNumero(5.3)), z: a.z - Math.round(Math.cos(angulo) * deNumero(5.3)) };
      if (sePuedeEstar(arena, p.x, p.z, RADIO_DEL_PASEANTE) && seAndaEnRecta(arena, { x: a.x, z: a.z }, p, RADIO_DEL_PASEANTE)) otro = p;
    }
    comprobar('hay dos sitios a 5,3 u con la recta libre', otro !== null);
    if (otro !== null) {
      await dormir(200);
      const d0 = await diagnostico();
      const aqui0 = { x: a.x, z: a.z };
      const antes = a.de('corrige').length;
      for (let i = 0; i < 30 && a.de('corrige').length === antes; i++) {
        await dormir(50);
        const p = i % 2 === 0 ? otro : aqui0;
        a.aqui(p.x, p.z, 0, 2);
      }
      await a.esperar(() => a.de('corrige').length > antes);
      const d1 = await diagnostico();
      comprobar('corriendo a cuatro veces la velocidad, llega un `corrige`', a.de('corrige').length > antes, a.de('corrige').length - antes);
      comprobar('por el presupuesto', d1.correcciones.presupuesto > d0.correcciones.presupuesto, [d0.correcciones, d1.correcciones]);
      const c = a.ultimo('corrige');
      if (c !== undefined) {
        a.x = c.x;
        a.z = c.z;
      }
      await dormir(1100);
      a.aqui(a.x, a.z, 0, 0);
    }
  }

  paso('El mismo asiento dos veces: el primero recibe `reemplazado` (4003)');
  const b2 = aparato(codigo);
  {
    const dondeEstaba = enLaFoto(a, bruno.asiento);
    comprobar('el segundo canal de Bruno entra', await b2.entrar(bruno.llave), b2.crudos);
    await b.esperar(() => b.cierre !== null);
    comprobar('y al primero se le cierra con 4003', b.cierre?.codigo === CIERRE.reemplazado, b.cierre);
    comprobar('diciéndole antes por qué', b.de('fuera').length === 1, b.crudos.slice(-2));
    comprobar(
      'el nuevo aparece donde estaba Bruno',
      dondeEstaba !== undefined && b2.x === dondeEstaba[1] && b2.z === dondeEstaba[2],
      { dondeEstaba, nuevo: [b2.x, b2.z] },
    );
  }

  paso('Los que no pasan: llave mala, mesa normal, atropello, sin hola, un mensaje demasiado grande');
  {
    const mala = aparato(codigo);
    await mala.abierto;
    mala.hola('X'.repeat(24));
    await mala.esperar(() => mala.cierre !== null);
    comprobar('una llave mala: 4001, con su `fuera`', mala.cierre?.codigo === CIERRE.llaveMala && mala.de('fuera').length === 1, mala.cierre);

    const normal = await pedir('/arcade/mesas', { metodo: 'POST', cuerpo: { arcade: LINDES, nombre: 'Dani', plazoSegundos: 0 } });
    llaves.push(String(normal.datos.llave));
    const enNormal = aparato(String(normal.datos.codigo));
    await enNormal.abierto;
    enNormal.hola(String(normal.datos.llave));
    await enNormal.esperar(() => enNormal.cierre !== null);
    comprobar('una mesa `normal`: 4002', normal.estado === 201 && enNormal.cierre?.codigo === CIERRE.mesaQueNo, enNormal.cierre);

    const atropella = aparato(codigo);
    comprobar('Carla entra', await atropella.entrar(carla.llave), atropella.crudos);
    for (let i = 0; i < 60; i++) atropella.aqui(atropella.x, atropella.z, 0, 0);
    await atropella.esperar(() => atropella.cierre !== null);
    comprobar('sesenta mensajes de golpe: 4005', atropella.cierre?.codigo === CIERRE.atropello, atropella.cierre);

    const primeroAqui = aparato(codigo);
    await primeroAqui.abierto;
    primeroAqui.aqui(0, 0);
    await primeroAqui.esperar(() => primeroAqui.cierre !== null);
    comprobar('lo primero es un `aqui`: 4000 en el acto', primeroAqui.cierre?.codigo === CIERRE.sinHola, primeroAqui.cierre);

    const gordo = aparato(codigo);
    comprobar('Carla vuelve a entrar', await gordo.entrar(carla.llave), gordo.crudos);
    gordo.enviar(JSON.stringify({ t: 'aqui', n: 1, x: 0, z: 0, r: 0, m: 0, relleno: 'x'.repeat(300) }));
    await gordo.esperar(() => gordo.cierre !== null);
    comprobar('un mensaje de más de 256 bytes lo corta `ws`: 1009', gordo.cierre?.codigo === 1009, gordo.cierre);

    const falta = 5000 + 400 - (Date.now() - abiertoElCallado);
    if (falta > 0) await dormir(falta);
    await callado.esperar(() => callado.cierre !== null, 1000);
    comprobar('el que no dijo nada: 4000 a los cinco segundos, con su `fuera`', callado.cierre?.codigo === CIERRE.sinHola && callado.de('fuera').length === 1, callado.cierre);
  }

  paso('El origen y la ruta');
  {
    const ajeno = aparato(codigo, { origen: 'https://malvado.example' });
    await ajeno.abierto;
    comprobar('desde un origen ajeno el canal no se abre: 403', ajeno.rechazo === 403, ajeno.rechazo);
    const local = aparato(codigo, { origen: 'http://localhost:5175' });
    comprobar('desde el bucle local (fuera de producción) sí', await local.abierto);
    local.cerrar();
    const otraRuta = aparato(codigo, { ruta: `/api/arcade/mesas/${codigo}/otra` });
    await otraRuta.abierto;
    comprobar('otra ruta de subida no es el canal: 404', otraRuta.rechazo === 404, otraRuta.rechazo);
    const fuera = aparato(codigo, { ruta: '/api/salud' });
    await fuera.abierto;
    comprobar('ni ninguna otra de la API: 404', fuera.rechazo === 404, fuera.rechazo);
    const sigue = await pedir('/salud');
    comprobar('y el servidor sigue sirviendo', sigue.estado === 200);
  }

  paso('El diagnóstico lo cuenta todo, sin una llave');
  {
    const d = await diagnostico();
    comprobar('el canal está montado, con una sala y el temporizador en marcha', d.montado === true && d.salas === 1 && d.temporizador === true, d);
    comprobar('fotos mandadas (suelo: más de cien) y una foto compuesta por cada varias mandadas', d.fotos > 100 && d.fotosCompuestas < d.fotos, { fotos: d.fotos, compuestas: d.fotosCompuestas });
    comprobar(
      'correcciones por presupuesto y por estructura (suelo: tres)',
      d.correcciones.presupuesto >= 2 && d.correcciones.estructura >= 1,
      d.correcciones,
    );
    comprobar(
      'y los cierres por motivo',
      d.cierres.sinHola >= 2 && d.cierres.llaveMala >= 1 && d.cierres.mesaQueNo >= 1 && d.cierres.reemplazado >= 1 && d.cierres.atropello >= 1,
      d.cierres,
    );
    comprobar('y el origen negado', d.origenesNegados >= 1, d.origenesNegados);
    const texto = JSON.stringify((await pedir('/arcade/diagnostico')).datos);
    comprobar('sin una llave ni un código de mesa dentro', !llaves.some((l) => texto.includes(l)) && !texto.includes(codigo), texto.slice(0, 300));
    comprobar('Bruno ha recibido fotos de verdad (suelo: sesenta)', b.de('foto').length + b2.de('foto').length >= 60, b.de('foto').length + b2.de('foto').length);
  }

  paso('La mesa se cierra → 4006 a todos, y el temporizador se para');
  {
    const cerrada = await pedir(`/arcade/mesas/${codigo}/cerrar`, { metodo: 'POST', llave: ana.llave });
    comprobar('la mesa se cierra', cerrada.estado === 200, cerrada.datos);
    await a.esperar(() => a.cierre !== null && b2.cierre !== null, 3000);
    comprobar('Ana: 4006, con su `fuera`', a.cierre?.codigo === CIERRE.mesaCerrada && (a.ultimo('fuera')?.motivo ?? '').length > 0, a.cierre);
    comprobar('Bruno: 4006', b2.cierre?.codigo === CIERRE.mesaCerrada, b2.cierre);
    const tras = aparato(codigo);
    await tras.abierto;
    tras.hola(ana.llave);
    await tras.esperar(() => tras.cierre !== null);
    comprobar('y quien llega después a una mesa acabada: 4006', tras.cierre?.codigo === CIERRE.mesaCerrada, tras.cierre);
    await dormir(200);
    const d = await diagnostico();
    comprobar('sin salas, el temporizador está PARADO', d.salas === 0 && d.temporizador === false, { salas: d.salas, temporizador: d.temporizador });
  }

  comprobar(
    'todo lo que ha mandado el servidor lo lee el lector estricto del aparato',
    aparatos.every((x) => x.ilegibles() === 0),
    aparatos.map((x) => x.ilegibles()),
  );
} catch (error) {
  fallos.push(`la prueba se cayó: ${error instanceof Error ? error.stack : String(error)}`);
} finally {
  for (const x of aparatos) x.cerrar();
  if (servidor) {
    servidor.kill();
    await esperarAQueMuera(servidor);
  }
  try {
    fs.rmSync(CARPETA, { recursive: true, force: true });
  } catch {
    /* en Windows un fichero recién cerrado a veces sigue tomado un instante */
  }
}

paso('La llave no sale nunca en lo que escribe el servidor');
comprobar('el servidor ha escrito algo (si no, esto no probaría nada)', loQueDijoElServidor.includes('[botas]'), loQueDijoElServidor.slice(-300));
comprobar(
  'y ninguna de las llaves de la prueba aparece en su salida',
  llaves.length >= 4 && !llaves.some((l) => loQueDijoElServidor.includes(l)),
  llaves.length,
);

console.log('');
if (fallos.length > 0) {
  console.log(`✘ ${String(fallos.length)} de ${String(hechas)} comprobaciones han fallado:\n`);
  for (const f of fallos) console.log(`   · ${f}`);
  console.log(`\n  Lo último que dijo el servidor:\n${loQueDijoElServidor.slice(-1200)}`);
  process.exit(1);
}

/*
 * EL GUARDIA DE «NO SE HAN HECHO TODAS»: un comprobador que se cae a mitad sin decirlo se parece
 * mucho a uno verde. El número es el que se hace hoy, contado, y se sube al añadir comprobaciones.
 */
const COMPROBACIONES_ESCRITAS = 62;
if (hechas < COMPROBACIONES_ESCRITAS) {
  console.log(`Sólo se han hecho ${String(hechas)} de las ${String(COMPROBACIONES_ESCRITAS)} comprobaciones escritas.`);
  process.exit(2);
}

console.log(
  `✔ ${String(hechas)} comprobaciones, ${BINARIO === null ? 'con tsx' : 'contra el COMPILADO'}. El canal de Boots on Board por el cable:\n` +
    '  `hola` → `dentro` donde se puede estar, un paseo legal aceptado entero y visto por el otro, el\n' +
    '  teletransporte, la muralla y la carrera corregidos, los siete cierres con su código, el origen\n' +
    '  y la ruta, el diagnóstico, el temporizador parado sin salas, y ni una llave en la salida.',
);
process.exit(0);
