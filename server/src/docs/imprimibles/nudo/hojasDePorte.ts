/**
 * Las hojas de porte: una por convoy, boca arriba en el centro de la mesa.
 *
 * Es el único imprimible de este juego que se lee A LA VEZ que se discute. Se
 * deja en el centro desde el minuto uno y no se recoge en toda la noche: mientras
 * seis personas gritan nombres de trenes en una casa a oscuras, estas seis hojas
 * son lo que evita que la conversación se atasque en «el del carbón, no, el otro
 * del carbón». Un convoy que nadie sabe identificar no se puede colocar en
 * ninguna franja, y entonces el rompecabezas no falla: se queda quieto.
 *
 * Por eso lleva el nombre en grande y lo demás pequeño. A las dos de la mañana,
 * con la luz de una lámpara de pie, lo que hay que poder leer desde el otro lado
 * de la mesa es CUÁL ES ESTE.
 *
 * ═══ AQUÍ NO SE TOCA `vista.franjas`, Y ESO ES UNA REGLA ═══
 *
 * `vista.franjas` trae las seis horas de la noche, que son públicas y no revelan
 * nada. Trae también `convoyId` y `convoyNombre`, que son el cuadro verdadero
 * entero. Componer una hoja PÚBLICA a partir de ese array deja la solución a un
 * descuido de distancia: basta con que alguien añada un rótulo de depuración o
 * cambie un `.hora` por un `.convoyNombre` para que el orden salga impreso en el
 * papel que está encima de la mesa.
 *
 * Así que las horas se importan de `HORAS_DE_FRANJA`, que es una constante y no
 * sabe nada de esta partida. Cuesta un import de más y no hay forma de
 * equivocarse.
 *
 * Por lo mismo, las fichas van en el ORDEN DE ALTA —el de `vista.convoyes`, que
 * es el orden en que quien preparó la partida los escribió— y no se ordenan por
 * nada. Cualquier criterio de orden que dependa de la trama es una pista.
 *
 * ═══ EL NÚMERO DE TREN, Y POR QUÉ NO ES CORRELATIVO ═══
 *
 * Un impreso de porte sin número de tren no parece un impreso. Pero un número
 * inventado es material peligroso: si las seis hojas llevan 1.201, 1.202, 1.203…
 * la mesa lo lee como un orden y se pasa media hora deduciendo del membrete en
 * vez de los telegramas. Se han visto cosas peores por menos.
 *
 * De ahí las dos decisiones: los números salen de una TABLA FIJA y están muy
 * separados entre sí —como lo estaban de verdad, que se asignaban por línea y no
 * por noche—, y la hoja lo dice con todas las letras en el punto 1 del recuadro.
 *
 * La tabla es fija y no calculada porque el maestro de oro compara la salida byte
 * a byte: ni `Math.random` ni `Date` ni nada que dependa de cuándo se imprime. El
 * cálculo de reserva para índices más allá del sexto es defensivo —la categoría
 * exige exactamente seis convoyes— y arranca lejos de la tabla para que un
 * séptimo convoy imposible no naciera con un número parecido al de otro.
 */
import { esc } from '../../html';
import { envolverEstraza, portadaEstraza, sinTrama, ORNAMENTO } from './comun';
import { vistaDelNudo } from './datos';
import { HORAS_DE_FRANJA } from '../../../../../shared/juegos/nudo-tipos';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../../shared/types';

/** Los seis números de la noche. Separados a propósito: ver la cabecera. */
const NUMEROS_DE_TREN = [1203, 1418, 1627, 1834, 2041, 2256] as const;

/** «1.203». Con el punto de millar, que es como se rotulaba un impreso. */
function numeroDeTren(indice: number): string {
  const numero = NUMEROS_DE_TREN[indice] ?? 2400 + indice * 37;
  return `${Math.floor(numero / 1000)}.${String(numero % 1000).padStart(3, '0')}`;
}

