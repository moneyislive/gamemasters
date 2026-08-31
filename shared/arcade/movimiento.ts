/**
 * Lo que alguien HACE, y lo poco que el motor sabe de ello.
 *
 * ═══ POR QUÉ NO SE HEREDA `DefinicionAccion` ═══
 *
 * El vocabulario de acciones de las veladas —`eligeDe`, `eligeVarias`,
 * `eligeOpcional`, `eligeLibre`, `pideNumero`, `vecesPorTurno`— es excelente y
 * es agnóstico, y lo es PARA JUEGOS DE FORMULARIO: elegir de una lista dada de
 * alta y escribir un número. Está construido sobre una premisa que se cumple en
 * los cuatro juegos de la casa y en ninguno de los cuatro de aquí: que lo que se
 * elige es una ENTIDAD que un humano registró antes en el taller.
 *
 * Ese vocabulario no sabe expresar:
 *
 *   · una inclinación de acelerómetro,
 *   · un toque en el instante *t* —no «qué» sino «cuándo»—,
 *   · el identificador canónico de un vértice de una malla hexagonal, que
 *     ningún humano dio de alta porque lo calculó la geometría.
 *
 * Y `vecesPorTurno` trae dentro, de regalo, la premisa de que existe el turno.
 *
 * Heredarlo «porque ya es agnóstico» dejaría el motor a medida de la primera
 * familia que se implemente, que es literalmente el error que este repositorio
 * ya cometió una vez y documentó en `INFORME-ARQUITECTURA.md`. Así que la carga
 * es LIBRE: el motor la transporta y no la mira.
 */
import type { AsientoId } from './tipos';

/**
 * Un movimiento: un nombre y, si hace falta, lo que lleva dentro.
 *
 * ═══ `carga` ES `unknown` A PROPÓSITO, Y CUESTA ALGO ═══
 *
 * El precio está a la vista y conviene no disimularlo: el motor NO valida la
 * carga. No puede — no sabe qué es un vértice, ni un ángulo, ni cuál de tus
 * cartas es la que juegas.
 *
 * En las veladas eso lo cubre `ejecutarAccion`, que comprueba que lo elegido sea
 * una entidad REAL de su categoría, y ES una comprobación valiosa: impide que un
 * móvil manipulado mande el id de una sala donde va un sospechoso. Aquí esa
 * comprobación no desaparece: BAJA AL REDUCTOR, que es el único que sabe qué es
 * real en su juego. Está dicho también en la cabecera de `arbitro.ts`, porque es
 * el sitio donde a alguien le entrarán ganas de volver a subirla.
 *
 * El contrato, entonces, es explícito y del mismo tipo que el de `eligeLibre` en
 * las veladas: LO QUE LLEGA NO ESTÁ VALIDADO. Un reductor que se crea la carga
 * sin mirarla abre exactamente el agujero que se acaba de describir.
 */
export interface Movimiento {
  /**
   * Qué clase de movimiento es. Cadena libre, del vocabulario del juego.
   *
   * Los que empiezan por `arcade:` los reserva la plataforma, y hoy hay
   * exactamente uno: el tic (ver `reloj.ts`). Es un prefijo y no una unión
   * cerrada porque el juego tiene que poder inventarse los suyos sin venir a
   * este fichero a añadir un renglón — que es el peaje que `LivePhase` cobró
   * durante meses en el otro motor.
   */
  tipo: string;
  carga?: unknown;
}

