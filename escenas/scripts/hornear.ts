/**
 * EL HORNEADO: cómo una textura del pack se convierte en color por vértice.
 *
 * ═══ POR QUÉ ESTO VIVE APARTE Y NO DENTRO DE UN COMPILADOR ═══
 *
 * Lo usan DOS compiladores: `compilar-aventureros.ts` —seis personajes, cada uno
 * con su PNG empotrado— y `compilar-embarcadero.ts` —setenta y tantas piezas que
 * comparten un atlas—. Nació dentro del primero; se sacó aquí al llegar el segundo
 * para que los dos horneen EXACTAMENTE igual: el mismo muestreo, la misma curva
 * sRGB, el mismo byte. Dos copias se habrían separado en la primera corrección, y
 * el síntoma —un aventurero un pelín más claro que el muelle donde está de pie—
 * no lo caza ningún comprobador.
 *
 * La mudanza no cambió ni un byte de los siete ficheros de aventureros: se midió
 * con el md5 de cada uno antes y después. Si alguien toca aquí, que lo vuelva a
 * medir, porque esos ficheros están versionados y una recompilación distinta es
 * una copia entera más en la historia del repositorio.
 *
 * ═══ POR QUÉ SE HORNEA, EN DOS LÍNEAS ═══
 *
 * En el móvil una textura empotrada no se puede abrir: `GLTFLoader` saca los bytes,
 * construye un `Blob`, le pide a `URL.createObjectURL` una dirección y se la da a un
 * `<img>` — y en Hermes no hay ni `Blob` con dirección, ni `<img>`, ni decodificador
 * de PNG, ni WASM para meter uno. La historia entera, comprobada en el código de
 * three, está en `app/src/tres/texturas-nativas.ts`.
 *
 * Así que la textura se aplica AQUÍ, una vez, al compilar: para cada vértice se
 * mira su UV, se muestrea el PNG en ese punto y el color resultante se guarda en
 * el atributo `COLOR_0`. El material sale sin textura y con el color base blanco,
 * de modo que lo que se pinta es el color del vértice tal cual; `GLTFLoader`
 * enciende `vertexColors` él solo cuando la geometría trae `COLOR_0`.
 *
 * Se pierde poco porque las texturas de KayKit no son fotos: son PALETAS de
 * celdas planas, y cada cara del modelo cae entera dentro de una celda. Un color
 * por vértice pinta exactamente lo mismo que la textura, salvo en el borde de
 * una celda si un vértice cayera justo encima — y el muestreo es bilineal para
 * que eso, si pasa, dé un tono intermedio y no una cara del color equivocado.
 * Las UV se envuelven (REPEAT), como marca el material del pack.
 *
 * Dos detalles que no son de gusto:
 *
 *   · El PNG está en sRGB y glTF define `COLOR_0` LINEAL. Se linealiza cada
 *     téxel antes de interpolar —que es lo que hace la GPU con una textura sRGB—
 *     y se guarda el resultado lineal. Guardar el sRGB tal cual daría colores
 *     lavados, con el gamma aplicado dos veces.
 *   · `COLOR_0` se escribe como VEC3 de BYTES SIN SIGNO NORMALIZADOS y no como
 *     flotantes: 4 bytes por vértice (3 más el relleno de alineación) contra 12.
 *     Con 5.000 a 8.000 vértices por personaje son 40 a 60 kB de diferencia —y
 *     la exploradora, que es la más pesada, no cabría en 450 kB con flotantes—.
 *     El coste es cuantizar un valor lineal a 256 escalones, que sólo se nota en
 *     los negros más profundos: hasta seis pasos de sRGB, medido (entre 4,7 y
 *     6,3 según el personaje), que es la diferencia entre un negro y otro negro.
 *     `horneaLaPrimitiva` devuelve ese desvío para que cada compilador lo imprima.
 *
 * Y sin textura, las UV son bytes muertos que viajarían a cada móvil para no
 * leerse nunca: `TEXCOORD_0` se quita al hornear.
 */
import type { Accessor, Document, Material, Primitive, Texture } from '@gltf-transform/core';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname ?? __dirname, '..', '..');

