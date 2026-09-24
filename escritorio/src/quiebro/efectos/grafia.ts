/**
 * LA GRAFÍA: el alfabeto propio del Quiebro, 48 glifos de 5×7, y su atlas con campo de distancia.
 *
 * ═══ POR QUÉ UN ALFABETO PROPIO Y NO UNA TIPOGRAFÍA ═══
 *
 * La lluvia de símbolos es un tropo genérico, pero sus glifos no lo son: la de la película es una
 * tipografía con dueño (kana de media anchura y cifras en espejo), y el repositorio de código
 * abierto que mejor la imita la saca de material promocional. Así que aquí no se copia ni se
 * adapta ninguna fuente: cada glifo se dibujó en esta casa, punto a punto, a partir de los signos
 * que sólo tiene el español —la eñe, las dos aperturas ¿ y ¡, la cedilla (entera y partida), la
 * virgulilla y las tildes— más un par de trazos propios. El diseño lo pide en su §1, y la lista de
 * lo que NO sale está en el mismo sitio.
 *
 * ═══ LAS CUATRO REGLAS QUE LA HACEN UN ALFABETO Y NO RUIDO ═══
 *
 * Las comprueba `escritorio/scripts/verificar-quiebro-efectos.ts`, cada una vista en rojo:
 *
 *   1. 48 glifos, todos de 7 filas de 5 puntos, ninguno vacío (al menos 5 puntos de tinta).
 *   2. Ninguno igual a otro, y ninguno igual al ESPEJO de otro ni al suyo propio. Lo segundo es lo
 *      que mata las «cifras en espejo» y los pares que sólo se distinguen por el lado: si un glifo
 *      y su reflejo estuvieran los dos, la lluvia enseñaría 47 formas y media.
 *   3. Entre dos glifos cualesquiera (o uno y el espejo de otro) difieren al menos 3 puntos: con
 *      uno o dos, a 8 píxeles de alto en el cielo serían el mismo.
 *   4. Ninguno se parece a una cifra de 5×7 ni a su espejo (4 puntos de diferencia como poco).
 *
 * ═══ POR QUÉ LOS GLIFOS SE ESCRIBEN DIBUJADOS Y NO EN BITS ═══
 *
 * Un `0b10110` por fila no lo revisa nadie; `.##.#` se ve. Los dibujos son la fuente de verdad y
 * los bits se sacan al cargar el módulo, una vez. Cada glifo dice de qué signo sale (`de`), y el
 * comprobador exige que estén todos los signos del español y que los trazos propios sean minoría.
 *
 * ═══ EL ATLAS: DOS CAMPOS DE DISTANCIA Y LA COBERTURA, EN BYTES ═══
 *
 * `pixelesDelAtlas()` devuelve los bytes RGBA de un atlas de 8×6 celdas, sin three y sin DOM, para
 * que el comprobador lo mida en Node y `atlas.ts` lo suba tal cual como `DataTexture`:
 *
 *   · R — campo de distancia de los TRAZOS: los puntos encendidos como cuadrados que se funden con
 *     sus vecinos. Es la letra «continua», la de los anillos y las líneas.
 *   · G — campo de distancia de los PUNTOS: cada punto un círculo suelto, la pantalla vieja. Es la
 *     letra de la lluvia.
 *   · B — la cobertura tal cual (255 dentro de un punto encendido), para el comprobador y para
 *     quien quiera el píxel duro.
 *
 * El campo de distancia es lo que deja el borde nítido a cualquier tamaño —un glifo de 6 píxeles
 * en el cielo y uno de 200 en el anillo salen de la misma textura— y regala el halo: fuera de la
 * letra el valor baja suave, y el sombreador lo usa como resplandor sin pase de brillo.
 *
 * La distancia de los trazos es la EXACTA (transformada euclídea de Felzenszwalb y Huttenlocher,
 * «Distance Transforms of Sampled Functions», 2012; implementada aquí a partir del artículo). No
 * vale la aproximación de «mínimo de las cajas»: en la costura entre dos puntos vecinos daría cero
 * y la letra saldría con una raya negra entre punto y punto.
 */

