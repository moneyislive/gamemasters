/**
 * Índice del paquete: la hoja por la que se empieza.
 *
 * Con el Game Master a ciegas hace falta una segunda persona que prepare el
 * material, y este documento es lo que separa lo que cada cual puede abrir. Sin
 * él, el reparto vive solo en la cabeza de quien montó la partida.
 */
import { printableDocsFor, resolveGmMode } from '../../../../shared/documents';
import { manifiestoDe } from '../../../../shared/juegos';
import { esc } from '../html';
import { envolver, portada } from './comun';
import type { PrintableDocInfo } from '../../../../shared/documents';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../shared/types';

function copias(doc: PrintableDocInfo, game: GameSession): string {
  const caras = doc.sides === 'una' ? 'a una cara' : 'a doble cara';
  if (doc.copies === 'una-por-jugador') return `${game.suspects.length} copias · ${caras}`;
  if (doc.copies === 'una-por-sala') return `${game.rooms.length} páginas · ${caras}`;
  return `1 copia · ${caras}`;
}

function ficha(titulo: string, detalle: string, nota: string): string {
  return `      <tr>
        <td><strong>${esc(titulo)}</strong><br /><span style="font-size:11pt; color:#6b5638;">${esc(detalle)}</span></td>
        <td style="width:44mm; font-family:'Cinzel',serif; font-size:9.5pt; letter-spacing:0.1em; color:#6d1a2a;">${esc(nota)}</td>
      </tr>`;
}

export function indicePaquete(
  game: GameSession,
  plot: Plot,
  opciones: DocumentRenderOptions,
): string {
  const aCiegas = resolveGmMode(game.settings) === 'blind';
  const docs = printableDocsFor(game.settings, manifiestoDe(game.settings?.juego).documentos);

  const parteImprimibles = docs
    .map((doc) => ficha(doc.name, doc.summary, copias(doc, game)))
    .join('\n');

  const parteDosieres = `${ficha(
    'Dosieres de los jugadores',
    `Uno por persona, cada uno con sus secretos. ${game.suspects.map((s) => s.name).join(', ')}.`,
    `${game.suspects.length} copias · a doble cara`,
  )}
${ficha(
    aCiegas ? 'Guía de la velada' : 'Dosier del Game Master',
    aCiegas
      ? 'Rondas, sobres y qué leer en voz alta. Sin la solución: puedes leerla entera.'
      : 'La solución, el guion completo y todas las pistas.',
    '1 copia · grapada',
  )}${
    aCiegas
      ? `\n${ficha(
          'El sobre del crimen',
          'La solución, en sobre opaco. No se abre hasta recoger todas las acusaciones.',
          '1 copia · sobre cerrado',
        )}`
      : ''
  }`;

  const pasos = aCiegas
    ? `      <li>Busca a alguien de confianza que <strong>no vaya a jugar</strong>, o que acepte jugar conociendo la solución. Esa persona prepara el material.</li>
      <li>Quien prepara imprime todo, recorta las etiquetas y mete cada cosa en su sobre.</li>
      <li>El Game Master recibe solo su guía y los carteles. Nada más.</li>
      <li>Cada jugador recibe su dosier cerrado y una hoja de investigación.</li>
      <li>Durante la velada se abren los sobres <strong>en el orden de las rondas</strong>. Nunca antes.</li>`
    : `      <li>Imprime el paquete y recorta las etiquetas.</li>
      <li>Mete las pistas de cada sala y ronda en su sobre rotulado.</li>
      <li>Cuelga los carteles de sala y la línea temporal donde vayáis a jugar.</li>
      <li>Reparte los dosieres cerrados y una hoja de investigación por persona.</li>
      <li>Guarda tu dosier donde nadie pueda leerlo: llevas la solución encima.</li>`;

  const aviso = aCiegas
    ? `    <div class="aviso">
      Esta partida se juega con el Game Master a ciegas<br />
      Hacen falta dos personas: quien dirige y quien prepara.<br />
      Quien dirige no abre los dosieres ni los sobres de pistas.
    </div>`
    : `    <div class="caja caja--verde junto">
      <span class="etiqueta">Antes de empezar</span>
      <p style="margin:0;">
        Tú diriges y conoces la solución, así que puedes preparar el material sin ayuda.
        Lo único importante: guarda tu dosier donde nadie lo vea, porque lo cuenta todo.
      </p>
    </div>`;

  const contenido = `${portada('Empieza por aquí', plot.title, plot.tagline, 'Índice del paquete')}

${aviso}

    <h2 style="margin-top:0;">Cómo se usa este paquete</h2>
    <ol>
${pasos}
    </ol>

    <h2>Documentos por persona</h2>
    <table>
      <tbody>
${parteDosieres}
      </tbody>
    </table>

    <h2>Material para la mesa</h2>
    ${
      docs.length
        ? `<table>
      <tbody>
${parteImprimibles}
      </tbody>
    </table>`
        : `<div class="caja junto"><p style="margin:0;">No has activado ningún documento para la mesa. Puedes hacerlo desde el panel de dosieres.</p></div>`
    }

    <div class="ornamento">❦ ✦ ⚜ ✦ ❦</div>`;

  return envolver(`${plot.title} — Empieza por aquí`, contenido, opciones);
}
