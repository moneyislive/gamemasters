/**
 * Las piezas que comparten los ocho imprimibles de la Momia.
 *
 * Gemelo de `imprimibles/comun.ts`, y separado por lo mismo que la hoja de
 * estilos: aquel envuelve con la imprenta de CLUEDO y el maestro de oro compara
 * su salida byte a byte. Meter aquí un `if` por juego habría cambiado un
 * fichero que hoy no puede cambiar, para ahorrar quince líneas.
 */
import { barraDeImpresion } from '../../estilos';
import { esc } from '../../html';
import { hojaDePapiro } from './estilo';
import type { DocumentRenderOptions } from '../../../../../shared/types';

export function envolverPapiro(
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
<style>${hojaDePapiro({ conBarra })}</style>
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

export function portadaPapiro(sello: string, titulo: string, lema: string, sub?: string): string {
  return `    <div class="portada">
      <span class="sello">${esc(sello)}</span>
      <h1>${esc(titulo)}</h1>
      <p class="lema">${esc(lema)}</p>
      ${sub ? `<p class="sub">${esc(sub)}</p>` : ''}
    </div>`;
}

/**
 * La hoja que sale cuando la partida no trae trama de la Momia.
 *
 * Pasa de verdad: una partida generada antes de que existiera `delJuego`, o una
 * a la que le cambiaron el juego después. Devolver una página en blanco dejaría
 * a quien imprime mirando un folio sin saber qué ha hecho mal, y lanzar una
 * excepción tumbaría la descarga del paquete entero por un solo documento.
 */
export function sinTrama(titulo: string, opciones: DocumentRenderOptions): string {
  return envolverPapiro(
    titulo,
    `${portadaPapiro('Falta el papiro', titulo, 'La tumba no se ha excavado todavía')}

    <div class="aviso">
      Esta partida no tiene trama de El Misterio de la Momia
    </div>

    <div class="caja junto">
      <p style="margin:0;">
        El documento existe, pero no hay nada que imprimir todavía. Suele pasar por una de
        dos cosas: la trama aún no se ha generado, o la partida se generó como otro juego y
        después se cambió a este. Vuelve al taller y genera la expedición; el paquete se
        rehace solo, sin tocar nada de lo que ya habías escrito.
      </p>
    </div>`,
    opciones,
  );
}

/** El ornamento de separación. Adorno puro: si la fuente de glifos no carga, no falta nada. */
export const ORNAMENTO = `    <div class="ornamento"><span class="glifo">𓊹</span> ☥ <span class="glifo">𓊹</span></div>`;
