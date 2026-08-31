/**
 * ¿ESTÁ SKIA LISTO? — LA VERSIÓN NATIVA, QUE ES LA QUE NO TIENE QUE HACER NADA.
 *
 * En Android y en iOS, Skia viaja DENTRO del binario: son unos cuatro megabytes en
 * Android y seis en iOS, cobrados a todo el mundo —también a quien solo juega
 * veladas— y ése es el precio que el §7 del diseño dice que se paga en esta fase y
 * no antes. A cambio, cuando la app arranca, Skia ya está.
 *
 * En web no. Ahí Skia es CanvasKit, un binario de WebAssembly que hay que
 * descargar, y por eso existe el fichero de al lado —`skia.web.ts`— con la misma
 * firma. Metro escoge uno u otro por la extensión, que es el mismo reparto que ya
 * usa `src/tres/Lienzo.tsx` y `Lienzo.native.tsx` para el 3D.
 *
 * ═══ POR QUÉ HAY DOS FICHEROS Y NO UN `if (Platform.OS === 'web')` ═══
 *
 * Porque el `if` no evita la IMPORTACIÓN. `LoadSkiaWeb` arrastra el cargador de
 * Emscripten y el `.wasm` entero, y con una rama en tiempo de ejecución todo eso
 * entraría en el paquete de Android y de iOS para no ejecutarse nunca. Con dos
 * ficheros, el empaquetador ni siquiera ve el de al lado.
 *
 * La firma es idéntica a propósito: quien pinta llama a `usarCanvasKit()` y no se
 * entera de en qué plataforma está.
 */
import { useState } from 'react';

/**
 * ¿Se puede pintar ya?
 *
 * Aquí siempre que sí, y devuelve una constante en vez de un valor de estado
 * porque no hay nada que esperar. Se usa `useState` sin actualizador —y no una
 * constante suelta— para que el número y el orden de los hooks sea EL MISMO que
 * en la versión web: React se queja a gritos si dos renderizados del mismo
 * componente llaman a distintos hooks, y la única forma de que eso se descubra
 * aquí es que las dos versiones se parezcan.
 */
export function usarCanvasKit(): boolean {
  const [listo] = useState(true);
  return listo;
}
