/**
 * EL TINTE: pintar del color del asiento los vértices marcados de una pieza.
 *
 * ═══ POR QUÉ SE REESCRIBE `COLOR_0` Y NO SE CAMBIA EL MATERIAL ═══
 *
 * Las piezas del embarcadero llevan el color HORNEADO por vértice y un material
 * blanco con `vertexColors` (ver `piezas.ts`): no hay textura que desplazar ni
 * `color` de material que sirva, porque el material tiñe la pieza ENTERA y aquí
 * sólo se tiñe la vela, no el casco. El compilador dejó en `_TINTE` (0 o 1 por
 * vértice) qué es «del color»; lo que hace este módulo es clonar la geometría y
 * escribir el color del asiento en esos vértices, dejando el resto como estaba.
 *
 * ═══ SE CONSERVA LA LUMINANCIA, NO SE SUSTITUYE EN PLANO ═══
 *
 * El barco y el estandarte están enmascarados ENTEROS (`PIEZAS_TENIDAS_ENTERAS`):
 * son fichas del pack pintadas con un degradado de unos ochenta tonos del propio
 * azul, y ese degradado ES su volumen. La primera versión escribía el color del
 * asiento tal cual en cada vértice marcado y el barco salía como una silueta
 * plana. Ahora, para cada vértice teñible, se mide cuánto más claro u oscuro es
 * que el azul medio del pack —luminancia relativa, en lineal— y se aplica esa
 * misma relación al color del asiento. La relación se acota a [0,25, 1,75] para
 * que un vértice casi negro del casco no apague un color claro y uno casi blanco
 * no lo queme; el resultado se acota a [0, 1] porque es un byte. La misma regla
 * vale para el muelle y la bandera, que sólo llevan 44 vértices de color: ahí la
 * relación ronda 1 y el color sale el del asiento.
 *
 * ═══ LINEAL, NO sRGB ═══
 *
 * `COLOR_0` es lineal por definición de glTF y así lo escribió el compilador. Un
 * `#e0533d` escrito tal cual saldría lavado, con el gamma dos veces. `THREE.Color`
 * con la gestión de color activa (la de serie) ya convierte un hexadecimal sRGB
 * al espacio lineal de trabajo, y sus `r g b` son lo que hay que guardar. El
 * azul del pack está medido en sRGB (`AZUL_DEL_PACK`) y se pasa a lineal por el
 * mismo camino antes de medirle la luminancia.
 *
 * ═══ EL AZUL DE REFERENCIA ES DEL PACK, Y POR ESO ENTRA POR PARÁMETRO ═══
 *
 * La luminancia relativa se mide contra el azul MEDIO del pack del que salió la
 * pieza, y cada pack tiene el suyo: el hexagonal pinta su celda azul en [37,125,188]
 * (`AZUL_DEL_PACK`), y las fichas de Board Game Bits —las del Burgo— en [36,126,187]
 * (`AZUL_DE_LAS_FICHAS` en `burgo/piezas.ts`). Son casi iguales y por eso da igual
 * hoy; el día que se tiña una pieza de un pack con un azul de otro tono, medirla
 * contra el azul equivocado le cambia el volumen a toda la pieza sin que nada
 * proteste. Así que la referencia es un parámetro con el azul del hexagonal por
 * defecto: el embarcadero no cambia ni un byte, y el Burgo pasa el suyo.
 *
 * ═══ LA CACHÉ ES POR (PIEZA, COLOR, REFERENCIA), Y SE SUELTA AL DESMONTAR ═══
 *
 * Seis asientos con seis colores son seis geometrías de barco, no treinta y seis
 * ni una por fotograma. Quien pide el mismo tinte para la misma pieza recibe el
 * mismo objeto, y puede instanciarlo o clonarlo barato. La referencia va en la
 * clave: la misma pieza teñida del mismo color contra dos azules son dos
 * geometrías distintas, y devolver una por la otra sería el fallo mudo de arriba.
 * Las geometrías teñidas son NUESTRAS (copias), y sin `dispose` se quedaban en la
 * GPU al irse la escena: `soltarTintes` las suelta pieza a pieza. `dispose` borra
 * la copia de la GPU y no los datos, así que si la escena vuelve a montarse con
 * el mismo catálogo, la caché sigue valiendo y three vuelve a subirlas sola.
 */
