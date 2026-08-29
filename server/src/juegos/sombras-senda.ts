/**
 * El generador del rompecabezas de la senda.
 *
 * ES LA PIEZA CON MÁS MIGA DEL JUEGO Y LA QUE NO PUEDE FALLAR. Una senda con
 * dos soluciones deja a la mesa discutiendo sin manera de decidir; una sin
 * ninguna hace que no se llegue a la playa hiciera lo que hiciera nadie. Las
 * dos averías se descubrirían de noche, con doce personas de pie en un pasillo
 * y sin arreglo posible. Así que aquí no se escriben condiciones bonitas y se
 * confía: se escriben y se COMPRUEBAN contra todas las variaciones, una a una.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EN QUÉ SE PARECE AL DE LA MOMIA Y EN QUÉ NO
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Se parece en la arquitectura, y eso es deliberado: las cuatro garantías, la
 * fuerza bruta, la semilla, la minimización y las falsas por refutabilidad son
 * exactamente las mismas ideas, y están probadas. Copiar una arquitectura que
 * funciona es más honesto que inventar una peor por no repetirse.
 *
 * No se parece en el problema. Allí el espacio eran las PERMUTACIONES de cinco
 * ritos —120, y todos los ritos entraban—. Aquí son las VARIACIONES de cuatro
 * pasos tomados de todos los que haya —360 con seis pasos, 1 680 con ocho— y
 * hay que averiguar a la vez CUÁLES entran y EN QUÉ ORDEN. De ahí salen los dos
 * tipos de condición que la Momia no tenía, `pasa-por` y `no-pasa-por`, sin los
 * cuales la mitad del problema no tendría pistas.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LAS CUATRO GARANTÍAS (§4.2 del diseño), y por qué cada una
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   1. CONSISTENCIA — existe alguna senda que cumple todas. Sale gratis por
 *      construcción: todas las condiciones se sacan de una senda concreta. Se
 *      comprueba igual, porque «sale gratis por construcción» es exactamente lo
 *      que se dice de los fallos que luego aparecen.
 *   2. UNICIDAD — exactamente una. Con dos, media mesa defiende una y media la
 *      otra y no hay forma de zanjarlo.
 *   3. SUFICIENCIA REPARTIDA — el conjunto entero resuelve, pero los hitos de
 *      una sola persona no. Si alguien puede resolverlo en solitario, el juego
 *      pierde su razón de ser: se callaría y ganaría sin hablar con nadie.
 *   4. MINIMALIDAD — quitar cualquier condición hace aparecer más de una senda.
 *      Sin esto se generan pilas de condiciones redundantes y el camino se
 *      resuelve con la mitad de las tiras sobre la mesa.
 *
 * LA 4 IMPLICA LA 3, y conviene tenerlo presente para no creer que la 3 está
 * comprobada cuando no lo está: si el conjunto es mínimo, cualquier subconjunto
 * PROPIO admite ≥2 sendas, luego basta con que nadie se quede con el conjunto
 * entero. Aun así las dos se comprueban por separado, porque son garantías
 * distintas y la implicación depende de que la minimalidad sea de verdad.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SOBRE EL COSTE, QUE AQUÍ SÍ IMPORTA
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * La Momia podía permitirse recalcular las 120 permutaciones en cada vuelta.
 * Aquí el espacio es de tres a catorce veces mayor y hay un bucle de intentos
 * dentro de otro de minimización, así que **las variaciones se calculan UNA vez
 * por llamada** y todo lo demás trabaja sobre índices de esa lista. Es la única
 * concesión al rendimiento, y no toca la lógica: se sigue comprobando todo
 * contra todas las variaciones.
 */
import {
  cumpleCondicion,
  sendasDe,
  TRAMOS_DE_LA_SENDA,
  variaciones,
} from '../../../shared/juegos/sombras-tipos';
import type { Condicion, PasoId } from '../../../shared/juegos/sombras-tipos';

/**
 * Con cuántos pasos se deja de generar.
 *
 * No es un límite del juego —una casa con dieciséis habitaciones jugaría
 * perfectamente— sino una red contra el cuelgue: `P(20,4)` son 116 280
 * variaciones y las falsas candidatas se evalúan contra todas ellas. Reventar
 * aquí, con el taller delante y un mensaje claro, es infinitamente mejor que
 * dejar la generación colgada sin que nadie sepa por qué.
 */
export const PASOS_MAXIMOS = 16;

// ---------------------------------------------------------------------------
// El azar, con semilla
// ---------------------------------------------------------------------------

