/**
 * EL AGUA VIVA DEL DELTA: el sombreador del mar, y por qué el color de partida no se
 * elige aquí sino que se copia del pack.
 *
 * ═══ QUÉ PINTA ═══
 *
 * Las cuatro cosas del §2 de `docs/EL-MAR-DE-RIBERAS.md`, y todas cuelgan del mismo
 * número: la distancia a la costa que `costa.ts` deja en cada vértice.
 *
 *   1. LA ORILLA QUE SE MOJA: una banda estrecha de espuma pegada al contorno, cuyo
 *      ancho respira.
 *   2. LAS OLAS: parches de espuma SUELTOS, cada uno con su sitio, su tamaño y su
 *      fuerza, que nacen mar adentro, viajan hacia la costa y se apagan donde les toca
 *      —unos llegan a la playa y otros se deshacen a medio camino—. NO son anillos: ver
 *      la cabecera de `CAMPO_DE_LAS_OLAS`, que es donde está todo el oficio.
 *   3. LAS OLAS CON CRESTA: levantan el VÉRTICE, con la altura modulada por la
 *      distancia a la costa y por un ruido lento, para que unas sean más altas que
 *      otras. Sin ese ruido un oleaje perfecto se lee como chapa ondulada.
 *   4. EL VAIVÉN: el avance y retroceso de (1) sobre la arena, más lento que el rizo.
 *
 * La lámina NO sube ni baja (decisión 4 del §1): el vaivén se cuenta con la espuma. Y
 * la espuma se apaga antes de llegar a donde se construye (decisión 5): ver el
 * contrato de `ESPUMA_TIERRA_ADENTRO`, más abajo.
 *
 * ═══ EL COLOR DEL MAR EN CALMA NO PUEDE CAMBIAR, Y ÉSA ES LA PARTE DELICADA ═══
 *
 * Hasta hoy el mar era el material del pack CLONADO, con su textura fijada en el téxel
 * de la cara de arriba de `tesela-agua`: el mismo píxel de la misma imagen que pintan
 * los lagos del tablero, con la misma rugosidad y bajo las mismas luces. Por eso el
 * río llegaba al mar y no había costura. Un sombreador propio se sale de ese camino y
 * tiene que volver a él a mano, en tres piezas:
 *
 *   · EL ALBEDO. `COLOR_DEL_AGUA_DEL_PACK` es ese téxel, medido. NO se puede leer en
 *     marcha: sacar un píxel de una textura ya cargada pide un lienzo, y este fichero
 *     lo pintan dos clientes, uno de ellos sin DOM. Así que se mide FUERA —al lado de
 *     donde se hornean los modelos— y `verify:escena` vuelve a medirlo sobre
 *     `tablero.glb` y su atlas: el día que el pack cambie su agua, la batería lo dice
 *     con el número nuevo delante. Es el mismo trato que `ALTURA_DE_LA_CASA_EN_EL_PACK`.
 *   · LA LUZ. Un `ShaderMaterial` no lo ilumina nadie: si el mar saliera con su albedo
 *     pelado se vería un veinte por ciento más claro que sus propios lagos, que es
 *     exactamente la costura que se arregló en su día. Aquí se rehace la cuenta que
 *     `three` hace para un `MeshStandardMaterial` de metalicidad cero: irradiancia por
 *     albedo entre pi, con las mismas tres luces del delta. Ver `LAS_LUCES_DEL_DELTA`.
 *   · EL BRILLO. La misma GGX de `three`, con la rugosidad 0,5 y el f0 0,04 del
 *     material del pack. No es adorno: sin él el agua queda más saturada que los lagos,
 *     que sí lo llevan. Y de paso es lo que hace destellar las crestas.
 *
 * Con las tres, un vértice llano y sin espuma sale del mismo color que la tesela de
 * agua de al lado. Si algún día no lo hiciera, el sitio donde mirar es éste.
 *
 * ═══ POR QUÉ EL GLSL ES CORTO Y CONSERVADOR ═══
 *
 * La misma restricción que el agua del muelle (`embarcadero/agua.ts`): el mismo texto
 * tiene que compilar en WebGL2 y en `expo-gl`. Nada de extensiones, precisión `mediump`
 * declarada, sin texturas y SIN DERIVADAS —`dFdx` y `fwidth` no existen en la mitad de
 * los teléfonos—. Las normales se sacan ANALÍTICAMENTE derivando los mismos senos que
 * desplazan. `verify:escena` lo comprueba leyendo el texto.
 *
 * Y `mediump` tiene una consecuencia que conviene decir: en un teléfono son dieciséis
 * bits, o sea una unidad de mundo de precisión a dos mil del origen. La espuma vive
 * dentro de los ciento cincuenta que rodean la costa, donde todavía quedan centímetros;
 * lo que se desdibuja lejos es la fase del oleaje de mar abierto, y ahí la niebla ya se
 * lo está comiendo.
 *
 * ═══ LA NIEBLA ES LA DE `three`, NO UNA PROPIA ═══
 *
 * El delta pinta su niebla con `<fog>` y el mar cubre la pantalla hasta el horizonte.
 * Con dos nieblas distintas —o con una sola que el mar no aplicara— el borde del disco
 * se leería como una costura recta a dos mil unidades. Se usan los trozos `fog_*` del
 * motor, y por eso el material lleva `fog: true` y sus uniforms fusionados.
 */
import * as THREE from 'three';
import { RADIO_DE_TESELA } from './escala';
import { MAR_ADENTRO_DE_LOS_BARCOS } from './marina';
import { ESPUMA_TIERRA_ADENTRO } from './presupuesto-del-delta';

