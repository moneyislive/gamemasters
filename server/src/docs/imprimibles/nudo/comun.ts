/**
 * Las piezas que comparten los nueve imprimibles de El Nudo de Valdehierro.
 *
 * Gemelo de `imprimibles/comun.ts`, de `momia/comun.ts` y de `sombras/comun.ts`,
 * y separado por lo mismo que la hoja de estilos: aquellos envuelven con otra
 * imprenta y el maestro de oro compara la salida de CLUEDO byte a byte. Meter
 * aquí un `if` por juego habría cambiado un fichero que hoy no puede cambiar,
 * para ahorrar quince líneas.
 */
import { barraDeImpresion } from '../../estilos';
import { esc } from '../../html';
import { hojaDeEstraza } from './estilo';
import type { DocumentRenderOptions } from '../../../../../shared/types';

export function envolverEstraza(
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
<style>${hojaDeEstraza({ conBarra })}</style>
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

export function portadaEstraza(
  sello: string,
  titulo: string,
  lema: string,
  sub?: string,
): string {
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
 * Pasa de verdad: una partida generada antes de que existiera este juego, o una
 * a la que le cambiaron el juego después. Devolver una página en blanco dejaría
 * a quien imprime mirando un folio sin saber qué ha hecho mal, y lanzar una
 * excepción tumbaría la descarga del paquete entero por un solo documento.
 *
 * PASA DE LOS 1500 CARACTERES A PROPÓSITO: `verify:juegos` comprueba que ningún
 * documento salga vacío, y una hoja de disculpa de tres líneas dispararía esa
 * comprobación sin que hubiera nada roto. Además, quien la lea tiene que poder
 * arreglarlo sin preguntar, así que dice exactamente qué hacer.
 */
export function sinTrama(titulo: string, opciones: DocumentRenderOptions): string {
  return envolverEstraza(
    titulo,
    `${portadaEstraza('Sin cuadro', titulo, 'El cuadro de marchas no se ha rehecho todavía')}

    <div class="aviso">
      Esta partida no tiene trama de El Nudo de Valdehierro
    </div>

    <div class="caja junto">
      <p style="margin:0 0 8px;">
        El documento existe, pero no hay nada que imprimir todavía. Suele pasar por una de dos
        cosas: la trama aún no se ha generado, o la partida se creó como otro juego y después se
        cambió a este.
      </p>
      <p style="margin:0;">
        Vuelve al taller y pulsa <strong>generar</strong>. El paquete se rehace solo y no se pierde
        nada de lo que ya habías escrito: las personas, los convoyes, los puestos y los cargamentos
        se quedan como estaban.
      </p>
    </div>

    <div class="caja caja--roja junto">
      <span class="etiqueta">Si ya lo has intentado y no sale</span>
      <p style="margin:0;">
        El cuadro de marchas empareja convoyes con franjas horarias, así que hacen falta
        <strong>exactamente seis convoyes</strong>, ni uno más ni uno menos, y al menos cuatro
        personas de turno y cuatro puestos. Si falta algo de eso, la generación se para y te lo
        dice: no monta una noche a medias.
      </p>
    </div>`,
    opciones,
  );
}

/**
 * El ornamento de separación.
 *
 * Adorno puro. Son tres signos de un impreso de ferrocarril —el punto y aparte
 * que se ponía entre secciones de un parte— y no llevan ningún dato dentro: si
 * la fuente no cargara, no falta nada.
 */
export const ORNAMENTO = `    <div class="ornamento">· ✕ ·</div>`;
