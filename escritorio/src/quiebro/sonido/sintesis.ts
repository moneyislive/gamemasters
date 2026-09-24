/**
 * LAS TEXTURAS QUE SE FABRICAN A MANO: ruidos, la calle mojada, el timbre, la lluvia, el cristal…
 *
 * ═══ POR QUÉ HAY SONIDOS QUE SE CALCULAN MUESTRA A MUESTRA Y NO CON NODOS ═══
 *
 * WebAudio sabe hacer muy bien lo que es POCO y LARGO: un oscilador que sube de tono, un filtro que
 * se cierra, una envolvente. Lo que hace mal es lo que es MUCHO y CORTO: un cristal que se rompe son
 * cuarenta esquirlas con dos o tres parciales cada una, y hacerlo con nodos son cien osciladores
 * creados, arrancados y tirados en un segundo, en el mismo hilo que pinta la ciudad. La lluvia es
 * peor: noventa gotas por segundo, para siempre.
 *
 * Así que esas texturas se CALCULAN aquí una vez, a `Float32Array`, y el motor las mete en un
 * `AudioBuffer` que después se toca con un solo nodo. Es lo mismo que hace cualquier juego con sus
 * ficheros de sonido, salvo que el fichero no viaja: se fabrica en el aparato, en milisegundos, y el
 * paquete no pesa ni un byte más (el §9 del diseño da 1,5 MB de audio como mucho; esto gasta cero).
 *
 * ═══ POR QUÉ ES PURO, Y POR QUÉ CON SU PROPIO AZAR ═══
 *
 * Nada de este fichero toca `window`, `AudioContext` ni `Math.random`. Eso compra dos cosas:
 *
 *   1. Que `escritorio/scripts/verificar-quiebro-sonido.ts` lo prueba en Node con números: que la
 *      calle mojada se apaga de verdad en su RT60 (casi sesenta decibelios), que la cuerda afina a menos
 *      del medio por ciento, que el timbre calla en su silencio, que un bucle se cierra sin costura. Un
 *      sonido que «suena raro» no lo caza nadie; uno que no decae, sí.
 *   2. Que dos aparatos con la misma semilla fabrican la MISMA calle. No es una regla del juego —el
 *      sonido es adorno y nunca decide nada (diseño §10)—, pero una prueba que falla una vez de cada
 *      diez por culpa del azar es una prueba que se acaba desactivando.
 *
 * ═══ LOS BUCLES NO TIENEN COSTURA ═══
 *
 * Todo lo que se toca en bucle (ruidos, gotas, golpeteo del toldo) se escribe DANDO LA VUELTA: una gota
 * que cae a 20 ms del final termina al principio del búfer. Así la costura del bucle no existe, y no
 * hace falta un fundido que el oído acaba oyendo como un «bombeo» cada tres segundos. Los ruidos de
 * color se cierran con un fundido cruzado de su cola sobre su cabeza, de IGUAL POTENCIA: la costura
 * suena como cualquier otro tramo del ruido. Un fundido lineal (el que sale sin pensar) deja un bache
 * de 3 dB en mitad del cruce, porque dos ruidos que no se parecen no suman amplitud sino potencia; en
 * un siseo de lluvia continuo ese bache se oye como un «respiro» cada vuelta. (El marrón de aquí tiene
 * poca memoria, unos milisegundos, así que un corte a pelo no daría escalón; el cruce está por el
 * bache, no por el escalón.)
 *
 * Nada de aquí es código ajeno: los filtros de ruido rosa y marrón son las recetas de dominio público
 * de siempre (la de Paul Kellet para el rosa y el paseo aleatorio con fuga para el marrón), escritas
 * desde cero.
 */

/** Un canal de audio calculado. `ArrayBuffer` y no `ArrayBufferLike`: es lo que pide `copyToChannel`. */
export type Muestras = Float32Array<ArrayBuffer>;

/** Dos canales, izquierdo y derecho. */
export type Estereo = readonly [Muestras, Muestras];

const DOS_PI = Math.PI * 2;

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// El azar sembrado
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * UN GENERADOR SEMBRADO (mulberry32) que devuelve números en [0, 1).
 *
 * Aquí SÍ se usa un generador con estado dentro, al revés que en `shared/mecanicas/azar.ts`, y no es
 * una incoherencia: allí el azar es parte del estado de una partida que se reejecuta; aquí es la
 * forma de una gota de lluvia, que no se guarda ni se reproduce. Lo único que se pide es que la misma
 * semilla dé la misma textura, y eso lo da cualquier generador con estado.
 */
