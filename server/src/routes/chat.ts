/**
 * Rutas del chat con el agente de CLUEDO.
 *
 * - GET  /games/:id/chat/messages → historial de mensajes del store.
 * - POST /games/:id/chat          → SSE con el protocolo ChatStreamEvent:
 *   guarda el mensaje del usuario, y responde con el agente real (bucle
 *   manual de tool-use sobre el stream del SDK de Anthropic) o con el
 *   guion demo si no hay clave de API.
 */

import type { Request, Response } from 'express';
import { nanoid } from 'nanoid';
import type Anthropic from '@anthropic-ai/sdk';
import type {
  ChatMessage,
  ChatStreamEvent,
  GameSession,
  ModelId,
} from '../../../shared/types';
import { getStore } from '../db/store';
import { DEMO_MODE } from '../config';
import { getAnthropicClient, resolveModel, usesFallbacks } from '../agent/anthropic';
import { buildSystemPrompt } from '../agent/systemPrompt';
import { executeTool, herramientasDe } from '../agent/tools';
import { runDemoChat } from '../agent/demo';
import { crearRouter } from '../rutas';

const router = crearRouter();

/** Máximo de mensajes del historial que se envían al modelo. */
const MAX_HISTORIAL = 30;
/** Tope de vueltas del bucle de tool-use por turno, como red de seguridad. */
const MAX_ITERACIONES = 12;

// ---------------------------------------------------------------------------
// Tipos estructurales mínimos comunes al stream normal y al stream beta del
// SDK. Ambos cumplen esta forma en tiempo de ejecución; el cast evita duplicar
// el bucle completo para cada variante de tipos (beta / no beta).
// ---------------------------------------------------------------------------

interface EventoStream {
  type: string;
  delta?: { type?: string; text?: string };
}

interface BloqueFinal {
  type: string;
  id?: string;
  name?: string;
  input?: unknown;
  text?: string;
}

interface MensajeFinal {
  stop_reason: string | null;
  content: BloqueFinal[];
}

interface StreamAgente extends AsyncIterable<EventoStream> {
  finalMessage(): Promise<MensajeFinal>;
}

/** Turno de conversación tal y como se envía al modelo. */
interface Turno {
  role: 'user' | 'assistant';
  content: string | Array<Record<string, unknown>>;
}

/**
 * Abre el stream adecuado según el modelo. Con claude-fable-5 / claude-opus-5
 * se usa la ruta beta con fallbacks de servidor; con sonnet/haiku, la normal.
 * PROHIBIDO enviar temperature/top_p/top_k/thinking en estos modelos.
 */
function abrirStream(
  client: Anthropic,
  model: ModelId,
  systemText: string,
  turnos: Turno[],
  /*
   * La partida, para saber a que juego se juega. Entra hasta aqui solo por las
   * herramientas: son lo unico de la llamada que depende del juego.
   */
  game: GameSession,
): StreamAgente {
  const parametrosBase = {
    model,
    max_tokens: 16000,
    system: [
      {
        type: 'text' as const,
        text: systemText,
        cache_control: { type: 'ephemeral' as const },
      },
    ],
    messages: turnos,
    /*
     * LAS HERRAMIENTAS DE SU JUEGO, no las de CLUEDO.
     *
     * Aqui iba `agentTools`, la lista fija, asi que El Escriba de la expedicion
     * hablaba como El Escriba —el prompt si se ramificaba— y recibia las
     * herramientas de un mayordomo: podia dar de alta sospechosos, salas y
     * armas, y NO podia dar de alta ritos, que son cinco piezas obligatorias sin
     * las cuales no hay puzle. El asistente no habria dado ningun error: habria
     * dicho que no sabe hacer eso.
     *
     * `herramientasDe` devuelve `agentTools` tal cual para CLUEDO, asi que su
     * conversacion no cambia ni un token —y eso importa, porque el prompt va con
     * cache y una lista distinta la invalidaria.
     */
    tools: herramientasDe(game),
  };

  if (usesFallbacks(model)) {
    return client.beta.messages.stream({
      ...parametrosBase,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    } as unknown as Parameters<typeof client.beta.messages.stream>[0]) as unknown as StreamAgente;
  }

  return client.messages.stream(
    parametrosBase as unknown as Parameters<typeof client.messages.stream>[0],
  ) as unknown as StreamAgente;
}

