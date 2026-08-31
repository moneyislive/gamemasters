/**
 * ¿Se mantiene estable la conexión de los móviles durante una velada?
 *
 *   npm run verify:estabilidad
 *   npm run verify:estabilidad -- --minutos 5    ← más largo
 *
 * ═══ QUE SE MIDE, Y POR QUE ═══
 *
 * Jugando una partida se noto esto: «se producian desconexiones y habia
 * inestabilidad en los datos de conexion, aunque la app y el estado del juego
 * respondian perfectamente». Esa descripcion es MUY precisa y apunta a un sitio
 * concreto: no a los datos, sino a QUIEN FIGURA CONECTADO.
 *
 * El panel de quien dirige pinta «X de Y con el movil conectado». Ese numero
 * sale de `estaConectado`, que mira la ultima señal de vida de cada cual y la da
 * por buena sesenta segundos. La señal la marca el sondeo largo cada vez que el
 * servidor le contesta, y el servidor retiene la peticion veinticinco segundos
 * antes de decir «sin novedad».
 *
 * Sobre el papel sobra margen: se marca cada 25 s y la ventana es de 60. Pero
 * «sobre el papel» es exactamente lo que no vale aqui, porque el sintoma que se
 * describe es de los que no dejan rastro: nadie pierde una jugada, no hay error
 * en ningun registro, y lo unico que se ve es un punto que se apaga y se
 * enciende. Eso no se deduce leyendo: se mide.
 *
 * ═══ COMO ═══
 *
 * Se levanta un servidor de verdad, se monta una partida, y se ponen N moviles
 * de mentira haciendo EXACTAMENTE lo que hace la app: `GET /jugar/vista?desde=N`
 * en bucle, con el mismo plazo de cliente, reencolando en cuanto contesta.
 *
 * Mientras tanto, un vigilante pregunta cada segundo por el panel de quien
 * dirige y apunta cuantos figuran conectados. Al final se mira una sola cosa:
 *
 *     ¿BAJO alguna vez ese numero teniendo a todos los moviles sondeando?
 *
 * Si baja, hay un parpadeo de verdad y se dice cuando y cuanto duro. Si no baja
 * ni una vez en varios minutos con rondas abriendose y cerrandose, la conexion
 * es estable y el sintoma estaba en otro sitio.
 *
 * Se apuntan ademas los tiempos de respuesta y todo lo que no sea 200 o 204,
 * porque un sondeo que falla y reintenta rapido tampoco baja el contador y aun
 * asi seria inestabilidad.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const PUERTO = 5233;

function argumento(nombre: string): string | undefined {
  const i = process.argv.indexOf(nombre);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/**
 * CONTRA OTRO SERVIDOR, con una partida que ya existe.
 *
 *   npm run verify:estabilidad --  *     --servidor https://harkania.onrender.com --codigo ABCDE --personal XY12ZW
 *
 * ═══ POR QUE HACE FALTA MEDIR FUERA DE ESTA MAQUINA ═══
 *
 * En local esto sale impecable —y salio: la mesa quieta da cinco vueltas de
 * 25,015 s, todas «sin novedad», y nadie deja de figurar conectado ni un
 * segundo—. Y aun asi jugando de verdad se notaron desconexiones.
 *
 * La diferencia no esta en el codigo: esta en lo que hay EN MEDIO. El sondeo
 * largo deja la conexion CALLADA veinticinco segundos, sin mandar un solo byte,
 * y por medio hay un balanceador y el NAT de la operadora. Una espera muda de
 * veinticinco segundos esta justo en el limite de lo que muchos cortan por
 * inactividad. Aqui, con `127.0.0.1`, no hay nada en medio que pueda cortar.
 *
 * Con `--servidor` se mide donde de verdad ocurre. Hacen falta los dos codigos
 * de una partida abierta, que es lo unico que este guion no puede inventarse.
 */
const SERVIDOR = argumento('--servidor');
const CODIGO = argumento('--codigo');
const PERSONAL = argumento('--personal');
const BASE = SERVIDOR ? SERVIDOR.replace(/\/$/, '') : `http://127.0.0.1:${PUERTO}`;

const minutosPedidos = (() => {
  const i = process.argv.indexOf('--minutos');
  const n = i >= 0 ? Number(process.argv[i + 1]) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 2;
})();
const DURACION_MS = minutosPedidos * 60_000;