/** FNV-1a: una cadena cualquiera se convierte en semilla sin colisiones tontas. */
function semillaNumerica(semilla: string | number): number {
  if (typeof semilla === 'number') return semilla >>> 0;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < semilla.length; i++) {
    h ^= semilla.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * mulberry32: doce líneas, período de sobra para lo que aquí se pide.
 *
 * No se usa `Math.random` en ningún sitio de este fichero, y no es manía: con
 * él, una senda que saliera mal no se podría volver a generar para mirarla.
 */
function azarCon(semilla: string | number): () => number {
  let s = semillaNumerica(semilla);
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates sobre una copia. */
function barajar<T>(items: T[], rnd: () => number): T[] {
  const salida = [...items];
  for (let i = salida.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [salida[i], salida[j]] = [salida[j]!, salida[i]!];
  }
  return salida;
}

// ---------------------------------------------------------------------------
// El universo de condiciones
// ---------------------------------------------------------------------------

/**
 * Cuánto se quiere ver cada tipo de condición.
 *
 * NO SON PESOS DE ADORNO. Una sola `posicion` parte las 360 variaciones en 60
 * de un tajo, así que un rompecabezas hecho de posiciones se resuelve con tres
 * tiras y sin hablar con nadie. `antes` es la que menos corta y la que más
 * obliga a combinar, así que es la que más sale.
 *
 * `no-pasa-por` pesa alto a propósito aunque corta bastante: es la única forma
 * que hay de decir que un paso queda FUERA, y sin ella la mitad del problema
 * —cuáles entran— se quedaría sin pistas directas y la mesa acabaría deduciendo
 * exclusiones por agotamiento, que es tedioso y no es jugar.
 */
const PESO: Record<Condicion['tipo'], number> = {
  antes: 6,
  'no-posicion': 5,
  'no-pasa-por': 3,
  seguido: 3,
  'pasa-por': 3,
  extremo: 2,
  posicion: 1,
};

/**
 * Todas las condiciones CIERTAS para una senda dada, sobre todos los pasos.
 *
 * Con seis pasos son 41, casualmente las mismas que tenía la Momia con cinco
 * ritos, y por caminos distintos: allí eran diez `antes`, cuatro
 * `inmediatamente-antes`, cinco `posicion`, veinte `no-posicion` y dos
 * `extremos`; aquí seis `antes`, tres `seguido`, cuatro `posicion`, veinte
 * `no-posicion`, dos `extremo`, cuatro `pasa-por` y dos `no-pasa-por`.
 *
 * Que todas sean ciertas es lo que regala la garantía 1.
 */
export function universoCierto(pasos: PasoId[], senda: PasoId[]): Condicion[] {
  const salida: Condicion[] = [];
  const k = senda.length;
  const dentro = new Set(senda);

  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      salida.push({ tipo: 'antes', a: senda[i]!, b: senda[j]! });
    }
    if (i + 1 < k) salida.push({ tipo: 'seguido', a: senda[i]!, b: senda[i + 1]! });
    salida.push({ tipo: 'posicion', a: senda[i]!, posicion: i + 1 });
    salida.push({ tipo: 'pasa-por', a: senda[i]! });
  }
  salida.push({ tipo: 'extremo', a: senda[0]! });
  salida.push({ tipo: 'extremo', a: senda[k - 1]! });

  for (const paso of pasos) {
    const donde = senda.indexOf(paso);
    if (donde < 0) salida.push({ tipo: 'no-pasa-por', a: paso });
    for (let q = 1; q <= k; q++) {
      if (donde !== q - 1) salida.push({ tipo: 'no-posicion', a: paso, posicion: q });
    }
  }
  return salida;
}

/** Todas las condiciones que se pueden escribir sobre estos pasos, ciertas o no. */
export function universoEntero(pasos: PasoId[], tramos = TRAMOS_DE_LA_SENDA): Condicion[] {
  const salida: Condicion[] = [];
  for (const a of pasos) {
    for (const b of pasos) {
      if (a === b) continue;
      salida.push({ tipo: 'antes', a, b });
      salida.push({ tipo: 'seguido', a, b });
    }
    for (let q = 1; q <= tramos; q++) {
      salida.push({ tipo: 'posicion', a, posicion: q });
      salida.push({ tipo: 'no-posicion', a, posicion: q });
    }
    salida.push({ tipo: 'extremo', a });
    salida.push({ tipo: 'pasa-por', a });
    salida.push({ tipo: 'no-pasa-por', a });
  }
  return salida;
}

/** Dos condiciones son la misma si dicen lo mismo. Para no repetir hitos. */
export function claveDe(c: Condicion): string {
  switch (c.tipo) {
    case 'antes':
    case 'seguido':
      return `${c.tipo}|${c.a}|${c.b}`;
    case 'posicion':
    case 'no-posicion':
      return `${c.tipo}|${c.a}|${c.posicion}`;
    case 'extremo':
    case 'pasa-por':
    case 'no-pasa-por':
      return `${c.tipo}|${c.a}`;
  }
}

