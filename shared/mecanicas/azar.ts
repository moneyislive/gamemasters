/**
 * AZAR SEMBRADO: un generador cuyo estado viaja dentro del estado del juego.
 *
 * ═══ QUÉ ES UNA «MECÁNICA» Y POR QUÉ ESTO SUBE AQUÍ ═══
 *
 * La definición está escrita al lado, en `pistas.ts`, y es la que manda:
 *
 *   «Una mecánica es código que sirve a varios juegos, que ninguno tiene la
 *   obligación de usar, y que no sabe quién lo usa. Apuntarse es llamar a una
 *   función. No hay registro, ni herencia, ni configuración.»
 *
 * El azar cumple los tres puntos, y sube a `mecanicas/` en vez de al núcleo del
 * arcade por una razón concreta y comprobable: una VELADA con dados lo querría
 * igual. Si viviera en `shared/arcade/`, un juego de Game Master que necesitara
 * tirar un dado tendría que importar el motor de la otra familia — y esa es la
 * primera de las cien líneas que acaban deshaciendo la separación.
 *
 * Hoy `mecanicas/` tenía un solo inquilino en cada lado. Un segundo es lo que la
 * convierte en capa y no en excepción.
 *
 * ═══ POR QUÉ NO `Math.random()` ═══
 *
 * Tres cosas se rompen a la vez, y ninguna da un error:
 *
 *  1. LA PUREZA. Un reductor con `Math.random()` dentro devuelve cosas distintas
 *     con los mismos argumentos, así que reejecutar una partida da otro
 *     resultado y la repetición deja de verificar nada.
 *  2. LA REPRODUCIBILIDAD. Una partida no se puede volver a ver, ni depurar, ni
 *     comparar entre dos motores de JavaScript. Un fallo de desincronización se
 *     vuelve irreproducible por construcción.
 *  3. Y SI VIVE EN EL CLIENTE, ES TRAMPA PURA. Quien juega decide qué carta
 *     sale, con un depurador y treinta segundos.
 *
 * ═══ LA SEMILLA Y EL CONTADOR VIVEN EN EL ESTADO ═══
 *
 * No en un objeto aparte, no en una variable de módulo, no en el contexto del
 * movimiento. En el ESTADO, que es lo que se guarda y lo que se reejecuta. Con
 * eso, rebobinar una partida a la tirada número doscientos es volver a sembrar y
 * avanzar doscientas veces, y sale exactamente lo mismo que salió.
 *
 * Un generador con estado interno —el patrón habitual, `const rng =
 * crearGenerador(semilla)`— parecería más cómodo y metería la impureza por la
 * puerta de atrás: la función que lo usa dejaría de ser función de sus
 * argumentos sin que su firma cambiara ni un carácter.
 *
 * ═══ Y DESAPARECEN EN LA PROYECCIÓN ═══
 *
 * Quien tenga la semilla y el contador puede calcular la carta siguiente. O sea
 * que el azar es información secreta EN TODO JUEGO QUE BARAJE, aunque el juego
 * no se considere a sí mismo un juego de información oculta. `sinElAzar()` está
 * aquí abajo para que quitarlo cueste una línea y no se olvide.
 */

/**
 * El azar de una partida, tal como viaja dentro de su estado.
 *
 * Tres campos, y ninguno sobra:
 *
 *   · `semilla` es de dónde salió todo. Sin ella no se puede rebobinar ni
 *     verificar una repetición: es el dato que convierte una partida en algo
 *     reproducible.
 *   · `tiradas` es cuántos números se han sacado. Es el CONTADOR del que habla
 *     el diseño, y es lo que permite decir «rebobina a la tirada 200» y
 *     comprobar que dos partidas divergieron exactamente ahí.
 *   · `acumulador` es el estado interno del generador. Podría deducirse de los
 *     otros dos —sembrar y avanzar `tiradas` veces— y NO se deduce a propósito:
 *     hacerlo convertiría cada tirada en un recorrido desde el principio, o sea
 *     un coste cuadrático en la partida entera. Con sesenta tiradas por segundo
 *     eso se nota en el móvil antes de un minuto.
 */
