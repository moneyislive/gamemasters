/**
 * La imprenta de El Paso de las Sombras: washi, tinta sumi y sello bermellón.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUÉ UNA TERCERA HOJA Y NO UNA GENERALIZADA
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * La cabecera de `momia/estilo.ts` decía: «el día que entre un tercer juego, dos
 * hojas casi iguales sí serán argumento suficiente para extraer la geometría
 * común». Ese día es hoy, y aun así **no se ha hecho**. Merece la pena explicar
 * por qué, porque no es pereza:
 *
 *  1. EL MAESTRO DE ORO SIGUE COMPARANDO LOS DOCUMENTOS DE CLUEDO BYTE A BYTE.
 *     Extraer la geometría a un módulo común significa que la hoja de CLUEDO
 *     pasa a componerse de otra manera; aunque saliera el mismo CSS, cualquier
 *     descuido en el orden de las reglas pone en rojo la red que protege el
 *     único juego en producción. Y la entrega de este juego tiene una regla por
 *     encima de todas: **no tocar los dos que ya funcionan**.
 *  2. LA GEOMETRÍA NO ES LA MISMA. Esta hoja necesita dos cosas que ninguna de
 *     las otras dos tiene: el CARTEL DE PASO, que es una página entera con una
 *     palabra enorme que hay que leer a metro y medio y con poca luz, y las
 *     TIRAS DE HITO agrupadas por paso y por hora, que se dejan en habitaciones
 *     distintas. Lo que se compartiría de verdad son unas treinta líneas de A4 y
 *     saltos de página.
 *  3. LO QUE SÍ SE COMPARTE SE COMPARTE COPIÁNDOLO A CONCIENCIA: A4 con
 *     márgenes de 15 × 14 mm, `print-color-adjust: exact` y
 *     `page-break-inside: avoid` en lo que no se puede partir. Esas medidas
 *     vienen de imprimir de verdad y se respetan al milímetro.
 *
 * Queda anotado en `docs/sombras/DISENO.md` §11 como lo que hay que hacer
 * cuando alguien pueda recapturar el maestro de oro con calma.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LOS KANJI, CON RED
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * A diferencia de los jeroglíficos de la Momia, los kanji SÍ están en casi todos
 * los sistemas: son plano básico y cualquier Windows, macOS o Android moderno
 * trae una fuente que los cubre. Aun así se carga «Noto Serif JP» para la clase
 * `.kanji`, porque una fuente de sistema los pinta con otro grosor que el texto
 * de al lado y en un cartel eso se ve. Y —esto es lo importante— NINGÚN dato
 * viaja solo en un kanji: al lado va siempre su transcripción en letras latinas,
 * que es la que hay que teclear.
 */

/*
 * La barra de impresión flotante es la misma que la de los otros dos, y no es
 * papel: es el botón que se ve en pantalla antes de imprimir. No hay ninguna
 * razón para que cambie de juego a juego.
 */
import { CSS_BARRA } from '../../estilos';

