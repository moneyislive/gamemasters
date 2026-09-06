/**
 * LA MESA DE MADERA: la veta del tablón y los dos colores del pack, sin `three`.
 *
 * ═══ POR QUÉ LA VETA ESTÁ AQUÍ Y NO EN UN SOMBREADOR ═══
 *
 * La tapa de la mesa lleva el color EN EL VÉRTICE —`COLOR_0`, material blanco con
 * `vertexColors`, como el embarcadero— y no un `ShaderMaterial` ni un PNG. El PNG no se
 * puede cargar en el móvil (`app/src/tres/texturas-nativas.ts`); y un sombreador propio
 * no lo ilumina nadie: habría que rehacer la cuenta de las tres luces a mano y la tapa se
 * vería con otra luz que las piezas de al lado, que es una costura. Lo que decide es esto
 * otro: una veta escrita en TypeScript se MIDE en Node —valores, contraste, cuántas vetas
 * por tablón— y una escrita en GLSL sólo se mira. Este fichero es la que se mide.
 *
 * ═══ LOS DOS COLORES NO SE ELIGEN: SE LEEN DEL ATLAS DEL PACK ═══
 *
 * No hay ni mesa ni tablón suelto en los packs; lo que hay de madera —`crate_A_small`,
 * `barrel`, `fence_wood_straight`, `building_docks_*`— apunta con sus UV a dos celdas del
 * atlas `hexagons_medieval`: la (6,0), oscura, y la (5,0), clara. Medido sobre las UV de
 * esas piezas contra el PNG, el color medio de la oscura es `#94533f` y el de la clara
 * `#b97756`. Aquí no se escriben esos números: se LEEN de la tabla compilada del atlas
 * (`atlas-del-tablero.ts`, la misma que monta la textura en el teléfono) en la fila del
 * degradado vertical donde caen esas UV. Si el pack cambia su atlas y se recompila la
 * tabla, la mesa cambia de madera sola, y `verify:escena` afirma que la fila leída sigue
 * dando la madera medida. El contraste de luminancia entre los dos es 1,64:1: una madera
 * que se lee como madera sin competir con las piezas que tiene encima.
 *
 * ═══ EL DOMINIO DE LA VETA, ESCRITO ═══
 *
 *   x = i / segmentos ∈ [0, 1]   a lo largo del tablón (el ancho de la pantalla)
 *   y = j / filas     ∈ [0, 1]   a lo ancho del tablón (la profundidad, hacia la cámara)
 *   tablon = floor(j · TABLONES / filas) ∈ {0, 1, 2}
 *   veta(x, y, tablon) = fbm(x · 3 + tablon · 17,3,  y · 22 + tablon · 5,1,  canal, 3 octavas)
 *
 * Anisótropa —lenta a lo largo, rápida a lo ancho, como el grano— y con un desfase por
 * tablón para que los tres no repitan la misma veta. Los vértices de la fila compartida
 * entre dos tablones toman el tablón de índice mayor (el `floor`): la junta se ve como un
 * cambio de veta y no como una ranura, que pediría vértices duplicados. `fbm` devuelve
 * entre 0 y 1, así que la veta también, y `mezcla` la lleva a un color entre los dos.
 */
import { ALTO_DEL_ATLAS, COLUMNAS_DE_LA_TABLA } from './atlas-del-tablero';
import {
  ASA_DEL_HUECO,
  DISTANCIA_DE_LA_BARRA,
  cotaDeLaTapa,
  fondoDelAsaGirada,
  loQueSeVe,
} from './barra';
import type { HuecoDeLaBarra } from './barra';
import { ARISTA_DEL_DADO, CENTRO_DEL_DADO_SOBRE_LA_TAPA, SALTO_DEL_DADO } from './dados';
import { CELDA_DEL_JUGADOR, COLUMNA_DEL_COLOR, FILAS_DEL_ATLAS } from './paleta';
import { fbm } from './ruido';
import { tablaDelAtlas } from './texeles-del-atlas';

// ---------------------------------------------------------------------------
// Dónde está la tapa: la cota, los dos bordes y el ancho
// ---------------------------------------------------------------------------

