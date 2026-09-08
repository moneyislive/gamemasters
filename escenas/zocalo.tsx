/**
 * EL ZÓCALO: LA MARCA DEL COLOR DE SU DUEÑO QUE LLEVA TODA PIEZA DE JUGADOR.
 *
 * ═══ EL FALLO QUE TAPA, MEDIDO JUGANDO Y NO LEYENDO ═══
 *
 * En una partida entera nadie consiguió señalar su propia choza. Con el encuadre de «Ver el
 * tablero entero», el tablero recién repartido y el mismo con seis chozas y seis veredas
 * puestas salían indistinguibles. Y no es que las piezas no se pinten: es que el tejado de
 * una casa de adorno y el tejado del poblado de alguien son EL MISMO TÉXEL del atlas
 * —`poblar.ts` reparte casas de tejado rojo, azul y amarillo por todas las comarcas, y ésos
 * son tres de los cuatro colores de jugador—, y a esa distancia la casa del jugador mide once píxeles
 * en una ventana de novecientos. Buscar el color propio entre el caserío es buscar una casa
 * roja entre casas rojas.
 *
 * Así que la pieza de jugador gana una marca del color de su dueño, pegada al suelo, que MIDE
 * LO MISMO EN PANTALLA desde donde se mire.
 *
 * ═══ Y AQUÍ HABÍA UNA FRASE QUE YA NO ES VERDAD ═══
 *
 * Ponía «algo que el decorado NO PUEDE TENER», y desde que el caserío toma el color de su
 * dueño (`caserio.ts`) el decorado sí lo tiene: el pueblo que rodea una choza se repinta del
 * color de quien la fundó. Eso no deja al zócalo sin trabajo — le cambia el trabajo, y es por
 * lo que pudo encoger a la mitad en esta misma tanda:
 *
 *   · el PUEBLO dice de quién es la comarca, que es lo que se ve de lejos;
 *   · el ZÓCALO dice EN CUÁL DE SUS TRES ESQUINAS está puesta la choza, que es lo que hay que
 *     saber para jugar y lo que ningún tejado puede decir. Medido: el edificio de adorno más
 *     cercano a un vértice está a 18,9 unidades de mediana, o sea a tres teselas de allí.
 *
 * Y hay un caso en el que el zócalo es lo ÚNICO que hay: 11 de 324 chozas no tienen ni un
 * edificio dentro de su radio, porque el pueblo de su comarca cayó lejos.
 *
 * ═══ DOS FORMAS, Y NO SON UN CAPRICHO: SON LA FORMA DE LO QUE MARCAN ═══
 *
 * La primera versión de esta marca era un ARO para las dos piezas, y funcionaba —se encontraba
 * la choza propia, que era el fallo—, pero pesaba demasiado en pantalla. Ahora cada pieza lleva
 * la forma de lo que es:
 *
 *   · UN ASENTAMIENTO —choza o torre— es un PUNTO del mapa, y se marca con un DISCO en su
 *     base. Relleno y translúcido, así que la comarca se sigue viendo a través.
 *   · UNA VEREDA es un TRAMO, y se marca con una RAYA a lo largo de la arista. Una vereda
 *     marcada con un disco dice «aquí hay algo» y no «esto va de aquí a allá», que es la
 *     mitad de lo que un camino significa — y con el VADO LARGO, uno de los dos títulos de la
 *     partida, jugándose a contar cinco veredas SEGUIDAS, la dirección es información.
 *
 * Las dos salen de la misma función y llevan el mismo material, y eso es la decisión: dos
 * marcas escritas en dos sitios coinciden hasta el primer retoque.
 *
 * ═══ POR QUÉ ESTO SALIÓ DE `delta.tsx`, QUE ES LA MITAD DEL ARREGLO ═══
 *
 * Porque DE DENTRO DE `delta.tsx` NO SE PUEDE COMPRAR. La marca es lo único que hace jugable
 * el tablero, y estuvo escrita dentro del JSX de un componente con `useFrame`, o sea en el
 * único sitio del árbol al que un comprobador de Node no llega: se le puso `visible={false}` y
 * las 378 comprobaciones de `verify:escena` y las 657 de `verify:escritorio` siguieron LAS DOS
 * EN VERDE mientras el tablero con cuatro chozas y cuatro veredas volvía a ser idéntico al
 * vacío. Ésa es la historia que este árbol ya tiene escrita tres veces: un arreglo que se
 * pierde dentro de dos semanas sin que nadie lo vea venir.
 *
 * `Zocalo` NO USA NINGÚN GANCHO, y eso es a propósito y es lo que compra la vigilancia: un
 * componente sin ganchos se puede LLAMAR como una función corriente, y lo que devuelve es un
 * árbol de elementos de React —objetos llanos con su `type` y sus `props`— que se recorre
 * desde Node sin montar nada. `verify:escena` lo recorre y compra que la marca existe, que
 * lleva el color de su dueño, que tiene contorno, que mide una marca de pantalla y que nadie
 * la ha apagado. El `useFrame` que la escala se queda fuera, en `delta.tsx`, porque de un
 * `useFrame` no se mide — pero la CUENTA que ese `useFrame` hace vive aquí (`tallaDelZocalo`)
 * por la misma razón por la que `tallaDeUnaMarca` vive en `escala.ts`.
 *
 * ═══ SE PARECE A `Senal` Y NO ES `Senal`, Y LAS DIFERENCIAS SON LA MITAD DEL DISEÑO ═══
 *
 *   · NO LATE y no responde al ratón. La señal dice «aquí PUEDES construir» y por eso respira;
 *     el zócalo dice «esto YA es de alguien». Una marca que late sobre algo construido invita a
 *     pulsarla, y ahí no hay nada que pulsar.
 *   · NO RECIBE RAYOS, y va escrito aunque HOY no haga falta. Hoy no hace falta porque r3f
 *     sólo mete en su lista de trazado las mallas que tienen manejadores, y éstas no tienen
 *     ninguno; el día que alguien le cuelgue un `onPointerUp` esta marca pasaría a ocupar desde
 *     el aire más que la propia comarca y se comería los toques de lo que tiene debajo.
 *     `raycast={() => null}` es lo que de verdad la desactiva: con `raycast={null}` el motor
 *     revienta al primer rayo, y `visible={false}` NO la quita del trazado — las dos cosas
 *     están medidas sobre el paquete instalado en la cabecera de `Senal`.
 *   · VA MÁS BAJA Y MÁS PEQUEÑA. La señal flota dos personas y media para no perderse entre el
 *     follaje; el zócalo se apoya casi en el suelo porque tiene una pieza encima que lo levanta
 *     visualmente, y ocupa menos pantalla porque hay uno por pieza y puede haber ciento
 *     veintiséis — al tamaño de una señal, eso sí sería una alfombra.
 *
 * Lo que SÍ comparte con la señal es lo que hace que se lea como luz y no como pintura:
 * `meshBasicMaterial`, o sea SIN LUZ —no lo apaga la sombra ni lo modula el sol—, transparente,
 * `depthWrite={false}` para que no tape lo que tiene detrás, y `DoubleSide` para que no
 * desaparezca visto a ras de suelo.
 */