import * as THREE from 'three';
import { ATRIBUTO_DE_TINTE_CARGADO, AZUL_DEL_PACK } from './piezas';

/** Un azul de referencia: el color medio de la celda que se tiñe, en sRGB de 0 a 255. */
export type AzulDeReferencia = readonly [number, number, number];

const cache = new WeakMap<THREE.Object3D, Map<string, THREE.Object3D>>();
const cacheDeGeometrias = new WeakMap<THREE.BufferGeometry, Map<string, THREE.BufferGeometry>>();

/** Las cotas de la relación de luminancia y del resultado. */
export const RELACION_MINIMA = 0.25;
export const RELACION_MAXIMA = 1.75;

/** El color en lineal, como lo espera `COLOR_0`. */
function enLineal(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

/** Luminancia relativa de un color lineal (Rec. 709). */
export function luminancia(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** La clave de caché de un tinte: el color del asiento y el azul contra el que se midió. */
function claveDelTinte(hex: string, referencia: AzulDeReferencia): string {
  return `${hex}|${String(referencia[0])},${String(referencia[1])},${String(referencia[2])}`;
}

/**
 * La luminancia del azul de referencia, en lineal: se calcula una vez por azul y se
 * recuerda, porque `tenirGeometria` la pide por vértice y son miles.
 */
const luminanciasDeReferencia = new Map<string, number>();
function luminanciaDeReferencia(referencia: AzulDeReferencia): number {
  const clave = claveDelTinte('', referencia);
  const sabida = luminanciasDeReferencia.get(clave);
  if (sabida !== undefined) return sabida;
  const azul = new THREE.Color().setRGB(referencia[0] / 255, referencia[1] / 255, referencia[2] / 255, THREE.SRGBColorSpace);
  const l = Math.max(1e-4, luminancia(azul.r, azul.g, azul.b));
  luminanciasDeReferencia.set(clave, l);
  return l;
}

const pinza = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x));

/**
 * EL COLOR TEÑIDO DE UN VÉRTICE: el del asiento por la luminancia relativa del
 * horneado respecto del azul de referencia, acotada. Expuesta para que el comprobador
 * pueda mirar la regla sin abrir una geometría. Sin referencia, el azul del hexagonal.
 */
export function colorTenido(
  horneado: readonly [number, number, number],
  asiento: readonly [number, number, number],
  referencia: AzulDeReferencia = AZUL_DEL_PACK,
): [number, number, number] {
  const relacion = pinza(
    luminancia(horneado[0], horneado[1], horneado[2]) / luminanciaDeReferencia(referencia),
    RELACION_MINIMA,
    RELACION_MAXIMA,
  );
  return [pinza(asiento[0] * relacion, 0, 1), pinza(asiento[1] * relacion, 0, 1), pinza(asiento[2] * relacion, 0, 1)];
}

/**
 * Una copia de la geometría con los vértices de tinte pintados. Si la geometría no
 * lleva máscara, se devuelve ella misma: no hay nada que teñir y clonar sería gastar.
 * `referencia` es el azul medio del pack de la pieza (ver la cabecera).
 */
