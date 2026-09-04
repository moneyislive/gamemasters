/**
 * ═══ LA GRAMÁTICA DE LA SALA, COMPROBADA ═══
 *
 * Este comprobador no existe porque hubiera una regla bonita que escribir. Existe
 * porque hay un patrón demostrado en este repositorio: una corrección se hace en
 * un fichero, se razona por escrito con sus cifras, y NO LLEGA a los ficheros de
 * al lado. No por descuido de nadie: porque son ficheros distintos y nada los ata.
 *
 * Los tres casos que lo demostraron, todos reales y todos medidos:
 *
 *   · EL RAÍL DE AFORO estaba escrito TRES veces. Al medirlo salió que las muescas
 *     apagadas a blanco 34 % se separan de su fondo por 1,80:1 en ámbar, o sea que
 *     desaparecen —y son las que dibujan el largo, que es lo único que el raíl
 *     informa—. La corrección subió a 70 % en la portada y las otras dos copias se
 *     quedaron en `SALA.filoVivo`, blanco al 14 %.
 *
 *   · APAGAR UN BOTÓN CON `opacity`. `retablo.tsx` dedica ocho renglones a explicar
 *     por qué no se hace —apaga también la letra, y una ayuda en `tenue` cae de
 *     5,95 a 2,32:1— y el fichero de al lado lo seguía haciendo en dos sitios.
 *
 *   · BLANCO SOBRE EL ACENTO CLARO. Da 1,98:1 en ámbar y 2,11 en verde. Se corrigió
 *     dos veces en la Sala, y seguía escrito —y DEFENDIDO en un comentario como
 *     criterio— en La Frente y en el lienzo.
 *
 * Así que lo que se comprueba aquí no es estilo: son cuatro parejas de color y de
 * forma que ya han fallado, y que fallan en silencio porque ninguna prueba mira
 * píxeles. Un comprobador que se ejecuta en medio segundo es lo único que las
 * vuelve a coger.
 *
 * ═══ Y SE COMPRUEBA QUE ESTE COMPROBADOR MUERDE ═══
 *
 * Al final hay casos fabricados que DEBEN ponerlo rojo. Sin eso, una regla escrita
 * con una expresión regular que ya no encaja con el código pasa a ser un tique
 * verde permanente, que es peor que no tener la regla: da la sensación de estar
 * vigilado sin estarlo.
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(AQUI, '..');
const APP = path.resolve(SRC, '..', 'app');
/*
 * ═══ Y SÍ, ESTE COMPROBADOR VIVE EN `app/` Y LEE `escritorio/` ═══
 *
 * Cruzar de espacio de trabajo no es bonito, y aquí es exactamente lo que hay
 * que hacer: la Sala tiene DOS clientes, y lo que este fichero comprueba es que
 * una corrección hecha en uno llegue al otro. Un comprobador por cliente no
 * podría afirmar eso ni una sola vez — que es justo por lo que las dos tablas
 * de la muesca llevaban meses divergiendo sin que nada se pusiera rojo.
 *
 * La alternativa era duplicarlo, y entonces habría dos comprobadores de
 * consistencia que podrían divergir entre sí. Se elige el feo que funciona.
 */
const RAIZ = path.resolve(SRC, '..', '..');
const ESCRITORIO = path.join(RAIZ, 'escritorio', 'src');
const HOJA = path.join(ESCRITORIO, 'estilo.css');

const fallos = [];
let cuantas = 0;

function comprobar(que, condicion, detalle) {
  cuantas += 1;
  if (!condicion) fallos.push(`${que}${detalle === undefined ? '' : ` — ${detalle}`}`);
}

function paso(titulo) {
  console.log(`\n· ${titulo}`);
}

/** Todos los ficheros de pantalla de la Sala, más la portada. */
function pantallas() {
  const arcade = path.join(SRC, 'arcade');
  const fuera = [];
  for (const f of readdirSync(arcade)) {
    if (f.endsWith('.tsx')) fuera.push(path.join(arcade, f));
  }
  fuera.push(path.join(APP, 'index.tsx'));
  return fuera;
}

function leer(fichero) {
  return { texto: readFileSync(fichero, 'utf8'), nombre: path.relative(path.resolve(SRC, '..'), fichero) };
}

