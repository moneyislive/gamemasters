/**
 * EL PRESUPUESTO, EXIGIDO Y NO SÓLO MEDIDO.
 *
 *   npm run verify:presupuesto
 *
 * ═══ QUÉ COMPRUEBA, Y POR QUÉ ES LA COMPROBACIÓN DE SEGURIDAD DEL ENCHUFE ═══
 *
 * Con `ARCADES_EXTERNOS` hay código ajeno corriendo en el mismo proceso, con los
 * mismos permisos y en el mismo hilo que todas las veladas en curso. Un reductor
 * de fuera mal escrito no estropea su partida: se lleva por delante el servidor
 * entero. Esto comprueba que no puede hacerlo dos veces.
 *
 * Se monta un arcade DELIBERADAMENTE CARO —uno que quema el hilo y otro que
 * fabrica un estado enorme— y se juega de verdad contra la capa de mesa, con
 * `abrir` y `mover` como los usa la ruta. Lo que se afirma:
 *
 *   1. El movimiento que se pasa se RECHAZA: la mesa se queda con el estado de
 *      antes, la revisión no sube y no se guarda nada.
 *   2. El arcade queda APARTADO, y a partir de ahí sus movimientos se rechazan
 *      ANTES de llamar al reductor. Eso se comprueba CONTANDO las veces que el
 *      reductor entra: si el contador no sube, es que no se le llamó.
 *   3. Los DEMÁS arcades siguen jugando. Una cuarentena por arcade que apartara a
 *      todos sería una forma elegante de la misma caída.
 *   4. Y un arcade que se porta bien NO entra en cuarentena por muchos
 *      movimientos que haga, que es la vacuna: sin ella, un tope de cero pasaría
 *      estas comprobaciones en verde y rompería el catálogo entero.
 *
 * ═══ LO QUE ESTO NO DEMUESTRA, DICHO ANTES DE QUE ALGUIEN SE FÍE ═══
 *
 * Que el PRIMER movimiento pasado de rosca no bloquee el bucle de eventos. No lo
 * demuestra porque no es cierto y no puede serlo: Node atiende con un solo hilo y
 * no hay forma de abortar código síncrono desde ese mismo hilo. Un reductor con un
 * bucle infinito cuelga el proceso, y la única defensa real contra eso es sacarlo
 * a otro proceso — que es otro proyecto. La cabecera de `presupuesto.ts` lo dice
 * con todas las letras y aquí se repite para que un verde de este fichero no se
 * lea como más de lo que es.
 *
 * ═══ POR QUÉ IMPORTA `mesas.ts` A MANO Y DESPUÉS DE TOCAR EL ENTORNO ═══
 *
 * Porque `MESAS_DIR` se lee AL CARGARSE el módulo, y sin eso este comprobador
 * escribiría mesas de mentira en la carpeta de datos del portátil. Con `import`
 * normal no se puede: las importaciones se izan por encima de cualquier línea que
 * escribiera la variable. Es exactamente el mismo motivo por el que
 * `verify:canvaskit` mira el fichero generado y no el fuente.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  instalarArcade,
  olvidarArcade,
  rechazar,
} from '../../shared/arcade';
import type { ContextoMovimiento, ManifiestoDeArcade, Movimiento } from '../../shared/arcade';
import {
  ArcadeFueraDePresupuesto,
  conPresupuesto,
  enCuarentena,
  losApartados,
  medirMovimiento,
  olvidarLoMedido,
  TOPE_BYTES,
  TOPE_MS,
} from '../src/arcade/presupuesto';
import { sinComentarios } from './sin-comentarios';

const RAIZ = path.resolve(import.meta.dirname ?? __dirname, '..', '..');

/* La carpeta de mesas, ANTES de cargar `mesas.ts`. Ver la cabecera. */
const CARPETA = fs.mkdtempSync(path.join(os.tmpdir(), 'presupuesto-'));
process.env.MESAS_DIR = CARPETA;

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  const cola = detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 300)}`;
  fallos.push(`${que}${cola}`);
}
function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

/** Se espera una excepción de una clase concreta, y se dice cuál salió si no. */
async function salta(que: string, hacerlo: () => Promise<unknown>, clase: string): Promise<unknown> {
  try {
    await hacerlo();
    comprobar(que, false, 'no lanzó nada');
    return undefined;
  } catch (error) {
    const nombre = error instanceof Error ? error.name : typeof error;
    comprobar(que, nombre === clase, { esperado: clase, salio: nombre });
    return error;
  }
}

// ---------------------------------------------------------------------------
// LOS TRES ARCADES DE PRUEBA
// ---------------------------------------------------------------------------

/**
 * El molde. Sede de SERVIDOR porque lo que se prueba es la mesa, y un solo
 * asiento para no tener que registrar proyección: `exigeProyeccion` la pide a las
 * mesas de más de uno, y aquí no hay nada que tapar ni nadie a quien tapárselo.
 */
function molde(id: string, nombre: string): ManifiestoDeArcade {
  return {
    id,
    nombre,
    gancho: 'Una prueba de presupuesto, y nada más.',
    icono: 'mando',
    jugadores: { minimo: 1, maximo: 1 },
    sede: 'servidor',
    tickHz: 0,
    mueble: 'formulario',
    secretos: false,
    marcador: { tipo: 'ninguno' },
    procedencia: { tipo: 'creacion-propia' },
  };
}

/** Cuántas veces ha entrado cada reductor. Es lo que demuestra el punto 2. */
const entradas = { lento: 0, gordo: 0, bueno: 0, ticGordo: 0 };

interface EstadoDePrueba {
  vueltas: number;
  /** El relleno del que se pasa de tamaño. Vacío mientras se porta bien. */
  lastre: string;
}

const RECIEN: EstadoDePrueba = { vueltas: 0, lastre: '' };

/**
 * EL LENTO. Quema el hilo a propósito cuando se le pide, y no con `setTimeout`.
 *
 * Un `await` no vale para nada aquí: lo que el presupuesto protege es el TIEMPO
 * SÍNCRONO, o sea el rato en el que ninguna otra petición del proceso avanza. Una
 * espera asíncrona no bloquea a nadie y pasaría el tope sin despeinarse, con lo
 * que este comprobador estaría midiendo otra cosa.
 *
 * Se quema mirando el reloj y no dando vueltas a un número, porque el número de
 * vueltas que hacen falta para gastar 50 ms depende de la máquina y del humor del
 * JIT — y un comprobador que a veces tarda 30 ms y a veces 80 es un comprobador
 * que a veces se pone rojo sin que pase nada.
 */
function avanzarElLento(estado: EstadoDePrueba | undefined, movimiento: Movimiento): EstadoDePrueba {
  entradas.lento++;
  const actual = estado ?? RECIEN;
  if (movimiento.tipo !== 'quemar') return { ...actual, vueltas: actual.vueltas + 1 };
  const hasta = Date.now() + TOPE_MS * 3;
  while (Date.now() < hasta) {
    /* A propósito: esto es lo que un reductor jamás debe hacer. */
  }
  return { ...actual, vueltas: actual.vueltas + 1 };
}

/** EL GORDO. Fabrica un estado más grande de lo que cabe, sin tardar nada. */
function avanzarElGordo(estado: EstadoDePrueba | undefined, movimiento: Movimiento): EstadoDePrueba {
  entradas.gordo++;
  const actual = estado ?? RECIEN;
  if (movimiento.tipo !== 'engordar') return { ...actual, vueltas: actual.vueltas + 1 };
  return { vueltas: actual.vueltas + 1, lastre: 'x'.repeat(TOPE_BYTES + 1000) };
}

/**
 * EL BUENO. Se porta como se porta cualquiera de los cuatro juegos de la casa, y
 * además ejerce el «sólo si» con motivo, para comprobar que un rechazo del JUEGO
 * no tiene nada que ver con un rechazo del PRESUPUESTO.
 */
function avanzarElBueno(
  estado: EstadoDePrueba | undefined,
  movimiento: Movimiento,
): EstadoDePrueba | ReturnType<typeof rechazar<EstadoDePrueba>> {
  entradas.bueno++;
  const actual = estado ?? RECIEN;
  if (movimiento.tipo === 'nada') return rechazar(actual, 'Eso no se puede hacer ahora mismo.');
  return { ...actual, vueltas: actual.vueltas + 1 };
}

/**
 * EL QUE ENGORDA EN EL TIC. Es el arcade que faltaba, y falta un fichero entero.
 *
 * ═══ POR QUÉ ESTE ARCADE NO EXISTÍA, Y QUÉ SE ESCAPABA POR AHÍ ═══
 *
 * Los tres de arriba entran por el camino del MOVIMIENTO, que es el que un
 * dispositivo empuja. El otro camino —el TIC— se mete solo cuando vence un plazo,
 * y este fichero decía, en la sección que lee `mesas.ts`, que probarlo de verdad
 * «convertiría este comprobador en uno que tarda segundos de pared, que es como
 * acaban desactivados», así que se conformaba con leer el fichero y comprobar que
 * la llamada estuviera escrita.
 *
 * Por ese hueco se escapó un fallo real: el tic pasaba por la puerta que exige el
 * TIEMPO y por una báscula que sólo ANOTABA el TAMAÑO —y que además muestreaba uno
 * de cada sesenta—. O sea que un arcade movido por plazo podía engordar su estado
 * en cada tic sin entrar jamás en cuarentena, y esos tics se guardaban y viajaban.
 * Leer el fichero no lo veía porque la llamada al presupuesto SÍ estaba: la del
 * tiempo.
 *
 * El precio de cazarlo son dos segundos de reloj de pared, con `plazoSegundos: 1`.
 * Dos segundos de una batería de cuatro minutos es lo que vale un tope que no
 * existía.
 */
function avanzarElTicGordo(
  estado: EstadoDePrueba | undefined,
  movimiento: Movimiento,
): EstadoDePrueba {
  entradas.ticGordo++;
  const actual = estado ?? RECIEN;
  /* En el TIC —y sólo en el tic— fabrica un estado que no cabe. */
  if (movimiento.tipo === 'arcade:tic') {
    return { vueltas: actual.vueltas + 1, lastre: 'x'.repeat(TOPE_BYTES + 1000) };
  }
  return { ...actual, vueltas: actual.vueltas + 1 };
}

instalarArcade<EstadoDePrueba | undefined>({
  manifiesto: molde('el-lento', 'El Lento'),
  avanzar: avanzarElLento,
});
/**
 * EL TIC TOZUDO. Rechaza el tic CON MOTIVO, y devuelve un objeto distinto.
 *
 * ═══ POR QUÉ HACE FALTA UN ARCADE ENTERO PARA ESTO ═══
 *
 * Porque ninguno de los cinco juegos rechaza su tic —todos lo aceptan o devuelven
 * el mismo estado— y por tanto el camino no lo recorría nadie. Y es el mismo fallo
 * que el del movimiento, en el otro camino: `avanzarElReloj` tiraba el rechazo
 * entero, así que un juego que hace `estado ?? RECIEN` y rechaza el tic devolvía un
 * objeto que no es idénticamente el que recibió, `ponerAlDiaElPlazo` lo tomaba por
 * un cambio, y ese tic RECHAZADO subía la revisión, entraba en el diario y
 * despertaba a los demás asientos.
 *
 * Rechazar un tic es raro y perfectamente legítimo: «esta partida ya no corre».
 */
function avanzarElTicTozudo(
  estado: EstadoDePrueba | undefined,
  movimiento: Movimiento,
): EstadoDePrueba | ReturnType<typeof rechazar<EstadoDePrueba>> {
  const actual = estado ?? RECIEN;
  if (movimiento.tipo === 'arcade:tic') return rechazar(actual, 'Aquí el reloj no corre.');
  return { ...actual, vueltas: actual.vueltas + 1 };
}

instalarArcade<EstadoDePrueba | undefined>({
  manifiesto: molde('el-tic-gordo', 'El Tic Gordo'),
  avanzar: avanzarElTicGordo,
});
instalarArcade<EstadoDePrueba | undefined>({
  manifiesto: molde('el-tic-tozudo', 'El Tic Tozudo'),
  avanzar: avanzarElTicTozudo,
});
instalarArcade<EstadoDePrueba | undefined>({
  manifiesto: molde('el-gordo', 'El Gordo'),
  avanzar: avanzarElGordo,
});
instalarArcade<EstadoDePrueba | undefined>({
  manifiesto: molde('el-bueno', 'El Bueno'),
  avanzar: avanzarElBueno,
});

/* Y ahora sí, con `MESAS_DIR` puesto y los arcades instalados. */
const mesas = await import('../src/arcade/mesas');

const CTX: ContextoMovimiento = { quien: null, azar: 1, tic: 0, asientos: [] };

// ---------------------------------------------------------------------------
paso('Los topes están puestos, y son números y no `null`');
// ---------------------------------------------------------------------------

comprobar('hay un tope de tiempo síncrono', Number.isFinite(TOPE_MS) && TOPE_MS > 0, TOPE_MS);
comprobar('y un tope de tamaño de estado', Number.isFinite(TOPE_BYTES) && TOPE_BYTES > 0, TOPE_BYTES);
comprobar('y no hay nadie apartado al empezar', losApartados().length === 0, losApartados());

// ---------------------------------------------------------------------------
paso('Un arcade que se porta bien juega y NO entra en cuarentena');
// ---------------------------------------------------------------------------

{
  const { mesa, silla } = await mesas.abrir({ arcade: 'el-bueno', nombre: 'Ana', plazoSegundos: 0 });
  let vista = await mesas.mirar(mesa.codigo, silla.llave);
  for (let i = 0; i < 40; i++) {
    vista = await mesas.mover(mesa.codigo, silla.llave, vista.rev, { tipo: 'seguir' });
  }
  /* La mesa nace en la revisión 0 y cada movimiento aceptado suma uno. */
  comprobar('cuarenta movimientos entran', vista.rev === 40, vista.rev);
  comprobar('y el arcade sigue sin estar apartado', enCuarentena('el-bueno') === null);

  /*
   * Y UN RECHAZO DEL JUEGO NO ES UN RECHAZO DEL PRESUPUESTO. Son dos cosas que
   * en la pantalla se parecen —«no ha pasado nada»— y en el servidor no tienen
   * nada que ver: una es una regla del juego y la otra es una defensa de la
   * máquina. Si se confundieran, un juego que ejerza el «sólo si» acabaría
   * apartado por jugar bien.
   */
  const antes = vista.rev;
  const tras = await mesas.mover(mesa.codigo, silla.llave, vista.rev, { tipo: 'nada' });
  comprobar('un movimiento que el juego rechaza no sube la revisión', tras.rev === antes, tras.rev);
  comprobar(
    'y llega el motivo que escribió el juego',
    tras.motivo === 'Eso no se puede hacer ahora mismo.',
    tras.motivo,
  );
  comprobar('y no aparta a nadie', enCuarentena('el-bueno') === null);
}

// ---------------------------------------------------------------------------
paso('El que quema el hilo: se rechaza, la mesa no se mueve y queda apartado');
// ---------------------------------------------------------------------------

let codigoDelLento = '';
let llaveDelLento = '';
{
  const { mesa, silla } = await mesas.abrir({ arcade: 'el-lento', nombre: 'Bruno', plazoSegundos: 0 });
  codigoDelLento = mesa.codigo;
  llaveDelLento = silla.llave;

  const sano = await mesas.mover(mesa.codigo, silla.llave, 0, { tipo: 'seguir' });
  comprobar('un movimiento normal suyo entra', sano.rev === 1, sano.rev);

  const antesDeQuemar = entradas.lento;
  const error = await salta(
    'el movimiento que se pasa del tope LANZA',
    () => mesas.mover(mesa.codigo, silla.llave, sano.rev, { tipo: 'quemar' }),
    'ArcadeFueraDePresupuesto',
  );
  comprobar(
    'y dice qué arcade y por qué, con el número medido dentro',
    error instanceof ArcadeFueraDePresupuesto &&
      error.arcade === 'el-lento' &&
      error.porque.includes('quemar'),
    error instanceof ArcadeFueraDePresupuesto ? error.porque : String(error),
  );
  comprobar('el reductor SÍ llegó a entrar esa vez', entradas.lento === antesDeQuemar + 1);

  /*
   * ═══ LA COMPROBACIÓN QUE DE VERDAD LO DICE ═══
   *
   * La mesa se lee otra vez y tiene que estar EXACTAMENTE como estaba. Si el
   * estado del movimiento caro se hubiera guardado, aquí saldría `vueltas: 2` y la
   * revisión en 2 — o sea, un arcade podría pasarse del presupuesto y quedarse con
   * el resultado, que es peor que no tener tope.
   */
  const despues = await mesas.mirar(mesa.codigo, silla.llave);
  comprobar('la revisión no ha subido', despues.rev === sano.rev, despues.rev);
  comprobar(
    'y el estado es el de antes del movimiento caro',
    (despues.vista as EstadoDePrueba).vueltas === 1,
    despues.vista,
  );
  comprobar('el arcade ha quedado apartado', enCuarentena('el-lento') !== null, losApartados());
}

// ---------------------------------------------------------------------------
paso('Y a partir de ahí se rechaza ANTES de llamar al reductor');
// ---------------------------------------------------------------------------

{
  /*
   * ESTO ES EL CORAZÓN DEL FICHERO Y SE MIDE CONTANDO ENTRADAS.
   *
   * Comprobar que el segundo movimiento también lanza no demostraría nada: podría
   * estar lanzando DESPUÉS de haber quemado otros ciento cincuenta milisegundos.
   * Lo que hay que demostrar es que el reductor no entra, y para eso hace falta
   * mirar el contador desde fuera.
   */
  const antes = entradas.lento;
  await salta(
    'el siguiente movimiento suyo también lanza',
    () => mesas.mover(codigoDelLento, llaveDelLento, 1, { tipo: 'seguir' }),
    'ArcadeFueraDePresupuesto',
  );
  comprobar(
    'y el reductor NO ha llegado a entrar: se rechazó antes de tocar el hilo',
    entradas.lento === antes,
    { antes, ahora: entradas.lento },
  );

  /* Ni siquiera uno inofensivo: la cuarentena es del arcade y no del movimiento. */
  const antesOtraVez = entradas.lento;
  await salta(
    'ni uno que no tenía nada de malo',
    () => mesas.mover(codigoDelLento, llaveDelLento, 1, { tipo: 'lo-que-sea' }),
    'ArcadeFueraDePresupuesto',
  );
  comprobar('tampoco entró', entradas.lento === antesOtraVez);
}

// ---------------------------------------------------------------------------
paso('El que fabrica un estado enorme: mismo trato, por el otro tope');
// ---------------------------------------------------------------------------

{
  const { mesa, silla } = await mesas.abrir({ arcade: 'el-gordo', nombre: 'Carla', plazoSegundos: 0 });
  const sano = await mesas.mover(mesa.codigo, silla.llave, 0, { tipo: 'seguir' });
  comprobar('un movimiento normal suyo entra', sano.rev === 1, sano.rev);

  const error = await salta(
    'el movimiento que engorda el estado LANZA',
    () => mesas.mover(mesa.codigo, silla.llave, sano.rev, { tipo: 'engordar' }),
    'ArcadeFueraDePresupuesto',
  );
  comprobar(
    'y el motivo habla del tamaño y no del tiempo',
    error instanceof ArcadeFueraDePresupuesto && error.porque.includes('canónica'),
    error instanceof ArcadeFueraDePresupuesto ? error.porque : String(error),
  );

  const despues = await mesas.mirar(mesa.codigo, silla.llave);
  comprobar('la revisión no ha subido', despues.rev === sano.rev, despues.rev);
  comprobar(
    'y el estado gordo NO se ha quedado en la mesa',
    (despues.vista as EstadoDePrueba).lastre === '',
    { largo: (despues.vista as EstadoDePrueba).lastre.length },
  );
  comprobar('el arcade ha quedado apartado', enCuarentena('el-gordo') !== null);
}

// ---------------------------------------------------------------------------
paso('Y los demás siguen jugando: la cuarentena es de un arcade y de nadie más');
// ---------------------------------------------------------------------------

{
  const { mesa, silla } = await mesas.abrir({ arcade: 'el-bueno', nombre: 'Diego', plazoSegundos: 0 });
  const vista = await mesas.mover(mesa.codigo, silla.llave, 0, { tipo: 'seguir' });
  comprobar('el que se porta bien abre mesa y mueve', vista.rev === 1, vista.rev);
  comprobar('sigue sin estar apartado', enCuarentena('el-bueno') === null);
  comprobar(
    'y los apartados son exactamente los dos que se pasaron',
    losApartados()
      .map((a) => a.arcade)
      .sort()
      .join() === 'el-gordo,el-lento',
    losApartados(),
  );
}

// ---------------------------------------------------------------------------
paso('Un rechazo del juego en una mesa RECIÉN ABIERTA tampoco cuenta');
// ---------------------------------------------------------------------------

{
  /*
   * ═══ EL CASO QUE EL CONTRATO BENDICE Y LA MESA CASTIGABA ═══
   *
   * La cabecera de `Rechazo` cita como «legítimo y frecuente» a un reductor que
   * construye su estado inicial en el primer movimiento —`estado ?? RECIEN`— y
   * rechaza ese mismo movimiento: devuelve algo que NO es idénticamente lo que
   * recibió, porque lo que recibió era `undefined`. Es la razón por la que
   * `aplicar()` no exige la identidad.
   *
   * `mesas.ts` decidía si «pasó algo» comparando estados por identidad, así que ese
   * rechazo se le colaba como un cambio: la revisión subía de 0 a 1, el diario se
   * quedaba con un movimiento rechazado dentro, y el motivo —la entrega central de
   * la fase 5— se tiraba por el camino que no lo lleva. O sea que el canal era mudo
   * justo en el PRIMER movimiento de todas las mesas de servidor.
   *
   * La otra mitad de arriba —el rechazo sobre una mesa YA repartida— ya se
   * comprobaba, y por eso no lo cazó nadie: allí la identidad se conserva.
   */
  const { mesa, silla } = await mesas.abrir({
    arcade: 'el-bueno',
    nombre: 'Elena',
    plazoSegundos: 0,
  });
  const recien = await mesas.mirar(mesa.codigo, silla.llave);
  comprobar('la mesa nace en la revisión 0 y sin estado', recien.rev === 0 && recien.vista === undefined, {
    rev: recien.rev,
    vista: recien.vista,
  });

  const rechazado = await mesas.mover(mesa.codigo, silla.llave, 0, { tipo: 'nada' });
  comprobar(
    'el PRIMER movimiento, rechazado, NO sube la revisión',
    rechazado.rev === 0,
    rechazado.rev,
  );
  comprobar(
    'y trae el motivo que escribió el juego',
    rechazado.motivo === 'Eso no se puede hacer ahora mismo.',
    rechazado.motivo,
  );
  /*
   * Y LA MESA SIGUE VIRGEN. Sin esto, la comprobación de arriba se podría pasar
   * devolviendo la revisión buena y guardando el estado igualmente: lo que hay que
   * demostrar es que el estado del rechazo se TIRA, no que el número cuadre.
   */
  const despues = await mesas.mirar(mesa.codigo, silla.llave);
  comprobar('la mesa sigue sin estado, como si no hubiera pasado nada', despues.vista === undefined, {
    vista: despues.vista,
  });
}

// ---------------------------------------------------------------------------
paso('El TIC también pesa el estado, y un arcade apartado SIGUE LEYÉNDOSE');
// ---------------------------------------------------------------------------

{
  /*
   * ═══ DOS FALLOS EN LA MISMA MESA, Y LOS DOS DEL CAMINO DEL TIC ═══
   *
   * Esta sección cuesta dos segundos de reloj de pared y es la única que ejercita
   * el tic de verdad. Lo que demuestra:
   *
   *  1. QUE EL TAMAÑO SE EXIGE TAMBIÉN EN EL TIC. Antes el tic pasaba por una
   *     báscula que sólo anotaba, así que un arcade que engordara en cada tic no
   *     entraba nunca en cuarentena por tamaño y sus tics se guardaban.
   *  2. QUE UN ARCADE APARTADO NO SE LLEVA POR DELANTE LA LECTURA. `mirar()` pone
   *     al día el plazo, el plazo entra en el presupuesto, y `exigirPresupuesto`
   *     lanzaba ANTES de tocar el reductor. Como el vencimiento se reprogramaba
   *     DESPUÉS de esa llamada, no se reprogramaba nunca y TODA lectura posterior
   *     volvía a lanzar — para siempre, hasta reiniciar el proceso. Cuatro personas
   *     jugando a un arcade que se pasó una vez se quedaban sin poder ni ver el
   *     tablero. `presupuesto.ts` promete lo contrario con todas las letras: «sus
   *     mesas dejan de aceptar MOVIMIENTOS».
   */
  const { mesa, silla } = await mesas.abrir({
    arcade: 'el-tic-gordo',
    nombre: 'Fede',
    plazoSegundos: 1,
  });
  const sano = await mesas.mover(mesa.codigo, silla.llave, 0, { tipo: 'seguir' });
  comprobar('un movimiento normal suyo entra', sano.rev === 1, sano.rev);
  comprobar('y todavía no está apartado', enCuarentena('el-tic-gordo') === null);

  /*
   * Y DE PASO, EL TIC QUE EL JUEGO RECHAZA. Se abre aquí para que comparta la
   * espera de abajo: dos mesas con el mismo plazo cuestan un solo segundo.
   */
  const tozudo = await mesas.abrir({
    arcade: 'el-tic-tozudo',
    nombre: 'Gema',
    plazoSegundos: 1,
  });
  const tozudoAntes = await mesas.mirar(tozudo.mesa.codigo, tozudo.silla.llave);

  /* Se deja vencer el plazo. Es lo único de este fichero que espera de verdad. */
  await new Promise((suelta) => setTimeout(suelta, 1300));

  /*
   * ═══ UN TIC RECHAZADO NO CUENTA, NI SIQUIERA EN UNA MESA RECIÉN ABIERTA ═══
   *
   * Es el gemelo exacto del caso del movimiento: el reductor hace `estado ?? RECIEN`
   * y rechaza, así que devuelve un objeto que NO es el que recibió. `avanzarElReloj`
   * tiraba el rechazo, `ponerAlDiaElPlazo` comparaba por identidad, y ese tic
   * rechazado subía la revisión y entraba en el diario. Ninguno de los cinco juegos
   * rechaza su tic, así que este camino no lo recorría nadie: de ahí el arcade.
   */
  const tozudoDespues = await mesas.mirar(tozudo.mesa.codigo, tozudo.silla.llave);
  comprobar(
    'un tic que el juego rechaza no sube la revisión',
    tozudoDespues.rev === tozudoAntes.rev,
    { antes: tozudoAntes.rev, ahora: tozudoDespues.rev },
  );
  comprobar(
    'y la mesa se queda sin estado, como si el tic no hubiera pasado',
    tozudoDespues.vista === undefined,
    tozudoDespues.vista,
  );

  const entroElTic = entradas.ticGordo;
  const trasElTic = await mesas.mirar(mesa.codigo, silla.llave);
  comprobar('el tic ha entrado al reductor', entradas.ticGordo > entroElTic, {
    antes: entroElTic,
    ahora: entradas.ticGordo,
  });
  comprobar(
    'y el arcade ha quedado apartado POR TAMAÑO, desde el camino del tic',
    (enCuarentena('el-tic-gordo') ?? '').includes('canónica'),
    enCuarentena('el-tic-gordo'),
  );
  comprobar(
    'el estado gordo del tic NO se ha quedado en la mesa',
    (trasElTic.vista as EstadoDePrueba).lastre === '',
    { largo: (trasElTic.vista as EstadoDePrueba).lastre.length },
  );
  comprobar('y la revisión no ha subido con ese tic', trasElTic.rev === sano.rev, trasElTic.rev);

  /*
   * ═══ Y AHORA LA MITAD QUE MÁS IMPORTA: SE SIGUE PUDIENDO MIRAR ═══
   *
   * Dos lecturas más, y la segunda después de que vuelva a vencer el plazo. Con el
   * fallo puesto, las dos lanzaban `ArcadeFueraDePresupuesto` y la ruta lo traducía
   * a un 503 SIN la mesa dentro, o sea sin tablero y sin explicación.
   */
  const otraVez = await mesas.mirar(mesa.codigo, silla.llave);
  comprobar('la mesa de un arcade apartado se sigue leyendo', otraVez.rev === sano.rev, otraVez.rev);

  await new Promise((suelta) => setTimeout(suelta, 1300));
  const yPasadoElPlazo = await mesas.mirar(mesa.codigo, silla.llave);
  comprobar(
    'y se sigue leyendo también cuando el plazo vuelve a vencer',
    yPasadoElPlazo.rev === sano.rev,
    yPasadoElPlazo.rev,
  );
  /*
   * Y NO HA VUELTO A ENTRAR AL REDUCTOR. Es la misma medida que la del arcade
   * lento, aplicada al camino del tic: la cuarentena no es «vuelve a lanzar», es
   * «no vuelve a entrar en el hilo».
   */
  const antesDeLasLecturas = entradas.ticGordo;
  await mesas.mirar(mesa.codigo, silla.llave);
  comprobar(
    'y en las lecturas de un apartado el reductor NO entra',
    entradas.ticGordo === antesDeLasLecturas,
    { antes: antesDeLasLecturas, ahora: entradas.ticGordo },
  );

  /* Lo que sí sigue apagado, que es lo que la promesa dice: MOVER. */
  await salta(
    'pero mover en su mesa sigue lanzando',
    () => mesas.mover(mesa.codigo, silla.llave, sano.rev, { tipo: 'seguir' }),
    'ArcadeFueraDePresupuesto',
  );
}

// ---------------------------------------------------------------------------
paso('La báscula sin exigencia sigue existiendo, y NO aparta a nadie');
// ---------------------------------------------------------------------------

{
  /*
   * ═══ POR QUÉ ESTO IMPORTA, Y NO ES UNA COMPROBACIÓN DE ADORNO ═══
   *
   * `repeticiones.ts` cronometra la reejecución de una PARTIDA ENTERA en una sola
   * llamada para verificar un récord. Eso son cientos de movimientos y pasarse de
   * cincuenta milisegundos es lo normal. Si esa llamada usara la puerta que exige,
   * el primer récord honrado que llegara pondría su arcade en cuarentena — un
   * falso negativo en el único sitio donde un falso negativo destruye la confianza
   * en la cifra.
   *
   * Así que las dos puertas tienen que seguir siendo dos, y se comprueba que la
   * blanda es blanda de verdad.
   */
  olvidarLoMedido();
  const salida = medirMovimiento('el-tranquilo', 'repeticion', () => {
    const hasta = Date.now() + TOPE_MS * 2;
    while (Date.now() < hasta) {
      /* también a propósito */
    }
    return 'listo';
  });
  comprobar('la báscula devuelve lo que devuelva la función', salida === 'listo');
  comprobar('y no aparta a nadie aunque se pase del tope', enCuarentena('el-tranquilo') === null);

  /* Y la puerta que sí exige, sobre el mismo caso, sí aparta. La vacuna. */
  await salta(
    'la puerta que exige, con lo mismo, sí lanza',
    async () =>
      conPresupuesto('el-tranquilo', 'movimiento', () => {
        const hasta = Date.now() + TOPE_MS * 2;
        while (Date.now() < hasta) {
          /* íd. */
        }
        return 'listo';
      }),
    'ArcadeFueraDePresupuesto',
  );
  comprobar('y ahora sí está apartado', enCuarentena('el-tranquilo') !== null);
}

// ---------------------------------------------------------------------------
paso('La mesa usa las dos puertas, y eso se lee en el árbol');
// ---------------------------------------------------------------------------

{
  /*
   * ═══ MEDIDO SOBRE EL FICHERO, POR LA LECCIÓN DE LOS PEAJES ═══
   *
   * Todo lo de arriba pasa por `mesas.mover` o por el tic de una mesa con plazo,
   * así que si alguien quitara una llamada al presupuesto esas comprobaciones se
   * pondrían rojas solas.
   *
   * ═══ Y AQUÍ PONÍA QUE EL TIC NO SE DISPARABA, QUE ERA EL HUECO ═══
   *
   * La versión anterior decía que probar el tic de verdad «convertiría este
   * comprobador en uno que tarda segundos de pared, que es como acaban
   * desactivados», y se conformaba con leer el fichero. Por ese hueco se escapó un
   * fallo entero: la llamada al presupuesto SÍ estaba en el tic —la del TIEMPO— y
   * el TAMAÑO iba por una báscula que sólo anotaba. Leer el fichero no lo veía, y
   * no podía verlo: lo que se leía estaba bien escrito.
   *
   * Ahora el tic se ejercita de verdad, con `plazoSegundos: 1`, y cuesta dos
   * segundos de reloj. Estas tres lecturas se quedan igualmente: son baratas y
   * cazan el borrado de una llamada, que es otra cosa.
   */
  const mesasTs = sinComentarios(
    fs.readFileSync(path.join(RAIZ, 'server', 'src', 'arcade', 'mesas.ts'), 'utf8'),
  );
  comprobar(
    'el camino del movimiento pasa por la puerta que exige',
    /conPresupuesto\(\s*antes\.arcade/.test(mesasTs),
    'sin esto, un arcade caro vuelve a poder bloquear el hilo en cada movimiento',
  );
  comprobar(
    'el camino del TIC también',
    /conPresupuesto\(m\.mesa\.arcade,\s*'arcade:tic'/.test(mesasTs),
    'el tic se mete solo y hasta doce veces seguidas: es el camino que más falta hace cubrir',
  );
  comprobar(
    'y el estado se pesa antes de quedárselo',
    /pesarElEstado\(antes\.arcade/.test(mesasTs),
    'pesarlo después de asignarlo sería medir un estado que ya está dentro de la mesa',
  );
  /*
   * ═══ Y NO QUEDA NINGUNA BÁSCULA DE TAMAÑO QUE NO EXIJA ═══
   *
   * Había una, `medirTamano`, que anotaba sin comprobar el tope y muestreaba uno de
   * cada sesenta. La usaba el camino del tic, y ése era el agujero entero. Está
   * borrada; esta línea existe para que no vuelva por la puerta de atrás, que es
   * como vuelven: alguien quiere una estadística barata y escribe otra.
   */
  comprobar(
    'y no hay ninguna báscula de tamaño que sólo anote',
    !/medirTamano/.test(mesasTs),
    'una báscula que anota sin exigir, en el camino del tic, es un tope que no existe',
  );
  /* La vacuna de las tres de arriba: que la búsqueda sepa acertar. */
  comprobar(
    'y las búsquedas encontrarían la llamada si estuviera',
    /conPresupuesto\(\s*antes\.arcade/.test('const x = conPresupuesto( antes.arcade, t, f);'),
  );
}

// ---------------------------------------------------------------------------

olvidarArcade('el-lento');
olvidarArcade('el-gordo');
olvidarArcade('el-bueno');
olvidarArcade('el-tic-gordo');
olvidarArcade('el-tic-tozudo');
try {
  fs.rmSync(CARPETA, { recursive: true, force: true });
} catch {
  /* en Windows el fichero sigue tomado un instante */
}
void CTX;

console.log('');
if (fallos.length === 0) {
  console.log(
    `✔ ${hechas} comprobaciones. Un reductor que se pasa del tope —de tiempo síncrono o de tamaño\n` +
      '  de estado— se rechaza sin dejar rastro en la mesa, y a partir de ahí no vuelve a entrar en\n' +
      '  el hilo: se le para ANTES de llamarle. Los demás arcades siguen jugando.\n' +
      '\n  Lo que esto NO demuestra, y conviene releerlo en la cabecera: que el PRIMER movimiento\n' +
      '  pasado de rosca no bloquee el bucle. Eso no se puede hacer en un solo hilo.',
  );
  process.exit(0);
}
console.log(`✘ ${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
for (const f of fallos) console.log(`   · ${f}`);
process.exit(1);
