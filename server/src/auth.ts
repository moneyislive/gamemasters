/**
 * Acceso por contraseña única.
 *
 * Si `APP_PASSWORD` está definida, toda la aplicación (API, imágenes subidas y
 * dosieres) queda tras una contraseña. Sin ella, la aplicación funciona abierta
 * como hasta ahora: pensado para desarrollo en local.
 *
 * La sesión es una cookie firmada, SIN estado en el servidor: el valor es un
 * HMAC-SHA256 de una constante usando la propia contraseña como clave. Así
 * sobrevive a los reinicios y a varios contenedores a la vez, y cambiar la
 * contraseña invalida automáticamente todas las sesiones. La comparación se
 * hace en tiempo constante para no filtrar información por el tiempo de
 * respuesta.
 */
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { env } from './config';
import { firmarConSecreto, igualSeguro } from './secreto';

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

/** ¿La petición trae una sesión válida? (cierto siempre si no hay contraseña) */
export function isAuthenticated(req: Request): boolean {
  const password = env.appPassword;
  if (!password) return true;
  const cookie = leerCookie(req, COOKIE);
  return Boolean(cookie) && igualSeguro(cookie!, tokenDeSesion(password));
}

/**
 * Middleware de protección. Deja pasar siempre las rutas de autenticación
 * (si no, no habría forma de iniciar sesión) y responde 401 al resto.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!passwordRequired() || req.path.startsWith('/auth/') || isAuthenticated(req)) {
    next();
    return;
  }
  res.status(401).json({ error: 'Acceso restringido: introduce la contraseña de la casa.' });
}

const router = Router();

/** Estado de la sesión: lo consulta el cliente al arrancar. */
router.get('/auth/status', (req, res) => {
  res.json({ required: passwordRequired(), authenticated: isAuthenticated(req) });
});

router.post('/auth/login', (req, res) => {
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
  res.json({ authenticated: true });
});

router.post('/auth/logout', (_req, res) => {
  res.clearCookie(COOKIE, { path: '/' });
  res.json({ authenticated: false });
});

export default router;
