/**
 * Hoja de investigación y acusación: dos caras que se fotocopian una vez por
 * jugador. No contiene ni un dato de la trama, solo el título y las rondas.
 */
import { numeroDeRondas } from '../../datos';
import { envolver, portada } from '../comun';
import type { DocumentRenderOptions, Plot } from '../../../../../shared/types';

export function hojasInvestigacion(plot: Plot, opciones: DocumentRenderOptions): string {
  const rondas = numeroDeRondas(plot);

  // Cada cara tiene que caber en un A4: se fotocopia una vez por jugador y una
  // página huérfana duplicaría el gasto de papel. Con muchas rondas se reparten
  // menos renglones a cada una en vez de desbordar. Medido con cuatro rondas:
  // 272,8 mm con el renglón de 8 mm de la hoja común, contra 267 mm útiles.
  const renglonesPorRonda = rondas <= 4 ? 3 : rondas <= 6 ? 2 : 1;
  const renglon = '<span class="renglon" style="height:7mm; margin-bottom:1.5mm;"></span>';

  const notas = Array.from(
    { length: rondas },
    (_, indice) => `      <div class="junto">
        <h3>Ronda ${indice + 1}</h3>
        ${renglon.repeat(renglonesPorRonda)}
      </div>`,
  ).join('\n');

  const contenido = `${portada('Una copia por jugador', 'Hoja de investigación', plot.tagline)}

    <h2 style="margin-top:0;">Mi personaje</h2>
    <div class="junto">
      <div class="campo"><span>Nombre</span><span></span></div>
      <div class="campo"><span>Motivo que otros podrían descubrir</span><span></span></div>
      <div class="campo"><span>Coartada declarada</span><span></span></div>
      <div class="campo"><span>Secreto que debo proteger</span><span></span></div>
    </div>

    <h2>Notas por ronda</h2>
${notas}

    <section class="pagina">
${portada('Se entrega boca abajo', 'Acusación final', plot.tagline)}

      <div class="aviso">
        No hables mientras la rellenas<br />
        Escribe una sola combinación y entrégala boca abajo.<br />
        No podrás cambiarla después.
      </div>

      <div class="campo"><span>Mi personaje</span><span></span></div>

      <div class="caja caja--roja junto">
        <span class="etiqueta" style="font-size:9.5pt;">Una sola combinación</span>
        <div class="campo" style="margin-bottom:5mm;">
          <span style="font-size:13pt;">Culpable</span>
          <span style="height:11mm; border-bottom:2px solid #6d1a2a;"></span>
        </div>
        <div class="campo" style="margin-bottom:5mm;">
          <span style="font-size:13pt;">Objeto</span>
          <span style="height:11mm; border-bottom:2px solid #6d1a2a;"></span>
        </div>
        <div class="campo" style="margin-bottom:1mm;">
          <span style="font-size:13pt;">Sala</span>
          <span style="height:11mm; border-bottom:2px solid #6d1a2a;"></span>
        </div>
      </div>

      <h3>Mi reconstrucción en dos o tres frases</h3>
      ${'<span class="renglon" style="height:8.5mm;"></span>'.repeat(4)}

      <div class="campo" style="margin-top:4mm;">
        <span>Nivel de confianza (0–100 %)</span>
        <span style="flex:0 0 40mm;"></span>
      </div>

      <div class="ornamento">❦ ✦ ⚜ ✦ ❦</div>
    </section>`;

  return envolver(`${plot.title} — Hoja de investigación`, contenido, opciones);
}