/**
 * CUÁNTA MADERA ASOMA POR DETRÁS DEL ZÓCALO, en lados: el borde trasero de la tapa cae a
 * `DISTANCIA_DE_LA_BARRA + 0,6·lado` de la cámara, un décimo de lado por detrás del radio
 * del zócalo (0,5). Menos, y el posavasos quedaría al filo; más, y la mesa tapa tablero
 * que no hace falta tapar. En apaisado, `z = −2,139`.
 */
export const TRAS_EL_ZOCALO = 0.6;
/**
 * EL ANCHO DE LA TAPA, en anchos visibles a la distancia de la barra. El borde trasero
 * está más lejos que la barra y la cámara ve más ancho ahí: el factor exacto es
 * `(2 + 0,6·lado) / 2`, entre 1,034 y 1,070 según el lienzo; se redondea a 1,08 para que
 * las esquinas traseras no asomen en ninguno.
 */
export const ANCHO_DE_MAS_DE_LA_TAPA = 1.08;
/**
 * CUÁNTO SE ALARGA EL BORDE DELANTERO HACIA LA CÁMARA, en unidades, más allá del punto
 * exacto donde la tapa cruza el canto de abajo del lienzo. La decisión abierta del diseño
 * (§10) dice: si se ve corta por delante se alarga hacia la cámara, nunca hacia atrás. Un
 * décimo de unidad deja el frente a 1,5 de la cámara —el plano cercano de las tres
 * cámaras está en 0,5— y garantiza que ni un redondeo del campo deja una línea de mundo
 * bajo la madera en la última fila de píxeles.
 */
export const HOLGURA_DELANTERA_DE_LA_TAPA = 0.1;

/** La tapa de la mesa en coordenadas de la cámara: el plano horizontal que se pinta. */
export interface TapaDeLaMesa {
  /** La altura: la cara de abajo del zócalo (`cotaDeLaTapa`). Negativa, bajo el centro. */
  cota: number;
  /** El borde lejano, negativo: detrás del zócalo. */
  zTrasero: number;
  /** El borde cercano, negativo y mayor que `zTrasero`: por fuera del canto de abajo. */
  zDelantero: number;
  /** `(zTrasero + zDelantero) / 2`: donde se coloca el centro del plano. */
  centroZ: number;
  /** `zDelantero − zTrasero`: el fondo del plano. */
  fondo: number;
  ancho: number;
}

/**
 * LA TAPA HORIZONTAL A LA COTA DEL ZÓCALO, medida y no elegida.
 *
 * El borde delantero es donde el plano `y = cota` cruza el canto de abajo del lienzo,
 * `z = cota / tan(campo/2)` (`−1,649` en todos los apaisados), más la holgura hacia la
 * cámara. Es lo que hace que la mesa no flote: su frente queda FUERA del lienzo, como una
 * mesa mirada desde la silla, y por eso no lleva canto. El fondo resultante es de 2,55
 * lados —aquí ponía «unos 2,3», que era la cuenta de ANTES de que la tapa ganara la
 * holgura delantera (`HOLGURA_DELANTERA_DE_LA_TAPA`), y `rev4-tapa-holgura.ts` lo midió:
 * 2,545 en los nueve lienzos donde manda el alto, y más en los de pie, donde el lado
 * encoge con el ancho (hasta 7,46 en 390×845). Una cifra vieja en una cabecera se lee
 * como medida y se cita como medida—. Todo sale del hueco y de la cámara; nada de aquí se
 * escribe a mano en la escena.
 */
export function tapaDeLaMesa(hueco: HuecoDeLaBarra, campo: number, proporcion: number): TapaDeLaMesa {
  const cota = cotaDeLaTapa(hueco);
  const zTrasero = -(DISTANCIA_DE_LA_BARRA + TRAS_EL_ZOCALO * hueco.lado);
  const zDelantero = cota / Math.tan(campo / 2) + HOLGURA_DELANTERA_DE_LA_TAPA;
  return {
    cota,
    zTrasero,
    zDelantero,
    centroZ: (zTrasero + zDelantero) / 2,
    fondo: zDelantero - zTrasero,
    ancho: loQueSeVe(campo, proporcion).ancho * ANCHO_DE_MAS_DE_LA_TAPA,
  };
}

