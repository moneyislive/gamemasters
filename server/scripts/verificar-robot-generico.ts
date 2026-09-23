/**
 * ¿SE PUEDE JUGAR CADA ARCADE DE MESA SIN SABER A QUÉ SE JUEGA?
 *
 *   npm run verify:robot-generico -w server
 *
 * ═══ QUÉ AFIRMA ═══
 *
 * Recorre `arcadesInstalados()` —el registro, no una lista de aquí— y juega cada arcade de mesa
 * con `robot-generico.ts`, que sólo sabe lo que la plataforma sabe de todos: la vista de cada
 * asiento, las `opciones()` que el juego le da a esa vista y `seAcaboLaPartida`. Con tres semillas
 * por juego —con el mínimo, el medio y el máximo de asientos del manifiesto— y cada partida DOS
 * veces, afirma:
 *
 *   · que NINGUNA EXCEPCIÓN escapa del código del juego (proyección, opciones, reductor, final);
 *   · que TODA OPCIÓN OFRECIDA Y ELEGIDA SE PUEDE HACER: el reductor no la rechaza, no devuelve el
 *     mismo estado sin decir nada (un botón mudo) ni otro objeto con lo mismo dentro;
 *   · que a quien sólo mira no se le ofrece nada, que nada lleva el prefijo reservado `arcade:` y
 *     que ninguna lista trae dos veces el mismo id;
 *   · que la partida TERMINA, o que llega al tope VIVA —con el turno cambiando y más de un tipo de
 *     movimiento en su cola—, y que al menos una partida de cada juego termina de verdad;
 *   · que juegan todos los sentados, y que todo tipo que el juego ofreció a menudo se llegó a hacer;
 *   · que la misma semilla da la misma partida, movimiento a movimiento, y que el diario que
 *     guardaría la mesa, reejecutado, da el mismo estado.
 *
 * Y un juego nuevo queda cubierto SIN ESCRIBIR NADA: basta con que se dé de alta con mesa y con
 * `opciones()`. Lo que no juega, lo dice con su razón.
 *
 * ═══ EL VERDE POR FILTRO ROTO, CERRADO POR LOS DOS LADOS ═══
 *
 * Un comprobador que recorre el registro y salta lo que no sabe jugar es exactamente el que la
 * memoria de la casa tiene apuntado: cero juegos jugados, cero fallos, verde. Aquí:
 *
 *   · Se exige que se hayan jugado LOS CUATRO JUEGOS DE MESA QUE HAY HOY —La Ronda, Riberas, El
 *     Burgo y Las Lindes—, por su nombre. Si el filtro se rompe, falta alguno y es rojo.
 *   · Cada arcade instalado se juega o se salta CON SU RAZÓN, impresa, y la cuenta tiene que
 *     cuadrar con el registro: ninguno en silencio. Saltar sólo vale para lo que es de un solo
 *     aparato y sin opciones; un juego de mesa sin opciones, o de aparato con ellas, es ROJO,
 *     porque este robot no lo puede jugar y un mueble genérico tampoco.
 *
 * ═══ Y EL VERDE POR SUELO QUE NO MUERDE, CERRADO CON UNA VACUNA ═══
 *
 * Los tres suelos de avance —termina o sigue viva, mueven todos los sentados, cada tipo ofrecido a
 * menudo se hizo— sólo valen si el bucle que no juega los incumple. Así que se juega también con la
 * política `'primera'`, que es el bucle viejo de `verify:mesa` que la memoria apunta —26 de 40
 * vueltas ofreciendo trueques—, y se exige que en algún juego NO pase esos suelos. Si un día los
 * pasa, los suelos dejaron de medir. Hoy caen tres: en Riberas se atasca ofreciendo y rechazando
 * trueques; en el Burgo el primero que se mueve se rinde y la partida «termina» en dos pasos sin
 * que el otro mueva; y en Las Lindes no pasa nunca.
 *
 * ═══ CÓMO SE HA VISTO ROJA CADA COMPROBACIÓN, Y POR LO QUE ES ═══
 *
 * Cada una rompiendo en una copia, corriendo, y restaurando con `cp` y `cmp` (23-sep-2026):
 *
 *   · Las Lindes rechazando su propio «pasar» con motivo; devolviendo el MISMO estado; devolviendo
 *     `{ ...actual }`: cae la suya en las tres partidas, con semilla, paso y movimiento.
 *   · Una excepción al plantar en un prado; ninguna opción al plantar (se corta); ofrecerle «mirar»
 *     al espectador; una opción `arcade:…`; los ids de «poner» sin el giro (repetidos).
 *   · El «pasar» de Riberas cambiando el estado SIN pasar el turno: ATASCADA en las tres, con
 *     rachas de 21 a 27 «pasar» seguidos del mismo asiento, y ninguna termina.
 *   · Un contador de módulo que se cuela en el estado: caen la de las dos vueltas y la del diario.
 *     La vista de Las Lindes MUTANDO el estado que recibe: cae SÓLO la del diario —las dos vueltas
 *     mutan igual—, que es justo para lo que está.
 *   · Las Lindes dadas de alta sin `seAcabo`, y sin `opciones()`: la primera cae como «no declara
 *     su final»; la segunda sale en rojo por su nombre, y el suelo del arnés sale con 2.
 *   · En este fichero: un `continue` que se come La Peonza (ninguno en silencio), Riberas saltada
 *     con una razón que suena bien (los de hoy, y el suelo con 2), los tres suelos sin dientes (la
 *     vacuna), el bloque del Burgo saltado (sólo el suelo, con 2). En el robot: no contar a `s2`
 *     (mueven todos), no mirar nunca al espectador («y se le ha mirado»), no plantar nunca
 *     (todo tipo ofrecido a menudo se hizo: «plantar» ofrecido en 213 miradas y hecho 0 veces).
 *
 * ═══ LO QUE NO AFIRMA, DICHO PARA QUE NO SE LEA COMO VIGILADO ═══
 *
 *   · Las DECLARACIONES (`declaracion: true`: el trueque libre de Riberas, la puja libre y el trato
 *     del Burgo) no se mandan: el robot las salta, como manda `opciones.ts` a quien juega a ciegas.
 *     Se cuentan y se imprimen, pero esas familias las ejercitan los comprobadores de cada juego.
 *   · Juega al azar sembrado, no a ganar: El Burgo empieza con `topeDeVueltas: 0`, que es lo que
 *     ofrece su `empezar`, y sin nadie que junte un barrio casi nadie quiebra. Por eso sus partidas
 *     de cuatro y de seis llegan al tope vivas y la que termina es la de dos: la de alguien que se
 *     rinde. Que un juego «termine» aquí no dice que se juegue bien.
 *   · No compara Node con Hermes: eso es `verify:determinismo`. El robot está escrito para poder
 *     entrar en su paquete (sin `node:`, sin `class`, sin cierres sobre el `let` de un bucle).
 */
