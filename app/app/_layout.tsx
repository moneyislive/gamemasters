/**
 * Raíz de la app: fuentes, estado de la partida y el telón de avisos.
 *
 * Las tipografías son las mismas de la plataforma web —Cinzel para los títulos,
 * Cormorant Garamond para el texto— porque es lo que hace que la app y los
 * dosieres impresos parezcan del mismo mundo.
 */
import { useEffect, useState } from 'react';
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
import { FranjaDeConexion } from '../src/conexion';
import { useTema } from '../src/tema-juego';

void SplashScreen.preventAutoHideAsync();

export default function Raiz(): JSX.Element | null {
  const [cinzel, errorCinzel] = useCinzel({ Cinzel_600SemiBold, Cinzel_700Bold });
  const [cormorant, errorCormorant] = useCormorant({
    CormorantGaramond_400Regular,
    CormorantGaramond_400Regular_Italic,
    CormorantGaramond_600SemiBold,
  });
  /**
   * Se entra aunque las tipografías fallen o tarden demasiado.
   *
   * Antes la condición era solo «las dos cargadas», sin mirar el error y sin
   * plazo, y con `return null` mientras tanto: cualquier fallo al registrar una
   * fuente dejaba la pantalla de arranque para siempre, con la app viva por
   * debajo y nada que tocar. Ese es el peor fallo posible —no hay forma de
   * salir, ni de saber qué pasa— y encima es de los que solo aparecen en un
   * modelo de teléfono concreto, o sea, nunca en el nuestro.
   *
   * Sin sus tipografías la app se ve con la letra del sistema. Es peor de
   * aspecto y perfectamente jugable, que es justo el orden correcto de
   * prioridades a las nueve de la noche con doce invitados sentados.
   */
  const [seAcabaLaEspera, setSeAcabaLaEspera] = useState(false);
  useEffect(() => {
    const plazo = setTimeout(() => setSeAcabaLaEspera(true), 4000);
    return () => clearTimeout(plazo);
  }, []);

  const listo =
    (cinzel || Boolean(errorCinzel)) &&
    (cormorant || Boolean(errorCormorant));
  const entrar = listo || seAcabaLaEspera;

  useEffect(() => {
    if (entrar) void SplashScreen.hideAsync();
  }, [entrar]);

  if (!entrar) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ProveedorPartida>
          <StatusBar style="light" />
          <PilaDePantallas />
          <FranjaDeConexion />
          <TelonDeAvisos />
        </ProveedorPartida>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * La pila de pantallas, con el fondo del juego que se esté jugando.
 *
 * VA EN SU PROPIO COMPONENTE porque el fondo tiene que salir de `useTema()`, y
 * ese hook lee el contexto de la partida — que envuelve a esto pero no al
 * componente de arriba. Estaba puesto a `color.feltoscuro`: el verde de fieltro
 * de CLUEDO, detrás de TODAS las pantallas, incluidas las de la tumba. Es el
 * color que más superficie ocupa de la app y era el único que no cambiaba.
 */
function PilaDePantallas(): JSX.Element {
  const t = useTema();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: t.feltoscuro },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="entrar" />
      <Stack.Screen
        name="avatar"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="cuenta"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
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
  );
}
