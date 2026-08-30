/**
 * La ruta de la pestaña «hechos»: quién la pinta lo dice el juego.
 *
 * ═══ ESTA PESTAÑA SE LLAMABA `tablon` ═══
 *
 * Y ya no lo era. El tablón era el sitio donde, al cerrar cada ronda, se
 * volcaban para todo el mundo las pistas de todas las salas que hubiera pisado
 * cualquiera; se quitó porque hacía que elegir bien la sala no sirviera de
 * nada. Lo que quedó es la mitad que sí es pública —la cronología y los hechos
 * establecidos—, que ya se titulaba «Los hechos» en la barra.
 *
 * El fichero entero era además la pantalla de CLUEDO viviendo entre las de la
 * plataforma. Se ha ido a `src/cluedo/hechos.tsx` y aquí queda el desvío, que
 * es lo único que de verdad es de la plataforma.
 */
import { Cargando, Cuerpo, Marco, Pantalla } from '../../src/ui';
import { usePartida } from '../../src/estado';
import { pantallaDe } from '../../src/pantallas';

export default function Hechos(): JSX.Element {
  const { vista } = usePartida();
  const Propia = pantallaDe(vista?.sesion.juego, 'hechos');
  if (Propia) return <Propia />;
  if (!vista) return <Pantalla><Cargando /></Pantalla>;
  /*
   * NO HAY PANTALLA GENÉRICA, y no es un olvido: «los hechos establecidos» no
   * significa lo mismo en dos juegos cualesquiera. Se llega aquí solo si un
   * juego declara la pestaña en su barra y no declara la pantalla, que es un
   * error suyo y se dice, en vez de enseñarle la de otro.
   */
  return (
    <Pantalla>
      <Marco>
        <Cuerpo tenue>Esta pestaña no es de este juego.</Cuerpo>
      </Marco>
    </Pantalla>
  );
}
