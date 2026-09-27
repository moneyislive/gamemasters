/**
 * Lo que cobra Anthropic por cada modelo, y lo que cuesta de verdad una llamada.
 *
 * ═══ DE DÓNDE SALEN LOS NÚMEROS ═══
 *
 * De la tarifa pública de la API, en dólares por millón de tokens, tal como
 * estaba en septiembre de 2026. La caché tiene su propio precio: escribirla
 * (con vida de cinco minutos) cuesta 1,25 veces la entrada, y leerla, lo que
 * diga cada modelo — una décima parte en casi todos, y bastante menos en
 * Opus 5.5 y Fable 5.1, que la abarataron.
 *
 * Si Anthropic cambia un precio, se cambia AQUÍ y en ningún otro sitio: la
 * contabilidad de cada velada, el presupuesto que se enseña antes de generar y
 * el precio que se cobra cuelgan de esta tabla.
 *
 * ═══ LO PENSADO SE PAGA COMO SALIDA ═══
 *
 * Los modelos actuales piensan antes de escribir, y en Opus 5.5 y Fable no se
 * puede apagar. Ese pensamiento no se ve, pero `usage.output_tokens` lo
 * incluye y se factura al precio de salida, que es el caro. Por eso el esfuerzo
 * mueve el precio tanto como el modelo.
 */
import type { ModelId } from '../../../shared/types';

export interface TarifaDeModelo {
  /** Dólares por millón de tokens. */
  entrada: number;
  salida: number;
  cacheEscrita: number;
  cacheLeida: number;
}

export const TARIFAS: Record<ModelId, TarifaDeModelo> = {
  'claude-opus-5-5': { entrada: 4, salida: 20, cacheEscrita: 5, cacheLeida: 0.2 },
  'claude-fable-5-1': { entrada: 10, salida: 50, cacheEscrita: 12.5, cacheLeida: 0.25 },
  'claude-fable-5': { entrada: 10, salida: 50, cacheEscrita: 12.5, cacheLeida: 1 },
  'claude-opus-5': { entrada: 5, salida: 25, cacheEscrita: 6.25, cacheLeida: 0.5 },
  'claude-sonnet-5': { entrada: 2, salida: 10, cacheEscrita: 2.5, cacheLeida: 0.2 },
  'claude-haiku-4-5': { entrada: 1, salida: 5, cacheEscrita: 1.25, cacheLeida: 0.1 },
};

/**
 * La tarifa de un modelo, o la del más caro si no se conoce.
 *
 * Un modelo desconocido llega cuando la API devuelve otro nombre —un
 * `fallback` de servidor puede contestar con un modelo distinto al pedido— o
 * cuando alguien añade uno al catálogo y se olvida de esta tabla. Contarlo a
 * precio de Fable sobreestima, y eso es lo seguro: el error barato en la
 * contabilidad es pensar que se gastó de más.
 */
export function tarifaDe(modelo: string): TarifaDeModelo {
  return (TARIFAS as Record<string, TarifaDeModelo>)[modelo] ?? TARIFAS['claude-fable-5'];
}

/** Lo que interesa de un `usage`, ya limpio. */
export interface UsoDeTokens {
  entrada: number;
  salida: number;
  cacheEscrita: number;
  cacheLeida: number;
}

/** Dólares que cuesta un uso concreto con un modelo concreto. */
export function costeEnDolares(modelo: string, uso: UsoDeTokens): number {
  const t = tarifaDe(modelo);
  return (
    (uso.entrada * t.entrada +
      uso.salida * t.salida +
      uso.cacheEscrita * t.cacheEscrita +
      uso.cacheLeida * t.cacheLeida) /
    1_000_000
  );
}
