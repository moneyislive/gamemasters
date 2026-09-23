/**
 * CUÁNTO CUESTA EL CANAL DE BOOTS ON BOARD: un banco en proceso.
 *
 *   npm run medir:botas                          (1, 10, 50 y 100 salas, 8 s cada una)
 *   npm run medir:botas -- --salas 20 --segundos 5
 *   npm run medir:botas -- --red                 (con WebSocket de verdad por el bucle local)
 *   npm run medir:botas -- --salas 50 --jugada 5 (cada mesa mueve cada 5 s: volver a derivar en frío)
 *
 * No es un comprobador y no va en la batería: da CIFRAS para el modelo de coste del documento.
 *
 * ═══ QUÉ SE MONTA ═══
 *
 * `N` salas de Las Lindes con el tablero LLENO —el mundo más cargado de la casa: setenta y dos losas
 * y mil y pico cuerpos—, cada una con su propio código y su propia arena (el paisaje, compartido
 * salvo con `--jugada`: ver EL PAISAJE), y cinco aparatos por sala que mandan un `aqui` por tic
 * (20 Hz) con un paseo legal hecho de antemano con `pasoDelTic` sobre la misma estructura. El reloj
 * es el de pared: el canal corre como en el servidor, con su único temporizador.
 *
 *   · `--falsos` (por defecto): los enchufes cuentan bytes y no mandan nada. Mide la lógica del
 *     canal pura: validar, componer la foto, repartirla.
 *   · `--red`: un servidor HTTP con el enchufe de verdad (`enchufe.ts`) en un puerto del sistema, y
 *     los aparatos son clientes `ws` en el MISMO proceso. El tic incluye entonces el `send` de `ws`
 *     a cada canal, que es lo que cuesta de verdad; el proceso paga además a los clientes, así que
 *     la CPU total de ese modo es una cota por arriba.
 *
 * ═══ QUÉ SE MIDE ═══
 *
 *   · El TIC: tiempo de pared y de CPU de cada llamada del temporizador, en todas las salas.
 *   · LO QUE LLEGA: CPU de atender los `aqui` (leer, validar), por mensaje.
 *   · LA REFRIEGA: cada aparato golpea además una vez cada `GOLPE_CADA_MS` —lo más que deja la
 *     recarga—, hacia donde caiga; se cronometra aparte lo que cuesta atender cada golpe (buscar a
 *     quién le da: rebobinar, alcance, cono y muro), y cuántos golpes por segundo y sala son.
 *   · EL RASTRO: cuántos sitios guarda el rastro de cada asiento para rebobinarle, y cuántos bytes.
 *   · LO QUE BAJA: bytes por sala y segundo, y por aparato.
 *   · LA MEMORIA: montón tras recoger basura, antes y después de levantar las salas, por sala.
 *
 * Y aparte, EL GOLPE EN EL PEOR SITIO: una sala de mentira con seis en corro, todos al alcance y
 * dentro del cono de quien golpea, y con muros alrededor —lo más caro que puede buscar un golpe—.
 */
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { performance } from 'node:perf_hooks';
import { WebSocket } from 'ws';
import { pasoDelTic } from '../../shared/mecanicas/andar';
import { arenaDe } from '../../shared/mecanicas/mundo';
import type { Andante, Arena, MundoDeclarado } from '../../shared/mecanicas/mundo';
import { leerMensajeDelServidor, RECARGA_DEL_GOLPE_MS, rutaDelCanal, VERSION_DEL_CANAL } from '../../shared/mecanicas/canal-de-botas';
import { loQueSeVe } from '../../shared/arcade/juegos/lindes';
import { mundoDeLaMesa, sePuedeRecorrer } from '../../shared/arcade/juegos/mundos';
import { ESPECTADOR, NADIE_SENTADO } from '../../shared/arcade/tipos';
import { CanalDeBotas } from '../src/botas/canal';
import type { Conexion, Enchufe, LaMesa, Reloj } from '../src/botas/canal';
import { enchufarElCanal } from '../src/botas/enchufe';
import { jugarLasLindes } from './robot-de-las-lindes';

