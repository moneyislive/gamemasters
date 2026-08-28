/**
 * La guía de la expedición: el documento que quien dirige lleva toda la noche.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LO QUE ESTA GUÍA NO LLEVA, Y ES SU DECISIÓN DE DISEÑO
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * No lleva el orden verdadero de los ritos ni el nombre de quien rompió el
 * sello. Eso vive en «El papiro del sellado», que es una hoja aparte, de una
 * sola cara, para tener boca abajo y no volver a mirar hasta el final.
 *
 * No es purismo: es que ESTA hoja se maneja toda la noche, se pasa páginas
 * delante de la mesa, se deja abierta mientras se sirve algo de beber y alguien
 * se asoma por encima del hombro. Un documento que se consulta doce veces no
 * puede ser el mismo que guarda la solución. Y como efecto secundario, sirve
 * igual cuando quien dirige juega a ciegas.
 *
 * Hay una comprobación que lo verifica sobre el HTML realmente generado: si
 * alguien mete aquí el orden «para tenerlo a mano», se pone roja.
 */
import { esc } from '../../html';
import { manifiestoDe } from '../../../../../shared/juegos';
import type { VistaGm } from '../../contexto';
import { envolverPapiro, portadaPapiro, sinTrama, ORNAMENTO } from './comun';
import { vistaDeLaMomia } from './datos';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../../shared/types';

