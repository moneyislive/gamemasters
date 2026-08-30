/**
 * El consejo del alba: la mesa anda una sola senda y de ahí sale quién gana.
 *
 * ES DONDE ESTE JUEGO SE SEPARA DE CLUEDO DEL TODO, igual que el Sellado en la
 * Momia. En una acusación cada cual responde por su cuenta y gana quien acierta
 * antes; aquí se ANDA una propuesta —la más apoyada— y de ella depende que gane
 * un bando entero o una sola persona.
 *
 * Y se separa también de la Momia, en algo que parece un detalle y cambia la
 * noche entera: **allí los votos se contaban a cabeza, aquí se pesan**. Tu voto
 * vale uno más por cada prenda que te hayan dado, así que convencer a la mesa no
 * es una forma de hablar: es la mecánica. Quien pasa la noche mereciendo la
 * confianza de los demás decide el camino, y el kanchō que la merece también.
 *
 * LAS REGLAS, y por qué cada una:
 *
 *   · El voto pesa `1 + prendas recibidas`. Con tope de dos, nadie vale más de
 *     tres: se nota, y no manda.
 *   · Si la MAYORÍA de los señalamientos acierta con el kanchō, su voto pasa a
 *     valer cero. Desenmascararlo no es solo un trofeo: es quitarle la mano del
 *     timón, y es lo que hace que valga la pena señalar pronto y en voz alta.
 *   · Gana la más apoyada. Empate, la entregada antes: premia mojarse pronto,
 *     que es lo contrario de esperar a ver por dónde va la mesa.
 *   · Sin ninguna propuesta, no se anda nada y amanece. No es un caso raro que
 *     haya que tapar: es lo que pasa si la mesa no se pone de acuerdo, y
 *     entonces el kanchō ha ganado por la vía difícil.
 *   · Y por encima de todo: **si el rastro llegó a su tope, la columna está
 *     interceptada** y da igual lo bien que se ande. Es el único final que no
 *     depende de acertar, y existe para que el peligro no sea decorativo.
 *
 * SE PUEDE RESOLVER SIN HABER PASADO POR LA FASE `acusaciones`, y es a
 * propósito. El diseño exige que quien dirige pueda cerrar la noche desde una
 * hora cerrada si se ha alargado. Como se puede proponer senda durante las
 * horas, cuando eso pasa YA HAY veredicto de la mesa, y contarlo es más justo
 * que dar la noche por perdida. Por eso `consejoDe` calcula sin tocar nada y
 * `ejecutarConsejo` es quien escribe.
 */
import { estadoDe, esElKancho } from './sombras-acciones';
import { registrarTrofeos } from './trofeos';
import { registrarCierre } from './cierres';
import { EJE_KANCHO } from './sombras-trama';
import { PRENDAS_INICIALES } from '../../../shared/juegos/sombras-tipos';
import type { EstadoSombras, PasoId } from '../../../shared/juegos/sombras-tipos';
import type { TrofeoId } from '../../../shared/live';
import type { GameSession } from '../../../shared/types';
import type { LiveSession } from '../../../shared/live';
import { registrarVeredicto } from './veredictos';

/** Una senda propuesta, quién la respalda y cuánto pesa ese respaldo. */
export interface Voto {
  senda: PasoId[];
  apoyos: string[];
  /** La suma de `1 + prendas recibidas` de cada apoyo. */
  peso: number;
  /** La más temprana de sus entregas. Es la que desempata. */
  at: string;
}

export interface ResultadoDelConsejo {
  /** La que la mesa anda. Vacía si nadie llegó a proponer nada. */
  sendaAndada: PasoId[];
  correcta: boolean;
  /** El rastro llegó al tope: por bien que se ande, no se embarca. */
  interceptada: boolean;
  votos: Voto[];
  /** `columna` o `kancho`. Un BANDO, no una persona. */
  gana: 'columna' | 'kancho';
  kanchoId: string;
  /** Quiénes ganan, por id. Es lo que `winnerId` no sabe decir. */
  ganadores: string[];
  /** ¿Desenmascaró la mesa al kanchō por mayoría? */
  desenmascarado: boolean;
  /** Cuántos señalamientos apuntaron bien, de cuántos hubo. */
  senalamientos: { aciertos: number; total: number };
  rastro: number;
  rastroMaximo: number;
  at: string;
}

/** Lo que pesa el voto de una persona. */
function pesoDe(estado: EstadoSombras, participanteId: string, anulado: boolean): number {
  if (anulado) return 0;
  return 1 + (estado.gente[participanteId]?.prendasRecibidas ?? 0);
}

