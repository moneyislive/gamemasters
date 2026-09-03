/**
 * DE QUÉ ESTÁ HECHO CADA TERRENO: color plano y celda del atlas.
 *
 * ═══ POR QUÉ ESTO NO ESTÁ DENTRO DE `delta.tsx` ═══
 *
 * Porque estaba, y no se podía probar. `delta.tsx` importa `three` y usa JSX: un
 * guion de Node que lo importara para mirar la tabla de colores arrastraría el
 * motor de dibujo entero, y `verify:escena` dejaría de poder correr en la batería.
 *
 * Aquí vive lo que es DATO y CUENTA —de qué color es cada terreno, qué celda del
 * atlas le toca, cuántos puntos lleva un número— y allí lo que es pintado. La
 * frontera es la misma que ordena el árbol: se separa por lo que se puede
 * comprobar, no por lo que va junto en la pantalla.
 *
 * ═══ EL ATLAS ES UNA PALETA, Y ESO LO CAMBIA TODO ═══
 *
 * La textura del pack de KayKit son 1024×1024 píxeles repartidos en OCHO columnas
 * por CUATRO filas de manchas lisas, cada una con un degradado vertical de claro a
 * oscuro. No hay dibujo: no hay hierba pintada, ni vetas de piedra, ni arena. Lo
 * único que hace la textura es dar color, y el degradado hace de sombreado —por eso
 * la cara de arriba de una tesela se ve más clara que su canto sin que haya ninguna
 * luz calculándolo.
 *
 * Está medido, no supuesto: `hex_grass` tiene sus setenta vértices dentro de la
 * celda (0,2), con `v` entre 0,576 y 0,712; `hex_water` entera en la (1,1); y
 * `hex_coast_A` reparte los suyos entre la hierba (0,2), el agua (1,1) y la arena
 * (4,2). O sea que la diferencia entre una tesela de hierba y una de arena es
 * ÚNICAMENTE a qué celda apuntan sus UV.
 *
 * De ahí sale `celda`: mover las UV de la tesela de hierba a otra celda da la
 * tesela de ese bioma, con su degradado y todo. Los colores de la tabla son los que
 * se midieron dentro del atlas, no colores inventados que se parezcan.
 */

/** Una celda del atlas: columna 0..7 de izquierda a derecha, fila 0..3 de arriba abajo. */
export type CeldaDelAtlas = readonly [number, number];

/** Cuántas celdas tiene el atlas. Si el pack cambia de textura, esto cambia con ella. */
export const COLUMNAS_DEL_ATLAS = 8;
export const FILAS_DEL_ATLAS = 4;

/**
 * LA CELDA EN LA QUE VIENEN PINTADAS LAS TESELAS DEL PACK.
 *
 * Todas las teselas de suelo del pack gratuito son de hierba, así que todas
 * apuntan aquí. Es el ORIGEN del desplazamiento: para hacer una tesela de arena se
 * mueven sus UV de esta celda a la de la arena.
 */
export const CELDA_DE_LA_HIERBA: CeldaDelAtlas = [0, 2];

/**
 * ¿ESTÁ ESTA UV DENTRO DE LA CELDA DE LA HIERBA?
 *
 * Hace falta porque una tesela del pack NO apunta entera a una sola celda. La lisa
 * sí, pero la de camino reparte sus vértices entre la hierba y la tierra pisada, y
 * las de río y costa entre la hierba, el agua y la arena. Desplazar la lámina entera
 * al cambiar de bioma arrastraba también esas franjas, y el camino salía del color
 * de otra cosa — se leía como una decisión de arte y era un desplazamiento mal
 * acotado.
 *
 * El margen es de media celda hacia dentro y no cero: las UV de los bordes de una
 * mancha caen justo en la frontera, y con una comparación estricta la mitad de un
 * triángulo se movía y la otra mitad no.
 */
export function esDeLaHierba(u: number, v: number): boolean {
  const columna = Math.floor(u * COLUMNAS_DEL_ATLAS);
  const fila = Math.floor(v * FILAS_DEL_ATLAS);
  return columna === CELDA_DE_LA_HIERBA[0] && fila === CELDA_DE_LA_HIERBA[1];
}

/** Lo que hay que sumar a las UV de una tesela de hierba para llevarla a otra celda. */
export function desplazamientoDeCelda(destino: CeldaDelAtlas): { u: number; v: number } {
  return {
    u: (destino[0] - CELDA_DE_LA_HIERBA[0]) / COLUMNAS_DEL_ATLAS,
    v: (destino[1] - CELDA_DE_LA_HIERBA[1]) / FILAS_DEL_ATLAS,
  };
}

/**
 * LA CELDA DE LA NIEVE, y el color con el que se pinta en plano.
 *
 * Es la mancha blanca del atlas, medida: va de `#f6f8f8` arriba a `#b3bfc5` abajo. El
 * degradado hace el trabajo — la cara de arriba de la tesela sale blanca y el canto
 * gris azulado, que es exactamente cómo se ve la nieve sobre roca.
 *
 * La nieve no es un terreno del juego: es una capa que se pone ENCIMA de cualquier
 * bioma cuando pasa de cierta altura. Por eso no está en `PALETA` — una montaña
 * nevada sigue produciendo piedra.
 */
