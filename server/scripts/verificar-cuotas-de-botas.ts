/**
 * LAS CUOTAS DE CONEXIÓN DEL CANAL DE BOOTS ON BOARD: el guardián a solas, y el servidor de verdad.
 *
 *   npm run verify:cuotas-de-botas
 *
 * ═══ POR QUÉ ESTO ═══
 *
 * Un revisor adversario abrió 3.000 canales SIN saludar desde un solo cliente en 714 ms, y la
 * latencia de `GET /api/salud` pasó de ~1 ms a ~55 ms: el canal no tenía tope de conexiones y las
 * subidas WebSocket no pasan por el limitador de express. Esto comprueba que ya SÍ lo tienen
 * (`server/src/botas/cuotas.ts`, aplicado en `enchufe.ts` antes de `handleUpgrade`), sin castigar a
 * los jugadores de verdad.
 *
 * ═══ LO QUE HACE ═══
 *
 * PRIMERA PARTE, el guardián a solas (determinista, sin red): los cuatro topes —global, sin
 * saludar, concurrentes por procedencia y ritmo por procedencia—, que soltar un canal libera su
 * hueco, y la regla del modo degradado: con procedencia DESCONOCIDA no se bloquea por procedencia,
 * pero el tope global sigue mandando.
 *
 * SEGUNDA PARTE, el servidor de verdad como hijo (puerto libre en [5360,5399], almacén temporal, en
 * modo `plataforma` con un salto para poder distinguir procedencias por `X-Forwarded-For`), con
 * clientes `ws`:
 *   · La inundación sin saludar (procedencia desconocida) se para en el tope: los canales vivos se
 *     quedan acotados, se cuentan los rechazos, y NUNCA se bloquea por procedencia a un desconocido
 *     —sólo por los topes globales—. La salud sigue plana (umbral holgado, contando y sin
 *     cronometrar fino).
 *   · Los jugadores de verdad de varias mesas desde la misma procedencia entran todos por debajo
 *     del tope.
 *   · El ritmo: una ráfaga desde una misma procedencia se corta pasado el cubo.
 *   · El diagnóstico (`/api/arcade/diagnostico`, bloque `botas`) dice cuántas se negaron y por qué,
 *     sin una sola llave ni código de mesa dentro.
 */
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WebSocket } from 'ws';
import { rutaDelCanal, VERSION_DEL_CANAL } from '../../shared/mecanicas/canal-de-botas';
import { LINDES } from '../../shared/arcade/juegos/lindes';
import {
  CuotasDeSubida,
  CONCURRENTES_POR_PROCEDENCIA,
  SUBIDAS_DE_GOLPE,
  TOPE_DE_CANALES_SIN_SALUDAR,
  TOPE_GLOBAL_DE_CANALES,
} from '../src/botas/cuotas';
import type { Procedencia } from '../src/puerta/limitador';

const REPO = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const TSX = path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SERVIDOR = path.join(REPO, 'server', 'src', 'index.ts');

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

const fiable = (ip: string): Procedencia => ({ ip, fiable: true });
const DESCONOCIDA: Procedencia = { ip: 'desconocida', fiable: false, motivo: 'de mentira, para la prueba' };

// ---------------------------------------------------------------------------
// PRIMERA PARTE · EL GUARDIÁN A SOLAS
// ---------------------------------------------------------------------------

paso('El tope GLOBAL: al llenarse, 503; soltar un canal libera el hueco');
{
  const c = new CuotasDeSubida({ topeGlobal: 3, topeSinSaludar: 100, concurrentes: 100, porSegundo: 1000, deGolpe: 1000 });
  const regs = [c.entra(DESCONOCIDA), c.entra(DESCONOCIDA), c.entra(DESCONOCIDA)];
  const lleno = c.admite(DESCONOCIDA);
  comprobar('con el global lleno, 503 con motivo `global`', lleno?.estado === 503 && lleno.motivo === 'global', lleno);
  regs[0].sale();
  comprobar('tras soltar uno, se vuelve a admitir', c.admite(DESCONOCIDA) === null, c.gauges());
}

