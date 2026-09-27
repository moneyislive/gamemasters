/**
 * El cobro de una velada: cuánto cuesta, cuándo se cobra, qué trae incluido y
 * cuándo se devuelve.
 *
 * ═══ EL RECORRIDO ═══
 *
 *   1. Antes de generar, el taller pide el PRESUPUESTO con el modo elegido —papel
 *      o app— y lo enseña para que se confirme. El precio que se confirma viaja
 *      con la orden de generar: si al cobrar sale más caro, no se cobra y se
 *      vuelve a enseñar (`precio-cambiado`).
 *   2. Al generar se COBRA, antes de gastar nada en la API.
 *   3. Si la generación falla, o la revisión termina diciendo que no puede
 *      garantizar la trama (`no-apta`), SE DEVUELVE entero y sin que nadie lo
 *      pida. Pagar una velada que sale mal no puede ser algo que haya que
 *      reclamar.
 *   4. Lo que viene después —actualizar el reparto, reescribir el material,
 *      revisar otra vez, charlar con el asistente, volver a generar una vez—
 *      está INCLUIDO hasta sus topes (`INCLUIDO_EN_LA_VELADA`).
 *
 * ═══ EL MODO ═══
 *
 * La trama y su material son los mismos en papel y con app —los dos modos los
 * usan casi enteros—, así que el modo no cambia lo que se escribe: cambia si
 * entra el Mayordomo, que contesta con el modelo durante la partida y solo
 * existe en la app. Pasar de app a papel es gratis; de papel a app se paga la
 * diferencia.
 */
import type { Request } from 'express';
import type { Esfuerzo, GameSession, ModelId } from '../../../shared/types';
import type { CobroDeLaVelada, ModoDeJuego, PresupuestoDeVelada, UsosDeLaVelada } from '../../../shared/cobro';
import { entidadesDe, lugaresDe, manifiestoDe, personasDe } from '../../../shared/juegos';
import { esfuerzoPara, resolveModel } from '../agent/anthropic';
import { esModeloDeVelada } from '../config';
import { getStore } from '../db/store';
import { numeroDeRondas } from '../docs/datos';
import { cargar, reembolsar, saldoDe } from './monedero';
import type { PasoDeVelada, TamanoDeLaVelada } from './estimacion';
import { INCLUIDO_EN_LA_VELADA, presupuestar } from './precios';
import { pagadorDe, type Pagador } from './quien-paga';

export const MODOS: ModoDeJuego[] = ['papel', 'app'];

export function esModo(valor: unknown): valor is ModoDeJuego {
  return valor === 'papel' || valor === 'app';
}

/**
 * Lo que entra en el precio de una velada según cómo se juegue y a qué.
 *
 * Solo los pasos que ese juego tiene: el material aparte, si lo declara
 * (`materialDeVelada`), y el lector ciego de la revisión, si lo tiene
 * (`lectorCiego`). Antes eran los mismos cinco para todos, y una velada del
 * Nudo se habría cobrado con un material y un detective que no existen.
 */
export function pasosDeLaVelada(modo: ModoDeJuego, juego?: string): PasoDeVelada[] {
  const manifiesto = manifiestoDe(juego);
  const pasos: PasoDeVelada[] = [
    'trama',
    ...(manifiesto.materialDeVelada ? (['material'] as const) : []),
    ...(manifiesto.lectorCiego ? (['detective'] as const) : []),
    'revisor',
    'asistente',
  ];
  return modo === 'app' ? [...pasos, 'mayordomo'] : pasos;
}

/**
 * El tamaño que mueve el precio: personas, lugares y el resto de cosas, se
 * llamen como se llamen en cada juego. Las personas y los lugares los dice el
 * manifiesto (`personasDe`, `lugaresDe`); lo demás es lo que queda.
 */
