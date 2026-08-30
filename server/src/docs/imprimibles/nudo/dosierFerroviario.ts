/**
 * El dosier de cada persona del turno: lo que va dentro de su sobre y nada más.
 *
 * Se reparte cerrado antes de empezar y se abre cuando quien dirige lo dice. A
 * partir de ahí no se cierra en toda la noche: es el papel que se tiene delante
 * mientras se discute, y por eso se compone para MIRARLO, no para leerlo de
 * corrido.
 *
 * ═══ POR QUÉ EL ORDEN ES ESTE Y NO EL DE UNA FICHA DE PERSONAJE ═══
 *
 * Lo primero es el OFICIO y la MAÑA, y lo segundo los TELEGRAMAS. No es el orden
 * natural de una ficha —ahí lo primero sería quién eres— y es el orden en que se
 * consulta esto de verdad: a las dos de la mañana nadie vuelve a su dosier a
 * releer su cara pública, vuelve a mirar qué hace su instrumento, si le queda la
 * maña y qué decía exactamente su tira. Eso va arriba y en cajas con borde de
 * color, que es lo que se encuentra pasando la hoja sin leerla.
 *
 * Lo demás —la noche, el turno, las reglas, la tarifa— es igual para todos y va
 * detrás, porque se lee una vez al principio y ya no se vuelve.
 *
 * ═══ LO QUE ESTE DOCUMENTO NO PUEDE LLEVAR NUNCA ═══
 *
 * El cuadro verdadero, los telegramas de otra persona y el secreto de otra
 * persona. Los tres se pueden leer de `vista` y ninguno se toca aquí:
 *
 *   · `vista.franjas[i].convoyNombre` es el cuadro resuelto. Este fichero no lo
 *     nombra ni una vez, y por eso las horas de la cuadrícula en blanco salen de
 *     `HORAS_DE_FRANJA` y no de `vista.franjas`: recorrer las franjas para sacar
 *     la hora deja el nombre del convoy a un punto de distancia, y ese es el
 *     descuido que reparte la partida resuelta.
 *   · Los telegramas se toman de `f.telegramas`, que ya viene repartido por
 *     persona en `datos.ts`. Nunca de `trama.telegramas`, que están todos.
 *   · De los demás se dice el nombre y el oficio, que es público —se ve entrar a
 *     la garita— y nada más.
 *
 * ═══ EL FILTRO POR PERSONA, QUE ES LA MITAD DEL FICHERO ═══
 *
 * Este documento lleva dentro el de toda la mesa: se imprime de una vez, se
 * separa y se mete en sobres. Pero el taller los sirve DE UNO EN UNO —abre el de
 * Marta, se lo manda por correo, lo descarga en PDF— y entonces tiene que llevar
 * solo el suyo. Sin el filtro de `opciones.soloPara`, mandarle a alguien «su»
 * dosier sería mandarle los quince telegramas de la noche, o sea el cuadro
 * entero: los telegramas determinan una sola solución, así que tenerlos todos es
 * tener la respuesta aunque no venga escrita.
 *
 * ═══ LAS HOJAS Y LOS SOBRES ═══
 *
 * Cada dosier empieza en página nueva, pero eso es una PÁGINA y no una HOJA. A
 * doble cara, un dosier que ocupe un número impar de caras deja su última cara
 * compartiendo hoja con la primera del siguiente, y ahí van telegramas ajenos.
 * No se puede arreglar desde aquí sin cuadrar a mano el alto de cada bloque, que
 * depende de cuántas tiras le hayan tocado a cada cual, y eso cambia en cada
 * partida. Así que se avisa en la hoja de reparto, que no se imprime.
 */
import { esc } from '../../html';
import { entidadesDe, manifiestoDe } from '../../../../../shared/juegos';
import { HORAS_DE_FRANJA } from '../../../../../shared/juegos/nudo-tipos';
import { envolverEstraza, portadaEstraza, sinTrama, ORNAMENTO } from './comun';
import { vistaDelNudo } from './datos';
import { registrarDosieres } from '../../dosieres';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../../shared/types';

