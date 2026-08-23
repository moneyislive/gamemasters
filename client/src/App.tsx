/**
 * Enrutado principal de GameMasters.
 * '/'                → catálogo de juegos
 * '/:juego'          → recibidor (lista de partidas de ese juego)
 * '/:juego/:gameId'  → estudio de creación de la partida
 *
 * Las rutas llevan el juego delante en vez de la palabra «cluedo» escrita a
 * fuego. Los enlaces antiguos siguen valiendo —«cluedo» encaja en `:juego`— y
 * un juego nuevo no toca este fichero.
 */
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { juegosInstalados } from '../../shared/juegos';
import BarraDeCuenta from './components/auth/BarraDeCuenta';
import LoginGate from './components/auth/LoginGate';
import CatalogPage from './pages/CatalogPage';
import CluedoLobbyPage from './pages/CluedoLobbyPage';
import StudioPage from './pages/StudioPage';

/**
 * Deja pasar solo a los juegos que existen.
 *
 * Con `:juego` en la ruta, cualquier cosa encaja: una errata, un juego todavía
 * sin escribir, o un enlace viejo. Sin esta guarda, `manifiestoDe` devolvería
 * CLUEDO por defecto y se abriría el taller equivocado con la partida de otro.
 */
function SoloSiEstaInstalado({ children }: { children: JSX.Element }): JSX.Element {
  const { juego } = useParams();
  const instalado = juegosInstalados().some((j) => j.id === juego);
  return instalado ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    // Si el servidor tiene APP_PASSWORD, nada se muestra sin la contraseña.
    <LoginGate>
      {/*
        DENTRO de la puerta y FUERA de las rutas. Dentro, porque a quien todavía
        no ha entrado ya le ofrece Google la propia puerta y aquí sobraría.
        Fuera de las rutas, porque si viviera en una página habría que repetirlo
        en las tres —catálogo, recibidor y estudio— y la tercera se olvidaría.
      */}
      <BarraDeCuenta />
      <Routes>
        <Route path="/" element={<CatalogPage />} />
        <Route
          path="/:juego"
          element={
            <SoloSiEstaInstalado>
              <CluedoLobbyPage />
            </SoloSiEstaInstalado>
          }
        />
        <Route
          path="/:juego/:gameId"
          element={
            <SoloSiEstaInstalado>
              <StudioPage />
            </SoloSiEstaInstalado>
          }
        />
        {/* Cualquier ruta desconocida vuelve al catálogo */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </LoginGate>
  );
}
