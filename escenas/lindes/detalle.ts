/**
 * HASTA DÓNDE SE PINTA EL RELLENO, EN LAS DOS CALIDADES, Y QUIÉN DECIDE CUÁL.
 *
 * Aritmética y sin `three`: la usa `Lindes.tsx` para recortar por distancia y la usa
 * `verify:lindes-escena` para contar los triángulos de las dos calidades con los MISMOS
 * números. Hasta ahora esos números vivían en la escena y el comprobador llevaba su copia
 * escrita a mano —«1.8» y «4»—, y una copia es un presupuesto que se queda midiendo lo de
 * antes el día que alguien toque la escena.
 *
 * ═══ LOS DOS ANILLOS DE DETALLE, en losas alrededor de donde mira la cámara ═══
 *
 * Con uno solo hay que elegir entre un tablero pelado de cerca o uno que no cabe de lejos.
 * Con dos, lo que desaparece primero es lo que primero deja de verse:
 *
 *     hasta el anillo de lo menudo ..... todo, hasta el último barril
 *     hasta el anillo del relleno ...... lo que tiene bulto: casas, edificios, árboles, mieses
 *     más allá ......................... sólo lo que cuenta una regla: murallas, torres, ermitas
 *
 * Los números de `plena` salieron de MEDIR, no de elegir: con siete y dos con seis, un tablero
 * de nueve por nueve pintaba cuatro millones y medio de triángulos contra un techo de tres.
 *
 * La tercera línea es la que no se puede tocar EN NINGUNA CALIDAD. Un tablero sin árboles al
 * fondo sigue siendo el tablero; uno sin la muralla de una villa cerrada es el tablero
 * mintiendo sobre la partida, y eso se paga en una jugada mal hecha.
 *
 * ═══ LA SOBRIA: SIN LO MENUDO Y CON EL RELLENO MÁS CERCA ═══
 *
 * Las Lindes iba con `calidad="plena"` escrito a mano en los dos clientes, y la escena ni
 * siquiera leía la prop: un móvil justo pintaba lo mismo que un PC con un presupuesto de
 * 3,2 millones, que es un techo de PC. Ahora la sobria recorta lo que esta casa recorta en
 * todas sus escenas:
 *
 *   · LO MENUDO, entero —barriles, piedras, tocones, carros, setos—, como el atrezo menudo
 *     del Burgo. En triángulos es poco —37.000 de los 2,67 millones del tablero peor—, pero
 *     son veinte de las sesenta y seis piezas de la losa más cara, y cada una que se pinta
 *     la recompone la escena en cada fotograma.
 *   · EL RELLENO, de cuatro losas a dos y media. Es lo que de verdad pesa.
 *   · Y LAS SOMBRAS NO, PORQUE NO HAY: los dos lienzos van con `shadows={false}` y ninguna
 *     luz de la escena proyecta. No hay nada que apagar ahí.
 *
 * Medido por `verify:lindes-escena` con la cuenta de siempre —un nueve por nueve de la losa
 * más cara, con los triángulos reales del `.glb`—:
 *
 *     plena ....... 2.673.470 triángulos
 *     sobria ...... 1.945.104 (−728.366, un 27 % menos)
 *     de ellos, lo que cuenta una regla: 1.413.450 en LAS DOS
 *
 * La última línea es el suelo, y conviene tenerla delante: murallas y torres son más de la
 * mitad del tablero peor y no se recortan. Si un móvil sigue justo en sobria, lo siguiente
 * no está en el relleno: está en lo que pesa un tramo de muralla o en la resolución del lienzo.
 *
 * ═══ QUIÉN DECIDE: EL JUEZ DE LA CASA, Y SIN VOLVER A SUBIR ═══
 *
 * El juez es `juzgarCalidad` (`embarcadero/calidad.ts`): 22 ms de media en 120 fotogramas.
 * Lo que aquí cambia es CUÁNDO se le pregunta, por algo que a este juego le pasa y al Burgo
 * no: EL TABLERO CRECE. Una partida empieza con una losa y acaba con setenta y dos. Juzgar una
 * vez al montar —lo que hace el Burgo en la app, cuya ciudad está entera desde el primer
 * fotograma— sería juzgar casi siempre un tablero de una losa, que es con lo que se abre la
 * mesa: plena para todos y la sobria sin llegar nunca, que es el `"plena"` escrito a mano con
 * otra cara.
 *
 * Así que se le pregunta con cada muestra, sobre las últimas doce —doce segundos, lo que usa
 * el Burgo del escritorio—, y cuando dice `sobria` se queda en sobria. No sube: si subiera en
 * cuanto el aparato respira, el relleno entraría y saldría y los árboles aparecerían y
 * desaparecerían cada pocos segundos; la sobria es para un aparato que ya se ha visto justo.
 */
import { juzgarCalidad } from '../embarcadero/calidad';
import type { MuestraDelHilo } from '../embarcadero/calidad';
import type { Calidad } from '../embarcadero/tipos';

/** Hasta dónde se pinta cada cosa que se recorta, en LOSAS desde donde mira la cámara. */
export interface AnillosDeDetalle {
  /** Lo menudo: barriles, piedras, setos. Cero es NUNCA, no «sólo lo del centro». */
  readonly menudo: number;
  /** El relleno con bulto: casas, edificios, árboles, mieses. */
  readonly relleno: number;
}

/** Los anillos de cada calidad. Lo que cuenta una regla no tiene anillo: se pinta siempre. */
export const ANILLOS_DE_DETALLE: Readonly<Record<Calidad, AnillosDeDetalle>> = {
  plena: { menudo: 1.8, relleno: 4 },
  sobria: { menudo: 0, relleno: 2.5 },
};

/**
 * A QUÉ PARTE DEL ANILLO EMPIEZA UNA PIEZA A IRSE, para que el recorte no se vea.
 *
 * Desde aquí hasta el tope la pieza encoge hasta nada. Dos tercios es bastante para que el
 * cambio no se lea como un parpadeo y poco para que no se noten los árboles enanos: en el
 * último tercio del alcance una pieza ya está lejos y ocupa unos pocos píxeles. No cuesta un
 * triángulo: es la escala que ya se estaba componiendo.
 */
export const DONDE_EMPIEZA_A_IRSE = 0.66;

/**
 * CUÁNTAS MUESTRAS MIRA EL JUEZ: las últimas doce, una por segundo. `juzgarCalidad` pide 120
 * fotogramas, así que doce segundos le bastan hasta a un aparato a diez por segundo, y no
 * arrastran el historial de una partida que puede durar tres días.
 */
export const MUESTRAS_DE_LA_VENTANA = 12;

/** La ventana con la muestra nueva dentro: las últimas `MUESTRAS_DE_LA_VENTANA`. */
export function conLaMuestra(ventana: readonly MuestraDelHilo[], nueva: MuestraDelHilo): MuestraDelHilo[] {
  return [...ventana, nueva].slice(-MUESTRAS_DE_LA_VENTANA);
}

/**
 * LA CALIDAD DEL VALLE DESPUÉS DE UNA MUESTRA MÁS.
 *
 * La sobria no se deja; la plena se deja en cuanto el juez de la casa lo diga sobre la
 * ventana. Mientras no haya fotogramas bastantes para juzgar, se sigue como se estaba.
 */
export function calidadDelValle(antes: Calidad, ventana: readonly MuestraDelHilo[]): Calidad {
  if (antes === 'sobria') return 'sobria';
  return juzgarCalidad(ventana.slice(-MUESTRAS_DE_LA_VENTANA)) ?? antes;
}