/**
 * Lo que el reductor sabe del mundo cuando le llega un movimiento.
 *
 * Cuatro cosas, y la lista importa tanto por lo que NO tiene como por lo que
 * tiene. NO HAY CAMPO DE TURNO.
 *
 * ═══ POR QUÉ NO HAY TURNO, QUE ES EL DESCARTE MÁS IMPORTANTE DEL DISEÑO ═══
 *
 * De quién es el turno es un CAMPO DEL ESTADO DEL JUEGO. En cuanto el motor
 * sabe qué es un turno, el primer juego rico que se escriba decide qué forma
 * tiene: si es de uno o de varios, si hay subfases, si el orden es fijo o en
 * serpentina, si alguien puede actuar fuera de él. Y a partir de ahí, cualquier
 * juego que no encaje tiene que fingirlo — «el que no venía, fingía», que es lo
 * que `shared/live.ts` ya lleva documentado como el fallo de la unión cerrada.
 *
 * Con el turno dentro del estado, media docena de conceptos que parecían
 * obligatorios —jugadores activos, subfases, orden de turno, recursos, trueque,
 * zonas de visibilidad— DESAPARECEN en vez de generalizarse. No es minimalismo
 * estético: nombrarlos aquí sería reconstruir el problema de CLUEDO con
 * vocabulario de tablero.
 *
 * La preocupación legítima —que a quien no le toca ni se le pinte el botón— no
 * se pierde: la cubre la función `opciones()` que cada juego escribe, que es
 * CLIENTE y no autoridad. La misma función que el mueble usa para pintar y el
 * reductor usa para validar, de modo que la regla sigue escrita una sola vez.
 */
export interface ContextoMovimiento {
  /**
   * Quién lo hace, o `null` si no lo hace nadie.
   *
   * `null` no es un hueco ni un caso degenerado: es el tic. El tiempo entra por
   * la misma puerta que todo lo demás y no lo manda ningún asiento. También es
   * lo que llega en un juego de un solo aparato, donde no hay asientos que
   * distinguir porque el móvil pasa de mano en mano.
   */
  quien: AsientoId | null;

  /**
   * LA SEMILLA de esta partida. Un número, no un generador.
   *
   * ═══ POR QUÉ UN NÚMERO Y NO UN OBJETO CON `siguiente()` ═══
   *
   * Un generador con estado interno metería la impureza por la puerta de atrás:
   * `avanzar(estado, mov, ctx)` seguiría pareciendo pura y dejaría de serlo,
   * porque llamarla dos veces con los mismos argumentos daría resultados
   * distintos — el objeto habría avanzado entre las dos. Y entonces reejecutar
   * un registro de movimientos para verificar un marcador daría un estado que no
   * es el que hubo, sin que nada avise.
   *
   * Así que el contador vive DENTRO DEL ESTADO, que es donde `shared/mecanicas/
   * azar.ts` lo pone y por donde se puede rebobinar. Lo que viaja aquí es la
   * semilla con la que nació la mesa: el reductor la usa la primera vez para
   * sembrar su propio azar, y a partir de ahí el azar es suyo y viaja con el
   * estado.
   *
   * Que la reparta el contexto y no el juego tiene una razón concreta: en una
   * mesa con autoridad, la semilla la elige el SERVIDOR. Si la eligiera el
   * dispositivo, un cliente manipulado probaría semillas hasta encontrar la que
   * le reparte la mano que quiere.
   */
  azar: number;

  /**
   * En qué tic va la partida. Ver `reloj.ts`.
   *
   * Es el reloj entero: no hay instantes, ni fechas, ni husos. Un juego que
   * necesite «quedan treinta segundos» los cuenta en tics, y por eso la misma
   * partida reejecutada seis meses después da exactamente lo mismo.
   */
  tic: number;

  /**
   * Quiénes están sentados, en el orden en que se sentaron.
   *
   * `readonly` porque el reductor no reparte sitios: eso es autoridad y vive en
   * el servidor. Lo que sí puede es LEERLOS, que es lo que hace falta para
   * repartir cartas, decidir quién empieza o comprobar que hay bastante gente.
   *
   * Puede estar vacío. Un arcade de un jugador en el que el servidor solo
   * verifica no tiene asientos, y eso no es un estado a medio construir: es su
   * forma normal.
   */
  asientos: readonly AsientoId[];
}
