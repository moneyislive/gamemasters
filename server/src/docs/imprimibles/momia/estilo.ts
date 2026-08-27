/**
 * La imprenta de El Misterio de la Momia: papiro, tinta sepia y almagre.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUÉ AL LADO DE `estilosImprenta.ts` Y NO GENERALIZÁNDOLA
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * La tentación era sacar los colores de la hoja de CLUEDO a variables CSS y
 * darle a cada juego las suyas. Se ha descartado por tres razones, y la primera
 * pesa más que las otras dos juntas:
 *
 *  1. EL MAESTRO DE ORO COMPARA 52 DOCUMENTOS BYTE A BYTE. Convertir
 *     `#6d1a2a` en `var(--acento)` cambia el CSS que sale, y aunque el resultado
 *     impreso fuese idéntico, la red de seguridad que protege el único juego que
 *     está en producción se pondría roja y habría que recapturarla. Recapturar
 *     el oro para ganar elegancia es aceptar que la red deje de proteger justo
 *     la noche en que se toca todo lo demás.
 *  2. NO ES SOLO LA PALETA. La Momia necesita estructuras que CLUEDO no tiene:
 *     tiras que se recortan y se doblan, marcas de corte, rejillas de cuenta, un
 *     fondo lo bastante opaco para que un fragmento no se lea al trasluz. Un
 *     tema de colores no habría dado nada de eso.
 *  3. LO QUE SÍ SE COMPARTE ES LA GEOMETRÍA, y se comparte copiándola a
 *     conciencia: A4 con márgenes de 15 × 14 mm, `print-color-adjust: exact`,
 *     `page-break-inside: avoid` en los bloques que no se pueden partir. Esas
 *     medidas vienen de imprimir de verdad y se respetan al milímetro.
 *
 * El día que entre un tercer juego, dos hojas casi iguales sí serán argumento
 * suficiente para extraer la geometría común a un módulo y dejar arriba solo la
 * paleta y los ornamentos. Con dos, no lo es.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LOS JEROGLÍFICOS, CON RED
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Los glifos del manifiesto (𓂀, 𓉔, ☥) viven en el bloque Egyptian Hieroglyphs
 * de Unicode, que la inmensa mayoría de los sistemas NO tienen instalado: sin
 * fuente salen cuadraditos, y un cuadradito en un cartel de puerta es peor que
 * no poner nada. Se carga «Noto Sans Egyptian Hieroglyphs» de Google Fonts para
 * la clase `.glifo`, y —esto es lo importante— NINGÚN dato viaja solo en un
 * glifo: son adorno, y si no cargan, el documento se lee igual.
 */

/*
 * La barra de impresión flotante es la misma que la de CLUEDO, y no es papel:
 * es el botón que se ve en pantalla antes de imprimir. No hay ninguna razón
 * para que cambie de juego a juego, así que se toma prestada en vez de
 * copiarla con otros colores.
 */
import { CSS_BARRA } from '../../estilos';

