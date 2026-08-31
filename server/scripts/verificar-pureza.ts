/**
 * ¿SIGUE SIENDO PURO EL CAMINO DEL REDUCTOR?
 *
 *   npm run verify:pureza
 *
 * ═══ QUÉ AFIRMA ═══
 *
 * Que en `shared/arcade/` y en `shared/mecanicas/` no hay nada que haga que la
 * misma partida dé dos resultados distintos.
 *
 * Suena a manía de estilo y no lo es: la pureza es LO QUE SE COMPRÓ cuando se
 * decidió que el reductor devolviera un estado en vez de mutarlo, y con ella se
 * compraron cuatro cosas que no se pueden tener de otra forma —verificación de
 * marcador, repetición de partida, autoridad barata de servidor y predicción con
 * rebobinado—. Una sola línea impura las apaga las cuatro, y no da ningún error.
 *
 * ═══ POR QUÉ ESTÁTICO, SI HAY UN COMPROBADOR QUE JUEGA DE VERDAD ═══
 *
 * Porque los fallos de determinismo no se caen en la prueba: se caen en
 * producción, en un modelo de móvil, meses después, en forma de
 * desincronizaciones intermitentes que nadie sabe reproducir. `Date.now()`
 * dentro de un reductor pasa TODAS las pruebas del mundo el día que se escribe.
 *
 * Un barrido estático no demuestra que el código sea puro —eso no lo demuestra
 * nada— pero caza las siete formas concretas en que la pureza se pierde en la
 * práctica, y las caza en el commit y no en el soporte.
 *
 * ═══ QUÉ SE VIGILA, Y QUÉ ROMPE CADA COSA ═══
 *
 *  1. `Date` · el reloj de pared. El tiempo del arcade se cuenta en TICS, que
 *     entran por el reductor como un movimiento más. Una fecha hace que la misma
 *     partida reejecutada mañana dé otra cosa.
 *  2. `performance.now` · lo mismo con otro nombre, y encima con resolución
 *     distinta en cada motor.
 *  3. `Math.random` · el azar sin semilla. Rompe la reproducibilidad y, si vive
 *     en el cliente, es trampa pura: quien juega decide qué carta sale.
 *  4. Las funciones TRASCENDENTALES de `Math` · y prohibir `Math.random` sin
 *     prohibir éstas era el agujero grande. Ver abajo.
 *  5. `fetch` · E/S en el camino del reductor. Además de impuro, en un juego de
 *     un solo dispositivo simplemente no hay red.
 *  6. `async` / `await` · un reductor asíncrono no se puede reejecutar en un
 *     bucle síncrono, así que verificar un marcador dejaría de ser una función y
 *     pasaría a ser una cola de promesas. Y ninguna regla de juego necesita
 *     esperar a nada.
 *  7. `setTimeout` / `setInterval` · un plazo que vence fuera del reductor es un
 *     cambio de estado que no está en el diario.
 *  8. Mutación del ámbito global · un estado escondido fuera del estado. Dos
 *     partidas en el mismo proceso se pisarían, y la reejecución no lo
 *     reproduciría porque no está en el diario.
 *  9. `for…in` · y este es el sutil, el que justifica el comprobador entero.
 * 10. `sort` sin comparador · el orden lo decide el motor.
 *
 * ═══ `Math.sin` NO ES `Math.random`, Y AUN ASÍ ROMPE LO MISMO ═══
 *
 * Es el hallazgo que faltaba en la primera versión de este fichero. La
 * especificación de ECMAScript deja una familia entera de funciones como
 * **implementation-approximated**: `sin`, `cos`, `tan`, las inversas, `exp`,
 * los logaritmos, `pow`, `cbrt`, `hypot` y las hiperbólicas. No están fijadas al
 * bit, y V8, JavaScriptCore y Hermes usan librerías matemáticas distintas.
 *
 * O sea que un reductor perfectamente puro —sin fechas, sin azar, sin E/S— puede
 * dar resultados distintos en el móvil y en el servidor por usar `Math.pow` para
 * una curva de dificultad. Nada de lo que vigilaban las otras nueve reglas lo
 * habría cazado, y lo que se depura es una desincronización intermitente en un
 * modelo concreto de móvil.
 *
 * Lo que SÍ está fijado por IEEE 754 y por tanto no se prohíbe: `+`, `−`, `×`,
 * `÷` y `Math.sqrt`. Esa distinción tiene que estar en el mensaje del
 * comprobador y lo está: sin ella, quien lo lea prohibirá `Math` entero —y con
 * él `Math.imul`, que es lo que hace funcionar el generador sembrado— o no
 * prohibirá nada.
 *
 * ═══ EL `for…in`, DESPACIO, PORQUE NO ES OBVIO ═══
 *
 * `for…in` recorre las claves de un objeto en un orden definido por la
 * especificación del lenguaje: PRIMERO las claves con forma de entero, en orden
 * NUMÉRICO ascendente, y después las demás en orden de inserción.
 *
 * O sea que si dos dispositivos construyen el mismo objeto insertando las mismas
 * claves en distinto orden —cosa que pasa continuamente: dos personas juegan a
 * la vez y los movimientos llegan cruzados— un `for…in` sobre claves con forma
 * de entero las recorre IGUAL en los dos, y sobre claves de texto las recorre
 * DISTINTO. La mitad de los casos se comporta bien, que es lo peor que le puede
 * pasar a un fallo: se prueba, funciona, y se cae con datos reales.
 *
 * La forma correcta es `Object.keys(o).sort()` o `for…of` sobre una lista que el
 * juego controla. Y por lo mismo se exige que todo `sort` lleve comparador: sin
 * él, el orden es el que el motor decida para las cadenas, y no es el mismo en
 * Hermes que en V8.
 *
 * ═══ QUÉ NO CUENTA ═══
 *
 * Los COMENTARIOS no cuentan. Esta misma cabecera nombra `Math.random` cinco
 * veces, y un comprobador que se pusiera rojo por sus propias explicaciones
 * empujaría a no escribirlas.
 */
