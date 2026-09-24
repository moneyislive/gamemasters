/**
 * EL MOTOR DE SONIDO: el `AudioContext`, sus buses, el desbloqueo, los dos relojes y la calle mojada.
 *
 * ═══ LA PRIMERA VEZ CON SONIDO EN LA PLATAFORMA ═══
 *
 * Hasta el Quiebro no había ni una línea de WebAudio en el repositorio (ni un fichero de audio, ni un
 * módulo nativo). Por eso este motor no hereda nada y lo decide todo aquí, y por eso cada decisión
 * lleva su porqué: la siguiente vez que un juego suene, empezará leyendo esto.
 *
 * ═══ EL GRAFO ═══
 *
 *     voz ─▶ [aire ─▶ panoramizador] ─▶ bus(categoría, camino)
 *      └──▶ envío ─▶ reverberación (calle mojada) ─▶ retorno ─▶ MUNDO
 *
 *     bus(·, 'mundo') ─▶ MUNDO ─▶ agachado ─▶ filtro del Remanso ─┐
 *     bus(·, 'claro') ────────────────────────────────────────────┼─▶ mezcla ─▶ compresor ─▶ maestro ─▶ limitador ─▶ altavoz
 *
 * Dos CAMINOS por categoría, y es la decisión que más importa del fichero. El diseño (§4.4) dice que
 * «anillos, balas, líneas de apuntado y silbidos van SIEMPRE en el reloj verdadero», y el Remanso
 * (§9) baja el mundo a 800 Hz y a la mitad de tono. Si el silbido pasara por el mismo sitio, durante
 * un Remanso de un compañero un anillo DE VERDAD sonaría apagado y una octava abajo: el oído leería
 * que el golpe viene más tarde, y es mentira. Así que las señales van por el camino CLARO, que no
 * toca ni el filtro ni el tono, y todo lo demás por el del MUNDO.
 *
 * `agachado` hunde el mundo 3 dB mientras suena una señal: el silbido se tiene que oír por encima de un
 * aguacero y de la percusión a tope, y bajar el mundo es más honrado que subir el silbido hasta que
 * sature.
 *
 * El tono del Remanso no se puede bajar con un filtro: WebAudio no tiene desplazador de tono. Lo que
 * sí tiene es el parámetro `detune` de cada oscilador y cada búfer. Así que el motor lleva UNA fuente
 * constante (`tonoDelMundo`, en cents) enchufada al `detune` de todo lo que suena en el mundo: el
 * Remanso mueve un número y la lluvia, los golpes y la música bajan una octava a la vez, como una cinta
 * que se frena.
 *
 * ═══ EL DESBLOQUEO, Y POR QUÉ ESCUCHA TANTOS EVENTOS ═══
 *
 * Los navegadores no dejan sonar un `AudioContext` hasta que la persona toca la página. El diseño lo
 * resuelve con el botón BAJAR (§2.1), que es el primer toque. Pero el juego no puede fiarse de que
 * BAJAR llame a esto: el motor escucha él mismo `pointerdown`, `touchend` y `keydown` en la fase de
 * captura, SIEMPRE, y reintenta en cada uno mientras el contexto no corra. Hace falta siempre y no sólo
 * la primera vez: en el iPhone, una llamada entrante deja el contexto «interrumpido» y reanudarlo fuera
 * de un toque falla. `touchend` está porque los Safari de hace unos años sólo aceptaban ése.
 *
 * Al pasar a segundo plano el motor SUSPENDE el contexto, y lo reanuda al volver. Sin eso, en la app
 * (un WebView) la música seguiría sonando con la app minimizada, y el planificador, con el temporizador
 * frenado a un disparo por segundo, la tocaría a trompicones.
 *
 * ═══ LA LATENCIA DEL PROPIO GRAFO, MEDIDA Y NO SUPUESTA ═══
 *
 * El reloj (`cuentas.ts`) dice cuándo SALE por el altavoz una muestra del contexto. Pero lo que se
 * programa en una fuente no sale en esa muestra: antes cruza el grafo, y el grafo tiene su propio
 * retraso. El compresor y el limitador de la salida miran unos milisegundos por delante (en Chrome,
 * unos 6 ms cada uno: la autoprueba del banco lo destapó al oír el silbido y el tic-tac de la música
 * 12 ms tarde, fuera de línea y con panoramizador de igual potencia), el HRTF añade el suyo (con él,
 * 18 ms en total en el Chrome del banco), y cada navegador tiene su cifra. Suponerla sería escribir un
 * número de un navegador en el código de todos.
 *
 * Así que al crearse (y al cambiar de calidad) el motor MIDE su grafo: monta en una
 * `OfflineAudioContext` el mismo motor con la misma calidad, suelta un impulso por cada camino y busca
 * dónde sale. Cuesta dos renders de 150 ms de audio, se hace sin altavoz y en segundo plano, y la
 * Bajada (6 s) lo tapa de sobra. Desde ahí, `aContexto` y `aOido` descuentan la latencia del camino por
 * el que va cada cosa: el silbido muere en el impacto OÍDO, y el pulso que se publica es el que se OYE.
 *
 * ═══ EL INTERRUPTOR DE SILENCIO DEL IPHONE ═══
 *
 * En iOS, WebAudio calla con el interruptor lateral de silencio y el contexto sigue diciendo que
 * corre: no hay forma de saberlo desde la página. Lo único honrado es avisar (diseño §9) y eso lo hace
 * el HUD con `puedeCallarElInterruptor` y `estado()`. Existe `navigator.audioSession` en los Safari
 * recientes para pedir la sesión de «reproducción», que suena con el interruptor puesto; se deja como
 * opción explícita (`sesionDeReproduccion()`) porque saltarse el interruptor de alguien sin que lo pida
 * no es una decisión de un motor de sonido.
 */
