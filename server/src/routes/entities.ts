/**
 * Rutas de entidades de una partida: sospechosos, salas y armas.
 *
 *   POST   /games/:id/suspects            → upsert Partial<Suspect>
 *   DELETE /games/:id/suspects/:sid
 *   POST   /games/:id/rooms               → upsert Partial<Room>
 *   DELETE /games/:id/rooms/:rid
 *   POST   /games/:id/weapons             → upsert Partial<Weapon>
 *   DELETE /games/:id/weapons/:wid
 *
 * Upsert: si body.id coincide con una entidad existente se fusiona; si no,
 * se crea una nueva con nanoid (name obligatorio). Todas las rutas devuelven
 * la GameSession completa ya guardada.
 */
import type { Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { getStore } from '../db/store';
import { olvidarFotos } from '../uploads/limpieza';
import { crearRouter } from '../rutas';

const router = crearRouter();

type EntityKind = 'suspects' | 'rooms' | 'weapons';

/**
 * Superconjunto de los campos de Suspect | Room | Weapon.
 * Solo para uso interno del upsert genérico.
 */
interface BaseEntity {
  id: string;
  name: string;
  description?: string;
  photoUrl?: string;
  email?: string;
  pin?: { x: number; y: number };
}

const ALLOWED_FIELDS: Record<EntityKind, ReadonlySet<string>> = {
  suspects: new Set(['name', 'email', 'description', 'photoUrl']),
  rooms: new Set(['name', 'description', 'photoUrl', 'pin']),
  weapons: new Set(['name', 'description', 'photoUrl']),
};

const KIND_LABEL: Record<EntityKind, string> = {
  suspects: 'el sospechoso',
  rooms: 'la sala',
  weapons: 'el arma',
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Extrae del body únicamente los campos permitidos para el tipo de entidad. */
function pickPatch(
  kind: EntityKind,
  body: Record<string, unknown>,
): { patch: Partial<BaseEntity>; error?: string } {
  const patch: Partial<BaseEntity> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_FIELDS[kind].has(key) || value === undefined) continue;

    if (key === 'pin') {
      if (value === null) {
        // Permite retirar la chincheta de la foto aérea.
        patch.pin = undefined;
        continue;
      }
      const pin = value as { x?: unknown; y?: unknown };
      if (
        typeof pin.x !== 'number' ||
        typeof pin.y !== 'number' ||
        !Number.isFinite(pin.x) ||
        !Number.isFinite(pin.y)
      ) {
        return { patch, error: 'La chincheta debe tener coordenadas numéricas x e y (0..1).' };
      }
      patch.pin = { x: clamp01(pin.x), y: clamp01(pin.y) };
      continue;
    }

    if (value === null) {
      // null explícito → vaciar el campo opcional (email, description, photoUrl).
      if (key !== 'name') (patch as Record<string, unknown>)[key] = undefined;
      continue;
    }
    if (typeof value !== 'string') {
      return { patch, error: `El campo "${key}" debe ser texto.` };
    }
    (patch as Record<string, unknown>)[key] = value;
  }

  if (typeof patch.name === 'string') {
    patch.name = patch.name.trim();
    if (!patch.name) return { patch, error: 'El nombre no puede estar vacío.' };
  }
  return { patch };
}

async function upsertHandler(kind: EntityKind, req: Request, res: Response): Promise<void> {
  try {
    const store = getStore();
    const game = await store.getGame(req.params.id);
    if (!game) {
      res.status(404).json({ error: 'Partida no encontrada.' });
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const { patch, error } = pickPatch(kind, body);
    if (error) {
      res.status(400).json({ error });
      return;
    }

    // Cast deliberado: BaseEntity es superconjunto de Suspect/Room/Weapon.
    const list = game[kind] as unknown as BaseEntity[];
    const huerfanas: string[] = [];
    const bodyId = typeof body.id === 'string' ? body.id : undefined;
    const existing = bodyId ? list.find((e) => e.id === bodyId) : undefined;

    if (existing) {
      // La foto anterior, si la cambian, deja de tener dueño. Se anota antes de
      // pisarla: después ya no hay forma de saber cuál era.
      const fotoVieja = existing.photoUrl;
      Object.assign(existing, patch, { id: existing.id });
      if (fotoVieja && fotoVieja !== existing.photoUrl) huerfanas.push(fotoVieja);
    } else {
      if (!patch.name) {
        res.status(400).json({ error: `Falta el nombre para crear ${KIND_LABEL[kind]}.` });
        return;
      }
      list.push({ ...patch, id: nanoid(10), name: patch.name });
    }

    const guardada = await store.saveGame(game);
    // Después de guardar, nunca antes: si el guardado falla, la foto vieja
    // sigue siendo la buena y borrarla habría dejado la partida sin ella.
    await olvidarFotos(huerfanas);
    res.json(guardada);
  } catch (err) {
    console.error(`[entidades] Error en upsert de ${kind}:`, err);
    res.status(500).json({ error: 'Error interno al guardar la entidad.' });
  }
}

async function deleteHandler(
  kind: EntityKind,
  entityId: string,
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const store = getStore();
    const game = await store.getGame(req.params.id);
    if (!game) {
      res.status(404).json({ error: 'Partida no encontrada.' });
      return;
    }

    const list = game[kind] as unknown as BaseEntity[];
    const fotoDeLaQueSeVa = list.find((e) => e.id === entityId)?.photoUrl;
    const remaining = list.filter((e) => e.id !== entityId);
    list.splice(0, list.length, ...remaining);

    const guardada = await store.saveGame(game);
    await olvidarFotos([fotoDeLaQueSeVa]);
    res.json(guardada);
  } catch (err) {
    console.error(`[entidades] Error al borrar en ${kind}:`, err);
    res.status(500).json({ error: 'Error interno al borrar la entidad.' });
  }
}

const ENTITY_ROUTES: Array<{ kind: EntityKind; param: string }> = [
  { kind: 'suspects', param: 'sid' },
  { kind: 'rooms', param: 'rid' },
  { kind: 'weapons', param: 'wid' },
];

for (const { kind, param } of ENTITY_ROUTES) {
  router.post(`/games/:id/${kind}`, (req, res) => {
    void upsertHandler(kind, req, res);
  });
  router.delete(`/games/:id/${kind}/:${param}`, (req, res) => {
    void deleteHandler(kind, req.params[param] ?? '', req, res);
  });
}

export default router;
