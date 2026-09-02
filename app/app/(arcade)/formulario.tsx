/**
 * EL MUEBLE `formulario`: vistas normales, y el arcade que toque dentro.
 *
 * La ruta recibe el juego por parámetro —`/formulario?arcade=frente`— porque el
 * mueble es una superficie y no la pantalla de un juego. Ver `_layout.tsx`.
 *
 * ═══ LA TABLA DE JUEGOS YA NO ESTÁ AQUÍ, Y ESO ERA UN FALLO ═══
 *
 * Estaba, y decidía por su cuenta si este binario sabe pintar un arcade. Al lado,
 * `app/src/vitrina.ts` decidía lo mismo mirando otra cosa —si la app sabe pintar
 * el MUEBLE— y en cuanto entró el segundo arcade de formulario las dos respuestas
 * dejaron de coincidir: «La Ronda» salía en la Sala con tarjeta pulsable y al
 * tocarla aparecía «esta app todavía no sabe pintarlo». La portada tiene doctrina
 * escrita contra eso en su cabecera: nada de lo que se enseña es mentira.
 *
 * Ahora la tabla vive en `app/src/arcade/pintados.ts` y la leen los dos, y el
 * cuerpo de esta pantalla —que es igual para los cuatro muebles— vive en
 * `app/src/arcade/pintar.tsx`.
 *
 * ═══ LO QUE SIGUE SIENDO DEUDA, Y CONVIENE NO PERDERLO ═══
 *
 * `formulario` es un mueble GENÉRICO en el diseño: «los pinta la plataforma, y son
 * los únicos que un arcade de FUERA puede usar». Y ya lo es: `opciones()` entró en
 * el alta en la fase 5 —aquí ponía que llegaba «con Riberas en la fase 4», y no
 * fue así: Riberas se la resolvió por dentro y el hueco del contrato tardó una
 * fase más—, y desde entonces la plataforma le puede preguntar a cualquier arcade
 * qué se puede hacer sin saber a qué se juega.
 *
 * LO QUE SIGUE SIENDO DEUDA es lo otro: un vocabulario declarado de FORMAS con el
 * que pintar algo ENCIMA de los botones —un cronómetro, unas cartas, un
 * marcador—. Escribirlo hoy lo dejaría con la forma de los juegos que hay, que es
 * exactamente el error que todo este motor existe para no repetir.
 */
import { PintarEnElMueble } from '../../src/arcade/pintar';

export default function Formulario(): JSX.Element {
  return <PintarEnElMueble mueble="formulario" />;
}
