/**
 * EL PEÓN Y EL AVENTURERO: la máquina pura del que anda por las casillas.
 *
 * ═══ POR QUÉ ES PURA, CON EL RELOJ Y LA SEMILLA POR FUERA ═══
 *
 * Hermana de `escenas/embarcadero/gestos.ts` y por la misma razón: un aventurero clavado
 * en T-pose, o uno que atraviesa la plaza para ir a la Mazmorra, o uno que tarda veinte
 * segundos en dar la vuelta al anillo, no dan ningún error; se ven. La única forma de
 * prometer que no pasa es que la función que decide el clip y la posición sea pura y se
 * pueda recorrer en Node diez mil pasos con sucesos al azar. El «ahora» entra por
 * parámetro; el azar de los gestos de espera es una semilla que viaja en el estado.
 *
 * ═══ QUÉ ES CADA COSA ═══
 *
 * Cada asiento tiene un PEÓN (una instancia teñida) SIEMPRE en su hueco de casilla, y un
 * AVENTURERO (el de KayKit del Muelle) que sólo está en pie mientras le toca mover
 * (decisión 11: uno en el tablero a la vez). Esta máquina es la de UN asiento: recibe los
 * sucesos de la mesa que le tocan (`encolar`), los reproduce en orden (`avanzar`) y dice
 * en cada fotograma qué clip suena (`clipQueToca`), dónde está el aventurero
 * (`posicionYRumbo`) y dónde está el peón (`posicionDelPeon`). Quién coordina que el
 * aventurero de OTRO asiento se despida antes de que nazca éste es `Burgo.tsx`, con
 * `despedir`.
 *
 * ═══ LAS FASES Y SUS TIEMPOS, CON LOS CLIPS COMO SON ═══
 *
 *     quieto       → en su hueco; `reposo-a` y un gesto cada 6–11 s (`reposo-b` o `saludar`)
 *     apareciendo  → `aparecer` (1,3): nace en su hueco, 1,2 hacia el solar; el peón se hunde
 *     recogiendo   → `recoger` cortado a 0,6: coge el peón, que desaparece
 *     andando      → `andar` a 48 u/s (≤ 3 casillas); hacia atrás con `timeScale −1` si retrocede
 *     corriendo    → `correr` a 96 u/s (4 o más); UNA sola cota: ningún recorrido dura más de 8 s
 *     viajando     → `usar` 1,6 (brilla el naipe), se desvanece 0,4, `aparecer` en el destino
 *     saltando     → `salto` (1,167); en lo alto el peón reaparece cayendo 0,8 con `reboteDelDado`
 *     cobrando     → `recoger` cortado a 0,9 (las monedas vuelan aparte, en `coreografia.ts`)
 *     pagando      → `lanzar` cortado a 0,6 y el resto quieto: 0,9
 *     alzando      → `usar` mientras brotan las casas: 0,45 por casa
 *     preso        → `golpe`, se desvanece, la reja sube, `aparecer` en el hueco de preso,
 *                    la reja baja (≈ 3,5 s); desde la 30, entre el golpe y el desvanecerse,
 *                    `correr` 0,8 hasta la celda del cuartel (≈ 4,4 s); después encerrado,
 *                    con `golpe` contra la reja si sigue
 *     quebrando    → `golpe`, `correr` 72 unidades hacia FUERA cruzando su solar y se desvanece
 *     despidiendose→ 0,4 s de `reposo-a` encogiendo a escala 0 (un aventurero fundido no tiene opacidad)
 *
 * Las duraciones de los clips son las de `DURACION` de `gestos.ts`, medidas por el
 * compilador. Las velocidades salen de `PASO_POR_SEGUNDO` (4) de `escala.ts` multiplicado
 * por `VECES_LA_MARCHA_A_PIE` (12): 48 u/s andando y 96 corriendo. La razón está entera en
 * el comentario de esas constantes, y no es un capricho: con la casilla en 72 de frente, a
 * paso de persona un turno duraría minutos. Un tramo entre laterales mide 72 (1,5 s
 * andando); el que llega a una esquina o sale de ella, 61,5.
 *
 * ═══ LA COTA DE LOS 8 SEGUNDOS, Y LO QUE PASA CON LOS PIES ═══
 *
 * Doce casillas por los lados son 864 unidades: 9 s a 96 u/s. La cota manda: el aventurero
 * recorre lo que haga falta en 8 s, y el clip sube hasta `TOPE_DE_VELOCIDAD` (1,5) y no más,
 * así que en el peor caso corre a 108 u/s con el clip a 1,125. Se prefiere eso a un turno
 * que dura más de lo que la mesa espera. Andando, la cota es de `TOPE_POR_CASILLA_ANDANDO`
 * (2,25 s) por casilla, y con la velocidad nueva ni se roza: tres casillas son 4,5 s.
 *
 * ═══ A LA MAZMORRA SIN PISAR CASILLAS ═══
 *
 * No hay viaje por la plaza: `golpe` donde está, se desvanece, y aparece dentro de la
 * celda. Es más barato, más claro, y no cruza edificios. `verify:burgo-escena` afirma que
 * en toda la transición la posición está en la casilla de origen o en la Mazmorra.
 *
 * Con UNA excepción, y es la casilla que manda: quien cae en ¡A comisaría! (la 30) no se
 * desvanece en su sitio. Corre a la celda del cuartel que hay en esa misma esquina —cruza la
 * avenida por su paso, llega a la puerta y entra, bajo la reja subida— y se desvanece dentro.
 * Sigue sin pisar otra casilla, porque la celda está en la 30. El camino lo declara el anillo
 * (`pasoHaciaLaCelda`, `puertaDeLaCelda`, `dentroDeLaCelda`), y el comprobador mide que no
 * atraviese ninguna obra ni ninguna pieza.
 *
 * ═══ SIN `three` ═══
 *
 * El `giroCorto` de `escenas/aventureros/marioneta.ts` es el que se quiere, pero ese
 * fichero importa `three` y éste no puede: es la misma resta de cinco líneas, copiada
 * aquí con su nombre. Las curvas de aquí sí pueden usar `Math.sin`: esto es `escenas/`.
 */
import { CLIP } from '../embarcadero/figuras';
import type { NombreDeClip } from '../embarcadero/figuras';
import { DURACION } from '../embarcadero/gestos';
import { amortiguado } from '../embarcadero/camara';
import { PASO_POR_SEGUNDO } from '../escala';
import { ASENTAR, reboteDelDado } from '../dados';
import type { SucesoDelBurgo } from '../../shared/arcade/juegos/burgo';
import { ANILLO_DEL_BURGO, A_LA_MAZMORRA, MAZMORRA, PUERTA_MAYOR } from './anillo-en-3d';
import type { AnilloEn3D, Punto } from './anillo-en-3d';

