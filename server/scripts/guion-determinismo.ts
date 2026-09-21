/**
 * UNA PARTIDA ENTERA, JUGADA POR UN ROBOT, QUE CORRE EN CUALQUIER MOTOR.
 *
 * ═══ PARA QUÉ EXISTE ESTE FICHERO APARTE ═══
 *
 * `verify:determinismo` compara el mismo reductor en Node y en Hermes. Para
 * compararlos hay que ejecutar LO MISMO en los dos, y «lo mismo» no puede ser el
 * comprobador: el comprobador lee ficheros, lanza procesos y usa `node:path`, y
 * nada de eso existe dentro de Hermes.
 *
 * Así que lo que corre en los dos motores es esto: un fichero que no importa nada
 * de `node:`, que no lee ni escribe, y que solo hace cuentas. Se empaqueta con
 * esbuild —el mismo que ya usa `npm run build`— y el binario resultante se pasa a
 * los dos intérpretes.
 *
 * ═══ POR QUÉ EL ROBOT VIVE AQUÍ Y NO EN EL COMPROBADOR ═══
 *
 * Porque si el guion recibiera la lista de movimientos desde fuera, habría que
 * meterla dentro del paquete como un literal enorme —una partida de cuarenta
 * segundos son miles de tics— y, peor, la comparación entre motores sería más
 * floja: los dos recibirían las mismas entradas y solo se compararía el reductor.
 *
 * Con el robot dentro, cada motor JUEGA su partida: decide, mueve, mira el estado
 * y vuelve a decidir. Si el reductor divergiera un bit en el tic mil, el robot del
 * otro motor tomaría una decisión distinta a partir de ahí y las dos partidas se
 * separarían del todo. Es una comparación mucho más dura que reproducir una lista.
 *
 * ═══ Y POR QUÉ EL ROBOT NO USA NI UNA DIVISIÓN ═══
 *
 * Lo natural para decidir qué esquivar primero es «la que llegue antes», o sea
 * `(NAVE_Y − y) / vy`. Es una división de coma flotante y está fijada por IEEE
 * 754, así que en teoría da lo mismo en los dos motores... y en teoría también lo
 * daba `Math.pow`.
 *
 * Aquí el robot es el instrumento de medida, no lo que se mide. Si el instrumento
 * divergiera, el comprobador se pondría rojo señalando al reductor, y lo que
 * habría fallado sería la regla. Con una multiplicación cruzada —`a.t < b.t` se
 * convierte en `da × vb < db × va`— la comparación es entera y exacta, y lo único
 * que puede separar a los dos motores es lo que se está intentando comparar.
 */
import { canonico } from '../../shared/mecanicas/canonico';
import { movimientoDeTic } from '../../shared/arcade/reloj';
import type { ContextoMovimiento } from '../../shared/arcade/movimiento';
import {
  avanzarElArcade,
  EMPEZAR,
  NAVE_Y,
  partidaNueva,
  RUMBO,
  TICK_HZ,
} from '../../shared/arcade/juegos/arcade';
import type { EstadoDelArcade, Rumbo } from '../../shared/arcade/juegos/arcade';
import { jugarConElRobot } from './robot-del-burgo';
import { jugarLasLindes } from './robot-de-las-lindes';
import { PLANTAR } from '../../shared/arcade/juegos/lindes';

/**
 * Las semillas con las que se juega. Cuatro, y ninguna redonda.
 *
 * Cuatro y no una porque una sola partida puede no llegar a usar una rama del
 * reductor —no tocar el tope de caídas, no llegar al intervalo mínimo— y entonces
 * la comparación diría que dos motores coinciden en el trozo que ejecutaron. Con
 * cuatro semillas distintas se recorren cuatro partidas de largo distinto.
 *
 * Están escritas y no se sortean: un comprobador con entradas al azar es un
 * comprobador que se pone rojo un día de cada cien y que nadie puede reproducir.
 */
export const SEMILLAS: readonly number[] = [1, 20260831, 3141592653, 4294967295];

/**
 * Cuántos pasos como mucho por partida.
 *
 * Diez mil son casi tres minutos a sesenta hercios, muy por encima de lo que
 * aguanta el robot: sus partidas duran entre veinte y sesenta segundos porque la
 * dificultad acaba pasándole por encima. El tope está para que un cambio en las
 * reglas que hiciera al robot invencible no convierta este comprobador en un
 * bucle infinito dentro de la batería.
 */
