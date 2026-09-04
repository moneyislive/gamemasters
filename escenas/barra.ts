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
/** Y cuánto ancho de pantalla puede ocupar la barra entera como mucho. */
const ANCHO_MAXIMO = 0.82;

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
