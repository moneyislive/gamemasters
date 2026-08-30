/**
 * Los rótulos de los puestos: un cartel por habitación, y lo que convierte una
 * casa en la estación de Valdehierro.
 *
 * Se cuelgan ANTES de que llegue nadie y no se vuelven a tocar en toda la noche.
 * A partir de ahí son el único papel que ata una habitación de verdad —la
 * cocina, el pasillo, el cuarto de atrás— con el puesto que sale nombrado en la
 * app. Quien va al telégrafo a resolver un Morse, va porque lo ha leído en una
 * puerta.
 *
 * ═══ POR QUÉ UNA PÁGINA ENTERA POR RÓTULO ═══
 *
 * Porque se leen andando, de noche y con la luz de paso. Un cartel a media hoja
 * se ve desde la puerta y no desde el fondo del pasillo, y el fallo que importa
 * no es que no se lea: es que alguien entre en la habitación que no era y se
 * ponga a resolver el instrumento de otro puesto mientras el suyo está libre.
 * De ahí el nombre a 46 puntos y el oficio a 26, que es lo que da la hoja.
 *
 * ═══ LA DESCRIPCIÓN DE LA HABITACIÓN NO VA EN LA PUERTA ═══
 *
 * `puesto.descripcion` la escribe quien organiza para reconocer SU casa —«la que
 * da al patio, con la puerta que chirría»— y es justo lo que necesita quien
 * cuelga los carteles y lo que no necesita nadie más. En el cartel sería un
 * párrafo compitiendo con el nombre a dos metros de distancia. Va, entera, en la
 * tabla de la primera página; en la puerta va solo lo que hay que hacer ahí.
 *
 * ═══ DOS COSAS QUE SE COMPRUEBAN AL IMPRIMIR ═══
 *
 * Que ningún oficio se haya quedado sin puesto y qué instrumentos se repiten.
 * Lo primero pasa de verdad —una habitación añadida después de generar cae en el
 * oficio por defecto— y deja un instrumento de la estación que no puede manejar
 * nadie: media economía de conformidades desaparece sin un solo error en
 * pantalla. Lo segundo no es un fallo, es lo normal con más de cuatro
 * habitaciones, y conviene decirlo antes de que alguien lo tome por una errata.
 *
 * ═══ EL ÚLTIMO CARTEL LLEVA UN ESTILO EN LÍNEA ═══
 *
 * `.cartel` corta página detrás de sí y la hoja de estilos lo perdona al último
 * con `:last-child`, pero ese selector aquí no acierta nunca: `envolverEstraza`
 * cierra siempre con el pie del documento, así que el último cartel nunca es el
 * último hijo. Sin el `page-break-after: auto` a mano, cada paquete acaba con un
 * folio en blanco con un pie de página. Es una línea, y se queda en este
 * fichero: la hoja de estilos la comparten nueve documentos.
 */
import { esc } from '../../html';
import { envolverEstraza, portadaEstraza, sinTrama, ORNAMENTO } from './comun';
import { vistaDelNudo } from './datos';
import { NOMBRE_DE_OFICIO, OFICIOS } from '../../../../../shared/juegos/nudo-tipos';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../../shared/types';