/*
 * `pngjs` DECODIFICA EL PNG, y se carga así por tres motivos.
 *
 * Es JavaScript puro —ni binario nativo ni WASM—, que es lo que hace que estos
 * guiones corran en cualquier máquina que tenga Node, sin compilar nada. La 3.4 no
 * trae tipos ni hay `@types/pngjs` en el árbol, así que se trae con `createRequire`
 * y se tipa aquí lo único que se usa: `PNG.sync.read`, que devuelve ancho, alto y
 * los píxeles en RGBA de 8 bits, fila a fila desde arriba — el mismo origen que las
 * UV de glTF.
 *
 * Y EL TERCER MOTIVO ES UNA MULETA, dicha como tal. `pngjs` está declarado en
 * `escenas/package.json` y en el `package-lock.json` de la raíz, y `npm install` lo
 * deja en `node_modules/` de la raíz, que es donde el primer `require` lo encuentra.
 * Pero la app —que no es un workspace— ya trae exactamente esa versión colgando de
 * `expo-splash-screen`, y el día que se escribió esto un `npm install` de la raíz
 * habría reordenado además los `node_modules` de tres workspaces con un servidor
 * de desarrollo levantado encima. Así que si la raíz no lo tiene, se coge el de la
 * app. Cuando alguien corra `npm install`, la muleta deja de usarse sola.
 */
export type PngDecodificado = { width: number; height: number; data: Buffer };
type ModuloPng = { PNG: { sync: { read(bytes: Buffer): PngDecodificado } } };
function cargaPngjs(): ModuloPng {
  const requiere = createRequire(import.meta.url);
  try {
    return requiere('pngjs') as ModuloPng;
  } catch {
    const desdeLaApp = createRequire(path.join(RAIZ, 'app/package.json'));
    return desdeLaApp('pngjs') as ModuloPng;
  }
}
const { PNG } = cargaPngjs();

