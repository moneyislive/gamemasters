/**
 * LA CAPA DE LAS SOMBRAS DE LO CERCANO (O4-REMATES; renglón «sombras de lo cercano»): en N3, 12 triángulos por coche
 * y mueble de la ventana que sólo proyectan sombra (`colorWrite` y `depthWrite` a `false`: en el pase principal no
 * pintan nada). Hoy no hay: la fábrica devuelve `null`.
 */
import type { FabricaDeCapa } from '../capas';

export const capaDeLasSombrasCercanas: FabricaDeCapa = () => null;
