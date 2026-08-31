/**
 * Que la tabla de rutas que genera `expo-router` está al día con las pantallas
 * que hay de verdad.
 *
 * ═══ POR QUÉ HACE FALTA, Y CÓMO SE DESCUBRIÓ ═══
 *
 * `app.json` declara `typedRoutes: true`, así que `expo-router` construye la
 * unión de rutas válidas leyendo el árbol de `app/app/` y la escribe en
 * `app/.expo/types/router.d.ts`. `router.push` solo acepta una de esas rutas, y
 * `tipos · móvil` comprueba justo eso.
 *
 * El problema es de dónde sale ese fichero: **está en `.gitignore` y solo se
 * regenera cuando alguien levanta el servidor de desarrollo**. O sea que
 * `tipos · móvil` no responde sobre el código: responde sobre el código MÁS un
 * artefacto local que puede tener cualquier antigüedad.
 *
 * El 31 de agosto de 2026 eso dio TRES veredictos distintos sobre el mismo
 * código, en la misma tarde:
 *
 *   · VERDE, en el árbol donde el fichero estaba tan viejo que la unión no
 *     apretaba y una cadena cualquiera colaba. El peor de los tres, porque
 *     pasaba sin comprobar nada.
 *   · ROJO, en el árbol donde se acababa de jugar una partida: regenerado, la
 *     unión se volvió estricta y cazó un `router.push(ruta: string)` de verdad.
 *   · ROJO por lo contrario, en el árbol de integración: el fichero era de la
 *     víspera y no conocía las cuatro rutas del grupo `(arcade)`, así que
 *     rechazaba `/formulario` por no existir — existiendo.
 *
 * Un comprobador que sabe dar las tres respuestas no es una red. Y la peor de
 * las tres no es el rojo falso, que se ve: es el verde, que es el fallo que la
 * cabecera de `scripts/verificar-todo.mjs` documenta como el más caro de todos.
 *
 * ═══ LO QUE ESTO HACE, Y LO QUE NO ═══
 *
 * NO arregla el tipado ni regenera nada. Regenerar exige arrancar el
 * empaquetador de Metro, que tarda minuto y pico y no cabe dentro de una
 * batería que la gente tiene que querer correr entera.
 *
 * Lo que hace es quitarle a `tipos · móvil` la posibilidad de mentir: recorre
 * `app/app/` con las mismas reglas que usa `expo-router`, lee las rutas que el
 * fichero generado declara, y las compara. Si no coinciden, ESTO se pone rojo
 * diciendo exactamente qué falta o qué sobra y cómo regenerarlo — y entonces el
 * veredicto del typecheck de al lado se sabe leer. Va inmediatamente ANTES de
 * `tipos · móvil` en la batería por eso: para que cuando el de abajo falle, el de
 * arriba ya haya dicho por qué.
 *
 * ═══ LAS REGLAS DE `expo-router` QUE SE REPLICAN AQUÍ ═══
 *
 * Se replican y no se importan porque el generador vive dentro del CLI y no
 * expone nada; son cuatro y llevan años estables:
 *
 *   · Los ficheros que empiezan por `_` (los `_layout`) y por `+` (`+not-found`,
 *     `+html`, `+native-intent`) NO son rutas.
 *   · Los tramos entre paréntesis —`(juego)`, `(arcade)`— son GRUPOS: organizan
 *     carpetas y no aparecen en la dirección.
 *   · `index` desaparece del final, así que `app/index.tsx` es `/`.
 *   · `[algo]` es un tramo variable y se queda tal cual en la unión.
 *
 * Y una que no es de fichero: `/_sitemap` la añade `expo-router` por su cuenta,
 * así que no está en el árbol y hay que perdonarla al comparar. Perdonarla a
 * ella y a nadie más — una lista de excepciones que crece es una lista que deja
 * de comprobar.
 *
 * ═══ SE VACUNA A SÍ MISMO ═══
 *
 * Antes de mirar el proyecto, el lector de rutas se prueba contra una muestra
 * escrita a mano con los cuatro casos. Si el parseo se estropea —un cambio de
 * formato del fichero generado, una expresión regular mal tocada— esto sale con
 * código 2 en vez de anunciar que todo cuadra: sin la vacuna, un lector que no
 * lee nada encuentra cero diferencias y felicita a todo el mundo. Es la misma
 * disciplina que `verify:pureza`, y está puesta por el mismo motivo que el
 * comentario de arriba: este repositorio ya tiene tres casos anotados de verdes
 * que no comprobaban nada.
 *
 *   node app/src/comprobadores/verificar-rutas.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(AQUI, '../..');
const PANTALLAS = path.join(APP, 'app');
const GENERADO = path.join(APP, '.expo', 'types', 'router.d.ts');

/** Lo que `expo-router` añade por su cuenta y no sale de ningún fichero. */
const DE_LA_CASA = new Set(['/_sitemap']);

