/**
 * EL MAESTRO DE ORO DE LA SALA DE ARCADE.
 *
 *   npm run oro:arcade                     ← comprueba que nada se ha movido
 *   npm run oro:arcade -- capturar         ← congela cómo se comporta HOY
 *   npm run oro:arcade -- capturar --forzar   ← y encima de una referencia que ya hay
 *
 * ═══ QUÉ ES, Y EN QUÉ SE PARECE Y EN QUÉ NO A `oro:verificar` ═══
 *
 * Su hermano de veladas congela la SALIDA OBSERVABLE de una partida —documentos,
 * dosieres y la vista de cada jugador tras cada movimiento— y exige que no se
 * mueva un byte. La razón es que un refactor del contrato no cambia lo que el
 * sistema hace, solo cómo lo dice, y la única prueba adecuada para eso es
 * congelarlo todo en vez de afirmar invariantes de uno en uno, que siempre se
 * escapan.
 *
 * Aquí es lo mismo con una pieza más y una menos. La de menos: no hay documentos
 * ni dosieres, porque un arcade no imprime nada. La de más, y es la importante:
 *
 *     UN REGISTRO DE MOVIMIENTOS GRABADO, Y EL ESTADO FINAL BYTE A BYTE.
 *
 * ═══ POR QUÉ ESTO ES MÁS FUERTE AQUÍ QUE ALLÍ ═══
 *
 * Porque el reductor de arcade es PURO y el de veladas no. Un reductor puro sobre
 * estado opaco convierte una partida en una función de dos datos —la semilla y la
 * lista de movimientos— así que congelarla no es congelar una foto: es congelar la
 * función entera. Si algo del reductor cambia, aunque sea el orden en que se
 * consume una tirada de azar, el estado final deja de coincidir en el carácter
 * exacto en el que empezaron a diferir.
 *
 * Y de propina cierra la puerta a los tres fallos que se pagan seis meses después:
 * un reductor que muta lo que recibe, uno que mira el reloj de pared, y uno que
 * consume el azar en distinto sitio según por dónde entre. Los tres pasan todas
 * las pruebas del mundo el día que se escriben.
 *
 * ═══ SE COMPARA CON `canonico.ts` Y NO CON `JSON.stringify` ═══
 *
 * `JSON.stringify` conserva el ORDEN DE INSERCIÓN de las claves, así que dos
 * estados idénticos construidos en distinto orden darían cadenas distintas y esto
 * daría FALSOS ROJOS — y un comprobador que grita cuando no pasa nada acaba
 * desactivado, que es peor que no tenerlo. `canonico.ts` ordena las claves y
 * además RECHAZA lo que no sobrevive al viaje: una fecha, un `undefined`, un
 * infinito. Eso último importa todavía más, porque una pérdida al serializar es un
 * FALSO VERDE: dos estados distintos produciendo la misma cadena.
 *
 * ═══ EL REGISTRO CONGELADO ES EL QUE MANDA, NO EL QUE GENERA ESTE FICHERO ═══
 *
 * Ésta es la decisión con la que se puede tropezar. El guion —qué se pulsa y en
 * qué tic— se escribe aquí abajo, y se GUARDA dentro de la referencia. Al
 * verificar, la partida se reejecuta con el registro QUE ESTÁ EN LA REFERENCIA, no
 * con el que este fichero acabe de generar.
 *
 * Sin eso, cambiar un número del guion cambiaría a la vez la partida y su
 * referencia, y la comparación siempre saldría en verde: el maestro de oro estaría
 * comparándose consigo mismo. Con el registro congelado, tocar el guion pone esto
 * rojo diciendo exactamente eso, que es lo que hay que leer antes de recapturar.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  avanzar,
  ESPECTADOR,
  manifiestoDeArcade,
  movimientoDeTic,
  vistaDeAsiento,
} from '../../shared/arcade';
import type { ArcadeId, ContextoMovimiento, ManifiestoDeArcade, Movimiento } from '../../shared/arcade';
import { loSecretoDe } from '../../shared/arcade';
import { canonico } from '../../shared/mecanicas/canonico';
import '../../shared/arcade/juegos';
import {
  ACIERTO,
  EMPEZAR,
  FRENTE,
  OTRA_RONDA,
  partidaNueva,
  PASO,
  TICS_DE_RONDA,
  TICS_PARA_COLOCARSE,
} from '../../shared/arcade/juegos';

const AQUI = path.resolve(import.meta.dirname ?? __dirname, 'oro-arcade');

// ---------------------------------------------------------------------------
// EL GUION DE CADA ARCADE
// ---------------------------------------------------------------------------

/**
 * Un movimiento del guion: qué se hace, quién lo hace, con qué y en qué tic.
 *
 * ═══ POR QUÉ NO SON SOLO `tipo` Y `tic`, QUE ES LO QUE HABÍA ═══
 *
 * Porque con solo esos dos, este fichero no puede grabar la partida de ningún
 * juego cuyos movimientos lleven CARGA o vengan de un ASIENTO — y son los dos
 * campos que el contrato de la fase 0 lleva escritos desde el primer día:
 * `Movimiento.carga` y `ContextoMovimiento.quien`.
 *
 * O sea: Riberas lleva carga en TODOS sus movimientos —qué vértice, qué arista— y
 * La Ronda lleva quién en todos. Ninguno de los dos podía tener maestro de oro
 * sin reescribir el bucle de aquí abajo, mientras la cabecera de `GuionDeArcade`
 * prometía justo lo contrario: que lo único que hay que escribir es una entrada
 * en la tabla. Descubrirlo en la fase 4, con el juego escrito, cuesta una tarde;
 * cubrirlo hoy cuesta estas tres líneas, porque la forma de los campos NO SE
 * ESTÁ INVENTANDO: ya está fijada por `movimiento.ts`, que es núcleo y no se
 * toca.
 *
 * Los tres son opcionales y lo que se congela es el mismo texto de antes cuando
 * no hacen falta. Ver `comoTexto`.
 */
