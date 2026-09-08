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
 * son tres de los cuatro colores de jugador—, y a esa distancia la casa del jugador mide once
 * píxeles en una ventana de novecientos. Buscar el color propio entre el caserío es buscar una
 * casa roja entre casas rojas.
 *
 * Así que la pieza de jugador gana una marca del color de su dueño, pegada al suelo, que MIDE
 * LO MISMO EN PANTALLA desde donde se mire.
 *
 * ═══ Y AQUÍ HABÍA UNA FRASE QUE YA NO ES VERDAD ═══
 *
 * Ponía «algo que el decorado NO PUEDE TENER», y desde que el caserío toma el color de su
 * dueño (`caserio.ts`) el decorado sí lo tiene: el pueblo que rodea una choza se repinta del
 * color de quien la fundó. Eso no deja al zócalo sin trabajo — le cambia el trabajo, y es por
 * lo que pudo encoger a la mitad en aquella tanda:
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
 *     base. Translúcido, así que la comarca se sigue viendo a través.
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
 * lleva el color de su dueño, QUE SE APAGA HACIA FUERA HASTA SER TRANSPARENTE, que mide una
 * marca de pantalla y que nadie la ha apagado. El `useFrame` que la escala se queda fuera, en
 * `delta.tsx`, porque de un `useFrame` no se mide — pero la CUENTA que ese `useFrame` hace
 * vive aquí (`tallaDelZocalo`) por la misma razón por la que `tallaDeUnaMarca` vive en
 * `escala.ts`.
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
import { colorLlanoDelJugador } from './paleta';

/** Qué se marca: un asentamiento —un punto— o una vereda —un tramo—. */
export type FormaDelZocalo = 'disco' | 'raya';

/**
 * UNA PIEZA DE LA MARCA. Todas las medidas van en múltiplos de `RADIO_DE_TESELA`, que es la
 * unidad en la que `tallaDelZocalo` devuelve la escala.
 *
 * `orden` es EL SITIO EN LA PILA DE DIBUJO, y no una altura: la falda que se apaga se pinta
 * antes que la meseta, y eso se resuelve con `renderOrder` porque dos planos separados en el
 * eje vertical se cruzarían al mirar desde el ras del suelo —uno asomaría por delante del otro
 * en unos ángulos y por detrás en otros—.
 */
export type PiezaDelZocalo =
  | {
      /** LA MESETA del disco: el trozo central, a la opacidad entera de la marca. */
      readonly que: 'meseta';
      readonly fuera: number;
      readonly color: string;
      readonly opacidad: number;
      readonly orden: number;
    }
  | {
      /** LA FALDA del disco: el anillo donde la opacidad cae de uno a CERO hacia fuera. */
      readonly que: 'falda';
      readonly dentro: number;
      readonly fuera: number;
      readonly color: string;
      readonly opacidad: number;
      readonly orden: number;
    }
  | {
      readonly que: 'raya';
      readonly largo: number;
      readonly ancho: number;
      /** Cuánto se aparta del eje de la raya, medido a su centro. Cero es la banda del eje. */
      readonly aparte: number;
      /**
       * EN CUÁNTOS TRAMOS SE PARTE A LO LARGO. El degradado de las PUNTAS ocupa UN tramo en
       * cada extremo, así que esto no es un detalle de teselado: es lo que fija cuánto miden.
       */
      readonly tramos: number;
      /**
       * QUÉ CANTO LARGO SE APAGA: +1 el de más y, −1 el de menos y, 0 ninguno de los dos —la
       * banda del eje, cuyos cantos largos NO son el borde de la marca porque las dos faldas
       * siguen hacia fuera—.
       */
      readonly apaga: -1 | 0 | 1;
      readonly color: string;
      readonly opacidad: number;
      readonly orden: number;
    };

/**
 * EN CUÁNTOS TROZOS SE PARTE EL DISCO. Veintiocho.
 *
 * A la talla de marca de pantalla el disco mide 25,2 píxeles de diámetro, en una ventana de
 * novecientos: con veintiocho lados, el trozo de circunferencia mide 2,8 píxeles y el ojo lee
 * un círculo. Menos se vería como un polígono, y más son triángulos pagados por nada — y de
 * estos discos puede haber cincuenta y cuatro en pantalla a la vez.
 */
export const LADOS_DEL_DISCO = 28;

