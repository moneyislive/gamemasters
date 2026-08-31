/**
 * Jugar las partidas de verdad, por HTTP, sin saber a qué se juega.
 *
 *   npm run jugar:fondo -- --servidor http://localhost:5240 --clave auditoria
 *
 * ═══ QUÉ COMPRUEBA, Y POR QUÉ ASÍ ═══
 *
 * La batería comprueba piezas: que el almacén guarda, que el reductor rechaza,
 * que los lectores de la app entienden lo que manda el servidor. Ninguna JUEGA.
 * Y una partida es una secuencia larga —abrir, elegir, cerrar, señalar,
 * desenlace— donde el fallo aparece en el paso doce, con el estado que dejaron
 * los once anteriores. Eso no se ve mirando piezas sueltas.
 *
 * Este jugador es DELIBERADAMENTE IGNORANTE: no sabe qué es una sala, ni un
 * rito, ni una franja. Lee `acciones` del manifiesto, mira qué pide cada una
 * —`eligeDe`, `eligeVarias`, `pideNumero`—, saca las opciones de la vista del
 * propio jugador y las ejecuta. Si con eso puede jugar los cuatro juegos hasta
 * el desenlace, el núcleo es agnóstico de verdad; si hiciera falta un `if` por
 * juego para que avance, no lo sería, y esto lo destaparía.
 *
 * ═══ QUÉ ES FALLO Y QUÉ NO ═══
 *
 * Un 409 NO es un fallo: es el motor rechazando una acción que no tocaba
 * —ya elegiste, no es tu turno, ese don no es tuyo—. Es exactamente su trabajo,
 * y un jugador que dispara a todo lo va a provocar constantemente.
 *
 * Fallo es un 500, una vista incoherente, una fase que no avanza, o una acción
 * declarada en el manifiesto que el motor no acepta NUNCA: esa está muerta.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import '../src/juegos/instalados';
import { fasesConPapel, juegosInstalados } from '../../shared/juegos';
import type { ManifiestoDeJuego } from '../../shared/juegos';

const args = process.argv.slice(2);
const opcion = (n: string, pd: string): string => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? String(args[i + 1]) : pd;
};

/*
 * SIN `--servidor` SE LEVANTA UNO PROPIO, en un puerto al azar y sobre un
 * directorio de usar y tirar. Es lo que le permite entrar en la batería sin
 * depender de que alguien haya dejado algo escuchando: un comprobador que solo
 * pasa cuando el de al lado está levantado no comprueba nada por sí mismo.
 *
 * Con `--servidor` se mide uno de verdad —el de una auditoría, o producción— y
 * entonces sí hace falta la clave.
 */
const REPO = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const TSX = path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SERVIDOR = path.join(REPO, 'server', 'src', 'index.ts');
/** Puerto al azar: Windows tarda en soltar el del servidor recién matado. */
const PUERTO = 7600 + Math.floor(Math.random() * 300);
const PROPIO = !args.includes('--servidor');
const BASE = PROPIO ? `http://127.0.0.1:${PUERTO}` : opcion('servidor', '').replace(/\/$/, '');
const CLAVE = opcion('clave', 'auditoria');
const RONDAS = Number(opcion('rondas', '3'));
/** Para mirar un juego solo, al depurar. Sin esto se juegan todos. */
const SOLO = opcion('juego', '');

let galleta = '';
const fallos: string[] = [];
const notas: string[] = [];
let hechas = 0;

