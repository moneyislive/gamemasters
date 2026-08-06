/**
 * Puesto de mando del Game Master.
 *
 * Va detrás del guardián de la contraseña de la casa, como el resto del taller.
 * Nada de lo que devuelve incluye la solución: con el Game Master a ciegas, su
 * propio panel no puede enseñarle lo que dirige.
 */
import express from 'express';
import { getStore } from '../db/store';
import { anunciar, olvidar } from '../live/hub';
import { cerrarPartidaEnCuentas } from '../live/cuentas';
import { vistaDeGameMaster } from '../live/proyeccion';
import {
  abrirAcusaciones,
  abrirRonda,
  abrirSesion,
  cerrarRonda,
  MINUTOS_POR_RONDA,
  mutar,
  refrescarSesion,
  revelarDesenlace,
} from '../live/sesion';
import type { Response } from 'express';

const router = express.Router();

async function responderVista(gameId: string, res: Response): Promise<void> {
  const store = getStore();
  const [game, sesion] = await Promise.all([store.getGame(gameId), store.getLive(gameId)]);
  if (!game || !sesion) {
    res.status(404).json({ error: 'Esta partida no está en juego.' });
    return;
  }
  res.json(vistaDeGameMaster(game, sesion));
}

function fallo(error: unknown, res: Response): void {
  res.status(409).json({
    error: error instanceof Error && error.message ? error.message : 'No se pudo completar la acción.',
  });
}

/** Abre la sala de espera. Idempotente: reabrir no expulsa a nadie. */
router.post('/games/:id/live/abrir', async (req, res) => {
  const store = getStore();
  const game = await store.getGame(req.params.id);
  if (!game) {
    res.status(404).json({ error: 'No existe esa partida.' });
    return;
  }
  if (!game.plot) {
    res.status(409).json({ error: 'Genera el misterio antes de abrir la partida.' });
    return;
  }
  await abrirSesion(game);
  await responderVista(game.id, res);
});

/** Vuelve a alinear la sesión con los jugadores actuales de la partida. */
router.post('/games/:id/live/sincronizar', async (req, res) => {
  const store = getStore();
  const game = await store.getGame(req.params.id);
  if (!game) {
    res.status(404).json({ error: 'No existe esa partida.' });
    return;
  }
  await refrescarSesion(game);
  await responderVista(game.id, res);
});

router.get('/games/:id/live', async (req, res) => {
  await responderVista(req.params.id, res);
});

router.post('/games/:id/live/ronda/abrir', async (req, res) => {
  const minutos = Number(req.body?.minutos);
  try {
    const { sesion } = await mutar(req.params.id, (s) =>
      abrirRonda(s, Number.isFinite(minutos) && minutos > 0 ? minutos : MINUTOS_POR_RONDA),
    );
    anunciar(
      req.params.id,
      sesion.rev,
      'ronda-abierta',
      `Ronda ${sesion.round} de ${sesion.totalRounds}. Elige sala.`,
    );
    await responderVista(req.params.id, res);
  } catch (error) {
    fallo(error, res);
  }
});

router.post('/games/:id/live/ronda/cerrar', async (req, res) => {
  try {
    const { sesion } = await mutar(req.params.id, (s) => cerrarRonda(s));
    anunciar(
      req.params.id,
      sesion.rev,
      'ronda-cerrada',
      'Ronda cerrada. Lo encontrado pasa al tablón común.',
    );
    await responderVista(req.params.id, res);
  } catch (error) {
    fallo(error, res);
  }
});

/** Entrega un giro personal a su destinatario. */
router.post('/games/:id/live/giro', async (req, res) => {
  const twistId = String(req.body?.twistId ?? '');
  try {
    const store = getStore();
    const game = await store.getGame(req.params.id);
    const giro = game?.plot?.material?.twists.find((t) => t.id === twistId);
    if (!giro) {
      res.status(404).json({ error: 'Ese giro no existe en esta partida.' });
      return;
    }
    const { sesion } = await mutar(req.params.id, (s) => {
      const jugador = s.players.find((p) => p.suspectId === giro.suspectId);
      if (!jugador) throw new Error('Ese jugador ya no participa.');
      if (!jugador.girosRecibidos.includes(twistId)) jugador.girosRecibidos.push(twistId);
    });
    anunciar(
      req.params.id,
      sesion.rev,
      'giro',
      'Ha llegado algo para ti. Ábrelo sin que nadie te vea.',
      giro.suspectId,
    );
    await responderVista(req.params.id, res);
  } catch (error) {
    fallo(error, res);
  }
});

/** Lanza una ayuda a toda la mesa. */
router.post('/games/:id/live/ayuda', async (req, res) => {
  const nivel = Number(req.body?.nivel);
  const store = getStore();
  const game = await store.getGame(req.params.id);
  const ayuda = game?.plot?.material?.hints.find((h) => h.level === nivel);
  if (!ayuda) {
    res.status(404).json({ error: 'No hay ninguna ayuda de ese nivel.' });
    return;
  }
  const sesion = await store.getLive(req.params.id);
  if (!sesion) {
    res.status(404).json({ error: 'Esta partida no está en juego.' });
    return;
  }
  anunciar(req.params.id, sesion.rev, 'ayuda', ayuda.text);
  await responderVista(req.params.id, res);
});

router.post('/games/:id/live/acusaciones', async (req, res) => {
  try {
    const { sesion } = await mutar(req.params.id, (s) => abrirAcusaciones(s));
    anunciar(
      req.params.id,
      sesion.rev,
      'acusaciones',
      'Momento de acusar. Una sola combinación, y no se puede cambiar.',
    );
    await responderVista(req.params.id, res);
  } catch (error) {
    fallo(error, res);
  }
});

router.post('/games/:id/live/desenlace', async (req, res) => {
  try {
    const { sesion } = await mutar(req.params.id, (s) => revelarDesenlace(s));
    anunciar(req.params.id, sesion.rev, 'desenlace', 'Se abre el sobre del crimen.');

    // El historial y los trofeos se apuntan al cerrar, no antes: hasta aquí la
    // partida podía quedarse a medias.
    const store = getStore();
    const game = await store.getGame(req.params.id);
    if (game) {
      const actual = await store.getLive(req.params.id);
      if (actual) {
        await cerrarPartidaEnCuentas(game, actual);
        await store.saveLive(actual);
      }
    }
    if (sesion.winnerId) {
      const ganador = sesion.players.find((p) => p.suspectId === sesion.winnerId);
      anunciar(
        req.params.id,
        sesion.rev,
        'ganador',
        `${ganador?.displayName ?? 'Alguien'} lo resolvió primero.`,
      );
    }
    await responderVista(req.params.id, res);
  } catch (error) {
    fallo(error, res);
  }
});

/** Cierra la partida en vivo y borra su estado. Los códigos dejan de valer. */
router.delete('/games/:id/live', async (req, res) => {
  const store = getStore();
  await store.deleteLive(req.params.id);
  olvidar(req.params.id);
  res.json({ ok: true });
});

export default router;
