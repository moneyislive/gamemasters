/**
 * EL ENCHUFE: donde el servidor HTTP le pasa al canal de Boots on Board los WebSocket de su ruta.
 *
 * ═══ SÓLO LA RUTA DEL CONTRATO, Y LO DEMÁS SE CIERRA LIMPIO ═══
 *
 * Se atiende el `upgrade` del `http.Server` que devuelve `app.listen`, y sólo en
 * `/api/arcade/mesas/:codigo/botas` —`rutaDelCanal` de `shared/mecanicas/canal-de-botas.ts`—. Con
 * un oyente de `upgrade` puesto, Node deja de tratar las peticiones de subida como peticiones
 * normales, así que cualquier otra ruta que llegue aquí se contesta con un 404 y se cierra:
 * dejarla colgada es un enchufe abierto sin dueño hasta que el otro lado se canse. Si algún día
 * hay otro oyente de `upgrade` en el mismo servidor, las rutas que no son ésta se le dejan a él.
 *
 * ═══ EL ORIGEN, CON LA MISMA LISTA QUE EL CORS ═══
 *
 * Un WebSocket no pasa por el CORS: el navegador lo abre desde cualquier página y el único que
 * puede negarse es el servidor, mirando `Origin`. Así que aquí se aplica la lista blanca de
 * `puerta/origenes.ts` —los orígenes propios, `PUBLIC_ORIGIN`, `ORIGENES_PERMITIDOS` y, fuera de
 * producción, el bucle local— y además lo que el CORS nunca bloquea: el MISMO origen.
 *
 * Y ese «mismo origen» no es una comodidad, es la app. React Native manda `Origin` en su WebSocket
 * aunque no sea un navegador: en Android lo pone `WebSocketModule.kt` con `getDefaultOrigin`, que
 * es el esquema y el anfitrión DE LA DIRECCIÓN A LA QUE SE CONECTA (`ws://192.168.1.50:5174` da
 * `http://192.168.1.50:5174`). O sea que la app siempre llega con el origen del propio servidor:
 * en producción cae en la lista blanca, y en casa —un móvil contra el portátil por la wifi— sólo
 * pasa porque su origen es el anfitrión que pide. Sin `Origin` se admite igual: `curl`, los
 * comprobadores, o un cliente nativo que no lo ponga. La puerta de verdad es la llave del `hola`.
 *
 * ═══ Y LAS CUOTAS, ANTES DE `handleUpgrade` ═══
 *
 * Un `upgrade` no pasa por el limitador de express (es middleware, y Node saca las subidas del
 * flujo normal). Así que el tope de conexiones se aplica AQUÍ, antes de `handleUpgrade`, con
 * `cuotas.ts`: un tope global, otro más estricto de los que aún no han saludado, y —por
 * procedencia, con `procedenciaDe` y la misma confianza en los saltos de proxy que el limitador
 * HTTP— cuántos a la vez y a qué ritmo. Una subida negada se cierra limpio como cualquier otra
 * (`negar`, con 503 o 429) y se apunta en el diagnóstico (`canal.contarCuotaNegada`). Ver la
 * cabecera de `cuotas.ts` para los números y el porqué del modo degradado.
 */
import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer } from 'ws';
import type { RawData, WebSocket } from 'ws';
import { TOPE_DE_MENSAJE_BYTES } from '../../../shared/mecanicas/canal-de-botas';
import { origenPermitido } from '../puerta/origenes';
import type { ContextoDelCors } from '../puerta/origenes';
import type { CanalDeBotas } from './canal';
import { crearCuotas, procedenciaDeLaSubida } from './cuotas';