/**
 * EL AGUA DEL PACK, MEDIDA: el téxel de la cara de arriba de `tesela-agua`.
 *
 * Sale de muestrear `hexagons_medieval.png` en la UV media de las veintitrés esquinas
 * altas de `hex_water` dentro de `escenas/modelos/tablero.glb` —que es exactamente lo
 * que hacía el disco de antes fijando `repeat` a cero y `offset` en esa UV—. No se
 * escribe a ojo y no se puede tocar a gusto: `verify:escena` lo vuelve a medir y falla
 * si alguien lo mueve o si el pack cambia su agua.
 */
export const COLOR_DEL_AGUA_DEL_PACK = '#257bba';

/**
 * EL BLANCO DE LA ESPUMA. Roto y algo azulado, no papel.
 *
 * Un blanco puro sobre este azul se lee como un recorte de papel pegado encima; y
 * además lo que se ve es este albedo multiplicado por la irradiancia y pasado por el
 * mapeo de tonos, así que un 1,0 saldría quemado en la franja de sol y plano en la
 * sombra. Con este tono la espuma queda clara y sigue siendo agua.
 */
export const COLOR_DE_LA_ESPUMA = '#dbecf0';

/**
 * LAS TRES LUCES DEL DELTA, con sus colores y sus intensidades.
 *
 * Viven AQUÍ y no dentro del componente `Luces` por una razón que no es de orden: el
 * mar tiene que iluminarse con exactamente las mismas para no separarse de los lagos,
 * y dos listas de números que tienen que coincidir acaban no coincidiendo. `Luces` las
 * lee de aquí; el sombreador también. No hay dos sitios que puedan discrepar.
 *
 * El rumbo del sol es la POSICIÓN de la direccional en fracciones del alcance
 * (`alcance·0,55`, `alcance·1,2`, `alcance·0,4`): el alcance se simplifica al
 * normalizar, así que la dirección de la luz no depende del tamaño del mundo.
 */
export const LAS_LUCES_DEL_DELTA = {
  ambiente: { color: '#cfe0f0', intensidad: 0.55 },
  cielo: { arriba: '#eaf4ff', abajo: '#54613f', intensidad: 0.6 },
  sol: { color: '#fff3dd', intensidad: 2, rumbo: [0.55, 1.2, 0.4] as const },
} as const;

/**
 * LO QUE LE LLEGA AL MAR QUE NO VIENE DEL SOL, en irradiancia lineal.
 *
 * Es la suma de la ambiental y del hemisférico, que es como los junta
 * `lights_fragment_begin` de `three`. El hemisférico depende de la normal —mezcla
 * cielo y suelo con `0,5·n.y + 0,5`— y aquí se evalúa con la normal en pie: el mar se
 * inclina como mucho seis grados, así que el peso se mueve tres milésimas y no paga
 * dos uniforms más. Lo que sí se mueve con la ola es el término del sol, que es el que
 * lleva la mitad de la luz y todo el relieve.
 */
export function irradianciaDeFondo(): THREE.Color {
  const { ambiente, cielo } = LAS_LUCES_DEL_DELTA;
  return new THREE.Color(ambiente.color)
    .multiplyScalar(ambiente.intensidad)
    .add(new THREE.Color(cielo.arriba).multiplyScalar(cielo.intensidad));
}

/** El color por la intensidad de la direccional, que es lo que `three` manda al sombreador. */
export function irradianciaDelSol(): THREE.Color {
  const { color, intensidad } = LAS_LUCES_DEL_DELTA.sol;
  return new THREE.Color(color).multiplyScalar(intensidad);
}

/** Hacia dónde está el sol, normalizado. */
export function rumboDelSol(): THREE.Vector3 {
  const [x, y, z] = LAS_LUCES_DEL_DELTA.sol.rumbo;
  return new THREE.Vector3(x, y, z).normalize();
}

/**
 * LA ALTURA DE LA OLA, en unidades de mundo: un doce por ciento de radio de tesela.
 *
 * Sale 0,76 de amplitud; como los dos trenes suman 1,62 amplitudes, la cresta más alta
 * queda a 1,23 sobre la lámina y de cresta a valle hay 2,46 —casi una persona, que mide
 * 2,54—. Con olas de cincuenta de largo eso es una pendiente de siete grados: marejada,
 * no temporal.
 *
 * EL TOPE NO ES DE GUSTO, y no tiene que ver con la costa —ahí la envolvente ya vale
 * cero—: es que una cresta del tamaño de un ESCALÓN de terraza deja de leerse como agua
 * y se lee como una duna. `verify:escena` mide que se queda en un tercio de escalón.
 *
 * Va en fracción de tesela y no en un número suelto para que un mundo a otra escala
 * siga teniendo el mar a la altura de sus playas.
 */
export const ALTURA_DE_LA_OLA = RADIO_DE_TESELA * 0.12;

/**
 * LA DISTANCIA EN LA QUE EL MAR COGE SU ALTURA, medida desde la costa hacia fuera:
 * siete teselas, cuarenta y cuatro unidades.
 *
 * Ya no es «dónde están las olas» —las olas están donde el campo de parches las pone, y
 * eso es todo el mar—: es la rampa que las apaga contra tierra. A cero de la costa la ola
 * no levanta nada, a treinta y cinco levanta todo, y la espuma no empieza hasta trece.
 * Es lo que separa el agua viva de las teselas de agua del tablero, que son geometría
 * fija y no ondulan.
 *
 * ═══ Y NO, NO SE SALE DE LA PARTE FINA DEL DISCO ═══
 *
 * Es la duda razonable: el aro de anillos apretados acaba en `1,10·alcance` —372
 * unidades de radio, o sea entre veinticinco y cien mar adentro según por dónde se mire
 * la costa— y más allá los anillos saltan de sesenta y siete a trescientos. Pero la
 * espuma vive en la corona, que se ha apagado del todo a 248 de la costa: por dentro del
 * aro fino en todos los azimuts. Nada de lo que se pinta cae en la parte basta.
 *
 * Y lo que sí sale ahí fuera —el rizo de la ola, que llega hasta el horizonte— no lo
 * sufre: lo que se pagó con los anillos apretados es la resolución TANGENCIAL, seguir el
 * contorno dentado del delta, y eso lo dan los 288 sectores y no los radios. En radial la
 * ola lee una distancia INTERPOLADA entre dos anillos, y el campo de distancias es casi
 * lineal según se sale al mar abierto: interpolar entre dos vértices separados sesenta y
 * siete unidades da prácticamente el valor exacto.
 *
 * Este párrafo ya mintió una vez —decía «a ciento treinta ya se está apagando» cuando el
 * código apagaba a 619— así que si se toca la corona, se toca esto.
 */
