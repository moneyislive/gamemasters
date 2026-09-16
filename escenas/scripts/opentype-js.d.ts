/**
 * LOS TIPOS DE `opentype.js` QUE USA EL COMPILADOR, Y SÓLO ÉSOS.
 *
 * El paquete no trae declaraciones (`types` vacío en su `package.json`), y el `tsconfig` del
 * escritorio sí compila los guiones de `escenas/`: sin esto, `tipos · escritorio` se pone rojo
 * con un TS7016 y la batería entera con él.
 *
 * ═══ POR QUÉ AQUÍ Y NO `@types/opentype.js` ═══
 *
 * Ese paquete existe, pero va por la **1.3** y aquí se usa la **2.0**, que ya cambió la API —en
 * la 2 `loadSync` está obsoleto y devuelve `undefined`; hay que llamar a `parse`—. Unos tipos de
 * otra versión no avisan de nada y encima MIENTEN: dan por buena una llamada que revienta en
 * ejecución. Es peor que no tenerlos.
 *
 * Así que aquí va lo que el compilador toca de verdad, que es poco. Si algún día hace falta más,
 * se añade aquí mismo y se ve en el diff qué superficie nueva se ha empezado a usar.
 */
declare module 'opentype.js' {
  /** Un mando del trazo de un glifo. `y` crece HACIA ABAJO, como en SVG. */
  export interface MandoDelTrazo {
    type: 'M' | 'L' | 'Q' | 'C' | 'Z';
    x: number;
    y: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }

  export interface Trazo {
    commands: MandoDelTrazo[];
    getBoundingBox(): { x1: number; y1: number; x2: number; y2: number };
  }

  export interface Glifo {
    /** 0 es el glifo «no está»: el tipo no trae ese carácter. */
    index: number;
    advanceWidth?: number;
    getPath(x: number, y: number, talla: number): Trazo;
  }

  export interface Tipo {
    unitsPerEm: number;
    charToGlyph(caracter: string): Glifo;
  }

  export function parse(datos: ArrayBuffer): Tipo;

  const opentype: { parse: typeof parse };
  export default opentype;
}
