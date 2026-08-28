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
import { iniciarJuego } from '../juegos/inicios';
import { ALFABETO_CODIGO, FASES_EN_JUEGO } from '../../../shared/live';
import { aciertos, esElSenalado, ejes as ejesDe, manifiestoDe, respuestaCompleta } from '../../../shared/juegos';
import type { EjeId, JuegoId } from '../../../shared/juegos';
import type { Acusacion, LivePhase, LivePlayer, LiveSession } from '../../../shared/live';
import type { GameSession } from '../../../shared/types';

// ---------------------------------------------------------------------------
// Candado por partida
// ---------------------------------------------------------------------------

const candados = new Map<string, Promise<unknown>>();

/**
 * Cuántos candados quedan vivos. Solo para comprobaciones.
 *
 * Existe porque la fuga que hubo aquí era invisible desde fuera: el mapa crecía
 * una entrada por partida jugada y nada en la API lo delataba. Sin una forma de
 * mirar dentro, la prueba que lo impide no se puede escribir.
 */
export function candadosVivos(): number {
  return candados.size;
}

/**
 * Ejecuta una mutación sobre la sesión en vivo con exclusión mutua.
 * El resultado se persiste antes de soltar el turno.
 */
export async function mutar<T>(
  gameId: string,
  cambio: (sesion: LiveSession) => T | Promise<T>,
  opciones: { silenciosa?: boolean; avisar?: (sesion: LiveSession) => void } = {},
): Promise<{ sesion: LiveSession; resultado: T }> {
  const anterior = candados.get(gameId) ?? Promise.resolve();
  let liberar!: () => void;
  const turno = new Promise<void>((r) => {
    liberar = r;
  });
  const miVez = anterior.then(() => turno);
  candados.set(gameId, miVez);
  await anterior;

  try {
    const store = getStore();
    const sesion = await store.getLive(gameId);
    if (!sesion) throw new Error('Esta partida no está en juego.');
    const resultado = await cambio(sesion);

    // Una mutación SILENCIOSA no sube la revisión ni despierta a nadie. Es para
    // la presencia: si marcar «sigo aquí» contara como cambio de partida, doce
    // móviles se despertarían unos a otros en bucle y la velada no pararía de
    // refrescarse. Pero pasa por el candado igual que todo lo demás, porque el
    // problema no era la revisión: era leer, modificar y escribir por libre,
    // que puede pisar una acusación guardada un instante antes.
    if (!opciones.silenciosa) {
      sesion.rev = (sesion.rev ?? 0) + 1;
    }
    const guardada = await store.saveLive(sesion);

    /*
     * El aviso se registra AQUÍ, antes de despertar a nadie, y no en quien
     * llama tras el `await`. Parece lo mismo y no lo es: al despertar, el móvil
     * que esperaba reanuda ANTES de que vuelva quien llamó a `mutar`, así que
     * podía preguntar por los avisos un instante antes de que el aviso
     * existiera. Se llevaba la revisión nueva sin la pista, y como pedirá los
     * siguientes «desde» esa revisión, la pista no le llegaría nunca. Un fallo
     * que aparece una vez de cada muchas y siempre delante de invitados.
     */
    opciones.avisar?.(guardada);

    if (!opciones.silenciosa) avisarCambio(gameId);
    return { sesion: guardada, resultado };
  } finally {
    liberar();
    // Si nadie más espera, se retira el candado para no acumular memoria.
    // Se compara contra la promesa que SE GUARDÓ, no contra `turno`: guardando
    // una y comparando la otra, la condición era siempre falsa y el candado no
    // se borraba jamás — una fuga silenciosa, una entrada por partida jugada.
    if (candados.get(gameId) === miVez) candados.delete(gameId);
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
  /*
   * Y SE GUARDA, que es lo que faltaba.
   *
   * `sincronizarJugadores` alinea la lista con la partida —da silla a quien se
   * ha añadido después— pero devolvía la sesión sin escribirla, así que quien
   * llegaba tarde aparecía en la respuesta de esa llamada y se esfumaba en la
   * siguiente lectura: sin silla, sin código y sin forma de entrar. Su hermano
   * `refrescarSesion` sí guardaba; este no, y es el que se llama al reabrir.
   */
  if (existente) return store.saveLive(sincronizarJugadores(existente, game));

  const sesion: LiveSession = {
    id: game.id,
    /*
     * A QUE SE JUEGA, copiado de la partida.
     *
     * Sin esta linea, `sesion.juego` se quedaba vacio y `manifiestoDe(undefined)`
     * cae en CLUEDO por diseno —para que las partidas de antes del manifiesto
     * sigan funcionando—. El efecto era que una partida declarada de otro juego
     * se jugaba como CLUEDO EN SILENCIO: sin error, sin aviso, con las fases y
     * las acciones equivocadas, y descubriendolo la noche de la velada.
     *
     * Es de los fallos peores que hay: el que no falla.
     */
    juego: game.settings?.juego,
    // Nuevo en cada apertura: es lo que invalida los móviles de la anterior.
    sid: nanoid(16),
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

  /*
   * Y lo que el juego necesite montado ANTES de guardar por primera vez.
   *
   * La plataforma no sabe qué es —ni tiene que saberlo—: pregunta. Un juego que
   * no registra nada abre exactamente igual que siempre, y CLUEDO no registra
   * nada, así que su apertura no cambia ni un byte.
   */
  iniciarJuego(game, sesion);

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

/**
 * Cierra la sesión de hoy sin terminar la partida.
 *
 * Es lo que separa una velada de una campaña. Al cerrar un encuentro NO se
 * pierde nada: siguen los códigos con los que la gente emparejó su móvil, sus
 * notas, el tablón común, los giros ya repartidos y el estado propio del juego
 * —las fichas, el inventario, lo que sea—. Lo único que cambia es que hoy ya
 * no se juega más.
 *
 * El resumen no es adorno. Una campaña se retoma al cabo de una semana, y sin
 * él nadie recuerda dónde lo dejaron.
 */
export function cerrarEncuentro(
  sesion: LiveSession,
  cierre: { titulo: string; resumen: string },
): void {
  if (!puedePasarA(sesion.juego, sesion.phase, 'intermedio')) {
    throw new TransicionInvalida(sesion.phase, 'intermedio');
  }

  const cronica = sesion.cronica ?? [];
  const encuentro = sesion.encuentro ?? 1;
  const desdeRonda = cronica.length > 0 ? (cronica[cronica.length - 1]!.hastaRonda + 1) : 1;

  sesion.cronica = [
    ...cronica,
    {
      encuentro,
      titulo: cierre.titulo.trim() || `Encuentro ${encuentro}`,
      resumen: cierre.resumen.trim(),
      desdeRonda,
      hastaRonda: sesion.round,
      cerradoEl: new Date().toISOString(),
    },
  ];
  sesion.phase = 'intermedio';
  sesion.roundEndsAt = undefined;
  // Nadie tiene el turno mientras la mesa está levantada.
  sesion.turnoDe = undefined;
  // El aviso de «estoy listo» se limpia: la próxima vez hay que volver a darlo.
  for (const jugador of sesion.players) jugador.pideEmpezar = false;
}

/**
 * Retoma la partida en el encuentro siguiente.
 *
 * Las rondas siguen contando hacia arriba en vez de reiniciarse: en una campaña
 * «la ronda 7» es un momento de la historia, y volver a empezar por uno haría
 * ambiguo todo lo ya escrito en el tablón y en la crónica.
 */
export function abrirEncuentro(sesion: LiveSession): void {
  if (sesion.phase !== 'intermedio') {
    throw new TransicionInvalida(sesion.phase, 'ronda-abierta');
  }
  sesion.encuentro = (sesion.encuentro ?? 1) + 1;
  sesion.phase = 'lobby';
}

export function abrirAcusaciones(sesion: LiveSession): void {
  if (!puedePasarA(sesion.juego, sesion.phase,'acusaciones')) {
    throw new TransicionInvalida(sesion.phase, 'acusaciones');
  }
  sesion.phase = 'acusaciones';
  sesion.roundEndsAt = undefined;
}

/**
 * Abre El Sellado.
 *
 * Es la hermana de `abrirAcusaciones` y hace lo mismo: comprobar que el juego
 * admite la transicion y cambiar de fase. La comprobacion sale del manifiesto,
 * asi que en CLUEDO —cuyo grafo declara `sellado: []`— esta llamada se rechaza
 * siempre, y ese rechazo es la garantia de que anadir la fase no le abre a
 * CLUEDO una puerta que no deberia tener.
 */
export function abrirSellado(sesion: LiveSession): void {
  if (!puedePasarA(sesion.juego, sesion.phase, 'sellado')) {
    throw new TransicionInvalida(sesion.phase, 'sellado');
  }
  sesion.phase = 'sellado';
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
  eleccion: Record<EjeId, string>,
  solucion: Record<EjeId, string>,
): ResultadoAcusacion {
  /*
   * SE PUEDE ACUSAR EN CUALQUIER MOMENTO DE JUEGO, y eso es lo que hace que
   * acusar sea una decisión y no un trámite: gana quien acierta ANTES, así que
   * esperar tiene un coste y arriesgarse pronto tiene premio. Antes solo se
   * admitía con la ronda cerrada o en una fase de acusaciones que tenía que
   * abrir quien dirige — y eso convertía la carrera en una cola.
   *
   * Lo que NO cambia: una acusación por persona y para toda la partida, no por
   * ronda. Lo comprueba la línea de abajo contra `sesion.acusaciones` entera.
   *
   * `FASES_EN_JUEGO` incluye la fase `acusaciones`, así que las partidas que ya
   * estén ahí siguen funcionando igual.
   */
  if (!FASES_EN_JUEGO.includes(sesion.phase)) {
    throw new Error('Todavía no se puede acusar.');
  }
  if (sesion.acusaciones.some((a) => a.suspectId === suspectId)) {
    throw new Error('Ya has entregado tu acusación. No se puede cambiar.');
  }

  const manifiesto = manifiestoDe(sesion.juego);
  if (!respuestaCompleta(manifiesto, eleccion)) {
    throw new Error('Tienes que responder a todo antes de acusar.');
  }

  // Acertar es coincidir en TODOS los ejes que declare el juego, sean tres o
  // sean otros tantos. Antes eran tres comparaciones escritas a mano.
  const correcta = aciertos(manifiesto, eleccion, solucion) === ejesDe(manifiesto).length;

  const acusacion: Acusacion = {
    suspectId,
    respuestas: { ...eleccion },
    at: new Date().toISOString(),
    correcta,
  };
  sesion.acusaciones.push(acusacion);

  // Quien es señalado por el eje que apunta a la mesa no puede ganar
  // acusándose: su juego es no ser descubierto.
  const esElCulpable = esElSenalado(manifiesto, solucion, suspectId);
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
