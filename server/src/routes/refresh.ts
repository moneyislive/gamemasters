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
import { quienPide } from '../gasto/quien';
import { cabeHoy, mensajeDeTope } from '../gasto/tope';
import { generacionEnCurso } from '../plot/pipeline';

const router = crearRouter();

router.post('/games/:id/refresh', async (req, res) => {
  /*
   * EL TOPE, ANTES DE GASTAR NADA.
   *
   * Esta ruta no tenia ninguno. `generacionEnCurso` impide dos a la vez sobre la
   * MISMA partida, que es otra cosa: crear veinte partidas y generarlas seguidas
   * no lo paraba nada, y cada una cuesta entre 0,48 y 0,82 euros medidos. El
   * unico tope de la casa estaba en la ruta de avatares, la barata.
   *
   * Se cuenta ANTES de empezar, no despues: cobrar el apunte cuando ya se ha
   * pagado al proveedor no frena nada. Y a quien no se identifica no se le
   * cuenta aqui --de eso se encarga la puerta-- pero tampoco se le deja pasar
   * sin cubo, asi que se le da el de invitado.
   */
  const quien = quienPide(req) ?? 'sin-identificar';
  if (!cabeHoy(quien, 'tramas')) {
    res.status(429).json({ error: mensajeDeTope('tramas') });
    return;
  }

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
