/**
 * ¿MULTIPLICA LA COMA FIJA SIN MENTIR, Y LO MISMO EN LOS DOS MOTORES?
 *
 *   npm run verify:fijo
 *
 * ═══ EL FALLO QUE ESTE GUIÓN EXISTE PARA CAZAR ═══
 *
 * La coma fija se eligió para que Node y Hermes no puedan discrepar. La forma habitual de
 * multiplicar en Q16.16 —desplazar 16 bits— desborda el entero de 32 bits y devuelve un
 * número equivocado, con el signo cambiado, en 17 de las 32 combinaciones de velocidad por
 * frecuencia que se dan en esta casa.
 *
 * Y LOS DOS MOTORES DEVUELVEN EL MISMO NÚMERO EQUIVOCADO. Por eso `verify:determinismo` no
 * lo ve: compara Node contra Hermes, los dos coinciden, y sale verde mientras el paseante
 * anda hacia atrás. Un desbordamiento determinista pasa por delante del único comprobador
 * que existía para esto sin despeinarse.
 *
 * ═══ POR QUÉ ESTO EJECUTA HERMES EN VEZ DE HACER CUENTAS ═══
 *
 * Porque lo que hay que demostrar no es que `>>` desborde —eso se razona— sino que desborda
 * IGUAL en los dos motores, que es lo que lo hace invisible. Si algún día Hermes cambiara la
 * semántica de `>>` y los dos dejaran de coincidir, `verify:determinismo` empezaría a cazarlo
 * solo y esta capa sobraría. Mientras coincidan, hace falta.
 *
 * Por eso el escalón 1 comprueba que las formas rotas SIGUEN ROTAS. No es una prueba de que
 * el código funcione: es la vacuna que dice que la premisa de la que cuelga el resto sigue en
 * pie. El día que se ponga roja, lo que hay que hacer no es arreglarla: es volver a medir.
 *
 * ═══ Y POR QUÉ SE QUITAN LOS COMENTARIOS ANTES DE MIRAR EL CÓDIGO ═══
 *
 * Porque la cabecera de `fijo.ts` lleva la tabla de lo medido, y en esa tabla está escrita la
 * forma prohibida. Una regla que busca un literal y se caza a sí misma en el comentario que
 * lo explica se desactiva el mismo día que se escribe.
 *
 * ═══ Y POR QUÉ LAS REGLAS DE CUERPO DE FUNCIÓN SE ACOTAN CON `[^}]*` ═══
 *
 * Porque `[\s\S]*?`, aunque sea perezoso, no tiene tope: se sale de la función y encuentra lo
 * que busca en la de al lado. La primera versión de este guión comprobaba la guarda de rango
 * de `por` con `[\s\S]*?` y seguía en VERDE con la guarda borrada, porque la encontraba en
 * `entre`. Lo cazó romperla a propósito; leyéndola no se ve. `[^}]*` no puede salir del
 * cuerpo mientras el cuerpo no tenga llaves dentro, que es el caso de las dos.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(AQUI, '..', '..');

const fallos: string[] = [];
let hechas = 0;

function comprobar(que: string, bien: boolean, detalle?: unknown): void {
  hechas++;
  if (!bien) fallos.push(detalle === undefined ? que : `${que} — ${JSON.stringify(detalle)}`);
}

function paso(titulo: string): void {
  console.log(`\n── ${titulo} ${'─'.repeat(Math.max(0, 74 - titulo.length))}`);
}

/** El código sin comentarios: lo que de verdad se ejecuta. */
function soloCodigo(fuente: string): string {
  return fuente.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1 ');
}

// ---------------------------------------------------------------------------
// ESCALÓN 1 · EL PELIGRO ES REAL Y ES INVISIBLE, EN LOS DOS MOTORES
// ---------------------------------------------------------------------------

paso('Las tres formas de multiplicar, en Node y en Hermes');

