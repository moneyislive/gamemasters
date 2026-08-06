/**
 * Credencial del jugador.
 *
 * Un móvil no puede guardar una cookie de sesión de la casa: quien juega no
 * conoce —ni debe conocer— la contraseña del Game Master. Así que cada jugador
 * recibe al emparejarse un testigo firmado que dice exactamente quién es en qué
 * partida, y lo presenta en cada petición.
 *
 * Sin estado en el servidor: el testigo se verifica con HMAC, así que sobrevive
 * a reinicios y a varias instancias detrás de un balanceador. Es la pieza que
 * permite escalar sin sesiones pegajosas.
 */
import crypto from 'node:crypto';
import { env } from '../config';

export interface CredencialJugador {
  gameId: string;
  suspectId: string;
  /** Emitido en (segundos epoch). */
  iat: number;
}

/**
 * Clave de firma. Se deriva de la contraseña de la casa si la hay, para que
 * cambiarla invalide los testigos; si no, de una constante de desarrollo.
 */
function clave(): string {
  return `gamemasters:jugador:v1:${env.appPassword ?? 'sin-contrasena'}`;
}

function base64url(dato: Buffer | string): string {
  return Buffer.from(dato)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function firmar(carga: string): string {
  return base64url(crypto.createHmac('sha256', clave()).update(carga).digest());
}

/** Comparación en tiempo constante, tolerante a longitudes distintas. */
function igualSeguro(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function emitirCredencial(gameId: string, suspectId: string): string {
  const cuerpo: CredencialJugador = {
    gameId,
    suspectId,
    iat: Math.floor(Date.now() / 1000),
  };
  const carga = base64url(JSON.stringify(cuerpo));
  return `${carga}.${firmar(carga)}`;
}

/** Devuelve la credencial si la firma es válida; null en cualquier otro caso. */
export function verificarCredencial(testigo: string | undefined): CredencialJugador | null {
  if (!testigo) return null;
  const punto = testigo.lastIndexOf('.');
  if (punto <= 0) return null;
  const carga = testigo.slice(0, punto);
  const firma = testigo.slice(punto + 1);
  if (!igualSeguro(firma, firmar(carga))) return null;
  try {
    const datos = JSON.parse(
      Buffer.from(carga.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
    ) as CredencialJugador;
    if (typeof datos.gameId !== 'string' || typeof datos.suspectId !== 'string') return null;
    return datos;
  } catch {
    return null;
  }
}

/** Lee el testigo de la cabecera `Authorization: Bearer …`. */
export function credencialDePeticion(cabecera: string | undefined): CredencialJugador | null {
  if (!cabecera?.startsWith('Bearer ')) return null;
  return verificarCredencial(cabecera.slice(7).trim());
}
