/**
 * LA LECTURA BARATA: una espera que no encuentra nada no proyecta nada.
 *
 *   npm run verify:lectura-barata
 *
 * ═══ LO QUE COSTABA UNA MESA QUIETA ═══
 *
 * `GET /api/arcade/mesas/:codigo?desde=N` es lo que hacen todos los móviles de una mesa, todo el
 * rato: preguntar «¿ha cambiado algo desde la N?» y quedarse aparcados veinticinco segundos si no.
 * La ruta hacía `mirar()` —que PROYECTA: ejecuta el código del juego en el hilo del servidor para
 * componer la vista de ese asiento, y le pregunta sus `opciones()`— sólo para comparar la
 * revisión; esperaba; y hacía OTRO `mirar()` para volver a comparar. Si nada había cambiado,
 * tiraba las dos vistas y contestaba 204. O sea que la mitad del coste de una mesa quieta era
 * componer dos pantallas que nadie iba a ver, por cada móvil y cada veinticinco segundos.
 *
 * Ahora las dos comparaciones se hacen con `revisionDe`, que hace lo que `mirar` hace ANTES de
 * componer la vista —el 404, el tic si venció el plazo, la presencia, el barrido— y la vista no, y
 * `mirar` se llama sólo cuando hay que contestar con la mesa.
 *
 * ═══ SE CUENTA, NO SE CRONOMETRA ═══
 *
 * Un cronómetro aquí mediría la máquina: un móvil de más en la batería, una pestaña pintando, y el
 * número se mueve sin que el código cambie. Lo que no se mueve es CUÁNTAS VECES se proyecta, así
 * que se monta un arcade de prueba cuya proyección y cuyas `opciones()` suman uno por cada vez que
 * se las llama, apuntado por asiento: así se separan las proyecciones de la lectura que se mide de
 * las que hace de paso un movimiento de otro asiento.
 *
 * ═══ EL RESTO ES LO DE SIEMPRE, MENOS DOS COSAS QUE CAMBIAN A MEJOR ═══
 *
 * Mismos 200, 204 y 404, mismos avisos, el mismo tic metido por la lectura, la misma presencia, y
 * el despertador por vencimiento soltando la espera igual. Esto lo comprueba aquí contra la ruta
 * de verdad montada en un Express de verdad, y `verify:mesa`, `verify:larga` y `verify:marcador`
 * contra el servidor levantado.
 *
 * Aquí ponía «el resto tiene que ser IDÉNTICO», y un revisor encontró dos cosas que no lo son,
 * porque no componer la vista es no ejecutar el código del juego que la compone:
 *
 *  · una proyección que REVIENTA ya no da 500 a quien sondea una mesa quieta: da 204. Sin `desde`
 *    o con uno rancio —cuando sí hay que mandar la mesa— el 500 sigue saliendo;
 *  · unas `opciones()` LENTAS ya no apartan al arcade porque alguien sondee una mesa quieta, y por
 *    eso el plazo sigue metiendo su tic —un arcade apartado no tica—. Pedir la mesa sí las paga.
 *
 * Las dos son mejoras y se quedan; las dos se comprueban abajo, con un arcade de proyección rota y
 * otro de opciones lentas, y se vieron ROJAS devolviéndole `mirar` a la ruta: si alguien lo hiciera,
 * esto se lo diría.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { instalarArcade, olvidarArcade, rechazar } from '../../shared/arcade';
import type { ManifiestoDeArcade, Movimiento, Opcion } from '../../shared/arcade';
import { enCuarentena, TOPE_MS } from '../src/arcade/presupuesto';

/* La carpeta de las mesas, ANTES de cargar `mesas.ts`, que la lee al cargarse. */
const CARPETA = fs.mkdtempSync(path.join(os.tmpdir(), 'lectura-barata-'));
process.env.MESAS_DIR = CARPETA;

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

// ---------------------------------------------------------------------------
// EL ARCADE QUE CUENTA
// ---------------------------------------------------------------------------

const CONTADO = 'el-contado';

/** Cuántas veces se ha proyectado, y cuántas se le han pedido las opciones, por quien mira. */
const proyecciones = new Map<string, number>();
const opcionesPedidas = new Map<string, number>();

