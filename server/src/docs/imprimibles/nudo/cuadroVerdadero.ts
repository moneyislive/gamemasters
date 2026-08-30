/**
 * EL CUADRO VERDADERO: en qué orden cruzan los seis. Para quien prepara, y no va a la mesa.
 *
 * Es la única hoja del paquete que dice el orden bueno. Se imprime, se dobla y
 * se guarda en un bolsillo. Con la app, la app arbitra sola y esta hoja solo
 * sale dos veces: cuando alguien discute una orden y al amanecer, para leer el
 * cuadro en voz alta. Sin la app —a mano, con el móvil apagado— es EL ÁRBITRO,
 * porque no hay ningún otro sitio donde esté el orden.
 *
 * Va marcada como `preparer` en los DOS modos, y eso no es una etiqueta suelta:
 * dirigiendo a ciegas, quien dirige no conoce la solución y aun así hay que
 * arbitrar. Quien monta los sobres se queda esta hoja y contesta desde donde
 * esté. Está escrito en `preparacion.aCiegas` del manifiesto y aquí se repite,
 * porque el que la lea puede no haber leído aquello.
 *
 * ═══ POR QUÉ VAN TAMBIÉN LOS TELEGRAMAS, Y ENTEROS ═══
 *
 * Podría llevar solo la tabla de seis filas y ocupar un tercio de la cara. Lleva
 * las tiras porque las discusiones de esta noche casi nunca son «¿sale este?»:
 * son «mi tira dice que el carbonero va antes que el mixto». Quien arbitra tiene
 * que poder leer la tira que se está citando SIN pedírsela a nadie —pedirla
 * delata quién la tiene, y eso es medio juego— y tiene que poder ver si se ha
 * leído al revés.
 *
 * Al lado de cada tira va quién la guarda, que sirve para lo contrario: saber a
 * quién le falta hablar cuando la mesa se atasca. Una tira puede salir en dos
 * manos; son copias de servicio y se dice expresamente, porque si no parece un
 * fallo del reparto y alguien va a intentar «arreglarlo» a las dos de la mañana.
 *
 * ═══ POR QUÉ NO LLEVA LA CONTABILIDAD ═══
 *
 * El retraso, las conformidades y el margen van en la tabla de la noche, que es
 * `gm` y se puede tener sin saber nada. Si estuvieran aquí, quien dirige a
 * ciegas necesitaría esta hoja para llevar la cuenta, y esta hoja le cuenta el
 * final. La frontera es justo esa: aquí se decide SI SALE; allí se apunta lo que
 * ha costado.
 */
import { esc } from '../../html';
import { envolverEstraza, portadaEstraza, sinTrama, ORNAMENTO } from './comun';
import { vistaDelNudo } from './datos';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../../shared/types';