/**
 * Bucle de chat con el agente real: streaming de texto + ejecución de
 * herramientas hasta `end_turn`. Devuelve el id del mensaje guardado.
 */
async function chatConAgente(
  game: GameSession,
  emit: (e: ChatStreamEvent) => void,
): Promise<void> {
  const store = getStore();
  const client = getAnthropicClient();
  if (!client) {
    emit({ type: 'error', message: 'No hay clave de API configurada en el servidor.' });
    return;
  }

  const model = await resolveModel(game);
  const systemText = buildSystemPrompt(game);

  // Historial reciente (incluye el mensaje de usuario recién guardado).
  const historial = await store.getMessages(game.id);
  const turnos: Turno[] = historial
    .slice(-MAX_HISTORIAL)
    .filter((m) => m.content.trim() !== '')
    .map((m) => ({ role: m.role, content: m.content }));
  // El primer turno enviado a la API debe ser del usuario.
  while (turnos.length > 0 && turnos[0].role !== 'user') turnos.shift();
  if (turnos.length === 0) {
    emit({ type: 'error', message: 'No hay mensaje de usuario que responder.' });
    return;
  }

  let textoAsistente = '';
  let partidaActual = game;

  for (let vuelta = 0; vuelta < MAX_ITERACIONES; vuelta++) {
    const stream = abrirStream(client, model, systemText, turnos, game);

    for await (const evento of stream) {
      if (evento.type === 'content_block_delta' && evento.delta?.type === 'text_delta') {
        const delta = evento.delta.text ?? '';
        if (delta !== '') {
          textoAsistente += delta;
          emit({ type: 'text', delta });
        }
      }
    }

    const mensaje = await stream.finalMessage();

    if (mensaje.stop_reason === 'refusal') {
      emit({
        type: 'error',
        message:
          'El agente ha declinado responder a esa petición por políticas de seguridad. Reformule el mensaje, por favor.',
      });
      return;
    }

    if (mensaje.stop_reason === 'tool_use') {
      // Añadir el turno del asistente tal cual (con sus bloques tool_use).
      turnos.push({
        role: 'assistant',
        content: mensaje.content as unknown as Array<Record<string, unknown>>,
      });

      const resultados: Array<Record<string, unknown>> = [];
      let entidadesCambiadas = false;

      for (const bloque of mensaje.content) {
        if (bloque.type !== 'tool_use' || !bloque.id || !bloque.name) continue;
        try {
          const { result, game: actualizada, ui } = await executeTool(
            partidaActual,
            bloque.name,
            bloque.input,
          );
          if (actualizada) {
            partidaActual = actualizada;
            entidadesCambiadas = true;
          }
          if (ui) emit({ type: 'ui', command: ui });
          resultados.push({
            type: 'tool_result',
            tool_use_id: bloque.id,
            content: result,
          });
        } catch (error) {
          resultados.push({
            type: 'tool_result',
            tool_use_id: bloque.id,
            content: `Error al ejecutar la herramienta: ${
              error instanceof Error ? error.message : 'fallo desconocido'
            }`,
            is_error: true,
          });
        }
      }

      if (entidadesCambiadas) {
        emit({ type: 'entities', game: partidaActual });
      }

      turnos.push({ role: 'user', content: resultados });
      continue;
    }

    // end_turn, max_tokens u otro motivo terminal: cerramos el turno.
    break;
  }

  const mensajeAsistente: ChatMessage = {
    id: nanoid(),
    role: 'assistant',
    content: textoAsistente,
    createdAt: new Date().toISOString(),
  };
  await store.appendMessage(game.id, mensajeAsistente);
  emit({ type: 'done', messageId: mensajeAsistente.id });
}