export function hojasDePorte(
  game: GameSession,
  plot: Plot,
  opciones: DocumentRenderOptions,
): string {
  const vista = vistaDelNudo(game, plot);
  if (!vista.hay || !vista.trama) return sinTrama('Las hojas de porte', opciones);

  const fichas = vista.convoyes
    .map((convoy, indice) => {
      /*
       * Las seis casillas del pie. Son la memoria PÚBLICA de la mesa: lo que se
       * tacha aquí es lo que el turno entero da por descartado, y por eso está
       * en la hoja común y no en la cuadrícula de cada cual. Quien quiera
       * apostar, que apueste en la suya.
       */
      const casillas = HORAS_DE_FRANJA.map(
        (hora) =>
          `          <span style="white-space:nowrap;"><span class="casilla"></span>&nbsp;${esc(hora)}</span>`,
      ).join('\n');

      const marca = convoy.esCorreo
        ? `      <p style="margin:0 0 8px;">
        <span class="sello">Prioridad absoluta</span>
      </p>
      <p style="margin:0 0 8px;">
        <strong>Este es el Correo de Medianoche.</strong> Lleva el suero para el valle, donde hay
        niños esperándolo. Si el Correo no cruza antes del amanecer la noche está perdida, salgan
        los otros cinco o no salga ninguno. Cuál es no es ningún misterio: lo sabe todo el mundo
        desde el principio. Lo que no se sabe es a qué hora le toca.
      </p>\n`
        : '';

      return `    <div class="caja ${convoy.esCorreo ? 'caja--roja ' : ''}junto">
      <div class="etiqueta" style="display:flex; justify-content:space-between; gap:14px; margin-bottom:4px;">
        <span>Hoja de porte · Estación de Valdehierro · 14 de enero de 1927</span>
        <span>Tren n.º ${numeroDeTren(indice)}</span>
      </div>

      <h2 style="margin:0 0 7px; padding:0; border:0; font-size:17pt;">${esc(convoy.nombre)}</h2>

      <p style="margin:0 0 7px;">
        <span class="etiqueta" style="display:inline; margin:0;">Lleva</span>
        <span class="copia" style="font-size:12pt;">${
          convoy.carga ? esc(convoy.carga) : 'No consta en la hoja'
        }</span>
      </p>
${convoy.descripcion ? `      <p style="margin:0 0 8px;">${esc(convoy.descripcion)}</p>\n` : ''}${marca}
      <div style="border-top:1px solid #c3b190; margin:9px 0 7px;"></div>

      <span class="etiqueta">Franjas descartadas para este convoy</span>
      <div style="font-family:'Courier Prime', monospace; font-size:9.5pt; color:#5b4b31; display:flex; flex-wrap:wrap; gap:5px 16px;">
${casillas}
      </div>

      <div class="campo" style="margin:9px 0 0;"><span>Salió en la franja de las</span><span></span></div>
    </div>`;
    })
    .join('\n\n');

  const contenido = `${portadaEstraza(
    'Público',
    'Las hojas de porte',
    plot.tagline,
    `${vista.convoyes.length} convoyes · Boca arriba en el centro de la mesa`,
  )}

    <div class="aviso">
      Estas hojas se leen a la vista de todos · No se guardan en ningún sobre
    </div>

    <div class="caja caja--violeta junto">
      <span class="etiqueta">Qué son y qué no son</span>
      <p style="margin:0 0 8px;">
        Es lo que la Compañía extiende por cada convoy que entra en el nudo: cómo se llama, qué
        número lleva y qué transporta. Las seis están encima de la mesa desde el primer minuto y
        cualquiera las coge, las lee en voz alta y las pasa. No hay una copia mejor que otra.
      </p>
      <p style="margin:0;">
        <strong>Ninguna dice a qué hora sale su convoy.</strong> Eso estaba en el cuadro de marchas
        y el cuadro de marchas ardió. Rehacerlo es el juego entero, y lo que hace falta para
        rehacerlo no está aquí: está repartido en las tiras de telegrama que cada cual lleva en su
        sobre. En estas hojas no hay nada escondido, así que no gastéis la noche buscándolo.
      </p>
    </div>

    <div class="caja junto">
      <span class="etiqueta">Antes de que alguien lo pregunte</span>
      <ol class="reglas" style="margin:0;">
        <li><strong>El número de tren no es el orden de salida.</strong>
          Se lo pone la Compañía por línea y por servicio, no por la noche que viene: no son
          correlativos, no van de menor a mayor y no significan nada esta madrugada.</li>
        <li><strong>Las hojas están en el orden en que se dieron de alta.</strong>
          Ese orden lo decidió quien montó la partida y no se parece al del cuadro. Barajadlas si
          os molesta: no se pierde nada.</li>
        <li><strong>La carga no coloca a nadie en ninguna franja.</strong>
          Dos convoyes pueden llevar lo mismo y no es una errata. La carga sirve para hablar de
          ellos, no para deducir. La única que decide algo es la del Correo, y decide si la noche
          vale o no vale, no cuándo sale.</li>
        <li><strong>Al pie de cada hoja hay seis casillas, una por franja.</strong>
          Tachad ahí lo que la mesa entera dé por imposible, con un telegrama que lo respalde. Es
          la cuenta común: para las corazonadas está vuestra cuadrícula, que es vuestra.</li>
        <li><strong>Cuando un convoy salga de verdad, escribid su hora.</strong>
          En cuanto la app dé paso a una orden, apuntad la franja en el renglón de abajo y dejad
          esa hoja aparte. Media noche se pierde discutiendo cosas ya cerradas.</li>
      </ol>
    </div>

${ORNAMENTO}

${fichas}`;

  return envolverEstraza(`${plot.title} — Las hojas de porte`, contenido, opciones);
}
