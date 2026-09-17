/**
 * LAS MEDIDAS DE LAS LINDES, y de dónde sale cada una.
 *
 * ═══ NINGUNA SE ELIGIÓ: TODAS SALEN DE MEDIR EL PACK ═══
 *
 * Es la misma disciplina que `escenas/burgo/ciudad.ts` tiene escrita en su §0 —
 * las tres medidas que mandan allí salieron de medir los ocho packs, no de que
 * sonaran bien—. Aquí las piezas son las del pack hexagonal que ya levanta el
 * delta de Riberas (`escenas/modelos/tablero.glb`), y éstas son las medidas de
 * verdad, tomadas del fichero:
 *
 *     una tesela del pack .......... 2 de ancho, 1 de alto, 2,309 de fondo
 *     un tramo de muralla .......... 2 de largo, 1,1 de alto
 *     una casa ..................... 0,875 × 1,28 × 1,099
 *     un árbol ..................... 0,574 × 1,196
 *     una valla .................... 1,155 de largo
 *     un trigal .................... 1,874 × 2,094
 *     una persona (`escala.ts`) .... 2,543 en unidades del MUNDO
 *
 * De ahí sale lo único que hubo que decidir: **una losa mide TREINTA Y DOS unidades
 * de pack de lado**.
 *
 * ═══ ESTO VALÍA CUATRO, Y LA DECISIÓN LA REVOCA MIGUEL MIRÁNDOLO ═══
 *
 * Con cuatro la cuenta cuadraba —dos tramos de muralla por lado, una casa por cada
 * cinco de losa— y el tablero se veía. Lo que NO se veía era una COMPOSICIÓN: con
 * una villa de cuatro por uno y medio no hay sitio para una manzana con su calle,
 * ni para una muralla con dos torres y una puerta, ni para una arboleda al lado de
 * un trigal sin que se toquen. Cabían las piezas y no cabía lo que se hace con
 * ellas — y eso se ve en cuanto se mira: parecía una maqueta apretada.
 *
 * Ocho veces más de lado son SESENTA Y CUATRO veces más de suelo, y lo que compran
 * es exactamente lo que faltaba:
 *
 *   1. DIECISÉIS TRAMOS DE MURALLA por lado, no dos. Una muralla deja de ser un
 *      pedacito de tapia y pasa a ser un recinto, con sus torres y su puerta.
 *   2. Una villa admite MANZANAS: grupos de casas con calles entre ellos, una plaza
 *      con su pozo, un edificio que manda. Con cuatro, «la villa» eran cuatro casas
 *      pegadas.
 *   3. Con la escala del pack (5,469), una losa mide 175 del mundo y una persona
 *      2,543: SESENTA Y NUEVE personas por lado. Ahí el paseo de la capa 12
 *      significa algo — cruzar una losa andando cuesta un cuarto de minuto, y por
 *      dentro de una villa hay calles por las que andar.
 *
 * Y lo que NO compran, que es lo que hay que vigilar: más piezas. Sesenta y cuatro
 * veces el suelo con sesenta y cuatro veces las piezas es la misma maqueta apretada
 * en grande. Lo que crece es el HUECO entre las cosas — ver `PIEZAS_POR_LOSA`.
 *
 * ═══ Y TODO LO DEMÁS SE DERIVA ═══
 *
 * Las profundidades, los anchos y las alturas de aquí abajo son fracciones del
 * lado. No es elegancia: es que el día que el lado cambie —y cambiará, porque lo
 * decide cómo se ve en un móvil— no haya catorce números que ajustar a mano.
 */
import { ESCALA_DEL_PACK } from '../escala';

/** Lo que mide el lado de una losa, en unidades del pack. */
export const LADO_EN_PACK = 32;

/** Lo que mide el lado de una losa, en unidades del mundo. */
export const LADO_DE_LOSA = LADO_EN_PACK * ESCALA_DEL_PACK;

/** La mitad, que sale en todas las cuentas de posición. */
export const MEDIA_LOSA = LADO_DE_LOSA / 2;

