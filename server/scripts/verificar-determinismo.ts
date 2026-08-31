/**
 * ¿DA EL MISMO RESULTADO LA MISMA PARTIDA? — LA PRUEBA DURA DE LA ARQUITECTURA.
 *
 *   npm run verify:determinismo
 *
 * ═══ QUÉ AFIRMA, Y POR QUÉ ES LA COMPROBACIÓN MÁS IMPORTANTE DE LA FASE ═══
 *
 * Todo el motor de arcade cuelga de una frase: el reductor es puro, así que la
 * misma partida da siempre lo mismo. De ahí salen la verificación de marcadores,
 * la repetición de partidas, la autoridad barata de servidor y la predicción con
 * rebobinado el día que haya un canal rápido.
 *
 * Eso está DECLARADO en cabeceras y vigilado estáticamente por `verify:pureza`,
 * que caza las siete formas conocidas de perder la pureza. Lo que no puede hacer
 * un barrido estático es DEMOSTRARLO. Aquí se demuestra, en tres escalones:
 *
 *  1. LA MISMA PARTIDA, DOS VECES EN EL MISMO MOTOR. Caza el estado escondido —una
 *     variable de módulo, una lista que se muta, un contador global— que hace que
 *     la segunda ejecución no se parezca a la primera. Es barato y caza mucho.
 *  2. LA MISMA PARTIDA EN NODE Y EN HERMES. Caza lo otro: la divergencia de coma
 *     flotante entre motores de JavaScript, que es el fallo que NO REPRODUCE
 *     NINGÚN TEST ESCRITO A MANO y que se manifiesta seis meses después como «el
 *     jugador ve una partida distinta a la del vecino», en un solo modelo de
 *     móvil, sin forma de reproducirlo.
 *  3. LA PARTIDA JUGADA CONTRA LA PARTIDA EXPANDIDA DESDE SU REPETICIÓN. Es la
 *     afirmación de la que cuelgan el marcador y la fase entera, y es la que
 *     faltaba: los dos escalones de arriba juegan las dos veces con el MISMO
 *     bucle, así que ninguno pasa por `movimientosDe` ni por `reejecutar` — o
 *     sea que ninguno comprueba que la regla de expansión del servidor coincida
 *     con la convención con la que graba el dispositivo.
 *
 * ═══ POR QUÉ EL ESCALÓN 3 EXISTE, DICHO CON EL FALLO QUE TAPÓ ═══
 *
 * Porque sin él la fase pasó cincuenta y tres comprobaciones en verde con la
 * expansión desfasada un paso: `movimientosDe` metía las entradas del tic T ANTES
 * del paso T y los dos grabadores las apuntaban DESPUÉS. Medido sobre doscientas
 * partidas del robot, 108 reejecutaban a otro estado y 14 daban otra cifra, o sea
 * récords honrados rechazados con `cifra-que-no-sale`.
 *
 * Lo que los escalones 1 y 2 demuestran es que el reductor es reproducible, y eso
 * ya lo vigila `verify:pureza` por otro camino. Lo que un reductor puro sirve para
 * COMPRAR —que una partida quepa en unos cientos de bytes y se pueda reconstruir
 * desde el servidor— no lo tocaba nadie. Una comparación de tres líneas lo habría
 * puesto rojo en 112 semillas de cada 200.
 *
 * ═══ POR QUÉ HERMES Y DE DÓNDE SALE ═══
 *
 * Porque es el motor que ejecuta la app: React Native lo lleva dentro, y el mismo
 * `shared/arcade/juegos/arcade.ts` que corre en Node al verificar un récord corre
 * en Hermes al jugarlo. Si los dos no coinciden, el récord de quien jugó limpio
 * sale rechazado.
 *
 * Y aquí hay que decir algo que costó encontrar y que conviene que quede escrito:
 * EL HERMES QUE VIAJA DENTRO DE `react-native` NO SE PUEDE EJECUTAR. Lo que hay en
 * `app/node_modules` es `hermesc`, que es el COMPILADOR: convierte JavaScript en
 * bytecode y se niega expresamente a ejecutarlo —«hermesc does not support -exec»—.
 * El intérprete viaja dentro del binario de la app, para Android y para iOS, y no
 * hay ninguno para el escritorio donde corre la batería.
 *
 * Así que el intérprete entra como dependencia de desarrollo: `hermes-engine-cli`,
 * publicado por el equipo de Hermes, con `hermes.exe` para Windows y `hermes` para
 * macOS y Linux. Tiene TRES pegas y las tres se dicen aquí en vez de descubrirlas:
 *
 *   · ESTÁ MARCADO COMO DEPRECADO en npm. Sigue descargándose y funciona; no va a
 *     recibir versiones nuevas.
 *   · ES LA VERSIÓN 0.12 y la app lleva la que traiga React Native 0.86, que es
 *     bastante posterior. O sea que esto NO compara «el Hermes de la app» contra
 *     Node: compara UN Hermes contra Node. Para lo que se busca —cazar
 *     `Math.sin`, `Math.pow`, un `sort` sin comparador, un `for…in`— sirve igual,
 *     porque son diferencias entre FAMILIAS de motores y no entre versiones. Para
 *     afirmar «esta partida da lo mismo en el móvil de producción», no basta, y no
 *     se afirma.
 *   · PESA CIENTO TREINTA MEGABYTES, porque trae los binarios de los tres sistemas
 *     operativos en el mismo paquete. Es caro y es lo que hay: no existe un
 *     paquete por plataforma.
 *
 * ═══ Y QUÉ PASA SI EL BINARIO NO ESTÁ ═══
 *
 * ESTO SE PONE ROJO. No se salta el segundo escalón con un aviso amable, que es lo
 * que hace todo el mundo y es exactamente el patrón de verde falso que este
 * repositorio tiene apuntado tres veces. Una comprobación de determinismo que no
 * compara motores es una comprobación que no comprueba lo que dice, y si va a
 * dejar de hacerlo tiene que verse.
 *
 * ═══ SE COMPARA CON `canonico.ts` Y NO CON `JSON.stringify` ═══
 *
 * `JSON.stringify` conserva el ORDEN DE INSERCIÓN de las claves, así que dos
 * estados semánticamente idénticos construidos en distinto orden darían cadenas
 * distintas y este comprobador gritaría sin que pasara nada. Un comprobador que
 * grita cuando no pasa nada acaba desactivado, que es peor que no tenerlo.
 * `shared/mecanicas/canonico.ts` ordena las claves y además RECHAZA lo que
 * `JSON.stringify` se traga en silencio.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { canonico, mismoEstado } from '../../shared/mecanicas/canonico';
/* Instala los arcades: sin esto `reejecutarEn` no encuentra el reductor. */
import '../../shared/arcade/juegos';
import { EL_ARCADE } from '../../shared/arcade/juegos';
import { movimientoDeTic, reejecutarEn } from '../../shared/arcade';
import type { MovimientoRegistrado } from '../../shared/arcade';
import { movimientosDe } from '../src/arcade/repeticiones';
import type { Repeticion } from '../src/arcade/repeticiones';
import { jugarGrabando, jugarLaTanda, jugarUna, SEMILLAS, segundosDeLaTanda, TOPE_DE_PASOS } from './guion-determinismo';
import type { Jugada, Tanda } from './guion-determinismo';

