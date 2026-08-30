/**
 * ¿Sigue el núcleo sin saber a qué se juega?
 *
 *   npm run verify:nucleo            ← comprueba que el acoplamiento no ha subido
 *   npm run verify:nucleo -- --capturar   ← vuelve a congelar el presupuesto
 *
 * ═══ QUÉ AFIRMA ═══
 *
 * Una sola cosa, y es la invariante de la que cuelga toda la arquitectura:
 *
 *     EL NÚCLEO NO PUEDE NOMBRAR NINGÚN CONCEPTO DE NINGÚN JUEGO.
 *
 * «Núcleo» es todo lo que se compila para todos: si un servidor de otro país
 * instala solo El Paso de las Sombras, ese código viaja igual. Que ahí dentro
 * aparezca `victim`, `roomId` o `acusaciones` significa que la plataforma tiene
 * la forma de CLUEDO, y entonces un juego nuevo solo tiene dos salidas: FINGIR
 * esos campos, o hacer CRECER el núcleo hasta ser la unión de todos los juegos.
 * Las dos son la misma derrota con distinta cara.
 *
 * ═══ POR QUÉ UN TRINQUETE Y NO «TIENE QUE SER CERO» ═══
 *
 * Porque hoy no es cero, es 1.139. Una comprobación que nace en rojo y seguirá
 * en rojo durante semanas no se arregla: se desactiva, y al mes siguiente nadie
 * recuerda para qué estaba. Así que esto no exige cero — exige que **NO SUBA**.
 *
 * Cada fichero tiene un presupuesto congelado en `oro/nucleo.json`. Bajar es
 * gratis y se celebra; subir es un fallo; y estrenar acoplamiento en un fichero
 * que hoy está limpio es el fallo más grave de todos, porque ese es exactamente
 * el movimiento con el que se llegó hasta aquí — una línea cada vez, ninguna
 * culpable, todas razonables.
 *
 * ═══ DOS VOCABULARIOS, PORQUE TIENEN ARREGLOS DISTINTOS ═══
 *
 * · UNIVERSAL CON NOMBRE PRESTADO (`participanteId`). El concepto —«cuál de los que
 *   están en la mesa»— es de todos los juegos: lo usan la presencia, el correo,
 *   los trofeos y el motor de acciones, que por lo demás no sabe a qué se juega.
 *   Lo que sobra es el NOMBRE. Se arregla renombrando, y es mecánico.
 *
 * · CONCEPTO AJENO (`rooms`, `victim`, `clues`, `acusaciones`…). Aquí no sobra
 *   el nombre: sobra la idea. Un juego de rol no tiene víctima ni acusación, y
 *   ninguna forma de llamarlas lo arregla. Se arregla MUDÁNDOLAS al juego que
 *   las usa.
 *
 * Se cuentan por separado porque mezclarlas daría un número que no dice qué
 * hacer. 407 renombres y 732 mudanzas son dos trabajos, no uno de 1.139.
 *
 * ═══ QUÉ NO CUENTA, Y POR QUÉ ═══
 *
 * Los COMENTARIOS no cuentan. Un comentario que dice «esto en CLUEDO era la
 * acusación» es documentación buena, y penalizarla empujaría a borrar
 * justamente lo que ayuda a quien venga detrás. Se cuenta el código.
 *
 * Los ficheros DE un juego tampoco cuentan: `cluedo-acciones.ts` está para
 * hablar de sospechosos. Lo que se vigila es el tronco.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const PRESUPUESTO = path.join(import.meta.dirname ?? __dirname, 'oro', 'nucleo.json');

// ---------------------------------------------------------------------------
// Qué se mira
// ---------------------------------------------------------------------------

/** Dónde vive el código que se compila para todos. */
const RAICES = ['shared', 'server/src', 'client/src', 'app/src', 'app/app'];

/**
 * Cómo se reconoce un fichero que ES de un juego.
 *
 * Por el nombre, a propósito: es la convención que ya sigue el repositorio
 * entero —`momia-acciones.ts`, `sombras/datos.ts`, `cluedo.ts`— y no depende de
 * mantener a mano una lista que se quedaría vieja al segundo juego nuevo.
 *
 * OJO CON LO QUE ESTO DEJA DENTRO DEL NÚCLEO. Hay ficheros que no se llaman
 * «cluedo» y solo sirven a CLUEDO. Que cuenten como núcleo NO es un fallo de
 * esta medida: es el hallazgo. Están en carpetas genéricas, los alcanza el
 * código genérico, y viajan a un servidor que quizá no tenga CLUEDO instalado.
 * O se mudan a la carpeta de CLUEDO, o se generalizan. Las dos salidas son
 * buenas; quedarse como están, no.
 *
 * Once ya se mudaron: las plantillas de imprimible de CLUEDO vivían sueltas en
 * `docs/imprimibles/` —`manualGm.ts`, `hojaSolucion.ts`, `matrizConocimiento.ts`
 * y ocho más— al lado de las carpetas `momia/` y `sombras/`. Mudarlas a
 * `imprimibles/cluedo/` quitó 115 menciones de un golpe sin cambiar un byte de
 * lo que se imprime.
 *
 * El que queda por decidir es `docs/renderer.ts`, que compone los dosieres y es
 * el fichero más acoplado que hay. No es una mudanza: tiene dentro el dosier
 * genérico de CLUEDO Y el mecanismo por el que cada juego registra el suyo.
 */