/**
 * EL GRUESO DE LA LOSA, y por qué se ve.
 *
 * Una losa de este juego es una FICHA DE CARTÓN que alguien pone encima de la
 * mesa, y eso tiene que leerse: sin grueso, el tablero parece un mapa pintado y
 * se pierde de un golpe lo que hace que el juego se vea —que cada pieza la puso
 * alguien—.
 *
 * Un cincuentavo del lado y no un veinteavo, que es lo que era cuando la losa medía
 * cuatro: el grueso de un cartón NO crece con el tamaño de la ficha, y un veinteavo
 * de 175 sería un bordillo de nueve unidades —tres personas y media— por el que
 * nadie podría subir andando.
 */
export const GRUESO_DE_LOSA = LADO_DE_LOSA / 50;

/**
 * LA RETÍCULA DEL SUELO: en cuántas celdas se parte una losa para pintarla.
 *
 * Cuarenta y ocho por lado. Con la losa en 175 eso son celdas de 3,65 —una casa y
 * media—, que es la resolución a la que el borde entre la villa y el prado deja de
 * verse escalonado desde la cámara de mesa.
 *
 * ═══ Y 2.304 CELDAS POR LOSA NO SON 4.608 TRIÁNGULOS ═══
 *
 * Serían 331.776 triángulos de suelo para las setenta y dos, o sea un tercio del
 * techo entero gastado en un plano. No pasa porque las celdas SEGUIDAS DE LA MISMA
 * CLASE se funden en un solo rectángulo antes de convertirse en geometría: un prado
 * de cuarenta y ocho celdas de ancho es UN rectángulo, no cuarenta y ocho. Con eso
 * una losa cuesta entre veinte y doscientos triángulos según lo picada que esté, y
 * el tablero entero no llega a veinte mil. La cuenta la hace `suelo.ts`, y está
 * ahí y no aquí porque es cómo se construye la malla y no una medida.
 *
 * ═══ POR QUÉ UNA RETÍCULA Y NO UN POLÍGONO RECORTADO ═══
 *
 * Porque un recorte exacto de la villa contra la senda contra el prado es un
 * problema de geometría plana con casos especiales —una senda que entra en una
 * villa, dos villas que se tocan por una esquina— y cada caso especial es un
 * fallo que no da error: se ve como un pico de hierba dentro de una muralla.
 * Con la retícula, cada celda pregunta «¿qué hay AQUÍ?» y no hay casos: la
 * respuesta es una de tres. El precio es un borde escalonado de un doceavo de
 * losa, que a la escala a la que se mira el tablero no se distingue de un borde
 * dibujado — y que además se parece a cómo están pintadas las losas de cartón.
 */
export const CELDAS_POR_LOSA = 48;

/** Lo que mide una celda del suelo. */
export const LADO_DE_CELDA = LADO_DE_LOSA / CELDAS_POR_LOSA;

/**
 * HASTA DÓNDE ENTRA UNA VILLA DESDE SU MURALLA.
 *
 * Tres décimas del lado. Con menos, una villa de un solo lado es una franja que
 * no sujeta ni tres casas; con más, la villa de tres lados se come el prado del
 * sur y el labriego que se planta ahí no tiene dónde ponerse.
 */
export const FONDO_DE_LA_VILLA = 0.27;

/**
 * EL ANCHO DEL EJE QUE UNE LAS MURALLAS DE UNA MISMA VILLA.
 *
 * ═══ ESTE NÚMERO ES LA DIFERENCIA ENTRE `calle` Y `dos-murallas-enfrentadas` ═══
 *
 * Las dos losas enseñan muralla al este y al oeste. En la primera las dos van
 * UNIDAS y en la segunda no, y ésa es toda la diferencia: una es una villa de dos
 * losas y la otra son dos villas de una. Si el suelo no lo enseñara, la mesa
 * tendría que acordarse de qué losa era cuál.
 *
 * Así que una villa con más de un lado dibuja además un EJE: una franja de este
 * ancho desde cada muralla hasta el punto donde se juntan. Con dos murallas
 * enfrentadas y unidas sale un pasadizo que cruza la losa; sin unir no se dibuja
 * nada y el prado pasa por el medio, que es exactamente lo que dice el catálogo.
 */
export const ANCHO_DEL_EJE = 0.22;

/** Lo que se acerca al centro el punto donde se juntan las murallas de una villa. */
export const TIRON_AL_CENTRO = 0.45;

