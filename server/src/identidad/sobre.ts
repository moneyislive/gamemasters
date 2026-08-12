/**
 * Sobres firmados con dominio.
 *
 * EL PROBLEMA QUE EVITA. En este servidor ya conviven tres clases de testigo
 * firmados con el MISMO secreto: la credencial del jugador (`live/token.ts`),
 * la cookie del taller (`auth.ts`) y el enlace de una foto (`live/fotos.ts`).
 * Mientras cada uno firme un mensaje con una forma distinta no pasa nada, pero
 * eso es una propiedad accidental, no una garantía: el día que dos formatos se
 * parezcan, una firma emitida para una cosa valdrá para otra. Es un fallo
 * clásico y silencioso, y cuando ocurre no hay traza de nada.
 *
 * Aquí el dominio va DENTRO del mensaje firmado, así que un sobre de
 * `cuenta:v1` no puede abrirse como `invitacion:v1` ni al revés, por mucho que
 * el secreto sea el mismo.
 *
 * POR QUÉ `live/token.ts` NO SE MIGRA A ESTO. Cambiar el mensaje que se firma
 * invalidaría todas las credenciales vivas, y eso echa de la mesa a quien esté
 * jugando una campaña de varias jornadas —justo lo que `token.ts` explica que
 * quiso evitar con sus 30 días—. Y no hace falta: la carga de una credencial es
 * base64url, un alfabeto que NO contiene dos puntos, así que jamás puede
 * confundirse con un mensaje `cuenta:v1.…`. Está razonado, y `verificar-cuentas`
 * lo comprueba en vez de darlo por bueno.
 */
import { firmarConSecreto, igualSeguro } from '../secreto';

/** Los dominios que existen. Añadir uno es añadirlo aquí, y en ningún otro sitio. */
export type Dominio = 'cuenta:v1' | 'invitacion:v1' | 'nonce:v1' | 'canje:v1';

const b64url = (d: Buffer | string): string =>
  Buffer.from(d).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const deB64url = (s: string): string =>
  Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');

/**
 * Cierra un sobre. La caducidad es obligatoria: un testigo sin fecha de
 * caducidad es un testigo para siempre, y aquí no hay ninguno que lo merezca.
 */
export function cerrarSobre<T extends object>(
  dominio: Dominio,
  cuerpo: T,
  segundos: number,
): string {
  const ahora = Math.floor(Date.now() / 1000);
  const carga = b64url(JSON.stringify({ ...cuerpo, iat: ahora, exp: ahora + segundos }));
  return `${carga}.${firmarConSecreto(`${dominio}.${carga}`)}`;
}

/**
 * Abre un sobre del dominio que se pide. Devuelve `null` ante cualquier duda:
 * firma que no cuadra, dominio que no es, caducado, o simplemente basura.
 */
export function abrirSobre<T>(
  dominio: Dominio,
  testigo: string | undefined,
): (T & { iat: number; exp: number }) | null {
  if (!testigo) return null;
  const punto = testigo.lastIndexOf('.');
  if (punto <= 0) return null;

  const carga = testigo.slice(0, punto);
  const firma = testigo.slice(punto + 1);
  if (!igualSeguro(firma, firmarConSecreto(`${dominio}.${carga}`))) return null;

  try {
    const cuerpo = JSON.parse(deB64url(carga)) as T & { iat: number; exp: number };
    if (typeof cuerpo.exp !== 'number' || cuerpo.exp * 1000 < Date.now()) return null;
    return cuerpo;
  } catch {
    return null;
  }
}