const args = process.argv.slice(2);
const opcion = (n: string, pd: string): string => {
  const i = args.indexOf(`--${n}`);
  const v = args[i + 1];
  return i >= 0 && v !== undefined ? v : pd;
};
const RED = args.includes('--red');
const SALAS = opcion('salas', '').length > 0 ? [Number(opcion('salas', '1'))] : [1, 10, 50, 100];
const SEGUNDOS = Number(opcion('segundos', '8'));
const POR_SALA = 5;
const gc = (globalThis as { gc?: () => void }).gc;

/** Cada cuántos tics golpea cada aparato: 17, o sea 850 ms, lo más seguido que deja la recarga (800). */
const GOLPE_CADA_TICS = Math.ceil((RECARGA_DEL_GOLPE_MS + 50) / 50);

/**
 * LOS BYTES DE UN RASTRO DE `sitios` SITIOS, medidos: veinte mil listas hechas como las hace el canal
 * —tres números por sitio, con la hora de pared delante— y el montón antes y después.
 */
const bytesMedidos = new Map<number, number>();
function bytesDelRastro(sitios: number): number {
  const k = Math.max(1, Math.round(sitios));
  const hay = bytesMedidos.get(k);
  if (hay !== undefined) return hay;
  gc?.();
  const antes = process.memoryUsage().heapUsed;
  const listas: number[][] = [];
  for (let i = 0; i < 20_000; i++) {
    const r: number[] = [];
    for (let s = 0; s < k; s++) r.push(1_758_650_000_000 + s * 50, 1_234_567 + s, -7_654_321 - s);
    listas.push(r);
  }
  gc?.();
  const bytes = (process.memoryUsage().heapUsed - antes) / listas.length;
  bytesMedidos.set(k, bytes);
  return bytes;
}