export function tenirGeometria(
  geometria: THREE.BufferGeometry,
  hex: string,
  referencia: AzulDeReferencia = AZUL_DEL_PACK,
): THREE.BufferGeometry {
  const mascara = geometria.getAttribute(ATRIBUTO_DE_TINTE_CARGADO);
  const color = geometria.getAttribute('color');
  if (mascara === undefined || color === undefined) return geometria;

  let porColor = cacheDeGeometrias.get(geometria);
  if (porColor === undefined) {
    porColor = new Map();
    cacheDeGeometrias.set(geometria, porColor);
  }
  const clave = claveDelTinte(hex, referencia);
  const hecha = porColor.get(clave);
  if (hecha !== undefined) return hecha;

  /* `clone()` a secas: los atributos ya no llegan entrelazados (ver `cargar.ts`). */
  const copia = geometria.clone();
  const n = color.count;
  /*
   * Se pasa a flotantes de tres componentes: el compilador guarda bytes
   * normalizados, y escribir sobre ellos obligaría a cuantizar otra vez. Tres
   * componentes y no cuatro porque el alfa del vértice no se usa en ninguna pieza.
   */
  const nuevo = new Float32Array(n * 3);
  const c = enLineal(hex);
  const asiento: [number, number, number] = [c.r, c.g, c.b];
  for (let i = 0; i < n; i++) {
    const r = color.getX(i);
    const g = color.getY(i);
    const b = color.getZ(i);
    if ((mascara as THREE.BufferAttribute).getX(i) > 0.5) {
      const t = colorTenido([r, g, b], asiento, referencia);
      nuevo[i * 3] = t[0];
      nuevo[i * 3 + 1] = t[1];
      nuevo[i * 3 + 2] = t[2];
    } else {
      nuevo[i * 3] = r;
      nuevo[i * 3 + 1] = g;
      nuevo[i * 3 + 2] = b;
    }
  }
  copia.setAttribute('color', new THREE.BufferAttribute(nuevo, 3));
  porColor.set(clave, copia);
  return copia;
}

/**
 * UNA PIEZA TEÑIDA: el nodo clonado con cada malla apuntando a su geometría
 * teñida. Los materiales se comparten con el original: no cambian. `referencia` es
 * el azul medio del pack de la pieza (ver la cabecera); sin él, el del hexagonal.
 */
export function tenir(pieza: THREE.Object3D, hex: string, referencia: AzulDeReferencia = AZUL_DEL_PACK): THREE.Object3D {
  let porColor = cache.get(pieza);
  if (porColor === undefined) {
    porColor = new Map();
    cache.set(pieza, porColor);
  }
  const clave = claveDelTinte(hex, referencia);
  const hecha = porColor.get(clave);
  if (hecha !== undefined) return hecha;

  const copia = pieza.clone(true);
  copia.traverse((n) => {
    const malla = n as THREE.Mesh;
    if (!malla.isMesh) return;
    malla.geometry = tenirGeometria(malla.geometry, hex, referencia);
  });
  porColor.set(clave, copia);
  return copia;
}

/**
 * SUELTA DE LA GPU las geometrías teñidas de estas piezas (todas las de todos los
 * colores) y olvida sus copias teñidas. Para llamarlo al desmontar la escena con
 * las piezas de su catálogo. Devuelve cuántas geometrías ha soltado.
 */
export function soltarTintes(piezas: Iterable<THREE.Object3D>): number {
  let soltadas = 0;
  for (const pieza of piezas) {
    pieza.traverse((n) => {
      const malla = n as THREE.Mesh;
      if (!malla.isMesh) return;
      const porColor = cacheDeGeometrias.get(malla.geometry);
      if (porColor === undefined) return;
      for (const g of porColor.values()) {
        g.dispose();
        soltadas++;
      }
      cacheDeGeometrias.delete(malla.geometry);
    });
    cache.delete(pieza);
  }
  return soltadas;
}

/** ¿Lleva esta pieza máscara de tinte en alguna de sus mallas? */
export function esTenible(pieza: THREE.Object3D): boolean {
  let si = false;
  pieza.traverse((n) => {
    const malla = n as THREE.Mesh;
    if (malla.isMesh && malla.geometry.getAttribute(ATRIBUTO_DE_TINTE_CARGADO) !== undefined) si = true;
  });
  return si;
}
