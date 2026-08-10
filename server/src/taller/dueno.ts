/**
 * De quién es cada partida.
 *
 * POR QUÉ UN GUARDIÁN Y NO VEINTE COMPROBACIONES. Filtrar la lista de partidas
 * no protege absolutamente nada: el identificador de una partida lo recibe CADA
 * MÓVIL que entra a jugar, y viaja además en el historial de todo el que tiene
 * cuenta. Todos los invitados de todas las veladas conocen identificadores
 * reales. Sin un guardián por delante, cualquier Game Master registrado podría
 * llamar a `POST /games/<otra>/live/desenlace` y reventarle el final a doce
 * personas que no conoce, o borrarle la partida entera.
 *
 * Todas las rutas que tocan una partida cuelgan de `/games/:id/…` —lo he
 * comprobado una por una en los diez routers— así que un solo punto las cubre
 * todas, y una ruta nueva nace protegida sin que su autor se acuerde. Es el
 * mismo argumento que ya sostiene el guardián de sesión de la app y la fábrica
 * de routers: una comprobación que hay que recordar escribir acaba faltando en
 * el sitio número once, y ese es el que se explota.
 *
 * QUÉ HACE FALTA PARA PASAR, en orden:
 *
 *   - Modo abierto (desarrollo en local): pasa todo el mundo.
 *   - Contraseña de la casa: pasa. Es la llave heredada, y mientras exista abre
 *     todas las puertas — es exactamente lo que hace hoy, y quitársela de golpe
 *     dejaría al usuario fuera de sus propias partidas.
 *   - Partida HUÉRFANA (sin dueño): pasa. Son las creadas antes de que
 *     existieran las cuentas. Se marcan, no se esconden.
 *   - Cuenta que figura entre los dueños: pasa.
 *   - Cualquier otro caso: 404.
 *
 * Y 404, no 403. Un 403 confirma que la partida existe, y eso ya es contar algo
 * de la velada de otra persona.
 */
import { getStore } from '../db/store';
import { identidadDeTaller } from '../auth';
import { crearRouter } from '../rutas';
import type { NextFunction, Request, Response } from 'express';

const router = crearRouter();

/**
 * Va montado como router de la fábrica y no como un `app.use` suelto, y no es
 * un detalle: este manejador es asíncrono, y a pelo sobre `app` un rechazo
 * dejaría la petición colgada para siempre. Además, la comprobación de
 * cobertura que vigila los routers busca precisamente esto.
 */
router.use('/games/:id', async (req: Request, res: Response, next: NextFunction) => {
  const noExiste = (): void => {
    res.status(404).json({ error: 'Partida no encontrada.' });
  };

  const game = await getStore().getGame(req.params.id);
  if (!game) {
    noExiste();
    return;
  }

  const quien = identidadDeTaller(req);
  if (!quien) {
    // Sin identidad no se llega hasta aquí en condiciones normales —el guardián
    // de la contraseña va delante— pero si algún día se monta al revés, que
    // falle cerrado.
    noExiste();
    return;
  }
  if (quien.tipo === 'abierto' || quien.tipo === 'casa') {
    next();
    return;
  }

  const duenos = game.duenos ?? [];
  if (duenos.length === 0) {
    // Huérfana: nadie la reclama todavía. Se deja pasar, porque esconder lo que
    // no tiene dueño es cómo se pierde el trabajo de meses.
    next();
    return;
  }
  if (duenos.some((d) => d.cuentaId === quien.cuentaId)) {
    next();
    return;
  }

  noExiste();
});

export default router;