/**
 * Con `--quieto` la mesa no hace NADA: nadie entra en una sala, no se abre ni
 * se cierra ninguna ronda.
 *
 * Es el experimento de control, y hace falta. Con la mesa activa cada accion
 * sube la revision y despierta a los seis moviles, asi que el sondeo largo
 * devuelve enseguida y NUNCA llega a agotar sus veinticinco segundos: se mide el
 * caso facil sin saberlo. La primera medida salio asi —cero respuestas «sin
 * novedad» en dos minutos— y parecia que algo removia la partida sola.
 *
 * Quieto se mide lo otro: que el sondeo aguante sus 25 s, conteste 204, y la
 * presencia no caduque en el hueco. Que es exactamente donde estaria el
 * parpadeo si lo hubiera.
 */
const QUIETO = process.argv.includes('--quieto');

/** Igual que la app: el servidor retiene 25 s, el cliente espera 40. */
const PLAZO_CLIENTE_MS = 40_000;

let hechas = 0;
const fallos: string[] = [];
function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(`${que}${detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 400)}`}`);
}

interface Respuesta {
  estado: number;
  datos: any;
}

async function pedir(
  ruta: string,
  opciones: { metodo?: string; testigo?: string; cuerpo?: unknown; plazo?: number } = {},
): Promise<Respuesta> {
  const control = new AbortController();
  const t = setTimeout(() => control.abort(), opciones.plazo ?? 15_000);
  try {
    const r = await fetch(`${BASE}/api${ruta}`, {
      method: opciones.metodo ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(opciones.testigo ? { Authorization: `Bearer ${opciones.testigo}` } : {}),
      },
      ...(opciones.cuerpo ? { body: JSON.stringify(opciones.cuerpo) } : {}),
      signal: control.signal,
    });
    const texto = await r.text();
    return { estado: r.status, datos: texto ? JSON.parse(texto) : null };
  } finally {
    clearTimeout(t);
  }
}

// ---------------------------------------------------------------------------
// Un movil de mentira que se porta como los de verdad
// ---------------------------------------------------------------------------

interface Movil {
  nombre: string;
  testigo: string;
  vueltas: number;
  conDatos: number;
  sinNovedad: number;
  raros: Array<{ estado: number; cuando: number }>;
  /** Cuanto tardo cada vuelta, para ver si el sondeo se comporta. */
  tiempos: number[];
  /** El hueco mas largo entre dos respuestas: es lo que decide la presencia. */
  huecoMaximoMs: number;
  ultimaRespuesta: number;
}

async function sondear(m: Movil, hasta: number, revInicial: number): Promise<void> {
  let rev = revInicial;
  while (Date.now() < hasta) {
    const t0 = Date.now();
    try {
      const r = await pedir(`/jugar/vista?desde=${rev}`, {
        testigo: m.testigo,
        plazo: PLAZO_CLIENTE_MS,
      });
      const ahora = Date.now();
      m.vueltas++;
      m.tiempos.push(ahora - t0);
      const hueco = ahora - m.ultimaRespuesta;
      if (hueco > m.huecoMaximoMs) m.huecoMaximoMs = hueco;
      m.ultimaRespuesta = ahora;

      if (r.estado === 204) m.sinNovedad++;
      else if (r.estado === 200) {
        m.conDatos++;
        const nueva = r.datos?.vista?.rev;
        if (typeof nueva === 'number') rev = nueva;
      } else {
        m.raros.push({ estado: r.estado, cuando: ahora });
      }
    } catch {
      m.raros.push({ estado: 0, cuando: Date.now() });
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

// ---------------------------------------------------------------------------
// El paseo
// ---------------------------------------------------------------------------

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'estabilidad-'));
let servidor: ReturnType<typeof spawn> | undefined;

async function esperarServidor(): Promise<void> {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${BASE}/api/salud`);
      if (r.ok) return;
    } catch {
      /* todavia no */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('el servidor no llego a arrancar');
}

/** Marca de salida limpia: no es un fallo, es que ya no hay mas que hacer. */
const FIN = Symbol('fin');