const BASE = `
@import url('https://fonts.googleapis.com/css2?family=Marcellus+SC&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Courier+Prime:wght@400;700&family=Noto+Sans+Egyptian+Hieroglyphs&display=swap');

@page { size: A4; margin: 15mm 14mm; }

* { box-sizing: border-box; }

html, body { margin: 0; padding: 0; }

body {
  background: #2b2216;
  font-family: 'EB Garamond', Georgia, serif;
  font-size: 12.4pt;
  line-height: 1.5;
  color: #3d2f1c;
  /* Sin esto el navegador tira los fondos al imprimir y el papiro sale blanco. */
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* ---------- La hoja de papiro ----------
   Las vetas son tres degradados cruzados, no una imagen: una textura embebida
   en base64 habría pesado más que todo el documento y en papel apenas se
   distingue de esto. */
.hoja {
  max-width: 190mm;
  margin: 0 auto;
  background: #f0e4c8;
  background-image:
    repeating-linear-gradient(90deg, rgba(150, 120, 70, 0.055) 0 1.6mm, rgba(0, 0, 0, 0) 1.6mm 3.4mm),
    repeating-linear-gradient(0deg, rgba(150, 120, 70, 0.04) 0 2.1mm, rgba(0, 0, 0, 0) 2.1mm 4.6mm),
    radial-gradient(ellipse at 15% 10%, rgba(122, 92, 52, 0.10), transparent 55%),
    radial-gradient(ellipse at 85% 88%, rgba(122, 92, 52, 0.09), transparent 55%);
  padding: 16mm 15mm;
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.55);
}

/* ---------- Tipografía ---------- */

h1, h2, h3 {
  font-family: 'Marcellus SC', 'Palatino Linotype', Georgia, serif;
  margin: 0 0 0.5em;
  letter-spacing: 0.05em;
  color: #1f3f6b;               /* lapislázuli */
  page-break-after: avoid;
  break-after: avoid;
}
h1 { font-size: 25pt; line-height: 1.14; text-align: center; color: #7a5c34; }
h2 {
  font-size: 13.5pt;
  text-transform: uppercase;
  letter-spacing: 0.17em;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 1.2em;
}
h2::after {
  content: '';
  flex: 1;
  height: 2px;
  background: linear-gradient(90deg, #b8891f, rgba(184, 137, 31, 0));
}
h3 { font-size: 12pt; color: #9c3b1b; letter-spacing: 0.09em; }
p { margin: 0 0 0.7em; }
em { color: #7a5c34; }
b, strong { color: #1f3f6b; }

/* El almagre: en los papiros de verdad, lo que iba en rojo era lo que había que
   obedecer. Aquí, igual: instrucciones y avisos. */
.almagre { color: #9c3b1b; }

.glifo {
  font-family: 'Noto Sans Egyptian Hieroglyphs', 'Segoe UI Symbol', serif;
  font-size: 1.1em;
  line-height: 1;
}

.maquina {
  font-family: 'Courier Prime', 'Courier New', monospace;
  font-size: 9.5pt;
  letter-spacing: 0.02em;
}

/* ---------- Portada ---------- */

.portada {
  text-align: center;
  padding: 4mm 0 6mm;
  border-bottom: 3px double #b8891f;
  margin-bottom: 7mm;
}
.portada .sello {
  display: inline-block;
  font-family: 'Courier Prime', 'Courier New', monospace;
  font-size: 8.5pt;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #9c3b1b;
  border: 1px solid #9c3b1b;
  padding: 4px 14px;
  margin-bottom: 5mm;
}
.portada .lema { font-style: italic; font-size: 12.5pt; color: #7a5c34; margin: 0.4em 0 0; }
.portada .sub {
  font-family: 'Marcellus SC', Georgia, serif;
  font-size: 9.5pt;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #1f3f6b;
  margin: 0.6em 0 0;
}

/* ---------- Cajas ---------- */

.caja {
  border: 1px solid #b8891f;
  background: rgba(255, 252, 240, 0.5);
  padding: 5mm 6mm;
  margin: 0 0 5mm;
  page-break-inside: avoid;
  break-inside: avoid;
}
.caja--lapis { border: 2px solid #1f3f6b; background: rgba(31, 63, 107, 0.06); }
.caja--almagre { border: 2px solid #9c3b1b; background: rgba(156, 59, 27, 0.07); }

.aviso {
  border: 3px solid #9c3b1b;
  background: rgba(156, 59, 27, 0.1);
  padding: 5mm;
  text-align: center;
  font-family: 'Marcellus SC', Georgia, serif;
  font-size: 10.5pt;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: #9c3b1b;
  line-height: 1.45;
  margin: 0 0 6mm;
  page-break-inside: avoid;
  break-inside: avoid;
}

.etiqueta {
  display: block;
  font-family: 'Courier Prime', 'Courier New', monospace;
  font-size: 8pt;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #8a6b3a;
  margin-bottom: 2px;
}

/* ---------- Tablas ---------- */

table { width: 100%; border-collapse: collapse; margin: 0 0 5mm; font-size: 11.5pt; }
th, td { border: 1px solid rgba(122, 92, 52, 0.45); padding: 2.4mm 3mm; text-align: left; vertical-align: top; }
th {
  font-family: 'Marcellus SC', Georgia, serif;
  font-size: 9.5pt;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: #1f3f6b;
  background: rgba(184, 137, 31, 0.14);
}

/* ---------- Listas y renglones ---------- */

ol, ul { padding-left: 6mm; margin: 0 0 0.8em; }
li { margin-bottom: 0.35em; }

.renglon {
  display: block;
  border-bottom: 1px solid rgba(61, 47, 28, 0.4);
  height: 8mm;
  margin-bottom: 2mm;
}
.campo { display: flex; align-items: baseline; gap: 3mm; margin-bottom: 3mm; }
.campo > span:first-child {
  font-family: 'Marcellus SC', Georgia, serif;
  font-size: 9.5pt;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: #9c3b1b;
  white-space: nowrap;
}
.campo > span:last-child { flex: 1; border-bottom: 1px solid rgba(61, 47, 28, 0.4); height: 7mm; }

/* La casilla que se tacha: marcas, amuletos, ritos ejecutados. */
.casilla {
  display: inline-block;
  width: 6mm;
  height: 6mm;
  border: 1.4px solid #7a5c34;
  margin-right: 2mm;
  vertical-align: middle;
}

/* ---------- Las tiras que se recortan ----------
   Ver el porqué de cada milímetro en fragmentosPapiro.ts. Aquí solo la forma.
*/
.tira {
  border: 1.4px solid #7a5c34;
  margin: 0 0 4mm;
  page-break-inside: avoid;
  break-inside: avoid;
  /* Opaco de verdad: es lo que impide leer el fragmento a contraluz. */
  background: #e6d5ae;
  background-image:
    repeating-linear-gradient(90deg, rgba(122, 92, 52, 0.10) 0 1.2mm, rgba(0, 0, 0, 0) 1.2mm 2.6mm),
    repeating-linear-gradient(0deg, rgba(122, 92, 52, 0.09) 0 1.5mm, rgba(0, 0, 0, 0) 1.5mm 3.2mm);
}
.tira .cara {
  padding: 4mm 5mm 3mm;
  text-align: center;
}
.tira .doblez {
  border-top: 1.1px dashed #7a5c34;
  text-align: center;
  font-family: 'Courier Prime', 'Courier New', monospace;
  font-size: 6.5pt;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #8a6b3a;
  padding: 0.6mm 0;
}
.tira .dorso {
  padding: 4mm 5mm 5mm;
  min-height: 26mm;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.tira .dorso p { margin: 0; font-size: 12.5pt; line-height: 1.42; }

/* Marca de corte entre tiras. Discontinua y con tijera, para que no haya duda
   de cuál es de cortar y cuál de doblar. */
.corte {
  border: 0;
  border-top: 1.3px dashed rgba(61, 47, 28, 0.55);
  margin: 0 0 4mm;
}

/* ---------- Rejilla de dos columnas para las tiras ---------- */
.rejilla {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4mm;
}

/* ---------- Ornamentos y pies ---------- */

.ornamento {
  text-align: center;
  color: #b8891f;
  font-size: 12pt;
  letter-spacing: 0.5em;
  margin: 5mm 0;
}
.pie-documento {
  margin-top: 7mm;
  padding-top: 4mm;
  border-top: 3px double #b8891f;
  text-align: center;
  font-family: 'Courier Prime', 'Courier New', monospace;
  font-size: 8pt;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #8a6b3a;
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

/**
 * Modo blanco: se vacían las superficies, no se cambia la forma.
 *
 * Mismo criterio que en CLUEDO. Con una excepción que importa: las TIRAS de
 * fragmento conservan su fondo. Vaciarlas ahorraría tinta y dejaría el papel a
 * contraluz, que es exactamente lo que no puede pasar con las cartas del puzle.
 */
const TEMA_BLANCO = `
[data-tema="blanco"] body { background: #fff; }
[data-tema="blanco"] .hoja { background: #fff; background-image: none; box-shadow: none; }
[data-tema="blanco"] .caja,
[data-tema="blanco"] .caja--lapis,
[data-tema="blanco"] .caja--almagre,
[data-tema="blanco"] .aviso { background: #fff; }
[data-tema="blanco"] th { background: #efefef; }
`;

export interface OpcionesDePapiro {
  conBarra?: boolean;
}

export function hojaDePapiro(opciones: OpcionesDePapiro = {}): string {
  return [BASE, TEMA_BLANCO, opciones.conBarra ? CSS_BARRA : ''].join('\n');
}
