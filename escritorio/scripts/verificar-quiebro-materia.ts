/**
 * ¿LA MATERIA DE LA CIUDAD CUMPLE SUS CONDICIONES? El sistema de materiales analítico de la fase 1
 * (`src/quiebro/ciudad/materia/`), comprobado sobre el texto que three montaría y, con un servidor, en
 * la GPU.
 *
 *   npx tsx scripts/verificar-quiebro-materia.ts                (desde escritorio/; sin GPU sale con 2)
 *   PUERTO=5312 npx tsx scripts/verificar-quiebro-materia.ts    (con el Vite de ESTE árbol en ese puerto)
 *
 * ═══ QUÉ AFIRMA (plan del detalle, O1-MATERIA) ═══
 *
 *   a. EL SAMPLER SIEMPRE ATADO: todo texto que llame a `ruidoT`, `fbmT`, `granoT` o `superficieQ` lleva
 *      `uRuidoQ` declarado y, en sus uniformes, la textura MARCADA como la de la materia (por la marca,
 *      no por `===`), la tabla de varianzas y lo que la materia necesita de otros retoques (`mundo`, y
 *      `entorno` si el barniz está vivo). Sobre los materiales de prueba (`materia/prueba.ts`), con el
 *      `parchear` de verdad, en N0-N3.
 *   b. EL PRESUPUESTO: lecturas de `uRuidoQ` y cadenas PCG de la materia en el PEOR camino de `main`,
 *      sobre el texto resuelto por un preprocesador de `#if`, contra `LECTURAS_DE_LA_MATERIA_POR_NIVEL` y
 *      `PCG_DE_LA_MATERIA_POR_NIVEL`; y N0 con 4 lecturas y 0 PCG como mucho (el plan, §7.4). Un bucle con
 *      coste de materia es rojo, y también una macro activa cuyo cuerpo lea, derive, encadene PCG o llame
 *      a la materia (el contador no expande macros: una lectura por macro se le escondería).
 *      · LAS PUERTAS DEL CONTADOR, cerradas por regla y no por grafía. El contador cuenta una lectura
 *        cuando ve `texture*(uRuidoQ`; así que, en `materia/**` (sin comentarios, `soloCodigo`, y con las
 *        líneas `\` unidas) y en el texto MONTADO de cada material, es rojo: una función GLSL con un
 *        parámetro `sampler*` (la lectura por parámetro), un `#define` con argumentos o cuyo cuerpo nombre
 *        `dFdx`/`dFdy`/`fwidth`/`texture*`/`texelFetch*`/`pcgQ`/`uRuidoQ` o pegue fichas (`##`), y `uRuidoQ`
 *        en cualquier sitio que no sea su `uniform` o el primer argumento de una `texture*`. En el texto
 *        montado, lo que ya trae three (sus `#define` con argumentos, sus funciones con sampler) no cuenta:
 *        se compara con el texto crudo de three. Cada grafía tiene su vacuna.
 *      · N0 SIN RUIDO DE HASH DE ADORNO (§7.4, «0 fbmQ de adorno»): en los textos con `MATERIA_Q 0` (N0 y
 *        lo lejano), ninguna llamada a `fbmQ` ni a `ruidoQ` en ninguna rama de `main`, salvo dentro de los
 *        charcos (`charcoQ`, `charcoDeLaAceraQ`), que el plan deja en hash.
 *      · EL TOPE DE CADA MATERIAL, SI EXISTE. §5.2.9: cada material exporta `TOPE_DEL_SOMBREADOR_POR_NIVEL`
 *        al lado de su fábrica, y la ola 2 los escribe. (b) busca en `ciudad/**` los módulos que lo
 *        exportan, lo asocia a la superficie de prueba cuya fábrica exporta el mismo módulo y mide las
 *        lecturas de textura de TODOS los samplers en el peor camino contra su `lecturas` (la forma que se
 *        lee: `Record<0|1|2|3, { instrucciones: number; lecturas: number }>`; las instrucciones de fxc son
 *        de `verify:quiebro-gl`). Hoy no existe ninguno y se inspeccionan 0; A PARTIR DE QUE un material
 *        real lleve la materia, su tope es obligatorio: el mínimo de inspeccionados es el número de
 *        superficies cuyo material real ya la lleva.
 *   c. LA TEXTURA: 128², el sha de siempre, medias por canal 127 ± 3, varianza por mip creciente, dos
 *      generaciones iguales, 20 ms como mucho en Node y 87.380 bytes con sus mips.
 *   d. LAS DERIVADAS: `dFdx`, `dFdy`, `fwidth` y `texture()` con mip implícito sólo en el preámbulo, y el
 *      preámbulo sin ramas. Regla de fuente sobre `materia/**`, sin comentarios (`soloCodigo`), que además
 *      prohíbe todo `#define` que nombre una derivada o una lectura, o que pegue fichas (`##`). Y sobre el
 *      texto MONTADO: en `main`, nada de `discard`, `if`, `?`, bucles ni `return` antes del preámbulo. Los
 *      montados son los de prueba y, en N1-N3, los de la VENTANA como los monta `abierta.ts` (la fachada y
 *      el mobiliario con `RETOQUE_DEL_FUNDIDO`, orden 5, que descarta) y lo lejano real con su fundido
 *      (`materialDeLoLejano(n, true)`, que también descarta en orden 5).
 *   e. EL NOMBRE DEL RETOQUE LLEVA EL NIVEL: textos distintos, nombres distintos.
 *   f. LOS CHARCOS Y EL CIELO REFLEJADO NO SE TOCAN: `GLSL_CHARCOS` y `GLSL_CIELO_REFLEJADO` tienen el sha
 *      de `d4402d0`.
 *   g. CON BARNIZ 0 EL LÓBULO NO CAMBIA EL COLOR: el banco (`?prueba=barniz`) pinta el coche con y sin
 *      el lóbulo y los píxeles son los mismos; con barniz 1 (la vacuna) cambian. Lo mismo SIN la marca de
 *      barniz y sin forzar nada (el barniz es el que devuelva la familia): un stub que devolviera barniz 1
 *      lo rompería, y la vacuna del stub (el reparto con barniz 1) tiene que cambiar el coche. Y las cinco
 *      superficies de prueba ENLAZAN en la GPU en los cuatro niveles: se pintan y se pregunta a GL por su
 *      programa; una fachada con una línea que no es GLSL tiene que dar exactamente un error. Necesita
 *      `PUERTO` con el Vite de ESTE árbol y Edge: sin ellos el bloque se salta y el guion sale con 2, que
 *      NO es verde.
 *      · SIN GPU, LAS OPCIONES DEL BANCO LLEGAN AL TEXTO POR LOS DOS CAMINOS. (g) no puede depender de
 *        que el mobiliario real todavía no lleve la materia: el día que MOBILIARIO la cablee, el banco
 *        coge el material real y le SUSTITUYE el retoque `materia-*` por el mismo con las opciones
 *        (`conLasOpcionesDelBanco`). Se comprueba en Node, en N1-N3, por el camino de hoy (cableado a
 *        mano) y por el de la ola 2 (un material que ya lleva la materia): A ≠ B, A ≠ C, A0 ≠ B0 y
 *        A0 ≠ V0 en el texto activo, y los dos caminos, el mismo texto. La vacuna: el banco de antes, que
 *        devolvía tal cual el material que ya la llevaba.
 *
 * ═══ CÓMO SE SABE QUE MIRA ═══
 *
 * Cada juez es una función que recibe lo que juzga, y se aplica también a una copia envenenada (las
 * VACUNAS): un material sin el uniforme, una textura sin marca, OCTAVAS_Q 4 en N0, el prototipo que
 * deriva dentro de un `if`, dos niveles con el mismo nombre, un espacio de más en los charcos, un banco
 * que dice que el lóbulo cambia el color. Si un juez dejara de mirar, su vacuna saldría verde y el
 * guion, rojo. Además cada comprobación se vio en rojo rompiendo una COPIA del árbol (el informe de
 * O1-MATERIA dice cuáles y cómo). Cada filtro exige un mínimo de inspeccionados.
 *
 * Salidas, como el arnés de la casa: 0 verde, 1 rojo, 2 bloque saltado, 3 reventado.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as THREE from 'three';
import { FALLOS_DEL_PARCHEO, parchear } from '../src/quiebro/atmosfera/parcheo';
import type { Retoque } from '../src/quiebro/atmosfera/parcheo';
import { GLSL_CHARCOS, GLSL_CIELO_REFLEJADO } from '../src/quiebro/ciudad/glsl';
import { GLSL_DE_LAS_FAMILIAS, acabado, desempaquetarAcabado, FAMILIA } from '../src/quiebro/ciudad/materia/familias';
import type { NumeroDeFamilia } from '../src/quiebro/ciudad/materia/familias';
import { GLSL_DE_LA_MATERIA } from '../src/quiebro/ciudad/materia/glsl';
import { SUPERFICIES_DE_PRUEBA, conLasOpcionesDelBanco, materialConMateria, materialDeHoy } from '../src/quiebro/ciudad/materia/prueba';
import type { MaterialDePrueba, OpcionesDePrueba, SuperficieDePrueba } from '../src/quiebro/ciudad/materia/prueba';
import {
  ANCLA_DEL_PREAMBULO,
  LECTURAS_DE_LA_MATERIA_POR_NIVEL,
  OCTAVAS_POR_NIVEL,
  PCG_DE_LA_MATERIA_POR_NIVEL,
  nombreDeLaMateria,
  retoqueDeLaMateria,
} from '../src/quiebro/ciudad/materia/retoque';
import { RETOQUE_DEL_FUNDIDO, materialDeLoLejano } from '../src/quiebro/ciudad/lejos';
import { materialDeFachada } from '../src/quiebro/ciudad/fachadas';
import {
  MARCA_DE_LA_MATERIA,
  SHA_DEL_RUIDO,
  UNIFORMES_DE_LA_MATERIA,
  VARIANZA_POR_MIP,
  bytesDelRuido,
  generarElRuido,
  texturaDeRuido,
} from '../src/quiebro/ciudad/materia/ruido';
import type { NivelDeLaCiudad } from '../src/quiebro/ciudad/tipos';

/* ─────────────────────────────── El arnés, en corto ─────────────────────────────── */

let hechas = 0;
const fallos: string[] = [];
const saltados: string[] = [];
function comprobar(que: string, bien: boolean, detalle?: unknown): boolean {
  hechas++;
  if (!bien) {
    let texto = '';
    if (detalle !== undefined) {
      try {
        texto = ` — ${typeof detalle === 'string' ? detalle : JSON.stringify(detalle)}`.slice(0, 900);
      } catch {
        texto = ` — ${String(detalle)}`;
      }
    }
    fallos.push(`${que}${texto}`);
  }
  return bien;
}
function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}
function nota(texto: string): void {
  console.log(`  ${texto}`);
}
const reventar = (error: unknown): void => {
  for (const f of fallos) console.log(`  ✗ ${f}`);
  console.error(`\nEL GUION HA REVENTADO después de ${hechas} comprobaciones: no es un veredicto sobre el producto.\n`);
  console.error(error);
  process.exit(3);
};
process.on('uncaughtException', reventar);
process.on('unhandledRejection', reventar);

/*
 * ═══ LO QUE SE EXIGE, ESCRITO AQUÍ Y NO LEÍDO DEL PRODUCTO ═══
 *
 * Un juez que lee su vara del mismo fichero que juzga se deja engañar por él. Lo que el plan fija se
 * copia aquí; el producto se mide contra esto (y, además, contra sus propias tablas).
 */
