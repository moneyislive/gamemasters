/**
 * EL AZAR DEL ADORNO: sembrado, igual en todos los aparatos, y sin `Math.random`.
 *
 * ═══ POR QUÉ NO `shared/mecanicas/azar.ts` ═══
 *
 * Aquel es el azar de las REGLAS: inmutable, con su tirada que devuelve el azar siguiente, pensado
 * para que el estado de una partida se pueda reproducir y viajar. Esto es el azar del ADORNO: qué
 * ventana está encendida, de qué color es el sedán del número 14. Se pide a millares mientras se
 * construye la ciudad y no viaja a ninguna parte; con el de las reglas cada ventana crearía un
 * objeto. Lo que sí se exige es lo mismo: que dos teléfonos con el mismo barrio vean la misma
 * ciudad, así que nada de `Math.random` ni de `Date`, y enteros de 32 bits con `Math.imul` (que aquí
 * es un hash, no un producto de coma fija: da lo mismo en todos los motores).
 */

/** Un hash de 32 bits sin signo de una lista de enteros. Mezcla de tipo «murmur». */
export function mezclar(...numeros: readonly number[]): number {
  let h = 0x9e3779b9;
  for (const n of numeros) {
    let k = Math.imul(n | 0, 0xcc9e2d51);
    k = (k << 15) | (k >>> 17);
    k = Math.imul(k, 0x1b873593);
    h ^= k;
    h = (h << 13) | (h >>> 19);
    h = (Math.imul(h, 5) + 0xe6546b64) | 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Un número en [0, 1) a partir de una lista de enteros. */
export function azarEn(...numeros: readonly number[]): number {
  return mezclar(...numeros) / 4294967296;
}

/** El hash de una cadena (para sembrar con el código de la mesa). */
export function hashDeTexto(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Una fuente de números en [0, 1) con semilla (mulberry32). Para recorridos largos. */
export interface Dado {
  /** En [0, 1). */
  (): number;
}

export function dadoDe(semilla: number): Dado {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Un entero en [min, max] con un dado. */
export function enteroCon(dado: Dado, min: number, max: number): number {
  return min + Math.floor(dado() * (max - min + 1));
}

/** Un elemento de una lista con un dado. La lista no puede estar vacía. */
export function unoDe<T>(dado: Dado, lista: readonly T[]): T {
  const i = Math.min(lista.length - 1, Math.floor(dado() * lista.length));
  return lista[i] as T;
}
