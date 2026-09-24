/**
 * EL SONIDO DEL QUIEBRO: la única puerta. El juego crea uno con `crearSonido()` y le habla por aquí.
 *
 * ═══ QUÉ HAY DETRÁS ═══
 *
 *   · `motor.ts`     el `AudioContext`, los buses, el desbloqueo, los dos relojes y la calle mojada.
 *   · `anillo.ts`    el silbido del anillo (jugabilidad: se quiebra de oído).
 *   · `voces.ts`     los sonidos sueltos por nombre: golpes en tres capas, cristal, pasos, esquirlas…
 *   · `ambiente.ts`  la lluvia con su marquesina, el rumor del barrio, los coches y el tren.
 *   · `cabina.ts`    el timbre de la Llamada, audible a 150 m.
 *   · `musica.ts`    120 ppm en tres capas, con planificador y pulso.
 *   · `cuentas.ts`, `partitura.ts`, `sintesis.ts`: lo puro, probado en Node por
 *     `escritorio/scripts/verificar-quiebro-sonido.ts`.
 *
 * ═══ LO QUE ESTA PUERTA PROMETE ═══
 *
 * 1. NUNCA LANZA. Sin WebAudio (un navegador raro, una política que lo prohíbe) devuelve un sonido
 *    MUDO con la misma forma: el juego se juega igual en silencio (diseño §7: «así se juega igual en
 *    silencio»), y ningún `if (sonido)` se reparte por el cliente.
 * 2. NO ENCOLA SONIDOS SIN CONTEXTO. Mientras el audio no corre (antes de BAJAR, en segundo plano),
 *    `sonar`, `anillo`, `tren` y `bis` no hacen nada. Si se programaran, el reloj del audio parado los
 *    acumularía todos en el mismo instante y sonarían de golpe al volver: veinte pasos, tres cristales
 *    y un silbido en un solo chasquido. Lo continuo (música, lluvia, cabina) sí se puede poner en
 *    cualquier momento: es un estado, y suena en cuanto el audio corre.
 * 3. EL PULSO EXISTE SIEMPRE. `pulso()` da el pulso de la música en ms de `performance.now()` desde
 *    que se crea el sonido, suene o no, y la música se cuadra a él al arrancar: el «a compás» se puede
 *    juzgar (y pintar en el HUD) sin audio, y no salta de fase al tocar BAJAR.
 */
import { silbarElAnillo } from './anillo';
import type { ManejoDelAnillo } from './anillo';
import { AmbienteDeLaCiudad } from './ambiente';
import type { EstadoDelAmbiente } from './ambiente';
import { CabinaQueSuena } from './cabina';
import { BIS, mezclaDelRemanso, TEMPO } from './cuentas';
import type { Pulso, Punto3 } from './cuentas';
import { hayWebAudio, MotorDelSonido } from './motor';
import type { CalidadDelSonido, Camino, CategoriaDeSonido, EstadoDelSonido, OpcionesDelMotor } from './motor';
import { MusicaDelQuiebro } from './musica';
import type { EstadoDeLaMusica } from './musica';
import { MANEJO_INERTE, RECETAS, tocar } from './voces';
import type { IdDeSonido, ManejoDeSonido, OpcionesDeSonido } from './voces';
import { aleteo, chapaGolpeada, cristalRoto, cuerdaPulsada, golpeteoEnToldo, gotasDeLluvia, ruido, timbreDeCabina } from './sintesis';

export type { ManejoDelAnillo } from './anillo';
export type { EstadoDelAmbiente } from './ambiente';
export type { Pulso, Punto3, TiempoDeLaNoche } from './cuentas';
export { desvioDelPulso, faseDelPulso } from './cuentas';
export type { CalidadDelSonido, CategoriaDeSonido, EstadoDelSonido } from './motor';
export { CATEGORIAS, VOLUMENES_DE_PARTIDA } from './motor';
export type { EstadoDeLaMusica } from './musica';
export type { ModoDeLaMusica } from './partitura';
export type { IdDeSonido, ManejoDeSonido, Material, OpcionesDeSonido, TipoDeGolpe } from './voces';
export { IDS_DE_SONIDO } from './voces';

