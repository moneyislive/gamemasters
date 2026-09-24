/**
 * EL CATÁLOGO DE SONIDOS SUELTOS: golpes, cristales, pasos, esquirlas, la cabina que se descuelga…
 *
 * ═══ CÓMO ESTÁ HECHO CADA SONIDO ═══
 *
 * Con osciladores, ruido y filtros, en el momento: no hay ni un fichero de audio (diseño §9 permite
 * 1,5 MB y esto gasta cero). Cada receta dice su categoría, su camino (mundo o claro, ver `motor.ts`),
 * su alcance, cuánta calle mojada lleva, cuántas voces suyas caben a la vez y cómo se fabrica. Lo que
 * es MUCHO y CORTO (el cristal, la chapa, las palomas) sale de un búfer calculado en `sintesis.ts`.
 *
 * ═══ LOS GOLPES, EN TRES CAPAS (diseño §7 y §9) ═══
 *
 * «El contacto trae un parón de impacto de 60-100 ms, chispas, sacudida y tres capas de sonido. El
 * parón esconde la espera del veredicto.» Las tres capas NO suenan a la vez, y ése es el truco:
 *
 *   1. AIRE (`aire`), al PULSAR: el juego lo dispara en el `pointerdown`, antes de saber nada. Es lo
 *      que hace que el golpe responda «en el mismo fotograma» aunque el veredicto tarde media ida y
 *      vuelta.
 *   2. IMPACTO (`impacto` o `guardia`), con el VEREDICTO: el chasquido, el puñetazo con cuerpo y la
 *      saturación. Si el golpe entró a compás, lleva además una nota AFINADA con la música: el golpe
 *      se oye dentro de la canción.
 *   3. CUERPO (`cuerpo` o `derribo`), lo que le pasa al que lo recibe: el sordo del torso o, si cae,
 *      el golpe contra el asfalto mojado con su salpicadura, un instante después.
 *
 * Ninguna capa lleva voz humana: ni quejidos ni gritos. Un Prestado es un durmiente al que el Sistema
 * ha puesto a pelear (diseño §1); ponerle un quejido lo convertiría en víctima, y el tono del juego es
 * de coreografía, no de paliza.
 *
 * ═══ SEÑALES, EFECTOS, AMBIENTE ═══
 *
 * Las SEÑALES (bala, apuntado, aviso) son jugabilidad: van por el camino claro, en el reloj verdadero,
 * y agachan el mundo mientras suenan. Los EFECTOS (golpes, esquirlas) van por el mundo y bajan con el
 * Remanso, salvo los que SON el Remanso o su recompensa (el quiebro limpio, la esquirla, el latido),
 * que van claros para que no se los coma el filtro que ellos mismos abren. El AMBIENTE (pasos,
 * palomas, farolas) va por el mundo y además por la cinta del Bis.
 */
import { frecuencia } from './partitura';
import { aleteo, chapaGolpeada, cristalRoto } from './sintesis';
import { barrido, bufer, envolvente, escalonador, filtro, ganancia, oscilador, ruidoEn, saturador, soplo, sordo, tono } from './piezas';
import type { Camino, CategoriaDeSonido, MotorDelSonido, Voz } from './motor';
import { colocar } from './motor';
import type { NombreDeAlcance, Punto3 } from './cuentas';
import { corteDelAire, distancia } from './cuentas';

export type TipoDeGolpe = 'entrada' | 'seguida' | 'cierre' | 'empellon' | 'replica';
export type Material = 'chapa' | 'cristal' | 'piedra';

/** Todos los sonidos sueltos que se piden por nombre. */
export const IDS_DE_SONIDO = [
  'aire',
  'impacto',
  'guardia',
  'cuerpo',
  'derribo',
  'cristal',
  'estampado',
  'quiebro',
  'quiebro-limpio',
  'quiebro-torpe',
  'replica',
  'paso',
  'esquirla',
  'moneda',
  'descolgar',
  'salida',
  'desalojo',
  'impresion',
  'trasvase',
  'disparo',
  'bala',
  'apuntado',
  'aviso',
  'palomas',
  'farola',
  'latido',
] as const;

export type IdDeSonido = (typeof IDS_DE_SONIDO)[number];

export interface OpcionesDeSonido {
  /** Dónde suena (metros, mundo del juego). Sin posición, suena en el propio jugador. */
  readonly posicion?: Punto3 | null;
  /** 0..1, por defecto 1. En los pasos, 0,5 es andar y 1 correr. */
  readonly fuerza?: number;
  /** Qué golpe de la Tanda (para `aire`, `impacto` y `guardia`). */
  readonly golpe?: TipoDeGolpe;
  /** Contra qué se estampa (para `estampado`). */
  readonly material?: Material;
  /** El golpe entró a compás: el impacto suena afinado con la música. */
  readonly aCompas?: boolean;
  /** La esquirla número tantos de las que llevas (1-12): cada una suena un escalón más arriba. */
  readonly cuenta?: number;
  /** Duración de lo que dura (bala en vuelo, apuntado del tirador), en ms. */
  readonly duracionMs?: number;
  /**
   * Cuándo debe OÍRSE, en ms de `performance.now()`. Sin él, ahora. Sirve para clavar el impacto en el
   * instante que dijo el servidor; si ya pasó, suena en el acto.
   */
  readonly enMs?: number;
}

/** Lo que devuelve `sonar`: para mover lo que se mueve y cortar lo que dura. */
export interface ManejoDeSonido {
  parar(): void;
  mover(posicion: Punto3): void;
}

