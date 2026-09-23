/**
 * LAS MEDIDAS DE LAS LINDES, y de dónde sale cada una.
 *
 * ═══ NINGUNA SE ELIGIÓ: TODAS SALEN DE MEDIR EL PACK ═══
 *
 * Es la misma disciplina que `escenas/burgo/ciudad.ts` tiene escrita en su §0 —
 * las tres medidas que mandan allí salieron de medir los ocho packs, no de que
 * sonaran bien—. Aquí las piezas son las del pack hexagonal que ya levanta el
 * delta de Riberas (`escenas/modelos/tablero.glb`), y éstas son las medidas de
 * verdad, tomadas del fichero:
 *
 *     una tesela del pack .......... 2 de ancho, 1 de alto, 2,309 de fondo
 *     un tramo de muralla .......... 2 de largo, 1,1 de alto
 *     una casa ..................... 0,875 × 1,28 × 1,099
 *     un árbol ..................... 0,574 × 1,196
 *     una valla .................... 1,155 de largo
 *     un trigal .................... 1,874 × 2,094
 *     una persona (`escala.ts`) .... 2,543 en unidades del MUNDO
 *
 * De ahí sale lo único que hubo que decidir: **una losa mide TREINTA Y DOS unidades
 * de pack de lado**.
 *
 * ═══ ESTO VALÍA CUATRO, Y LA DECISIÓN LA REVOCA MIGUEL MIRÁNDOLO ═══
 *
 * Con cuatro la cuenta cuadraba —dos tramos de muralla por lado, una casa por cada
 * cinco de losa— y el tablero se veía. Lo que NO se veía era una COMPOSICIÓN: con
 * una villa de cuatro por uno y medio no hay sitio para una manzana con su calle,
 * ni para una muralla con dos torres y una puerta, ni para una arboleda al lado de
 * un trigal sin que se toquen. Cabían las piezas y no cabía lo que se hace con
 * ellas — y eso se ve en cuanto se mira: parecía una maqueta apretada.
 *
 * Ocho veces más de lado son SESENTA Y CUATRO veces más de suelo, y lo que compran
 * es exactamente lo que faltaba:
 *
 *   1. DIECISÉIS TRAMOS DE MURALLA por lado, no dos. Una muralla deja de ser un
 *      pedacito de tapia y pasa a ser un recinto, con sus torres y su puerta.
 *   2. Una villa admite MANZANAS: grupos de casas con calles entre ellos, una plaza
 *      con su pozo, un edificio que manda. Con cuatro, «la villa» eran cuatro casas
 *      pegadas.
 *   3. Con la escala del pack (5,469), una losa mide 175 del mundo y una persona
 *      2,543: SESENTA Y NUEVE personas por lado. Ahí el paseo de la capa 12
 *      significa algo — cruzar una losa andando cuesta un cuarto de minuto, y por
 *      dentro de una villa hay calles por las que andar.
 *
 * Y lo que NO compran, que es lo que hay que vigilar: más piezas. Sesenta y cuatro
 * veces el suelo con sesenta y cuatro veces las piezas es la misma maqueta apretada
 * en grande. Lo que crece es el HUECO entre las cosas — ver `PIEZAS_POR_LOSA`.
 *
 * ═══ Y TODO LO DEMÁS SE DERIVA ═══
 *
 * Las profundidades, los anchos y las alturas de aquí abajo son fracciones del
 * lado. No es elegancia: es que el día que el lado cambie —y cambiará, porque lo
 * decide cómo se ve en un móvil— no haya catorce números que ajustar a mano.
 *
 * ═══ LAS QUE DECIDEN DÓNDE HAY ALGO VIVEN EN `shared/`, Y AQUÍ SE REEXPORTAN ═══
 *
 * El lado de la losa, la retícula, la villa, la senda, el cupo de piezas y las escalas
 * de lo que se pone se mudaron a `shared/arcade/juegos/lindes-medidas.ts` con el reparto
 * de piezas: de ellas sale con qué se choca al andar, y eso lo derivan igual el aparato
 * y el servidor. Se reexportan aquí con el mismo nombre, así que quien las importaba de
 * este fichero no se entera, y sigue habiendo UNA verdad sobre cuánto mide una losa. Su
 * explicación, número a número, se fue con ellas.
 *
 * Aquí se quedan las que son sólo de PINTAR: el grueso del cartón, el presupuesto de
 * triángulos y el labriego.
 */
