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
  `\n✔ ${cuantas} comprobaciones. La gramática de la Sala se cumple en las siete pantallas: un\n` +
    '  botón apagado se apaga con color y no con opacidad, el blanco no se apoya en el acento\n' +
    '  vivo, el raíl de aforo se pinta en un solo sitio y ningún texto baja de 13.\n',
);