const REPO = path.resolve(import.meta.dirname ?? __dirname, '..', '..');

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  const cola = detalle === undefined ? '' : `\n      ${String(detalle).slice(0, 900)}`;
  fallos.push(`${que}${cola}`);
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

/** Dónde empiezan a diferir dos cadenas, con lo de alrededor. */
function dondeDifieren(uno: string, otro: string): string {
  const hasta = Math.min(uno.length, otro.length);
  let i = 0;
  while (i < hasta && uno[i] === otro[i]) i++;
  const desde = i > 60 ? i - 60 : 0;
  return (
    `en el carácter ${i} de ${uno.length}/${otro.length}\n` +
    `      uno: …${uno.slice(desde, i + 60)}\n` +
    `      otro: …${otro.slice(desde, i + 60)}`
  );
}

console.log(
  '\nEl determinismo del reductor: dos veces, en dos motores, y expandido desde su repetición\n',
);

// ---------------------------------------------------------------------------
// PRIMERO LA VACUNA, COMO EN `verify:pureza`, Y ANTES DE MIRAR NADA
// ---------------------------------------------------------------------------

/*
 * ═══ POR QUÉ ESTO VA DELANTE ═══
 *
 * Porque todo lo de abajo se apoya en una sola operación: comparar dos huellas. Si
 * esa comparación estuviera rota —una función que devuelve siempre `true`, un
 * `canonico` que se traga las diferencias— este fichero felicitaría a todo el
 * mundo para siempre y nadie lo notaría, porque un comprobador que nunca ha
 * fallado no se distingue de uno que no comprueba nada.
 *
 * Este repositorio tiene TRES casos anotados de exactamente eso. Así que aquí la
 * comparación se ve fallar en cada ejecución, contra dos estados que se diferencian
 * en un solo número y en un solo orden de claves.
 */
