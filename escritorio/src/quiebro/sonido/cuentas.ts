/**
 * LAS CUENTAS DEL SONIDO: los dos relojes, el planificador, el silbido, el Remanso, las distancias y
 * el Bis. Todo lo que se puede equivocar en silencio, fuera de WebAudio y probado en Node.
 *
 * ═══ POR QUÉ ESTO VA APARTE ═══
 *
 * El sonido de este juego tiene una parte que es JUGABILIDAD y no adorno: el silbido del anillo
 * (diseño §9, lo primero de la lista) sube de tono hasta el instante exacto del impacto para que se
 * pueda quebrar de oído, y la música marca el pulso contra el que se juzga el «a compás». Si el
 * silbido acaba 40 ms tarde, nadie oye un fallo: oye que el juego es injusto. Y eso no lo caza
 * ninguna prueba que escuche; lo caza una que haga la cuenta.
 *
 * Así que todo lo que es una cuenta —convertir un instante de `performance.now()` al reloj del
 * `AudioContext`, decidir qué pasos de la música caen en la ventana, la curva del silbido, cuánto se
 * oye una cabina a 150 m, cuándo abre y cierra cada puerta del Bis— vive aquí, sin `window` ni
 * WebAudio, y `escritorio/scripts/verificar-quiebro-sonido.ts` lo prueba con relojes simulados.
 *
 * ═══ LOS DOS RELOJES, Y POR QUÉ NO BASTA CON RESTARLOS UNA VEZ ═══
 *
 * El juego vive en `performance.now()`: el servidor manda el instante del impacto YA TRADUCIDO al
 * reloj de cada aparato (diseño §4.3), en milisegundos de `performance.now()`. El audio vive en
 * `AudioContext.currentTime`, que es OTRO reloj: el del dispositivo de sonido. Tienen distinto origen,
 * avanzan a ritmos que difieren unas decenas de partes por millón, el del audio se PARA mientras el
 * contexto está suspendido (segundo plano, una llamada entrante), y entre «el contexto va por la
 * muestra t» y «esa muestra sale por el altavoz» pasa la latencia de salida: 10 ms en un PC, 40-200 ms
 * en un Android o con auriculares Bluetooth.
 *
 * Lo que importa es cuándo se OYE, así que el desfase que se mide es entre el instante del contexto y
 * el instante en que esa muestra suena, en milisegundos de `performance.now()`:
 *
 *     oidoMs = contextoS · 1000 + desfaseMs
 *
 * Con `getOutputTimestamp()` el navegador da esa pareja hecha (la muestra que está saliendo y cuándo).
 * Sin él, se aproxima con `currentTime` y la latencia declarada. En los dos casos se mide MUCHAS veces
 * y se toma un cuantil de las últimas quince: una muestra sola miente por el tamaño del bloque de audio
 * (de 3 a 20 ms según el aparato). Y si de pronto tres medidas seguidas no casan con las anteriores pero
 * sí entre sí, es que el reloj del audio SALTÓ (se suspendió, cambió el dispositivo de salida): se
 * olvida lo anterior y se empieza de nuevo. Una sola medida rara no basta, porque un tirón del hilo
 * principal da una.
 *
 * ═══ EL PLANIFICADOR, Y EL FALLO QUE EVITA ═══
 *
 * La música se programa con anticipación (el patrón de «un cuento de dos relojes» de siempre): un
 * temporizador del hilo principal despierta cada 25 ms y programa en el reloj del audio todo lo que
 * cae en los próximos 150 ms. El temporizador es impreciso; el reloj del audio, no. Lo que se prueba
 * aquí es lo que se rompe: después de un parón (una pestaña que vuelve, un recolector de basura de
 * medio segundo) un planificador ingenuo programa DE GOLPE todos los pasos atrasados, y la música
 * suena como una ráfaga de ametralladora. Éste salta lo pasado y lo cuenta.
 */

/** Un punto o una dirección en el mundo del juego: metros, `x` al este, `y` arriba, `z` al sur. */
export interface Punto3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// Los dos relojes
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/** Una medida: este instante del contexto se oye (o se oirá) en este instante de `performance.now()`. */
export interface MuestraDelReloj {
  readonly contextoS: number;
  readonly oidoMs: number;
}

/**
 * De dónde salen las medidas. `marca-de-salida` es `getOutputTimestamp()`: pareja exacta, se toma la
 * mediana. `reloj-del-contexto` es `currentTime` + latencia declarada: `currentTime` va a saltos de un
 * bloque y se queda ATRÁS dentro del bloque, así que la medida sale larga casi siempre y la buena es la
 * más corta; se toma el cuartil bajo.
 */
export type FuenteDelReloj = 'marca-de-salida' | 'reloj-del-contexto';