/** El plan del Bis en el reloj del juego, para cuadrar las farolas y las palomas con cada repetición. */
export interface PlanDelBisEnMs {
  /** Cuándo empieza el segundo que se graba (y que ya está sonando en vivo). */
  readonly capturaMs: number;
  /** Cuándo empieza cada repetición. */
  readonly iniciosMs: readonly number[];
  readonly finMs: number;
}

export interface DiagnosticoDelSonido {
  readonly estado: EstadoDelSonido;
  readonly frecuenciaDeMuestreo: number;
  /** Latencia de salida declarada por el navegador, en ms (0 si no la declara). */
  readonly latenciaMs: number;
  /** El desfase medido entre el reloj del audio y el del juego (ver `cuentas.ts`), o `null`. */
  readonly desfaseMs: number | null;
  readonly fuenteDelReloj: string;
  readonly saltosDelReloj: number;
  readonly vocesActivas: number;
  readonly pasosSaltados: number;
  readonly calidad: CalidadDelSonido;
  /** La latencia medida del propio grafo por camino, en ms (ver `motor.ts`). */
  readonly latenciaDelGrafoMs: { readonly claro: number; readonly mundo: number };
}

/** TODO lo que el juego le puede pedir al sonido. */
export interface Sonido {
  /** `false` si no hay WebAudio: todo lo demás existe y no hace nada. */
  readonly disponible: boolean;
  /**
   * `true` en iPhone y iPad: WebAudio calla con el interruptor de silencio aunque `estado()` diga
   * `corriendo`. El HUD lo avisa la primera vez (diseño §9).
   */
  readonly puedeCallarElInterruptor: boolean;
  estado(): EstadoDelSonido;
  /** Atajo de `estado() === 'corriendo'`. */
  corriendo(): boolean;
  /** Avisa de cada cambio de estado. Devuelve cómo dejar de escuchar. */
  alCambiar(avisar: (estado: EstadoDelSonido) => void): () => void;
  /**
   * Desbloquea el audio: llamarlo en el `pointerdown` de BAJAR. El motor también lo intenta él solo
   * en cada toque de la página, así que esto es para no depender de ello.
   */
  desbloquear(): Promise<boolean>;
  /** En los Safari que lo tienen, pide sonar con el interruptor de silencio puesto. Sólo si lo pide la persona. */
  sesionDeReproduccion(): boolean;
  /** Un sonido suelto por nombre (ver `IDS_DE_SONIDO`). */
  sonar(id: IdDeSonido, opciones?: OpcionesDeSonido): ManejoDeSonido;
  /**
   * EL SILBIDO DEL ANILLO: sube de tono hasta `impactoMs` y muere en él. Tiempos en ms de
   * `performance.now()`; `posicion`, la de quien golpea; `fuerza`, 1 un Celador, 0,5 un Prestado,
   * menos para los anillos ajenos.
   */
  anillo(inicioMs: number, impactoMs: number, posicion?: Punto3 | null, fuerza?: number): ManejoDelAnillo;
  /** EL REMANSO: 0 nada, 1 pleno (paso bajo a 800 Hz, tono a la mitad y latido). Se llama cuando cambie. */
  remanso(intensidad: number): void;
  /** El oyente sigue a la cámara: su posición y hacia dónde mira. En cada fotograma. */
  oyente(posicion: Punto3, mirada: Punto3, arriba?: Punto3): void;
  musica(estado: EstadoDeLaMusica): void;
  /** El pulso de la música (existe siempre, ver la cabecera). */
  pulso(): Pulso;
  ambiente(estado: EstadoDelAmbiente): void;
  /** Hace sonar la cabina de la Llamada en `posicion`, o la calla con `null`. */
  cabina(posicion: Punto3 | null): void;
  /** Pasa el tren elevado. `false` si ya pasan dos. */
  tren(desde: Punto3, hasta: Punto3, segundos?: number): boolean;
  /**
   * EL BIS: suenan las palomas y la farola, y el segundo siguiente de ambiente se repite
   * `repeticiones` veces como una cinta que tartamudea. `null` si el audio no corre o ya hay otro.
   */
  bis(repeticiones?: number): PlanDelBisEnMs | null;
  volumen(categoria: CategoriaDeSonido | 'maestro', valor: number): void;
  volumenDe(categoria: CategoriaDeSonido | 'maestro'): number;
  silenciar(si: boolean): void;
  silenciado(): boolean;
  /** `alta` en N1-N3, `baja` en N0 (panoramizador de igual potencia y cola corta). */
  calidad(nivel: CalidadDelSonido): void;
  diagnostico(): DiagnosticoDelSonido;
  /** Fabrica ya todos los búferes (la Bajada tapa lo que tarde). Se llama solo al desbloquear. */
  precalentar(): Promise<void>;
  /** Se cumple cuando el motor ha medido la latencia de su propio grafo (ver `motor.ts`). */
  listo(): Promise<void>;
  /**
   * SÓLO FUERA DE LÍNEA (la autoprueba): hace a mano lo que el temporizador hace en vivo, hasta
   * `hastaS` del contexto. En vivo no hace nada.
   */
  avanzar(hastaS: number): void;
  /** Cierra el contexto y suelta los escuchadores. */
  destruir(): void;
}

