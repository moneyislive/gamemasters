/**
 * ¿EL BOTÍN DE LA REFRIEGA SÓLO LO METE EL SERVIDOR, SÓLO ENTRE DOS SENTADOS DISTINTOS, Y CADA
 * JUEGO QUE SE RECORRE LO ATIENDE SIN ATASCARSE?
 *
 *   npm run verify:botin -w server
 *
 * El botín (`shared/arcade/juegos/botin.ts`) es el único movimiento, además del tic, que entra en
 * una mesa en nombre de nadie: lo mete el servidor cuando alguien cae en Boots on Board, y mueve
 * cosas de valor de un asiento a otro. Por eso su lector es estricto como el del canal —una clave
 * de más, un asiento que no está sentado, el mismo asiento dos veces, `null`— y, sobre todo, dice
 * que NO a cualquier cosa que llegue con `quien`: un botín que manda un asiento es un aparato que
 * se roba a sí mismo los bolsillos de los demás.
 *
 * Sin servidor ni red: que el servidor lo meta por la vía interna lo prueba el comprobador de la
 * sala; que cada juego lo atienda, su bloque aquí abajo.
 *
 * ═══ CADA JUEGO QUE SE RECORRE, CON SU PRUEBA, Y LA LISTA LA PONE EL REGISTRO ═══
 *
 * Qué juegos admiten mesas `botas` lo dice el registro de mundos (`arcadesQueSeRecorren`), y en una
 * mesa `botas` se cae. Así que este fichero recorre ESE registro y no una lista suya, y exige una
 * prueba por juego: el día que se dé de alta un cuarto sin ella, se pone rojo con su nombre. Y
 * exige además que se hayan probado al menos tres, porque un registro vacío recorrido con un bucle
 * sale en verde sin haber mirado nada — el verde falso que esta casa tiene apuntado varias veces.
 *
 * Cada prueba JUEGA hasta el momento que mira —con el robot que ya tiene su comprobador, o con uno
 * de aquí que elige entre lo que el propio juego ofrece— y le mete el botín por la misma puerta que
 * la mesa: el reductor registrado, con `quien: null`. Lo común a los tres:
 *
 *   · el del servidor entra, y cambia la mesa;
 *   · con `quien` de un asiento, de uno a sí mismo, con alguien que no está sentado, con alguien
 *     sentado que no juega esta partida, sin empezar y con la partida terminada: se RECHAZA con
 *     motivo, y la mesa queda igual;
 *   · sin nada que llevarse: EL MISMO objeto de estado, sin motivo y sin crónica;
 *   · `turnoDe` no se mueve, que es lo que la mesa mira para reprogramar el plazo.
 *
 * Y lo de cada uno: que se lleva exactamente lo que dice su regla y a quien dice, cómo lo cuenta su
 * crónica, y los momentos delicados que su reductor decidió proteger.
 */
import { avanzarConMotivo, ESPECTADOR, NADIE_SENTADO, vistaDeAsiento } from '../../shared/arcade';
import type { ArcadeId, ContextoMovimiento, Movimiento } from '../../shared/arcade';
import '../../shared/arcade/juegos';
import {
  esBotin,
  leerElBotin,
  movimientoDelBotin,
  TIPO_DEL_BOTIN,
} from '../../shared/arcade/juegos/botin';
import { arcadesQueSeRecorren } from '../../shared/arcade/juegos/mundos';
import {
  ACEPTAR,
  bienDeLaFicha,
  DESCARTAR,
  EMPEZAR as EMPEZAR_RIBERAS,
  FICHAS_DEL_BOTIN,
  MOVER_EL_ESTIAJE,
  OFRECER,
  opcionesDeRiberas,
  PASAR as PASAR_EN_RIBERAS,
  proyectarRiberas,
  RIBERAS,
  TIRAR as TIRAR_EN_RIBERAS,
} from '../../shared/arcade/juegos/riberas';
import type { Colono, EstadoDeRiberas, Opcion } from '../../shared/arcade/juegos/riberas';
import { BURGO, MRS_DEL_BOTIN, opcionesDelBurgo, PASAR_PUJA, proyectarElBurgo } from '../../shared/arcade/juegos/burgo';
import type { EstadoDelBurgo, JugadorDelBurgo } from '../../shared/arcade/juegos/burgo';
import { LINDES, PUNTOS_DEL_BOTIN, proyectarLasLindes } from '../../shared/arcade/juegos/lindes';
import type { EstadoDeLasLindes, Labriego } from '../../shared/arcade/juegos/lindes';
import { canonico } from '../../shared/mecanicas/canonico';
import { turnoDeLaVista } from '../../shared/mecanicas/turno-declarado';
import { asientosDelRobot, jugarConElRobot, loQueHaceElRobot } from './robot-del-burgo';
import { asientosDeLasLindes, jugarLasLindes } from './robot-de-las-lindes';
import { arnes } from './arnes';

/*
 * EL ARNÉS COMÚN (`arnes.ts`): `comprobar`, `paso`, el informe y el suelo. Las llamadas son las de
 * siempre; lo que cambia es que un bloque que no llega a correr sale con 2 y no con el 1 de un rojo.
 */
const { comprobar, paso, terminar } = arnes();

/* ─── El lector ──────────────────────────────────────────────────────────── */

const SENTADOS = ['ana', 'bea', 'cid'] as const;

comprobar('el tipo es del prefijo reservado de la plataforma', TIPO_DEL_BOTIN.startsWith('arcade:'));
{
  const mov = movimientoDelBotin('ana', 'bea');
  comprobar('el movimiento que construye el servidor es un botín', esBotin(mov), mov);
  const leido = leerElBotin(mov.carga, null, SENTADOS);
  comprobar(
    'y se lee tal cual: quién lo pierde y quién se lo lleva',
    leido !== null && leido.de === 'ana' && leido.para === 'bea',
    leido,
  );
}
comprobar('un tic no es un botín', !esBotin({ tipo: 'arcade:tic' }));
comprobar('un movimiento del juego no es un botín', !esBotin({ tipo: 'tirar' }));

const MALOS: readonly [string, unknown, string | null][] = [
  ['lo manda un asiento, aunque sea el que gana', { de: 'ana', para: 'bea' }, 'bea'],
  ['lo manda un asiento que ni siquiera está en el botín', { de: 'ana', para: 'bea' }, 'cid'],
  ['de uno a sí mismo', { de: 'ana', para: 'ana' }, null],
  ['de alguien que no está sentado', { de: 'dan', para: 'bea' }, null],
  ['para alguien que no está sentado', { de: 'ana', para: 'dan' }, null],
  ['con una clave de más', { de: 'ana', para: 'bea', cuanto: 1000 }, null],
  ['sin `para`', { de: 'ana' }, null],
  ['sin `de`', { para: 'bea' }, null],
  ['con `de` que no es texto', { de: 1, para: 'bea' }, null],
  ['con `para` que no es texto', { de: 'ana', para: ['bea'] }, null],
  ['con las claves cambiadas de nombre', { desde: 'ana', hacia: 'bea' }, null],
  ['sin carga', undefined, null],
  ['con la carga null', null, null],
  ['con la carga en una lista', ['ana', 'bea'], null],
  ['con la carga en texto', 'ana>bea', null],
];
for (const [que, carga, quien] of MALOS) {
  comprobar(`no se lee un botín ${que}`, leerElBotin(carga, quien, SENTADOS) === null, { carga, quien });
}
comprobar('en una mesa sin nadie sentado no hay botín', leerElBotin({ de: 'ana', para: 'bea' }, null, []) === null);

