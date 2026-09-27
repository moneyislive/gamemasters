/**
 * Los dosieres de la expedición: uno por persona, para meter en un sobre.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SEIS PÁGINAS POR PERSONA, LAS MISMAS PARA TODOS. POR QUÉ IMPORTA TANTO
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * El catálogo declara este documento a doble cara, así que cada hoja lleva dos
 * páginas. Un dosier tiene que ocupar un número PAR de caras: si ocupase tres,
 * la cuarta sería la primera página del dosier SIGUIENTE, y al repartir los
 * sobres alguien se llevaría media ficha de otra persona pegada a la suya. Con
 * secretos dentro.
 *
 * DECÍA «DOS PÁGINAS, NI UNA MÁS», Y NO ERA VERDAD. Medido el 25-sep-2026 con
 * Edge imprimiendo a PDF (`scripts/medir-paginas.ts`) sobre el maestro de oro:
 * los inocentes salían a TRES caras —la segunda, con «quiénes van» y las doce
 * reglas, medía 1492 px de los 1009 de un A4— y el saqueador a CUATRO, porque su
 * recuadro, en bermellón, con borde triple y el relato entero de cómo lo hizo,
 * solo existía en su dosier y le añadía 550 px a la primera cara. El sobre más
 * gordo de la mesa era el suyo, en todas las partidas. Es exactamente lo que
 * delató al culpable en la casa Sabrón.
 *
 * Así que son seis, y cada cosa que cambia de una persona a otra va en su cara:
 *
 *   1. Quién eres, tu don y los cinco ritos.
 *   2. Tu secreto, lo que ganarías y lo que declaraste.
 *   3. La cara privada: el cuaderno de la vigilia, o lo del saqueador. LAS DOS
 *      CON EL MISMO ASPECTO desde la silla de al lado.
 *   4. Lo que sabes de los demás.
 *   5. Quiénes van: LA MISMA TABLA EN TODOS LOS DOSIERES, con todo el mundo
 *      dentro. Antes cada dosier la imprimía sin su dueño, y su altura cambiaba
 *      con la presentación que faltaba.
 *   6. Cómo se juega, que no cambia de nadie a nadie.
 *
 * Lo que varía tiene presupuesto: la auditoría de la revisión
 * (`momia-auditoria.ts`) avisa si un texto pasa del que cabe, y el revisor lo
 * acorta. Si se añade contenido aquí, se vuelve a medir.
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
import { repartirEnCaras, type MedidasDeLaTabla } from '../caras';

/**
 * Las medidas de «Quiénes van» con la hoja de papiro (ver `../caras.ts`).
 *
 * Calibradas el 25-sep-2026 con Edge sobre partidas de ocho personas: una
 * presentación de 298 caracteres da una fila de 180 px (6 líneas), una de 434,
 * 249 (9) y una de 569, 295 (11); la cabecera mide 57. En esta hoja la línea de
 * la presentación mide 23 px y lleva unos 52 caracteres: no son las medidas de
 * las Sombras, y con las suyas el total salía impar.
 */
