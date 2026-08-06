/**
 * Ruta de los dosieres: sirve el documento de cada jugador (y el del Game
 * Master, con id 'gm'), en visualización, como descarga o convertido a PDF.
 *
 * Dos ejes independientes:
 *   ?variant=color|blanco   tema visual (el blanco gasta ~78 % menos tinta)
 *   ?format=html|pdf        cómo se entrega
 *
 * El PDF se genera con el navegador instalado en la máquina (ver `docs/pdf.ts`).
 * Si no hay ninguno se responde 503 con un mensaje que la interfaz convierte en
 * «imprime desde tu navegador», que siempre funciona.
 */
import express from 'express';
import { getStore } from '../db/store';
import { renderPlayerDocument } from '../docs/renderer';
import { buscarNavegador, convertirAPdf, SinNavegador } from '../docs/pdf';
import type { DocumentCapabilities, DocumentVariant } from '../../../shared/types';

const router = express.Router();

/** Nombre de fichero seguro para la descarga. */
function nombreDeFichero(titulo: string, variante: DocumentVariant, extension: string): string {
  const limpio = titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  // El sufijo evita que la versión en blanco pise a la de color en la carpeta
  // de descargas, que es lo que pasaba al bajar las dos seguidas.
  const sufijo = variante === 'blanco' ? '-blanco' : '';
  return `dosier-${limpio || 'gamemasters'}${sufijo}.${extension}`;
}

/** ¿Puede esta máquina convertir a PDF? La interfaz lo pregunta al arrancar. */
router.get('/documents/capabilities', (_req, res) => {
  const navegador = buscarNavegador();
  const respuesta: DocumentCapabilities = navegador
    ? { pdf: true, engine: navegador.nombre }
    : { pdf: false };
  res.json(respuesta);
});

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

    const variante: DocumentVariant = req.query.variant === 'blanco' ? 'blanco' : 'color';
    const formato = req.query.format === 'pdf' ? 'pdf' : 'html';
    // La barra de impresión solo estorba dentro del PDF y del visor incrustado.
    const barra = formato === 'html' && req.query.print ? (req.query.print === 'auto' ? 'auto' : true) : false;

    const documento = renderPlayerDocument(game, req.params.suspectId, {
      variant: variante,
      printBar: barra,
    });
    if (!documento?.html) {
      res.status(404).json({ error: 'Ese dosier ya no puede componerse: la partida ha cambiado.' });
      return;
    }

    const etiqueta =
      req.params.suspectId === 'gm'
        ? 'game-master'
        : req.params.suspectId === 'solution'
          ? 'el-sobre-del-crimen'
          : (game.suspects.find((s) => s.id === req.params.suspectId)?.name ?? documento.title);

    if (formato === 'pdf') {
      const pdf = await convertirAPdf(documento.html);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `${req.query.download ? 'attachment' : 'inline'}; filename="${nombreDeFichero(etiqueta, variante, 'pdf')}"`,
      );
      res.send(pdf);
      return;
    }

    if (req.query.download) {
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${nombreDeFichero(etiqueta, variante, 'html')}"`,
      );
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(documento.html);
  } catch (error) {
    if (error instanceof SinNavegador) {
      res.status(503).json({
        error:
          'Esta máquina no tiene Chrome ni Edge para generar el PDF. Abre el dosier y usa «Imprimir → Guardar como PDF».',
      });
      return;
    }
    console.error('[documents] error al servir el dosier:', error);
    res.status(500).json({ error: 'No se pudo abrir el dosier.' });
  }
});

export default router;
