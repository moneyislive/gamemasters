/**
 * QUÉ NÚMERO PUBLICA CADA ARCADE, LEÍDO DE SU ESTADO OPACO.
 *
 * ═══ ESTE FICHERO ES UN HALLAZGO Y NO UNA PIEZA MÁS, ASÍ QUE VA DELANTE ═══
 *
 * El manifiesto de arcade declara `marcador`, y ese campo dice CÓMO SE LEE el
 * número —«Esquivadas», gana el más alto— y de él se deriva la exigencia de
 * reejecutabilidad. Lo que NO dice, y lo que el núcleo no tiene forma de saber,
 * es CUÁL ES EL NÚMERO: el estado es opaco por diseño, y un servidor que
 * reejecuta una repetición se queda con un `unknown` en la mano y una cifra que
 * el móvil declara al lado.
 *
 * O sea que verificar un marcador exige una función por juego —«dame la cifra de
 * este estado»— y `instalarArcade()` no tiene hueco para ella. Las cuatro cosas
 * que un arcade registra hoy son manifiesto, reductor, proyección y `loSecreto`;
 * la puntuación es la quinta y falta.
 *
 * ESO ES UNA GRIETA DEL CONTRATO Y SE DICE ASÍ. La fase 3 no la puede cerrar
 * porque `shared/arcade/*.ts` es núcleo y esta fase tiene prohibido tocarlo —con
 * razón: el valor de esta arquitectura es precisamente que el núcleo no se toque
 * juego a juego—. Así que la tabla vive aquí, en `juegos/`, que es donde ya viven
 * las altas, y queda escrito qué habría que hacer con ella:
 *
 *     `instalarArcade({ manifiesto, avanzar, proyeccion?, loSecreto?, puntuacion? })`
 *     con `puntuacion` OBLIGATORIA de hecho cuando `exigeReejecutabilidad(m)` sea
 *     cierta, comprobada al arrancar por una hermana de `exigirSecretosTapados()`.
 *
 * ═══ LO QUE SE PIERDE MIENTRAS TANTO, DICHO SIN ADORNOS ═══
 *
 * Tres cosas concretas, y ninguna es teórica:
 *
 *  1. UN ARCADE DE FUERA DEL BINARIO NO PUEDE TENER MARCADOR. El enchufe de la
 *     fase 5 carga manifiesto y reductor desde un fichero; no puede añadir una
 *     fila a una tabla escrita a mano en este repositorio. Hoy no hay ninguno, y
 *     por eso se puede vivir con ello un tiempo.
 *  2. NADIE IMPIDE INSTALAR UN ARCADE CON CIFRA Y SIN FORMA DE LEERLA. El
 *     arranque no falla; falla la verificación del primer récord, o sea más
 *     tarde y delante de alguien que estaba jugando. Con el hueco en el núcleo
 *     sería una negativa ruidosa a arrancar, que es el patrón que este motor usa
 *     para todo lo demás.
 *  3. Y esta tabla puede quedarse vieja EN SILENCIO. Contra eso sí hay defensa
 *     aquí abajo: `arcadesConCifraSinPuntuacion()`, que la llama
 *     `verify:marcador` y no deja pasar un juego con cifra que no esté.
 *
 * ═══ POR QUÉ UNA TABLA LLANA Y NO UN REGISTRO ANCLADO CON `Symbol.for` ═══
 *
 * Porque no hace falta y porque `verify:pureza` prohíbe tocar el ámbito global en
 * `shared/arcade/`, con dos exenciones escritas a mano que existen por un fallo
 * real de doble carga de módulo. Un registro más querría una tercera exención, y
 * eso es exactamente la clase de línea que se añade «solo esta vez».
 *
 * Una tabla llana no tiene el problema de la doble carga: si el módulo se carga
 * dos veces hay dos tablas IDÉNTICAS, porque su contenido está escrito en el
 * fichero y no se llena en tiempo de ejecución. El problema de `INSTALADOS` era
 * que las ALTAS se perdían; aquí no hay altas.
 */