function dormir(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function sorteo(semilla: number): () => number {
  let x = semilla >>> 0;
  return () => {
    x = (Math.imul(x ^ (x >>> 15), 2246822519) + 0x9e3779b9) >>> 0;
    return x / 4294967296;
  };
}

/**
 * Un paseo legal de `tics` pasos desde `desde`, ya en texto: lo que mandaría el aparato. Sus tics
 * empiezan en el UN MILLÓN: los de antes son los de mantenerse vivo mientras entran los demás.
 */
function paseo(arena: Arena, desde: Andante, tics: number, semilla: number): string[] {
  const azar = sorteo(semilla);
  let yo = desde;
  let rumbo = Math.floor(azar() * 256);
  const textos: string[] = [];
  for (let n = 1_000_000; n < 1_000_000 + tics; n++) {
    if (azar() < 0.08) rumbo = Math.floor(azar() * 256);
    const marcha = azar() < 0.6 ? 2 : 1;
    const otro = pasoDelTic(arena, yo, rumbo, marcha);
    if (otro.x === yo.x && otro.z === yo.z) rumbo = Math.floor(azar() * 256);
    yo = otro;
    textos.push(JSON.stringify({ t: 'aqui', n, x: yo.x, z: yo.z, r: rumbo, m: marcha }));
  }
  return textos;
}

/* ─── La mesa de mentira, con el mundo de verdad ─────────────────────────── */

const partida = jugarLasLindes(1, 3);
const VISTA_LLENA = loQueSeVe(partida.estado, ESPECTADOR, NADIE_SENTADO);
const LLAVES = new Map<string, { codigo: string; id: string }>();

/*
 * LAS JUGADAS: con `--jugada N`, cada mesa mueve cada N segundos (escalonadas), o sea que su
 * revisión sube y la sala vuelve a derivar su mundo. El tablero es el mismo —lo que se mide es lo
 * que cuesta volver a derivarlo con las cachés del proceso compartidas entre todas las salas—.
 */
const JUGADA_CADA_S = Number(opcion('jugada', '0'));
const ARRANQUE = Date.now();
function revisionDe(codigo: string): number {
  if (JUGADA_CADA_S <= 0) return 1;
  const desfase = (Number(codigo.slice(1)) * 997) % (JUGADA_CADA_S * 1000);
  return 1 + Math.floor((Date.now() - ARRANQUE + desfase) / (JUGADA_CADA_S * 1000));
}

const LA_MESA: LaMesa = {
  /* El botín no se mide aquí —es de la mesa, y su coste es el de un movimiento—: entra, y ya. */
  botin: async () => ({ salida: 'entro' }),
  quienEsLaLlave: async (codigo, llave) => {
    const a = LLAVES.get(llave);
    return a !== undefined && a.codigo === codigo ? { id: a.id, modalidad: 'botas' } : null;
  },
  revision: async (codigo) => ({ rev: revisionDe(codigo), terminada: false }),
  vista: async (codigo) => ({
    arcade: 'lindes',
    rev: revisionDe(codigo),
    terminada: false,
    asientos: ['s0', 's1', 's2', 's3', 's4'],
    vista: VISTA_LLENA,
  }),
};

/*
 * EL PAISAJE: sin `--jugada`, todas las salas comparten UNO —el del código `BANCO`—, así que su
 * reparto está en las cachés del proceso y abrirlas es barato. Cada sala sigue teniendo SU arena
 * —lo que ocupa en memoria y lo que cuesta validar contra ella no cambia—; lo que se ahorra es
 * montar cincuenta paisajes en frío antes de empezar, que no es lo que se mide aquí y que, con el
 * turno para derivar, pondría a esperar más de un minuto a los últimos en entrar (y a los primeros,
 * quietos, los cerraría la regla de los sesenta segundos). Con `--jugada`, cada sala el suyo: ahí
 * lo que se mide es justamente el frío.
 */
const PAISAJES_DISTINTOS = JUGADA_CADA_S > 0;
function paisajeDe(codigo: string): string {
  return PAISAJES_DISTINTOS ? codigo : 'BANCO';
}

/** El productor de verdad, cronometrado: es lo caro de volver a derivar. */
const derivaciones: number[] = [];
function mundoCronometrado(arcade: string, vista: unknown, codigo: string): ReturnType<typeof mundoDeLaMesa> {
  const t0 = performance.now();
  const m = mundoDeLaMesa(arcade, vista, paisajeDe(codigo));
  if (midiendo) derivaciones.push(performance.now() - t0);
  return m;
}

/* ─── El reloj de pared, con el tic cronometrado ─────────────────────────── */

/*
 * Se cronometra con `performance.now()` y no con `process.cpuUsage()`: en Windows éste avanza a
 * saltos de 15,6 ms y un tic entero cabe en uno. El tic es síncrono y el proceso tiene un hilo, así
 * que su tiempo de pared ES su tiempo de CPU salvo que el sistema le quite el núcleo.
 */
const tics: number[] = [];
let midiendo = false;

const RELOJ: Reloj = {
  ahora: () => Date.now(),
  cada: (ms, hacer) => {
    const t = setInterval(() => {
      if (!midiendo) {
        hacer();
        return;
      }
      const p0 = performance.now();
      hacer();
      tics.push(performance.now() - p0);
    }, ms);
    return { parar: () => clearInterval(t) };
  },
  dentroDe: (ms, hacer) => {
    const t = setTimeout(hacer, ms);
    return { parar: () => clearTimeout(t) };
  },
};

/* ─── Los aparatos ───────────────────────────────────────────────────────── */

interface Aparato {
  mandar(texto: string): void;
  bytes(): number;
  cerrar(): void;
  dentro: Promise<Andante>;
}

function aparatoFalso(canal: CanalDeBotas, codigo: string, llave: string): Aparato {
  let bytes = 0;
  let conexion: Conexion | null = null;
  let resolver: (a: Andante) => void = () => {};
  const dentro = new Promise<Andante>((r) => {
    resolver = r;
  });
  const enchufe: Enchufe = {
    enviar: (texto) => {
      bytes += texto.length;
      if (texto.startsWith('{"t":"dentro"')) {
        const d = leerMensajeDelServidor(texto);
        if (d !== null && d.t === 'dentro') resolver({ x: d.x, z: d.z });
      }
    },
    cerrar: () => {},
    pendientes: () => 0,
  };
  conexion = canal.abrir(codigo, enchufe);
  conexion.recibir(JSON.stringify({ t: 'hola', v: VERSION_DEL_CANAL, llave }));
  return {
    mandar: (t) => conexion?.recibir(t),
    bytes: () => bytes,
    cerrar: () => conexion?.seCerro(),
    dentro,
  };
}

function aparatoDeRed(puerto: number, codigo: string, llave: string): Aparato {
  let bytes = 0;
  const ws = new WebSocket(`ws://127.0.0.1:${String(puerto)}${rutaDelCanal(codigo)}`);
  let resolver: (a: Andante) => void = () => {};
  const dentro = new Promise<Andante>((r) => {
    resolver = r;
  });
  ws.on('open', () => ws.send(JSON.stringify({ t: 'hola', v: VERSION_DEL_CANAL, llave })));
  ws.on('message', (datos) => {
    const texto = datos.toString();
    bytes += Buffer.byteLength(texto);
    if (texto.startsWith('{"t":"dentro"')) {
      const d = leerMensajeDelServidor(texto);
      if (d !== null && d.t === 'dentro') resolver({ x: d.x, z: d.z });
    }
  });
  ws.on('error', () => {});
  return {
    mandar: (t) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(t);
    },
    bytes: () => bytes,
    cerrar: () => ws.close(),
    dentro,
  };
}

