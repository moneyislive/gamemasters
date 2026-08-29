/**
 * El informe de la senda: la comprobación previa, escrita para leerse.
 *
 * Es `verify:senda-sombras` traducido a una hoja. Rehace las cuatro garantías
 * SOBRE LA TRAMA GUARDADA —no sobre la que se generó— para que, si alguien tocó
 * la partida después, el informe se entere. Y añade la quinta que solo tiene
 * sentido en papel: que ningún hito se haya quedado sin aparecer en ningún paso,
 * porque entonces la mesa nunca podría reunirlo y no habría senda que trazar.
 *
 * ES DE QUIEN PREPARA, NO DE QUIEN DIRIGE, y eso está razonado en el manifiesto:
 * dentro va el texto entero de los hitos ciertos, y esos hitos determinan una
 * sola senda. Quien los lee tiene la solución aunque no venga enumerada. Con
 * `audience: 'gm'` esta hoja acabaría en la carpeta cuyo propio léeme promete que
 * nada de ahí revela el caso.
 *
 * VA APAGADO POR DEFECTO (`defaultOn: false`). No hace falta para jugar; hace
 * falta cuando algo huele mal.
 */
import { esc } from '../../html';
import { envolverWashi, portadaWashi, sinTrama } from './comun';
import { vistaDeLasSombras } from './datos';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../../shared/types';

function marca(bien: boolean): string {
  return bien
    ? '<strong style="color:#2f6b46;">CORRECTO</strong>'
    : '<strong class="bermellon">REVISAR</strong>';
}

