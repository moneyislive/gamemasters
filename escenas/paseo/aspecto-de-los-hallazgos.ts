/**
 * CÓMO SE VE CADA HALLAZGO: la pieza que gira en el suelo y la luz que la señala desde lejos, con
 * geometría primitiva de `three` y sin un modelo. Sin React: lo pinta `los-hallazgos.tsx` y lo mide
 * `verify:canal-del-paseo` en Node.
 *
 * ═══ UNA MALLA POR CLASE, CON EL COLOR EN EL VÉRTICE ═══
 *
 * Cada clase es un puñado de primitivas —una caja, un cilindro, un icosaedro— fundidas en UNA
 * geometría con el color horneado en el vértice, como hace el Burgo con sus bultos. Así cada clase
 * es una malla instanciada y una llamada, pinte uno o cinco, y todas comparten UN material. En un
 * móvil, con los once brotes que puede haber a lo sumo (`brotesDeLaMesa`), son cuatro o cinco
 * llamadas: las clases de ese juego y la luz.
 *
 * Las caras van planas —cada triángulo con su normal—: es el aire de las figuras de KayKit, y un
 * pedernal sin facetas no es un pedernal.
 *
 * ═══ LA LUZ: UNA COLUMNA QUE SE VE POR ENCIMA DE LOS TEJADOS ═══
 *
 * Lo que brota tiene que encontrarse desde lejos —se corre a por ello, y se ve correr a los demás—,
 * y una pieza de medio metro a cuarenta unidades son tres píxeles. Así que cada brote lleva una
 * columna de luz aditiva que sube desde el suelo y se apaga hacia arriba, con un halo en el suelo:
 * sin niebla y sin el tono de la escena, como el rótulo de los demás, porque de lejos es cuando más
 * falta. El color y la altura son de la clase: el maletín, el que más —más alta, más ancha y más
 * clara—, porque es el que más vale (docs/AVATARES-JUGABLES.md §3).
 *
 * ═══ LAS CLASES ═══
 *
 * Las de las tablas de los juegos: el Burgo `propina`, `cartera`, `maletin`; Riberas `hierro`,
 * `pedernal`, `cuero`, `junco`; Las Lindes `escudo`. Una clase que no esté aquí —un servidor más
 * nuevo que este binario— se pinta como una esfera neutra: se sigue viendo que ahí hay algo.
 */
import * as THREE from 'three';
import { TALLA_A_PIE } from './talla';

/** Las clases que se saben pintar, y la de lo que no se sabe. */
export const CLASES_DE_HALLAZGO = ['propina', 'cartera', 'maletin', 'hierro', 'pedernal', 'cuero', 'junco', 'escudo'] as const;
export type ClaseDeHallazgo = (typeof CLASES_DE_HALLAZGO)[number];
export const CLASE_DESCONOCIDA = 'desconocida';
export type AspectoDeHallazgo = ClaseDeHallazgo | typeof CLASE_DESCONOCIDA;

/** Qué aspecto lleva una clase que llega por el cable: la suya, o la esfera neutra. */
export function aspectoDe(clase: string): AspectoDeHallazgo {
  return (CLASES_DE_HALLAZGO as readonly string[]).includes(clase) ? (clase as ClaseDeHallazgo) : CLASE_DESCONOCIDA;
}

/** Lo que cabe a la vez: `brotesDeLaMesa` da once como mucho; el resto es holgura. */
export const CAPACIDAD_DE_BROTES = 16;

/**
 * A qué altura sobre el suelo flota el centro de la pieza, y cuánto sube y baja: a la altura del
 * pecho de quien anda, que desde el 27-sep-2026 mide la mitad (`TALLA_A_PIE`, `talla.ts`).
 */
export const FLOTA = 1.1 * TALLA_A_PIE;
export const VAIVEN = 0.12 * TALLA_A_PIE;

/** La luz de una clase: color (ya con su intensidad), alto de la columna y ancho, en unidades. */
export interface LuzDeHallazgo {
  readonly color: THREE.Color;
  readonly alto: number;
  readonly ancho: number;
}