const EXIGE = {
  /** §2.2: el sha de la textura del prototipo (`mat-analitico/banco/ruido-gen.js`). */
  shaDelRuido: '5d9df310578ac622b85d6ec6d7d82bf884110dfa2b381a5e67f22da2f45ad238',
  ladoDelRuido: 128,
  /** O1-MATERIA: 65.536 B más 21.844 B de mips. */
  bytesDelRuido: 65_536 + 21_844,
  /** O1-MATERIA: la generación, 20 ms como mucho en Node (el mínimo de tres: no se cronometra con la máquina ocupada). */
  msDeGeneracion: 20,
  mediaPorCanal: 127,
  holguraDeLaMedia: 3,
  /** §7.4: lecturas de ruido de la materia en N0, como mucho 4; y en N0 no hay PCG de materia. */
  lecturasEnN0: 4,
  pcgEnN0: 0,
  /** f: los sha de `d4402d0` (medidos sobre el texto exportado de `ciudad/glsl.ts`). */
  shaDeLosCharcos: 'f6800cfb68cfad54616dccee76f7ac77708138251d3b8f5576434736ff42c4b9',
  shaDelCieloReflejado: 'b88e89dc363c7a842ae145747adf844e000c647065b4a62fc6470aeaddcc71bb',
  /** Mínimos de inspeccionados. */
  minimoDeMaterialesA: 20,
  minimoDeMaterialesB: 20,
  minimoDeFicherosD: 19,
  minimoDeDerivadasEnElPreambulo: 4,
  /** d: los 20 de prueba más, en N1-N3, la fachada y el mobiliario de la ventana con el fundido y lo lejano real con el suyo. */
  minimoDeMontadosD: 29,
  /** b: los textos con MATERIA_Q 0: las cinco superficies en N0 y lo lejano en N1-N3. */
  minimoDeTextosDeN0: 8,
  minimoDePixelesDelCoche: 1000,
  /** g: con la vacuna (barniz 1), al menos este tanto por uno del coche tiene que cambiar en N1-N3. */
  partesQueCambianConLaVacuna: 0.05,
  /** g: las cinco superficies en los cuatro niveles. */
  compiladasEnLaGpu: 20,
} as const;

const NIVELES: readonly NivelDeLaCiudad[] = [0, 1, 2, 3];
const sha256 = (s: string | Uint8Array): string => createHash('sha256').update(s).digest('hex');

/** Un código sin comentarios, para las reglas de fuente: un comentario que cita la regla no la rompe. */
function soloCodigo(fuente: string): string {
  return fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

/* ─────────────────────── El texto que montaría three (como `volcar.ts` del plan) ─────────────────────── */

const LUCES: Readonly<Record<NivelDeLaCiudad, { dir: number; punto: number; hemi: number }>> = {
  0: { dir: 1, punto: 0, hemi: 1 },
  1: { dir: 1, punto: 0, hemi: 1 },
  2: { dir: 1, punto: 4, hemi: 1 },
  3: { dir: 1, punto: 6, hemi: 1 },
};
const INCLUIR = /^[ \t]*#include +<([\w\d./]+)>/gm;
function resolverLosTrozos(s: string): string {
  return s.replace(INCLUIR, (_m, n: string) => {
    const c = (THREE.ShaderChunk as Record<string, string>)[n];
    if (c === undefined) throw new Error(`sin trozo ${n}`);
    return resolverLosTrozos(c);
  });
}

interface Compilado {
  readonly frag: string;
  readonly uniformes: Record<string, THREE.IUniform>;
}

/** El fragmento entero (prefijo de three + texto parcheado y resuelto) y los uniformes, sin GPU. */
function compilar(m: THREE.MeshStandardMaterial, nivel: NivelDeLaCiudad): Compilado {
  const sh = {
    vertexShader: THREE.ShaderLib.physical.vertexShader,
    fragmentShader: THREE.ShaderLib.physical.fragmentShader,
    uniforms: THREE.UniformsUtils.clone(THREE.ShaderLib.physical.uniforms) as Record<string, THREE.IUniform>,
    defines: {},
  };
  m.onBeforeCompile(sh as never, {} as never);
  const l = LUCES[nivel];
  const prefijo = [
    '#version 300 es',
    '#define HIGH_PRECISION',
    '#define SHADER_TYPE MeshStandardMaterial',
    m.vertexColors ? '#define USE_COLOR' : '',
    m.fog ? '#define USE_FOG' : '',
    m.transparent ? '' : '#define OPAQUE',
    'uniform mat4 viewMatrix;',
    'uniform vec3 cameraPosition;',
  ]
    .filter((x) => x !== '')
    .join('\n');
  const f = resolverLosTrozos(sh.fragmentShader)
    .replace(/NUM_DIR_LIGHTS/g, String(l.dir))
    .replace(/NUM_POINT_LIGHTS/g, String(l.punto))
    .replace(/NUM_HEMI_LIGHTS/g, String(l.hemi))
    .replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS|NUM_SPOT_LIGHT_SHADOWS|NUM_SPOT_LIGHT_MAPS|NUM_SPOT_LIGHT_COORDS|NUM_SPOT_LIGHTS/g, '0')
    .replace(/NUM_RECT_AREA_LIGHTS|NUM_DIR_LIGHT_SHADOWS|NUM_POINT_LIGHT_SHADOWS|NUM_CLIPPING_PLANES|UNION_CLIPPING_PLANES/g, '0');
  return { frag: `${prefijo}\n${f}`, uniformes: sh.uniforms };
}

/* ─────────────────────────────── Un preprocesador mínimo ─────────────────────────────── */

/**
 * Evalúa las directivas `#if/#ifdef/#ifndef/#elif/#else/#endif/#define/#undef` y devuelve sólo las líneas
 * activas, sin directivas. Las expresiones: `defined`, enteros, macros (recursivas; una sin definir vale 0,
 * como en C), `! - + * / % < > <= >= == != && ||` y paréntesis. Basta para `MATERIA_Q`, `OCTAVAS_Q`,
 * `NIVEL_Q`, `MICRO_Q` y los `#if` de three.
 *
 * NO expande macros en el código. Por eso, si se le da `definidas`, apunta ahí cada `#define` ACTIVO
 * (nombre → «(argumentos) cuerpo»), y (b) pone en rojo las que esconderían coste (`macrosConCoste`).
 */
export function preprocesar(texto: string, iniciales: Readonly<Record<string, string>> = {}, definidas?: Map<string, string>): string {
  const macros = new Map<string, string>(Object.entries(iniciales));
  const pila: { padre: boolean; tomado: boolean }[] = [];
  let activo = true;
  const salida: string[] = [];
  const valor = (expr: string, hondo = 0): number => {
    if (hondo > 20) throw new Error(`macro recursiva: ${expr}`);
    const sinDefined = expr
      .replace(/defined\s*\(\s*(\w+)\s*\)/g, (_m, n: string) => (macros.has(n) ? '1' : '0'))
      .replace(/defined\s+(\w+)/g, (_m, n: string) => (macros.has(n) ? '1' : '0'));
    const fichas = sinDefined.match(/\d+(?:\.\d+)?[uU]?|\w+|&&|\|\||==|!=|<=|>=|[()!<>+\-*/%]/g) ?? [];
    let i = 0;
    const mirar = (): string | undefined => fichas[i];
    const primario = (): number => {
      const t = fichas[i++];
      if (t === undefined) throw new Error(`expresión corta: ${expr}`);
      if (t === '(') {
        const v = o();
        i++;
        return v;
      }
      if (t === '!') return primario() === 0 ? 1 : 0;
      if (t === '-') return -primario();
      if (t === '+') return primario();
      if (/^\d/.test(t)) return parseFloat(t);
      const m = macros.get(t);
      if (m === undefined || m.trim() === '') return 0;
      return valor(m, hondo + 1);
    };
    const binario = (sig: () => number, ops: readonly string[], f: (op: string, a: number, b: number) => number) => (): number => {
      let a = sig();
      while (ops.includes(mirar() ?? '')) {
        const op = fichas[i++] as string;
        a = f(op, a, sig());
      }
      return a;
    };
    const mul = binario(primario, ['*', '/', '%'], (op, a, b) => (op === '*' ? a * b : op === '/' ? a / b : a % b));
    const sum = binario(mul, ['+', '-'], (op, a, b) => (op === '+' ? a + b : a - b));
    const rel = binario(sum, ['<', '>', '<=', '>='], (op, a, b) => +(op === '<' ? a < b : op === '>' ? a > b : op === '<=' ? a <= b : a >= b));
    const igu = binario(rel, ['==', '!='], (op, a, b) => +(op === '==' ? a === b : a !== b));
    const y = binario(igu, ['&&'], (_op, a, b) => +(a !== 0 && b !== 0));
    const o = binario(y, ['||'], (_op, a, b) => +(a !== 0 || b !== 0));
    return o();
  };
  for (const linea of texto.split('\n')) {
    const d = /^\s*#\s*(\w+)\s*(.*)$/.exec(linea);
    if (d === null) {
      if (activo) salida.push(linea);
      continue;
    }
    const directiva = d[1] as string;
    const resto = (d[2] as string).replace(/\/\/.*$/, '').trim();
    if (directiva === 'if' || directiva === 'ifdef' || directiva === 'ifndef') {
      const nombre = resto.split(/\s+/)[0] ?? '';
      const v: boolean = activo && (directiva === 'if' ? valor(resto) !== 0 : directiva === 'ifdef' ? macros.has(nombre) : !macros.has(nombre));
      pila.push({ padre: activo, tomado: v });
      activo = v;
    } else if (directiva === 'elif') {
      const cima = pila[pila.length - 1];
      if (cima === undefined) throw new Error('#elif sin #if');
      if (cima.tomado) activo = false;
      else {
        activo = cima.padre && valor(resto) !== 0;
        cima.tomado = activo;
      }
    } else if (directiva === 'else') {
      const cima = pila[pila.length - 1];
      if (cima === undefined) throw new Error('#else sin #if');
      activo = cima.padre && !cima.tomado;
      cima.tomado = true;
    } else if (directiva === 'endif') {
      const cima = pila.pop();
      if (cima === undefined) throw new Error('#endif sin #if');
      activo = cima.padre;
    } else if (directiva === 'define') {
      if (!activo) continue;
      const m = /^(\w+)(\([^)]*\))?\s*(.*)$/.exec(resto);
      if (m !== null) {
        macros.set(m[1] as string, m[2] !== undefined ? '' : (m[3] as string));
        definidas?.set(m[1] as string, `${m[2] ?? ''} ${m[3] as string}`.trim());
      }
    } else if (directiva === 'undef') {
      if (activo) macros.delete(resto.split(/\s+/)[0] ?? '');
    }
  }
  if (pila.length !== 0) throw new Error('#if sin cerrar');
  return salida.join('\n');
}

/* ─────────────────────────────── El coste en el peor camino ─────────────────────────────── */

interface Coste {
  /** Lecturas de `uRuidoQ`. */
  lecturas: number;
  pcg: number;
  /** Lecturas de textura de CUALQUIER sampler (para el tope de cada material, §5.2.9). */
  todas: number;
}
const CERO: Coste = { lecturas: 0, pcg: 0, todas: 0 };
const mas = (a: Coste, b: Coste): Coste => ({ lecturas: a.lecturas + b.lecturas, pcg: a.pcg + b.pcg, todas: a.todas + b.todas });
const peor = (a: Coste, b: Coste): Coste => ({ lecturas: Math.max(a.lecturas, b.lecturas), pcg: Math.max(a.pcg, b.pcg), todas: Math.max(a.todas, b.todas) });
const LEEN = new Set([
  'texture',
  'texture2D',
  'textureLod',
  'textureGrad',
  'textureOffset',
  'textureLodOffset',
  'textureGradOffset',
  'textureProj',
  'textureProjLod',
  'texelFetch',
  'texelFetchOffset',
]);

/** Las funciones de nivel superior de un texto GLSL sin comentarios: nombre → fichas del cuerpo. */
function funcionesDe(texto: string): Map<string, string[]> {
  const f = new Map<string, string[]>();
  let hondo = 0;
  let desde = 0;
  let inicioDelCuerpo = -1;
  let cabecera = '';
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (c === '{') {
      if (hondo === 0) {
        cabecera = texto.slice(desde, i);
        inicioDelCuerpo = i;
      }
      hondo++;
    } else if (c === '}') {
      hondo--;
      if (hondo === 0) {
        const m = /(\w+)\s*\(([^()]*)\)\s*$/.exec(cabecera);
        if (m !== null && !/\bstruct\b/.test(cabecera)) f.set(m[1] as string, fichasDe(texto.slice(inicioDelCuerpo, i + 1)));
        desde = i + 1;
      }
    } else if (c === ';' && hondo === 0) desde = i + 1;
  }
  return f;
}
function fichasDe(s: string): string[] {
  return s.match(/[A-Za-z_]\w*|\d+\.?\d*(?:[eE][-+]?\d+)?[uUfF]?|\.\d+(?:[eE][-+]?\d+)?|&&|\|\||==|!=|<=|>=|\S/g) ?? [];
}
function cierre(t: readonly string[], i: number, abre: string, cierra: string): number {
  let hondo = 0;
  for (let k = i; k < t.length; k++) {
    if (t[k] === abre) hondo++;
    else if (t[k] === cierra) {
      hondo--;
      if (hondo === 0) return k;
    }
  }
  throw new Error(`sin cerrar ${abre} en ${t.slice(i, i + 12).join(' ')}`);
}

