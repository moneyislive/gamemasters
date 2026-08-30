/**
 * La tabla de la noche: el retraso, las conformidades y el margen, a lápiz.
 *
 * Es la hoja que quien dirige tiene delante desde que se abre la primera franja
 * hasta que da el parte del amanecer. La app lleva la cuenta de verdad —el
 * retraso, las conformidades y el margen de cada cual están en el estado y se
 * ven en el panel—, pero el panel vive en una pantalla que hay que desbloquear y
 * la mesa pregunta «¿cuánto llevamos?» cada dos minutos. Un papel con casillas
 * tachadas se lee de un vistazo, y se lee desde el otro lado de la mesa.
 *
 * ═══ POR QUÉ AQUÍ NO APARECE EL CUADRO DE MARCHAS ═══
 *
 * Porque quien dirige puede estar dirigiendo A CIEGAS, es decir jugando como uno
 * más y sin conocer el orden de los convoyes. Esta hoja va marcada `gm` en el
 * catálogo y se imprime en los dos modos, así que basta con que se le escape una
 * columna con los nombres de los convoyes ya colocados —o una fila de la tabla
 * de salidas rellenada de antemano— para que quien la lleva sepa la respuesta
 * antes de empezar. De ahí las dos reglas que se respetan a rajatabla:
 *
 *   · No se lee `franjas[i].convoyNombre` en ningún sitio. De las franjas se
 *     usan el número y la hora, que son constantes de la noche y no dicen nada.
 *   · La tabla de convoyes salidos va en blanco. Se numera por ORDEN DE SALIDA,
 *     no por franja: si una franja se pierde, el cuadro entero se corre y las
 *     dos numeraciones dejan de coincidir. Se rellena según van saliendo.
 *
 * Lo único que sí se nombra es el Correo de Medianoche, y se nombra a propósito:
 * cuál es es público desde el minuto uno —está en su hoja de porte, encima de la
 * mesa— y es la comprobación que hay que hacer antes de dar el parte.
 *
 * ═══ POR QUÉ CASILLAS Y NO NÚMEROS ═══
 *
 * Un número escrito, tachado y reescrito seis veces deja de leerse a la tercera.
 * Todo lo que solo SUBE va en casillas —los rechazos, las conformidades ganadas,
 * las consultas— y solo se escribe a mano lo que sube y baja: los minutos de
 * cada franja, el acumulado y lo que queda de conformidades al cerrar.
 *
 * Las cantidades de casillas no son a ojo: salen de la propia partida. Los
 * rechazos posibles en una franja son los convoyes menos el que toca; el margen
 * que alguien puede llegar a acumular es una franja tras otra resolviendo su
 * instrumento; y las consultas que caben son ese margen dividido por lo que
 * cuesta preguntar. Una mesa de doce no imprime la hoja de una de cuatro.
 */
import { esc } from '../../html';
import { envolverEstraza, portadaEstraza, sinTrama, ORNAMENTO } from './comun';
import { vistaDelNudo } from './datos';
import { CONFORMIDADES_DE_OFICIO } from '../../../../../shared/juegos/nudo-tipos';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../../shared/types';

/** Una tira de casillas de tachar, separadas para que quepa un lápiz entre dos. */
function casillas(cuantas: number): string {
  return Array.from({ length: Math.max(1, cuantas) }, () => '<span class="casilla"></span>').join(
    ' ',
  );
}

