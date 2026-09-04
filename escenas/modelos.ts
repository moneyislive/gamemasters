/**
 * EL CATÁLOGO DE MODELOS: buscar por nombre dentro de una escena ya cargada.
 *
 * ═══ QUIÉN CARGA EL FICHERO, Y POR QUÉ NO ES ESTE MÓDULO ═══
 *
 * El `.glb` lo carga CADA CLIENTE a su manera, y no es capricho: en el navegador
 * se pide por su dirección y en el móvil hay que pasar por el sistema de recursos
 * de Expo, que resuelve el fichero de otra forma según se compile para desarrollo
 * o para la tienda. Un cargador aquí dentro tendría que saber en qué plataforma
 * está, que es exactamente lo que `escenas/` existe para no saber.
 *
 * Así que aquí entra el resultado —un `Object3D` ya cargado— y sale un catálogo.
 * Es la misma frontera que la del `Canvas`: la plataforma se queda fuera.
 *
 * ═══ LOS NOMBRES NO ESTÁN AQUÍ ═══
 *
 * Están en `nombres.ts`, que no importa `three`. Son dato, y el dato se comprueba:
 * `verify:escena` contrasta esa tabla contra los nodos del `.glb` de verdad sin
 * arrastrar el motor de dibujo. Se reexportan desde aquí para que quien pinte no
 * tenga que importar de dos sitios.
 */
import * as THREE from 'three';

export {
  COLORES_DE_JUGADOR,
  MODELO,
  PIEZAS_DE_COLOR,
  NOMBRE_QUE_SOBREVIVE,
  modeloDeBandera,
  modeloDeBien,
  modeloDeBarco,
  modeloDeMuelle,
  modeloDePieza,
  modeloDeTorre,
  modeloDeTorreon,
  todosLosNombres,
} from './nombres';

/** Un catálogo listo para usar: nombre → el modelo original, que no se toca. */
export type CatalogoDeModelos = ReadonlyMap<string, THREE.Object3D>;

/**
 * Construye el catálogo a partir de la raíz del `.glb` ya cargado.
 *
 * Se queda con los hijos DIRECTOS de la escena, que es como los dejó
 * `compilar-modelos.ts`: un nodo por pieza, con su nombre.
 */
export function catalogoDeModelos(raiz: THREE.Object3D): CatalogoDeModelos {
  const catalogo = new Map<string, THREE.Object3D>();
  for (const hijo of raiz.children) {
    if (hijo.name.length > 0) catalogo.set(hijo.name, hijo);
  }
  return catalogo;
}

/**
 * LA ALTURA REAL DE UN MODELO, medida sobre su geometría.
 *
 * `Box3.setFromObject` recorre las mallas de verdad, así que da la altura del
 * objeto y no la del nodo — que en estos modelos es siempre cero, porque la
 * geometría cuelga de un hijo. Vive aquí y no en `escala.ts` a propósito: `escala`
 * es aritmética y no importa `three`, para que la pueda leer un comprobador de
 * Node sin abrir un contexto de dibujo.
 */
export function alturaDe(modelo: THREE.Object3D): number {
  const caja = new THREE.Box3().setFromObject(modelo);
  return caja.max.y - caja.min.y;
}