/**
 * ═══ AQUÍ HABÍA UN CONTORNO CASI NEGRO, Y MIGUEL PIDIÓ QUITARLO ═══
 *
 * La marca era DOS cosas: un RELLENO del color del dueño a 0,55 de opacidad —que decía DE QUIÉN
 * es— y un CONTORNO casi negro a 0,80 pegado a su borde —que decía QUE HAY ALGO, sobre
 * cualquier terreno—. Lo que se pidió, mirando la producción, fue esto: «Veo que el perímetro
 * del área tiene un borde negro. No me gusta ese diseño; me parecería mejor que terminara
 * difuminándose del mismo color del área hacia transparente hacia fuera, sin borde.»
 *
 * Y EL CONTORNO NO ERA ADORNO: tenía un trabajo medido. Con CIE76 sobre la tabla del atlas y el
 * umbral 20 de esta casa, el RELLENO SOLO se lo comían TRES de las veinticuatro parejas de
 * color y terreno —el verde de jugador sobre el carrizal a 2,3, o sea el mismo color; el
 * amarillo sobre la vega a 8,1 y sobre la duna a 16,6—, mientras que el contorno se separaba
 * del peor de los seis suelos 35,6.
 *
 * ═══ ASÍ QUE EL DEGRADADO CARGA CON EL TRABAJO DEL CONTORNO, Y ESO SE PAGA CON OPACIDAD ═══
 *
 * La marca es ahora UNA sola pintura —el color de su dueño— cuya OPACIDAD es función de la
 * DISTANCIA AL BORDE de la forma: entera por dentro, cayendo a cero justo en el filo. Y sube de
 * 0,55 a 0,85, porque el relleno de antes era la mitad de un dúo y ahora está solo. Rehecho
 * sobre la tabla del atlas (`verify:escena` lo vuelve a medir en cada batería):
 *
 *   · a 0,55 caían TRES de las veinticuatro parejas por debajo de 20 (2,3 / 8,1 / 16,6);
 *   · a 0,85 caen DOS —verde/carrizal 3,3 y amarillo/vega 12,7— y el amarillo sobre la duna
 *     sube de 16,6 a 25,4, que es la que el degradado sí puede salvar en la tabla;
 *   · y a 1,00 —la marca opaca del todo— siguen cayendo LAS MISMAS DOS (4,0 y 14,8).
 *
 * O sea que esas dos NO SE SALVAN CON NINGUNA OPACIDAD, y no es un descuido de esta tanda: el
 * verde de jugador `#007d52` y el carrizal `#008454` SON el mismo color, y ninguna cantidad de
 * un color sobre sí mismo se ve. Eso se sube a quien decide, escrito y con su número, en vez de
 * esconderlo.
 *
 * ═══ Y POR QUÉ 0,85 EXACTAMENTE, QUE NO ES UN GUSTO SINO UN TECHO ═══
 *
 * El techo lo pone la TINTA. La marca no puede pesar más que la que tenía contorno —ése era el
 * encargo—, y la tinta del disco es `opacidad · 2,2934`; con los 1,9980 que ponía el dúo
 * relleno+contorno, la opacidad no puede pasar de 0,8712. Se toma 0,85 para dejar margen: el
 * disco se queda en 1,95 (el 98 % de lo de antes) y la raya en 1,39 (el 84 %).
 *
 * Y dentro de ese techo, 0,85 es lo que la MEDIDA EN EL LIENZO pide, que es distinta de la
 * tabla: el amarillo sobre la SALINA, que en la tabla se separa 35,8 y no preocupa, medido en el
 * fotograma de verdad se queda en 19,4 a 0,80 —por debajo del umbral— y sube a 20,9 a 0,85. Es
 * la última pareja que el degradado puede salvar, y la salva ahí.
 *
 * ═══ Y LAS VEINTICUATRO, MEDIDAS EN EL LIENZO Y NO SÓLO EN LA TABLA ═══
 *
 * Sobre una mesa de cuatro de verdad, en el encuadre de tablero a 1477×833, apagando SÓLO la
 * meseta y comparando cada píxel suyo con ese mismo píxel sin ella —el método del fotograma
 * diferencial que usa la cabecera de `escala.ts`—, con un disco puesto sobre suelo llano de cada
 * uno de los seis terrenos:
 *
 *   rojo      40,5 / 108,6 / 68,7 / 69,1 / 74,5 / 85,1
 *   azul      74,6 /  73,6 / 84,8 / 65,9 / 37,2 / 91,6
 *   verde     69,3 /   8,6 / 57,2 / 52,2 / 42,4 / 50,6
 *   amarillo  33,4 /  52,5 /  5,7 / 22,1 / 50,6 / 20,9
 *   (marisma / carrizal / vega / duna / cantil / salina)
 *
 * DOS de las veinticuatro por debajo de 20, y son las dos que la tabla ya nombraba: el verde
 * sobre el carrizal (8,6) y el amarillo sobre la vega (5,7). Las dos siguen ahí con la marca
 * OPACA DEL TODO —8,6 y 6,7 medidos—, así que no son cosa del degradado: son dos colores que
 * son el mismo color, y arreglarlas es cambiar uno de los dos, que es decisión de quien manda.
 *
 * Y LA IDENTIDAD MEJORA, que era el otro riesgo: pintando el mismo disco con los cuatro colores
 * y comparando píxel a píxel, la peor pareja del lienzo pasa de 26,2 —con contorno— a 52,5
 * (verde/amarillo sobre carrizal). Sube porque la opacidad sube.
 *
 * ═══ Y LA MEZCLA ADITIVA SIGUE SIN VALER, que es la salida que se propone sola ═══
 *
 * Sumar luz en vez de sustituir color se lee sobre cualquier terreno y el problema del carrizal
 * desaparecería por construcción. Medida, no vale, y falla por los DOS lados: sobre la duna y
 * el desierto la marca roja se separa del suelo 11,2 y, peor, la verde y la amarilla se separan
 * ENTRE SÍ 13,6 —sobre arena los cuatro colores se van al blanco a la vez—. Una marca que sobre
 * dos de los seis terrenos deja de decir DE QUIÉN es ha perdido su razón de existir.
 * `verify:escena` guarda esos dos números como comprobación para el día que vuelva a
 * proponerse.
 *
 * ═══ Y HAY DOS JUEGOS DE NÚMEROS, QUE NO SON EL MISMO ═══
 *
 * SOBRE LA TABLA DEL ATLAS, componiendo con la opacidad y sin más: es lo que mide
 * `verify:escena`, y es un modelo —color de téxel contra color de téxel—.
 *
 * EN EL LIENZO NO SALE ESO, y por eso está medido arriba, pareja a pareja: con luz, sombra y
 * tone mapping el suelo no es el téxel del atlas —el carrizal se pinta `#019650` y no `#008454`,
 * y la salina `#c0c048` y no `#aaaf27`—, así que la tabla se queda corta en unas parejas y
 * larga en otras. La regla de la casa sigue siendo la misma: la tabla es lo que el comprobador
 * puede medir en cada batería, y el lienzo es lo que hay que ir a mirar cuando se toca un color.
 *
 * ═══ Y LO QUE CUESTA EN PÍXELES, QUE ES LA TERCERA COSA QUE UN DEGRADADO PUEDE ROMPER ═══
 *
 * Un degradado tira opacidad por el camino: la marca puede leerse PEOR aunque el color pase la
 * prueba. Medido sobre el MISMO fotograma y con las tallas fijadas a mano —para que la cámara
 * del que mira no cambie el resultado—, las dieciséis marcas de una mesa de cuatro a 1477×833
 * pasan de pintar 134-401 píxeles con contorno a 126-322 con el degradado: entre el 79 % y el
 * 95 %, y ninguna baja de 126. A 826×833 la más floja de las que caben enteras en el encuadre
 * pinta 130.
 */