export interface OpcionesDelSonido extends OpcionesDelMotor {}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// El Remanso
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/** El latido del Remanso: a 75 por minuto, un corazón que se ha calmado de golpe. */
const PERIODO_DEL_LATIDO_S = 0.8;

class RemansoQueSuena {
  private readonly m: MotorDelSonido;
  private intensidad = 0;
  private latiendo = false;
  private proximoLatido = 0;

  constructor(m: MotorDelSonido) {
    this.m = m;
    m.alTic((ahora) => this.tic(ahora));
  }

  poner(x: number): void {
    const intensidad = Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
    // Sesenta llamadas por segundo con el mismo número son sesenta eventos inútiles en tres parámetros.
    if (Math.abs(intensidad - this.intensidad) < 0.004 && (intensidad > 0 || this.intensidad === 0)) return;
    this.intensidad = intensidad;
    const mezcla = mezclaDelRemanso(intensidad);
    const m = this.m;
    const ahora = m.ahora();
    m.filtroDelRemanso.frequency.setTargetAtTime(mezcla.corteHz, ahora, 0.03);
    m.tonoDelMundo.offset.setTargetAtTime(mezcla.detuneCents, ahora, 0.04);
    m.ponerHumedad(mezcla.humedad);
    if (mezcla.latido && !this.latiendo) {
      this.latiendo = true;
      this.proximoLatido = ahora + 0.01;
      this.tic(ahora);
    } else if (!mezcla.latido) {
      this.latiendo = false;
    }
  }

