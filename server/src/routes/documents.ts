/**
 * Ruta de los dosieres: sirve el HTML generado para cada jugador (y el del
 * Game Master, con id 'gm'), en visualización o como descarga.
 */
import express from 'express';
import { getStore } from '../db/store';
import { renderPlayerDocument } from '../docs/renderer';

const router = express.Router();

/** Nombre de fichero seguro para la descarga. */
function nombreDeFichero(titulo: string): string {
  const limpio = titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `dosier-${limpio || 'gamemasters'}.html`;
}

router.get('/games/:id/documents/:suspectId', async (req, res) => {
  try {
    const game = await getStore().getGame(req.params.id);
    if (!game) {
      res.status(404).json({ error: 'No existe esa partida.' });
      return;
    }

    // La partida guarda solo el índice; el HTML se compone aquí, al vuelo, con
    // las fotos incrustadas para que el fichero descargado funcione sin conexión.
    const enIndice = game.documents?.some((doc) => doc.suspectId === req.params.suspectId);
    if (!enIndice) {
      res.status(404).json({ error: 'Ese dosier todavía no se ha generado.' });
      return;
    }

    const documento = renderPlayerDocument(game, req.params.suspectId);
    if (!documento?.html) {
      res.status(404).json({ error: 'Ese dosier ya no puede componerse: la partida ha cambiado.' });
      return;
    }

    if (req.query.download) {
      const etiqueta =
        req.params.suspectId === 'gm'
          ? 'game-master'
          : (game.suspects.find((s) => s.id === req.params.suspectId)?.name ?? documento.title);
      res.setHeader('Content-Disposition', `attachment; filename="${nombreDeFichero(etiqueta)}"`);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(documento.html);
  } catch (error) {
    console.error('[documents] error al servir el dosier:', error);
    res.status(500).json({ error: 'No se pudo abrir el dosier.' });
  }
});

export default router;
