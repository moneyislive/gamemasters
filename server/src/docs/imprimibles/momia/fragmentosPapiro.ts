/**
 * Los fragmentos de papiro: las cartas del puzle, para recortar.
 *
 * ES EL DOCUMENTO MÁS DELICADO DEL PAQUETE. No porque sea difícil de maquetar,
 * sino porque es el único en el que un fallo de impresión se lleva por delante
 * la velada entera y no se nota hasta que es tarde.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EL TRASLUZ: TRES DEFENSAS, PORQUE UNA NO BASTA
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Si desde el dorso de una carta se lee lo que dice, se acabó el juego: quien
 * la reparte ve el reparto entero y quien la recibe ve la de al lado. El papel
 * de casa es fino y una impresora dúplex es el estado por defecto de media
 * Europa. Así que:
 *
 *  1. SE IMPRIME A UNA CARA. El catálogo lo declara (`sides: 'una'`) y el
 *     documento lo repite en grande en su primera página. Sin tinta en el
 *     reverso no hay nada que leer al trasluz.
 *  2. CADA CARTA SE DOBLA POR LA MITAD. La tira lleva arriba la cara —de qué
 *     cámara salió y en qué vigilia— y abajo el texto, con la línea de doblez
 *     marcada. Doblada, el texto queda DENTRO y el papel es de doble grosor:
 *     aunque alguien la ponga contra una lámpara, no se lee.
 *  3. EL FONDO DE LA TIRA ES OPACO Y CON VETA. Un fondo tramado convierte lo
 *     poco que pudiera transparentarse en ruido en vez de en letras. Es lo
 *     único que sigue funcionando si alguien imprime esto a doble cara pese al
 *     aviso.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LAS FALSAS VAN APARTE, Y SE DICE POR QUÉ
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Las candidatas falsas NO se reparten por las cámaras: se las guarda quien
 * dirige y se le dan al saqueador cuando invoca su don. Van en su propia página,
 * después de un salto, con su aviso. Recortarlas junto a las verdaderas y
 * mezclarlas sería repartir mentiras al azar, y entonces la tumba no se podría
 * sellar hiciera lo que hiciera nadie.
 *
 * Nótese que aquí —y solo aquí, en un documento que es de quien prepara— sí se
 * dice cuáles son falsas. En la app y en la proyección al móvil, jamás.
 */
import { esc } from '../../html';
import { envolverPapiro, portadaPapiro, sinTrama } from './comun';
import { vistaDeLaMomia } from './datos';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../../shared/types';

/**
 * Una tira: cara arriba, doblez, texto abajo.
 *
 * EL APUNTE VA EN EL DORSO, Y ESO ES LO QUE IGUALA LAS DOS CARAS.
 *
 * Estaba impreso en la cara, que es la mitad que queda a la vista al doblar, y
 * era una cuarta línea —el id del fragmento y «déjalo en esa habitación»— que
 * las falsificaciones no llevan. O sea que las dos clases de tira se
 * distinguían de un vistazo desde el otro lado de la mesa, sin leer nada: la
 * que tenía cuatro líneas era verdadera. La única jugada del traidor se caía
 * con solo mirarla, que es justo lo que la cabecera de este fichero promete
 * que no pasa.
 *
 * Ahora la cara lleva las mismas tres piezas en las dos —procedencia, vigilia
 * y ornamento— y la instrucción de reparto viaja al dorso, que solo lee quien
 * ya tiene la tira en la mano.
 */
function tira(donde: string, cuando: string, apunte: string, texto: string): string {
  return `      <div class="tira">
        <div class="cara">
          <span class="etiqueta" style="margin:0;">${esc(donde)}</span>
          <p style="margin:0.5mm 0 0; font-family:'Marcellus SC',Georgia,serif; font-size:10pt; color:#1f3f6b;">${esc(cuando)}</p>
          <div class="ornamento" style="margin:1.5mm 0 0; font-size:10pt; letter-spacing:0.35em;"><span class="glifo">𓂀</span></div>
        </div>
        <div class="doblez">— — — dobla por aquí — — —</div>
        <div class="dorso">
          <p class="maquina" style="margin:0 0 1.5mm; font-size:7.5pt; color:#8a6b3a;">${esc(apunte)}</p>
          <p>${esc(texto)}</p>
        </div>
      </div>`;
}

