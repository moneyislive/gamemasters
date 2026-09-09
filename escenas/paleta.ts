/**
 * DE QUÉ ESTÁ HECHO CADA TERRENO: color plano y celda del atlas.
 *
 * ═══ POR QUÉ ESTO NO ESTÁ DENTRO DE `delta.tsx` ═══
 *
 * Porque estaba, y no se podía probar. `delta.tsx` importa `three` y usa JSX: un
 * guion de Node que lo importara para mirar la tabla de colores arrastraría el
 * motor de dibujo entero, y `verify:escena` dejaría de poder correr en la batería.
 *
 * Aquí vive lo que es DATO y CUENTA —de qué color es cada terreno, qué celda del
 * atlas le toca, cuántos puntos lleva un número— y allí lo que es pintado. La
 * frontera es la misma que ordena el árbol: se separa por lo que se puede
 * comprobar, no por lo que va junto en la pantalla.
 *
 * ═══ EL ATLAS ES UNA PALETA, Y ESO LO CAMBIA TODO ═══
 *
 * La textura del pack de KayKit son 1024×1024 píxeles repartidos en OCHO columnas
 * por CUATRO filas de manchas lisas, cada una con un degradado vertical de claro a
 * oscuro. No hay dibujo: no hay hierba pintada, ni vetas de piedra, ni arena. Lo
 * único que hace la textura es dar color, y el degradado hace de sombreado —por eso
 * la cara de arriba de una tesela se ve más clara que su canto sin que haya ninguna
 * luz calculándolo.
 *
 * Está medido, no supuesto: `hex_grass` tiene sus setenta vértices dentro de la
 * celda (0,2), con `v` entre 0,576 y 0,712; `hex_water` entera en la (1,1); y
 * `hex_coast_A` reparte los suyos entre la hierba (0,2), el agua (1,1) y la arena
 * (4,2). O sea que la diferencia entre una tesela de hierba y una de arena es
 * ÚNICAMENTE a qué celda apuntan sus UV.
 *
 * De ahí sale `celda`: mover las UV de la tesela de hierba a otra celda da la
 * tesela de ese bioma, con su degradado y todo. Los colores de la tabla son los que
 * se midieron dentro del atlas, no colores inventados que se parezcan.
 */

/** Una celda del atlas: columna 0..7 de izquierda a derecha, fila 0..3 de arriba abajo. */
export type CeldaDelAtlas = readonly [number, number];

/** Cuántas celdas tiene el atlas. Si el pack cambia de textura, esto cambia con ella. */
export const COLUMNAS_DEL_ATLAS = 8;
export const FILAS_DEL_ATLAS = 4;

/**
 * LA CELDA EN LA QUE VIENEN PINTADAS LAS TESELAS DEL PACK.
 *
 * Todas las teselas de suelo del pack gratuito son de hierba, así que todas
 * apuntan aquí. Es el ORIGEN del desplazamiento: para hacer una tesela de arena se
 * mueven sus UV de esta celda a la de la arena.
 */
export const CELDA_DE_LA_HIERBA: CeldaDelAtlas = [0, 2];

/**
 * ¿ESTÁ ESTA UV DENTRO DE LA CELDA DE LA HIERBA?
 *
 * Hace falta porque una tesela del pack NO apunta entera a una sola celda. La lisa
 * sí, pero la de camino reparte sus vértices entre la hierba y la tierra pisada, y
 * las de río y costa entre la hierba, el agua y la arena. Desplazar la lámina entera
 * al cambiar de bioma arrastraba también esas franjas, y el camino salía del color
 * de otra cosa — se leía como una decisión de arte y era un desplazamiento mal
 * acotado.
 *
 * El margen es de media celda hacia dentro y no cero: las UV de los bordes de una
 * mancha caen justo en la frontera, y con una comparación estricta la mitad de un
 * triángulo se movía y la otra mitad no.
 */
export function esDeLaHierba(u: number, v: number): boolean {
  const columna = Math.floor(u * COLUMNAS_DEL_ATLAS);
  const fila = Math.floor(v * FILAS_DEL_ATLAS);
  return columna === CELDA_DE_LA_HIERBA[0] && fila === CELDA_DE_LA_HIERBA[1];
}

/** Lo que hay que sumar a las UV de una tesela de hierba para llevarla a otra celda. */
export function desplazamientoDeCelda(destino: CeldaDelAtlas): { u: number; v: number } {
  return {
    u: (destino[0] - CELDA_DE_LA_HIERBA[0]) / COLUMNAS_DEL_ATLAS,
    v: (destino[1] - CELDA_DE_LA_HIERBA[1]) / FILAS_DEL_ATLAS,
  };
}

/**
 * LA CELDA DE LA NIEVE, y el color con el que se pinta en plano.
 *
 * Es la mancha blanca del atlas, medida: va de `#f6f8f8` arriba a `#b3bfc5` abajo. El
 * degradado hace el trabajo — la cara de arriba de la tesela sale blanca y el canto
 * gris azulado, que es exactamente cómo se ve la nieve sobre roca.
 *
 * La nieve no es un terreno del juego: es una capa que se pone ENCIMA de cualquier
 * bioma cuando pasa de cierta altura. Por eso no está en `PALETA` — una montaña
 * nevada sigue produciendo piedra.
 */