function linea(texto, indice) {
  return texto.slice(0, indice).split('\n').length;
}

// ---------------------------------------------------------------------------

/**
 * Saca los objetos de estilo de un fichero: `nombre: { … }` con un cuerpo sin
 * llaves anidadas, que es como están escritos todos los `StyleSheet.create` de
 * esta casa. Lo que tenga llaves dentro se queda fuera del análisis, y eso es
 * deliberado: prefiero mirar menos y no equivocarme que adivinar.
 */
function estilosDe(texto) {
  const fuera = [];
  const patron = /(\w+)\s*:\s*\{([^{}]*)\}/g;
  let m;
  while ((m = patron.exec(texto)) !== null) {
    fuera.push({ clave: m[1], cuerpo: m[2], donde: linea(texto, m.index) });
  }
  return fuera;
}

// ---------------------------------------------------------------------------

paso('Un botón apagado se apaga con color, nunca con opacidad');
{
  /*
   * QUÉ SE BUSCA: un estilo cuyo NOMBRE diga que es el estado apagado de algo, y
   * que lleve `opacity` dentro. Se mira el nombre y no el uso porque el uso está a
   * cientos de líneas y en otra función; el nombre lo escribe quien lo pinta.
   */
  const APAGADO = /(quiet[oa]|apagad[oa]|inactiv[oa]|deshabilitad[oa]|desactivad[oa])/i;
  const malos = [];
  for (const fichero of pantallas()) {
    const { texto, nombre } = leer(fichero);
    for (const e of estilosDe(texto)) {
      if (APAGADO.test(e.clave) && /\bopacity\s*:/.test(e.cuerpo)) {
        malos.push(`${nombre}:${e.donde} (${e.clave})`);
      }
    }
  }
  comprobar(
    'ningún estilo de estado apagado usa `opacity`',
    malos.length === 0,
    malos.length === 0
      ? 'se apagan con color, que es lo que mantiene la etiqueta legible'
      : `${malos.join(', ')} — apagar con opacidad apaga también la letra: una ayuda en \`tenue\` cae de 5,95 a 2,32:1`,
  );
}

paso('El blanco no se apoya nunca en el acento vivo');
{
  /*
   * La pareja prohibida, dentro de un mismo objeto de estilo: un relleno de
   * `SALA.acento` con la tinta en `SALA.blanco`. Ahí no hay ambigüedad posible —el
   * texto de ese estilo se pinta sobre ese fondo— y da 1,98:1 en ámbar.
   *
   * No se intenta cazar el caso en que el fondo y la tinta viven en dos estilos
   * distintos: eso pide saber qué se pinta encima de qué, y una regla que adivina
   * es una regla que da falsos rojos hasta que alguien la borra.
   */
  const malos = [];
  for (const fichero of pantallas()) {
    const { texto, nombre } = leer(fichero);
    for (const e of estilosDe(texto)) {
      const fondoDeAcento = /backgroundColor\s*:\s*SALA\.acento\b/.test(e.cuerpo);
      const tintaBlanca = /\bcolor\s*:\s*SALA\.blanco\b/.test(e.cuerpo);
      if (fondoDeAcento && tintaBlanca) malos.push(`${nombre}:${e.donde} (${e.clave})`);
    }
  }
  comprobar(
    'ningún estilo pinta blanco sobre un relleno de `SALA.acento`',
    malos.length === 0,
    malos.length === 0
      ? 'sobre el acento vivo la tinta es `SALA.suelo`, que da entre 5,01 y 9,22'
      : `${malos.join(', ')} — blanco sobre el acento da 1,98:1 en ámbar y 2,11 en verde`,
  );
}

