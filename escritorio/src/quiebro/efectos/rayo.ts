/**
 * LOS EFECTOS DEL RAYO: lo que se ve de la carga, del destello y del estallido (`docs/quiebro/EL-RAYO.md`, §4),
 * detrás de la interfaz `EfectosDelRayo` del contrato (`rayo/contrato.ts`). Cuelga del sistema de efectos
 * (`sistema.rayo`): MANDOS lo llama con el rayo propio y `red/escenificar.ts` con los ajenos y con cada `estalla`.
 *
 * ═══ FASE 0: EL STUB ═══
 *
 * Hoy es la implementación NULA del contrato: todas las llamadas llegan hasta aquí por su camino de verdad y no
 * pintan nada. El frente de EFECTOS la sustituye AQUÍ (la firma de `crearEfectosDelRayo` y lo que devuelve son
 * suyos; la interfaz `EfectosDelRayo`, del contrato). Puro, como el sistema: ni three, ni DOM, ni `performance`.
 */
import { EFECTOS_DEL_RAYO_NULOS } from '../rayo/contrato';
import type { EfectosDelRayo } from '../rayo/contrato';

/** Los efectos del rayo de un sistema nuevo. FASE 0: los que no hacen nada. */
export function crearEfectosDelRayo(): EfectosDelRayo {
  return EFECTOS_DEL_RAYO_NULOS;
}