export function tamanoDe(game: GameSession): TamanoDeLaVelada {
  const personas = personasDe(game).length;
  const lugares = lugaresDe(game).length;
  const todas = Object.keys(game.entidades ?? {}).reduce((suma, c) => suma + entidadesDe(game, c).length, 0);
  return {
    personas: Math.max(3, personas),
    salas: lugares,
    objetos: Math.max(0, todas - personas - lugares),
    rondas: game.plot ? numeroDeRondas(game.plot) : 4,
  };
}

export interface OpcionesDelPresupuesto {
  modo: ModoDeJuego;
  model?: ModelId;
  esfuerzo?: Esfuerzo;
}

/** El presupuesto de esta velada con estas opciones, o las guardadas si no se dan. */
export async function presupuestoDeLaVelada(game: GameSession, opciones: OpcionesDelPresupuesto): Promise<PresupuestoDeVelada> {
  const conOpciones: GameSession = {
    ...game,
    settings: {
      ...game.settings,
      ...(opciones.model ? { model: opciones.model } : {}),
      ...(opciones.esfuerzo ? { esfuerzo: opciones.esfuerzo } : {}),
    },
  };
  const modelo = await resolveModel(conOpciones);
  // La misma regla que la generación: cada paso piensa lo que le toca.
  return presupuestar(pasosDeLaVelada(opciones.modo, game.settings?.juego), tamanoDe(game), modelo, (paso) =>
    paso === 'asistente' ? 'medium' : paso === 'mayordomo' ? 'low' : esfuerzoPara(conOpciones, paso),
  );
}

function usosVacios(): UsosDeLaVelada {
  return { regeneraciones: 0, actualizaciones: 0, reescriturasDeMaterial: 0, revisiones: 0, turnosDeAsistente: 0 };
}

// ---------------------------------------------------------------------------
// Cobrar al generar
// ---------------------------------------------------------------------------

export type ResultadoDelCobro =
  | { ok: true; cobro: CobroDeLaVelada; cargoId?: string; presupuesto?: PresupuestoDeVelada }
  | { ok: false; estado: 401 | 402 | 409; error: string; motivo: string; presupuesto?: PresupuestoDeVelada; saldo?: number };

/**
 * Cobra una velada antes de generarla, o dice por qué no.
 *
 * `creditosVistos` es el precio que se enseñó y se confirmó: si ahora sale más
 * caro, no se cobra. Más barato sí se cobra, al precio de ahora.
 */
export async function cobrarAlGenerar(
  req: Request,
  game: GameSession,
  opciones: OpcionesDelPresupuesto & { creditosVistos?: number },
): Promise<ResultadoDelCobro> {
  const pagador: Pagador | null = await pagadorDe(req);
  const anterior = game.cobro;
  const ahora = new Date().toISOString();

  if (!pagador) {
    return { ok: false, estado: 401, error: 'Para generar una velada hace falta entrar con tu cuenta.', motivo: 'sin-cuenta' };
  }
  if (pagador.tipo === 'exento') {
    return {
      ok: true,
      cobro: { ...(anterior ?? { creditos: 0, movimientos: [], usos: usosVacios(), el: ahora }), exenta: true, modo: opciones.modo },
    };
  }

  // Volver a generar una velada ya pagada: la primera vez va incluida.
  if (anterior && !anterior.exenta && anterior.creditos > 0 && anterior.usos.regeneraciones < INCLUIDO_EN_LA_VELADA.regeneraciones) {
    return {
      ok: true,
      cobro: { ...anterior, modo: opciones.modo, usos: { ...anterior.usos, regeneraciones: anterior.usos.regeneraciones + 1 } },
    };
  }

  const presupuesto = await presupuestoDeLaVelada(game, opciones);
  if (opciones.creditosVistos !== undefined && presupuesto.creditos > opciones.creditosVistos) {
    return {
      ok: false,
      estado: 409,
      error: `El precio de esta velada ha cambiado: ahora son ${presupuesto.creditos} créditos. Revísalo antes de confirmar.`,
      motivo: 'precio-cambiado',
      presupuesto,
    };
  }

  const vez = (anterior?.movimientos.length ?? 0) + 1;
  const personas = tamanoDe(game).personas;
  const cargo = await cargar(
    pagador.cuenta.id,
    presupuesto.creditos,
    `Velada «${game.name}» · ${personas} personas · ${opciones.modo === 'app' ? 'con app' : 'en papel'}`,
    { gameId: game.id, referencia: `velada:${game.id}:${vez}:${game.updatedAt}` },
  );
  if (!cargo.ok) {
    return {
      ok: false,
      estado: 402,
      error: `Esta velada cuesta ${presupuesto.creditos} créditos y tienes ${cargo.saldo}.`,
      motivo: 'sin-saldo',
      presupuesto,
      saldo: cargo.saldo,
    };
  }
  return {
    ok: true,
    cargoId: cargo.movimiento.id,
    presupuesto,
    cobro: {
      cuentaId: pagador.cuenta.id,
      exenta: false,
      modo: opciones.modo,
      creditos: (anterior?.creditos ?? 0) + presupuesto.creditos,
      movimientos: [...(anterior?.movimientos ?? []), cargo.movimiento.id],
      usos: anterior?.usos ?? usosVacios(),
      el: ahora,
    },
  };
}

