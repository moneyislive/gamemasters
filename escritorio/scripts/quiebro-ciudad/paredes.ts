/**
 * LAS COMPROBACIONES DE LAS PAREDES en `verify:quiebro-ciudad` (plan del detalle, §5.2.8). Dueño: O2-PAREDES.
 *
 *   a. LAS CAPAS POR NIVEL: el texto ACTIVO de la fachada (el texto final con los `#if` resueltos) es distinto en
 *      N0, N1, N2 y N3, dos a dos, y cada capa nueva está en su `#if NIVEL_Q`: su marca sale en el texto activo del
 *      nivel en que entra y en los de arriba, y no en los de abajo (`CAPAS_DE_LA_FACHADA`). Vacuna: `NIVEL_Q` fijo a 1.
 *   b. LO LEJANO: el material de lo lejano (con fundido y sin él) lleva la materia de lo lejano (`materia-lejos`,
 *      `MATERIA_Q 0`) y `NIVEL_Q` ≤ 1; la fachada de la ventana, la de su nivel. Vacuna: la fachada de N2 y N3
 *      tomada por lo lejano.
 *   c. LA PARIDAD sigue en verde sobre el texto MONTADO de verdad (con los tramos ajenos ya pasados a la materia):
 *      `paridadDeLasGemelas` de `comun.ts`. Vacuna: un umbral cambiado.
 *   d. LA GRAFÍA ES LO ÚLTIMO en la fachada y en lo lejano de N0-N3, y el relieve y la luz con dirección se apagan
 *      bajo ella: en el texto activo del envejecido, TODA escritura de `nLocal` y de `pendienteDeLaJuntaQ` pasa por
 *      `sinGrafia` (se cuentan todas, no se busca una línea). Vacunas: sin el apagado; el zócalo (un segundo camino)
 *      sin el apagado; una escritura del color detrás de la marca.
 *   e. LA IDA Y VUELTA DEL EMPAQUETADO de `aPlanta.y` (`bajo + 4·patrón + 32·edad`) y de `aVolumen.z` (subestilo + 4·cima +
 *      tinte): en JS, con todos los bajos, patrones y edades y con los muros de verdad de una traza (en coma
 *      flotante de 32 bits, como llegan a la GPU); y en el GLSL, EVALUANDO el texto de `desempaquetarLaPlantaQ` y
 *      la lectura del bajo del prefacio tal como salen en el texto montado. Vacuna: la lectura de antes,
 *      `int(vPlantaQ.y + 0.5)`, sin desempaquetar. (La evaluación en la GPU de verdad la pide PAREDES a quien tenga
 *      el banco de `verify:quiebro-gl`.)
 *   f. LOS TRAMOS AJENOS, A LA MATERIA: cada sustitución de `fachadas.ts` encontró su texto una vez, y en el texto
 *      ACTIVO de N0 y de lo lejano no queda ni una llamada a `fbmQ` ni a `ruidoQ` fuera de su definición; en la
 *      fachada de N1-N3, sólo las cuatro del bajo que se quedan como estaban (la chapa y las pintadas de la persiana:
 *      `RUIDO_DE_HASH_DEL_BAJO_EN_N1`), una vez cada una. Vacunas: el tramo de las piezas sin sustituir; las pintadas
 *      de hash también en N0.
 *
 * Cada resultado lleva su mínimo de inspeccionados: cero inspeccionados es cero fallos, y se leería como vigilado.
 * Los jueces se exportan: los informes de PAREDES los aplican a copias rotas del árbol para verlos en rojo.
 */
import { readFileSync } from 'node:fs';
import type * as THREE from 'three';
import type { ComprobarElPaquete, ContextoDeLaCiudad, Resultado } from './comun';
import { cuerpoDeLaFuncion, juzgarLaGrafia, paridadDeLasGemelas, soloCodigo } from './comun';
import { RUIDO_DE_HASH_DEL_BAJO_EN_N1, SUSTITUCIONES_DE_LOS_TRAMOS_AJENOS, SUSTITUCIONES_QUE_NO_ENTRARON, materialDeFachada } from '../../src/quiebro/ciudad/fachadas';
import { materialDeLoLejano } from '../../src/quiebro/ciudad/lejos';
import { atributosDelMuro, caraDelVolumen, carasDe, desempaquetarElVolumen, desempaquetarLaPlanta, edadDe, empaquetarLaPlanta, indiceDeVolumenes, subestiloDe, tinteDelMuro } from '../../src/quiebro/ciudad/fachada/caras';
import { patronDeBalcon } from '../../src/quiebro/ciudad/fachada/balcones';
import { volumenMasAlto } from '../../src/quiebro/ciudad/fachada/torres';
import { BAJO, HUECO_DEL_ESTILO } from '../../src/quiebro/ciudad/fachada/tipos-de-cara';
import { GLSL_RUIDO } from '../../src/quiebro/ciudad/glsl';
import { LARGO_DE_UNA_TIENDA, NUMERO_DEL_ESTILO } from '../../src/quiebro/ciudad/hash';
import type { EdificioDelPlano, EstiloDeFachada, NivelDeLaCiudad, Volumen } from '../../src/quiebro/ciudad/tipos';
import { NIVELES_DE_LA_CIUDAD } from '../../src/quiebro/ciudad/tipos';

/* ═══════════════════════════════ UN PREPROCESADOR MÍNIMO ═══════════════════════════════ */