export function tablaDeLaNoche(
  game: GameSession,
  plot: Plot,
  opciones: DocumentRenderOptions,
): string {
  const vista = vistaDelNudo(game, plot);
  if (!vista.hay || !vista.trama) return sinTrama('Tabla de la noche', opciones);

  const { tarifa } = vista;
  const franjas = vista.franjas.length;
  const convoyes = vista.convoyes.length;
  const puestos = vista.puestos.length;

  /* En una franja se puede fallar, como mucho, con todos los convoyes menos el bueno. */
  const rechazosPorFranja = Math.max(1, convoyes - 1);
  /* El techo de margen de una persona: su instrumento, franja tras franja. */
  const margenPosible = franjas * (tarifa.margenPorInstrumento + tarifa.margenExtra);
  /* Y las consultas que da ese margen, que es lo que hace falta para el trofeo «De cabeza». */
  const consultasPosibles = Math.max(1, Math.floor(margenPosible / tarifa.consulta));

  const filasDeRetraso = vista.franjas
    .map(
      (franja) => `          <tr>
            <td style="width:26mm;"><strong>Franja ${franja.numero}</strong>
              <span class="copia">${esc(franja.hora)}</span></td>
            <td>${casillas(rechazosPorFranja)}</td>
            <td style="width:22mm;"></td>
            <td style="width:24mm;"></td>
          </tr>`,
    )
    .join('\n');

  const filasDeConformidades = vista.franjas
    .map(
      (franja) => `          <tr>
            <td style="width:26mm;"><strong>Franja ${franja.numero}</strong>
              <span class="copia">${esc(franja.hora)}</span></td>
            <td style="width:22mm;"></td>
            <td>${casillas(puestos)}</td>
            <td style="width:22mm;"></td>
            <td style="width:22mm;"></td>
          </tr>`,
    )
    .join('\n');

  const filasDeMargen = vista.ferroviarios
    .map(
      (persona) => `          <tr>
            <td style="width:44mm;"><strong>${esc(persona.nombre)}</strong><br />
              <span style="font-size:10pt; color:#7b6644;">${esc(persona.oficioNombre)} · rinde el doble en ${esc(
                persona.instrumento,
              )}</span></td>
            <td>${casillas(margenPosible)}</td>
            <td style="width:16mm; text-align:center;"><span class="casilla"></span></td>
            <td style="width:32mm;">${casillas(consultasPosibles)}</td>
          </tr>`,
    )
    .join('\n');

  const filasDeSalidas = Array.from(
    { length: convoyes },
    (_, i) => `          <tr>
            <td style="width:18mm; text-align:center;"><strong>${i + 1}.ª</strong></td>
            <td></td>
            <td style="width:30mm;"></td>
            <td style="width:44mm;"></td>
          </tr>`,
  ).join('\n');

  const contenido = `${portadaEstraza(
    'Para quien dirige',
    'Tabla de la noche',
    plot.tagline,
    'Retraso · conformidades · margen · salidas',
  )}

    <div class="aviso">
      Aquí no está el cuadro de marchas. Puedes llevarla a la vista
    </div>

    <div class="caja junto">
      <p style="margin:0;">
        Llévala a lápiz y con goma, y <strong>di en voz alta cada cosa que apuntes</strong>: el
        retraso es el reloj de esta noche y la mesa tiene que oírlo subir. La app lleva la misma
        cuenta y es la que manda si algún día no coincidís; esto es para no tener que desbloquear
        el móvil cada dos minutos.
      </p>
    </div>

    <h2>1 · El retraso</h2>

    <div class="caja caja--roja junto">
      <span class="etiqueta">Tope de esta partida: ${vista.retrasoMaximo} minutos</span>
      <div style="text-align:center; line-height:2.3;">${casillas(vista.retrasoMaximo)}</div>
      <p style="margin:6px 0 0; font-size:10.5pt; color:#5b4b31;">
        Tacha una casilla por cada minuto que suba y bórrala si alguien lo recupera. Cuando se
        tachen las ${vista.retrasoMaximo}, <strong>el puerto se cierra</strong> y la noche se acaba
        ahí mismo: no se sigue jugando para ver si salen los que faltan.
      </p>
    </div>

    <table>
      <thead>
        <tr>
          <th>Franja</th>
          <th>Órdenes rechazadas — una casilla por rechazo</th>
          <th style="width:22mm;">Minutos</th>
          <th style="width:24mm;">Acumulado</th>
        </tr>
      </thead>
      <tbody>
${filasDeRetraso}
          <tr style="background:rgba(154,47,34,0.07);">
            <th>Al amanecer</th>
            <td>Convoyes que se quedaron en la vía: ${casillas(convoyes)}
              <span style="font-size:10pt; color:#7b6644;">&nbsp;· ${tarifa.convoyVarado} minutos cada uno</span></td>
            <td></td>
            <td></td>
          </tr>
      </tbody>
    </table>

    <p style="font-size:10.5pt; color:#5b4b31;">
      Cada casilla tachada son <strong>${tarifa.ordenRechazada} minuto</strong>. Si una franja se
      cierra sin que salga nadie son <strong>${tarifa.franjaPerdida} minutos</strong> más: escríbelos
      en «minutos» de esa fila y anota al lado «perdida». Que se pierda una franja no rompe la
      noche —el cuadro se corre entero y el convoy que tocaba sigue esperando su turno—, lo único
      que se pierde es tiempo. Cada minuto que alguien recupere con su margen se resta también aquí,
      con un −1 en la fila de la franja en la que lo recupere.
    </p>

    <h2>2 · Las conformidades</h2>

    <table>
      <thead>
        <tr>
          <th>Franja</th>
          <th style="width:22mm;">Había al abrir</th>
          <th>Ganadas — una casilla por puesto rendido (hay ${puestos})</th>
          <th style="width:22mm;">Gastadas</th>
          <th style="width:22mm;">Quedan</th>
        </tr>
      </thead>
      <tbody>
${filasDeConformidades}
      </tbody>
    </table>

    <p style="font-size:10.5pt; color:#5b4b31;">
      Al abrir cada franja la estación regala
      <strong>${CONFORMIDADES_DE_OFICIO}</strong>, y las demás hay que ganarlas: cada puesto da UNA
      la primera vez que alguien resuelve su instrumento en esa franja, y solo la primera. Cursar
      una orden gasta una <strong>salga o no salga el convoy</strong>. Lo que quede al cerrar no se
      tira: pásalo a la casilla «había al abrir» de la fila siguiente.
    </p>

    <div class="caja caja--violeta junto">
      <span class="etiqueta">Si la estación se queda a cero</span>
      <p style="margin:0;">
        No pasa nada raro y no hay que inventarse ninguna regla: quien quiera cursar tiene que ir a
        un puesto y sacar un instrumento primero. La única forma de saltárselo es la maña del factor
        de circulación, la <strong>llave maestra</strong>, y se usa una sola vez en toda la noche.
      </p>
    </div>

    <h2>3 · El margen de cada cual</h2>

    <table>
      <thead>
        <tr>
          <th>Quién</th>
          <th>Margen — tacha al ganarlo, borra al gastarlo</th>
          <th style="width:16mm;">Maña</th>
          <th style="width:32mm;">Archivo</th>
        </tr>
      </thead>
      <tbody>
${filasDeMargen}
      </tbody>
    </table>

    <p style="font-size:10.5pt; color:#5b4b31;">
      El margen es <strong>personal y no se presta</strong>: se gana resolviendo instrumentos
      (+${tarifa.margenPorInstrumento}, y +${tarifa.margenExtra} más si el puesto es el del oficio
      de quien lo resuelve) y se gasta en consultar el archivo o en recuperar minutos. La columna
      «maña» es una sola casilla porque la maña se usa <strong>una vez en toda la noche</strong>:
      tacha la casilla en cuanto se diga en voz alta, para no discutirlo después. La de «archivo»
      lleva la cuenta de las consultas, que es de lo que sale el trofeo de quien saque la noche sin
      preguntar nada.
    </p>

${ORNAMENTO}

    <h2>4 · Los convoyes que han salido</h2>

    <table>
      <thead>
        <tr>
          <th>Salida</th>
          <th>Qué convoy ha salido</th>
          <th>En qué franja</th>
          <th>Quién cursó la orden</th>
        </tr>
      </thead>
      <tbody>
${filasDeSalidas}
      </tbody>
    </table>

    <p style="font-size:10.5pt; color:#5b4b31;">
      Se numera por orden de salida y no por franja: si se pierde alguna, las dos numeraciones
      dejan de coincidir y la que vale para el parte es esta. Rellénala en el momento, no de
      memoria al final.
    </p>

    <div class="caja caja--roja junto">
      <span class="etiqueta">Lo último que se mira antes de dar el parte</span>
      <p style="margin:0;">
        ¿Está <strong>${esc(vista.correo?.nombre ?? 'el Correo de Medianoche')}</strong> en esa
        lista? Es el Correo, lleva el suero para el valle y es público cuál es desde el principio.
        Si no ha cruzado, la noche está perdida por mucho que hayan salido los otros
        ${Math.max(1, convoyes - 1)}.
      </p>
    </div>

    <h2>5 · La tarifa</h2>

    <div class="caja caja--roja junto">
      <table>
        <tbody>
          <tr>
            <td>El enclavamiento rechaza una orden</td>
            <td style="width:56mm;"><strong>+${tarifa.ordenRechazada}</strong> minuto de retraso</td>
          </tr>
          <tr>
            <td>Se cierra una franja sin sacar a nadie</td>
            <td><strong>+${tarifa.franjaPerdida}</strong> minutos, y el cuadro se corre</td>
          </tr>
          <tr>
            <td>Cada convoy que sigue en la vía al amanecer</td>
            <td><strong>+${tarifa.convoyVarado}</strong> minutos</td>
          </tr>
          <tr>
            <td>Se resuelve un instrumento</td>
            <td><strong>+${tarifa.margenPorInstrumento}</strong> de margen
              (<strong>+${tarifa.margenExtra}</strong> más en el puesto de tu oficio)</td>
          </tr>
          <tr>
            <td>Se le pregunta al archivo por un convoy y una franja</td>
            <td><strong>−${tarifa.consulta}</strong> de margen · contesta sí o no</td>
          </tr>
          <tr>
            <td>Se recupera tiempo</td>
            <td><strong>−${tarifa.recuperar}</strong> de margen · borra
              <strong>${tarifa.recupera}</strong> minuto</td>
          </tr>
          <tr>
            <td>Se cursa una orden de salida</td>
            <td><strong>−1</strong> conformidad, salga o no salga</td>
          </tr>
          <tr>
            <td>Se abre una franja</td>
            <td><strong>+${CONFORMIDADES_DE_OFICIO}</strong> conformidad de oficio</td>
          </tr>
          <tr>
            <td><strong>Tope de retraso de esta partida</strong></td>
            <td><strong>${vista.retrasoMaximo} minutos</strong> · con
              ${vista.ferroviarios.length} personas de turno</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2>6 · Las tres formas de acabar la noche</h2>

    <div class="caja caja--violeta junto">
      <ol class="reglas">
        <li>
          <strong>Cruzan los seis y gana el turno.</strong>
          Los ${convoyes} convoyes han salido —el Correo entre ellos— y el retraso no ha llegado a
          ${vista.retrasoMaximo}. Ganan todos: aquí nadie gana por su cuenta y nadie pierde por
          culpa de nadie.
        </li>
        <li>
          <strong>Se cierra el puerto y se acaba ahí.</strong>
          El retraso llega a ${vista.retrasoMaximo} minutos y la noche termina en ese instante, con
          el Correo dentro. No se juega la franja que estaba abierta ni se espera a ver si salía
          alguien más: dilo, cierra y pasa al parte.
        </li>
        <li>
          <strong>Amanece con convoyes en la vía.</strong>
          Lo decides tú, cuando ves que la mesa ya no llega. Cada convoy que se quedó suma
          ${tarifa.convoyVarado} minutos al retraso final, y si uno de ellos es el Correo la noche
          está perdida aunque el retraso siga por debajo del tope.
        </li>
      </ol>
    </div>

    <div class="caja junto">
      <span class="etiqueta">Y una cosa que no cambia nada de lo anterior</span>
      <p style="margin:0;">
        El cuadro que cada cual entrega de memoria se puntúa <strong>aparte</strong> y no decide la
        noche. Se puede sacar los ${convoyes} convoyes y entregar un cuadro con dos franjas
        cambiadas, y se puede perder la noche habiéndolo clavado. Recuérdaselo a la mesa antes de
        abrir el cuadro final: hay quien se guarda lo que sabe pensando que compite con alguien, y
        en esta noche no compite con nadie.
      </p>
    </div>`;

  return envolverEstraza(`${plot.title} — Tabla de la noche`, contenido, opciones);
}
