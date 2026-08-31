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
 * los únicos que un arcade de FUERA puede usar». Hoy no lo es del todo, porque el
 * juego que se pinta sale de una tabla y no de preguntarle al propio juego qué se
 * puede hacer. Esa función existe en el diseño, se llama `opciones()` y llega con
 * Riberas en la fase 4: es CLIENTE y no autoridad, la misma que el mueble usa para
 * pintar y el reductor para validar, de modo que la regla se escribe una vez.
 * Escribirla hoy la dejaría con la forma de los dos juegos que hay, que es
 * exactamente el error que todo este motor existe para no repetir.
 */
import { PintarEnElMueble } from '../../src/arcade/pintar';

export default function Formulario(): JSX.Element {
  return <PintarEnElMueble mueble="formulario" />;
}