/**
 * Baraja dando más papeletas a los tipos que hacen mejor rompecabezas.
 *
 * Se implementa con claves exponenciales (`-ln(u)/peso`): ordenar por esa clave
 * equivale a ir sacando de un bombo donde cada elemento tiene tantas papeletas
 * como su peso, y sale en una pasada en vez de en un bucle de extracciones.
 */
function barajarConPesos(items: Condicion[], rnd: () => number): Condicion[] {
  return items
    .map((c) => ({ c, clave: -Math.log(Math.max(rnd(), 1e-12)) / PESO[c.tipo] }))
    .sort((x, y) => x.clave - y.clave)
    .map((x) => x.c);
}

// ---------------------------------------------------------------------------
// El tablero de trabajo: las variaciones, calculadas una sola vez
// ---------------------------------------------------------------------------

/**
 * Las variaciones y las máscaras de cada condición sobre ellas.
 *
 * Es lo que permite que todo lo demás sean operaciones sobre `Uint8Array` en
 * vez de recorrer listas de listas. La lógica no cambia —se sigue comprobando
 * contra TODAS las variaciones— pero el coste pasa de minutos a milisegundos
 * cuando la casa tiene diez habitaciones.
 */
class Tablero {
  readonly sendas: PasoId[][];
  private readonly cache = new Map<string, Uint8Array>();

  constructor(pasos: PasoId[], tramos: number) {
    this.sendas = variaciones(pasos, tramos);
  }

  /** Qué variaciones cumplen esta condición. Se memoriza por clave. */
  mascara(c: Condicion): Uint8Array {
    const clave = claveDe(c);
    const ya = this.cache.get(clave);
    if (ya) return ya;
    const m = new Uint8Array(this.sendas.length);
    for (let i = 0; i < this.sendas.length; i++) {
      m[i] = cumpleCondicion(this.sendas[i]!, c) ? 1 : 0;
    }
    this.cache.set(clave, m);
    return m;
  }

  /** Índices de las variaciones que cumplen TODAS. */
  supervivientes(condiciones: Condicion[]): number[] {
    const mascaras = condiciones.map((c) => this.mascara(c));
    const salida: number[] = [];
    for (let i = 0; i < this.sendas.length; i++) {
      let vale = true;
      for (const m of mascaras) {
        if (!m[i]) {
          vale = false;
          break;
        }
      }
      if (vale) salida.push(i);
    }
    return salida;
  }

  /** Cuántas variaciones sobreviven. Es lo que se pregunta casi siempre. */
  cuantas(condiciones: Condicion[]): number {
    return this.supervivientes(condiciones).length;
  }
}

// ---------------------------------------------------------------------------
// Las falsas candidatas
// ---------------------------------------------------------------------------

/** Una condición que contradice la senda verdadera, con lo cara que es de pillar. */
export interface FalsaCandidata {
  condicion: Condicion;
  /**
   * Cuántos hitos CIERTOS hacen falta, como mínimo, para desmentirla.
   *
   * Es la medida de lo bien que engaña, y es lo que separa una falsa buena de
   * una inútil. Si con 1 basta, alguien pone su tira al lado y se acabó en dos
   * segundos: la mesa ni siquiera duda, y encima queda señalado quien la puso.
   * A partir de 2 hay que combinar, y combinar es hablar, que es de lo que vive
   * este juego.
   */
  refutabilidad: number;
}

/**
 * El mínimo de hitos ciertos que dejan sin salida a una falsa.
 *
 * Se busca por tamaños crecientes y se corta en `tope`: saber si son dos o tres
 * no cambia ninguna decisión —el filtro es «≥2»— y la búsqueda exhaustiva se
 * paga en un generador que se llama doscientas veces seguidas.
 */
export function refutabilidad(
  tablero: Tablero,
  verdaderas: Condicion[],
  falsa: Condicion,
  tope = 2,
): number {
  const suya = tablero.mascara(falsa);
  const compatibles: number[] = [];
  for (let i = 0; i < suya.length; i++) if (suya[i]) compatibles.push(i);
  // Absurda por sí sola: ninguna senda la cumple, así que no vale ni de falsa.
  if (compatibles.length === 0) return 0;

  const mascaras = verdaderas.map((c) => tablero.mascara(c));

  const mata = (indices: number[]): boolean => {
    for (const s of compatibles) {
      let sobrevive = true;
      for (const i of indices) {
        if (!mascaras[i]![s]) {
          sobrevive = false;
          break;
        }
      }
      // Si una senda compatible con la falsa cumple además todas las elegidas,
      // ese subconjunto NO la desmiente.
      if (sobrevive) return false;
    }
    return true;
  };

  for (let k = 1; k <= Math.min(tope, verdaderas.length); k++) {
    let encontrado = false;
    const combinar = (desde: number, elegidos: number[]): void => {
      if (encontrado) return;
      if (elegidos.length === k) {
        if (mata(elegidos)) encontrado = true;
        return;
      }
      for (let i = desde; i < verdaderas.length && !encontrado; i++) {
        combinar(i + 1, [...elegidos, i]);
      }
    };
    combinar(0, []);
    if (encontrado) return k;
  }
  return tope + 1;
}