function sumar(tabla: Map<string, number>, quien: unknown): void {
  const clave = String(quien);
  tabla.set(clave, (tabla.get(clave) ?? 0) + 1);
}

/** Lo contado para un asiento, las dos cosas juntas. */
function contadoPara(asiento: string): { proyecciones: number; opciones: number } {
  return { proyecciones: proyecciones.get(asiento) ?? 0, opciones: opcionesPedidas.get(asiento) ?? 0 };
}

/** Todo lo contado, de todo el mundo. */
function contadoEntero(): number {
  let n = 0;
  for (const v of proyecciones.values()) n += v;
  for (const v of opcionesPedidas.values()) n += v;
  return n;
}

interface EstadoDelContado {
  tics: number;
  jugadas: number;
}

const manifiesto: ManifiestoDeArcade = {
  id: CONTADO,
  nombre: 'El Contado',
  gancho: 'Una prueba de lectura, y nada más.',
  icono: 'mando',
  jugadores: { minimo: 1, maximo: 4 },
  sede: 'servidor',
  tickHz: 0,
  mueble: 'formulario',
  secretos: false,
  marcador: { tipo: 'ninguno' },
  procedencia: { tipo: 'creacion-propia' },
};

instalarArcade<EstadoDelContado | undefined, unknown>({
  manifiesto,
  avanzar: (estado: EstadoDelContado | undefined, movimiento: Movimiento) => {
    const actual = estado ?? { tics: 0, jugadas: 0 };
    if (movimiento.tipo === 'arcade:tic') return { ...actual, tics: actual.tics + 1 };
    if (movimiento.tipo === 'jugar') return { ...actual, jugadas: actual.jugadas + 1 };
    return rechazar(actual, 'Eso no es una jugada del Contado.');
  },
  proyeccion: (estado: EstadoDelContado | undefined, quien) => {
    sumar(proyecciones, quien);
    return estado ?? null;
  },
  opciones: (_vista, quien): readonly Opcion[] => {
    sumar(opcionesPedidas, quien);
    return quien === null ? [] : [{ id: 'jugar', tipo: 'jugar', carga: {}, rotulo: 'Jugar', ayuda: '' }];
  },
  seAcabo: () => false,
});

/*
 * LOS DOS QUE ENSEÑAN LO QUE LA LECTURA BARATA CAMBIA A LA VISTA: uno cuya proyección revienta con
 * un estado concreto, y otro cuyas `opciones()` tardan más que el tope del presupuesto. Los dos
 * cambios son a mejor y se quedan; esto los deja escritos para que nadie los deshaga sin verlo.
 */
const ROTO = 'el-roto';
const LENTO = 'el-lento';

interface EstadoDelRoto {
  tics: number;
  roto: boolean;
}

instalarArcade<EstadoDelRoto | undefined, unknown>({
  manifiesto: { ...manifiesto, id: ROTO, nombre: 'El Roto' },
  avanzar: (estado: EstadoDelRoto | undefined, movimiento: Movimiento) => {
    const actual = estado ?? { tics: 0, roto: false };
    if (movimiento.tipo === 'arcade:tic') return { ...actual, tics: actual.tics + 1 };
    if (movimiento.tipo === 'romper') return { ...actual, roto: true };
    return rechazar(actual, 'Eso no es una jugada del Roto.');
  },
  proyeccion: (estado: EstadoDelRoto | undefined) => {
    if (estado?.roto === true) throw new Error('una proyección que revienta, a propósito');
    return estado ?? null;
  },
  seAcabo: () => false,
});

instalarArcade<EstadoDelRoto | undefined, unknown>({
  manifiesto: { ...manifiesto, id: LENTO, nombre: 'El Lento' },
  avanzar: (estado: EstadoDelRoto | undefined, movimiento: Movimiento) => {
    const actual = estado ?? { tics: 0, roto: false };
    if (movimiento.tipo === 'arcade:tic') return { ...actual, tics: actual.tics + 1 };
    return rechazar(actual, 'Eso no es una jugada del Lento.');
  },
  proyeccion: (estado: EstadoDelRoto | undefined) => estado ?? null,
  opciones: (): readonly Opcion[] => {
    /* Más que el tope del presupuesto, de reloj de verdad: una sola llamada aparta al arcade. */
    const hasta = Date.now() + TOPE_MS + 25;
    while (Date.now() < hasta) {
      /* esperar sin soltar el hilo, que es lo que hace un `opciones()` lento */
    }
    return [{ id: 'nada', tipo: 'nada', carga: {}, rotulo: 'Nada', ayuda: '' }];
  },
  seAcabo: () => false,
});

