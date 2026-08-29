/**
 * El pliego de la senda: la solución. NO se deja sobre la mesa.
 *
 * Lleva las cuatro cosas que no puede saber nadie más: la senda en orden, quién
 * cobra de Akechi, qué paso baten los cazadores cada hora y —esta es propia de
 * este juego— LAS CONTRASEÑAS de todas las puertas.
 *
 * POR QUÉ LAS CONTRASEÑAS ESTÁN AQUÍ Y NO SOLO EN LOS CARTELES. Porque quien
 * prepara tiene que poder arbitrar cuando alguien dice «pone KAWA» y no está
 * seguro, o cuando un cartel se cae, o cuando alguien no puede subir al piso de
 * arriba. Sin esta lista, la única copia de esa información estaría pegada a una
 * puerta. Con ella, hay que guardarla — y por eso este documento es de
 * `preparer` en los dos modos y lo dice tres veces.
 */
import { esc } from '../../html';
import { envolverWashi, portadaWashi, sinTrama } from './comun';
import { vistaDeLasSombras } from './datos';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../../shared/types';

export function sendaVerdadera(
  game: GameSession,
  plot: Plot,
  opciones: DocumentRenderOptions,
): string {
  const vista = vistaDeLasSombras(game, plot);
  if (!vista.hay || !vista.trama) return sinTrama('La senda verdadera', opciones);

  const senda = vista.sendaVerdadera
    .map(
      (paso, i) => `        <tr>
          <td style="width:16mm; text-align:center; font-size:16pt;"><strong>${i + 1}</strong></td>
          <td><strong>${esc(paso?.name ?? '—')}</strong></td>
        </tr>`,
    )
    .join('\n');

  const fuera = vista.pasos
    .filter((p) => !vista.trama!.sendaVerdadera.includes(p.id))
    .map((p) => esc(p.name))
    .join(' · ');

  const horas = vista.horas
    .map(
      (h) => `        <tr>
          <td style="width:16mm; text-align:center;"><span class="kanji" style="font-size:15pt;">${esc(h.kanji)}</span></td>
          <td style="width:48mm;">${esc(h.nombre)}</td>
          <td><strong class="bermellon">${esc(h.batido?.name ?? '—')}</strong></td>
        </tr>`,
    )
    .join('\n');

  const contrasenas = vista.pasos
    .map((p) => {
      const sena = vista.contrasenaDe(p.id);
      return `        <tr>
          <td style="width:66mm;">${esc(p.name)}</td>
          <td style="width:34mm;"><strong style="letter-spacing:0.12em;">${esc(sena?.palabra ?? '—')}</strong></td>
          <td><span class="kanji">${esc(sena?.kanji ?? '')}</span> ${esc(sena?.significa ?? '')}</td>
        </tr>`;
    })
    .join('\n');

  const disfraces = vista.escoltas
    .map((persona) => {
      const d = vista.disfrazDe(persona.id);
      const esKancho = persona.id === vista.kancho?.entidad?.id;
      return `        <tr>
          <td style="width:44mm;">${esc(persona.name)}${esKancho ? ' <strong class="bermellon">← kanchō</strong>' : ''}</td>
          <td>${esc(d?.rol ?? '—')} <span class="kanji">${esc(d?.kanji ?? '')}</span></td>
        </tr>`;
    })
    .join('\n');

  const falsas = (vista.trama.falsasCandidatas ?? [])
    .map((f) => `        <li>${esc(f.texto)}</li>`)
    .join('\n');

  const contenido = `${portadaWashi(
    'Solo para quien prepara',
    'La senda verdadera',
    plot.tagline,
    'No la dejes sobre la mesa · No la lea quien vaya a jugar',
  )}

    <div class="aviso">
      Esta hoja resuelve la partida entera. Guárdala.
    </div>

    <h2>La senda, en orden</h2>
    <div class="tabla-marco">
      <table><tbody>
${senda}
      </tbody></table>
    </div>
    <p><strong>Fuera de la senda:</strong> ${fuera || '—'}</p>

    <h2>Quién cobra de Akechi</h2>
    <div class="caja caja--bermellon junto">
      <p style="margin:0; font-size:15pt;"><strong>${esc(vista.kancho?.entidad?.name ?? '—')}</strong>${
        vista.kancho?.personaje ? ` — ${esc(vista.kancho.personaje)}` : ''
      }</p>
      <p style="margin:2.5mm 0 0;">${esc(plot.solution?.motive ?? '')}</p>
      <p style="margin:2.5mm 0 0;">${esc(plot.solution?.howItHappened ?? '')}</p>
    </div>

    <h2>Dónde esperan los cazadores</h2>
    <p style="font-size:11pt; color:#7c7159;">
      <strong>No se anuncia al abrir la hora.</strong> Se revela al CERRARLA, y ahí es donde la mesa
      comprueba quién decía la verdad. Si diriges a ciegas, es lo que tienes que ir soplándole a
      quien dirige — al cerrar, nunca antes.
    </p>
    <div class="tabla-marco">
      <table><tbody>
${horas}
      </tbody></table>
    </div>

    <h2>Las contraseñas de las puertas</h2>
    <p style="font-size:11pt; color:#7c7159;">
      Están escritas en los carteles. Esta lista es tu copia de seguridad: para arbitrar una duda,
      para cuando se caiga un cartel, o para leérsela a quien no pueda llegar hasta la habitación.
      No la enseñes.
    </p>
    <div class="tabla-marco">
      <table>
        <thead><tr><th>Paso</th><th>Palabra</th><th></th></tr></thead>
        <tbody>
${contrasenas}
        </tbody>
      </table>
    </div>

    <h2>Los disfraces repartidos</h2>
    <div class="tabla-marco">
      <table><tbody>
${disfraces}
      </tbody></table>
    </div>

    <h2>Las mentiras preparadas</h2>
    <p style="font-size:11pt; color:#7c7159;">
      Cuando el kanchō use su papel, dale UNA de estas y déjale ponerla en el centro sin comentar
      nada. Apunta en qué paso dice haberla leído: es lo que permite desmentirle.
    </p>
    <ul>
${falsas || '        <li><em>Esta partida no trae mentiras preparadas.</em></li>'}
    </ul>

    <div class="pagina"></div>
    <h2>El desenlace, para leerlo en voz alta</h2>
    <div class="caja junto">
      <span class="etiqueta">Qué pasó de verdad</span>
      <p style="margin:0;">${esc(plot.material?.finale?.reconstruction ?? '')}</p>
    </div>
    <div class="caja caja--bermellon junto">
      <span class="etiqueta">La confesión — que la lea quien lo interpretó</span>
      <p style="margin:0;">${esc(plot.material?.finale?.confession ?? '')}</p>
    </div>
    <div class="caja junto">
      <span class="etiqueta">Epílogo</span>
      <p style="margin:0;">${esc(plot.material?.finale?.epilogue ?? '')}</p>
    </div>`;

  return envolverWashi(`${plot.title} — La senda verdadera`, contenido, opciones);
}
