/**
 * DE LA TABLA COMPILADA A LOS TÉXELES DE UNA TEXTURA: lo que el móvil hace con el atlas.
 *
 * ═══ POR QUÉ EXISTE ═══
 *
 * `tablero.glb` lleva su atlas EMPOTRADO como PNG, y Hermes no lo decodifica: no hay
 * `<img>`, no hay `createObjectURL`, no hay nada que convierta esos bytes en píxeles.
 * Durante meses la app instalada resolvió eso pintando el tablero de siempre en dos
 * dimensiones, porque un delta con la textura sustituida por blanco es un delta en el
 * que no se distingue una salina de un cantil.
 *
 * La salida no fue hornear el color a vértice como en `embarcadero.glb`: el tablero
 * pinta biomas y colores de jugador MOVIENDO LAS UV de cada tesela a otra celda del
 * atlas (`paleta.ts`, `delta.tsx`), y un color fijado en el vértice habría dejado ese
 * desplazamiento sin efecto. Lo que se hizo fue compilar el atlas OFFLINE a una tabla
 * de bytes (`atlas-del-tablero.ts`, generado por `scripts/compilar-atlas-del-tablero.ts`)
 * y darle al móvil una `DataTexture` construida de esa tabla: las UV siguen apuntando a
 * lo mismo, así que el tintado por desplazamiento funciona igual en el teléfono que en
 * el navegador, sin tocar `delta.tsx`.
 *
 * ═══ POR QUÉ LA TABLA ES DE OCHO COLUMNAS Y LA TEXTURA DE MIL VEINTICUATRO ═══
 *
 * Medido sobre el PNG del pack, no supuesto: las treinta y dos celdas del atlas son
 * PLANAS en horizontal —dentro de cada columna de 128 píxeles, todos los píxeles de una
 * misma fila son el mismo color, sin una sola excepción en el millón de píxeles— y en
 * vertical llevan un degradado suave de 256 filas. O sea que toda la información del
 * atlas cabe en un color por fila y por columna: 8 × 1.024 × RGB = 24 kB, en vez de los
 * 4 MB del PNG decodificado. La textura se ENSANCHA aquí, al cargar, repitiendo el color
 * de cada columna a lo ancho de sus 128 téxeles: lo que sube a la GPU es, byte a byte,
 * el mismo mapa de 1.024 × 1.024 que decodifica el navegador —con la misma cadena de
 * mipmaps y el mismo filtrado—, y `verify:atlas-del-tablero` lo compara píxel a píxel
 * contra el PNG para que siga siéndolo.
 *
 * Se descartó una reducción cuadrada (16 × 16 téxeles por celda): con el filtro bilineal
 * los téxeles de una columna se mezclan con los de la vecina en media anchura de téxel, y
 * a esa resolución eso son cuatro píxeles de atlas — 273 vértices del modelo salían con
 * hasta quince pasos de sRGB de desvío. Con las 1.024 columnas de ancho el desvío medido
 * es cero en los 408.488 puntos UV del modelo.
 *
 * ═══ SIN `three`, A PROPÓSITO ═══
 *
 * Este fichero es aritmética sobre bytes: lo importa la app (para construir la textura)
 * y el comprobador (para compararla con el PNG en Node), y el segundo no debe arrastrar
 * el motor de dibujo entero para leer una tabla. Quien monte la `DataTexture` es el
 * complemento de `app/src/tres/texturas-nativas.ts`.
 *
 * Y sin `atob`: React Native lo trae desde hace poco y Node desde siempre, pero un
 * decodificador de veinte líneas no depende de que ninguno de los dos lo tenga, y lo que
 * se decodifica es un texto que se generó en esta misma casa.
 */
import {
  ALTO_DEL_ATLAS,
  ANCHO_DEL_ATLAS,
  COLUMNAS_DE_LA_TABLA,
  TABLA_EN_BASE64,
} from './atlas-del-tablero';

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const VALOR_DE = new Map<string, number>(Array.from(ALFABETO, (letra, i) => [letra, i]));