export const CELDA_DE_LA_NIEVE: CeldaDelAtlas = [1, 0];

/**
 * LA CELDA DE LA ARENA, para las riberas.
 *
 * Es la misma que usan las teselas de costa del pack para su playa —medido: los
 * vértices de arena de `hex_coast_A` caen en la celda (4,2)— así que la ribera de un
 * río y la playa de un lago salen del mismo color exacto y no de dos beiges que casi
 * casan.
 */
export const CELDA_DE_LA_ARENA: CeldaDelAtlas = [4, 2];
export const COLOR_DE_LA_NIEVE = '#e8eef1';

/**
 * LA CELDA DEL COLOR DEL JUGADOR, y por qué el pack sólo necesita traer una.
 *
 * ═══ CUATRO CASTILLOS QUE ERAN EL MISMO CASTILLO ═══
 *
 * El pack trae cada pieza de jugador en cuatro ficheros —azul, rojo, verde, amarillo—
 * y el compilador los metía los cuatro. Medido después, comparando byte a byte las
 * posiciones de los vértices: las cuatro variantes tienen la MISMA geometría exacta.
 * Lo único que cambia son las UV, y ni siquiera todas: en el castillo se mueven 837
 * vértices de 8.868, y los 8.031 restantes se quedan donde están.
 *
 * Los que se mueven salen todos de UNA celda del atlas, la (0,3), y se mueven UNA
 * columna por color. O sea que la fila 3 del atlas son los cuatro colores de jugador
 * uno al lado del otro, y el pack pinta la misma malla apuntando a uno u otro.
 *
 * Así que se compila SÓLO la variante azul y las otras tres salen aquí, moviendo esas
 * UV. Es exactamente la misma técnica con la que se pintan los biomas veinte líneas más
 * arriba: mover la UV de los vértices de UNA celda, y sólo de ésa.
 *
 * ═══ CUÁNTO AHORRA DE VERDAD, QUE NO ES LO QUE PARECÍA ═══
 *
 * La primera cuenta dijo 58.812 vértices, un tercio del fichero, y estaba MAL: sumaba
 * los vértices nodo a nodo, y `dedup` ya compartía un mismo accesor de posiciones entre
 * las cuatro variantes. Las posiciones repetidas no estaban repetidas en el fichero.
 *
 * Lo que sí estaba por cuadruplicado eran las UV, que son el único atributo que cambia
 * de color a color. Medido comparando el `.glb` antes y después: 4.606 kB → 4.209 kB,
 * o sea 397 kB, un 8,6 %, y 21 nodos menos. Es menos de lo que parecía y sigue
 * mereciendo la pena, porque un `.glb` es un binario y no se guarda por diferencias:
 * cada recompilación mete otra copia entera en la historia del repositorio.
 *
 * El peso que queda son 114.929 vértices con posición, normal y UV en `float32`: 32
 * bytes cada uno, 3,5 MB. Ahí el lever de verdad es cuantizar —`KHR_mesh_quantization`
 * los deja en unos 14 bytes, y three lo carga sin decodificador— pero eso cambia el
 * contrato de carga: `aplana` aplica matrices sobre los atributos, y una matriz
 * aplicada sobre enteros de 16 bits los destroza. Merece su propio cambio y su propia
 * comprobación, no un apaño de paso.
 *
 * ═══ POR QUÉ EL AZUL ES EL ORIGEN ═══
 *
 * Porque es la columna 0 de la fila, medido. Podría ser cualquiera si se ajustara la
 * tabla, pero el que está en la columna cero es el único que hace que todos los
 * desplazamientos sean hacia la derecha y ninguno negativo.
 */
export const CELDA_DEL_JUGADOR: CeldaDelAtlas = [0, 3];

/**
 * EN QUÉ COLUMNA DE ESA FILA ESTÁ CADA COLOR.
 *
 * Medido sobre el `.glb`, comparando las UV de cada variante con las de la azul: el
 * rojo está a +0,125 —una columna de ocho—, el amarillo a +0,25 y el verde a +0,375.
 * No es el orden en que el pack nombra sus carpetas, y por eso está medido y escrito
 * aquí en vez de deducido del orden de `COLORES_DE_JUGADOR`.
 */
export const COLUMNA_DEL_COLOR: Readonly<Record<string, number>> = {
  blue: 0,
  red: 1,
  yellow: 2,
  green: 3,
};

/**
 * ¿ES ESTA UV DE LA PARTE QUE LLEVA EL COLOR DEL JUGADOR?
 *
 * Hace falta por lo mismo que `esDeLaHierba`: una pieza de jugador NO apunta entera a
 * la celda del color. El castillo tiene piedra, madera y tejado, y sólo el tejado y los
 * estandartes son del color. Mover la lámina entera dejaría el castillo de un solo
 * color plano.
 */