export const MEDIDAS_DE_LA_EXPEDICION: MedidasDeLaTabla = {
  arriba: 58 + 61 + 57,
  cabecera: 57,
  aire: 20,
  nombre: { linea: 24, porLinea: 22 },
  debajo: { linea: 20, porLinea: 26 },
  puesto: { linea: 22, porLinea: 40 },
  presentacion: { linea: 23, porLinea: 52 },
};

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

  /*
   * «Quiénes van»: todo el mundo, también quien lee. La misma tabla en todos los
   * dosieres, partida en caras AQUÍ (`repartirEnCaras`) y no por el navegador:
   * así el dosier sabe cuántas caras ocupa, y todos llevan las mismas.
   */
  const filas = vista.expedicionarios.map((e) => {
    const suyo = plot.characters.find((c) => c.participanteId === e.id);
    return {
      nombre: suyo?.characterName ?? e.name,
      debajo: [e.name],
      puesto: suyo?.role ?? '',
      presentacion: suyo?.publicPersona ?? '',
      html: `        <tr>
          <td style="width:44mm;"><strong>${esc(suyo?.characterName ?? e.name)}</strong><br /><span style="font-size:10pt; color:#7a5c34;">${esc(e.name)}</span></td>
          <td>${esc(suyo?.role ?? '')}<br /><span style="font-size:10.5pt;">${esc(suyo?.publicPersona ?? '')}</span></td>
          <td style="width:44mm;"></td>
        </tr>`,
    };
  });
  const trozos = repartirEnCaras(filas, MEDIDAS_DE_LA_EXPEDICION);
  const expedicion = trozos
    .map(
      (indices, i) => `${i === 0 ? '' : '\n      <div class="pagina"></div>'}
      <table>
        <thead>
          <tr>
            <th style="width:44mm;">Quién</th>
            <th>Lo que sabe todo el mundo</th>
            <th style="width:44mm;">Sospecho porque…</th>
          </tr>
        </thead>
        <tbody>
${indices.map((j) => filas[j]!.html).join('\n')}
        </tbody>
      </table>`,
    )
    .join('');

  // Cinco caras fijas más las de la tabla, y una de notas si el total sale impar.
  const conNotas = (5 + trozos.length) % 2 === 1;
  const caras = 5 + trozos.length + (conNotas ? 1 : 0);
  const notas = conNotas
    ? `

      <div class="pagina"></div>
      <h2>Notas</h2>
      <p style="font-size:11pt; color:#7a5c34;">Para lo que no quepa en el cuaderno.</p>
      <table>
        <tbody>
${Array.from({ length: 22 }, () => '          <tr style="height:10mm;"><td></td></tr>').join('\n')}
        </tbody>
      </table>`
    : '';

  /*
   * LA CARA PRIVADA, Y POR QUÉ LA TIENE TAMBIÉN QUIEN NO ES EL SAQUEADOR.
   *
   * Si solo la tuviera él, su dosier tendría una cara más y el sobre más gordo
   * de la mesa sería el suyo. Así que la cara existe en TODOS los dosieres, con
   * la misma caja y la misma etiqueta, y cambia de contenido, no de aspecto. Y el
   * cuaderno no es relleno: la Momia se gana atando qué fragmento salió de qué
   * cámara en qué vigilia, que es lo que la mesa no puede sostener de memoria.
   */
  const cuaderno = `<div class="caja junto">
        <span class="etiqueta">Esto solo lo lees tú</span>
        <p style="margin:0 0 2.5mm;"><strong>Tu cuaderno de la vigilia.</strong>
          <span style="font-size:10.5pt; color:#7a5c34;">Nadie te lo va a pedir ni lo va a leer. Apunta
          en cuanto se cierre la vigilia: lo que no se escribe se discute a gritos al amanecer y no se
          recuerda.</span>
        </p>
        <table>
          <thead>
            <tr>
              <th style="width:22mm;">Vigilia</th>
              <th style="width:44mm;">Dónde entré</th>
              <th>Qué decía el fragmento</th>
              <th style="width:38mm;">Quién más estaba</th>
            </tr>
          </thead>
          <tbody>
${vista.profanadas
  .map(
    (_, i) => `            <tr style="height:21mm;">
              <td style="vertical-align:top;"><strong>${i + 1}.ª</strong></td>
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
   * Sin «cómo lo hizo»: es de quien dirige (lo lleva el papiro del sellado) y era
   * el texto más largo del dosier, justo en la única cara que solo tiene el
   * saqueador. Lo que le hace falta para jugar es por qué lo hizo y qué puede hacer.
   */
  const delSaqueador = `<div class="caja junto">
        <span class="etiqueta">Esto solo lo lees tú</span>
        <p style="margin:0;"><strong>Fuiste tú.</strong> Rompiste el sello a propósito, por encargo de un comprador, y no quieres que la tumba se vuelva a sellar.</p>
        <p style="margin:2.5mm 0 0;">${esc(plot.solution?.motive ?? '')}</p>
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
      </div>`;

  const dosieres = gente
    .map((persona, indice) => {
      const personaje = plot.characters.find((c) => c.participanteId === persona.id);
      const don = vista.donDe(persona.id);
      const elDon = vista.sabor?.elDon[persona.id] ?? '';
      const esSaqueador = persona.id === saqueadorId;

      const conocimiento = (personaje?.knowledge ?? [])
        .map((k) => `        <li>${esc(k)}</li>`)
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

      <div class="pagina"></div>
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

      <div class="pagina"></div>
      ${esSaqueador ? delSaqueador : cuaderno}

      <div class="pagina"></div>
      <h2>Lo que sabes de los demás</h2>
      ${conocimiento ? `<ul>\n${conocimiento}\n      </ul>` : '<p><em>Nada en concreto. Tendrás que preguntar.</em></p>'}

      <div class="pagina"></div>
      <h2>Quiénes van</h2>
      <p style="font-size:11pt; color:#7a5c34;">
        Lo que sabe de cada cual toda la expedición. Es la misma hoja en todos los dosieres: tú
        también sales. La última columna es tuya: apunta de quién sospechas, y por qué.
      </p>${expedicion}

      <div class="pagina"></div>
      <h2>Cómo se juega</h2>
${
  /*
   * A 11 puntos y no al tamaño del texto: las doce reglas medían 935 px en
   * pantalla y, impresas, se salían de la cara por una. Medido con Edge: sin la
   * última cabían. Así caben todas con aire, y la cara es la misma para todos.
   */
  reglas.map((r) => `      <p style="font-size:11pt; margin:0 0 2.2mm;"><strong>${esc(r.titulo)}.</strong> ${esc(r.texto)}</p>`).join('\n')
}${notas}
    </section>`;
    })
    .join('\n\n');

  const contenido = `    <div class="aviso no-imprimir">
      Esta primera hoja es para quien reparte · No entra en ningún sobre
    </div>

    <div class="caja caja--lapis junto no-imprimir">
      <span class="etiqueta">Cómo se reparte</span>
      <ol style="margin:0;">
        <li>Cada dosier ocupa <strong>${caras / 2} hojas por las dos caras</strong> —${caras} páginas—.
          Imprime a doble cara y separa de ${caras / 2} en ${caras / 2} hojas.</li>
        <li>Son las mismas páginas <strong>en todos los dosieres, sin excepción</strong>. Si
          cuentas uno con más que los demás, algo se ha desbordado al imprimir: no lo repartas así,
          porque la hoja que sobra de uno cae en el sobre del siguiente y porque el sobre más gordo
          se ve.</li>
        <li>Mete cada uno en un sobre con el nombre de su persona. <strong>Nadie abre el ajeno.</strong></li>
        <li>Todos son iguales por fuera <em>y pesan lo mismo</em>: la tercera página de uno dice
          cosas que los demás no dicen, pero ocupa lo mismo que la de ellos. No la comentes, no la
          mires dos veces y no dejes ese sobre el último.</li>
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
