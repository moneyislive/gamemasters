/**
 * Los hitos del camino: las tiras que se dejan en cada habitación.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * A UNA SOLA CARA, Y NO ES UN CAPRICHO
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Cada tira lleva por fuera el paso y la hora, y por dentro lo que dice el
 * mojón: se dobla por la línea de puntos y se deja en su habitación. Impreso a
 * doble cara, el reverso de una tira es el interior de la que va detrás, y a
 * contraluz —que es como se mira un papel doblado— se lee. El catálogo lo
 * declara `sides: 'una'` y esta hoja lo repite en grande, porque es el fallo que
 * arruina la noche entera y no se ve hasta que alguien lo comenta en la mesa.
 *
 * EL FONDO DE LA TIRA ES OPACO incluso en el modo de ahorro de tinta, por lo
 * mismo. Está dicho en `estilo.ts`, en el bloque del tema blanco.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SE AGRUPAN POR HORA Y DENTRO POR PASO
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Porque así es como se manejan: quien prepara reparte las de la hora que va a
 * abrirse por las habitaciones, y recoge las anteriores. Agrupadas por paso
 * habría que ir buscando la hora dentro de cada montón, con prisa y a media luz.
 */
import { esc } from '../../html';
import { envolverWashi, portadaWashi, sinTrama } from './comun';
import { vistaDeLasSombras } from './datos';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../../shared/types';

export function hitosCamino(
  game: GameSession,
  plot: Plot,
  opciones: DocumentRenderOptions,
): string {
  const vista = vistaDeLasSombras(game, plot);
  if (!vista.hay || !vista.trama) return sinTrama('Los hitos del camino', opciones);

  const porHora = vista.horas
    .map((hora) => {
      const tiras = vista.hallazgos
        .filter((h) => h.ronda === hora.ronda)
        .map(
          (h) => `        <div class="tira">
          <div class="cara">
            <span class="etiqueta">${esc(hora.nombre)}</span>
            <div style="font-family:'Shippori Mincho',Georgia,serif; font-size:14pt;">${esc(h.paso?.name ?? '—')}</div>
          </div>
          <div class="doblez">dobla por aquí</div>
          <div class="dorso"><p>${esc(h.hito.texto)}</p></div>
        </div>`,
        )
        .join('\n');

      return `    <section class="${hora.ronda === 1 ? '' : 'pagina'}">
      <h2>${hora.kanji} · ${esc(hora.nombre)}</h2>
      <p style="font-size:11pt; color:#7c7159;">
        Una tira por paso. Antes de abrir esta hora, deja la de cada paso —doblada— en su
        habitación. Al cerrarla, recógelas todas: la hora siguiente lleva otras.
      </p>
      <div class="rejilla">
${tiras}
      </div>
    </section>`;
    })
    .join('\n\n');

  const contenido = `${portadaWashi(
    'Para quien prepara',
    'Los hitos del camino',
    plot.tagline,
    `${vista.hallazgos.length} tiras · ${vista.horas.length} horas · ${vista.pasos.length} pasos`,
  )}

    <div class="aviso">
      Imprime esta hoja a UNA SOLA CARA · A doble cara se leen al trasluz
    </div>

    <div class="caja caja--anil junto">
      <span class="etiqueta">Cómo se preparan</span>
      <ol style="margin:0;">
        <li>Imprime, recorta por las líneas y <strong>dobla cada tira por su línea de puntos</strong>.
          Fuera queda el paso y la hora; dentro, lo que dice el mojón.</li>
        <li>Agrupa por HORA. Cada montón es una hora de la noche.</li>
        <li>Antes de abrir cada hora, reparte las tiras de ese montón por las habitaciones que les
          tocan. Al cerrarla, recógelas.</li>
        <li>Un mismo hito puede repetirse en pasos distintos. No es un error: dos personas que
          coincidan en un sitio tienen que leer <strong>exactamente lo mismo</strong>, y de ahí sale
          la mitad del juego.</li>
      </ol>
    </div>

${porHora}`;

  return envolverWashi(`${plot.title} — Los hitos del camino`, contenido, opciones);
}
