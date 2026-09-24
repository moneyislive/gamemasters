/**
 * EL DIAGNÓSTICO DE LA LIZA, EN SU PROPIA RUTA: `GET /api/arcade/liza/diagnostico`.
 *
 * ═══ POR QUÉ NO ES UNA RUTA DE EXPRESS ═══
 *
 * Lo natural sería un bloque `liza` en `/api/arcade/diagnostico`, junto al de botas; pero esa ruta es de
 * `routes/arcade.ts`, que no es de este módulo. Y una ruta nueva de express tampoco se puede poner desde
 * aquí: la Liza se monta con UNA línea al final de `index.ts`, después de `app.listen`, y a esas alturas
 * la pila de express termina en el 404 de `/api` —y antes, en la puerta de la contraseña—, así que lo
 * que se añadiera detrás no lo alcanzaría nadie.
 *
 * Así que se atiende UN escalón por debajo, en el servidor HTTP, igual que el `upgrade`: este oyente de
 * `request` contesta esa ruta exacta (`GET` y `HEAD`) y le pasa TODO lo demás, sin mirarlo, a los oyentes
 * que ya había —express—, en el mismo orden. Las rutas de los demás no cambian en nada.
 *
 * Dice lo mismo que el bloque `botas`: sólo cuentas —ni un código de mesa, ni un asiento, ni una llave—,
 * porque se sirve sin credencial. Y sin caché en el navegador: es para mirar cómo va el proceso AHORA.
 *
 * ═══ Y COMPUESTO COMO MUCHO CUATRO VECES POR SEGUNDO ═══
 *
 * Por debajo de express tampoco le alcanza el limitador de `/api` (`limitadorDeIntentos`). Ése guarda
 * las puertas que aceptan una credencial y ésta no acepta ninguna, así que no le falta por eso; pero una
 * ráfaga de peticiones no debe hacer que el proceso componga el diagnóstico —recorrer las salas y los
 * canales, y escribirlo— una vez por petición. Se compone como mucho cada `VIGENCIA_DEL_DIAGNOSTICO_MS`
 * y, dentro de ese cuarto de segundo, se contesta el mismo texto: lo que cuesta una ráfaga es lo que
 * cuesta contestar, igual que cualquier ruta.
 */
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { performance } from 'node:perf_hooks';

/** La ruta, exacta. */
export const RUTA_DEL_DIAGNOSTICO = '/api/arcade/liza/diagnostico';

/** Cuánto vale un diagnóstico compuesto antes de componer otro. Ver la cabecera. */
export const VIGENCIA_DEL_DIAGNOSTICO_MS = 250;

type OyenteDePeticiones = (req: IncomingMessage, res: ServerResponse) => void;

/** ¿Es una petición de esta ruta, sea cual sea su `?…`? */
export function esLaRutaDelDiagnostico(url: string | undefined): boolean {
  if (url === undefined) return false;
  const q = url.indexOf('?');
  return (q < 0 ? url : url.slice(0, q)) === RUTA_DEL_DIAGNOSTICO;
}

/**
 * PONE EL DIAGNÓSTICO DELANTE de los oyentes de `request` que ya tenga el servidor. `leer` compone lo que
 * se contesta, como mucho una vez cada `VIGENCIA_DEL_DIAGNOSTICO_MS` del reloj `ahora` (monótono; se
 * cambia en las pruebas).
 */
export function servirElDiagnostico(servidor: Server, leer: () => unknown, ahora: () => number = () => performance.now()): void {
  const anteriores = servidor.listeners('request') as OyenteDePeticiones[];
  servidor.removeAllListeners('request');
  let compuesto: { en: number; cuerpo: string } | null = null;
  servidor.on('request', (req: IncomingMessage, res: ServerResponse) => {
    const metodo = req.method ?? 'GET';
    if ((metodo === 'GET' || metodo === 'HEAD') && esLaRutaDelDiagnostico(req.url)) {
      let cuerpo: string;
      try {
        const t = ahora();
        if (compuesto === null || t - compuesto.en >= VIGENCIA_DEL_DIAGNOSTICO_MS || t < compuesto.en) {
          compuesto = { en: t, cuerpo: JSON.stringify(leer()) };
        }
        cuerpo = compuesto.cuerpo;
      } catch (error) {
        console.error('[liza] el diagnóstico no se ha podido componer:', error instanceof Error ? error.message : String(error));
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: 'El diagnóstico de la liza no se ha podido componer.' }));
        return;
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Length', String(Buffer.byteLength(cuerpo)));
      res.end(metodo === 'HEAD' ? undefined : cuerpo);
      return;
    }
    for (const oyente of anteriores) oyente.call(servidor, req, res);
  });
}
