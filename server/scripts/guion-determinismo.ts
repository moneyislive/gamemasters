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

/** Todas las partidas, con el nombre del motor delante. */
export function jugarLaTanda(): Tanda {
  const jugadas: Jugada[] = [];
  for (const semilla of SEMILLAS) jugadas.push(jugarUna(semilla));
  return { motor: queMotorSoy(), jugadas };
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