/*
 * ═══ POR QUÉ ESTE FICHERO IMPORTA `React` Y `delta.tsx` NO ═══
 *
 * Porque se compila de DOS maneras, y ésa es justamente la gracia de que exista.
 *
 * En el navegador lo compila Vite con el runtime automático de JSX (`jsx: react-jsx`), que no
 * necesita nada en el ámbito: por eso ningún otro `.tsx` de esta carpeta lo importa. Pero este
 * fichero lo carga además `tsx` desde `verify:escena` —que es lo que compra que la marca
 * exista— y `tsx` compila JSX con el runtime CLÁSICO, que traduce cada etiqueta a
 * `React.createElement` y revienta con «React is not defined» si el nombre no está.
 *
 * La importación sobra en el navegador y se elide sola; aquí es lo que hace que el comprobador
 * pueda llamar a `Zocalo`. Quitarla no rompe la pantalla: rompe la vigilancia, en silencio y
 * sólo al correr la batería.
 */
import * as React from 'react';
import type { Ref } from 'react';
import * as THREE from 'three';
import {
  asientoDeLaMarca,
  RADIO_DE_TESELA,
  SUELO_DEL_ZOCALO,
  tallaDeUnaMarca,
  TECHO_DEL_ZOCALO,
  ZOCALO_EN_PANTALLA,
} from './escala';
import type { AsientoDeLaMarca } from './escala';
import { colorLlanoDelJugador, FILO_DEL_ZOCALO } from './paleta';