import {
  ALCANCES,
  aContexto,
  aOido,
  BIS,
  caidaDelPerfil,
  corteDelAire,
  distancia,
  medirElReloj,
  olvidarElReloj,
  planDelBis,
  relojNuevo,
  unidad,
} from './cuentas';
import type { FuenteDelReloj, MuestraDelReloj, NombreDeAlcance, PerfilDeAlcance, PlanDelBis, Punto3, RelojDelSonido } from './cuentas';
import { azarSembrado, CALLE_MOJADA, respuestaDeCalle, ruido } from './sintesis';
import type { ColorDeRuido, Estereo, Muestras } from './sintesis';

export type CategoriaDeSonido = 'senales' | 'efectos' | 'ambiente' | 'musica';
export const CATEGORIAS: readonly CategoriaDeSonido[] = ['senales', 'efectos', 'ambiente', 'musica'];

/** Por dónde va una voz: el mundo (lo toca el Remanso) o el camino claro (señales). */
export type Camino = 'mundo' | 'claro';

/** `alta`: panoramizador HRTF y cola larga. `baja`: panoramizador de igual potencia y cola corta. */
export type CalidadDelSonido = 'alta' | 'baja';

/**
 * Lo que el HUD necesita saber. `corriendo` NO garantiza que se oiga en un iPhone con el interruptor
 * de silencio puesto: ver `puedeCallarElInterruptor`.
 */
export type EstadoDelSonido = 'sin-audio' | 'bloqueado' | 'corriendo' | 'suspendido' | 'interrumpido' | 'cerrado';

/** Volumen de partida de cada categoría. La música, por debajo: se juega con el oído en el silbido. */
export const VOLUMENES_DE_PARTIDA: Readonly<Record<CategoriaDeSonido, number>> = {
  senales: 1,
  efectos: 0.9,
  ambiente: 0.8,
  musica: 0.55,
};

/** El retorno de la reverberación (sin Remanso). */
const RETORNO_DE_LA_CALLE = 0.3;
/** Lo que baja el mundo mientras suena una señal (−3 dB). */
const MUNDO_AGACHADO = 0.7;

export interface OpcionesDelMotor {
  /** Un contexto hecho: una `OfflineAudioContext` para la autoprueba, o uno compartido. */
  readonly contexto?: BaseAudioContext;
  readonly calidad?: CalidadDelSonido;
  readonly semilla?: number;
  /**
   * Dónde escuchar los toques que desbloquean el audio. Por defecto, `document`. `null` para no
   * escuchar nada (el llamador desbloquea a mano con `desbloquear()`).
   */
  readonly escuchar?: EventTarget | null;
  /**
   * Sólo para el motor que mide la latencia de otro (ver la cabecera): sin calle mojada (no hace falta
   * para medir un impulso seco) y sin medirse a sí mismo, que sería recurrir para siempre.
   */
  readonly calibrando?: boolean;
}

/** El constructor de `AudioContext`, con el prefijo de los Safari viejos. `null` si no hay WebAudio. */
function claseDelContexto(): (new (opciones?: AudioContextOptions) => AudioContext) | null {
  const g = globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  return g.AudioContext ?? g.webkitAudioContext ?? null;
}

/** ¿Hay WebAudio en este motor de navegador? */
export function hayWebAudio(): boolean {
  return claseDelContexto() !== null;
}

/**
 * ¿Es un iPhone o un iPad? Los iPad modernos dicen ser un Mac, y se les reconoce por el táctil. Es
 * la única detección de aparato del sonido, y existe sólo para el aviso del interruptor.
 */
