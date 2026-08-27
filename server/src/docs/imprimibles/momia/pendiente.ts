/**
 * ANDAMIO. Los ocho imprimibles de El Misterio de la Momia, todavía sin escribir.
 *
 * POR QUÉ EXISTE ESTE FICHERO Y NO UN `TODO`. `PLANTILLAS` es un
 * `Record<PrintableDocId, Plantilla>`: en cuanto el catálogo declara un
 * documento, el compilador exige que haya con qué componerlo. Eso es
 * deliberado y bueno —evita que un juego anuncie un PDF que reventaría la noche
 * de la partida— pero significa que no se puede declarar el catálogo primero y
 * escribir las plantillas después sin dejar el árbol sin compilar por el camino.
 *
 * Así que cada documento pendiente devuelve una hoja que DICE que está
 * pendiente, en vez de una página en blanco o una excepción. Si alguien lo
 * imprime antes de tiempo, lo que se encuentra es una explicación y no un
 * misterio.
 *
 * Cuando se escriba el documento de verdad, se sustituye la entrada en
 * `imprimibles/index.ts` y se borra de aquí. Cuando no quede ninguna, se borra
 * el fichero entero.
 */
import { printableDocInfo } from '../../../../../shared/documents';
import type { PrintableDocId } from '../../../../../shared/documents';

export function pendiente(id: PrintableDocId): string {
  const info = printableDocInfo(id);
  const nombre = info?.name ?? id;
  const resumen = info?.summary ?? '';
  return `
    <section class="hoja">
      <h1>${nombre}</h1>
      <p class="lede">${resumen}</p>
      <div class="aviso">
        <strong>Este documento todavía no está escrito.</strong>
        <p>
          Forma parte de El Misterio de la Momia y está declarado en el catálogo,
          pero su plantilla aún no existe. No es un fallo de tu partida: no hay
          nada que puedas hacer desde el taller para arreglarlo.
        </p>
      </div>
    </section>
  `;
}
