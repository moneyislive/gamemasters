/**
 * La sesión de cuenta: quién eres en la plataforma.
 *
 * LO QUE ESTA SESIÓN **NO** HACE, y es lo más importante del fichero: NO
 * autoriza a jugar. Nunca. Lo único que autoriza a jugar es la credencial de
 * jugador de `live/token.ts`, que va atada a la apertura concreta de una
 * partida —su `sid`— y por eso cerrar y reabrir la mesa echa a todo el mundo.
 * Esa es la única revocación de verdad que tiene el juego, y costó descubrirlo:
 * sin ella, rotar los códigos no servía de nada.
 *
 * Si una sesión de cuenta pudiera entrar directamente en `/api/jugar/*`, ese
 * agujero volvería a abrirse entero y nadie se enteraría, porque la
 * comprobación que lo vigila seguiría en verde. Así que una sesión de cuenta
 * solo sirve para PEDIR una credencial por la vía normal.
 *
 * De ahí también que viaje por su propia puerta —la cabecera `X-GM-Cuenta` o la
 * cookie `gm_cuenta`— y jamás por `Authorization`, que es del jugador. Con
 * cabeceras separadas, un 401 de una no puede echarte de la otra.
 */
import { abrirSobre, cerrarSobre } from './sobre';
import type { Request } from 'express';
import type { Account } from '../../../shared/live';
import type { ProveedorId, SesionDeCuenta } from '../../../shared/identidad';

/** 90 días: esto es una plataforma con usuarios, no una velada. */
const DURACION_SEGUNDOS = 60 * 60 * 24 * 90;

export const COOKIE_CUENTA = 'gm_cuenta';
export const CABECERA_CUENTA = 'x-gm-cuenta';

export function emitirSesionDeCuenta(cuenta: Account, via: ProveedorId): string {
  return cerrarSobre('cuenta:v1', { cuentaId: cuenta.id, via }, DURACION_SEGUNDOS);
}

/** Lee una cookie concreta de la cabecera, sin dependencias externas. */
function leerCookie(req: Request, nombre: string): string | undefined {
  const cabecera = req.headers.cookie;
  if (!cabecera) return undefined;
  for (const parte of cabecera.split(';')) {
    const separador = parte.indexOf('=');
    if (separador === -1) continue;
    if (parte.slice(0, separador).trim() === nombre) {
      return decodeURIComponent(parte.slice(separador + 1).trim());
    }
  }
  return undefined;
}

/**
 * El pasaporte de la petición, si trae uno válido.
 *
 * SÍNCRONA a propósito: la usan el guardián del taller y el de las fotos, que
 * se ejecutan en cada petición. Solo comprueba la firma y la caducidad; no
 * toca el almacén y por tanto no sabe nada de revocaciones. Para eso está
 * `cuentaDePeticion`.
 */
export function sesionDeCuentaDePeticion(req: Request): SesionDeCuenta | null {
  const cabecera = req.headers[CABECERA_CUENTA];
  const bruto = typeof cabecera === 'string' ? cabecera : leerCookie(req, COOKIE_CUENTA);
  return abrirSobre<SesionDeCuenta>('cuenta:v1', bruto);
}
