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
 *   · LA REFRIEGA CON MESAS DE VERDAD DE LOS TRES JUEGOS QUE SE RECORREN —El Burgo, Riberas y Las
 *     Lindes, a la vez—: cada mesa se abre y se empieza por la API y, si hace falta, se juega por la
 *     API hasta que quien va a caer tiene algo que llevarse; bajan dos aparatos, se encuentran a medio
 *     camino andando sobre el mundo de la mesa (un A* sobre la misma estructura), uno tumba al otro
 *     con tres golpes por el cable, y el botín LLEGA A LA MESA: `mirar` enseña, en una revisión, que
 *     lo que pierde uno lo gana el otro. Luego renace, se vuelven a encontrar, lo tumba otra vez
 *     antes del minuto y la mesa NO se mueve: una vez y no dos. Y `arcade:botin` por HTTP sigue
 *     siendo un 400.
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
import {
  CAIDO_MS,
  CIERRE,
  INTOCABLE_MS,
  leerMensajeDelServidor,
  RECARGA_DEL_GOLPE_MS,
  rutaDelCanal,
  VERSION_DEL_CANAL,
} from '../../shared/mecanicas/canal-de-botas';
import type { MensajeDelServidor } from '../../shared/mecanicas/canal-de-botas';
import { pasoDelTic, RADIO_DEL_PASEANTE, rumboDeRadianes, TICS_POR_SEGUNDO } from '../../shared/mecanicas/andar';
import { deNumero, UNO } from '../../shared/mecanicas/fijo';
import { arenaDe, seAndaEnRecta, sePuedeEstar } from '../../shared/mecanicas/mundo';
import type { Andante, Arena } from '../../shared/mecanicas/mundo';
import { turnoDeLaVista } from '../../shared/mecanicas/turno-declarado';
import { arcadesQueSeRecorren, mundoDeLaMesa, SEMILLA_DE_PORTADA_DE_LAS_LINDES } from '../../shared/arcade/juegos/mundos';
import { cuerposDeLasLindes } from '../../shared/arcade/juegos/lindes-mundo';
import { tableroEnTres } from '../../shared/arcade/juegos/lindes-en-tres';
import { LINDES, PASAR, PLANTAR, PONER, PUNTOS_DEL_BOTIN } from '../../shared/arcade/juegos/lindes';
import { CLASES_DE_COSA } from '../../shared/arcade/juegos/lindes-losas';
import { BURGO } from '../../shared/arcade/juegos/burgo';
import {
  DESCARTAR,
  FICHAS_DEL_BOTIN,
  MOVER_EL_ESTIAJE,
  PASAR as PASAR_EN_RIBERAS,
  RIBERAS,
  TIRAR as TIRAR_EN_RIBERAS,
} from '../../shared/arcade/juegos/riberas';
import { semillaDelCodigo } from '../../shared/mecanicas/semilla';
import { RADIO_DEL_LANZAMIENTO, REBOBINADO_MS, seAndaElTramo, UN_TIC_CON_HOLGURA } from '../src/botas/canal';

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

  /** «Golpeo», en el siguiente tic, mirando a `r`. */
  golpe(r: number): void {
    this.n++;
    this.enviar(JSON.stringify({ t: 'golpe', n: this.n, r }));
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

/** Un montón binario de claves por prioridad, para el A* de abajo. */
class Monton {
  private readonly prioridades: number[] = [];
  private readonly claves: number[] = [];

  get vacio(): boolean {
    return this.claves.length === 0;
  }

  meter(prioridad: number, clave: number): void {
    let i = this.claves.length;
    this.prioridades.push(prioridad);
    this.claves.push(clave);
    while (i > 0) {
      const padre = (i - 1) >> 1;
      if ((this.prioridades[padre] as number) <= prioridad) break;
      this.prioridades[i] = this.prioridades[padre] as number;
      this.claves[i] = this.claves[padre] as number;
      i = padre;
    }
    this.prioridades[i] = prioridad;
    this.claves[i] = clave;
  }

  sacar(): number {
    const arriba = this.claves[0] as number;
    const ultimaP = this.prioridades.pop() as number;
    const ultimaK = this.claves.pop() as number;
    const n = this.claves.length;
    if (n > 0) {
      let i = 0;
      for (;;) {
        const hijo = 2 * i + 1;
        if (hijo >= n) break;
        const menor = hijo + 1 < n && (this.prioridades[hijo + 1] as number) < (this.prioridades[hijo] as number) ? hijo + 1 : hijo;
        if ((this.prioridades[menor] as number) >= ultimaP) break;
        this.prioridades[i] = this.prioridades[menor] as number;
        this.claves[i] = this.claves[menor] as number;
        i = menor;
      }
      this.prioridades[i] = ultimaP;
      this.claves[i] = ultimaK;
    }
    return arriba;
  }
}

/**
 * UN CAMINO LARGO: A* sobre la misma rejilla de una unidad que `camino`, con sus ocho vecinos y cada
 * tramo con su recta libre. La búsqueda en anchura se queda corta para lo que separa dos sitios de
 * nacer —de 36 unidades en la glorieta del Burgo a más de 130 en Riberas, y en Las Lindes quien
 * renace en su losa puede quedar a 450—. Devuelve los puntos DESPUÉS de `desde`, acabando
 * exactamente en `hasta`; `null` si no lo encuentra en ±`limite` unidades.
 */
function caminoLargo(arena: Arena, desde: Andante, hasta: Andante, limite = 900, presupuesto = 3_000_000): Andante[] | null {
  const PASO = U;
  const R = RADIO_DEL_PASEANTE;
  const ancho = 2 * limite + 1;
  const clave = (i: number, j: number): number => (i + limite) * ancho + (j + limite);
  const hi = (hasta.x - desde.x) / PASO;
  const hj = (hasta.z - desde.z) / PASO;
  const estimado = (i: number, j: number): number => {
    const di = Math.abs(i - hi);
    const dj = Math.abs(j - hj);
    return Math.max(di, dj) + (Math.SQRT2 - 1) * Math.min(di, dj);
  };
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
  const coste = new Map<number, number>([[clave(0, 0), 0]]);
  const previo = new Map<number, number>();
  const cerrados = new Set<number>();
  const abiertos = new Monton();
  abiertos.meter(estimado(0, 0), clave(0, 0));
  let fin: number | null = null;
  for (let vueltas = 0; !abiertos.vacio && vueltas < presupuesto; vueltas++) {
    const k = abiertos.sacar();
    if (cerrados.has(k)) continue;
    cerrados.add(k);
    const i = Math.floor(k / ancho) - limite;
    const j = (k % ancho) - limite;
    const p = { x: desde.x + i * PASO, z: desde.z + j * PASO };
    if (Math.hypot(hasta.x - p.x, hasta.z - p.z) <= deNumero(1.3) && seAndaEnRecta(arena, p, hasta, R)) {
      fin = k;
      break;
    }
    for (const [di, dj] of VECINOS) {
      const ni = i + di;
      const nj = j + dj;
      if (Math.abs(ni) > limite || Math.abs(nj) > limite) continue;
      const nk = clave(ni, nj);
      if (cerrados.has(nk)) continue;
      const nuevo = (coste.get(k) as number) + (di !== 0 && dj !== 0 ? Math.SQRT2 : 1);
      if (nuevo >= (coste.get(nk) ?? Infinity)) continue;
      const q = { x: desde.x + ni * PASO, z: desde.z + nj * PASO };
      if (!sePuedeEstar(arena, q.x, q.z, R) || !seAndaEnRecta(arena, p, q, R)) continue;
      coste.set(nk, nuevo);
      previo.set(nk, k);
      abiertos.meter(nuevo + estimado(ni, nj), nk);
    }
  }
  if (fin === null) return null;
  const puntos: Andante[] = [hasta];
  for (let c = fin; c !== clave(0, 0); c = previo.get(c) as number) {
    const i = Math.floor(c / ancho) - limite;
    const j = (c % ancho) - limite;
    puntos.push({ x: desde.x + i * PASO, z: desde.z + j * PASO });
  }
  return puntos.reverse();
}

/** El rumbo (0-255) que mira de `desde` hacia `hacia`. En coma flotante: esto es la prueba, no arbitra nada. */
function rumboHacia(desde: Andante, hacia: Andante): number {
  return rumboDeRadianes(Math.atan2(hacia.x - desde.x, -(hacia.z - desde.z)));
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

// ---------------------------------------------------------------------------
// LA REFRIEGA CON MESAS DE VERDAD
// ---------------------------------------------------------------------------

interface Sentado {
  readonly nombre: string;
  readonly asiento: string;
  readonly llave: string;
}

interface OpcionDeVerdad {
  readonly id: string;
  readonly tipo: string;
  readonly carga?: unknown;
  readonly declaracion?: true;
}

/**
 * CÓMO SE PREPARA CADA JUEGO para que quien cae tenga algo que llevarse, y dónde se lee lo que tiene.
 *
 *   · El Burgo: todos empiezan con dinero, así que basta con empezar. Se sientan SEIS para que los dos
 *     que pelean nazcan en los brazos de la glorieta —(0, 18) y (0, −18)— y no en dos puertas de la
 *     muralla, a setecientas unidades una de otra. Los otros cuatro no bajan: son estatuas en sus
 *     puertas, y por eso quien cae no tiene dónde renacer lejos y lo hace en la glorieta.
 *   · Riberas: se coloca —eligiendo lo primero que ofrece el juego— hasta que alguien tiene más fichas
 *     de las que se lleva un botín.
 *   · Las Lindes: los canales se abren NADA MÁS EMPEZAR, con una sola losa en la mesa y un solo sitio
 *     de nacer, así que los dos nacen a un paso; y luego se juega por la API, como el robot de
 *     `verify:lindes` —plantando por clases y poniendo pegado a lo que hay—, hasta que alguien tiene
 *     más puntos de los que se lleva un botín. Quien más tiene es quien cae.
 *
 * «Más de lo que se lleva un botín» y no «algo»: con lo justo, el primer botín le deja sin nada y el
 * segundo saldría sin efecto de todas formas, así que «una vez y no dos» no podría ponerse rojo.
 */
interface JuegoDeLaRefriega {
  readonly arcade: string;
  readonly nombres: readonly string[];
  /** Los canales se abren antes de preparar la mesa, y no después. */
  readonly canalAntes: boolean;
  /** Quién tumba (`a`) y quién cae (`b`), con la mesa ya preparada; los demás no bajan nunca. */
  readonly quienes: (sentados: readonly Sentado[], vista: unknown) => { a: Sentado; b: Sentado } | null;
  /** Se juega hasta que esto dice que sí, eligiendo con `elegir`. `null`: no hace falta jugar. */
  readonly hasta: ((vista: unknown) => boolean) | null;
  readonly elegir: (vista: unknown, opciones: readonly OpcionDeVerdad[], paso: number) => OpcionDeVerdad | undefined;
  /** Lo que tiene un asiento, en la vista del espectador: dinero, fichas o puntos. */
  readonly bolsa: (vista: unknown, asiento: string) => number;
}

const vistaComo = <T>(v: unknown): T => v as T;

const LOS_TRES: readonly JuegoDeLaRefriega[] = [
  {
    arcade: BURGO,
    nombres: ['Ana', 'Bruno', 'Carla', 'Diego', 'Elena', 'Fede'],
    canalAntes: false,
    quienes: (s) => ({ a: s[4] as Sentado, b: s[5] as Sentado }),
    hasta: null,
    elegir: () => undefined,
    bolsa: (v, asiento) => vistaComo<{ jugadores: { asiento: string; mrs: number }[] }>(v).jugadores.find((j) => j.asiento === asiento)?.mrs ?? NaN,
  },
  {
    /*
     * Hasta que alguien tenga MÁS de lo que se lleva un botín: si no, el segundo botín saldría sin
     * efecto por falta de nada que llevarse, y «una vez y no dos» no podría ponerse rojo. Se vio: en
     * Las Lindes, con un caído de tres puntos justos, la regla de la pareja quitada y la mesa quieta.
     */
    arcade: RIBERAS,
    nombres: ['Ana', 'Bruno'],
    canalAntes: false,
    quienes: (s, v) => {
      const colonos = vistaComo<{ colonos: { asiento: string; bienes: number }[] }>(v).colonos;
      const bienes = (x: Sentado): number => colonos.find((c) => c.asiento === x.asiento)?.bienes ?? 0;
      const b = [...s].sort((x, y) => bienes(y) - bienes(x))[0];
      const a = s.find((x) => x !== b);
      return a === undefined || b === undefined || bienes(b) <= FICHAS_DEL_BOTIN ? null : { a, b };
    },
    hasta: (v) => vistaComo<{ colonos: { bienes: number }[] }>(v).colonos.some((c) => c.bienes > FICHAS_DEL_BOTIN),
    /* Como el jugador de `verify:botin`: coloca en lo primero, descarta si hay que descartar, y si no mueve el estiaje, tira o pasa. */
    elegir: (v, opciones) => {
      const momento = vistaComo<{ momento: string }>(v).momento;
      const porTipo = (tipo: string): OpcionDeVerdad | undefined => opciones.find((o) => o.tipo === tipo);
      if (momento === 'colocando') return opciones[0];
      if (momento === 'descartando') return porTipo(DESCARTAR);
      return porTipo(MOVER_EL_ESTIAJE) ?? porTipo(TIRAR_EN_RIBERAS) ?? porTipo(PASAR_EN_RIBERAS);
    },
    bolsa: (v, asiento) => vistaComo<{ colonos: { asiento: string; bienes: number }[] }>(v).colonos.find((c) => c.asiento === asiento)?.bienes ?? NaN,
  },
  {
    arcade: LINDES,
    nombres: ['Ana', 'Bruno'],
    canalAntes: true,
    quienes: (s, v) => {
      const labriegos = vistaComo<{ labriegos: { asiento: string; puntos: number }[] }>(v).labriegos;
      const puntos = (x: Sentado): number => labriegos.find((l) => l.asiento === x.asiento)?.puntos ?? 0;
      const b = [...s].sort((x, y) => puntos(y) - puntos(x))[0];
      const a = s.find((x) => x !== b);
      return a === undefined || b === undefined || puntos(b) <= PUNTOS_DEL_BOTIN ? null : { a, b };
    },
    hasta: (v) => vistaComo<{ labriegos: { puntos: number }[] }>(v).labriegos.some((l) => l.puntos > PUNTOS_DEL_BOTIN),
    elegir: (v, opciones, paso) => {
      const quiere = CLASES_DE_COSA[paso % CLASES_DE_COSA.length] as string;
      const plantar = opciones.find((o) => o.tipo === PLANTAR && o.id.startsWith(`plantar:${quiere}:`)) ?? opciones.find((o) => o.tipo === PLANTAR);
      if (plantar !== undefined) return plantar;
      const poner = opciones.filter((o) => o.tipo === PONER);
      if (poner.length === 0) return opciones.find((o) => o.tipo === PASAR) ?? opciones[0];
      const puestas = new Set(vistaComo<{ losas: { x: number; y: number }[] }>(v).losas.map((l) => `${String(l.x)},${String(l.y)}`));
      let mejor = poner[0];
      let vecinasDeLaMejor = -1;
      for (const o of poner) {
        const c = o.carga as { x: number; y: number };
        let vecinas = 0;
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if ((dx !== 0 || dy !== 0) && puestas.has(`${String(c.x + dx)},${String(c.y + dy)}`)) vecinas++;
        if (vecinas > vecinasDeLaMejor) {
          vecinasDeLaMejor = vecinas;
          mejor = o;
        }
      }
      return mejor;
    },
    bolsa: (v, asiento) => vistaComo<{ labriegos: { asiento: string; puntos: number }[] }>(v).labriegos.find((l) => l.asiento === asiento)?.puntos ?? NaN,
  },
];

/** Abre una mesa `botas` de verdad, sienta a todos y la empieza con la opción que ofrece el propio juego. */
async function mesaDeLaRefriega(juego: JuegoDeLaRefriega): Promise<{ codigo: string; sentados: Sentado[] }> {
  const abierta = await pedir('/arcade/mesas', {
    metodo: 'POST',
    cuerpo: { arcade: juego.arcade, nombre: juego.nombres[0], modalidad: 'botas', plazoSegundos: 0 },
  });
  const codigo = String(abierta.datos.codigo);
  const sentados: Sentado[] = [{ nombre: juego.nombres[0] as string, asiento: String(abierta.datos.asiento), llave: String(abierta.datos.llave) }];
  for (const nombre of juego.nombres.slice(1)) {
    const r = await pedir(`/arcade/mesas/${codigo}/asientos`, { metodo: 'POST', cuerpo: { nombre } });
    sentados.push({ nombre, asiento: String(r.datos.asiento), llave: String(r.datos.llave) });
  }
  for (const s of sentados) llaves.push(s.llave);
  const vista = await pedir(`/arcade/mesas/${codigo}`, { llave: (sentados[0] as Sentado).llave });
  const empezar = ((vista.datos.mesa?.opciones ?? []) as OpcionDeVerdad[]).find((o) => o.tipo === `${juego.arcade}:empezar`);
  await pedir(`/arcade/mesas/${codigo}/movimientos`, {
    metodo: 'POST',
    llave: (sentados[0] as Sentado).llave,
    cuerpo: { rev: vista.datos.mesa.rev, tipo: `${juego.arcade}:empezar`, carga: empezar?.carga ?? null },
  });
  return { codigo, sentados };
}

/** Juega POR LA API hasta que `juego.hasta` diga que sí: a quien le toca, lo que su juego le ofrece. */
async function jugarPorLaApi(juego: JuegoDeLaRefriega, codigo: string, sentados: readonly Sentado[]): Promise<number> {
  if (juego.hasta === null) return 0;
  for (let paso = 0; paso < 400; paso++) {
    const espectador = await pedir(`/arcade/mesas/${codigo}`);
    if (juego.hasta(espectador.datos.mesa.vista)) return paso;
    const turno = turnoDeLaVista(espectador.datos.mesa.vista);
    const quien = turno.declarado ? sentados.find((s) => s.asiento === turno.de) : undefined;
    if (quien === undefined) return -1;
    const suya = await pedir(`/arcade/mesas/${codigo}`, { llave: quien.llave });
    const opciones = ((suya.datos.mesa?.opciones ?? []) as OpcionDeVerdad[]).filter((o) => o.declaracion !== true);
    const elegida = juego.elegir(suya.datos.mesa.vista, opciones, paso);
    if (elegida === undefined) return -1;
    const r = await pedir(`/arcade/mesas/${codigo}/movimientos`, {
      metodo: 'POST',
      llave: quien.llave,
      cuerpo: { rev: suya.datos.mesa.rev, tipo: elegida.tipo, carga: elegida.carga ?? null },
    });
    if (r.estado !== 200) return -1;
  }
  return -1;
}

/**
 * LOS DOS SE ENCUENTRAN A MEDIO CAMINO: un camino de uno al otro sobre el mundo de la mesa, y cada
 * uno anda su mitad, a la vez, un punto cada 55 ms —veintiséis unidades por segundo en diagonal, por
 * debajo de lo que el presupuesto deja correr—. Acaban en dos puntos seguidos del camino: a menos de
 * un paso y con la recta libre entre ellos. `false` si no hay camino.
 */
async function encontrarse(arena: Arena, a: Aparato, b: Aparato): Promise<boolean> {
  if (Math.hypot(b.x - a.x, b.z - a.z) <= deNumero(2) && seAndaEnRecta(arena, a, b, RADIO_DEL_LANZAMIENTO)) return true;
  const ruta = caminoLargo(arena, { x: a.x, z: a.z }, { x: b.x, z: b.z });
  if (ruta === null) return false;
  const todo = [{ x: a.x, z: a.z }, ...ruta];
  const k = Math.floor((todo.length - 1) / 2);
  const deA = todo.slice(1, k + 1);
  const deB = todo.slice(k + 1, todo.length - 1).reverse();
  for (let i = 0; i < Math.max(deA.length, deB.length); i++) {
    await dormir(55);
    const pa = deA[i];
    const pb = deB[i];
    if (pa !== undefined) {
      a.x = pa.x;
      a.z = pa.z;
      a.aqui(a.x, a.z, 0, 2);
    }
    if (pb !== undefined) {
      b.x = pb.x;
      b.z = pb.z;
      b.aqui(b.x, b.z, 0, 2);
    }
  }
  return true;
}

/** Tres golpes de `a` a `b`, con la recarga en medio, y espera a que `b` sepa que ha caído otra vez. */
async function tumbar(a: Aparato, b: Aparato): Promise<boolean> {
  const caidas = b.de('cae').length;
  await dormir(REBOBINADO_MS + 100);
  const r = rumboHacia(a, b);
  for (let i = 0; i < 3; i++) {
    a.golpe(r);
    await dormir(RECARGA_DEL_GOLPE_MS + 80);
  }
  return b.esperar(() => b.de('cae').length > caidas, 3000);
}

/** La mesa vista por un espectador: su revisión y su vista. */
async function comoEsta(codigo: string): Promise<{ rev: number; vista: unknown }> {
  const r = await pedir(`/arcade/mesas/${codigo}`);
  return { rev: Number(r.datos.mesa?.rev), vista: r.datos.mesa?.vista };
}

/**
 * UNA REFRIEGA ENTERA EN UNA MESA DE VERDAD: se prepara, bajan los dos, se encuentran, A tumba a B y el
 * botín entra en la mesa —`mirar` lo enseña—; B renace, se vuelven a encontrar, A lo tumba otra vez
 * antes del minuto y la mesa NO se mueve; y el botín mandado por HTTP sigue siendo un 400. Devuelve una
 * línea para el registro; las comprobaciones van dentro, con el nombre del juego delante.
 */
async function refriegaDeVerdad(juego: JuegoDeLaRefriega): Promise<string> {
  const n = juego.arcade;
  try {
    const { codigo, sentados } = await mesaDeLaRefriega(juego);
    let a: Aparato | null = null;
    let b: Aparato | null = null;
    const porAsiento = new Map<string, Aparato>();
    if (juego.canalAntes) {
      for (const s of sentados) {
        const ap = aparato(codigo);
        await ap.entrar(s.llave);
        porAsiento.set(s.asiento, ap);
      }
    }
    const jugadas = await jugarPorLaApi(juego, codigo, sentados);
    const tras = await comoEsta(codigo);
    const quienes = juego.quienes(sentados, tras.vista);
    comprobar(`${n}: la mesa de verdad se abre, se empieza y —jugando por la API si hace falta— quien va a caer tiene algo que llevarse`, jugadas >= 0 && quienes !== null, { jugadas });
    if (quienes === null) return `${n}: no se ha podido preparar`;
    a = porAsiento.get(quienes.a.asiento) ?? aparato(codigo);
    b = porAsiento.get(quienes.b.asiento) ?? aparato(codigo);
    if (!juego.canalAntes) {
      await a.entrar(quienes.a.llave);
      await b.entrar(quienes.b.llave);
    }
    comprobar(
      `${n}: los dos bajan: \`dentro\` y, justo detrás, \`vidas\` con todos los sentados`,
      [a, b].every((x) => {
        const [primero, segundo] = x.mensajes;
        return primero?.t === 'dentro' && segundo?.t === 'vidas' && segundo.v.length === sentados.length;
      }),
      [a.crudos.slice(0, 2), b.crudos.slice(0, 2)],
    );
    const mundo = mundoDeLaMesa(juego.arcade, tras.vista, codigo);
    if (mundo === null) return `${n}: sin mundo`;
    const arena = arenaDe(mundo);
    const lejos = Math.hypot(b.x - a.x, b.z - a.z) / U;
    const juntos = await encontrarse(arena, a, b);
    comprobar(
      `${n}: se encuentran andando por el mundo de la mesa —${lejos.toFixed(0)} u—, sin una corrección`,
      juntos && a.de('corrige').length === 0 && b.de('corrige').length === 0,
      { juntos, corrigeA: a.de('corrige'), corrigeB: b.de('corrige') },
    );

    const antes = await comoEsta(codigo);
    const cayo = await tumbar(a, b);
    comprobar(
      `${n}: tres golpes por el cable: \`da\` con 2, 1 y 0, y \`cae\`, a los dos`,
      cayo &&
        b.de('da').map((x) => x.vida).join(',') === '2,1,0' &&
        a.ultimo('cae')?.a === quienes.b.asiento &&
        b.ultimo('cae')?.por === quienes.a.asiento,
      { da: b.de('da'), cae: b.ultimo('cae') },
    );
    let despues = antes;
    for (let i = 0; i < 60 && despues.rev === antes.rev; i++) {
      await dormir(50);
      despues = await comoEsta(codigo);
    }
    const pierde = juego.bolsa(antes.vista, quienes.b.asiento) - juego.bolsa(despues.vista, quienes.b.asiento);
    const gana = juego.bolsa(despues.vista, quienes.a.asiento) - juego.bolsa(antes.vista, quienes.a.asiento);
    comprobar(
      `${n}: el botín LLEGA A LA MESA: en una revisión, \`mirar\` enseña que lo que pierde quien cayó lo gana quien lo tumbó`,
      despues.rev === antes.rev + 1 && pierde > 0 && pierde === gana,
      { rev: [antes.rev, despues.rev], pierde, gana },
    );

    const renacio = await b.esperar(() => b.de('renace').length > 0, CAIDO_MS + 3000);
    const renace = b.ultimo('renace');
    const renacidoEn = Date.now();
    const aDondeRenace = renace === undefined ? NaN : Math.hypot(renace.x - a.x, renace.z - a.z) / U;
    if (renace !== undefined) {
      b.x = renace.x;
      b.z = renace.z;
    }
    const otraVez = renacio && (await encontrarse(arena, a, b));
    comprobar(
      `${n}: renace —a ${aDondeRenace.toFixed(0)} u de quien lo tumbó— y se vuelven a encontrar`,
      renacio && otraVez && a.de('corrige').length === 0 && b.de('corrige').length === 0,
      { renace, corrigeA: a.de('corrige'), corrigeB: b.de('corrige') },
    );
    await dormir(Math.max(0, renacidoEn + INTOCABLE_MS + 150 - Date.now()));
    const antesDeLaSegunda = await comoEsta(codigo);
    const cayoOtraVez = await tumbar(a, b);
    await dormir(1200);
    const trasLaSegunda = await comoEsta(codigo);
    comprobar(
      `${n}: tumbado otra vez antes del minuto: \`cae\`, pero la mesa NO se mueve —el botín, una vez y no dos—`,
      cayoOtraVez &&
        trasLaSegunda.rev === antesDeLaSegunda.rev &&
        juego.bolsa(trasLaSegunda.vista, quienes.b.asiento) === juego.bolsa(antesDeLaSegunda.vista, quienes.b.asiento),
      { cayoOtraVez, rev: [antesDeLaSegunda.rev, trasLaSegunda.rev] },
    );

    const porHttp = await pedir(`/arcade/mesas/${codigo}/movimientos`, {
      metodo: 'POST',
      llave: quienes.a.llave,
      cuerpo: { rev: trasLaSegunda.rev, tipo: 'arcade:botin', carga: { de: quienes.b.asiento, para: quienes.a.asiento } },
    });
    const alFinal = await comoEsta(codigo);
    comprobar(
      `${n}: y el botín mandado por HTTP, aun por quien se lo llevaría, sigue siendo un 400 \`movimiento-reservado\`, y la mesa igual`,
      porHttp.estado === 400 && porHttp.datos?.motivo === 'movimiento-reservado' && alFinal.rev === trasLaSegunda.rev,
      { estado: porHttp.estado, datos: porHttp.datos },
    );
    return `${n}: ${String(jugadas)} jugadas por la API; a ${lejos.toFixed(0)} u al bajar; botín de ${String(pierde)}; renace a ${aDondeRenace.toFixed(0)} u`;
  } catch (error) {
    comprobar(`${n}: la refriega de verdad no se cae`, false, error instanceof Error ? error.stack : String(error));
    return `${n}: se cayó`;
  }
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

  paso('La refriega con mesas de VERDAD de los tres juegos: dos aparatos se tumban, y el botín llega a la mesa una vez y no dos');
  {
    const antes = await diagnostico();
    const resultados = await Promise.all(LOS_TRES.map((juego) => refriegaDeVerdad(juego)));
    for (const r of resultados) console.log(`  ${r}`);
    const d = await diagnostico();
    comprobar(
      'y el diagnóstico lo cuenta: seis caídas, tres renacidas al menos, tres botines que ENTRAN y tres que la pareja ya había cobrado',
      d.caidas - antes.caidas === 6 &&
        d.renacidas - antes.renacidas >= 3 &&
        d.botines.entro - antes.botines.entro === 3 &&
        d.botines.porPareja - antes.botines.porPareja === 3 &&
        d.botines.fallos === 0,
      { caidas: d.caidas - antes.caidas, renacidas: d.renacidas - antes.renacidas, botines: d.botines },
    );
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
const COMPROBACIONES_ESCRITAS = 87;
if (hechas < COMPROBACIONES_ESCRITAS) {
  console.log(`Sólo se han hecho ${String(hechas)} de las ${String(COMPROBACIONES_ESCRITAS)} comprobaciones escritas.`);
  process.exit(2);
}

console.log(
  `✔ ${String(hechas)} comprobaciones, ${BINARIO === null ? 'con tsx' : 'contra el COMPILADO'}. El canal de Boots on Board por el cable:\n` +
    '  `hola` → `dentro` donde se puede estar, un paseo legal aceptado entero y visto por el otro, el\n' +
    '  teletransporte, la muralla y la carrera corregidos, los siete cierres con su código, el origen\n' +
    '  y la ruta, el diagnóstico, el temporizador parado sin salas; la refriega en mesas de verdad del\n' +
    '  Burgo, Riberas y Las Lindes, con el botín en la mesa una vez y no dos; y ni una llave en la salida.',
);
process.exit(0);