interface Apunte {
  tipo: string;
  tic: number;
  /** Lo que lleva dentro el movimiento. Libre: el motor no la mira. */
  carga?: unknown;
  /** Qué asiento lo manda. `null` o ausente es «no lo manda nadie»: el tic. */
  quien?: string | null;
  /** Quiénes están sentados cuando entra. Vacío en un juego de un solo aparato. */
  asientos?: string[];
}

/**
 * Un apunte, como se guarda en la referencia.
 *
 * El caso normal se escribe `tipo@tic` y ocupa una línea legible: un diff de una
 * partida de ochocientos movimientos se lee de un vistazo en vez de en tres mil
 * renglones de JSON. Cuando el movimiento lleva carga o asiento no cabe en esa
 * forma, y entonces se escribe el apunte entero como JSON en una sola línea.
 *
 * Las dos formas se distinguen por el primer carácter y las dos vuelven a ser el
 * mismo apunte al leerlas, que es lo único que hace falta: lo que manda al
 * verificar es el registro CONGELADO, así que tiene que poder reconstruirse
 * exacto.
 */
function comoTexto(a: Apunte): string {
  const desnudo =
    a.carga === undefined &&
    (a.quien === undefined || a.quien === null) &&
    (a.asientos === undefined || a.asientos.length === 0);
  return desnudo ? `${a.tipo}@${a.tic}` : JSON.stringify(a);
}

/** Y al revés. Un apunte que se escribió con la forma corta vuelve sin carga ni asiento. */
function deTexto(linea: string): Apunte {
  if (linea.startsWith('{')) return JSON.parse(linea) as Apunte;
  const corte = linea.lastIndexOf('@');
  return { tipo: linea.slice(0, corte), tic: Number(linea.slice(corte + 1)) };
}

/**
 * Lo que hace falta para congelar un arcade: cómo empieza y qué se le hace.
 *
 * Es una tabla por arcade y no un guion suelto porque el segundo juego llegará —y
 * llegará con otro estado inicial, otro vocabulario de movimientos y otra
 * duración— y lo único que tiene que escribir es su entrada aquí. Todo lo demás
 * de este fichero es agnóstico: mueve por `avanzar(arcade, …)`, proyecta por
 * `vistaDeAsiento(arcade, …)` y compara con `canonico`, sin saber a qué se juega.
 *
 * Y esa frase se puede escribir porque el `Apunte` cubre los cuatro datos que un
 * movimiento puede llevar por contrato —tipo, carga, quién y en qué tic— más los
 * asientos del contexto. Antes no era verdad y estaba escrita igual, que es la
 * forma de que un límite de alcance se descubra dos fases más tarde.
 *
 * LO QUE SIGUE SIN CUBRIR, dicho para que no vuelva a pasar lo mismo: la semilla
 * es una por mesa y no por movimiento, que es lo que dice el contrato; y una
 * partida con dos arcades a la vez no cabe en esta tabla. Ninguna de las dos la
 * pide ningún juego de los cinco.
 */