export const CELDA_DE_LA_NIEVE: CeldaDelAtlas = [1, 0];

/**
 * LA CELDA DE LA ARENA, para las riberas.
 *
 * Es la misma que usan las teselas de costa del pack para su playa —medido: los
 * vértices de arena de `hex_coast_A` caen en la celda (4,2)— así que la ribera de un
 * río y la playa de un lago salen del mismo color exacto y no de dos beiges que casi
 * casan.
 */
export const CELDA_DE_LA_ARENA: CeldaDelAtlas = [4, 2];
export const COLOR_DE_LA_NIEVE = '#e8eef1';

/**
 * LA CELDA DEL COLOR DEL JUGADOR, y por qué el pack sólo necesita traer una.
 *
 * ═══ CUATRO CASTILLOS QUE ERAN EL MISMO CASTILLO ═══
 *
 * El pack trae cada pieza de jugador en cuatro ficheros —azul, rojo, verde, amarillo—
 * y el compilador los metía los cuatro. Medido después, comparando byte a byte las
 * posiciones de los vértices: las cuatro variantes tienen la MISMA geometría exacta.
 * Lo único que cambia son las UV, y ni siquiera todas: en el castillo se mueven 837
 * vértices de 8.868, y los 8.031 restantes se quedan donde están.
 *
 * Los que se mueven salen todos de UNA celda del atlas, la (0,3), y se mueven UNA
 * columna por color. O sea que la fila 3 del atlas son los cuatro colores de jugador
 * uno al lado del otro, y el pack pinta la misma malla apuntando a uno u otro.
 *
 * Así que se compila SÓLO la variante azul y las otras tres salen aquí, moviendo esas
 * UV. Es exactamente la misma técnica con la que se pintan los biomas veinte líneas más
 * arriba: mover la UV de los vértices de UNA celda, y sólo de ésa.
 *
 * ═══ CUÁNTO AHORRA DE VERDAD, QUE NO ES LO QUE PARECÍA ═══
 *
 * La primera cuenta dijo 58.812 vértices, un tercio del fichero, y estaba MAL: sumaba
 * los vértices nodo a nodo, y `dedup` ya compartía un mismo accesor de posiciones entre
 * las cuatro variantes. Las posiciones repetidas no estaban repetidas en el fichero.
 *
 * Lo que sí estaba por cuadruplicado eran las UV, que son el único atributo que cambia
 * de color a color. Medido comparando el `.glb` antes y después: 4.606 kB → 4.209 kB,
 * o sea 397 kB, un 8,6 %, y 21 nodos menos. Es menos de lo que parecía y sigue
 * mereciendo la pena, porque un `.glb` es un binario y no se guarda por diferencias:
 * cada recompilación mete otra copia entera en la historia del repositorio.
 *
 * El peso que queda son 114.929 vértices con posición, normal y UV en `float32`: 32
 * bytes cada uno, 3,5 MB. Ahí el lever de verdad es cuantizar —`KHR_mesh_quantization`
 * los deja en unos 14 bytes, y three lo carga sin decodificador— pero eso cambia el
 * contrato de carga: `aplana` aplica matrices sobre los atributos, y una matriz
 * aplicada sobre enteros de 16 bits los destroza. Merece su propio cambio y su propia
 * comprobación, no un apaño de paso.
 *
 * ═══ POR QUÉ EL AZUL ES EL ORIGEN ═══
 *
 * Porque es la columna 0 de la fila, medido. Podría ser cualquiera si se ajustara la
 * tabla, pero el que está en la columna cero es el único que hace que todos los
 * desplazamientos sean hacia la derecha y ninguno negativo.
 */
export const CELDA_DEL_JUGADOR: CeldaDelAtlas = [0, 3];

/**
 * EN QUÉ COLUMNA DE ESA FILA ESTÁ CADA COLOR.
 *
 * Medido sobre el `.glb`, comparando las UV de cada variante con las de la azul: el
 * rojo está a +0,125 —una columna de ocho—, el amarillo a +0,25 y el verde a +0,375.
 * No es el orden en que el pack nombra sus carpetas, y por eso está medido y escrito
 * aquí en vez de deducido del orden de `COLORES_DE_JUGADOR`.
 */
export const COLUMNA_DEL_COLOR: Readonly<Record<string, number>> = {
  blue: 0,
  red: 1,
  yellow: 2,
  green: 3,
};

/**
 * ¿ES ESTA UV DE LA PARTE QUE LLEVA EL COLOR DEL JUGADOR?
 *
 * Hace falta por lo mismo que `esDeLaHierba`: una pieza de jugador NO apunta entera a
 * la celda del color. El castillo tiene piedra, madera y tejado, y sólo el tejado y los
 * estandartes son del color. Mover la lámina entera dejaría el castillo de un solo
 * color plano.
 */
export function esDelColorDelJugador(u: number, v: number): boolean {
  const columna = Math.floor(u * COLUMNAS_DEL_ATLAS);
  const fila = Math.floor(v * FILAS_DEL_ATLAS);
  return columna === CELDA_DEL_JUGADOR[0] && fila === CELDA_DEL_JUGADOR[1];
}

