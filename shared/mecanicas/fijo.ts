/**
 * COMA FIJA Q16.16: la aritmética con la que se anda, y que los dos motores calculan igual.
 *
 * ═══ POR QUÉ HACE FALTA UNA CAPA PARA ESTO ═══
 *
 * `verify:determinismo` compara Node contra Hermes. Las trascendentales de `Math` ya están
 * prohibidas por `verify:pureza`, y su cabecera dice cuáles se salvan:
 *
 *   «LO QUE SÍ ES SEGURO Y NO SE PROHÍBE: `+`, `−`, `×`, `÷` y `Math.sqrt`, que están
 *   fijadas al bit por IEEE 754.»
 *
 * Esa frase es verdad y es la base de este fichero. Lo que la frase NO dice —y es lo que
 * costó una tarde— es que la forma habitual de multiplicar en coma fija **no usa `×` y `÷`**:
 * usa un desplazamiento. Y el desplazamiento es donde se rompe.
 *
 * ═══ EL FALLO QUE ESTE FICHERO EXISTE PARA NO REPETIR ═══
 *
 * En Q16.16 un número son sus unidades por 65.536. Multiplicar dos de ellos da 32 bits de
 * parte entera y 32 de fracción, así que hay que dividir por 65.536 para volver a Q16.16. La
 * forma que escribe todo el mundo es `(a * b) >> 16`, porque un desplazamiento es una
 * división entera exacta y parece lo más seguro que hay.
 *
 * No lo es. `>>` convierte su operando a entero de 32 bits ANTES de desplazar, y el producto
 * de dos Q16.16 no cabe en 32 bits. Lo medido en esta casa, en los dos motores:
 *
 *   ┌──────────────────────────┬─────────────────────┬──────────────┬──────────────┐
 *   │ forma                    │ 26,4 u/s a 30 fps   │ coste Hermes │ huella       │
 *   ├──────────────────────────┼─────────────────────┼──────────────┼──────────────┤
 *   │ `(a * b) >> 16`          │ −0,1202 u           │ 0,1230 µs    │ 1110387867   │
 *   │ `Math.imul(a, b) >> 16`  │ −0,1202 u           │ 0,1490 µs    │ 1110387867   │
 *   │ `((a * b) / UNO) | 0`    │ +0,8798 u           │ 0,1275 µs    │ 2355669794   │
 *   └──────────────────────────┴─────────────────────┴──────────────┴──────────────┘
 *
 * Tres cosas, y las tres son la razón de que esto sea una capa y no una línea suelta:
 *
 *  1. NO ES UN CASO DE BORDE. Son 17 de las 32 combinaciones de velocidad por frecuencia que
 *     se dan aquí. Cae andar (26,4 u/s) a 30 fps, y cae hasta 12 u/s a 20 fps. El signo se
 *     invierte: el paseante anda HACIA ATRÁS.
 *
 *  2. LOS DOS MOTORES DAN LA MISMA HUELLA MALA. Es un desbordamiento determinista. O sea que
 *     `verify:determinismo` —el comprobador que existe justo para esto— sale VERDE encima. No
 *     es que mire a otro lado: es que CONFIRMA el fallo. Una comprobación que certifica lo
 *     que venía a cazar es peor que no tenerla, porque se lee como vigilancia.
 *
 *  3. `Math.imul` NO SALVA. Está en la lista de lo seguro de `verificar-pureza.ts` por ser
 *     entera, y para el generador sembrado lo es. Para un producto Q16.16 es exactamente
 *     igual de mala que `>>` —desborda igual, por la misma razón— y además es la más lenta
 *     de las tres. Quien busque «la herramienta entera segura» la va a encontrar, y le va a
 *     mentir.
 *
 * ═══ LO QUE SÍ VALE, Y POR QUÉ ES EXACTO ═══
 *
 * `((a * b) / UNO) | 0`. El producto se calcula en coma flotante de 64 bits, que representa
 * TODOS los enteros hasta 2^53 sin perder nada; dividir por 65.536 es restar 16 al exponente,
 * exacto por construcción; y `| 0` trunca hacia cero. Las tres operaciones están fijadas al
 * bit por IEEE 754, que es justo lo que `verify:pureza` dice que se puede usar.
 *
 * El límite es que el producto quepa en 2^53. El mayor que se da aquí —correr a 96 u/s con el
 * tope de `dt` en 0,1 s— es 41.227.911.168, que deja un margen de 218.473 veces. No es que
 * quepa: es que no se ve el borde desde aquí. Aun así `por` lo comprueba, porque un margen
 * escrito en un comentario es un margen que alguien se salta (ver `TOPE_EXACTO`).
 *
 * Cuesta un 3,7 % más que la forma rota. Es gratis.
 *
 * ═══ POR QUÉ COMA FIJA Y NO COMA FLOTANTE A SECAS ═══
 *
 * Porque `+`, `−`, `×` y `÷` sobre flotantes también están fijadas al bit, así que la
 * pregunta es legítima. La respuesta es que la coma fija no evita la divergencia de las
 * OPERACIONES: evita la de las CANTIDADES. Un mundo en flotante acumula posiciones como
 * 3,6458333333333335 y las compara con `<`; dos caminos que deberían llevar al mismo sitio
 * llegan a un último bit de distancia, y el resultado de la comparación —y con él, si cabes o
 * no cabes por un hueco— depende de ese bit. En Q16.16 la posición es un entero: dos caminos
 * llegan al mismo sitio o a sitios que se distinguen, y no hay tercera opción.
 *
 * ═══ QUÉ NO ESTÁ AQUÍ ═══
 *
 * No hay seno ni coseno, ni tabla de rumbos. Eso es una decisión del contrato del mundo y no
 * de la aritmética, y se toma en su sitio. Aquí sólo está lo que es cierto para cualquier
 * Q16.16: qué es un número, cómo se multiplica y cómo se divide sin mentir.
 */