export function cuadroVerdadero(
  game: GameSession,
  plot: Plot,
  opciones: DocumentRenderOptions,
): string {
  const vista = vistaDelNudo(game, plot);
  if (!vista.hay || !vista.trama) return sinTrama('El cuadro verdadero', opciones);
  const trama = vista.trama;

  /*
   * Quién guarda cada tira, dado la vuelta al reparto.
   *
   * El reparto está escrito de persona a telegramas y aquí hace falta al revés,
   * una vez por tira. Se invierte de golpe en vez de buscar dentro de la lista
   * de cada persona por cada telegrama: son quince tiras por doce personas, no
   * es el coste lo que importa, es que la búsqueda repetida se escribe mal.
   */
  const guardanLa = new Map<string, string[]>();
  for (const persona of vista.ferroviarios) {
    for (const tira of persona.telegramas) {
      const manos = guardanLa.get(tira.id) ?? [];
      manos.push(persona.nombre);
      guardanLa.set(tira.id, manos);
    }
  }

  const filasDelCuadro = vista.franjas
    .map((franja) => {
      const esCorreo = franja.convoyId === trama.correo;
      const carga = vista.convoyes.find((c) => c.id === franja.convoyId)?.carga;
      return `          <tr>
            <td style="width:16mm; text-align:center;"><strong>${franja.numero}.º</strong></td>
            <td style="width:22mm;" class="copia">${esc(franja.hora)}</td>
            <td>
              <strong style="font-size:12.5pt;">${esc(franja.convoyNombre)}</strong>${
                esCorreo
                  ? ' <span style="color:#9a2f22; font-weight:600;">&#9668; EL CORREO DE MEDIANOCHE</span>'
                  : ''
              }${
                carga
                  ? `<br /><span style="font-size:10pt; color:#7b6644;">lleva ${esc(carga)}</span>`
                  : ''
              }
            </td>
            <td style="width:18mm; text-align:center;"><span class="casilla"></span></td>
          </tr>`;
    })
    .join('\n');

  const filasDeTiras = trama.telegramas
    .map((tira) => {
      const manos = guardanLa.get(tira.id) ?? [];
      const quien =
        manos.length > 0
          ? manos.map((nombre) => esc(nombre)).join(' · ')
          : '<span style="color:#9a2f22;">nadie la tiene</span>';
      return `          <tr>
            <td style="width:20mm;" class="copia">${esc(tira.id)}</td>
            <td style="font-family:'Courier Prime', monospace; font-size:9.5pt; line-height:1.35;">${esc(
              tira.texto,
            )}</td>
            <td style="width:52mm; font-size:10.5pt;">${quien}</td>
          </tr>`;
    })
    .join('\n');

  const contenido = `${portadaEstraza(
    'Solo para quien prepara',
    'El cuadro verdadero',
    plot.tagline,
    'No la dejes sobre la mesa · No la lea quien vaya a jugar',
  )}

    <div class="aviso">
      Esta hoja lleva la solución de la noche entera. Si vas a jugar, no sigas leyendo
    </div>

    <h2>El cuadro de esta noche</h2>
    <p style="font-size:11pt; color:#5b4b31;">
      De arriba abajo, en el orden en que tienen que cruzar. Tacha la casilla de la derecha cada vez
      que salga uno de verdad: <strong>la fila sin tachar más alta es el único convoy que el
      enclavamiento acepta ahora mismo</strong>. La columna de la hora es de ambiente y no manda
      nada: si una franja se cierra sin que salga nadie, las horas se corren pero el orden no cambia.
    </p>

    <table>
      <thead>
        <tr>
          <th style="text-align:center;">Sale</th>
          <th>Hora</th>
          <th>El convoy que le toca</th>
          <th style="text-align:center;">Salió</th>
        </tr>
      </thead>
      <tbody>
${filasDelCuadro}
      </tbody>
    </table>

    <div class="caja caja--roja junto">
      <span class="etiqueta">El que no se puede quedar</span>
      <p style="margin:0;">
        <strong>${esc(vista.correo?.nombre ?? '—')}</strong> es el Correo de Medianoche y lleva el
        suero para el valle. Si no cruza, la noche está perdida aunque salgan los otros cinco y
        aunque el retraso no llegue al tope. Cuál es el Correo es público: puedes decirlo en voz
        alta todas las veces que haga falta. <strong>En qué franja va, no.</strong>
      </p>
    </div>

    <h2>Las tiras, enteras, y en qué mano está cada una</h2>
    <p style="font-size:11pt; color:#5b4b31;">
      Son las mismas que se repartieron en los sobres, con su texto exacto. Están aquí para que
      puedas seguir una discusión sin pedirle el papel a nadie —pedirlo delata quién lo tiene— y
      para ver de un vistazo a quién le falta hablar. <strong>Una tira puede aparecer en dos manos:
      son copias de servicio y está bien que sea así.</strong>
    </p>

    <table>
      <thead>
        <tr>
          <th>Tira</th>
          <th>Lo que dice</th>
          <th>Quién la guarda</th>
        </tr>
      </thead>
      <tbody>
${filasDeTiras}
      </tbody>
    </table>

${ORNAMENTO}

    <h2>Cómo se arbitra sin la app</h2>
    <p style="font-size:11pt; color:#5b4b31;">
      Con la app no hace falta esto: el enclavamiento resuelve solo y esta hoja se queda en el
      bolsillo. Si jugáis a mano —o si la app se cae a mitad de noche— arbitras tú, y estas son las
      cinco reglas enteras.
    </p>

    <ol class="reglas">
      <li>
        <strong>El siguiente, y ninguno otro.</strong>
        Cuenta las casillas ya tachadas. El enclavamiento acepta el convoy de la fila siguiente del
        cuadro de arriba y rechaza cualquier otro. Da igual qué franja sea, qué hora hayas anunciado
        y quién curse la orden: la única pregunta es si el convoy que te dicen es ese.
      </li>
      <li>
        <strong>Una orden rechazada cuesta ${vista.tarifa.ordenRechazada} minuto de retraso.</strong>
        Se apunta en la tabla de la noche y se sigue jugando en el acto. No se dice cuál era el
        bueno, no se dice si estaban cerca y no se dice cuántos llevan fallados.
      </li>
      <li>
        <strong>Una franja que se cierra sin que salga nadie cuesta
        ${vista.tarifa.franjaPerdida} minutos, y el cuadro se corre entero.</strong>
        No se rompe ni se salta nada: el convoy que tocaba sigue siendo el siguiente, y la noche
        entera se desplaza una franja como se corre un horario de verdad. La mesa siempre puede
        terminar; lo único que no vuelve es el tiempo.
      </li>
      <li>
        <strong>El tope de esta partida son ${vista.retrasoMaximo} minutos.</strong>
        Al llegar ahí se cierra el puerto y se acabó la noche, salgan los que salgan después. Al
        amanecer, además, cada convoy que no llegó a cruzar suma
        ${vista.tarifa.convoyVarado} minutos más a la cuenta final.
      </li>
      <li>
        <strong>Lo que cuesta cursar no lo lleva esta hoja.</strong>
        Las conformidades, el margen de cada cual y el retraso acumulado van en la tabla de la
        noche. Aquí solo se decide una cosa: si sale o si no sale.
      </li>
    </ol>

    <div class="caja caja--violeta junto">
      <span class="etiqueta">Si alguien discute una orden</span>
      <p style="margin:0 0 8px;">
        Lee esta hoja <strong>en silencio</strong>, cuenta las casillas tachadas desde arriba y
        anuncia dos palabras, siempre las mismas: <strong>«sale»</strong> o
        <strong>«no da paso»</strong>. Nada más. Ni una explicación, ni un «ahí casi», ni un gesto
        con la cabeza mientras alguien lee su tira en voz alta.
      </p>
      <p style="margin:0;">
        Si diriges a ciegas y esta hoja no es tuya, quien la guarda contesta desde donde esté y sin
        acercarse a la mesa. Contestar de lejos y con dos palabras es justo lo que hace que dirigir
        a ciegas se pueda arbitrar sin estropearlo.
      </p>
    </div>

    <div class="caja junto">
      <span class="etiqueta">Y cuando amanezca</span>
      <p style="margin:0;">
        Este es el momento de sacarla. Se lee la tabla de arriba entera y en voz alta, de la primera
        franja a la sexta, antes de contar quién acertó su cuadro. Es el final del juego: llevas
        toda la noche siendo la única persona de la casa que sabía esto.
      </p>
    </div>`;

  return envolverEstraza(`${plot.title} — El cuadro verdadero`, contenido, opciones);
}
