/**
 * La tabla de marcas y amuletos: la cuenta de la maldición, a mano.
 *
 * Existe por una razón muy concreta: en la mesa, quien lleva la cuenta de cabeza
 * se equivoca, y equivocarse aquí no es un detalle. Si alguien queda tocado sin
 * serlo, pierde voz en la votación y la partida se decide por un error de
 * aritmética a las dos de la mañana. Con la hoja delante no hay discusión.
 *
 * TRES COLUMNAS DE MARCAS Y NO UNA CASILLA POR VIGILIA, porque las marcas no van
 * por vigilia: se acumulan, se quitan con amuletos y se curan con el don del
 * médico. Lo que hay que ver de un vistazo es <em>cuántas lleva ahora</em> y
 * cuánto le falta para las tres.
 *
 * NO LLEVA LOS DONES ESCRITOS. La tabla se queda sobre la mesa de quien dirige y
 * la ve cualquiera que se asome; los dones son de cada cual y están en su dosier
 * y en la guía. Aquí solo la aritmética.
 */
import { esc } from '../../html';
import { envolverPapiro, portadaPapiro, sinTrama } from './comun';
import { vistaDeLaMomia } from './datos';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../../shared/types';

export function tablaMarcas(
  game: GameSession,
  plot: Plot,
  opciones: DocumentRenderOptions,
): string {
  const vista = vistaDeLaMomia(game, plot);
  if (!vista.hay) return sinTrama('Tabla de marcas y amuletos', opciones);

  const filas = vista.expedicionarios
    .map(
      (persona) => `        <tr>
          <td style="width:46mm;"><strong>${esc(persona.name)}</strong></td>
          <td style="text-align:center; width:38mm;">
            <span class="casilla"></span><span class="casilla"></span><span class="casilla"></span>
          </td>
          <td style="text-align:center; width:30mm;">
            <span class="casilla"></span><span class="casilla"></span>
          </td>
          <td></td>
        </tr>`,
    )
    .join('\n');

  const vigilias = vista.profanadas
    .map(
      (camara, i) => `        <tr>
          <td style="width:20mm; text-align:center;">${i + 1}</td>
          <td>${esc(camara?.name ?? '—')}</td>
          <td style="width:64mm;"></td>
        </tr>`,
    )
    .join('\n');

  const contenido = `${portadaPapiro(
    'Para quien dirige',
    'Marcas y amuletos',
    plot.tagline,
    'Tenla siempre a la vista. Con lápiz.',
  )}

    <div class="caja caja--lapis junto">
      <span class="etiqueta">Cómo se lleva</span>
      <ul style="margin:0;">
        <li>Tacha una casilla de <strong>marca</strong> cuando alguien entre en la cámara profanada.</li>
        <li>Tacha una casilla de <strong>amuleto</strong> cuando alguien lo dé. Se dan <em>a otra
          persona</em>, nunca a uno mismo, y quitan una marca: destacha la marca de quien lo recibe.</li>
        <li>El médico quita una marca por vigilia <em>sin</em> gastar amuleto: destacha y ya está.</li>
        <li>El guardián evita la marca de esta vigilia a quien elija: no llegas a tacharla.</li>
        <li>El capataz entra en una segunda cámara y se lleva <strong>una marca extra</strong>, la
          hubiera o no en esa cámara.</li>
        <li>A las <strong>tres marcas</strong>, esa persona queda <strong>tocada</strong>: su
          propuesta de orden ya no cuenta en la votación. Sigue jugando, sigue hablando y sigue
          señalando. No la elimines: quien queda fuera se aburre una hora.</li>
      </ul>
    </div>

    <h2>La cuenta</h2>
    <table>
      <thead>
        <tr>
          <th>Quién</th>
          <th style="text-align:center;">Marcas (3 = tocado)</th>
          <th style="text-align:center;">Amuletos</th>
          <th>Notas</th>
        </tr>
      </thead>
      <tbody>
${filas}
      </tbody>
    </table>

    <h2>Qué se profana cada noche</h2>
    <p style="font-size:11pt; color:#7a5c34;">
      Lo anuncias en voz alta al abrir cada vigilia, antes de que nadie elija dónde entra.
    </p>
    <table>
      <thead><tr><th>Vigilia</th><th>Cámara profanada</th><th>Quién entró</th></tr></thead>
      <tbody>
${vigilias}
      </tbody>
    </table>

    <h2>Dones usados</h2>
    <p style="font-size:11pt; color:#7a5c34;">
      Uno por persona y por vigilia. Marca la casilla cuando alguien invoque el suyo, para que
      nadie lo use dos veces la misma noche.
    </p>
    <table>
      <thead>
        <tr>
          <th>Quién</th>
${vista.profanadas.map((_, i) => `          <th style="text-align:center; width:22mm;">Vigilia ${i + 1}</th>`).join('\n')}
        </tr>
      </thead>
      <tbody>
${vista.expedicionarios
  .map(
    (persona) => `        <tr>
          <td>${esc(persona.name)}</td>
${vista.profanadas.map(() => '          <td style="text-align:center;"><span class="casilla"></span></td>').join('\n')}
        </tr>`,
  )
  .join('\n')}
      </tbody>
    </table>`;

  return envolverPapiro(`${plot.title} — Marcas y amuletos`, contenido, opciones);
}
