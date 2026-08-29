/**
 * La guía del paso: el documento que se maneja toda la noche.
 *
 * ES EL ÚNICO QUE CAMBIA SEGÚN QUIÉN DIRIJA, y por eso lo recibe la vista `vistaGm`
 * en vez de componerlo a ciegas. Dirigiendo a la manera normal, quien lleva la
 * noche conoce la senda y quién cobra de Akechi, y la guía se los dice. Dirigiendo
 * a ciegas —jugando como uno más— no puede saberlos, y entonces esta hoja tiene
 * que ser legible de cabo a rabo sin que se le escape nada.
 *
 * LO QUE NUNCA SALE AQUÍ, ni siquiera dirigiendo de la manera normal: las
 * CONTRASEÑAS de las puertas. Están en los carteles, que es donde tienen que
 * estar, y en el pliego de la senda, que es de quien prepara. Una guía con las
 * contraseñas dentro es una guía que, dejada sobre la mesa dos minutos, ahorra a
 * media columna el paseo.
 */
import { esc } from '../../html';
import { envolverWashi, portadaWashi, sinTrama, ORNAMENTO } from './comun';
import { vistaDeLasSombras } from './datos';
import { PRENDAS_INICIALES, rastroMaximoPara } from '../../../../../shared/juegos/sombras-tipos';
import type { VistaGm } from '../../contexto';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../../shared/types';

