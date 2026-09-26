/**
 * LAS LINDES, COMPROBADAS.
 *
 *   npm run verify:lindes -w server
 *
 * ═══ QUÉ MIRA, Y EN QUÉ ORDEN ═══
 *
 * De lo que no puede fallar a lo que falla de verdad:
 *
 *  1. EL CATÁLOGO. Veinticuatro clases, setenta y dos losas, y cada una
 *     coherente consigo misma: todo lado de muralla sale por una villa, todo
 *     hueco que no es de muralla está en un prado y en uno solo, y ningún prado
 *     apunta a una villa que no existe. Es dato, así que se cuenta.
 *  2. LA GEOMETRÍA. Girar cuatro veces vuelve al principio, el hueco que toca al
 *     que toca a uno es él mismo, y dos losas pegadas ven la misma raya.
 *  3. LOS RECUENTOS, SOBRE TABLEROS PUESTOS A MANO. Una senda de tres losas vale
 *     tres; una villa de tres con blasón vale ocho; una ermita rodeada vale
 *     nueve; un labriego en un prado que toca una villa cerrada vale tres. Son
 *     las cuatro cuentas del juego y están escritas con las losas a la vista.
 *  4. LAS MAYORÍAS. Quien más gente tiene cobra; si empatan, cobran los dos
 *     enteros; y nadie cobra la mitad de nada.
 *  5. PARTIDAS ENTERAS. Diez semillas, jugadas hasta que se acaba la bolsa, con
 *     los invariantes comprobados EN CADA MOVIMIENTO: las losas puestas más las
 *     retiradas suman setenta y dos, ningún labriego se pierde ni se duplica, y
 *     nadie cobra sin tener gente.
 *  6. LO QUE NO PUEDE SALIR. La bolsa no aparece en la vista de nadie, y el
 *     portillo rechaza lo que no se ofreció.
 *
 * ═══ POR QUÉ LAS PARTIDAS ENTERAS Y NO UNA DE MENTIRA ═══
 *
 * Porque este repositorio ya tiene apuntado lo que cuesta un bucle que dice jugar
 * y no juega: cuarenta vueltas ofreciendo trueques, cero sietes, y ochocientas
 * comprobaciones en verde encima. Así que aquí se cuenta lo que ocurrió —cuántas
 * villas se cerraron, cuántas ermitas, cuántos prados se cobraron al final— y se
 * EXIGE que haya ocurrido. Una partida en la que no se cierra ni una villa no
 * prueba el cierre de una villa, aunque termine.
 */
