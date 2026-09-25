/**
 * Cliente de Anthropic, resolución de modelo y esfuerzo de cada paso.
 *
 * - El cliente se crea UNA sola vez con la clave de `env.apiKey`.
 * - En modo demo (sin clave) `getAnthropicClient()` devuelve null y el chat
 *   usa el guion local de `demo.ts`.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Esfuerzo, GameSession, ModelId } from '../../../shared/types';
import { env, DEMO_MODE, esModeloDeVelada, isModelId } from '../config';
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
 * El modelo de la casa: el que se usa cuando una velada no elige.
 *
 * Manda el que haya guardado quien administra la instalación, SI sigue siendo un
 * modelo de velada. Uno retirado del catálogo —en producción había
 * `claude-opus-5` guardado desde agosto— se ignora y se usa el del entorno: si
 * no, retirar un modelo del catálogo no lo retiraría de ninguna parte, porque
 * seguiría guardado en la base de datos.
 */
export async function modeloDeLaCasa(): Promise<ModelId> {
  try {
    const guardado = await getStore().getConfigModel();
    if (esModeloDeVelada(guardado)) return guardado;
  } catch {
    // Si el almacén falla, el del entorno; no se rompe la generación por esto.
  }
  return env.defaultModel;
}

/**
 * Resuelve el modelo a usar para una partida:
 * 1º el fijado en `settings.model` de la propia partida (opción avanzada),
 * 2º el de la casa (ver `modeloDeLaCasa`).
 */
export async function resolveModel(game: GameSession): Promise<ModelId> {
  if (isModelId(game.settings?.model)) return game.settings.model;
  return modeloDeLaCasa();
}

/**
 * ¿Este modelo admite `output_config.effort`?
 *
 * El esfuerzo gobierna cuánto piensa el modelo antes de responder, y lo pensado
 * se factura como salida — que es la parte cara. Ninguna de las siete llamadas
 * lo pedía, así que todas corrían al defecto del modelo: `high` en Opus 5,
 * `medium` en Opus 5.5.
 *
 * Los Haiku no lo aceptan y responden con un error, así que se pregunta antes en
 * vez de repetir la condición en cada punto de llamada.
 */
export function aceptaEffort(model: ModelId): boolean {
  return !model.startsWith('claude-haiku');
}

/**
 * Indica si el modelo se pide por la ruta beta con fallbacks de servidor
 * (`betas: ['server-side-fallback-2026-07-01']` + `fallbacks: 'default'`): si
 * sus clasificadores de seguridad rechazan la petición, la API la repite con
 * otro modelo dentro de la misma llamada. En una velada de pago eso es la
 * diferencia entre una trama y un error: un envenenamiento en un misterio de los
 * años veinte no es lo que esos clasificadores buscan, pero un falso positivo
 * no avisa.
 */
export function usesFallbacks(model: ModelId): boolean {
  return (
    model === 'claude-opus-5-5' ||
    model === 'claude-fable-5-1' ||
    model === 'claude-fable-5' ||
    model === 'claude-opus-5'
  );
}

/**
 * Los pasos de una velada que piensan, y cuánto piensa cada uno si nadie dice
 * otra cosa.
 *
 * La trama y el revisor son donde se decide si el caso se sostiene: ahí va
 * `high`, que es lo que corría Opus 5 por defecto y con lo que se midieron las
 * tramas buenas. El material es prosa sobre una trama ya cerrada, y el detective
 * repite la misma pregunta varias veces: `medium` basta. Opus 5.5 trae `medium`
 * por defecto, así que sin esta tabla la trama habría pensado menos que antes
 * de cambiar de modelo — más barata y peor, sin que nadie lo hubiera decidido.
 */
export type PasoQuePiensa = 'trama' | 'material' | 'detective' | 'revisor' | 'refresco';