export function fragmentosPapiro(
  game: GameSession,
  plot: Plot,
  opciones: DocumentRenderOptions,
): string {
  const vista = vistaDeLaMomia(game, plot);
  if (!vista.hay || !vista.trama) return sinTrama('Fragmentos de papiro', opciones);

  /*
   * Agrupados por vigilia y no por cámara. Es el orden en que se usan: quien
   * prepara mete en un sobre los de la vigilia 1, en otro los de la 2, y esa
   * noche no tiene que buscar nada. Ordenar por cámara habría quedado más
   * bonito en la hoja y obligado a rebuscar en la mesa.
   */
  const porVigilia = new Map<number, typeof vista.hallazgos>();
  for (const h of vista.hallazgos) {
    porVigilia.set(h.ronda, [...(porVigilia.get(h.ronda) ?? []), h]);
  }

  const bloques = [...porVigilia.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ronda, hallazgos]) => {
      const tiras = hallazgos
        .map((h) =>
          tira(
            h.camara?.name ?? 'Cámara sin nombre',
            `Vigilia ${ronda}`,
            `${h.fragmento.id} — déjalo en esa habitación antes de que empiece la vigilia`,
            h.fragmento.texto,
          ),
        )
        .join('\n');
      /*
       * LA CÁMARA PROFANADA VA AQUÍ, y este es su único sitio cuando se dirige a
       * ciegas. Antes solo salía en la Guía de la expedición, que es de quien
       * dirige: eso le daba de antemano la lista entera de cámaras marcadas de
       * toda la noche, o sea qué habitaciones evitar para amanecer sin una sola
       * marca. Con el Game Master jugando, es el trofeo «Incorrupto» de regalo.
       */
      const profanada = vista.profanadas[ronda - 1];
      return `    <h2>Vigilia ${ronda} <span style="font-family:'EB Garamond',serif; text-transform:none; letter-spacing:0; font-size:11pt; color:#7a5c34;">· ${hallazgos.length} ${hallazgos.length === 1 ? 'tira' : 'tiras'}</span></h2>
      <p class="maquina" style="margin:0 0 3mm; color:#7a5c34;">Cámara profanada esta vigilia: <strong>${esc(profanada?.name ?? 'ninguna')}</strong> — díselo a quien dirige antes de abrirla.</p>
    <div class="rejilla">
${tiras}
    </div>`;
    })
    .join('\n\n');

  /*
   * LA CARA DE UNA FALSA TIENE QUE SER LA DE UNA VERDADERA, y no es un detalle
   * de maquetacion: es la mecanica entera del traidor.
   *
   * Estaba compuesta con la misma funcion que las ciertas pero pasandole «No se
   * reparte», «Falsificacion N» y «se la das al saqueador cuando la pida». Los
   * tres textos van en la CARA, que es la mitad que queda a la vista al doblar
   * —lo dice la cabecera de este fichero—, asi que en cuanto el saqueador
   * dejaba la tira en el centro de la mesa cualquiera leia que era falsa. La
   * unica jugada del traidor se delataba sola al hacerla.
   *
   * Ahora la cara lleva el mismo diseno que las demas con la procedencia en
   * blanco, para escribirla a lapiz al ponerla, y todo lo que la identifica se
   * va al DORSO: el lado que queda dentro al doblar, que solo lee quien la
   * tiene en la mano — justamente quien ya sabe que es mentira.
   */
  const falsas = vista.trama.falsasCandidatas
    .map(
      (f, i) => `      <div class="tira">
        <div class="cara">
          <span class="etiqueta" style="margin:0; border-bottom:0.3mm dotted #8a6b3a; display:block; min-width:34mm;">&nbsp;</span>
          <p style="margin:0.5mm 0 0; font-family:'Marcellus SC',Georgia,serif; font-size:10pt; color:#1f3f6b; border-bottom:0.3mm dotted #8a6b3a; min-height:5mm;">&nbsp;</p>
          <div class="ornamento" style="margin:1.5mm 0 0; font-size:10pt; letter-spacing:0.35em;"><span class="glifo">𓂀</span></div>
        </div>
        <div class="doblez">— — — dobla por aqui — — —</div>
        <div class="dorso">
          <p class="maquina" style="margin:0 0 1.5mm; font-size:7.5pt; color:#8a6b3a;">Falsificacion ${i + 1} · ${esc(f.id)} — escribe arriba una camara y una vigilia antes de dejarla en la mesa</p>
          <p>${esc(f.texto)}</p>
        </div>
      </div>`,
    )
    .join(String.fromCharCode(10));

  const total = vista.hallazgos.length;

  const contenido = `${portadaPapiro(
    'Solo quien prepara',
    'Fragmentos de papiro',
    plot.tagline,
    `${total} tiras que recortar · ${vista.trama.restricciones.length} fragmentos distintos · ${vista.trama.falsasCandidatas.length} falsificaciones`,
  )}

    <div class="aviso">
      Imprime este documento a UNA SOLA CARA<br />
      A doble cara, los fragmentos se leen al trasluz y se acaba el juego
    </div>

    <div class="caja caja--lapis junto">
      <span class="etiqueta">Cómo se preparan</span>
      <ol style="margin:0;">
        <li>Recorta cada tira por fuera del recuadro.</li>
        <li><strong>Dóblala por la línea de puntos</strong>, con el texto hacia dentro. Queda
          de doble grosor: así no se lee por detrás ni contra una lámpara.</li>
        <li>Agrupa las tiras por vigilia y guarda cada grupo en un sobre rotulado.</li>
        <li>Antes de abrir cada vigilia, deja las tiras de esa vigilia en la habitación que
          dice cada una, dobladas y boca abajo.</li>
      </ol>
    </div>

    <div class="caja junto">
      <span class="etiqueta">Qué pasa en la mesa</span>
      <p style="margin:0;">
        Quien entra en una cámara se lleva UNA tira de las que haya allí. Puede leerla, guardársela,
        contarla a medias o mentir sobre ella. Nadie está obligado a enseñar lo que tiene, y ahí
        está la partida: con los fragmentos de una sola persona no hay manera de sellar la tumba.
      </p>
    </div>

${bloques || '    <p><em>Esta trama no reparte ningún fragmento cierto. Revisa el informe del papiro antes de jugar.</em></p>'}

${
  falsas
    ? `    <div class="pagina"></div>
    <div class="aviso">
      Las páginas que siguen NO se reparten<br />
      Son las falsificaciones del saqueador y las guardas tú
    </div>

    <div class="caja caja--almagre junto">
      <span class="etiqueta">Para qué son</span>
      <p style="margin:0;">
        El saqueador puede fabricar un fragmento falso una vez por vigilia. Cuando invoque su don,
        dale una de estas y déjale ponerla sobre la mesa como si la hubiera encontrado. No la
        comentes, no la mires dos veces y no cambies de tono: si se te nota, has delatado a esa
        persona y con ella el juego entero.
      </p>
      <p style="margin:2mm 0 0;">
        Están escritas con el mismo aire que las verdaderas a propósito. <strong>Contradicen el
        orden correcto</strong>, y la única forma de pillarlas es cruzarlas con otras que sí están
        sobre la mesa.
      </p>
    </div>

    <h2>Falsificaciones</h2>
    <div class="rejilla">
${falsas}
    </div>`
    : ''
}`;

  return envolverPapiro(`${plot.title} — Fragmentos de papiro`, contenido, opciones);
}