const mesas = await import('../src/arcade/mesas');
const { default: arcadeRouter } = await import('../src/routes/arcade');
const { elCanal, ponerCanal } = await import('../src/canal');
const { canalDeSondeo } = await import('../src/canal/sondeo');
const { senalEnMemoria } = await import('../src/mecanicas/presencia');

/* El canal, como lo pone el arranque: sin él, `elCanal()` es el que lanza. */
ponerCanal(canalDeSondeo);

const app = express();
app.use(express.json({ limit: '256kb' }));
app.use('/api', arcadeRouter);
/* Un puerto que da el sistema, nunca uno de `.claude/launch.json`. */
const escucha = app.listen(0, '127.0.0.1');
await new Promise<void>((lista) => escucha.once('listening', () => lista()));
const donde = escucha.address();
const PUERTO = typeof donde === 'object' && donde !== null ? donde.port : 0;
const BASE = `http://127.0.0.1:${String(PUERTO)}/api`;

interface Respuesta {
  estado: number;
  datos: any;
  ms: number;
}

async function pedir(
  ruta: string,
  opciones: { metodo?: string; cuerpo?: unknown; llave?: string | null } = {},
): Promise<Respuesta> {
  const desde = Date.now();
  const r = await fetch(`${BASE}${ruta}`, {
    method: opciones.metodo ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opciones.llave ? { 'x-asiento': opciones.llave } : {}),
    },
    ...(opciones.cuerpo === undefined ? {} : { body: JSON.stringify(opciones.cuerpo) }),
  });
  const texto = await r.text();
  let datos: unknown = null;
  if (texto.length > 0) {
    try {
      datos = JSON.parse(texto);
    } catch {
      datos = texto;
    }
  }
  return { estado: r.status, datos, ms: Date.now() - desde };
}

/**
 * SUELTA UNA ESPERA APARCADA SIN CAMBIAR NADA, una y otra vez hasta que la petición conteste.
 *
 * Es lo mismo que le pasa a una espera cuando se agota su plazo de veinticinco segundos —la ruta
 * vuelve a comparar y, si no ha cambiado nada, contesta 204—, sin esperar veinticinco segundos.
 * Se repite porque el primer aviso puede llegar antes de que la petición se haya aparcado, y un
 * aviso a nadie se pierde.
 */
async function soltandoLaEspera<T>(codigo: string, peticion: Promise<T>): Promise<T> {
  let contesto = false;
  const vueltas = (async () => {
    while (!contesto) {
      await dormir(50);
      if (!contesto) elCanal().avisarCambio(codigo);
    }
  })();
  try {
    return await peticion;
  } finally {
    contesto = true;
    await vueltas;
  }
}

