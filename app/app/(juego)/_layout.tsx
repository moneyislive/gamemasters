/**
 * Navegación del juego.
 *
 * Nada de menús ocultos. Durante la partida hay ruido, poca luz y prisa: todo
 * lo que se usa tiene que verse desde cualquier pantalla.
 *
 * QUÉ HAY AQUÍ Y QUÉ NO. Este fichero declara TODAS las pantallas que trae la
 * app, porque expo-router necesita conocerlas para poder navegar a ellas. Cuál
 * de ellas aparece en la barra, en qué orden, con qué rótulo y con qué icono lo
 * decide el manifiesto del juego, y de eso se ocupa `BarraDeJuego`.
 *
 * Es un reparto deliberado: la app es un binario compilado, así que un juego no
 * puede inventarse una pantalla —eso exige publicar una versión nueva— pero sí
 * puede elegir cuáles usa y cómo las llama. Una campaña de rol dirá «Mi héroe»
 * donde CLUEDO dice «Tú», y una oca no enseñará ni tablón ni cuaderno.
 */
import { Tabs } from 'expo-router/js-tabs';
import { BarraDeJuego } from '../../src/barra';
import { color } from '../../src/tema';
import type { PantallaDeApp } from '../../../shared/juegos';

/**
 * Todas las pantallas del paquete. El orden aquí no manda: manda el manifiesto.
 *
 * Es un `Record` sobre la unión cerrada y no una lista, y esa es la gracia: si
 * alguien añade una pantalla al contrato y olvida declararla aquí, esto no
 * compila. Con una lista, la pantalla existiría en el contrato, un juego podría
 * pedirla, y en el móvil no habría nada donde navegar.
 */
const PANTALLAS: Record<PantallaDeApp, true> = {
  ronda: true,
  personaje: true,
  mapa: true,
  tablon: true,
  cuaderno: true,
  perfil: true,
};

export default function DisposicionJuego(): JSX.Element {
  return (
    <Tabs
      tabBar={(props) => <BarraDeJuego {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: color.feltoscuro },
      }}
    >
      {(Object.keys(PANTALLAS) as PantallaDeApp[]).map((nombre) => (
        <Tabs.Screen key={nombre} name={nombre} />
      ))}
    </Tabs>
  );
}
