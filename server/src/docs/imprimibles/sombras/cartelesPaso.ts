/**
 * Los carteles de los pasos: uno por habitación, y la mitad del juego.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ESTE DOCUMENTO ES UNA MECÁNICA, NO UNA DECORACIÓN
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Los carteles de sala de CLUEDO y los de cámara de la Momia son ambientación:
 * convierten un pasillo en otra cosa. Estos hacen eso Y ADEMÁS llevan la
 * CONTRASEÑA, que es lo que hay que ir a leer para poder reconocer el paso. Sin
 * los carteles colgados, este juego no se puede jugar: no es que quede soso, es
 * que la acción central devuelve un error.
 *
 * De ahí las tres decisiones de maquetación que parecen exageradas y no lo son:
 *
 *  1. UNA PÁGINA ENTERA POR PASO. Un cartel a media hoja no se ve desde la
 *     puerta.
 *  2. LA PALABRA A 64 PUNTOS. Se probó a 40 y a metro y medio con la luz apagada
 *     no se distinguía KAWA de KAZE. Ese es el fallo que arruina la mecánica: no
 *     que no se lea, sino que se lea mal y la app diga que no.
 *  3. LA PALABRA EN LETRAS LATINAS, Y EL KANJI DEBAJO Y MÁS PEQUEÑO. El kanji es
 *     lo bonito; lo que hay que teclear es lo otro. Puestos al revés, media mesa
 *     intentaría escribir 山 en un teclado español.
 */
import { esc } from '../../html';
import { envolverWashi, portadaWashi, sinTrama } from './comun';
import { vistaDeLasSombras } from './datos';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../../shared/types';

export function cartelesPaso(
  game: GameSession,
  plot: Plot,
  opciones: DocumentRenderOptions,
): string {
  const vista = vistaDeLasSombras(game, plot);
  if (!vista.hay || !vista.trama) return sinTrama('Carteles de los pasos', opciones);

  const carteles = vista.pasos
    .map((paso) => {
      const sena = vista.contrasenaDe(paso.id);
      const inscripcion = vista.sabor?.inscripciones[paso.id] ?? paso.description?.trim() ?? '';
      return `    <div class="cartel">
      <div class="marco">
        <div class="kicker">El camino de Iga · Tenshō 10</div>
        <div class="nombre">${esc(paso.name)}</div>
        ${inscripcion ? `<p class="inscripcion">${esc(inscripcion)}</p>` : ''}
        <div class="cajon-sena">
          <span class="rotulo">Santo y seña de este paso</span>
          <div class="palabra">${esc(sena?.palabra ?? '—')}</div>
          ${
            sena
              ? `<span class="glifo-sena kanji">${esc(sena.kanji)}</span>
          <div class="traduccion">${esc(sena.kanji)} · ${esc(sena.significa)}</div>`
              : ''
          }
        </div>
        <p class="pie">
          Escríbela tal cual en tu móvil —da igual mayúsculas o minúsculas— y te dirán qué pone en
          el mojón de este paso a esta hora. Si te equivocas, no pierdes la hora: vuelve a mirar.
        </p>
      </div>
    </div>`;
    })
    .join('\n\n');

  const contenido = `${portadaWashi(
    'Uno por habitación',
    'Carteles de los pasos',
    plot.tagline,
    `${vista.pasos.length} carteles · uno por página`,
  )}

    <div class="aviso">
      Sin estos carteles colgados, el juego no se puede jugar
    </div>

    <div class="caja caja--anil junto">
      <span class="etiqueta">Cómo se cuelgan</span>
      <ol style="margin:0;">
        <li>Uno en la puerta de cada habitación, <strong>a la altura de los ojos</strong> y por
          fuera o por dentro, como prefieras — pero siempre en el mismo sitio en todas.</li>
        <li>Tienen que <strong>leerse sin encender la luz grande</strong>. Prueba tú antes: ponte a
          dos metros con el móvil apagado y mira si distingues la palabra.</li>
        <li>La palabra de cada paso es distinta. No las cambies de sitio: la app las comprueba.</li>
        <li>Si diriges a ciegas y juegas, <strong>que los cuelgue otra persona</strong> y no te
          pares a leerlos. Saber las palabras te ahorraría el paseo que a los demás les cuesta.</li>
      </ol>
    </div>

    <div class="pagina"></div>
${carteles}`;

  return envolverWashi(`${plot.title} — Carteles de los pasos`, contenido, opciones);
}
