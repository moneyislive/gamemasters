/**
 * Cuentas de jugador, historial y trofeos.
 *
 * La cuenta es el correo que el Game Master escribió al montar la partida. No
 * hay contraseñas ni enlaces mágicos: montar un servidor de correo para que
 * doce personas entren en un juego de sobremesa es desproporcionado, y una
 * contraseña más es justo lo que nadie quiere teclear con la cena servida.
 *
 * El factor de acceso es el código de invitación que reparte el Game Master, y
 * el vínculo con la cuenta lo establece él al escribir el correo. Quien no
 * tenga correo juega igual: simplemente esa partida no se le guarda.
 */
import { nanoid } from 'nanoid';
import { getStore } from '../db/store';
import { mutar } from './sesion';
import { normalizarEmail } from '../../../shared/live';
import type { Account, LiveSession, PartidaJugada, TrofeoId } from '../../../shared/live';
import type { GameSession } from '../../../shared/types';
import { culpableDe } from '../juegos/cluedo';

/** Busca la cuenta del correo, o la crea si es la primera vez. */
export async function cuentaDe(email: string, displayName: string): Promise<Account> {
  const store = getStore();
  const normalizado = normalizarEmail(email);
  const existente = await store.getAccountByEmail(normalizado);
  if (existente) return existente;

  const nueva: Account = {
    id: nanoid(12),
    email: normalizado,
    displayName,
    createdAt: new Date().toISOString(),
    partidas: [],
    trofeos: [],
  };
  return store.saveAccount(nueva);
}

/**
 * Cierra la partida en las cuentas: apunta lo jugado y reparte trofeos.
 *
 * Se llama al revelar el desenlace. Es idempotente: si se llama dos veces, la
 * partida no se duplica en el historial.
 */
export async function cerrarPartidaEnCuentas(
  game: GameSession,
  sesion: LiveSession,
): Promise<void> {
  const plot = game.plot;
  if (!plot) return;
  const store = getStore();

  for (const jugador of sesion.players) {
    if (!jugador.email) continue;

    const cuenta = await cuentaDe(jugador.email, jugador.displayName);
    if (cuenta.partidas.some((p) => p.gameId === game.id)) continue;

    const personaje = plot.characters.find((c) => c.suspectId === jugador.suspectId);
    const suya = sesion.acusaciones.find((a) => a.suspectId === jugador.suspectId);
    const eraCulpable = culpableDe(plot.solution) === jugador.suspectId;
    const gano = sesion.winnerId === jugador.suspectId;

    const partida: PartidaJugada = {
      gameId: game.id,
      titulo: plot.title,
      personaje: personaje?.characterName ?? jugador.displayName,
      jugadaEl: new Date().toISOString(),
      acerto: suya?.correcta ?? false,
      gano,
      eraCulpable,
    };
    cuenta.partidas.push(partida);

    // ---- Trofeos ----
    const ganados = new Set<TrofeoId>(cuenta.trofeos);
    if (cuenta.partidas.length === 1) ganados.add('primera-partida');
    if (gano) ganados.add('ganador');
    // Sabueso: acertó y fue la primera acusación que entregó (siempre lo es,
    // porque solo se admite una) Y acertó los tres campos a la vez.
    if (suya?.correcta) ganados.add('sabueso');
    if (eraCulpable && !sesion.winnerId) ganados.add('culpable-impune');
    if (jugador.notas.length > 1000) ganados.add('escribano');
    // Superviviente: emparejó y seguía vivo al cerrar.
    if (jugador.joined && jugador.lastSeenAt) {
      const margen = Date.now() - new Date(jugador.lastSeenAt).getTime();
      if (margen < 5 * 60_000) ganados.add('superviviente');
    }
    cuenta.trofeos = [...ganados];

    await store.saveAccount(cuenta);
    jugador.accountId = cuenta.id;
  }
}

/** Perfil que ve el jugador en la app: su historial y sus trofeos. */
export async function perfilDe(email: string | undefined): Promise<Account | null> {
  if (!email) return null;
  const store = getStore();
  return store.getAccountByEmail(normalizarEmail(email));
}

/**
 * Borra la cuenta de un correo Y desengancha ese correo de todas las partidas.
 *
 * LAS DOS COSAS, y este es el motivo de que no sea una línea. Borrar solo la
 * fila de la cuenta no borra nada en la práctica:
 *
 *   1. El correo sigue escrito en `sesion.players[].email`, así que en cuanto
 *      esa partida llegue al desenlace, `cerrarPartidaEnCuentas` vuelve a
 *      crear la cuenta con el mismo correo. Borrada el martes, de vuelta el
 *      sábado.
 *   2. Y aunque se limpiara la sesión, `sincronizarJugadores` copia el correo
 *      DESDE la partida cada vez que se sincroniza (`{ ...previo, email:
 *      s.email }`). Hay que quitarlo también de `game.suspects`, o el primer
 *      «sincronizar» del Game Master lo devuelve a su sitio.
 *
 * Se barren TODAS las partidas, no solo aquella desde la que se pidió el
 * borrado: quien dice «borra mis datos» no está hablando de una velada.
 *
 * Lo que NO se toca: el historial de los demás y la partida en sí. Que alguien
 * jugara y ganara es un hecho de la mesa, no un dato personal suyo en exclusiva;
 * lo que desaparece es el correo que lo identifica y todo lo colgado de él.
 *
 * Devuelve cuántas partidas quedaron limpias, para poder contarlo.
 */
export async function borrarCuentaDe(email: string): Promise<{
  cuentaBorrada: boolean;
  partidasLimpiadas: number;
}> {
  const store = getStore();
  const normalizado = normalizarEmail(email);

  const cuenta = await store.getAccountByEmail(normalizado);
  if (cuenta) await store.deleteAccount(cuenta.id);

  let partidasLimpiadas = 0;
  for (const resumen of await store.listGames()) {
    const game = await store.getGame(resumen.id);
    if (!game) continue;

    let tocada = false;
    for (const sospechoso of game.suspects) {
      if (sospechoso.email && normalizarEmail(sospechoso.email) === normalizado) {
        delete sospechoso.email;
        tocada = true;
      }
    }
    if (tocada) await store.saveGame(game);

    // Por `mutar`, no a pelo: doce móviles pueden estar escribiendo notas y
    // eligiendo sala en este mismo instante, y una lectura-modificación-
    // escritura por libre se lleva por delante lo que se guardara entretanto.
    // Que la revisión suba está bien: para quien pierde la cuenta, su pantalla
    // de perfil ha cambiado de verdad.
    if (await store.getLive(game.id)) {
      const { resultado } = await mutar(game.id, (sesion) => {
        let sesionTocada = false;
        for (const jugador of sesion.players) {
          if (jugador.email && normalizarEmail(jugador.email) === normalizado) {
            delete jugador.email;
            delete jugador.accountId;
            sesionTocada = true;
          }
        }
        return sesionTocada;
      });
      if (resultado) tocada = true;
    }

    if (tocada) partidasLimpiadas++;
  }

  return { cuentaBorrada: Boolean(cuenta), partidasLimpiadas };
}