/* ─── Lo que comparten las tres pruebas ──────────────────────────────────── */

/**
 * LO QUE CADA PRUEBA LE DA AL BLOQUE COMÚN: una partida jugada de verdad, en juego, y los estados
 * de alrededor que el bloque común necesita para decir que no.
 */
interface PartidaParaElBotin {
  readonly arcade: ArcadeId;
  /** Los que están sentados y JUEGAN esta partida. Tres, para que haya un tercero que mande. */
  readonly asientos: readonly string[];
  /** Un estado en juego, sacado de jugar. */
  readonly enJuego: unknown;
  /** Quién cae —y lleva algo encima— y quién lo tumbó, en `enJuego`. */
  readonly de: string;
  readonly para: string;
  /** La misma partida, terminada. */
  readonly terminada: unknown;
  /** Una partida en juego en la que `de` ya no lleva nada. */
  readonly sinNada: { readonly estado: unknown; readonly de: string; readonly para: string };
}

/** El contexto con el que la mesa mete el botín: nadie lo manda, y los sentados son los de la mesa. */
function ctxDelBotin(asientos: readonly string[], quien: string | null = null): ContextoMovimiento {
  return { quien, azar: 1, tic: 0, asientos: [...asientos] };
}

/** De quién es el turno según la vista del espectador, que es lo que la mesa mira para el plazo. */
function turnoDe(arcade: ArcadeId, estado: unknown): string {
  return canonico(turnoDeLaVista(vistaDeAsiento(arcade, estado, ESPECTADOR)));
}

/** Aplica un botín por la puerta de la mesa: el reductor registrado, con su motivo si lo hubo. */
function botin(
  arcade: ArcadeId,
  estado: unknown,
  de: string,
  para: string,
  asientos: readonly string[],
): { estado: unknown; motivo: string | null } {
  return avanzarConMotivo(arcade, estado, movimientoDelBotin(de, para), ctxDelBotin(asientos));
}

/**
 * POR QUÉ SE RECHAZA, en las palabras que usan los tres juegos. Se exige el motivo DE CADA CASO y no
 * «algún motivo», porque las guardas se tapan unas a otras: sin empezar tampoco hay jugadores, así
 * que quitar la guarda del momento seguiría rechazando —por la de los jugadores— y un «hay motivo»
 * a secas se quedaría en verde sin mirar la guarda que dice mirar.
 */
const PORQUE = {
  lector: 'no vale',
  noJuega: 'no juega esta partida',
  sinEmpezar: 'no ha empezado',
  terminada: 'ha terminado',
} as const;

/**
 * LAS REGLAS QUE VALEN PARA LOS TRES, contra la partida que cada prueba ha jugado.
 *
 * `rechazado` exige las tres cosas: un motivo —el servidor, que es quien lo manda, tiene que poder
 * saber por qué no entró—, que sea el de ese caso, y la mesa idéntica, por identidad.
 */
function lasReglasComunes(p: PartidaParaElBotin): void {
  const nombre = p.arcade;
  const rechazado = (
    que: string,
    salida: { estado: unknown; motivo: string | null },
    antes: unknown,
    porque: string,
  ): void => {
    comprobar(
      `${nombre}: ${que}: rechazado con su motivo, y la mesa igual`,
      salida.motivo !== null && salida.motivo.includes(porque) && salida.estado === antes,
      salida.motivo,
    );
  };

  const bueno = botin(p.arcade, p.enJuego, p.de, p.para, p.asientos);
  comprobar(`${nombre}: el botín del servidor entra y cambia la mesa`, bueno.motivo === null && bueno.estado !== p.enJuego, bueno.motivo);
  comprobar(
    `${nombre}: y no cambia de quién es el turno, que es lo que reprograma el plazo de la mesa`,
    turnoDe(p.arcade, bueno.estado) === turnoDe(p.arcade, p.enJuego),
    { antes: turnoDe(p.arcade, p.enJuego), despues: turnoDe(p.arcade, bueno.estado) },
  );

  const carga = { de: p.de, para: p.para };
  for (const quien of p.asientos) {
    rechazado(
      `lo manda ${quien}, un asiento`,
      avanzarConMotivo(p.arcade, p.enJuego, { tipo: TIPO_DEL_BOTIN, carga }, ctxDelBotin(p.asientos, quien)),
      p.enJuego,
      PORQUE.lector,
    );
  }
  rechazado('de uno a sí mismo', botin(p.arcade, p.enJuego, p.de, p.de, p.asientos), p.enJuego, PORQUE.lector);
  rechazado('para alguien que no está sentado', botin(p.arcade, p.enJuego, p.de, 'intruso', p.asientos), p.enJuego, PORQUE.lector);
  rechazado('de alguien que no está sentado', botin(p.arcade, p.enJuego, 'intruso', p.para, p.asientos), p.enJuego, PORQUE.lector);
  /*
   * SENTADO NO ES JUGAR: quien se sienta con la partida empezada está en `ctx.asientos` y pasa el
   * lector, pero no tiene almacén, ni bolsa, ni columna de puntos. Eso sólo lo sabe el juego.
   */
  const conUnoMas = [...p.asientos, 'rezagado'];
  rechazado(
    'para un sentado que no juega esta partida',
    botin(p.arcade, p.enJuego, p.de, 'rezagado', conUnoMas),
    p.enJuego,
    PORQUE.noJuega,
  );
  rechazado(
    'de un sentado que no juega esta partida',
    botin(p.arcade, p.enJuego, 'rezagado', p.para, conUnoMas),
    p.enJuego,
    PORQUE.noJuega,
  );
  {
    const sinEmpezar = botin(p.arcade, undefined, p.de, p.para, p.asientos);
    comprobar(
      `${nombre}: sin empezar: rechazado con su motivo`,
      sinEmpezar.motivo !== null && sinEmpezar.motivo.includes(PORQUE.sinEmpezar),
      sinEmpezar.motivo,
    );
  }
  rechazado('con la partida terminada', botin(p.arcade, p.terminada, p.de, p.para, p.asientos), p.terminada, PORQUE.terminada);

  const vacio = botin(p.arcade, p.sinNada.estado, p.sinNada.de, p.sinNada.para, p.asientos);
  comprobar(
    `${nombre}: sin nada que llevarse, EL MISMO objeto y sin motivo: la mesa lo cuenta como que no pasó nada`,
    vacio.estado === p.sinNada.estado && vacio.motivo === null,
    vacio.motivo,
  );
}

