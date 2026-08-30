/**
 * La guía de la noche: el papel que quien dirige lleva encima de las doce a las cuatro.
 *
 * ═══ QUÉ ES, Y POR QUÉ REPITE COSAS QUE YA ESTÁN EN OTRAS HOJAS ═══
 *
 * Es el único documento del paquete que se maneja SIN PARAR: se abre al montar
 * la mesa, se pasa de página al abrir cada franja y sigue abierto cuando se da
 * el parte del amanecer. Por eso lleva dentro la tarifa entera —que también
 * está en la tabla del retraso— y las reglas —que también están en el dosier de
 * cada cual—. No es duplicar por descuido: a las dos de la mañana, con ocho
 * personas de pie hablando a la vez, quien dirige no se pone a buscar en qué
 * hoja estaba aquello. Si algo hay que decir en voz alta, tiene que estar AQUÍ.
 *
 * El criterio para escribirla es que sirva para conducir la velada ENTERA sin
 * abrir la app: la app arbitra sola, pero quien dirige tiene que saber qué
 * anunciar, qué cuesta cada cosa y cómo se cierra.
 *
 * ═══ POR QUÉ ES EL ÚNICO DE LOS NUEVE QUE RECIBE LA `VistaGm` ═══
 *
 * Porque es el único que cambia según quién dirija, y la diferencia no es de
 * matiz. Dirigiendo a la manera normal, quien lleva la noche conoce el cuadro y
 * esta hoja se lo dice franja a franja: es lo que le deja resolver una discusión
 * sin levantarse. Dirigiendo A CIEGAS, quien lleva la noche JUEGA COMO UNO MÁS y
 * no puede conocerlo — así que la hoja tiene que poder leerse de cabo a rabo sin
 * que se le escape nada, y el cuadro se queda en manos de quien preparó el
 * material.
 *
 * Las dos preguntas se leen por separado a propósito: `vista.modo` decide qué
 * lista de preparación se imprime y `vista.revelaSolucion` decide si se puede
 * nombrar el convoy de cada franja. Hoy la respuesta es la misma, pero son dos
 * preguntas distintas y juntarlas en un solo `if` es cómo se filtra una solución
 * el día que dejen de coincidir.
 *
 * ═══ LO QUE NO LLEVA NUNCA, NI DIRIGIENDO CON EL CUADRO DELANTE ═══
 *
 * El texto de los telegramas. Va en «El cuadro verdadero», que es de quien
 * prepara y se guarda. Los telegramas determinan un solo cuadro: quien los lee
 * tiene la respuesta aunque no venga enumerada, y esta hoja se queda abierta
 * sobre la mesa mientras se sirve algo de beber.
 */
import { esc } from '../../html';
import { envolverEstraza, portadaEstraza, sinTrama, ORNAMENTO } from './comun';
import { vistaDelNudo } from './datos';
import { manifiestoDe } from '../../../../../shared/juegos';
import {
  CONFORMIDADES_DE_OFICIO,
  MANA_DE_OFICIO,
  OFICIOS,
  OFICIO_DE_PERSONA,
} from '../../../../../shared/juegos/nudo-tipos';
import type { VistaGm } from '../../contexto';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../../shared/types';

