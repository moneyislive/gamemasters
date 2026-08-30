/**
 * La ruta de la pestaña «cuaderno»: quien la pinta lo dice el juego.
 *
 * El fichero entero era la pantalla de CLUEDO —pistas encontradas, objetos,
 * sospechosos— viviendo entre las pantallas de la plataforma. Se ha ido a
 * `src/cluedo/cuaderno.tsx` y aquí queda el desvío, que es lo único que de
 * verdad es de la plataforma: qué juego se está jugando y qué pantalla suya
 * toca.
 */
import { Cargando, Cuerpo, Marco, Pantalla } from '../../src/ui';
import { usePartida } from '../../src/estado';
import { pantallaDe } from '../../src/pantallas';

export default function Cuaderno(): JSX.Element {
  const { vista } = usePartida();
  const Propia = pantallaDe(vista?.sesion.juego, 'cuaderno');
  if (Propia) return <Propia />;
  if (!vista) return <Pantalla><Cargando /></Pantalla>;
  /*
   * NO HAY PANTALLA GENERICA, y no es un olvido: un cuaderno de investigación
   * no significa nada por sí solo. Se llega aquí solo si un juego declara la
   * pestaña en su barra y no declara la pantalla, que es un error suyo y se
   * dice en vez de enseñar la de otro.
   */
  return (
    <Pantalla>
      <Marco>
        <Cuerpo tenue>Esta pestaña no es de este juego.</Cuerpo>
      </Marco>
    </Pantalla>
  );
}
