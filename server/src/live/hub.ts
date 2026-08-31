/**
 * Espera de cambios: el mecanismo que hace que la partida se sienta en vivo.
 *
 * El móvil pregunta «dame la vista si ha cambiado desde la revisión N». Si no
 * ha cambiado, el servidor NO responde: deja la petición abierta hasta que algo
 * ocurre o hasta que se agota el plazo. Es long-polling, y para este juego es
 * mejor que WebSocket o SSE por tres razones concretas:
 *
 *  1. React Native no trae un `EventSource` fiable, y depender de un paquete de
 *     terceros para el canal principal es fragilidad en el peor sitio.
 *  2. Atraviesa cualquier proxy, CDN o balanceador sin configuración especial.
 *  3. La corrección no depende del reparto: si un aviso se pierde, la siguiente
 *     petición trae el estado completo igualmente.
 *
 * Además, cada aviso se guarda con su revisión, de modo que un móvil que estaba
 * en segundo plano recupera al volver los avisos que se perdió.
 */
import { olvidarPresencia } from '../mecanicas/presencia';
import type { AvisoClave } from '../../../shared/live';

interface EsperaPendiente {
  resolver: (huboCambio: boolean) => void;
  temporizador: NodeJS.Timeout;
}

interface AvisoRegistrado {
  rev: number;
  clave: AvisoClave;
  texto: string;
  /** Si va dirigido a una sola persona. */
  participanteId?: string;
}

const esperas = new Map<string, Set<EsperaPendiente>>();
const avisos = new Map<string, AvisoRegistrado[]>();

/** Cuánto se deja una petición abierta antes de responder «sin novedad». */
const PLAZO_MS = 25_000;
/** Avisos que se recuerdan por partida, para quien vuelva de segundo plano. */
const MAX_AVISOS = 40;

/**
 * Espera a que la partida cambie. Devuelve true si hubo cambio, false si se
 * agotó el plazo (entonces el cliente vuelve a preguntar: es lo normal).
 */
export function esperarCambio(gameId: string): Promise<boolean> {
  return new Promise((resolver) => {
    const conjunto = esperas.get(gameId) ?? new Set<EsperaPendiente>();
    const pendiente: EsperaPendiente = {
      resolver,
      temporizador: setTimeout(() => {
        conjunto.delete(pendiente);
        if (conjunto.size === 0) esperas.delete(gameId);
        resolver(false);
      }, PLAZO_MS),
    };
    conjunto.add(pendiente);
    esperas.set(gameId, conjunto);
  });
}

/** Despierta a todos los que esperaban cambios en esta partida. */
export function avisarCambio(gameId: string): void {
  const conjunto = esperas.get(gameId);
  if (!conjunto) return;
  for (const pendiente of conjunto) {
    clearTimeout(pendiente.temporizador);
    pendiente.resolver(true);
  }
  conjunto.clear();
  esperas.delete(gameId);
}

/**
 * Registra un aviso efímero —lo que la app celebra con animación y vibración—
 * y despierta a quien estuviera esperando.
 */
export function anunciar(
  gameId: string,
  rev: number,
  clave: AvisoClave,
  texto: string,
  participanteId?: string,
): void {
  const lista = avisos.get(gameId) ?? [];
  lista.push({ rev, clave, texto, participanteId });
  while (lista.length > MAX_AVISOS) lista.shift();
  avisos.set(gameId, lista);
  avisarCambio(gameId);
}

/** Avisos posteriores a una revisión, para un jugador concreto. */
export function avisosDesde(
  gameId: string,
  desdeRev: number,
  participanteId: string | null,
): Array<{ clave: AvisoClave; texto: string }> {
  return (avisos.get(gameId) ?? [])
    .filter((a) => a.rev > desdeRev)
    .filter((a) => !a.participanteId || a.participanteId === participanteId)
    .map((a) => ({ clave: a.clave, texto: a.texto }));
}

/** Limpia todo lo asociado a una partida (al borrarla o al reiniciarla). */
export function olvidar(gameId: string): void {
  avisarCambio(gameId);
  avisos.delete(gameId);
  olvidarPresencia(gameId);
}
