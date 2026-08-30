/**
 * Los dosieres de la expedición: uno por persona, para meter en un sobre.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DOS PÁGINAS POR PERSONA, NI UNA MÁS. POR QUÉ IMPORTA TANTO
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * El catálogo declara este documento a doble cara, así que cada hoja lleva dos
 * páginas. Si un dosier ocupase tres, la cuarta cara sería la primera página del
 * dosier SIGUIENTE, y al repartir los sobres alguien se llevaría media ficha de
 * otra persona pegada a la suya. Con secretos dentro.
 *
 * Por eso cada dosier está maquetado para caber en exactamente dos páginas —una
 * hoja— y el documento avisa de qué hacer si alguna se desborda. Es una
 * restricción de papel, no de gusto.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EL DOSIER DEL SAQUEADOR
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Sí le dice que fue él, igual que el de CLUEDO le dice al asesino que lo es:
 * nadie puede interpretar un papel que no sabe que tiene. Le dice además que
 * puede falsificar. Lo que NO hace es marcarse por fuera de ninguna manera —ni
 * un color, ni un símbolo, ni una página de más—: si los sobres se distinguen,
 * el juego se acabó antes de repartirlos.
 */
import { esc } from '../../html';
import { entidadesDe, manifiestoDe } from '../../../../../shared/juegos';
import { envolverPapiro, portadaPapiro, sinTrama } from './comun';
import { vistaDeLaMomia } from './datos';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../../shared/types';
import { registrarDosieres } from '../../dosieres';

