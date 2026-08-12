/**
 * La imprenta de los documentos legales: el papel en el que se imprimen todos.
 *
 * POR QUÉ EXISTE. La política de privacidad traía su hoja de estilos dentro, y
 * en cuanto aparecieron el aviso legal y los términos había tres copias de las
 * mismas cuarenta líneas de CSS. No es una cuestión de elegancia: son documentos
 * que se revisan a la vez y se enseñan seguidos —quien revisa una tienda los
 * abre uno detrás de otro—, y tres copias divergen sin que nadie lo note, porque
 * un documento con la tipografía cambiada no da ningún error. Se ve raro y ya
 * está.
 *
 * LA BRÚJULA, que es la parte que no es decorativa. Los tres documentos se
 * enlazan entre sí desde la cabecera. Las tiendas piden la política de
 * privacidad y los términos de uso por separado, y quien llega a uno de ellos
 * —desde la ficha de la app, desde un correo de invitación, desde la puerta del
 * taller— tiene que poder llegar al resto sin volver atrás ni adivinar la
 * dirección. Un documento legal suelto, sin camino hacia los otros dos, es medio
 * documento.
 *
 * SIN JAVASCRIPT, SIN TIPOGRAFÍAS DE FUERA Y SIN NADA QUE PEDIR A UN TERCERO.
 * Estas páginas se abren desde el móvil de alguien invitado que solo quiere
 * saber qué se hace con su foto, y desde la máquina de quien revisa la app. Las
 * dos situaciones toleran mal que una hoja de estilos remota tarde o falle. Y
 * hay un motivo de fondo más incómodo: un documento que cuenta a quién se le
 * mandan tus datos no puede, al abrirse, mandarle tu dirección IP a un tercero
 * más.
 */

/** Cómo se llama y dónde vive cada documento. Es la lista de la brújula. */
export const DOCUMENTOS = [
  { ruta: '/privacidad', titulo: 'Política de privacidad', corto: 'Privacidad' },
  { ruta: '/aviso-legal', titulo: 'Aviso legal', corto: 'Aviso legal' },
  { ruta: '/terminos', titulo: 'Términos de uso', corto: 'Términos de uso' },
] as const;

/** La dirección de uno de los tres documentos. */
export type RutaLegal = (typeof DOCUMENTOS)[number]['ruta'];

/** Una sección con su encabezado. El cuerpo ya viene en HTML. */
export interface SeccionLegal {
  titulo: string;
  cuerpo: string;
}

/**
 * Escapa texto para meterlo dentro del HTML.
 *
 * NO ES CEREMONIA. Buena parte de lo que se imprime en estos documentos sale de
 * variables de entorno —el nombre del responsable, su dirección postal—, y una
 * razón social perfectamente legítima puede llevar un `&` («Peidro & hijos») que
 * sin escapar rompe la página, o unas comillas que se comen el atributo
 * siguiente. Quien rellena esas variables está configurando un servidor, no
 * escribiendo HTML, y no tiene por qué saberlo.
 */
export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** La cabecera con los otros dos documentos. El actual se marca y no se enlaza. */
function brujula(actual: RutaLegal): string {
  const piezas = DOCUMENTOS.map((doc) =>
    doc.ruta === actual
      ? `<span class="aqui" aria-current="page">${doc.corto}</span>`
      : `<a href="${doc.ruta}">${doc.corto}</a>`,
  );
  return `<nav class="brujula">${piezas.join('<span class="sep">·</span>')}</nav>`;
}

/**
 * El documento entero, en HTML autocontenido.
 *
 * Se lee en claro y en oscuro porque hay quien lo abrirá de noche desde la cama,
 * y porque el navegador de un móvil en modo oscuro con un documento que solo
 * previó el claro deja un texto gris sobre blanco casi ilegible.
 */