export function informeSenda(
  game: GameSession,
  plot: Plot,
  opciones: DocumentRenderOptions,
): string {
  const vista = vistaDeLasSombras(game, plot);
  if (!vista.hay || !vista.trama || !vista.informe) {
    return sinTrama('Informe de la senda', opciones);
  }
  const i = vista.informe;
  const trama = vista.trama;

  const hitos = trama.condiciones
    .map(
      (c) => `        <tr>
          <td style="width:18mm;" class="maquina">${esc(c.id)}</td>
          <td>${esc(c.texto)}</td>
        </tr>`,
    )
    .join('\n');

  const cobertura = vista.pasos
    .map((paso) => {
      const porHora = vista.horas.map((h) => {
        const encontrado = vista.hallazgos.find(
          (x) => x.ronda === h.ronda && x.paso?.id === paso.id,
        );
        return `<td class="maquina" style="text-align:center;">${esc(encontrado?.hito.id ?? '—')}</td>`;
      });
      return `        <tr><td style="width:56mm;">${esc(paso.name)}</td>${porHora.join('')}</tr>`;
    })
    .join('\n');

  const cabeceraHoras = vista.horas
    .map((h) => `<th style="text-align:center;">${esc(h.kanji)}</th>`)
    .join('');

  const revision = vista.revision;
  const incidencias = (revision?.incidencias ?? [])
    .map(
      (inc) => `        <tr>
          <td style="width:52mm;">${esc(inc.donde)}</td>
          <td style="width:26mm;">${esc(inc.arreglo)}</td>
          <td>${esc(inc.motivo)}</td>
        </tr>`,
    )
    .join('\n');

  const contenido = `${portadaWashi(
    'Comprobación previa',
    'Informe de la senda',
    plot.tagline,
    'Solo para quien prepara · lleva dentro los hitos ciertos',
  )}

    <div class="${i.ok ? 'caja caja--anil' : 'aviso'} junto">
      ${
        i.ok
          ? '<p style="margin:0;"><strong>El camino está bien trazado.</strong> Tiene una sola solución, ningún hito sobra, todos aparecen en alguna habitación y nadie puede resolverlo en solitario.</p>'
          : 'Este camino no cumple alguna de sus garantías · Vuelve a generar la partida'
      }
    </div>

    <h2>Las cinco garantías</h2>
    <div class="tabla-marco">
      <table>
        <thead><tr><th>Qué se comprueba</th><th style="width:34mm;">Resultado</th><th style="width:30mm;"></th></tr></thead>
        <tbody>
          <tr>
            <td><strong>Una sola senda.</strong> De todas las combinaciones posibles de
              ${trama.sendaVerdadera.length} pasos en orden, ¿cuántas cumplen todos los hitos?</td>
            <td>${i.soluciones} ${i.soluciones === 1 ? 'senda' : 'sendas'}</td>
            <td>${marca(i.unico)}</td>
          </tr>
          <tr>
            <td><strong>Y es la que la casa dio por buena.</strong> Que haya una sola no basta si no
              es la misma que se guardó.</td>
            <td>${i.unico ? 'coincide' : 'NO coincide'}</td>
            <td>${marca(i.unico)}</td>
          </tr>
          <tr>
            <td><strong>Ninguno sobra.</strong> Quitar cualquier hito tiene que hacer aparecer más de
              una senda; si no, ese hito no hacía falta y el camino se resuelve con menos cartas.</td>
            <td>${i.redundantes.length} de sobra</td>
            <td>${marca(i.redundantes.length === 0)}</td>
          </tr>
          <tr>
            <td><strong>Nadie lo resuelve solo.</strong> La mejor mano posible —el paso más cargado
              de cada hora— reúne ${i.maximoEnUnaMano} hitos, y con ellos quedan
              ${i.solucionesConEsaMano} sendas posibles. Dos o más es lo que hace falta.</td>
            <td>${i.solucionesConEsaMano} ${i.solucionesConEsaMano === 1 ? 'senda' : 'sendas'}</td>
            <td>${marca(i.solucionesConEsaMano >= 2)}</td>
          </tr>
          <tr>
            <td><strong>Todos aparecen.</strong> Un hito que no esté en ninguna habitación ninguna
              hora no se puede reunir, y sin él el camino no se cierra.</td>
            <td>${i.hitosSinSalir.length} sin salir</td>
            <td>${marca(i.hitosSinSalir.length === 0)}</td>
          </tr>
          <tr>
            <td><strong>Las mentiras engañan.</strong> Ninguna puede ser cierta por accidente, y
              ninguna se desmiente con un solo hito: hacen falta al menos
              ${i.refutabilidadMinima === Infinity ? '—' : i.refutabilidadMinima}.</td>
            <td>${i.falsasQueNoEnganan.length} inservibles</td>
            <td>${marca(i.falsasQueNoEnganan.length === 0 && i.refutabilidadMinima >= 2)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    ${
      i.redundantes.length > 0
        ? `<div class="caja caja--bermellon junto">
      <span class="etiqueta">Hitos que sobran</span>
      <ul style="margin:0;">${i.redundantes.map((r) => `<li>${esc(r.texto)}</li>`).join('')}</ul>
    </div>`
        : ''
    }

    <h2>Los hitos ciertos</h2>
    <p style="font-size:11pt; color:#7c7159;">
      Estos ${trama.condiciones.length} determinan la senda entre todos. Quien los lea tiene la
      solución: por eso esta hoja no es de quien dirige.
    </p>
    <div class="tabla-marco">
      <table><tbody>
${hitos}
      </tbody></table>
    </div>

    <h2>Dónde sale cada uno</h2>
    <p style="font-size:11pt; color:#7c7159;">
      Una casilla por paso y por hora. Que un hito se repita no es un error: dos personas que
      coincidan tienen que leer lo mismo.
    </p>
    <div class="tabla-marco">
      <table>
        <thead><tr><th>Paso</th>${cabeceraHoras}</tr></thead>
        <tbody>
${cobertura}
        </tbody>
      </table>
    </div>

    ${
      revision
        ? `<h2>Qué hubo que corregirle al modelo</h2>
    <p style="font-size:11pt; color:#7c7159;">
      Se aceptaron <strong>${revision.aceptadas}</strong> de <strong>${revision.total}</strong>
      frases tal y como las escribió. Las demás se sustituyeron por la redacción del código, que es
      más sosa y es cierta. Una partida con muchas sustituciones se juega igual de bien; solo se lee
      peor.
    </p>
    ${
      incidencias
        ? `<div class="tabla-marco">
      <table>
        <thead><tr><th>Dónde</th><th>Qué se hizo</th><th>Por qué</th></tr></thead>
        <tbody>
${incidencias}
        </tbody>
      </table>
    </div>`
        : '<p><em>No hubo ninguna incidencia.</em></p>'
    }`
        : ''
    }`;

  return envolverWashi(`${plot.title} — Informe de la senda`, contenido, opciones);
}
