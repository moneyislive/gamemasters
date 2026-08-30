/**
 * Los dosieres de la columna: uno por persona, para meter en un sobre.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CUATRO PÁGINAS POR PERSONA, LAS MISMAS PARA TODOS. POR QUÉ IMPORTA TANTO
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * El catálogo declara este documento a doble cara, así que cada hoja lleva dos
 * páginas. Un dosier tiene que ocupar un número PAR de caras: si ocupase tres,
 * la cuarta sería la primera página del dosier SIGUIENTE, y al repartir los
 * sobres alguien se llevaría media ficha de otra persona pegada a la suya. Con
 * secretos dentro.
 *
 * Aquí son cuatro —dos hojas—, y no dos como en la Momia, porque este juego pide
 * más papel: la tabla de quién cruza, la carga, los pasos y trece reglas no
 * caben en una hoja sin dejarlas ilegibles. Se midió: en una sola hoja el dosier
 * se desbordaba a una tercera cara, que es exactamente el fallo de arriba.
 *
 * LAS CUATRO CARAS ESTÁN CUADRADAS A MANO y no por casualidad: 1057 / 917 / 1017
 * / 1018 px de alto sobre las 1009 que da un A4 con estos márgenes. Si se añade
 * o se quita contenido hay que volver a repartirlo entre las cuatro, no dejar
 * que el navegador parta por donde quiera.
 *
 * Y LA SEGUNDA CARA EXISTE EN TODOS LOS DOSIERES. Es donde el kanchō lee lo
 * suyo; quien no lo es encuentra allí el cuaderno de la noche. Si esa cara fuera
 * solo del traidor, su sobre sería el más gordo de la mesa y el juego se
 * acabaría antes de repartirlo.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EL DOSIER DEL KANCHŌ
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Sí le dice que cobra de Akechi, igual que el de CLUEDO le dice al asesino que
 * lo es: nadie puede interpretar un papel que no sabe que tiene. Le dice además
 * que puede dejar hitos falsos, y —esto es propio de este juego— le da la LISTA
 * DE PASOS BATIDOS de toda la noche, que es su ventaja de verdad.
 *
 * Lo que NO hace es marcarse por fuera de ninguna manera —ni un color, ni un
 * símbolo, ni una página de más—: si los sobres se distinguen, el juego se acabó
 * antes de repartirlos.
 */
import { esc } from '../../html';
import { manifiestoDe } from '../../../../../shared/juegos';
import { PRENDAS_INICIALES } from '../../../../../shared/juegos/sombras-tipos';
import { envolverWashi, portadaWashi, sinTrama } from './comun';
import { vistaDeLasSombras } from './datos';
import { registrarDosieres } from '../../dosieres';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../../shared/types';

