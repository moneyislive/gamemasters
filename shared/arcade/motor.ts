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
 *
 * ═══ Y DESDE LA FASE 5 PUEDE DEVOLVER, ADEMÁS, UN `Rechazo` ═══
 *
 * Que sigue llevando un estado dentro. No es una cuarta regla ni una excepción a
 * la tercera: es la tercera con una etiqueta al lado. Ver `Rechazo`, aquí abajo,
 * para por qué el motivo NO puede viajar dentro del estado y por qué esto no
 * rompe la reejecutabilidad.
 *
 * Un reductor que no lo use no cambia ni una línea: devolver `E` sigue siendo
 * devolver `E`, y los cuatro juegos anteriores compilan sin tocarse.
 */
export type Avanzar<E = unknown> = (
  estado: E,
  movimiento: Movimiento,
  ctx: ContextoMovimiento,
) => E | Rechazo<E>;

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

// ---------------------------------------------------------------------------
// EL CANAL ENTRE «EL REDUCTOR RECHAZÓ» Y LA PANTALLA
// ---------------------------------------------------------------------------

/**
 * LA MARCA DE UN RECHAZO, con `Symbol.for` y no con un campo `tipo: 'rechazo'`.
 *
 * ═══ POR QUÉ UN SÍMBOLO Y NO UNA CLAVE NORMAL ═══
 *
 * Porque el estado de un juego es OPACO y el motor no puede reservarse ninguna
 * clave dentro de él. Con `{ rechazo: true, estado, motivo }`, un juego cuyo
 * estado tuviera un campo `rechazo` —perfectamente legítimo en un juego de
 * subastas o de trueques— vería sus estados confundidos con rechazos, y el
 * síntoma sería que la partida deja de avanzar sin ningún error.
 *
 * Y hay una segunda propiedad que vale más que la primera: UNA PROPIEDAD CON
 * CLAVE DE SÍMBOLO NO SOBREVIVE A `JSON.stringify` NI A `canonico.ts`. O sea que
 * un estado leído del disco, recibido por la red o rehecho desde una repetición
 * no puede parecerse jamás a un rechazo, por mucho que alguien lo intente. La
 * frontera entre «esto es un estado» y «esto es un rechazo» no depende de que
 * nadie se equivoque.
 *
 * `Symbol.for` y no `Symbol()` por lo mismo que las dos tablas del registro: este
 * fichero se puede cargar dos veces —una ruta lo importa como
 * `../../shared/arcade` y otra como `./arcade`— y con un símbolo privado por
 * módulo, un rechazo creado por una copia no lo reconocería la otra. El síntoma
 * sería que el motivo se pierde y el estado del juego se sustituye por el objeto
 * envoltorio, o sea la partida en blanco.
 */
const MARCA_DE_RECHAZO = Symbol.for('gamemasters.arcade.rechazo');

/**
 * «NO, Y POR ESTO». Lo que un reductor devuelve cuando rechaza un movimiento.
 *
 * ═══ QUÉ PROBLEMA RESUELVE, Y POR QUÉ SE VOLVIÓ URGENTE ═══
 *
 * El §5.2 obliga a que un movimiento rechazado devuelva EL MISMO ESTADO, nunca un
 * motivo: es lo que mantiene el reductor puro y lo que la mesa ya cuenta como «no
 * pasó nada». Mientras el rechazo era raro, eso era una incomodidad — la app
 * podía decir «la mesa está igual que estaba» y casi nunca hacía falta.
 *
 * Con la regla del «sólo si» del §5 bis, el rechazo silencioso pasa a ser EL
 * CAMINO NORMAL: cada sitio donde un juego ejerce la regla produce un movimiento
 * que la pantalla sólo puede describir deduciendo que la revisión no subió. Nunca
 * *por qué*. Ésa es la factura de la regla del espejo, está escrita en el diseño
 * como tal, y esto es lo que la paga.
 *
 * ═══ POR QUÉ EL MOTIVO NO PUEDE VIAJAR DENTRO DEL ESTADO ═══
 *
 * Porque el estado es lo que se guarda, lo que se compara byte a byte en
 * `oro:arcade` y lo que sale de reejecutar el diario. Un motivo dentro de él
 * significaría que el estado final de una partida depende de qué movimientos
 * ILEGALES intentó alguien por el camino, y entonces:
 *
 *   · dos personas jugando la misma partida legítima acabarían con estados
 *     distintos según cuántas veces hubieran tocado un botón apagado,
 *   · la repetición que se sube para verificar un récord dejaría de cuadrar,
 *   · y un juego con secretos podría filtrar por ahí lo que la proyección tapa.
 *
 * ═══ CÓMO SE CONSERVAN LA PUREZA Y LA REEJECUTABILIDAD ═══
 *
 * El rechazo NO es estado: es un envoltorio que `aplicar()` abre y tira. La
 * función sigue siendo pura —dados los mismos argumentos devuelve el mismo
 * envoltorio con el mismo estado dentro— y `reejecutar()` pasa por `aplicar()`,
 * que se queda sólo con el estado. **El mismo registro de movimientos sigue dando
 * exactamente el mismo estado**, con motivo o sin él.
 *
 * Quien quiera el motivo lo pide por su nombre con `aplicarConMotivo()`, y quien
 * no, no se entera de que existe.
 *
 * ═══ LO QUE UN MOTIVO NO PUEDE SER ═══
 *
 * Un motivo viaja SÓLO a quien mandó el movimiento, en la respuesta de su propia
 * petición, y nunca a la vista de nadie más. Aun así hay una regla que el juego
 * tiene que respetar y que ninguna comprobación estática puede imponerle: **NO
 * PUEDE DECIR NADA QUE LA PROYECCIÓN DE QUIEN MUEVE NO DIJERA YA**. «El oferente
 * no tiene la sal que prometía» es una fuga por la puerta de atrás: dice algo del
 * almacén ajeno, que es justo lo que el «sólo si» existe para poder tapar. «Ese
 * trueque ya no está en pie» dice lo mismo sin contar nada.
 */
