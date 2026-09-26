/**
 * EL HALLAZGO: lo que el servidor mete en la mesa cuando alguien recoge algo a pie en Boots on Board.
 *
 * Es el hermano del botín (`botin.ts`) y se escribe igual, por las mismas razones: lo que se
 * encuentra por el tablero NO SALE DE LA MESA —dinero del Burgo, materiales de Riberas, escudos de
 * Las Lindes—, y el estado de un juego sólo lo cambia su reductor, por el diario. Así que entra como
 * un movimiento `arcade:` que no manda ningún asiento (`quien: null`), por la puerta interna de la
 * plataforma (`meterDeLaPlataforma`), y el diario lo guarda como a cualquier otro.
 *
 * ═══ QUÉ DICE Y QUÉ NO ═══
 *
 * Sólo QUIÉN lo recoge (`para`) y QUÉ CLASE de hallazgo es (`clase`, de la tabla del juego:
 * `HALLAZGOS_DEL_JUEGO` en `mundos.ts`). Cuánto vale lo decide el reductor, que es quien sabe qué
 * vale en su mesa. Dónde estaba, cuándo brotó y quién más corría hacia él es de la sala del
 * servidor (`server/src/botas/`) y muere con ella: al juego sólo le llega el veredicto.
 *
 * ═══ UN JUEGO QUE SE RECORRE, ATIENDE EL HALLAZGO ═══
 *
 * Antes de su portillo de opciones, como el botín y el tic: nadie lo ofrece. Ver
 * `docs/AVATARES-JUGABLES.md` §2.
 */
import type { AsientoId } from '../tipos';

/** El tipo del movimiento. */
export const TIPO_DEL_HALLAZGO = 'arcade:hallazgo';

/** Lo que lleva dentro: quién lo recoge y qué clase de hallazgo es. */
export interface CargaDelHallazgo {
  readonly para: AsientoId;
  readonly clase: string;
}

/** El movimiento entero, como lo construye el servidor. */
export function movimientoDelHallazgo(para: AsientoId, clase: string): { tipo: string; carga: CargaDelHallazgo } {
  return { tipo: TIPO_DEL_HALLAZGO, carga: { para, clase } };
}

/** ¿Es un hallazgo? Sólo mira el tipo; si es VÁLIDO lo dice `leerElHallazgo`. */
export function esHallazgo(movimiento: { readonly tipo: string }): boolean {
  return movimiento.tipo === TIPO_DEL_HALLAZGO;
}

/**
 * LA CARGA, LEÍDA CON DESCONFIANZA. `null` si lo manda alguien (`quien` no es `null`), si la carga
 * no es exactamente `{ para, clase }` de cadenas, si `para` no está sentado o si la clase no es de
 * `clases` —la tabla del juego que lo lee—.
 *
 * Un reductor que reciba `null` RECHAZA el movimiento. Lo que esto no puede saber —que quien lo
 * recoge juega de verdad esta partida, que la partida está en juego— lo mira el reductor.
 */
export function leerElHallazgo(
  carga: unknown,
  quien: AsientoId | null,
  asientos: readonly AsientoId[],
  clases: readonly string[],
): CargaDelHallazgo | null {
  if (quien !== null) return null;
  if (typeof carga !== 'object' || carga === null || Array.isArray(carga)) return null;
  if (Object.keys(carga).length !== 2) return null;
  const { para, clase } = carga as { readonly para?: unknown; readonly clase?: unknown };
  if (typeof para !== 'string' || typeof clase !== 'string') return null;
  if (!asientos.includes(para)) return null;
  if (!clases.includes(clase)) return null;
  return { para, clase };
}
