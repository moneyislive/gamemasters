/**
 * LA ESCALA DEL MUNDO, y por qué es una cadena de consecuencias y no una lista de
 * números elegidos.
 *
 * ═══ EL TABLERO ES UN MUNDO, NO UNA MAQUETA ═══
 *
 * Ésta es la decisión de producto de la que cuelga toda la geometría, y conviene
 * leerla antes de tocar cualquier medida.
 *
 * Un tablero de mesa y un mundo abierto no son el mismo objeto a distinta escala:
 * son dos cosas distintas. En una maqueta, un hexágono es una ficha con una casita
 * encima; en un mundo, un hexágono es una COMARCA por la que se camina, hecha de
 * teselas de suelo, con un pueblo dentro. Aquí se construye lo segundo, y la vista
 * de tablero es sencillamente ese mundo mirado desde muy arriba.
 *
 * Se hace así porque la vista en tercera persona con avatar llega después, y
 * cambiar la escala del mundo cuando ya hay un juego encima es rehacerlo. Un mundo
 * mirado desde arriba se puede jugar como tablero; un tablero no se puede caminar.
 *
 * ═══ LA CADENA, EN ORDEN ═══
 *
 * Cada eslabón se deriva del anterior. Ninguno se escribe dos veces, y por eso no
 * hay dos sitios que puedan discrepar:
 *
 *     1. Una persona mide 2,543.                    ← medido en `Knight.glb`
 *     2. Una casa tiene que medir dos personas.     ← decisión: es lo que hace que
 *                                                     una puerta parezca una puerta
 *     3. La casa del pack mide 0,930.               ← medido en el `.glb`
 *     4. Luego el pack va a escala 5,469.           ← 2 y 3
 *     5. La tesela del pack tiene radio 1,1547.     ← medido, y comprobado
 *     6. Luego una tesela del mundo mide 6,315.     ← 4 y 5
 *     7. Una comarca son 12 teselas de radio.       ← decisión: es lo que hace que
 *                                                     una comarca sea una ciudad
 *     8. Luego una comarca mide 75,8 de radio.      ← 6 y 7
 *     9. Luego cruzarla lleva 38 segundos a pie.    ← 8 y el paso de una persona
 *
 * Lo único elegido son los pasos 2 y 7. Todo lo demás son medidas del pack o
 * cuentas. Si mañana se cambia la casa por otro modelo, basta con medirlo: el
 * mundo entero se reajusta solo y sigue siendo coherente.
 *
 * ═══ POR QUÉ MANDA LA TESELA Y NO LA COMARCA ═══
 *
 * El pack de KayKit es un constructor de mundos hexagonales: las teselas encajan
 * unas con otras y todo lo demás —árboles, casas, montañas— está hecho para
 * apoyarse encima de una. Si se fijara primero el radio de la comarca en un número
 * redondo, la tesela saldría con un tamaño cualquiera y habría que escalar el pack
 * a ojo: las teselas dejarían huecos o se solaparían, y un mundo con costuras entre
 * teselas no hay quien lo arregle después.
 *
 * ═══ LOS DOS PACKS NO COMPARTEN UNIDAD, Y ESO NO SE VE HASTA MEDIRLO ═══
 *
 *     Caballero (Character Pack)      2,543
 *     Casa      (Hexagon Pack)        0,930
 *     Castillo  (Hexagon Pack)        3,979
 *     Tesela    (Hexagon Pack)        radio 1,1547
 *
 * O sea que un caballero es DOS VECES Y MEDIA más alto que una casa. El pack
 * hexagonal está autorizado a escala de diorama y el de personajes a escala de
 * personaje; juntarlos tal cual da un gigante paseando entre casetas de perro. Por
 * eso la unidad del mundo es la del PERSONAJE, que es la única con un referente
 * real fuera de la pantalla.
 *
 * ═══ ESTE FICHERO NO IMPORTA NADA, A PROPÓSITO ═══
 *
 * Ni `three` ni la malla. Es la aritmética del mundo, y tiene que poder leerla un
 * comprobador de Node sin abrir un contexto de dibujo — que es justo lo que hace
 * `verify:escena`.
 */

/**
 * CUÁNTO MIDE UNA PERSONA. Es la unidad de referencia de todo.
 *
 * Medido sobre `Knight.glb` del Character Pack. No se redondea a 2 ni se
 * «normaliza» a 1,8 como en un motor realista: los personajes de KayKit son
 * achaparrados a propósito, y reescalarlos para que midan lo que mide una persona
 * de verdad los haría parecer larguiruchos junto a sus propias armas.
 */
export const ALTURA_DE_UNA_PERSONA = 2.543;

/**
 * CUÁNTO QUEREMOS QUE MIDA UNA CASA. Ésta es una de las dos decisiones.
 *
 * Dos personas de alto. Es lo que hace que una puerta parezca una puerta y que
 * caminar entre dos casas se sienta como una calle. Con menos, el avatar mira por
 * encima de los tejados; con mucho más, un pueblo deja de leerse desde el aire.
 */
export const ALTURA_DE_UNA_CASA = ALTURA_DE_UNA_PERSONA * 2;

/**
 * CUÁNTO MIDE LA CASA DENTRO DEL PACK, medido y no supuesto.
 *
 * `building_home_A_*` da 0,930 de alto en `escenas/modelos/tablero.glb`.
 * `verify:escena` lo vuelve a medir sobre el fichero de verdad y protesta si se ha
 * movido, porque de este número cuelga el tamaño del mundo entero.
 */