paso('El raíl de aforo se pinta en un solo sitio');
{
  /*
   * `CUENTA_DE_AFORO` son las medidas del raíl. Quien las importa está dibujando
   * un raíl, y sólo hay un sitio donde eso se hace: `piezas.tsx`. La tabla vive en
   * `muebles.ts`, así que ésos son los dos únicos ficheros que pueden nombrarla.
   *
   * Ésta es la comprobación que habría cazado el fallo original: tres copias y una
   * sola corregida.
   */
  /*
   * SE MIRA LA IMPORTACIÓN Y NO EL FICHERO ENTERO, y es una corrección que se pagó
   * en el primer uso: la primera versión buscaba el nombre en todo el texto y se
   * ponía roja por una MENCIÓN EN UN COMENTARIO. La Peonza explica en su cabecera
   * de dónde salían antes sus medidas, y esa frase —que es documentación correcta
   * de por qué el fichero cambió— disparaba la regla.
   *
   * Una regla que castiga hablar de algo enseña a no hablar de ello, que es lo
   * contrario de lo que quiere esta casa. Quien IMPORTA la tabla la usa; quien la
   * nombra en un comentario está contando la historia.
   */
  const importa = /import\s*\{[^}]*CUENTA_DE_AFORO[^}]*\}/;
  const permitidos = new Set(['piezas.tsx']);
  const malos = [];
  const arcade = path.join(SRC, 'arcade');
  for (const f of readdirSync(arcade)) {
    if (!f.endsWith('.tsx') || permitidos.has(f)) continue;
    if (importa.test(readFileSync(path.join(arcade, f), 'utf8'))) malos.push(f);
  }
  if (importa.test(readFileSync(path.join(APP, 'index.tsx'), 'utf8'))) malos.push('app/index.tsx');
  comprobar(
    'sólo `piezas.tsx` conoce las medidas del raíl',
    malos.length === 0,
    malos.length === 0
      ? 'un raíl, una implementación, una corrección'
      : `${malos.join(', ')} — el raíl estuvo escrito tres veces y sólo se corrigió una`,
  );
}

paso('Ningún texto de la Sala baja del mínimo de la casa');
{
  /*
   * TRECE, y está escrito en el bloque de tipografía de la portada: la maqueta
   * rotula en 8,5 y 9 píxeles, que es lo normal en una lámina de diseño y no en una
   * pantalla que se mira de pie y con prisa. Lo que se conserva de la maqueta es la
   * jerarquía, no los cuerpos.
   *
   * ═══ Y EL ALCANCE NO ES «TODO EL FICHERO», PORQUE `index.tsx` ES DOS CASAS ═══
   *
   * La portada tiene arriba el TALLER —Cinzel y Cormorant, dos serifs cuya caja
   * alta es pequeña y que rotulan a 9, a 10,5 y a 12 con toda la razón— y abajo la
   * SALA, que es palo seco del sistema. Aplicar el mínimo de la Sala a la
   * tipografía del taller daría catorce rojos que nadie va a arreglar, y una regla
   * con catorce excepciones se desactiva en una semana.
   *
   * Así que se distingue por la TABLA DE LETRA, que es lo que de verdad separa las
   * dos casas: un estilo que hereda de `LETRA` es de la Sala y le toca el mínimo;
   * uno que nombra `fuente` es del taller y no. En `app/src/arcade/` no hace falta
   * distinguir nada, porque allí todo es Sala.
   */
  const MINIMO = 13;
  const malos = [];
  const arcade = path.join(SRC, 'arcade');
  for (const f of readdirSync(arcade)) {
    if (!f.endsWith('.tsx')) continue;
    const texto = readFileSync(path.join(arcade, f), 'utf8');
    for (const m of texto.matchAll(/fontSize\s*:\s*([0-9]+(?:\.[0-9]+)?)/g)) {
      if (Number(m[1]) < MINIMO) malos.push(`arcade/${f}:${linea(texto, m.index)} (${m[1]})`);
    }
  }
  const portada = readFileSync(path.join(APP, 'index.tsx'), 'utf8');
  for (const e of estilosDe(portada)) {
    if (!/\bLETRA\./.test(e.cuerpo)) continue;
    const m = /fontSize\s*:\s*([0-9]+(?:\.[0-9]+)?)/.exec(e.cuerpo);
    if (m !== null && Number(m[1]) < MINIMO) malos.push(`app/index.tsx:${e.donde} (${e.clave}, ${m[1]})`);
  }
  comprobar(
    `ningún \`fontSize\` por debajo de ${MINIMO}`,
    malos.length === 0,
    malos.length === 0 ? `${MINIMO} es el suelo, y hoy nadie lo pisa` : malos.join(', '),
  );
}

// ═══════════════════ Y AHORA EL CLIENTE DE ESCRITORIO ═══════════════════

