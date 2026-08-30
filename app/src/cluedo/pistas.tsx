/**
 * Lo que encuentras en tu sala, mientras la ronda esta abierta.
 *
 * ═══ ESTE BLOQUE ESTABA DENTRO DE LA RONDA GENERICA ═══
 *
 * `app/(juego)/ronda.tsx` es la pantalla que se lleva cualquier juego que no
 * declare la suya, y llevaba dentro este apartado —«Lo que encuentras aqui»,
 * con la lista de pistas de tu sala— escrito a mano, leyendo un campo
 * `misPistas` que la plataforma mandaba a todo el mundo.
 *
 * O sea: un juego nuevo que se pareciera a CLUEDO en lo demas y por tanto no
 * escribiera pantalla propia heredaba un bloque de pistas que no tenia con que
 * llenar, y lo veria vacio para siempre sin que nada fallara.
 *
 * Ahora CLUEDO lo declara en `src/pantallas.ts` como el trozo que pone en el
 * hueco `ronda`, y la ronda generica solo sabe que hay un hueco.
 */
import Animated, { FadeInUp } from 'react-native-reanimated';
import { usePartida } from '../estado';
import { Cuerpo, Etiqueta, Marco, Ornamento, Seccion, color, espacio } from '../ui';
import { leerBloqueDePistas } from '../../../shared/mecanicas/pistas';

export function PistasDeLaRonda(): JSX.Element | null {
  const { vista } = usePartida();
  const misPistas = leerBloqueDePistas(vista?.estadoDelJuego)?.misPistas ?? [];
  if (misPistas.length === 0) return null;
  return (
    <>
      <Ornamento />
      <Seccion>Lo que encuentras aquí</Seccion>
      {misPistas.map((pista, i) => (
        <Animated.View key={pista.id} entering={FadeInUp.delay(120 * i).duration(520)}>
          <Marco tono="papel">
            <Etiqueta style={{ color: color.burdeos700 }}>{pista.lugarNombre}</Etiqueta>
            <Cuerpo style={{ color: color.caoba700, marginTop: espacio.sm }}>
              {pista.description}
            </Cuerpo>
          </Marco>
        </Animated.View>
      ))}
      <Cuerpo tenue style={{ fontStyle: 'italic', fontSize: 15 }}>
        Esto lo has visto tú y nadie más. Qué significa es cosa tuya, y contarlo o no también. Al
        cerrar la ronda se queda guardado en tus pistas.
      </Cuerpo>
    </>
  );
}
