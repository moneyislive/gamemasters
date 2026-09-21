/**
 * LAS SETENTA Y DOS LOSAS DE LAS LINDES, dichas como dato.
 *
 * ═══ POR QUÉ ESTO ES UN FICHERO APARTE Y NO EL PRINCIPIO DE `lindes.ts` ═══
 *
 * Porque son dos cosas distintas y la de aquí no tiene reglas: esto es el
 * CATÁLOGO —qué enseña cada losa por cada lado y qué va unido con qué dentro de
 * ella—, y las reglas son lo que se puede hacer con él. La prueba de que la raya
 * está bien puesta es que este fichero no importa nada del motor: un comprobador
 * puede contar el reparto, girar las veinticuatro y comprobar que los giros
 * cierran sin instalar el juego en ningún registro.
 *
 * Y porque el reparto es lo que más se mira a ojo cuando algo no cuadra. Metido
 * en medio de cuatro mil líneas de reductor, nadie vuelve a contarlo.
 *
 * ═══ LA GEOMETRÍA ENTERA, QUE SON DOS SUMAS ═══
 *
 * Una losa es un cuadrado con cuatro LADOS y ocho HUECOS.
 *
 * Los lados van en el sentido de las agujas del reloj desde el norte:
 *
 *     0 = norte      1 = este      2 = sur      3 = oeste
 *
 * Los huecos son las MITADES de cada lado, numeradas en el mismo sentido y
 * empezando por la mitad occidental del norte:
 *
 *                       0   1
 *                     ┌───┬───┐
 *                   7 │       │ 2
 *                     ├       ┤
 *                   6 │       │ 3
 *                     └───┴───┘
 *                       5   4
 *
 * De modo que los huecos `2i` y `2i+1` son las dos mitades del lado `i`, y el
 * primero de los dos es el que viene antes en el sentido de las agujas del reloj.
 *
 * ═══ POR QUÉ HACEN FALTA LOS HUECOS, QUE ES LA DECISIÓN DEL FICHERO ═══
 *
 * Porque **una senda parte el prado**. En una losa con una senda recta hay dos
 * prados y no uno, y los dos tocan el mismo lado por mitades distintas: el de la
 * derecha toca la mitad oriental del norte y el de la izquierda la occidental.
 * Con los lados a secas eso no se puede decir, y un prado dicho a medias es un
 * labriego que cobra por una villa que no toca.
 *
 * El precio son ocho números en vez de cuatro, y se paga una vez aquí.
 *
 * ═══ CÓMO PEGAN DOS LOSAS ═══
 *
 * Pegando por el lado `i` de una y el lado `j = (i + 2) % 4` de la otra:
 *
 *     el lado  i     casa con el lado  j      (tienen que enseñar lo mismo)
 *     el hueco 2i    toca el hueco     2j+1
 *     el hueco 2i+1  toca el hueco     2j
 *
 * Los huecos se cruzan porque los dos vecinos recorren la raya compartida en
 * sentidos contrarios: lo que para el de abajo es la mitad occidental de su
 * norte, para el de arriba es la mitad occidental de su sur, y su sur lo numera
 * de este a oeste.
 *
 * ═══ Y CÓMO GIRA ═══
 *
 *     un cuarto de vuelta a la derecha:   lado i → (i + 1) % 4
 *                                         hueco h → (h + 2) % 8
 *
 * Sumas de enteros y nada más: ni un seno, ni una raíz. `verify:pureza` prohíbe
 * la trigonometría en todo `shared/arcade/`, y aquí no hace ninguna falta.
 *
 * ═══ LO LEGAL, QUE NO ES UN TRÁMITE Y AQUÍ SE VE ═══
 *
 * Un reparto de losas es una REGLA, y las reglas de un juego de mesa no son
 * objeto de copyright ni de patente — el §8 de `docs/MOTOR-DE-ARCADE.md` tiene
 * las cuatro fuentes. Lo que sí está protegido es la expresión, así que aquí no
 * hay ni un nombre ajeno, ni un dibujo ajeno, ni un «inspirado en»: los nombres
 * son nuestros y describen lo que se ve, y el dibujo lo GENERA `escenas/lindes/`
 * con las piezas que ya levantan el delta de Riberas. Ver el §0 de
 * `docs/lindes/DISENO.md`.
 */

/** Qué enseña un lado de una losa. Las tres cosas que pueden casar. */
export type Linde = 'campo' | 'senda' | 'muralla';