interface GuionDeArcade {
  arcade: ArcadeId;
  titulo: string;
  /** La semilla de la mesa. Va en el contexto de cada movimiento. */
  semilla: number;
  /** El estado del que se parte. Sin barajar y sin gastar azar. */
  inicial: () => unknown;
  /**
   * Los asientos que mira la proyección en cada retrato.
   *
   * `ESPECTADOR` es obligatorio y va el primero: es «nadie en concreto», y en La
   * Frente resulta ser la vista MÁS informada de las dos —la sala ve la palabra y
   * quien lleva el móvil no—. Congelar las dos es lo que hace que una inversión
   * de la proyección salga en el diff en vez de en la mesa.
   */
  miradas: Array<string | null>;
  /** La partida entera, movimiento a movimiento y tic a tic. */
  guion: () => Apunte[];
}

/**
 * LA FRENTE: dos rondas enteras, con el reloj venciendo la primera.
 *
 * El guion se escribe con los gestos en tics concretos y feos —31, 58, 92— y no
 * cada cincuenta tics, porque una mesa no pulsa a compás y lo que se quiere
 * congelar es que los tics y los gestos entren mezclados por la misma puerta.
 *
 * La primera ronda la cierra EL RELOJ, que es la mitad de la mecánica del juego.
 * La segunda la cierra un `OTRA_RONDA` a mitad, para congelar también que el azar
 * NO se vuelve a sembrar entre rondas: la cadena sigue donde la dejó la anterior,
 * y por eso una tarde entera se reejecuta desde una sola semilla.
 *
 * Y las dos rondas cruzan los TRES SEGUNDOS DE COLOCARSE, que es lo que hay entre
 * pulsar el botón y ver la primera palabra. Eso también se congela, y no de
 * adorno: los retratos de esos treinta tics enseñan una carta repartida que no
 * sale en NINGUNA de las dos vistas —ni en la de la sala—, así que el día que
 * alguien la adelante un movimiento, el diff lo canta.
 */
const LA_FRENTE: GuionDeArcade = {
  arcade: FRENTE,
  titulo: 'La Frente · dos rondas, y el reloj cerrando la primera',
  semilla: 20260831,
  inicial: () => partidaNueva(),
  miradas: [ESPECTADOR, 'quien-lo-lleva'],
  guion: () => {
    const apuntes: Apunte[] = [{ tipo: EMPEZAR, tic: 0 }];
    const gestos: Array<[number, string]> = [
      [31, ACIERTO],
      [58, ACIERTO],
      [92, PASO],
      [120, ACIERTO],
      [173, ACIERTO],
      [205, PASO],
      [244, ACIERTO],
      [290, ACIERTO],
      [333, PASO],
      [361, ACIERTO],
      [402, ACIERTO],
      [455, ACIERTO],
      [498, PASO],
      [540, ACIERTO],
      [577, ACIERTO],
    ];
    let siguiente = 0;
    /*
     * Los treinta primeros tics son el «colócatelo» y los gestos empiezan
     * después, en el 31, que es cuando la ronda está de verdad en marcha. El
     * final es el vencimiento del plazo de la ronda —que ahora se cuenta desde
     * que la ronda empieza y no desde el botón— más cuatro tics de cortesía para
     * congelar que después de que se acabe no pasa nada más.
     */
    const seAcaba = TICS_PARA_COLOCARSE + TICS_DE_RONDA;
    for (let t = 1; t <= seAcaba + 4; t++) {
      const gesto = gestos[siguiente];
      if (gesto !== undefined && gesto[0] === t) {
        apuntes.push({ tipo: gesto[1], tic: t });
        siguiente++;
      }
      apuntes.push({ tipo: 'arcade:tic', tic: t });
    }
    /* Y la segunda ronda, más corta, para que la referencia no doble de tamaño. */
    const arranque = seAcaba + 5;
    apuntes.push({ tipo: OTRA_RONDA, tic: arranque });
    for (let t = arranque + 1; t <= arranque + 200; t++) {
      if (t === arranque + 40) apuntes.push({ tipo: ACIERTO, tic: t });
      if (t === arranque + 95) apuntes.push({ tipo: PASO, tic: t });
      if (t === arranque + 150) apuntes.push({ tipo: ACIERTO, tic: t });
      apuntes.push({ tipo: 'arcade:tic', tic: t });
    }
    return apuntes;
  },
};