try {
  // ---------------------------------------------------------------------------
  paso('Una mesa sin plazo: la lectura que espera y no encuentra nada NO proyecta');
  // ---------------------------------------------------------------------------

  const abierta = await pedir('/arcade/mesas', { metodo: 'POST', cuerpo: { arcade: CONTADO, nombre: 'Ana', plazoSegundos: 0 } });
  comprobar('se abre la mesa del arcade que cuenta', abierta.estado === 201, abierta);
  const codigo = String(abierta.datos.codigo);
  const ana = { asiento: String(abierta.datos.asiento), llave: String(abierta.datos.llave) };
  const sentada = await pedir(`/arcade/mesas/${codigo}/asientos`, { metodo: 'POST', cuerpo: { nombre: 'Bea' } });
  const bea = { asiento: String(sentada.datos.asiento), llave: String(sentada.datos.llave) };

  {
    const antes = contadoPara(ana.asiento);
    const sinDesde = await pedir(`/arcade/mesas/${codigo}`, { llave: ana.llave });
    const despues = contadoPara(ana.asiento);
    comprobar('sin `desde` contesta la mesa, 200', sinDesde.estado === 200 && sinDesde.datos.mesa?.codigo === codigo, sinDesde.estado);
    comprobar(
      'y proyecta UNA vez para quien pregunta: la vista que se le manda',
      despues.proyecciones - antes.proyecciones === 1 && despues.opciones - antes.opciones === 1,
      { antes, despues },
    );
  }

  const rev = Number((await pedir(`/arcade/mesas/${codigo}`, { llave: ana.llave })).datos.mesa.rev);

  {
    const antes = contadoPara(ana.asiento);
    const deTodos = contadoEntero();
    const vistaAntes = senalEnMemoria(`arcade:${codigo}`, ana.asiento);
    await dormir(5);
    const quieta = await soltandoLaEspera(codigo, pedir(`/arcade/mesas/${codigo}?desde=${String(rev)}`, { llave: ana.llave }));
    const despues = contadoPara(ana.asiento);
    comprobar('con `desde` igual y nada nuevo, 204 y sin cuerpo', quieta.estado === 204 && quieta.datos === null, quieta);
    comprobar(
      'LA LECTURA QUIETA NO PROYECTA: cero vistas y cero opciones para quien pregunta',
      despues.proyecciones === antes.proyecciones && despues.opciones === antes.opciones,
      { antes, despues },
    );
    comprobar('ni para nadie más: cero en todo el arcade', contadoEntero() === deTodos, {
      antes: deTodos,
      despues: contadoEntero(),
    });
    comprobar(
      'y MARCA LA PRESENCIA de quien pregunta, como `mirar`: esperar es que se le ha visto',
      senalEnMemoria(`arcade:${codigo}`, ana.asiento) > vistaAntes,
      { antes: vistaAntes, despues: senalEnMemoria(`arcade:${codigo}`, ana.asiento) },
    );
    console.log(
      `  lectura quieta: ${String(despues.proyecciones - antes.proyecciones)} proyecciones y ` +
        `${String(despues.opciones - antes.opciones)} opciones para quien espera`,
    );
  }

  {
    const deTodos = contadoEntero();
    const mirona = await soltandoLaEspera(codigo, pedir(`/arcade/mesas/${codigo}?desde=${String(rev)}`));
    comprobar(
      'y la de quien mira sin asiento, tampoco: 204 y cero proyecciones',
      mirona.estado === 204 && contadoEntero() === deTodos,
      { estado: mirona.estado, antes: deTodos, despues: contadoEntero() },
    );
  }

  {
    /*
     * Una espera que SÍ encuentra algo: Ana aparcada, Bea mueve. Lo que se le manda a Ana es UNA
     * vista —la de después—, y no dos. Las proyecciones del movimiento de Bea son de Bea y del
     * espectador (a quién le toca), y por eso se cuenta por asiento.
     */
    const antes = contadoPara(ana.asiento);
    const aparcada = pedir(`/arcade/mesas/${codigo}?desde=${String(rev)}`, { llave: ana.llave });
    await dormir(150);
    const movida = await pedir(`/arcade/mesas/${codigo}/movimientos`, {
      metodo: 'POST',
      llave: bea.llave,
      cuerpo: { rev, tipo: 'jugar', carga: {} },
    });
    const respuesta = await aparcada;
    const despues = contadoPara(ana.asiento);
    comprobar('Bea mueve', movida.estado === 200 && movida.datos.mesa?.rev === rev + 1, movida);
    comprobar(
      'la espera de Ana se suelta con la mesa NUEVA, 200',
      respuesta.estado === 200 && respuesta.datos.mesa?.rev === rev + 1,
      { estado: respuesta.estado, rev: respuesta.datos?.mesa?.rev },
    );
    comprobar(
      'y a Ana se le proyecta UNA vez, la que se le manda, y no dos',
      despues.proyecciones - antes.proyecciones === 1 && despues.opciones - antes.opciones === 1,
      { antes, despues },
    );
  }

  const revAhora = rev + 1;

  {
    const antes = contadoPara(ana.asiento);
    const rancia = await pedir(`/arcade/mesas/${codigo}?desde=${String(revAhora - 1)}`, { llave: ana.llave });
    const trasRancia = contadoPara(ana.asiento);
    comprobar(
      'con un `desde` rancio contesta en el acto con la mesa entera, y proyecta una vez',
      rancia.estado === 200 && rancia.datos.mesa?.rev === revAhora && trasRancia.proyecciones - antes.proyecciones === 1,
      { estado: rancia.estado, antes, trasRancia },
    );
    const adelantada = await pedir(`/arcade/mesas/${codigo}?desde=${String(revAhora + 7)}`, { llave: ana.llave });
    comprobar(
      'y con uno ADELANTADO también: se resincroniza, no se cuelga',
      adelantada.estado === 200 && adelantada.datos.mesa?.rev === revAhora && adelantada.ms < 5_000,
      { estado: adelantada.estado, ms: adelantada.ms },
    );
  }

  {
    /* Los avisos van con la mesa, igual que antes: se anuncian y los recoge quien venía de atrás. */
    elCanal().anunciar(codigo, revAhora, { clave: 'lectura:prueba', texto: 'Un aviso de prueba.' });
    const conAvisos = await pedir(`/arcade/mesas/${codigo}?desde=${String(revAhora - 1)}`, { llave: ana.llave });
    comprobar(
      'y los avisos siguen llegando con la mesa a quien venía de una revisión anterior',
      conAvisos.estado === 200 &&
        Array.isArray(conAvisos.datos.avisos) &&
        conAvisos.datos.avisos.some((a: { clave?: string }) => a.clave === 'lectura:prueba'),
      conAvisos.datos?.avisos,
    );
  }

  // ---------------------------------------------------------------------------
  paso('Una mesa CON plazo: el tic lo sigue metiendo la lectura, y proyectando una sola vez');
  // ---------------------------------------------------------------------------

  const conPlazo = await pedir('/arcade/mesas', { metodo: 'POST', cuerpo: { arcade: CONTADO, nombre: 'Cid', plazoSegundos: 1 } });
  const codigoP = String(conPlazo.datos.codigo);
  const cid = { asiento: String(conPlazo.datos.asiento), llave: String(conPlazo.datos.llave) };
  const revP = Number(conPlazo.datos.mesa.rev);
  const ticP = Number(conPlazo.datos.mesa.tic);

  {
    await dormir(1200);
    const antes = contadoPara(cid.asiento);
    const vencida = await pedir(`/arcade/mesas/${codigoP}?desde=${String(revP)}`, { llave: cid.llave });
    const despues = contadoPara(cid.asiento);
    comprobar(
      'con el plazo vencido, la lectura con `desde` al día mete el tic y contesta EN EL ACTO con él',
      vencida.estado === 200 && vencida.datos.mesa?.tic === ticP + 1 && vencida.datos.mesa?.rev > revP && vencida.ms < 1_000,
      { estado: vencida.estado, tic: vencida.datos?.mesa?.tic, rev: vencida.datos?.mesa?.rev, ms: vencida.ms },
    );
    comprobar(
      'y proyecta UNA vez para quien pregunta',
      despues.proyecciones - antes.proyecciones === 1,
      { antes, despues },
    );
  }

  {
    /*
     * El sexto verbo: una espera aparcada con el plazo POR DELANTE se suelta por el despertador
     * al vencer, y la segunda comparación —que ahora es la barata— es la que mete el tic. Con la
     * lectura de antes esto proyectaba dos veces; ahora, una.
     */
    const ahora = await pedir(`/arcade/mesas/${codigoP}`, { llave: cid.llave });
    const revAntes = Number(ahora.datos.mesa.rev);
    const ticAntes = Number(ahora.datos.mesa.tic);
    const antes = contadoPara(cid.asiento);
    const despertada = await pedir(`/arcade/mesas/${codigoP}?desde=${String(revAntes)}`, { llave: cid.llave });
    const despues = contadoPara(cid.asiento);
    comprobar(
      'una espera aparcada se despierta por VENCIMIENTO y trae el tic ya metido',
      despertada.estado === 200 && despertada.datos.mesa?.tic === ticAntes + 1 && despertada.ms > 300 && despertada.ms < 10_000,
      { estado: despertada.estado, tic: despertada.datos?.mesa?.tic, ms: despertada.ms },
    );
    comprobar(
      'y proyecta UNA vez, no dos',
      despues.proyecciones - antes.proyecciones === 1,
      { antes, despues },
    );
    console.log(`  la espera aparcada se soltó por vencimiento en ${(despertada.ms / 1000).toFixed(1)} s`);
  }

  // ---------------------------------------------------------------------------
  paso('Una mesa que no existe: el mismo 404, con `desde` y sin él, y sin proyectar nada');
  // ---------------------------------------------------------------------------

  {
    const deTodos = contadoEntero();
    const conDesde = await pedir('/arcade/mesas/QQQQQ?desde=0');
    const sinDesde = await pedir('/arcade/mesas/QQQQQ');
    comprobar('con `desde` es un 404', conDesde.estado === 404, conDesde);
    comprobar(
      'con el MISMO cuerpo que sin él: la lectura barata dice «no existe» igual que `mirar`',
      sinDesde.estado === 404 && JSON.stringify(conDesde.datos) === JSON.stringify(sinDesde.datos),
      { conDesde: conDesde.datos, sinDesde: sinDesde.datos },
    );
    comprobar('y no proyecta nada', contadoEntero() === deTodos, { antes: deTodos, despues: contadoEntero() });
  }

  // ---------------------------------------------------------------------------
  paso('Lo que cambia a la vista, y a mejor: una proyección rota ya no tumba la espera de una mesa quieta');
  // ---------------------------------------------------------------------------

  {
    /*
     * La lectura quieta proyectaba, así que una proyección que revienta daba 500 también a quien
     * sólo preguntaba «¿hay algo nuevo?» sobre una mesa en la que no había pasado nada. Ahora
     * contesta 204: no había nada que mandar, y lo que falla es componer lo que se manda. En cuanto
     * SÍ hay que mandar la mesa —sin `desde`, o con uno rancio— `mirar` proyecta y el 500 sale, que
     * es lo honrado: la proyección está rota y quien pide la mesa se entera.
     *
     * La mesa se abre y se rompe en proceso: abrir por la ruta ya compone la primera vista.
     */
    const rota = await mesas.abrir({ arcade: ROTO, nombre: 'Rita', plazoSegundos: 0 });
    const codigoR = rota.mesa.codigo;
    const alRomper = await mesas.mover(codigoR, rota.silla.llave, 0, { tipo: 'romper', carga: {} }).then(
      () => 'nada',
      (error: unknown) => (error instanceof Error ? error.message : String(error)),
    );
    comprobar(
      'la jugada que la rompe entra y se guarda, y lo que revienta es componer la respuesta',
      alRomper.includes('revienta') && rota.mesa.mesa.rev === 1,
      { alRomper, rev: rota.mesa.mesa.rev },
    );
    const quieta = await soltandoLaEspera(codigoR, pedir(`/arcade/mesas/${codigoR}?desde=1`, { llave: rota.silla.llave }));
    comprobar(
      'con la proyección rota y la mesa QUIETA, la espera contesta 204 (antes, 500): no había nada que componer',
      quieta.estado === 204,
      { estado: quieta.estado },
    );
    const sinDesde = await pedir(`/arcade/mesas/${codigoR}`, { llave: rota.silla.llave });
    const rancia = await pedir(`/arcade/mesas/${codigoR}?desde=0`, { llave: rota.silla.llave });
    comprobar(
      'y en cuanto hay que MANDAR la mesa —sin `desde`, o con uno rancio—, 500: la rotura se sigue viendo',
      sinDesde.estado === 500 && rancia.estado === 500,
      { sinDesde: sinDesde.estado, rancia: rancia.estado },
    );
  }

  // ---------------------------------------------------------------------------
  paso('Y unas `opciones()` lentas ya no apartan al arcade porque alguien espera mirando una mesa quieta');
  // ---------------------------------------------------------------------------

  {
    /*
     * La lectura quieta componía la vista, y la vista le pide al juego sus `opciones()`, que pasan
     * por el presupuesto. Unas opciones lentas apartaban al arcade SÓLO porque alguien sondeaba una
     * mesa en la que no pasaba nada, y un arcade apartado deja de ticar: el plazo ya no metía su tic.
     * Ahora el sondeo quieto no las llama, el arcade no se aparta por eso, y el plazo vence como
     * tiene que vencer. Quien PIDE la mesa sí las paga —`mirar` las llama—, y la vacuna lo enseña.
     *
     * En proceso para abrir, por lo mismo que la rota: abrir por la ruta ya llama a `opciones()`.
     */
    const lenta = await mesas.abrir({ arcade: LENTO, nombre: 'Luis', plazoSegundos: 2 });
    const codigoL = lenta.mesa.codigo;
    const sondeos: number[] = [];
    for (let vuelta = 0; vuelta < 3; vuelta++) {
      sondeos.push(
        (await soltandoLaEspera(codigoL, pedir(`/arcade/mesas/${codigoL}?desde=0`, { llave: lenta.silla.llave }))).estado,
      );
    }
    comprobar(
      'tres sondeos de la mesa quieta: 204, y el arcade de las opciones lentas SIGUE sin apartar (antes, apartado)',
      sondeos.every((e) => e === 204) && enCuarentena(LENTO) === null,
      { sondeos, apartado: enCuarentena(LENTO) },
    );
    await dormir(2_300);
    const vencida = await pedir(`/arcade/mesas/${codigoL}`, { llave: lenta.silla.llave });
    comprobar(
      'y vencido el plazo, la lectura mete el tic (antes no: un arcade apartado no tica)',
      vencida.estado === 200 && vencida.datos.mesa?.tic === 1 && vencida.datos.mesa?.rev === 1,
      { estado: vencida.estado, tic: vencida.datos?.mesa?.tic, rev: vencida.datos?.mesa?.rev },
    );
    comprobar(
      'y la vacuna: pedir la mesa SÍ llama a sus opciones, y ahí el arcade se aparta, así que lo de arriba mide algo',
      enCuarentena(LENTO) !== null,
      enCuarentena(LENTO),
    );
  }

  {
    const d = await pedir('/arcade/diagnostico');
    comprobar('y no queda ningún candado suelto', d.estado === 200 && d.datos.candados === 0, d.datos);
  }
} catch (error) {
  fallos.push(`la prueba se cayó: ${error instanceof Error ? error.stack : String(error)}`);
} finally {
  await new Promise<void>((cerrado) => escucha.close(() => cerrado()));
  olvidarArcade(CONTADO);
  olvidarArcade(ROTO);
  olvidarArcade(LENTO);
  try {
    fs.rmSync(CARPETA, { recursive: true, force: true });
  } catch {
    /* en Windows un fichero recién cerrado a veces sigue tomado un instante */
  }
}

