/**
 * El informe del cuadro: la demostración de que esta noche se puede ganar.
 *
 * Es la comprobación previa del generador traducida a una hoja que se lee. No
 * añade nada a la partida y no se lleva a la mesa: se imprime cuando alguien
 * quiere saber si el rompecabezas que le ha tocado está bien armado, y se lee
 * de pie, cinco minutos antes de meter las tiras en los sobres.
 *
 * VA APAGADO POR DEFECTO. No hace falta para jugar; hace falta cuando algo huele
 * mal —una partida que se generó hace semanas, una a la que le tocaron los
 * convoyes después, una que se importó de otra casa—.
 *
 * ═══ POR QUÉ REHACE LAS CUENTAS EN VEZ DE ENSEÑAR LAS DEL GENERADOR ═══
 *
 * Porque lo que hay que contestar aquí no es «¿estaba bien cuando se generó?»
 * sino «¿está bien AHORA?». `vistaDelNudo` vuelve a contar los cuadros sobre la
 * trama GUARDADA, así que si entre generar e imprimir alguien borró un convoy o
 * añadió a una persona, esta hoja se entera y el informe congelado del generador
 * no se habría enterado. Cuesta unos milisegundos: son 720 cuadros.
 *
 * ═══ POR QUÉ NO ENUMERA EL CUADRO VERDADERO ═══
 *
 * Porque ya hay una hoja que lo hace y porque aquí no hace falta: lo que se
 * demuestra es que el cuadro es único, no cuál es. Ahora bien, y esto no se
 * disimula en ningún sitio de la hoja: DENTRO VA EL TEXTO ENTERO DE LOS
 * TELEGRAMAS, y esos telegramas determinan un solo cuadro. Quien lea esta hoja
 * tiene la solución aunque no venga en una tabla. Por eso el manifiesto la marca
 * `preparer` y no `gm`, y por eso la portada lo dice antes que nada.
 *
 * ═══ LAS CUATRO GARANTÍAS, Y QUÉ SE ROMPE SIN CADA UNA ═══
 *
 *  1. ÚNICO. Con dos cuadros válidos la mesa se parte en dos mitades que tienen
 *     razón las dos, y el enclavamiento rechaza una orden correcta.
 *  2. MÍNIMO. Un telegrama de sobra es una persona cuya tira no cambia nada.
 *  3. REPARTIDO. Si una mano sola determina el cuadro, sobra la conversación.
 *  4. TODO EL MUNDO CON PAPEL. Sin tira no hay nada que aportar.
 *
 * La cuarta no la comprueba el solucionador: la comprueba el reparto. Va aquí
 * porque se rompe igual de fácil —basta con dar de alta a alguien después de
 * generar— y porque quien mira esta hoja está mirando justo eso.
 */
import { esc } from '../../html';
import { envolverEstraza, portadaEstraza, sinTrama, ORNAMENTO } from './comun';
import { vistaDelNudo } from './datos';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../../shared/types';

/** El veredicto de una garantía, en dos palabras y a color. */
function marca(bien: boolean): string {
  return bien
    ? '<strong style="color:#2f6b46;">CORRECTO</strong>'
    : '<strong style="color:#9a2f22;">REVISAR</strong>';
}

/**
 * Cuántos cuadros hay en total, para dar la cifra contra la que se compara.
 *
 * Con seis convoyes son 720. Se calcula en vez de escribirlo porque una partida
 * puede tener otro número de convoyes —el solucionador admite hasta ocho— y un
 * «720» a mano en la hoja sería mentira en cuanto eso pasara.
 */
function cuadrosPosibles(convoyes: number): number {
  let total = 1;
  for (let i = 2; i <= convoyes; i++) total *= i;
  return total;
}