const ES_DE_UN_JUEGO = /(^|[\/\\-])(cluedo|momia|sombras)([\/\\.-]|$)/i;

/**
 * NI ESTO ES NUCLEO: las MECANICAS son la tercera capa.
 *
 * ═══ POR QUE NO ES UNA PUERTA TRASERA ═══
 *
 * La tentacion evidente al mirar este verificador es sacar del recuento el
 * fichero que moleste, y entonces el numero baja sin que nada mejore. Asi que
 * conviene decir con precision que distingue a una mecanica del nucleo, porque
 * es una propiedad comprobable y no una opinion:
 *
 *   · El nucleo lo ejecutan TODOS los juegos, quieran o no. Si sabe lo que es
 *     una pista, la Momia paga por ello —y pagaba: tres listas vacias en cada
 *     una de las setenta y seis vistas de una velada entera.
 *   · Una mecanica NO LA EJECUTA NADIE hasta que un juego la llama. Ningun
 *     juego la hereda, ninguno tiene que apartarse de ella, y borrarla solo
 *     rompe a quien la llamo.
 *
 * La comprobacion es esta: si se borra la carpeta `mecanicas/`, los juegos que
 * no la llaman siguen compilando y jugandose enteros. Con el nucleo eso no
 * pasa. Es la misma razon por la que `juegos/cluedo-*.ts` no cuenta.
 *
 * Y no queda sin vigilar: `verify:segundo-juego` registra un juego inventado
 * que no conoce a CLUEDO y le hace usar la mecanica de las pistas. Si la
 * mecanica volviera a mirar dentro de CLUEDO por algun sitio, ese verificador
 * se pone rojo.
 */
function esUnaMecanica(rel: string): boolean {
  return rel.replace(/\\/g, '/').includes('/mecanicas/');
}

interface Vocabulario {
  clave: 'prestado' | 'ajeno';
  titulo: string;
  arreglo: string;
  palabras: string[];
}

const VOCABULARIOS: Vocabulario[] = [
  {
    clave: 'prestado',
    titulo: 'Nombre prestado de CLUEDO que ya no debería aparecer',
    arreglo: 'ya está hecho: esto solo vigila que no vuelva',
    /*
     * ═══ ESTO YA ESTÁ EN CERO, Y ESA ES LA GRACIA ═══
     *
     * Eran 324 menciones de `suspectId`: un concepto universal —cuál de los que
     * están sentados a la mesa— con el nombre del primer juego. Se renombró a
     * `participanteId` en 112 ficheros, con migración al leer para los siete
     * sitios donde estaba guardado.
     *
     * La lista se queda aquí en vez de borrarse porque un renombrado se
     * deshace solo: basta con que alguien copie una línea vieja de un commit
     * antiguo. Con esto, la primera que vuelva sale en rojo.
     */
    palabras: ['suspectId', 'suspectIds'],
  },
  {
    clave: 'ajeno',
    titulo: 'Concepto que es de CLUEDO y de nadie más',
    arreglo: 'mudar el campo al juego que lo usa',
    palabras: [
      'suspects',
      'rooms',
      'roomId',
      'weapons',
      'weaponId',
      'clues',
      'victim',
      'murderer',
      'murdererId',
      'acusacion',
      'acusaciones',
      'acusar',
      'culpable',
      'culpableId',
      'winnerId',
      'tablon',
      'misPistas',
      'misHallazgos',
      /*
       * LOS ACCESORES DE EJE DE CLUEDO, y hacía falta añadirlos a mano.
       *
       * `culpableDe` NO casaba con `\bculpable\b`: la «D» de `De` es carácter
       * de palabra, así que la frontera no está ahí y la expresión no llegaba.
       * El resultado era un agujero silencioso justo en el sitio de más
       * acoplamiento que hay — `docs/imprimibles/` está lleno de
       * `culpableDe(plot.solution)`, `objetoDe(...)` y `lugarDe(...)`.
       *
       * Se descubrió porque una mejora real —sacar `culpableDe` de
       * `plot/refresh.ts`— no movió el contador ni una unidad. Un contador que
       * no baja cuando arreglas algo está midiendo otra cosa.
       *
       * `EJES` es la tabla de la que salen los tres. Está en `juegos/cluedo.ts`
       * y quien la importe fuera de CLUEDO está leyendo los ejes de CLUEDO.
       */
      'culpableDe',
      'objetoDe',
      'lugarDe',
      'EJES',
    ],
  },
];

