/**
 * El Sellado: la mesa ejecuta un solo orden y de ahí sale quién gana.
 *
 * ES DONDE LA MOMIA SE SEPARA DE CLUEDO DEL TODO. En una acusación cada cual
 * responde por su cuenta y gana quien acierta antes; aquí se ejecuta UNA
 * propuesta —la más votada— y de ella depende que gane un bando entero o una
 * sola persona. No es una fase de acusación con otro nombre.
 *
 * LAS REGLAS, y por qué cada una:
 *
 *   · Las propuestas de quien está TOCADO no cuentan. No se le echa de la mesa
 *     —eso es veneno en un juego de salón, quien queda fuera se aburre una hora—
 *     lo que pierde es voz. Sigue jugando y sigue pudiendo señalar.
 *   · Gana la más votada. Empate, la entregada antes: premia mojarse pronto, que
 *     es lo contrario de esperar a ver por dónde va la mesa.
 *   · Sin ninguna propuesta válida, la tumba no se sella y amanece abierta. No es
 *     un caso raro que haya que tapar: es lo que pasa si la maldición ha tocado a
 *     todo el mundo, y entonces el saqueador ha ganado por la vía difícil.
 *
 * SE PUEDE RESOLVER SIN HABER PASADO POR LA FASE `sellado`, y es a propósito.
 * El diseño (§6.1) exige que quien dirige pueda cerrar la noche desde una
 * vigilia cerrada si se ha alargado. Como se puede proponer orden durante las
 * vigilias, cuando eso pasa YA HAY veredicto de la mesa, y contarlo es más justo
 * que dar la noche por perdida. Por eso `selladoDe` calcula sin tocar nada y
 * `ejecutarSellado` es quien escribe.
 */
import { estadoDe, esElSaqueador } from './momia-acciones';
import { registrarTrofeos } from './trofeos';
import { registrarCierre } from './cierres';
import { AMULETOS_INICIALES } from '../../../shared/juegos/momia-tipos';
import { EJE_SAQUEADOR } from './momia-trama';
import type { EstadoMomia, RitoId } from '../../../shared/juegos/momia-tipos';
import type { TrofeoId } from '../../../shared/live';
import type { GameSession } from '../../../shared/types';
import type { LiveSession } from '../../../shared/live';

/** Un orden propuesto y quién lo respalda. */
export interface Voto {
  orden: RitoId[];
  apoyos: string[];
  /** La más temprana de sus entregas. Es la que desempata. */
  at: string;
}

export interface ResultadoSellado {
  /** El que la mesa ejecuta. Vacío si nadie llegó a proponer nada. */
  ordenEjecutado: RitoId[];
  correcto: boolean;
  votos: Voto[];
  /** `expedicion` o `saqueador`. Un BANDO, no una persona. */
  gana: 'expedicion' | 'saqueador';
  saqueadorId: string;
  /** Quiénes ganan, por id. Es lo que `winnerId` no sabe decir. */
  ganadores: string[];
  /** Propuestas que no contaron porque quien las hizo estaba tocado. */
  silenciadas: string[];
  at: string;
}

/** Las propuestas agrupadas por orden, ya sin las de quien está tocado. */
function contarVotos(estado: EstadoMomia): { votos: Voto[]; silenciadas: string[] } {
  const silenciadas: string[] = [];
  const porOrden = new Map<string, Voto>();

  for (const [suspectId, propuesta] of Object.entries(estado.propuestas)) {
    if (estado.gente[suspectId]?.tocado) {
      silenciadas.push(suspectId);
      continue;
    }
    const clave = propuesta.orden.join('|');
    const ya = porOrden.get(clave);
    if (ya) {
      ya.apoyos.push(suspectId);
      // La hora del voto es la de la PRIMERA entrega de ese orden: si empata en
      // apoyos con otro, gana el que se propuso antes, no el que sumó su último
      // apoyo antes.
      if (propuesta.at < ya.at) ya.at = propuesta.at;
    } else {
      porOrden.set(clave, { orden: [...propuesta.orden], apoyos: [suspectId], at: propuesta.at });
    }
  }

  const votos = [...porOrden.values()].sort((a, b) => {
    if (a.apoyos.length !== b.apoyos.length) return b.apoyos.length - a.apoyos.length;
    return a.at.localeCompare(b.at);
  });
  return { votos, silenciadas };
}

