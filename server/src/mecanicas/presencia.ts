/**
 * Quién sigue delante del móvil.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUÉ NO VA EN LA BASE DE DATOS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Marcar «sigo aquí» era la escritura más frecuente del sistema, con diferencia,
 * y la más cara por lo que valía. Cada vuelta del long-poll —doce móviles, cada
 * veinticinco segundos, más una por cada cambio que se les entrega— pedía el
 * candado de la partida, releía la sesión entera y la volvía a escribir COMPLETA
 * para tocar un campo de fecha. Una sesión con sus notas, sus acciones, sus
 * acusaciones y el estado del juego, ida y vuelta, para decir «sí».
 *
 * Y lo caro no eran los bytes: era el candado. `mutar` serializa por partida, así
 * que mientras la presencia de alguien iba y venía de Mongo, la acusación de otro
 * esperaba su turno detrás. La velada entera se estrechaba por el cuello del dato
 * más insignificante que hay en ella.
 *
 * Aquí no se escribe nada. Un número en un mapa.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Y POR QUÉ SE PUEDE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Porque la presencia es COSMÉTICA y CORTA. Solo se usa para el punto verde del
 * panel y para un trofeo, y solo mira los últimos sesenta segundos: no hay nada
 * que reconstruir después. Si el proceso se reinicia, el peor caso es que el
 * panel pinte a doce personas grises hasta la siguiente vuelta del long-poll —
 * segundos, y nadie ha perdido nada.
 *
 * El documento no se abandona, se aprovecha: cada escritura DE VERDAD que pasa
 * por `mutar` se lleva de paso lo que haya en memoria (ver `volcarPresencia`).
 * No cuesta nada, porque esa escritura iba a ocurrir igualmente, y deja el
 * documento razonablemente al día para quien lo lea sin pasar por aquí.
 *
 * Y al leer se toma SIEMPRE la señal más reciente de las dos, memoria o
 * documento. Nunca se pierde presencia por consultar el sitio equivocado, y una
 * partida vieja leída de la base de datos se comporta exactamente como antes.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUÉ ESTE FICHERO SE MUDÓ DE `live/` A `mecanicas/`
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Estaba en `live/` por dónde NACIÓ, no por lo que hace. «Quién sigue delante
 * del móvil» no sabe si lo que se juega es un misterio con Game Master o un
 * arcade de dos minutos, y no tiene por qué saberlo: es infraestructura.
 *
 * Mientras hubo un solo motor daba igual. Deja de dar igual con el motor de
 * arcade, y no como cuestión de orden: es una DEPENDENCIA ESTRUCTURAL de la mesa
 * en línea, porque sin presencia no se detecta a quien se fue de la mesa — y en
 * un arcade eso ocurre cada dos minutos en vez de una vez por noche.
 *
 * La alternativa era archivarlo como «excepción»: dejarlo en `live/` y permitir
 * que el arcade importara de ahí. Eso crea una CATEGORÍA —una zona compartida
 * entre los dos motores, con precedente de ampliarla— y quien llegue en tres
 * meses lee la categoría y no el razonamiento. La capa `mecanicas/` ya existe
 * para exactamente esto y su definición está escrita al lado, en `pistas.ts`:
 * código que sirve a varios juegos, que ninguno tiene la obligación de usar, y
 * que no sabe quién lo usa.
 *
 * LO QUE FALTA PARA QUE SEA UNA MECÁNICA DE VERDAD, y conviene dejarlo escrito
 * en vez de dar la mudanza por terminada: `volcarPresencia` sigue recibiendo una
 * `LiveSession`, o sea que hoy solo la puede llamar el motor de veladas. Las
 * otras tres funciones —`marcarPresencia`, `senalEnMemoria`, `olvidarPresencia`—
 * ya son agnósticas y son las que usa el arcade. Girar esa cuarta es un cambio
 * dentro de veladas con maestro de oro de por medio, y por eso no se ha hecho
 * en la misma mudanza: se mueve una cosa cada vez.
 */
import type { LiveSession } from '../../../shared/live';

/** gameId → participanteId → cuándo se le vio (epoch ms). */
const vistos = new Map<string, Map<string, number>>();

/**
 * Cuánto se guarda una partida sin señales antes de tirarla.
 *
 * Bastante más que el minuto que dura «conectado»: no se trata de acertar con la
 * caducidad, sino de que el mapa no crezca una entrada por partida jugada. Esa
 * fuga exacta ya la tuvo el mapa de candados y no se vio desde fuera.
 */
const OLVIDO_MS = 30 * 60_000;
/** Cada cuánto se barre. Barrer en cada señal sería absurdo. */
const BARRIDO_MS = 60_000;

let ultimoBarrido = 0;

function barrer(ahora: number): void {
  if (ahora - ultimoBarrido < BARRIDO_MS) return;
  ultimoBarrido = ahora;
  for (const [gameId, jugadores] of vistos) {
    let masReciente = 0;
    for (const cuando of jugadores.values()) {
      if (cuando > masReciente) masReciente = cuando;
    }
    if (ahora - masReciente > OLVIDO_MS) vistos.delete(gameId);
  }
}

/** Anota que alguien sigue ahí. Sin candado, sin almacén, sin esperar. */
export function marcarPresencia(gameId: string, participanteId: string): void {
  const ahora = Date.now();
  barrer(ahora);
  const jugadores = vistos.get(gameId) ?? new Map<string, number>();
  jugadores.set(participanteId, ahora);
  vistos.set(gameId, jugadores);
}

/** Última señal en memoria, o 0 si aquí no consta. */
export function senalEnMemoria(gameId: string, participanteId: string): number {
  return vistos.get(gameId)?.get(participanteId) ?? 0;
}

/**
 * Copia en la sesión lo que haya en memoria, para que lo arrastre la escritura
 * que ya se iba a hacer.
 *
 * No hace nada si no hay nada — lo que importa para que una partida sin señales
 * (un guion de comprobación, el maestro de oro) se guarde byte a byte igual que
 * antes de que este fichero existiera.
 */
export function volcarPresencia(sesion: LiveSession): void {
  const jugadores = vistos.get(sesion.id);
  if (!jugadores || jugadores.size === 0) return;
  for (const jugador of sesion.players) {
    const enMemoria = jugadores.get(jugador.participanteId);
    if (enMemoria === undefined) continue;
    const enDocumento = jugador.lastSeenAt ? Date.parse(jugador.lastSeenAt) : NaN;
    // Solo hacia delante: el documento nunca retrocede por culpa de la memoria.
    if (Number.isFinite(enDocumento) && enDocumento >= enMemoria) continue;
    jugador.lastSeenAt = new Date(enMemoria).toISOString();
  }
}

/** Al cerrar o borrar una partida. */
export function olvidarPresencia(gameId: string): void {
  vistos.delete(gameId);
}

/** Cuántas partidas se recuerdan. Solo para comprobar que no hay fuga. */
export function presenciasVivas(): number {
  return vistos.size;
}