export type FaseDelPeon =
  | 'quieto'
  | 'apareciendo'
  | 'recogiendo'
  | 'andando'
  | 'corriendo'
  | 'viajando'
  | 'saltando'
  | 'cobrando'
  | 'pagando'
  | 'alzando'
  | 'preso'
  | 'quebrando'
  | 'despidiendose';

/** Un gesto de espera o de protesta en curso. */
export interface GestoDelPeon {
  readonly clip: NombreDeClip;
  readonly desde: number;
  readonly dura: number;
}

export interface EstadoDelPeon {
  readonly fase: FaseDelPeon;
  /** Cuándo entró en la fase. */
  readonly desde: number;
  /** Casillas que quedan por pisar. */
  readonly camino: readonly number[];
  readonly enCasilla: number;
  readonly haciaCasilla: number;
  /** 0..1 dentro del tramo. */
  readonly u: number;
  /** Sucesos pendientes de animar, en orden. */
  readonly cola: readonly SucesoDelBurgo[];
  readonly semilla: number;

  /* Lo que la parte 2 del diseño no escribe y la máquina necesita para colocar y para seguir. */
  /** Índice de asiento (0..5): decide el hueco. */
  readonly asiento: number;
  /** El aventurero está en pie en el tablero. */
  readonly enPie: boolean;
  readonly presa: boolean;
  readonly quebrada: boolean;
  /** Cómo va el recorrido en curso. */
  readonly como: 'anda' | 'viaja' | 'retrocede';
  /** Lo que mide el recorrido en curso y cuánto dura. */
  readonly largo: number;
  readonly dura: number;
  /** El `timeScale` del clip de marcha. Negativo al retroceder. */
  readonly velocidad: number;
  /** El rumbo actual del aventurero, amortiguado. */
  readonly rumbo: number;
  /** Cuándo se cruzó la Puerta Mayor en este recorrido, para el saludo superpuesto; `null` si no. */
  readonly saludoDesde: number | null;
  readonly porLaPuertaMayor: boolean;
  /** El gesto en curso mientras espera o está preso. */
  readonly gesto: GestoDelPeon | null;
  readonly proximoGesto: number;
  /** La variante del salto: al llegar, o al salir de la Mazmorra (la reja sube antes). */
  readonly salto: 'llegada' | 'salida';
  /** Cuántas casas brotan (para `alzando`). */
  readonly casas: number;
  /** La casilla desde la que arrancó el recorrido en curso; `null` si no anda. */
  readonly origen: number | null;
}

/* ─────────────────────────────── Los tiempos ─────────────────────────────── */

/**
 * LA MARCHA POR EL TABLERO NO ES LA MARCHA DE UNA PERSONA, Y ESTO ESTÁ MEDIDO.
 *
 * `PASO_POR_SEGUNDO` (4) es lo que anda un aventurero de 2,543 unidades por la CALLE, y ahí
 * se queda: dentro de la ciudad se pasea a esa velocidad. Pero una casilla del tablero mide
 * ahora 72 de frente, y 72 a 4 u/s son DIECIOCHO SEGUNDOS por casilla; doce casillas serían
 * tres minutos y medio de turno. El tope de 8 s por recorrido que este fichero ya vigila lo
 * cortaría, sí, pero cortándolo el clip se aceleraría trece veces y los pies patinarían.
 *
 * Se barajaron las tres salidas que hay:
 *
 *  1. SUBIR LA VELOCIDAD DE LA MARCHA EN EL TABLERO. Es la que se toma: ×12, o sea 48 u/s
 *     andando y 96 corriendo. Los pies patinan —el clip corre a su paso natural mientras la
 *     figura cubre doce veces más suelo—, y la pregunta buena es cuántos PÍXELES mide ese
 *     patinazo. Medido: mientras dura un recorrido la cámara sigue al que mueve a cercanía
 *     0,42, o sea encuadrando un radio de 239,5 unidades; en un PC de 1.920 eso son 4,0 px
 *     por unidad y el aventurero mide 10,2 px de alto, con los pies en poco más de uno. En un
 *     móvil, 2,1 px enteros. A ese tamaño el ciclo de piernas se lee como movimiento y el
 *     deslizamiento no se ve. Una ficha de tablero se desliza: eso es lo que es.
 *  2. QUE LA FICHA VIAJE EN COCHE. Es lo más bonito y no se puede hoy: el pack trae CINCO
 *     coches y las mesas son de SEIS asientos, y los coches del City Builder llevan el color
 *     horneado en el atlas y no tienen máscara de tinte, así que dos jugadores compartirían
 *     modelo y color. Repartir seis figuras entre cinco modelos es exactamente el fallo que
 *     este árbol ya tiene anotado con los colores de peón. Además pide una fase nueva aquí y
 *     una rama en `Burgo.tsx`. Queda anotado para cuando haya seis coches teñibles.
 *  3. ACHICAR LA CASILLA. La descarta la orden: la ciudad tiene que ser nueve veces la de
 *     antes, y el anillo va alrededor de la ciudad.
 *
 * Con ×12 los tiempos salen así, y ninguno toca el tope salvo el peor de todos:
 *
 *     1 casilla   (72) ..... 1,50 s     7 casillas (504, la tirada media) ... 5,25 s
 *     2 casillas (144) ..... 3,00 s     12 casillas (864, el máximo) ........ 9,00 s → 8,00 por el tope
 *     3 casillas (216) ..... 4,50 s     y ahí el clip sube a 1,125, lejos del 1,5
 */
export const VECES_LA_MARCHA_A_PIE = 12;
export const VELOCIDAD_ANDANDO = PASO_POR_SEGUNDO * VECES_LA_MARCHA_A_PIE;
export const VELOCIDAD_CORRIENDO = VELOCIDAD_ANDANDO * 2;
/** Hasta tres casillas se anda; con cuatro o más se corre. */
export const CASILLAS_ANDANDO = 3;
/** Ningún recorrido dura más de esto. */
export const TOPE_DEL_RECORRIDO = 8;
/** Andando, cada casilla puede llevar como mucho esto: tres casillas con dos esquinas en 6,75. */
export const TOPE_POR_CASILLA_ANDANDO = 2.25;
/** El clip no se acelera más de esto. */
export const TOPE_DE_VELOCIDAD = 1.5;
export const CORTE_DEL_RECOGER = 0.6;
export const DURACION_DEL_COBRO = 0.9;
export const CORTE_DEL_LANZAR = 0.6;
export const DURACION_DEL_PAGO = 0.9;
export const POR_CASA_ALZADA = 0.45;
export const DESVANECER = 0.4;
export const DESVANECER_AL_QUEBRAR = 0.8;
export const PASO_DE_LA_REJA = 0.6;
/**
 * Lo que tarda en correr de su sitio de la 30 a la celda del cuartel: 0,8, que es el tope de
 * TODA animación de casilla (Miguel: «las animaciones siempre deben ser muy breves»). El camino
 * mide de 88 a 106,5 según el asiento, así que va a entre 110 y 133 u/s: el clip de correr, a
 * entre 1,14 y 1,39, algo más deprisa que su paso y dentro del tope de 1,5.
 */