export const OPACIDAD_DEL_ZOCALO = 0.85;

/**
 * ═══ EL PERFIL: MESETA Y CAÍDA RECTA, Y POR QUÉ ÉSE ═══
 *
 * La opacidad vale UNO mientras el punto esté a más de la anchura del desvanecido del borde de
 * la forma, y cae en línea recta hasta CERO justo en el borde. No es un adorno pegado al
 * contorno de un disco: es una función de la DISTANCIA AL BORDE, y por eso sobrevive a la unión
 * que viene (ver el último bloque de la cabecera de `Zocalo`).
 *
 * POR QUÉ NO UN CONO —opacidad máxima en el centro cayendo recta hasta el filo—: porque la
 * media de la opacidad sobre un disco así es 1/3 —rehecha: 0,3333 contra el 0,7300 del perfil
 * elegido—, o sea que tira más de la mitad de la tinta por el camino, y la tinta es lo que hace
 * que las veinticuatro parejas de color y terreno se separen. Con un cono, la marca pesaría el
 * 46 % de lo que pesa ésta y las parejas flojas se caerían todas.
 *
 * POR QUÉ NO UN `smoothstep`: porque a la anchura que aquí se puede gastar —3,8 píxeles en el
 * disco, 2,5 en la raya— la ese de un smoothstep no se distingue de la recta, y sí se distingue
 * en lo que cuesta vigilarla: la recta se escribe como una lista de números en el JSX y se lee
 * desde Node, y la ese pide un shader o una textura, o sea otro sitio del que no se puede
 * medir. Lo que se gana es que `verify:escena` compra el perfil ENTERO, vértice a vértice.
 *
 * POR QUÉ LA MESETA ES 0,70 Y LA CAÍDA 0,30 EN EL DISCO: la caída son 3,8 píxeles desde el
 * encuadre de tablero (0,30 · 0,014 · 900), o sea un degradado y no un filo de antialias —el
 * contorno que se quita medía 2,4 y ya se consideró el mínimo—; y es la caída más estrecha que
 * cabe bajo el techo de la tinta. Rehecho para cuatro caídas, con la opacidad de ahora y contra
 * los 1,998 del dúo relleno+contorno: 0,20 pondría el 109 %, 0,25 el 103 %, 0,30 el 98 % y 0,35
 * el 92 %. Con 0,20 la marca pesaría MÁS que la que se quita, que es justo lo que no puede
 * pasar; con 0,35 se gana poco y la meseta baja de 0,65, o sea que el trozo a opacidad entera
 * —el que hace que la marca se encuentre— se come el degradado.
 *
 * EN LA RAYA LA CAÍDA ES MENOR —0,20— Y NO ES UN DESCUIDO: la raya sólo tiene 0,68 de ancho
 * total, y ése es el mismo motivo por el que el contorno de antes iba por fuera en la raya y
 * por dentro en el disco. Con 0,20 por lado, la banda del eje se queda en 0,28, o sea 3,5
 * píxeles: por encima de los dos píxeles que esta casa exige a un trazo. Con 0,30 se quedaría
 * en 1,0 píxel, que es un trazo que no está.
 */