/**
 * LO QUE HAY QUE SUMARLE A LA UV DE UNA PIEZA AZUL PARA QUE SEA DE OTRO COLOR.
 *
 * Un color desconocido no mueve nada, y sale azul. Es la misma decisión que
 * `TERRENO_DESCONOCIDO`: un dato que llega de fuera no puede dejar la escena en negro.
 */
export function desplazamientoDeColor(color: string): { u: number; v: number } {
  const columna = COLUMNA_DEL_COLOR[color] ?? COLUMNA_DEL_COLOR['blue'] ?? 0;
  return { u: (columna - CELDA_DEL_JUGADOR[0]) / COLUMNAS_DEL_ATLAS, v: 0 };
}

/**
 * LAS CUATRO COLUMNAS DE LA FILA DEL COLOR QUE SON DE UN JUGADOR, y por qué no son ocho.
 *
 * La fila 3 del atlas tiene ocho manchas y sólo las cuatro primeras son los colores de
 * jugador; de la 4 a la 7 hay otros tonos del pack, y los usan piezas de verdad. Medido
 * sobre `tablero.glb`: la HERRERÍA pinta 187 vértices en la columna 2 —su color de
 * jugador— y 41 en la 4; el TALLER, 611 en la 2 y 18 en la 4; la ERMITA, 120 en la 1 y 80
 * en la 5; y el MUELLE reparte 44 en la 0 y 388 entre la 5, la 6 y la 7.
 *
 * O sea que «mover la fila 3 entera» habría repintado del color del dueño trozos que no
 * son suyos, y en tres de los catorce edificios del caserío. Se deriva de
 * `COLUMNA_DEL_COLOR` y no se escribe, para que añadir un quinto color no deje esta
 * frontera atrás.
 */
export const COLUMNAS_DE_JUGADOR: ReadonlySet<number> = new Set(
  Object.values(COLUMNA_DEL_COLOR),
);

/**
 * ¿ES ESTA UV DE ALGUNO DE LOS CUATRO COLORES DE JUGADOR, VENGA DE DONDE VENGA?
 *
 * `esDelColorDelJugador` pregunta por la celda (0,3), que es de donde salen las piezas de
 * jugador porque el pack las distribuye en azul. Ésta pregunta por las CUATRO, y hace
 * falta desde que el caserío del paisaje también se recolorea: la casa de adorno pinta su
 * tejado en la columna 1, la iglesia en la 0, la taberna en la 2 y el mercado en la 3, así
 * que no hay una celda de origen única y la pregunta tiene que ser «¿esto lleva un color
 * de colono?» y no «¿esto es azul?».
 */
export function esDeUnColorDeJugador(u: number, v: number): boolean {
  const columna = Math.floor(u * COLUMNAS_DEL_ATLAS);
  const fila = Math.floor(v * FILAS_DEL_ATLAS);
  return fila === CELDA_DEL_JUGADOR[1] && COLUMNAS_DE_JUGADOR.has(columna);
}

/**
 * LO QUE HAY QUE SUMARLE A ESTA UV PARA QUE PASE A SER DEL COLOR PEDIDO.
 *
 * Se calcula desde la columna en la que el vértice YA ESTÁ, y ésa es toda la diferencia
 * con `desplazamientoDeColor`: aquélla vale para una lámina entera que se sabe que sale de
 * la celda del jugador; ésta vale vértice a vértice, y por eso puede llevar al azul una
 * casa que era roja y una iglesia que era azul sin saber de antemano de dónde viene cada
 * una. Devuelve cero para un vértice que ya está en su sitio, que es lo que permite
 * reconocer una variante que no mueve nada y ahorrarse el clon de su geometría.
 *
 * Un color desconocido no mueve nada y sale azul, igual que en `desplazamientoDeColor` y
 * por lo mismo: un dato que llega de fuera no puede dejar la escena en negro.
 */
export function saltoAlColor(u: number, color: string): number {
  return saltoALaColumna(u, columnaDelColor(color));
}

/** La columna de la fila del color en la que está un color de jugador; uno desconocido, el azul. */
export function columnaDelColor(color: string): number {
  return COLUMNA_DEL_COLOR[color] ?? COLUMNA_DEL_COLOR['blue'] ?? 0;
}

/**
 * LO QUE HAY QUE SUMARLE A ESTA UV PARA QUE PASE A LA COLUMNA PEDIDA de la fila del color,
 * venga de la columna que venga. Es `saltoAlColor` sin el nombre del color por medio, y
 * hace falta desde que el caserío del paisaje se lleva a columnas que NO son de ningún
 * jugador (`COLUMNAS_DEL_CASERIO`). Cero para un vértice que ya está donde se le pide.
 */
export function saltoALaColumna(u: number, columna: number): number {
  const suya = Math.floor(u * COLUMNAS_DEL_ATLAS);
  return (columna - suya) / COLUMNAS_DEL_ATLAS;
}

