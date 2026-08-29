/**
 * Ruta de generación del misterio (SSE).
 *
 * Marca la partida como `generating`, delega en el pipeline (board → plot →
 * documents) y retransmite cada evento al cliente conforme se produce.
 */
import type { GenerateStreamEvent } from '../../../shared/types';
import { getStore } from '../db/store';
import { generacionEnCurso, runGeneration } from '../plot/pipeline';
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
