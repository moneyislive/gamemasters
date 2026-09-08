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
 * EL RELLANO QUE SE APLANA ALREDEDOR DE CADA VÉRTICE, donde se construye.
 *
 * Vivía escrito a mano dentro de `relieve.ts` —`RADIO_DE_TESELA * 2.6`— y sube aquí porque
 * ya no lo usa sólo el relieve: es el suelo llano sobre el que se apoya un asentamiento, y por
 * tanto el trozo de mundo del que la MARCA de ese asentamiento no debería salirse. Dos sitios
 * con el mismo 2,6 escrito a mano discrepan al primer retoque; con uno solo no pueden.
 *
 * Dos comarcas y media de tesela: 16,42 de mundo. Los vértices están a un radio de comarca
 * unos de otros —75,8— así que dos rellanos no se solapan nunca, y ésa es la cuenta de la que
 * `relieve.ts` cuelga su búsqueda del rellano más cercano.
 */
export const TESELAS_DEL_RELLANO = 2.6;
export const RADIO_DEL_RELLANO = RADIO_DE_TESELA * TESELAS_DEL_RELLANO;

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

/**
 * ═══ CUÁNTO TIENE QUE MEDIR UNA MARCA PARA QUE SE VEA IGUAL DESDE DONDE SEA ═══
 *
 * Una marca —un anillo de sitio libre, el zócalo de color de un asentamiento— NO es un
 * objeto del mundo: es un cartel, y tiene que ocupar lo mismo en la PANTALLA esté la cámara
 * pegada al suelo o a las 574,6 unidades desde las que se mira el delta entero, como la
 * chincheta de un mapa.
 *
 * Sin esta cuenta pasa lo que ya pasó dos veces en este árbol, y las dos se vieron igual —no
 * como un fallo, sino como que no había nada—:
 *
 *   · La primera versión de la señal de los sitios se dibujaba del tamaño de una tesela. A la
 *     distancia de la vista de tablero eso son unos pocos píxeles: se dibujaba, costaba sus
 *     llamadas, y la captura salía idéntica a la de antes.
 *   · Y el caso que trae esto aquí: con el encuadre de «Ver el tablero entero», el tablero
 *     recién repartido y el mismo tablero con SEIS chozas y SEIS veredas puestas son
 *     indistinguibles a la vista. Medido en `verify:escena` sobre el `.glb` y sobre el
 *     encuadre de verdad: la casa del jugador mide 6,0 unidades de mundo y ocupa el 1,27 %
 *     del alto de la pantalla, o sea once píxeles en una ventana de novecientos. (El poblado
 *     ENTERO mide 59,2 píxeles, pero está hecho de casas iguales a las del decorado: lo que
 *     no se encuentra no es la mancha, es cuál de esas casas es la tuya.)
 *
 * LA CUENTA: a distancia `lejos`, una lente de campo `campo` abarca `2·lejos·tan(campo/2)` de
 * alto, así que para ocupar la fracción `parte` de la pantalla hay que medir eso por `parte`.
 * Se devuelve en múltiplos de `RADIO_DE_TESELA`, que es lo que quien pinta le pasa a `scale`.
 *
 * ═══ Y SE ACOTA POR LOS DOS LADOS, QUE ES LA MITAD QUE SE OLVIDA ═══
 *
 * Pegada al suelo la cuenta pide una marca de una unidad, que es una china; desde muy lejos
 * pide una que se come tres comarcas. El suelo y el techo los pone quien pinta, porque no son
 * lo mismo para una señal que hay que poder tocar con el dedo que para un zócalo que sólo hay
 * que ver.
 *
 * ═══ POR QUÉ VIVE AQUÍ Y NO EN `delta.tsx` ═══
 *
 * Porque estaba allí, escrita a mano dentro de un `useFrame`, y de ahí no se puede medir: un
 * comprobador de Node que quisiera afirmar que una marca se ve desde la vista de tablero
 * tendría que abrir un contexto de dibujo. Aquí es aritmética, y `verify:escena` la llama con
 * la distancia y el campo de VERDAD del encuadre del delta. Es la misma frontera que separa
 * `paleta.ts` de `delta.tsx`, y la misma razón.
 */
export function tallaDeUnaMarca(
  lejos: number,
  campo: number,
  parte: number,
  suelo: number,
  techo: number,
): number {
  /*
   * Con datos imposibles se devuelve el SUELO y no cero: una marca minúscula sigue siendo una
   * marca, y una marca de tamaño cero —o `NaN`, que es lo que da un `tan` de un campo roto—
   * desaparece sin que nada falle, que es exactamente el fallo que esta función existe para
   * no tener.
   */
  if (!Number.isFinite(lejos) || !Number.isFinite(campo) || lejos <= 0 || campo <= 0) return suelo;
  const quiere = (2 * lejos * Math.tan(campo / 2) * parte) / RADIO_DE_TESELA;
  if (!Number.isFinite(quiere)) return suelo;
  return Math.min(Math.max(quiere, suelo), techo);
}