/** Cuántas unidades de coma fija hay en una unidad del mundo. 2^16. */
export const UNO = 65536;

/**
 * El mayor producto que la coma flotante de 64 bits representa sin perder un bit: 2^53.
 *
 * Por encima de aquí `a * b` deja de ser exacto y empieza a redondear, y eso sí divergiría
 * entre motores —o peor, no divergiría y devolvería un número equivocado igual en los dos—.
 * Es el mismo modo de fallo que el desbordamiento de `>>`, un piso más arriba.
 */
export const TOPE_EXACTO = 9007199254740992;

/** Lo que se lanza cuando un producto se sale del rango en el que la aritmética es exacta. */
export class FueraDeRango extends Error {
  constructor(a: number, b: number) {
    super(
      `El producto ${String(a)} x ${String(b)} se sale del rango exacto de la coma fija ` +
        `(2^53). Por encima de ahí el resultado es el MISMO en todos los motores y está MAL, ` +
        `que es el fallo que esta capa existe para no repetir.`,
    );
    this.name = 'FueraDeRango';
  }
}

/**
 * Un número del mundo a coma fija. Sólo para MONTAR: aquí se toca coma flotante a propósito,
 * una vez, y a partir de ahí todo es entero.
 */
export function deNumero(x: number): number {
  return Math.round(x * UNO) | 0;
}

/** De coma fija a número del mundo. Sólo para PINTAR: lo que sale de aquí no vuelve a entrar. */
export function aNumero(f: number): number {
  return f / UNO;
}

/**
 * El producto de dos Q16.16.
 *
 * Ni `>>` ni `Math.imul`: los dos desbordan y los dos mienten igual en Node y en Hermes. La
 * cabecera de este fichero tiene la tabla medida.
 */
export function por(a: number, b: number): number {
  const p = a * b;
  if (p > TOPE_EXACTO || p < -TOPE_EXACTO) throw new FueraDeRango(a, b);
  return (p / UNO) | 0;
}

/**
 * El cociente de dos Q16.16.
 *
 * Mismo desbordamiento por el otro lado: `(a << 16) / b` pierde los 16 bits altos de `a`
 * antes de dividir. Se sube con `×` y se baja con `÷`, que son las dos que IEEE 754 fija.
 */
export function entre(a: number, b: number): number {
  if (b === 0) throw new FueraDeRango(a, b);
  const p = a * UNO;
  if (p > TOPE_EXACTO || p < -TOPE_EXACTO) throw new FueraDeRango(a, UNO);
  return (p / b) | 0;
}