export const RADIO_DE_LA_MESETA = 0.7;
export const DESVANECIDO_DEL_DISCO = 0.3;

/**
 * LA RAYA DE UNA VEREDA.
 *
 * Larga y fina: 3,6 de largo por 0,68 de ancho total —0,28 de banda de eje y 0,20 de caída a
 * cada lado—, o sea 45,4 × 8,6 píxeles desde el encuadre de tablero. Es la marca MÁS floja de
 * las dos a propósito —se pidió que la vereda pesara menos que el asentamiento— y sale así con
 * número: 1,39 de tinta contra 1,95 del disco, o sea el 71 %.
 *
 * ═══ Y LAS PUNTAS TAMBIÉN SE APAGAN, QUE ES UNA DECISIÓN Y NO UN ARRASTRE ═══
 *
 * El perfil es «uno por dentro, cero en el borde», y las PUNTAS de la raya son borde igual que
 * sus cantos largos. Se apagan por dos razones y las dos son de diseño:
 *
 *   · porque una vereda que sale de un poblado NO DEBE TENER COSTURA CON ÉL —es la regla que se
 *     dio para el territorio—, y una punta que se corta en seco es exactamente una costura,
 *     mientras que una que se apaga se funde;
 *   · porque el perfil tiene que ser función de la distancia al BORDE y no de la distancia al
 *     EJE: si las puntas se cortaran en seco, esto sería una decoración de los cantos y no el
 *     perfil que la unión del territorio necesita.
 *
 * El degradado de las puntas ocupa UN tramo de `TRAMOS_DE_LA_RAYA`, o sea 3,6/18 = 0,20, los
 * mismos 2,5 píxeles que la caída de los cantos: una sola anchura para el borde entero. Cuesta
 * el 6 % del largo eficaz —3,4 de 3,6— y no toca la dirección, que es lo que la raya dice.
 */
export const LARGO_DE_LA_RAYA = 3.6;
export const ANCHO_DE_LA_RAYA = 0.28;
export const DESVANECIDO_DE_LA_RAYA = 0.2;
export const TRAMOS_DE_LA_RAYA = 18;

