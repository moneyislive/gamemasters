/**
 * Renderizador de los dosieres HTML de la partida.
 *
 * Genera un documento autocontenido por jugador (más el dosier del Game
 * Master) con estética de pergamino art-decó, pensado tanto para leerse en
 * pantalla como para imprimirse en A4. Las fotos aportadas se incrustan como
 * data URI cuando el fichero existe en disco, de modo que el HTML descargado
 * siga funcionando sin conexión con el servidor.
 */
import { personasDe } from '../../../shared/juegos';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config';
import { dosieresDe } from './dosieres';
import { barraDeImpresion, hojaDeEstilos } from './estilos';
import { esc } from './html';
import type {
  BoardLayout,
  DocumentRenderOptions,
  DocumentSectionId,
  GameSession,
  PlayerDocument,
  Plot,
  PlotCharacter,
  Room,
  Suspect,
  TimelineEvent,
  Weapon,
} from '../../../shared/types';

const CELDA = 40; // píxeles por celda de la rejilla del tablero

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

const MIME_POR_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

/**
 * Convierte `/uploads/xxx.png` en un data URI leyendo el fichero de disco.
 * Si no se puede leer, devuelve la ruta original (funcionará servida por la web).
 */
export function comoDataUri(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('data:')) return url;
  if (!url.startsWith('/uploads/')) return url;
  try {
    const nombre = path.basename(url);
    const ruta = path.resolve(env.uploadsDir, nombre);
    if (!fs.existsSync(ruta)) return url;
    const extension = path.extname(nombre).toLowerCase();
    const mime = MIME_POR_EXTENSION[extension] ?? 'image/jpeg';
    const datos = fs.readFileSync(ruta).toString('base64');
    return `data:${mime};base64,${datos}`;
  } catch {
    return url;
  }
}

/** Iniciales para las fichas sin fotografía. */
export function monograma(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const primera = partes[0]?.charAt(0) ?? '';
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.charAt(0) ?? '') : '';
  return (primera + ultima).toUpperCase() || '?';
}

export function retrato(nombre: string, photoUrl: string | undefined, clase: string): string {
  const src = comoDataUri(photoUrl);
  if (src) {
    return `<img class="${clase}" src="${esc(src)}" alt="Retrato de ${esc(nombre)}" />`;
  }
  return `<span class="${clase} monograma">${esc(monograma(nombre))}</span>`;
}

// ---------------------------------------------------------------------------
// SVG del tablero
// ---------------------------------------------------------------------------

