/**
 * Carta de imprevistos: una sola hoja para tener al lado durante la partida.
 *
 * Su contenido está también en el manual, pero repartido entre dos secciones
 * que caen en páginas distintas. Con doce personas hablando a la vez, nadie
 * hojea un manual: por eso esto es una hoja suelta y no un capítulo.
 *
 * Con el Game Master a ciegas las ayudas NO se imprimen aquí. La de nivel 3
 * puede nombrar la sala o el objeto del crimen, así que va en sobre cerrado y
 * él la lee por primera vez en voz alta, como todos.
 */
import { numeroDeRondas } from '../../datos';
import { esc } from '../../html';
import { envolver, portada } from '../comun';
import type { VistaGm } from '../../contexto';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../../shared/types';

const INCIDENCIAS: Array<[string, string]> = [
  [
    'Alguien llega tarde',
    'Dale su dosier, resume en dos frases lo que se ha establecido y mételo en la ronda en curso. No repitas la narración: que le cuenten los demás, que además así mienten.',
  ],
  [
    'Alguien se tiene que ir',
    'Que entregue su acusación antes de marcharse y cuente su secreto en privado a una persona. Esa persona hereda la información, no el personaje.',
  ],
  [
    'Se ha atascado todo',
    'No des la respuesta: cambia la forma. Manda a todos a una sala distinta, o pide que cada cual diga en voz alta a quién descarta y por qué.',
  ],
  [
    'Alguien ha destripado algo',
    'Sigue adelante sin dramatizar. Si fue sin querer, di que eso está por confirmar. Si fue a propósito, esa persona no vuelve a hablar hasta el final de la ronda.',
  ],
  [
    'Dos versiones incompatibles',
    'Perfecto: eso es el juego. No arbitres. Di «tenéis dos versiones, decidid vosotros cuál os creéis» y sigue.',
  ],
  [
    'Alguien no participa',
    'Dale algo concreto que hacer: pídele que cuente en voz alta lo que encontró en su sala, o que resuma la cronología. Funciona mejor que animarle.',
  ],
  [
    'Se alarga demasiado',
    'Recorta la última ronda a la mitad y anuncia el aviso de cinco minutos. Es mejor cerrar pronto que acabar con la mesa cansada.',
  ],
];

const RESPUESTAS: Array<[string, string]> = [
  ['«¿Esto es importante?»', '«Todo lo que está sobre la mesa lo es. Decidid vosotros cuánto.»'],
  ['«¿Puede mentir?»', '«Sobre sus secretos, sí. Contradecir su dosier, no.»'],
  ['«¿Voy bien?»', '«No lo sé más que tú.»'],
  ['«¿Puedo ver tu dosier?»', '«No. Cuéntalo si quieres, pero el papel no se enseña.»'],
  ['«¿Cuánto queda?»', 'Dilo siempre en minutos exactos. La presión de reloj es parte del juego.'],
];

export function cartaImprevistos(
  game: GameSession,
  plot: Plot,
  vista: VistaGm,
  opciones: DocumentRenderOptions,
): string {
  const rondas = numeroDeRondas(plot);
  const ayudas = plot.material?.hints ?? [];

  const bloqueAyudas = ayudas.length
    ? vista.revelaSolucion
      ? `    <h2>Ayudas, de menos a más</h2>
    <table>
      <thead><tr><th style="width:18mm;">Nivel</th><th>Léela en voz alta a toda la mesa</th></tr></thead>
      <tbody>
${ayudas
  .map((a) => `        <tr><td>${a.level}</td><td>${esc(a.text)}</td></tr>`)
  .join('\n')}
      </tbody>
    </table>
    <p style="font-size:11.5pt; font-style:italic;">
      Espera al menos cinco minutos entre una y la siguiente. Se atascan menos de lo que parece.
    </p>`
      : `    <h2>Ayudas, de menos a más</h2>
    <div class="caja caja--verde junto">
      <p style="margin:0;">
        Hay ${ayudas.length} ayudas preparadas, en sobres <strong>${ayudas.map((a) => `AUXILIO ${a.level}`).join(' · ')}</strong>.
        No están impresas aquí a propósito: la última puede nombrar la sala o el objeto, y tú
        también juegas. Ábrelas por orden y léelas en voz alta sin mirarlas antes.
      </p>
      <p style="margin:3mm 0 0; font-size:11.5pt; font-style:italic;">
        Espera al menos cinco minutos entre una y la siguiente.
      </p>
    </div>`
    : `    <h2>Si se atascan</h2>
    <div class="caja junto">
      <p style="margin:0;">
        Esta partida no tiene ayudas escritas. Recuérdales el tramo de la cronología que sigue
        sin explicar: casi siempre basta con eso.
      </p>
    </div>`;

  const contenido = `${portada('Ten esta hoja al lado', 'Imprevistos', plot.tagline, `${game.suspects.length} jugadores · ${rondas} rondas`)}

    <h2 style="margin-top:0;">Respuestas que sirven siempre</h2>
    <table>
      <thead><tr><th style="width:52mm;">Si te preguntan…</th><th>Contesta</th></tr></thead>
      <tbody>
${RESPUESTAS.map(([p, r]) => `        <tr><td>${esc(p)}</td><td>${esc(r)}</td></tr>`).join('\n')}
      </tbody>
    </table>

    <h2>Cuando algo se tuerce</h2>
    <table>
      <thead><tr><th style="width:48mm;">Pasa esto…</th><th>Haces esto</th></tr></thead>
      <tbody>
${INCIDENCIAS.map(([p, r]) => `        <tr><td><strong>${esc(p)}</strong></td><td>${esc(r)}</td></tr>`).join('\n')}
      </tbody>
    </table>

${bloqueAyudas}

    <div class="caja caja--verde junto">
      <span class="etiqueta">Lo único que no puedes hacer</span>
      <p style="margin:0;">
        Opinar sobre quién fue. En cuanto el grupo nota hacia dónde miras, dejan de investigar y
        empiezan a leerte a ti.
      </p>
    </div>`;

  return envolver(`${plot.title} — Imprevistos`, contenido, opciones);
}
