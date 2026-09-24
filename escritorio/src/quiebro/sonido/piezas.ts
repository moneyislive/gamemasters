/**
 * LAS PIEZAS CON QUE SE FABRICA CADA SONIDO: ganancias, filtros, osciladores, ruido y envolventes.
 *
 * ═══ POR QUÉ UN FICHERO SÓLO PARA ESTO ═══
 *
 * Los golpes (`voces.ts`), la música (`musica.ts`), la ciudad (`ambiente.ts`) y el silbido
 * (`anillo.ts`) se fabrican con los mismos ladrillos, y cada ladrillo tiene una trampa que sólo se
 * cae una vez: una envolvente exponencial que intenta llegar a cero (lanza una excepción: es un
 * logaritmo), un oscilador que no se enchufa al tono del mundo y por eso no baja con el Remanso, un
 * nodo que no se apunta en la voz y se queda colgado del bus para siempre. Escritos una vez aquí,
 * cada trampa se cae una vez.
 *
 * Todo lo que se crea se apunta en `v.nodos`, para que el motor lo desconecte al acabar la voz, y todo
 * oscilador o búfer se enchufa a `tonoDelMundo` si la voz es del mundo (ver `motor.ts`).
 */
import type { MotorDelSonido, Voz } from './motor';

/**
 * Una ganancia apuntada en la voz, que arranca en 0 (las envolventes la suben). El destino puede ser
 * un parámetro: así se hacen los trémolos (un oscilador lento que mueve la ganancia de otro nodo).
 */
export function ganancia(m: MotorDelSonido, v: Voz, destino: AudioNode | AudioParam, valor = 0): GainNode {
  const g = m.ctx.createGain();
  g.gain.value = valor;
  if (destino instanceof AudioParam) g.connect(destino);
  else g.connect(destino);
  v.nodos.push(g);
  return g;
}

export function filtro(m: MotorDelSonido, v: Voz, tipo: BiquadFilterType, hz: number, q: number, destino: AudioNode): BiquadFilterNode {
  const f = m.ctx.createBiquadFilter();
  f.type = tipo;
  f.frequency.value = hz;
  f.Q.value = q;
  f.connect(destino);
  v.nodos.push(f);
  return f;
}

export function oscilador(m: MotorDelSonido, v: Voz, tipo: OscillatorType, hz: number, t: number, fin: number, destino: AudioNode): OscillatorNode {
  const o = m.ctx.createOscillator();
  o.type = tipo;
  o.frequency.setValueAtTime(hz, t);
  o.connect(destino);
  m.afinar(v, o.detune);
  o.start(t);
  o.stop(fin);
  v.nodos.push(o);
  return o;
}

/** Ruido de color desde un punto al azar de su búfer (dos golpes seguidos no suenan idénticos). */
export function ruidoEn(m: MotorDelSonido, v: Voz, color: 'blanco' | 'rosa' | 'marron', t: number, fin: number, destino: AudioNode): AudioBufferSourceNode {
  const s = m.ctx.createBufferSource();
  s.buffer = m.ruido(color);
  s.loop = true;
  s.connect(destino);
  m.afinar(v, s.detune);
  s.start(t, m.azar() * 1.8);
  s.stop(fin);
  v.nodos.push(s);
  return s;
}

export function bufer(m: MotorDelSonido, v: Voz, b: AudioBuffer, t: number, destino: AudioNode, velocidad = 1): AudioBufferSourceNode {
  const s = m.ctx.createBufferSource();
  s.buffer = b;
  s.playbackRate.value = velocidad;
  s.connect(destino);
  m.afinar(v, s.detune);
  s.start(t);
  v.nodos.push(s);
  return s;
}

/**
 * Sube en `ataque` a `pico` y cae exponencialmente en `caida`. Devuelve el final. La caída
 * exponencial no puede llegar a cero (es un logaritmo), así que acaba en −80 dB y se remata a cero.
 */