// ---------------------------------------------------------------------------
// Rutas
// ---------------------------------------------------------------------------

/** Historial de mensajes del chat de una partida. */
router.get('/games/:id/chat/messages', async (req: Request, res: Response) => {
  try {
    const store = getStore();
    const game = await store.getGame(req.params.id);
    if (!game) {
      res.status(404).json({ error: 'Partida no encontrada' });
      return;
    }
    const mensajes = await store.getMessages(req.params.id);
    res.json(mensajes);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al leer el historial',
    });
  }
});

/** Chat con el agente (SSE según el protocolo ChatStreamEvent). */
router.post('/games/:id/chat', async (req: Request, res: Response) => {
  try {
    const store = getStore();
    const game = await store.getGame(req.params.id);
    if (!game) {
      res.status(404).json({ error: 'Partida no encontrada' });
      return;
    }

    const cuerpo = (req.body ?? {}) as Record<string, unknown>;
    const texto = String(cuerpo.message ?? cuerpo.text ?? '').trim();
    if (texto === '') {
      res.status(400).json({ error: 'El mensaje no puede estar vacío' });
      return;
    }

    /*
     * Cabeceras del stream. Son las mismas que las de `/generate`, `/refresh` y
     * `/material`, y tienen que serlo: esta era la única de las cuatro que salía
     * sin `no-transform` ni `X-Accel-Buffering`, y detrás de nginx eso no es un
     * detalle.
     *
     * Nginx almacena en su búfer la respuesta de quien tiene detrás, y con un
     * `text/event-stream` eso significa que el mayordomo escribe palabra a
     * palabra y no sale ni una hasta que se llena el búfer o se cierra la
     * conexión: en el taller la respuesta llegaba de golpe al final, con el
     * chat quieto durante todo el rato, o no llegaba nunca si el turno era
     * largo y el proxy cortaba antes por inactividad. `X-Accel-Buffering: no`
     * es la manera de decirle a nginx que en ESTA respuesta no lo haga, y
     * `no-transform` le prohíbe además recomprimirla por el camino, que es la
     * otra forma de acabar acumulando lo que debía ir saliendo.
     *
     * El fallo no se veía en local, porque en local no hay nginx delante.
     */
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let cerrado = false;
    res.on('close', () => {
      cerrado = true;
    });
    const emit = (evento: ChatStreamEvent): void => {
      if (!cerrado) res.write(`data: ${JSON.stringify(evento)}\n\n`);
    };

    // Guardar el mensaje del usuario antes de responder.
    const mensajeUsuario: ChatMessage = {
      id: nanoid(),
      role: 'user',
      content: texto,
      createdAt: new Date().toISOString(),
    };
    await store.appendMessage(game.id, mensajeUsuario);

    try {
      if (DEMO_MODE) {
        const textoCompleto = await runDemoChat(game, texto, emit);
        const mensajeAsistente: ChatMessage = {
          id: nanoid(),
          role: 'assistant',
          content: textoCompleto,
          createdAt: new Date().toISOString(),
        };
        await store.appendMessage(game.id, mensajeAsistente);
        emit({ type: 'done', messageId: mensajeAsistente.id });
      } else {
        await chatConAgente(game, emit);
      }
    } catch (error) {
      emit({
        type: 'error',
        message:
          error instanceof Error
            ? `El agente ha tropezado con un imprevisto: ${error.message}`
            : 'El agente ha tropezado con un imprevisto desconocido.',
      });
    } finally {
      res.end();
    }
  } catch (error) {
    // Fallo antes de abrir el SSE: respuesta JSON estándar.
    if (!res.headersSent) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Error interno del chat',
      });
    } else {
      res.end();
    }
  }
});

export default router;
