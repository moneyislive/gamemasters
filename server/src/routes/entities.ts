/**
 * Las entidades de una partida: la gente, los sitios y lo que haya ademas.
 *
 *   POST   /games/:id/entidades/:categoria       → alta o retoque
 *   DELETE /games/:id/entidades/:categoria/:eid  → baja
 *
 * Alta o retoque: si `body.id` coincide con una entidad existente se fusiona;
 * si no, se crea una nueva con nanoid (`name` obligatorio). Las dos devuelven
 * la partida entera, ya guardada.
 *
 * ═══ AQUI HABIA SEIS RUTAS MAS ═══
 *
 *   POST/DELETE  /games/:id/suspects
 *   POST/DELETE  /games/:id/rooms
 *   POST/DELETE  /games/:id/weapons
 *
 * Con ciento ochenta lineas detras que hacian exactamente esto con otra letra:
 * una tabla de campos permitidos por tipo —`suspects: ['name','email',...]`—
 * que un juego nuevo no podia ampliar, y sus propios manejadores.
 *
 * Se quedaron cuando se escribio la generica porque el taller de CLUEDO las
 * llamaba y funcionaban. Y ese es exactamente el estado en el que una cosa se
 * queda para siempre: nadie las toca, nadie las borra, y el dia que se cambia
 * una regla de validacion hay que acordarse de cambiarla dos veces.
 *
 * Ya no las llama nadie. Que campos se admiten lo dice la categoria en el
 * manifiesto —`admiteFoto`, `admiteEmail`, `sonLugares`— que es donde el juego
 * ya lo declaraba para todo lo demas.
 */
import type { Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { getStore } from '../db/store';
import { olvidarFotos } from '../uploads/limpieza';
import { crearRouter } from '../rutas';
import { categoria as categoriaDe, listaDeCategoria, manifiestoDe } from '../../../shared/juegos';
import type { Entidad } from '../../../shared/juegos';
import { partidaParaElTaller } from '../live/proyeccion';

const router = crearRouter();

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/*
 * ---------------------------------------------------------------------------
 * Por categoria: la ruta que sirve a cualquier juego
 * ---------------------------------------------------------------------------
 *
 * POR QUE HACIA FALTA. Las rutas que habia tenian el nombre de la cosa metido
 * en la URL —`/suspects`, `/rooms`, `/weapons`— asi que un juego con
 * otras categorias no tiene por donde dar de alta nada. Se vio con el segundo
 * juego: El Misterio de la Momia tiene «ritos», que no son personas ni lugares
 * ni objetos, y no habia forma de crearlos.
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
    res.json(partidaParaElTaller(guardada));
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
