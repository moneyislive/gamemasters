/**
 * QUÉ CARA DEL D6 ENSEÑA CADA VALOR: se MIDE contando los puntos, no se supone.
 *
 * ═══ POR QUÉ HAY QUE MEDIRLO ═══
 *
 * Para asentar un dado en el número que salió, la escena tiene que saber qué cara del
 * modelo lleva ese número y girarla hacia arriba. El pack no lo dice en ningún sitio:
 * `D6_A.gltf` es una malla con puntos modelados y un nombre. Suponer «el 1 mira a +y,
 * como en Blender» es exactamente el fallo que no da error: el dado se asienta, enseña
 * una cara, y la cara es otra. Se sabría al ver un 7 salir como 3 y 6, si alguien mira.
 *
 * Así que se cuenta. Cada punto es un grupo de vértices oscuros CONEXOS por triángulos
 * (nueve por punto en el D6_A, medido; los vértices de la costura con el cuerpo están
 * duplicados porque caen en otra celda del atlas, y por eso ningún triángulo mezcla los
 * dos colores). Se agrupan por la cara en la que caen (el eje en que su posición tiene
 * el mayor valor absoluto, con su signo) y se cuentan los grupos de cada cara. Lo que
 * sale tiene que ser un dado: seis caras con 1, 2, 3, 4, 5 y 6 grupos, que suman 21, y
 * las caras opuestas suman 7. Si no, el fichero no es un D6 o la medida se ha roto, y
 * en los dos casos se para.
 *
 * ═══ POR QUÉ ESTO ES UN MÓDULO Y NO DOS COPIAS ═══
 *
 * Lo usan `compilar-dados.ts`, para escribir `escenas/caras-del-dado.ts`, y
 * `verificar-dados.ts`, para volver a medir el `.glb` compilado y cotejarlo con ese
 * fichero. La medida es la misma a propósito: si estuviera escrita dos veces, la
 * comprobación de que coinciden compararía dos maneras de contar y no el fichero con
 * la realidad. Lo que sí es independiente de la medida son los invariantes de dado
 * (`problemasDeUnDado`), que es donde una medida rota se cae.
 */
import type { Accessor, Primitive } from '@gltf-transform/core';

/** Una cara del cubo, por el eje del modelo hacia el que mira. */
export type Cara = '+x' | '-x' | '+y' | '-y' | '+z' | '-z';
export const CARAS: readonly Cara[] = ['+x', '-x', '+y', '-y', '+z', '-z'];

/** La opuesta: mismo eje, otro signo. */
export function caraOpuesta(cara: Cara): Cara {
  return `${cara[0] === '+' ? '-' : '+'}${cara[1] as 'x' | 'y' | 'z'}`;
}

/** La normal unitaria de una cara, en el espacio del modelo. */
export function normalDeLaCara(cara: Cara): readonly [number, number, number] {
  const signo = cara[0] === '+' ? 1 : -1;
  const eje = 'xyz'.indexOf(cara[1] as string);
  const n: [number, number, number] = [0, 0, 0];
  n[eje] = signo;
  return n;
}

/** Los grupos de vértices oscuros de cada cara, con cuántos vértices caen en ella. */
export type PuntosPorCara = ReadonlyMap<Cara, { readonly puntos: number; readonly vertices: number }>;

/**
 * La cara en la que cae un vértice: el eje con mayor valor absoluto, con su signo. Un
 * punto está a ras de su cara (a 0,32 y 0,375 de profundidad en un cubo de 0,375 de
 * semiarista, medido) y nunca a más de un tercio de la arista del centro en el plano,
 * así que el eje de la cara gana siempre.
 */
function caraDe(v: readonly number[]): Cara {
  let eje = 0;
  for (let k = 1; k < 3; k++) if (Math.abs(v[k] as number) > Math.abs(v[eje] as number)) eje = k;
  return `${(v[eje] as number) > 0 ? '+' : '-'}${'xyz'[eje] as 'x' | 'y' | 'z'}`;
}

