/**
 * UNA LOSA, LEVANTADA: la aritmética que la construye entera, sin `three`.
 *
 * ═══ AQUÍ NO SE PINTA NADA ═══
 *
 * `montarLaLosa` devuelve DOS LISTAS —las celdas del suelo con lo que hay en cada
 * una, y las piezas puestas con su sitio y su giro— y `Lindes.tsx` sólo instancia.
 * Es la misma frontera que `escenas/burgo/ciudad.ts` y por el mismo motivo: si una
 * casa está en mitad de la senda, el fallo está AQUÍ, y aquí lo puede medir un
 * comprobador en Node sin abrir un contexto de dibujo. Un tablero mal montado no da
 * error en ninguna consola: se ve.
 *
 * ═══ LA MISMA MESA, EL MISMO PAISAJE ═══
 *
 * Todo lo que se sortea sale de una semilla que llega por parámetro, y quien la
 * pasa la saca de `semillaDelCodigo(codigo)` mezclada con las coordenadas de la
 * losa. NUNCA de `ctx.azar`, que es secreto y filtraría el orden de la bolsa. Los
 * cinco aparatos de una mesa ven exactamente el mismo valle; otra mesa ve otro.
 *
 * ═══ LA LOSA MIDE 175 Y ESO CAMBIA QUÉ SE PONE, NO SÓLO CUÁNTO ═══
 *
 * Con la losa en veintidós unidades esto ponía piezas sueltas con un empujón al
 * azar: cuatro casas, unos árboles, una valla. Era lo único que cabía. En 175
 * —sesenta y cuatro veces el suelo— eso mismo se ve como una maqueta apretada con
 * mucho hueco alrededor, que es peor que antes.
 *
 * Lo que cabe ahora, y es lo que se hace, son COMPOSICIONES:
 *
 *   · LA VILLA tiene trama urbana. Una retícula de manzanas con calles entre ellas,
 *     una plaza sin casas alrededor del edificio que manda, y las casas puestas
 *     dentro de las manzanas. Una villa no es un montón de casas: es un sitio por el
 *     que se puede andar.
 *   · EL PRADO tiene LINDES, que es de donde le viene el nombre al juego. El campo
 *     se parte en parcelas, cada parcela tiene un uso —trigo, barbecho, pasto,
 *     arboleda, erial— y en la raya entre dos parcelas hay un seto. Es lo que
 *     convierte una alfombra verde con árboles en un campo trabajado.
 *   · LA SENDA lleva su vallado a los lados, siguiendo el camino y no al azar.
 *
 * ═══ Y EL ORDEN EN QUE SE MONTA ES LA POLÍTICA DE DETALLE ═══
 *
 *  1. LO OBLIGADO: murallas, puertas, torres, la ermita y el edificio que manda en
 *     una villa. Lo que cuenta una regla se pinta SIEMPRE, mire la cámara donde mire.
 *  2. EL RELLENO: casas, setos, árboles, mieses, trastos. Se corta por el cupo de
 *     `PIEZAS_POR_LOSA`, y lo recorta además la distancia, en `Lindes.tsx`.
 */
import {
  ANCHO_DEL_EJE,
  ANCHO_DE_LA_SENDA,
  CELDAS_POR_LOSA,
  CHAFLAN_DE_LA_VILLA,
  CELDAS_POR_MURO,
  CELDAS_POR_SETO,
  ESCALA_DEL_SETO,
  ESCALA_DE_LA_CASA,
  ESCALA_DE_LA_ERMITA,
  ESCALA_DE_LA_MURALLA,
  ESCALA_DE_LA_TORRE,
  ESCALA_DEL_QUE_MANDA,
  FONDO_DE_LA_VILLA,
  LADO_DE_LOSA,
  NUCLEO_DE_LA_VILLA,
  ENTRADA_RECTA_DE_LA_SENDA,
  PIEZAS_POR_LOSA,
  TIRON_AL_CENTRO,
} from './medidas';
import { MODELO } from '../nombres';
import { ESCALA_DEL_PACK } from '../escala';
import { ladoGirado, losaPorId } from '../../shared/arcade/juegos/lindes-losas';
import type { Giro, Lado, Losa } from '../../shared/arcade/juegos/lindes-losas';

/** Lo que hay en una celda del suelo. */
export type ClaseDeSuelo = 'prado' | 'senda' | 'villa';

/** Una celda del suelo, en la retícula de la losa. */
export interface CeldaDeSuelo {
  /** De 0 a `CELDAS_POR_LOSA - 1`, de oeste a este. */
  readonly i: number;
  /** De 0 a `CELDAS_POR_LOSA - 1`, de norte a sur. */
  readonly j: number;
  readonly clase: ClaseDeSuelo;
}

/**
 * POR QUÉ ESTÁ PUESTA UNA PIEZA.
 *
 * No es documentación: es lo que decide si se pinta cuando la cámara está lejos.
 * `muralla`, `remate` y `ermita` se pintan siempre —cuentan una regla—; lo demás es
 * relleno y se recorta por distancia.
 */
export type PorQueEsta = 'muralla' | 'villa' | 'senda' | 'prado' | 'ermita' | 'remate';

/** Lo que NO se recorta nunca por distancia. */
export const LO_QUE_NO_SE_RECORTA: readonly PorQueEsta[] = ['muralla', 'remate', 'ermita'];

/** Una pieza del pack, puesta en la losa. Coordenadas locales, unidades del mundo. */
export interface PuestaEnLaLosa {
  /** El nombre con el que se busca en el catálogo de `tablero.glb`. */
  readonly pieza: string;
  /** Hacia el este, desde el centro de la losa. */
  readonly x: number;
  /** Hacia el sur, desde el centro de la losa. */
  readonly z: number;
  /** Sobre la cara de arriba de la losa. Casi siempre cero. */
  readonly y: number;
  /** Giro alrededor del eje vertical, en radianes. */
  readonly giro: number;
  /** Lo que se estira la pieza. Uno es su tamaño del pack. */
  readonly escala: number;
  /** Cuánto se estira SÓLO a lo largo, para que un muro cubra un tramo corto. */
  readonly largo: number;
  readonly porque: PorQueEsta;
  /**
   * ¿ES UNA PIEZA MENUDA? Un barril, una piedra, un seto, un tocón.
   *
   * No es una descripción: es lo primero que se deja de pintar cuando la cámara se
   * aleja. A tres losas de distancia un barril ocupa medio píxel y cuesta 240
   * triángulos igual que de cerca, así que pintarlo es pagar el precio entero por
   * nada. Lo decide `esMenuda`, con la lista de al lado, y NO un umbral de tamaño:
   * un umbral se cuela por arriba el día que alguien agrande una valla.
   */
  readonly menuda: boolean;
}

/** Lo que hay que levantar para una losa. */
export interface ContenidoDeLosa {
  readonly celdas: readonly CeldaDeSuelo[];
  readonly puestas: readonly PuestaEnLaLosa[];
}

/** Un punto en fracciones de losa, con el centro en (0, 0) y el norte en −z. */
export interface Punto {
  readonly x: number;
  readonly z: number;
}

// ---------------------------------------------------------------------------
// El sorteo
// ---------------------------------------------------------------------------

/**
 * EL SORTEO, que es el mismo `mulberry32` que usa la cala del embarcadero.
 *
 * Se copia y no se importa porque el de allí vive dentro de un módulo que arrastra
 * `three`, y esto tiene que poder correr en Node dentro de un comprobador. Son seis
 * líneas y están medidas; importarlo costaría un motor de dibujo entero.
 */
