/**
 * LO QUE EL HUD ENSEÑA, CALCULADO SIN PINTAR: el aguante, el Foco, las esquirlas y lo que valdrían, las
 * monedas, el reloj de la fase y qué hacer en la pausa.
 *
 * ═══ DE DÓNDE SALE CADA CIFRA ═══
 *
 * Hay dos fuentes y cada cifra dice cuál manda:
 *   · LA SALA (el cable): lo que cambia en la pelea —vida, medidor, puntos de la fase, lo que se lleva,
 *     el recurso del equipo, lo que le queda al reloj—. Es lo más fresco.
 *   · LA MESA (la vista): el punto de control con que empezó la fase y lo que se lleva de una noche a
 *     otra. Manda mientras la sala no haya dicho nada (antes del `dentro`, en la reunión, en el recuento).
 * Y los TOPES (el aguante máximo del estilo, el Foco máximo, las esquirlas que caben, cuánto vale cada
 * una) salen del reglamento compuesto que declara la liza, no de una tabla de este fichero: un retoque
 * o un estilo cambian esos números y el HUD tiene que decir los de verdad.
 *
 * Puro: `verify:quiebro-juego` lo llama con vistas y salas escritas a mano.
 */
import type { LizaDeclarada, PortableDeclarado } from '../../../../shared/mecanicas/liza/declaracion';
import { pagoDelPortable } from '../../../../shared/mecanicas/liza/declaracion';
import { UNO } from '../../../../shared/mecanicas/fijo';
import { NOMBRES_DEL_QUIEBRO } from '../../../../shared/arcade/juegos/quiebro-nombres';
import { ESQUIRLAS_COMO_MUCHO, OLEADAS_FIJAS, PORTABLE_ESQUIRLA, PRIMERA_PAUSA_CON_VOTO } from '../../../../shared/arcade/juegos/quiebro-vista';
import type { VistaDelQuiebro } from '../../../../shared/arcade/juegos/quiebro-vista';
import type { SalidaDelMovimiento } from '../contrato';

/** Lo que valen `n` esquirlas al salir, y con una más (o `null` si ya no cabe otra). */
export interface ValorDeLasEsquirlas {
  readonly n: number;
  readonly valor: number;
  readonly conUnaMas: number | null;
  readonly tope: number;
}

/**
 * «6 → 210 · con una más, 280» (diseño §4.9): el pago del portable de las esquirlas tal como lo declara
 * la liza. Sin liza, el pago del diseño (T(n) × 10) no se inventa: se dice sólo cuántas se llevan.
 */
export function valorDeLasEsquirlas(n: number, portable: PortableDeclarado | null): ValorDeLasEsquirlas {
  const tope = portable?.tope ?? ESQUIRLAS_COMO_MUCHO;
  if (portable === null) return { n, valor: 0, conUnaMas: null, tope };
  return {
    n,
    valor: pagoDelPortable(portable, n),
    conUnaMas: n < tope ? pagoDelPortable(portable, n + 1) : null,
    tope,
  };
}

/** El portable de las esquirlas en la liza, o `null`. */
export function portableDeLasEsquirlas(liza: LizaDeclarada | null): PortableDeclarado | null {
  return liza?.portables.find((p) => p.id === PORTABLE_ESQUIRLA) ?? null;
}

/** Cómo se rotula la fase en el reloj. */
export function etiquetaDeLaFase(vista: VistaDelQuiebro): string {
  const f = vista.fase;
  const n = NOMBRES_DEL_QUIEBRO.fases;
  switch (f.tipo) {
    case 'oleada':
      return f.oleada > OLEADAS_FIJAS ? `${n.propina} ${String(f.oleada - OLEADAS_FIJAS)}` : `${n.oleada} ${String(f.oleada)}`;
    case 'pausa':
      return n.pausa;
    case 'llamada':
      return n.llamada;
    case 'bajada':
      return n.bajada;
    case 'recuento':
      return n.recuento;
    case 'interrumpida':
      return n.interrumpida;
    case 'final':
      return n.final;
    case 'cerrada':
      return n.cerrada;
    case 'reunion':
      return n.reunion;
  }
}

/** Un reloj que se pinta: cuánto le queda, en ms, o `null` si no hay. */
export function loQueLeQueda(hastaMs: number | null, ahora: number): number | null {
  if (hastaMs === null) return null;
  return Math.max(0, hastaMs - ahora);
}

/** «2:05», «0:09». */
export function relojEnTexto(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m)}:${String(s % 60).padStart(2, '0')}`;
}

/** El índice de mi asiento en la vista, o −1. */
export function miIndice(vista: VistaDelQuiebro, yo: string | null): number {
  if (yo === null) return -1;
  return vista.asientos.findIndex((a) => a.asiento === yo);
}

/** ¿Se vota en esta pausa? */
export function seVotaEnLaPausa(vista: VistaDelQuiebro): boolean {
  return vista.fase.tipo === 'pausa' && vista.fase.oleada >= PRIMERA_PAUSA_CON_VOTO;
}

/** La elección que se intenta en la pausa: qué se mandó y en qué pausa. */
export interface EleccionPendiente {
  readonly oleada: number;
  readonly retoque: string;
  readonly voto: string | null;
  readonly intentos: number;
  /** La revisión de la mesa cuando se mandó el último intento. */
  readonly rev: number;
  /** Lo que dijo el último intento, o `null` si aún no ha vuelto. */
  readonly ultimo: SalidaDelMovimiento | null;
}

/** Cuántas veces se reintenta como mucho una elección de la pausa. */
export const REINTENTOS_DE_LA_PAUSA = 3;

/**
 * ¿QUÉ HAGO CON MI ELECCIÓN DE LA PAUSA, con esta vista? El contrato del puerto (`contrato.ts`) junta el
 * 409 de una revisión vieja con el «no» del juego en un solo `'rechazado'`, así que quien decide es la
 * VISTA: si mi asiento ya consta como elegido, está hecho; si la pausa ya no es la misma, se abandona; y
 * si el último intento no entró, se reintenta —con tope— pero sólo con una vista MÁS NUEVA que la del
 * intento (`revAhora > p.rev`): reintentar con la misma revisión que acaba de dar un 409 es gastar un
 * intento en otro 409.
 */
export function queHacerConLaEleccion(vista: VistaDelQuiebro, revAhora: number, yo: string | null, p: EleccionPendiente): 'hecho' | 'esperar' | 'reintentar' | 'abandonar' {
  const i = miIndice(vista, yo);
  if (i < 0) return 'abandonar';
  if (vista.fase.tipo !== 'pausa' || vista.fase.oleada !== p.oleada) return 'abandonar';
  const mio = vista.asientos[i];
  if (mio !== undefined && mio.haElegido) return 'hecho';
  if (p.ultimo === null || p.ultimo.resultado === 'hecho') return 'esperar';
  if (p.intentos >= REINTENTOS_DE_LA_PAUSA) return 'abandonar';
  return revAhora > p.rev ? 'reintentar' : 'esperar';
}

/** El multiplicador de puntos (Q16.16) como texto: «×1,3». */
export function multiplicadorEnTexto(mult: number): string {
  const x = Math.round((mult / UNO) * 10) / 10;
  return `×${x.toFixed(1).replace('.', ',')}`;
}

/** Un número grande con los miles separados a la española: «12.480». */
export function cifra(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
