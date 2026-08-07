/**
 * El acceso al Mayordomo: una pastilla flotante, siempre a un dedo.
 *
 * Estaba al final del scroll de una sola pantalla, que es justo donde nadie
 * mira cuando se pierde. Si el asistente existe para cuando alguien no sabe qué
 * hacer, tiene que verse precisamente entonces: desde cualquier pestaña y sin
 * desplazarse.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ALTO_BARRA, color, espacio, fuente } from './tema';

export function BotonMayordomo(): JSX.Element | null {
  const insets = useSafeAreaInsets();
  const ruta = usePathname();

  // En la propia conversación sobraría.
  if (ruta.includes('consejero')) return null;

  return (
    <Animated.View
      entering={FadeInUp.delay(400).duration(500)}
      style={[estilos.contenedor, { bottom: ALTO_BARRA + insets.bottom + espacio.sm }]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/consejero');
        }}
        style={({ pressed }) => [estilos.pastilla, pressed && { opacity: 0.86, transform: [{ scale: 0.99 }] }]}
      >
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={estilos.insignia}>
          <Text style={{ fontSize: 17 }}>🎩</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={estilos.titulo}>Habla con el Mayordomo</Text>
          <Text style={estilos.sub}>Tu asistente del juego con IA</Text>
        </View>
        <Text style={estilos.flecha}>›</Text>
      </Pressable>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    position: 'absolute',
    left: espacio.lg,
    right: espacio.lg,
    zIndex: 40,
  },
  pastilla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    paddingVertical: 11,
    paddingHorizontal: espacio.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.5)',
    backgroundColor: 'rgba(31,18,12,0.86)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  insignia: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.45)',
    backgroundColor: 'rgba(201,162,39,0.12)',
  },
  titulo: {
    fontFamily: fuente.titulo,
    fontSize: 13.5,
    letterSpacing: 0.8,
    color: color.oro300,
  },
  sub: {
    fontFamily: fuente.cuerpo,
    fontSize: 14,
    color: 'rgba(217,201,163,0.72)',
    marginTop: 1,
  },
  flecha: {
    fontFamily: fuente.titulo,
    fontSize: 20,
    color: color.oro400,
    paddingRight: 4,
  },
});