/** Ancho de un glifo en puntos. */
export const ANCHO_DEL_GLIFO = 5;
/** Alto de un glifo en puntos. */
export const ALTO_DEL_GLIFO = 7;
/** Cuántos glifos tiene la Grafía. Lo fija el diseño (§1). */
export const GLIFOS_EN_LA_GRAFIA = 48;

/** De qué signo del español sale un glifo; `propio` para los trazos que no salen de ninguno. */
export type OrigenDelGlifo = 'ñ' | '¿' | '¡' | 'ç' | '~' | '´' | '`' | '¨' | 'propio';

/** Los signos que TIENEN que estar representados. `propio` no cuenta. */
export const SIGNOS_DEL_ESPAÑOL: readonly OrigenDelGlifo[] = ['ñ', '¿', '¡', 'ç', '~', '´', '`', '¨'];

export interface Glifo {
  /** Nombre en la casa, único. Sirve para los informes del comprobador y para buscarlo. */
  readonly nombre: string;
  /** El signo del que sale. */
  readonly de: OrigenDelGlifo;
  /** El dibujo: 7 filas de 5, `#` encendido y `.` apagado, de arriba abajo. */
  readonly dibujo: readonly string[];
  /** Las mismas filas en bits: el bit 4 es la columna de la izquierda. */
  readonly filas: readonly number[];
}

/*
 * ─────────────────────────────── Los 48 dibujos ───────────────────────────────
 *
 * Seis familias de ocho. Cada fila del literal es una fila del glifo separada por un espacio; se
 * leen mejor puestas en columna, pero así cabe el alfabeto entero en una pantalla y un cambio sale
 * en el diff como una línea. Los nombres dicen el gesto: `ene-volcada` es la eñe con la virgulilla
 * debajo, `cedilla-partida` la ce con la cola suelta, y así.
 */