/**
 * ═══ LAS TRES COLUMNAS DEL CASERÍO DEL PAISAJE: LOS PARDOS DE LA FILA DEL COLOR ═══
 *
 * ═══ EL FALLO, DICHO POR QUIEN JUGABA ═══
 *
 * Miguel (9-sep-2026): «las construcciones procedurales tienen los mismos colores que las
 * de los jugadores y eso confunde bastante; me gustaría que el resto de las construcciones
 * fueran de otro color: marrón claro, grisáceo, gama de marrones, pero sin ser el mismo
 * que el marrón de madera». El pueblo del paisaje pintaba sus tejados en las cuatro
 * columnas de jugador —la casa en el rojo, la iglesia en el azul…— y, teñido del color de
 * quien fundaba al lado, seguía llevando un color de colono: el de otro, o el propio, que
 * hace que un pueblo parezca una ciudad de alguien.
 *
 * ═══ LO QUE SE ELIGIÓ, MIDIENDO LAS TREINTA Y DOS CELDAS DEL ATLAS ═══
 *
 * Las tres columnas de la derecha de la MISMA fila del color, que es lo que permite llevar
 * un tejado allí con el mismo salto horizontal con el que se tiñe una pieza. Medidas sobre
 * la tabla compilada del atlas (media de la celda, franja clara, franja oscura), y sus
 * distancias CIE76 al colono más cercano y a la madera de la celda (6,0), `#995841`:
 *
 *     (5,3)  #c5b197  (#decfbb → #ac9273)  L* 73   pardo claro     colono 46,5  madera 36,8
 *     (6,3)  #978675  (#bbab9a → #736150)  L* 57   pardo grisáceo  colono 45,7  madera 27,7
 *     (7,3)  #746459  (#998779 → #4f4138)  L* 44   pardo oscuro    colono 45,3  madera 25,7
 *
 * Es exactamente la gama que pidió —claro, grisáceo, oscuro— y ninguna es la madera: la
 * madera es un rojizo saturado y éstas son pardos apagados. La cuarta columna de esa fila,
 * la (4,3) `#f89946`, es el otro naranja del pack y está a 5,6 del amarillo: no vale, y
 * `verify:escena` lo afirma para que nadie la meta «porque también es de la fila». Las
 * distancias se vuelven a medir allí sobre la tabla de verdad; aquí están escritas para
 * quien lea, no para que nadie se fíe de ellas.
 *
 * El tono se elige por COMARCA (`caserio.ts`), no por edificio: cada aldea de su piedra, y
 * los grupos de dibujo —comarca × modelo— no se multiplican por tres.
 */
export const COLUMNAS_DEL_CASERIO: readonly number[] = [5, 6, 7];

