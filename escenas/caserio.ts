/**
 * DE QUIÉN ES CADA CASA DEL PAISAJE.
 *
 * ═══ EL FALLO, QUE ESTABA MEDIDO Y NO SE ATACABA ═══
 *
 * `poblar.ts` reparte pueblos por todas las comarcas —casas, iglesia, taberna, molino—
 * y eso pasa ANTES de que nadie construya nada. La casa de adorno del pack es
 * `building_home_B_red` y la pieza de jugador es `building_home_A_blue`: la misma clase
 * de edificio, y una de las dos lleva puesto el rojo de un colono. Medido sobre el `.glb`
 * y escrito en `paleta.ts`: el tejado de una casa de adorno y el tejado del poblado del
 * colono ROJO no son colores parecidos, son EL MISMO TÉXEL. Distancia cero.
 *
 * Así que quien funda en un vértice ve su choza en medio de un caserío ajeno, y si es
 * azul, ve un pueblo de casas rojas con una casa azul en el medio. Ésa fue la frase
 * exacta con la que llegó el encargo, y no describe un gusto: describe que el decorado
 * está diciendo de quién es algo que no es de nadie.
 *
 * ═══ LO QUE SE HACE: EL CASERÍO TOMA EL COLOR DE SU DUEÑO ═══
 *
 * No hace falta recompilar el `.glb` ni pintar nada: los cuatro colores de jugador son
 * cuatro columnas de la fila 3 del atlas, y cambiar de color es sumarle a la UV el salto
 * de columna. Es el mismo mecanismo con el que la escena fabrica las piezas de los cuatro
 * jugadores a partir de una sola, y el mismo con el que fabrica los seis biomas a partir
 * de una sola tesela. Lo único que cambia es la columna de ORIGEN: la pieza de jugador
 * sale de la 0 y la casa de adorno de la 1, así que el salto se calcula por vértice desde
 * la columna en la que ese vértice ya está. La aritmética vive en `paleta.ts`.
 *
 * Este fichero decide LO OTRO, que es lo que no se puede deducir del atlas: qué casas son
 * de quién.
 *
 * ═══ SE MUEVE EL PUEBLO ENTERO Y NO SÓLO LAS CASAS ═══
 *
 * Los catorce edificios que `poblar.ts` planta se reparten por el atlas: la casa y el
 * molino están en el rojo, la iglesia y el concejo en el azul, la taberna y el taller en
 * el amarillo, el mercado y las cuadras en el verde. Repintar sólo las casas dejaría al
 * colono AMARILLO con una iglesia azul y un mercado verde dentro de su pueblo, o sea con
 * dos colores de otros dos jugadores en su propio caserío: eso no es «menos cambio», es el
 * mismo fallo con otro edificio. Se mueve el racimo entero.
 *
 * Y no queda de plástico, que era el riesgo: los edificios siguen siendo catorce modelos
 * distintos con sus tejados, sus paredes y sus maderas, y lo único que cambia es la mancha
 * de color del tejado — que es exactamente lo que el pack cambia entre sus propias
 * variantes de color. Está mirado en el banco a ×3,6.
 *
 * ═══ POR QUÉ ESTO NO ESTÁ DENTRO DE `delta.tsx` ═══
 *
 * Por lo mismo que `paleta.ts` y que `escala.ts`: es aritmética, y de un fichero que
 * importa `three` y usa JSX no se puede medir. `verify:escena` llama a `duenoDelCaserio`
 * con tableros de verdad y cuenta cuántas casas toca cada colono; si esto viviera dentro
 * del componente, la única forma de comprobarlo sería mirando una captura.
 */
import type { Punto } from '../shared/mecanicas/malla-hexagonal';
import { RADIO_DE_COMARCA } from './escala';