/**
 * Trocea una hoja de estilo en reglas `selector { cuerpo }`. Se salta lo que
 * lleve llaves anidadas —`@media`, `@supports`— por la misma razón que arriba:
 * mirar menos y no equivocarse.
 */
function reglasDe(css) {
  const fuera = [];
  const patron = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = patron.exec(css)) !== null) {
    /*
     * El selector se limpia de comentarios antes de guardarlo. Sin esto arrastra
     * todo el bloque de prosa que va encima —esta hoja los tiene largos— y un
     * mensaje de fallo sale con treinta renglones de explicacion delante del
     * nombre de la clase, que es la forma mas segura de que nadie lo lea.
     */
    const selector = m[1].replace(/\/\*[\s\S]*?\*\//g, ' ').trim().split(/\s{2,}/).pop().trim();
    fuera.push({ selector, cuerpo: m[2], donde: linea(css, m.index) });
  }
  return fuera;
}

paso('El escritorio tampoco apaga con opacidad');
{
  /*
   * La misma regla que arriba, del otro lado del producto. Y no es teórica: al
   * escribirse esto, `.opcion:disabled { opacity: 0.45 }` dejaba el rótulo de
   * «Abrir mesa» en 3,91:1 y su ayuda en 2,15:1 — mientras el argumento en
   * contra llevaba semanas escrito en la app y este fichero no lo miraba.
   */
  const css = readFileSync(HOJA, 'utf8');
  const APAGADO = /(:disabled|\[disabled\]|apagad[oa]|quiet[oa]|inactiv[oa])/i;
  const malos = reglasDe(css)
    .filter((r) => APAGADO.test(r.selector) && /\bopacity\s*:/.test(r.cuerpo))
    .map((r) => `estilo.css:${r.donde} (${r.selector})`);
  comprobar(
    'ninguna regla de estado apagado del escritorio usa `opacity`',
    malos.length === 0,
    malos.length === 0
      ? 'se apagan con color, igual que en la app'
      : `${malos.join(', ')} — apagar con opacidad apaga también la letra`,
  );
}