/** Qué se marca: un asentamiento —un punto— o una vereda —un tramo—. */
export type FormaDelZocalo = 'disco' | 'raya';

/**
 * UNA PIEZA DE LA MARCA. Todas las medidas van en múltiplos de `RADIO_DE_TESELA`, que es la
 * unidad en la que `tallaDelZocalo` devuelve la escala.
 *
 * `orden` es EL SITIO EN LA PILA DE DIBUJO, y no una altura: el contorno va debajo del color, y
 * eso se resuelve con `renderOrder` porque dos planos separados en el eje vertical se cruzarían
 * al mirar desde el ras del suelo —el contorno asomaría por delante del color en unos ángulos y
 * por detrás en otros—.
 */
export type PiezaDelZocalo =
  | {
      /** El contorno del disco: un filo finísimo pegado al borde, no un aro con hueco dentro. */
      readonly que: 'contorno';
      readonly dentro: number;
      readonly fuera: number;
      readonly color: string;
      readonly opacidad: number;
      readonly orden: number;
    }
  | {
      readonly que: 'disco';
      readonly fuera: number;
      readonly color: string;
      readonly opacidad: number;
      readonly orden: number;
    }
  | {
      readonly que: 'raya';
      readonly largo: number;
      readonly ancho: number;
      /** Cuánto se aparta del eje de la raya, medido a su centro. Cero es la raya de color. */
      readonly aparte: number;
      readonly color: string;
      readonly opacidad: number;
      readonly orden: number;
    };

/**
 * EN CUÁNTOS TROZOS SE PARTE EL DISCO. Veintiocho.
 *
 * A la talla de marca de pantalla el disco mide 25,2 píxeles de diámetro contando su contorno,
 * en una ventana de novecientos: con veintiocho lados, el trozo de circunferencia mide 2,8
 * píxeles y el ojo lee un círculo. Menos se vería como un polígono, y más son triángulos
 * pagados por nada — y de estos discos puede haber cincuenta y cuatro en pantalla a la vez.
 */
export const LADOS_DEL_DISCO = 28;