import { ALTURA_DE_UNA_PERSONA } from '../escala';
import { LADO_DE_LOSA } from '../../shared/arcade/juegos/lindes-medidas';

export {
  ALZADO_DE_LA_VILLA,
  ANCHO_DEL_EJE,
  ANCHO_DE_LA_SENDA,
  CELDAS_POR_LOSA,
  CELDAS_POR_MURO,
  CELDAS_POR_SETO,
  CHAFLAN_DE_LA_VILLA,
  ENTRADA_RECTA_DE_LA_SENDA,
  ESCALA_DEL_QUE_MANDA,
  ESCALA_DEL_SETO,
  ESCALA_DE_LA_CASA,
  ESCALA_DE_LA_ERMITA,
  ESCALA_DE_LA_MURALLA,
  ESCALA_DE_LA_TORRE,
  FONDO_DE_LA_VILLA,
  HUNDIDO_DE_LA_SENDA,
  LADO_DE_CELDA,
  LADO_DE_LOSA,
  LADO_EN_PACK,
  LARGO_DE_LA_VALLA_EN_PACK,
  NUCLEO_DE_LA_VILLA,
  PIEZAS_POR_LOSA,
  TIRON_AL_CENTRO,
} from '../../shared/arcade/juegos/lindes-medidas';

/** La mitad, que sale en todas las cuentas de posición. */
export const MEDIA_LOSA = LADO_DE_LOSA / 2;

/**
 * EL GRUESO DE LA LOSA, y por qué se ve.
 *
 * Una losa de este juego es una FICHA DE CARTÓN que alguien pone encima de la
 * mesa, y eso tiene que leerse: sin grueso, el tablero parece un mapa pintado y
 * se pierde de un golpe lo que hace que el juego se vea —que cada pieza la puso
 * alguien—.
 *
 * Un cincuentavo del lado y no un veinteavo, que es lo que era cuando la losa medía
 * cuatro: el grueso de un cartón NO crece con el tamaño de la ficha, y un veinteavo
 * de 175 sería un bordillo de nueve unidades —tres personas y media— por el que
 * nadie podría subir andando.
 */
export const GRUESO_DE_LOSA = LADO_DE_LOSA / 50;

/**
 * EL PRESUPUESTO DE TRIÁNGULOS DEL TABLERO ENTERO.
 *
 * ═══ ERAN NOVECIENTOS MIL Y LOS AMPLÍA MIGUEL ═══
 *
 * Aquel techo salía de lo que el Burgo se permite, y el Burgo pinta una ciudad
 * moderna con coches: mucha pieza pequeña y repetida. Aquí lo que hay que sostener
 * es otra cosa —setenta y dos losas de 175 unidades con villas amuralladas, campos
 * con sus lindes y arboledas— y recortar hasta caber en novecientos mil dejaba el
 * valle pelado, que es justo lo que este juego no puede permitirse: el tablero ES
 * el producto.
 *
 * Tres millones y pico, y lo que lo hace sostenible no es el número sino el NIVEL DE
 * DETALLE POR DISTANCIA: lo que cuenta una regla se pinta siempre, y el relleno sólo
 * cerca de donde mira la cámara. Sin eso, ampliar el techo es aplazar el problema
 * hasta la losa cuarenta.
 *
 * ═══ Y EL NÚMERO NO SE ELIGIÓ: SE MIDIÓ Y SE AJUSTÓ LO DE DEBAJO ═══
 *
 * La primera cuenta con las setenta y dos puestas daba nueve millones y medio, o sea
 * cuatro veces lo que cabe. Lo que se subió fue el techo una vez; lo que se BAJÓ
 * fueron tres cosas, que es de donde salió de verdad el hueco: las casas por villa de
 * veintidós a doce, el cupo de relleno de sesenta a cuarenta y dos, y el anillo del
 * relleno de siete losas a cuatro. `verify:lindes-escena` mide las dos cuentas —el
 * peor caso desnudo y el tablero con el recorte puesto— y es la segunda la que manda,
 * porque es la única que la pantalla pinta de verdad.
 */
