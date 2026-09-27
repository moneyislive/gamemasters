/**
 * El monedero de cada cuenta: un libro de movimientos y nada más.
 *
 * ═══ EL SALDO ES LA SUMA DEL LIBRO ═══
 *
 * No hay un campo `saldo` que mantener al día: se suma. Así el saldo no puede
 * desincronizarse de su historia, y la respuesta a «¿por qué tengo esto?» es la
 * lista de movimientos. Una cuenta tiene decenas de movimientos, no millones:
 * sumarlos es instantáneo.
 *
 * ═══ UN CARGO NO PUEDE DEJAR EL SALDO EN NEGATIVO ═══
 *
 * «Mirar el saldo y luego apuntar» tiene una ventana: dos generaciones lanzadas
 * a la vez verían las dos saldo suficiente y cobrarían las dos. Se cierra con un
 * candado por cuenta EN ESTE PROCESO, que es lo que hay: el servidor es uno solo
 * (lo dice `render.yaml`, y ya se apoyan en eso el candado de la mesa en vivo y
 * los topes diarios). Si algún día hay dos procesos, esto es lo primero que hay
 * que llevar a la base de datos.
 *
 * ═══ LA BOLSA DEL MES SE GASTA PRIMERO ═══
 *
 * Lo comprado suelto no caduca; lo que trae la suscripción, sí, al renovar. Para
 * que nadie pierda lo que pagó aparte, cada cargo se descuenta primero de la
 * bolsa del mes. `delMes` calcula cuánto queda de ella.
 */
import { nanoid } from 'nanoid';
import type { MovimientoDeSaldo, TipoDeMovimiento } from '../../../shared/cobro';
import { getStore } from '../db/store';

/** Candados por cuenta: una promesa encadenada por cuenta. */
const colas = new Map<string, Promise<unknown>>();

async function enExclusiva<T>(cuentaId: string, trabajo: () => Promise<T>): Promise<T> {
  const anterior = colas.get(cuentaId) ?? Promise.resolve();
  let soltar!: () => void;
  const turno = new Promise<void>((r) => (soltar = r));
  const cola = anterior.then(() => turno);
  colas.set(cuentaId, cola);
  await anterior.catch(() => undefined);
  try {
    return await trabajo();
  } finally {
    soltar();
    // Si nadie más ha puesto su turno detrás, la cuenta sale del mapa: sin esto
    // el mapa crecería una entrada por cuenta que alguna vez pagó algo.
    if (colas.get(cuentaId) === cola) colas.delete(cuentaId);
  }
}

export function saldoDe(movimientos: MovimientoDeSaldo[]): number {
  return movimientos.reduce((suma, m) => suma + m.creditos, 0);
}

/**
 * Cuánto queda de la bolsa del mes: lo que trajo la última renovación menos lo
 * que se ha cargado desde entonces (neto de reembolsos), sin bajar de cero ni
 * pasar del saldo.
 */
export function delMesDe(movimientos: MovimientoDeSaldo[]): number {
  const orden = [...movimientos].sort((a, b) => a.el.localeCompare(b.el));
  let ultima = -1;
  orden.forEach((m, i) => {
    if (m.tipo === 'suscripcion') ultima = i;
  });
  if (ultima === -1) return 0;
  const bolsa = orden[ultima]!.creditos;
  const gastado = orden
    .slice(ultima + 1)
    .filter((m) => m.tipo === 'cargo' || m.tipo === 'reembolso')
    .reduce((suma, m) => suma - m.creditos, 0);
  return Math.max(0, Math.min(bolsa - gastado, saldoDe(movimientos)));
}

function nuevo(
  cuentaId: string,
  tipo: TipoDeMovimiento,
  creditos: number,
  concepto: string,
  extra: { gameId?: string; referencia?: string } = {},
): MovimientoDeSaldo {
  return {
    id: nanoid(12),
    cuentaId,
    tipo,
    creditos: Math.round(creditos),
    concepto,
    ...(extra.gameId ? { gameId: extra.gameId } : {}),
    ...(extra.referencia ? { referencia: extra.referencia } : {}),
    el: new Date().toISOString(),
  };
}

/**
 * Apunta una entrada de créditos (compra, bolsa del mes, regalo). IDEMPOTENTE
 * por `referencia`: el aviso de pago que llega dos veces suma una.
 */
export async function abonar(
  cuentaId: string,
  tipo: Extract<TipoDeMovimiento, 'compra' | 'suscripcion' | 'regalo' | 'reembolso'>,
  creditos: number,
  concepto: string,
  extra: { gameId?: string; referencia?: string } = {},
): Promise<{ movimiento: MovimientoDeSaldo; nuevo: boolean }> {
  return enExclusiva(cuentaId, async () => {
    const store = getStore();
    if (extra.referencia) {
      const ya = await store.movimientoPorReferencia(extra.referencia);
      if (ya) return { movimiento: ya, nuevo: false };
    }
    // Antes de una bolsa nueva, lo que quede de la anterior caduca.
    if (tipo === 'suscripcion') {
      const quedaba = delMesDe(await store.movimientosDe(cuentaId));
      if (quedaba > 0) {
        await store.apuntarMovimiento(nuevo(cuentaId, 'caducidad', -quedaba, 'Lo que quedaba de la bolsa del mes anterior'));
      }
    }
    const movimiento = nuevo(cuentaId, tipo, Math.abs(creditos), concepto, extra);
    await store.apuntarMovimiento(movimiento);
    return { movimiento, nuevo: true };
  });
}

/**
 * Cobra un cargo SOLO si hay saldo. Devuelve el movimiento, o el saldo que había
 * si no alcanzaba. Idempotente por `referencia`, como `abonar`.
 */
export async function cargar(
  cuentaId: string,
  creditos: number,
  concepto: string,
  extra: { gameId?: string; referencia?: string } = {},
): Promise<{ ok: true; movimiento: MovimientoDeSaldo } | { ok: false; saldo: number }> {
  return enExclusiva(cuentaId, async () => {
    const store = getStore();
    if (extra.referencia) {
      const ya = await store.movimientoPorReferencia(extra.referencia);
      if (ya) return { ok: true as const, movimiento: ya };
    }
    const saldo = saldoDe(await store.movimientosDe(cuentaId));
    if (saldo < creditos) return { ok: false as const, saldo };
    const movimiento = nuevo(cuentaId, 'cargo', -Math.abs(creditos), concepto, extra);
    await store.apuntarMovimiento(movimiento);
    return { ok: true as const, movimiento };
  });
}

/**
 * Devuelve un cargo entero. Idempotente: un reembolso por cargo, se pida las
 * veces que se pida.
 */
export async function reembolsar(cargo: MovimientoDeSaldo, motivo: string): Promise<MovimientoDeSaldo> {
  const { movimiento } = await abonar(cargo.cuentaId, 'reembolso', Math.abs(cargo.creditos), motivo, {
    ...(cargo.gameId ? { gameId: cargo.gameId } : {}),
    referencia: `reembolso:${cargo.id}`,
  });
  return movimiento;
}
