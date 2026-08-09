/**
 * El panel de los objetos.
 *
 * Ver la nota de `SuspectsPanel`: los dos eran la misma pantalla escrita dos
 * veces. Aquí la categoría se busca por no ser ni jugadores ni lugares, que es
 * lo que la distingue en el manifiesto sin nombrarla «armas».
 */
import PanelDeCategoria from './PanelDeCategoria';
import { manifiestoDe } from '../../../../shared/juegos';
import { useAppStore } from '../../state/store';

export default function WeaponsPanel(): JSX.Element {
  const game = useAppStore((s) => s.game);
  const categoria = manifiestoDe(game?.settings?.juego).categorias.find(
    (c) => !c.sonJugadores && !c.sonLugares,
  );
  if (!categoria) return <div className="sp-panel" />;
  return <PanelDeCategoria categoria={categoria} />;
}
