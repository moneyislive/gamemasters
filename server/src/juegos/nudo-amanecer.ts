/**
 * Cómo termina la noche: el parte del amanecer, quién gana y qué se lleva cada cual.
 *
 * ═══ POR QUÉ EL FINAL SE ESCRIBE Y NO SE CALCULA CADA VEZ ═══
 *
 * El resultado depende del estado en el instante en que quien dirige da el
 * parte, y el estado sigue vivo: una orden que llegue tarde, un margen que
 * alguien gaste después. Sin escribirlo, la respuesta cambiaría después de
 * haberse dicho en voz alta delante de la mesa — que es exactamente lo que un
 * final no puede hacer.
 *
 * Es el mismo patrón que el Sellado de El Misterio de la Momia y el consejo del
 * alba de El Paso de las Sombras: una función PURA que calcula y otra que
 * EJECUTA y deja escrito.
 *
 * ═══ Y POR QUÉ ADEMÁS HAY VEREDICTO ═══
 *
 * `sesion.primeroEnAcertar` significa «quien acertó antes», que es ganar en
 * CLUEDO y no lo es aquí: en esta noche se gana en grupo o no se gana. Sin
 * veredicto propio, el historial de la cuenta de doce personas anotaría que no
 * ganó nadie una noche en la que la estación sacó los seis convoyes. Y eso no
 * se puede arreglar después: la velada ya pasó.
 */
import { registrarCierre } from './cierres';
import { registrarTrofeos } from './trofeos';
import { registrarVeredicto } from './veredictos';
import { entidadesDe } from '../../../shared/juegos';
import { estadoDe, franjasSinDespacho } from './nudo-acciones';
import { tramaDe } from './nudo-trama';
import {
  RETRASO_POR_CONVOY_VARADO,
  RETRASO_POR_FRANJA_PERDIDA,
} from '../../../shared/juegos/nudo-tipos';
import type { EstadoNudo, TramaNudo } from '../../../shared/juegos/nudo-tipos';
import type { TrofeoId } from '../../../shared/live';
import type { LiveSession } from '../../../shared/live';
import type { GameSession } from '../../../shared/types';

/** Lo que da el parte del amanecer, sin escribir nada. */
export interface ParteDelAmanecer {
  cruzaron: number;
  correoPaso: boolean;
  /** Retraso de la noche, ya con lo que cuestan las franjas y los convoyes perdidos. */
  retrasoFinal: number;
  puertoCerrado: boolean;
  ganadores: string[];
  anuncio: string;
}

/**
 * Calcula el parte. PURA: no toca ni la sesión ni el estado.
 *
 * ═══ LAS TRES CUENTAS, Y POR QUÉ SE HACEN AL FINAL Y NO SOBRE LA MARCHA ═══
 *
 * El retraso que se lleva durante la noche es el de las órdenes rechazadas, y
 * ese sí se apunta en el acto: se ve subir y es la tensión de la partida.
 *
 * Las otras dos —lo que cuesta una franja que se cerró sin sacar a nadie y lo
 * que cuesta un convoy que se queda en la vía— se cobran AQUÍ, y no es una
 * comodidad de implementación: mientras la noche dura, una franja perdida
 * todavía se puede compensar y un convoy varado todavía puede salir. Cobrarlas
 * antes sería castigar algo que aún no ha ocurrido, y la mesa vería el
 * marcador moverse por cosas que luego se arreglan.
 */
export function calcularAmanecer(
  game: GameSession,
  sesion: LiveSession,
  trama: TramaNudo,
  estado: EstadoNudo,
): ParteDelAmanecer {
  const convoyes = entidadesDe(game, 'convoyes');
  const total = trama.cuadro.length;
  const cruzaron = estado.despachados;
  const varados = Math.max(0, total - cruzaron);
  const correoPaso = estado.salidos.includes(trama.correo);

  const perdidas = franjasSinDespacho(estado, Math.min(sesion.round, total));
  const retrasoFinal =
    estado.retraso +
    perdidas.length * RETRASO_POR_FRANJA_PERDIDA +
    varados * RETRASO_POR_CONVOY_VARADO;

  const puertoCerrado = retrasoFinal > trama.retrasoMaximo;

  /*
   * SE GANA EN GRUPO Y HACEN FALTA LAS DOS COSAS: que el Correo cruce y que el
   * puerto siga abierto. No son la misma condición y por eso no se pueden
   * juntar: una noche puede sacar los seis convoyes con veinte minutos de
   * retraso —el suero llega tarde y el puerto se ha cerrado— y otra puede
   * cerrar con dos minutos habiendo dejado el Correo en la vía.
   */
  const gana = correoPaso && !puertoCerrado;
  const ganadores = gana ? sesion.players.map((p) => p.participanteId) : [];

  const nombreCorreo = convoyes.find((c) => c.id === trama.correo)?.name ?? 'el Correo';
  const cuenta =
    `${cruzaron} de ${total} convoyes cruzaron. ` +
    `Retraso final: ${retrasoFinal} minuto${retrasoFinal === 1 ? '' : 's'} ` +
    `sobre un tope de ${trama.retrasoMaximo}.`;

  const anuncio = gana
    ? `Amanece sobre Valdehierro y el puerto sigue abierto. ${nombreCorreo} pasó a tiempo y el ` +
      `suero está en el valle antes de que abra el consultorio. ${cuenta} El turno de noche lo ` +
      `sacó adelante.`
    : !correoPaso
      ? `Amanece sobre Valdehierro y ${nombreCorreo} sigue en la vía tres. El suero no ha salido de ` +
        `la estación. ${cuenta}`
      : `Amanece sobre Valdehierro y el puerto se cerró con la nieve antes de que ${nombreCorreo} ` +
        `llegara al valle. ${cuenta} Llegó, y llegó tarde.`;

  return { cruzaron, correoPaso, retrasoFinal, puertoCerrado, ganadores, anuncio };
}