/** El intérprete de Hermes que trae la dependencia de desarrollo, o nada. */
function dondeEstaHermes(): string | null {
  const carpeta = path.join(REPO, 'node_modules', 'hermes-engine-cli');
  const candidato =
    process.platform === 'win32'
      ? path.join(carpeta, 'win64-bin', 'hermes.exe')
      : process.platform === 'darwin'
        ? path.join(carpeta, 'osx-bin', 'hermes')
        : path.join(carpeta, 'linux64-bin', 'hermes');
  return fs.existsSync(candidato) ? candidato : null;
}

/*
 * El banco va en ES5 y sin módulos a propósito: el Hermes ejecutable de esta máquina es el
 * 0.12, que no tiene clases ES6. Lo que se mide aquí son tres expresiones aritméticas, así
 * que el azúcar no hace falta para nada y su ausencia quita una fuente de ruido.
 */
const BANCO = `
var UNO = 65536;
var VELOCIDADES = [12, 26.4, 48, 96];
var FRECUENCIAS = [10, 20, 30, 53, 60, 96, 144, 192];
var salida = [];
var vi = 0;
while (vi < VELOCIDADES.length) {
  var v = Math.round(VELOCIDADES[vi] * UNO) | 0;
  var fi = 0;
  while (fi < FRECUENCIAS.length) {
    var dt = (UNO / FRECUENCIAS[fi]) | 0;
    salida.push([
      (v * dt) >> 16,
      Math.imul(v, dt) >> 16,
      ((v * dt) / UNO) | 0
    ].join(','));
    fi++;
  }
  vi++;
}
print(salida.join(';'));
`;

/* Node no tiene `print`; Hermes no tiene `console.log` garantizado. Se le pone el que falte. */
const PARA_NODE = `var print = function (s) { console.log(s); };\n${BANCO}`;

interface Fila {
  desplazamiento: number;
  imul: number;
  division: number;
}

