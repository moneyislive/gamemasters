/**
 * LA BARRA DE ABAJO: dónde cae cada cosa que se puede construir.
 *
 * ═══ POR QUÉ LA BARRA ESTÁ DENTRO DEL LIENZO Y NO ENCIMA DE ÉL ═══
 *
 * Lo natural en un navegador sería una fila de `<div>` con imágenes. Y no vale, por una
 * razón que este proyecto ya tiene decidida: ningún juego es sólo para PC. Lo que se
 * juegue en el escritorio se juega también en la app, y allí no hay DOM — hay
 * `expo-gl`. Una barra de HTML habría que escribirla dos veces, y dos escrituras de lo
 * mismo se separan siempre.
 *
 * Además no serían imágenes: son los MODELOS. El pack trae la casa, el castillo y el
 * puente en tres dimensiones, y enseñar la pieza de verdad —girando despacio, la misma
 * que va a aparecer en el tablero— es mejor que enseñar una foto suya. Eso sólo se
 * puede hacer dentro del lienzo.
 *
 * ═══ Y POR QUÉ LA CUENTA ESTÁ AQUÍ Y NO DONDE SE PINTA ═══
 *
 * Porque se puede comprobar. Que quepan seis piezas, que no se solapen, que ninguna se
 * salga por el borde y que en una pantalla estrecha encojan en vez de amontonarse son
 * cuatro afirmaciones que un guion de Node puede verificar con números. Dentro del
 * componente que las dibuja no se podría comprobar ninguna.
 *
 * ═══ LA BARRA VIVE PEGADA A LA CÁMARA ═══
 *
 * Sus coordenadas son las de la CÁMARA, no las del mundo: `x` a la derecha, `y` arriba
 * y `z` hacia atrás, con la cámara en el origen mirando a `-z`. Quien pinta copia la
 * posición y el giro de la cámara sobre el grupo y coloca los huecos dentro. Así la
 * barra sigue a la cámara sin tocar el árbol de la escena y sin una segunda pasada de
 * dibujo.
 */

/**
 * UNA PIEZA DE LA BARRA: lo que se puede coger para ponerlo en el tablero.
 *
 * `disponible` la decide el JUEGO, no la escena: es «¿puede pagarla ahora?», y eso
 * depende de la mano, del turno y de las reglas. La barra la enseña apagada y no deja
 * cogerla, pero no sabe por qué — igual que el anillo no sabe por qué un vértice vale.
 */
export interface PiezaDeBarra {
  id: string;
  /** El nombre del modelo en el catálogo. Se enseña la pieza de verdad, no una foto. */
  modelo: string;
  /** Si se puede coger ahora mismo. Si no, sale apagada. */
  disponible: boolean;
}

/**
 * EL MAZO EN LA BARRA: el hueco que no lleva una pieza del pack sino una carta.
 *
 * Es una interfaz de una sola bandera y va APARTE de `PiezaDeBarra`, no como una variante
 * suya, porque no es una pieza: no tiene `modelo`. El `.glb` trae ciento veintidós nodos
 * raíz y ninguno es una carta —está medido—, así que este hueco se dibuja con la misma
 * forma recortada que los naipes de la mano y no con una malla del catálogo. Si compartiera
 * tipo con `PiezaDeBarra` habría que inventarle un nombre de modelo que no existe, y en
 * esta escena un modelo que no existe no da error: DESAPARECE (ver `delta.tsx`, el `return
 * null` de la barra), que es el fallo silencioso que ya costó una vez que no salieran ni
 * árboles ni montañas.
 *
 * `disponible` la decide el JUEGO igual que en las piezas —«¿me llega el coste, queda mazo
 * y me toca?»— y la barra lo enseña apagado sin saber por qué.
 */
export interface MazoDeLaBarra {
  /** Si se puede comprar ahora mismo. Si no, sale apagado y no se pulsa. */
  disponible: boolean;
}

