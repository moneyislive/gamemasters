/**
 * Manual del Game Master: el documento que se tiene en la mano toda la noche.
 *
 * Se adapta al modo de la partida. A ciegas conserva todo lo que hace falta
 * para dirigir —estructura, salas activas, códigos de sobre, qué leer en voz
 * alta— y no lleva ni la solución, ni el texto de las pistas, ni los giros, ni
 * el desenlace. En modo anfitrión se le añade una segunda parte con el mapa
 * completo del caso.
 */
import { inventarioSobres, numeroDeRondas, pistasPorRonda, salasActivas } from '../../datos';
import { esc } from '../../html';
import { envolver, portada } from '../comun';
import type { VistaGm } from '../../contexto';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../../shared/types';
import { culpableDe, lugarDe, objetoDe, objetosDe, salasDe, sospechososDe } from '../../../juegos/cluedo';

function lista(elementos: string[]): string {
  return `<ul>${elementos.map((e) => `<li>${e}</li>`).join('')}</ul>`;
}

function control(elementos: string[]): string {
  return `<ul class="control">${elementos.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>`;
}

/** Reglas que el Game Master lee literalmente al empezar. */
const REGLAS_EN_VIVO = [
  'La investigación es individual: no hay equipos, ni grupos asignados, ni portavoces.',
  'Cada cual elige libremente en qué sala está y con quién habla.',
  'En cada ronda hay salas con evidencia nueva. Las demás siguen abiertas para conversar.',
  'A mitad de ronda podéis cambiar de sala una sola vez. Usar un pasadizo consume ese cambio.',
  'Lo que encuentras en una sala es tuyo. No hay tablón común: si quieres que se sepa, cuéntalo tú.',
  'Podéis mentir sobre vuestros secretos. No podéis inventar una versión distinta de la que pone vuestro dosier.',
  'Nadie puede enseñar su dosier a nadie. Contarlo, sí. Enseñarlo, no.',
  'La acusación final es simultánea, escrita y única. No se cambia.',
];

