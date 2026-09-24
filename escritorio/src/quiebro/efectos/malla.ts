/**
 * UNA PIEZA DE EFECTOS COMO MALLA: geometría instanciada + material de su familia + sus atributos.
 *
 * Todas las piezas se montan igual y se apagan igual, y así se escribe una vez:
 *
 *   · la malla no se poda por frustum (`frustumCulled = false`): sus vértices los pone el
 *     sombreador, y la esfera de la geometría base —un cuadro de un metro en el origen— no dice
 *     nada de dónde acaban. Podarla con esa esfera es el fallo de «el testigo se poda por frustum»
 *     que esta casa ya tiene apuntado;
 *   · con cero instancias vivas, `visible = false`: three no hace la llamada con `instanceCount`
 *     a cero, pero sí enlaza el programa y sube los uniformes, y eso en N0 también cuenta;
 *   · el orden de pintado va escrito (`renderOrder`): las transparentes de los efectos después de
 *     la ciudad, y el anillo el último.
 */
import * as THREE from 'three';
import type { Pieza } from './presupuesto';
import { capacidadDe, renglonDe } from './presupuesto';
import { atributoPorInstancia, geometriaDeLaPieza, instanciada } from './geometrias';
import type { OpcionesDelMaterial } from './materiales';
import { materialDe } from './materiales';

export interface MallaDeEfecto<A extends string> {
  readonly malla: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>;
  readonly geometria: THREE.InstancedBufferGeometry;
  readonly material: THREE.ShaderMaterial;
  readonly atributos: Readonly<Record<A, THREE.InstancedBufferAttribute>>;
  readonly capacidad: number;
  /** Deja `cuantas` instancias en el dibujo y apaga la malla si no hay ninguna. */
  pintar(cuantas: number): void;
  /** Suelta la geometría y el material (el atlas es de todos: lo suelta la raíz). */
  soltar(): void;
}

/** Orden de pintado por pieza: lo lejano primero, la señal de juego al final. */
const ORDEN: Readonly<Record<Pieza, number>> = {
  cielo: 1,
  pantallas: 2,
  muro: 3,
  siluetas: 4,
  hilos: 5,
  esquirlas: 0,
  chispas: 6,
  ondas: 7,
  trazos: 8,
  anillos: 20,
  marco: 21,
};

/**
 * Monta la malla de una pieza. `atributos` dice el nombre y los componentes de cada atributo por
 * instancia; `datos`, si se da, pone los arrays del sistema debajo de los que se nombren.
 */
export function mallaDeEfecto<A extends string>(
  pieza: Pieza,
  atributos: Readonly<Record<A, number>>,
  opciones: OpcionesDelMaterial & { datos?: Partial<Record<A, Float32Array>> } = {},
): MallaDeEfecto<A> {
  const familia = renglonDe(pieza).familia;
  const capacidad = capacidadDe(pieza);
  const base = geometriaDeLaPieza(pieza);
  const geometria = instanciada(base);
  const creados = {} as Record<A, THREE.InstancedBufferAttribute>;
  for (const nombre of Object.keys(atributos) as A[]) {
    creados[nombre] = atributoPorInstancia(geometria, nombre, capacidad, atributos[nombre], opciones.datos?.[nombre]);
  }
  const material = materialDe(familia, opciones);
  const malla = new THREE.Mesh(geometria, material);
  malla.frustumCulled = false;
  malla.visible = false;
  malla.renderOrder = ORDEN[pieza];
  malla.name = `efectos-${pieza}`;
  return {
    malla,
    geometria,
    material,
    atributos: creados,
    capacidad,
    pintar(cuantas) {
      const n = Math.max(0, Math.min(capacidad, cuantas));
      geometria.instanceCount = n;
      malla.visible = n > 0;
    },
    soltar() {
      geometria.dispose();
      base.dispose();
      material.dispose();
    },
  };
}

/**
 * Píxeles del búfer por metro a un metro de la cámara en este fotograma. Para cámaras que no son
 * de perspectiva (la del Vigía podría serlo algún día) se usa el campo del móvil.
 */
export function pxPorMetroDeLaCamara(camara: THREE.Camera, altoCss: number, densidad: number): number {
  const fov = camara instanceof THREE.PerspectiveCamera ? camara.fov : 75;
  return (altoCss * densidad) / (2 * Math.tan((fov * Math.PI) / 360));
}
