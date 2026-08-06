/**
 * Hoja de estilos del material imprimible (carteles, hojas que se reparten).
 *
 * Deliberadamente SEPARADA de la de los dosieres. Aquella está pensada para
 * leerse en pantalla y mide en píxeles; ésta existe solo para el papel y mide en
 * milímetros y puntos. Mezclarlas obligaría a estrechar y encoger los dosieres
 * que ya funcionan, que es un rediseño que nadie ha pedido.
 *
 * Las medidas vienen de los imprimibles que se maquetaron a mano y se
 * verificaron imprimiéndolos: A4 con márgenes de 15 × 14 mm deja 267 mm útiles
 * de alto. Aun así, aquí NO se replican los ajustes finos de interlineado que
 * se hicieron allí para cuadrar al milímetro: con textos de longitud
 * impredecible no sobreviven, así que se prefiere holgura y contenido que fluya.
 */
import { CSS_BARRA } from './estilos';

const BASE = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Cinzel+Decorative:wght@700;900&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap');

@page { size: A4; margin: 15mm 14mm; }

* { box-sizing: border-box; }

html, body { margin: 0; padding: 0; }

body {
  background: #241a12;
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 12.6pt;
  line-height: 1.5;
  color: #241a12;
  /* Sin esto el navegador tira los fondos al imprimir y se pierde todo. */
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.hoja {
  max-width: 190mm;
  margin: 0 auto;
  background: #f1e5c9;
  background-image:
    radial-gradient(circle at 12% 8%, rgba(109, 26, 42, 0.05), transparent 45%),
    radial-gradient(circle at 88% 92%, rgba(26, 63, 42, 0.06), transparent 45%);
  padding: 16mm 15mm;
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.55);
}

/* ---------- Tipografía ---------- */

h1, h2, h3 {
  font-family: 'Cinzel', Georgia, serif;
  margin: 0 0 0.5em;
  letter-spacing: 0.06em;
  color: #1a3f2a;
  page-break-after: avoid;
  break-after: avoid;
}
h1 {
  font-family: 'Cinzel Decorative', 'Cinzel', serif;
  font-size: 24pt;
  line-height: 1.14;
  text-align: center;
}
h2 {
  font-size: 14pt;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 1.2em;
}
h2::after {
  content: '';
  flex: 1;
  height: 2px;
  background: linear-gradient(90deg, #c9a227, rgba(201, 162, 39, 0));
}
h3 { font-size: 12pt; color: #6d1a2a; letter-spacing: 0.1em; }
p { margin: 0 0 0.7em; }
em { color: #6b5638; }
b, strong { color: #4a2f16; }

/* ---------- Portada de cada documento ---------- */

.portada {
  text-align: center;
  padding: 4mm 0 6mm;
  border-bottom: 3px double #c9a227;
  margin-bottom: 7mm;
}
.portada .sello {
  display: inline-block;
  font-family: 'Cinzel', serif;
  font-size: 8.5pt;
  letter-spacing: 0.34em;
  text-transform: uppercase;
  color: #6d1a2a;
  border: 1px solid #6d1a2a;
  padding: 4px 14px;
  border-radius: 3px;
  margin-bottom: 5mm;
}
.portada .lema { font-style: italic; font-size: 12.5pt; color: #6b5638; margin: 0.4em 0 0; }
.portada .sub {
  font-family: 'Cinzel', serif;
  font-size: 9.5pt;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #3e2723;
  margin: 0.6em 0 0;
}

/* ---------- Cajas ---------- */

.caja {
  border: 1px solid #c9a227;
  background: rgba(255, 255, 255, 0.45);
  padding: 5mm 6mm;
  border-radius: 3px;
  margin: 0 0 5mm;
  page-break-inside: avoid;
  break-inside: avoid;
}
.caja--verde { border: 2px solid #1a3f2a; background: rgba(26, 63, 42, 0.07); }
.caja--roja { border: 2px solid #6d1a2a; background: rgba(109, 26, 42, 0.07); }

.aviso {
  border: 3px solid #6d1a2a;
  background: rgba(109, 26, 42, 0.1);
  padding: 5mm;
  text-align: center;
  font-family: 'Cinzel', serif;
  font-size: 10.5pt;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6d1a2a;
  line-height: 1.45;
  margin: 0 0 6mm;
  page-break-inside: avoid;
  break-inside: avoid;
}

.etiqueta {
  display: block;
  font-family: 'Cinzel', serif;
  font-size: 8pt;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #8a7145;
  margin-bottom: 2px;
}

/* ---------- Listas ---------- */

ol, ul { padding-left: 6mm; margin: 0 0 0.8em; }
li { margin-bottom: 0.35em; }

/* ---------- Renglones para escribir a mano ---------- */

.renglon {
  display: block;
  border-bottom: 1px solid rgba(62, 39, 35, 0.4);
  height: 8mm;
  margin-bottom: 2mm;
}
.campo {
  display: flex;
  align-items: baseline;
  gap: 3mm;
  margin-bottom: 3mm;
}
.campo > span:first-child {
  font-family: 'Cinzel', serif;
  font-size: 9.5pt;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #6d1a2a;
  white-space: nowrap;
}
.campo > span:last-child {
  flex: 1;
  border-bottom: 1px solid rgba(62, 39, 35, 0.4);
  height: 7mm;
}

/* ---------- Ornamentos y pies ---------- */

.ornamento {
  text-align: center;
  color: #c9a227;
  font-size: 12pt;
  letter-spacing: 0.5em;
  margin: 5mm 0;
}
.pie-documento {
  margin-top: 7mm;
  padding-top: 4mm;
  border-top: 3px double #c9a227;
  text-align: center;
  font-family: 'Cinzel', serif;
  font-size: 8pt;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: #8a7145;
}

/* ---------- Saltos de página ---------- */

.pagina { page-break-before: always; break-before: page; }
.junto { page-break-inside: avoid; break-inside: avoid; }

@media print {
  body { background: #fff; }
  .hoja {
    max-width: none;
    margin: 0;
    /* El @page ya deja el margen físico; estos milímetros son el aire entre el
       texto y el filo del área imprimible. */
    padding: 0 4mm;
    box-shadow: none;
  }
  .no-imprimir { display: none !important; }
}
`;

/** Mismo criterio que en los dosieres: vaciar superficies, no tocar la forma. */
const TEMA_BLANCO = `
[data-tema="blanco"] body { background: #fff; }
[data-tema="blanco"] .hoja {
  background: #fff;
  background-image: none;
  box-shadow: none;
}
[data-tema="blanco"] .caja,
[data-tema="blanco"] .caja--verde,
[data-tema="blanco"] .caja--roja,
[data-tema="blanco"] .aviso {
  background: #fff;
}
`;

export interface OpcionesDeImprenta {
  conBarra?: boolean;
}

export function hojaDeImprenta(opciones: OpcionesDeImprenta = {}): string {
  return [BASE, TEMA_BLANCO, opciones.conBarra ? CSS_BARRA : ''].join('\n');
}