interface Medida extends Coste {
  /** Funciones con un bucle que gasta materia (no se puede contar el peor camino). */
  readonly bucles: string[];
  /** Llamadas a `fbmQ`/`ruidoQ` de hash en TODAS las ramas de `main`, sin las de los charcos. */
  readonly ruidoDeHash: number;
}

/** Las funciones que el plan deja en hash (los charcos, §2.2): sus `fbmQ` no son adorno de la materia. */
const EN_HASH_POR_EL_PLAN: ReadonlySet<string> = new Set(['charcoQ', 'charcoDeLaAceraQ']);

/** Lo que gasta `main` A TRAVÉS de la materia en el peor camino. `materia`: nombres de sus funciones. */
function medir(textoActivo: string, materia: ReadonlySet<string>): Medida {
  const funciones = funcionesDe(soloCodigo(textoActivo));
  const bucles: string[] = [];
  const memo = new Map<string, Coste & { hash: number }>();
  const costeDe = (nombre: string, contarPcg: boolean): Coste & { hash: number } => {
    const llave = `${nombre}|${String(contarPcg)}`;
    const hecho = memo.get(llave);
    if (hecho !== undefined) return hecho;
    const t = funciones.get(nombre) ?? [];
    const pcgAqui = contarPcg || materia.has(nombre);
    let hash = 0;
    const expr = (a: number, b: number): Coste => {
      let c: Coste = CERO;
      for (let k = a; k < b; k++) {
        const n = t[k] as string;
        if (t[k + 1] !== '(' || !/^[A-Za-z_]/.test(n)) continue;
        if (LEEN.has(n)) {
          c = mas(c, { lecturas: t[k + 2] === 'uRuidoQ' ? 1 : 0, pcg: 0, todas: 1 });
        } else if (n === 'pcgQ') {
          if (pcgAqui) c = mas(c, { lecturas: 0, pcg: 1, todas: 0 });
        } else if (n !== nombre && funciones.has(n)) {
          if (n === 'fbmQ' || n === 'ruidoQ') hash++;
          const sub = costeDe(n, pcgAqui);
          /* Los charcos siguen en hash por el plan (§2.2): lo que llaman no es ruido de adorno. */
          if (!EN_HASH_POR_EL_PLAN.has(n)) hash += sub.hash;
          c = mas(c, sub);
        }
      }
      return c;
    };
    /*
     * Una sentencia: su coste, dónde acaba, si acaba en `return` y, si es un `if` sin `else` cuya rama
     * vuelve (el «si es de piedra, devuelve la piedra» de `muroQ`), la condición y esa rama: lo que sigue
     * en el bloque es el OTRO camino, no uno que se suma.
     */
    type Sentencia = { c: Coste; sig: number; vuelve: boolean; salida?: { cond: Coste; rama: Coste } };
    const secuencia = (k: number, fin: number): { c: Coste; vuelve: boolean } => {
      if (k >= fin) return { c: CERO, vuelve: false };
      const s = sentencia(k);
      if (s.vuelve) return { c: s.c, vuelve: true };
      const resto = secuencia(s.sig, fin);
      if (s.salida !== undefined) return { c: mas(s.salida.cond, peor(s.salida.rama, resto.c)), vuelve: resto.vuelve };
      return { c: mas(s.c, resto.c), vuelve: resto.vuelve };
    };
    const sentencia = (i: number): Sentencia => {
      const x = t[i];
      if (x === '{') {
        const fin = cierre(t, i, '{', '}');
        const s = secuencia(i + 1, fin);
        return { c: s.c, sig: fin + 1, vuelve: s.vuelve };
      }
      if (x === 'if') {
        const p = cierre(t, i + 1, '(', ')');
        const cond = expr(i + 2, p);
        const a = sentencia(p + 1);
        if (t[a.sig] === 'else') {
          const b = sentencia(a.sig + 1);
          return { c: mas(cond, peor(a.c, b.c)), sig: b.sig, vuelve: a.vuelve && b.vuelve };
        }
        return { c: mas(cond, a.c), sig: a.sig, vuelve: false, ...(a.vuelve ? { salida: { cond, rama: a.c } } : {}) };
      }
      if (x === 'for' || x === 'while') {
        const p = cierre(t, i + 1, '(', ')');
        const cab = expr(i + 2, p);
        const cuerpo = sentencia(p + 1);
        const c = mas(cab, cuerpo.c);
        if (c.lecturas + c.pcg > 0) bucles.push(nombre);
        return { c, sig: cuerpo.sig, vuelve: false };
      }
      let k = i;
      let parentesis = 0;
      while (k < t.length && !(t[k] === ';' && parentesis === 0)) {
        if (t[k] === '(') parentesis++;
        else if (t[k] === ')') parentesis--;
        k++;
      }
      return { c: expr(i, k), sig: k + 1, vuelve: x === 'return' };
    };
    const c = t.length > 0 ? sentencia(0).c : CERO;
    const r = { ...c, hash };
    memo.set(llave, r);
    return r;
  };
  if (!funciones.has('main')) throw new Error('el texto no tiene main');
  const m = costeDe('main', false);
  return { lecturas: m.lecturas, pcg: m.pcg, todas: m.todas, bucles, ruidoDeHash: m.hash };
}

/** Los nombres de las funciones de la materia (las que pone su retoque). */
const FUNCIONES_DE_LA_MATERIA: ReadonlySet<string> = new Set(funcionesDe(soloCodigo(`${GLSL_DE_LA_MATERIA}${GLSL_DE_LAS_FAMILIAS}`)).keys());

/**
 * Lo que una macro no puede nombrar: derivadas, lecturas, `pcgQ`, `uRuidoQ`, o pegar fichas (`##`). Con
 * eso, una lectura o una derivada se esconden al contador de (b) y a la regla de fuente de (d).
 */
const COSTE_EN_MACRO = /\b(?:dFdx\w*|dFdy\w*|fwidth\w*|texture\w*|texelFetch\w*|pcgQ|uRuidoQ)\b|##/;

/** Las macros activas cuyo cuerpo tiene coste de materia (o llama a una función de la materia). */
function macrosConCoste(definidas: ReadonlyMap<string, string>, materia: ReadonlySet<string>): string[] {
  const malas: string[] = [];
  for (const [nombre, cuerpo] of definidas) {
    const llamaALaMateria = (cuerpo.match(/[A-Za-z_]\w*/g) ?? []).some((id) => materia.has(id));
    if (COSTE_EN_MACRO.test(cuerpo) || llamaALaMateria) malas.push(`#define ${nombre} ${cuerpo}`.slice(0, 120));
  }
  return malas;
}

/* ─────────────────────── b. Las puertas del contador: reglas, no grafías ─────────────────────── */

/** Une las líneas partidas con `\` (GLSL ES 3.00 las admite): un `#define X \` + `dFdx(p)` es una sola línea. */
const unirLasLineas = (s: string): string => s.replace(/\\+[ \t]*\r?\n/g, ' ');

/** Un `#define` (con la almohadilla y la palabra separadas o no) y lo que le sigue en su línea. */
const DEFINE = /^[ \t]*#[ \t]*define[ \t]+(\w+)(.*)$/gm;

/**
 * Un parámetro `sampler*` en una lista de parámetros: `(sampler2D`, `, in highp sampler2D`, `(isampler3D`,
 * `, samplerCube`… Con él, una función recibe `uRuidoQ` y lee por su parámetro sin que el contador, que
 * busca `texture*(uRuidoQ`, lo vea.
 */
const PARAMETRO_SAMPLER = /[(,]\s*(?:(?:in|const|lowp|mediump|highp|precise)\s+)*[iu]?sampler\w*\b/;

/** Las funciones (definidas o declaradas) con un parámetro `sampler*`: sus nombres. */
function funcionesConSampler(texto: string): string[] {
  const nombres: string[] = [];
  for (const m of texto.matchAll(/\b(\w+)\s*\(([^()]*)\)\s*[{;]/g)) {
    if (PARAMETRO_SAMPLER.test(`(${m[2] as string}`)) nombres.push(m[1] as string);
  }
  return nombres;
}

/** Los `#define` con argumentos de un texto: `nombre(`. */
function macrosConArgumentos(texto: string): string[] {
  return [...unirLasLineas(texto).matchAll(DEFINE)].filter((m) => (m[2] as string).startsWith('(')).map((m) => m[1] as string);
}

/**
 * La regla de fuente de (b) sobre `materia/**`, sin comentarios: nada de funciones con un parámetro
 * `sampler*`, ni de `#define` con argumentos, ni de `#define` cuyo cuerpo tenga coste o pegue fichas.
 */
function juzgarLaFuenteDelContador(fuentes: readonly FuenteDeMateria[]): string[] {
  const problemas: string[] = [];
  for (const f of fuentes) {
    const codigo = unirLasLineas(soloCodigo(f.texto));
    for (const nombre of funcionesConSampler(codigo)) problemas.push(`${f.fichero}: la función ${nombre} tiene un parámetro sampler (una lectura por parámetro no se cuenta)`);
    /* Y ningún sampler que no sea un `uniform` suelto (un campo de struct, un parámetro que se escape). */
    const samplers = [...codigo.matchAll(/\b[iu]?sampler\w*\b/g)].length;
    const uniformes = [...codigo.matchAll(/\buniform\s+(?:(?:lowp|mediump|highp)\s+)?[iu]?sampler\w*\s+\w+\s*;/g)].length;
    if (samplers > uniformes) problemas.push(`${f.fichero}: ${String(samplers - uniformes)} sampler(s) fuera de un «uniform samplerX nombre;»`);
    for (const m of codigo.matchAll(DEFINE)) {
      const nombre = m[1] as string;
      const resto = m[2] as string;
      if (resto.startsWith('(')) problemas.push(`${f.fichero}: el #define ${nombre} tiene argumentos`);
      else if (COSTE_EN_MACRO.test(resto)) problemas.push(`${f.fichero}: el cuerpo del #define ${nombre} deriva, lee o pega fichas`);
    }
  }
  return problemas;
}

/** Lo que three trae de suyo en el fragmento, CRUDO (todas sus ramas): no es de nadie de aquí. */
const DE_THREE = (() => {
  const crudo = soloCodigo(resolverLosTrozos(THREE.ShaderLib.physical.fragmentShader));
  return { macros: new Set(macrosConArgumentos(crudo)), conSampler: new Set(funcionesConSampler(crudo)) };
})();

/**
 * La regla de (b) sobre el texto MONTADO y activo de un material: ni `#define` con argumentos ni funciones
 * con sampler que no traiga three, y `uRuidoQ` sólo en su `uniform` o como primer argumento de una
 * `texture*`/`texelFetch*`.
 */
function juzgarElMontadoDelContador(activo: string, definidas: ReadonlyMap<string, string>): string[] {
  const problemas: string[] = [];
  const codigo = soloCodigo(activo);
  for (const [nombre, cuerpo] of definidas) {
    if (cuerpo.startsWith('(') && !DE_THREE.macros.has(nombre)) problemas.push(`#define ${nombre}${cuerpo.slice(0, 60)}: con argumentos`);
  }
  for (const nombre of funcionesConSampler(codigo)) if (!DE_THREE.conSampler.has(nombre)) problemas.push(`la función ${nombre} tiene un parámetro sampler`);
  const t = fichasDe(codigo);
  let usos = 0;
  for (let k = 0; k < t.length; k++) {
    if (t[k] !== 'uRuidoQ') continue;
    usos++;
    const leida = t[k - 1] === '(' && LEEN.has(t[k - 2] ?? '');
    const declarada = t[k - 1] === 'sampler2D' && t[k - 2] === 'uniform' && t[k + 1] === ';';
    if (!leida && !declarada) problemas.push(`uRuidoQ fuera de una lectura directa: «${t.slice(Math.max(0, k - 4), k + 4).join(' ')}»`);
  }
  if (usos > 0 && !/\buniform\s+sampler2D\s+uRuidoQ\s*;/.test(codigo)) problemas.push('uRuidoQ usado sin su uniform');
  return problemas;
}

/* ─────────────────────── b. El tope de cada material, si existe (§5.2.9) ─────────────────────── */

/** La fábrica de cada superficie de prueba: el módulo que la exporta es el del material. */
const FABRICA_DE_LA_SUPERFICIE: Readonly<Record<SuperficieDePrueba, string>> = {
  fachada: 'materialDeFachada',
  asfalto: 'materialDelAsfalto',
  acera: 'materialDeLaAcera',
  mobiliario: 'materialDelMobiliario',
  lejos: 'materialDeLoLejano',
};

interface TopeDeUnMaterial {
  readonly fichero: string;
  readonly superficies: readonly SuperficieDePrueba[];
  readonly tabla: unknown;
}

/** Los `TOPE_DEL_SOMBREADOR_POR_NIVEL` que existan en `ciudad/**`, con la superficie de cada uno. */
async function losTopesQueExisten(carpetaDeLaCiudad: string): Promise<TopeDeUnMaterial[]> {
  const topes: TopeDeUnMaterial[] = [];
  const recorrer = async (dir: string, prefijo: string): Promise<void> => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) await recorrer(join(dir, e.name), `${prefijo}${e.name}/`);
      else if (/\.tsx?$/.test(e.name)) {
        const codigo = soloCodigo(readFileSync(join(dir, e.name), 'utf8'));
        if (!/\bexport\s+const\s+TOPE_DEL_SOMBREADOR_POR_NIVEL\b/.test(codigo)) continue;
        const superficies = SUPERFICIES_DE_PRUEBA.filter((s) => new RegExp(`\\bexport\\s+(?:function|const)\\s+${FABRICA_DE_LA_SUPERFICIE[s]}\\b`).test(codigo));
        const modulo = (await import(pathToFileURL(join(dir, e.name)).href)) as Record<string, unknown>;
        topes.push({ fichero: `${prefijo}${e.name}`, superficies, tabla: modulo.TOPE_DEL_SOMBREADOR_POR_NIVEL });
      }
    }
  };
  await recorrer(carpetaDeLaCiudad, '');
  return topes;
}