export const TOPE_DE_PASOS = 10000;

/**
 * Una cosa que hizo el robot, con la misma forma que las entradas de una
 * repetición de verdad.
 *
 * Está aquí y no en `repeticiones.ts` porque este fichero corre TAMBIÉN DENTRO DE
 * HERMES, donde no existe `server/`: importar el tipo de allí metería el módulo
 * entero en el paquete. Son tres campos y la forma la fija aquel fichero, que es
 * quien la valida cuando llega por la red.
 */
export interface EntradaDelRobot {
  tic: number;
  tipo: string;
  carga?: unknown;
}

/** Lo que sale de jugar una partida. Todo comparable como texto. */
export interface Jugada {
  semilla: number;
  /** Cuántos tics duró. */
  tics: number;
  /** La cifra: cuántas esquivó. */
  esquivadas: number;
  /** Cuántas veces cambió de rumbo el robot. La forma de la partida. */
  decisiones: number;
  /** EL ESTADO FINAL, serializado con `canonico.ts`. Es lo que se compara. */
  huella: string;
}

/**
 * LO QUE SALE DE UNA PARTIDA DEL BURGO jugada por su robot. Todo comparable como texto.
 *
 * ═══ POR QUÉ EL BURGO ENTRA AQUÍ, Y POR QUÉ CON SU PROPIO ROBOT ═══
 *
 * Este comprobador comparaba UN reductor —El Arcade— y la memoria de la casa tiene
 * apuntado lo que eso vale para un sexto juego: nada. El Burgo mueve dinero en
 * treinta sitios, baraja dos mazos, encadena dados, ordena con comparadores y
 * redondea intereses con `Math.ceil` sobre enteros; cualquiera de esas cosas puede
 * dar distinto en Hermes y en V8 sin que ningún test escrito a mano lo vea. Aquí el
 * robot de `robot-del-burgo.ts` JUEGA la partida en los dos motores: decide sobre la
 * vista, mueve, y vuelve a decidir; si el reductor divergiera un maravedí en el
 * turno cien, las dos partidas se separarían del todo.
 *
 * Lo que NO se afirma: el tercer escalón (la repetición expandida) es de El
 * Arcade, que tiene marcador y sube repeticiones; el Burgo es de servidor, no tiene
 * repetición que expandir, y su diario lo reejecuta `verify:burgo`.
 */
export interface JugadaDelBurgo {
  semilla: number;
  /** Cuántos a la mesa. */
  cuantos: number;
  /** Cuántos movimientos de asiento cambiaron el estado, y cuántos tics entraron. */
  movimientos: number;
  tics: number;
  /** `jugada` final del estado: cuántos cambios hubo. */
  jugada: number;
  /** Cuántos quebraron. */
  quebrados: number;
  /** Si terminó con ganador. */
  terminada: boolean;
  /** EL ESTADO FINAL, serializado con `canonico.ts`. Es lo que se compara. */
  huella: string;
}

/** Cuántos se sientan en cada partida del Burgo: una por semilla, en este orden. */
export const CUANTOS_EN_EL_BURGO: readonly number[] = [2, 3, 4, 6];
/** Tope de vueltas de cada partida del Burgo: acota, no decide (medido: acaban por último en pie). */
export const TOPE_DE_VUELTAS_DEL_BURGO = 20;
/** Un tic cada tantos apuntes: el tic del Burgo tira por el ausente y gasta azar, y eso se compara también. */
export const UN_TIC_DEL_BURGO_CADA = 7;
/** Tope de pasos del robot por partida: un cambio de reglas que lo dejara dando vueltas no bloquea la batería. */
export const TOPE_DE_PASOS_DEL_BURGO = 4000;

/**
 * UNA PARTIDA DE LAS LINDES, JUGADA ENTERA POR EL ROBOT.
 *
 * Igual que el Burgo: el robot de `robot-de-las-lindes.ts` decide sobre la vista, mueve, y
 * vuelve a decidir, así que una divergencia de un maravedí en el turno diez separa las dos
 * partidas del todo. La diferencia con el Burgo es que aquí no hay reloj —`tickHz: 0`—, así
 * que no hay tics que intercalar: el tic es el número de orden del movimiento.
 *
 * Lo que NO se afirma: el tercer escalón (la repetición expandida) es de El Arcade. Las
 * Lindes son de servidor, no suben repetición, y su reejecución la cubre el oro de
 * `oro-arcade.ts` contra `oro-arcade/lindes.json`.
 */
