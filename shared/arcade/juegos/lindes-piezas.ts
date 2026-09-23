/**
 * LAS PIEZAS DEL PACK QUE PONE EL REPARTO DE LAS LINDES, por el nombre que llevan en `tablero.glb`.
 *
 * ═══ POR QUÉ ESTÁN AQUÍ Y `escenas/nombres.ts` LAS IMPORTA ═══
 *
 * El reparto de una losa (`lindes-reparto.ts`) vive en `shared/` desde que de él sale con qué se
 * choca, y el reparto pide las piezas POR NOMBRE. Esos nombres ya estaban escritos en `MODELO`, en
 * `escenas/nombres.ts`, que es la tabla que `verify:escena` contrasta nombre a nombre contra los
 * nodos del `.glb` compilado.
 *
 * Copiarlos aquí habría sido lo fácil y es el fallo que esa misma tabla cuenta en su cabecera: el
 * día que alguien renombre `muro-puerta` en el pack, `verify:escena` seguiría verde contra
 * `escenas/nombres.ts` y el reparto pediría una pieza que ya no existe. Sin error y sin hueco: una
 * muralla sin puertas. Así que la verdad está AQUÍ, y `MODELO` mete estos cuarenta dentro de sí
 * con las mismas claves y en el mismo sitio de la tabla. `verify:escena` los sigue comprobando
 * todos, porque comprueba `MODELO`.
 *
 * ═══ SÓLO LOS CUARENTA QUE EL REPARTO USA ═══
 *
 * `MODELO` tiene ciento y pico nombres —teselas, orillas, ríos, bienes, el dado— y los de piezas de
 * jugador se componen por color. Mudarlo entero habría arrastrado a `shared/` el tipo de color de
 * `escenas/tipos.ts` y a veinte consumidores de `escenas/` que no tienen nada que ver con Las
 * Lindes. Aquí están los que el reparto pide, ni uno más: si mañana pide otro, se añade aquí y
 * `MODELO` lo recoge en la misma línea.
 *
 * `rocaB` y `rocaD` no los pone el reparto: están porque la lista de piezas menudas los nombra.
 */
export const PIEZA = {
  /* Árboles sueltos y arboledas. */
  arbolA: 'arbol-a',
  arbolB: 'arbol-b',
  tocon: 'tocon',
  arboledaGrande: 'arboleda-grande',
  arboledaMedia: 'arboleda-media',
  arboledaPequena: 'arboleda-pequena',

  /* Relieve suelto. */
  colinaA: 'colina-a',
  rocaA: 'roca-a',
  rocaB: 'roca-b',
  rocaC: 'roca-c',
  rocaD: 'roca-d',
  rocaE: 'roca-e',

  /* Campo y muralla. */
  trigal: 'trigal',
  barbecho: 'barbecho',
  valla: 'valla',
  vallaPuerta: 'valla-puerta',
  muro: 'muro',
  muroPuerta: 'muro-puerta',

  /* Trastos. */
  tienda: 'tienda',
  saco: 'saco',
  carro: 'carro',
  barril: 'barril',
  caja: 'caja',
  lena: 'lena',
  piedra: 'piedra',
  almiar: 'almiar',
  abrevadero: 'abrevadero',

  /* Los edificios del paisaje. */
  casa: 'casa',
  iglesia: 'iglesia',
  taberna: 'taberna',
  mercado: 'mercado',
  molino: 'molino',
  herreria: 'herreria',
  pozo: 'pozo',
  atalaya: 'atalaya',
  concejo: 'concejo',
  taller: 'taller',
  cuadras: 'cuadras',
  ermita: 'ermita',
  vigia: 'vigia',
} as const;

/** El nombre de una de estas piezas. */
export type NombreDePieza = (typeof PIEZA)[keyof typeof PIEZA];

/* ─── DOS PREGUNTAS SOBRE LA MISMA LISTA, Y NO SON LA MISMA PREGUNTA ─────── */

/**
 * LAS PIEZAS MENUDAS: lo primero que se deja de pintar al alejarse la cámara.
 *
 * Escrita a mano y no derivada del tamaño, por lo que dice `PuestaEnLaLosa.menuda`.
 * Lo que está aquí es lo que a tres losas de distancia no se distingue de la hierba.
 *
 * Vivía en el reparto; está aquí para que se lea al lado de `comoEstorba`, que es la otra
 * pregunta que se le hace a esta lista y se contesta distinto. «Menuda» es una decisión de
 * DIBUJO —cuándo deja de pintarse—, no de física. Que lo menudo no estorbe al andar es
 * además una decisión de producto, no una consecuencia de esta lista.
 */