/**
 * ═══ CUÁNTO OCUPA EN LA PANTALLA LA MARCA DEL DUEÑO DE UNA PIEZA ═══
 *
 * El zócalo es la marca del color de su dueño que llevan las piezas de jugador —un disco bajo
 * el asentamiento, una raya a lo largo de la vereda—, y existe porque en una partida entera
 * nadie consiguió encontrar su propia choza: el tejado de una casa de adorno y el tejado del
 * poblado de alguien son EL MISMO TÉXEL del atlas, y a la distancia de la vista de tablero la
 * casa del jugador mide once píxeles. Lo pinta `delta.tsx`; los números viven aquí porque son los que
 * `verify:escena` mide, y de un `useFrame` no se miden.
 *
 * Esta fracción es el RADIO de la marca contra el alto de la pantalla, que es lo que
 * `tallaDeUnaMarca` devuelve: al 1,4 %, el disco entero —radio uno, con el contorno cerrándolo
 * por dentro— mide 25,2 píxeles de diámetro en una ventana de 900 puntos de alto, y la raya de
 * una vereda 45,4 de largo por 8,6 de ancho contando sus dos flancos.
 *
 * ═══ Y SE ACOTA POR LOS DOS LADOS, PORQUE LOS DOS SE HAN MEDIDO ═══
 *
 * POR ARRIBA: la señal de un sitio libre ocupa el 3,5 %, y hay como mucho cincuenta y cuatro
 * mientras se está eligiendo dónde construir. El zócalo está SIEMPRE y en el peor caso son 126
 * —54 chozas y 72 veredas—. Al 3,5 % las marcas taparían el 33,9 % del delta, y el aire entre
 * una choza y su propia vereda no es que baje: se hace NEGATIVO, las dos se SOLAPAN 9,3. Eso es
 * una alfombra, y `verify:escena` imprime esos dos números al medirlo.
 *
 * (Aquí ponía «el 46 % y el aire bajaría a 1,6». Las dos son de la época del ARO y se
 * arrastraron al cambiar de forma: el aro tapaba menos porque un anillo pone menos tinta que un
 * disco del mismo radio, y el aire salía de un radio de fuera distinto. Rehechas con
 * `npm run verify:escena -w escenas`, que las escribe en su propio mensaje.)
 *
 * POR ABAJO: la marca NO es más grande que la pieza que señala, y ésa es la cifra que estaba
 * mal del todo. Un POBLADO no es el nodo `poblado` del `.glb` —eso es la casa del jugador
 * sola, 11,4 píxeles—: es un caserío de trece grupos, y una ciudad un recinto amurallado de
 * doce. Medidos sobre `piezasDeAsentamiento` y el `.glb`, desde la vista de tablero un
 * poblado mide 59,2 píxeles de diámetro y una ciudad 53,2, contra los 25,2 del disco de un
 * poblado y los 47,9 del de una ciudad. O sea que la marca mide 0,43 y 0,90 veces la pieza, no
 * 2,2 veces.
 *
 * Lo que sí se sostiene —y es lo que el suelo compra— es que el disco pasa de la pieza CENTRAL
 * (11,4 px) y del alto mínimo de trazo. Bajarlo al 0,5 % lo dejaría en 9 píxeles, menos que esa
 * pieza central, y la marca dejaría de leerse antes que el tejado al que apunta. Medido, y con
 * su vacuna.
 *
 * Y HAY UN SUELO QUE ESTA CUENTA NO VE, y costó una vuelta: lo que hay que medir en PÍXELES no
 * es sólo la marca entera sino su TRAZO MÁS FINO. El contorno del disco heredó el grueso que
 * tenía el filo del aro, y a esta fracción eso son 1,1 píxeles; contado en el lienzo, sólo el
 * 37 % de los píxeles del disco azul sobre la montaña pasaba del umbral de color, contra el
 * 73-81 % de las otras tres marcas. El grueso vive en `zocalo.tsx` y allí está el número.
 *
 * Estuvo en el 2,2 % mientras la marca era un aro, y bajó al 1,4 % al pasar a disco y raya: un
 * disco relleno pone más tinta por píxel de ancho que un aro, así que la misma legibilidad sale
 * más pequeña — 499 píxeles cuadrados de tinta contra los 1.038 del aro.
 *
 * Y sus dos topes son distintos de los de la señal por los dos extremos: de cerca puede ser más
 * pequeña, porque no hay que tocarla con el dedo sino sólo verla; y de lejos se le deja menos
 * techo por lo mismo de arriba.
 */
export const ZOCALO_EN_PANTALLA = 0.014;
export const SUELO_DEL_ZOCALO = 0.45;
/* El TECHO ya no es un número suelto y vive abajo, con las dos clases: `TECHO_DEL_ZOCALO`. */