/** Un lado, de 0 (norte) a 3 (oeste). */
export type Lado = 0 | 1 | 2 | 3;

/** Los cuatro, para recorrerlos sin escribirlos. */
export const LADOS: readonly Lado[] = [0, 1, 2, 3];

/** Cómo se llaman los cuatro, para los textos que lee la gente. */
export const NOMBRE_DEL_LADO: Readonly<Record<Lado, string>> = {
  0: 'norte',
  1: 'este',
  2: 'sur',
  3: 'oeste',
};

/** Un giro, en cuartos de vuelta a la derecha. */
export type Giro = 0 | 1 | 2 | 3;

/** Los cuatro giros. */
export const GIROS: readonly Giro[] = [0, 1, 2, 3];

/** Cuántos huecos tiene una losa: dos por lado. */
export const HUECOS_POR_LOSA = 8;

/**
 * LAS TRES CLASES DE COSA QUE SE PUEDEN OCUPAR CON UN LABRIEGO.
 *
 * `prado` es la cuarta y va aparte en el tipo de la losa porque se dice con
 * huecos y no con lados; aquí están las cuatro juntas porque para plantar son lo
 * mismo: una cosa de la losa recién puesta que no tenga gente.
 */
export type ClaseDeCosa = 'senda' | 'villa' | 'prado' | 'ermita';

/** Las cuatro, en el orden en que se ofrecen al plantar. */
export const CLASES_DE_COSA: readonly ClaseDeCosa[] = ['villa', 'senda', 'ermita', 'prado'];

/** Cómo se llama cada una en singular, para los textos. */
export const NOMBRE_DE_LA_COSA: Readonly<Record<ClaseDeCosa, string>> = {
  senda: 'senda',
  villa: 'villa',
  prado: 'prado',
  ermita: 'ermita',
};

/**
 * UN TRAMO DE MURALLA DENTRO DE UNA LOSA.
 *
 * `lados` son los lados de la losa por los que esa villa sale. Puede ser uno
 * —una muralla que se asoma a un solo lado— o cuatro —la villa redonda—, y dos
 * tramos distintos en la misma losa son dos villas que NO están unidas: eso es
 * exactamente lo que distingue `dos-murallas-enfrentadas` de `calle`.
 */
export interface VillaDeLosa {
  readonly lados: readonly Lado[];
  /** El blasón, que vale dos puntos más por losa al cerrarse. */
  readonly blason: boolean;
}

/**
 * UN TRAMO DE SENDA DENTRO DE UNA LOSA.
 *
 * Con DOS lados, la senda cruza de parte a parte. Con UNO, muere dentro de la
 * losa —en una encrucijada, en la puerta de una ermita o contra una villa—, y
 * ese cabo cuenta como final: es lo que permite que una senda se cierre.
 */
export interface SendaDeLosa {
  readonly lados: readonly Lado[];
}

/**
 * UN PRADO DENTRO DE UNA LOSA.
 *
 * `huecos` son las medias rayas por las que ese prado sale de la losa, y
 * `villas` son los ÍNDICES —dentro de `villas` de la misma losa— de las murallas
 * que ese prado toca por dentro.
 *
 * ═══ POR QUÉ `villas` ES UN DATO Y NO SE DEDUCE ═══
 *
 * Porque no se puede deducir sin mirar el dibujo. Un prado y una villa pueden
 * compartir losa sin tocarse: en `dos-murallas-enfrentadas` el prado toca las
 * dos, y en `villa-tres-senda` los dos prados de abajo tocan la misma. La
 * diferencia no está en los lados ni en los huecos — está en por dónde pasa la
 * raya, que es un dibujo. Y de este campo cuelga lo único que los labriegos
 * cobran al final, así que adivinarlo sería adivinar la mitad del recuento.
 */
export interface PradoDeLosa {
  readonly huecos: readonly number[];
  readonly villas: readonly number[];
}

/** Una de las veinticuatro clases de losa. */
export interface Losa {
  /** Cómo se la nombra por dentro. Nunca se le enseña a nadie. */
  readonly id: string;
  /** Cómo se llama en la mesa. */
  readonly nombre: string;
  /** Qué enseña cada lado, del norte al oeste. */
  readonly lados: readonly [Linde, Linde, Linde, Linde];
  readonly villas: readonly VillaDeLosa[];
  readonly sendas: readonly SendaDeLosa[];
  readonly prados: readonly PradoDeLosa[];
  /** ¿Lleva ermita? Se cierra con sus ocho vecinas puestas. */
  readonly ermita: boolean;
  /** Cuántas hay en la bolsa. */
  readonly cuantas: number;
}

