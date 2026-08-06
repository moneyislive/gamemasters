/**
 * Hoja de solución: la chuleta del Game Master que dirige sabiendo el caso.
 *
 * Todo esto está ya en la segunda parte de su manual, pero enterrado a nueve
 * páginas. En la mesa, a mitad de partida y con once personas hablando, nadie
 * hojea un manual: quiere una hoja. Por eso existe.
 *
 * Solo tiene sentido en modo anfitrión. A ciegas, este documento es justo lo
 * que no puede tener.
 */
import { cronologiaPublica, pistasPorRonda } from '../datos';
import { esc } from '../html';
import { envolver, portada } from './comun';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../shared/types';

export function hojaSolucion(
  game: GameSession,
  plot: Plot,
  opciones: DocumentRenderOptions,
): string {
  const porRonda = pistasPorRonda(plot);
  const publicos = new Set(cronologiaPublica(plot));
  const nombreDe = (id: string): string => game.suspects.find((s) => s.id === id)?.name ?? id;
  const personajeDe = (id: string): string =>
    plot.characters.find((c) => c.suspectId === id)?.characterName ?? nombreDe(id);

  const asesino = nombreDe(plot.solution.murdererId);
  const arma = game.weapons.find((w) => w.id === plot.solution.weaponId)?.name ?? '';
  const sala = game.rooms.find((r) => r.id === plot.solution.roomId)?.name ?? '';

  const mapaPistas = [...porRonda.entries()]
    .flatMap(([ronda, pistas]) =>
      pistas.map((pista) => {
        const donde = game.rooms.find((r) => r.id === pista.roomId)?.name ?? '—';
        return `        <tr><td>${ronda}</td><td>${esc(donde)}</td><td>${esc(pista.description)}<br /><em style="color:#6d1a2a;">${esc(pista.pointsTo)}</em></td></tr>`;
      }),
    )
    .join('\n');

  const secretos = plot.characters
    .map(
      (p) =>
        `        <tr><td style="width:38mm;"><strong>${esc(nombreDe(p.suspectId))}</strong><br /><span style="font-size:10.5pt; color:#6b5638;">${esc(p.characterName)}</span></td><td>${esc(p.secret)}<br /><em style="color:#6b5638;">Coartada: ${esc(p.alibi)}</em></td></tr>`,
    )
    .join('\n');

  const cronologia = plot.timeline
    .map(
      (e) =>
        `        <tr><td class="hora">${esc(e.time)}</td><td style="width:20mm; font-family:'Cinzel',serif; font-size:8.5pt; color:${publicos.has(e) ? '#1a3f2a' : '#6d1a2a'};">${publicos.has(e) ? 'público' : 'secreto'}</td><td>${esc(e.description)}</td></tr>`,
    )
    .join('\n');

  const contenido = `${portada('Solo para quien dirige', 'Hoja de solución', plot.tagline, 'No la dejes sobre la mesa')}

    <div class="aviso">
      Esta hoja lo cuenta todo<br />
      Tenla contigo, doblada, y no la sueltes
    </div>

    <div class="caja caja--roja junto" style="text-align:center;">
      <span class="etiqueta">La combinación</span>
      <p style="margin:0; font-family:'Cinzel',serif; font-size:15pt; letter-spacing:0.05em; color:#6d1a2a; line-height:1.5;">
        ${esc(asesino)} · ${esc(arma)} · ${esc(sala)}
      </p>
      <p style="margin:2mm 0 0; font-size:11.5pt;">${esc(plot.solution.motive)}</p>
    </div>

    <h2 style="margin-top:0;">Cómo ocurrió</h2>
    <p>${esc(plot.solution.howItHappened)}</p>

    <h2>Mapa de pistas</h2>
    <table>
      <thead><tr><th style="width:16mm;">Ronda</th><th style="width:32mm;">Sala</th><th>Qué es y qué señala</th></tr></thead>
      <tbody>
${mapaPistas}
      </tbody>
    </table>

    <section class="pagina">
      <h2 style="margin-top:0;">Quién guarda qué</h2>
      <table>
        <thead><tr><th style="width:38mm;">Jugador</th><th>Secreto y coartada</th></tr></thead>
        <tbody>
${secretos}
        </tbody>
      </table>

      <h2>Cronología completa</h2>
      <table>
        <thead><tr><th style="width:22mm;">Hora</th><th style="width:20mm;">Visto</th><th>Qué pasó</th></tr></thead>
        <tbody>
${cronologia}
        </tbody>
      </table>

      <div class="caja caja--verde junto">
        <span class="etiqueta">Recuerda</span>
        <p style="margin:0;">
          Sabes la respuesta, así que tu trabajo no es guiarles: es aguantar el tipo cuando alguien
          la roza. «No lo sé más que tú» sigue siendo la respuesta correcta aunque lo sepas.
        </p>
      </div>
    </section>`;

  return envolver(`${plot.title} — Hoja de solución`, contenido, opciones);
}
