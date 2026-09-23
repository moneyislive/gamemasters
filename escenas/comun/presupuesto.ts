/**
 * EL RENGLÓN DEL PRESUPUESTO, UNA VEZ: cómo se apunta lo que pesa una escena y cómo se cuentan sus
 * piezas contra el `.glb`. Sin `three`.
 *
 * ═══ POR QUÉ ESTO ES DE TODAS Y NO DE UNA ═══
 *
 * El Muelle, la Plaza y el Burgo llevan cada uno su presupuesto sin `three` —para que su comprobador
 * lo sume en Node con los MISMOS números con los que la escena construye—, y los tres repetían lo
 * mismo por debajo: `RenglonDelPresupuesto` escrito tres veces, la cuenta de los triángulos de una
 * esfera tres veces, y el bucle que pasa de «cuántas hay de cada pieza» a renglones con los
 * triángulos del fichero, apuntando las piezas que el fichero no trae, dos. Lo que cada escena pone
 * —el mar, las farolas, la caja del Burgo— sigue en su presupuesto; lo que es la forma de contar,
 * aquí. Una escena nueva escribe sus renglones con esto y su comprobador los suma igual que los de
 * las otras.
 *
 * ═══ Y EL TOPE DE UN LOBBY, QUE ERA UNA COINCIDENCIA CON MOTIVO ═══
 *
 * 110.000 triángulos y 70 llamadas con seis sentados: los fijó el Muelle (`docs/EL-MUELLE.md` §2) y
 * la Plaza los copió a sabiendas, escribiendo que «que sean el mismo número es una coincidencia con
 * motivo, no una dependencia». El motivo es que los dos son un LOBBY: una escena que tiene que abrir
 * en un móvil ANTES de la partida. Un motivo común se escribe una vez y con su nombre, y así el día
 * que se mueva se mueve para todos los lobbies y no para el que alguien se acordó de mirar. Un
 * tablero no es un lobby: el Burgo tiene los suyos, y Riberas los del delta.
 */

/** Una línea de la suma: qué es, cuántas veces se pone y cuántos triángulos cuesta en total. */
export interface RenglonDelPresupuesto {
  readonly que: string;
  readonly cuantos: number;
  readonly triangulos: number;
}

/** El tope de un lobby con seis sentados en calidad plena. Ver la cabecera. */
export const TOPE_DE_UN_LOBBY = { triangulos: 110_000, llamadas: 70 } as const;

/** Los triángulos de una `SphereGeometry(ancho, alto)`: los dos casquetes son abanicos. */
export function triangulosDeUnaEsfera(ancho: number, alto: number): number {
  return ancho * 2 + (alto - 2) * ancho * 2;
}

/**
 * LAS PIEZAS DEL PACK, EN RENGLONES: una por nombre, ordenadas por nombre, con sus triángulos.
 *
 * `cuantas` son pares `[pieza, veces]` —un `Map` o `Object.entries` de una tabla—, y `triangulosDe`
 * los triángulos de una pieza medidos en el `.glb`, o `undefined` si el fichero no la trae. Una pieza
 * que no está cuenta CERO y se apunta en `desconocidas`: la suma no vale si hay alguna, y quien la
 * llama tiene que decirlo en vez de dar por bueno un total que se ha comido una pieza.
 */
export function renglonesDeLasPiezas(
  cuantas: Iterable<readonly [string, number]>,
  triangulosDe: (pieza: string) => number | undefined,
): { readonly renglones: RenglonDelPresupuesto[]; readonly desconocidas: string[] } {
  const renglones: RenglonDelPresupuesto[] = [];
  const desconocidas: string[] = [];
  const porNombre = [...cuantas].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  for (const [pieza, cuantos] of porNombre) {
    const t = triangulosDe(pieza);
    if (t === undefined) desconocidas.push(pieza);
    renglones.push({ que: pieza, cuantos, triangulos: cuantos * (t ?? 0) });
  }
  return { renglones, desconocidas };
}

/** Lo que suman los renglones. */
export function sumaDeLosRenglones(renglones: readonly RenglonDelPresupuesto[]): number {
  return renglones.reduce((suma, r) => suma + r.triangulos, 0);
}