import '../../shared/arcade/juegos';
import { arcadesInstalados, hayFinal, hayOpciones, necesitaMesa, reejecutarEn } from '../../shared/arcade';
import type { ArcadeId, ManifiestoDeArcade } from '../../shared/arcade';
import { BURGO, LINDES, RIBERAS, RONDA } from '../../shared/arcade/juegos';
import { canonico } from '../../shared/mecanicas/canonico';
import { arnes } from './arnes';
import { jugarConElRobotGenerico } from './robot-generico';
import type { Incidente, PartidaGenerica } from './robot-generico';

const { comprobar, paso, nota, terminar } = arnes();

/**
 * Las semillas: tres, escritas y no sorteadas, como en `guion-determinismo.ts`. Una por número de
 * asientos: el mínimo del manifiesto, el del medio y el máximo.
 */
const SEMILLAS: readonly number[] = [1, 20260923, 3141592653];

/**
 * Los juegos de mesa que hay HOY, por su nombre. Es la otra mitad del filtro: el bucle de abajo
 * recorre el registro, y esto exige que en lo recorrido estén éstos. Un juego que se dé de BAJA
 * obliga a quitarlo de aquí, a propósito; uno que se dé de ALTA entra solo.
 */
const LOS_DE_HOY: readonly ArcadeId[] = [RONDA, RIBERAS, BURGO, LINDES];

