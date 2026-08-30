/**
 * Puesto de mando del Game Master.
 *
 * Va detrás del guardián de la contraseña de la casa, como el resto del taller.
 * Nada de lo que devuelve incluye la solución: con el Game Master a ciegas, su
 * propio panel no puede enseñarle lo que dirige.
 */
import { getStore } from '../db/store';
import { anunciar, olvidar } from '../live/hub';
import { ejecutarCierre } from '../juegos/cierres';
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
import { manifiestoDe } from '../../../shared/juegos';
import type { LiveSession } from '../../../shared/live';
import type { Response } from 'express';

/**
 * El aviso que le toca a ESTE juego, con la ronda puesta.
 *
 * Los textos estaban escritos a mano aquí, en vocabulario de CLUEDO, y el telón
 * de la app imprime el cuerpo tal cual llega: en una expedición egipcia se leía
 * «Elige sala» y «Se abre el sobre del crimen». Ahora los declara cada juego en
 * su manifiesto, al lado de la ceremonia y las reglas.
 */
function avisoDe(sesion: LiveSession, cual: 'rondaAbierta' | 'rondaCerrada' | 'acusaciones' | 'desenlace'): string {
  const avisos = manifiestoDe(sesion.juego).avisos;
  const plantilla = avisos?.[cual] ?? '';
  return plantilla
    .replace('{ronda}', String(sesion.round))
    .replace('{total}', String(sesion.totalRounds));
}
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
            avisoDe(s, 'rondaAbierta'),
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
          avisoDe(s, 'rondaCerrada'),
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
          avisoDe(s, 'acusaciones'),
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

/**
 * Ejecutar el cierre propio del juego. Irreversible a propósito.
 *
 * GENÉRICA, aunque hoy solo la use un juego: pregunta al registro de cierres si
 * este juego tiene uno y lo ejecuta. CLUEDO no declara ninguno y recibe un 409
 * honesto, que es la garantía de que abrir esta puerta no le da a CLUEDO una
 * forma nueva de terminar.
 *
 * VA DENTRO DE `mutar` Y NO ALREDEDOR: el cierre lee el estado y escribe encima
 * en el mismo acto. Si se leyera fuera del candado, dos clics seguidos —o un
 * `ofrendar` colándose en medio— podrían escribir dos veredictos distintos.
 */
router.post('/games/:id/live/cierre', async (req, res) => {
  try {
    const store = getStore();
    const game = await store.getGame(req.params.id);
    if (!game) {
      res.status(404).json({ error: 'Esta partida no existe.' });
      return;
    }
    /*
     * El anuncio se guarda al ejecutar y se usa al avisar. `avisar` corre
     * DESPUÉS del cambio y antes de que `mutar` devuelva, así que no se puede
     * leer de su valor de retorno: hay que apuntarlo por el camino.
     */
    let anuncio = '';
    await mutar(
      req.params.id,
      (s) => {
        anuncio = ejecutarCierre(game, s).anuncio;
      },
      { avisar: (s) => anunciar(req.params.id, s.rev, 'sellado', anuncio) },
    );
    await responderVista(req.params.id, res);
  } catch (error) {
    fallo(error, res);
  }
});

router.post('/games/:id/live/desenlace', async (req, res) => {
  try {
    /*
     * Se carga la partida porque `revelarDesenlace` le pregunta al juego quién
     * ganó, y para eso hace falta la trama --la Momia necesita saber quién era el
     * saqueador--. Es una lectura de más en la transición que ocurre UNA vez por
     * velada, a cambio de que el resultado quede bien escrito para siempre.
     */
    const partida = await getStore().getGame(req.params.id);
    if (!partida) {
      res.status(404).json({ error: 'Esa partida no existe.' });
      return;
    }
    await mutar(req.params.id, (s) => revelarDesenlace(partida, s), {
      avisar: (s) => {
        anunciar(req.params.id, s.rev, 'desenlace', avisoDe(s, 'desenlace'));
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

    /*
     * El historial y los trofeos se apuntan al cerrar, no antes: hasta aquí la
     * partida podía quedarse a medias.
     *
     * Y POR `mutar`, que es la tercera pata del mismo fallo. Esto hacía
     * `getLive` → `cerrarPartidaEnCuentas` → `saveLive` por libre, y
     * `cerrarPartidaEnCuentas` SÍ muta la sesión: escribe el `accountId` de cada
     * jugador. La ventana no era estrecha, era ancha — hace un `getAccount` y un
     * `saveAccount` POR PERSONA, o sea doce idas y vueltas a la base de datos
     * con la sesión leída en la mano— y `saveLive` reemplaza el documento
     * entero sin comparar `rev`. Lo que se escribiera durante esos doce viajes
     * —una nota, una presencia, una acusación rezagada— se perdía, y `rev`
     * retrocedía: el móvil que ya había visto la revisión 4 pedía «desde la 4» y
     * se quedaba sin lo que volviera a numerarse 4.
     *
     * Mete las doce cuentas dentro del candado de la partida, sí. Es el
     * desenlace y la velada ya ha terminado: ahí no hay nadie esperando turno.
     */
    const store = getStore();
    const game = await store.getGame(req.params.id);
    if (game) {
      await mutar(req.params.id, async (sesion) => {
        await cerrarPartidaEnCuentas(game, sesion);
      });
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
