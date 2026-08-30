/**
 * Fotos que ya no usa nadie.
 *
 * EL PROBLEMA. Subir una foto escribe un fichero; quitar la entidad, o cambiarle
 * la foto, no borraba nada. En producción la carpeta de subidas es un disco
 * persistente que sobrevive a todos los despliegues, así que cada retoque de una
 * partida dejaba atrás la cara de un invitado, para siempre y sin que nadie lo
 * supiera. Eso no es un problema de espacio: son fotos de personas reales que
 * ya nadie ha pedido conservar.
 *
 * CÓMO SE BORRA, Y POR QUÉ ASÍ. No se borra «la foto de esta entidad»: se
 * comprueba si ESE fichero lo sigue usando alguien, en cualquier partida, y solo
 * entonces se retira. Dos entidades pueden apuntar al mismo fichero —duplicar
 * una partida, reutilizar el retrato de alguien que repite— y borrar por su
 * nombre sin mirar dejaría un hueco en la otra.
 *
 * Y si el borrado falla, no pasa nada: se registra y se sigue. Un fichero de
 * sobra es un problema pequeño; una petición que revienta a mitad de preparar la
 * velada, no.
 */
import { personasDe } from '../../../shared/juegos';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config';
import { getStore } from '../db/store';
import type { GameSession } from '../../../shared/types';

/**
 * Todas las URL de foto que aparecen en una partida, incluida la del tablero.
 *
 * SE EXPORTA porque la ruta de borrado tenia su propia copia de esta lista, y
 * la copia se quedo sin `game.entidades`: al borrar una partida, las fotos de
 * las categorias que no son sospechosos, salas ni armas se quedaban en disco
 * para siempre. Una fuga pequena y silenciosa que crece con cada juego nuevo.
 *
 * Dos listas de lo mismo en dos ficheros solo pueden divergir; esta es la que
 * ya estaba bien.
 */
export function fotosDe(game: GameSession): string[] {
  const urls = [
    game.boardImageUrl,
    ...personasDe(game).map((s) => s.photoUrl),
    ...game.rooms.map((r) => r.photoUrl),
    ...game.weapons.map((w) => w.photoUrl),
    ...Object.values(game.entidades ?? {}).flatMap((lista) => lista.map((e) => e.photoUrl)),
  ];
  return urls.filter((u): u is string => typeof u === 'string' && u.startsWith('/uploads/'));
}

/**
 * Retira los ficheros de `candidatas` que ya no use ninguna partida.
 *
 * Nunca lanza: se llama desde rutas que estaban funcionando de sobra sin esto.
 */
export async function olvidarFotos(candidatas: Array<string | undefined>): Promise<number> {
  const aMirar = [...new Set(candidatas.filter((u): u is string => Boolean(u?.startsWith('/uploads/'))))];
  if (aMirar.length === 0) return 0;

  let borradas = 0;
  try {
    const store = getStore();
    const enUso = new Set<string>();
    for (const resumen of await store.listGames()) {
      const game = await store.getGame(resumen.id);
      if (game) for (const url of fotosDe(game)) enUso.add(url);
    }

    const carpeta = path.resolve(env.uploadsDir);
    for (const url of aMirar) {
      if (enUso.has(url)) continue;
      const archivo = url.slice('/uploads/'.length);
      const completa = path.resolve(carpeta, archivo);
      // Que la ruta caiga DENTRO de la carpeta. Aquí un descuido no sirve una
      // foto de más: borra ficheros del servidor.
      if (completa !== path.join(carpeta, archivo)) continue;
      try {
        await fs.unlink(completa);
        borradas++;
      } catch {
        // Ya no estaba, o el sistema de ficheros dijo que no. Da igual.
      }
    }
  } catch (error) {
    console.warn('[subidas] no se pudieron retirar fotos sin usar:', error);
  }
  return borradas;
}
