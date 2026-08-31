/**
 * ¿SE PUEDE MENTIR CON UNA PUNTUACIÓN?
 *
 *   npm run verify:marcador
 *
 * ═══ QUÉ AFIRMA ═══
 *
 * Cuatro cosas, y son exactamente las cuatro que el §10 del diseño le pide a este
 * comprobador:
 *
 *  1. UNA REPETICIÓN FABRICADA A MANO SE RECHAZA. Se inventan entradas y se
 *     declara una cifra alta; el servidor reejecuta y sale otra.
 *  2. UNA REAL SE ACEPTA AL REEJECUTARLA. La juega un robot de verdad, con la
 *     semilla que repartió el servidor, y la cifra que sale es la que se declaró.
 *  3. UN RÉCORD ENVIADO COMO CIFRA SUELTA SE RECHAZA SIEMPRE. No hay ninguna ruta
 *     que acepte un número, y se comprueba en proceso y por HTTP.
 *  4. LA DURACIÓN DECLARADA SE CONTRASTA CON EL TIEMPO DE PARED. Una partida que
 *     dice durar veinticuatro segundos y se sube medio segundo después del aviso
 *     de inicio no se ha jugado.
 *
 * ═══ POR QUÉ EN PROCESO **Y** CON EL SERVIDOR LEVANTADO ═══
 *
 * Porque son dos preguntas distintas y esta casa ya tiene apuntado lo que cuesta
 * confundirlas —«verde en proceso, roto al levantar el servidor»—:
 *
 *   · EN PROCESO se comprueban las REGLAS: qué se acepta, qué se rechaza y por qué
 *     motivo exacto. Ahí se puede mirar el veredicto entero, que por la red llega
 *     recortado a un código y un texto.
 *   · LEVANTANDO EL SERVIDOR se comprueba lo que no se ve de otra forma: que las
 *     rutas están montadas, que van DELANTE del guardián del taller —o sea que se
 *     puede jugar sin la contraseña de la casa— y, sobre todo, QUE NO EXISTE
 *     NINGUNA RUTA QUE ACEPTE UNA CIFRA. Eso último es una afirmación sobre la
 *     superficie de la API y solo se puede comprobar llamando a la API.
 *
 * ═══ LA PARTIDA DE PRUEBA ES CORTA, Y NO ES UN ATAJO ═══
 *
 * El robot que juega aquí es el MISMO que juega `verify:determinismo`
 * —`guion-determinismo.ts`— y se le pide que pare a los trescientos cincuenta
 * tics, que son cinco segundos y pico de juego.
 *
 * La razón es la comprobación número 4: si la partida durase medio minuto, subirla
 * al instante la haría caer por «más rápida que el reloj», que es justo lo que se
 * quiere que ocurra con las falsas. Una partida de cinco segundos cabe dentro de
 * la holgura y se puede subir en el acto, y sigue siendo una partida DE VERDAD:
 * jugada con la semilla del servidor, tic a tic, y reejecutable.
 *
 * Fabricar aquí una repetición «buena» a mano habría sido probar el comprobador
 * contra su propia idea de lo que es una partida.
 *
 * ═══ PERO LA PARTIDA CORTA NO VALE PARA COMPROBAR LA REEJECUCIÓN, Y ESO COSTÓ ═══
 *
 * Una partida de trescientos cincuenta tics vale tres o cuatro esquivadas, y una
 * partida de tres puntos casi no tiene puntos que perder. Con la expansión
 * desfasada un paso que esta fase llegó a tener, el estado reejecutado salía
 * distinto en 145 semillas de cada 200 y la CIFRA solo cambiaba en 1 de cada 200:
 * o sea que este fichero pasaba en verde por encima del fallo y, de vez en cuando,
 * daba un rojo que se leía como «el robot murió antes de tiempo».
 *
 * Por eso hay ADEMÁS una partida completa, que no se sube —el veredicto del reloj
 * lo impide, y con razón— sino que se reejecuta con la misma función que usa
 * `registrarRecord` y se compara huella contra huella. La corta comprueba el
 * camino; la larga comprueba la aritmética.
 */
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import '../../shared/arcade/juegos';
import { EL_ARCADE, FRENTE, RONDA } from '../../shared/arcade/juegos';
import { arcadesConCifraSinPuntuacion, puntuacionDe } from '../../shared/arcade/juegos/puntuaciones';
import { instalarArcade, manifiestoDeArcade, olvidarArcade } from '../../shared/arcade';
import {
  anunciarInicio,
  olvidarLosMarcadores,
  recordsDe,
  registrarRecord,
  veredictoDelReloj,
} from '../src/arcade/marcadores';
import type { Veredicto } from '../src/arcade/marcadores';
import { leerRepeticion, reejecutar, TOPE_DE_ENTRADAS } from '../src/arcade/repeticiones';
import { jugarGrabando, TOPE_DE_PASOS } from './guion-determinismo';
import type { EntradaDelRobot } from './guion-determinismo';

