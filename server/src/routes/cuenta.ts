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

export default router;