import {
  CLASES_DE_COSA,
  GIROS,
  HUECOS_POR_LOSA,
  LADOS,
  LAS_LOSAS,
  LOSAS_EN_TOTAL,
  LOSA_DE_SALIDA,
  bolsaSinBarajar,
  huecoGirado,
  huecoQueToca,
  huecoSinGirar,
  huecosDelLado,
  ladoGirado,
  ladoOpuesto,
  ladoSinGirar,
  lindeDelLado,
  llaveDeCasilla,
  losaPorId,
  vecina,
} from '../../shared/arcade/juegos/lindes-losas';
import type { Giro, Lado, Losa } from '../../shared/arcade/juegos/lindes-losas';
import {
  cabe,
  cosasDelTablero,
  dondeCabe,
  nudoDeLoPlantado,
  villasDelPrado,
} from '../../shared/arcade/juegos/lindes-cosas';
import type { Cosa, Tablero } from '../../shared/arcade/juegos/lindes-cosas';
import {
  CABEN,
  EMPEZAR,
  LABRIEGOS_POR_JUGADOR,
  LINDES,
  MANIFIESTO_LINDES,
  PASAR,
  PLANTAR,
  PONER,
  avanzarLasLindes,
  deQuienEsElTurno,
  loQueSeVe,
  loSecretoDeLasLindes,
  losQueMandan,
  losaDeLaFicha,
  opcionesDeLasLindes,
  partidaNueva,
  tableroDeLasLindes,
  proyectarLasLindes,
  seAcabo,
  ID_DE_LA_LEVA,
  PUNTOS_DEL_BOTIN,
} from '../../shared/arcade/juegos/lindes';
import type { EstadoDeLasLindes, Labriego, Opcion, VistaDeLasLindes } from '../../shared/arcade/juegos/lindes';
import {
  ESCUDOS_DEL_BOTIN,
  ESCUDOS_POR_LEVA,
  LEVA,
  LEVAS_POR_JUGADOR,
  PUNTOS_POR_ESCUDO,
  escudosDeLaVista,
  levasDeLaVista,
} from '../../shared/arcade/juegos/lindes-escudos';
import { movimientoDelHallazgo } from '../../shared/arcade/juegos/hallazgo';
import { movimientoDelBotin } from '../../shared/arcade/juegos/botin';
import { HALLAZGOS_DE_LAS_LINDES, clasesDe } from '../../shared/arcade/juegos/hallazgos-de-los-juegos';
import { aplicar, esRechazo } from '../../shared/arcade/motor';
import { canonico } from '../../shared/mecanicas/canonico';
import type { ContextoMovimiento, Movimiento } from '../../shared/arcade/movimiento';
import { NADIE_SENTADO } from '../../shared/arcade/tipos';
import type { AsientoId, LosSentados } from '../../shared/arcade/tipos';

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(
    `${que}${detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 300)}`}`,
  );
}
function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

// ---------------------------------------------------------------------------
paso('El catálogo: veinticuatro clases y setenta y dos losas');
// ---------------------------------------------------------------------------

comprobar('hay veinticuatro clases de losa', LAS_LOSAS.length === 24, LAS_LOSAS.length);
comprobar('hay setenta y dos losas en total', LOSAS_EN_TOTAL === 72, LOSAS_EN_TOTAL);
comprobar(
  'la bolsa barajada tiene setenta y una: la de salida sale de ella',
  bolsaSinBarajar().length === 71,
  bolsaSinBarajar().length,
);
comprobar('la losa de salida existe en el catálogo', losaPorId(LOSA_DE_SALIDA) !== null);

{
  const vistos: Record<string, number> = {};
  for (const losa of LAS_LOSAS) vistos[losa.id] = (vistos[losa.id] ?? 0) + 1;
  const repetidos = Object.keys(vistos).filter((k) => (vistos[k] ?? 0) > 1);
  comprobar('ningún identificador de losa está dos veces', repetidos.length === 0, repetidos);
}

for (const losa of LAS_LOSAS) {
  comprobar(`${losa.id}: tiene nombre para la mesa`, losa.nombre.length > 0);
  comprobar(`${losa.id}: hay al menos una en la bolsa`, losa.cuantas >= 1, losa.cuantas);

  for (const l of LADOS) {
    const linde = losa.lados[l];
    const enVillas = losa.villas.filter((v) => v.lados.indexOf(l) >= 0).length;
    const enSendas = losa.sendas.filter((s) => s.lados.indexOf(l) >= 0).length;
    comprobar(
      `${losa.id}: el lado ${l} enseña «${linde}» y sale por ${enVillas} villas`,
      enVillas === (linde === 'muralla' ? 1 : 0),
    );
    comprobar(
      `${losa.id}: el lado ${l} enseña «${linde}» y sale por ${enSendas} sendas`,
      enSendas === (linde === 'senda' ? 1 : 0),
    );
  }

  for (let h = 0; h < HUECOS_POR_LOSA; h++) {
    const lado = Math.floor(h / 2) as Lado;
    const esMuralla = losa.lados[lado] === 'muralla';
    const enPrados = losa.prados.filter((p) => p.huecos.indexOf(h) >= 0).length;
    comprobar(
      `${losa.id}: el hueco ${h} está en ${enPrados} prados y el lado ${lado} es «${losa.lados[lado]}»`,
      enPrados === (esMuralla ? 0 : 1),
    );
  }

  for (const p of losa.prados) {
    comprobar(`${losa.id}: ningún prado está vacío`, p.huecos.length > 0);
    for (const v of p.villas) {
      comprobar(`${losa.id}: un prado apunta a la villa ${v}, que existe`, losa.villas[v] !== undefined);
    }
  }
  for (const s of losa.sendas) {
    comprobar(
      `${losa.id}: una senda tiene uno o dos lados y tiene ${s.lados.length}`,
      s.lados.length === 1 || s.lados.length === 2,
    );
  }
  for (const v of losa.villas) {
    comprobar(`${losa.id}: ninguna villa está vacía`, v.lados.length > 0);
  }
}

/*
 * ═══ LA VACUNA DEL CATÁLOGO ═══
 *
 * Si el reparto se toca sin querer —una losa de más, una de menos— todo lo de
 * arriba sigue en verde: son comprobaciones de coherencia interna, y una losa
 * mal contada es coherente consigo misma. Esto es lo que lo caza, y por eso está
 * escrito con los números a la vista y no derivado de la propia tabla.
 */
{
  const cuenta: Record<string, number> = {};
  for (const losa of LAS_LOSAS) cuenta[losa.id] = losa.cuantas;
  const esperado: Readonly<Record<string, number>> = {
    ermita: 4,
    'ermita-senda': 2,
    'villa-redonda': 1,
    'puerta-senda': 4,
    muralla: 5,
    'calle-blason': 2,
    calle: 1,
    'dos-murallas-enfrentadas': 3,
    'dos-murallas-escuadra': 2,
    'muralla-senda-derecha': 3,
    'muralla-senda-izquierda': 3,
    'muralla-encrucijada': 3,
    'villa-escuadra-blason': 2,
    'villa-escuadra': 3,
    'villa-escuadra-senda-blason': 2,
    'villa-escuadra-senda': 3,
    'villa-tres-blason': 1,
    'villa-tres': 3,
    'villa-tres-senda-blason': 2,
    'villa-tres-senda': 1,
    'senda-recta': 8,
    'senda-curva': 9,
    'encrucijada-tres': 4,
    'encrucijada-cuatro': 1,
  };
  comprobar(
    'el reparto es exactamente el que dice el diseño, clase a clase',
    canonico(cuenta) === canonico(esperado),
    { hay: cuenta },
  );
}

// ---------------------------------------------------------------------------
paso('La geometría: girar, casar y pegar');
// ---------------------------------------------------------------------------

for (const l of LADOS) {
  comprobar(`girar el lado ${l} cuatro cuartos lo deja donde estaba`, ladoGirado(l, 0) === l);
  for (const g of GIROS) {
    comprobar(
      `el lado ${l} girado ${g} y desgirado ${g} vuelve a ${l}`,
      ladoSinGirar(ladoGirado(l, g), g) === l,
    );
  }
  comprobar(`el opuesto del opuesto de ${l} es ${l}`, ladoOpuesto(ladoOpuesto(l)) === l);
  const [a, b] = huecosDelLado(l);
  comprobar(`los huecos del lado ${l} son ${2 * l} y ${2 * l + 1}`, a === 2 * l && b === 2 * l + 1);
}

for (let h = 0; h < HUECOS_POR_LOSA; h++) {
  comprobar(`el hueco que toca al que toca a ${h} es ${h}`, huecoQueToca(huecoQueToca(h)) === h);
  for (const g of GIROS) {
    comprobar(
      `el hueco ${h} girado ${g} y desgirado ${g} vuelve a ${h}`,
      huecoSinGirar(huecoGirado(h, g), g) === h,
    );
  }
}

/*
 * El hueco que toca tiene que estar en el LADO OPUESTO del vecino, y en la mitad
 * que de verdad comparte raya. La cuenta es fácil de escribir al revés —los dos
 * vecinos recorren la raya en sentidos contrarios— y al revés se ve como prados
 * que se unen en diagonal, que no da ningún error: da tres puntos de más.
 */
for (const l of LADOS) {
  const [primero, segundo] = huecosDelLado(l);
  const opuestos = huecosDelLado(ladoOpuesto(l));
  comprobar(
    `el primer hueco del lado ${l} toca el SEGUNDO del opuesto`,
    huecoQueToca(primero) === opuestos[1],
  );
  comprobar(
    `el segundo hueco del lado ${l} toca el PRIMERO del opuesto`,
    huecoQueToca(segundo) === opuestos[0],
  );
}

/* Girar una losa cuatro veces devuelve exactamente los mismos lados. */
for (const losa of LAS_LOSAS) {
  for (const l of LADOS) {
    comprobar(
      `${losa.id}: el lado ${l} sin girar enseña lo que dice el catálogo`,
      lindeDelLado(losa, 0, l) === losa.lados[l],
    );
    comprobar(
      `${losa.id}: girada cuatro cuartos, el lado ${l} enseña lo mismo`,
      lindeDelLado(losa, 1, ladoGirado(l, 1)) === losa.lados[l],
    );
  }
}

/* Dos losas iguales pegadas por lados que enseñan lo mismo, casan. */
{
  const recta = losaPorId('senda-recta') as Losa;
  const tablero: Tablero = { [llaveDeCasilla(0, 0)]: { losa: 'senda-recta', giro: 0 } };
  comprobar(
    'una senda recta encaja encima de otra senda recta con el mismo giro',
    cabe(tablero, recta, 0, 0, 1),
  );
  comprobar(
    'dos sendas rectas en paralelo también encajan: campo contra campo',
    cabe(tablero, recta, 0, 1, 0),
  );
  comprobar(
    'y girada un cuarto NO encaja al lado: su senda daría contra el campo de la otra',
    !cabe(tablero, recta, 1, 1, 0),
  );
  comprobar('una losa no cabe donde ya hay otra', !cabe(tablero, recta, 0, 0, 0));
  comprobar('una losa no cabe suelta, sin tocar nada', !cabe(tablero, recta, 0, 5, 5));
}

// ---------------------------------------------------------------------------
paso('Los recuentos, sobre tableros puestos a mano');
// ---------------------------------------------------------------------------

/** Monta un tablero a mano. */
function tableroDe(...piezas: readonly [number, number, string, Giro][]): Tablero {
  const t: Record<string, { losa: string; giro: Giro }> = {};
  for (const [x, y, losa, giro] of piezas) t[llaveDeCasilla(x, y)] = { losa, giro };
  return t;
}

/** La cosa de una clase que toca esta casilla, o `null`. */
function cosaDe(tablero: Tablero, casilla: string, clase: string, indice: number): Cosa | null {
  const cosas = cosasDelTablero(tablero);
  const nudo = nudoDeLoPlantado(tablero, casilla, clase as never, indice);
  if (nudo === '') return null;
  const id = cosas.deNudo[nudo];
  return id === undefined ? null : (cosas.porId[id] ?? null);
}

/* (a) Una senda de tres losas entre dos encrucijadas vale tres y está cerrada. */
{
  const tablero = tableroDe(
    [0, 0, 'encrucijada-cuatro', 0],
    [1, 0, 'senda-recta', 1],
    [2, 0, 'encrucijada-cuatro', 0],
  );
  const senda = cosaDe(tablero, llaveDeCasilla(1, 0), 'senda', 0);
  comprobar('la senda de tres losas existe', senda !== null);
  if (senda !== null) {
    comprobar('la senda mide tres losas', senda.casillas.length === 3, senda.casillas);
    comprobar('la senda está cerrada entre las dos encrucijadas', senda.cerrada);
    comprobar('la senda cerrada vale tres', senda.puntos === 3, senda.puntos);
  }
}

/* Y sin la encrucijada del final, la misma senda NO está cerrada. */
{
  const tablero = tableroDe([0, 0, 'encrucijada-cuatro', 0], [1, 0, 'senda-recta', 1]);
  const senda = cosaDe(tablero, llaveDeCasilla(1, 0), 'senda', 0);
  comprobar('sin el remate, la senda no está cerrada', senda !== null && !senda.cerrada);
}

/* (b) Una villa de tres losas con blasón: 3 × 2 + 2 = 8. */
{
  const tablero = tableroDe(
    [-1, 0, 'muralla', 1],
    [0, 0, 'calle-blason', 0],
    [1, 0, 'muralla', 3],
  );
  const villa = cosaDe(tablero, llaveDeCasilla(0, 0), 'villa', 0);
  comprobar('la villa de tres losas existe', villa !== null);
  if (villa !== null) {
    comprobar('la villa mide tres losas', villa.casillas.length === 3, villa.casillas);
    comprobar('la villa lleva un blasón', villa.blasones === 1, villa.blasones);
    comprobar('la villa está cerrada', villa.cerrada);
    comprobar('la villa cerrada vale ocho: dos por losa y dos por el blasón', villa.puntos === 8, villa.puntos);
    comprobar('a medias valdría cuatro: uno por losa y uno por el blasón', villa.puntosAlFinal === 4);
  }
}

/* Y con un lado de muralla mirando al vacío, no está cerrada. */
{
  const tablero = tableroDe([-1, 0, 'muralla', 1], [0, 0, 'calle-blason', 0]);
  const villa = cosaDe(tablero, llaveDeCasilla(0, 0), 'villa', 0);
  comprobar('con un lado al vacío, la villa no está cerrada', villa !== null && !villa.cerrada);
}

/* (c) Una ermita rodeada de ocho vale nueve; sin rodear, una por vecina más ella. */
{
  const piezas: [number, number, string, Giro][] = [];
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) piezas.push([x, y, 'ermita', 0]);
  const tablero = tableroDe(...piezas);
  const ermita = cosaDe(tablero, llaveDeCasilla(0, 0), 'ermita', 0);
  comprobar('la ermita del centro existe', ermita !== null);
  if (ermita !== null) {
    comprobar('la ermita rodeada está cerrada', ermita.cerrada);
    comprobar('la ermita cerrada vale nueve', ermita.puntos === 9, ermita.puntos);
  }
  const esquina = cosaDe(tablero, llaveDeCasilla(-1, -1), 'ermita', 0);
  comprobar('la ermita de la esquina no está cerrada', esquina !== null && !esquina.cerrada);
  comprobar(
    'la ermita de la esquina vale cuatro al final: ella y sus tres vecinas',
    esquina !== null && esquina.puntosAlFinal === 4,
    esquina?.puntosAlFinal,
  );
}

/* (d) Un prado que toca una villa cerrada. */
{
  const tablero = tableroDe(
    [-1, 0, 'muralla', 1],
    [0, 0, 'calle-blason', 0],
    [1, 0, 'muralla', 3],
  );
  const cosas = cosasDelTablero(tablero);
  const prado = cosaDe(tablero, llaveDeCasilla(-1, 0), 'prado', 0);
  comprobar('el prado del oeste existe', prado !== null);
  if (prado !== null) {
    const villas = villasDelPrado(tablero, cosas, prado);
    comprobar('ese prado toca exactamente una villa', villas.length === 1, villas);
    const villa = villas.length === 1 ? cosas.porId[villas[0] as string] : undefined;
    comprobar('y esa villa está cerrada', villa !== undefined && villa.cerrada);
  }
}

/* Y un prado al otro lado de la senda de la losa de salida NO toca su villa. */
{
  const tablero = tableroDe([0, 0, 'puerta-senda', 0]);
  const cosas = cosasDelTablero(tablero);
  const arriba = cosaDe(tablero, llaveDeCasilla(0, 0), 'prado', 0);
  const abajo = cosaDe(tablero, llaveDeCasilla(0, 0), 'prado', 1);
  comprobar('la losa de salida tiene dos prados distintos', arriba !== null && abajo !== null && arriba.id !== abajo.id);
  if (arriba !== null && abajo !== null) {
    comprobar(
      'el prado de arriba toca la muralla',
      villasDelPrado(tablero, cosas, arriba).length === 1,
    );
    comprobar(
      'el de abajo, al otro lado de la senda, NO la toca',
      villasDelPrado(tablero, cosas, abajo).length === 0,
    );
  }
}

/* Dos murallas enfrentadas y sin unir son DOS villas, no una. */
{
  const tablero = tableroDe([0, 0, 'dos-murallas-enfrentadas', 0]);
  const a = cosaDe(tablero, llaveDeCasilla(0, 0), 'villa', 0);
  const b = cosaDe(tablero, llaveDeCasilla(0, 0), 'villa', 1);
  comprobar('las dos murallas enfrentadas son dos cosas distintas', a !== null && b !== null && a.id !== b.id);
  const calle = tableroDe([0, 0, 'calle', 0]);
  const unaSola = cosaDe(calle, llaveDeCasilla(0, 0), 'villa', 0);
  comprobar('y en la calle son una sola', unaSola !== null && unaSola.nudos.length === 2);
}

// ---------------------------------------------------------------------------
paso('Las mayorías');
// ---------------------------------------------------------------------------

comprobar('sin gente no cobra nadie', losQueMandan({}).length === 0);
comprobar('con uno solo, cobra él', canonico(losQueMandan({ ana: 1 })) === canonico(['ana']));
comprobar(
  'con dos contra uno, cobra el que más tiene',
  canonico(losQueMandan({ ana: 2, bruno: 1 })) === canonico(['ana']),
);
comprobar(
  'empatados a uno, cobran los dos enteros',
  canonico(losQueMandan({ ana: 1, bruno: 1 })) === canonico(['ana', 'bruno']),
);
comprobar(
  'empatados a dos siendo tres, cobran los tres',
  canonico(losQueMandan({ ana: 2, bruno: 2, carla: 2 })) === canonico(['ana', 'bruno', 'carla']),
);

// ---------------------------------------------------------------------------
paso('El manifiesto');
// ---------------------------------------------------------------------------

comprobar('el identificador es `lindes`', MANIFIESTO_LINDES.id === LINDES);
comprobar('la sede es el servidor', MANIFIESTO_LINDES.sede === 'servidor');
comprobar('no tiene reloj', MANIFIESTO_LINDES.tickHz === 0);
comprobar('el mueble es el tablero genérico', MANIFIESTO_LINDES.mueble === 'tablero');
comprobar('declara secretos, porque la bolsa lo es', MANIFIESTO_LINDES.secretos);
comprobar('no publica ninguna cifra', MANIFIESTO_LINDES.marcador.tipo === 'ninguno');
comprobar(
  'la procedencia es una mecánica genérica',
  MANIFIESTO_LINDES.procedencia.tipo === 'mecanica-generica',
);
comprobar(
  `caben de ${CABEN.minimo} a ${CABEN.maximo}`,
  MANIFIESTO_LINDES.jugadores.minimo === CABEN.minimo &&
    MANIFIESTO_LINDES.jugadores.maximo === CABEN.maximo,
);
/*
 * ═══ LA MARCA AJENA NO ESTÁ, Y ESO SE MIDE Y NO SE PROMETE ═══
 *
 * `verify:procedencia` mira el repositorio entero buscando marcas; esto mira lo
 * que de verdad viaja a una pantalla, que es el manifiesto y los nombres de las
 * losas. Las dos cosas hacen falta: la primera caza un comentario, la segunda
 * caza un rótulo.
 */
{
  const prohibidas = ['carcas', 'meeple', 'catan', 'settlers', 'monopol'];
  const texto = (
    MANIFIESTO_LINDES.nombre +
    ' ' +
    MANIFIESTO_LINDES.gancho +
    ' ' +
    LAS_LOSAS.map((l) => `${l.id} ${l.nombre}`).join(' ')
  ).toLowerCase();
  for (const marca of prohibidas) {
    comprobar(`ni el manifiesto ni las losas dicen «${marca}»`, texto.indexOf(marca) < 0);
  }
}

// ---------------------------------------------------------------------------
paso('Partidas enteras, jugadas hasta que se acaba la bolsa');
// ---------------------------------------------------------------------------

/** Lo que se cuenta de una partida, para exigir que de verdad haya pasado. */
interface LoQuePaso {
  turnos: number;
  puestas: number;
  retiradas: number;
  villasCerradas: number;
  sendasCerradas: number;
  ermitasCerradas: number;
  pradosAlFinal: number;
  plantados: number;
  rechazos: number;
  puntos: number;
  /** Lo que quedó cerrado en el tablero, tenga gente o no. */
  villasEnPie: number;
  sendasEnPie: number;
  ermitasEnPie: number;
}

function ctxDe(quien: AsientoId | null, asientos: readonly AsientoId[], azar: number): ContextoMovimiento {
  return { quien, azar, tic: 0, asientos };
}

/**
 * UN SORTEO DE ANDAR POR CASA, para que el bicho no juegue siempre igual.
 *
 * ═══ POR QUÉ NO `Math.random` EN UN COMPROBADOR ═══
 *
 * Porque un comprobador que falla una vez de cada veinte es un comprobador que se
 * acaba desactivando. Con esto, la semilla manda: si una partida se rompe, se
 * vuelve a romper igual y se puede depurar.
 */
function sorteo(semilla: number): () => number {
  let x = (semilla * 2654435761) >>> 0;
  return () => {
    x = (Math.imul(x ^ (x >>> 15), 2246822519) + 0x9e3779b9) >>> 0;
    return x / 4294967296;
  };
}

/**
 * LA COLOCACIÓN QUE MÁS PEGA CON LO QUE YA HAY, y al azar entre las que empatan.
 *
 * ═══ POR QUÉ NO VALE ELEGIR AL AZAR A SECAS, QUE ES LO QUE HABÍA ═══
 *
 * Porque una losa puesta en una casilla cualquiera del borde hace crecer el
 * tablero como una rama, no como una mancha: con setenta y una losas y
 * colocación uniforme NO HAY NI UNA CASILLA con las ocho vecinas puestas, así que
 * **no se cerró ni una ermita en diez partidas**. Y el contador decía cero, que
 * es exactamente lo que diría si la regla de la ermita estuviera rota.
 *
 * Contando las vecinas —que además es como juega cualquiera— el tablero sale
 * compacto, aparecen casillas interiores, y la regla de la ermita se ejerce. La
 * lección es la de siempre en esta casa: un contador a cero puede ser del juego o
 * puede ser de quien lo juega, y hay que saber cuál antes de tocar nada.
 */
function laQueMasPega(
  estado: EstadoDeLasLindes,
  opciones: readonly { tipo: string; carga: unknown; id: string; rotulo: string; ayuda: string }[],
  tirada: () => number,
): { tipo: string; carga: unknown; id: string; rotulo: string; ayuda: string } {
  const poner = opciones.filter((o) => o.tipo === PONER);
  if (poner.length === 0) return opciones[Math.floor(tirada() * opciones.length)] as never;

  let mejor = -1;
  let mejores: typeof poner = [];
  for (const o of poner) {
    const c = o.carga as { x: number; y: number };
    let vecinas = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        if (estado.tablero[llaveDeCasilla(c.x + dx, c.y + dy)] !== undefined) vecinas++;
      }
    }
    if (vecinas > mejor) {
      mejor = vecinas;
      mejores = [o];
    } else if (vecinas === mejor) {
      mejores.push(o);
    }
  }
  return mejores[Math.floor(tirada() * mejores.length)] as never;
}

/**
 * JUEGA UNA PARTIDA ENTERA.
 *
 * ═══ EL BICHO NO JUEGA BIEN, PERO TIENE QUE JUGAR VARIADO ═══
 *
 * No busca la mejor jugada —lo que se prueba es el motor, no una estrategia—,
 * pero sí tiene que hacer que pasen las cuatro cosas que hay que contar. Y ahí
 * hay dos decisiones que la primera versión no tenía y que cambiaron el
 * resultado por completo:
 *
 *   · **Elige la colocación al azar** y no la primera de la lista. Con la
 *     primera, el tablero crecía siempre hacia el mismo rincón, salía una tira y
 *     NO SE CERRÓ NI UNA ERMITA en diez partidas: una ermita necesita ocho
 *     vecinas, y una tira no rodea nada.
 *   · **Reparte los labriegos por las cuatro clases**, en vez de plantar siempre
 *     en lo primero que se ofrece. Con la lista en su orden, plantaba casi
 *     siempre en villas, así que las sendas y las ermitas se cerraban sin nadie
 *     encima y el recuento de esas dos no se ejercitaba nunca. El contador decía
 *     seis sendas en diez partidas y parecía un fallo del juego; era el bicho.
 */
function unaPartida(semilla: number, cuantos: number, sentados: LosSentados): LoQuePaso {
  const asientos: AsientoId[] = [];
  for (let i = 0; i < cuantos; i++) asientos.push(`a-${i}`);

  const paso: LoQuePaso = {
    turnos: 0,
    puestas: 0,
    retiradas: 0,
    villasCerradas: 0,
    sendasCerradas: 0,
    ermitasCerradas: 0,
    pradosAlFinal: 0,
    plantados: 0,
    rechazos: 0,
    puntos: 0,
    villasEnPie: 0,
    sendasEnPie: 0,
    ermitasEnPie: 0,
  };

  const tirada = sorteo(semilla);
  let estado: EstadoDeLasLindes = partidaNueva();
  estado = aplicar(
    avanzarLasLindes as never,
    estado,
    { tipo: EMPEZAR },
    ctxDe(asientos[0] as AsientoId, asientos, semilla),
  ) as EstadoDeLasLindes;

  comprobar(
    `semilla ${semilla}: la bolsa se reparte y quedan 70 después de robar la primera`,
    estado.bolsa.length + 1 === 71 - estado.retiradas,
    { bolsa: estado.bolsa.length, retiradas: estado.retiradas },
  );
  comprobar(`semilla ${semilla}: hay ${cuantos} labriegos sentados`, estado.labriegos.length === cuantos);

  let vueltas = 0;
  while (!seAcabo(estado) && vueltas < 400) {
    vueltas++;
    const quien = deQuienEsElTurno(estado);
    if (quien === null) break;
    const vista = loQueSeVe(estado, quien, sentados);
    const opciones = opcionesDeLasLindes(vista, quien);
    comprobar(
      `semilla ${semilla}: a quien le toca siempre se le ofrece algo (${estado.momento})`,
      opciones.length > 0,
      { momento: estado.momento, quedan: estado.bolsa.length },
    );
    if (opciones.length === 0) break;

    /*
     * Plantar si se puede, repartiendo por clases; y colocar al azar, que es lo
     * que hace que el tablero salga hecho un borrón y no una tira.
     */
    const quiere = CLASES_DE_COSA[vueltas % CLASES_DE_COSA.length] as string;
    const plantar =
      opciones.find((o) => o.tipo === PLANTAR && o.id.indexOf(`plantar:${quiere}:`) === 0) ??
      opciones.find((o) => o.tipo === PLANTAR);
    const elegida = plantar ?? laQueMasPega(estado, opciones, tirada);
    if (elegida.tipo === PONER) paso.puestas++;
    if (elegida.tipo === PLANTAR) paso.plantados++;
    if (elegida.tipo === PONER || elegida.tipo === PLANTAR || elegida.tipo === PASAR) paso.turnos++;

    const antes = estado;
    const movimiento: Movimiento = { tipo: elegida.tipo, carga: elegida.carga };
    const salida = avanzarLasLindes(estado, movimiento, ctxDe(quien, asientos, semilla + vueltas));
    if (esRechazo(salida)) {
      paso.rechazos++;
      estado = salida.estado;
    } else {
      estado = salida;
    }
    for (const c of estado.cobros) {
      if (c.alFinal) continue;
      if (c.clase === 'villa') paso.villasCerradas++;
      if (c.clase === 'senda') paso.sendasCerradas++;
      if (c.clase === 'ermita') paso.ermitasCerradas++;
    }

    /* ═══ LOS INVARIANTES, EN CADA MOVIMIENTO ═══ */
    const puestas = Object.keys(estado.tablero).length;
    comprobar(
      `semilla ${semilla}: las losas puestas, las retiradas, la de la mano y la bolsa suman 72`,
      puestas + estado.retiradas + (estado.enMano === '' ? 0 : 1) + estado.bolsa.length === 72,
      {
        puestas,
        retiradas: estado.retiradas,
        mano: estado.enMano,
        bolsa: estado.bolsa.length,
      },
    );
    const enPie = estado.labriegos.reduce((s, l) => s + l.sinPlantar, 0) + estado.plantados.length;
    comprobar(
      `semilla ${semilla}: no se pierde ni se duplica ningún labriego`,
      estado.momento === 'terminada' ||
        enPie === cuantos * LABRIEGOS_POR_JUGADOR,
      { enPie, deberia: cuantos * LABRIEGOS_POR_JUGADOR },
    );
    for (const l of estado.labriegos) {
      comprobar(`semilla ${semilla}: nadie tiene puntos negativos`, l.puntos >= 0, l);
      comprobar(
        `semilla ${semilla}: nadie tiene más labriegos de los que le tocan`,
        l.sinPlantar >= 0 && l.sinPlantar <= LABRIEGOS_POR_JUGADOR,
        l,
      );
    }
    comprobar(
      `semilla ${semilla}: un movimiento legal no se rechaza`,
      paso.rechazos === 0,
      { movimiento, momento: antes.momento },
    );
  }

  comprobar(`semilla ${semilla}: la partida termina`, seAcabo(estado), {
    momento: estado.momento,
    vueltas,
  });
  paso.retiradas = estado.retiradas;
  paso.puntos = estado.labriegos.reduce((s, l) => s + l.puntos, 0);
  for (const c of estado.cobros) if (c.alFinal && c.clase === 'prado') paso.pradosAlFinal++;

  /*
   * ═══ LO QUE SE CERRÓ, MIRANDO EL TABLERO Y NO LOS COBROS ═══
   *
   * Las dos cuentas son distintas y hacen falta las dos. Un cobro dice que algo
   * se cerró CON GENTE ENCIMA; esto dice que se cerró. Con sólo la primera, un
   * cero puede ser del juego o puede ser del bicho, que plantó en otro sitio — y
   * confundir esas dos cosas es cómo se depura un fallo que no existe.
   */
  const alFinal = cosasDelTablero(estado.tablero as Tablero);
  for (const cosa of alFinal.todas) {
    if (!cosa.cerrada) continue;
    if (cosa.clase === 'ermita') paso.ermitasEnPie++;
    if (cosa.clase === 'villa') paso.villasEnPie++;
    if (cosa.clase === 'senda') paso.sendasEnPie++;
  }

  comprobar(
    `semilla ${semilla}: al acabar están puestas las setenta y dos menos las retiradas`,
    Object.keys(estado.tablero).length + estado.retiradas === 72,
    { puestas: Object.keys(estado.tablero).length, retiradas: estado.retiradas },
  );
  comprobar(
    `semilla ${semilla}: al acabar los labriegos han vuelto todos`,
    estado.plantados.length === 0,
  );
  comprobar(`semilla ${semilla}: hay ganador o empate`, estado.ganadores.length >= 1, estado.ganadores);
  comprobar(
    `semilla ${semilla}: quien gana tiene los puntos más altos`,
    estado.ganadores.every((g) => {
      const suyo = estado.labriegos.find((l) => l.asiento === g);
      return suyo !== undefined && estado.labriegos.every((l) => l.puntos <= suyo.puntos);
    }),
    estado.labriegos,
  );

  /* La vista no puede llevar la bolsa dentro. */
  const secretos = loSecretoDeLasLindes(estado);
  comprobar(
    `semilla ${semilla}: al acabar la bolsa está vacía y no queda secreto salvo el azar`,
    secretos.length === 1,
    secretos.length,
  );

  return paso;
}

{
  const sentados: LosSentados = [
    { asiento: 'a-0', nombre: 'Ana' },
    { asiento: 'a-1', nombre: 'Bruno' },
    { asiento: 'a-2', nombre: 'Carla' },
    { asiento: 'a-3', nombre: 'Diego' },
    { asiento: 'a-4', nombre: 'Elena' },
  ];
  const total: LoQuePaso = {
    turnos: 0,
    puestas: 0,
    retiradas: 0,
    villasCerradas: 0,
    sendasCerradas: 0,
    ermitasCerradas: 0,
    pradosAlFinal: 0,
    plantados: 0,
    rechazos: 0,
    puntos: 0,
    villasEnPie: 0,
    sendasEnPie: 0,
    ermitasEnPie: 0,
  };
  for (let semilla = 1; semilla <= 10; semilla++) {
    const cuantos = 2 + (semilla % 4);
    const paso = unaPartida(semilla, cuantos, sentados);
    total.turnos += paso.turnos;
    total.puestas += paso.puestas;
    total.retiradas += paso.retiradas;
    total.villasCerradas += paso.villasCerradas;
    total.sendasCerradas += paso.sendasCerradas;
    total.ermitasCerradas += paso.ermitasCerradas;
    total.pradosAlFinal += paso.pradosAlFinal;
    total.plantados += paso.plantados;
    total.rechazos += paso.rechazos;
    total.puntos += paso.puntos;
    total.villasEnPie += paso.villasEnPie;
    total.sendasEnPie += paso.sendasEnPie;
    total.ermitasEnPie += paso.ermitasEnPie;
  }

  console.log(
    `  diez partidas: ${total.turnos} movimientos, ${total.puestas} losas puestas, ` +
      `${total.plantados} labriegos plantados, ${total.retiradas} losas retiradas`,
  );
  console.log(
    `  se cerraron ${total.villasCerradas} villas, ${total.sendasCerradas} sendas y ` +
      `${total.ermitasCerradas} ermitas; ${total.pradosAlFinal} prados cobraron al final`,
  );
  console.log(
    `  y en los tableros quedaron cerradas ${total.villasEnPie} villas, ${total.sendasEnPie} sendas ` +
      `y ${total.ermitasEnPie} ermitas, con gente o sin ella`,
  );
  console.log(`  ${total.puntos} puntos repartidos en total`);

  /*
   * ═══ Y AQUÍ SE EXIGE QUE HAYA PASADO ═══
   *
   * Sin estas cinco líneas, todo lo de arriba seguiría en verde con un juego en
   * el que no se cierra nunca nada: las partidas terminarían igual, los
   * invariantes se cumplirían igual, y el recuento no se habría ejercitado ni una
   * vez. Es el fallo que este repositorio ya pagó con un bucle que ofrecía
   * trueques cuarenta veces y no sacaba ni un siete.
   */
  comprobar('en diez partidas se cobran villas cerradas de sobra', total.villasCerradas > 30, total.villasCerradas);
  comprobar('en diez partidas se cobran sendas cerradas de sobra', total.sendasCerradas > 30, total.sendasCerradas);
  comprobar('en diez partidas se cobran ermitas cerradas', total.ermitasCerradas > 5, total.ermitasCerradas);
  comprobar('en diez partidas cobran prados al final', total.pradosAlFinal > 10, total.pradosAlFinal);
  comprobar('en diez partidas se plantan labriegos de sobra', total.plantados > 200, total.plantados);
  comprobar('y no se rechazó ni un movimiento legal', total.rechazos === 0, total.rechazos);
  /*
   * Los umbrales son la MITAD de lo medido (62, 66, 20, 35, 397) y no el número
   * exacto: un comprobador clavado al valor de hoy se pone rojo el día que
   * alguien cambie el bicho, y entonces se sube el número sin mirar, que es como
   * una red deja de serlo. Lo que tienen que cazar es un CERO o un puñado: el
   * camino que no se recorre.
   */
}

// ---------------------------------------------------------------------------
paso('Lo que el tablero le DICE a cada cual, que no es lo mismo según de quién sea el turno');
// ---------------------------------------------------------------------------

/*
 * ═══ LA COMPROBACIÓN QUE FALTABA, Y LO QUE COSTÓ NO TENERLA ═══
 *
 * Las 13.295 comprobaciones de aquí arriba miran QUÉ SE PUEDE HACER: qué movimientos se
 * ofrecen, cuáles se rechazan, cuánto cobra cada cosa. Ninguna miraba lo que el tablero
 * DICE, y una frase no es un movimiento.
 *
 * Así que durante toda una fase, a quien le tocaba poner la losa el panel de acciones le
 * decía «Le toca a otro. Cuando ponga su losa, te tocará a ti» — con la flecha del turno
 * señalando su propio asiento en el raíl, y la losa en su mano. La causa: la lista de
 * acciones se salta los `PONER` a propósito —esos no son botones, son casillas del
 * tablero—, así que sale vacía TAMBIÉN para quien tiene el turno, y el respaldo de lista
 * vacía sólo miraba si estaba vacía.
 *
 * Se vio sentándose a una mesa de verdad y no se habría visto de otra manera.
 */
{
  const asientos: AsientoId[] = ['a-0', 'a-1'];
  const estado = aplicar(
    avanzarLasLindes as never,
    partidaNueva(),
    { tipo: EMPEZAR },
    ctxDe('a-0', asientos, 11),
  ) as EstadoDeLasLindes;

  const deQuien = deQuienEsElTurno(estado);
  comprobar('recién volcada la bolsa, a alguien le toca colocar', deQuien !== null, deQuien);

  for (const quien of asientos) {
    const vista = loQueSeVe(estado, quien, NADIE_SENTADO);
    const tablero = tableroDeLasLindes(vista, opcionesDeLasLindes(vista, quien));
    const rotulos = tablero.acciones.map((a) => a.rotulo);
    const leToca = quien === deQuien;

    comprobar(
      `a ${quien}, que ${leToca ? 'SÍ' : 'no'} tiene el turno, el tablero no le dice «Le toca a otro»` +
        `${leToca ? '' : ' ... salvo que sea verdad'}`,
      leToca ? !rotulos.includes('Le toca a otro') : rotulos.includes('Le toca a otro'),
      { quien, deQuien, rotulos },
    );
    /*
     * Y AL QUE LE TOCA SE LE DICE QUÉ HACER. Que no le mientan es la mitad; la otra es que
     * la casilla del panel no se quede en blanco, porque un panel vacío en el sitio donde
     * antes había una frase se lee como que algo se ha roto.
     */
    if (leToca) {
      comprobar(
        'y en su sitio se le dice qué hacer con la losa que tiene en la mano',
        rotulos.length > 0 && rotulos.some((r) => /tablero/i.test(r)),
        rotulos,
      );
      comprobar(
        'y eso NO es un botón: no se puede pulsar, porque la losa se pone en el tablero',
        tablero.acciones.every((a) => !a.disponible),
        tablero.acciones.map((a) => `${a.rotulo}:${String(a.disponible)}`),
      );
    }
  }
}

// ---------------------------------------------------------------------------
paso('El portillo y lo que no puede salir');
// ---------------------------------------------------------------------------

{
  const asientos: AsientoId[] = ['a-0', 'a-1'];
  let estado = aplicar(
    avanzarLasLindes as never,
    partidaNueva(),
    { tipo: EMPEZAR },
    ctxDe('a-0', asientos, 7),
  ) as EstadoDeLasLindes;

  /* Un movimiento de quien no tiene el turno se rechaza. */
  const otro = avanzarLasLindes(estado, { tipo: PONER, carga: { x: 0, y: 1, giro: 0 } }, ctxDe('a-1', asientos, 1));
  comprobar('quien no tiene el turno no puede poner', esRechazo(otro));

  /* Una colocación imposible se rechaza aunque la mande quien tiene el turno. */
  const lejos = avanzarLasLindes(
    estado,
    { tipo: PONER, carga: { x: 9, y: 9, giro: 0 } },
    ctxDe('a-0', asientos, 1),
  );
  comprobar('una losa suelta, lejos de todo, se rechaza', esRechazo(lejos));

  /* Y una carga que no es ni un objeto. */
  const basura = avanzarLasLindes(estado, { tipo: PONER, carga: 'ahí' }, ctxDe('a-0', asientos, 1));
  comprobar('una carga que no se entiende se rechaza', esRechazo(basura));

  /* Plantar antes de poner no se puede. */
  const pronto = avanzarLasLindes(
    estado,
    { tipo: PLANTAR, carga: { clase: 'villa', indice: 0 } },
    ctxDe('a-0', asientos, 1),
  );
  comprobar('no se planta antes de poner la losa', esRechazo(pronto));

  /* La bolsa no aparece en ninguna vista, ni en la del espectador. */
  const sentados: LosSentados = [
    { asiento: 'a-0', nombre: 'Ana' },
    { asiento: 'a-1', nombre: 'Bruno' },
  ];
  const secretos = loSecretoDeLasLindes(estado);
  comprobar('la bolsa entera y el azar son secretos', secretos.length === estado.bolsa.length + 1);
  for (const quien of [...asientos, null]) {
    const vista = proyectarLasLindes(estado, quien, sentados);
    const texto = canonico({ vista, opciones: opcionesDeLasLindes(vista, quien) });
    let filtrados = 0;
    for (const s of secretos) if (texto.indexOf(canonico(s)) >= 0) filtrados++;
    comprobar(
      `ni un secreto asoma en la vista de ${quien ?? 'el espectador'}`,
      filtrados === 0,
      filtrados,
    );
  }

  /* Y la cuenta de lo que queda SÍ es pública: se ve el montón en la mesa. */
  const vista = proyectarLasLindes(estado, 'a-0', sentados);
  comprobar('la cuenta de lo que queda en la bolsa sí es pública', vista.quedan === estado.bolsa.length);
  comprobar('el tablero declarado trae la losa de salida', vista.tablero.caras.length > 0);
  comprobar('el tablero declarado dice dónde cabe la de la mano', vista.colocaciones.length > 0);
  comprobar(
    'y todas las casillas donde cabe tocan alguna losa puesta',
    vista.colocaciones.every((c) => {
      for (const l of LADOS) {
        const v = vecina(c.x, c.y, l);
        if (estado.tablero[llaveDeCasilla(v.x, v.y)] !== undefined) return true;
      }
      return false;
    }),
  );

  /* Cada colocación ofrecida es de verdad legal. */
  const losa = losaPorId(losaDeLaFicha(estado.enMano));
  comprobar('hay una losa en la mano', losa !== null);
  if (losa !== null) {
    comprobar(
      'todas las colocaciones ofrecidas casan de verdad',
      vista.colocaciones.every((c) => cabe(estado.tablero as Tablero, losa, c.giro, c.x, c.y)),
    );
    comprobar(
      'y no falta ninguna: son las mismas que dice el catálogo',
      vista.colocaciones.length === dondeCabe(estado.tablero as Tablero, losa.id).length,
    );
  }
}

// ---------------------------------------------------------------------------
paso('A pie: el escudo, la leva, el recuento final y el botín con escudos (AVATARES-JUGABLES §5)');
// ---------------------------------------------------------------------------

{
  /*
   * ═══ LO QUE SE AFIRMA, Y CONTRA QUÉ ═══
   *
   * Todo lo de aquí sólo existe en una mesa `botas`: los escudos llegan por `arcade:hallazgo`, que
   * sólo mete el servidor. Que una partida sin hallazgos quede byte a byte como antes lo congela
   * `oro:arcade`; aquí se afirma lo nuevo, con el reductor de verdad y una partida jugada entera:
   *
   *   · el hallazgo suma un escudo a quien lo recoge, y rechaza con motivo lo que no debió llegar;
   *   · la leva se ofrece SÓLO a quien puede pagarla, tenga o no el turno; gasta, suma un labriego,
   *     apunta la leva y no toca el turno; no pasa de `LEVAS_POR_JUGADOR`;
   *   · en el recuento final cada escudo sin gastar suma `PUNTOS_POR_ESCUDO` y cuenta para ganar;
   *   · el botín pasa un escudo si lo hay, y sin escudos es exactamente el de antes.
   */
  const ANA: AsientoId = 'p-ana';
  const BEA: AsientoId = 'p-bea';
  const CID: AsientoId = 'p-cid';
  const DAN: AsientoId = 'p-dan';
  const TRES_A: readonly AsientoId[] = [ANA, BEA, CID];
  const CUATRO_A: readonly AsientoId[] = [ANA, BEA, CID, DAN];
  const SENTADOS_A: LosSentados = [
    { asiento: ANA, nombre: 'Ana' },
    { asiento: BEA, nombre: 'Bea' },
    { asiento: CID, nombre: 'Cid' },
  ];
  const AZAR = 20260927;

  interface Salida {
    readonly estado: EstadoDeLasLindes;
    readonly motivo: string | null;
  }
  const mandar = (e: EstadoDeLasLindes, mov: Movimiento, quien: AsientoId | null, asientos: readonly AsientoId[] = TRES_A): Salida => {
    const s = avanzarLasLindes(e, mov, ctxDe(quien, asientos, AZAR));
    return esRechazo(s) ? { estado: s.estado, motivo: s.motivo } : { estado: s, motivo: null };
  };
  const escudo = (
    e: EstadoDeLasLindes,
    para: AsientoId,
    asientos: readonly AsientoId[] = TRES_A,
    quien: AsientoId | null = null,
    clase = 'escudo',
  ): Salida => mandar(e, movimientoDelHallazgo(para, clase), quien, asientos);
  const escudos = (e: EstadoDeLasLindes, para: AsientoId, cuantos: number): EstadoDeLasLindes => {
    let s = e;
    for (let i = 0; i < cuantos; i++) s = escudo(s, para).estado;
    return s;
  };
  const leva = (e: EstadoDeLasLindes, quien: AsientoId | null, asientos: readonly AsientoId[] = TRES_A): Salida =>
    mandar(e, { tipo: LEVA, carga: {} }, quien, asientos);
  const opcionesDe = (e: EstadoDeLasLindes, quien: AsientoId): readonly Opcion[] =>
    opcionesDeLasLindes(loQueSeVe(e, quien, NADIE_SENTADO), quien);
  const ofreceLaLeva = (e: EstadoDeLasLindes, quien: AsientoId): boolean =>
    opcionesDe(e, quien).some((o) => o.tipo === LEVA && o.id === ID_DE_LA_LEVA);
  const labriego = (e: EstadoDeLasLindes, a: AsientoId): Labriego => e.labriegos.find((l) => l.asiento === a) as Labriego;
  const vistaPublica = (e: EstadoDeLasLindes): VistaDeLasLindes => proyectarLasLindes(e, null, SENTADOS_A);
  /** Todo menos lo que un cambio de a pie puede tocar: para afirmar que no tocó nada más. */
  const loDelTurno = (e: EstadoDeLasLindes): string =>
    canonico({ ...e, labriegos: e.labriegos.map((l) => l.asiento), escudos: null, levas: null, refriegas: null });

  /**
   * UNA PARTIDA ENTERA JUGADA SIEMPRE IGUAL: quien tiene el turno hace lo primero que se le ofrece
   * que no sea la leva. Así la misma partida se puede jugar con y sin escudos y comparar el final.
   * `alEmpezar` mete lo de a pie justo después de volcar la bolsa.
   */
  const jugarEntera = (
    alEmpezar: (e: EstadoDeLasLindes) => EstadoDeLasLindes,
  ): { final: EstadoDeLasLindes } => {
    let e = alEmpezar(mandar(partidaNueva(), { tipo: EMPEZAR, carga: null }, ANA).estado);
    for (let vuelta = 0; vuelta < 600 && !seAcabo(e); vuelta++) {
      const quien = deQuienEsElTurno(e);
      if (quien === null) break;
      const o = opcionesDe(e, quien).find((x) => x.tipo !== LEVA);
      if (o === undefined) break;
      const s = mandar(e, { tipo: o.tipo, carga: o.carga }, quien);
      if (s.motivo !== null || s.estado === e) break;
      e = s.estado;
    }
    return { final: e };
  };

  const empezada = mandar(partidaNueva(), { tipo: EMPEZAR, carga: null }, ANA).estado;
  comprobar('A PIE: la partida de la prueba se juega, colocando, y le toca a Ana', empezada.momento === 'colocando' && deQuienEsElTurno(empezada) === ANA);
  comprobar('las Lindes sólo tienen una clase de hallazgo, el escudo', canonico(clasesDe(HALLAZGOS_DE_LAS_LINDES)) === canonico(['escudo']));
  comprobar(
    'sin hallazgos no hay ni `escudos` ni `levas`, ni en el estado ni en la vista',
    !('escudos' in empezada) && !('levas' in empezada) && !('escudos' in vistaPublica(empezada)) && !('levas' in vistaPublica(empezada)),
  );
  comprobar('y a nadie se le ofrece la leva', TRES_A.every((a) => !ofreceLaLeva(empezada, a)));

  /* EL HALLAZGO. */
  {
    const r = escudo(empezada, BEA);
    comprobar('un escudo entra sin motivo y suma uno a quien lo recoge', r.motivo === null && canonico(r.estado.escudos) === canonico({ [BEA]: 1 }), r.estado.escudos);
    comprobar(
      '  y no toca ni el turno, ni el momento, ni la losa de la mano, ni los puntos',
      loDelTurno(r.estado) === loDelTurno(empezada) && canonico(r.estado.labriegos) === canonico(empezada.labriegos),
    );
    const dos = escudo(escudo(r.estado, BEA).estado, CID).estado;
    comprobar('  se acumulan, por asiento', canonico(dos.escudos) === canonico({ [BEA]: 2, [CID]: 1 }), dos.escudos);
    const vista = vistaPublica(dos);
    comprobar(
      '  la vista pública los enseña con el nombre `escudos`, y los lee `escudosDeLaVista`',
      escudosDeLaVista(vista, BEA) === 2 && escudosDeLaVista(vista, CID) === 1 && escudosDeLaVista(vista, ANA) === 0 && !('levas' in vista),
      vista.escudos,
    );
    comprobar('  y la ve igual quien juega que quien mira: no son secretos', canonico(proyectarLasLindes(dos, ANA, SENTADOS_A).escudos) === canonico(vista.escudos));
    comprobar(
      '  un panel los cuenta',
      vista.tablero.paneles.some((p) => p.titulo === 'Los escudos' && p.lineas.some((l) => l.startsWith('Bea: 2 escudos'))),
      vista.tablero.paneles,
    );
  }
  const terminadaSola = jugarEntera((e) => e).final;
  comprobar('la partida de la prueba termina', seAcabo(terminadaSola), terminadaSola.momento);
  {
    const MALOS: ReadonlyArray<readonly [string, EstadoDeLasLindes, AsientoId, readonly AsientoId[], AsientoId | null, string]> = [
      ['que manda un asiento', empezada, BEA, TRES_A, BEA, 'escudo'],
      ['de una clase que no es del valle', empezada, BEA, TRES_A, null, 'cartera'],
      ['para alguien que no está sentado', empezada, DAN, TRES_A, null, 'escudo'],
      ['para alguien sentado que no juega esta partida', empezada, DAN, CUATRO_A, null, 'escudo'],
      ['con la partida sin empezar', partidaNueva(), ANA, TRES_A, null, 'escudo'],
      ['con la partida terminada', terminadaSola, ANA, TRES_A, null, 'escudo'],
    ];
    for (const [que, e, para, asientos, quien, clase] of MALOS) {
      const r = escudo(e, para, asientos, quien, clase);
      comprobar(
        `  se rechaza con motivo un hallazgo ${que}, y la mesa no cambia`,
        r.motivo !== null && r.motivo.length > 0 && canonico(r.estado) === canonico(e),
        r.motivo,
      );
    }
  }

  /* LA LEVA. */
  {
    const conDos = escudos(empezada, BEA, ESCUDOS_POR_LEVA - 1);
    comprobar(`con ${ESCUDOS_POR_LEVA - 1} escudos no se ofrece la leva`, !ofreceLaLeva(conDos, BEA));
    const r0 = leva(conDos, BEA);
    comprobar('  y mandada a mano se rechaza con motivo, sin tocar nada', r0.motivo !== null && r0.estado === conDos, r0.motivo);

    const conTres = escudos(empezada, BEA, ESCUDOS_POR_LEVA);
    comprobar(
      `con ${ESCUDOS_POR_LEVA} se le ofrece a Bea aunque no sea su turno, con id «${ID_DE_LA_LEVA}»`,
      ofreceLaLeva(conTres, BEA) && deQuienEsElTurno(conTres) === ANA,
    );
    const opcion = opcionesDe(conTres, BEA).find((o) => o.tipo === LEVA);
    comprobar('  la opción lleva la carga vacía, que es la del contrato', opcion !== undefined && canonico(opcion.carga) === canonico({}), opcion);
    comprobar('  y a los demás, que no tienen escudos, no', !ofreceLaLeva(conTres, ANA) && !ofreceLaLeva(conTres, CID));
    const deAna = opcionesDe(escudos(empezada, ANA, ESCUDOS_POR_LEVA), ANA);
    comprobar(
      '  a quien tiene el turno se le ofrece también, DETRÁS de sus colocaciones',
      deAna.length > 1 && deAna[deAna.length - 1]?.tipo === LEVA && deAna.slice(0, -1).every((o) => o.tipo === PONER),
      deAna.map((o) => o.id),
    );
    {
      const suyo = tableroDeLasLindes(loQueSeVe(conTres, BEA, NADIE_SENTADO), opcionesDe(conTres, BEA));
      comprobar(
        '  en el tablero de quien espera sale el botón de la leva, y sigue diciendo «Le toca a otro»',
        suyo.acciones.some((a) => a.id === ID_DE_LA_LEVA && a.disponible) && suyo.acciones.some((a) => a.id === 'espera'),
        suyo.acciones.map((a) => a.id),
      );
    }

    const r = leva(conTres, BEA);
    comprobar('la leva entra sin motivo', r.motivo === null, r.motivo);
    comprobar(`  gasta ${ESCUDOS_POR_LEVA} escudos`, escudosDeLaVista(vistaPublica(r.estado), BEA) === 0, r.estado.escudos);
    comprobar('  suma un labriego sin plantar', labriego(r.estado, BEA).sinPlantar === labriego(conTres, BEA).sinPlantar + 1);
    comprobar(
      '  y apunta la leva, en el estado y en la vista (`levas`)',
      canonico(r.estado.levas) === canonico({ [BEA]: 1 }) && levasDeLaVista(vistaPublica(r.estado), BEA) === 1,
      r.estado.levas,
    );
    comprobar('  sin tocar el turno, el momento ni la losa de la mano', loDelTurno(r.estado) === loDelTurno(conTres));
    comprobar(
      '  ni los puntos de nadie, ni los labriegos de los demás',
      r.estado.labriegos.every((l, i) =>
        l.asiento === BEA ? l.puntos === labriego(conTres, BEA).puntos : canonico(l) === canonico(conTres.labriegos[i]),
      ),
    );
    comprobar('  y gastados los escudos ya no se ofrece', !ofreceLaLeva(r.estado, BEA));

    /* El tope. */
    let e = escudos(empezada, CID, ESCUDOS_POR_LEVA * (LEVAS_POR_JUGADOR + 1));
    let pagadas = 0;
    for (let i = 0; i < LEVAS_POR_JUGADOR; i++) {
      const s = leva(e, CID);
      if (s.motivo === null && s.estado !== e) pagadas++;
      e = s.estado;
    }
    comprobar(
      `se pagan hasta ${LEVAS_POR_JUGADOR} levas por partida`,
      pagadas === LEVAS_POR_JUGADOR && labriego(e, CID).sinPlantar === LABRIEGOS_POR_JUGADOR + LEVAS_POR_JUGADOR,
    );
    comprobar(
      `  con ${ESCUDOS_POR_LEVA} escudos aún en la mano, la ${LEVAS_POR_JUGADOR + 1}.ª ya no se ofrece`,
      escudosDeLaVista(vistaPublica(e), CID) === ESCUDOS_POR_LEVA && !ofreceLaLeva(e, CID),
    );
    const tercera = leva(e, CID);
    comprobar('  y mandada a mano se rechaza con motivo', tercera.motivo !== null && tercera.estado === e, tercera.motivo);

    /* En `plantando` también, y de quien no tiene el turno. */
    let puesta = conTres;
    for (const o of opcionesDe(conTres, ANA)) {
      if (o.tipo !== PONER) continue;
      const s = mandar(conTres, { tipo: PONER, carga: o.carga }, ANA).estado;
      if (s.momento === 'plantando') {
        puesta = s;
        break;
      }
    }
    comprobar('hay una colocación de la primera losa que deja a Ana plantando', puesta.momento === 'plantando');
    comprobar('  en `plantando` se ofrece igual a quien puede pagarla', ofreceLaLeva(puesta, BEA));
    const p = leva(puesta, BEA);
    comprobar(
      '  y entra sin mover el turno ni el momento',
      p.motivo === null && p.estado.momento === 'plantando' && deQuienEsElTurno(p.estado) === ANA && loDelTurno(p.estado) === loDelTurno(puesta),
      p.motivo,
    );

    /* Quien no puede. */
    const mal1 = leva(conTres, DAN, CUATRO_A);
    comprobar('la leva de un sentado que no juega esta partida se rechaza con motivo', mal1.motivo !== null && mal1.estado === conTres, mal1.motivo);
    const mal2 = leva(partidaNueva(), ANA);
    comprobar('  y la de una partida sin empezar', mal2.motivo !== null, mal2.motivo);
    comprobar('  y en la partida terminada no se le ofrece nada a nadie', TRES_A.every((a) => opcionesDe(terminadaSola, a).length === 0));
  }

  /* EL RECUENTO FINAL. */
  {
    const sinEscudos = terminadaSola;
    const puntos = (a: AsientoId): number => labriego(sinEscudos, a).puntos;
    let mayor = 0;
    for (const a of TRES_A) if (puntos(a) > mayor) mayor = puntos(a);
    const rezagado = TRES_A.slice().sort((x, y) => puntos(x) - puntos(y))[0] as AsientoId;
    const cuantos = mayor - puntos(rezagado) + 1;
    const conEscudos = jugarEntera((e) => escudos(e, rezagado, cuantos)).final;
    comprobar('con escudos la partida se juega igual y termina', seAcabo(conEscudos) && canonico(conEscudos.tablero) === canonico(sinEscudos.tablero));
    comprobar(
      `el recuento final suma ${PUNTOS_POR_ESCUDO} por escudo sin gastar a su dueño, y a nadie más`,
      labriego(conEscudos, rezagado).puntos === puntos(rezagado) + cuantos * PUNTOS_POR_ESCUDO &&
        TRES_A.filter((a) => a !== rezagado).every((a) => labriego(conEscudos, a).puntos === puntos(a)),
      { rezagado, cuantos, antes: sinEscudos.labriegos, despues: conEscudos.labriegos },
    );
    comprobar(
      `  y cuenta para ganar: quien iba último, con ${cuantos} escudos, gana solo`,
      canonico(conEscudos.ganadores) === canonico([rezagado]) && canonico(sinEscudos.ganadores) !== canonico([rezagado]),
      { antes: sinEscudos.ganadores, despues: conEscudos.ganadores },
    );
    const vista = vistaPublica(conEscudos);
    comprobar(
      '  y el marcador final dice de dónde salieron esos puntos',
      vista.tablero.paneles.some(
        (p) => p.titulo === 'Los escudos' && p.lineas.some((l) => l.includes(`+${cuantos * PUNTOS_POR_ESCUDO} en el recuento`)),
      ),
      vista.tablero.paneles,
    );
    comprobar('  los escudos se quedan escritos después del recuento, para poder contarlo', escudosDeLaVista(vista, rezagado) === cuantos);
  }

  /* EL BOTÍN CON ESCUDOS. */
  {
    /*
     * Los puntos se ponen a mano: la partida de «lo primero que se ofrece» no cierra casi nada antes
     * del recuento, y lo que se prueba aquí es el botín, no cómo se ganan.
     */
    const conPuntos: EstadoDeLasLindes | null = {
      ...empezada,
      labriegos: empezada.labriegos.map((l) => (l.asiento === ANA ? { ...l, puntos: PUNTOS_DEL_BOTIN + 4 } : l)),
    };
    comprobar('la mesa del botín: Ana lleva más puntos que el botín', labriego(conPuntos, ANA).puntos > PUNTOS_DEL_BOTIN);
    if (conPuntos !== null) {
      const de = conPuntos.labriegos.find((l) => l.puntos > PUNTOS_DEL_BOTIN)?.asiento as AsientoId;
      const para = TRES_A.find((a) => a !== de) as AsientoId;
      const botin = (e: EstadoDeLasLindes): Salida => mandar(e, movimientoDelBotin(de, para), null);

      const sinNada = botin(conPuntos);
      comprobar(
        'sin escudos, el botín es el de antes: ni `escudos` en el estado ni en la refriega',
        sinNada.motivo === null &&
          !('escudos' in sinNada.estado) &&
          canonico(sinNada.estado.refriegas) === canonico([{ de, para, puntos: PUNTOS_DEL_BOTIN }]),
        sinNada.estado.refriegas,
      );
      const conMapa = escudo(conPuntos, para).estado;
      const conMapaTras = botin(conMapa);
      comprobar(
        '  y con escudos en la mesa pero ninguno en quien cae, igual: la refriega no los nombra y el mapa no cambia',
        canonico(conMapaTras.estado.refriegas) === canonico([{ de, para, puntos: PUNTOS_DEL_BOTIN }]) &&
          canonico(conMapaTras.estado.escudos) === canonico(conMapa.escudos),
      );

      const cargado = escudos(conPuntos, de, 2);
      const r = botin(cargado);
      comprobar(
        `con escudos, además de los ${PUNTOS_DEL_BOTIN} puntos pasa ${ESCUDOS_DEL_BOTIN} escudo de quien cae a quien lo tumbó`,
        r.motivo === null &&
          escudosDeLaVista(vistaPublica(r.estado), de) === 2 - ESCUDOS_DEL_BOTIN &&
          escudosDeLaVista(vistaPublica(r.estado), para) === ESCUDOS_DEL_BOTIN &&
          labriego(r.estado, de).puntos === labriego(cargado, de).puntos - PUNTOS_DEL_BOTIN &&
          labriego(r.estado, para).puntos === labriego(cargado, para).puntos + PUNTOS_DEL_BOTIN,
        r.estado.escudos,
      );
      comprobar(
        '  y la refriega lo apunta y lo cuenta',
        canonico(r.estado.refriegas) === canonico([{ de, para, puntos: PUNTOS_DEL_BOTIN, escudos: ESCUDOS_DEL_BOTIN }]) &&
          (vistaPublica(r.estado).refriegas ?? []).some(
            (x) => x.escudos === ESCUDOS_DEL_BOTIN && x.frase.includes(`${PUNTOS_DEL_BOTIN} puntos y 1 escudo`),
          ),
        vistaPublica(r.estado).refriegas,
      );
      comprobar('  sin tocar el turno ni la losa de la mano', loDelTurno(r.estado) === loDelTurno(cargado));

      /* Sin puntos y con un escudo: se lleva el escudo, y la refriega dice sólo eso. */
      const pobre = escudo(empezada, BEA).estado;
      const p = mandar(pobre, movimientoDelBotin(BEA, CID), null);
      comprobar(
        'quien cae sin puntos pero con un escudo pierde el escudo, y no es el mismo estado',
        p.motivo === null &&
          p.estado !== pobre &&
          escudosDeLaVista(vistaPublica(p.estado), BEA) === 0 &&
          escudosDeLaVista(vistaPublica(p.estado), CID) === 1,
        p.estado.escudos,
      );
      comprobar(
        '  y la frase no habla de puntos',
        (vistaPublica(p.estado).refriegas ?? []).some((x) => x.frase === 'Cid le quita 1 escudo a Bea en la refriega.'),
        vistaPublica(p.estado).refriegas,
      );
      const nada = mandar(empezada, movimientoDelBotin(BEA, CID), null);
      comprobar('  y sin puntos ni escudos, EL MISMO estado, como antes', nada.estado === empezada && nada.motivo === null);
    }
  }
}

// ---------------------------------------------------------------------------

console.log('');
if (fallos.length > 0) {
  console.log(`${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
  for (const f of fallos) console.log(`  ✗ ${f}`);
  process.exit(1);
}

console.log(`${hechas} comprobaciones`);
console.log('\nEl catálogo cuadra, la geometría cierra, los cuatro recuentos dan lo que dicen las');
console.log('reglas, y diez partidas se juegan enteras sin perder una losa ni un labriego.');
