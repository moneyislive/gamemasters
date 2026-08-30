/**
 * La imprenta de El Nudo de Valdehierro: papel de estraza, tinta de copia y sello.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DE DÓNDE SALE ESTA HOJA, Y NO ES DE UN MOODBOARD
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Un impreso de ferrocarril español de 1927 tenía tres tintas y ninguna era por
 * gusto: el NEGRO de la tipografía del formulario, el VIOLETA del hectógrafo
 * —la copia de gelatina, que es lo que se usaba para tirar cuarenta partes
 * iguales sin imprenta— y el ROJO del tampón de caucho con el que la jefatura
 * sellaba lo que era firme. Aquí se usan las tres para lo mismo que servían:
 * negro lo impreso, violeta lo que se rellenó a mano en la estación y rojo lo
 * que no se discute.
 *
 * El papel es estraza, que es lo que había: pardo, barato y con la fibra a la
 * vista. En pantalla se ve caro; en papel, y esto importa, **imprime bien en
 * una impresora doméstica de chorro**, que es donde va a acabar. Los fondos son
 * planos y de poca saturación a propósito: un degradado bonito sale a rayas.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUÉ UNA CUARTA HOJA Y NO UNA GENERALIZADA
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `sombras/estilo.ts` ya se hizo esta pregunta y contestó que no, con tres
 * razones. Las tres siguen valiendo y hay una cuarta que es de este juego:
 *
 *  1. EL MAESTRO DE ORO COMPARA LOS DOCUMENTOS DE CLUEDO BYTE A BYTE. Extraer
 *     la geometría común cambiaría cómo se compone su hoja, y la regla de esta
 *     entrega es no tocar los tres que ya funcionan.
 *  2. LA GEOMETRÍA NO ES LA MISMA. Esta hoja necesita dos cosas que ninguna de
 *     las otras tres tiene: LA CUADRÍCULA del cuadro de marchas —seis por seis,
 *     con casillas de tachar a lápiz y que tienen que ser cómodas de tachar con
 *     un lápiz de verdad— y LAS TIRAS DE TELEGRAMA, que se recortan y se meten
 *     en sobres distintos, así que llevan línea de corte y no se pueden partir
 *     entre dos páginas.
 *  3. LO QUE SÍ SE COMPARTE SE COMPARTE COPIÁNDOLO A CONCIENCIA: A4 con
 *     márgenes de 15 × 14 mm, `print-color-adjust: exact` y
 *     `page-break-inside: avoid` en lo que no se puede partir. Esas medidas
 *     vienen de imprimir de verdad.
 *  4. Y LA CUARTA: aquí el papel no es ambientación, es MATERIAL DE JUEGO. La
 *     cuadrícula se rellena a lápiz durante hora y media y las tiras se pasan de
 *     mano. Una hoja que se comparte con otros tres juegos acaba optimizada para
 *     leerse, y esta hay que poder escribirla.
 *
 * Queda anotado en `docs/nudo/DISENO.md` §11 como lo que hay que hacer cuando
 * alguien pueda recapturar el maestro de oro con calma.
 */
import { CSS_BARRA } from '../../estilos';