const DIBUJOS: readonly (readonly [string, OrigenDelGlifo, string])[] = [
  ['ene', 'ñ', '.##.# #..#. #.##. ##..# #...# #...# #...#'],
  ['ene-mayor', 'ñ', '.#.## #.#.. #...# ##..# #.#.# #..## #...#'],
  ['ene-volcada', 'ñ', '#...# #...# #..## .##.# ..... .##.# #..#.'],
  ['ene-caida', 'ñ', '#.... .#.#. ..#.# ..... ###.. #..#. #..#.'],
  ['ene-abierta', 'ñ', '.##.# #..#. ..... ###.. ...#. ...#. ...#.'],
  ['ene-tendida', 'ñ', '..#.# .#.#. ..... ..### .#..# .#..# #..#.'],
  ['ene-doble', 'ñ', '.##.# #..#. .##.# #..#. ..#.. ..#.. .##..'],
  ['ene-partida', 'ñ', '.##.# #..#. ..... #.##. #...# ..... #...#'],

  ['abre', '¿', '..#.. ..... ..#.. .#... #.... #...# .###.'],
  ['abre-escuadra', '¿', '.#... ..... .#... .#... #.... #.... #####'],
  ['abre-lazo', '¿', '..#.. ..... .##.. #..#. #..#. #.##. .#...'],
  ['abre-gemela', '¿', '#..#. ..... #..#. .#..# #..#. .##.. .....'],
  ['abre-aguda', '¿', '...#. ..#.. ..... ..#.. .#... #...# .###.'],
  ['abre-sin-punto', '¿', '..... ...#. ..#.. .#... #.... #..#. .##..'],
  ['abre-barra', '¿', '..#.. ..... ###.. .#... #.... #...# .####'],
  ['abre-espiral', '¿', '.###. #...# ##..# #.#.# #.##. .#... .....'],

  ['cierra-pie', '¡', '.#... ..... ..#.. ..#.. ..#.. ..#.. ..###'],
  ['cierra-par', '¡', '.#... ...#. ..... .#.#. .#.#. .#.#. .#...'],
  ['cierra-aguda', '¡', '...#. ..#.. ..... ..#.. ..#.. ..#.. .##..'],
  ['cierra-dieresis', '¡', '.#.#. ..... ...#. ...#. ...#. ..##. ...#.'],
  ['cierra-quebrada', '¡', '.#... ..... .#... .#... ..#.. ..#.. ..#..'],
  ['cierra-cola', '¡', '...#. ..... ...#. ...#. ...#. ..#.. ##...'],
  ['cierra-cruzada', '¡', '..#.. ..... ..#.. .##.# #.##. ..#.. ..#..'],
  ['cierra-rayada', '¡', '.#... ..... .#... ..... .#... .#... .##..'],

  ['cedilla', 'ç', '..... .###. #.... #.... .###. ..#.. .#...'],
  ['cedilla-mayor', 'ç', '.###. #...# #.... #.... .###. ...#. ..#..'],
  ['cedilla-partida', 'ç', '.#### #.... #.... .#### ..... ..##. ...#.'],
  ['cedilla-suelta', 'ç', '.##.. #.... #.... .##.. ..... .#... ..##.'],
  ['cedilla-gancho', 'ç', '..... ..#.. ..#.. ..#.. ..##. ...#. .##..'],
  ['cedilla-aguda', 'ç', '...#. ..#.. .###. #.... .###. ..#.. .#...'],
  ['cedilla-doble', 'ç', '.###. #.... .###. #.... .###. .#.#. #.#..'],
  ['cedilla-cerrada', 'ç', '.###. #...# #.... #...# .###. ..#.. ...#.'],

  ['virgulilla', '~', '..... ..... .##.# #..#. ..... ..... .....'],
  ['virgulilla-doble', '~', '..... .##.# #..#. ..... .##.# #..#. .....'],
  ['virgulilla-baja', '~', '..... ..... .##.# #..#. ..... ##### .....'],
  ['virgulilla-de-pie', '~', '.#... #.... .#... ..#.. ...#. ..#.. .#...'],
  ['virgulilla-larga', '~', '..... ..... .#... #.#.. ...#. ....# .....'],
  ['virgulilla-punto', '~', '.##.# #..#. ..... ..... ...#. ..... .....'],
  ['virgulilla-poste', '~', '.##.# #..#. ..#.. ..#.. ..#.. ..#.. .....'],
  ['virgulilla-rota', '~', '..... .#... #.#.. ..... ..#.# ...#. .....'],

  ['aguda-palo', '´', '....# ...#. ..... .##.. ..#.. ..#.. ..###'],
  ['aguda-a', '´', '...#. ..#.. ..... .###. #..#. #..#. .####'],
  ['aguda-e', '´', '...#. ..#.. .###. #...# ####. #.... .###.'],
  ['aguda-o', '´', '...#. ..#.. .###. #...# #...# #..#. .##..'],
  ['dieresis-u', '¨', '.#.#. ..... #..#. #..#. #..#. #..#. .##.#'],
  ['grave-escalon', '`', '.#... ..#.. ..... ##... .##.. ..##. ...##'],
  ['trazo-escuadra', 'propio', '##### ....# ....# ....# ..... ##... .#...'],
  ['trazo-peine', 'propio', '#.#.# #.#.# ##### ....# ....# ....# ...##'],
];

/** Una fila dibujada (`.##.#`) a sus 5 bits, con la columna izquierda en el bit 4. */
export function bitsDeLaFila(fila: string): number {
  let bits = 0;
  for (let x = 0; x < ANCHO_DEL_GLIFO; x++) bits = (bits << 1) | (fila[x] === '#' ? 1 : 0);
  return bits;
}

/** Un dibujo de una línea (filas separadas por espacios) a sus filas. No valida: eso es del comprobador. */
export function filasDelDibujo(dibujo: string): string[] {
  return dibujo.split(' ');
}

/** LA GRAFÍA, en el orden del atlas: el glifo `i` vive en la celda `i`. */
export const GRAFIA: readonly Glifo[] = DIBUJOS.map(([nombre, de, dibujo]) => {
  const filas = filasDelDibujo(dibujo);
  return { nombre, de, dibujo: filas, filas: filas.map(bitsDeLaFila) };
});