import fs from 'node:fs';
import path from 'node:path';
import { sinComentarios } from './sin-comentarios';

const RAIZ = path.resolve(import.meta.dirname ?? __dirname, '..', '..');

/** Dónde vive el camino del reductor. */
const RAICES = ['shared/arcade', 'shared/mecanicas'];

// ---------------------------------------------------------------------------
// LAS EXCEPCIONES, COMO LISTA LITERAL, IGUAL QUE EN `verify:fronteras`
// ---------------------------------------------------------------------------

/**
 * Los ficheros que SÍ pueden tocar el ámbito global, y por qué exactamente.
 *
 * Los dos anclan un registro con `Symbol.for`, que es la cautela que este
 * repositorio ya tomó en `shared/juegos/index.ts` después de que un fallo real
 * costara una tarde: el módulo se carga DOS VECES según por qué ruta se importe,
 * y con una constante de módulo cada copia tiene su propia tabla y las altas se
 * pierden EN SILENCIO.
 *
 * No es una puerta trasera y conviene decir por qué: esos dos escriben en el
 * ámbito global AL CARGARSE y AL DAR DE ALTA, que son momentos de arranque. El
 * camino del reductor —lo que corre cuando alguien mueve— solo LEE. La regla que
 * de verdad importa es que un movimiento no deje rastro fuera del estado, y eso
 * se sigue cumpliendo.
 *
 * Y van escritos a mano, como las excepciones de `verify:fronteras`, para que
 * añadir un tercero sea una línea visible en el diff y no un `globalThis` que se
 * cuela.
 */
const PUEDEN_ANCLAR: Array<{ ruta: string; porque: string }> = [
  {
    ruta: 'shared/arcade/index.ts',
    porque: 'ancla el registro de arcades instalados con `Symbol.for(gamemasters.arcade.instalados)`',
  },
  {
    ruta: 'shared/arcade/proyeccion.ts',
    porque: 'ancla el registro de proyecciones con `Symbol.for(gamemasters.arcade.proyecciones)`',
  },
];

