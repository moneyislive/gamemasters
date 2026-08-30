/**
 * Los dosieres de CLUEDO: el de cada persona, el de quien dirige y el sobre
 * sellado de la solución.
 *
 * ═══ ESTO ERA EL CUERPO DE `renderer.ts` ═══
 *
 * Quinientas líneas —la víctima, los sospechosos, el arma, los pasadizos
 * secretos, la cronología del crimen— dentro del fichero que compone los
 * dosieres de CUALQUIER juego. Y no colgando de un `if`: eran el camino por
 * defecto. La forma de preguntarlo era `if (!manifiesto.dosieresPropios)`, o
 * sea el núcleo preguntando «¿eres de los que traen los suyos?», que es la
 * manera educada de decir «¿eres CLUEDO o eres una excepción?».
 *
 * Ahora CLUEDO se da de alta como los demás con `registrarDosieres`. El
 * renderizador no tiene caso por defecto: si un juego no registra nada, no hay
 * dosieres, y eso se ve en vez de disfrazarse del material de otro.
 *
 * No cambia una línea de lo que se imprime. Lo comprueba el maestro de oro, que
 * congela los dieciséis dosieres de la partida de referencia en sus dos
 * variantes.
 */
import { styleNoteForGm } from '../plot/style';
import { vistaGm } from './contexto';
import { cronologiaPublica, REGLAS_JUGADOR } from './datos';
import { manifiestoDe } from '../../../shared/juegos';
import { registrarDosieres } from './dosieres';
import { esc } from './html';
import { comoDataUri, envolver, monograma, renderBoardSvg, retrato } from './renderer';
import { culpableDe, lugarDe, objetoDe, objetosDe, salasDe, sospechososDe, victimaDe } from '../juegos/cluedo';
import type {
  DocumentRenderOptions,
  DocumentSectionId,
  GameSession,
  PlayerDocument,
  Plot,
  PlotCharacter,
  Suspect,
  TimelineEvent,
  Weapon,
} from '../../../shared/types';

// ---------------------------------------------------------------------------
// Bloques reutilizables
// ---------------------------------------------------------------------------

function bloqueDato(etiqueta: string, valor: string | undefined): string {
  if (!valor?.trim()) return '';
  return `<p class="dato"><span class="etiqueta">${esc(etiqueta)}</span>${esc(valor)}</p>`;
}