paso('La vacuna: la comparación tiene que verse fallar antes de creerle nada');
{
  const uno = { a: 1, b: [1, 2, 3], c: { x: 'hola' } };
  const otro = { a: 1, b: [1, 2, 4], c: { x: 'hola' } };
  comprobar('dos estados que difieren en un número NO son el mismo', !mismoEstado(uno, otro));

  /*
   * Y la otra mitad, que es la razón de existir de `canonico.ts`: el mismo estado
   * construido en otro orden SÍ es el mismo. Con `JSON.stringify` a los dos lados
   * esto daría distinto y el comprobador daría un rojo falso.
   */
  const izquierda = { alfa: 1, beta: 2 };
  const derecha: Record<string, number> = {};
  derecha.beta = 2;
  derecha.alfa = 1;
  comprobar('el mismo estado en otro orden de claves SÍ es el mismo', mismoEstado(izquierda, derecha));
  comprobar(
    'y `JSON.stringify` los habría dado por distintos, que es por lo que existe `canonico`',
    JSON.stringify(izquierda) !== JSON.stringify(derecha),
    `${JSON.stringify(izquierda)} vs ${JSON.stringify(derecha)}`,
  );
}

// ---------------------------------------------------------------------------
// ESCALÓN 1 · LA MISMA PARTIDA, DOS VECES, EN ESTE MISMO PROCESO
// ---------------------------------------------------------------------------

paso('El mismo registro dos veces en Node, comparando el estado serializado');

const primera = jugarLaTanda();
const segunda = jugarLaTanda();

comprobar(
  `se han jugado ${SEMILLAS.length} partidas con semillas distintas`,
  primera.jugadas.length === SEMILLAS.length,
);

/*
 * Que las partidas sean LARGAS importa: cuatro partidas que se acabaran en el
 * primer segundo compararían el primer segundo. Si un cambio en las reglas hace
 * que el robot muera enseguida, esto lo dice en vez de dejar pasar una comparación
 * vacía disfrazada de verde.
 */
const segundos = segundosDeLaTanda(primera);
comprobar(
  'las partidas duran lo bastante para recorrer la subida de dificultad',
  segundos > 30,
  `entre las ${SEMILLAS.length} suman ${segundos.toFixed(1)} s de juego`,
);

for (let i = 0; i < primera.jugadas.length; i++) {
  const a = primera.jugadas[i] as Jugada;
  const b = segunda.jugadas[i] as Jugada;
  console.log(
    `  semilla ${String(a.semilla).padStart(10)} · ${String(a.tics).padStart(5)} tics · ` +
      `${String(a.esquivadas).padStart(3)} esquivadas · ${String(a.decisiones).padStart(4)} decisiones`,
  );
  comprobar(
    `la partida de la semilla ${a.semilla} da el mismo estado dos veces`,
    a.huella === b.huella,
    a.huella === b.huella ? undefined : dondeDifieren(a.huella, b.huella),
  );
}