/**
 * EL CATÁLOGO. Veinticuatro clases, setenta y dos losas.
 *
 * ═══ CÓMO LEER UNA FILA, CON UN EJEMPLO ═══
 *
 * `puerta-senda` es la losa con la que empieza la partida:
 *
 *     lados:  muralla al norte, senda al este, campo al sur, senda al oeste
 *     villas: una, la del norte, sin blasón
 *     sendas: una, que entra por el este y sale por el oeste
 *     prados: DOS, porque la senda parte la losa por la mitad —
 *             el de arriba (huecos 2 y 7) toca la villa, el de abajo (3,4,5,6) no
 *
 * Y de ahí sale, sin una regla escrita, que un labriego en el prado de arriba de
 * esa losa cobra por la villa del norte si alguien la cierra, y uno en el de
 * abajo no cobra por ella nunca.
 */
export const LAS_LOSAS: readonly Losa[] = [
  {
    id: 'ermita',
    nombre: 'La ermita',
    lados: ['campo', 'campo', 'campo', 'campo'],
    villas: [],
    sendas: [],
    prados: [{ huecos: [0, 1, 2, 3, 4, 5, 6, 7], villas: [] }],
    ermita: true,
    cuantas: 4,
  },
  {
    /*
     * La senda muere en la puerta de la ermita, así que NO parte el prado: se
     * mete en él y se acaba. Un prado, y los ocho huecos dentro.
     */
    id: 'ermita-senda',
    nombre: 'La ermita del camino',
    lados: ['campo', 'campo', 'senda', 'campo'],
    villas: [],
    sendas: [{ lados: [2] }],
    prados: [{ huecos: [0, 1, 2, 3, 4, 5, 6, 7], villas: [] }],
    ermita: true,
    cuantas: 2,
  },
  {
    /* Muralla por los cuatro costados: no hay prado, y se cierra sola. */
    id: 'villa-redonda',
    nombre: 'La villa amurallada',
    lados: ['muralla', 'muralla', 'muralla', 'muralla'],
    villas: [{ lados: [0, 1, 2, 3], blason: true }],
    sendas: [],
    prados: [],
    ermita: false,
    cuantas: 1,
  },
  {
    id: 'puerta-senda',
    nombre: 'La puerta de la villa',
    lados: ['muralla', 'senda', 'campo', 'senda'],
    villas: [{ lados: [0], blason: false }],
    sendas: [{ lados: [1, 3] }],
    prados: [
      { huecos: [2, 7], villas: [0] },
      { huecos: [3, 4, 5, 6], villas: [] },
    ],
    ermita: false,
    cuantas: 4,
  },
  {
    id: 'muralla',
    nombre: 'El lienzo de muralla',
    lados: ['muralla', 'campo', 'campo', 'campo'],
    villas: [{ lados: [0], blason: false }],
    sendas: [],
    prados: [{ huecos: [2, 3, 4, 5, 6, 7], villas: [0] }],
    ermita: false,
    cuantas: 5,
  },
  {
    /*
     * Las dos murallas van UNIDAS por dentro, así que la losa es un pasadizo: el
     * prado de arriba y el de abajo quedan separados por la villa.
     */
    id: 'calle-blason',
    nombre: 'La calle mayor',
    lados: ['campo', 'muralla', 'campo', 'muralla'],
    villas: [{ lados: [1, 3], blason: true }],
    sendas: [],
    prados: [
      { huecos: [0, 1], villas: [0] },
      { huecos: [4, 5], villas: [0] },
    ],
    ermita: false,
    cuantas: 2,
  },
  {
    id: 'calle',
    nombre: 'La calle',
    lados: ['campo', 'muralla', 'campo', 'muralla'],
    villas: [{ lados: [1, 3], blason: false }],
    sendas: [],
    prados: [
      { huecos: [0, 1], villas: [0] },
      { huecos: [4, 5], villas: [0] },
    ],
    ermita: false,
    cuantas: 1,
  },
  {
    /*
     * Dos villas SIN unir, y por eso el prado es UNO SOLO: pasa entre las dos
     * murallas de norte a sur. Es la diferencia entera con `calle`, y es la que
     * decide si un labriego puesto arriba cobra también por lo de abajo.
     */
    id: 'dos-murallas-enfrentadas',
    nombre: 'Las dos murallas',
    lados: ['campo', 'muralla', 'campo', 'muralla'],
    villas: [
      { lados: [1], blason: false },
      { lados: [3], blason: false },
    ],
    sendas: [],
    prados: [{ huecos: [0, 1, 4, 5], villas: [0, 1] }],
    ermita: false,
    cuantas: 3,
  },
  {
    id: 'dos-murallas-escuadra',
    nombre: 'Las murallas en esquina',
    lados: ['campo', 'muralla', 'muralla', 'campo'],
    villas: [
      { lados: [1], blason: false },
      { lados: [2], blason: false },
    ],
    sendas: [],
    prados: [{ huecos: [0, 1, 6, 7], villas: [0, 1] }],
    ermita: false,
    cuantas: 2,
  },
  {
    /*
     * La senda dobla por la esquina de levante: deja un triángulo de prado entre
     * ella y la esquina (huecos 3 y 4) y el resto por fuera, tocando la villa.
     */
    id: 'muralla-senda-derecha',
    nombre: 'La vuelta de levante',
    lados: ['muralla', 'senda', 'senda', 'campo'],
    villas: [{ lados: [0], blason: false }],
    sendas: [{ lados: [1, 2] }],
    prados: [
      { huecos: [2, 5, 6, 7], villas: [0] },
      { huecos: [3, 4], villas: [] },
    ],
    ermita: false,
    cuantas: 3,
  },
  {
    id: 'muralla-senda-izquierda',
    nombre: 'La vuelta de poniente',
    lados: ['muralla', 'campo', 'senda', 'senda'],
    villas: [{ lados: [0], blason: false }],
    sendas: [{ lados: [2, 3] }],
    prados: [
      { huecos: [2, 3, 4, 7], villas: [0] },
      { huecos: [5, 6], villas: [] },
    ],
    ermita: false,
    cuantas: 3,
  },
  {
    /*
     * TRES sendas y no una: las tres mueren en la encrucijada del medio, así que
     * son tres tramos con un cabo cada uno. Y tres prados, uno por cada gajo.
     */
    id: 'muralla-encrucijada',
    nombre: 'La encrucijada de la muralla',
    lados: ['muralla', 'senda', 'senda', 'senda'],
    villas: [{ lados: [0], blason: false }],
    sendas: [{ lados: [1] }, { lados: [2] }, { lados: [3] }],
    prados: [
      { huecos: [2, 7], villas: [0] },
      { huecos: [3, 4], villas: [] },
      { huecos: [5, 6], villas: [] },
    ],
    ermita: false,
    cuantas: 3,
  },
  {
    id: 'villa-escuadra-blason',
    nombre: 'El recodo de la villa',
    lados: ['muralla', 'campo', 'campo', 'muralla'],
    villas: [{ lados: [0, 3], blason: true }],
    sendas: [],
    prados: [{ huecos: [2, 3, 4, 5], villas: [0] }],
    ermita: false,
    cuantas: 2,
  },
  {
    id: 'villa-escuadra',
    nombre: 'El recodo',
    lados: ['muralla', 'campo', 'campo', 'muralla'],
    villas: [{ lados: [0, 3], blason: false }],
    sendas: [],
    prados: [{ huecos: [2, 3, 4, 5], villas: [0] }],
    ermita: false,
    cuantas: 3,
  },
  {
    id: 'villa-escuadra-senda-blason',
    nombre: 'El recodo del mercado',
    lados: ['muralla', 'senda', 'senda', 'muralla'],
    villas: [{ lados: [0, 3], blason: true }],
    sendas: [{ lados: [1, 2] }],
    prados: [
      { huecos: [2, 5], villas: [0] },
      { huecos: [3, 4], villas: [] },
    ],
    ermita: false,
    cuantas: 2,
  },
  {
    id: 'villa-escuadra-senda',
    nombre: 'El recodo del camino',
    lados: ['muralla', 'senda', 'senda', 'muralla'],
    villas: [{ lados: [0, 3], blason: false }],
    sendas: [{ lados: [1, 2] }],
    prados: [
      { huecos: [2, 5], villas: [0] },
      { huecos: [3, 4], villas: [] },
    ],
    ermita: false,
    cuantas: 3,
  },
  {
    id: 'villa-tres-blason',
    nombre: 'La villa de las tres puertas',
    lados: ['muralla', 'muralla', 'campo', 'muralla'],
    villas: [{ lados: [0, 1, 3], blason: true }],
    sendas: [],
    prados: [{ huecos: [4, 5], villas: [0] }],
    ermita: false,
    cuantas: 1,
  },
  {
    id: 'villa-tres',
    nombre: 'La villa de tres lienzos',
    lados: ['muralla', 'muralla', 'campo', 'muralla'],
    villas: [{ lados: [0, 1, 3], blason: false }],
    sendas: [],
    prados: [{ huecos: [4, 5], villas: [0] }],
    ermita: false,
    cuantas: 3,
  },
  {
    /*
     * La senda del sur parte en DOS el pedacito de prado que queda, y los dos
     * tocan la misma villa. Es el caso que hace falta tener a mano para entender
     * por qué `villas` de un prado es una lista y no un número.
     */
    id: 'villa-tres-senda-blason',
    nombre: 'La villa del camino real',
    lados: ['muralla', 'muralla', 'senda', 'muralla'],
    villas: [{ lados: [0, 1, 3], blason: true }],
    sendas: [{ lados: [2] }],
    prados: [
      { huecos: [4], villas: [0] },
      { huecos: [5], villas: [0] },
    ],
    ermita: false,
    cuantas: 2,
  },
  {
    id: 'villa-tres-senda',
    nombre: 'La villa del camino',
    lados: ['muralla', 'muralla', 'senda', 'muralla'],
    villas: [{ lados: [0, 1, 3], blason: false }],
    sendas: [{ lados: [2] }],
    prados: [
      { huecos: [4], villas: [0] },
      { huecos: [5], villas: [0] },
    ],
    ermita: false,
    cuantas: 1,
  },
  {
    id: 'senda-recta',
    nombre: 'La senda',
    lados: ['senda', 'campo', 'senda', 'campo'],
    villas: [],
    sendas: [{ lados: [0, 2] }],
    prados: [
      { huecos: [1, 2, 3, 4], villas: [] },
      { huecos: [5, 6, 7, 0], villas: [] },
    ],
    ermita: false,
    cuantas: 8,
  },
  {
    id: 'senda-curva',
    nombre: 'El recodo de la senda',
    lados: ['campo', 'campo', 'senda', 'senda'],
    villas: [],
    sendas: [{ lados: [2, 3] }],
    prados: [
      { huecos: [7, 0, 1, 2, 3, 4], villas: [] },
      { huecos: [5, 6], villas: [] },
    ],
    ermita: false,
    cuantas: 9,
  },
  {
    id: 'encrucijada-tres',
    nombre: 'La encrucijada',
    lados: ['campo', 'senda', 'senda', 'senda'],
    villas: [],
    sendas: [{ lados: [1] }, { lados: [2] }, { lados: [3] }],
    prados: [
      { huecos: [7, 0, 1, 2], villas: [] },
      { huecos: [3, 4], villas: [] },
      { huecos: [5, 6], villas: [] },
    ],
    ermita: false,
    cuantas: 4,
  },
  {
    id: 'encrucijada-cuatro',
    nombre: 'El cruce de los cuatro caminos',
    lados: ['senda', 'senda', 'senda', 'senda'],
    villas: [],
    sendas: [{ lados: [0] }, { lados: [1] }, { lados: [2] }, { lados: [3] }],
    prados: [
      { huecos: [1, 2], villas: [] },
      { huecos: [3, 4], villas: [] },
      { huecos: [5, 6], villas: [] },
      { huecos: [7, 0], villas: [] },
    ],
    ermita: false,
    cuantas: 1,
  },
];

