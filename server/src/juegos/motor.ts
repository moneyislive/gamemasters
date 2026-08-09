/**
 * El motor de acciones: lo que un jugador puede hacer, y quién decide qué pasa.
 *
 * Hasta ahora lo único que se podía hacer en una ronda era elegir sala, y
 * estaba escrito en el tipo (`EleccionDeSala` guarda un `roomId` y nada más).
 * Eso vale para CLUEDO y para nada que no sea CLUEDO: una oca tira un dado, un
 * juego de rol reparte botín, un juego de espías entrega un sobre.
 *
 * EL REPARTO DE RESPONSABILIDADES, que es lo importante:
 *
 *   El MOTOR (esto) comprueba lo que es igual en todos los juegos: que la
 *   acción exista en el repertorio, que la fase la admita, que a quien la pide
 *   le toque, que no repita más veces de las permitidas y que lo que elige sea
 *   una entidad real de la categoría que la acción declara.
 *
 *   El JUEGO pone lo que significa. Un reductor recibe la sesión y los datos ya
 *   validados, y muta lo que tenga que mutar. El motor no interpreta nada de
 *   lo que escriba.
 *
 * Con eso, añadir «descifrar el criptograma» a un juego es escribir una entrada
 * en su manifiesto y un reductor de diez líneas. No se toca ni una ruta, ni la
 * proyección, ni la app.
 */
import { entidadesDe } from './entidades';
import { manifiestoDe } from '../../../shared/juegos';
import type { DefinicionAccion, JuegoId } from '../../../shared/juegos';
import type { LiveSession } from '../../../shared/live';
import type { GameSession } from '../../../shared/types';

/** Lo que recibe un reductor: todo ya comprobado. */
export interface ContextoAccion {
  game: GameSession;
  sesion: LiveSession;
  /** Quién la hace. */
  suspectId: string;
  /** Lo que ha elegido, campo a campo, con ids ya verificados. */
  datos: Record<string, string>;
  /** La definición, por si el reductor quiere consultar sus límites. */
  definicion: DefinicionAccion;
}

/** Lo que hace una acción. Muta la sesión; lo que devuelva se le envía a quien la pidió. */
export type Reductor = (ctx: ContextoAccion) => unknown;

export class AccionInvalida extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'AccionInvalida';
  }
}

/**
 * Los reductores, por juego.
 *
 * Anclado al ámbito global por la misma razón que el registro de juegos: este
 * módulo se puede cargar dos veces según por qué ruta se importe, y con una
 * constante de módulo las altas se perderían en silencio. Ya ocurrió una vez.
 */
const LLAVE = Symbol.for('gamemasters.juegos.reductores');
const global_ = globalThis as unknown as Record<symbol, Record<string, Record<string, Reductor>>>;
const REDUCTORES: Record<JuegoId, Record<string, Reductor>> =
  global_[LLAVE] ?? (global_[LLAVE] = {});

/** Da de alta lo que hacen las acciones de un juego. */
export function registrarAcciones(juego: JuegoId, reductores: Record<string, Reductor>): void {
  REDUCTORES[juego] = { ...(REDUCTORES[juego] ?? {}), ...reductores };
}

/** Cuántas veces ha hecho ya esta persona esta acción en la ronda en curso. */
function vecesEsteTurno(sesion: LiveSession, suspectId: string, accion: string): number {
  return (sesion.acciones ?? []).filter(
    (a) => a.suspectId === suspectId && a.accion === accion && a.round === sesion.round,
  ).length;
}

/**
 * Ejecuta una acción.
 *
 * @throws {AccionInvalida} con un mensaje que se le puede enseñar a quien juega.
 */
export function ejecutarAccion(
  game: GameSession,
  sesion: LiveSession,
  suspectId: string,
  accion: string,
  datos: Record<string, string>,
): unknown {
  const manifiesto = manifiestoDe(sesion.juego);
  const definicion = manifiesto.acciones.find((a) => a.id === accion);
  if (!definicion) {
    throw new AccionInvalida('Eso no se puede hacer en esta partida.');
  }
  if (!definicion.fases.includes(sesion.phase)) {
    throw new AccionInvalida(`Ahora mismo no toca ${definicion.rotulo.toLowerCase()}.`);
  }
  if (!sesion.players.some((p) => p.suspectId === suspectId)) {
    throw new AccionInvalida('No participas en esta partida.');
  }

  // Por turnos: solo actúa quien lo tiene. Simultáneo: cualquiera, cuando quiera.
  if (manifiesto.turnos === 'por-turnos' && sesion.turnoDe && sesion.turnoDe !== suspectId) {
    throw new AccionInvalida('No es tu turno.');
  }

  if (
    definicion.vecesPorTurno !== undefined &&
    vecesEsteTurno(sesion, suspectId, accion) >= definicion.vecesPorTurno
  ) {
    throw new AccionInvalida(
      definicion.vecesPorTurno === 1
        ? 'Eso solo se puede hacer una vez.'
        : `Eso solo se puede hacer ${definicion.vecesPorTurno} veces por ronda.`,
    );
  }

  // Lo que elige tiene que existir DE VERDAD, y en la categoría que toca. Sin
  // esto, un móvil manipulado podría mandar el id de una sala como si fuera un
  // sospechoso y colarse por donde no debe.
  const limpios: Record<string, string> = {};
  for (const campo of definicion.eligeDe ?? []) {
    const valor = String(datos[campo.campo] ?? '');
    if (!valor) throw new AccionInvalida(`Falta elegir: ${campo.rotulo}`);
    if (!entidadesDe(game, campo.categoria).some((e) => e.id === valor)) {
      throw new AccionInvalida(`Esa no es una opción válida para «${campo.rotulo}».`);
    }
    limpios[campo.campo] = valor;
  }

  const reductor = REDUCTORES[manifiesto.id]?.[accion];
  if (!reductor) {
    throw new AccionInvalida('Esta partida todavía no sabe hacer eso.');
  }

  const resultado = reductor({ game, sesion, suspectId, datos: limpios, definicion });

  // Queda registrado para poder contar repeticiones y para que quien dirige vea
  // lo que va pasando.
  sesion.acciones = [
    ...(sesion.acciones ?? []),
    { suspectId, accion, round: sesion.round, at: new Date().toISOString() },
  ];
  return resultado;
}

/** Qué puede hacer ahora mismo esta persona. Lo usa la proyección. */
export function accionesDisponibles(
  sesion: LiveSession,
  suspectId: string,
): DefinicionAccion[] {
  const manifiesto = manifiestoDe(sesion.juego);
  if (manifiesto.turnos === 'por-turnos' && sesion.turnoDe && sesion.turnoDe !== suspectId) {
    return [];
  }
  return manifiesto.acciones.filter(
    (a) =>
      a.fases.includes(sesion.phase) &&
      (a.vecesPorTurno === undefined ||
        vecesEsteTurno(sesion, suspectId, a.id) < a.vecesPorTurno),
  );
}
