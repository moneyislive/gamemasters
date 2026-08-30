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
  participanteId: string;
  /** Lo que ha elegido, campo a campo, con ids ya verificados. */
  datos: Record<string, string>;
  /**
   * Lo elegido EN LISTA, con cada id ya verificado contra su categoría.
   *
   * Va en un campo aparte y no dentro de `datos` a propósito: mezclarlos
   * obligaría a que `datos` fuese `Record<string, string | string[]>`, y
   * entonces todos los reductores que ya existen tendrían que comprobar de qué
   * tipo es cada campo antes de usarlo. Separados, un juego que no use listas no
   * se entera de que existen.
   */
  listas: Record<string, string[]>;
  /**
   * Las CANTIDADES, ya validadas: número de verdad y dentro de sus límites.
   *
   * En un campo aparte por lo mismo que `listas`: mezclarlas en `datos` obligaría
   * a que fuese `Record<string, string | number>` y todos los reductores que ya
   * existen tendrían que mirar de qué tipo es cada campo antes de usarlo. Un
   * juego sin números no se entera de que esto existe.
   */
  numeros: Record<string, number>;
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
function vecesEsteTurno(sesion: LiveSession, participanteId: string, accion: string): number {
  return (sesion.acciones ?? []).filter(
    (a) => a.participanteId === participanteId && a.accion === accion && a.round === sesion.round,
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
  participanteId: string,
  accion: string,
  /*
   * Puede traer listas ademas de valores sueltos: hay acciones cuya respuesta es
   * una secuencia —ordenar los cinco ritos del sellado— y no cabia en un mapa de
   * cadenas. Todo se valida igual mas abajo, elemento a elemento.
   */
  datos: Record<string, string | string[]>,
): unknown {
  const manifiesto = manifiestoDe(sesion.juego);
  const definicion = manifiesto.acciones.find((a) => a.id === accion);
  if (!definicion) {
    throw new AccionInvalida('Eso no se puede hacer en esta partida.');
  }
  if (!definicion.fases.includes(sesion.phase)) {
    throw new AccionInvalida(`Ahora mismo no toca ${definicion.rotulo.toLowerCase()}.`);
  }
  if (!sesion.players.some((p) => p.participanteId === participanteId)) {
    throw new AccionInvalida('No participas en esta partida.');
  }

  // Por turnos: solo actúa quien lo tiene. Simultáneo: cualquiera, cuando quiera.
  if (manifiesto.turnos === 'por-turnos' && sesion.turnoDe && sesion.turnoDe !== participanteId) {
    throw new AccionInvalida('No es tu turno.');
  }

  if (
    definicion.vecesPorTurno !== undefined &&
    vecesEsteTurno(sesion, participanteId, accion) >= definicion.vecesPorTurno
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

  /*
   * Lo mismo, para lo que se elige en lista y para lo opcional. Cada elemento
   * pasa por la misma comprobacion: tiene que ser una entidad REAL de su
   * categoria. Admitir listas no afloja la garantia, solo cambia la forma.
   */
  const listas: Record<string, string[]> = {};
  for (const campo of definicion.eligeVarias ?? []) {
    const crudo = (datos as Record<string, unknown>)[campo.campo];
    if (!Array.isArray(crudo)) throw new AccionInvalida(`Falta elegir: ${campo.rotulo}`);
    const valores = crudo.map((v) => String(v ?? ''));
    if (campo.cuantas !== undefined && valores.length !== campo.cuantas) {
      throw new AccionInvalida(
        `${campo.rotulo}: hacen falta ${campo.cuantas}, y han llegado ${valores.length}.`,
      );
    }
    if (new Set(valores).size !== valores.length) {
      throw new AccionInvalida(`${campo.rotulo}: no se puede repetir.`);
    }
    const existentes = entidadesDe(game, campo.categoria);
    for (const valor of valores) {
      if (!existentes.some((e) => e.id === valor)) {
        throw new AccionInvalida(`Esa no es una opción válida para «${campo.rotulo}».`);
      }
    }
    listas[campo.campo] = valores;
  }

  for (const campo of definicion.eligeOpcional ?? []) {
    const valor = String(datos[campo.campo] ?? '');
    if (!valor) continue;
    if (!entidadesDe(game, campo.categoria).some((e) => e.id === valor)) {
      throw new AccionInvalida(`Esa no es una opción válida para «${campo.rotulo}».`);
    }
    limpios[campo.campo] = valor;
  }

  /*
   * Y lo que NO es una entidad, tal cual y sin validar.
   *
   * Aquí no hay nada que comprobar contra el manifiesto: cuál de tus dones o
   * cuál de tus fragmentos depende de tu estado secreto, que este motor no mira
   * a propósito. Lo valida el reductor, que sí lo conoce. Se copia solo lo
   * DECLARADO —igual que arriba—, así que un móvil no puede colar un campo que
   * la acción no pide.
   */
  for (const campo of definicion.eligeLibre ?? []) {
    const valor = String(datos[campo.campo] ?? '');
    if (valor) limpios[campo.campo] = valor;
  }

  /*
   * Y las CANTIDADES, que sí se validan.
   *
   * Al revés que `eligeLibre`, aquí el motor puede y debe comprobar: un número no
   * depende de ningún estado secreto —es aritmética, no reglas— y es justo la
   * clase de campo que un móvil manipulado mandaría en negativo, enorme, o como
   * `NaN`. Sin esto, un juego con dinero no podía ni preguntar la cantidad: el
   * motor descartaba el campo por no estar declarado y el reductor recibía
   * siempre el valor por defecto, sin dar ningún error.
   */
  const numeros: Record<string, number> = {};
  for (const campo of definicion.pideNumero ?? []) {
    const crudo = (datos as Record<string, unknown>)[campo.campo] ?? campo.porDefecto;
    if (crudo === undefined || crudo === null || crudo === '') {
      throw new AccionInvalida(`Falta un número: ${campo.rotulo}`);
    }
    const valor = Number(crudo);
    if (!Number.isFinite(valor)) {
      throw new AccionInvalida(`«${campo.rotulo}» tiene que ser un número.`);
    }
    if (campo.entero && !Number.isInteger(valor)) {
      throw new AccionInvalida(`«${campo.rotulo}» tiene que ser un número entero.`);
    }
    if (campo.minimo !== undefined && valor < campo.minimo) {
      throw new AccionInvalida(`«${campo.rotulo}» no puede bajar de ${campo.minimo}.`);
    }
    if (campo.maximo !== undefined && valor > campo.maximo) {
      throw new AccionInvalida(`«${campo.rotulo}» no puede pasar de ${campo.maximo}.`);
    }
    numeros[campo.campo] = valor;
  }

  const reductor = REDUCTORES[manifiesto.id]?.[accion];
  if (!reductor) {
    throw new AccionInvalida('Esta partida todavía no sabe hacer eso.');
  }

  const resultado = reductor({ game, sesion, participanteId, datos: limpios, listas, numeros, definicion });

  // Queda registrado para poder contar repeticiones y para que quien dirige vea
  // lo que va pasando.
  sesion.acciones = [
    ...(sesion.acciones ?? []),
    { participanteId, accion, round: sesion.round, at: new Date().toISOString() },
  ];
  return resultado;
}

/** Qué puede hacer ahora mismo esta persona. Lo usa la proyección. */
export function accionesDisponibles(
  sesion: LiveSession,
  participanteId: string,
): DefinicionAccion[] {
  const manifiesto = manifiestoDe(sesion.juego);
  if (manifiesto.turnos === 'por-turnos' && sesion.turnoDe && sesion.turnoDe !== participanteId) {
    return [];
  }
  return manifiesto.acciones.filter(
    (a) =>
      a.fases.includes(sesion.phase) &&
      (a.vecesPorTurno === undefined ||
        vecesEsteTurno(sesion, participanteId, a.id) < a.vecesPorTurno),
  );
}