/** Un texto que el preprocesador de aquí no sabe leer. No se adivina: se dice (y la comprobación sale roja). */
export class DirectivaQueNoSeLee extends Error {}

type Macros = Map<string, string | null>;

const PRECEDENCIA: Readonly<Record<string, number>> = { '||': 1, '&&': 2, '==': 3, '!=': 3, '<': 4, '>': 4, '<=': 4, '>=': 4, '+': 5, '-': 5, '*': 6, '/': 6, '%': 6 };

/** Evalúa la expresión de un `#if` o `#elif`: `defined`, macros de objeto, enteros y los operadores de C. */
function evaluar(expresion: string, macros: Macros): boolean {
  let e = expresion.replace(/\bdefined\s*\(\s*(\w+)\s*\)|\bdefined\s+(\w+)/g, (_m, a?: string, b?: string) => (macros.has((a ?? b) as string) ? ' 1 ' : ' 0 '));
  for (let vuelta = 0; vuelta < 12; vuelta++) {
    const antes = e;
    e = e.replace(/\b[A-Za-z_]\w*\b/g, (id) => {
      const cuerpo = macros.get(id);
      if (cuerpo === undefined) return ' 0 ';
      if (cuerpo === null) throw new DirectivaQueNoSeLee(`una macro con argumentos en un #if: ${expresion}`);
      return ` ${cuerpo === '' ? '1' : cuerpo} `;
    });
    if (e === antes) break;
  }
  const fichas = e.match(/\d+\.\d+|\d+|&&|\|\||==|!=|<=|>=|[-+*/%()<>!]/g) ?? [];
  if (fichas.join('') !== e.replace(/\s+/g, '')) throw new DirectivaQueNoSeLee(`no sé leer «${expresion}»`);
  let i = 0;
  const tomar = (): string => {
    const f = fichas[i++];
    if (f === undefined) throw new DirectivaQueNoSeLee(`se acaba «${expresion}»`);
    return f;
  };
  const unario = (): number => {
    const f = tomar();
    if (f === '!') return unario() === 0 ? 1 : 0;
    if (f === '-') return -unario();
    if (f === '+') return unario();
    if (f === '(') {
      const v = binario(1);
      if (tomar() !== ')') throw new DirectivaQueNoSeLee(`paréntesis en «${expresion}»`);
      return v;
    }
    const n = Number(f);
    if (!Number.isFinite(n)) throw new DirectivaQueNoSeLee(`«${f}» en «${expresion}»`);
    return n;
  };
  const binario = (minimo: number): number => {
    let izq = unario();
    for (;;) {
      const op = fichas[i];
      const p = op === undefined ? undefined : PRECEDENCIA[op];
      if (op === undefined || p === undefined || p < minimo) break;
      i++;
      const der = binario(p + 1);
      izq =
        op === '||' ? (izq !== 0 || der !== 0 ? 1 : 0)
        : op === '&&' ? (izq !== 0 && der !== 0 ? 1 : 0)
        : op === '==' ? (izq === der ? 1 : 0)
        : op === '!=' ? (izq !== der ? 1 : 0)
        : op === '<' ? (izq < der ? 1 : 0)
        : op === '>' ? (izq > der ? 1 : 0)
        : op === '<=' ? (izq <= der ? 1 : 0)
        : op === '>=' ? (izq >= der ? 1 : 0)
        : op === '+' ? izq + der
        : op === '-' ? izq - der
        : op === '*' ? izq * der
        : op === '/' ? Math.trunc(izq / der)
        : izq % der;
    }
    return izq;
  };
  const v = binario(1);
  if (i !== fichas.length) throw new DirectivaQueNoSeLee(`sobra algo en «${expresion}»`);
  return v !== 0;
}

/**
 * EL TEXTO ACTIVO: el código que sobrevive a los `#if` (sin las directivas, sin los comentarios y sin líneas en
 * blanco). Las macros de objeto se definen al pasar; las que no están definidas valen 0 (como en C). Lo que no sabe
 * leer lanza `DirectivaQueNoSeLee`.
 */
export function textoActivo(texto: string): string {
  const macros: Macros = new Map();
  const pila: { activo: boolean; tomado: boolean; padre: boolean }[] = [];
  const activo = (): boolean => pila.length === 0 || (pila[pila.length - 1] as { activo: boolean }).activo;
  const salida: string[] = [];
  for (const linea of soloCodigo(texto.replace(/\\\r?\n/g, '')).split('\n')) {
    const m = /^\s*#\s*(\w+)\s*(.*)$/.exec(linea);
    if (m === null) {
      if (activo() && linea.trim() !== '') salida.push(linea.trim());
      continue;
    }
    const directiva = m[1] as string;
    const resto = (m[2] as string).trim();
    const cima = pila[pila.length - 1];
    if (directiva === 'if' || directiva === 'ifdef' || directiva === 'ifndef') {
      const padre = activo();
      const v = padre && (directiva === 'if' ? evaluar(resto, macros) : directiva === 'ifdef' ? macros.has(resto) : !macros.has(resto));
      pila.push({ activo: v, tomado: v, padre });
    } else if (directiva === 'elif') {
      if (cima === undefined) throw new DirectivaQueNoSeLee('#elif sin #if');
      const v = cima.padre && !cima.tomado && evaluar(resto, macros);
      cima.activo = v;
      cima.tomado = cima.tomado || v;
    } else if (directiva === 'else') {
      if (cima === undefined) throw new DirectivaQueNoSeLee('#else sin #if');
      cima.activo = cima.padre && !cima.tomado;
      cima.tomado = true;
    } else if (directiva === 'endif') {
      if (pila.pop() === undefined) throw new DirectivaQueNoSeLee('#endif sin #if');
    } else if (directiva === 'define') {
      if (!activo()) continue;
      const d = /^(\w+)(\([^)]*\))?\s*(.*)$/.exec(resto);
      if (d === null) throw new DirectivaQueNoSeLee(`#define ${resto}`);
      macros.set(d[1] as string, d[2] !== undefined ? null : (d[3] as string).trim());
    } else if (directiva === 'undef') {
      if (activo()) macros.delete(resto);
    }
  }
  if (pila.length !== 0) throw new DirectivaQueNoSeLee('un #if sin cerrar');
  return salida.join('\n');
}