export function manualGm(
  game: GameSession,
  plot: Plot,
  vista: VistaGm,
  opciones: DocumentRenderOptions,
): string {
  const rondas = numeroDeRondas(plot);
  const sobres = inventarioSobres(game, plot);
  const porRonda = pistasPorRonda(plot);
  const material = plot.material;
  const narracion = (ronda: number) => material?.narrations.find((n) => n.round === ronda);

  const apertura = narracion(0);

  // ---- Cabecera según el modo ----
  const encabezado = vista.hayPreparador
    ? `    <div class="aviso">
      Principio de ceguera<br />
      Este manual no dice quién fue, ni con qué, ni dónde
    </div>

    <div class="caja caja--roja junto">
      <p style="margin:0;">
        Vas a dirigir <strong>y jugar</strong>. Para que eso funcione, otra persona prepara el
        material: ella recorta, ensobra y coloca. Tú no abres los dosieres de los demás, ni los
        sobres de pistas, ni el desenlace, hasta que este guion te lo diga.
      </p>
    </div>`
    : `    <div class="caja caja--verde junto">
      <span class="etiqueta">Diriges y lo sabes todo</span>
      <p style="margin:0;">
        Conoces la solución, así que preparas el material tú mismo. La segunda parte de este
        manual —a partir de «El caso, por dentro»— es la que <strong>no puede ver nadie más</strong>.
        Imprímelo a doble cara y no lo dejes sobre la mesa.
      </p>
    </div>`;

  // ---- Una página por ronda ----
  const paginasDeRonda = Array.from({ length: rondas }, (_, indice) => {
    const ronda = indice + 1;
    const salas = salasActivas(game, plot, ronda);
    const codigos = sobres
      .filter((s) => s.grupo === 'Pistas' && s.codigo.startsWith(`R${ronda}-`))
      .map((s) => s.codigo);
    const n = narracion(ronda);

    const bloqueNarracion = n
      ? `      <div class="caja junto">
        <span class="etiqueta">Lee en voz alta</span>
        <p style="margin:0 0 2mm; font-size:13pt;">${esc(n.text)}</p>
        ${n.stageDirection ? `<p style="margin:0; font-style:italic; color:#6b5638;">${esc(n.stageDirection)}</p>` : ''}
      </div>`
      : `      <div class="caja junto" style="border-style:dashed;">
        <span class="etiqueta">Lee en voz alta</span>
        <p style="margin:0; font-style:italic;">
          Esta partida no tiene material escrito. Abre la ronda con tus palabras: nombra las salas
          con evidencia nueva y recuerda cuánto tiempo hay.
        </p>
      </div>`;

    return `  <section class="pagina">
    <h2>Ronda ${ronda} de ${rondas}</h2>

    <div class="caja caja--verde junto">
      <span class="etiqueta">Salas con evidencia nueva · anúncialas</span>
      <p style="margin:0; font-size:14pt;">${salas.length ? esc(salas.map((s) => s.name).join(' · ')) : '<em>ninguna: esta ronda es solo de conversación</em>'}</p>
    </div>

${bloqueNarracion}

    <div class="caja junto">
      <span class="etiqueta">Sobres que se abren en esta ronda</span>
      <p style="margin:0; font-family:'Cinzel',serif; font-size:12pt; letter-spacing:0.08em; color:#6d1a2a;">
        ${codigos.length ? esc(codigos.join(' · ')) : '—'}
      </p>
      <p style="margin:2mm 0 0; font-size:11pt; font-style:italic;">
        ${vista.hayPreparador ? 'No los abras tú: los abren los jugadores en la sala.' : 'Colócalos en su sala antes de empezar la ronda.'}
      </p>
    </div>

    <div class="caja junto">
      <span class="etiqueta">Control de la ronda</span>
      ${control([
        'He anunciado las salas con evidencia nueva.',
        'He leído la narración y he puesto el reloj en marcha.',
        'He avisado a mitad de ronda del único cambio de sala.',
        'Al cerrar, he recordado que cada cual guarda lo suyo y que hablar es cosa de ellos.',
        ...(material?.timelineReveals.some((r) => r.round === ronda)
          ? [`He ${vista.hayPreparador ? 'abierto' : 'colocado'} la revelación de cronología de esta ronda.`]
          : []),
        ...(material?.twists.some((t) => t.round === ronda)
          ? ['He entregado en mano los giros personales de esta ronda, sin decir a quién.']
          : []),
      ])}
    </div>
  </section>`;
  }).join('\n\n');

  // ---- Segunda parte: solo en modo anfitrión ----
  const parteB = vista.revelaSolucion
    ? `  <section class="pagina">
    <div class="aviso">Segunda parte · El caso, por dentro<br />Nadie más puede leer a partir de aquí</div>

    <h2>La solución</h2>
    <table>
      <tbody>
        <tr><td style="width:34mm;"><strong>Culpable</strong></td><td>${esc(sospechososDe(game).find((s) => s.id === culpableDe(plot.solution))?.name ?? '')} · ${esc(plot.characters.find((c) => c.suspectId === culpableDe(plot.solution))?.characterName ?? '')}</td></tr>
        <tr><td><strong>Objeto</strong></td><td>${esc(objetosDe(game).find((w) => w.id === objetoDe(plot.solution))?.name ?? '')}</td></tr>
        <tr><td><strong>Sala</strong></td><td>${esc(salasDe(game).find((r) => r.id === lugarDe(plot.solution))?.name ?? '')}</td></tr>
        <tr><td><strong>Motivo</strong></td><td>${esc(plot.solution.motive)}</td></tr>
      </tbody>
    </table>
    <div class="caja caja--roja junto">
      <span class="etiqueta">Cómo ocurrió</span>
      <p style="margin:0;">${esc(plot.solution.howItHappened)}</p>
    </div>

    <h2>Mapa de pistas</h2>
    <table>
      <thead><tr><th style="width:18mm;">Ronda</th><th style="width:36mm;">Sala</th><th>Qué es y qué señala</th></tr></thead>
      <tbody>
${[...porRonda.entries()]
  .flatMap(([ronda, pistas]) =>
    pistas.map((pista) => {
      const sala = salasDe(game).find((r) => r.id === pista.roomId)?.name ?? '—';
      return `        <tr><td>${ronda}</td><td>${esc(sala)}</td><td>${esc(pista.description)}<br /><em style="color:#6d1a2a;">${esc(pista.pointsTo)}</em></td></tr>`;
    }),
  )
  .join('\n')}
      </tbody>
    </table>
  </section>`
    : '';

  const contenido = `${portada(
    vista.hayPreparador ? 'Game Master · a ciegas' : 'Game Master',
    'Manual de la velada',
    plot.tagline,
    `${sospechososDe(game).length} jugadores · ${rondas} rondas`,
  )}

${encabezado}

    <h2>1 · Qué vas a dirigir</h2>
    <p>${esc(plot.synopsis)}</p>
    <div class="caja caja--verde junto">
      <span class="etiqueta">Tu papel</span>
      <p style="margin:0;">
        No arbitras la verdad de la historia ni interpretas las pistas: controlas el reloj, abres y
        cierras rondas, lees en voz alta y haces cumplir las reglas.
        ${vista.gmJuega ? ' Además juegas como un personaje más, así que tienes tu propio dosier.' : ''}
      </p>
    </div>

    <h2>2 · Reglas que lees en voz alta al empezar</h2>
    <div class="caja junto">${lista(REGLAS_EN_VIVO.map(esc))}</div>

    <h2>3 · Preparación de la casa</h2>
    ${control([
      'He colgado un cartel en cada sala.',
      'He colgado la línea temporal donde todos la vean.',
      'He señalado los pasadizos, si los hay.',
      'He elegido un rincón tranquilo donde puedan hablar sin que les oiga toda la casa.',
      'Cada jugador tiene su dosier cerrado y su hoja de investigación.',
      ...(vista.hayPreparador
        ? ['He recibido los sobres ya preparados y NO he abierto ninguno.']
        : ['He metido cada pista en el sobre de su sala y ronda.']),
    ])}

    <h2>4 · Cómo va una ronda</h2>
    <table>
      <thead><tr><th style="width:26mm;">Momento</th><th>Qué haces</th></tr></thead>
      <tbody>
        <tr><td class="hora">Al abrir</td><td>Lees la narración y anuncias las salas con evidencia nueva.</td></tr>
        <tr><td class="hora">Investigación</td><td>Cada cual va a una sala. Tú vigilas el reloj y no opinas.</td></tr>
        <tr><td class="hora">Mitad</td><td>Avisas: se puede cambiar de sala una vez.</td></tr>
        <tr><td class="hora">Al cerrar</td><td>Todos a hablar. Lo encontrado no se pone a la vista: se cuenta, o no.</td></tr>
      </tbody>
    </table>

${apertura ? `    <h2>5 · Apertura de la velada</h2>
    <div class="caja junto">
      <span class="etiqueta">Lee en voz alta antes de empezar</span>
      <p style="margin:0 0 2mm; font-size:13pt;">${esc(apertura.text)}</p>
      ${apertura.stageDirection ? `<p style="margin:0; font-style:italic; color:#6b5638;">${esc(apertura.stageDirection)}</p>` : ''}
    </div>` : ''}

${paginasDeRonda}

  <section class="pagina">
    <h2>Cómo responder sin estropear el misterio</h2>
    <table>
      <thead><tr><th style="width:56mm;">Si te preguntan…</th><th>Contesta</th></tr></thead>
      <tbody>
        <tr><td>«¿Esto es importante?»</td><td>«Todo lo que está sobre la mesa lo es. Decidid vosotros cuánto.»</td></tr>
        <tr><td>«¿Puede mentir?»</td><td>«Cualquiera puede mentir sobre sus secretos. Nadie puede contradecir su dosier.»</td></tr>
        <tr><td>«¿Voy bien?»</td><td>«No lo sé más que tú.» ${vista.revelaSolucion ? 'Aunque lo sepas, esa es la respuesta.' : 'Y es verdad.'}</td></tr>
        <tr><td>«¿Puedo ver tu dosier?»</td><td>«No. Cuenta lo que quieras, pero el papel no se enseña.»</td></tr>
        <tr><td>«Nos hemos atascado»</td><td>${material?.hints.length ? 'Abre la siguiente ayuda y léela a toda la mesa.' : 'Recuérdales el tramo de la cronología que sigue sin explicar.'}</td></tr>
      </tbody>
    </table>

    <h2>Acusación final</h2>
    ${control([
      'He repartido la hoja de acusación a todos a la vez.',
      'He pedido silencio absoluto mientras se rellena.',
      'He recogido todas las hojas boca abajo antes de abrir nada.',
      'Solo entonces he abierto el desenlace.',
    ])}

    <h2>Hoja de reloj</h2>
    <div class="caja junto">
      <span class="etiqueta">Anota las horas reales según empieza cada tramo</span>
      ${['Inicio', ...Array.from({ length: rondas }, (_, i) => `Ronda ${i + 1}`), 'Acusaciones', 'Desenlace']
        .map((t) => `<div class="campo"><span>${esc(t)}</span><span></span></div>`)
        .join('')}
    </div>

    <h2>Códigos de sobre</h2>
    <table>
      <thead><tr><th style="width:44mm;">Sobre</th><th>Qué contiene</th></tr></thead>
      <tbody>
${sobres
  .map((s) => `        <tr><td style="font-family:'Cinzel',serif; color:#6d1a2a;">${esc(s.codigo)}</td><td>${esc(s.contenido)}</td></tr>`)
  .join('\n')}
      </tbody>
    </table>
  </section>

${parteB}`;

  return envolver(`${plot.title} — Manual del Game Master`, contenido, opciones);
}