const EXTENSIONES = new Set(['.tsx', '.ts', '.jsx', '.js']);

/**
 * Las rutas que TENDRÍA que haber, leídas del árbol de ficheros.
 *
 * Devuelve un mapa ruta → fichero, y no un conjunto, para poder decir en el
 * fallo de dónde sale cada una: «falta /formulario» sin más obliga a buscarlo.
 */
function rutasDelArbol(raiz) {
  const encontradas = new Map();

  const bajar = (dir, tramos) => {
    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
      const completo = path.join(dir, entrada.name);
      if (entrada.isDirectory()) {
        // Un grupo organiza carpetas y no aparece en la dirección.
        const esGrupo = entrada.name.startsWith('(') && entrada.name.endsWith(')');
        bajar(completo, esGrupo ? tramos : [...tramos, entrada.name]);
        continue;
      }
      const ext = path.extname(entrada.name);
      if (!EXTENSIONES.has(ext)) continue;
      const base = path.basename(entrada.name, ext);
      // `_layout` no es una pantalla; `+not-found` y compañía tampoco.
      if (base.startsWith('_') || base.startsWith('+')) continue;
      // `index` es la carpeta que lo contiene.
      const propios = base === 'index' ? tramos : [...tramos, base];
      const ruta = `/${propios.join('/')}`;
      encontradas.set(ruta === '/' ? '/' : ruta, path.relative(APP, completo));
    }
  };

  bajar(raiz, []);
  return encontradas;
}

/**
 * Las rutas que el fichero generado DECLARA.
 *
 * ═══ SE LEE UNA LÍNEA Y NO EL FICHERO, Y ESTO LO ENSEÑÓ LA VACUNA ═══
 *
 * El generado trae tres líneas equivalentes —`hrefInputParams`,
 * `hrefOutputParams` y `href`— y solo se mira la primera. Las dos primeras
 * dicen lo mismo; la tercera NO se puede leer con una expresión regular, porque
 * mete plantillas dentro de plantillas (`` `/avatar${`?${string}`}` ``) y las
 * comillas invertidas anidadas desemparejan cualquier barrido ingenuo.
 *
 * Y dentro de la línea se cogen TODOS los literales, no solo el que va detrás de
 * `pathname:`. La primera versión de esto se anclaba ahí y la vacuna la cazó en
 * el primer intento: una pantalla dentro de un grupo se declara como
 * `` { pathname: `${'/(arcade)'}/formulario` | `/formulario`; … } ``, o sea que
 * el literal pegado a `pathname:` es justo el que hay que DESCARTAR —lleva
 * `${` dentro— y el bueno es el segundo, que no tiene nada delante.
 *
 * Con el ancla, `/formulario` no se leía nunca: este comprobador habría dicho
 * que la tabla no conoce una ruta que sí conoce, en cada pantalla de cada grupo.
 * Un rojo permanente y falso, que es la otra forma de que un comprobador acabe
 * desactivado.
 */