const PIEZAS_MENUDAS: ReadonlySet<string> = new Set<string>([
  PIEZA.valla,
  PIEZA.vallaPuerta,
  PIEZA.piedra,
  PIEZA.barril,
  PIEZA.caja,
  PIEZA.saco,
  PIEZA.lena,
  PIEZA.tocon,
  PIEZA.carro,
  PIEZA.abrevadero,
  PIEZA.tienda,
  PIEZA.rocaA,
  PIEZA.rocaB,
  PIEZA.rocaC,
  PIEZA.rocaD,
  PIEZA.rocaE,
  PIEZA.pozo,
]);

/** ¿Es ésta de las que se dejan de pintar de lejos? */
export function esMenuda(pieza: string): boolean {
  return PIEZAS_MENUDAS.has(pieza);
}

/**
 * LA CUBIERTA DE SUELO: lo que se pone ENCIMA del prado y no delante.
 *
 * Un trigal y un barbecho son el campo mismo —1,9 por 2,1 del pack, veinte unidades del
 * mundo, a un tercio de persona de alto—. Andando se cruzan: son por donde se anda.
 */
const CUBIERTA_DE_SUELO: ReadonlySet<string> = new Set<string>([PIEZA.trigal, PIEZA.barbecho]);

/**
 * CÓMO ESTORBA UNA PIEZA A QUIEN ANDA.
 *
 *   · `'nada'` — se atraviesa. Lo MENUDO, por decisión de producto: vallas, setos, barriles,
 *     carros, sacos, leña, cajas, puestos, pozos, abrevaderos, piedras, rocas y tocones. Y la
 *     CUBIERTA DE SUELO, que es el campo mismo.
 *   · `'puerta'` — `muro-puerta`: estorba por sus dos lados y se cruza por el hueco. La
 *     muralla tiene que parar y la puerta tiene que dejar pasar, y las dos cosas son la
 *     misma pieza.
 *   · `'caja'` — TODO LO DEMÁS, con la caja medida de su modelo. Hoy eso es: el lienzo de
 *     muralla; los remates (atalaya y vigía); la ermita; los edificios de la villa —casas,
 *     iglesia, taberna, mercado, concejo, herrería, taller, molino, cuadras—; y del campo, lo
 *     que se levanta: los árboles sueltos y las tres arboledas, el almiar y la colina.
 *
 * ═══ LOS ÁRBOLES, SÍ; Y LAS ROCAS, NO ═══
 *
 * Un árbol del pack tiene la copa baja: medida en el `.glb`, empieza a 0,14 del pack en
 * `arbol-b` y a 0,19 en `arbol-a` —una sexta parte de su alto—, que a la escala a la que
 * los pone el reparto son entre 1,3 y 2,3 unidades del mundo: el pecho o la cabeza de quien
 * anda (2,543). Andar hasta el tronco es meter la cabeza en la copa, así que se choca con la
 * copa, que es lo que se ve. Una arboleda es un bosquecillo de veinte unidades y se rodea.
 * El almiar ya estaba nombrado como obstáculo en la cabecera de `mundo.ts`, y la colina es
 * un bulto de doce por nueve.
 *
 * Las rocas, las piedras y los tocones son MENUDOS y no estorban, aunque los mayores pasen
 * de la altura de una persona: una `piedra` mide 2,3 junto a la senda y hasta 3,4 en el
 * erial, una `roca-e` hasta 2,3 y un tocón hasta 2,7. Es la regla de producto —lo menudo no
 * choca— aplicada sin excepciones, que es lo que la hace comprobable. Si un día se quiere
 * que las piedras grandes paren, es una línea aquí y `verify:lindes-mundo` pedirá su huella.
 *
 * ═══ POR QUÉ «TODO LO DEMÁS» Y NO UNA LISTA DE LO QUE CHOCA ═══
 *
 * Porque el fallo de las dos formas no es igual de visible. Con una lista de lo que choca,
 * un edificio nuevo en el reparto se atraviesa en silencio. Con esta, estorba desde el
 * primer día, y como no tiene huella medida `verify:lindes-mundo` se pone rojo hasta que
 * alguien lo mida o lo declare menudo.
 */
export function comoEstorba(pieza: string): 'nada' | 'puerta' | 'caja' {
  if (pieza === PIEZA.muroPuerta) return 'puerta';
  if (esMenuda(pieza) || CUBIERTA_DE_SUELO.has(pieza)) return 'nada';
  return 'caja';
}