/**
 * EL NOMBRE DEL DIBUJO QUE LLEVA ESE NAIPE, y por qué está aquí y no dentro de la escena.
 *
 * Lo pide `delta.tsx` a `CONTORNOS_DE_LA_CARTA` y lo persigue `verify:riberas-en-tres` para
 * afirmar que existe y que no es prestado de ninguna carta del mazo. Escrito dos veces
 * —una en la escena y otra en el comprobador— el día que cambie cambiaría una sola, y el
 * comprobador seguiría verde vigilando un dibujo que ya no pide nadie. Escrito aquí es el
 * mismo dato.
 *
 * Un dibujo que no exista no revienta: sale un naipe de color plano. Por eso hace falta que
 * alguien lo pida por su nombre.
 */
export const DIBUJO_DEL_MAZO = 'comprarcarta';

/** Un hueco de la barra, en coordenadas de la cámara. */
export interface HuecoDeLaBarra {
  /** A la derecha del centro de la pantalla, en unidades de mundo a la distancia de la barra. */
  x: number;
  /** Sobre el centro de la pantalla. Es negativo: la barra está abajo. */
  y: number;
  /** Delante de la cámara, negativo. El mismo para todos. */
  z: number;
  /** Cuánto mide el lado del hueco. Lo que quepa dentro se escala a esto. */
  lado: number;
}

/**
 * A QUÉ DISTANCIA DE LA CÁMARA VIVE LA BARRA.
 *
 * Cerca, y por una razón concreta: entre la barra y la cámara no puede meterse nada del
 * mundo. En la vista de tablero eso sobra —el suelo está a seiscientas unidades— pero en
 * la vista de tierra la cámara camina a la altura de los ojos y un árbol le pasa a un
 * metro. A dos unidades no le pasa nada por delante.
 *
 * El plano cercano de la cámara tiene que quedar por debajo de esto, y el del banco está
 * en 0,5.
 */
export const DISTANCIA_DE_LA_BARRA = 2;

/** Qué parte del alto de la pantalla ocupa un hueco, cuando caben todos holgados. */
const PARTE_DEL_ALTO = 0.13;
/** Cuánto aire queda entre dos huecos, en fracción de hueco. */
const AIRE = 0.24;
/**
 * A QUÉ ALTURA DEL BORDE DE ABAJO FLOTA EL CENTRO DE LA BARRA.
 *
 * Estaba en 0,1 y las piezas salían con los pies fuera de la pantalla: el hueco se mide
 * desde su CENTRO, así que la mitad de abajo —el zócalo y el arranque del modelo— caía
 * por debajo del canto. Sube a poco más de la mitad de un hueco para que el zócalo entre
 * entero con aire.
 */
const DESDE_EL_SUELO = 0.155;
/**
 * Y CUÁNTO ANCHO DE PANTALLA PUEDE OCUPAR LA BARRA ENTERA COMO MUCHO.
 *
 * Estaba en 0,82 y con el cuarto hueco —el naipe del mazo— la barra se metía DEBAJO de la
 * baraja de bienes en los lienzos de móvil de la app (360 y 390 de ancho por 490 de alto):
 * las dos viven en el mismo plano, a dos unidades de la cámara, con las cartas delante, y
 * donde se solapan la carta gana el rayo y ese trozo del asa del naipe no se puede pulsar,
 * sin un error en ninguna parte. Con tres huecos no pasaba porque la barra era un 36 %
 * más estrecha. Cuando manda el ancho, el borde derecho de la barra cae siempre en
 * `ANCHO_MAXIMO / 2` del ancho visible, tenga tres huecos o cuatro. Con 0,70 queda a la
 * izquierda de la mano de bienes abierta por el imán en todos esos lienzos —por poco en el
 * de 360— y el asa del hueco sigue por encima de los 44 puntos de toque: 53 en el de 360,
 * y en el más bajo (320×360) sigue mandando el alto, así que el cuarto hueco no cuesta
 * nada. Con 0,68 ese lienzo pasaba a mandar por el ancho y el hueco encogía siete
 * décimas de punto. Lo mide `verify:escena` («el hueco del mazo queda libre de las
 * cartas de bienes»), que es lo que se puso rojo. En un monitor no cambia nada: ahí
 * manda el alto.
 */
