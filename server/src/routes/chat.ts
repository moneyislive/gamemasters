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
import { bloquesDeSistema } from '../agent/systemPrompt';
import { quienPide } from '../gasto/quien';
import { cabeHoy, mensajeDeTope } from '../gasto/tope';
import { executeTool, herramientasDe } from '../agent/tools';
import { runDemoChat } from '../agent/demo';
import { crearRouter } from '../rutas';
import { partidaParaElTaller } from '../live/proyeccion';
import { apuntarUso, volcarGasto } from '../gasto/contador';

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
  /**
   * Lo que ha costado la vuelta. Es `unknown` a proposito: aqui solo se pasa al
   * contador, que ya sabe leer las formas que trae la API sin obligar a este
   * fichero a conocerlas.
   */
  usage?: unknown;
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
  sistema: { estable: string; volatil: string },
  turnos: Turno[],
  /*
   * La partida, para saber a que juego se juega. Entra hasta aqui solo por las
   * herramientas: son lo unico de la llamada que depende del juego.
   */
  game: GameSession,
  /*
   * La señal con la que se corta si quien preguntó ya no está.
   *
   * Va hasta la llamada HTTP misma, no solo hasta el bucle: abortarla cierra la
   * conexion con la API y el modelo deja de generar. Cortar solo el bucle
   * dejaria la generacion corriendo al otro lado, que es exactamente lo que se
   * paga.
   */
  senal: AbortSignal,
): StreamAgente {
  const parametrosBase = {
    model,
    max_tokens: 16000,
    /*
     * DOS BLOQUES, Y LA MARCA DE LA CACHE ENTRE MEDIAS.
     *
     * El modelo recibe exactamente los mismos caracteres en el mismo orden --la
     * API concatena los bloques del sistema--, pero ahora el prefijo cacheado
     * termina justo antes del inventario de la partida, que es lo unico que
     * cambia de un turno a otro. Antes la marca estaba al final de todo, asi que
     * dar de alta un sospechoso invalidaba los tres mil y pico tokens enteros; y
     * dar de alta cosas es lo que se hace en el taller. En `bloquesDeSistema`
     * esta el porque con los numeros.
     */
    system: [
      {
        type: 'text' as const,
        text: sistema.estable,
        cache_control: { type: 'ephemeral' as const },
      },
      ...(sistema.volatil === '' ? [] : [{ type: 'text' as const, text: sistema.volatil }]),
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
    } as unknown as Parameters<typeof client.beta.messages.stream>[0],
    { signal: senal }) as unknown as StreamAgente;
  }

  return client.messages.stream(
    parametrosBase as unknown as Parameters<typeof client.messages.stream>[0],
    { signal: senal },
  ) as unknown as StreamAgente;
}

/**
 * Bucle de chat con el agente real: streaming de texto + ejecución de
 * herramientas hasta `end_turn`. Devuelve el id del mensaje guardado.
 */
