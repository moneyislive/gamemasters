/**
 * LA MEMORIA DE LAS MESAS: calientes en memoria, todas en el disco.
 *
 *   npm run verify:mesas-frias
 *
 * ═══ EL TECHO QUE ESTO QUITA ═══
 *
 * Toda mesa, terminada o no, vivía treinta días en la tabla de memoria con su diario entero, y el
 * primer arranque leía y analizaba TODOS los ficheros de `MESAS_DIR` en la primera petición, con
 * el hilo bloqueado. La RAM crecía con las mesas de un mes, no con las que se juegan. Ahora el
 * disco es la fuente: una mesa se lee de su fichero cuando alguien la pide, lo frío sale de la
 * memoria, y el barrido de treinta días borra del disco sin cargar nada. Lo que se afirma:
 *
 *  1. UN PROCESO NUEVO NO LEE LA CARPETA ENTERA. Se levanta el servidor de verdad sobre una carpeta
 *     con mesas buenas, una ilegible y una de una versión que no conoce: al pedirle UNA, lee UNA, y
 *     de las otras no dice ni una palabra hasta que alguien las pide.
 *  2. LO FRÍO SALE DE LA MEMORIA Y SU FICHERO SIGUE: una terminada a la hora, una sin terminar a
 *     las doce. Y lo que no se puede soltar NO SALE: con alguien aparcado esperándola, con un
 *     asiento visto hace nada, con el candado cogido, con una escritura pendiente o con una que
 *     falló.
 *  3. AL PEDIRLAS VUELVEN IDÉNTICAS: la mesa leída del disco es, en su forma canónica, la que había
 *     en memoria. Una de Riberas a medio jugar, con su tablero dentro. Y una con plazo vuelve y se
 *     le mete el tic en la primera lectura, como si no hubiera salido nunca.
 *  4. `abrir` NO REPARTE EL CÓDIGO DE UNA MESA DORMIDA: con el azar forzado a dar ese código, sale
 *     otro, y el fichero de la dormida queda intacto.
 *  5. EL BARRIDO DE TREINTA DÍAS sigue borrando del disco lo viejo que no está en memoria, se lo
 *     dice al canal, y no borra lo que no entiende ni lo que su fichero dice que se tocó ayer.
 *  6. UN FICHERO CON JSON BUENO Y FORMA ROTA —sin la mesa del árbitro, con `sillas: null`, con una
 *     silla sin llave…— es un ilegible más: 404, contado en `fallosAlLeer`, fuera de la memoria y
 *     con su fichero intacto. Antes entraba en la tabla y tumbaba el `abrir` de todo el servidor
 *     hasta reiniciar; se mira por el cable, con el servidor de verdad, y en proceso con siete
 *     variantes y trece horas de reloj.
 *  7. Y LA LIMPIEZA NO TUMBA A NADIE: con dos mesas envenenadas a mano en la memoria, `mirar`,
 *     `revisionDe`, `abrir` y el barrido siguen contestando.
 *
 * ═══ EL RELOJ SE ADELANTA EN PROCESO, CAMBIANDO `Date.now` ═══
 *
 * La técnica de `verify:larga`, sin envoltorio porque aquí la mesa corre en este mismo proceso:
 * `Date.now` pasa a ser «el de verdad más un desplazamiento», y `mesas.ts` —que mide el tiempo
 * con `Date.now()` y punto— envejece lo que se le diga sin una costura de reloj en el código de
 * producción. Los temporizadores siguen siendo de verdad, y eso se usa: una escritura diferida
 * sigue pendiente mientras el reloj de la mesa salta doce horas.
 */
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { canonico } from '../../shared/mecanicas/canonico';
import { instalarArcade, olvidarArcade, rechazar } from '../../shared/arcade';
import type { ManifiestoDeArcade, Movimiento } from '../../shared/arcade';
import '../../shared/arcade/juegos';
import { EMPEZAR_RIBERAS, RIBERAS } from '../../shared/arcade/juegos';

const REPO = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const TSX = path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SERVIDOR = path.join(REPO, 'server', 'src', 'index.ts');

/* Las carpetas, ANTES de cargar `mesas.ts`, que lee `MESAS_DIR` al cargarse. */
const CARPETA = fs.mkdtempSync(path.join(os.tmpdir(), 'mesas-frias-'));
const MESAS = path.join(CARPETA, 'mesas');
const MESAS_DEL_PROCESO_NUEVO = path.join(CARPETA, 'proceso-nuevo');
process.env.MESAS_DIR = MESAS;

const HORA = 60 * 60_000;
const DIA = 24 * HORA;

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

function ficheroDe(carpeta: string, codigo: string): string {
  return path.join(carpeta, `${codigo}.json`);
}

/** La forma canónica de algo tal y como sobreviviría a escribirse: sin `undefined`. */
function canonicaEscrita(valor: unknown): string {
  return canonico(JSON.parse(JSON.stringify(valor)) as unknown);
}

// ---------------------------------------------------------------------------
// PRIMERA PARTE · UN PROCESO NUEVO, SOBRE UNA CARPETA LLENA
//
// Va la primera y sin tocar nada de `mesas.ts` en este proceso, a propósito: así se puede
// correr contra la versión de antes y se ve roja por lo que hace, no por lo que le falta.
// ---------------------------------------------------------------------------

