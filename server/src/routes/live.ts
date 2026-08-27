/**
 * Puesto de mando del Game Master.
 *
 * Va detrás del guardián de la contraseña de la casa, como el resto del taller.
 * Nada de lo que devuelve incluye la solución: con el Game Master a ciegas, su
 * propio panel no puede enseñarle lo que dirige.
 */
import { getStore } from '../db/store';
import { anunciar, olvidar } from '../live/hub';
import { cerrarPartidaEnCuentas } from '../live/cuentas';
import { vistaDeGameMaster } from '../live/proyeccion';
import {
  abrirAcusaciones,
  abrirSellado,
  abrirEncuentro,
  abrirRonda,
  abrirSesion,
  cerrarEncuentro,
  cerrarRonda,
  MINUTOS_POR_RONDA,
  mutar,
  refrescarSesion,
  revelarDesenlace,
} from '../live/sesion';
import type { Response } from 'express';
import { crearRouter } from '../rutas';

const router = crearRouter();

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
    await mutar(
      req.params.id,
      (s) => abrirRonda(s, Number.isFinite(minutos) && minutos > 0 ? minutos : MINUTOS_POR_RONDA),
      {
        avisar: (s) =>
          anunciar(
            req.params.id,
            s.rev,
            'ronda-abierta',
            `Ronda ${s.round} de ${s.totalRounds}. Elige sala.`,
          ),
      },
    );
    await responderVista(req.params.id, res);
  } catch (error) {
    fallo(error, res);
  }
});

router.post('/games/:id/live/ronda/cerrar', async (req, res) => {
  try {
    await mutar(req.params.id, (s) => cerrarRonda(s), {
      avisar: (s) =>
        anunciar(
          req.params.id,
          s.rev,
          'ronda-cerrada',
          'Ronda cerrada. Lo encontrado pasa al tablón común.',
        ),
    });
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
    await mutar(
      req.params.id,
      (s) => {
        const jugador = s.players.find((p) => p.suspectId === giro.suspectId);
        if (!jugador) throw new Error('Ese jugador ya no participa.');
        if (!jugador.girosRecibidos.includes(twistId)) jugador.girosRecibidos.push(twistId);
      },
      {
        avisar: (s) =>
          anunciar(
            req.params.id,
            s.rev,
            'giro',
            'Ha llegado algo para ti. Ábrelo sin que nadie te vea.',
            giro.suspectId,
          ),
      },
    );
    await responderVista(req.params.id, res);
  } catch (error) {
    fallo(error, res);
  }
});

/**
 * Lanza una ayuda a toda la mesa.
 *
 * Pasa por `mutar` aunque no cambie nada de la sesión, y no es un capricho: un
 * aviso solo se entrega si su revisión es MAYOR que la que trae el móvil
 * (`avisosDesde`). Anunciando con la revisión actual —que es justo la que el
 * teléfono ya tiene— la pista despertaba a los doce móviles y luego no le
 * llegaba a ninguno. Subir la revisión es lo que la hace visible.
 */
router.post('/games/:id/live/ayuda', async (req, res) => {
  const nivel = Number(req.body?.nivel);
  const store = getStore();
  const game = await store.getGame(req.params.id);
  const ayuda = game?.plot?.material?.hints.find((h) => h.level === nivel);
  if (!ayuda) {
    res.status(404).json({ error: 'No hay ninguna ayuda de ese nivel.' });
    return;
  }
  try {
    await mutar(req.params.id, () => undefined, {
      avisar: (s) => anunciar(req.params.id, s.rev, 'ayuda', ayuda.text),
    });
  } catch (error) {
    fallo(error, res);
    return;
  }
  await responderVista(req.params.id, res);
});

/**
 * Cierra la sesión de hoy sin terminar la partida.
 *
 * Para campañas de varias jornadas. Se conserva todo; lo único que se pide es
 * un título y un resumen de lo ocurrido, que es lo que se lee al retomarla.
 */
router.post('/games/:id/live/encuentro/cerrar', async (req, res) => {
  try {
    await mutar(req.params.id, (s) =>
      cerrarEncuentro(s, {
        titulo: String(req.body?.titulo ?? ''),
        resumen: String(req.body?.resumen ?? ''),
      }),
    );
    await responderVista(req.params.id, res);
  } catch (error) {
    fallo(error, res);
  }
});

/** Retoma la partida en el encuentro siguiente. */
router.post('/games/:id/live/encuentro/abrir', async (req, res) => {
  try {
    await mutar(req.params.id, (s) => abrirEncuentro(s));
    await responderVista(req.params.id, res);
  } catch (error) {
    fallo(error, res);
  }
});

router.post('/games/:id/live/acusaciones', async (req, res) => {
  try {
    await mutar(req.params.id, (s) => abrirAcusaciones(s), {
      avisar: (s) =>
        anunciar(
          req.params.id,
          s.rev,
          'acusaciones',
          'Momento de acusar. Una sola combinación, y no se puede cambiar.',
        ),
    });
    await responderVista(req.params.id, res);
  } catch (error) {
    fallo(error, res);
  }
});

/**
 * El Sellado de El Misterio de la Momia.
 *
 * EL BOTON EXISTIA Y LA RUTA NO. El taller pinta «Abrir El Sellado» cuando el
 * manifiesto declara la transicion, y llamaba aqui contra una ruta que no se
 * habia escrito: el hueco clasico de integrar dos trabajos hechos en paralelo,
 * y de los que no aparecen hasta que alguien pulsa el boton.
 *
 * Es generica, no de la Momia: cambia a una fase si el juego la admite. Para
 * CLUEDO, cuyo grafo declara `sellado: []`, se rechaza siempre — y ese rechazo
 * es la garantia de que anadir la fase no le abre a CLUEDO una puerta nueva.
 */
router.post('/games/:id/live/sellado', async (req, res) => {
  try {
    await mutar(req.params.id, (s) => abrirSellado(s), {
      avisar: (s) =>
        anunciar(
          req.params.id,
          s.rev,
          'sellado',
          'Se abre El Sellado. Cinco ritos, un solo orden bueno.',
        ),
    });
    await responderVista(req.params.id, res);
  } catch (error) {
    fallo(error, res);
  }
});

router.post('/games/:id/live/desenlace', async (req, res) => {
  try {
    await mutar(req.params.id, (s) => revelarDesenlace(s), {
      avisar: (s) => {
        anunciar(req.params.id, s.rev, 'desenlace', 'Se abre el sobre del crimen.');
        if (s.winnerId) {
          const ganador = s.players.find((p) => p.suspectId === s.winnerId);
          anunciar(
            req.params.id,
            s.rev,
            'ganador',
            `${ganador?.displayName ?? 'Alguien'} lo resolvió primero.`,
          );
        }
      },
    });

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