export interface JugadaDeLasLindes {
  semilla: number;
  /** Cuántos a la mesa. */
  cuantos: number;
  /** Cuántos movimientos se mandaron en total. */
  apuntes: number;
  /** Losas en el tablero al acabar. La bolsa tiene 72, y una sale puesta. */
  puestas: number;
  /**
   * Cuántas veces se PLANTÓ, contado sobre los movimientos.
   *
   * ═══ Y NO SOBRE EL TABLERO FINAL, QUE SIEMPRE ESTÁ VACÍO ═══
   *
   * `estado.plantados` al acabar la partida es CERO en las cuatro semillas, medido: el remate
   * recoge todos los labriegos al puntuarlos. Un suelo escrito sobre ese campo exigiría
   * «cero o más» para siempre y se leería como vigilancia. Lo que dice si se plantó es la
   * cuenta de movimientos `lindes:plantar`, que es lo que se guarda aquí.
   */
  plantados: number;
  /**
   * Cuántas veces se plantó DE CADA CLASE, también sobre los movimientos.
   *
   * No es adorno y no basta con el total: el recuento de Las Lindes tiene cuatro ramas
   * —villa, senda, ermita y prado— y la rara es la ermita. Con un solo número, que la ermita
   * cayera a cero seguiría dando una suma cómoda y dejaría un recuento entero sin ejercitar,
   * en verde. Por eso el comprobador exige un suelo POR CLASE.
   */
  porClase: Record<string, number>;
  /** Lo que sumaron todos. */
  puntos: number;
  /** Si acabó de verdad, que es cuando se vacía la bolsa. */
  terminada: boolean;
  /** EL ESTADO FINAL, serializado con `canonico.ts`. Es lo que se compara. */
  huella: string;
}

/**
 * Cuántos se sientan en cada partida de Las Lindes: una por semilla, en este orden.
 *
 * ═══ NO ES `CUANTOS_EN_EL_BURGO`, Y COPIARLO SALE VERDE SIN JUGAR ═══
 *
 * El Burgo admite 6 a la mesa; Las Lindes no: `CABEN.maximo` es 5 (`lindes.ts:121`). Con 6,
 * el EMPEZAR se RECHAZA, la partida se queda en `momento: 'reuniendo'` con UN apunte y CERO
 * losas… y las huellas de Node y Hermes coinciden perfectamente, porque coinciden en la nada.
 * Es el verde por conjunto vacío servido en bandeja, y es exactamente lo que va a hacer el
 * siguiente que copie la línea de al lado. Los suelos de `verificar-determinismo.ts` están
 * puestos para cazarlo: se han visto rojos con este mismo cambio.
 */
export const CUANTOS_EN_LAS_LINDES: readonly number[] = [2, 3, 4, 5];
/** Tope de pasos del robot por partida: acota, no decide (medido: acaban solas en 94-123). */
export const TOPE_DE_PASOS_DE_LAS_LINDES = 600;

/** Y lo que sale de jugarlas todas, más quién las jugó. */
export interface Tanda {
  /**
   * Qué motor de JavaScript ha ejecutado esto.
   *
   * ═══ ESTE CAMPO ES LA MITAD DEL VALOR DEL COMPROBADOR ═══
   *
   * Sin él, `verify:determinismo` podría estar ejecutando el mismo paquete DOS
   * VECES EN NODE —porque el binario de Hermes no estaba, porque la ruta se quedó
   * vieja, porque alguien cambió el lanzador— y saldría verde para siempre
   * diciendo que dos motores coinciden. Sería el verde falso perfecto: una
   * comprobación de determinismo que no compara motores es una comprobación que
   * no comprueba lo que dice.
   *
   * `HermesInternal` es un objeto que Hermes pone en el ámbito global y que no
   * existe en V8. El comprobador exige que las dos tandas digan cosas DISTINTAS
   * antes de mirar ninguna huella.
   */
  motor: string;
  jugadas: Jugada[];
  /** Las partidas del Burgo, una por semilla. */
  burgo: JugadaDelBurgo[];
  /** Las partidas de Las Lindes, una por semilla. */
  lindes: JugadaDeLasLindes[];
}

/** Cómo se llama el motor que está ejecutando esto. Ver `Tanda.motor`. */
export function queMotorSoy(): string {
  const global_ = globalThis as unknown as { HermesInternal?: unknown };
  return global_.HermesInternal === undefined ? 'node' : 'hermes';
}

