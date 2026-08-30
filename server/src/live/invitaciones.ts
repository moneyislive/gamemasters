/**
 * Las invitaciones que te esperan.
 *
 * SE DERIVAN, NO SE GUARDAN. No hay tabla de invitaciones ni nada que
 * sincronizar: una invitación es, sencillamente, que exista una silla con tu
 * correo en la sesión en vivo de alguna partida. Guardarlas aparte crearía dos
 * verdades que se separan en cuanto quien organiza cambie a alguien de sitio, y
 * la que se enseñaría sería la equivocada.
 *
 * QUÉ SALE DE AQUÍ HACIA UN MÓVIL, Y QUÉ NO. Sale el título de la partida, el
 * nombre del personaje y la fase. NO sale —nunca— el código personal ni el
 * código de la partida: ese es el factor de acceso, y una lista de invitaciones
 * que lo incluyera convertiría cualquier fallo de casado en una entrada libre a
 * la velada de otro. Hay una comprobación que busca la cadena del código en el
 * JSON entero de la respuesta, precisamente para que esto no se rompa por
 * descuido.
 *
 * DOS NIVELES, DOS COSAS DISTINTAS:
 *
 *   - Que la invitación se VEA basta con que el correo esté en la cuenta. Y
 *     estar ahí ya cuesta algo: hoy un correo entra en una cuenta cuando
 *     alguien, con el código personal en la mano, acepta guardar sus partidas.
 *     Es decir, ya demostró tener acceso a una velada con ese correo.
 *   - Que se pueda ENTRAR DE UN TOQUE, sin teclear el código, exige mucho más:
 *     un proveedor que haya demostrado el buzón. Mientras no exista, la
 *     invitación avisa y prerrellena, que ya es dejar de dictar códigos a doce
 *     personas a la vez.
 */
import { getStore } from '../db/store';
import { normalizarEmail } from '../../../shared/live';
import type { Account, LivePhase } from '../../../shared/live';

/** Lo ÚNICO que viaja hacia el móvil sobre una invitación. */
export interface InvitacionVista {
  gameId: string;
  titulo: string;
  /** El personaje que le han asignado. */
  personaje: string;
  participanteId: string;
  fase: LivePhase;
  /** Con cuál de TUS correos te ha localizado, para poder decir «yo no soy». */
  paraEl: string;
  /**
   * ¿Se puede entrar sin teclear el código personal?
   *
   * Hoy siempre falso: hace falta un correo verificado por un proveedor, y
   * todavía no hay ninguno enchufado. El camino está escrito y probado para que
   * el día que lo haya se encienda solo.
   */
  directa: boolean;
  /** Ya hay un móvil emparejado con esa silla. */
  yaDentro: boolean;
}

/** Los correos que esta cuenta puede reclamar, y con cuánta prueba detrás. */
function correosDe(cuenta: Account): Map<string, boolean> {
  const conBuzonVerificado = new Map<string, boolean>();
  conBuzonVerificado.set(normalizarEmail(cuenta.email), false);
  for (const c of cuenta.correos ?? []) {
    const previo = conBuzonVerificado.get(c.correo) ?? false;
    conBuzonVerificado.set(c.correo, previo || (c.nivel === 'buzon' && !c.esRelay));
  }
  for (const i of cuenta.identidades ?? []) {
    if (!i.correo) continue;
    const previo = conBuzonVerificado.get(i.correo) ?? false;
    conBuzonVerificado.set(i.correo, previo || (i.correoVerificado && !i.esRelay));
  }
  return conBuzonVerificado;
}

/**
 * Las partidas a las que te han invitado.
 *
 * Recorre las partidas una a una en vez de preguntarle al almacén por un
 * índice. Es O(partidas) por consulta y para una instalación doméstica —decenas
 * de veladas— no se nota; el día que se note, se añade un índice al contrato del
 * almacén y esta función no cambia por fuera.
 */
export async function invitacionesPara(cuenta: Account): Promise<InvitacionVista[]> {
  const mios = correosDe(cuenta);
  if (mios.size === 0) return [];

  const store = getStore();
  const invitaciones: InvitacionVista[] = [];

  /*
   * DOS CONSULTAS, NO UNA POR PARTIDA JUGADA EN LA HISTORIA DE LA CASA.
   *
   * Esto recorria TODAS las partidas y pedia la sesion de cada una, y corre cada
   * vez que alguien abre la app. Ahora se piden de golpe las sesiones que
   * todavia no han terminado —una partida acabada no es una invitacion, es
   * historia— y los nombres salen del listado de resumenes, que ya se traia.
   */
  const nombres = new Map((await store.listGames()).map((r) => [r.id, r.name]));

  for (const sesion of await store.listLiveActivas()) {
    const resumen = { id: sesion.id, name: nombres.get(sesion.id) ?? '' };

    for (const jugador of sesion.players) {
      if (!jugador.email) continue;
      const correo = normalizarEmail(jugador.email);
      const verificado = mios.get(correo);
      if (verificado === undefined) continue;

      invitaciones.push({
        gameId: sesion.id,
        titulo: resumen.name,
        personaje: jugador.displayName,
        participanteId: jugador.participanteId,
        fase: sesion.phase,
        paraEl: correo,
        /*
         * DOS CAMINOS DISTINTOS, y confundirlos era el fallo.
         *
         * a) RECLAMAR una silla que nadie ha ocupado. Aquí sí hacen falta las
         *    tres condiciones: un correo verificado no arregla una errata de
         *    quien organiza, así que se limita a la sala de espera —con quien
         *    dirige mirando la pantalla— y a un asiento libre.
         *
         * b) VOLVER a la tuya. Si esta misma cuenta ya reclamó ese asiento, no
         *    hay nada que decidir: el servidor lo tiene apuntado en
         *    `reclamadaPor`. Exigirle el código aquí era mandar a quien ya se
         *    identificó a teclear dos claves que se reparten precisamente para
         *    quien NO tiene cuenta — y encima con la partida ya empezada, que
         *    es cuando peor viene.
         *
         * Y volver es MÁS seguro que el código, no menos: el código lo puede
         * usar cualquiera que lo tenga, y esto exige ser la cuenta que ocupó
         * ese asiento.
         */
        directa:
          jugador.reclamadaPor?.cuentaId === cuenta.id ||
          (Boolean(verificado) && sesion.phase === 'lobby' && !jugador.joined),
        yaDentro: jugador.joined,
      });
    }
  }

  return invitaciones;
}
