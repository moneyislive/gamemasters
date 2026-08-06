/**
 * Raíz de la app: fuentes, estado de la partida y el telón de avisos.
 *
 * Las tipografías son las mismas de la plataforma web —Cinzel para los títulos,
 * Cormorant Garamond para el texto— porque es lo que hace que la app y los
 * dosieres impresos parezcan del mismo mundo.
 */
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Cinzel_600SemiBold,
  Cinzel_700Bold,
  useFonts as useCinzel,
} from '@expo-google-fonts/cinzel';
import {
  CormorantGaramond_400Regular,
  CormorantGaramond_400Regular_Italic,
  CormorantGaramond_600SemiBold,
  useFonts as useCormorant,
} from '@expo-google-fonts/cormorant-garamond';
import { ProveedorPartida } from '../src/estado';
import { TelonDeAvisos } from '../src/avisos';
import { color } from '../src/tema';

void SplashScreen.preventAutoHideAsync();

export default function Raiz(): JSX.Element | null {
  const [cinzel] = useCinzel({ Cinzel_600SemiBold, Cinzel_700Bold });
  const [cormorant] = useCormorant({
    CormorantGaramond_400Regular,
    CormorantGaramond_400Regular_Italic,
    CormorantGaramond_600SemiBold,
  });
  const listo = cinzel && cormorant;

  useEffect(() => {
    if (listo) void SplashScreen.hideAsync();
  }, [listo]);

  if (!listo) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ProveedorPartida>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: color.feltoscuro },
              animation: 'fade',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(juego)" />
            <Stack.Screen
              name="acusar"
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="consejero"
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen name="desenlace" options={{ animation: 'fade' }} />
          </Stack>
          <TelonDeAvisos />
        </ProveedorPartida>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