/** El estado sin unas cuantas claves, en forma canónica: para afirmar que lo demás no se tocó. */
function sinLlaves(estado: unknown, llaves: readonly string[]): string {
  const copia: Record<string, unknown> = { ...(estado as Record<string, unknown>) };
  for (const llave of llaves) delete copia[llave];
  return canonico(copia);
}

/** Lo que tiene `uno` y no tiene `otro`, contando repetidos. Para ver qué fichas se fueron. */
function lasQueFaltan(uno: readonly string[], otro: readonly string[]): string[] {
  const quedan = [...otro];
  const faltan: string[] = [];
  for (const x of uno) {
    const donde = quedan.indexOf(x);
    if (donde >= 0) quedan.splice(donde, 1);
    else faltan.push(x);
  }
  return faltan;
}

/* ─── Riberas ────────────────────────────────────────────────────────────── */

/** El colono de un asiento, o `undefined`. */
function colonoDe(e: EstadoDeRiberas, asiento: string): Colono | undefined {
  return e.colonos.find((c) => c.asiento === asiento);
}

/**
 * UN JUGADOR DE RIBERAS QUE SÓLO ELIGE ENTRE LO QUE EL JUEGO LE OFRECE, hasta que la partida llega a
 * lo que se busca. Coloca en lo primero que se le ofrece, tira, mueve el estiaje al primer destino,
 * descarta la primera clase, y pasa. NO construye nunca: así las manos se llenan y el siete acaba
 * pillando a alguien con más de siete fichas, que es el descarte que hay que mirar.
 *
 * Se juega por el reductor REGISTRADO, igual que la mesa. `null` si no llega en `tope` jugadas, o si
 * alguien se queda sin nada que hacer: eso ya sería un fallo, y lo dice quien llama.
 */
function jugarRiberasHasta(
  semilla: number,
  asientos: readonly string[],
  hasta: (e: EstadoDeRiberas) => boolean,
  tope = 800,
): EstadoDeRiberas | null {
  const ctx = (quien: string): ContextoMovimiento => ({ quien, azar: semilla, tic: 0, asientos: [...asientos] });
  let e = avanzarConMotivo(RIBERAS, undefined, { tipo: EMPEZAR_RIBERAS, carga: {} }, ctx(asientos[0] as string))
    .estado as EstadoDeRiberas;
  for (let vuelta = 0; vuelta < tope; vuelta++) {
    if (hasta(e)) return e;
    if (e.momento === 'terminada') return null;
    const quien = proyectarRiberas(e, ESPECTADOR).turnoDe;
    if (quien === null) return null;
    const opciones = opcionesDeRiberas(proyectarRiberas(e, quien), quien).filter((o) => o.declaracion !== true);
    const porTipo = (tipo: string): Opcion | undefined => opciones.find((o) => o.tipo === tipo);
    const elegida =
      e.momento === 'colocando'
        ? opciones[0]
        : e.momento === 'descartando'
          ? porTipo(DESCARTAR)
          : (porTipo(MOVER_EL_ESTIAJE) ?? porTipo(TIRAR_EN_RIBERAS) ?? porTipo(PASAR_EN_RIBERAS));
    if (elegida === undefined) return null;
    const siguiente = avanzarConMotivo(RIBERAS, e, { tipo: elegida.tipo, carga: elegida.carga }, ctx(quien))
      .estado as EstadoDeRiberas;
    if (siguiente === e) return null;
    e = siguiente;
  }
  return null;
}

/** Aplica botines de `de` a `para` hasta que deje de entrar. Devuelve el estado y cuántos entraron. */
function vaciarConBotines(
  arcade: ArcadeId,
  desde: unknown,
  de: string,
  para: string,
  asientos: readonly string[],
): { estado: unknown; entraron: number; conMotivo: number } {
  let estado = desde;
  let entraron = 0;
  let conMotivo = 0;
  for (let vez = 0; vez < 200; vez++) {
    const salida = botin(arcade, estado, de, para, asientos);
    if (salida.motivo !== null) conMotivo++;
    if (salida.estado === estado) break;
    estado = salida.estado;
    entraron++;
  }
  return { estado, entraron, conMotivo };
}