/** Dibuja el tablero de Cluedo como SVG inline (autocontenido, sin scripts). */
export function renderBoardSvg(board: BoardLayout, rooms: Room[]): string {
  const ancho = board.grid.cols * CELDA;
  const alto = board.grid.rows * CELDA;
  const nombrePorId = new Map(rooms.map((sala) => [sala.id, sala.name]));
  const centroPorId = new Map<string, { cx: number; cy: number }>();

  const salas = board.rooms
    .map((colocacion) => {
      const x = colocacion.x * CELDA;
      const y = colocacion.y * CELDA;
      const w = colocacion.w * CELDA;
      const h = colocacion.h * CELDA;
      const cx = x + w / 2;
      const cy = y + h / 2;
      centroPorId.set(colocacion.roomId, { cx, cy });
      const nombre = nombrePorId.get(colocacion.roomId) ?? 'Sala';
      // El tamaño de letra se ajusta al ancho disponible para nombres largos.
      const tamano = Math.max(11, Math.min(19, (w * 1.55) / Math.max(nombre.length, 6)));
      return `
      <g>
        <rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 8}" rx="5"
              fill="url(#parquet)" stroke="#c9a227" stroke-width="2.5" />
        <rect x="${x + 10}" y="${y + 10}" width="${w - 20}" height="${h - 20}" rx="3"
              fill="none" stroke="rgba(201,162,39,0.35)" stroke-width="1" />
        <text class="sala-nombre" x="${cx}" y="${cy + 4}" text-anchor="middle"
              font-family="Cinzel, Georgia, serif" font-size="${tamano.toFixed(1)}"
              letter-spacing="1.4" fill="#f1e5c9">${esc(nombre.toUpperCase())}</text>
        <line x1="${cx - 22}" y1="${cy + 16}" x2="${cx + 22}" y2="${cy + 16}"
              stroke="rgba(201,162,39,0.55)" stroke-width="1" />
      </g>`;
    })
    .join('');

  const pasadizos = board.passages
    .map((pasadizo) => {
      const a = centroPorId.get(pasadizo.fromRoomId);
      const b = centroPorId.get(pasadizo.toRoomId);
      if (!a || !b) return '';
      const desde = nombrePorId.get(pasadizo.fromRoomId) ?? '';
      const hasta = nombrePorId.get(pasadizo.toRoomId) ?? '';
      return `
      <g>
        <title>Pasadizo secreto: ${esc(desde)} ⇄ ${esc(hasta)}</title>
        <line x1="${a.cx}" y1="${a.cy}" x2="${b.cx}" y2="${b.cy}"
              stroke="#c9a227" stroke-width="2.4" stroke-dasharray="11 9" opacity="0.75" />
        <circle cx="${a.cx}" cy="${a.cy}" r="9" class="nodo" fill="#1f120c" stroke="#c9a227" stroke-width="2" />
        <circle cx="${b.cx}" cy="${b.cy}" r="9" class="nodo" fill="#1f120c" stroke="#c9a227" stroke-width="2" />
      </g>`;
    })
    .join('');

  const centro = {
    x: Math.round(board.grid.cols * 0.29) * CELDA,
    y: Math.round(board.grid.rows * 0.33) * CELDA,
    w: Math.round(board.grid.cols * 0.42) * CELDA,
    h: Math.round(board.grid.rows * 0.34) * CELDA,
  };

  return `<svg viewBox="0 0 ${ancho} ${alto}" xmlns="http://www.w3.org/2000/svg"
     role="img" aria-label="Plano del tablero" class="tablero-svg">
  <defs>
    <pattern id="parquet" width="26" height="26" patternUnits="userSpaceOnUse">
      <rect width="26" height="26" fill="#2b1a12" />
      <rect width="26" height="13" fill="#332016" />
      <line x1="0" y1="13" x2="26" y2="13" stroke="rgba(0,0,0,0.35)" stroke-width="1" />
      <line x1="13" y1="0" x2="13" y2="13" stroke="rgba(0,0,0,0.28)" stroke-width="1" />
    </pattern>
    <radialGradient id="tapete" cx="50%" cy="45%" r="72%">
      <stop offset="0%" stop-color="#1c4630" />
      <stop offset="100%" stop-color="#0d2118" />
    </radialGradient>
  </defs>

  <rect width="${ancho}" height="${alto}" fill="url(#tapete)" />
  <rect x="8" y="8" width="${ancho - 16}" height="${alto - 16}" fill="none"
        stroke="#c9a227" stroke-width="3" />
  <rect x="18" y="18" width="${ancho - 36}" height="${alto - 36}" fill="none"
        stroke="rgba(201,162,39,0.4)" stroke-width="1.2" />

  <g>
    <rect class="centro" x="${centro.x}" y="${centro.y}" width="${centro.w}" height="${centro.h}" rx="6"
          fill="#4a1622" stroke="#c9a227" stroke-width="2.5" />
    <rect x="${centro.x + 9}" y="${centro.y + 9}" width="${centro.w - 18}" height="${centro.h - 18}"
          rx="4" fill="none" stroke="rgba(232,207,127,0.45)" stroke-width="1" />
    <text class="centro-nombre" x="${centro.x + centro.w / 2}" y="${centro.y + centro.h / 2 + 6}" text-anchor="middle"
          font-family="Cinzel, Georgia, serif" font-size="21" letter-spacing="5"
          fill="#e8cf7f">${esc(board.centerLabel)}</text>
    <circle cx="${centro.x + centro.w / 2}" cy="${centro.y + centro.h / 2 - 34}" r="13"
            fill="none" stroke="#e8cf7f" stroke-width="2.2" />
    <line x1="${centro.x + centro.w / 2 + 9}" y1="${centro.y + centro.h / 2 - 25}"
          x2="${centro.x + centro.w / 2 + 20}" y2="${centro.y + centro.h / 2 - 14}"
          stroke="#e8cf7f" stroke-width="3" stroke-linecap="round" />
  </g>

  ${pasadizos}
  ${salas}
</svg>`;
}