export const DISTANCIA_DE_LA_ROMPIENTE = RADIO_DE_TESELA * 7;

/**
 * EL CONTRATO DE LA ESPUMA, en fracciones de `ESPUMA_TIERRA_ADENTRO`.
 *
 * `docs/EL-MAR-DE-RIBERAS.md` §1.5 y `presupuesto-del-delta.ts`: la espuma vive en el
 * agua y se apaga antes de llegar a donde se pone una choza. El sombreador lo cumple
 * por construcción y no por afinado: la banda entra tierra adentro como mucho
 * `LAMIDO`, y se difumina en `PLUMA` más. Mientras la SUMA de las dos no pase de uno,
 * lo más adentro que puede llegar un ápice de blanco es `ESPUMA_TIERRA_ADENTRO`
 * exacto, que es lo prometido. `verify:escena` comprueba la suma.
 *
 * Y por si alguien las toca sin leer esto, el fragmento remata con un `step` que corta
 * en seco a `-ESPUMA_TIERRA_ADENTRO`: el contrato no depende de que los números de
 * arriba sigan cuadrando.
 */
export const LAMIDO_DE_LA_ORILLA = 0.8;
export const PLUMA_DE_LA_ORILLA = 0.2;

/**
 * LA SOMBRA DEL TABLERO: dónde la ola todavía NO levanta nada, porque debajo hay tablero.
 *
 * ═══ EL FALLO QUE ESTO CIERRA, QUE NO SE VE VENIR ═══
 *
 * El disco del mar no acaba en la costa: pasa POR DEBAJO del tablero hasta el centro, y
 * la cota a la que vive —`LAMINA`— es EXACTAMENTE la de la lámina de una tesela de agua
 * del pack a nivel cero. Está escrito en la cabecera del `Mar` de `delta.tsx` y fue una
 * decisión buena: así el río llega al mar sin escalón.
 *
 * Pero eso significa que cualquier cosa que LEVANTE el disco lo saca por encima de los
 * ríos y lagos del propio tablero, que son geometría fija y no ondulan. Y la distancia a
 * la costa es POSITIVA sobre ellos —la inundación de `costa.ts` marca como mar toda el
 * agua conectada con el exterior, estuarios incluidos—, así que la envolvente, que sólo
 * mira esa distancia, no tiene forma de saber que ahí hay una tesela encima. Medido sobre
 * ocho semillas antes de poner esto: el disco asomaba hasta 0,19 sobre el agua del pack, y
 * a la cota exacta el resto del tiempo, que es donde aparece el parpadeo de profundidad.
 *
 * El número sale de la misma medida: lo más adentro que llega el agua interior conectada
 * es 8,8 unidades de costa, o sea 1,4 radios de tesela. Con 2,5 sobra casi el doble, y
 * sigue habiendo veinte unidades de rampa antes de la rompiente para que el mar de fuera
 * no arranque de golpe. `verify:escena` recorre los vértices del disco, mira con
 * `hexDePunto` cuáles caen sobre una subtesela del tablero y exige que ésos no se muevan
 * ni reciban espuma: si alguien baja esta constante, salta.
 */
export const SOMBRA_DEL_TABLERO = RADIO_DE_TESELA * 2.5;

/**
 * DÓNDE ROMPE EL MAR: una corona, no todo el agua.
 *
 * ═══ POR QUÉ NO VALE REPARTIRLAS POR TODAS PARTES ═══
 *
 * Con las motas por todo el mar se ve mal, y por dos motivos distintos. Cerca de tierra
 * quedan espumas entre los barcos fondeados y la playa, y eso no se lee como oleaje sino
 * como manchas en el agua. Y lejos, en el horizonte, los anillos del disco miden más que
 * la propia mota: la espuma parpadea de un fotograma a otro porque cae dentro o fuera de
 * un píxel según se mueva la cámara.
 *
 * Así que rompen en una franja, y la franja se ancla A LOS BARCOS: empieza justo donde
 * acaba de navegar el más lejano —`MAR_ADENTRO_DE_LOS_BARCOS`, cincuenta y nueve
 * unidades— y no antes. Ahí es donde de verdad revienta una ola: pasada la rada, sobre
 * la barra, con la flota por dentro y el mar abierto por fuera.
 *
 * Los cuatro números van en múltiplos de esa distancia y no sueltos, para que el día que
 * la flota se acerque o se aleje la espuma la siga sin que nadie se acuerde de esto.
 */
export const CORONA_DE_LAS_OLAS = {
  /** Donde asoma la primera espuma: el límite de la flota. */
  desde: MAR_ADENTRO_DE_LOS_BARCOS,
  /** Donde ya rompe entera, a menos del doble. */
  llena: MAR_ADENTRO_DE_LOS_BARCOS * 1.7,
  /** Donde empieza a calmarse. */
  calma: MAR_ADENTRO_DE_LOS_BARCOS * 2.6,
  /** Y donde ya no hay nada, bastante antes de que los anillos se hagan grandes. */
  hasta: MAR_ADENTRO_DE_LOS_BARCOS * 4.2,
} as const;