/**
 * LA LOSA CON LA QUE EMPIEZA EL TABLERO, puesta en el centro sin girar.
 *
 * Es una `puerta-senda` y no una cualquiera: tiene muralla, senda y prado a la
 * vez, así que la segunda losa —sea la que sea— tiene dónde pegar. Con una
 * `villa-redonda` de salida, cualquier losa que no fuera muralla por los cuatro
 * lados se quedaría sin sitio, y la partida empezaría atascada.
 *
 * Sale de la bolsa: la barajada tiene setenta y una, no setenta y dos.
 */
export const LOSA_DE_SALIDA = 'puerta-senda';

/** Cuántas losas hay en total, contando la de salida. */
export const LOSAS_EN_TOTAL = LAS_LOSAS.reduce((suma, l) => suma + l.cuantas, 0);

/**
 * LA BOLSA SIN BARAJAR: una entrada por losa, con la de salida ya descontada.
 *
 * El orden de aquí no importa —lo baraja `barajar` con la semilla de la mesa—,
 * pero tiene que ser SIEMPRE EL MISMO, porque barajar una lista distinta con la
 * misma semilla da otra partida y la reejecución dejaría de coincidir. Por eso
 * sale del catálogo en su orden y no de un recorrido de claves.
 */
export function bolsaSinBarajar(): string[] {
  const salida: string[] = [];
  for (const losa of LAS_LOSAS) {
    const cuantas = losa.id === LOSA_DE_SALIDA ? losa.cuantas - 1 : losa.cuantas;
    for (let i = 0; i < cuantas; i++) salida.push(losa.id);
  }
  return salida;
}

