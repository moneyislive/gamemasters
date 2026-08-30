/**
 * El cuadro de marchas en blanco: la cuadrícula donde se resuelve la noche.
 *
 * Se reparte antes de abrir la primera franja, una por persona, y no se recoge
 * hasta el amanecer. Es la única hoja del paquete que se ESCRIBE —las demás se
 * leen— y es la herramienta de deducción entera: mientras la app lleva la
 * cuenta del retraso y arbitra las órdenes, averiguar el cuadro pasa aquí,
 * encima de la mesa, a lápiz y a la vista de todos.
 *
 * ═══ POR QUÉ LAS FILAS VAN EN EL ORDEN EN QUE VAN ═══
 *
 * En el orden en que quien organiza dio de alta los convoyes (`vista.convoyes`),
 * que no se parece al del cuadro y no tiene por qué. Y de ahí sale la regla que
 * este fichero no puede romper por comodidad: NO SE TOCA
 * `vista.franjas[i].convoyNombre`. Ese campo es la solución, y esta hoja se
 * imprime una por persona y se queda toda la noche encima de la mesa. Ordenar
 * las filas con cualquier cosa que salga de la trama —aunque fuese solo para
 * que quedasen bonitas, o para que el Correo saliera arriba— repartiría media
 * respuesta impresa a las doce de la noche, y nadie se enteraría hasta que la
 * mesa acertase seis órdenes seguidas sin discutir ninguna.
 *
 * De `vista.franjas` se lee SOLO la hora y el número, que son públicos y están
 * escritos en las reglas del juego: las seis franjas de la noche son las mismas
 * en todas las partidas. Lo único que la trama decide es qué convoy cae en cada
 * una, y eso es justo lo que esta hoja tiene que dejar en blanco.
 *
 * ═══ LA CUADRÍCULA Y LA LISTA DE SALIDAS SON DOS COSAS DISTINTAS ═══
 *
 * Y por eso son dos tablas y no una. La cuadrícula guarda lo que se SUPONE:
 * equis, círculos y correcciones que se van rehaciendo según entran telegramas.
 * La lista de abajo guarda lo que ha PASADO: el convoy que el enclavamiento
 * dejó cruzar en esa franja, que ya no se discute. Meter las dos cosas en la
 * misma rejilla es como acaba una mesa a las dos de la mañana discutiendo si un
 * círculo era una deducción o un recuerdo.
 *
 * La lista va NUMERADA por posición y no por reloj, y la hora se rotula como
 * prevista, porque el cuadro se corre: si una franja se cierra sin que salga
 * nadie, la noche entera se desplaza y las horas dejan de cuadrar mientras el
 * orden sigue siendo el mismo. Una lista encabezada por horas firmes obligaría
 * a tachar y reescribir seis renglones la primera vez que eso pasara.
 *
 * ═══ DOS PÁGINAS, Y A UNA CARA ═══
 *
 * La primera se destroza: hora y media de tachar, borrar y volver a tachar deja
 * un papel que no se lee ni de cerca. La segunda es para pasarlo a limpio
 * cuando la mesa ya está de acuerdo, y es la que cada cual mira al entregar SU
 * cuadro de memoria, que es la puntuación individual de la noche.
 *
 * Van a una cara, como declara el catálogo, y no es por gasto de papel: las dos
 * tienen que poder estar abiertas a la vez sobre la mesa. Una cuadrícula sucia
 * y su copia en limpio no se comparan si son el anverso y el reverso del mismo
 * folio.
 */
import { esc } from '../../html';
import { envolverEstraza, portadaEstraza, sinTrama, ORNAMENTO } from './comun';
import { vistaDelNudo } from './datos';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../../shared/types';