export const MANEJO_INERTE: ManejoDeSonido = { parar: () => undefined, mover: () => undefined };

/** Las opciones ya resueltas: instante del contexto, fuerza acotada y la nota del acento. */
export interface Resueltas {
  readonly t: number;
  readonly fuerza: number;
  readonly golpe: TipoDeGolpe;
  readonly material: Material;
  readonly cuenta: number;
  readonly duracionS: number;
  /** La altura MIDI del acento «a compás», o `null`. La pone quien conoce la música. */
  readonly acento: number | null;
}

interface Receta {
  readonly categoria: CategoriaDeSonido;
  readonly camino: Camino;
  readonly alcance: NombreDeAlcance;
  readonly reverberacion: number;
  /** Voces suyas a la vez, como mucho. */
  readonly tope: number;
  /** Cuánto dura, para el tope y la limpieza (el `hacer` devuelve el final exacto). */
  duracion(o: Resueltas): number;
  /** Fabrica el sonido en la voz y devuelve el instante (contexto) en que acaba. */
  hacer(m: MotorDelSonido, v: Voz, o: Resueltas): number;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// Los golpes
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/** Peso de cada golpe de la Tanda: la Seguida es corta y seca, el Cierre y la Réplica, gordos. */
const PESO: Readonly<Record<TipoDeGolpe, number>> = { seguida: 0.72, entrada: 0.86, cierre: 1, empellon: 0.95, replica: 1.12 };
/** Duración del aire de cada golpe: casi lo que tarda el brazo (el anuncio de §4.5, sin la recuperación). */
const AIRE_S: Readonly<Record<TipoDeGolpe, number>> = { seguida: 0.13, entrada: 0.2, cierre: 0.26, empellon: 0.3, replica: 0.22 };

function hacerAire(m: MotorDelSonido, v: Voz, o: Resueltas): number {
  const t = o.t;
  const dur = AIRE_S[o.golpe];
  const g = ganancia(m, v, v.entrada);
  const pico = 0.5 * o.fuerza;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(pico, t + dur * 0.45);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const f = filtro(m, v, 'bandpass', 450, 1.1, g);
  f.frequency.setValueAtTime(450, t);
  f.frequency.exponentialRampToValueAtTime(1900 + 1000 * o.fuerza, t + dur * 0.45);
  f.frequency.exponentialRampToValueAtTime(650, t + dur);
  ruidoEn(m, v, 'blanco', t, t + dur + 0.01, f);
  // El chasquido de la tela al arrancar el brazo.
  soplo(m, v, t, 'lowpass', 900, 0.7, 0.003, 0.25 * o.fuerza, 0.045, v.entrada);
  return t + dur + 0.01;
}

function hacerImpacto(m: MotorDelSonido, v: Voz, o: Resueltas): number {
  const t = o.t;
  const peso = PESO[o.golpe];
  const f = o.fuerza;
  // El chasquido: medio milisegundo de agudos, lo que hace que se oiga en un altavoz de teléfono.
  soplo(m, v, t, 'highpass', 2000, 0.7, 0.0005, 0.8 * f, 0.008, v.entrada);
  // El puñetazo: seno de 200 a 50 Hz, saturado. En un teléfono no se oye el grave; se oye la mordida.
  const sat = saturador(m, v, 3.5, v.entrada);
  const fin = sordo(m, v, t, 200 - 40 * peso, 50, 0.07, peso * f, 0.14 * peso, sat);
  // La palmada de la carne y la tela.
  soplo(m, v, t, 'bandpass', 1100, 1.4, 0.001, 0.5 * f, 0.045, v.entrada);
  let final = fin;
  if (o.acento !== null) {
    // A compás: la fundamental del acorde con dos parciales de campana. Ver `notaDeAcento`.
    const hz = frecuencia(o.acento);
    final = Math.max(final, tono(m, v, t, hz, 0.3, 0.5, v.entrada));
    tono(m, v, t, hz * 2.76, 0.1, 0.25, v.entrada);
    tono(m, v, t, hz * 2, 0.12, 0.35, v.entrada, 'triangle');
  }
  return final;
}

function hacerGuardia(m: MotorDelSonido, v: Voz, o: Resueltas): number {
  const t = o.t;
  const f = o.fuerza;
  // El antebrazo que para: sordo, más agudo y corto que un impacto, y un «clac» seco encima.
  const fin = sordo(m, v, t, 150, 88, 0.06, 0.75 * f, 0.09, v.entrada);
  soplo(m, v, t, 'bandpass', 2600, 5, 0.0005, 0.7 * f, 0.025, v.entrada);
  soplo(m, v, t, 'bandpass', 700, 1, 0.001, 0.35 * f, 0.06, v.entrada);
  // El gemelo de la manga del traje: la única nota metálica, y es la que dice «trajeado».
  tono(m, v, t + 0.004, 3150, 0.1 * f, 0.06, v.entrada);
  return fin;
}

function hacerCuerpo(m: MotorDelSonido, v: Voz, o: Resueltas): number {
  const t = o.t;
  const fin = sordo(m, v, t, 115, 65, 0.09, 0.7 * o.fuerza, 0.12, v.entrada);
  soplo(m, v, t, 'lowpass', 1600, 0.7, 0.01, 0.3 * o.fuerza, 0.16, v.entrada);
  return Math.max(fin, t + 0.18);
}

function hacerDerribo(m: MotorDelSonido, v: Voz, o: Resueltas): number {
  const t = o.t + 0.12;
  const f = o.fuerza;
  const sat = saturador(m, v, 2.5, v.entrada);
  const fin = sordo(m, v, t, 95, 38, 0.18, f, 0.25, sat);
  // La salpicadura del asfalto mojado, y una segunda más pequeña: el cuerpo rebota.
  soplo(m, v, t, 'bandpass', 1800, 0.7, 0.004, 0.55 * f, 0.26, v.entrada);
  soplo(m, v, t + 0.08, 'bandpass', 2300, 0.8, 0.004, 0.3 * f, 0.18, v.entrada);
  // Gotas que caen de vuelta.
  for (let i = 0; i < 6; i++) {
    tono(m, v, t + 0.02 + m.azar() * 0.33, 2000 + m.azar() * 2200, (0.08 + m.azar() * 0.07) * f, 0.012 + m.azar() * 0.018, v.entrada);
  }
  return Math.max(fin, t + 0.45);
}

function hacerCristal(m: MotorDelSonido, v: Voz, o: Resueltas): number {
  const t = o.t;
  const variante = Math.floor(m.azar() * 3);
  const b = m.bufer(`cristal-${variante}`, (sr) => cristalRoto(sr, 101 + variante));
  const g = ganancia(m, v, v.entrada, 0.9 * o.fuerza);
  const velocidad = 0.94 + m.azar() * 0.12;
  bufer(m, v, b, t, g, velocidad);
  sordo(m, v, t, 90, 50, 0.1, 0.5 * o.fuerza, 0.1, v.entrada);
  return t + b.duration / velocidad;
}

function hacerEstampado(m: MotorDelSonido, v: Voz, o: Resueltas): number {
  const t = o.t;
  const f = o.fuerza;
  const sat = saturador(m, v, 3, v.entrada);
  let fin = sordo(m, v, t, 85, 40, 0.15, 0.95 * f, 0.18, sat);
  soplo(m, v, t, 'lowpass', 1400, 0.7, 0.003, 0.3 * f, 0.1, v.entrada);
  if (o.material === 'chapa') {
    const variante = Math.floor(m.azar() * 3);
    const b = m.bufer(`chapa-${variante}`, (sr) => chapaGolpeada(sr, 211 + variante));
    bufer(m, v, b, t, ganancia(m, v, v.entrada, 0.95 * f), 0.96 + m.azar() * 0.08);
    fin = Math.max(fin, t + b.duration);
  } else if (o.material === 'cristal') {
    fin = Math.max(fin, hacerCristal(m, v, { ...o, t: t + 0.005 }));
  } else {
    // Piedra: cascotes, y la grieta que brilla con glifos (diseño §8, momento 3): un chirrido digital.
    for (let i = 0; i < 10; i++) {
      const cuando = t + 0.02 + Math.pow(m.azar(), 1.5) * 0.4;
      soplo(m, v, cuando, 'lowpass', 900 + m.azar() * 900, 0.8, 0.002, (0.25 - i * 0.02) * f, 0.03 + m.azar() * 0.04, v.entrada);
    }
    const g = ganancia(m, v, v.entrada);
    const finGrieta = envolvente(g.gain, t + 0.03, 0.005, 0.14 * f, 0.12);
    const pasa = filtro(m, v, 'bandpass', 1800, 2, g);
    const chirrido = oscilador(m, v, 'square', 2200, t + 0.03, finGrieta + 0.01, pasa);
    barrido(chirrido.frequency, t + 0.03, 2200, 600, 0.09);
    fin = Math.max(fin, t + 0.5);
  }
  return fin;
}

function hacerReplica(m: MotorDelSonido, v: Voz, o: Resueltas): number {
  const t = o.t;
  let fin = hacerImpacto(m, v, { ...o, golpe: 'replica' });
  // El estampido: un grave que baja a 30 Hz, saturado. En la Réplica el golpe no se para con nada.
  const sat = saturador(m, v, 4, v.entrada);
  fin = Math.max(fin, sordo(m, v, t, 64, 30, 0.4, o.fuerza, 0.45, sat));
  // El chispazo digital: el desvelado leyendo el código de la ciudad.
  const g = ganancia(m, v, v.entrada);
  const finGlitch = envolvente(g.gain, t, 0.001, 0.35 * o.fuerza, 0.12);
  const pasa = filtro(m, v, 'bandpass', 1800, 0.8, g);
  ruidoEn(m, v, 'blanco', t, finGlitch + 0.01, escalonador(m, v, 5, pasa));
  return fin;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// Quiebros
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

function hacerQuiebro(m: MotorDelSonido, v: Voz, o: Resueltas): number {
  const t = o.t;
  const g = ganancia(m, v, v.entrada);
  const fin = envolvente(g.gain, t, 0.02, 0.45 * o.fuerza, 0.15);
  const f = filtro(m, v, 'bandpass', 3200, 1.6, g);
  barrido(f.frequency, t, 3200, 900, 0.16);
  ruidoEn(m, v, 'blanco', t, fin + 0.01, f);
  // El vuelo de la gabardina: dos golpes de tela.
  soplo(m, v, t, 'lowpass', 700, 0.7, 0.004, 0.3 * o.fuerza, 0.05, v.entrada);
  soplo(m, v, t + 0.06, 'lowpass', 600, 0.7, 0.004, 0.22 * o.fuerza, 0.05, v.entrada);
  return fin;
}

function hacerQuiebroTorpe(m: MotorDelSonido, v: Voz, o: Resueltas): number {
  const t = o.t;
  const g = ganancia(m, v, v.entrada);
  const fin = envolvente(g.gain, t, 0.015, 0.3 * o.fuerza, 0.09);
  const f = filtro(m, v, 'bandpass', 2400, 1.4, g);
  barrido(f.frequency, t, 2400, 1100, 0.1);
  ruidoEn(m, v, 'blanco', t, fin + 0.01, f);
  // El zapato que resbala en lo mojado: un chirrido corto. Suena a torpe, que es lo que es.
  const gz = ganancia(m, v, v.entrada);
  const finZ = envolvente(gz.gain, t + 0.05, 0.005, 0.12 * o.fuerza, 0.05);
  const z = oscilador(m, v, 'triangle', 950, t + 0.05, finZ + 0.01, gz);
  barrido(z.frequency, t + 0.05, 950, 1350, 0.05);
  return Math.max(fin, finZ);
}

function hacerQuiebroLimpio(m: MotorDelSonido, v: Voz, o: Resueltas): number {
  const t = o.t;
  const f = o.fuerza;
  // El cristal del instante: La 6, Mi 7 y La 7, largos. Es la nota del Remanso.
  let fin = tono(m, v, t, 1760, 0.22 * f, 0.9, v.entrada);
  tono(m, v, t, 2637, 0.14 * f, 0.7, v.entrada);
  tono(m, v, t, 3520, 0.1 * f, 0.5, v.entrada);
  // La caída del mundo: un grave que se hunde y un vacío que se cierra de 7 kHz a 350 Hz.
  fin = Math.max(fin, sordo(m, v, t, 90, 38, 0.5, 0.6 * f, 0.55, v.entrada));
  const g = ganancia(m, v, v.entrada);
  const finVacio = envolvente(g.gain, t, 0.003, 0.4 * f, 0.45);
  const cierra = filtro(m, v, 'lowpass', 7000, 1.2, g);
  barrido(cierra.frequency, t, 7000, 350, 0.45);
  ruidoEn(m, v, 'rosa', t, finVacio + 0.01, cierra);
  return Math.max(fin, finVacio);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// Calle, botín y cabina
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

function hacerPaso(m: MotorDelSonido, v: Voz, o: Resueltas): number {
  const t = o.t;
  const f = o.fuerza;
  // El talón, el chapoteo y el «chof» del agua que se escurre bajo la suela. Cada paso, distinto.
  const fin = sordo(m, v, t, 95 + m.azar() * 20, 55, 0.04, 0.35 * f, 0.05, v.entrada);
  const finAgua = soplo(m, v, t + 0.004, 'bandpass', 1800 + m.azar() * 1000, 0.9, 0.003, 0.3 * (0.6 + 0.4 * f), 0.07 + m.azar() * 0.04, v.entrada);
  const g = ganancia(m, v, v.entrada);
  const finChof = envolvente(g.gain, t + 0.015, 0.005, 0.12 * f, 0.05);
  const bp = filtro(m, v, 'bandpass', 600, 3, g);
  barrido(bp.frequency, t + 0.015, 600, 1500, 0.05);
  ruidoEn(m, v, 'blanco', t + 0.015, finChof + 0.01, bp);
  return Math.max(fin, finAgua, finChof);
}

/** La menor pentatónica (La Do Re Mi Sol), en semitonos sobre La. */
const PENTATONICA = [0, 3, 5, 7, 10] as const;

/** La altura MIDI de la esquirla número `cuenta` (1-12): sube por la pentatónica desde La 5. */
export function alturaDeLaEsquirla(cuenta: number): number {
  const i = Math.max(0, Math.min(11, Math.floor(cuenta) - 1));
  return 81 + (PENTATONICA[i % 5] ?? 0) + 12 * Math.floor(i / 5);
}

function hacerEsquirla(m: MotorDelSonido, v: Voz, o: Resueltas): number {
  const t = o.t;
  const hz = frecuencia(alturaDeLaEsquirla(o.cuenta));
  // Ámbar: una campanita con parcial de campana (2,76) y un brillo de agudos.
  const fin = tono(m, v, t, hz, 0.3 * o.fuerza, 0.5, v.entrada);
  tono(m, v, t, hz * 2.76, 0.12 * o.fuerza, 0.3, v.entrada);
  tono(m, v, t, hz * 5.4, 0.05 * o.fuerza, 0.15, v.entrada);
  soplo(m, v, t, 'highpass', 8000, 0.7, 0.001, 0.15 * o.fuerza, 0.04, v.entrada);
  return fin;
}

function hacerMoneda(m: MotorDelSonido, v: Voz, o: Resueltas): number {
  const t = o.t;
  const f = o.fuerza;
  tono(m, v, t, 2350, 0.3 * f, 0.18, v.entrada);
  tono(m, v, t, 4120, 0.18 * f, 0.12, v.entrada);
  tono(m, v, t, 6230, 0.1 * f, 0.08, v.entrada);
  // La moneda rueda por la ranura: clics cada vez más juntos.
  const rueda = [0.06, 0.1, 0.13, 0.155, 0.172];
  rueda.forEach((d, i) => soplo(m, v, t + d, 'bandpass', 3000, 4, 0.0005, (0.16 - i * 0.02) * f, 0.012, v.entrada));
  // Y el mecanismo la traga.
  const fin = sordo(m, v, t + 0.22, 180, 120, 0.05, 0.4 * f, 0.08, v.entrada);
  soplo(m, v, t + 0.22, 'bandpass', 900, 1.2, 0.001, 0.25 * f, 0.05, v.entrada);
  return fin;
}

function hacerDescolgar(m: MotorDelSonido, v: Voz, o: Resueltas): number {
  const t = o.t;
  // El auricular sale de la horquilla: un «clac» de baquelita.
  soplo(m, v, t, 'bandpass', 1500, 3, 0.0005, 0.6 * o.fuerza, 0.02, v.entrada);
  sordo(m, v, t, 220, 160, 0.03, 0.4 * o.fuerza, 0.05, v.entrada);
  /*
   * Y el tono de marcar: 425 Hz, que es el de la red española (y el europeo). Medio segundo, por el
   * auricular (paso de banda estrecho y una pizca de saturación). Un detalle de la voz de la casa que
   * cualquiera que haya descolgado un teléfono aquí reconoce sin saber por qué.
   */
  const g = ganancia(m, v, v.entrada);
  const t1 = t + 0.12;
  g.gain.setValueAtTime(0, t1);
  g.gain.linearRampToValueAtTime(0.14 * o.fuerza, t1 + 0.01);
  g.gain.setValueAtTime(0.14 * o.fuerza, t1 + 0.4);
  g.gain.linearRampToValueAtTime(0, t1 + 0.46);
  const auricular = filtro(m, v, 'bandpass', 900, 0.7, g);
  oscilador(m, v, 'sine', 425, t1, t1 + 0.47, saturador(m, v, 1.8, auricular));
  return t1 + 0.47;
}

function hacerSalida(m: MotorDelSonido, v: Voz, o: Resueltas): number {
  const t = o.t;
  // Te deshaces en glifos ámbar que suben por el cable (diseño §8, momento 9): la pentatónica hacia arriba.
  let fin = t;
  for (let i = 0; i < 10; i++) {
    const hz = frecuencia(alturaDeLaEsquirla(i + 1) - 12);
    const cuando = t + i * 0.06;
    fin = Math.max(fin, tono(m, v, cuando, hz, (0.18 - i * 0.008) * o.fuerza, 0.35, v.entrada));
    tono(m, v, cuando, hz * 2, 0.06 * o.fuerza, 0.2, v.entrada, 'triangle');
  }
  const g = ganancia(m, v, v.entrada);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.25 * o.fuerza, t + 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
  const sube = filtro(m, v, 'bandpass', 800, 2, g);
  barrido(sube.frequency, t, 800, 6000, 1.2);
  ruidoEn(m, v, 'rosa', t, t + 1.21, sube);
  return Math.max(fin, t + 1.21);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// El Sistema: desalojo, impresión, trasvase
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/** Una ráfaga de «bips» de datos: cuadradas cortas por un paso de banda, con tonos de una rampa. */
function bips(m: MotorDelSonido, v: Voz, t: number, cuantos: number, desdeHz: number, hastaHz: number, espacioS: number, acelera: boolean, fuerza: number): number {
  let cuando = t;
  let fin = t;
  for (let i = 0; i < cuantos; i++) {
    const u = i / Math.max(1, cuantos - 1);
    const base = desdeHz * Math.pow(hastaHz / desdeHz, u);
    const hz = base * (0.85 + m.azar() * 0.3);
    const g = ganancia(m, v, v.entrada);
    const f = envolvente(g.gain, cuando, 0.001, 0.14 * fuerza * (1 - 0.4 * u), 0.022);
    const pasa = filtro(m, v, 'bandpass', hz * 2, 3, g);
    oscilador(m, v, 'square', hz, cuando, f + 0.005, pasa);
    fin = Math.max(fin, f);
    const paso = acelera ? espacioS * (1.3 - 0.8 * u) : espacioS * (0.8 + m.azar() * 0.4);
    cuando += paso;
  }
  return fin;
}

function hacerDesalojo(m: MotorDelSonido, v: Voz, o: Resueltas): number {
  const t = o.t;
  // El Celador se va en columnas de glifos que suben: datos que suben de tono y se deshacen.
  let fin = bips(m, v, t, 18, 300, 2400, 0.06, false, o.fuerza);
  const g = ganancia(m, v, v.entrada);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.25 * o.fuerza, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.15);
  const sube = filtro(m, v, 'bandpass', 500, 1.5, g);
  barrido(sube.frequency, t, 500, 5000, 1.1);
  ruidoEn(m, v, 'blanco', t, t + 1.16, escalonador(m, v, 6, sube));
  fin = Math.max(fin, sordo(m, v, t + 1.1, 120, 60, 0.25, 0.3 * o.fuerza, 0.25, v.entrada));
  return Math.max(fin, t + 1.16);
}

function hacerImpresion(m: MotorDelSonido, v: Voz, o: Resueltas): number {
  const t = o.t;
  // Al revés que el desalojo: los glifos caen, se aprietan y aterrizan en un hombre que se ajusta los puños.
  bips(m, v, t, 20, 2400, 300, 0.07, true, o.fuerza);
  const g = ganancia(m, v, v.entrada);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.22 * o.fuerza, t + 0.9);
  g.gain.linearRampToValueAtTime(0, t + 1.1);
  const baja = filtro(m, v, 'bandpass', 5000, 1.5, g);
  barrido(baja.frequency, t, 5000, 500, 1.1);
  ruidoEn(m, v, 'blanco', t, t + 1.11, escalonador(m, v, 6, baja));
  const pie = t + 1.1;
  let fin = sordo(m, v, pie, 100, 55, 0.1, 0.6 * o.fuerza, 0.12, v.entrada);
  soplo(m, v, pie, 'lowpass', 2500, 0.7, 0.002, 0.3 * o.fuerza, 0.03, v.entrada);
  // Los puños de la camisa: dos clics finos.
  soplo(m, v, pie + 0.25, 'bandpass', 3800, 6, 0.0005, 0.12 * o.fuerza, 0.008, v.entrada);
  fin = Math.max(fin, soplo(m, v, pie + 0.34, 'bandpass', 4100, 6, 0.0005, 0.1 * o.fuerza, 0.008, v.entrada));
  return fin;
}

function hacerTrasvase(m: MotorDelSonido, v: Voz, o: Resueltas): number {
  const t = o.t;
  const dur = 0.6;
  // Un zumbido que se abre y tiembla cada vez más deprisa: el Prestado se vacía en el Celador.
  const g = ganancia(m, v, v.entrada);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.3 * o.fuerza, t + 0.1);
  g.gain.setValueAtTime(0.3 * o.fuerza, t + dur - 0.05);
  g.gain.linearRampToValueAtTime(0, t + dur);
  const temblor = ganancia(m, v, g, 0.6);
  const lfo = oscilador(m, v, 'sine', 8, t, t + dur, ganancia(m, v, temblor.gain, 0.4));
  lfo.frequency.linearRampToValueAtTime(22, t + dur);
  const abre = filtro(m, v, 'lowpass', 300, 2, temblor);
  barrido(abre.frequency, t, 300, 2200, dur);
  oscilador(m, v, 'sawtooth', 110, t, t + dur + 0.01, abre);
  oscilador(m, v, 'sawtooth', 110.8, t, t + dur + 0.01, abre);
  // La succión del final.
  const gs = ganancia(m, v, v.entrada);
  gs.gain.setValueAtTime(0, t);
  gs.gain.linearRampToValueAtTime(0.3 * o.fuerza, t + dur - 0.08);
  gs.gain.linearRampToValueAtTime(0, t + dur);
  const chupa = filtro(m, v, 'bandpass', 2500, 1.5, gs);
  barrido(chupa.frequency, t, 2500, 400, dur);
  ruidoEn(m, v, 'rosa', t, t + dur + 0.01, chupa);
  return t + dur + 0.01;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// El tirador: disparo, bala, apuntado
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

function hacerDisparo(m: MotorDelSonido, v: Voz, o: Resueltas): number {
  const t = o.t;
  const f = o.fuerza;
  // Una pistola con silenciador de glifos: el «puf», un zap que cae y la corredera.
  soplo(m, v, t, 'bandpass', 900, 0.7, 0.0005, 0.8 * f, 0.03, v.entrada);
  sordo(m, v, t, 150, 60, 0.04, 0.5 * f, 0.06, v.entrada);
  const g = ganancia(m, v, v.entrada);
  const finZap = envolvente(g.gain, t, 0.001, 0.18 * f, 0.06);
  const zap = oscilador(m, v, 'square', 1400, t, finZap + 0.01, filtro(m, v, 'lowpass', 3000, 0.7, g));
  barrido(zap.frequency, t, 1400, 280, 0.05);
  const fin = soplo(m, v, t + 0.05, 'highpass', 3000, 0.7, 0.0005, 0.15 * f, 0.01, v.entrada);
  return Math.max(fin, finZap);
}

function hacerBala(m: MotorDelSonido, v: Voz, o: Resueltas): number {
  const t = o.t;
  const dur = o.duracionS;
  // Una bala lenta (20 m/s, diseño §4.6): un zumbido que gira. Suena mientras vuela; el juego la mueve.
  const g = ganancia(m, v, v.entrada);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.22 * o.fuerza, t + 0.03);
  g.gain.setValueAtTime(0.22 * o.fuerza, t + dur - 0.05);
  g.gain.linearRampToValueAtTime(0, t + dur);
  const giro = ganancia(m, v, g, 0.65);
  oscilador(m, v, 'sine', 34, t, t + dur, ganancia(m, v, giro.gain, 0.35));
  const pasa = filtro(m, v, 'bandpass', 1300, 2, giro);
  oscilador(m, v, 'sawtooth', 190, t, t + dur, pasa);
  ruidoEn(m, v, 'blanco', t, t + dur, ganancia(m, v, pasa, 0.5));
  return t + dur;
}

function hacerApuntado(m: MotorDelSonido, v: Voz, o: Resueltas): number {
  const t = o.t;
  const dur = o.duracionS;
  // La línea de glifos que apunta (12 tics, diseño §4.6): un gemido que sube y tiembla cada vez más.
  const g = ganancia(m, v, v.entrada);
  g.gain.setValueAtTime(0.05 * o.fuerza, t);
  g.gain.linearRampToValueAtTime(0.3 * o.fuerza, t + dur);
  g.gain.linearRampToValueAtTime(0, t + dur + 0.01);
  const temblor = ganancia(m, v, g, 0.6);
  const lfo = oscilador(m, v, 'sine', 10, t, t + dur, ganancia(m, v, temblor.gain, 0.4));
  lfo.frequency.exponentialRampToValueAtTime(30, t + dur);
  const gemido = oscilador(m, v, 'sine', 300, t, t + dur + 0.01, temblor);
  barrido(gemido.frequency, t, 300, 1200, dur);
  const doble = oscilador(m, v, 'triangle', 600, t, t + dur + 0.01, ganancia(m, v, temblor, 0.15));
  barrido(doble.frequency, t, 600, 2400, dur);
  // El clic de «fijado».
  return Math.max(t + dur + 0.01, soplo(m, v, t + dur, 'bandpass', 3500, 5, 0.0005, 0.25 * o.fuerza, 0.01, v.entrada));
}

function hacerAviso(m: MotorDelSonido, v: Voz, o: Resueltas): number {
  const t = o.t;
  // Mi 6 → La 6: dos notas cortas y redondas. Se oye en cualquier sitio y no se confunde con nada.
  const suave = filtro(m, v, 'lowpass', 2600, 0.7, v.entrada);
  tono(m, v, t, frecuencia(88), 0.15 * o.fuerza, 0.07, suave, 'square');
  return tono(m, v, t + 0.08, frecuencia(93), 0.15 * o.fuerza, 0.12, suave, 'square');
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// Ambiente suelto: palomas, farolas; y el latido del Remanso
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

function hacerPalomas(m: MotorDelSonido, v: Voz, o: Resueltas): number {
  const variante = Math.floor(m.azar() * 2);
  const b = m.bufer(`palomas-${variante}`, (sr) => aleteo(sr, 307 + variante));
  bufer(m, v, b, o.t, ganancia(m, v, v.entrada, 0.75 * o.fuerza));
  return o.t + b.duration;
}

function hacerFarola(m: MotorDelSonido, v: Voz, o: Resueltas): number {
  const t = o.t;
  // Una farola de sodio que parpadea: zumbido de 100 Hz (la red de 50 Hz, dos veces por ciclo) a golpes.
  const g = ganancia(m, v, v.entrada);
  let cuando = t;
  let encendida = true;
  while (cuando < t + 0.8) {
    const tramo = 0.03 + m.azar() * 0.06;
    g.gain.setValueAtTime(encendida ? 0.13 * o.fuerza : 0, cuando);
    if (encendida) soplo(m, v, cuando, 'highpass', 4000, 0.7, 0.0003, 0.1 * o.fuerza, 0.004, v.entrada);
    cuando += tramo;
    encendida = !encendida;
  }
  g.gain.setValueAtTime(0, cuando);
  const zumbido = filtro(m, v, 'bandpass', 200, 1.5, g);
  oscilador(m, v, 'sawtooth', 100, t, cuando + 0.01, zumbido);
  return cuando + 0.01;
}

function hacerLatido(m: MotorDelSonido, v: Voz, o: Resueltas): number {
  const t = o.t;
  // Lub-dub: dos golpes graves, el segundo más flojo. Con un soplo sordo para que se oiga en un teléfono.
  sordo(m, v, t, 62, 42, 0.09, 0.9 * o.fuerza, 0.12, v.entrada);
  soplo(m, v, t, 'lowpass', 300, 0.7, 0.004, 0.35 * o.fuerza, 0.08, v.entrada);
  const fin = sordo(m, v, t + 0.18, 54, 40, 0.09, 0.6 * o.fuerza, 0.12, v.entrada);
  soplo(m, v, t + 0.18, 'lowpass', 280, 0.7, 0.004, 0.25 * o.fuerza, 0.07, v.entrada);
  return fin;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// El recetario
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

const fijo = (s: number) => (): number => s;

export const RECETAS: Readonly<Record<IdDeSonido, Receta>> = {
  aire: { categoria: 'efectos', camino: 'mundo', alcance: 'golpe', reverberacion: 0.06, tope: 8, duracion: (o) => AIRE_S[o.golpe], hacer: hacerAire },
  impacto: { categoria: 'efectos', camino: 'mundo', alcance: 'golpe', reverberacion: 0.22, tope: 8, duracion: fijo(0.5), hacer: hacerImpacto },
  guardia: { categoria: 'efectos', camino: 'mundo', alcance: 'golpe', reverberacion: 0.2, tope: 6, duracion: fijo(0.2), hacer: hacerGuardia },
  cuerpo: { categoria: 'efectos', camino: 'mundo', alcance: 'golpe', reverberacion: 0.12, tope: 8, duracion: fijo(0.2), hacer: hacerCuerpo },
  derribo: { categoria: 'efectos', camino: 'mundo', alcance: 'golpe', reverberacion: 0.25, tope: 6, duracion: fijo(0.6), hacer: hacerDerribo },
  cristal: { categoria: 'efectos', camino: 'mundo', alcance: 'golpe', reverberacion: 0.3, tope: 3, duracion: fijo(1.3), hacer: hacerCristal },
  estampado: { categoria: 'efectos', camino: 'mundo', alcance: 'golpe', reverberacion: 0.3, tope: 4, duracion: fijo(1.4), hacer: hacerEstampado },
  quiebro: { categoria: 'efectos', camino: 'mundo', alcance: 'golpe', reverberacion: 0.08, tope: 6, duracion: fijo(0.2), hacer: hacerQuiebro },
  'quiebro-torpe': { categoria: 'efectos', camino: 'mundo', alcance: 'golpe', reverberacion: 0.08, tope: 6, duracion: fijo(0.15), hacer: hacerQuiebroTorpe },
  'quiebro-limpio': { categoria: 'efectos', camino: 'claro', alcance: 'golpe', reverberacion: 0.45, tope: 3, duracion: fijo(0.95), hacer: hacerQuiebroLimpio },
  replica: { categoria: 'efectos', camino: 'mundo', alcance: 'golpe', reverberacion: 0.35, tope: 4, duracion: fijo(0.9), hacer: hacerReplica },
  paso: { categoria: 'ambiente', camino: 'mundo', alcance: 'paso', reverberacion: 0.1, tope: 10, duracion: fijo(0.13), hacer: hacerPaso },
  esquirla: { categoria: 'efectos', camino: 'claro', alcance: 'golpe', reverberacion: 0.3, tope: 6, duracion: fijo(0.5), hacer: hacerEsquirla },
  moneda: { categoria: 'efectos', camino: 'claro', alcance: 'golpe', reverberacion: 0.2, tope: 3, duracion: fijo(0.35), hacer: hacerMoneda },
  descolgar: { categoria: 'senales', camino: 'claro', alcance: 'golpe', reverberacion: 0.15, tope: 2, duracion: fijo(0.6), hacer: hacerDescolgar },
  salida: { categoria: 'efectos', camino: 'claro', alcance: 'golpe', reverberacion: 0.5, tope: 3, duracion: fijo(1.25), hacer: hacerSalida },
  desalojo: { categoria: 'efectos', camino: 'mundo', alcance: 'golpe', reverberacion: 0.35, tope: 3, duracion: fijo(1.4), hacer: hacerDesalojo },
  impresion: { categoria: 'efectos', camino: 'mundo', alcance: 'golpe', reverberacion: 0.3, tope: 4, duracion: fijo(1.5), hacer: hacerImpresion },
  trasvase: { categoria: 'efectos', camino: 'mundo', alcance: 'golpe', reverberacion: 0.25, tope: 3, duracion: fijo(0.62), hacer: hacerTrasvase },
  disparo: { categoria: 'efectos', camino: 'mundo', alcance: 'golpe', reverberacion: 0.3, tope: 6, duracion: fijo(0.1), hacer: hacerDisparo },
  bala: { categoria: 'senales', camino: 'claro', alcance: 'senal', reverberacion: 0, tope: 12, duracion: (o) => o.duracionS, hacer: hacerBala },
  apuntado: { categoria: 'senales', camino: 'claro', alcance: 'senal', reverberacion: 0.05, tope: 4, duracion: (o) => o.duracionS + 0.02, hacer: hacerApuntado },
  aviso: { categoria: 'senales', camino: 'claro', alcance: 'senal', reverberacion: 0.1, tope: 3, duracion: fijo(0.22), hacer: hacerAviso },
  palomas: { categoria: 'ambiente', camino: 'mundo', alcance: 'golpe', reverberacion: 0.25, tope: 2, duracion: fijo(1.6), hacer: hacerPalomas },
  farola: { categoria: 'ambiente', camino: 'mundo', alcance: 'golpe', reverberacion: 0.1, tope: 4, duracion: fijo(0.9), hacer: hacerFarola },
  latido: { categoria: 'efectos', camino: 'claro', alcance: 'golpe', reverberacion: 0, tope: 2, duracion: fijo(0.32), hacer: hacerLatido },
};

/** Duración por defecto de lo que dura, si el juego no la da: la bala a 15 m, el apuntado de 12 tics. */
const DURACION_POR_DEFECTO_S: Partial<Record<IdDeSonido, number>> = { bala: 0.75, apuntado: 0.6 };

/**
 * TOCA UN SONIDO del recetario. `acento` es la altura del acento «a compás» si toca (la calcula quien
 * lleva la música). Devuelve un manejo para moverlo o cortarlo.
 */
export function tocar(m: MotorDelSonido, id: IdDeSonido, opciones: OpcionesDeSonido, t: number, acento: number | null): ManejoDeSonido {
  const receta = RECETAS[id];
  const fuerza = Math.max(0, Math.min(1.2, opciones.fuerza ?? 1));
  const duracionS = Math.max(0.05, (opciones.duracionMs ?? (DURACION_POR_DEFECTO_S[id] ?? 0) * 1000) / 1000);
  const resueltas: Resueltas = {
    t,
    fuerza,
    golpe: opciones.golpe ?? 'entrada',
    material: opciones.material ?? 'chapa',
    cuenta: opciones.cuenta ?? 1,
    duracionS,
    acento: opciones.aCompas === true ? acento : null,
  };
  if (!m.admitir(id, receta.tope, t + receta.duracion(resueltas))) return MANEJO_INERTE;
  const posicion = opciones.posicion ?? null;
  const v = m.voz({
    categoria: receta.categoria,
    camino: receta.camino,
    posicion,
    alcance: receta.alcance,
    reverberacion: receta.reverberacion,
    t,
  });
  const fin = receta.hacer(m, v, resueltas);
  if (receta.categoria === 'senales' && id !== 'descolgar') m.agachar(t, fin);
  v.terminar(fin);
  let donde = posicion;
  // Sólo lo que dura lo bastante como para que el oyente se mueva mientras suena sigue al oyente.
  const dejarDeSeguir = v.aire !== null && fin - t > 0.4 ? m.seguir(() => donde, v.aire, fin) : null;
  return {
    parar(): void {
      const ahora = m.ctx.currentTime;
      v.entrada.gain.cancelScheduledValues(ahora);
      v.entrada.gain.setTargetAtTime(0, ahora, 0.015);
      dejarDeSeguir?.();
    },
    mover(p: Punto3): void {
      if (v.panoramizador === null) return;
      donde = p;
      const ahora = m.ctx.currentTime;
      colocar(v.panoramizador, p, ahora, 0.03);
      v.aire?.frequency.setTargetAtTime(corteDelAire(distancia(p, m.oyente())), ahora, 0.05);
    },
  };
}