/**
 * Prepara las falsas que se le ofrecerán al kanchō cuando use su papel.
 *
 * SE DESCARTAN LAS QUE UN SOLO HITO DESMIENTE. Es el criterio entero del §4.3:
 * «no absurdas a primera vista». Una falsa que choca de frente con una tira ya
 * pública no engaña a nadie y encima delata a quien la puso, que es lo contrario
 * de lo que se quiere.
 *
 * Y SE DESCARTAN TAMBIÉN LAS `no-pasa-por` SOBRE PASOS QUE DE VERDAD QUEDAN
 * FUERA, aunque eso ya lo hace el filtro de «contradice la senda»: se dice aquí
 * porque es el error que se comete al leer este código deprisa. Una falsa tiene
 * que ser FALSA; una que resultara cierta por accidente ayudaría a la mesa, que
 * es exactamente el regalo que el traidor no debe hacer.
 */
export function falsasCandidatas(
  tablero: Tablero,
  pasos: PasoId[],
  senda: PasoId[],
  verdaderas: Condicion[],
  rnd: () => number,
  cuantas: number,
): FalsaCandidata[] {
  const yaEstan = new Set(verdaderas.map(claveDe));
  const brutas = universoEntero(pasos, senda.length)
    .filter((c) => !cumpleCondicion(senda, c))
    .filter((c) => !yaEstan.has(claveDe(c)));

  /*
   * SE BARAJA ANTES DE EVALUAR Y SE CORTA AL LLEGAR AL CUPO.
   *
   * Evaluar la refutabilidad de las doscientas o trescientas candidatas que hay
   * con diez pasos cuesta bastante más que el resto del generador junto, y no
   * hace falta: lo que se busca son cuatro o cinco falsas buenas, no la
   * clasificación completa. Barajando primero, el corte no introduce sesgo — y
   * el orden final sigue siendo por refutabilidad, que es lo que importa.
   */
  const encontradas: FalsaCandidata[] = [];
  const cupo = Math.max(cuantas * 3, cuantas + 6);
  for (const condicion of barajar(brutas, rnd)) {
    if (encontradas.length >= cupo) break;
    const r = refutabilidad(tablero, verdaderas, condicion);
    if (r >= 2) encontradas.push({ condicion, refutabilidad: r });
  }

  // Primero las más difíciles de pillar; el desempate ya viene barajado.
  return encontradas.sort((a, b) => b.refutabilidad - a.refutabilidad).slice(0, cuantas);
}

/**
 * La refutabilidad de una falsa, sin tener que montar el tablero fuera.
 *
 * EXISTE POR EL IMPRIMIBLE «Informe de la senda», que rehace las comprobaciones
 * sobre la trama GUARDADA —no sobre la que se generó— para que, si alguien tocó
 * la partida después, el informe se entere. Ese documento vive en `docs/` y no
 * tiene por qué conocer el `Tablero`, que es un detalle de rendimiento de aquí.
 */
export function refutabilidadDe(
  pasos: PasoId[],
  verdaderas: Condicion[],
  falsa: Condicion,
  tramos = TRAMOS_DE_LA_SENDA,
): number {
  return refutabilidad(new Tablero(pasos, tramos), verdaderas, falsa);
}

// ---------------------------------------------------------------------------
// El rompecabezas
// ---------------------------------------------------------------------------

export interface OpcionesSenda {
  pasos: PasoId[];
  /** Cuántas personas se repartirán los hitos. Mínimo dos. */
  jugadores: number;
  semilla?: string | number;
  /** Cuántos tramos tiene la senda. Por defecto, los cuatro del diseño. */
  tramos?: number;
  /** Cuántas mentiras preparar para el kanchō. */
  falsas?: number;
  /**
   * Por debajo de esto se vuelve a intentar con otra senda.
   *
   * NO SE RELLENA con condiciones de más: eso rompería la minimalidad, que es
   * justo la garantía que impide que el camino se resuelva solo. Se tira el
   * intento y se prueba otro, que es más lento y es lo correcto.
   */
  minimoCondiciones?: number;
}