const GUIONES: GuionDeArcade[] = [LA_FRENTE];

// ---------------------------------------------------------------------------
// La instantánea
// ---------------------------------------------------------------------------

/**
 * Un retrato: el estado y lo que ve cada cual, todo en forma canónica.
 *
 * Se retrata CADA VEZ QUE EL ESTADO CAMBIA, y no en cada movimiento. En La Frente
 * eso son veintidós retratos de ochocientos movimientos, y no es un ahorro de
 * disco: es una AFIRMACIÓN. Un tic que no vence nada no tiene que cambiar nada, y
 * el día que alguien meta una cuenta atrás dentro del estado —restando uno en cada
 * tic— el número de retratos se dispara y el diff lo canta.
 *
 * Eso vigila el CONTENIDO. Lo que vigila la IDENTIDAD del objeto es `sinTocar`,
 * ahí abajo, y las dos cosas hacen falta: la primera versión de este fichero solo
 * miraba el contenido y daba en verde con un `{ ...estado }` gratuito puesto en el
 * camino del tic.
 */
interface Retrato {
  /** Qué movimiento lo provocó, con su tic. */
  tras: string;
  estado: string;
  /** Lo que ve cada mirada, en el orden del guion. */
  vistas: Record<string, string>;
  /** Cuántos valores declara el juego como secretos en este instante. */
  esconde: number;
}

interface Instantanea {
  arcade: string;
  titulo: string;
  semilla: number;
  /** El manifiesto entero: si alguien le cambia el aforo o el reloj, sale aquí. */
  manifiesto: ManifiestoDeArcade;
  /** El estado del que se parte, en canónico. */
  inicial: string;
  /**
   * EL REGISTRO DE MOVIMIENTOS, congelado. Es el que manda al verificar.
   *
   * Se guarda como una lista de cadenas «tipo@tic» y no como objetos: ocupa la
   * mitad y, sobre todo, un diff de una partida de setecientos movimientos se lee
   * de un vistazo en vez de en tres mil renglones de JSON.
   */
  registro: string[];
  /** Cuántos de esos movimientos cambiaron algo. Ver `Retrato`. */
  cambios: number;
  /**
   * Cuántos devolvieron EL MISMO OBJETO, sin copiarlo siquiera.
   *
   * ═══ POR QUÉ ESTE NÚMERO ESTÁ CONGELADO, Y NO ES UNA MANÍA ═══
   *
   * `cambios` compara CONTENIDO —dos cadenas canónicas— y por tanto no distingue
   * «no ha pasado nada» de «no ha pasado nada pero he copiado el estado igual».
   * Las dos cosas son idénticas para el juego y no lo son para el móvil: quien
   * pinta compara por identidad (`if (siguiente === anterior) return;` en
   * `app/src/arcade/local.ts`), así que un reductor que devuelva una copia en cada
   * tic rehace la pantalla diez veces por segundo para enseñar exactamente lo
   * mismo. Con sesenta segundos de reloj y una palabra enorme en pantalla, eso se
   * nota en la batería y en el calor del aparato.
   *
   * Y no da ningún error, ni cambia ningún estado, ni lo caza ningún otro
   * comprobador: es la clase de regresión que entra en un refactor —«pongo
   * `{ ...estado }` por si acaso»— y no se descubre nunca. Se descubrió aquí
   * ROMPIENDO ESTE FICHERO A PROPÓSITO: la primera versión solo miraba el
   * contenido y daba en verde con la copia puesta.
   */
  sinTocar: number;
  retratos: Retrato[];
  /** El final, aparte, porque es lo que primero se mira cuando algo se rompe. */
  final: {
    estado: string;
    vistas: Record<string, string>;
    /** Lo que sigue siendo secreto al acabar, por huella: son ciento y pico cartas. */
    secreto: { cuantos: number; huella: string };
  };
}

function huella(texto: string): string {
  return crypto.createHash('sha256').update(texto).digest('hex').slice(0, 16);
}

