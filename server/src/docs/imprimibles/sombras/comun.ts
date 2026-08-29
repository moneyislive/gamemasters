/**
 * Las piezas que comparten los ocho imprimibles de El Paso de las Sombras.
 *
 * Gemelo de `imprimibles/comun.ts` y de `imprimibles/momia/comun.ts`, y separado
 * por lo mismo que la hoja de estilos: aquellos envuelven con otra imprenta y el
 * maestro de oro compara la salida de CLUEDO byte a byte. Meter aquí un `if` por
 * juego habría cambiado un fichero que hoy no puede cambiar, para ahorrar quince
 * líneas.
 */
import { barraDeImpresion } from '../../estilos';
import { esc } from '../../html';
import { hojaDeWashi } from './estilo';
import type { DocumentRenderOptions } from '../../../../../shared/types';

export function envolverWashi(
  titulo: string,
  contenido: string,
  opciones: DocumentRenderOptions = {},
): string {
  const tema = opciones.variant === 'blanco' ? 'blanco' : 'color';
  const conBarra = opciones.printBar === true || opciones.printBar === 'auto';
  return `<!doctype html>
<html lang="es" data-tema="${tema}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(titulo)}</title>
<style>${hojaDeWashi({ conBarra })}</style>
</head>
<body>
${conBarra ? barraDeImpresion(opciones.printBar === 'auto') : ''}
  <div class="hoja">
${contenido}
    <div class="pie-documento">${esc(titulo)} · GameMasters</div>
  </div>
</body>
</html>`;
}

export function portadaWashi(sello: string, titulo: string, lema: string, sub?: string): string {
  return `    <div class="portada">
      <span class="sello">${esc(sello)}</span>
      <h1>${esc(titulo)}</h1>
      <p class="lema">${esc(lema)}</p>
      ${sub ? `<p class="sub">${esc(sub)}</p>` : ''}
    </div>`;
}

/**
 * La hoja que sale cuando la partida no trae trama de este juego.
 *
 * Pasa de verdad: una partida generada antes de que existiera `delJuego`, o una
 * a la que le cambiaron el juego después. Devolver una página en blanco dejaría
 * a quien imprime mirando un folio sin saber qué ha hecho mal, y lanzar una
 * excepción tumbaría la descarga del paquete entero por un solo documento.
 */
export function sinTrama(titulo: string, opciones: DocumentRenderOptions): string {
  return envolverWashi(
    titulo,
    `${portadaWashi('Falta el pliego', titulo, 'El camino no se ha trazado todavía')}

    <div class="aviso">
      Esta partida no tiene trama de El Paso de las Sombras
    </div>

    <div class="caja junto">
      <p style="margin:0;">
        El documento existe, pero no hay nada que imprimir todavía. Suele pasar por una de
        dos cosas: la trama aún no se ha generado, o la partida se creó como otro juego y
        después se cambió a este. Vuelve al taller y traza el camino; el paquete se rehace
        solo, sin tocar nada de lo que ya habías escrito.
      </p>
    </div>`,
    opciones,
  );
}

/**
 * El ornamento de separación.
 *
 * Adorno puro: si la fuente de kanji no carga, no falta nada. Los tres signos
 * son 山 (monte), 川 (río) y 山 otra vez — el santo y seña más conocido del
 * Sengoku, puesto de adorno donde otro juego pondría un rombo.
 */
export const ORNAMENTO = `    <div class="ornamento"><span class="kanji">山</span> · <span class="kanji">川</span> · <span class="kanji">山</span></div>`;
