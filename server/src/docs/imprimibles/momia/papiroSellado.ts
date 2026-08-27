/**
 * El papiro del sellado: la solución. Una hoja, una cara, boca abajo.
 *
 * Es la única hoja del paquete que lleva a la vez el orden verdadero de los
 * cinco ritos y el nombre de quien rompió el sello. Está separada de la guía a
 * propósito (ver la cabecera de `guiaExpedicion.ts`): la guía se maneja toda la
 * noche delante de la mesa y esta no se toca hasta el final.
 *
 * De ahí vienen tres decisiones de maqueta que parecen tonterías y no lo son:
 *
 *   · UNA SOLA CARA. Se deja boca abajo sobre la mesa y no hay nada detrás que
 *     se pueda leer del revés.
 *   · TODO EN UNA PÁGINA. Si hubiera que pasar hoja para saber quién fue, se
 *     pasaría delante de todo el mundo.
 *   · EL ORDEN, EN GRANDE Y NUMERADO. Se lee de un vistazo, a media luz, con
 *     doce personas mirando y sin poder acercárselo a la cara.
 */
import { esc } from '../../html';
import { envolverPapiro, portadaPapiro, sinTrama } from './comun';
import { vistaDeLaMomia } from './datos';
import type { VistaGm } from '../../contexto';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../../shared/types';

export function papiroSellado(
  game: GameSession,
  plot: Plot,
  vistaDelGm: VistaGm,
  opciones: DocumentRenderOptions,
): string {
  const vista = vistaDeLaMomia(game, plot);
  if (!vista.hay || !vista.trama) return sinTrama('El papiro del sellado', opciones);

  /*
   * QUIÉN SOSTIENE ESTA HOJA CAMBIA CON EL MODO, y no es un matiz de redacción.
   * Con el Game Master a ciegas, quien dirige juega como uno más y no puede leer
   * esto: la guarda quien preparó el material, y es esa persona la que saca el
   * papiro al final y comprueba el orden votado. Una hoja que dijera «para quien
   * dirige» acabaría en las manos exactamente equivocadas.
   */
  const aCiegas = vistaDelGm.hayPreparador;

  const ritos = vista.ordenVerdadero
    .map((rito, i) => {
      const sabor = rito ? vista.sabor?.ritos[rito.id] : undefined;
      return `        <tr>
          <td style="width:14mm; text-align:center; font-family:'Marcellus SC',serif; font-size:20pt; color:#9c3b1b;">${i + 1}</td>
          <td>
            <strong style="font-size:15pt;">${esc(rito?.name ?? 'rito desconocido')}</strong>
            ${sabor?.invocacion ? `<br /><em style="font-size:11pt;">«${esc(sabor.invocacion)}»</em>` : ''}
            ${sabor?.gesto ? `<br /><span class="maquina" style="color:#7a5c34;">${esc(sabor.gesto)}</span>` : ''}
          </td>
        </tr>`;
    })
    .join('\n');

  const saqueador = vista.saqueador;
  const donDelSaqueador = saqueador?.entidad ? vista.donDe(saqueador.entidad.id) : undefined;
  const reliquia = vista.reliquias.find((r) => r.id === vista.trama!.reliquiaCodiciada);

  const contenido = `${portadaPapiro(
    aCiegas ? 'Solo quien prepara' : 'No la dejes sobre la mesa',
    'El papiro del sellado',
    'Lo que estaba escrito antes de que la puerta se abriera',
  )}

    <div class="aviso">
      Esta hoja tiene la solución entera<br />
      ${
        aCiegas
          ? 'Quien dirige juega esta noche: NO se la des'
          : 'Boca abajo hasta el final de la noche'
      }
    </div>

    ${
      aCiegas
        ? `<div class="caja caja--almagre junto">
      <span class="etiqueta">En esta partida diriges tú el sellado</span>
      <p style="margin:0;">
        Quien conduce la velada juega como un expedicionario más y no conoce la solución. Cuando
        la mesa haya votado su orden, sales tú con esta hoja, ejecutas los ritos en el orden
        votado y dices si la tumba se sella. Hasta entonces no la enseñes a nadie, ni a quien
        dirige.
      </p>
    </div>`
        : ''
    }

    <h2>El orden verdadero</h2>
    <table>
      <tbody>
${ritos}
      </tbody>
    </table>

    <div class="caja caja--lapis junto">
      <span class="etiqueta">Cómo se ejecuta</span>
      <p style="margin:0;">
        La mesa vota un orden. Ejecutas <strong>el que salga votado</strong>, no este: lee la
        invocación de cada rito y haz su gesto, uno a uno. Si coincide con el de arriba, la tumba
        se sella y gana la expedición entera menos quien rompió el sello. Si no coincide, amanece
        con la tumba abierta y gana esa persona.
      </p>
    </div>

    <h2>Quién rompió el sello</h2>
    <div class="caja caja--almagre junto">
      <p style="margin:0; font-size:17pt; font-family:'Marcellus SC',serif; color:#9c3b1b;">
        ${esc(saqueador?.entidad?.name ?? 'sin asignar')}
      </p>
      ${saqueador?.personaje ? `<p style="margin:1mm 0 0; font-style:italic;">en la ficción, ${esc(saqueador.personaje)}</p>` : ''}
      ${donDelSaqueador ? `<p style="margin:3mm 0 0;"><span class="etiqueta" style="display:inline;">Su don declarado</span> ${esc(donDelSaqueador.rol)} · ${esc(donDelSaqueador.nombre)}. Además puede <strong>falsificar</strong>, y eso no lo sabe nadie.</p>` : ''}
      ${reliquia ? `<p style="margin:2mm 0 0;"><span class="etiqueta" style="display:inline;">La pieza que tiene vendida</span> ${esc(reliquia.name)}</p>` : ''}
    </div>

    ${
      plot.solution?.motive
        ? `<div class="caja junto">
      <span class="etiqueta">Por qué lo hizo</span>
      <p style="margin:0;">${esc(plot.solution.motive)}</p>
    </div>`
        : ''
    }

    ${
      plot.solution?.howItHappened
        ? `<div class="caja junto">
      <span class="etiqueta">Cómo ocurrió</span>
      <p style="margin:0;">${esc(plot.solution.howItHappened)}</p>
    </div>`
        : ''
    }

    ${
      plot.material?.finale
        ? `<h2>El desenlace, para leer en voz alta</h2>
    <div class="caja junto">
      <span class="etiqueta">La reconstrucción</span>
      <p style="margin:0;">${esc(plot.material.finale.reconstruction)}</p>
    </div>
    <div class="caja caja--almagre junto">
      <span class="etiqueta">La confesión — la lee ${esc(saqueador?.entidad?.name ?? 'quien rompió el sello')}, no tú</span>
      <p style="margin:0; font-style:italic;">${esc(plot.material.finale.confession)}</p>
    </div>
    <div class="caja junto">
      <span class="etiqueta">El epílogo</span>
      <p style="margin:0;">${esc(plot.material.finale.epilogue)}</p>
    </div>`
        : ''
    }`;

  return envolverPapiro(`${plot.title} — El papiro del sellado`, contenido, opciones);
}
