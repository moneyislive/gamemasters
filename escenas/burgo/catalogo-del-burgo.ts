/**
 * EL CATÁLOGO DE `burgo.glb`, UNA SOLA VEZ POR FUNCIÓN `traer`.
 *
 * ═══ POR QUÉ VIVE EN SU FICHERO Y NO DENTRO DE `Burgo.tsx` ═══
 *
 * Nació como una función privada de la escena del tablero, y mientras sólo la pedía el
 * tablero no hacía falta más. Pero el lobby del Burgo (la plaza) monta piezas del MISMO
 * fichero, y dos cachés del mismo `.glb` son 2,8 MB bajados y abiertos dos veces: una en la
 * plaza y otra al zarpar, justo en el momento en que la pantalla cambia. En el móvil no hay
 * caché de disco que lo disimule (`app/src/arcade/traer.ts`). Con la caché aquí, la plaza la
 * llena y el tablero la encuentra hecha.
 *
 * LA CLAVE ES LA FUNCIÓN `traer`, por identidad, igual que `cargadorPara` en
 * `escenas/embarcadero/cargar.ts`: cada cliente tiene UNA de módulo, y pasarle una lambda
 * nueva en cada render sería una caché nueva en cada render. Y EL FALLO NO SE QUEDA: si la
 * descarga o el análisis fallan, la entrada se borra para que el siguiente intento vuelva a
 * pedirlo en vez de heredar el rechazo para siempre.
 *
 * Sin `fetch`, sin DOM y sin `window`: los bytes entran por `traer`, que inyecta cada cliente
 * (`verify:burgo-escena` barre los imports de esta carpeta).
 */
import { abrirGlb } from '../embarcadero/cargar';
import type { Traer } from '../embarcadero/tipos';
import { catalogoDeModelos } from '../modelos';
import type { CatalogoDeModelos } from '../modelos';
import { rutaDelBurgo } from '../ruta-de-modelos';

const catalogosDelBurgo = new WeakMap<Traer, Promise<CatalogoDeModelos>>();

/** El catálogo de `burgo.glb`, una vez por función `traer`; el fallo no se queda en la caché. */
export function catalogoDelBurgoDe(traer: Traer): Promise<CatalogoDeModelos> {
  const hecho = catalogosDelBurgo.get(traer);
  if (hecho !== undefined) return hecho;
  const promesa = traer(rutaDelBurgo())
    .then((bytes) => abrirGlb(bytes))
    .then((gltf) => catalogoDeModelos(gltf.scene))
    .catch((fallo: unknown) => {
      catalogosDelBurgo.delete(traer);
      throw fallo instanceof Error ? fallo : new Error(String(fallo));
    });
  catalogosDelBurgo.set(traer, promesa);
  return promesa;
}