/**
 * ═══ EL COLOR DE CADA JUGADOR EN PLANO, Y POR QUÉ HACÍA FALTA MEDIRLO ═══
 *
 * ═══ EL FALLO, QUE SALIÓ JUGANDO Y NO LEYENDO ═══
 *
 * Un revisor jugó una partida entera de Riberas en tres dimensiones y NO consiguió
 * señalar ni una sola vez su propia choza. La captura del tablero recién repartido
 * —cero piezas— y la del mismo tablero con SEIS chozas y SEIS veredas puestas son
 * indistinguibles a la vista con el encuadre de «Ver el tablero entero».
 *
 * La causa está medida sobre `modelos/tablero.glb`, contando los vértices de cada
 * pieza que caen en la fila 3 del atlas —la fila donde el pack pone los cuatro
 * colores de jugador, uno por columna—:
 *
 *     casa (adorno)       384 vértices en la columna 1  → ROJO
 *     iglesia, acena,     551, 496, 98, 473, 326        → AZUL
 *     mina, concejo, vigía
 *     taberna, herrería,  142, 187, 611                 → AMARILLO
 *     taller
 *     mercado, aserradero,112, 272, 160, 304            → VERDE
 *     pozo, cuadras
 *     ---------------------------------------------------------------
 *     poblado (jugador)   288 vértices en la columna 0, desplazada por color
 *     ciudad  (jugador)   837
 *
 * O sea que el tejado de una casa de adorno y el tejado del poblado de alguien no
 * son colores PARECIDOS: son EL MISMO TÉXEL. La distancia entre ellos es cero, y
 * `poblar.ts` reparte casas por todas las comarcas. La cabecera de
 * `compilar-modelos.ts` dice que eso está resuelto «por TIPO, porque las piezas de
 * jugador son casa y castillo y ningún edificio de adorno es una casa ni un
 * castillo». No es cierto: el adorno `casa` es `building_home_B_red` y la pieza de
 * jugador es `building_home_A_blue`. Son la misma clase de edificio, y uno de los
 * dos lleva el rojo de un colono.
 *
 * ═══ LO QUE SE HACE CON ESTO — Y ESTO CAMBIÓ, Y LA CABECERA DECÍA LO CONTRARIO ═══
 *
 * Aquí ponía que «recolorear el decorado exigiría recompilar el `.glb`», y de ahí salía
 * que la única salida fuera darle a la pieza de jugador algo que el decorado no tuviera.
 * Era falso, y lo falso era el «recompilar»: el color de un edificio son unas UV
 * apuntando a una columna de la fila 3, y llevarlas a otra columna es lo mismo que ya se
 * hacía para fabricar las piezas de los cuatro jugadores desde una sola.
 *
 * ═══ Y VOLVIÓ A CAMBIAR (9-sep-2026): EL PAISAJE YA NO LLEVA NINGÚN COLOR DE COLONO ═══
 *
 * La primera salida fue teñir el pueblo del color de quien fundaba al lado (`caserio.ts`,
 * con un radio y un desempate). Arreglaba lo que se pidió y dejaba en pie lo siguiente, que
 * Miguel vio jugando: «las construcciones procedurales tienen los mismos colores que las de
 * los jugadores y eso confunde bastante». Un pueblo rojo alrededor de una choza roja parece
 * una ciudad del rojo, y un pueblo rojo lejos de todos parece de alguien. Así que ahora:
 *
 *   · EL CASERÍO DEL PAISAJE ES PARDO. Sus vértices de color de colono se llevan a una de
 *     las tres columnas de la derecha de la misma fila —`COLUMNAS_DEL_CASERIO`, medidas
 *     abajo—, un tono por comarca (`caserio.ts`). Ningún tejado del paisaje comparte téxel
 *     con ninguna pieza: la distancia mínima a los cuatro colores es 45,3 CIE76, medida.
 *
 *   · EL ASENTAMIENTO DEL JUGADOR SÍ SE TIÑE. Las tres casas y el pozo que rodean su choza
 *     (`asentamiento.ts`) salen del mismo catálogo y siguen yendo al color del dueño con
 *     `saltoAlColor`, por lo mismo de siempre: un poblado azul con tres casas rojas fue la
 *     frase con la que llegó el primer encargo.
 *
 *   · Y LA PIEZA SIGUE LLEVANDO SU ZÓCALO: la señal fina que dice dónde está el VÉRTICE
 *     EXACTO. Un poblado ocupa el 1,27 % del alto de la pantalla, once píxeles en una
 *     ventana de novecientos; sin la marca no se encuentra. La marca se bajó de volumen —un
 *     disco translúcido de 25 píxeles en vez de un aro opaco de 42— cuando el pueblo teñido
 *     hacía el trabajo grueso; ahora ese trabajo lo hacen las tres casas teñidas y la
 *     bandera del asentamiento, y la marca sigue diciendo el vértice. Lo pinta `delta.tsx`
 *     y necesita el color en hexadecimal, que es lo que hay aquí.
 *
 * ═══ Y POR QUÉ ESTOS SEIS DÍGITOS Y NO OTROS ═══
 *
 * Están MEDIDOS dentro del atlas, en las UV que de verdad usa la pieza del jugador:
 * se toman los 288 vértices del `poblado` que caen en la celda del color, se les
 * aplica `desplazamientoDeColor` y se promedia el color de la tabla del atlas en
 * esos puntos. No son «un azul que pega». `verify:escena` vuelve a hacer esa medida
 * sobre el `.glb` y el atlas de verdad y compara, así que el día que el pack cambie
 * de paleta esto se pone rojo en vez de quedarse escrito — que es lo que le pasó a
 * la frase de `compilar-modelos.ts` de aquí arriba.
 *
 * El zócalo NO se pinta con la textura por lo mismo que los caminos, y está dicho en
 * `tipos.ts`: es geometría propia, no una pieza del pack a la que se le mueven las
 * UV. Para geometría propia hace falta un color, y el color tiene que ser el mismo
 * que lleva la pieza encima o el zócalo señalaría a otro.
 */
export const COLOR_LLANO_DEL_JUGADOR: Readonly<Record<string, string>> = {
  blue: '#236dae',
  red: '#c92630',
  yellow: '#f8a34a',
  green: '#007d52',
};

/**
 * ═══ EL FILO DEL ZÓCALO, Y POR QUÉ LA MARCA NO PUEDE SER SÓLO DE COLOR ═══
 *
 * Porque MEDIDO no se ve. El zócalo se posa sobre el suelo de su isla, y ese suelo sale
 * del atlas: el verde de jugador es `#007d52` y la celda del bosque —que es la que
 * pinta el carrizal de Riberas— es `#008454`. Son CUATRO unidades de CIE76 a pelo, y con
 * el relleno a su opacidad de 0,55 se quedan en 2,3, o sea el mismo color; el amarillo
 * sobre la vega en 8,1 y sobre la duna en 16,6, y el umbral con el que esta casa mide que
 * una superficie no se come una pieza es 20. Un disco verde sobre un carrizal es un disco
 * que no está, y el carrizal es uno de los seis terrenos: en un delta de diecinueve islas
 * hay tres o cuatro.
 *
 * Retocar los cuatro colores de jugador para apartarlos de los seis terrenos no es una
 * salida: son los colores QUE LLEVA LA PIEZA dentro del atlas, así que cambiarlos aquí
 * haría que la marca señalara con un color distinto del tejado al que señala.
 *
 * Y LA MEZCLA ADITIVA TAMPOCO, que era la salida elegante y se descartó con número: una
 * marca que suma luz en vez de sustituir color se separa del suelo 11,2 en el peor par
 * —el rojo sobre la duna— y, peor todavía, sobre esa misma arena el verde y el amarillo se
 * separan ENTRE SÍ 13,6, porque los cuatro se van al blanco a la vez. Una marca que sobre
 * dos de los seis terrenos deja de decir de quién es no vale para lo único que hace.
 *
 * La salida es la de siempre para un trazo sobre un fondo cualquiera: un FILO. Casi negro,
 * finísimo y pegado al borde de la forma —el contorno del disco, los dos flancos de la
 * raya—, y entonces lo que tiene que separarse del terreno es el filo —uno solo, y siempre
 * el mismo— y no los cuatro colores. Compuesto con su opacidad se separa de los seis
 * terrenos por lo menos 35,6. Es exactamente lo que el tablero plano ya hace con cada isla,
 * y por eso el casi negro es el mismo: `#1d1f26`.
 *
 * NO SE IMPORTA DE `riberas.ts`, donde vive como `BORDE_DE_LA_ISLA`, y es a propósito:
 * la escena no puede depender de una constante de un juego —pinta el delta de quien se lo
 * mande— y el valor coincide porque los dos resuelven el mismo problema, no porque uno
 * lea al otro. `verify:escena` mide que este filo se separa de los seis terrenos y de los
 * cuatro colores de jugador, así que el día que dejaran de coincidir se vería aquí.
 */
