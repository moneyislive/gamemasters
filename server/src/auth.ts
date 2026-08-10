/**
 * La puerta del taller.
 *
 * Hoy se entra con la contraseña de la casa (`APP_PASSWORD`); mañana, también
 * con una cuenta de proveedor. `identidadDeTaller` es el único sitio donde se
 * decide, y devuelve CON QUÉ título entra cada cual, no un sí o un no: «cada
 * Game Master ve sus partidas» necesita saber quién es.
 *
 * Sin contraseña configurada la aplicación queda abierta, pero solo fuera de
 * producción. Ver `identidadDeTaller`.
 *
 * La sesión es una cookie firmada, SIN estado en el servidor: el valor es un
 * HMAC-SHA256 de una constante usando la propia contraseña como clave. Así
 * sobrevive a los reinicios y a varios contenedores a la vez, y cambiar la
 * contraseña invalida automáticamente todas las sesiones. La comparación se
 * hace en tiempo constante para no filtrar información por el tiempo de
 * respuesta.
 */
import type { NextFunction, Request, Response } from 'express';
import { env } from './config';
import { firmarConSecreto, igualSeguro } from './secreto';
import { crearRouter } from './rutas';
import { COOKIE_CUENTA, emitirSesionDeCuenta, sesionDeCuentaDePeticion } from './identidad/sesion';
import { cuentaDeCasa } from './taller/cuenta-de-casa';
import type { ProveedorId } from '../../shared/identidad';

const COOKIE = 'gm_sesion';
/** 30 días: es una herramienta para organizar veladas, no un banco. */
const DURACION_SEGUNDOS = 60 * 60 * 24 * 30;

/** ¿Hay contraseña configurada? Si no, no se protege nada. */
export function passwordRequired(): boolean {
  return Boolean(env.appPassword);
}

/**
 * Testigo de sesión.
 *
 * La contraseña va en el MENSAJE, no en la clave. Antes era al revés
 * —`HMAC(contraseña, constante)`— y eso convertía la cookie en un oráculo para
 * romper la contraseña sin conexión: texto conocido, clave elegida por una
 * persona, SHA-256 sin endurecer. Ahora hace falta el secreto del servidor para
 * poder probar siquiera una candidata.
 *
 * Y se conserva lo que se buscaba: cambiar la contraseña cambia el mensaje,
 * cambia la firma, y todas las sesiones abiertas dejan de valer.
 */
