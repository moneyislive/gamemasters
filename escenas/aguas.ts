/**
 * EL AGUA DEL MUNDO: ríos, lagos y costas, deducidos del terreno.
 *
 * La especificación completa —con las medidas del pack, los umbrales y el porqué de
 * cada caso límite— está en `AGUAS.md`, al lado. Aquí van las razones que hacen
 * falta para leer el código; allí, las que hacen falta para cambiarlo.
 *
 * ═══ EL AGUA NO SE DIBUJA: SE DEDUCE ═══
 *
 * No hay ninguna tirada que diga «este tablero lleva un río aquí». Lo que hay es un
 * terreno, y sobre él se resuelve a dónde iría el agua si lloviera. De ahí salen a la
 * vez el nivel de cada charca, el árbol de drenaje entero y los lagos, con UNA sola
 * pasada. Los ríos son las ramas por las que pasa bastante caudal, los lagos son las
 * depresiones que no se vacían, y que un tablero salga seco no es un dado: es que no
 * llueve bastante sobre él, y se ve en sus biomas antes de contarlo.
 *
 * ═══ LAS TRES REGLAS QUE IMPONE EL PACK, Y QUE MANDAN SOBRE TODO LO DEMÁS ═══
 *
 *   1. NO EXISTE LA PIEZA DE RÍO EN CUESTA. Así que un tramo de cauce vive entero en
 *      un nivel entero, y donde el terreno exigiría subir, el río sencillamente no
 *      llega: se corta y lo de arriba pasa a ser un valle seco. Es la única mentira
 *      que se asume, y a cambio no hay ni un escalón partiendo una lámina de agua.
 *   2. NO EXISTE LA PIEZA DE RÍO DE UNA SOLA BOCA. Un cauce que se acabara dentro
 *      del mapa no tendría con qué dibujarse. Por eso todo extremo de aguas arriba es
 *      el borde del tablero, un lago, o una poza que se crea ahí mismo.
 *   3. NO EXISTE PIEZA DE COSTA PARA CINCO O SEIS LADOS DE AGUA, NI PARA LADOS
 *      SUELTOS. Una lengua de tierra de una sola tesela entre dos aguas no se puede
 *      dibujar, así que se inunda antes de pedir la pieza.
 *
 * Las tres son restricciones del GENERADOR, no reparaciones posteriores: el trazado
 * no puede producirlas.
 *
 * ═══ Y LA REGLA QUE IMPONE EL JUEGO ═══
 *
 * El agua no entra jamás en el disco de un vértice ni en el de una plaza. Es una
 * invariante ENTERA sobre distancia hexagonal —comprobable sin coma flotante— y es
 * una restricción del trazado, no un arreglo de después. De ella sale, sin pedirlo,
 * que el río circule por los interiores de comarca y cruce las aristas por su punto
 * medio: justo donde tiene que estar el vado.
 */
import { DIRECCIONES, centroDeHex, vecino } from '../shared/mecanicas/malla-hexagonal';
import type { Hex, Punto } from '../shared/mecanicas/malla-hexagonal';
import { RADIO_DE_COMARCA, RADIO_DE_TESELA } from './escala';
import { fraccion, revoltijo as revoltijoDe } from './revoltijo';
import { fbm } from './ruido';

/* ═══════════════════════════════════════════════════════════════════════════
 * CONSTANTES
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * LA PENDIENTE, en las unidades del código.
 *
 * Las alturas están en ESCALONES y un paso entre subteselas mide `PASO` de mundo. Un
 * escalón de caída entre celdas contiguas es una pendiente de 26,6 grados, o sea
 * `ESCALON/PASO = 0,5`. Escribirlo como `Δaltura / 10,94` mezcla escalones con
 * unidades de mundo y deja el umbral cinco veces y media mal.
 */
const K_PENDIENTE = 0.5;

/** El desempate: no mueve ninguna cota real y hace la elección reproducible. */
const EPS_DESEMPATE = 1e-4;

/** Caudal mínimo para que una boca cuente como río. Es un umbral ABSOLUTO. */
const CAUDAL_MINIMO_DE_BOCA = 150;
/** Caudal a partir del cual una celda es valle húmedo aunque no lleve cauce. */
const VAGUADA_A_MIN = 40;
const RIOS_MAX = 2;
const SEPARACION_DE_BOCAS = 12;

/** El rango y las vueltas de la búsqueda del umbral de encauzamiento. */
const TAU_MIN = 2;
const TAU_MAX = 200;
const TAU_VUELTAS = 24;

/** Cuántas celdas tiene que medir un cauce para que valga la pena pintarlo. */
const LONGITUD_MIN_DIBUJADA = 14;
const LONGITUD_MAX_DIBUJADA = 55;

/**
 * LAGOS, y una medición que conviene conocer antes de tocar estos números.
 *
 * Sobre este terreno las depresiones naturales EXISTEN y son muchas —unas noventa
 * por tablero, con quinientas celdas bajo la lámina— pero son PLANAS: medido sobre
 * ocho semillas, la más honda de todas llega a 0,49 escalones, o sea 2,7 unidades de
 * mundo. Un ruido fBm suave no cierra cuencas profundas, y menos aún bajo un techo
 * de bioma que baja hacia fuera de forma casi monótona.
 *
 * La consecuencia importa: una lámina de 2,7 unidades NO sobrevive al corte en
 * escalones de 5,47. El lago quedaría a la misma cota entera que la tierra que lo
 * rodea, o sea invisible. Por eso bajar estos umbrales no daría lagos: daría manchas
 * de agua a ras de suelo.
 *
 * El agua ancha de este mundo —la que lleva barco y muelle— sale del ESTUARIO de la
 * desembocadura, que sí se excava a nivel cero. Los lagos de depresión quedan como lo
 * que son: raros, y sólo cuando el relieve casualmente cierra una cuenca honda.
 */
const LAGO_MIN_CELDAS = 7;
const LAGO_PROFUNDIDAD_MIN = 0.35;
const ENDORREICO_LLUVIA_MAX = 0.55;
const ENDORREICO_REBOSE_MIN = 2;

/**
 * CUÁNTOS ESCALONES PUEDE EXCAVAR EL CAUCE bajo el terreno antes de cortarse.
 *
 * La especificación decía dos, y se escribió cuando la montaña de este mundo tenía
 * techo tres. Después subió a nueve, y con el terreno subiendo tan deprisa desde el
 * borde, dos escalones dejaban el río en un muñón de cuatro celdas: medido, un
 * tablero de cada diez con cauce.
 *
 * Tres son dieciséis unidades de desfiladero, que sigue siendo un valle y no un
 * cañón, y el cono de cavado garantiza que abrirlo no fabrica ningún muro que no
 * estuviera ya. Es un número que hay que volver a mirar si se cambia el techo de los
 * biomas: la relación entre lo que sube el terreno y lo que el río puede excavar es
 * lo que decide si hay ríos.
 */
const CAVADO_MAXIMO = 3;

/** Cuántas vueltas se le dan al cierre de costas antes de rendirse. */
const CIERRE_MAX_VUELTAS = 8;

/** Hasta dónde se abre la cala de la desembocadura, en pasos de subtesela. */
const RADIO_DEL_ESTUARIO = 2;

/**
 * LOS TRES PORTES DE UN CAUCE.
 *
 * `ARROYO` corre entre la hierba sin dejar playa; `RIO` ya tiene ribera de arena;
 * `HONDO` además moja la celda de al lado y se hace navegable. El umbral separa los
 * dos regímenes que la hidrología produce de verdad, y el porte medio es la
 * transición entre ellos. Ver el cálculo.
 */
export const ARROYO = 0;
export const RIO = 1;
export const HONDO = 2;
const UMBRAL_HONDO = 0.55;

/** Vetos, en distancia hexagonal ENTERA. Ver la cabecera. */
const VETO_VERTICE_CAUCE = 2;
const VETO_VERTICE_CUERPO = 3;
const VETO_PLAZA_CAUCE = 1;
const VETO_PLAZA_CUERPO = 2;

/**
 * Y EL VETO DE LA BOCA, que es MÁS CORTO que el del cauce y tiene su razón.
 *
 * La boca es la única celda del cauce que está obligada a tocar el borde del mundo, y
 * el borde es donde se apiñan treinta de los cincuenta y cuatro vértices. Medido sobre
 * las 276 celdas de borde de un tablero: el veto del cauce —radio 2— deja vedado el
 * 67% de la costa, y el del cuerpo —radio 3— el 89%.
 *
 * Aplicarle a la boca el radio del cauce parece lo coherente y seca el mundo: los
 * tableros con agua caían de 40 sobre 60 a 15. No porque el río no encuentre camino,
 * sino porque no encuentra por dónde desembocar.
 *
 * Así que la boca se veta por lo que de verdad hace falta y no por analogía: radio 1,
 * que es la tesela del vértice más su anillo de seis, o sea EXACTAMENTE el suelo que
 * ocupa una fortaleza. Deja vedado el 46% de la costa y conserva los cuarenta tableros
 * con agua.
 *
 * El radio 2 del cauce es un MARGEN —que el arroyo no pase rozando el pueblo— y el
 * radio 1 de la boca es una IMPOSIBILIDAD —que no se construya sobre el agua—. Copiar
 * el margen donde hacía falta la imposibilidad es lo que secaba el tablero.
 */
const VETO_BOCA = 1;

