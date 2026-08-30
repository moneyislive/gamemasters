/**
 * El secreto con el que se firma todo.
 *
 * POR QUÉ EXISTE ESTE FICHERO. Antes no había secreto: las credenciales de los
 * jugadores y la cookie del taller se firmaban con la contraseña de la casa, y
 * si no había contraseña, con una constante escrita en el código fuente. Eso
 * abría dos agujeros a la vez, y los dos se cerraron aquí:
 *
 *   1. Sin contraseña, la clave de firma era pública. Cualquier invitado podía
 *      fabricarse la credencial de OTRO jugador —solo hacen falta su `gameId`
 *      y su `participanteId`, que la propia vista le da— y leer su dosier entero:
 *      secreto, motivo y «soyCulpable». Es decir, la solución en la ronda uno.
 *      Se comprobó fabricando un testigo válido sin conocer nada.
 *
 *   2. Con contraseña, cada invitado recibía un par (texto conocido, firma)
 *      bajo una clave que era esa contraseña. Un SHA-256 sin endurecer se
 *      prueba a miles de millones por segundo: la contraseña de la casa se
 *      recuperaba sin conexión, en minutos, desde el móvil de un invitado.
 *
 * Una contraseña que elige una persona no puede ser NUNCA una clave
 * criptográfica. Es esa la regla que se rompía.
 *
 * QUÉ PROPIEDAD SE CONSERVA. Cambiar la contraseña seguía teniendo que
 * invalidar las sesiones abiertas, y lo sigue haciendo: la contraseña pasa a
 * viajar en el MENSAJE que se firma, no en la clave. Cambia el mensaje, cambia
 * la firma, caducan las cookies. Y quien tenga una cookie no puede volver del
 * revés la contraseña, porque le falta el secreto.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const FICHERO = 'secreto-de-firma';
const VARIABLE = 'PLAYER_TOKEN_SECRET';

let cacheado: string | undefined;

function enProduccion(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Genera y guarda un secreto para desarrollo.
 *
 * Se persiste en el directorio de datos a propósito: si se generara en cada
 * arranque, reiniciar el servidor a mitad de una partida echaría a los doce
 * invitados de la mesa. Con `tsx watch` eso pasa cada vez que se toca un
 * fichero.
 */
function secretoDeDesarrollo(): string {
  const dir = path.resolve(process.cwd(), 'data');
  const ruta = path.join(dir, FICHERO);
  try {
    const guardado = fs.readFileSync(ruta, 'utf8').trim();
    if (guardado.length >= 32) return guardado;
  } catch {
    /* todavía no existe */
  }

  const nuevo = crypto.randomBytes(32).toString('hex');
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(ruta, nuevo, { encoding: 'utf8', mode: 0o600 });
    console.warn(
      `[seguridad] No hay ${VARIABLE}. Se ha generado uno para desarrollo y se ha guardado en ` +
        `${path.relative(process.cwd(), ruta)}. En producción es OBLIGATORIO definirlo.`,
    );
  } catch {
    console.warn(
      `[seguridad] No hay ${VARIABLE} y no se ha podido guardar uno. Se usará uno efímero: al ` +
        'reiniciar, quien esté jugando tendrá que volver a entrar con su código.',
    );
  }
  return nuevo;
}

/**
 * El secreto de firma.
 *
 * @throws si falta en producción. Es deliberado: arrancar sin él dejaría la
 * partida abierta de par en par, y un servidor que se cae al arrancar se
 * arregla en cinco minutos, mientras que uno que arranca inseguro no se
 * arregla nunca porque nadie se entera.
 */
export function secretoDeFirma(): string {
  if (cacheado) return cacheado;

  const declarado = process.env[VARIABLE]?.trim();
  if (declarado && declarado.length >= 32) {
    cacheado = declarado;
    return cacheado;
  }

  if (declarado) {
    throw new Error(
      `${VARIABLE} es demasiado corto: hacen falta al menos 32 caracteres. ` +
        'Genera uno con:  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }

  if (enProduccion()) {
    throw new Error(
      `Falta ${VARIABLE} y esto es producción. Sin él, las credenciales de los jugadores se ` +
        'podrían falsificar y cualquiera leería el dosier de los demás.\n' +
        'Genera uno con:  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }

  cacheado = secretoDeDesarrollo();
  return cacheado;
}

/** Firma un mensaje con el secreto del servidor. Devuelve base64url. */
export function firmarConSecreto(mensaje: string): string {
  return crypto
    .createHmac('sha256', secretoDeFirma())
    .update(mensaje)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Comparación en tiempo constante, tolerante a longitudes distintas. */
export function igualSeguro(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