const ANCLAJE_PERMITIDO = new Set(PUEDEN_ANCLAR.map((e) => e.ruta));

// ---------------------------------------------------------------------------
// Las prohibiciones
// ---------------------------------------------------------------------------

interface Prohibicion {
  nombre: string;
  patron: RegExp;
  porque: string;
  /** Ficheros a los que esta prohibición no se les aplica. */
  exentos?: Set<string>;
  /**
   * Un trozo de código que ESTA regla tiene que cazar.
   *
   * Ver la vacuna del final: sin esto, una expresión regular mal escrita deja de
   * encontrar nada y el comprobador felicita a todo el mundo. Este repositorio
   * tiene tres casos anotados de exactamente eso.
   */
  muestraMala: string;
  /** Y uno que NO tiene que cazar, para que la regla no sea un cepo. */
  muestraBuena: string;
}

const PROHIBICIONES: Prohibicion[] = [
  {
    nombre: 'el reloj de pared',
    patron: /\bDate\b/g,
    porque: 'el tiempo del arcade se cuenta en tics, que entran por el reductor. Ver `reloj.ts`.',
    muestraMala: 'const t = Date.now();',
    muestraBuena: 'const t = ctx.tic;',
  },
  {
    nombre: 'el cronómetro de alta resolución',
    patron: /\bperformance\s*\.\s*now\b/g,
    porque: 'es el reloj de pared con otro nombre, y con distinta resolución en cada motor.',
    muestraMala: 'const t = performance.now();',
    muestraBuena: 'const t = ctx.tic;',
  },
  {
    nombre: 'el azar sin semilla',
    patron: /\bMath\s*\.\s*random\b/g,
    porque:
      'rompe la reproducibilidad y, en el cliente, es trampa pura. Se usa `mecanicas/azar.ts`, ' +
      'cuya semilla y contador viven dentro del estado.',
    muestraMala: 'const x = Math.random();',
    muestraBuena: 'const { azar, valor } = siguiente(estado.azar);',
  },
  {
    nombre: 'las funciones trascendentales de `Math`',
    /*
     * La lista es literal y no `Math\.\w+` a propósito: la mitad de `Math` es
     * segura y prohibirla entera dejaría sin `floor`, sin `round`, sin `abs` y
     * sin `imul` —que es justo lo que usa el generador sembrado—. Un comprobador
     * que prohíbe demasiado se desactiva igual de rápido que uno que no
     * comprueba nada.
     */
    patron:
      /\bMath\s*\.\s*(sin|cos|tan|asin|acos|atan|atan2|exp|expm1|log|log1p|log2|log10|pow|cbrt|hypot|sinh|cosh|tanh|asinh|acosh|atanh)\b/g,
    porque:
      'la especificación de ECMAScript las deja «implementation-approximated», así que V8, ' +
      'JavaScriptCore y Hermes usan librerías matemáticas distintas y devuelven ÚLTIMOS BITS ' +
      'DISTINTOS. Es exactamente donde pega `verify:determinismo`, que compara Node contra ' +
      'Hermes: una trayectoria con `Math.sin` o una curva de dificultad con `Math.pow` hacen ' +
      'divergir la repetición en un bit, el estado deja de coincidir, y lo que se depura seis ' +
      'meses después es una desincronización intermitente en un modelo concreto de móvil.\n' +
      '      LO QUE SÍ ES SEGURO Y NO SE PROHÍBE: `+`, `−`, `×`, `÷` y `Math.sqrt`, que están ' +
      'fijadas al bit por IEEE 754. Tampoco `Math.floor`, `Math.round`, `Math.abs` ni ' +
      '`Math.imul`, que son enteras. Sin esta frase alguien prohibiría `Math` entero, y con ' +
      'ello el generador sembrado.\n' +
      '      EL SUSTITUTO va en `shared/mecanicas/`: una tabla precalculada o una aproximación ' +
      'propia en punto fijo. `Math.fround` sobre el resultado REDUCE la divergencia —es lo que ' +
      'hace Rune— pero no la demuestra, y no vale como solución.',
    muestraMala: 'const y = Math.pow(x, 2) + Math.sin(t);',
    muestraBuena: 'const y = Math.sqrt(Math.abs(x)) + Math.floor(t / 2);',
  },
  {
    nombre: 'la E/S',
    patron: /\bfetch\s*\(/g,
    porque:
      'un reductor no habla con nadie. Y en un juego de un solo dispositivo no hay red con la ' +
      'que hablar.',
    muestraMala: 'const r = await fetch(url);',
    muestraBuena: 'return { ...estado, pedido: true };',
  },
  {
    nombre: 'la asincronía',
    patron: /\b(async|await)\b/g,
    porque:
      'un reductor asíncrono no se puede reejecutar en un bucle síncrono, así que verificar un ' +
      'marcador dejaría de ser una función y pasaría a ser una cola de promesas.',
    muestraMala: 'export async function avanzar() {}',
    muestraBuena: 'export function avanzar() {}',
  },
  {
    nombre: 'los temporizadores',
    patron: /\bset(Timeout|Interval)\s*\(/g,
    porque:
      'un plazo que vence FUERA del reductor es un cambio de estado que no está en el diario: ' +
      'reejecutar la partida daría otra cosa. Los plazos vencen entrando, como un movimiento más.',
    muestraMala: 'setTimeout(() => cerrar(), 1000);',
    muestraBuena: 'if (vencido(plazo, ctx.tic)) return cerrar(estado);',
  },
  {
    nombre: 'la mutación del ámbito global',
    patron: /\b(globalThis|window|self)\b/g,
    porque:
      'es estado escondido fuera del estado: dos partidas del mismo proceso se pisarían, y la ' +
      'reejecución no lo reproduciría porque no está en el diario.',
    exentos: ANCLAJE_PERMITIDO,
    muestraMala: 'globalThis.ultimaPartida = estado;',
    muestraBuena: 'return { ...estado, ultima: estado.actual };',
  },
  {
    nombre: 'el recorrido de claves con `for…in`',
    /*
     * Un `for…in` es un `for` cuyos paréntesis no llevan punto y coma y sí
     * llevan un `in` suelto. Se escribe así, y no con una lista de formas
     * concretas, porque `for (const k in o)`, `for (k in o)` y
     * `for (let k in o)` son la misma cosa y las tres se escriben.
     */
    patron: /\bfor\s*\(\s*(?:const\s+|let\s+|var\s+)?[A-Za-z_$][\w$]*\s+in\s+/g,
    porque:
      'el orden de las claves con forma de entero es NUMÉRICO y no de inserción, así que dos ' +
      'clientes que insertaron lo mismo en distinto orden recorren distinto. Se usa ' +
      '`Object.keys(o).sort()` o un `for…of` sobre una lista que el juego controle.',
    muestraMala: 'for (const clave in mapa) usar(clave);',
    muestraBuena: 'for (const clave of Object.keys(mapa).sort()) usar(clave);',
  },
  {
    nombre: 'la ordenación sin comparador',
    patron: /\.sort\s*\(\s*\)/g,
    porque:
      'sin comparador, el orden lo decide el motor, y no es el mismo en Hermes que en V8. ' +
      'Un `sort` sin comparador es una desincronización esperando a que haya dos dispositivos.',
    muestraMala: 'const l = ids.sort();',
    muestraBuena: 'const l = [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));',
  },
];

// ---------------------------------------------------------------------------
// El recorrido
// ---------------------------------------------------------------------------

interface Hallazgo {
  fichero: string;
  linea: number;
  texto: string;
  prohibicion: Prohibicion;
}

function ficheros(): string[] {
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
        if (['node_modules', 'dist'].includes(e.name)) continue;
        bajar(completa);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(e.name)) continue;
      if (e.name.endsWith('.d.ts')) continue;
      salida.push(path.relative(RAIZ, completa).replace(/\\/g, '/'));
    }
  };
  for (const raiz of RAICES) bajar(path.join(RAIZ, raiz));
  return salida.sort();
}

