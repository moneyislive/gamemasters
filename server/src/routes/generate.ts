/**
 * Ruta de generación del misterio (SSE).
 *
 * Marca la partida como `generating`, delega en el pipeline (board → plot →
 * documents) y retransmite cada evento al cliente conforme se produce.
 */
import type { GenerateStreamEvent } from '../../../shared/types';
import { getStore } from '../db/store';
import { runGeneration } from '../plot/pipeline';
import { crearRouter } from '../rutas';

const router = crearRouter();

router.post('/games/:id/generate', async (req, res) => {
  const store = getStore();

  let game;
  try {
    game = await store.getGame(req.params.id);
  } catch (error) {
    console.error('[generate] error al leer la partida:', error);
    res.status(500).json({ error: 'No se pudo leer la partida.' });
    return;
  }

  if (!game) {
    res.status(404).json({ error: 'No existe esa partida.' });
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
    await runGeneration(game, emit);
  } catch (error) {
    console.error('[generate] fallo inesperado:', error);
    emit({
      type: 'error',
      message:
        error instanceof Error && error.message
          ? error.message
          : 'Error inesperado durante la generación.',
    });
  } finally {
    res.end();
  }
});

export default router;