/**
 * CUÁNTO BAJA LA MESA AL RECOGERLA, en unidades de mundo a la distancia de la barra.
 *
 * ═══ EL FALLO QUE ESTO ARREGLA: EL ASA NO ES UN PUNTO, ES UNA CAJA ═══
 *
 * Aquí ponía `alto/2 + hueco.y + 0,5·lado` y esta cabecera lo llamaba «la bajada exacta».
 * No lo era: esa cuenta trata el asa como un PUNTO en el plano de la barra (`z = −2`), y
 * el asa es una caja de `0,8` lados de fondo (`ASA_DEL_HUECO`) girada 39,6° sobre su eje
 * vertical (`GIRO_DE_LA_VITRINA`), o sea `0,627` lados de media profundidad. Su cara
 * trasera está más LEJOS, y a más distancia la cámara ve más alto: el mismo punto de
 * mundo cae más arriba en la pantalla. Medido con la cámara de verdad en los quince
 * lienzos, el techo del asa se quedaba entre 10,8 y 36,6 puntos POR ENCIMA del canto —11,5
 * en 320×360, 13,2 en un iPhone 14, 36,6 en el monitor a 1080— con la mesa «recogida». Y
 * durante los 0,28 s de la bajada las asas están montadas y vivas, así que no basta con
 * desmontarlas al llegar: la promesa tiene que ser cierta además.
 *
 * ═══ LA CUENTA, ESCRITA ═══
 *
 * Un punto `(y, z)` de la mesa cae justo en el canto de abajo cuando `y = −(−z)·tan(campo/2)`.
 * Como `alto = 2·D·tan(campo/2)` a la distancia de la barra, meterlo bajo el canto pide
 * bajar `y + (alto/2)·(−z)/D`, que es lo que hace `hastaElCanto`. La bajada es el MÁXIMO
 * de esa cuenta sobre los tres puntos que pueden mandar:
 *
 *   · EL VÉRTICE MÁS ALTO Y MÁS LEJANO DEL ASA: `hueco.y + ½·alto·lado` a `D + 0,627·lado`.
 *     Manda en los quince.
 *   · UN DADO EN LO ALTO DE SU SALTO: el cubo gira, así que lo que asoma es su esfera de
 *     media diagonal (`ARISTA_DEL_DADO·√3/2`), arriba y hacia la cámara a la vez.
 *   · EL BORDE TRASERO DE LA TAPA: lo más lejos de la cámara que hay en la mesa
 *     (`D + 0,6·lado`), aunque viva bajo la cota.
 *
 * Lo que NO entra aquí, y por qué: el asa de los dados es una caja del mismo alto pero SIN
 * girar (`0,4` lados de fondo contra `0,627`), así que el asa de un hueco la tapa siempre;
 * el naipe del mazo llega a `0,33` lados con su filo (`0,31` la cara, y el filo la agranda un 6 %); la pieza con el ratón encima sube `0,12` y crece
 * a `1,18`, lo que la deja en `0,486` lados de alto y `0,515` de fondo, o sea dentro del
 * asa que la envuelve; y el tapete, las sombras y los zócalos viven bajo la cota. La pieza
 * TOMADA tampoco cuenta: recoger la mesa suelta lo cogido. `verify:escena` proyecta los
 * ocho vértices de cada caja y las cuatro esquinas de cada plano de TODAS ellas y exige
 * que ninguna asome, así que el día que una crezca por encima del asa el guion se pone
 * rojo y hay que meterla también aquí.
 *
 * Medido en los quince lienzos: 0,325 a 0,433 unidades, o sea 84 puntos en el SE apaisado,
 * 102 en un iPhone 14 y 282 en un monitor a 1080 —entre 11,6 y 39,3 puntos más que la
 * cuenta plana de antes—. Bajar de más no cuesta nada en pantalla: la mesa ya está fuera.
 * Quedarse corto sí, y era lo que pasaba.
 *
 * Vive aquí y no en la escena porque es lo que el comprobador mide en Node sin abrir una
 * ventana: con el número escrito a mano en `delta.tsx`, `verify:escena` estaría midiendo
 * su propia copia y no lo que baja.
 */