const ANCHO_MAXIMO = 0.70;

/**
 * LOS HUECOS DE LA BARRA, repartidos y ya encogidos si hace falta.
 *
 * `campo` es el ángulo vertical de la cámara en radianes y `proporcion` el ancho partido
 * por el alto de la ventana. De ahí sale lo que se ve a la distancia de la barra, que es
 * lo que de verdad manda: en un móvil de pie caben los mismos seis que en un monitor,
 * pero más pequeños, y ésa es la diferencia entre una barra usable y una que se sale.
 *
 * Con cero piezas devuelve la lista vacía en vez de dividir por cero, que es el caso
 * real del turno de otro.
 *
 * ═══ LA BARRA ESTÁ CENTRADA, ASÍ QUE UN HUECO MÁS NO SE AÑADE: LO MUEVE TODO ═══
 *
 * `primero` sale de repartir el ancho total a los dos lados del cero, o sea que pedir un
 * cuarto hueco NO deja los tres de antes donde estaban y pone uno a la derecha: corre los
 * tres a la izquierda y mete el nuevo al final. Medido, en monitor: de x = -0,267 / 0 /
 * +0,267 a -0,401 / -0,134 / +0,134 / +0,401.
 *
 * Se deja escrito porque es exactamente lo que se ve al jugar —«se me han movido las
 * piezas»— y no es un fallo: una barra centrada que crece por un lado dejaría de estar
 * centrada, y en un móvil de pie el pulgar llega mucho mejor al medio que al borde
 * derecho. La alternativa —anclar los tres viejos y crecer hacia fuera— empuja el hueco
 * nuevo justo a la esquina peor de alcanzar.
 */
export function huecosDeLaBarra(
  cuantos: number,
  campo: number,
  proporcion: number,
): HuecoDeLaBarra[] {
  if (cuantos <= 0) return [];

  const alto = 2 * DISTANCIA_DE_LA_BARRA * Math.tan(campo / 2);
  const ancho = alto * proporcion;

  /*
   * El lado sale del ALTO y luego se recorta por el ANCHO, en ese orden. Al revés —
   * repartir el ancho entre las piezas— una barra de dos piezas saldría con dos
   * castillos gigantes, porque le sobraría sitio.
   */
  const porElAlto = alto * PARTE_DEL_ALTO;
  const cabenEnElAncho = (ancho * ANCHO_MAXIMO) / (cuantos + (cuantos - 1) * AIRE);
  const lado = Math.min(porElAlto, cabenEnElAncho);

  const paso = lado * (1 + AIRE);
  const primero = -((cuantos - 1) * paso) / 2;
  const y = -alto / 2 + alto * DESDE_EL_SUELO;

  const huecos: HuecoDeLaBarra[] = [];
  for (let i = 0; i < cuantos; i++) {
    huecos.push({ x: primero + i * paso, y, z: -DISTANCIA_DE_LA_BARRA, lado });
  }
  return huecos;
}

/**
 * ¿CAE ESTE PUNTO DE PANTALLA DENTRO DE UN HUECO?
 *
 * No la usa quien dibuja —para eso están los eventos del motor, que trazan un rayo de
 * verdad— sino quien comprueba: permite afirmar en un guion que los huecos no se
 * solapan y que están todos dentro de la pantalla, sin abrir una ventana.
 */
export function dentroDelHueco(hueco: HuecoDeLaBarra, x: number, y: number): boolean {
  return (
    Math.abs(x - hueco.x) <= hueco.lado / 2 && Math.abs(y - hueco.y) <= hueco.lado / 2
  );
}

/** Lo que la cámara ve a la distancia de la barra: alto y ancho, en unidades de mundo. */
export function loQueSeVe(campo: number, proporcion: number): { alto: number; ancho: number } {
  const alto = 2 * DISTANCIA_DE_LA_BARRA * Math.tan(campo / 2);
  return { alto, ancho: alto * proporcion };
}
