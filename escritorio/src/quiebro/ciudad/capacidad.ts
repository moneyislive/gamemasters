/**
 * LO QUE CABE DE SALIDA EN LA CIUDAD ABIERTA: cuánto reserva cada familia de la ventana (vértices e índices por
 * mitad) y cuántas instancias caben en lo que sigue a la ventana (tarjetas, halos, cabezas de farola). Sin `three`.
 *
 * ═══ LA RESERVA PROVISIONAL (§7.2 del plan del detalle) ═══
 *
 * Hoy (24-sep) cada número era el peor de todas las ventanas de las 32 trazas, medido por `verify:quiebro-ciudad`,
 * más un 25 %. Mientras las familias crecen (olas 2 y 3), cada uno se queda en el MÁXIMO de hoy y del plan, para
 * que nadie tenga que tocar este fichero: el de hoy multiplicado por lo que crece su renglón en el libro
 * (`presupuesto.ts`, plan entre hoy), redondeado hacia arriba a 100 (a 500 desde 10.000). El cierre (O4-CIERRE) lo
 * baja a lo medido más un 25 %. Si una ventana no cabe, su malla crece (y el comprobador lo dice: no tiene que
 * pasar). Los de hoy, por familia y nivel (vértices / índices):
 *
 *   · fachadas   2.000/3.000 · 23.500/35.000 · 191.000/287.000 · 268.000/403.000
 *   · mobiliario 28.500/56.500 · 70.500/142.000 · 116.500/234.000 · 181.000/395.000
 *   · emisivo    2.900/4.500 · 2.900/4.500 · 4.800/7.300 · 7.200/11.200
 *   · cristal    850/1.300 · 850/1.300 · 1.400/2.100 · 1.950/2.900
 *   · neones     5.500/8.300 · 5.500/8.300 · 9.100/13.600 · 14.300/21.400
 *
 * y las instancias de salida 600 / 700 / 1.100 / 1.600. Las de N2 fachadas se quedan: su renglón baja (80.000
 * reservados contra 88.000 de hoy).
 */
import type { NivelDeLaCiudad } from './tipos';
import type { Familia } from './celdas';
import type { CapacidadDeLaFamilia } from './ventana';

/** LO QUE CABE DE SALIDA EN CADA FAMILIA DE LA VENTANA (vértices e índices por mitad), por nivel (ver la cabecera). */
export const CAPACIDAD_DE_LA_VENTANA: Readonly<Record<NivelDeLaCiudad, Readonly<Record<Familia, CapacidadDeLaFamilia>>>> = {
  0: {
    fachadas: { vertices: 12_000, indices: 18_000 },
    mobiliario: { vertices: 35_500, indices: 69_500 },
    emisivo: { vertices: 4_600, indices: 7_100 },
    cristal: { vertices: 1_500, indices: 2_300 },
    neones: { vertices: 6_200, indices: 9_300 },
  },
  1: {
    fachadas: { vertices: 51_500, indices: 76_500 },
    mobiliario: { vertices: 71_500, indices: 144_000 },
    emisivo: { vertices: 5_000, indices: 7_800 },
    cristal: { vertices: 2_900, indices: 4_400 },
    neones: { vertices: 6_800, indices: 10_500 },
  },
  2: {
    fachadas: { vertices: 191_000, indices: 287_000 },
    mobiliario: { vertices: 163_500, indices: 328_500 },
    emisivo: { vertices: 11_000, indices: 17_000 },
    cristal: { vertices: 8_000, indices: 12_000 },
    neones: { vertices: 12_000, indices: 18_000 },
  },
  3: {
    fachadas: { vertices: 454_000, indices: 682_500 },
    mobiliario: { vertices: 353_500, indices: 770_500 },
    emisivo: { vertices: 18_500, indices: 28_500 },
    cristal: { vertices: 13_000, indices: 19_500 },
    neones: { vertices: 19_500, indices: 29_500 },
  },
};

/**
 * Cuántas instancias caben de salida en lo que sigue a la ventana (tarjetas, halos, cabezas de farola): las de hoy
 * por lo que más crece el renglón de las tarjetas o el de los halos (ver la cabecera).
 */
export const INSTANCIAS_DE_SALIDA: Readonly<Record<NivelDeLaCiudad, number>> = { 0: 700, 1: 900, 2: 1_300, 3: 2_000 };
