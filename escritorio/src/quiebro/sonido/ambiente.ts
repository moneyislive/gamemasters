/**
 * LA CIUDAD QUE SUENA: la lluvia, el rumor del barrio, los coches lejanos y el tren elevado (diseño §9,
 * punto 6: «bucle que se amortigua bajo las marquesinas, pasos en mojado y el tren»).
 *
 * ═══ POR QUÉ LA LLUVIA NO ES UN BUCLE GRABADO ═══
 *
 * Un bucle de lluvia grabado se reconoce a la tercera vuelta (siempre la misma gota gorda en el mismo
 * sitio) y no se puede «meter bajo techo»: sólo bajarle los agudos. Aquí la lluvia son cuatro capas
 * independientes que se mezclan según `mezclaDeLaLluvia` (`cuentas.ts`): el siseo (ruido rosa en
 * estéreo, dos puntos distintos del mismo búfer para que no suene en mitad de la cabeza), el rumor
 * grave, las gotas sobre los charcos (búfer de `sintesis.ts`, 3,3 s) y el golpeteo sobre la lona
 * (otro búfer, de 2,9 s). Los bucles miden distinto a propósito: juntos no se repiten hasta pasados
 * más de noventa segundos.
 *
 * Todo pasa por el bus de ambiente, que es el que graba la cinta del Bis (`motor.ts`), y todo se
 * enchufa al tono del mundo: en el Remanso la lluvia baja una octava, que es lo que suena una lluvia
 * «quieta en el aire».
 *
 * ═══ EL TREN, CON SU DOPPLER ═══
 *
 * El tren elevado pasa cada unos 40 s (diseño §8). Aquí es un panoramizador que se desliza de un
 * extremo de la vía al otro en el reloj del audio, con traqueteo de bogies, el rugido del viaducto, un
 * chirrido de rueda a mitad de paso y el Doppler calculado en `cuentas.ts` enchufado al `detune` de
 * todas sus fuentes (el `PannerNode` dejó de hacer Doppler hace años).
 */
import { ALCANCES, dopplerDelPaso, mezclaDeLaLluvia } from './cuentas';
import type { Punto3, TiempoDeLaNoche } from './cuentas';
import type { MotorDelSonido, Voz } from './motor';
import { barrido, envolvente, filtro, ganancia, oscilador, ruidoEn, soplo } from './piezas';
import { golpeteoEnToldo, gotasDeLluvia, ruido } from './sintesis';

export interface EstadoDelAmbiente {
  /** El tiempo de la noche. */
  readonly tiempo?: TiempoDeLaNoche;
  /** 0 al raso, 1 bajo una marquesina. El cliente lo mueve al entrar y salir (con suavidad). */
  readonly bajoTecho?: number;
  /** 0 sin ciudad, 1 el rumor entero. */
  readonly ciudad?: number;
}

/** Nodos que viven mientras suena el ambiente; se paran y desconectan al callar. */
interface Capas {
  readonly fuentes: AudioScheduledSourceNode[];
  readonly nodos: AudioNode[];
}

/** Para las fuentes en `cuando` (contexto; `ahora` es el instante actual) y lo desconecta todo después. */
function soltarCapas(capas: Capas, cuando: number, ahora: number): void {
  for (const f of capas.fuentes) {
    try {
      f.stop(cuando);
    } catch {
      // Ya parada.
    }
  }
  setTimeout(() => {
    for (const n of [...capas.fuentes, ...capas.nodos]) {
      try {
        n.disconnect();
      } catch {
        // Ya desconectado.
      }
    }
  }, Math.max(0, cuando - ahora) * 1000 + 400);
}

export class AmbienteDeLaCiudad {
  private readonly m: MotorDelSonido;
  private estado: Required<EstadoDelAmbiente> = { tiempo: 'seca', bajoTecho: 0, ciudad: 0 };
  private lluvia: (Capas & { siseo: GainNode; grave: GainNode; gotas: GainNode; toldo: GainNode; corteSiseo: BiquadFilterNode; corteGotas: BiquadFilterNode }) | null = null;
  private ciudad: (Capas & { nivel: GainNode }) | null = null;
  private proximoCocheS = 0;
  private trenesHasta: number[] = [];

  constructor(m: MotorDelSonido) {
    this.m = m;
    m.alTic((ahora) => this.tic(ahora));
  }

