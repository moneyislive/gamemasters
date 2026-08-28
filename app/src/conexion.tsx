/**
 * La franja de «no hay conexión».
 *
 * EL PROBLEMA QUE RESUELVE. Si se cae la wifi con la partida ya cargada, la
 * pantalla sigue enseñando la ronda anterior con su reloj bajando mientras en
 * la mesa ya se ha cerrado. La app miente sin querer, que es la peor forma de
 * mentir. Va arriba del todo para que se vea en todas las pantallas sin que
 * cada una tenga que acordarse.
 *
 * SOLO HABLA DE LA RED, Y ESA ES LA DECISIÓN. Antes pintaba cualquier problema,
 * incluidos los de UNA partida —tu sesión caducó, te sacaron, la velada se
 * cerró—, y eso está mal por dos motivos:
 *
 *  · MIENTE SOBRE EL ALCANCE. Se pueden perder los hilos de una velada y seguir
 *    teniendo los de las demás. Una franja a lo ancho de la app dice «esto no
 *    va», cuando lo que no va es una partida concreta.
 *  · NO SE PUEDE ARREGLAR MIRÁNDOLA. Que tu sesión haya caducado se resuelve
 *    volviendo a entrar, y eso se hace en el panel de partidas. Un aviso que no
 *    lleva a ninguna parte solo estorba.
 *
 * Así que lo de una partida se cuelga de SU FILA en el panel, y aquí queda solo
 * lo que de verdad afecta a todo: que no se llega al servidor. Y mientras dura,
 * ni un segundo más — cualquier respuesta del servidor, incluido un 204 de «no
 * hay novedad», la retira.
 */
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePartida } from './estado';
import { espacio, texto } from './tema';

export function FranjaDeConexion(): JSX.Element | null {
  const { sinRed, vista } = usePartida();
  const insets = useSafeAreaInsets();

  // Sin vista no hace falta: la propia pantalla ya está contando lo que pasa,
  // y dos mensajes del mismo problema es ruido.
  if (!sinRed || !vista) return null;

  return (
    <Animated.View
      entering={FadeInUp.duration(260)}
      exiting={FadeOut.duration(200)}
      pointerEvents="none"
      style={[estilos.franja, { top: insets.top + espacio.sm }]}
    >
      <Text style={[texto.microCaps, estilos.texto]} numberOfLines={2}>
        Sin conexión. Reintentando…
      </Text>
    </Animated.View>
  );
}

/**
 * El aviso de ESTA partida, dentro de la partida.
 *
 * Va aparte de la franja de arriba y no se le parece en nada: no flota sobre
 * la app, va DENTRO de la pantalla del juego y se mueve con ella. Eso es lo que
 * lo hace honesto — no dice «la app no va», dice «esta velada tiene un
 * problema», y quien lo lee ya está mirando la velada de la que habla.
 *
 * HACE FALTA AUNQUE EL PANEL YA LO ENSEÑE. En el panel es donde se ARREGLA
 * —cada mesa con su botón de volver a entrar—, pero ahí solo lo ve quien se
 * asome. Cuando una sesión caduca a media velada, la pantalla se queda con la
 * ronda anterior congelada y su reloj bajando: sin este aviso no hay ni un
 * motivo para ir a mirar el panel. Se entera uno aquí y lo resuelve allí.
 *
 * SOLO CON VISTA DELANTE. Sin vista, la pantalla ya dedica su hueco entero a
 * contar lo que pasa, y repetirlo encima sería decir dos veces lo mismo.
 */
export function AvisoDeLaPartida(): JSX.Element | null {
  const { avisoDePartida, vista } = usePartida();
  if (!avisoDePartida || !vista) return null;

  return (
    <Animated.View entering={FadeInUp.duration(260)} exiting={FadeOut.duration(200)}>
      <View style={estilos.deLaPartida}>
        <Text style={[texto.cuerpo, estilos.textoDeLaPartida]}>{avisoDePartida.texto}</Text>
      </View>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  /*
   * Discreto a proposito, y ambar en vez de rojo: casi siempre se arregla
   * volviendo a entrar, asi que no es una alarma sino un dato.
   */
  deLaPartida: {
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(232,207,127,0.75)',
    borderRadius: 4,
    backgroundColor: 'rgba(232,207,127,0.10)',
    paddingHorizontal: espacio.md,
    paddingVertical: 8,
    marginBottom: espacio.md,
  },
  textoDeLaPartida: { color: '#e8cf7f', fontSize: 13.5, lineHeight: 19 },

  franja: {
    position: 'absolute',
    left: espacio.lg,
    right: espacio.lg,
    zIndex: 20,
    borderWidth: 1,
    borderRadius: 999,
    borderColor: 'rgba(232,160,160,0.5)',
    backgroundColor: 'rgba(31,18,12,0.94)',
    paddingHorizontal: espacio.md,
    paddingVertical: 7,
  },
  texto: { color: '#f0c9c0', textAlign: 'center' },
});