/* ═══════════════════════════════ a. LAS CAPAS POR NIVEL ═══════════════════════════════ */

/**
 * LAS CAPAS NUEVAS DE LA FACHADA y en qué niveles entran: una marca (un trozo de CÓDIGO que sólo está en esa capa) y
 * el nivel desde el que sale (y hasta el que sale, si es sólo de uno). Si alguien quita un `#if NIVEL_Q` o lo cambia de
 * nivel, la marca aparece donde no toca o falta donde toca.
 */
export const CAPAS_DE_LA_FACHADA: readonly { readonly que: string; readonly marca: string; readonly desde: NivelDeLaCiudad; readonly hasta?: NivelDeLaCiudad }[] = [
  { que: 'la junta que se lee de lejos', marca: 'juntaLejanaQ(', desde: 0 },
  { que: 'los parches del revoco', marca: 'parcheDelRevocoQ(', desde: 0 },
  { que: 'el relieve de las juntas', marca: 'relieveDeLaFabricaQ(', desde: 1 },
  { que: 'el relieve sólo a menos de 20 m (N1)', marca: 'ALCANCE_DEL_RELIEVE_Q = 20.0', desde: 1, hasta: 1 },
  { que: 'los chorretones bajo el alféizar', marca: 'chorretonDelAlfeizarQ(', desde: 1 },
  { que: 'la luz de la calle con dirección', marca: 'luzConDireccionQ(', desde: 1 },
  { que: 'la luz con dirección sólo a menos de 30 m (N1)', marca: 'smoothstep(24.0, 30.0, dist)', desde: 1, hasta: 1 },
  { que: 'el lavado a franjas', marca: 'franjas = ruidoT(', desde: 1 },
  { que: 'el velo bajo la cornisa', marca: 'velo = (1.0 - smoothstep(0.15, 1.4 + 3.0 * franjas', desde: 1 },
  { que: 'el velo bajo las impostas', marca: 'float bajoLaFaja =', desde: 1 },
  { que: 'los regueros desde la azotea', marca: 'reguero = smoothstep(', desde: 1 },
  { que: 'el moteado fino del revoco', marca: 'moteado = 0.45 * manchaDelMuroQ', desde: 1 },
  { que: 'el óxido bajo los anclajes', marca: 'float oxido =', desde: 1 },
  { que: 'los desconchones del revoco', marca: 'float caido = smoothstep(umbral', desde: 1 },
  { que: 'la banda de antepecho', marca: 'float antepecho =', desde: 1 },
  { que: 'las plantas de oficina', marca: 'hashQ(vec2(planta, 131.0)', desde: 1 },
  { que: 'la corona de las torres', marca: 'hashQ(vec2(7.0, 29.0)', desde: 1 },
  { que: 'el hollín sobre las tiendas', marca: 'float humo =', desde: 1 },
  { que: 'la sombra de contacto bajo el vierteaguas', marca: 'float contacto =', desde: 1 },
  { que: 'el vuelo del dintel', marca: 'float yD =', desde: 1 },
  { que: 'las pintadas de la persiana, las de siempre (hash)', marca: 'fbmQ(qg * 0.45)', desde: 1 },
  { que: 'el desportillado', marca: 'float nMella =', desde: 2 },
  { que: 'la hebra de los regueros', marca: 'reguero *= 0.55 + 0.9 * ruidoT(', desde: 2 },
  { que: 'cada ladrillo de su hornada', marca: 'float haciaElFuego =', desde: 2 },
  { que: 'la sombra de la llaga', marca: 'float mitadDeArriba =', desde: 2 },
  { que: 'el poro', marca: 'float f2 = granoF * 14.0;', desde: 3 },
  { que: 'el relieve hasta 60 m', marca: 'ALCANCE_DEL_RELIEVE_Q = 60.0', desde: 2 },
  { que: 'los montantes del muro cortina', marca: 'float cadaM =', desde: 2 },
  { que: 'la puerta del micro-relieve del horno', marca: 'microRelieveQ(estilo', desde: 2 },
  { que: 'la eflorescencia', marca: 'float sal = hum.y', desde: 2 },
  { que: 'seco bajo la cornisa', marca: 'smoothstep(0.2, 1.0, techo - P.y), cima)', desde: 2 },
  { que: 'las salpicaduras del pie', marca: 'smoothstep(0.52, 0.72, granoDelMuroQ)', desde: 2 },
  { que: 'el paralaje de la llaga', marca: 'vistaEnLaCaraQ.xy /', desde: 3 },
  { que: 'la segunda octava del chorretón', marca: 'q.x * 19.0', desde: 3 },
  { que: 'el ladrillo de cerca del todo', marca: 'float cerca3L =', desde: 3 },
  { que: 'el sillar de cerca del todo', marca: 'float cerca3S =', desde: 3 },
  { que: 'la segunda octava de la eflorescencia', marca: 'q * vec2(9.0, 14.0)', desde: 3 },
  { que: 'el agua que escurre', marca: 'float hilo =', desde: 3 },
  { que: 'el paño ladeado', marca: 'hash2Q(floor(vec2(celda, planta) * 0.5)', desde: 3 },
  { que: 'el brillo de la seudoluz', marca: 'brilloExtraQ = media', desde: 3 },
];

