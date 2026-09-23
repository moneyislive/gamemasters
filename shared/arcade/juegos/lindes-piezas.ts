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
import { ALTO_Y_RADIO_DEL_MODELO } from './lindes-huellas';
import { ALTURA_DE_UNA_PERSONA, ESCALA_DEL_PACK } from './lindes-medidas';

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
 * además una decisión de producto, no una consecuencia de esta lista; y tiene una excepción,
 * las piedras, las rocas y los tocones que pasan de la cintura, que se pintan como menudos y
 * se rodean como lo que son.
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
 * LAS PIEDRAS, LAS ROCAS Y LOS TOCONES: lo menudo que se rodea si es alto. Ver `comoEstorba`.
 */
const PIEDRAS_ROCAS_Y_TOCONES: ReadonlySet<string> = new Set<string>([
  PIEZA.piedra,
  PIEZA.rocaA,
  PIEZA.rocaB,
  PIEZA.rocaC,
  PIEZA.rocaD,
  PIEZA.rocaE,
  PIEZA.tocon,
]);

/** La cintura de quien anda: media persona, 1,27 unidades del mundo. Ver `comoEstorba`. */
export const CINTURA_DE_QUIEN_ANDA = ALTURA_DE_UNA_PERSONA / 2;

/** Las cuatro respuestas de `comoEstorba`: la última se resuelve por pieza puesta. */
export type ComoEstorba = 'nada' | 'puerta' | 'caja' | 'si-pasa-de-la-cintura';

/**
 * CÓMO ESTORBA UNA PIEZA A QUIEN ANDA, por su nombre.
 *
 *   · `'nada'` — se atraviesa. Lo MENUDO, por decisión de producto: vallas, setos, barriles,
 *     carros, sacos, leña, cajas, puestos, pozos y abrevaderos. Y la CUBIERTA DE SUELO, que
 *     es el campo mismo.
 *   · `'si-pasa-de-la-cintura'` — las piedras, las rocas y los tocones: los que, PUESTOS, pasan
 *     de la cintura de quien anda estorban con su planta medida, y los demás se pisan. Como eso
 *     depende de la escala a la que los pone el reparto, no se contesta aquí sino en
 *     `comoEstorbaLaPuesta`, que es la que usa el mundo.
 *   · `'puerta'` — `muro-puerta`: estorba por sus dos lados y se cruza por el hueco. La
 *     muralla tiene que parar y la puerta tiene que dejar pasar, y las dos cosas son la
 *     misma pieza.
 *   · `'caja'` — TODO LO DEMÁS, con la caja medida de su modelo. Hoy eso es: el lienzo de
 *     muralla; los remates (atalaya y vigía); la ermita; los edificios de la villa —casas,
 *     iglesia, taberna, mercado, concejo, herrería, taller, molino, cuadras—; y del campo, lo
 *     que se levanta: los árboles sueltos y las tres arboledas, el almiar y la colina.
 *
 * ═══ LOS ÁRBOLES, SÍ ═══
 *
 * Un árbol del pack tiene la copa baja: medida en el `.glb`, empieza a 0,14 del pack en
 * `arbol-b` y a 0,19 en `arbol-a` —una sexta parte de su alto—, que a la escala a la que
 * los pone el reparto son entre 1,3 y 2,3 unidades del mundo: el pecho o la cabeza de quien
 * anda (2,543). Andar hasta el tronco es meter la cabeza en la copa, así que se choca con la
 * copa, que es lo que se ve. Una arboleda es un bosquecillo de veinte unidades y se rodea.
 * El almiar ya estaba nombrado como obstáculo en la cabecera de `mundo.ts`, y la colina es
 * un bulto de doce por nueve.
 *
 * ═══ Y LAS ROCAS, SI PASAN DE LA CINTURA ═══
 *
 * Hasta el 23 de septiembre las piedras, las rocas y los tocones eran menudos y ninguno
 * estorbaba, aunque los mayores pasaran de la altura de una persona: una `piedra` mide 2,3 junto
 * a la senda y hasta 3,4 en el erial. Y se veía: Miguel se quejó de que las rocas grandes se
 * atravesaban. La regla nueva es la de un cuerpo: lo que no llega a la cintura se pisa o se
 * salta, y lo que pasa de ella se rodea.
 *
 * Es una pregunta por pieza PUESTA y no por nombre, porque «grande» lo decide la escala a la
 * que la pone el reparto y no el modelo: una `roca-b` a escala 1,7 no llega a la cintura y a
 * 1,75 pasa. Con el reparto de hoy sale así, medido: la `roca-a` no pasa nunca —mide de 0,64 a
 * 0,83 en el erial— y se sigue pisando; la `piedra`, la `roca-c`, la `roca-e` y el tocón pasan
 * siempre y con holgura —lo más bajo que se pone de ellos, una `roca-c` o una `roca-e` a 1,7,
 * mide 1,81—. La `roca-b` y la `roca-d` no las pone el reparto.
 *
 * La planta con la que estorban se mide como la de todo lo que estorba (`lindes-huellas.ts`):
 * hasta la cabeza de quien anda a la escala de una torre, que para ellas es la planta ENTERA
 * —la más alta, la piedra, mide 0,28 del pack, y la huella se mide hasta 0,33—. No hace falta
 * otra altura, porque el invariante que la de ahora pide —que nada que estorba se ponga más
 * pequeño que una torre— se sigue cumpliendo: el reparto las pone a 1,5 junto a la senda y de
 * 1,7 a 2,2 en las parcelas, y la torre va a 1,4. Lo vigila `verify:lindes-mundo`, que además
 * mira que ninguna tape una senda, el hueco de una puerta o un sitio de nacer, ni parta el valle
 * en trozos. Y como van giradas de cualquier manera, su caja es la de su RADIO medido: ver
 * `cajasDeLaPuesta`.
 *
 * Lo demás menudo sigue sin estorbar aunque haya barriles o carros que pasen de la cintura: la
 * queja era de las rocas, y para todo lo demás la regla de producto —lo menudo no choca— se
 * aplica sin excepciones, que es lo que la hace comprobable.
 *
 * ═══ POR QUÉ «TODO LO DEMÁS» Y NO UNA LISTA DE LO QUE CHOCA ═══
 *
 * Porque el fallo de las dos formas no es igual de visible. Con una lista de lo que choca,
 * un edificio nuevo en el reparto se atraviesa en silencio. Con esta, estorba desde el
 * primer día, y como no tiene huella medida `verify:lindes-mundo` se pone rojo hasta que
 * alguien lo mida o lo declare menudo.
 */
