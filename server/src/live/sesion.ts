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
import { senalEnMemoria, volcarPresencia } from './presencia';
import { iniciarJuego } from '../juegos/inicios';
import { ALFABETO_CODIGO, PAPELES_EN_JUEGO } from '../../../shared/live';
import type { PapelDeFase } from '../../../shared/live';
import { aciertos, ejes as ejesDe, esElSenalado, fasesConPapel, manifiestoDe, papelDe, personasDe, respuestaCompleta } from '../../../shared/juegos';
import type { EjeId, JuegoId } from '../../../shared/juegos';
import type { Acusacion, LivePhase, LivePlayer, LiveSession } from '../../../shared/live';
import type { GameSession } from '../../../shared/types';
import { ganadoresDe } from '../juegos/veredictos';

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
    /*
     * La presencia que se haya acumulado en memoria se va con esta escritura.
     * Es gratis —la escritura ocurria igual— y deja el documento al dia para
     * quien lo lea sin pasar por el registro de memoria. Si no hay nada
     * anotado no toca nada, que es lo que mantiene identico el maestro de oro.
     */
    volcarPresencia(sesion);
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
   * Y SE GUARDA, PERO POR `mutar`.
   *
   * `sincronizarJugadores` alinea la lista con la partida —da silla a quien se
   * ha añadido después— pero devolvía la sesión sin escribirla, así que quien
   * llegaba tarde aparecía en la respuesta de esa llamada y se esfumaba en la
   * siguiente lectura: sin silla, sin código y sin forma de entrar.
   *
   * El primer arreglo fue un `saveLive` suelto aquí mismo, y era peor que el
   * fallo: leer, modificar y escribir por libre mientras alguien acusa desde
   * otra petición pisa la acusación entera. `saveLive` reemplaza el documento
   * completo en las dos tiendas, así que la partida vuelve a un estado anterior
   * con el móvil ya avisado de que había ganado. Es exactamente contra lo que
   * previene el comentario de `mutar`, cuatro pantallas más arriba.
   */
  if (existente) {
    const { sesion } = await mutar(game.id, (s) => {
      sincronizarJugadores(s, game);
    });
    return sesion;
  }

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
    /*
     * LA FASE DE ESPERA DE ESTE JUEGO, no la llamada `lobby`.
     *
     * Era el ultimo nombre de fase escrito a mano en el nucleo, y lo encontro la
     * prueba del juego de fuera: «La Farola» llama `antes-de-salir` a su sala de
     * espera, y su mesa se abria en `lobby` — una fase que ese juego no declara,
     * asi que desde ella no habia camino a ninguna parte y la partida nacia
     * muerta.
     *
     * Sin fase de espera declarada se cae en `lobby`, que es lo que tienen las
     * partidas de siempre.
     */
    phase: fasesConPapel(manifiestoDe(game.settings?.juego), 'espera')[0] ?? 'lobby',
    round: 0,
    totalRounds: game.plot ? numeroDeRondas(game.plot) : 4,
    players: personasDe(game).map((s) => nuevoJugador(s.id, s.name, s.email)),
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