const BASE = `
@import url('https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;600;800&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Courier+Prime:wght@400;700&family=Noto+Serif+JP:wght@400;600&display=swap');

@page { size: A4; margin: 15mm 14mm; }

* { box-sizing: border-box; }

html, body { margin: 0; padding: 0; }

body {
  background: #1a1c1f;
  font-family: 'EB Garamond', Georgia, serif;
  font-size: 12.4pt;
  line-height: 1.52;
  color: #241f1a;
  /* Sin esto el navegador tira los fondos al imprimir y el washi sale blanco. */
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* ---------- La hoja de washi ----------
   El papel japonés de morera no es liso: tiene fibras largas que se ven al
   trasluz y motas más oscuras. Son tres degradados cruzados en ángulos raros —no
   una imagen— porque una textura en base64 pesaría más que todo el documento y
   en papel apenas se distingue de esto. */
.hoja {
  max-width: 190mm;
  margin: 0 auto;
  background: #f4f1e6;
  background-image:
    repeating-linear-gradient(97deg, rgba(120, 105, 78, 0.05) 0 0.5mm, rgba(0, 0, 0, 0) 0.5mm 4.1mm),
    repeating-linear-gradient(8deg, rgba(120, 105, 78, 0.035) 0 0.4mm, rgba(0, 0, 0, 0) 0.4mm 6.3mm),
    radial-gradient(ellipse at 12% 8%, rgba(101, 88, 63, 0.09), transparent 58%),
    radial-gradient(ellipse at 88% 92%, rgba(101, 88, 63, 0.08), transparent 58%);
  padding: 16mm 15mm;
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.55);
}

/* ---------- Tipografía ---------- */

h1, h2, h3 {
  font-family: 'Shippori Mincho', 'Yu Mincho', 'Hiragino Mincho ProN', Georgia, serif;
  margin: 0 0 0.5em;
  letter-spacing: 0.05em;
  color: #1d2f4a;               /* añil */
  page-break-after: avoid;
  break-after: avoid;
}
h1 { font-size: 25pt; line-height: 1.14; text-align: center; color: #241f1a; }
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
  height: 1.6px;
  background: linear-gradient(90deg, #6d6250, rgba(109, 98, 80, 0));
}
h3 { font-size: 12pt; color: #a33327; letter-spacing: 0.09em; }
p { margin: 0 0 0.7em; }
em { color: #5c5343; }
b, strong { color: #1d2f4a; }

/* El bermellón (朱, shu) es el color del sello y del cinabrio: en un documento
   japonés es lo que hay que obedecer o lo que da fe. Aquí, igual. */
.bermellon { color: #a33327; }

.kanji {
  font-family: 'Noto Serif JP', 'Yu Mincho', 'Hiragino Mincho ProN', 'MS Mincho', serif;
  font-weight: 600;
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
  border-bottom: 2px solid #241f1a;
  margin-bottom: 7mm;
}
/* El sello de tinta bermellón: cuadrado, no redondo. Los hanko de documento son
   cuadrados; los redondos son de firma personal. */
.portada .sello {
  display: inline-block;
  font-family: 'Courier Prime', 'Courier New', monospace;
  font-size: 8.5pt;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #fdf6ee;
  background: #a33327;
  padding: 4px 14px;
  margin-bottom: 5mm;
}
.portada .lema { font-style: italic; font-size: 12.5pt; color: #5c5343; margin: 0.4em 0 0; }
.portada .sub {
  font-family: 'Shippori Mincho', Georgia, serif;
  font-size: 9.5pt;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #1d2f4a;
  margin: 0.6em 0 0;
}

/* ---------- Cajas ---------- */

.caja {
  border: 1px solid #8a7f68;
  background: rgba(255, 253, 246, 0.55);
  padding: 5mm 6mm;
  margin: 0 0 5mm;
  page-break-inside: avoid;
  break-inside: avoid;
}
.caja--anil { border: 2px solid #1d2f4a; background: rgba(29, 47, 74, 0.06); }
.caja--bermellon { border: 2px solid #a33327; background: rgba(163, 51, 39, 0.07); }

.aviso {
  border: 3px solid #a33327;
  background: rgba(163, 51, 39, 0.1);
  padding: 5mm;
  text-align: center;
  font-family: 'Shippori Mincho', Georgia, serif;
  font-size: 10.5pt;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: #a33327;
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
  color: #7c7159;
  margin-bottom: 2px;
}

/* ---------- Tablas ---------- */

table { width: 100%; border-collapse: collapse; margin: 0 0 5mm; font-size: 11.5pt; }
th, td { border: 1px solid rgba(92, 83, 67, 0.45); padding: 2.4mm 3mm; text-align: left; vertical-align: top; }
th {
  font-family: 'Shippori Mincho', Georgia, serif;
  font-size: 9.5pt;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: #1d2f4a;
  background: rgba(109, 98, 80, 0.13);
}
/* Un renglón de estas tablas son dos o tres líneas —nombre, jugador, estandarte—
   y partido por la mitad al cambiar de página deja a media persona en cada hoja.
   La guía del paso tiene cuatro tablas largas y es donde se notaba. */
tr { page-break-inside: avoid; break-inside: avoid; }

/* ---------- Listas y renglones ---------- */

ol, ul { padding-left: 6mm; margin: 0 0 0.8em; }
li { margin-bottom: 0.35em; }

.renglon {
  display: block;
  border-bottom: 1px solid rgba(36, 31, 26, 0.4);
  height: 8mm;
  margin-bottom: 2mm;
}
.campo { display: flex; align-items: baseline; gap: 3mm; margin-bottom: 3mm; }
.campo > span:first-child {
  font-family: 'Shippori Mincho', Georgia, serif;
  font-size: 9.5pt;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: #a33327;
  white-space: nowrap;
}
.campo > span:last-child { flex: 1; border-bottom: 1px solid rgba(36, 31, 26, 0.4); height: 7mm; }

/* La casilla que se tacha: el rastro, las prendas, los tramos de la senda. */
.casilla {
  display: inline-block;
  width: 6mm;
  height: 6mm;
  border: 1.4px solid #5c5343;
  margin-right: 2mm;
  vertical-align: middle;
}

/* ---------- El cartel de paso ----------
   UNA PÁGINA POR HABITACIÓN, y la contraseña tiene que leerse a metro y medio
   con la luz apagada y una linterna de móvil. De ahí los 64 pt: se probó con 40
   y a esa distancia dos palabras de cuatro letras que empiezan igual no se
   distinguían, que es exactamente el fallo que arruina la mecánica.

   Y NO SE PONEN AQUÍ EJEMPLOS CON PALABRAS DE VERDAD. Este comentario decía
   antes cuáles eran las dos que se confundían, y las dos están en la tabla de
   contraseñas: como esta hoja de estilos viaja EMBEBIDA en los ocho documentos,
   dos palabras del juego acababan impresas en el código fuente del dosier de los
   jugadores. No es una fuga grave —hay que abrir el HTML para verla— pero es
   gratis no tenerla, y lo caza la comprobación de la trama.

   (Y cuidado al editar este comentario: va dentro de una plantilla de cadena,
   así que un acento grave de más aquí parte el fichero en dos.) */
.cartel {
  min-height: 245mm;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  page-break-after: always;
  break-after: page;
}
.cartel:last-child { page-break-after: auto; break-after: auto; }
.cartel .marco {
  border: 2.5px solid #241f1a;
  padding: 12mm 10mm;
  width: 100%;
}
.cartel .kicker {
  font-family: 'Courier Prime', 'Courier New', monospace;
  font-size: 9pt;
  letter-spacing: 0.34em;
  text-transform: uppercase;
  color: #7c7159;
}
.cartel .nombre {
  font-family: 'Shippori Mincho', Georgia, serif;
  font-size: 30pt;
  line-height: 1.1;
  color: #241f1a;
  margin: 5mm 0 2mm;
}
.cartel .inscripcion { font-style: italic; color: #5c5343; font-size: 12.5pt; margin: 0 0 9mm; }
.cartel .cajon-sena {
  border: 3px double #a33327;
  padding: 7mm 6mm 6mm;
  margin: 0 auto;
  display: inline-block;
  min-width: 110mm;
}
.cartel .cajon-sena .rotulo {
  font-family: 'Courier Prime', 'Courier New', monospace;
  font-size: 9pt;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: #a33327;
  display: block;
  margin-bottom: 3mm;
}
.cartel .palabra {
  font-family: 'Shippori Mincho', Georgia, serif;
  font-weight: 800;
  font-size: 64pt;
  line-height: 1;
  letter-spacing: 0.12em;
  color: #241f1a;
}
.cartel .glifo-sena { font-size: 34pt; color: #a33327; display: block; margin-top: 3mm; }
.cartel .traduccion {
  font-family: 'Courier Prime', 'Courier New', monospace;
  font-size: 8.5pt;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #7c7159;
  margin-top: 3mm;
}
.cartel .pie {
  margin-top: 10mm;
  font-size: 10.5pt;
  color: #5c5343;
  max-width: 130mm;
}

/* ---------- Las tiras que se recortan ----------
   Un hito se deja doblado en la habitación que le toca. Se dobla por la línea de
   puntos: fuera queda el paso y la hora, dentro lo que dice el mojón. */
.tira {
  border: 1.4px solid #5c5343;
  margin: 0 0 4mm;
  page-break-inside: avoid;
  break-inside: avoid;
  /* Opaco de verdad: es lo que impide leer el hito a contraluz. */
  background: #e8e3d2;
  background-image:
    repeating-linear-gradient(94deg, rgba(92, 83, 67, 0.09) 0 0.5mm, rgba(0, 0, 0, 0) 0.5mm 2.9mm),
    repeating-linear-gradient(6deg, rgba(92, 83, 67, 0.07) 0 0.4mm, rgba(0, 0, 0, 0) 0.4mm 3.6mm);
}
.tira .cara { padding: 4mm 5mm 3mm; text-align: center; }
.tira .doblez {
  border-top: 1.1px dashed #5c5343;
  text-align: center;
  font-family: 'Courier Prime', 'Courier New', monospace;
  font-size: 6.5pt;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #7c7159;
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

/* Marca de corte entre tiras. Continua y fina, para no confundirla con el doblez. */
.corte {
  border: 0;
  border-top: 1.3px dashed rgba(36, 31, 26, 0.5);
  margin: 0 0 4mm;
}

/* ---------- Rejilla de dos columnas ---------- */
.rejilla { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }

/* ---------- El mon: un blasón en un círculo ---------- */
.mon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 13mm;
  height: 13mm;
  border: 1.6px solid #241f1a;
  border-radius: 50%;
  font-family: 'Noto Serif JP', serif;
  font-size: 12pt;
  color: #241f1a;
  vertical-align: middle;
  margin-right: 2.5mm;
}

/* ---------- Ornamentos y pies ---------- */

.ornamento {
  text-align: center;
  color: #8a7f68;
  font-size: 12pt;
  letter-spacing: 0.5em;
  margin: 5mm 0;
}
.pie-documento {
  margin-top: 7mm;
  padding-top: 4mm;
  border-top: 2px solid #241f1a;
  text-align: center;
  font-family: 'Courier Prime', 'Courier New', monospace;
  font-size: 8pt;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #7c7159;
}

/* ---------- Las reglas del dosier, a dos columnas ----------
   Trece reglas en una sola columna ocupaban una cara entera del dosier y lo
   empujaban a una tercera, que es justo lo que este documento no se puede
   permitir: la tercera cara de uno cae en la hoja del siguiente. A dos columnas
   caben en la mitad sin quitar una palabra, que era la otra salida y la mala.

   La propiedad break-inside en cada regla evita que un título se quede al pie de
   una columna y su texto arranque en la siguiente. Sin acentos graves aquí: este
   bloque vive dentro de una plantilla de JS y uno solo la cierra en seco. */

.reglas { column-count: 2; column-gap: 7mm; }
.reglas p {
  break-inside: avoid;
  page-break-inside: avoid;
  margin: 0 0 2.6mm;
  font-size: 10.6pt;
  line-height: 1.44;
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
 * Mismo criterio que en los otros dos, y con las MISMAS DOS EXCEPCIONES, que en
 * este juego son más importantes todavía:
 *
 *   · Las TIRAS de hito conservan su fondo. Vaciarlas ahorraría tinta y dejaría
 *     el papel translúcido, que es exactamente lo que no puede pasar con las
 *     piezas del rompecabezas.
 *   · El SELLO de la contraseña conserva su marco. Es lo que hay que localizar
 *     de un vistazo desde la puerta, y sin marco se pierde en la página.
 */
const TEMA_BLANCO = `
[data-tema="blanco"] body { background: #fff; }
[data-tema="blanco"] .hoja { background: #fff; background-image: none; box-shadow: none; }
[data-tema="blanco"] .caja,
[data-tema="blanco"] .caja--anil,
[data-tema="blanco"] .caja--bermellon,
[data-tema="blanco"] .aviso { background: #fff; }
[data-tema="blanco"] .portada .sello { background: #fff; color: #a33327; border: 1.4px solid #a33327; }
[data-tema="blanco"] th { background: #efefef; }
`;

export interface OpcionesDeWashi {
  conBarra?: boolean;
}

export function hojaDeWashi(opciones: OpcionesDeWashi = {}): string {
  return [BASE, TEMA_BLANCO, opciones.conBarra ? CSS_BARRA : ''].join('\n');
}