/**
 * El juicio de los topes: cada tabla con la forma que se lee y, para su superficie, las lecturas de
 * textura del peor camino (`todas`) por debajo de su `lecturas`; y cada superficie cuyo material real ya
 * lleva la materia, con su tope. Devuelve los problemas y cuántas comparaciones hizo.
 */
function juzgarLosTopes(
  topes: readonly TopeDeUnMaterial[],
  lecturasDe: (s: SuperficieDePrueba, n: NivelDeLaCiudad) => number | undefined,
  yaLaLlevan: ReadonlySet<SuperficieDePrueba>,
): { problemas: string[]; comparadas: number; superficies: Set<SuperficieDePrueba> } {
  const problemas: string[] = [];
  const superficies = new Set<SuperficieDePrueba>();
  let comparadas = 0;
  for (const t of topes) {
    for (const n of NIVELES) {
      const e = (t.tabla as Record<number, unknown> | undefined)?.[n] as { instrucciones?: unknown; lecturas?: unknown } | undefined;
      if (typeof e?.lecturas !== 'number' || typeof e.instrucciones !== 'number') {
        problemas.push(`${t.fichero}: TOPE_DEL_SOMBREADOR_POR_NIVEL[${String(n)}] no es { instrucciones: number; lecturas: number }`);
        continue;
      }
      for (const s of t.superficies) {
        const medidas = lecturasDe(s, n);
        if (medidas === undefined) continue;
        comparadas++;
        superficies.add(s);
        if (medidas > e.lecturas) problemas.push(`${s}-n${String(n)}: ${String(medidas)} lecturas de textura > su tope ${String(e.lecturas)} (${t.fichero})`);
      }
    }
  }
  for (const s of yaLaLlevan) if (!superficies.has(s)) problemas.push(`${s}: el material real ya lleva la materia y nadie exporta su TOPE_DEL_SOMBREADOR_POR_NIVEL`);
  return { problemas, comparadas, superficies };
}

/* ─────────────────────────────── Los materiales que se juzgan ─────────────────────────────── */

interface Juzgable {
  readonly nombre: string;
  readonly nivel: NivelDeLaCiudad;
  readonly material: THREE.MeshStandardMaterial;
  readonly faltan: readonly string[];
  readonly yaLaLlevaba: boolean;
}

function losMateriales(): Juzgable[] {
  const lista: Juzgable[] = [];
  for (const nivel of NIVELES) {
    for (const s of SUPERFICIES_DE_PRUEBA) {
      const h = materialConMateria(s, nivel);
      lista.push({ nombre: `${s}-n${String(nivel)}`, nivel, material: h.material, faltan: h.faltan, yaLaLlevaba: h.yaLaLlevaba });
    }
  }
  return lista;
}

function retoquesDe(m: THREE.Material): Retoque[] {
  return (m.userData.parcheoDelQuiebro as { retoques: Retoque[] }).retoques;
}

/** Cambia en un material el retoque de la materia por otro (para las vacunas). */
function cambiarLaMateria(m: THREE.Material, cambio: (r: Retoque) => Retoque): void {
  const lista = retoquesDe(m);
  const i = lista.findIndex((r) => r.nombre.startsWith('materia-'));
  if (i < 0) throw new Error('el material de la vacuna no lleva materia');
  lista[i] = cambio(lista[i] as Retoque);
  m.needsUpdate = true;
}

/* ─────────────────────────────── a. El sampler siempre atado ─────────────────────────────── */