/**
 * Cuántas miradas tiene que haberse ofrecido un tipo, sumando las semillas, para exigir que se
 * haya hecho al menos una vez. Con uno, un tipo que asomó en una sola mirada y perdió el sorteo
 * sería un rojo del robot y no del juego; con cinco, un tipo que el juego ofrece y el robot no
 * consigue hacer nunca es rojo.
 */
const OFRECIDO_A_MENUDO = 5;

/** Los pasos de la vacuna: bastan para que el bucle viejo se atasque, y no gastan la batería. */
const TOPE_DE_LA_VACUNA = 300;

/** Cómo se nombra una partida en la salida. */
function nombreDe(p: PartidaGenerica): string {
  return `${p.arcade} ×${p.asientos.length} · semilla ${p.semilla}`;
}

/** Un incidente, para leerlo: dónde, quién, qué mandó y qué pasó. Es lo que lo reproduce. */
function comoReproducirlo(p: PartidaGenerica, i: Incidente | null | undefined): string {
  if (i === null || i === undefined) return '';
  return (
    `semilla ${p.semilla}, ${p.asientos.length} asientos, paso ${i.paso}, con ${i.enElDiario} movimientos en el diario: ` +
    `${i.quien ?? 'nadie (el reloj o el espectador)'} · «${i.id}» ${i.tipo} ${JSON.stringify(i.carga) ?? ''} → ${i.que}`
  );
}

/**
 * ¿SIGUE VIVA al llegar al tope? En la cola de la partida tiene que haber más de un tipo de
 * movimiento y, si el juego declara el turno, el turno tiene que haber dado la vuelta a la mesa
 * POR JUGADAS de los asientos. El bucle que ofrece trueques a nadie tiene dos tipos (ofrecer y
 * rechazar) y CERO cambios de turno.
 *
 * Los cambios que trae el reloj NO cuentan, y es a propósito: el tic pasa el turno por el ausente,
 * así que una mesa donde nadie puede terminar su turno —un «pasar» que no pasa— seguiría viendo
 * cambiar el turno cada vez que vence el plazo. Visto rojo antes de separarlos: con el «pasar» de
 * Riberas roto, las partidas llegaban al tope «vivas» gracias al reloj.
 */
function porQueSigueViva(p: PartidaGenerica): string | null {
  const n = p.asientos.length;
  if (p.vida.tipos < 2) return null;
  if (p.declaraTurno ? p.vida.cambiosDeTurno < n : p.vida.asientos < 2) return null;
  return (
    `llega al tope de ${p.pasos} pasos VIVA: en sus últimos ${p.vida.aceptados} movimientos el turno cambió ` +
    `${p.vida.cambiosDeTurno} veces por una jugada, con ${p.vida.tipos} tipos distintos y ${p.vida.asientos} asientos moviendo`
  );
}

/** Cómo acabó, en una frase. */
function comoAcabo(p: PartidaGenerica): string {
  if (p.excepcion !== null) return `REVIENTA: ${p.excepcion.que}`;
  if (p.terminada) return `termina en ${p.pasos} pasos`;
  if (p.corte !== null) return `SE CORTA: ${p.corte}`;
  return porQueSigueViva(p) ?? `llega al tope de ${p.pasos} pasos ATASCADA`;
}

/**
 * Dónde empiezan a diferir dos formas canónicas, con lo de alrededor. Es lo que dice QUÉ campo del
 * estado se fue por otro lado; el principio del estado, que es lo que se veía antes, no dice nada.
 */