export const FILO_DEL_ZOCALO = '#1d1f26';

/**
 * EL COLOR DE UN JUGADOR, con reserva para el que no se conozca.
 *
 * Un color que no esté en la tabla sale AZUL, exactamente como en
 * `desplazamientoDeColor` y por lo mismo: un dato que llega de fuera no puede dejar
 * una pieza sin zócalo — una pieza sin zócalo es una pieza que no se encuentra, que
 * es el fallo que esto existe para tapar.
 */
export function colorLlanoDelJugador(color: string): string {
  return COLOR_LLANO_DEL_JUGADOR[color] ?? (COLOR_LLANO_DEL_JUGADOR['blue'] as string);
}

/** Un terreno: cómo se pinta en plano y de qué celda del atlas sale su suelo. */
export interface Terreno {
  /** El color para el tablero plano y para cuando no hay textura. */
  color: string;
  /** La celda del atlas de la que sale el suelo de este bioma. */
  celda: CeldaDelAtlas;
  /**
   * CUÁNTA LUZ SE LE DEJA AL SUELO, entre cero y uno. Sin poner, uno: la tesela tal y
   * como viene del pack, que es lo que llevan cinco de los seis.
   *
   * Existe por un bioma concreto y por un problema que sólo se ve jugando: el suelo del
   * CANTIL sale de la misma mancha gris del atlas que las piedras que se le ponen
   * encima, así que las rocas desaparecían contra su propio suelo. No es un problema de
   * paleta —el gris es el que le toca, y cambiarlo lo apartaría del bien que rinde— sino
   * de que dos cosas del mismo color están una encima de la otra.
   *
   * Se resuelve donde está el problema: oscureciendo el SUELO —casi la mitad de la luz— y dejando la roca
   * como está, que es lo que hace que se despegue. Multiplica el color del material, así
   * que no repinta la textura ni inventa un tono nuevo: es la misma piedra con menos luz.
   *
   * Sólo lo lee el tablero de tres dimensiones. En el plano no hay nada encima de nada,
   * así que ahí no hay contraste que arreglar y `color` manda solo.
   */
  tinte?: number;
}

/**
 * LOS TERRENOS DEL VOCABULARIO CLÁSICO, que son de donde sale todo lo demás.
 *
 * La celda de cada uno sale del bien que produce, que es como los reconoce quien
 * juega: la arcilla es la mancha de barro del atlas, la piedra la gris, el desierto
 * la de arena. El bosque es el verde oscuro y la pradera el verde claro de la
 * hierba, que es la tesela por defecto del pack.
 *
 * ═══ EL CAMPO TUVO LA CELDA DE LA HIERBA, Y ERAN DOS TESELAS IGUALES ═══
 *
 * El campo apuntaba a la (0,2), la misma que la pradera, y aquí abajo se justificaba
 * con que en el mundo los distinguen «los sembrados de encima». Eso es falso y se
 * comprueba abriendo `delta.tsx`: la ÚNICA cosa que ese fichero lee de esta tabla es
 * `terrenoDe(terreno).celda` —una sola vez, al clonar la geometría de cada tesela—, no
 * planta nada por terreno y no mira `color` para ninguna tesela. O sea que dos terrenos
 * con la misma celda son el mismo píxel, y como los seis de Riberas se componen de
 * éstos, la SALINA y la VEGA salían indistinguibles en el tablero de tres dimensiones.
 *
 * Antes de emparejar los vocabularios la salina tenía celda propia y sí se distinguía:
 * el arreglo del tablero plano rompió el otro sin que nada se pusiera rojo.
 *
 * Así que el campo se lleva la (3,1), que está medida contra el atlas del pack igual
 * que todas las demás: `#d19846` de media, un dorado de sembrado, a 33,6 CIE76 de la
 * hierba. Encaja con el campo mejor que la hierba porque lo que el campo rinde es
 * GRANO, y la mancha verde es pasto. La regla que impide que esto vuelva a pasar es
 * una comprobación —dos terrenos de Riberas no comparten celda— y vive en
 * `server/scripts/verificar-riberas.ts`, no en un comentario.
 *
 * ═══ EL ROJIZO DE LA COLINA NO ES EL DE SU CELDA, Y ESO ES A PROPÓSITO ═══
 *
 * La celda de la arcilla es la (2,1), y medida da un marrón: `#b27052` en la franja
 * clara, `#7d3d2c` en la oscura, `#995842` de media — el mismo tono exacto que la
 * madera de la (6,0). En tres dimensiones eso da igual, porque ahí el color lo pone
 * la textura y lo único que decide esta tabla es a qué celda apuntan las UV.
 *
 * Pero en el tablero PLANO y en la CARTA no hay textura: hay este hexadecimal y
 * nada más, y un ladrillo marrón al lado de una duna de arena se lee como dos
 * tierras del mismo barro. Así que el color plano se lleva al terracota que el pack
 * sí tiene medido —la celda (7,0), `#be5e2f` de media, `#f17b36` arriba—, que es el
 * naranja con el que están pintados sus tejados y su cerámica.
 *
 * O sea: la celda sigue siendo la del barro, porque el suelo del mundo es de barro;
 * el color plano es el del ladrillo cocido, porque lo que la carta enseña es el bien
 * y no el suelo. Distancia al amarillo de la vega y a la arena de la duna: se mide,
 * y la mide `verify:riberas`.
 */