export const ALTURA_DE_LA_CASA_EN_EL_PACK = 0.93;

/**
 * EL RADIO DEL HEXÁGONO DEL PACK, medido y no supuesto.
 *
 * La tesela de KayKit ocupa 2 de ancho por 2,3094 de fondo. Para un hexágono de
 * PUNTA ARRIBA con radio `R`, el ancho es `√3·R` y el fondo `2·R`; de ahí sale
 * `R = 1,1547`, que es `2/√3`. Y las dos medidas cuadran con la misma R, que es lo
 * que confirma que el hexágono es regular y está orientado como nuestra malla — si
 * fuera de punta al lado, ancho y fondo saldrían al revés y habría que rotarlo.
 *
 * Se escribe la cuenta y no el número redondeado para que quien lo lea pueda
 * comprobarlo, y `verify:escena` lo contrasta contra el `.glb` de verdad.
 */
export const RADIO_DEL_PACK = 2 / Math.sqrt(3);

/** A cuánto hay que subir el pack para que su casa mida dos personas. Sale 5,469. */
export const ESCALA_DEL_PACK = ALTURA_DE_UNA_CASA / ALTURA_DE_LA_CASA_EN_EL_PACK;

/**
 * LO QUE MIDE UNA TESELA DEL SUELO EN EL MUNDO. Consecuencia, no elección.
 *
 * Salen 6,315 de radio, o sea 10,9 de ancho: encima cabe una casa de 4,6 con
 * holgura para un camino al lado, que es exactamente lo que el pack supone.
 */
export const RADIO_DE_TESELA = RADIO_DEL_PACK * ESCALA_DEL_PACK;

/**
 * CUÁNTAS TESELAS TIENE UNA COMARCA DE RADIO. Ésta es la otra decisión.
 *
 * Doce, o sea una comarca de doce teselas de ancho y unas dieciséis filas de
 * fondo: ciento cuarenta y cuatro teselas de suelo por comarca. Es el tamaño que
 * hace que dentro quepa una ciudad —plaza, casas, molino, campos— y no una casa
 * suelta sobre una ficha.
 *
 * Tiene que ser ENTERO, y no por comodidad: con un factor entero, el centro de la
 * comarca (q,r) cae exactamente en el centro de la subtesela (12q, 12r). Si fuera
 * fraccionario, los centros caerían entre teselas, cada comarca tendría el suelo
 * desplazado de forma distinta y el borde entre dos comarcas sería un escalón
 * diferente en cada sitio. La demostración está en `relieve.ts`.
 */
export const TESELAS_POR_RADIO = 12;

/**
 * EL RADIO DE UNA COMARCA. Consecuencia de las dos decisiones anteriores.
 *
 * Salen 75,8, o sea 151,5 de punta a punta. En superficie son casi 15.000 unidades
 * cuadradas por comarca: con una casa ocupando unas veinte, caben cientos.
 */
export const RADIO_DE_COMARCA = RADIO_DE_TESELA * TESELAS_POR_RADIO;

/**
 * LO QUE ANDA UNA PERSONA EN UN SEGUNDO.
 *
 * Cuatro unidades, o sea metro y medio de persona por segundo: el paso vivo de
 * alguien que va a algún sitio. De aquí sale la cifra que decide si una comarca es
 * grande de verdad: 151 unidades de punta a punta son treinta y ocho segundos
 * andando, y eso ya no es un paso entre casillas sino un viaje.
 */
export const PASO_POR_SEGUNDO = 4;

/**
 * EL ESCALÓN DE UNA TERRAZA.
 *
 * La tesela del pack mide 1 de alto, así que un escalón del mundo son 5,47: algo
 * más de dos personas. Es el paso con el que sube el terreno, y no es un número
 * libre — es la altura del canto de la tesela, la misma que se ve en el borde del
 * mundo. Si el relieve subiera de otra cantidad, los cantos de dos terrazas
 * vecinas no cuadrarían y se vería una franja de hueco entre ellas.
 */
export const ALTURA_DE_LA_TESELA_EN_EL_PACK = 1;
export const ESCALON = ALTURA_DE_LA_TESELA_EN_EL_PACK * ESCALA_DEL_PACK;

/**
 * DÓNDE ESTÁ LA LÁMINA DE AGUA respecto de la cara de arriba de su tesela.
 *
 * Medido: `hex_water` no tiene NADA de tierra —su punto más alto está a -0,2 del
 * pack, no a 0— y las teselas de costa ponen su lámina exactamente ahí mismo. Así
 * que el agua de una tesela puesta al nivel `L` se ve a `L·ESCALON + LAMINA`.
 *
 * De aquí sale que el disco de mar tenga que estar a esta cota y no a ojo: puesto más
 * abajo, el borde del tablero enseña una pared de tierra sobre el agua; puesto más
 * arriba, el mar se come la playa de las costas.
 */
export const LAMINA = -0.2 * ESCALA_DEL_PACK;

/** Cuántas personas de alto mide algo. Sirve para juzgar, y para comprobar. */
export function enPersonas(altura: number): number {
  return altura / ALTURA_DE_UNA_PERSONA;
}

/** Cuánto se tarda en cruzar algo andando, en segundos. */
export function segundosAndando(distancia: number): number {
  return distancia / PASO_POR_SEGUNDO;
}
