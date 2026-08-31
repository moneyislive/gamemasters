/**
 * CUÁNTO CUESTA UN MOVIMIENTO. Se MIDE, y todavía no se exige.
 *
 * ═══ POR QUÉ MEDIR ANTES DE EXIGIR, Y POR QUÉ NO AL REVÉS ═══
 *
 * El diseño pone `verify:presupuesto` en la fase 5, la de los terceros, y lo
 * describe como «un reductor que tarde más del tope síncrono, o produzca un
 * estado mayor del permitido, se rechaza ANTES de bloquear el bucle de
 * eventos». Eso es una defensa contra código ajeno, y hoy todo el código es de
 * casa: rechazar un movimiento propio por lento sería tirar una partida de
 * cuatro personas para castigar a quien escribió el juego.
 *
 * Pero el tope no se puede elegir el día que haga falta. Un número inventado en
 * la fase 5 sería o tan alto que no protege o tan bajo que rechaza lo que hoy ya
 * funciona, y en los dos casos alguien lo cambiaría hasta que se pusiera verde
 * —que es la forma exacta en que un límite deja de significar nada—. Así que
 * esta fase deja la báscula puesta y anota lo que pasa por ella. Cuando llegue
 * el momento de poner el tope, habrá números medidos sobre juegos reales en vez
 * de una intuición.
 *
 * Y hay un segundo motivo, que es el que de verdad justifica el fichero hoy: un
 * reductor que empieza a tardar no da ningún error. Se nota como una mesa que va
 * lenta, en un despliegue cualquiera, meses después de que entrara la línea que
 * lo hizo. Con esto, la cifra está a la vista desde el primer día.
 *
 * ═══ LAS DOS COSAS QUE SE MIDEN, Y POR QUÉ SON ÉSAS ═══
 *
 *  1. EL TIEMPO SÍNCRONO del reductor. Node atiende con un solo hilo: un
 *     movimiento que tarde cien milisegundos son cien milisegundos en los que
 *     ninguna otra mesa —ni ninguna velada— recibe nada. No es la latencia de
 *     quien mueve: es la de todos los demás.
 *  2. EL TAMAÑO DEL ESTADO, serializado con `canonico.ts`. Es lo que se escribe
 *     en cada movimiento cuando `tickHz === 0`, lo que se guarda y lo que
 *     acabará viajando. Un estado que crece sin techo —un diario dentro del
 *     estado, un histórico de jugadas— convierte cada movimiento en una
 *     escritura más grande que la anterior, y eso se ve como «la partida se pone
 *     lenta hacia el final», que nadie sabe reproducir en la primera baza.
 *
 * ═══ POR QUÉ EL TAMAÑO NO SE MIDE SIEMPRE ═══
 *
 * Porque medirlo cuesta serializar el estado entero, o sea tanto como
 * guardarlo. Con `tickHz === 0` eso ya se hace igualmente en cada movimiento —la
 * escritura es síncrona— así que la medida es gratis. Con reloj, a sesenta
 * movimientos por segundo, serializar en cada uno duplicaría el coste del bucle
 * para llenar una estadística: ahí se mira uno de cada sesenta, que a 60 Hz es
 * una vez por segundo y basta de sobra para ver una tendencia.
 *
 * ═══ ESTE FICHERO NO SABE QUÉ ES UNA MESA ═══
 *
 * No importa `mesas.ts` ni el árbitro. Recibe un identificador de arcade, un
 * nombre de movimiento y una función, y devuelve lo que devuelva la función. Que
 * sea así es lo que permitirá que en la fase 3 lo llame también el bucle de
 * fotogramas del arcade de un jugador, que no tiene mesa ninguna.
 */
import { canonico } from '../../../shared/mecanicas/canonico';
import type { ArcadeId } from '../../../shared/arcade';

/**
 * Lo medido de un arcade, acumulado desde que arrancó el proceso.
 *
 * Se guardan el máximo y la media y no la lista entera de medidas, por lo mismo
 * que la presencia no va a la base de datos: esto tiene que costar cero. Una
 * lista crecería una entrada por movimiento y por mesa, o sea sin techo, y la
 * primera vez que alguien lo notara sería porque Render mató la instancia.
 */
