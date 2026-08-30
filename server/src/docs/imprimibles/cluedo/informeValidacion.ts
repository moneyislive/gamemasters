/**
 * Informe de validación: la comprobación previa a imprimir.
 *
 * Es el único documento del paquete que sale mejor generado que escrito a mano,
 * porque cuenta cosas que nadie apetece contar dos veces: cuántos sobres hacen
 * falta, si alguna sala se quedó sin pistas, si la solución sigue apuntando a
 * gente que juega. Y en modo a ciegas comprueba, sobre el HTML realmente
 * generado, que la guía del Game Master no lleva dentro la solución.
 */
import { inventarioSobres, numeroDeRondas, pistasPorRonda, salasActivas, cronologiaPublica, huecoPorReconstruir } from '../../datos';
import { esc } from '../../html';
import { renderPlayerDocument } from '../../renderer';
import { envolver, portada } from '../comun';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../../shared/types';
import { culpableDe, lugarDe, objetoDe } from '../../../juegos/cluedo';

interface Comprobacion {
  titulo: string;
  bien: boolean;
  detalle: string;
}

function fila(c: Comprobacion): string {
  return `      <tr>
        <td style="width:14mm; font-family:'Cinzel',serif; color:${c.bien ? '#1a3f2a' : '#6d1a2a'};">${c.bien ? '✓' : '✗'}</td>
        <td><strong>${esc(c.titulo)}</strong><br /><span style="font-size:11pt; color:#6b5638;">${esc(c.detalle)}</span></td>
      </tr>`;
}

/**
 * Marcadores de las secciones que el dosier del Game Master solo incluye cuando
 * NO juega a ciegas. Buscarlos en el HTML ya compuesto es una comprobación
 * estructural, no una búsqueda de palabras sueltas: si aparecen, es que la
 * sección entera se ha colado.
 */
const SECCIONES_RESERVADAS: Array<[string, string]> = [
  ['La solución del caso', 'la solución'],
  ['Secretos y coartadas', 'los secretos de los jugadores'],
  ['Señala a:', 'a quién señala cada pista'],
];

function comprobarCeguera(game: GameSession, plot: Plot): Comprobacion[] {
  const guia = renderPlayerDocument(game, 'gm')?.html ?? '';
  const comprobaciones: Comprobacion[] = SECCIONES_RESERVADAS.map(([marcador, humano]) => ({
    titulo: `La guía no incluye ${humano}`,
    bien: !guia.includes(marcador),
    detalle: guia.includes(marcador)
      ? 'AVISO: esa sección aparece en la guía. No se la entregues al Game Master.'
      : 'Comprobado sobre el documento realmente generado.',
  }));

  const relato = plot.solution.howItHappened.slice(0, 40);
  comprobaciones.push({
    titulo: 'La guía no cuenta cómo ocurrió',
    bien: relato.length === 0 || !guia.includes(relato),
    detalle: 'El relato del crimen vive únicamente en el sobre sellado.',
  });

  return comprobaciones;
}