/**
 * QUÉ HACE EL ROBOT. Toda la lógica de decisión, y solo con enteros.
 *
 * Busca lo que va a llegar antes a la altura de la nave de entre lo que le pueda
 * caer encima, y se aparta hacia el lado contrario. Si no hay nada cerca, vuelve
 * al centro, que es la posición desde la que se llega antes a los dos lados.
 *
 * No pretende jugar bien: pretende jugar SIEMPRE IGUAL. Que además dure cuarenta
 * segundos es lo que hace que la partida recorra la subida de dificultad entera.
 */
function queHaceElRobot(estado: EstadoDelArcade): Rumbo {
  /* Lo más cerca en TIEMPO, comparado por multiplicación cruzada. Ver cabecera. */
  let peligroX = 0;
  let mejorDistancia = 0;
  let mejorVelocidad = 0;
  let hay = false;

  for (const c of estado.caidas) {
    const distancia = NAVE_Y - c.y;
    /* Lo que ya pasó de largo no es un peligro. */
    if (distancia < 0) continue;
    /* Ni lo que está lejos a los lados: apartarse de eso es perder el sitio. */
    const separacion = c.x - estado.nave;
    const separacionAbsoluta = separacion < 0 ? -separacion : separacion;
    if (separacionAbsoluta > 260) continue;

    if (!hay || distancia * mejorVelocidad < mejorDistancia * c.vy) {
      hay = true;
      peligroX = c.x;
      mejorDistancia = distancia;
      mejorVelocidad = c.vy;
    }
  }

  if (!hay) {
    if (estado.nave < 460) return 1;
    if (estado.nave > 540) return -1;
    return 0;
  }
  return peligroX > estado.nave ? -1 : 1;
}

/**
 * Juega una partida entera con esa semilla y devuelve lo que salió.
 *
 * El contexto se monta aquí con `quien: null` y `asientos: []`, que es su forma
 * normal en un juego de un aparato, y con `tic` subiendo de uno en uno. El juego
 * lleva su propio contador y no se fía de éste —está razonado en `arcade.ts`— así
 * que lo único que este bucle decide es CUÁNTOS pasos hay, nunca cuánto avanza
 * cada uno.
 */
export function jugarUna(semilla: number): Jugada {
  const { jugada } = jugarGrabando(semilla, TOPE_DE_PASOS);
  return jugada;
}

/**
 * Lo mismo, pero además con LO QUE HIZO EL ROBOT y el estado final en la mano.
 *
 * ═══ POR QUÉ ESTA FUNCIÓN Y NO DOS ROBOTS ═══
 *
 * `verify:marcador` necesita una repetición de VERDAD para subirla y ver que se
 * acepta: fabricar una a mano y llamarla «real» sería probar el comprobador contra
 * su propia idea de lo que es una partida. La única forma honrada de tener una
 * repetición real es jugar una, y jugarla con el mismo robot que juega
 * `verify:determinismo` — porque entonces las dos comprobaciones hablan de la
 * misma partida y una divergencia se ve en las dos.
 *
 * Se le puede pedir que pare antes del final, y eso también hace falta allí: una
 * partida completa dura medio minuto de reloj de juego, y el marcador contrasta la
 * duración declarada con el tiempo de pared, así que una batería que no puede
 * esperar medio minuto necesita una partida corta que sea REAL y no inventada.
 */