/** La pieza de una clase: su escala, y lo deprisa que gira (vueltas por segundo). */
export interface PiezaDeHallazgo {
  readonly escala: number;
  readonly giro: number;
  readonly luz: LuzDeHallazgo;
}

/** Un color con su intensidad: en mezcla aditiva el negro no pinta, así que esto es el brillo. */
function brillo(hex: string, cuanto: number): THREE.Color {
  return new THREE.Color(hex).multiplyScalar(cuanto);
}

/*
 * ═══ LAS MEDIDAS SALIERON DE JUGAR UNA MESA, NO DE LA MESA DE DIBUJO ═══
 *
 * Las primeras —columnas de 3,5 a 9 unidades y una pieza de escala 1— se miraron en el Burgo desde
 * el hombro (27-sep-2026): a 57 unidades la columna era una raya de un píxel, a 38 la cartera no se
 * distinguía, y los edificios, de 10 a 40 de alto, la tapaban entera. Así que la pieza va un 60 % más
 * grande —la mitad de alto que quien anda— y la columna tres veces más alta, para asomar por
 * encima de una manzana; lo gruesa que es la da `geometriaDeLaLuz`.
 *
 * Y la PIEZA va con la talla de quien anda (`TALLA_A_PIE`): sigue midiendo la mitad que él, que
 * ahora son 0,64 y no 1,27. A la de antes, una moneda le llegaba a la coronilla y un maletín era más
 * ancho que él. La COLUMNA no encoge: es la señal que se ve desde lejos por encima de las manzanas, y
 * las manzanas no han cambiado.
 */
const PIEZAS: Readonly<Record<AspectoDeHallazgo, PiezaDeHallazgo>> = {
  propina: { escala: 1.6 * TALLA_A_PIE, giro: 0.6, luz: { color: brillo('#ffd24a', 0.55), alto: 12, ancho: 1 } },
  cartera: { escala: 1.6 * TALLA_A_PIE, giro: 0.4, luz: { color: brillo('#e0a060', 0.55), alto: 15, ancho: 1.2 } },
  /* El que más vale, el que más se ve: más alto, más ancho y casi blanco. */
  maletin: { escala: 2 * TALLA_A_PIE, giro: 0.3, luz: { color: brillo('#fff2b0', 1), alto: 30, ancho: 2.2 } },
  hierro: { escala: 1.6 * TALLA_A_PIE, giro: 0.4, luz: { color: brillo('#c8d6e6', 0.5), alto: 13, ancho: 1 } },
  pedernal: { escala: 1.6 * TALLA_A_PIE, giro: 0.45, luz: { color: brillo('#ffae66', 0.5), alto: 13, ancho: 1 } },
  cuero: { escala: 1.6 * TALLA_A_PIE, giro: 0.4, luz: { color: brillo('#e6b884', 0.5), alto: 13, ancho: 1 } },
  junco: { escala: 1.6 * TALLA_A_PIE, giro: 0.35, luz: { color: brillo('#a6ea78', 0.5), alto: 13, ancho: 1 } },
  escudo: { escala: 1.75 * TALLA_A_PIE, giro: 0.35, luz: { color: brillo('#86b6ff', 0.65), alto: 16, ancho: 1.3 } },
  desconocida: { escala: 1.6 * TALLA_A_PIE, giro: 0.3, luz: { color: brillo('#ffffff', 0.4), alto: 10, ancho: 1 } },
};

export function piezaDe(aspecto: AspectoDeHallazgo): PiezaDeHallazgo {
  return PIEZAS[aspecto];
}

/* ─── Fundir primitivas en una geometría con el color en el vértice ─────── */

/** Una primitiva ya colocada, con su color: uno fijo, o un gris que depende de dónde cae el vértice. */
interface Parte {
  readonly geo: THREE.BufferGeometry;
  readonly color: THREE.Color | ((x: number, y: number, z: number) => number);
}

/**
 * Funde las partes en UNA geometría sin índices, con `position`, `normal` y `color`. Con `plana`,
 * cada triángulo lleva su normal (caras planas). Las partes se sueltan: son de usar y tirar.
 */
