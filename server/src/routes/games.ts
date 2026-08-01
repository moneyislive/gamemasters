/**
 * CRUD de partidas.
 *   GET    /games      → GameSummary[]
 *   POST   /games      → crea una GameSession nueva (status 'draft')
 *   GET    /games/:id  → GameSession
 *   PATCH  /games/:id  → patch parcial {name?, boardMode?, boardImageUrl?, settings?}
 *   DELETE /games/:id  → {ok:true}
 */
import { Router } from 'express';
import { DOCUMENT_SECTIONS } from '../../../shared/types';
import type { DocumentSectionId, GameSettings } from '../../../shared/types';
import { isModelId } from '../config';
import { getStore } from '../db/store';
import { normalizeStylePrompt } from '../plot/style';

const router = Router();

const NOT_FOUND = { error: 'Partida no encontrada.' } as const;

router.get('/games', async (_req, res) => {
  try {
    res.json(await getStore().listGames());
  } catch (err) {
    console.error('[partidas] Error al listar:', err);
    res.status(500).json({ error: 'No se pudieron listar las partidas.' });
  }
});

router.post('/games', async (req, res) => {
  try {
    const rawName = (req.body as { name?: unknown } | undefined)?.name;
    const name = typeof rawName === 'string' ? rawName : undefined;
    const game = await getStore().createGame(name);
    res.status(201).json(game);
  } catch (err) {
    console.error('[partidas] Error al crear:', err);
    res.status(500).json({ error: 'No se pudo crear la partida.' });
  }
});

router.get('/games/:id', async (req, res) => {
  try {
    const game = await getStore().getGame(req.params.id);
    if (!game) {
      res.status(404).json(NOT_FOUND);
      return;
    }
    res.json(game);
  } catch (err) {
    console.error('[partidas] Error al obtener:', err);
    res.status(500).json({ error: 'No se pudo cargar la partida.' });
  }
});

router.patch('/games/:id', async (req, res) => {
  try {
    const store = getStore();
    const game = await store.getGame(req.params.id);
    if (!game) {
      res.status(404).json(NOT_FOUND);
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;

    if ('name' in body) {
      if (typeof body.name !== 'string' || !body.name.trim()) {
        res.status(400).json({ error: 'El nombre de la partida no puede estar vacío.' });
        return;
      }
      game.name = body.name.trim();
    }

    if ('boardMode' in body) {
      if (body.boardMode !== 'generated' && body.boardMode !== 'aerial') {
        res.status(400).json({ error: 'Modo de tablero no válido: usa "generated" o "aerial".' });
        return;
      }
      game.boardMode = body.boardMode;
    }

    if ('boardImageUrl' in body) {
      if (body.boardImageUrl === null || body.boardImageUrl === undefined) {
        delete game.boardImageUrl;
      } else if (typeof body.boardImageUrl === 'string') {
        game.boardImageUrl = body.boardImageUrl;
      } else {
        res.status(400).json({ error: 'La URL de la imagen aérea debe ser texto.' });
        return;
      }
    }

    if ('settings' in body) {
      if (!body.settings || typeof body.settings !== 'object') {
        res.status(400).json({ error: 'El campo settings debe ser un objeto.' });
        return;
      }
      const incoming = body.settings as Record<string, unknown>;
      const nextSettings: GameSettings = { ...game.settings, language: 'es' };
      if ('model' in incoming) {
        if (incoming.model === null || incoming.model === undefined) {
          delete nextSettings.model;
        } else if (isModelId(incoming.model)) {
          nextSettings.model = incoming.model;
        } else {
          res.status(400).json({ error: 'Modelo no válido en settings.' });
          return;
        }
      }
      // Secciones de los dosieres: se filtran contra el catálogo conocido.
      if ('documentSections' in incoming) {
        const brutas = incoming.documentSections;
        if (Array.isArray(brutas)) {
          const validas = DOCUMENT_SECTIONS.map((s) => s.id);
          nextSettings.documentSections = brutas.filter(
            (id): id is DocumentSectionId =>
              typeof id === 'string' && validas.includes(id as DocumentSectionId),
          );
        } else {
          delete nextSettings.documentSections;
        }
      }

      // ¿El Game Master juega también como personaje?
      if ('gmPlays' in incoming) {
        if (typeof incoming.gmPlays === 'boolean') {
          nextSettings.gmPlays = incoming.gmPlays;
        } else {
          delete nextSettings.gmPlays;
        }
      }

      // Meta-prompt de estilo: texto libre normalizado; vacío o null lo retira.
      if ('stylePrompt' in incoming) {
        const estilo = normalizeStylePrompt(incoming.stylePrompt);
        if (estilo) {
          nextSettings.stylePrompt = estilo;
        } else {
          delete nextSettings.stylePrompt;
        }
      }
      game.settings = nextSettings;
    }

    res.json(await store.saveGame(game));
  } catch (err) {
    console.error('[partidas] Error al actualizar:', err);
    res.status(500).json({ error: 'No se pudo actualizar la partida.' });
  }
});

router.delete('/games/:id', async (req, res) => {
  try {
    const store = getStore();
    const game = await store.getGame(req.params.id);
    if (!game) {
      res.status(404).json(NOT_FOUND);
      return;
    }
    await store.deleteGame(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[partidas] Error al borrar:', err);
    res.status(500).json({ error: 'No se pudo borrar la partida.' });
  }
});

export default router;