function leerFilas(crudo: string): Fila[] {
  return crudo
    .trim()
    .split(';')
    .map((f) => {
      const [d, m, q] = f.split(',').map(Number);
      return { desplazamiento: d ?? 0, imul: m ?? 0, division: q ?? 0 };
    });
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fijo-'));
const guion = path.join(dir, 'banco.js');

fs.writeFileSync(guion, PARA_NODE, 'utf8');
const enNode = leerFilas(execFileSync(process.execPath, [guion], { encoding: 'utf8' }));

const hermes = dondeEstaHermes();
comprobar(
  'el intérprete de Hermes está instalado',
  hermes !== null,
  'falta `hermes-engine-cli` en node_modules. SIN ÉL ESTO NO COMPARA DOS MOTORES, y todo lo ' +
    'que este guión afirma cuelga de compararlos: se pone rojo en vez de saltárselo.',
);

let enHermes: Fila[] = [];
if (hermes !== null) {
  fs.writeFileSync(guion, BANCO, 'utf8');
  enHermes = leerFilas(execFileSync(hermes, [guion], { encoding: 'utf8' }));
}

comprobar('el banco ha corrido las 32 combinaciones en Node', enNode.length === 32, {
  filas: enNode.length,
});
if (hermes !== null) {
  comprobar('y las 32 en Hermes', enHermes.length === 32, { filas: enHermes.length });

  /* ═══ LO QUE HACE INVISIBLE AL FALLO: los dos motores coinciden EN LO MALO. ═══ */
  let coinciden = 0;
  for (let i = 0; i < Math.min(enNode.length, enHermes.length); i++) {
    const a = enNode[i] as Fila;
    const b = enHermes[i] as Fila;
    if (a.desplazamiento === b.desplazamiento && a.imul === b.imul && a.division === b.division) {
      coinciden++;
    }
  }
  comprobar(
    'Node y Hermes dan lo MISMO en las tres formas, también en las rotas',
    coinciden === 32,
    { coinciden, de: 32 },
  );
}

/* ═══ LA VACUNA: las formas rotas siguen rotas. ═══ */
let discrepan = 0;
let seInvierteElSigno = 0;
for (const f of enNode) {
  if (f.desplazamiento !== f.division) discrepan++;
  if (f.division > 0 && f.desplazamiento < 0) seInvierteElSigno++;
}
comprobar(
  '`>>16` sigue dando un resultado distinto del correcto en la mayoría de los casos',
  discrepan === 17,
  { discrepan, de: 32, esperado: 17 },
);
comprobar(
  'y sigue invirtiendo el signo: el paseante andaría hacia atrás',
  seInvierteElSigno >= 10,
  { casos: seInvierteElSigno },
);
comprobar(
  '`Math.imul` no salva: se rompe exactamente igual que `>>16`',
  enNode.every((f) => f.imul === f.desplazamiento),
);

fs.rmSync(dir, { recursive: true, force: true });

// ---------------------------------------------------------------------------
// ESCALÓN 2 · `fijo.ts` ESTÁ DEL LADO BUENO
// ---------------------------------------------------------------------------

paso('La capa de coma fija usa la forma que no miente');

const RUTA_FIJO = path.join(REPO, 'shared', 'mecanicas', 'fijo.ts');
comprobar('`shared/mecanicas/fijo.ts` existe', fs.existsSync(RUTA_FIJO));

if (fs.existsSync(RUTA_FIJO)) {
  const fuente = fs.readFileSync(RUTA_FIJO, 'utf8');
  const codigo = soloCodigo(fuente);

  /* Vacuna: que se ha leído el fichero de verdad y no una cadena vacía. */
  comprobar('y se ha leído para juzgarlo', fuente.includes('Q16.16') && codigo.length > 400, {
    letras: codigo.length,
  });

  comprobar(
    'no queda ni un desplazamiento de 16 bits en el código',
    !/(>>|<<)\s*16/.test(codigo),
    { donde: /.*(>>|<<)\s*16.*/.exec(codigo)?.[0] },
  );
  comprobar('ni un `Math.imul`', !/\bMath\s*\.\s*imul\b/.test(codigo), {
    donde: /.*Math\s*\.\s*imul.*/.exec(codigo)?.[0],
  });
  comprobar(
    '`por` multiplica dividiendo por UNO y truncando',
    /export function por\([^)]*\)[^{]*\{[^}]*\(\s*p\s*\/\s*UNO\s*\)\s*\|\s*0/.test(codigo),
  );
  comprobar(
    'y comprueba el rango en vez de fiarse del margen escrito en un comentario',
    /export function por\([^)]*\)[^{]*\{[^}]*TOPE_EXACTO[^}]*throw/.test(codigo),
  );
  comprobar(
    '`entre` sube con `×` antes de dividir, no con un desplazamiento',
    /export function entre\([^)]*\)[^{]*\{[^}]*a\s*\*\s*UNO/.test(codigo),
  );
}

// ---------------------------------------------------------------------------
// ESCALÓN 3 · Y NADIE MÁS MULTIPLICA COMA FIJA A MANO
// ---------------------------------------------------------------------------

paso('Nadie desplaza 16 bits por su cuenta en el código compartido');

/*
 * Esto es lo que mantiene viva la lección cuando la capa crezca. `fijo.ts` puede estar
 * perfecto y no servir de nada si el fichero de al lado se escribe su propio `>> 16`.
 */
function ficherosDe(raiz: string): string[] {
  if (!fs.existsSync(raiz)) return [];
  const salida: string[] = [];
  for (const e of fs.readdirSync(raiz, { withFileTypes: true })) {
    const completo = path.join(raiz, e.name);
    if (e.isDirectory()) salida.push(...ficherosDe(completo));
    else if (e.name.endsWith('.ts')) salida.push(completo);
  }
  return salida;
}

const mirados = [
  ...ficherosDe(path.join(REPO, 'shared', 'mecanicas')),
  ...ficherosDe(path.join(REPO, 'shared', 'arcade')),
];

/*
 * El suelo. Sin esto, un filtro roto deja cero ficheros, cero fallos, y se lee como vigilado
 * —que es el modo de fallo que esta casa ya se ha comido más de una vez—.
 */
comprobar(
  'ha inspeccionado el código compartido de verdad',
  mirados.length >= 20,
  { ficheros: mirados.length },
);

