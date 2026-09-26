/**
 * LO QUE LA CIUDAD NECESITA SABER PARA PINTARSE, y los niveles de detalle. Sin `three`.
 *
 * ═══ POR QUÉ UN PLANO PROPIO Y NO EL `Barrio` A PELO ═══
 *
 * El barrio (`shared/arcade/juegos/quiebro-barrio.ts`) es de otro frente, y su forma es la que
 * necesitan la sala y el servidor: cajas con índice, zonas, grafo, rumbos de 256. La de un pintor es
 * otra: qué volúmenes tiene un edificio ya con sus retranqueos hechos, hacia dónde mira una cara en
 * N/S/E/O, qué color lineal tiene un rótulo. Entre los dos va UN traductor (`plano.ts`) y la ciudad
 * entera se construye desde ESTE plano. El día que el barrio cambie un nombre se toca el traductor,
 * no seis constructores; y el comprobador puede fabricar planos raros sin pasar por el barrio.
 *
 * ═══ LA ESTRUCTURA NO ES DEL NIVEL ═══
 *
 * `estructura` son las cajas con las que se choca, copiadas del barrio tal cual. Salen IGUAL en
 * todos los niveles, y el comprobador exige que cada una tenga algo pintado encima y que nada de lo
 * pintado que estorba al paso quede fuera de ellas. El nivel sólo quita o pone ADORNO.
 *
 * Ejes: `x` al este, `z` al sur, `y` arriba; metros; origen en el centro de la glorieta.
 */
import type { IdDeDistrito } from '../../../../shared/arcade/juegos/quiebro-ciudad';

/** Los cuatro niveles de detalle del diseño (§8): N0 Android modesto … N3 PC con gráfica. */
export type NivelDeLaCiudad = 0 | 1 | 2 | 3;
export const NIVELES_DE_LA_CIUDAD: readonly NivelDeLaCiudad[] = [0, 1, 2, 3];

/**
 * EL GRADO de lo que se escribe en una celda (1 el más sencillo, 3 el más fino): dentro de un nivel, cuánto
 * detalle lleva cada celda de la ventana según lo lejos que está del centro. Lo decide `grados.ts`, y cada
 * escritor de piezas lo lee de su obra (`ObraDeLaCelda` de `celdas.ts`).
 */
export type GradoDeLaCelda = 1 | 2 | 3;

/** Una caja en planta, alineada con los ejes. `x0 < x1`, `z0 < z1`. */
export interface CajaXZ {
  readonly x0: number;
  readonly z0: number;
  readonly x1: number;
  readonly z1: number;
}

/** Un volumen de edificio: una caja en planta con su altura de arranque y de remate. */
export interface Volumen extends CajaXZ {
  readonly y0: number;
  readonly y1: number;
}

/** Los estilos del barrio, con sus nombres. */
export type EstiloDeFachada = 'piedra' | 'ladrillo' | 'hormigon' | 'vidrio' | 'revoco' | 'azulejo';
export const ESTILOS_DE_FACHADA: readonly EstiloDeFachada[] = ['piedra', 'ladrillo', 'hormigon', 'vidrio', 'revoco', 'azulejo'];

/** Hacia dónde mira una cara, un rótulo, un banco o una cabina. */
export type Orientacion = 'n' | 's' | 'e' | 'o';

/** Qué hay en la planta baja de una fachada. */
export type BajoDeLaFachada = 'tiendas' | 'portales' | 'soportal';

export interface FachadaDelPlano {
  readonly mira: Orientacion;
  readonly bajo: BajoDeLaFachada;
}

export interface EdificioDelPlano {
  /** Todo el solar del edificio (las plantas de arriba vuelan sobre el soportal). */
  readonly huella: CajaXZ;
  /** La caja con la que se choca: la planta baja (sin el fondo del soportal). */
  readonly caja: CajaXZ;
  /** De abajo arriba. El primero arranca en 0; los demás pueden ser retranqueos. */
  readonly volumenes: readonly Volumen[];
  readonly estilo: EstiloDeFachada;
  /** De 0 a 1: la variante de color dentro del estilo. */
  readonly tono: number;
  /** Cada cuánto hay una ventana, en metros (el sombreador reparte la cara en vanos enteros). */
  readonly vano: number;
  readonly balcones: boolean;
  /** La altura de la planta baja y la de las demás plantas, en metros. */
  readonly plantaBaja: number;
  readonly alturaDePlanta: number;
  /** Las caras que dan a la calle, con lo que hay en su bajo. */
  readonly fachadas: readonly FachadaDelPlano[];
  /**
   * Los soportales: la cara de cada uno y lo que se mete. El barrio pone uno como mucho; la ciudad, uno
   * por cara que lo lleve (`EdificioDeLaCiudad.soportales`).
   */
  readonly soportales: readonly { readonly mira: Orientacion; readonly fondo: number }[];
  /** Los pilares del soportal (estructura). */
  readonly pilares: readonly CajaXZ[];
  /** Entero no negativo: siembra ventanas, colores y tiendas. */
  readonly semilla: number;
  /**
   * El distrito de la ciudad al que pertenece (el de su hueco, como lo da la mesa). No lo tienen los edificios del
   * barrio viejo ni los de detrás del cerco: ahí falta. Lo lee `hitoDe` (la chimenea de las Naves, la cúpula de la Lonja).
   */
  readonly distrito?: IdDeDistrito;
}

