/**
 * LOS SITIOS DEL TABLERO: dónde se puede poner algo, y en qué punto del mundo cae.
 *
 * ═══ QUÉ ES UN SITIO Y QUÉ NO ═══
 *
 * Un sitio es un LUGAR, no un permiso. Aquí están los cincuenta y cuatro vértices, las
 * setenta y dos aristas y las diecinueve comarcas de un tablero de radio dos, con su
 * punto y su altura ya resueltos. Lo que NO está —y no por falta de ganas— es cuáles
 * de ellos son legales ahora mismo: eso lo decide el juego, que es quien sabe de quién
 * es el turno, qué tiene en la mano y qué hay ya construido.
 *
 * La frontera es la misma que ordena el árbol entero, y aquí se nota más que en ningún
 * sitio: **las reglas son datos y lo que se ve es consecuencia**. Si la escena
 * calculara la legalidad, habría dos sitios decidiéndola —el servidor y el dibujo— y un
 * día dirían cosas distintas. El día que eso pasa, el jugador ve una flecha donde no
 * puede construir y el servidor le dice que no: la peor forma posible de descubrirlo.
 *
 * ═══ POR QUÉ ESTO ES UN FICHERO APARTE Y SIN `three` ═══
 *
 * Porque la lista de sitios se puede CONTAR. Un comprobador de Node puede exigir que
 * salgan cincuenta y cuatro vértices y setenta y dos aristas, que ninguno se repita, y
 * que cada uno caiga sobre suelo del mundo — sin abrir una ventana de dibujo. Dentro de
 * `delta.tsx` nada de eso se podría comprobar.
 *
 * La altura entra como FUNCIÓN y no como dato: quien llama pasa `relieve.alturaEn`, y
 * así este fichero no necesita saber que existe el relieve. Es lo que le permite
 * seguir sin importar nada del motor de dibujo.
 */

import type { Hex, LlaveDeArista, LlaveDeVertice, Punto } from '../shared/mecanicas/malla-hexagonal';
import {
  aristasDe,
  centroDeHex,
  puntoDeVertice,
  verticesDe,
  verticesDeArista,
} from '../shared/mecanicas/malla-hexagonal';
import { RADIO_DE_COMARCA } from './escala';

/** Qué clase de sitio es. El juego decide qué se puede poner en cada uno. */
export type ClaseDeSitio = 'vertice' | 'arista' | 'comarca';

/**
 * UN SITIO DEL TABLERO.
 *
 * `llave` es la canónica de la malla —los tres hexágonos de un vértice, los dos de una
 * arista, el propio hexágono de una comarca— y no un punto. Es la misma propiedad que
 * hace que `PiezaEn3D` no se pueda desincronizar: quien recibe una llave la convierte a
 * coordenadas con la MISMA función que las convirtió aquí.
 */
export interface Sitio {
  clase: ClaseDeSitio;
  llave: string;
  /** Dónde cae, en el plano de la malla. */
  punto: Punto;
  /** La altura del suelo ahí, ya consultada. */
  altura: number;
  /**
   * Para una arista, sus dos extremos; para lo demás, `null`.
   *
   * Hace falta para orientar lo que se ponga encima —un camino va DE un vértice A
   * otro— y se guarda resuelto para que quien pinte no tenga que volver a la malla.
   */
  extremos: readonly [Punto, Punto] | null;
}

/** Todos los sitios de un tablero, repartidos por clase. */
export interface SitiosDelTablero {
  vertices: Sitio[];
  aristas: Sitio[];
  comarcas: Sitio[];
  /** Todos juntos, por si quien pinta no quiere distinguir. */
  todos: Sitio[];
}

/**
 * LOS SITIOS DE UN TABLERO, con su altura ya resuelta.
 *
 * `alturaEn` es la del mundo en un punto cualquiera —`relieve.alturaEn`— y entra por
 * parámetro a propósito: ver la cabecera.
 *
 * El orden es estable y sale de la malla, no de un `Set` recorrido: dos clientes que
 * pidan los sitios del mismo tablero reciben la misma lista en el mismo orden, que es
 * lo que permite compararlos en un comprobador sin ordenar nada.
 */
export function sitiosDelTablero(
  hexes: readonly Hex[],
  alturaEn: (p: Punto) => number,
): SitiosDelTablero {
  const vertices: Sitio[] = [];
  for (const llave of verticesDe(hexes)) {
    const punto = puntoDeVertice(llave as LlaveDeVertice, RADIO_DE_COMARCA);
    vertices.push({
      clase: 'vertice',
      llave,
      punto,
      altura: alturaEn(punto),
      extremos: null,
    });
  }

  const aristas: Sitio[] = [];
  for (const llave of aristasDe(hexes)) {
    const [a, b] = verticesDeArista(llave as LlaveDeArista);
    if (a === undefined || b === undefined) continue;
    const uno = puntoDeVertice(a, RADIO_DE_COMARCA);
    const otro = puntoDeVertice(b, RADIO_DE_COMARCA);
    const medio = { x: (uno.x + otro.x) / 2, y: (uno.y + otro.y) / 2 };
    aristas.push({
      clase: 'arista',
      llave,
      punto: medio,
      /*
       * La altura de una arista es la de su PUNTO MEDIO y no la media de sus extremos,
       * y no es lo mismo: entre dos vértices a la misma cota puede haber un cerro, y un
       * camino que se dibujara a la media se metería dentro de él.
       */
      altura: alturaEn(medio),
      extremos: [uno, otro],
    });
  }

  const comarcas: Sitio[] = [];
  for (const hex of hexes) {
    const punto = centroDeHex(hex, RADIO_DE_COMARCA);
    comarcas.push({
      clase: 'comarca',
      llave: `${String(hex.q)},${String(hex.r)}`,
      punto,
      altura: alturaEn(punto),
      extremos: null,
    });
  }

  return { vertices, aristas, comarcas, todos: [...vertices, ...aristas, ...comarcas] };
}

/**
 * LO QUE SE ESTÁ COLOCANDO AHORA MISMO, si es que hay algo.
 *
 * ═══ POR QUÉ LOS SITIOS LEGALES LLEGAN DE FUERA ═══
 *
 * Son una LISTA DE LLAVES que manda quien conoce las reglas. La escena no las filtra ni
 * las comprueba: dibuja una flecha en cada una y avisa cuando se pulsa.
 *
 * Es deliberadamente tonto. Una escena que supiera de reglas tendría que saber de quién
 * es el turno, de qué hay en la mano y de qué se construyó ya, y entonces el servidor y
 * el dibujo estarían decidiendo lo mismo por separado. Aquí la escena no puede
 * discrepar del servidor porque no opina.
 */
export interface Colocando {
  /** Qué se está colocando: decide qué modelo sigue al cursor y qué clase de sitio vale. */
  clase: ClaseDeSitio;
  /** Las llaves de los sitios donde el juego permite soltarlo. Puede estar vacía. */
  donde: readonly string[];
}

/** Los sitios de una clase cuyas llaves están en la lista. Conserva el orden de la malla. */
export function sitiosPermitidos(sitios: SitiosDelTablero, colocando: Colocando): Sitio[] {
  const validos = new Set(colocando.donde);
  const dondeMirar =
    colocando.clase === 'vertice'
      ? sitios.vertices
      : colocando.clase === 'arista'
        ? sitios.aristas
        : sitios.comarcas;
  return dondeMirar.filter((s) => validos.has(s.llave));
}
