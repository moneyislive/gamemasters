/**
 * LAS GEOMETRÍAS QUE SE INSTANCIAN: cuatro formas, y ninguna más.
 *
 * ═══ POR QUÉ TAN POCAS Y TAN PEQUEÑAS ═══
 *
 * Casi todo lo que pinta un efecto lo pinta el sombreador de fragmentos sobre un CUADRO: el anillo
 * es una distancia al radio, la columna de glifos es una rejilla, la silueta es una distancia a una
 * persona. La geometría sólo pone el lienzo, y un lienzo son dos triángulos. Las dos excepciones
 * son la cinta curva (los hilos del Trasvase tienen que curvarse de verdad, y en 12 tramos no se ve
 * el quiebro) y la esquirla, que es un cristal con caras y tiene que brillar por facetas.
 *
 * El comprobador construye estas mismas geometrías en Node y cuenta sus triángulos contra
 * `TRIANGULOS_DE_LA_FORMA` de `presupuesto.ts`: si alguien sube los tramos de la curva aquí y no
 * allí, el presupuesto se ve mentir en rojo.
 */
import * as THREE from 'three';
import type { Pieza } from './presupuesto';
import { SEGMENTOS_DE_LA_CURVA, renglonDe } from './presupuesto';

/** Un cuadro de (0,0) a (1,1): tapices (x a lo ancho, y hacia arriba). */
export function cuadroDeTapiz(): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
}

/** Un cuadro de (−1,−1) a (1,1): anillos, ondas y destellos. */
export function cuadroCentrado(): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
}

/** Un cuadro de trazo: x de 0 (cola) a 1 (cabeza), y de −1 a 1 (el ancho). Chispas. */
export function cuadroDeTrazo(): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
}

/**
 * Una cinta de `tramos` tramos: x de 0 a 1 a lo largo, y de −1 a 1 a lo ancho. El sombreador la
 * dobla por una curva de Bézier cuadrática y la pone de cara a la cámara.
 */
export function cinta(tramos: number): THREE.BufferGeometry {
  const posiciones: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= tramos; i++) {
    const u = i / tramos;
    posiciones.push(u, -1, 0, u, 1, 0);
    if (i < tramos) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
  g.setIndex(indices);
  return g;
}

/**
 * LA ESQUIRLA: una bipirámide hexagonal alargada, de una unidad de alto, sin índices y con la
 * normal de cada cara en sus tres vértices (el brillo por facetas sale de ahí).
 */
export function esquirla(): THREE.BufferGeometry {
  const posiciones: number[] = [];
  const normales: number[] = [];
  const arriba = new THREE.Vector3(0, 0.62, 0);
  const abajo = new THREE.Vector3(0, -0.38, 0);
  const cintura: THREE.Vector3[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    /* Una cintura algo irregular: un cristal tallado a mano, no una joya de catálogo. */
    const r = 0.2 + (i % 2 === 0 ? 0.03 : -0.02);
    cintura.push(new THREE.Vector3(Math.cos(a) * r, 0.02 * (i % 3), Math.sin(a) * r));
  }
  const cara = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): void => {
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
    for (const v of [a, b, c]) {
      posiciones.push(v.x, v.y, v.z);
      normales.push(n.x, n.y, n.z);
    }
  };
  for (let i = 0; i < 6; i++) {
    const p = cintura[i] as THREE.Vector3;
    const q = cintura[(i + 1) % 6] as THREE.Vector3;
    cara(arriba, q, p);
    cara(abajo, p, q);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normales, 3));
  return g;
}

/**
 * LA GEOMETRÍA BASE DE CADA PIEZA, la que monta de verdad. Los cuadros son tres (el del tapiz va de
 * 0 a 1, el centrado de −1 a 1, el del trazo de cola a cabeza) pero todos son la forma `cuadro` del
 * presupuesto; el comprobador cuenta los triángulos de ÉSTA, no de una forma genérica.
 */
export function geometriaDeLaPieza(pieza: Pieza): THREE.BufferGeometry {
  const { familia, forma } = renglonDe(pieza);
  switch (forma) {
    case 'cuadro':
      return familia === 'tapices' ? cuadroDeTapiz() : familia === 'chispas' ? cuadroDeTrazo() : cuadroCentrado();
    case 'cinta-recta':
      return cinta(1);
    case 'cinta-curva':
      return cinta(SEGMENTOS_DE_LA_CURVA);
    case 'esquirla':
      return esquirla();
  }
}

/** Triángulos de una geometría (con o sin índices). */
export function triangulosDe(g: THREE.BufferGeometry): number {
  const indice = g.getIndex();
  if (indice !== null) return indice.count / 3;
  return g.getAttribute('position').count / 3;
}

/**
 * Una geometría instanciada que comparte los atributos de la base. Las piezas le añaden los suyos
 * por instancia con `atributoPorInstancia`.
 */
export function instanciada(base: THREE.BufferGeometry): THREE.InstancedBufferGeometry {
  const g = new THREE.InstancedBufferGeometry();
  const indice = base.getIndex();
  if (indice !== null) g.setIndex(indice);
  for (const nombre of Object.keys(base.attributes)) {
    const a = base.getAttribute(nombre);
    if (a instanceof THREE.BufferAttribute) g.setAttribute(nombre, a);
  }
  g.instanceCount = 0;
  return g;
}

/**
 * Un atributo por instancia de `tam` componentes para `n` instancias. Si se da `datos`, se usa ese
 * array (el de `sistema.ts`, para las chispas y las esquirlas): la CPU escribe y la GPU lee el mismo.
 */
export function atributoPorInstancia(
  g: THREE.InstancedBufferGeometry,
  nombre: string,
  n: number,
  tam: number,
  datos?: Float32Array,
): THREE.InstancedBufferAttribute {
  const a = new THREE.InstancedBufferAttribute(datos ?? new Float32Array(n * tam), tam);
  a.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute(nombre, a);
  return a;
}

/** Sube a la GPU sólo las `cuantas` primeras instancias de un atributo. */
export function subirLasPrimeras(a: THREE.InstancedBufferAttribute, cuantas: number): void {
  if (cuantas <= 0) return;
  a.clearUpdateRanges();
  a.addUpdateRange(0, cuantas * a.itemSize);
  a.needsUpdate = true;
}

/** Sube a la GPU el tramo [desde, hasta) de instancias de un atributo. */
export function subirElTramo(a: THREE.InstancedBufferAttribute, desde: number, hasta: number): void {
  if (hasta <= desde) return;
  a.clearUpdateRanges();
  a.addUpdateRange(desde * a.itemSize, (hasta - desde) * a.itemSize);
  a.needsUpdate = true;
}