/**
 * ═══ HASTA DÓNDE LLEGA EL PUEBLO DE UN COLONO: 65,6, LA APOTEMA DE LA COMARCA ═══
 *
 * Es `√3/2` del radio de la comarca, y ese número aparece dos veces en la misma malla, que
 * es lo que lo hace el bueno:
 *
 *   · es la APOTEMA —del centro de una comarca al medio de su lado—;
 *   · y es la MITAD de lo más cerca que pueden estar dos chozas. Dos vértices contiguos
 *     distan 75,8 —el radio de la comarca— pero ahí no se puede fundar; los dos vértices
 *     libres más cercanos están a `√3·R` = 131,25, y su mitad es esto.
 *
 * O sea que con este radio los discos de dos chozas LEGALES se tocan y no se solapan.
 * Medido: cero edificios disputados en las 4.280 casas de doce mundos con la ocupación
 * máxima —27 chozas, que es todo lo que cabe en un delta de radio 2—.
 *
 * ═══ SE ELIGIÓ CONTANDO PÍXELES, NO POR ELEGANTE ═══
 *
 * El candidato cómodo era la mitad de la distancia entre vértices vecinos, 37,9, que tiene
 * la propiedad más fuerte —dos discos no se solapan NI aunque alguien funde en vértices
 * pegados—. Se probó en el banco y se quedó corta, y eso se ve y se cuenta: alrededor de la
 * choza azul, en un radio de 90 píxeles, los píxeles ROJOS bajaban de 234 a 134 (−43 %) y
 * quedaban DOS tejados rojos pegados a la pieza, que es literalmente lo que había que
 * quitar. Con 65,6 bajan a 88 (−62 %), y en un radio de 140 de 325 a 137 (−58 %) contra 225
 * (−31 %). La causa está medida: alrededor de esa choza hay un hueco entre 34,9 y 49,6, y
 * el pueblo de verdad empieza al otro lado del hueco.
 *
 * ═══ LO QUE REPARTE, Y LO QUE CUESTA ═══
 *
 * Con la ocupación máxima, cada colono se lleva 12,4 edificios de media, 11 de mediana y 38
 * en el peor caso; 11 de 324 no se llevan ninguno porque el pueblo de su comarca cae lejos,
 * y ésos siguen teniendo su zócalo y nada más. De los 357 edificios de un mundo se repintan
 * 335. En un tablero SIN piezas no se repinta ninguno: el caserío es el rojo de siempre.
 *
 * El precio son grupos de dibujo, porque un grupo es comarca × modelo × color: 129,5 de
 * media pasan a 206,6 con cuatro colores jugando, o sea un 60 % más. Se paga sólo cuando
 * hay colores en juego, y por eso una partida de dos paga 190,4 y un tablero recién
 * repartido no paga nada.
 *
 * AQUÍ PONÍA «129,5 pasan a 221», Y EL 221 NO ERA LA MEDIA: es el PEOR de los doce mundos
 * medidos —el de la semilla 9—, escrito en el sitio donde se lee la media. La cuenta la
 * rehace `verify:escena` («el precio de teñir el caserío está acotado…»), que agrupa los
 * edificios de doce mundos por comarca y modelo igual que `delta.tsx` y afirma las dos
 * cosas que importan: que SUBE —si no subiera, no se estaría repintando nada— y que no se
 * multiplica por los cuatro colores, que es lo que pasaría si cada choza tiñera lo suyo
 * (228,2 medidos).
 *
 * ═══ Y UN AVISO QUE SÓLO SE VE MIDIENDO ═══
 *
 * Para el colono ROJO esto casi no cambia nada, y no es un fallo: la casa de adorno YA es
 * roja, así que su pueblo ya parecía suyo. Medido en el banco alrededor de su choza, los
 * píxeles rojos suben de 857 a 931 (+9 %) mientras que en la azul los rojos caen a menos de
 * la mitad. Quien juzgue esto con una captura del rojo va a concluir que no hace nada.
 */
export const RADIO_DEL_CASERIO = (RADIO_DE_COMARCA * Math.sqrt(3)) / 2;

/** Una choza fundada: de quién es, dónde está, y con qué llave se la nombra. */
export interface Fundacion {
  /**
   * LA LLAVE DEL VÉRTICE, y no un índice de la lista.
   *
   * Es lo que rompe el empate cuando dos fundaciones están a la MISMA distancia de un
   * edificio, y tiene que ser algo que valga lo mismo en los tres aparatos: el orden en
   * que llega la lista de piezas no lo es —depende de en qué orden construyó cada uno—,
   * y una escena que reparte el caserío de una manera en el PC y de otra en el móvil es
   * peor que una que no lo reparte.
   */
  vertice: string;
  color: string;
  /** El vértice llevado al plano de la malla, con el radio de la comarca. */
  punto: Punto;
}

/**
 * DE QUIÉN ES ESTE EDIFICIO DEL CASERÍO, o `null` si de nadie.
 *
 * El más cercano dentro de `RADIO_DEL_CASERIO`, y a igual distancia el de la llave menor.
 *
 * ═══ POR QUÉ HAY EMPATE Y NO SE PUEDE FINGIR QUE NO ═══
 *
 * Con la separación mínima de una partida de verdad los discos sólo se TOCAN, así que ni
 * siquiera hay solape: cero disputas en las 4.280 casas medidas. Pero esta escena pinta el
 * delta que le manden y no es quién para suponer las reglas de nadie — un juego que dejara
 * fundar en vértices contiguos (a 75,8, menos que los 131,25 de Riberas) sí solaparía, y
 * entonces habría edificios a tiro de dos colonos. Ahí decide LA CERCANÍA, y sólo si
 * empatan exactamente decide la llave.
 *
 * Sin esa última regla la función devolvería «la primera de la lista que esté a esa
 * distancia», y el orden de la lista lo pone quien construyó antes: el mismo tablero se
 * pintaría distinto en dos aparatos. `verify:escena` lo ve fallar con dos chozas puestas a
 * la misma distancia exacta y con las dos órdenes de la lista.
 *
 * Se compara en distancia AL CUADRADO: la raíz no cambia ningún orden y sí mete un
 * redondeo distinto en cada máquina justo donde se decide el empate.
 */
export function duenoDelCaserio(
  donde: Punto,
  fundadas: readonly Fundacion[],
): Fundacion | null {
  const alcance = RADIO_DEL_CASERIO * RADIO_DEL_CASERIO;
  let suya: Fundacion | null = null;
  let cuanto = Infinity;
  for (const f of fundadas) {
    const dx = donde.x - f.punto.x;
    const dy = donde.y - f.punto.y;
    const d = dx * dx + dy * dy;
    if (d > alcance) continue;
    if (suya === null || d < cuanto || (d === cuanto && f.vertice < suya.vertice)) {
      suya = f;
      cuanto = d;
    }
  }
  return suya;
}
