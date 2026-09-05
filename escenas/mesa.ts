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
import { COLUMNAS_DE_LA_TABLA } from './atlas-del-tablero';
import { fbm } from './ruido';
import { tablaDelAtlas } from './texeles-del-atlas';

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