async function sondearContraOtroServidor(): Promise<void> {
  if (!CODIGO || !PERSONAL) {
    console.error('Con --servidor hacen falta --codigo y --personal de una partida abierta.');
    process.exit(2);
  }
  const entrada = await pedir('/jugar/entrar', {
    metodo: 'POST',
    cuerpo: { code: CODIGO, joinCode: PERSONAL },
  });
  comprobar('se entra en la partida', Boolean(entrada.datos?.token), entrada.datos);
  const testigo = entrada.datos?.token as string;
  if (!testigo) return;

  const m: Movil = {
    nombre: entrada.datos?.displayName ?? 'movil',
    testigo,
    vueltas: 0,
    conDatos: 0,
    sinNovedad: 0,
    raros: [],
    tiempos: [],
    huecoMaximoMs: 0,
    ultimaRespuesta: Date.now(),
  };
  const primera = await pedir('/jugar/vista', { testigo });
  await sondear(m, Date.now() + DURACION_MS, (primera.datos?.vista?.rev as number) ?? 0);

  const media = m.tiempos.length
    ? Math.round(m.tiempos.reduce((a, b) => a + b, 0) / m.tiempos.length)
    : 0;
  console.log(
    `  ${m.vueltas} vueltas · ${m.conDatos} con datos · ${m.sinNovedad} sin novedad · ` +
      `media ${media} ms · hueco max ${Math.round(m.huecoMaximoMs / 1000)} s
`,
  );
  if (m.raros.length > 0) {
    console.log('  Vueltas que no acabaron en 200 ni 204:');
    for (const r of m.raros.slice(0, 12)) {
      console.log(`    ${r.estado || 'la conexion se corto sin respuesta'}`);
    }
    console.log('');
  }

  /*
   * ESTA ES LA MEDIDA QUE IMPORTA, y es la que no deja rastro en ningun otro
   * sitio: un corte no se ve como un error de juego. El sondeo se cae, la app
   * pinta «Sin conexion», reintenta a los 2,5 s y vuelve con el estado entero.
   * Nadie pierde una jugada y la franja parpadea. Por eso hay que contarlos.
   */
  comprobar('ningun sondeo se corta contra este servidor', m.raros.length === 0, {
    cortes: m.raros.length,
    vueltas: m.vueltas,
    porque: 'cada corte es una franja de «Sin conexion» aunque el juego no se entere',
  });
  comprobar('la espera larga llega a agotarse, o vuelve con datos', media > 20_000 || m.conDatos > 0, {
    media,
    porque: 'vueltas cortas y sin datos significan que algo las corta antes de tiempo',
  });
}

