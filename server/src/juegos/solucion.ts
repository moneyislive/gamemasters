/**
 * La respuesta del misterio: comprobarla y repararla.
 *
 * Antes esto estaba escrito tres veces —una por eje— en dos sitios distintos
 * (`pipeline.ts` al generar y `refresh.ts` al refrescar), y cada copia decía a
 * mano «si el asesino no existe, coge el primer sospechoso». Con los ejes en
 * una lista es un bucle, y además vale para un juego que tenga dos ejes o
 * cinco.
 *
 * POR QUÉ HAY QUE REPARAR. El modelo devuelve ids, y a veces se inventa uno, o
 * el Game Master borra una sala después de generar la trama. Sin esta red, la
 * partida queda con una solución que no señala a nada y no hay forma de
 * ganarla.
 */
import { manifiestoDe } from '../../../shared/juegos';
import { entidadesDe } from './entidades';
import type { CategoriaId, EjeId, ManifiestoDeJuego } from '../../../shared/juegos';
import type { GameSession, Plot } from '../../../shared/types';
import type { Entidad } from './entidades';

/** El manifiesto de una partida. */
export function juegoDe(game: GameSession): ManifiestoDeJuego {
  return manifiestoDe(game.settings?.juego);
}

/** Los ejes cuya respuesta no señala a ninguna entidad existente. */
export function ejesRotos(plot: Plot, game: GameSession): EjeId[] {
  const manifiesto = juegoDe(game);
  return manifiesto.ejes
    .filter((e) => {
      const id = plot.solution.respuestas[e.id];
      return !id || !entidadesDe(game, e.categoria).some((x) => x.id === id);
    })
    .map((e) => e.id);
}

/**
 * Deja la solución apuntando a entidades que existen.
 *
 * `preferido` permite elegir con criterio en vez de coger el primero: al
 * refrescar una trama interesa que el culpable sea alguien que YA tiene
 * personaje escrito, para que el crimen siga apoyándose en una historia.
 */
export function repararRespuestas(
  plot: Plot,
  game: GameSession,
  preferido?: (categoria: CategoriaId, candidatas: Entidad[]) => Entidad | undefined,
): EjeId[] {
  const manifiesto = juegoDe(game);
  const reparados: EjeId[] = [];

  for (const eje of manifiesto.ejes) {
    const candidatas = entidadesDe(game, eje.categoria);
    const actual = plot.solution.respuestas[eje.id];
    if (actual && candidatas.some((c) => c.id === actual)) continue;

    const elegida = preferido?.(eje.categoria, candidatas) ?? candidatas[0];
    if (!elegida) continue;
    plot.solution.respuestas[eje.id] = elegida.id;
    reparados.push(eje.id);
  }

  return reparados;
}
