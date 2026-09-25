/**
 * Los dosieres de la columna: uno por persona, para meter en un sobre.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SEIS PÁGINAS POR PERSONA, LAS MISMAS PARA TODOS. POR QUÉ IMPORTA TANTO
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * El catálogo declara este documento a doble cara, así que cada hoja lleva dos
 * páginas. Un dosier tiene que ocupar un número PAR de caras: si ocupase cinco,
 * la sexta sería la primera página del dosier SIGUIENTE, y al repartir los
 * sobres alguien se llevaría media ficha de otra persona pegada a la suya. Con
 * secretos dentro.
 *
 * ERAN CUATRO, «CUADRADAS A MANO», Y NO CABÍAN. Medido el 25-sep-2026 con Edge
 * imprimiendo a PDF (`scripts/medir-paginas.ts`): la primera cara medía 1115 px
 * sobre los 1009 de un A4 con estos márgenes, y TODOS los dosieres del maestro
 * de oro salían a cinco caras —con textos cortos de plantilla; con los del
 * modelo, más—. Y el del kanchō, 100 px más largo que los demás, porque su
 * secreto lo era. Con cuatro caras al límite, lo que decidía cuántas hojas lleva
 * cada sobre era lo largo que el modelo hubiera escrito a cada cual: el sobre
 * más gordo de la mesa podía ser el del traidor sin que nadie lo decidiera.
 *
 * Así que son seis, repartidas para que cada cara tenga holgura de verdad:
 *
 *   1. Quién eres y tu disfraz.
 *   2. Tu secreto, lo que ganarías, lo que declaraste y cómo se reconoce un paso.
 *   3. Los pasos del camino y la cara privada (el cuaderno, o lo del kanchō).
 *   4. Lo que sabes de los demás y la carga.
 *   5. Quiénes cruzan: LA MISMA TABLA EN TODOS LOS DOSIERES, con todo el mundo
 *      dentro. Antes cada dosier la imprimía sin su dueño, y la altura de la
 *      tabla cambiaba con la presentación que faltaba.
 *   6. Tus prendas y cómo se juega, que no cambian de nadie a nadie.
 *
 * Lo que varía de una persona a otra (las caras 1 a 4) tiene presupuesto: la
 * auditoría de la revisión (`sombras-auditoria.ts`) avisa si un texto pasa del
 * que cabe, y el revisor lo acorta. Si se añade contenido aquí, se vuelve a
 * medir con `scripts/medir-paginas.ts`.
 *
 * Y LA CARA PRIVADA EXISTE EN TODOS LOS DOSIERES, con el mismo aspecto. Es donde
 * el kanchō lee lo suyo; quien no lo es encuentra allí el cuaderno de la noche.
 * Si esa cara fuera solo del traidor, o se viera distinta desde la silla de al
 * lado, el juego se acabaría antes de repartirlo.
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
import { entidadesDe, manifiestoDe } from '../../../../../shared/juegos';
import { PRENDAS_INICIALES } from '../../../../../shared/juegos/sombras-tipos';
import { envolverWashi, portadaWashi, sinTrama } from './comun';
import { vistaDeLasSombras } from './datos';
import { registrarDosieres } from '../../dosieres';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../../shared/types';

/** Lo que cabe en una cara de A4 con estos márgenes, en px de pantalla (267 mm). */
const ALTO_DE_CARA = 1009;

/**
 * Cuántas caras ocupa «Quiénes cruzan», estimado con las medidas de verdad.
 *
 * Es la única parte del dosier que puede ocupar más de una cara —una fila por
 * persona, con su presentación—, y es la MISMA en todos los dosieres, así que
 * no puede hacer un sobre más gordo que otro. Lo que sí puede hacer es dejar el
 * total impar, y entonces, en el documento con toda la mesa impreso a doble
 * cara, el dosier siguiente empezaría en el dorso del anterior. Chromium no
 * sabe insertar la cara en blanco él solo (`break-before: right` se imprime como
 * un salto normal: medido), así que se estima aquí y se añade una de notas.
 *
 * Calibrado el 25-sep-2026 midiendo filas con Edge: una presentación de 361
 * caracteres da una fila de 206 px (8 líneas), una de 451, 251 (10) y una de
 * 586, 299 (13); la cabecera mide 58. O sea, unos 46 caracteres y 20 px por
 * línea de presentación, más el puesto a tamaño de texto y el aire de la celda.
 * Las filas no se parten entre caras (`tr` va con `break-inside: avoid`) y la
 * cabecera se repite en cada una.
 *
 * Si la estimación falla por una fila, el total puede salir impar: eso solo
 * estropea la impresión de la mesa entera a doble cara, y a TODOS los dosieres
 * por igual. Lo que no puede hacer es que un sobre abulte más que otro.
 */
