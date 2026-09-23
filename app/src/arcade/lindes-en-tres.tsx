/**
 * LAS LINDES EN TRES DIMENSIONES, POR FUERA: la envoltura perezosa de `lindes-en-tres-escena.tsx`.
 *
 * Todo lo que toca `three`, la escena del valle y los modelos vive en la escena. Por qué
 * entra con `React.lazy`, por qué la llamada va en el ámbito del módulo y por qué la espera
 * es gris lo cuenta `pantalla-perezosa.tsx`, que es la misma para los tres juegos: aquí sólo
 * queda lo que es de Las Lindes, que es qué se trae y qué se lee mientras llega.
 */
import { pantallaPerezosa } from './pantalla-perezosa';

export const LasLindesEnTres = pantallaPerezosa(() => import('./lindes-en-tres-escena'), {
  rotulo: 'LAS LINDES',
  texto: 'Preparando el valle…',
});