function dondeDifieren(uno: string, otro: string): string {
  const hasta = Math.min(uno.length, otro.length);
  let i = 0;
  while (i < hasta && uno[i] === otro[i]) i++;
  const desde = i > 80 ? i - 80 : 0;
  return `en el carácter ${i} de ${uno.length}/${otro.length}: …${uno.slice(desde, i + 60)} ⟂ …${otro.slice(desde, i + 60)}`;
}

// ---------------------------------------------------------------------------
// LOS SUELOS DE AVANCE, escritos una vez: los usan las partidas y la vacuna
// ---------------------------------------------------------------------------

/** Primer suelo: termina, o llega al tope viva. */
function avanza(p: PartidaGenerica): boolean {
  return p.terminada || (p.topeAlcanzado && porQueSigueViva(p) !== null);
}

/**
 * Segundo suelo: los sentados que no llegaron a mover nada. Es el que caza la partida que «termina»
 * porque el primero en moverse se rinde: el bucle viejo, en el Burgo, acaba en dos pasos.
 */
function quienesNoMovieron(p: PartidaGenerica): string[] {
  return p.asientos.filter((a) => (p.movieron[a] ?? 0) === 0);
}

/** Tercer suelo: lo que el juego ofreció a menudo y no se hizo nunca. Sobre tablas sumadas. */
function ofrecidoYNoHecho(ofrecidas: Record<string, number>, aceptadas: Record<string, number>): string[] {
  return Object.keys(ofrecidas).filter((t) => (ofrecidas[t] ?? 0) >= OFRECIDO_A_MENUDO && (aceptadas[t] ?? 0) === 0);
}

/** Una tabla de conteos, de más a menos, en una línea. */
function recuento(tabla: Record<string, number>): string {
  const filas = Object.keys(tabla).map((k): [string, number] => [k, tabla[k] ?? 0]);
  filas.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return filas.length === 0 ? '—' : filas.map(([k, v]) => `${k} ${v}`).join(' · ');
}

// ---------------------------------------------------------------------------
// QUÉ SE JUEGA Y QUÉ NO
// ---------------------------------------------------------------------------

/** Lo que se decide de un arcade instalado: se juega, se salta con su razón, o es un fallo. */
type Destino = { que: 'jugar' } | { que: 'saltar'; porque: string } | { que: 'fallo'; porque: string };

function destinoDe(m: ManifiestoDeArcade): Destino {
  const mesa = necesitaMesa(m);
  const conOpciones = hayOpciones(m.id);
  if (mesa && conOpciones) return { que: 'jugar' };
  if (!mesa && !conOpciones) {
    return {
      que: 'saltar',
      porque:
        `es de un solo aparato (sede «${m.sede}») y sin \`opciones()\`: no abre mesa, no tiene asientos a los ` +
        'que preguntar qué pueden hacer, y lo juega su propio bucle',
    };
  }
  if (mesa) {
    return {
      que: 'fallo',
      porque: 'abre mesa y NO registra `opciones()`: ni este robot ni un mueble genérico tienen nada que pulsar',
    };
  }
  return {
    que: 'fallo',
    porque:
      'es de un solo aparato y SÍ registra `opciones()`: el robot no sabe a quién preguntárselas, porque no hay ' +
      'asientos; decide cómo se juega y enséñaselo a este comprobador',
  };
}

paso('Qué arcades de los instalados se juegan, y por qué se salta cada uno de los demás');

const instalados = arcadesInstalados();
const aJugar: ManifiestoDeArcade[] = [];
let saltados = 0;
/* Los que son rojo ya lo han dicho en voz alta: cuentan como dichos, no como silencio. */
let enRojo = 0;
for (const m of instalados) {
  const d = destinoDe(m);
  if (d.que === 'jugar') {
    aJugar.push(m);
    nota(`«${m.id}»: se juega, de ${m.jugadores.minimo} a ${m.jugadores.maximo} asientos`);
  } else if (d.que === 'saltar') {
    saltados++;
    nota(`«${m.id}»: se salta porque ${d.porque}`);
  } else {
    enRojo++;
    comprobar(`«${m.id}» se puede jugar sin saber a qué se juega`, false, d.porque);
  }
}
comprobar(
  'cada arcade instalado se juega, se salta con su razón o sale en rojo: ninguno en silencio',
  instalados.length > 0 && aJugar.length + saltados + enRojo === instalados.length,
  { instalados: instalados.length, jugados: aJugar.length, saltados, enRojo },
);
for (const id of LOS_DE_HOY) {
  comprobar(`«${id}», que es de mesa hoy, está entre los que se juegan`, aJugar.some((m) => m.id === id), aJugar.map((m) => m.id));
}