export function envolver(titulo: string, contenido: string, opciones: DocumentRenderOptions = {}): string {
  const tema = opciones.variant === 'blanco' ? 'blanco' : 'color';
  const conBarra = opciones.printBar === true || opciones.printBar === 'auto';
  return `<!doctype html>
<html lang="es" data-tema="${tema}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(titulo)}</title>
<style>${hojaDeEstilos({ conBarra })}</style>
</head>
<body>
${conBarra ? barraDeImpresion(opciones.printBar === 'auto') : ''}
  <div class="hoja">
    <div class="marco">
      ${contenido}
      <div class="pie">GameMasters · Dosier generado para esta velada</div>
    </div>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Índice de dosieres SIN el HTML: es lo que se guarda en la partida.
 *
 * El HTML no se almacena porque cada dosier incrusta en base64 las fotos de
 * todos los participantes; con una decena de jugadores la partida superaba el
 * límite de 16 MB por documento de MongoDB. Aquí solo van los metadatos, que es
 * lo que necesitan la interfaz (para pintar las tarjetas) y `computeStaleness`
 * (para saber a quién le falta dosier).
 */
export function renderDocumentIndex(game: GameSession): PlayerDocument[] {
  const plot = game.plot;
  if (!plot) return [];
  const dosieres = dosieresDe(game.settings?.juego);
  if (!dosieres) return [];

  const indice: PlayerDocument[] = personasDe(game).map((sospechoso) => ({
    id: sospechoso.id,
    title: dosieres.tituloDeUno(game, plot, sospechoso.id),
  }));

  /*
   * Y LOS QUE NO SON DE NADIE, si el juego los tiene.
   *
   * Aquí estaba escrito a mano: «si el juego no trae los suyos, añade el dosier
   * de quien dirige y el sobre de la solución». Los dos son de CLUEDO —hablan
   * de la víctima y del arma— así que el núcleo estaba preguntando «¿eres de
   * los que traen los suyos?», que es la forma educada de decir «¿eres CLUEDO o
   * eres una excepción?». Ahora CLUEDO los registra como los demás y aquí no
   * queda ningún caso por defecto.
   */
  for (const suelto of dosieres.deLaMesa?.(game, plot) ?? []) {
    indice.push({ id: suelto.id, title: suelto.titulo });
  }
  return indice;
}

/**
 * Genera bajo demanda el dosier de UN participante ('gm' para el del Game
 * Master). Devuelve null si esa persona no forma parte de la partida.
 */
export function renderPlayerDocument(
  game: GameSession,
  suspectId: string,
  opciones: DocumentRenderOptions = {},
): PlayerDocument | null {
  const plot = game.plot;
  if (!plot) return null;
  const dosieres = dosieresDe(game.settings?.juego);
  if (!dosieres) return null;

  /*
   * LOS QUE NO SON DE NADIE VAN PRIMERO, porque sus ids —`gm`, `solution`— no
   * pertenecen a ninguna persona de la mesa y buscarlos entre los participantes
   * no encontraría nada.
   */
  const suelto = dosieres.deLaMesa?.(game, plot).find((d) => d.id === suspectId);
  if (suelto) return { id: suspectId, title: suelto.titulo, html: suelto.html(opciones) };

  if (!personasDe(game).some((s) => s.id === suspectId)) return null;

  const html = dosieres.deUno(game, plot, suspectId, opciones);
  if (html === null) return null;
  return { id: suspectId, title: dosieres.tituloDeUno(game, plot, suspectId), html };
}

/**
 * Genera el dosier COMPLETO (con HTML) de cada jugador más los de la mesa.
 * Pensado para exportaciones en bloque; no lo uses para guardar en la partida
 * —para eso está `renderDocumentIndex`—.
 */
export function renderPlayerDocuments(
  game: GameSession,
  opciones: DocumentRenderOptions = {},
): PlayerDocument[] {
  const plot = game.plot;
  if (!plot) return [];
  const documentos: PlayerDocument[] = [];
  for (const sospechoso of personasDe(game)) {
    const doc = renderPlayerDocument(game, sospechoso.id, opciones);
    if (doc) documentos.push(doc);
  }
  for (const suelto of dosieresDe(game.settings?.juego)?.deLaMesa?.(game, plot) ?? []) {
    documentos.push({ id: suelto.id, title: suelto.titulo, html: suelto.html(opciones) });
  }
  return documentos;
}
