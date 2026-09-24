/**
 * EL QUIEBRO, POR FUERA: la envoltura perezosa de `quiebro-en-tres-escena.tsx`.
 *
 * Por qué entra con `React.lazy`, por qué la llamada va en el ámbito del módulo y por qué la espera
 * es gris lo cuenta `pantalla-perezosa.tsx`, que es la misma para todos los juegos: aquí sólo queda lo
 * que es de El Quiebro, que es qué se trae y qué se lee mientras llega.
 *
 * Y aquí no pesa `three`, pesa el visor: la escena trae `react-native-webview` detrás (perezoso a su
 * vez, para que un binario sin el módulo nativo no se caiga al cargarla), y la portada, que es por
 * donde pasa `pintados.ts`, no tiene por qué cargar ninguna de las dos cosas.
 */
import { pantallaPerezosa } from './pantalla-perezosa';

export const ElQuiebroEnTres = pantallaPerezosa(() => import('./quiebro-en-tres-escena'), {
  rotulo: 'EL QUIEBRO',
  texto: 'Bajando a la ciudad…',
});