/* ─── Una vuelta del banco ───────────────────────────────────────────────── */

function mediana(v: number[]): number {
  const o = [...v].sort((a, b) => a - b);
  return o.length === 0 ? 0 : (o[Math.floor(o.length / 2)] as number);
}
function percentil(v: number[], p: number): number {
  const o = [...v].sort((a, b) => a - b);
  return o.length === 0 ? 0 : (o[Math.min(o.length - 1, Math.floor(o.length * p))] as number);
}
function media(v: number[]): number {
  return v.length === 0 ? 0 : v.reduce((a, b) => a + b, 0) / v.length;
}

async function vuelta(salas: number): Promise<void> {
  LLAVES.clear();
  tics.length = 0;
  derivaciones.length = 0;
  gc?.();
  await dormir(50);
  gc?.();
  const monton0 = process.memoryUsage().heapUsed;

  const canal = new CanalDeBotas({
    reloj: RELOJ,
    mesa: LA_MESA,
    mundos: { sePuedeRecorrer, mundoDeLaMesa: mundoCronometrado },
    registrar: () => {},
  });
  let servidor: http.Server | null = null;
  let puerto = 0;
  if (RED) {
    servidor = http.createServer((_q, r) => r.end());
    enchufarElCanal(servidor, canal, { produccion: false, extra: [] });
    await new Promise<void>((r) => servidor?.listen(0, '127.0.0.1', () => r()));
    puerto = (servidor.address() as AddressInfo).port;
  }

  /*
   * A ENTRAR, CONTANDO. Un banco que se queda esperando en silencio a un aparato que ya no va a
   * entrar se parece mucho a uno que tarda: cada cinco segundos se dice cómo va, con los cierres del
   * canal por motivo, y a los cinco minutos se rinde diciéndolo.
   *
   * Y mientras esperan, los que ya están dentro se mueven una fracción —1/65.536 de unidad, ida y
   * vuelta—: con el turno para derivar, abrir cincuenta paisajes en frío tarda casi un minuto, y a
   * los primeros los cerraría la regla de los sesenta segundos quietos, que es la regla haciendo su
   * trabajo y no lo que se mide aquí. Por eso los paseos de verdad empiezan en el tic un millón.
   */
  const aparatos: { a: Aparato; codigo: string; asiento: number; sitio: Andante | null; latidos: number }[] = [];
  let entrados = 0;
  const empezo = Date.now();
  const vigia = setInterval(() => {
    for (const x of aparatos) {
      if (x.sitio === null) continue;
      x.latidos++;
      x.a.mandar(JSON.stringify({ t: 'aqui', n: x.latidos, x: x.sitio.x + (x.latidos % 2), z: x.sitio.z, r: 0, m: 0 }));
    }
    const d = canal.diagnostico();
    console.log(
      `   … montando: ${String(entrados)}/${String(salas * POR_SALA)} dentro; salas ${String(d.salas)}, canales ${String(d.canales)}, ` +
        `turnos esperando ${String(d.colaParaDerivar)}, cierres ${JSON.stringify(d.cierres)}`,
    );
  }, 5000);
  /*
   * Por tandas de una sala: doscientas cincuenta conexiones a la vez al bucle local, desde un solo
   * proceso, pierden alguna en Windows antes de llegar al servidor —se vio: 18 de 250—, y eso es
   * del banco, no del canal.
   */
  for (let s = 0; s < salas; s++) {
    const codigo = `B${String(s).padStart(4, '0')}`;
    const tanda: Promise<Andante>[] = [];
    for (let i = 0; i < POR_SALA; i++) {
      const llave = `llave-${codigo}-${String(i)}`;
      LLAVES.set(llave, { codigo, id: `s${String(i)}` });
      const a = RED ? aparatoDeRed(puerto, codigo, llave) : aparatoFalso(canal, codigo, llave);
      const x = { a, codigo, asiento: i, sitio: null as Andante | null, latidos: 0 };
      aparatos.push(x);
      void a.dentro.then((sitio) => {
        x.sitio = sitio;
        entrados++;
      });
      tanda.push(a.dentro);
    }
    if (RED) await Promise.all(tanda);
  }
  let sitios: Andante[];
  try {
    sitios = await new Promise<Andante[]>((listo, fallar) => {
      const plazo = setTimeout(() => fallar(new Error('no han entrado todos en cinco minutos')), 300_000);
      void Promise.all(aparatos.map((x) => x.a.dentro)).then((s) => {
        clearTimeout(plazo);
        listo(s);
      });
    });
  } finally {
    clearInterval(vigia);
  }
  console.log(`   (montadas ${String(salas)} salas en ${((Date.now() - empezo) / 1000).toFixed(1)} s)`);

  /* La memoria se mide AQUÍ: las salas y sus canales, y nada de lo que el banco prepara para andar. */
  gc?.();
  await dormir(100);
  gc?.();
  const monton1 = process.memoryUsage().heapUsed;

  /* Los paseos, hechos de antemano sobre el mundo de cada sala: el aparato no cuenta en el banco. */
  const arenas = new Map<string, Arena>();
  const textos: string[][] = [];
  const tics_ = SEGUNDOS * 20 + 40;
  for (let k = 0; k < aparatos.length; k++) {
    const { codigo } = aparatos[k] as { codigo: string };
    let arena = arenas.get(codigo);
    if (arena === undefined) {
      const mundo = mundoDeLaMesa('lindes', VISTA_LLENA, paisajeDe(codigo));
      if (mundo === null) throw new Error('sin mundo');
      arena = arenaDe(mundo);
      arenas.set(codigo, arena);
    }
    textos.push(paseo(arena, sitios[k] as Andante, tics_, 1000 + k));
  }
  arenas.clear();

  /*
   * A andar: un `aqui` por aparato y tic, veinte veces por segundo, cronometrando lo que llega. Y a
   * golpear: cada `GOLPE_CADA_TICS` tics, un golpe de cada aparato hacia donde caiga, con los textos
   * hechos antes de poner el cronómetro, que sólo mide lo que hace el canal con ellos.
   */
  const llegada: number[] = [];
  const golpeando: number[] = [];
  const azarDeLosGolpes = sorteo(20260923);
  let tic = 0;
  const bytes0 = aparatos.map((x) => x.a.bytes());
  const d0 = canal.diagnostico();
  const cpu0 = process.cpuUsage();
  const pared0 = performance.now();
  midiendo = true;
  await new Promise<void>((listo) => {
    const t = setInterval(() => {
      if (tic >= SEGUNDOS * 20) {
        clearInterval(t);
        listo();
        return;
      }
      const p0 = performance.now();
      for (let k = 0; k < aparatos.length; k++) (aparatos[k] as { a: Aparato }).a.mandar((textos[k] as string[])[tic] as string);
      llegada.push(performance.now() - p0);
      if (tic % GOLPE_CADA_TICS === 0) {
        const golpes = aparatos.map(() => JSON.stringify({ t: 'golpe', n: 2_000_000 + tic, r: Math.floor(azarDeLosGolpes() * 256) }));
        const g0 = performance.now();
        for (let k = 0; k < aparatos.length; k++) (aparatos[k] as { a: Aparato }).a.mandar(golpes[k] as string);
        golpeando.push((performance.now() - g0) / aparatos.length);
      }
      tic++;
    }, 50);
  });
  await dormir(200);
  midiendo = false;
  const pared = (performance.now() - pared0) / 1000;
  const cpu = process.cpuUsage(cpu0);
  const d = canal.diagnostico();
  const bajada = aparatos.reduce((s, x, k) => s + x.a.bytes() - (bytes0[k] as number), 0);

  console.log(
    `\n${String(salas).padStart(4)} salas × ${String(POR_SALA)} (${RED ? 'WebSocket de verdad' : 'enchufes que cuentan'}), ${pared.toFixed(1)} s de pared`,
  );
  /* Los tics pares e impares de una sala se alternan foto sí, foto no: la media de los dos es el coste por tic. */
  console.log(
    `   tic (todas las salas): media ${media(tics).toFixed(3)} ms, mediana ${mediana(tics).toFixed(3)}, p95 ${percentil(tics, 0.95).toFixed(3)}, ` +
      `máx ${percentil(tics, 1).toFixed(2)} → ${((media(tics) * 1000) / salas).toFixed(1)} µs por sala y tic ` +
      `(${((media(tics) * 1000 * 2) / salas).toFixed(1)} µs por sala y FOTO, contando el tic sin foto)`,
  );
  if (!RED) {
    console.log(
      `   lo que llega: ${media(llegada).toFixed(3)} ms por tanda de ${String(aparatos.length)} \`aqui\` → ` +
        `${((media(llegada) * 1000) / aparatos.length).toFixed(2)} µs por mensaje (leer y validar)`,
    );
    console.log(
      `   la refriega: ${((d.golpes - d0.golpes) / pared / salas).toFixed(1)} golpes aceptados/s por sala —uno por aparato cada ` +
        `${String(GOLPE_CADA_TICS * 50)} ms, lo más que deja la recarga—, ${(media(golpeando) * 1000).toFixed(2)} µs por golpe ` +
        `(p95 ${(percentil(golpeando, 0.95) * 1000).toFixed(2)}); ${String(d.aciertos - d0.aciertos)} aciertos, ` +
        `${String(d.caidas - d0.caidas)} caídas: por un mundo tan grande casi todos golpean al aire`,
    );
  }
  {
    const porAsiento = d.sitiosEnLosRastros / Math.max(1, salas * POR_SALA);
    console.log(
      `   el rastro para rebobinar: ${porAsiento.toFixed(1)} sitios por asiento de media, ` +
        `${bytesDelRastro(porAsiento).toFixed(0)} bytes por asiento (${((bytesDelRastro(porAsiento) * salas * POR_SALA) / 1024).toFixed(1)} kB entre todas)`,
    );
  }
  if (derivaciones.length > 0) {
    console.log(
      `   volver a derivar el mundo: ${String(derivaciones.length)} veces (${(derivaciones.length / pared).toFixed(1)}/s), ` +
        `mediana ${mediana(derivaciones).toFixed(1)} ms, p95 ${percentil(derivaciones, 0.95).toFixed(1)} ms, ` +
        `${((derivaciones.reduce((a, b) => a + b, 0) / (pared * 1000)) * 100).toFixed(1)} % de un núcleo`,
    );
  }
  /*
   * LA BAJADA, MEDIDA Y A SU RITMO. En Windows un `setInterval(50)` salta cada 62,5 ms —el reloj
   * del sistema va a golpes de 15,6 ms—, así que aquí salen 8 fotos por segundo y no 10. En Render
   * (Linux) el temporizador va a su ritmo: la cifra que vale para el modelo es la de 10 fotos/s.
   */
  /* Todo de la ventana medida: el canal lleva cuentas desde que nació, y abrir las salas también manda fotos. */
  const fotos = d.fotos - d0.fotos;
  const fotosPorSegundo = fotos / aparatos.length / pared;
  const porFoto = (d.bytesDeFotos - d0.bytesDeFotos) / Math.max(1, fotos);
  console.log(
    `   bajada medida: ${(bajada / pared / salas / 1024).toFixed(2)} kB/s por sala (${fotosPorSegundo.toFixed(1)} fotos/s por aparato; ` +
      `${porFoto.toFixed(0)} B por foto, ${String(d.fotosSaltadas - d0.fotosSaltadas)} saltadas) → a 10 fotos/s: ` +
      `${((porFoto * 10 * POR_SALA) / 1024).toFixed(2)} kB/s por sala de carga útil, ${((porFoto * 10) / 1024).toFixed(2)} kB/s por aparato`,
  );
  /*
   * La CPU: con enchufes falsos todo es síncrono y lo cronometrado ES el trabajo del canal (el tic y
   * atender lo que llega), así que su suma por segundo es la parte de un núcleo que ocupa. Con red,
   * `process.cpuUsage()` del proceso entero —en Windows va a saltos de 15,6 ms, así que sólo vale
   * sobre segundos— y con los clientes dentro: una cota por arriba.
   */
  const ocupado = (tics.reduce((a, b) => a + b, 0) + llegada.reduce((a, b) => a + b, 0)) / (pared * 1000);
  console.log(
    RED
      ? `   CPU del proceso (servidor Y clientes, cota por arriba): ${(((cpu.user + cpu.system) / 1000 / (pared * 1000)) * 100).toFixed(1)} % de un núcleo`
      : `   hilo ocupado por el canal: ${(ocupado * 100).toFixed(2)} % de un núcleo`,
  );
  console.log(`   aceptados ${String(d.aceptados)}, correcciones ${JSON.stringify(d.correcciones)}`);
  console.log(
    `   memoria: ${((monton1 - monton0) / 1024 / 1024).toFixed(1)} MB de montón para ${String(salas)} salas → ` +
      `${((monton1 - monton0) / salas / 1024).toFixed(0)} kB por sala${gc === undefined ? ' (SIN --expose-gc: aproximado)' : ''}`,
  );

  for (const x of aparatos) x.a.cerrar();
  canal.apagar();
  if (servidor !== null) {
    servidor.closeAllConnections?.();
    await new Promise<void>((r) => servidor?.close(() => r()));
  }
  await dormir(300);
}