export function guiaDelPaso(
  game: GameSession,
  plot: Plot,
  vistaGm: VistaGm,
  opciones: DocumentRenderOptions,
): string {
  const vista = vistaDeLasSombras(game, plot);
  if (!vista.hay || !vista.trama) return sinTrama('Guía del paso', opciones);

  const revela = vistaGm.revelaSolucion;
  const rastroMaximo = rastroMaximoPara(vista.escoltas.length);

  const horas = vista.horas
    .map(
      (h) => `        <tr>
          <td style="width:14mm; text-align:center;"><span class="kanji" style="font-size:16pt;">${esc(h.kanji)}</span></td>
          <td style="width:46mm;"><strong>${esc(h.nombre)}</strong><br /><span style="font-size:10pt; color:#7c7159;">${esc(h.reloj)}</span></td>
          <td>${
            revela
              ? `Los cazadores baten <strong class="bermellon">${esc(h.batido?.name ?? '—')}</strong>. <span style="font-size:10.5pt;">No lo digas al abrir: se revela al CERRAR.</span>`
              : '<span style="font-size:10.5pt; color:#7c7159;">Quien prepara te dirá al cerrar la hora qué paso estaba batido.</span>'
          }</td>
        </tr>`,
    )
    .join('\n');

  const gente = vista.escoltas
    .map((persona) => {
      const disfraz = vista.disfrazDe(persona.id);
      const personaje = plot.characters.find((c) => c.suspectId === persona.id);
      return `        <tr>
          <td style="width:40mm;"><strong>${esc(persona.name)}</strong><br /><span style="font-size:10pt; color:#7c7159;">${esc(personaje?.characterName ?? '')}</span></td>
          <td style="width:44mm;">${esc(disfraz?.rol ?? '—')} <span class="kanji">${esc(disfraz?.kanji ?? '')}</span></td>
          <td><span style="font-size:10.5pt;">${esc(disfraz?.arbitraje ?? '')}</span></td>
        </tr>`;
    })
    .join('\n');

  const enseres = vista.enseres
    .map((enser) => {
      const porte = vista.porteDe(enser.id);
      const quien = vista.cargaInicialDe(enser.id);
      return `        <tr>
          <td style="width:52mm;"><strong>${esc(enser.name)}</strong></td>
          <td style="width:34mm;">${esc(quien?.name ?? '—')}</td>
          <td>${porte ? `<strong>${esc(porte.nombre)}</strong>: ${esc(porte.que)}` : '<span style="color:#7c7159;">sin efecto</span>'}</td>
        </tr>`;
    })
    .join('\n');

  const guion = (plot.gmScript ?? []).map((p) => `        <li>${esc(p)}</li>`).join('\n');

  const narraciones = (plot.material?.narrations ?? [])
    .slice()
    .sort((a, b) => a.round - b.round)
    .map(
      (n) => `      <div class="caja junto">
        <span class="etiqueta">${n.round === 0 ? 'Antes de empezar' : `Hora ${n.round}`} · ${esc(n.title)}</span>
        <p style="margin:0;">${esc(n.text)}</p>
        ${n.stageDirection ? `<p style="margin:2.5mm 0 0;" class="bermellon"><strong>Indicación:</strong> ${esc(n.stageDirection)}</p>` : ''}
      </div>`,
    )
    .join('\n');

  const ayudas = (plot.material?.hints ?? [])
    .map(
      (a) => `        <tr><td style="width:16mm; text-align:center;"><strong>${a.level}</strong></td><td>${esc(a.text)}</td></tr>`,
    )
    .join('\n');

  const contenido = `${portadaWashi(
    revela ? 'Para quien dirige' : 'Para quien dirige · a ciegas',
    'La guía del paso',
    plot.tagline,
    revela ? 'Lleva la senda dentro: no la dejes sobre la mesa' : 'No lleva la senda: puedes leerla entera',
  )}

    <div class="caja caja--anil junto">
      <span class="etiqueta">Lo primero, y lo que más se olvida</span>
      <p style="margin:0;">
        <strong>No anuncies dónde están los cazadores al abrir la hora.</strong> Es lo único que no
        se dice, y de eso vive el juego entero. Se revela AL CERRAR, y ahí es donde la mesa
        comprueba quién decía la verdad.
      </p>
    </div>

    <h2>Cómo va una hora</h2>
    <ol>
      <li><strong>Abre la hora</strong> y lee su narración. Di qué hora del reloj es —del Jabalí, de
        la Rata…— y no digas nada más.</li>
      <li><strong>Se mueven.</strong> Cada cual elige un paso, <em>va andando hasta él</em>, lee la
        palabra del cartel de la puerta y la teclea (o te la dice a ti). Solo entonces recibe el
        hito de ese paso a esa hora.</li>
      <li><strong>Los disfraces.</strong> Cada persona puede usar el suyo una vez por hora. Abajo
        está qué hacer con cada uno.</li>
      <li><strong>Las prendas.</strong> Se dan a otras personas, nunca a uno mismo, y quien recibe
        una debe una respuesta sincera. Hazla cobrar en voz alta: es donde está la mitad del juego.</li>
      <li><strong>Cierra la hora</strong> y <strong>di qué paso estaba batido</strong>. Deja que se
        miren unos a otros antes de abrir la siguiente.</li>
    </ol>

    <h2>Las horas de esta noche</h2>
    <div class="tabla-marco">
      <table>
        <thead><tr><th></th><th>Hora</th><th>Los cazadores</th></tr></thead>
        <tbody>
${horas}
        </tbody>
      </table>
    </div>

    <h2>El rastro</h2>
    <div class="caja junto">
      <p style="margin:0;">
        Empieza en <strong>0</strong> y el tope de esta partida es
        <strong>${rastroMaximo}</strong> (son ${vista.escoltas.length} personas). Sube <strong>uno
        por cada persona</strong> que entra en el paso batido. Baja con el akindo. Y si llega al
        tope, <strong>la columna está interceptada</strong>: por bien que se ande la senda, no se
        embarca. Dilo en voz alta cada vez que suba; que se oiga.
      </p>
    </div>

    <h2>Quién es quién, y qué hacer con su disfraz</h2>
    <div class="tabla-marco">
      <table>
        <thead><tr><th>Persona</th><th>Disfraz</th><th>Qué haces tú cuando lo usa</th></tr></thead>
        <tbody>
${gente}
        </tbody>
      </table>
    </div>

    <h2>La carga</h2>
    <div class="tabla-marco">
      <table>
        <thead><tr><th>Enser</th><th>Empieza con</th><th>Qué pesa en las reglas</th></tr></thead>
        <tbody>
${enseres}
        </tbody>
      </table>
    </div>

${ORNAMENTO}

    <div class="pagina"></div>
    <h2>Lo que se lee en voz alta</h2>
${narraciones}

    <h2>El consejo del alba</h2>
    <div class="caja caja--bermellon junto">
      <ol style="margin:0;">
        <li>Se abre cuando tú lo decidas. A partir de ahí no se reconocen más pasos.</li>
        <li>Cada cual entrega <strong>su senda de ${vista.sendaVerdadera.length} pasos en orden</strong>
          y <strong>señala a quien cree que cobra de Akechi</strong>. En silencio y a la vez.</li>
        <li>El voto de cada cual pesa <strong>1 + las prendas que le hayan dado</strong>
          (empezaron con ${PRENDAS_INICIALES} para dar, y nadie puede tener más de dos recibidas).</li>
        <li>Si la <strong>mayoría</strong> de los señalamientos acierta con el kanchō, su voto pasa
          a valer cero y las prendas que reunió no cuentan.</li>
        <li>Se anda la senda más apoyada. <strong>De verdad</strong>: habitación por habitación, en
          orden y con todo el mundo detrás. Es el mejor momento de la noche.</li>
        <li>Si es la buena <em>y</em> el rastro no llegó al tope, el señor embarca y gana la columna
          entera menos el kanchō. Si no, gana él solo.</li>
      </ol>
    </div>

    <h2>Ayudas, si se atascan</h2>
    <div class="tabla-marco">
      <table>
        <thead><tr><th>Nivel</th><th>Qué decir</th></tr></thead>
        <tbody>
${ayudas || '        <tr><td>—</td><td>Esta partida no trae ayudas escritas.</td></tr>'}
        </tbody>
      </table>
    </div>

    <h2>Tu guion</h2>
    <ol>
${guion}
    </ol>

    ${
      revela
        ? `<div class="caja caja--bermellon junto">
      <span class="etiqueta bermellon">La senda · no la dejes a la vista</span>
      <p style="margin:0; font-size:14pt;">${vista.sendaVerdadera
        .map((p, i) => `<strong>${i + 1}.</strong> ${esc(p?.name ?? '—')}`)
        .join(' &nbsp;→&nbsp; ')}</p>
      <p style="margin:3mm 0 0;">Cobra de Akechi: <strong>${esc(vista.kancho?.entidad?.name ?? '—')}</strong>${
        vista.kancho?.personaje ? ` (${esc(vista.kancho.personaje)})` : ''
      }.</p>
    </div>`
        : `<div class="caja junto">
      <span class="etiqueta">Diriges a ciegas</span>
      <p style="margin:0;">
        Esta guía no lleva la senda ni el nombre de quien cobra de Akechi, así que puedes leerla
        entera sin estropearte la noche. Quien preparó el material tiene el pliego, y es quien te
        dirá al cerrar cada hora qué paso estaba batido. <strong>Y no leas los carteles de las
        puertas</strong>: llevan las contraseñas, y saberlas te ahorraría el paseo que a los demás
        les cuesta.
      </p>
    </div>`
    }`;

  return envolverWashi(`${plot.title} — Guía del paso`, contenido, opciones);
}
