/**
 * LA CAPA DE LOS COCHES CERCANOS (O3-LO-CERCANO; renglones «cercanos · mobiliario», «cercanos · cristal» y «cercanos ·
 * emisivo»): desde N1, los `COCHES_CERCANOS_POR_NIVEL` coches aparcados más cercanos a la cámara con el grado alto
 * del nivel (`GRADO_DE_LO_CERCANO_POR_NIVEL`), fundidos con su versión horneada (ver `lo-cercano.ts`). Sus materiales
 * se piden a las fábricas de siempre con `{ deLaCapa: true }`. Hoy no hay: la fábrica devuelve `null`.
 */
import type { FabricaDeCapa } from '../capas';

export const capaDeLosCochesCercanos: FabricaDeCapa = () => null;