const BASE = `
@import url('https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Oswald:wght@400;500;600&display=swap');

@page { size: A4; margin: 15mm 14mm; }

* { box-sizing: border-box; }

html, body { margin: 0; padding: 0; }

body {
  background: #23211d;
  font-family: 'EB Garamond', Georgia, serif;
  font-size: 12.4pt;
  line-height: 1.5;
  color: #241f18;
  /* Sin esto el navegador tira los fondos al imprimir y la estraza sale blanca. */
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* ---- La hoja ---- */

.hoja {
  max-width: 880px;
  margin: 0 auto;
  padding: 26px 30px 34px;
  background: #ded2bb;
  /*
   * La fibra del papel de estraza. Son dos gradientes de un pelo de opacidad y
   * no una imagen: una textura en base64 haría el HTML del paquete tres veces
   * más grande, y el dosier de cada persona ya incrusta las fotos de todos.
   */
  background-image:
    repeating-linear-gradient(90deg, rgba(120,101,70,0.035) 0 1px, transparent 1px 3px),
    repeating-linear-gradient(0deg, rgba(120,101,70,0.03) 0 1px, transparent 1px 4px);
  box-shadow: 0 0 0 1px rgba(60,48,30,0.25);
}

@media print {
  body { background: #fff; }
  .hoja { max-width: none; margin: 0; padding: 0; box-shadow: none; }
  .no-imprimir { display: none !important; }
}

/* ---- Modo blanco: para imprimir en una láser sin gastar tóner ---- */

html[data-tema='blanco'] body { background: #fff; color: #111; }
html[data-tema='blanco'] .hoja { background: #fff; background-image: none; box-shadow: none; }
html[data-tema='blanco'] .caja { background: #fff; }
html[data-tema='blanco'] .sello,
html[data-tema='blanco'] .tampon { color: #111; border-color: #111; background: #fff; }

/* ---- Tipografía ---- */

h1, h2, h3 {
  font-family: 'Oswald', 'Arial Narrow', sans-serif;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin: 0 0 6px;
  color: #2b241a;
}
h1 { font-size: 25pt; line-height: 1.1; }
h2 {
  font-size: 13.5pt;
  margin-top: 18px;
  padding-bottom: 3px;
  border-bottom: 1.5px solid #6b5636;
}
h3 { font-size: 11.5pt; margin-top: 12px; color: #4a3c26; }
p { margin: 0 0 8px; }
strong { font-weight: 600; }

/* ---- La portada de cada documento ---- */

.portada {
  text-align: center;
  padding: 8px 0 14px;
  border-bottom: 3px double #6b5636;
  margin-bottom: 16px;
}
.portada .lema {
  font-style: italic;
  color: #5b4b31;
  margin: 4px 0 0;
}
.portada .sub {
  font-family: 'Courier Prime', monospace;
  font-size: 9.5pt;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #7b6644;
  margin: 8px 0 0;
}

/* El sello de caucho de la jefatura. Rojo, torcido y con el borde comido. */
.sello {
  display: inline-block;
  font-family: 'Oswald', sans-serif;
  font-size: 9pt;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #9a2f22;
  border: 2px solid #9a2f22;
  border-radius: 3px;
  padding: 3px 10px;
  transform: rotate(-2.2deg);
  opacity: 0.88;
}

/* ---- Cajas ---- */

.caja {
  border: 1px solid #8a7350;
  background: rgba(255,252,244,0.5);
  padding: 10px 13px;
  margin: 10px 0;
  page-break-inside: avoid;
}
.caja--roja { border-color: #9a2f22; border-left-width: 4px; }
.caja--violeta { border-color: #5a4a86; border-left-width: 4px; }
.junto { page-break-inside: avoid; }

.etiqueta {
  display: block;
  font-family: 'Courier Prime', monospace;
  font-size: 8.5pt;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #7b6644;
  margin-bottom: 5px;
}

.aviso {
  font-family: 'Oswald', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 11pt;
  color: #9a2f22;
  border-top: 2px solid #9a2f22;
  border-bottom: 2px solid #9a2f22;
  padding: 7px 0;
  text-align: center;
  margin: 14px 0;
}

/* ---- Lo escrito a mano en la estación: tinta violeta de copia ---- */

.copia {
  font-family: 'Courier Prime', monospace;
  color: #5a4a86;
}

/* ---- El telegrama ---- */

/*
 * LAS TIRAS SE RECORTAN, así que llevan línea de corte y no se parten entre
 * páginas. El texto va en versalitas de máquina porque un telegrama se
 * transmitía sin minúsculas: no había forma de mandarlas.
 */
.tira {
  border: 1px dashed #6b5636;
  padding: 9px 12px;
  margin: 0 0 7px;
  background: rgba(255,253,247,0.72);
  page-break-inside: avoid;
}
.tira .cabecera {
  font-family: 'Courier Prime', monospace;
  font-size: 8pt;
  letter-spacing: 0.12em;
  color: #8a7350;
  border-bottom: 1px solid #cbbb9a;
  padding-bottom: 3px;
  margin-bottom: 5px;
  display: flex;
  justify-content: space-between;
}
.tira .texto {
  font-family: 'Courier Prime', monospace;
  font-size: 11.5pt;
  font-weight: 700;
  line-height: 1.42;
  letter-spacing: 0.02em;
  color: #241f18;
}
.corte {
  border: 0;
  border-top: 1px dashed #a08d68;
  margin: 12px 0;
}

/* ---- La cuadrícula del cuadro de marchas ---- */

/*
 * LA MEDIDA DE LA CASILLA NO ES ESTÉTICA. Se rellena a lápiz durante hora y
 * media, se tacha y se borra: por debajo de 9 mm no cabe una equis a mano y por
 * encima de 12 no entran seis columnas con los nombres de los convoyes en un A4.
 */
table.cuadricula {
  width: 100%;
  border-collapse: collapse;
  margin: 10px 0 6px;
  page-break-inside: avoid;
}
table.cuadricula th,
table.cuadricula td {
  border: 1px solid #6b5636;
  padding: 0;
  text-align: center;
  vertical-align: middle;
}
table.cuadricula thead th {
  font-family: 'Courier Prime', monospace;
  font-size: 9pt;
  font-weight: 700;
  letter-spacing: 0.04em;
  background: rgba(107,86,54,0.13);
  height: 11mm;
  padding: 2px 3px;
}
table.cuadricula tbody th {
  font-family: 'EB Garamond', serif;
  font-size: 10.5pt;
  font-weight: 500;
  text-align: left;
  padding: 3px 7px;
  width: 58mm;
  background: rgba(107,86,54,0.06);
}
table.cuadricula tbody td { height: 10.5mm; }

/* ---- Tablas normales ---- */

table {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0;
  font-size: 11pt;
}
th, td {
  border-bottom: 1px solid #c3b190;
  padding: 5px 7px;
  text-align: left;
  vertical-align: top;
}
thead th {
  font-family: 'Courier Prime', monospace;
  font-size: 8.5pt;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #6b5636;
  border-bottom: 1.5px solid #6b5636;
}

/* ---- Campos que se rellenan a mano ---- */

.campo {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 7px 0;
}
.campo > span:first-child {
  font-family: 'Courier Prime', monospace;
  font-size: 9pt;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #7b6644;
  white-space: nowrap;
}
.campo > span:last-child {
  flex: 1;
  border-bottom: 1px solid #8a7350;
  min-height: 15px;
}
.renglon {
  display: block;
  border-bottom: 1px solid #8a7350;
  height: 17px;
  margin: 7px 0;
}
.casilla {
  display: inline-block;
  width: 11px;
  height: 11px;
  border: 1.4px solid #6b5636;
  vertical-align: -1px;
}

/* ---- El cartel de puesto: una página entera, legible a dos metros ---- */

.cartel {
  page-break-after: always;
  text-align: center;
  padding: 34mm 0 0;
  min-height: 235mm;
}
.cartel .kicker {
  font-family: 'Courier Prime', monospace;
  font-size: 12pt;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: #7b6644;
}
.cartel .nombre {
  font-family: 'Oswald', sans-serif;
  font-size: 46pt;
  line-height: 1.05;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  margin: 12mm 0 6mm;
  color: #241f18;
}
.cartel .oficio {
  font-family: 'Oswald', sans-serif;
  font-size: 26pt;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #9a2f22;
  border-top: 3px solid #9a2f22;
  border-bottom: 3px solid #9a2f22;
  display: inline-block;
  padding: 5mm 12mm;
  margin-top: 4mm;
}
.cartel .pie {
  margin-top: 18mm;
  font-size: 12pt;
  color: #5b4b31;
  font-style: italic;
}
.cartel:last-child { page-break-after: auto; }

/* ---- Página suelta ---- */

.pagina { page-break-before: always; }
.pagina:first-child { page-break-before: auto; }

/* ---- Reglas numeradas ---- */

.reglas { margin: 0; padding-left: 18px; }
.reglas li { margin-bottom: 7px; }
.reglas li strong { display: block; }

/* ---- Ornamento ---- */

.ornamento {
  text-align: center;
  color: #8a7350;
  letter-spacing: 0.7em;
  margin: 16px 0 10px;
  font-size: 11pt;
}

.pie-documento {
  margin-top: 22px;
  padding-top: 7px;
  border-top: 1px solid #a08d68;
  font-family: 'Courier Prime', monospace;
  font-size: 8pt;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #8a7350;
  text-align: center;
}
`;

/** La hoja entera, con la barra de impresión solo si se pide. */
export function hojaDeEstraza({ conBarra }: { conBarra: boolean }): string {
  return conBarra ? `${BASE}\n${CSS_BARRA}` : BASE;
}
