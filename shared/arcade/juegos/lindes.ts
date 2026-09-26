/**
 * LAS LINDES: el tercer arcade, y el primero cuyo tablero no existe hasta que lo
 * ponen los que juegan.
 *
 * ═══ QUÉ DEMUESTRA, QUE ES POR LO QUE ESTÁ ESCRITO ═══
 *
 * Riberas demostró que el núcleo admitía un tablero. Lo que no demostró —porque
 * su delta se reparte una vez y no cambia— es que admita un tablero que **crece**:
 * una topología que no existe al abrir la mesa, que es distinta en cada partida y
 * en la que cada movimiento puede fundir dos regiones en una.
 *
 * El diff sigue siendo la medida: **cero líneas en `shared/arcade/`**. Ni un
 * campo del manifiesto, ni un parámetro en el alta, ni una rama en el motor. Lo
 * único que se añade fuera de este juego es lo que el §7 ya tenía previsto: una
 * fila en la tabla de pintores de cada cliente.
 *
 * ═══ LO LEGAL, QUE AQUÍ VA DELANTE ═══
 *
 * Las reglas y las mecánicas de un juego de mesa no son objeto de copyright ni de
 * patente; lo protegido es la expresión. Así que de este fichero para afuera no
 * hay ni un nombre ajeno, ni una frase de un reglamento ajeno, ni un «inspirado
 * en» — que no protege y mete la marca de otro en los metadatos indexables, que
 * es justo lo que las tiendas sancionan. El nombre es nuestro, las palabras son
 * nuestras y el dibujo lo genera `escenas/lindes/` con las piezas que ya levantan
 * el delta. El razonamiento entero está en el §0 de `docs/lindes/DISENO.md` y en
 * el §8 de `docs/MOTOR-DE-ARCADE.md`.
 *
 * `procedencia: 'mecanica-generica'`, y no `'creacion-propia'`, que sería falso:
 * el reparto de losas viene de un juego concreto. Poner cuadrados que casan por
 * los bordes no tiene dueño; fingir que lo inventamos aquí sería la clase de
 * etiqueta que nadie puede auditar.
 *
 * ═══ LAS COSAS NO VIVEN EN EL ESTADO ═══
 *
 * Ni las villas, ni las sendas, ni los prados. Se derivan del tablero cada vez
 * que hacen falta, y quien lo hace es `lindes-cosas.ts`, que tiene escrito por
 * qué. Aquí sólo vive lo que NO se puede derivar: quién está sentado, cuántos
 * labriegos le quedan, qué hay en la bolsa, de quién es el turno y cuántos puntos
 * lleva cada cual.
 *
 * ═══ LO QUE ESTE FICHERO NO IMPORTA ═══
 *
 * Nada de `node:`, nada de React, nada de `three`, ningún reloj de pared y ningún
 * azar del sistema. Lo vigila `verify:pureza`, y no es celo: este mismo fichero
 * tiene que correr dentro de Hermes en un móvil y dentro de Node en Render, y dar
 * exactamente lo mismo.
 */
import { rechazar } from '../motor';
import type { Rechazo } from '../motor';
import { esTic } from '../reloj';
import { esBotin, leerElBotin } from './botin';
import { esHallazgo, leerElHallazgo } from './hallazgo';
import { HALLAZGOS_DE_LAS_LINDES, clasesDe } from './hallazgos-de-los-juegos';
import {
  ESCUDOS_DEL_BOTIN,
  ESCUDOS_POR_LEVA,
  LEVA,
  LEVAS_POR_JUGADOR,
  PUNTOS_POR_ESCUDO,
  escudosDeLaVista,
  levasDeLaVista,
  puedePagarLaLeva,
} from './lindes-escudos';
import { NADIE_SENTADO, comoSeLlama } from '../tipos';
import type { ArcadeId, AsientoId, LosSentados, ManifiestoDeArcade, QuienMira } from '../tipos';
import type { ContextoMovimiento, Movimiento } from '../movimiento';
import type { Opcion } from '../opciones';
import { barajar, sembrar } from '../../mecanicas/azar';
import type { Azar } from '../../mecanicas/azar';
import type { TableroDeclarado } from '../../mecanicas/tablero-declarado';
import {
  CLASES_DE_COSA,
  LOSA_DE_SALIDA,
  NOMBRE_DE_LA_COSA,
  bolsaSinBarajar,
  huecoGirado,
  ladoGirado,
  llaveDeCasilla,
  losaPorId,
} from './lindes-losas';
import type { ClaseDeCosa, Giro, Lado, Losa } from './lindes-losas';
import {
  POR_VILLA_DEL_PRADO,
  cabe,
  cosasDelTablero,
  cosasQueTocan,
  dondeCabe,
  nudoDeLoPlantado,
  porTexto,
  villasDelPrado,
} from './lindes-cosas';
import type { Colocacion, Cosa, Cosas, Tablero } from './lindes-cosas';

export type { Opcion };

/** El identificador del arcade. Nunca se le enseña a nadie. */
export const LINDES: ArcadeId = 'lindes';

/**
 * CUÁNTOS LABRIEGOS TIENE CADA CUAL.
 *
 * Siete, y son el recurso entero del juego: no hay dinero, ni cartas, ni nada más
 * que repartir. Plantar uno es apostar a que eso se cierra antes de que se acabe
 * la bolsa, porque hasta que se cierre no vuelve.
 */
export const LABRIEGOS_POR_JUGADOR = 7;

/**
 * LOS COLORES, en el orden en que se reparten por asiento.
 *
 * Cinco, uno por sitio de la mesa. No salen del atlas del pack —que trae cuatro y
 * horneados— sino que se tiñen al cargar, que es lo que `escenas/burgo/tinte-del-burgo.ts`
 * ya hace con las casas y los peones del Burgo. Por eso aquí no hay el límite de
 * cuatro que Riberas todavía tiene escrito.
 */
export const COLORES_DE_LAS_LINDES: readonly string[] = [
  '#c8303a',
  '#2f5fd0',
  '#e0a32e',
  '#3f9a56',
  '#ece3cf',
];

/** Cómo se llama cada color cuando hay que escribirlo. */
export const NOMBRES_DE_LOS_COLORES: readonly string[] = [
  'carmín',
  'índigo',
  'ocre',
  'musgo',
  'hueso',
];

/** El aforo. Cinco colores, cinco sitios. */
export const CABEN = { minimo: 2, maximo: 5 } as const;

/**
 * LO QUE SE LLEVA EL BOTÍN DE LA REFRIEGA: hasta tres puntos de quien cae, para quien lo tumbó.
 *
 * Puntos y no labriegos, y no es por comodidad. Un labriego es la única pieza con la que se
 * juega —siete por cabeza, y hasta que lo que ocupa no se cierra no vuelve—, así que quitar uno
 * dejaría a quien cae con menos turnos de verdad por delante, y quitar uno PLANTADO desharía una
 * mayoría sobre una villa ajena a la que nadie ha tocado. Los puntos, en cambio, no gobiernan
 * nada hasta el recuento final: pasarlos de una columna a otra cambia quién va ganando y no
 * cambia qué se puede hacer. Tres es lo que vale una senda cerrada de tres losas: se nota en el
 * marcador, y no decide una partida en un solo golpe.
 */
export const PUNTOS_DEL_BOTIN = 3;

/**
 * Cuántas refriegas recuerda la mesa para contarlas. Las más viejas se caen por delante.
 *
 * Es una crónica y no un registro: el registro es el diario de la mesa, que las guarda todas.
 * Aquí sólo hace falta que quien mira sepa qué acaba de pasar, y tres dan para dos peleas
 * seguidas en sitios distintos sin que la tercera tape a la primera.
 */
export const REFRIEGAS_QUE_SE_RECUERDAN = 3;

// ---------------------------------------------------------------------------
// Los momentos
// ---------------------------------------------------------------------------

/**
 * EN QUÉ PUNTO ESTÁ LA MESA.
 *
 * Cuatro, y la pareja `colocando` / `plantando` es la que ordena el turno: se
 * pone la losa, y SÓLO DESPUÉS se decide si se planta. El orden importa y no es
 * cosmético: un labriego puede entrar en algo que la losa que acabas de poner
 * **acaba de cerrar**, y cobrarlo en el acto. Con el reparto al revés —plantar
 * antes de ver dónde cae la losa— esa jugada no existiría.
 */
export type MomentoDeLasLindes = 'reuniendo' | 'colocando' | 'plantando' | 'terminada';

// ---------------------------------------------------------------------------
// Los movimientos: cuatro, y ni uno más
// ---------------------------------------------------------------------------

/** Reparte la bolsa, pone la losa de salida y roba la primera. */
export const EMPEZAR = 'lindes:empezar';
/** `{ x, y, giro }` — pone la losa de la mano. */
export const PONER = 'lindes:poner';
/** `{ clase, indice }` — planta un labriego en la losa recién puesta. */
export const PLANTAR = 'lindes:plantar';
/** No planta, y el turno pasa. */
export const PASAR = 'lindes:pasar';
/*
 * Y UN QUINTO QUE SÓLO EXISTE A PIE: `LEVA` (`lindes-escudos.ts`), `{}`, que paga
 * `ESCUDOS_POR_LEVA` escudos por un labriego más. Sólo se ofrece a quien tiene
 * escudos, y los escudos sólo llegan por `arcade:hallazgo` en una mesa `botas`: en
 * una mesa normal no se ofrece nunca. Ver `alistarUnLabriego`.
 */

// ---------------------------------------------------------------------------
// El estado
// ---------------------------------------------------------------------------

/** Quién juega, en el orden en que se sentó. */
export interface Labriego {
  readonly asiento: AsientoId;
  /** Lo que lleva cobrado. Público: se ve en la mesa. */
  readonly puntos: number;
  /** Cuántos labriegos le quedan por plantar, de `LABRIEGOS_POR_JUGADOR`. */
  readonly sinPlantar: number;
}

/**
 * UNA LOSA PUESTA.
 *
 * `ficha` es el número de serie con el que vivía en la bolsa —`'17:senda-recta'`—
 * y se conserva al ponerla. No es adorno:
 *
 *   · **Es lo que hace secreta a la bolsa.** El identificador de una clase de
 *     losa (`senda-recta`) sale en el tablero de todo el mundo, así que declararlo
 *     secreto daría un rojo falso en `verify:mesa`. El número de serie no sale en
 *     ninguna vista mientras está en la bolsa, y en cuanto sale ya no está.
 *   · **Y es lo que la escena necesita** para reconocer una losa entre dos
 *     revisiones: sin él, dos losas iguales en dos sitios son indistinguibles y
 *     cualquier animación de llegada se repinta entera.
 */
export interface PuestaDeLosa {
  readonly losa: string;
  readonly giro: Giro;
  readonly ficha: string;
  /** Quién la puso. Vacío en la de salida, que no la puso nadie. */
  readonly quien: AsientoId;
  /** En qué turno se puso. Cero la de salida. Sirve para pintar el orden. */
  readonly orden: number;
}

/** Un labriego plantado en algo. */
export interface Plantado {
  readonly casilla: string;
  readonly clase: ClaseDeCosa;
  /** El índice DENTRO DEL CATÁLOGO de la losa, no del tablero: ver `nudoDeLoPlantado`. */
  readonly indice: number;
  readonly asiento: AsientoId;
}

/** Algo que se cobró. Se guarda lo del último remate para poder contarlo. */
export interface Cobro {
  readonly clase: ClaseDeCosa;
  readonly puntos: number;
  /** Cuántas losas medía. */
  readonly losas: number;
  /** Quién cobró. Más de uno cuando hubo empate. */
  readonly quienes: readonly AsientoId[];
  /** ¿Se cobró al cerrarse, o en el recuento final? */
  readonly alFinal: boolean;
}

/** Una refriega que dio botín: quién cayó y perdió, quién lo tumbó y se lo llevó, y cuántos puntos. */
export interface RefriegaDeLasLindes {
  readonly de: AsientoId;
  readonly para: AsientoId;
  readonly puntos: number;
  /**
   * Los escudos que pasaron además de los puntos (`ESCUDOS_DEL_BOTIN` como mucho). SÓLO si pasó
   * alguno: una refriega sin escudos se escribe exactamente como antes de que existieran.
   */
  readonly escudos?: number;
}