console.log('\nLa pureza del camino del reductor\n');

/*
 * ═══ LA VACUNA, Y VA ANTES QUE NADA ═══
 *
 * Se prueba cada regla contra un trozo de código que TIENE que cazar y contra
 * otro que NO tiene que cazar, antes de mirar un solo fichero del repositorio.
 *
 * Sin esto, una expresión regular mal escrita —un paréntesis de más, un `\b` que
 * se pierde en un renombrado— deja de encontrar nada y este comprobador felicita
 * a todo el mundo para siempre. Este repositorio tiene TRES casos anotados de
 * comprobadores que pasaban en verde sin comprobar nada, y los tres se
 * descubrieron por casualidad.
 *
 * Una comprobación que nunca se ha visto fallar no demuestra nada. Ésta se ve
 * fallar en cada ejecución, contra sus propias muestras.
 */
const vacuna: string[] = [];
for (const p of PROHIBICIONES) {
  p.patron.lastIndex = 0;
  if (!p.patron.test(p.muestraMala)) {
    vacuna.push(`«${p.nombre}» NO caza su propia muestra mala: ${p.muestraMala}`);
  }
  p.patron.lastIndex = 0;
  if (p.patron.test(p.muestraBuena)) {
    vacuna.push(`«${p.nombre}» caza su muestra BUENA, o sea que es un cepo: ${p.muestraBuena}`);
  }
  p.patron.lastIndex = 0;
}
if (vacuna.length > 0) {
  console.error('Las reglas de este comprobador están rotas:\n');
  for (const v of vacuna) console.error(`  ✗ ${v}`);
  console.error('\nUn comprobador que no caza sus propias muestras no comprueba nada.');
  process.exit(2);
}
console.log(`  ${PROHIBICIONES.length} reglas, y las ${PROHIBICIONES.length} cazan su muestra mala`);