export interface PuzleSombras {
  sendaVerdadera: PasoId[];
  condiciones: Condicion[];
  /** Índices de `condiciones`, una lista por jugador. Solo para comprobar. */
  reparto: number[][];
  falsas: FalsaCandidata[];
  /** Cuántas sendas se probaron antes de dar con una buena. Diagnóstico. */
  intentos: number;
}

/**
 * Reduce el conjunto a un núcleo mínimo.
 *
 * Se prueba a quitar cada una y se quita si el rompecabezas sigue teniendo una
 * sola solución. Se repite hasta que no se pueda quitar nada más: quitar una
 * puede hacer que otra que antes era imprescindible deje de serlo, y con una
 * sola pasada quedarían redundancias dentro.
 */
function minimizar(tablero: Tablero, condiciones: Condicion[], rnd: () => number): Condicion[] {
  let actuales = [...condiciones];
  let cambio = true;
  while (cambio) {
    cambio = false;
    for (const c of barajar(actuales, rnd)) {
      const sinElla = actuales.filter((x) => x !== c);
      if (sinElla.length > 0 && tablero.cuantas(sinElla) === 1) {
        actuales = sinElla;
        cambio = true;
        break;
      }
    }
  }
  return actuales;
}

/**
 * Genera un rompecabezas que cumple las cuatro garantías.
 *
 * @throws si no consigue uno en doscientos intentos. No debería pasar nunca con
 * seis pasos o más: es una red por si alguien cambia los pesos y deja el
 * generador pidiendo algo imposible. Mejor reventar aquí, al preparar, que a
 * medianoche.
 */
export function generarSenda(opciones: OpcionesSenda): PuzleSombras {
  const { pasos, jugadores } = opciones;
  const tramos = opciones.tramos ?? TRAMOS_DE_LA_SENDA;

  if (pasos.length < tramos + 2) {
    throw new Error(
      `Hacen falta al menos ${tramos + 2} pasos para trazar una senda de ${tramos}: con menos, ` +
        'averiguar CUÁLES entran deja de ser un problema.',
    );
  }
  if (pasos.length > PASOS_MAXIMOS) {
    throw new Error(
      `Son demasiados pasos (${pasos.length}). El máximo es ${PASOS_MAXIMOS}: por encima, las ` +
        'comprobaciones del rompecabezas dejan de terminar en un tiempo razonable.',
    );
  }
  if (new Set(pasos).size !== pasos.length) throw new Error('Hay pasos repetidos.');
  if (jugadores < 2) throw new Error('El camino se reparte entre dos personas como mínimo.');

  const rnd = azarCon(opciones.semilla ?? 'sombras');
  const minimo = opciones.minimoCondiciones ?? Math.max(4, Math.min(jugadores, tramos + 1));
  const tablero = new Tablero(pasos, tramos);

  for (let intentos = 1; intentos <= 200; intentos++) {
    const senda = barajar(pasos, rnd).slice(0, tramos);

    /*
     * Se van añadiendo condiciones ciertas y se descartan las que no recortan
     * nada: una que no quita ni una variación es redundante desde el primer
     * momento y solo alarga la minimización de después.
     */
    let vivas = tablero.sendas.map((_, i) => i);
    const elegidas: Condicion[] = [];
    for (const candidata of barajarConPesos(universoCierto(pasos, senda), rnd)) {
      if (vivas.length === 1) break;
      const m = tablero.mascara(candidata);
      const quedan = vivas.filter((i) => m[i]);
      if (quedan.length === vivas.length) continue;
      vivas = quedan;
      elegidas.push(candidata);
    }
    if (vivas.length !== 1) continue; // no debería ocurrir; si ocurre, otra senda

    const condiciones = minimizar(tablero, elegidas, rnd);
    if (condiciones.length < minimo) continue;

    /*
     * El reparto, por turnos sobre una baraja. Con dos o más personas nadie se
     * queda con el conjunto entero, y por la minimalidad eso basta para que los
     * hitos de cualquiera admitan ≥2 sendas. Se comprueba igual.
     */
    const indices = barajar(
      condiciones.map((_, i) => i),
      rnd,
    );
    const reparto: number[][] = Array.from({ length: jugadores }, () => []);
    indices.forEach((indice, i) => reparto[i % jugadores]!.push(indice));

    const repartida = reparto.every(
      (mios) => tablero.cuantas(mios.map((i) => condiciones[i]!)) >= 2,
    );
    if (!repartida) continue;

    return {
      sendaVerdadera: senda,
      condiciones,
      reparto,
      falsas: falsasCandidatas(tablero, pasos, senda, condiciones, rnd, opciones.falsas ?? 4),
      intentos,
    };
  }

  throw new Error('No se ha podido trazar una senda que cumpla las cuatro garantías.');
}