const RUTA = /^\/api\/arcade\/mesas\/([^/?#]+)\/botas(?:\?.*)?$/;

/**
 * La forma de un código de mesa, generosa: los de verdad son cinco letras de un alfabeto sin
 * letras que se confundan. Aquí sólo se descarta lo que no puede ser un código —para no llevar
 * basura hasta la mesa—; si existe o no lo dice la llave, y a quien no la tiene se le contesta lo
 * mismo exista o no (ver `quienEsLaLlave`).
 */
const FORMA_DEL_CODIGO = /^[A-Z0-9]{1,16}$/;

/** El código de la mesa de una ruta de subida, o `null` si la ruta no es la del canal. */
export function codigoDeLaRuta(url: string | undefined): string | null {
  if (url === undefined) return null;
  const casa = RUTA.exec(url);
  if (casa === null) return null;
  let codigo: string;
  try {
    codigo = decodeURIComponent(casa[1] as string).toUpperCase();
  } catch {
    return null;
  }
  return FORMA_DEL_CODIGO.test(codigo) ? codigo : null;
}

/** ¿Se deja abrir el canal desde este origen? Ver la cabecera. */
export function origenAdmitido(
  origen: string | undefined,
  anfitrion: string | undefined,
  contexto: ContextoDelCors,
): boolean {
  if (origen === undefined) return true;
  if (origenPermitido(origen, contexto)) return true;
  if (anfitrion === undefined || anfitrion.length === 0) return false;
  try {
    return new URL(origen).host === anfitrion.toLowerCase();
  } catch {
    return false;
  }
}

/** Contesta una subida que no se atiende, y cierra. Con `reintentarEn`, añade un `Retry-After`. */
function negar(socket: Duplex, estado: number, texto: string, reintentarEn?: number): void {
  socket.on('error', () => {
    /* El otro lado ya se fue: no hay nada que decirle. */
  });
  if (socket.writable) {
    const retry = reintentarEn === undefined ? '' : `Retry-After: ${String(reintentarEn)}\r\n`;
    socket.write(`HTTP/1.1 ${String(estado)} ${texto}\r\nConnection: close\r\n${retry}Content-Length: 0\r\n\r\n`);
  }
  socket.destroy();
}

/** Lo que llega por el WebSocket, como texto; `null` si era un marco binario. */
function comoTexto(datos: RawData, binario: boolean): string | null {
  if (binario) return null;
  if (Buffer.isBuffer(datos)) return datos.toString('utf8');
  if (Array.isArray(datos)) return Buffer.concat(datos).toString('utf8');
  return Buffer.from(datos).toString('utf8');
}

/**
 * ENCHUFA EL CANAL AL SERVIDOR HTTP. Devuelve el `WebSocketServer`, sin servidor propio
 * (`noServer`) y con `maxPayload` en el tope del contrato: un marco más grande lo corta `ws` antes
 * de leerlo entero, con su código estándar 1009 —«demasiado grande»—.
 */
export function enchufarElCanal(servidor: Server, canal: CanalDeBotas, contexto: ContextoDelCors): WebSocketServer {
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: TOPE_DE_MENSAJE_BYTES,
    perMessageDeflate: false,
    clientTracking: false,
  });

  /* Las cuotas de este canal: un guardián por canal, con los topes de producción. Ver `cuotas.ts`. */
  const cuotas = crearCuotas();

  servidor.on('upgrade', (req: IncomingMessage, socket: Duplex, cabeza: Buffer) => {
    /*
     * Todo en un `try`: esto corre dentro de un evento del servidor HTTP, y lo que se escapara de
     * aquí llegaría a `uncaughtException`, que en `index.ts` termina el proceso. Una subida rara se
     * lleva por delante su enchufe, y nada más.
     */
    try {
      atender(req, socket, cabeza);
    } catch (error) {
      console.error('[botas] una subida ha fallado y se cierra:', error instanceof Error ? error.message : String(error));
      socket.destroy();
    }
  });

  function atender(req: IncomingMessage, socket: Duplex, cabeza: Buffer): void {
    const codigo = codigoDeLaRuta(req.url);
    if (codigo === null) {
      if (servidor.listenerCount('upgrade') > 1) return;
      negar(socket, 404, 'Not Found');
      return;
    }
    const origen = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
    if (!origenAdmitido(origen, req.headers.host, contexto)) {
      canal.contarOrigenNegado();
      negar(socket, 403, 'Forbidden');
      return;
    }
    /*
     * LAS CUOTAS, ANTES DE `handleUpgrade`: si no hay hueco, se niega limpio y no se abre nada. La
     * procedencia se calcula con la misma función y la misma confianza que el limitador HTTP; con
     * procedencia desconocida sólo mandan los topes globales (ver `cuotas.ts`). Un 429 lleva su
     * `Retry-After` —es «tú, un momento»—; un 503 no —es «el servicio, lleno», y el aparato ya
     * reintenta solo con su espera que se dobla—.
     */
    const procedencia = procedenciaDeLaSubida(req);
    const veredicto = cuotas.admite(procedencia);
    if (veredicto !== null) {
      canal.contarCuotaNegada(veredicto.motivo);
      negar(socket, veredicto.estado, veredicto.texto, veredicto.estado === 429 ? 1 : undefined);
      return;
    }
    wss.handleUpgrade(req, socket, cabeza, (ws: WebSocket) => {
      /*
       * Apuntado ya como canal vivo. Se suelta cuando el `ws` se cierre —SIEMPRE llega ese `close`,
       * también si `abrir` revienta a continuación—, así que este oyente va PRIMERO, antes que nada
       * que pueda lanzar: sin él, un canal que no llega a abrirse dejaría su cuenta colgada.
       */
      const registro = cuotas.entra(procedencia);
      ws.on('close', () => registro.sale());
      const conexion = canal.abrir(codigo, {
        enviar: (texto) => {
          if (ws.readyState === ws.OPEN) ws.send(texto);
        },
        cerrar: (codigoDeCierre, razon) => {
          if (ws.readyState === ws.OPEN || ws.readyState === ws.CONNECTING) ws.close(codigoDeCierre, razon);
        },
        pendientes: () => ws.bufferedAmount,
        /* Al saludar deja de contar contra el tope de «canales sin saludar». */
        saludo: () => registro.saludo(),
      });
      /*
       * `comoTexto` DENTRO del `try`: convertir el marco a texto puede lanzar (un `Buffer.concat`
       * raro), y fuera del `try` de `recibir` ese fallo se escaparía del oyente de `message` hasta
       * `uncaughtException`, que en `index.ts` termina el proceso. Se convierte aquí y, si falla, se
       * cierra ESTE canal con `canal.fallo` —el mismo camino que un fallo dentro de `recibir`—.
       */
      ws.on('message', (datos: RawData, binario: boolean) => {
        let texto: string | null;
        try {
          texto = comoTexto(datos, binario);
        } catch (error) {
          canal.fallo(conexion, error);
          return;
        }
        conexion.recibir(texto);
      });
      ws.on('close', () => conexion.seCerro());
      /*
       * SIN ESTE OYENTE, UN MARCO MALO TIRA EL SERVIDOR: `ws` emite `error` —un marco que pasa de
       * `maxPayload`, uno mal enmascarado, un UTF-8 roto— y un `error` sin oyente se lanza, llega a
       * `uncaughtException` y `index.ts` termina el proceso. `ws` ya cierra el enchufe por su cuenta
       * y después llega `close`, que es donde se suelta el asiento.
       */
      ws.on('error', () => {});
    });
  }

  return wss;
}
