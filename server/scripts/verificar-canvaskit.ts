/**
 * ¿SE PEDIRÁ `canvaskit.wasm` DONDE ESTÁ?
 *
 *   npm run verify:canvaskit
 *
 * ═══ EL FALLO QUE ESTO CAZA, Y POR QUÉ MERECE UN COMPROBADOR PROPIO ═══
 *
 * El §7 del diseño del motor de arcade lo dejó apuntado ANTES de instalar Skia, y
 * eso es lo que hace que exista este fichero en vez de una tarde de depuración:
 *
 *   «`app/app.json` declara `baseUrl: "/jugar"`, así que el `locateFile` por
 *   defecto de CanvasKit pediría `/canvaskit.wasm` y daría 404 en Render — con el
 *   síntoma de una pantalla en blanco sin error legible. Es el mismo patrón de
 *   fallo mudo que ya se parcheó en `texturas-nativas.ts`. Merece su propio
 *   comprobador.»
 *
 * En web, Skia es CanvasKit: un binario de WebAssembly que el navegador descarga
 * aparte. Quien lo pide es el cargador de Emscripten, que sin instrucciones lo
 * busca en la RAÍZ DEL DOMINIO. La app no vive en la raíz —un solo servicio de
 * Render sirve la API, el taller y la app— así que la petición se va al comodín,
 * llega un HTML donde se esperaba un binario, y el instanciador de WebAssembly
 * falla con un mensaje sobre bytes mágicos que no se parece en nada a la causa.
 *
 * Nadie ve un error. Se ve una pantalla en blanco.
 *
 * ═══ LAS TRES COSAS QUE TIENEN QUE CUADRAR, Y LAS TRES SE MIRAN ═══
 *
 *  1. QUE LA CUENTA ESTÉ BIEN. No se busca una línea con una expresión regular: se
 *     LLAMA a la función que calcula la dirección y se mira lo que devuelve. Un
 *     comprobador que busca texto dice que alguien escribió algo; éste dice que la
 *     dirección es la correcta, que es otra cosa.
 *  2. QUE ALGUIEN LA USE. La cuenta buena en un fichero que nadie llama no sirve de
 *     nada, así que se comprueba que el cargador de web pasa `locateFile` y que ese
 *     `locateFile` sale de ahí.
 *  3. QUE EL FICHERO ESTÉ SERVIDO, y que siga estándolo en un clon recién hecho.
 *     El binario no se versiona —son ocho megabytes copiados de `node_modules`— y
 *     por eso lo pone el `postinstall`. Se comprueban LOS DOS: que está y que hay
 *     quien lo reponga. Este repositorio ya tiene apuntado un verde que dependía de
 *     un fichero sin versionar; la diferencia es que aquel no tenía quien lo
 *     repusiera.
 *
 * ═══ POR QUÉ ESTE COMPROBADOR VIVE EN `server/` SI HABLA DE LA APP ═══
 *
 * Porque los comprobadores de la app son `.mjs` y no pueden importar TypeScript, y
 * el punto 1 exige LLAMAR a una función que vive en `app/src/arcade/canvaskit.ts`.
 * Ese fichero se escribió a propósito sin una sola importación —ni React, ni React
 * Native, ni Expo— para que se pueda llamar desde fuera del empaquetador. Aquí se
 * importa con `tsx`, como todo lo demás de esta carpeta.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  dondePideCanvasKit,
  FICHERO_DE_CANVASKIT,
  rutaDeCanvasKit,
} from '../../app/src/arcade/canvaskit';
import { sinComentarios } from './sin-comentarios';

const REPO = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const APP = path.join(REPO, 'app');

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  const cola = detalle === undefined ? '' : `\n      ${String(detalle).slice(0, 400)}`;
  fallos.push(`${que}${cola}`);
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

function leer(rutaRelativa: string): string {
  try {
    return fs.readFileSync(path.join(REPO, rutaRelativa), 'utf8');
  } catch {
    return '';
  }
}

console.log('\nCanvasKit: que el `.wasm` se pida donde está\n');

// ---------------------------------------------------------------------------
// 1 · LA CUENTA, EJECUTADA
// ---------------------------------------------------------------------------

paso('La base que declara `app.json`, y la dirección que sale de ella');

const appJson = leer('app/app.json');
comprobar('se puede leer `app/app.json`', appJson.length > 0);

let base: string | undefined;
try {
  const leido = JSON.parse(appJson) as { expo?: { experiments?: { baseUrl?: unknown } } };
  const cruda = leido.expo?.experiments?.baseUrl;
  base = typeof cruda === 'string' ? cruda : undefined;
} catch (error) {
  comprobar('`app/app.json` es JSON válido', false, String(error));
}

comprobar(
  '`experiments.baseUrl` está declarada',
  typeof base === 'string' && base.length > 0,
  'si un día se quita, este comprobador tiene que enterarse: sin base, el `locateFile` por ' +
    'defecto vuelve a ser el correcto y esta pieza deja de hacer falta. Quitarla en silencio ' +
    'dejaría una cuenta que ya no cuadra con nada.',
);

if (typeof base === 'string' && base.length > 0) {
  const donde = rutaDeCanvasKit(base, FICHERO_DE_CANVASKIT);
  console.log(`  baseUrl «${base}» → «${donde}»`);

  comprobar(
    'la dirección del `.wasm` empieza por la base de la app',
    donde.startsWith(base.endsWith('/') ? base : `${base}/`),
    donde,
  );
  comprobar(
    'y no es la de la raíz del dominio, que es la que da 404 en Render',
    donde !== `/${FICHERO_DE_CANVASKIT}`,
    donde,
  );
  comprobar('y acaba en el nombre del fichero', donde.endsWith(`/${FICHERO_DE_CANVASKIT}`), donde);
  comprobar('y no lleva una barra doble por el camino', !donde.includes('//'), donde);

  /*
   * ═══ Y LAS DOS DIRECCIONES DE VERDAD, QUE NO SON LA MISMA ═══
   *
   * Este comprobador estuvo en verde con el camino de DESARROLLO roto, y merece la
   * pena decir exactamente por qué: comprobaba `rutaDeCanvasKit(base, …)` y daba
   * por hecho que la base valía siempre. No vale. Metro sustituye
   * `EXPO_BASE_URL` por `/jugar` también en desarrollo, pero sirve `app/public/`
   * en la RAÍZ, así que `/jugar/canvaskit.wasm` devolvía el `index.html` y Emscripten
   * abortaba con los bytes mágicos de `<!DO`. Medido por HTTP contra
   * `expo start --web`; en producción, servido como lo sirve `jugar-web.ts`, el
   * binario llegaba bien.
   *
   * O sea que el comprobador escrito para que ese fallo no pasara desapercibido
   * medía UNA CADENA en vez de LA RESPUESTA, y por eso no lo cazó. Levantar Metro
   * dentro de la batería para pedirlo de verdad costaría un minuto largo por
   * ejecución y sería lo primero que alguien quitaría; lo que sí se puede hacer es
   * ejecutar la cuenta CON LAS DOS RAMAS y fijar las dos respuestas, que es lo que
   * separa las dos disposiciones de servidor que existen.
   */
  const enDesarrollo = dondePideCanvasKit(base, true, FICHERO_DE_CANVASKIT);
  const enProduccion = dondePideCanvasKit(base, false, FICHERO_DE_CANVASKIT);
  console.log(`  desarrollo → «${enDesarrollo}» · producción → «${enProduccion}»`);
  comprobar(
    'en DESARROLLO se pide en la raíz, que es donde Metro sirve `app/public/`',
    enDesarrollo === `/${FICHERO_DE_CANVASKIT}`,
    `${enDesarrollo}. Con la base delante, el servidor de desarrollo contesta el index.html con ` +
      'un 200 y WebAssembly aborta con «expected magic word 00 61 73 6d, found 3c 21 44 4f».',
  );
  comprobar(
    'en PRODUCCIÓN se pide bajo la base, que es donde `jugar-web.ts` monta el `dist`',
    enProduccion === donde,
    `${enProduccion}. Sin la base, en Render el comodín contesta el index.html y la pantalla se ` +
      'queda en blanco sin error legible.',
  );
  comprobar(
    'y las dos NO son la misma, que es la razón entera de que haya dos ramas',
    enDesarrollo !== enProduccion,
    'si salieran iguales, una de las dos disposiciones de servidor está mal servida y la rama ' +
      'sobra: quitarla a sabiendas es mejor que dejarla decorando.',
  );
}