  poner(cambio: EstadoDelAmbiente): void {
    this.estado = {
      tiempo: cambio.tiempo ?? this.estado.tiempo,
      bajoTecho: cambio.bajoTecho ?? this.estado.bajoTecho,
      ciudad: cambio.ciudad ?? this.estado.ciudad,
    };
    const ahora = this.m.ahora();
    const mezcla = mezclaDeLaLluvia(this.estado.tiempo, this.estado.bajoTecho);
    const hayLluvia = mezcla.siseo + mezcla.gotas + mezcla.grave > 0;
    if (hayLluvia && this.lluvia === null) this.lluvia = this.montarLaLluvia();
    if (this.lluvia !== null) {
      const l = this.lluvia;
      l.siseo.gain.setTargetAtTime(mezcla.siseo, ahora, 0.4);
      l.grave.gain.setTargetAtTime(mezcla.grave, ahora, 0.4);
      l.gotas.gain.setTargetAtTime(mezcla.gotas, ahora, 0.4);
      // La marquesina se nota rápido: al meterse debajo, el cambio es de un paso.
      l.toldo.gain.setTargetAtTime(mezcla.toldo, ahora, 0.12);
      l.corteSiseo.frequency.setTargetAtTime(mezcla.corteHz, ahora, 0.12);
      l.corteGotas.frequency.setTargetAtTime(Math.min(18000, mezcla.corteHz * 1.6), ahora, 0.12);
      if (!hayLluvia && mezcla.toldo === 0) {
        soltarCapas(l, ahora + 2, ahora);
        this.lluvia = null;
      }
    }
    const nivelCiudad = Math.max(0, Math.min(1, this.estado.ciudad));
    if (nivelCiudad > 0 && this.ciudad === null) this.ciudad = this.montarLaCiudad();
    if (this.ciudad !== null) {
      this.ciudad.nivel.gain.setTargetAtTime(nivelCiudad, ahora, 0.5);
      if (nivelCiudad === 0) {
        soltarCapas(this.ciudad, ahora + 2.5, ahora);
        this.ciudad = null;
      }
    }
  }

  actual(): Required<EstadoDelAmbiente> {
    return this.estado;
  }

  /**
   * Una fuente de búfer en bucle, enchufada al tono del mundo, desde un punto dado. Con `entrada`, entra
   * por ese canal del destino (un juntador de canales): así un ruido mono se pone a un lado.
   */
  private bucle(b: AudioBuffer, destino: AudioNode, desdeS: number, capas: Capas, entrada?: number): AudioBufferSourceNode {
    const s = this.m.ctx.createBufferSource();
    s.buffer = b;
    s.loop = true;
    if (entrada === undefined) s.connect(destino);
    else s.connect(destino, 0, entrada);
    this.m.tonoDelMundo.connect(s.detune);
    s.start(this.m.ahora(), desdeS % b.duration);
    capas.fuentes.push(s);
    return s;
  }

  private nodo<T extends AudioNode>(n: T, capas: Capas): T {
    capas.nodos.push(n);
    return n;
  }

  private montarLaLluvia(): NonNullable<AmbienteDeLaCiudad['lluvia']> {
    const m = this.m;
    const ctx = m.ctx;
    const capas: Capas = { fuentes: [], nodos: [] };
    const bus = m.bus('ambiente', 'mundo');
    const g = (valor: number, destino: AudioNode): GainNode => {
      const n = this.nodo(ctx.createGain(), capas);
      n.gain.value = valor;
      n.connect(destino);
      return n;
    };
    const f = (tipo: BiquadFilterType, hz: number, q: number, destino: AudioNode): BiquadFilterNode => {
      const n = this.nodo(ctx.createBiquadFilter(), capas);
      n.type = tipo;
      n.frequency.value = hz;
      n.Q.value = q;
      n.connect(destino);
      return n;
    };
    // El siseo, en estéreo: dos puntos del mismo ruido rosa, cada uno a un lado.
    const siseo = g(0, bus);
    const corteSiseo = f('lowpass', 16000, 0.5, siseo);
    const graves = f('highpass', 400, 0.5, corteSiseo);
    const juntar = this.nodo(ctx.createChannelMerger(2), capas);
    juntar.connect(graves);
    // Un ruido propio de 5,3 s y no el de 2 s de los golpes: en un siseo continuo, una vuelta de dos
    // segundos se llega a oír como un vaivén.
    const rosa = m.bufer('lluvia-rosa', (sr) => ruido('rosa', Math.round(sr * 5.3), 41));
    this.bucle(rosa, juntar, 0, capas, 0);
    this.bucle(rosa, juntar, 2.6, capas, 1);
    // El rumor grave: la lluvia sobre toda la ciudad.
    const grave = g(0, bus);
    this.bucle(m.ruido('marron'), f('lowpass', 500, 0.5, grave), 0.3, capas);
    // Las gotas sobre los charcos.
    const gotas = g(0, bus);
    const corteGotas = f('lowpass', 18000, 0.5, gotas);
    this.bucle(m.bufer('gotas', (sr) => gotasDeLluvia(sr, 3.3, 110, 17)), corteGotas, 0, capas);
    // El golpeteo sobre la lona de la marquesina.
    const toldo = g(0, bus);
    this.bucle(m.bufer('toldo', (sr) => golpeteoEnToldo(sr, 2.9, 42, 29)), f('lowpass', 1800, 0.6, toldo), 0, capas);
    return { ...capas, siseo, grave, gotas, toldo, corteSiseo, corteGotas };
  }