console.log(`Banco del canal de Boots on Board — Las Lindes llenas, ${String(POR_SALA)} aparatos por sala a 20 Hz`);

/*
 * Y LO QUE CUESTA DERIVAR EL MUNDO de una sala nueva, o de una que cambia de revisión: en frío, con
 * veinte códigos distintos (cada uno, su paisaje). Es lo que paga el servidor al abrir una sala y,
 * como mucho una vez por segundo, cuando la partida mueve.
 */
{
  const frio: number[] = [];
  for (let i = 0; i < 20; i++) {
    const t0 = performance.now();
    const mundo = mundoDeLaMesa('lindes', VISTA_LLENA, `FRIO${String(i)}`);
    if (mundo !== null) arenaDe(mundo);
    frio.push(performance.now() - t0);
  }
  const burgo: number[] = [];
  for (let i = 0; i < 20; i++) {
    const t0 = performance.now();
    const mundo = mundoDeLaMesa('burgo', null, `BURG${String(i)}`);
    if (mundo !== null) arenaDe(mundo);
    burgo.push(performance.now() - t0);
  }
  console.log(
    `\nderivar el mundo en frío: Las Lindes llenas ${mediana(frio).toFixed(1)} ms (p95 ${percentil(frio, 0.95).toFixed(1)}), ` +
      `El Burgo ${mediana(burgo).toFixed(1)} ms (p95 ${percentil(burgo, 0.95).toFixed(1)})`,
  );
}