  private tic(ahora: number): void {
    if (!this.latiendo || ahora + 0.1 < this.proximoLatido) return;
    tocar(this.m, 'latido', { fuerza: 0.4 + 0.6 * this.intensidad }, Math.max(ahora, this.proximoLatido), null);
    this.proximoLatido += PERIODO_DEL_LATIDO_S;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// El sonido mudo
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

const ANILLO_MUDO: ManejoDelAnillo = { impactoS: null, cancelar: () => undefined, mover: () => undefined };

/** El pulso sin audio: el mismo tempo, anclado al instante de creación. */
function pulsoSinAudio(anclaMs: number): Pulso {
  const periodoMs = 60000 / TEMPO.bpm;
  return { bpm: TEMPO.bpm, periodoMs, origenMs: anclaMs };
}

function ahoraMs(): number {
  return typeof performance === 'undefined' ? 0 : performance.now();
}

/** Un sonido que no suena: la misma forma, cero efectos. Ver la promesa 1 de la cabecera. */
export function sonidoMudo(): Sonido {
  const ancla = ahoraMs();
  const volumenes: Record<CategoriaDeSonido | 'maestro', number> = { maestro: 1, senales: 1, efectos: 1, ambiente: 1, musica: 1 };
  let mudo = false;
  return {
    disponible: false,
    puedeCallarElInterruptor: false,
    estado: () => 'sin-audio',
    corriendo: () => false,
    alCambiar: () => () => undefined,
    desbloquear: () => Promise.resolve(false),
    sesionDeReproduccion: () => false,
    sonar: () => MANEJO_INERTE,
    anillo: () => ANILLO_MUDO,
    remanso: () => undefined,
    oyente: () => undefined,
    musica: () => undefined,
    pulso: () => pulsoSinAudio(ancla),
    ambiente: () => undefined,
    cabina: () => undefined,
    tren: () => false,
    bis: () => null,
    volumen: (c, v) => {
      volumenes[c] = v;
    },
    volumenDe: (c) => volumenes[c],
    silenciar: (si) => {
      mudo = si;
    },
    silenciado: () => mudo,
    calidad: () => undefined,
    diagnostico: () => ({
      estado: 'sin-audio',
      frecuenciaDeMuestreo: 0,
      latenciaMs: 0,
      desfaseMs: null,
      fuenteDelReloj: 'ninguna',
      saltosDelReloj: 0,
      vocesActivas: 0,
      pasosSaltados: 0,
      calidad: 'baja',
      latenciaDelGrafoMs: { claro: 0, mundo: 0 },
    }),
    precalentar: () => Promise.resolve(),
    listo: () => Promise.resolve(),
    avanzar: () => undefined,
    destruir: () => undefined,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// El sonido de verdad
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/** Todos los búferes que se fabrican al precalentar, con su receta. */
const BUFERES: readonly [string, (sr: number) => Float32Array<ArrayBuffer> | readonly [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>]][] = [
  ['lluvia-rosa', (sr) => ruido('rosa', Math.round(sr * 5.3), 41)],
  ['gotas', (sr) => gotasDeLluvia(sr, 3.3, 110, 17)],
  ['toldo', (sr) => golpeteoEnToldo(sr, 2.9, 42, 29)],
  ['timbre', (sr) => timbreDeCabina(sr)],
  ['cristal-0', (sr) => cristalRoto(sr, 101)],
  ['cristal-1', (sr) => cristalRoto(sr, 102)],
  ['cristal-2', (sr) => cristalRoto(sr, 103)],
  ['chapa-0', (sr) => chapaGolpeada(sr, 211)],
  ['chapa-1', (sr) => chapaGolpeada(sr, 212)],
  ['chapa-2', (sr) => chapaGolpeada(sr, 213)],
  ['palomas-0', (sr) => aleteo(sr, 307)],
  ['palomas-1', (sr) => aleteo(sr, 308)],
  ['cuerda-110', (sr) => cuerdaPulsada(sr, 110, 2.2, 110)],
  ['cuerda-220', (sr) => cuerdaPulsada(sr, 220, 2.2, 220)],
  ['cuerda-440', (sr) => cuerdaPulsada(sr, 440, 2.2, 440)],
];

/**
 * CREA EL SONIDO. Sin opciones, un `AudioContext` nuevo que se desbloquea con el primer toque de la
 * página. Con `contexto`, uno hecho (la autoprueba le pasa una `OfflineAudioContext`).
 */
export function crearSonido(opciones: OpcionesDelSonido = {}): Sonido {
  if (opciones.contexto === undefined && !hayWebAudio()) return sonidoMudo();
  let m: MotorDelSonido;
  try {
    m = new MotorDelSonido(opciones);
  } catch {
    return sonidoMudo();
  }
  const ancla = m.enVivo ? ahoraMs() : 0;
  const musica = new MusicaDelQuiebro(m, ancla);
  const ambiente = new AmbienteDeLaCiudad(m);
  const cabina = new CabinaQueSuena(m);
  const remanso = new RemansoQueSuena(m);
  let avanzadoHasta = 0;
  let calentado: Promise<void> | null = null;

  /** ¿Se puede programar un sonido suelto ahora? Fuera de línea, siempre; en vivo, sólo corriendo. */
  const sePuede = (): boolean => !m.enVivo || m.ctx.state === 'running';

  /** El instante del contexto para que lo que va por `camino` se oiga en `enMs` (o ahora). Lo que ya pasó, suena ya. */
  const instante = (enMs: number | undefined, camino: Camino): number => {
    const ahora = m.ahora();
    if (enMs === undefined) return ahora;
    const t = m.aContexto(enMs, camino);
    return t === null ? ahora : Math.max(ahora, t);
  };

  const precalentar = (): Promise<void> => {
    if (calentado !== null) return calentado;
    calentado = (async () => {
      for (const color of ['blanco', 'rosa', 'marron'] as const) m.ruido(color);
      for (const [clave, fabricar] of BUFERES) {
        if (m.tieneBufer(clave)) continue;
        // Uno por tarea: cada búfer tarda unos milisegundos y así no se come un fotograma entero.
        if (m.enVivo) await new Promise<void>((listo) => setTimeout(listo, 0));
        m.bufer(clave, fabricar);
      }
    })();
    return calentado;
  };
  m.alCambiar((estado) => {
    if (estado === 'corriendo') void precalentar();
  });

  return {
    disponible: true,
    puedeCallarElInterruptor: m.puedeCallarElInterruptor,
    estado: () => m.estado(),
    corriendo: () => m.estado() === 'corriendo',
    alCambiar: (avisar) => m.alCambiar(avisar),
    desbloquear: () => m.desbloquear(),
    sesionDeReproduccion: () => m.sesionDeReproduccion(),
    sonar(id, o = {}) {
      if (!sePuede()) return MANEJO_INERTE;
      const t = instante(o.enMs, RECETAS[id].camino);
      return tocar(m, id, o, t, o.aCompas === true ? musica.acentoEn(t) : null);
    },
    anillo(inicioMs, impactoMs, posicion = null, fuerza = 1) {
      if (!sePuede()) return ANILLO_MUDO;
      return silbarElAnillo(m, inicioMs, impactoMs, posicion, fuerza);
    },
    remanso: (x) => remanso.poner(x),
    oyente: (p, mirada, arriba) => m.ponerOyente(p, mirada, arriba),
    musica: (e) => musica.poner(e),
    pulso: () => musica.pulso(),
    ambiente: (e) => ambiente.poner(e),
    cabina: (p) => cabina.poner(p),
    tren: (desde, hasta, segundos) => (sePuede() ? ambiente.tren(desde, hasta, segundos) : false),
    bis(repeticiones = BIS.repeticiones) {
      if (!sePuede()) return null;
      const ahora = m.ahora();
      /*
       * Las palomas y la farola suenan AHORA, en el ambiente, y se graba el segundo que empieza ahora:
       * así lo que se repite es el despegue y el parpadeo, que es lo que se ve repetirse (diseño §8,
       * momento 7). Sin ellos, en una noche sin lluvia la cinta repetiría un segundo de casi nada.
       */
      const t0 = ahora + BIS.tramoS + 0.02;
      const plan = m.programarElBis(t0, repeticiones);
      if (plan === null) return null;
      tocar(m, 'palomas', { fuerza: 1 }, ahora + 0.02, null);
      tocar(m, 'farola', { fuerza: 0.9 }, ahora + 0.12, null);
      const aMs = (s: number): number => m.aOido(s, 'mundo') ?? s * 1000;
      return { capturaMs: aMs(ahora + 0.02), iniciosMs: plan.inicios.map(aMs), finMs: aMs(plan.fin) };
    },
    volumen: (c, v) => m.volumen(c, v),
    volumenDe: (c) => m.volumenDe(c),
    silenciar: (si) => m.silenciar(si),
    silenciado: () => m.silenciado(),
    calidad: (nivel) => m.ponerCalidad(nivel),
    diagnostico() {
      const ctx = m.ctx as Partial<AudioContext> & BaseAudioContext;
      const reloj = m.relojActual();
      return {
        estado: m.estado(),
        frecuenciaDeMuestreo: m.ctx.sampleRate,
        latenciaMs: ((ctx.outputLatency ?? 0) || (ctx.baseLatency ?? 0)) * 1000,
        desfaseMs: reloj.desfaseMs,
        fuenteDelReloj: reloj.fuente,
        saltosDelReloj: reloj.saltos,
        vocesActivas: m.vocesActivas(),
        pasosSaltados: musica.pasosSaltados(),
        calidad: m.calidad(),
        latenciaDelGrafoMs: { claro: m.latencia('claro') * 1000, mundo: m.latencia('mundo') * 1000 },
      };
    },
    precalentar,
    listo: () => m.listo(),
    avanzar(hastaS) {
      if (m.enVivo) return;
      for (let t = avanzadoHasta; t <= hastaS; t += 0.025) m.ticManual(t);
      avanzadoHasta = Math.max(avanzadoHasta, hastaS);
    },
    destruir: () => m.destruir(),
  };
}