// ---------------------------------------------------------------------------
// LAS PARTIDAS, DOS VECES
// ---------------------------------------------------------------------------

interface Mesa {
  arcade: ArcadeId;
  cuantos: number;
  semilla: number;
}

const mesas: Mesa[] = [];
for (const m of aJugar) {
  const cuantos = [m.jugadores.minimo, Math.floor((m.jugadores.minimo + m.jugadores.maximo) / 2), m.jugadores.maximo];
  for (let i = 0; i < SEMILLAS.length; i++) {
    mesas.push({ arcade: m.id, cuantos: cuantos[i % cuantos.length] as number, semilla: SEMILLAS[i] as number });
  }
}
const llave = (x: Mesa): string => `${x.arcade}|${x.cuantos}|${x.semilla}`;

const inicio = performance.now();
const primera = new Map<string, PartidaGenerica>();
const segundos = new Map<string, number>();
for (const x of mesas) {
  const t0 = performance.now();
  primera.set(llave(x), jugarConElRobotGenerico(x.arcade, x.cuantos, x.semilla));
  segundos.set(llave(x), (performance.now() - t0) / 1000);
}
/*
 * LA SEGUNDA VUELTA, EN EL ORDEN CONTRARIO. Si el resultado dependiera de lo que se jugó antes —una
 * tabla de módulo que se rellena, un contador que no se reinicia—, la misma partida jugada en otro
 * momento del proceso saldría distinta. Con el mismo orden las dos vueltas podrían coincidir en el
 * error.
 */
const segunda = new Map<string, PartidaGenerica>();
for (let i = mesas.length - 1; i >= 0; i--) {
  const x = mesas[i] as Mesa;
  segunda.set(llave(x), jugarConElRobotGenerico(x.arcade, x.cuantos, x.semilla));
}