/**
 * LAS PIEZAS DE LA MARCA, por forma.
 *
 * Salen de aquí y no del JSX para que se puedan medir: `verify:escena` compra con ellas que la
 * marca se apaga hacia fuera, cuánta mancha y cuánta tinta pone, y que la marca entera no se
 * come a su vecina ni tapa el delta.
 */
export function piezasDelZocalo(forma: FormaDelZocalo, color: string): readonly PiezaDelZocalo[] {
  const suyo = colorLlanoDelJugador(color);
  if (forma === 'raya') {
    const aparte = ANCHO_DE_LA_RAYA / 2 + DESVANECIDO_DE_LA_RAYA / 2;
    return [
      {
        que: 'raya',
        largo: LARGO_DE_LA_RAYA,
        ancho: DESVANECIDO_DE_LA_RAYA,
        aparte,
        tramos: TRAMOS_DE_LA_RAYA,
        apaga: 1,
        color: suyo,
        opacidad: OPACIDAD_DEL_ZOCALO,
        orden: 1,
      },
      {
        que: 'raya',
        largo: LARGO_DE_LA_RAYA,
        ancho: DESVANECIDO_DE_LA_RAYA,
        aparte: -aparte,
        tramos: TRAMOS_DE_LA_RAYA,
        apaga: -1,
        color: suyo,
        opacidad: OPACIDAD_DEL_ZOCALO,
        orden: 1,
      },
      {
        que: 'raya',
        largo: LARGO_DE_LA_RAYA,
        ancho: ANCHO_DE_LA_RAYA,
        aparte: 0,
        tramos: TRAMOS_DE_LA_RAYA,
        apaga: 0,
        color: suyo,
        opacidad: OPACIDAD_DEL_ZOCALO,
        orden: 2,
      },
    ];
  }
  return [
    /* La falda va de la meseta al borde: no agranda el disco, se come su anillo de fuera. */
    {
      que: 'falda',
      dentro: RADIO_DE_LA_MESETA,
      fuera: RADIO_DE_LA_MESETA + DESVANECIDO_DEL_DISCO,
      color: suyo,
      opacidad: OPACIDAD_DEL_ZOCALO,
      orden: 1,
    },
    {
      que: 'meseta',
      fuera: RADIO_DE_LA_MESETA,
      color: suyo,
      opacidad: OPACIDAD_DEL_ZOCALO,
      orden: 2,
    },
  ];
}

/**
 * ═══ EL DEGRADADO, ESCRITO COMO COLORES POR VÉRTICE ═══
 *
 * `meshBasicMaterial` con `vertexColors` y un atributo de color de CUATRO componentes multiplica
 * el color del material por el del vértice Y SU ALFA por el alfa del vértice: lo enciende
 * `geometry.attributes.color.itemSize === 4` (`vertexAlphas` en `WebGLPrograms`, que define
 * `USE_COLOR_ALPHA`). Así que el perfil se escribe como una lista de números —RGB en uno, para
 * que el color del material pase entero, y el alfa con el perfil— y NO como un shader.
 *
 * Y ÉSA ES LA DECISIÓN QUE COMPRA LA VIGILANCIA, que es por lo que se elige esto y no una
 * textura de alfa ni un `onBeforeCompile`: una lista de números vive en el JSX, y un comprobador
 * de Node la lee vértice a vértice sin abrir un contexto de dibujo. Un shader o un PNG serían
 * otra vez el sitio del que no se puede medir, que es el fallo que este fichero existe para no
 * repetir.
 *
 * EL ORDEN DE LOS VÉRTICES es el que `three` genera, y por eso está escrito aquí y comprobado
 * allí:
 *
 *   · `CircleGeometry`: el centro, y luego `lados + 1` del borde.
 *   · `RingGeometry`: `lados + 1` del anillo de DENTRO y luego `lados + 1` del de FUERA.
 *   · `PlaneGeometry`: por filas de arriba abajo —la primera es la de `+alto/2`—, y cada fila
 *     de `tramos + 1` vértices de menos x a más x.
 *
 * SE CACHEA porque `Zocalo` no puede usar ganchos —es lo que permite llamarlo desde Node— y sin
 * caché cada repintado crearía un `Float32Array` nuevo, r3f vería un `args` distinto y volvería
 * a crear la geometría de las ciento veintiséis marcas. La caché es del módulo y la llave es la
 * pieza, que es lo que la determina entera.
 */