export function carasDeLaTabla(filas: Array<{ nombre: string; blason: string; puesto: string; presentacion: string }>): number {
  const lineas = (texto: string, porLinea: number) => Math.max(1, Math.ceil(texto.length / porLinea));
  const CABECERA = 58; // la fila de títulos, que se repite en cada cara
  let usado = 58 + 60 + CABECERA; // el título, la entradilla y la cabecera
  let caras = 1;
  for (const f of filas) {
    const izquierda = 20 + 24 * lineas(f.nombre, 22) + 20 + (f.blason ? 20 * lineas(f.blason, 26) : 0);
    const centro = 20 + 24 * lineas(f.puesto, 40) + 20.2 * lineas(f.presentacion, 46);
    const alto = Math.max(izquierda, centro);
    if (usado + alto > ALTO_DE_CARA) {
      caras += 1;
      usado = CABECERA;
    }
    usado += alto;
  }
  return caras;
}

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

  /*
   * Cuántas caras lleva cada dosier: cinco fijas más las de «Quiénes cruzan», y
   * una de notas si el total sale impar. Se decide UNA VEZ para toda la mesa,
   * con la tabla que es igual en todos: así todos los sobres llevan las mismas.
   */
  const carasDeLaColumna = carasDeLaTabla(
    vista.escoltas.map((e) => {
      const suyo = plot.characters.find((c) => c.participanteId === e.id);
      return {
        nombre: suyo?.characterName ?? e.name,
        blason: vista.estandarteDe(e.id)?.name ?? '',
        puesto: suyo?.role ?? '',
        presentacion: suyo?.publicPersona ?? '',
      };
    }),
  );
  const conNotas = (5 + carasDeLaColumna) % 2 === 1;
  const caras = 5 + carasDeLaColumna + (conNotas ? 1 : 0);
  const notas = conNotas
    ? `

      <div class="pagina"></div>
      <h2>Notas</h2>
      <p style="font-size:11pt; color:#7c7159;">Para lo que no quepa en el cuaderno.</p>
      <table>
        <tbody>
${Array.from({ length: 22 }, () => '          <tr style="height:10mm;"><td></td></tr>').join('\n')}
        </tbody>
      </table>`
    : '';

  const dosieres = gente
    .map((persona, indice) => {
      const personaje = plot.characters.find((c) => c.participanteId === persona.id);
      const disfraz = vista.disfrazDe(persona.id);
      const elDisfraz = vista.sabor?.elDisfraz[persona.id] ?? '';
      const estandarte = vista.estandarteDe(persona.id);
      const esKancho = persona.id === kanchoId;

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
       *
       * LAS DOS CAJAS SE VEN IGUAL desde la silla de al lado: la misma caja, la
       * misma etiqueta, la misma letra. La del kanchō iba en bermellón, con el
       * borde triple y «Cobras de Akechi» a 14 puntos, y al abrir los sobres a la
       * vez se veía de un vistazo quién tenía la página roja.
       */
      const cuaderno = `<div class="caja junto">
        <span class="etiqueta">Esto solo lo lees tú</span>
        <p style="margin:0 0 2.5mm;"><strong>Tu cuaderno de la noche.</strong>
          <span style="font-size:10.5pt; color:#7c7159;">Nadie te lo va a pedir ni lo va a leer. Apunta
          en cuanto se cierre la hora: lo que no se escribe se discute a gritos al amanecer y no se
          recuerda.</span>
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
      </div>`;
      /*
       * «DE QUIÉN SOSPECHAS» YA NO VA AQUÍ, y era un delator que crecía con la
       * mesa: una fila por cada otra persona, solo en el cuaderno. Con siete a la
       * mesa esta cara se desbordaba en los inocentes y no en el kanchō, y su
       * sobre pasaba a ser el más fino. Ahora es una columna de «Quiénes cruzan»,
       * que es la misma hoja para todos.
       */

      const conocimiento = (personaje?.knowledge ?? [])
        .map((k) => `        <li>${esc(k)}</li>`)
        .join('\n');

      // Todo el mundo, también quien lee: la misma tabla en todos los dosieres, y la misma altura.
      const columna = vista.escoltas
        .map((otro) => {
          const suyo = plot.characters.find((c) => c.participanteId === otro.id);
          const suBandera = vista.estandarteDe(otro.id);
          return `        <tr>
          <td style="width:46mm;"><strong>${esc(suyo?.characterName ?? otro.name)}</strong><br /><span style="font-size:10pt; color:#7c7159;">${esc(otro.name)}</span>${
            suBandera ? `<br /><span style="font-size:10pt;">${esc(suBandera.name)}</span>` : ''
          }</td>
          <td>${esc(suyo?.role ?? '')}<br /><span style="font-size:10.5pt;">${esc(suyo?.publicPersona ?? '')}</span></td>
          <td style="width:44mm;"></td>
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

      <div class="pagina"></div>
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

      <div class="caja junto">
        <span class="etiqueta">Cómo se reconoce un paso</span>
        <p style="margin:0;">
          Vas <strong>andando</strong> hasta la habitación, lees en voz baja la palabra escrita en
          el cartel de la puerta y la dices —o la tecleas—. Solo entonces te dan el hito de ese
          paso a esa hora. Si te equivocas de palabra no pierdes la hora: vuelve a mirar.
        </p>
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
        /*
         * Sin «cómo se vendió»: es de quien dirige (lo lleva la hoja de la senda
         * verdadera) y era el texto más largo del dosier, justo en la única cara
         * que solo tiene el kanchō. Lo que le hace falta para jugar es por qué lo
         * hace, dónde esperan y qué puede hacer.
         */
        esKancho
          ? `<div class="caja junto">
        <span class="etiqueta">Esto solo lo lees tú</span>
        <p style="margin:0;"><strong>Cobras de Akechi.</strong> No quieres que el señor llegue a Shirako, y esta noche eso significa dejar que amanezca.</p>
        <p style="margin:2.5mm 0 0;">${esc(plot.solution?.motive ?? '')}</p>
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
      <h2>Quiénes cruzan</h2>
      <p style="font-size:11pt; color:#7c7159;">
        Lo que sabe de cada cual toda la columna. Es la misma hoja en todos los dosieres: tú también
        sales. La última columna es tuya: apunta de quién sospechas, y por qué.
      </p>
      <table>
        <thead>
          <tr>
            <th style="width:46mm;">Quién</th>
            <th>Lo que sabe todo el mundo</th>
            <th style="width:44mm;">Sospecho porque…</th>
          </tr>
        </thead>
        <tbody>
${columna}
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
      </div>${notas}
    </section>`;
    })
    .join('\n\n');

  const contenido = `    <div class="aviso no-imprimir">
      Esta primera hoja es para quien reparte · No entra en ningún sobre
    </div>

    <div class="caja caja--anil junto no-imprimir">
      <span class="etiqueta">Cómo se reparte</span>
      <ol style="margin:0;">
        <li>Cada dosier ocupa <strong>${caras / 2} hojas por las dos caras</strong> —${caras} páginas—.
          Imprime a doble cara y separa de ${caras / 2} en ${caras / 2} hojas.</li>
        <li>Son las mismas páginas <strong>en todos los dosieres, sin excepción</strong>. Si
          cuentas uno con más que los demás, algo se ha desbordado al imprimir: no lo repartas así,
          porque la hoja que sobra de uno cae en el sobre del siguiente y porque el sobre más gordo
          se ve.</li>
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
  tituloDeUno: (game, plot, participanteId) =>
    `${plot.title} — Dosier de ${entidadesDe(game, 'escoltas').find((s) => s.id === participanteId)?.name ?? ''}`,
  deUno: (game, plot, participanteId, opciones) =>
    dosierEscolta(game, plot, { ...opciones, soloPara: participanteId }),
});