/**
 * ═══ EL DISCO DE UNA CIUDAD ES MÁS GRANDE, Y NO POR IMPORTANCIA: POR TAPADO ═══
 *
 * Éste es el número que arregla el fallo que un jugador nota antes que ningún otro: la pieza
 * más cara del juego era la que menos se encontraba.
 *
 * Un poblado son casas sueltas con calles entre ellas, y el disco asoma por los huecos: medido
 * en el banco con `gl.render` + `readPixels`, comparando el mismo fotograma con la marca y con
 * ella a opacidad cero, un poblado pinta 191 y 238 píxeles de marca. Una CIUDAD no tiene
 * huecos: es un recinto cerrado —seis codos de muralla que dan la vuelta entera, con el
 * castillo dentro— y a la talla de la choza el disco pintaba VEINTINUEVE píxeles, en dos
 * manchas de veinte y nueve. Ampliado no hay un solo píxel de zócalo alrededor del castillo.
 *
 * ═══ LA CUENTA, Y ES UNA MEDIDA POR LOS DOS LADOS ═══
 *
 * Lo que tapa el disco es LA MURALLA, que es lo único que cierra la vuelta: las torres son
 * tres y el disco asoma entre ellas. `verify:escena` mide sobre el `.glb`, con el giro de cada
 * pieza puesto, que esa muralla llega a 12,43 del vértice —y la torre más lejana a 14,07—.
 * Desde la vista de tablero, a 574,6 unidades, el disco al 1,4 % llega a 6,66: cabe debajo con
 * holgura, que es exactamente por lo que no se veía.
 *
 * Al 2,66 % llega a 12,66 desde el centro del encuadre y ASOMA. Medido en el banco con el
 * mismo método —el mismo fotograma con la marca y con ella a opacidad cero, contando lo que
 * cambia más de dos niveles en algún canal y agrupándolo por 4-conectividad—, y sobre la
 * CIUDAD de la apertura de prueba, que está a 549,4 de la cámara y por tanto tiene un disco de
 * 12,11 y no de 12,66:
 *
 *   · a la talla de una choza (6,37 de radio): 28 píxeles, en 3 manchas, la mayor de 24;
 *   · al 2,66 % (12,11): 190-193 píxeles, en 8 manchas, la mayor de 83-86;
 *   · y con el suelo de ciudad puesto (12,63): 254, en 6-7 manchas, la mayor de 117-119.
 *
 * Y la escalera de radios, que es lo que dice que el número no es a ojo: 10,93 → 75 px;
 * 11,66 → 143; 12,39 → 221; 13,12 → 320; 13,85 → 443, movida la talla a mano sobre el mismo
 * fotograma. Un POBLADO del mismo fotograma pinta 177 en 5 manchas, así que la ciudad al
 * 2,66 % se pone a la par de una choza y no por encima de ella.
 *
 * ═══ Y AQUÍ PONÍA 596, QUE NO SALE DE NINGÚN LADO ═══
 *
 * Ponía «pasa de 29 píxeles a 596, con la mancha mayor de 20 a 539». El 29 se sostiene —salen
 * 28—; el 596 no. Rehecho en el banco de verdad, la ciudad al 2,66 % pinta CIENTO NOVENTA
 * píxeles repartidos en ocho manchas, y ninguna de ellas llega a noventa. El 596 no cuadra ni
 * con su propia escalera —entre 12,39 → 221 y 13,12 → 320 no cabe un 596 a 12,66— ni con el
 * techo físico: a esta distancia el disco entero mide 25 píxeles de radio en un lienzo de 900,
 * o sea unos 1.960 píxeles cuadrados contando lo que el recinto tapa, y de ésos se ven 254.
 *
 * LO QUE ESO CAMBIA EN EL ARGUMENTO, dicho sin adornos: la mejora que esta constante compra es
 * de 28 a 190 píxeles —siete veces—, no de 29 a 596 —veinte veces—. Sigue siendo la diferencia
 * entre una marca que no está y una marca que se ve, y el número se queda; pero es MUCHO menor
 * de lo que esta cabecera prometía, y quien venga a subirlo otra vez tiene que saber que el
 * recinto se come el 87 % del disco y que de ahí no se sale agrandándolo.
 *
 * (Todo con `escritorio/banco3d.html` a 1600×900, la cámara en (0; 422,9; 389) —el mismo
 * encuadre que rehace `verify:escena`— mirando al centro, la semilla 0 de la apertura de
 * prueba y su poblado rojo mejorado a ciudad. Se rehace desde la consola: se saca el estado de
 * r3f con `getRootState(canvas)`, se pone el lienzo y la cámara en esos valores, se le da la
 * talla al grupo del zócalo A MANO —que es lo que permite recorrer la escalera sin tocar
 * ninguna constante—, se pinta con `gl.render` y se lee con `readPixels` dos veces, la segunda
 * con la opacidad de sus mallas a cero, y se cuentan las manchas de la diferencia.)
 *
 * ═══ Y EL TOPE POR ARRIBA NO ES EL GUSTO: ES QUE NO TOQUE A SU VECINA ═══
 *
 * Las dos marcas más juntas que puede haber son una choza y una de sus propias veredas, a
 * 37,89. La raya llega a 12,21 desde su centro, así que el disco de la ciudad no puede pasar
 * de 12,84 sin comerse el aire que `verify:escena` exige. El 2,66 % deja 13,02 de aire contra
 * los 12,66 que mide la marca: un 2,8 % de margen, y por eso no es el 2,8 % de pantalla.
 *
 * Y conviene decirlo claro, porque es el hallazgo y no una nota al pie: entre «asomar por
 * fuera de la muralla» (12,43) y «no tocar a la vereda de al lado» (12,84) hay CUATRO
 * DÉCIMAS. El tablero no da para más marca; quien quiera una ciudad más señalada tiene que
 * mover otra cosa —la separación de las piezas o la forma de la marca—, no este número.
 *
 * ═══ LO QUE ESTO CUESTA, DICHO CON NÚMERO Y NO ESCONDIDO ═══
 *
 * Tinta. El disco de un poblado pone 499 píxeles cuadrados y la raya 389, contra los 1.038 del
 * aro que había antes —el 48 % y el 37 %—. El de una ciudad pone 1.800, o sea el 174 % del
 * aro. Es la única de las tres marcas que pesa MÁS que el aro, y no hay forma de que no sea
 * así: un disco relleno del mismo radio que un anillo pone siempre más tinta que él, y para
 * asomar por fuera de la muralla hace falta ese radio. Se paga porque la alternativa medida
 * son 29 píxeles, y 29 píxeles no se encuentran.
 *
 * Y se paga poco: en el tablero hay 54 vértices, pero una partida de Riberas reparte cuatro
 * ciudades por colono. Aun con las 54 puestas a la vez —que no puede pasar— las 126 marcas
 * tapan el 12,4 % del delta, por debajo del 15 % que `verify:escena` exige.
 */