/** Los canales del ruido, separados y con nombre. */
const CANAL = {
  desempate: 21_001,
  lluvia: 22_003,
  curvy: 23_011,
  porte: 23_017,
  ribera: 24_019,
  arena: 25_033,
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
 * LO QUE ENTRA Y LO QUE SALE
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Qué es cada subtesela para el agua. */
export const TIERRA = 0;
export const CAUCE = 1;
export const CUERPO = 2;
export const VAGUADA = 3;

/** El retrato de un tablero, para contarlo y para comprobarlo. */
export type Arquetipo = 'secano' | 'un-rio' | 'rio-con-lago' | 'dos-rios' | 'laguna';

/**
 * EL MUNDO QUE LA HIDROLOGÍA NECESITA MIRAR.
 *
 * Es una vista de sólo lectura sobre lo que ya calculó `relieve.ts`: el campo crudo
 * en escalones, dónde cae cada subtesela y de qué comarca es. No trae niveles
 * enteros a propósito — la hidrología se resuelve sobre el campo CONTINUO, porque
 * sobre un terreno ya cortado en escalones no hay pendiente que seguir: todo son
 * mesetas y paredes, y el agua no sabría hacia dónde ir.
 */
export interface MundoParaAguas {
  readonly n: number;
  readonly subteselas: readonly Hex[];
  readonly centros: readonly Punto[];
  /** La altura cruda de cada subtesela, en escalones. */
  readonly perfil: Float64Array;
  /** El terreno de la comarca de cada subtesela. */
  readonly terrenos: readonly string[];
  /** El hexágono de comarca de cada subtesela. */
  readonly comarcas: readonly Hex[];
  /** Las subteselas que contienen un vértice del tablero. */
  readonly enVertices: readonly number[];
  /** Las subteselas que contienen el centro de una comarca. */
  readonly enPlazas: readonly number[];
  indiceDe(sub: Hex): number | undefined;
  readonly semilla: number;
}

/** El plan de aguas de un tablero. */
export interface Aguas {
  readonly arquetipo: Arquetipo;
  /** Qué es cada subtesela: tierra, cauce, cuerpo o vaguada. */
  readonly clase: Uint8Array;
  /** El nivel entero del cuerpo de agua al que pertenece. `SIN_AGUA` si es tierra. */
  readonly nivelAgua: Int16Array;
  /** Los lados por los que sale el cauce. Sólo tiene sentido en clase CAUCE. */
  readonly mascara: Uint8Array;
  /** Cuánto llueve en cada sitio. Sirve para decorar y para explicar el secano. */
  readonly lluvia: Float64Array;
  /** El caudal acumulado. */
  readonly caudal: Float64Array;
  /** El cono de cavado, en escalones. `Infinity` donde no hay agua cerca. */
  readonly cono: Float64Array;
  /** Los lados por los que cada celda de tierra ve agua. Cero si no ve ninguna. */
  readonly orilla: Uint8Array;
  /** El porte de cada celda de cauce: arroyo, río u hondo. */
  readonly porte: Uint8Array;
  /** Qué celdas de tierra son ribera de un río, y se pintan de arena. */
  readonly margen: Uint8Array;
  /** A cuántos pasos está cada celda del agua más cercana. Para la banda de arena. */
  readonly dOrilla: Int32Array;
  /** El cono en un punto cualquiera, ya interpolado. */
  conoEn(p: Punto): number;
  /** Cuántas celdas de agua hay, para contarlo en la batería. */
  readonly celdasDeAgua: number;
  /**
   * LO QUE PASÓ POR EL CAMINO, para poder mirarlo.
   *
   * No es instrumentación de depuración: la especificación pide expresamente que
   * sobre una muestra grande de semillas se MIREN estos números —cuántas veces se
   * disparó cada filtro, cuánto inundó el cierre— porque si un filtro se dispara en
   * más del diez por ciento de los tableros, lo que está mal es el parámetro y no el
   * tablero. Un generador aprobado sin mirar el reparto es un generador que se cree.
   */
  readonly diagnostico: Diagnostico;
}

/** El parte de lo que hizo la hidrología, para la batería y para afinar. */
export interface Diagnostico {
  /** Cuántas depresiones encontró la inundación, antes de filtrar ninguna. */
  depresiones: number;
  /** Cuántas celdas quedaron bajo la lámina en esas depresiones. */
  celdasEnDepresion: number;
  /** El fondo de la depresión más honda, en escalones. */
  fondoMaximo: number;
  /** Cuántos lagos pasaron todos los filtros. */
  lagosConservados: number;
  /** Por qué se descartó cada uno de los que no pasaron. */
  descartados: { pequena: number; llana: number; vedada: number; enorme: number };
  /** Cuántas bocas candidatas había y cuántas quedaron. */
  bocasCandidatas: number;
  bocasElegidas: number;
  /** El umbral de encauzamiento al que se calibró, y cuántas celdas encauza. */
  tau: number;
  celdasEncauzadas: number;
  /** Cuántas vueltas necesitó el cierre de costas. Ocho es no haber convergido. */
  vueltasDelCierre: number;
  /** Celdas de tierra cuya orilla no tiene pieza. Tiene que ser cero o casi. */
  orillasImposibles: number;
}

/** El valor de `nivelAgua` en una celda que no tiene agua. */
export const SIN_AGUA = -32_768;

/* ═══════════════════════════════════════════════════════════════════════════
 * UN MONTÍCULO DE MÍNIMOS, con desempate entero
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * MONTÍCULO BINARIO sobre índices, ordenado por una clave y con desempate entero.
 *
 * El desempate por `(q, r)` no es cosmético: `Math.exp` está aproximada por la
 * implementación, así que dos claves que en teoría son iguales pueden diferir en el
 * último bit entre V8 y Hermes. Sin un desempate ENTERO, el mismo tablero saldría
 * distinto en el móvil y en el PC — que es exactamente lo que todo este módulo
 * existe para evitar.
 */
class Monticulo {
  private readonly datos: number[] = [];

  constructor(
    private readonly clave: Float64Array,
    private readonly sub: readonly Hex[],
  ) {}

  get tamano(): number {
    return this.datos.length;
  }

  private antes(a: number, b: number): boolean {
    const ka = this.clave[a] as number;
    const kb = this.clave[b] as number;
    if (ka !== kb) return ka < kb;
    const sa = this.sub[a] as Hex;
    const sb = this.sub[b] as Hex;
    if (sa.q !== sb.q) return sa.q < sb.q;
    return sa.r < sb.r;
  }

  mete(i: number): void {
    const d = this.datos;
    d.push(i);
    let h = d.length - 1;
    while (h > 0) {
      const padre = (h - 1) >> 1;
      if (!this.antes(d[h] as number, d[padre] as number)) break;
      [d[h], d[padre]] = [d[padre] as number, d[h] as number];
      h = padre;
    }
  }

  saca(): number {
    const d = this.datos;
    const cima = d[0] as number;
    const ultimo = d.pop() as number;
    if (d.length > 0) {
      d[0] = ultimo;
      let h = 0;
      for (;;) {
        const iz = 2 * h + 1;
        const de = iz + 1;
        let menor = h;
        if (iz < d.length && this.antes(d[iz] as number, d[menor] as number)) menor = iz;
        if (de < d.length && this.antes(d[de] as number, d[menor] as number)) menor = de;
        if (menor === h) break;
        [d[h], d[menor]] = [d[menor] as number, d[h] as number];
        h = menor;
      }
    }
    return cima;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * LA LLUVIA
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * CUÁNTO LLUEVE SOBRE CADA BIOMA, de base.
 *
 * No es un adorno: es lo que hace que un tablero con tres desiertos salga SECO de
 * verdad y no por sorteo. Como el umbral de caudal que decide si hay río es
 * ABSOLUTO, un reparto con base 0,35 produce del orden de un tercio del caudal de
 * uno con montaña y bosque, y cae en secano con mucha más frecuencia. La frase «no
 * hay río porque no llueve bastante sobre este tablero» es literalmente cierta.
 */
const LLUVIA_DEL_BIOMA: Readonly<Record<string, number>> = {
  montana: 1.3,
  cantil: 1.2,
  bosque: 1.3,
  colina: 1,
  pradera: 1,
  campo: 0.95,
  vega: 0.95,
  carrizal: 1.1,
  marisma: 1.1,
  desierto: 0.35,
  duna: 0.35,
  salina: 0.35,
};

const LLUVIA_POR_DEFECTO = 1;

function lluviaDelBioma(terreno: string): number {
  return Object.hasOwn(LLUVIA_DEL_BIOMA, terreno)
    ? (LLUVIA_DEL_BIOMA[terreno] as number)
    : LLUVIA_POR_DEFECTO;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * EL CÁLCULO
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * RESUELVE EL AGUA DE UN MUNDO.
 *
 * Es una función pura del terreno y de la semilla: mismo mundo, misma agua, en
 * cualquier máquina. No dibuja nada — devuelve un plan que la escena pinta.
 */
export function trazaLasAguas(mundo: MundoParaAguas): Aguas {
  const n = mundo.n;
  const canal = (c: number): number => c + mundo.semilla * 7_919;

  /* ── Los vecinos de cada celda, resueltos una vez ────────────────────────── */

  /**
   * `-1` es «fuera del tablero», y no es un caso especial que haya que rodear: es la
   * salida del agua. Todo el árbol de drenaje está enraizado ahí.
   */
  const vecinos = new Int32Array(n * 6);
  for (let i = 0; i < n; i++) {
    const sub = mundo.subteselas[i] as Hex;
    for (let k = 0; k < 6; k++) {
      const v = vecino(sub, k);
      vecinos[i * 6 + k] = mundo.indiceDe(v) ?? -1;
    }
  }

  /**
   * DE UN VECINO DE LA MALLA AL NÚMERO DE LADO DEL PACK.
   *
   * El pack numera sus lados por el ángulo `atan2(-z, x)`, y nuestra malla vive en el
   * plano `(x, y)` con la `y` haciendo de `z`. Se calcula en vez de escribirse: una
   * tabla a mano deja de valer el día que la malla cambie de convenio, y el síntoma
   * sería una costa girada que mete el mar dentro de la tierra.
   */
  const ladoHaciaVecino = new Int32Array(6);
  {
    const centro = centroDeHex({ q: 0, r: 0 }, 1);
    for (let k = 0; k < 6; k++) {
      const v = centroDeHex(vecino({ q: 0, r: 0 }, k), 1);
      const angulo = Math.atan2(-(v.y - centro.y), v.x - centro.x);
      ladoHaciaVecino[k] = ((Math.round(angulo / (Math.PI / 3)) % 6) + 6) % 6;
    }
  }

  /* ── 4.1 El campo, con desempate ─────────────────────────────────────────── */

  const h = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const sub = mundo.subteselas[i] as Hex;
    h[i] = (mundo.perfil[i] as number) + EPS_DESEMPATE * fraccion(sub.q, sub.r, canal(CANAL.desempate));
  }

  let masAlto = 0;
  for (let i = 0; i < n; i++) if ((h[i] as number) > masAlto) masAlto = h[i] as number;
  if (masAlto <= 0) masAlto = 1;

  /* ── 4.2 La lluvia ───────────────────────────────────────────────────────── */

  const lluvia = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const c = mundo.centros[i] as Punto;
    const base = lluviaDelBioma(mundo.terrenos[i] as string);
    /* Llueve más arriba: es lo que pone las cabeceras en la sierra y no en la vega. */
    const conLaAltura = 0.55 + (0.9 * (h[i] as number)) / masAlto;
    const mancha =
      0.6 +
      0.8 *
        fbm(
          c.x / (RADIO_DE_COMARCA * 2.2),
          c.y / (RADIO_DE_COMARCA * 2.2),
          canal(CANAL.lluvia),
          3,
        );
    lluvia[i] = base * conLaAltura * mancha;
  }

  /* ── 4.3 La inundación prioritaria ───────────────────────────────────────── */

  /**
   * DE UNA SOLA PASADA SALEN TRES COSAS: el nivel al que se estanca el agua en cada
   * sitio (`w`), el árbol de drenaje (`receptor`) y, de propina, los lagos — que son
   * simplemente las celdas donde `w` quedó por encima del terreno.
   *
   * El receptor se anota EN EL EMPUJE, no en el saque. Es lo que hace que dentro de
   * un lago, donde `w` es constante y no hay ninguna pendiente que seguir, el árbol
   * apunte igualmente hacia el punto de rebose en vez de quedarse dando vueltas.
   */
  const w = new Float64Array(n);
  const receptor = new Int32Array(n).fill(-1);
  const visto = new Uint8Array(n);
  const vuelco = new Int32Array(n);
  let cuantosVolcados = 0;

  {
    const cola = new Monticulo(w, mundo.subteselas);
    for (let i = 0; i < n; i++) {
      let esBorde = false;
      for (let k = 0; k < 6; k++) if (vecinos[i * 6 + k] === -1) esBorde = true;
      if (!esBorde) continue;
      w[i] = h[i] as number;
      visto[i] = 1;
      cola.mete(i);
    }

    while (cola.tamano > 0) {
      const i = cola.saca();
      vuelco[cuantosVolcados++] = i;
      for (let k = 0; k < 6; k++) {
        const v = vecinos[i * 6 + k] as number;
        if (v < 0 || visto[v] === 1) continue;
        w[v] = Math.max(h[v] as number, w[i] as number);
        receptor[v] = i;
        visto[v] = 1;
        cola.mete(v);
      }
    }
  }

  /* ── 4.4 Acumulación ─────────────────────────────────────────────────────── */

  /**
   * Una sola pasada INVERSA sobre el orden de saque. Como el receptor de una celda
   * siempre salió antes que ella, recorrer al revés garantiza que cuando se suma una
   * celda a su receptor, esa celda ya tiene todo lo suyo. No hay que ordenar nada.
   */
  const caudal = new Float64Array(n);
  for (let i = 0; i < n; i++) caudal[i] = lluvia[i] as number;
  for (let j = cuantosVolcados - 1; j >= 0; j--) {
    const i = vuelco[j] as number;
    const r = receptor[i] as number;
    if (r >= 0) caudal[r] = (caudal[r] as number) + (caudal[i] as number);
  }

  /* ── 4.5 ¿Hay río, y cuánto? ─────────────────────────────────────────────── */

  /** La pendiente hacia el receptor, en las unidades del código. */
  const pendiente = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const r = receptor[i] as number;
    const caida = r >= 0 ? (w[i] as number) - (w[r] as number) : (w[i] as number);
    pendiente[i] = Math.max(1e-3, caida * K_PENDIENTE);
  }

  /**
   * EL PREDICADO ÚNICO DE CAUCE.
   *
   * Una sola definición para las bocas, para el orden de las ramas, para las
   * confluencias y para lo que se pinta. Si hubiera dos, un día discreparían y
   * habría un cauce que empieza donde no empezaba.
   */
  const encauzado = (i: number, tau: number): boolean =>
    (caudal[i] as number) * (pendiente[i] as number) ** 0.6 >= tau;

  /* ── Los vetos, que van ANTES de elegir la boca ──────────────────────────
   *
   * Estaban doscientas líneas más abajo, después de escoger las desembocaduras, y por
   * eso la boca era lo único del río que nunca pasaba por `transitable()`: cuando se
   * elegía, `vedadoCauce` todavía no existía.
   *
   * Durante mucho tiempo no se notó, y la razón de que se note ahora es interesante:
   * dieciséis de los cincuenta y cuatro vértices no tenían subtesela debajo y se caían
   * del veto por un `.filter` silencioso. Al darles suelo, entraron en el veto — y con
   * ellos apareció borde nuevo justo a su lado, que es donde el río busca su boca.
   * Medido: 37 celdas de cauce dentro del veto de vértice en sesenta tableros, donde
   * antes había cero porque el vértice ni contaba.
   *
   * O sea que arreglar un fallo destapó otro que llevaba ahí desde el principio. Se
   * anota porque es el argumento a favor de contar lo que se filtra: el `.filter` no
   * sólo escondía su propio fallo, escondía éste.
   *
   * El bloque no depende de nada de la hidrología —sólo de la malla y de dónde se
   * construye— así que subirlo no cambia ningún resultado salvo el que se quería
   * cambiar.
   */
  const dVertice = distanciasDesde(mundo.enVertices, n, vecinos);
  const dPlaza = distanciasDesde(mundo.enPlazas, n, vecinos);
  const vedadoCauce = new Uint8Array(n);
  const vedadoCuerpo = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    vedadoCauce[i] =
      (dVertice[i] as number) <= VETO_VERTICE_CAUCE || (dPlaza[i] as number) <= VETO_PLAZA_CAUCE
        ? 1
        : 0;
    vedadoCuerpo[i] =
      (dVertice[i] as number) <= VETO_VERTICE_CUERPO || (dPlaza[i] as number) <= VETO_PLAZA_CUERPO
        ? 1
        : 0;
  }

  /** Las celdas del borde que recogen algo: las desembocaduras candidatas. */
  const bocas: number[] = [];
  for (let i = 0; i < n; i++) {
    let esBorde = false;
    for (let k = 0; k < 6; k++) if (vecinos[i * 6 + k] === -1) esBorde = true;
    if (esBorde) bocas.push(i);
  }
  bocas.sort((a, b) => {
    const d = (caudal[b] as number) - (caudal[a] as number);
    if (d !== 0) return d;
    const sa = mundo.subteselas[a] as Hex;
    const sb = mundo.subteselas[b] as Hex;
    return sa.q !== sb.q ? sa.q - sb.q : sa.r - sb.r;
  });

  /* Dos bocas demasiado juntas son la misma desembocadura contada dos veces. */
  const elegidas: number[] = [];
  for (const b of bocas) {
    if ((caudal[b] as number) < CAUDAL_MINIMO_DE_BOCA) break;
    /*
     * Y LA BOCA TAMBIÉN SE VETA, que era lo único del cauce que no pasaba por ningún
     * filtro. Con su propio radio: ver `VETO_BOCA`. Como las bocas van ordenadas por
     * caudal, saltarse una vedada no deja el tablero sin río — coge la siguiente.
     */
    if ((dVertice[b] as number) <= VETO_BOCA || (dPlaza[b] as number) <= VETO_PLAZA_CAUCE) {
      continue;
    }
    const sb = mundo.subteselas[b] as Hex;
    let lejos = true;
    for (const e of elegidas) {
      const se = mundo.subteselas[e] as Hex;
      const d = (Math.abs(sb.q - se.q) + Math.abs(sb.r - se.r) + Math.abs(sb.q + sb.r - se.q - se.r)) / 2;
      if (d < SEPARACION_DE_BOCAS) lejos = false;
    }
    if (lejos) elegidas.push(b);
    if (elegidas.length >= RIOS_MAX) break;
  }

  /**
   * EL UMBRAL SE CALIBRA POR LONGITUD PINTADA, no por caudal de boca.
   *
   * Multiplicar toda la lluvia por una constante escala el caudal Y el umbral por
   * igual, así que calibrando por caudal el conjunto pintado saldría idéntico y el
   * río sería invariante al clima — justo lo contrario de lo que se busca.
   * Calibrando por cuántas celdas se pintan, la lluvia sí manda.
   */
  function longitudCon(tau: number): number {
    let cuantas = 0;
    for (let i = 0; i < n; i++) if (encauzado(i, tau)) cuantas++;
    return cuantas;
  }

  let tau = TAU_MIN;
  if (elegidas.length > 0) {
    let bajo = TAU_MIN;
    let alto = TAU_MAX;
    for (let v = 0; v < TAU_VUELTAS; v++) {
      const medio = (bajo + alto) / 2;
      if (longitudCon(medio) > LONGITUD_MAX_DIBUJADA) bajo = medio;
      else alto = medio;
    }
    tau = alto;
    if (longitudCon(tau) < LONGITUD_MIN_DIBUJADA) elegidas.length = 0;
  }

  /* ── 4.6 Los lagos ───────────────────────────────────────────────────────── */

  const clase = new Uint8Array(n).fill(TIERRA);
  const nivelAgua = new Int16Array(n).fill(SIN_AGUA);

  /** Las depresiones: donde la lámina quedó por encima del terreno. */
  const grupo = new Int32Array(n).fill(-1);
  const grupos: number[][] = [];
  for (let i = 0; i < n; i++) {
    /*
     * `?? -1` Y NO UN `as number`, aunque el índice esté claramente dentro.
     *
     * Con `noUncheckedIndexedAccess` —que la app SÍ activa y este paquete no— leer un array
     * tipado da `number | undefined`, y aquí había dos sitios que no compilaban. Un `as
     * number` lo callaría, pero un `as` es una promesa que el compilador no puede
     * comprobar; `?? -1` DICE qué hacer si no hay entrada, y resulta que lo que hay que
     * hacer es exactamente eso: sin entrada, esa celda no está en ningún grupo.
     */
    if ((w[i] as number) <= (h[i] as number) + 1e-9 || (grupo[i] ?? -1) >= 0) continue;
    const cual = grupos.length;
    const bolsa: number[] = [];
    const pila = [i];
    grupo[i] = cual;
    while (pila.length > 0) {
      const t = pila.pop() as number;
      bolsa.push(t);
      for (let k = 0; k < 6; k++) {
        const v = vecinos[t * 6 + k] as number;
        if (v < 0 || (grupo[v] ?? -1) >= 0) continue;
        if ((w[v] as number) <= (h[v] as number) + 1e-9) continue;
        /* Un lago es una lámina: todas sus celdas están a la misma cota. */
        if (Math.abs((w[v] as number) - (w[t] as number)) > 1e-6) continue;
        grupo[v] = cual;
        pila.push(v);
      }
    }
    grupos.push(bolsa);
  }

  /* ── 4.7 Los vetos: subidos, y el porqué está donde se usan ──────────────── */

  /**
   * QUÉ LAGOS SE CONSERVAN.
   *
   * Los que no pasan el filtro se DRENAN sin más: el árbol de flujo no se toca,
   * porque ya apuntaba al punto de rebose. Un charco de tres celdas y dos dedos de
   * fondo no es un lago, es ruido con lámina.
   */
  let lagos = 0;
  const descartados = { pequena: 0, llana: 0, vedada: 0, enorme: 0 };
  let celdasEnDepresion = 0;
  let fondoMaximo = 0;
  for (const bolsa of grupos) {
    celdasEnDepresion += bolsa.length;
    for (const i of bolsa) {
      fondoMaximo = Math.max(fondoMaximo, (w[i] as number) - (h[i] as number));
    }
    if (bolsa.length < LAGO_MIN_CELDAS) {
      descartados.pequena++;
      continue;
    }

    let fondo = 0;
    let vedado = false;
    const porComarca = new Map<string, number>();
    for (const i of bolsa) {
      fondo = Math.max(fondo, (w[i] as number) - (h[i] as number));
      if (vedadoCuerpo[i] === 1) vedado = true;
      const c = mundo.comarcas[i] as Hex;
      const llave = `${String(c.q)},${String(c.r)}`;
      porComarca.set(llave, (porComarca.get(llave) ?? 0) + 1);
    }
    if (vedado) {
      descartados.vedada++;
      continue;
    }
    if (fondo < LAGO_PROFUNDIDAD_MIN) {
      descartados.llana++;
      continue;
    }
    /* Un lago que se come más de un tercio de una comarca deja de ser paisaje. */
    let cabe = true;
    for (const cuantas of porComarca.values()) if (cuantas > 0.35 * 144) cabe = false;
    if (!cabe) {
      descartados.enorme++;
      continue;
    }

    const cota = Math.floor(w[bolsa[0] as number] as number);
    for (const i of bolsa) {
      clase[i] = CUERPO;
      nivelAgua[i] = cota;
    }
    lagos++;
  }

  /* ── 4.8 a 4.10 El trazado del cauce ─────────────────────────────────────── */

  /**
   * EL CAUCE SE TRAZA SIGUIENDO EL ÁRBOL DE DRENAJE, no una búsqueda de camino.
   *
   * Desde la boca hacia arriba, en cada paso se sigue al hijo de MÁS CAUDAL que esté
   * encauzado. Ése es literalmente el curso principal del río: por donde va el agua.
   * Una búsqueda de camino tendría sentido para rodear una celda vedada, y aquí se
   * prefiere la regla honesta —si el cauce llega a un veto, se corta— porque un río
   * que da un rodeo para esquivar un sitio de construcción deja de ser un río y pasa
   * a ser una decoración que finge.
   *
   * Se para por cuatro motivos, todos escritos:
   *
   *   · no queda ningún hijo encauzado — es la cabecera natural;
   *   · el siguiente está VEDADO — el agua no entra en un sitio de construcción;
   *   · la cadena alcanzó el largo máximo que se pinta;
   *   · el terreno sube más de `CAVADO_MAXIMO` sobre el nivel del tramo, y entonces
   *     hay TRUNCAMIENTO: el río no trepa un muro, sencillamente no tiene esa
   *     cabecera, y lo de arriba se queda en valle seco.
   */
  const cadenas: number[][] = [];
  const enCauce = new Uint8Array(n);

  /**
   * LA DISTANCIA AL ÁRBOL DE DRENAJE.
   *
   * Cuántos pasos hay de cada celda a la rama encauzada más cercana. Es lo que
   * mantiene al cauce PEGADO al valle que la hidrología encontró: sin este término,
   * el A* atajaría por la ladera con tal de bajar, y saldría un canal recto que no
   * tiene nada que ver con por dónde corre el agua.
   */
  const encauzadas: number[] = [];
  for (let i = 0; i < n; i++) if (encauzado(i, tau)) encauzadas.push(i);
  const dArbol = distanciasDesde(encauzadas, n, vecinos);

  /** ¿Puede el cauce pasar por aquí? */
  function transitable(i: number): boolean {
    if (vedadoCauce[i] === 1) return false;
    if (clase[i] === CUERPO) return false;
    /* El río no trepa: por encima de esto el terreno se corta y queda valle seco. */
    return Math.round(w[i] as number) <= CAVADO_MAXIMO;
  }

  /**
   * El nivel entero del terreno CRUDO, para decidir el estuario.
   *
   * Se usa el crudo y no el cavado porque el cono todavía no existe cuando se abre la
   * cala: el cavado depende del agua, y el estuario es agua. Basta para lo que hace
   * falta — descartar un cantil, que lo es tanto antes como después de excavar.
   */
  function nivelTrasCavarCrudo(i: number): number {
    const v = Math.round(h[i] as number);
    return v < 0 ? 0 : v;
  }

  /** La distancia hexagonal entre dos subteselas. */
  function dHex(a: Hex, b: Hex): number {
    return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
  }

  for (const boca of elegidas) {
    /*
     * SE BUSCA DESDE LA BOCA HACIA ARRIBA, y no al revés. Costó dos intentos.
     *
     * Lo natural parecía ser: localizar la cabecera siguiendo el árbol de drenaje
     * hasta arriba del todo, y luego buscar el camino hasta la boca. Falla por dos
     * sitios a la vez. Sin truncar, la cabecera cae en lo alto de la sierra, donde el
     * cauce no puede llegar —no existe la pieza de río en cuesta— y el A* arranca en
     * una celda intransitable rodeada de intransitables: no expande nada. Y truncando
     * la subida al primer sitio impasable, la cabecera se queda a cuatro celdas de la
     * boca, porque este terreno sube deprisa.
     *
     * Medido: sin truncar, tres tableros de diez con río; truncando, uno.
     *
     * Lo que funciona es una sola pasada de Dijkstra DESDE la boca sobre las celdas
     * por las que el cauce puede ir, y quedarse con la que llegue más lejos. Así el
     * río llega hasta donde el valle da de sí, ni una celda más ni una menos, y el
     * camino existe por construcción: se lee de los punteros de la búsqueda.
     */
    const g = new Float64Array(n).fill(Number.POSITIVE_INFINITY);
    const padre = new Int32Array(n).fill(-1);
    const cerrado = new Uint8Array(n);
    g[boca] = 0;
    const cola = new Monticulo(g, mundo.subteselas);
    cola.mete(boca);

    const bocaSub = mundo.subteselas[boca] as Hex;
    let cabecera = -1;
    let masLejos = -1;

    while (cola.tamano > 0) {
      const i = cola.saca();
      if (cerrado[i] === 1) continue;
      cerrado[i] = 1;

      /* La mejor cabecera es la que más se aleja de la boca sin dejar el valle. */
      if (encauzado(i, tau)) {
        const d = dHex(mundo.subteselas[i] as Hex, bocaSub);
        if (d > masLejos) {
          masLejos = d;
          cabecera = i;
        }
      }

      for (let k = 0; k < 6; k++) {
        const v = vecinos[i * 6 + k] as number;
        if (v < 0 || cerrado[v] === 1) continue;
        if (!transitable(v) || enCauce[v] === 1) continue;
        /*
         * Avanzar cuesta uno; alejarse del árbol de drenaje cuesta ocho décimas por
         * paso. Ese segundo término es lo que mantiene el cauce dentro de su valle:
         * sin él, la búsqueda atajaría por la ladera y saldría un canal recto que no
         * tiene nada que ver con por dónde corre el agua.
         */
        const nuevo = (g[i] as number) + 1 + 0.8 * (dArbol[v] as number);
        if (nuevo >= (g[v] as number)) continue;
        g[v] = nuevo;
        padre[v] = i;
        cola.mete(v);
      }
    }

    if (cabecera < 0 || masLejos < 4) continue;

    /* El camino sale de los punteros: de la cabecera a la boca, ya en orden. */
    /*
     * LA CADENA SE GUARDA CON LA BOCA PRIMERO, y eso exige invertir exactamente una
     * vez. Los punteros de la búsqueda apuntan hacia la boca —se buscó DESDE ella—
     * así que recorrerlos desde la cabecera da cabecera-primero.
     *
     * El orden no es una preferencia: la poza de cabecera se planta junto al ÚLTIMO
     * eslabón, y el recorte por longitud máxima corta también por el final. Con la
     * cadena al revés, la poza se plantaba junto a la boca y el nacimiento se quedaba
     * con un solo lado abierto — la única máscara que el pack no sabe dibujar.
     */
    const camino: number[] = [];
    for (let t = cabecera; t >= 0; t = padre[t] as number) camino.push(t);
    camino.reverse();
    if (camino.length < LONGITUD_MIN_DIBUJADA) continue;
    if (camino.length > LONGITUD_MAX_DIBUJADA) camino.length = LONGITUD_MAX_DIBUJADA;

    for (const i of camino) enCauce[i] = 1;
    cadenas.push(camino);
  }

  /**
   * LA CABECERA: una poza, porque no existe la pieza de río de una sola boca.
   *
   * El extremo de aguas arriba de una cadena tiene un solo lado abierto, y esa
   * máscara no tiene pieza en el pack — no es un hueco del catálogo, es que un río
   * que se acaba dentro del mapa no existe. Así que se le pone una poza: una celda de
   * agua al mismo nivel, que le da el segundo lado.
   *
   * Si la poza no cabe —porque su sitio está vedado o pegado a otra agua— se acorta
   * la cadena una celda y se vuelve a intentar. Por debajo del largo mínimo, la rama
   * entera se queda en valle seco.
   */
  const pozas: number[] = [];
  for (const cadena of cadenas) {
    for (;;) {
      if (cadena.length < LONGITUD_MIN_DIBUJADA) break;
      const punta = cadena[cadena.length - 1] as number;
      let sitio = -1;
      for (let k = 0; k < 6; k++) {
        const v = vecinos[punta * 6 + k] as number;
        if (v < 0 || enCauce[v] === 1 || clase[v] !== TIERRA) continue;
        if (vedadoCuerpo[v] === 1) continue;
        let limpio = true;
        for (let j = 0; j < 6; j++) {
          const u = vecinos[v * 6 + j] as number;
          if (u < 0) continue;
          if (clase[u] === CUERPO || (enCauce[u] === 1 && u !== punta)) limpio = false;
        }
        if (limpio) {
          sitio = v;
          break;
        }
      }
      if (sitio >= 0) {
        pozas.push(sitio);
        break;
      }
      enCauce[punta] = 0;
      cadena.pop();
    }
  }

  /* Las cadenas que se quedaron cortas al buscar poza se descartan enteras. */
  const buenas = cadenas.filter((c) => c.length >= LONGITUD_MIN_DIBUJADA);
  const rios = buenas.length;
  for (const c of cadenas) if (c.length < LONGITUD_MIN_DIBUJADA) for (const i of c) enCauce[i] = 0;

  /**
   * LOS NIVELES, y por qué el cauce entero va a cero.
   *
   * No existe `hex_river_sloped`: un río no puede cruzar el borde de una terraza. Y
   * como la boca desemboca en el mar, que está a nivel cero, TODO el cauce vive a
   * nivel cero. El terreno se le abre paso por el cono de cavado, no al revés.
   *
   * Eso es una concesión asumida y acotada: los ríos de este mundo viven en la mitad
   * baja del tablero. La alternativa sería inventarse la pieza que el pack no trae.
   */
  for (const cadena of buenas) {
    for (const i of cadena) {
      clase[i] = CAUCE;
      nivelAgua[i] = 0;
    }
  }
  for (const poza of pozas) {
    if (clase[poza] !== TIERRA) continue;
    clase[poza] = CUERPO;
    nivelAgua[poza] = 0;
  }

  /* ── El porte del cauce: arroyo, río u hondo ─────────────────────────────── */

  /**
   * EL PORTE DE CADA TRAMO SALE DEL CAUDAL, no de un sorteo.
   *
   * Un río no tiene el mismo aspecto en su cabecera que en su desembocadura, y la
   * diferencia no es decorativa: es que por abajo pasa mucha más agua. Aquí se lee
   * literalmente eso — el caudal acumulado— y de ahí salen tres portes:
   *
   *   · ARROYO: una sola celda, sin margen de arena. Un hilo de agua entre la hierba.
   *   · RIO: una sola celda, con margen de arena a los lados. La ribera se ve.
   *   · HONDO: DOS celdas de ancho, con margen. Ya es una vía fluvial navegable.
   *
   * Como el caudal crece monótonamente aguas abajo, sale solo lo que se pedía: un
   * arroyo que se ensancha, se hace río con orilla y acaba hondo antes de la boca. Y
   * el ruido que modula los umbrales hace que la transición no caiga siempre en el
   * mismo punto — a veces el ensanche llega pronto, a veces el río entero es un
   * arroyo, y a veces se estrecha otra vez al cruzar un desfiladero.
   */
  const porte = new Uint8Array(n);
  for (const cadena of cadenas) {
    const boca = cadena[0] as number;
    const caudalDeLaBoca = Math.max(1, caudal[boca] as number);

    /*
     * PRIMERO, LOS DOS REGÍMENES QUE EXISTEN DE VERDAD.
     *
     * Medido sobre el caudal a lo largo de un cauce: veintitrés celdas al 99-100% del
     * caudal de la boca y cincuenta y una por debajo del 7%, con un corte en seco
     * entre 0,63 y 0,07. No es un defecto del cálculo: es dónde entran los afluentes.
     * Un tronco lleva casi toda el agua y una cabecera casi ninguna, y entre los dos
     * no hay una franja gradual que capturar con un umbral intermedio — intentarlo
     * daba cero celdas de porte medio en cinco tableros de cinco.
     *
     * La anchura va con la RAÍZ del caudal, que es la geometría hidráulica de toda la
     * vida, así que el umbral se compara sobre la raíz.
     */
    for (const i of cadena) {
      const c = mundo.centros[i] as Punto;
      const capricho =
        1 +
        (fbm(
          c.x / (RADIO_DE_COMARCA * 0.8),
          c.y / (RADIO_DE_COMARCA * 0.8),
          canal(CANAL.porte),
          2,
        ) -
          0.5) *
          0.55;
      const parte = Math.sqrt((caudal[i] as number) / caudalDeLaBoca) * capricho;
      porte[i] = parte >= UMBRAL_HONDO ? HONDO : ARROYO;
    }

    /*
     * Y LUEGO LA TRANSICIÓN, que es lo que hace que se vea como un río y no como dos.
     *
     * El porte medio no es una franja de caudal: es el TRAMO en el que el arroyo ya se
     * ha ensanchado pero todavía no es vía fluvial. Se marca subiendo unas celdas
     * desde cada punto donde el cauce pasa de hondo a arroyo, y lo largo que sea ese
     * tramo lo decide el ruido — así unas veces el ensanche es brusco, como una
     * confluencia, y otras el río se va abriendo despacio a lo largo de siete celdas.
     *
     * Va en las dos direcciones porque la cadena se recorre de la boca hacia arriba:
     * de bajada el arroyo se ensancha, y leyéndolo al revés el río se estrecha. Las
     * dos lecturas son la misma cinta.
     */
    for (let k = 1; k < cadena.length; k++) {
      const antes = cadena[k - 1] as number;
      const aqui = cadena[k] as number;
      if (porte[antes] !== HONDO || porte[aqui] !== ARROYO) continue;
      const sub = mundo.subteselas[aqui] as Hex;
      const largo = 3 + (revoltijoDe(sub.q, sub.r, canal(CANAL.porte)) % 5);
      for (let j = 0; j < largo && k + j < cadena.length; j++) {
        const t = cadena[k + j] as number;
        if (porte[t] !== ARROYO) break;
        porte[t] = RIO;
      }
    }
  }

  /**
   * EL TRAMO HONDO NO ES UN CAUCE MÁS ANCHO: ES OTRA CONSTRUCCIÓN.
   *
   * ═══ EL PACK TIENE DOS MANERAS DE HACER AGUA, Y HAY QUE USAR LAS DOS ═══
   *
   * `hex_river_*` es un CAUCE TALLADO dentro de una tesela: mide 0,92 de ancho sobre
   * los 2,0 de la pieza y trae su ribera horneada a los lados. Es un arroyo, y por
   * mucho que se pongan dos juntos siguen siendo dos arroyos paralelos.
   *
   * Un río ANCHO Y NAVEGABLE se construye al revés: con teselas de AGUA llenas
   * —`hex_water`, que no tiene nada de tierra— y teselas de COSTA alrededor haciendo
   * de orilla. Es exactamente la misma construcción que un lago o que el mar, sólo que
   * con forma de cinta. Y como la regla de costas ya trata cualquier cuerpo de agua
   * igual, las orillas de arena salen solas.
   *
   * Así que donde el caudal manda, el cauce deja de ser cauce y pasa a ser CUERPO: se
   * moja la celda y una o dos vecinas, y el resultado es una lámina por la que cabe un
   * barco. Los tres portes siguen siendo los mismos y la variabilidad no se toca —
   * lo que cambia es CON QUÉ se dibuja cada uno.
   */
  const mojadas: number[] = [];
  for (const cadena of cadenas) {
    for (const i of cadena) {
      if (porte[i] !== HONDO) continue;
      /*
       * EL VETO SE COMPROBABA AL TALLAR Y SE OLVIDABA AL ENSANCHAR.
       *
       * Un sitio de construcción tiene DOS radios de veda, y no por capricho: el cauce
       * tallado cabe a dos celdas de un vértice —es una acequia dentro de la tesela— y
       * un cuerpo de agua no cabe hasta tres, porque moja a sus vecinas y ahí ya no se
       * levanta nada.
       *
       * El trazado respetaba el primero y el ensanche no volvía a mirar el segundo: la
       * celda entraba en `mojadas` sólo por ser HONDA. Y como las vecinas SÍ se
       * comprobaban, el fallo tenía la forma más engañosa posible — el código de al
       * lado hacía lo correcto tres líneas más abajo.
       *
       * Medido sobre sesenta tableros, y el contraste no deja lugar a dudas: celdas de
       * CAUCE dentro de su propio veto, CERO; celdas de CUERPO dentro del suyo, 293, o
       * sea 4,9 por tablero y en 40 de los 60. El río se ensanchaba encima del sitio de
       * fundar en dos de cada tres partidas.
       *
       * ═══ Y POR QUÉ SE ESTRECHA EN VEZ DE APARTARSE ═══
       *
       * Porque el agua ya está trazada: moverla aquí es reabrir la hidrología entera
       * con el cierre morfológico ya hecho. Lo que se hace es no ensancharla — el tramo
       * se queda en cauce tallado— y bajarle el porte a RÍO, que es lo que de verdad
       * es: un río que pasa estrecho. Con eso recupera además su banda de arena, porque
       * el margen se dibuja justo para los tramos de porte RÍO.
       *
       * Se lee como lo que es: el río se abre en la llanura y se encaja al pasar junto
       * al pueblo. La regla del juego asomando por el paisaje en vez de contradiciéndolo.
       */
      if (vedadoCuerpo[i] === 1) {
        porte[i] = RIO;
        continue;
      }
      mojadas.push(i);
      /*
       * Se mojan las vecinas MÁS BAJAS, que es por donde se desbordaría de verdad, y
       * nunca una vedada: el agua no entra en un sitio de construcción ni siquiera
       * ensanchándose. Dos por celda dan una lámina de tres de través, que es lo que
       * hace falta para que un barco de doce unidades de eslora no parezca encajado.
       */
      const candidatas: Array<{ v: number; alto: number }> = [];
      for (let k = 0; k < 6; k++) {
        const v = vecinos[i * 6 + k] as number;
        if (v < 0 || clase[v] !== TIERRA || enCauce[v] === 1) continue;
        if (vedadoCauce[v] === 1 || vedadoCuerpo[v] === 1) continue;
        candidatas.push({ v, alto: h[v] as number });
      }
      candidatas.sort((a, b) => a.alto - b.alto);
      for (const c of candidatas.slice(0, 2)) {
        enCauce[c.v] = 1;
        porte[c.v] = HONDO;
        mojadas.push(c.v);
      }
    }
  }

  /**
   * EL ESTUARIO: la cala en la que el río desemboca.
   *
   * Sin él, el canal llega al borde del tablero y se para en seco, como si el mar
   * empezara justo detrás de una pared. Con él, la boca se abre en abanico sobre las
   * celdas del borde que tiene alrededor, y eso hace dos cosas a la vez: se lee como
   * una desembocadura, y da la única superficie de agua ANCHA garantizada del tablero
   * — que es donde caben el barco fondeado y el muelle.
   *
   * Sólo se abre sobre celdas de BORDE: tierra adentro sería un lago pegado a la
   * costa, que es otra cosa. Y nunca sobre una vedada, como todo lo demás.
   */
  for (const cadena of cadenas) {
    const boca = cadena[0] as number;
    const bocaSub = mundo.subteselas[boca] as Hex;
    for (let i = 0; i < n; i++) {
      if (clase[i] !== TIERRA || enCauce[i] === 1) continue;
      if (vedadoCauce[i] === 1 || vedadoCuerpo[i] === 1) continue;
      /* Sólo el borde: una celda del interior no es estuario, es laguna. */
      let esBorde = false;
      for (let k = 0; k < 6; k++) if (vecinos[i * 6 + k] === -1) esBorde = true;
      if (!esBorde) continue;
      if (dHex(mundo.subteselas[i] as Hex, bocaSub) > RADIO_DEL_ESTUARIO) continue;
      /* No se abre sobre un cantil: una cala está al nivel del mar o no es cala. */
      if (nivelTrasCavarCrudo(i) > 1) continue;
      enCauce[i] = 1;
      porte[i] = HONDO;
      mojadas.push(i);
    }
  }

  /*
   * Y AHORA EL CAMBIO DE CLASE. Se hace al final y de golpe para que el bucle de
   * arriba siga viendo TIERRA en las vecinas mientras decide a cuáles llega: si se
   * cambiaran sobre la marcha, cada celda vería mojadas las que acaba de mojar su
   * antecesora y la cinta se iría ensanchando sola hasta el borde del tablero.
   */
  for (const i of mojadas) {
    clase[i] = CUERPO;
    nivelAgua[i] = 0;
  }

  /**
   * EL MARGEN DE ARENA: qué tierra se ve como ribera.
   *
   * Sólo la que toca un cauce de porte río u hondo. Un arroyo corre entre la hierba,
   * como corre un arroyo; un río deja playa. Esto NO es una pieza de costa —el río ya
   * trae la suya— sino a qué celda del atlas apunta el suelo de esa tesela, que es lo
   * que la pinta de arena sin cambiarle la forma.
   */
  const margen = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (clase[i] === CAUCE || clase[i] === CUERPO) continue;
    for (let k = 0; k < 6; k++) {
      const v = vecinos[i * 6 + k] as number;
      if (v < 0 || clase[v] !== CAUCE) continue;
      /*
       * Sólo el tramo de RÍO pide margen pintado. El ARROYO corre entre la hierba,
       * como corre un arroyo; y el HONDO ya no es cauce sino cuerpo de agua, así que
       * le toca orilla de verdad —pieza de costa con su playa— y no un tinte.
       */
      if (porte[v] === RIO) margen[i] = 1;
    }
  }

  /* ── 4.11 El cono de cavado ──────────────────────────────────────────────── */

  /*
   * Va AQUÍ y no más abajo, y el orden es parte del algoritmo: la regla del borde
   * necesita saber a qué nivel entero va a quedar cada tesela DESPUÉS de excavar, y
   * eso sólo se sabe con el cono ya hecho. Al revés, una tesela de borde que el río
   * va a bajar a cero se juzgaría por su altura antigua y no generaría costa.
   */
  const cono = conoDeCavado(n, vecinos, clase, nivelAgua);

  /* ── 4.14 Las orillas ────────────────────────────────────────────────────── */

  /**
   * EL ANILLO DE COSTA ES OBLIGATORIO, NO COSMÉTICO.
   *
   * `hex_water` NO tiene tierra: su punto más alto está a -0,2 del pack. Pegada
   * directamente a una tesela de hierba deja un corte vertical de 1,09 unidades de
   * mundo sin playa, como si al lago le hubieran recortado el borde con tijeras. Las
   * teselas de costa son las que cierran ese escalón con su franja de arena.
   *
   * ═══ LA REGLA, Y POR QUÉ CASA SIEMPRE ═══
   *
   * Para cada tesela de TIERRA se mira por qué lados tiene agua. Ese conjunto tiene
   * que ser una TIRADA CONTIGUA de uno a cuatro lados, y entonces hay pieza: una
   * para cada largo, girada para que su tirada caiga donde toca.
   *
   * Que las playas de dos teselas vecinas empalmen no es suerte: al cruzar una arista
   * compartida el parámetro que recorre el lado CAMBIA DE SIGNO, así que la arena que
   * una saca sobre la mitad de su lado es exactamente la que la otra saca sobre la
   * mitad del suyo. Está comprobado sobre las cuatro piezas medidas y sobre dieciocho
   * costas montadas enteras, con cero fallos.
   *
   * ═══ Y LO QUE NO TIENE PIEZA ═══
   *
   * No existe tesela para cinco ni seis lados de agua, ni para lados SUELTOS —una
   * lengua de tierra de una sola celda entre dos aguas—. Eso no se rodea: se INUNDA
   * antes de pedir la pieza. Es un cierre morfológico que sólo añade agua, así que
   * termina.
   */

  /** El nivel entero al que quedará cada celda tras el cavado, para la regla del borde. */
  const nivelTrasCavar = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const c = cono[i] as number;
    const crudo = h[i] as number;
    const v = Math.round(c < crudo ? c : crudo);
    nivelTrasCavar[i] = v < 0 ? 0 : v;
  }

  /**
   * ¿CUENTA COMO AGUA, PARA LA REGLA DE COSTAS, lo que hay al otro lado de este lado?
   *
   * ═══ EL CAUCE NO CUENTA, Y ÉSA ES LA CORRECCIÓN ═══
   *
   * Las teselas de río del pack TRAEN SU PROPIA ORILLA horneada: el cauce mide 0,92
   * sobre una tesela de 2,0, y el resto de la pieza ya es ribera. Poner además una
   * pieza de costa en la tierra de al lado es tratar dos veces la misma orilla.
   *
   * Y no salía mal siempre, que es lo que lo hacía confuso: sólo salía costa donde el
   * patrón de lados con agua daba por casualidad una tirada contigua válida. El
   * resultado era un río con orilla a trozos, con y sin, a lo largo del mismo
   * recorrido.
   *
   * Así que para la regla de costas cuenta como agua un CUERPO —lago, poza, estuario—
   * o el exterior del tablero. El cauce, no.
   */
  function esAguaDetras(i: number, k: number): boolean {
    const v = vecinos[i * 6 + k] as number;
    if (v < 0) {
      /*
       * EL EXTERIOR CUENTA COMO AGUA SÓLO SI ESTA CELDA ESTÁ A NIVEL CERO.
       *
       * Una tesela de borde a nivel uno o más es un ACANTILADO sobre el mar, no una
       * playa: ponerle costa dejaría su franja de arena flotando cinco unidades por
       * encima del agua. Ésas se decoran con roca y no generan orilla.
       */
      return nivelTrasCavar[i] === 0;
    }
    return clase[v] === CUERPO;
  }

  /** Los lados con agua de una celda, en bits. */
  function ladosConAgua(i: number): number {
    let bits = 0;
    for (let k = 0; k < 6; k++) {
      if (esAguaDetras(i, k)) bits |= 1 << (ladoHaciaVecino[k] as number);
    }
    return bits;
  }

  /*
   * EL CIERRE, hasta punto fijo. Sólo AÑADE agua, así que no puede oscilar: el
   * conjunto de agua crece y está acotado por el tablero.
   */
  /** Las celdas que se mojaron al ensanchar: son las primeras que se pueden secar. */
  const seEnsancho = new Uint8Array(n);
  for (const i of mojadas) seEnsancho[i] = 1;

  /**
   * LAS QUE SE SECARON A PROPÓSITO, y por qué hace falta acordarse.
   *
   * Sin esta lista las dos fases se pisan: la fase B seca una celda para arreglar la
   * orilla imposible de su vecina, y la fase A —que sólo mira si una celda de tierra
   * tiene orilla dibujable— la vuelve a inundar en la vuelta siguiente. Y otra vez, y
   * otra, hasta agotar el tope de vueltas y quedarse sin arreglar.
   *
   * Medido: tres celdas de treinta tableros, todas en el mismo istmo, pidiendo una
   * pieza de costa que no existe. Recordando cuáles se secaron adrede, el bucle
   * converge — sólo puede quitar agua un número finito de veces.
   */
  const secadaAdrede = new Uint8Array(n);

  let vueltas = 0;
  for (; vueltas < CIERRE_MAX_VUELTAS; vueltas++) {
    let cambió = false;

    /*
     * FASE A — INUNDAR. Sólo añade agua, así que no puede oscilar.
     *
     * Una celda de tierra cuya orilla no tiene pieza se une al cuerpo vecino más bajo.
     * Se elige el más bajo y no el primero para no dejar una lámina colgada sobre otra.
     */
    for (let i = 0; i < n; i++) {
      if (clase[i] !== TIERRA && clase[i] !== VAGUADA) continue;
      if (vedadoCuerpo[i] === 1 || secadaAdrede[i] === 1) continue;
      const bits = ladosConAgua(i);
      if (tiradaDe(bits) !== null) continue;
      let cota = Number.POSITIVE_INFINITY;
      for (let k = 0; k < 6; k++) {
        const v = vecinos[i * 6 + k] as number;
        if (v < 0 || (clase[v] !== CAUCE && clase[v] !== CUERPO)) continue;
        cota = Math.min(cota, nivelAgua[v] as number);
      }
      if (!Number.isFinite(cota)) continue;
      clase[i] = CUERPO;
      nivelAgua[i] = cota;
      cambió = true;
    }

    /*
     * FASE B — SECAR, y sólo sobre celdas VEDADAS.
     *
     * Una celda vedada con la orilla imposible no se puede inundar: el agua no entra
     * en un sitio de construcción, y ésa es una invariante del juego que manda sobre
     * la comodidad del pintado. Así que se le quita el agua a la vecina.
     *
     * Se seca primero una celda de ENSANCHE, que es la más prescindible de todas: la
     * mojó el algoritmo para dar anchura y quitarla sólo estrecha el río un poco. Y si
     * no hay ninguna, se seca la vecina de menos caudal. Nunca se toca una celda de la
     * cadena principal, que es la que hace que el río llegue al mar.
     *
     * Sin esta fase quedaba una celda de cada doce tableros pidiendo una pieza de
     * costa que no existe. Medido.
     */
    for (let i = 0; i < n; i++) {
      if (clase[i] !== TIERRA && clase[i] !== VAGUADA) continue;
      if (vedadoCuerpo[i] === 0) continue;
      if (tiradaDe(ladosConAgua(i)) !== null) continue;

      let victima = -1;
      let mejor = Number.POSITIVE_INFINITY;
      for (let k = 0; k < 6; k++) {
        const v = vecinos[i * 6 + k] as number;
        if (v < 0 || clase[v] !== CUERPO) continue;
        /* El ensanche vale menos que el cauce: se seca antes. */
        const precio = (seEnsancho[v] === 1 ? 0 : 1e9) + (caudal[v] as number);
        if (precio < mejor) {
          mejor = precio;
          victima = v;
        }
      }
      if (victima < 0) continue;
      clase[victima] = TIERRA;
      nivelAgua[victima] = SIN_AGUA;
      enCauce[victima] = 0;
      secadaAdrede[victima] = 1;
      cambió = true;
    }

    if (!cambió) break;
  }
  const celdasDelCierre = vueltas;

  /** La orilla de cada celda de tierra: los lados por los que ve agua. */
  const orilla = new Uint8Array(n);
  let orillasImposibles = 0;
  for (let i = 0; i < n; i++) {
    if (clase[i] === CAUCE || clase[i] === CUERPO) continue;
    const bits = ladosConAgua(i);
    orilla[i] = bits;
    /*
     * LO QUE EL CIERRE NO LLEGÓ A ARREGLAR, contado y no disimulado.
     *
     * Queda alguna: medido, UNA celda cada sesenta tableros, siempre en un istmo
     * donde el agua la rodea por lados que no forman una tirada y donde ni inundarla
     * ni secar a su vecina es posible —está vedada, o su «agua» es el exterior del
     * tablero, que no se puede quitar—. Esa tesela se dibuja como suelo normal y deja
     * un canto de 1,09 contra el agua.
     *
     * Se cuenta aquí para que salga en la batería. Un generador que arregla el 99,98%
     * de los casos y no dice nada del resto es un generador en el que no se puede
     * confiar cuando aparezca el caso.
     */
    if (tiradaDe(bits) === null) orillasImposibles++;
  }

  /**
   * LA MÁSCARA: por qué lados sale el agua de cada celda de cauce.
   *
   * Los cruces salen solos. Si dos ramas llegan a la misma celda, sus lados se
   * acumulan en el mismo conjunto y la tabla devuelve la pieza de tres bocas — no hay
   * que detectar las confluencias ni tratarlas aparte.
   *
   * La celda de la boca añade además el lado que mira AFUERA del tablero, que es lo
   * que la salva de quedarse con una sola boca y sin pieza.
   *
   * ═══ Y VA AQUÍ, DESPUÉS DEL CIERRE, QUE ES LA CORRECCIÓN ═══
   *
   * Se calculaba doscientas líneas más arriba, antes del cierre morfológico de costas.
   * Pero el cierre INUNDA celdas —para eso está: convierte en agua lo que no tiene
   * pieza de costa dibujable— y una celda de tierra que se vuelve agua cambia la
   * máscara de todos sus vecinos de cauce. Nadie volvía a mirarla.
   *
   * El síntoma es sutil y por eso duró: el cauce tallado de esa tesela apuntaba a un
   * lado donde ya no había tierra, o dejaba de apuntar a uno donde ahora hay agua. Se
   * ve como un río que se corta contra su propia orilla.
   *
   * Medido: 12 teselas de 2.497 en sesenta tableros, un 0,5%, repartidas en 6 tableros.
   * Poco, y aun así el orden estaba mal: la máscara describe el agua, así que tiene que
   * leerse cuando el agua ya está decidida. Moverla cuesta nada y quita una clase
   * entera de fallo, no doce casos.
   */
  const mascara = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (clase[i] !== CAUCE) continue;
    let bits = 0;
    for (let k = 0; k < 6; k++) {
      const v = vecinos[i * 6 + k] as number;
      const esAgua = v < 0 || clase[v] === CAUCE || clase[v] === CUERPO;
      if (esAgua) bits |= 1 << (ladoHaciaVecino[k] as number);
    }
    mascara[i] = bits;
  }

  /** A cuántos pasos está cada celda de la orilla más cercana. Para la banda de arena. */
  const aguaTodas: number[] = [];
  for (let i = 0; i < n; i++) if (clase[i] === CAUCE || clase[i] === CUERPO) aguaTodas.push(i);
  const dOrilla = distanciasDesde(aguaTodas, n, vecinos);

  /* ── Las vaguadas: valles húmedos sin lámina ─────────────────────────────── */

  for (let i = 0; i < n; i++) {
    if (clase[i] !== TIERRA) continue;
    if ((caudal[i] as number) >= VAGUADA_A_MIN && !encauzado(i, tau)) clase[i] = VAGUADA;
  }

  /* ── El retrato del tablero ──────────────────────────────────────────────── */

  let celdasDeAgua = 0;
  for (let i = 0; i < n; i++) if (clase[i] === CAUCE || clase[i] === CUERPO) celdasDeAgua++;

  /**
   * EL ARQUETIPO SALE DE LO QUE SE PINTÓ, no de lo que se pensaba pintar.
   *
   * Contarlo por bocas elegidas es contar intenciones: un tablero puede tener dos
   * desembocaduras con caudal de sobra y quedarse sin un solo cauce dibujado porque
   * el trazado no encontró por dónde. Estuvo así y decía «dos ríos» sobre un tablero
   * seco. El retrato tiene que describir el tablero, no el plan.
   */
  const arquetipo: Arquetipo =
    rios >= 2
      ? 'dos-rios'
      : rios === 1
        ? lagos > 0
          ? 'rio-con-lago'
          : 'un-rio'
        : lagos > 0
          ? 'laguna'
          : 'secano';

  let celdasEncauzadas = 0;
  for (let i = 0; i < n; i++) if (encauzado(i, tau)) celdasEncauzadas++;

  return {
    arquetipo,
    clase,
    nivelAgua,
    mascara,
    lluvia,
    caudal,
    cono,
    orilla,
    porte,
    margen,
    dOrilla,
    celdasDeAgua,
    diagnostico: {
      depresiones: grupos.length,
      celdasEnDepresion,
      fondoMaximo,
      lagosConservados: lagos,
      descartados,
      bocasCandidatas: bocas.length,
      bocasElegidas: elegidas.length,
      tau,
      celdasEncauzadas,
      vueltasDelCierre: celdasDelCierre,
      orillasImposibles,
    },
    conoEn(p: Punto): number {
      return conoEnPunto(p, cono, mundo);
    },
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * AUXILIARES
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Distancia hexagonal desde un conjunto de orígenes, por anchura. */
function distanciasDesde(
  origenes: readonly number[],
  n: number,
  vecinos: Int32Array,
): Int32Array {
  const d = new Int32Array(n).fill(0x7fff_ffff);
  const cola: number[] = [];
  for (const o of origenes) {
    if (o < 0 || o >= n) continue;
    d[o] = 0;
    cola.push(o);
  }
  for (let cabeza = 0; cabeza < cola.length; cabeza++) {
    const i = cola[cabeza] as number;
    for (let k = 0; k < 6; k++) {
      const v = vecinos[i * 6 + k] as number;
      if (v < 0 || (d[v] as number) <= (d[i] as number) + 1) continue;
      d[v] = (d[i] as number) + 1;
      cola.push(v);
    }
  }
  return d;
}

/**
 * EL CONO DE CAVADO, y el teorema que hace innecesarias las reparaciones.
 *
 * ═══ QUÉ ES ═══
 *
 * Alrededor de cada celda de agua, un embudo: el anillo 1 al nivel del agua, el
 * anillo 2 un escalón por encima, el 3 dos, y así. El terreno definitivo es el
 * MÍNIMO entre lo que dice el ruido y lo que dice este cono, así que el agua se
 * excava su valle en vez de aparecer pegada sobre una loma.
 *
 * ═══ POR QUÉ ASÍ Y NO CON UN PERFIL DE RADIO FIJO ═══
 *
 * Porque `cono` es 1-Lipschitz: entre dos celdas vecinas no puede cambiar más de un
 * escalón, ya que la distancia hexagonal cambia como mucho en uno y `max(0, x-1)`
 * conserva esa propiedad. Y como `|min(a₁,b₁) - min(a₂,b₂)| ≤ max(|a₁-a₂|, |b₁-b₂|)`,
 * el terreno cavado hereda la cota:
 *
 *     para vecinas t,u:   |cavado(t) - cavado(u)|  ≤  max( |h(t) - h(u)| , 1 )
 *
 * Es decir: EL CAVADO NO PUEDE FABRICAR NINGÚN MURO QUE NO EXISTIERA YA EN EL
 * TERRENO. Y como redondear no separa dos números que distan menos de uno, la
 * propiedad sobrevive al corte en escalones.
 *
 * Eso mata de raíz la familia entera de fallos «zanja con murete de dos escalones»,
 * que es la misma que ya costó dieciséis muros insalvables cuando el aplanado de los
 * rellanos se hacía sobre el nivel ya cortado. Aquí no hay nada que reparar porque no
 * hay nada que pueda romperse.
 *
 * ═══ Y UNA CONSECUENCIA GRATUITA ═══
 *
 * Anillo 1 al nivel del agua y anillo 2 un escalón por encima significa que el camino
 * que baja hasta la orilla desciende exactamente un escalón por anillo — que es justo
 * lo que sabe hacer la rampa de camino del pack. Las cuestas de aproximación al vado
 * salen de aquí, no de una regla aparte.
 */
function conoDeCavado(
  n: number,
  vecinos: Int32Array,
  clase: Uint8Array,
  nivelAgua: Int16Array,
): Float64Array {
  const cono = new Float64Array(n).fill(Number.POSITIVE_INFINITY);
  const anillo = new Int32Array(n).fill(0x7fff_ffff);
  const cola: number[] = [];

  for (let i = 0; i < n; i++) {
    if (clase[i] !== CAUCE && clase[i] !== CUERPO) continue;
    cono[i] = nivelAgua[i] as number;
    anillo[i] = 0;
    cola.push(i);
  }

  for (let cabeza = 0; cabeza < cola.length; cabeza++) {
    const i = cola[cabeza] as number;
    for (let k = 0; k < 6; k++) {
      const v = vecinos[i * 6 + k] as number;
      if (v < 0) continue;
      const d = (anillo[i] as number) + 1;
      /* `max(0, d-1)`: el anillo 1 se queda al nivel del agua, y por eso es banco. */
      const candidato = (cono[i] as number) - Math.max(0, (anillo[i] as number) - 1) + Math.max(0, d - 1);
      if (candidato >= (cono[v] as number)) continue;
      cono[v] = candidato;
      anillo[v] = d;
      cola.push(v);
    }
  }
  return cono;
}

/**
 * EL CONO EN UN PUNTO CUALQUIERA.
 *
 * Se mira la celda que lo contiene y sus seis vecinas, sumando a cada una la
 * distancia real al punto medida en pasos. Eso conserva la propiedad Lipschitz —que
 * es de lo que depende el teorema— y cuesta siete distancias.
 */
function conoEnPunto(p: Punto, cono: Float64Array, mundo: MundoParaAguas): number {
  const paso = Math.sqrt(3) * RADIO_DE_TESELA;
  let mejor = Number.POSITIVE_INFINITY;
  const centro = hexDeUnPunto(p);
  for (let k = -1; k < 6; k++) {
    const sub = k < 0 ? centro : vecino(centro, k);
    const i = mundo.indiceDe(sub);
    if (i === undefined) continue;
    const c = centroDeHex(sub, RADIO_DE_TESELA);
    const d = Math.hypot(p.x - c.x, p.y - c.y) / paso;
    const candidato = (cono[i] as number) + d;
    if (candidato < mejor) mejor = candidato;
  }
  return mejor;
}

/**
 * De un punto a su subtesela.
 *
 * Está duplicada de `relieve.ts` a propósito y no importada: `aguas.ts` no puede
 * depender de `relieve.ts`, porque es `relieve.ts` quien llama a éste. Es la única
 * repetición del módulo y son diez líneas de aritmética exacta.
 */
function hexDeUnPunto(p: Punto): Hex {
  const q = ((Math.sqrt(3) / 3) * p.x - (1 / 3) * p.y) / RADIO_DE_TESELA;
  const r = ((2 / 3) * p.y) / RADIO_DE_TESELA;
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return { q: rq, r: rr };
}

/** Los seis lados, expuestos para que la escena no vuelva a contarlos. */
export const LADOS = DIRECCIONES.length;

/**
 * ¿ES ESTE CONJUNTO DE LADOS UNA TIRADA CONTIGUA DE UNO A CUATRO?
 *
 * Devuelve el largo y el PRIMERO de la tirada —el único lado cuyo anterior no está en
 * el conjunto— o `null` si no hay pieza que lo dibuje: cinco lados, seis, o lados
 * sueltos como `{0,3}`, que es una lengua de tierra de una sola celda entre dos aguas.
 *
 * El conjunto vacío devuelve largo cero, que es hierba normal y corriente.
 */
export function tiradaDe(bits: number): { largo: number; primero: number } | null {
  let cuantos = 0;
  for (let k = 0; k < 6; k++) if ((bits & (1 << k)) !== 0) cuantos++;
  if (cuantos === 0) return { largo: 0, primero: 0 };
  if (cuantos > 4) return null;

  let primero = -1;
  let arranques = 0;
  for (let k = 0; k < 6; k++) {
    if ((bits & (1 << k)) === 0) continue;
    const antes = (k + 5) % 6;
    if ((bits & (1 << antes)) !== 0) continue;
    arranques++;
    primero = k;
  }
  /* Más de un arranque significa dos tiradas separadas, y eso no tiene pieza. */
  if (arranques !== 1) return null;
  return { largo: cuantos, primero };
}

/**
 * LA TIRADA MÁS LARGA DE UN PATRÓN QUE NO TIENE PIEZA.
 *
 * ═══ EL ISTMO DE UNA TESELA ═══
 *
 * Medido sobre sesenta tableros: de las 63 formas posibles, las únicas que aparecen y
 * no se pueden dibujar son `{0,3}` y `{1,4}` — agua en dos lados OPUESTOS. Es una
 * lengua de tierra de UNA tesela de ancho con mar a los dos costados, y ninguna pieza
 * del pack puede enseñar dos playas enfrentadas: sus cuatro costas dibujan tramos
 * CONTIGUOS de uno a cuatro lados, no dos tramos sueltos.
 *
 * Salían tres en sesenta tableros. Pocas, pero el síntoma era el peor posible: la
 * tesela se quedaba SIN pieza de costa y se dibujaba como hierba corriente, o sea un
 * agujero en la línea de agua — exactamente el fallo del «río con orilla a ratos», en
 * pequeño y en otro sitio.
 *
 * ═══ POR QUÉ SE QUEDA LA TIRADA MÁS LARGA Y NO SE INUNDA LA TESELA ═══
 *
 * Inundarla sería lo natural —un istmo de un paso lo borra la erosión— pero el agua ya
 * se cerró morfológicamente mucho antes, y volver a tocarla aquí es reabrir un bucle
 * que costó converger. Y peor: algunas de esas lenguas son justo el delantal que le da
 * suelo a un vértice del tablero, así que inundarlas devolvería el fallo que el
 * delantal vino a arreglar.
 *
 * Así que se dibuja la playa del lado que más agua tiene y el otro se queda sin ella.
 * Es una concesión, y se nota si alguien va a buscarla: una tesela cada veinte
 * tableros con playa en un costado y hierba hasta el borde en el otro. Frente a la
 * alternativa —sin playa por ninguno— es estrictamente mejor, y frente a mover el agua
 * es infinitamente más barato.
 */
function tiradaMasLarga(bits: number): number {
  /*
   * LOS SEIS LADOS CON AGUA no tienen arranque: no hay ningún lado seco detrás del cual
   * empiece la tirada, así que el bucle de abajo no encontraría ninguno y devolvería
   * cero. Es una tesela de tierra rodeada de agua por completo, o sea una isla de una
   * sola tesela. No sale en sesenta tableros, pero devolver `null` por un caso que
   * «no puede pasar» es la forma habitual de que pase.
   */
  if (bits === 0b111111) return 0b001111;

  let mejor = 0;
  let mejorLargo = 0;
  for (let inicio = 0; inicio < 6; inicio++) {
    /* Sólo cuentan los arranques: un lado con agua cuyo anterior no la tiene. */
    if ((bits & (1 << inicio)) === 0) continue;
    if ((bits & (1 << ((inicio + 5) % 6))) !== 0) continue;
    let largo = 0;
    let tramo = 0;
    for (let k = 0; k < 6; k++) {
      const lado = (inicio + k) % 6;
      if ((bits & (1 << lado)) === 0) break;
      /* La costa más ancha del pack cubre CUATRO lados; de ahí no se pasa. */
      if (largo === 4) break;
      tramo |= 1 << lado;
      largo++;
    }
    /* Desempate por el lado más bajo, para que sea reproducible. */
    if (largo > mejorLargo) {
      mejorLargo = largo;
      mejor = tramo;
    }
  }
  return mejor;
}

/**
 * LA TESELA DE COSTA que corresponde a un conjunto de lados con agua.
 *
 * Los «primeros canónicos» están MEDIDOS sobre los `.gltf`, no supuestos: la A trae
 * su agua en el lado 5 y las otras tres en el 4. Girar `60·(primero − canónico)` lleva
 * la tirada a donde toca.
 *
 * `hex_coast_E` no aparece aquí, y no es un olvido: no tiene ni un triángulo de agua,
 * y su firma de arena corresponde a una configuración que en una malla hexagonal no
 * puede darse — toda tesela que recibe playa de un vecino toca ella misma esa agua.
 * Se cerraron dieciocho costas distintas sin ella y con cero fallos.
 */
export function piezaDeOrilla(bits: number): { modelo: string; giro: number } | null {
  const tirada = tiradaDe(bits) ?? tiradaDe(tiradaMasLarga(bits));
  if (tirada === null || tirada.largo === 0) return null;
  const cuales = [
    { modelo: 'orilla-a', canonico: 5 },
    { modelo: 'orilla-b', canonico: 4 },
    { modelo: 'orilla-c', canonico: 4 },
    { modelo: 'orilla-d', canonico: 4 },
  ];
  const cual = cuales[tirada.largo - 1];
  if (cual === undefined) return null;
  return {
    modelo: cual.modelo,
    giro: ((((tirada.primero - cual.canonico) % 6) + 6) % 6) * (Math.PI / 3),
  };
}
