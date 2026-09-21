/**
 * JUGAR UNA MESA DE LAS LINDES DE VERDAD, POR HTTP.
 *
 *   npm run jugar:lindes                                   (levanta su propio servidor)
 *   npm run jugar:lindes -- --servidor http://localhost:5174
 *   npm run jugar:lindes -- --codigo ABCDE                 (acompañante, contra la pantalla)
 *
 * ═══ POR QUÉ LEVANTA SU PROPIO SERVIDOR, Y POR QUÉ ESO ERA LA CONDICIÓN PARA ENTRAR ═══
 *
 * Este guion existía desde el cierre de Las Lindes y NO estaba en la batería, porque pedía un
 * servidor levantado a mano. Meterlo tal cual habría sido peor que no meterlo, y no por lo
 * que parece:
 *
 *   · Sin nada levantado era ROJO SIEMPRE, en medio segundo, con un `TypeError: fetch failed`.
 *   · Y con algo levantado era VERDE MIDIENDO OTRO ÁRBOL. El puerto por defecto era el 5174,
 *     que en este repositorio es la entrada `sala` de `.claude/launch.json` — y esa entrada
 *     arranca `../GameMasters-arcade/server`, OTRO WORKTREE. O sea que la batería habría dado
 *     verde por el trabajo de otra rama, y además le habría escrito mesas de verdad en su
 *     almacén.
 *
 * Así que cuando no se le dice a dónde ir, se levanta uno propio en un puerto que PIDE AL
 * SISTEMA (`listen(0)`), como hacen `verify:larga` y `verify:mesa`. No en un rango al azar
 * como `jugar:fondo`, cuyo 7600-7899 incluye un 7680 que en esta máquina tiene cogido un
 * `svchost.exe` para siempre: una de cada trescientas corridas elige un puerto que no va a
 * poder abrir nunca, y el rojo que sale no tiene nada que ver con lo que se tocó.
 *
 * ═══ QUÉ AÑADE SOBRE LA BATERÍA, QUE YA ESTÁ VERDE ═══
 *
 * `verify:lindes` juega diez partidas con el reductor, `verify:mesa` juega una entera con
 * el árbitro de la mesa y vigila la bolsa en cada revisión, y `oro:arcade` congela una
 * movimiento a movimiento. Ninguna de las tres PASA POR EL CABLE.
 *
 * Y por el cable hay cosas que sólo se ven ahí, porque no son del juego sino del tamaño:
 *
 *   · CUÁNTO PESA UNA MESA con el tablero lleno. La proyección de Las Lindes lleva dentro
 *     un tablero declarado —caras, líneas, nudos y acciones, con rótulos y ayudas de texto
 *     libre— que se compone ENTERO en cada lectura. Con setenta y dos losas puestas eso es
 *     el objeto más gordo que publica ningún arcade de esta casa, y baja en CADA sondeo, a
 *     un móvil, por datos. Nadie lo había pesado.
 *   · CUÁNTO TARDA en componerse, medido desde fuera del proceso.
 *   · Y QUE LA PARTIDA ENTERA CABE por las rutas de verdad: sin un 500, sin un cuerpo
 *     rechazado por tamaño, y con el control de revisiones aguantando una partida larga.
 *
 * ═══ QUÉ ES FALLO Y QUÉ NO ═══
 *
 * Un 409 NO es fallo: es el motor rechazando lo que no tocaba, que es su trabajo. Fallo es
 * un 500, una vista incoherente, una partida que no avanza, o un movimiento sacado del
 * TABLERO QUE EL PROPIO SERVIDOR ACABA DE MANDAR y que el servidor rechaza — eso último es
 * lo más grave que puede encontrar este guion, porque significa que lo que se pinta y lo
 * que se acepta no son la misma cosa.
 */
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LINDES } from '../../shared/arcade/juegos/lindes';

const args = process.argv.slice(2);
const opcion = (n: string, pd: string): string => {
  const i = args.indexOf(`--${n}`);
  const v = args[i + 1];
  return i >= 0 && v !== undefined ? v : pd;
};