const CLASICOS = {
  bosque: { color: '#3f6b45', celda: [1, 2] },
  pradera: { color: '#8fae55', celda: [0, 2] },
  campo: { color: '#d9b04a', celda: [3, 1] },
  colina: { color: '#be5e2f', celda: [2, 1] },
  montana: { color: '#7d8590', celda: [2, 2], tinte: 0.55 },
  desierto: { color: '#e3d5a6', celda: [4, 2] },
} satisfies Record<string, Terreno>;

/**
 * QUÉ TERRENO CLÁSICO ES CADA TERRENO DE RIBERAS: EL QUE PRODUCE SU MISMO BIEN.
 *
 * ═══ EL FALLO QUE ESTA TABLA REPARA, Y CÓMO SE VEÍA ═══
 *
 * Los seis de Riberas tenían aquí su propia fila, con celda y color elegidos por el
 * NOMBRE del terreno: una marisma verdosa porque las marismas son verdes, una salina
 * blanquecina porque la sal es blanca, un carrizal verde medio porque el carrizo es
 * hierba alta. Cada fila, por separado, era defendible.
 *
 * Juntas eran ilegibles. La carta de junco —que es la madera de este juego— salía
 * verde claro y la de sal blanquecina, mientras el tablero pintaba el bosque de otro
 * verde y la marisma de un tercero; y quien miraba una carta verde clara y buscaba
 * dónde se produce encontraba dos hexágonos verdes que no eran ése. El vocabulario se
 * había unificado al de Riberas y el dibujo se quedó pintando por sinónimos.
 *
 * ═══ POR QUÉ ES UNA TABLA DE PAREJAS Y NO SEIS FILAS MÁS ═══
 *
 * Porque lo que hay que decir no es «de qué color es una marisma», sino «una marisma
 * ES la colina de este juego» — rinde limo, que es el ladrillo. Escrito como seis
 * filas de color, mañana alguien retoca el verde del bosque y el carrizal se queda
 * atrás sin que falle nada. Escrito como pareja, no puede pasar: el color y la celda
 * del carrizal SON los del bosque, la misma referencia y no una copia.
 *
 * La correspondencia sale de `RINDE` en `shared/arcade/juegos/riberas.ts`, dicha aquí
 * como está dicha `TERRENO_DEL_BIEN` y por el mismo motivo: `escenas/` no puede
 * importar las reglas. Y como está dicha dos veces, hay quien lo vigile —
 * `verify:riberas` compara esta tabla contra `RINDE` de verdad, terreno a terreno.
 */
export const CLASICO_DEL_TERRENO_DE_RIBERAS: Readonly<
  Record<string, keyof typeof CLASICOS>
> = {
  /* carrizal rinde junco, que es la madera: bosque. */
  carrizal: 'bosque',
  /* marisma rinde limo, que es el ladrillo: colina. */
  marisma: 'colina',
  /* salina rinde sal, donde otros juegos ponen lana: pradera. */
  salina: 'pradera',
  /* vega rinde grano: campo. */
  vega: 'campo',
  /* cantil rinde piedra: montaña. */
  cantil: 'montana',
  /* duna no rinde nada, como el desierto no rinde nada: desierto. */
  duna: 'desierto',
};