export interface RelojDelSonido {
  /** Los desfases admitidos más recientes (oidoMs − contextoS·1000), el más nuevo al final. */
  readonly desfases: readonly number[];
  /** Medidas seguidas que no casan con la ventana: si llegan a tres y casan entre sí, el reloj saltó. */
  readonly raros: readonly number[];
  /** La estimación vigente, o `null` si todavía no se ha medido nada. */
  readonly desfaseMs: number | null;
  readonly fuente: FuenteDelReloj;
  /** Cuántas veces se ha tirado la ventana porque el reloj saltó. Para el diagnóstico. */
  readonly saltos: number;
}

export const RELOJ = {
  /** Medidas que se recuerdan. A cuatro por segundo, casi cuatro segundos: la deriva no se nota. */
  ventana: 15,
  /**
   * Una medida que se aparta más que esto de la estimación es rara. Más que el bloque más grande que
   * se ha visto (1024 muestras a 48 kHz son 21 ms) y mucho menos que lo que salta una suspensión o un
   * cambio a Bluetooth (cientos de milisegundos).
   */
  saltoMs: 40,
  /** Medidas raras seguidas, y coherentes entre sí, para dar el salto por bueno. */
  rarosParaSaltar: 3,
} as const;

/** Un reloj sin medidas. */
export function relojNuevo(fuente: FuenteDelReloj): RelojDelSonido {
  return { desfases: [], raros: [], desfaseMs: null, fuente, saltos: 0 };
}

/** El cuantil `q` (0..1) de una lista, sin tocarla. */
function cuantil(valores: readonly number[], q: number): number {
  const orden = [...valores].sort((a, b) => a - b);
  if (orden.length === 0) return Number.NaN;
  const i = Math.min(orden.length - 1, Math.max(0, Math.round(q * (orden.length - 1))));
  return orden[i] ?? Number.NaN;
}

function estimar(desfases: readonly number[], fuente: FuenteDelReloj): number {
  return cuantil(desfases, fuente === 'marca-de-salida' ? 0.5 : 0.25);
}

/** Apunta una medida y devuelve el reloj nuevo. Las medidas no finitas se ignoran. */
export function medirElReloj(reloj: RelojDelSonido, muestra: MuestraDelReloj): RelojDelSonido {
  const d = muestra.oidoMs - muestra.contextoS * 1000;
  if (!Number.isFinite(d)) return reloj;
  if (reloj.desfaseMs === null) {
    return { ...reloj, desfases: [d], raros: [], desfaseMs: d };
  }
  if (Math.abs(d - reloj.desfaseMs) <= RELOJ.saltoMs) {
    const desfases = [...reloj.desfases, d].slice(-RELOJ.ventana);
    return { ...reloj, desfases, raros: [], desfaseMs: estimar(desfases, reloj.fuente) };
  }
  const raros = [...reloj.raros, d].slice(-RELOJ.rarosParaSaltar);
  const coherentes = raros.length >= RELOJ.rarosParaSaltar && Math.max(...raros) - Math.min(...raros) <= RELOJ.saltoMs;
  if (coherentes) {
    return { ...reloj, desfases: raros, raros: [], desfaseMs: estimar(raros, reloj.fuente), saltos: reloj.saltos + 1 };
  }
  return { ...reloj, raros };
}

/**
 * Olvida las medidas. Se llama cuando el contexto VUELVE a correr: se sabe que el reloj del audio
 * estuvo parado, así que no hace falta esperar a tres medidas raras para creérselo.
 */
export function olvidarElReloj(reloj: RelojDelSonido): RelojDelSonido {
  return { ...relojNuevo(reloj.fuente), saltos: reloj.saltos };
}

/** El instante del contexto (segundos) que se OYE en `oidoMs`. `null` si el reloj no tiene medidas. */
export function aContexto(reloj: RelojDelSonido, oidoMs: number): number | null {
  return reloj.desfaseMs === null ? null : (oidoMs - reloj.desfaseMs) / 1000;
}

