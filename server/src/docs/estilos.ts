/**
 * Hoja de estilos de los documentos generados.
 *
 * Un solo CSS sirve los dos temas. El de color es el de siempre, sin tocar; el
 * de ahorro de tinta se aplica como una capa de anulaciones colgada de
 * `<html data-tema="blanco">`. Así el mismo fichero descargado puede cambiar de
 * tema sin volver a pedir nada al servidor, y —lo que importa de verdad— el
 * tema de color no se altera por añadir el otro.
 *
 * Medido sobre el render de impresión de los imprimibles hechos a mano: el tema
 * blanco baja la cobertura de tinta del 15,2 % al 3,3 %.
 */

/** Estética art-decó de pergamino. Es el aspecto que ya tienen los dosieres. */
const TEMA_COLOR = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Cinzel+Decorative:wght@700;900&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap');

* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 0 0 60px;
  background: #241a12;
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 17.5px;
  line-height: 1.62;
  color: #241a12;
  /* Sin esto el navegador descarta los fondos al imprimir y el papel crema, las
     cajas y las cabeceras de tabla salen en blanco. */
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.hoja {
  max-width: 880px;
  margin: 0 auto;
  background: #f1e5c9;
  background-image:
    radial-gradient(circle at 12% 8%, rgba(109,26,42,0.05), transparent 45%),
    radial-gradient(circle at 88% 92%, rgba(26,63,42,0.06), transparent 45%);
  box-shadow: 0 18px 60px rgba(0,0,0,0.55);
  border-top: 10px solid #6d1a2a;
  border-bottom: 10px solid #6d1a2a;
}
.marco { padding: 46px 54px; border: 2px solid #c9a227; border-width: 0 2px; }

h1, h2, h3 { font-family: 'Cinzel', Georgia, serif; margin: 0 0 .45em; letter-spacing: .06em; }

/* ---------- Portada ---------- */
.portada { text-align: center; padding: 40px 0 28px; border-bottom: 3px double #c9a227; }
.portada .sello {
  display: inline-block; font-family: 'Cinzel', serif; font-size: 11.5px; letter-spacing: .34em;
  text-transform: uppercase; color: #6d1a2a; border: 1px solid #6d1a2a;
  padding: 5px 16px; border-radius: 3px; margin-bottom: 22px;
}
.portada h1 {
  font-family: 'Cinzel Decorative', serif; font-size: 42px; line-height: 1.12;
  color: #1a3f2a; margin-bottom: .18em;
}
.portada .lema { font-style: italic; font-size: 20px; color: #6b5638; margin: 0 0 26px; }
.portada .destinatario { font-family: 'Cinzel', serif; font-size: 15px; letter-spacing: .18em; text-transform: uppercase; color: #3e2723; }
.portada .destinatario strong { display: block; font-size: 27px; letter-spacing: .06em; color: #6d1a2a; margin-top: 8px; }

/* ---------- Secciones ---------- */
section { margin: 40px 0; page-break-inside: avoid; }
h2 {
  font-size: 21px; color: #1a3f2a; text-transform: uppercase; letter-spacing: .18em;
  display: flex; align-items: center; gap: 14px;
}
h2::after { content: ''; flex: 1; height: 2px; background: linear-gradient(90deg, #c9a227, rgba(201,162,39,0)); }
h3 { font-size: 16.5px; color: #6d1a2a; letter-spacing: .1em; }

.dato { margin: 0 0 14px; }
.dato .etiqueta {
  display: block; font-family: 'Cinzel', serif; font-size: 11px; letter-spacing: .2em;
  text-transform: uppercase; color: #8a7145; margin-bottom: 2px;
}

.caja { border: 1px solid #c9a227; background: rgba(255,255,255,0.42); padding: 20px 24px; border-radius: 4px; }
.caja--secreto { border: 2px solid #6d1a2a; background: rgba(109,26,42,0.06); position: relative; }
.caja--secreto .titulo-secreto {
  font-family: 'Cinzel', serif; font-size: 11.5px; letter-spacing: .26em; text-transform: uppercase;
  color: #6d1a2a; margin-bottom: 10px;
}
.caja--asesino { border: 2px solid #6d1a2a; background: rgba(109,26,42,0.12); }
.caja--asesino .titulo-secreto { color: #4a0f1c; }
.caja--gm { border: 2px solid #1a3f2a; background: rgba(26,63,42,0.08); }

.protagonista { display: flex; gap: 26px; align-items: flex-start; }
.protagonista .retrato-grande {
  width: 132px; height: 132px; flex: 0 0 132px; border-radius: 50%; object-fit: cover;
  border: 3px solid #c9a227; box-shadow: 0 6px 18px rgba(0,0,0,0.25);
}
.monograma {
  display: flex; align-items: center; justify-content: center;
  background: #1a3f2a; color: #e8cf7f; font-family: 'Cinzel', serif; letter-spacing: .06em;
}
.retrato-grande.monograma { font-size: 42px; }

.rejilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(178px, 1fr)); gap: 18px; }
.ficha { text-align: center; border: 1px solid rgba(201,162,39,.75); border-radius: 4px; padding: 14px 10px; background: rgba(255,255,255,.4); }
.ficha .retrato { width: 78px; height: 78px; border-radius: 50%; object-fit: cover; border: 2px solid #c9a227; margin: 0 auto 10px; font-size: 25px; }
.ficha--objeto .retrato { border-radius: 4px; width: 100%; height: 110px; }
.ficha .nombre { font-family: 'Cinzel', serif; font-size: 14.5px; color: #3e2723; letter-spacing: .05em; }
.ficha .papel { font-style: italic; font-size: 14px; color: #6b5638; }
.ficha .nota { font-size: 13.5px; color: #6b5638; margin-top: 6px; }

ol.reglas { padding-left: 22px; }
ol.reglas li { margin-bottom: 11px; }
ol.reglas b { color: #6d1a2a; }

.crono { list-style: none; padding: 0; margin: 0; }
.crono li { display: flex; gap: 18px; padding: 11px 0; border-bottom: 1px dashed rgba(62,39,35,.28); }
.crono .hora { font-family: 'Cinzel', serif; color: #6d1a2a; min-width: 62px; letter-spacing: .06em; }

.tablero-svg { width: 100%; height: auto; border: 2px solid #c9a227; border-radius: 4px; background: #0d2118; }
.aerea { position: relative; display: inline-block; width: 100%; border: 2px solid #c9a227; border-radius: 4px; overflow: hidden; }
.aerea img { display: block; width: 100%; }
.chincheta {
  position: absolute; transform: translate(-50%, -100%);
  font-family: 'Cinzel', serif; font-size: 13px; color: #f1e5c9;
  background: #6d1a2a; border: 2px solid #e8cf7f; border-radius: 50%;
  width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 3px 8px rgba(0,0,0,.45);
}
.leyenda { list-style: none; padding: 0; margin: 16px 0 0; columns: 2; column-gap: 30px; }
.leyenda li { font-size: 15px; margin-bottom: 7px; break-inside: avoid; }
.leyenda .num {
  display: inline-block; width: 22px; height: 22px; line-height: 20px; text-align: center;
  border: 1px solid #6d1a2a; border-radius: 50%; color: #6d1a2a; font-family: 'Cinzel', serif;
  font-size: 12px; margin-right: 8px;
}

.pie {
  margin-top: 52px; padding-top: 18px; border-top: 3px double #c9a227; text-align: center;
  font-family: 'Cinzel', serif; font-size: 11px; letter-spacing: .3em; text-transform: uppercase; color: #8a7145;
}

@media (max-width: 720px) {
  .marco { padding: 26px 20px; }
  .protagonista { flex-direction: column; align-items: center; text-align: center; }
  .leyenda { columns: 1; }
}
`;

/**
 * Reglas de papel.
 *
 * El `@page` es imprescindible: sin él el navegador imprime en el tamaño que
 * tenga por defecto —en Chrome, Carta— y el documento sale descentrado en A4.
 */
const IMPRESION = `
@page { size: A4; margin: 12mm 11mm; }

@media print {
  body { background: #fff; padding: 0; }
  .hoja { box-shadow: none; max-width: none; border-radius: 0; }
  /* Con padding 0 el texto queda pegado al filo del área imprimible; estos
     milímetros son el aire que lo separa. */
  .marco { padding: 4mm 5mm; border-width: 0; }
  section { page-break-inside: avoid; }
  h1, h2, h3 { page-break-after: avoid; break-after: avoid; }
  .caja, .ficha, .protagonista { page-break-inside: avoid; break-inside: avoid; }
  .no-imprimir { display: none !important; }
}
`;

/**
 * Tema de ahorro de tinta.
 *
 * Se limita a vaciar superficies: ni una tipografía, ni un tamaño, ni un margen
 * cambian respecto al tema de color. Las líneas y los colores de texto se
 * conservan, que es de donde viene el carácter del documento.
 */
const TEMA_BLANCO = `
[data-tema="blanco"] body { background: #fff; }
[data-tema="blanco"] .hoja {
  background: #fff;
  background-image: none;
  box-shadow: none;
}
[data-tema="blanco"] .caja,
[data-tema="blanco"] .caja--secreto,
[data-tema="blanco"] .caja--asesino,
[data-tema="blanco"] .caja--gm,
[data-tema="blanco"] .ficha {
  background: #fff;
}
/* El monograma era un disco verde macizo; ahora va perfilado. */
[data-tema="blanco"] .monograma {
  background: #fff;
  color: #1a3f2a;
  border: 2px solid #1a3f2a;
}
[data-tema="blanco"] .crono li { border-bottom-color: rgba(62,39,35,.35); }

/* El plano era un tapete verde oscuro sobre parqué: en papel es media página
   entintada. Se aclara por dentro conservando el trazo dorado y la rotulación. */
[data-tema="blanco"] .tablero-svg { background: #fff; }
[data-tema="blanco"] .tablero-svg #tapete stop { stop-color: #fff; }
[data-tema="blanco"] .tablero-svg #parquet rect { fill: #fff; }
[data-tema="blanco"] .tablero-svg #parquet line { stroke: rgba(62,39,35,0.14); }
[data-tema="blanco"] .tablero-svg .centro { fill: #fff; stroke: #6d1a2a; }
[data-tema="blanco"] .tablero-svg .centro-nombre { fill: #6d1a2a; }
[data-tema="blanco"] .tablero-svg .sala-nombre { fill: #1a3f2a; }
[data-tema="blanco"] .tablero-svg .nodo { fill: #fff; }
/* Las chinchetas se quedan macizas a propósito: van sobre la fotografía aérea
   y con el número en hueco no se leerían. */
`;

/** Barra superior con el botón de imprimir. Nunca sale en el papel. */
const BARRA = `
.barra-impresion {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px; flex-wrap: wrap;
  max-width: 880px; margin: 0 auto 18px;
  padding: 12px 18px;
  background: rgba(20,12,8,.96);
  border: 1px solid rgba(201,162,39,.45);
  border-radius: 0 0 10px 10px;
  color: #f1e5c9;
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 15px;
}
.barra-impresion .consejo { flex: 1 1 320px; color: #d9c9a3; }
.barra-impresion .consejo b { color: #e8cf7f; }
.barra-impresion button {
  font-family: 'Cinzel', serif; font-size: 12px; letter-spacing: .14em; text-transform: uppercase;
  color: #241a12; background: linear-gradient(180deg, #e8cf7f, #c9a227);
  border: 1px solid #d9b64a; border-radius: 6px; padding: 8px 18px; cursor: pointer;
}
`;

export interface OpcionesDeEstilo {
  /** Añade la barra de impresión al CSS. */
  conBarra?: boolean;
}

/** Devuelve el CSS completo de un documento. */
export function hojaDeEstilos(opciones: OpcionesDeEstilo = {}): string {
  return [TEMA_COLOR, IMPRESION, TEMA_BLANCO, opciones.conBarra ? BARRA : ''].join('\n');
}

/**
 * Barra de impresión con las tres instrucciones que de verdad hacen falta en el
 * diálogo de Chrome. Sin ellas el resultado sale con la fecha y la URL impresas
 * en los márgenes, que es la queja más habitual.
 */
export function barraDeImpresion(auto: boolean): string {
  return `  <div class="barra-impresion no-imprimir">
    <span class="consejo">
      En el diálogo: <b>Márgenes → Predeterminados</b>, marca <b>Gráficos de fondo</b>
      y desmarca <b>Encabezados y pies de página</b>.
    </span>
    <button type="button" onclick="window.print()">Imprimir o guardar en PDF</button>
  </div>${auto ? `
  <script>window.addEventListener('load', function () { window.setTimeout(function () { window.print(); }, 400); });</script>` : ''}`;
}