const REPO = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const TSX = path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SERVIDOR = path.join(REPO, 'server', 'src', 'index.ts');

/**
 * Tics de la partida de prueba. Ver la cabecera: corta a propósito, y real.
 *
 * Trescientos cincuenta son cinco segundos y pico de juego, que caben dentro de la
 * holgura del reloj de pared y dan de sobra para que el robot esquive unas cuantas
 * — o sea, para que la cifra que se verifica no sea cero. Con una cifra de cero,
 * media docena de estas comprobaciones pasarían por casualidad: cualquier
 * repetición inventada también da cero.
 */
const TICS_DE_PRUEBA = 350;

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  const cola =
    detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 600)}`;
  fallos.push(`${que}${cola}`);
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

/** Qué motivo trae un veredicto de rechazo, o `null` si aceptó. */
function motivoDe(v: Veredicto): string | null {
  return v.acepta ? null : `${v.motivo}${v.detalle === null ? '' : `/${v.detalle}`}`;
}

/**
 * Juega una partida DE VERDAD con la semilla que reparta el servidor.
 *
 * Devuelve todo lo que hace falta para subirla, y también la cifra que salió de
 * jugarla, que es contra lo que se contrasta la que el servidor calcula al
 * reejecutar.
 */
interface PartidaJugada {
  partida: string;
  semilla: number;
  entradas: EntradaDelRobot[];
  tics: number;
  cifra: number;
}

function partidaDeVerdad(tics: number): PartidaJugada {
  const aviso = anunciarInicio(EL_ARCADE);
  const jugada = jugarGrabando(aviso.semilla, tics);
  return {
    partida: aviso.partida,
    semilla: aviso.semilla,
    entradas: jugada.entradas,
    tics: jugada.jugada.tics,
    cifra: jugada.jugada.esquivadas,
  };
}

/**
 * Una partida que dura EXACTAMENTE esos tics: el robot sobrevivió el trozo entero.
 *
 * ═══ POR QUÉ HAY QUE BUSCARLA Y NO VALE LA PRIMERA ═══
 *
 * `jugarGrabando` para cuando el robot muere, así que pedirle trescientos
 * cincuenta tics devuelve trescientos cincuenta... o los trescientos cuarenta y
 * uno que aguantó con la semilla que le tocó. Y la semilla la reparte el servidor,
 * o sea que no se elige.
 *
 * La primera versión de esto daba por hecho lo primero y se puso roja en la
 * segunda ejecución de la batería, con una semilla desafortunada. Un comprobador
 * que falla un día de cada diez es peor que no tenerlo: enseña a volver a correr
 * la batería en vez de a leerla, que es exactamente lo contrario de lo que una
 * batería sirve para enseñar.
 */
function partidaQueDura(tics: number): PartidaJugada {
  let mejor = partidaDeVerdad(tics);
  for (let intento = 0; intento < 25 && mejor.tics < tics; intento++) {
    const otra = partidaDeVerdad(tics);
    if (otra.tics > mejor.tics) mejor = otra;
  }
  return mejor;
}

console.log('\nEl marcador: qué se cree y qué no\n');

olvidarLosMarcadores();

// ---------------------------------------------------------------------------
// PRIMERA MITAD · EN PROCESO, CONTRA LAS REGLAS
// ---------------------------------------------------------------------------

paso('La tabla de puntuaciones conoce a todo el que publica una cifra');
{
  /*
   * El motor no puede leer la cifra de un estado opaco, así que hace falta una
   * función por juego. `instalarArcade` no tiene hueco para ella —es la grieta que
   * `shared/arcade/juegos/puntuaciones.ts` documenta— y mientras no lo tenga, la
   * única defensa contra que esa tabla se quede vieja es esta línea.
   */
  const sinLeer = arcadesConCifraSinPuntuacion();
  comprobar(
    'ningún arcade instalado publica una cifra que nadie sepa leer',
    sinLeer.length === 0,
    sinLeer,
  );
  comprobar(
    'y El Arcade sí publica una',
    manifiestoDeArcade(EL_ARCADE).marcador.tipo === 'cifra',
    manifiestoDeArcade(EL_ARCADE).marcador,
  );
}

paso('Una repetición REAL se acepta, y la cifra sale de reejecutarla');
let buena = partidaQueDura(TICS_DE_PRUEBA);
{
  comprobar(
    'la partida de prueba dura los tics pedidos, o sea que el robot sobrevivió el trozo entero',
    buena.tics === TICS_DE_PRUEBA,
    `la mejor de veinticinco intentos duró ${buena.tics}`,
  );
  comprobar('y el robot ha hecho algo: hay entradas grabadas', buena.entradas.length > 3, buena.entradas.length);

  const v = registrarRecord({
    arcade: EL_ARCADE,
    partida: buena.partida,
    tics: buena.tics,
    entradas: buena.entradas,
    cifra: buena.cifra,
  });
  comprobar('una repetición de verdad se acepta', v.acepta, motivoDe(v) ?? v);
  if (v.acepta) {
    comprobar('y la cifra guardada es la que salió al reejecutar', v.record.cifra === buena.cifra, {
      guardada: v.record.cifra,
      jugada: buena.cifra,
    });
    comprobar('y queda en la tabla', recordsDe(EL_ARCADE).length === 1, recordsDe(EL_ARCADE).length);
    comprobar(
      'y la duración declarada y el tiempo de pared se han medido los dos',
      v.declaradoMs > 0 && v.paredMs >= 0,
      { declaradoMs: v.declaradoMs, paredMs: v.paredMs },
    );
  }
}

paso('Y una partida COMPLETA reejecuta al mismo estado y a la misma cifra');
{
  /*
   * ═══ POR QUÉ HACE FALTA UNA PARTIDA ENTERA, Y POR QUÉ NO PASA POR `registrarRecord` ═══
   *
   * La partida de arriba dura trescientos cincuenta tics y vale tres o cuatro
   * esquivadas. Eso basta para el camino end-to-end —aviso, reloj de pared,
   * veredicto— y NO basta para lo que de verdad se está comprando: que reejecutar
   * una repetición reproduzca la partida que hubo.
   *
   * Una partida de tres puntos casi no tiene puntos que perder. Con la expansión
   * desfasada un paso que tuvo esta fase, el estado reejecutado de una partida de
   * trescientos cincuenta tics ya salía distinto en 145 semillas de cada 200, pero
   * la CIFRA solo se movía en 1 de cada 200 — o sea que este comprobador estaba a
   * la vez ciego al fallo y medio por ciento intermitente por su culpa, y ese rojo
   * de vez en cuando se leía como «el robot murió antes de tiempo».
   *
   * Con una partida completa —entre veinte y treinta segundos de juego— el desfase
   * se ve siempre. Lo que no se puede es SUBIRLA: el veredicto del reloj exige que
   * haya pasado la mitad del tiempo declarado, y esperar medio minuto dentro de la
   * batería es la forma más rápida de que alguien quite el comprobador. Así que se
   * llama a `reejecutar` —la misma función que usa `registrarRecord`, no una copia—
   * y se compara con lo que salió de jugarla.
   */
  /*
   * ═══ Y SON OCHO PARTIDAS Y NO UNA, QUE ES LA PARTE QUE HAY QUE RAZONAR ═══
   *
   * La semilla la reparte el servidor, así que aquí no se elige: cada ejecución
   * juega partidas distintas. Y un desfase de un paso NO cambia el estado final de
   * todas las partidas — cambió 108 de 200 cuando existió, o sea que una sola
   * partida lo delataría poco más de la mitad de las veces.
   *
   * Un comprobador que caza el fallo a cara o cruz es exactamente el que enseña a
   * volver a correr la batería en vez de a leerla. Con ocho partidas seguidas, la
   * probabilidad de que ninguna lo delate baja al orden de una entre veinte mil, y
   * ocho partidas del robot cuestan unas decenas de milisegundos.
   *
   * Quien quiera la versión determinista la tiene al lado: el tercer escalón de
   * `verify:determinismo` hace lo mismo con cuatro semillas ESCRITAS. Aquí se
   * juega con las que reparte el servidor a propósito, porque lo que este fichero
   * comprueba es el camino del marcador y no el reductor.
   */
  const CUANTAS = 8;
  let tics = 0;
  let esquivadas = 0;
  for (let i = 0; i < CUANTAS; i++) {
    const aviso = anunciarInicio(EL_ARCADE);
    const completa = jugarGrabando(aviso.semilla, TOPE_DE_PASOS);
    tics += completa.jugada.tics;
    esquivadas += completa.jugada.esquivadas;

    const salida = reejecutar(
      leerRepeticion({
        arcade: EL_ARCADE,
        partida: aviso.partida,
        tics: completa.jugada.tics,
        entradas: completa.entradas,
        cifra: completa.jugada.esquivadas,
      }),
      aviso.semilla,
    );
    comprobar(
      `la partida ${i + 1} de ${CUANTAS} reejecuta al MISMO estado con el que se acabó de jugar`,
      salida.huella === completa.jugada.huella,
      {
        tics: completa.jugada.tics,
        jugada: completa.jugada.huella.slice(0, 200),
        reejecutada: salida.huella.slice(0, 200),
      },
    );
    comprobar(
      `y la cifra de la partida ${i + 1} sale de reejecutar, no de creérsela`,
      puntuacionDe(EL_ARCADE, salida.estado) === completa.jugada.esquivadas,
      { reejecutada: puntuacionDe(EL_ARCADE, salida.estado), jugada: completa.jugada.esquivadas },
    );
  }
  console.log(
    `  ${CUANTAS} partidas completas · ${tics} tics en total · ${esquivadas} esquivadas en total`,
  );
  comprobar(
    'las ocho partidas son largas de verdad, o sea que hay algo que reejecutar',
    tics > TICS_DE_PRUEBA * CUANTAS,
    `${tics} tics entre las ${CUANTAS}`,
  );
  comprobar(
    'y dan bastantes puntos como para que una divergencia se note también en la cifra',
    esquivadas >= CUANTAS * 3,
    esquivadas,
  );
}

paso('El aviso de inicio es de UN SOLO USO');
{
  /*
   * La misma repetición buena, otra vez. Sin esto, quien tuviera un aviso válido
   * podría subir repeticiones en bucle hasta dar con una que cuadre — o
   * simplemente hacer trabajar al servidor gratis, que es lo mismo con menos
   * imaginación.
   */
  const v = registrarRecord({
    arcade: EL_ARCADE,
    partida: buena.partida,
    tics: buena.tics,
    entradas: buena.entradas,
    cifra: buena.cifra,
  });
  comprobar('la misma partida no se puede subir dos veces', motivoDe(v) === 'sin-aviso-de-inicio', motivoDe(v));
}

paso('Una repetición FABRICADA a mano se rechaza');
{
  const aviso = anunciarInicio(EL_ARCADE);
  const v = registrarRecord({
    arcade: EL_ARCADE,
    partida: aviso.partida,
    tics: 120,
    /* Cuatro movimientos inventados y una cifra alta. Es lo que haría cualquiera. */
    entradas: [
      { tic: 0, tipo: 'empezar' },
      { tic: 10, tipo: 'rumbo', carga: 1 },
      { tic: 60, tipo: 'rumbo', carga: -1 },
      { tic: 110, tipo: 'rumbo', carga: 0 },
    ],
    cifra: 9999,
  });
  comprobar('una repetición inventada no da la cifra que dice', motivoDe(v) === 'cifra-que-no-sale', motivoDe(v));
}

paso('Y una repetición real con la cifra retocada, también');
{
  /*
   * Es la trampa más fina que hay: la partida es de verdad, se jugó entera, y solo
   * se cambia el número. Sin la reejecución esto pasaría, porque todo lo demás
   * cuadra — la duración, el aviso, el reloj de pared.
   */
  const otra = partidaQueDura(TICS_DE_PRUEBA);
  const v = registrarRecord({
    arcade: EL_ARCADE,
    partida: otra.partida,
    tics: otra.tics,
    entradas: otra.entradas,
    cifra: otra.cifra + 100,
  });
  comprobar('subir una partida real con la cifra inflada se rechaza', motivoDe(v) === 'cifra-que-no-sale', motivoDe(v));
}

paso('La semilla la pone el servidor, y por eso la partida de otro no vale');
{
  /*
   * Se juega con UNA semilla y se sube contra el aviso de OTRA partida. Todo lo
   * demás es real: las entradas, la duración, la cifra que de verdad salió. Lo
   * único que cambia es la semilla con la que el servidor reejecuta.
   *
   * Que esto se caiga es lo que demuestra que la semilla del servidor se está
   * usando de verdad. Si el servidor reejecutara con una semilla que viniera
   * dentro de la repetición, esto pasaría en verde y toda la verificación sería
   * teatro: quien juega probaría semillas hasta encontrar la fácil.
   */
  const jugadaConUna = partidaQueDura(TICS_DE_PRUEBA);
  const avisoDeOtra = anunciarInicio(EL_ARCADE);
  comprobar(
    'dos avisos seguidos no reparten la misma semilla',
    jugadaConUna.semilla !== avisoDeOtra.semilla,
    { una: jugadaConUna.semilla, otra: avisoDeOtra.semilla },
  );

  /*
   * ═══ SE COMPARA EL ESTADO Y NO LA CIFRA, Y HAY MOTIVO ═══
   *
   * Lo natural sería subir la repetición contra el otro aviso y ver que se cae por
   * «la cifra no sale». Y se cae casi siempre... casi. Dos semillas distintas
   * pueden dar, por casualidad, el mismo número de esquivadas en una partida
   * corta, y entonces el récord se aceptaría y esta comprobación estaría en verde
   * o en rojo según la suerte. Un comprobador que se pone rojo un día de cada cien
   * es peor que no tenerlo: enseña a volver a correr la batería en vez de a leerla.
   *
   * Lo que SIEMPRE cambia con la semilla es el estado: dónde cae cada cosa y a qué
   * velocidad. Así que se comparan las huellas, que es la afirmación de verdad —la
   * semilla del servidor se está usando— sin depender del azar.
   *
   * Y queda dicho lo que esto NO afirma: una repetición jugada con otra semilla que
   * dé la MISMA cifra sí se aceptaría. Es inevitable y no es un agujero: el
   * marcador verifica un número, y ese número es el mismo. Lo que no se puede es
   * elegir la semilla, que es lo que de verdad importa.
   */
  const comoUna = reejecutar(
    leerRepeticion({
      arcade: EL_ARCADE,
      partida: jugadaConUna.partida,
      tics: jugadaConUna.tics,
      entradas: jugadaConUna.entradas,
      cifra: jugadaConUna.cifra,
    }),
    jugadaConUna.semilla,
  );
  const comoOtra = reejecutar(
    leerRepeticion({
      arcade: EL_ARCADE,
      partida: avisoDeOtra.partida,
      tics: jugadaConUna.tics,
      entradas: jugadaConUna.entradas,
      cifra: jugadaConUna.cifra,
    }),
    avisoDeOtra.semilla,
  );
  comprobar(
    'las mismas entradas con otra semilla dan OTRA partida',
    comoUna.huella !== comoOtra.huella,
  );
  comprobar(
    'y la de la semilla buena da la cifra que salió al jugar',
    puntuacionDe(EL_ARCADE, comoUna.estado) === jugadaConUna.cifra,
    { reejecutada: puntuacionDe(EL_ARCADE, comoUna.estado), jugada: jugadaConUna.cifra },
  );
}

paso('Un récord enviado como CIFRA SUELTA se rechaza siempre');
{
  const aviso = anunciarInicio(EL_ARCADE);
  const formas: Array<{ que: string; cuerpo: unknown }> = [
    { que: 'una cifra y nada más', cuerpo: { arcade: EL_ARCADE, partida: aviso.partida, cifra: 500 } },
    { que: 'una cifra sin partida', cuerpo: { arcade: EL_ARCADE, cifra: 500 } },
    { que: 'una cifra con entradas vacías y sin duración', cuerpo: { arcade: EL_ARCADE, partida: aviso.partida, entradas: [], cifra: 500 } },
    { que: 'un número pelado', cuerpo: 500 },
    { que: 'nada', cuerpo: null },
  ];
  for (const f of formas) {
    const v = registrarRecord(f.cuerpo);
    comprobar(`se rechaza ${f.que}`, !v.acepta, motivoDe(v));
  }
}

/**
 * UN ARCADE ENVENENADO, instalado aquí y en ningún otro sitio.
 *
 * ═══ POR QUÉ HACE FALTA INVENTARSE UN JUEGO ═══
 *
 * `repeticiones.ts` rechaza por separado dos cosas: un arcade que no publica cifra
 * y un arcade sin reloj. La segunda no la puede disparar ninguno de los tres
 * juegos instalados —los dos que no tienen reloj tampoco tienen cifra, así que se
 * caen antes por lo otro—, y una rama que ningún camino recorre es una rama que
 * nadie sabe si funciona.
 *
 * Así que se da de alta el juego que falta: con cifra y sin reloj. Es exactamente
 * el patrón de `verify:procedencia`, que se inventa «el-envenenado» para ver a su
 * propia revisión ponerse roja. Se instala solo en este proceso y se olvida en
 * cuanto se ha usado, para que ninguna otra comprobación se lo encuentre por ahí.
 *
 * Y de paso dice algo del catálogo: el día que exista un juego por turnos CON
 * marcador —Riberas con puntuación, La Larga— esta rama deja de ser hipotética y
 * hay que escribirle su formato de repetición, porque el de hoy cuenta en tics.
 */
const EL_DE_LOS_TURNOS = 'el-de-los-turnos';
instalarArcade({
  manifiesto: {
    id: EL_DE_LOS_TURNOS,
    nombre: 'El de los turnos',
    gancho: 'Un juego por turnos que además lleva la cuenta',
    icono: 'mando',
    jugadores: { minimo: 2, maximo: 4 },
    sede: 'servidor',
    tickHz: 0,
    mueble: 'formulario',
    secretos: false,
    marcador: { tipo: 'cifra', rotulo: 'Puntos', sentido: 'mas-alto' },
    procedencia: { tipo: 'creacion-propia' },
  },
  avanzar: (estado: unknown) => estado ?? {},
});

paso('Las repeticiones mal formadas se caen cada una POR SU MOTIVO');
{
  /*
   * Cada trampa tiene que caerse por el motivo que le toca y no por otro. Un
   * comprobador que solo mirase «lo rechazó» pasaría en verde el día que todo se
   * rechace por un fallo tonto —una comprobación que se adelanta y tapa a las
   * demás— y entonces nadie sabría que las otras dejaron de comprobarse.
   */
  const base = (): { arcade: string; partida: string; tics: number; entradas: unknown[]; cifra: number } => ({
    arcade: EL_ARCADE,
    partida: anunciarInicio(EL_ARCADE).partida,
    tics: 60,
    entradas: [{ tic: 0, tipo: 'empezar' }],
    cifra: 0,
  });

  const casos: Array<{ que: string; espera: string; retocar: (c: ReturnType<typeof base>) => unknown }> = [
    {
      que: 'un movimiento con el prefijo reservado de la plataforma',
      espera: 'repeticion-mal-formada/movimiento-reservado',
      retocar: (c) => ({ ...c, entradas: [...c.entradas, { tic: 5, tipo: 'arcade:tic' }] }),
    },
    {
      que: 'entradas fuera del orden de los tics',
      espera: 'repeticion-mal-formada/entradas-desordenadas',
      retocar: (c) => ({
        ...c,
        entradas: [{ tic: 40, tipo: 'rumbo', carga: 1 }, { tic: 10, tipo: 'rumbo', carga: -1 }],
      }),
    },
    {
      que: 'una entrada en un tic que no existe en la partida',
      espera: 'repeticion-mal-formada/entrada-fuera-de-la-partida',
      retocar: (c) => ({ ...c, entradas: [{ tic: 5000, tipo: 'rumbo', carga: 1 }] }),
    },
    {
      que: 'una duración imposible',
      espera: 'repeticion-mal-formada/duracion-imposible',
      retocar: (c) => ({ ...c, tics: 99999999 }),
    },
    {
      que: 'una duración de cero tics',
      espera: 'repeticion-mal-formada/duracion-imposible',
      retocar: (c) => ({ ...c, tics: 0 }),
    },
    {
      que: 'una cifra que no es un entero',
      espera: 'repeticion-mal-formada/cifra-imposible',
      retocar: (c) => ({ ...c, cifra: 3.5 }),
    },
    {
      que: 'una carga que no sobrevive a la serialización canónica',
      espera: 'repeticion-mal-formada/carga-no-serializable',
      retocar: (c) => ({ ...c, entradas: [{ tic: 1, tipo: 'rumbo', carga: Number.NaN }] }),
    },
    {
      que: 'más entradas de las que caben',
      espera: 'repeticion-mal-formada/demasiadas-entradas',
      retocar: (c) => ({
        ...c,
        entradas: new Array(TOPE_DE_ENTRADAS + 1).fill(0).map(() => ({ tic: 1, tipo: 'rumbo', carga: 0 })),
      }),
    },
    {
      que: 'un arcade que no está instalado',
      espera: 'repeticion-mal-formada/arcade-desconocido',
      retocar: (c) => ({ ...c, arcade: 'el-que-no-existe' }),
    },
    {
      que: 'un arcade que no publica ninguna cifra',
      espera: 'repeticion-mal-formada/arcade-sin-marcador',
      retocar: (c) => ({ ...c, arcade: FRENTE }),
    },
    {
      que: 'un arcade por turnos, que además no publica cifra',
      espera: 'repeticion-mal-formada/arcade-sin-marcador',
      retocar: (c) => ({ ...c, arcade: RONDA }),
    },
    {
      que: 'un arcade con cifra pero SIN RELOJ, instalado aquí sólo para esto',
      espera: 'repeticion-mal-formada/arcade-sin-reloj',
      retocar: (c) => ({ ...c, arcade: EL_DE_LOS_TURNOS }),
    },
    {
      que: 'una partida que nadie anunció',
      espera: 'sin-aviso-de-inicio',
      retocar: (c) => ({ ...c, partida: 'esta-partida-no-existe' }),
    },
  ];

  for (const caso of casos) {
    const v = registrarRecord(caso.retocar(base()));
    comprobar(`${caso.que} → ${caso.espera}`, motivoDe(v) === caso.espera, motivoDe(v));
  }

  /*
   * Y el envenenado se va en cuanto ha hecho su trabajo. Dejarlo puesto sería
   * ensuciar el registro del proceso para las comprobaciones de abajo — y este
   * repositorio ya tiene apuntado lo que cuesta un revisor que muta el árbol para
   * probar y se deja algo a medias.
   */
  olvidarArcade(EL_DE_LOS_TURNOS);
  comprobar('el arcade envenenado se ha desinstalado', arcadesConCifraSinPuntuacion().length === 0);
}

paso('La duración declarada se contrasta con el tiempo de pared');
{
  /*
   * Primero la comparación pelada, con números, en sus tres respuestas. Se puede
   * hacer así porque `veredictoDelReloj` está sacada aparte como función pura
   * precisamente para esto: comprobar el margen de arriba de otra forma exigiría
   * que la batería esperase más de dos minutos con una partida abierta, y una
   * comprobación que tarda dos minutos es una que alguien acaba quitando.
   */
  comprobar(
    'veinticuatro segundos de juego en medio segundo de reloj: no se ha jugado',
    veredictoDelReloj(24000, 500) === 'mas-rapido-que-el-reloj',
  );
  comprobar(
    'veinticuatro segundos de juego en veinticinco de reloj: cuadra',
    veredictoDelReloj(24000, 25000) === 'cuadra',
  );
  comprobar(
    'y en cuarenta, también: irse al fondo un rato es lo normal',
    veredictoDelReloj(24000, 40000) === 'cuadra',
  );
  comprobar(
    'pero en hora y media, no',
    veredictoDelReloj(24000, 90 * 60 * 1000) === 'mas-lento-que-el-reloj',
  );
  comprobar(
    'una partida de dos segundos subida al instante NO se rechaza: eso es la holgura',
    veredictoDelReloj(2000, 40) === 'cuadra',
  );

  /*
   * Y ahora de verdad, por el camino entero: una partida LARGA de verdad, jugada
   * al completo, subida en el mismo instante en que se anunció. Todo cuadra menos
   * el reloj. Es la trampa del robot que reproduce una partida buena a toda
   * velocidad, y es la única de todas que no se caería por la cifra.
   */
  /*
   * Hace falta una partida que dure lo bastante para que subirla al instante NO
   * cuadre: por encima de seis segundos de juego, que es donde acaba la holgura.
   *
   * Y hay que BUSCARLA, porque la semilla la reparte el servidor y con algunas el
   * robot dura seis segundos y con otras veintiséis. Escoger a ciegas dejaría esta
   * comprobación en verde o en rojo según la suerte, que es la peor clase de
   * comprobador: el que enseña a volver a correr la batería en vez de a leerla.
   */
  let larga = partidaDeVerdad(3000);
  for (let intento = 0; intento < 20 && larga.tics < 700; intento++) larga = partidaDeVerdad(3000);
  const segundosDeLarga = larga.tics / manifiestoDeArcade(EL_ARCADE).tickHz;
  comprobar(
    'se ha encontrado una partida de más de diez segundos de juego',
    segundosDeLarga > 10,
    `la más larga de veinte intentos duró ${segundosDeLarga.toFixed(1)} s`,
  );
  const v = registrarRecord({
    arcade: EL_ARCADE,
    partida: larga.partida,
    tics: larga.tics,
    entradas: larga.entradas,
    cifra: larga.cifra,
  });
  comprobar(
    'una partida honrada de medio minuto subida al instante se rechaza por el reloj',
    motivoDe(v) === 'mas-rapido-que-el-reloj',
    motivoDe(v),
  );
}

paso('La reejecución es la del reductor de `shared/`, y se ve');
{
  /*
   * La misma repetición pasada por `leerRepeticion` + `reejecutar` a mano, sin el
   * marcador de por medio. Sirve para dos cosas: enseñar que la cifra sale de un
   * estado de verdad y no de un contador del servidor, y dejar el número a la
   * vista de quien lea la salida.
   */
  const otra = partidaQueDura(TICS_DE_PRUEBA);
  const repeticion = leerRepeticion({
    arcade: EL_ARCADE,
    partida: otra.partida,
    tics: otra.tics,
    entradas: otra.entradas,
    cifra: otra.cifra,
  });
  const salida = reejecutar(repeticion, otra.semilla);
  comprobar(
    'reejecutar el diario da la misma cifra que salió al jugar',
    puntuacionDe(EL_ARCADE, salida.estado) === otra.cifra,
    { reejecutada: puntuacionDe(EL_ARCADE, salida.estado), jugada: otra.cifra },
  );
  comprobar(
    'y se han aplicado los tics más las entradas, sin que viajara ni un tic',
    salida.movimientos === otra.tics + otra.entradas.length,
    { movimientos: salida.movimientos, tics: otra.tics, entradas: otra.entradas.length },
  );
  console.log(
    `  ${otra.tics} tics + ${otra.entradas.length} entradas → ${salida.movimientos} movimientos ` +
      `· ${otra.cifra} esquivadas · huella de ${salida.huella.length} caracteres`,
  );
}

// ---------------------------------------------------------------------------
// SEGUNDA MITAD · CON EL SERVIDOR LEVANTADO
// ---------------------------------------------------------------------------

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
const BASE = `http://127.0.0.1:${PUERTO}/api`;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'marcador-'));
let loQueDijoElServidor = '';