function nuevoJugador(participanteId: string, displayName: string, email?: string): LivePlayer {
  return {
    participanteId,
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
  const porId = new Map(sesion.players.map((p) => [p.participanteId, p]));
  sesion.players = personasDe(game).map((s) => {
    const previo = porId.get(s.id);
    if (!previo) return nuevoJugador(s.id, s.name, s.email);
    return { ...previo, displayName: s.name, email: s.email };
  });
  if (game.plot) sesion.totalRounds = numeroDeRondas(game.plot);
  return sesion;
}

/**
 * Vuelve a alinear la sesión con la partida (jugadores añadidos o quitados).
 *
 * POR `mutar`, no por un `saveLive` suelto: ver la explicación de `abrirSesion`.
 * La lectura previa solo sirve para distinguir «no hay sesión» —que es una
 * respuesta legítima— de un error de verdad.
 */
export async function refrescarSesion(game: GameSession): Promise<LiveSession | null> {
  const store = getStore();
  if (!(await store.getLive(game.id))) return null;
  const { sesion } = await mutar(game.id, (s) => {
    sincronizarJugadores(s, game);
  });
  return sesion;
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

/**
 * A qué fase de ESTE juego lleva una transición.
 *
 * ═══ LAS TRANSICIONES TENIAN ESCRITO EL NOMBRE ═══
 *
 * `abrirRonda` decía literalmente «pasa a la fase llamada `ronda-abierta`», y
 * las otras seis igual. Mientras los nombres fueron los mismos para todos eso
 * funcionaba; en cuanto un juego llama `lote-cantado` a su turno, `abrirRonda`
 * revienta con «No se puede pasar de sala-vacia a ronda-abierta» — que es un
 * mensaje sobre fases que ese juego no tiene.
 *
 * Ahora se pregunta por el PAPEL y el juego contesta con su nombre.
 *
 * PREFIERE LA ALCANZABLE. Si desde donde estamos hay camino a una de las
 * candidatas, esa; si no, la primera que declare. Importa en un juego con dos
 * fases del mismo papel —una campaña con dos clases de turno— donde ir a la que
 * toca no es lo mismo que ir a la primera de la lista.
 */
function faseCon(sesion: LiveSession, papel: PapelDeFase): LivePhase {
  const manifiesto = manifiestoDe(sesion.juego);
  const candidatas = fasesConPapel(manifiesto, papel);
  const desdeAqui = manifiesto.fases[sesion.phase] ?? [];
  return candidatas.find((f) => desdeAqui.includes(f)) ?? candidatas[0] ?? papel;
}

export const MINUTOS_POR_RONDA = 15;

export function abrirRonda(sesion: LiveSession, minutos = MINUTOS_POR_RONDA): void {
  const destino = faseCon(sesion, 'turno');
  if (!puedePasarA(sesion.juego, sesion.phase, destino)) {
    throw new TransicionInvalida(sesion.phase, destino);
  }
  const ahora = new Date();
  sesion.round += 1;
  /*
   * LA PARTIDA NO SE ACABA PORQUE SE ACABE EL GUION.
   *
   * `totalRounds` sale del reparto de pistas de la trama: es cuántas rondas
   * tenía PREVISTAS quien la escribió. Se estaba usando además como tope duro
   * —el panel de quien dirige escondía el botón de abrir ronda al llegar a la
   * última—, y eso convertía una previsión en una regla: si a la cuarta ronda la
   * mesa seguía sin tenerlo claro, no había forma de darles una quinta salvo
   * empujarles a acusar a ciegas.
   *
   * Así que la previsión cede ante lo que de verdad ha pasado. Al abrir una
   * ronda de más, el total pasa a ser esa ronda, y todo lo que se cuenta «de N»
   * —el rótulo del móvil, el contexto del Mayordomo— sigue diciendo la verdad en
   * vez de «ronda 5 de 4».
   *
   * No desordena el reparto de conocimiento: `conocimientoDesbloqueado` reparte
   * `ceil(total/rondas)` piezas por ronda, y al llegar a la última ya está todo
   * fuera. Subir el total baja el ritmo de las rondas futuras, nunca retira algo
   * que ya se había entregado.
   */
  if (sesion.round > sesion.totalRounds) sesion.totalRounds = sesion.round;
  sesion.phase = destino;
  sesion.roundStartedAt = ahora.toISOString();
  sesion.roundEndsAt = new Date(ahora.getTime() + minutos * 60_000).toISOString();
  if (!sesion.startedAt) sesion.startedAt = ahora.toISOString();
}

export function cerrarRonda(sesion: LiveSession): void {
  const destino = faseCon(sesion, 'entreacto');
  if (!puedePasarA(sesion.juego, sesion.phase, destino)) {
    throw new TransicionInvalida(sesion.phase, destino);
  }
  sesion.phase = destino;
  sesion.roundEndsAt = undefined;
  /*
   * Se anota en qué salas estuvo alguien. NO ES UN TABLÓN: esta lista publicaba
   * las pistas de esas salas a toda la mesa, y esa regla se retiró —lo que se
   * encuentra es de quien lo encuentra—. Se sigue anotando porque es historia de
   * la partida, pero ya no la lee ninguna proyección hacia un jugador.
   */
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
  const destino = faseCon(sesion, 'pausa');
  if (!puedePasarA(sesion.juego, sesion.phase, destino)) {
    throw new TransicionInvalida(sesion.phase, destino);
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
  sesion.phase = destino;
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
  // Por el papel: solo se retoma desde una pausa entre encuentros.
  if (papelDe(manifiestoDe(sesion.juego), sesion.phase) !== 'pausa') {
    throw new TransicionInvalida(sesion.phase, faseCon(sesion, 'espera'));
  }
  sesion.encuentro = (sesion.encuentro ?? 1) + 1;
  sesion.phase = faseCon(sesion, 'espera');
}

export function abrirAcusaciones(sesion: LiveSession): void {
  const destino = faseCon(sesion, 'decision');
  if (!puedePasarA(sesion.juego, sesion.phase, destino)) {
    throw new TransicionInvalida(sesion.phase, destino);
  }
  sesion.phase = destino;
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
  const destino = faseCon(sesion, 'decision');
  if (!puedePasarA(sesion.juego, sesion.phase, destino)) {
    throw new TransicionInvalida(sesion.phase, destino);
  }
  sesion.phase = destino;
  sesion.roundEndsAt = undefined;
}

export function revelarDesenlace(game: GameSession, sesion: LiveSession): void {
  const destino = faseCon(sesion, 'fin');
  if (!puedePasarA(sesion.juego, sesion.phase, destino)) {
    throw new TransicionInvalida(sesion.phase, destino);
  }
  sesion.phase = destino;
  /*
   * QUIÉNES GANARON, PREGUNTÁNDOLE AL JUEGO, y se guarda aquí y una sola vez.
   *
   * `winnerId` --que se sigue escribiendo igual-- significa «el primero que
   * acertó la acusación»: en CLUEDO es exactamente ganar y en un juego de bandos
   * no lo es. Se resuelve en este instante porque es cuando la partida termina y
   * el resultado ya no cambia, y se GUARDA porque quien lo lee después --el panel
   * de partidas de cada cuenta-- tiene la sesión pero no la partida entera, y
   * cargarla por cada fila sería un viaje al almacén por línea de una lista.
   *
   * Un juego sin veredicto dado de alta no escribe nada, y entonces manda
   * `winnerId`, que es lo que había. CLUEDO no registra ninguno.
   */
  const ganadores = ganadoresDe(game, sesion);
  if (ganadores) sesion.ganadores = ganadores;
}

// ---------------------------------------------------------------------------
// Acciones de jugador
// ---------------------------------------------------------------------------

export function elegirSala(sesion: LiveSession, participanteId: string, roomId: string): void {
  if (sesion.phase !== 'ronda-abierta') {
    throw new Error('Solo puedes elegir sala con la ronda abierta.');
  }
  const jugador = sesion.players.find((p) => p.participanteId === participanteId);
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

export function guardarNotas(sesion: LiveSession, participanteId: string, notas: string): void {
  const jugador = sesion.players.find((p) => p.participanteId === participanteId);
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
  participanteId: string,
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
   * POR EL PAPEL, NO POR EL NOMBRE. Era `FASES_EN_JUEGO.includes(sesion.phase)`
   * contra una lista de cuatro nombres escrita en el contrato comun —los de
   * CLUEDO mas el sellado de la Momia—, asi que un juego con fases propias no
   * podia señalar a nadie en ninguna de ellas. Ahora se pregunta si en esta
   * fase se esta jugando, que es lo que hace falta saber.
   */
  if (!PAPELES_EN_JUEGO.includes(papelDe(manifiestoDe(sesion.juego), sesion.phase))) {
    throw new Error('Todavía no se puede acusar.');
  }
  if (sesion.acusaciones.some((a) => a.participanteId === participanteId)) {
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
    participanteId,
    respuestas: { ...eleccion },
    at: new Date().toISOString(),
    correcta,
  };
  sesion.acusaciones.push(acusacion);

  // Quien es señalado por el eje que apunta a la mesa no puede ganar
  // acusándose: su juego es no ser descubierto.
  const esElCulpable = esElSenalado(manifiesto, solucion, participanteId);
  const ganador = correcta && !esElCulpable && !sesion.winnerId;
  if (ganador) sesion.winnerId = participanteId;

  return { acusacion, ganador };
}

/**
 * La última señal de vida, en epoch ms. 0 si no consta ninguna.
 *
 * SIEMPRE LA MÁS RECIENTE DE LAS DOS. La presencia del rato vive en memoria
 * —ver `presencia.ts`, y por qué— y el documento guarda lo que arrastró la
 * última escritura de verdad. Cuál de las dos va por delante depende de si ha
 * pasado algo en la partida hace poco, así que preguntar solo a una se
 * equivoca la mitad de las veces. `gameId` es opcional porque hay sitios que
 * solo tienen el jugador delante: allí se lee el documento, como siempre.
 */
export function ultimaSenal(jugador: LivePlayer, gameId?: string): number {
  const enDocumento = jugador.lastSeenAt ? Date.parse(jugador.lastSeenAt) : NaN;
  const enMemoria = gameId ? senalEnMemoria(gameId, jugador.participanteId) : 0;
  return Math.max(Number.isFinite(enDocumento) ? enDocumento : 0, enMemoria);
}

/** Se considera conectado si dio señales de vida hace menos de un minuto. */
export function estaConectado(jugador: LivePlayer, gameId?: string): boolean {
  const cuando = ultimaSenal(jugador, gameId);
  if (cuando === 0) return false;
  return Date.now() - cuando < 60_000;
}

export { nanoid };