/**
 * La primera letra en mayúscula, para el renglón de la portada.
 *
 * Los oficios se guardan en minúscula porque casi siempre van dentro de una
 * frase —«eres guardagujas»—, y en la portada abren renglón. No se toca el
 * resto: hay oficios de dos palabras y poner cada una en mayúscula sería
 * inventarse un título que no existe.
 */
function enMayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function dosierFerroviario(
  game: GameSession,
  plot: Plot,
  opciones: DocumentRenderOptions,
): string {
  const vista = vistaDelNudo(game, plot);
  if (!vista.hay || !vista.trama) return sinTrama('Dosieres del turno', opciones);

  const reglas = manifiestoDe(game.settings?.juego).reglas ?? [];
  const tarifa = vista.tarifa;

  /*
   * UNO SOLO CUANDO LO PIDE EL TALLER. Ver la cabecera: sin esta línea, el
   * botón de «mandarle su dosier» le manda a una persona los telegramas de toda
   * la mesa.
   */
  const gente = opciones.soloPara
    ? vista.ferroviarios.filter((f) => f.id === opciones.soloPara)
    : vista.ferroviarios;

  /*
   * LA CUADRÍCULA EN BLANCO, IDÉNTICA PARA TODO EL MUNDO. Los convoyes van en el
   * orden en que quien organiza los dio de alta —que no se parece al del cuadro—
   * y las columnas son las horas fijas de la noche. Aquí no hay ni un dato de la
   * solución: es papel pautado.
   */
  const cabecerasDeFranja = HORAS_DE_FRANJA.map(
    (hora) => `          <th>${esc(hora)}</th>`,
  ).join('\n');
  const filasDelCuadro = vista.convoyes
    .map(
      (convoy) => `          <tr>
            <th>${esc(convoy.nombre)}</th>
${HORAS_DE_FRANJA.map(() => '            <td></td>').join('\n')}
          </tr>`,
    )
    .join('\n');

  const cuadroEnBlanco = `    <h2>Tu cuadro de marchas</h2>
    <p style="font-size:11pt;">
      Una equis donde creas que va, una raya donde ya sepas que no va. Lo de la mesa se discute; esto
      es tuyo y es lo que vas a entregar al final, así que táchalo tú y no copies el de al lado.
    </p>
    <table class="cuadricula">
      <thead>
        <tr>
          <th>Convoy</th>
${cabecerasDeFranja}
        </tr>
      </thead>
      <tbody>
${filasDelCuadro}
      </tbody>
    </table>`;

  /* Los seis convoyes y su carga. Público desde el minuto uno: van en las hojas
     de porte encima de la mesa, y repetirlos aquí ahorra estirarse a por ellas. */
  const filasDeConvoyes = vista.convoyes
    .map(
      (convoy) => `        <tr>
          <td style="width:52mm;"><strong>${esc(convoy.nombre)}</strong>${
        /*
         * El rótulo NO repite el nombre del Correo. Puede llamarse «El Correo de
         * Medianoche» —es la primera sugerencia del manifiesto, así que se va a
         * llamar así muchas veces— y «El Correo de Medianoche · EL CORREO DE
         * MEDIANOCHE» no dice nada. Lo que hace falta saber de él es que no se
         * puede quedar, y eso vale con cualquier nombre.
         */
        convoy.esCorreo
          ? '<br /><span style="font-size:10pt; color:#9a2f22;">EL CORREO · NO PUEDE QUEDARSE</span>'
          : ''
      }</td>
          <td>${
            convoy.carga
              ? `Lleva <strong>${esc(convoy.carga)}</strong>.`
              : '<span style="font-size:10.5pt; color:#7b6644;">Sin carga anotada.</span>'
          }${convoy.descripcion ? ` ${esc(convoy.descripcion)}` : ''}</td>
        </tr>`,
    )
    .join('\n');

  const laTarifa = `    <table>
      <thead>
        <tr><th>Lo que pasa</th><th style="width:52mm;">Lo que cuesta</th></tr>
      </thead>
      <tbody>
        <tr><td>El enclavamiento rechaza una orden</td><td><strong>+${tarifa.ordenRechazada}</strong> de retraso</td></tr>
        <tr><td>Se cierra una franja sin sacar a nadie</td><td><strong>+${tarifa.franjaPerdida}</strong> de retraso, y el cuadro se corre</td></tr>
        <tr><td>Amanece con un convoy sin salir</td><td><strong>+${tarifa.convoyVarado}</strong> de retraso por cada uno</td></tr>
        <tr><td>Resuelves un instrumento</td><td><strong>+${tarifa.margenPorInstrumento}</strong> de margen, y <strong>+${tarifa.margenExtra}</strong> más si es el de tu oficio</td></tr>
        <tr><td>Le preguntas al archivo si un convoy cabe en una franja</td><td><strong>${tarifa.consulta}</strong> de margen · contesta sí o no</td></tr>
        <tr><td>Recuperas ${tarifa.recupera} minuto de retraso</td><td><strong>${tarifa.recuperar}</strong> de margen</td></tr>
        <tr><td><strong>El puerto se cierra al llegar a</strong></td><td><strong>${vista.retrasoMaximo}</strong> minutos de retraso</td></tr>
      </tbody>
    </table>`;

  const dosieres = gente
    .map((f) => {
      /* Dónde está su instrumento esta noche, y qué se hace en él. Sale de los
         puestos de la casa, así que dice el nombre de la habitación de verdad. */
      const susPuestos = vista.puestos.filter((p) => p.oficio === f.oficio);
      const queSeHace = susPuestos[0]?.queSeHace ?? '';
      const donde = susPuestos.map((p) => p.nombre);

      const susTiras = f.telegramas
        .map(
          (tira) => `      <div class="tira">
        <div class="cabecera"><span>TELEGRAMA</span><span>${esc(tira.id)}</span></div>
        <div class="texto">${esc(tira.texto)}</div>
      </div>`,
        )
        .join('\n');

      const elTurno = vista.ferroviarios
        .filter((otro) => otro.id !== f.id)
        .map(
          /*
           * EL NOMBRE DE VERDAD PRIMERO, y el del personaje debajo solo si no
           * son el mismo. A quien se va a buscar por el pasillo es a Luis, no a
           * Luis Aramburu, y cuando la trama no le ha puesto apellido los dos
           * renglones dirían lo mismo.
           */
          (otro) => `          <tr>
            <td style="width:52mm;"><strong>${esc(otro.nombre)}</strong>${
              otro.personaje && otro.personaje !== otro.nombre
                ? `<br /><span style="font-size:10pt; color:#7b6644;">${esc(otro.personaje)}</span>`
                : ''
            }</td>
            <td>${esc(otro.oficioNombre)}<br /><span style="font-size:10.5pt; color:#7b6644;">${esc(otro.instrumento)}</span></td>
          </tr>`,
        )
        .join('\n');

      return `    <div class="pagina">
${portadaEstraza(
  `Dosier de ${f.nombre}`,
  f.personaje,
  `${enMayuscula(f.oficioNombre)} del turno de noche · Valdehierro, 14 de enero de 1927`,
  'No lo abras hasta que te lo digan · Nadie abre el sobre ajeno',
)}

      <h2>Tu oficio</h2>
      <p>
        Eres <strong>${esc(f.oficioNombre)}</strong>. Tu instrumento es
        <strong>${esc(f.instrumento)}</strong>.${queSeHace ? ` ${esc(queSeHace)}` : ''}
      </p>
      ${
        donde.length > 0
          ? `<p>
        Esta noche está en: <strong>${donde.map((nombre) => esc(nombre)).join('</strong> · <strong>')}</strong>.
        Para manejarlo hay que ir hasta allí de verdad y ocupar el puesto desde la app. Puedes
        trabajar en cualquier puesto de la estación, pero en el tuyo rindes el doble:
        <strong>+${tarifa.margenPorInstrumento + tarifa.margenExtra} de margen</strong> en vez de
        +${tarifa.margenPorInstrumento}.
      </p>`
          : `<div class="caja caja--roja junto">
        <span class="etiqueta">Aviso</span>
        <p style="margin:0;">
          Esta noche no hay ningún puesto de la estación con tu instrumento. Puedes trabajar en
          cualquiera de los que haya, pero no vas a cobrar el margen extra de tu oficio en ninguno.
          Díselo a quien haya montado la partida antes de empezar.
        </p>
      </div>`
      }

      <div class="caja caja--roja junto">
        <span class="etiqueta">Tu maña · ${esc(f.mana.nombre)}</span>
        <p style="margin:0; font-size:13pt;">${esc(f.mana.texto)}</p>
        <p style="margin:7px 0 0; font-size:10.5pt; color:#7b6644;">
          <span class="casilla"></span> Táchala cuando la gastes. Es <strong>una sola vez en toda
          la noche</strong> y hay que decirla en voz alta: si la mesa no sabe que la has usado, no
          sirve para lo que sirve, que es sacar al turno de un apuro.
        </p>
      </div>

      <h2>Tus telegramas</h2>
      <p style="font-size:11pt;">
        Son las tiras que salvaste del fuego. Nadie te las puede quitar y nadie te obliga a leerlas,
        pero el cuadro no sale sin ellas: cada una es verdad, y juntas con las de los demás solo hay
        un orden que las cumpla todas. <strong>Léelas en voz alta y déjalas encima de la mesa</strong>
        —tal cual están escritas, sin resumir—, que resumir un telegrama es donde se pierde la noche.
      </p>
${
  susTiras ||
  `      <div class="caja caja--roja junto">
        <span class="etiqueta">No te ha tocado ninguna tira</span>
        <p style="margin:0;">
          Esto no debería pasar: en esta noche todo el mundo lleva papel. Avisa a quien haya
          preparado la partida antes de empezar, porque significa que el reparto salió mal y hay
          telegramas que no los tiene nadie.
        </p>
      </div>`
}

${ORNAMENTO}

      <h2>Quién eres</h2>
      <p>${esc(f.caraPublica)}</p>
      ${f.gancho ? `<p><em>${esc(f.gancho)}</em></p>` : ''}

      <div class="caja caja--violeta junto">
        <span class="etiqueta">Tu secreto — esto no lo lee nadie más</span>
        <p style="margin:0;">${esc(f.secreto)}</p>
        <p style="margin:7px 0 0; font-size:10.5pt; color:#7b6644;">
          No cambia ninguna regla y no hace falta contarlo. Está aquí para que sepas por qué tu
          personaje habla como habla a las tres de la mañana.
        </p>
      </div>

      <h2>La noche</h2>
      <p>${esc(plot.synopsis)}</p>
      ${
        vista.correo
          ? /*
             * EL NOMBRE SOLO, Y NO «EL CORREO ES X». Con el nombre que trae el
             * manifiesto de ejemplo, esa frase sale «El Correo de Medianoche es
             * El Correo de Medianoche». Puesto como un rótulo y su valor se lee
             * a la primera con cualquier nombre, que es lo que se pide a las dos
             * de la mañana.
             */
            `<div class="caja caja--roja junto">
        <span class="etiqueta">El Correo de Medianoche · esto lo sabe todo el mundo</span>
        <p style="margin:0; font-size:15pt;"><strong>${esc(vista.correo.nombre)}</strong></p>
        <p style="margin:5px 0 0;">
          Es el que lleva el suero para el valle. Si no cruza no hay nada más que hablar: la noche
          está perdida aunque salgan los otros cinco. No es un convoy más.
        </p>
      </div>`
          : ''
      }

      <h3>Los seis convoyes</h3>
      <p style="font-size:11pt;">
        Los seis cruzan esta noche, uno por franja y sin repetir. Cuál va en cada una es justo lo
        que no sabe nadie.
      </p>
      <table>
        <tbody>
${filasDeConvoyes}
        </tbody>
      </table>

      <h2>El turno de esta noche</h2>
      <p style="font-size:11pt;">
        Quién está de servicio y en qué oficio. Es público: se ve quién entra en cada puesto. Si te
        atascas con un instrumento que no es el tuyo, ve a buscar a quien lo lleva.
      </p>
      <table>
        <tbody>
${elTurno}
        </tbody>
      </table>

      <h2>Cómo se juega</h2>
      <div class="reglas">
${reglas.map((regla) => `        <p><strong>${esc(regla.titulo)}.</strong> ${esc(regla.texto)}</p>`).join('\n')}
      </div>

      <h3>La cuenta de la noche</h3>
${laTarifa}

${cuadroEnBlanco}

      <div class="caja junto">
        <span class="etiqueta">Antes de entregarlo</span>
        <p style="margin:0;">
          Al final de la noche cada cual entrega SU cuadro, de memoria y por separado: los seis
          convoyes en las seis franjas. Se puede sacar la noche adelante y entregar un cuadro con
          dos franjas cambiadas, así que ve tachando desde la primera tira que se lea.
        </p>
      </div>
    </div>`;
    })
    .join('\n\n');

  const reparto = opciones.soloPara
    ? ''
    : `    <div class="aviso no-imprimir">
      Esta primera hoja es para quien reparte · No entra en ningún sobre
    </div>

    <div class="caja caja--roja junto no-imprimir">
      <span class="etiqueta">Cómo se reparte</span>
      <ol style="margin:0;">
        <li>Cada dosier empieza en <strong>página nueva</strong> y lleva el nombre de su persona en
          la portada. Sepáralos por ahí.</li>
        <li>Página nueva no es hoja nueva. <strong>Si imprimes a doble cara, comprueba dónde acaba
          cada uno antes de separar</strong>: el que ocupe un número impar de caras deja la última
          compartiendo hoja con la primera del siguiente, y ahí van telegramas ajenos. Si no
          quieres contarlas, imprime este documento a una cara.</li>
        <li>Uno por sobre, cerrado y con el nombre fuera. <strong>Nadie abre el ajeno</strong>: lo
          que va dentro son las tiras que esa persona tiene que leer en voz alta, y leerlas de otro
          sobre es acabar la partida antes de empezarla.</li>
        <li>Todos pesan parecido y ninguno esconde nada raro: aquí no hay un papel que gane
          perdiendo. Si uno abulta más es que a esa persona le tocaron más tiras.</li>
      </ol>
    </div>

`;

  return envolverEstraza(
    `${plot.title} — Dosieres del turno`,
    `${reparto}${dosieres}`,
    opciones,
  );
}

/*
 * El alta para el taller, que reparte los dosieres de uno en uno.
 *
 * Es el MISMO documento compuesto solo con el bloque de esa persona, y va al
 * final de su propio fichero para que no se pueda mover el documento sin ver el
 * registro. El título lo dice este juego y no el núcleo: que los cuatro
 * coincidan hoy en «Dosier de Fulano» es una casualidad, no un contrato.
 */
registrarDosieres('nudo', {
  tituloDeUno: (game, plot, participanteId) =>
    `${plot.title} — Dosier de ${entidadesDe(game, 'ferroviarios').find((s) => s.id === participanteId)?.name ?? ''}`,
  deUno: (game, plot, participanteId, opciones) =>
    dosierFerroviario(game, plot, { ...opciones, soloPara: participanteId }),
});
