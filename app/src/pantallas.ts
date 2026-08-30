/**
 * Qué pantalla enseña cada juego donde la plataforma trae una genérica.
 *
 * ═══ EL PROBLEMA QUE RESUELVE ═══
 *
 * Hay dos pantallas —«donde se juega» y «el final»— que todos los juegos
 * necesitan y que ninguno puede compartir de verdad. La de CLUEDO está
 * construida sobre lo único que la plataforma sabe: se entra en una sala, se
 * ven pistas, y al final alguien acertó quién, con qué y dónde. El Misterio de
 * la Momia no acaba así —puede ganar la expedición entera— y El Paso de las
 * Sombras tampoco: allí se puede perder habiendo acertado la senda.
 *
 * Cada uno escribió la suya, y el desvío se hacía con un `if` dentro de la
 * pantalla común:
 *
 *     if (vista?.sesion.juego === 'momia') return <Vigilia />;
 *     if (vista?.sesion.juego === 'sombras') return <Hora />;
 *
 * Dos `if` por pantalla y dos pantallas: cuatro sitios donde un juego nuevo
 * tiene que acordarse de entrar, repartidos por ficheros que hablan de otra
 * cosa. Y el fallo de olvidarse es de los caros y de los mudos: la pestaña
 * «donde se juega» pinta la ronda de CLUEDO —elegir sala, ver pistas, acusar— y
 * la partida se juega como CLUEDO desde el móvil aunque el taller, la barra y
 * los colores sean del juego nuevo. Nadie ve un error.
 *
 * ═══ POR QUÉ UNA TABLA Y NO UN REGISTRO EN EJECUCIÓN ═══
 *
 * Porque la app es un binario y las pantallas están compiladas dentro: no hay
 * nada que registrar en arranque que no se pueda saber al compilar. Y porque una
 * tabla se lee entera de un vistazo, que es exactamente lo que no se podía hacer
 * con los `if` repartidos.
 *
 * ═══ CÓMO ENTRA UN JUEGO NUEVO ═══
 *
 * Una línea aquí. Si no la pone, se lleva la pantalla genérica —que es lo
 * correcto para un juego que sí se parezca a CLUEDO— y si la pone, la suya.
 * Ningún juego puede cambiarle la pantalla a otro.
 */
import type { ComponentType } from 'react';
import { Cuaderno } from './cluedo/cuaderno';
import { Hechos } from './cluedo/hechos';
import { PistasDeLaRonda } from './cluedo/pistas';
import { Vigilia } from './momia/vigilia';
import { Amanecer } from './momia/amanecer';
import { Hora } from './sombras/hora';
import { Alba } from './sombras/alba';
import type { JuegoId } from '../../shared/juegos';

/**
 * Las pantallas que un juego puede sustituir por una propia.
 *
 * NO son todas las de la app. Las demás —el mapa, el perfil, la entrada— son
 * plataforma: enseñan cosas que significan lo mismo en cualquier juego. Estas
 * son las únicas cuyo CONTENIDO es la mecánica.
 *
 * ═══ `cuaderno` Y `hechos` ENTRARON DESPUÉS, Y ES INSTRUCTIVO POR QUÉ ═══
 *
 * No estaban aquí porque no hacía falta: sus ficheros vivían directamente en
 * `app/(juego)/`, o sea entre las pantallas de la plataforma, y pintaban
 * campos que la plataforma mandaba a todo el mundo —`misHallazgos`, `hechos`—
 * aunque solo signifiquen algo en CLUEDO.
 *
 * Nadie veía un error porque la barra de cada juego decide qué pestañas
 * enseñar, y ni la Momia ni las Sombras enseñan estas dos. O sea: funcionaba
 * porque los otros dos juegos se apartaban. El día que uno declarase una
 * pestaña llamada `cuaderno` se llevaría la de CLUEDO entera, con sus pistas y
 * su prosa de misterio, sin un solo aviso.
 */
export type PantallaSustituible = 'ronda' | 'desenlace' | 'cuaderno' | 'hechos';

export const PANTALLAS_DE_JUEGO: Record<
  JuegoId,
  Partial<Record<PantallaSustituible, ComponentType>>
> = {
  cluedo: { cuaderno: Cuaderno, hechos: Hechos },
  momia: { ronda: Vigilia, desenlace: Amanecer },
  sombras: { ronda: Hora, desenlace: Alba },
};

/**
 * Los TROZOS que un juego añade a una pantalla de la plataforma sin sustituirla.
 *
 * ═══ POR QUÉ HACEN FALTA LAS DOS COSAS ═══
 *
 * Sustituir una pantalla entera vale cuando la mecánica es otra: la Vigilia de
 * la Momia no se parece en nada a una ronda de CLUEDO. Pero a veces lo que
 * cambia es un bloque, y sustituir la pantalla entera obligaría a copiar las
 * doscientas líneas que sí son iguales —elegir sitio, avisar de que estás
 * listo, el panel de acciones— para cambiar veinte.
 *
 * El caso concreto: la ronda genérica llevaba dentro «Lo que encuentras aquí»,
 * la lista de pistas de tu sala. Es de CLUEDO y de nadie más, y estaba en la
 * pantalla que se lleva cualquier juego que no declare la suya. Un juego nuevo
 * que se pareciera a CLUEDO en lo demás heredaba un bloque de pistas que no
 * podía llenar.
 *
 * Es la misma idea que `VistaJugador.estadoDelJuego` en el servidor: la
 * plataforma deja un hueco declarado y el juego lo llena. Aquí el hueco es de
 * pantalla en vez de datos.
 */
export type HuecoDeJuego = 'ronda';

export const BLOQUES_DE_JUEGO: Record<
  JuegoId,
  Partial<Record<HuecoDeJuego, ComponentType>>
> = {
  cluedo: { ronda: PistasDeLaRonda },
};

/** El trozo que este juego añade a esta pantalla, si añade alguno. */
export function bloqueDe(
  juego: JuegoId | undefined,
  hueco: HuecoDeJuego,
): ComponentType | undefined {
  return BLOQUES_DE_JUEGO[juego ?? '']?.[hueco];
}

/**
 * La pantalla propia de este juego, si la tiene.
 *
 * Devuelve `undefined` para CLUEDO y para cualquier juego que no declare la
 * suya, y entonces manda la genérica. Es la misma forma que tiene el resto de la
 * app de preguntar por lo propio de un juego: tabla y respaldo, nunca ternario.
 */
export function pantallaDe(
  juego: JuegoId | undefined,
  cual: PantallaSustituible,
): ComponentType | undefined {
  return PANTALLAS_DE_JUEGO[juego ?? '']?.[cual];
}