/**
 * ═══ POR QUÉ LA MARCA NO PUEDE SER SÓLO DE COLOR, Y POR QUÉ TAMPOCO VALE LA LUZ ═══
 *
 * El zócalo se posa sobre el suelo de su isla, y ese suelo sale del atlas. Medido con CIE76
 * sobre la tabla del atlas de verdad, con el umbral de esta casa —20— para «una superficie no
 * se come una pieza»:
 *
 *   · UN RELLENO TRANSLÚCIDO SOLO NO SE VE. El verde de jugador sobre el carrizal se queda en
 *     2,3, o sea el mismo color; el amarillo sobre la vega en 8,1 y sobre la duna en 16,6. Tres
 *     de las veinticuatro parejas de color y terreno por debajo del umbral.
 *   · Y LA MEZCLA ADITIVA —sumar luz en vez de sustituir color, que era la salida elegante—
 *     TAMPOCO. Sumada sobre la duna y el desierto, que son los dos terrenos claros, la marca
 *     roja se separa del suelo 11,2 y, PEOR, la verde y la amarilla se separan ENTRE SÍ 13,6:
 *     sobre arena los cuatro colores se van al blanco a la vez. Una marca que sobre dos de los
 *     seis terrenos deja de decir DE QUIÉN es ha perdido su única razón de existir, así que la
 *     aditiva se descartó por esos dos números y no por gusto.
 *
 * La salida es la de siempre para un trazo sobre un fondo cualquiera: un CONTORNO. Casi negro,
 * finísimo, pegado al borde de la forma —no es un aro: es el filo del disco y los dos flancos
 * de la raya—, y entonces lo que tiene que separarse del terreno es el contorno —uno solo, y
 * siempre el mismo— y no los cuatro colores.
 *
 * Y EL REPARTO DE TRABAJO QUEDA ASÍ, que es lo que hay que entender para tocar estos números:
 *   · el CONTORNO hace que la marca SE ENCUENTRE sobre cualquier terreno;
 *   · el RELLENO translúcido hace que se sepa DE QUIÉN es;
 *   · y como es translúcido, la comarca se sigue viendo debajo, que es lo que se pidió al
 *     bajarle el volumen al aro.
 *
 * ═══ Y HAY DOS JUEGOS DE NÚMEROS, QUE NO SON EL MISMO Y AQUÍ SE MEZCLABAN ═══
 *
 * SOBRE LA TABLA DEL ATLAS, componiendo con la opacidad y sin más: el contorno se separa de
 * los seis terrenos por lo menos 35,6 (la montaña/cantil, el más gris) y los cuatro rellenos
 * se separan ENTRE SÍ por lo menos 33,0 (rojo contra amarillo sobre la colina/marisma). Son
 * los que mide `verify:escena`, y son un modelo: color de téxel contra color de téxel.
 *
 * EN EL LIENZO NO SALE ESO, y por eso conviene tenerlo escrito. Medido en el banco sobre el
 * fotograma de verdad —con luz, sombra y tone mapping, comparando cada píxel de la marca
 * contra ese mismo píxel con la marca a opacidad cero—, la mediana de lo que el contorno
 * cambia el píxel es 24,3 / 28,6 / 28,6 en las tres marcas del encuadre, o sea entre un 20 % y
 * un 30 % menos que los 35,6 de la tabla. Y la peor identidad entre dos rellenos, pintando el
 * mismo disco con los cuatro colores y comparando píxel a píxel, baja de 33,0 a 24,4
 * (azul/verde) y 26,3 (amarillo/verde).
 *
 * Y LA DECISIÓN QUE ESO PIDE, tomada midiendo y no a ojo: las dos medianas del lienzo siguen
 * por encima del umbral 20 de esta casa —24,3 la peor del contorno y 24,4 la peor entre
 * rellenos—, así que NO se sube ninguna opacidad. Subirla tendría además un precio doble:
 * invalidaría los números de la tabla, que son los que el comprobador mide, y haría la marca
 * más pesada justo cuando el encargo era bajarle el volumen. Si algún día la tabla cambia y
 * la peor pareja del lienzo baja de 20, es aquí donde hay que volver.
 *
 * `verify:escena` mide las tres cosas CON LA OPACIDAD DENTRO DE LA CUENTA, que es la diferencia
 * con la versión del aro: allí se medía el filo a pelo y la opacidad no entraba, así que la
 * comprobación habría seguido verde con un contorno a 0,1 de opacidad.
 */
export const OPACIDAD_DEL_RELLENO = 0.55;
export const OPACIDAD_DEL_CONTORNO = 0.8;