/** EL JUEZ DE LAS CAPAS: los textos ACTIVOS de N0-N3, distintos dos a dos, y cada capa donde toca. */
export function juzgarLasCapas(activos: Readonly<Record<NivelDeLaCiudad, string>>): { readonly problemas: string[]; readonly miradas: number } {
  const problemas: string[] = [];
  let miradas = 0;
  for (const a of NIVELES_DE_LA_CIUDAD) {
    for (const b of NIVELES_DE_LA_CIUDAD) {
      if (b <= a) continue;
      miradas++;
      if (activos[a] === activos[b]) problemas.push(`N${String(a)} y N${String(b)} pintan el mismo texto`);
    }
  }
  for (const c of CAPAS_DE_LA_FACHADA) {
    for (const n of NIVELES_DE_LA_CIUDAD) {
      miradas++;
      const debe = n >= c.desde && n <= (c.hasta ?? 3);
      const esta = activos[n].includes(c.marca);
      if (debe !== esta) problemas.push(`${c.que} (${c.marca}): ${esta ? 'sale' : 'no sale'} en N${String(n)}`);
    }
  }
  return { problemas, miradas };
}

/* ═══════════════════════════════ b. LO LEJANO ═══════════════════════════════ */

/** Los nombres de los retoques de un material parcheado. */
function retoquesDe(m: THREE.Material): readonly string[] {
  return ((m.userData.parcheoDelQuiebro as { retoques: { nombre: string }[] } | undefined)?.retoques ?? []).map((r) => r.nombre);
}

/** El valor de un define en el texto de un material (el primero), o `null`. */
function defineDe(texto: string, nombre: string): string | null {
  return new RegExp(`^\\s*#\\s*define\\s+${nombre}\\s+(\\S+)`, 'm').exec(texto)?.[1] ?? null;
}

/** EL JUEZ DE LO LEJANO: la materia de lo lejano y `NIVEL_Q` ≤ 1. */
export function juzgarLoLejano(material: THREE.Material, texto: string): string[] {
  const problemas: string[] = [];
  const nombres = retoquesDe(material);
  if (!nombres.includes('materia-lejos')) problemas.push(`no lleva materia-lejos (${nombres.join(', ')})`);
  if (nombres.some((n) => /^materia-n\d/.test(n))) problemas.push('lleva la materia de un nivel');
  const nivel = defineDe(texto, 'NIVEL_Q');
  if (nivel === null || !(Number(nivel) <= 1)) problemas.push(`NIVEL_Q ${String(nivel)}`);
  const materia = defineDe(texto, 'MATERIA_Q');
  if (materia !== '0') problemas.push(`MATERIA_Q ${String(materia)}`);
  return problemas;
}

/* ═══════════════════════════════ d. EL RELIEVE BAJO LA GRAFÍA ═══════════════════════════════ */

/** La definición del apagado, tal como sale en el texto activo. */
const DEFINICION_DEL_APAGADO = 'float sinGrafia = 1.0 - step(0.5, uRejillaDeGlifos);';

/**
 * EL JUEZ DEL APAGADO DEL RELIEVE, sobre el texto ACTIVO: en el tramo del envejecido (de la definición de `sinGrafia`
 * a la rejilla de la Grafía) TODA sentencia que escribe `nLocal` o `pendienteDeLaJuntaQ` pasa por `sinGrafia`. No
 * busca una línea concreta: cuenta todas las escrituras (un segundo camino del relieve sin apagar sale rojo).
 */
export function juzgarElApagadoDelRelieve(activo: string): { readonly problemas: string[]; readonly escrituras: number } {
  const desde = activo.indexOf(DEFINICION_DEL_APAGADO);
  const hasta = activo.indexOf('if (uRejillaDeGlifos > 0.001)', desde);
  if (desde < 0 || hasta < 0) return { problemas: ['no está el tramo del envejecido con su sinGrafia'], escrituras: 0 };
  const problemas: string[] = [];
  let escrituras = 0;
  for (const s of activo.slice(desde + DEFINICION_DEL_APAGADO.length, hasta).split(';')) {
    if (!/\b(?:nLocal|pendienteDeLaJuntaQ)(?:\.[xyzw]+)?\s*(?:[-+*/]?=)(?!=)/.test(s)) continue;
    escrituras++;
    if (!/\bsinGrafia\b/.test(s)) problemas.push(`escribe el relieve sin apagarlo bajo la Grafía: «${s.trim().slice(0, 90)}»`);
  }
  if (escrituras === 0) problemas.push('el envejecido no escribe el relieve (¿se ha movido?)');
  return { problemas, escrituras };
}

