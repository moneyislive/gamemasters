/**
 * Enrutado principal de GameMasters.
 * '/'                → catálogo de juegos
 * '/cluedo'          → recibidor (lista de casos de CLUEDO)
 * '/cluedo/:gameId'  → estudio de creación de la partida
 */
import { Navigate, Route, Routes } from 'react-router-dom';
import LoginGate from './components/auth/LoginGate';
import CatalogPage from './pages/CatalogPage';
import CluedoLobbyPage from './pages/CluedoLobbyPage';
import StudioPage from './pages/StudioPage';

export default function App() {
  return (
    // Si el servidor tiene APP_PASSWORD, nada se muestra sin la contraseña.
    <LoginGate>
      <Routes>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/cluedo" element={<CluedoLobbyPage />} />
        <Route path="/cluedo/:gameId" element={<StudioPage />} />
        {/* Cualquier ruta desconocida vuelve al catálogo */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </LoginGate>
  );
}
