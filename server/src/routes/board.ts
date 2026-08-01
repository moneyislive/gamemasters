/**
 * Ruta del tablero: recalcula el plano determinista de la mansión a partir
 * de las salas registradas en la partida.
 */
import express from 'express';
import { generateBoardLayout } from '../board/generator';
import { getStore } from '../db/store';

const router = express.Router();

router.post('/games/:id/board', async (req, res) => {
  try {
    const store = getStore();
    const game = await store.getGame(req.params.id);
    if (!game) {
      res.status(404).json({ error: 'No existe esa partida.' });
      return;
    }
    game.board = generateBoardLayout(game.rooms);
    const guardada = await store.saveGame(game);
    res.json(guardada);
  } catch (error) {
    console.error('[board] error al generar el tablero:', error);
    res.status(500).json({ error: 'No se pudo generar el tablero.' });
  }
});

export default router;
