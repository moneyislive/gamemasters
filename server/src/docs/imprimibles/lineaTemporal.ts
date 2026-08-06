/**
 * Línea temporal pública: el cartel que se cuelga desde el principio.
 *
 * Es el único registro de hechos que ven todos los jugadores, y su pieza central
 * no es lo que cuenta sino lo que calla: el tramo sin testigos. Ese hueco es la
 * pregunta que sostiene la partida.
 */
import { cronologiaPublica, huecoPorReconstruir, numeroDeRondas } from '../datos';
import { esc } from '../html';
import { envolver, portada } from './comun';
import type { DocumentRenderOptions, Plot } from '../../../../shared/types';

export function lineaTemporal(plot: Plot, opciones: DocumentRenderOptions): string {
  const eventos = cronologiaPublica(plot);
  const hueco = huecoPorReconstruir(plot);
  const rondas = numeroDeRondas(plot);

  const filaHueco = `      <tr>
        <td class="hora" style="width:34mm; font-size:15pt; background:rgba(109,26,42,0.16); border-top:3px solid #6d1a2a; border-bottom:3px solid #6d1a2a; padding-top:4mm; padding-bottom:4mm;">${esc(hueco?.desde ?? '')}–${esc(hueco?.hasta ?? '')}</td>
        <td style="font-family:'Cinzel',Georgia,serif; font-size:17pt; letter-spacing:0.08em; text-transform:uppercase; color:#6d1a2a; background:rgba(109,26,42,0.16); border-top:3px solid #6d1a2a; border-bottom:3px solid #6d1a2a; padding-top:4mm; padding-bottom:4mm;">Intervalo por reconstruir</td>
      </tr>`;

  // El hueco se intercala en su sitio: después del último hecho público previo.
  const filas: string[] = [];
  for (const evento of eventos) {
    filas.push(`      <tr>
        <td class="hora" style="width:34mm;">${esc(evento.time)}</td>
        <td>${esc(evento.description)}</td>
      </tr>`);
    if (hueco && evento.time === hueco.desde) filas.push(filaHueco);
  }

  const tabla = eventos.length
    ? `    <table style="font-size:11.5pt;">
      <thead>
        <tr><th style="width:34mm; font-size:9pt;">Hora</th><th style="font-size:9pt;">Hecho público</th></tr>
      </thead>
      <tbody>
${filas.join('\n')}
      </tbody>
    </table>`
    : `    <div class="caja junto">
      <p style="margin:0;">
        Esta trama no marca ningún hecho como público, así que no hay nada que colgar
        todavía. Al actualizar el misterio, los momentos que presenciaron todos
        aparecerán aquí.
      </p>
    </div>`;

  const corazon = hueco
    ? `    <div class="caja caja--roja junto" style="text-align:center;">
      <span class="etiqueta" style="font-size:9.5pt;">El corazón del caso</span>
      <p style="font-family:'Cinzel',Georgia,serif; font-size:13pt; letter-spacing:0.06em; color:#6d1a2a; margin:0;">
        ❦&nbsp;&nbsp;Entre ${esc(hueco.desde)} y ${esc(hueco.hasta)} no hay ningún hecho público.&nbsp;&nbsp;❦
      </p>
      <p style="margin:2mm 0 0; font-size:12.5pt;">Ese hueco es lo que hay que reconstruir.</p>
    </div>`
    : '';

  // Huecos para ir pegando lo que se destape al cerrar cada ronda.
  const actualizaciones = Array.from(
    { length: rondas },
    (_, indice) => `      <div class="junto" style="margin-bottom:3mm;">
        <span class="etiqueta" style="font-size:9.5pt;">Al cerrar la ronda ${indice + 1}</span>
        <div class="caja" style="min-height:${rondas <= 4 ? 34 : 24}mm; border-width:2px; border-style:dashed; display:flex; align-items:center; justify-content:center; text-align:center; background:transparent;">
          <span style="font-family:'Cinzel',Georgia,serif; font-size:11pt; letter-spacing:0.14em; text-transform:uppercase; color:#8a7145;">
            Lo que se haya destapado en la ronda ${indice + 1}
          </span>
        </div>
      </div>`,
  ).join('\n');

  const contenido = `${portada(
    'Material público',
    'Línea temporal',
    plot.tagline,
    'Cuélgala a la vista desde el comienzo',
  )}

    <div class="aviso">
      Esta hoja contiene solo los hechos conocidos al inicio.<br />
      No añadas nada hasta cerrar la ronda que corresponda.
    </div>

    <h2 style="margin-top:0;">Hechos públicos iniciales</h2>

${tabla}

${corazon}

    <section class="pagina">
      <h2 style="margin-top:0;">Lo que se vaya sabiendo</h2>
      <p style="font-size:12.5pt;">
        Cuelga esta hoja justo debajo de la anterior. Al cerrar cada ronda, anota o pega en
        su hueco lo que el grupo haya conseguido establecer. Así todos comparten la misma
        reconstrucción y nadie discute sobre lo que ya está probado.
      </p>
${actualizaciones}
    </section>`;

  return envolver(`${plot.title} — Línea temporal`, contenido, opciones);
}