// ---------------------------------------------------------------------------
// La comprobación
// ---------------------------------------------------------------------------

export interface InformeDeLaSenda {
  soluciones: number;
  consistente: boolean;
  unico: boolean;
  /** Cuántas sendas admiten los hitos de cada persona, por separado. */
  solucionesPorJugador: number[];
  repartida: boolean;
  /** Las que se pueden quitar sin perder la unicidad. Vacío si es mínimo. */
  redundantes: Condicion[];
  minimo: boolean;
  /** La falsa más fácil de pillar. Menos de 2 es una falsa que no engaña. */
  refutabilidadMinima: number;
  falsasSanas: boolean;
  ok: boolean;
}

/**
 * Pasa las cuatro garantías por delante de TODAS las variaciones.
 *
 * Vive aquí y no en el comprobador porque la necesitan tres sitios: la prueba
 * que genera doscientos rompecabezas, la generación de una partida de verdad
 * —que no puede entregar un camino sin verificar— y el imprimible «informe de
 * la senda», que es esto mismo escrito para que lo lea quien dirige.
 *
 * NO REUTILIZA EL `Tablero` de la generación a propósito. Es una comprobación
 * independiente, y una comprobación que comparte el estado con lo que comprueba
 * no comprueba nada: si la caché de máscaras tuviera un fallo, este informe lo
 * heredaría y saldría en verde. Cuesta unos milisegundos y compra que las dos
 * mitades tengan que estar de acuerdo.
 */
export function verificarSenda(pasos: PasoId[], puzle: PuzleSombras): InformeDeLaSenda {
  const tramos = puzle.sendaVerdadera.length;
  const soluciones = sendasDe(pasos, puzle.condiciones, tramos);
  const unico =
    soluciones.length === 1 && soluciones[0]!.join('|') === puzle.sendaVerdadera.join('|');

  const solucionesPorJugador = puzle.reparto.map(
    (mios) => sendasDe(pasos, mios.map((i) => puzle.condiciones[i]!), tramos).length,
  );

  const redundantes = puzle.condiciones.filter((c) => {
    const sinElla = puzle.condiciones.filter((x) => x !== c);
    return sinElla.length > 0 && sendasDe(pasos, sinElla, tramos).length === 1;
  });

  const refutabilidadMinima = puzle.falsas.length
    ? Math.min(...puzle.falsas.map((f) => f.refutabilidad))
    : Infinity;
  /*
   * Que ninguna falsa sea cierta por accidente: sería un hito «falso» que encaja
   * con la senda real, y publicarlo AYUDARÍA a la mesa. El traidor no debe poder
   * regalar nada.
   */
  const falsasSanas =
    puzle.falsas.every((f) => !cumpleCondicion(puzle.sendaVerdadera, f.condicion)) &&
    refutabilidadMinima >= 2;

  const consistente = soluciones.length >= 1;
  const repartida = solucionesPorJugador.every((n) => n >= 2);
  const minimo = redundantes.length === 0;

  return {
    soluciones: soluciones.length,
    consistente,
    unico,
    solucionesPorJugador,
    repartida,
    redundantes,
    minimo,
    refutabilidadMinima,
    falsasSanas,
    ok: consistente && unico && repartida && minimo && falsasSanas,
  };
}

// ---------------------------------------------------------------------------
// Dónde aparece cada hito
// ---------------------------------------------------------------------------

export interface Hallazgo {
  hitoId: string;
  pasoId: PasoId;
  ronda: number;
}

