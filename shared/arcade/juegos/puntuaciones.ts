/**
 * CÓMO SE LE LEE LA CIFRA A «EL ARCADE», Y NADA MÁS.
 *
 * ═══ ESTE FICHERO ERA UN HALLAZGO, Y LA FASE 5 LO HA PAGADO ═══
 *
 * Aquí vivía una TABLA de puntuaciones por juego, con una cabecera larga que
 * denunciaba una grieta del contrato: el manifiesto declara `marcador` —o sea QUE
 * hay una cifra y cómo se llama— y el núcleo no tenía forma de saber CUÁL es el
 * número, porque el estado es opaco. `instalarArcade()` no tenía hueco para la
 * función que lo lee, así que la tabla se escribió aquí, en `juegos/`, y quedó
 * apuntado qué habría que hacer para cerrarlo bien:
 *
 *     `instalarArcade({ manifiesto, avanzar, proyeccion?, loSecreto?, puntuacion? })`
 *     con `puntuacion` OBLIGATORIA de hecho cuando `exigeReejecutabilidad(m)` sea
 *     cierta, comprobada al arrancar por una hermana de `exigirSecretosTapados()`.
 *
 * Eso es exactamente lo que hay ahora, línea por línea: `Puntuacion` vive en
 * `shared/arcade/tipos.ts`, el hueco está en el alta, la tabla es `INSTALADOS` —la
 * de siempre, anclada con `Symbol.for`— y `exigirCifrasLegibles()` la llama el
 * arranque del servidor, junto a `exigirSecretosTapados()`.
 *
 * ═══ POR QUÉ HABÍA QUE MOVERLO Y NO BASTABA CON DEJARLO ═══
 *
 * La tabla llana se defendía así, y merece citarse porque el argumento era bueno y
 * dejó de serlo: «una tabla llana no tiene el problema de la doble carga… el
 * problema de `INSTALADOS` era que las ALTAS se perdían; aquí no hay altas».
 *
 * Cierto mientras fue una constante escrita a mano. La propia fase 5 le añadió un
 * `registrarPuntuacion()` para que el enchufe pudiera darle de alta la cifra a un
 * arcade de FUERA, y con eso sí había altas en tiempo de ejecución: si este módulo
 * se resolvía por dos especificadores distintos —el fallo real que esta casa ya
 * pagó con `shared/juegos/index.ts` y que motivó las dos exenciones de
 * `verify:pureza`—, el arcade de fuera registraba su cifra en una copia y quien la
 * leía miraba la otra. El síntoma no habría sido un error de arranque: habría sido
 * un récord honrado rechazado, en silencio, meses después y sólo en despliegue —
 * justo el falso negativo que `MovimientoRegistrado` describe como «el único sitio
 * donde destruye la confianza en la cifra».
 *
 * ═══ LO QUE SE QUEDA AQUÍ, Y POR QUÉ SÓLO ESTO ═══
 *
 * Leerle la cifra a El Arcade es CONOCIMIENTO DEL JUEGO —hay que saber qué tiene
 * su estado dentro— y por tanto no puede vivir en el núcleo. Se queda aquí, se
 * pasa en el alta de ese juego (`juegos/index.ts`), y `EstadoSinCifra` con ella,
 * porque la lanza esta función y no el motor.
 */
import { EL_ARCADE, puntuacionDelArcade } from './arcade';
import type { EstadoDelArcade } from './arcade';
import type { ArcadeId, Puntuacion } from '../tipos';

/**
 * Un estado que no tiene la forma que este juego esperaba.
 *
 * Lo lanza la función del juego, no el motor, y por eso lleva el arcade dentro:
 * quien lo lea está mirando el registro del servidor con un récord rechazado
 * delante y necesita saber DE QUÉ JUEGO habla, porque en el mismo proceso hay
 * varios.
 */
export class EstadoSinCifra extends Error {
  constructor(public readonly arcade: ArcadeId) {
    super(
      `El estado que ha salido de reejecutar «${arcade}» no tiene la forma que ese juego declara, ` +
        'así que no se le puede leer la cifra. Casi siempre significa que la repetición no es de ' +
        'este juego, o que viene de una versión anterior de sus reglas.',
    );
    this.name = 'EstadoSinCifra';
  }
}

/** ¿Tiene esto la pinta del estado de El Arcade? */
function esEstadoDelArcade(estado: unknown): estado is EstadoDelArcade {
  if (typeof estado !== 'object' || estado === null) return false;
  const quiza = estado as { esquivadas?: unknown; tic?: unknown };
  return typeof quiza.esquivadas === 'number' && typeof quiza.tic === 'number';
}

/**
 * LA CIFRA DE EL ARCADE. Se pasa en su alta, en `juegos/index.ts`.
 *
 * Comprueba la forma antes de leer y LANZA si no cuadra, en vez de devolver cero:
 * un cero silencioso convertiría «esta repetición no es de este juego» en «jugaste
 * y no esquivaste nada», que es la misma clase de mentira que el `manifiestoDe`
 * que devolvía CLUEDO por defecto.
 */
export const laCifraDeElArcade: Puntuacion = (estado: unknown): number => {
  if (!esEstadoDelArcade(estado)) throw new EstadoSinCifra(EL_ARCADE);
  return puntuacionDelArcade(estado);
};