/**
 * Resuelve el sellado SIN tocar nada.
 *
 * Es una función pura de propósito: la proyección del desenlace la llama para
 * enseñar el resultado, y una proyección que mutase la partida sería una bomba
 * de relojería —la vista se compone en cada petición, así que escribiría una vez
 * por refresco de cada móvil—.
 */
export function resolverSellado(
  estado: EstadoMomia,
  saqueadorId: string,
  todos: string[],
  ahora: string,
): ResultadoSellado {
  const { votos, silenciadas } = contarVotos(estado);
  const ganadora = votos[0];
  const ordenEjecutado = ganadora?.orden ?? [];
  const correcto =
    ordenEjecutado.length > 0 && ordenEjecutado.join('|') === estado.ordenVerdadero.join('|');

  const gana = correcto ? 'expedicion' : 'saqueador';
  const ganadores = correcto ? todos.filter((id) => id !== saqueadorId) : [saqueadorId];

  return { ordenEjecutado, correcto, votos, gana, saqueadorId, ganadores, silenciadas, at: ahora };
}

/** El sellado de esta partida: el que se ejecutó, o el que saldría si se ejecutara. */
export function selladoDe(game: GameSession, sesion: LiveSession): ResultadoSellado {
  const estado = estadoDe(game, sesion);
  const saqueadorId = game.plot?.solution.respuestas[EJE_SAQUEADOR] ?? '';
  const todos = sesion.players.map((p) => p.suspectId);

  const guardado = estado.sellado;
  if (guardado) {
    // Lo guardado manda: si la mesa lo ejecutó, el resultado ya no cambia porque
    // alguien entregue otra propuesta después.
    const gana = guardado.correcto ? 'expedicion' : 'saqueador';
    return {
      ordenEjecutado: guardado.ordenEjecutado,
      correcto: guardado.correcto,
      votos: guardado.votos.map((v) => ({ ...v, at: guardado.at })),
      gana,
      saqueadorId,
      ganadores: guardado.correcto ? todos.filter((id) => id !== saqueadorId) : [saqueadorId],
      silenciadas: Object.keys(estado.propuestas).filter((id) => estado.gente[id]?.tocado),
      at: guardado.at,
    };
  }
  return resolverSellado(estado, saqueadorId, todos, new Date().toISOString());
}

/**
 * Ejecuta el ritual y lo deja escrito.
 *
 * A partir de aquí el resultado ya no depende de que nadie entregue otra
 * propuesta: la tumba se selló o no se selló, y eso no se deshace.
 */
export function ejecutarSellado(game: GameSession, sesion: LiveSession): ResultadoSellado {
  const estado = estadoDe(game, sesion);
  const resultado = selladoDe(game, sesion);
  estado.sellado = {
    ordenEjecutado: resultado.ordenEjecutado,
    correcto: resultado.correcto,
    votos: resultado.votos.map((v) => ({ orden: v.orden, apoyos: v.apoyos })),
    at: resultado.at,
  };
  return resultado;
}

// ---------------------------------------------------------------------------
// Los trofeos
// ---------------------------------------------------------------------------

/**
 * Qué se ha ganado esta noche, por persona.
 *
 * NINGUNO PREMIA «ACERTAR ANTES», que es lo único que premia CLUEDO. Premian
 * haber sellado, haber desenmascarado, haber salido limpio y haber dado lo que
 * tenías. El último premia ganar siendo el traidor: sin él, ser el saqueador
 * sería un castigo y nadie querría serlo.
 *
 * LOS REPARTE EL GANCHO DEL FINAL DEL FICHERO, y merece la pena saber de dónde
 * salen los datos de cada uno: ninguno se puede deducir de lo que la plataforma
 * sabe al cerrar una partida. «La Sombra» se gana PERDIENDO, y «Mano Abierta»
 * mirando un contador de amuletos que solo existe en `EstadoMomia`. Por eso el
 * gancho por juego hacía falta y no bastaba con renombrar los de CLUEDO.
 */