export function envolvente(p: AudioParam, t: number, ataque: number, pico: number, caida: number): number {
  const cima = Math.max(pico, 0.0002);
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(cima, t + ataque);
  p.exponentialRampToValueAtTime(0.0001, t + ataque + caida);
  p.linearRampToValueAtTime(0, t + ataque + caida + 0.005);
  return t + ataque + caida + 0.005;
}

/** Un barrido exponencial de frecuencia (lo que hace sonar «golpe» a un seno que cae). */
export function barrido(p: AudioParam, t: number, desde: number, hasta: number, duracion: number): void {
  p.setValueAtTime(Math.max(1, desde), t);
  p.exponentialRampToValueAtTime(Math.max(1, hasta), t + Math.max(0.001, duracion));
}

const CURVAS = new Map<string, Float32Array<ArrayBuffer>>();

/** Saturación suave (tanh): da mordida a un seno grave sin que suene a distorsión de guitarra. */
export function saturador(m: MotorDelSonido, v: Voz, cantidad: number, destino: AudioNode): WaveShaperNode {
  const clave = `sat-${cantidad}`;
  let curva = CURVAS.get(clave);
  if (curva === undefined) {
    curva = new Float32Array(1024);
    const norma = Math.tanh(cantidad);
    for (let i = 0; i < curva.length; i++) {
      const x = (i / (curva.length - 1)) * 2 - 1;
      curva[i] = Math.tanh(cantidad * x) / norma;
    }
    CURVAS.set(clave, curva);
  }
  const s = m.ctx.createWaveShaper();
  s.curve = curva;
  s.oversample = '2x';
  s.connect(destino);
  v.nodos.push(s);
  return s;
}

/** Escalones (reducción de bits): el ruido «digital» de la Grafía. */
export function escalonador(m: MotorDelSonido, v: Voz, niveles: number, destino: AudioNode): WaveShaperNode {
  const clave = `esc-${niveles}`;
  let curva = CURVAS.get(clave);
  if (curva === undefined) {
    curva = new Float32Array(2048);
    for (let i = 0; i < curva.length; i++) {
      const x = (i / (curva.length - 1)) * 2 - 1;
      curva[i] = Math.round(x * niveles) / niveles;
    }
    CURVAS.set(clave, curva);
  }
  const s = m.ctx.createWaveShaper();
  s.curve = curva;
  s.connect(destino);
  v.nodos.push(s);
  return s;
}

/** Un seno que cae de tono con envolvente: el ladrillo de todo golpe con cuerpo. */
export function sordo(m: MotorDelSonido, v: Voz, t: number, desdeHz: number, hastaHz: number, barridoS: number, pico: number, caida: number, destino: AudioNode): number {
  const g = ganancia(m, v, destino);
  const fin = envolvente(g.gain, t, 0.002, pico, caida);
  const o = oscilador(m, v, 'sine', desdeHz, t, fin + 0.01, g);
  barrido(o.frequency, t, desdeHz, hastaHz, barridoS);
  return fin;
}

/** Un golpe de ruido filtrado con envolvente. */
export function soplo(
  m: MotorDelSonido,
  v: Voz,
  t: number,
  tipo: BiquadFilterType,
  hz: number,
  q: number,
  ataque: number,
  pico: number,
  caida: number,
  destino: AudioNode,
  color: 'blanco' | 'rosa' = 'blanco',
): number {
  const g = ganancia(m, v, destino);
  const fin = envolvente(g.gain, t, ataque, pico, caida);
  const f = filtro(m, v, tipo, hz, q, g);
  ruidoEn(m, v, color, t, fin + 0.01, f);
  return fin;
}

/** Un parcial de campana: un seno con caída. */
export function tono(m: MotorDelSonido, v: Voz, t: number, hz: number, pico: number, caida: number, destino: AudioNode, forma: OscillatorType = 'sine'): number {
  const g = ganancia(m, v, destino);
  const fin = envolvente(g.gain, t, 0.002, pico, caida);
  oscilador(m, v, forma, hz, t, fin + 0.01, g);
  return fin;
}
