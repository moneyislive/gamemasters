/**
 * CÓMO SE PIDEN LOS BYTES DE UN MODELO, y por qué es UN fichero y no una línea
 * dentro de cada pantalla que pinta en tres dimensiones.
 *
 * ═══ UNA FUNCIÓN PARA TODA LA APP ES UNA CACHÉ PARA TODA LA APP ═══
 *
 * `cargadorPara` de la escena del embarcadero cachea un cargador POR FUNCIÓN
 * `traer`: si la función fuera una por instancia de pantalla, cada visita al
 * Muelle desde la portada estrenaría un cargador y volvería a bajar el
 * embarcadero (1,7 MB), las animaciones y las figuras — y en nativo `fetch` no
 * tiene caché de disco de serie. Por eso nació a nivel de módulo en
 * `muelle-escena.tsx`.
 *
 * Y por eso se muda aquí: desde que el tablero de Riberas también se pinta en
 * tres dimensiones hay DOS pantallas que piden modelos al mismo servidor por la
 * misma ruta. Con una copia de esta función en cada una habría dos cachés que no
 * se conocen, y —peor— dos sitios donde acordarse de esperar a la sesión
 * guardada. La primera vez que una de las dos se olvide, pedirá el modelo al
 * servidor compilado por defecto y no al elegido en los ajustes.
 *
 * ═══ POR QUÉ ESPERA A `cargarSesionGuardada()` ═══
 *
 * Es la misma carrera que cuenta `mesa.ts`: `servidorActual()` devuelve el
 * COMPILADO POR DEFECTO hasta que la app ha leído del disco la dirección elegida,
 * y esa lectura es asíncrona. Un efecto que corre al montar llega antes, así que
 * sin esta línea el primer modelo se pediría a la dirección equivocada; en la web
 * el defecto es `location.origin`, que contesta 200 con la página de la app, y un
 * 200 con HTML dentro no es un fallo de red: es un modelo que no se abre y nadie
 * sabe por qué.
 *
 * No depende de nada de ninguna pantalla: la dirección del servidor y la lectura
 * de la sesión guardada son globales de `api.ts`. Es la única razón por la que
 * puede vivir fuera de las dos.
 */
import type { Traer } from '../../../escenas/embarcadero/tipos';
import { cargarSesionGuardada, servidorActual } from '../api';

export const traer: Traer = async (ruta) => {
  await cargarSesionGuardada();
  const r = await fetch(`${servidorActual()}${ruta}`);
  if (!r.ok) throw new Error(`el servidor contestó ${String(r.status)} al pedir ${ruta}`);
  return r.arrayBuffer();
};