export function trofeosDe(
  game: GameSession,
  sesion: LiveSession,
  resultado: ResultadoSellado,
): Record<string, TrofeoId[]> {
  const estado = estadoDe(game, sesion);
  const salida: Record<string, TrofeoId[]> = {};

  for (const jugador of sesion.players) {
    const id = jugador.suspectId;
    const persona = estado.gente[id];
    const suyos: TrofeoId[] = [];

    // El Sellador: tu orden fue el ejecutado y era el correcto.
    if (resultado.correcto && resultado.votos[0]?.apoyos.includes(id)) suyos.push('sellador');

    // Ojo de Horus: señalaste al saqueador y acertaste. Se lee de la acusación
    // que ya guarda la plataforma, que es donde `senalar` la deja.
    const suSenalamiento = sesion.acusaciones.find((a) => a.suspectId === id);
    if (suSenalamiento?.correcta && !esElSaqueador(game, id)) suyos.push('ojo-de-horus');

    // Incorrupto: amaneciste sin una sola marca.
    if (persona && persona.marcas === 0) suyos.push('incorrupto');

    // Mano Abierta: diste tus dos amuletos. Ninguno fue para ti, porque no se
    // puede: la regla lo impide en el reductor.
    if (persona && persona.amuletos === 0 && AMULETOS_INICIALES > 0) suyos.push('mano-abierta');

    // La Sombra: eras el saqueador y amaneció con la tumba abierta.
    if (esElSaqueador(game, id) && resultado.gana === 'saqueador') suyos.push('sombra');

    salida[id] = suyos;
  }
  return salida;
}

/**
 * El gancho por el que la plataforma pide los trofeos de este juego.
 *
 * Se registra desde aquí y no desde los reductores porque es aquí donde vive lo
 * que hay que mirar para concederlos. `live/cuentas.ts` sigue concediendo los
 * seis de CLUEDO como siempre y estos se añaden encima: nada de lo que ya
 * funcionaba cambia de comportamiento.
 *
 * Se recalcula el sellado en cada llamada —una por persona— en vez de guardarlo.
 * Son cuatro o doce llamadas UNA VEZ, al cerrar la partida, sobre 120
 * permutaciones: el ahorro no se notaría y la caché sí, el día que alguien la
 * dejara sin invalidar.
 */
registrarTrofeos('momia', (cierre) => {
  const resultado = selladoDe(cierre.game, cierre.sesion);
  return trofeosDe(cierre.game, cierre.sesion, resultado)[cierre.jugador.suspectId] ?? [];
});

/**
 * El gancho por el que quien dirige ejecuta el ritual.
 *
 * QUE ESTO EXISTA ES LA DIFERENCIA ENTRE UN VEREDICTO Y UNA OPINIÓN. Hasta que
 * se ejecuta, `selladoDe` recalcula el resultado en cada lectura sobre las
 * propuestas que haya en ese momento, así que una entregada tarde —o un
 * `ofrendar` que deja tocado a quien iba ganando— podía volcar un final ya
 * anunciado en voz alta. `ejecutarSellado` lo escribe, y a partir de ahí la
 * misma función devuelve lo escrito y deja de recalcular.
 *
 * El anuncio no dice quién gana. Lo que la mesa oye es que el ritual se ha
 * ejecutado; quién ganó se sabe al amanecer, en el desenlace.
 */
registrarCierre('momia', (game, sesion) => {
  const resultado = ejecutarSellado(game, sesion);
  return {
    anuncio: resultado.correcto
      ? 'El ritual se ha ejecutado. La tumba responde.'
      : 'El ritual se ha ejecutado. Algo ha salido mal.',
  };
});