/*
 * ═══ LA VACUNA, CON LOS TRES CASOS QUE LA FUNCIÓN TIENE QUE DISTINGUIR ═══
 *
 * Sin esto, `rutaDeCanvasKit` podría devolver la cadena vacía, o el nombre pelado,
 * y todo lo de arriba seguiría en verde mientras la base fuera la que es. Una
 * comprobación que solo se ejecuta con los datos buenos nunca se ha visto fallar.
 */
paso('La vacuna: la cuenta tiene que distinguir los tres casos');
comprobar(
  'sin base se devuelve la raíz, que es lo que hacía el cargador por su cuenta',
  rutaDeCanvasKit(undefined, 'x.wasm') === '/x.wasm',
  rutaDeCanvasKit(undefined, 'x.wasm'),
);
comprobar(
  'con base sale la base delante',
  rutaDeCanvasKit('/jugar', 'x.wasm') === '/jugar/x.wasm',
  rutaDeCanvasKit('/jugar', 'x.wasm'),
);
comprobar(
  'y con la barra de más, no salen dos',
  rutaDeCanvasKit('/jugar/', 'x.wasm') === '/jugar/x.wasm',
  rutaDeCanvasKit('/jugar/', 'x.wasm'),
);
comprobar(
  'y una base sin barra inicial también sale bien formada',
  rutaDeCanvasKit('jugar', 'x.wasm') === '/jugar/x.wasm',
  rutaDeCanvasKit('jugar', 'x.wasm'),
);

