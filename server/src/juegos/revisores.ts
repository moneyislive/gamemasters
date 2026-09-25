/**
 * Quién revisa la trama de cada juego antes de entregarla.
 *
 * ═══ POR QUÉ HACE FALTA UN REVISOR ═══
 *
 * El generador escribe la trama de una sola tirada, y una tirada no se relee.
 * Lo que sale mal no sale mal en la estructura —eso ya lo sujetan los esquemas y
 * las validaciones de código— sino en lo que la mesa LEE: una sinopsis que
 * nombra tres veces a quien lo hizo, un arma de la que nadie habla, alguien sin
 * historia que se pasa la noche mirando, una pista de la última ronda que dice
 * el nombre en vez de dejarlo deducir. Ninguna de esas cosas rompe un esquema, y
 * todas estropean una velada. Si la velada se cobra, estropearla es cobrar por
 * una mala noche.
 *
 * El revisor lee la trama ENTERA con otros ojos —los de alguien que quiere
 * romperla—, la corrige donde haga falta y deja escrito qué encontró.
 *
 * ═══ POR QUÉ ES UN REGISTRO Y NO UNA LLAMADA EN LA TUBERÍA ═══
 *
 * Por lo mismo que `generadores.ts` y `materiales.ts`: qué hay que revisar
 * depende del juego —en CLUEDO, que el culpable no se delate; en El Paso de las
 * Sombras, que el traidor no tenga el sobre más gordo; en la Momia, que los
 * papiros sigan teniendo una sola solución—, y la tubería común no puede saber
 * nada de eso. Un juego que no registra revisor se entrega sin revisar, y el
 * informe lo dice (`veredicto: 'sin-revisar'`) en vez de fingir una revisión.
 */
import { manifiestoDe } from '../../../shared/juegos';
import type { JuegoId } from '../../../shared/juegos';
import type { GameSession, GenerateStreamEvent, InformeDeRevision, Plot } from '../../../shared/types';

/** Qué parte de la trama se revisa. */
export type AlcanceDeRevision =
  /** Todo: la trama recién escrita, con su material si lo tiene. */
  | 'completa'
  /** Solo el material, sobre una trama que ya pasó su revisión. */
  | 'material';

/**
 * Revisa una trama y devuelve la versión corregida con su informe.
 *
 * NO PUEDE TIRAR LA TRAMA. Si la revisión falla a medias, devuelve la trama tal
 * como la recibió —o con lo que ya hubiera corregido— y un informe que dice por
 * qué no terminó. Una trama sin revisar es peor que una revisada, pero una
 * velada sin trama es peor que las dos.
 */
export type RevisorDeTrama = (
  game: GameSession,
  plot: Plot,
  emit: (evento: GenerateStreamEvent) => void,
  alcance: AlcanceDeRevision,
) => Promise<{ plot: Plot; informe: InformeDeRevision }>;

/** Anclado al ámbito global, como los demás registros y por lo mismo. */
const LLAVE = Symbol.for('gamemasters.juegos.revisores');
const global_ = globalThis as unknown as Record<symbol, Record<string, RevisorDeTrama>>;
const REVISORES: Record<JuegoId, RevisorDeTrama> = global_[LLAVE] ?? (global_[LLAVE] = {});

/** Da de alta quién revisa la trama de un juego. */
export function registrarRevisor(juego: JuegoId, revisor: RevisorDeTrama): void {
  REVISORES[juego] = revisor;
}

/** Quién revisa la trama de esta partida. El id, por el manifiesto: ver `generadorDeTrama`. */
export function revisorDe(juego: JuegoId | undefined): RevisorDeTrama | undefined {
  return REVISORES[manifiestoDe(juego).id];
}

/** Los juegos que tienen revisor. Lo usa la comprobación. */
export function juegosConRevisor(): JuegoId[] {
  return Object.keys(REVISORES);
}

/** El informe de quien no tiene revisor, o de una revisión que no se pudo hacer. */
export function informeSinRevisar(motivo?: string): InformeDeRevision {
  return {
    veredicto: 'sin-revisar',
    pasadas: 0,
    hallazgos: [],
    cambios: [],
    revisadaEl: new Date().toISOString(),
    ...(motivo ? { error: motivo } : {}),
  };
}
