/**
 * DÓNDE SE PONE EL OJO PARA MIRAR EL TABLERO, Y CÓMO SE MUEVE ARRASTRANDO.
 *
 * ═══ POR QUÉ ESTO ES UN MÓDULO Y NO CUATRO LÍNEAS EN EL BANCO ═══
 *
 * Porque la pantalla de juego va a querer exactamente esta cámara, y porque aquí no se
 * importa `three`: es trigonometría, y la trigonometría se puede medir desde Node. Que un
 * arrastre no se cuele bajo el suelo, que la vuelta entera vuelva al mismo sitio o que
 * inclinar no acerque no son cosas que se puedan comprobar mirando una captura.
 *
 * ═══ EL TABLERO SE MIRA QUIETO ═══
 *
 * Daba vueltas solo desde el primer fotograma. Para enseñar el generador estaba bien —una
 * vuelta completa enseña el mundo entero sin tocar nada—, pero para JUGAR es lo contrario
 * de lo que hace falta: uno mira el tablero para decidir dónde construye, y decidir sobre
 * algo que se mueve cuesta más. Encima obliga a perseguir con el ratón lo que se quiere
 * pulsar. Así que se arranca quieto y se gira si uno quiere.
 */

/** Dónde está puesto el ojo: un rumbo alrededor del tablero y una altura sobre el horizonte. */
export interface Mirador {
  /** Radianes alrededor del eje vertical. El cero mira desde +Z. */
  readonly rumbo: number;
  /** Radianes sobre el horizonte. Cero es a ras de suelo; π/2 sería a plomo. */
  readonly altura: number;
}

/**
 * DE DÓNDE SALEN ESTOS DOS NÚMEROS: de la vista que ya había.
 *
 * La cámara del banco estaba clavada en (1,35 · alcance) de lado y (1,15 · alcance) de
 * alto. Eso es este rumbo y esta altura, sólo que escritos como lo que son —un ángulo—
 * en vez de como dos distancias. Escribirlo así no es cosmética: con dos distancias,
 * inclinar la vista cambiaba también lo lejos que estaba el ojo, y eso en pantalla no se
 * lee como inclinar sino como acercarse. Con un ángulo, la distancia se conserva sola.
 */
export const RUMBO_DE_SALIDA = 0.6;
export const ALTURA_DE_SALIDA = Math.atan2(1.15, 1.35);

/** Lo lejos que está el ojo, en unidades de «alcance» del tablero. Nunca cambia al girar. */
export const LEJANIA = Math.hypot(1.35, 1.15);

/**
 * HASTA DÓNDE SE PUEDE INCLINAR, Y POR QUÉ NO HASTA EL POLO.
 *
 * Por abajo, doce grados: más raso y el propio relieve tapa el tablero, además de que la
 * niebla se come el fondo entero.
 *
 * Por arriba NO se llega a los noventa a propósito. Justo en el polo el ojo mira en la
 * misma dirección que su propio «arriba», y entonces `lookAt` no tiene con qué decidir la
 * inclinación: la imagen pega un giro brusco y arbitrario al cruzarlo. Se para en ochenta
 * y dos, que en pantalla ya es una vista cenital y no tiene ese agujero.
 */
export const ALTURA_MINIMA = (12 * Math.PI) / 180;
export const ALTURA_MAXIMA = (82 * Math.PI) / 180;

/**
 * CUÁNTO GIRA UN ARRASTRE: se mide en pantallas, no en píxeles.
 *
 * Si el giro fuese por píxel, el mismo gesto —cruzar la pantalla con el dedo— daría media
 * vuelta en un monitor y un cuarto en un móvil, y el juego se sentiría distinto en cada
 * sitio. Medido en fracción de pantalla, cruzarla de lado a lado es siempre media vuelta.
 */
const VUELTA_POR_ANCHO = Math.PI;
const VUELTA_POR_ALTO = Math.PI / 2;

/**
 * DE QUIÉN ES ESTE GESTO: DE LA MANO O DE LA CÁMARA.
 *
 * ═══ EL FALLO QUE ESTO ARREGLA, VISTO EN PANTALLA ═══
 *
 * Pulsar y mover es a la vez «girar el tablero» y «llevar esta carta a su área». Lo que
 * los distingue es dónde empezó el gesto.
 *
 * El primer intento preguntaba a React si había algo cogido. Y giraba el mundo igual, con
 * la carta en la mano: al pulsar sobre una carta, el aviso de que está cogida no llega
 * hasta el siguiente repintado, y un gesto rápido —o un dedo en una pantalla táctil— mete
 * el primer movimiento ANTES de ese repintado. Preguntar a React quién manda es preguntar
 * por algo que todavía no ha pasado.
 *
 * Así que no se pregunta: se marca. La pieza de interfaz que atiende el pulsar apunta el
 * suceso del ratón —el objeto en sí— en este conjunto, y la cámara mira si está apuntado.
 * Eso ocurre dentro del mismo reparto del suceso, sin repintados de por medio.
 *
 * Es un `WeakSet` a propósito: la llave es el propio suceso, así que no hay nada que
 * limpiar ni ningún estado que se pueda quedar sucio. Cuando el navegador tira el suceso,
 * la marca se va con él.
 *
 * ═══ Y POR QUÉ LA CÁMARA ESCUCHA EN LA VENTANA Y NO EN EL LIENZO ═══
 *
 * Para no depender de en qué orden se apuntaron los oyentes. Un suceso baja hasta el
 * lienzo, se atiende allí —ahí es donde escucha la escena— y después SUBE hasta la
 * ventana. Escuchando arriba, la cámara llega siempre después de la escena, y eso lo dice
 * la norma del navegador, no la suerte del orden de montaje.
 */
const PRESAS_DE_LA_INTERFAZ = new WeakSet<object>();