const USA_LA_MATERIA = /\b(ruidoT|fbmT|granoT|superficieQ)\s*\(/;

/** El juicio de (a) sobre un material ya compilado. Devuelve los problemas; vacío = bien. */
function juzgarElSampler(c: Compilado, fallosDelParcheo: readonly string[]): string[] {
  const problemas: string[] = [];
  const activo = soloCodigo(preprocesar(c.frag));
  if (!USA_LA_MATERIA.test(activo)) return problemas;
  if (!/\buniform\s+sampler2D\s+uRuidoQ\s*;/.test(activo)) problemas.push('no declara uRuidoQ');
  const t = c.uniformes.uRuidoQ?.value as THREE.Texture | undefined | null;
  if (t === undefined || t === null) problemas.push('sin uniforme uRuidoQ');
  else if (t.userData?.materiaQ !== MARCA_DE_LA_MATERIA) problemas.push(`uRuidoQ sin la marca (${String(t.userData?.materiaQ)})`);
  else if (!(t.image as { width?: number } | undefined)?.width) problemas.push('uRuidoQ sin imagen');
  const v = c.uniformes.uVarianzaDelGranoQ?.value as ArrayLike<number> | undefined;
  if (v === undefined || v.length !== 8 || Array.from(v).some((x, i) => Math.abs(x - (VARIANZA_POR_MIP[i] as number)) > 1e-9)) {
    problemas.push('uVarianzaDelGranoQ no es la tabla de la materia');
  }
  if (!/\bvarying\s+vec3\s+vPosMundoQ\b/.test(activo) || !/\buint\s+pcgQ\s*\(/.test(activo)) problemas.push('sin el retoque mundo');
  if (/cieloReflejadoQ\s*\(/.test(activo) && !/\bvec3\s+cieloReflejadoQ\s*\(/.test(activo)) problemas.push('el barniz llama a cieloReflejadoQ sin el retoque entorno');
  if (fallosDelParcheo.length > 0) problemas.push(`fallos del parcheo: ${fallosDelParcheo.join(' | ')}`);
  return problemas;
}

/* ─────────────────────────────── d. Las derivadas ─────────────────────────────── */

const DERIVA = /\b(dFdx\w*|dFdy\w*|fwidth\w*|texture|texture2D|textureProj|textureOffset|textureProjOffset|texture2DProj)\s*\(/g;
const RAMA = /\bif\b|\?|\bfor\b|\bwhile\b|\bswitch\b|\bdiscard\b|\breturn\b|\bdo\b/;
const PREAMBULO = /GLSL_PREAMBULO_DE_LA_MATERIA\s*=\s*\/\*\s*glsl\s*\*\/\s*`([\s\S]*?)`/;

interface FuenteDeMateria {
  readonly fichero: string;
  readonly texto: string;
}

/** Los ficheros de `materia/**` (la regla de fuente de b y de d). */
function lasFuentesDeLaMateria(): FuenteDeMateria[] {
  const fuentes: FuenteDeMateria[] = [];
  const recorrer = (dir: string, prefijo: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) recorrer(join(dir, e.name), `${prefijo}${e.name}/`);
      else if (/\.tsx?$/.test(e.name)) fuentes.push({ fichero: `${prefijo}${e.name}`, texto: readFileSync(join(dir, e.name), 'utf8') });
    }
  };
  recorrer(fileURLToPath(new URL('../src/quiebro/ciudad/materia/', import.meta.url)), '');
  return fuentes;
}

/** El juicio de (d): derivadas fuera del preámbulo, o ramas en él. */
function juzgarLasDerivadas(fuentes: readonly FuenteDeMateria[]): { problemas: string[]; enElPreambulo: number; preambulos: number } {
  const problemas: string[] = [];
  let enElPreambulo = 0;
  let preambulos = 0;
  for (const f of fuentes) {
    const m = PREAMBULO.exec(f.texto);
    let fuera = f.texto;
    if (m !== null) {
      preambulos++;
      fuera = f.texto.slice(0, m.index) + f.texto.slice(m.index + m[0].length);
      const dentro = soloCodigo(m[1] as string)
        .split('\n')
        .filter((l) => !/^\s*#/.test(l))
        .join('\n');
      enElPreambulo += [...dentro.matchAll(DERIVA)].length;
      if (RAMA.test(dentro)) problemas.push(`${f.fichero}: el preámbulo tiene una rama (${RAMA.exec(dentro)?.[0] ?? ''})`);
    }
    for (const d of soloCodigo(fuera).matchAll(DERIVA)) problemas.push(`${f.fichero}: «${d[0]}» fuera del preámbulo`);
    /* Una derivada o una lectura escondidas en una macro (también dentro del preámbulo). */
    for (const l of soloCodigo(f.texto).matchAll(/^[ \t]*#[ \t]*define[ \t]+(\w+)(.*)$/gm)) {
      if (COSTE_EN_MACRO.test(l[2] as string)) problemas.push(`${f.fichero}: la macro ${l[1] as string} esconde una derivada o una lectura`);
    }
  }
  return { problemas, enElPreambulo, preambulos };
}

/** Lo que no puede ir en `main` antes del preámbulo: descartes y control de flujo. */
const ANTES_DEL_PREAMBULO = /\bdiscard\b|\bif\b|\?|\bfor\b|\bwhile\b|\bswitch\b|\breturn\b|\bdo\b/;

/** El juicio del orden sobre el texto MONTADO: el preámbulo, lo primero de `main` que no es declarar. */
function juzgarElOrdenDelPreambulo(frag: string): string[] {
  const activo = soloCodigo(preprocesar(frag));
  const main = /\bvoid\s+main\s*\(\s*\)\s*\{/.exec(activo);
  if (main === null) return ['sin main'];
  const pre = activo.indexOf('dPdxQ = dFdx(', main.index);
  if (pre < 0) return ['sin el preámbulo dentro de main'];
  const antes = activo.slice(main.index + main[0].length, pre);
  const r = ANTES_DEL_PREAMBULO.exec(antes);
  return r === null ? [] : [`«${r[0]}» antes del preámbulo: ${antes.slice(Math.max(0, r.index - 60), r.index + 60).replace(/\s+/g, ' ')}`];
}

/* ─────────────────────────────── e. Los nombres ─────────────────────────────── */

interface RetoqueConNombre {
  readonly nivel: NivelDeLaCiudad | 'lejos';
  readonly retoque: Retoque;
}
function textoDelRetoque(r: Retoque): string {
  return JSON.stringify({ d: r.defines ?? {}, f: (r.fragmento ?? []).map((s) => s.texto), v: (r.vertice ?? []).map((s) => s.texto) });
}
function juzgarLosNombres(lista: readonly RetoqueConNombre[]): string[] {
  const problemas: string[] = [];
  const porNombre = new Map<string, string>();
  for (const { nivel, retoque } of lista) {
    const lleva = nivel === 'lejos' ? /lejos/.test(retoque.nombre) : new RegExp(`n${String(nivel)}\\b`).test(retoque.nombre);
    if (!lleva) problemas.push(`${retoque.nombre} no lleva su nivel (${String(nivel)})`);
    const texto = textoDelRetoque(retoque);
    const otro = porNombre.get(retoque.nombre);
    if (otro !== undefined && otro !== texto) problemas.push(`${retoque.nombre}: dos textos con el mismo nombre`);
    porNombre.set(retoque.nombre, texto);
  }
  return problemas;
}

/* ─────────────────────────────── g. El banco en la GPU ─────────────────────────────── */

interface MedidaDelBarniz {
  readonly nivel: number;
  readonly pixelesDelCoche: number;
  readonly maxAB: number;
  readonly cambianConLaVacuna: number;
  readonly maxSinMarca?: number;
  readonly cambianConElStubRoto?: number;
}
interface ResultadoDelBanco {
  readonly modo: string;
  readonly medidas?: readonly MedidaDelBarniz[];
  /** Sólo las que ENLAZARON (pintadas, y GL dice LINK_STATUS verdadero). */
  readonly compiladas?: readonly string[];
  readonly sinEnlazar?: readonly string[];
  readonly vacunaDelEnlace?: { readonly errores: number; readonly enlaza: boolean; readonly primero?: string };
  readonly programas?: number;
  readonly errores?: readonly string[];
  readonly faltan?: readonly string[];
  readonly fallosDelParcheo?: readonly string[];
  readonly errorDeGl?: number;
}

function juzgarElBarniz(r: ResultadoDelBanco): string[] {
  const problemas: string[] = [];
  if (r.modo !== 'barniz') problemas.push(`el banco no hizo la prueba (modo ${r.modo})`);
  for (const e of [...(r.errores ?? []), ...(r.faltan ?? []), ...(r.fallosDelParcheo ?? [])]) problemas.push(e);
  if (r.errorDeGl !== 0) problemas.push(`error de GL ${String(r.errorDeGl)}`);
  if ((r.compiladas ?? []).length < EXIGE.compiladasEnLaGpu) problemas.push(`sólo ${String((r.compiladas ?? []).length)} superficies enlazadas`);
  if (r.sinEnlazar === undefined) problemas.push('el banco no dice cuáles no enlazaron (¿banco viejo?)');
  else if (r.sinEnlazar.length > 0) problemas.push(`sin enlazar: ${r.sinEnlazar.join(', ')}`);
  /* La vacuna del enlace: un GLSL roto da exactamente un error y no enlaza. Si no, la cuenta no mira. */
  const v = r.vacunaDelEnlace;
  if (v === undefined) problemas.push('el banco no pintó la vacuna del enlace');
  else if (v.errores !== 1 || v.enlaza) problemas.push(`la vacuna del enlace (GLSL roto) dio ${String(v.errores)} errores y enlaza=${String(v.enlaza)}: el enlace no se está mirando`);
  const medidas = r.medidas ?? [];
  if (medidas.length !== 4) problemas.push(`${String(medidas.length)} niveles medidos de 4`);
  for (const m of medidas) {
    const n = `N${String(m.nivel)}`;
    if (m.pixelesDelCoche < EXIGE.minimoDePixelesDelCoche) problemas.push(`${n}: el coche tiene ${String(m.pixelesDelCoche)} píxeles`);
    if (m.maxAB !== 0) problemas.push(`${n}: con barniz 0 el lóbulo cambia el color (máx ${String(m.maxAB)})`);
    if (m.nivel === 0 && m.cambianConLaVacuna !== 0) problemas.push('N0: el lóbulo existe en N0 (la vacuna cambia píxeles)');
    if (m.nivel >= 1 && m.cambianConLaVacuna < m.pixelesDelCoche * EXIGE.partesQueCambianConLaVacuna) {
      problemas.push(`${n}: la vacuna (barniz 1) sólo cambia ${String(m.cambianConLaVacuna)} píxeles: la comparación no mira`);
    }
    /* Sin la marca de barniz y sin forzar nada: lo que devuelva la familia (hoy, el stub). */
    if (m.maxSinMarca === undefined || m.cambianConElStubRoto === undefined) {
      problemas.push(`${n}: el banco no midió la familia sin la marca`);
      continue;
    }
    if (m.maxSinMarca !== 0) problemas.push(`${n}: sin la marca de barniz, la familia cambia el color con el lóbulo (máx ${String(m.maxSinMarca)}): ¿un stub con barniz?`);
    if (m.nivel === 0 && m.cambianConElStubRoto !== 0) problemas.push('N0: la vacuna del stub cambia píxeles (en N0 no se reparte)');
    if (m.nivel >= 1 && m.cambianConElStubRoto < m.pixelesDelCoche * EXIGE.partesQueCambianConLaVacuna) {
      problemas.push(`${n}: la vacuna del stub (barniz 1 sin la marca) sólo cambia ${String(m.cambianConElStubRoto)} píxeles: la comparación sin la marca no mira`);
    }
  }
  return problemas;
}

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARBOL = fileURLToPath(new URL('../../', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, '');

async function elBanco(puerto: string): Promise<ResultadoDelBanco | string> {
  if (!existsSync(EDGE)) return `no está Edge en ${EDGE}`;
  const sonda = `http://localhost:${puerto}/sala/@fs/${ARBOL}/escritorio/banco-quiebro-materia.html`;
  let estado = 0;
  try {
    estado = (await fetch(sonda)).status;
  } catch {
    return `no hay servidor en el puerto ${puerto}`;
  }
  if (estado !== 200) return `el servidor del puerto ${puerto} no sirve ESTE árbol (${ARBOL}): contesta ${String(estado)} a ${sonda}`;
  const perfil = process.env.PERFIL_EDGE ?? join(tmpdir(), `quiebro-materia-edge-${puerto}`);
  mkdirSync(perfil, { recursive: true });
  const r = spawnSync(
    EDGE,
    [
      '--headless=new',
      '--disable-gpu-sandbox',
      '--use-angle=d3d11',
      '--enable-unsafe-swiftshader',
      `--user-data-dir=${perfil}`,
      '--window-size=400,400',
      '--virtual-time-budget=30000',
      '--dump-dom',
      `http://localhost:${puerto}/sala/banco-quiebro-materia.html?prueba=barniz`,
    ],
    { encoding: 'utf8', timeout: 240_000, maxBuffer: 64 * 1024 * 1024 },
  );
  const m = /<pre id="resultado-materia"[^>]*>([\s\S]*?)<\/pre>/.exec(r.stdout ?? '');
  if (m === null) return `el banco no dejó resultado (Edge salió con ${String(r.status)})`;
  const json = (m[1] as string).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  return JSON.parse(json) as ResultadoDelBanco;
}

/* ═══════════════════════════════ LAS COMPROBACIONES ═══════════════════════════════ */

async function principal(): Promise<void> {
  const materiales = losMateriales();

  /* ─── a ─── */
  paso('a · el sampler siempre atado');
  let inspeccionadosA = 0;
  for (const j of materiales) {
    const antes = FALLOS_DEL_PARCHEO.length;
    const c = compilar(j.material, j.nivel);
    const nuevos = FALLOS_DEL_PARCHEO.slice(antes);
    const activo = soloCodigo(preprocesar(c.frag));
    if (USA_LA_MATERIA.test(activo)) inspeccionadosA++;
    comprobar(`a · ${j.nombre}: la materia bien atada`, juzgarElSampler(c, nuevos).length === 0, juzgarElSampler(c, nuevos));
    comprobar(`a · ${j.nombre}: el cableado de prueba encontró su texto`, j.faltan.length === 0 || j.yaLaLlevaba, j.faltan);
  }
  comprobar(`a · inspeccionados ${String(inspeccionadosA)} ≥ ${String(EXIGE.minimoDeMaterialesA)}`, inspeccionadosA >= EXIGE.minimoDeMaterialesA);
  nota(`${String(inspeccionadosA)} materiales que usan la materia, todos con uRuidoQ marcado`);
  /* Las vacunas: sin uniformes, y con una textura igual pero sin la marca. */
  const sinUniforme = materialConMateria('fachada', 2).material;
  cambiarLaMateria(sinUniforme, (r) => ({ ...r, nombre: `${r.nombre}-vacuna-sin-uniforme`, uniformes: {} }));
  comprobar('a · vacuna: sin el uniforme, el juez lo ve', juzgarElSampler(compilar(sinUniforme, 2), []).length > 0);
  const copia = texturaDeRuido().clone();
  copia.userData = {};
  const sinMarca = materialConMateria('asfalto', 1).material;
  cambiarLaMateria(sinMarca, (r) => ({ ...r, nombre: `${r.nombre}-vacuna-sin-marca`, uniformes: { ...UNIFORMES_DE_LA_MATERIA, uRuidoQ: { value: copia } } }));
  comprobar('a · vacuna: una textura igual sin la marca, el juez lo ve', juzgarElSampler(compilar(sinMarca, 1), []).length > 0);

  /* ─── b ─── */
  paso('b · el presupuesto de lecturas y PCG, en el peor camino');
  const noBaja = (t: Readonly<Record<NivelDeLaCiudad, number>>): boolean => NIVELES.every((n, i) => i === 0 || t[n] >= t[NIVELES[i - 1] as NivelDeLaCiudad]);
  comprobar('b · las tablas del gasto de la materia no bajan al subir de nivel', noBaja(LECTURAS_DE_LA_MATERIA_POR_NIVEL) && noBaja(PCG_DE_LA_MATERIA_POR_NIVEL), {
    LECTURAS_DE_LA_MATERIA_POR_NIVEL,
    PCG_DE_LA_MATERIA_POR_NIVEL,
  });
  comprobar('b · el gasto de N0 cabe en lo que pide el plan', LECTURAS_DE_LA_MATERIA_POR_NIVEL[0] <= EXIGE.lecturasEnN0 && PCG_DE_LA_MATERIA_POR_NIVEL[0] <= EXIGE.pcgEnN0);
  const juzgarElCoste = (m: Medida, nivel: NivelDeLaCiudad, macros: readonly string[], puertas: readonly string[] = []): string[] => {
    const p: string[] = [];
    if (m.lecturas > LECTURAS_DE_LA_MATERIA_POR_NIVEL[nivel]) p.push(`${String(m.lecturas)} lecturas > ${String(LECTURAS_DE_LA_MATERIA_POR_NIVEL[nivel])}`);
    if (m.pcg > PCG_DE_LA_MATERIA_POR_NIVEL[nivel]) p.push(`${String(m.pcg)} PCG > ${String(PCG_DE_LA_MATERIA_POR_NIVEL[nivel])}`);
    if (nivel === 0 && (m.lecturas > EXIGE.lecturasEnN0 || m.pcg > EXIGE.pcgEnN0)) p.push('N0 por encima de lo del plan');
    if (m.bucles.length > 0) p.push(`bucles con materia: ${m.bucles.join(', ')}`);
    if (macros.length > 0) p.push(`macros que esconden coste: ${macros.join(' | ')}`);
    if (puertas.length > 0) p.push(`puertas del contador: ${puertas.join(' | ')}`);
    return p;
  };
  /** Mide un texto: el coste en el peor camino, las macros activas que esconderían coste y las puertas del contador. */
  const medirConMacros = (frag: string): { m: Medida; macros: string[]; definidas: number; puertas: string[] } => {
    const definidas = new Map<string, string>();
    const activo = preprocesar(frag, {}, definidas);
    return {
      m: medir(activo, FUNCIONES_DE_LA_MATERIA),
      macros: macrosConCoste(definidas, FUNCIONES_DE_LA_MATERIA),
      definidas: definidas.size,
      puertas: juzgarElMontadoDelContador(activo, definidas),
    };
  };
  let inspeccionadosB = 0;
  let macrosMiradas = 0;
  const tabla: string[] = [];
  /** Lo medido de cada material de prueba (para el ruido de hash de N0 y los topes de cada material). */
  const medidasB = new Map<string, Medida>();
  for (const j of materiales) {
    const { m, macros, definidas, puertas } = medirConMacros(compilar(j.material, j.nivel).frag);
    inspeccionadosB++;
    macrosMiradas += definidas;
    medidasB.set(j.nombre, m);
    tabla.push(`${j.nombre}: ${String(m.lecturas)} lecturas, ${String(m.pcg)} PCG, ${String(m.todas)} lecturas de textura en total (fbmQ/ruidoQ de hash en todas las ramas, sin los charcos: ${String(m.ruidoDeHash)})`);
    comprobar(`b · ${j.nombre} dentro del tope`, juzgarElCoste(m, j.nivel, macros, puertas).length === 0, juzgarElCoste(m, j.nivel, macros, puertas));
  }
  for (const l of tabla) nota(l);
  comprobar(`b · inspeccionados ${String(inspeccionadosB)} ≥ ${String(EXIGE.minimoDeMaterialesB)}`, inspeccionadosB >= EXIGE.minimoDeMaterialesB);

  /* N0 sin ruido de hash de adorno (§7.4): los textos con MATERIA_Q 0, que son N0 y lo lejano. */
  const juzgarElAdornoDeN0 = (m: Medida): string[] => (m.ruidoDeHash > 0 ? [`${String(m.ruidoDeHash)} llamadas a fbmQ/ruidoQ de adorno`] : []);
  const deMateria0 = materiales.filter((j) => j.nivel === 0 || j.nombre.startsWith('lejos-'));
  for (const j of deMateria0) {
    const m = medidasB.get(j.nombre) as Medida;
    comprobar(`b · ${j.nombre}: ni fbmQ ni ruidoQ de adorno con MATERIA_Q 0`, juzgarElAdornoDeN0(m).length === 0, juzgarElAdornoDeN0(m));
  }
  comprobar(`b · textos con MATERIA_Q 0 inspeccionados ${String(deMateria0.length)} ≥ ${String(EXIGE.minimoDeTextosDeN0)}`, deMateria0.length >= EXIGE.minimoDeTextosDeN0);
  /* Vacuna: la fachada de hoy con la materia puesta pero sin cablear (sus fbmQ de siempre, en N0). */
  const fachadaDeHoyN0 = materialDeHoy('fachada', 0);
  parchear(fachadaDeHoyN0, retoqueDeLaMateria(0));
  const mDeHoyN0 = medir(preprocesar(compilar(fachadaDeHoyN0, 0).frag), FUNCIONES_DE_LA_MATERIA);
  comprobar('b · vacuna: la fachada de hoy en N0 tiene fbmQ de adorno, y el juez lo ve', juzgarElAdornoDeN0(mDeHoyN0).length > 0, mDeHoyN0);
  /* Y los charcos no cuentan: el asfalto de N0 los llama, y su hash es del plan. */
  comprobar('b · y los charcos (en hash por el plan) no cuentan como adorno', (medidasB.get('asfalto-n0') as Medida).ruidoDeHash === 0);

  /* Las puertas del contador en la FUENTE de materia/** (sin comentarios). */
  const fuentes = lasFuentesDeLaMateria();
  const puertasDeLaFuente = juzgarLaFuenteDelContador(fuentes);
  comprobar('b · materia/**: ni funciones con sampler, ni #define con argumentos o con coste', puertasDeLaFuente.length === 0, puertasDeLaFuente);
  comprobar(`b · ficheros de materia/** mirados ${String(fuentes.length)} ≥ ${String(EXIGE.minimoDeFicherosD)}`, fuentes.length >= EXIGE.minimoDeFicherosD);
  comprobar('b · three trae sus #define con argumentos, saturate entre ellos (si no, la comparación con three no mira)', DE_THREE.macros.has('saturate'), [...DE_THREE.macros]);
  /* Vacunas de la fuente, una por grafía. */
  const enLaFuente = (glsl: string): string[] => juzgarLaFuenteDelContador([{ fichero: 'vacuna', texto: `export const G = /* glsl */ \`\n${glsl}\n\`;` }]);
  for (const [que, glsl] of [
    ['lectura por parámetro', 'float leerQ(sampler2D t, vec2 p) { return textureLod(t, p, 0.0).r; }'],
    ['parámetro «in highp»', 'float leerQ(vec2 p, in highp sampler2D t) { return 0.0; }'],
    ['parámetro «const in lowp»', 'float leerQ(const in lowp sampler2D t) { return 0.0; }'],
    ['isampler / samplerCube', 'float leerQ(isampler2D t, samplerCube c) { return 0.0; }'],
    ['parámetro en otra línea', 'float leerQ(vec2 p,\n    sampler2D t) { return 0.0; }'],
    ['sólo declarada', 'float leerQ(sampler2D t);'],
    ['un sampler en un struct', 'struct LectorQ { sampler2D t; };'],
    ['#define con argumentos', '#define MEZCLAQ(a, b) mix(a, b, 0.5)'],
    ['#define con argumentos, almohadilla suelta', '  #  define MEZCLAQ(a) (a)'],
    ['#define que lee', '#define LEERQ textureLod(uRuidoQ, vec2(0.0), 0.0)'],
    ['#define que deriva, partido con \\', '#define DERQ \\\n  dFdx(vPosMundoQ)'],
    ['#define con fwidth', '#define ANCHOQ fwidth'],
    ['#define con texelFetch', '#define TEXELQ texelFetch'],
    ['#define que pega fichas', '#define PEGAQ a ## b'],
  ] as const) {
    comprobar(`b · vacuna de la fuente: ${que}`, enLaFuente(glsl).length > 0, enLaFuente(glsl));
  }
  comprobar(
    'b · y un uniform sampler, una macro de número y un comentario que cita la regla no son puertas',
    enLaFuente('uniform sampler2D uRuidoQ;\n#define OCTAVAS_Q 4\n/* nada de f(sampler2D t) ni #define X(a) */\nfloat f() { return 1.0; }').length === 0,
    enLaFuente('uniform sampler2D uRuidoQ;\n#define OCTAVAS_Q 4\n/* nada de f(sampler2D t) ni #define X(a) */\nfloat f() { return 1.0; }'),
  );
  /* Vacunas del texto MONTADO: el material de verdad con una puerta abierta, por cada grafía. */
  const conPuerta = (texto: string): string[] => {
    const m = materialConMateria('fachada', 1).material;
    parchear(m, { nombre: `vacuna-puerta-${sha256(texto).slice(0, 8)}`, orden: 50, fragmento: [{ buscar: '#include <lights_pars_begin>', como: 'antes', texto }] });
    return medirConMacros(compilar(m, 1).frag).puertas;
  };
  for (const [que, texto] of [
    ['una función que lee por su parámetro', 'float leerQ(sampler2D t, vec2 p) { return textureLod(t, p, 0.0).r; }\nfloat usarQ() { return leerQ(uRuidoQ, vec2(0.0)); }'],
    ['uRuidoQ pasado a una función', 'float usarQ(vec2 p) { return p.x; }\nfloat otraQ() { return usarQ(vec2(textureSize(uRuidoQ, 0))); }'],
    ['un #define con argumentos', '#define MEZCLAQ(a, b) mix(a, b, 0.5)'],
  ] as const) {
    comprobar(`b · vacuna del montado: ${que}`, conPuerta(texto).length > 0, conPuerta(texto));
  }

  /* El tope de cada material, SI EXISTE (§5.2.9): lo exporta la ola 2 al lado de su fábrica. */
  const topes = await losTopesQueExisten(fileURLToPath(new URL('../src/quiebro/ciudad/', import.meta.url)));
  const lecturasDe = (s: SuperficieDePrueba, n: NivelDeLaCiudad): number | undefined => medidasB.get(`${s}-n${String(n)}`)?.todas;
  const yaLaLlevan = new Set(materiales.filter((j) => j.yaLaLlevaba).map((j) => j.nombre.replace(/-n\d$/, '') as SuperficieDePrueba));
  const juicioDeLosTopes = juzgarLosTopes(topes, lecturasDe, yaLaLlevan);
  comprobar('b · los topes de cada material que existen se cumplen, y los que ya llevan la materia lo tienen', juicioDeLosTopes.problemas.length === 0, juicioDeLosTopes.problemas);
  comprobar(
    `b · superficies comparadas con su tope ${String(juicioDeLosTopes.superficies.size)} ≥ ${String(yaLaLlevan.size)} (las que ya llevan la materia)`,
    juicioDeLosTopes.superficies.size >= yaLaLlevan.size,
  );
  nota(
    topes.length === 0
      ? `ningún material exporta todavía TOPE_DEL_SOMBREADOR_POR_NIVEL (0 inspeccionados; mínimo ${String(yaLaLlevan.size)}: ninguna superficie real lleva aún la materia)`
      : `topes: ${topes.map((x) => `${x.fichero} → ${x.superficies.join(', ') || 'ninguna superficie de prueba'}`).join('; ')}; ${String(juicioDeLosTopes.comparadas)} comparaciones`,
  );
  /* Vacunas del juez de los topes (con tablas de mentira sobre lo medido de verdad). */
  const tablaBuena = { 0: { instrucciones: 1, lecturas: 99 }, 1: { instrucciones: 1, lecturas: 99 }, 2: { instrucciones: 1, lecturas: 99 }, 3: { instrucciones: 1, lecturas: 99 } };
  const control = juzgarLosTopes([{ fichero: 'control', superficies: ['fachada'], tabla: tablaBuena }], lecturasDe, new Set(['fachada']));
  comprobar('b · control: un tope holgado pasa y compara los 4 niveles', control.problemas.length === 0 && control.comparadas === 4, control);
  for (const [que, topesDeMentira, llevan] of [
    ['un tope por debajo de lo medido', [{ fichero: 'vacuna', superficies: ['fachada'], tabla: { ...tablaBuena, 3: { instrucciones: 1, lecturas: 0 } } }], new Set<SuperficieDePrueba>()],
    ['un tope sin lecturas (sólo instrucciones)', [{ fichero: 'vacuna', superficies: ['fachada'], tabla: { 0: 461, 1: 1000, 2: 1500, 3: 2000 } }], new Set<SuperficieDePrueba>()],
    ['un material que ya lleva la materia sin tope', [], new Set<SuperficieDePrueba>(['mobiliario'])],
  ] as const) {
    comprobar(`b · vacuna de los topes: ${que}`, juzgarLosTopes(topesDeMentira, lecturasDe, llevan).problemas.length > 0);
  }
  /* Que se miran las macros: los materiales de prueba llevan las de three y las de sus retoques. */
  comprobar(`b · macros activas miradas ${String(macrosMiradas)} ≥ ${String(EXIGE.minimoDeMaterialesB * 5)}`, macrosMiradas >= EXIGE.minimoDeMaterialesB * 5);
  nota(`${String(macrosMiradas)} macros activas miradas en los ${String(inspeccionadosB)} textos, ninguna con coste de materia`);
  /* Vacunas de la macro: una lectura por macro con argumentos, y una derivada por macro sin ellos. */
  for (const [que, texto] of [
    ['una lectura por macro', '#define LEERQ(c) textureLod(uRuidoQ, c, 0.0)\nuniform sampler2D uRuidoQ;\nvoid main() { float x = LEERQ(vec2(0.0)).r; }'],
    ['fbmT por macro', '#define MANCHAQ fbmT(vPosMundoQ.xz, 0.0)\nvoid main() { float x = MANCHAQ; }'],
    ['un PCG por macro', '#define HQ(x) pcgQ(x)\nvoid main() { uint h = HQ(1u); }'],
  ] as const) {
    const r = medirConMacros(texto);
    comprobar(`b · vacuna: ${que}`, juzgarElCoste(r.m, 3, r.macros).length > 0, r);
  }
  const macroInocente = medirConMacros('#define MATERIA_UV_Q vUvMoQ\n#define OCTAVAS_Q 4\nvoid main() { }');
  comprobar('b · y una macro que sólo nombra una UV o un número no es coste', macroInocente.macros.length === 0, macroInocente.macros);
  /* Que el contador cuenta: la fachada de N3 lee (si no, el juez mide cero y todo es verde). */
  const fachadaN3 = medir(preprocesar(compilar(materialConMateria('fachada', 3).material, 3).frag), FUNCIONES_DE_LA_MATERIA);
  comprobar('b · el contador ve lecturas en la fachada de N3', fachadaN3.lecturas > 0 && fachadaN3.pcg > 0, fachadaN3);
  /* Vacuna: OCTAVAS_Q 4 en N0. */
  const octavas = materialConMateria('fachada', 0).material;
  cambiarLaMateria(octavas, (r) => ({ ...r, nombre: `${r.nombre}-vacuna-octavas`, defines: { ...(r.defines ?? {}), OCTAVAS_Q: '4' } }));
  const mOctavas = medir(preprocesar(compilar(octavas, 0).frag), FUNCIONES_DE_LA_MATERIA);
  comprobar('b · vacuna: OCTAVAS_Q 4 en N0 se pasa del tope', juzgarElCoste(mOctavas, 0, []).length > 0, mOctavas);
  /* Vacuna: un bucle que lee. */
  const conBucle = medir(
    'uniform sampler2D uRuidoQ;\nfloat f(vec2 p) { float s = 0.0; for (int i = 0; i < 4; i++) { s += textureLod(uRuidoQ, p, 0.0).r; } return s; }\nvoid main() { float x = f(vec2(0.0)); }',
    new Set(['f']),
  );
  comprobar('b · vacuna: un bucle que lee se ve', conBucle.bucles.length > 0, conBucle);
  /* El preprocesador: una rama #if que no se toma no cuenta. */
  const pre = preprocesar('#define A 2\n#if A >= 3 && defined(B)\nno\n#elif !defined(B) && (A + 1) == 3\nsi\n#else\nno\n#endif');
  comprobar('b · el preprocesador evalúa bien', pre.trim() === 'si', pre);

  /* ─── c ─── */
  paso('c · la textura de ruido');
  const tiempos: number[] = [];
  let datos = generarElRuido();
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    datos = generarElRuido();
    tiempos.push(performance.now() - t0);
  }
  const otra = generarElRuido();
  const juzgarElRuido = (d: Uint8Array, varianza: ArrayLike<number>): string[] => {
    const p: string[] = [];
    if (d.length !== EXIGE.ladoDelRuido * EXIGE.ladoDelRuido * 4) p.push(`${String(d.length)} bytes`);
    if (sha256(d) !== EXIGE.shaDelRuido) p.push(`sha ${sha256(d).slice(0, 16)}…`);
    for (let k = 0; k < 4; k++) {
      let s = 0;
      for (let i = k; i < d.length; i += 4) s += d[i] as number;
      const media = s / (d.length / 4);
      if (Math.abs(media - EXIGE.mediaPorCanal) > EXIGE.holguraDeLaMedia) p.push(`canal ${String(k)}: media ${media.toFixed(2)}`);
    }
    for (let i = 1; i < varianza.length; i++) if (!((varianza[i] as number) > (varianza[i - 1] as number))) p.push(`varianza no crece en el mip ${String(i)}`);
    if (varianza.length !== 8) p.push(`${String(varianza.length)} mips tabuladas`);
    return p;
  };
  comprobar('c · la textura: 128², sha, medias y varianza por mip', juzgarElRuido(datos.datos, datos.varianza).length === 0, juzgarElRuido(datos.datos, datos.varianza));
  comprobar('c · dos generaciones, los mismos bytes', sha256(otra.datos) === sha256(datos.datos));
  comprobar('c · el sha que declara el producto es el del plan', SHA_DEL_RUIDO === EXIGE.shaDelRuido);
  comprobar(`c · generación ${Math.min(...tiempos).toFixed(1)} ms ≤ ${String(EXIGE.msDeGeneracion)} (mínimo de 3)`, Math.min(...tiempos) <= EXIGE.msDeGeneracion, tiempos);
  comprobar('c · 87.380 bytes con las mips', bytesDelRuido() === EXIGE.bytesDelRuido, bytesDelRuido());
  const t = texturaDeRuido();
  const img = t.image as { width: number; height: number; data: Uint8Array };
  comprobar(
    'c · la DataTexture: 128², repetida, trilineal con mips, dato (sin sRGB) y marcada',
    img.width === 128 &&
      img.height === 128 &&
      sha256(img.data) === EXIGE.shaDelRuido &&
      t.wrapS === THREE.RepeatWrapping &&
      t.wrapT === THREE.RepeatWrapping &&
      t.minFilter === THREE.LinearMipmapLinearFilter &&
      t.generateMipmaps &&
      t.colorSpace === THREE.NoColorSpace &&
      t.userData.materiaQ === MARCA_DE_LA_MATERIA &&
      UNIFORMES_DE_LA_MATERIA.uRuidoQ.value === t,
  );
  nota(`medias por canal y varianza por mip: ${Array.from(datos.varianza, (v) => v.toFixed(4)).join(' ')}; ${tiempos.map((x) => x.toFixed(1)).join(' / ')} ms`);
  const envenenada = datos.datos.slice();
  envenenada[4001] = ((envenenada[4001] as number) + 1) & 255;
  comprobar('c · vacuna: un byte cambiado, el juez lo ve', juzgarElRuido(envenenada, datos.varianza).length > 0);
  comprobar('c · vacuna: una varianza que no crece, el juez lo ve', juzgarElRuido(datos.datos, [0, 2, 1, 3, 4, 5, 6, 7]).length > 0);

  /* ─── d ─── */
  paso('d · derivadas sólo en el preámbulo, y el preámbulo sin ramas');
  const d = juzgarLasDerivadas(fuentes);
  comprobar('d · ninguna derivada fuera del preámbulo ni ramas en él', d.problemas.length === 0, d.problemas);
  comprobar(`d · ficheros ${String(fuentes.length)} ≥ ${String(EXIGE.minimoDeFicherosD)}`, fuentes.length >= EXIGE.minimoDeFicherosD);
  comprobar('d · el preámbulo está, una vez, y deriva', d.preambulos === 1 && d.enElPreambulo >= EXIGE.minimoDeDerivadasEnElPreambulo, d);
  /* Vacunas: el prototipo (deriva en una función que se llamaba dentro del if de la familia), otras grafías, y un preámbulo con rama. */
  const prototipo = 'vec3 normalPorDerivadasQ(vec3 N, vec3 P, float h, float amp) {\n  vec3 dpx = dFdx(P);\n  vec3 dpy = dFdy(P);\n  float dhx = dFdx(h) * amp;\n  return N;\n}';
  comprobar('d · vacuna: el prototipo', juzgarLasDerivadas([{ fichero: 'prototipo', texto: `export const G = \`${prototipo}\`;` }]).problemas.length > 0);
  for (const grafia of ['fwidth(p)', 'dFdy (p)', 'dFdxFine(p)', 'texture(uRuidoQ, p)', 'texture2D (uRuidoQ, p)', 'textureOffset(uRuidoQ, p, ivec2(1))']) {
    comprobar(`d · vacuna: «${grafia}»`, juzgarLasDerivadas([{ fichero: 'vacuna', texto: `const G = \`float f() { return ${grafia}.x; }\`;` }]).problemas.length > 0);
  }
  comprobar(
    'd · vacuna: un preámbulo con rama',
    juzgarLasDerivadas([{ fichero: 'vacuna', texto: 'export const GLSL_PREAMBULO_DE_LA_MATERIA = /* glsl */ `{ if (pxMundoQ > 0.0) { dPdxQ = dFdx(vPosMundoQ); } }`;' }]).problemas.length > 0,
  );
  comprobar('d · y un comentario que cita dFdx no es una derivada', juzgarLasDerivadas([{ fichero: 'vacuna', texto: 'const G = `/* nada de dFdx(x) aquí */ float f() { return 1.0; }`;' }]).problemas.length === 0);
  /* Vacunas de la macro en la fuente: una derivada sin paréntesis, una lectura con argumentos, pegar fichas. */
  for (const macro of ['#define DERQ dFdx', '#define LEERQ(c) textureLod(uRuidoQ, c, 0.0)', '#define PEGAQ(a, b) a ## b', '  #  define ANCHOQ fwidth']) {
    comprobar(
      `d · vacuna: «${macro.trim()}»`,
      juzgarLasDerivadas([{ fichero: 'vacuna', texto: `const G = \`\n${macro}\nfloat f(float h) { if (h > 0.0) return 1.0; return 0.0; }\`;` }]).problemas.length > 0,
    );
  }
  comprobar(
    'd · y una macro que nombra una UV no es una derivada',
    juzgarLasDerivadas([{ fichero: 'vacuna', texto: 'const G = `\n#define MATERIA_UV_Q vUvMoQ\nfloat f() { return 1.0; }`;' }]).problemas.length === 0,
  );

  /* El orden, sobre el texto MONTADO: nada que descarte o ramifique en main antes del preámbulo. */
  const montados: { nombre: string; material: THREE.MeshStandardMaterial; nivel: NivelDeLaCiudad; fundido?: RegExp }[] = materiales.map((j) => ({
    nombre: j.nombre,
    material: j.material,
    nivel: j.nivel,
  }));
  /*
   * LA VENTANA, MONTADA COMO LA MONTA `abierta.ts` (los materiales del barrio y, con `detalle.fundido`,
   * que es N1-N3, `parchear(fachadas, RETOQUE_DEL_FUNDIDO)` y lo mismo al mobiliario), con la materia
   * como la lleve el material (hoy, cableada a mano; en la ola 2, la de verdad). Y lo lejano real con su
   * fundido (`materialDeLoLejano(n, true)`, que descarta con la trama opuesta) y `materia-lejos`. Los
   * dos fundidos son orden 5 y ponen su `if (…) discard;` DESPUÉS de `#include <clipping_planes_fragment>`.
   */
  const DESCARTE_DEL_DETALLE = /if\s*\(\s*tramaQ\s*\(\s*gl_FragCoord\.xy\s*\)\s*<\s*fundidoQ\s*\(/;
  const DESCARTE_DE_LO_LEJANO = /if\s*\(\s*tramaQ\s*\(\s*gl_FragCoord\.xy\s*\)\s*>=\s*fundidoQ\s*\(/;
  for (const n of [1, 2, 3] as const) {
    for (const s of ['fachada', 'mobiliario'] as const) {
      const m = materialConMateria(s, n).material;
      parchear(m, RETOQUE_DEL_FUNDIDO);
      montados.push({ nombre: `ventana-${s}-n${String(n)}+fundido`, material: m, nivel: n, fundido: DESCARTE_DEL_DETALLE });
    }
    const lejano = materialDeLoLejano(n, true);
    parchear(lejano, retoqueDeLaMateria(n, { lejos: true }));
    montados.push({ nombre: `lejos-real-n${String(n)}+fundido`, material: lejano, nivel: n, fundido: DESCARTE_DE_LO_LEJANO });
  }
  let conDescarte = 0;
  let conFundido = 0;
  for (const x of montados) {
    const frag = compilar(x.material, x.nivel).frag;
    const activo = soloCodigo(preprocesar(frag));
    if (/\bdiscard\b/.test(activo)) conDescarte++;
    const p = juzgarElOrdenDelPreambulo(frag);
    if (x.fundido !== undefined) {
      /* El fundido tiene que estar de verdad, y DETRÁS del preámbulo (si no, el orden no se pone a prueba). */
      const fundido = x.fundido.exec(activo);
      const preambulo = activo.indexOf('dPdxQ = dFdx(');
      if (fundido === null) p.push('el fundido no está en el texto montado');
      else if (preambulo < 0 || fundido.index < preambulo) p.push('el descarte del fundido va delante del preámbulo');
      else conFundido++;
    }
    comprobar(`d · ${x.nombre}: el preámbulo, lo primero de main`, p.length === 0, p);
  }
  comprobar(`d · montados ${String(montados.length)} ≥ ${String(EXIGE.minimoDeMontadosD)}`, montados.length >= EXIGE.minimoDeMontadosD);
  /* Que entre ellos hay de verdad materiales que descartan con el fundido (si no, el orden no se estaría poniendo a prueba). */
  comprobar(`d · montados con el fundido, detrás del preámbulo, ${String(conFundido)} ≥ 9`, conFundido >= 9);
  nota(
    `${String(fuentes.length)} ficheros de materia/**; ${String(montados.length)} textos montados (${String(conDescarte)} con discard, ${String(conFundido)} con el fundido de la ventana o de lo lejano detrás del preámbulo)`,
  );
  /* Vacuna: el ancla de antes (el preámbulo DESPUÉS del recorte) con el fundido: el discard queda delante. */
  const vacunaDelOrden = materialDeFachada(1);
  const materiaDespues = retoqueDeLaMateria(1);
  parchear(vacunaDelOrden, RETOQUE_DEL_FUNDIDO, {
    ...materiaDespues,
    nombre: `${materiaDespues.nombre}-vacuna-despues`,
    fragmento: (materiaDespues.fragmento ?? []).map((s) => (s.buscar === ANCLA_DEL_PREAMBULO ? { ...s, como: 'despues' as const } : s)),
  });
  comprobar('d · vacuna: el preámbulo detrás del discard del fundido', juzgarElOrdenDelPreambulo(compilar(vacunaDelOrden, 1).frag).length > 0);

  /* ─── e ─── */
  paso('e · el nombre del retoque lleva el nivel');
  const retoques: RetoqueConNombre[] = [...NIVELES.map((n) => ({ nivel: n, retoque: retoqueDeLaMateria(n) })), { nivel: 'lejos' as const, retoque: retoqueDeLaMateria(3, { lejos: true }) }];
  comprobar('e · nombres con su nivel, y textos distintos con nombres distintos', juzgarLosNombres(retoques).length === 0, juzgarLosNombres(retoques));
  const nombres = new Set(retoques.map((r) => r.retoque.nombre));
  comprobar('e · cinco nombres distintos (N0-N3 y lejos)', nombres.size === 5, [...nombres]);
  comprobar('e · el mismo nombre, el mismo objeto', retoqueDeLaMateria(2) === retoqueDeLaMateria(2) && nombreDeLaMateria(2) === 'materia-n2');
  comprobar(
    'e · MATERIA_Q y OCTAVAS_Q por nivel, y 0 en lo lejano',
    NIVELES.every((n) => retoqueDeLaMateria(n).defines?.MATERIA_Q === String(n) && retoqueDeLaMateria(n).defines?.OCTAVAS_Q === String(OCTAVAS_POR_NIVEL[n]) && OCTAVAS_POR_NIVEL[n] === n + 1) &&
      retoqueDeLaMateria(3, { lejos: true }).defines?.MATERIA_Q === '0',
  );
  const r1 = retoqueDeLaMateria(1);
  const vacunaE: RetoqueConNombre[] = [
    { nivel: 1, retoque: r1 },
    { nivel: 2, retoque: { ...retoqueDeLaMateria(2), nombre: r1.nombre } },
  ];
  comprobar('e · vacuna: dos niveles con el mismo nombre', juzgarLosNombres(vacunaE).length > 0);

  /* ─── f ─── */
  paso('f · los charcos y el cielo reflejado, intactos');
  const juzgarLosIntocables = (charcos: string, cielo: string): string[] => {
    const p: string[] = [];
    if (sha256(charcos) !== EXIGE.shaDeLosCharcos) p.push(`GLSL_CHARCOS ${sha256(charcos).slice(0, 16)}…`);
    if (sha256(cielo) !== EXIGE.shaDelCieloReflejado) p.push(`GLSL_CIELO_REFLEJADO ${sha256(cielo).slice(0, 16)}…`);
    return p;
  };
  comprobar('f · el sha de d4402d0', juzgarLosIntocables(GLSL_CHARCOS, GLSL_CIELO_REFLEJADO).length === 0, juzgarLosIntocables(GLSL_CHARCOS, GLSL_CIELO_REFLEJADO));
  comprobar('f · vacuna: un espacio de más', juzgarLosIntocables(`${GLSL_CHARCOS} `, GLSL_CIELO_REFLEJADO).length > 0);
  comprobar('f · la materia no llama a los charcos', !/\bcharco(Q|DeLaAceraQ)\s*\(/.test(soloCodigo(`${GLSL_DE_LA_MATERIA}${GLSL_DE_LAS_FAMILIAS}`)));

  /* ─── el empaquetado del acabado (la regla doble de familias.ts, ida y vuelta en JS) ─── */
  paso('el acabado: ida y vuelta del empaquetado, en coma flotante de 32 bits');
  let vueltas = 0;
  const malas: string[] = [];
  for (const familia of Object.values(FAMILIA) as NumeroDeFamilia[]) {
    for (const rug of [0, 0.02, 0.2, 0.45, 0.85, 0.999, 1]) {
      for (const metal of [0, 0.12, 0.7, 1]) {
        for (const chaflan of [false, true]) {
          for (const barniz of [false, true]) {
            const [x, y] = acabado(familia, rug, metal, { chaflan, barniz });
            const f32 = new Float32Array([x, y]);
            const d2 = desempaquetarAcabado(f32[0] as number, f32[1] as number);
            vueltas++;
            if (d2.familia !== familia || d2.chaflan !== chaflan || d2.barniz !== barniz || Math.abs(d2.rugosidad - Math.min(rug, 0.999)) > 1e-5 || Math.abs(d2.metal - Math.min(metal, 0.999)) > 1e-5) {
              malas.push(`${String(familia)}/${String(rug)}/${String(metal)}/${String(chaflan)}/${String(barniz)}`);
            }
          }
        }
      }
    }
  }
  comprobar(`acabado · ${String(vueltas)} vueltas sin pérdida`, malas.length === 0 && vueltas >= 900, malas.slice(0, 10));
  comprobar('acabado · la familia 0 deja la rugosidad y el metal de hoy', acabado(FAMILIA.liso, 0.45, 0.7)[0] === 0.45 && acabado(FAMILIA.liso, 0.45, 0.7)[1] === 0.7);

  /* ─── g ─── */
  paso('g · con barniz 0 el lóbulo no cambia el color (en la GPU, con el banco)');
  /*
   * SIN GPU: las seis pinturas del banco (A, B, C, A0, B0, V0) son seis textos distintos donde tienen que
   * serlo, por el camino de hoy (el mobiliario cableado a mano) y por el de la OLA 2 (un mobiliario que
   * YA lleva la materia, al que el banco le sustituye su retoque). Si el banco devolviera tal cual el
   * material que ya la lleva, pintaría seis veces lo mismo y (g) se pondría en rojo sin nada roto.
   */
  const OPCIONES_DEL_BANCO: readonly (readonly [string, OpcionesDePrueba])[] = [
    ['A', { barnizForzado: 0 }],
    ['B', { barnizForzado: 0, sinBarniz: true }],
    ['C', { barnizForzado: 1 }],
    ['A0', {}],
    ['B0', { sinBarniz: true }],
    ['V0', { familiaConBarnizDeVacuna: true }],
  ];
  type Camino = (n: NivelDeLaCiudad, o: OpcionesDePrueba) => MaterialDePrueba;
  const caminoDeHoy: Camino = (n, o) => materialConMateria('mobiliario', n, o);
  /** La ola 2, simulada: el material ya lleva la materia (la del cableado a mano) y se le aplican las opciones. */
  const caminoDeLaOla2 =
    (aplicar: (m: THREE.MeshStandardMaterial, o: OpcionesDePrueba) => MaterialDePrueba): Camino =>
    (n, o) =>
      aplicar(materialConMateria('mobiliario', n).material, o);
  const shasDe = (camino: Camino, n: NivelDeLaCiudad): { shas: Map<string, string>; faltan: string[]; todosLaLlevaban: boolean } => {
    const shas = new Map<string, string>();
    const faltan: string[] = [];
    let todosLaLlevaban = true;
    for (const [k, o] of OPCIONES_DEL_BANCO) {
      const h = camino(n, o);
      faltan.push(...h.faltan);
      todosLaLlevaban &&= h.yaLaLlevaba;
      shas.set(k, sha256(soloCodigo(preprocesar(compilar(h.material, n).frag))));
    }
    return { shas, faltan, todosLaLlevaban };
  };
  const juzgarLasOpciones = (camino: Camino, referencia?: Camino): string[] => {
    const p: string[] = [];
    for (const n of [1, 2, 3] as const) {
      const { shas, faltan } = shasDe(camino, n);
      for (const f of faltan) p.push(`N${String(n)}: ${f}`);
      for (const [x, y, que] of [
        ['A', 'B', 'quitar el lóbulo'],
        ['A', 'C', 'la vacuna del barniz 1'],
        ['A0', 'B0', 'quitar el lóbulo sin la marca'],
        ['A0', 'V0', 'la vacuna del stub'],
      ] as const) {
        if (shas.get(x) === shas.get(y)) p.push(`N${String(n)}: ${x} y ${y} son el mismo texto (${que} no llega al sombreador)`);
      }
      if (referencia !== undefined) {
        const otra = shasDe(referencia, n).shas;
        for (const [k] of OPCIONES_DEL_BANCO) if (shas.get(k) !== otra.get(k)) p.push(`N${String(n)}: ${k} no es el mismo texto por los dos caminos`);
      }
    }
    return p;
  };
  const deHoy = juzgarLasOpciones(caminoDeHoy);
  comprobar('g · sin GPU: las opciones del banco llegan al texto (camino de hoy, N1-N3)', deHoy.length === 0, deHoy);
  const deLaOla2 = juzgarLasOpciones(caminoDeLaOla2(conLasOpcionesDelBanco), caminoDeHoy);
  comprobar('g · sin GPU: y con un mobiliario que YA lleva la materia (la ola 2), el mismo texto', deLaOla2.length === 0, deLaOla2);
  comprobar('g · sin GPU: ese camino es de verdad el de «ya la llevaba»', [1, 2, 3].every((n) => shasDe(caminoDeLaOla2(conLasOpcionesDelBanco), n as NivelDeLaCiudad).todosLaLlevaban));
  /* La vacuna: el banco de antes, que devolvía tal cual el material que ya llevaba la materia. */
  const bancoDeAntes = juzgarLasOpciones(caminoDeLaOla2((m) => ({ material: m, faltan: [], yaLaLlevaba: true })));
  comprobar('g · vacuna: el banco que devuelve tal cual el material que ya la lleva se ve', bancoDeAntes.length > 0, bancoDeAntes);
  /* El juez sobre bancos de mentira: uno bueno (tiene que pasar) y, cada vez, un solo veneno. */
  const bancoBueno = (cambio: (m: MedidaDelBarniz) => Partial<MedidaDelBarniz> = () => ({}), resto: Partial<ResultadoDelBanco> = {}): ResultadoDelBanco => ({
    modo: 'barniz',
    medidas: [0, 1, 2, 3].map((nivel) => {
      const m: MedidaDelBarniz = { nivel, pixelesDelCoche: 5000, maxAB: 0, cambianConLaVacuna: nivel === 0 ? 0 : 900, maxSinMarca: 0, cambianConElStubRoto: nivel === 0 ? 0 : 900 };
      return { ...m, ...cambio(m) };
    }),
    compiladas: Array.from({ length: 20 }, String),
    sinEnlazar: [],
    vacunaDelEnlace: { errores: 1, enlaza: false },
    errores: [],
    faltan: [],
    fallosDelParcheo: [],
    errorDeGl: 0,
    ...resto,
  });
  comprobar('g · control: un banco bueno pasa el juez', juzgarElBarniz(bancoBueno()).length === 0, juzgarElBarniz(bancoBueno()));
  const venenosDelBanco: readonly (readonly [string, ResultadoDelBanco])[] = [
    ['un banco que dice que el lóbulo cambia el color', bancoBueno((m) => (m.nivel === 2 ? { maxAB: 0.01 } : {}))],
    ['un banco cuya vacuna no cambia nada', bancoBueno(() => ({ cambianConLaVacuna: 0 }))],
    ['un stub con barniz (sin la marca, el lóbulo cambia el color)', bancoBueno((m) => (m.nivel >= 1 ? { maxSinMarca: 0.2 } : {}))],
    ['un banco cuya vacuna del stub no cambia nada', bancoBueno(() => ({ cambianConElStubRoto: 0 }))],
    ['una superficie que no enlaza', bancoBueno(undefined, { compiladas: Array.from({ length: 19 }, String), sinEnlazar: ['fachada-n2'] })],
    ['un banco que cuenta vueltas y no mira el enlace (la vacuna del GLSL roto no da error)', bancoBueno(undefined, { vacunaDelEnlace: { errores: 0, enlaza: true } })],
    ['un banco sin la vacuna del enlace', bancoBueno(undefined, { vacunaDelEnlace: undefined })],
  ];
  for (const [que, banco] of venenosDelBanco) comprobar(`g · vacuna: ${que}`, juzgarElBarniz(banco).length > 0);
  const puerto = process.env.PUERTO;
  if (puerto === undefined || puerto === '') {
    saltados.push('g · sin PUERTO: no se ha mirado en la GPU (PUERTO=<el Vite de este árbol>)');
  } else {
    const r = await elBanco(puerto);
    if (typeof r === 'string') saltados.push(`g · ${r}`);
    else {
      const p = juzgarElBarniz(r);
      comprobar('g · el banco: A = B con barniz 0, la vacuna se ve, y todo enlaza', p.length === 0, p);
      for (const m of r.medidas ?? []) {
        nota(
          `N${String(m.nivel)}: ${String(m.pixelesDelCoche)} px de coche, máx |A−B| ${String(m.maxAB)}, ${String(m.cambianConLaVacuna)} px cambian con barniz 1; sin la marca máx |A0−B0| ${String(m.maxSinMarca)}, ${String(m.cambianConElStubRoto)} px cambian con el stub roto`,
        );
      }
      nota(`${String((r.compiladas ?? []).length)} superficies pintadas y ENLAZADAS en la GPU (sin enlazar: ${(r.sinEnlazar ?? []).join(', ') || 'ninguna'}); ${String(r.programas)} programas`);
      nota(`vacuna del enlace: ${String(r.vacunaDelEnlace?.errores)} error(es), enlaza=${String(r.vacunaDelEnlace?.enlaza)} · ${r.vacunaDelEnlace?.primero ?? ''}`);
    }
  }

  /* ─── fin ─── */
  if (fallos.length > 0) {
    console.log(`\n${String(fallos.length)} de ${String(hechas)} comprobaciones han fallado:\n`);
    for (const f of fallos) console.log(`  ✗ ${f}`);
  }
  if (saltados.length > 0) {
    console.error(`\nSE HA SALTADO UN BLOQUE (no es verde):`);
    for (const s of saltados) console.error(`  · ${s}`);
  }
  if (fallos.length > 0) process.exit(1);
  if (saltados.length > 0) process.exit(2);
  console.log(`\n✔ ${String(hechas)} comprobaciones. La materia está atada, cabe, no deriva en ramas y no toca los charcos.`);
  process.exit(0);
}

void principal();
