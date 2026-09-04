/**
 * EL RUIDO DEL QUE SALE EL MUNDO.
 *
 * ═══ POR QUÉ HACE FALTA ESTO Y NO BASTA CON UN REVOLTIJO POR TESELA ═══
 *
 * Un revoltijo da un número distinto en cada tesela y ninguno tiene nada que ver
 * con el de al lado. Eso sirve para decidir qué árbol va en un sitio, y NO sirve
 * para hacer terreno: un mapa de alturas sacado así es confeti, y en cuanto se
 * suaviza promediando vecinas se convierte en una papilla sin forma que además se
 * concentra en el medio —el teorema central del límite hace su trabajo— y deja los
 * extremos inalcanzables.
 *
 * Lo que hace falta es un campo CONTINUO: una función de un punto del plano, no de
 * una casilla, que valga casi lo mismo en dos puntos cercanos y cosas distintas en
 * dos lejanos. Eso es ruido de valor: se sortea un número en cada nodo de una
 * rejilla y se interpola entre ellos con una curva que casa suavemente en los
 * bordes. Sumando varias escalas —cada una el doble de fina y la mitad de alta— sale
 * un relieve con lomas grandes, colinas encima y aspereza encima de todo. Es el
 * mismo procedimiento con el que se hacen los mapas de cualquier juego de mundo
 * abierto, y no es caro: cuatro consultas de tabla y dos interpolaciones por octava.
 *
 * ═══ LAS TRES HERRAMIENTAS, Y PARA QUÉ SIRVE CADA UNA ═══
 *
 *   · `fbm` da lomas redondeadas. Es lo que sirve para praderas, bosques y para
 *     repartir cualquier cosa que tenga que salir a manchas.
 *   · `fbmDeCresta` da CRESTAS: cordilleras con filo y valles en uve, en vez de
 *     bultos. Se consigue doblando el ruido sobre sí mismo —`1-|2n-1|`— de modo que
 *     lo que era el valor medio pasa a ser el máximo. Una montaña hecha con `fbm`
 *     parece un montón de arena; hecha con crestas, parece una sierra.
 *   · `deforma` retuerce el plano ANTES de mirarlo. Es lo que quita los patrones
 *     reconocibles: sin ella, el borde entre dos biomas es la mediatriz entre sus
 *     centros —una recta, y en un tablero hexagonal se ve como un hexágono—; con
 *     ella, ese mismo borde serpentea, se mete en el vecino y deja penínsulas. Es la
 *     diferencia entre un mapa que parece generado y uno que parece un sitio.
 *
 * ═══ TODO DETERMINISTA, COMO EL RESTO DE LA ESCENA ═══
 *
 * Ni una llamada a `Math.random`. El valor de cada nodo sale del revoltijo de sus
 * coordenadas enteras, así que el mismo mundo se ve igual en el móvil y en el PC, no
 * cambia al girar la cámara, y un comprobador puede afirmar cosas sobre él. Lo que
 * hace que dos partidas no se parezcan es la SEMILLA, que entra por el canal.
 */
import { fraccion } from './revoltijo';

/**
 * LA CURVA QUE SUAVIZA LA INTERPOLACIÓN.
 *
 * Es el quíntico de Perlin, `6t⁵-15t⁴+10t³`. Se usa éste y no una interpolación
 * recta porque la recta deja la PENDIENTE con saltos en los nodos de la rejilla, y
 * eso se ve: aparece una cuadrícula fantasma en el terreno, sobre todo en las
 * sombras. Esta curva tiene la primera y la segunda derivada nulas en 0 y en 1, así
 * que las celdas casan sin costura.
 */
