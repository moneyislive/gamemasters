/**
 * La partida en vivo: creación, máquina de estados y mutaciones.
 *
 * Todas las escrituras pasan por `mutar`, que serializa por partida. Doce
 * móviles escribiendo notas, eligiendo sala y acusando a la vez producirían
 * lecturas y escrituras entrelazadas y se perderían cambios; con el candado por
 * sesión, cada mutación ve el estado que dejó la anterior.
 */
import { nanoid } from 'nanoid';
import { getStore } from '../db/store';
import { numeroDeRondas } from '../docs/datos';
import { avisarCambio } from './hub';
import { ALFABETO_CODIGO } from '../../../shared/live';
import { manifiestoDe } from '../../../shared/juegos';
import type { JuegoId } from '../../../shared/juegos';
import type { Acusacion, LivePhase, LivePlayer, LiveSession } from '../../../shared/live';
import type { GameSession } from '../../../shared/types';

// ---------------------------------------------------------------------------
// Candado por partida
// ---------------------------------------------------------------------------

const candados = new Map<string, Promise<unknown>>();

/**
 * Ejecuta una mutación sobre la sesión en vivo con exclusión mutua.
 * El resultado se persiste antes de soltar el turno.
 */
export async function mutar<T>(
  gameId: string,
  cambio: (sesion: LiveSession) => T | Promise<T>,
): Promise<{ sesion: LiveSession; resultado: T }> {
  const anterior = candados.get(gameId) ?? Promise.resolve();
  let liberar!: () => void;
  const turno = new Promise<void>((r) => {
    liberar = r;
  });
  candados.set(
    gameId,
    anterior.then(() => turno),
  );
  await anterior;

  try {
    const store = getStore();
    const sesion = await store.getLive(gameId);
    if (!sesion) throw new Error('Esta partida no está en juego.');
    const resultado = await cambio(sesion);
    // La revisión sube en CADA mutación: es lo que despierta a los móviles que
    // están esperando cambios.
    sesion.rev = (sesion.rev ?? 0) + 1;
    const guardada = await store.saveLive(sesion);
    avisarCambio(gameId);
    return { sesion: guardada, resultado };
  } finally {
    liberar();
    // Si nadie más espera, se retira el candado para no acumular memoria.
    if (candados.get(gameId) === turno) candados.delete(gameId);
  }
}

// ---------------------------------------------------------------------------
// Códigos
// ---------------------------------------------------------------------------

function codigoAleatorio(longitud: number): string {
  let salida = '';
  const bytes = crypto.getRandomValues(new Uint8Array(longitud));
  for (let i = 0; i < longitud; i++) {
    salida += ALFABETO_CODIGO[bytes[i]! % ALFABETO_CODIGO.length];
  }
  return salida;
}

/** Código de partida que no choque con otra en curso. */
async function codigoLibre(): Promise<string> {
  const store = getStore();
  for (let intento = 0; intento < 12; intento++) {
    const codigo = codigoAleatorio(5);
    if (!(await store.getLiveByCode(codigo))) return codigo;
  }
  // Improbable, pero mejor un código largo que un bucle infinito.
  return codigoAleatorio(8);
}

// ---------------------------------------------------------------------------
// Creación
// ---------------------------------------------------------------------------

/**
 * Abre la sala de espera de una partida ya generada.
 *
 * Si ya existía una sesión se conserva: reabrir no puede echar a la gente que
 * ya emparejó su móvil ni cambiarle el código que tienen apuntado.
 */
export async function abrirSesion(game: GameSession): Promise<LiveSession> {
  const store = getStore();
  const existente = await store.getLive(game.id);
  if (existente) return sincronizarJugadores(existente, game);

  const sesion: LiveSession = {
    id: game.id,
    code: await codigoLibre(),
    phase: 'lobby',
    round: 0,
    totalRounds: game.plot ? numeroDeRondas(game.plot) : 4,
    players: game.suspects.map((s) => nuevoJugador(s.id, s.name, s.email)),
    acusaciones: [],
    tablon: [],
    rev: 1,
    updatedAt: new Date().toISOString(),
  };
  return store.saveLive(sesion);
}