export interface Azar {
  semilla: number;
  tiradas: number;
  acumulador: number;
}

/**
 * Lo que devuelve cada operación: el azar YA AVANZADO y lo que salió.
 *
 * Se devuelven juntos y no se muta el que entró, que es lo que hace que esto se
 * pueda usar dentro de un reductor puro. El precio es que quien lo use tiene que
 * acordarse de guardar el azar nuevo; el premio es que olvidarse produce una
 * partida que repite la misma tirada, que es un fallo que se ve a la primera —en
 * vez de una impureza escondida, que no se ve nunca.
 */
export interface Tirada<T> {
  azar: Azar;
  valor: T;
}

/**
 * Siembra el azar de una partida.
 *
 * La semilla se normaliza a entero de 32 bits sin signo porque es lo que el
 * generador sabe usar, y porque así una semilla que llegue como `1.5` o como
 * `-3` no produce una secuencia distinta en dos motores de JavaScript con
 * distinta idea de cómo redondear.
 */
export function sembrar(semilla: number): Azar {
  const limpia = Math.trunc(semilla) >>> 0;
  return { semilla: limpia, tiradas: 0, acumulador: limpia };
}

/**
 * Un número entre 0 (incluido) y 1 (excluido).
 *
 * ═══ MULBERRY32, Y POR QUÉ ESTE Y NO OTRO ═══
 *
 * Es un generador de 32 bits de estado, cuatro operaciones enteras y ninguna
 * dependencia. Eso último es lo que decide: TIENE QUE CORRER IGUAL EN HERMES Y
 * EN NODE, y `Math.imul` y los desplazamientos sin signo son aritmética de
 * enteros de 32 bits definida al bit en la especificación del lenguaje. Nada de
 * lo que hay aquí depende de la coma flotante hasta la última división, que es
 * exacta por ser una potencia de dos.
 *
 * Un generador escrito con multiplicaciones normales sobre `number` divergería
 * entre motores en cuanto se pasara de los 53 bits, y lo haría en un solo modelo
 * de móvil y meses después.
 */
