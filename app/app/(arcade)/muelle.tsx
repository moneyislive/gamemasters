/**
 * EL MUELLE: la pantalla previa a la partida, para los arcades con lobby en tres
 * dimensiones. `/muelle?arcade=riberas`.
 *
 * No es un mueble. Las otras cuatro rutas de este grupo son superficies donde se
 * pinta un juego; ésta es lo que hay ANTES de que el juego empiece —elegir
 * aventurero, compartir el código, ver llegar a los demás— y al zarpar navega
 * ella al mueble que diga el manifiesto. Quién tiene Muelle lo dice
 * `escenas/embarcadero/tema.ts`; la decisión y su porqué están en
 * `docs/EL-MUELLE.md` y en `rutaDeArcade` de `app/src/arcade/muebles.ts`.
 *
 * El cuerpo vive en `app/src/arcade/muelle.tsx`, que trae el lienzo de tres
 * dimensiones sólo cuando alguien llega aquí.
 */
import { ElMuelle } from '../../src/arcade/muelle';

export default function Muelle(): JSX.Element {
  return <ElMuelle />;
}