const CUANTOS = Number(opcion('jugadores', '3'));
const TOPE = Number(opcion('tope', '400'));

/**
 * EL CODIGO DE UNA MESA YA ABIERTA, PARA JUGAR CONTRA QUIEN ESTA EN PANTALLA.
 *
 * Sin el, el guion abre su mesa y la juega entera, que es lo que hace falta para medir el
 * cable. Con el se sienta en la que ya hay abierta, juega SOLO sus asientos y espera cuando
 * el turno es de alguien que no es suyo.
 *
 * Hace falta porque las dos veces que esta casa ha encontrado fallos que la bateria no ve
 * ha sido jugando una mesa de verdad con un asiento en pantalla, y para eso el companero
 * tiene que poder sentarse DONDE YA ESTA la persona. Por eso aqui el «el turno es de
 * alguien que no esta sentado» deja de ser queja: es lo normal cuando al otro lado hay
 * alguien. Fuera de este modo sigue siendo fallo, que es lo que vigila la bateria.
 */
const CODIGO = opcion('codigo', '').toUpperCase();
const ACOMPANANDO = CODIGO.length > 0;

/** Cuanto se espera antes de volver a mirar si ya le toca a un robot, en ms. */
const OJEADA_MS = 800;

/**
 * CUÁNTO SE ESPERA EN TOTAL A QUE JUEGUE LA PERSONA, ANTES DE RENDIRSE.
 *
 * Las dos ramas de acompañante hacen `vueltas--; continue;`, o sea que si al otro lado no
 * juega nadie el bucle NO TERMINA NUNCA. La batería lanza con `spawnSync` y SIN plazo, así
 * que un `--codigo` que se colara la dejaría colgada para siempre. Nunca va a pasar —la
 * batería no pasa `--codigo`— pero un guion que puede colgarse acaba colgándose.
 */
const ESPERAS_SEGUIDAS = 240;

/**
 * LO MÁS GORDO QUE PUEDE BAJAR UNA LECTURA DE LA MESA.
 *
 * 128 kB, y NO los 96 kB de `verify:mesa`: aquel tope mide la vista EN PROCESO (74,2 kB
 * medidos ahí), y por el cable la mesa añade asientos, opciones y avisos encima. Medido por
 * el cable en diez repartos distintos, con tres a la mesa: 84,5 · 85,7 · 85,9 · 86,2 · 88,0 ·
 * 88,1 · 88,4 · 92,3 · 92,7 · 95,0 kB. Reutilizar el 96 dejaría un kilobyte de margen sobre
 * el peor caso, que es exactamente el comprobador que se cae uno de cada tres días. 128 son
 * un 35 % sobre el peor medido.
 *
 * El número es para TRES a la mesa, que es lo que corre la batería. Cada asiento añade un
 * renglón al panel, así que con `--jugadores 5` un rojo de aquí no es del producto.
 */
const TOPE_DEL_CABLE = 128 * 1024;

/*
 * ═══ EL SERVIDOR: EL SUYO, SALVO QUE SE LE DIGA OTRA COSA ═══
 *
 * `--servidor` y `--codigo` siguen funcionando exactamente igual que antes, porque el modo
 * acompañante es la única forma que hay de jugar una mesa con un asiento humano —y encontró
 * la mitad de los catorce fallos del cierre de Las Lindes—. Lo que cambia es el caso en que
 * no se dice nada: antes caía al 5174 de otro worktree, y ahora levanta el suyo.
 */
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(AQUI, '..', '..');
const TSX = path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const ARRANQUE = path.join(REPO, 'server', 'src', 'index.ts');

const SERVIDOR_DICHO = opcion('servidor', '').replace(/\/$/, '');
/** Si se levanta uno propio: ni se dijo servidor, ni se está acompañando a nadie. */
const PROPIO = SERVIDOR_DICHO === '' && !ACOMPANANDO;

/** Un puerto que el sistema dice que está libre, y no uno elegido al azar. */
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

