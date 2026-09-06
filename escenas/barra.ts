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

/**
 * QUÉ PARTE DEL ALTO DE LA PANTALLA OCUPA UN HUECO, cuando caben todos holgados.
 *
 * Estaba en 0,13 y en APAISADO el asa caía bajo el suelo de toque: en un lienzo de 320
 * puntos de alto —el iPhone SE de primera generación girado, y cualquier Android de 320
 * dp de ancho girado— un hueco medía `0,13 · 320 = 41,6` puntos, y la casa tiene escrito
 * que nada que se toque baja de 44 (`SUELO_DEL_TOQUE`). Con 0,14 salen 44,8. Es la única
 * constante de aquí que cambia con la mesa, y su efecto colateral está medido: en el
 * lienzo de 320×360 pasa a mandar el ANCHO (47,5 puntos, sigue sobre 44) y la barra llega
 * a `x = 0,515`, aún a la izquierda de las cartas de bienes quietas (0,641). Lo mide
 * `verify:escena` en los lienzos de pie y en los ocho apaisados.
 */
const PARTE_DEL_ALTO = 0.14;
/**
 * EL SUELO DE TOQUE DE LA CASA, en puntos: nada que se pulse mide menos.
 *
 * Está aquí y no sólo en el comprobador porque `huecosDeLaMesa` decide con él si los
 * dados caben como quinto hueco. Escrito dos veces, el día que la casa lo suba cambiaría
 * uno y la mesa seguiría dando dados de 44 en un lienzo que ya exige 48.
 */
export const SUELO_DEL_TOQUE = 44;
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
 * de 360— y el asa del hueco sigue por encima de los 44 puntos de toque: 53 en el de 360.
 * En el más bajo (320×360) manda el ANCHO desde que `PARTE_DEL_ALTO` subió a 0,14: con
 * tres huecos el lado es 0,2320 —lo que da el alto— y con cuatro 0,2184 —lo que cabe en
 * el 70 % del ancho—, 47,5 puntos, aún sobre el suelo. Así que ahí el cuarto hueco SÍ
 * cuesta —tres puntos de asa— y lo que `verify:escena` exige en ese lienzo ya no es que
 * tres y cuatro midan lo mismo sino que los dos lleguen a 44. Lo mide también «el hueco
 * del mazo queda libre de las cartas de bienes», que es lo que se puso rojo con 0,82. En
 * un monitor no cambia nada: ahí manda el alto.
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
 * EL HUECO DE LOS DADOS: un asa para los dos, y de dónde ha salido.
 *
 * `ancho` y `alto` van aparte porque colgado a la izquierda el asa es más ancha que alta
 * —1,6 lados por 1— y como quinto hueco es cuadrada; `lado` es el del reparto al que
 * pertenece, que es lo que escala los dados (0,46 lados cada uno). `forma` dice cuál de
 * los dos peldaños se ha aplicado, para que un comprobador pueda afirmar en qué lienzo
 * pasa cada cosa y no sólo que «hay dados».
 */
export interface HuecoDeLosDados {
  x: number;
  y: number;
  z: number;
  ancho: number;
  alto: number;
  lado: number;
  forma: 'colgado' | 'quinto';
}

/** Cuánto mide el asa de los dados colgada, en lados del reparto. Los dos cubos y su aire. */
export const ANCHO_DEL_ASA_DE_LOS_DADOS = 1.6;
/** Cuánto aire se exige entre el asa colgada y el canto izquierdo, en lados. */
const AIRE_HASTA_EL_CANTO = 0.5;

/**
 * LOS HUECOS DE LA MESA: los de las piezas, y dónde van los dados si van.
 *
 * ═══ POR QUÉ NO ES `huecosDeLaBarra(cuantos + 1)` Y YA ═══
 *
 * Porque los dados no son una pieza más. Una pieza más ENCOGE a las demás donde manda el
 * ancho —el reparto es centrado y se aprieta— y en un lienzo de 320 de alto eso baja el
 * asa de las piezas por debajo del suelo de toque para meter un hueco que, además, no
 * llegaría al suelo él tampoco. Así que la regla es de TRES PELDAÑOS, en este orden, y
 * es «cabe o no cabe, llega a 44 o no», nunca la proporción de la pantalla, para que un
 * lienzo raro no caiga en la forma equivocada:
 *
 *   1. COLGADO a la izquierda del reparto de siempre, con un paso de aire (`AIRE · lado`)
 *      entre su borde derecho y el primer hueco, SIEMPRE QUE QUEPA con medio lado de aire
 *      hasta el canto izquierdo. `piezas` es `huecosDeLaBarra(cuantos, …)` tal cual: las
 *      piezas no se mueven un milímetro. Es lo que pasa en todos los apaisados, donde el
 *      alto manda y sobra ancho.
 *   2. Como QUINTO hueco del reparto centrado —el primero por la izquierda— cuando el
 *      colgado no cabe Y el asa de ese reparto sigue en o por encima del suelo de toque.
 *      `piezas` son los demás huecos de `huecosDeLaBarra(cuantos + 1, …)`: se corren un
 *      poco a la izquierda y encogen, por lo mismo que dice la cabecera de
 *      `huecosDeLaBarra`. Es lo que pasa de pie en 390 de ancho y en las tabletas.
 *   3. `dados: null` cuando ni el colgado cabe ni el quinto llega al suelo. Las piezas no
 *      encogen, y TIRAR se queda como botón fuera del lienzo: cada movimiento
 *      exactamente una vez, nadie sin tirar. Pasa en 320×360 y en 360×490.
 *
 * ═══ POR QUÉ RECIBE EL ALTO EN PUNTOS ═══
 *
 * El suelo de 44 es en PUNTOS de pantalla y el reparto sólo sabe de unidades de mundo.
 * Quien pinta lo tiene (`estado.size.height`, que la barra ya lee para la proporción) y
 * las dos pantallas también, y las dos preguntan lo mismo que la escena —`dados !== null`—
 * antes de quitar el botón: como llaman a la misma función con la misma medida no pueden
 * discrepar. Si la escena no pinta dados, la pantalla no quita el botón.
 *
 * `cuantos` es el número REAL de huecos de la barra —las piezas más el mazo si lo hay: tres
 * en la colocación, cuatro jugando—, no un cuatro escrito aquí, porque el sitio que queda
 * a la izquierda depende de cuántos hay. Con cero no hay barra y no hay mesa.
 */