export function esAparatoDeApple(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/** Un nodo que se puede desconectar: lo que se apunta en una voz para limpiarla. */
type Desconectable = Pick<AudioNode, 'disconnect'>;

/**
 * UNA VOZ: el enganche de un sonido suelto al grafo. Quien la crea conecta sus fuentes a `entrada`,
 * apunta en `nodos` todo lo que crea, y llama a `terminar(finS)` con el instante en que acaba. El
 * motor la desconecta entera un poco después. Sin esto, cada golpe dejaría media docena de nodos
 * colgando del bus para siempre.
 */
export interface Voz {
  readonly entrada: GainNode;
  readonly t: number;
  readonly nodos: Desconectable[];
  /** El panoramizador, si la voz está en el espacio. */
  readonly panoramizador: PannerNode | null;
  /** El paso bajo del aire, si la voz está en el espacio. */
  readonly aire: BiquadFilterNode | null;
  /** Si lo que suena en ella baja de tono con el Remanso. */
  readonly delMundo: boolean;
  terminar(finS: number): void;
}

export interface OpcionesDeVoz {
  readonly categoria: CategoriaDeSonido;
  readonly camino: Camino;
  /** Dónde suena. Sin posición, suena «en la cabeza» (lo que hace el propio jugador). */
  readonly posicion?: Punto3 | null;
  readonly alcance?: NombreDeAlcance;
  /** Envío a la calle mojada, 0..1. */
  readonly reverberacion?: number;
  readonly ganancia?: number;
  /** Cuándo empieza (contexto). Por defecto, ahora. */
  readonly t?: number;
}

/** Algo que se mueve con el oyente: el aire que se apaga con la distancia hay que recalcularlo. */
interface Seguidor {
  readonly posicion: () => Punto3 | null;
  readonly aire: BiquadFilterNode;
  /** El envío a la calle mojada, si lo lleva: cae con la raíz de la ganancia de distancia (ver `voz`). */
  readonly envio?: EnvioQueSigue;
}

/** Un envío a la reverberación que se rehace con la distancia: `base · √g(d)` con el perfil dado. */
export interface EnvioQueSigue {
  readonly ganancia: GainNode;
  readonly base: number;
  readonly perfil: PerfilDeAlcance;
}

/** El nivel de un envío a la calle a `d` metros: la raíz de la ganancia directa (ver `voz`). */
export function envioADistancia(base: number, perfil: PerfilDeAlcance, d: number): number {
  return base * Math.sqrt(perfil.refM / (perfil.refM + caidaDelPerfil(perfil) * Math.max(0, d - perfil.refM)));
}

export class MotorDelSonido {
  readonly ctx: BaseAudioContext;
  /** `true` con un `AudioContext` de verdad; `false` con uno fuera de línea (la autoprueba). */
  readonly enVivo: boolean;
  readonly puedeCallarElInterruptor: boolean;
  /** El generador de las variaciones (qué cristal, cuánto se desafina un paso…). */
  readonly azar: () => number;

  /** Fuente constante en cents enchufada al `detune` de todo lo del mundo. Ver la cabecera. */
  readonly tonoDelMundo: ConstantSourceNode;
  /** Entrada de la reverberación. */
  readonly envio: GainNode;
  /** Retorno de la reverberación (el Remanso lo sube). */
  readonly retorno: GainNode;
  readonly filtroDelRemanso: BiquadFilterNode;
  readonly mundo: GainNode;
  readonly agachado: GainNode;
  readonly mezcla: GainNode;
  readonly maestro: GainNode;

  /** Las cuatro puertas del Bis (ver `planDelBis` en `cuentas.ts`). */
  readonly puertas: Readonly<Record<'entrada' | 'lazo' | 'repeticion' | 'vivo', GainNode>>;
  readonly lineaDelBis: DelayNode;

  private calidadActual: CalidadDelSonido;
  private readonly convolutor: ConvolverNode;
  private readonly buses: Record<CategoriaDeSonido, Record<Camino, GainNode>>;
  private readonly volumenes: Record<CategoriaDeSonido, number> = { ...VOLUMENES_DE_PARTIDA };
  private volumenMaestro = 1;
  private mudo = false;
  private reloj: RelojDelSonido;
  private readonly bufers = new Map<string, AudioBuffer>();
  private readonly activas = new Map<string, number[]>();
  private readonly seguidores = new Set<Seguidor>();
  private readonly avisos = new Set<(estado: EstadoDelSonido) => void>();
  private readonly tics = new Set<(ahoraS: number) => void>();
  private oyentePosicion: Punto3 = { x: 0, y: 1.7, z: 0 };
  private oyenteMirada: Punto3 = { x: 0, y: 0, z: -1 };
  private agachadoHasta = 0;
  private yaCorrio = false;
  private suspendidoPorMi = false;
  private temporizador: ReturnType<typeof setInterval> | null = null;
  private vueltas = 0;
  private ultimoEstado: EstadoDelSonido;
  private readonly soltar: (() => void)[] = [];
  private destruido = false;
  /** Hasta cuándo (contexto) está ocupada la cinta del Bis. */
  private bisHasta = 0;
  /** La latencia propia del grafo por camino, en segundos (ver la cabecera). 0 hasta que se mide. */
  private readonly latencias: Record<Camino, number> = { mundo: 0, claro: 0 };
  private calibracion: Promise<void> = Promise.resolve();
  private readonly calibrando: boolean;

  constructor(opciones: OpcionesDelMotor = {}) {
    const Clase = claseDelContexto();
    if (opciones.contexto !== undefined) {
      this.ctx = opciones.contexto;
    } else if (Clase !== null) {
      this.ctx = new Clase({ latencyHint: 'interactive' });
    } else {
      throw new Error('Este navegador no tiene WebAudio: usa `hayWebAudio()` antes de crear el motor.');
    }
    this.enVivo = typeof AudioContext !== 'undefined' ? this.ctx instanceof AudioContext : Clase !== null && this.ctx instanceof Clase;
    this.puedeCallarElInterruptor = this.enVivo && esAparatoDeApple();
    this.azar = azarSembrado(opciones.semilla ?? 0x51b0);
    this.calidadActual = opciones.calidad ?? 'alta';
    this.calibrando = opciones.calibrando === true;
    const fuente: FuenteDelReloj = this.enVivo && typeof (this.ctx as AudioContext).getOutputTimestamp === 'function' ? 'marca-de-salida' : 'reloj-del-contexto';
    /*
     * Fuera de línea no hay altavoz ni `performance.now()` que casar: el «oído» es el propio reloj del
     * contexto en milisegundos. Así la autoprueba pide un anillo con impacto en 800 ms y lo busca en la
     * muestra 800 ms del búfer.
     */
    this.reloj = this.enVivo ? relojNuevo(fuente) : medirElReloj(relojNuevo('marca-de-salida'), { contextoS: 0, oidoMs: 0 });

    const ctx = this.ctx;
    // ── La salida: mezcla → compresor → maestro → limitador → altavoz ────────────────────────────────
    this.mezcla = ctx.createGain();
    const compresor = ctx.createDynamicsCompressor();
    compresor.threshold.value = -18;
    compresor.knee.value = 12;
    compresor.ratio.value = 3.5;
    compresor.attack.value = 0.004;
    compresor.release.value = 0.22;
    this.maestro = ctx.createGain();
    this.maestro.gain.value = 0.9;
    const limitador = ctx.createDynamicsCompressor();
    limitador.threshold.value = -2;
    limitador.knee.value = 0;
    limitador.ratio.value = 20;
    limitador.attack.value = 0.001;
    limitador.release.value = 0.08;
    this.mezcla.connect(compresor);
    compresor.connect(this.maestro);
    this.maestro.connect(limitador);
    limitador.connect(ctx.destination);

    // ── El mundo: agachado y el filtro del Remanso ───────────────────────────────────────────────────
    this.mundo = ctx.createGain();
    this.agachado = ctx.createGain();
    this.filtroDelRemanso = ctx.createBiquadFilter();
    this.filtroDelRemanso.type = 'lowpass';
    this.filtroDelRemanso.frequency.value = 18000;
    this.filtroDelRemanso.Q.value = 1;
    this.mundo.connect(this.agachado);
    this.agachado.connect(this.filtroDelRemanso);
    this.filtroDelRemanso.connect(this.mezcla);

    // ── La calle mojada ──────────────────────────────────────────────────────────────────────────────
    this.envio = ctx.createGain();
    this.convolutor = ctx.createConvolver();
    this.retorno = ctx.createGain();
    this.retorno.gain.value = RETORNO_DE_LA_CALLE;
    if (!this.calibrando) this.convolutor.buffer = this.respuestaDeLaCalle();
    this.envio.connect(this.convolutor);
    this.convolutor.connect(this.retorno);
    this.retorno.connect(this.mundo);

    // ── El tono del mundo ────────────────────────────────────────────────────────────────────────────
    this.tonoDelMundo = ctx.createConstantSource();
    this.tonoDelMundo.offset.value = 0;
    this.tonoDelMundo.start();

    // ── Los buses por categoría y camino ─────────────────────────────────────────────────────────────
    const hacerBus = (categoria: CategoriaDeSonido): Record<Camino, GainNode> => {
      const mundo = ctx.createGain();
      const claro = ctx.createGain();
      mundo.gain.value = this.volumenes[categoria];
      claro.gain.value = this.volumenes[categoria];
      claro.connect(this.mezcla);
      return { mundo, claro };
    };
    this.buses = { senales: hacerBus('senales'), efectos: hacerBus('efectos'), ambiente: hacerBus('ambiente'), musica: hacerBus('musica') };
    this.buses.senales.mundo.connect(this.mundo);
    this.buses.efectos.mundo.connect(this.mundo);
    this.buses.musica.mundo.connect(this.mundo);

    /*
     * ── EL BIS: el ambiente pasa por una línea de un segundo que lo graba siempre ─────────────────────
     *
     * ambiente ─▶ vivo ─────────────────────────────▶ MUNDO
     *    └──────▶ entrada ─▶ línea (1 s) ─▶ repetición ─▶ MUNDO
     *                          ▲    └──▶ paso bajo ─▶ lazo ─┘ (vuelve a la línea)
     *
     * El paso bajo del lazo gasta la cinta: cada vuelta sale un poco más oscura. Y un temblor de ±1,5 ms
     * en el retardo (sólo durante el Bis) le da el vaivén de una cinta mal tensada.
     */
    const vivo = ctx.createGain();
    const entrada = ctx.createGain();
    const lazo = ctx.createGain();
    const repeticion = ctx.createGain();
    entrada.gain.value = 1;
    lazo.gain.value = 0;
    repeticion.gain.value = 0;
    this.lineaDelBis = ctx.createDelay(2);
    this.lineaDelBis.delayTime.value = BIS.tramoS;
    const gastado = ctx.createBiquadFilter();
    gastado.type = 'lowpass';
    gastado.frequency.value = 5200;
    this.buses.ambiente.mundo.connect(vivo);
    vivo.connect(this.mundo);
    this.buses.ambiente.mundo.connect(entrada);
    entrada.connect(this.lineaDelBis);
    this.lineaDelBis.connect(repeticion);
    repeticion.connect(this.mundo);
    this.lineaDelBis.connect(gastado);
    gastado.connect(lazo);
    lazo.connect(this.lineaDelBis);
    this.puertas = { entrada, lazo, repeticion, vivo };

    /*
     * En vivo se parte de `bloqueado` aunque el navegador ya lo deje correr (Chrome lo permite si la
     * página ya recibió un toque): así `notificar()` ve el paso a `corriendo` y arranca el temporizador
     * y la primera medida, en vez de darlos por hechos.
     */
    this.ultimoEstado = this.enVivo ? 'bloqueado' : this.calcularEstado();
    if (!this.calibrando) this.calibracion = this.calibrar();
    if (this.enVivo) this.enchufarAlNavegador(opciones.escuchar === undefined ? (typeof document === 'undefined' ? null : document) : opciones.escuchar);
  }

  // ═══ Reloj ══════════════════════════════════════════════════════════════════════════════════════

  /** El instante actual del contexto. */
  ahora(): number {
    return this.ctx.currentTime;
  }

  /** Toma una medida de los dos relojes (ver `cuentas.ts`). Sólo en vivo y con el contexto corriendo. */
  medir(): void {
    if (!this.enVivo || this.ctx.state !== 'running') return;
    const muestra = this.muestraDelReloj();
    if (muestra !== null) this.reloj = medirElReloj(this.reloj, muestra);
  }

  private muestraDelReloj(): MuestraDelReloj | null {
    const ctx = this.ctx as AudioContext;
    if (this.reloj.fuente === 'marca-de-salida') {
      const m = ctx.getOutputTimestamp();
      const contexto = m.contextTime ?? 0;
      const actuacion = m.performanceTime ?? 0;
      // Recién arrancado, algunos motores dan ceros durante un par de bloques: no es una medida.
      if (contexto > 0 && actuacion > 0) return { contextoS: contexto, oidoMs: actuacion };
      return null;
    }
    const latencia = (ctx.outputLatency || ctx.baseLatency || 0) * 1000;
    return { contextoS: ctx.currentTime, oidoMs: performance.now() + latencia };
  }

  /**
   * El instante del contexto en que hay que programar algo que va por `camino` para que se OIGA en
   * `oidoMs` (ms de `performance.now()`): el reloj y, además, la latencia medida del grafo.
   */
  aContexto(oidoMs: number, camino: Camino): number | null {
    const t = aContexto(this.reloj, oidoMs);
    return t === null ? null : t - this.latencias[camino];
  }

  /** Cuándo se oye (ms de `performance.now()`) lo programado en `contextoS` por `camino`. */
  aOido(contextoS: number, camino: Camino): number | null {
    const ms = aOido(this.reloj, contextoS);
    return ms === null ? null : ms + this.latencias[camino] * 1000;
  }

  /** La latencia medida del grafo por un camino, en segundos. */
  latencia(camino: Camino): number {
    return this.latencias[camino];
  }

  /** Se cumple cuando el motor ha medido su grafo. La autoprueba lo espera; el juego tiene la Bajada. */
  listo(): Promise<void> {
    return this.calibracion;
  }

  /**
   * MIDE LA LATENCIA DEL GRAFO (ver la cabecera): un impulso por cada camino, en un motor gemelo fuera
   * de línea, con la misma frecuencia de muestreo y la misma calidad. Sin `OfflineAudioContext` se
   * queda en cero, que es lo que había antes de medir.
   */
  private async calibrar(): Promise<void> {
    const Fuera = (globalThis as { OfflineAudioContext?: typeof OfflineAudioContext }).OfflineAudioContext;
    if (Fuera === undefined) return;
    const sr = this.ctx.sampleRate;
    const calidad = this.calidadActual;
    const salidaS = 0.02;
    for (const camino of ['claro', 'mundo'] as const) {
      try {
        const fuera = new Fuera({ numberOfChannels: 2, length: Math.round(0.15 * sr), sampleRate: sr });
        const gemelo = new MotorDelSonido({ contexto: fuera, calidad, calibrando: true });
        const v = gemelo.voz({ categoria: camino === 'claro' ? 'senales' : 'efectos', camino, posicion: { x: 0, y: 1.7, z: -3 }, alcance: 'senal', t: salidaS });
        const impulso = fuera.createBuffer(1, 1, sr);
        impulso.getChannelData(0)[0] = 0.5;
        const fuente = fuera.createBufferSource();
        fuente.buffer = impulso;
        fuente.connect(v.entrada);
        fuente.start(salidaS);
        const b = await fuera.startRendering();
        let donde = -1;
        let mayor = 0;
        for (let c = 0; c < b.numberOfChannels; c++) {
          const datos = b.getChannelData(c);
          for (let i = 0; i < datos.length; i++) {
            const valor = Math.abs(datos[i] ?? 0);
            if (valor > mayor) {
              mayor = valor;
              donde = i;
            }
          }
        }
        // Una calidad cambiada mientras se medía deja esta medida vieja: se descarta.
        if (donde >= 0 && calidad === this.calidadActual) this.latencias[camino] = Math.max(0, donde / sr - salidaS);
      } catch {
        // Si el navegador no deja medir, se queda la latencia que hubiera (cero de salida).
      }
    }
  }

  /** El reloj entero, para el pulso y el diagnóstico. */
  relojActual(): RelojDelSonido {
    return this.reloj;
  }

  /** Engancha una función al temporizador del planificador (cada 25 ms, sólo con el contexto en marcha). */
  alTic(f: (ahoraS: number) => void): () => void {
    this.tics.add(f);
    return () => this.tics.delete(f);
  }

  /**
   * Un tic a mano: lo que hace el temporizador en vivo. La autoprueba fuera de línea lo llama con el
   * instante hasta el que quiere que se programe, porque allí no hay temporizador que valga.
   */
  ticManual(ahoraS: number): void {
    for (const f of this.tics) f(ahoraS);
  }

  // ═══ Estado y desbloqueo ════════════════════════════════════════════════════════════════════════

  private calcularEstado(): EstadoDelSonido {
    const estado = this.ctx.state as string;
    if (estado === 'closed' || this.destruido) return 'cerrado';
    if (estado === 'running') return 'corriendo';
    if (estado === 'interrupted') return 'interrumpido';
    return this.yaCorrio ? 'suspendido' : 'bloqueado';
  }

  estado(): EstadoDelSonido {
    return this.calcularEstado();
  }

  alCambiar(avisar: (estado: EstadoDelSonido) => void): () => void {
    this.avisos.add(avisar);
    return () => this.avisos.delete(avisar);
  }

  private notificar(): void {
    const estado = this.calcularEstado();
    if (estado === 'corriendo' && !this.yaCorrio) this.yaCorrio = true;
    if (estado === this.ultimoEstado) return;
    const antes = this.ultimoEstado;
    this.ultimoEstado = estado;
    if (estado === 'corriendo') {
      /*
       * Vuelve a correr: el reloj del audio estuvo parado, así que el desfase de antes ya no vale. Se
       * olvida y se mide en el acto, para que un anillo que llegue en este mismo fotograma ya caiga
       * donde toca.
       */
      this.reloj = olvidarElReloj(this.reloj);
      this.medir();
      this.arrancarElTemporizador();
    } else if (antes === 'corriendo') {
      this.pararElTemporizador();
    }
    for (const f of this.avisos) f(estado);
  }

  /**
   * DESBLOQUEA el audio. Hay que llamarlo DENTRO de un gesto (el `pointerdown` de BAJAR): `resume()`
   * fuera de un gesto no hace nada en Safari. Toca además un búfer mudo de una muestra, que es el
   * truco de siempre para los Safari que no se daban por desbloqueados sólo con `resume()`.
   * Devuelve si el contexto corre al acabar.
   */
  async desbloquear(): Promise<boolean> {
    if (!this.enVivo || this.destruido) return this.ctx.state === 'running';
    const ctx = this.ctx as AudioContext;
    if (ctx.state === 'closed') return false;
    try {
      const mudo = ctx.createBuffer(1, 1, ctx.sampleRate);
      const fuente = ctx.createBufferSource();
      fuente.buffer = mudo;
      fuente.connect(ctx.destination);
      fuente.start(0);
    } catch {
      // Sin importancia: es el truco, no el desbloqueo.
    }
    if (ctx.state !== 'running') {
      try {
        await ctx.resume();
      } catch {
        // Fuera de un gesto o en mitad de una llamada: se reintenta en el próximo toque.
      }
    }
    this.notificar();
    return ctx.state === 'running';
  }

  /**
   * PIDE LA SESIÓN DE REPRODUCCIÓN en los Safari que la tienen (`navigator.audioSession`): suena con el
   * interruptor de silencio puesto. Sólo si la persona lo pide (ver la cabecera). Devuelve si se pudo.
   */
  sesionDeReproduccion(): boolean {
    const nav = (typeof navigator === 'undefined' ? null : navigator) as (Navigator & { audioSession?: { type: string } }) | null;
    if (nav?.audioSession === undefined) return false;
    try {
      nav.audioSession.type = 'playback';
      return true;
    } catch {
      return false;
    }
  }

  private enchufarAlNavegador(escuchar: EventTarget | null): void {
    const ctx = this.ctx as AudioContext;
    ctx.addEventListener('statechange', () => this.notificar());
    if (escuchar !== null) {
      const intento = (): void => {
        if (ctx.state === 'running' || ctx.state === 'closed') return;
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        void this.desbloquear();
      };
      for (const tipo of ['pointerdown', 'touchend', 'keydown', 'mousedown']) {
        escuchar.addEventListener(tipo, intento, { capture: true, passive: true });
        this.soltar.push(() => escuchar.removeEventListener(tipo, intento, { capture: true }));
      }
    }
    if (typeof document !== 'undefined') {
      const alCambiarLaVisibilidad = (): void => {
        if (document.visibilityState === 'hidden') {
          if (ctx.state === 'running') {
            this.suspendidoPorMi = true;
            void ctx.suspend().catch(() => undefined);
          }
        } else if (this.suspendidoPorMi || this.yaCorrio) {
          this.suspendidoPorMi = false;
          // Puede fallar fuera de un gesto (iOS tras una llamada): el próximo toque lo reintenta.
          void ctx.resume().catch(() => undefined);
        }
      };
      document.addEventListener('visibilitychange', alCambiarLaVisibilidad);
      this.soltar.push(() => document.removeEventListener('visibilitychange', alCambiarLaVisibilidad));
    }
    this.notificar();
  }

  private arrancarElTemporizador(): void {
    if (this.temporizador !== null || !this.enVivo) return;
    this.vueltas = 0;
    /*
     * 25 ms: el temporizador del planificador (ver `cuentas.ts`). También mide los relojes, una vez de
     * cada cuatro vueltas (diez medidas por segundo): la ventana de quince cubre un segundo y medio.
     */
    this.temporizador = setInterval(() => {
      if (this.ctx.state !== 'running') return;
      if (this.vueltas++ % 4 === 0) this.medir();
      const ahora = this.ctx.currentTime;
      for (const f of this.tics) f(ahora);
    }, 25);
  }

  private pararElTemporizador(): void {
    if (this.temporizador !== null) clearInterval(this.temporizador);
    this.temporizador = null;
  }

  // ═══ Volúmenes y calidad ════════════════════════════════════════════════════════════════════════

  bus(categoria: CategoriaDeSonido, camino: Camino): GainNode {
    return this.buses[categoria][camino];
  }

  volumen(categoria: CategoriaDeSonido | 'maestro', valor: number): void {
    const v = Math.max(0, Math.min(1.5, Number.isFinite(valor) ? valor : 0));
    const ahora = this.ctx.currentTime;
    if (categoria === 'maestro') {
      this.volumenMaestro = v;
      this.maestro.gain.setTargetAtTime(this.mudo ? 0 : 0.9 * v, ahora, 0.03);
      return;
    }
    this.volumenes[categoria] = v;
    this.buses[categoria].mundo.gain.setTargetAtTime(v, ahora, 0.03);
    this.buses[categoria].claro.gain.setTargetAtTime(v, ahora, 0.03);
  }

  volumenDe(categoria: CategoriaDeSonido | 'maestro'): number {
    return categoria === 'maestro' ? this.volumenMaestro : this.volumenes[categoria];
  }

  silenciar(si: boolean): void {
    this.mudo = si;
    this.maestro.gain.setTargetAtTime(si ? 0 : 0.9 * this.volumenMaestro, this.ctx.currentTime, 0.02);
  }

  silenciado(): boolean {
    return this.mudo;
  }

  calidad(): CalidadDelSonido {
    return this.calidadActual;
  }

  /** Cambia la calidad: los panoramizadores nuevos usan el modelo nuevo, y la cola se rehace. */
  ponerCalidad(calidad: CalidadDelSonido): void {
    if (calidad === this.calidadActual) return;
    this.calidadActual = calidad;
    this.convolutor.buffer = this.respuestaDeLaCalle();
    // El HRTF no tarda lo mismo que la igual potencia: se vuelve a medir.
    if (!this.calibrando) this.calibracion = this.calibrar();
  }

  private respuestaDeLaCalle(): AudioBuffer {
    const baja = this.calidadActual === 'baja';
    return this.bufer(baja ? 'calle-corta' : 'calle', (sr) =>
      respuestaDeCalle(sr, baja ? { ...CALLE_MOJADA, duracionS: 1.3 } : CALLE_MOJADA),
    );
  }

  /** El retorno de la calle mojada, multiplicado. El Remanso lo sube: el mundo se aleja. */
  ponerHumedad(multiplicador: number): void {
    const k = Number.isFinite(multiplicador) ? Math.max(0, multiplicador) : 1;
    this.retorno.gain.setTargetAtTime(RETORNO_DE_LA_CALLE * k, this.ctx.currentTime, 0.08);
  }

  // ═══ Búferes ════════════════════════════════════════════════════════════════════════════════════

  /** Un búfer calculado una vez y guardado por `clave`. `fabricar` recibe la frecuencia de muestreo. */
  bufer(clave: string, fabricar: (frecuenciaDeMuestreo: number) => Muestras | Estereo): AudioBuffer {
    const hecho = this.bufers.get(clave);
    if (hecho !== undefined) return hecho;
    const sr = this.ctx.sampleRate;
    const datos = fabricar(sr);
    const canales: readonly Muestras[] = datos instanceof Float32Array ? [datos] : datos;
    const largo = Math.max(1, canales[0]?.length ?? 1);
    const b = this.ctx.createBuffer(canales.length, largo, sr);
    canales.forEach((c, i) => b.copyToChannel(c, i));
    this.bufers.set(clave, b);
    return b;
  }

  /** ¿Está ya fabricado este búfer? (Para calentar sin repetir.) */
  tieneBufer(clave: string): boolean {
    return this.bufers.has(clave);
  }

  /** Dos segundos de ruido de color, en bucle. */
  ruido(color: ColorDeRuido): AudioBuffer {
    return this.bufer(`ruido-${color}`, (sr) => ruido(color, Math.round(sr * 2), color === 'blanco' ? 11 : color === 'rosa' ? 23 : 37));
  }

  // ═══ Voces ══════════════════════════════════════════════════════════════════════════════════════

  /**
   * ¿Cabe otra voz de esta clave? Cada sonido declara un tope de voces a la vez (los pasos, ocho; los
   * cristales, tres…). Pasado el tope, la voz nueva NO suena: con seis Prestados cayendo a la vez, el
   * séptimo golpe no se echa de menos y el octavo satura el compresor.
   */
  admitir(clave: string, tope: number, finS: number): boolean {
    const ahora = this.ctx.currentTime;
    const vivas = (this.activas.get(clave) ?? []).filter((f) => f > ahora);
    if (vivas.length >= tope) {
      this.activas.set(clave, vivas);
      return false;
    }
    vivas.push(finS);
    this.activas.set(clave, vivas);
    return true;
  }

  /** Cuántas voces siguen sonando, sumando todas las claves (para el diagnóstico). */
  vocesActivas(): number {
    const ahora = this.ctx.currentTime;
    let n = 0;
    for (const lista of this.activas.values()) n += lista.filter((f) => f > ahora).length;
    return n;
  }

  /** Crea un panoramizador para un perfil de alcance, ya colocado. */
  panoramizador(posicion: Punto3, perfil: PerfilDeAlcance): PannerNode {
    const p = this.ctx.createPanner();
    p.panningModel = this.calidadActual === 'alta' ? 'HRTF' : 'equalpower';
    p.distanceModel = 'inverse';
    p.refDistance = perfil.refM;
    p.rolloffFactor = caidaDelPerfil(perfil);
    p.maxDistance = 10000;
    colocar(p, posicion, this.ctx.currentTime, 0);
    return p;
  }

  /** Abre una voz (ver `Voz`). */
  voz(opciones: OpcionesDeVoz): Voz {
    const ctx = this.ctx;
    const t = Math.max(opciones.t ?? ctx.currentTime, ctx.currentTime);
    const entrada = ctx.createGain();
    entrada.gain.value = opciones.ganancia ?? 1;
    const nodos: Desconectable[] = [entrada];
    const destino = this.buses[opciones.categoria][opciones.camino];
    let panoramizador: PannerNode | null = null;
    let aire: BiquadFilterNode | null = null;
    let gananciaDeDistancia = 1;
    const posicion = opciones.posicion ?? null;
    if (posicion !== null) {
      const perfil = ALCANCES[opciones.alcance ?? 'golpe'];
      const d = distancia(posicion, this.oyentePosicion);
      aire = ctx.createBiquadFilter();
      aire.type = 'lowpass';
      aire.frequency.value = corteDelAire(d);
      aire.Q.value = 0.5;
      panoramizador = this.panoramizador(posicion, perfil);
      entrada.connect(aire);
      aire.connect(panoramizador);
      panoramizador.connect(destino);
      nodos.push(aire, panoramizador);
      gananciaDeDistancia = envioADistancia(1, perfil, d);
    } else {
      entrada.connect(destino);
    }
    const reverberacion = opciones.reverberacion ?? 0;
    if (reverberacion > 0) {
      /*
       * El envío sale ANTES del panoramizador (la cola de una calle viene de todas partes) y cae con
       * la raíz de la distancia, no con la distancia: lo lejano suena más «a calle» que lo cercano, que
       * es la pista de distancia que el oído usa de verdad.
       */
      const envio = ctx.createGain();
      envio.gain.value = reverberacion * gananciaDeDistancia;
      entrada.connect(envio);
      envio.connect(this.envio);
      nodos.push(envio);
    }
    const motor = this;
    return {
      entrada,
      t,
      nodos,
      panoramizador,
      aire,
      delMundo: opciones.camino === 'mundo',
      terminar(finS: number): void {
        if (!motor.enVivo) return;
        const espera = Math.max(0, finS - motor.ctx.currentTime) * 1000 + 250;
        setTimeout(() => {
          for (const n of nodos) {
            try {
              n.disconnect();
            } catch {
              // Ya desconectado.
            }
          }
        }, espera);
      },
    };
  }

  /**
   * Apunta un sonido que se mueve, para rehacer su aire cuando se mueva el oyente. Con `hastaS`, se
   * suelta solo cuando el sonido acaba; sin él, hasta que se llame a lo que devuelve.
   */
  seguir(posicion: () => Punto3 | null, aire: BiquadFilterNode, hastaS?: number, envio?: EnvioQueSigue): () => void {
    const s: Seguidor = envio === undefined ? { posicion, aire } : { posicion, aire, envio };
    this.seguidores.add(s);
    const soltar = (): void => {
      this.seguidores.delete(s);
    };
    if (hastaS !== undefined && this.enVivo) setTimeout(soltar, Math.max(0, hastaS - this.ctx.currentTime) * 1000 + 100);
    return soltar;
  }

  /** Enchufa el tono del mundo al `detune` de una fuente, si la voz es del mundo. */
  afinar(voz: Voz, parametro: AudioParam | undefined): void {
    if (voz.delMundo && parametro !== undefined) this.tonoDelMundo.connect(parametro);
  }

  /** Posición del oyente (la cámara). */
  oyente(): Punto3 {
    return this.oyentePosicion;
  }

  /**
   * EL OYENTE SIGUE A LA CÁMARA. Se llama en cada fotograma, pero sólo toca los parámetros si la
   * cámara se ha movido un centímetro o girado medio grado: cada llamada es un evento en la línea de
   * tiempo de nueve parámetros, y sesenta por segundo sin cambios es basura que el hilo de audio tiene
   * que recorrer.
   */
  ponerOyente(posicion: Punto3, mirada: Punto3, arriba: Punto3 = { x: 0, y: 1, z: 0 }): void {
    const m = unidad(mirada);
    const a = unidad(arriba);
    if (m === null || a === null || !Number.isFinite(posicion.x + posicion.y + posicion.z)) return;
    const movido = distancia(posicion, this.oyentePosicion) > 0.01;
    const girado = m.x * this.oyenteMirada.x + m.y * this.oyenteMirada.y + m.z * this.oyenteMirada.z < 0.99996;
    if (!movido && !girado) return;
    this.oyentePosicion = { x: posicion.x, y: posicion.y, z: posicion.z };
    this.oyenteMirada = m;
    const l = this.ctx.listener;
    const t = this.ctx.currentTime;
    if (l.positionX !== undefined) {
      const suave = 0.015;
      l.positionX.setTargetAtTime(posicion.x, t, suave);
      l.positionY.setTargetAtTime(posicion.y, t, suave);
      l.positionZ.setTargetAtTime(posicion.z, t, suave);
      l.forwardX.setTargetAtTime(m.x, t, suave);
      l.forwardY.setTargetAtTime(m.y, t, suave);
      l.forwardZ.setTargetAtTime(m.z, t, suave);
      l.upX.setTargetAtTime(a.x, t, suave);
      l.upY.setTargetAtTime(a.y, t, suave);
      l.upZ.setTargetAtTime(a.z, t, suave);
    } else {
      // Los Safari viejos sólo tienen los métodos, sin parámetros.
      const viejo = l as AudioListener & {
        setPosition?: (x: number, y: number, z: number) => void;
        setOrientation?: (x: number, y: number, z: number, ux: number, uy: number, uz: number) => void;
      };
      viejo.setPosition?.(posicion.x, posicion.y, posicion.z);
      viejo.setOrientation?.(m.x, m.y, m.z, a.x, a.y, a.z);
    }
    if (movido) {
      for (const s of this.seguidores) {
        const p = s.posicion();
        if (p === null) continue;
        const d = distancia(p, this.oyentePosicion);
        s.aire.frequency.setTargetAtTime(corteDelAire(d), t, 0.1);
        if (s.envio !== undefined) s.envio.ganancia.gain.setTargetAtTime(envioADistancia(s.envio.base, s.envio.perfil, d), t, 0.1);
      }
    }
  }

  /**
   * AGACHA EL MUNDO entre `desdeS` y `hastaS` (ver la cabecera). Si ya estaba agachado hasta más
   * tarde, se queda hasta lo más tarde: dos silbidos que se solapan no levantan el mundo en mitad del
   * segundo.
   */
  agachar(desdeS: number, hastaS: number): void {
    const desde = Math.max(desdeS, this.ctx.currentTime);
    const hasta = Math.max(hastaS, this.agachadoHasta);
    this.agachadoHasta = hasta;
    const g = this.agachado.gain;
    g.cancelScheduledValues(desde);
    g.setTargetAtTime(MUNDO_AGACHADO, desde, 0.03);
    g.setTargetAtTime(1, hasta, 0.15);
  }

  // ═══ El Bis ═════════════════════════════════════════════════════════════════════════════════════

  /**
   * PROGRAMA EL BIS en el instante `t0` (contexto): lo que sonó en el último segundo se repite
   * `repeticiones` veces. Devuelve el plan (para que el cliente cuadre las farolas y las palomas con
   * cada repetición). `null` si hay otro Bis sonando: dos a la vez se pisarían las puertas.
   */
  programarElBis(t0: number, repeticiones: number): PlanDelBis | null {
    if (t0 < this.bisHasta) return null;
    const plan = planDelBis(t0, BIS.tramoS, repeticiones);
    this.bisHasta = plan.fin + BIS.subidaDelVivoS;
    for (const nombre of ['entrada', 'lazo', 'repeticion', 'vivo'] as const) {
      const p = this.puertas[nombre].gain;
      p.cancelScheduledValues(t0 - BIS.cruceS * 2);
      for (const o of plan.ordenes) {
        if (o.puerta !== nombre) continue;
        if (o.modo === 'fijar') p.setValueAtTime(o.valor, o.t);
        else p.linearRampToValueAtTime(o.valor, o.t);
      }
    }
    // El vaivén de la cinta: ±1,5 ms a 4,5 Hz sobre el retardo, sólo mientras dura.
    const vaiven = this.ctx.createOscillator();
    const hondo = this.ctx.createGain();
    vaiven.frequency.value = 4.5;
    hondo.gain.value = 0.0015;
    vaiven.connect(hondo);
    hondo.connect(this.lineaDelBis.delayTime);
    vaiven.start(t0);
    vaiven.stop(plan.fin);
    vaiven.onended = () => {
      vaiven.disconnect();
      hondo.disconnect();
    };
    return plan;
  }

  // ═══ Final ══════════════════════════════════════════════════════════════════════════════════════

  destruir(): void {
    if (this.destruido) return;
    this.destruido = true;
    this.pararElTemporizador();
    for (const f of this.soltar) f();
    this.soltar.length = 0;
    this.tics.clear();
    this.seguidores.clear();
    if (this.enVivo) void (this.ctx as AudioContext).close().catch(() => undefined);
    for (const f of this.avisos) f('cerrado');
    this.avisos.clear();
  }
}

/**
 * Coloca un panoramizador en `p`, en el instante `t`. Con `suave` > 0, se desliza hasta allí (para lo
 * que se mueve cada fotograma: saltar de golpe en un HRTF da un chasquido).
 */
export function colocar(panoramizador: PannerNode, p: Punto3, t: number, suave: number): void {
  if (!Number.isFinite(p.x + p.y + p.z)) return;
  if (panoramizador.positionX !== undefined) {
    if (suave > 0) {
      panoramizador.positionX.setTargetAtTime(p.x, t, suave);
      panoramizador.positionY.setTargetAtTime(p.y, t, suave);
      panoramizador.positionZ.setTargetAtTime(p.z, t, suave);
    } else {
      panoramizador.positionX.setValueAtTime(p.x, t);
      panoramizador.positionY.setValueAtTime(p.y, t);
      panoramizador.positionZ.setValueAtTime(p.z, t);
    }
  } else {
    (panoramizador as PannerNode & { setPosition?: (x: number, y: number, z: number) => void }).setPosition?.(p.x, p.y, p.z);
  }
}
