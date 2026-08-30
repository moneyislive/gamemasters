/**
 * El panel de partidas de una cuenta: todo lo que has jugado y todo lo que te
 * espera, con su estado.
 *
 * POR QUÉ NO VALÍA `invitacionesPara`. Esa función responde a una pregunta muy
 * concreta —«¿a qué mesas puedo sentarme ahora?»— y por eso descarta las
 * partidas terminadas: una velada acabada no es una invitación. Pero eso deja
 * fuera justo la mitad de lo que hace falta aquí, que es la HISTORIA: cuándo se
 * jugó, cómo acabó y quién ganó.
 *
 * DE DÓNDE SALE CADA COSA, que son dos sitios y hay que juntarlos:
 *
 *   · Las sesiones en vivo (`store.getLive`) son la verdad de lo que existe
 *     ahora: su fase, quién ha reclamado cada silla y el desenlace completo.
 *   · El historial de la cuenta (`cuenta.partidas`) sobrevive a que quien
 *     organiza borre la partida. Sin él, una velada jugada hace meses
 *     desaparecería del panel el día que se limpiara el taller, y la persona
 *     perdería su propia memoria sin haber hecho nada.
 *
 * Se prefiere la sesión viva cuando existe —tiene más datos y están al día— y
 * el historial rellena los huecos.
 *
 * LO QUE NO SALE DE AQUÍ: nada del misterio de una partida en curso. Ni
 * culpable, ni pistas, ni acusaciones ajenas. El desenlace solo se cuenta
 * cuando la partida YA ha terminado, que es cuando deja de ser un secreto.
 */
import { getStore } from '../db/store';
import { normalizarEmail } from '../../../shared/live';
import type { Account, LivePhase, LiveSession } from '../../../shared/live';

/**
 * En qué punto está una velada, dicho para quien juega.
 *
 * Son cuatro y no las seis fases internas: a quien mira su panel no le importa
 * si la ronda está abierta o cerrada — eso es maquinaria de la mesa. Le importa
 * si puede entrar, si tiene que esperar, o si ya pasó.
 */
export type EstadoDePartida =
  /** Sala de espera: quien dirige aún no ha empezado. */
  | 'espera'
  /** En juego ahora mismo. */
  | 'en-curso'
  /** Una campaña entre jornadas: sigue viva, hoy no se juega. */
  | 'pausada'
  /** Terminada, con desenlace revelado. */
  | 'terminada'
  /** Estaba en tu historial y su partida ya no está en el servidor. */
  | 'retirada';

export interface PartidaDelPanel {
  gameId: string;
  titulo: string;
  /** El personaje que te tocó. */
  personaje: string;
  suspectId: string;
  estado: EstadoDePartida;
  /** Cuándo. ISO, para que lo formatee el móvil con su idioma y su zona. */
  cuando?: string;
  /** ¿Se puede entrar ahora mismo sin teclear códigos? */
  puedeEntrar: boolean;
  /** Si no se puede, por qué — en cristiano. */
  motivo?: string;
  /** Solo en las terminadas. Antes sería contar el final. */
  resultado?: {
    ganador?: string;
    /** ¿Ganaste tú? */
    gane: boolean;
    /** ¿Acertaste, aunque no fueras el primero? */
    acerte: boolean;
  };
}

/** La fase interna, traducida a lo que le importa a quien juega. */
function estadoDe(fase: LivePhase): EstadoDePartida {
  if (fase === 'lobby') return 'espera';
  if (fase === 'desenlace') return 'terminada';
  if (fase === 'intermedio') return 'pausada';
  return 'en-curso';
}

/** Los correos que esta cuenta puede reclamar, y con cuánta prueba detrás. */
function correosDe(cuenta: Account): Map<string, boolean> {
  const mapa = new Map<string, boolean>();
  mapa.set(normalizarEmail(cuenta.email), false);
  for (const c of cuenta.correos ?? []) {
    const previo = mapa.get(c.correo) ?? false;
    mapa.set(c.correo, previo || (c.nivel === 'buzon' && !c.esRelay));
  }
  for (const i of cuenta.identidades ?? []) {
    if (!i.correo) continue;
    const correo = normalizarEmail(i.correo);
    mapa.set(correo, (mapa.get(correo) ?? false) || (i.correoVerificado === true && !i.esRelay));
  }
  return mapa;
}

/** Por qué no se puede entrar todavía, dicho sin tecnicismos. */
function motivoDe(estado: EstadoDePartida, verificado: boolean, ajena: boolean): string | undefined {
  if (estado === 'terminada' || estado === 'retirada') return undefined;
  if (ajena) return 'Alguien ya ocupa tu sitio en esta mesa. Habla con quien organiza.';
  if (!verificado) {
    return 'Tu correo no está verificado por Google o Apple, así que hace falta el código.';
  }
  if (estado === 'en-curso' || estado === 'pausada') {
    return 'La partida ya empezó sin ti. Pídele el código a quien organiza.';
  }
  return undefined;
}

