/**
 * Las tiras del telégrafo: el rompecabezas de la noche, recortado y en sobres.
 *
 * Se usa CON TIJERAS y media hora antes de que llegue nadie, nunca en la mesa.
 * Salen una hoja de instrucciones, un montón de tiras por persona con su nombre
 * a tamaño de titular encima, y una hoja de control para contar los montones
 * antes de cerrar los sobres. Pasada esa media hora, este documento no vuelve a
 * servir para nada.
 *
 * ═══ POR QUÉ EMPIEZA CON UN AVISO Y NO CON LAS TIRAS ═══
 *
 * En los otros tres paquetes, quien prepara puede leer un recortable suelto sin
 * estropear gran cosa. Aquí no: los telegramas son un sistema y el generador
 * garantiza que ninguno sobra, así que leerlos todos es leer el cuadro de
 * marchas. Quien recorta esto y luego se sienta a jugar ya sabe en qué orden
 * cruzan los seis convoyes, y no queda noche que jugar. El aviso va delante de
 * las tijeras porque la primera página es la única que se lee con seguridad.
 *
 * Por lo mismo, las anomalías —alguien sin ninguna tira, telegramas que no lleva
 * nadie— se cantan en la PRIMERA página y no en la de control: una advertencia
 * que llega después de recortar sesenta tiras no sirve para nada.
 *
 * ═══ EL NOMBRE VA GRANDE ARRIBA Y PEQUEÑO EN CADA TIRA ═══
 *
 * Arriba, a tamaño de titular, porque el error que arruina la noche no es cortar
 * torcido: es meter el montón en el sobre de al lado. A las once de la noche,
 * con doce montones en la mesa de la cocina, un encabezado de 13 pt no se ve.
 *
 * Repetido pequeño en la cabecera de cada tira —«Para Marta»— porque un montón
 * recortado se cae al suelo, y sin destinatario impreso la única forma de
 * recomponerlo es leyendo los textos, que es justo lo que este documento pide
 * que no se haga. Y de paso es cierto: un telegrama de 1927 llevaba
 * destinatario.
 *
 * Lo que NO se marca en la tira es si es copia de servicio —o sea, si otra
 * persona lleva el mismo texto—, aunque el impreso de la época lo habría dicho.
 * Quien recibe una tira sabiendo que hay otra igual en la mesa tiende a callarse
 * y a esperar a que la lea el otro, y esta noche se pierde justamente por lo que
 * nadie llegó a decir en voz alta. Los repetidos se listan en la hoja de
 * control, que la lee quien prepara y nadie más.
 *
 * ═══ SE ESCRIBE SOBRE LO REPARTIDO, NO SOBRE LO QUE DEBERÍA HABER ═══
 *
 * Hoy `generarCuadro` reparte por turnos una baraja de telegramas distintos, con
 * el mínimo puesto en uno por persona: así que no se repite ninguno, no se queda
 * ninguno sin dueño y nadie se queda sin papel. Las tres cosas que este
 * documento contempla no las produce el generador.
 *
 * Se contemplan igual porque lo que se imprime no es lo que salió del generador
 * sino lo que hay GUARDADO —`vistaDelNudo` se hace la pregunta en presente, y su
 * cabecera explica por qué—, y entre generar e imprimir cabe dar de alta a
 * alguien: esa persona no está en el reparto y su sobre saldría vacío. Decirlo
 * en la primera página, en rojo y con el nombre, cuesta quince líneas y evita
 * una noche entera con alguien de pie sin nada que aportar.
 *
 * ═══ CADA PERSONA, EN UN BLOQUE QUE NO SE PARTE ═══
 *
 * `junto` envuelve el bloque entero y no solo cada tira. Gasta papel —alguien
 * con cuatro tiras puede empujar su bloque a la hoja siguiente— y evita el fallo
 * caro: un montón cuya última tira se quedó al dorso de la hoja anterior se
 * cierra con una tira de menos, y eso no se descubre hasta que la mesa lleva
 * media hora atascada sin saber que le falta información.
 *
 * ═══ EL RECUENTO SE HACE SOBRE LO QUE SE IMPRIME ═══
 *
 * Las cuentas de la hoja de control salen de `vista.ferroviarios[].telegramas`,
 * que es la misma lista que compone las tiras, y no de `trama.reparto`. Son la
 * misma cosa salvo cuando no lo son —un id repartido que ya no existe entre los
 * telegramas se cae al componer la vista— y ahí lo que importa es cuántas tiras
 * hay EN EL PAPEL, que es lo que se va a contar con el dedo.
 */
