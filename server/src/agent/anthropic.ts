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
 * ═══ MEDIDO, NO SUPUESTO ═══
 *
 * La primera versión de esta tabla ponía la trama en `high`, que es lo que
 * corría Opus 5 por defecto (31.495 tokens de salida para siete personas en
 * Villa CASAS). Con Opus 5.5, la misma mesa a `high` agotó los 64.000 tokens a
 * los diez minutos y medio y se perdió entera (25-sep-2026): Opus 5.5 piensa
 * mucho más a ese nivel. Así que la trama va a `medium` —que es además el
 * defecto de Opus 5.5— y el `high` se queda en el REVISOR, que es donde se
 * decide si el caso se sostiene: el autor escribe, y quien lee con lupa es el
 * revisor. El material es prosa sobre una trama cerrada y el detective repite
 * la misma pregunta varias veces: `medium` basta.
 */
export type PasoQuePiensa = 'trama' | 'material' | 'detective' | 'revisor' | 'refresco';

const ESFUERZO_POR_PASO: Record<PasoQuePiensa, Esfuerzo> = {
  trama: 'medium',
  material: 'medium',
  detective: 'medium',
  revisor: 'high',
  refresco: 'medium',
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
    // Haiku escribe 64.000 como mucho: pedirle más es un 400, no un techo más alto.
    max_tokens: Math.min(opciones.maxTokens, opciones.model.startsWith('claude-haiku') ? 64_000 : 128_000),
    system: [{ type: 'text' as const, text: opciones.system, cache_control: { type: 'ephemeral' as const } }],
    output_config: outputConfig,
    messages: opciones.messages,
  };

  const abrir = (): StreamDeGeneracion =>
    usesFallbacks(opciones.model)
      ? (client.beta.messages.stream({
          ...base,
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
        } as unknown as Parameters<typeof client.beta.messages.stream>[0]) as unknown as StreamDeGeneracion)
      : (client.messages.stream(
          base as unknown as Parameters<typeof client.messages.stream>[0],
        ) as unknown as StreamDeGeneracion);
  return new StreamConReintento(abrir);
}

/**
 * ¿Es un fallo de los que se pasan solos?
 *
 * Medido el 25-sep-2026 con la primera velada de prueba: a los tres minutos y
 * medio de escribir la trama, la API cortó el stream con `api_error` —«Unable to
 * complete this request right now. Please try again»— y la generación entera
 * se perdió. El SDK reintenta los fallos de conexión ANTES de que empiece el
 * stream, pero no uno que llega a mitad, que es justo el caro. Estos son los que
 * merecen otra vuelta; un 400 o un rechazo, no.
 *
 * Y LOS CORTES DE RED, que no llegan como error de la API. En la tercera velada
 * de prueba, a los 5,7 minutos, la conexión se cayó con `ECONNRESET` y el SDK lo
 * entregó como un `AnthropicError` a secas —mensaje «terminated»— con el fallo
 * de red en su cadena de `cause`. Se busca ahí.
 */
export function esTransitorio(error: unknown): boolean {
  if (error instanceof Anthropic.APIConnectionError) return true;
  if (error instanceof Anthropic.APIError) {
    if (error.status !== undefined && [408, 409, 429, 500, 502, 503, 504, 529].includes(error.status)) return true;
    const tipo = (error.error as { error?: { type?: string } } | undefined)?.error?.type;
    if (tipo === 'api_error' || tipo === 'overloaded_error' || tipo === 'rate_limit_error') return true;
    if (error.status !== undefined) return false;
  }
  return esCorteDeRed(error);
}

const SENALES_DE_CORTE = ['econnreset', 'etimedout', 'epipe', 'econnaborted', 'terminated', 'socket hang up', 'other side closed', 'und_err_socket'];

/** ¿Hay un corte de red en algún eslabón de la cadena de causas? */
function esCorteDeRed(error: unknown): boolean {
  let actual: unknown = error;
  for (let eslabon = 0; actual && eslabon < 6; eslabon++) {
    const e = actual as { message?: unknown; code?: unknown; cause?: unknown };
    const texto = `${typeof e.code === 'string' ? e.code : ''} ${typeof e.message === 'string' ? e.message : ''}`.toLowerCase();
    if (SENALES_DE_CORTE.some((s) => texto.includes(s))) return true;
    actual = e.cause;
  }
  return false;
}

/** Cuántas veces se intenta una llamada de generación, contando la primera. */
const INTENTOS = 3;

/**
 * Un stream que, si se cae por un fallo transitorio, se vuelve a pedir entero.
 *
 * Tiene la misma cara que el del SDK —`on('text')` y `finalMessage()`— para que
 * ningún punto de llamada tenga que saber que existe. Quien escucha el texto ve
 * una nota cuando se reintenta: sin ella, el progreso volvería a empezar sin
 * explicación.
 */
export class StreamConReintento implements StreamDeGeneracion {
  private readonly escuchas: Array<(delta: string) => void> = [];

  constructor(
    private readonly abrir: () => StreamDeGeneracion,
    /** Solo para las comprobaciones, que no pueden esperar ocho segundos por intento. */
    private readonly esperaMs = 8000,
  ) {}

  on(evento: 'text', escuchar: (delta: string) => void): this {
    if (evento === 'text') this.escuchas.push(escuchar);
    return this;
  }

  async finalMessage(): Promise<MensajeDeGeneracion> {
    for (let intento = 1; ; intento++) {
      const stream = this.abrir();
      for (const escuchar of this.escuchas) stream.on('text', escuchar);
      try {
        return await stream.finalMessage();
      } catch (error) {
        if (intento >= INTENTOS || !esTransitorio(error)) throw error;
        console.warn(`[anthropic] fallo transitorio (intento ${intento} de ${INTENTOS}); se reintenta:`, error);
        for (const escuchar of this.escuchas) {
          escuchar(`\n[La API ha fallado un momento. Se vuelve a intentar (${intento + 1} de ${INTENTOS})…]\n`);
        }
        await new Promise((r) => setTimeout(r, intento * this.esperaMs));
      }
    }
  }
}

/** El texto de un mensaje, uniendo sus bloques de texto (los de pensamiento no). */
export function textoDe(mensaje: MensajeDeGeneracion): string {
  let texto = '';
  for (const bloque of mensaje.content) {
    if (bloque.type === 'text' && typeof bloque.text === 'string') texto += bloque.text;
  }
  return texto;
}
