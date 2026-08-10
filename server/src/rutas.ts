/**
 * Routers que no tumban el proceso.
 *
 * EL PROBLEMA. Express 4 no entiende de promesas: si un manejador `async`
 * rechaza y nadie lo recoge, el rechazo sube hasta Node, y Node 20 responde a
 * un rechazo sin gestionar matando el proceso. No devuelve un 500: se lleva por
 * delante el servidor entero.
 *
 * Y no es hipotético. `mutar` lanza «Esta partida no está en juego» si la
 * sesión ya no existe (live/sesion.ts). Basta con que quien dirige cierre la
 * partida en vivo mientras un móvil está pidiendo su vista —cosa que pasa: doce
 * teléfonos preguntan cada pocos segundos— para que el proceso caiga. Y con él,
 * la velada de los otros once.
 *
 * LA SOLUCIÓN, y por qué es esta. Se podía envolver cada manejador a mano, pero
 * entonces la protección depende de que quien escriba la ruta número veintiuno
 * se acuerde. Aquí se envuelve en la FÁBRICA del router: quien escriba una ruta
 * nueva queda protegido sin hacer nada, que es la única clase de red que
 * aguanta el paso del tiempo.
 */
import express from 'express';
import type { NextFunction, Request, RequestHandler, Response, Router } from 'express';

/**
 * Encamina hacia el middleware de error lo que un manejador async deje escapar.
 *
 * Los manejadores de ERROR de Express se reconocen por tener cuatro
 * parámetros, y envolverlos los convertiría en manejadores normales: dejarían
 * de recibir errores y el fallo sería mudo. Por eso se dejan pasar intactos.
 */
function envolver(fn: RequestHandler): RequestHandler {
  if (fn.length >= 4) return fn;

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const resultado = fn(req, res, next) as unknown;
      if (resultado && typeof (resultado as Promise<unknown>).catch === 'function') {
        (resultado as Promise<unknown>).catch(next);
      }
    } catch (error) {
      next(error);
    }
  };
}

const METODOS = ['get', 'post', 'put', 'patch', 'delete', 'all', 'use'] as const;

/**
 * Un router de Express cuyos manejadores no pueden tumbar el proceso.
 *
 * Se usa igual que `express.Router()`. Todo lo que sea una función se envuelve;
 * lo demás —rutas, otros routers, opciones— pasa tal cual.
 */
export function crearRouter(): Router {
  const router = express.Router();

  for (const metodo of METODOS) {
    const original = router[metodo].bind(router) as (...args: unknown[]) => unknown;
    (router as unknown as Record<string, unknown>)[metodo] = (...args: unknown[]) =>
      original(...args.map((a) => (typeof a === 'function' ? envolver(a as RequestHandler) : a)));
  }

  return router;
}