/**
 * LO QUE LE PASA AL DISCO A TAL DISTANCIA DE LA COSTA, sin encender una GPU.
 *
 * Son las dos envolventes del sombreador —la que decide si ahí puede haber espuma y la
 * que decide cuánto se levanta el agua— escritas otra vez en TypeScript, con LOS MISMOS
 * NÚMEROS: los dos textos salen de `CORONA_DE_LAS_OLAS`, `SOMBRA_DEL_TABLERO`,
 * `DISTANCIA_DE_LA_ROMPIENTE` y `ALTURA_DE_LA_OLA`, así que no hay dos verdades que
 * puedan discrepar: hay una tabla y dos lectores.
 *
 * Existen porque hay un fallo que sólo se ve así. El disco pasa POR DEBAJO del tablero y
 * a su misma cota, y la distancia a la costa es positiva sobre los ríos de dentro: mirando
 * el GLSL no hay forma de saber si un vértice tiene una tesela de agua encima. Con esto,
 * `verify:escena` recorre los vértices de verdad, mira cuáles caen sobre el tablero y
 * exige que ésos no reciban nada. Devuelven COTAS SUPERIORES —la cresta y el parche valen
 * como mucho uno, y los dos senos suman 1,62 amplitudes—, así que un cero aquí es un cero
 * en pantalla pase lo que pase con el reloj.
 */
export function espumaPosibleEn(costa: number): number {
  const { desde, llena, calma, hasta } = CORONA_DE_LAS_OLAS;
  return suavizar(desde, llena, costa) * (1 - suavizar(calma, hasta, costa)) * 0.7;
}

export function loQueSubeEn(costa: number): number {
  const sube = suavizar(SOMBRA_DEL_TABLERO, DISTANCIA_DE_LA_ROMPIENTE * 0.8, costa);
  const baja = 1 - 0.55 * suavizar(DISTANCIA_DE_LA_ROMPIENTE, DISTANCIA_DE_LA_ROMPIENTE * 6, costa);
  return ALTURA_DE_LA_OLA * sube * baja * 1 * 1.62;
}

/**
 * EL VÉRTICE.
 *
 * Levanta la ola de verdad —§2.3, lo que pidió Miguel con todas las letras— y deja en
 * la interpolación las tres cosas que el fragmento necesita: la distancia a la costa,
 * la normal del agua y el punto en el mundo.
 *
 * LA ENVOLVENTE ES LO QUE HACE QUE ESTO NO SEA UN PLANO ONDULADO. La amplitud vale
 * CERO pegada a tierra —si no, la ola asomaría por encima de la playa y por debajo de
 * las teselas de agua del tablero, que son geometría fija—, sube hasta el máximo en la
 * franja de rompiente y se queda a poco menos de la mitad en mar abierto. Y encima va
 * un ruido lento, de doscientas y pico unidades de célula y medio minuto de periodo,
 * que es lo que hace que unas olas sean más altas que otras.
 *
 * LA NORMAL SE DERIVA A MANO de los mismos dos senos, que es la única forma sin
 * `dFdx`. Se ignora a propósito cómo varía la ENVOLVENTE en el plano: cambia a lo
 * largo de cientos de unidades y las olas cada cincuenta, así que su pendiente es dos
 * órdenes de magnitud menor que la que se está calculando.
 */
/**
 * EL CAMPO DE LAS OLAS: dónde hay ola AHORA MISMO, entre cero y uno.
 *
 * ═══ POR QUÉ ESTO NO PUEDE SALIR DE LA DISTANCIA A LA COSTA ═══
 *
 * La primera versión dibujaba las líneas de espuma con un seno sobre esa distancia, que
 * es lo que hace todo el mundo. Se veía como las ondas de un estanque, y con razón: el
 * campo de distancias del delta es casi circular, así que sus curvas de nivel son
 * circunferencias y CUALQUIER cosa dibujada sobre él sale en anillos concéntricos, por
 * mucho que se le tuerza la fase. El fallo no era de afinado, era de qué variable se
 * estaba usando: por ahí no se sale.
 *
 * Lo que hace el mar de verdad —y es lo que se pidió mirándolo— son olas SUELTAS: cada
 * una en su sitio, con su tamaño y su fuerza, recorriendo un trecho que también varía
 * antes de apagarse, sin que todas tengan que llegar a la playa. O sea que la ola no es
 * función de la costa: es función del PUNTO DEL MUNDO y del reloj.
 *
 * ═══ CÓMO SE HACE SIN RUIDO Y SIN TEXTURAS ═══
 *
 * Tres senos cruzados de longitudes que no son múltiplos entre sí —cien, ciento doce y
 * ciento noventa y cuatro unidades— dan un campo suave que sube y baja por todo el mar
 * sin que se le vea la repetición. Cortándolo ALTO sólo asoman las cimas: manchas de
 * cuarenta a cien unidades, separadas, con la forma y el tamaño que les toca según por
 * dónde se crucen los tres. Ahí está la variedad, y sale de la forma del campo, no de
 * una lista de olas que alguien tenga que mantener.
 *
 * Y cada seno lleva SU velocidad, distinta de las otras dos: los parches no se trasladan
 * en bloque, sino que se deshacen por un lado mientras crecen por el otro, que es lo que
 * hace que una ola recorra un trecho y se apague. Salen unas cinco unidades por segundo,
 * la mitad que las crestas, que es la relación que de verdad hay entre el grupo y la onda.
 *
 * LO USAN LOS DOS SOMBREADORES, y ésa es la razón de que viva aquí fuera en vez de
 * copiado dos veces: el vértice lo usa para decidir CUÁNTO LEVANTA la ola y el fragmento
 * para decidir DÓNDE HAY ESPUMA. Si fueran dos textos parecidos pero distintos, el blanco
 * acabaría pintado sobre agua llana, que es como se lee la suciedad en una pantalla.
 *
 * En `mediump` esto es barato y seguro: los argumentos de los senos se quedan en un par
 * de cientos aun en el borde del disco, que es donde un `fract` con el multiplicador
 * grande del ruido de manual se convierte en bandas.
 */