export function sorteo(semilla: number): () => number {
  let x = (Math.trunc(semilla) >>> 0) + 0x6d2b79f5;
  return () => {
    x = (x + 0x6d2b79f5) | 0;
    let t = Math.imul(x ^ (x >>> 15), 1 | x);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Un número estable entre 0 y 1 para una pareja de enteros. No gasta sorteo. */
function ruidoDe(a: number, b: number, sal: number): number {
  let h =
    (Math.imul(a + 1024, 73856093) ^ Math.imul(b + 1024, 19349663) ^ Math.imul(sal | 1, 83492791)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------------------
// La geometría de la losa, en fracciones
// ---------------------------------------------------------------------------

/** El punto medio de un lado, en fracciones de losa. */
export function medioDelLado(l: Lado): Punto {
  if (l === 0) return { x: 0, z: -0.5 };
  if (l === 1) return { x: 0.5, z: 0 };
  if (l === 2) return { x: 0, z: 0.5 };
  return { x: -0.5, z: 0 };
}

/** Lo que se aleja un punto de la raya de ese lado, hacia dentro. */
function fondoDesdeElLado(p: Punto, l: Lado): number {
  if (l === 0) return p.z + 0.5;
  if (l === 1) return 0.5 - p.x;
  if (l === 2) return 0.5 - p.z;
  return p.x + 0.5;
}

/** Lo que se aparta un punto del centro del lado, a lo largo de él. */
function aLoLargoDelLado(p: Punto, l: Lado): number {
  return l === 0 || l === 2 ? Math.abs(p.x) : Math.abs(p.z);
}

/**
 * ¿ESTÁ ESTE PUNTO DENTRO DE LA BANDA DE MURALLA DE ESE LADO?
 *
 * La banda entra en CHAFLÁN: en el borde ocupa el lado entero, y a cada paso que se
 * mete se estrecha lo mismo por los dos extremos. El porqué está entero en
 * `FONDO_DE_LA_VILLA`, y se resume en una línea: es lo que hace que lo que se ve en
 * el borde de una losa dependa SÓLO de lo que ese lado enseña, que es la única forma
 * de que dos losas cualesquiera casen en la raya.
 */
function enLaBandaDelLado(p: Punto, l: Lado): boolean {
  const fondo = fondoDesdeElLado(p, l);
  if (fondo < 0 || fondo > FONDO_DE_LA_VILLA) return false;
  /*
   * ═══ MEDIA CELDA DE SANGRADO, Y NO ES UN AJUSTE FINO ═══
   *
   * Sin él, la diagonal del chaflán pasa EXACTAMENTE por el centro de las celdas de
   * las esquinas, y si entran o no lo decide el último bit de una resta: la esquina
   * noroeste salía villa por el lado oeste y prado por el norte, en la misma losa.
   * Y ahí está el problema de fondo, que ninguna cuenta puede resolver: la celda de
   * una esquina pertenece a DOS bordes, y si sus dos lados enseñan cosas distintas
   * no puede ser las dos.
   *
   * Con media celda de sangrado, las cuatro esquinas de cualquier losa son SIEMPRE
   * prado. Deja de haber ambigüedad, dos losas cualesquiera casan celda a celda, y
   * el precio es un cuadradito de hierba de una celda entre dos villas pegadas: un
   * dos por ciento de la raya, que a la escala del tablero ni se busca.
   */
  const sangrado = 0.5 / CELDAS_POR_LOSA;
  /*
   * El chaflán se corta a `CHAFLAN_DE_LA_VILLA`: más adentro la banda sigue recta.
   * Lo que el chaflán protege es el borde de los lados vecinos, y ése sólo está
   * donde el fondo es casi cero. Ver la cabecera de esa constante.
   */
  const mordida = Math.min(fondo, CHAFLAN_DE_LA_VILLA);
  return aLoLargoDelLado(p, l) <= 0.5 - mordida - sangrado;
}

/** La distancia AL CUADRADO de un punto a un segmento. Sin raíces: se compara al cuadrado. */
export function distanciaAlSegmento(p: Punto, a: Punto, b: Punto): number {
  const vx = b.x - a.x;
  const vz = b.z - a.z;
  const largo = vx * vx + vz * vz;
  if (largo <= 0) {
    const dx = p.x - a.x;
    const dz = p.z - a.z;
    return dx * dx + dz * dz;
  }
  let t = ((p.x - a.x) * vx + (p.z - a.z) * vz) / largo;
  if (t < 0) t = 0;
  if (t > 1) t = 1;
  const dx = p.x - (a.x + t * vx);
  const dz = p.z - (a.z + t * vz);
  return dx * dx + dz * dz;
}

/** El punto donde se juntan las murallas de una villa: su centro, tirado al medio. */
export function juntaDeLaVilla(lados: readonly Lado[]): Punto {
  let x = 0;
  let z = 0;
  for (const l of lados) {
    const m = medioDelLado(l);
    x += m.x;
    z += m.z;
  }
  const n = lados.length === 0 ? 1 : lados.length;
  return { x: (x / n) * TIRON_AL_CENTRO, z: (z / n) * TIRON_AL_CENTRO };
}

/**
 * EL CAMINO QUE DIBUJA UNA SENDA DENTRO DE LA LOSA.
 *
 * Con un solo lado, del borde al centro y ahí se acaba —un camino que muere en una
 * encrucijada o en la puerta de una ermita—. Con dos enfrentados, de lado a lado.
 * Con dos en esquina, una curva: el punto de paso se saca del medio de los dos
 * extremos EMPUJADO HACIA LA ESQUINA, que es lo que hace que la senda se combe en
 * vez de doblar en pico. Un pico se ve a la primera y no se ve en ningún camino de
 * verdad.
 */
export function caminoDeLaSenda(lados: readonly Lado[]): readonly Punto[] {
  if (lados.length === 0) return [];
  const a = medioDelLado(lados[0] as Lado);
  const aDentro = haciaDentro(a, lados[0] as Lado);
  if (lados.length === 1) return [a, aDentro, { x: 0, z: 0 }];
  const b = medioDelLado(lados[1] as Lado);
  const enfrentados = ((lados[0] as number) + 2) % 4 === (lados[1] as number);
  if (enfrentados) return [a, b];
  const bDentro = haciaDentro(b, lados[1] as Lado);
  const medio = { x: ((a.x + b.x) / 2) * 1.35, z: ((a.z + b.z) / 2) * 1.35 };
  return [a, aDentro, medio, bDentro, b];
}

/**
 * EL PRIMER PASO DE UN CAMINO, PERPENDICULAR A SU BORDE.
 *
 * ═══ POR QUÉ UN CAMINO NO PUEDE LLEGAR AL BORDE EN DIAGONAL ═══
 *
 * Porque la huella que deja en la raya es más ancha que el camino. Un tramo que
 * llega a veintiséis grados deja en el borde una banda de cinco celdas y media
 * cuando el camino mide dos y media; y la losa de al lado, con su camino llegando
 * perpendicular, deja dos y media. Las dos casan por las REGLAS y no casan en el
 * dibujo: se ve un camino que se ensancha justo en la raya y luego se estrecha.
 *
 * Lo cazó `verify:lindes-escena` comparando las rayas celda a celda —ochocientos
 * sesenta y nueve pares—, y se arregla haciendo que todo camino salga recto de su
 * borde antes de doblar. Que es, además, como se construye un camino de verdad:
 * perpendicular a la linde que cruza.
 */
function haciaDentro(borde: Punto, l: Lado): Punto {
  const paso = ENTRADA_RECTA_DE_LA_SENDA;
  if (l === 0) return { x: borde.x, z: borde.z + paso };
  if (l === 1) return { x: borde.x - paso, z: borde.z };
  if (l === 2) return { x: borde.x, z: borde.z - paso };
  return { x: borde.x + paso, z: borde.z };
}

/** ¿Está este punto dentro de alguna villa de la losa? */
function enLaVilla(losa: Losa, giro: Giro, p: Punto): boolean {
  for (const villa of losa.villas) {
    const lados = villa.lados.map((l) => ladoGirado(l, giro));
    for (const l of lados) {
      if (enLaBandaDelLado(p, l)) return true;
    }
    if (lados.length > 1) {
      const junta = juntaDeLaVilla(lados);
      const media = ANCHO_DEL_EJE / 2;
      for (const l of lados) {
        if (distanciaAlSegmento(p, medioDelLado(l), junta) <= media * media) return true;
      }
    }
    /*
     * Y el NÚCLEO, sólo con tres o cuatro murallas: con el chaflán, las bandas dejan
     * un hueco en medio, y una villa que ocupa casi toda la losa con un claro de
     * hierba en el centro no es lo que esa losa enseña.
     */
    if (lados.length >= 3) {
      const junta = juntaDeLaVilla(lados);
      if (distanciaAlSegmento(p, junta, junta) <= NUCLEO_DE_LA_VILLA * NUCLEO_DE_LA_VILLA) {
        return true;
      }
    }
  }
  return false;
}

/** ¿Pasa alguna senda por este punto? */
function enLaSenda(losa: Losa, giro: Giro, p: Punto): boolean {
  return cercaDeUnaSenda(losa, giro, p, ANCHO_DE_LA_SENDA / 2);
}

/**
 * QUÉ HAY EN UN PUNTO DE LA LOSA.
 *
 * El orden manda y no es arbitrario: **la villa gana a la senda**. En la mesa un
 * camino no atraviesa una villa, se acaba en su puerta, y así sale solo — el camino
 * llega hasta donde empieza el empedrado y ahí se corta, que es lo que se ve en una
 * losa de verdad.
 */
export function queHayEn(losa: Losa, giro: Giro, p: Punto): ClaseDeSuelo {
  if (enLaVilla(losa, giro, p)) return 'villa';
  if (enLaSenda(losa, giro, p)) return 'senda';
  return 'prado';
}

/**
 * LA SEMILLA DE UNA LOSA CONCRETA.
 *
 * Mezcla la de la mesa con SUS COORDENADAS y no con su número de serie: así una losa
 * puesta en el mismo sitio se ve igual aunque la partida se rebobine, y dos losas
 * iguales en sitios distintos no salen clonadas — que es lo que delata un paisaje
 * generado. Vive aquí, y no en la escena, porque quien pregunte por el contenido de una
 * losa fuera del bucle de pintado tiene que obtener EXACTAMENTE el mismo paisaje: con la
 * cuenta copiada, el día que cambie una de las dos copias el paseante nacería en un
 * pueblo que no es el que se ve.
 */
export function semillaDeLaLosa(semilla: number, x: number, y: number): number {
  return (semilla ^ Math.imul(x + 512, 73856093) ^ Math.imul(y + 512, 19349663)) >>> 0;
}

/** El centro de una celda, en fracciones de losa. */
export function centroDeCelda(i: number, j: number): Punto {
  return { x: (i + 0.5) / CELDAS_POR_LOSA - 0.5, z: (j + 0.5) / CELDAS_POR_LOSA - 0.5 };
}

/** El suelo de una losa, celda a celda. */
export function sueloDeLaLosa(losa: Losa, giro: Giro): CeldaDeSuelo[] {
  const celdas: CeldaDeSuelo[] = [];
  for (let j = 0; j < CELDAS_POR_LOSA; j++) {
    for (let i = 0; i < CELDAS_POR_LOSA; i++) {
      celdas.push({ i, j, clase: queHayEn(losa, giro, centroDeCelda(i, j)) });
    }
  }
  return celdas;
}

// ---------------------------------------------------------------------------
// Las murallas: el borde de la villa contra el prado
// ---------------------------------------------------------------------------

/** Un tramo de muralla, en celdas de la retícula. */
export interface TramoDeMuralla {
  /** Hacia dónde mira el muro: el lado de la celda de villa que da al prado. */
  readonly haciaDonde: Lado;
  /** La primera celda del tramo. */
  readonly desde: number;
  /** Cuántas celdas mide. */
  readonly celdas: number;
  /** La coordenada fija: la fila si mira al norte o al sur, la columna si no. */
  readonly fija: number;
}

/**
 * LAS MURALLAS DE UNA LOSA, sacadas del borde de la villa contra el prado.
 *
 * ═══ POR QUÉ NO SE PONEN EN LOS LADOS DE MURALLA DE LA LOSA ═══
 *
 * Porque un lado de muralla es por donde la villa SALE, no donde se acaba. Dos
 * losas pegadas por sus murallas son UNA villa, y un muro ahí la partiría en dos a
 * la vista mientras las reglas la cuentan entera: la partida diría «villa de seis
 * losas» y el tablero enseñaría seis recintos amurallados. Ése es justo el error
 * que un dibujo puede cometer sin que nada se ponga rojo.
 *
 * Así que el muro va donde la villa toca el prado, que se sabe mirando las celdas
 * de al lado; y en el borde de la losa sólo si por ahí no sale la villa.
 */
export function murallasDeLaLosa(
  losa: Losa,
  giro: Giro,
  celdas: readonly CeldaDeSuelo[],
): TramoDeMuralla[] {
  const en = (i: number, j: number): ClaseDeSuelo | null => {
    if (i < 0 || j < 0 || i >= CELDAS_POR_LOSA || j >= CELDAS_POR_LOSA) return null;
    const c = celdas[j * CELDAS_POR_LOSA + i];
    return c === undefined ? null : c.clase;
  };
  const lindeFuera = (l: Lado): boolean => {
    const propio = (((l - giro) % 4) + 4) % 4;
    return losa.lados[propio] === 'muralla';
  };

  const tramos: TramoDeMuralla[] = [];
  const direcciones: readonly { lado: Lado; di: number; dj: number }[] = [
    { lado: 0, di: 0, dj: -1 },
    { lado: 2, di: 0, dj: 1 },
    { lado: 1, di: 1, dj: 0 },
    { lado: 3, di: -1, dj: 0 },
  ];

  for (const d of direcciones) {
    const porFilas = d.di === 0;
    for (let fija = 0; fija < CELDAS_POR_LOSA; fija++) {
      let corrido = 0;
      for (let k = 0; k <= CELDAS_POR_LOSA; k++) {
        const i = porFilas ? k : fija;
        const j = porFilas ? fija : k;
        const aqui = k < CELDAS_POR_LOSA ? en(i, j) : null;
        const alLado = k < CELDAS_POR_LOSA ? en(i + d.di, j + d.dj) : null;
        const fuera = alLado === null && k < CELDAS_POR_LOSA;
        const hayMuro =
          aqui === 'villa' && (fuera ? !lindeFuera(d.lado) : alLado !== null && alLado !== 'villa');
        if (hayMuro) {
          corrido++;
          continue;
        }
        if (corrido > 0) {
          tramos.push({ haciaDonde: d.lado, desde: k - corrido, celdas: corrido, fija });
          corrido = 0;
        }
      }
    }
  }
  return tramos;
}

// ---------------------------------------------------------------------------
// Las listas de lo que se pone
// ---------------------------------------------------------------------------

/** Los edificios grandes que pueden mandar en una villa. */
const LO_QUE_MANDA: readonly string[] = [
  MODELO.iglesia,
  MODELO.taberna,
  MODELO.mercado,
  MODELO.concejo,
  MODELO.herreria,
  MODELO.taller,
  MODELO.molino,
];

/** Y los de segunda fila, que acompañan al que manda en una villa grande. */
const LO_QUE_ACOMPANA: readonly string[] = [
  MODELO.taberna,
  MODELO.herreria,
  MODELO.taller,
  MODELO.cuadras,
  MODELO.mercado,
];

/** Lo que se pone en una plaza, alrededor del edificio que manda. */
const LO_DE_LA_PLAZA: readonly { pieza: string; peso: number; escala: number }[] = [
  { pieza: MODELO.pozo, peso: 8, escala: 1 },
  { pieza: MODELO.carro, peso: 7, escala: 1 },
  { pieza: MODELO.tienda, peso: 7, escala: 1 },
  { pieza: MODELO.barril, peso: 6, escala: 1 },
  { pieza: MODELO.caja, peso: 5, escala: 1 },
  { pieza: MODELO.saco, peso: 5, escala: 1 },
  { pieza: MODELO.lena, peso: 4, escala: 1 },
  { pieza: MODELO.abrevadero, peso: 4, escala: 1 },
];

/** Lo que llena una parcela, por uso. */
const LO_DE_LA_PARCELA: Readonly<
  Record<string, readonly { pieza: string; peso: number; escala: number }[]>
> = {
  trigo: [
    { pieza: MODELO.trigal, peso: 10, escala: 1 },
    { pieza: MODELO.almiar, peso: 3, escala: 1 },
  ],
  barbecho: [
    { pieza: MODELO.barbecho, peso: 10, escala: 1 },
    { pieza: MODELO.tocon, peso: 2, escala: 1 },
  ],
  pasto: [
    { pieza: MODELO.arbolA, peso: 6, escala: 1 },
    { pieza: MODELO.arbolB, peso: 5, escala: 1 },
    { pieza: MODELO.almiar, peso: 3, escala: 1 },
    { pieza: MODELO.abrevadero, peso: 2, escala: 1 },
  ],
  arboleda: [
    { pieza: MODELO.arboledaGrande, peso: 6, escala: 1 },
    { pieza: MODELO.arboledaMedia, peso: 6, escala: 1 },
    { pieza: MODELO.arboledaPequena, peso: 5, escala: 1 },
    { pieza: MODELO.arbolA, peso: 4, escala: 1 },
  ],
  erial: [
    { pieza: MODELO.rocaA, peso: 6, escala: 1 },
    { pieza: MODELO.rocaC, peso: 5, escala: 1 },
    { pieza: MODELO.rocaE, peso: 4, escala: 1 },
    { pieza: MODELO.colinaA, peso: 4, escala: 1 },
    { pieza: MODELO.piedra, peso: 4, escala: 1 },
    { pieza: MODELO.tocon, peso: 3, escala: 1 },
  ],
};

/** Los cinco usos, en el orden en que se sortean. */
const USOS_DE_PARCELA: readonly string[] = ['trigo', 'barbecho', 'pasto', 'arboleda', 'erial'];

/**
 * CADA CUÁNTAS CELDAS SE PRUEBA A PONER ALGO EN UNA PARCELA.
 *
 * Es sólo el TAMIZ —cuántos sitios se miran—, no la separación: la separación la
 * decide `loQueOcupa` pieza a pieza, porque en la misma parcela puede caer un árbol
 * de tres unidades y una arboleda de veinte. Con un paso fino y la separación bien
 * medida, la parcela sale llena donde lo que se pone es pequeño y aireada donde es
 * grande, que es lo que hace un campo de verdad.
 */
const PASO_DE_LA_PARCELA: Readonly<Record<string, number>> = {
  trigo: 2,
  barbecho: 2,
  pasto: 2,
  arboleda: 2,
  erial: 3,
};

/** Lo que se pone al lado de una senda. */
const LO_DE_LA_SENDA: readonly { pieza: string; peso: number; escala: number }[] = [
  { pieza: MODELO.valla, peso: 16, escala: 1 },
  { pieza: MODELO.piedra, peso: 5, escala: 1 },
  { pieza: MODELO.carro, peso: 4, escala: 1 },
  { pieza: MODELO.tocon, peso: 3, escala: 1 },
  { pieza: MODELO.barril, peso: 2, escala: 1 },
];

/**
 * LO QUE MIDE DE ANCHO CADA PIEZA DEL PACK, en unidades de pack.
 *
 * ═══ MEDIDO DEL `.glb`, NO ESTIMADO ═══
 *
 * Son las cajas que imprime el medidor de modelos sobre `tablero.glb`, redondeadas a
 * la centésima. Están aquí porque sin ellas NO SE PUEDE SABER cada cuánto poner una
 * pieza sin que se monte sobre la siguiente, y eso tiene un modo de fallo muy
 * concreto y muy feo: un trigal mide 1,87 de pack —veinte del mundo— y se estaba
 * poniendo uno cada once, así que cada uno se metía dentro de los dos de al lado y
 * el campo salía RAYADO, como una trama de líneas en vez de como un sembrado.
 *
 * Lo que no esté en la tabla se trata como si midiera medio pack, que es lo que
 * miden los trastos; equivocarse por ahí sólo deja hueco de más.
 */
const ANCHO_EN_PACK: Readonly<Record<string, number>> = {
  [MODELO.trigal]: 1.87,
  [MODELO.barbecho]: 1.8,
  [MODELO.arboledaGrande]: 1.95,
  [MODELO.arboledaMedia]: 1.75,
  [MODELO.arboledaPequena]: 1.43,
  [MODELO.arbolA]: 0.57,
  [MODELO.arbolB]: 0.69,
  [MODELO.almiar]: 0.4,
  [MODELO.colinaA]: 1.11,
  [MODELO.rocaA]: 0.3,
  [MODELO.rocaB]: 0.29,
  [MODELO.rocaC]: 0.34,
  [MODELO.rocaD]: 0.29,
  [MODELO.rocaE]: 0.49,
  [MODELO.tocon]: 0.17,
  [MODELO.piedra]: 0.42,
  [MODELO.carro]: 0.24,
  [MODELO.abrevadero]: 0.2,
  [MODELO.barril]: 0.2,
  [MODELO.caja]: 0.14,
  [MODELO.saco]: 0.11,
  [MODELO.lena]: 0.69,
  [MODELO.tienda]: 0.52,
  [MODELO.pozo]: 0.65,
  [MODELO.casa]: 0.88,
  [MODELO.valla]: 0.1,
};

/** Lo que ocupa una pieza puesta, en unidades del mundo. */
export function loQueOcupa(pieza: string, escala: number): number {
  return (ANCHO_EN_PACK[pieza] ?? 0.5) * ESCALA_DEL_PACK * escala;
}

/**
 * LAS PIEZAS MENUDAS: lo primero que se deja de pintar al alejarse la cámara.
 *
 * Escrita a mano y no derivada del tamaño, por lo que dice `PuestaEnLaLosa.menuda`.
 * Lo que está aquí es lo que a tres losas de distancia no se distingue de la hierba.
 */
const PIEZAS_MENUDAS: ReadonlySet<string> = new Set<string>([
  MODELO.valla,
  MODELO.vallaPuerta,
  MODELO.piedra,
  MODELO.barril,
  MODELO.caja,
  MODELO.saco,
  MODELO.lena,
  MODELO.tocon,
  MODELO.carro,
  MODELO.abrevadero,
  MODELO.tienda,
  MODELO.rocaA,
  MODELO.rocaB,
  MODELO.rocaC,
  MODELO.rocaD,
  MODELO.rocaE,
  MODELO.pozo,
]);

/** ¿Es ésta de las que se dejan de pintar de lejos? */
export function esMenuda(pieza: string): boolean {
  return PIEZAS_MENUDAS.has(pieza);
}

/** Uno de una lista con pesos. */
function unoDe(
  lista: readonly { pieza: string; peso: number; escala: number }[],
  tirada: () => number,
): { pieza: string; escala: number } {
  let suma = 0;
  for (const x of lista) suma += x.peso;
  let corte = tirada() * suma;
  for (const x of lista) {
    corte -= x.peso;
    if (corte <= 0) return { pieza: x.pieza, escala: x.escala };
  }
  const ultimo = lista[lista.length - 1] as { pieza: string; escala: number };
  return { pieza: ultimo.pieza, escala: ultimo.escala };
}

// ---------------------------------------------------------------------------
// Las parcelas del prado: las LINDES que dan nombre al juego
// ---------------------------------------------------------------------------

/** Lo que mide una parcela, en celdas. Doce de cuarenta y ocho: cuatro por losa. */
export const CELDAS_POR_PARCELA = 12;

/**
 * A QUÉ PARCELA PERTENECE UNA CELDA.
 *
 * Con un desplazamiento por losa para que las rayas no se continúen de una a otra:
 * dos losas con las parcelas alineadas se leen como un tablero de ajedrez, que es
 * lo contrario de un campo.
 */
export function parcelaDe(
  i: number,
  j: number,
  desplaza: number,
): { readonly a: number; readonly b: number } {
  return {
    a: Math.floor((i + desplaza) / CELDAS_POR_PARCELA),
    b: Math.floor((j + (desplaza % 5)) / CELDAS_POR_PARCELA),
  };
}

/** Qué se cultiva en una parcela. Estable: la misma parcela da siempre lo mismo. */
export function usoDeLaParcela(a: number, b: number, semilla: number): string {
  const r = ruidoDe(a, b, semilla);
  return USOS_DE_PARCELA[
    Math.min(USOS_DE_PARCELA.length - 1, Math.floor(r * USOS_DE_PARCELA.length))
  ] as string;
}

// ---------------------------------------------------------------------------
// Montar la losa entera
// ---------------------------------------------------------------------------

/**
 * EL TRAMO MÁS CORTO QUE SE CUBRE CON MURALLA.
 *
 * Tres celdas: menos de la mitad de lo que mide un `muro` del pack. Por debajo, el
 * muro habría que encogerlo tanto que el aparejo deja de leerse como piedra.
 */
export const CELDAS_MINIMAS_DE_MURO = 3;

/** Lo que mide una manzana y la calle que la separa de la siguiente, en celdas. */
export const CELDAS_DE_MANZANA = 7;
export const CELDAS_DE_CALLE = 2;

/**
 * CUÁNTAS CASAS COMO MUCHO EN UNA VILLA, por grande que sea.
 *
 * Doce, y bajó de veintidós al medir el presupuesto: una `casa` del pack cuesta 1.393
 * triángulos, así que veintidós son treinta mil por losa y dos millones y medio en un
 * tablero de nueve por nueve — el techo entero gastado en casas. Con doce, una villa
 * grande sigue leyéndose como un pueblo y cabe el resto del valle.
 */
export const TOPE_DE_CASAS = 12;

/**
 * LEVANTA UNA LOSA ENTERA.
 *
 * Devuelve el suelo y las piezas, en coordenadas LOCALES de la losa y en unidades
 * del mundo: quien la ponga en el tablero sólo tiene que desplazarla.
 */
export function montarLaLosa(idDeLosa: string, giro: Giro, semilla: number): ContenidoDeLosa {
  const losa = losaPorId(idDeLosa);
  if (losa === null) return { celdas: [], puestas: [] };

  const tirada = sorteo(semilla);
  const celdas = sueloDeLaLosa(losa, giro);
  const obligadas: PuestaEnLaLosa[] = [];
  const relleno: PuestaEnLaLosa[] = [];
  const aMundo = (f: number): number => f * LADO_DE_LOSA;
  const paso = 1 / CELDAS_POR_LOSA;
  const claseEn = (i: number, j: number): ClaseDeSuelo | null => {
    if (i < 0 || j < 0 || i >= CELDAS_POR_LOSA || j >= CELDAS_POR_LOSA) return null;
    return (celdas[j * CELDAS_POR_LOSA + i] as CeldaDeSuelo).clase;
  };

  /* ── 1 · Las murallas, con sus puertas y sus torres ──────────────────────── */
  const tramos = murallasDeLaLosa(losa, giro, celdas);
  for (const t of tramos) {
    /*
     * ═══ UN PICO DE VILLA DE UNA CELDA NO LLEVA MURALLA ═══
     *
     * El borde de una villa, recorrido celda a celda, deja escalones de una o dos
     * celdas en las diagonales. Un `muro` del pack cubre siete, así que ahí había que
     * encogerlo al catorce por ciento: un tramo de muralla con las piedras aplastadas
     * a un séptimo, que se ve como un sillar derretido. Y no tapa nada que se note:
     * son tres metros y medio de linde en una losa de ciento setenta y cinco.
     */
    if (t.celdas < CELDAS_MINIMAS_DE_MURO) continue;
    const cuantos = Math.max(1, Math.round(t.celdas / CELDAS_POR_MURO));
    const porMuro = t.celdas / cuantos;
    for (let k = 0; k < cuantos; k++) {
      const centro = (t.desde + porMuro * (k + 0.5)) * paso - 0.5;
      const borde = (t.fija + (t.haciaDonde === 0 || t.haciaDonde === 3 ? 0 : 1)) * paso - 0.5;
      const porFilas = t.haciaDonde === 0 || t.haciaDonde === 2;
      const p: Punto = porFilas ? { x: centro, z: borde } : { x: borde, z: centro };
      /*
       * ═══ DONDE UNA SENDA LLEGA A LA MURALLA, HAY PUERTA ═══
       *
       * Y no un lienzo ciego. Un camino que muere contra una tapia es lo que se ve
       * cuando nadie ha mirado el dibujo: en la mesa, el camino entra en la villa
       * por su puerta, y ése es el remate que cuenta que la villa y el camino son
       * de la misma losa.
       */
      const esPuerta = cercaDeUnaSenda(losa, giro, p, ANCHO_DE_LA_SENDA * 0.9);
      obligadas.push({
        pieza: esPuerta ? MODELO.muroPuerta : MODELO.muro,
        x: aMundo(p.x),
        z: aMundo(p.z),
        y: 0,
        giro: giroDelLado(t.haciaDonde),
        escala: ESCALA_DE_LA_MURALLA,
        largo: porMuro / CELDAS_POR_MURO,
        porque: 'muralla',
        menuda: false,
      });
    }
  }

  /*
   * Y las torres: una en cada extremo de los tramos más largos. Un recinto sin
   * torres es una tapia; con ellas se lee de lejos como una villa amurallada, que
   * es lo que la regla dice que es.
   */
  const largos = [...tramos].sort((a, b) => b.celdas - a.celdas).slice(0, 3);
  for (const t of largos) {
    if (t.celdas < 5) continue;
    const porFilas = t.haciaDonde === 0 || t.haciaDonde === 2;
    const borde = (t.fija + (t.haciaDonde === 0 || t.haciaDonde === 3 ? 0 : 1)) * paso - 0.5;
    for (const extremo of [t.desde, t.desde + t.celdas]) {
      const a = extremo * paso - 0.5;
      const p: Punto = porFilas ? { x: a, z: borde } : { x: borde, z: a };
      if (obligadas.some((o) => o.porque === 'remate' && cerca(o, p, aMundo(paso * 4)))) continue;
      obligadas.push({
        pieza: tirada() < 0.62 ? MODELO.atalaya : MODELO.vigia,
        x: aMundo(p.x),
        z: aMundo(p.z),
        y: 0,
        giro: giroDelLado(t.haciaDonde),
        escala: ESCALA_DE_LA_TORRE,
        largo: 1,
        porque: 'remate',
        menuda: false,
      });
    }
  }

  /* ── 2 · La ermita, que es una regla entera ─────────────────────────────── */
  if (losa.ermita) {
    obligadas.push({
      pieza: MODELO.ermita,
      x: 0,
      z: 0,
      y: 0,
      giro: (Math.PI / 2) * Math.floor(tirada() * 4),
      escala: ESCALA_DE_LA_ERMITA,
      largo: 1,
      porque: 'ermita',
      menuda: false,
    });
    /*
     * Con su cerca y su pozo, que es lo que la hace un SITIO y no un edificio
     * suelto en medio de un campo. La cerca se salta el lado por el que entra la
     * senda: una tapia cruzada por el camino es una tapia que nadie miró.
     */
    for (const lado of [0, 1, 2, 3] as const) {
      const hayCamino = losa.sendas.some(
        (s) => s.lados.map((l) => ladoGirado(l, giro)).indexOf(lado) >= 0,
      );
      if (hayCamino) continue;
      const m = medioDelLado(lado);
      for (let k = -2; k <= 2; k++) {
        const a = k * paso * 3;
        const p: Punto = lado === 0 || lado === 2 ? { x: a, z: m.z * 0.26 } : { x: m.x * 0.26, z: a };
        relleno.push({
          pieza: MODELO.valla,
          x: aMundo(p.x),
          z: aMundo(p.z),
          y: 0,
          giro: giroDelLado(lado) + Math.PI / 2,
          escala: 1.6,
          largo: 1.7,
          porque: 'ermita',
          menuda: false,
        });
      }
    }
    relleno.push({
      pieza: MODELO.pozo,
      x: aMundo(0.11),
      z: aMundo(0.1),
      y: 0,
      giro: tirada() * Math.PI * 2,
      escala: 1.8,
      largo: 1,
      porque: 'ermita',
      menuda: false,
    });
  }

  /* ── 3 · La villa: plaza, manzanas y calles ─────────────────────────────── */
  const deVilla = celdas.filter((c) => c.clase === 'villa');
  if (deVilla.length > 0) {
    const junta = juntaDeLaVilla(losa.villas[0]?.lados.map((l) => ladoGirado(l, giro)) ?? []);
    const plaza = mejorCelda(deVilla, junta);
    const radioDeLaPlaza = paso * 4.5;

    obligadas.push({
      pieza: LO_QUE_MANDA[Math.floor(tirada() * LO_QUE_MANDA.length)] as string,
      x: aMundo(plaza.x),
      z: aMundo(plaza.z),
      y: 0,
      giro: (Math.PI / 2) * Math.floor(tirada() * 4),
      escala: ESCALA_DEL_QUE_MANDA,
      largo: 1,
      porque: 'villa',
      menuda: false,
    });

    /* Lo que hay en una plaza: un pozo, un carro, unos puestos. */
    const cuantosDeLaPlaza = 3 + Math.floor(tirada() * 4);
    for (let k = 0; k < cuantosDeLaPlaza; k++) {
      const que = unoDe(LO_DE_LA_PLAZA, tirada);
      const angulo = tirada() * Math.PI * 2;
      const radio = radioDeLaPlaza * (0.55 + tirada() * 0.4);
      const p = { x: plaza.x + Math.sin(angulo) * radio, z: plaza.z + Math.cos(angulo) * radio };
      const i = Math.floor((p.x + 0.5) * CELDAS_POR_LOSA);
      const j = Math.floor((p.z + 0.5) * CELDAS_POR_LOSA);
      if (claseEn(i, j) !== 'villa') continue;
      relleno.push({
        pieza: que.pieza,
        x: aMundo(p.x),
        z: aMundo(p.z),
        y: 0,
        giro: tirada() * Math.PI * 2,
        escala: que.escala * 1.6,
        largo: 1,
        porque: 'villa',
        menuda: false,
      });
    }

    /*
     * ═══ LAS MANZANAS Y LAS CALLES ═══
     *
     * Las casas no se sortean por la villa entera: se ponen DENTRO de manzanas, con
     * calles entre ellas. La diferencia se ve a la primera —una villa con calles se
     * lee como un sitio por el que se anda, y un montón de casas sorteadas se lee
     * como un campamento— y además es lo que hace que el paseo en primera persona
     * tenga sentido dentro de una villa.
     */
    const pasoDeManzana = CELDAS_DE_MANZANA + CELDAS_DE_CALLE;
    const desplaza = Math.floor(tirada() * pasoDeManzana);

    /*
     * ═══ PRIMERO SE RECOGEN TODOS LOS SOLARES Y LUEGO SE ELIGEN DOCE ═══
     *
     * La primera versión iba poniendo casas según recorría y paraba al llegar al
     * tope, y eso llenaba las manzanas del NOROESTE y dejaba el resto de la villa
     * empedrada y vacía: la esquina por la que empieza el bucle salía como un casco
     * viejo y el resto como una explanada. No lo dice ningún comprobador —doce casas
     * son doce casas, estén donde estén— y se ve a la primera.
     *
     * Recogiendo todos los solares posibles y tomando uno de cada `salto`, las doce
     * quedan repartidas por la villa entera, sea del tamaño que sea.
     */
    const solares: { readonly i: number; readonly j: number }[] = [];
    for (let j = 0; j < CELDAS_POR_LOSA; j += 2) {
      for (let i = 0; i < CELDAS_POR_LOSA; i += 2) {
        if (claseEn(i, j) !== 'villa') continue;
        /*
         * Y no pegada a la muralla: entre el lienzo y la primera casa hay una RONDA,
         * que es la calle que rodea por dentro un recinto amurallado. Sin ella las
         * casas salen incrustadas en el muro, que no pasa en ninguna villa y se ve a
         * la primera desde la cámara de mesa.
         */
        if (
          claseEn(i - 2, j) !== 'villa' ||
          claseEn(i + 2, j) !== 'villa' ||
          claseEn(i, j - 2) !== 'villa' ||
          claseEn(i, j + 2) !== 'villa'
        ) {
          continue;
        }
        /* En la calle no se construye. */
        if ((i + desplaza) % pasoDeManzana >= CELDAS_DE_MANZANA) continue;
        if ((j + desplaza) % pasoDeManzana >= CELDAS_DE_MANZANA) continue;
        const centro = centroDeCelda(i, j);
        /* Ni en la plaza, que es el hueco que deja ver el edificio que manda. */
        if (distanciaAlSegmento(centro, plaza, plaza) < radioDeLaPlaza * radioDeLaPlaza) continue;
        solares.push({ i, j });
      }
    }

    const cuantas = Math.min(TOPE_DE_CASAS, solares.length);
    const salto = cuantas === 0 ? 1 : Math.max(1, Math.floor(solares.length / cuantas));
    for (let k = 0; k < cuantas; k++) {
      const solar = solares[Math.min(solares.length - 1, k * salto + Math.floor(tirada() * salto))];
      if (solar === undefined) continue;
      const centro = centroDeCelda(solar.i, solar.j);
      const donde = {
        x: centro.x + (tirada() - 0.5) * paso * 0.9,
        z: centro.z + (tirada() - 0.5) * paso * 0.9,
      };
      if (relleno.some((p) => cerca(p, donde, aMundo(paso * 1.8)))) continue;
      const grande = tirada() < 0.12;
      relleno.push({
        pieza: grande
          ? (LO_QUE_ACOMPANA[Math.floor(tirada() * LO_QUE_ACOMPANA.length)] as string)
          : MODELO.casa,
        x: aMundo(donde.x),
        z: aMundo(donde.z),
        y: 0,
        giro: (Math.PI / 2) * Math.floor(tirada() * 4),
        escala: ESCALA_DE_LA_CASA * (grande ? 1.05 : 1) * (0.92 + tirada() * 0.22),
        largo: 1,
        porque: 'villa',
        menuda: false,
      });
    }
  }

  /* ── 4 · Lo que acompaña a una senda ────────────────────────────────────── */
  for (let j = 0; j < CELDAS_POR_LOSA; j += 2) {
    for (let i = 0; i < CELDAS_POR_LOSA; i += 2) {
      if (claseEn(i, j) !== 'prado') continue;
      const centro = centroDeCelda(i, j);
      if (!alLadoDeLaSenda(losa, giro, centro)) continue;
      if (tirada() > 0.34) continue;
      const que = unoDe(LO_DE_LA_SENDA, tirada);
      /*
       * ═══ UNA VALLA SIGUE AL CAMINO, NO AL AZAR ═══
       *
       * La primera versión giraba todo lo de la senda con un ángulo sorteado, y las
       * vallas salían clavadas de través en mitad del prado como aspas. Una valla es
       * lo único de esta lista que tiene UNA dirección correcta —la del camino al
       * que acompaña— y por eso se le pregunta al camino. Lo demás —una piedra, un
       * barril, un tocón— no tiene derecho ni revés y sigue sorteándose.
       */
      const esValla = que.pieza === MODELO.valla;
      const suyo = esValla ? rumboDeLaSendaCerca(losa, giro, centro) : tirada() * Math.PI * 2;
      relleno.push({
        pieza: que.pieza,
        x: aMundo(centro.x + (tirada() - 0.5) * paso * 0.5),
        z: aMundo(centro.z + (tirada() - 0.5) * paso * 0.5),
        y: 0,
        giro: suyo,
        escala: esValla ? 1.6 : 1.5,
        largo: esValla ? 1.8 : 1,
        porque: 'senda',
        menuda: false,
      });
    }
  }

  /* ── 5 · El prado, partido en parcelas con sus lindes ───────────────────── */
  const desplazaParcela = Math.floor(tirada() * CELDAS_POR_PARCELA);
  for (let j = 0; j < CELDAS_POR_LOSA && relleno.length < PIEZAS_POR_LOSA; j++) {
    for (let i = 0; i < CELDAS_POR_LOSA && relleno.length < PIEZAS_POR_LOSA; i++) {
      if (claseEn(i, j) !== 'prado') continue;
      const centro = centroDeCelda(i, j);
      if (alLadoDeLaSenda(losa, giro, centro)) continue;

      const mia = parcelaDe(i, j, desplazaParcela);
      const uso = usoDeLaParcela(mia.a, mia.b, semilla);

      /*
       * ═══ EL SETO DE LA LINDE, QUE ES DE DONDE LE VIENE EL NOMBRE AL JUEGO ═══
       *
       * Donde una parcela toca a otra distinta, hay seto. Es lo que convierte una
       * alfombra verde con árboles sueltos en un campo trabajado — y es literalmente
       * lo que el juego se llama: la raya entre dos campos.
       */
      const alEste = parcelaDe(i + 1, j, desplazaParcela);
      const alSur = parcelaDe(i, j + 1, desplazaParcela);
      const cambiaAlEste = (alEste.a !== mia.a || alEste.b !== mia.b) && claseEn(i + 1, j) === 'prado';
      const cambiaAlSur = (alSur.a !== mia.a || alSur.b !== mia.b) && claseEn(i, j + 1) === 'prado';
      /*
       * Una valla cada `CELDAS_POR_SETO` y NI UNA MÁS: es exactamente lo que mide la
       * pieza, así que el seto sale continuo y sin montarse. Con una cada tres celdas
       * y estirada, que es lo que había, salían tres vallas por sitio y el campo se
       * veía rayado. El cálculo está en `medidas.ts`, junto al de la muralla, porque
       * es el mismo problema: cubrir una raya con una pieza de largo conocido.
       */
      if (cambiaAlEste && j % CELDAS_POR_SETO === 0) {
        const m = medioDelLado(1);
        const medio = centroDeCelda(i, j + (CELDAS_POR_SETO - 1) / 2);
        relleno.push({
          pieza: tirada() < 0.88 ? MODELO.valla : MODELO.vallaPuerta,
          x: aMundo(centro.x + m.x * paso),
          z: aMundo(medio.z),
          y: 0,
          giro: giroDelLado(1) + Math.PI / 2,
          escala: ESCALA_DEL_SETO,
          largo: 1,
          porque: 'prado',
          menuda: false,
        });
        continue;
      }
      if (cambiaAlSur && i % CELDAS_POR_SETO === 0) {
        const m = medioDelLado(2);
        const medio = centroDeCelda(i + (CELDAS_POR_SETO - 1) / 2, j);
        relleno.push({
          pieza: tirada() < 0.88 ? MODELO.valla : MODELO.vallaPuerta,
          x: aMundo(medio.x),
          z: aMundo(centro.z + m.z * paso),
          y: 0,
          giro: giroDelLado(2) + Math.PI / 2,
          escala: ESCALA_DEL_SETO,
          largo: 1,
          porque: 'prado',
          menuda: false,
        });
        continue;
      }

      const cada = PASO_DE_LA_PARCELA[uso] ?? 4;
      if (i % cada !== 0 || j % cada !== 0) continue;
      if (tirada() > 0.7) continue;
      const lista =
        LO_DE_LA_PARCELA[uso] ??
        (LO_DE_LA_PARCELA['pasto'] as readonly { pieza: string; peso: number; escala: number }[]);
      const que = unoDe(lista, tirada);
      const escala = que.escala * (1.7 + tirada() * 0.5);
      const donde = {
        x: centro.x + (tirada() - 0.5) * paso * 1.4,
        z: centro.z + (tirada() - 0.5) * paso * 1.4,
      };
      /*
       * LA SEPARACIÓN SALE DE LO QUE MIDE LA PIEZA, y no de un número fijo. Un
       * trigal ocupa veinte unidades y un tocón dos: con la misma separación para
       * los dos, o el campo sale rayado de trigales montados o sale vacío de
       * tocones. Ver `ANCHO_EN_PACK`, que es de donde salen los veinte.
       */
      const suyo = loQueOcupa(que.pieza, escala);
      if (relleno.some((p) => cerca(p, donde, (suyo + loQueOcupa(p.pieza, p.escala)) * 0.45))) continue;
      relleno.push({
        pieza: que.pieza,
        x: aMundo(donde.x),
        z: aMundo(donde.z),
        y: 0,
        giro: tirada() * Math.PI * 2,
        escala,
        largo: 1,
        porque: 'prado',
        menuda: false,
      });
    }
  }

  /*
   * `menuda` se pone aquí, al final y de una vez, y no en cada una de las nueve
   * veces que este fichero empuja una pieza. Repetirlo nueve veces es nueve sitios
   * donde se puede olvidar, y el que se olvide no da error: deja un barril
   * dibujándose a media legua.
   */
  /*
   * ═══ Y NADA SE SALE DE SU LOSA ═══
   *
   * El empujón al azar que separa las piezas —hasta una celda y media— saca del canto
   * a las que caen en la fila del borde. Son unos centímetros y no se ven en una losa
   * suelta; en el tablero se ven como un árbol plantado en la losa de al lado, que es
   * lo mismo que un árbol que aparece y desaparece cuando alguien pone una losa.
   *
   * Se acota aquí, al final y de una vez, y no en cada uno de los nueve sitios donde
   * se empuja una pieza: por lo mismo que `menuda`, nueve copias son nueve sitios
   * donde olvidarse.
   */
  const media = LADO_DE_LOSA / 2;
  const acotar = (v: number): number => (v < -media ? -media : v > media ? media : v);
  /*
   * Y NADA ACABA DENTRO DE UNA CELDA DE CAMINO. El empujón al azar que separa las
   * piezas puede meter en la calzada lo que se puso a su vera; se quita aquí, al
   * final, mirando la celda donde de verdad ha caído. Las murallas y sus remates se
   * salvan: una puerta en mitad del camino es lo que es una puerta.
   */
  const enCamino = (p: PuestaEnLaLosa): boolean => {
    if (p.porque === 'muralla' || p.porque === 'remate' || p.porque === 'ermita') return false;
    const i = Math.min(
      CELDAS_POR_LOSA - 1,
      Math.max(0, Math.floor((p.x / LADO_DE_LOSA + 0.5) * CELDAS_POR_LOSA)),
    );
    const j = Math.min(
      CELDAS_POR_LOSA - 1,
      Math.max(0, Math.floor((p.z / LADO_DE_LOSA + 0.5) * CELDAS_POR_LOSA)),
    );
    return claseEn(i, j) === 'senda';
  };
  const conTalla = (p: PuestaEnLaLosa): PuestaEnLaLosa => ({
    ...p,
    x: acotar(p.x),
    z: acotar(p.z),
    menuda: esMenuda(p.pieza),
  });
  return {
    celdas,
    puestas: [...obligadas, ...relleno.slice(0, PIEZAS_POR_LOSA)].map(conTalla).filter((p) => !enCamino(p)),
  };
}

/** ¿Están estas dos cosas más cerca que `cuanto`? Para no amontonar piezas. */
function cerca(p: PuestaEnLaLosa, donde: Punto, cuanto: number): boolean {
  const dx = p.x - donde.x * LADO_DE_LOSA;
  const dz = p.z - donde.z * LADO_DE_LOSA;
  return dx * dx + dz * dz < cuanto * cuanto;
}

/** ¿Pasa una senda a menos de esto de este punto? */
function cercaDeUnaSenda(losa: Losa, giro: Giro, p: Punto, cuanto: number): boolean {
  for (const senda of losa.sendas) {
    const camino = caminoDeLaSenda(senda.lados.map((l) => ladoGirado(l, giro)));
    for (let i = 0; i + 1 < camino.length; i++) {
      if (distanciaAlSegmento(p, camino[i] as Punto, camino[i + 1] as Punto) <= cuanto * cuanto) {
        return true;
      }
    }
  }
  return false;
}

/**
 * HACIA DÓNDE VA LA SENDA MÁS CERCANA A UN PUNTO.
 *
 * Devuelve el ángulo del tramo más cercano, para que lo que se pone al lado del
 * camino —una valla— vaya paralelo a él. El arcotangente está permitido aquí: esto
 * es el giro de una pieza en una pantalla, no un estado que se compare entre dos
 * aparatos. Ver la cabecera de `paseo.ts`, donde está el razonamiento entero.
 */
function rumboDeLaSendaCerca(losa: Losa, giro: Giro, p: Punto): number {
  let mejor = Number.POSITIVE_INFINITY;
  let rumbo = 0;
  for (const senda of losa.sendas) {
    const camino = caminoDeLaSenda(senda.lados.map((l) => ladoGirado(l, giro)));
    for (let i = 0; i + 1 < camino.length; i++) {
      const a = camino[i] as Punto;
      const b = camino[i + 1] as Punto;
      const d = distanciaAlSegmento(p, a, b);
      if (d >= mejor) continue;
      mejor = d;
      rumbo = Math.atan2(b.x - a.x, -(b.z - a.z));
    }
  }
  return rumbo;
}

/** ¿Está esta celda pegada a una senda? */
function alLadoDeLaSenda(losa: Losa, giro: Giro, p: Punto): boolean {
  return cercaDeUnaSenda(losa, giro, p, ANCHO_DE_LA_SENDA / 2 + 2.2 / CELDAS_POR_LOSA);
}

/** La celda de la lista que está más cerca de un punto. */
function mejorCelda(celdas: readonly CeldaDeSuelo[], hacia: Punto): Punto {
  let mejor = centroDeCelda((celdas[0] as CeldaDeSuelo).i, (celdas[0] as CeldaDeSuelo).j);
  let corta = distanciaAlSegmento(mejor, hacia, hacia);
  for (const c of celdas) {
    const p = centroDeCelda(c.i, c.j);
    const d = distanciaAlSegmento(p, hacia, hacia);
    if (d < corta) {
      corta = d;
      mejor = p;
    }
  }
  return mejor;
}

/**
 * EL GIRO DE UNA PIEZA QUE MIRA A UN LADO.
 *
 * El pack trae las piezas mirando al SUR —es la convención de `escenas/burgo`— y el
 * norte del tablero es la `z` negativa. De ahí salen los cuatro cuartos, y se
 * escriben a mano y no con una vuelta de trigonometría: son cuatro constantes, y un
 * seno mal redondeado deja un muro un grado torcido que no se ve hasta que hay seis
 * en fila.
 */
export function giroDelLado(l: Lado): number {
  if (l === 0) return Math.PI;
  if (l === 1) return -Math.PI / 2;
  if (l === 2) return 0;
  return Math.PI / 2;
}
