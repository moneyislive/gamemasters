/**
 * LA CAPA LEJANA: el horizonte (el anillo de torres en la bruma, «en el infinito»: sigue a la cámara en planta) y
 * la ciudad lejana (cajas instanciadas de 380 a 880 m, detrás del cerco y de sus torres). Es lo de siempre, sacado
 * de `abierta.ts` sin cambiar nada; O3-LEJANO la rehace (formas, suelo, resplandor de sodio). Por eso el horizonte
 * conserva el `frustumCulled` de siempre (el de three, sí): sigue a la cámara y la rodea, así que nunca queda fuera.
 */
import * as THREE from 'three';
import { CAJAS_LEJANAS, crearElHorizonte, crearLaCiudadLejana } from '../anillo';
import { triangulosDe } from '../geometria';
import type { RenglonDeLaCiudad } from '../presupuesto';
import type { CapaDeLaCiudad, FabricaDeCapa } from '../capas';

/** Dónde empieza y acaba la ciudad lejana: pasadas las torres de detrás del cerco, y hasta el horizonte. */
export const LEJANA_DESDE = 380;
export const LEJANA_HASTA = 880;
/**
 * Cuántas cajas lejanas: la mitad que en el barrio. Allí la ciudad lejana empezaba a 190 m y llenaba la
 * primera imagen de la Bajada; aquí empieza a 380, detrás del cerco y de sus torres, casi toda en la niebla.
 */
export const CAJAS_LEJANAS_DE_LA_CIUDAD: readonly [number, number, number, number] = [CAJAS_LEJANAS[0] / 2, CAJAS_LEJANAS[1] / 2, CAJAS_LEJANAS[2] / 2, CAJAS_LEJANAS[3] / 2];

/** El renglón de una malla: sus triángulos (por sus instancias) y una llamada. */
function renglon(nombre: string, objeto: THREE.Mesh): RenglonDeLaCiudad {
  const t = triangulosDe(objeto.geometry) * (objeto instanceof THREE.InstancedMesh ? objeto.count : 1);
  return { nombre, llamadas: 1, triangulos: t, sombra: objeto.castShadow };
}

export const capaLejana: FabricaDeCapa = (c): CapaDeLaCiudad => {
  const horizonte = crearElHorizonte();
  horizonte.matrixAutoUpdate = false;
  c.suyo(horizonte.material as THREE.Material);
  const lejana = crearLaCiudadLejana(c.base.semilla, CAJAS_LEJANAS_DE_LA_CIUDAD[c.nivel], LEJANA_DESDE, LEJANA_HASTA);
  c.suyo(lejana.material as THREE.Material);
  const grupo = new THREE.Group();
  grupo.name = 'quiebro-capa-lejana';
  grupo.add(horizonte, lejana);
  const camara = new THREE.Vector3();
  return {
    nombre: 'horizonte',
    objeto: grupo,
    renglones: () => [renglon('horizonte', horizonte), renglon('ciudad lejana', lejana)],
    actualizar(cam: THREE.Camera): void {
      /* El horizonte está «en el infinito»: sigue a la cámara en planta. */
      cam.getWorldPosition(camara);
      horizonte.position.set(camara.x, 0, camara.z);
      horizonte.updateMatrix();
    },
    estorbo: 'fuera-de-la-ciudad',
    soltar(): void {
      horizonte.geometry.dispose();
      lejana.geometry.dispose();
    },
  };
};