function probarRiberas(): PartidaParaElBotin | null {
  const JUEGAN = ['ana', 'bea', 'cid'];
  const SEMILLA = 20260923;
  const conFichas = (e: EstadoDeRiberas): boolean => e.colonos.every((c) => c.almacen.length >= 2);

  /* En juego: recién tirado, sin estiaje por mover y con fichas en todas las manos. */
  const enJuego = jugarRiberasHasta(SEMILLA, JUEGAN, (e) => e.momento === 'jugando' && e.tirado && !e.estiajePorMover && conFichas(e));
  comprobar('riberas: jugando se llega a un turno con fichas en todas las manos', enJuego !== null);
  if (enJuego === null) return null;

  const de = 'bea';
  const para = 'cid';
  const antes = enJuego;
  const salida = botin(RIBERAS, antes, de, para, JUEGAN);
  const despues = salida.estado as EstadoDeRiberas;
  const suyoAntes = colonoDe(antes, de) as Colono;
  const suyoDespues = colonoDe(despues, de) as Colono;
  const mioAntes = colonoDe(antes, para) as Colono;
  const mioDespues = colonoDe(despues, para) as Colono;
  const seFueron = lasQueFaltan(suyoAntes.almacen, suyoDespues.almacen);
  const llegaron = lasQueFaltan(mioDespues.almacen, mioAntes.almacen);
  const robada = seFueron[0] ?? '';

  comprobar(
    `riberas: quien cae pierde exactamente ${FICHAS_DEL_BOTIN} ficha`,
    seFueron.length === FICHAS_DEL_BOTIN && suyoDespues.almacen.length === suyoAntes.almacen.length - FICHAS_DEL_BOTIN,
    { seFueron, antes: suyoAntes.almacen.length, despues: suyoDespues.almacen.length },
  );
  comprobar(
    'riberas: y quien lo tumbó gana ESA MISMA ficha, con su número de serie',
    llegaron.length === FICHAS_DEL_BOTIN && llegaron[0] === robada && mioDespues.almacen[mioDespues.almacen.length - 1] === robada,
    { robada, llegaron },
  );
  comprobar(
    'riberas: el azar del estado avanzó una tirada por ficha, que es lo que sortea cuál',
    despues.azar.tiradas === antes.azar.tiradas + FICHAS_DEL_BOTIN,
    { antes: antes.azar.tiradas, despues: despues.azar.tiradas },
  );
  comprobar(
    'riberas: el tercero no se entera en su almacén',
    canonico(colonoDe(despues, 'ana')) === canonico(colonoDe(antes, 'ana')),
  );
  comprobar(
    'riberas: ni el turno, ni el momento, ni la tirada, ni los trueques, ni nada más del estado cambia',
    sinLlaves(despues, ['colonos', 'azar', 'refriegas']) === sinLlaves(antes, ['colonos', 'azar', 'refriegas']) &&
      despues.colonos.every((c, i) => sinLlaves(c, ['almacen']) === sinLlaves(antes.colonos[i], ['almacen'])),
  );
  comprobar(
    'riberas: la crónica apunta quién, a quién y cuántas — nunca cuál',
    canonico(despues.refriegas ?? null) === canonico([{ de, para, fichas: FICHAS_DEL_BOTIN }]),
    despues.refriegas,
  );

  /*
   * EL SECRETO QUE CAMBIA DE MANOS: la ficha sale en la vista de quien se la lleva y en ninguna más,
   * con comillas —que es como la busca `verify:mesa`— para que `b1:junco` no case dentro de `b12:junco`.
   */
  {
    const donde: string[] = [];
    for (const quien of [...JUEGAN, ESPECTADOR]) {
      if (canonico(proyectarRiberas(despues, quien)).includes(`"${robada}"`)) donde.push(String(quien));
    }
    comprobar('riberas: la ficha robada sólo sale en la vista de quien se la lleva', canonico(donde) === canonico([para]), donde);
    const vista = proyectarRiberas(despues, ESPECTADOR);
    const panel = vista.tablero.paneles.find((p) => p.titulo === 'La refriega');
    const renglon = panel?.lineas[0] ?? '';
    comprobar(
      'riberas: el panel «La refriega» lo cuenta con «una ficha», y sin decir de qué',
      renglon === `${para} le quita una ficha a ${de} en la refriega.` && !renglon.includes(bienDeLaFicha(robada) ?? '¿?'),
      renglon,
    );
    comprobar(
      'riberas: y una partida sin refriega no manda el campo, que es lo que deja la vista de siempre igual',
      !('refriegas' in proyectarRiberas(antes, ESPECTADOR)) && 'refriegas' in vista,
    );
  }

  /* Colocando: la segunda choza ya cobra, y el botín se lleva de ahí sin tocar la serpentina. */
  {
    const colocando = jugarRiberasHasta(SEMILLA, JUEGAN, (e) => e.momento === 'colocando' && e.colonos.some((c) => c.almacen.length > 0));
    const conAlgo = colocando?.colonos.find((c) => c.almacen.length > 0);
    const otro = colocando?.colonos.find((c) => c.asiento !== conAlgo?.asiento);
    comprobar('riberas: jugando se llega a la colocación con alguna ficha cobrada', colocando !== null && conAlgo !== undefined && otro !== undefined);
    if (colocando !== null && conAlgo !== undefined && otro !== undefined) {
      const tras = botin(RIBERAS, colocando, conAlgo.asiento, otro.asiento, JUEGAN).estado as EstadoDeRiberas;
      comprobar(
        'riberas: mientras se coloca también se lleva su ficha, y la serpentina sigue donde iba',
        (colonoDe(tras, conAlgo.asiento) as Colono).almacen.length === conAlgo.almacen.length - FICHAS_DEL_BOTIN &&
          tras.momento === 'colocando' &&
          sinLlaves(tras, ['colonos', 'azar', 'refriegas']) === sinLlaves(colocando, ['colonos', 'azar', 'refriegas']),
      );
    }
  }

  /*
   * EL DESCARTE DE UN SIETE, que es el momento delicado: `faltan` se congeló con el almacén de antes.
   * Se roba de lo que le SOBRA a quien debe, y cuando ya sólo tiene lo que debe tirar, no se roba.
   */
  {
    const descartando = jugarRiberasHasta(SEMILLA, JUEGAN, (e) => e.momento === 'descartando');
    const debe = descartando?.descartes.find((d) => d.faltan > 0);
    comprobar('riberas: jugando sale un siete con alguna mano llena: hay descarte que mirar', descartando !== null && debe !== undefined);
    if (descartando !== null && debe !== undefined) {
      const quien = debe.de;
      const otro = JUEGAN.find((a) => a !== quien) as string;
      const tenia = (colonoDe(descartando, quien) as Colono).almacen.length;
      const sobraban = tenia - debe.faltan;
      const uno = botin(RIBERAS, descartando, quien, otro, JUEGAN).estado as EstadoDeRiberas;
      comprobar(
        'riberas: durante el descarte también se lleva, de lo que le sobra, y la mesa sigue descartando lo mismo',
        (colonoDe(uno, quien) as Colono).almacen.length === tenia - FICHAS_DEL_BOTIN &&
          uno.momento === 'descartando' &&
          canonico(uno.descartes) === canonico(descartando.descartes) &&
          turnoDe(RIBERAS, uno) === turnoDe(RIBERAS, descartando),
        { tenia, faltan: debe.faltan },
      );
      const vaciado = vaciarConBotines(RIBERAS, descartando, quien, otro, JUEGAN);
      const hasta = vaciado.estado as EstadoDeRiberas;
      console.log(
        `  riberas: el siete pilla a ${quien} con ${tenia} fichas; debe tirar ${debe.faltan}, le sobran ${sobraban}, ` +
          `y los botines se llevan ${vaciado.entraron}`,
      );
      comprobar(
        'riberas: se lleva exactamente las que le sobran, ni una de las que debe tirar',
        vaciado.entraron === sobraban && (colonoDe(hasta, quien) as Colono).almacen.length === debe.faltan && vaciado.conMotivo === 0,
        { sobraban, entraron: vaciado.entraron, quedan: (colonoDe(hasta, quien) as Colono).almacen.length, faltan: debe.faltan },
      );
      const suyas = opcionesDeRiberas(proyectarRiberas(hasta, quien), quien).filter((o) => o.tipo === DESCARTAR);
      comprobar('riberas: y a quien debe se le sigue ofreciendo qué tirar', suyas.length > 0, suyas.length);
      const acabado = jugarRiberasHastaDesde(hasta, JUEGAN, (e) => e.momento !== 'descartando');
      comprobar(
        'riberas: el descarte se termina y la mesa vuelve a jugar, con el estiaje por mover: no se atasca',
        acabado !== null && acabado.momento === 'jugando' && acabado.estiajePorMover,
        acabado?.momento,
      );
    }
  }

  /*
   * CON UN TRUEQUE EN PIE: el botín no lo toca, y si se lleva lo que el oferente prometía, el trato
   * no se queda colgado: al aceptarlo se cierra como caducado, que es lo que `contestar` ya hacía.
   */
  {
    const oferente = (antes.colonos[antes.turno] as Colono).asiento;
    const destinatario = JUEGAN.find((a) => a !== oferente) as string;
    const tercero = JUEGAN.find((a) => a !== oferente && a !== destinatario) as string;
    const suyos = new Set<string>((colonoDe(antes, destinatario) as Colono).almacen.map((f) => bienDeLaFicha(f) ?? ''));
    const oferta = opcionesDeRiberas(proyectarRiberas(antes, oferente), oferente).find((o) => {
      if (o.tipo !== OFRECER || o.declaracion === true) return false;
      const c = o.carga as { para?: unknown; pide?: unknown };
      const pide = Array.isArray(c.pide) ? String(c.pide[0]) : '';
      return c.para === destinatario && suyos.has(pide);
    });
    comprobar('riberas: a quien tiene el turno se le ofrece un trueque que el otro puede pagar', oferta !== undefined);
    if (oferta !== undefined) {
      const conTrato = avanzarConMotivo(RIBERAS, antes, { tipo: oferta.tipo, carga: oferta.carga }, ctxDelBotin(JUEGAN, oferente))
        .estado as EstadoDeRiberas;
      const vaciado = vaciarConBotines(RIBERAS, conTrato, oferente, tercero, JUEGAN).estado as EstadoDeRiberas;
      comprobar(
        'riberas: los botines no tocan los trueques: el suyo sigue en pie aunque se le haya ido todo',
        (colonoDe(vaciado, oferente) as Colono).almacen.length === 0 && canonico(vaciado.tratos) === canonico(conTrato.tratos),
      );
      const trato = vaciado.tratos[vaciado.tratos.length - 1];
      const aceptar = opcionesDeRiberas(proyectarRiberas(vaciado, destinatario), destinatario).find((o) => o.tipo === ACEPTAR);
      const aceptado =
        aceptar === undefined
          ? vaciado
          : (avanzarConMotivo(RIBERAS, vaciado, { tipo: aceptar.tipo, carga: aceptar.carga }, ctxDelBotin(JUEGAN, destinatario))
              .estado as EstadoDeRiberas);
      comprobar(
        'riberas: y al aceptarlo se cierra caducado, sin cobrarle nada a quien acepta: no se queda colgado',
        aceptar !== undefined &&
          aceptado.tratos.find((t) => t.id === trato?.id)?.estado === 'caducada' &&
          canonico(colonoDe(aceptado, destinatario)) === canonico(colonoDe(vaciado, destinatario)),
      );
    }
  }

  /* Sin nada: se le vacía el almacén a uno a fuerza de botines, cada uno de una ficha. */
  const vaciado = vaciarConBotines(RIBERAS, antes, 'ana', 'bea', JUEGAN);
  comprobar(
    'riberas: vaciar un almacén a botines se lleva todas sus fichas, de una en una',
    vaciado.entraron === (colonoDe(antes, 'ana') as Colono).almacen.length && (colonoDe(vaciado.estado as EstadoDeRiberas, 'ana') as Colono).almacen.length === 0,
    vaciado.entraron,
  );
  /*
   * LA CRÓNICA RECUERDA LAS TRES ÚLTIMAS, y hay que meter más de tres para verlo: cinco botines de
   * ida y vuelta entre dos que no se vacían, y tienen que quedar los tres últimos, en su orden. Con
   * un almacén de dos o tres fichas el tope no llegaría a morder nunca, y se vio: en verde sin él.
   */
  {
    let estado: EstadoDeRiberas = antes;
    const hechos: string[] = [];
    for (let vez = 0; vez < 5; vez++) {
      const quien = vez % 2 === 0 ? 'bea' : 'cid';
      const otro = vez % 2 === 0 ? 'cid' : 'bea';
      estado = botin(RIBERAS, estado, quien, otro, JUEGAN).estado as EstadoDeRiberas;
      hechos.push(`${quien}>${otro}`);
    }
    const quedan = (estado.refriegas ?? []).map((r) => `${r.de}>${r.para}`);
    comprobar(
      'riberas: y la crónica recuerda las tres últimas, en su orden, no todas',
      canonico(quedan) === canonico(hechos.slice(-3)),
      { quedan, hechos },
    );
  }

  return {
    arcade: RIBERAS,
    asientos: JUEGAN,
    enJuego: antes,
    de,
    para,
    /* Terminada con el final que escribe `puedeHaberGanado`: momento, ganadores y el estiaje apagado. */
    terminada: { ...antes, momento: 'terminada', ganadores: [para], estiajePorMover: false },
    sinNada: { estado: vaciado.estado, de: 'ana', para: 'cid' },
  };
}

