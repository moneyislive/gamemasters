/**
 * LAS RODAJAS DE LAS PIEZAS DE UN CATÁLOGO: lo que `estorbos.ts` necesita saber de cada modelo, medido
 * en el propio modelo que se pinta.
 *
 * ═══ POR QUÉ SE MIDE AQUÍ Y NO SE ESCRIBE EN UNA TABLA ═══
 *
 * Porque la pieza que estorba es la que se VE, y la que se ve es la del `.glb` que ha llegado. Una
 * tabla de medidas escrita a mano se quedaría vieja con el primer cambio del pack sin que nada
 * fallara; medirla al cargar no. Cada pieza se mide una vez, la primera que se pregunta por ella,
 * y en los ejes del nodo raíz del modelo: los mismos en los que la escena la instancia (`aplana`
 * del embarcadero hace la misma cuenta para fundirla).
 *
 * Es lo único del paseo que sabe de `three`, y sólo lee: no clona nada ni toca el modelo.
 */
import * as THREE from 'three';
import { rodajasDeUnaMalla } from './estorbos';
import type { Estorbo } from './estorbos';

/** Un catálogo de modelos por nombre, como lo dan `catalogoDeModelos` y el del Burgo. */
export type CatalogoParaMedir = ReadonlyMap<string, THREE.Object3D>;

/** Las rodajas de un modelo en los ejes de su raíz, malla a malla. */
export function rodajasDelModelo(modelo: THREE.Object3D): Estorbo[] {
  modelo.updateWorldMatrix(true, true);
  const aLaRaiz = new THREE.Matrix4().copy(modelo.matrixWorld).invert();
  const m = new THREE.Matrix4();
  const v = new THREE.Vector3();
  const salida: Estorbo[] = [];
  modelo.traverse((n) => {
    const malla = n as THREE.Mesh;
    if (malla.isMesh !== true) return;
    const pos = malla.geometry.getAttribute('position');
    if (pos === undefined) return;
    m.copy(aLaRaiz).multiply(malla.matrixWorld);
    const posiciones = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m);
      posiciones[i * 3] = v.x;
      posiciones[i * 3 + 1] = v.y;
      posiciones[i * 3 + 2] = v.z;
    }
    const indice = malla.geometry.getIndex();
    for (const r of rodajasDeUnaMalla(posiciones, indice === null ? null : indice.array)) salida.push(r);
  });
  return salida;
}

/**
 * LO QUE PIDE `estorbosDePiezas`: las rodajas de una pieza por su nombre, o `null` si el catálogo no
 * la tiene (y entonces no estorba). Recuerda lo medido.
 */
export function rodajasDelCatalogo(catalogo: CatalogoParaMedir): (pieza: string) => readonly Estorbo[] | null {
  const medidas = new Map<string, readonly Estorbo[] | null>();
  return (pieza) => {
    const hecha = medidas.get(pieza);
    if (hecha !== undefined) return hecha;
    const modelo = catalogo.get(pieza);
    const rodajas = modelo === undefined ? null : rodajasDelModelo(modelo);
    medidas.set(pieza, rodajas);
    return rodajas;
  };
}
