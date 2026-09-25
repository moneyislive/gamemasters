/**
 * Cuántas caras ocupa una tabla de «quiénes van», estimado con medidas de verdad.
 *
 * Existe por los dosieres de los juegos con traidor (las Sombras y la Momia):
 * cada sobre tiene que abultar lo mismo, y la tabla con la presentación de toda
 * la mesa es la única parte que puede ocupar más de una cara. Como es la MISMA
 * en todos los dosieres, no puede hacer un sobre más gordo que otro; lo que sí
 * puede es dejar el total impar, y entonces, imprimiendo la mesa entera a doble
 * cara, cada dosier empezaría en el dorso del anterior. Chromium no inserta la
 * cara en blanco él solo (`break-before: right` se imprime como un salto normal:
 * medido con Edge), así que cada dosier lo estima y, si hace falta, añade una
 * cara de notas.
 *
 * Las medidas son de cada hoja de estilo —la letra y los márgenes cambian de un
 * juego a otro— y se calibran con `scripts/medir-paginas.ts`. Las filas no se
 * parten entre caras (`tr` va con `break-inside: avoid`) y la cabecera se repite
 * en cada una.
 */

/** Lo que cabe en una cara de A4 con 15 mm de margen arriba y abajo, en px de pantalla (267 mm). */
export const ALTO_DE_CARA = 1009;

export interface MedidasDeLaTabla {
  /** El título, la entradilla y la cabecera de la tabla, en la primera cara. */
  arriba: number;
  /** La cabecera, que se repite en cada cara. */
  cabecera: number;
  /** El aire de una fila (relleno y borde). */
  aire: number;
  /** El nombre, a la izquierda: alto de línea y caracteres por línea. */
  nombre: { linea: number; porLinea: number };
  /** Lo que va debajo del nombre (la persona que lo juega, el blasón…), cada cosa en sus líneas. */
  debajo: { linea: number; porLinea: number };
  /** El puesto, arriba en la columna de en medio. */
  puesto: { linea: number; porLinea: number };
  /** La presentación, debajo del puesto. */
  presentacion: { linea: number; porLinea: number };
}

export interface FilaDeLaTabla {
  nombre: string;
  /** Líneas que van debajo del nombre, en caracteres (vacías si no hay). */
  debajo: string[];
  puesto: string;
  presentacion: string;
}

/**
 * Lo que se llena de cada cara al repartir la tabla: bastante menos que lo que
 * cabe. La estimación de cada fila acierta al píxel en las medidas, pero en el
 * borde manda el navegador —una fila de más o de menos por dos píxeles—, y con
 * este margen cada trozo cabe seguro en su cara.
 */
export const LLENADO_SEGURO = 940;

function altoDeFila(f: FilaDeLaTabla, m: MedidasDeLaTabla): number {
  const lineas = (texto: string, porLinea: number) => Math.max(1, Math.ceil(texto.length / porLinea));
  const izquierda =
    m.aire +
    m.nombre.linea * lineas(f.nombre, m.nombre.porLinea) +
    f.debajo.filter(Boolean).reduce((suma, d) => suma + m.debajo.linea * lineas(d, m.debajo.porLinea), 0);
  const centro =
    m.aire + m.puesto.linea * lineas(f.puesto, m.puesto.porLinea) + m.presentacion.linea * lineas(f.presentacion, m.presentacion.porLinea);
  return Math.max(izquierda, centro);
}

/**
 * Reparte las filas en caras: qué filas van en cada una.
 *
 * NO SE DEJA QUE EL NAVEGADOR PARTA LA TABLA. Se parte aquí, con un salto de
 * cara explícito entre trozo y trozo, y así el número de caras lo sabe el
 * dosier y no hay que adivinar dónde cortará Chromium. Con la estimación a
 * secas, una fila que en las cuentas no cabía por dos píxeles cabía al imprimir,
 * y el total salía impar.
 */
export function repartirEnCaras(filas: FilaDeLaTabla[], m: MedidasDeLaTabla): number[][] {
  const caras: number[][] = [[]];
  let usado = m.arriba;
  filas.forEach((f, i) => {
    const alto = altoDeFila(f, m);
    if (usado + alto > LLENADO_SEGURO && caras[caras.length - 1]!.length > 0) {
      caras.push([]);
      usado = m.cabecera;
    }
    caras[caras.length - 1]!.push(i);
    usado += alto;
  });
  return caras;
}

export function carasDeLaTabla(filas: FilaDeLaTabla[], m: MedidasDeLaTabla): number {
  return repartirEnCaras(filas, m).length;
}