/**
 * Cuenta los puntos de cada cara de una primitiva. `esPunto(i)` dice si el vértice `i`
 * es de punto (oscuro); la conexión es por aristas de triángulo entre dos vértices de
 * punto.
 *
 * Devuelve además los vértices de punto cuya NORMAL no mira a la cara en la que caen:
 * en el D6_A no hay ninguno (los puntos son planos, con la normal de su cara), y si un
 * pack futuro trajera hoyuelos con normales inclinadas, quien mida querrá saberlo antes
 * de fiarse de la cuenta.
 */
export function cuentaLosPuntos(
  prim: Primitive,
  esPunto: (indice: number) => boolean,
): { porCara: PuntosPorCara; normalesTorcidas: number } {
  const pos = prim.getAttribute('POSITION') as Accessor;
  const nrm = prim.getAttribute('NORMAL');
  const idx = prim.getIndices();
  const n = pos.getCount();
  if (idx === null) throw new Error('La primitiva del dado no trae índices: la conexión de los puntos se cuenta por triángulos.');

  const padre = Array.from({ length: n }, (_, i) => i);
  const raiz = (a: number): number => {
    let r = a;
    while (padre[r] !== r) r = padre[r] as number;
    let c = a;
    while (padre[c] !== r) {
      const siguiente = padre[c] as number;
      padre[c] = r;
      c = siguiente;
    }
    return r;
  };
  const une = (a: number, b: number): void => {
    padre[raiz(a)] = raiz(b);
  };
  for (let t = 0; t < idx.getCount(); t += 3) {
    const a = idx.getScalar(t);
    const b = idx.getScalar(t + 1);
    const c = idx.getScalar(t + 2);
    if (esPunto(a) && esPunto(b)) une(a, b);
    if (esPunto(b) && esPunto(c)) une(b, c);
    if (esPunto(a) && esPunto(c)) une(a, c);
  }

  const v = [0, 0, 0];
  const nn = [0, 0, 0];
  const grupos = new Map<Cara, Set<number>>();
  const vertices = new Map<Cara, number>();
  let normalesTorcidas = 0;
  for (let i = 0; i < n; i++) {
    if (!esPunto(i)) continue;
    pos.getElement(i, v);
    const cara = caraDe(v);
    if (nrm !== null) {
      nrm.getElement(i, nn);
      if (caraDe(nn) !== cara) normalesTorcidas++;
    }
    let conjunto = grupos.get(cara);
    if (conjunto === undefined) {
      conjunto = new Set();
      grupos.set(cara, conjunto);
    }
    conjunto.add(raiz(i));
    vertices.set(cara, (vertices.get(cara) ?? 0) + 1);
  }

  const porCara = new Map<Cara, { puntos: number; vertices: number }>();
  for (const cara of CARAS) {
    porCara.set(cara, { puntos: grupos.get(cara)?.size ?? 0, vertices: vertices.get(cara) ?? 0 });
  }
  return { porCara, normalesTorcidas };
}

/**
 * LO QUE TIENE QUE CUMPLIR UNA CUENTA PARA SER UN DADO. Independiente de cómo se contó:
 * seis caras con 1..6 puntos, cada valor una vez, 21 en total y las opuestas sumando 7.
 * Devuelve los problemas, o una lista vacía.
 */
export function problemasDeUnDado(porCara: PuntosPorCara): string[] {
  const problemas: string[] = [];
  const valores = CARAS.map((c) => porCara.get(c)?.puntos ?? 0);
  const ordenados = [...valores].sort((a, b) => a - b);
  if (ordenados.join(',') !== '1,2,3,4,5,6') {
    problemas.push(`las seis caras tienen [${CARAS.map((c, i) => `${c}=${String(valores[i])}`).join(', ')}] puntos y tenían que ser 1..6, uno cada una`);
  }
  const suma = valores.reduce((t, x) => t + x, 0);
  if (suma !== 21) problemas.push(`los puntos suman ${String(suma)} y no 21`);
  for (const cara of ['+x', '+y', '+z'] as const) {
    const a = porCara.get(cara)?.puntos ?? 0;
    const b = porCara.get(caraOpuesta(cara))?.puntos ?? 0;
    if (a + b !== 7) problemas.push(`${cara} (${String(a)}) y ${caraOpuesta(cara)} (${String(b)}) suman ${String(a + b)} y no 7`);
  }
  return problemas;
}