export function jugarGrabando(
  semilla: number,
  topeDePasos: number,
): { jugada: Jugada; entradas: EntradaDelRobot[]; estado: EstadoDelArcade } {
  const ctx = (tic: number): ContextoMovimiento => ({
    quien: null,
    azar: semilla,
    tic,
    asientos: [],
  });

  const entradas: EntradaDelRobot[] = [{ tic: 0, tipo: EMPEZAR }];
  let estado = avanzarElArcade(partidaNueva(), { tipo: EMPEZAR }, ctx(0));
  let decisiones = 0;
  let rumbo: Rumbo = 0;
  let pasos = 0;

  while (estado.momento === 'jugando' && pasos < topeDePasos) {
    const quiere = queHaceElRobot(estado);
    if (quiere !== rumbo) {
      rumbo = quiere;
      decisiones = decisiones + 1;
      /*
       * El movimiento se apunta con CUÁNTOS PASOS SE HAN DADO YA, que es la
       * convención que `repeticiones.movimientosDe` usa para expandir: una entrada
       * marcada en el tic T se aplica DESPUÉS del paso T. Si aquí se apuntara con
       * `pasos + 1`, la repetición se reejecutaría un paso desfasada y casi
       * siempre daría lo mismo — casi. Eso pasó de verdad, por el otro lado: la
       * expansión iba desfasada y 108 de 200 partidas del robot reejecutaban a
       * otro estado. Lo que lo cazó es el tercer escalón de `verify:determinismo`,
       * que compara la huella de jugar con la de expandir esta misma lista.
       */
      entradas.push({ tic: pasos, tipo: RUMBO, carga: quiere });
      estado = avanzarElArcade(estado, { tipo: RUMBO, carga: quiere }, ctx(pasos));
    }
    pasos = pasos + 1;
    estado = avanzarElArcade(estado, movimientoDeTic(), ctx(pasos));
  }

  return {
    jugada: {
      semilla,
      tics: estado.tic,
      esquivadas: estado.esquivadas,
      decisiones,
      huella: canonico(estado),
    },
    entradas,
    estado,
  };
}

/** Una partida entera del Burgo con esa semilla y los que le tocan a la mesa. Ver `JugadaDelBurgo`. */
export function jugarUnaDelBurgo(semilla: number, cuantos: number): JugadaDelBurgo {
  const p = jugarConElRobot(semilla, cuantos, TOPE_DE_VUELTAS_DEL_BURGO, UN_TIC_DEL_BURGO_CADA, TOPE_DE_PASOS_DEL_BURGO);
  let quebrados = 0;
  for (const j of p.estado.jugadores) if (j.quebrado) quebrados++;
  return {
    semilla,
    cuantos,
    movimientos: p.movimientos,
    tics: p.tics,
    jugada: p.estado.jugada,
    quebrados,
    terminada: p.estado.momento === 'terminada' && p.estado.ganadores.length > 0,
    huella: canonico(p.estado),
  };
}

/** Una partida entera de Las Lindes con esa semilla y los que le tocan a la mesa. Ver `JugadaDeLasLindes`. */
export function jugarUnaDeLasLindes(semilla: number, cuantos: number): JugadaDeLasLindes {
  const p = jugarLasLindes(semilla, cuantos, TOPE_DE_PASOS_DE_LAS_LINDES);
  const porClase: Record<string, number> = {};
  let plantados = 0;
  for (const a of p.apuntes) {
    if (a.tipo !== PLANTAR) continue;
    plantados++;
    const carga = a.carga as { clase?: string } | undefined;
    const clase = carga === undefined ? undefined : carga.clase;
    if (clase !== undefined) porClase[clase] = (porClase[clase] ?? 0) + 1;
  }
  let puntos = 0;
  for (const l of p.estado.labriegos) puntos += l.puntos;
  return {
    semilla,
    cuantos,
    apuntes: p.apuntes.length,
    puestas: p.puestas,
    plantados,
    porClase,
    puntos,
    terminada: p.estado.momento === 'terminada',
    huella: canonico(p.estado),
  };
}

/** Todas las partidas, con el nombre del motor delante. */
export function jugarLaTanda(): Tanda {
  const jugadas: Jugada[] = [];
  for (const semilla of SEMILLAS) jugadas.push(jugarUna(semilla));
  const burgo: JugadaDelBurgo[] = [];
  for (let i = 0; i < SEMILLAS.length; i++) {
    burgo.push(jugarUnaDelBurgo(SEMILLAS[i] as number, CUANTOS_EN_EL_BURGO[i] as number));
  }
  const lindes: JugadaDeLasLindes[] = [];
  for (let i = 0; i < SEMILLAS.length; i++) {
    lindes.push(jugarUnaDeLasLindes(SEMILLAS[i] as number, CUANTOS_EN_LAS_LINDES[i] as number));
  }
  return { motor: queMotorSoy(), jugadas, burgo, lindes };
}

/**
 * Cuánto dura la tanda en segundos de juego. Para que el informe diga algo.
 *
 * No entra en la comparación: es para el ojo humano que lee la salida y quiere
 * saber si lo que se ha comparado son cuatro partidas de verdad o cuatro que se
 * acabaron en el primer segundo.
 */
export function segundosDeLaTanda(tanda: Tanda): number {
  let tics = 0;
  for (const j of tanda.jugadas) tics += j.tics;
  return tics / TICK_HZ;
}
