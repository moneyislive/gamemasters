/**
 * El desenlace: lo que se lee al abrir el sobre, después de recoger todas las
 * acusaciones. Es el único documento del paquete que se abre en público.
 */
import { esc } from '../html';
import { envolver, portada } from './comun';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../shared/types';

export function desenlace(
  game: GameSession,
  plot: Plot,
  opciones: DocumentRenderOptions,
): string {
  const asesino = game.suspects.find((s) => s.id === plot.solution.murdererId);
  const personaje = plot.characters.find((c) => c.suspectId === plot.solution.murdererId);
  const arma = game.weapons.find((w) => w.id === plot.solution.weaponId);
  const sala = game.rooms.find((r) => r.id === plot.solution.roomId);
  const finale = plot.material?.finale;

  const reconstruccion = finale?.reconstruction?.trim() || plot.solution.howItHappened;

  const contenido = `${portada('No abrir hasta el final', 'El desenlace', plot.tagline)}

    <div class="aviso">
      No abras este sobre<br />
      hasta tener todas las acusaciones recogidas y boca abajo
    </div>

    <h2 style="margin-top:0;">La combinación</h2>
    <div class="caja caja--roja junto" style="text-align:center;">
      <p style="margin:0; font-family:'Cinzel',serif; font-size:16pt; letter-spacing:0.06em; color:#6d1a2a; line-height:1.5;">
        ${esc(personaje?.characterName ?? asesino?.name ?? '')}<br />
        con ${esc(arma?.name ?? '')}<br />
        en ${esc(sala?.name ?? '')}
      </p>
      ${personaje && asesino && personaje.characterName !== asesino.name ? `<p style="margin:3mm 0 0; font-size:12pt;">Interpretado por <strong>${esc(asesino.name)}</strong>.</p>` : ''}
    </div>

    <h2>Cómo ocurrió</h2>
    <div class="caja junto">
      <span class="etiqueta">Lee en voz alta</span>
      <p style="margin:0; font-size:13pt;">${esc(reconstruccion)}</p>
    </div>

    <div class="caja caja--verde junto">
      <span class="etiqueta">El motivo</span>
      <p style="margin:0;">${esc(plot.solution.motive)}</p>
    </div>

${
  finale?.confession?.trim()
    ? `    <section class="pagina">
      <h2 style="margin-top:0;">La confesión</h2>
      <div class="caja caja--roja junto">
        <span class="etiqueta">La lee en voz alta quien interpretó al culpable</span>
        <p style="margin:0; font-size:13.5pt; font-style:italic;">${esc(finale.confession)}</p>
      </div>

${
  finale.epilogue?.trim()
    ? `      <h2>Epílogo</h2>
      <div class="caja junto">
        <span class="etiqueta">Lee en voz alta para cerrar la velada</span>
        <p style="margin:0; font-size:13pt;">${esc(finale.epilogue)}</p>
      </div>`
    : ''
}

      <div class="ornamento">❦ ✦ ⚜ ✦ ❦</div>
    </section>`
    : `    <div class="caja junto" style="border-style:dashed;">
      <span class="etiqueta">Falta la confesión</span>
      <p style="margin:0;">
        Esta partida no tiene material escrito, así que el desenlace se queda en la
        reconstrucción. La confesión en primera persona y el epílogo se añaden con
        «Escribir el material» desde el panel de dosieres, y no tocan la trama.
      </p>
    </div>`
}

    <h2>Y ahora</h2>
    <p>
      Lee las acusaciones en voz alta una por una antes de dar la combinación por buena: la gracia
      está en oír quién estuvo cerca. Después, que cada cual cuente su secreto. Es la mejor parte
      de la noche y casi siempre se olvida.
    </p>

    <section class="pagina">
      <h2 style="margin-top:0;">Recuento de acusaciones</h2>
      <p style="font-size:12.5pt;">
        Ve anotando lo que dice cada papeleta según la lees. Marca los aciertos y anuncia el
        resultado al final: quien haya acertado los tres se lleva la noche.
      </p>
      <table>
        <thead>
          <tr>
            <th style="width:34mm;">Quién acusa</th>
            <th>Culpable</th><th>Objeto</th><th>Sala</th>
            <th style="width:16mm;">Pleno</th>
          </tr>
        </thead>
        <tbody>
${game.suspects
  .map(
    (s) =>
      `          <tr><td>${esc(s.name)}</td><td></td><td></td><td></td><td></td></tr>`,
  )
  .join('\n')}
        </tbody>
      </table>
      <div class="caja caja--verde junto">
        <span class="etiqueta">La combinación correcta, para ir marcando</span>
        <p style="margin:0; font-family:'Cinzel',serif; font-size:12pt; letter-spacing:0.05em; color:#1a3f2a;">
          ${esc(personaje?.characterName ?? asesino?.name ?? '')} · ${esc(arma?.name ?? '')} · ${esc(sala?.name ?? '')}
        </p>
      </div>
    </section>`;

  return envolver(`${plot.title} — El desenlace`, contenido, opciones);
}
