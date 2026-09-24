/**
 * EL ENCHUFE DE LA LIZA: donde el servidor HTTP le pasa a la sala los WebSocket de su ruta.
 *
 * ═══ UN OYENTE DE `upgrade` MÁS, Y DOS VECINOS QUE NO SE PISAN ═══
 *
 * El servidor ya tiene el de Boots on Board (`botas/enchufe.ts`), que atiende su ruta y, si hay otro
 * oyente, deja pasar las demás. Éste hace lo mismo desde el otro lado:
 *
 *   · `/api/arcade/mesas/:codigo/liza` (`rutaDeLaLiza` del protocolo): la atiende.
 *   · la de botas (`codigoDeLaRuta` de `botas/enchufe.ts`, usada tal cual) con alguien más escuchando: la
 *     deja pasar; es de botas.
 *   · cualquier otra: 404 y se cierra. Dejarla colgada sería un enchufe abierto sin dueño hasta que el
 *     otro lado se canse, y con dos oyentes que se ceden las rutas ajenas alguien tiene que ser el que
 *     dice que no. Si un día se engancha un TERCERO, lo que no es de ninguno de los dos se le deja a él
 *     —lo mismo que hace botas—, y el último en engancharse es quien cierra lo que no es de nadie.
 *
 * ═══ EL ORIGEN Y LAS CUOTAS, LOS DE BOTS ON BOARD ═══
 *
 * Un WebSocket no pasa por el CORS ni por el limitador de express, así que se miran aquí, antes de
 * `handleUpgrade` y con las MISMAS funciones que el canal de botas —`origenAdmitido`, `crearCuotas`,
 * `procedenciaDeLaSubida`—: la razón de cada tope está en sus cabeceras y no se copia. El guardián de
 * cuotas es otro: los canales de la Liza no le quitan hueco a los de botas ni al revés.
 *
 * ═══ `maxPayload`, SIN COMPRESIÓN, Y EL PING ═══
 *
 * `maxPayload` es el tope de subida del contrato: un marco más grande lo corta `ws` antes de leerlo,
 * con su 1009. Sin `perMessageDeflate`: la bajada son JSON cortos veinte veces por segundo, y comprimir
 * cada uno cuesta más CPU de la que ahorra red. Y el ping de protocolo lleva dentro el número que le
 * pone la sala (cuatro bytes): así el pong que vuelve se casa con el ping que salió, aunque se pierda uno.
 */
import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer } from 'ws';
import type { RawData, WebSocket } from 'ws';
import { TOPE_DE_SUBIDA_BYTES } from '../../../shared/mecanicas/liza/protocolo';
import type { ContextoDelCors } from '../puerta/origenes';
import { codigoDeLaRuta, origenAdmitido } from '../botas/enchufe';
import { crearCuotas, procedenciaDeLaSubida } from '../botas/cuotas';
import type { CanalDeLaLiza } from './canal';

const RUTA = /^\/api\/arcade\/mesas\/([^/?#]+)\/liza(?:\?.*)?$/;

/** La forma de un código de mesa, la misma que mira el enchufe de botas: sólo descarta lo imposible. */
const FORMA_DEL_CODIGO = /^[A-Z0-9]{1,16}$/;

/** El código de la mesa de una ruta de subida, o `null` si la ruta no es la de la Liza. */
export function codigoDeLaRutaDeLaLiza(url: string | undefined): string | null {
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

/** El número de un ping, en los cuatro bytes que viajan dentro; `null` si el pong no trae uno de los nuestros. */
function numeroDelPong(datos: Buffer): number | null {
  return datos.length === 4 ? datos.readUInt32BE(0) : null;
}

/**
 * ENCHUFA LA LIZA AL SERVIDOR HTTP. Devuelve el `WebSocketServer`, sin servidor propio (`noServer`).
 */
export function enchufarLaLiza(servidor: Server, canal: CanalDeLaLiza, contexto: ContextoDelCors): WebSocketServer {
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: TOPE_DE_SUBIDA_BYTES,
    perMessageDeflate: false,
    clientTracking: false,
  });

  /* Las cuotas de la Liza: un guardián suyo, con los topes de producción. Ver `botas/cuotas.ts`. */
  const cuotas = crearCuotas();

  servidor.on('upgrade', (req: IncomingMessage, socket: Duplex, cabeza: Buffer) => {
    /*
     * Todo en un `try`: esto corre dentro de un evento del servidor HTTP, y lo que se escapara llegaría a
     * `uncaughtException`, que en `index.ts` termina el proceso. Una subida rara se lleva su enchufe, y
     * nada más.
     */
    try {
      atender(req, socket, cabeza);
    } catch (error) {
      console.error('[liza] una subida ha fallado y se cierra:', error instanceof Error ? error.message : String(error));
      socket.destroy();
    }
  });

  function atender(req: IncomingMessage, socket: Duplex, cabeza: Buffer): void {
    const codigo = codigoDeLaRutaDeLaLiza(req.url);
    if (codigo === null) {
      const otros = servidor.listenerCount('upgrade') - 1;
      if (otros > 0 && codigoDeLaRuta(req.url) !== null) return;
      if (otros > 1) return;
      negar(socket, 404, 'Not Found');
      return;
    }
    const origen = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
    if (!origenAdmitido(origen, req.headers.host, contexto)) {
      canal.contarOrigenNegado();
      negar(socket, 403, 'Forbidden');
      return;
    }
    const procedencia = procedenciaDeLaSubida(req);
    const veredicto = cuotas.admite(procedencia);
    if (veredicto !== null) {
      canal.contarCuotaNegada(veredicto.motivo);
      negar(socket, veredicto.estado, veredicto.texto, veredicto.estado === 429 ? 1 : undefined);
      return;
    }
    wss.handleUpgrade(req, socket, cabeza, (ws: WebSocket) => {
      /*
       * Apuntado ya como canal vivo, y soltado en su `close`, que SIEMPRE llega: por eso este oyente va
       * primero, antes que nada que pueda lanzar.
       */
      const registro = cuotas.entra(procedencia);
      ws.on('close', () => registro.sale());
      /* Sin este oyente, un marco malo (más grande que `maxPayload`, UTF-8 roto) tira el proceso. */
      ws.on('error', () => {});
      const conexion = canal.abrir(codigo, {
        enviar: (texto) => {
          if (ws.readyState === ws.OPEN) ws.send(texto);
        },
        cerrar: (codigoDeCierre, razon) => {
          if (ws.readyState === ws.OPEN || ws.readyState === ws.CONNECTING) ws.close(codigoDeCierre, razon);
        },
        pendientes: () => ws.bufferedAmount,
        ping: (numero) => {
          if (ws.readyState !== ws.OPEN) return;
          const carga = Buffer.alloc(4);
          carga.writeUInt32BE(numero >>> 0, 0);
          ws.ping(carga);
        },
        saludo: () => registro.saludo(),
      });
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
      ws.on('pong', (datos: Buffer) => {
        const numero = numeroDelPong(datos);
        if (numero !== null) conexion.pong(numero);
      });
      ws.on('close', () => conexion.seCerro());
    });
  }

  return wss;
}
