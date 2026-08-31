/**
 * EL NÚCLEO. Un reductor puro sobre un estado opaco, y nada más.
 *
 *   avanzar(estado, movimiento, ctx) => estado
 *
 * ═══ ESTE ES EL FICHERO QUE `verify:fronteras` VIGILA CON MÁS CELO ═══
 *
 * No importa NADA de `node:`. Ni Express, ni Mongoose, ni React, ni un reloj de
 * pared, ni un generador de números aleatorios. La razón no es la elegancia: es
 * que el día que este fichero importe `node:crypto` —para una semilla, para un
 * hash, para lo que sea— «La Frente» deja de poder existir, porque este mismo
 * fichero tiene que correr dentro de Hermes en un móvil sin red.
 *
 * Que las reglas vivan en `shared/` y no en `server/` no es orden: es LA
 * CONDICIÓN para que el mismo fichero corra en los dos sitios. La regla que
 * ordena todo el árbol cabe en una línea:
 *
 *     `shared/` son las reglas. `server/` es la autoridad.
 *
 * ═══ POR QUÉ PURO, Y QUÉ SE COMPRABA CON ELLO ═══
 *
 * El contrato de reductor de las veladas es `Reductor = (ctx) => unknown` y MUTA
 * la sesión. Está bien para lo que hace, y tiene una consecuencia que allí no se
 * nota y aquí es fatal: LO QUE SE MUTA NO SE REEJECUTA. Sin reejecución no hay
 * verificación de marcador, ni repetición de partida, ni autoridad barata de
 * servidor, ni predicción con rebobinado el día que exista un canal rápido.
 *
 * Aquí el reductor recibe un estado y DEVUELVE otro. El que recibió sigue siendo
 * válido, y esa es toda la magia: una partida es una semilla y una lista de
 * movimientos, y el estado final es una consecuencia y no un dato guardado.
 *
 * ═══ NO HAY REGISTRO EN ESTE FICHERO, Y ES DELIBERADO ═══
 *
 * El registro de arcades instalados vive en `index.ts`, anclado con `Symbol.for`
 * como el de veladas. Aquí no hay tabla, ni `globalThis`, ni alta de nada: este
 * fichero se puede leer entero y comprobar a ojo que es una función de sus
 * argumentos. Meter el registro aquí habría obligado a `verify:pureza` a hacer
 * una excepción justo en el fichero donde menos excepciones se quieren.
 */
import type { ContextoMovimiento, Movimiento } from './movimiento';

/**
 * LO QUE ESCRIBE UN JUEGO. La única función obligatoria de un arcade.
 *
 * ═══ EL ESTADO ES OPACO, Y ESO ES EL DISEÑO ENTERO ═══
 *
 * El motor no sabe qué hay dentro, y por tanto no puede quedarse corto. El
 * comercio de un juego de tablero es un campo del estado y tres tipos de
 * movimiento; los recursos son un objeto; la carretera más larga es una función
 * del propio juego. El motor no necesita nombrar ninguno de los tres.
 *
 * Compárese con el reductor de veladas, que recibe `LiveSession`: un tipo con
 * `players`, `round`, `phase` y `turnoDe`. Forma de velada, y por tanto un juego
 * con otra forma tiene que traducirse a esa o no entra.
 *
 * ═══ LAS TRES REGLAS DE UN REDUCTOR, Y LO QUE ROMPE CADA UNA ═══
 *
 *  1. NO MUTA lo que recibe. Devuelve un estado nuevo. Si muta, la repetición
 *     que se suba para verificar un récord dará un resultado distinto del que
 *     hubo, y el marcador pasará a ser una cifra en la que hay que creer.
 *  2. NO MIRA EL RELOJ NI EL AZAR DEL SISTEMA. El tiempo llega en `ctx.tic` y la
 *     semilla en `ctx.azar`. Un `Date.now()` aquí dentro hace que la misma
 *     partida dé dos resultados, y lo hará en un solo modelo de móvil y seis
 *     meses después.
 *  3. SIEMPRE DEVUELVE UN ESTADO. Un movimiento que no cambia nada devuelve el
 *     que recibió; un movimiento imposible devuelve el que recibió. Nunca
 *     `undefined`, nunca una excepción para decir «eso no se puede»: quien
 *     hospeda la partida no tiene forma de distinguir «lo rechacé» de «reventé».
 *
 * Las tres las vigila `verify:pureza` en lo que se puede vigilar estáticamente,
 * y la primera y la tercera las caza `verify:arcade-pobre` jugando de verdad.
 */