/** Se para sin compilar a medias: un fichero a medias se carga y deja huecos mudos. */
export function rendirse(motivo: string): never {
  console.error(`\n${motivo}\n\nNo se compila a medias.`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Decodificar
// ---------------------------------------------------------------------------

/*
 * LOS PNG DECODIFICADOS SE GUARDAN POR SU CONTENIDO, no por su ruta.
 *
 * El pack hexagonal lleva UNA copia del atlas en cada carpeta —dieciocho ficheros
 * idénticos, medido con md5— y cada `.gltf` referencia la de su carpeta. Decodificar
 * un PNG de 1024 × 1024 setenta y siete veces tarda; decodificarlo una vez y
 * reconocerlo por su huella las otras setenta y seis, no. Y se reconoce por los
 * BYTES y no por el nombre del fichero para que dos atlas distintos con el mismo
 * nombre —el de otoño se llama casi igual— no se confundan nunca.
 */
const DECODIFICADOS = new Map<string, PngDecodificado>();

/** Decodifica un PNG a RGBA de 8 bits, fila a fila desde arriba. */
export function decodificaPng(bytes: Uint8Array): PngDecodificado {
  const huella = createHash('md5').update(bytes).digest('hex');
  const visto = DECODIFICADOS.get(huella);
  if (visto !== undefined) return visto;
  const png = PNG.sync.read(Buffer.from(bytes));
  DECODIFICADOS.set(huella, png);
  return png;
}

/**
 * El PNG de una textura del pack, decodificado. Se niega si no hay imagen o si no
 * es PNG: aquí no se decodifica otra cosa, y una textura que no se hornea es una
 * textura que viaja al móvil para no abrirse.
 */
export function pngDeLaTextura(textura: Texture | null, de: string): PngDecodificado {
  const imagen = textura?.getImage();
  if (textura === null || imagen === null || imagen === undefined) {
    rendirse(`«${de}» no trae textura de color base: no hay nada que hornear.`);
  }
  if (textura.getMimeType() !== 'image/png') {
    rendirse(`La textura de «${de}» es ${textura.getMimeType()} y aquí sólo se decodifica PNG.`);
  }
  return decodificaPng(imagen);
}

// ---------------------------------------------------------------------------
// Muestrear
// ---------------------------------------------------------------------------

/**
 * sRGB → lineal, tabulado para los 256 valores de un byte.
 *
 * Es la curva de la norma, con su tramo recto abajo, y no la aproximación
 * `x^2.2`: la diferencia es pequeña pero es exactamente la que separa «el mismo
 * color que la textura» de «casi el mismo».
 */
const A_LINEAL: readonly number[] = Array.from({ length: 256 }, (_, i) => {
  const c = i / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});

/** lineal → sRGB, sólo para medir cuánto se pierde al cuantizar. */
function aSrgb(lineal: number): number {
  const c = lineal <= 0.0031308 ? lineal * 12.92 : 1.055 * lineal ** (1 / 2.4) - 0.055;
  return c * 255;
}

/**
 * Muestrea el PNG en (u, v) con interpolación bilineal y envoltura REPEAT, y
 * devuelve el color LINEAL en [0, 1].
 *
 * Los téxeles se linealizan ANTES de interpolar, que es lo que hace la GPU con una
 * textura declarada sRGB. El `- 0,5` es el centro del téxel: la UV (0,5, 0,5) de una
 * textura de 2×2 cae justo entre los cuatro y no encima del segundo.
 */
export function muestrea(png: PngDecodificado, u: number, v: number, salida: number[]): void {
  const { width: W, height: H, data } = png;
  const x = u * W - 0.5;
  const y = v * H - 0.5;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const envuelveX = (i: number): number => ((i % W) + W) % W;
  const envuelveY = (j: number): number => ((j % H) + H) % H;
  const i00 = (envuelveY(y0) * W + envuelveX(x0)) * 4;
  const i10 = (envuelveY(y0) * W + envuelveX(x0 + 1)) * 4;
  const i01 = (envuelveY(y0 + 1) * W + envuelveX(x0)) * 4;
  const i11 = (envuelveY(y0 + 1) * W + envuelveX(x0 + 1)) * 4;
  for (let c = 0; c < 3; c++) {
    const c00 = A_LINEAL[data[i00 + c] as number] as number;
    const c10 = A_LINEAL[data[i10 + c] as number] as number;
    const c01 = A_LINEAL[data[i01 + c] as number] as number;
    const c11 = A_LINEAL[data[i11 + c] as number] as number;
    salida[c] =
      c00 * (1 - fx) * (1 - fy) + c10 * fx * (1 - fy) + c01 * (1 - fx) * fy + c11 * fx * fy;
  }
}

// ---------------------------------------------------------------------------
// Hornear
// ---------------------------------------------------------------------------

/**
 * Hornea la textura en `COLOR_0` de una primitiva y quita sus UV.
 *
 * Devuelve el peor desvío, en pasos de sRGB, entre el color muestreado y el que
 * queda tras cuantizarlo a un byte lineal — la medida de lo que cuesta guardar
 * bytes y no flotantes.
 */
export function horneaLaPrimitiva(doc: Document, prim: Primitive, png: PngDecodificado, nombre: string): number {
  const uv = prim.getAttribute('TEXCOORD_0');
  const pos = prim.getAttribute('POSITION');
  if (uv === null || pos === null) rendirse(`La primitiva «${nombre}» no trae UV o posiciones: no hay nada que hornear.`);
  if (prim.getAttribute('COLOR_0') !== null) rendirse(`La primitiva «${nombre}» ya trae COLOR_0: este pack no lo traía, algo ha cambiado.`);

  const n = uv.getCount();
  const bytes = new Uint8Array(n * 3);
  const st = [0, 0];
  const color = [0, 0, 0];
  let peor = 0;
  for (let i = 0; i < n; i++) {
    uv.getElement(i, st);
    muestrea(png, st[0] as number, st[1] as number, color);
    for (let c = 0; c < 3; c++) {
      const lineal = color[c] as number;
      const byte = Math.max(0, Math.min(255, Math.round(lineal * 255)));
      bytes[i * 3 + c] = byte;
      peor = Math.max(peor, Math.abs(aSrgb(byte / 255) - aSrgb(lineal)));
    }
  }

  const bufer = doc.getRoot().listBuffers()[0];
  if (bufer === undefined) rendirse('El documento no tiene búfer: no se puede escribir el color.');
  const colores: Accessor = doc
    .createAccessor(`${nombre}_COLOR_0`)
    .setType('VEC3')
    .setArray(bytes)
    .setNormalized(true)
    .setBuffer(bufer);
  prim.setAttribute('COLOR_0', colores);
  /* Sin textura, las UV no las lee nadie: fuera. `prune` tira el accesor huérfano. */
  prim.setAttribute('TEXCOORD_0', null);
  return peor;
}

/**
 * Deja el material sin textura de color y en blanco, una vez horneadas sus primitivas.
 *
 * Se queda con TODO lo demás del pack —rugosidad, metalicidad, doble cara— y pierde
 * sólo la textura. El color base va a blanco porque multiplica al color del vértice:
 * cualquier otro tono ensuciaría todas las piezas por igual.
 */
export function desnudaElMaterial(material: Material): void {
  const textura = material.getBaseColorTexture();
  material.setBaseColorTexture(null).setBaseColorFactor([1, 1, 1, 1]);
  if (textura !== null) textura.dispose();
}