export function informeValidacion(
  game: GameSession,
  plot: Plot,
  opciones: DocumentRenderOptions,
): string {
  const aCiegas = game.settings?.gmPlays === true;
  const rondas = numeroDeRondas(plot);
  const porRonda = pistasPorRonda(plot);
  const sobres = inventarioSobres(game, plot);
  const idsSospechosos = new Set(game.suspects.map((s) => s.id));

  const salasSinPista = game.rooms.filter(
    (sala) => !plot.clues.some((pista) => pista.roomId === sala.id),
  );
  const sinPersonaje = game.suspects.filter(
    (s) => !plot.characters.some((c) => c.suspectId === s.id),
  );
  const publicos = cronologiaPublica(plot);
  const hueco = huecoPorReconstruir(plot);

  const comprobaciones: Comprobacion[] = [
    {
      titulo: 'Cada jugador tiene personaje escrito',
      bien: sinPersonaje.length === 0,
      detalle: sinPersonaje.length
        ? `Sin personaje: ${sinPersonaje.map((s) => s.name).join(', ')}. Actualiza el misterio antes de imprimir.`
        : `${game.suspects.length} personajes, uno por jugador.`,
    },
    {
      titulo: 'La solución apunta a gente y cosas que existen',
      bien:
        idsSospechosos.has(culpableDe(plot.solution)) &&
        game.weapons.some((w) => w.id === objetoDe(plot.solution)) &&
        game.rooms.some((r) => r.id === lugarDe(plot.solution)),
      detalle:
        'Culpable, objeto y sala siguen formando parte de la partida. Si falla, actualiza el misterio.',
    },
    {
      titulo: 'Todas las salas tienen alguna pista',
      bien: salasSinPista.length === 0,
      detalle: salasSinPista.length
        ? `Sin pistas: ${salasSinPista.map((s) => s.name).join(', ')}. Se pueden usar igual, pero nadie encontrará nada allí.`
        : `${game.rooms.length} salas con evidencia repartida.`,
    },
    {
      titulo: 'Ninguna ronda se queda vacía',
      bien: [...porRonda.values()].every((pistas) => pistas.length > 0),
      detalle: [...porRonda.entries()]
        .map(([ronda, pistas]) => `ronda ${ronda}: ${pistas.length}`)
        .join(' · '),
    },
    {
      titulo: 'Hay hechos públicos que colgar',
      bien: publicos.length > 0,
      detalle: `${publicos.length} de ${plot.timeline.length} momentos son públicos. El resto pertenece a las pistas y a los secretos.`,
    },
    {
      titulo: 'La cronología deja un hueco por reconstruir',
      bien: hueco !== null,
      detalle: hueco
        ? `Entre ${hueco.desde} y ${hueco.hasta} no hay testigos: ahí está el caso.`
        : 'No se detecta un tramo sin testigos. La partida funciona igual, pero el cartel de cronología pierde su gancho.',
    },
  ];

  const material = plot.material;
  comprobaciones.push({
    titulo: 'El material de la velada está escrito',
    bien: Boolean(material),
    detalle: material
      ? `${material.narrations.length} narraciones · ${material.twists.length} giros · ${material.timelineReveals.length} revelaciones · ${material.hints.length} ayudas`
      : 'Sin él, la cronología se rellena a mano y no hay narraciones ni giros. Se escribe con «Escribir el material» y no toca la trama.',
  });
  if (material) {
    const rondasConNarracion = new Set(material.narrations.map((n) => n.round));
    const faltan = Array.from({ length: rondas }, (_, i) => i + 1).filter(
      (r) => !rondasConNarracion.has(r),
    );
    comprobaciones.push({
      titulo: 'Cada ronda tiene su narración de apertura',
      bien: faltan.length === 0,
      detalle: faltan.length
        ? `Sin narración: ronda ${faltan.join(', ')}.`
        : 'Apertura y todas las rondas cubiertas.',
    });
    comprobaciones.push({
      titulo: 'Ningún giro le toca al culpable',
      bien: !material.twists.some((g) => g.suspectId === culpableDe(plot.solution)),
      detalle: 'Un giro dirigido al culpable lo señalaría delante de todos.',
    });
  }

  if (aCiegas) comprobaciones.push(...comprobarCeguera(game, plot));

  const recuento = `    <table>
      <thead><tr><th>Material</th><th style="width:26mm;">Cantidad</th></tr></thead>
      <tbody>
        <tr><td>Jugadores</td><td>${game.suspects.length}</td></tr>
        <tr><td>Salas</td><td>${game.rooms.length}</td></tr>
        <tr><td>Objetos</td><td>${game.weapons.length}</td></tr>
        <tr><td>Rondas</td><td>${rondas}</td></tr>
        <tr><td>Pistas</td><td>${plot.clues.length}</td></tr>
        <tr><td>Sobres que hay que rotular</td><td>${sobres.length}</td></tr>
      </tbody>
    </table>`;

  const reparto = `    <table>
      <thead><tr><th style="width:22mm;">Ronda</th><th>Salas con evidencia nueva</th><th style="width:22mm;">Pistas</th></tr></thead>
      <tbody>
${[...porRonda.entries()]
  .map(([ronda, pistas]) => {
    const salas = salasActivas(game, plot, ronda).map((s) => s.name);
    return `        <tr><td>${ronda}</td><td>${esc(salas.join(' · ')) || '<em>ninguna</em>'}</td><td>${pistas.length}</td></tr>`;
  })
  .join('\n')}
      </tbody>
    </table>`;

  const fallos = comprobaciones.filter((c) => !c.bien).length;
  const veredicto =
    fallos === 0
      ? `    <div class="caja caja--verde junto" style="text-align:center;">
      <p style="margin:0; font-family:'Cinzel',serif; font-size:13pt; letter-spacing:0.06em; color:#1a3f2a;">
        Todo cuadra. El material se puede imprimir.
      </p>
    </div>`
      : `    <div class="aviso">
      ${fallos === 1 ? 'Hay 1 aviso' : `Hay ${fallos} avisos`} más abajo<br />
      Revísalos antes de gastar papel.
    </div>`;

  const contenido = `${portada(
    'Comprobación previa',
    'Informe de validación',
    plot.tagline,
    'Léelo antes de imprimir nada',
  )}

${veredicto}

    <h2 style="margin-top:0;">Recuento del material</h2>
${recuento}

    <h2>Reparto de pistas por ronda</h2>
${reparto}

    <h2>Comprobaciones</h2>
    <table>
      <tbody>
${comprobaciones.map(fila).join('\n')}
      </tbody>
    </table>

    ${
      aCiegas
        ? `<div class="caja caja--roja junto">
      <span class="etiqueta">Partida con el Game Master a ciegas</span>
      <p style="margin:0;">
        Las comprobaciones de ceguera se han hecho sobre el HTML de la guía que va a
        recibir. Verifican que no lleva dentro las secciones reservadas; no pueden
        garantizar que una frase suelta no insinúe algo, así que léela por encima antes
        de dársela.
      </p>
    </div>`
        : ''
    }`;

  return envolver(`${plot.title} — Informe de validación`, contenido, opciones);
}
