/**
 * ¿SE JUEGA CON EL DEDO, EN `/jugar`? El almacén único de `escenas/paseo/aparato.ts`, el mismo de la
 * Sala: dedo sólo si el puntero principal es un dedo en un sistema que no es de ordenador, y luego
 * manda el uso —un toque pasa a dedo; mover el ratón o pulsar una tecla de andar, a teclado—. Un
 * Windows con ratón que declara 10 puntos de toque (el de Miguel) ya no saca la palanca.
 */
import { useSyncExternalStore } from 'react';
import { mandoActual, mandoSinVentana, suscribirAlMando } from '../../../escenas/paseo/aparato';

export function usarAparatoTactil(): boolean {
  return useSyncExternalStore(suscribirAlMando, mandoActual, mandoSinVentana) === 'dedo';
}