export function bajadaDeLaMesa(hueco: HuecoDeLaBarra, campo: number, proporcion: number): number {
  const { alto } = loQueSeVe(campo, proporcion);
  /* Cuánto hay que bajar para dejar un punto a `distancia` de la cámara justo en el canto. */
  const hastaElCanto = (y: number, distancia: number): number =>
    y + (alto / 2) * (distancia / DISTANCIA_DE_LA_BARRA);
  const lado = hueco.lado;

  const asa = hastaElCanto(
    hueco.y + (ASA_DEL_HUECO.alto / 2) * lado,
    DISTANCIA_DE_LA_BARRA + fondoDelAsaGirada() * lado,
  );
  const mediaDiagonal = ((ARISTA_DEL_DADO * Math.sqrt(3)) / 2) * lado;
  const dado = hastaElCanto(
    cotaDeLaTapa(hueco) + (CENTRO_DEL_DADO_SOBRE_LA_TAPA + SALTO_DEL_DADO) * lado + mediaDiagonal,
    DISTANCIA_DE_LA_BARRA + mediaDiagonal,
  );
  const tapa = tapaDeLaMesa(hueco, campo, proporcion);
  const madera = hastaElCanto(tapa.cota, -tapa.zTrasero);

  return Math.max(asa, dado, madera);
}

/**
 * LO DEPRISA QUE LA MESA BAJA Y SUBE, en la `k` de `1 − e^(−k·dt)`.
 *
 * La misma constante de tiempo que llevan las cartas de la mano, y con ella la cuenta sale
 * sola: recorrer el 99 % de la bajada —`LO_QUE_QUEDA_AL_LLEGAR`— tarda `ln(100)/16 =
 * 0,288 s`, que son los 0,28 s que el §6 pide para recoger la mesa. No hay dos ritmos que
 * ajustar por separado en esta escena y no hace falta un tercero.
 *
 * Vive aquí, con la bajada, y no suelta en `delta.tsx`, porque es lo que `verify:escena`
 * comprueba contra los 0,28 s del diseño: con el número escrito en la escena, el guion
 * estaría midiendo su propia copia.
 */
export const AMORTIGUACION_DE_LA_MESA = 16;

/**
 * A QUÉ FRACCIÓN DE LA BAJADA SE DA POR LLEGADA, y por qué no es cero.
 *
 * Una interpolación exponencial no llega nunca: se acerca. Con un cero, `visible` no se
 * apagaría jamás y los dados seguirían montados bajo el canto para siempre, que es
 * exactamente el estado que la fase 4 decidió NO tener. El uno por ciento de la bajada son
 * 0,7 puntos en el SE apaisado y 2,4 en un monitor a 1080: por debajo de lo que se ve, y el
 * asa está bajo el canto mucho antes.
 */
export const LO_QUE_QUEDA_AL_LLEGAR = 0.01;