export function dosierExpedicionario(
  game: GameSession,
  plot: Plot,
  opciones: DocumentRenderOptions,
): string {
  const vista = vistaDeLaMomia(game, plot);
  if (!vista.hay || !vista.trama) return sinTrama('Dosieres de la expedición', opciones);

  const reglas = manifiestoDe(game.settings?.juego).reglas ?? [];
  const saqueadorId = plot.solution?.respuestas?.saqueador;

  /*
   * UNO SOLO CUANDO LO PIDE EL TALLER. El documento lleva dentro el de toda la
   * mesa —se imprime de una vez y se recorta— pero el taller los reparte de uno
   * en uno: abre el de Ana, lo manda por correo, lo descarga. Mandarle a una
   * persona el fichero entero sería repartirle la partida.
   */
  const gente = opciones.soloPara
    ? vista.expedicionarios.filter((e) => e.id === opciones.soloPara)
    : vista.expedicionarios;

  const dosieres = gente
    .map((persona, indice) => {
      const personaje = plot.characters.find((c) => c.participanteId === persona.id);
      const don = vista.donDe(persona.id);
      const elDon = vista.sabor?.elDon[persona.id] ?? '';
      const esSaqueador = persona.id === saqueadorId;
      const otros = vista.expedicionarios.filter((e) => e.id !== persona.id);

      const conocimiento = (personaje?.knowledge ?? [])
        .map((k) => `        <li>${esc(k)}</li>`)
        .join('\n');

      const expedicion = otros
        .map((otro) => {
          const suyo = plot.characters.find((c) => c.participanteId === otro.id);
          return `        <tr>
          <td style="width:44mm;"><strong>${esc(suyo?.characterName ?? otro.name)}</strong><br /><span style="font-size:10pt; color:#7a5c34;">${esc(otro.name)}</span></td>
          <td>${esc(suyo?.role ?? '')}<br /><span style="font-size:10.5pt;">${esc(suyo?.publicPersona ?? '')}</span></td>
        </tr>`;
        })
        .join('\n');

      return `    <section class="${indice === 0 ? '' : 'pagina'}">
${portadaPapiro(
  `Dosier de ${persona.name}`,
  personaje?.characterName ?? persona.name,
  personaje?.role ?? 'miembro de la expedición',
  'No lo abras hasta que te lo digan · No se lo enseñes a nadie',
)}

      <h2>Quién eres</h2>
      <p>${esc(personaje?.publicPersona ?? '')}</p>
      ${personaje?.personalHook ? `<p><em>${esc(personaje.personalHook)}</em></p>` : ''}

      <div class="caja caja--lapis junto">
        <span class="etiqueta">Tu don · ${esc(don?.rol ?? 'sin papel')} — ${esc(don?.nombre ?? '')}</span>
        <p style="margin:0; font-size:13pt;">${esc(don?.texto ?? 'Esta partida no te ha asignado un don.')}</p>
        ${elDon ? `<p style="margin:2.5mm 0 0; font-style:italic;">${esc(elDon)}</p>` : ''}
        <p style="margin:2.5mm 0 0; font-size:10.5pt; color:#7a5c34;">
          Una vez por vigilia. Se dice en voz alta que lo usas; lo que veas es cosa tuya.
        </p>
      </div>

      <div class="caja junto">
        <span class="etiqueta">Los cinco ritos del sellado</span>
        <p style="margin:0 0 1.5mm; font-size:10.5pt; color:#7a5c34;">
          Los sabe toda la expedición desde el principio. Lo que nadie sabe es en qué orden van.
        </p>
        <p style="margin:0;">${vista.ritos.map((r) => esc(r.name)).join(' · ')}</p>
      </div>

      <div class="caja caja--almagre junto">
        <span class="etiqueta">Tu secreto — nadie más lo lee</span>
        <p style="margin:0;">${esc(personaje?.secret ?? '')}</p>
      </div>

      <div class="caja junto">
        <span class="etiqueta">Qué ganarías si la tumba NO se sellara</span>
        <p style="margin:0;">${esc(personaje?.motive ?? '')}</p>
      </div>

      <div class="caja junto">
        <span class="etiqueta">Lo que declaraste aquella noche</span>
        <p style="margin:0;">${esc(personaje?.alibi ?? '')}</p>
      </div>

      ${
        esSaqueador
          ? `<div class="caja caja--almagre junto" style="border-width:3px;">
        <span class="etiqueta almagre">Esto solo lo lees tú</span>
        <p style="margin:0; font-size:14pt;"><strong>Fuiste tú.</strong> Rompiste el sello a propósito, por encargo de un comprador, y no quieres que la tumba se vuelva a sellar.</p>
        <p style="margin:2.5mm 0 0;">${esc(plot.solution?.motive ?? '')}</p>
        <p style="margin:2.5mm 0 0;">${esc(plot.solution?.howItHappened ?? '')}</p>
        <p style="margin:3mm 0 0;">
          <strong>Tienes un don de más: falsificar.</strong> Una vez por vigilia puedes pedirle a
          quien dirige un fragmento FALSO y ponerlo sobre la mesa como si lo hubieras encontrado.
          Nadie sabe que puedes hacerlo. Úsalo con cabeza: una mentira que se pilla enseguida te
          señala a ti.
        </p>
        <p style="margin:3mm 0 0;">
          Ganas si amanece con la tumba abierta. Juega como una más: ayuda, opina, propón órdenes.
          Quien se calla toda la noche es el primero al que señalan.
        </p>
      </div>`
          : ''
      }

      <div class="pagina"></div>
      <h2>Lo que sabes de los demás</h2>
      ${conocimiento ? `<ul>\n${conocimiento}\n      </ul>` : '<p><em>Nada en concreto. Tendrás que preguntar.</em></p>'}

      <h2>Quiénes van</h2>
      <table>
        <tbody>
${expedicion}
        </tbody>
      </table>

      <h2>Cómo se juega</h2>
${reglas.map((r) => `      <p><strong>${esc(r.titulo)}.</strong> ${esc(r.texto)}</p>`).join('\n')}
    </section>`;
    })
    .join('\n\n');

  const contenido = `    <div class="aviso no-imprimir">
      Esta primera hoja es para quien reparte · No entra en ningún sobre
    </div>

    <div class="caja caja--lapis junto no-imprimir">
      <span class="etiqueta">Cómo se reparte</span>
      <ol style="margin:0;">
        <li>Cada dosier ocupa <strong>una hoja por las dos caras</strong>. Imprime a doble cara y
          separa de hoja en hoja.</li>
        <li>Si algún dosier se desborda a una tercera cara, imprime este documento a una sola cara
          y sepáralo contando páginas: si no, la última cara de uno cae en la hoja del siguiente.</li>
        <li>Mete cada uno en un sobre con el nombre de su persona. <strong>Nadie abre el ajeno.</strong></li>
        <li>Todos los dosieres son iguales por fuera. Uno de ellos dice cosas que los demás no
          dicen: no lo comentes, no lo mires dos veces y no lo dejes el último.</li>
      </ol>
    </div>

${dosieres}`;

  return envolverPapiro(`${plot.title} — Dosieres de la expedición`, contenido, opciones);
}

/*
 * El alta para el taller, que reparte los dosieres de uno en uno.
 *
 * Es el MISMO documento, compuesto solo con el bloque de esa persona. Va al
 * final de su fichero para que no se pueda mover sin ver el registro.
 */
/*
 * EL TITULO, y hasta hoy no lo elegia este juego.
 *
 * Lo ponia `tituloJugador` dentro de `renderer.ts`, o sea el nucleo decidiendo
 * como se llama el dosier de alguien en CUALQUIER juego. Da la misma cadena que
 * antes —byte a byte, lo comprueba el maestro de oro— y ahora la dice quien
 * tiene derecho a decirla. Que los tres juegos coincidan hoy es una casualidad,
 * no un contrato.
 */
registrarDosieres('momia', {
  tituloDeUno: (game, plot, participanteId) =>
    `${plot.title} — Dosier de ${entidadesDe(game, 'expedicionarios').find((s) => s.id === participanteId)?.name ?? ''}`,
  deUno: (game, plot, participanteId, opciones) =>
    dosierExpedicionario(game, plot, { ...opciones, soloPara: participanteId }),
});