export interface EstadoDeLasLindes {
  momento: MomentoDeLasLindes;
  /** Vacío mientras se reúne la mesa. */
  labriegos: Labriego[];
  /** El tablero: de la llave de una casilla a la losa que hay puesta. */
  tablero: Record<string, PuestaDeLosa>;
  plantados: Plantado[];
  /**
   * LO QUE QUEDA POR ROBAR, ya barajado y SECRETO ENTERO.
   *
   * Se baraja una vez al empezar y se roba por delante, como el mazo de Riberas y
   * por las mismas dos razones: una bolsa se puede CONTAR —saber que ya no quedan
   * ermitas es información legítima del juego— y, sobre todo, sortear al robar
   * haría que la partida dependiera del orden en que llegan las peticiones, y con
   * eso se caería la reejecución, que es lo que sostiene el motor entero.
   */
  bolsa: string[];
  /** La losa robada que hay que poner, con su número de serie. Vacío si no hay. */
  enMano: string;
  /** A quién le toca: índice dentro de `labriegos`. */
  turno: number;
  /** Cuántos turnos se han abierto. Sólo sube. */
  turnosAbiertos: number;
  /** La llave de la última losa puesta. Vacío antes de la primera. */
  ultima: string;
  /** Cuántas losas se retiraron por no caber en ningún sitio. */
  retiradas: number;
  /** Lo que se cobró en el último remate. Se vacía al abrir el turno siguiente. */
  cobros: Cobro[];
  /** La semilla y el contador. Secreto entero: sale en la proyección y no vuelve. */
  azar: Azar;
  /** Quién ganó. Vacío hasta que termina. */
  ganadores: AsientoId[];
  /**
   * LAS ÚLTIMAS REFRIEGAS QUE DIERON BOTÍN, de la más vieja a la más nueva. Públicas enteras:
   * en Boots on Board la pelea se ve, y los puntos de cada cual ya salen en la mesa.
   *
   * ═══ OPCIONAL, Y NO UNA LISTA VACÍA DESDE EL PRINCIPIO, A PROPÓSITO ═══
   *
   * Una partida en la que nadie ha caído tiene que seguir siendo, byte a byte, la de antes de
   * que existiera el botín: `oro:arcade` congela el estado final y las vistas de cada revisión
   * de una partida entera de este juego (`oro-arcade/lindes.json`), y ese oro no se recaptura
   * porque sí. Con el campo puesto siempre —aunque fuera `[]`— cambiarían todas sus huellas sin
   * que cambiara ninguna regla, y un oro que hay que recapturar por un campo vacío enseña a
   * recapturarlo sin mirar. Así que aparece con la primera refriega y ya no se va.
   */
  refriegas?: RefriegaDeLasLindes[];
  /**
   * LOS ESCUDOS SIN GASTAR DE CADA UNO, recogidos a pie en Boots on Board (`arcade:hallazgo`, clase
   * `escudo`). Públicos: en la mesa se ven. Se gastan en la leva o valen `PUNTOS_POR_ESCUDO` cada uno
   * en el recuento final, y se quedan escritos después de él para que se vea de dónde salieron esos
   * puntos. OPCIONAL por lo mismo que `refriegas`: aparece con el primer hallazgo, y una partida en
   * la que nadie baja al valle es, byte a byte, la de antes. Ver `docs/AVATARES-JUGABLES.md` §5.
   */
  escudos?: Record<AsientoId, number>;
  /** Cuántas levas ha pagado cada uno, de `LEVAS_POR_JUGADOR`. Opcional: aparece con la primera. */
  levas?: Record<AsientoId, number>;
}

/** Una mesa recién puesta, sin bolsa y sin tablero. */
export function partidaNueva(): EstadoDeLasLindes {
  return {
    momento: 'reuniendo',
    labriegos: [],
    tablero: {},
    plantados: [],
    bolsa: [],
    enMano: '',
    turno: 0,
    turnosAbiertos: 0,
    ultima: '',
    retiradas: 0,
    cobros: [],
    azar: sembrar(0),
    ganadores: [],
  };
}

// ---------------------------------------------------------------------------
// Las fichas: número de serie y clase
// ---------------------------------------------------------------------------

/** La clase de losa que hay dentro de una ficha. */
export function losaDeLaFicha(ficha: string): string {
  const corte = ficha.indexOf(':');
  return corte < 0 ? '' : ficha.slice(corte + 1);
}

/** El número de serie de una ficha, para ordenar sin mirar la clase. */
export function serieDeLaFicha(ficha: string): number {
  const corte = ficha.indexOf(':');
  if (corte < 0) return -1;
  const n = Number(ficha.slice(0, corte));
  return Number.isInteger(n) ? n : -1;
}

/** La ficha de la losa de salida. La cero, que es la única que no se baraja. */
export const FICHA_DE_SALIDA = `0:${LOSA_DE_SALIDA}`;

/** Dónde se pone la losa de salida. */
export const CASILLA_DE_SALIDA = llaveDeCasilla(0, 0);

// ---------------------------------------------------------------------------
// El reductor
// ---------------------------------------------------------------------------

/**
 * EL REDUCTOR. Puro, sin reloj y sin azar del sistema.
 *
 * ═══ EL PORTILLO DEL §5 bis ═══
 *
 * Antes de mirar de qué movimiento se trata, se le pregunta al propio juego qué
 * le habría ofrecido a quien lo manda, CON LO QUE ESA PERSONA VE. Si no estaba en
 * la lista, se rechaza devolviendo el mismo objeto de estado y el motivo por
 * fuera. Y después SIGUE VALIDANDO, que es la otra mitad: «qué te puedo ofrecer a
 * ti» y «qué es legal con todo lo que hay» son dos preguntas distintas.
 *
 * Aquí la segunda mitad no es ceremonia y conviene decir dónde muerde: la bolsa
 * es secreta, así que la vista de quien mueve NO dice cuántas losas quedan de
 * cada clase ni cuál viene después. Un movimiento puede ser legal con lo que él
 * ve y no serlo con lo que hay — por ejemplo, poner una losa que ya no es la de
 * su mano porque otro se le adelantó entre que se pintó el botón y lo pulsó.
 *
 * ═══ LAS TRES REGLAS DE SIEMPRE ═══
 *
 *  1. NO MUTA: cada rama devuelve un objeto nuevo, o EL MISMO cuando no pasa nada.
 *  2. NO MIRA EL RELOJ NI EL AZAR DEL SISTEMA.
 *  3. SIEMPRE DEVUELVE UN ESTADO, nunca una excepción: quien hospeda no sabe
 *     distinguir «lo rechacé» de «reventé».
 */
export function avanzarLasLindes(
  estado: EstadoDeLasLindes | undefined,
  movimiento: Movimiento,
  ctx: ContextoMovimiento,
): EstadoDeLasLindes | Rechazo<EstadoDeLasLindes> {
  const actual = estado ?? partidaNueva();

  /*
   * El tic no pasa por el portillo: no lo manda ningún asiento, viene con
   * `quien: null`. Y este juego no tiene plazos, así que no hace nada — pero
   * tiene que devolver un estado igualmente.
   */
  if (esTic(movimiento)) return actual;

  /*
   * EL BOTÍN TAMPOCO PASA POR EL PORTILLO, y por lo mismo que el tic: no lo manda ningún
   * asiento —lo mete el servidor cuando alguien cae en Boots on Board—, así que `opciones()` no
   * se lo ofrece a nadie y el portillo lo tiraría siempre. Lo que el portillo no mira, lo mira
   * `elBotin` con su propio lector, que es más estricto que él. Ver `botin.ts`.
   */
  if (esBotin(movimiento)) return elBotin(actual, movimiento.carga, ctx);
  /* EL HALLAZGO, por lo mismo: lo mete el servidor cuando alguien recoge un escudo a pie. */
  if (esHallazgo(movimiento)) return elHallazgo(actual, movimiento.carga, ctx);

  const vista = loQueSeVe(actual, ctx.quien, NADIE_SENTADO);
  if (!estaOfrecido(opcionesDeLasLindes(vista, ctx.quien), movimiento)) {
    return rechazar(
      actual,
      'Eso ya no se puede hacer: la mesa cambió entre que se pintó el botón y lo pulsaste.',
    );
  }

  switch (movimiento.tipo) {
    case EMPEZAR:
      return repartirLaBolsa(actual, ctx);
    case PONER:
      return ponerLaLosa(actual, ctx, movimiento.carga);
    case PLANTAR:
      return plantarUnLabriego(actual, ctx, movimiento.carga);
    case PASAR:
      return rematarElTurno(actual, ctx.quien);
    case LEVA:
      return alistarUnLabriego(actual, ctx);
    default:
      /*
       * Un movimiento que este juego no conoce se ignora y devuelve el estado: la
       * plataforma puede meter movimientos suyos, y un juego no se puede caer por
       * no conocerlos. En la práctica el portillo ya lo rechazó antes de llegar.
       */
      return actual;
  }
}

/**
 * ¿ESTABA ESTE MOVIMIENTO ENTRE LOS OFRECIDOS?
 *
 * Se compara la forma canónica de `{ tipo, carga }`, y no campo a campo: la carga
 * es `unknown` por contrato, y compararla a mano obligaría a conocer la forma de
 * cada movimiento en dos sitios.
 *
 * ═══ POR QUÉ AQUÍ NO HAY PUERTA DE `declaracion` Y EN RIBERAS SÍ ═══
 *
 * Porque aquí la lista CABE. Las colocaciones legales de una losa son, como
 * mucho, las casillas libres del borde por cuatro giros: unas pocas decenas al
 * principio y unos dos centenares en una partida larga. La familia que no cabía
 * en Riberas era el producto de cinco bienes por tres por lado, que son miles.
 *
 * Y plantar va en su propio momento —después de poner, y sobre una losa ya
 * puesta— que es lo que impide que las dos listas se multipliquen entre sí. Ése
 * es el motivo de que el turno tenga dos momentos y no uno.
 */
function estaOfrecido(opciones: readonly Opcion[], movimiento: Movimiento): boolean {
  let buscado = '';
  try {
    buscado = deForma({ tipo: movimiento.tipo, carga: movimiento.carga ?? null });
  } catch {
    return false;
  }
  for (const o of opciones) {
    if (deForma({ tipo: o.tipo, carga: o.carga ?? null }) === buscado) return true;
  }
  return false;
}

/**
 * LA FORMA CANÓNICA DE UN MOVIMIENTO, para compararlo.
 *
 * No se usa `canonico.ts` porque aquí las cargas son de este juego y se conocen:
 * un objeto llano de números y cadenas. Escribirlo a mano ordena las claves igual
 * y no arrastra al núcleo del arcade una dependencia de `mecanicas/` que no
 * necesita.
 */
