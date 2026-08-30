/**
 * Lo que CLUEDO le ensena a quien juega: sus pistas y sus hechos.
 *
 * ═══ ESTO ESTABA EN `live/proyeccion.ts` ═══
 *
 * O sea, en el nucleo. La vista comun traia tres campos —`misPistas`,
 * `misHallazgos` y `hechos`— que la plataforma componia leyendo `plot.clues` y
 * `plot.material.timelineReveals`, y que solo significan algo si se juega a
 * buscar cosas por los sitios de un mapa.
 *
 * Los otros dos juegos los recibian vacios en TODAS las vistas de una velada
 * entera. Se puede comprobar en los maestros de oro: 76 veces en la Momia, 72
 * en las Sombras, siempre `[]`.
 *
 * ═══ POR QUE ESTE FICHERO ES DE CUATRO LINEAS ═══
 *
 * Porque el calculo no es de CLUEDO: es de la MECANICA de las pistas, que vive
 * en `mecanicas/pistas.ts` y la puede llamar cualquier juego sin conocer a
 * CLUEDO. Lo de CLUEDO es la decision de USARLA, y eso es esta linea.
 *
 * Con ella, CLUEDO deja de ser el juego sin proyeccion. Era la ultima
 * asimetria: los otros dos declaraban la suya y el primero no la necesitaba
 * porque la plataforma ya hacia su trabajo.
 */
import { registrarProyeccion } from './proyecciones';
import { bloqueDePistas } from '../mecanicas/pistas';

registrarProyeccion('cluedo', bloqueDePistas);