export interface TrenDeOlas {
  /** El vector de onda, en radianes por unidad de mundo. Su módulo da el largo del tren. */
  k: readonly [number, number];
  /** Cuánto pesa este tren en la suma. */
  peso: number;
  /** Radianes por segundo. Distinta en cada tren: es lo que deshace los parches. */
  velocidad: number;
}

/**
 * LOS TRENES QUE HACEN LOS PARCHES, y por qué son números y no texto dentro del GLSL.
 *
 * El sombreador de `CAMPO_DE_LAS_OLAS` se ESCRIBE desde esta tabla. Podrían estar puestos
 * a mano ahí dentro —es lo que hace el resto del fichero con sus senos— pero entonces no
 * habría forma de comprobar en Node lo único que de verdad importa aquí: que las olas
 * salgan SUELTAS Y DE TAMAÑOS DISTINTOS. Con la tabla fuera, `olaEn` calcula el mismo
 * campo en TypeScript y `verify:escena` recorre el mar, cuenta los parches, mide sus
 * diámetros y mira si aparecen y desaparecen. La aritmética fuera, el sombreador tonto.
 *
 * Los largos —55, 29 y 18 unidades— no son múltiplos entre sí a propósito: con largos
 * parecidos el campo se repetiría a la vista. Y son CORTOS a propósito también: con los
 * de la primera versión —tres veces más largos— salían trazos blancos de setenta
 * unidades, del tamaño de una comarca, y en pantalla eso no son olas sino arañazos. El
 * rango que se pidió viéndolo es de tres a veinticinco unidades, y `verify:escena` lo
 * mide sobre `olaEn` para que no vuelva a irse.
 *
 * Cada tren lleva SU velocidad, con signos cruzados, que es lo que hace que una mota se
 * deshaga por un lado mientras crece por el otro en vez de trasladarse entera. Salen
 * unas dos unidades y media por segundo: bastante menos que las crestas, que es la
 * relación que de verdad hay entre el grupo y la onda.
 */
export const TRENES_DE_LAS_OLAS: readonly TrenDeOlas[] = [
  { k: [0.0944, 0.0634], peso: 1, velocidad: 0.28 },
  { k: [-0.1434, 0.1667], peso: 0.75, velocidad: -0.55 },
  { k: [0.2598, -0.2218], peso: 0.5, velocidad: 0.85 },
];

/**
 * LAS ZONAS: por qué unas olas son anchas y largas y otras una cima suelta.
 *
 * ═══ EL FALLO QUE ESTO CIERRA ═══
 *
 * Un campo de senos cortado por un umbral FIJO da manchas todas del mismo tamaño —se
 * midió: veinticinco parches y veintitrés de ellos de cincuenta y dos unidades—, y en
 * pantalla eso son rayas iguales repartidas con regla. El tamaño de la mancha lo fija la
 * escala del campo, así que por muchos trenes que se sumen, si el corte no se mueve, el
 * tamaño tampoco.
 *
 * Así que lo que varía no es el campo: es EL CORTE. Un cuarto tren, mucho más largo que
 * los otros —cuatrocientas unidades, el doble que el mayor— y muy lento, sube y baja el
 * umbral por comarcas de mar: donde está alto, el corte baja a 0,12 y pasa casi todo, y
 * sale una ola ancha que recorre un buen trecho; donde está bajo, el corte sube a 0,72 y
 * sólo asoman las cimas más altas, que son manchas pequeñas y sueltas. Entre medias, de
 * todo. Y como ese tren también se mueve, las comarcas picadas migran: el sitio donde
 * hoy revienta el mar mañana está liso.
 */
export const ZONAS_DE_LAS_OLAS = {
  k: [0.0194, 0.0149] as const,
  velocidad: 0.05,
  /** El corte medio y cuánto lo mueven las zonas. Ver arriba: de esto sale la variedad. */
  centro: 0.42,
  vaiven: 0.3,
  /** Lo que tarda el campo en pasar de nada a ola entera, en unidades del campo. */
  pluma: 0.5,
} as const;

const PESO_DE_LOS_TRENES = TRENES_DE_LAS_OLAS.reduce((s, tren) => s + tren.peso, 0);

/** El `smoothstep` de GLSL, que aquí hace falta para calcular el campo igual que la GPU. */
function suavizar(desde: number, hasta: number, x: number): number {
  const p = Math.min(1, Math.max(0, (x - desde) / (hasta - desde)));
  return p * p * (3 - 2 * p);
}

/**
 * EL MISMO CAMPO QUE PINTA LA GPU, en TypeScript: cuánta ola hay en (x, z) al segundo t.
 *
 * No es una aproximación ni una maqueta: es la misma cuenta con los mismos números, y el
 * GLSL de abajo sale de aquí. Lo que `verify:escena` mide sobre esta función es,
 * literalmente, lo que se va a ver.
 */
/**
 * CUÁNTO ESTÁ PICADO EL MAR EN (x, z) AL SEGUNDO t, entre cero y uno.
 *
 * Es el tren largo solo, sin el detalle. Lo usan dos: `olaEn` para mover su corte, y EL
 * VÉRTICE para decidir cuánto levanta la ola ahí.
 *
 * ═══ Y ÉSA ES LA RAZÓN DE QUE ESTÉ SEPARADA ═══
 *
 * El vértice no puede usar el campo entero. Sus trenes cortos miden dieciocho unidades y
 * los anillos del disco van a seis y pico en el aro de la costa: tres vértices por
 * longitud de onda, justo en el límite de Nyquist, y por fuera del aro los anillos crecen
 * un dieciocho por ciento por vuelta y ya no llegan. Colgar la ALTURA de ahí da un mar
 * que tiembla —la misma cresta sube o no según entre un vértice— mientras que la ESPUMA,
 * que se calcula por píxel en el fragmento, resuelve ese detalle sin problema.
 *
 * Así que cada uno usa la escala que su malla aguanta, de la misma tabla: doscientas
 * cincuenta y siete unidades para lo que mueve triángulos, dieciocho para lo que sólo
 * pinta. Una verdad, dos resoluciones.
 */