/**
 * Después de generar: si no salió, o la revisión no la da por buena, se
 * devuelve. Relee la partida para decidir con lo que de verdad quedó guardado.
 */
export async function cerrarElCobro(gameId: string, cargoId: string | undefined): Promise<'cobrada' | 'devuelta' | 'nada'> {
  if (!cargoId) return 'nada';
  const store = getStore();
  const game = await store.getGame(gameId);
  const cuentaId = game?.cobro?.cuentaId;
  if (!game || !cuentaId) return 'nada';
  const veredicto = game.plot?.revision?.veredicto;
  const salio = Boolean(game.plot) && game.status === 'ready';
  if (salio && veredicto !== 'no-apta') return 'cobrada';

  const cargo = (await store.movimientosDe(cuentaId)).find((m) => m.id === cargoId);
  if (!cargo) return 'nada';
  const devolucion = await reembolsar(
    cargo,
    salio
      ? `Velada «${game.name}»: la revisión no pudo garantizar la trama. Se devuelve entera.`
      : `Velada «${game.name}»: la generación no terminó. Se devuelve entera.`,
  );
  const fresca = (await store.getGame(gameId)) ?? game;
  if (fresca.cobro) {
    fresca.cobro = {
      ...fresca.cobro,
      creditos: Math.max(0, fresca.cobro.creditos - Math.abs(cargo.creditos)),
      movimientos: [...fresca.cobro.movimientos, devolucion.id],
      // La que se devuelve no gasta la regeneración incluida: se puede volver a intentar.
      usos: { ...fresca.cobro.usos, regeneraciones: 0 },
    };
    await store.saveGame(fresca);
  }
  return 'devuelta';
}

// ---------------------------------------------------------------------------
// Lo incluido
// ---------------------------------------------------------------------------

type Uso = keyof Omit<UsosDeLaVelada, 'regeneraciones'>;

const TOPE_DE: Record<Uso, number> = {
  actualizaciones: INCLUIDO_EN_LA_VELADA.actualizaciones,
  reescriturasDeMaterial: INCLUIDO_EN_LA_VELADA.reescriturasDeMaterial,
  revisiones: INCLUIDO_EN_LA_VELADA.revisiones,
  turnosDeAsistente: INCLUIDO_EN_LA_VELADA.turnosDeAsistente,
};

/**
 * ¿Cabe una operación más en lo que trae la velada? Si cabe, la apunta.
 *
 * Quien no paga (la casa, o con el cobro apagado) siempre cabe: para eso ya
 * están los topes diarios. Quien paga y todavía no ha generado —está preparando
 * la velada con el asistente— tiene un margen para charlar antes de pagar.
 */