export type Avanzar<E = unknown> = (estado: E, movimiento: Movimiento, ctx: ContextoMovimiento) => E;

/**
 * Un movimiento tal como quedó registrado, con TODO lo que hizo falta para
 * ejecutarlo.
 *
 * ═══ POR QUÉ SE GUARDA EL CONTEXTO ENTERO Y NO SOLO EL MOVIMIENTO ═══
 *
 * Porque reejecutar tiene que dar exactamente lo que pasó, y el contexto no se
 * puede reconstruir después: los asientos cambian durante la partida —alguien se
 * sienta en el tercer minuto—, y un registro que solo guardara la lista final
 * repartiría las cartas iniciales entre gente que todavía no había llegado.
 *
 * Ese fallo tiene la peor forma posible: una repetición HONRADA sale rechazada
 * al verificarla, y el récord de quien jugó limpio se cae. Un falso negativo en
 * el único sitio donde un falso negativo destruye la confianza en la cifra.
 *
 * Cuesta un puñado de bytes por movimiento. Es barato.
 */
export interface MovimientoRegistrado {
  movimiento: Movimiento;
  ctx: ContextoMovimiento;
}

/**
 * Un reductor ha devuelto `undefined`.
 *
 * Casi siempre significa lo mismo: alguien escribió un reductor con la costumbre
 * del otro motor —mutar lo que llega y no devolver nada— y aquí eso borraría la
 * partida entera dejando el estado en `undefined`. Sin esto, el síntoma sería
 * una mesa que se queda en blanco a mitad y ningún error por ninguna parte.
 */
export class ReductorMudo extends Error {
  constructor(public readonly tipo: string) {
    super(
      `El reductor no ha devuelto ningún estado al procesar «${tipo}». ` +
        'Un reductor de arcade SIEMPRE devuelve un estado: el nuevo si cambió algo, ' +
        'o el que recibió si el movimiento no procedía.',
    );
    this.name = 'ReductorMudo';
  }
}

/**
 * Aplica UN movimiento. Es la puerta por la que pasa todo.
 *
 * No hace casi nada, y lo poco que hace es lo único que el motor PUEDE
 * comprobar sin saber a qué se juega: que salga un estado. Todo lo demás —si el
 * movimiento tenía sentido, si la carga era la que tocaba, si a quien lo manda
 * le correspondía— lo sabe el juego y lo decide el juego.
 */
export function aplicar<E>(
  reductor: Avanzar<E>,
  estado: E,
  movimiento: Movimiento,
  ctx: ContextoMovimiento,
): E {
  const siguiente = reductor(estado, movimiento, ctx);
  if (siguiente === undefined) throw new ReductorMudo(movimiento.tipo);
  return siguiente;
}

/**
 * Reejecuta una partida entera desde su estado inicial.
 *
 * ═══ PARA QUÉ SIRVE ESTO, QUE ES LA MITAD DEL VALOR DE LA PUREZA ═══
 *
 * Un marcador que llega como una cifra suelta desde un móvil no vale nada: lo
 * manda cualquiera con un depurador abierto. Lo que sí vale es la REPETICIÓN —la
 * semilla y las entradas— porque el servidor la reejecuta aquí y comprueba que
 * de verdad da esa puntuación.
 *
 * Y sirve para lo mismo dentro de casa: correr esto dos veces sobre el mismo
 * registro y comparar el resultado es lo que distingue un reductor que ES
 * determinista de uno que alguien AFIRMÓ que lo era. La segunda clase se
 * descubre sola seis meses después, en un solo modelo de móvil, en forma de
 * desincronizaciones que nadie sabe reproducir.
 *
 * No lleva tope de tiempo ni de tamaño: eso es autoridad y vive en el servidor
 * (`verify:presupuesto`, cuando llegue su fase). Aquí solo se pliega la lista.
 */
export function reejecutar<E>(
  reductor: Avanzar<E>,
  inicial: E,
  registrados: readonly MovimientoRegistrado[],
): E {
  let estado = inicial;
  for (const r of registrados) {
    estado = aplicar(reductor, estado, r.movimiento, r.ctx);
  }
  return estado;
}