/** De valor (1..6) a cara, a partir de la cuenta. Sólo tiene sentido si no hay problemas. */
export function caraDeCadaValor(porCara: PuntosPorCara): ReadonlyMap<number, Cara> {
  const salida = new Map<number, Cara>();
  for (const cara of CARAS) salida.set(porCara.get(cara)?.puntos ?? 0, cara);
  return salida;
}

/**
 * EL TEXTO DE `escenas/caras-del-dado.ts`, generado a partir de la cuenta.
 *
 * Determinista: el mismo dado da los mismos bytes, y por eso `verify:dados` puede
 * regenerarlo desde el `.glb` y compararlo byte a byte con el que hay en el árbol; un
 * fichero tocado a mano, o compilado de otro dado, se cae ahí. Sin importaciones: es
 * dato puro, para que la escena lo lea sin arrastrar nada y sin ciclos.
 */
export function textoDeCarasDelDado(porCara: PuntosPorCara): string {
  const problemas = problemasDeUnDado(porCara);
  if (problemas.length > 0) throw new Error(`No se escribe la tabla de un dado que no lo es: ${problemas.join('; ')}.`);
  const cara = caraDeCadaValor(porCara);
  const valores = [1, 2, 3, 4, 5, 6] as const;
  const filas = valores.map((v) => `  ${String(v)}: '${cara.get(v) as Cara}',`).join('\n');
  const normales = valores
    .map((v) => `  ${String(v)}: [${normalDeLaCara(cara.get(v) as Cara).join(', ')}],`)
    .join('\n');
  return `/**
 * QUÉ CARA DEL DADO ENSEÑA CADA VALOR. GENERADO por \`escenas/scripts/compilar-dados.ts\`:
 * NO EDITAR A MANO.
 *
 * Medido sobre el D6 de KayKit Board Game Bits al compilar \`escenas/modelos/dados.glb\`:
 * cada punto es un grupo conexo de vértices del color del punto, y la cara con N grupos
 * es la que enseña el N (\`escenas/scripts/caras-del-d6.ts\` cuenta cómo y por qué). La
 * escena lo lee para orientar el dado al asentarse: la normal de la cara del valor que
 * salió tiene que acabar mirando hacia arriba. \`verify:dados\` vuelve a medir el \`.glb\`
 * y exige que este fichero sea, byte a byte, lo que la medida produce.
 *
 * Caras: ${CARAS.map((c) => `${c}=${String(porCara.get(c)?.puntos ?? 0)}`).join(' ')}. Suman 21; las opuestas, 7.
 */

/** Una cara del modelo, por el eje hacia el que mira en el espacio del modelo. */
export type CaraDelDado = '+x' | '-x' | '+y' | '-y' | '+z' | '-z';

/** Un valor de una cara. */
export type ValorDelDado = 1 | 2 | 3 | 4 | 5 | 6;

/** La cara del modelo \`MODELO.dado\` que enseña cada valor. */
export const CARA_DEL_VALOR: Readonly<Record<ValorDelDado, CaraDelDado>> = {
${filas}
};

/** La normal unitaria, en el espacio del modelo, de la cara que enseña cada valor. */
export const NORMAL_DEL_VALOR: Readonly<Record<ValorDelDado, readonly [number, number, number]>> = {
${normales}
};

/** La normal de la cara de un valor, o \`null\` si el número no es de un dado. */
export function normalDelValor(valor: number): readonly [number, number, number] | null {
  return valor >= 1 && valor <= 6 && Number.isInteger(valor) ? NORMAL_DEL_VALOR[valor as ValorDelDado] : null;
}
`;
}