function levantar(): ChildProcess {
  const proceso = spawn(process.execPath, [TSX, SERVIDOR], {
    cwd: dir,
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      PORT: String(PUERTO),
      NODE_ENV: 'test',
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
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`el servidor no arrancó en el puerto ${PUERTO}. Dijo:\n${loQueDijoElServidor.slice(-1500)}`);
}

interface Respuesta {
  estado: number;
  datos: Record<string, unknown>;
}

async function pedir(ruta: string, metodo = 'GET', cuerpo?: unknown): Promise<Respuesta> {
  const r = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }),
  });
  const texto = await r.text();
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    datos = { error: texto };
  }
  return { estado: r.status, datos: (datos ?? {}) as Record<string, unknown> };
}

paso('Y ahora con el servidor de verdad levantado');

let servidor: ChildProcess | undefined;
try {
  servidor = levantar();
  await esperarAlServidor();

  /*
   * ═══ SIN NINGUNA CREDENCIAL, QUE ES LA MITAD DE LA PUERTA ═══
   *
   * Ni testigo de jugador, ni pasaporte de cuenta, ni contraseña del taller. Si
   * estas rutas acabaran detrás de `requireAuth` —que es lo que pasa en cuanto
   * alguien mueve una línea en `index.ts`— esto contestaría 401 y el juego dejaría
   * de poderse jugar sin conocer la contraseña del estudio de misterios.
   */
  const anunciada = await pedir('/arcade/partidas', 'POST', { arcade: EL_ARCADE });
  comprobar('anunciar una partida sin credenciales devuelve 200', anunciada.estado === 200, anunciada);
  const partidaId = String(anunciada.datos.partida ?? '');
  const semillaDelServidor = Number(anunciada.datos.semilla);
  comprobar('y trae un identificador y una semilla', partidaId.length > 0 && Number.isInteger(semillaDelServidor), anunciada.datos);

  if (partidaId.length > 0) {
    const jugada = jugarGrabando(semillaDelServidor, TICS_DE_PRUEBA);
    const subida = await pedir('/arcade/records', 'POST', {
      arcade: EL_ARCADE,
      partida: partidaId,
      tics: jugada.jugada.tics,
      entradas: jugada.entradas,
      cifra: jugada.jugada.esquivadas,
    });
    comprobar('una repetición real se acepta por HTTP', subida.estado === 200 && subida.datos.aceptado === true, subida);

    const tabla = await pedir(`/arcade/records/${EL_ARCADE}`);
    const lista = Array.isArray(tabla.datos.records) ? tabla.datos.records : [];
    comprobar('y aparece en la tabla', tabla.estado === 200 && lista.length === 1, tabla.datos);
  }

  /* La cifra suelta, por la red y con todas sus formas. */
  const avisoParaMentir = await pedir('/arcade/partidas', 'POST', { arcade: EL_ARCADE });
  const cifraSuelta = await pedir('/arcade/records', 'POST', {
    arcade: EL_ARCADE,
    partida: String(avisoParaMentir.datos.partida ?? ''),
    cifra: 999999,
  });
  comprobar(
    'una cifra suelta se contesta 400 y no se guarda',
    cifraSuelta.estado === 400 && cifraSuelta.datos.aceptado === false,
    cifraSuelta,
  );

  const tablaDespues = await pedir(`/arcade/records/${EL_ARCADE}`);
  const listaDespues = Array.isArray(tablaDespues.datos.records) ? tablaDespues.datos.records : [];
  comprobar(
    'la tabla sigue teniendo solo el récord bueno',
    listaDespues.length === 1,
    listaDespues.length,
  );

  /* Y los dos noes del catálogo, con sus códigos distintos. */
  const sinReloj = await pedir('/arcade/partidas', 'POST', { arcade: RONDA });
  comprobar('un arcade sin reloj no admite récords: 409', sinReloj.estado === 409, sinReloj);
  const noInstalado = await pedir('/arcade/partidas', 'POST', { arcade: 'el-que-no-existe' });
  comprobar('y uno que no está instalado: 404', noInstalado.estado === 404, noInstalado);
  const tablaDeOtro = await pedir('/arcade/records/el-que-no-existe');
  comprobar('la tabla de un arcade que no existe: 404', tablaDeOtro.estado === 404, tablaDeOtro);
} finally {
  if (servidor) {
    servidor.kill();
    await new Promise((r) => setTimeout(r, 300));
  }
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* Un temporal que no se borra no es un fallo del marcador. */
  }
}

// ---------------------------------------------------------------------------

console.log('');
if (fallos.length === 0) {
  console.log(
    `✔ ${hechas} comprobaciones. Una repetición real se acepta al reejecutarla; una fabricada, una\n` +
      '  real con la cifra retocada, una jugada con otra semilla y una cifra suelta se rechazan; y\n' +
      '  la duración declarada se contrasta con el reloj de pared.\n' +
      '\n' +
      '  LO QUE ESTO NO DEMUESTRA: que no se pueda hacer trampa. Un robot que juegue de verdad,\n' +
      '  con la semilla que le tocó y durante el tiempo que dura la partida, pasa todo esto — y\n' +
      '  tiene que pasarlo, porque desde el servidor es indistinguible de alguien con reflejos.\n' +
      '  Lo que sube es el COSTE de la trampa, de cero a mucho.',
  );
  process.exit(0);
}
console.log(`✘ ${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
for (const f of fallos) console.log(`   · ${f}`);
process.exit(1);
