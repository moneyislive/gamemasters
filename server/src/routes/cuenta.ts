/**
 * La cuenta: lo que eres en la plataforma, más allá de una velada.
 *
 * Va montado ANTES del guardián de la contraseña de la casa, junto a las rutas
 * de la app: quien juega no conoce esa contraseña y no tiene por qué. Su
 * autorización aquí es el pasaporte de cuenta, que viaja por su propia
 * cabecera.
 *
 * LO QUE ESTE ROUTER NO HACE: dar acceso a una partida. El pasaporte de cuenta
 * no autoriza a jugar; solo permite PEDIR una credencial de jugador por la vía
 * de siempre, con su `sid` atado a la apertura concreta de la partida. Esa es
 * la única revocación real que tiene el juego —cerrar y reabrir la mesa echa a
 * todo el mundo— y no se puede perder por una comodidad.
 */
import { getStore } from '../db/store';
import { crearRouter } from '../rutas';
import { sesionDeCuentaDePeticion } from '../identidad/sesion';
import { invitacionesPara } from '../live/invitaciones';
import { borrarCuentaDe } from '../live/cuentas';
import { mutar } from '../live/sesion';
import { emitirCredencial } from '../live/token';
import type { Request, Response } from 'express';
import type { Account } from '../../../shared/live';

const router = crearRouter();

/** La cuenta de quien llama, o corta con 401. */
async function cuentaDe(req: Request, res: Response): Promise<Account | null> {
  const pasaporte = sesionDeCuentaDePeticion(req);
  if (!pasaporte) {
    res.status(401).json({ error: 'Inicia sesión para ver tu cuenta.' });
    return null;
  }
  const cuenta = await getStore().getAccount(pasaporte.cuentaId);
  if (!cuenta) {
    res.status(401).json({ error: 'Esta sesión ya no vale. Vuelve a entrar.' });
    return null;
  }
  /*
   * El corte de revocación se comprueba AQUÍ, contra el almacén, y no dentro
   * del pasaporte. Si fuera al revés, echar a alguien no surtiría efecto hasta
   * que caducara su sesión, y eso son noventa días.
   */
  if (cuenta.sesionesValidasDesde) {
    const corte = new Date(cuenta.sesionesValidasDesde).getTime() / 1000;
    if (pasaporte.iat < corte) {
      res.status(401).json({ error: 'Esta sesión ya no vale. Vuelve a entrar.' });
      return null;
    }
  }
  return cuenta;
}

/**
 * Todo lo que necesita la portada de la app, en una sola petición.
 *
 * NUNCA acepta un correo por parámetro, y esto es deliberado: una ruta que
 * respondiera «¿tiene invitaciones fulano@ejemplo.com?» sería un oráculo para
 * averiguar quién juega en esta plataforma. Los correos salen de la sesión.
 */
router.get('/cuenta/portada', async (req, res) => {
  const cuenta = await cuentaDe(req, res);
  if (!cuenta) return;

  res.json({
    cuenta: {
      id: cuenta.id,
      displayName: cuenta.displayName,
      // El correo de la propia cuenta, que es de quien pregunta.
      email: cuenta.email,
      trofeos: cuenta.trofeos,
      partidas: cuenta.partidas,
    },
    invitaciones: await invitacionesPara(cuenta),
  });
});