const PUERTO = PROPIO ? await puertoLibre() : 0;
const BASE = PROPIO
  ? `http://127.0.0.1:${String(PUERTO)}`
  : SERVIDOR_DICHO === ''
    ? 'http://localhost:5174'
    : SERVIDOR_DICHO;

const CARPETA = PROPIO ? fs.mkdtempSync(path.join(os.tmpdir(), 'lindes-cable-')) : '';
let loQueDijoElServidor = '';
let servidor: ChildProcess | undefined;

function levantar(): ChildProcess {
  const proceso = spawn(process.execPath, [TSX, ARRANQUE], {
    cwd: CARPETA,
    env: {
      PATH: process.env['PATH'],
      SystemRoot: process.env['SystemRoot'],
      TEMP: process.env['TEMP'],
      TMP: process.env['TMP'],
      PORT: String(PUERTO),
      NODE_ENV: 'test',
      MESAS_DIR: path.join(CARPETA, 'mesas'),
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

/**
 * Esperar a que escuche, y si no, DECIR LO QUE DIJO.
 *
 * `jugar:fondo` lanza con `stdio: 'ignore'` y cuando no arranca lo único que se lee es «el
 * servidor no llegó a arrancar», sin una palabra del servidor. Eso convierte cualquier fallo
 * de arranque —un puerto imposible, un error de compilación— en el mismo mensaje mudo, y
 * enseña a volver a correr la batería en vez de a leerla.
 */
async function esperarAlServidor(): Promise<void> {
  for (let i = 0; i < 200; i++) {
    try {
      const r = await fetch(`${BASE}/api/salud`);
      if (r.ok) return;
    } catch {
      /* todavía no escucha */
    }
    await dormir(250);
  }
  throw new Error(
    `el servidor no arrancó en el puerto ${String(PUERTO)}. Dijo:\n${loQueDijoElServidor.slice(-1500)}`,
  );
}

const dormir = async (ms: number): Promise<void> =>
  new Promise((listo) => {
    setTimeout(listo, ms);
  });

interface Respuesta {
  estado: number;
  datos: Record<string, unknown>;
  bytes: number;
  ms: number;
}

/*
 * ═══ LA LLAVE DEL ASIENTO VA EN UNA CABECERA, NO EN LA CONSULTA ═══
 *
 * `x-asiento`, que es lo que lee `llaveDe` en `routes/arcade.ts`. Escrito aquí porque la
 * primera version de este guion la mandaba como `?asiento=&llave=`, el servidor contestaba
 * tan tranquilo —con la vista de un ESPECTADOR, que no tiene opciones— y el guion decia
 * «la mesa no ofrece empezar». Un secreto que no viaja donde toca no da un 401: da una
 * vista de mirón, que es exactamente lo que se pidió.
 */
async function pedir(
  ruta: string,
  opciones?: { metodo?: string; cuerpo?: unknown; llave?: string },
): Promise<Respuesta> {
  const arranca = Date.now();
  const cabeceras: Record<string, string> = {};
  if (opciones?.cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';
  if (opciones?.llave !== undefined) cabeceras['x-asiento'] = opciones.llave;
  let r: Response;
  try {
    r = await fetch(`${BASE}/api${ruta}`, {
      method: opciones?.metodo ?? 'GET',
      headers: cabeceras,
      body: opciones?.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo),
    });
  } catch (e) {
    /*
     * Sin esto, un servidor que no está al otro lado revienta con un `TypeError: fetch
     * failed` y una pila de veinte líneas de `node:internal` que no dice ni a qué dirección
     * se llamó. Es el caso más probable de todos —se corre el modo acompañante sin haber
     * levantado nada— y merece una frase, no un volcado.
     */
    throw new Error(
      `no contesta nadie en ${BASE} (${e instanceof Error ? e.message : String(e)}).` +
        (PROPIO ? '' : '\n  Si querías que levantara el suyo, no le pases --servidor ni --codigo.'),
    );
  }
  const texto = await r.text();
  const ms = Date.now() - arranca;
  let datos: Record<string, unknown> = {};
  try {
    datos = JSON.parse(texto) as Record<string, unknown>;
  } catch {
    datos = { textoCrudo: texto.slice(0, 200) };
  }
  return { estado: r.status, datos, bytes: Buffer.byteLength(texto, 'utf8'), ms };
}

/**
 * LA MESA DENTRO DE LA RESPUESTA. El cuerpo es `{ mesa, avisos }` al leer y
 * `{ codigo, asiento, llave, mesa }` al abrir: en los dos, lo que importa cuelga de
 * `mesa`. Se desenvuelve UNA vez y aquí, para no repartir `?? r.datos` por el guion.
 */
function laMesaDe(r: Respuesta): {
  rev?: unknown;
  terminada?: unknown;
  vista?: unknown;
  opciones?: unknown;
} {
  const m = r.datos['mesa'];
  return (typeof m === 'object' && m !== null ? m : r.datos) as {
    rev?: unknown;
    terminada?: unknown;
    vista?: unknown;
    opciones?: unknown;
  };
}

/** Un toque del tablero declarado: lo que el mueble mandaría al pulsarlo. */
interface Toque {
  tipo: string;
  carga: unknown;
}

/**
 * TODOS LOS MOVIMIENTOS QUE OFRECE EL TABLERO QUE BAJÓ, y no los que el juego sabe.
 *
 * Es la diferencia entera de este guion: se juega con lo que el servidor MANDÓ, así que si
 * manda un botón que luego rechaza, se ve aquí y no en ningún otro sitio.
 */
function toquesDe(vista: unknown): Toque[] {
  if (typeof vista !== 'object' || vista === null) return [];
  const tablero = (vista as { tablero?: unknown }).tablero;
  if (typeof tablero !== 'object' || tablero === null) return [];
  const t = tablero as Record<string, unknown>;
  const toques: Toque[] = [];
  for (const lista of ['nudos', 'lineas', 'caras', 'acciones']) {
    const piezas = t[lista];
    if (!Array.isArray(piezas)) continue;
    for (const pieza of piezas) {
      const p = pieza as { toque?: unknown; disponible?: unknown };
      if (p.disponible === false) continue;
      /* `toque: null` es legítimo —una cara del tablero que sólo se pinta— y hay muchas. */
      const toque = p.toque as { tipo?: unknown; carga?: unknown } | null | undefined;
      if (toque === null || toque === undefined || typeof toque.tipo !== 'string') continue;
      toques.push({ tipo: toque.tipo, carga: toque.carga ?? null });
    }
  }
  return toques;
}

interface Asiento {
  asiento: string;
  llave: string;
  nombre: string;
}

const reproches: string[] = [];
const quejarse = (q: string): void => {
  reproches.push(q);
  console.log(`  ✗ ${q}`);
};

/**
 * CUÁNTAS AFIRMACIONES SE HAN HECHO.
 *
 * Sin esta cifra la entrada sale en la batería como `✓ Las Lindes por el cable  2,9s` y no
 * hay forma de distinguirla de una que no comprobó nada: cero inspeccionados se lee como
 * vigilado. `jugar:fondo` imprime la suya —«2138 comprobaciones jugando»— y ésta también.
 */
let comprobaciones = 0;

/** Una afirmación: se cuenta siempre, se queja sólo si no se cumple. */
const comprobar = (que: string, condicion: boolean, detalle?: unknown): void => {
  comprobaciones++;
  if (condicion) return;
  quejarse(detalle === undefined ? que : `${que} — ${JSON.stringify(detalle)}`);
};

/** Cuántas ojeadas seguidas se llevan esperando a que juegue alguien que no es nuestro. */
let esperasSeguidas = 0;

/** ¿Se sigue esperando a la persona, o ya es rendirse? Ver `ESPERAS_SEGUIDAS`. */
const seguirEsperando = (): boolean => {
  esperasSeguidas++;
  if (esperasSeguidas <= ESPERAS_SEGUIDAS) return true;
  quejarse(
    `se llevan ${String(ESPERAS_SEGUIDAS)} ojeadas seguidas —unos ` +
      `${String(Math.round((ESPERAS_SEGUIDAS * OJEADA_MS) / 60000))} minutos— esperando a que juegue ` +
      'alguien que no es nuestro. Se para en vez de esperar para siempre.',
  );
  return false;
};

async function jugar(): Promise<void> {
  console.log(`\nJugando una mesa de Las Lindes contra ${BASE}\n`);

  /* ── Abrir y sentarse ───────────────────────────────────────────────────── */
  const abierta = ACOMPANANDO
    ? await pedir(`/arcade/mesas/${CODIGO}/asientos`, { metodo: 'POST', cuerpo: { nombre: 'Ana' } })
    : await pedir('/arcade/mesas', { metodo: 'POST', cuerpo: { arcade: LINDES, nombre: 'Ana' } });
  /* Abrir devuelve 201 —se ha creado algo—; sentarse, 200. Se aceptan los dos por su sitio. */
  if (abierta.estado !== 200 && abierta.estado !== 201) {
    quejarse(`abrir la mesa contestó ${String(abierta.estado)}: ${JSON.stringify(abierta.datos).slice(0, 200)}`);
    return;
  }
  const codigo = ACOMPANANDO ? CODIGO : String(abierta.datos['codigo']);
  const gente: Asiento[] = [
    {
      asiento: String(abierta.datos['asiento']),
      llave: String(abierta.datos['llave']),
      nombre: 'Ana',
    },
  ];
  console.log(
    `  mesa ${codigo} ${ACOMPANANDO ? 'acompanada' : 'abierta'} (${String(abierta.bytes)} B, ${String(abierta.ms)} ms)`,
  );

  for (let i = 1; i < CUANTOS; i++) {
    const nombre = ['Bruno', 'Carla', 'Diego', 'Eva'][i - 1] ?? `J${String(i)}`;
    const entra = await pedir(`/arcade/mesas/${codigo}/asientos`, {
      metodo: 'POST',
      cuerpo: { nombre },
    });
    if (entra.estado !== 200 && entra.estado !== 201) {
      quejarse(`sentar a ${nombre} contestó ${String(entra.estado)}`);
      return;
    }
    gente.push({
      asiento: String(entra.datos['asiento']),
      llave: String(entra.datos['llave']),
      nombre,
    });
  }
  console.log(`  ${String(gente.length)} sentados`);

  /* ── La partida ─────────────────────────────────────────────────────────── */
  const mover = async (quien: Asiento, toque: Toque, rev: number): Promise<Respuesta> =>
    pedir(`/arcade/mesas/${codigo}/movimientos`, {
      metodo: 'POST',
      llave: quien.llave,
      /* El movimiento va PLANO —`rev`, `tipo` y `carga`—, no envuelto en `movimiento`. */
      cuerpo: { rev, tipo: toque.tipo, carga: toque.carga },
    });

  const leer = async (quien: Asiento): Promise<Respuesta> =>
    pedir(`/arcade/mesas/${codigo}`, { llave: quien.llave });

  const primera = gente[0] as Asiento;
  let vista = await leer(primera);
  const empezar = toquesDe(laMesaDe(vista).vista).find((t) => t.tipo === 'lindes:empezar');
  /*
   * `empezar` no sale del tablero —antes de empezar no hay tablero— sino de `opciones`, que
   * es lo que la mesa manda al lado. Se busca en los dos por el mismo motivo por el que se
   * juega desde el tablero: usar lo que el servidor mandó y no lo que uno sabe.
   */
  const deOpciones = (r: Respuesta): Toque[] => {
    const op = laMesaDe(r).opciones;
    if (!Array.isArray(op)) return [];
    return op
      .filter((o) => typeof (o as { tipo?: unknown }).tipo === 'string')
      .map((o) => ({ tipo: String((o as { tipo: string }).tipo), carga: (o as { carga?: unknown }).carga ?? null }));
  };
  const arranque = empezar ?? deOpciones(vista).find((t) => t.tipo === 'lindes:empezar');
  if (ACOMPANANDO) {
    /* La bolsa la vuelca quien esta en pantalla: aqui solo se acompana. */
    console.log('  esperando a que se vuelque la bolsa desde la pantalla...');
  } else {
    if (arranque === undefined) {
      quejarse('la mesa recién abierta no ofrece «empezar» ni en el tablero ni en las opciones');
      return;
    }
    const rev0 = Number(laMesaDe(vista).rev ?? 0);
    const arrancada = await mover(primera, arranque, rev0);
    if (arrancada.estado !== 200) {
      quejarse(`empezar contestó ${String(arrancada.estado)}: ${JSON.stringify(arrancada.datos).slice(0, 200)}`);
      return;
    }
  }

  let vueltas = 0;
  let rechazos = 0;
  let mayorLectura = 0;
  let sumaLecturas = 0;
  let lecturas = 0;
  let masLento = 0;
  const porFamilia = new Map<string, number>();
  let terminada = false;

  for (; vueltas < TOPE; vueltas++) {
    /* Se lee SIEMPRE con el asiento a quien le toca, que es lo que hace un cliente. */
    const deQuien = (r: Respuesta): string | null => {
      const t = (laMesaDe(r).vista as { turnoDe?: unknown } | undefined)?.turnoDe;
      return typeof t === 'string' ? t : null;
    };
    const cualquiera = await leer(primera);
    lecturas++;
    sumaLecturas += cualquiera.bytes;
    if (cualquiera.bytes > mayorLectura) mayorLectura = cualquiera.bytes;
    if (cualquiera.ms > masLento) masLento = cualquiera.ms;
    comprobaciones++;
    if (cualquiera.estado !== 200) {
      quejarse(`leer la mesa contestó ${String(cualquiera.estado)}`);
      return;
    }
    comprobaciones++;
    if (cualquiera.bytes > TOPE_DEL_CABLE) {
      quejarse(
        `vuelta ${String(vueltas)}: una lectura de la mesa pesa ${(cualquiera.bytes / 1024).toFixed(1)} kB, ` +
          `por encima de los ${String(TOPE_DEL_CABLE / 1024)} kB del presupuesto del cable`,
      );
      return;
    }
    const mesa = laMesaDe(cualquiera);
    if (mesa.terminada === true) {
      terminada = true;
      break;
    }
    const turno = deQuien(cualquiera);
    comprobaciones++;
    if (turno === null) {
      if (ACOMPANANDO) {
        /* Todavia no se ha volcado la bolsa. Se mira otra vez sin gastar vuelta. */
        if (!seguirEsperando()) return;
        await dormir(OJEADA_MS);
        vueltas--;
        continue;
      }
      quejarse('la mesa empezada no dice de quién es el turno');
      return;
    }
    const quien = gente.find((g) => g.asiento === turno);
    comprobaciones++;
    if (quien === undefined) {
      if (ACOMPANANDO) {
        /* Le toca a la persona de la pantalla: se espera, que es lo que hace un companero. */
        if (!seguirEsperando()) return;
        await dormir(OJEADA_MS);
        vueltas--;
        continue;
      }
      quejarse(`el turno es de «${turno}», que no está sentado`);
      return;
    }
    esperasSeguidas = 0;
    const suya = quien.asiento === primera.asiento ? cualquiera : await leer(quien);
    if (quien.asiento !== primera.asiento) {
      lecturas++;
      sumaLecturas += suya.bytes;
      if (suya.bytes > mayorLectura) mayorLectura = suya.bytes;
      if (suya.ms > masLento) masLento = suya.ms;
    }
    const suMesa = laMesaDe(suya);
    const toques = toquesDe(suMesa.vista);
    comprobaciones++;
    if (toques.length === 0) {
      quejarse(`vuelta ${String(vueltas)}: el tablero de quien tiene el turno no ofrece ni un toque`);
      return;
    }

    const dePoner = toques.filter((t) => t.tipo === 'lindes:poner');
    const dePlantar = toques.filter((t) => t.tipo === 'lindes:plantar');
    const dePasar = toques.filter((t) => t.tipo === 'lindes:pasar');
    let elegido: Toque;
    if (dePoner.length > 0) elegido = dePoner[vueltas % dePoner.length] as Toque;
    else if (vueltas % 3 === 0 && dePasar.length > 0) elegido = dePasar[0] as Toque;
    else if (dePlantar.length > 0) elegido = dePlantar[vueltas % dePlantar.length] as Toque;
    else elegido = toques[0] as Toque;

    const rev = Number(suMesa.rev ?? mesa.rev ?? 0);
    const hecho = await mover(quien, elegido, rev);
    porFamilia.set(elegido.tipo, (porFamilia.get(elegido.tipo) ?? 0) + 1);

    comprobaciones++;
    if (hecho.estado === 200) continue;
    if (hecho.estado >= 500) {
      quejarse(`vuelta ${String(vueltas)}: ${elegido.tipo} reventó el servidor (${String(hecho.estado)})`);
      return;
    }
    /*
     * ═══ UN 409 AQUÍ SÍ ES FALLO, Y ES EL HALLAZGO QUE ESTE GUION BUSCA ═══
     *
     * No se está disparando a todo: el movimiento sale del TABLERO QUE ESTE MISMO SERVIDOR
     * acaba de mandar, con `disponible` puesto por él, y con la revisión que él dijo. Que lo
     * rechace significa que lo que pinta y lo que acepta no son la misma cosa.
     */
    rechazos++;
    quejarse(
      `vuelta ${String(vueltas)}: el servidor OFRECIÓ ${elegido.tipo} y lo rechazó con ` +
        `${String(hecho.estado)} (${String((hecho.datos as { motivo?: unknown }).motivo ?? '')})`,
    );
    if (rechazos > 5) {
      quejarse('demasiados rechazos de lo que el propio servidor ofrece; se para aquí');
      return;
    }
  }

  /* ── Lo que salió ───────────────────────────────────────────────────────── */
  console.log('');
  console.log(`  vueltas: ${String(vueltas)} · terminada: ${String(terminada)}`);
  console.log(`  movimientos: ${[...porFamilia].map(([k, v]) => `${k}=${String(v)}`).join(' · ')}`);
  console.log(
    `  lecturas: ${String(lecturas)} · la mayor ${(mayorLectura / 1024).toFixed(1)} kB · ` +
      `media ${(sumaLecturas / Math.max(1, lecturas) / 1024).toFixed(1)} kB · la más lenta ${String(masLento)} ms`,
  );
  console.log(`  bajado en total: ${(sumaLecturas / 1024 / 1024).toFixed(2)} MB`);

  comprobar(`la partida termina en ${String(TOPE)} vueltas`, terminada, { vueltas });

  /*
   * ═══ Y AHORA SE AFIRMA SOBRE LO QUE SE ACABA DE IMPRIMIR ═══
   *
   * Hasta aquí el guion medía y enseñaba, y no exigía nada: una partida que se hubiera
   * cortado a las tres vueltas imprimía sus tres vueltas y salía con un cero. Los suelos son
   * lo que convierte esto en un comprobador; los números son los medidos en diez corridas con
   * tres a la mesa, y cada suelo va bien por debajo del peor caso para no caerse solo.
   *
   * Sin modo acompañante, porque ahí las cuentas son de dos jugadores distintos y la mitad de
   * la partida la hace una persona.
   */
  if (!ACOMPANANDO) {
    const puestas = porFamilia.get('lindes:poner') ?? 0;
    const plantadas = porFamilia.get('lindes:plantar') ?? 0;
    const pasadas = porFamilia.get('lindes:pasar') ?? 0;
    /* 71 en 10 de 10: las 72 losas de la bolsa menos la de salida. */
    comprobar('se ponen las losas de la bolsa, no cuatro', puestas >= 60, { puestas });
    /* Medido 101-107. */
    comprobar('la partida es larga de verdad', vueltas >= 60, { vueltas });
    /* Medido 172-184. */
    comprobar('y se lee la mesa en cada turno', lecturas >= 100, { lecturas });
    /* Medidos 21-23 y 9-11. Los mismos umbrales de familia que usa `verify:mesa`. */
    comprobar('se planta de verdad', plantadas >= 10, { plantadas });
    comprobar('y se pasa de turno alguna vez', pasadas >= 3, { pasadas });
    /*
     * EL NÚMERO POR EL QUE EXISTE ESTE GUION. Estaba medido y escrito en un comentario de
     * `verify:mesa`, y guardado por nadie.
     */
    comprobar(
      `la lectura más gorda cabe en los ${String(TOPE_DEL_CABLE / 1024)} kB del presupuesto del cable`,
      mayorLectura <= TOPE_DEL_CABLE,
      { mayor: `${(mayorLectura / 1024).toFixed(1)} kB`, tope: `${String(TOPE_DEL_CABLE / 1024)} kB` },
    );
  }
}

if (PROPIO) {
  servidor = levantar();
  try {
    await esperarAlServidor();
  } catch (e) {
    console.log(`\n  ✗ ${e instanceof Error ? e.message : String(e)}`);
    servidor.kill();
    process.exit(1);
  }
}

/**
 * Esperar a que el servidor muera DE VERDAD. En Windows no es instantáneo, y mientras respira
 * sigue agarrando su carpeta: borrarla antes da un `EBUSY` que no tiene nada que ver con el
 * juego y que se lee como un fallo del guion.
 */
function esperarAQueMuera(proceso: ChildProcess): Promise<void> {
  return new Promise((resolver) => {
    if (proceso.exitCode !== null || proceso.signalCode !== null) {
      resolver();
      return;
    }
    proceso.once('exit', () => resolver());
    setTimeout(resolver, 3000);
  });
}

try {
  await jugar();
} catch (e) {
  quejarse(e instanceof Error ? e.message : String(e));
} finally {
  if (servidor !== undefined) {
    servidor.kill();
    await esperarAQueMuera(servidor);
  }
}

console.log('');
if (reproches.length > 0) {
  console.log(`${String(comprobaciones)} comprobaciones jugando`);
  console.log(`${String(reproches.length)} reproches. La mesa NO está limpia.`);
  /*
   * ═══ UN ROJO DE AQUÍ TIENE QUE PODER RELEERSE ═══
   *
   * La semilla la elige el servidor con `crypto.getRandomValues` y la ruta no la acepta del
   * cliente a propósito, así que cada corrida es una partida distinta: un rojo no se
   * reproduce volviendo a correr. Lo que sí se puede es dejar el almacén donde está y decir
   * dónde, que es lo que `jugar:fondo` no hace —borra siempre— y por eso sus rojos se miran
   * una vez y se pierden.
   */
  if (PROPIO) {
    console.log(`\nLo que jugó se queda sin borrar, para poder releerlo:\n  ${CARPETA}`);
    if (loQueDijoElServidor.length > 0) {
      console.log(`\nLo último que dijo el servidor:\n${loQueDijoElServidor.slice(-800)}`);
    }
  }
  process.exit(1);
}
if (PROPIO) {
  /* Si Windows sigue sin soltarla, se deja: es un temporal y no vale un rojo. */
  try {
    fs.rmSync(CARPETA, { recursive: true, force: true });
  } catch {
    /* que la recoja el sistema */
  }
}
console.log(`${String(comprobaciones)} comprobaciones jugando`);
console.log('');
console.log('La mesa se juega entera por el cable: sin un 500, sin un botón que el servidor');
console.log('ofrezca y luego rechace, con la partida terminada, y con la lectura más gorda');
console.log('dentro del presupuesto del cable.');