async function chatConAgente(
  game: GameSession,
  emit: (e: ChatStreamEvent) => void,
  senal: AbortSignal,
): Promise<void> {
  const store = getStore();
  const client = getAnthropicClient();
  if (!client) {
    emit({ type: 'error', message: 'No hay clave de API configurada en el servidor.' });
    return;
  }

  const model = await resolveModel(game);
  const sistema = bloquesDeSistema(game);

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

  /*
   * SI SE FUE, SE CORTA. Antes no: el mayordomo seguia hablando solo.
   *
   * Cerrar la pestaña solo hacia que `emit` dejara de escribir. El bucle seguia
   * hasta doce vueltas, reenviando la conversacion entera en cada una, llamando
   * herramientas y guardando la partida — todo para nadie. Es el gasto menos
   * acotado de la casa y el mas facil de disparar: basta con recargar el taller
   * un par de veces para dejar tres agentes escribiendo contra la misma partida
   * a la vez, que ademas de caro es una forma de pisarse los cambios.
   *
   * Se corta con la señal, no con una bandera, porque la bandera no cruza a la
   * API: el modelo seguiria generando al otro lado y esos tokens ya se pagan.
   */
  let cortado = false;

  for (let vuelta = 0; vuelta < MAX_ITERACIONES; vuelta++) {
    if (senal.aborted) {
      cortado = true;
      break;
    }

    const stream = abrirStream(client, model, sistema, turnos, game, senal);

    try {
      for await (const evento of stream) {
        if (evento.type === 'content_block_delta' && evento.delta?.type === 'text_delta') {
          const delta = evento.delta.text ?? '';
          if (delta !== '') {
            textoAsistente += delta;
            emit({ type: 'text', delta });
          }
        }
      }
    } catch (error) {
      // Abortar hace saltar el stream. Si fue porque se fue quien preguntaba,
      // no es un fallo: es lo que se pidio. Cualquier otro error sube.
      if (!senal.aborted) throw error;
      cortado = true;
      break;
    }

    const mensaje = await stream.finalMessage();
    /*
     * POR VUELTA, no solo la ultima. El bucle del taller puede dar hasta doce, y
     * cada una reenvia la conversacion entera: contar solo la que termina seria
     * perderse justo lo que se quiere medir. Es ademas el gasto menos acotado de
     * la casa, porque crece con lo que se hable.
     */
    apuntarUso({ concepto: 'asistente', model, usage: mensaje.usage, gameId: game.id });

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
        // La misma puerta por el chat del taller: cada alta de entidad
        // devolvia la partida completa.
        emit({ type: 'entities', game: partidaParaElTaller(partidaActual) });
      }

      turnos.push({ role: 'user', content: resultados });
      continue;
    }

    // end_turn, max_tokens u otro motivo terminal: cerramos el turno.
    break;
  }

  /*
   * LO YA DICHO SE GUARDA AUNQUE SE HAYA CORTADO.
   *
   * Cortar no puede convertirse en perder: quien cerro la pestaña a mitad
   * vuelve al taller y encuentra lo que el mayordomo llevaba escrito, igual que
   * si se hubiera quedado mirando. Lo unico que se pierde son las vueltas que
   * ya no se van a dar, que es justo lo que se queria dejar de pagar.
   *
   * Vacio no se guarda nada: un turno del asistente en blanco solo ensucia el
   * historial que se reenvia en la siguiente pregunta.
   */
  if (textoAsistente !== '') {
    const mensajeAsistente: ChatMessage = {
      id: nanoid(),
      role: 'assistant',
      content: textoAsistente,
      createdAt: new Date().toISOString(),
    };
    await store.appendMessage(game.id, mensajeAsistente);
    if (!cortado) emit({ type: 'done', messageId: mensajeAsistente.id });
  }

  if (cortado) {
    console.log(`[chat] turno cortado: quien preguntaba se fue (partida ${game.id})`);
  }

  // Lo apuntado en TODAS las vueltas del bucle, de una vez y con la partida ya
  // guardada: volcarlo antes seria contar en una hoja que el turno va a tirar.
  await volcarGasto(game.id);
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
     * EL TOPE, Y AQUÍ HACE MÁS FALTA QUE EN NINGÚN SITIO.
     *
     * Este es el gasto SIN FONDO de la casa: cada turno da hasta doce vueltas
     * reenviando la conversación entera, así que lo que cuesta crece con lo que
     * se hable y no tiene techo natural. No llevaba ninguno; el único de la casa
     * estaba en la ruta de avatares, la barata.
     *
     * Se cuenta antes de responder y en 429 con texto legible, porque esto lo va
     * a leer alguien preparando su velada. El tope está puesto alto a propósito
     * —doscientos cincuenta turnos al día— para que solo lo toque un bucle.
     */
    const quien = quienPide(req) ?? 'sin-identificar';
    if (!cabeHoy(quien, 'charla')) {
      res.status(429).json({ error: mensajeDeTope('charla') });
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
    /*
     * El mando de apagado del turno. `res.on('close')` salta tanto si se cierra
     * la pestaña como al terminar de responder, asi que se aborta solo mientras
     * el turno sigue vivo; abortar despues seria inofensivo pero engañoso de
     * leer.
     */
    const mando = new AbortController();
    let enCurso = true;
    res.on('close', () => {
      cerrado = true;
      if (enCurso) mando.abort();
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
        await chatConAgente(game, emit, mando.signal);
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
      enCurso = false;
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