function tokenDeSesion(password: string): string {
  return firmarConSecreto(`gamemasters:sesion:v2:${password}`);
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
 * Con qué título entra alguien al taller.
 *
 * POR QUÉ EXISTE ESTE TIPO EN VEZ DE UN BOOLEANO. Van a convivir dos maneras de
 * entrar —la contraseña de la casa de toda la vida y una cuenta de proveedor—, y
 * el taller necesita saber CUÁL de las dos, porque «cada uno ve sus partidas»
 * solo tiene sentido si hay un «uno». Un booleano obliga a volver a preguntarlo
 * en cada ruta, y ahí es donde se olvida.
 */
export type IdentidadDeTaller =
  | { tipo: 'abierto' }
  | { tipo: 'casa' }
  | { tipo: 'cuenta'; cuentaId: string; via: ProveedorId };

/**
 * Quién es quien llama, o `null` si no lo sabemos.
 *
 * EL MODO ABIERTO ESTÁ ATADO A `NODE_ENV`, NO A QUE FALTE LA CONTRASEÑA. Esa es
 * la diferencia entre «no hay puerta porque estás en tu portátil» y «no hay
 * puerta porque alguien borró una variable del panel». Antes era lo segundo:
 * `isAuthenticated` devolvía `true` en cuanto `APP_PASSWORD` estuviera vacía,
 * de modo que retirarla en producción no cerraba nada — dejaba el taller
 * ABIERTO, con la solución del caso servida en `/api/games/<id>` a cualquiera
 * que diera con la dirección.
 *
 * Importa ahora más que nunca: en cuanto una cuenta pueda abrir el taller, hay
 * un motivo legítimo para quitar `APP_PASSWORD`, y ese día el fallo dejaría de
 * ser hipotético. Con esto, quitarla en producción devuelve 401 a todo el
 * mundo: molesto y evidente, que es como tienen que fallar estas cosas.
 */
export function identidadDeTaller(req: Request): IdentidadDeTaller | null {
  const pasaporte = sesionDeCuentaDePeticion(req);
  if (pasaporte) return { tipo: 'cuenta', cuentaId: pasaporte.cuentaId, via: pasaporte.via };

  const password = env.appPassword;
  if (password) {
    const cookie = leerCookie(req, COOKIE);
    if (cookie && igualSeguro(cookie, tokenDeSesion(password))) return { tipo: 'casa' };
    return null;
  }

  return process.env.NODE_ENV === 'production' ? null : { tipo: 'abierto' };
}

/** ¿La petición viene de alguien a quien se deja pasar? */
export function isAuthenticated(req: Request): boolean {
  return identidadDeTaller(req) !== null;
}

/**
 * Middleware de protección. Deja pasar siempre las rutas de autenticación
 * (si no, no habría forma de iniciar sesión) y responde 401 al resto.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.path.startsWith('/auth/') || isAuthenticated(req)) {
    next();
    return;
  }
  res.status(401).json({ error: 'Acceso restringido: introduce la contraseña de la casa.' });
}

const router = crearRouter();

/** Estado de la sesión: lo consulta el cliente al arrancar. */
router.get('/auth/status', (req, res) => {
  res.json({ required: passwordRequired(), authenticated: isAuthenticated(req) });
});

router.post('/auth/login', async (req, res) => {
  const password = env.appPassword;
  if (!password) {
    res.json({ authenticated: true });
    return;
  }

  const enviada = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!igualSeguro(enviada, password)) {
    // Retardo breve: encarece probar contraseñas a lo bruto.
    setTimeout(() => {
      res.status(401).json({ error: 'Contraseña incorrecta.' });
    }, 600);
    return;
  }

  res.cookie(COOKIE, tokenDeSesion(password), {
    httpOnly: true,
    sameSite: 'lax',
    // Según la conexión REAL, no según NODE_ENV: una cookie «secure» servida
    // por HTTP la descarta el navegador, y en una wifi doméstica (el portátil
    // haciendo de servidor para los móviles) no hay HTTPS.
    secure: req.secure,
    maxAge: DURACION_SEGUNDOS * 1000,
    path: '/',
  });

  /*
   * Si además se dice CON QUÉ NOMBRE se entra, se reparte también un pasaporte
   * de cuenta, y a partir de ahí las partidas que se creen llevan su firma.
   *
   * Es organización, no seguridad —quien tiene la contraseña puede escribir
   * cualquier nombre— y está dicho así en `taller/cuenta-de-casa.ts`. Existe
   * para que «cada uno ve sus partidas» se pueda usar y probar hoy, sin esperar
   * a las credenciales de los proveedores, y para que quien ya dirige veladas
   * no se encuentre un taller vacío el día que vincule su Google.
   */
  const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : '';
  if (nombre) {
    const cuenta = await cuentaDeCasa(nombre);
    if (!cuenta) {
      res.status(409).json({
        error: 'Ese nombre ya pertenece a una cuenta con proveedor. Entra con él.',
      });
      return;
    }
    res.cookie(COOKIE_CUENTA, emitirSesionDeCuenta(cuenta, 'google'), {
      httpOnly: true,
      sameSite: 'lax',
      secure: req.secure,
      maxAge: 60 * 60 * 24 * 90 * 1000,
      path: '/',
    });
    res.json({ authenticated: true, cuenta: { id: cuenta.id, displayName: cuenta.displayName } });
    return;
  }

  res.json({ authenticated: true });
});

router.post('/auth/logout', (_req, res) => {
  res.clearCookie(COOKIE, { path: '/' });
  res.json({ authenticated: false });
});

export default router;