/**
 * EL DISCO DE UN ASENTAMIENTO, en múltiplos de `RADIO_DE_TESELA`.
 *
 * El relleno llega a `RADIO_DEL_DISCO` y el contorno va de ahí a UNO, o sea POR DENTRO del
 * borde: el disco entero mide uno, y el contorno se come el anillo de fuera del relleno en vez
 * de añadirse por fuera. Es lo que deja el ancho total en 25,2 píxeles en una ventana de
 * novecientos contra los 42,4 del aro de antes —el 59 %— y la tinta en 499 píxeles cuadrados
 * contra 1.038 —el 48 %—. Eso es «más pequeño» con número.
 *
 * ═══ Y EL GRUESO ESTÁ MEDIDO EN PÍXELES, QUE ES LO QUE COSTÓ UNA VUELTA ═══
 *
 * El contorno empezó en 0,09 porque era el grueso que tenía el filo del aro, y contado en
 * píxeles eso son 1,1: un contorno de un píxel es casi todo antialias, y se vio contando
 * píxeles en el lienzo — del disco azul sobre la montaña, sólo el 37 % de sus píxeles pasaba
 * del umbral de color de esta casa, contra el 73-81 % de las otras tres marcas. A 0,19 el
 * contorno mide 2,4 píxeles, eso ya es un trazo, y ese disco sube al 49 %. La cuenta que
 * importa no es la fracción de pantalla: es la fracción POR el alto de la ventana.
 */
export const RADIO_DEL_DISCO = 0.81;
export const GRUESO_DEL_CONTORNO = 0.19;

/**
 * LA RAYA DE UNA VEREDA.
 *
 * Larga y fina: 3,6 de largo por 0,34 de ancho el relleno, o sea 45,4 × 4,3 píxeles desde el
 * encuadre de tablero, con 2,1 más de flanco a cada lado. Es la marca MÁS floja de las dos a
 * propósito —se pidió que la vereda pesara menos que el asentamiento— y sale así con número:
 * 389 píxeles cuadrados de tinta contra los 499 del disco y los 1.038 del aro que había antes.
 *
 * El contorno de una raya son sus DOS FLANCOS LARGOS y no un marco cerrado: las dos puntas
 * miden lo que la raya de gruesa —cuatro píxeles— y cerrarlas costaría dos mallas más por
 * vereda, con setenta y dos veredas en el peor caso, para dibujar ocho píxeles.
 *
 * Y los flancos van POR FUERA del relleno, al revés que el contorno del disco, porque una raya
 * no tiene sitio dentro: quitarle 2,1 píxeles por lado a un trazo de 4,3 lo dejaría en medio
 * píxel de color.
 */
export const LARGO_DE_LA_RAYA = 3.6;
export const ANCHO_DE_LA_RAYA = 0.34;
export const GRUESO_DEL_FLANCO = 0.17;

/**
 * LAS PIEZAS DE LA MARCA, por forma.
 *
 * Salen de aquí y no del JSX para que se puedan medir: `verify:escena` compra con ellas que el
 * contorno asoma por fuera del color, que se pinta debajo, y que la marca entera no se come a
 * su vecina ni tapa el delta.
 */
export function piezasDelZocalo(forma: FormaDelZocalo, color: string): readonly PiezaDelZocalo[] {
  const suyo = colorLlanoDelJugador(color);
  if (forma === 'raya') {
    const aparte = ANCHO_DE_LA_RAYA / 2 + GRUESO_DEL_FLANCO / 2;
    return [
      {
        que: 'raya',
        largo: LARGO_DE_LA_RAYA,
        ancho: GRUESO_DEL_FLANCO,
        aparte,
        color: FILO_DEL_ZOCALO,
        opacidad: OPACIDAD_DEL_CONTORNO,
        orden: 1,
      },
      {
        que: 'raya',
        largo: LARGO_DE_LA_RAYA,
        ancho: GRUESO_DEL_FLANCO,
        aparte: -aparte,
        color: FILO_DEL_ZOCALO,
        opacidad: OPACIDAD_DEL_CONTORNO,
        orden: 1,
      },
      {
        que: 'raya',
        largo: LARGO_DE_LA_RAYA,
        ancho: ANCHO_DE_LA_RAYA,
        aparte: 0,
        color: suyo,
        opacidad: OPACIDAD_DEL_RELLENO,
        orden: 2,
      },
    ];
  }
  return [
    /* De `RADIO_DEL_DISCO` a UNO: el contorno CIERRA el disco por dentro, no lo agranda. */
    {
      que: 'contorno',
      dentro: RADIO_DEL_DISCO,
      fuera: RADIO_DEL_DISCO + GRUESO_DEL_CONTORNO,
      color: FILO_DEL_ZOCALO,
      opacidad: OPACIDAD_DEL_CONTORNO,
      orden: 1,
    },
    {
      que: 'disco',
      fuera: RADIO_DEL_DISCO,
      color: suyo,
      opacidad: OPACIDAD_DEL_RELLENO,
      orden: 2,
    },
  ];
}

