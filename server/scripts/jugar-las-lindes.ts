/**
 * JUGAR UNA MESA DE LAS LINDES DE VERDAD, POR HTTP, CONTRA UN SERVIDOR LEVANTADO.
 *
 *   npm run jugar:lindes -- --servidor http://localhost:5174
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
import { LINDES } from '../../shared/arcade/juegos/lindes';

const args = process.argv.slice(2);
const opcion = (n: string, pd: string): string => {
  const i = args.indexOf(`--${n}`);
  const v = args[i + 1];
  return i >= 0 && v !== undefined ? v : pd;
};

const BASE = opcion('servidor', 'http://localhost:5174').replace(/\/$/, '');
const CUANTOS = Number(opcion('jugadores', '3'));
const TOPE = Number(opcion('tope', '400'));

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
  const r = await fetch(`${BASE}/api${ruta}`, {
    method: opciones?.metodo ?? 'GET',
    headers: cabeceras,
    body: opciones?.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo),
  });
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

async function jugar(): Promise<void> {
  console.log(`\nJugando una mesa de Las Lindes contra ${BASE}\n`);

  /* ── Abrir y sentarse ───────────────────────────────────────────────────── */
  const abierta = await pedir('/arcade/mesas', {
    metodo: 'POST',
    cuerpo: { arcade: LINDES, nombre: 'Ana' },
  });
  /* Abrir devuelve 201 —se ha creado algo—; sentarse, 200. Se aceptan los dos por su sitio. */
  if (abierta.estado !== 200 && abierta.estado !== 201) {
    quejarse(`abrir la mesa contestó ${String(abierta.estado)}: ${JSON.stringify(abierta.datos).slice(0, 200)}`);
    return;
  }
  const codigo = String(abierta.datos['codigo']);
  const gente: Asiento[] = [
    {
      asiento: String(abierta.datos['asiento']),
      llave: String(abierta.datos['llave']),
      nombre: 'Ana',
    },
  ];
  console.log(`  mesa ${codigo} abierta (${String(abierta.bytes)} B, ${String(abierta.ms)} ms)`);

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
    if (cualquiera.estado !== 200) {
      quejarse(`leer la mesa contestó ${String(cualquiera.estado)}`);
      return;
    }
    const mesa = laMesaDe(cualquiera);
    if (mesa.terminada === true) {
      terminada = true;
      break;
    }
    const turno = deQuien(cualquiera);
    if (turno === null) {
      quejarse('la mesa empezada no dice de quién es el turno');
      return;
    }
    const quien = gente.find((g) => g.asiento === turno);
    if (quien === undefined) {
      quejarse(`el turno es de «${turno}», que no está sentado`);
      return;
    }
    const suya = quien.asiento === primera.asiento ? cualquiera : await leer(quien);
    if (quien.asiento !== primera.asiento) {
      lecturas++;
      sumaLecturas += suya.bytes;
      if (suya.bytes > mayorLectura) mayorLectura = suya.bytes;
      if (suya.ms > masLento) masLento = suya.ms;
    }
    const suMesa = laMesaDe(suya);
    const toques = toquesDe(suMesa.vista);
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

  if (!terminada) quejarse(`la partida no terminó en ${String(TOPE)} vueltas`);
}

await jugar();

console.log('');
if (reproches.length > 0) {
  console.log(`${String(reproches.length)} reproches. La mesa NO está limpia.`);
  process.exit(1);
}
console.log('La mesa se juega entera por el cable: sin un 500, sin un botón que el servidor');
console.log('ofrezca y luego rechace, y con la partida terminada.');