function suaviza(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * RUIDO DE VALOR EN UN PUNTO, entre 0 y 1.
 *
 * Las coordenadas vienen ya divididas por la escala que quiera quien llama: aquí la
 * rejilla es de lado 1. `Math.floor` y no `Math.trunc`, por lo de siempre — con
 * `trunc` la celda que contiene el cero mide el doble y esa costura se ve como una
 * loma partida justo por el centro del mundo.
 */
export function ruido(x: number, y: number, canal: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = suaviza(x - x0);
  const fy = suaviza(y - y0);

  const a = fraccion(x0, y0, canal);
  const b = fraccion(x0 + 1, y0, canal);
  const c = fraccion(x0, y0 + 1, canal);
  const d = fraccion(x0 + 1, y0 + 1, canal);

  const arriba = a + (b - a) * fx;
  const abajo = c + (d - c) * fx;
  return arriba + (abajo - arriba) * fy;
}

/** Cuántas veces se dobla la frecuencia de una octava a la siguiente. */
const LACUNARIDAD = 2.03;

/**
 * Cuánto pierde de altura cada octava. Con 0,5 la suma converge y el resultado
 * tiene el aspecto de un terreno de verdad: mucha loma, poca aspereza.
 *
 * La lacunaridad no es 2 exacta a propósito: con 2 clavado, los nodos de todas las
 * octavas caen unos encima de otros y en esos puntos se acumulan los máximos, lo que
 * deja una retícula visible de picos regularmente espaciados. Con 2,03 las rejillas
 * se desalinean y el patrón desaparece.
 */
const GANANCIA = 0.5;

/**
 * VARIAS OCTAVAS DE RUIDO SUMADAS. Devuelve entre 0 y 1.
 *
 * El resultado se divide por la suma de las amplitudes para que el rango no dependa
 * de cuántas octavas se pidan: cambiar el detalle no puede cambiar la altura de las
 * montañas, o cada ajuste de rendimiento sería un rediseño del mapa.
 *
 * Con cero octavas esa división era `0/0`, o sea `NaN`, y el `NaN` no lo paraba nadie
 * aguas abajo: `Math.round(NaN)` es `NaN`, y el guardián `n < 0 ? 0 : n` de más allá
 * lo deja pasar tal cual. Hoy no lo llama nadie con cero, pero es la clase de borde
 * que espera al siguiente que baje el detalle para el móvil.
 */
export function fbm(x: number, y: number, canal: number, octavas = 4): number {
  if (octavas < 1) return ruido(x, y, canal);
  let suma = 0;
  let amplitud = 1;
  let total = 0;
  let f = 1;
  for (let i = 0; i < octavas; i++) {
    suma += amplitud * ruido(x * f, y * f, canal + i * 101);
    total += amplitud;
    amplitud *= GANANCIA;
    f *= LACUNARIDAD;
  }
  return suma / total;
}

/**
 * RUIDO DE CRESTA. Devuelve entre 0 y 1, con el máximo en filo y no en meseta.
 *
 * `1-|2n-1|` dobla el ruido por su valor medio: lo que era 0,5 pasa a valer 1 y
 * tanto el 0 como el 1 pasan a valer 0. Las curvas de nivel dejan de ser óvalos y
 * pasan a ser líneas largas y ramificadas — que es como son las cordilleras. El
 * cuadrado del final afila más el filo y ensancha los valles.
 */
export function fbmDeCresta(x: number, y: number, canal: number, octavas = 4): number {
  if (octavas < 1) {
    const n = ruido(x, y, canal);
    const cresta = 1 - Math.abs(2 * n - 1);
    return cresta * cresta;
  }
  let suma = 0;
  let amplitud = 1;
  let total = 0;
  let f = 1;
  for (let i = 0; i < octavas; i++) {
    const n = ruido(x * f, y * f, canal + i * 101);
    const cresta = 1 - Math.abs(2 * n - 1);
    suma += amplitud * cresta * cresta;
    total += amplitud;
    amplitud *= GANANCIA;
    f *= LACUNARIDAD;
  }
  return suma / total;
}

/**
 * RETUERCE EL PLANO antes de mirarlo. Es lo que borra los patrones reconocibles.
 *
 * Se desplaza cada punto por un vector sacado de otro ruido. Un campo que sin esto
 * tendría curvas de nivel suaves y previsibles pasa a tener entrantes, penínsulas y
 * lenguas — la forma que tienen las cosas en la naturaleza, donde nada separa dos
 * regiones por una línea limpia.
 *
 * Los dos canales tienen que ser DISTINTOS y no consecutivos: con el mismo canal el
 * desplazamiento sería siempre en la diagonal, y el mundo entero saldría rayado a
 * cuarenta y cinco grados.
 */
export function deforma(
  x: number,
  y: number,
  escala: number,
  fuerza: number,
  canal: number,
): { x: number; y: number } {
  const dx = fbm(x / escala, y / escala, canal, 3) - 0.5;
  const dy = fbm(x / escala, y / escala, canal + 7919, 3) - 0.5;
  return { x: x + dx * fuerza, y: y + dy * fuerza };
}