const ESFUERZO_POR_PASO: Record<PasoQuePiensa, Esfuerzo> = {
  trama: 'high',
  material: 'medium',
  detective: 'medium',
  revisor: 'high',
  refresco: 'high',
};

/**
 * El esfuerzo de un paso en esta partida. `settings.esfuerzo` manda sobre la
 * trama y el revisor —es lo que elige quien quiere ajustar el presupuesto— y
 * los pasos de apoyo nunca piensan más que ellos.
 */
export function esfuerzoPara(game: GameSession, paso: PasoQuePiensa): Esfuerzo {
  const elegido = game.settings?.esfuerzo;
  const base = ESFUERZO_POR_PASO[paso];
  if (!elegido) return base;
  if (paso === 'trama' || paso === 'revisor' || paso === 'refresco') return elegido;
  return ORDEN_DE_ESFUERZO.indexOf(elegido) < ORDEN_DE_ESFUERZO.indexOf(base) ? elegido : base;
}

export const ORDEN_DE_ESFUERZO: Esfuerzo[] = ['low', 'medium', 'high', 'xhigh', 'max'];

/**
 * Lo que se usa de un stream de generación, sea de la ruta normal o de la beta.
 * Los dos objetos del SDK tienen esta misma cara; se declara aquí para no
 * arrastrar dos tipos distintos por cada punto de llamada.
 */
export interface StreamDeGeneracion {
  on(evento: 'text', escuchar: (delta: string) => void): unknown;
  finalMessage(): Promise<MensajeDeGeneracion>;
}

export interface MensajeDeGeneracion {
  content: Array<{ type: string; text?: string }>;
  stop_reason: string | null;
  usage: unknown;
  /** Quién contestó. Con un fallback de servidor puede no ser el que se pidió. */
  model?: string;
}

/**
 * Abre una llamada de generación con salida estructurada: trama, material,
 * detective, revisor. Pone el esfuerzo si el modelo lo admite y los fallbacks
 * si los tiene, que es lo que antes repetía —o se olvidaba de poner— cada
 * fichero por su cuenta.
 *
 * SIN `thinking` Y SIN TEMPERATURA: en Opus 5.5 y Fable el pensamiento no se
 * puede apagar y pedirlo de otra forma es un 400; omitirlo lo deja en adaptativo,
 * que es lo que se quiere. El esfuerzo es la única perilla.
 */
export function streamDeGeneracion(
  client: Anthropic,
  opciones: {
    model: ModelId;
    esfuerzo: Esfuerzo;
    maxTokens: number;
    /** El sistema, que se marca para la caché: es idéntico en todas las veladas. */
    system: string;
    messages: Anthropic.MessageParam[];
    schema: Record<string, unknown>;
  },
): StreamDeGeneracion {
  const outputConfig: Record<string, unknown> = {
    format: { type: 'json_schema', schema: opciones.schema },
  };
  if (aceptaEffort(opciones.model)) outputConfig.effort = opciones.esfuerzo;

  const base = {
    model: opciones.model,
    max_tokens: opciones.maxTokens,
    system: [{ type: 'text' as const, text: opciones.system, cache_control: { type: 'ephemeral' as const } }],
    output_config: outputConfig,
    messages: opciones.messages,
  };

  if (usesFallbacks(opciones.model)) {
    return client.beta.messages.stream({
      ...base,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    } as unknown as Parameters<typeof client.beta.messages.stream>[0]) as unknown as StreamDeGeneracion;
  }
  return client.messages.stream(
    base as unknown as Parameters<typeof client.messages.stream>[0],
  ) as unknown as StreamDeGeneracion;
}

/** El texto de un mensaje, uniendo sus bloques de texto (los de pensamiento no). */
export function textoDe(mensaje: MensajeDeGeneracion): string {
  let texto = '';
  for (const bloque of mensaje.content) {
    if (bloque.type === 'text' && typeof bloque.text === 'string') texto += bloque.text;
  }
  return texto;
}