/**
 * DÓNDE VA EL MANDO DE RECOGER LA MESA, en puntos de pantalla, y por qué YA NO VA ABAJO.
 *
 * ═══ EL FALLO QUE ESTO ARREGLA, Y QUE NO SE VEÍA ═══
 *
 * Estuvo abajo a la izquierda, cuadrado de 44 con 4 de margen, y el sitio se dio por
 * medido: el canto izquierdo del asa de la primera pieza caía en `x = 48,0` en 320×360 y
 * el mando acababa en 48. Pero esos 48 salían de tratar el asa como un RECTÁNGULO en el
 * plano de la barra, y el asa es una caja de `0,8` lados de fondo girada 39,6°: su cara
 * CERCANA está más cerca de la cámara, así que se proyecta más a la izquierda y más
 * abajo. Proyectada de verdad, la silueta del asa deja en el rincón de abajo a la
 * izquierda un cuadrado libre de 37,2 puntos en 320×360 y de 44,1 en 360×490 —contra los
 * 48,0 y 54,0 de la cuenta plana—, así que un mando opaco de 44 se comía unos 7 × 27
 * puntos de la esquina de abajo a la izquierda del asa de la choza. Y no sólo con la mesa
 * recogida: el mando está SIEMPRE, o sea que ese trozo de choza no se podía coger en toda
 * la partida, sin un error en ninguna parte.
 *
 * ═══ POR QUÉ ARRIBA, Y NO EN OTRO RINCÓN DE ABAJO ═══
 *
 * Porque abajo no cabe en ninguna esquina y está contado. La barra está CENTRADA y ocupa
 * el 70 % del ancho, así que deja lo mismo a los dos lados: en 320×360 la silueta del asa
 * llega a 41,2 puntos del canto izquierdo y a los mismos del derecho, y 41,2 < 44. Bajar
 * el margen a cero tampoco alcanza, y encoger el mando por debajo de 44 está prohibido
 * (`SUELO_DEL_TOQUE`). Entre las asas no hay hueco —`AIRE` son 0,24 lados, once puntos—, y
 * bajo ellas quedan 21 puntos hasta el canto. Arriba, en cambio, el asa más alta de los
 * quince lienzos se queda 242 puntos por debajo del canto de arriba (el SE apaisado, que
 * es el peor), así que un mando que acabe a 108 del canto de arriba no le roba un punto a
 * ninguna asa en ninguno.
 *
 * ═══ Y POR QUÉ DEBAJO DEL MANDO DE VOLVER, Y NO EN LA OTRA ESQUINA DE ARRIBA ═══
 *
 * Los dos clientes ya tienen un mando sobre el lienzo que no es un movimiento —«Tablero
 * entero» en la app, arriba a la izquierda; «volver» en el escritorio, arriba a la
 * derecha— y cada uno eligió su esquina por su cuenta. Poner éste en la esquina LIBRE
 * daría dos sitios distintos y dos razones distintas; ponerlo DEBAJO del que ya hay da una
 * sola regla —«el cromo de la Sala sobre el lienzo va en columna, en la esquina de arriba
 * que su cliente ya usa»— y garantiza que los dos no se solapan jamás sin que nadie tenga
 * que medir el ancho del rótulo. Va SIEMPRE a la misma altura, aparezca o no el de arriba
 * (los dos son condicionales): un mando que cambia de sitio según lo que haya en pantalla
 * se pulsa mal, y éste es el que apaga la mesa.
 *
 * `verify:escena` mide el cuadrado contra la silueta proyectada de todas las asas en los
 * quince lienzos y por los DOS lados —izquierda como la app, derecha como el escritorio—;
 * `verify:escritorio` y `verify:sala` afirman que la hoja de estilo y la tabla de estilos
 * dicen estos mismos números.
 */
export const MANDO_DE_RECOGER = {
  /** El lado del cuadrado: el suelo de toque de la casa, ni un punto menos. */
  lado: 44,
  /** Lo que separa el mando del canto de arriba y del canto de su lado. */
  margen: 12,
  /** Y lo que baja por debajo del otro mando: su alto (44) más un dedo de aire (8). */
  bajoElOtroMando: 52,
} as const;

/** El canal del ruido de la veta. Fijo: la mesa es la misma en todas las mesas. */
export const CANAL_DE_LA_VETA = 7_001;
/** Cuántos tablones tiene la tapa a lo ancho. */
export const TABLONES = 3;
/** Cuántas veces se recorre el ruido a lo largo y a lo ancho de un tablón. */
const ESCALA_A_LO_LARGO = 3;
const ESCALA_A_LO_ANCHO = 22;
/** Las octavas: tres bastan para una veta; con más sólo se añade grano que no se ve. */
const OCTAVAS_DE_LA_VETA = 3;

/** Cuánto se desplaza el ruido de un tablón al siguiente, en cada eje. */
export interface DesfasesDelTablon {
  readonly aLoLargo: number;
  readonly aLoAncho: number;
}
export const DESFASES_DE_LA_VETA: DesfasesDelTablon = { aLoLargo: 17.3, aLoAncho: 5.1 };

/** La veta en un punto del dominio escrito arriba, entre 0 y 1. */
export function veta(
  x: number,
  y: number,
  tablon: number,
  canal = CANAL_DE_LA_VETA,
  desfases = DESFASES_DE_LA_VETA,
): number {
  return fbm(
    x * ESCALA_A_LO_LARGO + tablon * desfases.aLoLargo,
    y * ESCALA_A_LO_ANCHO + tablon * desfases.aLoAncho,
    canal,
    OCTAVAS_DE_LA_VETA,
  );
}