for (const m of aJugar) {
  paso(`«${m.id}»`);
  comprobar(`«${m.id}» declara cuándo se acaba (\`seAcabo\`): sin eso su mesa no se cierra nunca`, hayFinal(m.id));
  const suyas = mesas.filter((x) => x.arcade === m.id);
  const aceptadas: Record<string, number> = {};
  const ofrecidas: Record<string, number> = {};
  const declaraciones: Record<string, number> = {};
  let terminadas = 0;
  let tics = 0;
  let pasos = 0;
  let tiempo = 0;
  for (const x of suyas) {
    const p = primera.get(llave(x)) as PartidaGenerica;
    const otra = segunda.get(llave(x)) as PartidaGenerica;
    const quien = nombreDe(p);
    tiempo += segundos.get(llave(x)) ?? 0;
    pasos += p.pasos;
    tics += p.tics.aceptados;
    if (p.terminada) terminadas++;
    for (const t of Object.keys(p.aceptadas)) aceptadas[t] = (aceptadas[t] ?? 0) + (p.aceptadas[t] ?? 0);
    for (const t of Object.keys(p.ofrecidas)) ofrecidas[t] = (ofrecidas[t] ?? 0) + (p.ofrecidas[t] ?? 0);
    for (const t of Object.keys(p.declaraciones)) declaraciones[t] = (declaraciones[t] ?? 0) + (p.declaraciones[t] ?? 0);
    nota(
      `${p.asientos.length} asientos · semilla ${p.semilla}: ${comoAcabo(p)} · ${p.diario.length} en el diario ` +
        `(${p.tics.aceptados} tics) · ${p.cambiosDeTurno} cambios de turno (${p.cambiosDeTurnoPorElReloj} por el reloj) · ` +
        `${(segundos.get(llave(x)) ?? 0).toFixed(1)} s`,
    );

    comprobar(`${quien}: ninguna excepción escapa del código del juego`, p.excepcion === null, comoReproducirlo(p, p.excepcion));
    comprobar(`${quien}: nunca se queda sin nadie que pueda mover antes de acabar`, p.corte === null || p.excepcion !== null, p.corte);
    comprobar(`${quien}: termina, o llega al tope viva`, avanza(p), {
      comoAcabo: comoAcabo(p),
      vida: p.vida,
      racha: p.rachaMasLarga,
    });
    comprobar(
      `${quien}: toda opción ofrecida y elegida se puede hacer — el reductor no rechaza ninguna`,
      p.rechazadas.length === 0,
      `${p.rechazadas.length} rechazadas; la primera: ${comoReproducirlo(p, p.rechazadas[0])}`,
    );
    comprobar(
      `${quien}: ninguna opción ofrecida y elegida es un botón mudo (el mismo estado y ningún motivo)`,
      p.mudas.length === 0,
      `${p.mudas.length} mudas; la primera: ${comoReproducirlo(p, p.mudas[0])}`,
    );
    comprobar(
      `${quien}: ninguna devuelve otro objeto con lo mismo dentro (la mesa lo guardaría como un cambio)`,
      p.copias.length === 0,
      `${p.copias.length} copias; la primera: ${comoReproducirlo(p, p.copias[0])}`,
    );
    comprobar(
      `${quien}: a quien sólo mira no se le ofrece nada, y se le ha mirado`,
      p.alEspectador.length === 0 && p.miradasDelEspectador > 0,
      { miradas: p.miradasDelEspectador, laPrimera: comoReproducirlo(p, p.alEspectador[0]) },
    );
    comprobar(
      `${quien}: ninguna opción lleva el prefijo que la plataforma se reserva (la mesa la rechazaría en la puerta)`,
      p.reservadas.length === 0,
      comoReproducirlo(p, p.reservadas[0]),
    );
    comprobar(`${quien}: ninguna lista trae dos veces el mismo id`, p.idsRepetidos.length === 0, comoReproducirlo(p, p.idsRepetidos[0]));
    comprobar(`${quien}: mueven todos los sentados`, quienesNoMovieron(p).length === 0, {
      sinMover: quienesNoMovieron(p),
      movieron: p.movieron,
    });
    {
      const unDiario = canonico(p.diario);
      const otroDiario = canonico(otra.diario);
      comprobar(
        `${quien}: la misma semilla da la misma partida, movimiento a movimiento, aunque se juegue en otro momento`,
        otra.huella === p.huella && otroDiario === unDiario,
        otroDiario !== unDiario
          ? `los diarios (${p.diario.length} y ${otra.diario.length} movimientos) difieren ${dondeDifieren(unDiario, otroDiario)}`
          : `el mismo diario da otro estado final, ${dondeDifieren(p.huella, otra.huella)}`,
      );
    }
    let reejecutada: string;
    try {
      reejecutada = canonico(reejecutarEn(p.arcade, undefined, p.diario));
    } catch (error) {
      reejecutada = `revienta: ${String(error)}`;
    }
    comprobar(
      `${quien}: el diario que guardaría la mesa, reejecutado, da el mismo estado`,
      reejecutada === p.huella,
      `lo jugado y lo reejecutado difieren ${dondeDifieren(p.huella, reejecutada)}`,
    );
  }

  comprobar(`«${m.id}»: al menos una de sus partidas se acaba de verdad (\`seAcabo\` dice que sí)`, terminadas > 0, { terminadas });
  const sinHacer = ofrecidoYNoHecho(ofrecidas, aceptadas);
  comprobar(
    `«${m.id}»: todo tipo que el juego ofreció a menudo (en ${OFRECIDO_A_MENUDO} miradas o más) se llegó a hacer`,
    sinHacer.length === 0,
    sinHacer.map((t) => `${t}: ofrecido en ${ofrecidas[t] ?? 0} miradas y hecho 0 veces`),
  );
  const poco = Object.keys(ofrecidas).filter((t) => (ofrecidas[t] ?? 0) < OFRECIDO_A_MENUDO && (aceptadas[t] ?? 0) === 0);
  nota(`recuento de lo hecho: ${recuento(aceptadas)}`);
  if (Object.keys(declaraciones).length > 0) nota(`declaraciones que no se mandan, vistas: ${recuento(declaraciones)}`);
  if (poco.length > 0) nota(`se ofreció pocas veces y no salió: ${poco.join(', ')}`);
  nota(`${suyas.length} partidas, ${pasos} pasos, ${tics} tics que cambiaron algo, ${tiempo.toFixed(1)} s la primera vuelta`);
}