export const ZOCALO_DE_CIUDAD_EN_PANTALLA = 0.0266;

/**
 * ═══ Y UNA FRACCIÓN DE PANTALLA NO PUEDE, SOLA, ASOMAR POR FUERA DE UNA MURALLA ═══
 *
 * Esto es lo que la comprobación de arriba compraba en un punto que no existe.
 *
 * El 2,66 % se eligió con la distancia de la cámara al CENTRO del tablero —574,58—, que da un
 * disco de 12,66 contra los 12,43 de la muralla. Pero la marca no escala con esa distancia:
 * escala con la distancia de la cámara A SU PIEZA, y desde el encuadre de salida los cincuenta
 * y cuatro vértices están entre 431,5 y 821,6. En el más cercano el disco de una ciudad se
 * queda en 9,51 y la muralla lo tapa entero — o sea el mismo fallo que este número vino a
 * arreglar, en la mitad del tablero que está más cerca del ojo. Lo mide
 * `npm run verify:escena -w escenas`, que imprime los dos extremos y el peor vértice.
 *
 * Y NO SE ARREGLA SUBIENDO LA FRACCIÓN: para que el vértice más cercano asomara haría falta el
 * 3,48 %, más que la señal de un sitio libre, y con eso el vértice más lejano se comería a su
 * vecina. Se arregla donde va: en el SUELO. La muralla es un objeto del MUNDO —12,43 fijos— y
 * contra un objeto del mundo el mínimo tiene que ser del mundo. `tallaDeUnaMarca` ya tiene ese
 * tope por abajo; lo que faltaba era que la ciudad tuviera el suyo.
 *
 * ═══ Y EL NÚMERO SÓLO CABE EN UNA VENTANA DE CUATRO CENTÉSIMAS ═══
 *
 * En múltiplos de `RADIO_DE_TESELA`, que es lo que `tallaDeUnaMarca` devuelve:
 *
 *   · por abajo, 1,969 — lo que mide la muralla (12,432 / 6,3148). Menos, y no asoma.
 *   · por arriba, 2,005 — lo que el disco YA mide desde el centro del encuadre (12,662).
 *     Pasarse de ahí agranda la marca también donde no hacía falta, y el aire entre una choza
 *     y su propia vereda, que `verify:escena` mide y que está en 13,02 contra los 12,66 que
 *     mide la más ancha, se queda corto.
 *
 * DOS es el número redondo que cae dentro: 12,630 de mundo, entre los 12,432 que tapa la
 * muralla y los 12,84 a los que empezaría a tocar la vereda de al lado. Es la misma ventana de
 * cuatro décimas que la cabecera de arriba ya decía, vista desde el otro lado.
 *
 * ═══ LO QUE ESTO CAMBIA EN PANTALLA, DICHO Y NO ESCONDIDO ═══
 *
 * La marca de una CIUDAD deja de medir lo mismo en pantalla cuando la cámara se acerca a menos
 * de 573 unidades: de ahí para acá crece con el mundo en vez de quedarse quieta. Es a propósito,
 * y es la única forma de que asome de algo que es del mundo y no de la pantalla. La del POBLADO
 * no cambia nada: sus casas dejan huecos y su marca sigue siendo un cartel de punta a punta.
 */
export const SUELO_DEL_ZOCALO_DE_CIUDAD = 2;