function fundir(partes: readonly Parte[], plana: boolean): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  for (const p of partes) {
    const g = p.geo.index === null ? p.geo : p.geo.toNonIndexed();
    if (plana || g.getAttribute('normal') === undefined) g.computeVertexNormals();
    const P = g.getAttribute('position');
    const N = g.getAttribute('normal');
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i);
      const y = P.getY(i);
      const z = P.getZ(i);
      pos.push(x, y, z);
      nor.push(N.getX(i), N.getY(i), N.getZ(i));
      if (p.color instanceof THREE.Color) col.push(p.color.r, p.color.g, p.color.b);
      else {
        const k = p.color(x, y, z);
        col.push(k, k, k);
      }
    }
    if (g !== p.geo) g.dispose();
    p.geo.dispose();
  }
  const salida = new THREE.BufferGeometry();
  salida.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  salida.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  salida.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  salida.computeBoundingSphere();
  return salida;
}

const c = (hex: string): THREE.Color => new THREE.Color(hex);

/** Una primitiva movida a su sitio. */
function en<G extends THREE.BufferGeometry>(g: G, x: number, y: number, z: number): G {
  g.translate(x, y, z);
  return g;
}

/** EL ESCUDO HERÁLDICO: el de punta, recto arriba y en curva hasta la punta de abajo. */
function formaDelEscudo(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-0.3, 0.3);
  s.lineTo(0.3, 0.3);
  s.lineTo(0.3, 0);
  s.quadraticCurveTo(0.3, -0.25, 0, -0.42);
  s.quadraticCurveTo(-0.3, -0.25, -0.3, 0);
  s.closePath();
  return s;
}

/**
 * LA GEOMETRÍA DE UNA CLASE, centrada en su origen, «arriba» en `+y`, y de medio metro largo: una
 * persona mide dos y media (`ALTURA_DE_UNA_PERSONA`). Nueva en cada llamada: quien la pide la suelta.
 */