export function guiaExpedicion(
  game: GameSession,
  plot: Plot,
  vistaDelGm: VistaGm,
  opciones: DocumentRenderOptions,
): string {
  const vista = vistaDeLaMomia(game, plot);
  if (!vista.hay || !vista.trama) return sinTrama('Guía de la expedición', opciones);

  /*
   * Con el Game Master a ciegas, quien lee esta guía TAMBIÉN JUEGA y no tiene el
   * papiro del sellado: lo guarda quien preparó el material. Decirle «saca ahora
   * el papiro» sería mandarle a por una hoja que no existe en sus manos, en el
   * peor momento de la noche.
   */
  const aCiegas = vistaDelGm.hayPreparador;

  const reglas = manifiestoDe(game.settings?.juego).reglas ?? [];
  const material = plot.material;
  const apertura = material?.narrations.find((n) => n.round === 0);

  // ---- Las vigilias, una a una ----
  const vigilias = vista.profanadas
    .map((camara, i) => {
      const ronda = i + 1;
      const narracion = material?.narrations.find((n) => n.round === ronda);
      const deEstaVigilia = vista.hallazgos.filter((h) => h.ronda === ronda);
      const dondeVan = deEstaVigilia
        .map((h) => `<li><strong>${esc(h.camara?.name ?? 'sin cámara')}</strong> — tira <span class="maquina">${esc(h.fragmento.id)}</span></li>`)
        .join('\n');

      return `    <section class="${ronda === 1 ? '' : 'pagina'}">
      <h2>Vigilia ${ronda}</h2>

      ${
        aCiegas
          ? `<div class="caja caja--almagre junto">
        <span class="etiqueta">Pregúntalo antes de abrir</span>
        <p style="margin:0; font-size:14pt;">
          Quien prepara te dirá <strong>qué cámara está profanada esta noche</strong>. También
          sale en tu panel en cuanto abras la vigilia.
        </p>
        <p style="margin:2mm 0 0; font-size:11pt;">
          Anúncialo en voz alta: quien entre ahí sale con un fragmento <em>y con una marca</em>.
        </p>
      </div>`
          : `<div class="caja caja--almagre junto">
        <span class="etiqueta">Anúncialo en voz alta al abrir</span>
        <p style="margin:0; font-size:14pt;">
          Esta noche está profanada <strong>${esc(camara?.name ?? 'una cámara sin nombre')}</strong>.
        </p>
        <p style="margin:2mm 0 0; font-size:11pt;">
          Quien entre ahí sale con un fragmento <em>y con una marca</em>. Dilo antes de que nadie elija.
        </p>
      </div>`
      }

      ${
        narracion
          ? `<div class="caja junto">
        <span class="etiqueta">Léelo tal cual</span>
        <h3 style="margin:0 0 2mm;">${esc(narracion.title)}</h3>
        <p style="margin:0; font-size:13pt; line-height:1.6;">${esc(narracion.text)}</p>
        ${narracion.stageDirection ? `<p class="maquina almagre" style="margin:3mm 0 0;">${esc(narracion.stageDirection)}</p>` : ''}
      </div>`
          : `<div class="caja junto" style="border-style:dashed;">
        <p style="margin:0;"><em>Esta vigilia no tiene narración escrita. Abre con lo que se te ocurra y anuncia la cámara profanada.</em></p>
      </div>`
      }

      ${
        aCiegas
          ? `<div class="caja junto">
        <span class="etiqueta">De esto se encarga quien prepara</span>
        <p style="margin:0;">Las tiras de esta vigilia ya estarán puestas cuando entres. Ni las colocas tú ni sabes cuáles son.</p>
      </div>`
          : `<div class="caja junto">
        <span class="etiqueta">Deja estas tiras antes de empezar</span>
        ${dondeVan ? `<ul style="margin:0;">\n${dondeVan}\n        </ul>` : '<p style="margin:0;"><em>Esta vigilia no reparte fragmentos.</em></p>'}
      </div>`
      }

      <div class="caja junto">
        <span class="etiqueta">Y entonces, por este orden</span>
        <ol style="margin:0;">
          <li><strong>Explorar.</strong> Cada persona dice a qué cámara entra y va a esa habitación. No se puede rectificar.</li>
          <li><strong>Repartir.</strong> Quien entró se lleva una tira de las que hubiera allí. Si la cámara era la profanada, apúntale una marca.</li>
          <li><strong>Invocar.</strong> Quien quiera usa su don. Uno por persona y por vigilia; se dice en voz alta que se usa, aunque no qué se ha visto.</li>
          <li><strong>Ofrendar.</strong> Se pueden dar amuletos. Un amuleto quita una marca <em>a otra persona</em>, nunca a uno mismo.</li>
          <li><strong>Cerrar.</strong> Todos a la mesa. Que hable quien quiera. A las tres marcas, esa persona queda <strong>tocada</strong>: sigue jugando y sigue señalando, pero su propuesta ya no cuenta en la votación.</li>
        </ol>
      </div>
    </section>`;
    })
    .join('\n\n');

  // ---- Dones y arbitraje ----
  const tablaDones = vista.expedicionarios
    .map((persona) => {
      const don = vista.donDe(persona.id);
      const personaje = plot.characters.find((c) => c.suspectId === persona.id);
      return `        <tr>
          <td><strong>${esc(persona.name)}</strong><br /><span style="font-size:10pt; color:#7a5c34;">${esc(personaje?.characterName ?? '')}</span></td>
          <td>${esc(don?.rol ?? '—')}<br /><span style="font-size:10pt; color:#7a5c34;">${esc(don?.nombre ?? '')}</span></td>
          <td style="font-size:10.5pt;">${esc(don?.arbitraje ?? 'Sin don asignado.')}</td>
        </tr>`;
    })
    .join('\n');

  const ayudas = (material?.hints ?? [])
    .map(
      (h) => `      <div class="caja junto">
        <span class="etiqueta">Ayuda de nivel ${h.level}${h.level === 3 ? ' — solo si van muy perdidos' : ''}</span>
        <p style="margin:0;">${esc(h.text)}</p>
      </div>`,
    )
    .join('\n');

  const guion = (plot.gmScript ?? []).map((paso) => `        <li>${esc(paso)}</li>`).join('\n');

  const contenido = `${portadaPapiro(
    'Para quien dirige',
    'Guía de la expedición',
    plot.tagline,
    `${vista.vigilias} vigilias · ${vista.expedicionarios.length} expedicionarios`,
  )}

    <div class="caja caja--lapis junto">
      <span class="etiqueta">Lo primero</span>
      <p style="margin:0;">
        Esta guía <strong>no lleva la solución</strong>: ni el orden de los ritos ni quién rompió el
        sello. ${
          aCiegas
            ? 'En esta partida tú también juegas, así que no la conoces y no vas a conocerla: la guarda quien preparó el material, y es esa persona la que sale al final con «El papiro del sellado». Puedes dirigir la noche entera con esta hoja e investigar en igualdad de condiciones.'
            : 'Eso está en «El papiro del sellado», una hoja aparte que tienes boca abajo y no vuelves a mirar hasta el final. Así puedes llevar esta encima toda la noche sin miedo a que alguien la lea por encima de tu hombro.'
        }
      </p>
    </div>

    <h2>De qué va la noche</h2>
    <p>${esc(plot.synopsis)}</p>
    ${vista.sabor?.faraon.descripcion ? `<p><strong>${esc(vista.sabor.faraon.nombre)}.</strong> ${esc(vista.sabor.faraon.descripcion)}</p>` : ''}
    ${plot.setting ? `<p>${esc(plot.setting)}</p>` : ''}

    ${
      apertura
        ? `<div class="caja caja--almagre junto">
      <span class="etiqueta">Léelo antes de repartir nada</span>
      <h3 style="margin:0 0 2mm;">${esc(apertura.title)}</h3>
      <p style="margin:0; font-size:13pt; line-height:1.6;">${esc(apertura.text)}</p>
      ${apertura.stageDirection ? `<p class="maquina almagre" style="margin:3mm 0 0;">${esc(apertura.stageDirection)}</p>` : ''}
    </div>`
        : ''
    }

    <h2>Antes de que llegue nadie</h2>
    <div class="caja junto">
      <ol style="margin:0;">
        <li>Pega un cartel en la puerta de cada habitación que hace de cámara. Es lo que convierte el pasillo en una tumba.</li>
        <li>Recorta y dobla los fragmentos de papiro. Guárdalos por vigilias, en sobres.</li>
        <li>Mete cada dosier en un sobre con el nombre de su persona. Nadie abre el ajeno.</li>
        <li>Ten a mano la tabla de marcas, dos amuletos por persona (monedas, fichas, garbanzos) y la hoja del sellado sin repartir todavía. Los <strong>nombres</strong> de los cinco ritos ya los llevan todos en su dosier: la hoja es solo para escribir el orden.</li>
        <li>Guárdate el papiro del sellado donde no se vea.</li>
      </ol>
    </div>

    <h2>Las reglas, como se las vas a contar</h2>
${reglas
  .map(
    (r) => `    <p><strong>${esc(r.titulo)}.</strong> ${esc(r.texto)}</p>`,
  )
  .join('\n')}

${ORNAMENTO}

    <div class="pagina"></div>
    <h2>Los dones, y qué haces tú con cada uno</h2>
    <table>
      <thead><tr><th style="width:38mm;">Quién</th><th style="width:38mm;">Su papel</th><th>Qué haces cuando lo invoca</th></tr></thead>
      <tbody>
${tablaDones}
      </tbody>
    </table>
    <div class="caja caja--almagre junto">
      <span class="etiqueta">Uno de ellos tiene un don de más</span>
      <p style="margin:0;">
        Quien rompió el sello puede además <strong>falsificar</strong>: una vez por vigilia te pedirá
        una de las tiras de falsificación y la pondrá sobre la mesa como si la hubiera encontrado.
        Dásela sin comentarios y sin cambiar de cara. Ese don no aparece en la tabla de arriba ni
        en el dosier de nadie: si se supiera quién lo tiene, no habría juego.
      </p>
    </div>

${vigilias}

    <div class="pagina"></div>
    <h2>El sellado</h2>
    <div class="caja caja--lapis junto">
      <ol style="margin:0;">
        <li>Cuando veas que la mesa ya tiene material suficiente —o que la noche se alarga— anuncia que se abre el sellado.</li>
        <li>Reparte la hoja del sellado. Cada persona escribe <strong>su orden de los cinco ritos</strong> y <strong>a quién señala</strong>. En silencio.</li>
        <li>Recoge las hojas. Lee en voz alta los órdenes propuestos, sin nombres. <strong>Las de quien esté tocado no cuentan</strong> para el orden, pero su señalamiento sí.</li>
        <li>El orden <strong>más votado</strong> es el que se ejecuta. Si hay empate, que la mesa lo discuta y vuelva a votar a mano alzada.</li>
        <li>${
          aCiegas
            ? 'Llama ahora a quien preparó el material: sale con el papiro del sellado y ejecuta los ritos, uno a uno, en el orden que salió votado. Tú te sientas: en esta partida también juegas.'
            : 'Saca ahora el papiro del sellado y compáralo. Ejecuta los ritos uno a uno, en el orden que salió, leyendo su invocación y haciendo su gesto.'
        }</li>
        <li>Si el orden era el correcto, la tumba se sella y <strong>gana la expedición entera menos el saqueador</strong>. Si no, gana el saqueador.</li>
        <li>Se revela quién rompió el sello, esa persona lee su confesión —está escrita para que la lea ella— y se cierra con el epílogo.</li>
      </ol>
    </div>

${ayudas ? `    <h2>Si se atascan</h2>\n${ayudas}` : ''}

${
  guion
    ? `    <h2>El guion de la noche</h2>
    <div class="caja junto">
      <ol style="margin:0;">
${guion}
      </ol>
    </div>`
    : ''
}

    <h2>Lo que no puedes hacer</h2>
    <div class="caja caja--almagre junto">
      <ul style="margin:0;">
        <li>No digas si alguien ha acertado al señalar. Nunca, ni con la cara.</li>
        <li>No confirmes ni desmientas un fragmento. Aunque sea falso. Sobre todo si es falso.</li>
        <li>No elimines a nadie. Quien queda tocado pierde voz en la votación, no la silla.</li>
        <li>No dejes esta guía sobre la mesa cuando te levantes.</li>
      </ul>
    </div>`;

  return envolverPapiro(`${plot.title} — Guía de la expedición`, contenido, opciones);
}