/**
 * El desenlace, solo si la partida ya terminó.
 *
 * SE ARMA DESDE LA SESIÓN Y NO DESDE LA VISTA DEL JUGADOR. Hay un `desenlace`
 * ya masticado en `VistaJugador`, pero ese lo compone el servidor para una
 * persona concreta que está DENTRO de la partida, y traerlo aquí obligaría a
 * montar la vista entera de cada velada del historial solo para sacar un
 * nombre. La sesión guarda lo que hace falta: `winnerId` y las acusaciones con
 * su `correcta`, calculada en el servidor.
 *
 * Quién era el culpable NO se saca de aquí: vive en la trama, y traerla
 * significaría cargar la solución de cada partida del panel. Si algún día hace
 * falta, que sea una decisión con su motivo.
 */
function resultadoDe(
  sesion: LiveSession,
  suspectId: string,
): PartidaDelPanel['resultado'] | undefined {
  if (sesion.phase !== 'desenlace') return undefined;
  const mia = sesion.acusaciones.find((a) => a.suspectId === suspectId);

  /*
   * SI EL JUEGO DEJÓ ESCRITO QUIÉN GANÓ, manda eso.
   *
   * Aquí se leía solo `winnerId`, que significa «el primero que acertó la
   * acusación». En un juego de bandos eso no es ganar: una noche en la que la
   * expedición sellaba bien la tumba y nadie llegó a señalar al saqueador salía
   * en esta lista como que no ganó nadie. `revelarDesenlace` guarda `ganadores`
   * preguntándole al juego, y aquí solo hay que leerlo.
   *
   * Con varios ganadores no se nombra a uno: se dice cuántos. Poner el primero de
   * la lista sería inventarse un protagonista donde ganó un bando.
   */
  const ganadores = sesion.ganadores;
  if (ganadores && ganadores.length > 0) {
    const nombres = ganadores
      .map((id) => sesion.players.find((p) => p.suspectId === id)?.displayName)
      .filter((n): n is string => Boolean(n));
    return {
      ganador: nombres.length === 1 ? nombres[0] : `${nombres.length} de los que jugaron`,
      gane: ganadores.includes(suspectId),
      acerte: Boolean(mia?.correcta),
    };
  }

  const ganador = sesion.players.find((p) => p.suspectId === sesion.winnerId);
  return {
    ganador: ganador?.displayName,
    gane: Boolean(sesion.winnerId) && sesion.winnerId === suspectId,
    acerte: Boolean(mia?.correcta),
  };
}

/**
 * Todo lo que esta cuenta ha jugado o tiene por jugar, lo más reciente primero.
 */
export async function panelDe(cuenta: Account): Promise<PartidaDelPanel[]> {
  const mios = correosDe(cuenta);
  const store = getStore();
  const panel: PartidaDelPanel[] = [];
  const vistos = new Set<string>();

  for (const resumen of await store.listGames()) {
    const sesion = await store.getLive(resumen.id);
    if (!sesion) continue;

    for (const jugador of sesion.players) {
      if (!jugador.email) continue;
      const correo = normalizarEmail(jugador.email);
      const verificado = mios.get(correo);
      if (verificado === undefined) continue;

      const estado = estadoDe(sesion.phase);
      const mia = jugador.reclamadaPor?.cuentaId === cuenta.id;
      const ajena = Boolean(jugador.reclamadaPor) && !mia;
      /*
       * La misma regla que `invitacionesPara`, y a propósito: si el panel
       * dijera «puedes entrar» y la puerta luego pidiera el código, el panel
       * estaría mintiendo. Volver a tu propia silla vale siempre; reclamar una
       * libre, solo en la sala de espera y con el correo verificado.
       */
      const puedeEntrar =
        estado !== 'terminada' &&
        (mia || (Boolean(verificado) && sesion.phase === 'lobby' && !jugador.joined));

      vistos.add(sesion.id);
      panel.push({
        gameId: sesion.id,
        titulo: resumen.name,
        personaje: jugador.displayName,
        suspectId: jugador.suspectId,
        estado,
        cuando: sesion.startedAt ?? resumen.updatedAt,
        puedeEntrar,
        motivo: puedeEntrar ? undefined : motivoDe(estado, Boolean(verificado), ajena),
        resultado: resultadoDe(sesion, jugador.suspectId),
      });
    }
  }

  /*
   * Y lo que solo vive ya en el historial de la cuenta: partidas que se jugaron
   * y cuya sesión ha desaparecido del servidor. Se marcan como retiradas en vez
   * de esconderlas — que una velada de hace meses se borre del panel porque
   * quien organiza limpió su taller sería quitarle a esa persona su propia
   * memoria sin que hiciera nada.
   */
  for (const p of cuenta.partidas ?? []) {
    if (vistos.has(p.gameId)) continue;
    panel.push({
      gameId: p.gameId,
      titulo: p.titulo,
      personaje: p.personaje,
      suspectId: '',
      estado: 'retirada',
      cuando: p.jugadaEl,
      puedeEntrar: false,
      resultado: { gane: p.gano, acerte: p.acerto },
    });
  }

  // Lo más reciente arriba: es lo que se busca al abrir.
  return panel.sort((a, b) => (b.cuando ?? '').localeCompare(a.cuando ?? ''));
}
