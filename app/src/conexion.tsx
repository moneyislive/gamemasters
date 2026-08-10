/**
 * La franja de «no hay conexión».
 *
 * EL PROBLEMA QUE RESUELVE. El estado de error de la partida existía desde
 * siempre, pero solo lo pintaba una pantalla —la de la ronda— y solo cuando
 * todavía no había datos que enseñar. Con la partida ya cargada, que se cayera
 * la wifi no se notaba en ninguna parte: la pantalla seguía enseñando la ronda
 * anterior, con su reloj bajando, mientras en la mesa ya se había cerrado. La
 * app mentía sin querer, que es la peor forma de mentir.
 *
 * Va montada arriba del todo, junto al telón de avisos, para que se vea en
 * todas las pantallas sin que cada una tenga que acordarse. Discreta y
 * persistente: no tapa nada, pero no se va hasta que vuelve la conexión.
 */
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePartida } from './estado';
import { color, espacio, texto } from './tema';

export function FranjaDeConexion(): JSX.Element | null {
  const { error, vista } = usePartida();
  const insets = useSafeAreaInsets();

  // Sin vista no hace falta: la propia pantalla ya está contando lo que pasa,
  // y dos mensajes del mismo problema es ruido.
  if (!error || !vista) return null;

  return (
    <Animated.View
      entering={FadeInUp.duration(260)}
      exiting={FadeOut.duration(200)}
      pointerEvents="none"
      style={[estilos.franja, { top: insets.top + espacio.sm }]}
    >
      <Text style={[texto.microCaps, estilos.texto]} numberOfLines={2}>
        {error}
      </Text>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
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