export function geometriaDe(aspecto: AspectoDeHallazgo): THREE.BufferGeometry {
  switch (aspecto) {
    case 'propina': {
      /* Una moneda de canto, que al girar enseña la cara: el disco y su relieve. */
      const oro = c('#e8b923');
      return fundir(
        [
          { geo: new THREE.CylinderGeometry(0.32, 0.32, 0.07, 20).rotateX(Math.PI / 2), color: oro },
          { geo: new THREE.CylinderGeometry(0.21, 0.21, 0.1, 20).rotateX(Math.PI / 2), color: c('#f7d95e') },
        ],
        true,
      );
    }
    case 'cartera': {
      return fundir(
        [
          { geo: new THREE.BoxGeometry(0.56, 0.38, 0.12), color: c('#7a4a26') },
          { geo: en(new THREE.BoxGeometry(0.57, 0.14, 0.13), 0, 0.12, 0), color: c('#5a3218') },
          { geo: en(new THREE.BoxGeometry(0.06, 0.06, 0.15), 0, 0.05, 0), color: c('#d9b44a') },
        ],
        true,
      );
    }
    case 'maletin': {
      const laton = c('#d4ab3c');
      return fundir(
        [
          { geo: new THREE.BoxGeometry(0.8, 0.56, 0.2), color: c('#24242c') },
          { geo: new THREE.BoxGeometry(0.82, 0.05, 0.21), color: c('#3c3c4a') },
          { geo: en(new THREE.TorusGeometry(0.13, 0.03, 6, 12, Math.PI), 0, 0.28, 0), color: laton },
          { geo: en(new THREE.BoxGeometry(0.08, 0.06, 0.22), -0.22, 0.2, 0), color: laton },
          { geo: en(new THREE.BoxGeometry(0.08, 0.06, 0.22), 0.22, 0.2, 0), color: laton },
        ],
        true,
      );
    }
    case 'hierro': {
      /* Un lingote: un tronco de pirámide de cuatro caras, estirado. */
      const lingote = new THREE.CylinderGeometry(0.15, 0.22, 0.18, 4).rotateY(Math.PI / 4).scale(1.9, 1, 1);
      return fundir(
        [
          { geo: lingote, color: c('#8d949c') },
          { geo: en(new THREE.CylinderGeometry(0.15, 0.22, 0.18, 4).rotateY(Math.PI / 4).scale(1.9, 1, 1), 0, 0.19, 0), color: c('#a4abb3') },
        ],
        true,
      );
    }
    case 'pedernal': {
      return fundir(
        [
          { geo: new THREE.IcosahedronGeometry(0.26, 0).scale(1, 0.75, 1.25), color: c('#3b3a42') },
          { geo: en(new THREE.OctahedronGeometry(0.11, 0), 0.13, 0.1, 0.12), color: c('#6d6a78') },
        ],
        true,
      );
    }
    case 'cuero': {
      /* Un rollo de cuero tumbado, con dos correas. */
      const correa = c('#7a5230');
      return fundir(
        [
          { geo: new THREE.CylinderGeometry(0.15, 0.15, 0.56, 10).rotateZ(Math.PI / 2), color: c('#c49a6c') },
          { geo: en(new THREE.CylinderGeometry(0.165, 0.165, 0.06, 10).rotateZ(Math.PI / 2), -0.15, 0, 0), color: correa },
          { geo: en(new THREE.CylinderGeometry(0.165, 0.165, 0.06, 10).rotateZ(Math.PI / 2), 0.15, 0, 0), color: correa },
        ],
        true,
      );
    }
    case 'junco': {
      /* Un haz de juncos de pie, atado por la cintura. */
      const partes: Parte[] = [];
      const verdes = [c('#6fa84a'), c('#86c060')];
      partes.push({ geo: new THREE.CylinderGeometry(0.035, 0.03, 0.85, 5), color: verdes[0] as THREE.Color });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        partes.push({
          geo: en(new THREE.CylinderGeometry(0.035, 0.03, 0.8 - (i % 2) * 0.08, 5), Math.cos(a) * 0.075, 0, Math.sin(a) * 0.075),
          color: verdes[i % 2] as THREE.Color,
        });
      }
      partes.push({ geo: new THREE.CylinderGeometry(0.125, 0.125, 0.07, 8), color: c('#c8a860') });
      return fundir(partes, true);
    }
    case 'escudo': {
      /* Azur, una cruz de oro. */
      const oro = c('#e2b93b');
      const cuerpo = new THREE.ExtrudeGeometry(formaDelEscudo(), { depth: 0.06, bevelEnabled: false, curveSegments: 6 });
      cuerpo.translate(0, 0, -0.03);
      return fundir(
        [
          { geo: cuerpo, color: c('#2f5fae') },
          { geo: en(new THREE.BoxGeometry(0.08, 0.55, 0.02), 0, -0.02, 0.04), color: oro },
          { geo: en(new THREE.BoxGeometry(0.46, 0.08, 0.02), 0, 0.1, 0.04), color: oro },
          { geo: en(new THREE.BoxGeometry(0.08, 0.55, 0.02), 0, -0.02, -0.04), color: oro },
          { geo: en(new THREE.BoxGeometry(0.46, 0.08, 0.02), 0, 0.1, -0.04), color: oro },
        ],
        true,
      );
    }
    case 'desconocida':
      return fundir([{ geo: new THREE.SphereGeometry(0.22, 10, 8), color: c('#b8b8b8') }], true);
  }
}

/**
 * LA GEOMETRÍA DE LA LUZ, de alto y ancho 1: una columna abierta que se apaga hacia arriba y un halo
 * en el suelo que se apaga hacia fuera. El brillo va en el color del vértice —en mezcla aditiva el
 * negro no pinta— y el color de cada brote, en la instancia.
 */
export function geometriaDeLaLuz(): THREE.BufferGeometry {
  const columna = new THREE.CylinderGeometry(0.22, 0.4, 1, 10, 1, true).translate(0, 0.5, 0);
  /* Casi a ras: la instancia estira la altura por el alto de la columna, y esto también. */
  const halo = new THREE.RingGeometry(0.4, 1.2, 20, 1).rotateX(-Math.PI / 2).translate(0, 0.005, 0);
  return fundir(
    [
      { geo: columna, color: (_x, y) => (1 - Math.min(1, Math.max(0, y))) ** 2 },
      { geo: halo, color: (x, _y, z) => 1 - Math.min(1, Math.max(0, (Math.hypot(x, z) - 0.4) / 0.8)) },
    ],
    false,
  );
}
