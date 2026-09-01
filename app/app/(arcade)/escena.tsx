/**
 * EL MUEBLE `escena`: tres dimensiones, por la única puerta que hay.
 *
 * Igual que `/formulario`, `/tablero` y `/lienzo`: la ruta es del MUEBLE y el
 * juego viaja como parámetro —`/escena?arcade=peonza`—, porque un mueble sirve a
 * muchos juegos y con una ruta por juego cada arcade nuevo obligaría a publicar
 * una versión de la app en dos tiendas.
 *
 * Hasta la fase 5 esta ruta enseñaba `MueblePendiente`, que decía la verdad —qué
 * mueble faltaba y por qué— en vez de quedarse en blanco. Ya no hace falta: «La
 * Peonza» lo estrena, y el cuerpo pasa a ser el mismo que el de los otros tres.
 *
 * Lo que NO cambia con esto es el límite del §7: `escena` es un mueble PROPIO, o
 * sea que el juego pinta sus píxeles y tiene que estar en el binario. El enchufe
 * de esta misma fase alcanza a las reglas y no a los píxeles, así que un arcade de
 * fuera que declare este mueble sigue con la tarjeta apagada en la Sala. Está
 * razonado en `app/src/arcade/escena.tsx`.
 */
import { PintarEnElMueble } from '../../src/arcade/pintar';

export default function Mueble(): JSX.Element {
  return <PintarEnElMueble mueble="escena" />;
}