export interface RotuloDelPlano {
  readonly texto: string;
  /** El centro del rótulo, pegado a la fachada. */
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Hacia dónde mira la fachada que lo lleva. */
  readonly mira: Orientacion;
  readonly ancho: number;
  readonly alto: number;
  /** 0xRRGGBB, en sRGB (como lo escribe el barrio). */
  readonly color: number;
  /** `fachada`: plano sobre el muro. `bandera`: perpendicular al muro, se lee desde la calle. */
  readonly forma: 'fachada' | 'bandera';
  readonly parpadea: boolean;
}

export type TipoDeCoche = 'turismo' | 'taxi' | 'furgoneta';
export const TIPOS_DE_COCHE: readonly TipoDeCoche[] = ['turismo', 'taxi', 'furgoneta'];

export interface CocheDelPlano {
  readonly tipo: TipoDeCoche;
  /** La caja con la que se choca; el coche se pinta centrado en ella y a lo largo de su lado largo. */
  readonly caja: CajaXZ;
  /** Hacia dónde apunta el morro. */
  readonly mira: Orientacion;
  readonly semilla: number;
}

export interface CabinaDelPlano {
  readonly x: number;
  readonly z: number;
  /** Hacia dónde mira el aparato (quien descuelga se pone delante, mirándolo). */
  readonly mira: Orientacion;
  readonly refugio: boolean;
  readonly caja: CajaXZ;
}

export interface FarolaDelPlano {
  readonly x: number;
  readonly z: number;
  /** La altura de la cabeza de luz sobre la acera. */
  readonly altura: number;
  /** Hacia dónde sale el brazo sobre la calzada; `null` si es de plaza (farol en lo alto). */
  readonly brazo: Orientacion | null;
  readonly caja: CajaXZ;
}

/** Algo con caja y un frente: banco, quiosco de prensa, quiosco de la plaza. */
export interface PiezaConFrente {
  readonly caja: CajaXZ;
  readonly mira: Orientacion;
}

export interface FuenteDelPlano {
  readonly x: number;
  readonly z: number;
  readonly radio: number;
  readonly caja: CajaXZ;
}

/** El tren elevado. */
export interface TrenDelPlano {
  readonly eje: 'x' | 'z';
  /** La coordenada de la vía en el otro eje. */
  readonly linea: number;
  readonly desde: number;
  readonly hasta: number;
  /** Altura de la cara de ARRIBA de la viga (donde ruedan los coches). */
  readonly alto: number;
  /** Largo del tren. */
  readonly largo: number;
  readonly pilares: readonly CajaXZ[];
  /** Dónde va el tren en un tic de 20 Hz (o `null` si no está cruzando). */
  readonly enTic: (tic: number) => { readonly cabeza: number; readonly cola: number } | null;
}

export interface GlorietaDelPlano {
  /** El solar de la plaza. */
  readonly caja: CajaXZ;
  readonly quiosco: PiezaConFrente | null;
  readonly fuente: FuenteDelPlano | null;
  readonly bancos: readonly PiezaConFrente[];
}

/** Una calle entera: su eje y lo que ocupa entre fachadas (acera + calzada + acera). */
export interface CalleDelPlano {
  /** A lo largo de qué eje corre la calle. */
  readonly corre: 'x' | 'z';
  /** La coordenada del eje de la calle en el otro eje. */
  readonly en: number;
  readonly desde: number;
  readonly hasta: number;
  readonly acera: number;
  readonly calzada: number;
}

export type TiempoDelPlano = 'llovizna' | 'aguacero' | 'niebla';

export interface PlanoDeLaCiudad {
  readonly semilla: number;
  readonly nombre: string;
  readonly hora: string;
  readonly tiempo: TiempoDelPlano;
  /** El barrio jugable entero (el límite de la Llamada). */
  readonly limite: CajaXZ;
  /** Los solares edificables del barrio (sin el de la plaza). */
  readonly manzanas: readonly CajaXZ[];
  readonly calles: readonly CalleDelPlano[];
  readonly edificios: readonly EdificioDelPlano[];
  readonly glorieta: GlorietaDelPlano;
  readonly tren: TrenDelPlano | null;
  readonly rotulos: readonly RotuloDelPlano[];
  readonly coches: readonly CocheDelPlano[];
  readonly cabinas: readonly CabinaDelPlano[];
  readonly farolas: readonly FarolaDelPlano[];
  readonly quioscosDePrensa: readonly PiezaConFrente[];
  /** Las fachadas que cierran el barrio por fuera (estructura): las cubre el anillo de fuera. */
  readonly cerco: readonly CajaXZ[];
  /** Las vallas donde una calle sigue más allá del barrio (estructura). */
  readonly vallas: readonly CajaXZ[];
  /** TODAS las cajas con las que se choca, tal cual las declara el barrio. */
  readonly estructura: readonly CajaXZ[];
}