import { EL_ARCADE, puntuacionDelArcade } from './arcade';
import type { EstadoDelArcade } from './arcade';
import { arcadesInstalados, exigeReejecutabilidad } from '../index';
import type { ArcadeId } from '../tipos';

/**
 * Leer una cifra de un estado que no se conoce.
 *
 * Recibe `unknown` y no el estado tipado porque quien llama —el servidor, tras
 * reejecutar una repetición— tiene un `unknown` en la mano: el motor guarda los
 * reductores como `Avanzar<unknown>` porque no puede conocer la forma de un
 * estado que no conoce. La conversión la hace el juego, que es el único que sabe
 * lo que metió, y en un solo sitio.
 */
export type Puntuacion = (estado: unknown) => number;

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
 * LA TABLA. Una fila por arcade que publique una cifra.
 *
 * Los que declaran `{ tipo: 'ninguno' }` no están y no tienen por qué estar: no
 * hay ninguna cifra que nadie tenga que creerse, así que no hay nada que leer.
 * `arcadesConCifraSinPuntuacion()` comprueba justo eso y no lo contrario.
 */
const PUNTUACIONES: Record<ArcadeId, Puntuacion> = {
  [EL_ARCADE]: (estado: unknown): number => {
    if (!esEstadoDelArcade(estado)) throw new EstadoSinCifra(EL_ARCADE);
    return puntuacionDelArcade(estado);
  },
};

/** ¿Sabe alguien leerle la cifra a este arcade? */
export function hayPuntuacion(arcade: ArcadeId): boolean {
  return PUNTUACIONES[arcade] !== undefined;
}

/**
 * La cifra de este estado, según las reglas de este arcade.
 *
 * FALLA si no hay quien la lea, y no devuelve cero. Un cero por defecto sería la
 * lección más cara de este repositorio repetida: `manifiestoDe` devolvía CLUEDO
 * cuando no encontraba el juego, y una partida entera se jugaba con las reglas de
 * otro sin que nada diera un error. Aquí el equivalente sería rechazar todos los
 * récords de un juego —o aceptarlos todos con cero— y que nadie se enterara.
 */
export function puntuacionDe(arcade: ArcadeId, estado: unknown): number {
  const leer = PUNTUACIONES[arcade];
  if (leer === undefined) {
    throw new Error(
      `El arcade «${arcade}» publica una cifra y nadie sabe leérsela: no hay entrada suya en ` +
        '`shared/arcade/juegos/puntuaciones.ts`. Mientras el núcleo no tenga hueco para la ' +
        'puntuación en `instalarArcade`, esa tabla es el sitio; la cabecera del fichero cuenta ' +
        'por qué y qué habría que hacer para cerrarlo bien.',
    );
  }
  return leer(estado);
}

/**
 * Los arcades instalados que publican una cifra y a los que nadie sabe leérsela.
 *
 * ═══ POR QUÉ NO LANZA Y POR QUÉ NO SE LLAMA AL ARRANCAR ═══
 *
 * No lanza por lo mismo que `problemasDelManifiesto`: quien lo llama sabe mejor
 * qué hacer. Y no se engancha al arranque del servidor porque colgar una garantía
 * nueva del arranque desde `juegos/` sería meter una regla de plataforma en la
 * carpeta de los juegos — que es justo lo que este fichero denuncia. Su sitio es
 * el núcleo, y hasta que lo tenga, quien pregunta es `verify:marcador`.
 *
 * O sea que esto NO impide arrancar con la tabla vieja: lo pone rojo en la
 * batería. Es menos que lo que hacen `exigirSecretosTapados()` y
 * `exigirQueAguantenVacio()`, y queda dicho para que nadie lo lea como lo mismo.
 */
export function arcadesConCifraSinPuntuacion(): ArcadeId[] {
  const mal: ArcadeId[] = [];
  for (const m of arcadesInstalados()) {
    if (!exigeReejecutabilidad(m)) continue;
    if (!hayPuntuacion(m.id)) mal.push(m.id);
  }
  return mal;
}
