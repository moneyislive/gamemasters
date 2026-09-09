/**
 * EL ANILLO: un tablero de N casillas en círculo, y su geometría cuadrada.
 *
 * ═══ POR QUÉ ESTO SUBE A `mecanicas/` Y NO SE QUEDA DENTRO DEL JUEGO ═══
 *
 * Por la misma razón por la que `malla-hexagonal.ts` está aquí: no es una regla de
 * ningún juego, es aritmética, y hacerla mal no se cae — se juega mal. Un «módulo»
 * escrito como `(desde + pasos) % n` da NEGATIVO en JavaScript cuando `pasos` es
 * negativo («retrocede tres casillas» desde la 1 daría −2), y un «¿pasó por la
 * salida?» calculado sobre la casilla final no distingue caer justo en la 0 de no
 * haber salido de ella. Ninguna de las dos cosas lanza. Las dos reparten dinero.
 *
 * Y lo leen CUATRO sitios que no se pueden copiar la fórmula unos a otros: el
 * reductor (cuánto anda una figura y si cobra al pasar), el tablero declarado (qué
 * casilla se destaca), la escena (por dónde camina el aventurero y dónde se pone
 * cada pieza) y los comprobadores. Cuatro copias divergen; una se comprueba.
 *
 * ═══ LO QUE NO IMPORTA, A PROPÓSITO ═══
 *
 * Nada. Ni `shared/arcade` ni el juego: `verify:fronteras` y `verify:pureza` barren
 * esta carpeta y la doctrina es que una mecánica se pueda leer y probar sin instalar
 * un arcade. Lo que aquí entra son enteros y lo que sale son enteros o coordenadas
 * hechas de sumas y productos.
 *
 * ═══ LA CONVENCIÓN DEL ANILLO, DICHA UNA VEZ ═══
 *
 * Las casillas van de `0` a `n − 1` en SENTIDO DE LA MARCHA. La `0` es la salida:
 * `cruzaLaSalida` es verdad cuando un paso hacia delante la pisa o la deja atrás,
 * y caer justo en ella cuenta como pasarla (el reglamento del Burgo cobra «al pasar
 * o al caer»). Hacia atrás no se cruza nunca: retroceder por la salida no cobra.
 *
 * ═══ EL ANILLO CUADRADO, Y POR QUÉ SIN TRIGONOMETRÍA ═══
 *
 * Un anillo de `4 · (porLado − 1)` casillas se pinta como un cuadrado con una
 * esquina en cada múltiplo de `porLado − 1`. Cada lado tiene `porLado` casillas
 * contando SUS DOS esquinas, así que con `porLado = 11` salen 40: la 0, la 10, la 20
 * y la 30 son las esquinas.
 *
 * Las medidas son dos: `ancho` (lo que mide una casilla de lado a lo largo del
 * borde) y `fondo` (lo que entra hacia el centro). Una esquina es `fondo × fondo`.
 * Un lado mide `(porLado − 2) · ancho + 2 · fondo`, y `medioLado` es su mitad: con
 * 8 / 14 / 11 son (9 · 8 + 2 · 14) / 2 = 50, que es lo que el diseño del Burgo fija.
 *
 * Las coordenadas son las del plano del suelo de la escena, `x` y `z`, con el
 * origen en el CENTRO del anillo; `y` (la altura) no es cosa de aquí. Se dan
 * mirando el tablero desde arriba con `+x` a la derecha y `+z` hacia quien mira
 * (es la mano derecha de three, que es la que usan las escenas de esta casa):
 *
 *   · lado 0: el de ABAJO (`z = +medioLado − fondo / 2`), de derecha a izquierda;
 *     la casilla 0 está en la esquina inferior derecha;
 *   · lado 1: el de la IZQUIERDA (`x = −…`), de abajo arriba;
 *   · lado 2: el de ARRIBA (`z = −…`), de izquierda a derecha;
 *   · lado 3: el de la DERECHA (`x = +…`), de arriba abajo.
 *
 * O sea que se recorre en el sentido contrario a las agujas del reloj visto desde
 * arriba, que es como se juega en la mesa. El sitio que se devuelve es el CENTRO de
 * la casilla; la banda (acera, calle, solar) la reparte la escena a partir de ahí.
 *
 * `cuartos` es cuántos cuartos de vuelta hay que girar una pieza que «mira hacia
 * fuera» del anillo cuando está en el lado 0 para que mire hacia fuera en su lado.
 * Se cuenta como el `rotation.y` de three: un cuarto lleva `+z` a `+x`. Por eso el
 * lado 1 (que mira a `−x`) son TRES cuartos y no uno: `(4 − lado) % 4`. Está
 * escrito así, con la vuelta hecha, para que la escena no se lo tenga que pensar.
 *
 * Todo sale de sumas, restas, productos y una división por dos: `verify:pureza`
 * prohíbe las trascendentales de `Math` en esta carpeta porque Hermes y V8 no dan
 * los mismos últimos bits, y un anillo cuadrado no las necesita.
 */

/** Módulo positivo: `−2 mod 40 = 38`. `%` a secas da −2 y no es una casilla. */
function modulo(valor: number, n: number): number {
  const resto = valor % n;
  return resto < 0 ? resto + n : resto;
}

/**
 * La casilla a la que se llega desde `desde` andando `pasos` (negativos = hacia
 * atrás) en un anillo de `n`. Con `n ≤ 0` devuelve 0: un anillo sin casillas no
 * tiene otra.
 */
export function casillaTras(desde: number, pasos: number, n: number): number {
  if (!(n > 0)) return 0;
  return modulo(Math.trunc(desde) + Math.trunc(pasos), Math.trunc(n));
}