/** ¿Está encendido el punto (x, y) del glifo? `y` = 0 es la fila de ARRIBA. Fuera de la rejilla, apagado. */
export function puntoEncendido(filas: readonly number[], x: number, y: number): boolean {
  if (x < 0 || x >= ANCHO_DEL_GLIFO || y < 0 || y >= ALTO_DEL_GLIFO) return false;
  const fila = filas[y] ?? 0;
  return ((fila >> (ANCHO_DEL_GLIFO - 1 - x)) & 1) === 1;
}

/** El reflejo izquierda-derecha de unas filas. */
export function espejoDe(filas: readonly number[]): number[] {
  return filas.map((fila) => {
    let r = 0;
    for (let x = 0; x < ANCHO_DEL_GLIFO; x++) r = (r << 1) | ((fila >> x) & 1);
    return r;
  });
}

/** Cuántos puntos difieren entre dos glifos (distancia de Hamming sobre los 35 puntos). */
export function puntosDistintos(a: readonly number[], b: readonly number[]): number {
  let n = 0;
  for (let y = 0; y < ALTO_DEL_GLIFO; y++) {
    let x = (a[y] ?? 0) ^ (b[y] ?? 0);
    while (x !== 0) {
      n += x & 1;
      x >>= 1;
    }
  }
  return n;
}

/** Cuántos puntos encendidos tiene un glifo. */
export function tintaDe(filas: readonly number[]): number {
  return puntosDistintos(filas, [0, 0, 0, 0, 0, 0, 0]);
}

/* ─────────────────────────────── El atlas ─────────────────────────────── */

/** Píxeles por punto de la rejilla. Con 8, un glifo son 40×56 píxeles de campo. */
export const PASO_DEL_PUNTO = 8;
/** Margen alrededor del glifo dentro de su celda: lo que ocupa el halo. Igual al alcance del campo. */
export const MARGEN_DE_LA_CELDA = 4;
/** Ancho de una celda del atlas en píxeles (40 del glifo más los dos márgenes). */
export const ANCHO_DE_LA_CELDA = ANCHO_DEL_GLIFO * PASO_DEL_PUNTO + 2 * MARGEN_DE_LA_CELDA;
/** Alto de una celda del atlas en píxeles (56 del glifo más los dos márgenes). */
export const ALTO_DE_LA_CELDA = ALTO_DEL_GLIFO * PASO_DEL_PUNTO + 2 * MARGEN_DE_LA_CELDA;
/** Celdas por fila del atlas. 8 × 6 = 48: cabe la Grafía entera y no sobra ninguna. */
export const COLUMNAS_DEL_ATLAS = 8;
/** Filas de celdas del atlas. */
export const FILAS_DEL_ATLAS = 6;
/** Ancho del atlas en píxeles (384). */
export const ANCHO_DEL_ATLAS = COLUMNAS_DEL_ATLAS * ANCHO_DE_LA_CELDA;
/** Alto del atlas en píxeles (384). */
export const ALTO_DEL_ATLAS = FILAS_DEL_ATLAS * ALTO_DE_LA_CELDA;
/**
 * Hasta dónde llega el campo, en píxeles, a cada lado del borde. Igual al margen A PROPÓSITO: el
 * halo de un punto pegado al borde de su glifo se apaga justo en el filo de la celda, y el de la
 * celda vecina no se asoma.
 */
export const ALCANCE_DEL_CAMPO = MARGEN_DE_LA_CELDA;
/** Radio de cada punto suelto (canal G), en píxeles: algo menos de medio paso, para que se vean separados. */
export const RADIO_DEL_PUNTO = 3.4;

/**
 * Dónde vive el glifo `i` en el atlas: su columna y su fila de celdas CONTANDO DESDE ABAJO, que es
 * como las cuenta la textura (`flipY = false`: la primera fila de bytes es la de abajo). El glifo 0
 * está arriba a la izquierda, como se lee.
 */
export function celdaDelGlifo(i: number): { columna: number; filaDesdeAbajo: number } {
  return { columna: i % COLUMNAS_DEL_ATLAS, filaDesdeAbajo: FILAS_DEL_ATLAS - 1 - Math.floor(i / COLUMNAS_DEL_ATLAS) };
}

