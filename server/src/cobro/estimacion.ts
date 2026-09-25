/**
 * Cuánto va a costar una velada ANTES de generarla.
 *
 * ═══ DE DÓNDE SALEN LOS NÚMEROS ═══
 *
 * De lo que gastaron veladas de verdad, apuntado por `gasto/contador.ts` en la
 * base de producción (tokens, no contenido):
 *
 *   · Villa CASAS, 7 personas, 5 salas, 4 objetos, Opus 5 a esfuerzo `high`:
 *     la trama, 3.089 tokens de entrada y 31.495 de salida.
 *   · La Biblioteca de los Susurros, 5 personas, 5 salas, 5 objetos: la trama,
 *     2.766 / 20.933; el material, 4.660 / 9.751.
 *
 * Con dos puntos no se ajusta una recta que merezca ese nombre, así que el
 * modelo es deliberadamente simple —proporcional a la gente, que es lo que más
 * texto trae: un personaje entero por persona— y se redondea hacia arriba.
 * La revisión se estima con el tamaño de lo que tiene que leer.
 *
 * ═══ LO QUE ES UNA ESTIMACIÓN Y LO QUE NO ═══
 *
 * Es lo que se COBRA: si la velada luego sale más cara, la diferencia la pone la
 * casa; si sale más barata, también. Lo que de verdad costó queda apuntado en
 * `game.gasto.costeUsd`, y `server/scripts/calibrar-presupuesto.ts` (por hacer)
 * compara las dos cosas para ajustar estas constantes con datos.
 */
import type { Esfuerzo, ModelId } from '../../../shared/types';
import type { PasoPresupuestado } from '../../../shared/cobro';
import { costeEnDolares } from './tarifa';

/**
 * Cuánto piensa cada esfuerzo respecto a `high`, que es con lo que se midió.
 * Lo pensado va a la salida; la entrada no cambia.
 */
const FACTOR_DE_ESFUERZO: Record<Esfuerzo, number> = {
  low: 0.45,
  medium: 0.7,
  high: 1,
  xhigh: 1.35,
  max: 1.8,
};

/**
 * Cuánto escribe cada modelo para lo mismo, respecto a Opus 5, que es el de las
 * mediciones. Sonnet 5 trae un tokenizador que cuenta un 30 % más para el mismo
 * texto.
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
}

/**
 * Lo que consume cada paso a esfuerzo `high` con Opus 5. Las cuentas están a la
 * vista para poder discutirlas.
 */
function consumoBase(paso: PasoDeVelada, t: TamanoDeLaVelada): Consumo {
  const p = Math.max(3, t.personas);
  const cosas = t.salas + t.objetos;
  const rondas = t.rondas ?? 4;
  switch (paso) {
    case 'trama':
      // 20.933 con cinco y 31.495 con siete: unas 4.300 por persona, y algo por sala y objeto.
      return { entrada: 3_000 + 250 * p, salida: 4_300 * p + 300 * cosas, llamadas: 1 };
    case 'material':
      // 9.751 con cinco: base de prosa fija más giros y apuntes por persona.
      return { entrada: 2_500 + 450 * p, salida: 6_000 + 750 * p, llamadas: 1 };
    case 'detective': {
      // Una lectura por momento (antes de empezar y al cerrar cada ronda), y
      // una segunda lectura parcial después de corregir: unos 1,6 veces.
      const lecturas = Math.ceil((rondas + 1) * 1.6);
      return { entrada: lecturas * (2_200 + 550 * p), salida: lecturas * (1_800 + 150 * p), llamadas: lecturas };
    }
    case 'revisor':
      // Dos turnos (trama y material) y, en tres de cada diez, una segunda pasada.
      return { entrada: Math.round(1.3 * (7_000 + 1_500 * p)), salida: Math.round(1.3 * (11_000 + 1_300 * p)), llamadas: 3 };
    case 'asistente':
      // El chat del taller mientras se prepara: la Biblioteca, 18 vueltas, 81.332 / 5.691.
      return { entrada: 60_000 + 3_000 * p, salida: 5_000 + 200 * p, llamadas: 18 };
    case 'mayordomo':
      // El Mayordomo de la app durante la partida: unas seis preguntas por persona.
      return { entrada: 6 * p * 2_500, salida: 6 * p * 350, llamadas: 6 * p };
  }
}

/** Los pasos cuyo pensamiento gobierna el esfuerzo elegido. Los demás van con el suyo. */
const PASOS_CON_ESFUERZO_ELEGIDO: PasoDeVelada[] = ['trama', 'revisor'];

/**
 * Lo que costará cada paso de una velada, en tokens y en dólares.
 *
 * `esfuerzo` es el de la trama y el revisor; los pasos de apoyo llevan el suyo
 * (ver `esfuerzoPara` en `agent/anthropic.ts`), y el asistente y el Mayordomo,
 * que no pasan por ahí, el de la API.
 */
export function estimarPasos(
  pasos: PasoDeVelada[],
  tamano: TamanoDeLaVelada,
  modelo: ModelId,
  esfuerzo: Esfuerzo,
): PasoPresupuestado[] {
  const factorModelo = FACTOR_DE_MODELO[modelo] ?? 1;
  return pasos.map((paso) => {
    const base = consumoBase(paso, tamano);
    const factorEsfuerzo = PASOS_CON_ESFUERZO_ELEGIDO.includes(paso)
      ? FACTOR_DE_ESFUERZO[esfuerzo]
      : paso === 'mayordomo'
        ? FACTOR_DE_ESFUERZO.low
        : FACTOR_DE_ESFUERZO.medium;
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