export interface MedidaDeArcade {
  arcade: ArcadeId;
  /** Cuántos movimientos han pasado por aquí. */
  movimientos: number;
  /** El peor tiempo síncrono visto, en milisegundos. */
  msPeor: number;
  /** La suma, para poder dar la media sin guardar la lista. */
  msTotal: number;
  /** Cuál fue el movimiento que peor se portó. Sin esto, el máximo no lleva a ningún sitio. */
  peorMovimiento: string;
  /** Cuántas veces se ha llegado a medir el tamaño. */
  tamanosMedidos: number;
  /** El estado más grande visto, en caracteres de la forma canónica. */
  bytesPeor: number;
}

/**
 * La tabla, por arcade. `Map` y no objeto, para no tener que pensar nunca en
 * `for…in` ni en claves heredadas.
 */
const medidas = new Map<ArcadeId, MedidaDeArcade>();

function deArcade(arcade: ArcadeId): MedidaDeArcade {
  const ya = medidas.get(arcade);
  if (ya) return ya;
  const nueva: MedidaDeArcade = {
    arcade,
    movimientos: 0,
    msPeor: 0,
    msTotal: 0,
    peorMovimiento: '',
    tamanosMedidos: 0,
    bytesPeor: 0,
  };
  medidas.set(arcade, nueva);
  return nueva;
}

/**
 * Cronometra un movimiento y devuelve lo que devuelva.
 *
 * ═══ POR QUÉ ENVUELVE EN VEZ DE DEVOLVER UN CRONÓMETRO ═══
 *
 * Con un `empezar()` y un `terminar()` sueltos, la medida se pierde en cuanto el
 * código de en medio lanza —y el movimiento que lanza es justamente el
 * interesante—. Envolviendo, el `finally` cierra el cronómetro pase lo que pase,
 * y quien llama no tiene que acordarse de nada.
 *
 * `hrtime.bigint` y no `Date.now()`: lo que se mide son unidades de un
 * milisegundo o menos, y `Date.now()` tiene la resolución justa para dar cero
 * siempre y hacer creer que esto no cuesta nada.
 */
export function medirMovimiento<T>(arcade: ArcadeId, tipo: string, hacerlo: () => T): T {
  const desde = process.hrtime.bigint();
  try {
    return hacerlo();
  } finally {
    const ms = Number(process.hrtime.bigint() - desde) / 1_000_000;
    const m = deArcade(arcade);
    m.movimientos++;
    m.msTotal += ms;
    if (ms > m.msPeor) {
      m.msPeor = ms;
      m.peorMovimiento = tipo;
    }
  }
}

/** Uno de cada cuántos se mide cuando el arcade tiene reloj. Ver la cabecera. */
const UNO_DE_CADA = 60;

/**
 * Anota lo que ocupa un estado. `conReloj` decide si se mide o se muestrea.
 *
 * Un estado que no se puede serializar no se cuenta como cero: se ignora, y esa
 * decisión merece la línea. `canonico` LANZA ante lo no serializable —una
 * función, un `Infinity`, un ciclo— y ése es un problema del juego que
 * `oro:arcade` y `verify:determinismo` cazan de frente. Convertirlo aquí en un
 * error tumbaría una partida por culpa de la báscula, que es exactamente lo que
 * una báscula no debe hacer nunca.
 */
export function medirTamano(arcade: ArcadeId, estado: unknown, conReloj: boolean): void {
  const m = deArcade(arcade);
  if (conReloj && m.movimientos % UNO_DE_CADA !== 0) return;
  let bytes: number;
  try {
    bytes = canonico(estado).length;
  } catch {
    return;
  }
  m.tamanosMedidos++;
  if (bytes > m.bytesPeor) m.bytesPeor = bytes;
}

/** Lo medido hasta ahora, para quien quiera mirarlo. */
export function loMedido(): MedidaDeArcade[] {
  return [...medidas.values()].map((m) => ({ ...m }));
}

/** Lo medido de un arcade, o nada si por ahí no ha pasado ningún movimiento. */
export function loMedidoDe(arcade: ArcadeId): MedidaDeArcade | undefined {
  const m = medidas.get(arcade);
  return m ? { ...m } : undefined;
}

/** Borra las medidas. Para las pruebas, que necesitan empezar de cero. */
export function olvidarLoMedido(): void {
  medidas.clear();
}