/**
 * LA VETA DE LA TAPA ENTERA, un valor por vértice de una rejilla de
 * `(segmentos + 1) × (filas + 1)`, en el orden de `PlaneGeometry`: fila a fila, de
 * `j = 0` a `filas`, y dentro de cada fila de `i = 0` a `segmentos`. El índice del vértice
 * `(i, j)` es `j · (segmentos + 1) + i`. Todos los valores están en [0, 1].
 */
export function vetaDelTablon(
  segmentos: number,
  filas: number,
  canal = CANAL_DE_LA_VETA,
  desfases = DESFASES_DE_LA_VETA,
): Float32Array {
  const salida = new Float32Array((segmentos + 1) * (filas + 1));
  for (let j = 0; j <= filas; j++) {
    const tablon = Math.min(TABLONES - 1, Math.floor((j * TABLONES) / filas));
    for (let i = 0; i <= segmentos; i++) {
      salida[j * (segmentos + 1) + i] = veta(i / segmentos, j / filas, tablon, canal, desfases);
    }
  }
  return salida;
}

// ---------------------------------------------------------------------------
// Los colores
// ---------------------------------------------------------------------------

/** Un color en sRGB, cada canal de 0 a 255. */
export type ColorEnBytes = readonly [number, number, number];

/**
 * DE QUÉ CELDA Y DE QUÉ FILA DEL ATLAS SALE CADA MADERA.
 *
 * Las celdas del pack son planas en horizontal y llevan degradado en vertical (por eso
 * la tabla compilada guarda un color por fila y por columna). Las UV de las piezas de
 * madera no apuntan al centro de su celda sino a una altura concreta del degradado, y la
 * fila es esa altura: la 151 de la columna 6 da `#94533f` exacto y la 93 de la columna 5
 * da `#b97756` exacto, los dos colores medidos sobre las UV de las piezas.
 */
export const MADERA_OSCURA_EN_EL_ATLAS = { columna: 6, fila: 151 } as const;
export const MADERA_CLARA_EN_EL_ATLAS = { columna: 5, fila: 93 } as const;

/** El color de la tabla compilada del atlas en una columna y una fila. */
export function colorDelAtlas(columna: number, fila: number): ColorEnBytes {
  const tabla = tablaDelAtlas();
  const i = (fila * COLUMNAS_DE_LA_TABLA + columna) * 3;
  return [tabla[i] ?? 0, tabla[i + 1] ?? 0, tabla[i + 2] ?? 0];
}

/** Las dos maderas, leídas del atlas. */
export function coloresDeLaMadera(): { oscura: ColorEnBytes; clara: ColorEnBytes } {
  return {
    oscura: colorDelAtlas(MADERA_OSCURA_EN_EL_ATLAS.columna, MADERA_OSCURA_EN_EL_ATLAS.fila),
    clara: colorDelAtlas(MADERA_CLARA_EN_EL_ATLAS.columna, MADERA_CLARA_EN_EL_ATLAS.fila),
  };
}

/**
 * EL POSAVASOS: la MISMA celda oscura del atlas, oscurecida, y no otro material.
 *
 * ═══ EL FALLO QUE ESTO ARREGLA ═══
 *
 * Los zócalos hexagonales eran de paja clara —`#c8b48a` en reposo, `#f0e3c2` bajo el
 * puntero—, dos hexadecimales sueltos en `delta.tsx` de cuando debajo había una placa
 * oscura al 42 %. Sobre una tapa de `#94533f`–`#b97756` esa paja se lee como una
 * PEGATINA: más clara que la veta más clara y de otro palo. La decisión 14 del §1 de
 * `docs/LA-MESA-DE-RIBERAS.md` los quiere de madera MÁS OSCURA que la tapa: un trozo más
 * oscuro de la misma madera, no otro material.
 *
 * ═══ DE DÓNDE SALE CADA UNO, Y POR QUÉ EL 70 % Y EL 85 % ═══
 *
 * De la celda oscura del atlas (`MADERA_OSCURA_EN_EL_ATLAS`, la misma fila que la veta),
 * multiplicada canal a canal en sRGB. Al 70 % en REPOSO: es lo que da 1,6:1 de contraste
 * de luminancia relativa contra la veta MÁS OSCURA de la tapa —la propia celda, con la
 * veta a cero— y 2,6:1 contra la más clara, del orden del contraste de la veta consigo
 * misma (1,6:1): se lee como madera oscura sobre madera, no como un agujero ni como una
 * pegatina. Bajo el puntero, al 85 %: un paso más claro del mismo palo, que sigue por
 * debajo de la veta más oscura y dice «esto responde» sin cambiar de material. Los dos
 * salen de aquí y no de `delta.tsx` para que `verify:escena` mida el contraste con el
 * mismo número que se pinta, y para que si el pack cambia su atlas el posavasos cambie
 * con la tapa. «Tomada» sigue con el verde de la señal y «apagada» con su opacidad: eso
 * es información, no color de madera.
 */