/**
 * EL ANCHO DE UNA SENDA, en fracción del lado.
 *
 * Valía 0,11 con la losa en cuatro, y en 175 eso sería una calzada de diecinueve
 * unidades: siete personas de ancho, o sea una avenida imperial cruzando un campo
 * de trigo. Un camino de carro mide dos carros de ancho y punto.
 */
export const ANCHO_DE_LA_SENDA = 0.05;

/**
 * CUÁNTO SE HUNDE UNA SENDA RESPECTO AL PRADO.
 *
 * Un camino de tierra está gastado, no pintado. Se hunde lo que un carro hunde la
 * rodada —media persona— y con eso coge sombra propia y deja de parecer una raya de
 * color. En unidades del PACK y no en fracción del lado: un socavón no es más hondo
 * porque la losa sea más grande.
 */
export const HUNDIDO_DE_LA_SENDA = ESCALA_DEL_PACK * 0.22;

/** Y cuánto se levanta el suelo de una villa: está empedrado y pisado. */
export const ALZADO_DE_LA_VILLA = ESCALA_DEL_PACK * 0.12;

/**
 * CUÁNTAS PIEZAS DE RELLENO COMO MUCHO POR LOSA.
 *
 * ═══ ESTE TOPE NO ES UN AHORRO: ES LA CONDICIÓN PARA QUE EL TABLERO EXISTA ═══
 *
 * La cuenta es de servilleta y no admite discusión: una casa del pack cuesta
 * 1.393 triángulos, y una villa de seis casas con su muralla pasa de diez mil.
 * Por setenta y dos losas serían setecientos mil sólo de villas, y el techo de un
 * PC para el tablero ENTERO —cámara, avatares y cielo incluidos— es de novecientos
 * mil. No cabe, y no hay forma de recortarlo pieza a pieza hasta que quepa.
 *
 * ═══ Y CON LA LOSA OCHO VECES MAYOR, ESTO NO SE MULTIPLICA POR SESENTA Y CUATRO ═══
 *
 * Que es lo que pediría la proporción, y sería exactamente el error. Lo que la losa
 * grande compra es SITIO: una villa con calles, una arboleda que no toca el trigal,
 * una muralla con su torre y su puerta. Rellenada hasta la densidad de antes sale la
 * misma maqueta apretada, en grande, y encima no cabe.
 *
 * Así que el tope sube de veintidós a sesenta —menos de tres veces, con sesenta y
 * cuatro veces el suelo— y lo que crece de verdad es el hueco entre las cosas. Lo
 * que se pinta se elige por importancia: lo que cuenta una regla —la muralla, el
 * edificio que manda, la ermita— primero, y el relleno después hasta llenar el cupo.
 * Es la misma decisión que `ciudad.ts` tomó con sus tres niveles, tomada antes de
 * escribir la primera pieza y no después de que no quepa.
 */
export const PIEZAS_POR_LOSA = 60;

/**
 * EL PRESUPUESTO DE TRIÁNGULOS DEL TABLERO ENTERO.
 *
 * ═══ ERAN NOVECIENTOS MIL Y LOS AMPLÍA MIGUEL ═══
 *
 * Aquel techo salía de lo que el Burgo se permite, y el Burgo pinta una ciudad
 * moderna con coches: mucha pieza pequeña y repetida. Aquí lo que hay que sostener
 * es otra cosa —setenta y dos losas de 175 unidades con villas amuralladas, campos
 * con sus lindes y arboledas— y recortar hasta caber en novecientos mil dejaba el
 * valle pelado, que es justo lo que este juego no puede permitirse: el tablero ES
 * el producto.
 *
 * Dos millones y medio, y lo que lo hace sostenible no es el número sino el NIVEL
 * DE DETALLE POR DISTANCIA: lo que cuenta una regla se pinta siempre, y el relleno
 * sólo cerca de donde mira la cámara. Sin eso, ampliar el techo es aplazar el
 * problema hasta la losa cuarenta.
 */
export const TOPE_DE_TRIANGULOS = 2_500_000;