/*
 * Y una tercera pasada por otro camino: `jugarUna` suelta, fuera del bucle de la
 * tanda. Si el resultado dependiera del ORDEN en que se juegan las partidas —una
 * lista de módulo que se rellena, un contador que no se reinicia— la tanda entera
 * sería consistente consigo misma y esto no.
 */
{
  const sola = jugarUna(SEMILLAS[SEMILLAS.length - 1] as number);
  const enLaTanda = primera.jugadas[primera.jugadas.length - 1] as Jugada;
  comprobar(
    'una partida jugada suelta da lo mismo que jugada la última de una tanda',
    sola.huella === enLaTanda.huella,
    sola.huella === enLaTanda.huella ? undefined : dondeDifieren(sola.huella, enLaTanda.huella),
  );
}

// ---------------------------------------------------------------------------
// ESCALÓN 2 · NODE CONTRA HERMES
// ---------------------------------------------------------------------------

paso('El mismo paquete, ejecutado en Node y en Hermes');

/** El intérprete de Hermes que trae la dependencia de desarrollo, o nada. */
function dondeEstaHermes(): string | null {
  const carpeta = path.join(REPO, 'node_modules', 'hermes-engine-cli');
  const candidatos =
    process.platform === 'win32'
      ? [path.join(carpeta, 'win64-bin', 'hermes.exe')]
      : process.platform === 'darwin'
        ? [path.join(carpeta, 'osx-bin', 'hermes')]
        : [path.join(carpeta, 'linux64-bin', 'hermes')];
  for (const c of candidatos) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

const hermes = dondeEstaHermes();
comprobar(
  'el intérprete de Hermes está instalado',
  hermes !== null,
  'falta `hermes-engine-cli` en node_modules. Se instala con `npm install` desde la raíz: es una ' +
    'dependencia de desarrollo de `server`. SIN ÉL ESTO NO COMPARA DOS MOTORES, y por eso se pone ' +
    'rojo en vez de saltárselo: una comprobación de determinismo que solo mira Node no comprueba ' +
    'lo que dice su nombre.',
);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'determinismo-'));
const paquete = path.join(dir, 'tanda.js');

/*
 * ═══ SE EMPAQUETA UNA VEZ Y SE EJECUTA DOS ═══
 *
 * Con dos paquetes —uno por motor— una diferencia entre los dos empaquetados
 * podría explicar una diferencia entre motores, y el comprobador estaría midiendo
 * a esbuild. Con uno solo, lo único distinto entre las dos ejecuciones es el
 * intérprete.
 *
 * `--target=es2015` porque Hermes 0.12 no trae la sintaxis moderna entera —el
 * encadenamiento opcional y el fusionado nulo son de versiones posteriores— y un
 * fallo de sintaxis se leería aquí como «los motores no coinciden», que es
 * exactamente la conclusión equivocada.
 *
 * `--format=iife` porque dentro de Hermes no hay módulos: ni `require`, ni
 * `import`, ni `exports`. Un paquete en formato CommonJS reventaría en la primera
 * línea.
 *
 * ═══ Y DESPUÉS UNA PASADA DE BABEL, QUE NO ESTABA PREVISTA ═══
 *
 * HERMES 0.12 NO ENTIENDE `class`. Ni declarada ni como expresión: el intérprete
 * contesta «invalid statement encountered» y se para. En la app eso no se nota
 * porque Metro pasa todo por Babel antes de que Hermes vea una línea; aquí no hay
 * Metro, y `shared/mecanicas/canonico.ts` declara `class NoCanonizable extends
 * Error` — o sea que el fichero cuya razón de existir es esta comparación es el
 * que la impedía.
 *
 * esbuild no sabe bajar `class` a funciones («not supported yet», lo dice él), así
 * que el paquete pasa por `@babel/plugin-transform-classes` y nada más. Un solo
 * complemento y no un preset entero: cuanto menos se reescriba, menos posibilidades
 * hay de que lo que se compara sea el transpilador y no el reductor.
 *
 * Y la pasada se hace UNA VEZ, sobre el paquete que ejecutan LOS DOS motores. Si
 * Node corriera el original y Hermes el transformado, una diferencia entre los dos
 * ficheros podría explicar una diferencia entre motores — y este comprobador
 * estaría midiendo a Babel.
 */