/* ═══════════════════════════════ e. EL EMPAQUETADO ═══════════════════════════════ */

/**
 * Traduce a JS un trozo de GLSL del subconjunto que usan el desempaquetado y la lectura del bajo: `float`/`int` en
 * declaraciones, `floor`, `int(…)`, `vec3(…)` y las componentes `.x .y .z`. Lo que no sea eso no se ejecuta bien, y
 * la comprobación sale roja: no se adivina.
 */
function aJs(glsl: string): string {
  let t = soloCodigo(glsl)
    .replace(/\b(?:float|int)\s+(\w+)\s*=/g, 'let $1 =')
    .replace(/\bfloor\s*\(/g, 'Math.floor(')
    .replace(/\bint\s*\(/g, 'Math.trunc(')
    .replace(/\.x\b/g, '[0]')
    .replace(/\.y\b/g, '[1]')
    .replace(/\.z\b/g, '[2]');
  for (;;) {
    const i = t.search(/\bvec3\s*\(/);
    if (i < 0) break;
    const abre = t.indexOf('(', i);
    let hondo = 0;
    let cierra = -1;
    for (let k = abre; k < t.length; k++) {
      if (t[k] === '(') hondo++;
      else if (t[k] === ')' && --hondo === 0) {
        cierra = k;
        break;
      }
    }
    if (cierra < 0) throw new Error('un vec3 sin cerrar');
    t = `${t.slice(0, i)}[${t.slice(abre + 1, cierra)}]${t.slice(cierra + 1)}`;
  }
  return t;
}

/** El `desempaquetarLaPlantaQ` del texto montado, ejecutable en JS (`null` si no está). */
export function desempaquetadoDelGlsl(texto: string): ((y: number) => readonly number[]) | null {
  const cuerpo = cuerpoDeLaFuncion(soloCodigo(texto), /vec3\s+desempaquetarLaPlantaQ\s*\(\s*float\s+y\s*\)/);
  if (cuerpo === null) return null;
  return new Function('y', aJs(cuerpo)) as (y: number) => readonly number[];
}

/**
 * La lectura del bajo del prefacio tal como sale en el texto montado (`int bajo = …;`), ejecutable en JS con lo que
 * le llega del vértice (`vPlantaQ`) y lo desempaquetado (`plantaQ`). `null` si no está.
 */
export function lecturaDelBajo(texto: string): ((vPlantaQ: readonly number[], plantaQ: readonly number[]) => number) | null {
  const m = /\bint\s+bajo\s*=\s*([^;]+);/.exec(soloCodigo(texto));
  if (m === null) return null;
  return new Function('vPlantaQ', 'plantaQ', `return ${aJs(m[1] as string)};`) as (v: readonly number[], p: readonly number[]) => number;
}

/** EL JUEZ DEL EMPAQUETADO: con todos los bajos, patrones y edades (y un poco de error de interpolación). */
export function juzgarElEmpaquetado(
  empaquetar: (b: number, p: number, e: number) => number,
  desempaquetarJs: (y: number) => readonly number[],
  desempaquetarGlsl: ((y: number) => readonly number[]) | null,
  leerElBajo: ((v: readonly number[], p: readonly number[]) => number) | null,
): { readonly problemas: string[]; readonly miradas: number } {
  const problemas: string[] = [];
  let miradas = 0;
  if (desempaquetarGlsl === null) problemas.push('no está desempaquetarLaPlantaQ en el texto montado');
  if (leerElBajo === null) problemas.push('no está la lectura del bajo (int bajo = …;) en el texto montado');
  for (let b = 0; b <= 3; b++) {
    for (let p = 0; p <= 7; p++) {
      for (let e = 0; e <= 7; e++) {
        const y = Math.fround(empaquetar(b, p, e));
        for (const ruido of [0, 0.002, -0.002]) {
          miradas++;
          const js = desempaquetarJs(y + ruido);
          if (js[0] !== b || js[1] !== p || js[2] !== e) problemas.push(`JS: (${String(b)}, ${String(p)}, ${String(e)}) vuelve como ${JSON.stringify(js)}`);
          if (desempaquetarGlsl === null || leerElBajo === null) continue;
          const g = desempaquetarGlsl(y + ruido);
          if (g[0] !== b || g[1] !== p || g[2] !== e) problemas.push(`GLSL: (${String(b)}, ${String(p)}, ${String(e)}) vuelve como ${JSON.stringify(g)}`);
          const bajo = leerElBajo([3, y + ruido], g);
          if (bajo !== b) problemas.push(`el prefacio lee el bajo ${String(bajo)} de (${String(b)}, ${String(p)}, ${String(e)})`);
        }
      }
    }
  }
  return { problemas: problemas.slice(0, 8), miradas };
}

/** Los muros de verdad de una celda: sus atributos, en coma flotante de 32 bits, vuelven a su edificio. */
function juzgarLosMurosDeVerdad(edificios: readonly EdificioDelPlano[], vecinos: readonly Volumen[]): { readonly problemas: string[]; readonly miradas: number } {
  const problemas: string[] = [];
  let miradas = 0;
  const cerca = indiceDeVolumenes([...edificios.flatMap((e) => e.volumenes), ...vecinos]);
  for (const e of edificios) {
    e.volumenes.forEach((v, iv) => {
      for (const cara of carasDe(v)) {
        const c = caraDelVolumen(e, iv, cara, cerca);
        const a = atributosDelMuro(e, c, 1);
        miradas++;
        const [bajo, patron, edad] = desempaquetarLaPlanta(Math.fround(a.aPlanta[1]));
        const esperado = c.fachada === undefined ? BAJO.sinCalle : BAJO[c.fachada.bajo];
        if (bajo !== esperado || patron !== patronDeBalcon(e) || edad !== edadDe(e)) {
          problemas.push(`muro: (${String(bajo)}, ${String(patron)}, ${String(edad)}) y no (${String(esperado)}, ${String(patronDeBalcon(e))}, ${String(edadDe(e))})`);
        }
        const [sub, cima, tinte] = desempaquetarElVolumen(Math.fround(a.aVolumen[2]));
        const esLaCima = iv === volumenMasAlto(e) ? 1 : 0;
        if (sub !== subestiloDe(e) || cima !== esLaCima || Math.abs(tinte - tinteDelMuro(e)) > 1e-5) {
          problemas.push(`aVolumen.z ${String(a.aVolumen[2])}: (${String(sub)}, ${String(cima)}, ${tinte.toFixed(4)}) y no (${String(subestiloDe(e))}, ${String(esLaCima)}, ${tinteDelMuro(e).toFixed(4)})`);
        }
      }
    });
  }
  return { problemas: problemas.slice(0, 6), miradas };
}

/* ═══════════════════════════════ f. LOS TRAMOS AJENOS ═══════════════════════════════ */

/** Las llamadas a `fbmQ` y `ruidoQ` de un texto, fuera de su definición (`GLSL_RUIDO`). */
export function llamadasAlRuidoDeHash(texto: string): number {
  const sinDefinicion = soloCodigo(texto.split(GLSL_RUIDO).join(''));
  return (sinDefinicion.match(/\b(?:fbmQ|ruidoQ)\s*\(/g) ?? []).length;
}

/**
 * EL JUEZ DEL RUIDO DE HASH sobre el texto ACTIVO (los `#if` resueltos): en N0 y en lo lejano, ninguna llamada; en la
 * fachada de N1-N3, sólo las del bajo que se quedan como estaban (`RUIDO_DE_HASH_DEL_BAJO_EN_N1`), cada una una vez.
 */
export function juzgarElRuidoDeHash(activo: string, permitidas: readonly string[]): string[] {
  const problemas: string[] = [];
  /* Fuera las definiciones (el `GLSL_RUIDO` entero, tal como sale en un texto activo). */
  const definicion = textoActivo(GLSL_RUIDO);
  if (!activo.includes(definicion)) problemas.push('no encuentro la definición del ruido de hash en el texto activo');
  let resto = activo.split(definicion).join('');
  for (const p of permitidas) {
    const veces = resto.split(p).length - 1;
    if (veces !== 1) problemas.push(`«${p}» sale ${String(veces)} veces (tiene que salir una)`);
    resto = resto.split(p).join('');
  }
  const k = llamadasAlRuidoDeHash(resto);
  if (k > 0) problemas.push(`${String(k)} llamadas a fbmQ o ruidoQ de más`);
  return problemas;
}

/* ═══════════════════════════════ LA COMPROBACIÓN ═══════════════════════════════ */

const resultado = (que: string, problemas: readonly string[], inspeccionados: number, minimo: number): Resultado => ({
  que,
  bien: problemas.length === 0,
  inspeccionados,
  minimo,
  ...(problemas.length > 0 ? { detalle: problemas.slice(0, 8) } : {}),
});

export const comprobar: ComprobarElPaquete = (ctx: ContextoDeLaCiudad) => {
  const salida: Resultado[] = [];
  const fachadas = Object.fromEntries(NIVELES_DE_LA_CIUDAD.map((n) => [n, ctx.textoDelFragmento(materialDeFachada(n))])) as Record<NivelDeLaCiudad, string>;
  const lejanos = Object.fromEntries(NIVELES_DE_LA_CIUDAD.map((n) => [n, ctx.textoDelFragmento(materialDeLoLejano(n, n >= 1))])) as Record<NivelDeLaCiudad, string>;

  /* a. Las capas por nivel, y la vacuna de NIVEL_Q fijo a 1. */
  {
    const problemas: string[] = [];
    let miradas = 0;
    try {
      const activos = Object.fromEntries(NIVELES_DE_LA_CIUDAD.map((n) => [n, textoActivo(fachadas[n])])) as Record<NivelDeLaCiudad, string>;
      const j = juzgarLasCapas(activos);
      problemas.push(...j.problemas);
      miradas = j.miradas;
      const fijo = Object.fromEntries(NIVELES_DE_LA_CIUDAD.map((n) => [n, textoActivo(fachadas[n].replace(/^(\s*#\s*define\s+NIVEL_Q\s+)\d+/m, '$11'))])) as Record<NivelDeLaCiudad, string>;
      if (juzgarLasCapas(fijo).problemas.length === 0) problemas.push('vacuna: con NIVEL_Q fijo a 1 el juez no ve nada');
    } catch (e) {
      problemas.push(String(e));
    }
    salida.push(resultado('a · los textos activos de la fachada son distintos en N0-N3 y cada capa nueva está en su #if NIVEL_Q (vacuna: NIVEL_Q fijo a 1)', problemas, miradas, 6 + 4 * CAPAS_DE_LA_FACHADA.length));
  }

  /* b. Lo lejano: materia-lejos y NIVEL_Q ≤ 1; la ventana, su nivel. */
  {
    const problemas: string[] = [];
    let mirados = 0;
    for (const n of NIVELES_DE_LA_CIUDAD) {
      for (const fundido of [false, true]) {
        const m = materialDeLoLejano(n, fundido);
        mirados++;
        for (const p of juzgarLoLejano(m, ctx.textoDelFragmento(m))) problemas.push(`lo lejano de N${String(n)}${fundido ? ' con fundido' : ''}: ${p}`);
      }
      const ventana = materialDeFachada(n);
      mirados++;
      if (!retoquesDe(ventana).includes(`materia-n${String(n)}`)) problemas.push(`la fachada de N${String(n)} no lleva materia-n${String(n)}`);
      if (defineDe(fachadas[n], 'NIVEL_Q') !== String(n)) problemas.push(`la fachada de N${String(n)} tiene NIVEL_Q ${String(defineDe(fachadas[n], 'NIVEL_Q'))}`);
    }
    const vacuna = ([2, 3] as const).flatMap((n) => juzgarLoLejano(materialDeFachada(n), fachadas[n]));
    if (vacuna.length < 2) problemas.push('vacuna: la fachada de N2 y N3 pasa por lo lejano');
    salida.push(resultado('b · lo lejano lleva materia-lejos y NIVEL_Q ≤ 1 en N0-N3, con fundido y sin él, y la ventana su nivel (vacuna: la fachada de N2-N3)', problemas, mirados, 12));
  }

  /* c. La paridad sobre el texto montado de verdad. */
  {
    const hashJs = readFileSync(new URL('../../src/quiebro/ciudad/hash.ts', import.meta.url), 'utf8');
    const estilos = (Object.entries(NUMERO_DEL_ESTILO) as [EstiloDeFachada, number][]).sort((a, b) => a[1] - b[1]).map(([e]) => HUECO_DEL_ESTILO[e]);
    const problemas: string[] = [];
    let comparados = 0;
    for (const n of NIVELES_DE_LA_CIUDAD) {
      const t = fachadas[n];
      const p = paridadDeLasGemelas({ hashJs, glslComun: t, tramoDelHueco: t, tramoDelBajo: t, huecoDelEstilo: estilos, largoDeUnaTienda: LARGO_DE_UNA_TIENDA });
      comparados += p.comparados;
      for (const x of p.problemas) problemas.push(`N${String(n)}: ${x}`);
    }
    const envenenado = fachadas[1].replace('0.12 + 0.2 * hp', '0.12 + 0.3 * hp');
    const vacuna = paridadDeLasGemelas({ hashJs, glslComun: envenenado, tramoDelHueco: envenenado, tramoDelBajo: envenenado, huecoDelEstilo: estilos, largoDeUnaTienda: LARGO_DE_UNA_TIENDA });
    if (envenenado === fachadas[1] || vacuna.problemas.length === 0) problemas.push('vacuna: un umbral de encendidaQ cambiado en el texto montado sale verde');
    salida.push(resultado('c · la paridad GLSL ↔ JS sigue en verde sobre el texto montado de la fachada en N0-N3 (vacuna: un umbral cambiado)', problemas, comparados, 4 * 40));
  }

  /* d. La Grafía es lo último, y el relieve y la luz con dirección se apagan bajo ella. */
  {
    const problemas: string[] = [];
    let mirados = 0;
    for (const n of NIVELES_DE_LA_CIUDAD) {
      for (const [nombre, t] of [
        ['la fachada', fachadas[n]],
        ['lo lejano', lejanos[n]],
      ] as const) {
        mirados++;
        for (const p of juzgarLaGrafia(t)) problemas.push(`N${String(n)} ${nombre}: ${p}`);
        const activo = textoActivo(t);
        const apagado = juzgarElApagadoDelRelieve(activo);
        mirados += apagado.escrituras;
        for (const p of apagado.problemas) problemas.push(`N${String(n)} ${nombre}: ${p}`);
        if (n >= 1 && !activo.includes('luzConDireccionQ(P, Ng, T, nW, nJ, V, rug, dist, 1.0 - uRejillaDeGlifos)')) problemas.push(`N${String(n)} ${nombre}: la luz con dirección no se apaga bajo la Grafía`);
      }
    }
    /* Vacunas: el relieve de siempre sin apagar; un SEGUNDO camino (el del zócalo, N1+) sin apagar; el color detrás de la marca. */
    const sinApagar = fachadas[2].replace('nLocal.xy += pendiente * muro * sinGrafia;', 'nLocal.xy += pendiente * muro;');
    if (sinApagar === fachadas[2] || juzgarElApagadoDelRelieve(textoActivo(sinApagar)).problemas.length === 0) problemas.push('vacuna: el relieve sin apagar sale verde');
    const zocaloSinApagar = fachadas[2].replace(/(nLocal\.y \+= 0\.7 \* zocalo[^;]*?) \* sinGrafia;/, '$1;');
    if (zocaloSinApagar === fachadas[2] || juzgarElApagadoDelRelieve(textoActivo(zocaloSinApagar)).problemas.length === 0) problemas.push('vacuna: el relieve del zócalo sin apagar sale verde');
    if (juzgarLaGrafia(fachadas[2].replace('/* FIN-DE-LA-GRAFIA */', '/* FIN-DE-LA-GRAFIA */\n  albedo *= 0.9;')).length === 0) problemas.push('vacuna: una escritura del color detrás de la marca sale verde');
    salida.push(
      resultado(
        'd · la Grafía es lo último en la fachada y en lo lejano de N0-N3; TODA escritura del relieve del envejecido pasa por sinGrafia y la luz con dirección se apaga bajo ella (vacunas: sin apagar, el zócalo sin apagar, color detrás)',
        problemas,
        mirados,
        /* 8 textos, y en cada uno la pendiente y la de la junta; en N1-N3 (la fachada y lo lejano), además el zócalo. */
        8 + 2 * 8 + 2 * 3,
      ),
    );
  }

  /* e. La ida y vuelta del empaquetado. */
  {
    const t = fachadas[0];
    const j = juzgarElEmpaquetado(empaquetarLaPlanta, desempaquetarLaPlanta, desempaquetadoDelGlsl(t), lecturaDelBajo(t));
    const problemas = [...j.problemas];
    /* Todos los niveles y lo lejano desempaquetan con el mismo texto. */
    for (const n of NIVELES_DE_LA_CIUDAD) {
      for (const texto of [fachadas[n], lejanos[n]]) {
        const g = desempaquetadoDelGlsl(texto);
        const leer = lecturaDelBajo(texto);
        const y = Math.fround(empaquetarLaPlanta(2, 5, 6));
        if (g === null || leer === null || g(y).join() !== '2,5,6' || leer([3, y], g(y)) !== 2) problemas.push(`N${String(n)}: el desempaquetado del texto no da (2, 5, 6)`);
      }
    }
    /* La vacuna: la lectura de antes, sin desempaquetar. */
    const deAntes = t.replace(/\bint\s+bajo\s*=\s*[^;]+;/, 'int bajo = int(vPlantaQ.y + 0.5);');
    if (deAntes === t || juzgarElEmpaquetado(empaquetarLaPlanta, desempaquetarLaPlanta, desempaquetadoDelGlsl(deAntes), lecturaDelBajo(deAntes)).problemas.length === 0) {
      problemas.push('vacuna: la lectura de antes, int(vPlantaQ.y + 0.5), sale verde');
    }
    /* Los muros de verdad de la traza 0. */
    const b = ctx.base(0);
    let muros = 0;
    for (const parte of b.partes.celdas) {
      if (parte.edificios.length === 0) continue;
      const m = juzgarLosMurosDeVerdad(parte.edificios, parte.vecinos);
      muros += m.miradas;
      problemas.push(...m.problemas);
    }
    salida.push(
      resultado(
        `e · aPlanta.y (bajo + 4·patrón + 32·edad) y aVolumen.z (subestilo + 4·cima + tinte) dan la vuelta en JS y en el GLSL del texto montado (${String(j.miradas)} casos, ${String(muros)} muros de la traza 0; vacuna: la lectura de antes)`,
        problemas.slice(0, 8),
        j.miradas + muros,
        768 + 2000,
      ),
    );
  }

  /* f. Los tramos ajenos, a la materia. */
  {
    const problemas = [...SUSTITUCIONES_QUE_NO_ENTRARON];
    let mirados = SUSTITUCIONES_DE_LOS_TRAMOS_AJENOS - SUSTITUCIONES_QUE_NO_ENTRARON.length;
    for (const n of NIVELES_DE_LA_CIUDAD) {
      for (const [nombre, t, permitidas] of [
        ['la fachada', fachadas[n], n >= 1 ? RUIDO_DE_HASH_DEL_BAJO_EN_N1 : []],
        ['lo lejano', lejanos[n], []],
      ] as const) {
        mirados++;
        for (const p of juzgarElRuidoDeHash(textoActivo(t), permitidas)) problemas.push(`N${String(n)} ${nombre}: ${p}`);
      }
    }
    /* Vacunas: las piezas sin sustituir (un fbmQ en N0); y el bajo de N1-N3 también en N0 (sin el #if MATERIA_Q). */
    const sinSustituir = fachadas[0].replace('fbmT(P.xz * 0.35, lodQ(0.35))', 'fbmQ(P.xz * 0.35)');
    if (sinSustituir === fachadas[0] || juzgarElRuidoDeHash(textoActivo(sinSustituir), []).length === 0) problemas.push('vacuna: el tramo de las piezas sin sustituir sale verde');
    const bajoEnN0 = fachadas[0].replace(/#if NIVEL_Q >= 1(\s+float zona = )/, '#if 1$1');
    if (bajoEnN0 === fachadas[0] || juzgarElRuidoDeHash(textoActivo(bajoEnN0), []).length === 0) problemas.push('vacuna: las pintadas de hash en N0 salen verdes');
    salida.push(
      resultado(
        'f · los tramos ajenos pasan a la materia al montarse (cada sustitución una vez): ni un fbmQ ni un ruidoQ activo en N0 ni en lo lejano, y en la fachada de N1-N3 sólo los cuatro del bajo de siempre (vacunas: sin sustituir, el bajo de hash en N0)',
        problemas,
        mirados,
        SUSTITUCIONES_DE_LOS_TRAMOS_AJENOS + 8,
      ),
    );
  }
  return salida;
};