export const A_LA_CELDA = 0.8;
/** En cuántas unidades de camino gira: al arrancar, y en cada vértice del camino. */
export const GIRO_EN_EL_CAMINO = 4;
export const DURACION_DE_LA_DESPEDIDA = 0.4;
export const HUNDIDO_DEL_PEON = 0.4;
export const TIEMPO_DE_HUNDIRSE = 0.3;
export const CAIDA_DEL_PEON = 0.8;
export const TUMBARSE = 0.4;
export const SALUDO_AL_PASAR = 0.6;
/** Cuánto corre hacia fuera al quebrar, en unidades: un ancho de casilla, o sea 0,75 s a 96 u/s. */
export const HUIDA_AL_QUEBRAR = 72;
/** Entre 6 y 11 s hasta el siguiente gesto de espera. */
export const ESPERA_DEL_GESTO = { desde: 6, hasta: 11 } as const;
/** El amortiguado del giro en las esquinas. */
export const AMORTIGUACION_DEL_GIRO = 8;

/* ─────────────────────────────── El sorteo ─────────────────────────────── */

/** Un paso de mulberry32: la siguiente fracción y la semilla que la sigue. */
function sortea(semilla: number): { readonly u: number; readonly siguiente: number } {
  const siguiente = (semilla + 0x6d2b_79f5) >>> 0;
  let t = siguiente;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { u: ((t ^ (t >>> 14)) >>> 0) / 4294967296, siguiente };
}

const esperaSorteada = (u: number): number => ESPERA_DEL_GESTO.desde + (ESPERA_DEL_GESTO.hasta - ESPERA_DEL_GESTO.desde) * u;
/** `reposo-b` el 70 %, `saludar` el 30 %. */
const gestoSorteado = (u: number): NombreDeClip => (u < 0.7 ? CLIP.reposoB : CLIP.saludar);