function comoSeLlama(quien: string | null): string {
  return quien === ESPECTADOR ? 'espectador' : quien;
}

function vistasDe(arcade: ArcadeId, estado: unknown, miradas: Array<string | null>): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const quien of miradas) salida[comoSeLlama(quien)] = canonico(vistaDeAsiento(arcade, estado, quien));
  return salida;
}

/**
 * Juega el guion y devuelve la instantánea.
 *
 * `registro` entra por parámetro para poder reejecutar EL CONGELADO al verificar
 * en vez del que este fichero acabe de generar. Ver la cabecera: sin eso, el
 * maestro de oro se compararía consigo mismo y siempre estaría en verde.
 */
function jugar(g: GuionDeArcade, registro: string[]): Instantanea {
  const manifiesto = manifiestoDeArcade(g.arcade);
  let estado: unknown = g.inicial();
  let anterior = canonico(estado);

  const retratos: Retrato[] = [
    {
      tras: '(el principio)',
      estado: anterior,
      vistas: vistasDe(g.arcade, estado, g.miradas),
      esconde: loSecretoDe(g.arcade, estado).length,
    },
  ];
  let cambios = 0;
  let sinTocar = 0;

  for (const linea of registro) {
    const apunte = deTexto(linea);
    /*
     * El tic se pide por `movimientoDeTic()` y no se fabrica a mano, para que si
     * alguien le añadiera carga a ese movimiento la referencia lo notara.
     */
    const movimiento: Movimiento =
      apunte.tipo === 'arcade:tic'
        ? movimientoDeTic()
        : apunte.carga === undefined
          ? { tipo: apunte.tipo }
          : { tipo: apunte.tipo, carga: apunte.carga };
    /*
     * `quien: null` y `asientos: []` son la forma normal de un juego de un solo
     * aparato, no un contexto a medio montar: el móvil pasa de mano en mano y no
     * hay nadie dado de alta en ninguna parte. Un juego con mesa escribe los
     * suyos en el apunte y llegan aquí; ver `Apunte`.
     */
    const ctx: ContextoMovimiento = {
      quien: apunte.quien ?? null,
      azar: g.semilla,
      tic: apunte.tic,
      asientos: apunte.asientos ?? [],
    };
    const antesDeMover = estado;
    estado = avanzar(g.arcade, estado, movimiento, ctx);
    /* Identidad, no contenido. Ver `sinTocar`. */
    if (estado === antesDeMover) sinTocar++;

    const ahora = canonico(estado);
    if (ahora === anterior) continue;
    cambios++;
    anterior = ahora;
    retratos.push({
      tras: linea,
      estado: ahora,
      vistas: vistasDe(g.arcade, estado, g.miradas),
      esconde: loSecretoDe(g.arcade, estado).length,
    });
  }

  const secreto = loSecretoDe(g.arcade, estado);
  return {
    arcade: g.arcade,
    titulo: g.titulo,
    semilla: g.semilla,
    manifiesto,
    inicial: canonico(g.inicial()),
    registro,
    cambios,
    sinTocar,
    retratos,
    final: {
      estado: anterior,
      vistas: vistasDe(g.arcade, estado, g.miradas),
      secreto: { cuantos: secreto.length, huella: huella(canonico(secreto)) },
    },
  };
}

function comoRegistro(apuntes: Apunte[]): string[] {
  return apuntes.map(comoTexto);
}

// ---------------------------------------------------------------------------
// La comparación
// ---------------------------------------------------------------------------

/**
 * En qué carácter empiezan a diferir dos cadenas canónicas.
 *
 * Es lo que se gana comparando cadenas en vez de huellas, y está dicho en la
 * cabecera de `canonico.ts`: no hay colisiones que descartar y además se puede
 * señalar el punto exacto. Depurar «el estado final no coincide» es media tarde;
 * depurar «difieren en el carácter 412, donde antes ponía `"monton":["Erizo"` y
 * ahora pone `"monton":["Topo"` » es un minuto.
 */
function dondeDifieren(antes: string, ahora: string): string {
  let i = 0;
  while (i < antes.length && i < ahora.length && antes[i] === ahora[i]) i++;
  const desde = Math.max(0, i - 30);
  return (
    `difieren en el carácter ${i}\n` +
    `        antes: …${antes.slice(desde, i + 50)}\n` +
    `        ahora: …${ahora.slice(desde, i + 50)}`
  );
}

