/**
 * LA MÚSICA: el planificador con anticipación y los instrumentos (diseño §9, punto 7: «música a 120
 * ppm en 3 capas; base; percusión que entra con la racha; melodía en la Llamada. El pulso es el que
 * marca "a compás"»).
 *
 * ═══ LA REJILLA NO SE MUEVE NUNCA ═══
 *
 * La rejilla (dónde cae la semicorchea 0 en el reloj del audio) se fija la primera vez que el contexto
 * corre y ya no cambia en toda la noche, suene música o no. La música entra y sale POR ENCIMA de la
 * rejilla, cuadrada a compás; el pulso sigue ahí aunque la música esté callada o con el volumen a
 * cero. Eso es lo que permite que el «a compás» (diseño §4.5) se juzgue igual con la música apagada:
 * el jugador que la silencia sigue teniendo el pulso en el HUD y en el tic-tac de la base, y el que
 * la escucha no ve saltar el compás cuando la Llamada cambia de capas.
 *
 * ═══ CUÁNDO ENTRA UN CAMBIO ═══
 *
 * Un cambio de MODO (calma → combate → Llamada) entra en el compás siguiente: cambiar de canción a
 * mitad de compás suena a error. Un cambio de RACHA (entra o sale percusión) entra en el pulso
 * siguiente: la racha es la recompensa del quiebro limpio, y esperar hasta dos segundos a oírla la
 * desconectaría del gesto que la ganó.
 *
 * ═══ LOS INSTRUMENTOS ═══
 *
 * Todos de síntesis, todos enchufados al tono del mundo (en el Remanso la música baja una octava,
 * como una cinta que se frena, sin perder el tempo: el pulso es sagrado). El bajo y la voz son dientes
 * de sierra con filtro; el colchón, sierras desafinadas que «bombean» en cada pulso; la cuerda,
 * Karplus-Strong calculado en `sintesis.ts` (tres búferes, un La por octava, y el resto de notas con
 * `playbackRate`); la percusión, ruido y senos. El reloj de la base es un chasquido de madera agudo:
 * se oye en el altavoz de un teléfono, que no da ni un grave.
 */
import { fronteraSiguiente, planificar, pulsoDeLaRejilla, pasoEn, rejillaNueva, TEMPO } from './cuentas';
import type { Pulso, Rejilla } from './cuentas';
import { capasDe, frecuencia, notaDeAcento, notasDelPaso } from './partitura';
import type { Capas, ModoDeLaMusica, Nota } from './partitura';
import type { MotorDelSonido, Voz } from './motor';
import { barrido, envolvente, filtro, ganancia, oscilador, soplo } from './piezas';
import { cuerdaPulsada } from './sintesis';

export interface EstadoDeLaMusica {
  readonly modo: ModoDeLaMusica;
  /** Limpios seguidos sin recibir daño (diseño §4.7). Mete percusión con 1, 3 y 6. */
  readonly racha?: number;
}

/** Cuánto se programa por delante. Más que el hueco más largo del temporizador en un móvil ocupado. */
export const ANTICIPACION_S = 0.15;

interface Cambio {
  readonly desde: number;
  readonly capas: Capas;
}

function igualesCapas(a: Capas, b: Capas): boolean {
  return a.base === b.base && a.percusion === b.percusion && a.melodia === b.melodia;
}

/** Los La de las cuerdas: cada nota se toca con el búfer más cercano, a menos de media octava. */
const BASES_DE_CUERDA = [110, 220, 440] as const;

export class MusicaDelQuiebro {
  private readonly m: MotorDelSonido;
  private rejilla: Rejilla | null = null;
  private siguiente = 0;
  private vigentes: Capas = capasDe('callada', 0);
  private cambios: Cambio[] = [];
  private estado: EstadoDeLaMusica = { modo: 'callada', racha: 0 };
  private pendiente: Capas | null = null;
  private saltados = 0;
  private readonly salida: GainNode;
  private readonly eco: GainNode;
  private readonly calle: GainNode;
  /** Un instante (ms de `performance.now()`) en que cae un pulso: la rejilla se cuadra a él. */
  private readonly anclaMs: number;

