/**
 * Etiquetas para rotular los sobres.
 *
 * Solo llevan el código y qué hay dentro en términos neutros. Nunca a quién
 * pertenece algo más allá de su propio dosier: en una partida con el Game
 * Master a ciegas, una etiqueta que dijera «giro de Lucía» le señalaría a
 * quién le pasa algo antes de empezar, y eso le estrecha la sospecha.
 */
import { inventarioSobres } from '../datos';
import { esc } from '../html';
import { envolver, portada } from './comun';
import type { SobreDeLaPartida } from '../datos';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../shared/types';

function etiqueta(sobre: SobreDeLaPartida): string {
  // El código manda: es lo que el Game Master pide en voz alta durante la
  // partida, así que va grande y el nombre descriptivo debajo.
  const tamano = sobre.codigo.length > 16 ? 13 : sobre.codigo.length > 11 ? 15 : 17;
  return `    <div class="caja junto" style="flex:1 1 0; text-align:center; padding:5mm;">
      <span class="etiqueta">Sobre</span>
      <div style="font-family:'Cinzel',serif; font-weight:700; font-size:${tamano}pt; letter-spacing:0.1em; color:#1a3f2a; line-height:1.15; margin:2mm 0 1mm; overflow-wrap:anywhere;">${esc(sobre.codigo)}</div>
      <div style="font-family:'Cinzel',serif; font-size:9pt; letter-spacing:0.16em; color:#6d1a2a; margin:0 0 4mm;">${esc(sobre.contenido)}</div>
      <span class="renglon" style="height:7mm;"></span>
      <span class="etiqueta">Anotación</span>
    </div>`;
}

export function etiquetasSobres(
  game: GameSession,
  plot: Plot,
  opciones: DocumentRenderOptions,
): string {
  const sobres = inventarioSobres(game, plot);
  const grupos: Array<SobreDeLaPartida['grupo']> = ['Dosieres', 'Pistas', 'Dirección'];

  const secciones = grupos
    .map((grupo) => {
      const delGrupo = sobres.filter((s) => s.grupo === grupo);
      if (delGrupo.length === 0) return '';
      // De dos en dos, con una línea de corte entre filas.
      const filas: string[] = [];
      for (let i = 0; i < delGrupo.length; i += 2) {
        const par = delGrupo.slice(i, i + 2);
        const celdas = par.map(etiqueta).join('\n');
        const relleno = par.length === 1 ? '\n    <div style="flex:1 1 0;"></div>' : '';
        filas.push(`  <div class="junto" style="display:flex; gap:8mm;">
${celdas}${relleno}
  </div>`);
      }
      return `    <h2>${grupo}</h2>
${filas.join('\n  <hr style="border:0; border-top:1.2px dashed rgba(62,39,35,0.42); margin:5mm 0;">\n')}`;
    })
    .filter(Boolean)
    .join('\n\n');

  const contenido = `${portada(
    'Recorta y pega',
    'Etiquetas de sobres',
    plot.tagline,
    `${sobres.length} sobres`,
  )}

    <div class="caja junto">
      <span class="etiqueta">Cómo se usan</span>
      <p style="margin:0;">
        Recorta cada etiqueta y pégala en la solapa del sobre que le corresponde. Debajo
        del código hay un renglón libre por si quieres anotar a mano la sala, la ronda o
        el nombre de quien lo recibe.
      </p>
      <p style="margin:3mm 0 0;">
        Las etiquetas <strong>no revelan nada del misterio</strong>: solo dicen la sala y la
        ronda, que se anuncian igualmente en voz alta.
      </p>
    </div>

${secciones}`;

  return envolver(`${plot.title} — Etiquetas de sobres`, contenido, opciones);
}
