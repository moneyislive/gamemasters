/**
 * Cliente de Anthropic y resolución de modelo para el agente de CLUEDO.
 *
 * - El cliente se crea UNA sola vez con la clave de `env.apiKey`.
 * - En modo demo (sin clave) `getAnthropicClient()` devuelve null y el chat
 *   usa el guion local de `demo.ts`.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { GameSession, ModelId } from '../../../shared/types';
import { env, DEMO_MODE } from '../config';
import { getStore } from '../db/store';

let cliente: Anthropic | null = null;
let inicializado = false;

/**
 * Devuelve el cliente compartido de Anthropic, o null si estamos en modo demo.
 * El cliente se construye de forma perezosa y se reutiliza en todas las peticiones.
 */
export function getAnthropicClient(): Anthropic | null {
  if (DEMO_MODE || !env.apiKey) return null;
  if (!inicializado) {
    cliente = new Anthropic({ apiKey: env.apiKey });
    inicializado = true;
  }
  return cliente;
}

/**
 * Resuelve el modelo a usar para una partida:
 * 1º el modelo fijado en `settings.model` de la propia partida,
 * 2º el modelo global guardado en la configuración,
 * 3º el modelo por defecto del entorno.
 */
export async function resolveModel(game: GameSession): Promise<ModelId> {
  if (game.settings?.model) return game.settings.model;
  try {
    const modelo = await getStore().getConfigModel();
    if (modelo) return modelo;
  } catch {
    // Si el almacenamiento falla, caemos al modelo por defecto sin romper el chat.
  }
  return env.defaultModel;
}

/**
 * Indica si el modelo debe pedirse por la ruta beta con fallbacks de servidor
 * (`betas: ['server-side-fallback-2026-07-01']` + `fallbacks: 'default'`).
 * Solo aplica a claude-fable-5 y claude-opus-5; sonnet/haiku usan la ruta normal.
 */
/**
 * ¿Este modelo admite `output_config.effort`?
 *
 * El esfuerzo gobierna cuánto piensa el modelo antes de responder, y lo pensado
 * se factura como salida — que es la parte cara. Ninguna de las siete llamadas
 * lo pedía, así que todas corrían al defecto `high`: pagando el pensamiento más
 * profundo también para escribir cuatro frases de reglas.
 *
 * Los Haiku no lo aceptan y responden con un error, así que se pregunta antes en
 * vez de repetir la condición en cada punto de llamada.
 */
export function aceptaEffort(model: ModelId): boolean {
  return !model.startsWith('claude-haiku');
}

export function usesFallbacks(model: ModelId): boolean {
  return model === 'claude-fable-5' || model === 'claude-opus-5';
}