console.log('');
if (fallos.length > 0) {
  console.log(`✘ ${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
  for (const f of fallos) console.log(`   · ${f}`);
  process.exit(1);
}

/* EL GUARDIA: un comprobador que se cae a mitad sin decirlo se parece mucho a uno verde. */
const COMPROBACIONES_ESCRITAS = 28;
if (hechas < COMPROBACIONES_ESCRITAS) {
  console.log(`Sólo se han hecho ${hechas} de las ${COMPROBACIONES_ESCRITAS} comprobaciones escritas.`);
  process.exit(2);
}

console.log(
  `✔ ${hechas} comprobaciones. Una lectura con \`desde\` que espera y no encuentra nada ya no\n` +
    '  proyecta nada —ni para quien pregunta ni para nadie—, y la que encuentra algo proyecta una vez\n' +
    '  y no dos. El resto es lo de siempre: 200, 204 y 404 donde tocan, los avisos con la mesa, la\n' +
    '  presencia marcada, el tic metido por la lectura y la espera soltada por el despertador. Y lo\n' +
    '  que cambia es a mejor: una proyección rota ya no tumba la espera de una mesa quieta, y unas\n' +
    '  opciones lentas ya no apartan al arcade ni le quitan el tic por sondear.',
);
process.exit(0);