export function zonaEn(x: number, z: number, t: number): number {
  const { k, velocidad } = ZONAS_DE_LAS_OLAS;
  return 0.5 + 0.5 * Math.sin(k[0] * x + k[1] * z + t * velocidad);
}

export function olaEn(x: number, z: number, t: number): number {
  const { centro, vaiven, pluma } = ZONAS_DE_LAS_OLAS;
  const corte = centro - vaiven * (2 * zonaEn(x, z, t) - 1);
  let suma = 0;
  for (const tren of TRENES_DE_LAS_OLAS) {
    suma += tren.peso * Math.sin(tren.k[0] * x + tren.k[1] * z + t * tren.velocidad);
  }
  return suavizar(corte, corte + pluma, suma / PESO_DE_LOS_TRENES);
}

const CAMPO_DE_LAS_OLAS = /* glsl */ `
/* Cuánto está picado el mar aquí: el tren largo solo. Lo usa el VÉRTICE para la altura
   —es la única escala que sus anillos resuelven— y «olas» para mover su corte. */
float zonas(vec2 xz, float t) {
  return 0.5 + 0.5 * sin(dot(xz, vec2(${ZONAS_DE_LAS_OLAS.k[0].toFixed(4)}, ${ZONAS_DE_LAS_OLAS.k[1].toFixed(
    4,
  )})) + t * ${ZONAS_DE_LAS_OLAS.velocidad.toFixed(3)});
}

float olas(vec2 xz, float t) {
  /* Donde el mar está picado el corte baja y pasa una ola ancha; donde está liso, sólo
     asoman las cimas y salen motas sueltas. Ver «ZONAS_DE_LAS_OLAS». */
  float corte = ${ZONAS_DE_LAS_OLAS.centro.toFixed(2)} - ${ZONAS_DE_LAS_OLAS.vaiven.toFixed(
    2,
  )} * (2.0 * zonas(xz, t) - 1.0);
  float suma = ${TRENES_DE_LAS_OLAS.map(
    ({ k, peso, velocidad }) =>
      `${peso.toFixed(2)} * sin(dot(xz, vec2(${k[0].toFixed(4)}, ${k[1].toFixed(4)}))` +
      ` ${velocidad < 0 ? '-' : '+'} t * ${Math.abs(velocidad).toFixed(3)})`,
  ).join('\n            + ')};
  return smoothstep(corte, corte + ${ZONAS_DE_LAS_OLAS.pluma.toFixed(2)}, suma * ${(
    1 / PESO_DE_LOS_TRENES
  ).toFixed(4)});
}
`;

const VERTICE = /* glsl */ `
precision mediump float;
#include <fog_pars_vertex>
attribute float costa;
uniform float tiempo;
uniform float altura;
uniform float rompiente;
varying float vCosta;
varying vec3 vNormalMundo;
varying vec3 vPosicionMundo;
${CAMPO_DE_LAS_OLAS}
void main() {
  vec4 mundo = modelMatrix * vec4(position, 1.0);

  /* Cero mientras haya tablero encima —ver «SOMBRA_DEL_TABLERO», que es la que impide
     que el disco asome por encima de los ríos del pack—, todo a partir de la rompiente, y
     menos en el horizonte: allí los anillos son enormes y una ola de cincuenta de largo ya
     no cabe entre dos vértices. */
  float sube = smoothstep(${SOMBRA_DEL_TABLERO.toFixed(1)}, rompiente * 0.8, costa);
  float baja = 1.0 - 0.55 * smoothstep(rompiente, rompiente * 6.0, costa);
  /* El rizo de fondo lo lleva todo el mar; sube donde el mar está picado. De uno a otro
     hay más del doble, y eso es la altura variable. Aquí van las ZONAS y no las motas: la
     malla no resuelve dieciocho unidades. Ver la cabecera de «zonaEn». */
  float amp = altura * sube * baja * (0.30 + 0.70 * zonas(mundo.xz, tiempo));

  /* Dos trenes con direcciones y largos distintos —50 y 78— para que no se lea el patrón. */
  vec2 k1 = vec2(0.1150, 0.0510);
  vec2 k2 = vec2(-0.0430, 0.0682);
  float f1 = dot(mundo.xz, k1) + tiempo * 1.05;
  float f2 = dot(mundo.xz, k2) + tiempo * 0.74;
  mundo.y += amp * (sin(f1) + 0.62 * sin(f2));

  float dx = amp * (cos(f1) * k1.x + 0.62 * cos(f2) * k2.x);
  float dz = amp * (cos(f1) * k1.y + 0.62 * cos(f2) * k2.y);
  vNormalMundo = normalize(vec3(-dx, 1.0, -dz));

  vCosta = costa;
  vPosicionMundo = mundo.xyz;
  vec4 mvPosition = viewMatrix * mundo;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

/**
 * EL FRAGMENTO.
 *
 * Tres bloques, en este orden: dónde hay espuma, de qué color es el agua ahí, y cuánta
 * luz le llega. Los dos últimos son la cuenta de `three` rehecha a mano —ver la
 * cabecera del fichero—; el primero es lo que se ha venido a pintar.
 *
 * EL BRILLO NO ES UN ADORNO AÑADIDO: es la GGX del motor con la rugosidad y el f0 del
 * material del pack, o sea lo MISMO que los lagos del tablero ya reciben. Quitarla
 * dejaría el mar más saturado que ellos —a estos ángulos vale tanto como el difuso en
 * el canal rojo— y volvería la costura por otra puerta. Que además haga destellar las
 * crestas sale gratis: es la misma cuenta con la normal de la ola.
 *
 * Y EL REMATE SON LOS DOS `include` DE SIEMPRE, en el orden de los sombreadores del
 * motor: tono, espacio de color y, después, la niebla. Sin ellos el color se escribe
 * lineal sobre un lienzo sRGB y el mar sale más oscuro que todo lo demás, con la
 * costura a la vista justo donde se acaba de quitar.
 */
const FRAGMENTO = /* glsl */ `
precision mediump float;
#include <fog_pars_fragment>
uniform vec3 calma;
uniform vec3 espuma;
uniform vec3 ambiente;
uniform vec3 sol;
uniform vec3 rumboDelSol;
uniform float tiempo;
uniform float orilla;
uniform float rompiente;
varying float vCosta;
varying vec3 vNormalMundo;
varying vec3 vPosicionMundo;

