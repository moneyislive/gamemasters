/**
 * LO QUE UNA ESCENA 3D NECESITA SABER DEL TABLERO, Y NADA MÁS.
 *
 * ═══ POR QUÉ ESTO NO ES `TableroDeclarado` ═══
 *
 * `shared/mecanicas/tablero-declarado.ts` describe un dibujo PLANO ya resuelto:
 * polígonos con sus puntos, colores y rótulos. Sirve para lo que se hizo —que un
 * mueble genérico pinte SVG sin saber a qué se juega— y no sirve aquí, por una
 * razón que no es de comodidad: en tres dimensiones el juego no puede resolver el
 * dibujo. No sabe dónde está la cámara, ni de qué lado entra la luz, ni cuántos
 * triángulos aguanta el móvil de quien mira. Un tablero que llegara con los
 * polígonos ya calculados llegaría con esas decisiones tomadas por quien no puede
 * tomarlas.
 *
 * Así que aquí viaja lo que el juego SÍ sabe —qué hay en cada hexágono, en cada
 * vértice y en cada arista— y la escena decide cómo se ve. Es la misma frontera
 * que ordena el árbol entero: las reglas son datos y lo que se ve es consecuencia.
 *
 * ═══ Y POR QUÉ VIVE EN `escenas/` Y NO EN `shared/` ═══
 *
 * Porque `shared/` la compilan CUATRO paquetes y dos de ellos no pueden con esto:
 * `server/tsconfig.json` incluye `../shared/**\/*.ts` y no tiene `three`
 * instalado, y `client/tsconfig.json` incluye `../shared` entera y sigue en React
 * 18 mientras `@react-three/fiber` 9 exige React 19. Un `.tsx` de escena en
 * `shared/` rompería el taller sin que nadie lo hubiera tocado.
 *
 * `escenas/` sólo lo incluyen los dos clientes que pintan: la app y el escritorio.
 *
 * ═══ SIN UNA SOLA DEPENDENCIA, A PROPÓSITO ═══
 *
 * Este fichero es `.ts` y no importa `three` ni React: es el contrato, y el
 * contrato tiene que poder leerlo un comprobador de Node sin abrir un contexto de
 * dibujo. Lo que sí importa `three` es `delta.tsx`, que está al lado.
 */
import type { Hex, LlaveDeArista, LlaveDeVertice } from '../shared/mecanicas/malla-hexagonal';

/**
 * Una isla del delta: un hexágono con lo que produce y con su número.
 *
 * `terreno` es una cadena libre y no una unión cerrada, y no es dejadez: el
 * vocabulario de terrenos es de CADA juego —Riberas tiene marisma y carrizal,
 * otro tendrá bosque y pradera— y cerrarlo aquí obligaría a tocar la escena cada
 * vez que llegue un juego nuevo. Lo que la escena hace con un terreno que no
 * conoce está decidido y escrito en `PALETA`: lo pinta con el color de reserva en
 * vez de reventar.
 */
export interface IslaEn3D {
  hex: Hex;
  terreno: string;
  /** El número que se saca con los dados, o `null` si esta isla no produce. */
  cifra: number | null;
}

/** Lo que se puede levantar en un vértice. Dos clases, como el tablero plano. */
export type ClaseDePieza = 'poblado' | 'ciudad';

/**
 * EL COLOR DE UN JUGADOR, y por qué es una palabra y no un `#rrggbb`.
 *
 * Porque una construcción NO se tiñe: se elige el modelo del pack que ya viene
 * pintado de ese color. Teñir un material con la textura de KayKit da un edificio
 * de un solo color plano y pierde el sombreado que trae cocido, que es justo lo que
 * lo hace parecer una maqueta buena y no un bloque.
 *
 * Los caminos SÍ llevan color en hexadecimal, y no es incoherencia: se dibujan con
 * geometría propia porque miden lo que mide la arista y no hay pieza del pack que
 * estirar sesenta unidades sin que se note.
 */
export type ColorDeJugador = 'blue' | 'red' | 'green' | 'yellow';

/**
 * Una pieza en un vértice.
 *
 * El vértice viaja como su LLAVE canónica y no como un punto, y ésa es la
 * propiedad que hace que esto no se pueda desincronizar: la llave son los tres
 * hexágonos que se tocan ahí, así que la escena la convierte a coordenadas con la
 * MISMA función que usa el tablero plano. Si viajara un punto, habría dos sitios
 * calculando la misma posición y un día darían dos posiciones distintas.
 */
export interface PiezaEn3D {
  vertice: LlaveDeVertice;
  clase: ClaseDePieza;
  color: ColorDeJugador;
}

/** Un camino en una arista. La llave son los dos hexágonos que la comparten. */
export interface CaminoEn3D {
  arista: LlaveDeArista;
  color: string;
}

/**
 * TODO el tablero, listo para pintar en tres dimensiones.
 *
 * Es un dato llano y serializable: se puede guardar, mandar por la red y comparar
 * en un comprobador. Nada de funciones dentro, nada de objetos de `three`.
 */
export interface DeltaEn3D {
  islas: readonly IslaEn3D[];
  piezas: readonly PiezaEn3D[];
  caminos: readonly CaminoEn3D[];
  /** Dónde está el ladrón, o `null` si no hay ninguno en el tablero. */
  ladron: Hex | null;
}
