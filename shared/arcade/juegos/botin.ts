/**
 * EL BOTÍN DE LA REFRIEGA: lo que el servidor mete en la mesa cuando alguien cae en Boots on Board.
 *
 * ═══ POR QUÉ ES UN MOVIMIENTO, Y NO UN APAÑO DEL SERVIDOR SOBRE EL ESTADO ═══
 *
 * Miguel lo decidió el 20-sep: lo que se roba en la refriega NO SALE DE LA MESA. Es del juego —una
 * ficha de Riberas, dinero del Burgo, puntos de Las Lindes—, y el estado de un juego sólo lo cambia
 * su reductor, por el diario: si el servidor tocara el estado por su cuenta, la partida reejecutada
 * desde el diario daría otra cosa y los marcadores dejarían de poder comprobarse. Así que el botín
 * entra como entra el tic: un movimiento `arcade:` que no manda ningún asiento (`quien: null`), y
 * que el diario guarda como cualquier otro.
 *
 * ═══ QUIÉN PUEDE MANDARLO: NADIE DE FUERA, Y CON DOS LLAVES ═══
 *
 * El prefijo `arcade:` está reservado: `mesas.ts` rechaza cualquier movimiento de un aparato que
 * empiece así. Y además el reductor exige `quien === null` (`leerElBotin`). Un aparato manipulado
 * que mande `{ tipo: 'arcade:botin' }` no llega ni al reductor; y si un día alguien abre el prefijo
 * por error, el reductor sigue diciendo que no.
 *
 * ═══ QUÉ DICE Y QUÉ NO ═══
 *
 * Sólo QUIÉN lo pierde (`de`, el que cayó) y QUIÉN se lo lleva (`para`, el que lo tumbó). CUÁNTO y
 * QUÉ lo decide cada juego, que es el único que sabe qué vale en su mesa: Riberas roba una ficha al
 * azar de su propio azar —el de `elRobo`—, el Burgo cobra dinero con tope y Las Lindes pasa puntos
 * con tope. Si quien cae no lleva nada, el reductor devuelve el MISMO estado: la mesa lo cuenta
 * como un movimiento que no cambió nada, y no queda en la crónica un robo de cero.
 *
 * El combate —quién golpeó a quién, las vidas, los tiempos, el tope de una vez por minuto y pareja—
 * NO entra en el estado del juego: vive en la sala del servidor (`server/src/botas/`) y muere con
 * ella. Al juego sólo le llega el veredicto.
 *
 * ═══ UN JUEGO QUE SE RECORRE, ATIENDE EL BOTÍN ═══
 *
 * Un arcade con mundo (`mundos.ts`) admite mesas `botas`, y en una mesa `botas` se cae; así que su
 * reductor atiende este movimiento ANTES de su portillo de opciones —como el tic: nadie lo ofrece,
 * así que el portillo lo tiraría—. `verify:botin` lo exige a cada juego del registro de mundos.
 */
import type { AsientoId } from '../tipos';

/** El tipo del movimiento. */
export const TIPO_DEL_BOTIN = 'arcade:botin';

/** Lo que lleva dentro: quién lo pierde y quién se lo lleva. Dos asientos distintos de la mesa. */
export interface CargaDelBotin {
  readonly de: AsientoId;
  readonly para: AsientoId;
}

/** El movimiento entero, como lo construye el servidor. */
export function movimientoDelBotin(de: AsientoId, para: AsientoId): { tipo: string; carga: CargaDelBotin } {
  return { tipo: TIPO_DEL_BOTIN, carga: { de, para } };
}

/** ¿Es un botín? Sólo mira el tipo; si es VÁLIDO lo dice `leerElBotin`. */
export function esBotin(movimiento: { readonly tipo: string }): boolean {
  return movimiento.tipo === TIPO_DEL_BOTIN;
}

/**
 * LA CARGA, LEÍDA CON DESCONFIANZA. `null` si lo manda alguien (`quien` no es `null`), si la carga no
 * es exactamente `{ de, para }` de cadenas, si alguno no está sentado en la mesa o si son el mismo.
 *
 * Un reductor que reciba `null` RECHAZA el movimiento: no hay botín a medias. Lo que esto no puede
 * saber —que los dos juegan de verdad en la partida, que la partida está en juego— lo mira el
 * reductor, que es quien lo sabe.
 */
export function leerElBotin(
  carga: unknown,
  quien: AsientoId | null,
  asientos: readonly AsientoId[],
): CargaDelBotin | null {
  if (quien !== null) return null;
  if (typeof carga !== 'object' || carga === null || Array.isArray(carga)) return null;
  if (Object.keys(carga).length !== 2) return null;
  const { de, para } = carga as { readonly de?: unknown; readonly para?: unknown };
  if (typeof de !== 'string' || typeof para !== 'string') return null;
  if (de === para) return null;
  if (!asientos.includes(de) || !asientos.includes(para)) return null;
  return { de, para };
}