/**
 * ═══ Y EL TECHO ERA UN NÚMERO SUELTO QUE SE TOCA JUGANDO ═══
 *
 * Aquí ponía `TECHO_DEL_ZOCALO = 3.5` para las tres marcas, y ese número no salía de ningún
 * sitio. Se creía inalcanzable —«desde muy lejos»— y se toca con la ventana a medio abrir.
 * Medido con la cámara del cliente de verdad (`ojoDelMirador` con la proporción de la
 * ventana, que es lo que `alejarseParaQueQuepa` retira en retrato), `verify:escena` lo
 * imprime y aquí van las tres formas que lo enseñan:
 *
 *   · MEDIA PANTALLA DE PORTÁTIL, 826×833: la cámara se retira a 1.076 y 38 de los 54 discos
 *     de ciudad se quedan CLAVADOS en el techo.
 *   · EL PANEL DEL NAVEGADOR, 655×922: la cámara a 1.501 y los 54 clavados.
 *   · UN MÓVIL EN RETRATO, 390×844 —que es la app, no un caso raro—: la cámara a 2.308 y
 *     TODO clavado: los 54 discos de ciudad, los 54 de poblado y las 72 rayas, los 126 a 3,5.
 *
 * Y en el techo pasan las tres cosas que el techo existía para no dejar pasar:
 *
 *   · LA CLASE DEJA DE SIGNIFICAR NADA. Con las dos clases clavadas en el mismo tope, la
 *     ciudad y el poblado miden LO MISMO —en el móvil, en los 54 vértices—, y `parteDeLaMarca`
 *     y todo lo que sostiene la constante de arriba no distinguen nada.
 *   · LA MARCA DE UN CAMINO PASA DEL CAMINO. A 3,5 la raya mide 79,6 de largo y la arista que
 *     marca mide 75,8: la marca se sale por las dos puntas y llega a los vértices vecinos.
 *   · Y LAS MARCAS SE COMEN UNAS A OTRAS. A 826×833 el disco de una ciudad (22,10) y la raya
 *     de su propia vereda (28,50) suman 50,60 y están a 37,89: SE SOLAPAN 12,7. Eso es la
 *     alfombra que `ZOCALO_EN_PANTALLA` bajó del 3,5 % al 1,4 % para no tener.
 *
 * ═══ ASÍ QUE SON DOS TECHOS, PORQUE A LAS DOS CLASES NO LAS ATA LO MISMO ═══
 *
 * Todo en múltiplos de `RADIO_DE_TESELA`, que es lo que `tallaDeUnaMarca` devuelve, y todos
 * los límites los rehace `npm run verify:escena -w escenas`, que los imprime.
 *
 * EL DE LA MARCA DE PANTALLA —el poblado y la vereda— tiene una condición que manda sobre
 * todas: NO PUEDE MORDER EN EL ENCUADRE DONDE SE JUEGA. Si muerde ahí, la marca deja de medir
 * lo mismo en pantalla en la mitad del tablero más lejana del ojo, que es literalmente lo que
 * `tallaDeUnaMarca` existe para no dejar pasar. Su ventana:
 *
 *   · por abajo, 1,612 — lo que pide el más lejano de los 126 sitios con la cámara de verdad
 *     a 16:9. Por debajo de ahí el techo muerde donde se juega.
 *   · por arriba, 2,119 — donde el disco de una choza y la raya de su propia vereda, las dos a
 *     esa talla y a 37,89 una de otra, se tocarían.
 *
 * UNO COMA SIETE cae dentro, con un 5 % de holgura sobre lo que el encuadre pide. A esa talla
 * la raya mide 38,65 de largo contra los 75,78 de su arista —la mitad del camino— y llega a
 * 19,67 de su centro.
 *
 * EL DE LA CIUDAD no puede cumplir esa condición, y eso no es un descuido de este número: el
 * encuadre de referencia le pide hasta 3,063 en el vértice más lejano, y a esa talla el disco
 * (19,34) y la raya de su propia vereda (18,60) suman 37,94 y están a 37,89 — se tocan. O sea
 * que EL DISCO DE UNA CIUDAD NO CABE COMO CARTEL EN ESTE TABLERO, y no cabía ya antes de que
 * hubiera techo. Su ventana:
 *
 *   · por abajo, 2,093 — lo que el encuadre de referencia pide en el CENTRO del tablero. Menos
 *     que eso y la marca encogería hasta en medio de la pantalla.
 *   · por arriba, 2,600 — donde el disco se saldría del RELLANO en el que su asentamiento está
 *     plantado (`RADIO_DEL_RELLANO`, 16,42). Y otro más flojo, 2,886: donde tocaría a la raya
 *     de su propia vereda con ésta en su techo.
 *
 * DOS COMA CINCO cae dentro, y NO es un número cómodo del medio: es el más alto que cabe con
 * holgura, y lo alto importa porque de un disco de ciudad sólo se ve el ANILLO QUE ASOMA POR
 * FUERA DE LA MURALLA —lo de dentro lo tapa el recinto—. A 2,2 ese anillo mide 1,46 de ancho y
 * a 2,5 mide 3,36, o sea más del doble. Medido en el banco a 826×833 con el método del
 * fotograma diferencial, sobre las dos ciudades de la apertura:
 *
 *     techo   2,0    2,2    2,4    2,5    2,6    2,8    3,0
 *     roja     42     91    132    161    189    257    320   píxeles
 *     azul     31     67    119    139    169    220    285
 *
 * Y las otras seis marcas del mismo fotograma —dos discos de poblado y cuatro rayas— van de
 * 109 a 172. O sea que a 2,2 la marca de una CIUDAD era la más floja del tablero, que es
 * exactamente el fallo que `ZOCALO_DE_CIUDAD_EN_PANTALLA` vino a arreglar; a 2,5 se pone donde
 * tiene que estar. Lo que compra, medido:
 *
 *   · el disco de una ciudad se queda entre 12,63 —su suelo, lo que hace falta para asomar por
 *     fuera de su muralla— y 15,79: casi un objeto del mundo, que es lo que el suelo ya había
 *     decidido por el otro lado;
 *   · y sigue midiendo SIEMPRE más que el de un poblado —15,79 contra 10,74 con las dos en su
 *     techo—, así que la clase no se pierde en ninguna forma de ventana;
 *   · el par más apretado deja 2,44 de aire con las dos marcas en su techo, en cualquier forma
 *     de ventana. Es poco —dos píxeles y pico en una ventana de 833— y es lo que hay: el
 *     tablero no da para más marca, y de las dos formas de perder, una marca que no se
 *     encuentra pesa más que dos marcas que casi se rozan en la vista de conjunto.
 *
 * ═══ LO QUE ESTO CUESTA, DICHO CON NÚMERO Y NO ESCONDIDO ═══
 *
 * TINTA, y por encima de lo que esta casa llama alfombra. Con las 126 marcas puestas a la vez
 * y las dos clases en su techo —o sea un móvil enseñando el tablero entero, con 54 ciudades
 * que ninguna partida puede poner— la tinta tapa el 22,1 % del delta, contra el 12,4 % del
 * encuadre de referencia y el 15 % que exige el bloque de «no es una alfombra».
 *
 * Y NO SE ARREGLA BAJANDO ESTOS NÚMEROS: con la ciudad en su SUELO —2, que es lo que hace
 * falta para que su muralla no se la trague— y la raya en lo mínimo que el encuadre de
 * referencia pide (1,612), la tinta ya son el 16,0 %. O sea que el 15 % y el suelo de la
 * ciudad son incompatibles en cuanto el techo muerde, y de las dos cosas la que no se puede
 * soltar es la que hace que la marca exista. Queda escrito, con los dos números, en vez de
 * escondido.
 *
 * (Para situarlo: la alfombra medida de verdad —las 126 a la talla de la señal de un sitio
 * libre— es el 33,9 % con las marcas SOLAPÁNDOSE. Aquí no se toca ninguna.)
 *
 * Y TAMAÑO EN PANTALLA: en una ventana pequeña la marca de una CIUDAD se ve más pequeña que a
 * 16:9. Es a propósito y es la única salida: a esa forma de ventana la cámara está al doble de
 * distancia, y una marca que mantuviera su tamaño de pantalla mediría 22 unidades de mundo y
 * se comería a su vecina. El tablero entero desde un móvil es una vista de conjunto; para
 * jugar se acerca, y acercándose la marca vuelve a ser un cartel.
 */
