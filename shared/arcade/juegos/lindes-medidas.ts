/**
 * LAS MEDIDAS DE LAS LINDES QUE DECIDEN DÓNDE HAY ALGO, y de dónde sale cada una.
 *
 * ═══ POR QUÉ VIVEN EN `shared/` Y NO EN `escenas/lindes/medidas.ts` ═══
 *
 * Porque desde el paso 3 de `docs/BOOTS-ON-BOARD.md` el reparto de piezas de una losa dejó de
 * ser decorado: de él sale con qué se choca (`lindes-mundo.ts`), y eso lo tienen que derivar
 * IGUAL el aparato y el servidor. El servidor no compila `escenas/` por su cuenta, y un fichero
 * de `shared/` que importara de allí pasaría `verify:pureza` en verde arrastrando la
 * trigonometría de `escala.ts` —ese comprobador barre ficheros, no sigue importaciones—. Así que
 * los números se MUDAN, no se importan.
 *
 * `escenas/lindes/medidas.ts` las reexporta, y sus consumidores no se enteran: sigue habiendo
 * UNA sola verdad sobre cuánto mide una losa. Allí se quedan las que son sólo de pintar —el
 * grueso del cartón, el presupuesto de triángulos, el labriego—.
 *
 * ═══ NINGUNA SE ELIGIÓ: TODAS SALEN DE MEDIR EL PACK ═══
 *
 * Las piezas son las del pack hexagonal que ya levanta el delta de Riberas
 * (`escenas/modelos/tablero.glb`), y éstas son sus medidas de verdad:
 *
 *     una tesela del pack .......... 2 de ancho, 1 de alto, 2,309 de fondo
 *     un tramo de muralla .......... 2 de largo, 1,1 de alto
 *     una casa ..................... 0,875 × 1,28 × 1,099
 *     un árbol ..................... 0,574 × 1,196
 *     una valla .................... 1,155 de largo
 *     un trigal .................... 1,874 × 2,094
 *     una persona .................. 2,543 en unidades del MUNDO
 *
 * De ahí sale lo único que hubo que decidir: **una losa mide TREINTA Y DOS unidades de pack de
 * lado**. El porqué de treinta y dos —y de que valiera cuatro hasta que Miguel lo revocó
 * mirándolo— está en la cabecera de `escenas/lindes/medidas.ts`, que es donde se discutió.
 *
 * ═══ Y TODO LO DEMÁS SE DERIVA ═══
 *
 * Las profundidades, los anchos y las alturas de aquí abajo son fracciones del lado. El día que
 * el lado cambie no hay catorce números que ajustar a mano.
 *
 * ═══ LAS CUENTAS SON LAS MISMAS, OPERACIÓN A OPERACIÓN ═══
 *
 * Cada constante se calcula con las mismas multiplicaciones y divisiones, en el mismo orden, que
 * cuando vivía en `escenas/`. No es pulcritud: `(2,543 × 2) / 0,93` y `2,543 × (2 / 0,93)` NO dan
 * el mismo último bit, y de ese bit cuelga en qué celda cae una casa. La mudanza se midió
 * sacando el reparto de las 24 clases por sus 4 giros antes y después.
 */

/* ─── LA ESCALA DEL PACK: la cadena de `escenas/escala.ts`, sus cuatro primeros eslabones ─── */

/**
 * CUÁNTO MIDE UNA PERSONA. Es la unidad de referencia de todo.
 *
 * Medido sobre `Knight.glb` del Character Pack. No se redondea a 2 ni se «normaliza» a 1,8: los
 * personajes de KayKit son achaparrados a propósito.
 *
 * Vivía en `escenas/escala.ts`, que la sigue exportando: la toma de aquí. Se mudó con los tres
 * siguientes porque `ESCALA_DEL_PACK` es una DIVISIÓN de dos de ellos, y copiar el resultado
 * habría dejado dos verdades —una en `escenas/`, otra aquí— con un solo comprobador encima.
 */
export const ALTURA_DE_UNA_PERSONA = 2.543;

/** CUÁNTO QUEREMOS QUE MIDA UNA CASA: dos personas. Es lo que hace que una puerta parezca una puerta. */
export const ALTURA_DE_UNA_CASA = ALTURA_DE_UNA_PERSONA * 2;

/**
 * CUÁNTO MIDE LA CASA DENTRO DEL PACK, medido y no supuesto.
 *
 * `building_home_A_*` da 0,930 de alto en `escenas/modelos/tablero.glb`. `verify:escena` lo
 * vuelve a medir sobre el fichero de verdad y protesta si se ha movido.
 */
export const ALTURA_DE_LA_CASA_EN_EL_PACK = 0.93;