export function huecosDeLaMesa(
  cuantos: number,
  campo: number,
  proporcion: number,
  altoEnPuntos: number,
): { piezas: HuecoDeLaBarra[]; dados: HuecoDeLosDados | null } {
  const piezas = huecosDeLaBarra(cuantos, campo, proporcion);
  const primero = piezas[0];
  if (primero === undefined) return { piezas, dados: null };

  const { alto, ancho } = loQueSeVe(campo, proporcion);
  const enPuntos = (lado: number): number => (lado / alto) * altoEnPuntos;

  /* 1. Colgado: su borde derecho a un paso de aire del primer hueco. */
  const lado = primero.lado;
  const derecha = primero.x - lado / 2 - AIRE * lado;
  const izquierda = derecha - ANCHO_DEL_ASA_DE_LOS_DADOS * lado;
  if (izquierda - -ancho / 2 >= AIRE_HASTA_EL_CANTO * lado - 1e-9) {
    return {
      piezas,
      dados: {
        x: (izquierda + derecha) / 2,
        y: primero.y,
        z: primero.z,
        ancho: ANCHO_DEL_ASA_DE_LOS_DADOS * lado,
        alto: lado,
        lado,
        forma: 'colgado',
      },
    };
  }

  /* 2. Quinto hueco, sólo si el reparto apretado sigue sobre el suelo de toque. */
  const conUnoMas = huecosDeLaBarra(cuantos + 1, campo, proporcion);
  const quinto = conUnoMas[0];
  if (quinto !== undefined && enPuntos(quinto.lado) >= SUELO_DEL_TOQUE - 1e-9) {
    return {
      piezas: conUnoMas.slice(1),
      dados: { x: quinto.x, y: quinto.y, z: quinto.z, ancho: quinto.lado, alto: quinto.lado, lado: quinto.lado, forma: 'quinto' },
    };
  }

  /* 3. Sin dados: las piezas se quedan como estaban y el botón sigue fuera. */
  return { piezas, dados: null };
}

/**
 * EL ZÓCALO DE CADA HUECO, en lados del hueco: dónde está centrado, cuánto mide de alto y
 * de radio. Es el posavasos hexagonal que llevan las piezas y el naipe del mazo.
 *
 * ═══ POR QUÉ ESTOS TRES NÚMEROS VIVEN AQUÍ Y NO SÓLO DONDE SE PINTAN ═══
 *
 * Porque la TAPA de la mesa apoya en la cara de abajo del zócalo (`cotaDeLaTapa`), y esa
 * cota se mide en Node sin abrir una ventana. Si el zócalo se escribiera con números
 * sueltos en `delta.tsx` y la cota con otros aquí, el día que alguien bajara el zócalo un
 * pelo la mesa se quedaría flotando por debajo de él, o atravesándolo, y ningún guion lo
 * diría. Quien pinta lee ESTOS tres y `verify:escena` afirma sobre el texto de `delta.tsx`
 * que los lee de aquí.
 */
export const ZOCALO = {
  /** Cuánto queda su centro por debajo del centro del hueco. */
  centro: 0.42,
  alto: 0.12,
  /** El radio de la cara de abajo; la de arriba es un poco más estrecha (0,46). */
  radio: 0.5,
} as const;

/**
 * A QUÉ ALTURA VA LA TAPA DE LA MESA: la cara de ABAJO del zócalo, y ni un pelo más.
 *
 * La tapa es horizontal y a esta cota, y no inclinada hacia la cámara, porque el asa mide
 * 0,8 lados de fondo y un plano a 22° subiría 0,16 lados a media profundidad del asa —más
 * que el zócalo entero—: no se puede inclinar la tapa y afirmar a la vez que las piezas no
 * se mueven. Con la tapa aquí no se mueve ninguna: `hueco.y − 0,48·lado`. En los apaisados
 * cae a `−0,683` (el 8,8 % del alto desde el canto de abajo).
 */
export function cotaDeLaTapa(hueco: HuecoDeLaBarra): number {
  return hueco.y - (ZOCALO.centro + ZOCALO.alto / 2) * hueco.lado;
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
