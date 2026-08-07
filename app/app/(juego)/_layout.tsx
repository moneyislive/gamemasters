/**
 * Navegación del juego: seis pestañas y el Mayordomo en medio.
 *
 * Nada de menús ocultos. Durante la partida hay ruido, poca luz y prisa: todo
 * lo que se usa tiene que verse desde cualquier pantalla.
 *
 * La barra es propia (`BarraDeJuego`) en vez de la de serie, porque la de serie
 * no sabe abrirse en el centro para alojar el botón del asistente. El orden de
 * las pestañas de aquí abajo es el orden en que salen: tres, la muesca, y tres.
 */
import { Tabs } from 'expo-router/js-tabs';
import { BarraDeJuego } from '../../src/barra';
import { color } from '../../src/tema';

export default function DisposicionJuego(): JSX.Element {
  return (
    <Tabs
      tabBar={(props) => <BarraDeJuego {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: color.feltoscuro },
      }}
    >
      <Tabs.Screen name="ronda" options={{ title: 'Ronda' }} />
      <Tabs.Screen name="personaje" options={{ title: 'Tú' }} />
      <Tabs.Screen name="mapa" options={{ title: 'Mapa' }} />
      <Tabs.Screen name="tablon" options={{ title: 'Tablón' }} />
      {/* El rótulo dice «Notas» y no «Cuaderno» por sitio: con seis pestañas y
          la muesca en medio, en un móvil estrecho «Cuaderno» no entra. */}
      <Tabs.Screen name="cuaderno" options={{ title: 'Notas' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