function diferencias(antes: Instantanea, ahora: Instantanea): string[] {
  const difs: string[] = [];

  if (JSON.stringify(antes.manifiesto) !== JSON.stringify(ahora.manifiesto)) {
    difs.push(
      'el MANIFIESTO ha cambiado\n' +
        `        antes: ${JSON.stringify(antes.manifiesto)}\n` +
        `        ahora: ${JSON.stringify(ahora.manifiesto)}`,
    );
  }
  if (antes.semilla !== ahora.semilla) {
    difs.push(`la semilla ha cambiado: ${antes.semilla} → ${ahora.semilla}`);
  }
  if (antes.inicial !== ahora.inicial) {
    difs.push(`el ESTADO INICIAL ha cambiado: ${dondeDifieren(antes.inicial, ahora.inicial)}`);
  }
  if (antes.cambios !== ahora.cambios) {
    difs.push(
      `el número de movimientos que CAMBIAN el estado ha pasado de ${antes.cambios} a ${ahora.cambios}.\n` +
        '        Si ha subido mucho, lo más probable es que algo haya empezado a cambiar el estado\n' +
        '        en cada tic —una cuenta atrás dentro del estado, por ejemplo—, que es exactamente\n' +
        '        lo que `Plazo` como instante absoluto existe para evitar.',
    );
  }

  if (antes.sinTocar !== ahora.sinTocar) {
    difs.push(
      `el número de movimientos que devuelven EL MISMO OBJETO ha pasado de ${antes.sinTocar} a ` +
        `${ahora.sinTocar}, con el mismo contenido en los dos casos.\n` +
        '        O sea que el reductor ha empezado a copiar el estado cuando no pasa nada. No cambia\n' +
        '        el juego y no lo caza ningún otro comprobador, y hace que el móvil repinte la\n' +
        '        pantalla en cada tic para enseñar lo mismo: quien pinta compara por identidad.',
    );
  }

  const cuantos = Math.max(antes.retratos.length, ahora.retratos.length);
  for (let i = 0; i < cuantos; i++) {
    const a = antes.retratos[i];
    const b = ahora.retratos[i];
    if (a === undefined || b === undefined) {
      difs.push(`el retrato ${i} ${a === undefined ? 'sobra' : 'falta'} (${(a ?? b)?.tras})`);
      continue;
    }
    if (a.tras !== b.tras) difs.push(`el retrato ${i} lo provoca otro movimiento: ${a.tras} → ${b.tras}`);
    if (a.estado !== b.estado) {
      difs.push(`el ESTADO tras ${b.tras}: ${dondeDifieren(a.estado, b.estado)}`);
    }
    for (const quien of Object.keys(a.vistas).sort()) {
      const va = a.vistas[quien] ?? '';
      const vb = b.vistas[quien] ?? '';
      if (va !== vb) difs.push(`lo que ve «${quien}» tras ${b.tras}: ${dondeDifieren(va, vb)}`);
    }
    if (a.esconde !== b.esconde) {
      difs.push(
        `lo que el juego declara SECRETO tras ${b.tras} ha pasado de ${a.esconde} valores a ${b.esconde}.\n` +
          '        Un secreto que encoge es un secreto que empieza a viajar.',
      );
    }
  }

  if (antes.final.estado !== ahora.final.estado) {
    difs.push(`el ESTADO FINAL: ${dondeDifieren(antes.final.estado, ahora.final.estado)}`);
  }
  if (antes.final.secreto.huella !== ahora.final.secreto.huella) {
    difs.push(
      `lo que queda escondido al acabar ha cambiado: ${antes.final.secreto.cuantos} valores ` +
        `(${antes.final.secreto.huella}) → ${ahora.final.secreto.cuantos} (${ahora.final.secreto.huella})`,
    );
  }
  return difs;
}

// ---------------------------------------------------------------------------

const argumentos = process.argv.slice(2);
const modo = argumentos.includes('capturar') ? 'capturar' : 'verificar';
const forzar = argumentos.includes('--forzar');

console.log(`\nEl maestro de oro de la Sala de Arcade · ${modo}\n`);

let mal = false;

