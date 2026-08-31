/**
 * LOS MUEBLES DE LA SALA: con qué se pinta cada arcade, y adónde se navega.
 *
 * ═══ QUÉ ES UN MUEBLE Y QUÉ NO ES ═══
 *
 * Un mueble es la SUPERFICIE donde se pinta un juego, y es un dato del manifiesto
 * y nunca una decisión de la plataforma: si la capa de pintado se decidiera dentro
 * del motor —mirando el estado, o el `tickHz`, o si hay tablero— el motor saldría
 * a medida del primer minijuego que se escriba.
 *
 * Y NO es una pantalla de `expo-router`, aunque aquí cada uno tenga la suya. La
 * diferencia importa: un mueble sirve a MUCHOS juegos. La ruta `/formulario` la
 * abren La Frente y cualquier otro arcade que declare ese mueble, con el
 * identificador del juego como parámetro. Si hubiera una ruta por juego, cada
 * arcade nuevo exigiría publicar una versión de la app.
 *
 * ═══ POR QUÉ ESTA TABLA ES UN `Record` SOBRE LA UNIÓN CERRADA ═══
 *
 * Porque la app es un binario compilado y los muebles que sabe pintar están
 * dentro. Con una cadena libre, un arcade podría declarar `'mi-mueble'` y en el
 * móvil no saldría NADA —sin error, sin aviso— hasta que alguien abriera la Sala.
 * Con el `Record`, añadir un mueble al contrato no compila hasta que la app sabe
 * qué hacer con él. Es el mismo acoplamiento honesto que `PANTALLAS` de
 * `app/app/(juego)/_layout.tsx`: se paga una línea y a cambio el compilador no
 * deja estrenarse a medias.
 *
 * ═══ LOS TRES QUE TODAVÍA NO SE PINTAN, Y POR QUÉ ESTÁN AQUÍ IGUAL ═══
 *
 * De los cuatro muebles del contrato, la fase 1 solo entrega `formulario`. Los
 * otros tres tienen su entrada y su ruta, y esa ruta enseña una pantalla que dice
 * la verdad —qué mueble falta y qué fase lo trae— en vez de quedarse en blanco.
 *
 * No es andamiaje ni un catálogo fingido: HOY NO SE PUEDE LLEGAR A NINGUNA DE LAS
 * TRES, porque no hay ningún arcade instalado que declare esos muebles y la ruta
 * se calcula a partir del manifiesto. Son el equivalente de `papiro` y `sellado`
 * en el otro motor: existen en el binario y solo se pintan donde un manifiesto las
 * pide. Lo que compran es que el día que llegue Riberas, el compilador obligue a
 * escribir el tablero antes de dejar instalar el juego.
 */
import type { ManifiestoDeArcade, MuebleDeArcade } from '../../../shared/arcade';

/** Qué sabe la app de cada mueble. */
export interface Mueble {
  /** La ruta de `expo-router` que lo pinta. Coincide con el nombre del mueble. */
  ruta: string;
  /** ¿Sabe la app pintarlo ya, o solo sabe decir que falta? */
  seSabePintar: boolean;
  /** Qué es, en una línea, para la pantalla que explica lo que falta. */
  loQueEs: string;
  /** Qué juego lo estrena, para no prometer fechas sino trabajo. */
  cuandoLlega: string;
}

export const MUEBLES: Record<MuebleDeArcade, Mueble> = {
  formulario: {
    ruta: '/formulario',
    seSabePintar: true,
    loQueEs: 'Vistas normales: botones, listas, un cronómetro grande. Coste cero.',
    cuandoLlega: 'Ya está: lo estrena La Frente.',
  },
  tablero: {
    ruta: '/tablero',
    seSabePintar: false,
    loQueEs: 'Una topología declarada, pintada con SVG. El tablero es dato, no reductor.',
    cuandoLlega: 'Llega con Riberas, el juego de tablero propio.',
  },
  lienzo: {
    ruta: '/lienzo',
    seSabePintar: false,
    loQueEs: 'Dos dimensiones a ritmo de fotograma, con el bucle en el hilo de interfaz.',
    cuandoLlega: 'Llega con El Arcade, el de sesenta fotogramas por segundo.',
  },
  escena: {
    ruta: '/escena',
    seSabePintar: false,
    loQueEs: 'Tres dimensiones, y solo a través del lienzo común de la app.',
    cuandoLlega: 'Llega cuando alguien lo pida, y no antes: cuesta megabytes a todo el mundo.',
  },
};

/**
 * Adónde se navega para jugar a un arcade.
 *
 * El juego viaja como parámetro y el mueble como ruta, y no al revés. Con una
 * ruta por juego —`/frente`— cada arcade nuevo obligaría a publicar una versión de
 * la app, que es exactamente lo que el enchufe de la fase 5 existe para evitar.
 */
export function rutaDeArcade(manifiesto: ManifiestoDeArcade): string {
  return `${MUEBLES[manifiesto.mueble].ruta}?arcade=${encodeURIComponent(manifiesto.id)}`;
}

/**
 * LOS COLORES DE LA SALA, y por qué no son los del tema de las veladas.
 *
 * La portada separa las dos familias a propósito: una es alta y con retrato, la
 * otra ancha y plana, y el acento de la sala de arcade es este verde de neón. La
 * razón está escrita allí y es de producto: nadie puede confundir «una noche con
 * cinco amigos» con «un minuto de pie».
 *
 * Y hay una segunda razón, de arquitectura: `useTema()` devuelve el tema DE LA
 * VELADA QUE SE ESTÉ JUGANDO —lee el contexto de la partida— así que un arcade
 * pintado con él saldría verde fieltro durante una partida de CLUEDO y color arena
 * durante una de la Momia, según lo que hubiera abierto antes. Un minijuego que
 * cambia de color según la velada que tengas a medias es exactamente el tipo de
 * enredo que la separación de los dos motores existe para impedir.
 */
export const SALA = {
  fondo: '#06110f',
  panel: '#0c1c19',
  neon: '#5fd4c8',
  neonTenue: '#2f6b64',
  palabra: '#f2fbf9',
  aviso: '#e8a04a',
  fallo: '#d4636f',
} as const;
