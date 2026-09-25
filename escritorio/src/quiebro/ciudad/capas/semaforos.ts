/**
 * LA CAPA DE LOS SEMÁFOROS (O4-SEMAFOROS; sólo textura, sin renglón): cada fotograma escribe una textura de 144 × 1
 * con la fase de cada cruce (`faseDelSemaforoEnLaCiudad` de `shared/`) y el MISMO tic que el tren, para que la luz
 * y los durmientes casen. Hoy no hay: la fábrica devuelve `null`.
 */
import type { FabricaDeCapa } from '../capas';

export const capaDeLosSemaforos: FabricaDeCapa = () => null;