export function dosierEscolta(
  game: GameSession,
  plot: Plot,
  opciones: DocumentRenderOptions,
): string {
  const vista = vistaDeLasSombras(game, plot);
  if (!vista.hay || !vista.trama) return sinTrama('Dosieres de la columna', opciones);

  const reglas = manifiestoDe(game.settings?.juego).reglas ?? [];
  const kanchoId = plot.solution?.respuestas?.kancho;

  /*
   * UNO SOLO CUANDO LO PIDE EL TALLER. El documento lleva dentro el de toda la
   * mesa —se imprime de una vez y se recorta— pero el taller los reparte de uno
   * en uno: abre el de Ana, lo manda por correo, lo descarga. Mandarle a una
   * persona el fichero entero sería repartirle la partida.
   */
  const gente = opciones.soloPara
    ? vista.escoltas.filter((e) => e.id === opciones.soloPara)
    : vista.escoltas;

  const carga = vista.enseres
    .map((enser) => {
      const porte = vista.porteDe(enser.id);
      const quien = vista.cargaInicialDe(enser.id);
      return `        <tr>
          <td style="width:52mm;"><strong>${esc(enser.name)}</strong>${
            quien ? `<br /><span style="font-size:10pt; color:#7c7159;">La lleva ${esc(quien.name)}</span>` : ''
          }</td>
          <td>${
            porte
              ? `<strong>${esc(porte.nombre)}</strong> <span class="kanji">${esc(porte.kanji)}</span>`
              : '<span style="font-size:10.5pt; color:#7c7159;">Sin efecto en las reglas.</span>'
          }</td>
        </tr>`;
    })
    .join('\n');

  const dosieres = gente
    .map((persona, indice) => {
      const personaje = plot.characters.find((c) => c.suspectId === persona.id);
      const disfraz = vista.disfrazDe(persona.id);
      const elDisfraz = vista.sabor?.elDisfraz[persona.id] ?? '';
      const estandarte = vista.estandarteDe(persona.id);
      const esKancho = persona.id === kanchoId;
      const otros = vista.escoltas.filter((e) => e.id !== persona.id);

      /*
       * LA CARA PRIVADA, Y POR QUÉ LA TIENE TAMBIÉN QUIEN NO ES EL KANCHŌ.
       *
       * El bloque del kanchō ocupa una cara entera. Si solo lo tuviera él, su
       * dosier tendría una hoja más que los demás y el sobre más gordo de la
       * mesa sería el del traidor: el juego se acabaría antes de repartirlo.
       * Así que esa cara existe en TODOS los dosieres y cambia de contenido, no
       * de tamaño. Quien no cobra de Akechi encuentra ahí el cuaderno.
       *
       * Y no es relleno: en este juego se gana atando quién estuvo dónde a cada
       * hora, que es justo lo que la mesa no puede sostener de memoria.
       */
      const cuaderno = `<div class="caja junto">
        <span class="etiqueta">Tu cuaderno de la noche</span>
        <p style="margin:0 0 2.5mm; font-size:10.5pt; color:#7c7159;">
          Nadie te lo va a pedir ni lo va a leer. Apunta en cuanto se cierre la hora: lo que no
          se escribe se discute a gritos al amanecer y no se recuerda.
        </p>
        <table>
          <thead>
            <tr>
              <th style="width:26mm;">Hora</th>
              <th style="width:44mm;">Dónde estuve</th>
              <th>Qué decía el hito</th>
              <th style="width:38mm;">Quién más andaba</th>
            </tr>
          </thead>
          <tbody>
${vista.horas
  .map(
    (h) => `            <tr style="height:21mm;">
              <td style="vertical-align:top;"><strong>${esc(h.nombre)}</strong></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>`,
  )
  .join('\n')}
          </tbody>
        </table>
      </div>

      <div class="caja junto">
        <span class="etiqueta">De quién sospechas, y por qué</span>
        <table>
          <tbody>
${otros
  .map(
    (otro) => `            <tr style="height:11mm;">
              <td style="width:46mm; vertical-align:top;">${esc(otro.name)}</td>
              <td></td>
            </tr>`,
  )
  .join('\n')}
          </tbody>
        </table>
      </div>`;

      const conocimiento = (personaje?.knowledge ?? [])
        .map((k) => `        <li>${esc(k)}</li>`)
        .join('\n');

      const columna = otros
        .map((otro) => {
          const suyo = plot.characters.find((c) => c.suspectId === otro.id);
          const suBandera = vista.estandarteDe(otro.id);
          return `        <tr>
          <td style="width:46mm;"><strong>${esc(suyo?.characterName ?? otro.name)}</strong><br /><span style="font-size:10pt; color:#7c7159;">${esc(otro.name)}</span>${
            suBandera ? `<br /><span style="font-size:10pt;">${esc(suBandera.name)}</span>` : ''
          }</td>
          <td>${esc(suyo?.role ?? '')}<br /><span style="font-size:10.5pt;">${esc(suyo?.publicPersona ?? '')}</span></td>
        </tr>`;
        })
        .join('\n');

      const batidosDelKancho = vista.horas
        .map(
          (h) =>
            `<li>${esc(h.nombre)}: <strong>${esc(h.batido?.name ?? '—')}</strong></li>`,
        )
        .join('');

      return `    <section class="${indice === 0 ? '' : 'pagina'}">
${portadaWashi(
  `Dosier de ${persona.name}`,
  personaje?.characterName ?? persona.name,
  personaje?.role ?? 'miembro de la columna',
  'No lo abras hasta que te lo digan · No se lo enseñes a nadie',
)}

      <h2>Quién eres</h2>
      <p>${esc(personaje?.publicPersona ?? '')}</p>
      ${personaje?.personalHook ? `<p><em>${esc(personaje.personalHook)}</em></p>` : ''}
      ${
        estandarte
          ? `<p><span class="mon kanji">紋</span> Cruzas bajo el blasón de <strong>${esc(estandarte.name)}</strong>${
              estandarte.description?.trim() ? `: ${esc(estandarte.description.trim())}` : '.'
            } Es público: los demás lo saben y te llamarán por él.</p>`
          : ''
      }

      <div class="caja caja--anil junto">
        <span class="etiqueta">Tu disfraz · ${esc(disfraz?.rol ?? 'sin papel')} <span class="kanji">${esc(disfraz?.kanji ?? '')}</span></span>
        <p style="margin:0; font-size:13pt;">${esc(disfraz?.texto ?? 'Esta partida no te ha asignado un disfraz.')}</p>
        ${elDisfraz ? `<p style="margin:2.5mm 0 0; font-style:italic;">${esc(elDisfraz)}</p>` : ''}
        <p style="margin:2.5mm 0 0; font-size:10.5pt; color:#7c7159;">
          Una vez por hora. Se dice en voz alta que lo usas; lo que veas es cosa tuya.
        </p>
      </div>

      <div class="caja junto">
        <span class="etiqueta">Cómo se reconoce un paso</span>
        <p style="margin:0;">
          Vas <strong>andando</strong> hasta la habitación, lees en voz baja la palabra escrita en
          el cartel de la puerta y la dices —o la tecleas—. Solo entonces te dan el hito de ese
          paso a esa hora. Si te equivocas de palabra no pierdes la hora: vuelve a mirar.
        </p>
      </div>

      <div class="caja caja--bermellon junto">
        <span class="etiqueta">Tu secreto — nadie más lo lee</span>
        <p style="margin:0;">${esc(personaje?.secret ?? '')}</p>
      </div>

      <div class="caja junto">
        <span class="etiqueta">Qué ganarías si el señor NO llegara a la barca</span>
        <p style="margin:0;">${esc(personaje?.motive ?? '')}</p>
      </div>

      <div class="caja junto">
        <span class="etiqueta">Lo que declaraste al salir de Sakai</span>
        <p style="margin:0;">${esc(personaje?.alibi ?? '')}</p>
      </div>

      <div class="pagina"></div>
      <h2>Los pasos del camino</h2>
      <p style="font-size:11pt; color:#7c7159;">
        Estos son todos. Solo <strong>${vista.sendaVerdadera.length}</strong> forman la senda que
        llega a la playa, y hay que andarlos en orden. Cuáles y en qué orden es lo que hay que
        averiguar.
      </p>
      <p>${vista.pasos.map((p) => esc(p.name)).join(' · ')}</p>

      ${
        esKancho
          ? `<div class="caja caja--bermellon junto" style="border-width:3px;">
        <span class="etiqueta bermellon">Esto solo lo lees tú</span>
        <p style="margin:0; font-size:14pt;"><strong>Cobras de Akechi.</strong> No quieres que el señor llegue a Shirako, y esta noche eso significa dejar que amanezca.</p>
        <p style="margin:2.5mm 0 0;">${esc(plot.solution?.motive ?? '')}</p>
        <p style="margin:2.5mm 0 0;">${esc(plot.solution?.howItHappened ?? '')}</p>
        <p style="margin:3mm 0 0;">
          <strong>Sabes dónde esperan los cazadores cada hora.</strong> Te lo dijeron:
        </p>
        <ul style="margin:1.5mm 0 0;">${batidosDelKancho}</ul>
        <p style="margin:3mm 0 0;">
          <strong>Y puedes dejar un mojón escrito de tu puño.</strong> Una vez por hora, pídele a
          quien dirige un hito FALSO y ponlo sobre la mesa como si lo hubieras leído. Hazlo en un
          paso donde NO HAYA NADIE MÁS: la columna sabe quién estuvo dónde a cada hora, y dos
          personas en el mismo sitio leyeron lo mismo.
        </p>
        <p style="margin:3mm 0 0;">
          Ganas si al amanecer no se ha andado la senda buena. Cruza como una más: ayuda, opina,
          propón sendas, da tus prendas. Quien se calla toda la noche es al primero al que señalan.
        </p>
      </div>`
          : cuaderno
      }

      <div class="pagina"></div>
      <h2>Lo que sabes de los demás</h2>
      ${conocimiento ? `<ul>\n${conocimiento}\n      </ul>` : '<p><em>Nada en concreto. Tendrás que preguntar.</em></p>'}

      <h2>Quiénes cruzan</h2>
      <table>
        <tbody>
${columna}
        </tbody>
      </table>

      <h2>La carga</h2>
      <p style="font-size:11pt; color:#7c7159;">
        Quién lleva qué es público, y se pasa de mano dándolo de verdad. Tres de estas cosas pesan
        en las reglas.
      </p>
      <table>
        <tbody>
${carga}
        </tbody>
      </table>

      <div class="pagina"></div>
      <div class="caja junto">
        <span class="etiqueta">Tus prendas</span>
        <p style="margin:0;">
          Empiezas con <strong>${PRENDAS_INICIALES}</strong>. Solo se dan a OTRA persona, nunca a
          ti, y nadie puede tener más de dos recibidas. En el consejo del alba tu voto pesa uno más
          por cada prenda que te hayan dado. Y quien recibe una <strong>debe una respuesta sincera
          a una pregunta directa</strong>, en voz alta y delante de todos.
        </p>
        <p style="margin:2.5mm 0 0;">
          ${'<span class="casilla"></span>'.repeat(PRENDAS_INICIALES)} <span style="font-size:10.5pt; color:#7c7159;">tacha una cada vez que des la tuya</span>
        </p>
      </div>

      <h2>Cómo se juega</h2>
      <div class="reglas">
${reglas.map((r) => `        <p><strong>${esc(r.titulo)}.</strong> ${esc(r.texto)}</p>`).join('\n')}
      </div>
    </section>`;
    })
    .join('\n\n');

  const contenido = `    <div class="aviso no-imprimir">
      Esta primera hoja es para quien reparte · No entra en ningún sobre
    </div>

    <div class="caja caja--anil junto no-imprimir">
      <span class="etiqueta">Cómo se reparte</span>
      <ol style="margin:0;">
        <li>Cada dosier ocupa <strong>dos hojas por las dos caras</strong> —cuatro páginas—.
          Imprime a doble cara y separa de dos en dos hojas.</li>
        <li>Son cuatro páginas <strong>en todos los dosieres, sin excepción</strong>. Si cuentas
          uno con cinco, algo se ha desbordado al imprimir: no lo repartas así, porque la hoja
          que sobra de uno cae en el sobre del siguiente.</li>
        <li>Mete cada uno en un sobre con el nombre de su persona. <strong>Nadie abre el ajeno.</strong></li>
        <li>Todos son iguales por fuera <em>y pesan lo mismo</em>: la segunda página de uno dice
          cosas que los demás no dicen, pero ocupa lo mismo que la de ellos. No la comentes, no la
          mires dos veces y no dejes ese sobre el último.</li>
      </ol>
    </div>

${dosieres}`;

  return envolverWashi(`${plot.title} — Dosieres de la columna`, contenido, opciones);
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
registrarDosieres('sombras', {
  tituloDeUno: (game, plot, suspectId) =>
    `${plot.title} — Dosier de ${game.suspects.find((s) => s.id === suspectId)?.name ?? ''}`,
  deUno: (game, plot, suspectId, opciones) =>
    dosierEscolta(game, plot, { ...opciones, soloPara: suspectId }),
});