function rutasDeclaradas(texto) {
  const linea = texto.split('\n').find((l) => l.includes('hrefInputParams:')) ?? '';
  const declaradas = new Set();
  for (const [, literal] of linea.matchAll(/`([^`]*)`/g)) {
    if (literal.includes('${')) continue;
    if (!literal.startsWith('/')) continue;
    declaradas.add(literal);
  }
  return declaradas;
}

// ---------------------------------------------------------------------------
// LA VACUNA: que el lector lea, antes de creerle que no hay diferencias
// ---------------------------------------------------------------------------

const MUESTRA = `      hrefInputParams: ${[
  '{ pathname: `/avatar`; params?: X; }',
  '{ pathname: `/`; params?: X; }',
  "{ pathname: `${'/(arcade)'}/formulario` | `/formulario`; params?: X; }",
  '{ pathname: `/e/[codigo]`, params: X }',
].join(' | ')};`;
const ESPERADO_DE_LA_MUESTRA = ['/', '/avatar', '/e/[codigo]', '/formulario'];

{
  const leidas = [...rutasDeclaradas(MUESTRA)].sort();
  const cuadra = JSON.stringify(leidas) === JSON.stringify(ESPERADO_DE_LA_MUESTRA);
  if (!cuadra) {
    console.error('✗ El lector de rutas de este comprobador está roto: no saca de su propia muestra lo que dice sacar.');
    console.error(`  esperaba: ${ESPERADO_DE_LA_MUESTRA.join(', ')}`);
    console.error(`  ha leído: ${leidas.join(', ') || '(nada)'}`);
    console.error('\n  Sin esta vacuna, un lector que no lee nada encuentra cero diferencias y felicita a todo el mundo.');
    process.exit(2);
  }
}

// ---------------------------------------------------------------------------
// La comprobación
// ---------------------------------------------------------------------------

const COMO_SE_REGENERA = [
  '',
  '  Se regenera arrancando la app una vez, y basta con que llegue a empaquetar:',
  '',
  '      npm run web --prefix app',
  '',
  '  (o `npm start --prefix app`). Ese fichero está en `.gitignore` a propósito',
  '  —es un artefacto de la máquina, no del proyecto— así que en un clon recién',
  '  hecho SIEMPRE falta, y eso no es un fallo de nadie: es este comprobador',
  '  diciendo que `tipos · móvil` todavía no puede opinar.',
].join('\n');

if (!fs.existsSync(GENERADO)) {
  console.error('✗ No existe `app/.expo/types/router.d.ts`.');
  console.error('');
  console.error('  Sin él, `tipos · móvil` NO comprueba las rutas: `Href` se queda permisivo y');
  console.error('  cualquier cadena cuela. Eso es un verde que no significa nada.');
  console.error(COMO_SE_REGENERA);
  process.exit(1);
}

const esperadas = rutasDelArbol(PANTALLAS);
const declaradas = rutasDeclaradas(fs.readFileSync(GENERADO, 'utf8'));

const faltan = [...esperadas.keys()].filter((r) => !declaradas.has(r)).sort();
const sobran = [...declaradas].filter((r) => !esperadas.has(r) && !DE_LA_CASA.has(r)).sort();

if (faltan.length > 0 || sobran.length > 0) {
  console.error('✗ La tabla de rutas generada NO está al día con las pantallas que hay.');
  console.error('');
  if (faltan.length > 0) {
    console.error(`  ${faltan.length} pantalla(s) que existen y la tabla no conoce —`);
    console.error('  navegar a ellas se rechaza en tiempo de compilación aunque el fichero esté ahí:');
    for (const r of faltan) console.error(`      ${r.padEnd(24)}  ${esperadas.get(r)}`);
    console.error('');
  }
  if (sobran.length > 0) {
    console.error(`  ${sobran.length} ruta(s) que la tabla declara y ya no tienen fichero —`);
    console.error('  navegar a ellas compila y revienta al pulsar:');
    for (const r of sobran) console.error(`      ${r}`);
    console.error('');
  }
  console.error('  Mientras no coincidan, el veredicto de `tipos · móvil` habla de otro árbol.');
  console.error(COMO_SE_REGENERA);
  process.exit(1);
}

const fecha = fs.statSync(GENERADO).mtime.toISOString().slice(0, 16).replace('T', ' ');
console.log(
  `✓ Las ${esperadas.size} pantallas de app/app/ están en la tabla de rutas generada (${fecha}), y la tabla no declara ninguna que ya no exista.`,
);
