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
import { categoria as categoriaDe, listaDeCategoria, manifiestoDe } from '../../../shared/juegos';
import type { Entidad } from '../../../shared/juegos';

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

/*
 * ---------------------------------------------------------------------------
 * Por categoria: la ruta que sirve a cualquier juego
 * ---------------------------------------------------------------------------
 *
 * POR QUE HACIA FALTA. Las tres rutas de arriba tienen el nombre de la cosa
 * metido en la URL —`/suspects`, `/rooms`, `/weapons`— asi que un juego con
 * otras categorias no tiene por donde dar de alta nada. Se vio con el segundo
 * juego: El Misterio de la Momia tiene «ritos», que no son personas ni lugares
 * ni objetos, y no habia forma de crearlos.
 *
 * POR QUE NO SE SUSTITUYEN LAS TRES VIEJAS. Porque el taller de CLUEDO las
 * llama tal cual y funcionan. Cambiarlas seria reescribir el taller entero para
 * ganar exactamente nada esta noche, con el riesgo de romper el unico juego que
 * ya esta en produccion. Conviven: las viejas siguen ahi y esta sirve a todos,
 * incluido CLUEDO. El informe de arquitectura propone cuando retirarlas.
 *
 * QUE CAMPOS SE ADMITEN los dice la categoria en el manifiesto: `admiteFoto` y
 * `admiteEmail`. Antes era una tabla escrita a mano por tipo de entidad, y esa
 * tabla no sabia nada de las categorias de un juego nuevo.
 */
function camposDe(game: Awaited<ReturnType<ReturnType<typeof getStore>['getGame']>>, categoriaId: string): ReadonlySet<string> {
  const manifiesto = manifiestoDe(game?.settings?.juego);
  const cat = categoriaDe(manifiesto, categoriaId);
  const campos = new Set<string>(['name', 'description']);
  if (cat?.admiteFoto) campos.add('photoUrl');
  if (cat?.admiteEmail) campos.add('email');
  if (cat?.sonLugares) campos.add('pin');
  return campos;
}

async function conLaPartida(
  req: Request,
  res: Response,
  hacer: (game: NonNullable<Awaited<ReturnType<ReturnType<typeof getStore>['getGame']>>>, lista: Entidad[], huerfanas: string[]) => string | undefined,
): Promise<void> {
  try {
    const store = getStore();
    const game = await store.getGame(req.params.id);
    if (!game) {
      res.status(404).json({ error: 'Partida no encontrada.' });
      return;
    }
    const categoriaId = String(req.params.categoria ?? '');
    const manifiesto = manifiestoDe(game.settings?.juego);
    if (!categoriaDe(manifiesto, categoriaId)) {
      res.status(404).json({ error: `«${categoriaId}» no es una categoría de este juego.` });
      return;
    }
    const lista = listaDeCategoria(game, categoriaId);
    const huerfanas: string[] = [];
    const error = hacer(game, lista, huerfanas);
    if (error) {
      res.status(400).json({ error });
      return;
    }
    const guardada = await store.saveGame(game);
    // Despues de guardar, nunca antes: si el guardado falla, la foto vieja
    // sigue siendo la buena y borrarla habria dejado la partida sin ella.
    await olvidarFotos(huerfanas);
    res.json(guardada);
  } catch (err) {
    console.error('[entidades] error por categoria:', err);
    res.status(500).json({ error: 'Error interno al guardar la entidad.' });
  }
}

router.post('/games/:id/entidades/:categoria', (req, res) => {
  void conLaPartida(req, res, (game, lista, huerfanas) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const admitidos = camposDe(game, String(req.params.categoria));
    const patch: Record<string, unknown> = {};
    for (const [clave, valor] of Object.entries(body)) {
      if (!admitidos.has(clave) || valor === undefined) continue;
      if (clave === 'pin' && valor !== null) {
        const pin = valor as { x?: unknown; y?: unknown };
        if (typeof pin.x !== 'number' || typeof pin.y !== 'number') continue;
        patch.pin = { x: clamp01(pin.x), y: clamp01(pin.y) };
        continue;
      }
      patch[clave] = valor;
    }
    if (typeof patch.name === 'string') {
      patch.name = patch.name.trim();
      if (!patch.name) return 'El nombre no puede estar vacío.';
    }

    const bodyId = typeof body.id === 'string' ? body.id : undefined;
    const existente = bodyId ? lista.find((e) => e.id === bodyId) : undefined;
    if (existente) {
      const fotoVieja = existente.photoUrl;
      Object.assign(existente, patch, { id: existente.id });
      if (fotoVieja && fotoVieja !== existente.photoUrl) huerfanas.push(fotoVieja);
      return undefined;
    }
    if (typeof patch.name !== 'string' || !patch.name) return 'Falta el nombre.';
    lista.push({ ...(patch as Partial<Entidad>), id: nanoid(10), name: patch.name });
    return undefined;
  });
});

router.delete('/games/:id/entidades/:categoria/:eid', (req, res) => {
  void conLaPartida(req, res, (_game, lista, huerfanas) => {
    const eid = String(req.params.eid ?? '');
    const seVa = lista.find((e) => e.id === eid);
    if (seVa?.photoUrl) huerfanas.push(seVa.photoUrl);
    const quedan = lista.filter((e) => e.id !== eid);
    lista.splice(0, lista.length, ...quedan);
    return undefined;
  });
});

export default router;
