/**
 * La tabla del rastro y las prendas: la contabilidad de la noche, a mano.
 *
 * NO LLEVA LA SENDA NI EL NOMBRE DEL KANCHŌ, y por eso puede llevarla quien
 * dirige aunque dirija a ciegas y esté jugando. Es la misma decisión que tomó la
 * tabla de marcas de la Momia y por el mismo motivo: la contabilidad es pública
 * —en la mesa se ve quién ha dado su prenda y cuánto ha subido el rastro— así
 * que esconderla no protegería nada y dejaría a quien dirige sin poder arbitrar.
 *
 * EL RASTRO VA EN UNA TIRA DE CASILLAS Y NO EN UN NÚMERO ESCRITO, y eso es
 * deliberado: es el reloj de la noche y tiene que verse desde el otro lado de la
 * mesa. Un número tachado y reescrito cuatro veces no se ve; una fila de
 * casillas tachadas, sí.
 */
import { esc } from '../../html';
import { envolverWashi, portadaWashi, sinTrama } from './comun';
import { vistaDeLasSombras } from './datos';
import {
  PRENDAS_INICIALES,
  PRENDAS_RECIBIDAS_MAXIMO,
  rastroMaximoPara,
} from '../../../../../shared/juegos/sombras-tipos';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../../shared/types';

export function tablaRastro(
  game: GameSession,
  plot: Plot,
  opciones: DocumentRenderOptions,
): string {
  const vista = vistaDeLasSombras(game, plot);
  if (!vista.hay || !vista.trama) return sinTrama('Tabla del rastro y las prendas', opciones);

  const tope = rastroMaximoPara(vista.escoltas.length);

  const filas = vista.escoltas
    .map(
      (persona) => `          <tr>
            <td style="width:46mm;"><strong>${esc(persona.name)}</strong><br /><span style="font-size:10pt; color:#7c7159;">${esc(
              vista.disfrazDe(persona.id)?.rol ?? '',
            )}</span></td>
            <td style="text-align:center; width:34mm;">${'<span class="casilla"></span>'.repeat(PRENDAS_INICIALES)}</td>
            <td style="text-align:center; width:34mm;">${'<span class="casilla"></span>'.repeat(PRENDAS_RECIBIDAS_MAXIMO)}</td>
            <td style="text-align:center;">${'<span class="casilla"></span>'.repeat(Math.max(1, vista.horas.length))}</td>
            <td style="width:36mm;"></td>
          </tr>`,
    )
    .join('\n');

  const rastro = Array.from(
    { length: tope },
    (_, i) =>
      `<span class="casilla" style="width:9mm; height:9mm;"></span>${
        i === tope - 1 ? '' : ''
      }`,
  ).join(' ');

  const horas = vista.horas
    .map(
      (h) => `          <tr>
            <td style="width:16mm; text-align:center;"><span class="kanji" style="font-size:15pt;">${esc(h.kanji)}</span></td>
            <td style="width:48mm;">${esc(h.nombre)}</td>
            <td style="width:44mm;"></td>
            <td></td>
          </tr>`,
    )
    .join('\n');

  const contenido = `${portadaWashi(
    'Para quien dirige',
    'El rastro y las prendas',
    plot.tagline,
    'No lleva la senda: se puede llevar a la vista',
  )}

    <h2>El rastro de la columna</h2>
    <div class="caja caja--bermellon junto">
      <p style="margin:0 0 3mm;">
        Sube <strong>uno por cada persona</strong> que entra en el paso batido. Baja con el akindo,
        y sube uno menos mientras alguien lleve la plata. Si se llena, <strong>la columna está
        interceptada</strong>: por bien que se ande la senda, no se embarca.
      </p>
      <div style="text-align:center; line-height:2.4;">${rastro}</div>
      <p style="margin:3mm 0 0; font-size:10.5pt; color:#7c7159;">
        Tope de esta partida: <strong>${tope}</strong> (son ${vista.escoltas.length} personas).
        Tacha una casilla cada vez que suba y bórrala si baja. Dilo en voz alta: que se oiga.
      </p>
    </div>

    <h2>Persona a persona</h2>
    <div class="tabla-marco">
      <table>
        <thead>
          <tr>
            <th>Quién</th>
            <th style="text-align:center;">Prendas por dar</th>
            <th style="text-align:center;">Prendas recibidas</th>
            <th style="text-align:center;">Disfraz usado (una por hora)</th>
            <th>Notas</th>
          </tr>
        </thead>
        <tbody>
${filas}
        </tbody>
      </table>
    </div>
    <p style="font-size:10.5pt; color:#7c7159;">
      Una prenda solo se da a OTRA persona. Nadie puede tener más de ${PRENDAS_RECIBIDAS_MAXIMO}
      recibidas. Quien recibe una debe una respuesta sincera a una pregunta directa: hazla cobrar
      en voz alta.
    </p>

    <h2>Hora a hora</h2>
    <div class="tabla-marco">
      <table>
        <thead>
          <tr><th></th><th>Hora</th><th>Paso batido (lo dices al CERRAR)</th><th>Quién pisó allí</th></tr>
        </thead>
        <tbody>
${horas}
        </tbody>
      </table>
    </div>
    <p style="font-size:10.5pt; color:#7c7159;">
      Deja esta columna en blanco y ve rellenándola: es la que convierte lo que se dijo en algo que
      se puede comprobar. Al cerrar cada hora, anota el paso y quién estuvo allí, y léelo en alto.
    </p>`;

  return envolverWashi(`${plot.title} — El rastro y las prendas`, contenido, opciones);
}