/* ─────────────────────────── Los números del suelo ─────────────────────────── */

/** Altura del bordillo: la acera y la plaza están a esto sobre la calzada. */
export const ALTURA_DE_LA_ACERA = 0.15;

/* ─────────────────────────── Lo que cambia con el nivel ─────────────────────────── */

/**
 * Lo que el nivel pone o quita. SÓLO adorno: la estructura, la niebla y lo que decide la partida no
 * están aquí a propósito.
 */
export interface DetalleDelNivel {
  /** Interiores falsos en las ventanas a menos de 60 m (N1+). */
  readonly interiores: boolean;
  /** Ondas de gota en los charcos (N1+). */
  readonly ondas: boolean;
  /** Rayas de lluvia. */
  readonly lluvia: number;
  /** Salpicaduras cerca de la cámara (N2+). */
  readonly salpicaduras: number;
  /** Luces puntuales reales recolocadas junto a la cámara (N2+). */
  readonly lucesReales: number;
  /** Lado del mapa de sombras de la luz principal; 0 sin sombras. */
  readonly sombras: number;
  /** Balcones, cornisas, pretiles y maquinaria de azotea. */
  readonly relieve: boolean;
  /**
   * La ciudad abierta: el relieve sólo en la celda del CENTRO de la ventana (N1, «3 × 3, con relieve hasta
   * 40 m», §5.7). Quien mira está a 30 m como mucho de ese centro, así que el relieve le llega hasta unos
   * 40-50 m; con él en las nueve celdas, los balcones eran 42.000 triángulos y N1 no cabía en su 50 %.
   */
  readonly relieveSoloEnElCentro: boolean;
  /** Coches con ruedas, retrovisores y faros, o la caja con cabina. */
  readonly cochesFinos: boolean;
  /** Coches en marcha por las avenidas de fuera. */
  readonly trafico: number;
  /** Conos de luz de las farolas en la niebla (N2+). */
  readonly haces: boolean;
  /** Bocas de alcantarilla que echan vapor. */
  readonly vapor: number;
  /** Tarjetas de reflejo de ventanas encendidas (además de farolas, neones y escaparates). */
  readonly reflejosDeVentanas: number;
  /** Lados de los cilindros (postes, ruedas, columnas). */
  readonly lados: number;
  /**
   * La ciudad abierta: el detalle y la LOD1 se funden con tramado en la franja del borde de la ventana de
   * celdas (N1+). En N0 no: el `discard` le quita al teléfono modesto el rechazo temprano por profundidad.
   */
  readonly fundido: boolean;
}

export const DETALLE_DEL_NIVEL: Readonly<Record<NivelDeLaCiudad, DetalleDelNivel>> = {
  0: {
    interiores: false,
    ondas: false,
    lluvia: 1000,
    salpicaduras: 0,
    lucesReales: 0,
    sombras: 0,
    relieve: false,
    relieveSoloEnElCentro: false,
    cochesFinos: false,
    trafico: 4,
    haces: false,
    vapor: 2,
    reflejosDeVentanas: 60,
    lados: 6,
    fundido: false,
  },
  1: {
    interiores: true,
    ondas: true,
    lluvia: 3000,
    salpicaduras: 0,
    lucesReales: 0,
    sombras: 0,
    relieve: true,
    relieveSoloEnElCentro: true,
    cochesFinos: true,
    trafico: 8,
    haces: false,
    vapor: 4,
    reflejosDeVentanas: 160,
    lados: 8,
    fundido: true,
  },
  2: {
    interiores: true,
    ondas: true,
    lluvia: 6000,
    salpicaduras: 160,
    lucesReales: 4,
    sombras: 1024,
    relieve: true,
    relieveSoloEnElCentro: false,
    cochesFinos: true,
    trafico: 16,
    /* Los conos de luz desde N2 (pedido de dirección de arte): una llamada y unos 3.000 triángulos. */
    haces: true,
    vapor: 6,
    reflejosDeVentanas: 320,
    lados: 10,
    fundido: true,
  },
  3: {
    interiores: true,
    ondas: true,
    lluvia: 10000,
    salpicaduras: 320,
    lucesReales: 6,
    sombras: 2048,
    relieve: true,
    relieveSoloEnElCentro: false,
    cochesFinos: true,
    trafico: 30,
    haces: true,
    vapor: 8,
    reflejosDeVentanas: 520,
    lados: 12,
    fundido: true,
  },
};