/**
 * Reparte los hitos por pasos y horas.
 *
 * TODO PASO DA HITO, TODA HORA. Es lo que promete el diseño y lo que promete la
 * app con esas mismas palabras, y es una lección que la Momia pagó jugando una
 * velada de verdad: quien entraba en una cámara y salía con las manos vacías
 * daba por hecho que la app había fallado. Y era castigo doble, porque el
 * riesgo ya lo había corrido.
 *
 * SE REPITEN, Y POR ESO FUNCIONA. Un hito que dos personas encuentran no
 * estropea nada —dice lo mismo— y en cambio permite llenar las P×H casillas con
 * un rompecabezas de seis condiciones. Lo que decide reconocer un paso deja de
 * ser «si hay algo» y pasa a ser QUÉ hay, que es una decisión de verdad.
 *
 * Y AQUÍ HAY ALGO QUE LA MOMIA NO TENÍA: que dos personas en el mismo paso y a
 * la misma hora saquen EXACTAMENTE EL MISMO HITO no es un efecto secundario del
 * reparto, es el mecanismo de verificación del juego. Si dos que estuvieron
 * juntos cuentan cosas distintas, una miente. Cambiar este reparto por uno que
 * dé hitos distintos a cada persona destruiría eso sin dar ningún error.
 *
 * LO QUE HAY QUE SEGUIR GARANTIZANDO es que nadie los junte todos. Como cada
 * casilla da uno y se entra en un paso por hora, una persona se lleva como mucho
 * H hitos distintos. Basta, pues, con que haya MÁS condiciones que horas, y de
 * eso se encarga quien llama pidiendo `minimoCondiciones`.
 *
 * EL DESPLAZAMIENTO, que parece un detalle y le costó dos intentos a la Momia.
 * De una hora a la siguiente el reparto se corre P posiciones, para que los
 * pasos vayan barriendo la lista entera. Pero si P es múltiplo de n —seis pasos
 * y seis hitos, que es de lo más normal— ese desplazamiento es cero: el mismo
 * paso daría siempre el mismo hito y la mesa aprendería el mapa en dos horas.
 * Ahí, y solo ahí, se corre P+1.
 */
export function repartirHitos(opciones: {
  hitos: string[];
  pasos: PasoId[];
  rondas: number;
  semilla?: string | number;
}): Hallazgo[] {
  const { hitos, pasos } = opciones;
  const rondas = Math.max(1, opciones.rondas);
  if (pasos.length === 0) throw new Error('No hay pasos donde dejar los hitos.');
  if (hitos.length === 0) throw new Error('No hay hitos que repartir.');

  const rnd = azarCon(opciones.semilla ?? 'hitos');
  const todos = barajar(hitos, rnd);
  const n = todos.length;
  const paso = pasos.length % n === 0 ? pasos.length + 1 : pasos.length;

  const salida: Hallazgo[] = [];
  for (let ronda = 1; ronda <= rondas; ronda++) {
    const desplazamiento = (ronda - 1) * paso;
    pasos.forEach((pasoId, i) => {
      salida.push({ hitoId: todos[(i + desplazamiento) % n]!, pasoId, ronda });
    });
  }

  /*
   * La red: los que se hayan quedado sin salir se colocan encima de casillas que
   * repetían hito. Se toca la ÚLTIMA hora primero, que es donde menos daño hace
   * cambiar el reparto —la mesa ya ha visto casi todo— y nunca una casilla cuyo
   * hito no esté repetido, que sería cambiar un hueco por otro.
   *
   * Un hito que no sale es un rompecabezas sin solución, y esa avería se
   * descubriría de noche.
   */
  const sinSalir = todos.filter((id) => !salida.some((h) => h.hitoId === id));
  for (const hitoId of sinSalir) {
    const veces = new Map<string, number>();
    for (const h of salida) veces.set(h.hitoId, (veces.get(h.hitoId) ?? 0) + 1);
    const hueco = [...salida].reverse().find((h) => (veces.get(h.hitoId) ?? 0) > 1);
    if (hueco) hueco.hitoId = hitoId;
  }
  return salida;
}

/**
 * Cuántos hitos DISTINTOS puede juntar como mucho una sola persona.
 *
 * Entra en un paso por hora, así que su botín depende del camino que elija: se
 * prueban todos por fuerza bruta. Con ocho pasos y cuatro horas son 4 096
 * caminos, que se recorren en un suspiro y no dejan sitio a un razonamiento
 * elegante que resulte estar mal.
 */
export function maximoQueJuntaUnaPersona(hallazgos: Hallazgo[]): number {
  const rondas = [...new Set(hallazgos.map((h) => h.ronda))].sort((a, b) => a - b);
  const porRonda = rondas.map((ronda) => {
    const enEsta = hallazgos.filter((h) => h.ronda === ronda);
    const pasos = [...new Set(enEsta.map((h) => h.pasoId))];
    return pasos.map((p) => enEsta.filter((h) => h.pasoId === p).map((h) => h.hitoId));
  });

  let mejor = 0;
  const recorrer = (i: number, llevados: Set<string>): void => {
    if (i === porRonda.length) {
      mejor = Math.max(mejor, llevados.size);
      return;
    }
    for (const opcion of porRonda[i]!) {
      recorrer(i + 1, new Set([...llevados, ...opcion]));
    }
  };
  recorrer(0, new Set());
  return mejor;
}

// ---------------------------------------------------------------------------
// La redacción
// ---------------------------------------------------------------------------

const ORDINALES = ['primero', 'segundo', 'tercero', 'cuarto', 'quinto', 'sexto'];

