/**
 * Punto de entrada del cliente GameMasters.
 * Monta la aplicación React con enrutado y el sistema de diseño global.
 */
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/theme.css';
// Después del tema de la casa, siempre: repinta sus tokens por juego.
import './styles/temas.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('No se encontró el elemento raíz #root en index.html');
}

// Nota: sin StrictMode a propósito — evita dobles suscripciones SSE en desarrollo.
ReactDOM.createRoot(rootElement).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