export const TECHO_DEL_ZOCALO = 1.7;
export const TECHO_DEL_ZOCALO_DE_CIUDAD = 2.5;

/**
 * QUÉ FRACCIÓN DE PANTALLA LE TOCA A LA MARCA DE ESTA CLASE DE PIEZA.
 *
 * Vive aquí y no en un `? :` dentro del `useFrame` de `delta.tsx` por la razón de siempre:
 * de dentro de un `useFrame` no se mide, y `verify:escena` llama a esto con las dos clases.
 * La vereda no pasa por aquí porque no tiene clase de pieza: usa `ZOCALO_EN_PANTALLA`.
 */
export function parteDeLaMarca(clase: 'poblado' | 'ciudad'): number {
  return clase === 'ciudad' ? ZOCALO_DE_CIUDAD_EN_PANTALLA : ZOCALO_EN_PANTALLA;
}

/**
 * Y QUÉ TOPE POR ABAJO LE TOCA, que es la otra mitad y por la misma razón: la ciudad lleva el
 * suyo porque lo que la tapa —su muralla— es un objeto del mundo y no encoge con la distancia;
 * el poblado lleva el de siempre. Vive aquí y no en un `? :` dentro del `useFrame`, igual que
 * la fracción, porque de dentro de un `useFrame` no se mide.
 */
export function sueloDeLaMarca(clase: 'poblado' | 'ciudad'): number {
  return clase === 'ciudad' ? SUELO_DEL_ZOCALO_DE_CIUDAD : SUELO_DEL_ZOCALO;
}