/** Lo que un número con signo en píxeles vale en el byte del campo: 128 en el borde, 255 dentro del todo. */
function byteDelCampo(distanciaConSigno: number): number {
  const v = 0.5 + distanciaConSigno / (2 * ALCANCE_DEL_CAMPO);
  return Math.round(Math.min(1, Math.max(0, v)) * 255);
}

/** Un número muy grande pero finito: con `Infinity` la parábola da `Infinity − Infinity`. */
const LEJOS = 1e20;

/**
 * La transformada 1D de Felzenszwalb y Huttenlocher: `d[q] = min_p ((q − p)² + f[p])`, envolvente
 * inferior de parábolas en tiempo lineal. `v`, `z` son de trabajo y los pone quien llama.
 */
function transformadaDeUnaLinea(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array): void {
  let k = 0;
  v[0] = 0;
  z[0] = -LEJOS;
  z[1] = LEJOS;
  for (let q = 1; q < n; q++) {
    const fq = f[q] as number;
    let vk = v[k] as number;
    let s = (fq + q * q - ((f[vk] as number) + vk * vk)) / (2 * q - 2 * vk);
    while (s <= (z[k] as number)) {
      k--;
      vk = v[k] as number;
      s = (fq + q * q - ((f[vk] as number) + vk * vk)) / (2 * q - 2 * vk);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = LEJOS;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while ((z[k + 1] as number) < q) k++;
    const vk = v[k] as number;
    d[q] = (q - vk) * (q - vk) + (f[vk] as number);
  }
}

/**
 * DISTANCIA EUCLÍDEA de cada píxel al píxel `objetivo` más cercano de la máscara (0 si él mismo lo
 * es), en píxeles. Dos pasadas 1D —columnas y filas— sobre el cuadrado de la distancia.
 */
export function distanciaA(mascara: Uint8Array, ancho: number, alto: number, objetivo: 0 | 1): Float64Array {
  const n = Math.max(ancho, alto);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  const cuadrado = new Float64Array(ancho * alto);
  for (let i = 0; i < ancho * alto; i++) cuadrado[i] = mascara[i] === objetivo ? 0 : LEJOS;
  for (let x = 0; x < ancho; x++) {
    for (let y = 0; y < alto; y++) f[y] = cuadrado[y * ancho + x] as number;
    transformadaDeUnaLinea(f, alto, d, v, z);
    for (let y = 0; y < alto; y++) cuadrado[y * ancho + x] = d[y] as number;
  }
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) f[x] = cuadrado[y * ancho + x] as number;
    transformadaDeUnaLinea(f, ancho, d, v, z);
    for (let x = 0; x < ancho; x++) cuadrado[y * ancho + x] = Math.sqrt(d[x] as number);
  }
  return cuadrado;
}

export interface PixelesDelAtlas {
  readonly ancho: number;
  readonly alto: number;
  /** RGBA, filas de ABAJO arriba (listas para `DataTexture` con `flipY = false`). */
  readonly datos: Uint8Array;
}

/**
 * LOS BYTES DEL ATLAS. Puro y determinista: la misma Grafía da los mismos bytes en cualquier
 * aparato. Se calcula una vez por página (`atlas.ts` lo guarda); cuesta unos pocos milisegundos.
 */
