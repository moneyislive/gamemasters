/**
 * Navegación del juego: cinco pestañas, siempre a un dedo de distancia.
 *
 * Nada de menús ocultos. Durante la partida hay ruido, poca luz y prisa: todo
 * lo que se usa tiene que verse desde cualquier pantalla.
 */
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { StyleSheet } from 'react-native';
import { color, fuente } from '../../src/tema';

function Glifo({ children, activo }: { children: string; activo: boolean }): JSX.Element {
  return (
    <Text style={{ fontSize: 19, opacity: activo ? 1 : 0.45, color: activo ? color.oro300 : color.pergaminoTenue }}>
      {children}
    </Text>
  );
}

export default function DisposicionJuego(): JSX.Element {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.oro300,
        tabBarInactiveTintColor: 'rgba(217,201,163,0.5)',
        tabBarStyle: styles.barra,
        tabBarBackground: () => (
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        ),
        tabBarLabelStyle: {
          fontFamily: fuente.titulo,
          fontSize: 10,
          letterSpacing: 1,
          marginTop: 2,
        },
        sceneStyle: { backgroundColor: color.feltoscuro },
      }}
    >
      <Tabs.Screen
        name="ronda"
        options={{
          title: 'Ronda',
          tabBarIcon: ({ focused }) => <Glifo activo={focused}>⌛</Glifo>,
        }}
      />
      <Tabs.Screen
        name="personaje"
        options={{
          title: 'Tú',
          tabBarIcon: ({ focused }) => <Glifo activo={focused}>🎭</Glifo>,
        }}
      />
      <Tabs.Screen
        name="tablon"
        options={{
          title: 'Tablón',
          tabBarIcon: ({ focused }) => <Glifo activo={focused}>📌</Glifo>,
        }}
      />
      <Tabs.Screen
        name="cuaderno"
        options={{
          title: 'Cuaderno',
          tabBarIcon: ({ focused }) => <Glifo activo={focused}>✒</Glifo>,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => <Glifo activo={focused}>🏆</Glifo>,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  barra: {
    position: 'absolute',
    borderTopWidth: 1,
    borderTopColor: 'rgba(201,162,39,0.28)',
    backgroundColor: 'rgba(11,23,16,0.82)',
    height: 74,
    paddingTop: 8,
    paddingBottom: 16,
  },
});