paso('El tope de CANALES SIN SALUDAR: más estricto que el global, y saludar libera el hueco');
{
  const c = new CuotasDeSubida({ topeGlobal: 100, topeSinSaludar: 2, concurrentes: 100, porSegundo: 1000, deGolpe: 1000 });
  const a = c.entra(DESCONOCIDA);
  c.entra(DESCONOCIDA);
  const lleno = c.admite(DESCONOCIDA);
  comprobar('con dos sin saludar y tope 2, 503 con motivo `sinSaludar`', lleno?.estado === 503 && lleno.motivo === 'sinSaludar', lleno);
  a.saludo();
  comprobar('cuando uno saluda, deja de contar y se admite otro', c.admite(DESCONOCIDA) === null, c.gauges());
  comprobar('y saludar dos veces no descuenta de más', (a.saludo(), c.gauges().sinSaludar === 1), c.gauges());
}

paso('CONCURRENTES por procedencia: una llena no afecta a otra; soltar libera');
{
  const c = new CuotasDeSubida({ topeGlobal: 100, topeSinSaludar: 100, concurrentes: 2, porSegundo: 1000, deGolpe: 1000 });
  const r1 = c.entra(fiable('1.1.1.1'));
  c.entra(fiable('1.1.1.1'));
  const llenaA = c.admite(fiable('1.1.1.1'));
  comprobar('con dos de A y tope 2, 429 con motivo `concurrencia`', llenaA?.estado === 429 && llenaA.motivo === 'concurrencia', llenaA);
  comprobar('otra procedencia B entra a la vez sin problema', c.admite(fiable('2.2.2.2')) === null);
  r1.sale();
  comprobar('al soltar uno de A, A vuelve a admitir', c.admite(fiable('1.1.1.1')) === null, c.gauges());
}

paso('RITMO por procedencia: una ráfaga se corta pasado el cubo, y se rellena con el tiempo');
{
  const c = new CuotasDeSubida({ topeGlobal: 1000, topeSinSaludar: 1000, concurrentes: 1000, porSegundo: 8, deGolpe: 3 });
  const t = 1_000_000;
  const rafaga = [c.admite(fiable('9.9.9.9'), t), c.admite(fiable('9.9.9.9'), t), c.admite(fiable('9.9.9.9'), t)];
  comprobar('las tres primeras (el cubo) pasan', rafaga.every((v) => v === null), rafaga);
  const cortada = c.admite(fiable('9.9.9.9'), t);
  comprobar('la cuarta, en el mismo instante, 429 con motivo `ritmo`', cortada?.estado === 429 && cortada.motivo === 'ritmo', cortada);
  comprobar('un segundo después (8/s) se vuelve a admitir', c.admite(fiable('9.9.9.9'), t + 1000) === null);
}

paso('MODO DEGRADADO: con procedencia desconocida no se bloquea por procedencia, pero el global sí');
{
  const c = new CuotasDeSubida({ topeGlobal: 5, topeSinSaludar: 100, concurrentes: 1, porSegundo: 1, deGolpe: 1 });
  for (let i = 0; i < 4; i++) c.entra(DESCONOCIDA);
  comprobar(
    'cuatro desconocidas con concurrentes(1) y ritmo(1/s): NO se bloquea por procedencia',
    c.admite(DESCONOCIDA) === null,
    c.gauges(),
  );
  c.entra(DESCONOCIDA);
  const global = c.admite(DESCONOCIDA);
  comprobar('pero al llegar al tope global(5), 503 con motivo `global`', global?.estado === 503 && global.motivo === 'global', global);
}

// ---------------------------------------------------------------------------
// SEGUNDA PARTE · EL SERVIDOR DE VERDAD
// ---------------------------------------------------------------------------

