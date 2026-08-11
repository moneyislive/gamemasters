/**
 * Cuentas de taller sin proveedor, mientras no haya Google ni Apple.
 *
 * QUÉ ES Y QUÉ NO ES. Esto es ORGANIZACIÓN, no seguridad, y conviene decirlo
 * con todas las letras: quien tiene la contraseña de la casa puede escribir
 * cualquier nombre y quedarse con esa cuenta. No es un agujero nuevo —hoy la
 * contraseña es compartida y quien la tiene lo ve absolutamente todo— pero
 * tampoco es una identidad.
 *
 * Sirve para dos cosas de verdad:
 *
 *   1. Que «cada uno ve sus partidas» se pueda construir y probar HOY, sin
 *      esperar a que existan las credenciales de los proveedores.
 *   2. Que quien ya dirige veladas empiece a tener sus partidas atribuidas,
 *      para que el día que vincule su cuenta de Google no se encuentre un
 *      taller vacío.
 *
 * Y LO IMPORTANTE: en cuanto una cuenta vincula un proveedor de verdad, deja de
 * poder reclamarse por nombre. Sin eso, teclear «Miguel» sería una puerta
 * trasera permanente a una cuenta ya verificada — que es justo lo contrario de
 * lo que se está construyendo.
 */
import { nanoid } from 'nanoid';
import { getStore } from '../db/store';
import type { Account } from '../../../shared/live';

/**
 * El correo interno de una cuenta de casa.
 *
 * No es una dirección real y no se le escribe a nadie: es la clave con la que
 * el almacén la encuentra, en un dominio reservado que nunca puede coincidir
 * con el correo de una persona.
 */
function correoDeCasa(nombre: string): string {
  const limpio = nombre
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${limpio || 'anonimo'}@casa.gamemasters.invalid`;
}

/** ¿Esta cuenta nació de la contraseña de la casa y sigue sin proveedor? */
export function esCuentaDeCasa(cuenta: Account): boolean {
  return (
    cuenta.email.endsWith('@casa.gamemasters.invalid') && (cuenta.identidades?.length ?? 0) === 0
  );
}

/**
 * Recupera —o crea— la cuenta de taller de ese nombre.
 *
 * Devuelve `null` si el nombre corresponde a una cuenta que YA vinculó un
 * proveedor: a partir de ahí solo se entra con él.
 */
export async function cuentaDeCasa(nombre: string): Promise<Account | null> {
  const store = getStore();
  const correo = correoDeCasa(nombre);

  const existente = await store.getAccountByEmail(correo);
  if (existente) return esCuentaDeCasa(existente) ? existente : null;

  const nueva: Account = {
    id: nanoid(12),
    email: correo,
    displayName: nombre.trim().slice(0, 60) || 'Game Master',
    createdAt: new Date().toISOString(),
    partidas: [],
    trofeos: [],
    identidades: [],
    correos: [],
    /*
     * Quien tiene la llave de la casa administra la casa. Es coherente con lo
     * que ya podía hacer: la contraseña compartida siempre lo abrió todo.
     *
     * Las cuentas de PROVEEDOR no reciben esto: para ellas manda `GM_ADMITIDOS`
     * (ver `identidad/cuentas-proveedor.ts`), porque quién administra la
     * instalación es una decisión de quien la administra, no algo que se gane
     * iniciando sesión con Google.
     */
    taller: true,
  };
  return store.saveAccount(nueva);
}
