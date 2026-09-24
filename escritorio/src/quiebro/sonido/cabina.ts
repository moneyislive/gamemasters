/**
 * LA CABINA QUE SUENA: el timbre de teléfono antiguo de la Llamada (diseño §9, punto 4: «timbre 3D
 * audible a 150 m. Es la brújula sonora de la carrera»).
 *
 * ═══ QUÉ LO HACE BRÚJULA ═══
 *
 * Tres cosas, y las tres están medidas en `cuentas.ts`:
 *
 *   · Se OYE a 150 m: el perfil `cabina` deja el timbre a −18 dB a esa distancia (con la caída por
 *     defecto de WebAudio quedaría a −43, debajo de la lluvia).
 *   · Se oye LEJOS cuando está lejos: el paso bajo del aire (`corteDelAire`) lo apaga con la distancia
 *     hasta 1,2 kHz, que es justo donde viven las dos cazoletas (1180 y 1410 Hz). Lejos suena a timbre
 *     detrás de una esquina; al llegar, brilla.
 *   · Se oye DÓNDE está: panoramizador en 3D, y la calle mojada que cae con la raíz de la distancia
 *     (la cola pesa más cuanto más lejos, pero nunca tapa el sonido directo, que es el que dice hacia
 *     dónde correr). Con un envío fijo, a 150 m la cabina se oía casi sólo por su cola, que viene de
 *     todas partes: la autoprueba lo destapó poniéndola a la izquierda y oyéndola en el centro.
 *
 * Va por el camino claro: el Remanso no la apaga, porque en plena carrera un Remanso no debería
 * quitarte la brújula.
 *
 * ═══ EL TIMBRE ES UN BÚFER CON LA CADENCIA DENTRO ═══
 *
 * `timbreDeCabina` (`sintesis.ts`) fabrica un ciclo entero de la cadencia española (1,5 s sonando, 3
 * callando). Tocado en bucle, la cabina suena en su cadencia sin un solo temporizador: el hilo
 * principal puede estar pintando la carrera a trompicones y el timbre no se entera.
 */
import { ALCANCES, corteDelAire, distancia } from './cuentas';
import type { Punto3 } from './cuentas';
import type { EnvioQueSigue, MotorDelSonido } from './motor';
import { colocar, envioADistancia } from './motor';
import { timbreDeCabina } from './sintesis';

interface Sonando {
  readonly fuente: AudioBufferSourceNode;
  readonly volumen: GainNode;
  readonly aire: BiquadFilterNode;
  readonly panoramizador: PannerNode;
  readonly envio: GainNode;
  /** Deja de seguir al oyente (el aire de la distancia). */
  soltar: () => void;
  posicion: Punto3;
}

/** El envío a la calle mojada de la cabina pegada (cae con la distancia, ver la cabecera). */
const ENVIO_DE_LA_CABINA = 0.35;

export class CabinaQueSuena {
  private readonly m: MotorDelSonido;
  private sonando: Sonando | null = null;

  constructor(m: MotorDelSonido) {
    this.m = m;
  }

  /** ¿Suena alguna? */
  suena(): boolean {
    return this.sonando !== null;
  }

  /**
   * HACE SONAR LA CABINA en `posicion`, o la calla con `null`. Llamarla otra vez con otra posición la
   * mueve (el cliente la llama al cambiar de candidata: diseño §4.11, «suena otra candidata»). Callar
   * la apaga en un tercio de segundo y no de golpe: un corte a cero en mitad de un golpe del badajo chasca.
   */
  poner(posicion: Punto3 | null): void {
    const m = this.m;
    const ahora = m.ahora();
    if (posicion === null) {
      const s = this.sonando;
      if (s === null) return;
      this.sonando = null;
      s.volumen.gain.cancelScheduledValues(ahora);
      s.volumen.gain.setTargetAtTime(0, ahora, 0.08);
      s.fuente.stop(ahora + 0.5);
      s.soltar();
      s.fuente.onended = () => {
        for (const n of [s.fuente, s.volumen, s.aire, s.panoramizador, s.envio]) n.disconnect();
      };
      return;
    }
    if (this.sonando !== null) {
      this.sonando.posicion = posicion;
      colocar(this.sonando.panoramizador, posicion, ahora, 0.05);
      const d = distancia(posicion, m.oyente());
      this.sonando.aire.frequency.setTargetAtTime(corteDelAire(d), ahora, 0.1);
      this.sonando.envio.gain.setTargetAtTime(envioADistancia(ENVIO_DE_LA_CABINA, ALCANCES.cabina, d), ahora, 0.1);
      return;
    }
    const ctx = m.ctx;
    const fuente = ctx.createBufferSource();
    fuente.buffer = m.bufer('timbre', (sr) => timbreDeCabina(sr));
    fuente.loop = true;
    const volumen = ctx.createGain();
    volumen.gain.value = 0.95;
    const aire = ctx.createBiquadFilter();
    aire.type = 'lowpass';
    aire.Q.value = 0.5;
    aire.frequency.value = corteDelAire(distancia(posicion, m.oyente()));
    const panoramizador = m.panoramizador(posicion, ALCANCES.cabina);
    const envio = ctx.createGain();
    envio.gain.value = envioADistancia(ENVIO_DE_LA_CABINA, ALCANCES.cabina, distancia(posicion, m.oyente()));
    fuente.connect(volumen);
    volumen.connect(aire);
    aire.connect(panoramizador);
    panoramizador.connect(m.bus('senales', 'claro'));
    volumen.connect(envio);
    envio.connect(m.envio);
    fuente.start(ahora + 0.01);
    // Un solo objeto, mutable en `posicion`: `seguir` lee la posición de ESTE, que es el que se mueve.
    const sonando: Sonando = { fuente, volumen, aire, panoramizador, envio, posicion, soltar: () => undefined };
    const sigue: EnvioQueSigue = { ganancia: envio, base: ENVIO_DE_LA_CABINA, perfil: ALCANCES.cabina };
    sonando.soltar = m.seguir(() => sonando.posicion, aire, undefined, sigue);
    this.sonando = sonando;
  }
}