/** Sigue jugando con el mismo jugador de Riberas desde un estado dado. */
function jugarRiberasHastaDesde(
  desde: EstadoDeRiberas,
  asientos: readonly string[],
  hasta: (e: EstadoDeRiberas) => boolean,
): EstadoDeRiberas | null {
  let e = desde;
  for (let vuelta = 0; vuelta < 200; vuelta++) {
    if (hasta(e)) return e;
    const quien = proyectarRiberas(e, ESPECTADOR).turnoDe;
    if (quien === null) return null;
    const o = opcionesDeRiberas(proyectarRiberas(e, quien), quien).find((x) => x.tipo === DESCARTAR || x.tipo === MOVER_EL_ESTIAJE);
    if (o === undefined) return null;
    const siguiente = avanzarConMotivo(RIBERAS, e, { tipo: o.tipo, carga: o.carga }, ctxDelBotin(asientos, quien)).estado as EstadoDeRiberas;
    if (siguiente === e) return null;
    e = siguiente;
  }
  return null;
}

/* ─── El Burgo ───────────────────────────────────────────────────────────── */

/** ¿Hay una subasta o un apuro en la mesa, abiertos o en cola? Dicho aquí con sus propias palabras. */
function conElDineroEnVilo(e: EstadoDelBurgo): boolean {
  return (
    e.paso === 'almoneda' ||
    e.paso === 'apuro' ||
    e.almoneda !== null ||
    e.apuro !== null ||
    e.colaDeAlmonedas.length > 0 ||
    e.colaDeApuros.length > 0
  );
}

function jugadorDelBurgo(e: EstadoDelBurgo, asiento: string): JugadorDelBurgo {
  return e.jugadores.find((j) => j.asiento === asiento) as JugadorDelBurgo;
}

