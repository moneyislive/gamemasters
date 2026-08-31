/**
 * SERIALIZACIÓN CANÓNICA: la misma partida, siempre la misma cadena.
 *
 * ═══ EL PROBLEMA, Y ES UNO QUE SE PAGA EN LA FASE 3 ═══
 *
 * `verify:determinismo` va a comparar el estado de una partida reejecutada en
 * Node contra la misma reejecutada en Hermes. Para compararlos hay que
 * convertirlos a algo, y lo evidente —`JSON.stringify`— no sirve, porque
 * conserva el ORDEN DE INSERCIÓN de las claves.
 *
 * Dos estados semánticamente idénticos construidos en distinto orden dan cadenas
 * distintas. Y en una mesa eso no es raro, es lo normal: dos personas juegan a la
 * vez, los movimientos llegan cruzados, y el objeto de manos de cada cual se
 * rellena en un orden en un dispositivo y en otro en el otro.
 *
 * O sea que sin esto el comprobador daría FALSOS ROJOS. Y un comprobador que
 * grita cuando no pasa nada acaba desactivado, que es estrictamente peor que no
 * tenerlo: mientras estuvo puesto, nadie escribió el que sí habría servido.
 *
 * ═══ POR QUÉ RECHAZA EN VEZ DE TRAGARSE LO RARO ═══
 *
 * `JSON.stringify` es silenciosamente destructivo con media docena de cosas:
 * una función desaparece, `undefined` dentro de un objeto desaparece, dentro de
 * una lista se convierte en `null`, un `NaN` se convierte en `null` y un
 * infinito también. Todas esas conversiones son PÉRDIDAS, y aquí una pérdida
 * significa que dos estados distintos producen la misma cadena.
 *
 * Eso es peor que un falso rojo: es un FALSO VERDE. `verify:determinismo` diría
 * que dos motores coinciden porque la diferencia entre ellos se perdió al
 * serializar. Así que lo no serializable salta, con la ruta dentro del estado
 * escrita en el mensaje — «no es serializable en `mano.0.jugada`» se arregla;
 * «el estado no es serializable», no.
 *
 * ═══ LO QUE NO HACE, Y ES A PROPÓSITO ═══
 *
 * No calcula ningún hash. Comparar las dos cadenas es más fuerte que comparar
 * dos hashes —no hay colisiones que descartar— y además dice EN QUÉ CARÁCTER
 * empiezan a diferir, que es lo que uno quiere cuando está depurando una
 * desincronización. Un hash hace falta el día que haya que guardar la huella de
 * mil partidas sin guardar las partidas, y ese día es de la fase 3.
 */

/**
 * Hay algo en el estado que no se puede serializar sin perder información.
 *
 * Lleva la RUTA dentro del estado porque un estado de juego tiene tres niveles
 * de anidamiento y decir solo «hay algo mal» obliga a buscarlo a mano.
 */
export class NoCanonizable extends Error {
  constructor(
    public readonly ruta: string,
    public readonly porque: string,
  ) {
    super(`No se puede serializar \`${ruta}\`: ${porque}`);
    this.name = 'NoCanonizable';
  }
}

/**
 * Compara dos claves por unidades de código UTF-16.
 *
 * ═══ POR QUÉ ESTE COMPARADOR Y NO `localeCompare` ═══
 *
 * Porque `localeCompare` depende de la CONFIGURACIÓN REGIONAL y de la tabla de
 * intercalación que traiga el motor. En Node con ICU completo, `'ñ'` se ordena
 * entre la `n` y la `o`; en un Hermes compilado sin ICU, se ordena por su punto
 * de código, o sea detrás de la `z`. Un juego con una clave acentuada —y este
 * repositorio está escrito entero en castellano— haría divergir los dos motores
 * en el fichero cuya razón de existir es que no diverjan.
 *
 * `<` y `>` sobre cadenas comparan unidades de código UTF-16 y están fijados por
 * la especificación. Son los mismos en cualquier motor y en cualquier idioma.
 */