export function documentoLegal(opciones: {
  titulo: string;
  ruta: RutaLegal;
  secciones: SeccionLegal[];
  revisadaEl: string;
  /** Se imprime justo debajo del título, antes de las secciones. */
  entradilla?: string;
  /** El pie, con el responsable. Ya viene en HTML. */
  pie: string;
}): string {
  const cuerpo = opciones.secciones
    .map((s) => `<section><h2>${s.titulo}</h2>${s.cuerpo}</section>`)
    .join('\n');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escaparHtml(opciones.titulo)} · GameMasters</title>
<style>
  :root {
    color-scheme: light dark;
    --tinta: #1f120c;
    --papel: #f4efe2;
    --oro: #8a6a17;
    --tenue: #5d5145;
    --alarma: #8c2f16;
  }
  @media (prefers-color-scheme: dark) {
    :root { --tinta: #ece3cf; --papel: #0b1710; --oro: #c9a227; --tenue: #a09781; --alarma: #e08163; }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 2.5rem 1.25rem 4rem;
    background: var(--papel);
    color: var(--tinta);
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 1.05rem;
    line-height: 1.65;
  }
  main { max-width: 40rem; margin: 0 auto; }
  h1 {
    font-size: 1.9rem;
    line-height: 1.2;
    margin: 0 0 .25rem;
    letter-spacing: .01em;
  }
  .sello {
    text-transform: uppercase;
    letter-spacing: .18em;
    font-size: .72rem;
    color: var(--oro);
    margin: 0 0 1.5rem;
  }
  .brujula {
    font-size: .85rem;
    margin: 0 0 2.5rem;
    padding-bottom: 1.25rem;
    border-bottom: 1px solid color-mix(in srgb, var(--oro) 35%, transparent);
  }
  .brujula .sep { color: var(--tenue); margin: 0 .5rem; }
  .brujula .aqui { color: var(--tenue); font-style: italic; }
  h2 {
    font-size: 1.15rem;
    margin: 2.5rem 0 .5rem;
    padding-top: 1.5rem;
    border-top: 1px solid color-mix(in srgb, var(--oro) 35%, transparent);
  }
  section:first-of-type h2 { border-top: 0; padding-top: 0; margin-top: 1.5rem; }
  p, li { margin: .7rem 0; }
  ul { padding-left: 1.15rem; }
  a { color: var(--oro); }
  dl { margin: .7rem 0; }
  dt {
    font-size: .78rem;
    text-transform: uppercase;
    letter-spacing: .12em;
    color: var(--tenue);
    margin-top: .9rem;
  }
  dd { margin: .1rem 0 0; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: .95rem; }
  th, td {
    text-align: left;
    padding: .5rem .6rem .5rem 0;
    border-bottom: 1px solid color-mix(in srgb, var(--oro) 22%, transparent);
    vertical-align: top;
  }
  th { font-size: .78rem; text-transform: uppercase; letter-spacing: .1em; color: var(--tenue); font-weight: normal; }
  code { font-family: ui-monospace, 'Courier New', monospace; font-size: .92em; }
  /* Lo que falta se ve. Un hueco en blanco se lee como un descuido de maquetación. */
  .pendiente {
    color: var(--alarma);
    font-style: italic;
    border-bottom: 1px dotted currentColor;
  }
  .aviso-incompleto {
    margin: 1.5rem 0;
    padding: .9rem 1rem;
    border-left: 3px solid var(--alarma);
    background: color-mix(in srgb, var(--alarma) 10%, transparent);
    font-size: .95rem;
  }
  footer {
    margin-top: 3rem;
    padding-top: 1.5rem;
    border-top: 1px solid color-mix(in srgb, var(--oro) 35%, transparent);
    color: var(--tenue);
    font-size: .9rem;
  }
</style>
</head>
<body>
<main>
  <h1>${escaparHtml(opciones.titulo)}</h1>
  <p class="sello">GameMasters · harkania.com</p>
  ${brujula(opciones.ruta)}
  ${opciones.entradilla ?? ''}
  ${cuerpo}
  <footer>
    <p>Última revisión: ${opciones.revisadaEl}.</p>
    ${opciones.pie}
  </footer>
</main>
</body>
</html>`;
}
