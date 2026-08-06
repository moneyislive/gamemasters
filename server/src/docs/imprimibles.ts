/**
 * Material imprimible de la partida: los documentos que no son dosieres.
 *
 * A diferencia de los dosieres, estos NO se guardan en el índice de la partida.
 * Se calculan al vuelo desde el catálogo de `shared/documents.ts`, de modo que
 * aparecen también en partidas generadas antes de que existieran, sin obligar a
 * nadie a regenerar nada ni a gastar tokens.
 */
import { barraDeImpresion } from './estilos';
import { hojaDeImprenta } from './estilosImprenta';
import { esc } from './html';
import { printableDocInfo } from '../../../shared/documents';
import type { PrintableDocId } from '../../../shared/documents';
import type {
  DocumentRenderOptions,
  GameSession,
  PlayerDocument,
  Plot,
} from '../../../shared/types';

// ---------------------------------------------------------------------------
// Envoltorio y datos derivados
// ---------------------------------------------------------------------------

function envolver(titulo: string, contenido: string, opciones: DocumentRenderOptions = {}): string {
  const tema = opciones.variant === 'blanco' ? 'blanco' : 'color';
  const conBarra = opciones.printBar === true || opciones.printBar === 'auto';
  return `<!doctype html>
<html lang="es" data-tema="${tema}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(titulo)}</title>
<style>${hojaDeImprenta({ conBarra })}</style>
</head>
<body>
${conBarra ? barraDeImpresion(opciones.printBar === 'auto') : ''}
  <div class="hoja">
${contenido}
    <div class="pie-documento">${esc(titulo)} · GameMasters</div>
  </div>
</body>
</html>`;
}

/**
 * Cuántas rondas tiene la partida.
 *
 * Se deduce del reparto real de pistas en vez de fijarlo: si la trama solo
 * reparte tres, el material sale con tres. El tope evita que una pista con un
 * número disparatado genere cuarenta bloques.
 */
export function numeroDeRondas(plot: Plot): number {
  const rondas = plot.clues
    .map((pista) => pista.round)
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 12);
  if (rondas.length === 0) return 4;
  return Math.max(...rondas);
}

function portada(sello: string, titulo: string, lema: string, sub?: string): string {
  return `    <div class="portada">
      <span class="sello">${esc(sello)}</span>
      <h1>${esc(titulo)}</h1>
      <p class="lema">${esc(lema)}</p>
      ${sub ? `<p class="sub">${esc(sub)}</p>` : ''}
    </div>`;
}

// ---------------------------------------------------------------------------
// Hojas de investigación y acusación
// ---------------------------------------------------------------------------

function hojasInvestigacion(plot: Plot, opciones: DocumentRenderOptions): string {
  const rondas = numeroDeRondas(plot);

  // Cada cara tiene que caber en un A4: se fotocopia una vez por jugador y una
  // página huérfana duplicaría el gasto de papel. Con muchas rondas se reparten
  // menos renglones a cada una en vez de desbordar. Medido con cuatro rondas:
  // 272,8 mm con el renglón de 8 mm de la hoja común, contra 267 mm útiles.
  const renglonesPorRonda = rondas <= 4 ? 3 : rondas <= 6 ? 2 : 1;
  const renglon = '<span class="renglon" style="height:7mm; margin-bottom:1.5mm;"></span>';

  const notas = Array.from({ length: rondas }, (_, indice) => {
    return `      <div class="junto">
        <h3>Ronda ${indice + 1}</h3>
        ${renglon.repeat(renglonesPorRonda)}
      </div>`;
  }).join('\n');

  const contenido = `${portada('Una copia por jugador', 'Hoja de investigación', plot.tagline)}

    <h2 style="margin-top:0;">Mi personaje</h2>
    <div class="junto">
      <div class="campo"><span>Nombre</span><span></span></div>
      <div class="campo"><span>Motivo que otros podrían descubrir</span><span></span></div>
      <div class="campo"><span>Coartada declarada</span><span></span></div>
      <div class="campo"><span>Secreto que debo proteger</span><span></span></div>
    </div>

    <h2>Notas por ronda</h2>
${notas}

    <section class="pagina">
${portada('Se entrega boca abajo', 'Acusación final', plot.tagline)}

      <div class="aviso">
        No hables mientras la rellenas<br />
        Escribe una sola combinación y entrégala boca abajo.<br />
        No podrás cambiarla después.
      </div>

      <div class="campo"><span>Mi personaje</span><span></span></div>

      <div class="caja caja--roja junto">
        <span class="etiqueta" style="font-size:9.5pt;">Una sola combinación</span>
        <div class="campo" style="margin-bottom:5mm;">
          <span style="font-size:13pt;">Culpable</span>
          <span style="height:11mm; border-bottom:2px solid #6d1a2a;"></span>
        </div>
        <div class="campo" style="margin-bottom:5mm;">
          <span style="font-size:13pt;">Objeto</span>
          <span style="height:11mm; border-bottom:2px solid #6d1a2a;"></span>
        </div>
        <div class="campo" style="margin-bottom:1mm;">
          <span style="font-size:13pt;">Sala</span>
          <span style="height:11mm; border-bottom:2px solid #6d1a2a;"></span>
        </div>
      </div>

      <h3>Mi reconstrucción en dos o tres frases</h3>
      ${'<span class="renglon" style="height:8.5mm;"></span>'.repeat(4)}

      <div class="campo" style="margin-top:4mm;">
        <span>Nivel de confianza (0–100 %)</span>
        <span style="flex:0 0 40mm;"></span>
      </div>

      <div class="ornamento">❦ ✦ ⚜ ✦ ❦</div>
    </section>`;

  return envolver(`${plot.title} — Hoja de investigación`, contenido, opciones);
}

// ---------------------------------------------------------------------------
// Carteles de sala
// ---------------------------------------------------------------------------

/** El nombre es el protagonista del cartel: se encoge si es muy largo. */
function tamanoDelNombre(nombre: string): number {
  const largo = nombre.trim().length;
  if (largo <= 8) return 68;
  if (largo <= 14) return 54;
  if (largo <= 22) return 40;
  return 30;
}

function cartelesSala(game: GameSession, plot: Plot, opciones: DocumentRenderOptions): string {
  const nombrePorId = new Map(game.rooms.map((sala) => [sala.id, sala.name]));
  const pasadizos = game.board?.passages ?? [];

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

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Compone uno de los documentos imprimibles. Devuelve null si la partida no
 * tiene trama todavía o el identificador no está en el catálogo.
 */
export function renderPrintableDocument(
  game: GameSession,
  id: PrintableDocId,
  opciones: DocumentRenderOptions = {},
): PlayerDocument | null {
  const plot = game.plot;
  if (!plot) return null;
  const info = printableDocInfo(id);
  if (!info) return null;

  if (id === 'hojas-investigacion') {
    return { suspectId: id, title: info.name, html: hojasInvestigacion(plot, opciones) };
  }
  if (id === 'carteles-sala') {
    if (game.rooms.length === 0) return null;
    return { suspectId: id, title: info.name, html: cartelesSala(game, plot, opciones) };
  }
  return null;
}