/** Cuándo se oye (ms de `performance.now()`) el instante `contextoS`. `null` sin medidas. */
export function aOido(reloj: RelojDelSonido, contextoS: number): number | null {
  return reloj.desfaseMs === null ? null : contextoS * 1000 + reloj.desfaseMs;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// La rejilla de la música y el planificador
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * El tempo del juego: 120 pulsos por minuto (diseño §2.2 y §4.5), en semicorcheas. Un paso son 125 ms,
 * un pulso cuatro pasos (500 ms) y un compás cuatro pulsos (2 s).
 */
export const TEMPO = { bpm: 120, pasosPorPulso: 4, pulsosPorCompas: 4 } as const;

/** La rejilla: dónde cae el paso 0 en el reloj del contexto y cuánto dura un paso. */
export interface Rejilla {
  readonly origenS: number;
  readonly pasoS: number;
}

export function rejillaNueva(origenS: number, bpm: number = TEMPO.bpm, pasosPorPulso: number = TEMPO.pasosPorPulso): Rejilla {
  return { origenS, pasoS: 60 / bpm / pasosPorPulso };
}

/** El instante (contexto) del paso `n`. */
export function instanteDelPaso(r: Rejilla, n: number): number {
  return r.origenS + n * r.pasoS;
}

/** El paso en curso en el instante `t` (el último que ya empezó). */
export function pasoEn(r: Rejilla, t: number): number {
  return Math.floor((t - r.origenS) / r.pasoS + 1e-9);
}

/**
 * El primer paso múltiplo de `cada` que empieza en `t` o después. Con `cada = 16` es el compás
 * siguiente, con `cada = 4` el pulso siguiente. Los cambios de modo de la música se cuadran aquí para
 * que entren A TIEMPO y no en mitad de una nota.
 */
export function fronteraSiguiente(r: Rejilla, t: number, cada: number): number {
  const n = Math.ceil((t - r.origenS) / r.pasoS - 1e-9);
  return Math.ceil(n / cada) * cada;
}

export interface PasoPlanificado {
  readonly paso: number;
  readonly t: number;
}

export interface Planificacion {
  /** Lo que hay que programar ya, en orden. */
  readonly pasos: readonly PasoPlanificado[];
  /** El primer paso que queda por programar la próxima vez. */
  readonly siguiente: number;
  /** Pasos que ya habían pasado y NO se programan (el parón que no se convierte en ráfaga). */
  readonly saltados: number;
}

/** Tope de pasos por vuelta: ni con una anticipación absurda se programan más de cuatro compases. */
const TOPE_DE_PASOS = 64;

/**
 * QUÉ PROGRAMAR AHORA. Devuelve los pasos desde `siguiente` que empiezan antes de
 * `ahoraS + anticipacionS`. Los que empezaron hace más de `toleranciaS` no se tocan: se saltan y se
 * cuentan. Uno que empezó hace menos de la tolerancia todavía se programa (el motor lo toca en el acto):
 * perder una nota por 5 ms de retraso del temporizador sería peor que tocarla 5 ms tarde.
 */
export function planificar(r: Rejilla, siguiente: number, ahoraS: number, anticipacionS: number, toleranciaS = 0.03): Planificacion {
  const primeroVivo = Math.ceil((ahoraS - toleranciaS - r.origenS) / r.pasoS - 1e-9);
  const desde = Math.max(siguiente, primeroVivo);
  const saltados = Math.max(0, desde - siguiente);
  const hasta = ahoraS + anticipacionS;
  const pasos: PasoPlanificado[] = [];
  let n = desde;
  while (pasos.length < TOPE_DE_PASOS) {
    const t = instanteDelPaso(r, n);
    if (t >= hasta) break;
    pasos.push({ paso: n, t });
    n++;
  }
  return { pasos, siguiente: n, saltados };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// El pulso (lo que el juego lee para el «a compás»)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * EL PULSO DE LA MÚSICA en el reloj del juego. `origenMs` es un instante de `performance.now()` en que
 * SE OYE un pulso (la latencia de salida ya está descontada: el jugador pulsa con lo que oye, no con lo
 * que el contexto programó). Cualquier otro pulso está a un múltiplo de `periodoMs`.
 */
export interface Pulso {
  readonly bpm: number;
  readonly periodoMs: number;
  readonly origenMs: number;
}

/** El pulso de una rejilla, traducido al oído. `null` si el reloj no tiene medidas. */
export function pulsoDeLaRejilla(r: Rejilla, reloj: RelojDelSonido, pasosPorPulso: number = TEMPO.pasosPorPulso): Pulso | null {
  const origenMs = aOido(reloj, r.origenS);
  if (origenMs === null) return null;
  const periodoMs = r.pasoS * pasosPorPulso * 1000;
  return { bpm: 60000 / periodoMs, periodoMs, origenMs };
}

/** Resto matemático (siempre en [0, m)), que el `%` de JavaScript no da con negativos. */
function resto(x: number, m: number): number {
  return ((x % m) + m) % m;
}

/** La fase del pulso en `tMs`: 0 justo en un pulso, 0,5 a mitad de camino. En [0, 1). */
export function faseDelPulso(p: Pulso, tMs: number): number {
  return resto(tMs - p.origenMs, p.periodoMs) / p.periodoMs;
}

/**
 * CUÁNTO SE APARTA `tMs` DEL PULSO MÁS CERCANO, con signo: negativo si se adelantó, positivo si se
 * retrasó, en [−periodo/2, +periodo/2). Es la cifra con la que el juego decide «a compás» (±75 ms,
 * diseño §4.5): esta función no juzga, sólo mide.
 */
export function desvioDelPulso(p: Pulso, tMs: number): number {
  const r = resto(tMs - p.origenMs, p.periodoMs);
  return r >= p.periodoMs / 2 ? r - p.periodoMs : r;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// El silbido del anillo
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * EL SILBIDO, que es jugabilidad (diseño §9, punto 1). Dos decisiones que lo hacen legible de oído:
 *
 * 1. EL TONO DEPENDE DEL TIEMPO QUE FALTA, NO DE LA FRACCIÓN DEL ANUNCIO. Un Prestado anuncia en 700
 *    ms, un Celador en 550 y la respuesta de guardia en 300 (diseño §4.5 y §4.8). Si el tono fuera
 *    función de la fracción, los tres acabarían igual de agudos pero subirían a ritmos distintos, y el
 *    oído tendría que aprenderse tres curvas. Así, los últimos 300 ms suenan IDÉNTICOS en los tres
 *    casos: el anuncio corto simplemente empieza más arriba. Se aprende UN final.
 *
 * 2. LOS LATIDOS, ISÓCRONOS Y CLAVADOS AL IMPACTO. El silbido late cada 125 ms (una semicorchea a 120
 *    ppm, el idioma de la música) y el último latido cae EXACTAMENTE en el impacto. Un ritmo regular es
 *    lo que mejor se anticipa: al sincronizarse con un metrónomo la gente pulsa, de media, entre 20 y
 *    50 ms ANTES del golpe (la «asincronía negativa» que conoce cualquier batería). Y la ventana del
 *    quiebro limpio es justo ésa: los V ms ANTERIORES al impacto (diseño §4.3). El oído empuja al sitio
 *    bueno.
 *
 * La curva sube dos octavas y se empina al final (`u^0,55`): lenta al principio, cayendo sobre el
 * impacto como algo que se acerca.
 */
export const SILBIDO = {
  /** Tiempo hasta el impacto en que el silbido está en su nota más grave. Más allá, no baja más. */
  horizonteMs: 900,
  graveHz: 390,
  agudoHz: 1560,
  curvatura: 0.55,
  /** Periodo de los latidos: una semicorchea a 120 ppm. */
  periodoMs: 125,
  /** Con menos que esto por delante no se arranca: sería un chasquido, no un aviso. */
  minimoMs: 45,
  /** Cuánto sube el conjunto con la fuerza (0 = anillo ajeno o Prestado, 1 = Celador). */
  registroMinimo: 0.8,
  /** Puntos de la curva que se entregan a `setValueCurveAtTime`. */
  puntos: 96,
} as const;

function acotar(x: number, a: number, b: number): number {
  return x < a ? a : x > b ? b : x;
}

/** El multiplicador de registro de una fuerza (0..1). */
export function registroDelSilbido(fuerza: number): number {
  return SILBIDO.registroMinimo + (1 - SILBIDO.registroMinimo) * acotar(fuerza, 0, 1);
}

/** La frecuencia del silbido cuando faltan `faltanMs` para el impacto. */
export function tonoDelSilbido(faltanMs: number, fuerza = 1): number {
  const u = acotar(faltanMs / SILBIDO.horizonteMs, 0, 1);
  const octavas = Math.log2(SILBIDO.agudoHz / SILBIDO.graveHz);
  return SILBIDO.agudoHz * registroDelSilbido(fuerza) * Math.pow(2, -octavas * Math.pow(u, SILBIDO.curvatura));
}

/**
 * La curva de frecuencias desde que faltan `faltanMs` hasta el impacto, en `puntos` muestras
 * equiespaciadas en el tiempo (la primera en el arranque, la última en el impacto). Es lo que se le da
 * a `setValueCurveAtTime`, que interpola en línea recta entre puntos.
 */
export function curvaDelSilbido(faltanMs: number, fuerza = 1, puntos: number = SILBIDO.puntos): Float32Array<ArrayBuffer> {
  const n = Math.max(2, Math.floor(puntos));
  const curva = new Float32Array(n);
  for (let i = 0; i < n; i++) curva[i] = tonoDelSilbido(faltanMs * (1 - i / (n - 1)), fuerza);
  return curva;
}

/**
 * El volumen de fondo del silbido cuando faltan `faltanMs`: de la mitad a entero, creciendo más al
 * final. Se multiplica por los latidos. Como el tono, depende del tiempo que falta y no de la fracción.
 */
export function volumenDelSilbido(faltanMs: number): number {
  const u = acotar(faltanMs / SILBIDO.horizonteMs, 0, 1);
  return 0.5 + 0.5 * Math.pow(1 - u, 1.3);
}

/** La curva del volumen de fondo, con los mismos instantes que `curvaDelSilbido`. */
export function curvaDeVolumenDelSilbido(faltanMs: number, puntos: number = SILBIDO.puntos): Float32Array<ArrayBuffer> {
  const n = Math.max(2, Math.floor(puntos));
  const curva = new Float32Array(n);
  for (let i = 0; i < n; i++) curva[i] = volumenDelSilbido(faltanMs * (1 - i / (n - 1)));
  return curva;
}

/**
 * Los latidos: cuánto falta para el impacto en cada uno, de más a menos, acabando en 0. Sólo los que
 * caben en el anuncio.
 */
export function latidosDelSilbido(faltanMs: number, periodoMs: number = SILBIDO.periodoMs): number[] {
  const latidos: number[] = [];
  for (let k = Math.floor(faltanMs / periodoMs + 1e-9); k >= 0; k--) latidos.push(k * periodoMs);
  return latidos;
}

/** Una orden sobre un `AudioParam`, con el tiempo RELATIVO al impacto (ms; negativo = antes). */
export type OrdenDeGanancia =
  | { readonly tipo: 'fijar'; readonly tMs: number; readonly valor: number }
  | { readonly tipo: 'rampa'; readonly tMs: number; readonly valor: number }
  | { readonly tipo: 'hacia'; readonly tMs: number; readonly valor: number; readonly constanteMs: number };

/**
 * Nivel entre latidos, en el pico de cada latido y en el del ÚLTIMO, el del impacto, que es un acento:
 * el instante que importa tiene que ser el más fuerte de todo el silbido. Sin él, el latido anterior
 * (que tiene 38 ms para caer) pesa más que el del impacto (que muere en 6), y el oído se quedaba con
 * el penúltimo: lo destapó la autoprueba del banco, que encontraba la cresta 125 ms antes del impacto.
 * El silbido nunca calla entre latidos: es un aviso continuo.
 */
export const LATIDO = { valle: 0.42, cresta: 1, final: 1.4, ataqueMs: 4, caidaMs: 38, cierreMs: 6 } as const;

/**
 * LAS ÓRDENES DE LA GANANCIA DE LOS LATIDOS, en el orden en que hay que darlas. Empieza en el valle,
 * cada latido sube a la cresta en 4 ms y cae hacia el valle, y el último (el del impacto) sube más
 * alto y se corta a cero en 6 ms: el silbido MUERE en el impacto, no se desvanece después. Así el
 * final se oye como un instante y no como una cola.
 */
export function ordenesDeLosLatidos(faltanMs: number): OrdenDeGanancia[] {
  const ordenes: OrdenDeGanancia[] = [{ tipo: 'fijar', tMs: -faltanMs, valor: LATIDO.valle }];
  for (const falta of latidosDelSilbido(faltanMs)) {
    const t = -falta;
    const pico = Math.min(0, t);
    const subida = Math.max(-faltanMs, pico - LATIDO.ataqueMs);
    const cima = falta === 0 ? LATIDO.final : LATIDO.cresta;
    if (subida < pico) {
      ordenes.push({ tipo: 'fijar', tMs: subida, valor: LATIDO.valle });
      ordenes.push({ tipo: 'rampa', tMs: pico, valor: cima });
    } else {
      ordenes.push({ tipo: 'fijar', tMs: pico, valor: cima });
    }
    if (falta > 0) {
      ordenes.push({ tipo: 'hacia', tMs: pico, valor: LATIDO.valle, constanteMs: LATIDO.caidaMs / 3 });
    }
  }
  ordenes.push({ tipo: 'rampa', tMs: LATIDO.cierreMs, valor: 0 });
  return ordenes;
}

/**
 * CUÁNDO Y DESDE DÓNDE ARRANCA EL SILBIDO, en milisegundos del oído. Si el anuncio llegó tarde (el
 * `inicioMs` ya pasó), se arranca ahora con el tono que tocaría a esta altura: el final sigue cayendo
 * en su sitio, que es lo único que importa. Si queda menos de `minimoMs`, no hay silbido.
 */
export interface PlanDelSilbido {
  readonly arrancaMs: number;
  readonly faltanMs: number;
}

export function planDelSilbido(inicioMs: number, impactoMs: number, ahoraMs: number, margenMs = 0): PlanDelSilbido | null {
  const arrancaMs = Math.max(inicioMs, ahoraMs + margenMs);
  const faltanMs = impactoMs - arrancaMs;
  if (!Number.isFinite(faltanMs) || faltanMs < SILBIDO.minimoMs) return null;
  return { arrancaMs, faltanMs };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// El Remanso
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * EL REMANSO SUENA (diseño §9, punto 3): paso bajo a 800 Hz, tono a la mitad y latido. `intensidad`
 * va de 0 (nada) a 1 (Remanso pleno); el cliente la mueve con la misma curva con que dilata la
 * presentación. El corte se interpola en escala logarítmica —de 18 kHz a 800 Hz— porque en lineal
 * el filtro se quedaría casi abierto hasta el 90 % y se cerraría de golpe al final.
 *
 * Las señales (el silbido, las balas, el apuntado, la cabina) NO pasan por aquí: van por el camino
 * claro del motor y en el reloj verdadero (diseño §4.4).
 */
export const REMANSO = { abiertoHz: 18000, corteHz: 800, octavasAbajo: 1, latidoDesde: 0.35, humedadExtra: 0.6 } as const;

export interface MezclaDelRemanso {
  readonly corteHz: number;
  readonly detuneCents: number;
  /** Multiplicador del retorno de la reverberación: el mundo se aleja. */
  readonly humedad: number;
  readonly latido: boolean;
}

export function mezclaDelRemanso(intensidad: number): MezclaDelRemanso {
  const x = acotar(Number.isFinite(intensidad) ? intensidad : 0, 0, 1);
  return {
    corteHz: REMANSO.abiertoHz * Math.pow(REMANSO.corteHz / REMANSO.abiertoHz, x),
    detuneCents: -1200 * REMANSO.octavasAbajo * x,
    humedad: 1 + REMANSO.humedadExtra * x,
    latido: x >= REMANSO.latidoDesde,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// Distancias: cuánto se oye cada cosa y cómo de apagada
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * EL ALCANCE DE UN SONIDO, dicho como se piensa: «a `refM` suena entero, y a `alcanceM` todavía suena
 * a `gananciaEnAlcance`». De ahí sale el `rolloffFactor` del modelo `inverse` de `PannerNode`, que es
 * el que se parece al aire libre:
 *
 *     g(d) = ref / (ref + caída · (d − ref))
 *
 * La cabina tiene que oírse a 150 m (diseño §9, punto 4): con la caída por defecto (1) quedaría a
 * −43 dB, debajo de la lluvia. Con su perfil, a 150 m suena a −18 dB: apagada y lejana, pero ahí.
 */
export interface PerfilDeAlcance {
  readonly refM: number;
  readonly alcanceM: number;
  readonly gananciaEnAlcance: number;
}

export const ALCANCES = {
  /** El silbido y el apuntado: la amenaza está a 1-18 m y tiene que oírse siempre. */
  senal: { refM: 4, alcanceM: 25, gananciaEnAlcance: 0.45 },
  /** Golpes, cristales, estampados. */
  golpe: { refM: 2, alcanceM: 40, gananciaEnAlcance: 0.08 },
  /** Pasos: se oyen los cercanos y poco más. */
  paso: { refM: 1.5, alcanceM: 25, gananciaEnAlcance: 0.05 },
  /** La cabina de la Llamada: la brújula sonora de la carrera. */
  cabina: { refM: 6, alcanceM: 150, gananciaEnAlcance: 0.125 },
  /** El tren elevado: grande y lejano. */
  tren: { refM: 12, alcanceM: 200, gananciaEnAlcance: 0.12 },
} as const satisfies Record<string, PerfilDeAlcance>;

export type NombreDeAlcance = keyof typeof ALCANCES;

/** El `rolloffFactor` que hace que el perfil se cumpla en su alcance. */
export function caidaDelPerfil(p: PerfilDeAlcance): number {
  if (p.alcanceM <= p.refM || p.gananciaEnAlcance <= 0) return 1;
  return (p.refM / p.gananciaEnAlcance - p.refM) / (p.alcanceM - p.refM);
}

/** La ganancia del modelo `inverse` a `d` metros (la misma cuenta que hace `PannerNode`). */
export function gananciaADistancia(p: PerfilDeAlcance, d: number): number {
  const dd = Math.max(d, p.refM);
  return p.refM / (p.refM + caidaDelPerfil(p) * (dd - p.refM));
}

/**
 * EL AIRE Y LAS ESQUINAS: el corte de un paso bajo según la distancia. El aire se come los agudos
 * poco a poco, pero en una ciudad lo que más los come es la esquina: la cabina que suena a dos calles
 * llega doblando fachadas. De 18 kHz pegado a 1,2 kHz a 150 m. Se queda en 1,2 kHz como mucho: el
 * timbre (1180 y 1410 Hz) sigue pasando entero, que es lo que tiene que pasar.
 */
export function corteDelAire(d: number): number {
  const dd = Math.max(0, Number.isFinite(d) ? d : 0);
  return Math.max(1200, 18000 * Math.exp(-dd / 55));
}

/** Distancia entre dos puntos. */
export function distancia(a: Punto3, b: Punto3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** Un vector unidad, o `null` si es nulo o no finito (un `NaN` en un `AudioParam` lanza una excepción). */
export function unidad(v: Punto3): Punto3 | null {
  const l = Math.hypot(v.x, v.y, v.z);
  if (!Number.isFinite(l) || l < 1e-6) return null;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// El tren: el efecto Doppler que `PannerNode` ya no hace
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

const VELOCIDAD_DEL_SONIDO = 343;

/**
 * EL DOPPLER DE UN PASO EN LÍNEA RECTA, en cents, en `puntos` instantes equiespaciados. `PannerNode`
 * perdió su Doppler hace años (lo quitó la especificación), y un tren que pasa sin bajar de tono
 * suena a tren parado que se mueve de un altavoz a otro. La cuenta es la de siempre con la velocidad
 * radial: positivo mientras se acerca, cero en el punto más cercano, negativo al alejarse.
 */
export function dopplerDelPaso(desde: Punto3, hasta: Punto3, oyente: Punto3, duracionS: number, puntos: number): Float32Array<ArrayBuffer> {
  const n = Math.max(2, Math.floor(puntos));
  const curva = new Float32Array(n);
  const dt = Math.max(1e-3, duracionS) / (n - 1);
  const en = (t: number): Punto3 => {
    const u = acotar(t / Math.max(1e-3, duracionS), 0, 1);
    return { x: desde.x + (hasta.x - desde.x) * u, y: desde.y + (hasta.y - desde.y) * u, z: desde.z + (hasta.z - desde.z) * u };
  };
  for (let i = 0; i < n; i++) {
    const t = i * dt;
    const antes = distancia(en(Math.max(0, t - dt / 2)), oyente);
    const despues = distancia(en(Math.min(duracionS, t + dt / 2)), oyente);
    const tramo = Math.min(duracionS, t + dt / 2) - Math.max(0, t - dt / 2);
    const radial = tramo > 0 ? (despues - antes) / tramo : 0; // > 0 al alejarse
    curva[i] = 1200 * Math.log2(VELOCIDAD_DEL_SONIDO / (VELOCIDAD_DEL_SONIDO + radial));
  }
  return curva;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// El Bis: la cinta que tartamudea
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * LAS PUERTAS DEL BIS (diseño §9, punto 5: «1 s de ambiente que se repite dos veces, como una cinta
 * que tartamudea»).
 *
 * El ambiente pasa SIEMPRE por una línea de retardo de un segundo: una `DelayNode` es, por dentro,
 * exactamente un búfer circular que el hilo de audio va escribiendo, así que el último segundo de
 * ambiente está grabado en todo momento sin gastar nada. En el instante `t0` del Bis:
 *
 *   · `entrada` (ambiente → línea) se cierra: la línea deja de grabar;
 *   · `lazo` (salida de la línea → su propia entrada) se abre: lo grabado da vueltas;
 *   · `repeticion` (salida de la línea → altavoz) se abre: se oye la vuelta;
 *   · `vivo` (el ambiente de verdad) se hunde: lo que suena es la cinta.
 *
 * En cada costura entre vuelta y vuelta, `repeticion` da un bache de 25 ms: tapa el chasquido del
 * empalme y es, además, el tartamudeo. Al acabar, todo vuelve y el vivo sube en un cuarto de segundo.
 *
 * Todo en el reloj del contexto: las puertas se programan con precisión de muestra y no dependen de
 * que el hilo principal esté libre en ese instante.
 */
export type PuertaDelBis = 'entrada' | 'lazo' | 'repeticion' | 'vivo';

export interface OrdenDelBis {
  readonly puerta: PuertaDelBis;
  readonly t: number;
  readonly valor: number;
  readonly modo: 'fijar' | 'rampa';
}

export interface PlanDelBis {
  readonly ordenes: readonly OrdenDelBis[];
  /** Instantes (contexto) en que empieza cada repetición. */
  readonly inicios: readonly number[];
  readonly fin: number;
}

export const BIS = {
  tramoS: 1,
  repeticiones: 2,
  cruceS: 0.005,
  /** Lo que baja el ambiente vivo mientras suena la cinta. */
  vivoHundido: 0.12,
  /** Lo que conserva la cinta en cada vuelta: la segunda repetición, un poco más gastada. */
  lazo: 0.9,
  bacheS: 0.025,
  bacheHondo: 0.2,
  subidaDelVivoS: 0.25,
} as const;

export function planDelBis(t0: number, tramoS: number = BIS.tramoS, repeticiones: number = BIS.repeticiones): PlanDelBis {
  const rep = Math.max(1, Math.floor(repeticiones));
  const c = BIS.cruceS;
  const fin = t0 + rep * tramoS;
  const ordenes: OrdenDelBis[] = [
    // Se cierra la grabación y se abre el lazo, cruzados en 5 ms.
    { puerta: 'entrada', t: t0 - c, valor: 1, modo: 'fijar' },
    { puerta: 'entrada', t: t0, valor: 0, modo: 'rampa' },
    { puerta: 'lazo', t: t0 - c, valor: 0, modo: 'fijar' },
    { puerta: 'lazo', t: t0, valor: BIS.lazo, modo: 'rampa' },
    { puerta: 'repeticion', t: t0 - c, valor: 0, modo: 'fijar' },
    { puerta: 'repeticion', t: t0, valor: 1, modo: 'rampa' },
    { puerta: 'vivo', t: t0 - c, valor: 1, modo: 'fijar' },
    { puerta: 'vivo', t: t0 + 0.03, valor: BIS.vivoHundido, modo: 'rampa' },
  ];
  const inicios: number[] = [t0];
  for (let k = 1; k < rep; k++) {
    const costura = t0 + k * tramoS;
    inicios.push(costura);
    ordenes.push(
      { puerta: 'repeticion', t: costura - BIS.bacheS / 2, valor: 1, modo: 'fijar' },
      { puerta: 'repeticion', t: costura - 0.002, valor: BIS.bacheHondo, modo: 'rampa' },
      { puerta: 'repeticion', t: costura + BIS.bacheS / 2, valor: 1, modo: 'rampa' },
    );
  }
  ordenes.push(
    { puerta: 'lazo', t: fin - c, valor: BIS.lazo, modo: 'fijar' },
    { puerta: 'lazo', t: fin, valor: 0, modo: 'rampa' },
    { puerta: 'repeticion', t: fin - 2 * c, valor: 1, modo: 'fijar' },
    { puerta: 'repeticion', t: fin, valor: 0, modo: 'rampa' },
    { puerta: 'entrada', t: fin, valor: 0, modo: 'fijar' },
    { puerta: 'entrada', t: fin + 2 * c, valor: 1, modo: 'rampa' },
    { puerta: 'vivo', t: fin - c, valor: BIS.vivoHundido, modo: 'fijar' },
    { puerta: 'vivo', t: fin + BIS.subidaDelVivoS, valor: 1, modo: 'rampa' },
  );
  return { ordenes, inicios, fin };
}

/**
 * El valor de una puerta en `t` según un plan, empezando en `inicial` (lo que valía antes del plan).
 * La misma aritmética que hace un `AudioParam` con `setValueAtTime` y `linearRampToValueAtTime`: lo
 * usan las pruebas para afirmar «durante la segunda vuelta el lazo está abierto» sin WebAudio.
 */
export function valorDeLaPuerta(plan: PlanDelBis, puerta: PuertaDelBis, t: number, inicial: number): number {
  const propias = plan.ordenes.filter((o) => o.puerta === puerta);
  let valor = inicial;
  let tAnterior = -Infinity;
  for (const o of propias) {
    if (o.t <= t) {
      valor = o.valor;
      tAnterior = o.t;
      continue;
    }
    if (o.modo === 'rampa' && Number.isFinite(tAnterior)) {
      const u = (t - tAnterior) / (o.t - tAnterior);
      return valor + (o.valor - valor) * u;
    }
    return valor;
  }
  return valor;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// La lluvia y la marquesina
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/** El tiempo de la noche (diseño §6: lo decide la semilla del barrio), más `seca` para el banco. */
export type TiempoDeLaNoche = 'seca' | 'llovizna' | 'aguacero' | 'niebla';

export interface MezclaDeLaLluvia {
  /** El siseo continuo (ruido rosa). */
  readonly siseo: number;
  /** Las gotas sobre los charcos. */
  readonly gotas: number;
  /** El rumor grave de la lluvia sobre toda la ciudad. */
  readonly grave: number;
  /** El golpeteo sobre la marquesina (sólo debajo). */
  readonly toldo: number;
  /** Corte del paso bajo del siseo y de las gotas: bajo techo, la lluvia llega por los lados. */
  readonly corteHz: number;
}

const NIVELES_DE_LLUVIA: Readonly<Record<TiempoDeLaNoche, { siseo: number; gotas: number; grave: number }>> = {
  seca: { siseo: 0, gotas: 0, grave: 0 },
  llovizna: { siseo: 0.11, gotas: 0.3, grave: 0.05 },
  aguacero: { siseo: 0.32, gotas: 0.55, grave: 0.2 },
  // En la niebla baja no llueve: gotea (de los aleros, de los cables). Casi sólo gotas sueltas.
  niebla: { siseo: 0.025, gotas: 0.12, grave: 0 },
};

/**
 * LA MEZCLA DE LA LLUVIA con el tiempo de la noche y cuánto se está bajo una marquesina (0 al raso,
 * 1 debajo del todo). Debajo pasan TRES cosas y hacen falta las tres para que el oído lo lea como
 * techo: el siseo pierde agudos (de 16 kHz a 2,5 kHz, en escala logarítmica), las gotas de los charcos
 * se alejan, y aparece el golpeteo grave de las gotas gordas SOBRE la lona. Con sólo la primera, la
 * marquesina sonaría a «alguien ha bajado los agudos».
 */
export function mezclaDeLaLluvia(tiempo: TiempoDeLaNoche, bajoTecho: number): MezclaDeLaLluvia {
  const n = NIVELES_DE_LLUVIA[tiempo];
  const b = acotar(Number.isFinite(bajoTecho) ? bajoTecho : 0, 0, 1);
  const hayLluvia = n.siseo > 0 ? 1 : 0;
  return {
    siseo: n.siseo * (1 - 0.55 * b),
    gotas: n.gotas * (1 - 0.8 * b),
    grave: n.grave,
    toldo: b * (n.gotas + n.siseo) * 0.9 * hayLluvia,
    corteHz: 16000 * Math.pow(2500 / 16000, b),
  };
}
