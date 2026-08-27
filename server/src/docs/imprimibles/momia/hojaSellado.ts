/**
 * La hoja del sellado: donde cada cual escribe su orden y a quién señala.
 *
 * Se rellena al final, en silencio y a la vez. Que sea de papel y no de viva voz
 * no es nostalgia: si se dijeran los órdenes en alto y por turnos, quien hablara
 * el último tendría toda la información de los demás y la votación se
 * convertiría en un juego de esperar. En papel y a la vez, todo el mundo se moja
 * con lo que sabe.
 *
 * LOS RITOS VAN LISTADOS, PERO SIN ORDEN. Aparecen por el orden en que el Game
 * Master los dio de alta, que no es el correcto ni tiene por qué parecerse. Si
 * se listaran «como salen en el papiro» estarían dando la mitad de la respuesta.
 */
import { esc } from '../../html';
import { envolverPapiro, portadaPapiro, sinTrama } from './comun';
import { vistaDeLaMomia } from './datos';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../../shared/types';

export function hojaSellado(
  game: GameSession,
  plot: Plot,
  opciones: DocumentRenderOptions,
): string {
  const vista = vistaDeLaMomia(game, plot);
  if (!vista.hay) return sinTrama('Hoja del sellado', opciones);

  const casillas = vista.ritos
    .map(
      (rito) => `          <tr>
            <td style="width:52mm;">${esc(rito.name)}</td>
            <td style="text-align:center;">
              ${[1, 2, 3, 4, 5]
                .slice(0, vista.ritos.length)
                .map(() => '<span class="casilla"></span>')
                .join(' ')}
            </td>
          </tr>`,
    )
    .join('\n');

  const gente = vista.expedicionarios
    .map(
      (persona) => `            <tr>
              <td style="width:9mm; text-align:center;"><span class="casilla"></span></td>
              <td>${esc(persona.name)}<br /><span style="font-size:10pt; color:#7a5c34;">${esc(
                plot.characters.find((c) => c.suspectId === persona.id)?.characterName ?? '',
              )}</span></td>
            </tr>`,
    )
    .join('\n');

  const contenido = `${portadaPapiro(
    'Una por persona',
    'La hoja del sellado',
    plot.tagline,
    'Se rellena en silencio, al final de la noche',
  )}

    <div class="campo"><span>Tu nombre</span><span></span></div>

    <h2>1 · El orden de los ritos</h2>
    <p style="font-size:11pt; color:#7a5c34;">
      Escribe los cinco ritos en el orden en que crees que hay que ejecutarlos. Si prefieres, marca
      la casilla del lugar que le das a cada uno: la primera casilla es el primer lugar.
      <strong>Se ejecuta el orden más votado de la mesa</strong>, no el tuyo: convencer cuenta tanto
      como acertar.
    </p>

    <table>
      <thead>
        <tr>
          <th>Rito</th>
          <th style="text-align:center;">1.º &nbsp; 2.º &nbsp; 3.º &nbsp; 4.º &nbsp; 5.º</th>
        </tr>
      </thead>
      <tbody>
${casillas}
      </tbody>
    </table>

    <div class="caja junto">
      <span class="etiqueta">O escríbelo aquí, del primero al último</span>
      <span class="renglon"></span>
      <span class="renglon"></span>
      <span class="renglon"></span>
      <span class="renglon"></span>
      <span class="renglon"></span>
    </div>

    <h2>2 · Quién rompió el sello</h2>
    <p style="font-size:11pt; color:#7a5c34;">
      Marca a una sola persona. Se señala <strong>una vez y para toda la partida</strong>: no se
      puede cambiar, y no se te va a decir si has acertado hasta el desenlace.
    </p>

    <div class="caja junto">
      <table>
        <tbody>
${gente}
        </tbody>
      </table>
    </div>

    <div class="caja caja--almagre junto">
      <span class="etiqueta">Antes de entregarla</span>
      <p style="margin:0;">
        Comprueba que has puesto tu nombre y que no has dejado ningún rito fuera. Una hoja con
        cuatro ritos no cuenta como propuesta, y esta noche cada voto pesa.
      </p>
    </div>`;

  return envolverPapiro(`${plot.title} — Hoja del sellado`, contenido, opciones);
}