try {
  console.log(`\nEstabilidad de la conexion · ${minutosPedidos} min\n`);

  servidor = spawn(
    process.execPath,
    [path.join(RAIZ, 'node_modules/tsx/dist/cli.mjs'), path.join(RAIZ, 'server/src/index.ts')],
    {
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
    },
  );
  await esperarServidor();

  // ---- Una partida de CLUEDO, que es donde se noto ----
  const creada = await pedir('/games', { metodo: 'POST', cuerpo: { juego: 'cluedo' } });
  const gameId = creada.datos?.id as string;
  comprobar('se crea la partida', Boolean(gameId), creada.estado);
  if (!gameId) throw new Error('sin partida');

  const alta = (cat: string, name: string) =>
    pedir(`/games/${gameId}/entidades/${cat}`, { metodo: 'POST', cuerpo: { name } });
  for (const n of ['Ana', 'Bruno', 'Carla', 'Dani', 'Elena', 'Fito']) await alta('sospechosos', n);
  for (const n of ['Salon', 'Cocina', 'Biblioteca', 'Jardin']) await alta('salas', n);
  for (const n of ['Candelabro', 'Cuerda', 'Llave']) await alta('objetos', n);

  /*
   * LA GENERACION VA POR UN FLUJO DE EVENTOS, no por una respuesta JSON: dura
   * minutos y va contando por donde va. Se consume entero —que es lo que hace
   * el taller— y se mira el ultimo evento, que es el que dice como acabo.
   */
  const gen = await fetch(`${BASE}/api/games/${gameId}/generate`, { method: 'POST' });
  const flujo = await gen.text();
  const eventos = flujo
    .split(/\r?\n/)
    .filter((l) => l.startsWith('data: '))
    .map((l) => {
      try {
        return JSON.parse(l.slice(6)) as { type?: string };
      } catch {
        return { type: 'ilegible' };
      }
    });
  const ultimo = eventos[eventos.length - 1];
  comprobar(
    'se genera la trama',
    gen.ok && ultimo?.type === 'done',
    { estado: gen.status, ultimo: ultimo?.type, eventos: eventos.length },
  );

  const abierta = await pedir(`/games/${gameId}/live/abrir`, { metodo: 'POST' });
  comprobar('se abre la mesa', abierta.estado < 400, abierta.datos);
  const jugadores = (abierta.datos?.sesion?.players ?? []) as Array<{
    participanteId: string;
    displayName: string;
    joinCode: string;
  }>;
  const codigo = abierta.datos?.sesion?.code as string;
  comprobar('la mesa reparte un sitio por persona', jugadores.length === 6, jugadores.length);

  // ---- Entran todos, como entrarian de verdad ----
  const moviles: Movil[] = [];
  for (const j of jugadores) {
    const entrada = await pedir('/jugar/entrar', {
      metodo: 'POST',
      cuerpo: { code: codigo, joinCode: j.joinCode },
    });
    const testigo = entrada.datos?.token;
    if (!testigo) {
      comprobar(`${j.displayName} entra`, false, entrada.datos);
      continue;
    }
    moviles.push({
      nombre: j.displayName,
      testigo,
      vueltas: 0,
      conDatos: 0,
      sinNovedad: 0,
      raros: [],
      tiempos: [],
      huecoMaximoMs: 0,
      ultimaRespuesta: Date.now(),
    });
  }
  comprobar('entran los seis moviles', moviles.length === 6, moviles.length);

  const primera = await pedir('/jugar/vista', { testigo: moviles[0]!.testigo });
  const revInicial = (primera.datos?.vista?.rev as number) ?? 0;

  // ---- Todos sondeando a la vez, como en la mesa ----
  const hasta = Date.now() + DURACION_MS;
  const sondeos = moviles.map((m) => sondear(m, hasta, revInicial));

  // ---- El vigilante: cuantos figuran conectados, cada segundo ----
  const muestras: Array<{ t: number; conectados: number; fase: string }> = [];
  const vigilante = (async () => {
    while (Date.now() < hasta) {
      try {
        const panel = await pedir(`/games/${gameId}/live`, { plazo: 8000 });
        const n = panel.datos?.conectados;
        if (typeof n === 'number') {
          muestras.push({
            t: Date.now(),
            conectados: n,
            fase: panel.datos?.sesion?.phase ?? '?',
          });
        }
      } catch {
        /* una muestra perdida no invalida la medida */
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  })();

  /*
   * Y MIENTRAS, LA PARTIDA SE JUEGA. Medir con la mesa quieta seria medir el
   * caso facil: lo que interesa es si el contador aguanta con rondas
   * abriendose, gente entrando en salas y el `rev` subiendo, que es cuando el
   * sondeo largo devuelve pronto y se reencola mas veces.
   */
  const jugar = (async () => {
    if (QUIETO) return;
    await new Promise((r) => setTimeout(r, 12_000));
    let ronda = 0;
    while (Date.now() < hasta - 5_000) {
      ronda++;
      await pedir(`/games/${gameId}/live/ronda/abrir`, { metodo: 'POST', cuerpo: { minutos: 15 } });
      await new Promise((r) => setTimeout(r, 8_000));
      const lugares = (primera.datos?.vista?.lugares ?? []) as Array<{ id: string }>;
      for (const [i, m] of moviles.entries()) {
        const lugar = lugares[i % Math.max(1, lugares.length)]?.id;
        if (lugar) await pedir('/jugar/sala', { metodo: 'POST', testigo: m.testigo, cuerpo: { lugarId: lugar } });
      }
      await new Promise((r) => setTimeout(r, 20_000));
      await pedir(`/games/${gameId}/live/ronda/cerrar`, { metodo: 'POST' });
      await new Promise((r) => setTimeout(r, 15_000));
      if (ronda >= 4) break;
    }
  })();

  await Promise.all([...sondeos, vigilante, jugar]);

  // ---- Lo que salio ----
  console.log('  Los moviles:\n');
  for (const m of moviles) {
    const media = m.tiempos.length
      ? Math.round(m.tiempos.reduce((a, b) => a + b, 0) / m.tiempos.length)
      : 0;
    console.log(
      `    ${m.nombre.padEnd(7)} ${String(m.vueltas).padStart(3)} vueltas · ` +
        `${String(m.conDatos).padStart(3)} con datos · ${String(m.sinNovedad).padStart(3)} sin novedad · ` +
        `media ${String(media).padStart(6)} ms · hueco max ${String(Math.round(m.huecoMaximoMs / 1000)).padStart(3)} s` +
        (m.raros.length ? `  ← ${m.raros.length} RESPUESTAS RARAS` : ''),
    );
  }

  const conectadosVistos = muestras.map((m) => m.conectados);
  const minimo = Math.min(...conectadosVistos);
  const maximo = Math.max(...conectadosVistos);

  const bajadas: Array<{ de: number; a: number; segundo: number }> = [];
  for (let i = 1; i < muestras.length; i++) {
    const antes = muestras[i - 1]!.conectados;
    const ahora = muestras[i]!.conectados;
    if (ahora < antes) {
      bajadas.push({ de: antes, a: ahora, segundo: Math.round((muestras[i]!.t - muestras[0]!.t) / 1000) });
    }
  }

  console.log('\n  Quien figura conectado, muestreado cada segundo:\n');
  console.log(`    ${muestras.length} muestras · minimo ${minimo} · maximo ${maximo}`);

  /*
   * EL HUECO ENTRE RESPUESTAS ES LA CAUSA RAIZ de cualquier parpadeo: la
   * presencia caduca a los 60 s, asi que un movil cuyo sondeo tarde mas que eso
   * en volver figura desconectado por definicion. Se mira aparte del contador
   * porque puede acercarse al limite sin llegar a cruzarlo, y eso es un aviso.
   */
  const peorHueco = Math.max(...moviles.map((m) => m.huecoMaximoMs));
  comprobar(
    'ningun movil se queda mas de 60 s sin respuesta (la presencia caduca ahi)',
    peorHueco < 60_000,
    { peorHuecoSegundos: Math.round(peorHueco / 1000) },
  );
  comprobar(
    'y ninguno pasa siquiera de 40 s, que seria acercarse al limite',
    peorHueco < 40_000,
    { peorHuecoSegundos: Math.round(peorHueco / 1000) },
  );

  comprobar(
    'el numero de conectados NO baja con todos los moviles sondeando',
    bajadas.length === 0,
    { bajadas: bajadas.slice(0, 8), porque: 'es el punto que se apaga y se enciende en el panel' },
  );
  comprobar(
    'y llegan a figurar los seis',
    maximo === moviles.length,
    { maximo, moviles: moviles.length },
  );

  if (QUIETO) {
    /*
     * CON LA MESA QUIETA TIENE QUE HABER «SIN NOVEDAD». Si no lo hay, algo esta
     * subiendo la revision de la partida sin que nadie juegue, y eso son seis
     * moviles despertandose entre ellos toda la velada: bateria, datos y una
     * pantalla que se redibuja sola. No es una desconexion, pero es
     * exactamente «inestabilidad en los datos de conexion».
     */
    const sinNovedad = moviles.reduce((a, m) => a + m.sinNovedad, 0);
    comprobar('con la mesa quieta, el sondeo contesta «sin novedad»', sinNovedad > 0, {
      sinNovedad,
      conDatos: moviles.reduce((a, m) => a + m.conDatos, 0),
      porque: 'si todo llega con datos, algo remueve la partida sola',
    });
  }

  const raros = moviles.reduce((a, m) => a + m.raros.length, 0);
  comprobar('ningun sondeo falla ni se corta', raros === 0, {
    raros: moviles.flatMap((m) => m.raros).slice(0, 6),
  });
} catch (e) {
  if (e !== FIN) fallos.push(`la prueba se cayo: ${e instanceof Error ? e.message : String(e)}`);
} finally {
  servidor?.kill();
  await new Promise((r) => setTimeout(r, 600));
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* carpeta temporal */
  }
}

console.log(`\n${hechas} comprobaciones`);
if (fallos.length === 0) {
  console.log('\nLa conexion aguanta la velada sin parpadear.\n');
  process.exit(0);
}
console.log(`\n${fallos.length} FALLOS:\n`);
for (const f of fallos) console.log(`  ✗ ${f}`);
console.log('');
process.exit(1);
