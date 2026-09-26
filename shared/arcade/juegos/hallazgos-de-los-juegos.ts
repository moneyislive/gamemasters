/**
 * QUÉ SE ENCUENTRA A PIE EN CADA JUEGO: las tablas de hallazgos, con su peso al sortear qué brota.
 *
 * Aquí y no en cada reductor porque las leen dos lados: el reductor (qué clases acepta y cuánto
 * vale cada una) y la sala del servidor (qué hace brotar). Cuánto VALE cada clase lo dice el
 * reductor; esto sólo dice qué existe. Ver `docs/AVATARES-JUGABLES.md` §3, §4 y §5.
 */
import type { ClaseDeHallazgo } from '../../mecanicas/hallazgos';
import { MATERIALES } from './riberas-armas';

/** El Burgo: dinero por la calle. Lo que vale cada uno, en `burgo.ts` (`EUROS_DEL_HALLAZGO`). */
export const HALLAZGOS_DEL_BURGO: readonly ClaseDeHallazgo[] = [
  { clase: 'propina', peso: 6 },
  { clase: 'cartera', peso: 3 },
  { clase: 'maletin', peso: 1 },
];

/** Riberas: los cuatro materiales de la forja, a partes iguales. Sólo existen en mesas `botas`. */
export const HALLAZGOS_DE_RIBERAS: readonly ClaseDeHallazgo[] = MATERIALES.map((m) => ({ clase: m, peso: 3 }));

/** Las Lindes: escudos. */
export const HALLAZGOS_DE_LAS_LINDES: readonly ClaseDeHallazgo[] = [{ clase: 'escudo', peso: 1 }];

/** Los nombres de las clases de una tabla: lo que pide `leerElHallazgo`. */
export function clasesDe(tabla: readonly ClaseDeHallazgo[]): readonly string[] {
  return tabla.map((c) => c.clase);
}