/**
 * Las pisadas de un movimiento, EN ORDEN, sin la casilla de partida y con la de
 * llegada al final. Con `pasos > 0` son las casillas hacia delante; con `pasos < 0`
 * las casillas hacia atrás (para «retrocede tres»); con 0, ninguna.
 *
 * Es lo que la escena anima casilla a casilla y lo que el suceso `mueve` guarda:
 * la proyección es pura y sólo puede publicar lo que el estado conserva.
 */
export function recorrido(desde: number, pasos: number, n: number): number[] {
  const pisadas: number[] = [];
  if (!(n > 0)) return pisadas;
  const sentido = pasos < 0 ? -1 : 1;
  const cuantos = Math.abs(Math.trunc(pasos));
  for (let k = 1; k <= cuantos; k++) pisadas.push(casillaTras(desde, k * sentido, n));
  return pisadas;
}

/**
 * ¿Un paso hacia delante de `pasos` desde `desde` pisa la casilla 0 o la deja
 * atrás? Sólo hacia delante (`pasos > 0`): hacia atrás nunca se cruza la salida.
 * Caer JUSTO en la 0 cuenta como cruzarla.
 */
export function cruzaLaSalida(desde: number, pasos: number, n: number): boolean {
  if (!(n > 0) || !(pasos > 0)) return false;
  return modulo(Math.trunc(desde), Math.trunc(n)) + Math.trunc(pasos) >= Math.trunc(n);
}

/** Cuántas casillas hay que andar hacia delante para ir de `desde` a `hasta`. 0 si es la misma. */
export function distanciaAdelante(desde: number, hasta: number, n: number): number {
  if (!(n > 0)) return 0;
  return modulo(Math.trunc(hasta) - Math.trunc(desde), Math.trunc(n));
}

/**
 * La primera de las `candidatas` que se encuentra andando HACIA DELANTE desde
 * `desde`. La propia `desde` no cuenta como «hacia delante»: está a una vuelta
 * entera, así que sólo sale si es la única candidata. Sin candidatas, `desde`.
 *
 * Es la carta «avanza hasta la puerta más cercana»: desde la 39 con puertas en
 * 5/15/25/35 es la 5, no la 35.
 */
export function masCercana(desde: number, candidatas: readonly number[], n: number): number {
  let mejor = desde;
  let mejorDistancia = -1;
  for (const c of candidatas) {
    const d = distanciaAdelante(desde, c, n);
    const distancia = d === 0 ? n : d;
    if (mejorDistancia < 0 || distancia < mejorDistancia) {
      mejor = c;
      mejorDistancia = distancia;
    }
  }
  return mejor;
}

/**
 * Dónde cae una casilla en un anillo cuadrado. Coordenadas del CENTRO de la
 * casilla en el plano del suelo, con el origen en el centro del anillo (ver la
 * cabecera para la convención de lados y de giro).
 */
export interface SitioEnElAnillo {
  /** 0 abajo, 1 izquierda, 2 arriba, 3 derecha; una esquina es del lado que EMPIEZA en ella. */
  readonly lado: 0 | 1 | 2 | 3;
  readonly esEsquina: boolean;
  readonly x: number;
  readonly z: number;
  /** Cuartos de vuelta (el `rotation.y` de three, en cuartos) para que una pieza mire hacia fuera. */
  readonly cuartos: 0 | 1 | 2 | 3;
}

/** Cuántas casillas hay en un anillo cuadrado de `porLado` casillas por lado (esquinas incluidas). */
export function casillasDelAnillo(porLado: number): number {
  return 4 * (Math.trunc(porLado) - 1);
}

/** La mitad de lo que mide un lado: `((porLado − 2) · ancho + 2 · fondo) / 2`. Con 8 / 14 / 11, 50. */
export function medioLado(ancho: number, fondo: number, porLado: number): number {
  return ((Math.trunc(porLado) - 2) * ancho + 2 * fondo) / 2;
}

/** El centro de la casilla `i` de un anillo cuadrado de `porLado` casillas por lado. Todo lineal. */
export function sitioDeCasilla(i: number, ancho: number, fondo: number, porLado: number): SitioEnElAnillo {
  const porTramo = Math.trunc(porLado) - 1; // casillas de esquina a esquina, la primera incluida
  const n = 4 * porTramo;
  const casilla = casillaTras(0, i, n);
  const lado = Math.trunc(casilla / porTramo) as 0 | 1 | 2 | 3;
  const k = casilla - lado * porTramo; // 0 en la esquina, 1..porTramo−1 por el lado
  const esEsquina = k === 0;
  const medio = medioLado(ancho, fondo, porLado);

  /*
   * Dos medidas a lo largo del lado, contadas desde la esquina donde EMPIEZA:
   * `borde` es la distancia del centro de la casilla al borde exterior del anillo
   * (la mitad del fondo: todas las casillas de un lado comparten banda), y `avance`
   * es cuánto se ha andado desde el eje de la esquina de partida. La esquina vale
   * `fondo / 2` (su propio centro); la casilla `k` del lado vale
   * `fondo + (k − 1) · ancho + ancho / 2`.
   */
  const borde = medio - fondo / 2;
  const avance = esEsquina ? fondo / 2 : fondo + (k - 1) * ancho + ancho / 2;
  const alLargo = medio - avance; // de +medio hacia −medio a lo largo del lado

  let x = 0;
  let z = 0;
  if (lado === 0) {
    x = alLargo;
    z = borde;
  } else if (lado === 1) {
    x = -borde;
    z = alLargo;
  } else if (lado === 2) {
    x = -alLargo;
    z = -borde;
  } else {
    x = borde;
    z = -alLargo;
  }
  const cuartos = ((4 - lado) % 4) as 0 | 1 | 2 | 3;
  return { lado, esEsquina, x, z, cuartos };
}
