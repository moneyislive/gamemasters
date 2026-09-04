/**
 * LA SEMILLA DE UNA MESA: cinco letras → un entero, EL MISMO en todos los aparatos.
 *
 * ═══ POR QUÉ ESTO ES UN FICHERO Y NO CUATRO LÍNEAS COPIADAS ═══
 *
 * La semilla decide cómo se sortea el mundo que se pinta alrededor de una mesa: la
 * cala del Muelle, el delta de Riberas. Si dos clientes la calculan cada uno por su
 * cuenta, el día que una copia diverja —una pasa a mayúsculas y la otra no, una
 * trata la cadena vacía y la otra no— la misma mesa se ve distinta en la app y en el
 * PC sin que nada falle. Pasó: hubo tres copias del mismo hash y una ya no pasaba a
 * mayúsculas. Por eso hay UNA, sin importaciones, que la compilan los cuatro
 * paquetes y que un comprobador de Node puede comparar.
 *
 * ═══ POR QUÉ EN MAYÚSCULAS ═══
 *
 * El servidor genera los códigos de un alfabeto en mayúsculas y los clientes pasan a
 * mayúsculas lo que se teclea, pero un enlace copiado a mano puede traerlo en
 * minúsculas. Que `qwxyz` y `QWXYZ` den el mismo mundo es lo que se espera de un
 * código que el juego trata como el mismo.
 *
 * Es FNV-1a de 32 bits. No hay que repartir criptografía: sólo que dos códigos
 * distintos den mundos distintos casi siempre.
 */

/**
 * @param codigo El código de la mesa, en cualquier caja.
 * @param sinCodigo Qué devolver cuando no hay código (`null`, vacío): cada pantalla
 *   decide su mundo «de portada». Por defecto, cero.
 */
export function semillaDelCodigo(codigo: string | null | undefined, sinCodigo = 0): number {
  if (codigo === null || codigo === undefined || codigo.length === 0) return sinCodigo;
  let h = 0x811c_9dc5;
  const texto = codigo.toUpperCase();
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x0100_0193) >>> 0;
  }
  return h >>> 0;
}
