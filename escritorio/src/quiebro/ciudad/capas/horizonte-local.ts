/**
 * LA CAPA DEL HORIZONTE LOCAL (O3-LUZ-EN-EL-AIRE; sólo textura, sin renglón): 64 rayos al recentrar la ventana, a
 * una textura de 64 × 1 que lee `cieloReflejadoLocalQ` desde N1 (`GLSL_CIELO_REFLEJADO` no se toca: lo usan los
 * personajes). Si lleva una malla, es para colgar la textura del relevo: una llamada que no pinta nada no vale.
 * Hoy no hay: la fábrica devuelve `null`.
 */
import type { FabricaDeCapa } from '../capas';

export const capaDelHorizonteLocal: FabricaDeCapa = () => null;
