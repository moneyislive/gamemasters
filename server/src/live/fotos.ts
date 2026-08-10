/**
 * Fotos para la app del jugador, con enlace firmado.
 *
 * EL PROBLEMA. Las fotos se sirven en `/uploads`, y ese camino está detrás de
 * la contraseña de la casa: `index.ts` deja pasar solo a quien traiga la cookie
 * `gm_sesion`. La app del jugador no tiene esa cookie —ni debe tenerla, porque
 * es la contraseña del Game Master— sino una credencial `Bearer`. Resultado: en
 * cuanto se publica con `APP_PASSWORD` (obligatoria en producción), TODAS las
 * fotos devuelven 401. El retrato del personaje, las fotos de las salas y la
 * vista cenital del tablero: tres pantallas con huecos negros y sin un mensaje
 * que explique nada.
 *
 * POR QUÉ UN ENLACE FIRMADO Y NO UNA CABECERA. Lo natural sería mandar el
 * `Authorization` con la imagen, y en React Native se puede (`source.headers`).
 * Pero esta app también se juega desde el navegador, y ahí `<Image>` acaba
 * siendo un `<img src>` que no admite cabeceras: habría arreglado el móvil y
 * dejado la web rota. El enlace firmado funciona igual en los dos sitios.
 *
 * POR QUÉ NO CADUCA. Un enlace que cambia se vuelve a descargar, y con doce
 * móviles en la wifi de una casa eso se nota. La firma es estable, así que el
 * teléfono cachea la foto y no la vuelve a pedir. A cambio, un enlace filtrado
 * vale hasta que se rote el secreto —que es exactamente el mismo alcance que ya
 * tienen las credenciales de los jugadores, así que no abre un frente nuevo—.
 * Y lo que concede es una foto concreta de una partida concreta, no el
 * directorio: sin firma no se puede ni enumerar.
 */
import path from 'node:path';
import { firmarConSecreto, igualSeguro } from '../secreto';

/**
 * Nombres admitidos: los que fabrica `uploads.ts`, `nanoid(12)` más extensión.
 *
 * Se filtra por lo que se ACEPTA, no por lo que se prohíbe. Una lista de cosas
 * malas siempre se queda corta —«..», «..%2f», rutas absolutas, separadores de
 * Windows— y basta con que se escape una para leer ficheros de fuera.
 */
const NOMBRE_VALIDO = /^[A-Za-z0-9_-]{1,64}\.[A-Za-z0-9]{1,8}$/;

export function nombreDeFotoValido(archivo: string): boolean {
  return NOMBRE_VALIDO.test(archivo) && path.basename(archivo) === archivo;
}

function mensaje(gameId: string, archivo: string): string {
  return `foto:v1:${gameId}:${archivo}`;
}

/** Firma de una foto para una partida. */
export function firmaDeFoto(gameId: string, archivo: string): string {
  return firmarConSecreto(mensaje(gameId, archivo));
}

export function firmaDeFotoValida(gameId: string, archivo: string, firma: string): boolean {
  if (!nombreDeFotoValido(archivo)) return false;
  return igualSeguro(firma, firmaDeFoto(gameId, archivo));
}

/**
 * Convierte la URL guardada en una que el móvil pueda abrir.
 *
 * Lo que se guarda al subir es `/uploads/<nombre>`. Si algún día se guardara
 * una dirección completa (un almacenamiento externo), se devuelve tal cual: no
 * es nuestra y no hay nada que firmar.
 */
export function fotoParaJugador(
  photoUrl: string | undefined,
  gameId: string,
): string | undefined {
  if (!photoUrl) return undefined;
  if (!photoUrl.startsWith('/uploads/')) return photoUrl;

  const archivo = photoUrl.slice('/uploads/'.length);
  if (!nombreDeFotoValido(archivo)) return undefined;
  return `/api/jugar/foto/${encodeURIComponent(gameId)}/${archivo}?f=${firmaDeFoto(gameId, archivo)}`;
}