/** La resta corta entre dos ángulos, en (−π, π]. Copia de `marioneta.ts`, que importa `three`. */
export function giroCorto(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/* ───────────────────────────────── Nacer ───────────────────────────────── */

export function nacer(casilla: number, semilla: number, ahora: number, asiento = 0): EstadoDelPeon {
  const s = sortea(semilla >>> 0);
  return {
    fase: 'quieto',
    desde: ahora,
    camino: [],
    enCasilla: casilla,
    haciaCasilla: casilla,
    u: 0,
    cola: [],
    semilla: s.siguiente,
    asiento,
    enPie: false,
    presa: false,
    quebrada: false,
    como: 'anda',
    largo: 0,
    dura: 0,
    velocidad: 1,
    rumbo: 0,
    saludoDesde: null,
    porLaPuertaMayor: false,
    gesto: null,
    proximoGesto: ahora + esperaSorteada(s.u),
    salto: 'llegada',
    casas: 0,
    origen: null,
  };
}

/* ─────────────────────────── Lo que se puede animar ─────────────────────────── */

/** Los sucesos que esta máquina reproduce; el resto se descartan al encolar. */
export function esSucesoDelPeon(s: SucesoDelBurgo): boolean {
  switch (s.que) {
    case 'mueve':
    case 'cobra':
    case 'paga':
    case 'alza':
    case 'a-la-mazmorra':
    case 'sale-de-la-mazmorra':
    case 'sigue-presa':
    case 'quiebra':
      return true;
    default:
      return false;
  }
}

/** Los sucesos entran por el final. Los que no son de esta máquina se dejan fuera. */
export function encolar(e: EstadoDelPeon, sucesos: readonly SucesoDelBurgo[]): EstadoDelPeon {
  const mios = sucesos.filter(esSucesoDelPeon);
  return mios.length === 0 ? e : { ...e, cola: [...e.cola, ...mios] };
}

/* ─────────────────────────── El recorrido, medido ─────────────────────────── */

/** Lo que mide un recorrido sobre la polilínea, de `desde` por cada casilla de `recorrido`. */
export function largoDelRecorrido(anillo: AnilloEn3D, desde: number, recorrido: readonly number[]): number {
  let largo = 0;
  let anterior = desde;
  for (const c of recorrido) {
    const a = anillo.polilinea[anterior];
    const b = anillo.polilinea[c];
    if (a !== undefined && b !== undefined) largo += Math.hypot(b.x - a.x, b.z - a.z);
    anterior = c;
  }
  return largo;
}

/** Cuánto dura un recorrido de `largo` unidades y `casillas` pisadas: velocidad por casillas y la cota. */
export function duracionDelRecorrido(largo: number, casillas: number, como: 'anda' | 'viaja' | 'retrocede'): number {
  if (como === 'viaja') return DURACION.usar + DESVANECER + DURACION.aparecer;
  const corre = como === 'anda' && casillas > CASILLAS_ANDANDO;
  const velocidad = corre ? VELOCIDAD_CORRIENDO : VELOCIDAD_ANDANDO;
  const cota = corre ? TOPE_DEL_RECORRIDO : Math.min(TOPE_DEL_RECORRIDO, casillas * TOPE_POR_CASILLA_ANDANDO);
  return Math.max(0.05, Math.min(largo / velocidad, cota));
}

/** El `timeScale` del clip de marcha para cubrir `largo` en `dura`: nunca más de 1,5; negativo al retroceder. */
export function velocidadDelClip(largo: number, dura: number, como: 'anda' | 'viaja' | 'retrocede', casillas: number): number {
  const corre = como === 'anda' && casillas > CASILLAS_ANDANDO;
  const base = corre ? VELOCIDAD_CORRIENDO : VELOCIDAD_ANDANDO;
  const real = dura > 0 ? largo / dura : base;
  const escala = Math.min(TOPE_DE_VELOCIDAD, Math.max(0.5, real / base));
  return como === 'retrocede' ? -escala : escala;
}

/** Lo que dura entero un `mueve`: aparecer (si hace falta), recoger, el recorrido y el salto. Lo lee `coreografia.ts`. */
export function duracionDelMovimiento(s: Extract<SucesoDelBurgo, { que: 'mueve' }>, enPie: boolean, anillo: AnilloEn3D = ANILLO_DEL_BURGO): number {
  const largo = largoDelRecorrido(anillo, s.desde, s.recorrido);
  const recorrido = duracionDelRecorrido(largo, s.recorrido.length, s.como);
  const salto = s.como === 'viaja' ? 0 : DURACION.salto;
  return (enPie ? 0 : DURACION.aparecer) + CORTE_DEL_RECOGER + recorrido + salto;
}

/* ─────────────────────────── La celda del cuartel ─────────────────────────── */

/** ¿Le mandan desde la casilla que tiene la celda? Entonces corre a ella antes de desvanecerse. */
export function pasaPorLaCelda(desde: number): boolean {
  return desde === A_LA_MAZMORRA;
}

/** El camino de la 30 a la celda: su sitio, el paso por el que cruza a la avenida, la puerta y dentro. */
export function caminoALaCelda(anillo: AnilloEn3D, asiento: number): readonly Punto[] {
  return [anillo.huecoDeAventurero(A_LA_MAZMORRA, asiento), anillo.pasoHaciaLaCelda, anillo.puertaDeLaCelda, anillo.dentroDeLaCelda];
}

/** Los tramos de ese camino, con lo que mide cada uno y hacia dónde va. */
function tramosDelCamino(puntos: readonly Punto[]): { readonly de: Punto; readonly a: Punto; readonly largo: number; readonly rumbo: number }[] {
  const tramos: { readonly de: Punto; readonly a: Punto; readonly largo: number; readonly rumbo: number }[] = [];
  for (let k = 1; k < puntos.length; k++) {
    const de = puntos[k - 1] as Punto;
    const a = puntos[k] as Punto;
    tramos.push({ de, a, largo: Math.hypot(a.x - de.x, a.z - de.z), rumbo: Math.atan2(a.x - de.x, a.z - de.z) });
  }
  return tramos;
}

/** Lo que mide ese camino. */
export function largoDelCaminoALaCelda(anillo: AnilloEn3D, asiento: number): number {
  return tramosDelCamino(caminoALaCelda(anillo, asiento)).reduce((suma, t) => suma + t.largo, 0);
}

/** El `timeScale` del clip de correr para cubrir `largo` en `A_LA_CELDA`: nunca más del tope. */
export function velocidadALaCelda(largo: number): number {
  return Math.min(TOPE_DE_VELOCIDAD, Math.max(0.5, largo / A_LA_CELDA / VELOCIDAD_CORRIENDO));
}

/**
 * Dónde va y hacia dónde mira a `u` (0..1) del camino a la celda, a paso constante. El rumbo gira
 * en `GIRO_EN_EL_CAMINO` unidades al arrancar —desde `rumboAlArrancar`, el que traía— y otras
 * tantas alrededor de cada vértice, centradas en él: sin eso daría la vuelta en un fotograma. Un
 * tramo de largo cero no gira a nadie, que su `atan2(0, 0)` no es un rumbo.
 */
export function enElCaminoALaCelda(anillo: AnilloEn3D, asiento: number, u: number, rumboAlArrancar: number): { readonly x: number; readonly z: number; readonly rumbo: number } {
  const tramos = tramosDelCamino(caminoALaCelda(anillo, asiento));
  const total = tramos.reduce((suma, t) => suma + t.largo, 0);
  const recorrido = Math.min(1, Math.max(0, u)) * total;
  const ultimo = tramos[tramos.length - 1];
  let x = ultimo === undefined ? 0 : ultimo.a.x;
  let z = ultimo === undefined ? 0 : ultimo.a.z;
  let rumbo = rumboAlArrancar;
  let acumulado = 0;
  let colocado = false;
  tramos.forEach((t, k) => {
    if (t.largo > 0) {
      /* El primero gira desde que arranca; los demás, a caballo de su vértice. */
      const desde = k === 0 ? 0 : acumulado - GIRO_EN_EL_CAMINO / 2;
      rumbo += giroCorto(rumbo, t.rumbo) * Math.min(1, Math.max(0, (recorrido - desde) / GIRO_EN_EL_CAMINO));
    }
    if (!colocado && (recorrido <= acumulado + t.largo || k === tramos.length - 1)) {
      const f = t.largo > 0 ? Math.min(1, Math.max(0, (recorrido - acumulado) / t.largo)) : 1;
      x = t.de.x + (t.a.x - t.de.x) * f;
      z = t.de.z + (t.a.z - t.de.z) * f;
      colocado = true;
    }
    acumulado += t.largo;
  });
  return { x, z, rumbo };
}

/* ─────────────────────────────── Las etapas ─────────────────────────────── */

export interface Etapa {
  readonly nombre: string;
  readonly dura: number;
}

/** Las etapas de una fase con varias, en orden. Vacío si la fase no se compone. */
export function etapasDe(e: EstadoDelPeon): readonly Etapa[] {
  switch (e.fase) {
    case 'viajando':
      return [
        { nombre: 'usar', dura: DURACION.usar },
        { nombre: 'desvanecer', dura: DESVANECER },
        { nombre: 'aparecer', dura: DURACION.aparecer },
      ];
    case 'saltando':
      return e.salto === 'salida'
        ? [
            { nombre: 'reja-sube', dura: PASO_DE_LA_REJA },
            { nombre: 'salto', dura: DURACION.salto },
          ]
        : [{ nombre: 'salto', dura: DURACION.salto }];
    case 'preso':
      return [
        { nombre: 'golpe', dura: DURACION.golpe },
        /* Desde la 30, antes de desvanecerse corre a la celda del cuartel. */
        ...(pasaPorLaCelda(e.enCasilla) ? [{ nombre: 'a-la-celda', dura: A_LA_CELDA }] : []),
        { nombre: 'desvanecer', dura: DESVANECER },
        { nombre: 'reja-sube', dura: PASO_DE_LA_REJA },
        { nombre: 'aparecer', dura: DURACION.aparecer },
        { nombre: 'reja-baja', dura: PASO_DE_LA_REJA },
      ];
    case 'quebrando':
      return [
        { nombre: 'golpe', dura: DURACION.golpe },
        { nombre: 'huida', dura: HUIDA_AL_QUEBRAR / VELOCIDAD_CORRIENDO },
      ];
    default:
      return [];
  }
}

/** Cuánto dura la fase entera, o `null` si no termina sola (quieto, preso ya encerrado). */
export function duracionDeLaFase(e: EstadoDelPeon): number | null {
  switch (e.fase) {
    case 'quieto':
      return null;
    case 'apareciendo':
      return DURACION.aparecer;
    case 'recogiendo':
      return CORTE_DEL_RECOGER;
    case 'andando':
    case 'corriendo':
      return e.dura;
    case 'cobrando':
      return DURACION_DEL_COBRO;
    case 'pagando':
      return DURACION_DEL_PAGO;
    case 'alzando':
      return Math.max(POR_CASA_ALZADA, POR_CASA_ALZADA * e.casas);
    case 'despidiendose':
      return DURACION_DE_LA_DESPEDIDA;
    case 'preso':
      /* La entrada dura sus etapas; encerrado, no termina sola. */
      return e.enPie ? etapasDe(e).reduce((a, b) => a + b.dura, 0) : null;
    default:
      return etapasDe(e).reduce((a, b) => a + b.dura, 0);
  }
}

/** En qué etapa está y cuánto lleva en ella. Pasadas todas, la última con `u = 1`. */
export function etapaActual(e: EstadoDelPeon, ahora: number): { readonly nombre: string; readonly t: number; readonly u: number; readonly desde: number } {
  const etapas = etapasDe(e);
  let desde = e.desde;
  const ultima = etapas[etapas.length - 1];
  if (ultima === undefined) return { nombre: e.fase, t: ahora - e.desde, u: 1, desde: e.desde };
  for (const etapa of etapas) {
    if (ahora < desde + etapa.dura) return { nombre: etapa.nombre, t: ahora - desde, u: Math.max(0, (ahora - desde) / etapa.dura), desde };
    desde += etapa.dura;
  }
  return { nombre: ultima.nombre, t: ultima.dura, u: 1, desde: desde - ultima.dura };
}

/* ─────────────────────────────── Transiciones ─────────────────────────────── */

function entraEn(e: EstadoDelPeon, fase: FaseDelPeon, ahora: number, mas: Partial<EstadoDelPeon> = {}): EstadoDelPeon {
  const s = sortea(e.semilla);
  return { ...e, ...mas, fase, desde: ahora, gesto: null, semilla: s.siguiente, proximoGesto: ahora + esperaSorteada(s.u) };
}

/** El recorrido de un `mueve` empieza: andando, corriendo o viajando, con sus medidas. */
function empiezaElRecorrido(e: EstadoDelPeon, anillo: AnilloEn3D, s: Extract<SucesoDelBurgo, { que: 'mueve' }>, ahora: number): EstadoDelPeon {
  const largo = largoDelRecorrido(anillo, s.desde, s.recorrido);
  const dura = duracionDelRecorrido(largo, s.recorrido.length, s.como);
  const primera = s.recorrido[0] ?? s.hasta;
  const comun: Partial<EstadoDelPeon> = {
    camino: s.recorrido,
    enCasilla: s.desde,
    haciaCasilla: primera,
    u: 0,
    como: s.como,
    largo,
    dura,
    velocidad: velocidadDelClip(largo, dura, s.como, s.recorrido.length),
    porLaPuertaMayor: s.porLaPuertaMayor,
    saludoDesde: null,
    rumbo: anillo.rumboDeLaMarcha(s.desde),
    casas: 0,
  };
  if (s.como === 'viaja') return entraEn(e, 'viajando', ahora, { ...comun, camino: [s.hasta], haciaCasilla: s.hasta });
  const corre = s.como === 'anda' && s.recorrido.length > CASILLAS_ANDANDO;
  return entraEn(e, corre ? 'corriendo' : 'andando', ahora, comun);
}

/** El primer suceso de la cola arranca. La cola ya viene sin él. */
function arranca(e: EstadoDelPeon, anillo: AnilloEn3D, s: SucesoDelBurgo, ahora: number): EstadoDelPeon {
  switch (s.que) {
    case 'mueve': {
      /* Quien sale de la Mazmorra por la marcha ya no es presa. Sin aventurero en pie, nace primero; el recorrido espera en la cola. */
      const suelto = e.presa ? { ...e, presa: false } : e;
      if (!suelto.enPie) return entraEn(suelto, 'apareciendo', ahora, { enPie: true, cola: [s, ...suelto.cola], enCasilla: s.desde, rumbo: anillo.rumboDeLaMarcha(s.desde) });
      return entraEn(suelto, 'recogiendo', ahora, { cola: [s, ...suelto.cola], enCasilla: s.desde });
    }
    case 'cobra':
      return entraEn(e, 'cobrando', ahora);
    case 'paga':
      return entraEn(e, 'pagando', ahora);
    case 'alza':
      return entraEn(e, 'alzando', ahora, { casas: s.casas === 5 ? 2 : 1 });
    case 'a-la-mazmorra': {
      const preso: Partial<EstadoDelPeon> = { enPie: true, presa: true, enCasilla: s.desde, haciaCasilla: MAZMORRA, camino: [MAZMORRA], u: 0 };
      if (!pasaPorLaCelda(s.desde)) return entraEn(e, 'preso', ahora, preso);
      /* Desde la 30 corre a la celda: el largo y el paso del clip, medidos una vez aquí. */
      const largo = largoDelCaminoALaCelda(anillo, e.asiento);
      return entraEn(e, 'preso', ahora, { ...preso, largo, velocidad: velocidadALaCelda(largo) });
    }
    case 'sale-de-la-mazmorra':
      return entraEn(e, 'saltando', ahora, { salto: 'salida', presa: false, enPie: true, enCasilla: MAZMORRA, haciaCasilla: MAZMORRA, camino: [], u: 0 });
    case 'sigue-presa':
      return { ...e, gesto: { clip: CLIP.golpe, desde: ahora, dura: DURACION.golpe } };
    case 'quiebra':
      return entraEn(e, 'quebrando', ahora, { enPie: true, rumbo: Math.atan2(anillo.fuera(e.enCasilla).x, anillo.fuera(e.enCasilla).z) });
    default:
      return e;
  }
}

/** Lo que pasa cuando una fase termina sola. */
function termina(e: EstadoDelPeon, anillo: AnilloEn3D, ahora: number): EstadoDelPeon {
  switch (e.fase) {
    case 'apareciendo': {
      const [s, ...resto] = e.cola;
      if (s !== undefined && s.que === 'mueve') return entraEn(e, 'recogiendo', ahora, { cola: [s, ...resto] });
      return entraEn(e, 'quieto', ahora);
    }
    case 'recogiendo': {
      const [s, ...resto] = e.cola;
      if (s !== undefined && s.que === 'mueve') return empiezaElRecorrido({ ...e, cola: resto }, anillo, s, ahora);
      return entraEn(e, 'quieto', ahora);
    }
    case 'andando':
    case 'corriendo': {
      const ultima = e.camino[e.camino.length - 1] ?? e.haciaCasilla;
      return entraEn(e, 'saltando', ahora, { salto: 'llegada', enCasilla: ultima, haciaCasilla: ultima, camino: [], u: 1, saludoDesde: null });
    }
    case 'viajando': {
      const ultima = e.camino[e.camino.length - 1] ?? e.haciaCasilla;
      return entraEn(e, 'quieto', ahora, { enCasilla: ultima, haciaCasilla: ultima, camino: [], u: 0 });
    }
    case 'saltando':
      return entraEn(e, 'quieto', ahora, { u: 0 });
    case 'preso':
      /* Entró: se queda encerrado, sin aventurero en pie (el que anda es otro). */
      return entraEn(e, 'preso', ahora, { enPie: false, enCasilla: MAZMORRA, haciaCasilla: MAZMORRA, camino: [], u: 0 });
    case 'quebrando':
      return entraEn(e, 'quieto', ahora, { enPie: false, quebrada: true });
    case 'despidiendose':
      return entraEn(e, 'quieto', ahora, { enPie: false });
    default:
      return entraEn(e, 'quieto', ahora);
  }
}

/** ¿Está la máquina libre para arrancar el siguiente suceso? */
function libre(e: EstadoDelPeon): boolean {
  return e.fase === 'quieto' || (e.fase === 'preso' && !e.enPie);
}

/** Los gestos de espera: sortear, cerrar, y no solaparse. */
function gestos(e: EstadoDelPeon, ahora: number): EstadoDelPeon {
  if (e.gesto !== null) {
    if (ahora - e.gesto.desde < e.gesto.dura) return e;
    const s = sortea(e.semilla);
    return { ...e, gesto: null, semilla: s.siguiente, proximoGesto: ahora + esperaSorteada(s.u) };
  }
  if (!e.enPie || e.fase !== 'quieto' || ahora < e.proximoGesto) return e;
  const s = sortea(e.semilla);
  const clip = gestoSorteado(s.u);
  return { ...e, gesto: { clip, desde: ahora, dura: DURACION[clip] }, semilla: s.siguiente };
}

/** El avance sobre la polilínea, con `enCasilla`, `haciaCasilla`, `u` y el rumbo amortiguado. */
function avanzaPorLaPolilinea(e: EstadoDelPeon, anillo: AnilloEn3D, ahora: number, dt: number): EstadoDelPeon {
  const t = Math.min(1, Math.max(0, e.dura > 0 ? (ahora - e.desde) / e.dura : 1));
  const recorrido = e.largo * t;
  const puntos = [e.camino.length > 0 ? primeraCasillaDelCamino(e) : e.enCasilla, ...e.camino];
  let acumulado = 0;
  let en = puntos[0] as number;
  let hacia = puntos[1] ?? en;
  let u = 1;
  let saludoDesde = e.saludoDesde;
  for (let k = 0; k + 1 < puntos.length; k++) {
    const a = anillo.polilinea[puntos[k] as number];
    const b = anillo.polilinea[puntos[k + 1] as number];
    if (a === undefined || b === undefined) continue;
    const tramo = Math.hypot(b.x - a.x, b.z - a.z);
    if (recorrido <= acumulado + tramo || k + 2 === puntos.length) {
      en = puntos[k] as number;
      hacia = puntos[k + 1] as number;
      u = tramo > 0 ? Math.min(1, Math.max(0, (recorrido - acumulado) / tramo)) : 1;
      break;
    }
    acumulado += tramo;
  }
  /* Al cruzar la Puerta Mayor: el saludo superpuesto, sin detenerse. */
  if (e.porLaPuertaMayor && saludoDesde === null && (hacia === PUERTA_MAYOR ? u >= 0.98 : en === PUERTA_MAYOR)) saludoDesde = ahora;
  const a = anillo.polilinea[en];
  const b = anillo.polilinea[hacia];
  let rumbo = e.rumbo;
  if (a !== undefined && b !== undefined && (a.x !== b.x || a.z !== b.z)) {
    const objetivo = e.como === 'retrocede' ? Math.atan2(a.x - b.x, a.z - b.z) : Math.atan2(b.x - a.x, b.z - a.z);
    rumbo += giroCorto(rumbo, objetivo) * amortiguado(dt, AMORTIGUACION_DEL_GIRO);
  }
  return { ...e, enCasilla: en, haciaCasilla: hacia, u, rumbo, saludoDesde };
}

/** La casilla desde la que arrancó el recorrido: va en `origen` para no perderla al avanzar `enCasilla`. */
function primeraCasillaDelCamino(e: EstadoDelPeon): number {
  return e.origen ?? e.enCasilla;
}

/**
 * LA MÁQUINA: un fotograma. Cierra la fase si ha terminado, arranca el siguiente suceso
 * si está libre, avanza por la polilínea si anda, y sortea gestos si espera. Siempre
 * devuelve un estado; un suceso que no toca se descarta.
 */
export function avanzar(e: EstadoDelPeon, ahora: number, dt: number, anillo: AnilloEn3D = ANILLO_DEL_BURGO): EstadoDelPeon {
  let estado = e;
  const dura = duracionDeLaFase(estado);
  if (dura !== null && ahora - estado.desde >= dura) estado = termina(estado, anillo, ahora);
  if (libre(estado) && estado.cola.length > 0) {
    const [s, ...resto] = estado.cola;
    estado = arranca({ ...estado, cola: resto }, anillo, s as SucesoDelBurgo, ahora);
    if (s !== undefined && s.que === 'mueve' && (estado.fase === 'andando' || estado.fase === 'corriendo' || estado.fase === 'viajando')) {
      estado = { ...estado, origen: s.desde };
    }
  }
  if ((estado.fase === 'andando' || estado.fase === 'corriendo' || estado.fase === 'viajando') && estado.origen === null) {
    const s = estado.cola[0];
    estado = { ...estado, origen: s !== undefined && s.que === 'mueve' ? s.desde : estado.enCasilla };
  }
  if (estado.fase === 'recogiendo' || estado.fase === 'apareciendo') {
    const s = estado.cola[0];
    if (s !== undefined && s.que === 'mueve') estado = { ...estado, origen: s.desde };
  }
  if (estado.fase === 'andando' || estado.fase === 'corriendo') estado = avanzaPorLaPolilinea(estado, anillo, ahora, dt);
  return gestos(estado, ahora);
}

/**
 * SALTAR LA COLA: todo a su sitio final. Se aplica lo que cada suceso pendiente deja al
 * terminar (la casilla de llegada, presa o libre, quebrada) y se vacía la cola; la fase
 * en curso se cierra también. Un toque en el lienzo lo llama: la mesa no espera.
 */
export function saltarLaCola(e: EstadoDelPeon, ahora: number): EstadoDelPeon {
  let enCasilla = e.enCasilla;
  let presa = e.presa;
  let quebrada = e.quebrada;
  let enPie = e.enPie;
  /* Lo que la fase en curso iba a dejar. */
  if (e.fase === 'andando' || e.fase === 'corriendo' || e.fase === 'viajando') enCasilla = e.camino[e.camino.length - 1] ?? e.haciaCasilla;
  if (e.fase === 'preso') {
    enCasilla = MAZMORRA;
    enPie = false;
  }
  if (e.fase === 'quebrando') {
    quebrada = true;
    enPie = false;
  }
  if (e.fase === 'despidiendose') enPie = false;
  for (const s of e.cola) {
    switch (s.que) {
      case 'mueve':
        enCasilla = s.hasta;
        presa = false;
        enPie = true;
        break;
      case 'a-la-mazmorra':
        enCasilla = MAZMORRA;
        presa = true;
        enPie = false;
        break;
      case 'sale-de-la-mazmorra':
        presa = false;
        enPie = true;
        break;
      case 'quiebra':
        quebrada = true;
        enPie = false;
        break;
      default:
        break;
    }
  }
  return entraEn(e, presa ? 'preso' : 'quieto', ahora, {
    cola: [],
    camino: [],
    enCasilla,
    haciaCasilla: enCasilla,
    u: 0,
    presa,
    quebrada,
    enPie: !quebrada && !presa && enPie,
    saludoDesde: null,
    origen: null,
  });
}

/** El aventurero de este asiento se retira para que nazca el de otro: 0,4 s encogiendo. */
export function despedir(e: EstadoDelPeon, ahora: number): EstadoDelPeon {
  if (!e.enPie || e.fase !== 'quieto') return e;
  return entraEn(e, 'despidiendose', ahora);
}

/** ¿Hay un aventurero en pie de este asiento (nacido o naciendo)? */
export function estaEnPie(e: EstadoDelPeon): boolean {
  return e.enPie;
}

/** ¿Está reproduciendo algo, o hay algo por reproducir? */
export function terminada(e: EstadoDelPeon): boolean {
  return libre(e) && e.cola.length === 0;
}

/* ─────────────────────────────── El clip ─────────────────────────────── */

export interface ClipDelPeon {
  readonly clip: NombreDeClip;
  readonly bucle: boolean;
  readonly desde: number;
  readonly velocidad: number;
}

/**
 * QUÉ CLIP SE VE AHORA. Nunca `t-pose`, por construcción: todas las ramas devuelven un
 * clip de la tabla y la que no sabe qué hacer devuelve `reposo-a`. `ahora` sólo hace falta
 * para las fases con etapas; sin él se supone que se está al principio de la fase.
 */
export function clipQueToca(e: EstadoDelPeon, ahora = e.desde): ClipDelPeon {
  const reposo: ClipDelPeon = { clip: CLIP.reposoA, bucle: true, desde: e.desde, velocidad: 1 };
  const una = (clip: NombreDeClip, desde = e.desde, velocidad = 1): ClipDelPeon => ({ clip, bucle: false, desde, velocidad });
  switch (e.fase) {
    case 'quieto':
      return e.gesto !== null ? { clip: e.gesto.clip, bucle: e.gesto.clip === CLIP.reposoB, desde: e.gesto.desde, velocidad: 1 } : reposo;
    case 'apareciendo':
      return una(CLIP.aparecer);
    case 'recogiendo':
      return una(CLIP.recoger);
    case 'andando':
      return { clip: CLIP.andar, bucle: true, desde: e.desde, velocidad: e.velocidad };
    case 'corriendo':
      return { clip: CLIP.correr, bucle: true, desde: e.desde, velocidad: e.velocidad };
    case 'viajando': {
      const etapa = etapaActual(e, ahora);
      return etapa.nombre === 'aparecer' ? una(CLIP.aparecer, etapa.desde) : una(CLIP.usar);
    }
    case 'saltando': {
      const etapa = etapaActual(e, ahora);
      return etapa.nombre === 'salto' ? una(CLIP.salto, etapa.desde) : reposo;
    }
    case 'cobrando':
      return una(CLIP.recoger);
    case 'pagando':
      return una(CLIP.lanzar);
    case 'alzando':
      return una(CLIP.usar);
    case 'preso': {
      if (!e.enPie) return e.gesto !== null ? una(e.gesto.clip, e.gesto.desde) : reposo;
      const etapa = etapaActual(e, ahora);
      if (etapa.nombre === 'golpe') return una(CLIP.golpe);
      if (etapa.nombre === 'a-la-celda') return { clip: CLIP.correr, bucle: true, desde: etapa.desde, velocidad: e.velocidad };
      /* Se desvanece con el golpe donde lo recibió; o, si ha corrido a la celda, parado dentro. */
      if (etapa.nombre === 'desvanecer') return pasaPorLaCelda(e.enCasilla) ? { ...reposo, desde: etapa.desde } : una(CLIP.golpe);
      if (etapa.nombre === 'aparecer') return una(CLIP.aparecer, etapa.desde);
      return { ...reposo, desde: etapa.desde };
    }
    case 'quebrando': {
      const etapa = etapaActual(e, ahora);
      return etapa.nombre === 'golpe' ? una(CLIP.golpe) : { clip: CLIP.correr, bucle: true, desde: etapa.desde, velocidad: 1 };
    }
    case 'despidiendose':
      return reposo;
    default:
      return reposo;
  }
}

/** El saludo superpuesto al cruzar la Puerta Mayor: cuándo empezó, mientras dure. */
export function saludoSuperpuesto(e: EstadoDelPeon, ahora: number): { readonly desde: number } | null {
  if (e.saludoDesde === null || ahora - e.saludoDesde > SALUDO_AL_PASAR) return null;
  return { desde: e.saludoDesde };
}

/* ─────────────────────────────── La posición ─────────────────────────────── */

export interface PosicionDelAventurero {
  readonly x: number;
  readonly z: number;
  readonly rumbo: number;
  /** 1 entero; baja a 0 al desvanecerse. */
  readonly escala: number;
}

/** Dónde está parado el aventurero de este asiento: preso en su celda, si no en su hueco. */
function huecoDelAventurero(e: EstadoDelPeon, anillo: AnilloEn3D, casilla: number): Punto {
  return e.presa && casilla === MAZMORRA ? anillo.huecoDePreso(e.asiento) : anillo.huecoDeAventurero(casilla, e.asiento);
}

/** Un punto del tramo `en → hacia` a `u`. */
function sobreLaPolilinea(anillo: AnilloEn3D, en: number, hacia: number, u: number): Punto {
  const a = anillo.polilinea[en];
  const b = anillo.polilinea[hacia];
  if (a === undefined) return { x: 0, z: 0 };
  if (b === undefined) return a;
  return { x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u };
}

export function posicionYRumbo(e: EstadoDelPeon, anillo: AnilloEn3D, ahora = e.desde): PosicionDelAventurero {
  const quieto = (p: Punto, escala = 1, rumbo = e.rumbo): PosicionDelAventurero => ({ x: p.x, z: p.z, rumbo, escala });
  switch (e.fase) {
    case 'andando':
    case 'corriendo':
      return quieto(sobreLaPolilinea(anillo, e.enCasilla, e.haciaCasilla, e.u));
    case 'viajando': {
      const etapa = etapaActual(e, ahora);
      const destino = e.camino[e.camino.length - 1] ?? e.haciaCasilla;
      if (etapa.nombre === 'aparecer') return quieto(huecoDelAventurero(e, anillo, destino), 1, anillo.rumboDeLaMarcha(destino));
      const origen = e.origen ?? e.enCasilla;
      return quieto(huecoDelAventurero(e, anillo, origen), etapa.nombre === 'desvanecer' ? 1 - etapa.u : 1);
    }
    case 'preso': {
      if (!e.enPie) return quieto(anillo.huecoDePreso(e.asiento), 1, anillo.rumboDeLaMarcha(MAZMORRA));
      const etapa = etapaActual(e, ahora);
      if (etapa.nombre === 'golpe') return quieto(anillo.huecoDeAventurero(e.enCasilla, e.asiento));
      /* Corriendo a la celda, y desvaneciéndose dentro de ella al final del camino. */
      if (etapa.nombre === 'a-la-celda' || (etapa.nombre === 'desvanecer' && pasaPorLaCelda(e.enCasilla))) {
        const corriendo = etapa.nombre === 'a-la-celda';
        const p = enElCaminoALaCelda(anillo, e.asiento, corriendo ? etapa.u : 1, e.rumbo);
        return quieto(p, corriendo ? 1 : 1 - etapa.u, p.rumbo);
      }
      if (etapa.nombre === 'desvanecer') return quieto(anillo.huecoDeAventurero(e.enCasilla, e.asiento), 1 - etapa.u);
      if (etapa.nombre === 'reja-sube') return quieto(anillo.huecoDePreso(e.asiento), 0, anillo.rumboDeLaMarcha(MAZMORRA));
      return quieto(anillo.huecoDePreso(e.asiento), 1, anillo.rumboDeLaMarcha(MAZMORRA));
    }
    case 'quebrando': {
      const etapa = etapaActual(e, ahora);
      const hueco = anillo.huecoDeAventurero(e.enCasilla, e.asiento);
      if (etapa.nombre === 'golpe') return quieto(hueco);
      const fuera = anillo.fuera(e.enCasilla);
      const total = HUIDA_AL_QUEBRAR / VELOCIDAD_CORRIENDO;
      const desvanecido = Math.max(0, (etapa.t - (total - DESVANECER_AL_QUEBRAR)) / DESVANECER_AL_QUEBRAR);
      return quieto({ x: hueco.x + fuera.x * HUIDA_AL_QUEBRAR * etapa.u, z: hueco.z + fuera.z * HUIDA_AL_QUEBRAR * etapa.u }, 1 - Math.min(1, desvanecido));
    }
    case 'despidiendose':
      return quieto(huecoDelAventurero(e, anillo, e.enCasilla), 1 - Math.min(1, (ahora - e.desde) / DURACION_DE_LA_DESPEDIDA));
    default:
      return quieto(huecoDelAventurero(e, anillo, e.enCasilla), 1, e.fase === 'quieto' || e.fase === 'apareciendo' ? anillo.rumboDeLaMarcha(e.enCasilla) : e.rumbo);
  }
}

export interface PosicionDelPeon {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** 0 de pie, 1 tumbado de lado (giro de 90° sobre x). */
  readonly tumbado: number;
  readonly visible: boolean;
}

/** Dónde está la instancia del peón, y si se ve: mientras el aventurero lo lleva, no. */
export function posicionDelPeon(e: EstadoDelPeon, anillo: AnilloEn3D, ahora = e.desde): PosicionDelPeon {
  const t = ahora - e.desde;
  const en = (p: Punto, y = 0, visible = true, tumbado = 0): PosicionDelPeon => ({ x: p.x, y, z: p.z, tumbado, visible });
  const hueco = e.presa && e.enCasilla === MAZMORRA ? anillo.huecoDePreso(e.asiento) : anillo.huecoDePeon(e.enCasilla, e.asiento);
  if (e.quebrada) return en(hueco, 0, false, 1);
  switch (e.fase) {
    case 'apareciendo':
      return en(hueco, -HUNDIDO_DEL_PEON * Math.min(1, t / TIEMPO_DE_HUNDIRSE));
    case 'recogiendo':
      return en(hueco, -HUNDIDO_DEL_PEON, false);
    case 'andando':
    case 'corriendo':
      return en(hueco, 0, false);
    case 'viajando': {
      const etapa = etapaActual(e, ahora);
      const destino = e.camino[e.camino.length - 1] ?? e.haciaCasilla;
      return etapa.nombre === 'aparecer' ? en(anillo.huecoDePeon(destino, e.asiento)) : en(hueco, 0, false);
    }
    case 'saltando': {
      const etapa = etapaActual(e, ahora);
      if (etapa.nombre !== 'salto') return en(hueco, 0, false);
      const apice = DURACION.salto / 2;
      if (etapa.t < apice) return en(hueco, 0, false);
      const caida = etapa.t - apice;
      const y = Math.max(0, CAIDA_DEL_PEON * (1 - caida / ASENTAR)) + reboteDelDado(caida);
      return en(hueco, y);
    }
    case 'preso': {
      if (!e.enPie) return en(anillo.huecoDePreso(e.asiento));
      const etapa = etapaActual(e, ahora);
      if (etapa.nombre === 'golpe' || etapa.nombre === 'a-la-celda' || etapa.nombre === 'desvanecer') return en(anillo.huecoDePeon(e.enCasilla, e.asiento), 0, false);
      return en(anillo.huecoDePreso(e.asiento), 0, etapa.nombre !== 'reja-sube');
    }
    case 'quebrando': {
      const tumbado = Math.min(1, t / TUMBARSE);
      return en(hueco, 0, t < TUMBARSE + 0.4, tumbado);
    }
    default:
      return en(hueco);
  }
}
