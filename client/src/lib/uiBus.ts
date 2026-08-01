import type { UiCommand } from '../../../shared/types';

/**
 * Bus de eventos por el que el agente de CLUEDO gobierna la UI.
 * El panel de chat emite aquí los comandos recibidos por SSE y los
 * componentes interesados se suscriben.
 */

type Handler = (command: UiCommand) => void;

const handlers = new Set<Handler>();

export function onUiCommand(handler: Handler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

export function emitUiCommand(command: UiCommand): void {
  for (const handler of handlers) handler(command);
}