export interface Rechazo<E> {
  readonly [MARCA_DE_RECHAZO]: true;
  /**
   * El estado que sigue valiendo.
   *
   * Por contrato es EL QUE SE RECIBIÓ, que es lo que la mesa cuenta como
   * movimiento que no cambió nada. Se consideró imponerlo en `aplicar()` —
   * comprobar la identidad y lanzar si no cuadra— y se descartó por un caso
   * legítimo y frecuente: un reductor que construye su estado inicial en el
   * primer movimiento (`estado ?? partidaNueva()`) y rechaza ese mismo
   * movimiento devuelve algo que NO es idénticamente lo que recibió, porque lo
   * que recibió era `undefined`. Lanzar ahí convertiría una mesa recién abierta
   * en un error del servidor.
   *
   * La reejecutabilidad no depende de esa identidad: depende de que el reductor
   * sea determinista, que es lo que ya se vigila en otros cuatro sitios.
   */
  readonly estado: E;
  /** Qué decirle a quien lo intentó, en su idioma y sin contar lo que no ve. */
  readonly motivo: string;
}

/**
 * RECHAZA ESTE MOVIMIENTO, y di por qué.
 *
 * Se llama desde dentro del reductor, en el sitio donde antes había un
 * `return estado` mudo. Un juego que no la use sigue siendo válido: el rechazo
 * sin motivo es lo que había y sigue estando bien para un juego cuyo botón nunca
 * se pinta cuando no se puede pulsar.
 */
export function rechazar<E>(estado: E, motivo: string): Rechazo<E> {
  return { [MARCA_DE_RECHAZO]: true, estado, motivo };
}

/**
 * ¿ES ESTO UN RECHAZO Y NO UN ESTADO?
 *
 * Se pregunta por el símbolo y no por la forma. Un juego cuyo estado tuviera
 * casualmente un campo `motivo` y otro `estado` no se confunde con esto ni
 * queriendo.
 */
export function esRechazo<E>(salida: E | Rechazo<E>): salida is Rechazo<E> {
  if (typeof salida !== 'object' || salida === null) return false;
  return (salida as { [MARCA_DE_RECHAZO]?: unknown })[MARCA_DE_RECHAZO] === true;
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
  return aplicarConMotivo(reductor, estado, movimiento, ctx).estado;
}

/**
 * Lo que sale de aplicar un movimiento: el estado, y por qué no pasó nada.
 *
 * `motivo` es `null` cuando el reductor no rechazó, y también cuando rechazó SIN
 * decir por qué —devolviendo el estado tal cual, que es lo que hacían los cuatro
 * juegos anteriores y sigue siendo legítimo—. Los dos casos se distinguen desde
 * fuera comparando el estado por identidad, que es lo que la mesa ya hacía.
 */
export interface Aplicado<E> {
  estado: E;
  motivo: string | null;
}

/**
 * APLICA UN MOVIMIENTO Y CONSERVA EL MOTIVO, si lo hubo.
 *
 * Es la misma puerta que `aplicar()` —de hecho aquélla llama a ésta— y existe
 * aparte para que el motivo haya que PEDIRLO por su nombre. Si `aplicar()`
 * devolviera el envoltorio, todo el que hoy escribe `estado = aplicar(...)`
 * tendría de pronto un objeto donde esperaba un estado, y el fallo sería mudo:
 * la partida seguiría corriendo con el envoltorio dentro hasta que alguien
 * mirara la pantalla.
 *
 * Lo llama quien atiende un movimiento de fuera —el árbitro, y el bucle de un
 * juego de dispositivo—, que es el único que tiene a quién contárselo.
 * `reejecutar()` NO lo llama: ahí no hay nadie mirando y el motivo no existe.
 */
export function aplicarConMotivo<E>(
  reductor: Avanzar<E>,
  estado: E,
  movimiento: Movimiento,
  ctx: ContextoMovimiento,
): Aplicado<E> {
  const siguiente = reductor(estado, movimiento, ctx);
  if (siguiente === undefined) throw new ReductorMudo(movimiento.tipo);
  if (esRechazo(siguiente)) return { estado: siguiente.estado, motivo: siguiente.motivo };
  return { estado: siguiente, motivo: null };
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
