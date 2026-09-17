/**
 * EL LABRIEGO: la ficha que se planta en una villa, una senda, un prado o una ermita.
 *
 * ═══ POR QUÉ NO SALE DEL PACK ═══
 *
 * Por tres razones, y las tres cuentan:
 *
 *  1. **Los colores.** Las piezas de jugador de `tablero.glb` traen el color
 *     HORNEADO en el atlas y hay cuatro; en esta mesa caben cinco. Teñir por UV
 *     —lo que hace `paleta.ts` para Riberas— no da un quinto color, y por eso
 *     Riberas todavía tiene escrito que con cinco colonos su tablero en tres
 *     dimensiones se apaga. Una pieza propia se tiñe con un `#rrggbb` y se acabó
 *     el límite.
 *  2. **El coste.** Un `poblado` del pack son 1.011 triángulos, y en una partida
 *     de cinco puede haber treinta y cinco labriegos a la vez: 35.000 triángulos
 *     para las fichas. Ésta cuesta 176 y se instancia entera.
 *  3. **Lo legal.** La silueta de la ficha de este juego es de las cosas que sí
 *     están protegidas —es expresión, no mecánica—, así que aquí hay un PEÓN, que
 *     es la forma común de una ficha de mesa desde hace siglos y no es de nadie.
 *
 * ═══ SE HACE CON UN TORNO, QUE ES UNA PIEZA TORNEADA ═══
 *
 * Un peón de madera se hace en un torno: un perfil que da la vuelta. Se dibuja el
 * perfil —peana, garganta, cuerpo, cuello, cabeza— y `LatheGeometry` lo gira. Sale
 * redondo de verdad, con las proporciones de una ficha y no de un muñeco, y cuesta
 * exactamente lo que se le diga en cortes.
 */
import * as THREE from 'three';
import { ALTO_DEL_LABRIEGO, PEANA_DEL_LABRIEGO } from './medidas';

/** Cuántos cortes lleva el torno. Doce se ve redondo a la distancia a la que se mira. */
export const CORTES_DEL_TORNO = 12;

/**
 * EL PERFIL DEL PEÓN, en fracciones de su altura.
 *
 * El eje es la vertical; cada punto es (radio, altura). Las proporciones son las
 * de una ficha de mesa de toda la vida: peana ancha y baja, garganta estrecha,
 * cuerpo que se abre hacia abajo y cabeza redonda.
 */
export const PERFIL_DEL_PEON: readonly (readonly [number, number])[] = [
  [0, 0],
  [0.34, 0],
  [0.34, 0.07],
  [0.26, 0.12],
  [0.15, 0.2],
  [0.13, 0.42],
  [0.17, 0.58],
  [0.12, 0.66],
  [0.1, 0.7],
  [0.19, 0.78],
  [0.2, 0.88],
  [0.12, 0.97],
  [0, 1],
];

/**
 * LA GEOMETRÍA DE UN LABRIEGO, con la altura que se le diga.
 *
 * Nace apoyado en el cero y mirando hacia arriba, que es lo que espera quien lo
 * instancia: la matriz de instancia sólo tiene que desplazarlo.
 */
export function geometriaDelLabriego(alto = ALTO_DEL_LABRIEGO): THREE.BufferGeometry {
  const perfil = PERFIL_DEL_PEON.map(([r, y]) => new THREE.Vector2(r * alto * 0.42, y * alto));
  const g = new THREE.LatheGeometry(perfil, CORTES_DEL_TORNO);
  g.translate(0, PEANA_DEL_LABRIEGO, 0);
  g.computeVertexNormals();
  return g;
}

/**
 * LA PEANA QUE SE PINTA DEBAJO, para que se vea de quién es desde arriba.
 *
 * Un disco plano del color del asiento, un pelo por encima del suelo. Desde la
 * cámara de mesa, un peón visto en escorzo enseña poco color; el disco lo enseña
 * entero, y además dice dónde está plantado con una precisión que el peón no tiene
 * porque es ancho arriba.
 */
export function geometriaDeLaPeana(radio: number): THREE.BufferGeometry {
  const g = new THREE.CircleGeometry(radio, CORTES_DEL_TORNO * 2);
  g.rotateX(-Math.PI / 2);
  return g;
}