/*
 * EL GOLPE EN EL PEOR SITIO: lo más caro que puede buscar un golpe. Quien golpea tiene a tres delante,
 * los tres al alcance y dentro del cono —así que para los tres se rebobina, se mira el alcance y el
 * cono, y el muro se mira hasta el primero que pasa—, en un prado sembrado de cajas que caen en los
 * mismos cajones del índice. Con un reloj quieto —el del canal no corre—: se golpea nueve veces por
 * sala, las que hacen falta para tumbar a los tres, y se cambia de sala; trescientas salas.
 */
{
  const casillas: { x: number; y: number }[] = [];
  for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) casillas.push({ x, y });
  const cajas: { x0: number; z0: number; x1: number; z1: number }[] = [];
  for (let i = 0; i < 200; i++) {
    const angulo = (i * 2.399963) % (Math.PI * 2);
    const radio = 4 + (i % 25);
    const x = Math.sin(angulo) * radio;
    const z = Math.cos(angulo) * radio;
    cajas.push({ x0: x - 0.3, z0: z - 0.3, x1: x + 0.3, z1: z + 0.3 });
  }
  const MUNDO: MundoDeclarado = {
    lado: 16,
    pisables: casillas,
    vados: [],
    cuerpos: cajas,
    nace: [
      { x: 0, z: 0, rumbo: 0 },
      { x: 0, z: -2.4, rumbo: Math.PI },
      { x: -1.65, z: -1.7, rumbo: Math.PI },
      { x: 1.65, z: -1.7, rumbo: Math.PI },
    ],
  };
  const relojQuieto = { t: 1_000_000 };
  const quieto: Reloj = {
    ahora: () => relojQuieto.t,
    cada: () => ({ parar: () => {} }),
    dentroDe: () => ({ parar: () => {} }),
  };
  const mesaDelCorro: LaMesa = {
    botin: async () => ({ salida: 'entro' }),
    quienEsLaLlave: async () => ({ id: 'c0', modalidad: 'botas' }),
    revision: async () => ({ rev: 1, terminada: false }),
    vista: async () => ({ arcade: 'corro', rev: 1, terminada: false, asientos: ['c0', 'c1', 'c2', 'c3'], vista: null }),
  };
  const medidas: number[] = [];
  let aciertos = 0;
  for (let s = 0; s < 300; s++) {
    const canal = new CanalDeBotas({
      reloj: quieto,
      mesa: mesaDelCorro,
      mundos: { sePuedeRecorrer: () => true, mundoDeLaMesa: () => MUNDO },
      registrar: () => {},
    });
    const enchufe: Enchufe = { enviar: () => {}, cerrar: () => {}, pendientes: () => 0 };
    const c = canal.abrir(`C${String(s).padStart(4, '0')}`, enchufe);
    c.recibir(JSON.stringify({ t: 'hola', v: VERSION_DEL_CANAL, llave: 'la-llave-del-corro' }));
    for (let i = 0; i < 5; i++) await new Promise<void>((r) => setImmediate(r));
    for (let g = 1; g <= 9; g++) {
      relojQuieto.t += RECARGA_DEL_GOLPE_MS + 100;
      const texto = JSON.stringify({ t: 'golpe', n: g, r: 0 });
      const p0 = performance.now();
      c.recibir(texto);
      medidas.push(performance.now() - p0);
    }
    aciertos += canal.diagnostico().aciertos;
    canal.apagar();
  }
  console.log(
    `el golpe en el peor sitio —tres delante, al alcance y en el cono, entre doscientas cajas—: mediana ` +
      `${(mediana(medidas) * 1000).toFixed(1)} µs, p95 ${(percentil(medidas, 0.95) * 1000).toFixed(1)} µs ` +
      `(${String(medidas.length)} golpes, ${String(aciertos)} aciertos)`,
  );
}

for (const n of SALAS) await vuelta(n);
process.exit(0);
