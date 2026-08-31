/**
 * EL MUEBLE `lienzo`: dos dimensiones a ritmo de fotograma, con Skia.
 *
 * Ya no es la pantalla de «esto todavía no existe». Lo estrena «El Arcade», el
 * juego de la fase 3: sesenta pasos por segundo, un jugador y una cifra que el
 * servidor comprueba reejecutando la partida.
 *
 * El cuerpo es el mismo que el de los otros muebles y vive en
 * `app/src/arcade/pintar.tsx`: leer qué juego pide la ruta, comprobar que este es
 * su mueble y que el binario sabe pintarlo, y pintarlo. Lo que cambia entre las
 * cuatro rutas del grupo es una palabra.
 */
import { PintarEnElMueble } from '../../src/arcade/pintar';

export default function Lienzo(): JSX.Element {
  return <PintarEnElMueble mueble="lienzo" />;
}
