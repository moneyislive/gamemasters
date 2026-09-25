/**
 * EL GRADO DE CADA CELDA DE LA VENTANA: cuánto detalle lleva lo que se escribe en ella, dentro de su nivel
 * (§3.1 del plan del detalle de la ciudad). Sin `three`: lo usan la ventana, el barrio viejo y el comprobador.
 *
 * ═══ EL GRADO NUNCA CAMBIA CERCA DE LA CÁMARA ═══
 *
 * La ventana se recentra cuando quien mira pasa 6 m dentro de la celda de al lado (`ventana.ts`). Si la celda
 * que pisa subiera de grado en ese instante, sus coches y sus balcones cambiarían a 2-5 m. Por eso:
 *
 *   · N0 y N1 (3 × 3) llevan un solo grado en sus nueve celdas: no cambia nunca.
 *   · N2 (4 × 4, lado par) se centra en una raya: las 2 × 2 celdas de alrededor llevan grado 3 y el anillo 2.
 *     Al recentrar, el grado cambia a 18 m o más por delante.
 *   · N3 (5 × 5) lleva grado 3 en el bloque de 3 × 3 del centro y 2 en el anillo: cambia a 42 m o más, en la
 *     niebla de la madrugada.
 *
 * Lo que de verdad se ve a 2-5 m (el coche) no sube por celda sino por distancia, en su propia capa
 * (`lo-cercano.ts`).
 *
 * ═══ OLA 1: EL GRADO SE LLEVA, PERO NO CAMBIA NADA TODAVÍA ═══
 *
 * Hasta que las familias escriban por grado, el relieve sigue el de hoy (`relieveDeHoy`: en N1, sólo la celda
 * del centro) y los coches, los de `cochesFinos` (`GRADO_DE_LOS_COCHES_POR_NIVEL`). O3-SILUETA quita
 * `relieveDeHoy` y deja sólo el grado.
 */
import type { GradoDeLaCelda, NivelDeLaCiudad } from './tipos';
import { DETALLE_DEL_NIVEL } from './tipos';

/** Los grados que puede llevar una celda de cada nivel (lo que el comprobador construye y mira). */
export const GRADOS_DEL_NIVEL: Readonly<Record<NivelDeLaCiudad, readonly GradoDeLaCelda[]>> = { 0: [1], 1: [1], 2: [2, 3], 3: [2, 3] };

/** El grado de las celdas del centro de la ventana de cada nivel (el mayor que lleva). */
export const GRADO_DEL_CENTRO: Readonly<Record<NivelDeLaCiudad, GradoDeLaCelda>> = { 0: 1, 1: 1, 2: 3, 3: 3 };

/**
 * EL GRADO DE UNA CELDA de la ventana. `dx` y `dz`: dónde está su centro respecto del centro de la ventana, en
 * celdas (enteros con lado impar; medios con lado par, porque el centro es una raya). Se mira la distancia de
 * Chebyshev: en N2, la mitad (las 2 × 2 de alrededor de la raya); en N3, una celda (el bloque de 3 × 3).
 */
export function gradoDeLaCelda(nivel: NivelDeLaCiudad, dx: number, dz: number): GradoDeLaCelda {
  const d = Math.max(Math.abs(dx), Math.abs(dz));
  if (nivel === 2) return d <= 0.5 + 1e-6 ? 3 : 2;
  if (nivel === 3) return d <= 1 + 1e-6 ? 3 : 2;
  return 1;
}

/**
 * EL GRADO DE LOS COCHES HORNEADOS de cada nivel. En la ola 1 reproduce `cochesFinos` (N0 la caja, N1-N3 con
 * ruedas y retrovisores): 1 / 2 / 2 / 2. La tabla final (§3.7) es 1 / 1 / 2 / 3, con el anillo de N3 en g2: la
 * pone quien escriba los coches por grado (O2-VEHICULOS).
 */
export const GRADO_DE_LOS_COCHES_POR_NIVEL: Readonly<Record<NivelDeLaCiudad, GradoDeLaCelda>> = { 0: 1, 1: 2, 2: 2, 3: 2 };

/** El grado de los coches horneados de una celda: el de su nivel y, en N3, no más que el de la celda (el anillo, g2). */
export function gradoDeLosCoches(nivel: NivelDeLaCiudad, grado: GradoDeLaCelda): GradoDeLaCelda {
  const g = GRADO_DE_LOS_COCHES_POR_NIVEL[nivel];
  return nivel === 3 ? (Math.min(g, grado) as GradoDeLaCelda) : g;
}

/**
 * EL RELIEVE DE HOY (balcones, cornisas, pretiles y maquinaria de azotea): N0 no; N1 sólo en la celda del centro
 * de la ventana (`relieveSoloEnElCentro`); N2 y N3 siempre. Va en la obra aparte del grado hasta que O3-SILUETA
 * lo retire.
 */
export function relieveDeHoy(nivel: NivelDeLaCiudad, esCentro: boolean): boolean {
  const d = DETALLE_DEL_NIVEL[nivel];
  return d.relieve && (!d.relieveSoloEnElCentro || esCentro);
}
