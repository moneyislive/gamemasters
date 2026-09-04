/**
 * ACERCARSE AL TABLERO Y MOVERSE POR ÉL: la aritmética, sin `three` y sin React.
 *
 * ═══ QUÉ AÑADE ESTO A `camara.ts` ═══
 *
 * `camara.ts` dice DESDE DÓNDE se mira —un rumbo y una altura alrededor del centro,
 * siempre a la misma distancia— y eso basta para una vista de tablero entero. Lo que
 * no tiene es lo que pide cualquiera que quiera mirar de cerca: acercarse, y elegir a
 * QUÉ se acerca. Sin lo segundo, acercarse es acercarse siempre al mismo punto —el
 * centro—, y el borde del delta no se puede ver de cerca nunca.
 *
 * Así que aquí hay dos números y no uno: cuánto se acerca (`factor`) y adónde se mira
 * (`centro`, en el plano del tablero). El mirador de `camara.ts` sigue mandando en la
 * dirección; esto sólo mueve el ojo Y el punto al que apunta, juntos.
 *
 * ═══ POR QUÉ AQUÍ Y NO EN CADA CLIENTE ═══
 *
 * Porque son las mismas cuentas en la app y en el escritorio, y porque una cuenta que
 * vive en un fichero con `three` dentro no se puede comprobar en Node: hay que abrirla
 * en un aparato y mirar. Aquí no hay ni `three` ni React —sólo números—, así que
 * `verify:escena` la ejercita entera, incluidos los topes, que es justo lo que se rompe
 * sin que nadie lo vea.
 *
 * ═══ EL ACERCAMIENTO ES MULTIPLICATIVO, Y NO ES UN CAPRICHO ═══
 *
 * Cada paso MULTIPLICA la distancia en vez de restarle una cantidad. Restando, los
 * primeros pasos no se notan y los últimos se comen el tablero de golpe: la sensación
 * es la de un mando roto. Multiplicando, un paso vale siempre lo mismo —«un poco más
 * cerca»— tanto desde el aire como a ras de tejado, que es como funciona el zoom de
 * cualquier mapa.
 */

/** Dónde está mirando el ojo y desde qué distancia, además del rumbo y la altura. */
export interface Cercania {
  /**
   * Qué parte del encuadre entero se está mirando. 1 es el tablero completo, como
   * salía antes de que esto existiera; menos es más cerca.
   */
  readonly factor: number;
  /** El punto del plano del tablero al que se mira, respecto del centro del delta. */
  readonly centro: { readonly x: number; readonly z: number };
}

/** Se empieza como se empezaba siempre: el tablero entero, mirando a su centro. */
export const CERCANIA_DE_SALIDA: Cercania = { factor: 1, centro: { x: 0, z: 0 } };

/**
 * HASTA DÓNDE SE PUEDE ACERCAR, Y POR QUÉ HASTA AHÍ.
 *
 * El delta de diecinueve comarcas pide unas doscientas unidades de ancho, y una comarca
 * mide setenta y seis de punta a punta. Con `0,16` se ve un círculo de unas treinta y
 * dos unidades: media comarca llenando la pantalla, o sea las casas —que miden cinco—
 * a tamaño de mirarlas una por una. Más cerca que eso ya no se ve el juego, se ve un
 * modelo; y el atlas del pack no tiene detalle para tanto aumento.
 *
 * Por el otro lado se deja alejar un poco más del encuadre de salida: en una pantalla
 * muy estrecha viene bien tomar aire, y no cuesta nada.
 */
export const MAS_CERCA = 0.16;
export const MAS_LEJOS = 1.25;

/** Lo que acerca UN paso de rueda o un pellizco corto. Multiplicativo: ver la cabecera. */
export const PASO_DE_ACERCAMIENTO = 1.18;

/**
 * LA ALTURA MÍNIMA DEL OJO SOBRE LA LÁMINA DEL AGUA, en unidades de mundo.
 *
 * Al acercarse, la altura del mirador deja de bastar para mantener el ojo por encima
 * del mundo: doce grados sobre el horizonte son muchos metros a doscientas unidades y
 * casi ninguno a treinta, y el ojo acababa DENTRO de una colina, con el tablero visto
 * desde el interior de la roca. Se para en doce, que está por encima del tejado más
 * alto del pack (una atalaya) y deja pasar la vista rasante sin meterse en el suelo.
 */
export const ALTURA_MINIMA_DEL_OJO = 12;

/** Acota el factor a lo que se puede ver. Cualquier número raro cae en el encuadre entero. */
export function factorValido(factor: number): number {
  if (!Number.isFinite(factor)) return 1;
  return Math.min(MAS_LEJOS, Math.max(MAS_CERCA, factor));
}

/**
 * ACERCAR O ALEJAR unos cuantos pasos. Positivo acerca, negativo aleja; los pasos
 * pueden ser fraccionarios, que es lo que manda una rueda fina o un pellizco.
 */
export function acercando(cercania: Cercania, pasos: number): Cercania {
  if (!Number.isFinite(pasos) || pasos === 0) return cercania;
  const factor = factorValido(cercania.factor / Math.pow(PASO_DE_ACERCAMIENTO, pasos));
  return factor === cercania.factor ? cercania : { factor, centro: cercania.centro };
}