export const POSAVASOS_SOBRE_LA_MADERA_OSCURA = { reposo: 0.7, encima: 0.85 } as const;

/** Un color en bytes multiplicado por un factor, canal a canal, sin salirse de 0..255. */
export function oscurecido(color: ColorEnBytes, factor: number): ColorEnBytes {
  const canal = (n: number): number => Math.max(0, Math.min(255, Math.round(n * factor)));
  return [canal(color[0]), canal(color[1]), canal(color[2])];
}

/** Los dos colores del posavasos, leídos del atlas y oscurecidos. */
export function coloresDelPosavasos(): { reposo: ColorEnBytes; encima: ColorEnBytes } {
  const { oscura } = coloresDeLaMadera();
  return {
    reposo: oscurecido(oscura, POSAVASOS_SOBRE_LA_MADERA_OSCURA.reposo),
    encima: oscurecido(oscura, POSAVASOS_SOBRE_LA_MADERA_OSCURA.encima),
  };
}

/**
 * EL COLOR DE UN COLONO, leído de la MISMA celda del atlas que tiñe sus chozas.
 *
 * El tapete del turno tiene que ser «el color de ese colono, el mismo de sus chozas», y
 * las chozas no llevan un hexadecimal: apuntan con sus UV a la celda del jugador del atlas
 * (`CELDA_DEL_JUGADOR`, corrida a la columna de su color por `desplazamientoDeColor`). Así
 * que el tapete se lee de ahí, en la fila del medio de esa celda —la celda lleva un
 * degradado vertical y el medio es el tono que más superficie de choza cubre—: azul
 * `#257ebc`, rojo `#d22227`, amarillo `#f9aa4e`, verde `#008454`. Un color desconocido
 * sale azul, como en `desplazamientoDeColor`: un dato de fuera no deja la mesa en negro.
 */
export function colorDelColono(color: string): ColorEnBytes {
  const columna = COLUMNA_DEL_COLOR[color] ?? COLUMNA_DEL_COLOR['blue'] ?? 0;
  const fila = Math.floor((CELDA_DEL_JUGADOR[1] + 0.5) * (ALTO_DEL_ATLAS / FILAS_DEL_ATLAS));
  return colorDelAtlas(columna, fila);
}

/** `#rrggbb` de un color en bytes, para dárselo a un material. */
export function hexDe(color: ColorEnBytes): string {
  return `#${color.map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * sRGB → LINEAL, por canal, de 0..255 a 0..1. El atributo `color` de `three` es lineal
 * por definición (`escenas/embarcadero/tinte.ts`); escribir ahí el sRGB tal cual daría
 * una madera lavada.
 */
export function aLineal(color: ColorEnBytes): [number, number, number] {
  const canal = (n: number): number => {
    const s = n / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return [canal(color[0]), canal(color[1]), canal(color[2])];
}

/** Un color entre `a` (con `t = 0`) y `b` (con `t = 1`), canal a canal. */
export function mezcla(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/**
 * LA LUMINANCIA RELATIVA de un color sRGB, la de la WCAG, para poder afirmar el contraste
 * entre las dos maderas con un número en vez de con una captura.
 */
export function luminancia(color: ColorEnBytes): number {
  const [r, g, b] = aLineal(color);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** El contraste `(clara + 0,05) / (oscura + 0,05)` entre dos colores, ≥ 1. */
export function contraste(a: ColorEnBytes, b: ColorEnBytes): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