function nuevoJugador(suspectId: string, displayName: string, email?: string): LivePlayer {
  return {
    suspectId,
    displayName,
    email,
    joinCode: codigoAleatorio(6),
    joined: false,
    elecciones: [],
    notas: '',
    girosRecibidos: [],
  };
}

/**
 * Ajusta la lista de jugadores a los sospechosos actuales de la partida.
 * Quien ya emparejó conserva su código y sus notas; los nuevos reciben el suyo.
 */
function sincronizarJugadores(sesion: LiveSession, game: GameSession): LiveSession {
  const porId = new Map(sesion.players.map((p) => [p.suspectId, p]));
  sesion.players = game.suspects.map((s) => {
    const previo = porId.get(s.id);
    if (!previo) return nuevoJugador(s.id, s.name, s.email);
    return { ...previo, displayName: s.name, email: s.email };
  });
  if (game.plot) sesion.totalRounds = numeroDeRondas(game.plot);
  return sesion;
}

/** Vuelve a alinear la sesión con la partida (jugadores añadidos o quitados). */
export async function refrescarSesion(game: GameSession): Promise<LiveSession | null> {
  const store = getStore();
  const sesion = await store.getLive(game.id);
  if (!sesion) return null;
  return store.saveLive(sincronizarJugadores(sesion, game));
}

// ---------------------------------------------------------------------------
// Máquina de estados
// ---------------------------------------------------------------------------

/** Transiciones permitidas. Cualquier otra se rechaza con un mensaje claro. */
/**
 * CATA: la tabla de transiciones ya no vive aquí, la declara cada juego.
 *
 * Al hacerlo saltó lo primero que se rompe: esta función se llamaba con dos
 * fases y ya está, pero para saber qué transiciones valen hay que saber a qué
 * se juega. De ahí que `LiveSession` lleve ahora su propio `juego`: las cuatro
 * funciones que gobiernan las fases reciben la sesión y nada más.
 */
export function puedePasarA(
  juego: JuegoId | undefined,
  desde: LivePhase,
  hasta: LivePhase,
): boolean {
  return manifiestoDe(juego).fases[desde]?.includes(hasta) ?? false;
}

export class TransicionInvalida extends Error {
  constructor(desde: LivePhase, hasta: LivePhase) {
    super(`No se puede pasar de «${desde}» a «${hasta}».`);
    this.name = 'TransicionInvalida';
  }
}

/** Minutos por defecto de una ronda. El Game Master puede alargarla. */
export const MINUTOS_POR_RONDA = 15;

export function abrirRonda(sesion: LiveSession, minutos = MINUTOS_POR_RONDA): void {
  if (!puedePasarA(sesion.juego, sesion.phase,'ronda-abierta')) {
    throw new TransicionInvalida(sesion.phase, 'ronda-abierta');
  }
  const ahora = new Date();
  sesion.round += 1;
  sesion.phase = 'ronda-abierta';
  sesion.roundStartedAt = ahora.toISOString();
  sesion.roundEndsAt = new Date(ahora.getTime() + minutos * 60_000).toISOString();
  if (!sesion.startedAt) sesion.startedAt = ahora.toISOString();
}

export function cerrarRonda(sesion: LiveSession): void {
  if (!puedePasarA(sesion.juego, sesion.phase,'ronda-cerrada')) {
    throw new TransicionInvalida(sesion.phase, 'ronda-cerrada');
  }
  sesion.phase = 'ronda-cerrada';
  sesion.roundEndsAt = undefined;
  // Lo que alguien encontró pasa al tablón común: es la regla de la mesa.
  for (const jugador of sesion.players) {
    const eleccion = jugador.elecciones.find((e) => e.round === sesion.round);
    if (!eleccion) continue;
    const yaEsta = sesion.tablon.some(
      (t) => t.round === sesion.round && t.roomId === eleccion.roomId,
    );
    if (!yaEsta) sesion.tablon.push({ round: sesion.round, roomId: eleccion.roomId });
  }
}

export function abrirAcusaciones(sesion: LiveSession): void {
  if (!puedePasarA(sesion.juego, sesion.phase,'acusaciones')) {
    throw new TransicionInvalida(sesion.phase, 'acusaciones');
  }
  sesion.phase = 'acusaciones';
  sesion.roundEndsAt = undefined;
}