function porUnidadesDeCodigo(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** ¿Es un objeto llano, o sea `{}` y no una instancia de algo? */
function esLlano(valor: object): boolean {
  const padre = Object.getPrototypeOf(valor) as object | null;
  return padre === null || padre === Object.prototype;
}

/**
 * El estado, como cadena estable.
 *
 * @throws {NoCanonizable} si hay algo que no sobreviviría al viaje.
 */
export function canonico(valor: unknown): string {
  return escribir(valor, '$', []);
}

/**
 * `enCurso` es la RAMA que se está recorriendo, no todo lo ya visto, y la
 * diferencia importa: un mismo objeto referenciado dos veces desde sitios
 * distintos es perfectamente serializable —se escribe dos veces— mientras que
 * uno que se contiene a sí mismo colgaría el recorrido. Guardar «todo lo visto»
 * rechazaría el primer caso, que es legítimo y frecuente en cuanto un juego
 * comparte una carta entre dos listas.
 */
function escribir(valor: unknown, ruta: string, enCurso: object[]): string {
  if (valor === null) return 'null';

  const clase = typeof valor;

  if (clase === 'boolean') return valor === true ? 'true' : 'false';

  if (clase === 'number') {
    const n = valor as number;
    if (!Number.isFinite(n)) {
      throw new NoCanonizable(
        ruta,
        'es un número que no es finito. `JSON.stringify` lo convierte en `null` sin avisar, ' +
          'así que dos estados distintos producirían la misma cadena. Para «nunca» usa ' +
          '`NUNCA` de `reloj.ts`, que es un entero de verdad.',
      );
    }
    /*
     * El cero negativo se escribe como cero. Son valores distintos para
     * `Object.is` y el mismo número para cualquier regla de juego; dejar que se
     * distingan haría que una partida reejecutada «difiriera» por un signo que
     * nadie puede ver.
     */
    return n === 0 ? '0' : JSON.stringify(n);
  }

  if (clase === 'string') return JSON.stringify(valor);

  if (clase === 'undefined') {
    throw new NoCanonizable(
      ruta,
      'está sin definir. `JSON.stringify` lo borra dentro de un objeto y lo convierte en ' +
        '`null` dentro de una lista, así que la ausencia y el nulo dejarían de distinguirse. ' +
        'Si el campo puede no estar, no lo pongas; si puede estar vacío, pon `null`.',
    );
  }

  if (clase === 'function') {
    throw new NoCanonizable(
      ruta,
      'es una función. El estado de un arcade es DATO: lo que se guarda, se manda por la red ' +
        'y se reejecuta seis meses después. Una función no sobrevive a ninguna de las tres.',
    );
  }

  if (clase === 'symbol') {
    throw new NoCanonizable(ruta, 'es un símbolo, y un símbolo no sobrevive a un viaje por la red.');
  }

  if (clase === 'bigint') {
    throw new NoCanonizable(
      ruta,
      'es un entero grande, y `JSON.stringify` lanza al encontrarlo. Si el número cabe en un ' +
        'entero seguro, usa un número; si no cabe, guárdalo como cadena y opera aparte.',
    );
  }

  const objeto = valor as object;

  for (const antepasado of enCurso) {
    if (antepasado === objeto) {
      throw new NoCanonizable(
        ruta,
        'se contiene a sí mismo. Un estado con un ciclo no se puede guardar ni mandar, y el ' +
          'recorrido no terminaría nunca.',
      );
    }
  }
  const rama = [...enCurso, objeto];

  if (Array.isArray(objeto)) {
    /*
     * El orden de una LISTA sí significa: es lo que separa «elige tres» de
     * «ponlos en orden». Se conserva tal cual, y por eso las listas no se
     * ordenan aquí aunque las claves de los objetos sí.
     */
    const piezas = objeto.map((elemento, i) => escribir(elemento, `${ruta}.${i}`, rama));
    return `[${piezas.join(',')}]`;
  }

  if (!esLlano(objeto)) {
    throw new NoCanonizable(
      ruta,
      'no es un objeto llano. Una fecha, un mapa, un conjunto o una instancia de una clase ' +
        'pierden lo que son al serializarse y vuelven convertidos en otra cosa. El estado de ' +
        'un arcade se escribe con listas, objetos llanos, números, cadenas y booleanos.',
    );
  }

  /*
   * Y AQUÍ ESTÁ LA RAZÓN DE SER DEL FICHERO: las claves ordenadas.
   *
   * `Object.keys` devuelve primero las que tienen forma de entero en orden
   * numérico y después el resto en orden de INSERCIÓN. Es lo mismo que hace que
   * `for…in` esté prohibido en el camino del reductor, y aquí se arregla en vez
   * de prohibirse, porque un estado sí tiene que poder llevar un objeto indexado
   * por identificador.
   */
  const claves = Object.keys(objeto).sort(porUnidadesDeCodigo);
  const comoMapa = objeto as Record<string, unknown>;
  const piezas = claves.map(
    (clave) => `${JSON.stringify(clave)}:${escribir(comoMapa[clave], `${ruta}.${clave}`, rama)}`,
  );
  return `{${piezas.join(',')}}`;
}

/**
 * ¿Son el mismo estado, aunque se hayan construido en distinto orden?
 *
 * Es la pregunta que hace `verify:determinismo`, y está aquí y no allí para que
 * la respuesta sea la misma en todos los sitios que la hagan. Dos comprobadores
 * con dos ideas de qué es «el mismo estado» acaban discrepando, y el que
 * discrepa por lo bajo es el que nadie mira.
 */
export function mismoEstado(uno: unknown, otro: unknown): boolean {
  return canonico(uno) === canonico(otro);
}

/**
 * Qué le pasa a un estado que no se puede serializar, o `null` si está bien.
 *
 * La versión que no lanza, para quien quiere PREGUNTAR en vez de intentarlo:
 * un comprobador que recorre veinte estados y quiere enumerar los cinco rotos,
 * o el árbitro el día que se decida validar el estado antes de guardarlo. Sin
 * esto, los dos tendrían que rodear la llamada de `try`, que es la forma de que
 * alguien acabe tragándose el error.
 */
export function porQueNoEsCanonico(valor: unknown): string | null {
  try {
    canonico(valor);
    return null;
  } catch (error) {
    if (error instanceof NoCanonizable) return error.message;
    throw error;
  }
}
