/**
 * EL MUEBLE `tablero`: una topología declarada, pintada con SVG.
 *
 * Igual que `/formulario` y `/lienzo`: la ruta es del MUEBLE y el juego viaja como
 * parámetro —`/tablero?arcade=riberas`—, porque un mueble sirve a muchos juegos y
 * con una ruta por juego cada arcade nuevo obligaría a publicar una versión de la
 * app en dos tiendas.
 *
 * Hasta la fase 4 esta ruta enseñaba `MueblePendiente`, que decía la verdad —qué
 * mueble faltaba y qué juego lo traería— en vez de quedarse en blanco. Ya no hace
 * falta: Riberas lo estrena, y el cuerpo pasa a ser el mismo que el de los otros
 * dos muebles que se pintan.
 *
 * Ese cuerpo vive en `app/src/arcade/pintar.tsx` y comprueba las tres cosas de
 * siempre: que el arcade exista, que su mueble sea éste y que este binario sepa
 * pintarlo. Escrito dentro de cada ruta, ese «comprobar tres cosas» se copia, y a
 * la tercera copia una de ellas se queda atrás.
 */
import { PintarEnElMueble } from '../../src/arcade/pintar';

export default function Mueble(): JSX.Element {
  return <PintarEnElMueble mueble="tablero" />;
}
