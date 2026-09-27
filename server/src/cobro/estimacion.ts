/**
 * Cuánto va a costar una velada ANTES de generarla.
 *
 * ═══ DE DÓNDE SALEN LOS NÚMEROS ═══
 *
 * De la primera velada completa contra la API, con la tubería de producción
 * (`scripts/revisar-trama-real.ts`, 25-sep-2026): siete personas inventadas,
 * cinco salas, cuatro objetos, cuatro rondas, Opus 5.5.
 *
 *   paso        esfuerzo   llamadas   entrada   salida    coste
 *   trama       medium        1        2.798    29.413   0,61 $
 *   material    medium        1        4.693     7.360   0,18 $
 *   detective   medium       15      113.106    14.565   0,84 $
 *   revisor     high          4       66.324    84.018   2,47 $   (dos pasadas)
 *
 * El revisor salió caro por su segunda pasada y por pensar a `high` también el
 * material. Con lo que se cambió después —segunda pasada solo si queda algo
 * bloqueante, material del revisor a `medium`— una pasada son unos 33.000 de
 * entrada y 38.000 de salida, y se cuenta una segunda en una de cada cuatro.
 *
 * El asistente del taller sale de la Biblioteca de los Susurros (dieciocho
 * vueltas, 81.332 / 5.691), y el Mayordomo, de suponer seis preguntas por
 * persona: no hay todavía una velada con app medida.
 *
 * ═══ LO QUE ES UNA ESTIMACIÓN Y LO QUE NO ═══
 *
 * Es lo que se COBRA: si la velada luego sale más cara, la diferencia la pone la
 * casa; si sale más barata, también. Lo que de verdad costó queda apuntado en
 * `game.gasto.costeUsd`: en cuanto haya veladas de verdad, estas constantes se
 * ajustan comparando las dos cosas.
 */
import type { Esfuerzo, ModelId } from '../../../shared/types';
import type { PasoPresupuestado } from '../../../shared/cobro';
import { costeEnDolares } from './tarifa';

/**
 * Cuánto piensa cada esfuerzo, en relativo. Lo pensado va a la salida; la
 * entrada no cambia. Cada paso se midió con SU esfuerzo de referencia, y el
 * factor que se aplica es el cociente entre el elegido y ése.
 */
const PENSAMIENTO: Record<Esfuerzo, number> = {
  low: 0.45,
  medium: 0.7,
  high: 1,
  xhigh: 1.35,
  max: 1.8,
};

/**
 * Cuánto escribe cada modelo para lo mismo, respecto a Opus 5.5, que es el de
 * las mediciones. Sonnet 5 trae un tokenizador que cuenta un 30 % más para el
 * mismo texto.
 */
const FACTOR_DE_MODELO: Partial<Record<ModelId, number>> = {
  'claude-sonnet-5': 1.3,
  'claude-fable-5-1': 1.1,
  'claude-fable-5': 1.1,
};

export interface TamanoDeLaVelada {
  personas: number;
  salas: number;
  objetos: number;
  rondas?: number;
}

/** Los pasos que pueden entrar en una velada. Cada modo elige los suyos. */
export type PasoDeVelada = 'trama' | 'material' | 'detective' | 'revisor' | 'asistente' | 'mayordomo';

interface Consumo {
  entrada: number;
  salida: number;
  llamadas: number;
  /** El esfuerzo con el que se midió este paso. */
  referencia: Esfuerzo;
}

/** Pasadas del revisor que se esperan: una siempre, una segunda de cada cuatro veces. */
const PASADAS_ESPERADAS = 1.25;

/**
 * Lo que consume cada paso con Opus 5.5 a su esfuerzo de referencia. Las cuentas
 * están a la vista para poder discutirlas; con siete personas reproducen la
 * tabla de arriba.
 */
function consumoBase(paso: PasoDeVelada, t: TamanoDeLaVelada): Consumo {
  const p = Math.max(3, t.personas);
  const cosas = t.salas + t.objetos;
  const momentos = (t.rondas ?? 4) + 1;
  switch (paso) {
    case 'trama':
      return { entrada: 2_000 + 120 * p, salida: 4_000 * p + 150 * cosas, llamadas: 1, referencia: 'medium' };
    case 'material':
      return { entrada: 1_900 + 400 * p, salida: 3_500 + 550 * p, llamadas: 1, referencia: 'medium' };
    case 'detective': {
      // Una lectura por momento, otra después de corregir y, con la segunda pasada, otra más.
      const lecturas = Math.round(momentos * (1 + PASADAS_ESPERADAS));
      return { entrada: lecturas * (3_600 + 560 * p), salida: lecturas * (500 + 70 * p), llamadas: lecturas, referencia: 'medium' };
    }
    case 'revisor':
      return {
        entrada: Math.round(PASADAS_ESPERADAS * (12_000 + 3_000 * p)),
        salida: Math.round(PASADAS_ESPERADAS * (10_000 + 4_000 * p)),
        llamadas: Math.round(PASADAS_ESPERADAS * 2),
        referencia: 'high',
      };
    case 'asistente':
      return { entrada: 60_000 + 3_000 * p, salida: 5_000 + 200 * p, llamadas: 18, referencia: 'medium' };
    case 'mayordomo':
      return { entrada: 6 * p * 2_500, salida: 6 * p * 350, llamadas: 6 * p, referencia: 'low' };
  }
}

/**
 * Lo que costará cada paso de una velada, en tokens y en dólares.
 *
 * `esfuerzoDe` dice cuánto piensa cada paso: tiene que ser la misma regla que
 * usa la generación (`esfuerzoPara` en `agent/anthropic.ts`), o el presupuesto
 * mentiría en la dirección que más duele — la trama a medio y el revisor a alto
 * no cuestan lo mismo que los dos a medio.
 */
export function estimarPasos(
  pasos: PasoDeVelada[],
  tamano: TamanoDeLaVelada,
  modelo: ModelId,
  esfuerzoDe: (paso: PasoDeVelada) => Esfuerzo,
): PasoPresupuestado[] {
  const factorModelo = FACTOR_DE_MODELO[modelo] ?? 1;
  return pasos.map((paso) => {
    const base = consumoBase(paso, tamano);
    const factorEsfuerzo = PENSAMIENTO[esfuerzoDe(paso)] / PENSAMIENTO[base.referencia];
    const entrada = Math.round(base.entrada * (paso === 'trama' ? 1 : factorModelo));
    const salida = Math.round(base.salida * factorEsfuerzo * factorModelo);
    return {
      paso,
      entrada,
      salida,
      llamadas: base.llamadas,
      costeUsd: costeEnDolares(modelo, { entrada, salida, cacheEscrita: 0, cacheLeida: 0 }),
    };
  });
}