  /**
   * EL RUMOR DEL BARRIO a las tres de la madrugada: el zumbido grave de la ciudad que respira despacio,
   * el de las farolas de sodio (100 Hz: la red de 50 Hz, dos veces por ciclo) y un murmullo de medios
   * que sube y baja. Los coches lejanos sobre asfalto mojado los pone `tic()`, de uno en uno.
   */
  private montarLaCiudad(): NonNullable<AmbienteDeLaCiudad['ciudad']> {
    const m = this.m;
    const ctx = m.ctx;
    const capas: Capas = { fuentes: [], nodos: [] };
    const nivel = this.nodo(ctx.createGain(), capas);
    nivel.gain.value = 0;
    nivel.connect(m.bus('ambiente', 'mundo'));
    const g = (valor: number, destino: AudioNode | AudioParam): GainNode => {
      const n = this.nodo(ctx.createGain(), capas);
      n.gain.value = valor;
      if (destino instanceof AudioParam) n.connect(destino);
      else n.connect(destino);
      return n;
    };
    const f = (tipo: BiquadFilterType, hz: number, q: number, destino: AudioNode): BiquadFilterNode => {
      const n = this.nodo(ctx.createBiquadFilter(), capas);
      n.type = tipo;
      n.frequency.value = hz;
      n.Q.value = q;
      n.connect(destino);
      return n;
    };
    const osc = (tipo: OscillatorType, hz: number, destino: AudioNode | AudioParam): OscillatorNode => {
      const o = ctx.createOscillator();
      o.type = tipo;
      o.frequency.value = hz;
      if (destino instanceof AudioParam) o.connect(destino);
      else o.connect(destino);
      if (!(destino instanceof AudioParam)) m.tonoDelMundo.connect(o.detune);
      o.start();
      capas.fuentes.push(o);
      return o;
    };
    // El zumbido que respira: grave, con un vaivén de catorce segundos.
    const zumbido = g(0.3, nivel);
    osc('sine', 0.07, g(0.1, zumbido.gain));
    this.bucle(m.ruido('marron'), f('lowpass', 160, 0.6, zumbido), 0.5, capas);
    // Las farolas de sodio.
    osc('sawtooth', 100, f('bandpass', 200, 3, g(0.012, nivel)));
    osc('sawtooth', 100.3, f('bandpass', 300, 6, g(0.006, nivel)));
    // El murmullo de medios.
    const murmullo = g(0.05, nivel);
    osc('sine', 0.037, g(0.03, murmullo.gain));
    this.bucle(m.ruido('rosa'), f('bandpass', 550, 0.6, murmullo), 1.3, capas);
    return { ...capas, nivel };
  }

  private tic(ahora: number): void {
    if (this.ciudad === null) return;
    if (this.proximoCocheS === 0) this.proximoCocheS = ahora + 3 + this.m.azar() * 5;
    if (ahora + 0.2 < this.proximoCocheS) return;
    this.cocheLejano(this.proximoCocheS);
    this.proximoCocheS += 6 + this.m.azar() * 9;
  }