export function pixelesDelAtlas(glifos: readonly Glifo[] = GRAFIA): PixelesDelAtlas {
  const ancho = ANCHO_DEL_ATLAS;
  const alto = ALTO_DEL_ATLAS;
  /* La máscara de los trazos, de ARRIBA abajo como se dibuja; al final se voltea al copiar. */
  const mascara = new Uint8Array(ancho * alto);
  for (let i = 0; i < glifos.length && i < COLUMNAS_DEL_ATLAS * FILAS_DEL_ATLAS; i++) {
    const g = glifos[i] as Glifo;
    const x0 = (i % COLUMNAS_DEL_ATLAS) * ANCHO_DE_LA_CELDA + MARGEN_DE_LA_CELDA;
    const y0 = Math.floor(i / COLUMNAS_DEL_ATLAS) * ALTO_DE_LA_CELDA + MARGEN_DE_LA_CELDA;
    for (let py = 0; py < ALTO_DEL_GLIFO; py++) {
      for (let px = 0; px < ANCHO_DEL_GLIFO; px++) {
        if (!puntoEncendido(g.filas, px, py)) continue;
        for (let yy = 0; yy < PASO_DEL_PUNTO; yy++) {
          const fila = (y0 + py * PASO_DEL_PUNTO + yy) * ancho;
          for (let xx = 0; xx < PASO_DEL_PUNTO; xx++) mascara[fila + x0 + px * PASO_DEL_PUNTO + xx] = 1;
        }
      }
    }
  }
  const aLaTinta = distanciaA(mascara, ancho, alto, 1);
  const alHueco = distanciaA(mascara, ancho, alto, 0);

  const datos = new Uint8Array(ancho * alto * 4);
  for (let y = 0; y < alto; y++) {
    const celdaY = Math.floor(y / ALTO_DE_LA_CELDA);
    for (let x = 0; x < ancho; x++) {
      const i = y * ancho + x;
      const dentro = mascara[i] === 1;
      /* El borde está a medio píxel del centro del último píxel de tinta. */
      const trazo = dentro ? (alHueco[i] as number) - 0.5 : -((aLaTinta[i] as number) - 0.5);

      /* Los puntos sueltos: el círculo encendido más cercano entre los 3×3 puntos de alrededor. */
      const celdaX = Math.floor(x / ANCHO_DE_LA_CELDA);
      const glifo = glifos[celdaY * COLUMNAS_DEL_ATLAS + celdaX];
      let punto = -ALCANCE_DEL_CAMPO;
      if (glifo !== undefined) {
        const lx = x - celdaX * ANCHO_DE_LA_CELDA - MARGEN_DE_LA_CELDA + 0.5;
        const ly = y - celdaY * ALTO_DE_LA_CELDA - MARGEN_DE_LA_CELDA + 0.5;
        const cx = Math.floor(lx / PASO_DEL_PUNTO);
        const cy = Math.floor(ly / PASO_DEL_PUNTO);
        let mejor = LEJOS;
        for (let j = cy - 1; j <= cy + 1; j++) {
          for (let k = cx - 1; k <= cx + 1; k++) {
            if (!puntoEncendido(glifo.filas, k, j)) continue;
            const dx = lx - (k + 0.5) * PASO_DEL_PUNTO;
            const dy = ly - (j + 0.5) * PASO_DEL_PUNTO;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < mejor) mejor = dist;
          }
        }
        if (mejor < LEJOS) punto = RADIO_DEL_PUNTO - mejor;
      }

      /* Filas de abajo arriba: la fila `y` de la imagen es la `alto − 1 − y` de la textura. */
      const o = ((alto - 1 - y) * ancho + x) * 4;
      datos[o] = byteDelCampo(trazo);
      datos[o + 1] = byteDelCampo(punto);
      datos[o + 2] = dentro ? 255 : 0;
      datos[o + 3] = 255;
    }
  }
  return { ancho, alto, datos };
}

/**
 * El byte de un canal del atlas en el centro del punto (x, y) del glifo `i` (y = 0 arriba). Para el
 * comprobador, y escrito con las mismas cuentas que el sombreador (`celdaDelGlifo` y filas desde
 * abajo): si la textura estuviera volteada o corrida, aquí se ve.
 */
export function byteEnElPunto(atlas: PixelesDelAtlas, i: number, x: number, y: number, canal: 0 | 1 | 2): number {
  const { columna, filaDesdeAbajo } = celdaDelGlifo(i);
  const px = columna * ANCHO_DE_LA_CELDA + MARGEN_DE_LA_CELDA + x * PASO_DEL_PUNTO + PASO_DEL_PUNTO / 2;
  /* Dentro de la celda, la fila 0 del glifo está ARRIBA: lejos del fondo de la celda. */
  const pyDesdeAbajo =
    filaDesdeAbajo * ALTO_DE_LA_CELDA + MARGEN_DE_LA_CELDA + (ALTO_DEL_GLIFO - 1 - y) * PASO_DEL_PUNTO + PASO_DEL_PUNTO / 2;
  return atlas.datos[(pyDesdeAbajo * atlas.ancho + px) * 4 + canal] ?? 0;
}