  constructor(m: MotorDelSonido, anclaMs: number) {
    this.m = m;
    this.anclaMs = anclaMs;
    const ctx = m.ctx;
    this.salida = ctx.createGain();
    this.salida.gain.value = 0.8;
    this.salida.connect(m.bus('musica', 'mundo'));
    this.calle = ctx.createGain();
    this.calle.gain.value = 1;
    this.calle.connect(m.envio);
    /*
     * El eco de ida y vuelta, a corchea con puntillo (375 ms): primero a un lado, luego al otro, cada
     * vez más oscuro. Es el eco de la voz y la cuerda en la Llamada, el que hace que una melodía de
     * cuatro notas llene una calle.
     */
    this.eco = ctx.createGain();
    const izquierda = ctx.createDelay(1);
    const derecha = ctx.createDelay(1);
    izquierda.delayTime.value = 0.375;
    derecha.delayTime.value = 0.375;
    const vueltaI = ctx.createGain();
    const vueltaD = ctx.createGain();
    vueltaI.gain.value = 0.32;
    vueltaD.gain.value = 0.32;
    const oscuro = ctx.createBiquadFilter();
    oscuro.type = 'lowpass';
    oscuro.frequency.value = 3000;
    const juntar = ctx.createChannelMerger(2);
    const nivelDelEco = ctx.createGain();
    nivelDelEco.gain.value = 0.5;
    this.eco.connect(oscuro);
    oscuro.connect(izquierda);
    izquierda.connect(vueltaI);
    vueltaI.connect(derecha);
    derecha.connect(vueltaD);
    vueltaD.connect(izquierda);
    izquierda.connect(juntar, 0, 0);
    derecha.connect(juntar, 0, 1);
    juntar.connect(nivelDelEco);
    nivelDelEco.connect(this.salida);
    m.alTic((ahora) => this.tic(ahora));
  }

  /** Cambia la música. Entra a compás o a pulso según el cambio (ver la cabecera). */
  poner(e: EstadoDeLaMusica): void {
    const capas = capasDe(e.modo, e.racha ?? 0);
    const cambiaElModo = e.modo !== this.estado.modo;
    this.estado = { modo: e.modo, racha: e.racha ?? 0 };
    const ultima = this.cambios[this.cambios.length - 1]?.capas ?? this.pendiente ?? this.vigentes;
    if (igualesCapas(capas, ultima)) return;
    if (this.rejilla === null) {
      // Sin rejilla todavía (el contexto no ha corrido): se aplica al arrancar.
      this.pendiente = capas;
      return;
    }
    const cuando = this.m.ahora() + ANTICIPACION_S;
    const desde = fronteraSiguiente(this.rejilla, cuando, cambiaElModo ? TEMPO.pasosPorPulso * TEMPO.pulsosPorCompas : TEMPO.pasosPorPulso);
    // Un cambio nuevo manda sobre los que aún no han entrado y caerían después.
    this.cambios = this.cambios.filter((c) => c.desde < desde);
    this.cambios.push({ desde, capas });
  }

  actual(): EstadoDeLaMusica {
    return this.estado;
  }

  /**
   * El pulso, tal como se OYE, en ms de `performance.now()`. Antes de que corra el audio, el del ancla:
   * la rejilla se cuadrará a él al arrancar, así que no hay salto de fase.
   */
  pulso(): Pulso {
    const periodoMs = 60000 / TEMPO.bpm;
    const provisional: Pulso = { bpm: TEMPO.bpm, periodoMs, origenMs: this.anclaMs };
    if (this.rejilla === null) return provisional;
    const p = pulsoDeLaRejilla(this.rejilla, this.m.relojActual());
    // La música va por el mundo: se oye con la latencia de su camino (el compresor mira por delante).
    return p === null ? provisional : { ...p, origenMs: p.origenMs + this.m.latencia('mundo') * 1000 };
  }

  /** La nota del acento «a compás» en el instante `tS` del contexto. */
  acentoEn(tS: number): number {
    return notaDeAcento(this.rejilla === null ? 0 : Math.max(0, pasoEn(this.rejilla, tS)));
  }

  /** Pasos que se saltó el planificador por llegar tarde (diagnóstico: tiene que ser 0 casi siempre). */
  pasosSaltados(): number {
    return this.saltados;
  }

  private capasDelPaso(paso: number): Capas {
    while (this.cambios.length > 0 && (this.cambios[0]?.desde ?? Infinity) <= paso) {
      const c = this.cambios.shift();
      if (c !== undefined) this.vigentes = c.capas;
    }
    return this.vigentes;
  }

  private tic(ahora: number): void {
    if (this.rejilla === null) {
      /*
       * La rejilla nace cuadrada al ancla: el primer paso cae en el primer pulso del ancla que queda a
       * más de 100 ms. Sin medida del reloj todavía, se espera al tic siguiente.
       */
      const tAncla = this.m.aContexto(this.anclaMs, 'mundo');
      if (tAncla === null) return;
      const periodoS = 60 / TEMPO.bpm;
      const k = Math.ceil((ahora + 0.1 - tAncla) / periodoS);
      this.rejilla = rejillaNueva(tAncla + k * periodoS);
      this.siguiente = 0;
      if (this.pendiente !== null) {
        this.vigentes = this.pendiente;
        this.pendiente = null;
      }
    }
    const plan = planificar(this.rejilla, this.siguiente, ahora, ANTICIPACION_S);
    this.saltados += plan.saltados;
    this.siguiente = plan.siguiente;
    for (const { paso, t } of plan.pasos) {
      const capas = this.capasDelPaso(paso);
      for (const nota of notasDelPaso(paso, capas)) this.tocar(nota, Math.max(t, ahora), this.rejilla.pasoS);
    }
  }