// ---------------------------------------------------------------------------
// 2 · QUE ALGUIEN USE LA CUENTA
// ---------------------------------------------------------------------------

paso('El cargador de web pasa `locateFile`, y lo saca de ahí');

const cargador = sinComentarios(leer('app/src/arcade/skia.web.ts'));
comprobar('existe el cargador de web `app/src/arcade/skia.web.ts`', cargador.length > 0);
comprobar(
  'llama a `LoadSkiaWeb`',
  /\bLoadSkiaWeb\s*\(/.test(cargador),
  'sin esta llamada no se descarga CanvasKit y en web no se pinta nada.',
);
comprobar(
  'y le pasa un `locateFile`',
  /\blocateFile\b/.test(cargador),
  'sin `locateFile`, Emscripten pide el `.wasm` en la raíz del dominio. Es EXACTAMENTE el fallo ' +
    'que este comprobador existe para cazar.',
);
comprobar(
  'que sale de `dondePideCanvasKit`, y no de una cadena escrita a mano',
  /\bdondePideCanvasKit\s*\(/.test(cargador),
  'con la dirección escrita a mano aquí, la cuenta de `canvaskit.ts` sería una función que nadie ' +
    'llama y este comprobador estaría midiendo código muerto.',
);
comprobar(
  'y distingue desarrollo de producción con `__DEV__`',
  /\b__DEV__\b/.test(cargador),
  'sin esa rama, el servidor de desarrollo de Metro contesta el `index.html` con un 200 al pedir ' +
    'el `.wasm` bajo la base, y el lienzo no arranca por el único camino que hoy existe para ' +
    'verlo correr en esta máquina. Ver la cabecera de `dondePideCanvasKit`.',
);
comprobar(
  'y que lee la base de `process.env.EXPO_BASE_URL`, entera y sin variable de por medio',
  /process\.env\.EXPO_BASE_URL/.test(cargador),
  'Metro SUSTITUYE esa expresión por un literal al empaquetar. Guardarla antes en una variable ' +
    '—`const env = process.env`— deja la sustitución sin nada que sustituir, y en producción sale ' +
    '`undefined`: o sea el fallo de la raíz del dominio otra vez, y esta vez sin que nadie lo espere.',
);

// ---------------------------------------------------------------------------
// 3 · QUE EL FICHERO ESTÉ, Y QUE SIGA ESTANDO
// ---------------------------------------------------------------------------

paso('El binario está servido, y hay quien lo reponga en un clon nuevo');

const servido = path.join(APP, 'public', FICHERO_DE_CANVASKIT);
const enElPaquete = path.join(APP, 'node_modules', 'canvaskit-wasm', 'bin', 'full', FICHERO_DE_CANVASKIT);

comprobar(
  `\`app/public/${FICHERO_DE_CANVASKIT}\` existe`,
  fs.existsSync(servido),
  'lo copia `npx setup-skia-web public`. Sin él, en web no hay nada que descargar y la pantalla ' +
    'se queda cargando para siempre.',
);
comprobar(
  'y `canvaskit-wasm` está instalado, que es de donde sale',
  fs.existsSync(enElPaquete),
  enElPaquete,
);
if (fs.existsSync(servido) && fs.existsSync(enElPaquete)) {
  const servidoBytes = fs.statSync(servido).size;
  const originalBytes = fs.statSync(enElPaquete).size;
  console.log(`  ${(servidoBytes / 1048576).toFixed(1)} MB servidos desde app/public/`);
  comprobar(
    'y el que se sirve es del mismo tamaño que el del paquete: no se ha quedado viejo',
    servidoBytes === originalBytes,
    `servido ${servidoBytes} · paquete ${originalBytes}. Una versión de Skia nueva trae un ` +
      '`.wasm` nuevo, y el viejo falla al instanciarse contra el cargador nuevo.',
  );
}

const paqueteDeLaApp = leer('app/package.json');
comprobar(
  'el `postinstall` de la app repone el binario',
  /"postinstall"\s*:\s*"[^"]*setup-skia-web[^"]*"/.test(paqueteDeLaApp),
  'sin él, un clon recién instalado y el despliegue de Render se quedan sin `.wasm`, y el ' +
    'síntoma es una pantalla en blanco. Es la mitad que hace que no versionarlo sea legítimo.',
);
comprobar(
  'y el binario está fuera del repositorio, que es la otra mitad',
  /^public\/canvaskit\.wasm$/m.test(leer('app/.gitignore')),
  'son ocho megabytes que ya viajan dentro de `node_modules`. Meter una copia en el historial ' +
    'de git es para siempre.',
);

// ---------------------------------------------------------------------------
// 4 · Y QUE NADIE IMPORTE SKIA ANTES DE TIEMPO
// ---------------------------------------------------------------------------

paso('Skia no se importa hasta que CanvasKit está cargado');

/*
 * ═══ EL SEGUNDO FALLO MUDO DE ESTA PIEZA, Y ES PEOR QUE EL PRIMERO ═══
 *
 * En web, el paquete de Skia hace esto AL CARGARSE el módulo:
 *
 *     export const Skia = JsiSkApi(global.CanvasKit);
 *
 * `global.CanvasKit` no existe hasta que `LoadSkiaWeb` termina de descargar el
 * binario. O sea que importar el paquete antes de tiempo no falla al pintar:
 * FALLA EN LA LÍNEA DEL `import`.
 *
 * Y el alcance es mucho mayor de lo que parece. La PORTADA lee la Sala de Arcade
 * para saber qué tarjetas son pulsables —`vitrina.ts` → `pintados.ts` → el
 * componente del juego— así que un `import` estático de Skia en esa cadena se
 * ejecuta al abrir la app, antes de que nadie haya tocado nada, y deja LA PORTADA
 * ENTERA en blanco en web. Con el `.wasm` mal pedido se pierde una pantalla; con
 * esto, la app.
 *
 * Por eso el juego entra con `React.lazy` y todo lo que toca Skia vive en un
 * fichero aparte. Esto vigila que siga siendo así, porque deshacerlo es una línea
 * razonable: alguien que quiera «simplificar» juntando los dos ficheros.
 */
/*
 * ═══ LA CADENA SE DERIVA, NO SE ESCRIBE A MANO. Y ESO ES UNA CORRECCIÓN ═══
 *
 * La primera versión de este bloque llevaba tres ficheros escritos a mano:
 * `vitrina.ts`, `pintados.ts` y `arcade.tsx`. La cadena real de la portada tiene
 * CUATRO, y el que faltaba es precisamente el único de los cuatro que hoy importa
 * del paquete: `arcade.tsx` hace `import { usarCanvasKit } from './skia'`, que
 * Metro resuelve en web a `skia.web.ts`, y ése importa
 * `@shopify/react-native-skia/lib/module/web`.
 *
 * O sea: el agujero estaba justo donde el riesgo. Hoy no revienta porque ese punto
 * de entrada no arrastra la fábrica `Skia` —`web/index` llega a `skia/types`, que
 * no la importa—, pero eso es una propiedad del paquete y no algo que este fichero
 * estuviera midiendo. Mañana alguien cambia esa línea por
 * `import { Skia } from '@shopify/react-native-skia'` para «simplificar», la
 * portada entera se queda en blanco en web, y el comprobador sigue verde porque
 * mira tres ficheros elegidos a dedo.
 *
 * Así que se sigue el grafo. La regla del §10 del diseño vale igual aquí: los
 * hechos que se pueden derivar leyendo el fichero que los causa, se derivan; si la
 * causa desaparece, la comprobación se entera sola.
 *
 * SE SIGUEN SOLO LAS IMPORTACIONES ESTÁTICAS, que es lo que hace que la frontera
 * de `React.lazy` sea de verdad una frontera: un `import('./arcade-lienzo')`
 * dinámico no se sigue, porque eso es exactamente lo que se está comprando —que
 * ese trozo no se evalúe al abrir la app—.
 *
 * Y SE SIGUEN LAS DOS RESOLUCIONES de un mismo especificador cuando existen las
 * dos, `X.ts` y `X.web.ts`, porque Metro escoge la de web y quien lee el árbol ve
 * la otra. Ése era literalmente el fichero que faltaba.
 */
const EXTENSIONES = ['.web.tsx', '.web.ts', '.tsx', '.ts'];

/** Todas las formas en que un especificador relativo puede existir en disco. */
function resolver(desde: string, especificador: string): string[] {
  const base = path.resolve(path.dirname(path.join(REPO, desde)), especificador);
  const salida: string[] = [];
  for (const ext of EXTENSIONES) {
    const candidato = `${base}${ext}`;
    if (fs.existsSync(candidato)) salida.push(path.relative(REPO, candidato).split(path.sep).join('/'));
  }
  for (const ext of EXTENSIONES) {
    const candidato = path.join(base, `index${ext}`);
    if (fs.existsSync(candidato)) salida.push(path.relative(REPO, candidato).split(path.sep).join('/'));
  }
  return salida;
}

/** El cierre transitivo de las importaciones ESTÁTICAS relativas desde la portada. */
function cadenaDesde(raiz: string): string[] {
  const vistos = new Set<string>();
  const cola = [raiz];
  while (cola.length > 0) {
    const actual = cola.shift() as string;
    if (vistos.has(actual)) continue;
    vistos.add(actual);
    const fuente = sinComentarios(leer(actual));
    /*
     * `import … from '…'` y `export … from '…'`, que es la otra forma de arrastrar
     * un módulo entero sin que lo parezca. No se mira `import('…')`: el paréntesis
     * detrás de `import` es justo lo que lo distingue.
     */
    const patron = /\b(?:import|export)\b[^;'"]*?\bfrom\s+'([^']+)'/g;
    let hallado: RegExpExecArray | null = patron.exec(fuente);
    while (hallado !== null) {
      const especificador = hallado[1] as string;
      if (especificador.startsWith('.')) {
        for (const destino of resolver(actual, especificador)) cola.push(destino);
      }
      hallado = patron.exec(fuente);
    }
  }
  return [...vistos].sort();
}

const cadenaDeLaPortada = cadenaDesde('app/src/vitrina.ts');
console.log(`  ${cadenaDeLaPortada.length} ficheros cuelgan estáticamente de la portada`);

/*
 * Los tres que la versión escrita a mano vigilaba, más el cuarto que se le
 * escapaba. Si la derivación se rompiera —una expresión regular que deja de
 * casar, un `resolver` que no encuentra nada— la lista se quedaría en un fichero
 * y todo lo de abajo pasaría en verde sin mirar nada. Esto lo impide.
 */
for (const obligatorio of [
  'app/src/vitrina.ts',
  'app/src/arcade/pintados.ts',
  'app/src/arcade/arcade.tsx',
  'app/src/arcade/skia.web.ts',
]) {
  comprobar(
    `la cadena derivada incluye ${obligatorio}`,
    cadenaDeLaPortada.includes(obligatorio),
    cadenaDeLaPortada,
  );
}
comprobar(
  'y NO incluye `arcade-lienzo.tsx`, que entra por `React.lazy` y por eso no se sigue',
  !cadenaDeLaPortada.includes('app/src/arcade/arcade-lienzo.tsx'),
  'si aparece aquí es que alguien lo importa de forma estática desde la portada, y entonces el ' +
    '`lazy` no aplaza nada: el `JsiSkApi(global.CanvasKit)` del paquete se evalúa al abrir la app.',
);

/*
 * Se comprueba la cadena ENTERA con una sola línea por pregunta, y no una
 * comprobación por fichero: la lista la decide el grafo y crece sola, y un
 * comprobador que imprime cuarenta líneas iguales se lee como ruido en vez de
 * como una red. Lo que importa es la lista de culpables, que va en el detalle.
 */
const ilegibles = cadenaDeLaPortada.filter((rel) => leer(rel).length === 0);
comprobar(
  'todos los ficheros de la cadena de la portada se pueden leer',
  ilegibles.length === 0,
  ilegibles,
);

const conSkiaEstatico = cadenaDeLaPortada.filter((rel) =>
  /from\s+'@shopify\/react-native-skia'/.test(sinComentarios(leer(rel))),
);
comprobar(
  'ninguno de ellos importa la RAÍZ de `@shopify/react-native-skia` de forma estática',
  conSkiaEstatico.length === 0,
  `${JSON.stringify(conSkiaEstatico)} — esa importación se ejecuta al abrir la app y en web ` +
    'revienta en la línea del `import`, antes de que CanvasKit exista, y deja la portada entera ' +
    'en blanco. Lo que toca Skia va en `arcade-lienzo.tsx`, que entra con `React.lazy`.',
);

/*
 * ═══ Y LA EXCEPCIÓN QUE HAY, DICHA CON NOMBRE Y APELLIDOS ═══
 *
 * `skia.web.ts` sí importa del paquete, pero de `@shopify/react-native-skia/lib/
 * module/web`, que es el cargador y NO la fábrica: ese punto de entrada llega a
 * `skia/types` y no evalúa `JsiSkApi(global.CanvasKit)`. Por eso la portada carga
 * bien en web con él dentro.
 *
 * Que la distinción sea entre DOS especificadores y no entre dos ficheros es lo
 * que hace que la comprobación de arriba siga teniendo dientes con la cadena
 * derivada: lo que se prohíbe es la raíz del paquete, que es la que arrastra la
 * fábrica, y se prohíbe en los cuatro ficheros y no en tres.
 */
comprobar(
  'el cargador de web importa el punto de entrada `/lib/module/web`, que no arrastra la fábrica',
  /from\s+'@shopify\/react-native-skia\/lib\/module\/web'/.test(cargador),
  'si algún día importa la raíz del paquete, la portada se queda en blanco en web al abrir la ' +
    'app: `export const Skia = JsiSkApi(global.CanvasKit)` corre en la línea del `import`.',
);
comprobar(
  'y el componente del lienzo entra con carga perezosa',
  /lazy\s*\(\s*\(\s*\)\s*=>\s*import\(['"]\.\/arcade-lienzo['"]\)\s*\)/.test(
    sinComentarios(leer('app/src/arcade/arcade.tsx')),
  ),
  'sin `lazy`, el `import` es estático y da igual dónde esté escrito.',
);
comprobar(
  'el fichero perezoso es el que sí importa Skia, o sea que hay algo que aplazar',
  /from\s+'@shopify\/react-native-skia/.test(sinComentarios(leer('app/src/arcade/arcade-lienzo.tsx'))),
  'si ya nadie importa Skia, esta comprobación está vigilando un problema que no existe y hay ' +
    'que quitarla a sabiendas en vez de dejarla en verde para siempre.',
);

// ---------------------------------------------------------------------------
// 5 · LA VERSIÓN, QUE TIENE QUE SER LA QUE TRAE EXPO GO
// ---------------------------------------------------------------------------

paso('La versión de Skia es exactamente la que Expo trae dentro');

/*
 * ═══ POR QUÉ ESTO ES UNA COMPROBACIÓN Y NO UN DETALLE DE INSTALACIÓN ═══
 *
 * Skia tiene parte nativa. En Expo Go, esa parte nativa es la que Expo compiló
 * dentro de su binario, y la versión está escrita en `bundledNativeModules.json`.
 * Con un `^` en el `package.json`, cualquier instalación futura se traería una
 * versión de JavaScript más nueva que la parte nativa que hay en el aparato — y
 * eso no da un error de compilación: da un fallo en ejecución al abrir la
 * pantalla, en el móvil de otro, con un mensaje sobre un método que no existe.
 */
const bundled = leer('app/node_modules/expo/bundledNativeModules.json');
comprobar('se puede leer `bundledNativeModules.json` de Expo', bundled.length > 0);
if (bundled.length > 0 && paqueteDeLaApp.length > 0) {
  const tabla = JSON.parse(bundled) as Record<string, string>;
  const laDeExpo = tabla['@shopify/react-native-skia'];
  const declarada = (JSON.parse(paqueteDeLaApp) as { dependencies?: Record<string, string> })
    .dependencies?.['@shopify/react-native-skia'];
  console.log(`  Expo trae ${laDeExpo ?? '(nada)'} · la app declara ${declarada ?? '(nada)'}`);
  comprobar(
    'la app declara la misma versión de Skia que trae Expo, y CLAVADA sin `^` ni `~`',
    declarada !== undefined && declarada === laDeExpo,
    'con un rango, la próxima instalación puede traerse una versión de JavaScript que no case ' +
      'con la parte nativa de Expo Go, y eso se descubre abriendo la pantalla en un móvil ajeno.',
  );
}

// ---------------------------------------------------------------------------

console.log('');
if (fallos.length === 0) {
  console.log(
    `✔ ${hechas} comprobaciones. El \`.wasm\` está servido, lo repone la instalación, y se pide\n` +
      '  donde está en LAS DOS disposiciones: en la raíz con el servidor de desarrollo y bajo la\n' +
      '  base de `app.json` en producción. Y ningún fichero de la cadena de la portada —derivada\n' +
      '  siguiendo los `import`, no escrita a mano— importa la raíz de Skia antes de tiempo.',
  );
  process.exit(0);
}
console.log(`✘ ${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
for (const f of fallos) console.log(`   · ${f}`);
process.exit(1);