/**
 * Base64 estándar → bytes. Se niega ante un carácter que no sea del alfabeto en vez de
 * saltárselo: una tabla corrupta que se lee «casi bien» pinta un atlas corrido sin que
 * nadie se entere, y una que revienta al abrirse sale en el parte de fallos de la app.
 */
export function decodificaBase64(texto: string): Uint8Array {
  const limpio = texto.replace(/=+$/, '');
  const bytes = new Uint8Array(Math.floor((limpio.length * 3) / 4));
  let acumulado = 0;
  let bits = 0;
  let escrito = 0;
  for (let i = 0; i < limpio.length; i++) {
    const valor = VALOR_DE.get(limpio.charAt(i));
    if (valor === undefined) {
      throw new Error(`la tabla del atlas trae un carácter que no es base64 en la posición ${String(i)}`);
    }
    acumulado = (acumulado << 6) | valor;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[escrito++] = (acumulado >> bits) & 0xff;
    }
  }
  return bytes;
}

/**
 * La tabla compilada: `ALTO_DEL_ATLAS` filas de `COLUMNAS_DE_LA_TABLA` colores RGB, de
 * arriba abajo como el PNG. Sirve para comprobar sin ensanchar.
 */
export function tablaDelAtlas(): Uint8Array {
  const tabla = decodificaBase64(TABLA_EN_BASE64);
  const esperados = ALTO_DEL_ATLAS * COLUMNAS_DE_LA_TABLA * 3;
  if (tabla.length !== esperados) {
    throw new Error(
      `la tabla del atlas trae ${String(tabla.length)} bytes y tendría que traer ${String(esperados)}`,
    );
  }
  return tabla;
}

/**
 * LOS TÉXELES DE LA TEXTURA: `ANCHO_DEL_ATLAS` × `ALTO_DEL_ATLAS` en RGBA, la fila 0
 * ARRIBA. Es el orden en que glTF define sus UV (la v crece hacia abajo) y el que
 * `GLTFLoader` deja al poner `flipY = false`; quien construya la textura tiene que
 * dejarlo igual o el atlas sale del revés y la hierba se convierte en agua.
 *
 * Se ensancha con un `Uint32Array` sobre el mismo búfer —un `fill` por columna y fila—
 * y no téxel a téxel: son un millón de téxeles y esto corre en el hilo de JavaScript del
 * teléfono, entre el `fetch` del modelo y el primer fotograma.
 */
export function texelesDelAtlas(): Uint8Array {
  const tabla = tablaDelAtlas();
  const anchoDeColumna = ANCHO_DEL_ATLAS / COLUMNAS_DE_LA_TABLA;
  const texeles = new Uint8Array(ANCHO_DEL_ATLAS * ALTO_DEL_ATLAS * 4);
  const comoEnteros = new Uint32Array(texeles.buffer);
  /* Un téxel empaquetado con el mismo orden de bytes que la máquina, sea cual sea. */
  const unTexel = new Uint8Array(4);
  const unEntero = new Uint32Array(unTexel.buffer);
  unTexel[3] = 255;
  for (let fila = 0; fila < ALTO_DEL_ATLAS; fila++) {
    for (let columna = 0; columna < COLUMNAS_DE_LA_TABLA; columna++) {
      const i = (fila * COLUMNAS_DE_LA_TABLA + columna) * 3;
      unTexel[0] = tabla[i] ?? 0;
      unTexel[1] = tabla[i + 1] ?? 0;
      unTexel[2] = tabla[i + 2] ?? 0;
      const desde = fila * ANCHO_DEL_ATLAS + columna * anchoDeColumna;
      comoEnteros.fill(unEntero[0] ?? 0, desde, desde + anchoDeColumna);
    }
  }
  return texeles;
}