/** El acercamiento de un pellizco, que llega como una escala y no como pasos. */
export function pellizcando(cercania: Cercania, alEmpezar: number, escala: number): Cercania {
  if (!Number.isFinite(escala) || escala <= 0) return cercania;
  const factor = factorValido(alEmpezar / escala);
  return factor === cercania.factor ? cercania : { factor, centro: cercania.centro };
}

/**
 * HASTA DÓNDE SE PUEDE APARTAR LA MIRADA DEL CENTRO, en partes del alcance.
 *
 * El alcance es el radio del delta, así que con `1` se puede llevar la mirada hasta su
 * borde y no más allá: quien se acerca a una comarca del canto la ve entera, y nadie
 * acaba mirando el mar vacío sin saber cómo volver. Es un tope y no un muelle: al
 * llegar, se queda; rebotar en un mapa se lee como un fallo.
 */
export const APARTE_MAXIMO = 1;

/**
 * DESPLAZAR LA MIRADA arrastrando, en el plano del tablero.
 *
 * ═══ SE ARRASTRA EL MUNDO, NO LA CÁMARA ═══
 *
 * Llevar el dedo a la derecha trae el tablero a la derecha, o sea que la mirada se va a
 * la IZQUIERDA. Es el gesto de mover un plano sobre la mesa, y es lo que hace todo el
 * mundo sin pensarlo; al revés se siente roto aunque nadie sepa decir por qué. Es la
 * misma decisión que ya tomó `tirandoDelMirador` para el giro.
 *
 * ═══ Y SE MUEVE EN LOS EJES DE LA PANTALLA, NO EN LOS DEL MUNDO ═══
 *
 * El tablero se gira, así que «hacia la derecha» no es siempre el eje X del mundo: es
 * la derecha DE QUIEN MIRA, que depende del rumbo. Sin esto, arrastrar hacia un lado
 * movería el mapa en diagonal en cuanto se hubiera girado un poco, y eso no se aprende
 * nunca.
 *
 * Lo que se recorre está en unidades de mundo y sale del alcance que se ve AHORA
 * (`alcance · factor`): cruzar la pantalla con el dedo mueve una pantalla de mundo,
 * tanto de cerca como de lejos.
 */
export function arrastrandoLaMirada(
  cercania: Cercania,
  dx: number,
  dy: number,
  rumbo: number,
  alcance: number,
  pantalla: { ancho: number; alto: number },
): Cercania {
  const ancho = Math.max(1, pantalla.ancho);
  const alto = Math.max(1, pantalla.alto);
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return cercania;

  /* Cuánto mundo cabe ahora en la pantalla, a lo ancho y a lo alto. */
  const visto = Math.max(1e-6, alcance * cercania.factor) * 2;
  const porLaPantalla = { x: (-dx / ancho) * visto, z: (-dy / alto) * visto };

  /*
   * De los ejes de la pantalla a los del mundo. Con rumbo cero se mira desde +Z, así
   * que la derecha de quien mira es +X y «hacia dentro de la pantalla» es −Z.
   */
  const sen = Math.sin(rumbo);
  const cos = Math.cos(rumbo);
  const x = cercania.centro.x + porLaPantalla.x * cos + porLaPantalla.z * sen;
  const z = cercania.centro.z - porLaPantalla.x * sen + porLaPantalla.z * cos;

  return { factor: cercania.factor, centro: acotadoAlTablero({ x, z }, alcance) };
}

/** El punto de mira, dentro del tablero. Ver `APARTE_MAXIMO`. */
export function acotadoAlTablero(
  centro: { x: number; z: number },
  alcance: number,
): { readonly x: number; readonly z: number } {
  const tope = Math.max(0, alcance) * APARTE_MAXIMO;
  const lejos = Math.hypot(centro.x, centro.z);
  if (lejos <= tope || lejos === 0) return { x: centro.x, z: centro.z };
  const parte = tope / lejos;
  return { x: centro.x * parte, z: centro.z * parte };
}

/** Volver a la vista de siempre: el tablero entero, sin perder desde dónde se mira. */
export function comoAlPrincipio(): Cercania {
  return CERCANIA_DE_SALIDA;
}

/** ¿Se está mirando el tablero entero desde el centro, como al llegar? */
export function estaComoAlPrincipio(cercania: Cercania): boolean {
  return cercania.factor === 1 && cercania.centro.x === 0 && cercania.centro.z === 0;
}

/**
 * DÓNDE VA EL OJO Y ADÓNDE MIRA, ya con todo aplicado.
 *
 * `ojoAlrededor` es `ojoDelMirador` de `camara.ts`, que se pasa como argumento en vez
 * de importarse: así este fichero no depende de aquél y su comprobador puede ejercitar
 * los topes con una función de mentira. La distancia que se le pide ya lleva el
 * acercamiento; lo que devuelve se suma al punto de mira, porque acercarse a una
 * esquina es mover el ojo Y el objetivo, no sólo apuntar.
 */
export function ojoYMira(
  cercania: Cercania,
  alcance: number,
  ojoAlrededor: (distancia: number) => readonly [number, number, number],
): { readonly ojo: readonly [number, number, number]; readonly mira: readonly [number, number, number] } {
  const [x, y, z] = ojoAlrededor(alcance * cercania.factor);
  const mira = [cercania.centro.x, 0, cercania.centro.z] as const;
  const alto = Math.max(mira[1] + ALTURA_MINIMA_DEL_OJO, mira[1] + y);
  return { ojo: [mira[0] + x, alto, mira[2] + z], mira };
}
