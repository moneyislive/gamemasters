/**
 * Guía de la persona preparadora.
 *
 * Solo existe cuando el Game Master juega a ciegas: en modo anfitrión él mismo
 * prepara, y todo esto vive en su manual. Aquí se explica lo único que el
 * manual no puede decir sin romper la ceguera: a quién le toca cada cosa.
 */
import { candidatosParaGm, inventarioSobres, numeroDeRondas } from '../../datos';
import { esc } from '../../html';
import { envolver, portada } from '../comun';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../../shared/types';
import { culpableDe, lugarDe, objetoDe, objetosDe, salasDe, sospechososDe } from '../../../juegos/cluedo';

export function guiaPreparador(
  game: GameSession,
  plot: Plot,
  opciones: DocumentRenderOptions,
): string {
  const rondas = numeroDeRondas(plot);
  const sobres = inventarioSobres(game, plot);
  const candidatos = candidatosParaGm(game, plot);
  const material = plot.material;
  const nombreDe = (id: string): string => sospechososDe(game).find((s) => s.id === id)?.name ?? id;

  const tablaGiros = material?.twists.length
    ? `    <div class="caja caja--roja junto">
      <span class="etiqueta">A quién va cada giro · no aparece en las etiquetas</span>
      <table>
        <thead><tr><th style="width:30mm;">Sobre</th><th>Va dentro del dosier de</th><th style="width:30mm;">Se entrega</th></tr></thead>
        <tbody>
${material.twists
  .map(
    (giro) =>
      `          <tr><td style="font-family:'Cinzel',serif; color:#6d1a2a;">GIRO ${giro.round} · ${esc(nombreDe(giro.participanteId).toUpperCase())}</td><td>${esc(nombreDe(giro.participanteId))}</td><td>al cerrar la ronda ${giro.round}</td></tr>`,
  )
  .join('\n')}
        </tbody>
      </table>
      <p style="margin:0;">
        Las etiquetas que maneja el Game Master llevan solo el código. Si viera los nombres sabría
        qué personas tienen guion, y eso le estrecha la sospecha antes de empezar.
      </p>
    </div>`
    : `    <div class="caja junto" style="border-style:dashed;">
      <p style="margin:0;">
        Esta partida no tiene giros personales escritos. Se añaden con «Escribir el material»
        desde el panel de dosieres, sin tocar la trama.
      </p>
    </div>`;

  const contenido = `${portada(
    'Solo persona preparadora',
    'Guía del preparador',
    plot.tagline,
    'El Game Master no debe leer este documento',
  )}

    <div class="aviso">
      Este documento contiene la solución<br />
      Si vas a dirigir la velada, ciérralo ahora
    </div>

    <h2 style="margin-top:0;">1 · Qué personaje darle al Game Master</h2>
    <p>
      Tiene que ser alguien inocente y sin giro asignado: si le tocara el culpable sabría la
      solución, y si le tocara un giro tendría que actuar una revelación mientras dirige.
      ${candidatos.length ? 'Puedes elegir entre estos:' : 'No queda ningún candidato limpio: revisa el reparto antes de seguir.'}
    </p>
    ${
      candidatos.length
        ? `<div class="caja caja--verde junto">
      <span class="etiqueta">Candidatos válidos</span>
      <p style="margin:0; font-size:13.5pt;">${esc(candidatos.map((c) => c.name).join(' · '))}</p>
      <p style="margin:2mm 0 0; font-size:11pt; font-style:italic;">
        Elígelo tú y ciérraselo en un sobre. Que no lo escoja él.
      </p>
    </div>`
        : ''
    }

    <h2>2 · La solución</h2>
    <div class="caja caja--roja junto">
      <table>
        <tbody>
          <tr><td style="width:30mm;"><strong>Culpable</strong></td><td>${esc(nombreDe(culpableDe(plot.solution)))} · ${esc(plot.characters.find((c) => c.participanteId === culpableDe(plot.solution))?.characterName ?? '')}</td></tr>
          <tr><td><strong>Objeto</strong></td><td>${esc(objetosDe(game).find((w) => w.id === objetoDe(plot.solution))?.name ?? '')}</td></tr>
          <tr><td><strong>Sala</strong></td><td>${esc(salasDe(game).find((r) => r.id === lugarDe(plot.solution))?.name ?? '')}</td></tr>
        </tbody>
      </table>
      <p style="margin:0;">
        Quien interprete al culpable lo sabrá al leer su dosier. Asegúrate de que ese dosier llega
        a esa persona y no a otra.
      </p>
    </div>

    <h2>3 · Cómo ensobrar</h2>
    <ol>
      <li>Imprime las etiquetas y recórtalas.</li>
      <li>Imprime las tarjetas y recórtalas por las líneas discontinuas.</li>
      <li>Mete cada tarjeta de pista en el sobre de su código y déjalo en la sala que indica, o entrégale al Game Master un paquete cerrado por ronda.</li>
      <li>Las tarjetas de giro van <strong>dentro del dosier</strong> de quien las recibe, con el aviso de no abrirlas hasta que se anuncien.</li>
      <li>El desenlace va en un sobre opaco que nadie abre hasta recoger todas las acusaciones.</li>
    </ol>

${tablaGiros}

    <section class="pagina">
      <h2 style="margin-top:0;">4 · Orden de la velada</h2>
      <table>
        <thead><tr><th style="width:28mm;">Momento</th><th>Sobres</th></tr></thead>
        <tbody>
          <tr><td>Apertura</td><td>Los dosieres cerrados, uno por persona</td></tr>
${Array.from({ length: rondas }, (_, i) => {
  const ronda = i + 1;
  const codigos = sobres.filter((s) => s.codigo.startsWith(`R${ronda}-`)).map((s) => s.codigo);
  const extras = [
    ...(material?.timelineReveals.some((r) => r.round === ronda) ? [`CRONOLOGÍA ${ronda}`] : []),
    ...(material?.twists.filter((t) => t.round === ronda).map((t) => `GIRO ${ronda} · ${nombreDe(t.participanteId).toUpperCase()}`) ?? []),
  ];
  return `          <tr><td>Ronda ${ronda}</td><td>${esc([...codigos, ...extras].join(' · ')) || '—'}</td></tr>`;
}).join('\n')}
          <tr><td>Final</td><td>DESENLACE, solo tras recoger las acusaciones</td></tr>
        </tbody>
      </table>

      <h2>5 · Comprobación final</h2>
      <ul class="control">
        <li>He preparado ${sobres.length} sobres y los he rotulado por código.</li>
        <li>El Game Master no ha visto el contenido de ninguna tarjeta.</li>
        <li>El dosier del culpable ha llegado a la persona correcta.</li>
        <li>El desenlace está en un sobre opaco y fuera de la mesa.</li>
        <li>He guardado esta guía donde el Game Master no la encuentre.</li>
      </ul>
    </section>`;

  return envolver(`${plot.title} — Guía del preparador`, contenido, opciones);
}