/**
 * LO QUE MIDE UN LABRIEGO, en unidades del mundo.
 *
 * ═══ UNA FICHA NO ESTÁ A ESCALA, Y ÉSA ES LA DECISIÓN ═══
 *
 * Valía «persona y media» —una altura del mundo— y con la losa en 175 eso deja un
 * peón de cuatro unidades al lado de una muralla de seis: desde la cámara de mesa no
 * se ve, y lo que no se ve de un tablero es de quién es cada cosa, que es lo único
 * que el labriego está ahí para decir.
 *
 * Así que NO está a escala del paisaje, y no es un descuido: en la mesa de verdad la
 * ficha también es enorme al lado de las casitas pintadas. Lo que tiene que cumplir
 * es leerse de un vistazo, y para eso mide una novena parte del lado de su losa
 * —unas siete personas— y crece con ella.
 */
export const ALTO_DEL_LABRIEGO = LADO_DE_LOSA * 0.11;

/** Cuánto sobresale del suelo la peana de un labriego. */
export const PEANA_DEL_LABRIEGO = LADO_DE_LOSA * 0.002;

/**
 * LO QUE SE AGRANDAN LAS PIEZAS DEL PACK, y por qué no van a tamaño natural.
 *
 * ═══ EL PACK ESTÁ HECHO PARA UNA TESELA HEXAGONAL, NO PARA UNA LOSA DE 175 ═══
 *
 * Una casa del pack mide 0,875 de pack, o sea 4,8 del mundo: puesta en una losa de
 * 175 es una caseta de perro. El pack está dimensionado para la tesela hexagonal de
 * Riberas —dos unidades de ancho— y aquí la unidad de composición es sesenta y
 * cuatro veces mayor.
 *
 * Así que las piezas se agrandan, y NO todas lo mismo: lo que se agranda es la
 * jerarquía. Una casa tiene que leerse como una casa al lado de la muralla, la
 * muralla tiene que poder contenerla, la torre tiene que asomar por encima de las
 * dos, y el edificio que manda tiene que verse desde la otra punta del tablero.
 * Estos cinco números SON esa jerarquía, y por eso están juntos y no repartidos por
 * el fichero que las coloca.
 *
 * Las alturas que salen, para poder discutirlas:
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
 * LA ESCALA DE LA MURALLA, y las celdas que cubre un tramo, que son EL MISMO NÚMERO
 * mirado de dos maneras.
 *
 * Un `muro` del pack mide 2 de pack. Agrandado 2,33 veces mide 25,5 del mundo, que
 * son exactamente SIETE CELDAS de la retícula. Escribir las dos cosas a mano sería
 * tener dos números para lo mismo, y el día que uno cambie el otro deja los muros
 * solapados o con hueco entre ellos — que es de las cosas que no dan error y se ven
 * desde la primera partida.
 */
export const CELDAS_POR_MURO = 7;
export const ESCALA_DE_LA_MURALLA = (CELDAS_POR_MURO * LADO_DE_CELDA) / (2 * ESCALA_DEL_PACK);

/**
 * EL SETO DE UNA LINDE: lo mismo, para la `valla`.
 *
 * Una `valla` del pack mide 1,155 de pack a lo largo. Agrandada 1,6 veces mide 10,1
 * del mundo; para que un seto cubra un tramo sin huecos y SIN SOLAPARSE hace falta
 * saber cuántas celdas cubre cada una, y ésa es la cuenta de aquí abajo: 2,8 celdas,
 * o sea que se pone una cada tres.
 *
 * ═══ ESTO ESTABA MAL Y SE VEÍA COMO UN RAYADO ═══
 *
 * La primera versión ponía una valla cada tres celdas y la estiraba 2,7 veces a lo
 * largo: veintisiete unidades de seto cada once, o sea cada valla montada encima de
 * las dos siguientes. Desde la vista de mesa eso no se leía como setos: se leía como
 * una trama de rayas cruzando el campo, y era lo más feo del tablero.
 */
export const ESCALA_DEL_SETO = 1.6;
export const LARGO_DE_LA_VALLA_EN_PACK = 1.155;
export const CELDAS_POR_SETO = Math.max(
  1,
  Math.round((LARGO_DE_LA_VALLA_EN_PACK * ESCALA_DEL_PACK * ESCALA_DEL_SETO) / LADO_DE_CELDA),
);