/** A cuánto hay que subir el pack para que su casa mida dos personas. Sale 5,469. */
export const ESCALA_DEL_PACK = ALTURA_DE_UNA_CASA / ALTURA_DE_LA_CASA_EN_EL_PACK;

/* ─── LA LOSA ────────────────────────────────────────────────────────────── */

/** Lo que mide el lado de una losa, en unidades del pack. */
export const LADO_EN_PACK = 32;

/** Lo que mide el lado de una losa, en unidades del mundo. */
export const LADO_DE_LOSA = LADO_EN_PACK * ESCALA_DEL_PACK;

/**
 * LA RETÍCULA DEL SUELO: en cuántas celdas se parte una losa.
 *
 * Cuarenta y ocho por lado. Con la losa en 175 eso son celdas de 3,65 —una casa y media—, que es
 * la resolución a la que el borde entre la villa y el prado deja de verse escalonado desde la
 * cámara de mesa. Por qué una retícula y no un polígono recortado, y por qué 2.304 celdas no son
 * 4.608 triángulos: en `escenas/lindes/medidas.ts`, junto al suelo que se pinta.
 */
export const CELDAS_POR_LOSA = 48;

/** Lo que mide una celda del suelo. */
export const LADO_DE_CELDA = LADO_DE_LOSA / CELDAS_POR_LOSA;

/* ─── LA VILLA ───────────────────────────────────────────────────────────── */

/**
 * HASTA DÓNDE ENTRA UNA VILLA DESDE SU MURALLA, y en CHAFLÁN.
 *
 * Con menos, una villa de un solo lado es una franja que no sujeta ni tres casas; con más, la
 * villa de tres lados se come el prado del sur y el labriego que se planta ahí no tiene dónde
 * ponerse.
 *
 * La banda no es un rectángulo: a cada paso que entra, se estrecha lo mismo por los dos
 * extremos. Sin el chaflán, la villa de una losa con muralla al NORTE se derramaba por sus bordes
 * ESTE y OESTE trece celdas de cuarenta y ocho, y una losa con campo en su oeste pegada a ésta
 * enseñaba muralla contra hierba en un cuarto de la raya mientras las reglas contaban campo
 * contra campo. Lo cazó `verify:lindes-escena` comparando las dos rayas celda a celda. Con el
 * chaflán, lo que hay en el borde de una losa depende SÓLO de lo que ese lado enseña, que es la
 * única forma de que dos losas cualesquiera casen.
 */
export const FONDO_DE_LA_VILLA = 0.27;

/**
 * EL ANCHO DEL EJE QUE UNE LAS MURALLAS DE UNA MISMA VILLA.
 *
 * Es la diferencia entre `calle` y `dos-murallas-enfrentadas`: las dos enseñan muralla al este y
 * al oeste, y en la primera van UNIDAS. Una villa con más de un lado dibuja además una franja de
 * este ancho desde cada muralla hasta el punto donde se juntan; sin unir no se dibuja y el prado
 * pasa por el medio, que es exactamente lo que dice el catálogo.
 */
export const ANCHO_DEL_EJE = 0.22;

/** Lo que se acerca al centro el punto donde se juntan las murallas de una villa. */
export const TIRON_AL_CENTRO = 0.45;

/**
 * EL NÚCLEO DE UNA VILLA DE TRES O CUATRO MURALLAS.
 *
 * Las bandas entran en chaflán y eso deja un hueco en medio cuando la villa ocupa tres o cuatro
 * lados. El núcleo lo tapa, y su radio es el fondo más un pellizco para que solape con las
 * bandas: un borde a tocar deja una raya de hierba de una celda que se ve como una grieta.
 */
export const NUCLEO_DE_LA_VILLA = FONDO_DE_LA_VILLA + 0.09;

/**
 * HASTA DÓNDE LLEGA EL CHAFLÁN DE UNA BANDA DE MURALLA.
 *
 * El chaflán sólo tiene que garantizar que en el borde de los lados VECINOS no haya muralla, y
 * para eso basta con que la banda se estreche cerca del canto. Corriendo hasta el fondo, la villa
 * de un solo lado salía como un trapecio y el tablero se veía lleno de puntas de flecha grises.
 */
export const CHAFLAN_DE_LA_VILLA = 0.12;

/* ─── LA SENDA ───────────────────────────────────────────────────────────── */

/**
 * EL ANCHO DE UNA SENDA, en fracción del lado.
 *
 * Valía 0,11 con la losa en cuatro, y en 175 eso sería una calzada de diecinueve unidades: siete
 * personas de ancho. Un camino de carro mide dos carros de ancho y punto.
 */
export const ANCHO_DE_LA_SENDA = 0.05;