const lista = ficheros();
const hallazgos: Hallazgo[] = [];

for (const rel of lista) {
  const codigo = sinComentarios(fs.readFileSync(path.join(RAIZ, rel), 'utf8'));
  const lineas = codigo.split('\n');
  for (const p of PROHIBICIONES) {
    if (p.exentos?.has(rel)) continue;
    p.patron.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = p.patron.exec(codigo)) !== null) {
      const numero = codigo.slice(0, m.index).split('\n').length;
      hallazgos.push({
        fichero: rel,
        linea: numero,
        texto: (lineas[numero - 1] ?? '').trim().slice(0, 100),
        prohibicion: p,
      });
    }
  }
}

/*
 * La otra mitad de la vacuna: si el recorrido no encuentra ficheros, esto no
 * está mirando donde cree. Cero hallazgos sobre cero ficheros se parece
 * demasiado a cero hallazgos sobre el árbol entero.
 */
if (lista.length === 0) {
  console.error(`\nNo se ha encontrado ni un fichero en ${RAICES.join(', ')} (desde ${RAIZ}).`);
  process.exit(2);
}

console.log(`  ${lista.length} ficheros mirados en ${RAICES.join(' y ')}`);
if (PUEDEN_ANCLAR.length > 0) {
  console.log(`  ${PUEDEN_ANCLAR.length} exenciones de anclaje, y ninguna más:`);
  for (const e of PUEDEN_ANCLAR) console.log(`    · ${e.ruta} — ${e.porque}`);
}

if (hallazgos.length === 0) {
  console.log('\nNada de lo que hace impuro un reductor aparece en el camino del reductor.');
  process.exit(0);
}

console.log(`\n${hallazgos.length} cosas que rompen la reejecución:\n`);
for (const p of PROHIBICIONES) {
  const suyos = hallazgos.filter((h) => h.prohibicion === p);
  if (suyos.length === 0) continue;
  console.log(`  ✗ ${p.nombre}`);
  for (const h of suyos) console.log(`      ${h.fichero}:${h.linea}  ${h.texto}`);
  console.log(`      ${p.porque}\n`);
}
process.exit(1);
