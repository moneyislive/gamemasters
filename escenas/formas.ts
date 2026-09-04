/**
 * DE UNOS CONTORNOS DE PUNTOS A UNA GEOMETRÍA PLANA.
 *
 * ═══ POR QUÉ LOS ICONOS SON TRIÁNGULOS Y NO UNA IMAGEN ═══
 *
 * Lo obvio sería convertirlos a PNG y pegarlos como textura. No vale, por dos razones que
 * se ven en pantalla:
 *
 * Una, la carta cambia de tamaño constantemente. La baraja tiene imán: la carta señalada
 * crece, y en la vista de tierra la mano ocupa el doble que desde el aire. Un PNG se
 * elige a un tamaño y se ve blando en todos los demás; una silueta no tiene resolución
 * que perder.
 *
 * Y dos, rasterizar exige una herramienta que este repositorio no tiene —ni `sharp`, ni
 * `resvg`, ni un navegador sin cabeza— y meterla costaría una dependencia de compilación
 * para producir algo peor.
 *
 * ═══ POR QUÉ AQUÍ NO SE ANALIZA NADA ═══
 *
 * Los contornos llegan ya aplanados de `escenas/iconos.ts`, que lo escribe el compilador.
 * Aquí sólo se enhebran puntos.
 *
 * No es por ahorrar trabajo en el arranque: es que analizar SVG en tiempo de ejecución
 * exige `DOMParser`, que es del navegador y NO existe en React Native. Un icono analizado
 * al vuelo funcionaría en el escritorio y saldría vacío en la app, sin un error en
 * ninguna consola — la misma trampa por la que aquí está prohibido `drei`. Ver
 * `escenas/scripts/aplana-trazo.ts`.
 *
 * ═══ POR QUÉ ESTE FICHERO ESTÁ SEPARADO DE `delta.tsx` ═══
 *
 * Porque importa `three` pero NO abre un contexto de dibujo: `ShapePath` y `ShapeGeometry`
 * son aritmética, convierten contornos en triángulos sin tocar la tarjeta gráfica. Así un
 * guion de Node puede pedir las cinco geometrías y comprobar que ninguna sale vacía y que
 * todas caben en su cuadrado — que es justo lo que no se ve mirando el tablero, porque un
 * icono que sale mal parece una decisión de arte.
 */

import * as THREE from 'three';

/**
 * LA GEOMETRÍA DE UN ICONO, centrada en el origen y encajada en un cuadrado de lado 1.
 *
 * Se normaliza aquí y no donde se pinta para que los cinco salgan del mismo tamaño sin
 * que quien los coloque sepa nada del lienzo del que vinieron: sólo tiene que escalarla a
 * lo que quiera que mida.
 *
 * Devuelve `null` si no sale nada dibujable, en vez de una geometría vacía: una geometría
 * vacía se dibuja sin protestar y deja un hueco donde tenía que haber un icono, que es la
 * forma más silenciosa de fallar.
 */
export function geometriaDeContornos(
  contornos: readonly (readonly number[])[],
): THREE.ShapeGeometry | null {
  if (contornos.length === 0) return null;

  /*
   * `ShapePath.toShapes` es quien decide qué contorno es silueta y qué contorno es
   * agujero, por su orientación y por si uno está dentro de otro. Es la misma pieza que
   * usa `SVGLoader` por dentro, y no depende del DOM: se le puede dar de comer a mano.
   */
  const camino = new THREE.ShapePath();
  for (const tira of contornos) {
    if (tira.length < 6) continue;
    camino.moveTo(tira[0] as number, tira[1] as number);
    for (let i = 2; i + 1 < tira.length; i += 2) {
      camino.lineTo(tira[i] as number, tira[i + 1] as number);
    }
  }
  if (camino.subPaths.length === 0) return null;

  /*
   * Sin argumento: las versiones viejas de three pedían aquí un `isCCW` que ya no existe.
   * `tsx` no lo comprobaba y pasaba de largo; lo cazó `tsc`. La orientación de los
   * contornos la deduce sola de cómo están enrollados.
   */
  const formas = camino.toShapes();
  if (formas.length === 0) return null;

  const geometria = new THREE.ShapeGeometry(formas);
  const posicion = geometria.getAttribute('position') as THREE.BufferAttribute | undefined;
  if (posicion === undefined || posicion.count === 0) {
    geometria.dispose();
    return null;
  }

  /*
   * LA VUELTA EN `Y`, QUE NO ES UN DETALLE.
   *
   * En SVG la `y` crece hacia abajo y en tres dimensiones hacia arriba. Sin darle la
   * vuelta salen los cinco cabeza abajo — y la oveja y la gavilla lo cantan, mientras que
   * el montón de piedras casi no se nota. Un fallo que sólo se ve en tres de cinco casos
   * es peor que uno que se ve en los cinco.
   *
   * Al reflejar hay que invertir también el orden de los vértices de cada triángulo, o se
   * quedan mirando hacia atrás y desaparecen en cuanto el material descarte caras
   * traseras.
   */
  geometria.scale(1, -1, 1);
  const indice = geometria.getIndex();
  if (indice !== null) {
    const a = indice.array as Uint16Array | Uint32Array;
    for (let i = 0; i + 2 < a.length; i += 3) {
      const t = a[i] as number;
      a[i] = a[i + 2] as number;
      a[i + 2] = t;
    }
    indice.needsUpdate = true;
  }

  geometria.computeBoundingBox();
  const caja = geometria.boundingBox;
  if (caja === null) return geometria;

  /*
   * Encajado por el lado MAYOR, igual que los modelos del pack en la barra y por el mismo
   * motivo: normalizar por la altura hace que una oveja ancha y baja se agrande hasta
   * salirse por los lados.
   */
  const ancho = caja.max.x - caja.min.x;
  const alto = caja.max.y - caja.min.y;
  const mayor = Math.max(ancho, alto);
  geometria.translate(-(caja.min.x + caja.max.x) / 2, -(caja.min.y + caja.max.y) / 2, 0);
  if (mayor > 0) geometria.scale(1 / mayor, 1 / mayor, 1);
  geometria.computeBoundingBox();

  return geometria;
}

/** Cuántos triángulos tiene una geometría. Para medir el coste, y para comprobar. */
export function cuantosTriangulos(geometria: THREE.BufferGeometry): number {
  const indice = geometria.getIndex();
  if (indice !== null) return indice.count / 3;
  const posicion = geometria.getAttribute('position') as THREE.BufferAttribute | undefined;
  return posicion === undefined ? 0 : posicion.count / 3;
}
