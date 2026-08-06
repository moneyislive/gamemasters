/** Piezas compartidas por todos los documentos imprimibles. */
import { barraDeImpresion } from '../estilos';
import { hojaDeImprenta } from '../estilosImprenta';
import { esc } from '../html';
import type { DocumentRenderOptions } from '../../../../shared/types';

export function envolver(
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
<style>${hojaDeImprenta({ conBarra })}</style>
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

export function portada(sello: string, titulo: string, lema: string, sub?: string): string {
  return `    <div class="portada">
      <span class="sello">${esc(sello)}</span>
      <h1>${esc(titulo)}</h1>
      <p class="lema">${esc(lema)}</p>
      ${sub ? `<p class="sub">${esc(sub)}</p>` : ''}
    </div>`;
}