/**
 * CADA TERRENO, y qué pasa con uno que no conozcamos.
 *
 * Un juego trae los terrenos que quiera y esta tabla no puede conocerlos todos. Lo
 * importante es lo de abajo, en `terrenoDe`: un terreno desconocido NO revienta la
 * escena ni deja un hueco negro. Es la lección de `MUEBLES[m.mueble]`, que este
 * repositorio ya pagó una vez: un `Record` de claves finitas indexado con un dato
 * que llega por la red devuelve `undefined` sin que el compilador diga nada, y
 * revienta al pintar.
 *
 * ═══ POR QUÉ EL COLOR Y LA CELDA NO SON LO MISMO ═══
 *
 * Porque los pinta gente distinta. La CELDA es lo único que decide el aspecto de un
 * hexágono en tres dimensiones: `delta.tsx` clona la tesela de hierba y le mueve las
 * UV a esa celda, y ni lee `color` ni planta nada encima. El COLOR es lo único que
 * hay en el tablero plano y en la carta de un bien, donde no hay textura ninguna.
 *
 * Así que un terreno necesita las dos cosas y las dos tienen que separarlo de los
 * demás por su cuenta: dos terrenos con la misma celda son el mismo píxel en el
 * mundo aunque sus hexadecimales disten treinta unidades, y dos con el mismo color
 * son el mismo polígono en el plano aunque sus celdas estén en filas distintas. Ésa
 * es exactamente la trampa por la que el campo y la pradera compartieron la celda de
 * la hierba una temporada — ver arriba, en `CLASICOS`.
 *
 * ═══ Y POR QUÉ LOS DE RIBERAS NO ESTÁN ESCRITOS ═══
 *
 * Porque no son terrenos distintos: son los mismos vistos desde otro juego. Se
 * componen aquí a partir de `CLASICO_DEL_TERRENO_DE_RIBERAS`, así que `PALETA` tiene
 * doce llaves pero seis verdades, y no hay forma de que la marisma y la colina se
 * separen sin que alguien borre una línea a propósito.
 */
export const PALETA: Readonly<Record<string, Terreno>> = {
  ...CLASICOS,
  ...Object.fromEntries(
    Object.entries(CLASICO_DEL_TERRENO_DE_RIBERAS).map(
      ([deRiberas, clasico]) => [deRiberas, CLASICOS[clasico]] as const,
    ),
  ),
};

/**
 * El terreno de reserva.
 *
 * El color es un gris que se ve RARO a propósito entre teselas de colores: un
 * terreno sin entrada en la tabla tiene que cantar, no disimular. Si fuera un verde
 * razonable, nadie se enteraría de que falta una entrada.
 */
export const TERRENO_DESCONOCIDO: Terreno = { color: '#5b5f66', celda: [6, 1] };

/** Lo que sabemos de un terreno, o lo de reserva si esta versión no lo conoce. */
export function terrenoDe(terreno: string): Terreno {
  return PALETA[terreno] ?? TERRENO_DESCONOCIDO;
}

/**
 * DE QUÉ TERRENO SALE CADA BIEN. Sirve para darle a la carta el color de su tierra.
 *
 * La tabla dice el TERRENO y no el color, y ésa es la mitad que importa: si mañana se
 * retoca el verde del bosque, la carta de junco se retoca con él. Dos sitios con el
 * mismo color escrito a mano acaban discrepando; uno derivado del otro no puede.
 *
 * Son los cinco de Riberas, y la tabla no se inventa: es `RINDE` de `riberas.ts` dicha
 * aquí. Estaban los del catán —madera, ladrillo, lana— de cuando el tablero todavía no
 * hablaba con el motor; no se traducen a los de Riberas en ningún sitio, se sustituyen,
 * porque el juego nombra sus bienes y lo que tiene que adaptarse es el dibujo.
 *
 * Duplicar `RINDE` aquí tiene un motivo y una consecuencia. El motivo: `escenas/` no puede
 * importar `riberas.ts` —sería la escena opinando de reglas—. La consecuencia: si un día
 * cambia qué rinde una marisma, esto no se entera. Por eso `verify:escena` lo vigila.
 */
export const TERRENO_DEL_BIEN: Readonly<Record<string, string>> = {
  limo: 'marisma',
  junco: 'carrizal',
  sal: 'salina',
  piedra: 'cantil',
  grano: 'vega',
};

/** El color de la carta de un bien: el de su terreno. Uno desconocido sale de reserva. */
export function colorDelBien(bien: string): string {
  const terreno = TERRENO_DEL_BIEN[bien];
  return terreno === undefined ? TERRENO_DESCONOCIDO.color : colorDeTerreno(terreno);
}

/** El color de un terreno, o el de reserva si esta versión no lo conoce. */
export function colorDeTerreno(terreno: string): string {
  return terrenoDe(terreno).color;
}

/**
 * CUÁNTOS PUNTOS LLEVA UN NÚMERO.
 *
 * Son las formas de sacarlo con dos dados: el 2 y el 12 salen de una sola
 * combinación, el 7 de seis. Se calcula en vez de escribirse en una tabla porque
 * una tabla a mano es una tabla que alguien copia mal — y `verify:escena` la
 * contrasta contra los treinta y seis resultados por fuerza bruta, así que
 * «optimizar» esta fórmula rompe una comprobación en vez de un tablero.
 *
 * Fuera del 2..12 devuelve cero en vez de un número negativo: un juego puede usar
 * otro reparto de dados y esto no es quién para negarse.
 */
export function puntosDeLaCifra(cifra: number): number {
  const formas = 6 - Math.abs(7 - cifra);
  return formas > 0 ? formas : 0;
}
