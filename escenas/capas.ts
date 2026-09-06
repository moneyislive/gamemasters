/**
 * LAS CAPAS DE DIBUJO DE LO QUE VA PEGADO A LA CÁMARA: la mesa, las dos manos y lo que
 * sale al coger una carta. Sin `three` y sin React, para que el modelo del árbol
 * (`scripts/arbol-de-la-mesa.ts`) y `verify:escena` importen EL MISMO número que pinta
 * `delta.tsx`, y no una copia.
 *
 * ═══ CADA CAPA ES UN NÚMERO, Y LO LLEVA TODO GRUPO QUE TENGA MALLAS DEBAJO ═══
 *
 * `three` ordena primero por `groupOrder` y sólo después por el `renderOrder` de la malla,
 * y el `groupOrder` de una malla es el `renderOrder` del `Group` MÁS CERCANO que tiene
 * encima: `projectObject` lo reescribe en CADA grupo que atraviesa, así que un grupo
 * anidado sin número devuelve a cero todo lo que cuelga de él. En `delta.tsx` cada pieza,
 * naipe, carta, área y casilla vive en un `<group>` propio; un número puesto sólo en el
 * grupo exterior de la barra o de una mano no le llega a ninguna malla. Medido con el
 * ordenador de `three` sobre ese árbol: con la constante sólo en los exteriores, la tapa
 * opaca de la mesa (1000) se pintaba DESPUÉS de las cartas de bienes (grupo 0) y les
 * tapaba los pies. Por eso la regla es: TODO `<group>` que tenga mallas debajo lleva la
 * constante de su capa —los dos de `PiezaEnLaBarra`, los dos de `MazoEnLaBarra`, `Baraja`
 * y `Carta`, `AreaDeTrueque`, `ManoDelMazo` y `CartaDelMazoEnLaMano`, `Casilla`—, y el
 * `renderOrder` de cada malla sigue ordenando DENTRO de su capa. `verify:escena` lee los
 * grupos de dentro por texto y, además, monta el árbol modelo con estas mismas
 * constantes y las posiciones reales y lo ordena con el `WebGLRenderLists` de `three`.
 *
 * ═══ EL ORDEN ES LO ÚNICO QUE SEPARA LA MESA DEL MUNDO: NO HAY BORRADO DE PROFUNDIDAD ═══
 *
 * La mesa se dibuja contra la profundidad del mundo, y le basta casi siempre: en la
 * partida la cámara no baja de 12° (`ALTURA_MINIMA`) y el ojo va a 12 unidades o más
 * SOBRE EL AGUA (`ALTURA_MINIMA_DEL_OJO`), así que el mundo casi nunca llega a las 2
 * unidades donde vive la mesa (`DISTANCIA_DE_LA_BARRA`). Casi: esa altura es sobre el
 * agua y no sobre el terreno, y en una montaña de siete u ocho escalones acercado al
 * máximo el ojo puede meterse en la roca; entonces la mesa se entierra con él. Es el
 * precio aceptado de no hacer una segunda pasada de render, y está medido. Hubo dos «testigos» —un plano de 0,001
 * con `onBeforeRender → gl.clearDepth()`— y NINGUNO borró nunca nada: iban en el ORIGEN de
 * un grupo que copia la posición de la cámara en cada fotograma, o sea EN EL OJO, detrás
 * del plano cercano (0,5), y `projectObject` los podaba por frustum antes de meterlos en
 * la lista de dibujo; `onBeforeRender` sólo se llama a lo que está en la lista. Ni con
 * 999 ni con −1: la escena se veía igual porque el mundo está lejos. Que nadie vuelva a
 * poner un testigo creyendo que hace algo. Si algún día hace falta borrar profundidad
 * para la mesa, es una segunda pasada de render (`createPortal` + `gl.render` con
 * `autoClear` a mano), no un testigo.
 *
 * ═══ EL HUECO ENTRE CAPAS ═══
 *
 * El que se le deja a la mano de bienes no es capricho: cada carta gasta diez para sus
 * tres capas y hasta trescientos más si el imán tira de ella, que es lo que la trae al
 * frente. Y va por el GRUPO y no por la cuenta de la malla: con once o más cartas, una
 * cogida con el imán a tope pasaría de 2000 y se pintaría sobre las áreas si el grupo no
 * mandara.
 */
export const ORDEN_DE_LA_BARRA = 1000;
export const ORDEN_DE_LAS_CARTAS = 1010;
export const ORDEN_DE_LAS_AREAS = 2000;
/**
 * Y LA MANO DEL MAZO, EN UN TRAMO PROPIO Y SIN TOCAR EL DE LOS BIENES.
 *
 * Va por encima de todo lo anterior aunque no lo necesite: las dos manos están en lados
 * opuestos del lienzo y `verify:escena` exige que no se rocen, así que sus órdenes de
 * dibujo no pueden pelearse ni queriendo. El tramo aparte es para el día que alguien
 * mueva una de las dos — que se cruce en la pantalla no debe además cruzarse aquí.
 *
 * El hueco que se le deja a las cartas del mazo es el mismo que el de los bienes: diez por
 * carta para sus capas, más lo que el imán y el estar cogida les suman.
 */
export const ORDEN_DE_LAS_CARTAS_DEL_MAZO = 3000;
export const ORDEN_DE_LAS_CASILLAS = 4000;