paso('Ni el escritorio apoya el blanco en el acento vivo');
{
  /*
   * El equivalente CSS de la pareja prohibida: un `background` de `--acento` con
   * el `color` en cualquiera de los dos blancos de la tabla. `--acento-hondo` no
   * cuenta, y por eso la expresión pide que el nombre acabe ahí.
   */
  const css = readFileSync(HOJA, 'utf8');
  const malos = reglasDe(css)
    .filter(
      (r) =>
        /*
         * Sólo un relleno PLANO. Un `background` con un degradado que arranca en
         * `--acento` y acaba en `--acento-hondo` es exactamente el patrón bueno
         * —la placa del nombre lo hace, y su texto se apoya en el hondo con
         * 6,57:1—, así que exigir que no haya ningún `gradient(` en el valor es
         * lo que separa el fallo del acierto. Sin esa condición, esta regla
         * marcaba en rojo la única placa que estaba bien hecha.
         */
        /background(?:-color)?\s*:(?![^;]*gradient\()[^;]*var\(\s*--acento\s*\)/.test(r.cuerpo) &&
        /(^|;|\s)color\s*:[^;]*var\(\s*--(blanco|palabra)\s*\)/.test(r.cuerpo),
    )
    .map((r) => `estilo.css:${r.donde} (${r.selector})`);
  comprobar(
    'ninguna regla del escritorio pinta blanco sobre un relleno de `--acento`',
    malos.length === 0,
    malos.length === 0
      ? 'sobre el acento vivo la tinta es `--suelo`'
      : `${malos.join(', ')} — 1,98:1 en ámbar`,
  );
}

paso('Los dos clientes cuentan el aforo con la misma regla');
{
  /*
   * ═══ ESTA ES LA COMPROBACIÓN QUE JUSTIFICA TODO EL FICHERO ═══
   *
   * La Sala tiene dos tablas de medidas —`CUENTA_DE_AFORO` en la app y las
   * `--muesca-*` en la hoja del escritorio— y llevaban divergiendo en tres de
   * cuatro valores: hueco 19 contra 13, alta 16 contra 15, y la muesca apagada
   * pintada con un blanco al 34 % que la app ya había medido y subido al 70 %.
   *
   * Ninguna prueba podía verlo, porque cada cliente se comprobaba solo. Un raíl
   * que cuenta distinto en cada mitad del producto no es un detalle de estilo:
   * es el mismo dato dicho de dos maneras.
   */
  const muebles = readFileSync(path.join(SRC, 'arcade', 'muebles.ts'), 'utf8');
  const css = readFileSync(HOJA, 'utf8');

  function deLaApp(clave) {
    const m = new RegExp(`${clave}\\s*:\\s*([0-9]+(?:\\.[0-9]+)?)`).exec(muebles);
    return m === null ? null : Number(m[1]);
  }
  function delEscritorio(clave) {
    const m = new RegExp(`--muesca-${clave}\\s*:\\s*([0-9]+(?:\\.[0-9]+)?)px`).exec(css);
    return m === null ? null : Number(m[1]);
  }

  const pares = [
    ['grosor', 'grosor'],
    ['altoEncendida', 'alta'],
    ['altoApagada', 'baja'],
    ['hueco', 'hueco'],
  ];
  const distintos = [];
  for (const [enLaApp, enElEscritorio] of pares) {
    const a = deLaApp(enLaApp);
    const b = delEscritorio(enElEscritorio);
    if (a === null || b === null) {
      distintos.push(`${enLaApp}/${enElEscritorio}: no se ha podido leer (${a} / ${b})`);
    } else if (a !== b) {
      distintos.push(`${enLaApp} vale ${a} en la app y ${b} en el escritorio`);
    }
  }
  comprobar(
    'las cuatro medidas de la muesca son las mismas en los dos clientes',
    distintos.length === 0,
    distintos.length === 0
      ? 'un raíl, una cuenta, aunque se pinte con dos tecnologías'
      : distintos.join(' · '),
  );
}

paso('Los cuatro temas existen en los dos clientes');
{
  /*
   * No se comprueba la FORMA —cada cliente elige la suya: una tabla en
   * TypeScript, bloques `[data-tema]` en CSS— sino que los cuatro acentos que la
   * app declara estén escritos también en la hoja. Sin esto, el escritorio tiene
   * un violeta literal y tres temas que nadie ha visto nunca, que es como llevaba
   * desde que se inventaron.
   */
  const muebles = readFileSync(path.join(SRC, 'arcade', 'muebles.ts'), 'utf8');
  const css = readFileSync(HOJA, 'utf8').toLowerCase();
  const tabla = /TEMAS_DE_SALA\s*=\s*\{([\s\S]*?)\n\}/.exec(muebles);
  const acentos = tabla === null ? [] : [...tabla[1].matchAll(/acento:\s*'(#[0-9a-fA-F]{6})'/g)].map((m) => m[1].toLowerCase());
  const faltan = acentos.filter((c) => !css.includes(c));
  comprobar(
    'los acentos de los cuatro temas están también en la hoja del escritorio',
    acentos.length >= 4 && faltan.length === 0,
    acentos.length < 4
      ? `sólo se han leído ${acentos.length} acentos de TEMAS_DE_SALA`
      : faltan.length === 0
        ? `${acentos.length} temas en los dos clientes`
        : `faltan en el escritorio: ${faltan.join(', ')}`,
  );
}

paso('Ni el escritorio baja del mínimo de la casa');
{
  /*
   * La hoja declara su propio suelo —`--letra-minima`— y además rotula en `rem`
   * con la raíz en 17 px, así que aquí hay dos maneras de bajar de 13: un `px`
   * pequeño y un `rem` pequeño. Se miran las dos.
   */
  const css = readFileSync(HOJA, 'utf8');
  const RAIZ_EN_PX = 17;
  const malos = [];
  for (const m of css.matchAll(/font-size\s*:\s*([0-9]+(?:\.[0-9]+)?)(px|rem)/g)) {
    const px = m[2] === 'rem' ? Number(m[1]) * RAIZ_EN_PX : Number(m[1]);
    if (px < 13) malos.push(`estilo.css:${linea(css, m.index)} (${m[1]}${m[2]} = ${px.toFixed(1)}px)`);
  }
  comprobar(
    'ningún `font-size` de la hoja por debajo de 13 px',
    malos.length === 0,
    malos.length === 0 ? '13 es el suelo en los dos clientes' : malos.join(', '),
  );
}

paso('El raíl de aforo se pinta también en el escritorio');
{
  /*
   * Las reglas `.aforo` y `.muesca` llevaban escritas desde el rediseño y ningún
   * `.tsx` las montaba: la firma de la Sala existía en la hoja y no en la
   * pantalla. Un estilo huérfano no es código muerto inofensivo — es una promesa
   * que el encabezado de la propia hoja hace y el producto no cumple.
   */
  const usadas = readdirSync(ESCRITORIO)
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => readFileSync(path.join(ESCRITORIO, f), 'utf8'))
    .join('\n');
  const huerfanas = ['aforo', 'muesca'].filter((c) => !new RegExp(`["'\\s]${c}[\"'\\s]`).test(usadas));
  comprobar(
    'el raíl del escritorio lo monta alguien',
    huerfanas.length === 0,
    huerfanas.length === 0
      ? 'la firma de la Sala está en las dos mitades del producto'
      : `clases sin dueño: ${huerfanas.join(', ')} — declaradas en la hoja y en ninguna pantalla`,
  );
}