/** Un puerto libre en el rango que me toca [5360,5399] (otros son de otros agentes). */
async function puertoLibreEnRango(): Promise<number> {
  for (let p = 5360; p <= 5399; p++) {
    const libre = await new Promise<boolean>((res) => {
      const s = createServer();
      s.once('error', () => res(false));
      s.listen(p, '127.0.0.1', () => s.close(() => res(true)));
    });
    if (libre) return p;
  }
  throw new Error('sin puerto libre en 5360-5399');
}

const PUERTO = await puertoLibreEnRango();
const BASE = `http://127.0.0.1:${String(PUERTO)}/api`;
const CARPETA = fs.mkdtempSync(path.join(os.tmpdir(), 'cuotas-'));
let loQueDijoElServidor = '';
let servidor: ChildProcess | undefined;
const llaves: string[] = [];
let codigoDeMesa = '';

function levantar(): ChildProcess {
  /*
   * En modo `plataforma` con UN salto: así `X-Forwarded-For` se cree y se puede distinguir una
   * procedencia de otra (con el peer del bucle local, sin cabecera, la procedencia es DESCONOCIDA,
   * que es justo el otro caso que hay que probar). Entorno explícito, almacén en mi carpeta.
   */
  const proceso = spawn(process.execPath, [TSX, SERVIDOR], {
    cwd: CARPETA,
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      PORT: String(PUERTO),
      NODE_ENV: 'test',
      PROXY_DE_CONFIANZA: 'plataforma',
      SALTOS_DE_CONFIANZA: '1',
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
  throw new Error(`el servidor no arrancó en ${String(PUERTO)}. Dijo:\n${loQueDijoElServidor.slice(-1500)}`);
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

async function diagnostico(): Promise<any> {
  return (await pedir('/arcade/diagnostico')).datos.botas;
}

/** Latencia de `GET /api/salud`: p50, p95 y máx en `n` muestras. Para medir grueso, no fino. */
async function latenciaSalud(n: number): Promise<{ p50: number; p95: number; max: number }> {
  const ms: number[] = [];
  for (let i = 0; i < n; i++) {
    const t0 = performance.now();
    try {
      await fetch(`${BASE}/salud`);
    } catch {
      ms.push(9999);
      continue;
    }
    ms.push(performance.now() - t0);
    await dormir(4);
  }
  ms.sort((a, b) => a - b);
  const q = (p: number): number => Math.round((ms[Math.min(ms.length - 1, Math.floor(ms.length * p))] ?? 0) * 100) / 100;
  return { p50: q(0.5), p95: q(0.95), max: Math.round(Math.max(...ms) * 100) / 100 };
}

/** Abre un canal por `ws`, opcionalmente con procedencia (X-Forwarded-For). No saluda. */
function abrirCanal(codigo: string, xff?: string): { ws: WebSocket; resultado: Promise<'abierto' | number> } {
  const ws = new WebSocket(`ws://127.0.0.1:${String(PUERTO)}${rutaDelCanal(codigo)}`, {
    handshakeTimeout: 6000,
    ...(xff === undefined ? {} : { headers: { 'x-forwarded-for': xff } }),
  });
  const resultado = new Promise<'abierto' | number>((res) => {
    ws.once('open', () => res('abierto'));
    ws.once('unexpected-response', (_req, resp) => {
      resp.resume();
      res(resp.statusCode ?? 0);
    });
    ws.once('error', () => res(0));
  });
  ws.on('error', () => {});
  return { ws, resultado };
}

const enPie: WebSocket[] = [];

try {
  servidor = levantar();
  await esperarAlServidor();
  console.log('  (servidor de verdad, modo plataforma, un salto)');

  paso('Los jugadores de verdad de varias mesas desde la misma procedencia entran por debajo del tope');
  {
    const antes = await diagnostico();
    /* Dos mesas `botas` de Las Lindes, con tres asientos cada una, empezadas. */
    const mesas: { codigo: string; gente: { asiento: string; llave: string }[] }[] = [];
    for (let m = 0; m < 2; m++) {
      const abierta = await pedir('/arcade/mesas', {
        metodo: 'POST',
        cuerpo: { arcade: LINDES, nombre: 'Ana', modalidad: 'botas', plazoSegundos: 0 },
      });
      comprobar(`la mesa ${m + 1} se abre en \`botas\``, abierta.estado === 201 && abierta.datos.mesa?.modalidad === 'botas', abierta.estado);
      const codigo = String(abierta.datos.codigo);
      if (m === 0) codigoDeMesa = codigo;
      const gente = [{ asiento: String(abierta.datos.asiento), llave: String(abierta.datos.llave) }];
      for (const nombre of ['Bruno', 'Carla']) {
        const r = await pedir(`/arcade/mesas/${codigo}/asientos`, { metodo: 'POST', cuerpo: { nombre } });
        gente.push({ asiento: String(r.datos.asiento), llave: String(r.datos.llave) });
      }
      for (const g of gente) llaves.push(g.llave);
      const vista = await pedir(`/arcade/mesas/${codigo}`, { llave: gente[0]!.llave });
      const empezar = (vista.datos.mesa?.opciones ?? []).find((o: any) => o.tipo === 'lindes:empezar');
      await pedir(`/arcade/mesas/${codigo}/movimientos`, {
        metodo: 'POST',
        llave: gente[0]!.llave,
        cuerpo: { rev: vista.datos.mesa.rev, tipo: 'lindes:empezar', carga: empezar?.carga ?? null },
      });
      mesas.push({ codigo, gente });
    }

    /* Los seis asientos (dos mesas × tres) desde la MISMA procedencia, saludando de verdad. */
    const CASA = '203.0.113.7';
    let dentro = 0;
    for (const mesa of mesas) {
      for (const g of mesa.gente) {
        const { ws, resultado } = abrirCanal(mesa.codigo, CASA);
        enPie.push(ws);
        if ((await resultado) !== 'abierto') continue;
        const visto = new Promise<boolean>((res) => {
          ws.on('message', (d) => {
            if (d.toString().startsWith('{"t":"dentro"')) res(true);
          });
          setTimeout(() => res(false), 3000);
        });
        ws.send(JSON.stringify({ t: 'hola', v: VERSION_DEL_CANAL, llave: g.llave }));
        if (await visto) dentro++;
      }
    }
    comprobar('los seis canales de las dos mesas, misma procedencia, entran (dentro)', dentro === 6, dentro);
    const despues = await diagnostico();
    comprobar(
      'y ni una subida se negó por cuota mientras entraban',
      despues.cuotasNegadas.concurrencia === antes.cuotasNegadas.concurrencia &&
        despues.cuotasNegadas.ritmo === antes.cuotasNegadas.ritmo &&
        despues.cuotasNegadas.global === antes.cuotasNegadas.global &&
        despues.cuotasNegadas.sinSaludar === antes.cuotasNegadas.sinSaludar,
      despues.cuotasNegadas,
    );
    for (const ws of enPie) ws.terminate();
    enPie.length = 0;
    await dormir(200);
  }

  paso('La inundación sin saludar (procedencia desconocida) se para en el tope, y la salud sigue plana');
  let medida: { base: any; pico: any; canalesPico: number; negadasSinSaludar: number; concurrenciaNegada: number; abiertas: number; rechazadas: number } | null = null;
  {
    const base = await latenciaSalud(40);
    const antes = await diagnostico();
    const OBJETIVO = 320; // por encima del tope de sin saludar (200): así se ve el muro
    const BUCLE = 40;

    /* Un muestreador de salud en paralelo mientras se inunda. */
    let inundando = true;
    const picos: number[] = [];
    void (async () => {
      while (inundando) {
        const t0 = performance.now();
        try {
          await fetch(`${BASE}/salud`);
          picos.push(performance.now() - t0);
        } catch {
          picos.push(9999);
        }
        await dormir(15);
      }
    })();

    let abiertas = 0;
    let rechazadas = 0;
    const flota: WebSocket[] = [];
    for (let base_ = 0; base_ < OBJETIVO; base_ += BUCLE) {
      const lote: Promise<void>[] = [];
      for (let k = 0; k < BUCLE && base_ + k < OBJETIVO; k++) {
        /* Sin X-Forwarded-For: procedencia DESCONOCIDA (peer del bucle local). No se saluda. */
        const { ws, resultado } = abrirCanal(codigoDeMesa);
        flota.push(ws);
        lote.push(
          resultado.then((r) => {
            if (r === 'abierto') abiertas++;
            else rechazadas++;
          }),
        );
      }
      await Promise.allSettled(lote);
    }
    const pico = await diagnostico();
    const canalesPico = pico.canales;
    inundando = false;
    await dormir(30);
    picos.sort((a, b) => a - b);
    const picoP95 = Math.round((picos[Math.floor(picos.length * 0.95)] ?? 0) * 100) / 100;

    medida = {
      base,
      pico: { p95: picoP95 },
      canalesPico,
      negadasSinSaludar: pico.cuotasNegadas.sinSaludar - antes.cuotasNegadas.sinSaludar,
      concurrenciaNegada: pico.cuotasNegadas.concurrencia - antes.cuotasNegadas.concurrencia,
      abiertas,
      rechazadas,
    };
    console.log(`   objetivo=${OBJETIVO}  abiertas=${abiertas}  rechazadas=${rechazadas}  canales(pico)=${canalesPico}`);
    console.log(`   salud: base p95=${base.p95}ms max=${base.max}ms · durante la inundación p95=${picoP95}ms`);
    console.log(`   negadas por sinSaludar=${medida.negadasSinSaludar}  por concurrencia=${medida.concurrenciaNegada}`);

    comprobar(
      'los canales vivos se quedan acotados por el tope de sin saludar (no llegan a los 320 pedidos)',
      canalesPico <= TOPE_DE_CANALES_SIN_SALUDAR + 40,
      { canalesPico, tope: TOPE_DE_CANALES_SIN_SALUDAR },
    );
    comprobar('y muchas subidas se rechazan (503), contadas como `sinSaludar`', medida.negadasSinSaludar >= 50 && rechazadas >= 50, {
      negadasSinSaludar: medida.negadasSinSaludar,
      rechazadas,
    });
    const ritmoNegado = pico.cuotasNegadas.ritmo - antes.cuotasNegadas.ritmo;
    comprobar(
      'a una procedencia DESCONOCIDA no se la bloquea por procedencia: cero negadas por concurrencia NI por ritmo',
      medida.concurrenciaNegada === 0 && ritmoNegado === 0,
      { concurrencia: medida.concurrenciaNegada, ritmo: ritmoNegado },
    );
    /* Umbral holgado, que no dependa de la máquina ocupada: el desastre medido era ~55 ms con 3.000 vivos. */
    comprobar('la salud no se dispara (p95 holgado por debajo de 250 ms)', picoP95 < 250, { base: base.p95, pico: picoP95 });

    for (const ws of flota) ws.terminate();
    /* Que el plazo del hola cierre los que quedaran, para no arrastrar canales a la fase siguiente. */
    await dormir(3500);
  }

  paso('El ritmo por procedencia: una ráfaga desde una misma procedencia se corta pasada la de golpe');
  {
    const antes = await diagnostico();
    const PROC = '198.51.100.22';
    const CUANTAS = SUBIDAS_DE_GOLPE + 20; // por encima del cubo, por debajo de concurrentes(64)
    let abiertas = 0;
    let rechazadas = 0;
    const flota: WebSocket[] = [];
    const lote: Promise<void>[] = [];
    for (let i = 0; i < CUANTAS; i++) {
      const { ws, resultado } = abrirCanal(codigoDeMesa, PROC);
      flota.push(ws);
      lote.push(resultado.then((r) => void (r === 'abierto' ? abiertas++ : rechazadas++)));
    }
    await Promise.allSettled(lote);
    const despues = await diagnostico();
    const ritmoNegado = despues.cuotasNegadas.ritmo - antes.cuotasNegadas.ritmo;
    console.log(`   ráfaga=${CUANTAS} desde ${PROC}: abiertas=${abiertas} rechazadas=${rechazadas} negadas por ritmo=${ritmoNegado}`);
    comprobar('la ráfaga se corta: hay negadas por `ritmo`', ritmoNegado >= 1 && rechazadas >= 1, { ritmoNegado, rechazadas });
    comprobar('y por debajo de concurrentes(64) no se corta por concurrencia', despues.cuotasNegadas.concurrencia === antes.cuotasNegadas.concurrencia, {
      concurrencia: despues.cuotasNegadas.concurrencia,
      concurrentes: CONCURRENTES_POR_PROCEDENCIA,
    });
    for (const ws of flota) ws.terminate();
    await dormir(200);
  }

  paso('El diagnóstico lo cuenta, sin una llave ni un código de mesa dentro');
  {
    const d = await diagnostico();
    comprobar(
      'el bloque `botas` trae `cuotasNegadas` con sus cuatro motivos',
      d.cuotasNegadas !== undefined &&
        ['global', 'sinSaludar', 'concurrencia', 'ritmo'].every((k) => typeof d.cuotasNegadas[k] === 'number'),
      d.cuotasNegadas,
    );
    comprobar('con rechazos apuntados de la inundación y de la ráfaga', d.cuotasNegadas.sinSaludar >= 50 && d.cuotasNegadas.ritmo >= 1, d.cuotasNegadas);
    const texto = JSON.stringify((await pedir('/arcade/diagnostico')).datos);
    comprobar('sin una llave ni el código de la mesa dentro', !llaves.some((l) => texto.includes(l)) && !texto.includes(codigoDeMesa), texto.slice(0, 200));
  }

  if (medida !== null) {
    console.log('');
    console.log(`  MEDIDA de la inundación (después): pedidas 320, canales(pico)=${medida.canalesPico}, rechazadas=${medida.rechazadas}, salud p95 ${medida.base.p95}→${medida.pico.p95} ms`);
  }
} catch (error) {
  fallos.push(`la prueba se cayó: ${error instanceof Error ? error.stack : String(error)}`);
} finally {
  for (const ws of enPie) {
    try {
      ws.terminate();
    } catch {
      /* ya cerrado */
    }
  }
  if (servidor) {
    servidor.kill();
    await esperarAQueMuera(servidor);
    if (servidor.exitCode === null && servidor.signalCode === null && servidor.pid) {
      try {
        spawn('taskkill', ['/PID', String(servidor.pid), '/F', '/T']);
      } catch {
        /* nada */
      }
    }
  }
  try {
    fs.rmSync(CARPETA, { recursive: true, force: true });
  } catch {
    /* en Windows un fichero recién cerrado a veces sigue tomado un instante */
  }
}

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
const COMPROBACIONES_ESCRITAS = 26;
if (hechas < COMPROBACIONES_ESCRITAS) {
  console.log(`Sólo se han hecho ${String(hechas)} de las ${String(COMPROBACIONES_ESCRITAS)} comprobaciones escritas.`);
  process.exit(2);
}

console.log(
  `✔ ${String(hechas)} comprobaciones. Las cuotas del canal de Boots on Board: el guardián a solas —global,\n` +
    '  sin saludar, concurrentes y ritmo, con el modo degradado— y el servidor de verdad —la inundación\n' +
    `  acotada con la salud plana, los jugadores de varias mesas entrando, el ritmo cortado y el diagnóstico—.\n` +
    `  (topes de producción: global ${String(TOPE_GLOBAL_DE_CANALES)}, sin saludar ${String(TOPE_DE_CANALES_SIN_SALUDAR)}, ` +
    `concurrentes ${String(CONCURRENTES_POR_PROCEDENCIA)}, ráfaga ${String(SUBIDAS_DE_GOLPE)})`,
);
process.exit(0);
