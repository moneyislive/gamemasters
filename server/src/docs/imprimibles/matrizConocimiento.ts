/**
 * Quién sabe qué: el mapa de lo que cada jugador puede contar de los demás.
 *
 * Es el documento que responde a la pregunta que más se hace un Game Master en
 * mitad de una partida atascada: «¿a quién empujo a hablar con quién?». El campo
 * `knowledge` de cada personaje existe desde el principio y hasta ahora solo se
 * imprimía dentro de su propio dosier, donde nadie puede cruzarlo.
 *
 * Solo en modo anfitrión: cruzar los secretos ajenos es exactamente lo que un
 * Game Master a ciegas no puede ver.
 */
import { esc } from '../html';
import { envolver, portada } from './comun';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../shared/types';

export function matrizConocimiento(
  game: GameSession,
  plot: Plot,
  opciones: DocumentRenderOptions,
): string {
  const nombreDe = (id: string): string => game.suspects.find((s) => s.id === id)?.name ?? id;

  /** ¿El texto menciona a algún otro personaje? Sirve para sugerir el cruce. */
  const mencionados = (texto: string, exceptoId: string): string[] => {
    const plano = texto.toLowerCase();
    return plot.characters
      .filter((otro) => {
        if (otro.suspectId === exceptoId) return false;
        const nombre = nombreDe(otro.suspectId).toLowerCase();
        const personaje = otro.characterName.toLowerCase().split(/\s+/)[0] ?? '';
        return plano.includes(nombre) || (personaje.length >= 4 && plano.includes(personaje));
      })
      .map((otro) => nombreDe(otro.suspectId));
  };

  const filas = plot.characters
    .map((personaje) => {
      const saberes = personaje.knowledge?.length
        ? personaje.knowledge
            .map((s) => {
              const cruces = mencionados(s, personaje.suspectId);
              return `<li>${esc(s)}${cruces.length ? ` <span style="font-family:'Cinzel',serif; font-size:8.5pt; letter-spacing:0.1em; color:#6d1a2a;">→ ${esc(cruces.join(' · '))}</span>` : ''}</li>`;
            })
            .join('')
        : '<li><em>No sabe nada concreto de nadie: es de los que solo pueden contar lo suyo.</em></li>';
      const esCulpable = personaje.suspectId === plot.solution.murdererId;
      return `      <tr>
        <td style="width:40mm;">
          <strong>${esc(nombreDe(personaje.suspectId))}</strong><br />
          <span style="font-size:10.5pt; color:#6b5638;">${esc(personaje.characterName)}</span>
          ${esCulpable ? '<br /><span style="font-family:\'Cinzel\',serif; font-size:8.5pt; letter-spacing:0.12em; color:#6d1a2a;">☠ CULPABLE</span>' : ''}
        </td>
        <td><ul style="margin:0; padding-left:5mm;">${saberes}</ul></td>
      </tr>`;
    })
    .join('\n');

  // A quién puede señalar cada pista: el otro sentido de la misma pregunta.
  const senalados = new Map<string, string[]>();
  for (const pista of plot.clues) {
    for (const personaje of plot.characters) {
      const nombre = nombreDe(personaje.suspectId);
      if (pista.pointsTo.toLowerCase().includes(nombre.toLowerCase())) {
        if (!senalados.has(nombre)) senalados.set(nombre, []);
        senalados.get(nombre)?.push(`ronda ${pista.round}`);
      }
    }
  }

  const contenido = `${portada('Solo para quien dirige', 'Quién sabe qué', plot.tagline, 'Para desatascar conversaciones')}

    <div class="aviso">Contiene los secretos de todos<br />No la dejes a la vista</div>

    <div class="caja caja--verde junto">
      <span class="etiqueta">Cómo se usa</span>
      <p style="margin:0;">
        Cuando la partida se pare, mira esta tabla y busca a dos personas que puedan hablar de lo
        mismo. En vez de dar una pista, di algo como «${esc(nombreDe(plot.characters[0]?.suspectId ?? ''))},
        ¿has hablado ya con todo el mundo?». Empuja el encuentro, no la conclusión.
      </p>
      <p style="margin:3mm 0 0; font-size:11pt;">
        La flecha marca a quién afecta cada cosa que sabe.
      </p>
    </div>

    <table>
      <thead><tr><th style="width:40mm;">Jugador</th><th>Lo que sabe de los demás</th></tr></thead>
      <tbody>
${filas}
      </tbody>
    </table>

${
  senalados.size
    ? `    <h2>A quién señalan las pistas</h2>
    <table>
      <thead><tr><th style="width:44mm;">Jugador</th><th>Pistas que lo apuntan</th></tr></thead>
      <tbody>
${[...senalados.entries()].map(([nombre, rondas]) => `        <tr><td>${esc(nombre)}</td><td>${esc(rondas.join(' · '))}</td></tr>`).join('\n')}
      </tbody>
    </table>
    <p style="font-size:11.5pt; font-style:italic;">
      Si alguien acumula señalamientos y no es el culpable, es un señuelo que está funcionando
      demasiado bien: conviene que aparezca algo que lo descargue.
    </p>`
    : ''
}`;

  return envolver(`${plot.title} — Quién sabe qué`, contenido, opciones);
}