export function cuadroEnBlanco(
  game: GameSession,
  plot: Plot,
  opciones: DocumentRenderOptions,
): string {
  const vista = vistaDelNudo(game, plot);
  if (!vista.hay || !vista.trama) return sinTrama('El cuadro de marchas', opciones);

  /*
   * El Correo se marca en su fila porque es PÚBLICO desde el minuto uno: está
   * en las reglas y en las hojas de porte. Rojo de tampón, que en esta imprenta
   * es lo que no se discute, y no una equis: la equis es lo que se tacha a
   * lápiz, y dos marcas iguales con dos significados en la misma tabla es
   * exactamente lo que no se puede leer con poca luz.
   */
  const MARCA_CORREO =
    ' <span style="font-family:\'Courier Prime\',monospace;font-size:8pt;' +
    'letter-spacing:0.1em;color:#9a2f22;">CORREO</span>';

  const cabecera = vista.franjas
    .map((franja) => `<th scope="col">${esc(franja.hora)}</th>`)
    .join('\n          ');

  const filas = vista.convoyes
    .map((convoy) => {
      const casillas = vista.franjas.map(() => '<td></td>').join('');
      return `          <tr>
            <th scope="row">${esc(convoy.nombre)}${convoy.esCorreo ? MARCA_CORREO : ''}</th>
            ${casillas}
          </tr>`;
    })
    .join('\n');

  /** La rejilla de seis por seis. Idéntica en las dos páginas, a propósito. */
  const cuadricula = `    <table class="cuadricula">
      <thead>
        <tr>
          <th scope="col" style="text-align:left;">Convoy</th>
          ${cabecera}
        </tr>
      </thead>
      <tbody>
${filas}
      </tbody>
    </table>`;

  const renglones = vista.franjas
    .map(
      (franja) => `          <tr>
            <td style="width:12mm; text-align:center;">${franja.numero}</td>
            <td style="width:26mm;">${esc(franja.hora)}</td>
            <td style="height:9mm;"></td>
          </tr>`,
    )
    .join('\n');

  /** Lo que ya ha cruzado. Se apunta según se despacha y no se borra nunca. */
  const salidas = `    <div class="caja junto">
      <span class="etiqueta">Lo que va saliendo</span>
      <table>
        <thead>
          <tr>
            <th style="text-align:center;">Nº</th>
            <th>Hora prevista</th>
            <th>Convoy que ha cruzado</th>
          </tr>
        </thead>
        <tbody>
${renglones}
        </tbody>
      </table>
      <p style="margin:6px 0 0; font-size:10pt; color:#5b4b31;">
        Apunta el convoy en cuanto el enclavamiento le dé paso, no antes. Si una franja se cierra
        sin que salga nadie, la noche se corre entera: sigue por el renglón siguiente y no borres
        nada. El orden del cuadro no cambia; lo que cambia es la hora a la que se cumple.
      </p>
    </div>`;

  const contenido = `    <div class="pagina">
${portadaEstraza(
    'Una por persona',
    'El cuadro de marchas',
    plot.tagline,
    'Hoja para tachar · lápiz y goma',
  )}

    <p style="margin:0 0 10px; font-size:10pt; color:#7b6644;">
      Quien prepara: si la impresora llega a A3, saca una copia ampliada de esta primera página para
      el centro de la mesa. Con doce personas de pie, la discusión se sigue mucho mejor sobre una
      grande que asomándose a la de al lado.
    </p>

    <div class="campo"><span>Tu nombre</span><span></span></div>

${cuadricula}

    <div class="caja caja--roja junto">
      <span class="etiqueta">Lo único que ya sabes</span>
      <p style="margin:0;">
        <strong>${esc(vista.correo?.nombre ?? '')}</strong> es el Correo de Medianoche y va marcado
        en su fila. Que sea el Correo es público desde el principio y no es una pista: lo que no
        sabe nadie todavía es en qué franja cruza. Si al amanecer no ha cruzado, la noche está
        perdida aunque hayan salido los otros cinco.
      </p>
    </div>

    <div class="caja caja--violeta junto">
      <span class="etiqueta">Cómo se rellena</span>
      <ul class="reglas">
        <li>
          <strong>Equis en lo que queda descartado.</strong>
          Cada vez que un telegrama diga que un convoy NO puede ir en una franja, tacha esa casilla.
          Y no la borres luego: el tachón es la prueba de por qué, y sin él la mesa vuelve a
          discutir dentro de media hora lo que ya había resuelto.
        </li>
        <li>
          <strong>Círculo en lo que queda confirmado.</strong>
          Solo cuando se deduzca de un telegrama o de una orden que el enclavamiento haya aceptado.
          Lo que a alguien le parece razonable no se rodea: se dice en voz alta y se discute.
        </li>
        <li>
          <strong>Una fila con una sola casilla libre está resuelta.</strong>
          Rodéala y tacha el resto de esa columna, entera, por arriba y por abajo: si ese convoy
          sale en esa franja, ya no puede salir ningún otro en ella. Ahí es donde se cae media
          cuadrícula de golpe.
        </li>
        <li>
          <strong>La tuya es tuya.</strong>
          Nadie te puede obligar a enseñarla, y al final cada cual entrega su cuadro por separado y
          de memoria. Copiar la del vecino sin entenderla es copiarla mal.
        </li>
      </ul>
    </div>
    </div>

    <div class="pagina">
    <h2>El cuadro, en limpio</h2>

    <p style="margin:0 0 10px;">
      Esta segunda hoja se rellena cuando la mesa ya está de acuerdo, de una sentada y sin tachones.
      Es la que vas a mirar al entregar tu cuadro de marchas, y es tuya: se puede sacar la noche
      adelante entre todos y entregar un cuadro con dos franjas cambiadas.
    </p>

    <div class="campo"><span>Tu nombre</span><span></span></div>

${cuadricula}

${ORNAMENTO}

${salidas}

    <div class="caja caja--roja junto">
      <span class="etiqueta">Antes de entregarlo</span>
      <p style="margin:0;">
        Comprueba tres cosas y no tardes más de un minuto: que hay <strong>un convoy en cada una de
        las seis franjas</strong>, que <strong>ninguno se repite</strong> —en cada franja sale uno y
        solo uno— y que has puesto tu nombre arriba. Un cuadro con una franja en blanco cuenta como
        una franja fallada, no como una franja sin contestar.
      </p>
    </div>
    </div>`;

  return envolverEstraza(`${plot.title} — El cuadro de marchas`, contenido, opciones);
}
