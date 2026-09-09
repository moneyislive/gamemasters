/**
 * DE QUÉ TONO ES CADA PUEBLO DEL PAISAJE.
 *
 * ═══ LO QUE HABÍA AQUÍ, Y POR QUÉ SE QUITÓ ═══
 *
 * Este fichero decidía DE QUIÉN era cada casa: el pueblo que caía dentro del radio de una
 * choza —65,6, la apotema de la comarca— se teñía del color de quien la fundó, con un
 * desempate por llave para que los tres aparatos pintaran lo mismo. Arreglaba «un pueblo de
 * casas rojas con una casa azul en el medio» y dejaba en pie lo que Miguel vio después
 * jugando (9-sep-2026): «las construcciones procedurales tienen los mismos colores que las
 * de los jugadores y eso confunde bastante». Un pueblo teñido de rojo se lee como una ciudad
 * del rojo; uno sin dueño seguía rojo del pack y se leía como de alguien. La respuesta ya no
 * es repartir el color: es que el paisaje NO lleve ninguno.
 *
 * ═══ LO QUE HAY: UN PARDO POR COMARCA ═══
 *
 * Los edificios del paisaje llevan sus vértices de color a una de las tres columnas pardas de
 * la fila del color (`COLUMNAS_DEL_CASERIO`, en `paleta.ts`, medidas contra el atlas), y la
 * columna se elige por COMARCA y no por edificio: cada aldea sale de una sola cantera, y los
 * grupos de dibujo —comarca × modelo— no se multiplican por tres. Sale de la llave de la
 * comarca y de la semilla del mundo con `revoltijo`, que es aritmética entera: el mismo
 * tablero da el mismo pueblo en los tres aparatos, y dos tableros no reparten igual.
 *
 * Lo que SÍ sigue teñido del color del dueño son las tres casas y el pozo del ASENTAMIENTO
 * del jugador (`asentamiento.ts`), que son suyos; eso no pasa por aquí.
 *
 * ═══ POR QUÉ ESTO NO ESTÁ DENTRO DE `delta.tsx` ═══
 *
 * Por lo mismo que `paleta.ts` y que `escala.ts`: es aritmética, y de un fichero que importa
 * `three` y usa JSX no se puede medir. `verify:escena` reparte doce mundos y afirma que salen
 * los tres tonos, que la semilla cambia el reparto y que nada cae fuera de las columnas pardas.
 */
import type { Hex } from '../shared/mecanicas/malla-hexagonal';
import { COLUMNAS_DEL_CASERIO } from './paleta';
import { revoltijo } from './revoltijo';

/** El canal del revoltijo del tono; lejos de los de `poblar.ts`, que van por subtesela. */
const CANAL_DEL_TONO = 977;

/** La columna parda del atlas que lleva el caserío de esta comarca en este mundo. */
export function tonoDelCaserio(comarca: Hex, semilla: number): number {
  const cual = revoltijo(comarca.q, comarca.r, CANAL_DEL_TONO + (semilla | 0)) % COLUMNAS_DEL_CASERIO.length;
  return COLUMNAS_DEL_CASERIO[cual] as number;
}
