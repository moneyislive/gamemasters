/**
 * El cuadro de marchas: cómo se traza uno y cómo se comprueba que sirve.
 *
 * ═══ LAS CUATRO GARANTÍAS ═══
 *
 * Un cuadro entregado a una mesa tiene que cumplir cuatro cosas, y las cuatro
 * se comprueban ENUMERANDO los 720 cuadros posibles antes de entregar nada. No
 * se confía en que salgan: se cuentan.
 *
 *   1. CONSISTENTE. Al menos un cuadro cumple todos los telegramas. Un
 *      rompecabezas sin solución es una noche que no se puede ganar, y no hay
 *      forma de que la mesa lo distinga de uno difícil: seguirían probando
 *      hasta el amanecer.
 *
 *   2. ÚNICO. Exactamente uno. Con dos, media mesa defendería un cuadro y la
 *      otra media otro, los dos correctos, y el enclavamiento rechazaría uno de
 *      los dos sin poder explicar por qué.
 *
 *   3. MÍNIMO. Ningún telegrama sobra: quitar cualquiera deja dos cuadros o
 *      más. Es lo que garantiza que TODO EL PAPEL QUE HAY EN LA MESA IMPORTA.
 *      Un telegrama redundante es una persona que lee su tira, la mesa asiente
 *      y no cambia nada — que es la peor sensación que puede tener alguien en
 *      un juego cooperativo.
 *
 *   4. REPARTIDO. Los telegramas de una sola persona admiten dos cuadros o más.
 *      O sea: NADIE PUEDE RESOLVERLO EN SOLITARIO. Sin esta, la persona con el
 *      montón bueno lo saca sola en dos minutos y los demás miran.
 *
 * ═══ POR QUÉ ENUMERAR Y NO PODAR ═══
 *
 * Un solucionador con propagación de restricciones sería más rápido y sería la
 * clase de código donde un fallo sutil devuelve «una sola solución» cuando hay
 * dos. Esa mentira no la ve nadie hasta que hay doce personas discutiendo dos
 * cuadros igual de válidos. Con seis convoyes son 720 cuadros y la enumeración
 * entera tarda microsegundos: no hay nada que optimizar.
 *
 * ═══ POR QUÉ LA COMPROBACIÓN NO REUTILIZA NADA DEL GENERADOR ═══
 *
 * `verificarCuadro` vuelve a contar desde cero con `cuadrosDe`, sin tocar la
 * caché de máscaras que usa la generación. Una comprobación que comparte estado
 * con lo que comprueba no comprueba nada: si la caché tuviera un fallo, el
 * informe lo heredaría y saldría en verde. Cuesta unos milisegundos y compra
 * que las dos mitades tengan que estar de acuerdo.
 */
import {
  claveDeTelegrama,
  cuadrosDe,
  cumpleTelegrama,
  franjasDe,
  horaDeFranja,
  ordenaciones,
  CONVOYES_MAXIMOS,
  FRANJAS_DE_LA_NOCHE,
} from '../../../shared/juegos/nudo-tipos';
import type {
  ConvoyId,
  Cuadro,
  FranjaDe,
  Telegrama,
  TelegramaEscrito,
  TipoDeTelegrama,
} from '../../../shared/juegos/nudo-tipos';

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
 * mulberry32. No se usa `Math.random` en ningún sitio de este fichero, y no es
 * manía: con él, un cuadro que saliera mal no se podría volver a generar para
 * mirarlo, y el maestro de oro no podría congelar una partida.
 */
