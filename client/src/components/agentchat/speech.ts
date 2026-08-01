/**
 * Ayudantes de entrada por voz (Web Speech API) para el chat del Mayordomo.
 * La API de reconocimiento de voz no está tipada de forma estándar en todos
 * los navegadores, así que declaramos aquí las formas mínimas que usamos.
 */

export interface AlternativaVoz {
  transcript: string;
}

export interface ResultadoVoz {
  isFinal: boolean;
  readonly length: number;
  [index: number]: AlternativaVoz;
}

export interface ListaResultadosVoz {
  readonly length: number;
  [index: number]: ResultadoVoz;
}

export interface EventoResultadoVoz {
  resultIndex: number;
  results: ListaResultadosVoz;
}

export interface ReconocimientoVoz {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((evento: EventoResultadoVoz) => void) | null;
  onerror: ((evento: unknown) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type ConstructorVoz = new () => ReconocimientoVoz;

/**
 * Devuelve el constructor de reconocimiento de voz del navegador,
 * o `null` si el navegador no lo soporta (en ese caso se oculta el micrófono).
 */
export function obtenerConstructorVoz(): ConstructorVoz | null {
  // La API solo existe con prefijo webkit en la mayoría de navegadores.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctor = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
  return typeof ctor === 'function' ? (ctor as ConstructorVoz) : null;
}