export function siguiente(azar: Azar): Tirada<number> {
  let a = (azar.acumulador + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const valor = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  a = a | 0;
  return {
    azar: { semilla: azar.semilla, tiradas: azar.tiradas + 1, acumulador: a },
    valor,
  };
}

/**
 * Un entero entre `minimo` y `maximo`, los dos incluidos.
 *
 * Incluidos los dos porque es lo que se espera de un dado: `enteroEntre(a, 1, 6)`
 * tiene que poder sacar el seis. La variante con el máximo excluido es la que
 * hace que alguien escriba `max + 1` en la llamada, y ese `+1` se olvida.
 *
 * Con el rango dado la vuelta —máximo menor que mínimo— devuelve el mínimo sin
 * gastar tirada. Es un error de quien llama, y gastarla dejaría dos partidas
 * idénticas con el azar en sitios distintos.
 */
export function enteroEntre(azar: Azar, minimo: number, maximo: number): Tirada<number> {
  if (maximo <= minimo) return { azar, valor: minimo };
  const { azar: siguienteAzar, valor } = siguiente(azar);
  const cuantos = Math.floor(maximo) - Math.ceil(minimo) + 1;
  return { azar: siguienteAzar, valor: Math.ceil(minimo) + Math.floor(valor * cuantos) };
}

/**
 * Baraja una lista. Fisher-Yates, y no `sort` con comparador aleatorio.
 *
 * ═══ POR QUÉ NO EL TRUCO DEL `sort` ═══
 *
 * `lista.sort(() => azar() - 0.5)` es el barajado que todo el mundo escribe una
 * vez, y está mal por dos razones que aquí duelen las dos: no reparte uniforme
 * —hay órdenes que salen mucho más que otros— y el resultado DEPENDE DEL
 * ALGORITMO DE ORDENACIÓN DEL MOTOR, que no es el mismo en Hermes que en V8. O
 * sea: la misma partida barajaría distinto en el móvil y en el servidor, que es
 * exactamente el fallo que todo esto existe para evitar.
 *
 * Fisher-Yates reparte uniforme y gasta exactamente `n − 1` tiradas, siempre las
 * mismas, con lo que dos motores consumen el azar en el mismo punto.
 *
 * No muta lo que recibe: devuelve una lista nueva.
 */
export function barajar<T>(azar: Azar, items: readonly T[]): Tirada<T[]> {
  const copia = [...items];
  let actual = azar;
  for (let i = copia.length - 1; i > 0; i--) {
    const tirada = enteroEntre(actual, 0, i);
    actual = tirada.azar;
    const j = tirada.valor;
    /*
     * Los `as T` son por `noUncheckedIndexedAccess`, que la app tiene encendido
     * y hace que `copia[i]` sea `T | undefined`. Aquí los dos índices están
     * dentro de rango por construcción del bucle: `i` baja desde `length − 1` y
     * `j` sale de `enteroEntre(0, i)`. Es la clase de sitio donde una aserción
     * dice la verdad.
     */
    const alto = copia[i] as T;
    const bajo = copia[j] as T;
    copia[i] = bajo;
    copia[j] = alto;
  }
  return { azar: actual, valor: copia };
}

/**
 * Uno de la lista. `undefined` si la lista está vacía, y sin gastar tirada.
 *
 * Que devuelva `undefined` en vez de lanzar es lo que permite usarlo dentro de
 * un reductor sin rodearlo de un `try`: un mazo que se acaba es una situación
 * normal del juego, no un error del programa.
 */
export function elegir<T>(azar: Azar, items: readonly T[]): Tirada<T | undefined> {
  if (items.length === 0) return { azar, valor: undefined };
  const { azar: siguienteAzar, valor } = enteroEntre(azar, 0, items.length - 1);
  return { azar: siguienteAzar, valor: items[valor] };
}

/**
 * Vuelve al principio: el mismo azar recién sembrado.
 *
 * Es lo que hace que «rebobinar» sea una palabra con significado y no una
 * intención. Combinado con `avanzarTiradas` se llega a cualquier punto de la
 * partida, que es lo que necesita quien depura una desincronización: no «se
 * rompió en algún momento» sino «divergieron en la tirada 1.407».
 */
export function rebobinar(azar: Azar): Azar {
  return sembrar(azar.semilla);
}

/**
 * Avanza el azar tantas tiradas, tirando lo que salga.
 *
 * Cuesta lo que cuesta —una vuelta por tirada— y es el único sitio donde ese
 * coste se paga, precisamente porque `acumulador` existe para que no se pague en
 * el camino normal.
 */
export function avanzarTiradas(azar: Azar, cuantas: number): Azar {
  let actual = azar;
  for (let i = 0; i < cuantas; i++) actual = siguiente(actual).azar;
  return actual;
}

/**
 * Quita el azar de un estado antes de mandarlo. PARA LA PROYECCIÓN.
 *
 * ═══ POR QUÉ ESTO ES NECESARIO Y NO UNA COMODIDAD ═══
 *
 * Quien tenga `semilla` y `acumulador` puede calcular la carta siguiente con
 * cuatro líneas. Mandar el azar a un dispositivo es mandarle el mazo entero
 * boca arriba, aunque las cartas viajen boca abajo.
 *
 * No adivina dónde está: se le dice la clave. Adivinarla sería justo lo que este
 * repositorio se negó a hacer en `proyeccion.ts` —privilegiar un nombre mágico
 * de campo, como hace `STRIP_SECRETS` con `secret` y `players`— y por el mismo
 * motivo: obligaría a que todos los juegos llamen a sus cosas igual que el
 * primero.
 *
 * Devuelve una copia. El estado que entra no se toca, porque puede ser el estado
 * de verdad de la partida y una proyección que muta la partida es un desastre
 * silencioso.
 */
export function sinElAzar<T extends object, C extends keyof T>(estado: T, llave: C): Omit<T, C> {
  const copia = { ...estado } as Record<PropertyKey, unknown>;
  delete copia[llave];
  return copia as Omit<T, C>;
}