export function azarSembrado(semilla: number): () => number {
  let s = semilla >>> 0 || 0x9e3779b9;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Un número en [a, b) con el generador dado. */
function entre(azar: () => number, a: number, b: number): number {
  return a + (b - a) * azar();
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// Medidas (las usan las pruebas de Node y la autoprueba del banco)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/** Raíz cuadrática media de `[desde, hasta)` en muestras. 0 si el tramo está vacío. */
export function rms(m: Float32Array, desde = 0, hasta = m.length): number {
  const a = Math.max(0, Math.floor(desde));
  const b = Math.min(m.length, Math.floor(hasta));
  if (b <= a) return 0;
  let suma = 0;
  for (let i = a; i < b; i++) {
    const v = m[i] ?? 0;
    suma += v * v;
  }
  return Math.sqrt(suma / (b - a));
}

/** El valor absoluto más alto. */
export function pico(m: Float32Array): number {
  let p = 0;
  for (let i = 0; i < m.length; i++) {
    const v = Math.abs(m[i] ?? 0);
    if (v > p) p = v;
  }
  return p;
}

/** Decibelios de una amplitud (con suelo en −200 para que el cero no dé −∞). */
export function db(amplitud: number): number {
  return amplitud <= 1e-10 ? -200 : 20 * Math.log10(amplitud);
}

/** ¿Hay algún `NaN` o infinito? Un solo `NaN` en un búfer enmudece TODO el bus en algunos motores. */
export function tieneNoFinitos(m: Float32Array): boolean {
  for (let i = 0; i < m.length; i++) if (!Number.isFinite(m[i] ?? 0)) return true;
  return false;
}

/** Coeficiente de correlación de Pearson entre dos canales (−1..1). */
export function correlacion(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i++) {
    ma += a[i] ?? 0;
    mb += b[i] ?? 0;
  }
  ma /= n;
  mb /= n;
  let sab = 0;
  let saa = 0;
  let sbb = 0;
  for (let i = 0; i < n; i++) {
    const x = (a[i] ?? 0) - ma;
    const y = (b[i] ?? 0) - mb;
    sab += x * y;
    saa += x * x;
    sbb += y * y;
  }
  const d = Math.sqrt(saa * sbb);
  return d === 0 ? 0 : sab / d;
}

/**
 * EL TONO DE UN TRAMO, por autocorrelación normalizada: el periodo (en muestras) con más parecido a sí
 * mismo entre `minHz` y `maxHz`, afinado con una parábola entre las tres muestras del pico. Es lo que
 * usan las pruebas para decir «la cuerda está en La» o «el silbido acaba más agudo que empieza».
 */
export function tonoPorAutocorrelacion(
  m: Float32Array,
  frecuenciaDeMuestreo: number,
  desde: number,
  hasta: number,
  minHz: number,
  maxHz: number,
): number {
  const a = Math.max(0, Math.floor(desde));
  const b = Math.min(m.length, Math.floor(hasta));
  const minRetraso = Math.max(2, Math.floor(frecuenciaDeMuestreo / maxHz));
  const maxRetraso = Math.min(b - a - 2, Math.ceil(frecuenciaDeMuestreo / minHz));
  if (maxRetraso <= minRetraso) return 0;
  const parecido = (retraso: number): number => {
    let s = 0;
    let e1 = 0;
    let e2 = 0;
    for (let i = a; i + retraso < b; i++) {
      const x = m[i] ?? 0;
      const y = m[i + retraso] ?? 0;
      s += x * y;
      e1 += x * x;
      e2 += y * y;
    }
    const d = Math.sqrt(e1 * e2);
    return d === 0 ? 0 : s / d;
  };
  let mejor = minRetraso;
  let mejorValor = -Infinity;
  const valores = new Map<number, number>();
  for (let r = minRetraso; r <= maxRetraso; r++) {
    const v = parecido(r);
    valores.set(r, v);
    if (v > mejorValor) {
      mejorValor = v;
      mejor = r;
    }
  }
  /*
   * El primer pico alto, no el más alto: en un tono limpio el periodo doble se parece a sí mismo casi
   * igual que el sencillo, y quedarse con el máximo absoluto da la octava de abajo una vez de cada
   * tantas. Se toma el retraso más corto que llegue al 92 % del mejor.
   */
  for (let r = minRetraso; r <= maxRetraso; r++) {
    const v = valores.get(r) ?? -Infinity;
    const antes = valores.get(r - 1) ?? -Infinity;
    const despues = valores.get(r + 1) ?? -Infinity;
    if (v >= mejorValor * 0.92 && v >= antes && v >= despues) {
      mejor = r;
      break;
    }
  }
  const y0 = valores.get(mejor - 1) ?? parecido(mejor - 1);
  const y1 = valores.get(mejor) ?? parecido(mejor);
  const y2 = valores.get(mejor + 1) ?? parecido(mejor + 1);
  const denominador = y0 - 2 * y1 + y2;
  const ajuste = denominador === 0 ? 0 : (0.5 * (y0 - y2)) / denominador;
  return frecuenciaDeMuestreo / (mejor + ajuste);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// Retoques de búfer
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/** Escala para que el pico sea `objetivo`. Un búfer mudo se deja como está. */
export function normalizar(canales: readonly Float32Array[], objetivo: number): void {
  let p = 0;
  for (const c of canales) p = Math.max(p, pico(c));
  if (p <= 0) return;
  const k = objetivo / p;
  for (const c of canales) for (let i = 0; i < c.length; i++) c[i] = (c[i] ?? 0) * k;
}

/**
 * CIERRA UN BUCLE con fundido cruzado: las últimas `fundido` muestras de `largo` se mezclan sobre las
 * primeras, y se devuelve un búfer de `largo − fundido`. El final empalma con el principio porque el
 * principio YA CONTIENE el final: la muestra que sigue a la última es, casi entera, la que la seguía
 * en el original. Fundido de igual potencia, que es el que no deja un bache de volumen en mitad del
 * ruido (ver la cabecera). Se exporta para probarlo con una rampa y con ruido blanco.
 */
export function cerrarBucle(largo: Muestras, fundido: number): Muestras {
  const n = largo.length - fundido;
  const salida = new Float32Array(n);
  for (let i = 0; i < n; i++) salida[i] = largo[i] ?? 0;
  for (let i = 0; i < fundido; i++) {
    const u = (i + 0.5) / fundido;
    const entra = Math.sin(u * Math.PI * 0.5);
    const sale = Math.cos(u * Math.PI * 0.5);
    salida[i] = (largo[n + i] ?? 0) * sale + (largo[i] ?? 0) * entra;
  }
  return salida;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// Ruidos
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

export type ColorDeRuido = 'blanco' | 'rosa' | 'marron';

/**
 * RUIDO DE COLOR, en bucle y sin costura. El blanco es la materia de todo lo corto (aire de un golpe,
 * un chasquido, un charles); el rosa, de la lluvia y del rumor de la ciudad, porque el oído lo oye
 * «parejo» en todas las octavas; el marrón, del tren y del zumbido lejano, que son casi sólo graves.
 */
export function ruido(color: ColorDeRuido, muestras: number, semilla: number): Muestras {
  const fundido = Math.min(2048, Math.floor(muestras / 4));
  const largo = new Float32Array(muestras + fundido);
  const azar = azarSembrado(semilla);
  if (color === 'blanco') {
    for (let i = 0; i < largo.length; i++) largo[i] = azar() * 2 - 1;
  } else if (color === 'rosa') {
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    for (let i = 0; i < largo.length; i++) {
      const w = azar() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      largo[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  } else {
    let ultimo = 0;
    for (let i = 0; i < largo.length; i++) {
      const w = azar() * 2 - 1;
      ultimo = (ultimo + 0.02 * w) / 1.02;
      largo[i] = ultimo * 3.5;
    }
  }
  const salida = cerrarBucle(largo, fundido);
  normalizar([salida], 0.9);
  return salida;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// La calle mojada (la respuesta al impulso de la reverberación)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

export interface OpcionesDeLaCalle {
  /** Largo de la cola, en segundos. En calidad baja se acorta: la convolución cuesta lo que mide. */
  readonly duracionS: number;
  /** Tiempo en caer sesenta decibelios. Una calle estrecha de fachadas duras anda por 1,2-1,8 s. */
  readonly rt60S: number;
  /** Ancho entre fachadas: da el periodo del eco aleteante (ida y vuelta a 343 m/s). */
  readonly anchoM: number;
  readonly semilla: number;
}

export const CALLE_MOJADA: OpcionesDeLaCalle = { duracionS: 2.2, rt60S: 1.5, anchoM: 12, semilla: 12 };

/** El periodo del eco entre dos fachadas: ida y vuelta, en segundos. */
export function periodoDelAleteo(anchoM: number): number {
  return (2 * anchoM) / 343;
}

/**
 * LA RESPUESTA AL IMPULSO DE UNA CALLE MOJADA DE MADRUGADA, en estéreo.
 *
 * Una calle de 12 m entre fachadas no suena a sala ni a catedral: suena a TRES cosas encima.
 *
 *   1. Primeras reflexiones sueltas (8-45 ms): la fachada de enfrente, un portal, un coche aparcado.
 *   2. El ECO ALETEANTE: el sonido va y vuelve entre las dos fachadas paralelas, cada 70 ms en una
 *      calle de 12 m, perdiendo energía hacia el cielo en cada viaje. Es el «tac-tac-tac» que deja una
 *      palmada en un callejón, y es lo que hace que la reverberación diga CALLE y no habitación.
 *   3. Una cola difusa que cae 60 dB en `rt60S`. El asfalto mojado refleja los agudos mejor que el
 *      seco, así que la cola se oscurece despacio (de 9 kHz a 2,2 kHz) y no hasta el sordo de una sala
 *      con cortinas.
 *
 * Los dos canales llevan ruido distinto y el aleteo cambia de lado en cada viaje: si fueran iguales, la
 * reverberación sonaría DENTRO de la cabeza en vez de alrededor.
 */
export function respuestaDeCalle(frecuenciaDeMuestreo: number, opciones: OpcionesDeLaCalle = CALLE_MOJADA): Estereo {
  const sr = frecuenciaDeMuestreo;
  const n = Math.max(1, Math.round(opciones.duracionS * sr));
  const izquierda = new Float32Array(n);
  const derecha = new Float32Array(n);
  const azar = azarSembrado(opciones.semilla);
  const predemora = 0.006;
  const k = 6.907755 / opciones.rt60S; // e^(−k·t) cae 60 dB en rt60

  // 3. La cola difusa, con su arranque lento: al aire libre la difusión tarda en llenarse (no hay
  //    techo), y en esos primeros 100 ms mandan las reflexiones sueltas y el aleteo.
  for (let i = 0; i < n; i++) {
    const t = i / sr - predemora;
    if (t <= 0) continue;
    const arranque = 1 - Math.exp(-t / 0.05);
    const envolvente = Math.exp(-k * t) * arranque * 0.35;
    izquierda[i] = (azar() * 2 - 1) * envolvente;
    derecha[i] = (azar() * 2 - 1) * envolvente;
  }

  // Un pulso corto de ruido (1,5 ms) en `t`, con ganancias por canal. Es una reflexión: nunca un clic
  // de una sola muestra, que en la convolución suena a «tic» digital.
  const pulso = (t: number, gi: number, gd: number): void => {
    const inicio = Math.round(t * sr);
    const largo = Math.max(2, Math.round(0.0015 * sr));
    for (let j = 0; j < largo; j++) {
      const i = inicio + j;
      if (i < 0 || i >= n) continue;
      const forma = Math.sin((Math.PI * (j + 0.5)) / largo);
      const v = (azar() * 2 - 1) * forma;
      izquierda[i] = (izquierda[i] ?? 0) + v * gi;
      derecha[i] = (derecha[i] ?? 0) + v * gd;
    }
  };

  // 1. Primeras reflexiones.
  for (let r = 0; r < 6; r++) {
    const t = entre(azar, 0.008, 0.045);
    const g = entre(azar, 0.3, 0.6);
    const lado = azar();
    pulso(t, g * (0.4 + 0.6 * lado), g * (1 - 0.6 * lado));
  }

  // 2. El eco aleteante entre las dos fachadas.
  const periodo = periodoDelAleteo(opciones.anchoM);
  let amplitud = 0.85;
  for (let viaje = 0; amplitud > 0.01; viaje++) {
    const t = predemora + 0.012 + viaje * periodo;
    if (t * sr >= n) break;
    const aqui = viaje % 2 === 0;
    pulso(t, amplitud * (aqui ? 1 : 0.5), amplitud * (aqui ? 0.5 : 1));
    amplitud *= 0.62;
  }

  // El oscurecimiento: un paso bajo de un polo cuyo corte baja con el tiempo.
  for (const canal of [izquierda, derecha]) {
    let y = 0;
    for (let i = 0; i < n; i++) {
      const u = i / n;
      const corte = 9000 * Math.pow(2200 / 9000, u);
      const a = 1 - Math.exp((-DOS_PI * corte) / sr);
      y += a * ((canal[i] ?? 0) - y);
      canal[i] = y;
    }
  }
  normalizar([izquierda, derecha], 0.9);
  return [izquierda, derecha];
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// El timbre de la cabina
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * LA CADENCIA DEL TELÉFONO: suena 1,5 s y calla 3 s, que es la de la red española de toda la vida
 * (la inglesa es doble, «ring-ring»; la americana, 2 y 4). El búfer mide exactamente un ciclo, así que
 * tocado en bucle es la cadencia entera, y la cabina no necesita ningún temporizador.
 */
export const CADENCIA_DEL_TIMBRE = { sonandoS: 1.5, callandoS: 3, golpesPorSegundo: 20 } as const;

/** Un modo propio de una campana: frecuencia relativa, amplitud y tiempo de caída (segundos, a 1/e). */
interface Modo {
  readonly razon: number;
  readonly amplitud: number;
  readonly caidaS: number;
}

/**
 * Los modos de una cazoleta de acero de timbre. Inarmónicos A PROPÓSITO: una campana afinada en
 * armónicos suena a órgano, y lo que hace «rrrring» es justo que los parciales no casen entre sí.
 */
const MODOS_DE_CAZOLETA: readonly Modo[] = [
  { razon: 1, amplitud: 1, caidaS: 0.16 },
  { razon: 2.09, amplitud: 0.55, caidaS: 0.1 },
  { razon: 2.98, amplitud: 0.4, caidaS: 0.075 },
  { razon: 4.15, amplitud: 0.24, caidaS: 0.05 },
  { razon: 5.52, amplitud: 0.14, caidaS: 0.035 },
];

/**
 * UN RESONADOR DE DOS POLOS por modo: y[n] = 2r·cos(ω)·y[n−1] − r²·y[n−2] + x[n]. Es la forma más barata
 * de tener un parcial que se excita con cada golpe del badajo y se apaga solo, sin volver a calcular
 * senos: cada golpe es un impulso a la entrada y el resonador hace el resto.
 */
function resonar(entrada: Float32Array, salida: Float32Array, sr: number, hz: number, caidaS: number, ganancia: number): void {
  const r = Math.exp(-1 / (caidaS * sr));
  const w = (DOS_PI * hz) / sr;
  const c1 = 2 * r * Math.cos(w);
  const c2 = -r * r;
  // La respuesta a un impulso es r^n·sen(ω(n+1))/sen(ω): multiplicar por sen(ω) deja su pico en 1,
  // sea cual sea la frecuencia, y así la `amplitud` de cada modo quiere decir lo que dice.
  const norma = Math.max(Math.sin(w), 0.02);
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < entrada.length; i++) {
    const y = c1 * y1 + c2 * y2 + (entrada[i] ?? 0);
    y2 = y1;
    y1 = y;
    salida[i] = (salida[i] ?? 0) + y * norma * ganancia;
  }
}

/**
 * EL TIMBRE DE UN TELÉFONO ANTIGUO: dos cazoletas de acero y un badajo que va de una a otra veinte
 * veces por segundo. Un ciclo de la cadencia, mono (la cabina se coloca en 3D con un panoramizador).
 *
 * Las dos cazoletas no están afinadas igual (1180 y 1410 Hz), y eso es el carácter: el batido entre
 * las dos es el «rrrr» que se reconoce a dos calles. Cada golpe lleva además un roce del badajo (un
 * pulso de ruido) que se oye directo, porque un timbre de verdad no es sólo campana: es mecánica.
 */
export function timbreDeCabina(frecuenciaDeMuestreo: number, semilla = 3): Muestras {
  const sr = frecuenciaDeMuestreo;
  const { sonandoS, callandoS, golpesPorSegundo } = CADENCIA_DEL_TIMBRE;
  const n = Math.round((sonandoS + callandoS) * sr);
  const azar = azarSembrado(semilla);
  const golpesA = new Float32Array(n);
  const golpesB = new Float32Array(n);
  const roce = new Float32Array(n);
  const golpes = Math.floor(sonandoS * golpesPorSegundo);
  for (let g = 0; g < golpes; g++) {
    for (const [destino, desfase] of [
      [golpesA, 0],
      [golpesB, 0.5],
    ] as const) {
      const t = (g + desfase) / golpesPorSegundo + entre(azar, -0.0015, 0.0015);
      const i = Math.max(0, Math.round(t * sr));
      if (i >= n) continue;
      // El primer golpe y los últimos, más flojos: el badajo arranca y se para.
      const rampa = Math.min(1, (g + 1) / 3) * Math.min(1, (golpes - g) / 2);
      const fuerza = (0.8 + 0.2 * azar()) * rampa;
      destino[i] = (destino[i] ?? 0) + fuerza;
      const largoDelRoce = Math.round(0.0012 * sr);
      for (let j = 0; j < largoDelRoce && i + j < n; j++) {
        roce[i + j] = (roce[i + j] ?? 0) + (azar() * 2 - 1) * fuerza * (1 - j / largoDelRoce);
      }
    }
  }
  const salida = new Float32Array(n);
  for (const modo of MODOS_DE_CAZOLETA) {
    resonar(golpesA, salida, sr, 1180 * modo.razon, modo.caidaS, modo.amplitud);
    resonar(golpesB, salida, sr, 1410 * modo.razon * 1.004, modo.caidaS, modo.amplitud * 0.9);
  }
  // El roce, pasado por una derivada (sólo agudos) y bajito.
  let anterior = 0;
  for (let i = 0; i < n; i++) {
    const v = roce[i] ?? 0;
    salida[i] = (salida[i] ?? 0) + (v - anterior) * 0.08;
    anterior = v;
  }
  normalizar([salida], 0.9);
  return salida;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// La lluvia
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Escribe una forma corta en `canal` a partir de `inicio`, DANDO LA VUELTA al final. Es lo que hace
 * que el bucle no tenga costura (ver la cabecera).
 */
function escribirEnBucle(canal: Float32Array, inicio: number, forma: Float32Array, ganancia: number): void {
  const n = canal.length;
  for (let j = 0; j < forma.length; j++) {
    const i = (inicio + j) % n;
    canal[i] = (canal[i] ?? 0) + (forma[j] ?? 0) * ganancia;
  }
}

/**
 * UNA GOTA SOBRE AGUA: la burbuja de Minnaert. Cuando una gota cae en un charco atrapa una burbuja de
 * aire que vibra a una frecuencia que depende de su radio (1-5 kHz para gotas de lluvia) y que SUBE un
 * poco mientras la burbuja asciende. Es el «plic» que distingue la lluvia sobre charcos de un ruido
 * blanco con filtro, que es lo que suena la lluvia de casi todos los juegos.
 */
function burbuja(sr: number, hz: number, caidaS: number): Float32Array {
  const largo = Math.max(4, Math.round(caidaS * 6 * sr));
  const forma = new Float32Array(largo);
  let fase = 0;
  for (let j = 0; j < largo; j++) {
    const t = j / sr;
    const f = hz * (1 + (0.35 * t) / (caidaS * 6));
    fase += (DOS_PI * f) / sr;
    const ataque = Math.min(1, j / (0.0004 * sr));
    forma[j] = Math.sin(fase) * Math.exp(-t / caidaS) * ataque;
  }
  return forma;
}

/** Un «tac» de gota sobre algo duro: 1-3 ms de ruido derivado (sólo agudos). */
function tac(sr: number, azar: () => number, duracionS: number): Float32Array {
  const largo = Math.max(3, Math.round(duracionS * sr));
  const forma = new Float32Array(largo);
  let anterior = 0;
  for (let j = 0; j < largo; j++) {
    const v = (azar() * 2 - 1) * (1 - j / largo);
    forma[j] = v - anterior;
    anterior = v;
  }
  return forma;
}

/**
 * LAS GOTAS DE LA LLUVIA sobre la calle, en estéreo y en bucle. Siete de cada diez son burbuja (charco)
 * y el resto «tac» (acera, capó, marquesina lejana). La fuerza sigue una ley de potencia: muchísimas
 * gotas diminutas y alguna gorda. Con fuerzas iguales la lluvia suena a fritura.
 *
 * El siseo continuo de la lluvia NO está aquí: es ruido rosa filtrado en tiempo real (`ambiente.ts`),
 * porque su color cambia con el tiempo de la noche y con la marquesina.
 */
export function gotasDeLluvia(frecuenciaDeMuestreo: number, segundos: number, porSegundo: number, semilla: number): Estereo {
  const sr = frecuenciaDeMuestreo;
  const n = Math.round(segundos * sr);
  const izquierda = new Float32Array(n);
  const derecha = new Float32Array(n);
  const azar = azarSembrado(semilla);
  const cuantas = Math.round(segundos * porSegundo);
  for (let g = 0; g < cuantas; g++) {
    const inicio = Math.floor(azar() * n);
    const fuerza = 0.04 + 0.96 * Math.pow(azar(), 3);
    const lado = azar();
    const forma = azar() < 0.7 ? burbuja(sr, entre(azar, 1300, 4600), entre(azar, 0.003, 0.011)) : tac(sr, azar, entre(azar, 0.001, 0.003));
    escribirEnBucle(izquierda, inicio, forma, fuerza * Math.cos(lado * Math.PI * 0.5));
    escribirEnBucle(derecha, inicio, forma, fuerza * Math.sin(lado * Math.PI * 0.5));
  }
  normalizar([izquierda, derecha], 0.9);
  return [izquierda, derecha];
}

/**
 * EL GOLPETEO SOBRE UNA MARQUESINA: gotas gordas (las que se juntan en el borde) sobre lona o chapa
 * fina. Graves (180-480 Hz), secas y densas. Es la capa que aparece al meterse debajo: sin ella, la
 * marquesina sería sólo «la lluvia con menos agudos», que el oído no lee como techo.
 */
export function golpeteoEnToldo(frecuenciaDeMuestreo: number, segundos: number, porSegundo: number, semilla: number): Muestras {
  const sr = frecuenciaDeMuestreo;
  const n = Math.round(segundos * sr);
  const salida = new Float32Array(n);
  const azar = azarSembrado(semilla);
  const cuantas = Math.round(segundos * porSegundo);
  for (let g = 0; g < cuantas; g++) {
    const inicio = Math.floor(azar() * n);
    const hz = entre(azar, 180, 480);
    const caida = entre(azar, 0.008, 0.022);
    const largo = Math.round(caida * 5 * sr);
    const forma = new Float32Array(largo);
    for (let j = 0; j < largo; j++) {
      const t = j / sr;
      // Tono con un golpe de ruido encima: la lona suena a «tuc», no a diapasón.
      forma[j] = Math.sin(DOS_PI * hz * t) * Math.exp(-t / caida) + (j < sr * 0.0015 ? (azar() * 2 - 1) * 0.5 : 0);
    }
    escribirEnBucle(salida, inicio, forma, 0.15 + 0.85 * Math.pow(azar(), 2));
  }
  normalizar([salida], 0.9);
  return salida;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// La cuerda pulsada (la guitarra de la Llamada)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * UNA CUERDA PULSADA por Karplus-Strong: una línea de retardo del largo de un periodo, rellena de
 * ruido, que se promedia consigo misma en cada vuelta. El promedio se come los agudos vuelta a vuelta,
 * y eso es exactamente lo que hace una cuerda de nailon: arranca brillante y se queda redonda.
 *
 * El retardo es FRACCIONARIO (interpolación lineal) porque a 48 kHz un La de 440 Hz son 109,09
 * muestras: redondear a 109 lo deja un sexto de semitono alto, y un arpegio con cuatro notas
 * desafinadas cada una a su manera suena a guitarra rota, no a madrugada.
 *
 * El ruido de partida se suaviza y se «pulsa» a un quinto de la cuerda (se resta a sí mismo
 * desplazado), que es lo que distingue el dedo de una púa.
 */
export function cuerdaPulsada(frecuenciaDeMuestreo: number, hz: number, segundos: number, semilla: number): Muestras {
  const sr = frecuenciaDeMuestreo;
  const n = Math.round(segundos * sr);
  const salida = new Float32Array(n);
  // El promedio de dos muestras vecinas añade media muestra de retardo: se descuenta para afinar.
  const periodo = sr / hz - 0.5;
  const largo = Math.ceil(periodo) + 2;
  const linea = new Float32Array(largo);
  const azar = azarSembrado(semilla);
  let suave = 0;
  for (let i = 0; i < largo; i++) {
    suave += 0.45 * (azar() * 2 - 1 - suave);
    linea[i] = suave;
  }
  const desplazado = Math.max(1, Math.round(largo / 5));
  const excitacion = Float32Array.from(linea, (v, i) => v - 0.6 * (linea[(i + largo - desplazado) % largo] ?? 0));
  linea.set(excitacion);
  // Pérdida por vuelta. El promedio apenas toca la fundamental (a 220 Hz pierde un 2 % por segundo),
  // así que sin esto la nota no se apagaría nunca: se pide que caiga 60 dB en 2,2 s. Los armónicos
  // caen antes por el promedio, como en una cuerda de verdad.
  const perdida = Math.pow(10, -3 / (hz * 2.2));
  let escribir = 0;
  let anterior = 0;
  for (let i = 0; i < n; i++) {
    const leer = escribir - periodo;
    const base = Math.floor(leer);
    const fr = leer - base;
    const a = linea[((base % largo) + largo) % largo] ?? 0;
    const b = linea[(((base + 1) % largo) + largo) % largo] ?? 0;
    const retrasada = a + (b - a) * fr;
    const y = perdida * 0.5 * (retrasada + anterior);
    anterior = retrasada;
    linea[escribir % largo] = y;
    salida[i] = y;
    escribir++;
  }
  // Un final sin clic, por si el bucle de la música la corta en seco.
  const cola = Math.min(n, Math.round(0.03 * sr));
  for (let j = 0; j < cola; j++) salida[n - 1 - j] = (salida[n - 1 - j] ?? 0) * (j / cola);
  normalizar([salida], 0.9);
  return salida;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// Cristal, chapa y palomas
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/** Suma un parcial amortiguado (seno con caída exponencial) a los dos canales, con su lado. */
function parcial(
  izquierda: Float32Array,
  derecha: Float32Array | null,
  sr: number,
  inicioS: number,
  hz: number,
  amplitud: number,
  caidaS: number,
  lado: number,
): void {
  const n = izquierda.length;
  const inicio = Math.round(inicioS * sr);
  const largo = Math.min(n - inicio, Math.round(caidaS * 7 * sr));
  const gi = derecha === null ? 1 : Math.cos(lado * Math.PI * 0.5);
  const gd = Math.sin(lado * Math.PI * 0.5);
  const ataque = Math.max(1, Math.round(0.0003 * sr));
  for (let j = 0; j < largo; j++) {
    const t = j / sr;
    const v = Math.sin(DOS_PI * hz * t) * Math.exp(-t / caidaS) * amplitud * Math.min(1, j / ataque);
    const i = inicio + j;
    izquierda[i] = (izquierda[i] ?? 0) + v * gi;
    if (derecha !== null) derecha[i] = (derecha[i] ?? 0) + v * gd;
  }
}

/** Una ráfaga de ruido derivado (agudos), con caída lineal. */
function rafaga(canal: Float32Array, sr: number, azar: () => number, inicioS: number, duracionS: number, amplitud: number): void {
  const inicio = Math.round(inicioS * sr);
  const largo = Math.round(duracionS * sr);
  let anterior = 0;
  for (let j = 0; j < largo && inicio + j < canal.length; j++) {
    const v = (azar() * 2 - 1) * (1 - j / largo);
    canal[inicio + j] = (canal[inicio + j] ?? 0) + (v - anterior) * amplitud;
    anterior = v;
  }
}

/**
 * UN CRISTAL QUE SE ROMPE (el del quiosco, el de un escaparate, el de un coche): el crujido, el
 * estallido y las esquirlas que caen durante casi un segundo, cada vez menos y más flojas. Las
 * esquirlas se amontonan al principio (`r^1,6`): el cristal cae casi todo de golpe y lo último son
 * cuatro trozos rezagados, que es justo lo que el oído espera.
 */
export function cristalRoto(frecuenciaDeMuestreo: number, semilla: number): Estereo {
  const sr = frecuenciaDeMuestreo;
  const n = Math.round(1.3 * sr);
  const izquierda = new Float32Array(n);
  const derecha = new Float32Array(n);
  const azar = azarSembrado(semilla);
  // El crujido: ruido derivado en los dos canales, casi centrado.
  rafaga(izquierda, sr, azar, 0, 0.008, 0.9);
  rafaga(derecha, sr, azar, 0.0006, 0.008, 0.9);
  // El estallido: parciales altos e inarmónicos.
  for (let p = 0; p < 14; p++) {
    parcial(izquierda, derecha, sr, entre(azar, 0, 0.015), entre(azar, 2500, 9000), entre(azar, 0.2, 0.55), entre(azar, 0.03, 0.17), azar());
  }
  // Las esquirlas que caen.
  for (let e = 0; e < 38; e++) {
    const t = 0.05 + 0.95 * Math.pow(azar(), 1.6);
    const amplitud = entre(azar, 0.05, 0.35) * (1 - t / 1.3);
    const lado = azar();
    const parciales = 2 + Math.floor(azar() * 3);
    for (let p = 0; p < parciales; p++) {
      parcial(izquierda, derecha, sr, t, entre(azar, 3000, 10500), amplitud / (p + 1), entre(azar, 0.01, 0.05), lado);
    }
  }
  const fundido = Math.round(0.05 * sr);
  for (let j = 0; j < fundido; j++) {
    const k = j / fundido;
    izquierda[n - 1 - j] = (izquierda[n - 1 - j] ?? 0) * k;
    derecha[n - 1 - j] = (derecha[n - 1 - j] ?? 0) * k;
  }
  normalizar([izquierda, derecha], 0.9);
  return [izquierda, derecha];
}

/**
 * Los modos de una chapa de coche (una puerta, un capó): una placa fina, con parciales que se apiñan
 * hacia arriba. Razones aproximadas de placa apoyada, con un desafinado por semilla para que dos
 * coches no suenen al mismo coche.
 */
const RAZONES_DE_CHAPA: readonly number[] = [1, 1.73, 2.45, 2.95, 3.9, 4.6, 5.3, 6.8, 8.1, 9.7, 11.9, 14.2];

/**
 * UNA CHAPA GOLPEADA: el Celador que se estampa contra un coche aparcado. Un «bong» metálico grave y
 * largo, un abollón (ruido por un resonador a 700 Hz) y un golpe sordo. Mono: se coloca en 3D en el
 * sitio del coche.
 */
export function chapaGolpeada(frecuenciaDeMuestreo: number, semilla: number): Muestras {
  const sr = frecuenciaDeMuestreo;
  const n = Math.round(1.4 * sr);
  const salida = new Float32Array(n);
  const azar = azarSembrado(semilla);
  const fundamental = entre(azar, 95, 130);
  RAZONES_DE_CHAPA.forEach((razon, k) => {
    const hz = fundamental * razon * entre(azar, 0.97, 1.03);
    const amplitud = (0.5 + 0.5 * azar()) / Math.sqrt(k + 1);
    const caida = k < 3 ? entre(azar, 0.25, 0.4) : entre(azar, 0.04, 0.12);
    parcial(salida, null, sr, 0, hz, amplitud, caida, 0);
  });
  // El abollón: ruido corto por un resonador de dos polos.
  const abollon = new Float32Array(n);
  for (let j = 0; j < Math.round(0.025 * sr); j++) abollon[j] = (azar() * 2 - 1) * (1 - j / (0.025 * sr));
  resonar(abollon, salida, sr, 700, 0.03, 0.12);
  // El golpe sordo del cuerpo contra la chapa.
  parcial(salida, null, sr, 0, 62, 1.1, 0.07, 0);
  normalizar([salida], 0.9);
  return salida;
}

/**
 * LAS PALOMAS QUE DESPEGAN (el Bis). Siete pájaros; cada uno arranca con una PALMADA de alas (la
 * paloma de verdad las choca al despegar, y es lo que hace volverse a mirar) y después aletea a 8-10
 * batidas por segundo, cada vez más lejos y más despacio. Cada batida es un soplo de ruido con un paso
 * bajo que se abre y se cierra: «fup».
 */
export function aleteo(frecuenciaDeMuestreo: number, semilla: number): Estereo {
  const sr = frecuenciaDeMuestreo;
  const n = Math.round(1.6 * sr);
  const izquierda = new Float32Array(n);
  const derecha = new Float32Array(n);
  const azar = azarSembrado(semilla);
  for (let p = 0; p < 7; p++) {
    const arranque = entre(azar, 0, 0.25);
    const lado = azar();
    const gi = Math.cos(lado * Math.PI * 0.5);
    const gd = Math.sin(lado * Math.PI * 0.5);
    // La palmada, con ruido distinto en cada canal (es un golpe con cuerpo, no un punto).
    rafaga(izquierda, sr, azar, arranque, 0.004, 0.6 * gi);
    rafaga(derecha, sr, azar, arranque, 0.004, 0.6 * gd);
    // Las batidas.
    let t = arranque + 0.02;
    let ritmo = entre(azar, 8.5, 10);
    let fuerza = entre(azar, 0.5, 0.9);
    while (t < 1.5 && fuerza > 0.03) {
      const largo = Math.round(entre(azar, 0.03, 0.045) * sr);
      const inicio = Math.round(t * sr);
      let y = 0;
      const corte = entre(azar, 1800, 3200);
      const a = 1 - Math.exp((-DOS_PI * corte) / sr);
      for (let j = 0; j < largo && inicio + j < n; j++) {
        const u = j / largo;
        const forma = u < 0.15 ? u / 0.15 : Math.pow(1 - (u - 0.15) / 0.85, 2);
        y += a * (azar() * 2 - 1 - y);
        const v = y * forma * fuerza;
        izquierda[inicio + j] = (izquierda[inicio + j] ?? 0) + v * gi;
        derecha[inicio + j] = (derecha[inicio + j] ?? 0) + v * gd;
      }
      t += 1 / ritmo;
      ritmo *= 0.97;
      fuerza *= 0.86;
    }
  }
  normalizar([izquierda, derecha], 0.8);
  return [izquierda, derecha];
}
