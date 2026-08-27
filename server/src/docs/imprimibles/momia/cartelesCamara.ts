/**
 * Carteles de cámara: una página por habitación, para pegar en su puerta.
 *
 * Es lo que convierte un pasillo de una casa en un corredor de una tumba, y por
 * eso el nombre ocupa media página: se tiene que leer desde el otro extremo del
 * pasillo, de noche y con las luces bajas.
 *
 * NO DICE SI ESTÁ PROFANADA. La cámara profanada cambia cada vigilia y la
 * anuncia quien dirige en voz alta; imprimirla en el cartel habría atado la
 * partida a un orden de vigilias fijo y, peor, habría permitido que alguien
 * recorriera la casa leyendo puertas y supiera de antemano dónde no entrar.
 */
import { esc } from '../../html';
import { envolverPapiro, portadaPapiro, sinTrama } from './comun';
import { vistaDeLaMomia } from './datos';
import type { DocumentRenderOptions, GameSession, Plot } from '../../../../../shared/types';

/** El nombre manda en el cartel: se encoge si es largo, no se parte. */
function tamanoDelNombre(nombre: string): number {
  const largo = nombre.trim().length;
  if (largo <= 8) return 64;
  if (largo <= 14) return 50;
  if (largo <= 22) return 38;
  return 29;
}

export function cartelesCamara(
  game: GameSession,
  plot: Plot,
  opciones: DocumentRenderOptions,
): string {
  const vista = vistaDeLaMomia(game, plot);
  if (!vista.hay) return sinTrama('Carteles de las cámaras', opciones);

  const carteles = vista.camaras
    .map((camara, i) => {
      const inscripcion = vista.sabor?.inscripciones[camara.id] ?? '';
      return `    <section class="${i === 0 ? 'pagina' : 'pagina'}">
      <div style="text-align:center; margin-bottom:6mm;">
        <span class="glifo" style="font-size:30pt; color:#b8891f;">𓉔</span>
      </div>

      <div style="text-align:center; font-family:'Marcellus SC',Georgia,serif; font-size:${tamanoDelNombre(camara.name)}pt; line-height:1.06; color:#7a5c34; margin:0 0 6mm;">
        ${esc(camara.name)}
      </div>

      ${
        inscripcion
          ? `<div class="caja caja--lapis junto" style="text-align:center;">
        <span class="etiqueta">Inscripción del dintel</span>
        <p style="margin:0; font-size:14pt; font-style:italic;">${esc(inscripcion)}</p>
      </div>`
          : ''
      }

      ${
        camara.description
          ? `<p style="text-align:center; font-size:12.5pt; color:#7a5c34; margin:0 0 8mm;">${esc(camara.description)}</p>`
          : ''
      }

      <div class="caja junto" style="text-align:center;">
        <span class="etiqueta">Al entrar</span>
        <p style="margin:0; font-size:13pt;">
          Coge <strong>una</strong> tira de papiro de las que haya aquí. Solo una, y no se devuelve.
        </p>
        <p style="margin:2mm 0 0; font-size:12pt;">
          Si esta es la cámara profanada esta noche, sales además <strong>con una marca</strong>.
        </p>
      </div>

      <div class="ornamento"><span class="glifo">𓋹</span> ☥ <span class="glifo">𓋹</span></div>
    </section>`;
    })
    .join('\n\n');

  const contenido = `${portadaPapiro(
    'Para pegar en las puertas',
    'Carteles de las cámaras',
    plot.tagline,
    `${vista.camaras.length} ${vista.camaras.length === 1 ? 'cámara' : 'cámaras'} · una página cada una`,
  )}

    <div class="caja caja--lapis junto">
      <span class="etiqueta">Cómo se usan</span>
      <p style="margin:0;">
        Un cartel por habitación, pegado en su puerta o en la pared de al lado, a la altura de los
        ojos. Van sin la cámara profanada a propósito: <strong>eso lo anuncias tú al abrir cada
        vigilia</strong>, y cambia de noche a noche. Si lo pusiera el cartel, cualquiera podría
        recorrer la casa y saber de antemano dónde no entrar.
      </p>
    </div>

    <div class="caja junto">
      <span class="etiqueta">Si te sobra tiempo</span>
      <p style="margin:0;">
        Baja las luces de las habitaciones que hacen de cámara y deja una vela o una linterna en
        cada una. Es lo más barato que puedes hacer por la velada y lo que más se nota.
      </p>
    </div>

${carteles}`;

  return envolverPapiro(`${plot.title} — Carteles de las cámaras`, contenido, opciones);
}
