/**
 * CLUEDO, del lado del servidor.
 *
 * El manifiesto —lo que los tres paquetes tienen que saber— vive en
 * `shared/juegos/cluedo.ts`. Aquí van las piezas que solo necesita el
 * servidor y los atajos para leer la respuesta.
 *
 * SOBRE ESTOS ATAJOS. Ahora que la solución es un diccionario de ejes,
 * `plot.solution.respuestas.culpable` funciona pero se lee mal repetido en
 * trece plantillas, y sobre todo esconde un dato importante: quien escribe
 * `culpable` está escribiendo CLUEDO, no plataforma. Estas tres funciones lo
 * dejan a la vista. Un segundo juego tendrá las suyas y no importará que se
 * llamen distinto, porque nadie fuera de su carpeta las usará.
 */
import { CLUEDO } from '../../../shared/juegos/cluedo';
import type { EjeId } from '../../../shared/juegos';
import type { PlotSolution } from '../../../shared/types';

export { CLUEDO };

/** Los ejes de CLUEDO, por su nombre. */
export const EJES = {
  culpable: 'culpable' as EjeId,
  objeto: 'objeto' as EjeId,
  lugar: 'lugar' as EjeId,
} as const;

/** Quién lo hizo. */
export function culpableDe(solucion: PlotSolution): string {
  return solucion.respuestas[EJES.culpable] ?? '';
}

/** Con qué. */
export function objetoDe(solucion: PlotSolution): string {
  return solucion.respuestas[EJES.objeto] ?? '';
}

/** Dónde. */
export function lugarDe(solucion: PlotSolution): string {
  return solucion.respuestas[EJES.lugar] ?? '';
}

/**
 * Construye la respuesta de CLUEDO.
 *
 * Recibe un objeto con nombre y no tres cadenas sueltas a propósito: tres
 * parámetros posicionales del mismo tipo son una trampa —intercambiar dos
 * compila igual de bien y el juego puntúa mal sin avisar—, y esa trampa
 * existía de verdad en `api.acusar` antes de este refactor.
 */
export function respuestasCluedo(v: {
  murdererId: string;
  weaponId: string;
  roomId: string;
}): Record<EjeId, string> {
  return {
    [EJES.culpable]: v.murdererId,
    [EJES.objeto]: v.weaponId,
    [EJES.lugar]: v.roomId,
  };
}