/** Las propuestas agrupadas por senda, ya pesadas. */
function contarVotos(estado: EstadoSombras, anulado: string | undefined): Voto[] {
  const porSenda = new Map<string, Voto>();

  for (const [participanteId, propuesta] of Object.entries(estado.propuestas)) {
    const peso = pesoDe(estado, participanteId, participanteId === anulado);
    const clave = propuesta.senda.join('|');
    const ya = porSenda.get(clave);
    if (ya) {
      ya.apoyos.push(participanteId);
      ya.peso += peso;
      /*
       * La hora del voto es la de la PRIMERA entrega de esa senda: si empata en
       * peso con otra, gana la que se propuso antes, no la que sumó su último
       * apoyo antes.
       */
      if (propuesta.at < ya.at) ya.at = propuesta.at;
    } else {
      porSenda.set(clave, {
        senda: [...propuesta.senda],
        apoyos: [participanteId],
        peso,
        at: propuesta.at,
      });
    }
  }

  return [...porSenda.values()].sort((a, b) => {
    if (a.peso !== b.peso) return b.peso - a.peso;
    return a.at.localeCompare(b.at);
  });
}

/**
 * Resuelve el consejo SIN tocar nada.
 *
 * Es una función pura a propósito: la proyección del desenlace la llama para
 * enseñar el resultado, y una proyección que mutase la partida sería una bomba
 * de relojería —la vista se compone en cada petición, así que escribiría una vez
 * por refresco de cada móvil—.
 */
export function resolverConsejo(
  estado: EstadoSombras,
  kanchoId: string,
  todos: string[],
  senalamientos: { aciertos: number; total: number },
  ahora: string,
): ResultadoDelConsejo {
  /*
   * MAYORÍA ESTRICTA de los señalamientos entregados, no de la mesa entera.
   * Contar sobre la mesa entera castigaría a quien señala por que otros no lo
   * hagan, y señalar es voluntario: quien se calla no debe poder salvar al
   * kanchō sin mojarse.
   */
  const desenmascarado =
    senalamientos.total > 0 && senalamientos.aciertos * 2 > senalamientos.total;

  const votos = contarVotos(estado, desenmascarado ? kanchoId : undefined);
  const ganadora = votos.find((v) => v.peso > 0) ?? votos[0];
  const sendaAndada = ganadora?.senda ?? [];
  const correcta =
    sendaAndada.length > 0 && sendaAndada.join('|') === estado.sendaVerdadera.join('|');

  const interceptada = estado.rastro >= estado.rastroMaximo;
  const embarca = correcta && !interceptada;

  const gana = embarca ? 'columna' : 'kancho';
  const ganadores = embarca ? todos.filter((id) => id !== kanchoId) : [kanchoId];

  return {
    sendaAndada,
    correcta,
    interceptada,
    votos,
    gana,
    kanchoId,
    ganadores,
    desenmascarado,
    senalamientos,
    rastro: estado.rastro,
    rastroMaximo: estado.rastroMaximo,
    at: ahora,
  };
}

/** Cuántos señalamientos apuntaron al kanchō, de cuántos se entregaron. */
function contarSenalamientos(
  sesion: LiveSession,
  kanchoId: string,
): { aciertos: number; total: number } {
  const entregados = sesion.respuestasEntregadas.filter((a) => a.respuestas[EJE_KANCHO]);
  return {
    aciertos: entregados.filter((a) => a.respuestas[EJE_KANCHO] === kanchoId).length,
    total: entregados.length,
  };
}

/** El consejo de esta partida: el que se celebró, o el que saldría si se celebrara. */
export function consejoDe(game: GameSession, sesion: LiveSession): ResultadoDelConsejo {
  const estado = estadoDe(game, sesion);
  const kanchoId = game.plot?.solution.respuestas[EJE_KANCHO] ?? '';
  const todos = sesion.players.map((p) => p.participanteId);
  const senalamientos = contarSenalamientos(sesion, kanchoId);

  const guardado = estado.consejo;
  if (guardado) {
    /*
     * Lo guardado manda: si la mesa ya anduvo, el resultado no cambia porque
     * alguien entregue otra propuesta después o porque el rastro se mueva.
     */
    const embarca = guardado.correcta && !guardado.interceptada;
    return {
      sendaAndada: guardado.sendaAndada,
      correcta: guardado.correcta,
      interceptada: guardado.interceptada,
      votos: guardado.votos.map((v) => ({ ...v, at: guardado.at })),
      gana: embarca ? 'columna' : 'kancho',
      kanchoId,
      ganadores: embarca ? todos.filter((id) => id !== kanchoId) : [kanchoId],
      desenmascarado: senalamientos.total > 0 && senalamientos.aciertos * 2 > senalamientos.total,
      senalamientos,
      rastro: estado.rastro,
      rastroMaximo: estado.rastroMaximo,
      at: guardado.at,
    };
  }
  return resolverConsejo(estado, kanchoId, todos, senalamientos, new Date().toISOString());
}

/**
 * Se echa a andar, y queda escrito.
 *
 * A partir de aquí el resultado ya no depende de que nadie entregue otra
 * propuesta ni de que el rastro suba: se llegó a la barca o no se llegó, y eso
 * no se deshace.
 */