function probarElBurgo(): PartidaParaElBotin | null {
  /*
   * LAS PARTIDAS LAS JUEGA EL ROBOT DE `verify:burgo`, y de cada una se guarda el primer estado de
   * cada clase que interesa. Varias semillas por si una no pasa por todas: se para en cuanto hay de
   * todo. La lista está escrita y no se sortea.
   */
  /*
   * `null as …` y no `: … = null`, por lo que cuenta `robot-del-burgo.ts` con `estado`: con el
   * inicializador a secas TypeScript estrecha la variable a `null` y no ve que el cierre la escribe.
   */
  let tranquila = null as EstadoDelBurgo | null;
  let conPico = null as EstadoDelBurgo | null;
  let subasta = null as EstadoDelBurgo | null;
  let apuro = null as EstadoDelBurgo | null;
  let conQuebrado = null as EstadoDelBurgo | null;
  let terminada = null as EstadoDelBurgo | null;
  let asientos: readonly string[] = asientosDelRobot(3);
  for (const semilla of [20260831, 1, 3141592653, 4294967295, 20260923]) {
    if (tranquila !== null && conPico !== null && subasta !== null && apuro !== null && conQuebrado !== null && terminada !== null) break;
    asientos = asientosDelRobot(3);
    const partida = jugarConElRobot(semilla, 3, 20, 7, 4000, loQueHaceElRobot, (e) => {
      if (e.momento !== 'jugando') return;
      const vivos = e.jugadores.filter((j) => !j.quebrado);
      if (vivos.length < 2) return;
      if (!conElDineroEnVilo(e)) {
        if (tranquila === null && vivos.every((j) => j.mrs >= MRS_DEL_BOTIN)) tranquila = e;
        if (conPico === null && vivos.some((j) => j.mrs > MRS_DEL_BOTIN && j.mrs % MRS_DEL_BOTIN !== 0)) conPico = e;
      }
      if (subasta === null && e.paso === 'almoneda' && e.almoneda !== null && vivos.some((j) => j.mrs > 0)) subasta = e;
      if (apuro === null && e.paso === 'apuro' && e.apuro !== null && vivos.length >= 3) apuro = e;
      if (conQuebrado === null && e.jugadores.some((j) => j.quebrado)) conQuebrado = e;
    });
    if (terminada === null && partida.estado.momento === 'terminada') terminada = partida.estado;
  }
  comprobar('burgo: el robot llega a una mesa tranquila, con dinero en todas las bolsas', tranquila !== null);
  comprobar('burgo: y a una bolsa que no es múltiplo del botín, para ver el tope', conPico !== null);
  comprobar('burgo: y a una subasta abierta', subasta !== null);
  comprobar('burgo: y a un apuro abierto con tres en pie', apuro !== null);
  comprobar('burgo: y a alguien quebrado con la partida en marcha', conQuebrado !== null);
  comprobar('burgo: y a una partida terminada', terminada !== null);
  if (tranquila === null || conPico === null || subasta === null || apuro === null || conQuebrado === null || terminada === null) return null;
  /* Tras el `if`, con los tipos dichos: TypeScript no sigue lo que escribe el cierre de arriba. */
  const antes: EstadoDelBurgo = tranquila;
  const pico: EstadoDelBurgo = conPico;
  const enSubasta: EstadoDelBurgo = subasta;
  const enApuro: EstadoDelBurgo = apuro;
  const quebrada: EstadoDelBurgo = conQuebrado;

  const de = asientos[1] as string;
  const para = asientos[2] as string;
  const salida = botin(BURGO, antes, de, para, asientos);
  const despues = salida.estado as EstadoDelBurgo;
  const suyoAntes = jugadorDelBurgo(antes, de);
  comprobar(
    `burgo: quien cae pierde ${MRS_DEL_BOTIN} € y quien lo tumbó los gana`,
    jugadorDelBurgo(despues, de).mrs === suyoAntes.mrs - MRS_DEL_BOTIN &&
      jugadorDelBurgo(despues, para).mrs === jugadorDelBurgo(antes, para).mrs + MRS_DEL_BOTIN,
  );
  comprobar(
    'burgo: el dinero no se crea ni se destruye: pasa de uno a otro',
    despues.jugadores.reduce((s, j) => s + j.mrs, 0) === antes.jugadores.reduce((s, j) => s + j.mrs, 0),
  );
  comprobar(
    'burgo: la crónica lo cuenta con la puerta de siempre: un pago y un cobro por la refriega',
    canonico(despues.sucesos) ===
      canonico([
        { que: 'paga', quien: de, a: para, cuanto: MRS_DEL_BOTIN, porque: 'refriega', casilla: suyoAntes.casilla },
        { que: 'cobra', quien: para, de, cuanto: MRS_DEL_BOTIN, porque: 'refriega', casilla: suyoAntes.casilla },
      ]) && despues.jugada === antes.jugada + 1,
    despues.sucesos,
  );
  comprobar(
    'burgo: y el pregón lo dice desde quien se lo lleva',
    proyectarElBurgo(despues, ESPECTADOR).pregon === `${para} le quita 100 € a ${de} en la refriega.`,
    proyectarElBurgo(despues, ESPECTADOR).pregon,
  );
  comprobar(
    'burgo: ni el turno, ni el paso, ni los dados, ni los tratos, ni los títulos, ni ningún apuro',
    sinLlaves(despues, ['jugadores', 'jugada', 'sucesos']) === sinLlaves(antes, ['jugadores', 'jugada', 'sucesos']) &&
      despues.apuro === null &&
      despues.jugadores.every((j, i) => sinLlaves(j, ['mrs']) === sinLlaves(antes.jugadores[i], ['mrs'])),
  );

  /* El tope: con menos de cien se lleva lo que haya; con cero, nada, y nunca una deuda. */
  let sinNada: { estado: unknown; de: string; para: string } | null = null;
  {
    const vivo = pico.jugadores.find((j) => !j.quebrado && j.mrs > MRS_DEL_BOTIN && j.mrs % MRS_DEL_BOTIN !== 0) as JugadorDelBurgo;
    const otro = pico.jugadores.find((j) => !j.quebrado && j.asiento !== vivo.asiento) as JugadorDelBurgo;
    let estado: EstadoDelBurgo = pico;
    const llevados: number[] = [];
    let apuros = 0;
    for (let vez = 0; vez < 200; vez++) {
      const tras = botin(BURGO, estado, vivo.asiento, otro.asiento, asientos).estado as EstadoDelBurgo;
      if (tras === estado) break;
      llevados.push(jugadorDelBurgo(estado, vivo.asiento).mrs - jugadorDelBurgo(tras, vivo.asiento).mrs);
      if (tras.apuro !== null || tras.paso === 'apuro') apuros++;
      estado = tras;
    }
    const resto = vivo.mrs % MRS_DEL_BOTIN;
    console.log(`  burgo: una bolsa de ${vivo.mrs} € se vacía a botines de ${llevados.length === 0 ? '—' : `${llevados[0] ?? 0} … ${llevados[llevados.length - 1] ?? 0}`} €, en ${llevados.length}`);
    comprobar(
      `burgo: con menos de ${MRS_DEL_BOTIN} en la bolsa se lleva lo que haya, y ni un euro más`,
      llevados.length === Math.ceil(vivo.mrs / MRS_DEL_BOTIN) &&
        llevados[llevados.length - 1] === resto &&
        llevados.slice(0, -1).every((x) => x === MRS_DEL_BOTIN) &&
        jugadorDelBurgo(estado, vivo.asiento).mrs === 0,
      { tenia: vivo.mrs, llevados },
    );
    comprobar('burgo: y vaciar una bolsa a botines no abre ni un apuro', apuros === 0 && estado.apuro === null, apuros);
    sinNada = { estado, de: vivo.asiento, para: otro.asiento };
  }

  /* Con una subasta abierta el dinero no se toca: mismo objeto, y la subasta sigue esperando. */
  {
    const vivos = enSubasta.jugadores.filter((j) => !j.quebrado && j.mrs > 0);
    const uno = vivos[0] as JugadorDelBurgo;
    const otro = enSubasta.jugadores.find((j) => !j.quebrado && j.asiento !== uno.asiento) as JugadorDelBurgo;
    const tras = botin(BURGO, enSubasta, uno.asiento, otro.asiento, asientos);
    const pujaDe = enSubasta.almoneda?.pujaDe ?? '';
    comprobar(
      'burgo: con una subasta abierta el botín no se aplica: el mismo objeto, sin motivo',
      tras.estado === enSubasta && tras.motivo === null,
      tras.motivo,
    );
    /*
     * Y DESPUÉS DEL BOTÍN, quien tiene que pujar puede contestar: pasar, por lo menos. Se mira PASAR y
     * no «alguna opción», porque rendirse se ofrece siempre y con eso esta línea no podría ponerse roja.
     */
    const despuesDelBotin = tras.estado as EstadoDelBurgo;
    comprobar(
      'burgo: y quien tiene que pujar sigue pudiendo contestar: la subasta no se atasca',
      opcionesDelBurgo(proyectarElBurgo(despuesDelBotin, pujaDe), pujaDe).some((o) => o.tipo === PASAR_PUJA),
    );
  }

  /* Con un apuro abierto, tampoco: ni desde el endeudado, ni hacia él, ni entre otros dos. */
  {
    const debe = (enApuro.apuro as { quien: string }).quien;
    const otros = enApuro.jugadores.filter((j) => !j.quebrado && j.asiento !== debe).map((j) => j.asiento);
    const desdeElQueDebe = botin(BURGO, enApuro, debe, otros[0] as string, asientos);
    const haciaElQueDebe = botin(BURGO, enApuro, otros[0] as string, debe, asientos);
    const entreOtros = botin(BURGO, enApuro, otros[0] as string, otros[1] as string, asientos);
    comprobar(
      'burgo: con un apuro abierto el botín no se aplica, ni desde quien debe, ni hacia él, ni entre otros dos',
      desdeElQueDebe.estado === enApuro &&
        haciaElQueDebe.estado === enApuro &&
        entreOtros.estado === enApuro &&
        desdeElQueDebe.motivo === null &&
        haciaElQueDebe.motivo === null &&
        entreOtros.motivo === null,
      { otros },
    );
  }

  /* Quien ha quebrado ya no juega: ni da ni se lleva botín. */
  {
    const caido = quebrada.jugadores.find((j) => j.quebrado) as JugadorDelBurgo;
    const vivo = quebrada.jugadores.find((j) => !j.quebrado) as JugadorDelBurgo;
    const deUnQuebrado = botin(BURGO, quebrada, caido.asiento, vivo.asiento, asientos);
    const paraUnQuebrado = botin(BURGO, quebrada, vivo.asiento, caido.asiento, asientos);
    comprobar(
      'burgo: un quebrado ni da botín ni se lo lleva: rechazado con su motivo, y la mesa igual',
      (deUnQuebrado.motivo ?? '').includes('quebrado') &&
        deUnQuebrado.estado === quebrada &&
        (paraUnQuebrado.motivo ?? '').includes('quebrado') &&
        paraUnQuebrado.estado === quebrada,
      { de: deUnQuebrado.motivo, para: paraUnQuebrado.motivo },
    );
  }

  return { arcade: BURGO, asientos, enJuego: antes, de, para, terminada, sinNada };
}