const esbuild = path.join(REPO, 'node_modules', 'esbuild', 'bin', 'esbuild');
const crudo = path.join(dir, 'crudo.js');
const empaquetado = spawnSync(
  process.execPath,
  [
    esbuild,
    path.join(REPO, 'server', 'scripts', 'entrada-determinismo.ts'),
    '--bundle',
    '--format=iife',
    '--target=es2015',
    '--platform=neutral',
    `--outfile=${crudo}`,
  ],
  { encoding: 'utf8' },
);
comprobar(
  'el guion se empaqueta para los dos motores',
  empaquetado.status === 0 && fs.existsSync(crudo),
  `${empaquetado.stdout ?? ''}${empaquetado.stderr ?? ''}`,
);

if (fs.existsSync(crudo)) {
  /*
   * La pasada de Babel. Ver la cabecera de este bloque: sin ella Hermes se para en
   * la primera `class` del paquete, que resulta ser la de `canonico.ts`.
   */
  const babel = await import('@babel/core');
  /*
   * El complemento se importa y se pasa como OBJETO, no por su nombre. Pasarlo
   * por nombre obligaría a Babel a resolverlo desde el directorio del fichero que
   * transforma —que aquí es una carpeta temporal del sistema, sin `node_modules`
   * a la vista— y fallaría con «cannot find module», que se lee como si el
   * complemento no estuviera instalado.
   */
  /*
   * El nombre va en una constante y no en el `import` porque el complemento NO
   * PUBLICA TIPOS, y un especificador literal haría que el compilador exigiera un
   * `.d.ts` que no existe. Con el nombre en una variable, TypeScript se queda en
   * `any` sin protestar — que aquí es lo correcto: esto es un complemento de Babel
   * que se pasa tal cual y del que no se usa ni una propiedad.
   */
  const NOMBRE_DEL_COMPLEMENTO = '@babel/plugin-transform-classes';
  const bajarClases = (await import(NOMBRE_DEL_COMPLEMENTO)) as { default: unknown };
  const transformado = babel.transformFileSync(crudo, {
    babelrc: false,
    configFile: false,
    compact: false,
    plugins: [bajarClases.default as babel.PluginItem],
  });
  const codigo = transformado?.code ?? '';
  comprobar('y `class` se baja a funciones, que es lo único que Hermes 0.12 no entiende', codigo.length > 0);
  if (codigo.length > 0) fs.writeFileSync(paquete, codigo, 'utf8');

  /*
   * ═══ Y SE COMPRUEBA QUE ESTA PASADA SIGUE HACIENDO FALTA ═══
   *
   * No se busca la palabra `class` en el resultado: los ayudantes que escribe
   * Babel llevan dentro cadenas como «Cannot call a class as a function», y un
   * comprobador que se pone rojo por eso es un cepo — la forma más rápida que hay
   * de que alguien lo desactive.
   *
   * Lo que se comprueba es que el paquete CRUDO traía clases y que la pasada las
   * ha cambiado por otra cosa. Si un día `canonico.ts` dejara de declarar clases y
   * Babel pasara a ser un adorno, esto se pondría rojo y se podría quitar la
   * dependencia a sabiendas, en vez de arrastrarla para siempre porque nadie sabe
   * si sigue haciendo falta.
   *
   * Que el resultado sea EJECUTABLE por Hermes no se afirma aquí: se ejecuta abajo,
   * que es más fuerte que cualquier expresión regular sobre el texto.
   */
  const antes = fs.readFileSync(crudo, 'utf8');
  comprobar(
    'el paquete sin transformar SÍ traía clases, o sea que esta pasada no es un adorno',
    /(^|[^\w.$])class[\s{]/m.test(antes),
    'si ya no hay ninguna `class` en `shared/`, esta dependencia de Babel sobra y hay que quitarla.',
  );
  comprobar('y la transformación ha cambiado algo de verdad', codigo !== antes);
}

/** Ejecuta el paquete con un intérprete y lee la línea que escribe. */
function correr(quien: string, orden: string, argumentos: string[]): Tanda | null {
  const r = spawnSync(orden, argumentos, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  const salida = `${r.stdout ?? ''}`.trim();
  if (r.status !== 0 || salida.length === 0) {
    comprobar(
      `${quien} ejecuta el paquete sin caerse`,
      false,
      `código ${String(r.status)}\n${salida}\n${r.stderr ?? ''}`.slice(0, 900),
    );
    return null;
  }
  hechas++;
  try {
    /* La última línea: si algún motor escupe avisos por delante, se ignoran. */
    const lineas = salida.split('\n');
    const ultima = lineas[lineas.length - 1] as string;
    return JSON.parse(ultima) as Tanda;
  } catch (error) {
    comprobar(`${quien} escribe una tanda legible`, false, `${String(error)}\n${salida.slice(0, 400)}`);
    return null;
  }
}

const enNode = fs.existsSync(paquete) ? correr('Node', process.execPath, [paquete]) : null;
const enHermes = hermes !== null && fs.existsSync(paquete) ? correr('Hermes', hermes, [paquete]) : null;

if (enNode !== null && enHermes !== null) {
  console.log(`  Node dice ser «${enNode.motor}» · Hermes dice ser «${enHermes.motor}»`);

  /*
   * ═══ Y AQUÍ ESTÁ LA COMPROBACIÓN QUE IMPIDE EL VERDE FALSO ═══
   *
   * Antes de comparar una sola huella se exige que los dos procesos hayan sido
   * MOTORES DISTINTOS. Sin esto, el día que la ruta del binario se quede vieja y
   * el lanzador acabe llamando a Node dos veces, todas las huellas coincidirían
   * —claro— y este fichero seguiría en verde diciendo que Hermes y V8 están de
   * acuerdo. Es el fallo que la memoria de esta casa llama «verde falso», y aquí
   * sería el más caro de todos porque tapa justo lo que la fase existe para cazar.
   */
  comprobar(
    'los dos procesos son motores DISTINTOS y lo dicen ellos, no la ruta del binario',
    enNode.motor === 'node' && enHermes.motor === 'hermes',
    `uno dice «${enNode.motor}» y el otro «${enHermes.motor}»`,
  );

  comprobar(
    'las dos tandas traen el mismo número de partidas',
    enNode.jugadas.length === enHermes.jugadas.length,
    `${enNode.jugadas.length} vs ${enHermes.jugadas.length}`,
  );

  const cuantas = Math.min(enNode.jugadas.length, enHermes.jugadas.length);
  for (let i = 0; i < cuantas; i++) {
    const a = enNode.jugadas[i] as Jugada;
    const b = enHermes.jugadas[i] as Jugada;
    comprobar(
      `la semilla ${a.semilla} da el MISMO estado final en Node y en Hermes`,
      a.huella === b.huella,
      a.huella === b.huella ? undefined : dondeDifieren(a.huella, b.huella),
    );
    /*
     * La cifra y la duración se comparan aparte aunque estén dentro de la huella.
     * No es redundante para quien lo lee: si divergen, saber que además la partida
     * duró distinto o dio otra puntuación dice si la divergencia fue al principio
     * —y cambió la partida entera— o en el último tic.
     */
    comprobar(
      `la semilla ${a.semilla} dura lo mismo y puntúa lo mismo en los dos motores`,
      a.tics === b.tics && a.esquivadas === b.esquivadas,
      `Node: ${a.tics} tics / ${a.esquivadas} pts · Hermes: ${b.tics} tics / ${b.esquivadas} pts`,
    );
  }

  /*
   * Y lo mismo contra la tanda que se jugó EN PROCESO al principio. Node fuera y
   * Node dentro deberían coincidir siempre; que no coincidieran significaría que
   * el empaquetado cambia el comportamiento —una optimización de esbuild, un
   * `target` que reescribe la aritmética— y eso es una noticia por sí sola.
   */
  const enProceso = canonico(primera.jugadas.map((j) => j.huella));
  const deFuera = canonico(enNode.jugadas.map((j) => j.huella));
  comprobar(
    'el paquete de esbuild da lo mismo que el mismo código sin empaquetar',
    enProceso === deFuera,
    enProceso === deFuera ? undefined : dondeDifieren(enProceso, deFuera),
  );
}

try {
  fs.rmSync(dir, { recursive: true, force: true });
} catch {
  /* Un temporal que no se borra no es un fallo de determinismo. */
}

// ---------------------------------------------------------------------------
// ESCALÓN 3 · LA PARTIDA JUGADA CONTRA LA PARTIDA EXPANDIDA DESDE SU REPETICIÓN
// ---------------------------------------------------------------------------

/*
 * ═══ ESTE ES EL ESCALÓN QUE FALTABA, Y ES EL QUE COMPRA EL MARCADOR ═══
 *
 * Los dos escalones de al lado juegan siempre con `jugarGrabando`, o sea con el
 * mismo bucle a los dos lados de la comparación. Demuestran que el reductor es
 * reproducible, que es exactamente lo que `verify:pureza` ya vigila estáticamente.
 *
 * Lo que el reductor puro sirve para COMPRAR es otra cosa: que una partida de
 * cuarenta segundos quepa en unos cientos de bytes —semilla, entradas, total de
 * tics— y que el servidor pueda reconstruirla entera. Esa reconstrucción la hace
 * `repeticiones.movimientosDe`, y hasta que este bloque existió no la ejecutaba
 * ningún comprobador de la batería.
 *
 * Lo que se compara es la huella del estado con el que el robot ACABÓ contra la
 * huella del estado que sale de expandir su repetición y reejecutarla. Si las dos
 * mitades del formato dejan de decir lo mismo —la que graba y la que expande—,
 * esto se pone rojo aquí y no seis meses después en forma de «el marcador rechaza
 * partidas honradas una de cada quince».
 */
paso('La partida jugada y la misma partida expandida desde su repetición');

/** Empaqueta lo que jugó el robot con la forma que sube el dispositivo. */
function repeticionDe(semilla: number): { rep: Repeticion; huella: string } {
  const { jugada, entradas } = jugarGrabando(semilla, TOPE_DE_PASOS);
  return {
    rep: {
      arcade: EL_ARCADE,
      partida: `determinismo-${semilla}`,
      tics: jugada.tics,
      entradas,
      cifra: jugada.esquivadas,
    },
    huella: jugada.huella,
  };
}

/** La huella de reejecutar una lista de movimientos ya expandida. */
function huellaDe(movimientos: readonly MovimientoRegistrado[]): string {
  return canonico(reejecutarEn(EL_ARCADE, undefined, movimientos));
}

/*
 * ═══ Y LA EXPANSIÓN DESFASADA, QUE ES LA VACUNA ═══
 *
 * Es literalmente la primera versión de `movimientosDe`: mete las entradas del
 * tic T ANTES del paso T en vez de después. Está copiada aquí a propósito y no
 * importada de ningún sitio, porque su único papel es DEMOSTRAR QUE ESTA
 * COMPARACIÓN VE UN PASO DE DIFERENCIA. Sin ella, el bloque de arriba podría
 * estar comparando una cadena consigo misma y nadie lo notaría — que es la clase
 * de verde falso que esta casa tiene apuntado tres veces.
 *
 * No se exige que las cuatro semillas la delaten: un desfase de un paso casi
 * siempre da lo mismo, y ése es justo el motivo por el que sobrevivió. Se exige
 * que AL MENOS UNA lo haga, porque si ninguna lo hiciera esta comprobación no
 * podría ver el fallo que existe para ver.
 */
function expansionDesfasada(rep: Repeticion, semilla: number): MovimientoRegistrado[] {
  const out: MovimientoRegistrado[] = [];
  let siguiente = 0;
  const meterLasDe = (tic: number): void => {
    while (siguiente < rep.entradas.length) {
      const e = rep.entradas[siguiente];
      if (e === undefined || e.tic !== tic) break;
      out.push({
        movimiento: e.carga === undefined ? { tipo: e.tipo } : { tipo: e.tipo, carga: e.carga },
        ctx: { quien: null, azar: semilla, tic, asientos: [] },
      });
      siguiente++;
    }
  };
  meterLasDe(0);
  for (let tic = 1; tic <= rep.tics; tic++) {
    meterLasDe(tic);
    out.push({ movimiento: movimientoDeTic(), ctx: { quien: null, azar: semilla, tic, asientos: [] } });
  }
  return out;
}

let delatadasPorLaVacuna = 0;
for (const semilla of SEMILLAS) {
  const { rep, huella } = repeticionDe(semilla);
  const expandida = movimientosDe(rep, semilla);

  /*
   * Que la expansión tenga el número de movimientos que tiene que tener: un tic
   * por paso más una entrada por cosa que hizo el dedo. Si esto fallara, lo de
   * abajo también, pero el mensaje diría «otro estado» en vez de «faltan
   * movimientos», que es una pista mucho peor.
   */
  comprobar(
    `la repetición de la semilla ${semilla} expande a ${rep.tics} tics + ${rep.entradas.length} entradas`,
    expandida.length === rep.tics + rep.entradas.length,
    `${expandida.length} movimientos`,
  );

  const reejecutada = huellaDe(expandida);
  console.log(
    `  semilla ${String(semilla).padStart(10)} · ${String(rep.tics).padStart(5)} tics · ` +
      `${String(rep.entradas.length).padStart(4)} entradas · ${reejecutada === huella ? 'cuadra' : 'NO CUADRA'}`,
  );
  comprobar(
    `la partida de la semilla ${semilla} reejecutada desde su repetición da el MISMO estado`,
    reejecutada === huella,
    reejecutada === huella ? undefined : dondeDifieren(huella, reejecutada),
  );

  if (huellaDe(expansionDesfasada(rep, semilla)) !== huella) delatadasPorLaVacuna++;
}

comprobar(
  'la vacuna: una expansión desfasada UN SOLO PASO se ve, al menos en una de las semillas',
  delatadasPorLaVacuna > 0,
  `ninguna de las ${SEMILLAS.length} partidas cambia al mover las entradas un paso. Si eso pasa, ` +
    'esta comparación no puede ver el fallo que existe para ver: o el robot ha dejado de tocar ' +
    'nada, o las entradas ya no influyen en el estado final.',
);
console.log(`  la expansión desfasada la delatan ${delatadasPorLaVacuna} de ${SEMILLAS.length} semillas`);

// ---------------------------------------------------------------------------

console.log('');
if (fallos.length === 0) {
  console.log(
    `✔ ${hechas} comprobaciones. El mismo registro da el mismo estado dos veces, da el mismo\n` +
      '  estado en Node y en Hermes, y la partida expandida desde su repetición da el mismo\n' +
      '  estado que la partida jugada — comparado con `canonico.ts`, no con `JSON.stringify`.',
  );
  process.exit(0);
}
console.log(`✘ ${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
for (const f of fallos) console.log(`   · ${f}`);
console.log(
  '\nNada de esto es un fallo de estilo, y el escalón que falla dice dónde mirar:\n' +
    '\n' +
    '  · Si falla el 1 o el 2, es el REDUCTOR: dos jugadores con la misma semilla ven partidas\n' +
    '    distintas. Lo más probable es una función aproximada de `Math` —`sin`, `pow`, `exp`,\n' +
    '    `log`, `atan2`, `hypot`— colada en su camino. `verify:pureza` las lista.\n' +
    '  · Si falla el 3, el reductor está bien y lo que no cuadra es EL FORMATO DE REPETICIÓN:\n' +
    '    `repeticiones.movimientosDe` expande con un criterio y los grabadores apuntan con\n' +
    '    otro. Ya pasó una vez, con un paso de desfase, y el síntoma es que el marcador\n' +
    '    rechaza partidas honradas una de cada quince sin dar ningún error.',
);
process.exit(1);
