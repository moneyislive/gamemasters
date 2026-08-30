/**
 * Carteles de sala: una página por zona de la casa. Son los que convierten un
 * salón corriente en el escenario del misterio.
 */
import { codigosDeSala } from '../../datos';
import { esc } from '../../html';
import { envolver, portada } from '../comun';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../../shared/types';

/** El nombre es el protagonista del cartel: se encoge si es muy largo. */
function tamanoDelNombre(nombre: string): number {
  const largo = nombre.trim().length;
  if (largo <= 8) return 68;
  if (largo <= 14) return 54;
  if (largo <= 22) return 40;
  return 30;
}

export function cartelesSala(
  game: GameSession,
  plot: Plot,
  opciones: DocumentRenderOptions,
): string {
  const nombrePorId = new Map(game.rooms.map((sala) => [sala.id, sala.name]));
  const pasadizos = game.board?.passages ?? [];
  const codigos = codigosDeSala(game.rooms);

  /** Salas conectadas por pasadizo con ésta, en ambos sentidos. */
  const conectadasCon = (roomId: string): string[] => {
    const destinos: string[] = [];
    for (const paso of pasadizos) {
      if (paso.fromRoomId === roomId) destinos.push(nombrePorId.get(paso.toRoomId) ?? '');
      else if (paso.toRoomId === roomId) destinos.push(nombrePorId.get(paso.fromRoomId) ?? '');
    }
    return destinos.filter(Boolean);
  };

  const carteles = game.rooms
    .map((sala) => {
      const vecinas = conectadasCon(sala.id);
      // Las salas sin pasadizo no llevan pie: un recuadro vacío solo confunde.
      const notaPasadizo = vecinas.length
        ? `      <div class="caja caja--verde junto" style="text-align:center;">
        <span class="etiqueta">Pasadizo</span>
        <p style="margin:0; font-size:13pt;">
          Desde aquí se puede pasar directamente a <strong>${esc(vecinas.join('</strong> y <strong>'))}</strong>.
        </p>
        <p style="margin:2mm 0 0; font-size:11pt; font-style:italic;">
          Usar el pasadizo consume tu cambio de sala de esta ronda.
        </p>
      </div>`
        : '';

      const descripcion = sala.description
        ? `      <p style="text-align:center; font-style:italic; font-size:13pt; color:#6b5638; margin:0 0 8mm;">${esc(sala.description)}</p>`
        : '';

      // Cada sala arranca página: la primera detrás de la portada.
      return `    <section class="pagina">
      <div style="text-align:center; margin-bottom:6mm;">
        <span class="sello" style="display:inline-block; font-family:'Cinzel',serif; font-size:8.5pt; letter-spacing:0.34em; text-transform:uppercase; color:#6d1a2a; border:1px solid #6d1a2a; padding:4px 14px; border-radius:3px;">Zona de juego</span>
      </div>

      <h1 style="font-size:${tamanoDelNombre(sala.name)}pt; line-height:1.06; margin:6mm 0 5mm;">${esc(sala.name)}</h1>

${descripcion}

      <div class="caja junto" style="min-height:52mm; border-style:dashed; border-width:2px; display:flex; align-items:center; justify-content:center; text-align:center; background:transparent;">
        <span style="font-family:'Cinzel',serif; font-size:12pt; letter-spacing:0.16em; text-transform:uppercase; color:#8a7145;">
          Sobre de esta ronda
        </span>
      </div>

${notaPasadizo}

      <p style="text-align:center; font-family:'Cinzel',serif; font-size:9pt; letter-spacing:0.2em; text-transform:uppercase; color:#8a7145; margin:6mm 0 0;">
        Código de sobre · ${esc(codigos.get(sala.id) ?? '')}
      </p>
    </section>`;
    })
    .join('\n\n');

  const contenido = `${portada(
    'Un cartel por sala',
    'Carteles de sala',
    plot.tagline,
    `Imprime de la página 2 a la ${game.rooms.length + 1} y cuelga cada cartel en su zona`,
  )}

    <div class="caja junto">
      <span class="etiqueta">Cómo se usan</span>
      <p style="margin:0;">
        Cada sala ocupa una página entera. Cuélgalos donde de verdad vayan a jugar: son
        los que convierten el salón de tu casa en el escenario del misterio. El recuadro
        discontinuo es donde se apoya el sobre de pistas de la ronda en curso.
      </p>
      <p style="margin:3mm 0 0;">
        Esta primera página es solo la portada: <strong>no hace falta imprimirla</strong>.
      </p>
    </div>

${carteles}`;

  return envolver(`${plot.title} — Carteles de sala`, contenido, opciones);
}