/** El catálogo por id, para no recorrer la lista veinte veces por movimiento. */
const POR_ID: Readonly<Record<string, Losa>> = (() => {
  const mapa: Record<string, Losa> = {};
  for (const losa of LAS_LOSAS) mapa[losa.id] = losa;
  return mapa;
})();

/**
 * LA LOSA QUE SE LLAMA ASÍ, o `null` si no existe ninguna.
 *
 * Devuelve `null` y no lanza porque quien pregunta suele ser un movimiento que
 * llega de un dispositivo, y un id inventado es un movimiento ilegal —no una
 * avería—. Quien lo llame con un id que él mismo escribió y reciba `null` tiene
 * un fallo suyo, y lo verá en la primera partida.
 */
export function losaPorId(id: string): Losa | null {
  return POR_ID[id] ?? null;
}

// ---------------------------------------------------------------------------
// La geometría: girar, casar, vecindad
// ---------------------------------------------------------------------------

/** El lado `l` de una losa girada `giro` cuartos, en coordenadas del tablero. */
export function ladoGirado(l: Lado, giro: Giro): Lado {
  return (((l + giro) % 4) + 4) % 4 as Lado;
}

/** El lado del tablero `l`, dicho en coordenadas de la losa sin girar. */
export function ladoSinGirar(l: Lado, giro: Giro): Lado {
  return (((l - giro) % 4) + 4) % 4 as Lado;
}