/**
 * LO QUE OCUPA UNA MARCA: hasta dónde llega desde su centro, y cuánta tinta pone.
 *
 * Las dos en múltiplos de `RADIO_DE_TESELA` —la segunda al cuadrado—, y las dos salen de las
 * piezas y no de un número escrito aparte: son con lo que `verify:escena` compra que 126 marcas
 * no son una alfombra y que ninguna toca a su vecina.
 */
export function loQueOcupaElZocalo(forma: FormaDelZocalo): { fuera: number; tinta: number } {
  let fuera = 0;
  let tinta = 0;
  for (const pieza of piezasDelZocalo(forma, 'red')) {
    if (pieza.que === 'raya') {
      fuera = Math.max(fuera, Math.hypot(pieza.largo / 2, Math.abs(pieza.aparte) + pieza.ancho / 2));
      tinta += pieza.largo * pieza.ancho;
      continue;
    }
    if (pieza.que === 'disco') {
      fuera = Math.max(fuera, pieza.fuera);
      tinta += Math.PI * pieza.fuera * pieza.fuera;
      continue;
    }
    fuera = Math.max(fuera, pieza.fuera);
    tinta += Math.PI * (pieza.fuera * pieza.fuera - pieza.dentro * pieza.dentro);
  }
  return { fuera, tinta };
}

/**
 * EL CAMPO CON EL QUE SE CUENTA CUANDO LA CÁMARA NO ES DE PERSPECTIVA.
 *
 * Es el mismo 45 que trae `PerspectiveCamera` por defecto, y está escrito para que una cámara
 * ortográfica no deje la marca sin talla: `tallaDeUnaMarca` con un campo de cero devuelve el
 * SUELO, que es una china, y una china no es una marca.
 */
const CAMPO_DE_RESERVA = 45;