/**
 * LO QUE UN CAMINO SALE RECTO DE SU BORDE ANTES DE DOBLAR.
 *
 * Una décima del lado: lo justo para que la huella que deja en la raya sea el ancho del camino y
 * no una banda en diagonal. El porqué entero está en `haciaDentro`, en `lindes-reparto.ts`.
 */
export const ENTRADA_RECTA_DE_LA_SENDA = 0.1;

/**
 * CUÁNTO SE HUNDE UNA SENDA RESPECTO AL PRADO.
 *
 * Un camino de tierra está gastado, no pintado: se hunde lo que un carro hunde la rodada. En
 * unidades del PACK y no en fracción del lado: un socavón no es más hondo porque la losa sea más
 * grande.
 */
export const HUNDIDO_DE_LA_SENDA = ESCALA_DEL_PACK * 0.22;

/** Y cuánto se levanta el suelo de una villa: está empedrado y pisado. */
export const ALZADO_DE_LA_VILLA = ESCALA_DEL_PACK * 0.12;

/* ─── LO QUE SE PONE ENCIMA ──────────────────────────────────────────────── */

/**
 * CUÁNTAS PIEZAS DE RELLENO COMO MUCHO POR LOSA.
 *
 * No es un ahorro: es la condición para que el tablero exista. Una casa del pack cuesta 1.393
 * triángulos, y setenta y dos losas rellenas a la densidad de antes no caben en ningún techo. El
 * tope subió de veintidós a sesenta y bajó a cuarenta y dos al medir el presupuesto entero; lo
 * que la losa grande compra es SITIO, no más piezas. La cuenta está en `TOPE_DE_TRIANGULOS`, en
 * `escenas/lindes/medidas.ts`.
 */
export const PIEZAS_POR_LOSA = 42;

/**
 * LO QUE SE AGRANDAN LAS PIEZAS DEL PACK, y por qué no van a tamaño natural.
 *
 * El pack está hecho para la tesela hexagonal de Riberas —dos unidades de ancho— y aquí la unidad
 * de composición es sesenta y cuatro veces mayor: una casa a tamaño natural sería una caseta de
 * perro. Y NO todas se agrandan lo mismo: lo que se agranda es la JERARQUÍA. Las alturas que
 * salen, para poder discutirlas:
 *
 *     casa .................. 1,28 × 5,469 × 2,2  =  15,4   (6 personas)
 *     muralla ............... 1,10 × 5,469 × 2,33 =  14,0   (5 personas y media)
 *     torre (atalaya) ....... 2,49 × 5,469 × 1,4  =  19,0   (7 personas y media)
 *     el que manda .......... 1,65 × 5,469 × 2,8  =  25,2   (10 personas)
 *     ermita ................ 0,85 × 5,469 × 3,2  =  14,9   (6 personas)
 */
export const ESCALA_DE_LA_CASA = 2.2;
export const ESCALA_DE_LA_TORRE = 1.4;
export const ESCALA_DEL_QUE_MANDA = 2.8;
export const ESCALA_DE_LA_ERMITA = 3.2;

/**
 * LA ESCALA DE LA MURALLA, y las celdas que cubre un tramo, que son EL MISMO NÚMERO mirado de dos
 * maneras.
 *
 * Un `muro` del pack mide 2 de pack. Agrandado 2,33 veces mide 25,5 del mundo, que son
 * exactamente SIETE CELDAS de la retícula. Escribir las dos cosas a mano sería tener dos números
 * para lo mismo, y el día que uno cambie el otro deja los muros solapados o con hueco entre ellos.
 */
export const CELDAS_POR_MURO = 7;
export const ESCALA_DE_LA_MURALLA = (CELDAS_POR_MURO * LADO_DE_CELDA) / (2 * ESCALA_DEL_PACK);

/**
 * EL SETO DE UNA LINDE: lo mismo, para la `valla`.
 *
 * Una `valla` del pack mide 1,155 de pack a lo largo. Agrandada 1,6 veces mide 10,1 del mundo, y
 * para que un seto cubra un tramo sin huecos y SIN SOLAPARSE hace falta saber cuántas celdas cubre
 * cada una: 2,8, o sea que se pone una cada tres. La primera versión ponía una cada tres celdas
 * estirada 2,7 veces, cada valla montada encima de las dos siguientes, y desde la mesa se leía
 * como una trama de rayas cruzando el campo.
 */
export const ESCALA_DEL_SETO = 1.6;
export const LARGO_DE_LA_VALLA_EN_PACK = 1.155;
export const CELDAS_POR_SETO = Math.max(
  1,
  Math.round((LARGO_DE_LA_VALLA_EN_PACK * ESCALA_DEL_PACK * ESCALA_DEL_SETO) / LADO_DE_CELDA),
);