  /**
   * UN COCHE LEJANO en una avenida exterior (diseño §8: dentro del área de juego sólo hay coches
   * aparcados): el siseo de las ruedas sobre el asfalto mojado, que sube, pasa de un lado a otro y se va.
   */
  private cocheLejano(t: number): void {
    const m = this.m;
    const ctx = m.ctx;
    const nivel = this.estado.ciudad;
    if (nivel <= 0) return;
    const v: Voz = m.voz({ categoria: 'ambiente', camino: 'mundo', t });
    const dur = 3 + m.azar() * 1.5;
    const lado = ctx.createStereoPanner();
    const desde = m.azar() < 0.5 ? -0.8 : 0.8;
    lado.pan.setValueAtTime(desde, t);
    lado.pan.linearRampToValueAtTime(-desde, t + dur);
    lado.connect(v.entrada);
    v.nodos.push(lado);
    const g = ganancia(m, v, lado);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.06 * nivel, t + dur * 0.5);
    g.gain.linearRampToValueAtTime(0, t + dur);
    const pasa = filtro(m, v, 'bandpass', 900, 0.5, g);
    barrido(pasa.frequency, t, 700, 1400, dur * 0.5);
    pasa.frequency.exponentialRampToValueAtTime(600, t + dur);
    ruidoEn(m, v, 'rosa', t, t + dur, pasa);
    v.terminar(t + dur);
  }

  /**
   * EL TREN ELEVADO pasa de `desde` a `hasta` en `segundos`. Devuelve si sonó (como mucho dos a la vez).
   */
  tren(desde: Punto3, hasta: Punto3, segundos = 7): boolean {
    const m = this.m;
    const ctx = m.ctx;
    const t = m.ahora() + 0.02;
    this.trenesHasta = this.trenesHasta.filter((f) => f > t);
    if (this.trenesHasta.length >= 2) return false;
    const dur = Math.max(2, segundos);
    this.trenesHasta.push(t + dur);
    const v = m.voz({ categoria: 'ambiente', camino: 'mundo', posicion: desde, alcance: 'tren', reverberacion: 0.35, t });
    // El panoramizador se desliza por la vía en el reloj del audio.
    const p = v.panoramizador;
    if (p !== null && p.positionX !== undefined) {
      p.positionX.setValueAtTime(desde.x, t);
      p.positionY.setValueAtTime(desde.y, t);
      p.positionZ.setValueAtTime(desde.z, t);
      p.positionX.linearRampToValueAtTime(hasta.x, t + dur);
      p.positionY.linearRampToValueAtTime(hasta.y, t + dur);
      p.positionZ.linearRampToValueAtTime(hasta.z, t + dur);
    }
    // El aire del tren va abierto: el Doppler y la distancia ya dicen dónde está.
    v.aire?.frequency.setValueAtTime(16000, t);
    // El Doppler, enchufado al `detune` de todas las fuentes del tren.
    const doppler = ctx.createConstantSource();
    doppler.offset.setValueCurveAtTime(dopplerDelPaso(desde, hasta, m.oyente(), dur, 64), t, dur);
    doppler.start(t);
    doppler.stop(t + dur);
    v.nodos.push(doppler);
    const conDoppler = (fuente: AudioScheduledSourceNode & { detune: AudioParam }): void => {
      doppler.connect(fuente.detune);
    };
    // La envolvente del paso entero: sin ella el tren «aparece» a 200 m en vez de llegar.
    const todo = ganancia(m, v, v.entrada);
    todo.gain.setValueAtTime(0, t);
    todo.gain.linearRampToValueAtTime(1, t + 1.2);
    todo.gain.setValueAtTime(1, t + dur - 1.2);
    todo.gain.linearRampToValueAtTime(0, t + dur);
    // El rugido de las ruedas y del viaducto de acero.
    const rugido = ganancia(m, v, todo, 0.8);
    conDoppler(ruidoEn(m, v, 'marron', t, t + dur, filtro(m, v, 'lowpass', 220, 0.7, rugido)));
    const viaducto = ganancia(m, v, todo, 0.5);
    conDoppler(ruidoEn(m, v, 'marron', t, t + dur, filtro(m, v, 'bandpass', 90, 2, viaducto)));
    // El traqueteo: los bogies sobre las juntas, de dos en dos.
    for (let k = 0; t + 0.4 + k * 0.62 < t + dur - 0.4; k++) {
      for (const dt of [0, 0.09]) {
        const cuando = t + 0.4 + k * 0.62 + dt + m.azar() * 0.01;
        soplo(m, v, cuando, 'bandpass', 2200, 2, 0.001, 0.45, 0.03, todo);
        const golpe = ganancia(m, v, todo);
        const fin = envolvente(golpe.gain, cuando, 0.002, 0.4, 0.05);
        conDoppler(oscilador(m, v, 'sine', 180, cuando, fin + 0.01, golpe));
      }
    }
    // El chirrido de una rueda, a mitad de paso.
    const chirrido = ganancia(m, v, todo);
    chirrido.gain.setValueAtTime(0, t + dur * 0.35);
    chirrido.gain.linearRampToValueAtTime(0.08, t + dur * 0.45);
    chirrido.gain.linearRampToValueAtTime(0, t + dur * 0.6);
    conDoppler(ruidoEn(m, v, 'blanco', t, t + dur, filtro(m, v, 'bandpass', 3400, 25, chirrido)));
    v.terminar(t + dur);
    return true;
  }

  /** Perfil de alcance del tren, por si el cliente quiere saber hasta dónde se oye. */
  static readonly alcanceDelTren = ALCANCES.tren;
}
