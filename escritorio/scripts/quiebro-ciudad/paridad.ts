/**
 * LAS COMPROBACIONES DE LA PARIDAD DE LAS REGLAS NUEVAS en `verify:quiebro-ciudad` (plan del detalle, §3.6 y
 * §5.2.8). Dueño: O3-SILUETA (el balcón y la faja o imposta en bulto).
 *
 * Las gemelas de hoy (`encendida`, `queTienda`, `colorDeLuz`, `huecoQ` y la tienda de 6 m) las mira el comprobador
 * con `paridadDeLasGemelas` de `comun.ts`, y en la GPU `verify:quiebro-gl`. Hoy (ola 1) no hay nada más que mirar y
 * devuelve una lista vacía. Cada resultado que se añada lleva su mínimo de inspeccionados (ver `comun.ts`).
 */
import type { ComprobarElPaquete } from './comun';

export const comprobar: ComprobarElPaquete = () => [];
