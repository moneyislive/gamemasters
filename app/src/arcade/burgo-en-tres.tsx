/**
 * EL BURGO EN TRES DIMENSIONES, POR FUERA: la envoltura perezosa de `burgo-en-tres-escena.tsx`.
 *
 * Todo lo que toca `three`, la escena del anillo y los modelos vive en la escena. Por qué
 * entra con `React.lazy`, por qué la llamada va en el ámbito del módulo y por qué la espera
 * es gris lo cuenta `pantalla-perezosa.tsx`, que es la misma para los tres juegos: aquí sólo
 * queda lo que es del Burgo, que es qué se trae y qué se lee mientras llega.
 *
 * ═══ ESTO ES UN PINTOR PROPIO SOBRE UN MUEBLE GENÉRICO, Y ES LEGÍTIMO ═══
 *
 * El Burgo sigue con `mueble: 'tablero'`, su vista no cambia y el `Retablo` SVG
 * sigue siendo lo que pinta un arcade de fuera con tablero — y lo que pinta esta
 * misma pantalla si el modelo no llega. Lo que cambia es la fila de
 * `LOS_QUE_PINTA`: el mismo precedente que La Frente sobre `formulario` y que
 * Riberas sobre `tablero`, que `quienPinta` protege a propósito.
 */
import { pantallaPerezosa } from './pantalla-perezosa';

export const ElBurgoEnTres = pantallaPerezosa(() => import('./burgo-en-tres-escena'), {
  rotulo: 'EL BURGO',
  texto: 'Preparando el burgo…',
});