/**
 * Entrar en una partida desde una invitación.
 *
 * LA REGLA QUE NO SE ROMPE: el pasaporte de cuenta NO autoriza a jugar. Lo
 * único que hace esta ruta es COMPRAR una credencial de jugador por la vía
 * normal —`emitirCredencial(id, suspectId, sid)`, exactamente el mismo objeto
 * que reparte el canje de códigos—. Así, dentro de `/api/jugar/*` sigue
 * habiendo un solo tipo de autorización, y el `sid` sigue siendo lo que hace
 * que cerrar y reabrir la partida eche a todo el mundo. Si una sesión de cuenta
 * pudiera entrar por su cuenta, esa revocación se perdería y nadie se enteraría.
 *
 * Y ENTRAR SIN CÓDIGO EXIGE LAS TRES, no solo el correo verificado:
 *
 *   · Buzón demostrado por un proveedor, sin alias de reenvío.
 *   · Fase de sala de espera. La mesa se está formando y quien dirige tiene la
 *     pantalla delante viendo aparecer los nombres. Si la partida ya empezó, un
 *     intruso haría mucho más daño y hay mucha menos vigilancia.
 *   · Silla libre. Si ya hay un móvil emparejado, se pide el código: puede que
 *     el sitio sea de otra persona.
 *
 * El porqué de tanta condición: verificar el buzón demuestra que el correo es
 * tuyo, pero NO arregla que quien organiza se equivocara al teclearlo. Con una
 * errata, la persona dueña de esa dirección recibiría una invitación a la
 * velada de unos desconocidos — y al otro lado está su dosier, con quién es el
 * culpable. Por eso además la silla queda marcada (`reclamadaPor`).
 *
 * Cuando no se cumplen las tres, no se cierra la puerta: se responde
 * `requiereCodigo` y la app manda a teclear el código personal, que es el
 * camino de siempre y funciona igual.
 */
router.post('/cuenta/entrar-en-partida', async (req, res) => {
  const cuenta = await cuentaDe(req, res);
  if (!cuenta) return;

  const gameId = String(req.body?.gameId ?? '');
  const suspectId = String(req.body?.suspectId ?? '');

  // Se comprueba contra las invitaciones DERIVADAS, no contra lo que mande el
  // móvil: pedir una partida cualquiera no sirve de nada si no sale en tu lista.
  const invitaciones = await invitacionesPara(cuenta);
  const invitacion = invitaciones.find((i) => i.gameId === gameId && i.suspectId === suspectId);
  if (!invitacion) {
    // 404 y no 403: confirmar que la partida existe ya es contar algo.
    res.status(404).json({ error: 'No tienes ninguna invitación a esa partida.' });
    return;
  }

  if (!invitacion.directa) {
    res.json({ requiereCodigo: true, motivo: motivoDeCodigo(invitacion) });
    return;
  }

  const store = getStore();
  const sesion = await store.getLive(gameId);
  if (!sesion) {
    res.status(404).json({ error: 'Esta partida ya no está en juego.' });
    return;
  }

  await mutar(gameId, (s) => {
    const jugador = s.players.find((p) => p.suspectId === suspectId);
    if (!jugador) throw new Error('Ya no participas en esta partida.');
    jugador.joined = true;
    jugador.lastSeenAt = new Date().toISOString();
    jugador.reclamadaPor = {
      cuentaId: cuenta.id,
      correo: invitacion.paraEl,
      el: new Date().toISOString(),
    };
  });

  res.json({
    requiereCodigo: false,
    // El MISMO objeto que reparte el canje de códigos, con su `sid`.
    token: emitirCredencial(sesion.id, suspectId, sesion.sid),
    gameId: sesion.id,
    suspectId,
    displayName: invitacion.personaje,
  });
});

/** Por qué toca teclear el código, dicho de forma que se entienda. */
function motivoDeCodigo(invitacion: { fase: string; yaDentro: boolean }): string {
  if (invitacion.yaDentro) return 'Ya hay un móvil emparejado con esa silla.';
  if (invitacion.fase !== 'lobby') return 'La partida ya ha empezado.';
  return 'Todavía no hemos podido verificar tu correo.';
}

/**
 * Borrar la cuenta desde fuera de una partida.
 *
 * Existe porque la otra puerta —la del perfil— solo se alcanza estando DENTRO
 * de una velada, y eso convierte el derecho de supresión en un trámite que
 * depende de que alguien te invite. Las tiendas piden que se pueda borrar la
 * cuenta desde la app, sin condiciones.
 */
router.delete('/cuenta', async (req, res) => {
  const cuenta = await cuentaDe(req, res);
  if (!cuenta) return;
  const resultado = await borrarCuentaDe(cuenta.email);
  res.json({ borrada: resultado.cuentaBorrada, partidasLimpiadas: resultado.partidasLimpiadas });
});

export default router;
