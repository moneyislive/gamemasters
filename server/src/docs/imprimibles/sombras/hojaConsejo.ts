/**
 * La hoja del consejo: donde cada cual escribe su senda y a quién señala.
 *
 * Se rellena al final, en silencio y a la vez. Que sea de papel y no de viva voz
 * no es nostalgia: si se dijeran las sendas en alto y por turnos, quien hablara
 * el último tendría toda la información de los demás y el consejo se convertiría
 * en un juego de esperar. En papel y a la vez, todo el mundo se moja con lo que
 * sabe.
 *
 * LOS PASOS VAN LISTADOS, PERO SIN ORDEN Y SIN DECIR CUÁLES ENTRAN. Aparecen por
 * el orden en que quien organiza los dio de alta, que no es el correcto ni tiene
 * por qué parecerse. Y salen TODOS, no solo cuatro: si la hoja listara solo los
 * de la senda estaría dando media respuesta.
 */
import { esc } from '../../html';
import { envolverWashi, portadaWashi, sinTrama } from './comun';
import { vistaDeLasSombras } from './datos';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../../shared/types';

export function hojaConsejo(
  game: GameSession,
  plot: Plot,
  opciones: DocumentRenderOptions,
): string {
  const vista = vistaDeLasSombras(game, plot);
  if (!vista.hay || !vista.trama) return sinTrama('Hoja del consejo', opciones);

  const tramos = vista.sendaVerdadera.length;
  const cabecera = Array.from({ length: tramos }, (_, i) => `${i + 1}.º`).join(' &nbsp; ');

  const casillas = vista.pasos
    .map(
      (paso) => `          <tr>
            <td style="width:60mm;">${esc(paso.name)}</td>
            <td style="text-align:center;">
              ${Array.from({ length: tramos }, () => '<span class="casilla"></span>').join(' ')}
              &nbsp;&nbsp;<span style="font-size:10pt; color:#7c7159;">fuera <span class="casilla"></span></span>
            </td>
          </tr>`,
    )
    .join('\n');

  const gente = vista.escoltas
    .map(
      (persona) => `            <tr>
              <td style="width:9mm; text-align:center;"><span class="casilla"></span></td>
              <td>${esc(persona.name)} <span style="font-size:10pt; color:#7c7159;">· ${esc(
                plot.characters.find((c) => c.participanteId === persona.id)?.characterName ?? '',
              )}</span></td>
            </tr>`,
    )
    .join('\n');

  const contenido = `${portadaWashi(
    'Una por persona',
    'La hoja del consejo',
    plot.tagline,
    'Se rellena en silencio, al final de la noche',
  )}

    <div class="campo"><span>Tu nombre</span><span></span></div>

    <h2>1 · La senda</h2>
    <p style="font-size:11pt; color:#7c7159;">
      De todos los pasos, solo <strong>${tramos}</strong> forman la senda que llega a la playa.
      Marca el lugar que le das a cada uno —la primera casilla es el primer tramo— o marca «fuera»
      si crees que no entra. <strong>Se anda la senda más apoyada de la mesa</strong>, no la tuya:
      convencer cuenta tanto como acertar, y tu voto pesa uno más por cada prenda que te hayan dado.
    </p>

    <table>
      <thead>
        <tr>
          <th>Paso</th>
          <th style="text-align:center;">${cabecera}</th>
        </tr>
      </thead>
      <tbody>
${casillas}
      </tbody>
    </table>

    <div class="caja junto">
      <span class="etiqueta">O escríbela aquí, del primero al último</span>
      ${Array.from({ length: tramos }, () => '<span class="renglon"></span>').join('\n      ')}
    </div>

    <h2>2 · Quién cobra de Akechi</h2>
    <p style="font-size:11pt; color:#7c7159;">
      Marca a una sola persona. Se señala <strong>una vez y para toda la partida</strong>: no se
      puede cambiar, y no se te va a decir si has acertado hasta el amanecer. Si la mayoría de la
      mesa acierta, a esa persona se le retiran las prendas y su voto no cuenta.
    </p>

    <div class="caja junto">
      <table>
        <tbody>
${gente}
        </tbody>
      </table>
    </div>

    <div class="caja caja--bermellon junto">
      <span class="etiqueta">Antes de entregarla</span>
      <p style="margin:0;">
        Comprueba que has puesto tu nombre, que has marcado ${tramos} pasos en orden y que has
        señalado a alguien. Una hoja con tres tramos no cuenta como propuesta, y esta noche cada
        voto pesa —el tuyo más que el de otros, si te han dado su palabra.
      </p>
    </div>`;

  return envolverWashi(`${plot.title} — Hoja del consejo`, contenido, opciones);
}
