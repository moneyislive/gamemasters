/**
 * El arranque, y una decisión que se ve rara si no se cuenta.
 *
 * NO HAY `<StrictMode>`. En desarrollo, ese envoltorio monta cada efecto DOS
 * veces a propósito para cazar efectos mal limpiados, y aquí el efecto principal
 * es un sondeo largo que aparca una petición veinticinco segundos en el
 * servidor: con el doble montaje habría dos peticiones aparcadas por mesa
 * durante todo el desarrollo, o sea el doble de conexiones abiertas y una
 * medición de presencia que no se parece a la de producción. El sondeo sí limpia
 * lo suyo —aborta y para el bucle—, así que lo que `StrictMode` compraría aquí
 * ya está pagado a mano y comentado donde vive, en `mesa.ts`.
 *
 * SÍ HAY UNA RED, Y ES LO ÚNICO QUE ENVUELVE A LA SALA. Una excepción pintando
 * desmonta el árbol entero, y como aquí el árbol entero es la Sala, lo que queda
 * es una página EN BLANCO: el fallo mudo que este cliente existe para no tener.
 * Ver `red-de-seguridad.tsx`, que cuenta también lo que esa red NO compra.
 */
import { createRoot } from 'react-dom/client';
import { BASE, Sala } from './sala';
import { RedDeSeguridad } from './red-de-seguridad';
import './estilo.css';

const raiz = document.getElementById('raiz');
if (raiz === null) throw new Error('Falta el <div id="raiz"> de index.html');
createRoot(raiz).render(
  <RedDeSeguridad base={BASE}>
    <Sala />
  </RedDeSeguridad>,
);
