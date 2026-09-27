/**
 * A quién se le cobra una operación del taller, o por qué a nadie.
 *
 * ═══ LA CASA NO PAGA ═══
 *
 * Quien entra con la contraseña de la casa, o en modo abierto en local, es quien
 * administra la instalación: paga la clave de API directamente y cobrarle
 * créditos sería cobrarse a sí mismo. Tampoco pagan las cuentas de
 * `GM_ADMITIDOS` —las que la casa ha invitado a dirigir—, salvo que se diga lo
 * contrario con `COBRO_EXENTOS_ADMITIDOS=no`.
 *
 * Sin `COBRO_ACTIVO`, nadie paga: es como funciona la plataforma hoy.
 */
import type { Request } from 'express';
import type { Account } from '../../../shared/live';
import { identidadDeTaller, llevaLaLlaveDeLaCasa } from '../auth';
import { esCuentaDeCasa } from '../taller/cuenta-de-casa';
import { admitidoEnElTaller } from '../identidad/cuentas-proveedor';
import { getStore } from '../db/store';
import { COBRO_ACTIVO } from './ofertas';

const ADMITIDOS_EXENTOS = process.env.COBRO_EXENTOS_ADMITIDOS?.trim().toLowerCase() !== 'no';

export type Pagador =
  | { tipo: 'exento'; motivo: 'cobro-apagado' | 'casa' | 'admitido' }
  | { tipo: 'cuenta'; cuenta: Account };

/** Quién paga esta petición, o `null` si no hay nadie identificado a quien cobrar. */
export async function pagadorDe(req: Request): Promise<Pagador | null> {
  if (!COBRO_ACTIVO) return { tipo: 'exento', motivo: 'cobro-apagado' };
  const quien = identidadDeTaller(req);
  if (!quien) return null;
  if (quien.tipo === 'casa' || quien.tipo === 'abierto') return { tipo: 'exento', motivo: 'casa' };
  // Con contraseña y nombre manda el pasaporte, pero sigue siendo la casa.
  if (llevaLaLlaveDeLaCasa(req)) return { tipo: 'exento', motivo: 'casa' };
  const cuenta = await getStore().getAccount(quien.cuentaId);
  if (!cuenta) return null;
  if (esCuentaDeCasa(cuenta)) return { tipo: 'exento', motivo: 'casa' };
  if (ADMITIDOS_EXENTOS && admitidoEnElTaller(cuenta)) return { tipo: 'exento', motivo: 'admitido' };
  return { tipo: 'cuenta', cuenta };
}