const float UNO_ENTRE_PI = 0.31830988;
/* Los dos números del material del pack: rugosidad 0,5 y el f0 de un dieléctrico. */
const float RUGOSIDAD = 0.5;
const float F0 = 0.04;

/* La GGX de «three» («lights_physical_pars_fragment»), con f90 = 1 y sin anisotropía. */
float brilloDelSol(vec3 luz, vec3 ojo, vec3 n) {
  float alfa = RUGOSIDAD * RUGOSIDAD;
  float a2 = alfa * alfa;
  vec3 media = normalize(luz + ojo);
  float dotNL = clamp(dot(n, luz), 0.0, 1.0);
  float dotNV = clamp(dot(n, ojo), 0.0, 1.0);
  float dotNH = clamp(dot(n, media), 0.0, 1.0);
  float dotVH = clamp(dot(ojo, media), 0.0, 1.0);
  float gv = dotNL * sqrt(a2 + (1.0 - a2) * dotNV * dotNV);
  float gl = dotNV * sqrt(a2 + (1.0 - a2) * dotNL * dotNL);
  float V = 0.5 / max(gv + gl, 1e-6);
  float denom = dotNH * dotNH * (a2 - 1.0) + 1.0;
  float D = UNO_ENTRE_PI * a2 / (denom * denom);
  float fresnel = exp2((-5.55473 * dotVH - 6.98316) * dotVH);
  float F = F0 * (1.0 - fresnel) + fresnel;
  return F * V * D;
}
${CAMPO_DE_LAS_OLAS}
void main() {
  /*
   * (1) Y (4) LA ORILLA QUE SE MOJA Y SU VAIVÉN: APAGADAS, A PROPÓSITO Y ENTERAS.
   *
   * Miguel las vio en pantalla y no valen: la banda no sigue el contorno como debería y
   * salen manchas y arañazos blancos pegados a la tierra. NO se han borrado porque el
   * problema no es la idea —una orilla que se moja es justo lo que le falta al delta—
   * sino la ejecución, y el sitio donde mirar el día que se retomen es éste:
   *
   *   · SOSPECHA PRIMERA, la distancia. «vCosta» viaja INTERPOLADA entre vértices, y en
   *     el aro de la costa los anillos van a un radio de tesela y los sectores a seis:
   *     una banda de seis unidades de ancho se dibuja con un vértice de margen, así que
   *     donde el contorno hace un diente la banda se corta o se ensancha de golpe. Las
   *     olas de aquí abajo no lo sufren porque miden decenas de unidades; la orilla sí.
   *   · SOSPECHA SEGUNDA, el signo dentro de las bocas de río. El contorno sube por los
   *     estuarios (lo dice «costa.ts»), así que ahí la banda se pinta a los dos lados de
   *     un cauce de una tesela de ancho y se ve como una mancha, no como una orilla.
   *   · Y el vaivén hacía respirar el ANCHO, que multiplica los dos efectos de arriba en
   *     vez de disimularlos.
   *
   * Se queda el código tal cual estaba, comentado, y se quedan «LAMIDO_DE_LA_ORILLA» y
   * «PLUMA_DE_LA_ORILLA» con su contrato en pie: el corte en seco de más abajo sigue
   * protegiendo dónde se construye, y las olas siguen respetándolo.
   */
  // float vaiven = 0.5 + 0.5 * sin(tiempo * 0.37 + sin(tiempo * 0.15) * 0.8);
  // float lame = -orilla * ${LAMIDO_DE_LA_ORILLA.toFixed(2)} * vaiven;
  // float ancho = orilla * 1.6 * (0.72 + 0.28 * vaiven);
  // float dentro = smoothstep(lame - orilla * ${PLUMA_DE_LA_ORILLA.toFixed(2)}, lame, vCosta);
  // float fuera = 1.0 - smoothstep(lame + ancho * 0.3, lame + ancho, vCosta);
  // float mojada = dentro * fuera;

  /*
   * (2) LAS OLAS. Van HACIA LA ORILLA, o sea que sus crestas son paralelas a la costa: eso
   * las hace concéntricas a la isla, que es como rompe el mar de verdad y como se pidió
   * verlas. Y por eso la fase vuelve a colgar de «vCosta», que es la única variable que
   * sabe dónde está la tierra.
   *
   * ═══ Y AUN ASÍ NO PUEDEN SER ANILLOS, QUE ES LO QUE SE VIO PRIMERO ═══
   *
   * Un seno limpio sobre la distancia a la costa dibuja las curvas de nivel de un campo
   * casi circular: anillos completos, iguales y equidistantes, como un estanque. Que
   * vayan hacia la orilla es lo que se quiere; que sean anillos, no. Tres cosas lo
   * arreglan sin renunciar a lo primero, y hacen falta las tres:
   *
   *   · EL PASO NO ES CONSTANTE. Un tren lento sobre el punto del mundo lo mueve entre
   *     treinta y seis y setenta y cinco unidades, así que la separación entre dos líneas
   *     cambia según por dónde se mire la costa. Anillos equidistantes, se acabaron.
   *   · LA LÍNEA VA TORCIDA. Dos senos del punto del mundo —uno largo y otro corto—
   *     adelantan y retrasan la fase hasta veintisiete unidades, así que una misma cresta
   *     no está a la misma distancia de la costa en todos los sectores. Sigue siendo
   *     paralela a la costa en grande y ondula en pequeño, que es lo que hace el mar.
   *   · Y NO SE CIERRAN: «olas()» las recorta en tramos. Ahí está la variedad de tamaño
   *     —un tramo largo por una zona picada, una cima suelta por otra— y también la de
   *     fuerza, porque el mismo parche abre el umbral de la cresta: donde la ola es
   *     fuerte la línea sale ancha y blanca, y donde es floja, fina y apagada.
   */
  float parche = olas(vPosicionMundo.xz, tiempo);
  float paso = 0.1208 * (1.0 + 0.45 * sin(dot(vPosicionMundo.xz, vec2(0.0083, -0.0061)) + tiempo * 0.03));
  float fase = (vCosta + tiempo * 9.5) * paso
             + sin(dot(vPosicionMundo.xz, vec2(0.0141, -0.0113))) * 2.4
             + sin(dot(vPosicionMundo.xz, vec2(-0.0301, 0.0247))) * 0.9;
  /* El umbral lo abre el propio parche: de un pelo blanco a una línea de veinte unidades. */
  float cresta = smoothstep(0.80 - 0.42 * parche, 0.995, sin(fase));
  /* LA CORONA: ni entre los barcos y la playa, ni en el horizonte. Ver «CORONA_DE_LAS_OLAS». */
  float corona = smoothstep(${CORONA_DE_LAS_OLAS.desde.toFixed(1)}, ${CORONA_DE_LAS_OLAS.llena.toFixed(
    1,
  )}, vCosta)
               * (1.0 - smoothstep(${CORONA_DE_LAS_OLAS.calma.toFixed(1)}, ${CORONA_DE_LAS_OLAS.hasta.toFixed(
    1,
  )}, vCosta));

  float blanco = cresta * parche * corona * 0.7;
  /* EL CONTRATO: ni un ápice de espuma más allá de «orilla» tierra adentro. */
  blanco *= step(-orilla, vCosta);

  vec3 albedo = mix(calma, espuma, blanco);

  vec3 n = normalize(vNormalMundo);
  vec3 ojo = normalize(cameraPosition - vPosicionMundo);
  float dotNL = max(dot(n, rumboDelSol), 0.0);
  vec3 irradiancia = ambiente + sol * dotNL;
  vec3 color = albedo * irradiancia * UNO_ENTRE_PI
             + sol * dotNL * brilloDelSol(rumboDelSol, ojo, n);

  gl_FragColor = vec4(color, 1.0);
  /* En el mismo orden que los sombreadores de three: tono, espacio de color y la niebla. */
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

/** Los uniforms del mar, escritos para que se puedan comprobar sin abrir un navegador. */
export interface UniformsDeLaMarea extends Record<string, THREE.IUniform> {
  /** Los segundos del reloj de la escena. Lo mueve el `useFrame` de `delta.tsx`. */
  tiempo: { value: number };
  /** El agua del pack, que es de donde arranca todo. */
  calma: { value: THREE.Color };
  espuma: { value: THREE.Color };
  /** La luz que no viene del sol, ya sumada. Ver `irradianciaDeFondo`. */
  ambiente: { value: THREE.Color };
  sol: { value: THREE.Color };
  rumboDelSol: { value: THREE.Vector3 };
  /** La cresta más alta, en unidades de mundo. */
  altura: { value: number };
  /** A qué distancia de la costa vive la rompiente, en unidades de mundo. */
  rompiente: { value: number };
  /** Lo más que la espuma puede lamer tierra adentro. Es el contrato del §1.5. */
  orilla: { value: number };
}

/**
 * EL MATERIAL DEL MAR.
 *
 * Se construye una vez por mundo y se suelta con `dispose()` al desmontar, como el del
 * muelle. Lleva `fog: true` y los uniforms de niebla fusionados: sin eso el disco se
 * recorta contra el cielo en una línea recta a dos mil unidades del centro.
 */
export function materialDeLaMarea(): THREE.ShaderMaterial & { uniforms: UniformsDeLaMarea } {
  const uniforms: UniformsDeLaMarea = {
    tiempo: { value: 0 },
    calma: { value: new THREE.Color(COLOR_DEL_AGUA_DEL_PACK) },
    espuma: { value: new THREE.Color(COLOR_DE_LA_ESPUMA) },
    ambiente: { value: irradianciaDeFondo() },
    sol: { value: irradianciaDelSol() },
    rumboDelSol: { value: rumboDelSol() },
    altura: { value: ALTURA_DE_LA_OLA },
    rompiente: { value: DISTANCIA_DE_LA_ROMPIENTE },
    orilla: { value: ESPUMA_TIERRA_ADENTRO },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTICE,
    fragmentShader: FRAGMENTO,
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...uniforms },
    fog: true,
    side: THREE.FrontSide,
  });
  return material as THREE.ShaderMaterial & { uniforms: UniformsDeLaMarea };
}

/**
 * El texto de los dos sombreadores, para que la batería pueda leerlos sin construir el
 * material. `verify:escena` mira aquí que no haya derivadas ni extensiones y que el
 * fragmento remate con los dos `include` obligatorios.
 */
export const GLSL_DE_LA_MAREA = { vertice: VERTICE, fragmento: FRAGMENTO } as const;
