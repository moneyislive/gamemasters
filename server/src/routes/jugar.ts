/**
 * API de la app del jugador.
 *
 * Va montada ANTES del guardián de la contraseña de la casa: quien juega no
 * conoce —ni debe conocer— la contraseña del Game Master. Su credencial es el
 * testigo firmado que recibe al emparejar el móvil con el código de invitación.
 *
 * Ninguna ruta de este fichero devuelve nada que no haya pasado por
 * `vistaDeJugador`. Es la regla que sostiene el juego entero.
 */
import express from 'express';
import { getStore } from '../db/store';
import { avisosDesde, esperarCambio } from '../live/hub';
import { consultarConsejero } from '../live/consejero';
import { perfilDe } from '../live/cuentas';
import { vistaDeJugador } from '../live/proyeccion';
import { acusar, elegirSala, guardarNotas, mutar, tocar } from '../live/sesion';
import { credencialDePeticion, emitirCredencial } from '../live/token';
import type { Request, Response } from 'express';
import type { VistaJugador } from '../../../shared/live';

const router = express.Router();

/** Saca la credencial de la petición o corta con 401. */
function credencial(req: Request, res: Response): { gameId: string; suspectId: string } | null {
  const cred = credencialDePeticion(req.headers.authorization);
  if (!cred) {
    res.status(401).json({ error: 'Vuelve a entrar con tu código: la sesión no es válida.' });
    return null;
  }
  return cred;
}

/** Compone la vista del jugador o corta con el error adecuado. */
async function vistaActual(
  gameId: string,
  suspectId: string,
  res: Response,
): Promise<VistaJugador | null> {
  const store = getStore();
  const [game, sesion] = await Promise.all([store.getGame(gameId), store.getLive(gameId)]);
  if (!game || !sesion) {
    res.status(404).json({ error: 'Esta partida ya no está en juego.' });
    return null;
  }
  const vista = vistaDeJugador(game, sesion, suspectId);
  if (!vista) {
    res.status(403).json({ error: 'Ya no participas en esta partida.' });
    return null;
  }
  return vista;
}

// ---------------------------------------------------------------------------
// Emparejar el móvil
// ---------------------------------------------------------------------------

/**
 * Entrar con el código de la partida y el personal.
 *
 * Se responde igual —y con el mismo retardo— tanto si el código de partida no
 * existe como si el personal no casa, para no ir diciendo cuáles existen.
 */
router.post('/jugar/entrar', async (req, res) => {
  const codigo = String(req.body?.code ?? '').trim().toUpperCase();
  const codigoPersonal = String(req.body?.joinCode ?? '').trim().toUpperCase();

  const rechazar = (): void => {
    setTimeout(() => {
      res.status(401).json({ error: 'El código no es válido. Revísalo con quien dirige la partida.' });
    }, 500);
  };

  if (!codigo || !codigoPersonal) return rechazar();

  const store = getStore();
  const sesion = await store.getLiveByCode(codigo);
  if (!sesion) return rechazar();

  const jugador = sesion.players.find((p) => p.joinCode === codigoPersonal);
  if (!jugador) return rechazar();

  await mutar(sesion.id, (s) => {
    const j = s.players.find((p) => p.suspectId === jugador.suspectId);
    if (j) {
      j.joined = true;
      j.lastSeenAt = new Date().toISOString();
    }
  });

  res.json({
    token: emitirCredencial(sesion.id, jugador.suspectId),
    gameId: sesion.id,
    suspectId: jugador.suspectId,
    displayName: jugador.displayName,
  });
});

// ---------------------------------------------------------------------------
// La vista, con espera de cambios
// ---------------------------------------------------------------------------

/**
 * Devuelve la vista del jugador.
 *
 * Con `?desde=N` no responde hasta que la partida cambie (o hasta agotar el
 * plazo). Es lo que hace que abrir una ronda se note al instante en doce
 * móviles sin sondear cada segundo.
 */
router.get('/jugar/vista', async (req, res) => {
  const cred = credencial(req, res);
  if (!cred) return;

  const desde = Number(req.query.desde);
  if (Number.isFinite(desde)) {
    const store = getStore();
    const actual = await store.getLive(cred.gameId);
    if (actual && (actual.rev ?? 0) <= desde) {
      const huboCambio = await esperarCambio(cred.gameId);
      if (!huboCambio) {
        // Sin novedad: el cliente vuelve a preguntar. Se aprovecha para marcar
        // que sigue vivo, que es como se pinta «conectado» en el panel.
        await mutarPresencia(cred.gameId, cred.suspectId);
        res.status(204).end();
        return;
      }
    }
  }

  await mutarPresencia(cred.gameId, cred.suspectId);
  const vista = await vistaActual(cred.gameId, cred.suspectId, res);
  if (!vista) return;
  res.json({
    vista,
    avisos: Number.isFinite(desde) ? avisosDesde(cred.gameId, desde, cred.suspectId) : [],
  });
});

/**
 * Marca presencia sin disparar una revisión.
 *
 * Si `tocar` subiera la revisión, doce móviles renovando presencia se
 * despertarían unos a otros en bucle y la partida no pararía de refrescarse.
 */
