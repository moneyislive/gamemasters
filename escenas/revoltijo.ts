/**
 * EL AZAR QUE NO ES AZAR: números reproducibles a partir de coordenadas.
 *
 * ═══ POR QUÉ NO HAY UN `Math.random` EN TODA LA ESCENA ═══
 *
 * El mundo tiene miles de árboles, casas y piedras, y en algún sitio hay que
 * decidir dónde va cada uno. `Math.random` sería lo cómodo y está descartado por
 * tres motivos que se refuerzan:
 *
 *   · El mismo tablero se vería distinto en cada móvil, y dos personas jugando la
 *     misma partida no estarían mirando el mismo mundo.
 *   · Volvería a repartirse en cada repintado, así que los árboles saltarían de
 *     sitio al girar la cámara.
 *   · No se podría comprobar. Un guion no puede afirmar nada sobre un reparto que
 *     cambia cada vez que se ejecuta.
 *
 * Lo que se hace es derivarlo todo de las COORDENADAS. La misma tesela da siempre
 * lo mismo, dos teselas distintas dan cosas distintas, y no hay estado que guardar
 * ni que mandar por la red.
 *
 * ═══ Y POR QUÉ NADA DE ESTO ENTRA EN EL ESTADO DE LA PARTIDA ═══
 *
 * Esto son píxeles. Que un árbol esté a la izquierda o a la derecha no cambia una
 * sola regla. Es la misma frontera que separa `shared/mecanicas` de lo que se ve:
 * las reglas son datos y el paisaje es consecuencia.
 */

/**
 * LA AVALANCHA de `splitmix32`: reparte los bits de un entero por todo el número.
 *
 * `Math.imul` y `>>> 0` no son adorno: fuerzan la aritmética a 32 bits enteros, y
 * sin ellos JavaScript pasa a coma flotante en cuanto el producto crece y el
 * resultado deja de ser el mismo en dos motores distintos. Un mundo que se ve
 * distinto en el móvil y en el PC es exactamente el fallo que esto evita.
 */
function avalancha(v: number): number {
  let x = v >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x21f0_aaad) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x735a_2d97) >>> 0;
  return (x ^ (x >>> 15)) >>> 0;
}

/**
 * UN REVOLTIJO REPRODUCIBLE a partir de tres enteros.
 *
 * ═══ POR QUÉ SE MEZCLA EN CADENA Y NO TODO DE GOLPE ═══
 *
 * La versión anterior era `imul(a,K1) ^ imul(b,K2) ^ imul(c,K3)` y luego la
 * avalancha. Parecía razonable y tenía una simetría gorda que sólo se ve midiendo:
 * **`revoltijo(a,b,c)` valía exactamente lo mismo que `revoltijo(-a,-b,c)`**
 * siempre que `a` y `b` acabaran en el mismo número de ceros binarios. El motivo es
 * que `-u` conserva los bits hasta el último 1 y complementa el resto, así que si
 * `a` y `b` tienen los mismos ceros al final, `(-a)^(-b) === a^b`; y multiplicar
 * por una constante impar no cambia cuántos ceros hay al final. Medido: acierta en
 * 641.600 de 641.600 pares con las coordenadas entre -400 y 400.
 *
 * En un mundo eso significaba que UN TERCIO del terreno salía idéntico a su
 * simétrico respecto del origen: el mismo bosque, las mismas piedras, la misma
 * altura. Nadie lo iba a denunciar mirando, y sin embargo la cabecera prometía lo
 * contrario.
 *
 * Mezclando EN CADENA —avalancha entre entrada y entrada— la simetría desaparece,
 * porque cuando entra `b` el valor que arrastra `a` ya ha pasado por una función no
 * lineal. Cuesta dos avalanchas más por llamada y se ejecuta unas cincuenta mil
 * veces al montar el mundo: no se nota.
 *
 * La semilla inicial es el número áureo en 32 bits, la constante de mezcla de
 * costumbre. Sirve además para que `revoltijo(0,0,0)` NO sea cero: el mezclador de
 * splitmix tiene el cero como punto fijo, así que la versión anterior devolvía cero
 * exacto en el centro del mundo, y `unoDe` en esa tesela elegía siempre el primer
 * elemento de cualquier lista.
 */
export function revoltijo(a: number, b: number, c: number): number {
  let x = 0x9e37_79b9;
  x = avalancha(x ^ (a | 0));
  x = avalancha(x ^ (b | 0));
  x = avalancha(x ^ (c | 0));
  return x >>> 0;
}

/** El revoltijo llevado al intervalo [0, 1). */
export function fraccion(a: number, b: number, c: number): number {
  return revoltijo(a, b, c) / 4_294_967_296;
}

/**
 * UNO DE LA LISTA, elegido por coordenadas.
 *
 * Devuelve `null` con la lista vacía en vez de `undefined` disfrazado: quien lo
 * pide decide qué hacer sin nada, y así el tipo no miente.
 */
export function unoDe<T>(lista: readonly T[], a: number, b: number, c: number): T | null {
  if (lista.length === 0) return null;
  return lista[revoltijo(a, b, c) % lista.length] as T;
}