const ALFAS_YA_HECHAS = new Map<string, Float32Array>();

export function alfasDeLaPieza(pieza: PiezaDelZocalo): Float32Array {
  const llave = JSON.stringify(pieza);
  const hecha = ALFAS_YA_HECHAS.get(llave);
  if (hecha !== undefined) return hecha;
  const alfas: number[] = [];
  if (pieza.que === 'meseta') {
    /* Toda la meseta a uno: el centro y el borde, que es donde empieza la falda. */
    for (let i = 0; i < LADOS_DEL_DISCO + 2; i++) alfas.push(1);
  } else if (pieza.que === 'falda') {
    for (let i = 0; i <= LADOS_DEL_DISCO; i++) alfas.push(1);
    for (let i = 0; i <= LADOS_DEL_DISCO; i++) alfas.push(0);
  } else {
    /* Las puntas se apagan en el primer tramo y en el último; el canto, en la fila que toque. */
    for (let fila = 0; fila <= 1; fila++) {
      const enElCanto = pieza.apaga === 1 ? fila === 0 : pieza.apaga === -1 ? fila === 1 : false;
      const delCanto = enElCanto ? 0 : 1;
      for (let columna = 0; columna <= pieza.tramos; columna++) {
        const deLaPunta = columna === 0 || columna === pieza.tramos ? 0 : 1;
        alfas.push(delCanto * deLaPunta);
      }
    }
  }
  const salida = new Float32Array(alfas.length * 4);
  for (let i = 0; i < alfas.length; i++) {
    salida[i * 4] = 1;
    salida[i * 4 + 1] = 1;
    salida[i * 4 + 2] = 1;
    salida[i * 4 + 3] = alfas[i] as number;
  }
  ALFAS_YA_HECHAS.set(llave, salida);
  return salida;
}

/**
 * LO QUE OCUPA UNA MARCA: hasta dónde llega desde su centro, cuánto suelo cubre y cuánta
 * pintura pone de verdad.
 *
 * ═══ Y AQUÍ HAY DOS CIFRAS DONDE ANTES HABÍA UNA, QUE ES LO QUE EL DEGRADADO OBLIGA ═══
 *
 *   · `mancha` es el ÁREA de las mallas, sin mirar la opacidad: es la que dice cuánto suelo
 *     tapa la marca, y es la que se compara con el aro que había antes porque es la misma
 *     cuenta que aquélla.
 *   · `tinta` es la INTEGRAL DE LA OPACIDAD sobre esa mancha: es la que dice cuánto PESA, y es
 *     la única honrada con un degradado — contar una falda que acaba en cero como si fuera
 *     pintura entera es exactamente la forma de que un degradado ancho parezca ligero.
 *
 * Las dos en múltiplos de `RADIO_DE_TESELA` —al cuadrado—, y las dos salen de las piezas y no de
 * un número escrito aparte: son con lo que `verify:escena` compra que 126 marcas no son una
 * alfombra, que ninguna toca a su vecina y que el degradado no ha engordado la marca.
 */