// ---------------------------------------------------------------------------

paso('Y el comprobador muerde: casos fabricados que tienen que ponerlo rojo');
{
  const APAGADO = /(quiet[oa]|apagad[oa]|inactiv[oa]|deshabilitad[oa]|desactivad[oa])/i;

  const conOpacidad = estilosDe('  botonQuieto: { borderColor: SALA.filo, opacity: 0.5 },');
  comprobar(
    'caza un `opacity` en un estilo apagado',
    conOpacidad.some((e) => APAGADO.test(e.clave) && /\bopacity\s*:/.test(e.cuerpo)),
    'si esto pasa en verde, la regla del apagado no está mirando nada',
  );

  const enOtraLinea = estilosDe('  opcionQuieta: {\n    borderColor: SALA.filo,\n    opacity: 0.45,\n  },');
  comprobar(
    'y lo caza también escrito en varias líneas',
    enOtraLinea.some((e) => APAGADO.test(e.clave) && /\bopacity\s*:/.test(e.cuerpo)),
    'la forma de escribirlo no puede decidir si se comprueba',
  );

  const sano = estilosDe('  botonQuieto: { backgroundColor: SALA.teja, borderColor: SALA.filo },');
  comprobar(
    'y no se queja del apagado bien hecho',
    !sano.some((e) => APAGADO.test(e.clave) && /\bopacity\s*:/.test(e.cuerpo)),
    'un falso rojo se desactiva, y entonces la regla desaparece',
  );

  const parProhibido = estilosDe('  boton: { backgroundColor: SALA.acento, color: SALA.blanco },');
  comprobar(
    'caza el blanco sobre el acento',
    parProhibido.some(
      (e) =>
        /backgroundColor\s*:\s*SALA\.acento\b/.test(e.cuerpo) &&
        /\bcolor\s*:\s*SALA\.blanco\b/.test(e.cuerpo),
    ),
    'es la pareja que ya ha costado tres correcciones',
  );

  const parBueno = estilosDe('  boton: { backgroundColor: SALA.acento, color: SALA.suelo },');
  comprobar(
    'y no se queja de la tinta oscura, que es la buena',
    !parBueno.some(
      (e) =>
        /backgroundColor\s*:\s*SALA\.acento\b/.test(e.cuerpo) &&
        /\bcolor\s*:\s*SALA\.blanco\b/.test(e.cuerpo),
    ),
    'SALA.suelo sobre el acento da entre 5,01 y 9,22',
  );

  const acentoHondo = estilosDe('  boton: { backgroundColor: SALA.acentoHondo, color: SALA.blanco },');
  comprobar(
    'y distingue el acento vivo del hondo, que sí admite blanco',
    !acentoHondo.some(
      (e) =>
        /backgroundColor\s*:\s*SALA\.acento\b/.test(e.cuerpo) &&
        /\bcolor\s*:\s*SALA\.blanco\b/.test(e.cuerpo),
    ),
    'sobre el hondo el blanco da 4,64 en el peor tema: pasa, y la regla no debe cazarlo',
  );

  const importa = /import\s*\{[^}]*CUENTA_DE_AFORO[^}]*\}/;
  comprobar(
    'caza a quien importa las medidas del raíl',
    importa.test("import { CUENTA_DE_AFORO, SALA } from './muebles';"),
    'si no, la regla del raíl único no está mirando nada',
  );
  comprobar(
    'y no se queja de quien sólo lo nombra en un comentario',
    !importa.test(' * el grosor y el hueco salían de `CUENTA_DE_AFORO`, y ahora de la pieza.'),
    'castigar la prosa enseña a no documentar, que es peor que la regla',
  );

  const cssApagado = reglasDe('.opcion:disabled { cursor: not-allowed; opacity: 0.45; }');
  comprobar(
    'caza un `opacity` en una regla `:disabled` del CSS',
    cssApagado.some((r) => /:disabled/.test(r.selector) && /\bopacity\s*:/.test(r.cuerpo)),
    'si no, la mitad de escritorio del producto no está mirada',
  );
  const cssSano = reglasDe('.opcion:disabled { background: var(--teja); color: var(--tenue); }');
  comprobar(
    'y no se queja del apagado por color',
    !cssSano.some((r) => /:disabled/.test(r.selector) && /\bopacity\s*:/.test(r.cuerpo)),
    'un falso rojo se desactiva, y entonces la regla desaparece',
  );
  const cssPar = reglasDe('.boton { background: var(--acento); color: var(--blanco); }');
  comprobar(
    'caza el blanco sobre `--acento` en el CSS',
    cssPar.some(
      (r) =>
        /background(?:-color)?\s*:(?![^;]*gradient\()[^;]*var\(\s*--acento\s*\)/.test(r.cuerpo) &&
        /(^|;|\s)color\s*:[^;]*var\(\s*--(blanco|palabra)\s*\)/.test(r.cuerpo),
    ),
    'es la misma pareja, dicha en otra tecnología',
  );
  const cssHondo = reglasDe('.boton { background: var(--acento-hondo); color: var(--blanco); }');
  comprobar(
    'y no confunde `--acento-hondo` con `--acento`',
    !cssHondo.some(
      (r) =>
        /background(?:-color)?\s*:(?![^;]*gradient\()[^;]*var\(\s*--acento\s*\)/.test(r.cuerpo) &&
        /(^|;|\s)color\s*:[^;]*var\(\s*--(blanco|palabra)\s*\)/.test(r.cuerpo),
    ),
    'sobre el hondo el blanco pasa, y la regla no debe cazarlo',
  );
  const cssRem = [...'a { font-size: 0.7rem }'.matchAll(/font-size\s*:\s*([0-9]+(?:\.[0-9]+)?)(px|rem)/g)];
  comprobar(
    'caza un `rem` que en píxeles baja de 13',
    cssRem.some((m) => (m[2] === 'rem' ? Number(m[1]) * 17 : Number(m[1])) < 13),
    '0,7rem son 11,9px con la raíz en 17: el rem es la manera fácil de colarlo',
  );

  const pequeno = 'algo: { fontSize: 9.5 }';
  comprobar(
    'caza un cuerpo por debajo de 13',
    [...pequeno.matchAll(/fontSize\s*:\s*([0-9]+(?:\.[0-9]+)?)/g)].some((m) => Number(m[1]) < 13),
    'incluidos los decimales, que es como se cuelan',
  );
}

// ---------------------------------------------------------------------------

if (fallos.length > 0) {
  console.error(`\n✘ ${fallos.length} de ${cuantas} comprobaciones han fallado:\n`);
  for (const f of fallos) console.error(`   · ${f}`);
  process.exit(1);
}

console.log(
  `\n✔ ${cuantas} comprobaciones. La gramática de la Sala se cumple en LOS DOS CLIENTES: un botón\n` +
    '  apagado se apaga con color y no con opacidad, el blanco no se apoya en el acento vivo,\n' +
    '  ningún texto baja de 13, el raíl se pinta en un solo sitio en la app y alguien lo monta en\n' +
    '  el escritorio, las cuatro medidas de la muesca son las mismas en los dos, y los cuatro\n' +
    '  temas existen en las dos tablas.\n',
);