// ---------------------------------------------------------------------------
// Contar de verdad: sin comentarios
// ---------------------------------------------------------------------------

/**
 * Devuelve el fichero con los comentarios sustituidos por espacios.
 *
 * Se hace recorriendo carácter a carácter en vez de con una expresión regular
 * porque un `//` dentro de una cadena —`'https://…'`, que sale en cada ruta de
 * este repositorio— engañaría a cualquier regex y borraría media línea de
 * código real. Aquí se lleva la cuenta de si estamos dentro de una cadena, de
 * una plantilla o de un comentario, que es la única forma de no equivocarse.
 *
 * Las cadenas SÍ se conservan: `categoria === 'suspects'` es acoplamiento de
 * verdad, no una nota al margen.
 */
function sinComentarios(fuente: string): string {
  let salida = '';
  let i = 0;
  const n = fuente.length;

  while (i < n) {
    const c = fuente[i]!;
    const siguiente = fuente[i + 1];

    // Comentario de línea.
    if (c === '/' && siguiente === '/') {
      while (i < n && fuente[i] !== '\n') {
        salida += ' ';
        i++;
      }
      continue;
    }

    // Comentario de bloque. Se conservan los saltos de línea para que el número
    // de línea de un hallazgo siga siendo el de verdad.
    if (c === '/' && siguiente === '*') {
      while (i < n && !(fuente[i] === '*' && fuente[i + 1] === '/')) {
        salida += fuente[i] === '\n' ? '\n' : ' ';
        i++;
      }
      salida += '  ';
      i += 2;
      continue;
    }

    // Cadenas: se copian tal cual, respetando los escapes.
    if (c === '"' || c === "'" || c === '`') {
      const cierre = c;
      salida += c;
      i++;
      while (i < n) {
        if (fuente[i] === '\\') {
          salida += fuente[i]! + (fuente[i + 1] ?? '');
          i += 2;
          continue;
        }
        salida += fuente[i];
        if (fuente[i] === cierre) {
          i++;
          break;
        }
        // Una plantilla sin cerrar no debe comerse el resto del fichero.
        if (cierre !== '`' && fuente[i] === '\n') {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    salida += c;
    i++;
  }

  return salida;
}

function contar(codigo: string, palabras: string[]): number {
  const patron = new RegExp(`\\b(${palabras.join('|')})\\b`, 'g');
  return (codigo.match(patron) ?? []).length;
}

/** Recorre las raíces devolviendo las rutas relativas de los ficheros del núcleo. */
function ficherosDelNucleo(): string[] {
  const salida: string[] = [];

  const bajar = (dir: string): void => {
    let entradas: fs.Dirent[];
    try {
      entradas = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entradas) {
      const completa = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (['node_modules', 'dist', '.expo', 'build', 'coverage'].includes(e.name)) continue;
        bajar(completa);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(e.name)) continue;
      if (e.name.endsWith('.d.ts')) continue;
      const rel = path.relative(RAIZ, completa).replace(/\\/g, '/');
      if (ES_DE_UN_JUEGO.test(rel) || esUnaMecanica(rel)) continue;
      salida.push(rel);
    }
  };

  for (const raiz of RAICES) bajar(path.join(RAIZ, raiz));
  return salida.sort();
}

// ---------------------------------------------------------------------------
// La medida
// ---------------------------------------------------------------------------

type Cuentas = Record<string, number>;
interface Medida {
  prestado: Cuentas;
  ajeno: Cuentas;
}

function medir(): Medida {
  const medida: Medida = { prestado: {}, ajeno: {} };

  for (const rel of ficherosDelNucleo()) {
    const fuente = fs.readFileSync(path.join(RAIZ, rel), 'utf8');
    const codigo = sinComentarios(fuente);
    for (const v of VOCABULARIOS) {
      const n = contar(codigo, v.palabras);
      if (n > 0) medida[v.clave][rel] = n;
    }
  }

  return medida;
}

/*
 * ═══ AQUI HABIA UNA EXCEPCION, Y HA DEJADO DE HACER FALTA ═══
 *
 * `juegos/migracion.ts` convertia al leer los documentos guardados con los
 * nombres viejos, asi que nombraba `suspects`, `roomId`, `winnerId` y todos los
 * demas a proposito. Se contaba aparte —«memoria y no deuda»— porque cada
 * renombrado le AÑADIA menciones, y contarlas como deuda habria hecho subir el
 * marcador justo cuando se estaba mejorando: la peor propiedad que puede tener
 * una medida.
 *
 * Ese fichero ya no existe. Lo guardado se movio de una vez con
 * `scripts/mudanza-al-modelo-nuevo.ts`, que es de un solo uso, no se compila
 * para nadie y por tanto no es nucleo. Con el se fueron las 58 menciones que
 * llevaba dentro y, con ellas, la unica excepcion que tenia esta medida.
 */

const total = (c: Cuentas): number => Object.values(c).reduce((a, n) => a + n, 0);

// ---------------------------------------------------------------------------

const capturar = process.argv.includes('--capturar');
const actual = medir();

if (capturar) {
  fs.mkdirSync(path.dirname(PRESUPUESTO), { recursive: true });
  fs.writeFileSync(PRESUPUESTO, `${JSON.stringify(actual, null, 2)}\n`, 'utf8');
  console.log(`\nPresupuesto del núcleo congelado en ${path.relative(process.cwd(), PRESUPUESTO)}`);
  for (const v of VOCABULARIOS) {
    const c = actual[v.clave];
    console.log(`  ${String(total(c)).padStart(5)}  ${v.titulo}  (${Object.keys(c).length} ficheros)`);
  }
  console.log('\nA partir de ahora estas cifras solo pueden BAJAR.');
  process.exit(0);
}

if (!fs.existsSync(PRESUPUESTO)) {
  console.error('\nNo hay presupuesto congelado. Ejecuta antes:');
  console.error('  npm run verify:nucleo -- --capturar');
  process.exit(2);
}

const esperado = JSON.parse(fs.readFileSync(PRESUPUESTO, 'utf8')) as Medida;

const subidas: string[] = [];
const estrenos: string[] = [];
const bajadas: string[] = [];

for (const v of VOCABULARIOS) {
  const antes = esperado[v.clave] ?? {};
  const ahora = actual[v.clave] ?? {};

  for (const [fichero, n] of Object.entries(ahora)) {
    const previo = antes[fichero];
    if (previo === undefined) {
      estrenos.push(`[${v.clave}] ${fichero}  ·  ${n} menciones nuevas en un fichero que estaba limpio`);
      continue;
    }
    if (n > previo) subidas.push(`[${v.clave}] ${fichero}  ·  ${previo} → ${n}`);
    if (n < previo) bajadas.push(`[${v.clave}] ${fichero}  ·  ${previo} → ${n}`);
  }

  for (const [fichero, previo] of Object.entries(antes)) {
    if (ahora[fichero] === undefined) bajadas.push(`[${v.clave}] ${fichero}  ·  ${previo} → 0`);
  }
}

console.log('\nEl núcleo, ¿sigue sin saber a qué se juega?\n');
for (const v of VOCABULARIOS) {
  const t = total(actual[v.clave]);
  const previo = total(esperado[v.clave] ?? {});
  const flecha = t === previo ? '=' : t < previo ? '↓' : '↑';
  console.log(`  ${String(t).padStart(5)} ${flecha}  ${v.titulo}`);
  console.log(`         arreglo: ${v.arreglo}`);
}

if (bajadas.length > 0) {
  console.log(`\n${bajadas.length} mejoras desde la última captura:\n`);
  for (const b of bajadas.slice(0, 25)) console.log(`  ↓ ${b}`);
  if (bajadas.length > 25) console.log(`  … y ${bajadas.length - 25} más`);
}

if (subidas.length === 0 && estrenos.length === 0) {
  if (bajadas.length > 0) {
    console.log('\nNada ha subido. Vuelve a congelar el presupuesto para no perder terreno:');
    console.log('  npm run verify:nucleo -- --capturar');
  } else {
    console.log('\nNada ha subido.');
  }
  process.exit(0);
}

console.log('');
if (estrenos.length > 0) {
  console.log(`${estrenos.length} ficheros del núcleo ESTRENAN acoplamiento:\n`);
  for (const e of estrenos) console.log(`  ✗ ${e}`);
  console.log(
    '\n  Este es el fallo grave: así se llegó hasta aquí, una línea cada vez.\n' +
      '  Lo que el núcleo necesita saber de un juego se lo tiene que preguntar\n' +
      '  al juego, no leérselo a los campos de CLUEDO.',
  );
}
if (subidas.length > 0) {
  console.log(`\n${subidas.length} ficheros del núcleo se acoplan MÁS que antes:\n`);
  for (const s of subidas) console.log(`  ✗ ${s}`);
}
process.exit(1);
