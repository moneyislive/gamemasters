/**
 * El pase de temporada de la Sala de Arcade: quién puede llevar un aspecto
 * exclusivo.
 *
 * ═══ POR FORMA, NO POR LISTA ═══
 *
 * El servidor no sabe qué aventureros existen —lo sabe `escenas/`, que es quien
 * los dibuja— y así tiene que seguir: el núcleo del arcade no nombra ningún
 * aspecto. Lo que sí puede saber es la FORMA de un nombre, igual que ya valida
 * que una figura sea `^[a-z0-9-]+$`. Así que la regla es una convención: toda
 * figura cuyo id empieza por `pase-` es del pase, y el resto es de todos. Un
 * aspecto nuevo del pase entra en el catálogo de `escenas/` con ese prefijo y el
 * servidor lo protege sin que nadie toque esta carpeta.
 *
 * ═══ QUÉ SE PUEDE VENDER Y QUÉ NO ═══
 *
 * Solo estética: un aspecto no puede cambiar el tamaño, la silueta que se ve
 * desde lejos ni nada que dé ventaja, y nunca puede ser botín ni transferirse
 * (ver `docs/COMBATE-Y-BOTIN.md`: lo que se apuesta no se compra con dinero).
 * El choque de Boots on Board ya usa un radio fijo y no la figura.
 *
 * ═══ SIN COBRO, NO HAY PUERTA ═══
 *
 * Con `COBRO_ACTIVO` apagado no hay forma de comprar el pase, así que sus
 * aspectos no se bloquean: estarían cerrados para siempre.
 */
import type { Request } from 'express';
import type { Account } from '../../../shared/live';
import type { PaseDeTemporada } from '../../../shared/cobro';
import { getStore } from '../db/store';
import { pasaporteVigente, sesionDeCuentaDePeticion } from '../identidad/sesion';
import { admitidoEnElTaller } from '../identidad/cuentas-proveedor';
import { COBRO_ACTIVO } from './ofertas';

export const PREFIJO_DEL_PASE = 'pase-';

export function esDelPase(figura: string | undefined): boolean {
  return typeof figura === 'string' && figura.startsWith(PREFIJO_DEL_PASE);
}

/** El pase que tiene vigente esta cuenta, si tiene alguno. */
export function paseVigente(cuenta: Account | null | undefined, ahora = new Date()): PaseDeTemporada | undefined {
  const iso = ahora.toISOString();
  return (cuenta?.cobro?.pases ?? []).find((p) => p.hasta > iso);
}

export type PermisoDeFigura = { ok: true } | { ok: false; estado: 401 | 403; error: string; motivo: string };

/**
 * ¿Puede quien llama llevar esta figura?
 *
 * Mira la cuenta por el pasaporte (`X-GM-Cuenta` o la cookie), que es lo que la
 * app manda cuando hay sesión. El asiento sigue siendo anónimo: la cuenta solo
 * se consulta para esto, y nada de ella entra en el estado de la mesa.
 */
export async function puedeLlevar(req: Request, figura: string | undefined): Promise<PermisoDeFigura> {
  if (!COBRO_ACTIVO || !esDelPase(figura)) return { ok: true };
  const pasaporte = sesionDeCuentaDePeticion(req);
  const cuenta = pasaporte ? await getStore().getAccount(pasaporte.cuentaId) : null;
  if (!pasaporte || !cuenta || !pasaporteVigente(pasaporte, cuenta)) {
    return {
      ok: false,
      estado: 401,
      error: 'Ese aspecto es del Pase de la Sala: entra con tu cuenta para llevarlo.',
      motivo: 'figura-sin-cuenta',
    };
  }
  if (admitidoEnElTaller(cuenta) || paseVigente(cuenta)) return { ok: true };
  return {
    ok: false,
    estado: 403,
    error: 'Ese aspecto es del Pase de la Sala de esta temporada, y tu cuenta no lo tiene.',
    motivo: 'figura-sin-pase',
  };
}