/**
 * CUÁNTO TIENE QUE MEDIR EL ZÓCALO DESDE DONDE ESTÉ LA CÁMARA.
 *
 * ═══ POR QUÉ ESTA CUENTA VIVE AQUÍ Y NO DENTRO DEL `useFrame` QUE LA LLAMA ═══
 *
 * Porque estaba allí, escrita a mano y por duplicado, y de ahí no se puede medir: un
 * comprobador de Node que quisiera afirmar que una marca se ve desde la vista de tablero tendría
 * que abrir un contexto de dibujo. Aquí es aritmética, y `verify:escena` la llama con la
 * cámara de VERDAD del encuadre del delta y con los ciento veintiséis sitios donde puede caer
 * una pieza. Es la misma frontera que separa `escala.ts` de `delta.tsx`, y la misma razón.
 *
 * Lo que devuelve es lo que va en `scale`: `tallaDeUnaMarca` cuenta en múltiplos de
 * `RADIO_DE_TESELA`, que es la unidad en la que están escritas las piezas de la marca.
 *
 * ═══ Y LA FRACCIÓN DE PANTALLA ENTRA POR LA PUERTA, QUE ES LO NUEVO ═══
 *
 * Porque no hay UNA talla: el disco de una CIUDAD tiene que asomar por fuera de un recinto
 * amurallado y el de un poblado sólo por entre unas casas sueltas. Quién decide cuál es
 * `parteDeLaMarca` en `escala.ts`, con la medida al lado; aquí sólo se recibe, y el valor por
 * defecto es el de siempre para que la vereda —que no tiene clase de pieza— siga llamando
 * igual.
 *
 * ═══ Y EL SUELO TAMBIÉN ENTRA POR LA PUERTA, POR UNA RAZÓN DISTINTA ═══
 *
 * La fracción dice cuánto ocupa la marca EN LA PANTALLA. El suelo dice cuánto no puede dejar
 * de medir EN EL MUNDO, y hace falta porque lo que tapa el disco de una ciudad —su muralla, a
 * 12,43 del vértice— es un objeto del mundo: a media distancia del encuadre la marca de
 * pantalla se queda en 9,51 y el recinto se la traga entera. El número y la ventana en la que
 * cabe están en `SUELO_DEL_ZOCALO_DE_CIUDAD` (`escala.ts`), medidos; aquí sólo se recibe.
 *
 * ═══ Y EL TECHO TAMBIÉN, QUE ERA EL QUE NADIE PENSABA QUE SE TOCARA ═══
 *
 * Estaba clavado aquí dentro —`TECHO_DEL_ZOCALO`, el mismo para las tres marcas— y se creía
 * inalcanzable. Se toca con la ventana a medio abrir y se clava ENTERO en un móvil, y en el
 * techo las dos clases miden lo mismo: la marca de una ciudad y la de un poblado dejan de
 * distinguirse justo donde el tablero está más lejos. Ahora entra por la puerta como las otras
 * dos, lo decide `techoDeLaMarca` en `escala.ts` —con las cuatro medidas del tablero al lado—
 * y quien monta la marca puede además bajarlo con lo que el RELIEVE de su sitio le deje
 * (`asientoDelDisco`). El valor por defecto es el de siempre para que la vereda, que no tiene
 * clase de pieza, siga llamando igual.
 */
export function tallaDelZocalo(
  camara: THREE.Camera,
  donde: readonly [number, number, number],
  parte: number = ZOCALO_EN_PANTALLA,
  suelo: number = SUELO_DEL_ZOCALO,
  techo: number = TECHO_DEL_ZOCALO,
): number {
  const dx = camara.position.x - donde[0];
  const dy = camara.position.y - donde[1];
  const dz = camara.position.z - donde[2];
  const lejos = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const perspectiva = camara as THREE.PerspectiveCamera;
  const grados = perspectiva.isPerspectiveCamera === true ? perspectiva.fov : CAMPO_DE_RESERVA;
  const campo = (grados * Math.PI) / 180;
  return tallaDeUnaMarca(lejos, campo, parte, suelo, techo);
}

/**
 * HASTA DÓNDE LLEGA UNA MARCA DE ESTA FORMA A ESTA TALLA, en unidades de mundo.
 *
 * Es `talla · RADIO_DE_TESELA · loQueOcupaElZocalo(forma).fuera`, y vive aquí en vez de escrita
 * en cada sitio que la necesita porque la necesitan tres: quien le pregunta al relieve cuánto
 * le deja, el comprobador que mide si el disco asoma por fuera de su muralla, y el que mide
 * que dos marcas no se tocan. Tres cuentas iguales en tres sitios discrepan al primer retoque.
 */
export function loLejosQueLlegaLaMarca(forma: FormaDelZocalo, talla: number): number {
  return talla * RADIO_DE_TESELA * loQueOcupaElZocalo(forma).fuera;
}

/**
 * DÓNDE SE APOYA EL DISCO DE UN ASENTAMIENTO, con el relieve mirado y no supuesto.
 *
 * Envuelve `asientoDeLaMarca` (`escala.ts`, donde está la medida entera) con lo único que
 * aquélla no puede saber sin importar nada: cuánto llega a medir el disco a su techo. Lo llama
 * `delta.tsx` UNA vez por sitio —no por fotograma—, y `verify:escena` lo llama con el relieve
 * de verdad del delta y con terrenos escritos a mano.
 */