export const TOPE_DE_TRIANGULOS = 3_200_000;

/**
 * LO QUE MIDE UN LABRIEGO, en unidades del mundo.
 *
 * ═══ UNA FICHA NO ESTÁ A ESCALA, Y ÉSA ES LA DECISIÓN ═══
 *
 * Valía «persona y media» —una altura del mundo— y con la losa en 175 eso deja un
 * peón de cuatro unidades al lado de una muralla de seis: desde la cámara de mesa no
 * se ve, y lo que no se ve de un tablero es de quién es cada cosa, que es lo único
 * que el labriego está ahí para decir.
 *
 * Así que NO está a escala del paisaje, y no es un descuido: en la mesa de verdad la
 * ficha también es enorme al lado de las casitas pintadas. Lo que tiene que cumplir
 * es leerse de un vistazo, y para eso mide una novena parte del lado de su losa
 * —unas siete personas— y crece con ella.
 */
export const ALTO_DEL_LABRIEGO = LADO_DE_LOSA * 0.11;

/**
 * LO QUE SE LEVANTA LA ÚLTIMA LOSA PUESTA, para que se vea de un vistazo cuál es.
 *
 * Levanta sus PIEZAS y no su suelo, así que desde la mesa es un resalte del tres por
 * ciento del lado: se lee y no molesta.
 */
export const ALTO_DE_LA_ULTIMA = LADO_DE_LOSA * 0.03;

/**
 * Y CUÁNTO SE LEVANTA DE VERDAD, QUE DEPENDE DE DESDE DÓNDE SE MIRE.
 *
 * ═══ A PIE, NADA ═══
 *
 * `ALTO_DE_LA_ULTIMA` son cinco unidades y cuarto: DOS PERSONAS. Desde la mesa eso es el
 * resalte que dice «ésta acaba de ponerse». Andando por el tablero son las casas, la
 * muralla y los árboles de esa losa **flotando a dos alturas de hombre sobre su propio
 * terreno** — y el paseante nace precisamente en esa losa, así que es lo primero que ve.
 *
 * Es el mismo caso que `ALTO_DEL_LABRIEGO`: una ayuda pensada para quien mira la mesa
 * desde arriba, que vista desde el suelo es un disparate. Y se resuelve igual: la ayuda
 * se queda en la mesa.
 */
export function loQueSeLevantaLaUltima(aPie: boolean): number {
  return aPie ? 0 : ALTO_DE_LA_ULTIMA;
}

/**
 * LO QUE ENCOGE EL LABRIEGO AL BAJAR AL TABLERO.
 *
 * ═══ UNA FICHA DESDE LA MESA, UN HOMBRE DESDE EL SUELO ═══
 *
 * `ALTO_DEL_LABRIEGO` son siete personas, y su comentario explica por qué: desde la mesa
 * el labriego no es un señor en un campo, es la marca de QUIÉN tiene qué, y tiene que
 * leerse de un vistazo entre las casitas. Eso sigue siendo verdad.
 *
 * Lo que no estaba previsto es que este tablero se recorre A PIE. Y a pie esa misma ficha
 * es un gigante de trece metros plantado en el prado, con la peana flotándole a la altura
 * de la rodilla del paseante. Mirado en el móvil: al pulsar «hombro» la pantalla se
 * llenaba de rojo — y lo primero que parecía es que el avatar salía gigante. El avatar
 * estaba bien; lo gigante era la ficha.
 *
 * Así que no se cambia la decisión: se parte en dos. Ficha en la mesa, hombre a pie, con
 * la altura EXACTA del aventurero que anda a su lado. Y no es un apaño de tamaño: un
 * labriego es, literalmente, un hombre en un campo.
 */
export function loQueEncogeElLabriego(aPie: boolean): number {
  return aPie ? ALTURA_DE_UNA_PERSONA / ALTO_DEL_LABRIEGO : 1;
}

/** Cuánto sobresale del suelo la peana de un labriego. */
export const PEANA_DEL_LABRIEGO = LADO_DE_LOSA * 0.002;