export function revelarDesenlace(sesion: LiveSession): void {
  if (!puedePasarA(sesion.juego, sesion.phase,'desenlace')) {
    throw new TransicionInvalida(sesion.phase, 'desenlace');
  }
  sesion.phase = 'desenlace';
}

// ---------------------------------------------------------------------------
// Acciones de jugador
// ---------------------------------------------------------------------------

export function elegirSala(sesion: LiveSession, suspectId: string, roomId: string): void {
  if (sesion.phase !== 'ronda-abierta') {
    throw new Error('Solo puedes elegir sala con la ronda abierta.');
  }
  const jugador = sesion.players.find((p) => p.suspectId === suspectId);
  if (!jugador) throw new Error('No participas en esta partida.');
  const previa = jugador.elecciones.find((e) => e.round === sesion.round);
  if (previa) {
    // Un solo cambio por ronda, como en la mesa.
    if (previa.roomId === roomId) return;
    if (previa.at !== undefined && jugador.elecciones.filter((e) => e.round === sesion.round).length > 1) {
      throw new Error('Ya has usado tu cambio de sala en esta ronda.');
    }
  }
  jugador.elecciones.push({ round: sesion.round, roomId, at: new Date().toISOString() });
}

/** Sala en la que está un jugador en la ronda dada (la última que eligió). */
export function salaDe(jugador: LivePlayer, round: number): string | undefined {
  const deLaRonda = jugador.elecciones.filter((e) => e.round === round);
  return deLaRonda[deLaRonda.length - 1]?.roomId;
}

export function guardarNotas(sesion: LiveSession, suspectId: string, notas: string): void {
  const jugador = sesion.players.find((p) => p.suspectId === suspectId);
  if (!jugador) throw new Error('No participas en esta partida.');
  // Tope generoso pero acotado: el cuaderno no puede tumbar el documento.
  jugador.notas = notas.slice(0, 20_000);
}

export interface ResultadoAcusacion {
  acusacion: Acusacion;
  /** ¿Ha ganado con ella? */
  ganador: boolean;
}

/**
 * Registra una acusación.
 *
 * La hora la pone el SERVIDOR: si viniera del móvil, bastaría con atrasar el
 * reloj del teléfono para ganar siempre. Y el culpable no puede ganar
 * acusándose a sí mismo: su juego es no ser descubierto.
 */
export function acusar(
  sesion: LiveSession,
  suspectId: string,
  eleccion: { murdererId: string; weaponId: string; roomId: string },
  solucion: { murdererId: string; weaponId: string; roomId: string },
): ResultadoAcusacion {
  if (sesion.phase !== 'acusaciones' && sesion.phase !== 'ronda-cerrada') {
    throw new Error('Todavía no se puede acusar.');
  }
  if (sesion.acusaciones.some((a) => a.suspectId === suspectId)) {
    throw new Error('Ya has entregado tu acusación. No se puede cambiar.');
  }

  const correcta =
    eleccion.murdererId === solucion.murdererId &&
    eleccion.weaponId === solucion.weaponId &&
    eleccion.roomId === solucion.roomId;

  const acusacion: Acusacion = {
    suspectId,
    ...eleccion,
    at: new Date().toISOString(),
    correcta,
  };
  sesion.acusaciones.push(acusacion);

  const esElCulpable = suspectId === solucion.murdererId;
  const ganador = correcta && !esElCulpable && !sesion.winnerId;
  if (ganador) sesion.winnerId = suspectId;

  return { acusacion, ganador };
}

/** Marca a un jugador como visto ahora mismo. */
export function tocar(sesion: LiveSession, suspectId: string): void {
  const jugador = sesion.players.find((p) => p.suspectId === suspectId);
  if (jugador) jugador.lastSeenAt = new Date().toISOString();
}

/** Se considera conectado si dio señales de vida hace menos de un minuto. */
export function estaConectado(jugador: LivePlayer): boolean {
  if (!jugador.lastSeenAt) return false;
  return Date.now() - new Date(jugador.lastSeenAt).getTime() < 60_000;
}

export { nanoid };