export async function consumirIncluido(
  req: Request,
  game: GameSession,
  uso: Uso,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const pagador = await pagadorDe(req);
  if (!pagador || pagador.tipo === 'exento') return { ok: true };
  const cobro = game.cobro;
  if (!cobro || cobro.exenta) {
    if (uso === 'turnosDeAsistente') return charlaAntesDePagar(game.id);
    return { ok: false, error: 'Esta velada todavía no está pagada: genérala primero.' };
  }
  if (cobro.usos[uso] >= TOPE_DE[uso]) {
    return {
      ok: false,
      error: `Ya has usado lo que trae esta velada (${TOPE_DE[uso]}). Si necesitas más, escríbenos y lo miramos.`,
    };
  }
  const store = getStore();
  const fresca = (await store.getGame(game.id)) ?? game;
  if (fresca.cobro) {
    fresca.cobro = { ...fresca.cobro, usos: { ...fresca.cobro.usos, [uso]: fresca.cobro.usos[uso] + 1 } };
    await store.saveGame(fresca);
    game.cobro = fresca.cobro;
  }
  return { ok: true };
}

/**
 * Lo que se puede charlar con el asistente preparando una velada que todavía no
 * se ha pagado. Con el taller abierto a cualquier cuenta, sin esto se podría
 * usar el asistente sin pagar nunca: doscientos cincuenta turnos al día de tope
 * diario son unos seis dólares diarios por cuenta. Cuarenta bastan para dar de
 * alta a la mesa, las salas y los objetos y preguntar lo que haga falta.
 *
 * En memoria, por partida: se pierde al reiniciar, y está bien, porque no es
 * contabilidad sino un freno.
 */
const CHARLA_ANTES_DE_PAGAR = 40;
const charlaSinPagar = new Map<string, number>();

function charlaAntesDePagar(gameId: string): { ok: true } | { ok: false; error: string } {
  const hechas = charlaSinPagar.get(gameId) ?? 0;
  if (hechas >= CHARLA_ANTES_DE_PAGAR) {
    return {
      ok: false,
      error:
        'Has charlado todo lo que se puede antes de generar la velada. Genérala para seguir: la velada trae sesenta turnos más con el asistente.',
    };
  }
  charlaSinPagar.set(gameId, hechas + 1);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// El Mayordomo
// ---------------------------------------------------------------------------

/**
 * Freno del Mayordomo cuando nadie cobra: hoy no tenía ninguno, y cada pregunta
 * es una llamada al modelo. Doscientas por velada no las alcanza una mesa de
 * doce preguntando toda la noche; un bucle sí.
 */
const FRENO_DEL_MAYORDOMO = 200;

/**
 * Cuántas preguntas al Mayordomo caben en esta velada.
 *
 *   · Sin cobro registrado (la casa, o de antes del cobro): el freno.
 *   · Pagada con app: lo incluido.
 *   · Pagada en papel: ninguna — el Mayordomo no entró en el precio. Quien dirige
 *     puede pasarla a app pagando la diferencia.
 */
export function preguntasDelMayordomo(game: GameSession): number {
  const cobro = game.cobro;
  if (!cobro || cobro.exenta) return FRENO_DEL_MAYORDOMO;
  return cobro.modo === 'app' ? INCLUIDO_EN_LA_VELADA.preguntasAlMayordomo : 0;
}

/** Lo que cuesta pasar una velada de papel a app: la diferencia de presupuesto. */
export async function diferenciaDePapelAApp(game: GameSession): Promise<number> {
  const papel = await presupuestoDeLaVelada(game, { modo: 'papel' });
  const app = await presupuestoDeLaVelada(game, { modo: 'app' });
  return Math.max(0, app.creditos - papel.creditos);
}

/** El saldo de una cuenta, para enseñarlo junto al presupuesto. */
export async function saldoDeLaCuenta(cuentaId: string): Promise<number> {
  return saldoDe(await getStore().movimientosDe(cuentaId));
}

export function modeloValido(valor: unknown): valor is ModelId {
  return esModeloDeVelada(valor);
}
