/**
 * El panel de los sospechosos.
 *
 * Eran doscientas líneas idénticas a las del panel de armas salvo por el texto
 * y por el campo de correo. Ahora es el panel genérico, y todo lo que lo
 * distingue —cómo se llama, qué se explica, que las fichas son redondas, que
 * admite correo— lo declara CLUEDO en su manifiesto.
 */
import PanelDeCategoria from './PanelDeCategoria';
import { manifiestoDe } from '../../../../shared/juegos';
import { useAppStore } from '../../state/store';

export default function SuspectsPanel(): JSX.Element {
  const game = useAppStore((s) => s.game);
  const categoria = manifiestoDe(game?.settings?.juego).categorias.find((c) => c.sonJugadores);
  if (!categoria) return <div className="sp-panel" />;
  return <PanelDeCategoria categoria={categoria} />;
}