function deForma(x: unknown): string {
  if (x === null || x === undefined) return 'null';
  if (typeof x === 'number' || typeof x === 'boolean') return String(x);
  if (typeof x === 'string') return JSON.stringify(x);
  if (Array.isArray(x)) return `[${x.map(deForma).join(',')}]`;
  if (typeof x === 'object') {
    const llaves = Object.keys(x as Record<string, unknown>).sort(porTexto);
    return `{${llaves.map((k) => `${JSON.stringify(k)}:${deForma((x as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  /* Una función o un símbolo en una carga no es ninguna de las opciones. */
  throw new Error('no serializable');
}

// ---------------------------------------------------------------------------
// Empezar
// ---------------------------------------------------------------------------

/**
 * REPARTE LA BOLSA Y PONE LA LOSA DE SALIDA.
 *
 * El aforo se comprueba con `ctx.asientos`, que es donde vive la verdad: el
 * estado no guarda una copia de quién está sentado, por lo mismo que Riberas
 * escribió y luego borró —una copia que nace vacía en el primer movimiento es una
 * copia que impide que exista el primer movimiento—.
 *
 * La semilla sale de `ctx.azar`, que llega en el contexto y queda en el diario:
 * reejecutar la partida baraja exactamente la misma bolsa.
 */
function repartirLaBolsa(
  estado: EstadoDeLasLindes,
  ctx: ContextoMovimiento,
): EstadoDeLasLindes | Rechazo<EstadoDeLasLindes> {
  if (estado.momento !== 'reuniendo') return estado;
  const cuantos = ctx.asientos.length;
  if (cuantos < CABEN.minimo) {
    return rechazar(estado, `Hacen falta al menos ${CABEN.minimo} para repartir la bolsa.`);
  }
  if (cuantos > CABEN.maximo) {
    return rechazar(estado, `En esta mesa caben ${CABEN.maximo}, y sois ${cuantos}.`);
  }

  const labriegos: Labriego[] = [];
  for (const asiento of ctx.asientos) {
    labriegos.push({ asiento, puntos: 0, sinPlantar: LABRIEGOS_POR_JUGADOR });
  }

  const sinBarajar: string[] = [];
  const crudas = bolsaSinBarajar();
  for (let i = 0; i < crudas.length; i++) sinBarajar.push(`${i + 1}:${crudas[i] as string}`);
  const tirada = barajar(sembrar(ctx.azar), sinBarajar);

  const tablero: Record<string, PuestaDeLosa> = {
    [CASILLA_DE_SALIDA]: {
      losa: LOSA_DE_SALIDA,
      giro: 0,
      ficha: FICHA_DE_SALIDA,
      quien: '',
      orden: 0,
    },
  };

  return conLosaEnMano({
    ...estado,
    momento: 'colocando',
    labriegos,
    tablero,
    plantados: [],
    bolsa: tirada.valor,
    enMano: '',
    turno: 0,
    turnosAbiertos: 1,
    ultima: '',
    retiradas: 0,
    cobros: [],
    azar: tirada.azar,
    ganadores: [],
  });
}

/**
 * ROBA HASTA TENER UNA LOSA QUE QUEPA EN ALGÚN SITIO.
 *
 * Una losa que no cabe en ninguna casilla se **retira de la partida** y se coge
 * otra. Pasa poco y pasa: con el tablero cerrado por murallas, una `senda-recta`
 * puede no tener dónde ir. Si no se retirara, la mesa se quedaría atascada con
 * una losa imposible en la mano y sin ningún movimiento legal — que es el peor
 * final posible, porque no da ningún error.
 *
 * Y si la bolsa se acaba, la partida se remata aquí mismo.
 */
function conLosaEnMano(estado: EstadoDeLasLindes): EstadoDeLasLindes {
  let bolsa = estado.bolsa;
  let retiradas = estado.retiradas;
  const tablero = estado.tablero as Tablero;

  while (bolsa.length > 0) {
    const ficha = bolsa[0] as string;
    const resto = bolsa.slice(1);
    if (dondeCabe(tablero, losaDeLaFicha(ficha)).length > 0) {
      /*
       * `retiradas` va en la vuelta, y no es un adorno: si se retiran dos losas y
       * la tercera cabe, con `...estado` se devolvería la cuenta VIEJA y esas dos
       * losas desaparecerían de la partida sin que nada lo dijera. Lo cazó el
       * invariante «las puestas, las retiradas, la de la mano y la bolsa suman
       * setenta y dos», que es la única forma de ver una losa que no está en
       * ningún sitio.
       */
      return { ...estado, bolsa: resto, enMano: ficha, retiradas, momento: 'colocando' };
    }
    bolsa = resto;
    retiradas++;
  }

  return rematarLaPartida({ ...estado, bolsa: [], enMano: '', retiradas });
}

// ---------------------------------------------------------------------------
// Poner
// ---------------------------------------------------------------------------

/** La carga de `PONER`, si tiene la forma que hace falta. */
function colocacionDeLaCarga(carga: unknown): Colocacion | null {
  if (typeof carga !== 'object' || carga === null) return null;
  const c = carga as Record<string, unknown>;
  const x = c['x'];
  const y = c['y'];
  const giro = c['giro'];
  if (!Number.isInteger(x) || !Number.isInteger(y)) return null;
  if (giro !== 0 && giro !== 1 && giro !== 2 && giro !== 3) return null;
  return { x: x as number, y: y as number, giro };
}

function ponerLaLosa(
  estado: EstadoDeLasLindes,
  ctx: ContextoMovimiento,
  carga: unknown,
): EstadoDeLasLindes | Rechazo<EstadoDeLasLindes> {
  if (estado.momento !== 'colocando') return estado;
  if (ctx.quien === null || ctx.quien !== deQuienEsElTurno(estado)) {
    return rechazar(estado, 'No es tu turno.');
  }
  const donde = colocacionDeLaCarga(carga);
  if (donde === null) return rechazar(estado, 'Esa colocación no se entiende.');
  const losa = losaPorId(losaDeLaFicha(estado.enMano));
  if (losa === null) return rechazar(estado, 'No hay ninguna losa en la mano.');
  if (!cabe(estado.tablero as Tablero, losa, donde.giro, donde.x, donde.y)) {
    return rechazar(estado, 'Ahí no casa: todo lado pegado a otro tiene que enseñar lo mismo.');
  }

  const llave = llaveDeCasilla(donde.x, donde.y);
  const tablero: Record<string, PuestaDeLosa> = { ...estado.tablero };
  tablero[llave] = {
    losa: losa.id,
    giro: donde.giro,
    ficha: estado.enMano,
    quien: ctx.quien,
    orden: estado.turnosAbiertos,
  };

  const puesta: EstadoDeLasLindes = {
    ...estado,
    momento: 'plantando',
    tablero,
    enMano: '',
    ultima: llave,
    cobros: [],
  };

  /*
   * ═══ SI NO HAY DÓNDE PLANTAR, EL TURNO SE REMATA SOLO ═══
   *
   * No es una comodidad: es que en la mesa de verdad no existe el acto de «pasar»
   * cuando no puedes plantar. Quedarse en `plantando` con la única opción de
   * pasar obligaría a pulsar un botón que no decide nada, y —peor— haría que el
   * momento de la vista dijera «está decidiendo» cuando no hay nada que decidir.
   */
  if (dondeSePuedePlantar(puesta, ctx.quien).length === 0) return rematarElTurno(puesta, ctx.quien);
  return puesta;
}

// ---------------------------------------------------------------------------
// Plantar
// ---------------------------------------------------------------------------

/** Una cosa de la losa recién puesta donde cabe un labriego. */
export interface DondePlantar {
  readonly clase: ClaseDeCosa;
  readonly indice: number;
  /** El identificador de la cosa, para pintarla resaltada. */
  readonly cosa: string;
  /** Lo que se cobraría si se cerrara ahora mismo. */
  readonly valdria: number;
  /** ¿Está ya cerrada? Entonces se cobra en el acto y el labriego vuelve. */
  readonly cerrada: boolean;
}

/**
 * DÓNDE PUEDE PLANTAR AHORA MISMO QUIEN TIENE EL TURNO.
 *
 * Las tres condiciones, y las tres son reglas del juego y no del programa:
 *
 *   1. Tiene que quedarle algún labriego sin plantar.
 *   2. Sólo se planta en la losa que se acaba de poner.
 *   3. Y sólo en una cosa que **no tenga gente ya**, contando toda la cosa por el
 *      tablero entero y no sólo la parte que se ve en esta losa. Ésa es la regla
 *      que hace que fundir dos villas con una losa sea una jugada y no un adorno.
 */
export function dondeSePuedePlantar(
  estado: EstadoDeLasLindes,
  quien: AsientoId | null,
): readonly DondePlantar[] {
  if (estado.momento !== 'plantando' || quien === null) return [];
  if (estado.ultima === '') return [];
  const mio = estado.labriegos.find((l) => l.asiento === quien);
  if (mio === undefined || mio.sinPlantar <= 0) return [];

  const puesta = estado.tablero[estado.ultima];
  if (puesta === undefined) return [];
  const losa = losaPorId(puesta.losa);
  if (losa === null) return [];

  const tablero = estado.tablero as Tablero;
  const cosas = cosasDelTablero(tablero);
  const conGente = cosasConGente(tablero, estado.plantados, cosas);

  const salida: DondePlantar[] = [];
  const mirar = (clase: ClaseDeCosa, cuantas: number): void => {
    for (let i = 0; i < cuantas; i++) {
      const nudo = nudoDeLoPlantado(tablero, estado.ultima, clase, i);
      if (nudo === '') continue;
      const id = cosas.deNudo[nudo];
      if (id === undefined || conGente[id] === true) continue;
      const cosa = cosas.porId[id];
      if (cosa === undefined) continue;
      salida.push({
        clase,
        indice: i,
        cosa: id,
        valdria: clase === 'prado' ? valeElPrado(tablero, cosas, cosa) : cosa.puntos,
        cerrada: cosa.cerrada,
      });
    }
  };

  for (const clase of CLASES_DE_COSA) {
    if (clase === 'villa') mirar('villa', losa.villas.length);
    else if (clase === 'senda') mirar('senda', losa.sendas.length);
    else if (clase === 'ermita') mirar('ermita', losa.ermita ? 1 : 0);
    else mirar('prado', losa.prados.length);
  }
  return salida;
}

/** La carga de `PLANTAR`, si tiene la forma que hace falta. */
function plantaDeLaCarga(carga: unknown): { clase: ClaseDeCosa; indice: number } | null {
  if (typeof carga !== 'object' || carga === null) return null;
  const c = carga as Record<string, unknown>;
  const clase = c['clase'];
  const indice = c['indice'];
  if (typeof clase !== 'string') return null;
  if (CLASES_DE_COSA.indexOf(clase as ClaseDeCosa) < 0) return null;
  if (!Number.isInteger(indice) || (indice as number) < 0) return null;
  return { clase: clase as ClaseDeCosa, indice: indice as number };
}

function plantarUnLabriego(
  estado: EstadoDeLasLindes,
  ctx: ContextoMovimiento,
  carga: unknown,
): EstadoDeLasLindes | Rechazo<EstadoDeLasLindes> {
  if (estado.momento !== 'plantando') return estado;
  if (ctx.quien === null || ctx.quien !== deQuienEsElTurno(estado)) {
    return rechazar(estado, 'No es tu turno.');
  }
  const que = plantaDeLaCarga(carga);
  if (que === null) return rechazar(estado, 'Eso no se entiende.');

  const sitios = dondeSePuedePlantar(estado, ctx.quien);
  const cabe = sitios.some((s) => s.clase === que.clase && s.indice === que.indice);
  if (!cabe) {
    return rechazar(estado, `Ahí no cabe un labriego: esa ${NOMBRE_DE_LA_COSA[que.clase]} ya tiene gente.`);
  }

  const labriegos = estado.labriegos.map((l) =>
    l.asiento === ctx.quien ? { ...l, sinPlantar: l.sinPlantar - 1 } : l,
  );
  const plantados = [
    ...estado.plantados,
    { casilla: estado.ultima, clase: que.clase, indice: que.indice, asiento: ctx.quien },
  ];

  return rematarElTurno({ ...estado, labriegos, plantados }, ctx.quien);
}

// ---------------------------------------------------------------------------
// Rematar el turno: cobrar lo cerrado y pasar
// ---------------------------------------------------------------------------

/**
 * COBRA LO QUE SE HAYA CERRADO Y PASA EL TURNO.
 *
 * Sólo se mira lo que TOCA la losa recién puesta —más las ermitas de las ocho de
 * alrededor, que una losa puede rematar sin ser suya—: nada más lejos ha podido
 * cambiar, y recorrer el tablero entero en cada turno sería contar setenta y dos
 * losas para cobrar una.
 */
function rematarElTurno(estado: EstadoDeLasLindes, quien: AsientoId | null): EstadoDeLasLindes {
  if (estado.momento !== 'plantando') return estado;
  if (quien === null || quien !== deQuienEsElTurno(estado)) return estado;

  const tablero = estado.tablero as Tablero;
  const cosas = cosasDelTablero(tablero);
  const cobros: Cobro[] = [];
  let labriegos = estado.labriegos;
  let plantados = estado.plantados;

  for (const id of cosasQueTocan(tablero, cosas, estado.ultima)) {
    const cosa = cosas.porId[id];
    if (cosa === undefined || !cosa.cerrada) continue;
    const quienes = losQueMandan(gentePorAsiento(tablero, plantados, cosas, id));
    if (quienes.length === 0) continue;

    cobros.push({
      clase: cosa.clase,
      puntos: cosa.puntos,
      losas: cosa.casillas.length,
      quienes,
      alFinal: false,
    });
    labriegos = conPuntos(labriegos, quienes, cosa.puntos);
    const vuelven = plantados.filter((p) => enLaCosa(tablero, p, cosas, id));
    labriegos = conLabriegosDevueltos(labriegos, vuelven);
    plantados = plantados.filter((p) => !enLaCosa(tablero, p, cosas, id));
  }

  const cobrado: EstadoDeLasLindes = { ...estado, labriegos, plantados, cobros };
  const siguiente: EstadoDeLasLindes = {
    ...cobrado,
    turno: cobrado.labriegos.length === 0 ? 0 : (cobrado.turno + 1) % cobrado.labriegos.length,
    turnosAbiertos: cobrado.turnosAbiertos + 1,
  };
  return conLosaEnMano(siguiente);
}

/**
 * EL NUDO DE UN LABRIEGO PLANTADO.
 *
 * Una línea, y existe para que la conversión de «lo que dice el movimiento» a «lo
 * que entiende el recuento» se escriba UNA vez. La hacen cuatro funciones de aquí
 * abajo, y cuatro copias de la misma traducción son cuatro sitios donde se puede
 * escribir `clase` donde va `indice`.
 */
function nudoDePlantado(tablero: Tablero, p: Plantado): string {
  return nudoDeLoPlantado(tablero, p.casilla, p.clase, p.indice);
}

/** ¿Está este labriego plantado en esa cosa? */
function enLaCosa(tablero: Tablero, p: Plantado, cosas: Cosas, id: string): boolean {
  return cosas.deNudo[nudoDePlantado(tablero, p)] === id;
}

/** Cuánta gente tiene cada asiento en una cosa. */
function gentePorAsiento(
  tablero: Tablero,
  plantados: readonly Plantado[],
  cosas: Cosas,
  id: string,
): Readonly<Record<AsientoId, number>> {
  const cuenta: Record<AsientoId, number> = {};
  for (const p of plantados) {
    if (cosas.deNudo[nudoDePlantado(tablero, p)] !== id) continue;
    cuenta[p.asiento] = (cuenta[p.asiento] ?? 0) + 1;
  }
  return cuenta;
}

/**
 * QUIÉN COBRA UNA COSA: el que más gente tenga, y TODOS si empatan.
 *
 * Nadie cobra la mitad de nada y nadie se queda a medias: es la regla de la mesa,
 * y escrita así —una lista y no un ganador— no hay que decidir nada raro cuando
 * tres empatan a dos.
 */
export function losQueMandan(cuenta: Readonly<Record<AsientoId, number>>): AsientoId[] {
  let mayor = 0;
  for (const asiento of Object.keys(cuenta).sort(porTexto)) {
    const suyos = cuenta[asiento] ?? 0;
    if (suyos > mayor) mayor = suyos;
  }
  if (mayor === 0) return [];
  const salida: AsientoId[] = [];
  for (const asiento of Object.keys(cuenta).sort(porTexto)) {
    if ((cuenta[asiento] ?? 0) === mayor) salida.push(asiento);
  }
  return salida;
}

function conPuntos(
  labriegos: readonly Labriego[],
  quienes: readonly AsientoId[],
  puntos: number,
): Labriego[] {
  return labriegos.map((l) => (quienes.indexOf(l.asiento) >= 0 ? { ...l, puntos: l.puntos + puntos } : l));
}

function conLabriegosDevueltos(
  labriegos: readonly Labriego[],
  vuelven: readonly Plantado[],
): Labriego[] {
  return labriegos.map((l) => {
    let cuantos = 0;
    for (const v of vuelven) if (v.asiento === l.asiento) cuantos++;
    return cuantos === 0 ? l : { ...l, sinPlantar: l.sinPlantar + cuantos };
  });
}

/** Qué cosas tienen gente, por identificador. */
function cosasConGente(
  tablero: Tablero,
  plantados: readonly Plantado[],
  cosas: Cosas,
): Readonly<Record<string, true>> {
  const conGente: Record<string, true> = {};
  for (const p of plantados) {
    const id = cosas.deNudo[nudoDePlantado(tablero, p)];
    if (id !== undefined) conGente[id] = true;
  }
  return conGente;
}

// ---------------------------------------------------------------------------
// El recuento final
// ---------------------------------------------------------------------------

/** Lo que cobra un prado: tres por cada villa CERRADA que toque. */
export function valeElPrado(tablero: Tablero, cosas: Cosas, prado: Cosa): number {
  let cuantas = 0;
  for (const id of villasDelPrado(tablero, cosas, prado)) {
    const villa = cosas.porId[id];
    if (villa !== undefined && villa.cerrada) cuantas++;
  }
  return cuantas * POR_VILLA_DEL_PRADO;
}

/**
 * EL RECUENTO FINAL: lo que quedó a medias, y los prados.
 *
 * Se recorre lo que TIENE GENTE y nada más: una villa sin labriegos no la cobra
 * nadie, y recorrerla sería contar para tirarlo.
 */
function rematarLaPartida(estado: EstadoDeLasLindes): EstadoDeLasLindes {
  const tablero = estado.tablero as Tablero;
  const cosas = cosasDelTablero(tablero);
  const cobros: Cobro[] = [...estado.cobros];
  let labriegos = estado.labriegos;

  const conGente: string[] = [];
  const vistas: Record<string, true> = {};
  for (const p of estado.plantados) {
    const id = cosas.deNudo[nudoDePlantado(tablero, p)];
    if (id === undefined || vistas[id] === true) continue;
    vistas[id] = true;
    conGente.push(id);
  }

  for (const id of conGente.sort(porTexto)) {
    const cosa = cosas.porId[id];
    if (cosa === undefined) continue;
    const quienes = losQueMandan(gentePorAsiento(tablero, estado.plantados, cosas, id));
    if (quienes.length === 0) continue;
    const puntos = cosa.clase === 'prado' ? valeElPrado(tablero, cosas, cosa) : cosa.puntosAlFinal;
    if (puntos <= 0) continue;
    cobros.push({
      clase: cosa.clase,
      puntos,
      losas: cosa.casillas.length,
      quienes,
      alFinal: true,
    });
    labriegos = conPuntos(labriegos, quienes, puntos);
  }

  /*
   * LOS ESCUDOS SIN GASTAR, cada uno `PUNTOS_POR_ESCUDO`, ANTES de decidir quién gana: guardarlos es
   * la otra mitad de la elección de la leva, y un escudo guardado que no contara para ganar no sería
   * elección. Se quedan escritos en `escudos` —no se vacían— para que el marcador final pueda decir
   * de dónde salieron esos puntos (`panelesDeLasLindes`). Sin `escudos`, no se toca nada.
   */
  const escudos = estado.escudos;
  if (escudos !== undefined) {
    labriegos = labriegos.map((l) => {
      const suyos = contadorDe(escudos, l.asiento);
      return suyos > 0 ? { ...l, puntos: l.puntos + suyos * PUNTOS_POR_ESCUDO } : l;
    });
  }

  let mayor = 0;
  for (const l of labriegos) if (l.puntos > mayor) mayor = l.puntos;
  const ganadores = labriegos.filter((l) => l.puntos === mayor).map((l) => l.asiento);

  return {
    ...estado,
    momento: 'terminada',
    labriegos,
    /* Los labriegos vuelven a la mano: la partida acabó y ya no ocupan nada. */
    plantados: [],
    enMano: '',
    cobros,
    ganadores: labriegos.length === 0 ? [] : ganadores,
  };
}

/** ¿Se acabó? Lo contesta el juego, no el motor. */
export function seAcabo(estado: unknown): boolean {
  const e = estado as EstadoDeLasLindes | undefined;
  return e !== undefined && e !== null && e.momento === 'terminada';
}

/** De quién es el turno, o `null` si de nadie. */
export function deQuienEsElTurno(estado: EstadoDeLasLindes): AsientoId | null {
  if (estado.momento === 'reuniendo' || estado.momento === 'terminada') return null;
  const quien = estado.labriegos[estado.turno];
  return quien === undefined ? null : quien.asiento;
}

// ---------------------------------------------------------------------------
// El botín de la refriega
// ---------------------------------------------------------------------------

/**
 * EL BOTÍN: `de` cayó en Boots on Board y `para` lo tumbó. Pasan hasta `PUNTOS_DEL_BOTIN`
 * puntos de uno a otro y, si `de` lleva escudos, `ESCUDOS_DEL_BOTIN` escudo; nada más. Quien no
 * lleva escudos da exactamente el botín de antes de que existieran. Con cero puntos Y cero
 * escudos no hay nada que llevarse (ver abajo); con cero puntos y algún escudo, se lleva el escudo.
 *
 * ═══ QUIÉN PUEDE MANDARLO, Y POR QUÉ SE RECHAZA CON MOTIVO ═══
 *
 * Nadie de fuera: `leerElBotin` exige `quien: null`, dos sentados distintos y una carga que sea
 * exactamente `{ de, para }`. Lo que el lector no puede saber lo mira esto, que es quien lo sabe:
 * que la partida esté en juego —colocando o plantando— y que los dos JUEGUEN ESTA PARTIDA, que no
 * es lo mismo que estar sentado: quien se sentó después de volcar la bolsa mira y no tiene
 * columna de puntos. Todo eso es un botín que no debió llegar, y se rechaza con su motivo para que
 * el servidor, que es el único que lo manda, sepa por qué no entró.
 *
 * ═══ SIN NADA QUE LLEVARSE, EL MISMO OBJETO ═══
 *
 * Quien cae con cero puntos no pierde nada, y entonces la refriega no pasó para el juego: sale
 * EL MISMO estado, que la mesa cuenta como movimiento que no cambió nada, y la crónica no apunta
 * un robo de cero. No es un rechazo: el botín era bueno y sencillamente no había qué llevarse.
 *
 * ═══ EN QUÉ MOMENTOS SE APLICA: EN TODOS LOS DE JUEGO, Y ESTÁ MIRADO ═══
 *
 * Aquí los puntos no gobiernan nada mientras se juega. Poner exige una losa en la mano y un sitio
 * donde case; plantar, un labriego libre y una cosa sin gente; el remate cobra lo que se cierra.
 * Ninguna de las tres cosas lee los puntos: sólo los SUMA. El único que los lee es
 * `rematarLaPartida`, al vaciarse la bolsa, para decir quién gana — y a esas alturas el botín ya
 * se rechaza, porque la partida está terminada. Así que no hay ningún momento delicado que
 * proteger: ni la losa de la mano, ni `plantando`, ni el remate a medias cambian por esto. Y los
 * puntos no bajan de cero porque se lleva `min(los suyos, PUNTOS_DEL_BOTIN)`.
 *
 * ═══ LO QUE NO TOCA, Y HAY QUE PODER AFIRMARLO ═══
 *
 * Ni el turno, ni el momento, ni la losa de la mano, ni los labriegos plantados, ni lo cobrado en
 * el último remate. Sobre todo el turno: la mesa reprograma su plazo cuando cambia `turnoDe`, y
 * un botín que lo moviera le regalaría —o le quitaría— tiempo a quien juega sin que jugara nadie.
 *
 * ═══ Y SE CUENTA COMO SE CUENTA UN COBRO ═══
 *
 * Con una frase en su panel, igual que «Se ha cobrado», y con los nombres dentro: la refriega va a
 * `refriegas` y la proyección la escribe. Ver `fraseDeLaRefriega`.
 */
function elBotin(
  estado: EstadoDeLasLindes,
  carga: unknown,
  ctx: ContextoMovimiento,
): EstadoDeLasLindes | Rechazo<EstadoDeLasLindes> {
  const botin = leerElBotin(carga, ctx.quien, ctx.asientos);
  if (botin === null) {
    return rechazar(estado, 'Ese botín no vale: lo mete la mesa, entre dos sentados que no sean el mismo.');
  }
  if (estado.momento === 'reuniendo') return rechazar(estado, 'La partida no ha empezado: todavía no hay botín.');
  if (estado.momento === 'terminada') return rechazar(estado, 'La partida ya ha terminado: ya no hay botín.');

  let de = -1;
  let para = -1;
  for (let i = 0; i < estado.labriegos.length; i++) {
    const asiento = (estado.labriegos[i] as Labriego).asiento;
    if (asiento === botin.de) de = i;
    if (asiento === botin.para) para = i;
  }
  if (de < 0 || para < 0) return rechazar(estado, 'Ese botín es de alguien que no juega esta partida.');

  const suyos = (estado.labriegos[de] as Labriego).puntos;
  const puntos = suyos < PUNTOS_DEL_BOTIN ? suyos : PUNTOS_DEL_BOTIN;
  /*
   * Y EL ESCUDO, si quien cae lleva alguno (sólo pasa en `botas`, que es donde hay escudos). Sin
   * escudos, `escudos` es 0 y todo lo de aquí abajo es exactamente el botín de antes: ni el campo
   * `escudos` del estado ni el de la refriega se escriben.
   */
  const suyosEscudos = estado.escudos === undefined ? 0 : contadorDe(estado.escudos, botin.de);
  const escudos = suyosEscudos < ESCUDOS_DEL_BOTIN ? suyosEscudos : ESCUDOS_DEL_BOTIN;
  if (puntos <= 0 && escudos <= 0) return estado;

  const labriegos =
    puntos <= 0
      ? estado.labriegos
      : estado.labriegos.map((l, i) => {
          if (i === de) return { ...l, puntos: l.puntos - puntos };
          if (i === para) return { ...l, puntos: l.puntos + puntos };
          return l;
        });
  const refriega: RefriegaDeLasLindes =
    escudos > 0 ? { de: botin.de, para: botin.para, puntos, escudos } : { de: botin.de, para: botin.para, puntos };
  const refriegas = [...(estado.refriegas ?? []), refriega];
  const conBotin: EstadoDeLasLindes = { ...estado, labriegos, refriegas: refriegas.slice(-REFRIEGAS_QUE_SE_RECUERDAN) };
  if (escudos <= 0 || estado.escudos === undefined) return conBotin;
  const mapa = { ...estado.escudos };
  mapa[botin.de] = suyosEscudos - escudos;
  mapa[botin.para] = contadorDe(estado.escudos, botin.para) + escudos;
  return { ...conBotin, escudos: mapa };
}

/** Un contador de un mapa opcional del estado (`escudos` o `levas`). Cero si no hay. */
function contadorDe(mapa: Readonly<Record<AsientoId, number>>, asiento: AsientoId): number {
  if (!Object.prototype.hasOwnProperty.call(mapa, asiento)) return 0;
  const n = mapa[asiento];
  return typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : 0;
}

// ---------------------------------------------------------------------------
// A pie: el escudo que se recoge y la leva que se paga con ellos
// ---------------------------------------------------------------------------

/**
 * EL HALLAZGO: `para` recogió un escudo a pie en Boots on Board. +1 en su cuenta de `escudos`, y
 * nada más. Ver `docs/AVATARES-JUGABLES.md` §5.
 *
 * Como el botín: lo mete el servidor con `quien: null`, lo lee `leerElHallazgo` contra la tabla del
 * juego (`HALLAZGOS_DE_LAS_LINDES`), y lo que sólo sabe el juego lo mira esto —la partida en juego,
 * `para` jugando ESTA partida— y lo rechaza con su motivo. No toca el turno, ni el momento, ni la
 * losa de la mano, ni los puntos: un escudo no vale nada hasta que se gasta o se cuenta al final.
 *
 * El mapa `escudos` aparece aquí, con el primer escudo de la partida, y no antes (ver
 * `EstadoDeLasLindes.escudos`).
 */
function elHallazgo(
  estado: EstadoDeLasLindes,
  carga: unknown,
  ctx: ContextoMovimiento,
): EstadoDeLasLindes | Rechazo<EstadoDeLasLindes> {
  const hallazgo = leerElHallazgo(carga, ctx.quien, ctx.asientos, clasesDe(HALLAZGOS_DE_LAS_LINDES));
  if (hallazgo === null) {
    return rechazar(estado, 'Ese hallazgo no vale: lo mete la mesa, para un sentado y de una clase que exista en el valle.');
  }
  if (estado.momento === 'reuniendo') return rechazar(estado, 'La partida no ha empezado: todavía no hay escudos.');
  if (estado.momento === 'terminada') return rechazar(estado, 'La partida ya ha terminado: ya no hay escudos.');
  if (!estado.labriegos.some((l) => l.asiento === hallazgo.para)) {
    return rechazar(estado, 'Ese escudo es de alguien que no juega esta partida.');
  }
  const antes = estado.escudos ?? {};
  const escudos = { ...antes };
  escudos[hallazgo.para] = contadorDe(antes, hallazgo.para) + 1;
  return { ...estado, escudos };
}

/**
 * LA LEVA: quien la manda paga `ESCUDOS_POR_LEVA` escudos y alista un labriego más (+1 `sinPlantar`),
 * como mucho `LEVAS_POR_JUGADOR` veces por partida.
 *
 * ═══ EN CUALQUIER MOMENTO DE LA PARTIDA EN JUEGO, Y NO SÓLO EN SU TURNO ═══
 *
 * Como aceptar un trueque en Riberas: la leva no decide nada del turno de otro —no pone, no planta,
 * no cobra—, sólo cambia cuántos labriegos tiene quien la paga para cuando le toque. Así que se
 * ofrece colocando y plantando, al que tiene el turno y a los demás, y sólo a quien PUEDE pagarla
 * (`puedePagarLaLeva`, que mira los escudos y las levas de la vista pública). El portillo ya lo ha
 * mirado con la vista; esto lo vuelve a mirar con el estado entero, que es la otra mitad.
 *
 * ═══ LO QUE NO TOCA ═══
 *
 * Ni el turno, ni el momento, ni la losa de la mano, ni los sitios ya calculados de quien está
 * plantando: si quien tiene el turno se había quedado sin labriegos en `plantando`, el turno ya se
 * remató solo al poner (ver `ponerLaLosa`), así que un labriego nuevo no abre ningún sitio a medias.
 */
function alistarUnLabriego(
  estado: EstadoDeLasLindes,
  ctx: ContextoMovimiento,
): EstadoDeLasLindes | Rechazo<EstadoDeLasLindes> {
  if (estado.momento !== 'colocando' && estado.momento !== 'plantando') {
    return rechazar(estado, 'La leva sólo se paga mientras se juega la partida.');
  }
  const quien = ctx.quien;
  if (quien === null || !estado.labriegos.some((l) => l.asiento === quien)) {
    return rechazar(estado, 'Sólo paga una leva quien juega esta partida.');
  }
  const tiene = estado.escudos === undefined ? 0 : contadorDe(estado.escudos, quien);
  const pagadas = estado.levas === undefined ? 0 : contadorDe(estado.levas, quien);
  if (!puedePagarLaLeva(tiene, pagadas)) {
    return rechazar(
      estado,
      pagadas >= LEVAS_POR_JUGADOR
        ? `Ya has pagado las ${LEVAS_POR_JUGADOR} levas que caben en una partida.`
        : `Una leva cuesta ${ESCUDOS_POR_LEVA} escudos, y tienes ${tiene}.`,
    );
  }
  const escudos = { ...(estado.escudos ?? {}) };
  escudos[quien] = tiene - ESCUDOS_POR_LEVA;
  const levas = { ...(estado.levas ?? {}) };
  levas[quien] = pagadas + 1;
  const labriegos = estado.labriegos.map((l) => (l.asiento === quien ? { ...l, sinPlantar: l.sinPlantar + 1 } : l));
  return { ...estado, labriegos, escudos, levas };
}

// ---------------------------------------------------------------------------
// LA PROYECCIÓN: qué ve cada cual
// ---------------------------------------------------------------------------

/** Un jugador, como se le ve desde fuera. */
export interface LabriegoVisto {
  readonly asiento: AsientoId;
  /** Lo que tecleó al sentarse, o su identificador si no consta. */
  readonly nombre: string;
  readonly color: string;
  readonly puntos: number;
  readonly sinPlantar: number;
}

/** Una losa puesta, como se le ve. */
export interface LosaVista {
  readonly casilla: string;
  readonly x: number;
  readonly y: number;
  readonly losa: string;
  readonly giro: Giro;
  readonly ficha: string;
  readonly orden: number;
}

/** Un labriego plantado, como se le ve. */
export interface PlantadoVisto {
  readonly casilla: string;
  readonly clase: ClaseDeCosa;
  readonly indice: number;
  readonly asiento: AsientoId;
  readonly color: string;
}

/** Algo que se cobró, ya escrito para leerse. */
export interface CobroVisto {
  readonly clase: ClaseDeCosa;
  readonly puntos: number;
  readonly losas: number;
  readonly quienes: readonly string[];
  readonly alFinal: boolean;
  readonly frase: string;
}

/** Una refriega que dio botín, ya escrita para leerse. Como `CobroVisto`, con su frase. */
export interface RefriegaVista {
  readonly de: AsientoId;
  readonly para: AsientoId;
  readonly puntos: number;
  /** Los escudos que pasaron, sólo si pasó alguno (ver `RefriegaDeLasLindes.escudos`). */
  readonly escudos?: number;
  readonly frase: string;
}

/**
 * LA VISTA SIN EL TABLERO DIBUJADO.
 *
 * Existe aparte porque el tablero declarado es un DIBUJO de la vista y de las
 * propias opciones, así que se calcula después y no puede alimentarlas. El
 * portillo del reductor usa esta mitad: pintar un tablero entero en cada
 * movimiento para tirarlo sería el gasto más caro del juego.
 */
export interface VistaSinTablero {
  readonly momento: MomentoDeLasLindes;
  /**
   * DE QUIÉN ES EL TURNO. El campo se llama así porque `turno-declarado.ts` lo
   * busca con ese nombre, y de ahí sale la barra de arriba de los dos clientes
   * sin que ninguno sepa a qué se juega.
   */
  readonly turnoDe: AsientoId | null;
  readonly yo: AsientoId | null;
  readonly labriegos: readonly LabriegoVisto[];
  readonly losas: readonly LosaVista[];
  readonly plantados: readonly PlantadoVisto[];
  /** La losa robada, con su número de serie. Pública: en la mesa se pone boca arriba. */
  readonly enMano: string;
  /** Su clase, que es lo que hay que pintar. */
  readonly claseEnMano: string;
  /** Cuántas quedan en la bolsa. El CONTENIDO es secreto; la cuenta no. */
  readonly quedan: number;
  readonly retiradas: number;
  /** La llave de la última losa puesta. */
  readonly ultima: string;
  readonly cobros: readonly CobroVisto[];
  /**
   * LAS ÚLTIMAS REFRIEGAS, y SÓLO SI HUBO ALGUNA: el campo no viaja en una partida en la que
   * nadie ha caído, por lo mismo que no existe en su estado (ver `EstadoDeLasLindes.refriegas`).
   */
  readonly refriegas?: readonly RefriegaVista[];
  /**
   * LOS ESCUDOS SIN GASTAR Y LAS LEVAS PAGADAS de cada asiento, públicos, y SÓLO si existen en el
   * estado (con su primer uso). Con estos nombres y esta forma los leen `escudosDeLaVista` y
   * `levasDeLaVista` en los dos clientes, y `opcionesDeLasLindes` para ofrecer la leva.
   */
  readonly escudos?: Readonly<Record<AsientoId, number>>;
  readonly levas?: Readonly<Record<AsientoId, number>>;
  readonly ganadores: readonly string[];
  /** Dónde cabe la losa de la mano. Público: se ve mirando el tablero. */
  readonly colocaciones: readonly Colocacion[];
  /** Dónde puede plantar quien tiene el turno. También público. */
  readonly sitios: readonly DondePlantar[];
  /** La frase grande de la mesa. */
  readonly aviso: string;
}

/** La vista entera, con el tablero dibujado. */
export interface VistaDeLasLindes extends VistaSinTablero {
  readonly tablero: TableroDeclarado;
}

/** El color que le toca a un asiento por su sitio en la mesa. */
export function colorDeLabriego(i: number): string {
  const n = COLORES_DE_LAS_LINDES.length;
  return COLORES_DE_LAS_LINDES[((i % n) + n) % n] as string;
}

/**
 * LO QUE SE VE, SIN EL DIBUJO.
 *
 * ═══ AQUÍ NO SE TAPA CASI NADA, Y ESO ES CORRECTO ═══
 *
 * Este juego enseña el tablero entero: las losas puestas, los labriegos, los
 * puntos y de quién es el turno se ven mirando la mesa. Lo único que se queda
 * fuera es **la bolsa y la semilla**, y de la bolsa sale la cuenta de lo que
 * queda, que sí es pública porque en la mesa se ve el montón.
 *
 * Que haya poco que tapar no significa que la proyección sobre. Al revés: es el
 * caso que el §5.8 del motor obliga a escribir con todas las letras, porque una
 * mesa de servidor con más de un asiento tiene que proyectar SIEMPRE. Si esto no
 * existiera, `vistaDeAsiento` devolvería el estado entero —la bolsa barajada
 * incluida— y el comprobador de fugas lo daría por bueno.
 */
export function loQueSeVe(
  estado: EstadoDeLasLindes,
  quien: QuienMira,
  sentados: LosSentados,
): VistaSinTablero {
  const labriegos: LabriegoVisto[] = estado.labriegos.map((l, i) => ({
    asiento: l.asiento,
    nombre: comoSeLlama(sentados, l.asiento),
    color: colorDeLabriego(i),
    puntos: l.puntos,
    sinPlantar: l.sinPlantar,
  }));
  const color = (asiento: AsientoId): string => {
    const i = estado.labriegos.findIndex((l) => l.asiento === asiento);
    return i < 0 ? '#9aa0a6' : colorDeLabriego(i);
  };

  const losas: LosaVista[] = [];
  for (const casilla of Object.keys(estado.tablero).sort(porTexto)) {
    const puesta = estado.tablero[casilla] as PuestaDeLosa;
    const donde = deCasilla(casilla);
    losas.push({
      casilla,
      x: donde.x,
      y: donde.y,
      losa: puesta.losa,
      giro: puesta.giro,
      ficha: puesta.ficha,
      orden: puesta.orden,
    });
  }

  const plantados: PlantadoVisto[] = estado.plantados.map((p) => ({
    casilla: p.casilla,
    clase: p.clase,
    indice: p.indice,
    asiento: p.asiento,
    color: color(p.asiento),
  }));

  const turnoDe = deQuienEsElTurno(estado);
  const claseEnMano = losaDeLaFicha(estado.enMano);
  const colocaciones =
    estado.momento === 'colocando' && claseEnMano !== ''
      ? dondeCabe(estado.tablero as Tablero, claseEnMano)
      : [];
  const sitios = dondeSePuedePlantar(estado, turnoDe);

  const cobros: CobroVisto[] = estado.cobros.map((c) => ({
    clase: c.clase,
    puntos: c.puntos,
    losas: c.losas,
    quienes: c.quienes.map((a) => comoSeLlama(sentados, a)),
    alFinal: c.alFinal,
    frase: fraseDelCobro(c, sentados),
  }));

  return {
    momento: estado.momento,
    turnoDe,
    yo: quien,
    labriegos,
    losas,
    plantados,
    enMano: estado.enMano,
    claseEnMano,
    quedan: estado.bolsa.length,
    retiradas: estado.retiradas,
    ultima: estado.ultima,
    cobros,
    /* Sólo si hubo alguna: una partida sin refriega manda la misma vista que antes del botín. */
    ...(estado.refriegas === undefined
      ? {}
      : {
          refriegas: estado.refriegas.map((r) => ({
            de: r.de,
            para: r.para,
            puntos: r.puntos,
            ...(r.escudos === undefined ? {} : { escudos: r.escudos }),
            frase: fraseDeLaRefriega(r, sentados),
          })),
        }),
    /* Lo mismo con los escudos y las levas: sólo si alguien bajó al valle. */
    ...(estado.escudos === undefined ? {} : { escudos: copiaOrdenada(estado.escudos) }),
    ...(estado.levas === undefined ? {} : { levas: copiaOrdenada(estado.levas) }),
    ganadores: estado.ganadores.map((a) => comoSeLlama(sentados, a)),
    colocaciones,
    sitios,
    aviso: elAviso(estado, sentados),
  };
}

/**
 * Una copia de un contador por asiento, con las llaves en orden: la vista no depende de quién
 * recogió su primer escudo antes, y los dos motores la escriben igual.
 */
function copiaOrdenada(mapa: Readonly<Record<AsientoId, number>>): Record<AsientoId, number> {
  const salida: Record<AsientoId, number> = {};
  for (const asiento of Object.keys(mapa).sort(porTexto)) salida[asiento] = contadorDe(mapa, asiento);
  return salida;
}

/** La casilla que hay detrás de una llave. Aquí ya se sabe que la llave es buena. */
function deCasilla(llave: string): { readonly x: number; readonly y: number } {
  const partes = llave.split(',');
  return { x: Number(partes[0]), y: Number(partes[1]) };
}

/**
 * UNA LISTA DE NOMBRES COMO SE DICE EN CASTELLANO: «Ana», «Ana y Bruno», «Ana, Bruno y Carla».
 *
 * Estaba escrita aquí dentro, para los cobros, y NO estaba en el aviso del final, que unía con
 * `join(' y ')` y sacaba «Empatan Ana y Bruno y Carla» — en la frase que cierra la partida, que
 * es la que más se lee y la única que algunos leen.
 */
function enLista(nombres: readonly string[]): string {
  if (nombres.length === 0) return '';
  if (nombres.length === 1) return nombres[0] as string;
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1] as string}`;
}

/** Lo que se lee cuando algo se cobra. */
function fraseDelCobro(c: Cobro, sentados: LosSentados): string {
  const gente = enLista(c.quienes.map((a) => comoSeLlama(sentados, a)));
  const cosa = NOMBRE_DE_LA_COSA[c.clase];
  const medida = c.clase === 'ermita' ? '' : ` de ${c.losas} ${c.losas === 1 ? 'losa' : 'losas'}`;
  /*
   * ═══ EL ARTÍCULO LO DECIDE LA COSA, Y UNA DE LAS CUATRO ES MASCULINA ═══
   *
   * Aquí ponía «una» a pelo. Villa, senda y ermita son femeninas y colaba; EL PRADO no, y el
   * prado es justo la cosa que sólo se cobra AL FINAL, así que «7 por una prado de 4 losas»
   * salía en el recuento de cierre de casi todas las partidas.
   *
   * ═══ Y LA COLA SE COSE CON SU COMA ═══
   *
   * `${medida} ${cierre}` con una ermita —que no lleva medida— daba «5 por una ermita se
   * cuenta al acabar.»: dos oraciones pegadas sin nada en medio.
   */
  const articulo = c.clase === 'prado' ? 'un' : 'una';
  const cierre = c.alFinal ? ', que se cuenta al acabar' : ' cerrada';
  return `${gente}: ${c.puntos} por ${articulo} ${cosa}${medida}${cierre}.`;
}

/**
 * Lo que se lee cuando alguien se lleva botín: «Ana le quita 3 puntos a Bruno en la refriega.»
 *
 * Contado desde quien se lo lleva, que es quien hizo algo; y con el número siempre, porque con
 * menos de `PUNTOS_DEL_BOTIN` en la columna se lleva lo que hubiera y «le quita puntos» a secas
 * no diría cuántos.
 */
function fraseDeLaRefriega(r: RefriegaDeLasLindes, sentados: LosSentados): string {
  const escudos = r.escudos === undefined ? 0 : r.escudos;
  const cuantos = r.puntos === 1 ? '1 punto' : `${r.puntos} puntos`;
  const deEscudos = escudos === 1 ? '1 escudo' : `${escudos} escudos`;
  /* Sin escudos, la frase de siempre, letra a letra: es la que congela el oro. */
  const que = escudos <= 0 ? cuantos : r.puntos <= 0 ? deEscudos : `${cuantos} y ${deEscudos}`;
  return `${comoSeLlama(sentados, r.para)} le quita ${que} a ${comoSeLlama(sentados, r.de)} en la refriega.`;
}

/**
 * LA FRASE GRANDE DE LA MESA.
 *
 * Se escribe aquí, con los nombres ya dentro, y no con un hueco que sustituya el
 * mueble: el §5 de `tipos.ts` cuenta por qué se borró aquel rodeo. Cualquier
 * superficie que lea la vista —un aviso, un registro, una pantalla que aún no
 * existe— ve el nombre.
 */
function elAviso(estado: EstadoDeLasLindes, sentados: LosSentados): string {
  if (estado.momento === 'reuniendo') {
    return 'El valle está vacío. Cuando estéis todos, se vuelca la bolsa.';
  }
  if (estado.momento === 'terminada') {
    if (estado.ganadores.length === 0) return 'Se acabó la bolsa.';
    const nombres = estado.ganadores.map((a) => comoSeLlama(sentados, a));
    if (nombres.length === 1) return `Se acabó la bolsa. Gana ${nombres[0] as string}.`;
    return `Se acabó la bolsa. Empatan ${enLista(nombres)}.`;
  }
  const quien = deQuienEsElTurno(estado);
  const nombre = quien === null ? '' : comoSeLlama(sentados, quien);
  if (estado.momento === 'colocando') {
    const losa = losaPorId(losaDeLaFicha(estado.enMano));
    const como = losa === null ? 'una losa' : losa.nombre.toLowerCase();
    return `${nombre} tiene ${como} en la mano.`;
  }
  return `${nombre} decide dónde planta.`;
}

/**
 * LA PROYECCIÓN QUE SE REGISTRA: la vista y su dibujo.
 *
 * El tablero se calcula con las opciones de quien mira, porque una cara sólo
 * lleva `toque` si esa persona puede tocarla. Es lo que hace que el mueble
 * genérico pinte lo mismo para todos y sólo deje pulsar a quien puede.
 */
export function proyectarLasLindes(
  estado: EstadoDeLasLindes | undefined,
  quien: QuienMira,
  sentados: LosSentados,
): VistaDeLasLindes {
  const e = estado ?? partidaNueva();
  const vista = loQueSeVe(e, quien, sentados);
  return { ...vista, tablero: tableroDeLasLindes(vista, opcionesDeLasLindes(vista, quien)) };
}

/**
 * LO QUE JAMÁS PUEDE SALIR EN LA VISTA DE OTRO: la bolsa y la semilla.
 *
 * ═══ POR QUÉ LA BOLSA VIAJA CON NÚMERO DE SERIE ═══
 *
 * Porque la clase de una losa (`senda-recta`) sale en el tablero de todo el
 * mundo en cuanto alguien la pone. Declarar la clase como secreta daría un rojo
 * de `verify:mesa` que no es una fuga, y un comprobador que grita cuando no pasa
 * nada se acaba desactivando — que es peor que no tenerlo.
 *
 * Con el número de serie delante, `'17:senda-recta'` no aparece en ninguna vista
 * mientras está en la bolsa, y en cuanto aparece ya no está en ella. El secreto
 * que este fichero protege no es QUÉ losas quedan —eso se puede contar, y es
 * información legítima del juego— sino EN QUÉ ORDEN van a salir.
 */
export function loSecretoDeLasLindes(estado: EstadoDeLasLindes | undefined): unknown[] {
  const e = estado ?? partidaNueva();
  const secretos: unknown[] = [e.azar];
  for (const ficha of e.bolsa) secretos.push(ficha);
  return secretos;
}

// ---------------------------------------------------------------------------
// `opciones()`: qué te puedo ofrecer a ti, con lo que tú sabes
// ---------------------------------------------------------------------------

/** La vista, si lo que llega tiene forma de vista. */
function comoVista(vista: unknown): VistaSinTablero | null {
  if (typeof vista !== 'object' || vista === null) return null;
  const v = vista as Partial<VistaSinTablero>;
  if (typeof v.momento !== 'string') return null;
  if (!Array.isArray(v.labriegos) || !Array.isArray(v.losas)) return null;
  if (!Array.isArray(v.colocaciones) || !Array.isArray(v.sitios)) return null;
  return v as VistaSinTablero;
}

/**
 * QUÉ PUEDE HACER `quien` AHORA MISMO.
 *
 * Recibe LA VISTA y jamás el estado (§5 bis): así no puede ofrecer nada que la
 * proyección no hubiera dejado pasar. Es imposible por construcción y no por
 * disciplina.
 *
 * ═══ EMPEZAR SE LE OFRECE A CUALQUIERA QUE TENGA ASIENTO ═══
 *
 * Y no sólo a quien cumpla el aforo, porque el aforo no está en la vista: los
 * asientos viven en el CONTEXTO del movimiento, que la proyección no recibe.
 * Riberas escribió una copia de los sentados dentro del estado para poder
 * mirarla aquí, y le salió una mesa que no arrancaba nunca: el estado nace vacío,
 * así que la copia nacía vacía, así que no se ofrecía empezar. La regla del §5
 * bis es «SÓLO SI» y no «si y sólo si»: se ofrece de más y el reductor lo vuelve
 * a validar con `ctx.asientos`, que es donde vive la verdad.
 */
export function opcionesDeLasLindes(vista: unknown, quien: QuienMira): readonly Opcion[] {
  const v = comoVista(vista);
  if (v === null || quien === null) return [];

  if (v.momento === 'reuniendo') {
    return [
      {
        id: 'empezar',
        tipo: EMPEZAR,
        carga: null,
        rotulo: 'Volcar la bolsa',
        ayuda: `Baraja las losas y pone la primera en el centro. Caben de ${CABEN.minimo} a ${CABEN.maximo}.`,
      },
    ];
  }

  if (v.momento === 'terminada') return [];

  /*
   * LA LEVA, a quien pueda pagarla, tenga o no el turno (ver `alistarUnLabriego`). Va al final de la
   * lista, detrás de lo del turno, para que quien elige «lo primero» siga eligiendo lo de siempre.
   * Sin escudos en la vista no sale nunca: una mesa normal ofrece lo mismo que antes.
   */
  const leva = opcionDeLaLeva(v, quien);
  if (quien !== v.turnoDe) return leva;

  if (v.momento === 'colocando') {
    const losa = losaPorId(v.claseEnMano);
    const como = losa === null ? 'la losa' : losa.nombre.toLowerCase();
    const poner: Opcion[] = v.colocaciones.map((c) => ({
      id: `poner:${c.x},${c.y}:${c.giro}`,
      tipo: PONER,
      carga: { x: c.x, y: c.y, giro: c.giro },
      rotulo: `Poner en ${c.x}, ${c.y} ${FLECHA_DEL_GIRO[c.giro]}`,
      ayuda: `Deja ${como} ahí, con el norte mirando ${HACIA_DONDE[c.giro]}.`,
    }));
    return leva.length === 0 ? poner : [...poner, ...leva];
  }

  const opciones: Opcion[] = v.sitios.map((s) => ({
    id: `plantar:${s.clase}:${s.indice}`,
    tipo: PLANTAR,
    carga: { clase: s.clase, indice: s.indice },
    rotulo: `Labriego en ${elArticulo(s.clase)} ${NOMBRE_DE_LA_COSA[s.clase]}`,
    ayuda: ayudaDePlantar(s),
  }));
  opciones.push({
    id: 'pasar',
    tipo: PASAR,
    carga: null,
    rotulo: 'No plantar',
    ayuda: 'Guarda los labriegos y pasa el turno.',
  });
  for (const o of leva) opciones.push(o);
  return opciones;
}

/** El id de la opción de la leva. Uno solo: la leva no lleva nada dentro. */
export const ID_DE_LA_LEVA = 'leva';

/**
 * LA LEVA, si `quien` juega esta partida, la partida se juega y puede pagarla con lo que dice la
 * vista pública. Una lista de una o de ninguna, para poder pegarla detrás de las demás.
 */
function opcionDeLaLeva(v: VistaSinTablero, quien: AsientoId): Opcion[] {
  if (v.momento !== 'colocando' && v.momento !== 'plantando') return [];
  if (!v.labriegos.some((l) => l.asiento === quien)) return [];
  const tiene = escudosDeLaVista(v, quien);
  const pagadas = levasDeLaVista(v, quien);
  if (!puedePagarLaLeva(tiene, pagadas)) return [];
  const quedan = LEVAS_POR_JUGADOR - pagadas - 1;
  return [
    {
      id: ID_DE_LA_LEVA,
      tipo: LEVA,
      carga: {},
      rotulo: `Alistar un labriego (${ESCUDOS_POR_LEVA} escudos)`,
      ayuda:
        `Gasta ${ESCUDOS_POR_LEVA} de tus ${tiene} escudos en un labriego más. ` +
        `Cada escudo que guardes vale ${PUNTOS_POR_ESCUDO} al final. ` +
        (quedan === 0 ? 'Es tu última leva.' : quedan === 1 ? 'Te quedará otra más.' : `Te quedarán ${quedan} más.`),
    },
  ];
}

/** El artículo que le toca a cada cosa, para que la frase se lea. */
function elArticulo(clase: ClaseDeCosa): string {
  return clase === 'prado' ? 'el' : 'la';
}

/** Lo que se gana o se arriesga plantando ahí, dicho corto. */
function ayudaDePlantar(s: DondePlantar): string {
  if (s.clase === 'prado') {
    return s.valdria > 0
      ? `Se queda ahí hasta el final. Hoy valdría ${s.valdria}.`
      : 'Se queda ahí hasta el final, y hoy no toca ninguna villa cerrada.';
  }
  if (s.cerrada) return `Se cierra al plantarlo: ${s.valdria} y vuelve a tu mano.`;
  return `Vale ${s.valdria} si se cierra, y hasta entonces no vuelve.`;
}

/** Hacia dónde mira el norte de la losa con cada giro. */
const FLECHA_DEL_GIRO: Readonly<Record<Giro, string>> = { 0: '↑', 1: '→', 2: '↓', 3: '←' };
const HACIA_DONDE: Readonly<Record<Giro, string>> = {
  0: 'al norte',
  1: 'al este',
  2: 'al sur',
  3: 'al oeste',
};

// ---------------------------------------------------------------------------
// EL TABLERO DECLARADO
// ---------------------------------------------------------------------------

/** Lo que mide una losa en las unidades del dibujo. */
const LADO_EN_EL_DIBUJO = 100;
/** El margen alrededor de lo puesto, para que no quede pegado al borde. */
const MARGEN = 40;

const VERDE_DEL_PRADO = '#6f9a4e';
const VERDE_OSCURO = '#3f5c2c';
const PIEDRA_DE_LA_VILLA = '#c9bda4';
const TIERRA_DE_LA_SENDA = '#a8834f';
const BORDE_DE_LA_LOSA = '#2c3324';
const HUECO_LIBRE = '#243018';
const BLASON = '#e0c23a';
const ERMITA = '#e6e0cc';

/**
 * EL TABLERO, DIBUJADO.
 *
 * ═══ POR QUÉ LOS SITIOS LIBRES SE PARTEN EN CUARTOS ═══
 *
 * Una losa cabe en una casilla con hasta cuatro giros distintos, y el mueble
 * genérico sólo sabe mandar UN movimiento por cara tocada. Con una cara por
 * casilla habría que elegir un giro por la gente, o inventar un botón de «girar»
 * que necesitaría un estado que el tablero declarado no tiene y no debe tener.
 *
 * Así que una casilla con varios giros legales se parte en cuartos, uno por giro,
 * con la flecha del norte dentro. Se ve lo que se va a hacer antes de tocarlo, no
 * hace falta ningún estado intermedio, y una casilla con un solo giro legal sale
 * entera — que es el caso más común según avanza la partida.
 */
export function tableroDeLasLindes(
  vista: VistaSinTablero,
  opciones: readonly Opcion[],
): TableroDeclarado {
  const caras: TableroDeclarado['caras'] = [];
  const lineas: TableroDeclarado['lineas'] = [];
  const nudos: TableroDeclarado['nudos'] = [];

  let minX = 0;
  let maxX = 0;
  let minY = 0;
  let maxY = 0;
  const abarcar = (x: number, y: number): void => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };

  /* 1 · Las losas puestas. */
  for (const l of vista.losas) {
    abarcar(l.x, l.y);
    const losa = losaPorId(l.losa);
    if (losa === null) continue;
    const o = esquina(l.x, l.y);

    caras.push({
      id: `losa:${l.casilla}`,
      puntos: [
        { x: o.x, y: o.y },
        { x: o.x + LADO_EN_EL_DIBUJO, y: o.y },
        { x: o.x + LADO_EN_EL_DIBUJO, y: o.y + LADO_EN_EL_DIBUJO },
        { x: o.x, y: o.y + LADO_EN_EL_DIBUJO },
      ],
      relleno: VERDE_DEL_PRADO,
      borde: BORDE_DE_LA_LOSA,
      rotulo: '',
      cifra: '',
      destacada: l.casilla === vista.ultima,
      toque: null,
    });

    /* Las murallas, como una franja gruesa sobre su lado. */
    for (let i = 0; i < losa.villas.length; i++) {
      const villa = losa.villas[i] as { lados: readonly Lado[]; blason: boolean };
      for (const propio of villa.lados) {
        const lado = ladoGirado(propio, l.giro);
        const extremos = laRaya(l.x, l.y, lado);
        lineas.push({
          id: `villa:${l.casilla}:${lado}`,
          desde: extremos.desde,
          hasta: extremos.hasta,
          color: PIEDRA_DE_LA_VILLA,
          grosor: 14,
          tenue: false,
          toque: null,
        });
        /* Y un tirante hasta el centro, que es lo que enseña que van unidas. */
        lineas.push({
          id: `villa-dentro:${l.casilla}:${lado}`,
          desde: enLaLosa(l.x, l.y, medioDelLado(lado)),
          hasta: enLaLosa(l.x, l.y, { x: 0.5, y: 0.5 }),
          color: PIEDRA_DE_LA_VILLA,
          grosor: villa.lados.length > 1 ? 10 : 0.5,
          tenue: villa.lados.length === 1,
          toque: null,
        });
      }
      if (villa.blason) {
        const donde = puntoDeLaCosa(losa, l.giro, 'villa', i);
        nudos.push({
          id: `blason:${l.casilla}:${i}`,
          punto: enLaLosa(l.x, l.y, donde),
          color: BLASON,
          radio: 6,
          forma: 'cuadrado',
          tenue: false,
          toque: null,
        });
      }
    }

    /* Las sendas, del borde al centro. */
    for (const senda of losa.sendas) {
      for (const propio of senda.lados) {
        const lado = ladoGirado(propio, l.giro);
        lineas.push({
          id: `senda:${l.casilla}:${lado}`,
          desde: enLaLosa(l.x, l.y, medioDelLado(lado)),
          hasta: enLaLosa(l.x, l.y, { x: 0.5, y: 0.5 }),
          color: TIERRA_DE_LA_SENDA,
          grosor: 7,
          tenue: false,
          toque: null,
        });
      }
    }

    if (losa.ermita) {
      nudos.push({
        id: `ermita:${l.casilla}`,
        punto: enLaLosa(l.x, l.y, { x: 0.5, y: 0.5 }),
        color: ERMITA,
        radio: 11,
        forma: 'cuadrado',
        tenue: false,
        toque: null,
      });
    }
  }

  /* 2 · Los labriegos plantados. */
  for (const p of vista.plantados) {
    const puesta = vista.losas.find((l) => l.casilla === p.casilla);
    if (puesta === undefined) continue;
    const losa = losaPorId(puesta.losa);
    if (losa === null) continue;
    nudos.push({
      id: `labriego:${p.casilla}:${p.clase}:${p.indice}`,
      punto: enLaLosa(puesta.x, puesta.y, puntoDeLaCosa(losa, puesta.giro, p.clase, p.indice)),
      color: p.color,
      radio: 9,
      forma: 'redondo',
      tenue: false,
      toque: null,
    });
  }

  /* 3 · Dónde cabe la losa de la mano, partido en cuartos cuando hace falta. */
  const porCasilla: Record<string, Colocacion[]> = {};
  for (const c of vista.colocaciones) {
    const llave = llaveDeCasilla(c.x, c.y);
    const lista = porCasilla[llave];
    if (lista === undefined) porCasilla[llave] = [c];
    else lista.push(c);
  }
  for (const llave of Object.keys(porCasilla).sort(porTexto)) {
    const suyas = porCasilla[llave] as Colocacion[];
    const primera = suyas[0] as Colocacion;
    abarcar(primera.x, primera.y);
    const entera = suyas.length === 1;
    for (const c of suyas) {
      const toque = ofrecido(opciones, PONER, { x: c.x, y: c.y, giro: c.giro })
        ? { tipo: PONER, carga: { x: c.x, y: c.y, giro: c.giro } }
        : null;
      caras.push({
        id: `cabe:${llave}:${c.giro}`,
        puntos: entera ? cuadroEntero(c.x, c.y) : cuartoDelCuadro(c.x, c.y, c.giro),
        relleno: HUECO_LIBRE,
        borde: VERDE_OSCURO,
        rotulo: FLECHA_DEL_GIRO[c.giro],
        cifra: '',
        destacada: false,
        toque,
      });
    }
  }

  const x = minX * LADO_EN_EL_DIBUJO - MARGEN;
  const y = -maxY * LADO_EN_EL_DIBUJO - MARGEN;
  return {
    vista: {
      x,
      y,
      ancho: (maxX - minX + 1) * LADO_EN_EL_DIBUJO + 2 * MARGEN,
      alto: (maxY - minY + 1) * LADO_EN_EL_DIBUJO + 2 * MARGEN,
    },
    caras,
    lineas,
    nudos,
    acciones: accionesDelTablero(vista, opciones),
    paneles: panelesDeLasLindes(vista),
    aviso: vista.aviso,
  };
}

/** Los botones que no se tocan en el tablero. */
function accionesDelTablero(
  vista: VistaSinTablero,
  opciones: readonly Opcion[],
): TableroDeclarado['acciones'] {
  const salida: TableroDeclarado['acciones'] = [];
  let delTurno = 0;
  for (const o of opciones) {
    if (o.tipo === PONER) continue;
    if (o.tipo !== LEVA) delTurno++;
    salida.push({
      id: o.id,
      rotulo: o.rotulo,
      ayuda: o.ayuda,
      disponible: true,
      toque: { tipo: o.tipo, carga: o.carga ?? null },
    });
  }
  /*
   * ═══ Y CUANDO NO HAY NINGUNO, HAY DOS MOTIVOS DISTINTOS Y NO SE PARECEN ═══
   *
   * Aquí sólo se miraba si la lista había salido vacía, y salía vacía en LOS DOS casos:
   * para quien está esperando su turno, y también para QUIEN LE TOCA PONER —porque sus
   * únicas opciones son `PONER`, y el bucle de arriba se las salta a propósito: esos no
   * son botones, son casillas del tablero—. Así que a quien le tocaba jugar se le decía
   * «Le toca a otro. Cuando ponga su losa, te tocará a ti».
   *
   * Sentado a una mesa de verdad, con la flecha del turno señalando mi propio asiento en
   * el raíl y la losa en mi mano. Ninguna de las 13.295 comprobaciones del reglamento lo
   * vio, porque todas miran QUÉ SE PUEDE HACER y ésta es una frase sobre quién manda.
   */
  /*
   * La leva no cuenta: es un botón de a pie que no dice nada del turno, y con ella en la lista quien
   * espera dejaba de leer «Le toca a otro» y quien pone, «Ponla en el tablero».
   */
  if (delTurno === 0 && vista.momento === 'colocando') {
    const meToca = vista.turnoDe !== null && vista.turnoDe === vista.yo;
    salida.push(
      meToca
        ? {
            id: 'a-poner',
            rotulo: 'Ponla en el tablero',
            ayuda: 'Señala una casilla clara y tócala. Con «Girar» se prueba de otra manera.',
            disponible: false,
            toque: { tipo: PASAR, carga: null },
          }
        : {
            id: 'espera',
            rotulo: 'Le toca a otro',
            ayuda: 'Cuando ponga su losa, te tocará a ti.',
            disponible: false,
            toque: { tipo: PASAR, carga: null },
          },
    );
  }
  return salida;
}

/** ¿Está este movimiento entre los ofrecidos? Para no pintar un toque que se rechazaría. */
function ofrecido(opciones: readonly Opcion[], tipo: string, carga: unknown): boolean {
  const buscado = deForma({ tipo, carga });
  for (const o of opciones) {
    if (deForma({ tipo: o.tipo, carga: o.carga ?? null }) === buscado) return true;
  }
  return false;
}

/** Los paneles de texto, que son lo que hace que se pueda jugar sin saber de qué va. */
function panelesDeLasLindes(vista: VistaSinTablero): TableroDeclarado['paneles'] {
  const paneles: TableroDeclarado['paneles'] = [];

  /*
   * ═══ ACABADA LA PARTIDA, LO QUE IMPORTA SON LOS PUNTOS ═══
   *
   * Esta línea decía siempre «N puntos · M labriegos», también en la pantalla del final. Y al
   * final todos los labriegos han vuelto a la mano —los recoge el recuento, el propio reductor
   * lo tiene escrito— así que el marcador de cierre ponía «· 0 labriegos» debajo de cada
   * nombre: un cero que no significa nada, repetido, justo en la pantalla que se queda mirando
   * quien acaba de ganar o de perder. Terminada la partida se dice el resultado y ya está.
   */
  const mesa: string[] = [];
  const acabada = vista.momento === 'terminada';
  for (const l of vista.labriegos) {
    const suyo = !acabada && l.asiento === vista.turnoDe ? ' ←' : '';
    const cuantos = acabada ? '' : ` · ${l.sinPlantar} labriegos`;
    mesa.push(`${l.nombre}: ${l.puntos}${cuantos}${suyo}`);
  }
  if (mesa.length > 0) paneles.push({ titulo: acabada ? 'Cómo quedó' : 'La mesa', lineas: mesa });

  if (vista.claseEnMano !== '') {
    const losa = losaPorId(vista.claseEnMano);
    if (losa !== null) {
      paneles.push({
        titulo: 'En la mano',
        lineas: [
          losa.nombre,
          `Norte: ${losa.lados[0]} · Este: ${losa.lados[1]}`,
          `Sur: ${losa.lados[2]} · Oeste: ${losa.lados[3]}`,
          losa.ermita ? 'Con ermita.' : '',
        ].filter((s) => s !== ''),
      });
    }
  }

  if (vista.momento === 'plantando' && vista.sitios.length > 0) {
    paneles.push({
      titulo: 'Dónde cabe un labriego',
      /*
       * ═══ Y EL AVISO DEL PRADO, DONDE SE VE ═══
       *
       * «Se queda ahí hasta el final» sólo estaba en la ayuda de la opción, y la ayuda es un
       * `title` en el escritorio —hay que posar el ratón y esperar— y un `accessibilityLabel`
       * en la app —sólo lo lee un lector de pantalla—. O sea que la única decisión IRREVERSIBLE
       * de un turno de Carcassonne se tomaba a ciegas en los dos clientes.
       *
       * Va como renglón del panel porque el panel lo declara el juego y lo pintan los tres
       * muebles —escritorio, app y retablo— sin que ninguno tenga que saber nada.
       */
      lineas: [
        ...vista.sitios.map(
          (s) => `${NOMBRE_DE_LA_COSA[s.clase]}: ${s.valdria}${s.cerrada ? ' (se cierra ya)' : ''}`,
        ),
        ...(vista.sitios.some((s) => s.clase === 'prado')
          ? ['El del prado no vuelve: se queda hasta que se acabe la bolsa.']
          : []),
      ],
    });
  }

  if (vista.cobros.length > 0) {
    paneles.push({ titulo: 'Se ha cobrado', lineas: vista.cobros.map((c) => c.frase) });
  }

  /*
   * LA REFRIEGA, al lado de lo cobrado y con el mismo trato: una frase por botín, ya escrita. El
   * `Array.isArray` no es desconfianza gratuita: esto recibe la vista que llegó por la red, y una
   * vista de antes del botín no trae el campo.
   */
  const refriegas = Array.isArray(vista.refriegas) ? vista.refriegas : [];
  if (refriegas.length > 0) {
    paneles.push({ titulo: 'La refriega', lineas: refriegas.map((r) => r.frase) });
  }

  /*
   * LOS ESCUDOS, sólo si alguien bajó al valle (la vista no trae el campo si no). Mientras se juega,
   * cuántos lleva cada uno y cuántas levas ha pagado; al final, lo que sumaron en el recuento, que
   * es donde se ve que guardarlos valía algo. Leídos con los lectores de `lindes-escudos.ts`, que
   * son los mismos que usan los clientes y no se fían de la red.
   */
  if (vista.escudos !== undefined || vista.levas !== undefined) {
    const lineas: string[] = [];
    for (const l of vista.labriegos) {
      const escudos = escudosDeLaVista(vista, l.asiento);
      const levas = levasDeLaVista(vista, l.asiento);
      if (escudos === 0 && levas === 0) continue;
      const deEscudos = escudos === 1 ? '1 escudo' : `${escudos} escudos`;
      if (acabada) {
        lineas.push(
          escudos > 0
            ? `${l.nombre}: ${deEscudos} sin gastar, +${escudos * PUNTOS_POR_ESCUDO} en el recuento.`
            : `${l.nombre}: los gastó todos en levas.`,
        );
      } else {
        lineas.push(`${l.nombre}: ${deEscudos} · ${levas} de ${LEVAS_POR_JUGADOR} levas`);
      }
    }
    if (lineas.length > 0) paneles.push({ titulo: 'Los escudos', lineas });
  }

  paneles.push({
    titulo: 'La bolsa',
    lineas: [
      `Quedan ${vista.quedan}.`,
      vista.retiradas === 0
        ? 'No se ha retirado ninguna.'
        : `Retiradas por no caber: ${vista.retiradas}.`,
    ],
  });

  return paneles;
}

// ---------------------------------------------------------------------------
// La aritmética del dibujo
// ---------------------------------------------------------------------------

/**
 * LA ESQUINA DE ARRIBA A LA IZQUIERDA DE UNA CASILLA, en el dibujo.
 *
 * La `y` se da la vuelta: en el tablero la `y` crece hacia el NORTE, y en un
 * lienzo crece hacia abajo. Se hace aquí y en un solo sitio; si se hiciera en
 * cada punto, el día que alguien se dejara uno la losa saldría espejada y nadie
 * sabría por qué.
 */
function esquina(x: number, y: number): { readonly x: number; readonly y: number } {
  return { x: x * LADO_EN_EL_DIBUJO, y: -y * LADO_EN_EL_DIBUJO };
}

/** Un punto en coordenadas de losa (0 a 1, con la `y` hacia el norte), en el dibujo. */
function enLaLosa(
  x: number,
  y: number,
  p: { readonly x: number; readonly y: number },
): { readonly x: number; readonly y: number } {
  const o = esquina(x, y);
  return { x: o.x + p.x * LADO_EN_EL_DIBUJO, y: o.y + (1 - p.y) * LADO_EN_EL_DIBUJO };
}

/** Los cuatro puntos de una casilla entera. */
function cuadroEntero(x: number, y: number): { x: number; y: number }[] {
  const o = esquina(x, y);
  return [
    { x: o.x, y: o.y },
    { x: o.x + LADO_EN_EL_DIBUJO, y: o.y },
    { x: o.x + LADO_EN_EL_DIBUJO, y: o.y + LADO_EN_EL_DIBUJO },
    { x: o.x, y: o.y + LADO_EN_EL_DIBUJO },
  ];
}

/** El cuarto de casilla que le toca a cada giro: noroeste, noreste, sureste, suroeste. */
function cuartoDelCuadro(x: number, y: number, giro: Giro): { x: number; y: number }[] {
  const o = esquina(x, y);
  const m = LADO_EN_EL_DIBUJO / 2;
  const dx = giro === 1 || giro === 2 ? m : 0;
  const dy = giro === 2 || giro === 3 ? m : 0;
  return [
    { x: o.x + dx, y: o.y + dy },
    { x: o.x + dx + m, y: o.y + dy },
    { x: o.x + dx + m, y: o.y + dy + m },
    { x: o.x + dx, y: o.y + dy + m },
  ];
}

/** Los dos extremos de la raya de un lado, en el dibujo. */
function laRaya(
  x: number,
  y: number,
  lado: Lado,
): { readonly desde: { x: number; y: number }; readonly hasta: { x: number; y: number } } {
  const esquinas: Readonly<Record<Lado, readonly [{ x: number; y: number }, { x: number; y: number }]>> = {
    0: [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ],
    1: [
      { x: 1, y: 1 },
      { x: 1, y: 0 },
    ],
    2: [
      { x: 1, y: 0 },
      { x: 0, y: 0 },
    ],
    3: [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
    ],
  };
  const par = esquinas[lado];
  return { desde: enLaLosa(x, y, par[0]), hasta: enLaLosa(x, y, par[1]) };
}

/** El punto medio de un lado, en coordenadas de losa. */
function medioDelLado(lado: Lado): { readonly x: number; readonly y: number } {
  if (lado === 0) return { x: 0.5, y: 1 };
  if (lado === 1) return { x: 1, y: 0.5 };
  if (lado === 2) return { x: 0.5, y: 0 };
  return { x: 0, y: 0.5 };
}

/** El punto de un hueco, en coordenadas de losa. */
function puntoDelHueco(h: number): { readonly x: number; readonly y: number } {
  const lado = Math.floor(h / 2) as Lado;
  const primera = h % 2 === 0;
  if (lado === 0) return { x: primera ? 0.25 : 0.75, y: 1 };
  if (lado === 1) return { x: 1, y: primera ? 0.75 : 0.25 };
  if (lado === 2) return { x: primera ? 0.75 : 0.25, y: 0 };
  return { x: 0, y: primera ? 0.25 : 0.75 };
}

/**
 * DÓNDE SE PINTA UNA COSA DENTRO DE SU LOSA.
 *
 * El promedio de por dónde sale, tirado un poco hacia el centro para que no se
 * pegue al borde y para que dos cosas que salen por el mismo lado en losas
 * vecinas no se pisen. Es la misma cuenta que usan las dos escenas, y por eso
 * vive aquí y no en cada una.
 */
export function puntoDeLaCosa(
  losa: Losa,
  giro: Giro,
  clase: ClaseDeCosa,
  indice: number,
): { readonly x: number; readonly y: number } {
  const centro = { x: 0.5, y: 0.5 };
  if (clase === 'ermita') return centro;

  const puntos: { x: number; y: number }[] = [];
  if (clase === 'villa') {
    const villa = losa.villas[indice];
    if (villa !== undefined) {
      for (const l of villa.lados) puntos.push(medioDelLado(ladoGirado(l, giro)));
    }
  } else if (clase === 'senda') {
    const senda = losa.sendas[indice];
    if (senda !== undefined) {
      for (const l of senda.lados) puntos.push(medioDelLado(ladoGirado(l, giro)));
    }
  } else {
    const prado = losa.prados[indice];
    if (prado !== undefined) {
      for (const h of prado.huecos) puntos.push(puntoDelHueco(huecoGirado(h, giro)));
    }
  }
  if (puntos.length === 0) return centro;

  let sx = 0;
  let sy = 0;
  for (const p of puntos) {
    sx += p.x;
    sy += p.y;
  }
  const medio = { x: sx / puntos.length, y: sy / puntos.length };
  /* Un 55 % hacia el centro: cerca de lo suyo, lejos del borde. */
  return {
    x: medio.x + (centro.x - medio.x) * 0.55,
    y: medio.y + (centro.y - medio.y) * 0.55,
  };
}

// ---------------------------------------------------------------------------
// El manifiesto
// ---------------------------------------------------------------------------

/**
 * EL MANIFIESTO. Once campos, los mismos que los otros tres.
 *
 * `secretos: true` porque la bolsa lo es, y de ahí sale la obligación de
 * proyectar y de escribir `loSecreto` — las dos están, y si faltara una el
 * servidor se negaría a arrancar.
 *
 * `tickHz: 0` porque aquí el tiempo no es una regla: no hay reloj de turno, no
 * hay ofertas que caduquen y no hay nada que venza. Cero es un valor legítimo.
 *
 * `marcador: { tipo: 'ninguno' }` y no una cifra, aunque el juego cuente puntos:
 * los puntos son de la partida y no salen a ninguna tabla que la plataforma tenga
 * que creerse. El día que haya una clasificación, esto cambia de valor y con él
 * la exigencia de reejecutabilidad — que es exactamente por lo que el campo es
 * obligatorio y no opcional.
 */
export const MANIFIESTO_LINDES: ManifiestoDeArcade = {
  id: LINDES,
  nombre: 'Las Lindes',
  gancho: 'Cada losa que pones cambia el mapa: cierra murallas, remata caminos y planta a los tuyos donde más renta.',
  icono: 'mando',
  jugadores: { minimo: CABEN.minimo, maximo: CABEN.maximo },
  sede: 'servidor',
  tickHz: 0,
  mueble: 'tablero',
  secretos: true,
  marcador: { tipo: 'ninguno' },
  procedencia: { tipo: 'mecanica-generica' },
};