for (const g of GUIONES) {
  const donde = path.join(AQUI, `${g.arcade}.json`);
  const registroDeAhora = comoRegistro(g.guion());

  if (modo === 'capturar') {
    /*
     * Capturar encima de una referencia que ya existe es destructivo, en silencio
     * y en verde: quien teclea «capturar» cuando quería «verificar» no ve ningún
     * error, ve un mensaje de éxito y una red que a partir de ese momento bendice
     * exactamente la regresión que acababa de introducir. Recapturar es legítimo
     * y hace falta cada vez que se cambia algo a propósito, así que no se
     * prohíbe: se pide decirlo en voz alta.
     */
    if (fs.existsSync(donde) && !forzar) {
      console.error(`${g.arcade}: ya hay una referencia congelada.`);
      console.error(`  ${path.relative(process.cwd(), donde)}`);
      console.error('\n  Sobreescribirla da por buenas TODAS las diferencias que haya ahora mismo.');
      console.error('  Si es lo que quieres, dilo:  npm run oro:arcade -- capturar --forzar');
      mal = true;
      continue;
    }
    const instantanea = jugar(g, registroDeAhora);
    fs.mkdirSync(path.dirname(donde), { recursive: true });
    fs.writeFileSync(donde, JSON.stringify(instantanea, null, 2), 'utf8');
    console.log(`${g.arcade} · ${g.titulo}`);
    console.log(
      `  ${instantanea.registro.length} movimientos · ${instantanea.cambios} cambian el estado · ` +
        `${instantanea.sinTocar} devuelven el mismo objeto`,
    );
    console.log(`  ${instantanea.retratos.length} retratos · ${(fs.statSync(donde).size / 1024).toFixed(0)} KB`);
    continue;
  }

  if (!fs.existsSync(donde)) {
    console.error(`${g.arcade}: no hay maestro de oro. Ejecuta antes: npm run oro:arcade -- capturar`);
    mal = true;
    continue;
  }

  const esperado = JSON.parse(fs.readFileSync(donde, 'utf8')) as Instantanea;

  /*
   * ═══ PRIMERO EL GUION, Y CON MENSAJE PROPIO ═══
   *
   * Si el guion de este fichero ya no es el congelado, la comparación de estados
   * no significa nada: se estarían comparando dos partidas distintas. Se dice
   * aparte y con todas las letras, porque el arreglo no es el mismo —aquí hay que
   * decidir si el guion nuevo es mejor y recapturar a sabiendas— y porque quien
   * lea un rojo de estados sin esto se volvería loco buscando un fallo en el
   * reductor que no existe.
   */
  const mismoGuion =
    esperado.registro.length === registroDeAhora.length &&
    esperado.registro.every((a, i) => a === registroDeAhora[i]);

  /*
   * Y PASE LO QUE PASE SE REEJECUTA EL CONGELADO. Es lo que impide que el maestro
   * de oro se compare consigo mismo.
   */
  const actual = jugar(g, esperado.registro);
  const difs = diferencias(esperado, actual);

  console.log(`${g.arcade} · ${esperado.registro.length} movimientos reejecutados`);

  if (!mismoGuion) {
    mal = true;
    console.log(
      `  ✗ el GUION de este fichero ya no es el congelado ` +
        `(${registroDeAhora.length} movimientos ahora, ${esperado.registro.length} congelados).\n` +
        '    La partida se ha reejecutado con el CONGELADO, que es el que manda. Si el guion\n' +
        '    nuevo es mejor, hay que recapturar a sabiendas.',
    );
  }

  if (difs.length === 0) {
    console.log(`  ${actual.retratos.length} retratos y el estado final, byte a byte, exactamente igual.`);
    continue;
  }

  mal = true;
  console.log(`  ${difs.length} diferencias:\n`);
  for (const d of difs.slice(0, 10)) console.log(`    ✗ ${d}`);
  if (difs.length > 10) console.log(`    … y ${difs.length - 10} más`);
}

console.log('');
if (mal) {
  console.log(
    modo === 'capturar'
      ? 'No se capturó todo.'
      : 'La Sala de Arcade NO se comporta igual que antes. Si el cambio es a propósito:\n' +
          '  npm run oro:arcade -- capturar --forzar',
  );
  process.exit(1);
}
console.log(modo === 'capturar' ? 'Maestro de oro capturado.' : 'Los arcades se comportan exactamente igual que antes.');
process.exit(0);
