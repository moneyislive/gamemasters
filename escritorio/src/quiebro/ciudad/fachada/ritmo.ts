/**
 * EL RITMO VERTICAL DE UNA CARA: pilastras, cantoneras de sillares, miradores y aletas, por encima de la planta
 * baja. Hoy no escribe nada: `fachadasPorPartes` lo llama en cada cara de cada volumen, con relieve y sin él,
 * para que quien lo rellene no tenga que tocar a nadie más. Cuando escriba, que ceda por tramo (el trabajo de
 * un paso no puede pasar del trozo de la ventana), y que use la rejilla de `recorrerLosHuecos` (`caras.ts`),
 * que es la del sombreador.
 */
import type { Molde } from '../geometria';
import type { EdificioDelPlano } from '../tipos';
import type { CaraDelVolumen, ObraDeLaFachada } from './tipos-de-cara';

/** EL RITMO de la cara `c` de `e`. Hoy no escribe nada (ver la cabecera). */
export function* ritmoDeLaCara(m: Molde, e: EdificioDelPlano, c: CaraDelVolumen, obra: ObraDeLaFachada): Generator<void, void, void> {
  /* Todavía nada: se llama y no escribe. */
}
