/**
 * Ruta del material impreso (SSE).
 *
 * Escribe las narraciones, los giros, las revelaciones de cronología, las
 * ayudas y el desenlace SOBRE una trama ya existente, sin tocarla. Es también la
 * vía para que una partida escrita antes de que este material existiera lo
 * reciba sin regenerar el misterio.
 */
import type { GenerateStreamEvent } from '../../../shared/types';
import { getStore } from '../db/store';
import { generadorDeMaterial } from '../juegos/materiales';
import '../plot/material';
import { crearRouter } from '../rutas';
import { partidaParaElTaller } from '../live/proyeccion';

const router = crearRouter();

router.post('/games/:id/material', async (req, res) => {
  const store = getStore();

  let game;
  try {
    game = await store.getGame(req.params.id);
  } catch (error) {
    console.error('[material] error al leer la partida:', error);
    res.status(500).json({ error: 'No se pudo leer la partida.' });
    return;
  }

  if (!game) {
    res.status(404).json({ error: 'No existe esa partida.' });
    return;
  }
  if (!game.plot) {
    res.status(409).json({ error: 'Esta partida todavía no tiene misterio: genéralo primero.' });
    return;
  }

  /*
   * QUIÉN ESCRIBE EL MATERIAL DEPENDE DEL JUEGO, y hasta aquí no dependía de
   * nada: esta ruta corría el pipeline de CLUEDO para cualquier partida. En El
   * Misterio de la Momia eso pedía culpable, arma y sala a una trama que no
   * tiene ninguna de las tres —devuelven cadena vacía— y el modelo escribía
   * sobre un asesinato que no ha ocurrido, ENCIMA de las narraciones de vigilia
   * ya depuradas. Sin aviso y sin deshacer.
   */
  const generador = generadorDeMaterial(game.settings?.juego);
  if (!generador) {
    res
      .status(409)
      .json({ error: 'Este juego no escribe material de velada: su trama ya lo trae dentro.' });
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

  try {
    emit({ type: 'stage', stage: 'material', label: 'Escribiendo el material de la velada…' });
    const material = await generador(game, game.plot, emit);
    game.plot.material = material;
    const guardada = await store.saveGame(game);
    emit({ type: 'done', game: partidaParaElTaller(guardada) });
  } catch (error) {
    console.error('[material] fallo al escribir el material:', error);
    // La trama no se ha tocado: solo se ha perdido el material.
    emit({
      type: 'error',
      message:
        error instanceof Error && error.message
          ? error.message
          : 'No se pudo escribir el material. La trama no se ha modificado.',
    });
  } finally {
    res.end();
  }
});

export default router;