/**
 * Da el parte del amanecer y lo deja escrito. IRREVERSIBLE a propósito.
 *
 * Lo llama la ruta genérica `/live/cierre`, que pregunta al registro si este
 * juego tiene cierre y lo ejecuta dentro de `mutar`. Va dentro del candado y no
 * alrededor porque lee el estado y escribe encima en el mismo acto: si se
 * leyera fuera, dos clics seguidos podrían escribir dos partes distintos.
 *
 * NO SE TRAGA LOS ERRORES, al revés que la proyección y los trofeos: esto
 * decide cómo termina la noche, así que si falla quien dirige tiene que
 * enterarse en el acto y no anunciar un final que no se ha escrito.
 */
registrarCierre('nudo', (game, sesion) => {
  const trama = tramaDe(game.plot);
  if (!trama) throw new Error('Esta partida todavía no tiene cuadro de marchas.');
  const estado = estadoDe(game, sesion);

  if (estado.amanecer) {
    /* Ya se dio. Se devuelve lo escrito en vez de volver a calcularlo. */
    return { anuncio: estado.amanecer.anuncio };
  }

  const parte = calcularAmanecer(game, sesion, trama, estado);
  estado.amanecer = {
    cruzaron: parte.cruzaron,
    correoPaso: parte.correoPaso,
    retrasoFinal: parte.retrasoFinal,
    puertoCerrado: parte.puertoCerrado,
    ganadores: parte.ganadores,
    anuncio: parte.anuncio,
  };
  return { anuncio: parte.anuncio };
});

/**
 * Quiénes ganaron.
 *
 * ═══ SI NO SE HA DADO EL PARTE, SE CALCULA SIN ESCRIBIRLO ═══
 *
 * Quien dirige puede saltarse el botón del amanecer e ir directo al desenlace
 * —es una velada en casa, no un procedimiento— y en ese caso el veredicto tiene
 * que decir la verdad igual. Se calcula con la MISMA función pura, así que las
 * dos puertas dan exactamente el mismo resultado.
 *
 * Se traga sus errores a propósito, igual que el reparto de trofeos: un fallo
 * calculando quién ganó no puede impedir que la partida se guarde en la cuenta
 * de alguien. Lo primero es que quede constancia de que jugó.
 */
registrarVeredicto('nudo', (game, sesion) => {
  const trama = tramaDe(game.plot);
  if (!trama) return undefined;
  const estado = estadoDe(game, sesion);
  if (estado.amanecer) return estado.amanecer.ganadores;
  return calcularAmanecer(game, sesion, trama, estado).ganadores;
});

/**
 * Las medallas de la noche.
 *
 * NINGUNA ES DE CLUEDO. `ganador`, `sabueso` y `culpable-impune` significan
 * cosas que aquí no existen: no hay culpable al que no descubrir ni carrera por
 * acertar. Las cinco de aquí se ganan por lo que de verdad se hace en esta
 * partida — que el Correo pase, que la noche salga limpia, que te sepas el
 * cuadro, que trabajes en los puestos y que lo saques sin comprar información.
 */
registrarTrofeos('nudo', ({ game, sesion, plot, jugador }) => {
  const trama = tramaDe(plot);
  if (!trama) return [];
  const estado = (sesion.estado?.['nudo'] as EstadoNudo | undefined) ?? undefined;
  if (!estado) return [];

  const medallas: TrofeoId[] = [];
  const parte =
    estado.amanecer ?? calcularAmanecer(game, sesion, trama, estado);

  /* El Correo pasó: es de todo el turno, porque la noche se juega en grupo. */
  if (parte.correoPaso) medallas.push('paso-a-nivel');

  /* Noche limpia: los seis fuera y ni un minuto. Se da poquísimas veces. */
  if (parte.cruzaron === trama.cuadro.length && parte.retrasoFinal === 0) {
    medallas.push('noche-sin-retraso');
  }

  /*
   * El cuadro de memoria: tu respuesta individual, entera y correcta. Es lo
   * único de esta lista que NO es del grupo, y por eso está: una noche
   * cooperativa también tiene que poder premiar a quien se enteró de todo.
   */
  const mia = sesion.respuestasEntregadas.find(
    (r) => r.participanteId === jugador.participanteId,
  );
  if (mia?.correcta) medallas.push('cuadro-de-memoria');

  const ficha = estado.gente[jugador.participanteId];
  if ((ficha?.instrumentosResueltos ?? 0) >= 5) medallas.push('mano-en-la-palanca');

  /*
   * De cabeza: sacar la noche sin preguntarle nada al archivo. Solo cuenta si
   * la noche SE SACÓ — si no, no es mérito, es que no llegó a hacer falta.
   */
  if (parte.ganadores.length > 0 && (ficha?.consultas ?? 0) === 0) {
    medallas.push('sin-consultar-archivo');
  }

  return medallas;
});