/* ─── Las Lindes ─────────────────────────────────────────────────────────── */

function labriegoDe(e: EstadoDeLasLindes, asiento: string): Labriego {
  return e.labriegos.find((l) => l.asiento === asiento) as Labriego;
}

function probarLasLindes(): PartidaParaElBotin | null {
  /*
   * LA PARTIDA LA JUEGA EL ROBOT DE `verify:lindes`, entera, y aquí se REPITE apunte a apunte por el
   * reductor registrado: así se tiene cada estado de la partida, y se puede repetir OTRA VEZ con
   * botines metidos entre medias para ver qué cambian y qué no.
   */
  const SEMILLA = 20260918;
  const asientos = asientosDeLasLindes(3);
  const jugada = jugarLasLindes(SEMILLA, 3);
  /*
   * `minimo` es la columna más baja que se ha visto EN TODA la partida, después de cada apunte y de
   * cada botín. Mirarla sólo al final no vale: el recuento final suma mucho, y un -2 a mitad de
   * partida se tapa solo. Se vio: sin el tope en el reductor, la partida acababa sin nadie en negativo.
   */
  const repetir = (conBotinCada: number): { estados: EstadoDeLasLindes[]; botines: number; minimo: number } => {
    let e: unknown = undefined;
    const estados: EstadoDeLasLindes[] = [];
    let botines = 0;
    let minimo = 0;
    const mirar = (x: EstadoDeLasLindes): void => {
      for (const l of x.labriegos) if (l.puntos < minimo) minimo = l.puntos;
    };
    for (let k = 0; k < jugada.apuntes.length; k++) {
      const a = jugada.apuntes[k] as (typeof jugada.apuntes)[number];
      const mov: Movimiento = a.carga === undefined ? { tipo: a.tipo } : { tipo: a.tipo, carga: a.carga };
      e = avanzarConMotivo(LINDES, e, mov, { quien: a.quien ?? null, azar: SEMILLA, tic: a.tic, asientos: a.asientos ?? [] }).estado;
      estados.push(e as EstadoDeLasLindes);
      mirar(e as EstadoDeLasLindes);
      if (conBotinCada <= 0 || k % conBotinCada !== 0) continue;
      const actual = e as EstadoDeLasLindes;
      if (actual.momento !== 'colocando' && actual.momento !== 'plantando') continue;
      const de = asientos[k % asientos.length] as string;
      const para = asientos[(k + 1) % asientos.length] as string;
      const tras = botin(LINDES, actual, de, para, asientos);
      if (tras.estado !== actual) botines++;
      e = tras.estado;
      mirar(e as EstadoDeLasLindes);
    }
    return { estados, botines, minimo };
  };
  const sinBotines = repetir(0);
  const final = sinBotines.estados[sinBotines.estados.length - 1] as EstadoDeLasLindes;
  comprobar(
    'lindes: repetir la partida del robot por el reductor registrado da la misma partida',
    canonico(final) === canonico(jugada.estado) && final.momento === 'terminada',
  );
  /* En juego, y con alguien que lleve más puntos de los que se llevan: el primer estado así. */
  const antes = sinBotines.estados.find(
    (e) => (e.momento === 'colocando' || e.momento === 'plantando') && e.labriegos.some((l) => l.puntos > PUNTOS_DEL_BOTIN),
  );
  comprobar('lindes: la partida pasa por un turno en el que alguien lleva puntos de sobra', antes !== undefined);
  if (antes === undefined) return null;

  const rico = antes.labriegos.reduce((a, b) => (b.puntos > a.puntos ? b : a));
  const de = rico.asiento;
  const para = asientos.find((a) => a !== de) as string;
  const despues = botin(LINDES, antes, de, para, asientos).estado as EstadoDeLasLindes;
  comprobar(
    `lindes: quien cae pierde ${PUNTOS_DEL_BOTIN} puntos y quien lo tumbó los gana`,
    labriegoDe(despues, de).puntos === rico.puntos - PUNTOS_DEL_BOTIN &&
      labriegoDe(despues, para).puntos === labriegoDe(antes, para).puntos + PUNTOS_DEL_BOTIN,
  );
  comprobar(
    'lindes: ni el turno, ni el momento, ni la losa de la mano, ni lo plantado, ni lo cobrado cambian',
    sinLlaves(despues, ['labriegos', 'refriegas']) === sinLlaves(antes, ['labriegos', 'refriegas']) &&
      despues.labriegos.every((l, i) => sinLlaves(l, ['puntos']) === sinLlaves(antes.labriegos[i], ['puntos'])),
  );
  {
    const vista = proyectarLasLindes(despues, ESPECTADOR, NADIE_SENTADO);
    const panel = vista.tablero.paneles.find((p) => p.titulo === 'La refriega');
    comprobar(
      'lindes: la crónica lo cuenta en su panel, con los puntos, como se cuenta un cobro',
      canonico(despues.refriegas ?? null) === canonico([{ de, para, puntos: PUNTOS_DEL_BOTIN }]) &&
        panel?.lineas[0] === `${para} le quita ${PUNTOS_DEL_BOTIN} puntos a ${de} en la refriega.`,
      panel,
    );
    comprobar(
      'lindes: y una partida sin refriega no manda el campo: la vista de siempre, igual',
      !('refriegas' in proyectarLasLindes(antes, ESPECTADOR, NADIE_SENTADO)) && 'refriegas' in vista,
    );
  }

  /* El tope: con menos de tres se lleva los que haya; con cero, nada, y nunca bajo cero. */
  const vaciado = vaciarConBotines(LINDES, antes, de, para, asientos);
  {
    const tenia = rico.puntos;
    comprobar(
      `lindes: con menos de ${PUNTOS_DEL_BOTIN} puntos se lleva los que haya, y nadie baja de cero`,
      vaciado.entraron === Math.ceil(tenia / PUNTOS_DEL_BOTIN) &&
        labriegoDe(vaciado.estado as EstadoDeLasLindes, de).puntos === 0 &&
        labriegoDe(vaciado.estado as EstadoDeLasLindes, para).puntos === labriegoDe(antes, para).puntos + tenia,
      { tenia, entraron: vaciado.entraron },
    );
  }

  /*
   * LO QUE DEPENDE DE LOS PUNTOS: nada durante la partida, y quién gana al final. La misma partida
   * repetida con un botín cada pocos apuntes pone las mismas losas, planta lo mismo y cobra lo mismo
   * —el total de puntos es el mismo—, y al acabar gana quien más tiene, sin nadie en negativo.
   */
  {
    const conBotines = repetir(5);
    const otroFinal = conBotines.estados[conBotines.estados.length - 1] as EstadoDeLasLindes;
    const total = (e: EstadoDeLasLindes): number => e.labriegos.reduce((s, l) => s + l.puntos, 0);
    const mayor = Math.max(...otroFinal.labriegos.map((l) => l.puntos));
    console.log(
      `  lindes: ${conBotines.botines} botines metidos en ${jugada.apuntes.length} apuntes; ` +
        `${total(final)} puntos repartidos con y sin ellos`,
    );
    comprobar('lindes: la partida con botines metidos entre medias lleva botines de verdad', conBotines.botines >= 10, conBotines.botines);
    comprobar(
      'lindes: y pone las mismas losas, planta y cobra lo mismo y termina igual: el botín sólo mueve puntos',
      otroFinal.momento === 'terminada' &&
        sinLlaves(otroFinal, ['labriegos', 'refriegas', 'ganadores']) === sinLlaves(final, ['labriegos', 'refriegas', 'ganadores']) &&
        otroFinal.labriegos.every((l, i) => sinLlaves(l, ['puntos']) === sinLlaves(final.labriegos[i], ['puntos'])) &&
        total(otroFinal) === total(final),
      { conBotines: total(otroFinal), sin: total(final) },
    );
    comprobar('lindes: nadie baja de cero en ningún momento de la partida', conBotines.minimo >= 0, conBotines.minimo);
    comprobar(
      'lindes: y al acabar gana quien más puntos tiene',
      canonico(otroFinal.ganadores) === canonico(otroFinal.labriegos.filter((l) => l.puntos === mayor).map((l) => l.asiento)),
      otroFinal.labriegos,
    );
  }

  return {
    arcade: LINDES,
    asientos,
    enJuego: antes,
    de,
    para,
    terminada: final,
    sinNada: { estado: vaciado.estado, de, para },
  };
}