/*
 * ═══ LA ÚNICA FORMA DE DESPLAZAR 16 QUE NO ES COMA FIJA, Y POR QUÉ SE NOMBRA ═══
 *
 * `h ^ (h >>> 16)` es el paso final de un revoltillo de 32 bits (el de MurmurHash3): mezcla los
 * bits altos de UN número con sus bajos, y no multiplica nada. Vivía en `escenas/burgo/ciudad.ts`,
 * donde este comprobador no miraba, y el día que la traza del Burgo bajó a `shared/` apareció
 * aquí como culpable. Cambiarle la forma —escribir `0x10`, o partirlo en dos desplazamientos—
 * habría puesto esto en verde engañándolo, y cambiarle el número habría movido la ciudad que ya
 * está en producción. Así que la regla aprende EXACTAMENTE ese idioma —el mismo identificador a
 * los dos lados del `^`, desplazado sin signo— y nada más: un producto desplazado, aunque vaya
 * dentro de un `^`, sigue siendo culpable. La vacuna de abajo lo exige con muestras.
 */
const REVOLTILLO = /\b([A-Za-z_$][\w$]*)\s*\^\s*\(\s*\1\s*>>>\s*16\s*\)/g;

/** ¿Desplaza este código 16 bits por su cuenta, fuera del revoltillo? */
function desplazaDieciseis(codigo: string): boolean {
  /*
   * Los DOS desplazamientos, no sólo el de la derecha. `(a << 16) / b` es el mismo fallo por
   * el otro lado —pierde los 16 bits altos de `a` antes de dividir— y salió de que romper
   * `entre` a propósito con `<<` dejó esta comprobación en verde.
   */
  return /(>>|<<)\s*16/.test(codigo.replace(REVOLTILLO, ''));
}

const DEBEN_SER_CULPABLES = [
  'const p = (a * b) >> 16;',
  'const p = Math.imul(a, b) >> 16;',
  'const q = (a << 16) / b;',
  'const p = (v * dt) >>> 16;',
  'h = h ^ ((a * b) >>> 16);',
  'x = y ^ (z >>> 16);',
];
const NO_SON_CULPABLES = ['return ((h ^ (h >>> 16)) >>> 0) / 4294967296;', 'x = x ^ (x >>> 16);'];
comprobar(
  'la regla caza los productos desplazados, también dentro de un `^`',
  DEBEN_SER_CULPABLES.every(desplazaDieciseis),
  { seEscapan: DEBEN_SER_CULPABLES.filter((m) => !desplazaDieciseis(m)) },
);
comprobar(
  'y deja pasar sólo el revoltillo de un número consigo mismo',
  NO_SON_CULPABLES.every((m) => !desplazaDieciseis(m)),
  { cazados: NO_SON_CULPABLES.filter(desplazaDieciseis) },
);

const culpables: string[] = [];
for (const f of mirados) {
  if (f === RUTA_FIJO) continue;
  const codigo = soloCodigo(fs.readFileSync(f, 'utf8'));
  if (desplazaDieciseis(codigo)) culpables.push(path.relative(REPO, f));
}
comprobar(
  'y nadie se multiplica su propia coma fija con un desplazamiento',
  culpables.length === 0,
  { culpables },
);

// ---------------------------------------------------------------------------

console.log('');
console.log(
  `Motores comparados: Node ${process.version}` +
    (hermes === null ? ' (sin Hermes)' : ` contra Hermes · ${String(mirados.length)} ficheros mirados`),
);
if (fallos.length > 0) {
  console.log(`\n${String(fallos.length)} de ${String(hechas)} comprobaciones han fallado:\n`);
  for (const f of fallos) console.log(`  ✗ ${f}`);
  process.exit(1);
}

console.log(`\n${String(hechas)} comprobaciones`);
console.log('\nLa coma fija multiplica con `×` y `÷`, que IEEE 754 fija al bit. Las dos formas que');
console.log('desbordan siguen desbordando, siguen coincidiendo en los dos motores —y por eso siguen');
console.log('siendo invisibles para `verify:determinismo`—, y no queda ninguna en el código.');