async function puertoLibre(): Promise<number> {
  const { createServer } = await import('node:net');
  return new Promise<number>((resolver, rechazar_) => {
    const sonda = createServer();
    sonda.once('error', rechazar_);
    sonda.listen(0, '127.0.0.1', () => {
      const donde = sonda.address();
      const puerto = typeof donde === 'object' && donde !== null ? donde.port : 0;
      sonda.close(() => resolver(puerto));
    });
  });
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

/**
 * Una mesa guardada como la guarda el servidor, escrita a mano: la carpeta de un servidor que
 * lleva días en marcha, sin tener que levantar uno para llenarla.
 */
function mesaGuardada(codigo: string, arcade: string): unknown {
  const ahora = Date.now();
  return {
    version: 2,
    mesa: {
      codigo,
      mesa: {
        id: codigo,
        arcade,
        asientos: [`a${codigo}0000`],
        rev: 0,
        tic: 0,
        semilla: 4242,
        terminada: false,
        diario: [],
      },
      sillas: [{ id: `a${codigo}0000`, nombre: 'Quien estaba', llave: `LLAVE${codigo}${'0'.repeat(14)}` }],
      plazoMs: 0,
      venceEn: null,
      turnoDesde: ahora - HORA,
      abiertaEn: ahora - 2 * HORA,
      ultimoToqueEn: ahora - HORA,
      modalidad: 'normal',
    },
  };
}

paso('Un proceso nuevo NO lee la carpeta entera: lee lo que se le pide');

{
  fs.mkdirSync(MESAS_DEL_PROCESO_NUEVO, { recursive: true });
  const buenas = ['BUEN2', 'BUEN3', 'BUEN4', 'BUEN6', 'BUEN7', 'BUEN8'];
  for (const codigo of buenas) {
    fs.writeFileSync(ficheroDe(MESAS_DEL_PROCESO_NUEVO, codigo), JSON.stringify(mesaGuardada(codigo, RIBERAS)), 'utf8');
  }
  /* Una que no se puede leer, y otra de una versión que este servidor no conoce. */
  fs.writeFileSync(ficheroDe(MESAS_DEL_PROCESO_NUEVO, 'ZZZZZ'), '{ esto no es JSON', 'utf8');
  fs.writeFileSync(
    ficheroDe(MESAS_DEL_PROCESO_NUEVO, 'YYYYY'),
    JSON.stringify({ version: 99, mesa: (mesaGuardada('YYYYY', RIBERAS) as { mesa: unknown }).mesa }),
    'utf8',
  );
  /*
   * Y UNA ENVENENADA: JSON bueno, versión buena, y sin la mesa del árbitro dentro. Es la que se
   * colaba en la tabla y desde entonces tumbaba cada `abrir` del servidor entero. Ver la tercera
   * parte, que la estudia en proceso con todas sus variantes.
   */
  fs.writeFileSync(
    ficheroDe(MESAS_DEL_PROCESO_NUEVO, 'PODR1'),
    JSON.stringify({ version: 2, mesa: { codigo: 'PODR1' } }),
    'utf8',
  );
  const enLaCarpeta = fs.readdirSync(MESAS_DEL_PROCESO_NUEVO).length;

  const puerto = await puertoLibre();
  const base = `http://127.0.0.1:${String(puerto)}/api`;
  let dijo = '';
  const servidor = spawn(process.execPath, [TSX, SERVIDOR], {
    cwd: CARPETA,
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      PORT: String(puerto),
      NODE_ENV: 'test',
      MESAS_DIR: MESAS_DEL_PROCESO_NUEVO,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  servidor.stdout?.on('data', (d: Buffer) => (dijo += d.toString()));
  servidor.stderr?.on('data', (d: Buffer) => (dijo += d.toString()));
  try {
    let arranco = false;
    for (let i = 0; i < 200 && !arranco; i++) {
      try {
        arranco = (await fetch(`${base}/salud`)).ok;
      } catch {
        await dormir(250);
      }
    }
    comprobar('el servidor arranca sobre una carpeta llena', arranco, dijo.slice(-800));

    const una = await fetch(`${base}/arcade/mesas/BUEN4`);
    comprobar('se le pide UNA mesa y la da', una.status === 200, una.status);
    /* El barrido del disco lo dispara esa misma lectura, en segundo plano: se le deja acabar. */
    await dormir(600);
    const diag = (await (await fetch(`${base}/arcade/diagnostico`)).json()) as {
      mesas?: number;
      memoria?: { leidasDelDisco?: number };
      almacen?: { fallosAlLeer?: number };
    };
    comprobar(
      `con ${String(enLaCarpeta)} ficheros en la carpeta, ha leído UNO: el que se le pidió`,
      diag.memoria?.leidasDelDisco === 1 && diag.mesas === 1,
      diag,
    );
    comprobar(
      'y de la ilegible, la de otra versión y la envenenada no ha dicho ni una palabra: no las ha abierto',
      !dijo.includes('ZZZZZ') && !dijo.includes('YYYYY') && !dijo.includes('PODR1'),
      dijo.slice(-800),
    );
    comprobar('ni ha «recuperado» nada del almacén de golpe', !dijo.includes('recuperadas del almacén'), dijo.slice(-400));

    /* La vacuna: pedidas, SÍ se leen y SÍ se dice — o sea que el silencio de arriba significa algo. */
    const ilegible = await fetch(`${base}/arcade/mesas/ZZZZZ`);
    const deOtraVersion = await fetch(`${base}/arcade/mesas/YYYYY`);
    await dormir(100);
    comprobar(
      'pedida la ilegible: 404, y AHORA sí se dice en el registro, con su nombre',
      ilegible.status === 404 && dijo.includes('ZZZZZ.json'),
      { estado: ilegible.status, dijo: dijo.slice(-600) },
    );
    comprobar(
      'y la de otra versión, lo mismo: 404 y la versión que trae, dicha',
      deOtraVersion.status === 404 && dijo.includes('YYYYY.json') && dijo.includes('99'),
      { estado: deOtraVersion.status },
    );
    const trasLeer = (await (await fetch(`${base}/arcade/diagnostico`)).json()) as {
      almacen?: { fallosAlLeer?: number };
    };
    comprobar(
      'y el diagnóstico cuenta la que no se pudo leer: no vale «mesas: 0» con «fallos: 0»',
      (trasLeer.almacen?.fallosAlLeer ?? 0) >= 1,
      trasLeer.almacen,
    );
    comprobar(
      'y ninguna de las dos se ha borrado: lo que no se entiende se deja donde está',
      fs.existsSync(ficheroDe(MESAS_DEL_PROCESO_NUEVO, 'ZZZZZ')) && fs.existsSync(ficheroDe(MESAS_DEL_PROCESO_NUEVO, 'YYYYY')),
    );
    const conBarras = await fetch(`${base}/arcade/mesas/..%2F..%2Fsalud`);
    comprobar(
      'y un «código» que no es un código no toca el disco: 404 como cualquier código que no existe',
      conBarras.status === 404,
      conBarras.status,
    );

    /*
     * LA ENVENENADA, POR EL CABLE. Antes: 500 al pedirla, la mesa metida en la tabla a medias, y
     * desde ese momento `POST /arcade/mesas` contestaba 500 a TODO el mundo —el barrido de lo frío
     * que corre en cada `abrir` leía `m.mesa.terminada` de una mesa sin `mesa`— hasta reiniciar.
     */
    const fallosAntesDeLaEnvenenada = trasLeer.almacen?.fallosAlLeer ?? 0;
    const envenenada = await fetch(`${base}/arcade/mesas/PODR1`);
    await dormir(100);
    comprobar(
      'pedida una con JSON bueno y FORMA ROTA —sin la mesa del árbitro dentro—: 404, como una ilegible, y se dice',
      envenenada.status === 404 && dijo.includes('PODR1.json'),
      { estado: envenenada.status, dijo: dijo.slice(-600) },
    );
    const abiertaTrasElVeneno = await fetch(`${base}/arcade/mesas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ arcade: RIBERAS, nombre: 'Tras el veneno' }),
    });
    comprobar(
      'y DESPUÉS se sigue pudiendo abrir mesa: 201, y no el 500 para todo el servidor de antes',
      abiertaTrasElVeneno.status === 201,
      { estado: abiertaTrasElVeneno.status, cuerpo: (await abiertaTrasElVeneno.text()).slice(0, 200) },
    );
    const laBuenaOtraVez = await fetch(`${base}/arcade/mesas/BUEN4`);
    comprobar('y las buenas se siguen leyendo', laBuenaOtraVez.status === 200, laBuenaOtraVez.status);
    const trasElVeneno = (await (await fetch(`${base}/arcade/diagnostico`)).json()) as {
      almacen?: { fallosAlLeer?: number; ultimoFalloAlLeer?: { codigo?: string } };
    };
    comprobar(
      'y el diagnóstico la cuenta como lo que es, una mesa que no se pudo leer',
      (trasElVeneno.almacen?.fallosAlLeer ?? 0) === fallosAntesDeLaEnvenenada + 1 &&
        trasElVeneno.almacen?.ultimoFalloAlLeer?.codigo === 'PODR1',
      { antes: fallosAntesDeLaEnvenenada, ahora: trasElVeneno.almacen },
    );
    comprobar(
      'y su fichero sigue ahí: lo que no se entiende no se borra',
      fs.existsSync(ficheroDe(MESAS_DEL_PROCESO_NUEVO, 'PODR1')),
    );
  } finally {
    servidor.kill();
    await esperarAQueMuera(servidor);
  }
}

// ---------------------------------------------------------------------------
// SEGUNDA PARTE · EN PROCESO, CON EL RELOJ EN LA MANO
// ---------------------------------------------------------------------------

const real = Date.now.bind(Date);
let desplazamiento = 0;
Date.now = () => real() + desplazamiento;
function adelantar(ms: number): void {
  desplazamiento += ms;
}

/**
 * EL FRÍO. Un juego de mesa mínimo con final: `acabar` lo termina, y el tic CAMBIA el estado —
 * si una mesa desalojada con plazo no recibiera su tic al volver, se vería—.
 */
const FRIO = 'el-frio';
/** Y EL DIFERIDO, con reloj: sus escrituras esperan un segundo de verdad. Ver `guardarDiferido`. */
const DIFERIDO = 'el-diferido';

interface EstadoDelFrio {
  tics: number;
  jugadas: number;
  notas: string[];
  fin: boolean;
}

function molde(id: string, nombre: string, tickHz: number, maximo: number): ManifiestoDeArcade {
  return {
    id,
    nombre,
    gancho: 'Una prueba de memoria, y nada más.',
    icono: 'mando',
    jugadores: { minimo: 1, maximo },
    sede: 'servidor',
    tickHz,
    mueble: 'formulario',
    secretos: false,
    marcador: { tipo: 'ninguno' },
    procedencia: { tipo: 'creacion-propia' },
  };
}

function avanzarElFrio(estado: EstadoDelFrio | undefined, movimiento: Movimiento) {
  const actual = estado ?? { tics: 0, jugadas: 0, notas: [], fin: false };
  if (actual.fin) return rechazar(actual, 'Esta partida ya terminó.');
  if (movimiento.tipo === 'arcade:tic') return { ...actual, tics: actual.tics + 1 };
  if (movimiento.tipo === 'jugar') {
    const nota = typeof movimiento.carga === 'string' ? movimiento.carga : '';
    return { ...actual, jugadas: actual.jugadas + 1, notas: [...actual.notas, nota] };
  }
  if (movimiento.tipo === 'acabar') return { ...actual, fin: true };
  return rechazar(actual, 'Eso no es una jugada del Frío.');
}

instalarArcade<EstadoDelFrio | undefined>({
  manifiesto: molde(FRIO, 'El Frío', 0, 4),
  avanzar: avanzarElFrio,
  proyeccion: (estado: EstadoDelFrio | undefined) => estado ?? null,
  seAcabo: (estado: EstadoDelFrio | undefined) => estado?.fin === true,
});
instalarArcade<EstadoDelFrio | undefined>({
  manifiesto: molde(DIFERIDO, 'El Diferido', 30, 1),
  avanzar: avanzarElFrio,
  seAcabo: (estado: EstadoDelFrio | undefined) => estado?.fin === true,
});

const mesas = await import('../src/arcade/mesas');
const { marcarPresencia } = await import('../src/mecanicas/presencia');

const olvidadasEnElCanal: string[] = [];
mesas.cuandoSeOlvideUnaMesa((codigo) => olvidadasEnElCanal.push(codigo));

const tieneLaMemoriaNueva =
  typeof mesas.barrerAhora === 'function' &&
  typeof mesas.memoriaDeLasMesas === 'function' &&
  typeof mesas.mientrasSeEspera === 'function';
comprobar(
  '`mesas.ts` sabe barrer ya, contar su memoria y apuntar quién espera',
  tieneLaMemoriaNueva,
  Object.keys(mesas).filter((k) => /barrer|memoria|espera/i.test(k)),
);

/** Una promesa que se suelta desde fuera. */
function retenida(): { promesa: Promise<void>; soltar: () => void } {
  let soltar!: () => void;
  const promesa = new Promise<void>((r) => {
    soltar = r;
  });
  return { promesa, soltar };
}

/** Lo que hay en memoria de una mesa, copiado como se escribiría. Tocarla la trae si no está. */
async function comoEstaAhora(codigo: string): Promise<string> {
  return mesas.conLaMesa(codigo, (m) => canonicaEscrita(m));
}

/** ¿Está en memoria? Se pregunta trayéndola: si hay que leerla del disco, es que no estaba. */
async function estabaEnMemoria(codigo: string): Promise<boolean> {
  const antes = mesas.memoriaDeLasMesas().leidasDelDisco;
  await mesas.conLaMesa(codigo, () => undefined);
  return mesas.memoriaDeLasMesas().leidasDelDisco === antes;
}

/** El nombre de lo que lanza, o `'nada'`. Para mirar un fallo sin que tumbe la prueba entera. */
async function loQueLanza(hacer: () => Promise<unknown>): Promise<string> {
  try {
    await hacer();
    return 'nada';
  } catch (error) {
    return error instanceof Error ? `${error.name}: ${error.message.slice(0, 80)}` : String(error);
  }
}

if (tieneLaMemoriaNueva) {
  try {
    // -------------------------------------------------------------------------
    paso('Se abren mesas de todas las clases');
    // -------------------------------------------------------------------------

    /* Una terminada por el propio juego, con diario. */
    const fin = await mesas.abrir({ arcade: FRIO, nombre: 'Ana', plazoSegundos: 0 });
    let rev = 0;
    for (const nota of ['uno', 'dós', '三']) {
      rev = (await mesas.mover(fin.mesa.codigo, fin.silla.llave, rev, { tipo: 'jugar', carga: nota })).rev;
    }
    const cerrada = await mesas.mover(fin.mesa.codigo, fin.silla.llave, rev, { tipo: 'acabar' });
    comprobar('la del Frío termina sola cuando el juego lo dice', cerrada.terminada === true, cerrada.terminada);

    /* Una de Riberas a medio jugar, con su tablero dentro: la superficie más ancha de la casa. */
    const riberas = await mesas.abrir({ arcade: RIBERAS, nombre: 'Bea', plazoSegundos: 0 });
    const cid = await mesas.sentarse(riberas.mesa.codigo, 'Cid');
    const llaves = [riberas.silla.llave, cid.llave];
    let vistaR = await mesas.mirar(riberas.mesa.codigo, riberas.silla.llave);
    await mesas.mover(riberas.mesa.codigo, riberas.silla.llave, vistaR.rev, { tipo: EMPEZAR_RIBERAS, carga: {} });
    let jugadasR = 0;
    for (let vuelta = 0; vuelta < 12 && jugadasR < 6; vuelta++) {
      for (const llave of llaves) {
        vistaR = await mesas.mirar(riberas.mesa.codigo, llave);
        const opcion = vistaR.opciones.find((o) => o.declaracion !== true);
        if (opcion === undefined) continue;
        await mesas.mover(riberas.mesa.codigo, llave, vistaR.rev, { tipo: opcion.tipo, carga: opcion.carga });
        jugadasR++;
        break;
      }
    }
    comprobar('la de Riberas se ha empezado y se ha jugado', jugadasR >= 3 && riberas.mesa.mesa.empezada === true, jugadasR);

    const espera = await mesas.abrir({ arcade: FRIO, nombre: 'Dan', plazoSegundos: 0 });
    const presente = await mesas.abrir({ arcade: FRIO, nombre: 'Eva', plazoSegundos: 0 });
    const conCandado = await mesas.abrir({ arcade: FRIO, nombre: 'Fede', plazoSegundos: 0 });
    const sucia = await mesas.abrir({ arcade: FRIO, nombre: 'Gala', plazoSegundos: 0 });
    const conPlazo = await mesas.abrir({ arcade: FRIO, nombre: 'Hugo', plazoSegundos: 60 });
    const diferida = await mesas.abrir({ arcade: DIFERIDO, nombre: 'Iria', plazoSegundos: 0 });
    const porLaRuta = await mesas.abrir({ arcade: FRIO, nombre: 'Juan', plazoSegundos: 0 });

    /* El candado se coge YA, y no se suelta hasta después del barrido de las doce horas. */
    const candado = retenida();
    const conElCandadoCogido = mesas.conLaMesa(conCandado.mesa.codigo, () => candado.promesa);

    const antesDeRiberas = await comoEstaAhora(riberas.mesa.codigo);
    const antesDeLaTerminada = await comoEstaAhora(fin.mesa.codigo);
    const vistaDeLaTerminada = await mesas.mirar(fin.mesa.codigo, fin.silla.llave);
    const ficheroDeRiberas = fs.readFileSync(ficheroDe(MESAS, riberas.mesa.codigo), 'utf8');

    /* La escritura diferida se deja llegar al disco antes de empezar a mover el reloj. */
    await dormir(1300);
    const enMemoriaAlEmpezar = mesas.memoriaDeLasMesas().enMemoria;
    comprobar('las nueve están en memoria', enMemoriaAlEmpezar === 9, mesas.memoriaDeLasMesas());

    // -------------------------------------------------------------------------
    paso('Dos horas después: sale la terminada, y nada más');
    // -------------------------------------------------------------------------

    adelantar(2 * HORA);
    await mesas.barrerAhora();
    const trasDosHoras = mesas.memoriaDeLasMesas();
    comprobar(
      'sale UNA de la memoria: la terminada, que lleva más de una hora sin que nadie la mire',
      trasDosHoras.enMemoria === enMemoriaAlEmpezar - 1 && trasDosHoras.desalojadas === 1,
      trasDosHoras,
    );
    comprobar('y su fichero sigue en el disco', fs.existsSync(ficheroDe(MESAS, fin.mesa.codigo)));

    // -------------------------------------------------------------------------
    paso('Doce horas más: sale lo frío en curso, y se queda lo que no se puede soltar');
    // -------------------------------------------------------------------------

    /* Una ESCRITURA QUE FALLA: en el sitio de su fichero se pone una carpeta, y el cambio no llega. */
    fs.rmSync(ficheroDe(MESAS, sucia.mesa.codigo), { force: true });
    fs.mkdirSync(ficheroDe(MESAS, sucia.mesa.codigo));
    const falloAlGuardar = await mesas
      .mover(sucia.mesa.codigo, sucia.silla.llave, 0, { tipo: 'jugar', carga: 'lo que sólo está en memoria' })
      .then(
        () => 'guardó',
        (error: unknown) => (error instanceof Error ? error.name : String(error)),
      );
    comprobar('la escritura de la sucia falla, y se dice', falloAlGuardar === 'AlmacenNoGuarda', falloAlGuardar);

    /* Alguien APARCADO por la ruta de verdad, en un Express de verdad. */
    const { default: arcadeRouter } = await import('../src/routes/arcade');
    const { elCanal, ponerCanal } = await import('../src/canal');
    const { canalDeSondeo } = await import('../src/canal/sondeo');
    ponerCanal(canalDeSondeo);
    const app = express();
    app.use(express.json());
    app.use('/api', arcadeRouter);
    const escucha = app.listen(0, '127.0.0.1');
    await new Promise<void>((lista) => escucha.once('listening', () => lista()));
    const donde = escucha.address();
    const base = `http://127.0.0.1:${String(typeof donde === 'object' && donde !== null ? donde.port : 0)}/api`;
    const aparcada = fetch(`${base}/arcade/mesas/${porLaRuta.mesa.codigo}?desde=0`, {
      headers: { 'x-asiento': porLaRuta.silla.llave },
    });

    /* Alguien esperando por su cuenta, con la costura que la ruta usa. */
    const esperaSuelta = retenida();
    const esperando = mesas.mientrasSeEspera(espera.mesa.codigo, () => esperaSuelta.promesa);

    /* Una escritura PENDIENTE: se mueve la diferida y se salta el reloj antes de su segundo de verdad. */
    await mesas.mover(diferida.mesa.codigo, diferida.silla.llave, 0, { tipo: 'jugar', carga: 'pendiente' });
    await dormir(200);

    adelantar(12 * HORA);
    /* Y un asiento VISTO hace nada, sin tocar su mesa: sólo la presencia. */
    marcarPresencia(`arcade:${presente.mesa.codigo}`, presente.silla.id);

    const antesDelBarrido = mesas.memoriaDeLasMesas();
    await mesas.barrerAhora();
    const trasElBarrido = mesas.memoriaDeLasMesas();
    comprobar(
      'salen DOS, las frías que se pueden soltar: la de Riberas y la del plazo',
      trasElBarrido.desalojadas - antesDelBarrido.desalojadas === 2,
      { antes: antesDelBarrido, despues: trasElBarrido },
    );
    comprobar(
      'y sus ficheros siguen en el disco',
      fs.existsSync(ficheroDe(MESAS, riberas.mesa.codigo)) && fs.existsSync(ficheroDe(MESAS, conPlazo.mesa.codigo)),
    );
    comprobar(
      'la que tiene a alguien APARCADO por la ruta NO sale',
      await estabaEnMemoria(porLaRuta.mesa.codigo),
    );
    comprobar(
      'la que tiene a alguien esperando NO sale',
      await estabaEnMemoria(espera.mesa.codigo),
    );
    comprobar(
      'la que tiene un asiento visto hace un momento NO sale',
      await estabaEnMemoria(presente.mesa.codigo),
    );
    comprobar(
      'la que tiene una escritura PENDIENTE NO sale',
      await estabaEnMemoria(diferida.mesa.codigo),
    );
    comprobar(
      'la que tiene una escritura FALLIDA NO sale: lo que sólo está en memoria no se suelta',
      await estabaEnMemoria(sucia.mesa.codigo),
    );
    /* La del candado se pregunta sin cogerlo, que está cogido: por la cuenta. */
    comprobar(
      'y la del candado cogido tampoco: en memoria quedan justo las seis que no se podían soltar',
      trasElBarrido.enMemoria === enMemoriaAlEmpezar - 3,
      trasElBarrido,
    );
    candado.soltar();
    await conElCandadoCogido;
    esperaSuelta.soltar();
    await esperando;
    elCanal().avisarCambio(porLaRuta.mesa.codigo);
    const suelta = await aparcada;
    comprobar('la espera aparcada se suelta con un 204, como siempre', suelta.status === 204, suelta.status);
    await new Promise<void>((cerrado) => escucha.close(() => cerrado()));

    /*
     * La diferida, en cuanto su escritura llega al disco, ya se puede soltar. Preguntar por ella
     * arriba la ha USADO —traerla es usarla—, así que se deja enfriar otra vez antes de barrer.
     */
    await dormir(1300);
    adelantar(13 * HORA);
    await mesas.barrerAhora();
    comprobar(
      'y la diferida, en cuanto su escritura llega al disco y se enfría, sale',
      !(await estabaEnMemoria(diferida.mesa.codigo)),
      mesas.memoriaDeLasMesas(),
    );

    // -------------------------------------------------------------------------
    paso('`abrir` no reparte el código de una mesa que duerme en el disco');
    // -------------------------------------------------------------------------

    {
      /*
       * Se fuerza al azar a dar el código de la de plazo —fuera de la memoria, con su fichero— en el
       * siguiente sorteo de cinco letras, y luego se le deja volver a ser azar.
       */
      adelantar(13 * HORA);
      await mesas.barrerAhora();
      const dormida = conPlazo.mesa.codigo;
      const ficheroDormido = fs.readFileSync(ficheroDe(MESAS, dormida), 'utf8');
      const ALFABETO = 'ABCDEFGHJKLMNPQRTUVWXYZ23456789';
      const indices = [...dormida].map((letra) => ALFABETO.indexOf(letra));
      comprobar('el código de la dormida es del alfabeto de los códigos', indices.every((i) => i >= 0), dormida);
      const azar = globalThis.crypto;
      const deVerdad = azar.getRandomValues.bind(azar);
      let forzado = false;
      (azar as unknown as { getRandomValues: typeof azar.getRandomValues }).getRandomValues = (<T extends ArrayBufferView | null>(
        destino: T,
      ): T => {
        if (!forzado && destino instanceof Uint8Array && destino.length === dormida.length) {
          forzado = true;
          indices.forEach((indice, i) => {
            destino[i] = indice;
          });
          return destino;
        }
        return deVerdad(destino as never) as T;
      }) as typeof azar.getRandomValues;
      let abierta: Awaited<ReturnType<typeof mesas.abrir>> | undefined;
      try {
        abierta = await mesas.abrir({ arcade: FRIO, nombre: 'Kike', plazoSegundos: 0 });
      } finally {
        delete (azar as unknown as { getRandomValues?: unknown }).getRandomValues;
      }
      comprobar('el azar forzado se usó de verdad: el primer código sorteado era el de la dormida', forzado);
      comprobar(
        'y la mesa nueva sale con OTRO código',
        abierta !== undefined && abierta.mesa.codigo !== dormida,
        abierta?.mesa.codigo,
      );
      comprobar(
        'y el fichero de la dormida está intacto, byte a byte',
        fs.readFileSync(ficheroDe(MESAS, dormida), 'utf8') === ficheroDormido,
      );
    }

    // -------------------------------------------------------------------------
    paso('Al pedirlas, vuelven IDÉNTICAS');
    // -------------------------------------------------------------------------

    {
      const leidasAntes = mesas.memoriaDeLasMesas().leidasDelDisco;
      const deRiberas = await comoEstaAhora(riberas.mesa.codigo);
      comprobar(
        'la de Riberas había salido de verdad: pedirla la ha traído del disco',
        mesas.memoriaDeLasMesas().leidasDelDisco === leidasAntes + 1,
        mesas.memoriaDeLasMesas(),
      );
      comprobar(
        'y leída del disco es, en su forma canónica, la que había en memoria',
        deRiberas === antesDeRiberas,
        { antes: antesDeRiberas.length, despues: deRiberas.length },
      );
      comprobar(
        'y su fichero no se ha tocado: salir de la memoria no escribe nada',
        fs.readFileSync(ficheroDe(MESAS, riberas.mesa.codigo), 'utf8') === ficheroDeRiberas,
      );
      const vistaDeRiberas = await mesas.mirar(riberas.mesa.codigo, riberas.silla.llave);
      comprobar(
        'y se sigue jugando: su vista trae el tablero y opciones para quien le toque',
        vistaDeRiberas.rev === riberas.mesa.mesa.rev && typeof vistaDeRiberas.vista === 'object',
        vistaDeRiberas.rev,
      );
      const deLaTerminada = await comoEstaAhora(fin.mesa.codigo);
      comprobar(
        'la terminada vuelve idéntica también',
        deLaTerminada === antesDeLaTerminada,
        { antes: antesDeLaTerminada.length, despues: deLaTerminada.length },
      );
      const suVista = await mesas.mirar(fin.mesa.codigo, fin.silla.llave);
      comprobar(
        'y su vista es la misma: terminada, misma revisión, mismo estado',
        suVista.terminada && suVista.rev === vistaDeLaTerminada.rev && canonicaEscrita(suVista.vista) === canonicaEscrita(vistaDeLaTerminada.vista),
        { rev: [vistaDeLaTerminada.rev, suVista.rev] },
      );
      comprobar(
        'y las dos se han leído del disco, cada una una vez',
        mesas.memoriaDeLasMesas().leidasDelDisco - leidasAntes === 2,
        mesas.memoriaDeLasMesas(),
      );
      const conSuTic = await mesas.mirar(conPlazo.mesa.codigo, conPlazo.silla.llave);
      comprobar(
        'y la del plazo vuelve y se le mete el tic en la primera lectura, como si no hubiera salido',
        conSuTic.tic === 1 && conSuTic.rev === 1,
        { tic: conSuTic.tic, rev: conSuTic.rev },
      );
    }

    // -------------------------------------------------------------------------
    paso('La escritura que falló: no se suelta hasta que se escribe, y entonces vuelve entera');
    // -------------------------------------------------------------------------

    {
      fs.rmSync(ficheroDe(MESAS, sucia.mesa.codigo), { recursive: true, force: true });
      const trasElFallo = await mesas.mirar(sucia.mesa.codigo, sucia.silla.llave);
      comprobar(
        'el movimiento que no llegó al disco sigue en la mesa: nadie lo soltó',
        trasElFallo.rev === 1 && (trasElFallo.vista as EstadoDelFrio).notas[0] === 'lo que sólo está en memoria',
        trasElFallo.vista,
      );
      const otra = await mesas.mover(sucia.mesa.codigo, sucia.silla.llave, trasElFallo.rev, { tipo: 'jugar', carga: 'y ésta sí se escribe' });
      comprobar('con el disco arreglado, el siguiente movimiento se escribe', otra.rev === 2, otra.rev);
      const escrita = await comoEstaAhora(sucia.mesa.codigo);
      adelantar(13 * HORA);
      await mesas.barrerAhora();
      comprobar('ahora sí sale de la memoria', !(await estabaEnMemoria(sucia.mesa.codigo)));
      comprobar(
        'y vuelve con LOS DOS movimientos: el que falló al escribirse no se ha perdido',
        (await comoEstaAhora(sucia.mesa.codigo)) === escrita,
      );
    }

    // -------------------------------------------------------------------------
    paso('Treinta días: el disco se barre sin cargarlo, y lo que no se entiende se queda');
    // -------------------------------------------------------------------------

    {
      /* Lo ilegible y lo de otra versión, también en esta carpeta. */
      fs.writeFileSync(ficheroDe(MESAS, 'ZZZZZ'), '{ esto no es JSON', 'utf8');
      fs.writeFileSync(
        ficheroDe(MESAS, 'YYYYY'),
        JSON.stringify({ version: 99, mesa: (mesaGuardada('YYYYY', FRIO) as { mesa: unknown }).mesa }),
        'utf8',
      );
      /* Desde aquí se apunta todo lo que se le dice al canal, y lo que se trae a la memoria. */
      olvidadasEnElCanal.length = 0;
      const leidasAntes = mesas.memoriaDeLasMesas().leidasDelDisco;
      adelantar(31 * DIA);
      /*
       * Una mesa NUEVA en el mundo de dentro de un mes: su `ultimoToqueEn` es de ahora, pero su
       * fichero se escribe con la fecha de verdad del disco, que para este reloj es de hace un mes.
       * Es la copia restaurada con fechas raras: la fecha del fichero escoge, pero la que manda es
       * la guardada. Abrirla dispara además los dos barridos, como en la vida real.
       */
      const nueva = await mesas.abrir({ arcade: FRIO, nombre: 'Luz', plazoSegundos: 0 });
      adelantar(13 * HORA);
      await mesas.barrerAhora();

      const borradas = [fin.mesa.codigo, riberas.mesa.codigo, conPlazo.mesa.codigo, sucia.mesa.codigo, diferida.mesa.codigo];
      comprobar(
        'las viejas ya no tienen fichero',
        borradas.every((c) => !fs.existsSync(ficheroDe(MESAS, c))),
        borradas.filter((c) => fs.existsSync(ficheroDe(MESAS, c))),
      );
      comprobar(
        'y se le ha dicho al canal de cada una, para que suelte sus avisos',
        borradas.every((c) => olvidadasEnElCanal.includes(c)),
        { canal: olvidadasEnElCanal, borradas },
      );
      comprobar(
        'sin traer ninguna a la memoria para decidirlo',
        mesas.memoriaDeLasMesas().leidasDelDisco === leidasAntes,
        mesas.memoriaDeLasMesas(),
      );
      comprobar(
        'la NUEVA, con un fichero de fecha vieja y un toque de ayer, se queda: manda la fecha guardada',
        fs.existsSync(ficheroDe(MESAS, nueva.mesa.codigo)),
      );
      comprobar(
        'y se puede pedir',
        (await mesas.mirar(nueva.mesa.codigo, nueva.silla.llave)).codigo === nueva.mesa.codigo,
      );
      comprobar(
        'la ilegible y la de otra versión siguen ahí: lo que no se entiende no se borra',
        fs.existsSync(ficheroDe(MESAS, 'ZZZZZ')) && fs.existsSync(ficheroDe(MESAS, 'YYYYY')),
      );
      comprobar('y no queda ningún candado suelto', mesas.candadosDeMesaVivos() === 0, mesas.candadosDeMesaVivos());
    }

    // -------------------------------------------------------------------------
    paso('Un fichero con JSON bueno y FORMA ROTA: se cuenta como ilegible, no entra, y no tumba a nadie');
    // -------------------------------------------------------------------------

    {
      /*
       * EL AGUJERO: al leer del disco sólo se exigía una versión conocida y una `mesa` que no fuera
       * falsa. Un fichero con JSON bueno y sin la mesa del árbitro dentro —o con `sillas: null`—
       * pasaba, ENTRABA EN LA TABLA antes de que `cerrarAlRecuperar` reventara con él, y desde ese
       * momento el barrido de lo frío, que corre en CADA `abrir`, reventaba también: `POST
       * /arcade/mesas` daba 500 para todo el servidor hasta reiniciar. Con `sillas: null` la bomba
       * tardaba doce horas en estallar, que es cuando la mesa se enfría y el barrido la mira entera.
       *
       * Se barre primero para que el último barrido sea AHORA: así ninguna de las lecturas de abajo
       * dispara otro, y lo que se cuenta es lo que cuentan ellas y nada más.
       */
      await mesas.barrerAhora();
      const ahora = Date.now();
      const sana = (codigo: string) => ({
        codigo,
        mesa: { id: codigo, arcade: FRIO, asientos: ['aROTA0000'], rev: 0, tic: 0, semilla: 1, terminada: false, diario: [] },
        sillas: [{ id: 'aROTA0000', nombre: 'Quien fuera', llave: `LLAVE${codigo}${'0'.repeat(14)}` }],
        plazoMs: 0,
        venceEn: null,
        turnoDesde: ahora,
        abiertaEn: ahora,
        ultimoToqueEn: ahora,
        modalidad: 'normal',
      });
      const rotas: Record<string, unknown> = {
        /* Sin la mesa del árbitro: la del hallazgo. */
        ROTA1: { version: 2, mesa: { codigo: 'ROTA1' } },
        /* La del árbitro, nula. */
        ROTA2: { version: 2, mesa: { ...sana('ROTA2'), mesa: null } },
        /* Sin lista de sillas: la bomba de las doce horas. */
        ROTA3: { version: 2, mesa: { ...sana('ROTA3'), sillas: null } },
        /* Una silla nula, y en la versión 3, que también se lee. */
        ROTA4: { version: 3, mesa: { ...sana('ROTA4'), sillas: [null] } },
        /* Una silla sin llave: un asiento que nadie puede demostrar que es suyo. */
        ROTA5: { version: 2, mesa: { ...sana('ROTA5'), sillas: [{ id: 'aROTA0000', nombre: 'Sin llave' }] } },
        /* Un diario que no es una lista: el árbitro lo esparce en cada movimiento. */
        ROTA6: { version: 2, mesa: { ...sana('ROTA6'), mesa: { ...sana('ROTA6').mesa, diario: 'no es una lista' } } },
        /* Y sin mesa ninguna. */
        ROTA7: { version: 2 },
      };
      for (const [codigo, contenido] of Object.entries(rotas)) {
        fs.writeFileSync(ficheroDe(MESAS, codigo), JSON.stringify(contenido), 'utf8');
      }
      const fallosAntes = mesas.saludDelAlmacen().fallosAlLeer;
      const enMemoriaAntes = mesas.memoriaDeLasMesas().enMemoria;

      const contestan: Record<string, string> = {};
      for (const codigo of Object.keys(rotas)) contestan[codigo] = await loQueLanza(() => mesas.mirar(codigo, null));
      comprobar(
        'las siete contestan «esa mesa no existe» —el 404 de la ruta—, y ninguna un TypeError ni una partida',
        Object.values(contestan).every((c) => c.startsWith('MesaDesconocida')),
        contestan,
      );
      comprobar(
        'y cada una se cuenta en el diagnóstico como lo que es: una mesa que no se pudo leer',
        mesas.saludDelAlmacen().fallosAlLeer === fallosAntes + Object.keys(rotas).length,
        { antes: fallosAntes, ahora: mesas.saludDelAlmacen().fallosAlLeer },
      );
      comprobar(
        'ninguna ha entrado en la memoria',
        mesas.memoriaDeLasMesas().enMemoria === enMemoriaAntes,
        { antes: enMemoriaAntes, ahora: mesas.memoriaDeLasMesas() },
      );
      comprobar(
        'y sus ficheros siguen ahí: lo que no se entiende no se borra',
        Object.keys(rotas).every((c) => fs.existsSync(ficheroDe(MESAS, c))),
      );
      const alAbrir = await loQueLanza(() => mesas.abrir({ arcade: FRIO, nombre: 'Tras las rotas', plazoSegundos: 0 }));
      comprobar('y abrir otra mesa sigue funcionando', alAbrir === 'nada', alAbrir);
      /* La bomba de las doce horas: se enfría todo, se barre, y se vuelve a abrir. */
      adelantar(13 * HORA);
      const alBarrer = await loQueLanza(() => mesas.barrerAhora());
      const alAbrirLuego = await loQueLanza(() =>
        mesas.abrir({ arcade: FRIO, nombre: 'Trece horas después', plazoSegundos: 0 }),
      );
      comprobar(
        'y trece horas después, con todo frío, ni el barrido ni `abrir` revientan',
        alBarrer === 'nada' && alAbrirLuego === 'nada',
        { alBarrer, alAbrirLuego },
      );
    }

    // -------------------------------------------------------------------------
    paso('Y si una mesa llegara envenenada a la memoria, la limpieza no tumba ni `abrir` ni las lecturas');
    // -------------------------------------------------------------------------

    {
      /*
       * Del disco ya no puede llegar ninguna —lo de arriba lo cierra en la puerta—, así que se
       * envenenan A MANO, en memoria, dos mesas vivas: una sin la mesa del árbitro y otra con un
       * toque que no se puede restar. Es la red de debajo: los barridos miran mesa a mesa, y la que
       * revienta se queda como estaba y se dice, en vez de llevarse la petición de quien pasaba.
       */
      const sana = await mesas.abrir({ arcade: FRIO, nombre: 'Sana', plazoSegundos: 0 });
      const sinMesa = await mesas.abrir({ arcade: FRIO, nombre: 'Sin mesa', plazoSegundos: 0 });
      const sinToque = await mesas.abrir({ arcade: FRIO, nombre: 'Sin toque', plazoSegundos: 0 });
      await mesas.conLaMesa(sinMesa.mesa.codigo, (m) => {
        (m as unknown as { mesa: unknown }).mesa = null;
      });
      await mesas.conLaMesa(sinToque.mesa.codigo, (m) => {
        (m as unknown as { ultimoToqueEn: unknown }).ultimoToqueEn = 1n;
      });
      /* Dos horas, para que la próxima lectura vuelva a barrer: barre como mucho una vez por hora. */
      adelantar(2 * HORA);
      const alMirar = await loQueLanza(() => mesas.mirar(sana.mesa.codigo, sana.silla.llave));
      const alRevisar = await loQueLanza(() => mesas.revisionDe(sana.mesa.codigo, sana.silla.llave));
      const alAbrir = await loQueLanza(() =>
        mesas.abrir({ arcade: FRIO, nombre: 'Con veneno en la tabla', plazoSegundos: 0 }),
      );
      const alBarrer = await loQueLanza(() => mesas.barrerAhora());
      comprobar(
        'con dos mesas envenenadas EN MEMORIA, `mirar`, `revisionDe`, `abrir` y el barrido siguen funcionando',
        alMirar === 'nada' && alRevisar === 'nada' && alAbrir === 'nada' && alBarrer === 'nada',
        { alMirar, alRevisar, alAbrir, alBarrer },
      );
      await mesas.olvidarMesa(sinMesa.mesa.codigo);
      await mesas.olvidarMesa(sinToque.mesa.codigo);
      comprobar('y no queda ningún candado suelto', mesas.candadosDeMesaVivos() === 0, mesas.candadosDeMesaVivos());
    }
  } catch (error) {
    fallos.push(`la prueba se cayó: ${error instanceof Error ? error.stack : String(error)}`);
  }
}

Date.now = real;
olvidarArcade(FRIO);
olvidarArcade(DIFERIDO);
try {
  fs.rmSync(CARPETA, { recursive: true, force: true });
} catch {
  /* en Windows un fichero recién cerrado a veces sigue tomado un instante */
}

console.log('');
if (fallos.length > 0) {
  console.log(`✘ ${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
  for (const f of fallos) console.log(`   · ${f}`);
  process.exit(1);
}

/* EL GUARDIA: un comprobador que se cae a mitad sin decirlo se parece mucho a uno verde. */
const COMPROBACIONES_ESCRITAS = 63;
if (hechas < COMPROBACIONES_ESCRITAS) {
  console.log(`Sólo se han hecho ${hechas} de las ${COMPROBACIONES_ESCRITAS} comprobaciones escritas.`);
  process.exit(2);
}

console.log(
  `✔ ${hechas} comprobaciones. Un proceso nuevo lee lo que se le pide y no la carpeta entera; lo\n` +
    '  frío sale de la memoria con su fichero intacto, y lo que no se puede soltar —alguien esperando,\n' +
    '  un asiento visto, el candado cogido, una escritura pendiente o una que falló— se queda; al\n' +
    '  pedirlas vuelven idénticas, con su tic si les tocaba; `abrir` no reparte el código de una mesa\n' +
    '  dormida; el barrido de treinta días borra del disco sin cargar nada y sin tocar lo que no\n' +
    '  entiende; un fichero de forma rota es un ilegible más, y no entra; y la limpieza no tumba a\n' +
    '  nadie aunque haya una mesa envenenada en la memoria.',
);
process.exit(0);
