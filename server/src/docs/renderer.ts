/**
 * Renderizador de los dosieres HTML de la partida.
 *
 * Genera un documento autocontenido por jugador (más el dosier del Game
 * Master) con estética de pergamino art-decó, pensado tanto para leerse en
 * pantalla como para imprimirse en A4. Las fotos aportadas se incrustan como
 * data URI cuando el fichero existe en disco, de modo que el HTML descargado
 * siga funcionando sin conexión con el servidor.
 */
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config';
import { styleNoteForGm } from '../plot/style';
import { barraDeImpresion, hojaDeEstilos } from './estilos';
import { DOCUMENT_SECTIONS } from '../../../shared/types';
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

/** Escapa texto para insertarlo con seguridad en el HTML. */
function esc(value: string | undefined | null): string {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
function comoDataUri(url: string | undefined): string | undefined {
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
function monograma(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const primera = partes[0]?.charAt(0) ?? '';
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.charAt(0) ?? '') : '';
  return (primera + ultima).toUpperCase() || '?';
}

function retrato(nombre: string, photoUrl: string | undefined, clase: string): string {
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


// ---------------------------------------------------------------------------
// Bloques reutilizables
// ---------------------------------------------------------------------------

function bloqueDato(etiqueta: string, valor: string | undefined): string {
  if (!valor?.trim()) return '';
  return `<p class="dato"><span class="etiqueta">${esc(etiqueta)}</span>${esc(valor)}</p>`;
}

function seccionSospechosos(game: GameSession, plot: Plot): string {
  const personajePorId = new Map(plot.characters.map((c) => [c.suspectId, c]));
  const fichas = game.suspects
    .map((sospechoso) => {
      const personaje = personajePorId.get(sospechoso.id);
      return `<div class="ficha">
        ${retrato(sospechoso.name, sospechoso.photoUrl, 'retrato')}
        <div class="nombre">${esc(personaje?.characterName ?? sospechoso.name)}</div>
        ${personaje ? `<div class="papel">${esc(personaje.role)}</div>` : ''}
        ${personaje && personaje.characterName !== sospechoso.name ? `<div class="nota">interpretado por ${esc(sospechoso.name)}</div>` : ''}
      </div>`;
    })
    .join('');
  return `<section>
    <h2>Los sospechosos</h2>
    <div class="rejilla">${fichas}</div>
  </section>`;
}

function seccionArmas(game: GameSession): string {
  if (game.weapons.length === 0) return '';
  const fichas = game.weapons
    .map(
      (arma: Weapon) => `<div class="ficha ficha--objeto">
        ${retrato(arma.name, arma.photoUrl, 'retrato')}
        <div class="nombre">${esc(arma.name)}</div>
        ${arma.description ? `<div class="nota">${esc(arma.description)}</div>` : ''}
      </div>`,
    )
    .join('');
  return `<section>
    <h2>Los objetos del crimen</h2>
    <p class="text-dim"><em>Cualquiera de ellos pudo ser el arma. Solo uno lo fue.</em></p>
    <div class="rejilla">${fichas}</div>
  </section>`;
}

function seccionEscenario(game: GameSession): string {
  if (game.boardMode === 'aerial') {
    const imagen = comoDataUri(game.boardImageUrl);
    const conChincheta = game.rooms.filter((sala) => sala.pin);
    const chinchetas = conChincheta
      .map(
        (sala, indice) =>
          `<span class="chincheta" style="left:${((sala.pin?.x ?? 0) * 100).toFixed(2)}%;top:${((sala.pin?.y ?? 0) * 100).toFixed(2)}%" title="${esc(sala.name)}">${indice + 1}</span>`,
      )
      .join('');
    const leyenda = conChincheta
      .map(
        (sala, indice) =>
          `<li><span class="num">${indice + 1}</span>${esc(sala.name)}${sala.description ? ` — <em>${esc(sala.description)}</em>` : ''}</li>`,
      )
      .join('');
    return `<section>
      <h2>El escenario</h2>
      ${
        imagen
          ? `<div class="aerea"><img src="${esc(imagen)}" alt="Plano aéreo del lugar" />${chinchetas}</div>`
          : '<p><em>El anfitrión aún no ha aportado el plano del lugar.</em></p>'
      }
      <ol class="leyenda">${leyenda}</ol>
    </section>`;
  }

  if (!game.board) return '';
  const leyenda = game.rooms
    .map(
      (sala, indice) =>
        `<li><span class="num">${indice + 1}</span>${esc(sala.name)}${sala.description ? ` — <em>${esc(sala.description)}</em>` : ''}</li>`,
    )
    .join('');
  const pasadizos = game.board.passages
    .map((pasadizo) => {
      const desde = game.rooms.find((sala) => sala.id === pasadizo.fromRoomId)?.name ?? '';
      const hasta = game.rooms.find((sala) => sala.id === pasadizo.toRoomId)?.name ?? '';
      return `<li>${esc(desde)} ⇄ ${esc(hasta)}</li>`;
    })
    .join('');
  return `<section>
    <h2>El escenario</h2>
    ${renderBoardSvg(game.board, game.rooms)}
    <ol class="leyenda">${leyenda}</ol>
    ${
      pasadizos
        ? `<div class="caja" style="margin-top:20px">
             <h3>Pasadizos secretos</h3>
             <ul style="margin:0;padding-left:20px">${pasadizos}</ul>
             <p style="margin:10px 0 0;font-style:italic">Atravesarlos cuesta un turno completo y permite aparecer al otro lado de la casa sin ser visto.</p>
           </div>`
        : ''
    }
  </section>`;
}

/*
 * Reglas del CLUEDO EN VIVO.
 *
 * Ojo: NO son las del Cluedo de tablero. Allí cada jugador tiene cartas que
 * permiten refutar formalmente una sugerencia; aquí cada uno tiene un dosier
 * narrativo y no puede «desmentir» una combinación, así que esa mecánica se
 * sustituye por preguntas dirigidas. Y como la información está repartida, hay
 * una obligación mínima de compartir: sin ella, dos jugadores callados podrían
 * dejar el caso sin resolver.
 */
const REGLAS_EN_VIVO = [
  '<b>El objetivo.</b> Alguien de esta casa es un asesino. Debes descubrir <b>quién</b> lo hizo, <b>con qué objeto</b> y <b>en qué sala</b>. Gana quien acierte los tres elementos en la acusación final.',
  '<b>Tu personaje.</b> Interpreta al personaje de este dosier durante toda la velada. Tu forma de ser, tus opiniones y tus intenciones son tuyas; los hechos que el dosier da por ciertos, no.',
  '<b>Qué puedes ocultar y qué no.</b> Puedes callar, desviar la atención y mentir sobre tus <i>opiniones, intenciones y sospechas</i>. <b>No</b> puedes negar un hecho que tu dosier afirme expresamente, mentir sobre dónde estuviste realmente, inventarte pruebas ni cambiar lo que dice una pista. Sobre una prueba puedes discutir su <i>interpretación</i>, nunca su contenido.',
  '<b>Tu secreto.</b> Todos escondéis algo, y casi ninguno es el crimen. Revélalo cuando te acorralen con algo concreto o cuando te convenga; nadie puede obligarte.',
  '<b>Las rondas.</b> El Game Master abre y cierra cada ronda. Durante una ronda te desplazas a una sala y conversas con quien esté allí.',
  '<b>Preguntas dirigidas.</b> En cada ronda puedes hacer <b>una pregunta directa</b> a alguien que esté en tu sala. Puede responder con la verdad, dar una respuesta parcial o negarse a contestar —negarse también dice cosas—. Lo que no puede es contradecir un hecho de su dosier.',
  '<b>Hipótesis.</b> Puedes lanzar en voz alta la combinación que sospeches (persona, objeto y sala) para provocar reacciones, pero <b>nadie está obligado a refutarla</b>: aquí no hay cartas que enseñar. Solo cuenta la acusación final.',
  '<b>Pistas.</b> El Game Master saca pruebas nuevas en cada ronda. Las que encuentres son tuyas para enseñarlas o guardarlas… pero al cerrar cada ronda, <b>cada sala pone en común un hecho verificable</b> y las pruebas físicas halladas pasan al tablón común. Los secretos personales siguen siendo privados.',
  '<b>Pasadizos.</b> Si el plano marca un pasadizo secreto entre dos salas, puedes usarlo para cruzar la casa sin pasar por el pasillo. Nadie te verá salir.',
  '<b>La acusación final.</b> En la última ronda cada jugador escribe su acusación: persona, objeto y sala. Se acusa <b>una sola vez</b> y por escrito, a la vez que los demás.',
  '<b>El desenlace.</b> Se lee la solución. Quien haya acertado los tres elementos resuelve el caso; si nadie acierta, el asesino se sale con la suya.',
  '<b>La regla de oro.</b> Todo lo de esta noche es ficción. Interpreta con generosidad y deja brillar a los demás.',
];

function seccionReglas(): string {
  return `<section>
    <h2>Cómo se juega</h2>
    <p><em>Aunque nunca hayas jugado al Cluedo, con estas diez reglas te bastará.</em></p>
    <ol class="reglas">${REGLAS_EN_VIVO.map((regla) => `<li>${regla}</li>`).join('')}</ol>
  </section>`;
}

/**
 * Cronología pública: se ocultan los eventos que implican en exclusiva al
 * asesino, porque delatarían el crimen antes de tiempo.
 */
function cronologiaPublica(plot: Plot): TimelineEvent[] {
  return plot.timeline.filter((evento) => {
    // Regla principal: solo lo que presenciaron todos.
    if (evento.isPublic !== true) return false;
    // Cinturón y tirantes: aunque el modelo marcara como público un momento que
    // implica a una sola persona, eso no lo vio nadie más. Fuera.
    if (evento.suspectIds.length === 1) return false;
    return true;
  });
}

function seccionCronologia(eventos: TimelineEvent[], titulo: string, nota: string): string {
  if (eventos.length === 0) return '';
  const filas = eventos
    .map(
      (evento) =>
        `<li><span class="hora">${esc(evento.time)}</span><span>${esc(evento.description)}</span></li>`,
    )
    .join('');
  return `<section>
    <h2>${esc(titulo)}</h2>
    <p><em>${esc(nota)}</em></p>
    <ol class="crono">${filas}</ol>
  </section>`;
}

function envolver(titulo: string, contenido: string, opciones: DocumentRenderOptions = {}): string {
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
// Dosier de jugador
// ---------------------------------------------------------------------------

/**
 * ¿Va incluida esta sección en los dosieres de esta partida?
 * Sin selección guardada van todas; las obligatorias van siempre.
 */
function incluye(game: GameSession, seccion: DocumentSectionId): boolean {
  const info = DOCUMENT_SECTIONS.find((s) => s.id === seccion);
  if (info?.required) return true;
  const elegidas = game.settings?.documentSections;
  if (!elegidas || elegidas.length === 0) return true;
  return elegidas.includes(seccion);
}

/** Título del dosier de un jugador (compartido por el índice y el render). */
function tituloJugador(plot: Plot, sospechoso: Suspect): string {
  return `${plot.title} — Dosier de ${sospechoso.name}`;
}

/** Título del dosier del Game Master (distinto si juega a ciegas). */
function tituloGameMaster(plot: Plot, aCiegas = false): string {
  return aCiegas
    ? `${plot.title} — Guía de la velada (a ciegas)`
    : `${plot.title} — Dosier del Game Master`;
}

/** Título del sobre sellado con la solución. */
function tituloSolucion(plot: Plot): string {
  return `${plot.title} — El sobre del crimen`;
}

function dosierJugador(
  opciones: DocumentRenderOptions,
  game: GameSession,
  plot: Plot,
  sospechoso: Suspect,
  personaje: PlotCharacter | undefined,
): PlayerDocument {
  const esAsesino = plot.solution.murdererId === sospechoso.id;
  const nombrePersonaje = personaje?.characterName ?? sospechoso.name;
  const armaDelCrimen = game.weapons.find((arma) => arma.id === plot.solution.weaponId);
  const salaDelCrimen = game.rooms.find((sala) => sala.id === plot.solution.roomId);

  const portada = `<div class="portada">
    <span class="sello">Confidencial · solo para sus ojos</span>
    <h1>${esc(plot.title)}</h1>
    <p class="lema">${esc(plot.tagline)}</p>
    <p class="destinatario">Dosier de<strong>${esc(sospechoso.name)}</strong></p>
  </div>`;

  const seccionPersonaje = personaje
    ? `<section>
      <h2>Tu personaje</h2>
      <div class="protagonista">
        ${retrato(sospechoso.name, sospechoso.photoUrl, 'retrato-grande')}
        <div style="flex:1">
          <h3 style="font-size:24px;color:#1a3f2a;font-family:'Cinzel Decorative',serif">${esc(nombrePersonaje)}</h3>
          ${bloqueDato('Papel en la casa', personaje.role)}
          ${bloqueDato('Quién crees ser ante los demás', personaje.publicPersona)}
          ${bloqueDato('Tu motivo', personaje.motive)}
          ${bloqueDato('Tu coartada', personaje.alibi)}
        </div>
      </div>

      ${
        incluye(game, 'secret')
          ? `<div class="caja caja--secreto" style="margin-top:24px">
              <div class="titulo-secreto">⚑ Tu secreto — no lo compartas a la ligera</div>
              <p style="margin:0">${esc(personaje.secret)}</p>
            </div>`
          : ''
      }

      ${
        incluye(game, 'knowledge') && personaje.knowledge.length > 0
          ? `<div class="caja" style="margin-top:18px">
              <h3>Lo que sabes de los demás</h3>
              <ul style="margin:0;padding-left:20px">
                ${personaje.knowledge.map((dato) => `<li>${esc(dato)}</li>`).join('')}
              </ul>
            </div>`
          : ''
      }

      ${
        personaje.personalHook
          ? `<div class="caja" style="margin-top:18px">
              <h3>Cómo interpretarlo</h3>
              <p style="margin:0">${esc(personaje.personalHook)}</p>
            </div>`
          : ''
      }

      ${
        esAsesino
          ? `<div class="caja caja--asesino" style="margin-top:22px">
              <div class="titulo-secreto">☠ Tú eres el asesino</div>
              <p><strong>Mataste a ${esc(plot.victim.name)}${armaDelCrimen ? ` con ${esc(armaDelCrimen.name)}` : ''}${salaDelCrimen ? `, en ${esc(salaDelCrimen.name)}` : ''}.</strong></p>
              <p>${esc(plot.solution.howItHappened)}</p>
              <p style="margin-bottom:0"><em>Cómo jugarlo sin delatarte:</em> participa en las conversaciones con normalidad y acusa a otros con moderación —quien más grita, antes cae—. Puedes mentir sobre tu coartada, pero mantén siempre la misma versión: las contradicciones son lo primero que se detecta. Si alguien te acorrala con una prueba, admite un detalle menor para ganar credibilidad y desvía la atención hacia el secreto de otro invitado.</p>
            </div>`
          : ''
      }
    </section>`
    : '';

  // Cada bloque se incluye solo si el Game Master lo dejó activo en la maqueta.
  const contenido = [
    portada,
    seccionPersonaje,
    incluye(game, 'case')
      ? `<section>
      <h2>El caso</h2>
      <div class="caja">
        <h3>La víctima: ${esc(plot.victim.name)}</h3>
        <p>${esc(plot.victim.description)}</p>
      </div>
      <p style="margin-top:20px">${esc(plot.synopsis)}</p>
      ${bloqueDato('El lugar', plot.setting)}
    </section>`
      : '',
    incluye(game, 'rules') ? seccionReglas() : '',
    incluye(game, 'suspects') ? seccionSospechosos(game, plot) : '',
    incluye(game, 'weapons') ? seccionArmas(game) : '',
    incluye(game, 'board') ? seccionEscenario(game) : '',
    incluye(game, 'timeline')
      ? seccionCronologia(
          cronologiaPublica(plot),
          'Cronología de la velada',
          'Lo que todo el mundo sabe que ocurrió. Nadie ha contado todavía lo que hizo cuando nadie miraba.',
        )
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    suspectId: sospechoso.id,
    title: tituloJugador(plot, sospechoso),
    html: envolver(`${plot.title} — ${sospechoso.name}`, contenido, opciones),
  };
}

// ---------------------------------------------------------------------------
// Dosier del Game Master
// ---------------------------------------------------------------------------

/**
 * Sobre sellado: SOLO la solución. Se genera cuando el Game Master juega como
 * personaje, para que nadie —él tampoco— sepa quién fue hasta el final.
 */
function dosierSolucion(opciones: DocumentRenderOptions, game: GameSession, plot: Plot): PlayerDocument {
  const asesino = game.suspects.find((s) => s.id === plot.solution.murdererId);
  const arma = game.weapons.find((w) => w.id === plot.solution.weaponId);
  const sala = game.rooms.find((r) => r.id === plot.solution.roomId);
  const personaje = plot.characters.find((c) => c.suspectId === plot.solution.murdererId);

  const contenido = `<div class="portada">
      <span class="sello">No abrir hasta el final de la velada</span>
      <h1>El sobre del crimen</h1>
      <p class="lema">${esc(plot.tagline)}</p>
      <p class="destinatario">Solución de<strong>${esc(plot.title)}</strong></p>
    </div>

    <section>
      <div class="caja caja--asesino">
        <div class="titulo-secreto">☠ La solución</div>
        <p style="font-size:23px;font-family:'Cinzel',serif;color:#4a0f1c;margin:6px 0 18px">
          ${esc(asesino?.name ?? '—')}${personaje ? ` — ${esc(personaje.characterName)}` : ''}<br />
          con ${esc(arma?.name ?? '—')}, en ${esc(sala?.name ?? '—')}
        </p>
        ${bloqueDato('Motivo', plot.solution.motive)}
        ${bloqueDato('Cómo ocurrió', plot.solution.howItHappened)}
      </div>
      <p style="margin-top:22px;font-style:italic;text-align:center">
        Léelo en voz alta cuando todos hayan entregado su acusación por escrito.
      </p>
    </section>`;

  return {
    suspectId: 'solution',
    title: tituloSolucion(plot),
    html: envolver(`${plot.title} — Solución`, contenido, opciones),
  };
}

/**
 * Dosier del Game Master. Si `settings.gmPlays` está activo se genera en modo
 * CIEGO: conserva el guion, las pistas por rondas y la cronología completa que
 * necesita para conducir la velada, pero SIN la solución ni los secretos de los
 * jugadores, que se van al sobre sellado.
 */
function dosierGameMaster(opciones: DocumentRenderOptions, game: GameSession, plot: Plot): PlayerDocument {
  const nombreDe = (id: string): string =>
    game.suspects.find((sospechoso) => sospechoso.id === id)?.name ?? id;
  const asesino = game.suspects.find((s) => s.id === plot.solution.murdererId);
  const arma = game.weapons.find((w) => w.id === plot.solution.weaponId);
  const sala = game.rooms.find((r) => r.id === plot.solution.roomId);

  const portada = `<div class="portada">
    <span class="sello">Confidencial · Game Master</span>
    <h1>${esc(plot.title)}</h1>
    <p class="lema">${esc(plot.tagline)}</p>
    <p class="destinatario">Dosier del<strong>Game Master</strong></p>
  </div>`;

  const solucion = `<section>
    <div class="caja caja--asesino">
      <div class="titulo-secreto">☠ La solución del caso</div>
      <p style="font-size:21px;font-family:'Cinzel',serif;color:#4a0f1c;margin:6px 0 16px">
        ${esc(asesino?.name ?? '—')} · ${esc(arma?.name ?? '—')} · ${esc(sala?.name ?? '—')}
      </p>
      ${bloqueDato('Motivo', plot.solution.motive)}
      ${bloqueDato('Cómo ocurrió', plot.solution.howItHappened)}
    </div>
  </section>`;

  const estilo = styleNoteForGm(game);
  const guion = `<section>
    <h2>Guion de la velada</h2>
    ${
      estilo
        ? `<div class="caja caja--gm" style="margin-bottom:20px">
             <h3>Tono de la velada</h3>
             <p style="margin:0">${esc(estilo)}</p>
             <p style="margin:10px 0 0;font-style:italic">Mantén este registro al narrar, al presentar a los invitados y al revelar la solución: el texto de los dosieres ya está escrito en ese tono.</p>
           </div>`
        : ''
    }
    <ol class="reglas">${plot.gmScript.map((paso) => `<li>${esc(paso)}</li>`).join('')}</ol>
  </section>`;

  // Las pistas se entregan POR RONDAS: sacarlas todas de golpe permite cerrar
  // el caso en la primera media hora y arruina los señuelos.
  const ETIQUETA_RONDA: Record<number, string> = {
    1: 'Ronda 1 · Motivos, conflictos y señuelos',
    2: 'Ronda 2 · Objetos desplazados y coartadas incompletas',
    3: 'Ronda 3 · Horarios, trayectos y contradicciones',
    4: 'Ronda 4 · Evidencias decisivas',
  };
  const porRonda = new Map<number, typeof plot.clues>();
  for (const pista of plot.clues) {
    const ronda = Number.isInteger(pista.round) && pista.round >= 1 && pista.round <= 4 ? pista.round : 1;
    porRonda.set(ronda, [...(porRonda.get(ronda) ?? []), pista]);
  }

  // A ciegas se listan las pistas (hay que repartirlas) pero NO qué señalan:
  // «Señala X como el arma del crimen» destriparía el caso al propio GM.
  const ciego = game.settings?.gmPlays === true;

  const pistas =
    plot.clues.length > 0
      ? `<section>
          <h2>Las pistas, ronda a ronda</h2>
          <p><em>Prepara un sobre por ronda. No pongas todas las pruebas sobre la mesa desde el principio: las de la ronda 4 cierran el caso.${ciego ? ' Como juegas a ciegas, no se indica qué señala cada una: repártelas sin leerlas más de lo necesario.' : ''}</em></p>
          ${[1, 2, 3, 4]
            .filter((ronda) => (porRonda.get(ronda) ?? []).length > 0)
            .map(
              (ronda) => `<div class="caja caja--gm" style="margin-bottom:16px">
                <h3>${esc(ETIQUETA_RONDA[ronda] ?? `Ronda ${ronda}`)}</h3>
                <ol class="crono">
                  ${(porRonda.get(ronda) ?? [])
                    .map((pista) => {
                      const nombreSala = pista.roomId
                        ? (game.rooms.find((sala) => sala.id === pista.roomId)?.name ?? '')
                        : '';
                      return `<li>
                        <span class="hora">${esc(nombreSala || '—')}</span>
                        <span>${esc(pista.description)}${
                          ciego
                            ? ''
                            : `<br /><em style="color:#6d1a2a">Señala a: ${esc(pista.pointsTo)}</em>`
                        }</span>
                      </li>`;
                    })
                    .join('')}
                </ol>
              </div>`,
            )
            .join('')}
        </section>`
      : '';

  const secretos = `<section>
    <h2>Secretos y coartadas de todos</h2>
    ${plot.characters
      .map(
        (personaje) => `<div class="caja caja--gm" style="margin-bottom:16px">
          <h3>${esc(personaje.characterName)} — ${esc(nombreDe(personaje.suspectId))}</h3>
          ${bloqueDato('Papel', personaje.role)}
          ${bloqueDato('Secreto', personaje.secret)}
          ${bloqueDato('Motivo', personaje.motive)}
          ${bloqueDato('Coartada', personaje.alibi)}
          ${
            personaje.knowledge.length > 0
              ? `<p class="dato"><span class="etiqueta">Sabe que</span>${personaje.knowledge.map((dato) => esc(dato)).join(' · ')}</p>`
              : ''
          }
        </div>`,
      )
      .join('')}
  </section>`;

  // Modo ciego: el Game Master también juega, así que su guía conserva lo que
  // necesita para conducir la velada pero pierde la solución, los secretos
  // ajenos y la cronología secreta. Todo eso se va al sobre sellado.
  const aCiegas = game.settings?.gmPlays === true;

  const avisoCiego = aCiegas
    ? `<section>
        <div class="caja caja--gm">
          <h3>Guía a ciegas: tú también juegas</h3>
          <p>Este documento NO contiene la solución ni los secretos de los demás: los tienes en tu
          propio dosier de jugador, como cualquier invitado, y el crimen está en un sobre aparte
          que nadie debe abrir hasta el final.</p>
          <p style="margin-bottom:0">Aquí tienes lo justo para conducir la velada sin ventaja:
          el guion, los sobres de pistas por ronda y qué leer en voz alta. Investiga en igualdad
          de condiciones… y desconfía de ti mismo.</p>
        </div>
      </section>`
    : '';

  const contenido = [
    portada,
    avisoCiego,
    aCiegas ? '' : solucion,
    `<section>
      <h2>El caso</h2>
      <div class="caja">
        <h3>La víctima: ${esc(plot.victim.name)}</h3>
        <p>${esc(plot.victim.description)}</p>
      </div>
      <p style="margin-top:20px">${esc(plot.synopsis)}</p>
      ${bloqueDato('El lugar', plot.setting)}
    </section>`,
    guion,
    aCiegas
      ? seccionCronologia(
          cronologiaPublica(plot),
          'Cronología pública',
          'Solo lo que presenciaron todos: el resto lo descubrirás jugando, como los demás.',
        )
      : seccionCronologia(
          plot.timeline,
          'Cronología completa',
          'Incluye los movimientos que los jugadores no conocen: no la leas en voz alta.',
        ),
    pistas,
    aCiegas ? '' : secretos,
    seccionEscenario(game),
    seccionReglas(),
  ]
    .filter(Boolean)
    .join('\n');

  return {
    suspectId: 'gm',
    title: tituloGameMaster(plot, aCiegas),
    html: envolver(`${plot.title} — Game Master`, contenido, opciones),
  };
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
  const aCiegas = game.settings?.gmPlays === true;
  const indice: PlayerDocument[] = game.suspects.map((sospechoso) => ({
    suspectId: sospechoso.id,
    title: tituloJugador(plot, sospechoso),
  }));
  indice.push({ suspectId: 'gm', title: tituloGameMaster(plot, aCiegas) });
  // Con el Game Master jugando, la solución vive en su propio sobre sellado.
  if (aCiegas) indice.push({ suspectId: 'solution', title: tituloSolucion(plot) });
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

  if (suspectId === 'gm') return dosierGameMaster(opciones, game, plot);
  if (suspectId === 'solution') return dosierSolucion(opciones, game, plot);

  const sospechoso = game.suspects.find((s) => s.id === suspectId);
  if (!sospechoso) return null;
  const personaje = plot.characters.find((c) => c.suspectId === suspectId);
  return dosierJugador(opciones, game, plot, sospechoso, personaje);
}

/**
 * Genera el dosier COMPLETO (con HTML) de cada jugador más el del Game Master.
 * Pensado para exportaciones en bloque; no lo uses para guardar en la partida
 * —para eso está `renderDocumentIndex`—.
 */
export function renderPlayerDocuments(
  game: GameSession,
  opciones: DocumentRenderOptions = {},
): PlayerDocument[] {
  const plot = game.plot;
  if (!plot) return [];
  const personajePorId = new Map(plot.characters.map((personaje) => [personaje.suspectId, personaje]));
  const documentos = game.suspects.map((sospechoso) =>
    dosierJugador(opciones, game, plot, sospechoso, personajePorId.get(sospechoso.id)),
  );
  documentos.push(dosierGameMaster(opciones, game, plot));
  if (game.settings?.gmPlays === true) documentos.push(dosierSolucion(opciones, game, plot));
  return documentos;
}