/**
 * Y QUÉ TOPE POR ARRIBA, que es la tercera y la que faltaba. Va por clase por lo mismo que la
 * fracción: si las dos clases compartieran techo, en el techo medirían lo mismo y la clase se
 * perdería justo donde más falta hace —en una ventana pequeña, que es donde todo se toca—.
 * Vive aquí y no en un `? :` dentro del `useFrame` por la razón de siempre.
 */
export function techoDeLaMarca(clase: 'poblado' | 'ciudad'): number {
  return clase === 'ciudad' ? TECHO_DEL_ZOCALO_DE_CIUDAD : TECHO_DEL_ZOCALO;
}

/**
 * A QUÉ ALTURA SE APOYA EL ZÓCALO SOBRE EL SUELO DE SU VÉRTICE.
 *
 * Media persona. No a cero: el suelo de un vértice es la cara de arriba de una tesela, y dos
 * superficies en el mismo plano parpadean —se ve como una marca que se enciende y se apaga al
 * girar la cámara, que es peor que no tenerlo—. Y no más alto, porque entonces deja de leerse
 * como el suelo del asentamiento y pasa a ser un halo flotando a su alrededor.
 */
export const ALTO_DEL_ZOCALO = ALTURA_DE_UNA_PERSONA * 0.5;

/**
 * ═══ Y MEDIA PERSONA NO LEVANTA A NADIE POR ENCIMA DE LA COMARCA DE AL LADO ═══
 *
 * Éste es el otro fallo que se ve jugando y que ninguna comprobación miraba: la marca se medía
 * contra la PIEZA —que asome por fuera de la muralla— y nunca contra la TIERRA.
 *
 * Un vértice es la esquina donde se juntan TRES comarcas, y casi nunca están a la misma cota.
 * El disco es un plano HORIZONTAL a `ALTO_DEL_ZOCALO` —1,27— sobre el suelo de su vértice, y
 * un escalón del mundo mide `ESCALON` = 5,47: cuatro veces y media eso. O sea que basta con
 * que la comarca de al lado esté UN escalón más arriba para que el trozo de disco que la pisa
 * quede dentro de la ladera, y que la comarca de al lado esté un escalón más arriba es lo
 * corriente, no lo raro.
 *
 * MEDIDO sobre los 54 vértices con doce relieves y los DOS repartos de terreno —el de
 * `verify:escena` y el del banco, 1.296 medidas—, con el disco a la talla de su techo: al
 * disco de una ciudad la tierra le tapa parte en 194 de las 1.296, y en la peor sólo se ve el
 * 29 % de él. Eso en pantalla no es una marca torcida: es una marca que NO ESTÁ, que es el
 * fallo entero que el zócalo existe para tapar, sólo que ahora depende de con qué comarca
 * limita el vértice.
 *
 * ═══ LA REGLA: SUBIRLA HASTA LA TIERRA QUE PISA, Y COMO MUCHO UN ESCALÓN ═══
 *
 * Se probaron las tres salidas y se midieron las tres. Las dos primeras se descartaron con
 * número, y la segunda de ellas costó una vuelta entera porque parecía la evidente:
 *
 *   · SÓLO SUBIRLA, SIN TOPE: salva todos los vértices, pero en el peor hay que subirla 21,88
 *     —8,6 personas, más alto que la choza que marca—. Un halo flotando sobre el tejado ha
 *     dejado de ser el suelo de un asentamiento.
 *   · RECORTAR EL DISCO hasta donde la tierra lo deja: PARECE lo razonable y es lo contrario.
 *     Recortar no puede añadir ni un píxel: lo que se quita estaba TAPADO, o sea que no
 *     pintaba nada, y lo que se quita de más —el borde del lado abierto— sí pintaba. Medido en
 *     el banco a 826×833, sobre el vértice `v:-2,0|-2,1|-1,0` de la semilla 0, que tiene la
 *     comarca de al lado DOS escalones más arriba a seis unidades: recortado a la mitad pinta
 *     SIETE píxeles; entero y sin subir, 29; entero y subido un escalón, 127 —lo mismo que las
 *     otras siete marcas del mismo fotograma, que van de 109 a 172—. Recortar es la respuesta
 *     que sale de mirar una condición («que el borde entero esté por encima de la tierra») en
 *     vez de mirar lo que se ve.
 *   · SUBIRLA HASTA LA TIERRA QUE PISA, CON UN ESCALÓN DE TOPE: es la que se escribe. Sobre
 *     las 1.296, al disco de una ciudad se le tapa algo en 34 en vez de en 194, y en el peor
 *     se ve el 84 % de él en vez del 29 %; el de un poblado pasa de 86 tapados a 3, y del 40 %
 *     al 88 % en el peor. La subida sale exactamente un escalón, clavada, siempre.
 *
 * ═══ POR QUÉ EL TOPE ES EXACTAMENTE UN ESCALÓN ═══
 *
 * Porque es lo que el mundo pide y ni una pizca más —la subida que hace falta sale un escalón
 * clavado en las 1.296—, y porque un escalón es lo que sube el terreno de una terraza a la
 * siguiente: una marca que sube más de un escalón ha dejado de apoyarse en la tierra de al
 * lado y ha pasado a flotar sobre ella. Lo que un escalón no salva —una comarca DOS escalones
 * más arriba— se queda tapado por ese lado, y el disco sigue asomando entero por el otro.
 *
 * ═══ Y NO SE MIRA SÓLO EL BORDE: SE MIRA EL DISCO ENTERO ═══
 *
 * Porque lo que hay que subir no es lo que el borde pisa sino lo que pisa la marca, y esas dos
 * cosas se separan en cuanto el terreno sube por dentro. Se muestrea por ANILLOS DE ÁREA IGUAL
 * —cada muestra pesa lo mismo—, así que la misma cuenta sirve para decir qué parte del disco
 * se ve, que es lo que `verify:escena` mide.
 *
 * ═══ Y ESTO VIVE AQUÍ, SIN IMPORTAR NADA, A PROPÓSITO ═══
 *
 * El relieve entra por la puerta como una función `(x, z) → altura`, así que `verify:escena`
 * la ejerce con un terreno de mentira —un vértice pegado a una montaña, escrito a mano— sin
 * generar un mundo, y con el relieve de verdad cuando quiere medir el tablero. Si esto viviera
 * dentro del `useFrame` de `delta.tsx` no se podría medir ninguna de las dos cosas, que es la
 * historia que este árbol ya tiene escrita tres veces.
 */