/**
 * La frase que lleva escrita un mojón.
 *
 * EN UNA PARTIDA DE VERDAD ESTO LO ESCRIBE EL MODELO, que es quien sabe darle el
 * tono. Esta versión existe por dos motivos que no son «para salir del paso»: la
 * trama de demostración no llama a ningún modelo, y hace falta una redacción de
 * referencia contra la que comparar la del modelo. Si el modelo devuelve una
 * frase que no corresponde a la condición que se le pidió, la partida queda
 * irresoluble y nadie se entera hasta la noche (§7 del diseño).
 *
 * NÓTESE QUE NINGUNA EMPIEZA POR EL NOMBRE A SECAS DESPUÉS DE UNA PREPOSICIÓN.
 * Los nombres de los pasos los pone quien organiza y casi siempre llevan
 * artículo («el Vado del Kizu»), así que una frase como «precede a el Vado»
 * saldría impresa con la contracción sin hacer. No es remilgo: estas frases se
 * leen en voz alta, a oscuras y deprisa.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Y CADA UNA PASA SU PROPIA VALIDACIÓN, QUE NO ES OBVIO Y ES IMPRESCINDIBLE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Estas frases son el RECAMBIO: cuando el modelo escribe algo que no se puede
 * verificar, `plot/sombras-validacion.ts` pone esta en su lugar. Si el recambio
 * no pasara la misma comprobación que rechazó a la del modelo, el sistema
 * entero sería una farsa — y además habría un caso peor: una redacción de código
 * que dijera lo contrario de su condición dejaría la partida irresoluble
 * exactamente igual, solo que sin que ningún modelo tuviera la culpa.
 *
 * Por eso cada una está escrita contra su regla:
 *
 *   · `antes` nombra A ANTES que B, usa «antes» y evita toda palabra de
 *     inmediatez. La primera versión decía «quien busque B tiene que haber
 *     dejado atrás A» —que se lee perfectamente— y nombraba B primero: la
 *     validación la habría rechazado a ella misma.
 *   · `seguido` nombra A primero y usa dos palabras de inmediatez.
 *   · `posicion` no lleva NINGUNA negación; `no-posicion` lleva una.
 *   · `extremo` nombra los dos extremos.
 *   · `pasa-por` NO lleva negación —ni un «sin»—; `no-pasa-por` sí.
 *
 * `verify:sombras-trama` comprueba las siete, una por una.
 */
export function redactarHito(c: Condicion, nombre: (id: PasoId) => string): string {
  const a = nombre(c.a);
  switch (c.tipo) {
    case 'antes':
      return `${a} se cruza antes que ${nombre(c.b)}, aunque haya otros tramos entre los dos.`;
    case 'seguido':
      return `${a} y ${nombre(c.b)} van pegados: de uno se pasa directamente al otro.`;
    case 'posicion':
      return `${a} es el ${ORDINALES[c.posicion - 1] ?? c.posicion} tramo de la senda.`;
    case 'no-posicion':
      return `${a} no es el ${ORDINALES[c.posicion - 1] ?? c.posicion} tramo de la senda.`;
    case 'extremo':
      return `${a} abre o cierra la senda; se pisa el primero o el último.`;
    /*
     * SIN NOMBRAR LA PLAYA NI NINGÚN OTRO SITIO. La primera versión decía «quien
     * vaya a la playa tiene que cruzarlo», y en una partida donde un paso se
     * llame «La Playa de Shirako» —que es el nombre que sugiere el propio
     * manifiesto— esa palabra cuenta como mencionar OTRO paso, y la validación
     * rechaza su propio recambio. Las frases de código no pueden nombrar nada
     * que quien organiza pueda haber usado como nombre.
     */
    case 'pasa-por':
      return `La senda pasa por ${a}: hay que cruzarlo para llegar.`;
    case 'no-pasa-por':
      return `La senda no pasa por ${a}: por ahí no se llega a ninguna parte.`;
  }
}

/**
 * ¿La frase habla de los pasos de los que tiene que hablar?
 *
 * Es la validación del §7, y es deliberadamente modesta: no comprueba que la
 * frase SIGNIFIQUE la condición —para eso haría falta entender español— sino que
 * menciona los pasos correctos. Con eso se caza el fallo que de verdad ocurre:
 * que el modelo redacte la condición de otro hito, o se invente un paso que no
 * está en la partida.
 */
export function mencionaLosPasos(
  texto: string,
  c: Condicion,
  nombre: (id: PasoId) => string,
): boolean {
  const plano = texto.toLocaleLowerCase('es');
  const menciona = (id: PasoId) => plano.includes(nombre(id).toLocaleLowerCase('es'));
  if (!menciona(c.a)) return false;
  if (c.tipo === 'antes' || c.tipo === 'seguido') return menciona(c.b);
  return true;
}