export function guiaDeLaNoche(
  game: GameSession,
  plot: Plot,
  vista: VistaGm,
  opciones: DocumentRenderOptions,
): string {
  const datos = vistaDelNudo(game, plot);
  if (!datos.hay || !datos.trama) return sinTrama('Guía de la noche', opciones);

  const revela = vista.revelaSolucion;
  const manifiesto = manifiestoDe(game.settings?.juego);
  const pasos =
    (vista.modo === 'blind'
      ? manifiesto.preparacion?.aCiegas
      : manifiesto.preparacion?.anfitrion) ?? [];
  const reglas = manifiesto.reglas ?? [];

  const total = datos.franjas.length;
  const tarifa = datos.tarifa;
  const primera = datos.franjas[0]?.hora ?? '';
  const ultima = datos.franjas[total - 1]?.hora ?? '';

  // ---- Los pasos de preparación, tal como los declara el manifiesto ----
  const preparativos = pasos.map((paso) => `        <li>${esc(paso)}</li>`).join('\n');

  // ---- Las reglas, para leerlas de corrido ----
  const listaDeReglas = reglas
    .map((r) => `      <li><strong>${esc(r.titulo)}</strong>${esc(r.texto)}</li>`)
    .join('\n');

  /*
   * ---- Las franjas, una a una ----
   *
   * EL PARTE SE IMPRIME LITERAL Y EN TINTA DE COPIA. Es lo único de esta hoja
   * que se lee palabra por palabra en voz alta, así que se distingue de lo que
   * es instrucción para quien dirige: si se leyeran las dos cosas con la misma
   * tipografía, a la tercera franja alguien acabaría leyendo «recuerda el
   * retraso» delante de la mesa.
   */
  const franjas = datos.franjas
    .map(
      (f) => `    <div class="caja junto">
      <span class="etiqueta">Franja ${f.numero} de ${total} · las ${esc(f.hora)}</span>
      <p style="margin:0 0 6px; font-size:10.5pt;">Parte de novedades. Léelo tal cual y no añadas nada:</p>
      <p class="copia" style="margin:0;">${esc(f.parte)}</p>
${
  revela
    ? `      <div class="caja caja--roja" style="margin:10px 0 0;">
        <span class="etiqueta">Solo para ti · el enclavamiento no acepta ningún otro</span>
        <p style="margin:0; font-size:14pt;"><strong>${esc(f.convoyNombre)}</strong></p>
      </div>`
    : `      <p style="margin:8px 0 0; font-size:10.5pt; color:#7b6644;">
        No sabes cuál toca, y no hace falta: la app da paso o lo niega ella sola.
      </p>`
}
    </div>`,
    )
    .join('\n');

  // ---- Las cuatro mañas, sin decir quién tiene cada una ----
  const manas = OFICIOS.map(
    (oficio) => `        <tr>
          <td style="width:36mm;"><strong>${esc(OFICIO_DE_PERSONA[oficio])}</strong></td>
          <td style="width:34mm;">${esc(MANA_DE_OFICIO[oficio].nombre)}</td>
          <td style="font-size:10.5pt;">${esc(MANA_DE_OFICIO[oficio].texto)}</td>
        </tr>`,
  ).join('\n');

  const guion = (plot.gmScript ?? []).map((paso) => `        <li>${esc(paso)}</li>`).join('\n');

  const contenido = `${portadaEstraza(
    revela ? 'Para quien dirige' : 'Para quien dirige · a ciegas',
    'Guía de la noche',
    plot.tagline,
    `${total} franjas · ${datos.ferroviarios.length} de turno · ${datos.puestos.length} puestos`,
  )}

    <h2>La noche de una ojeada</h2>
    <table>
      <tbody>
        <tr>
          <th style="width:44mm;">Cuándo</th>
          <td>Madrugada del 14 de enero de 1927. ${total} franjas, de las ${esc(primera)} a las ${esc(ultima)}.</td>
        </tr>
        <tr>
          <th>Quiénes</th>
          <td>${datos.ferroviarios.length} personas de turno, repartidas por ${datos.puestos.length} puestos. Cada puesto es una habitación de verdad y hay que ir hasta allí.</td>
        </tr>
        <tr>
          <th>Qué hay que sacar</th>
          <td>${datos.convoyes.length} convoyes: uno por franja, sin repetir y en un orden que solo sale juntando las tiras del telégrafo.</td>
        </tr>
        <tr>
          <th>El Correo</th>
          <td><strong>${esc(datos.correo?.nombre ?? 'sin marcar')}</strong>${
            datos.correo?.carga ? `, con ${esc(datos.correo.carga)}` : ''
          }. Es público desde el minuto uno: dilo tú antes de que nadie pregunte.</td>
        </tr>
        <tr>
          <th>Tope de retraso</th>
          <td><strong>${datos.retrasoMaximo} minutos</strong>. Pasado él, el puerto se cierra con la nieve y la noche está perdida.</td>
        </tr>
        <tr>
          <th>Se gana si</th>
          <td>El Correo cruza <em>y</em> el retraso final no pasa del tope. Se gana en grupo o no se gana: aquí nadie compite con nadie.</td>
        </tr>
        <tr>
          <th>Tú, esta noche</th>
          <td>${
            revela
              ? 'Diriges con el cuadro verdadero delante. Esta hoja lo lleva dentro, franja a franja: no la dejes sobre la mesa cuando te levantes.'
              : 'Diriges a ciegas y juegas como uno más. Esta hoja NO lleva el cuadro, así que puedes leerla entera sin estropearte la noche. Lo guarda quien preparó el material.'
          }</td>
        </tr>
      </tbody>
    </table>

    <h2>Antes de que llegue nadie</h2>
    <div class="caja junto">
      <ol style="margin:0;">
${preparativos || '        <li>Este juego no trae lista de preparación. Imprime el paquete y sigue el índice.</li>'}
      </ol>
    </div>

    <h2>Las reglas, para leerlas en voz alta</h2>
    <p style="font-size:10.5pt; color:#7b6644;">
      De corrido y una sola vez, con todo el mundo sentado y el móvil ya en la mano. Son las mismas
      que cada cual lleva en su dosier: no hace falta que se las aprendan, hace falta que las hayan
      oído. Las tres que se vuelven a preguntar siempre son la del enclavamiento, la de las
      conformidades y la del margen.
    </p>
    <ol class="reglas">
${listaDeReglas}
    </ol>

${ORNAMENTO}

    <div class="pagina"></div>
    <h2>Cómo se abre y se cierra una franja</h2>
    <div class="caja junto">
      <ol style="margin:0;">
        <li><strong>Abre la franja</strong> desde tu panel y di el número y la hora en voz alta:
          «Franja tres, la una y veinte». Que se oiga que la noche avanza.</li>
        <li><strong>Lee el parte de novedades</strong> de esa franja, tal cual está escrito abajo.</li>
        <li><strong>Canta la cuenta:</strong> cuántas conformidades hay en la estación y cuántos
          minutos de retraso lleváis. Dilo aunque no te lo pregunten; es lo que hace que la mesa
          decida en vez de probar.</li>
        <li><strong>Que se muevan.</strong> Ocupar un puesto se hace ANDANDO hasta la habitación y
          tocándolo en la app. Quienes coinciden en un puesto ven el mismo instrumento y pueden
          resolverlo entre ellos: eso está bien y es más rápido.</li>
        <li><strong>Deja que discutan el cuadro.</strong> Tu trabajo aquí es que cada cual lea SU
          tira en voz alta, no proponer tú nada. Si alguien se calla, pregúntale qué pone la suya.</li>
        <li><strong>La orden.</strong> Cuando la mesa lo tenga, alguien cursa la orden desde la app.
          Lee su anuncio en voz alta (más abajo está qué decir en cada caso).</li>
        <li><strong>Cierra la franja</strong> cuando haya salido el convoy que tocaba, o cuando veas
          que no va a salir. Cerrar sin sacar a nadie cuesta ${tarifa.franjaPerdida} minutos y
          <strong>el cuadro se corre entero</strong>: no se pierde ningún convoy, se pierde tiempo.</li>
      </ol>
    </div>

    <h2>Las ${total} franjas de esta noche</h2>
    ${
      revela
        ? `<div class="caja caja--roja junto">
      <span class="etiqueta">Antes de pasar de aquí</span>
      <p style="margin:0;">
        Las cajas rojas de abajo llevan <strong>el cuadro verdadero</strong>, franja a franja. No las
        leas en voz alta, no las enseñes y no dejes esta hoja abierta por esta página. Sirven para
        una cosa: resolver en el acto una discusión sobre si la app se ha equivocado. No se ha
        equivocado.
      </p>
    </div>`
        : `<div class="caja junto">
      <span class="etiqueta">Diriges a ciegas</span>
      <p style="margin:0;">
        Aquí no viene qué convoy toca en cada franja, porque tú tampoco lo sabes. No importa para
        conducir la noche: <strong>la app arbitra las órdenes sola</strong> y te dice si dio paso o
        no. Si algo se discute de verdad, quien preparó el material tiene el cuadro verdadero y es
        la única persona que puede mirarlo.
      </p>
    </div>`
    }

${franjas}

    <div class="pagina"></div>
    <h2>Cómo se arbitra una orden</h2>
    <p style="font-size:10.5pt; color:#7b6644;">
      No la arbitras tú: la app compara con el cuadro y contesta. Lo tuyo es <strong>anunciarlo</strong>,
      que es la mitad de la tensión de la noche. Estas son las cuatro cosas que pueden pasar.
    </p>
    <table>
      <thead>
        <tr><th style="width:46mm;">Lo que contesta la app</th><th>Qué anuncias tú</th></tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Da paso</strong></td>
          <td>«Vía libre. Sale de Valdehierro.» Di el nombre del convoy, tacha uno mentalmente y
            sigue. No digas cuántos quedan por acertar: eso lo lleva la mesa en su cuadrícula.</td>
        </tr>
        <tr>
          <td><strong>No da paso</strong></td>
          <td>«El enclavamiento no da paso. Ese no es el que toca.» Y
            <strong>${tarifa.ordenRechazada} minuto más de retraso</strong>, dicho en voz alta.
            <strong>Nunca digas cuál era el bueno</strong>, ni si estaban cerca, ni con la cara.</td>
        </tr>
        <tr>
          <td><strong>Sin conformidades</strong></td>
          <td>La app no deja cursar nada. «La estación no tiene conformidad: hay que resolver el
            instrumento de algún puesto.» Es un empujón a moverse, no un castigo.</td>
        </tr>
        <tr>
          <td><strong>Ese convoy ya cruzó</strong></td>
          <td>La app lo rechaza y no cuesta nada. Que miren el cuadro y vuelvan a intentarlo.</td>
        </tr>
      </tbody>
    </table>

    <h2>Las mañas, y qué haces cuando alguien la gasta</h2>
    <p style="font-size:10.5pt; color:#7b6644;">
      Una por persona y <strong>una vez en toda la noche</strong>. La app la aplica sola; lo tuyo es
      exigir que se diga en voz alta y ANTES de la acción que la aprovecha. Una maña callada no
      sirve de nada, y esa regla la haces cumplir tú.
    </p>
    <table>
      <thead>
        <tr><th>Oficio</th><th>La maña</th><th>Qué hace</th></tr>
      </thead>
      <tbody>
${manas}
      </tbody>
    </table>

    <h2>La contabilidad de la noche</h2>
    <table>
      <thead>
        <tr><th style="width:62mm;">Concepto</th><th style="width:30mm;">Cuánto</th><th>Cuándo y de quién</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>Orden que el enclavamiento rechaza</td>
          <td><strong>+${tarifa.ordenRechazada}</strong> de retraso</td>
          <td>En el acto. Es de la estación y se ve subir.</td>
        </tr>
        <tr>
          <td>Franja que se cierra sin sacar a nadie</td>
          <td><strong>+${tarifa.franjaPerdida}</strong> de retraso</td>
          <td>Se cobra al amanecer: mientras la noche dura, todavía se puede compensar.</td>
        </tr>
        <tr>
          <td>Convoy que se queda en la vía</td>
          <td><strong>+${tarifa.convoyVarado}</strong> por convoy</td>
          <td>Al amanecer, y es lo que más cuesta. Avísalo en la última franja.</td>
        </tr>
        <tr>
          <td>Abrir una franja</td>
          <td><strong>+${CONFORMIDADES_DE_OFICIO}</strong> conformidad</td>
          <td>La regala la estación. <strong>No caduca</strong>: se acumulan de una franja a otra.</td>
        </tr>
        <tr>
          <td>Primer instrumento resuelto en un puesto</td>
          <td><strong>+1</strong> conformidad</td>
          <td>Una por puesto y por franja, la gane quien la gane. Por eso conviene repartirse.</td>
        </tr>
        <tr>
          <td>Cursar una orden</td>
          <td><strong>−1</strong> conformidad</td>
          <td>Se gasta igual si la rechazan. Probar a lo loco cuesta tiempo Y trabajo.</td>
        </tr>
        <tr>
          <td>Resolver un instrumento</td>
          <td><strong>+${tarifa.margenPorInstrumento}</strong> de margen, <strong>+${
            tarifa.margenPorInstrumento + tarifa.margenExtra
          }</strong> si es el de tu oficio</td>
          <td>Personal, de quien lo resuelve. Fallarlo no cuesta nada: que lo intenten.</td>
        </tr>
        <tr>
          <td>Preguntar al archivo</td>
          <td><strong>−${tarifa.consulta}</strong> de margen</td>
          <td>Se pregunta por un convoy y una franja, y contesta sí o no. Un «no» es una casilla que
            se puede tachar con certeza.</td>
        </tr>
        <tr>
          <td>Recuperar tiempo</td>
          <td><strong>−${tarifa.recuperar}</strong> de margen</td>
          <td>Quita ${tarifa.recupera} minuto de retraso de la estación. Sale caro a propósito.</td>
        </tr>
        <tr>
          <td><strong>Tope de esta partida</strong></td>
          <td><strong>${datos.retrasoMaximo}</strong> minutos</td>
          <td>Sale de cuánta gente hay de turno. Cántalo cuando lleguéis a la mitad.</td>
        </tr>
      </tbody>
    </table>

    <div class="pagina"></div>
    <h2>Si jugáis sin móviles</h2>
    <div class="caja caja--violeta junto">
      <span class="etiqueta">Dicho sin disimular</span>
      <p style="margin:0 0 8px;">
        Sin app <strong>se pierden los cuatro instrumentos</strong>. Son minijuegos de pantalla —la
        maniobra de vagones, el Morse, las palancas y el reparto de bultos— y no tienen versión de
        papel honesta. La noche se juega igual: el cuadro, las órdenes y el retraso son de mesa. Pero
        dos cosas cambian, y conviene decirlas antes de empezar y no a mitad.
      </p>
      <ol style="margin:0;">
        <li><strong>Las conformidades se dan, no se ganan.</strong> Una por franja, al abrirla, y
          ninguna más. Como no hay instrumentos que resolver, no hay forma de ganar la segunda: la
          mesa tiene un tiro por franja y hay que acertarlo hablando.</li>
        <li><strong>Arbitras tú las órdenes</strong>, con la hoja del cuadro verdadero en la mano.
          Alguien dice qué convoy saca; miras la franja que toca; das paso o no. Apunta el retraso a
          lápiz en la tabla de la noche.</li>
        <li><strong>El margen se queda fuera.</strong> Si no se resuelven instrumentos, nadie gana
          margen, así que ni se consulta el archivo ni se recuperan minutos. Baja el tope de retraso
          a la mitad o dad por bueno que la noche es más corta: con un tiro por franja, ${total}
          franjas dan justo para ${total} aciertos.</li>
      </ol>
      <p style="margin:8px 0 0;">
        Y si además diriges a ciegas, esto no se puede hacer: alguien tiene que tener el cuadro
        delante para dar paso. Que arbitre quien preparó el material.
      </p>
    </div>

    <h2>El parte del amanecer</h2>
    <div class="caja junto">
      <ol style="margin:0;">
        <li><strong>Cierra la última franja</strong> —o cierra antes, si la noche se alarga y ya está
          decidida—.</li>
        <li><strong>Abre el cuadro final.</strong> Cada cual entrega SU cuadro de marchas desde la
          app: los ${total} convoyes en las ${total} franjas, de memoria y en silencio. Eso es cosa
          de cada uno y no del turno: se puede sacar la noche y entregar un cuadro con dos franjas
          cambiadas.</li>
        <li><strong>Da el parte del amanecer</strong> desde tu panel y léelo tal cual sale. Se
          escribe una sola vez y ya no cambia, así que dalo cuando de verdad se acabó.</li>
        <li>${
          revela
            ? 'Y entonces lee el cuadro verdadero en voz alta, franja por franja, mirándoles a la cara. Es el mejor momento de la noche.'
            : 'Y entonces llama a quien preparó el material: sale con el cuadro verdadero y lo lee en voz alta, franja por franja. Tú te sientas, que esta noche también jugabas.'
        }</li>
      </ol>
    </div>

    <div class="caja caja--roja junto">
      <span class="etiqueta">Las tres formas de terminar</span>
      <p style="margin:0 0 8px;">
        El retraso final es el que lleváis <em>más</em> ${tarifa.franjaPerdida} por cada franja que se
        cerró en vacío <em>más</em> ${tarifa.convoyVarado} por cada convoy que se quedó en la vía.
        Con ese número en la mano:
      </p>
      <ol style="margin:0;">
        <li><strong>Gana el turno entero</strong> si el Correo cruzó y el retraso final no pasó de
          ${datos.retrasoMaximo}. Ganan todos, los ${datos.ferroviarios.length}, sin excepción.</li>
        <li><strong>Se pierde la noche</strong> si el Correo se quedó en la estación, salgan los que
          salgan de los demás. El suero no llegó al valle y no hay más que hablar.</li>
        <li><strong>Se pierde la noche</strong> si el retraso final pasó del tope: el puerto se cerró
          con la nieve. Llegó, y llegó tarde.</li>
      </ol>
      <p style="margin:8px 0 0;">
        No suavices el parte cuando se pierde y no lo alargues. Se lee, se deja un silencio y se
        abre el cuadro verdadero: la mesa quiere saber por dónde iba.
      </p>
    </div>

${
  guion
    ? `    <h2>Tu guion, si lo quieres</h2>
    <div class="caja junto">
      <ol style="margin:0;">
${guion}
      </ol>
    </div>`
    : ''
}

    <h2>Lo que no puedes hacer</h2>
    <div class="caja caja--roja junto">
      <ul style="margin:0;">
        <li>No digas nunca qué convoy tocaba, ni cuando la orden se rechaza ni cuando alguien lo
          pregunta «solo para saberlo».</li>
        <li>No propongas tú el cuadro. Aunque lo veas clarísimo y aunque estén atascados: pregunta
          quién no ha leído su tira todavía.</li>
        <li>No dejes que se decida por votación a gritos. Que cada cual lea su papel primero.</li>
        <li>No dejes esta hoja sobre la mesa cuando te levantes${
          revela ? ': lleva el cuadro dentro' : ''
        }.</li>
      </ul>
    </div>`;

  return envolverEstraza(`${plot.title} — Guía de la noche`, contenido, opciones);
}