/** El hueco `h` de una losa girada `giro` cuartos, en coordenadas del tablero. */
export function huecoGirado(h: number, giro: Giro): number {
  return (((h + 2 * giro) % HUECOS_POR_LOSA) + HUECOS_POR_LOSA) % HUECOS_POR_LOSA;
}

/** El hueco del tablero `h`, dicho en coordenadas de la losa sin girar. */
export function huecoSinGirar(h: number, giro: Giro): number {
  return (((h - 2 * giro) % HUECOS_POR_LOSA) + HUECOS_POR_LOSA) % HUECOS_POR_LOSA;
}

/** Qué enseña, ya girada, el lado `l` del tablero. */
export function lindeDelLado(losa: Losa, giro: Giro, l: Lado): Linde {
  return losa.lados[ladoSinGirar(l, giro)] as Linde;
}

/** El lado de enfrente: por el que pega el vecino. */
export function ladoOpuesto(l: Lado): Lado {
  return ((l + 2) % 4) as Lado;
}

/**
 * LOS DOS HUECOS DE UN LADO, en orden de las agujas del reloj.
 *
 * Se escribe una vez aquí porque la cuenta `2i`, `2i+1` sale en cinco sitios y
 * cada uno que la repita es un sitio donde se puede escribir `2i+2`.
 */
export function huecosDelLado(l: Lado): readonly [number, number] {
  return [2 * l, 2 * l + 1];
}

/**
 * EL HUECO DEL VECINO QUE TOCA A ÉSTE.
 *
 * El cruce que explica la cabecera: pegados por el lado `i`, el hueco `2i` toca
 * al `2j+1` del otro y el `2i+1` al `2j`, con `j` el lado opuesto. Dicho de otra
 * manera: los dos recorren la raya compartida en sentidos contrarios.
 */
export function huecoQueToca(h: number): number {
  const lado = Math.floor(h / 2) as Lado;
  const mitad = h % 2;
  const otro = ladoOpuesto(lado);
  return 2 * otro + (1 - mitad);
}