async function mutarPresencia(gameId: string, suspectId: string): Promise<void> {
  try {
    const store = getStore();
    const sesion = await store.getLive(gameId);
    if (!sesion) return;
    tocar(sesion, suspectId);
    // Se guarda SIN tocar rev: la presencia no es un cambio de partida.
    await store.saveLive(sesion);
  } catch {
    // La presencia es cosmética: nunca debe tumbar una petición.
  }
}

// ---------------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------------

router.post('/jugar/sala', async (req, res) => {
  const cred = credencial(req, res);
  if (!cred) return;
  const roomId = String(req.body?.roomId ?? '');
  try {
    const store = getStore();
    const game = await store.getGame(cred.gameId);
    if (!game?.rooms.some((r) => r.id === roomId)) {
      res.status(400).json({ error: 'Esa sala no existe en esta partida.' });
      return;
    }
    await mutar(cred.gameId, (s) => elegirSala(s, cred.suspectId, roomId));
    const vista = await vistaActual(cred.gameId, cred.suspectId, res);
    if (vista) res.json({ vista });
  } catch (error) {
    res.status(409).json({ error: mensaje(error, 'No se pudo entrar en esa sala.') });
  }
});

/**
 * «Estoy listo»: le dice a quien dirige que puede empezar cuando quiera.
 *
 * No abre la ronda —eso sigue siendo decisión suya— pero le ahorra preguntar
 * doce veces si ya está todo el mundo. Se puede retirar.
 */
router.post('/jugar/listo', async (req, res) => {
  const cred = credencial(req, res);
  if (!cred) return;
  const listo = req.body?.listo !== false;
  try {
    await mutar(cred.gameId, (s) => {
      const jugador = s.players.find((p) => p.suspectId === cred.suspectId);
      if (!jugador) throw new Error('No participas en esta partida.');
      jugador.pideEmpezar = listo;
    });
    const vista = await vistaActual(cred.gameId, cred.suspectId, res);
    if (vista) res.json({ vista });
  } catch (error) {
    res.status(409).json({ error: mensaje(error, 'No se pudo avisar.') });
  }
});

router.post('/jugar/notas', async (req, res) => {
  const cred = credencial(req, res);
  if (!cred) return;
  const notas = String(req.body?.notas ?? '');
  try {
    await mutar(cred.gameId, (s) => guardarNotas(s, cred.suspectId, notas));
    res.json({ ok: true });
  } catch (error) {
    res.status(409).json({ error: mensaje(error, 'No se pudieron guardar las notas.') });
  }
});

router.post('/jugar/acusar', async (req, res) => {
  const cred = credencial(req, res);
  if (!cred) return;
  // Un valor por eje. El móvil manda un diccionario, no tres campos fijos:
  // así el mismo endpoint sirve para un juego con otros ejes.
  const crudo = (req.body ?? {}) as { respuestas?: Record<string, unknown> };
  const eleccion: Record<string, string> = {};
  for (const [eje, valor] of Object.entries(crudo.respuestas ?? {})) {
    eleccion[String(eje)] = String(valor ?? '');
  }

  try {
    const store = getStore();
    const game = await store.getGame(cred.gameId);
    if (!game?.plot) {
      res.status(404).json({ error: 'Esta partida ya no está en juego.' });
      return;
    }
    const { resultado } = await mutar(cred.gameId, (s) =>
      acusar(s, cred.suspectId, eleccion, game.plot!.solution.respuestas),
    );
    // Deliberadamente NO se dice si ha acertado: se sabrá en el desenlace, como
    // en la mesa. Devolverlo aquí permitiría probar combinaciones.
    res.json({ registrada: true, at: resultado.acusacion.at });
  } catch (error) {
    res.status(409).json({ error: mensaje(error, 'No se pudo registrar la acusación.') });
  }
});

/**
 * El consejero. Recibe EXACTAMENTE la misma proyección que el móvil, así que
 * no puede revelar lo que no sabe.
 */
router.post('/jugar/preguntar', async (req, res) => {
  const cred = credencial(req, res);
  if (!cred) return;
  const pregunta = String(req.body?.pregunta ?? '');
  try {
    const store = getStore();
    const game = await store.getGame(cred.gameId);
    if (!game) {
      res.status(404).json({ error: 'Esta partida ya no está en juego.' });
      return;
    }
    const vista = await vistaActual(cred.gameId, cred.suspectId, res);
    if (!vista) return;
    const respuesta = await consultarConsejero(game, vista, pregunta);
    res.json({ respuesta });
  } catch (error) {
    console.error('[jugar] el consejero falló:', error);
    res.status(503).json({ error: 'El consejero no está disponible ahora mismo.' });
  }
});

router.get('/jugar/perfil', async (req, res) => {
  const cred = credencial(req, res);
  if (!cred) return;
  const store = getStore();
  const sesion = await store.getLive(cred.gameId);
  const jugador = sesion?.players.find((p) => p.suspectId === cred.suspectId);
  const cuenta = await perfilDe(jugador?.email);
  res.json({ cuenta });
});

function mensaje(error: unknown, porDefecto: string): string {
  return error instanceof Error && error.message ? error.message : porDefecto;
}

export default router;