// ---------------------------------------------------------------------------
// LA VACUNA: EL BUCLE VIEJO NO PUEDE PASAR LOS SUELOS
// ---------------------------------------------------------------------------

paso('La vacuna: el bucle que elige siempre lo primero no puede pasar los suelos de avance');
const caidos: string[] = [];
for (const m of aJugar) {
  const p = jugarConElRobotGenerico(m.id, m.jugadores.minimo, SEMILLAS[0] as number, {
    politica: 'primera',
    tope: TOPE_DE_LA_VACUNA,
  });
  /* LOS MISMOS TRES SUELOS que a las partidas de verdad, con las mismas funciones. */
  const sinMover = quienesNoMovieron(p);
  const sinHacer = ofrecidoYNoHecho(p.ofrecidas, p.aceptadas);
  const cae = !avanza(p) || sinMover.length > 0 || sinHacer.length > 0;
  if (cae) caidos.push(m.id);
  nota(
    `${m.id} ×${p.asientos.length}: ${comoAcabo(p)}` +
      (sinMover.length > 0 ? ` · no mueven: ${sinMover.join(', ')}` : '') +
      (sinHacer.length > 0 ? ` · ofrecido a menudo y nunca hecho: ${sinHacer.join(', ')}` : '') +
      ` · ${cae ? 'NO PASA los suelos' : 'los pasa'} · hizo ${recuento(p.aceptadas)}`,
  );
}
comprobar(
  'el bucle viejo no pasa los suelos de avance en algún juego: los suelos miden algo',
  caidos.length > 0,
  'con la política «primera» todos los juegos terminan o siguen vivos, mueven todos los sentados y hacen todo ' +
    'lo que se les ofrece: los suelos de este comprobador ya no distinguen un robot que juega de uno que no',
);
nota(`caen con él: ${caidos.length === 0 ? 'ninguno' : caidos.join(', ')}`);
nota(`todo junto: ${((performance.now() - inicio) / 1000).toFixed(1)} s (las dos vueltas y la vacuna)`);

/*
 * EL SUELO. Hoy: 1 (ninguno en silencio) + 4 (los de hoy) + por cada uno de los 4 juegos 1 (declara
 * su final) + 3 partidas × 12 + 2 (alguna termina, todo se hizo) = 4 × 39 = 156, + 1 (la vacuna) +
 * 1 (este suelo) = 163. Un juego nuevo suma 39 y deja el suelo por debajo, que es lo correcto: el
 * arnés lo dice para que se suba el número.
 */
terminar({
  escritas: 163,
  enVerde:
    'Los cuatro arcades de mesa se juegan sin saber a qué se juega: cada opción ofrecida y\n' +
    '  elegida se puede hacer, nada revienta, al espectador no se le ofrece nada, cada partida termina o\n' +
    '  llega al tope viva, cada tipo ofrecido a menudo se hizo, la misma semilla da la misma partida y el\n' +
    '  diario reejecutado da el mismo estado. Y el bucle viejo no pasa los suelos.\n' +
    `  (Las declaraciones no se mandan: el trueque libre, la puja libre y el trato los miran sus comprobadores.)`,
});