export function azarCon(semilla: string | number): () => number {
  let s = semillaNumerica(semilla);
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates sobre una copia. */
export function barajar<T>(items: T[], rnd: () => number): T[] {
  const salida = [...items];
  for (let i = salida.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [salida[i], salida[j]] = [salida[j]!, salida[i]!];
  }
  return salida;
}

// ---------------------------------------------------------------------------
// El universo de telegramas
// ---------------------------------------------------------------------------

/**
 * Todo lo que se le puede decir a alguien sobre un cuadro.
 *
 * Se enumera entero y luego se filtra por los que son CIERTOS para el cuadro
 * elegido. Con seis convoyes salen algo más de trescientos candidatos, de los
 * cuales la mitad larga son ciertos para cualquier cuadro dado.
 *
 * Los simétricos se generan una sola vez (`a < b`) porque `claveDeTelegrama`
 * los normaliza: generarlos en los dos sentidos metería duplicados que la
 * minimización tendría que ir quitando uno a uno.
 */
export function universoDeTelegramas(convoyes: ConvoyId[], franjas: number): Telegrama[] {
  const u: Telegrama[] = [];
  for (const a of convoyes) {
    for (let f = 1; f <= franjas; f++) u.push({ tipo: 'no-franja', convoy: a, franja: f });
    u.push({ tipo: 'paridad', convoy: a, impar: true });
    u.push({ tipo: 'paridad', convoy: a, impar: false });
    for (const b of convoyes) {
      if (a === b) continue;
      u.push({ tipo: 'antes', antes: a, despues: b });
      if (a < b) {
        u.push({ tipo: 'no-seguidos', a, b });
        u.push({ tipo: 'seguidos', a, b });
        u.push({ tipo: 'bloque', a, b });
        u.push({ tipo: 'separados', a, b, franjas: 3 });
        u.push({ tipo: 'separados', a, b, franjas: 4 });
      }
      for (const c of convoyes) {
        if (c === a || c === b) continue;
        /* `entre` es simétrico en los extremos: solo un sentido. */
        if (a < c) u.push({ tipo: 'entre', a, medio: b, c });
      }
    }
  }
  return u;
}

/**
 * Cuánto se prefiere cada tipo cuando hace falta un conjunto GRANDE.
 *
 * ═══ NO SON PESOS DE ADORNO: SON EL MANDO DE LA DIFICULTAD ═══
 *
 * Un solo `seguidos` recorta las 720 posibilidades a 240 de un tajo, así que un
 * cuadro hecho de condiciones fuertes se determina con cinco o seis telegramas
 * — y una mesa de diez personas se queda con la mitad sin papel.
 *
 * `no-franja` es la más floja de todas (quita una sexta parte) y es la que
 * permite llegar a quince telegramas irredundantes, que es el techo práctico
 * con seis convoyes. Además es la que se traduce sola a la cuadrícula de papel:
 * es una equis en una casilla.
 *
 * El generador NO usa estos pesos siempre. Empieza con la mezcla al azar —que
 * da conjuntos pequeños y variados, buenos para mesas de cinco— y va inclinando
 * la balanza hacia los flojos conforme necesita más telegramas. Ver `sesgo`.
 */
const DEBILIDAD: Record<TipoDeTelegrama, number> = {
  'no-franja': 1,
  paridad: 0.8,
  'no-seguidos': 0.75,
  bloque: 0.7,
  antes: 0.5,
  separados: 0.3,
  entre: 0.2,
  seguidos: 0.1,
};

// ---------------------------------------------------------------------------
// El tablero de trabajo
// ---------------------------------------------------------------------------

/**
 * Los 720 cuadros, con la tabla inversa ya calculada y una caché de máscaras.
 *
 * Existe solo para que el generador no repita trabajo: enumera una vez y guarda
 * por telegrama qué cuadros lo cumplen. `verificarCuadro` NO lo usa, a
 * propósito. Ver la cabecera.
 */
class Tablero {
  readonly cuadros: Cuadro[];
  /** Cuántas palabras de 32 bits hacen falta para un bit por cuadro. */
  private readonly palabras: number;
  private readonly donde: FranjaDe[];
  private readonly cache = new Map<string, Uint32Array>();
  private readonly acumulador: Uint32Array;

  constructor(convoyes: ConvoyId[]) {
    this.cuadros = ordenaciones(convoyes);
    this.donde = this.cuadros.map(franjasDe);
    this.palabras = Math.ceil(this.cuadros.length / 32);
    this.acumulador = new Uint32Array(this.palabras);
  }

  /**
   * Los cuadros que cumplen un telegrama, como MAPA DE BITS.
   *
   * ═══ POR QUÉ BITS Y NO UN ARRAY DE BOOLEANOS ═══
   *
   * Con booleanos esto era legible y era demasiado lento para lo que se le
   * pide. `minimizar` prueba a quitar cada telegrama y vuelve a contar, o sea
   * O(K²) recuentos; y cada recuento con booleanos recorre los 720 cuadros
   * comprobando K máscaras: unos diez mil accesos. Multiplicado por los
   * veinticinco intentos que hace falta hacer para una mesa de doce, medio
   * segundo por partida — y el comprobador, que traza doscientos cuadros
   * seguidos, se iba a diez minutos.
   *
   * Con 720 cuadros en veintitrés palabras de 32 bits, un recuento son
   * veintitrés operaciones por telegrama en vez de setecientas veinte. El
   * resultado es EL MISMO —se comprueba en `verificarCuadro`, que cuenta otra
   * vez desde cero y sin bits— y lo único que cambia es que termina.
   */
  mascara(t: Telegrama): Uint32Array {
    const clave = claveDeTelegrama(t);
    const guardada = this.cache.get(clave);
    if (guardada) return guardada;
    const m = new Uint32Array(this.palabras);
    for (let i = 0; i < this.donde.length; i++) {
      if (cumpleTelegrama(this.donde[i]!, t)) m[i >>> 5]! |= 1 << (i & 31);
    }
    this.cache.set(clave, m);
    return m;
  }

  /**
   * ¿Está encendido el bit del cuadro `i` en esta máscara?
   *
   * ═══ ESTE MÉTODO EXISTE PORQUE NO ESTABA Y COSTÓ UNA TARDE ═══
   *
   * `mascara` devolvía un array de booleanos y el bucle de la generación hacía
   * `vivos.filter((i) => m[i])`. Al pasar a mapas de bits, ese `m[i]` dejó de
   * significar «¿cumple el cuadro i?» y pasó a significar «la palabra número i
   * de veintitrés», que para i ≥ 23 es `undefined` — o sea falso—. El resultado
   * es que la lista de cuadros vivos se desplomaba a un puñado y el generador
   * creía haber determinado un cuadro único cuando quedaban cuatro.
   *
   * Y NO FALLÓ NADA. El generador entregaba su cuadro tan contento. Lo cazó
   * `verificarCuadro`, que vuelve a contar desde cero y sin bits: dijo cuatro
   * soluciones donde el generador decía una. Es exactamente para esto que la
   * comprobación no comparte una línea de código con lo que comprueba.
   */
  tiene(m: Uint32Array, i: number): boolean {
    return (m[i >>> 5]! & (1 << (i & 31))) !== 0;
  }

  /** Cuántos cuadros cumplen todos estos telegramas. */
  cuantos(telegramas: Telegrama[]): number {
    const acc = this.acumulador;
    acc.fill(0xffffffff);
    /*
     * Los bits sobrantes de la última palabra —720 no es múltiplo de 32— se
     * apagan de entrada. Sin esto contarían como cuadros que cumplen todo, y el
     * recuento saldría alto por dieciséis: nunca daría uno y el generador no
     * entregaría jamás un cuadro.
     */
    const sobran = this.palabras * 32 - this.cuadros.length;
    if (sobran > 0) acc[this.palabras - 1]! &= 0xffffffff >>> sobran;

    for (const t of telegramas) {
      const m = this.mascara(t);
      for (let w = 0; w < this.palabras; w++) acc[w]! &= m[w]!;
    }
    let n = 0;
    for (let w = 0; w < this.palabras; w++) {
      /* Kernighan: tantas vueltas como bits encendidos. */
      let v = acc[w]!;
      while (v !== 0) {
        v &= v - 1;
        n++;
      }
    }
    return n;
  }
}

/**
 * Reduce el conjunto a un núcleo mínimo.
 *
 * Se prueba a quitar cada uno y se quita si el cuadro sigue siendo único. Se
 * repite hasta que no se pueda quitar nada más: quitar uno puede hacer que otro
 * que antes era imprescindible deje de serlo, y con una sola pasada quedarían
 * redundancias dentro. Es el mismo bucle que usa el generador de El Paso de las
 * Sombras, y por la misma razón.
 */
function minimizar(tablero: Tablero, telegramas: Telegrama[], rnd: () => number): Telegrama[] {
  let actuales = [...telegramas];
  let cambio = true;
  while (cambio) {
    cambio = false;
    for (const t of barajar(actuales, rnd)) {
      const sinEl = actuales.filter((x) => x !== t);
      if (sinEl.length > 0 && tablero.cuantos(sinEl) === 1) {
        actuales = sinEl;
        cambio = true;
        break;
      }
    }
  }
  return actuales;
}

// ---------------------------------------------------------------------------
// ¿Se resuelve con un lápiz?
// ---------------------------------------------------------------------------

/**
 * Simula a una persona tachando casillas en la cuadrícula de papel.
 *
 * ═══ POR QUÉ HACE FALTA ESTO ADEMÁS DE LAS CUATRO GARANTÍAS ═══
 *
 * Las cuatro garantías dicen que el cuadro es ÚNICO, no que sea DEDUCIBLE. Un
 * conjunto mínimo determina un solo cuadro por definición —enumerando los 720
 * sale uno— pero llegar hasta él puede exigir suponer y ver qué se rompe, que
 * es lo que en un sudoku separa un «medio» de un «diabólico».
 *
 * Y aquí eso importa más que en un sudoku, porque el placer del juego ES la
 * deducción: si la cuadrícula de papel no avanza, la mesa se rinde y pasa a
 * probar órdenes, que sale caro y es menos divertido.
 *
 * Se midió y salió: **solo el 38 % de los conjuntos mínimos se resolvían
 * tachando casillas**. Los demás no estaban rotos —el cuadro seguía siendo
 * único y el juego seguía convergiendo con lo que el enclavamiento va
 * contestando— pero pedían una hipótesis, y una hipótesis a las dos de la
 * mañana con ocho personas hablando a la vez no se sostiene.
 *
 * ═══ QUÉ RAZONAMIENTOS IMITA, EXACTAMENTE ═══
 *
 *   1. Por cada telegrama y cada casilla, ¿cabe todavía? Se prueba a colocar
 *      los OTROS convoyes que el telegrama nombra —nunca más de dos— en las
 *      casillas que la rejilla aún permite. Si no hay forma, se tacha.
 *   2. Si a un convoy le queda una sola franja, esa franja se le tacha a los
 *      demás.
 *   3. Si a una franja le queda un solo convoy, ese convoy pierde las demás.
 *
 * Se repite hasta que no cambia nada. Es lo que hace una persona con un lápiz y
 * no es propagación completa a propósito: si imitara un solucionador, aceptaría
 * cuadros que ninguna mesa puede sacar.
 */
export function resolublePorEliminacion(
  convoyes: ConvoyId[],
  telegramas: Telegrama[],
  franjas: number,
): boolean {
  const rejilla = new Map<ConvoyId, Set<number>>(
    convoyes.map((c) => [c, new Set(Array.from({ length: franjas }, (_, i) => i + 1))]),
  );

  /** ¿Cabe este convoy en esta franja, con lo que el telegrama exige? */
  const cabe = (t: Telegrama, convoy: ConvoyId, franja: number): boolean => {
    const citados = new Set<ConvoyId>([convoy]);
    switch (t.tipo) {
      case 'no-franja':
      case 'paridad':
        citados.add(t.convoy);
        break;
      case 'antes':
        citados.add(t.antes);
        citados.add(t.despues);
        break;
      case 'entre':
        citados.add(t.a);
        citados.add(t.medio);
        citados.add(t.c);
        break;
      default:
        citados.add(t.a);
        citados.add(t.b);
    }
    const otros = [...citados].filter((c) => c !== convoy);
    const donde: FranjaDe = { [convoy]: franja };
    const usadas = new Set<number>([franja]);

    const colocar = (i: number): boolean => {
      if (i === otros.length) return cumpleTelegrama(donde, t);
      for (const f of rejilla.get(otros[i]!) ?? []) {
        if (usadas.has(f)) continue;
        usadas.add(f);
        donde[otros[i]!] = f;
        if (colocar(i + 1)) return true;
        usadas.delete(f);
        delete donde[otros[i]!];
      }
      return false;
    };
    return colocar(0);
  };

  let cambio = true;
  while (cambio) {
    cambio = false;
    for (const t of telegramas) {
      for (const c of convoyes) {
        for (const f of [...(rejilla.get(c) ?? [])]) {
          if (!cabe(t, c, f)) {
            rejilla.get(c)!.delete(f);
            cambio = true;
          }
        }
      }
    }
    for (const c of convoyes) {
      const suyas = rejilla.get(c)!;
      if (suyas.size !== 1) continue;
      const f = [...suyas][0]!;
      for (const otro of convoyes) {
        if (otro !== c && rejilla.get(otro)!.delete(f)) cambio = true;
      }
    }
    for (let f = 1; f <= franjas; f++) {
      const candidatos = convoyes.filter((c) => rejilla.get(c)!.has(f));
      if (candidatos.length !== 1) continue;
      const suyas = rejilla.get(candidatos[0]!)!;
      if (suyas.size === 1) continue;
      for (const otra of [...suyas]) if (otra !== f) suyas.delete(otra);
      cambio = true;
    }
  }

  return convoyes.every((c) => rejilla.get(c)!.size === 1);
}

// ---------------------------------------------------------------------------
// La generación
// ---------------------------------------------------------------------------

export interface OpcionesDeCuadro {
  convoyes: ConvoyId[];
  /** Cuántas personas se van a repartir los telegramas. Mínimo dos. */
  ferroviarios: number;
  semilla?: string | number;
  /** Cuántas franjas tiene la noche. Por defecto, las seis del diseño. */
  franjas?: number;
  /**
   * Cuántos telegramas hacen falta como mínimo.
   *
   * Por defecto, uno por persona (con un suelo de seis), que es lo que hace que
   * nadie se quede sin papel. NO SE RELLENA con telegramas de más: eso rompería
   * la minimalidad, que es la garantía de que todo lo que hay en la mesa
   * importa. Se tira el intento y se prueba otro cuadro, que es más lento y es
   * lo correcto.
   */
  minimoTelegramas?: number;
}

export interface PuzleNudo {
  cuadro: Cuadro;
  telegramas: Telegrama[];
  /** Índices de `telegramas`, una lista por persona. */
  reparto: number[][];
  /** Cuántos cuadros se probaron antes de dar con uno bueno. Diagnóstico. */
  intentos: number;
  /**
   * ¿Se saca tachando casillas, sin tener que suponer nada?
   *
   * No es una garantía: es una NOTA DE CALIDAD. Un cuadro que no lo cumpla se
   * juega igual —es único y el enclavamiento va dando información— pero pide
   * una hipótesis en algún momento. Ver `resolublePorEliminacion`.
   */
  conLapiz: boolean;
}

/**
 * Traza un cuadro que cumple las cuatro garantías.
 *
 * ═══ CÓMO SE LLEGA A UN CONJUNTO GRANDE Y MÍNIMO A LA VEZ ═══
 *
 * Suenan a contradicción y no lo son. Se van añadiendo telegramas CIERTOS,
 * descartando los que no recortan nada, hasta que solo queda un cuadro vivo.
 * Después se minimiza. Cuál es el tamaño del mínimo depende de QUÉ telegramas
 * se probaron primero: empezando por los fuertes se llega a seis; empezando por
 * los flojos, a quince.
 *
 * Así que el orden de prueba lleva un SESGO que sube con los intentos: los
 * primeros van casi al azar —conjuntos pequeños y variados, que son los que
 * mejor se leen en una mesa de cinco— y si el resultado se queda corto para la
 * gente que hay, el intento siguiente prefiere un poco más los flojos. Con
 * sesenta intentos la balanza está del todo inclinada, y ahí se llega al techo.
 *
 * @throws si no lo consigue en cuatrocientos intentos. Es una red por si alguien
 * toca los pesos y deja el generador pidiendo algo imposible. Mejor reventar
 * aquí, al preparar la partida, que a medianoche.
 */
export function generarCuadro(opciones: OpcionesDeCuadro): PuzleNudo {
  const { convoyes, ferroviarios } = opciones;
  const franjas = opciones.franjas ?? FRANJAS_DE_LA_NOCHE;

  if (convoyes.length !== franjas) {
    throw new Error(
      `El cuadro de marchas empareja convoyes con franjas: hacen falta exactamente ${franjas} ` +
        `convoyes y hay ${convoyes.length}.`,
    );
  }
  if (convoyes.length > CONVOYES_MAXIMOS) {
    throw new Error(
      `Son demasiados convoyes (${convoyes.length}). El máximo es ${CONVOYES_MAXIMOS}.`,
    );
  }
  if (new Set(convoyes).size !== convoyes.length) throw new Error('Hay convoyes repetidos.');
  if (ferroviarios < 2) throw new Error('El cuadro se reparte entre dos personas como mínimo.');

  const rnd = azarCon(opciones.semilla ?? 'nudo');
  const minimo = opciones.minimoTelegramas ?? Math.max(6, ferroviarios);
  const tablero = new Tablero(convoyes);
  const universo = universoDeTelegramas(convoyes, franjas);
  /** El primer cuadro válido encontrado, por si no aparece uno de lápiz. */
  let respaldo: PuzleNudo | undefined;

  for (let intentos = 1; intentos <= 400; intentos++) {
    /*
     * El sesgo sube con los intentos. Ver el comentario largo de arriba: es lo
     * que permite que el mismo generador sirva a una mesa de cuatro y a una de
     * doce sin dos caminos distintos.
     */
    const sesgo = Math.min(1, (intentos - 1) / 60);
    const cuadro = barajar(convoyes, rnd);
    const donde = franjasDe(cuadro);

    const ciertos = universo.filter((t) => cumpleTelegrama(donde, t));
    const ordenados = ciertos
      .map((t) => ({
        t,
        /* Peso alto = se prueba antes. Con sesgo 0 es azar puro. */
        peso: (1 - sesgo) * (0.2 + rnd() * 0.8) + sesgo * DEBILIDAD[t.tipo],
      }))
      .sort((x, y) => y.peso - x.peso)
      .map((x) => x.t);

    let vivos = tablero.cuadros.map((_, i) => i);
    const elegidos: Telegrama[] = [];
    for (const t of ordenados) {
      if (vivos.length === 1) break;
      const m = tablero.mascara(t);
      const quedan = vivos.filter((i) => tablero.tiene(m, i));
      /* Uno que no recorta nada es redundante desde el primer momento. */
      if (quedan.length === vivos.length) continue;
      vivos = quedan;
      elegidos.push(t);
    }
    /* No debería ocurrir —el universo determina cualquier cuadro— pero si
       ocurriera, se prueba otro en vez de entregar algo ambiguo. */
    if (vivos.length !== 1) continue;

    const telegramas = minimizar(tablero, elegidos, rnd);
    if (telegramas.length < minimo) continue;

    /*
     * El reparto, por turnos sobre una baraja. Con el mínimo puesto a «uno por
     * persona», nadie se queda sin papel; y por la MINIMALIDAD, los telegramas
     * de cualquiera admiten dos cuadros o más siempre que no los tenga todos.
     * Se comprueba igual, porque «siempre que» no es «siempre».
     */
    const indices = barajar(
      telegramas.map((_, i) => i),
      rnd,
    );
    const reparto: number[][] = Array.from({ length: ferroviarios }, () => []);
    indices.forEach((indice, i) => reparto[i % ferroviarios]!.push(indice));

    const nadieSolo = reparto.every(
      (mios) => tablero.cuantos(mios.map((i) => telegramas[i]!)) >= 2,
    );
    if (!nadieSolo) continue;

    const candidato: PuzleNudo = {
      cuadro,
      telegramas,
      reparto,
      intentos,
      conLapiz: resolublePorEliminacion(convoyes, telegramas, franjas),
    };

    /*
     * ═══ SE PREFIERE EL QUE SE RESUELVE CON UN LÁPIZ, PERO NO SE EXIGE ═══
     *
     * Solo el 38 % de los conjuntos mínimos se dejan sacar tachando casillas
     * (ver `resolublePorEliminacion`). Exigirlo multiplicaría por tres los
     * intentos y —lo que es peor— podría no encontrarse nunca para una mesa
     * grande, donde el conjunto tiene que ser largo y los conjuntos largos son
     * más enredados.
     *
     * Así que se GUARDA el primero válido y se sigue buscando uno que además
     * se deduzca a lápiz, durante un tercio de los intentos. Si aparece, ese;
     * si no, el guardado, que es una partida perfectamente jugable —el cuadro
     * es único y el enclavamiento va dando información— solo que pide una
     * hipótesis en algún momento.
     *
     * Nunca se sacrifica ninguna de las cuatro garantías por esto: el
     * respaldo ya las ha pasado todas.
     */
    if (candidato.conLapiz) return candidato;
    if (!respaldo) respaldo = candidato;
    if (intentos < 260) continue;
    return respaldo;
  }

  if (respaldo) return respaldo;

  throw new Error(
    'No se ha podido trazar un cuadro de marchas que cumpla las cuatro garantías. ' +
      'Revisa los pesos de `DEBILIDAD` o el mínimo de telegramas pedido.',
  );
}

// ---------------------------------------------------------------------------
// La comprobación
// ---------------------------------------------------------------------------

export interface InformeDelCuadro {
  /** Cuántos cuadros cumplen todos los telegramas. Tiene que ser 1. */
  soluciones: number;
  consistente: boolean;
  unico: boolean;
  /** Cuántos cuadros admiten los telegramas de cada persona, por separado. */
  solucionesPorPersona: number[];
  repartida: boolean;
  /** Los que se pueden quitar sin perder la unicidad. Vacío es lo correcto. */
  redundantes: Telegrama[];
  minimo: boolean;
  /** Cuántos telegramas tiene la persona con menos. Cero es alguien sin papel. */
  telegramasMinimosPorPersona: number;
  todosConPapel: boolean;
  ok: boolean;
}

/**
 * Pasa las cuatro garantías por delante de TODOS los cuadros posibles.
 *
 * Vive aquí y no en el comprobador porque la necesitan tres sitios: la prueba
 * que genera doscientos cuadros, la generación de una partida de verdad —que no
 * puede entregar un cuadro sin verificar— y el imprimible «informe del cuadro»,
 * que es esto mismo escrito para que lo lea quien dirige.
 */
export function verificarCuadro(convoyes: ConvoyId[], puzle: PuzleNudo): InformeDelCuadro {
  const soluciones = cuadrosDe(convoyes, puzle.telegramas);
  const unico =
    soluciones.length === 1 && soluciones[0]!.join('|') === puzle.cuadro.join('|');

  const solucionesPorPersona = puzle.reparto.map(
    (mios) => cuadrosDe(convoyes, mios.map((i) => puzle.telegramas[i]!)).length,
  );

  const redundantes = puzle.telegramas.filter((t) => {
    const sinEl = puzle.telegramas.filter((x) => x !== t);
    return sinEl.length > 0 && cuadrosDe(convoyes, sinEl).length === 1;
  });

  const telegramasMinimosPorPersona = puzle.reparto.length
    ? Math.min(...puzle.reparto.map((mios) => mios.length))
    : 0;

  const consistente = soluciones.length >= 1;
  const repartida = solucionesPorPersona.every((n) => n >= 2);
  const minimo = redundantes.length === 0;
  const todosConPapel = telegramasMinimosPorPersona >= 1;

  return {
    soluciones: soluciones.length,
    consistente,
    unico,
    solucionesPorPersona,
    repartida,
    redundantes,
    minimo,
    telegramasMinimosPorPersona,
    todosConPapel,
    ok: consistente && unico && repartida && minimo && todosConPapel,
  };
}

// ---------------------------------------------------------------------------
// La redacción
// ---------------------------------------------------------------------------

/**
 * El texto de la tira, como lo habría escrito un telegrafista de 1927.
 *
 * MAYÚSCULAS Y «STOP» NO SON DECORACIÓN: un telegrama de la época se transmitía
 * sin signos de puntuación —no había forma de mandarlos— y el punto se escribía
 * con la palabra STOP. Que la tira se lea así es lo que hace que apetezca
 * leerla en voz alta, que es exactamente lo que el juego necesita que pase.
 *
 * SE REDACTA AQUÍ Y NO EN LA PLANTILLA porque el mismo texto va a tres sitios
 * que tienen que decir lo mismo: la tira recortable, el dosier impreso y el
 * bloque `telegramas` de la app. Cuando cada uno tenía su copia —y esto ya pasó
 * con las reglas— bastaba con corregir una para que el papel y la pantalla
 * dijeran cosas distintas.
 */
export function redactarTelegrama(t: Telegrama, nombre: (id: ConvoyId) => string): string {
  const N = (id: ConvoyId): string => nombre(id).toUpperCase();
  switch (t.tipo) {
    case 'no-franja':
      return (
        `${N(t.convoy)} NO PUEDE OCUPAR LA FRANJA DE LAS ${horaDeFranja(t.franja)} STOP ` +
        'VIA TOMADA POR MANIOBRAS'
      );
    case 'paridad':
      return t.impar
        ? `${N(t.convoy)} SOLO CRUZA CON EL PASO A NIVEL ABIERTO STOP FRANJAS PRIMERA TERCERA Y QUINTA`
        : `${N(t.convoy)} SOLO CRUZA CON EL PASO A NIVEL CERRADO STOP FRANJAS SEGUNDA CUARTA Y SEXTA`;
    case 'no-seguidos':
      return (
        `${N(t.a)} Y ${N(t.b)} NO PUEDEN SALIR EN FRANJAS SEGUIDAS STOP ` +
        'SE CRUZARIAN EN EL APARTADERO'
      );
    case 'seguidos':
      return (
        `${N(t.a)} Y ${N(t.b)} SALEN EN FRANJAS SEGUIDAS EN EL ORDEN QUE SEA STOP ` +
        'MISMA MAQUINA DE MANIOBRAS PARA LOS DOS'
      );
    case 'bloque':
      return (
        `${N(t.a)} Y ${N(t.b)} SALEN LOS DOS ANTES DEL RELEVO O LOS DOS DESPUES STOP ` +
        'EL RELEVO ES ENTRE LA TERCERA FRANJA Y LA CUARTA'
      );
    case 'antes':
      return `${N(t.antes)} HA DE HABER SALIDO ANTES QUE ${N(t.despues)} STOP`;
    case 'separados':
      return (
        `ENTRE ${N(t.a)} Y ${N(t.b)} HAN DE MEDIAR AL MENOS ${t.franjas - 1} FRANJAS STOP ` +
        'ORDEN DE LA JEFATURA'
      );
    case 'entre':
      return (
        `${N(t.medio)} SALE ENTRE ${N(t.a)} Y ${N(t.c)} EN EL SENTIDO QUE SEA STOP`
      );
  }
}

/** Los telegramas ya redactados y con id estable, listos para la trama. */
export function escribirTelegramas(
  telegramas: Telegrama[],
  nombre: (id: ConvoyId) => string,
): TelegramaEscrito[] {
  return telegramas.map((telegrama, i) => ({
    /*
     * El id lleva el número de orden y no un azar: el reparto de la trama
     * guarda ids, y un id estable es lo que permite volver a imprimir el mismo
     * paquete y que a cada cual le toquen sus mismas tiras.
     */
    id: `t${i + 1}`,
    telegrama,
    texto: redactarTelegrama(telegrama, nombre),
  }));
}