export function informeDelCuadro(
  game: GameSession,
  plot: Plot,
  opciones: DocumentRenderOptions,
): string {
  const vista = vistaDelNudo(game, plot);
  /* `informe` se comprueba aparte de `trama`: es opcional en la vista y sin él
     no hay nada que demostrar, así que la hoja de disculpa es la respuesta. */
  if (!vista.hay || !vista.trama || !vista.informe) {
    return sinTrama('Informe del cuadro', opciones);
  }
  const informe = vista.informe;
  const trama = vista.trama;

  const franjas = vista.franjas.length;
  const total = cuadrosPosibles(vista.convoyes.length);
  const minimoDeCuadros = informe.porPersona.reduce(
    (menor, p) => Math.min(menor, p.cuadros),
    Number.POSITIVE_INFINITY,
  );
  const nadieSolo = informe.porPersona.length > 0 && minimoDeCuadros >= 2;
  const sinPapel = informe.porPersona.filter((p) => p.telegramas === 0);

  /* Quién lleva cada tira. Un telegrama que no lleva nadie no llega a la mesa:
     el paquete de tiras se agrupa por persona, así que ese papel no se imprime
     en ningún sobre y el cuadro deja de ser deducible con lo que hay encima. */
  const portadores = new Map<string, string[]>();
  for (const persona of vista.ferroviarios) {
    for (const tira of persona.telegramas) {
      const lista = portadores.get(tira.id) ?? [];
      lista.push(persona.nombre);
      portadores.set(tira.id, lista);
    }
  }
  const huerfanos = trama.telegramas.filter((t) => !portadores.has(t.id));

  const fallos: string[] = [];
  if (informe.soluciones !== 1) {
    fallos.push(
      informe.soluciones === 0
        ? 'No hay NINGÚN cuadro que cumpla todos los telegramas: dos de ellos se contradicen.'
        : `Hay ${informe.soluciones} cuadros distintos que cumplen todos los telegramas.`,
    );
  } else if (!informe.unico) {
    fallos.push('Sale un solo cuadro, pero no es el que la casa dio por verdadero.');
  }
  if (informe.redundantes.length > 0) {
    fallos.push(
      `Sobran ${informe.redundantes.length} telegramas: quitarlos no cambia la respuesta.`,
    );
  }
  if (!informe.todosConPapel) {
    fallos.push(`Hay ${sinPapel.length} personas del turno sin ninguna tira.`);
  }
  if (!nadieSolo) {
    fallos.push('Alguien puede sacar el cuadro entero con sus propias tiras, sin preguntar.');
  }

  const filasPersona = informe.porPersona
    .map((p) => {
      const bien = p.telegramas >= 1 && p.cuadros >= 2;
      return `          <tr>
            <td>${esc(p.nombre)}</td>
            <td style="width:22mm; text-align:center;">${p.telegramas}</td>
            <td style="width:34mm; text-align:center;">${p.cuadros === total ? `${p.cuadros} (todos)` : p.cuadros}</td>
            <td style="width:26mm;">${marca(bien)}</td>
          </tr>`;
    })
    .join('\n');

  /* El peor caso de adivinar a ciegas: en la primera franja se puede fallar
     hasta cinco veces antes de acertar, en la segunda cuatro, y así. */
  const filasCiego: string[] = [];
  let acumulado = 0;
  let revienta = 0;
  for (const franja of vista.franjas) {
    const candidatos = franjas - franja.numero + 1;
    const rechazos = candidatos - 1;
    acumulado += rechazos * vista.tarifa.ordenRechazada;
    if (revienta === 0 && acumulado >= vista.retrasoMaximo) revienta = franja.numero;
    filasCiego.push(`          <tr>
            <td style="width:26mm;">${franja.numero}.ª · ${esc(franja.hora)}</td>
            <td style="text-align:center;">${candidatos}</td>
            <td style="text-align:center;">${rechazos}</td>
            <td style="text-align:center;">${acumulado}</td>
          </tr>`);
  }
  const peorCaso = acumulado;

  const tiras = trama.telegramas
    .map((t) => {
      const lleva = portadores.get(t.id);
      return `      <div class="tira">
        <div class="cabecera">
          <span>${esc(t.id)}</span>
          <span>${lleva ? esc(lleva.join(' · ')) : 'SIN REPARTIR'}</span>
        </div>
        <div class="texto">${esc(t.texto)}</div>
      </div>`;
    })
    .join('\n');

  const contenido = `${portadaEstraza(
    'Comprobación previa',
    'Informe del cuadro',
    plot.tagline,
    'Solo para quien prepara · lleva dentro el texto de los telegramas',
  )}

    ${
      informe.ok
        ? `<div class="caja caja--violeta junto">
      <span class="etiqueta">Veredicto</span>
      <p style="margin:0;">
        <strong>La noche se puede ganar y no se puede ganar en solitario.</strong> Los telegramas
        determinan un cuadro y solo uno, ninguno sobra, todo el mundo tiene papel y nadie puede
        sacarlo sin hablar con los demás. No hay nada que arreglar: mete las tiras en los sobres.
      </p>
    </div>`
        : `<div class="aviso">Este cuadro no cumple sus garantías · Vuelve a generar la partida</div>

    <div class="caja caja--roja junto">
      <span class="etiqueta">Qué falla</span>
      <ul style="margin:0 0 8px; padding-left:18px;">
${fallos.map((f) => `        <li>${esc(f)}</li>`).join('\n')}
      </ul>
      <p style="margin:0;">
        No lo arregles a mano quitando o añadiendo tiras: el cuadro se comprueba entero o no se
        comprueba. Vuelve al taller y pulsa <strong>generar</strong>. No se pierde nada de lo que
        habías escrito —las personas, los convoyes, los puestos y los cargamentos se quedan— y el
        rompecabezas se rehace con las garantías puestas.
      </p>
    </div>`
    }

    <h2>Las cuatro garantías</h2>

    <table>
      <thead>
        <tr>
          <th>Qué se comprueba, y qué se rompe sin ello</th>
          <th style="width:36mm;">Recuento</th>
          <th style="width:26mm;">Resultado</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>1 · Consistente y único.</strong> De los ${total} cuadros que se pueden formar
            con ${vista.convoyes.length} convoyes, ¿cuántos cumplen los ${trama.telegramas.length}
            telegramas? Tiene que ser uno, y tiene que ser el que la casa guardó. Con dos cuadros
            válidos, media mesa defendería uno y la otra media el otro, los dos correctos, y el
            enclavamiento rechazaría uno de ellos sin poder explicar por qué.
          </td>
          <td>${informe.soluciones} de ${total}${informe.soluciones === 1 ? `<br /><span class="copia" style="font-size:9pt;">${informe.unico ? 'y coincide' : 'NO coincide'}</span>` : ''}</td>
          <td>${marca(informe.soluciones === 1 && informe.unico)}</td>
        </tr>
        <tr>
          <td>
            <strong>2 · Mínimo.</strong> Quitar cualquier telegrama tiene que hacer aparecer más de
            un cuadro. Que ninguno sobre significa que <strong>todo el papel que hay en la mesa
            importa</strong>: si sobrara uno, alguien leería su tira en voz alta, la mesa asentiría
            y no cambiaría nada. Eso es lo peor que le puede pasar a nadie en un juego que se gana
            en grupo.
          </td>
          <td>${informe.redundantes.length} de sobra</td>
          <td>${marca(informe.redundantes.length === 0)}</td>
        </tr>
        <tr>
          <td>
            <strong>3 · Repartido.</strong> Con las tiras de una sola persona tienen que quedar dos
            cuadros o más. La mano que más acota de toda la mesa deja
            ${Number.isFinite(minimoDeCuadros) ? minimoDeCuadros : '—'} cuadros en pie, así que
            <strong>nadie puede resolverlo solo</strong>. Si a alguien le quedara uno, la partida
            sería esa persona dictando y el resto tachando.
          </td>
          <td>${Number.isFinite(minimoDeCuadros) ? minimoDeCuadros : '—'} en la mejor mano</td>
          <td>${marca(nadieSolo)}</td>
        </tr>
        <tr>
          <td>
            <strong>4 · Todo el mundo con papel.</strong> Quien llega sin ninguna tira no tiene nada
            que aportar a la reconstrucción y se pasa la noche mirando. Se rompe con facilidad: basta
            con dar de alta a alguien después de haber generado.
          </td>
          <td>${sinPapel.length} sin tiras</td>
          <td>${marca(informe.todosConPapel)}</td>
        </tr>
      </tbody>
    </table>

    ${
      informe.redundantes.length > 0
        ? `<div class="caja caja--roja junto">
      <span class="etiqueta">Telegramas que sobran</span>
      <ul style="margin:0; padding-left:18px;">
${informe.redundantes.map((t) => `        <li>${esc(t.texto)}</li>`).join('\n')}
      </ul>
    </div>`
        : ''
    }

    ${
      huerfanos.length > 0
        ? `<div class="caja caja--roja junto">
      <span class="etiqueta">Tiras que no lleva nadie</span>
      <p style="margin:0;">
        ${huerfanos.length} telegramas no están en la mano de ninguna persona del turno. Las tiras se
        imprimen agrupadas por persona, así que ese papel no entra en ningún sobre y no llega a la
        mesa: el cuadro deja de poder deducirse con lo que hay encima. Genera otra vez.
      </p>
    </div>`
        : ''
    }

    <h2>Qué tiene cada cual en la mano</h2>

    <p style="font-size:11pt; color:#5b4b31;">
      La tercera columna es lo que de verdad importa: <strong>cuántos cuadros siguen siendo posibles
      con las tiras de esa persona y nada más</strong>. Cuanto más alto, menos puede hacer en
      solitario y más tiene que hablar. Un ${total} redondo significa que esa persona no lleva
      ninguna tira. Un 1 significa que puede terminar la noche sin abrir la boca.
    </p>

    <table>
      <thead>
        <tr>
          <th>Del turno</th>
          <th style="text-align:center;">Tiras</th>
          <th style="text-align:center;">Cuadros que le quedan</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
${filasPersona}
      </tbody>
    </table>

${ORNAMENTO}

    <h2>Lo que cuesta adivinar en vez de deducir</h2>

    <p style="font-size:11pt; color:#5b4b31;">
      Esta es la cuenta que justifica el juego entero. Una mesa que no dedujera nada y fuera cursando
      órdenes a ver cuál entra falla, en el peor de los casos, hasta que solo le queda el bueno: en la
      primera franja hay ${franjas} convoyes candidatos y se puede fallar ${franjas - 1} veces, en la
      segunda ${franjas - 1} candidatos y ${Math.max(0, franjas - 2)} fallos, y así hasta la última,
      donde ya no hay elección.
    </p>

    <table>
      <thead>
        <tr>
          <th>Franja</th>
          <th style="text-align:center;">Convoyes que aún podrían ir</th>
          <th style="text-align:center;">Órdenes rechazadas</th>
          <th style="text-align:center;">Retraso acumulado</th>
        </tr>
      </thead>
      <tbody>
${filasCiego.join('\n')}
      </tbody>
    </table>

    <div class="caja caja--violeta junto">
      <span class="etiqueta">El margen que compra la deducción</span>
      <p style="margin:0 0 8px;">
        Adivinar del todo cuesta hasta <strong>${peorCaso} órdenes rechazadas</strong>, o sea
        <strong>${peorCaso} minutos de retraso</strong> a
        ${vista.tarifa.ordenRechazada} por orden, sobre un tope de
        <strong>${vista.retrasoMaximo}</strong>. Con suerte media —fallar la mitad de las veces— salen
        unos ${Math.round(peorCaso / 2)}, que es rozar el tope.
        ${
          revienta > 0
            ? `Con mala suerte el puerto se cierra en la <strong>${revienta}.ª franja</strong>, con el Correo dentro y tres o cuatro convoyes todavía en la estación.`
            : 'Aun así la noche aguanta, pero se termina sin un solo minuto de margen para un error.'
        }
      </p>
      <p style="margin:0;">
        Una mesa que lea sus tiras y las cruce cierra la noche en cero o en uno. Entre las dos
        formas de jugar hay ${vista.retrasoMaximo} minutos de diferencia: eso es exactamente lo que
        vale deducir, y por eso el tope está donde está y no más alto.
      </p>
    </div>

    <div class="pagina">
      <h2>El texto de los ${trama.telegramas.length} telegramas</h2>

      <div class="caja caja--roja junto">
        <span class="etiqueta">Antes de seguir leyendo</span>
        <p style="margin:0;">
          Estas ${trama.telegramas.length} tiras determinan un cuadro y solo uno. El cuadro no viene
          enumerado en esta hoja, pero <strong>quien lea esto de arriba abajo tiene la respuesta</strong>.
          Si vas a dirigir sin conocer la solución, para aquí y dale la hoja a otra persona.
        </p>
      </div>

      <p style="font-size:11pt; color:#5b4b31;">
        A la derecha de cada tira, quién la lleva en su sobre. Sirve para dos cosas: comprobar que
        los sobres se han montado bien, y saber a quién preguntar durante la noche si una tira se
        pierde debajo de una silla.
      </p>

${tiras}
    </div>`;

  return envolverEstraza(`${plot.title} — Informe del cuadro`, contenido, opciones);
}