export const SUBIDA_MAXIMA_DEL_ZOCALO = ESCALON;

/**
 * CUÁNTOS ANILLOS Y CUÁNTOS RADIOS SE MIRAN, y por qué los anillos van por ÁREA IGUAL.
 *
 * El radio del anillo `k` es `radio·√(k/n)`, no `radio·k/n`: así cada anillo cubre la misma
 * superficie y cada muestra pesa lo mismo. Repartidos a radios iguales, el centro del disco
 * —que es donde está la pieza y donde menos importa lo que haya— pesaría cuatro veces lo que
 * pesa el borde.
 *
 * Se calcula UNA vez por sitio y no por fotograma, así que 48 × 48 son 2.304 consultas a una
 * tabla en memoria por asentamiento, y no hay ninguna razón para escatimarlas.
 */
export const ANILLOS_DEL_ASIENTO = 48;
export const RADIOS_DEL_ASIENTO = 48;

/** Dónde se apoya la marca, con la tierra que va a pisar mirada. */
export interface AsientoDeLaMarca {
  /** A qué altura sobre el SUELO DE SU VÉRTICE se apoya. `ALTO_DEL_ZOCALO` si no hay cuesta. */
  readonly alto: number;
}

/**
 * DÓNDE SE ASIENTA LA MARCA DE UN SITIO, mirando la tierra que va a pisar.
 *
 * Se recorre el disco entero por anillos de área igual y se sube la marca hasta la tierra MÁS
 * ALTA que pisa, sin pasar de un escalón. Lo que esté más arriba de un escalón se deja donde
 * está: subir hasta ahí sería un halo, y recortar el disco para no tocarlo sólo le quitaría
 * píxeles al lado que sí se ve. Las dos cosas están medidas en la cabecera.
 *
 * `tierraEn` es `relieve.alturaEn` en el plano de la malla; se recibe como función para que
 * este fichero siga sin importar nada y para que se pueda ejercer con un terreno escrito a
 * mano.
 */
export function asientoDeLaMarca(
  tierraEn: (x: number, y: number) => number,
  centroX: number,
  centroY: number,
  suelo: number,
  radio: number,
): AsientoDeLaMarca {
  if (!Number.isFinite(radio) || radio <= 0 || !Number.isFinite(suelo)) {
    return { alto: ALTO_DEL_ZOCALO };
  }
  const tope = suelo + SUBIDA_MAXIMA_DEL_ZOCALO;
  let arriba = suelo;
  for (let k = 1; k <= ANILLOS_DEL_ASIENTO; k++) {
    const suRadio = radio * Math.sqrt(k / ANILLOS_DEL_ASIENTO);
    for (let a = 0; a < RADIOS_DEL_ASIENTO; a++) {
      /* Los anillos van a medio paso unos de otros, para no alinear las muestras en radios. */
      const angulo = (2 * Math.PI * (a + (k % 2) * 0.5)) / RADIOS_DEL_ASIENTO;
      const suya = tierraEn(centroX + Math.cos(angulo) * suRadio, centroY + Math.sin(angulo) * suRadio);
      if (Number.isFinite(suya) && suya > arriba && suya <= tope) arriba = suya;
    }
  }
  return { alto: arriba - suelo + ALTO_DEL_ZOCALO };
}

/** Cuántas personas de alto mide algo. Sirve para juzgar, y para comprobar. */
export function enPersonas(altura: number): number {
  return altura / ALTURA_DE_UNA_PERSONA;
}

/** Cuánto se tarda en cruzar algo andando, en segundos. */
export function segundosAndando(distancia: number): number {
  return distancia / PASO_POR_SEGUNDO;
}