export function loQueOcupaElZocalo(forma: FormaDelZocalo): {
  fuera: number;
  mancha: number;
  tinta: number;
} {
  let fuera = 0;
  let mancha = 0;
  let tinta = 0;
  for (const pieza of piezasDelZocalo(forma, 'red')) {
    if (pieza.que === 'raya') {
      fuera = Math.max(fuera, Math.hypot(pieza.largo / 2, Math.abs(pieza.aparte) + pieza.ancho / 2));
      mancha += pieza.largo * pieza.ancho;
      /*
       * El largo eficaz pierde UN tramo entero —dos medias rampas—, y el ancho eficaz se queda
       * en la mitad cuando uno de los dos cantos se apaga.
       */
      const largoEficaz = pieza.largo * (1 - 1 / pieza.tramos);
      const anchoEficaz = pieza.apaga === 0 ? pieza.ancho : pieza.ancho / 2;
      tinta += pieza.opacidad * largoEficaz * anchoEficaz;
      continue;
    }
    if (pieza.que === 'meseta') {
      fuera = Math.max(fuera, pieza.fuera);
      mancha += Math.PI * pieza.fuera * pieza.fuera;
      tinta += pieza.opacidad * Math.PI * pieza.fuera * pieza.fuera;
      continue;
    }
    fuera = Math.max(fuera, pieza.fuera);
    mancha += Math.PI * (pieza.fuera * pieza.fuera - pieza.dentro * pieza.dentro);
    /*
     * LA FALDA, INTEGRADA Y NO ESTIMADA: con la opacidad cayendo recta de uno en `dentro` a
     * cero en `fuera`, la integral de 2·π·r·(fuera−r)/(fuera−dentro) entre las dos.
     */
    const d = pieza.dentro;
    const f = pieza.fuera;
    tinta +=
      pieza.opacidad *
      ((2 * Math.PI) / (f - d)) *
      ((f * (f * f - d * d)) / 2 - (f * f * f - d * d * d) / 3);
  }
  return { fuera, mancha, tinta };
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
 * porque las tres bandas de la raya se apartan del eje: metidas en el grupo girado, sus
 * posiciones son `[0, ±aparte, 0]` y se leen; escritas en el grupo de fuera habría que girarlas
 * a mano, que es exactamente la cuenta que ya salió mal una vez y dejó los puentes de través.
 * Para un disco el giro es cero y el grupo sobra, pero se pone igual: un árbol con la misma
 * forma para las dos marcas es un árbol que un comprobador recorre con un solo camino.
 *
 * Y no lleva `visible`: no es un descuido, es que esta marca no se apaga nunca. Una pieza sin
 * zócalo es una pieza que no se encuentra, que es el fallo entero que esto existe para tapar.
 *
 * ═══ Y ESTO SOBREVIVE AL TERRITORIO CONTINUO QUE VIENE, QUE ES POR LO QUE ESTÁ ASÍ ESCRITO ═══
 *
 * Lo pedido después es que las marcas dejen de ser una insignia por pieza y pasen a ser UN
 * TERRITORIO por colono: el disco del poblado y la raya de la vereda FUNDIDOS, sin costura, de
 * modo que una cadena de veredas se lea como un solo trazo que se ensancha bajo cada poblado.
 * Aquel diseño tenía una pregunta abierta —qué hacer con el filo cuando el contorno deja de ser
 * por marca y pasa a ser el borde del territorio entero— y ESTO LA CONTESTA: no hay filo, el
 * territorio se apaga hacia fuera.
 *
 * Y se generaliza sin reescribir el perfil, porque el perfil NO está atado a un disco: la
 * opacidad es `min(1, distancia al borde / desvanecido)`. Hoy ese borde es el de cada marca y
 * la distancia se sabe de antemano —por eso caben cuatro números por vértice—; el día de la
 * unión, el borde es el de la UNIÓN de los discos y las rayas de un colono, y la misma fórmula
 * da, ella sola, lo que se pide: en el punto donde una vereda entra en su poblado la distancia
 * al borde del territorio es grande, así que la opacidad vale uno por los dos lados y LA
 * COSTURA NO EXISTE. Lo único que cambia es de dónde sale la distancia: hoy, de la forma de la
 * pieza; entonces, de la silueta que `piezasDelZocalo` deje de dar pieza a pieza. Lo que NO hay
 * que hacer es meter el degradado en una textura ni en un shader: dejaría de poderse leer desde
 * Node, que es lo que hoy compra que nadie apague la marca sin enterarse.
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
              <planeGeometry
                args={[RADIO_DE_TESELA * pieza.largo, RADIO_DE_TESELA * pieza.ancho, pieza.tramos, 1]}
              >
                <bufferAttribute attach="attributes-color" args={[alfasDeLaPieza(pieza), 4]} />
              </planeGeometry>
            )}
            {pieza.que === 'meseta' && (
              <circleGeometry args={[RADIO_DE_TESELA * pieza.fuera, LADOS_DEL_DISCO]}>
                <bufferAttribute attach="attributes-color" args={[alfasDeLaPieza(pieza), 4]} />
              </circleGeometry>
            )}
            {pieza.que === 'falda' && (
              <ringGeometry
                args={[RADIO_DE_TESELA * pieza.dentro, RADIO_DE_TESELA * pieza.fuera, LADOS_DEL_DISCO]}
              >
                <bufferAttribute attach="attributes-color" args={[alfasDeLaPieza(pieza), 4]} />
              </ringGeometry>
            )}
            <meshBasicMaterial
              color={pieza.color}
              vertexColors
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
