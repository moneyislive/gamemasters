/**
 * DE QUÉ TONO ES CADA EDIFICIO DEL PAISAJE.
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
 * ═══ LO QUE HAY: UN TONO POR COMARCA Y CLASE DE EDIFICIO ═══
 *
 * Los edificios del paisaje llevan sus vértices de color a una de las seis celdas de
 * `CELDAS_DEL_CASERIO` (`paleta.ts`, medidas contra el atlas: grises, pardos y la arena), y
 * la celda se elige por COMARCA y por MODELO: las casas de una aldea comparten cantera —que
 * es lo que le da a la aldea un color dominante que se ve desde el aire— y la iglesia, la
 * taberna o el molino pueden salir de otra, que es la variedad que Miguel echaba en falta
 * con un solo pardo por aldea. Medido sobre doce mundos: 17,8 de 19 comarcas tienen dos
 * tonos o más, y los grupos de dibujo —comarca × modelo— son los mismos que con un tono
 * por comarca, porque el tono va con el modelo. Un tono por EDIFICIO habría subido los
 * grupos de 86,5 a 126,5 de media para la misma gama; ésta es la que se ve y no se paga.
 *
 * Sale de la llave de la comarca, del nombre del modelo y de la semilla del mundo con
 * `revoltijo`, que es aritmética entera: el mismo tablero da el mismo pueblo en los tres
 * aparatos, y dos tableros no reparten igual.
 *
 * Lo que SÍ sigue teñido del color del dueño son las tres casas y el pozo del ASENTAMIENTO
 * del jugador (`asentamiento.ts`), que son suyos; eso no pasa por aquí.
 *
 * ═══ POR QUÉ ESTO NO ESTÁ DENTRO DE `delta.tsx` ═══
 *
 * Por lo mismo que `paleta.ts` y que `escala.ts`: es aritmética, y de un fichero que importa
 * `three` y usa JSX no se puede medir. `verify:escena` reparte doce mundos y afirma que salen
 * los seis tonos, que la semilla y el modelo cambian el reparto y que nada cae fuera de las
 * seis celdas.
 */
import type { Hex } from '../shared/mecanicas/malla-hexagonal';
import { CELDAS_DEL_CASERIO } from './paleta';
import { revoltijo } from './revoltijo';

/** El canal del revoltijo del tono; lejos de los de `poblar.ts`, que van por subtesela. */
const CANAL_DEL_TONO = 977;

/** Un entero a partir del nombre de un modelo, para que entre en el revoltijo. */
function numeroDelNombre(nombre: string): number {
  let n = 0;
  for (let i = 0; i < nombre.length; i++) n = (n * 31 + nombre.charCodeAt(i)) | 0;
  return n;
}

/**
 * EL TONO DE UN EDIFICIO DEL PAISAJE: el índice de su celda en `CELDAS_DEL_CASERIO`.
 * Mismo para todos los edificios del mismo modelo dentro de una comarca; distinto, en
 * general, para dos modelos de la misma comarca y para el mismo modelo en dos comarcas.
 */
export function tonoDelCaserio(comarca: Hex, modelo: string, semilla: number): number {
  const canal = (CANAL_DEL_TONO + (semilla | 0) + numeroDelNombre(modelo)) | 0;
  return revoltijo(comarca.q, comarca.r, canal) % CELDAS_DEL_CASERIO.length;
}