export function rotulosDePuesto(
  game: GameSession,
  plot: Plot,
  opciones: DocumentRenderOptions,
): string {
  const vista = vistaDelNudo(game, plot);
  if (!vista.hay || !vista.trama) return sinTrama('Rótulos de los puestos', opciones);

  const cuantos = vista.puestos.length;
  const sinPuesto = OFICIOS.filter((oficio) => !vista.puestos.some((p) => p.oficio === oficio));
  const repetidos = OFICIOS.filter(
    (oficio) => vista.puestos.filter((p) => p.oficio === oficio).length > 1,
  );

  /*
   * La consecuencia de que falte un oficio se escribe en singular o en plural
   * según lo que falte de verdad. Parece una manía y no lo es: esta caja se lee
   * de pie y con prisa, y una frase que cojea se relee dos veces.
   */
  const faltan = sinPuesto.map((oficio) => NOMBRE_DE_OFICIO[oficio]).join(' ni ');
  const consecuencia =
    sinPuesto.length === 1
      ? 'Ese instrumento no lo va a manejar nadie esta noche: su conformidad no se gana y ' +
        'quien lleve ese oficio no rinde de más en ningún puesto.'
      : 'Esos instrumentos no los va a manejar nadie esta noche: sus conformidades no se ganan ' +
        'y quien lleve esos oficios no rinde de más en ningún puesto.';

  const filas = vista.puestos
    .map(
      (p, i) => `          <tr>
            <td style="width:10mm; text-align:center;"><strong>${i + 1}</strong></td>
            <td style="width:52mm;"><strong>${esc(p.nombre)}</strong></td>
            <td style="width:44mm;">${esc(p.oficioNombre)}</td>
            <td>${p.descripcion ? esc(p.descripcion) : '<span class="copia">— sin descripción —</span>'}</td>
          </tr>`,
    )
    .join('\n');

  /*
   * El número del rótulo se repite arriba del cartel y en la tabla de la primera
   * página. Es lo que permite recoger un taco de folios sueltos de la impresora y
   * repartirlos por la casa sin leérselos todos.
   */
  const carteles = vista.puestos
    .map(
      (p, i) => `    <div class="cartel"${
        i === cuantos - 1 ? ' style="page-break-after:auto;"' : ''
      }>
      <div class="kicker">Estación de Valdehierro · rótulo ${i + 1} de ${cuantos}</div>
      <div class="nombre">${esc(p.nombre)}</div>
      <div class="oficio">${esc(p.oficioNombre)}</div>
      <p class="pie">
        ${esc(p.queSeHace)}<br />
        Para manejarlo hay que estar aquí de verdad y ocupar el puesto desde la app.
      </p>
    </div>`,
    )
    .join('\n\n');

  const contenido = `${portadaEstraza(
    'Uno por habitación',
    'Rótulos de los puestos',
    plot.tagline,
    `${cuantos} rótulos · uno por página · a una cara`,
  )}

    <div class="aviso">
      Cuélgalos antes de que llegue nadie
    </div>

    <div class="caja junto">
      <p style="margin:0;">
        Cada habitación con rótulo es un puesto de la estación y tiene su instrumento. Las que no
        lleven rótulo no son de la estación: ahí no se ocupa nada y no se resuelve nada. Estos
        carteles <strong>no destapan nada del cuadro de marchas</strong>, así que puedes colgarlos
        tú aunque vayas a dirigir a ciegas y jugar como uno más.
      </p>
    </div>

    <h2>Qué rótulo va en qué habitación</h2>

    <table>
      <thead>
        <tr>
          <th>N.º</th>
          <th>Rótulo</th>
          <th>Instrumento</th>
          <th>La habitación de tu casa</th>
        </tr>
      </thead>
      <tbody>
${filas}
      </tbody>
    </table>

    <p style="font-size:10.5pt; color:#5b4b31;">
      La última columna la escribiste tú al montar la partida. El número es el mismo que sale
      arriba de cada cartel: con los ${cuantos} carteles en la mano sabes dónde va cada uno sin
      leértelos enteros.
    </p>
${
  repetidos.length > 0
    ? `
    <div class="caja caja--violeta junto">
      <span class="etiqueta">Hay instrumentos repetidos, y está bien</span>
      <p style="margin:0;">
        Con más de cuatro habitaciones algún instrumento sale más de una vez. Esta noche se repiten
        <strong>${esc(repetidos.map((oficio) => NOMBRE_DE_OFICIO[oficio]).join(' · '))}</strong>.
        En una estación de verdad pasa igual, y de paso viene bien: en un puesto solo no cabe el
        turno entero, y con dos la gente se reparte en vez de hacer cola.
      </p>
    </div>`
    : ''
}${
    sinPuesto.length > 0
      ? `
    <div class="caja caja--roja junto">
      <span class="etiqueta">Ojo: la estación se queda coja</span>
      <p style="margin:0 0 8px;">
        No hay ninguna habitación con <strong>${esc(faltan)}</strong>. ${consecuencia}
      </p>
      <p style="margin:0;">
        Suele pasar por añadir habitaciones después de generar. Vuelve al taller y pulsa
        <strong>actualizar</strong>: se reparten los oficios otra vez y esta hoja sale completa. Si
        prefieres jugar así, avisa a la mesa de que ese puesto no existe en Valdehierro.
      </p>
    </div>`
      : ''
  }

    <div class="caja caja--violeta junto">
      <span class="etiqueta">Cómo se cuelgan</span>
      <ol class="reglas">
        <li><strong>A la altura de los ojos, y en todas en el mismo sitio.</strong> Quien busque el
          telégrafo a las tres de la mañana va a mirar donde miró la vez anterior.</li>
        <li><strong>Tienen que leerse sin encender la luz grande.</strong> Pruébalo tú antes:
          ponte a dos metros con la luz de paso y mira si distingues el nombre. Si no lo
          distingues, cámbialo de pared.</li>
        <li><strong>Colgado el cartel, la habitación ya no se cambia.</strong> El rótulo es lo
          único que ata tu casa con los nombres de puesto que salen en la app: si se cruzan dos, la
          gente va a la habitación que no era y allí no hay nada que resolver.</li>
        <li><strong>Cinta de pintor o masilla adhesiva, no chinchetas.</strong> El papel es fino y
          se rasga al descolgarlo, y estos carteles se guardan para la próxima noche.</li>
        <li><strong>Si sobran habitaciones, déjalas sin rótulo.</strong> No hace falta que toda la
          casa sea estación: cuatro puestos bien repartidos por el pasillo dan más juego que ocho
          pegados.</li>
      </ol>
    </div>

${ORNAMENTO}

    <div class="pagina"></div>
${carteles}`;

  return envolverEstraza(`${plot.title} — Rótulos de los puestos`, contenido, opciones);
}