export function comoEstorba(pieza: string): ComoEstorba {
  if (pieza === PIEZA.muroPuerta) return 'puerta';
  if (PIEDRAS_ROCAS_Y_TOCONES.has(pieza)) return 'si-pasa-de-la-cintura';
  if (esMenuda(pieza) || CUBIERTA_DE_SUELO.has(pieza)) return 'nada';
  return 'caja';
}

/**
 * LO QUE MIDE DE ALTO UNA PIEZA PUESTA, en unidades del mundo, desde el suelo donde se apoya.
 * `null` si su alto no está medido: sólo se mide el de lo que estorba si pasa de la cintura.
 */
export function altoDeLaPuesta(pieza: string, escala: number): number | null {
  const medido = ALTO_Y_RADIO_DEL_MODELO[pieza];
  return medido === undefined ? null : medido.alto * ESCALA_DEL_PACK * escala;
}

/**
 * CÓMO ESTORBA UNA PIEZA PUESTA: lo que dice `comoEstorba`, con las piedras resueltas por lo que
 * miden a la escala a la que se pusieron. Es la pregunta que hace el mundo (`cajasDeLaPuesta`).
 *
 * «Pasa de la cintura» es estrictamente más: una piedra que midiera la cintura justa se pisaría.
 * Y la cuenta son dos productos en coma flotante, que IEEE 754 fija al bit: da lo mismo en el
 * servidor que en Hermes.
 *
 * Una piedra sin alto medido estorba, que es el trato que recibe un edificio nuevo: como tampoco
 * tiene huella, `verify:lindes-mundo` se pone rojo hasta que alguien vuelva a medir el pack.
 */
export function comoEstorbaLaPuesta(pieza: string, escala: number): 'nada' | 'puerta' | 'caja' {
  const como = comoEstorba(pieza);
  if (como !== 'si-pasa-de-la-cintura') return como;
  const alto = altoDeLaPuesta(pieza, escala);
  if (alto === null) return 'caja';
  return alto > CINTURA_DE_QUIEN_ANDA ? 'caja' : 'nada';
}