  /**
   * Una voz de la música. El motor la engancha al bus de la música; aquí se reengancha a la salida
   * propia, que es la que junta lo seco con el eco de ida y vuelta, y se le añaden los dos envíos.
   */
  private voz(t: number, eco = 0, calle = 0): Voz {
    const m = this.m;
    const v = m.voz({ categoria: 'musica', camino: 'mundo', t });
    v.entrada.disconnect();
    v.entrada.connect(this.salida);
    for (const [nivel, destino] of [
      [eco, this.eco],
      [calle, this.calle],
    ] as const) {
      if (nivel <= 0) continue;
      const envio = m.ctx.createGain();
      envio.gain.value = nivel;
      v.entrada.connect(envio);
      envio.connect(destino);
      v.nodos.push(envio);
    }
    return v;
  }

  private tocar(nota: Nota, t: number, pasoS: number): void {
    const m = this.m;
    const dur = nota.pasos * pasoS;
    const f = nota.fuerza;
    switch (nota.instrumento) {
      case 'tic':
      case 'tac': {
        const v = this.voz(t);
        const agudo = nota.instrumento === 'tic';
        soplo(m, v, t, 'bandpass', agudo ? 3400 : 2500, 9, 0.0005, 0.5 * f, 0.03, v.entrada);
        v.terminar(tonoCorto(m, v, t, agudo ? 1700 : 1250, 0.12 * f, 0.02, 'triangle'));
        return;
      }
      case 'bajo': {
        const v = this.voz(t);
        const hz = frecuencia(nota.alturas[0] ?? 45);
        const g = ganancia(m, v, v.entrada);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.3 * f, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.15 * f, t + dur * 0.6);
        g.gain.linearRampToValueAtTime(0, t + dur + 0.05);
        const corte = filtro(m, v, 'lowpass', 2000, 5, g);
        barrido(corte.frequency, t, 900 + 1100 * f, 360, 0.14);
        oscilador(m, v, 'sawtooth', hz, t, t + dur + 0.06, corte);
        const cuadrada = oscilador(m, v, 'square', hz, t, t + dur + 0.06, ganancia(m, v, corte, 0.5));
        cuadrada.detune.value = -8;
        v.terminar(t + dur + 0.06);
        return;
      }
      case 'colchon': {
        const v = this.voz(t, 0, 0.4);
        const bombeo = ganancia(m, v, v.entrada, 1);
        // El bombeo: el colchón se hunde en cada pulso y vuelve. Marca el pulso sin un solo golpe.
        for (let k = 0; k * TEMPO.pasosPorPulso < nota.pasos; k++) {
          const tk = t + k * TEMPO.pasosPorPulso * pasoS;
          bombeo.gain.setValueAtTime(0.45, tk);
          bombeo.gain.linearRampToValueAtTime(1, tk + 0.3);
        }
        const suave = filtro(m, v, 'lowpass', 1200, 0.6, bombeo);
        const g = ganancia(m, v, suave);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.055 * f, t + 0.25);
        g.gain.setValueAtTime(0.055 * f, t + dur);
        g.gain.linearRampToValueAtTime(0, t + dur + 0.5);
        for (const altura of nota.alturas) {
          const hz = frecuencia(altura);
          for (const desafino of [-7, 7]) {
            const o = oscilador(m, v, 'sawtooth', hz, t, t + dur + 0.52, g);
            o.detune.value = desafino;
          }
        }
        v.terminar(t + dur + 0.52);
        return;
      }
      case 'bombo': {
        const v = this.voz(t);
        const g = ganancia(m, v, v.entrada);
        const fin = envolvente(g.gain, t, 0.002, 0.95 * f, 0.32);
        const o = oscilador(m, v, 'sine', 150, t, fin + 0.01, g);
        barrido(o.frequency, t, 150, 46, 0.09);
        soplo(m, v, t, 'highpass', 3000, 0.7, 0.0003, 0.25 * f, 0.004, v.entrada);
        // El «toc» de un tercio de octava más arriba: lo que se oye del bombo en un teléfono.
        const toc = ganancia(m, v, v.entrada);
        const finToc = envolvente(toc.gain, t, 0.001, 0.25 * f, 0.04);
        const t2 = oscilador(m, v, 'triangle', 320, t, finToc + 0.01, toc);
        barrido(t2.frequency, t, 320, 160, 0.03);
        v.terminar(fin);
        return;
      }
      case 'palmada': {
        const v = this.voz(t, 0, 0.35);
        // Tres palmas en 17 ms: una palmada de caja de ritmos, que es un puñado de manos a la vez.
        soplo(m, v, t, 'bandpass', 1500, 0.9, 0.001, 0.5 * f, 0.012, v.entrada);
        soplo(m, v, t + 0.008, 'bandpass', 1500, 0.9, 0.001, 0.4 * f, 0.012, v.entrada);
        const fin = soplo(m, v, t + 0.017, 'bandpass', 1500, 0.9, 0.001, 0.6 * f, 0.12, v.entrada);
        tonoCorto(m, v, t, 190, 0.2 * f, 0.06, 'triangle');
        v.terminar(fin);
        return;
      }
      case 'charles':
      case 'charles-abierto': {
        const v = this.voz(t);
        v.terminar(soplo(m, v, t, 'highpass', 7500, 0.7, 0.0005, 0.22 * f, nota.instrumento === 'charles' ? 0.035 : 0.2, v.entrada));
        return;
      }
      case 'palmas': {
        const v = this.voz(t, 0, 0.4);
        // Palmas flamencas: más agudas y secas que la palmada, dos manos casi juntas.
        soplo(m, v, t, 'bandpass', 2300, 1.3, 0.0005, 0.45 * f, 0.06, v.entrada);
        v.terminar(soplo(m, v, t + 0.006, 'bandpass', 2500, 1.3, 0.0005, 0.35 * f, 0.06, v.entrada));
        return;
      }
      case 'cuerda': {
        const v = this.voz(t, 0.3, 0.2);
        const hz = frecuencia(nota.alturas[0] ?? 57);
        const base = BASES_DE_CUERDA.reduce((mejor, b) => (Math.abs(Math.log2(hz / b)) < Math.abs(Math.log2(hz / mejor)) ? b : mejor), BASES_DE_CUERDA[0]);
        const b = m.bufer(`cuerda-${base}`, (sr) => cuerdaPulsada(sr, base, 2.2, base));
        const g = ganancia(m, v, v.entrada);
        g.gain.setValueAtTime(0.35 * f, t);
        g.gain.setValueAtTime(0.35 * f, t + dur + 0.25);
        g.gain.linearRampToValueAtTime(0, t + dur + 0.35);
        const s = m.ctx.createBufferSource();
        s.buffer = b;
        s.playbackRate.value = hz / base;
        s.connect(filtro(m, v, 'lowpass', 3800, 0.6, g));
        m.afinar(v, s.detune);
        s.start(t);
        s.stop(t + dur + 0.36);
        v.nodos.push(s);
        v.terminar(t + dur + 0.36);
        return;
      }
      case 'voz': {
        const v = this.voz(t, 0.45, 0.3);
        const hz = frecuencia(nota.alturas[0] ?? 69);
        const g = ganancia(m, v, v.entrada);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.16 * f, t + 0.015);
        g.gain.setValueAtTime(0.16 * f, t + dur);
        g.gain.linearRampToValueAtTime(0, t + dur + 0.12);
        const corte = filtro(m, v, 'lowpass', 2600, 3, g);
        barrido(corte.frequency, t, 2600, 1300, 0.2);
        // El vibrato entra tarde, como el de una voz: primero la nota, después el temblor (en cents).
        const vibrato = m.ctx.createGain();
        v.nodos.push(vibrato);
        vibrato.gain.setValueAtTime(0, t);
        vibrato.gain.linearRampToValueAtTime(0, t + 0.15);
        vibrato.gain.linearRampToValueAtTime(12, t + 0.35);
        oscilador(m, v, 'sine', 5.5, t, t + dur + 0.13, vibrato);
        for (const desafino of [-9, 9]) {
          const o = oscilador(m, v, 'sawtooth', hz, t, t + dur + 0.13, corte);
          o.detune.value = desafino;
          vibrato.connect(o.detune);
        }
        const grave = oscilador(m, v, 'square', hz / 2, t, t + dur + 0.13, ganancia(m, v, corte, 0.25));
        vibrato.connect(grave.detune);
        v.terminar(t + dur + 0.13);
        return;
      }
    }
  }
}

/** Un tono corto con envolvente (el «toc» del reloj, el cuerpo de la palmada). */
function tonoCorto(m: MotorDelSonido, v: Voz, t: number, hz: number, pico: number, caida: number, forma: OscillatorType): number {
  const g = ganancia(m, v, v.entrada);
  const fin = envolvente(g.gain, t, 0.001, pico, caida);
  oscilador(m, v, forma, hz, t, fin + 0.01, g);
  return fin;
}

/** La duración de un paso (semicorchea), para quien no tiene una rejilla a mano. */
export const PASO_S = 60 / TEMPO.bpm / TEMPO.pasosPorPulso;