/** El desplazamiento que lleva del centro de una losa al vecino de ese lado. */
export const HACIA: Readonly<Record<Lado, { readonly x: number; readonly y: number }>> = {
  0: { x: 0, y: 1 },
  1: { x: 1, y: 0 },
  2: { x: 0, y: -1 },
  3: { x: -1, y: 0 },
};

/**
 * LA LLAVE DE UNA CASILLA DEL TABLERO.
 *
 * Una cadena y no un objeto, por lo mismo que `llaveDeHex` en la malla de
 * Riberas: se compara con `===`, se usa de clave de un objeto sin escribir un
 * comparador, y sobrevive al viaje por el cable sin que nadie tenga que
 * reconstruirla.
 */
export function llaveDeCasilla(x: number, y: number): string {
  return `${x},${y}`;
}

/** La casilla que hay detrás de una llave. */
export function casillaDeLlave(llave: string): { readonly x: number; readonly y: number } | null {
  const partes = llave.split(',');
  if (partes.length !== 2) return null;
  const x = Number(partes[0]);
  const y = Number(partes[1]);
  if (!Number.isInteger(x) || !Number.isInteger(y)) return null;
  return { x, y };
}

/** La casilla vecina por ese lado. */
export function vecina(x: number, y: number, l: Lado): { readonly x: number; readonly y: number } {
  const d = HACIA[l];
  return { x: x + d.x, y: y + d.y };
}

/**
 * LAS OCHO DE ALREDEDOR, contando las esquinas. Para cerrar una ermita.
 *
 * En orden fijo y no sorteado: el recuento de una ermita es una cuenta, pero el
 * ORDEN en que se miran las vecinas acaba en el diario si alguna vez alguien
 * cuelga algo de él, y una lista escrita a mano no tiene el problema del
 * recorrido de claves que `verify:pureza` prohíbe.
 */
export const LAS_OCHO: readonly { readonly x: number; readonly y: number }[] = [
  { x: -1, y: 1 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 },
];

// ---------------------------------------------------------------------------
// Preguntas sobre una losa ya girada
// ---------------------------------------------------------------------------

/**
 * ¿QUÉ COSA DE ESTA LOSA SALE POR ESTE LADO?
 *
 * Devuelve el índice dentro de `villas` o de `sendas`, o `-1` si por ese lado no
 * sale ninguna de las dos (o sea: si es campo). Se pregunta en coordenadas del
 * TABLERO y el giro se deshace aquí dentro, que es lo que impide que quien
 * pregunte tenga que acordarse de deshacerlo.
 */
export function villaDelLado(losa: Losa, giro: Giro, l: Lado): number {
  const propio = ladoSinGirar(l, giro);
  for (let i = 0; i < losa.villas.length; i++) {
    if ((losa.villas[i] as VillaDeLosa).lados.indexOf(propio) >= 0) return i;
  }
  return -1;
}

/** Lo mismo, para las sendas. */
export function sendaDelLado(losa: Losa, giro: Giro, l: Lado): number {
  const propio = ladoSinGirar(l, giro);
  for (let i = 0; i < losa.sendas.length; i++) {
    if ((losa.sendas[i] as SendaDeLosa).lados.indexOf(propio) >= 0) return i;
  }
  return -1;
}

/** El prado que sale por ese hueco del tablero, o `-1`. */
export function pradoDelHueco(losa: Losa, giro: Giro, h: number): number {
  const propio = huecoSinGirar(h, giro);
  for (let i = 0; i < losa.prados.length; i++) {
    if ((losa.prados[i] as PradoDeLosa).huecos.indexOf(propio) >= 0) return i;
  }
  return -1;
}

/**
 * ¿CUÁNTOS CABOS TIENE ESTE TRAMO DE SENDA DENTRO DE LA LOSA?
 *
 * Uno o dos. Con uno, la senda MUERE aquí —encrucijada, ermita o villa— y ese
 * cabo cierra; con dos, sigue por los dos lados. Es la cuenta de la que cuelga
 * que una senda se pueda cerrar, y por eso tiene nombre en vez de estar escrita
 * dentro del recorrido.
 */
export function cabosDeLaSenda(losa: Losa, indice: number): number {
  const senda = losa.sendas[indice];
  return senda === undefined ? 0 : senda.lados.length;
}
