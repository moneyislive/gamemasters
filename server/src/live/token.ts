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
 *
 * TRES COSAS QUE NO SE PUEDEN QUITAR, y cada una tapa un agujero que estuvo
 * abierto:
 *
 *   · La CLAVE es un secreto propio del servidor (`secreto.ts`), no la
 *     contraseña de la casa. Antes, sin contraseña, la clave era una constante
 *     del código y cualquier invitado fabricaba el testigo de otro jugador para
 *     leerle el dosier —y con él, quién es el culpable—.
 *
 *   · `exp` CADUCA. Antes el testigo llevaba la hora de emisión y nadie la
 *     miraba: valía para siempre, y una captura de pantalla o una copia del
 *     móvil daba acceso perpetuo.
 *
 *   · `sid` ATA el testigo a ESTA sesión en vivo. Antes, cerrar la partida y
 *     reabrirla repartía códigos nuevos pero los `suspectId` eran los mismos,
 *     así que el testigo viejo volvía a valer al instante: rotar los códigos no
 *     servía absolutamente de nada.
 */
import { firmarConSecreto, igualSeguro } from '../secreto';

export interface CredencialJugador {
  gameId: string;
  suspectId: string;
  /** Identificador de la sesión en vivo para la que se emitió. */
  sid?: string;
  /** Emitido en (segundos epoch). */
  iat: number;
  /** Caduca en (segundos epoch). */
  exp?: number;
}

/**
 * Cuánto vale un testigo.
 *
 * Treinta días, y no menos, porque una campaña de rol se juega por jornadas
 * separadas por semanas: caducar antes obligaría a repartir códigos otra vez en
 * mitad de una historia. La revocación de verdad no la da el reloj, la da
 * `sid`: cerrar y reabrir la partida invalida al instante todo lo emitido.
 */
const DURACION_SEGUNDOS = 60 * 60 * 24 * 30;

function base64url(dato: Buffer | string): string {
  return Buffer.from(dato)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function emitirCredencial(gameId: string, suspectId: string, sid?: string): string {
  const ahora = Math.floor(Date.now() / 1000);
  const cuerpo: CredencialJugador = {
    gameId,
    suspectId,
    ...(sid ? { sid } : {}),
    iat: ahora,
    exp: ahora + DURACION_SEGUNDOS,
  };
  const carga = base64url(JSON.stringify(cuerpo));
  return `${carga}.${firmarConSecreto(carga)}`;
}

/** Devuelve la credencial si la firma es válida y no ha caducado; null si no. */
export function verificarCredencial(testigo: string | undefined): CredencialJugador | null {
  if (!testigo) return null;
  const punto = testigo.lastIndexOf('.');
  if (punto <= 0) return null;
  const carga = testigo.slice(0, punto);
  const firma = testigo.slice(punto + 1);
  if (!igualSeguro(firma, firmarConSecreto(carga))) return null;

  try {
    const datos = JSON.parse(
      Buffer.from(carga.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
    ) as CredencialJugador;
    if (typeof datos.gameId !== 'string' || typeof datos.suspectId !== 'string') return null;

    // Sin `exp` es un testigo anterior a que existiera la caducidad. No se
    // acepta: emitirlos ya no ocurre, y darle validez indefinida sería
    // conservar justo el agujero que este campo vino a tapar.
    if (typeof datos.exp !== 'number' || datos.exp <= Math.floor(Date.now() / 1000)) return null;

    return datos;
  } catch {
    return null;
  }
}

/**
 * ¿Vale este testigo para la sesión que hay ahora mismo?
 *
 * Se comprueba aparte de la firma porque hace falta la sesión, y `verificar` es
 * deliberadamente sin estado. Una sesión sin `sid` es de antes de este cambio:
 * se deja pasar para no echar a nadie de una partida a medio jugar, y quedará
 * atada en cuanto se reabra.
 */
export function credencialValidaPara(
  cred: CredencialJugador,
  sesion: { sid?: string } | null | undefined,
): boolean {
  if (!sesion?.sid) return true;
  return cred.sid === sesion.sid;
}

/** Lee el testigo de la cabecera `Authorization: Bearer …`. */
export function credencialDePeticion(cabecera: string | undefined): CredencialJugador | null {
  if (!cabecera?.startsWith('Bearer ')) return null;
  return verificarCredencial(cabecera.slice(7).trim());
}
