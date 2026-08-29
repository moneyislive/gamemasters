/**
 * Ruta de puesta al día del misterio (SSE).
 *
 * Mismo protocolo que /generate —eventos `GenerateStreamEvent` con etapas
 * board | plot | documents—, pero aquí solo se regenera lo que la partida ha
 * dejado obsoleto al cambiar jugadores, salas u objetos.
 */
import type { GenerateStreamEvent } from '../../../shared/types';
import { getStore } from '../db/store';
import { runRefresh } from '../plot/refresh';
import { crearRouter } from '../rutas';
import { generacionEnCurso } from '../plot/pipeline';

const router = crearRouter();

router.post('/games/:id/refresh', async (req, res) => {
  const store = getStore();

  let game;
  try {
    game = await store.getGame(req.params.id);
  } catch (error) {
    console.error('[refresh] error al leer la partida:', error);
    res.status(500).json({ error: 'No se pudo leer la partida.' });
    return;
  }

  if (!game) {
    res.status(404).json({ error: 'No existe esa partida.' });
    return;
  }
  /*
   * NI DOS A LA VEZ SOBRE LA MISMA PARTIDA. Cada una de estas llamadas cuesta
   * dinero de verdad, y la unica defensa era un booleano del navegador: se
   * pierde al recargar y no existe en otra pestaña. Se responde ANTES de abrir
   * el stream para que el cliente reciba un 409 legible y no un SSE que muere.
   */
  if (generacionEnCurso(game)) {
    res.status(409).json({ error: 'Esta partida ya se está generando. Espera a que termine.' });
    return;
  }


  // Cabeceras del stream: se envían antes de cualquier trabajo pesado.
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const emit = (evento: GenerateStreamEvent): void => {
    if (res.writableEnded) return;
    res.write(`data: ${JSON.stringify(evento)}\n\n`);
  };

  try {
    game.status = 'generating';
    await store.saveGame(game);
    await runRefresh(game, emit);
  } catch (error) {
    console.error('[refresh] fallo inesperado:', error);
    emit({
      type: 'error',
      message:
        error instanceof Error && error.message
          ? error.message
          : 'Error inesperado al poner al día la partida.',
    });
  } finally {
    res.end();
  }
});

export default router;