/** La llama la pieza de interfaz que atiende el pulsar. El argumento es el suceso nativo. */
export function loCogeLaInterfaz(suceso: object): void {
  PRESAS_DE_LA_INTERFAZ.add(suceso);
}

/** Si este suceso ya se lo quedó la interfaz, la cámara no lo toca. */
export function esDeLaInterfaz(suceso: object): boolean {
  return PRESAS_DE_LA_INTERFAZ.has(suceso);
}

/**
 * LO QUE HAY QUE MOVERSE PARA QUE CUENTE COMO ARRASTRE, en píxeles.
 *
 * De quién es el gesto ya lo resuelve la marca de aquí arriba. Esto es lo otro: que hacer
 * clic no mueva el mundo un pelo. Un clic nunca es perfectamente quieto —la mano tiembla
 * al apretar el botón, y en una pantalla táctil el dedo rueda—, así que sin una zona
 * muerta cada pulsación deja el tablero un poco girado, que es de esas cosas que molestan
 * sin que uno sepa señalar qué.
 */
export const MINIMO_PARA_GIRAR = 4;

/** Encaja una altura entre sus topes. */
export function alturaValida(altura: number): number {
  return Math.min(ALTURA_MAXIMA, Math.max(ALTURA_MINIMA, altura));
}

export const MIRADOR_DE_SALIDA: Mirador = {
  rumbo: RUMBO_DE_SALIDA,
  altura: alturaValida(ALTURA_DE_SALIDA),
};

/**
 * CUÁNTO HAY QUE ALEJARSE PARA QUE EL TABLERO QUEPA EN ESTA PANTALLA.
 *
 * ═══ POR QUÉ ESTO VIVE EN LA CÁMARA Y NO EN EL ENCUADRE DEL TABLERO ═══
 *
 * `encuadreDelDelta` mide el MUNDO: dice lo grande que es el delta, y ese número también
 * gobierna la niebla y la caja de las sombras. Meterle la proporción de pantalla haría que
 * al girar un móvil cambiara el alcance de la niebla, que no tiene nada que ver con la
 * pantalla. Lo que depende del aparato es dónde se pone el OJO, y eso es esto.
 *
 * ═══ LA CUENTA ═══
 *
 * El campo de visión que declara una cámara es el VERTICAL; el horizontal sale de
 * multiplicarlo por la proporción. En apaisado sobra ancho y manda el alto, así que no hay
 * que hacer nada. En RETRATO —la app es vertical— el que se queda corto es el ancho, y hay
 * que alejarse en la misma proporción o el tablero se sale por los lados.
 *
 * ═══ Y LA REFERENCIA ES 16:9, NO «CUADRADO» ═══
 *
 * El primer intento usaba `1/proporcion`, que devuelve el ancho de una pantalla CUADRADA.
 * Y al medirlo se quedaba corto: en un móvil de 9:19,5 daba 146,9 de ancho visible cuando
 * el tablero pide 200. El encuadre de salida no se eligió en una pantalla cuadrada sino en
 * una de 16:9 —ahí sobran 261—, así que la referencia tiene que ser ésa.
 *
 * Con `16/9 ÷ proporcion` cualquier pantalla ve exactamente el mismo ancho de mundo que un
 * monitor. Y no se acerca nunca en las más anchas que la referencia: en una ultrapanorámica
 * sobra ancho, y acercarse por eso recortaría el alto.
 */
export const PROPORCION_DE_REFERENCIA = 16 / 9;

export function alejarseParaQueQuepa(proporcion: number): number {
  const suya = Math.max(0.05, proporcion);
  return suya >= PROPORCION_DE_REFERENCIA ? 1 : PROPORCION_DE_REFERENCIA / suya;
}

/**
 * Dónde va el ojo, en coordenadas del mundo, mirando al centro del tablero.
 *
 * La distancia al centro sale de `LEJANIA` y no depende de la altura, que es lo que hace
 * que inclinar sea inclinar y no acercarse. `proporcion` es ancho/alto de la pantalla; sin
 * ella se supone apaisado, que es lo que hacía antes de que existiera la app.
 */
export function ojoDelMirador(
  mirador: Mirador,
  alcance: number,
  proporcion = PROPORCION_DE_REFERENCIA,
): readonly [number, number, number] {
  const radio = alcance * LEJANIA * alejarseParaQueQuepa(proporcion);
  const llano = Math.cos(mirador.altura) * radio;
  return [Math.sin(mirador.rumbo) * llano, Math.sin(mirador.altura) * radio, Math.cos(mirador.rumbo) * llano];
}

/**
 * EL MIRADOR DESPUÉS DE ARRASTRAR TANTOS PÍXELES.
 *
 * ═══ EL SENTIDO: SE AGARRA EL MUNDO, NO LA CÁMARA ═══
 *
 * Arrastrar a la derecha lleva el tablero a la derecha, así que el ojo se va a la
 * IZQUIERDA — de ahí el signo menos. Es el gesto de girar un plano encima de la mesa con
 * la mano, y es lo que hace todo el mundo; con el signo al revés se siente roto aunque
 * nadie sepa decir por qué.
 *
 * Hacia abajo se sube: al tirar del suelo hacia uno, lo que asoma es la vista de arriba.
 */
export function tirandoDelMirador(
  mirador: Mirador,
  dx: number,
  dy: number,
  pantalla: { ancho: number; alto: number },
): Mirador {
  const ancho = Math.max(1, pantalla.ancho);
  const alto = Math.max(1, pantalla.alto);
  return {
    rumbo: mirador.rumbo - (dx / ancho) * VUELTA_POR_ANCHO,
    altura: alturaValida(mirador.altura + (dy / alto) * VUELTA_POR_ALTO),
  };
}