import { esc } from '../../html';
import { envolverEstraza, portadaEstraza, sinTrama, ORNAMENTO } from './comun';
import { vistaDelNudo } from './datos';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../../shared/types';

/** «3 tiras», «1 tira». Aquí casi todo se cuenta y casi todo tiene dos formas. */
function contar(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

export function tirasTelegrama(
  game: GameSession,
  plot: Plot,
  opciones: DocumentRenderOptions,
): string {
  const vista = vistaDelNudo(game, plot);
  if (!vista.hay || !vista.trama) return sinTrama('Las tiras del telégrafo', opciones);

  /*
   * Quién lleva cada telegrama. Se recorre el reparto ya compuesto porque de ahí
   * salen las dos cosas que hay que saber antes de recortar: qué tiras están
   * duplicadas a propósito y cuáles no las lleva nadie, que no es lo mismo.
   */
  const quienLleva = new Map<string, string[]>();
  for (const persona of vista.ferroviarios) {
    for (const tira of persona.telegramas) {
      quienLleva.set(tira.id, [...(quienLleva.get(tira.id) ?? []), persona.nombre]);
    }
  }

  const totalTiras = vista.ferroviarios.reduce((n, p) => n + p.telegramas.length, 0);
  const compartidos = vista.trama.telegramas.filter(
    (t) => (quienLleva.get(t.id) ?? []).length > 1,
  );
  const huerfanos = vista.trama.telegramas.filter((t) => !quienLleva.has(t.id));
  const sinPapel = vista.ferroviarios.filter((p) => p.telegramas.length === 0);

  const bloques = vista.ferroviarios
    .map((persona) => {
      const tiras = persona.telegramas
        .map(
          (t) => `      <div class="tira">
        <div class="cabecera">
          <span>Valdehierro · ${esc(t.id)}</span>
          <span>Para ${esc(persona.nombre)}</span>
        </div>
        <div class="texto">${esc(t.texto)}</div>
      </div>`,
        )
        .join('\n      <hr class="corte" />\n');

      const cuerpo =
        tiras ||
        `      <div class="caja caja--roja">
        <p style="margin:0;">
          A esta persona no le ha tocado ninguna tira. No recortes nada suyo y no le cierres el
          sobre: vuelve al taller y genera otra vez antes de seguir.
        </p>
      </div>`;

      /*
       * DOS RENGLONES Y NO UNO. `etiqueta` va en versalitas con mucho espaciado:
       * es perfecta para «SOBRE DE ANA · 3 TIRAS», que es lo que se busca de un
       * vistazo mientras se corta, y ilegible para una línea larga. El oficio y
       * el nombre del personaje —que son lo que empareja el sobre con el dosier
       * cuando hay doce encima de la mesa— bajan a un renglón normal.
       */
      return `    <div class="junto">
      <h2 style="font-size:21pt; margin-top:24px;">${esc(persona.nombre)}</h2>
      <p class="etiqueta" style="margin:0 0 3px;">Sobre de ${esc(persona.nombre)} · ${contar(
        persona.telegramas.length,
        'tira',
        'tiras',
      )}</p>
      <p style="margin:0 0 9px; font-size:10pt; color:#5b4b31;">${esc(
        persona.oficioNombre,
      )} · en su dosier figura como ${esc(persona.personaje)}</p>
${cuerpo}
    </div>`;
    })
    .join('\n\n');

  const filas = vista.ferroviarios
    .map(
      (p) => `          <tr>
            <td>${esc(p.nombre)}</td>
            <td>${esc(p.oficioNombre)}</td>
            <td style="text-align:center;"><strong>${p.telegramas.length}</strong></td>
            <td style="text-align:center;"><span class="casilla"></span></td>
            <td style="text-align:center;"><span class="casilla"></span></td>
          </tr>`,
    )
    .join('\n');

  const listaCopias = compartidos
    .map(
      (t) => `        <li><strong>${esc(t.id)}</strong> — va en los sobres de ${esc(
        (quienLleva.get(t.id) ?? []).join(', '),
      )}</li>`,
    )
    .join('\n');

  /*
   * Lo que hay que ver ANTES de coger las tijeras. Se compone aparte para que
   * quede pegado a la portada: recortar una hora y enterarse al final de que hay
   * que volver a generar es la única forma de perder la velada dos veces.
   */
  const anomalias =
    sinPapel.length > 0 || huerfanos.length > 0
      ? `    <div class="caja caja--roja junto">
      <span class="etiqueta">Para antes de coger las tijeras</span>
      ${
        sinPapel.length > 0
          ? `<p style="margin:0 0 8px;">
        <strong>${contar(sinPapel.length, 'persona se queda', 'personas se quedan')} sin ninguna
        tira</strong> (${esc(sinPapel.map((p) => p.nombre).join(', '))}). Se pasaría la noche
        mirando: no tiene nada que poner encima de la mesa. Casi siempre es gente que se dio de
        alta después de generar la trama, y el reparto es de antes: no las conoce.
      </p>`
          : ''
      }
      ${
        huerfanos.length > 0
          ? `<p style="margin:0 0 8px;">
        <strong>${contar(huerfanos.length, 'telegrama no lo lleva', 'telegramas no los lleva')}
        nadie.</strong> Eso no es un papel de sobra: el cuadro sale único con los telegramas
        completos, y quitando alguno los demás admiten más de un orden. La mesa se puede quedar
        sin poder deducirlo por mucho que hable.
      </p>`
          : ''
      }
      <p style="margin:0;">
        Vuelve al taller, pulsa <strong>generar</strong> y reimprime este documento. Lo que ya
        hubieras recortado no vale, porque el reparto cambia entero.
      </p>
    </div>

`
      : '';

  const contenido = `${portadaEstraza(
    'Solo quien prepara',
    'Las tiras del telégrafo',
    plot.tagline,
    `${contar(totalTiras, 'tira que recortar', 'tiras que recortar')} · ${contar(
      vista.ferroviarios.length,
      'sobre',
      'sobres',
    )} · ${contar(vista.trama.telegramas.length, 'telegrama distinto', 'telegramas distintos')}`,
  )}

    <div class="aviso">
      Si esta noche juegas, no leas las tiras<br />
      Imprime a una cara: a doble cara se leen al trasluz
    </div>

${anomalias}    <div class="caja caja--roja junto">
      <span class="etiqueta">Por qué no puedes leerlas y jugar</span>
      <p style="margin:0 0 8px;">
        Una tira suelta no dice gran cosa. Todas juntas dicen el cuadro entero: están escogidas de
        forma que un solo orden de los seis convoyes las cumpla todas, y ninguna sobra. Quien las
        lee sabe a qué hora cruza cada convoy antes de que empiece la partida, y ya no hay nada
        que rehacer.
      </p>
      <p style="margin:0;">
        Recorta mirando la línea de puntos y no el texto. Si sabes que no vas a poder evitarlo,
        dale este documento a alguien que no se siente a la mesa: son media hora de tijeras y no
        hace falta entender el juego para hacerlo bien.
      </p>
    </div>

    <div class="caja junto">
      <span class="etiqueta">Cómo se preparan</span>
      <ol class="reglas">
        <li><strong>Imprime a una cara.</strong>
          Comprueba que la impresora no está en dúplex. Con tinta por los dos lados, el texto de
          una tira se lee por el reverso de la de al lado y no hay sobre que lo arregle.</li>
        <li><strong>Recorta por fuera de cada recuadro.</strong>
          La línea de trazos que separa dos tiras es por donde se corta. No hace falta precisión:
          lo que importa es que no se quede media tira pegada a la siguiente.</li>
        <li><strong>Una persona cada vez.</strong>
          Termina un montón, cuéntalo con el dedo contra el número del encabezado y apártalo antes
          de empezar el siguiente. Dos montones a medias en la misma mesa se mezclan solos.</li>
        <li><strong>Rotula el sobre con el nombre y mete el montón dentro.</strong>
          Cada tira lleva impreso a quién va dirigida, así que si se te cae un montón se recompone
          leyendo la cabecera, sin tener que leer ningún texto.</li>
        <li><strong>Cierra los sobres y repásalos</strong>
          con la hoja de control de la última página. Ahí está el recuento de cada cual.</li>
      </ol>
    </div>

    <div class="caja caja--violeta junto">
      <span class="etiqueta">Dos montones con el mismo texto no es un error</span>
      <p style="margin:0;">
        Serían <strong>copias de servicio</strong>: en una estación el mismo parte se tiraba por
        duplicado y se repartía a dos puestos, y aquí valen igual: las dos personas lo leen y las
        dos lo defienden. Si te pasa, mete el texto en los dos sobres. Lo que sí sería un error es
        quitarlo de uno para no repetir.${
          compartidos.length > 0
            ? ` Esta noche ${contar(compartidos.length, 'va repetido', 'van repetidos')}, y los
        tienes listados en la hoja de control.`
            : ` Esta noche no se repite ninguno: si ves dos textos iguales, has recortado dos
        veces la misma tira y a alguien le va a faltar la suya.`
        }
      </p>
    </div>

${ORNAMENTO}

${bloques}

    <div class="pagina"></div>
    <h2>Hoja de control</h2>
    <p style="font-size:11pt; color:#5b4b31;">
      Esta hoja no va en ningún sobre: se queda contigo. Cuenta cada montón antes de cerrarlo y
      marca las dos casillas. Si un número no cuadra, la tira que falta está en el suelo o pegada
      a la de al lado: búscala antes de seguir, porque una tira de menos no se nota en la mesa
      hasta que el turno lleva media hora atascado sin saber por qué no le sale el cuadro.
    </p>

    <table>
      <thead>
        <tr>
          <th>Persona</th>
          <th>Oficio</th>
          <th style="text-align:center;">Tiras</th>
          <th style="text-align:center;">Recortadas</th>
          <th style="text-align:center;">En el sobre</th>
        </tr>
      </thead>
      <tbody>
${filas}
      </tbody>
    </table>

    <div class="caja junto">
      <span class="etiqueta">El recuento de la noche</span>
      <p style="margin:0;">
        ${contar(totalTiras, 'tira en total', 'tiras en total')}, repartidas en
        ${contar(vista.ferroviarios.length, 'sobre', 'sobres')}, salidas de
        ${contar(vista.trama.telegramas.length, 'telegrama distinto', 'telegramas distintos')}.
      </p>
    </div>
${
  listaCopias
    ? `
    <div class="caja caja--violeta junto">
      <span class="etiqueta">Las copias de servicio de esta noche</span>
      <ul style="margin:0; padding-left:18px;">
${listaCopias}
      </ul>
    </div>
`
    : ''
}
    <div class="caja junto">
      <span class="etiqueta">Si al final falta una y no aparece</span>
      <p style="margin:0;">
        No es una catástrofe: los telegramas de cada cual salen también impresos en su dosier, así
        que se puede seguir. La tira es lo que se lee en voz alta y se pasa por la mesa; el dosier
        es el respaldo. Por lo mismo, un montón metido en el sobre equivocado se descubre solo en
        cuanto esa persona abra el suyo y compare.
      </p>
    </div>

    <div class="caja caja--roja junto">
      <span class="etiqueta">Antes de guardar las tijeras</span>
      <p style="margin:0;">
        Los sobres, cerrados y con el nombre a la vista. Este documento y los recortes sobrantes,
        fuera de la mesa: cualquiera que los recoja del suelo y los ordene tiene el cuadro de
        marchas de esta noche en la mano.
      </p>
    </div>

${ORNAMENTO}`;

  return envolverEstraza(`${plot.title} — Las tiras del telégrafo`, contenido, opciones);
}