export function asientoDelDisco(
  tierraEn: (x: number, y: number) => number,
  centroX: number,
  centroY: number,
  suelo: number,
  techo: number,
): AsientoDeLaMarca {
  return asientoDeLaMarca(tierraEn, centroX, centroY, suelo, loLejosQueLlegaLaMarca('disco', techo));
}

/**
 * LA MARCA, MONTADA. Sin ganchos, para que se pueda llamar desde un comprobador.
 *
 * `marca` es la referencia por la que quien la monta le pone la talla en cada fotograma: el
 * grupo de fuera lleva la escala y las piezas de dentro van en unidades de mundo, así que quien
 * anima toca UN objeto y no tres mallas.
 *
 * `donde` es la posición RELATIVA a su padre, y por eso no la decide este fichero: en un
 * asentamiento el padre ya está puesto en el vértice y lo único que falta es levantarlo del
 * suelo; en una vereda el padre es el grupo del delta y hay que decirle el punto de la calzada
 * a mitad de vano entero.
 *
 * ═══ LOS DOS GIROS, Y EL SEGUNDO ES EL QUE TENÍA LOS PUENTES ATRAVESADOS ═══
 *
 * El de fuera TUMBA la marca sobre el suelo: un plano de `three` nace en el plano XY, o sea
 * vertical en este mundo, y sin el cuarto de vuelta lo que se ve desde el aire es una raya de
 * un píxel o nada.
 *
 * El de dentro la APUNTA a lo largo de la arista. Va en un grupo aparte y no en cada malla
 * porque los dos flancos de la raya se apartan del eje: metidos en el grupo girado, sus
 * posiciones son `[0, ±aparte, 0]` y se leen; escritas en el grupo de fuera habría que girarlas
 * a mano, que es exactamente la cuenta que ya salió mal una vez y dejó los puentes de través.
 * Para un disco el giro es cero y el grupo sobra, pero se pone igual: un árbol con la misma
 * forma para las dos marcas es un árbol que un comprobador recorre con un solo camino.
 *
 * Y no lleva `visible`: no es un descuido, es que esta marca no se apaga nunca. Una pieza sin
 * zócalo es una pieza que no se encuentra, que es el fallo entero que esto existe para tapar.
 */
export function Zocalo({
  color,
  donde,
  forma,
  giro = 0,
  marca,
}: {
  color: string;
  donde: readonly [number, number, number];
  forma: FormaDelZocalo;
  giro?: number;
  marca: Ref<THREE.Group>;
}): JSX.Element {
  return (
    <group ref={marca} position={[donde[0], donde[1], donde[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <group rotation={[0, 0, giro]}>
        {piezasDelZocalo(forma, color).map((pieza, i) => (
          <mesh
            key={`${pieza.que}:${String(i)}`}
            renderOrder={pieza.orden}
            raycast={() => null}
            position={pieza.que === 'raya' ? [0, RADIO_DE_TESELA * pieza.aparte, 0] : [0, 0, 0]}
          >
            {pieza.que === 'raya' && (
              <planeGeometry args={[RADIO_DE_TESELA * pieza.largo, RADIO_DE_TESELA * pieza.ancho]} />
            )}
            {pieza.que === 'disco' && (
              <circleGeometry args={[RADIO_DE_TESELA * pieza.fuera, LADOS_DEL_DISCO]} />
            )}
            {pieza.que === 'contorno' && (
              <ringGeometry
                args={[RADIO_DE_TESELA * pieza.dentro, RADIO_DE_TESELA * pieza.fuera, LADOS_DEL_DISCO]}
              />
            )}
            <meshBasicMaterial
              color={pieza.color}
              transparent
              opacity={pieza.opacidad}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