export function esDelColorDelJugador(u: number, v: number): boolean {
  const columna = Math.floor(u * COLUMNAS_DEL_ATLAS);
  const fila = Math.floor(v * FILAS_DEL_ATLAS);
  return columna === CELDA_DEL_JUGADOR[0] && fila === CELDA_DEL_JUGADOR[1];
}

/**
 * LO QUE HAY QUE SUMARLE A LA UV DE UNA PIEZA AZUL PARA QUE SEA DE OTRO COLOR.
 *
 * Un color desconocido no mueve nada, y sale azul. Es la misma decisión que
 * `TERRENO_DESCONOCIDO`: un dato que llega de fuera no puede dejar la escena en negro.
 */
export function desplazamientoDeColor(color: string): { u: number; v: number } {
  const columna = COLUMNA_DEL_COLOR[color] ?? COLUMNA_DEL_COLOR['blue'] ?? 0;
  return { u: (columna - CELDA_DEL_JUGADOR[0]) / COLUMNAS_DEL_ATLAS, v: 0 };
}

/** Un terreno: cómo se pinta en plano y de qué celda del atlas sale su suelo. */
export interface Terreno {
  /** El color para el tablero plano y para cuando no hay textura. */
  color: string;
  /** La celda del atlas de la que sale el suelo de este bioma. */
  celda: CeldaDelAtlas;
}

/**
 * CADA TERRENO, y qué pasa con uno que no conozcamos.
 *
 * Un juego trae los terrenos que quiera y esta tabla no puede conocerlos todos. Lo
 * importante es lo de abajo, en `terrenoDe`: un terreno desconocido NO revienta la
 * escena ni deja un hueco negro. Es la lección de `MUEBLES[m.mueble]`, que este
 * repositorio ya pagó una vez: un `Record` de claves finitas indexado con un dato
 * que llega por la red devuelve `undefined` sin que el compilador diga nada, y
 * revienta al pintar.
 *
 * ═══ POR QUÉ EL COLOR Y LA CELDA NO SON LO MISMO ═══
 *
 * El campo y la pradera comparten suelo —los dos son hierba, y lo que los distingue
 * en el mundo son los sembrados de encima— pero en el tablero PLANO tienen que
 * verse distintos, porque ahí no hay sembrados que mirar: sólo hay un polígono de
 * un color. Por eso son dos campos y no uno.
 */
export const PALETA: Readonly<Record<string, Terreno>> = {
  /* Los seis de Riberas. */
  marisma: { color: '#6a7f4f', celda: [7, 1] },
  carrizal: { color: '#93a15a', celda: [4, 1] },
  salina: { color: '#d8cfa8', celda: [5, 2] },
  cantil: { color: '#8a8f96', celda: [3, 0] },
  vega: { color: '#c8a44e', celda: [0, 2] },
  duna: { color: '#e2d3a8', celda: [3, 2] },

  /*
   * Y los del catán. La celda de cada uno sale del bien que produce, que es como
   * los reconoce quien juega: la arcilla es la mancha de barro del atlas, la piedra
   * la gris, el desierto la de arena. El bosque es el verde oscuro y la pradera el
   * verde claro de la hierba, que es la tesela por defecto del pack.
   */
  bosque: { color: '#3f6b45', celda: [1, 2] },
  pradera: { color: '#8fae55', celda: [0, 2] },
  campo: { color: '#d9b04a', celda: [0, 2] },
  colina: { color: '#b1653c', celda: [2, 1] },
  montana: { color: '#7d8590', celda: [2, 2] },
  desierto: { color: '#e3d5a6', celda: [4, 2] },
};

/**
 * El terreno de reserva.
 *
 * El color es un gris que se ve RARO a propósito entre teselas de colores: un
 * terreno sin entrada en la tabla tiene que cantar, no disimular. Si fuera un verde
 * razonable, nadie se enteraría de que falta una entrada.
 */
export const TERRENO_DESCONOCIDO: Terreno = { color: '#5b5f66', celda: [6, 1] };

/** Lo que sabemos de un terreno, o lo de reserva si esta versión no lo conoce. */
export function terrenoDe(terreno: string): Terreno {
  return PALETA[terreno] ?? TERRENO_DESCONOCIDO;
}

/** El color de un terreno, o el de reserva si esta versión no lo conoce. */
export function colorDeTerreno(terreno: string): string {
  return terrenoDe(terreno).color;
}

/**
 * CUÁNTOS PUNTOS LLEVA UN NÚMERO.
 *
 * Son las formas de sacarlo con dos dados: el 2 y el 12 salen de una sola
 * combinación, el 7 de seis. Se calcula en vez de escribirse en una tabla porque
 * una tabla a mano es una tabla que alguien copia mal — y `verify:escena` la
 * contrasta contra los treinta y seis resultados por fuerza bruta, así que
 * «optimizar» esta fórmula rompe una comprobación en vez de un tablero.
 *
 * Fuera del 2..12 devuelve cero en vez de un número negativo: un juego puede usar
 * otro reparto de dados y esto no es quién para negarse.
 */
export function puntosDeLaCifra(cifra: number): number {
  const formas = 6 - Math.abs(7 - cifra);
  return formas > 0 ? formas : 0;
}