export function ejecutarConsejo(game: GameSession, sesion: LiveSession): ResultadoDelConsejo {
  const estado = estadoDe(game, sesion);
  const resultado = consejoDe(game, sesion);
  estado.consejo = {
    sendaAndada: resultado.sendaAndada,
    correcta: resultado.correcta,
    interceptada: resultado.interceptada,
    votos: resultado.votos.map((v) => ({ senda: v.senda, apoyos: v.apoyos, peso: v.peso })),
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
 * haber trazado el camino, haber desenmascarado, haber cruzado sin que te vieran
 * y haber dado tu palabra. El último premia ganar siendo el traidor: sin él, ser
 * el kanchō sería un castigo y nadie querría serlo.
 *
 * Ninguno se puede deducir de lo que la plataforma sabe al cerrar una partida:
 * «Sin rastro» mira un contador que solo existe en `EstadoSombras` y «La sombra
 * de Akechi» se gana PERDIENDO. Por eso el gancho por juego hacía falta y no
 * bastaba con renombrar los de CLUEDO.
 */
export function trofeosDe(
  game: GameSession,
  sesion: LiveSession,
  resultado: ResultadoDelConsejo,
): Record<string, TrofeoId[]> {
  const estado = estadoDe(game, sesion);
  const salida: Record<string, TrofeoId[]> = {};

  for (const jugador of sesion.players) {
    const id = jugador.participanteId;
    const persona = estado.gente[id];
    const suyos: TrofeoId[] = [];

    /*
     * El que abrió el paso: la senda andada era la tuya y era la buena.
     *
     * SE CONCEDE AUNQUE LA COLUMNA FUERA INTERCEPTADA, y es deliberado: el
     * trofeo premia haber trazado el camino, y trazarlo bien es mérito tuyo
     * aunque el rastro lo estropeara todo. Es de los pocos consuelos que tiene
     * una noche perdida por dos pisadas de más.
     */
    if (resultado.correcta && resultado.votos[0]?.apoyos.includes(id)) suyos.push('paso-abierto');

    // El ojo de Hanzō: señalaste al kanchō y acertaste. Se lee de la acusación
    // que ya guarda la plataforma, que es donde `senalar` la deja.
    const suSenalamiento = sesion.respuestasEntregadas.find((a) => a.participanteId === id);
    if (suSenalamiento?.correcta && !esElKancho(game, id)) suyos.push('ojo-de-hanzo');

    // Sin rastro: cruzaste sin pisar una sola vez donde estaban los cazadores.
    if (persona && persona.pisadas === 0) suyos.push('sin-rastro');

    // Palabra dada: diste tus dos prendas. Ninguna fue para ti, porque no se
    // puede: la regla lo impide en el reductor.
    if (persona && persona.prendas === 0 && PRENDAS_INICIALES > 0) suyos.push('palabra-dada');

    // La sombra de Akechi: cobrabas de él y amaneció sin barca.
    if (esElKancho(game, id) && resultado.gana === 'kancho') suyos.push('sombra-de-akechi');

    salida[id] = suyos;
  }
  return salida;
}

/**
 * El gancho por el que la plataforma pide los trofeos de este juego.
 *
 * Se recalcula el consejo en cada llamada —una por persona— en vez de guardarlo.
 * Son cuatro o doce llamadas UNA VEZ, al cerrar la partida: el ahorro no se
 * notaría y la caché sí, el día que alguien la dejara sin invalidar.
 */
registrarTrofeos('sombras', (cierre) => {
  const resultado = consejoDe(cierre.game, cierre.sesion);
  return trofeosDe(cierre.game, cierre.sesion, resultado)[cierre.jugador.participanteId] ?? [];
});

/**
 * El gancho por el que quien dirige echa a andar.
 *
 * QUE ESTO EXISTA ES LA DIFERENCIA ENTRE UN VEREDICTO Y UNA OPINIÓN. Hasta que
 * se ejecuta, `consejoDe` recalcula el resultado en cada lectura sobre las
 * propuestas y el rastro que haya en ese momento, así que una propuesta
 * entregada tarde —o una pisada de más— podía volcar un final ya anunciado en
 * voz alta. `ejecutarConsejo` lo escribe, y a partir de ahí la misma función
 * devuelve lo escrito y deja de recalcular.
 *
 * El anuncio no dice quién gana. Lo que la mesa oye es que la columna ha echado
 * a andar; si se llegó a la barca se sabe al amanecer, en el desenlace.
 */
registrarCierre('sombras', (game, sesion) => {
  const resultado = ejecutarConsejo(game, sesion);
  return {
    anuncio:
      resultado.sendaAndada.length === 0
        ? 'Nadie ha propuesto un camino. La columna se queda quieta y empieza a clarear.'
        : 'La columna echa a andar. Cuatro pasos y una barca esperando, o no.',
  };
});

/*
 * EL VEREDICTO, por lo mismo que en la Momia. Aquí además hay un caso que
 * `winnerId` no puede representar de ninguna manera: se puede PERDER habiendo
 * acertado la senda, si el rastro llegó al tope. Gana un bando, y a veces el
 * bando que acertó no es el que gana.
 */
registrarVeredicto('sombras', (game, sesion) => {
  const resultado = consejoDe(game, sesion);
  return resultado.sendaAndada.length > 0 ? resultado.ganadores : undefined;
});