/* ─── Cada juego que se recorre, con su prueba ───────────────────────────── */

const PRUEBAS: ReadonlyMap<ArcadeId, () => PartidaParaElBotin | null> = new Map<ArcadeId, () => PartidaParaElBotin | null>([
  [RIBERAS, probarRiberas],
  [BURGO, probarElBurgo],
  [LINDES, probarLasLindes],
]);

let probados = 0;
const seRecorren = arcadesQueSeRecorren();
for (const arcade of seRecorren) {
  const prueba = PRUEBAS.get(arcade);
  comprobar(`«${arcade}» se recorre, y en una mesa botas se cae: tiene su prueba del botín`, prueba !== undefined);
  if (prueba === undefined) continue;
  paso(`El botín en «${arcade}»`);
  const partida = prueba();
  comprobar(`«${arcade}»: su prueba llegó a jugar una partida en juego`, partida !== null);
  if (partida === null) continue;
  lasReglasComunes(partida);
  probados++;
}
comprobar(
  'y no quedan pruebas de juegos que ya no se recorren',
  [...PRUEBAS.keys()].every((a) => seRecorren.includes(a)),
  [...PRUEBAS.keys()],
);
comprobar('se han probado al menos los tres juegos que se recorren hoy: un bucle vacío no es verde', probados >= 3, { probados });

/* ─── Cuántas ────────────────────────────────────────────────────────────── */

/*
 * EL SUELO ES EL NÚMERO EXACTO DE HOY: las del lector, las del registro y, de cada juego, las suyas
 * y las comunes. Una prueba que se corta a medias —porque su partida no llegó a lo que buscaba— se
 * salta comprobaciones y baja de aquí, además de ponerse roja por su cuenta.
 *
 * Lo pone el arnés, y cuenta como la última comprobación igual que cuando se escribía aquí a mano
 * (118 y ésta, 119): el número que se imprime es el mismo, y un bloque saltado sale con 2.
 */
terminar({
  escritas: 119,
  enVerde:
    'El botín sólo lo mete el servidor, entre dos sentados distintos que juegan la partida, y\n' +
    '  cada juego que se recorre se lleva lo que dice su regla sin atascarse.',
});