function comprobar(que: string, ok: boolean, detalle?: unknown): void {
  hechas++;
  if (ok) return;
  fallos.push(
    `${que}${detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 900)}`}`,
  );
}

type Rta = { estado: number; datos: any };

async function pedir(
  ruta: string,
  o: { metodo?: string; cuerpo?: unknown; testigo?: string } = {},
): Promise<Rta> {
  const r = await fetch(`${BASE}${ruta}`, {
    method: o.metodo ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(galleta ? { Cookie: galleta } : {}),
      ...(o.testigo ? { Authorization: `Bearer ${o.testigo}` } : {}),
    },
    ...(o.cuerpo ? { body: JSON.stringify(o.cuerpo) } : {}),
  });
  const set = r.headers.get('set-cookie');
  if (set) galleta = set.split(';')[0]!;
  const t = await r.text();
  let datos: any = null;
  try {
    datos = t ? JSON.parse(t) : null;
  } catch {
    datos = { crudo: t.slice(0, 300) };
  }
  return { estado: r.status, datos };
}

const GENTE = ['Ana Ferreiro', 'Bruno Salgado', 'Carla Nieves', 'Damián Ruiz', 'Elsa Roure', 'Félix Otero'];

/** Nombres inventados para llenar una categoría, sin saber cuál es. */
function nombresPara(cat: {
  singular: string;
  minimo: number;
  exacto?: number;
  sonJugadores?: boolean;
}): string[] {
  const cuantas = cat.exacto ?? Math.max(cat.minimo, cat.sonJugadores ? GENTE.length : cat.minimo);
  const cap = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1);
  return Array.from({ length: cuantas }, (_, i) =>
    cat.sonJugadores ? (GENTE[i] ?? `Jugador ${i + 1}`) : `${cap(cat.singular)} ${i + 1}`,
  );
}

/**
 * Las opciones de un campo, LEÍDAS DONDE LAS LEE LA APP.
 *
 * La primera versión de esto buscaba en `vista.entidades` y salía vacío casi
 * siempre, así que parecía que ninguna acción se podía intentar. `entidades`
 * solo lleva las categorías que no son ni gente ni sitios: la gente viaja en
 * `jugadores` y los sitios en `lugares`, porque el móvil los pinta distinto.
 *
 * Lo que la app usa para pintar un selector es `acciones[].campos[].opciones`,
 * ya aplanado por el servidor. Mirar ahí es además lo correcto para esta
 * prueba: si el servidor no ofrece opciones, la app tampoco puede ofrecerlas,
 * y entonces la acción es inejecutable EN EL MÓVIL aunque el motor la admita.
 */
function opcionesDelCampo(vista: any, accionId: string, campo: string): Array<{ id: string }> {
  const a = (vista?.acciones ?? []).find((x: any) => x.id === accionId);
  const c = (a?.campos ?? []).find((x: any) => x.campo === campo);
  return c?.opciones ?? [];
}

/**
 * Quitarme a mi de una lista de gente.
 *
 * La primera version elegia el objetivo por indice y caia sobre el propio
 * jugador, asi que `ofrendar` y `avalar` salian rechazadas SIEMPRE --«un
 * amuleto no se puede gastar en uno mismo»-- y las dos parecian acciones
 * muertas. No lo eran: la muerta era la prueba.
 */
function sinMi(cosas: Array<{ id: string }>, vista: any): Array<{ id: string }> {
  const yo = vista?.yo?.participanteId;
  const otros = cosas.filter((c) => c.id !== yo);
  return otros.length ? otros : cosas;
}

/**
 * Las cosas de una categoría, para lo que `campos` no aplana.
 *
 * `campos` solo aplana `eligeDe` y `pideNumero`; `eligeVarias` —ordenar cinco
 * ritos, trazar una senda— no está ahí y hay que resolverlo por categoría.
 */
function cosasDeCategoria(m: ManifiestoDeJuego, vista: any, categoriaId: string): Array<{ id: string }> {
  const cat = m.categorias.find((c) => c.id === categoriaId);
  if (cat?.sonLugares) return vista?.lugares ?? [];
  if (cat?.sonJugadores) {
    return (vista?.jugadores ?? []).map((j: any) => ({ id: j.participanteId ?? j.id }));
  }
  const bloque = (vista?.entidades ?? []).find((e: any) => e.categoriaId === categoriaId);
  return bloque?.cosas ?? [];
}

/**
 * Rellena lo que pide una acción usando SOLO lo que el jugador puede ver.
 *
 * Devuelve `null` si no hay con qué: mandar un id inventado haría que el motor
 * la rechazara por la razón equivocada, y parecería que falla la acción cuando
 * lo que falla es la prueba.
 */
function datosPara(
  m: ManifiestoDeJuego,
  accion: any,
  vista: any,
  desplazamiento: number,
): Record<string, unknown> | null {
  const datos: Record<string, unknown> = {};

  for (const [i, c] of ((accion.eligeDe ?? []) as any[]).entries()) {
    const esGente = Boolean(m.categorias.find((x) => x.id === c.categoria)?.sonJugadores);
    const crudas = opcionesDelCampo(vista, accion.id, c.campo);
    const cosas = esGente ? sinMi(crudas, vista) : crudas;
    if (!cosas.length) return null;
    datos[c.campo] = cosas[(i + desplazamiento) % cosas.length]!.id;
  }

  for (const c of (accion.eligeVarias ?? []) as any[]) {
    const cosas = cosasDeCategoria(m, vista, c.categoria);
    const cuantas = c.cuantas ?? cosas.length;
    if (!cuantas || cosas.length < cuantas) return null;
    /*
     * Se rota el orden con el jugador: si los tres mandaran la misma secuencia,
     * una acción ordenada —el sellado— quedaría probada con un solo caso.
     */
    const rotadas = [...cosas.slice(desplazamiento % cosas.length), ...cosas.slice(0, desplazamiento % cosas.length)];
    datos[c.campo] = rotadas.slice(0, cuantas).map((x) => x.id);
  }

  for (const c of (accion.pideNumero ?? []) as any[]) {
    datos[c.campo] = c.porDefecto ?? c.minimo ?? 1;
  }

  /*
   * `eligeLibre` depende del estado SECRETO de quien juega —qué dones tiene,
   * qué fragmentos— y el motor no lo valida a propósito. No se inventa: se deja
   * sin poner y se acepta que el reductor lo rechace. Un 409 ahí es la
   * respuesta correcta.
   */
  return datos;
}

/**
 * Todas las formas razonables de ejecutar una acción con lo que se ve.
 *
 * Se varía el PRIMER campo por toda su lista y se dejan los demás fijos: el
 * producto cartesiano de seis campos por seis opciones son cuarenta y seis mil
 * peticiones por ronda, y lo que se quiere saber —¿hay alguna forma de que
 * esto se ejecute?— se contesta con la primera dimensión.
 */
function variantesDe(
  m: ManifiestoDeJuego,
  accion: any,
  vista: any,
  desplazamiento: number,
): Array<Record<string, unknown>> {
  const base = datosPara(m, accion, vista, desplazamiento);
  if (base === null) return [];
  const primero = (accion.eligeDe ?? [])[0];
  if (!primero) return [base];
  const esGente = Boolean(m.categorias.find((x) => x.id === primero.categoria)?.sonJugadores);
  const crudas = opcionesDelCampo(vista, accion.id, primero.campo);
  const opciones = esGente ? sinMi(crudas, vista) : crudas;
  if (opciones.length <= 1) return [base];
  return opciones.map((o) => ({ ...base, [primero.campo]: o.id }));
}

async function jugarUno(m: ManifiestoDeJuego): Promise<void> {
  const eti = m.id;

  const creada = await pedir('/api/games', { metodo: 'POST', cuerpo: { juego: m.id } });
  comprobar(`${eti}: se crea la partida`, creada.estado < 300 && Boolean(creada.datos?.id), creada);
  const id = creada.datos?.id;
  if (!id) return;

  for (const cat of m.categorias) {
    for (const name of nombresPara(cat as any)) {
      const r = await pedir(`/api/games/${id}/entidades/${cat.id}`, { metodo: 'POST', cuerpo: { name } });
      if (r.estado >= 500) comprobar(`${eti}: se puede añadir a «${cat.id}»`, false, r);
    }
  }

  const gen = await fetch(`${BASE}/api/games/${id}/generate`, { method: 'POST', headers: { Cookie: galleta } });
  const flujo = await gen.text();
  const ultimo = flujo
    .split(/\r?\n/)
    .filter((l) => l.startsWith('data: '))
    .map((l) => {
      try {
        return JSON.parse(l.slice(6));
      } catch {
        return {};
      }
    })
    .pop();
  comprobar(`${eti}: se genera la trama`, Boolean(ultimo) && ultimo.type !== 'error', { ultimo });

  const abierta = await pedir(`/api/games/${id}/live/abrir`, { metodo: 'POST' });
  comprobar(`${eti}: se abre la sesión`, abierta.estado === 200, abierta);
  const sesion = abierta.datos?.sesion;
  const codigo = sesion?.code;
  const jugadores: Array<{ participanteId: string; displayName: string; joinCode: string }> =
    sesion?.players ?? [];
  comprobar(`${eti}: la sesión trae jugadores`, jugadores.length >= 3, { cuantos: jugadores.length });
  if (!codigo || !jugadores.length) return;

  const mesa: Array<{ nombre: string; testigo: string }> = [];
  for (const j of jugadores) {
    const e = await pedir('/api/jugar/entrar', {
      metodo: 'POST',
      cuerpo: { code: codigo, joinCode: j.joinCode },
    });
    if (e.estado === 200 && e.datos?.token) mesa.push({ nombre: j.displayName, testigo: e.datos.token });
    else comprobar(`${eti}: entra ${j.displayName}`, false, e);
  }
  comprobar(`${eti}: entra la mesa entera`, mesa.length === jugadores.length, {
    entraron: mesa.length,
    de: jugadores.length,
  });

  let revAnterior = -1;
  const aceptadas: Record<string, number> = {};
  const rechazadas: Record<string, number> = {};
  /*
   * POR QUE la rechaza, no solo cuantas veces. Sin esto, «nunca aceptada» no
   * distingue una accion muerta de una accion bien protegida, que es justo lo
   * que hay que decidir.
   */
  const motivos: Record<string, Set<string>> = {};

  const jugarFase = async (fase: string): Promise<void> => {
    const disponibles = m.acciones.filter((a) => (a.fases as string[]).includes(fase));
    for (const [n, quien] of mesa.entries()) {
      const v = await pedir('/api/jugar/vista', { testigo: quien.testigo });
      if (v.estado !== 200) {
        comprobar(`${eti}/${fase}: la vista responde a ${quien.nombre}`, false, v);
        continue;
      }
      const vista = v.datos?.vista;
      comprobar(
        `${eti}/${fase}: la vista trae sesión y jugadores`,
        Boolean(vista?.sesion) && Array.isArray(vista?.jugadores),
        { claves: Object.keys(vista ?? {}) },
      );
      const rev = Number(v.datos?.rev ?? vista?.sesion?.rev ?? 0);
      comprobar(`${eti}/${fase}: la rev no retrocede`, rev >= revAnterior, { rev, revAnterior });
      revAnterior = Math.max(revAnterior, rev);

      for (const a of disponibles) {
        /*
         * SE PRUEBAN TODAS LAS OPCIONES, no una elegida por índice.
         *
         * Con una sola, `entregar` de las Sombras salía aceptada en una tirada
         * y «tapiada» en la siguiente segun donde cayera el índice: solo se
         * puede pasar un enser que LLEVES, y llevar uno u otro es azar de la
         * partida. Un resultado que cambia entre dos ejecuciones iguales no
         * sirve para decidir nada.
         *
         * Probando la lista entera, «nunca aceptada» pasa a significar
         * «inejecutable con CUALQUIER opción», que es lo que se quería medir.
         */
        const variantes = variantesDe(m, a, vista, n);
        if (!variantes.length) {
          notas.push(`${eti}: «${a.id}» no se pudo intentar en ${fase}: la vista no ofrece opciones`);
          continue;
        }
        for (const datos of variantes) {
          const r = await pedir('/api/jugar/accion', {
            metodo: 'POST',
            cuerpo: { accion: a.id, datos },
            testigo: quien.testigo,
          });
          comprobar(`${eti}/${fase}: «${a.id}» no revienta el servidor`, r.estado < 500, {
            estado: r.estado,
            datos: r.datos,
          });
          if (r.estado === 200) {
            aceptadas[a.id] = (aceptadas[a.id] ?? 0) + 1;
            break; // Aceptada una vez, ya está viva: no se repite el resto.
          }
          rechazadas[a.id] = (rechazadas[a.id] ?? 0) + 1;
          (motivos[a.id] ??= new Set()).add(String(r.datos?.error ?? r.estado).slice(0, 160));
        }
      }
    }
  };

  for (let ronda = 1; ronda <= RONDAS; ronda++) {
    const ab = await pedir(`/api/games/${id}/live/ronda/abrir`, { metodo: 'POST', cuerpo: { minutos: 15 } });
    comprobar(`${eti}: abre la ronda ${ronda}`, ab.estado === 200, ab);
    await jugarFase('ronda-abierta');
    const ce = await pedir(`/api/games/${id}/live/ronda/cerrar`, { metodo: 'POST' });
    comprobar(`${eti}: cierra la ronda ${ronda}`, ce.estado === 200, ce);
    await jugarFase('ronda-cerrada');
  }

  /*
   * La fase de veredicto no se llama igual en todos: CLUEDO, las Sombras y el
   * Nudo la llaman «acusaciones»; la Momia, «sellado». Se saca del grafo del
   * manifiesto en vez de escribirla a mano, que es justo lo que este jugador no
   * tiene derecho a saber.
   */
  const veredicto = fasesConPapel(m, 'decision')[0];
  if (veredicto) {
    const c = await pedir(`/api/games/${id}/live/sellado`, { metodo: 'POST' });
    comprobar(`${eti}: entra en la fase de veredicto «${veredicto}»`, c.estado === 200, c);
    await jugarFase(veredicto);
  } else {
    notas.push(`${eti}: el manifiesto no declara ninguna fase con papel «decision»`);
  }

  const des = await pedir(`/api/games/${id}/live/desenlace`, { metodo: 'POST' });
  comprobar(`${eti}: llega al desenlace`, des.estado === 200, des);

  const uno = mesa[0];
  if (uno) {
    const v = await pedir('/api/jugar/vista', { testigo: uno.testigo });
    const vista = v.datos?.vista;
    comprobar(`${eti}: la fase final es «desenlace»`, vista?.sesion?.phase === 'desenlace', {
      fase: vista?.sesion?.phase,
    });
  }

  /*
   * ═══ CUÁNDO UNA ACCIÓN NUNCA ACEPTADA ES UN FALLO ═══
   *
   * La primera versión exigía que toda acción se ejecutara alguna vez, y
   * marcaba en rojo tres que están perfectamente vivas:
   *
   *   · `avanzar` (Sombras) pide una contraseña escrita en la puerta de un
   *     paso, en la mesa. Es `eligeLibre`: depende de algo que este jugador no
   *     puede saber, y NO INVENTÁRSELA es el trato.
   *   · `rendir-instrumento` (Nudo) pide la solución de un enigma.
   *   · `recuperar-tiempo` (Nudo) cobra margen que aún no se tiene.
   *
   * Rechazarlas es su trabajo. Lo que delata a una acción MUERTA no es que la
   * rechacen: es que la rechacen SIEMPRE IGUAL sin pedir nada secreto —una
   * puerta tapiada da la misma respuesta a todo el mundo—. Así que solo cuenta
   * como fallo la que no pide nada por `eligeLibre` y además da una única
   * excusa constante ronda tras ronda y jugador tras jugador.
   *
   * Un motivo que CAMBIA —«te faltan 3 de margen», «te falta 1»— es la prueba
   * de que el reductor está mirando el estado, o sea, de que la acción vive.
   */
  const muertas = m.acciones
    .filter((a) => !aceptadas[a.id])
    .filter((a) => !(a.eligeLibre ?? []).length)
    .filter((a) => (motivos[a.id]?.size ?? 0) <= 1)
    .map((a) => `${a.id}: ${[...(motivos[a.id] ?? ['sin intentar'])].join(' | ')}`);

  comprobar(`${eti}: ninguna acción del manifiesto está tapiada`, muertas.length === 0, {
    tapiadas: muertas,
    porque: 'no pide nada secreto y da siempre la misma excusa: nadie puede ejecutarla nunca',
  });

  const protegidas = m.acciones
    .filter((a) => !aceptadas[a.id] && !muertas.some((x) => x.startsWith(`${a.id}:`)))
    .map((a) => `${a.id} — ${[...(motivos[a.id] ?? [])].slice(0, 2).join(' | ')}`);
  for (const x of protegidas) notas.push(`${eti}: no ejecutada, y con razón: ${x}`);
  console.log(`  ${eti}: aceptadas ${JSON.stringify(aceptadas)} · rechazadas ${JSON.stringify(rechazadas)}`);
}

async function esperarServidor(): Promise<void> {
  for (let i = 0; i < 90; i++) {
    try {
      const r = await fetch(`${BASE}/api/games`);
      if (r.ok) return;
    } catch {
      /* todavía no escucha */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('el servidor no llegó a arrancar');
}

console.log(`\nJugando de verdad contra ${BASE}\n`);

let servidor: ChildProcess | undefined;
let dir = '';
try {
  if (PROPIO) {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jugar-a-fondo-'));
    servidor = spawn(process.execPath, [TSX, SERVIDOR], {
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
    });
    await esperarServidor();
  } else {
    const puerta = await pedir('/api/auth/login', { metodo: 'POST', cuerpo: { password: CLAVE } });
    if (puerta.estado !== 200) {
      console.error('No se pudo entrar como quien dirige:', puerta);
      process.exit(1);
    }
  }

  for (const m of juegosInstalados()) {
    if (SOLO && m.id !== SOLO) continue;
    await jugarUno(m);
  }
} catch (e) {
  fallos.push(`la prueba se cayó: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
} finally {
  servidor?.kill();
  await new Promise((r) => setTimeout(r, 600));
  if (dir) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      console.log(`  (queda por limpiar ${dir})`);
    }
  }
}

console.log(`\n${hechas} comprobaciones jugando`);
for (const n of [...new Set(notas)]) console.log(`  · ${n}`);
if (fallos.length === 0) {
  console.log('\nLos cuatro juegos se juegan enteros con un jugador que no sabe a qué juega.\n');
  process.exit(0);
}
console.log(`\n${fallos.length} FALLOS:\n`);
for (const f of fallos) console.log(`  ✗ ${f}`);
console.log('');
process.exit(1);