function seccionSospechosos(game: GameSession, plot: Plot): string {
  const personajePorId = new Map(plot.characters.map((c) => [c.participanteId, c]));
  const fichas = sospechososDe(game)
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
  if (objetosDe(game).length === 0) return '';
  const fichas = objetosDe(game)
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
    const conChincheta = salasDe(game).filter((sala) => sala.pin);
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
  const leyenda = salasDe(game)
    .map(
      (sala, indice) =>
        `<li><span class="num">${indice + 1}</span>${esc(sala.name)}${sala.description ? ` — <em>${esc(sala.description)}</em>` : ''}</li>`,
    )
    .join('');
  const pasadizos = game.board.passages
    .map((pasadizo) => {
      const desde = salasDe(game).find((sala) => sala.id === pasadizo.fromRoomId)?.name ?? '';
      const hasta = salasDe(game).find((sala) => sala.id === pasadizo.toRoomId)?.name ?? '';
      return `<li>${esc(desde)} ⇄ ${esc(hasta)}</li>`;
    })
    .join('');
  return `<section>
    <h2>El escenario</h2>
    ${renderBoardSvg(game.board, salasDe(game))}
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


function seccionReglas(game?: GameSession): string {
  /*
   * Las reglas del juego que se juega. Sin partida delante, las de CLUEDO: es
   * lo que hacia antes para todos, y conservarlo como valor por defecto es lo
   * que deja el dosier de CLUEDO byte a byte como estaba.
   */
  const manifiesto = manifiestoDe(game?.settings?.juego);
  const reglas = manifiesto.reglas ?? REGLAS_JUGADOR;
  return `<section>
    <h2>Cómo se juega</h2>
    <p><em>${esc(
      manifiesto.id === 'cluedo'
        ? 'Aunque nunca hayas jugado al Cluedo, con estas diez reglas te bastará.'
        : `Aunque nunca hayas jugado a ${manifiesto.nombre}, con estas reglas te bastará.`,
    )}</em></p>
    <ol class="reglas">${reglas.map((regla) => `<li><b>${esc(regla.titulo)}.</b> ${esc(regla.texto)}</li>`).join('')}</ol>
  </section>`;
}

/**
 * Cronología pública: se ocultan los eventos que implican en exclusiva al
 * asesino, porque delatarían el crimen antes de tiempo.
 */
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


// ---------------------------------------------------------------------------
// Dosier de jugador
// ---------------------------------------------------------------------------

/**
 * ¿Va incluida esta sección en los dosieres de esta partida?
 * Sin selección guardada van todas; las obligatorias van siempre.
 */
function incluye(game: GameSession, seccion: DocumentSectionId): boolean {
  /*
   * LAS SECCIONES SON LAS DEL JUEGO QUE SE JUEGA, no las de CLUEDO.
   *
   * `DOCUMENT_SECTIONS` son las once de CLUEDO, y el manifiesto de CLUEDO las
   * declara tal cual, así que para él esto devuelve exactamente lo mismo que
   * antes. Para la Momia no: sus secciones propias —`don`, `expedicion`,
   * `reliquias`, `ritos`— no están en esa constante, así que ninguna se
   * encontraba y las OBLIGATORIAS dejaban de serlo. Con una selección guardada
   * por el Game Master, el dosier de un expedicionario podía salir sin su don,
   * que es la sección que más se consulta durante la noche.
   */
  const info = manifiestoDe(game.settings?.juego).seccionesDeDosier.find((s) => s.id === seccion);
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
  const esAsesino = culpableDe(plot.solution) === sospechoso.id;
  const nombrePersonaje = personaje?.characterName ?? sospechoso.name;
  const armaDelCrimen = objetosDe(game).find((arma) => arma.id === objetoDe(plot.solution));
  const salaDelCrimen = salasDe(game).find((sala) => sala.id === lugarDe(plot.solution));

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
              <p><strong>Mataste a ${esc(victimaDe(plot).name)}${armaDelCrimen ? ` con ${esc(armaDelCrimen.name)}` : ''}${salaDelCrimen ? `, en ${esc(salaDelCrimen.name)}` : ''}.</strong></p>
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
        <h3>La víctima: ${esc(victimaDe(plot).name)}</h3>
        <p>${esc(victimaDe(plot).description)}</p>
      </div>
      <p style="margin-top:20px">${esc(plot.synopsis)}</p>
      ${bloqueDato('El lugar', plot.setting)}
    </section>`
      : '',
    incluye(game, 'rules') ? seccionReglas(game) : '',
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
    id: sospechoso.id,
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
  const asesino = sospechososDe(game).find((s) => s.id === culpableDe(plot.solution));
  const arma = objetosDe(game).find((w) => w.id === objetoDe(plot.solution));
  const sala = salasDe(game).find((r) => r.id === lugarDe(plot.solution));
  const personaje = plot.characters.find((c) => c.participanteId === culpableDe(plot.solution));

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
    id: 'solution',
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
    sospechososDe(game).find((sospechoso) => sospechoso.id === id)?.name ?? id;
  const asesino = sospechososDe(game).find((s) => s.id === culpableDe(plot.solution));
  const arma = objetosDe(game).find((w) => w.id === objetoDe(plot.solution));
  const sala = salasDe(game).find((r) => r.id === lugarDe(plot.solution));

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
  const ciego = !vistaGm(game).revelaPistas;

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
                        ? (salasDe(game).find((sala) => sala.id === pista.roomId)?.name ?? '')
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
          <h3>${esc(personaje.characterName)} — ${esc(nombreDe(personaje.participanteId))}</h3>
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
  const aCiegas = !vistaGm(game).revelaSolucion;

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
        <h3>La víctima: ${esc(victimaDe(plot).name)}</h3>
        <p>${esc(victimaDe(plot).description)}</p>
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
    seccionReglas(game),
  ]
    .filter(Boolean)
    .join('\n');

  return {
    id: 'gm',
    title: tituloGameMaster(plot, aCiegas),
    html: envolver(`${plot.title} — Game Master`, contenido, opciones),
  };
}

/*
 * EL ALTA.
 *
 * `deLaMesa` devuelve los dos que no son de nadie. El sobre sellado solo existe
 * cuando quien dirige juega: si no, la solución la tiene esa persona en su
 * propio dosier y un sobre aparte sobraría.
 */
registrarDosieres('cluedo', {
  tituloDeUno: (game, plot, participanteId) => {
    const sospechoso = sospechososDe(game).find((s) => s.id === participanteId);
    return sospechoso ? tituloJugador(plot, sospechoso) : 'Dosier';
  },
  deUno: (game, plot, participanteId, opciones) => {
    const sospechoso = sospechososDe(game).find((s) => s.id === participanteId);
    if (!sospechoso) return null;
    const personaje = plot.characters.find((c) => c.participanteId === participanteId);
    return dosierJugador(opciones, game, plot, sospechoso, personaje).html ?? null;
  },
  deLaMesa: (game, plot) => {
    const aCiegas = vistaGm(game).gmJuega;
    const mesa = [
      {
        id: 'gm',
        titulo: tituloGameMaster(plot, aCiegas),
        html: (opciones: DocumentRenderOptions) => dosierGameMaster(opciones, game, plot).html ?? '',
      },
    ];
    if (aCiegas) {
      mesa.push({
        id: 'solution',
        titulo: tituloSolucion(plot),
        html: (opciones: DocumentRenderOptions) => dosierSolucion(opciones, game, plot).html ?? '',
      });
    }
    return mesa;
  },
});
