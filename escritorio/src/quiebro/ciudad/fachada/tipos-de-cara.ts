/**
 * LO QUE COMPARTEN LOS ESCRITORES DE LA FACHADA (`fachada/*.ts`): qué es cada cara para el sombreador, qué hay
 * en su planta baja, el hueco de cada estilo, la cara de un volumen con lo que la toca, y las opciones con que
 * se escribe. Tipos y tablas, sin geometría.
 *
 * ═══ EL GRADO ═══
 *
 * La celda de la ventana se escribe con un GRADO de detalle (1, el más barato; 3, el más fino) que decide
 * `celdas.ts` por la distancia a la celda del centro, y que no cambia nunca cerca de la cámara (§3.1 del plan
 * de obra del detalle). `fachadasPorPartes` lo recibe en sus opciones y se lo pasa SIN TOCARLO, en la
 * `ObraDeLaFachada`, a cada escritor: el remate, los balcones, el bajo, el soportal, el ritmo, las torres y
 * los remates de hueco. Hoy ninguno lo mira: el grado entra en la ola 1 del plan para que las siguientes lo
 * usen sin tocar la firma.
 */
import type { BajoDeLaFachada, EstiloDeFachada, FachadaDelPlano, Orientacion, Volumen } from '../tipos';

/** El grado del detalle con que se escribe una celda (ver la cabecera). */
export type GradoDeLaFachada = 1 | 2 | 3;

/** El grado de quien no lo dice (la LOD1, el barrio): el más barato. Hoy da igual: nadie lo mira. */
export const GRADO_POR_DEFECTO: GradoDeLaFachada = 1;

/** Con qué se escribe: lo que llega de fuera a cada escritor, tal cual. */
export interface ObraDeLaFachada {
  /** Cornisas, pretiles, impostas, balcones y azoteas. */
  readonly relieve: boolean;
  readonly grado: GradoDeLaFachada;
}

/** El hueco de cada estilo en fracciones del vano y de la planta: [x0, x1, y0, y1]. Igual que `huecoQ` (`glsl-comun.ts`). */
export const HUECO_DEL_ESTILO: Readonly<Record<EstiloDeFachada, readonly [number, number, number, number]>> = {
  piedra: [0.3, 0.7, 0.1, 0.84],
  ladrillo: [0.28, 0.72, 0.22, 0.8],
  hormigon: [0.08, 0.92, 0.28, 0.78],
  vidrio: [0.04, 0.96, 0.04, 0.8],
  revoco: [0.3, 0.7, 0.1, 0.84],
  azulejo: [0.3, 0.7, 0.14, 0.82],
};

/** Qué es cada cara, como lo lee el sombreador en `aCara.w`. */
export const TIPO = { fachada: 0, medianera: 1, relieve: 2, tejado: 3, barandilla: 4, techoDeSoportal: 5 } as const;

/**
 * El SUBTIPO de una pieza de relieve, en `aCara.z` (que en el relieve de `cajaDeRelieve` no es semilla). Hoy
 * todo es 0 y el sombreador no lo lee; la numeración es la del plan de obra, para que quien ponga una pieza y
 * quien la pinte digan lo mismo. Ojo: la losa de un balcón escribe hoy en `aCara.z` la semilla de su cara.
 */
export const SUBTIPO_DE_RELIEVE = { ninguno: 0, cornisa: 1, imposta: 2, pretil: 3, losaDeBalcon: 4, pilar: 5, caseta: 6, viga: 7 } as const;

/** Qué hay en la planta baja, en `aPlanta.y`. `sinCalle`: una cara que no da a ninguna calle. */
export const BAJO: Readonly<Record<BajoDeLaFachada | 'sinCalle', number>> = { tiendas: 0, portales: 1, soportal: 2, sinCalle: 3 };

/** Los atributos del molde de las fachadas. */
export const ATRIBUTOS_DE_LA_FACHADA = { aCara: 4, aVolumen: 4, aPlanta: 2 } as const;

/** Una ventana encendida en las plantas bajas, o un escaparate: de aquí salen reflejos y luz. */
export interface VentanaEncendida {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly color: readonly [number, number, number];
  readonly escaparate: boolean;
  /** Hacia fuera de la fachada, en planta. */
  readonly normal: readonly [number, number];
}

export interface OpcionesDeLasFachadas {
  /** Cornisas, pretiles, impostas, balcones y azoteas. */
  readonly relieve: boolean;
  /** El grado de la celda (ver la cabecera). Sin él, `GRADO_POR_DEFECTO`. */
  readonly grado?: GradoDeLaFachada;
  /** Recoger ventanas encendidas y escaparates (para las tarjetas y la luz horneada). */
  readonly ventanas: boolean;
  /**
   * Volúmenes que NO se escriben pero tapan: los de los edificios de al lado que van en otra celda (el
   * cerco es una fila continua de fachadas partida en las rayas de las celdas). Sin ellos, la cara que da
   * al vecino de la otra celda saldría con ventanas en vez de medianera.
   */
  readonly vecinos?: readonly Volumen[];
}

/** Una cara de un volumen: un plano vertical con su tramo a lo largo y en alto. */
export interface Cara {
  readonly mira: Orientacion;
  /** Coordenada del plano de la cara (x para e/o, z para n/s). */
  readonly plano: number;
  /** Tramo a lo largo de la cara, en coordenada creciente del otro eje. */
  readonly desde: number;
  readonly hasta: number;
  readonly y0: number;
  readonly y1: number;
}

/** Lo que se da por pegado (y lo que se da por hueco) al comparar caras, en metros. */
export const EPS = 0.05;

/** El tramo de una cara que tapa otro volumen pegado a ella por detrás. */
export interface Toque {
  readonly desde: number;
  readonly hasta: number;
  readonly y0: number;
  readonly y1: number;
}

/** Qué cara de qué volumen es: lo que piden las reglas que van por cara (`tieneBalcon`). */
export interface QueCara {
  readonly mira: Orientacion;
  /** El índice del volumen en su edificio (0 es la planta baja). */
  readonly indice: number;
}

/** UNA CARA DE UN VOLUMEN DE UN EDIFICIO, con lo que sus escritores necesitan saber de ella. */
export interface CaraDelVolumen extends QueCara {
  readonly volumen: Volumen;
  readonly cara: Cara;
  /** Entera y menor que 2^16: la del atributo y la del hash (`semillaDeLaCara`). */
  readonly semilla: number;
  /** La fachada de calle de esa orientación, si la tiene (`undefined`: la cara no da a ninguna calle). */
  readonly fachada: FachadaDelPlano | undefined;
  /** Los tramos que le tapan los volúmenes pegados, suyos o de los vecinos. */
  readonly toques: readonly Toque[];
}

/** Un punto de una azotea, en el mundo (`respiraderosDe`). */
export interface PuntoDeAzotea {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Los hitos del §2.7 de `CIUDAD-ABIERTA.md` que van sobre un edificio (`hitoDe`). */
export type HitoDeLaCiudad = 'reloj' | 'chimenea' | 'cupula';
