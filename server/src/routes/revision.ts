/**
 * Volver a revisar una trama que ya existe (SSE).
 *
 * La revisión corre sola al generar. Esta ruta es para después: cuando la trama
 * ha cambiado —se añadió gente con «Actualizar», el asistente reescribió un
 * personaje—, cuando la revisión de la generación no pudo terminar, o cuando
 * quien dirige quiere una segunda opinión. Revisa la trama entera, con su
 * material, y la guarda corregida junto a su informe.
 */
import type { GenerateStreamEvent } from '../../../shared/types';
import { getStore } from '../db/store';
import { revisorDe } from '../juegos/revisores';
import { crearRouter } from '../rutas';
import { quienPide } from '../gasto/quien';
import { cabeHoy, mensajeDeTope } from '../gasto/tope';
import { partidaParaElTaller } from '../live/proyeccion';
import { generacionEnCurso } from '../plot/pipeline';
import { volcarGasto } from '../gasto/contador';
import { renderDocumentIndex } from '../docs/renderer';

const router = crearRouter();

router.post('/games/:id/revision', async (req, res) => {
  // El tope, antes de gastar nada: una revisión cuesta lo que media trama.
  const quien = quienPide(req) ?? 'sin-identificar';
  if (!cabeHoy(quien, 'tramas')) {
    res.status(429).json({ error: mensajeDeTope('tramas') });
    return;
  }

  const store = getStore();
  const game = await store.getGame(req.params.id);
  if (!game) {
    res.status(404).json({ error: 'No existe esa partida.' });
    return;
  }
  if (generacionEnCurso(game)) {
    res.status(409).json({ error: 'Esta partida ya se está generando. Espera a que termine.' });
    return;
  }
  if (!game.plot) {
    res.status(409).json({ error: 'Esta partida todavía no tiene misterio: genéralo primero.' });
    return;
  }
  const revisor = revisorDe(game.settings?.juego);
  if (!revisor) {
    res.status(409).json({ error: 'Este juego todavía no tiene revisión de trama.' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const emit = (evento: GenerateStreamEvent): void => {
    if (res.writableEnded) return;
    res.write(`data: ${JSON.stringify(evento)}\n\n`);
  };

  /*
   * Se marca `generating` mientras dura, como al generar: dos revisiones a la
   * vez sobre la misma trama pagarían dos veces y la segunda pisaría a la
   * primera. `generacionEnCurso` libera la partida sola si el proceso muere.
   */
  game.status = 'generating';
  await store.saveGame(game);
  try {
    const { plot, informe } = await revisor(game, game.plot, emit, 'completa');
    plot.revision = informe;
    game.plot = plot;
    game.documents = renderDocumentIndex(game);
    game.status = 'ready';
    const guardada = await store.saveGame(game);
    emit({ type: 'done', game: partidaParaElTaller(guardada) });
    await volcarGasto(game.id);
  } catch (error) {
    console.error('[revision] fallo al revisar:', error);
    try {
      const almacenada = await store.getGame(game.id);
      if (almacenada && almacenada.status === 'generating') {
        almacenada.status = 'ready';
        await store.saveGame(almacenada);
      }
    } catch {
      // Si tampoco se puede guardar, el error original ya es suficiente.
    }
    emit({
      type: 'error',
      message: error instanceof Error && error.message ? error.message : 'No se pudo revisar la trama. No se ha modificado.',
    });
  } finally {
    res.end();
  }
});

export default router;
